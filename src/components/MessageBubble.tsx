import type { Message } from "../types";
import { avatarGradient, formatBytes, formatClock } from "../lib/media";
import { Icon } from "./Icon";
import { VoicePlayer } from "./VoicePlayer";

interface Props {
  msg: Message;
  mine: boolean;
  first: boolean; // первое в группе
  last: boolean; // последнее в группе
  onOpenImage: (url: string) => void;
}

export function MessageBubble({ msg, mine, first, last, onOpenImage }: Props) {
  if (msg.kind === "system") {
    return (
      <div className="anim-msg-in my-2 flex justify-center">
        <span className="rounded-full border border-ink-600 bg-ink-800/80 px-3.5 py-1 text-center font-mono text-[11px] text-ink-300">
          {msg.text}
        </span>
      </div>
    );
  }

  const isMedia = msg.kind === "image" || msg.kind === "video" || msg.kind === "voice";
  const roundBase = mine
    ? `rounded-xl ${last ? "rounded-br-[4px]" : ""}`
    : `rounded-xl ${last ? "rounded-bl-[4px]" : ""}`;

  return (
    <div className={`anim-msg-in flex w-full gap-2.5 ${mine ? "flex-row-reverse" : ""} ${first ? "mt-3" : "mt-[3px]"}`}>
      {/* аватар */}
      <div className="w-8 shrink-0 self-end">
        {!mine && last && (
          <div
            className="grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold text-white/95 shadow-md"
            style={{ background: avatarGradient(msg.senderHue) }}
            title={msg.senderName}
          >
            {msg.senderName.trim().slice(0, 1).toUpperCase() || "?"}
          </div>
        )}
      </div>

      <div className={`flex max-w-[82%] flex-col sm:max-w-[68%] ${mine ? "items-end" : "items-start"}`}>
        {first && !mine && (
          <span
            className="mb-1 ml-1 text-xs font-semibold"
            style={{ color: `hsl(${msg.senderHue} 70% 62%)` }}
          >
            {msg.senderName}
          </span>
        )}

        <div
          className={`relative overflow-hidden border px-3 py-2 ${roundBase} ${
            mine
              ? "border-amber-400/25 bg-amber-400 text-amber-950"
              : "border-ink-600/70 bg-ink-750 text-ink-50"
          } ${isMedia ? (msg.kind === "voice" ? "py-2.5" : "p-1.5") : ""} ${
            msg.failed ? "border-coral-500/70" : ""
          }`}
        >
          {/* содержимое */}
          {msg.kind === "text" && (
            <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">
              {msg.text}
            </p>
          )}

          {msg.kind === "image" && msg.url && (
            <button onClick={() => onOpenImage(msg.url!)} className="block cursor-zoom-in" aria-label="Открыть фото">
              <img
                src={msg.url}
                alt={msg.fileName ?? "Фотография"}
                className={`max-h-72 w-full max-w-[320px] rounded-lg object-cover ${msg.uploading ? "opacity-60" : ""}`}
                loading="lazy"
              />
            </button>
          )}

          {msg.kind === "video" && msg.url && (
            <video
              src={msg.url}
              controls
              playsInline
              preload="metadata"
              className={`max-h-72 w-full max-w-[340px] rounded-lg bg-black/50 ${msg.uploading ? "opacity-60" : ""}`}
            />
          )}

          {msg.kind === "voice" && msg.url && (
            <div className={msg.uploading ? "opacity-60" : ""}>
              <VoicePlayer url={msg.url} duration={msg.duration} seed={msg.id} mine={mine} />
            </div>
          )}

          {/* мета-строка внутри пузыря */}
          <div
            className={`mt-0.5 flex items-center justify-end gap-1.5 px-1 pb-0.5 font-mono text-[10px] leading-none ${
              mine ? "text-amber-950/70" : "text-ink-300"
            }`}
          >
            {msg.size != null && isMedia && msg.kind !== "voice" && (
              <span>{formatBytes(msg.size)}</span>
            )}
            <span>{formatClock(msg.createdAt)}</span>
          </div>

          {/* прогресс загрузки */}
          {msg.uploading && (
            <>
              <div className="absolute inset-0 grid place-items-center bg-ink-950/30">
                <span className="rounded-full bg-ink-950/85 px-2.5 py-1 font-mono text-[11px] text-teal-300">
                  {Math.round(msg.progress ?? 0)}%
                </span>
              </div>
              <div className="absolute bottom-0 left-0 h-[3px] w-full bg-ink-600/60">
                <div
                  className="h-full bg-teal-400 transition-[width] duration-200"
                  style={{ width: `${msg.progress ?? 0}%` }}
                />
              </div>
            </>
          )}

          {msg.failed && (
            <div className="absolute inset-0 grid place-items-center bg-ink-950/60">
              <span className="flex items-center gap-1.5 rounded-full bg-coral-500/90 px-2.5 py-1 text-[11px] font-semibold text-white">
                <Icon name="alert" size={12} /> не отправлено
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
