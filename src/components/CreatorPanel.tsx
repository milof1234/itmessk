import { useState } from "react";
import type { ChatBackend, Profile } from "../types";
import { Icon } from "./Icon";
import { CrownIcon } from "./Badges";
import { UserCard } from "./UserCard";

interface Props {
  backend: ChatBackend;
  me: Profile;
  onClose: () => void;
  toast: (msg: string, type?: "info" | "error") => void;
}

/** Панель креатора: раздача админок, муты, галочки и полный сброс номеров */
export function CreatorPanel({ backend, me, onClose, toast }: Props) {
  const [confirmReset, setConfirmReset] = useState(0); // 0 → 1 (готов?) → 2 (точно?)
  const [resetting, setResetting] = useState(false);
  const users = [...backend.allUsers].sort((a, b) => {
    const order = { creator: 0, admin: 1, user: 2 } as const;
    return order[a.role] - order[b.role] || b.createdAt - a.createdAt;
  });
  const admins = users.filter((u) => u.role === "admin").length;
  const verified = users.filter((u) => u.verified).length;
  const muted = users.filter((u) => u.mutedUntil && u.mutedUntil > Date.now()).length;

  const doReset = async () => {
    if (confirmReset < 2) {
      setConfirmReset((v) => v + 1);
      return;
    }
    setResetting(true);
    try {
      const n = await backend.resetUsers();
      toast(`Все номера сброшены: удалено ${n} акк.`, "info");
      setConfirmReset(0);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Сброс не выполнен", "error");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="anim-modal flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl border border-amber-400/30 bg-ink-850 sm:rounded-2xl"
        style={{ boxShadow: "0 30px 90px var(--t-shadow)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink-600 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="crown-badge inline-flex text-amber-400">
              <CrownIcon size={20} />
            </span>
            <div>
              <h3 className="font-display text-sm font-bold tracking-widest text-ink-50 uppercase">
                Панель креатора
              </h3>
              <p className="font-mono text-[10px] text-ink-400">управление станцией</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-ink-500 text-ink-300 transition-colors hover:text-coral-500"
            aria-label="Закрыть"
          >
            <Icon name="close" size={15} />
          </button>
        </div>

        {/* статистика */}
        <div className="grid grid-cols-4 gap-2 px-5 pt-4">
          {[
            { label: "аккаунты", value: users.length, color: "var(--t-teal-400)" },
            { label: "админы", value: admins, color: "var(--t-coral-500)" },
            { label: "галочки", value: verified, color: "var(--t-sky-400)" },
            { label: "в муте", value: muted, color: "var(--t-amber-400)" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-ink-600 bg-ink-800/70 px-2 py-2.5 text-center">
              <p className="font-display text-lg font-bold" style={{ color: s.color }}>
                {s.value}
              </p>
              <p className="font-mono text-[9px] tracking-wider text-ink-400 uppercase">{s.label}</p>
            </div>
          ))}
        </div>

        {/* список пользователей */}
        <div className="scroll-slim mt-4 flex-1 space-y-2 overflow-y-auto px-5 pb-2">
          {users.length === 0 && (
            <p className="py-6 text-center text-sm text-ink-400">Пока никто не зарегистрировался</p>
          )}
          {users.map((u) => (
            <UserCard key={u.phone} user={u} me={me} backend={backend} toast={toast} />
          ))}
        </div>

        {/* сброс номеров */}
        <div className="border-t border-ink-600 p-4">
          <button
            onClick={() => void doReset()}
            disabled={resetting}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border py-3 font-display text-xs font-bold tracking-widest uppercase transition-all duration-200 active:scale-[0.98] disabled:opacity-60 ${
              confirmReset === 0
                ? "border-coral-500/50 text-coral-500 hover:bg-coral-500/10"
                : "border-coral-500 bg-coral-500 text-white shadow-lg shadow-coral-500/30"
            }`}
          >
            {resetting ? (
              <>
                <Icon name="logo" size={15} className="anim-spin-slow" /> Сбрасываем…
              </>
            ) : confirmReset === 0 ? (
              <>
                <Icon name="alert" size={15} /> Сбросить все номера
              </>
            ) : confirmReset === 1 ? (
              "Удалим все аккаунты, кроме вашего. Точно?"
            ) : (
              "Последнее предупреждение — жмите"
            )}
          </button>
          <p className="mt-2 text-center font-mono text-[10px] text-ink-400">
            удалит документы users (кроме креатора) — аккаунты и пароли исчезнут
          </p>
        </div>
      </div>
    </div>
  );
}
