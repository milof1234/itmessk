import { useCallback, useEffect, useRef, useState } from "react";
import { deleteApp, getApps, initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import {
  getDownloadURL,
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
} from "firebase/storage";
import type { FirebaseStorage } from "firebase/storage";
import type {
  ChatBackend,
  FirebaseConfig,
  MediaMeta,
  Message,
  Presence,
  Profile,
  Role,
  Room,
  ThemeName,
  UserDoc,
} from "../types";
import { hashHue, uid as localUid } from "./media";
import { isUsernameTaken, USERNAME_RE } from "./auth";

interface Backend {
  app: FirebaseApp;
  db: Firestore;
  storage: FirebaseStorage;
  myUid: string;
}

function mapRoom(id: string, d: Record<string, unknown>): Room {
  return {
    id,
    name: String(d.name ?? "Без названия"),
    hue: Number(d.hue ?? hashHue(id)),
    lastActivity: Number(d.lastActivity ?? Date.now()),
    lastPreview: d.lastPreview ? String(d.lastPreview) : undefined,
    createdBy: d.createdBy ? String(d.createdBy) : undefined,
    type: d.type === "group" ? "group" : "channel",
    members: Array.isArray(d.members) ? (d.members as string[]) : undefined,
  };
}

function mapUser(id: string, d: Record<string, unknown>): UserDoc {
  return {
    phone: id,
    username: String(d.username ?? ""),
    name: String(d.name ?? "Абонент"),
    hue: Number(d.hue ?? 168),
    role: (d.role as UserDoc["role"]) ?? "user",
    verified: Boolean(d.verified),
    mutedUntil: d.mutedUntil ? Number(d.mutedUntil) : undefined,
    theme: d.theme as UserDoc["theme"],
    createdAt: Number(d.createdAt ?? Date.now()),
  };
}

function mapMsg(id: string, roomId: string, d: Record<string, unknown>): Message {
  return {
    id,
    roomId,
    senderId: String(d.senderId ?? "?"),
    senderName: String(d.senderName ?? "Аноним"),
    senderHue: Number(d.senderHue ?? 200),
    kind: (d.kind as Message["kind"]) ?? "text",
    text: d.text != null ? String(d.text) : undefined,
    url: d.url ? String(d.url) : undefined,
    duration: d.duration != null ? Number(d.duration) : undefined,
    size: d.size != null ? Number(d.size) : undefined,
    fileName: d.fileName ? String(d.fileName) : undefined,
    createdAt: Number(d.createdAt ?? Date.now()),
  };
}

export function useFirebaseChat(
  profile: Profile,
  config: FirebaseConfig
): ChatBackend {
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [presence, setPresence] = useState<Presence[]>([]);
  const [meDoc, setMeDoc] = useState<UserDoc | null>(null);
  const [allUsers, setAllUsers] = useState<UserDoc[]>([]);

  const backendRef = useRef<Backend | null>(null);
  const pendingRef = useRef<Map<string, Message>>(new Map());
  const typingRef = useRef(false);
  const lastTypingWriteRef = useRef(0);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const recomputeMessages = useCallback((remote: Message[]) => {
    const pending = [...pendingRef.current.values()].filter(
      (p) => !remote.some((r) => r.id === p.id)
    );
    setMessages(
      [...remote, ...pending].sort((a, b) => a.createdAt - b.createdAt)
    );
  }, []);

  const remoteRef = useRef<Message[]>([]);

  /* ---------- инициализация ---------- */
  useEffect(() => {
    let unsubRooms: (() => void) | null = null;
    let unsubMe: (() => void) | null = null;
    let unsubUsers: (() => void) | null = null;
    setConnecting(true);
    setError(null);

    try {
      const appName = "efir-" + localUid();
      const app = getApps().some((a) => a.name === appName)
        ? getApps().find((a) => a.name === appName)!
        : initializeApp(config, appName);
      const db = getFirestore(app);
      const storage = getStorage(app);
      backendRef.current = { app, db, storage, myUid: profile.uid };

      // анонимный вход — опционально: пригодится, если в правилах есть request.auth
      signInAnonymously(getAuth(app)).catch(() => {});

      // сидируем общий канал
      void setDoc(
        doc(db, "rooms", "general"),
        { name: "Общий эфир", hue: 168, lastActivity: Date.now() },
        { merge: true }
      ).catch(() => {});

        unsubRooms = onSnapshot(
          query(collection(db, "rooms"), orderBy("lastActivity", "desc"), limit(50)),
          (snap) => {
            const list = snap.docs.map((d) =>
              mapRoom(d.id, d.data() as Record<string, unknown>)
            );
            setRooms(list);
            setActiveRoomId((cur) => {
              if (cur && list.some((r) => r.id === cur)) return cur;
              const visible = list.find(
                (r) => r.type !== "group" || r.members?.includes(profile.uid.replace(/^u/, ""))
              );
              return visible?.id ?? list[0]?.id ?? null;
            });
          },
          (err) => {
            console.error(err);
            setError(
              "Не удалось прочитать каналы. Проверьте, что Firestore создан и правила разрешают чтение."
            );
          }
        );

        // мой документ (роль, мут, галочка — в реальном времени)
        if (profile.phone) {
          unsubMe = onSnapshot(doc(db, "users", profile.phone), (snap) => {
            if (snap.exists()) {
              setMeDoc(mapUser(snap.id, snap.data() as Record<string, unknown>));
            }
          });
          unsubUsers = onSnapshot(
            query(collection(db, "users"), limit(300)),
            (snap) => {
              setAllUsers(
                snap.docs.map((d) => mapUser(d.id, d.data() as Record<string, unknown>))
              );
            },
            () => {}
          );
        }
        setConnecting(false);    } catch (e) {
      console.error(e);
      setConnecting(false);
      setError("Не удалось подключиться к Firebase. Проверьте конфиг проекта.");
    }

    return () => {
      unsubRooms?.();
      unsubMe?.();
      unsubUsers?.();
      const appToKill = backendRef.current?.app;
      backendRef.current = null;
      if (appToKill) void deleteApp(appToKill).catch(() => {});
    };
  }, [config, profile.uid, profile.phone]);

  /* ---------- сообщения + присутствие активного канала ---------- */
  useEffect(() => {
    const b = backendRef.current;
    if (!b || !activeRoomId) return;
    remoteRef.current = [];
    setMessages([]);
    setPresence([]);

    const unsubMsg = onSnapshot(
      query(
        collection(b.db, "rooms", activeRoomId, "messages"),
        orderBy("createdAt", "desc"),
        limit(80)
      ),
      (snap) => {
        const list = snap.docs
          .map((d) => mapMsg(d.id, activeRoomId, d.data() as Record<string, unknown>))
          .reverse();
        remoteRef.current = list;
        recomputeMessages(list);
      },
      (err) => {
        console.error(err);
        setError("Нет доступа к сообщениям канала (проверьте правила Firestore).");
      }
    );

    const unsubPres = onSnapshot(
      collection(b.db, "rooms", activeRoomId, "presence"),
      (snap) => {
        const now = Date.now();
        const list: Presence[] = snap.docs
          .map((d) => {
            const data = d.data() as Record<string, unknown>;
            return {
              uid: d.id,
              name: String(data.name ?? "Аноним"),
              hue: Number(data.hue ?? 200),
              typing: Boolean(data.typing),
              lastSeen: Number(data.lastSeen ?? 0),
            };
          })
          .filter((p) => now - p.lastSeen < 45_000);
        setPresence(list);
      }
    );

    return () => {
      unsubMsg();
      unsubPres();
    };
  }, [activeRoomId, connecting, recomputeMessages]);

  /* ---------- heartbeat присутствия ---------- */
  useEffect(() => {
    const b = backendRef.current;
    if (!b || !activeRoomId) return;
    const write = () => {
      const p = profileRef.current;
      void setDoc(
        doc(b.db, "rooms", activeRoomId, "presence", b.myUid),
        { uid: b.myUid, name: p.name, hue: p.hue, typing: typingRef.current, lastSeen: Date.now() },
        { merge: true }
      ).catch(() => {});
    };
    write();
    const t = window.setInterval(write, 12_000);
    return () => window.clearInterval(t);
  }, [activeRoomId, connecting]);

  const selectRoom = useCallback((id: string) => {
    setActiveRoomId(id);
  }, []);

  const createRoom = useCallback(async (name: string): Promise<string | null> => {
    const b = backendRef.current;
    if (!b) return null;
    try {
      const p = profileRef.current;
      const ref = await addDoc(collection(b.db, "rooms"), {
        name,
        type: "channel",
        hue: hashHue(name),
        lastActivity: Date.now(),
        lastPreview: "канал создан",
        createdBy: p.name,
      });
      await addDoc(collection(b.db, "rooms", ref.id, "messages"), {
        senderId: "system",
        senderName: "система",
        senderHue: 0,
        kind: "system",
        text: `Канал «${name}» вышел в эфир`,
        createdAt: Date.now(),
      });
      setActiveRoomId(ref.id);
      return ref.id;
    } catch (e) {
      console.error(e);
      setError("Не удалось создать канал (проверьте правила Firestore).");
      return null;
    }
  }, []);

  /* ---------- группы ---------- */
  const createGroup = useCallback(
    async (name: string, members: string[]): Promise<string | null> => {
      const b = backendRef.current;
      const me = profileRef.current.phone;
      if (!b || !me) return null;
      try {
        const all = Array.from(new Set([me, ...members]));
        const ref = await addDoc(collection(b.db, "rooms"), {
          name,
          type: "group",
          hue: hashHue(name),
          lastActivity: Date.now(),
          lastPreview: "группа создана",
          createdBy: profileRef.current.name,
          members: all,
        });
        await addDoc(collection(b.db, "rooms", ref.id, "messages"), {
          senderId: "system",
          senderName: "система",
          senderHue: 0,
          kind: "system",
          text: `Группа «${name}» создана — ${all.length} уч.`,
          createdAt: Date.now(),
        });
        setActiveRoomId(ref.id);
        return ref.id;
      } catch (e) {
        console.error(e);
        setError("Не удалось создать группу (проверьте правила Firestore).");
        return null;
      }
    },
    []
  );

  /* ---------- аккаунты и модерация ---------- */
  const updateMyProfile = useCallback(
    async (patch: { name?: string; username?: string; hue?: number; theme?: ThemeName }) => {
      const b = backendRef.current;
      const me = profileRef.current.phone;
      if (!b || !me) return;
      const data: Record<string, unknown> = {};
      if (patch.name != null) data.name = patch.name.slice(0, 20);
      if (patch.hue != null) data.hue = patch.hue;
      if (patch.theme != null) data.theme = patch.theme;
      if (patch.username != null) {
        const uname = patch.username.toLowerCase();
        if (!USERNAME_RE.test(uname)) {
          throw new Error("Юзернейм: 3–16 символов, латиница, цифры, «_» и «.»");
        }
        if (await isUsernameTaken(b.app, uname, me)) {
          throw new Error(`Юзернейм @${uname} уже занят`);
        }
        data.username = uname;
      }
      await setDoc(doc(b.db, "users", me), data, { merge: true });
    },
    []
  );

  const setRole = useCallback(async (phone: string, role: Role) => {
    const b = backendRef.current;
    if (!b) return;
    await setDoc(doc(b.db, "users", phone), { role }, { merge: true });
  }, []);

  const setVerified = useCallback(async (phone: string, v: boolean) => {
    const b = backendRef.current;
    if (!b) return;
    await setDoc(doc(b.db, "users", phone), { verified: v }, { merge: true });
  }, []);

  const muteUser = useCallback(async (phone: string, until: number | null) => {
    const b = backendRef.current;
    if (!b) return;
    await setDoc(doc(b.db, "users", phone), { mutedUntil: until }, { merge: true });
  }, []);

  const resetUsers = useCallback(async (): Promise<number> => {
    const b = backendRef.current;
    const me = profileRef.current.phone;
    if (!b) return 0;
    const victims = allUsersRef.current.filter((u) => u.phone !== me);
    await Promise.all(
      victims.map((u) => deleteDoc(doc(b.db, "users", u.phone)).catch((e) => console.error(e)))
    );
    return victims.length;
  }, []);

  const searchUsers = useCallback(async (q: string): Promise<UserDoc[]> => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const digits = s.replace(/\D/g, "");
    return allUsersRef.current.filter((u) => {
      if (digits.length >= 3 && u.phone.includes(digits)) return true;
      if (u.username && u.username.includes(s.replace(/^@/, ""))) return true;
      if (u.name.toLowerCase().includes(s)) return true;
      return false;
    });
  }, []);

  const allUsersRef = useRef<UserDoc[]>([]);
  allUsersRef.current = allUsers;

  const touchRoom = useCallback((roomId: string, preview: string) => {
    const b = backendRef.current;
    if (!b) return;
    void setDoc(
      doc(b.db, "rooms", roomId),
      { lastActivity: Date.now(), lastPreview: preview },
      { merge: true }
    ).catch(() => {});
  }, []);

  const sendText = useCallback(
    async (text: string) => {
      const b = backendRef.current;
      const roomId = activeRoomId;
      if (!b || !roomId) return;
      const p = profileRef.current;
      try {
        await addDoc(collection(b.db, "rooms", roomId, "messages"), {
          senderId: b.myUid,
          senderName: p.name,
          senderHue: p.hue,
          kind: "text",
          text,
          createdAt: Date.now(),
        });
        touchRoom(roomId, text.slice(0, 60));
      } catch (e) {
        console.error(e);
        throw new Error("Сообщение не отправлено");
      }
    },
    [activeRoomId, touchRoom]
  );

  const sendMedia = useCallback(
    async (
      kind: "image" | "video" | "voice",
      blob: Blob,
      meta: MediaMeta,
      onProgress?: (pct: number) => void
    ) => {
      const b = backendRef.current;
      const roomId = activeRoomId;
      if (!b || !roomId) return;
      const p = profileRef.current;

      const ext =
        kind === "image"
          ? "jpg"
          : kind === "voice"
            ? blob.type.includes("mp4")
              ? "m4a"
              : "webm"
            : (meta.fileName?.split(".").pop() ?? "mp4");
      const localId = `${Date.now()}_${localUid()}`;
      const docRef = doc(b.db, "rooms", roomId, "messages", localId);
      const localUrl = URL.createObjectURL(blob);

      const optimistic: Message = {
        id: localId,
        roomId,
        senderId: b.myUid,
        senderName: p.name,
        senderHue: p.hue,
        kind,
        url: localUrl,
        duration: meta.duration,
        size: meta.size ?? blob.size,
        fileName: meta.fileName,
        createdAt: Date.now(),
        uploading: true,
        progress: 0,
      };
      pendingRef.current.set(localId, optimistic);
      recomputeMessages(remoteRef.current);

      try {
        const fileRef = storageRef(b.storage, `rooms/${roomId}/media/${localId}.${ext}`);
        await new Promise<void>((resolve, reject) => {
          const task = uploadBytesResumable(fileRef, blob, {
            contentType: blob.type || "application/octet-stream",
          });
          task.on(
            "state_changed",
            (snap) => {
              const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
              const cur = pendingRef.current.get(localId);
              if (cur) {
                pendingRef.current.set(localId, { ...cur, progress: pct });
                recomputeMessages(remoteRef.current);
              }
              onProgress?.(pct);
            },
            (err) => reject(err),
            () => resolve()
          );
        });
        const url = await getDownloadURL(fileRef);
        pendingRef.current.delete(localId);
        URL.revokeObjectURL(localUrl);
        await setDoc(docRef, {
          senderId: b.myUid,
          senderName: p.name,
          senderHue: p.hue,
          kind,
          url,
          duration: meta.duration ?? null,
          size: meta.size ?? blob.size,
          fileName: meta.fileName ?? null,
          createdAt: optimistic.createdAt,
        });
        touchRoom(
          roomId,
          kind === "image" ? "Фотография" : kind === "video" ? "Видео" : "Голосовое сообщение"
        );
      } catch (e) {
        console.error(e);
        const cur = pendingRef.current.get(localId);
        if (cur) {
          pendingRef.current.set(localId, { ...cur, uploading: false, failed: true });
          recomputeMessages(remoteRef.current);
        }
        throw new Error("Файл не загрузился в Storage");
      }
    },
    [activeRoomId, recomputeMessages, touchRoom]
  );

  const setTyping = useCallback(
    (typing: boolean) => {
      const b = backendRef.current;
      const roomId = activeRoomId;
      if (!b || !roomId) return;
      if (typingRef.current === typing) return;
      const now = Date.now();
      if (typing && now - lastTypingWriteRef.current < 1500) return;
      lastTypingWriteRef.current = now;
      typingRef.current = typing;
      const p = profileRef.current;
      void setDoc(
        doc(b.db, "rooms", roomId, "presence", b.myUid),
        { uid: b.myUid, name: p.name, hue: p.hue, typing, lastSeen: now },
        { merge: true }
      ).catch(() => {});
    },
    [activeRoomId]
  );

  return {
    mode: "firebase",
    mySenderId: profile.uid,
    connecting,
    error,
    rooms,
    activeRoomId,
    messages,
    presence,
    meDoc,
    allUsers,
    selectRoom,
    createRoom,
    createGroup,
    sendText,
    sendMedia,
    setTyping,
    updateMyProfile,
    setRole,
    setVerified,
    muteUser,
    resetUsers,
    searchUsers,
  };
}
