import { useMemo } from "react";

/** Фоновые «волны эфира» — цвета берутся из активной темы */
function WaveLayer({
  speed,
  opacity,
  amp,
  y,
  colorVar,
  strokeWidth,
}: {
  speed: number;
  opacity: number;
  amp: number;
  y: number;
  colorVar: string;
  strokeWidth: number;
}) {
  const d = useMemo(() => {
    const w = 1440;
    let path = `M0 ${y}`;
    const seg = 180;
    for (let x = 0; x <= w * 2; x += seg) {
      const dir = ((x / seg) % 2 === 0 ? -1 : 1) * amp;
      path += ` q ${seg / 2} ${dir} ${seg} 0`;
    }
    return path;
  }, [amp, y]);

  return (
    <div
      className={speed > 20 ? "anim-wave-slow absolute inset-x-0" : "anim-wave absolute inset-x-0"}
      style={{ top: 0, height: "100%", animationDuration: `${speed}s`, opacity }}
    >
      <svg
        width="2880"
        height="100%"
        viewBox="0 0 2880 600"
        preserveAspectRatio="none"
        className="h-full"
      >
        <path d={d} fill="none" stroke={`var(${colorVar})`} strokeWidth={strokeWidth} />
        <path
          d={d}
          fill="none"
          stroke={`var(${colorVar})`}
          strokeWidth={strokeWidth * 5}
          opacity={0.08}
        />
      </svg>
    </div>
  );
}

export function WaveBars({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect x="3" y="9.5" width="2.6" height="5" rx="1.3" fill="currentColor" />
      <rect x="8.2" y="6" width="2.6" height="12" rx="1.3" fill="currentColor" />
      <rect x="13.4" y="3" width="2.6" height="18" rx="1.3" fill="currentColor" />
      <rect x="18.6" y="8" width="2.6" height="8" rx="1.3" fill="currentColor" />
    </svg>
  );
}

const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  left: (i * 61) % 100,
  top: (i * 37 + 13) % 100,
  size: 2 + (i % 3),
  delay: (i % 8) * 1.1,
  dur: 7 + (i % 5) * 2,
}));

export function Ambient() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* свечения */}
      <div
        className="absolute -top-40 -left-40 h-[560px] w-[560px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, var(--t-glow-a), transparent 65%)" }}
      />
      <div
        className="absolute -right-32 -bottom-48 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, var(--t-glow-b), transparent 65%)" }}
      />

      {/* сетка */}
      <div className="dot-grid absolute inset-0" />

      {/* волны эфира */}
      <WaveLayer speed={22} opacity={0.5} amp={34} y={150} colorVar="--t-wave-a" strokeWidth={1.6} />
      <WaveLayer speed={34} opacity={0.35} amp={52} y={300} colorVar="--t-wave-b" strokeWidth={1.4} />
      <WaveLayer speed={27} opacity={0.3} amp={26} y={450} colorVar="--t-wave-a" strokeWidth={1.2} />
      <WaveLayer speed={40} opacity={0.22} amp={60} y={540} colorVar="--t-wave-b" strokeWidth={1.1} />

      {/* частицы */}
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="anim-drift absolute rounded-full"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            background: "var(--t-wave-a)",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            opacity: 0.5,
          }}
        />
      ))}

      {/* зерно */}
      <div className="noise-overlay absolute inset-0" />
    </div>
  );
}
