import { useState } from 'react';
import { COACHES } from '../../../shared/coach.js';
import { verifyPlayer, ChessComError } from '../../../shared/chesscom.js';
import { CoachMark } from '../components/CoachMark.jsx';
import { loadCoach } from '../lib/storage.js';

/** A remembered profile keeps its coach, so the avatar matches. */
const loadCoachFor = (name) => loadCoach(name) ?? 'analyst';

// One line each, so the choice is obvious without reading a paragraph.
const PITCH = {
  mentor: 'Encouraging. Treats every mistake as something to build on.',
  drill_sergeant: 'Blunt and direct. Tells you what went wrong, plainly.',
  analyst: 'Dry and factual. Numbers first, no commentary.',
};

export default function Onboarding({
  onDone,
  initialUsername = '',
  knownProfiles = [],
  onResume,
}) {
  const [coach, setCoach] = useState(null);
  const [username, setUsername] = useState(initialUsername);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);

  // Three ways in. Changing coach skips the introduction. Someone who has
  // signed out on this device gets their accounts offered back rather than
  // being made to set up again. Only a genuinely new visitor sees the pitch.
  const [step, setStep] = useState(() => {
    if (initialUsername) return 'coach';
    if (knownProfiles.length > 0) return 'accounts';
    return 'welcome';
  });

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

  if (step === 'accounts') {
    return (
      <main className="screen screen--center">
        <header className="onboard__head">
          <h1 className="title">Chess Coach</h1>
          <p className="subtitle">Welcome back.</p>
        </header>

        <ul className="coaches">
          {knownProfiles.map((name) => (
            <li key={name}>
              <button className="coachcard" onClick={() => onResume?.(name)}>
                <CoachMark coach={loadCoachFor(name)} size={40} />
                <span className="coachcard__text">
                  <span className="coachcard__name">{name}</span>
                  <span className="coachcard__pitch">Pick up where you left off</span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <button className="linkbtn" onClick={() => setStep('coach')}>
          Use another account
        </button>
      </main>
    );
  }

  if (step === 'welcome') {
    return (
      <main className="screen screen--center welcome">
        <h1 className="title">Chess Coach</h1>

        <p className="welcome__body">
          Chess Coach replays your recent Chess.com games through Stockfish, right here
          on your phone. It finds the moves that cost you the most, works out what went
          wrong in each one, and picks the single habit worth fixing this week.
        </p>
        <p className="welcome__body">
          Pick a coach, and you'll hear it in their voice.
        </p>

        <button className="btn" onClick={() => setStep('coach')}>
          Get started
        </button>

        <p className="welcome__note">
          No account needed. Your games are analysed on your device.
        </p>
      </main>
    );
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
              <button
                className="coachcard"
                onClick={() => {
                  setCoach(key);
                  setStep('username');
                }}
              >
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
                setStep('coach');
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
