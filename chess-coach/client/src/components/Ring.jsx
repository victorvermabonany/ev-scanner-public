// Progress toward the next tier, as a filled ring.
//
// It used to hold a 0-100 weekly score. It now carries no number of its own:
// the tier name sits inside it, and the fill only says how far through that
// tier you are.
//
// Drawn as plain SVG rather than pulled from a chart library — it's two
// circles and a dash offset, and a library would cost more than it saves.

// Fixed internal coordinate system; the rendered size comes from CSS so the
// ring can shrink on short screens without the home screen starting to scroll.
const SIZE = 200;

export function Ring({ value, band, stroke = 13, children }) {
  const size = SIZE;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = value == null ? 0 : Math.max(0, Math.min(100, value));
  const dash = (filled / 100) * circumference;

  return (
    <div className="ring">
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%" aria-hidden="true">
        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--ring-track)"
          strokeWidth={stroke}
        />
        {/* fill, starting at 12 o'clock */}
        <circle
          className={`ring__fill ring__fill--${band}`}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring__inner">{children}</div>
    </div>
  );
}
