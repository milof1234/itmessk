import { useCallback, useEffect, useState } from "react";
import type { ChatBackend, FirebaseConfig, Profile } from "./types";
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
          className={`anim-toast flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm shadow-xl shadow-black/40 backdrop-blur-md ${
            t.type === "error"
              ? "border-coral-500/40 bg-ink-800/95 text-coral-500"
              : "border-teal-400/40 bg-ink-800/95 text-teal-300"
          }`}
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
  toast,
  onDisconnect,
}: {
  backend: ChatBackend;
  profile: Profile;
  toast: (msg: string, type?: "info" | "error") => void;
  onDisconnect: () => void;
}) {
  const [pane, setPane] = useState<"rooms" | "chat">("rooms");

  useEffect(() => {
    if (backend.error) toast(backend.error, "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend.error]);

  return (
    <div className="relative z-10 flex h-full">
      <div className={`${pane === "rooms" ? "flex" : "hidden"} h-full w-full md:flex md:w-auto`}>
        <Sidebar
          backend={backend}
          profile={profile}
          onDisconnect={onDisconnect}
          onOpenChat={() => setPane("chat")}
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

function DemoMessenger(props: {
  profile: Profile;
  toast: (m: string, t?: "info" | "error") => void;
  onDisconnect: () => void;
}) {
  const backend = useDemoChat(props.profile);
  return <MessengerShell backend={backend} profile={props.profile} toast={props.toast} onDisconnect={props.onDisconnect} />;
}

function FirebaseMessenger(props: {
  profile: Profile;
  config: FirebaseConfig;
  toast: (m: string, t?: "info" | "error") => void;
  onDisconnect: () => void;
}) {
  const backend = useFirebaseChat(props.profile, props.config);
  return <MessengerShell backend={backend} profile={props.profile} toast={props.toast} onDisconnect={props.onDisconnect} />;
}

/* ---------------- корень ---------------- */
interface Session {
  profile: Profile | null;
  mode: "demo" | "firebase";
  config: FirebaseConfig | null;
  lastProfile?: Profile | null;
}

const SESSION_KEY = "efir_session_v2";

function loadSession(): Session {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Session;
      if (s && typeof s === "object")
        return {
          profile: s.profile ?? null,
          mode: s.mode === "demo" ? "demo" : "firebase",
          config: s.config ?? DEFAULT_CONFIG,
          lastProfile: s.lastProfile ?? null,
        };
    }
  } catch {
    /* повреждённая сессия — начнём заново */
  }
  return { profile: null, mode: "firebase", config: DEFAULT_CONFIG, lastProfile: null };
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

  const toast = useCallback((msg: string, type: "info" | "error" = "info") => {
    const id = Date.now() + Math.random();
    setToasts((cur) => [...cur.slice(-3), { id, msg, type }]);
    window.setTimeout(() => {
      setToasts((cur) => cur.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const enter = useCallback((profile: Profile, mode: "demo" | "firebase", config?: FirebaseConfig) => {
    setSession({ profile, mode, config: config ?? DEFAULT_CONFIG, lastProfile: profile });
    toast(mode === "demo" ? "Демо-эфир открыт. Добро пожаловать!" : "Подключаемся к вашему Firebase…", "info");
  }, [toast]);

  const disconnect = useCallback(() => {
    setSession((s) => ({ ...s, profile: null, lastProfile: s.profile }));
    toast("Вы вышли из эфира", "info");
  }, [toast]);

  return (
    <div className="relative h-full overflow-hidden bg-ink-950 text-ink-50">
      <Ambient />
      {session.profile ? (
        session.mode === "firebase" && session.config ? (
          <FirebaseMessenger
            key={session.profile.uid + session.config.projectId}
            profile={session.profile}
            config={session.config}
            toast={toast}
            onDisconnect={disconnect}
          />
        ) : (
          <DemoMessenger
            key={session.profile.uid}
            profile={session.profile}
            toast={toast}
            onDisconnect={disconnect}
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
