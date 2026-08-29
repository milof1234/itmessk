import type { Role } from "../types";

export function CrownIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-label="Креатор">
      <path d="M3.2 7.6 7.5 11 12 4.5 16.5 11l4.3-3.4c.5-.4 1.2 0 1.1.6l-1.6 9.2a1.4 1.4 0 0 1-1.4 1.1H5.1a1.4 1.4 0 0 1-1.4-1.1l-1.6-9.2c-.1-.6.6-1 1.1-.6Z" />
      <rect x="4.6" y="19.6" width="14.8" height="1.8" rx="0.9" opacity="0.7" />
    </svg>
  );
}

export function HammerIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      className="hammer-ic"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Админ"
    >
      <path d="m15 12-8.4 8.4a2.1 2.1 0 1 1-3-3L12 9" />
      <path d="m17.6 15 3.4-3.4" />
      <path d="m21 11.6-1.8-1.8a2 2 0 0 1-.6-1.4V7.2L16.4 5a6 6 0 0 0-4.2-1.7l-3.4-.2.8.8A6.2 6.2 0 0 1 11.7 8v1.6l2 2h1.5a2 2 0 0 1 1.4.6l1.8 1.8" />
    </svg>
  );
}

export function VerifiedIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Подтверждён">
      <circle cx="12" cy="12" r="9.2" fill="currentColor" />
      <path
        d="m8.2 12.3 2.5 2.5 5-5.4"
        fill="none"
        stroke="var(--t-ink-950)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Бейджи рядом с ником: корона (сияет), молоток (бьёт), галочка */
export function RoleBadges({
  role,
  verified,
  size = 13,
}: {
  role?: Role;
  verified?: boolean;
  size?: number;
}) {
  if (!role && !verified) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 self-center">
      {role === "creator" && (
        <span
          className="crown-badge inline-flex cursor-help text-amber-400"
          title="Креатор — наведи, чтобы корона засияла"
        >
          <CrownIcon size={size + 1} />
        </span>
      )}
      {role === "admin" && (
        <span
          className="hammer-badge relative inline-flex cursor-help text-coral-500"
          title="Админ — наведи: молоток бьёт по полу"
        >
          <HammerIcon size={size} />
          <svg
            className="hammer-spark absolute -right-1 -bottom-0.5"
            width="10"
            height="6"
            viewBox="0 0 10 6"
            stroke="var(--t-amber-300)"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
          >
            <path d="M1 1 3 4" />
            <path d="M5 0.5 5.4 4" />
            <path d="M9 1.5 7.4 4" />
          </svg>
        </span>
      )}
      {verified && (
        <span className="inline-flex text-teal-400" title="Подтверждённый аккаунт">
          <VerifiedIcon size={size} />
        </span>
      )}
    </span>
  );
}

/** Строка статуса: роль текстом */
export function roleLabel(role?: Role): string | null {
  if (role === "creator") return "креатор";
  if (role === "admin") return "админ";
  return null;
}
