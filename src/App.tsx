import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatBackend, FirebaseConfig, Profile, ThemeName } from "./types";
import { useDemoChat } from "./lib/demoBackend";
import { useFirebaseChat } from "./lib/firebaseBackend";
import { Ambient } from "./components/Ambient";
import { Onboarding } from "./components/Onboarding";
import { Sidebar } from "./components/Sidebar";
import { ChatWindow } from "./components/ChatWindow";
import { Icon } from "./components/Icon";
import { DEFAULT_CONFIG } from "./lib/firebaseConfig";

/* ---------------- тосты ---------------- */
interface Toast {
  id: number;
  msg: string;
  type: "info" | "error";
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-72 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`anim-toast flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm shadow-xl backdrop-blur-md ${
            t.type === "error"
              ? "border-coral-500/40 bg-ink-800/95 text-coral-500"
              : "border-teal-400/40 bg-ink-800/95 text-teal-300"
          }`}
          style={{ boxShadow: "0 12px 40px var(--t-shadow)" }}
        >
          <Icon name={t.type === "error" ? "alert" : "check"} size={16} className="shrink-0" />
          <span className="text-ink-100">{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- оболочка мессенджера ---------------- */
function MessengerShell({
  backend,
  profile,
  theme,
  toast,
  onDisconnect,
  onTheme,
  onProfileSaved,
  onMeDoc,
}: {
  backend: ChatBackend;
  profile: Profile;
  theme: ThemeName;
  toast: (msg: string, type?: "info" | "error") => void;
  onDisconnect: () => void;
  onTheme: (t: ThemeName) => void;
  onProfileSaved: (patch: { name?: string; username?: string; hue?: number }) => void;
  onMeDoc: (p: Profile) => void;
}) {
  const [pane, setPane] = useState<"rooms" | "chat">("rooms");

  useEffect(() => {
    if (backend.error) toast(backend.error, "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend.error]);

  /* если аккаунт удалили (например, полный сброс номеров) — вежливо разлогиниваем */
  const meDocSeenRef = useRef(false);
  useEffect(() => {
    if (backend.mode !== "firebase") return;
    if (backend.meDoc) {
      meDocSeenRef.current = true;
      return;
    }
    if (meDocSeenRef.current && !backend.connecting) {
      meDocSeenRef.current = false;
      toast("Ваш аккаунт удалён полным сбросом — зарегистрируйтесь заново", "info");
      onDisconnect();
    }
  }, [backend.meDoc, backend.connecting, backend.mode, onDisconnect, toast]);

  /* живой документ аккаунта синхронизируем с сессией */
  useEffect(() => {
    if (!backend.meDoc) return;
    const d = backend.meDoc;
    onMeDoc({
      ...profile,
      name: d.name,
      username: d.username,
      hue: d.hue,
      role: d.role,
      verified: d.verified,
      mutedUntil: d.mutedUntil,
    });
    if (d.theme && d.theme !== theme) onTheme(d.theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend.meDoc]);

  return (
    <div className="relative z-10 flex h-full">
      <div className={`${pane === "rooms" ? "flex" : "hidden"} h-full w-full md:flex md:w-auto`}>
        <Sidebar
          backend={backend}
          profile={profile}
          theme={theme}
          onTheme={onTheme}
          toast={toast}
          onDisconnect={onDisconnect}
          onOpenChat={() => setPane("chat")}
          onProfileSaved={onProfileSaved}
        />
      </div>
      <div className={`${pane === "chat" ? "flex" : "hidden"} h-full min-w-0 flex-1 md:flex`}>
        <ChatWindow
          backend={backend}
          profile={profile}
          onBack={() => setPane("rooms")}
          toast={toast}
        />
      </div>
    </div>
  );
}

interface MessengerProps {
  profile: Profile;
  theme: ThemeName;
  toast: (m: string, t?: "info" | "error") => void;
  onDisconnect: () => void;
  onTheme: (t: ThemeName) => void;
  onProfileSaved: (patch: { name?: string; username?: string; hue?: number }) => void;
  onMeDoc: (p: Profile) => void;
}

function DemoMessenger(props: MessengerProps) {
  const backend = useDemoChat(props.profile);
  return <MessengerShell backend={backend} {...props} />;
}

function FirebaseMessenger(props: MessengerProps & { config: FirebaseConfig }) {
  const backend = useFirebaseChat(props.profile, props.config);
  return <MessengerShell backend={backend} {...props} />;
}

/* ---------------- корень ---------------- */
interface Session {
  profile: Profile | null;
  mode: "demo" | "firebase";
  config: FirebaseConfig | null;
  theme: ThemeName;
  lastProfile?: Profile | null;
}

const SESSION_KEY = "efir_session_v3";

function loadSession(): Session {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<Session>;
      if (s && typeof s === "object")
        return {
          profile: s.profile ?? null,
          mode: s.mode === "demo" ? "demo" : "firebase",
          config: s.config ?? DEFAULT_CONFIG,
          theme: s.theme === "light" || s.theme === "wave" ? s.theme : "dark",
          lastProfile: s.lastProfile ?? null,
        };
    }
  } catch {
    /* повреждённая сессия — начнём заново */
  }
  return { profile: null, mode: "firebase", config: DEFAULT_CONFIG, theme: "dark" };
}

export default function App() {
  const [session, setSession] = useState<Session>(loadSession);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      /* приватный режим — не критично */
    }
  }, [session]);

  /* применяем тему к документу */
  useEffect(() => {
    document.documentElement.dataset.theme = session.theme;
  }, [session.theme]);

  const toast = useCallback((msg: string, type: "info" | "error" = "info") => {
    const id = Date.now() + Math.random();
    setToasts((cur) => [...cur.slice(-3), { id, msg, type }]);
    window.setTimeout(() => {
      setToasts((cur) => cur.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const enter = useCallback(
    (profile: Profile, mode: "demo" | "firebase", config?: FirebaseConfig) => {
      setSession((s) => ({
        profile,
        mode,
        config: config ?? DEFAULT_CONFIG,
        theme: s.theme,
        lastProfile: profile,
      }));
      toast(mode === "demo" ? "Демо-эфир открыт. Добро пожаловать!" : "Подключаемся к вашему Firebase…", "info");
    },
    [toast]
  );

  const disconnect = useCallback(() => {
    setSession((s) => ({ ...s, profile: null, lastProfile: s.profile ?? s.lastProfile }));
    toast("Вы вышли из эфира", "info");
  }, [toast]);

  const setTheme = useCallback((theme: ThemeName) => {
    setSession((s) => ({ ...s, theme }));
  }, []);

  /* частичное обновление из настроек (ник, юзернейм, цвет) */
  const patchProfile = useCallback(
    (patch: { name?: string; username?: string; hue?: number }) => {
      setSession((s) => {
        if (!s.profile) return s;
        const profile = { ...s.profile, ...patch };
        return { ...s, profile, lastProfile: profile };
      });
    },
    []
  );

  /* полная синхронизация из живого документа Firestore (роли, муты, галочка) */
  const meDocSync = useCallback((profile: Profile) => {
    setSession((s) =>
      s.profile && s.profile.uid === profile.uid && JSON.stringify(s.profile) !== JSON.stringify(profile)
        ? { ...s, profile, lastProfile: profile }
        : s
    );
  }, []);

  return (
    <div className="relative h-full overflow-hidden text-ink-50" style={{ background: "var(--t-ink-950)" }}>
      <Ambient />
      {session.profile ? (
        session.mode === "firebase" && session.config ? (
          <FirebaseMessenger
            key={session.profile.uid + session.config.projectId}
            profile={session.profile}
            config={session.config}
            theme={session.theme}
            toast={toast}
            onDisconnect={disconnect}
            onTheme={setTheme}
            onProfileSaved={patchProfile}
            onMeDoc={meDocSync}
          />
        ) : (
          <DemoMessenger
            key={session.profile.uid}
            profile={session.profile}
            theme={session.theme}
            toast={toast}
            onDisconnect={disconnect}
            onTheme={setTheme}
            onProfileSaved={patchProfile}
            onMeDoc={meDocSync}
          />
        )
      ) : (
        <div className="scroll-slim relative z-10 h-full overflow-y-auto">
          <Onboarding
            onEnter={enter}
            savedName={session.lastProfile?.name ?? ""}
            savedConfig={session.config}
            initialMode={session.mode}
            toast={toast}
          />
        </div>
      )}
      <ToastStack toasts={toasts} />
    </div>
  );
}
