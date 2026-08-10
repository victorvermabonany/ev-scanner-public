// Vertical advantage bar beside the board: white's share fills from the
// bottom, black's from the top, matching how the board is drawn.

/** Evaluation to white's share of the bar, 0-100. */
function whiteShare({ cp, mate, terminal }) {
  if (terminal === 'white_mates') return 100;
  if (terminal === 'black_mates') return 0;
  if (mate != null) return mate > 0 ? 100 : 0;

  // Same win-percentage curve the accuracy figure uses, so the bar and the
  // percentages tell the same story.
  const clamped = Math.max(-1000, Math.min(1000, cp ?? 0));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamped)) - 1);
}

function label({ cp, mate, terminal }) {
  if (terminal === 'white_mates') return '#';
  if (terminal === 'black_mates') return '#';
  if (mate != null) return `M${Math.abs(mate)}`;
  const pawns = (cp ?? 0) / 100;
  return `${pawns >= 0 ? '+' : '−'}${Math.abs(pawns).toFixed(1)}`;
}

export function EvalBar({ evaluation, orientation = 'w' }) {
  const share = whiteShare(evaluation ?? {});
  // Flip when the board is seen from black's side so the bar stays aligned
  // with the player whose pieces are nearest the viewer.
  const bottomShare = orientation === 'w' ? share : 100 - share;
  const winning = share >= 50;

  return (
    <div className="evalbar" aria-label={`Evaluation ${label(evaluation ?? {})}`}>
      <div className="evalbar__white" style={{ height: `${bottomShare}%` }} />
      <span className={`evalbar__text ${winning ? 'evalbar__text--w' : 'evalbar__text--b'}`}>
        {label(evaluation ?? {})}
      </span>
    </div>
  );
}
