import { useEffect, useRef, useState } from "react";
import type { ChatBackend, Profile, UserDoc } from "../types";
import { Icon } from "./Icon";
import { UserCard } from "./UserCard";

interface Props {
  backend: ChatBackend;
  me: Profile;
  onClose: () => void;
  toast: (msg: string, type?: "info" | "error") => void;
}

/** Поиск людей по номеру телефона / юзернейму */
export function SearchPanel({ backend, me, onClose, toast }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserDoc[] | null>(null);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const s = q.trim();
    if (!s) {
      setResults(null);
      return;
    }
    setBusy(true);
    timerRef.current = window.setTimeout(() => {
      void backend
        .searchUsers(s)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setBusy(false));
    }, 280);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [q, backend]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="anim-modal flex max-h-[88vh] w-full max-w-lg flex-col rounded-b-2xl border border-ink-600 bg-ink-850 sm:rounded-2xl"
        style={{ boxShadow: "0 30px 90px var(--t-shadow)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink-600 px-5 py-4">
          <div>
            <h3 className="font-display text-sm font-bold tracking-widest text-ink-50 uppercase">
              Поиск в эфире
            </h3>
            <p className="font-mono text-[10px] text-ink-400">по номеру, @юзернейму или нику</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-ink-500 text-ink-300 transition-colors hover:text-coral-500"
            aria-label="Закрыть"
          >
            <Icon name="close" size={15} />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-400">
              <Icon name="search" size={16} />
            </span>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="+7 925… или @username"
              className="w-full rounded-xl border border-ink-500 bg-ink-750 py-2.5 pr-4 pl-11 font-mono text-sm text-ink-50 outline-none transition-colors placeholder:text-ink-400 focus:border-teal-400/70"
            />
            {busy && (
              <span className="absolute top-1/2 right-3 -translate-y-1/2 text-teal-300">
                <Icon name="logo" size={15} className="anim-spin-slow" />
              </span>
            )}
          </div>
        </div>

        <div className="scroll-slim mt-3 flex-1 space-y-2 overflow-y-auto px-5 pb-5">
          {results === null && (
            <p className="py-8 text-center text-sm text-ink-400">
              Начните вводить номер или юзернейм
            </p>
          )}
          {results !== null && results.length === 0 && !busy && (
            <p className="anim-msg-in py-8 text-center text-sm text-ink-400">
              Никого не нашли — проверьте номер
            </p>
          )}
          {results?.map((u) => (
            <UserCard key={u.phone} user={u} me={me} backend={backend} toast={toast} />
          ))}
        </div>
      </div>
    </div>
  );
}
