import { useCallback, useEffect, useRef, useState } from "react";

export const MAX_RECORD_SECONDS = 180;

export interface RecordingResult {
  blob: Blob;
  duration: number;
}

interface Options {
  onAutoStop?: (r: RecordingResult) => void;
  onError?: (msg: string) => void;
}

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

export function useRecorder({ onAutoStop, onError }: Options = {}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);

  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<number>(0);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const stoppedRef = useRef(false);
  const resolveRef = useRef<((r: RecordingResult | null) => void) | null>(null);
  const autoStopRef = useRef(onAutoStop);
  autoStopRef.current = onAutoStop;

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    window.clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    recRef.current = null;
  }, []);

  const finish = useCallback(
    (blob: Blob | null) => {
      const duration = (Date.now() - startedAtRef.current) / 1000;
      setRecording(false);
      setElapsed(0);
      cleanup();
      if (blob && blob.size > 0) {
        const res = { blob, duration };
        if (stoppedRef.current === false) {
          resolveRef.current?.(res);
        } else {
          autoStopRef.current?.(res);
        }
      } else {
        resolveRef.current?.(null);
      }
      resolveRef.current = null;
    },
    [cleanup]
  );

  const start = useCallback(async (): Promise<boolean> => {
    if (recRef.current) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime =
        MIME_CANDIDATES.find((m) =>
          typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)
        ) ?? "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recRef.current = rec;
      chunksRef.current = [];
      stoppedRef.current = false;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: rec.mimeType || "audio/webm",
        });
        finish(blob);
      };

      // уровни громкости
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      const loop = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        setLevels((prev) => [...prev.slice(-41), Math.min(1, rms * 3.2)]);
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();

      startedAtRef.current = Date.now();
      setLevels([]);
      setElapsed(0);
      setRecording(true);
      rec.start(250);
      timerRef.current = window.setInterval(() => {
        const sec = (Date.now() - startedAtRef.current) / 1000;
        setElapsed(sec);
        if (sec >= MAX_RECORD_SECONDS) {
          stoppedRef.current = true; // помечаем как авто-стоп
          if (rec.state !== "inactive") rec.stop();
        }
      }, 100);
      return true;
    } catch {
      onError?.("Нет доступа к микрофону. Разрешите доступ в браузере.");
      return false;
    }
  }, [finish, onError]);

  const stop = useCallback((): Promise<RecordingResult | null> => {
    return new Promise((resolve) => {
      const rec = recRef.current;
      if (!rec || rec.state === "inactive") {
        resolve(null);
        return;
      }
      stoppedRef.current = false;
      resolveRef.current = resolve;
      rec.stop();
    });
  }, []);

  const cancel = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    chunksRef.current = [];
    resolveRef.current = null;
    stoppedRef.current = false;
    if (rec.state !== "inactive") {
      rec.onstop = () => {
        setRecording(false);
        setElapsed(0);
        setLevels([]);
        cleanup();
      };
      rec.stop();
    } else {
      setRecording(false);
      cleanup();
    }
  }, [cleanup]);

  useEffect(() => cleanup, [cleanup]);

  return { recording, elapsed, levels, start, stop, cancel };
}
