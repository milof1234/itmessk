import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ChatBackend,
  MediaMeta,
  Message,
  Presence,
  Profile,
  Role,
  Room,
  ThemeName,
  UserDoc,
} from "../types";
import { hashHue, synthVoiceWav, uid } from "./media";

const BOT_ID = "efir-bot";
const BOT_NAME = "Смотритель эфира";
const BOT_HUE = 168;

const TEXT_REPLIES = [
  "Принято! Слышу тебя чисто, без помех.",
  "Интересно. Расскажи подробнее — эфир свободен.",
  "Согласен. В эфире всё по-честному.",
  "Записал в бортовой журнал станции.",
  "Отлично сказано. Уходит в архив.",
  "Поддерживаю. Что дальше по программе?",
  "Сигнал стабильный, продолжаем вещание.",
];
const PHOTO_REPLIES = [
  "Отличный кадр! Сохранил в архив эфира.",
  "Фото принято. Резкость — что надо.",
  "Вижу изображение. Красиво ловишь момент.",
];
const VIDEO_REPLIES = [
  "Видео получено. Пересматриваю на повторе.",
  "Ролик в эфире! Качество отличное.",
  "Принял видео. Ставлю в плейлист станции.",
];
const VOICE_REPLIES = [
  "Голосовое прослушал дважды. Слышно прекрасно.",
  "Принял по голосу. Отвечаю тем же — слушай.",
  "Сообщение на плёнке. Голос — как с пластинки.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Демо-бэкенд: всё локально, бот отвечает и «говорит» синтезированным голосом. */
export function useDemoChat(profile: Profile): ChatBackend {
  const [rooms, setRooms] = useState<Room[]>(() => [
    {
      id: "demo-general",
      name: "Общий эфир",
      hue: 168,
      lastActivity: Date.now(),
      lastPreview: "Добро пожаловать на станцию",
    },
    {
      id: "demo-music",
      name: "Ночная волна",
      hue: 36,
      lastActivity: Date.now() - 3600_000,
      lastPreview: "музыка и разговоры до утра",
    },
  ]);
  const [activeRoomId, setActiveRoomId] = useState<string>("demo-general");
  const [messages, setMessages] = useState<Message[]>([]);
  const [botTyping, setBotTyping] = useState(false);

  const storeRef = useRef<Map<string, Message[]>>(
    new Map([["demo-general", []], ["demo-music", []]])
  );
  const timersRef = useRef<number[]>([]);
  const welcomedRef = useRef(false);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const pushMessage = useCallback((roomId: string, msg: Message) => {
    const list = storeRef.current.get(roomId) ?? [];
    list.push(msg);
    storeRef.current.set(roomId, list);
    setMessages((cur) =>
      roomId === activeRoomIdRef.current ? [...list] : cur
    );
    setRooms((cur) =>
      cur.map((r) =>
        r.id === roomId
          ? {
              ...r,
              lastActivity: msg.createdAt,
              lastPreview:
                msg.kind === "text"
                  ? msg.text
                  : msg.kind === "image"
                    ? "Фотография"
                    : msg.kind === "video"
                      ? "Видео"
                      : msg.kind === "voice"
                        ? "Голосовое сообщение"
                        : "Событие",
            }
          : r
      )
    );
  }, []);

  const activeRoomIdRef = useRef(activeRoomId);
  activeRoomIdRef.current = activeRoomId;

  const botSay = useCallback(
    (roomId: string, partial: Omit<Message, "id" | "roomId" | "senderId" | "senderName" | "senderHue" | "createdAt">, delay: number) => {
      const t1 = window.setTimeout(() => setBotTyping(true), Math.max(200, delay * 0.35));
      const t2 = window.setTimeout(() => {
        setBotTyping(false);
        pushMessage(roomId, {
          id: uid(),
          roomId,
          senderId: BOT_ID,
          senderName: BOT_NAME,
          senderHue: BOT_HUE,
          createdAt: Date.now(),
          ...partial,
        });
      }, delay);
      timersRef.current.push(t1, t2);
    },
    [pushMessage]
  );

  // приветствие при первом входе
  useEffect(() => {
    if (welcomedRef.current) return;
    welcomedRef.current = true;
    const name = profileRef.current.name;
    botSay(
      "demo-general",
      {
        kind: "text",
        text: `Добро пожаловать на станцию, ${name}! Я — смотритель эфира. Отправь текст, прикрепи фото или видео, либо нажми на микрофон и запиши голосовое — всё появится прямо здесь.`,
      },
      900
    );
    const wav = synthVoiceWav(2.6);
    botSay(
      "demo-general",
      {
        kind: "voice",
        url: URL.createObjectURL(wav),
        duration: 2.6,
        size: wav.size,
      },
      2600
    );
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
    };
  }, [botSay]);

  const selectRoom = useCallback((id: string) => {
    setActiveRoomId(id);
    setMessages([...(storeRef.current.get(id) ?? [])]);
  }, []);

  const createRoom = useCallback(async (name: string) => {
    const id = "room-" + uid();
    const room: Room = {
      id,
      name,
      hue: hashHue(name),
      lastActivity: Date.now(),
      lastPreview: "канал создан",
    };
    storeRef.current.set(id, []);
    setRooms((cur) => [room, ...cur]);
    pushMessage(id, {
      id: uid(),
      roomId: id,
      senderId: "system",
      senderName: "система",
      senderHue: 0,
      kind: "system",
      text: `Канал «${name}» вышел в эфир`,
      createdAt: Date.now(),
    });
    botSay(id, { kind: "text", text: `Новый канал «${name}» в сети. Я на связи и тут.` }, 1600);
    setActiveRoomId(id);
    setMessages([...(storeRef.current.get(id) ?? [])]);
    return id;
  }, [botSay, pushMessage]);

  const sendText = useCallback(
    async (text: string) => {
      const roomId = activeRoomIdRef.current;
      pushMessage(roomId, {
        id: uid(),
        roomId,
        senderId: profileRef.current.uid,
        senderName: profileRef.current.name,
        senderHue: profileRef.current.hue,
        kind: "text",
        text,
        createdAt: Date.now(),
      });
      botSay(roomId, { kind: "text", text: pick(TEXT_REPLIES) }, 1300 + Math.random() * 1400);
    },
    [botSay, pushMessage]
  );

  const sendMedia = useCallback(
    async (
      kind: "image" | "video" | "voice",
      blob: Blob,
      meta: MediaMeta,
      onProgress?: (pct: number) => void
    ) => {
      const roomId = activeRoomIdRef.current;
      const p = profileRef.current;
      const id = uid();
      const localUrl = URL.createObjectURL(blob);
      const msg: Message = {
        id,
        roomId,
        senderId: p.uid,
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
      pushMessage(roomId, msg);

      // имитация загрузки с прогрессом
      let pct = 0;
      const tick = window.setInterval(() => {
        pct = Math.min(100, pct + 14 + Math.random() * 18);
        onProgress?.(pct);
        const list = storeRef.current.get(roomId) ?? [];
        const i = list.findIndex((m) => m.id === id);
        if (i >= 0) {
          list[i] = { ...list[i], progress: pct, uploading: pct < 100 };
          storeRef.current.set(roomId, list);
          if (activeRoomIdRef.current === roomId) setMessages([...list]);
        }
        if (pct >= 100) window.clearInterval(tick);
      }, 130);
      timersRef.current.push(tick);

      const replies =
        kind === "image" ? PHOTO_REPLIES : kind === "video" ? VIDEO_REPLIES : VOICE_REPLIES;
      botSay(roomId, { kind: "text", text: pick(replies) }, 1800 + Math.random() * 1200);

      // на голосовое бот отвечает своим синтезированным голосом
      if (kind === "voice") {
        const dur = 1.8 + Math.random() * 2.4;
        const wav = synthVoiceWav(dur);
        botSay(
          roomId,
          {
            kind: "voice",
            url: URL.createObjectURL(wav),
            duration: dur,
            size: wav.size,
          },
          4200
        );
      }
    },
    [botSay, pushMessage]
  );

  const setTyping = useCallback((_t: boolean) => {
    /* в демо печатает только бот */
  }, []);

  const createGroup = useCallback(
    async (name: string, _members: string[]) => {
      const id = "group-" + uid();
      const room: Room = {
        id,
        name,
        type: "group",
        hue: hashHue(name),
        lastActivity: Date.now(),
        lastPreview: "группа создана",
        createdBy: profileRef.current.name,
        members: [profileRef.current.uid],
      };
      storeRef.current.set(id, []);
      setRooms((cur) => [room, ...cur]);
      pushMessage(id, {
        id: uid(),
        roomId: id,
        senderId: "system",
        senderName: "система",
        senderHue: 0,
        kind: "system",
        text: `Группа «${name}» создана`,
        createdAt: Date.now(),
      });
      botSay(id, { kind: "text", text: `Заглянул в группу «${name}». Я тут.` }, 1400);
      setActiveRoomId(id);
      setMessages([...(storeRef.current.get(id) ?? [])]);
      return id;
    },
    [botSay, pushMessage]
  );

  /* ---------- демо-аккаунты и модерация (всё по-настоящему, локально) ---------- */
  const [demoUsers, setDemoUsers] = useState<UserDoc[]>(() => [
    {
      phone: "79000000001",
      username: "demo_nastya",
      name: "Настя",
      hue: 320,
      role: "user",
      verified: true,
      createdAt: Date.now() - 86400_000,
    },
    {
      phone: "79000000002",
      username: "demo_max",
      name: "Макс",
      hue: 204,
      role: "admin",
      verified: false,
      createdAt: Date.now() - 43200_000,
    },
  ]);

  /* мой демо-документ: в демо вы — креатор станции */
  const [meDemo, setMeDemo] = useState<UserDoc>(() => ({
    phone: "79990000000",
    username: "demo_creator",
    name: profile.name,
    hue: profile.hue,
    role: "creator",
    verified: true,
    createdAt: Date.now(),
  }));

  const updateMyProfile = useCallback(
    async (p: { name?: string; username?: string; hue?: number; theme?: ThemeName }) => {
      setMeDemo((cur) => ({ ...cur, ...p }));
    },
    []
  );
  const setRole = useCallback(async (phone: string, r: Role) => {
    setDemoUsers((cur) => cur.map((u) => (u.phone === phone ? { ...u, role: r } : u)));
  }, []);
  const setVerified = useCallback(async (phone: string, v: boolean) => {
    setDemoUsers((cur) => cur.map((u) => (u.phone === phone ? { ...u, verified: v } : u)));
  }, []);
  const muteUser = useCallback(async (phone: string, until: number | null) => {
    setDemoUsers((cur) =>
      cur.map((u) => (u.phone === phone ? { ...u, mutedUntil: until ?? undefined } : u))
    );
  }, []);
  const resetUsers = useCallback(async () => {
    const n = demoUsersRef.current.length;
    setDemoUsers([]);
    return n;
  }, []);
  const demoUsersRef = useRef<UserDoc[]>(demoUsers);
  demoUsersRef.current = demoUsers;
  const searchUsers = useCallback(async (q: string) => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const digits = s.replace(/\D/g, "");
    return demoUsersRef.current.filter(
      (u) =>
        (digits.length >= 3 && u.phone.includes(digits)) ||
        u.username.includes(s.replace(/^@/, "")) ||
        u.name.toLowerCase().includes(s)
    );
  }, []);

  const presence: Presence[] = [
    {
      uid: profile.uid,
      name: profile.name,
      hue: profile.hue,
      typing: false,
      lastSeen: Date.now(),
    },
    {
      uid: BOT_ID,
      name: BOT_NAME,
      hue: BOT_HUE,
      typing: botTyping,
      lastSeen: Date.now(),
      isBot: true,
    },
  ];

  return {
    mode: "demo",
    mySenderId: profile.uid,
    connecting: false,
    error: null,
    rooms,
    activeRoomId,
    messages,
    presence,
    meDoc: meDemo,
    allUsers: [meDemo, ...demoUsers],
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
