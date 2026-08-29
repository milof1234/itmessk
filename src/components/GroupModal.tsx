import { useEffect, useRef, useState } from "react";
import type { ChatBackend, Profile, UserDoc } from "../types";
import { avatarGradient } from "../lib/media";
import { Icon } from "./Icon";
import { RoleBadges } from "./Badges";

interface Props {
  backend: ChatBackend;
  me: Profile;
  onClose: () => void;
  toast: (msg: string, type?: "info" | "error") => void;
}

/** Создание группы: название + участники по номеру/@юзернейму */
export function GroupModal({ backend, me, onClose, toast }: Props) {
  const [name, setName] = useState("");
  const [members, setMembers] = useState<UserDoc[]>([]);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<UserDoc[]>([]);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const s = q.trim();
    if (!s) {
      setFound([]);
      return;
    }
    timerRef.current = window.setTimeout(() => {
      void backend.searchUsers(s).then((list) => {
        setFound(list.filter((u) => u.phone !== me.phone && !members.some((m) => m.phone === u.phone)));
      });
    }, 250);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [q, backend, me.phone, members]);

  const addMember = (u: UserDoc) => {
    setMembers((cur) => (cur.some((m) => m.phone === u.phone) ? cur : [...cur, u]));
    setQ("");
  };

  const create = async () => {
    if (!name.trim()) {
      toast("Дайте группе название", "error");
      return;
    }
    setBusy(true);
    const id = await backend.createGroup(name.trim(), members.map((m) => m.phone));
    setBusy(false);
    if (id) {
      toast(`Группа «${name.trim()}» в эфире`, "info");
      onClose();
    }
  };

  const inputCls =
    "w-full rounded-xl border border-ink-500 bg-ink-750 px-4 py-2.5 text-[15px] text-ink-50 outline-none transition-colors placeholder:text-ink-400 focus:border-teal-400/70";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="anim-modal flex max-h-[88vh] w-full max-w-md flex-col rounded-t-2xl border border-ink-600 bg-ink-850 sm:rounded-2xl"
        style={{ boxShadow: "0 30px 90px var(--t-shadow)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink-600 px-5 py-4">
          <div>
            <h3 className="font-display text-sm font-bold tracking-widest text-ink-50 uppercase">
              Новая группа
            </h3>
            <p className="font-mono text-[10px] text-ink-400">видна только участникам</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-ink-500 text-ink-300 transition-colors hover:text-coral-500"
            aria-label="Закрыть"
          >
            <Icon name="close" size={15} />
          </button>
        </div>

        <div className="scroll-slim flex-1 space-y-4 overflow-y-auto p-5">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">Название</span>
            <input
              autoFocus
              value={name}
              maxLength={30}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ночная смена"
              className={`${inputCls} mt-1.5`}
            />
          </label>

          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
              Участники · {members.length + 1}
            </span>

            {members.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {members.map((m) => (
                  <span
                    key={m.phone}
                    className="anim-msg-in flex items-center gap-1.5 rounded-full border border-ink-500 bg-ink-750 py-1 pr-1.5 pl-1 text-xs text-ink-100"
                  >
                    <span
                      className="grid h-5 w-5 place-items-center rounded-full text-[9px] font-bold text-white"
                      style={{ background: avatarGradient(m.hue) }}
                    >
                      {m.name.slice(0, 1).toUpperCase()}
                    </span>
                    {m.name}
                    <RoleBadges role={m.role} verified={m.verified} size={10} />
                    <button
                      onClick={() => setMembers((cur) => cur.filter((x) => x.phone !== m.phone))}
                      className="grid h-4 w-4 place-items-center rounded-full text-ink-400 transition-colors hover:text-coral-500"
                      aria-label={`Убрать ${m.name}`}
                    >
                      <Icon name="close" size={9} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative mt-2">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-400">
                <Icon name="search" size={14} />
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Найти по номеру или @юзернейму"
                className={`${inputCls} pl-10 font-mono text-sm`}
              />
            </div>

            {found.length > 0 && (
              <div className="anim-msg-in mt-2 space-y-1.5">
                {found.map((u) => (
                  <button
                    key={u.phone}
                    onClick={() => addMember(u)}
                    className="flex w-full items-center gap-2.5 rounded-xl border border-ink-600 bg-ink-800/70 px-3 py-2 text-left transition-all duration-150 hover:translate-x-0.5 hover:border-teal-400/50"
                  >
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                      style={{ background: avatarGradient(u.hue) }}
                    >
                      {u.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-50">
                        {u.name}
                        <RoleBadges role={u.role} verified={u.verified} size={11} />
                      </span>
                      <span className="block font-mono text-[10px] text-ink-400">@{u.username}</span>
                    </span>
                    <span className="text-teal-300">
                      <Icon name="plus" size={15} />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-ink-600 p-4">
          <button
            onClick={() => void create()}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-400 py-3 font-display text-xs font-bold tracking-widest text-ink-950 uppercase shadow-lg shadow-teal-400/20 transition-all duration-200 hover:bg-teal-300 active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? <Icon name="logo" size={15} className="anim-spin-slow" /> : <Icon name="users" size={15} />}
            Создать группу
          </button>
        </div>
      </div>
    </div>
  );
}
