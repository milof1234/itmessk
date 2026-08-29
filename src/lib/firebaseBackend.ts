import { useCallback, useEffect, useRef, useState } from "react";
import { deleteApp, getApps, initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  addDoc,
  collection,
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
  Room,
} from "../types";
import { hashHue, uid as localUid } from "./media";

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
  const [myId, setMyId] = useState("");

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
    let cancelled = false;
    let unsubRooms: (() => void) | null = null;

    (async () => {
      try {
        setConnecting(true);
        setError(null);
        const appName = "efir-" + localUid();
        const app = getApps().some((a) => a.name === appName)
          ? getApps().find((a) => a.name === appName)!
          : initializeApp(config, appName);
        const auth = getAuth(app);
        const cred = await signInAnonymously(auth);
        if (cancelled) return;
        const db = getFirestore(app);
        const storage = getStorage(app);
        backendRef.current = { app, db, storage, myUid: cred.user.uid };
        setMyId(cred.user.uid);

        // сидируем общий канал
        await setDoc(
          doc(db, "rooms", "general"),
          { name: "Общий эфир", hue: 168, lastActivity: Date.now() },
          { merge: true }
        );

        unsubRooms = onSnapshot(
          query(collection(db, "rooms"), orderBy("lastActivity", "desc"), limit(50)),
          (snap) => {
            const list = snap.docs.map((d) =>
              mapRoom(d.id, d.data() as Record<string, unknown>)
            );
            setRooms(list);
            setActiveRoomId((cur) => {
              if (cur && list.some((r) => r.id === cur)) return cur;
              return list[0]?.id ?? null;
            });
          },
          (err) => {
            console.error(err);
            setError(
              "Не удалось прочитать каналы. Проверьте, что Firestore создан и правила разрешают чтение."
            );
          }
        );
        setConnecting(false);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setConnecting(false);
          setError(
            "Не удалось подключиться к Firebase. Проверьте конфиг и включённую анонимную аутентификацию."
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      unsubRooms?.();
      const appToKill = backendRef.current?.app;
      backendRef.current = null;
      if (appToKill) void deleteApp(appToKill).catch(() => {});
    };
  }, [config]);

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
    mySenderId: myId,
    connecting,
    error,
    rooms,
    activeRoomId,
    messages,
    presence,
    selectRoom,
    createRoom,
    sendText,
    sendMedia,
    setTyping,
  };
}
