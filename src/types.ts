export type MediaKind = "text" | "image" | "video" | "voice" | "system";

export type Role = "creator" | "admin" | "user";
export type ThemeName = "dark" | "light" | "wave";

export interface Profile {
  uid: string; // "u" + номер телефона (или guest-…)
  phone?: string; // только цифры
  name: string; // ник — может повторяться
  username?: string; // юзернейм — уникальный, без @
  hue: number; // 0..360, цвет аватара
  role?: Role;
  verified?: boolean;
  mutedUntil?: number; // timestamp, до которого мут
}

/** Документ пользователя в Firestore (коллекция users, id = телефон) */
export interface UserDoc {
  phone: string;
  username: string;
  name: string;
  hue: number;
  role: Role;
  verified: boolean;
  mutedUntil?: number;
  theme?: ThemeName;
  createdAt: number;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderHue: number;
  kind: MediaKind;
  text?: string;
  url?: string;
  duration?: number; // сек, для voice/video
  size?: number; // байт
  fileName?: string;
  createdAt: number;
  /** локальные поля на время отправки */
  uploading?: boolean;
  progress?: number; // 0..100
  failed?: boolean;
}

export interface Room {
  id: string;
  name: string;
  hue: number;
  lastActivity: number;
  lastPreview?: string;
  createdBy?: string;
  type?: "channel" | "group";
  members?: string[]; // телефоны участников (для групп)
}

export interface Presence {
  uid: string;
  name: string;
  hue: number;
  typing: boolean;
  lastSeen: number;
  isBot?: boolean;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface MediaMeta {
  duration?: number;
  size?: number;
  fileName?: string;
}

export interface ChatBackend {
  mode: "demo" | "firebase";
  mySenderId: string;
  connecting: boolean;
  error: string | null;
  rooms: Room[];
  activeRoomId: string | null;
  messages: Message[];
  presence: Presence[];
  /** живой документ моего аккаунта (firebase) */
  meDoc: UserDoc | null;
  /** все пользователи (firebase, для панели креатора и поиска) */
  allUsers: UserDoc[];
  selectRoom: (id: string) => void;
  createRoom: (name: string) => Promise<string | null>;
  createGroup: (name: string, members: string[]) => Promise<string | null>;
  sendText: (text: string) => Promise<void>;
  sendMedia: (
    kind: "image" | "video" | "voice",
    blob: Blob,
    meta: MediaMeta,
    onProgress?: (pct: number) => void
  ) => Promise<void>;
  setTyping: (typing: boolean) => void;
  /* ---- аккаунты и модерация ---- */
  updateMyProfile: (patch: {
    name?: string;
    username?: string;
    hue?: number;
    theme?: ThemeName;
  }) => Promise<void>;
  setRole: (phone: string, role: Role) => Promise<void>;
  setVerified: (phone: string, v: boolean) => Promise<void>;
  muteUser: (phone: string, until: number | null) => Promise<void>;
  resetUsers: () => Promise<number>;
  searchUsers: (q: string) => Promise<UserDoc[]>;
}
