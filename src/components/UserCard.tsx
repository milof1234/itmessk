import { useState } from "react";
import type { ChatBackend, Profile, UserDoc } from "../types";
import { avatarGradient, formatClock } from "../lib/media";
import { formatPhonePretty } from "../lib/auth";
import { Icon } from "./Icon";
import { RoleBadges } from "./Badges";
import { CrownIcon } from "./Badges";

interface Props {
  user: UserDoc;
  me: Profile;
  backend: ChatBackend;
  toast: (msg: string, type?: "info" | "error") => void;
}

/** Карточка пользователя с модераторскими действиями (админка, галочка, мут) */
export function UserCard({ user, me, backend, toast }: Props) {
  const [busy, setBusy] = useState(false);
  const isCreatorTarget = user.role === "creator";
  const iAmCreator = me.role === "creator";
  const iCanModerate = me.role === "creator" || me.role === "admin";
  const muted = user.mutedUntil != null && user.mutedUntil > Date.now();

  const act = async (fn: () => Promise<void>, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      toast(okMsg, "info");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Действие не выполнено", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="anim-msg-in flex items-center gap-3 rounded-xl border border-ink-600 bg-ink-800/70 px-3.5 py-3 transition-colors hover:border-ink-500">
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
        style={{ background: avatarGradient(user.hue) }}
      >
        {user.name.trim().slice(0, 1).toUpperCase() || "?"}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-ink-50">{user.name}</span>
          <RoleBadges role={user.role} verified={user.verified} />
        </div>
        <p className="truncate font-mono text-[11px] text-ink-400">
          {user.username ? `@${user.username}` : ""}
          {user.username && " · "}
          {formatPhonePretty(user.phone)}
          {muted && user.mutedUntil && (
            <span className="ml-1.5 text-coral-500">· мут до {formatClock(user.mutedUntil)}</span>
          )}
        </p>
      </div>

      {isCreatorTarget ? (
        <span className="flex shrink-0 items-center gap-1 font-mono text-[10px] text-amber-400">
          <CrownIcon size={12} /> неприкасаем
        </span>
      ) : (
        iCanModerate && (
          <div className={`flex shrink-0 items-center gap-1.5 ${busy ? "opacity-50" : ""}`}>
            {/* админка — только креатор */}
            {iAmCreator && (
              <button
                onClick={() =>
                  void act(
                    () => backend.setRole(user.phone, user.role === "admin" ? "user" : "admin"),
                    user.role === "admin" ? "Молоток изъят" : "Админка выдана — молоток вручён"
                  )
                }
                className={`grid h-8 w-8 place-items-center rounded-lg border transition-all duration-150 hover:scale-105 active:scale-95 ${
                  user.role === "admin"
                    ? "border-coral-500/60 bg-coral-500/15 text-coral-500"
                    : "border-ink-500 text-ink-400 hover:border-coral-500/50 hover:text-coral-500"
                }`}
                title={user.role === "admin" ? "Забрать админку" : "Выдать админку"}
              >
                <Icon name="bolt" size={14} />
              </button>
            )}

            {/* галочка */}
            <button
              onClick={() =>
                void act(
                  () => backend.setVerified(user.phone, !user.verified),
                  user.verified ? "Галочка снята" : "Галочка выдана"
                )
              }
              className={`grid h-8 w-8 place-items-center rounded-lg border transition-all duration-150 hover:scale-105 active:scale-95 ${
                user.verified
                  ? "border-teal-400/60 bg-teal-400/15 text-teal-400"
                  : "border-ink-500 text-ink-400 hover:border-teal-400/50 hover:text-teal-400"
              }`}
              title={user.verified ? "Снять галочку" : "Выдать галочку"}
            >
              <Icon name="check" size={14} />
            </button>

            {/* мут */}
            <select
              value={
                muted && user.mutedUntil
                  ? String(Math.max(1, Math.round((user.mutedUntil - Date.now()) / 60000)))
                  : "0"
              }
              onChange={(e) => {
                const mins = Number(e.target.value);
                void act(
                  () => backend.muteUser(user.phone, mins > 0 ? Date.now() + mins * 60000 : null),
                  mins > 0 ? `Замучен на ${mins} мин` : "Мут снят"
                );
              }}
              className={`h-8 cursor-pointer rounded-lg border bg-ink-750 px-1.5 font-mono text-[11px] outline-none transition-colors ${
                muted ? "border-coral-500/60 text-coral-500" : "border-ink-500 text-ink-300"
              }`}
              title="Мут"
            >
              <option value="0">{muted ? "мут…" : "микро"}</option>
              <option value="5">мут 5 мин</option>
              <option value="60">мут 1 час</option>
              <option value="1440">мут 24 ч</option>
              {muted && <option value="unmute">снять мут</option>}
            </select>
          </div>
        )
      )}
    </div>
  );
}
