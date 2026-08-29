import { useState } from "react";
import type { ChatBackend, Profile, ThemeName } from "../types";
import { avatarGradient } from "../lib/media";
import { Icon } from "./Icon";
import { WaveBars } from "./Ambient";
import { RoleBadges, CrownIcon, roleLabel } from "./Badges";
import { SettingsModal } from "./SettingsModal";
import { CreatorPanel } from "./CreatorPanel";
import { SearchPanel } from "./SearchPanel";
import { GroupModal } from "./GroupModal";

interface Props {
  backend: ChatBackend;
  profile: Profile;
  theme: ThemeName;
  onTheme: (t: ThemeName) => void;
  onProfileSaved: (patch: { name?: string; username?: string; hue?: number }) => void;
  onDisconnect: () => void;
  onOpenChat: () => void;
  toast: (msg: string, type?: "info" | "error") => void;
}

export function Sidebar({
  backend,
  profile,
  theme,
  onTheme,
  onProfileSaved,
  onDisconnect,
  onOpenChat,
  toast,
}: Props) {
  const [modal, setModal] = useState<"settings" | "creator" | "search" | "group" | null>(null);
  const [newChannel, setNewChannel] = useState("");
  const [creating, setCreating] = useState(false);

  const myPhone = profile.phone ?? "";
  const visibleRooms = backend.rooms.filter(
    (r) => (r.type ?? "channel") !== "group" || (r.members ?? []).includes(myPhone)
  );
  const channels = visibleRooms.filter((r) => (r.type ?? "channel") !== "group");
  const groups = visibleRooms.filter((r) => r.type === "group");

  const createChannel = async () => {
    const name = newChannel.trim();
    if (!name) return;
    setCreating(true);
    await backend.createRoom(name);
    setCreating(false);
    setNewChannel("");
    toast(`Канал «${name}» в эфире`, "info");
  };

  const muted = profile.mutedUntil != null && profile.mutedUntil > Date.now();

  const iconBtn =
    "grid h-9 w-9 place-items-center rounded-xl border border-ink-600 bg-ink-800/70 text-ink-300 transition-all duration-150 hover:scale-105 hover:border-ink-500 hover:text-teal-300 active:scale-95";

  return (
    <aside className="flex h-full w-full flex-col border-r border-ink-700 bg-ink-900/85 backdrop-blur-md md:w-[330px] md:shrink-0">
      {/* шапка */}
      <div className="flex items-center gap-3 border-b border-ink-700 px-4 py-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-teal-400/30 bg-teal-400/10 text-teal-300">
          <WaveBars size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-bold tracking-[0.12em] text-ink-50">ЭФИР</p>
          <p className="font-mono text-[10px] tracking-wider text-ink-400 uppercase">
            {backend.mode === "firebase" ? "Firebase · Spark · live" : "демо-станция"}
          </p>
        </div>
        <button onClick={() => setModal("search")} className={iconBtn} title="Поиск людей по номеру">
          <Icon name="search" size={16} />
        </button>
        {profile.role === "creator" && (
          <button
            onClick={() => setModal("creator")}
            className="grid h-9 w-9 place-items-center rounded-xl border border-amber-400/50 bg-amber-400/10 text-amber-400 transition-all duration-150 hover:scale-105 hover:bg-amber-400/20 active:scale-95"
            title="Панель креатора"
          >
            <CrownIcon size={16} />
          </button>
        )}
      </div>

      {/* список комнат */}
      <div className="scroll-slim flex-1 overflow-y-auto px-3 py-3">
        <div className="mb-1.5 flex items-center justify-between px-1.5">
          <span className="font-mono text-[10px] font-semibold tracking-[0.22em] text-ink-400 uppercase">
            Каналы
          </span>
          <span className="font-mono text-[10px] text-ink-500">{channels.length}</span>
        </div>

        {channels.map((r) => {
          const active = r.id === backend.activeRoomId;
          return (
            <button
              key={r.id}
              onClick={() => {
                backend.selectRoom(r.id);
                onOpenChat();
              }}
              className={`group mb-1 flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-150 ${
                active
                  ? "border-teal-400/50 bg-teal-400/10"
                  : "border-transparent hover:translate-x-0.5 hover:border-ink-600 hover:bg-ink-800"
              }`}
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg font-display text-sm font-bold text-white shadow-md"
                style={{ background: avatarGradient(r.hue) }}
              >
                {r.name.trim().slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className={`truncate text-sm font-semibold ${active ? "text-teal-300" : "text-ink-100"}`}>
                    # {r.name}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-ink-500">
                    {new Date(r.lastActivity).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </span>
                <span className="block truncate text-xs text-ink-400">
                  {r.lastPreview ?? "тишина в эфире"}
                </span>
              </span>
            </button>
          );
        })}

        {/* новый канал */}
        <div className="mb-4 mt-2 flex gap-1.5 px-0.5">
          <input
            value={newChannel}
            onChange={(e) => setNewChannel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void createChannel()}
            placeholder="новый канал…"
            maxLength={24}
            className="min-w-0 flex-1 rounded-lg border border-ink-600 bg-ink-800 px-3 py-1.5 text-xs text-ink-50 outline-none transition-colors placeholder:text-ink-500 focus:border-teal-400/60"
          />
          <button
            onClick={() => void createChannel()}
            disabled={creating || !newChannel.trim()}
            className="grid h-8 w-9 shrink-0 place-items-center rounded-lg border border-teal-400/40 bg-teal-400/10 text-teal-300 transition-all duration-150 hover:bg-teal-400/20 active:scale-95 disabled:opacity-40"
            title="Создать канал"
          >
            <Icon name="plus" size={14} />
          </button>
        </div>

        {/* группы */}
        <div className="mb-1.5 flex items-center justify-between px-1.5">
          <span className="font-mono text-[10px] font-semibold tracking-[0.22em] text-ink-400 uppercase">
            Группы
          </span>
          <button
            onClick={() => setModal("group")}
            className="flex items-center gap-1 rounded-lg border border-ink-600 bg-ink-800/70 px-2 py-1 font-mono text-[10px] text-ink-300 transition-all duration-150 hover:border-amber-400/50 hover:text-amber-300 active:scale-95"
            title="Создать группу"
          >
            <Icon name="plus" size={11} /> создать
          </button>
        </div>

        {groups.length === 0 && (
          <p className="px-2 pb-2 text-xs text-ink-500">
            Пока нет групп — соберите свою по номерам и юзернеймам.
          </p>
        )}

        {groups.map((r) => {
          const active = r.id === backend.activeRoomId;
          return (
            <button
              key={r.id}
              onClick={() => {
                backend.selectRoom(r.id);
                onOpenChat();
              }}
              className={`group mb-1 flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-150 ${
                active
                  ? "border-amber-400/50 bg-amber-400/10"
                  : "border-transparent hover:translate-x-0.5 hover:border-ink-600 hover:bg-ink-800"
              }`}
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-100 shadow-md"
                style={{ background: avatarGradient(r.hue) }}
              >
                <Icon name="users" size={16} className="text-white" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className={`truncate text-sm font-semibold ${active ? "text-amber-300" : "text-ink-100"}`}>
                    {r.name}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-ink-500">
                    {r.members?.length ?? 0} уч.
                  </span>
                </span>
                <span className="block truncate text-xs text-ink-400">
                  {r.lastPreview ?? "группа создана"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* в эфире */}
      <div className="border-t border-ink-700 px-4 pt-3 pb-2">
        <p className="mb-2 font-mono text-[10px] font-semibold tracking-[0.22em] text-ink-400 uppercase">
          В эфире · {backend.presence.length}
        </p>
        <div className="scroll-slim flex max-h-24 gap-2 overflow-x-auto pb-1">
          {backend.presence.map((p) => (
            <div key={p.uid} className="flex shrink-0 flex-col items-center gap-1" title={p.name}>
              <div className="relative">
                <span
                  className="grid h-10 w-10 place-items-center rounded-full text-sm font-bold text-white shadow-md"
                  style={{ background: avatarGradient(p.hue) }}
                >
                  {p.name.trim().slice(0, 1).toUpperCase()}
                </span>
                <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-ink-900 bg-teal-400" />
                {p.typing && (
                  <span className="anim-ping-soft absolute inset-0 rounded-full border-2 border-teal-400" />
                )}
              </div>
              <span className="max-w-14 truncate text-[10px] text-ink-400">
                {p.typing ? "печатает…" : p.name.split(" ")[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* мой профиль */}
      <div className="flex items-center gap-3 border-t border-ink-700 px-4 py-3">
        <button
          onClick={() => setModal("settings")}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 text-left transition-colors hover:bg-ink-800/70"
          title="Настройки кастомизации"
        >
          <span
            className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white shadow-md transition-transform duration-150 group-hover:scale-105"
            style={{ background: avatarGradient(profile.hue) }}
          >
            {profile.name.trim().slice(0, 1).toUpperCase()}
            {muted && (
              <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-coral-500 text-white" title="Вы в муте">
                <Icon name="mic" size={9} strokeWidth={2.6} />
              </span>
            )}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-ink-50">{profile.name}</span>
              <RoleBadges role={profile.role} verified={profile.verified} />
            </span>
            <span className="block truncate font-mono text-[10px] text-ink-400">
              {profile.username ? `@${profile.username}` : "гость"}
              {roleLabel(profile.role) && (
                <span className="ml-1.5 text-amber-400">· {roleLabel(profile.role)}</span>
              )}
              {muted && <span className="ml-1.5 text-coral-500">· в муте</span>}
            </span>
          </span>
        </button>
        <button onClick={() => setModal("settings")} className={iconBtn} title="Настройки">
          <Icon name="settings" size={16} />
        </button>
        <button onClick={onDisconnect} className={iconBtn} title="Выйти из эфира">
          <Icon name="logout" size={16} />
        </button>
      </div>

      {/* модалки */}
      {modal === "settings" && (
        <SettingsModal
          backend={backend}
          profile={profile}
          theme={theme}
          onTheme={onTheme}
          onSaved={onProfileSaved}
          onClose={() => setModal(null)}
          toast={toast}
        />
      )}
      {modal === "creator" && (
        <CreatorPanel backend={backend} me={profile} onClose={() => setModal(null)} toast={toast} />
      )}
      {modal === "search" && (
        <SearchPanel backend={backend} me={profile} onClose={() => setModal(null)} toast={toast} />
      )}
      {modal === "group" && (
        <GroupModal backend={backend} me={profile} onClose={() => setModal(null)} toast={toast} />
      )}
    </aside>
  );
}
