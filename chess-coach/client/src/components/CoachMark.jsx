// A small avatar for each coach — a chess piece that suits the personality,
// drawn inline so there are no image files to load.
//
//   Mentor         bishop, the teaching piece
//   Drill Sergeant rook, blunt and immovable
//   Analyst        knight, the calculating one

const MARKS = {
  mentor: {
    color: 'var(--mentor)',
    // bishop
    path: 'M16 5c1.4 0 2.5 1.1 2.5 2.5 0 .7-.3 1.3-.7 1.8 2.4 1.7 4.2 4.3 4.2 7 0 1.6-.7 3-1.8 4H11.8C10.7 19.3 10 17.9 10 16.3c0-2.7 1.8-5.3 4.2-7-.4-.5-.7-1.1-.7-1.8C13.5 6.1 14.6 5 16 5Z M11 22h10l1 4H10l1-4Z',
  },
  drill_sergeant: {
    color: 'var(--drill)',
    // rook
    path: 'M9 6h3v2.5h2.5V6h3v2.5H20V6h3v5l-2 2v7l2 4H9l2-4v-7l-2-2V6Z',
  },
  analyst: {
    color: 'var(--analyst)',
    // knight
    path: 'M12 26h11c0-5-1-8-3-10.5-1.6-2-3.6-2.8-3.6-4.8 0-1 .4-1.7.4-1.7l-2 .8-.6-2.3-3.4 3.6C9 13 8.6 15 9.6 16.4c.6.9 1.7 1 2.5.4l1.6-1.2.8 1.4-2.5 3.5c-.7 1-.9 2.2-.5 3.4l.5 2.1Z',
  },
};

export function CoachMark({ coach, size = 40 }) {
  const mark = MARKS[coach] ?? MARKS.analyst;
  return (
    <svg
      className="coachmark"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      style={{ '--mark': mark.color }}
    >
      <circle cx="16" cy="16" r="16" fill="var(--mark)" opacity="0.14" />
      <path d={mark.path} fill="var(--mark)" />
    </svg>
  );
}
