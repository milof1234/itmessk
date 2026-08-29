import { useEffect, useRef, useState } from "react";
import { useRecorder, MAX_RECORD_SECONDS } from "../hooks/useRecorder";
import { formatDuration } from "../lib/media";
import type { MediaMeta } from "../types";
import { Icon } from "./Icon";

interface Props {
  onSendText: (text: string) => void;
  onVoice: (blob: Blob, meta: MediaMeta) => void;
  onFile: (kind: "image" | "video", file: File) => void;
  onTyping: (typing: boolean) => void;
  toast: (msg: string, type?: "info" | "error") => void;
  disabled?: boolean;
}

const MAX_IMAGE_MB = 15;
const MAX_VIDEO_MB = 80;

export function Composer({ onSendText, onVoice, onFile, onTyping, toast, disabled }: Props) {
  const [text, setText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<number>(0);
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const sendVoice = (r: { blob: Blob; duration: number }) => {
    onVoice(r.blob, { duration: r.duration, size: r.blob.size });
  };

  const recorder = useRecorder({
    onAutoStop: sendVoice,
    onError: (m) => toast(m, "error"),
  });

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const resize = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(140, ta.scrollHeight) + "px";
  };

  const handleChange = (v: string) => {
    setText(v);
    resize();
    onTyping(true);
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => onTyping(false), 2200);
  };

  const submit = () => {
    const t = text.trim();
    if (!t || disabled) return;
    onSendText(t);
    setText("");
    onTyping(false);
    window.clearTimeout(typingTimer.current);
    requestAnimationFrame(resize);
    taRef.current?.focus();
  };

  const stopAndSend = async () => {
    const res = await recorder.stop();
    if (res) sendVoice(res);
  };

  const pickFile = (kind: "image" | "video", file: File | undefined) => {
    if (!file) return;
    const max = kind === "image" ? MAX_IMAGE_MB : MAX_VIDEO_MB;
    if (file.size > max * 1024 * 1024) {
      toast(`Файл больше ${max} МБ — Firebase Spark любит файлы поменьше`, "error");
      return;
    }
    onFile(kind, file);
    setMenuOpen(false);
  };

  const levels = recorder.levels.slice(-38);

  return (
    <div className="border-t border-ink-600/60 bg-ink-850/85 px-3 py-3 backdrop-blur-md sm:px-4">
      {recorder.recording ? (
        /* ---------- режим записи ---------- */
        <div className="anim-msg-in flex items-center gap-3">
          <button
            onClick={recorder.cancel}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-ink-500 text-ink-200 transition-colors hover:border-coral-500 hover:text-coral-500"
            aria-label="Отменить запись"
            title="Отменить"
          >
            <Icon name="close" size={18} />
          </button>

          <div className="flex h-12 flex-1 items-center gap-3 rounded-xl border border-coral-500/35 bg-ink-800 px-3">
            <span className="anim-rec h-2.5 w-2.5 shrink-0 rounded-full bg-coral-500" />
            <span className="font-mono text-sm text-coral-500 tabular-nums">
              {formatDuration(recorder.elapsed)}
            </span>
            <div className="flex h-8 flex-1 items-center gap-[2px] overflow-hidden">
              {levels.length === 0 && (
                <span className="text-xs text-ink-300">говорите — волна появится здесь…</span>
              )}
              {levels.map((lv, i) => (
                <span
                  key={i}
                  className="w-[3px] shrink-0 rounded-full bg-coral-500/80 transition-[height] duration-75"
                  style={{ height: `${Math.max(8, Math.round(lv * 100))}%` }}
                />
              ))}
            </div>
            <span className="hidden font-mono text-[10px] text-ink-400 sm:block">
              лимит {formatDuration(MAX_RECORD_SECONDS)}
            </span>
          </div>

          <button
            onClick={stopAndSend}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-coral-500 text-white shadow-lg shadow-coral-500/30 transition-transform hover:scale-105 active:scale-95"
            aria-label="Остановить и отправить"
            title="Отправить голосовое"
          >
            <Icon name="send" size={19} />
          </button>
        </div>
      ) : (
        /* ---------- обычный режим ---------- */
        <div className="flex items-end gap-2">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              disabled={disabled}
              className={`grid h-11 w-11 place-items-center rounded-xl border transition-all duration-200 ${
                menuOpen
                  ? "rotate-45 border-teal-400 bg-teal-400/15 text-teal-300"
                  : "border-ink-500 text-ink-200 hover:border-teal-400/60 hover:text-teal-300"
              } active:scale-90 disabled:opacity-40`}
              aria-label="Прикрепить файл"
              title="Фото или видео"
            >
              <Icon name="plus" size={20} />
            </button>

            {menuOpen && (
              <div className="anim-msg-in absolute bottom-13 left-0 z-30 w-52 overflow-hidden rounded-xl border border-ink-500 bg-ink-750 shadow-2xl shadow-black/50">
                <button
                  onClick={() => photoInput.current?.click()}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-ink-100 transition-colors hover:bg-teal-400/10 hover:text-teal-300"
                >
                  <Icon name="photo" size={18} className="text-teal-400" />
                  Фотография
                  <span className="ml-auto font-mono text-[10px] text-ink-400">до {MAX_IMAGE_MB} МБ</span>
                </button>
                <div className="h-px bg-ink-600/70" />
                <button
                  onClick={() => videoInput.current?.click()}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-ink-100 transition-colors hover:bg-amber-400/10 hover:text-amber-300"
                >
                  <Icon name="video" size={18} className="text-amber-400" />
                  Видео
                  <span className="ml-auto font-mono text-[10px] text-ink-400">до {MAX_VIDEO_MB} МБ</span>
                </button>
              </div>
            )}
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                pickFile("image", e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <input
              ref={videoInput}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                pickFile("video", e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>

          <div className="flex-1 rounded-xl border border-ink-500 bg-ink-750 transition-colors focus-within:border-teal-400/60">
            <textarea
              ref={taRef}
              rows={1}
              value={text}
              disabled={disabled}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={disabled ? "Подключение к эфиру…" : "Сообщение в эфир…"}
              className="block max-h-[140px] w-full resize-none bg-transparent px-3.5 py-2.5 text-[15px] text-ink-50 outline-none placeholder:text-ink-400 disabled:opacity-50"
            />
          </div>

          {text.trim() ? (
            <button
              onClick={submit}
              className="anim-msg-in grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-400 text-amber-950 shadow-lg shadow-amber-400/25 transition-transform hover:scale-105 active:scale-90"
              aria-label="Отправить"
            >
              <Icon name="send" size={19} />
            </button>
          ) : (
            <button
              onClick={() => void recorder.start()}
              disabled={disabled || typeof MediaRecorder === "undefined"}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-400 text-ink-950 shadow-lg shadow-teal-400/25 transition-transform hover:scale-105 active:scale-90 disabled:opacity-40"
              aria-label="Записать голосовое"
              title="Записать голосовое сообщение"
            >
              <Icon name="mic" size={20} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
