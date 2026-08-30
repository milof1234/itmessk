import { useCallback, useEffect, useRef, useState } from "react";
import { formatDuration, waveformBars } from "../lib/media";
import { Icon } from "./Icon";

interface Props {
  url: string;
  duration?: number;
  seed: string;
  mine?: boolean;
}

/** Кастомный плеер голосового: волна, клик для перемотки, таймер. */
export function VoicePlayer({ url, duration, seed, mine }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [knownDur, setKnownDur] = useState<number | null>(null);
  const bars = waveformBars(seed);
  const fixRef = useRef(false);

  const dur =
    (knownDur && isFinite(knownDur) && knownDur > 0 ? knownDur : null) ?? duration ?? 0;

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCur(a.currentTime);
    const onEnd = () => {
      setPlaying(false);
      setCur(0);
    };
    const onMeta = () => {
      // Chrome отдаёт Infinity для webm-блобов — чиним перемоткой в конец
      if (a.duration === Infinity) {
        fixRef.current = true;
        a.currentTime = 1e7;
      } else if (isFinite(a.duration) && a.duration > 0) {
        setKnownDur(a.duration);
      }
    };
    const onSeeked = () => {
      if (fixRef.current) {
        fixRef.current = false;
        setKnownDur(a.duration);
        a.currentTime = 0;
      }
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("seeked", onSeeked);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("seeked", onSeeked);
      a.pause();
    };
  }, [url]);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      void a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }, [playing]);

  const seek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const a = audioRef.current;
      if (!a) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const total = dur || a.duration || 0;
      if (total > 0 && isFinite(total)) {
        a.currentTime = ratio * total;
        setCur(a.currentTime);
      }
    },
    [dur]
  );

  const progress = dur > 0 ? Math.min(1, cur / dur) : 0;
  const accent = mine ? "var(--t-vp-mine)" : "var(--t-teal-400)";
  const playedCount = Math.round(progress * bars.length);

  return (
    <div className="flex min-w-[220px] items-center gap-3">
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        onClick={toggle}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition-transform duration-150 hover:scale-110 active:scale-95"
        style={{
          background: mine
            ? "color-mix(in oklab, var(--t-vp-mine) 16%, transparent)"
            : "color-mix(in oklab, var(--t-teal-400) 14%, transparent)",
          color: accent,
          border: `1px solid ${
            mine
              ? "color-mix(in oklab, var(--t-vp-mine) 25%, transparent)"
              : "color-mix(in oklab, var(--t-teal-400) 30%, transparent)"
          }`,
        }}
        aria-label={playing ? "Пауза" : "Слушать"}
      >
        <Icon name={playing ? "pause" : "play"} size={18} />
      </button>

      <div className="flex flex-1 flex-col gap-1">
        <div
          className="flex h-9 cursor-pointer items-center gap-[2.5px]"
          onClick={seek}
          title="Перемотать"
        >
          {bars.map((h, i) => (
            <span
              key={i}
              className="w-[3px] flex-1 rounded-full transition-colors duration-150"
              style={{
                height: `${Math.round(h * 100)}%`,
                background:
                  i < playedCount
                    ? accent
                    : mine
                      ? "color-mix(in oklab, var(--t-vp-mine) 30%, transparent)"
                      : "color-mix(in oklab, var(--t-ink-300) 40%, transparent)",
              }}
            />
          ))}
        </div>
        <div
          className="flex justify-between font-mono text-[11px] leading-none"
          style={{
            color: mine
              ? "color-mix(in oklab, var(--t-vp-mine) 72%, transparent)"
              : "var(--t-vp-other)",
          }}
        >
          <span>{formatDuration(cur)}</span>
          <span>{dur > 0 ? formatDuration(dur) : "–:––"}</span>
        </div>
      </div>
    </div>
  );
}
