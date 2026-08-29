import { useState } from "react";
import type { ChatBackend, Profile } from "../types";
import { avatarGradient, formatClock } from "../lib/media";
import { Icon } from "./Icon";
import { WaveBars } from "./Ambient";

interface Props {
  backend: ChatBackend;
  profile: Profile;
  onDisconnect: () => void;
  onOpenChat?: () => void;
}

export function Sidebar({ backend, profile, onDisconnect, onOpenChat }: Props) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const { rooms, activeRoomId, mode, connecting } = backend;

  const submitCreate = async () => {
    const n = name.trim().slice(0, 24);
    if (!n) return;
    setName("");
    setCreating(false);
    const id = await backend.createRoom(n);
    if (id) onOpenChat?.();
  };

  return (
    <aside className="flex h-full w-full flex-col border-r border-ink-600/60 bg-ink-900/80 backdrop-blur-md md:w-[300px] md:shrink-0">
      {/* логотип */}
      <div className="flex items-center gap-3 border-b border-ink-600/60 px-4 py-3.5">
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-teal-400/30 bg-teal-400/10">
          <WaveBars size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold tracking-[0.08em] text-ink-50">ЭФИР</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-400">
            мессенджер на firebase
          </p>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wider ${
            mode === "demo"
              ? "border-teal-400/40 bg-teal-400/10 text-teal-300"
              : "border-amber-400/40 bg-amber-400/10 text-amber-300"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${mode === "demo" ? "bg-teal-400" : "bg-amber-400"}`} />
          {mode === "demo" ? "демо" : "spark"}
        </span>
      </div>

      {/* профиль */}
      <div className="flex items-center gap-3 border-b border-ink-600/60 px-4 py-3">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white shadow-md"
          style={{ background: avatarGradient(profile.hue) }}
        >
          {profile.name.trim().slice(0, 1).toUpperCase() || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-50">{profile.name}</p>
          <p className="flex items-center gap-1.5 text-[11px] text-teal-300">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400" /> в эфире
          </p>
        </div>
        <button
          onClick={onDisconnect}
          className="grid h-9 w-9 place-items-center rounded-lg border border-ink-500 text-ink-300 transition-colors hover:border-coral-500/60 hover:text-coral-500"
          title="Выйти из эфира"
          aria-label="Выйти"
        >
          <Icon name="logout" size={17} />
        </button>
      </div>

      {/* каналы */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">Каналы</p>
        <button
          onClick={() => setCreating((v) => !v)}
          className={`grid h-7 w-7 place-items-center rounded-lg border transition-all duration-200 ${
            creating
              ? "rotate-45 border-teal-400 bg-teal-400/15 text-teal-300"
              : "border-ink-500 text-ink-300 hover:border-teal-400/60 hover:text-teal-300"
          }`}
          aria-label="Создать канал"
          title="Новый канал"
        >
          <Icon name="plus" size={15} />
        </button>
      </div>

      {creating && (
        <div className="anim-msg-in mx-4 mb-2 flex gap-2">
          <input
            autoFocus
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submitCreate();
              if (e.key === "Escape") setCreating(false);
            }}
            placeholder="Название канала…"
            className="min-w-0 flex-1 rounded-lg border border-teal-400/40 bg-ink-750 px-3 py-1.5 text-sm text-ink-50 outline-none placeholder:text-ink-400"
          />
          <button
            onClick={() => void submitCreate()}
            disabled={!name.trim()}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal-400 text-ink-950 transition-transform hover:scale-105 active:scale-90 disabled:opacity-40"
            aria-label="Создать"
          >
            <Icon name="check" size={15} />
          </button>
        </div>
      )}

      <nav className="scroll-slim flex-1 overflow-y-auto px-2 pb-3">
        {connecting && (
          <div className="space-y-2 px-2 pt-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-ink-750" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        )}
        {!connecting && rooms.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-ink-400">Каналов пока нет — создайте первый.</p>
        )}
        {!connecting &&
          rooms.map((r) => {
            const active = r.id === activeRoomId;
            return (
              <button
                key={r.id}
                onClick={() => {
                  backend.selectRoom(r.id);
                  onOpenChat?.();
                }}
                className={`group relative mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 ${
                  active ? "bg-ink-700" : "hover:bg-ink-800 hover:translate-x-0.5"
                }`}
              >
                {active && (
                  <span className="absolute top-1/2 left-0 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-teal-400" />
                )}
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/95 shadow-sm transition-transform duration-150 group-hover:scale-105"
                  style={{ background: avatarGradient(r.hue) }}
                >
                  <Icon name="radio" size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={`truncate text-sm font-semibold ${active ? "text-teal-300" : "text-ink-100"}`}>
                      {r.name}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-ink-400">
                      {formatClock(r.lastActivity)}
                    </span>
                  </span>
                  <span className="block truncate text-xs text-ink-300">
                    {r.lastPreview ?? "канал в сети"}
                  </span>
                </span>
              </button>
            );
          })}
      </nav>

      {/* футер */}
      <div className="border-t border-ink-600/60 px-4 py-3">
        {mode === "firebase" ? (
          <p className="flex items-center gap-2 text-[11px] text-ink-300">
            <Icon name="bolt" size={13} className="text-amber-400" />
            Spark: Firestore + Storage + Auth · 0 ₽
          </p>
        ) : (
          <p className="flex items-center gap-2 text-[11px] text-ink-300">
            <Icon name="shield" size={13} className="text-teal-400" />
            Демо-режим: всё хранится локально
          </p>
        )}
      </div>
    </aside>
  );
}
