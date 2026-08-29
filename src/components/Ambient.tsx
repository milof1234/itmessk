import { useMemo } from "react";

/** Живой фон: свечения, точечная сетка, шум, дрейфующие волны и частицы. */
export function Ambient() {
  const particles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        left: `${(i * 37 + 11) % 100}%`,
        top: `${(i * 53 + 17) % 100}%`,
        size: 2 + ((i * 7) % 4),
        delay: `${(i * 1.3) % 9}s`,
        dur: `${7 + (i % 5)}s`,
        hue: i % 3 === 0 ? 36 : 168,
      })),
    []
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* базовые свечения */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(52rem 36rem at 12% -8%, rgba(47,214,181,0.10), transparent 60%)," +
            "radial-gradient(46rem 34rem at 96% 108%, rgba(255,180,84,0.08), transparent 60%)," +
            "radial-gradient(30rem 24rem at 85% 8%, rgba(90,184,255,0.05), transparent 65%)",
        }}
      />
      <div className="dot-grid absolute inset-0" />

      {/* дрейфующие частицы эфира */}
      {particles.map((p, i) => (
        <span
          key={i}
          className="anim-drift absolute rounded-full"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.dur,
            background: `hsl(${p.hue} 80% 60% / 0.5)`,
            boxShadow: `0 0 ${p.size * 3}px hsl(${p.hue} 80% 60% / 0.35)`,
          }}
        />
      ))}

      {/* волны эфира внизу */}
      <svg
        className="anim-wave absolute bottom-[-6rem] left-0 h-64 w-[200%] opacity-[0.13]"
        viewBox="0 0 2400 200"
        preserveAspectRatio="none"
      >
        <path
          d="M0 100 Q 150 40 300 100 T 600 100 T 900 100 T 1200 100 T 1500 100 T 1800 100 T 2100 100 T 2400 100 V 200 H 0 Z"
          fill="#2fd6b5"
        />
      </svg>
      <svg
        className="anim-wave-slow absolute bottom-[-7.5rem] left-0 h-64 w-[200%] opacity-[0.09]"
        viewBox="0 0 2400 200"
        preserveAspectRatio="none"
      >
        <path
          d="M0 120 Q 200 50 400 120 T 800 120 T 1200 120 T 1600 120 T 2000 120 T 2400 120 V 200 H 0 Z"
          fill="#ffb454"
        />
      </svg>

      {/* зерно */}
      <div className="noise-overlay absolute inset-0 opacity-[0.05]" />
    </div>
  );
}

/** Анимированный логотип-эквалайзер */
export function WaveBars({
  size = 22,
  color = "#2fd6b5",
  animate = true,
}: {
  size?: number;
  color?: string;
  animate?: boolean;
}) {
  const bars = [0.35, 0.7, 1, 0.55, 0.8];
  return (
    <span className="inline-flex items-center gap-[3px]" style={{ height: size }} aria-hidden="true">
      {bars.map((h, i) => (
        <span
          key={i}
          className={animate ? "eq-bar rounded-full" : "rounded-full"}
          style={{
            width: Math.max(3, size * 0.14),
            height: size * h,
            background: color,
            animationDelay: `${i * 0.14}s`,
            animationDuration: `${1 + (i % 3) * 0.18}s`,
          }}
        />
      ))}
    </span>
  );
}
