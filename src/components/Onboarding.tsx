import { useState } from "react";
import type { FirebaseConfig, Profile } from "../types";
import { HUE_SWATCHES, avatarGradient, hashHue, uid } from "../lib/media";
import { Icon } from "./Icon";
import { WaveBars } from "./Ambient";

interface Props {
  onEnter: (profile: Profile, mode: "demo" | "firebase", config?: FirebaseConfig) => void;
  savedName: string;
  savedConfig: FirebaseConfig | null;
  toast: (msg: string, type?: "info" | "error") => void;
}

const RULES = `// Firestore Database -> Правила
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}

// Storage -> Правила
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}`;

const FIELDS: Array<{ key: keyof FirebaseConfig; label: string; required: boolean; placeholder: string }> = [
  { key: "apiKey", label: "apiKey", required: true, placeholder: "AIzaSy…" },
  { key: "projectId", label: "projectId", required: true, placeholder: "my-efir-app" },
  { key: "storageBucket", label: "storageBucket", required: true, placeholder: "my-efir-app.appspot.com" },
  { key: "appId", label: "appId", required: true, placeholder: "1:123…:web:abc…" },
  { key: "authDomain", label: "authDomain", required: false, placeholder: "my-efir-app.firebaseapp.com" },
  { key: "messagingSenderId", label: "messagingSenderId", required: false, placeholder: "1234567890" },
];

const STEPS = [
  "console.firebase.google.com → «Создать проект» (любой регион, Analytics можно выключить).",
  "Build → Firestore Database → «Создать базу» → тестовый режим.",
  "Build → Storage → «Начать» → тестовый режим.",
  "Build → Authentication → «Начать» → вкладка Anonymous → включить.",
  "Настройки проекта → «Ваши приложения» → добавить Web-приложение и скопировать firebaseConfig.",
];

export function Onboarding({ onEnter, savedName, savedConfig, toast }: Props) {
  const [name, setName] = useState(savedName || `Гость ${Math.floor(1000 + Math.random() * 9000)}`);
  const [hue, setHue] = useState(() => hashHue(savedName || uid()));
  const [mode, setMode] = useState<"demo" | "firebase">(savedConfig ? "firebase" : "demo");
  const [cfg, setCfg] = useState<FirebaseConfig>(
    savedConfig ?? {
      apiKey: "",
      authDomain: "",
      projectId: "",
      storageBucket: "",
      messagingSenderId: "",
      appId: "",
    }
  );
  const [showSteps, setShowSteps] = useState(!savedConfig);
  const [err, setErr] = useState<string | null>(null);

  const enter = () => {
    const trimmed = name.trim().slice(0, 20) || "Гость эфира";
    const profile: Profile = { uid: "guest-" + uid(), name: trimmed, hue };
    if (mode === "demo") {
      onEnter(profile, "demo");
      return;
    }
    const missing = FIELDS.filter((f) => f.required && !cfg[f.key].trim()).map((f) => f.label);
    if (missing.length > 0) {
      setErr(`Заполните поля: ${missing.join(", ")}`);
      return;
    }
    setErr(null);
    onEnter(profile, "firebase", {
      apiKey: cfg.apiKey.trim(),
      authDomain: cfg.authDomain.trim() || `${cfg.projectId.trim()}.firebaseapp.com`,
      projectId: cfg.projectId.trim(),
      storageBucket: cfg.storageBucket.trim(),
      messagingSenderId: cfg.messagingSenderId.trim() || "0",
      appId: cfg.appId.trim(),
    });
  };

  return (
    <div className="relative z-10 mx-auto grid min-h-full w-full max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12 lg:py-12">
      {/* ---------- левая часть: манифест ---------- */}
      <div className="anim-rise flex flex-col gap-7">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl border border-teal-400/30 bg-teal-400/10 shadow-lg shadow-teal-400/10">
            <WaveBars size={30} />
          </span>
          <div>
            <h1 className="font-display text-4xl font-extrabold tracking-[0.06em] text-ink-50 sm:text-5xl">
              ЭФИР
            </h1>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-teal-300">
              волна твоего общения
            </p>
          </div>
        </div>

        <p className="max-w-lg text-lg leading-relaxed text-ink-100">
          Мессенджер, где сообщения летят в реальном времени:
          <span className="text-amber-300"> фото</span>,
          <span className="text-amber-300"> видео</span> и
          <span className="text-teal-300"> голосовые</span> — прямо с микрофона,
          через <span className="font-semibold text-ink-50">Firebase</span> на полностью бесплатном тарифе Spark.
        </p>

        <ul className="flex max-w-lg flex-col gap-3">
          {[
            { icon: "mic" as const, color: "#ff5d5d", text: "Голосовые с живой волной — зажал, сказал, отправил" },
            { icon: "photo" as const, color: "#2fd6b5", text: "Фото сжимаются на лету и улетают в Storage" },
            { icon: "video" as const, color: "#ffb454", text: "Видео до 80 МБ с прогрессом загрузки" },
            { icon: "bolt" as const, color: "#5ab8ff", text: "Firestore + Storage + анонимный вход — 0 ₽ навсегда" },
          ].map((f, i) => (
            <li
              key={i}
              className="anim-rise flex items-center gap-3 rounded-xl border border-ink-600/60 bg-ink-800/60 px-4 py-3 transition-transform duration-200 hover:translate-x-1"
              style={{ animationDelay: `${0.1 + i * 0.08}s` }}
            >
              <span className="shrink-0" style={{ color: f.color }}>
                <Icon name={f.icon} size={20} />
              </span>
              <span className="text-sm text-ink-100">{f.text}</span>
            </li>
          ))}
        </ul>

        <p className="max-w-lg text-xs leading-relaxed text-ink-400">
          Нет проекта Firebase под рукой? Включайте демо-режим — бот-смотритель ответит текстом
          и даже пришлёт синтезированное голосовое, а всё приложение останется полностью рабочим.
        </p>
      </div>

      {/* ---------- правая часть: подключение ---------- */}
      <div className="anim-rise rounded-2xl border border-ink-600 bg-ink-850/85 p-5 shadow-2xl shadow-black/40 backdrop-blur-md sm:p-7" style={{ animationDelay: "0.15s" }}>
        <h2 className="font-display text-base font-semibold tracking-wide text-ink-50">
          Подключение к станции
        </h2>
        <p className="mt-1 text-xs text-ink-300">Представьтесь и выберите режим вещания.</p>

        {/* имя */}
        <label className="mt-5 block">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">Позывной</span>
          <input
            value={name}
            maxLength={20}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && enter()}
            placeholder="Как вас слышать?"
            className="mt-1.5 w-full rounded-xl border border-ink-500 bg-ink-750 px-4 py-2.5 text-[15px] text-ink-50 outline-none transition-colors placeholder:text-ink-400 focus:border-teal-400/70"
          />
        </label>

        {/* цвет */}
        <div className="mt-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">Цвет в эфире</span>
          <div className="mt-2 flex items-center gap-2.5">
            {HUE_SWATCHES.map((h) => (
              <button
                key={h}
                onClick={() => setHue(h)}
                className={`h-8 w-8 rounded-full transition-all duration-150 hover:scale-110 ${
                  hue === h ? "scale-110 ring-2 ring-ink-50 ring-offset-2 ring-offset-ink-850" : ""
                }`}
                style={{ background: avatarGradient(h) }}
                aria-label={`Цвет ${h}`}
              />
            ))}
            <span
              className="ml-2 grid h-9 w-9 place-items-center rounded-full text-xs font-bold text-white"
              style={{ background: avatarGradient(hue) }}
            >
              {(name.trim() || "?").slice(0, 1).toUpperCase()}
            </span>
          </div>
        </div>

        {/* режим */}
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-ink-500 bg-ink-750 p-1">
          {(
            [
              { id: "demo", label: "Демо-режим", icon: "shield" as const },
              { id: "firebase", label: "Свой Firebase", icon: "flame" as const },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all duration-200 ${
                mode === m.id
                  ? m.id === "demo"
                    ? "bg-teal-400 text-ink-950 shadow-md shadow-teal-400/25"
                    : "bg-amber-400 text-amber-950 shadow-md shadow-amber-400/25"
                  : "text-ink-300 hover:text-ink-100"
              }`}
            >
              <Icon name={m.icon} size={15} />
              {m.label}
            </button>
          ))}
        </div>

        {mode === "demo" ? (
          <p className="mt-3 rounded-xl border border-teal-400/25 bg-teal-400/8 px-4 py-3 text-xs leading-relaxed text-teal-300">
            Всё работает локально: каналы, сообщения, запись с микрофона. Бот-смотритель отвечает
            и присылает голосовые — удобно всё потрогать до подключения Firebase.
          </p>
        ) : (
          <div className="mt-4">
            <button
              onClick={() => setShowSteps((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl border border-ink-500 bg-ink-750 px-4 py-2.5 text-left text-sm font-semibold text-ink-100 transition-colors hover:border-amber-400/50"
            >
              <span className="flex items-center gap-2">
                <Icon name="bolt" size={15} className="text-amber-400" />
                Как поднять проект за 3 минуты
              </span>
              <span className={`transition-transform duration-200 ${showSteps ? "rotate-180" : ""}`}>
                <Icon name="back" size={14} className="-rotate-90" />
              </span>
            </button>

            {showSteps && (
              <div className="anim-msg-in mt-2 space-y-2 rounded-xl border border-ink-600 bg-ink-800/70 p-4">
                <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-ink-200">
                  {STEPS.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
                <div className="relative">
                  <pre className="scroll-slim overflow-x-auto rounded-lg bg-ink-950 p-3 font-mono text-[10.5px] leading-relaxed text-teal-300">
                    {RULES}
                  </pre>
                  <button
                    onClick={() => {
                      void navigator.clipboard.writeText(RULES).then(
                        () => toast("Правила скопированы", "info"),
                        () => toast("Не удалось скопировать", "error")
                      );
                    }}
                    className="absolute top-2 right-2 grid h-7 w-7 place-items-center rounded-md border border-ink-500 bg-ink-800 text-ink-300 transition-colors hover:text-teal-300"
                    title="Скопировать правила"
                  >
                    <Icon name="copy" size={13} />
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-ink-400">
                  Тестовые правила удобны для старта, но открыты всем. Для продакшена ограничьте
                  доступ по <span className="font-mono text-ink-200">request.auth != null</span>.
                </p>
              </div>
            )}

            <div className="mt-3 grid gap-2.5">
              {FIELDS.map((f) => (
                <label key={f.key} className="block">
                  <span className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-ink-400">
                    {f.label}
                    {f.required && <span className="text-amber-400">обязательно</span>}
                  </span>
                  <input
                    value={cfg[f.key]}
                    onChange={(e) => setCfg((c) => ({ ...c, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="mt-1 w-full rounded-lg border border-ink-500 bg-ink-750 px-3 py-2 font-mono text-xs text-ink-50 outline-none transition-colors placeholder:text-ink-500 focus:border-amber-400/70"
                  />
                </label>
              ))}
            </div>
            {err && (
              <p className="anim-msg-in mt-2 flex items-center gap-1.5 text-xs text-coral-500">
                <Icon name="alert" size={13} /> {err}
              </p>
            )}
          </div>
        )}

        <button
          onClick={enter}
          className="group mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl bg-amber-400 py-3.5 font-display text-sm font-bold tracking-widest text-amber-950 uppercase shadow-lg shadow-amber-400/25 transition-all duration-200 hover:bg-amber-300 hover:shadow-amber-400/40 active:scale-[0.98]"
        >
          Выйти в эфир
          <span className="transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-0.5">
            <Icon name="send" size={17} strokeWidth={2.2} />
          </span>
        </button>
      </div>
    </div>
  );
}
