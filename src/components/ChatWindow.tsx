import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatBackend, Message, Profile } from "../types";
import { avatarGradient, compressImage, formatDay } from "../lib/media";
import { Composer } from "./Composer";
import { Icon } from "./Icon";
import { MessageBubble } from "./MessageBubble";
import { WaveBars } from "./Ambient";

interface Props {
  backend: ChatBackend;
  profile: Profile;
  onBack?: () => void;
  toast: (msg: string, type?: "info" | "error") => void;
}

export function ChatWindow({ backend, profile, onBack, toast }: Props) {
  const { messages, rooms, activeRoomId, presence, connecting, error } = backend;
  const room = rooms.find((r) => r.id === activeRoomId) ?? null;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, activeRoomId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const typingNames = useMemo(
    () =>
      presence
        .filter((p) => p.typing && !(p.name === profile.name && !p.isBot))
        .map((p) => p.name.split(" ")[0]),
    [presence, profile.name]
  );

  const online = useMemo(
    () => presence.filter((p) => Date.now() - p.lastSeen < 45_000).length,
    [presence]
  );

  /* группировка сообщений + разделители дней */
  const rendered = useMemo(() => {
    const out: Array<{ type: "day"; label: string; key: string } | { type: "msg"; msg: Message; first: boolean; last: boolean }> = [];
    messages.forEach((m, i) => {
      const prev = messages[i - 1];
      const next = messages[i + 1];
      if (!prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString()) {
        out.push({ type: "day", label: formatDay(m.createdAt), key: "day-" + m.id });
      }
      const first =
        !prev ||
        prev.senderId !== m.senderId ||
        prev.kind === "system" ||
        m.kind === "system" ||
        m.createdAt - prev.createdAt > 5 * 60_000;
      const last =
        !next ||
        next.senderId !== m.senderId ||
        next.kind === "system" ||
        m.kind === "system" ||
        next.createdAt - m.createdAt > 5 * 60_000;
      out.push({ type: "msg", msg: m, first, last });
    });
    return out;
  }, [messages]);

  /* роль и галочка отправителя (для бейджей у ника) */
  const senderInfo = (id: string): { role?: "creator" | "admin" | "user"; verified?: boolean } => {
    if (id === "efir-bot") return { verified: true };
    const u = backend.allUsers.find((x) => "u" + x.phone === id);
    return u ? { role: u.role, verified: u.verified } : {};
  };

  const mutedNow = profile.mutedUntil != null && profile.mutedUntil > Date.now();

  const handleText = async (text: string) => {
    if (mutedNow) {
      toast("Вы в муте — сообщение не уйдёт", "error");
      return;
    }
    try {
      await backend.sendText(text);
    } catch {
      toast("Сообщение не долетело до эфира", "error");
    }
  };

  const handleVoice = async (blob: Blob, meta: { duration?: number; size?: number }) => {
    try {
      await backend.sendMedia("voice", blob, meta);
    } catch {
      toast("Голосовое не загрузилось", "error");
    }
  };

  const handleFile = async (kind: "image" | "video", file: File) => {
    try {
      if (kind === "image") {
        toast("Сжимаю фото и отправляю…", "info");
        const blob = await compressImage(file);
        await backend.sendMedia("image", blob, { size: blob.size, fileName: file.name });
      } else {
        await backend.sendMedia("video", file, { size: file.size, fileName: file.name });
      }
    } catch {
      toast("Файл не загрузился в Storage", "error");
    }
  };

  return (
    <section className="relative z-10 flex min-w-0 flex-1 flex-col">
      {/* ---------- шапка ---------- */}
      <header className="flex items-center gap-3 border-b border-ink-600/60 bg-ink-850/85 px-3 py-2.5 backdrop-blur-md sm:px-4">
        {onBack && (
          <button
            onClick={onBack}
            className="grid h-9 w-9 place-items-center rounded-lg border border-ink-500 text-ink-200 transition-colors hover:border-teal-400/60 hover:text-teal-300 md:hidden"
            aria-label="К каналам"
          >
            <Icon name="back" size={18} />
          </button>
        )}
        {room ? (
          <>
            <div
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white shadow-md"
              style={{ background: avatarGradient(room.hue) }}
            >
              <Icon name="radio" size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-display text-[15px] font-semibold tracking-wide text-ink-50">
                {room.name}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-ink-300">
                {typingNames.length > 0 ? (
                  <>
                    <span className="text-teal-300">{typingNames.join(", ")} печатает</span>
                    <span className="flex gap-[3px]">
                      <i className="typing-dot h-1 w-1 rounded-full bg-teal-300" />
                      <i className="typing-dot h-1 w-1 rounded-full bg-teal-300" />
                      <i className="typing-dot h-1 w-1 rounded-full bg-teal-300" />
                    </span>
                  </>
                ) : (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="anim-ping-soft absolute inline-flex h-full w-full rounded-full bg-teal-400" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-400" />
                    </span>
                    {online > 0 ? `${online} в эфире` : "канал в сети"}
                  </>
                )}
              </div>
            </div>
            <div className="hidden items-center gap-1.5 rounded-full border border-ink-500 px-3 py-1.5 font-mono text-[11px] text-ink-300 sm:flex">
              <Icon name="users" size={13} className="text-teal-400" />
              live
            </div>
          </>
        ) : (
          <div className="flex-1 text-sm text-ink-300">
            {connecting ? "Настраиваем эфир…" : "Выберите канал"}
          </div>
        )}
      </header>

      {error && (
        <div className="flex items-center gap-2 border-b border-coral-500/30 bg-coral-500/10 px-4 py-2 text-xs text-coral-500">
          <Icon name="alert" size={14} />
          {error}
        </div>
      )}

      {/* ---------- сообщения ---------- */}
      <div ref={scrollRef} className="scroll-slim relative flex-1 overflow-y-auto px-3 py-4 sm:px-6">
        {connecting ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-ink-300">
            <span className="anim-spin-slow inline-block h-8 w-8 rounded-full border-2 border-ink-500 border-t-teal-400" />
            <p className="font-mono text-xs">подключаемся к Firebase…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <WaveBars size={44} />
            <div>
              <p className="font-display text-lg font-semibold text-ink-100">Тишина в эфире</p>
              <p className="mt-1 max-w-xs text-sm text-ink-300">
                Отправьте первое сообщение, фото, видео — или запишите голосовое прямо с микрофона.
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl">
            {rendered.map((item) =>
              item.type === "day" ? (
                <div key={item.key} className="my-4 flex items-center gap-3">
                  <span className="h-px flex-1 bg-ink-600/50" />
                  <span className="rounded-full border border-ink-600 bg-ink-800/70 px-3 py-0.5 font-mono text-[10px] uppercase tracking-widest text-ink-300">
                    {item.label}
                  </span>
                  <span className="h-px flex-1 bg-ink-600/50" />
                </div>
              ) : (
                <MessageBubble
                  key={item.msg.id}
                  msg={item.msg}
                  mine={item.msg.senderId === backend.mySenderId}
                  first={item.first}
                  last={item.last}
                  onOpenImage={setLightbox}
                />
              )
            )}
          </div>
        )}
      </div>

      {/* ---------- композер ---------- */}
      <Composer
        onSendText={(t) => void handleText(t)}
        onVoice={(b, m) => void handleVoice(b, m)}
        onFile={(k, f) => void handleFile(k, f)}
        onTyping={backend.setTyping}
        toast={toast}
        disabled={connecting || !room}
      />

      {/* ---------- лайтбокс ---------- */}
      {lightbox && (
        <div
          className="anim-msg-in fixed inset-0 z-50 grid cursor-zoom-out place-items-center bg-ink-950/90 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 grid h-10 w-10 place-items-center rounded-full border border-ink-500 bg-ink-800 text-ink-200 transition-colors hover:text-coral-500"
            aria-label="Закрыть"
          >
            <Icon name="close" size={18} />
          </button>
          <img
            src={lightbox}
            alt="Фотография"
            className="max-h-[90vh] max-w-full rounded-xl shadow-2xl shadow-black/60"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
