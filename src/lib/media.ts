import type { Profile } from "../types";

/** Сжать изображение на canvas: максимум 1600px по большей стороне, JPEG 0.82 */
export function compressImage(file: Blob): Promise<Blob> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const MAX = 1600;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.82);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

/** Синтез короткой WAV-мелодии (для голосовых ответов бота в демо). */
export function synthVoiceWav(seconds: number): Blob {
  const sampleRate = 22050;
  const total = Math.floor(sampleRate * seconds);
  const data = new Float32Array(total);
  const scale = [220, 262, 330, 392, 440, 523, 587, 660];
  let noteIdx = Math.floor(Math.random() * scale.length);
  const noteLen = Math.floor(sampleRate * 0.22);
  for (let i = 0; i < total; i++) {
    if (i % noteLen === 0) {
      const step = Math.floor(Math.random() * 3) - 1;
      noteIdx = Math.min(scale.length - 1, Math.max(0, noteIdx + step));
    }
    const f = scale[noteIdx];
    const t = i / sampleRate;
    const env =
      Math.min(1, (i % noteLen) / 400) *
      Math.min(1, (noteLen - (i % noteLen)) / 600) *
      Math.min(1, i / 800) *
      Math.min(1, (total - i) / 2000);
    data[i] =
      (Math.sin(2 * Math.PI * f * t) * 0.6 +
        Math.sin(2 * Math.PI * f * 2 * t) * 0.18) *
      env *
      0.7;
  }
  // WAV 16-bit PCM mono
  const buffer = new ArrayBuffer(44 + total * 2);
  const view = new DataView(buffer);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + total * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, total * 2, true);
  for (let i = 0; i < total; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDay(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Сегодня";
  if (d.toDateString() === yest.toDateString()) return "Вчера";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

export function hashHue(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Детерминированный "waveform" для плеера голосовых */
export function waveformBars(seed: string, count = 28): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const out: number[] = [];
  let x = h >>> 0;
  for (let i = 0; i < count; i++) {
    x = (Math.imul(x, 1103515245) + 12345) >>> 0;
    const r = (x >>> 16) / 65536;
    const center = Math.sin((i / count) * Math.PI);
    out.push(0.25 + r * 0.45 + center * 0.3);
  }
  return out;
}

export function makeGuestProfile(): Profile {
  const n = Math.floor(1000 + Math.random() * 9000);
  return {
    uid: "guest-" + uid(),
    name: `Гость ${n}`,
    hue: Math.floor(Math.random() * 360),
  };
}

export const HUE_SWATCHES = [168, 36, 8, 204, 96, 320, 52, 260];

export function avatarGradient(hue: number): string {
  return `linear-gradient(135deg, hsl(${hue} 72% 46%), hsl(${(hue + 42) % 360} 78% 34%))`;
}
