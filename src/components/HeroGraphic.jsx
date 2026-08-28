export default function HeroGraphic({ className }) {
  return (
    <svg
      viewBox="0 0 480 480"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="240" cy="200" r="170" stroke="var(--color-accent-soft)" strokeOpacity="0.35" strokeWidth="1.5" />
      <circle cx="300" cy="260" r="130" stroke="var(--color-accent)" strokeOpacity="0.25" strokeWidth="1.5" />
      <circle cx="180" cy="300" r="90" stroke="var(--color-accent-deep)" strokeOpacity="0.2" strokeWidth="1.5" />

      <path
        d="M20 460 C 140 380, 200 260, 460 40"
        stroke="var(--color-accent)"
        strokeOpacity="0.3"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M50 460 C 165 375, 220 255, 460 75"
        stroke="var(--color-accent)"
        strokeOpacity="0.18"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {[
        { cx: 380, cy: 60, r: 16, rot: 10 },
        { cx: 410, cy: 100, r: 24, rot: 0 },
        { cx: 360, cy: 120, r: 12, rot: 25 },
        { cx: 420, cy: 150, r: 20, rot: 15 },
        { cx: 390, cy: 190, r: 14, rot: 5 },
        { cx: 350, cy: 70, r: 10, rot: 30 },
        { cx: 430, cy: 60, r: 18, rot: 20 },
      ].map((hex, i) => {
        const points = Array.from({ length: 6 }, (_, k) => {
          const angle = (Math.PI / 3) * k + (hex.rot * Math.PI) / 180;
          const x = hex.cx + hex.r * Math.cos(angle);
          const y = hex.cy + hex.r * Math.sin(angle);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(" ");
        return (
          <polygon
            key={i}
            points={points}
            fill="var(--color-accent-soft)"
            fillOpacity={0.08 + (i % 3) * 0.05}
            stroke="var(--color-accent)"
            strokeOpacity={0.3 + (i % 3) * 0.05}
            strokeWidth="1"
          />
        );
      })}

      <circle cx="460" cy="40" r="4" fill="var(--color-accent)" fillOpacity="0.5" />
      <circle cx="20" cy="460" r="4" fill="var(--color-accent)" fillOpacity="0.5" />
      <circle cx="300" cy="260" r="3.5" fill="var(--color-accent)" fillOpacity="0.5" />
      <circle cx="180" cy="300" r="3.5" fill="var(--color-accent)" fillOpacity="0.5" />
      <circle cx="240" cy="200" r="3" fill="var(--color-accent)" fillOpacity="0.5" />
    </svg>
  );
}
