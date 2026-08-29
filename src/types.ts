export type MediaKind = "text" | "image" | "video" | "voice" | "system";

export interface Profile {
  uid: string;
  name: string;
  hue: number; // 0..360, цвет аватара
  phone?: string; // цифры номера (логин в Firebase-режиме)
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
  selectRoom: (id: string) => void;
  createRoom: (name: string) => Promise<string | null>;
  sendText: (text: string) => Promise<void>;
  sendMedia: (
    kind: "image" | "video" | "voice",
    blob: Blob,
    meta: MediaMeta,
    onProgress?: (pct: number) => void
  ) => Promise<void>;
  setTyping: (typing: boolean) => void;
}
