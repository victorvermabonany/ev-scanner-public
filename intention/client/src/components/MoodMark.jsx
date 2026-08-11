/**
 * One shape for all three answers, drawn with different continuity: an unbroken
 * ring, a dashed ring, a scattered one. Same circle, same weight, same size —
 * so the icons read as three states of the same day rather than a good mark, a
 * warning mark and a bad mark.
 *
 * The dash patterns are built from the ring's circumference (2πr ≈ 56.5 at
 * r = 9) so the dashes come out evenly spaced instead of colliding at the top.
 */
const RING = {
  strong: { dash: undefined, dot: 1 },
  struggling: { dash: '9.42 4.71', dot: 0.6 },
  slipped: { dash: '0.5 7.57', dot: 0.3 },
};

export function MoodMark({ mood, size = 26 }) {
  const ring = RING[mood] ?? RING.strong;

  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle
        cx="14"
        cy="14"
        r="9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeDasharray={ring.dash}
      />
      <circle cx="14" cy="14" r="2.4" fill="currentColor" opacity={ring.dot} />
    </svg>
  );
}
