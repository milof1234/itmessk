import { useState } from "react";
import type { ChatBackend, Profile, ThemeName } from "../types";
import { HUE_SWATCHES, avatarGradient } from "../lib/media";
import { formatPhonePretty, USERNAME_RE } from "../lib/auth";
import { Icon } from "./Icon";
import { RoleBadges } from "./Badges";

interface Props {
  backend: ChatBackend;
  profile: Profile;
  theme: ThemeName;
  onTheme: (t: ThemeName) => void;
  onSaved: (patch: { name?: string; username?: string; hue?: number }) => void;
  onClose: () => void;
  toast: (msg: string, type?: "info" | "error") => void;
}

const THEMES: Array<{ id: ThemeName; label: string; preview: [string, string, string] }> = [
  { id: "dark", label: "Тёмная", preview: ["#0b120f", "#182720", "#2fd6b5"] },
  { id: "light", label: "Светлая", preview: ["#eef1ee", "#ffffff", "#0c9d82"] },
  { id: "wave", label: "Wave", preview: ["#051226", "#123564", "#3ad0f0"] },
];

export function SettingsModal({ backend, profile, theme, onTheme, onSaved, onClose, toast }: Props) {
  const [name, setName] = useState(profile.name);
  const [username, setUsername] = useState(profile.username ?? "");
  const [hue, setHue] = useState(profile.hue);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isFirebase = backend.mode === "firebase" && Boolean(profile.phone);

  const save = async () => {
    setErr(null);
    const patch: { name?: string; username?: string; hue?: number; theme?: ThemeName } = {};
    const n = name.trim();
    if (!n) {
      setErr("Ник не может быть пустым");
      return;
    }
    if (n !== profile.name) patch.name = n.slice(0, 20);
    if (hue !== profile.hue) patch.hue = hue;
    if (isFirebase) {
      const uname = username.trim().toLowerCase();
      if (!USERNAME_RE.test(uname)) {
        setErr("Юзернейм: 3–16 символов, латиница, цифры, «_» и «.»");
        return;
      }
      if (uname !== (profile.username ?? "")) patch.username = uname;
    }
    setBusy(true);
    try {
      if (isFirebase) await backend.updateMyProfile(patch);
      onSaved(patch);
      toast("Настройки сохранены", "info");
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  };

  const pickTheme = (t: ThemeName) => {
    onTheme(t);
    if (isFirebase) void backend.updateMyProfile({ theme: t }).catch(() => {});
  };

  const inputCls =
    "mt-1.5 w-full rounded-xl border border-ink-500 bg-ink-750 px-4 py-2.5 text-[15px] text-ink-50 outline-none transition-colors placeholder:text-ink-400 focus:border-teal-400/70";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="anim-modal scroll-slim max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-ink-600 bg-ink-850 p-5 sm:rounded-2xl sm:p-6"
        style={{ boxShadow: "0 30px 90px var(--t-shadow)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold tracking-widest text-ink-50 uppercase">
            Кастомизация
          </h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-ink-500 text-ink-300 transition-colors hover:text-coral-500"
            aria-label="Закрыть"
          >
            <Icon name="close" size={15} />
          </button>
        </div>

        {/* предпросмотр */}
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-ink-600 bg-ink-800/70 p-3.5">
          <span
            className="grid h-12 w-12 place-items-center rounded-full text-base font-bold text-white shadow-lg"
            style={{ background: avatarGradient(hue) }}
          >
            {(name.trim() || "?").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-semibold text-ink-50">{name.trim() || "—"}</span>
              <RoleBadges role={profile.role} verified={profile.verified} />
            </div>
            <p className="truncate font-mono text-[11px] text-ink-400">
              {username ? `@${username.toLowerCase()}` : "юзернейм не задан"}
              {profile.phone && ` · ${formatPhonePretty(profile.phone)}`}
            </p>
          </div>
        </div>

        <label className="mt-4 block">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
            Ник <span className="normal-case tracking-normal text-ink-500">(может совпадать с другими)</span>
          </span>
          <input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </label>

        {isFirebase && (
          <label className="mt-3 block">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
              Юзернейм <span className="text-amber-400">(уникальный)</span>
            </span>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-mono text-sm text-ink-400">@</span>
              <input
                value={username}
                maxLength={16}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, "").toLowerCase())}
                className={`${inputCls} pl-8 font-mono`}
              />
            </div>
          </label>
        )}

        <div className="mt-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">Цвет аватара</span>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            {HUE_SWATCHES.map((h) => (
              <button
                key={h}
                onClick={() => setHue(h)}
                className={`h-9 w-9 rounded-full transition-all duration-150 hover:scale-110 ${
                  hue === h ? "scale-110 ring-2 ring-ink-50 ring-offset-2 ring-offset-ink-850" : ""
                }`}
                style={{ background: avatarGradient(h) }}
                aria-label={`Цвет ${h}`}
              />
            ))}
          </div>
        </div>

        <div className="mt-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">Тема оформления</span>
          <div className="mt-2 grid grid-cols-3 gap-2.5">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => pickTheme(t.id)}
                className={`rounded-xl border p-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 ${
                  theme === t.id ? "border-teal-400/70 bg-teal-400/10" : "border-ink-500 bg-ink-800/60"
                }`}
              >
                <span className="flex h-10 overflow-hidden rounded-lg border border-ink-600">
                  <span className="flex-1" style={{ background: t.preview[0] }} />
                  <span className="w-2/5" style={{ background: t.preview[1] }} />
                  <span className="w-1" style={{ background: t.preview[2] }} />
                </span>
                <span className={`mt-1.5 block text-xs font-semibold ${theme === t.id ? "text-teal-300" : "text-ink-200"}`}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {err && (
          <p className="anim-msg-in mt-3 flex items-center gap-1.5 text-xs font-medium text-coral-500">
            <Icon name="alert" size={13} /> {err}
          </p>
        )}

        <button
          onClick={() => void save()}
          disabled={busy}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-400 py-3 font-display text-xs font-bold tracking-widest text-ink-950 uppercase shadow-lg shadow-teal-400/20 transition-all duration-200 hover:bg-teal-300 active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? <Icon name="logo" size={15} className="anim-spin-slow" /> : <Icon name="check" size={15} />}
          Сохранить
        </button>
      </div>
    </div>
  );
}
