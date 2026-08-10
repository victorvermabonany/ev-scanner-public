import { useState } from 'react';
import { COACHES } from '../../../shared/coach.js';
import { verifyPlayer, ChessComError } from '../../../shared/chesscom.js';
import { CoachMark } from '../components/CoachMark.jsx';

// One line each, so the choice is obvious without reading a paragraph.
const PITCH = {
  mentor: 'Encouraging. Treats every mistake as something to build on.',
  drill_sergeant: 'Blunt and direct. Tells you what went wrong, plainly.',
  analyst: 'Dry and factual. Numbers first, no commentary.',
};

export default function Onboarding({ onDone, initialUsername = '' }) {
  const [coach, setCoach] = useState(null);
  const [username, setUsername] = useState(initialUsername);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);

  const step = coach ? 'username' : 'coach';

  async function submit(event) {
    event.preventDefault();
    if (!username.trim() || checking) return;

    setChecking(true);
    setError(null);

    try {
      // Confirm the account exists before committing to it, so a typo is
      // caught here rather than surfacing later as a failed analysis.
      const player = await verifyPlayer(username);

      if (!player.hasGames) {
        setError(
          `${player.username} exists but hasn't played any games yet. Play a game on Chess.com, then come back.`
        );
        return;
      }

      onDone({ coach, username: player.username });
    } catch (err) {
      setError(
        err instanceof ChessComError && err.status === 404
          ? `We couldn't find "${username.trim()}" on Chess.com. Check the spelling — it's your username, not your email.`
          : (err?.message ?? 'Something went wrong. Try again in a moment.')
      );
    } finally {
      setChecking(false);
    }
  }

  return (
    <main className="screen screen--center">
      <header className="onboard__head">
        <h1 className="title">Chess Coach</h1>
        <p className="subtitle">
          {step === 'coach' ? 'Choose how you want to be coached.' : 'Who are we reviewing?'}
        </p>
      </header>

      {step === 'coach' ? (
        <ul className="coaches">
          {Object.entries(COACHES).map(([key, name]) => (
            <li key={key}>
              <button className="coachcard" onClick={() => setCoach(key)}>
                <CoachMark coach={key} size={44} />
                <span className="coachcard__text">
                  <span className="coachcard__name">{name}</span>
                  <span className="coachcard__pitch">{PITCH[key]}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <form className="onboard__form" onSubmit={submit}>
          <div className="onboard__chosen">
            <CoachMark coach={coach} size={36} />
            <span>{COACHES[coach]}</span>
            <button
              type="button"
              className="linkbtn"
              onClick={() => {
                setCoach(null);
                setError(null);
              }}
            >
              change
            </button>
          </div>

          <input
            className="input"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError(null);
            }}
            placeholder="Chess.com username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            disabled={checking}
            autoFocus
          />

          <button className="btn" type="submit" disabled={!username.trim() || checking}>
            {checking ? 'Checking…' : 'Start'}
          </button>

          {error && <p className="formerror">{error}</p>}
        </form>
      )}
    </main>
  );
}
