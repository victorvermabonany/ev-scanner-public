const RESULT = { win: '1–0', loss: '0–1', draw: '½–½' };

export default function Games({ summary, onBack, onOpen }) {
  const log = summary.gameLog ?? [];

  return (
    <main className="screen games">
      <header className="rep__head">
        <button className="linkbtn" onClick={onBack}>
          ← Back
        </button>
        <span className="rep__period">
          {log.length} {log.length === 1 ? 'game' : 'games'}
        </span>
      </header>

      <div>
        <h1 className="drills__title">Games</h1>
        <p className="drills__sub">Tap any game for a move-by-move review.</p>
      </div>

      {log.length === 0 ? (
        <p className="rep__empty">
          Refresh your analysis on the home screen to build the game log.
        </p>
      ) : (
        <ul className="gamelist">
          {log.map((game, index) => (
            <li key={game.url ?? index}>
              <button className="gamerow" onClick={() => onOpen(index)}>
                <span className="gamerow__text">
                  <span className="gamerow__title">
                    vs {game.opponent}
                    <span className="gamerow__result">
                      {RESULT[game.outcome] ?? '·'}
                    </span>
                  </span>
                  <span className="gamerow__meta">
                    {game.playedAt} · {game.timeClass} · {game.moves.length} moves
                  </span>
                </span>
                {/* Only the counts that matter; good moves aren't news. */}
                <span className="gamerow__tally">
                  {game.tally.blunder > 0 && (
                    <span className="tally tally--blunder">{game.tally.blunder}</span>
                  )}
                  {game.tally.mistake > 0 && (
                    <span className="tally tally--mistake">{game.tally.mistake}</span>
                  )}
                  {game.tally.inaccuracy > 0 && (
                    <span className="tally tally--inaccuracy">
                      {game.tally.inaccuracy}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <footer className="footer">build {__BUILD_TIME__}</footer>
    </main>
  );
}
