import type { ReactNode } from "react";

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export type IconName =
  | "logo"
  | "mic"
  | "send"
  | "plus"
  | "photo"
  | "video"
  | "play"
  | "pause"
  | "close"
  | "back"
  | "logout"
  | "copy"
  | "check"
  | "alert"
  | "users"
  | "radio"
  | "flame"
  | "bolt"
  | "shield";

const PATHS: Record<IconName, React.ReactNode> = {
  logo: (
    <>
      <rect x="3" y="9.5" width="2.6" height="5" rx="1.3" fill="currentColor" stroke="none" />
      <rect x="8.2" y="6" width="2.6" height="12" rx="1.3" fill="currentColor" stroke="none" />
      <rect x="13.4" y="3" width="2.6" height="18" rx="1.3" fill="currentColor" stroke="none" />
      <rect x="18.6" y="8" width="2.6" height="8" rx="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18v3" />
    </>
  ),
  send: <path d="M4.5 12 3 4.5c0-.6.6-1 1.1-.8l16.4 7.4c.5.2.5.9 0 1.1L4.1 19.6c-.5.2-1.1-.2-1.1-.8L4.5 12Zm0 0h7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  photo: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m5 17 4.5-4.5 3 3L16 12l3.5 3.5" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="6" width="13" height="12" rx="2.5" />
      <path d="m16 10.5 4.2-2.6c.5-.3.8 0 .8.5v7.2c0 .5-.3.8-.8.5L16 13.5" />
    </>
  ),
  play: <path d="M8 5.5v13c0 .6.7 1 1.2.7l10-6.5c.5-.3.5-1 0-1.3l-10-6.5C8.7 4.5 8 4.9 8 5.5Z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="7" y="5" width="3.4" height="14" rx="1.2" fill="currentColor" stroke="none" />
      <rect x="13.6" y="5" width="3.4" height="14" rx="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  back: <path d="M14.5 5 8 12l6.5 7" />,
  logout: (
    <>
      <path d="M14 4h-7A1.5 1.5 0 0 0 5.5 5.5v13A1.5 1.5 0 0 0 7 20h7" />
      <path d="M10.5 12H21m0 0-3.5-3.5M21 12l-3.5 3.5" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
    </>
  ),
  check: <path d="m4.5 12.5 5 5L19.5 7" />,
  alert: (
    <>
      <path d="M12 3.5 2.8 19.5h18.4L12 3.5Z" />
      <path d="M12 10v4.5" />
      <circle cx="12" cy="17" r="0.4" fill="currentColor" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M3.5 20c.5-3.5 2.8-5.5 5.5-5.5s5 2 5.5 5.5" />
      <path d="M15.5 5.6a3.5 3.5 0 0 1 0 5.8M17.5 14.9c1.6.8 2.7 2.5 3 5.1" />
    </>
  ),
  radio: (
    <>
      <circle cx="12" cy="12" r="2.2" />
      <path d="M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4" />
      <path d="M4.9 19a10 10 0 0 1 0-14M19.1 5a10 10 0 0 1 0 14" />
    </>
  ),
  flame: <path d="M12 3s1 2.4 1 4.2c0 1.2-.6 2-1.5 2.6C10.5 10.5 9 9.6 9 7.6 6.6 9.6 5 12.4 5 15a7 7 0 0 0 14 0c0-5-3.5-8.5-7-12Z" />,
  bolt: <path d="M13 2.5 4.5 13.5H11l-1 8L18.5 10H12l1-7.5Z" />,
  shield: (
    <>
      <path d="M12 3 5 5.8v5.4c0 4.5 2.9 7.7 7 9.3 4.1-1.6 7-4.8 7-9.3V5.8L12 3Z" />
      <path d="m9 11.5 2.2 2.2L15.5 9" />
    </>
  ),
};

export function Icon({ name, size = 20, className = "", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
