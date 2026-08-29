import { useState } from "react";
import { deleteApp, initializeApp } from "firebase/app";
import type { FirebaseConfig, Profile } from "../types";
import { HUE_SWATCHES, avatarGradient, hashHue, uid } from "../lib/media";
import { DEFAULT_CONFIG, CREATOR_PHONE } from "../lib/firebaseConfig";
import {
  formatPhoneInput,
  isValidPhone,
  loginUser,
  normalizePhone,
  registerUser,
  USERNAME_RE,
} from "../lib/auth";
import { Icon } from "./Icon";
import { WaveBars } from "./Ambient";
import { CrownIcon } from "./Badges";

interface Props {
  onEnter: (profile: Profile, mode: "demo" | "firebase", config?: FirebaseConfig) => void;
  savedName: string;
  savedConfig: FirebaseConfig | null;
  initialMode: "demo" | "firebase";
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

const STEPS = [
  "console.firebase.google.com → ваш проект (pulsik-d2ff9 уже подключён).",
  "Build → Firestore Database → база создана, тестовый режим.",
  "Build → Storage → «Начать» → тестовый режим.",
  "Регистрация по номеру идёт через коллекцию users — СМС не нужен.",
  "Один номер = один аккаунт. Юзернеймы уникальны, ники могут совпадать.",
];

export function Onboarding({ onEnter, savedName, savedConfig, initialMode, toast }: Props) {
  const [name, setName] = useState(savedName || `Абонент ${Math.floor(100 + Math.random() * 900)}`);
  const [username, setUsername] = useState("");
  const [hue, setHue] = useState(() => hashHue(savedName || uid()));
  const [mode, setMode] = useState<"demo" | "firebase">(initialMode);
  const [cfg, setCfg] = useState<FirebaseConfig>(savedConfig ?? DEFAULT_CONFIG);
  const [showSteps, setShowSteps] = useState(false);

  const [authTab, setAuthTab] = useState<"login" | "register">("register");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [authErr, setAuthErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isCreatorPhone = normalizePhone(phone) === CREATOR_PHONE;

  const enterDemo = () => {
    const trimmed = name.trim().slice(0, 20) || "Гость эфира";
    onEnter({ uid: "guest-" + uid(), name: trimmed, hue }, "demo");
  };

  const enterFirebase = async () => {
    const digits = normalizePhone(phone);
    if (!isValidPhone(digits)) {
      setAuthErr("Введите номер полностью, например +7 925 469-98-01");
      return;
    }
    if (password.length < 4) {
      setAuthErr("Пароль — минимум 4 символа");
      return;
    }
    if (authTab === "register") {
      const uname = username.trim().toLowerCase();
      if (!USERNAME_RE.test(uname)) {
        setAuthErr("Юзернейм: 3–16 символов, латиница, цифры, «_» и «.»");
        return;
      }
    }
    setAuthErr(null);
    setBusy(true);
    const tempApp = initializeApp(cfg, "efir-auth-" + Date.now());
    try {
      const nameTrim = name.trim().slice(0, 20) || "Абонент";
      let doc;
      if (authTab === "register") {
        doc = await registerUser(tempApp, digits, nameTrim, username.trim(), hue, password, CREATOR_PHONE);
        toast(
          doc.role === "creator"
            ? "Аккаунт креатора создан — корона и админка ваши"
            : "Аккаунт создан — добро пожаловать",
          "info"
        );
      } else {
        doc = await loginUser(tempApp, digits, password, CREATOR_PHONE, nameTrim, hue);
        toast(`С возвращением, ${doc.name}!`, "info");
      }
      onEnter(
        {
          uid: "u" + digits,
          phone: digits,
          name: doc.name,
          username: doc.username,
          hue: doc.hue,
          role: doc.role,
          verified: doc.verified,
          mutedUntil: doc.mutedUntil,
        },
        "firebase",
        cfg
      );
    } catch (e) {
      setAuthErr(e instanceof Error ? e.message : "Не удалось связаться с Firebase");
    } finally {
      await deleteApp(tempApp).catch(() => {});
      setBusy(false);
    }
  };

  const inputCls =
    "mt-1.5 w-full rounded-xl border border-ink-500 bg-ink-750 px-4 py-2.5 text-[15px] text-ink-50 outline-none transition-colors placeholder:text-ink-400 focus:border-teal-400/70";

  return (
    <div className="relative z-10 mx-auto grid min-h-full w-full max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12 lg:py-12">
      {/* ---------- манифест ---------- */}
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
          Мессенджер на <span className="font-semibold text-ink-50">Firebase</span> (тариф Spark, 0 ₽):
          <span className="text-amber-300"> фото</span>,
          <span className="text-amber-300"> видео</span>,
          <span className="text-teal-300"> голосовые</span>, группы и каналы —
          регистрация по номеру телефона без СМС.
        </p>

        <ul className="flex max-w-lg flex-col gap-3">
          {[
            { icon: "mic" as const, color: "#ff5d5d", text: "Голосовые с живой волной — зажал, сказал, отправил" },
            { icon: "users" as const, color: "#2fd6b5", text: "Группы для своих и открытые каналы для всех" },
            { icon: "shield" as const, color: "#5ab8ff", text: "1 номер = 1 аккаунт, пароль хранится как SHA-256 хеш" },
            { icon: "flame" as const, color: "#ffb454", text: "Корона креатора, молоток админа, галочка верификации" },
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

        <p className="flex max-w-lg items-center gap-2 text-xs leading-relaxed text-ink-400">
          <span className="crown-badge inline-flex shrink-0 text-amber-400">
            <CrownIcon size={16} />
          </span>
          Номер <span className="font-mono text-ink-200">+7 925 469-98-01</span> получает корону
          креатора и панель управления: админка, муты, галочки, сброс номеров.
        </p>
      </div>

      {/* ---------- подключение ---------- */}
      <div
        className="anim-rise rounded-2xl border border-ink-600 bg-ink-850/85 p-5 shadow-2xl backdrop-blur-md sm:p-7"
        style={{ animationDelay: "0.15s", boxShadow: "0 30px 80px var(--t-shadow)" }}
      >
        <h2 className="font-display text-base font-semibold tracking-wide text-ink-50">
          Подключение к станции
        </h2>
        <p className="mt-1 text-xs text-ink-300">Представьтесь, войдите по номеру и выберите режим.</p>

        {/* режим */}
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-ink-500 bg-ink-750 p-1">
          {(
            [
              { id: "firebase", label: "Firebase", icon: "flame" as const },
              { id: "demo", label: "Демо-режим", icon: "shield" as const },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all duration-200 ${
                mode === m.id
                  ? m.id === "firebase"
                    ? "bg-amber-400 text-amber-950 shadow-md shadow-amber-400/25"
                    : "bg-teal-400 text-ink-950 shadow-md shadow-teal-400/25"
                  : "text-ink-300 hover:text-ink-100"
              }`}
            >
              <Icon name={m.icon} size={15} />
              {m.label}
            </button>
          ))}
        </div>

        {mode === "demo" ? (
          <>
            <label className="mt-4 block">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">Позывной</span>
              <input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} placeholder="Как вас слышать?" className={inputCls} />
            </label>
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
              </div>
            </div>
            <p className="mt-4 rounded-xl border border-teal-400/25 bg-teal-400/8 px-4 py-3 text-xs leading-relaxed text-teal-300">
              Всё работает локально: каналы, группы, запись с микрофона. Бот-смотритель отвечает
              и присылает голосовые — без аккаунта и без Firebase.
            </p>
            <button
              onClick={enterDemo}
              className="group mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl bg-teal-400 py-3.5 font-display text-sm font-bold tracking-widest text-ink-950 uppercase shadow-lg shadow-teal-400/25 transition-all duration-200 hover:bg-teal-300 hover:shadow-teal-400/40 active:scale-[0.98]"
            >
              В демо-эфир
              <span className="transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-0.5">
                <Icon name="send" size={17} strokeWidth={2.2} />
              </span>
            </button>
          </>
        ) : (
          <>
            {/* вход / регистрация */}
            <div className="mt-4">
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-ink-500 bg-ink-750 p-1">
                {(
                  [
                    { id: "register", label: "Регистрация" },
                    { id: "login", label: "Вход" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setAuthTab(t.id);
                      setAuthErr(null);
                    }}
                    className={`rounded-lg py-2 text-sm font-semibold transition-all duration-200 ${
                      authTab === t.id ? "bg-ink-600 text-ink-50 shadow-inner" : "text-ink-300 hover:text-ink-100"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {authTab === "register" && (
                <div className="anim-msg-in mt-3 grid gap-3">
                  <label className="block">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
                      Ник <span className="normal-case tracking-normal text-ink-500">(может повторяться)</span>
                    </span>
                    <input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} placeholder="Императив" className={inputCls} />
                  </label>
                  <label className="block">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
                      Юзернейм <span className="text-amber-400">(уникальный)</span>
                    </span>
                    <div className="relative">
                      <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-mono text-sm text-ink-400">@</span>
                      <input
                        value={username}
                        maxLength={16}
                        onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, "").toLowerCase())}
                        placeholder="imperativ"
                        className={`${inputCls} pl-8 font-mono`}
                      />
                    </div>
                  </label>
                </div>
              )}

              <label className="mt-3 block">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">Номер телефона</span>
                <div className="relative">
                  <input
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneInput(normalizePhone(e.target.value)))}
                    placeholder="+7 925 469-98-01"
                    inputMode="tel"
                    autoComplete="tel"
                    className={`${inputCls} pr-10 font-mono`}
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-400">
                    <Icon name="radio" size={16} />
                  </span>
                </div>
                {isCreatorPhone && (
                  <span className="anim-msg-in mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-amber-400">
                    <CrownIcon size={12} /> Номер креатора — получите корону и панель управления
                  </span>
                )}
              </label>

              <label className="mt-3 block">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
                  Пароль {authTab === "register" && <span className="normal-case tracking-normal">(придумайте, без СМС)</span>}
                </span>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void enterFirebase()}
                    placeholder={authTab === "register" ? "Минимум 4 символа" : "Ваш пароль"}
                    autoComplete={authTab === "register" ? "new-password" : "current-password"}
                    className={`${inputCls} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-ink-400 transition-colors hover:text-teal-300"
                    aria-label={showPass ? "Скрыть пароль" : "Показать пароль"}
                  >
                    <Icon name={showPass ? "eye-off" : "eye"} size={16} />
                  </button>
                </div>
              </label>

              {authErr && (
                <p className="anim-msg-in mt-2 flex items-center gap-1.5 text-xs font-medium text-coral-500">
                  <Icon name="alert" size={13} /> {authErr}
                </p>
              )}

              <button
                onClick={() => void enterFirebase()}
                disabled={busy}
                className="group mt-4 flex w-full items-center justify-center gap-2.5 rounded-xl bg-amber-400 py-3.5 font-display text-sm font-bold tracking-widest text-amber-950 uppercase shadow-lg shadow-amber-400/25 transition-all duration-200 hover:bg-amber-300 hover:shadow-amber-400/40 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
              >
                {busy ? (
                  <>
                    <Icon name="logo" size={18} className="anim-spin-slow" />
                    Настраиваем волну…
                  </>
                ) : (
                  <>
                    {authTab === "register" ? "Создать аккаунт и выйти в эфир" : "Войти в эфир"}
                    <span className="transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-0.5">
                      <Icon name="send" size={17} strokeWidth={2.2} />
                    </span>
                  </>
                )}
              </button>

              <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-400">
                <Icon name="shield" size={13} className="mt-0.5 shrink-0 text-teal-300" />
                Без СМС: аккаунт — это номер + SHA-256 хеш пароля в коллекции users. Ник и юзернейм
                можно поменять в настройках.
              </p>
            </div>

            {/* конфиг + инструкция */}
            <button
              onClick={() => setShowSteps((v) => !v)}
              className="mt-4 flex w-full items-center justify-between rounded-xl border border-ink-500 bg-ink-750 px-4 py-2.5 text-left text-sm font-semibold text-ink-100 transition-colors hover:border-amber-400/50"
            >
              <span className="flex items-center gap-2">
                <Icon name="bolt" size={15} className="text-amber-400" />
                Конфиг проекта и правила
              </span>
              <span className={`transition-transform duration-200 ${showSteps ? "rotate-180" : ""}`}>
                <Icon name="back" size={14} className="-rotate-90" />
              </span>
            </button>

            {showSteps && (
              <div className="anim-msg-in mt-2 space-y-2.5 rounded-xl border border-ink-600 bg-ink-800/70 p-4">
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
                <div className="grid gap-2">
                  {(Object.keys(cfg) as Array<keyof FirebaseConfig>).map((k) => (
                    <label key={k} className="block">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-ink-400">{k}</span>
                      <input
                        value={cfg[k]}
                        onChange={(e) => setCfg((c) => ({ ...c, [k]: e.target.value }))}
                        className="mt-0.5 w-full rounded-lg border border-ink-500 bg-ink-750 px-3 py-1.5 font-mono text-[11px] text-ink-50 outline-none transition-colors focus:border-amber-400/70"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
