import { useState } from 'react';
import { COACHES } from '../../../shared/coach.js';
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

  // Two steps: pick a voice, then say who you are. The username is what
  // makes the home screen real rather than a mock-up.
  const step = coach ? 'username' : 'coach';

  function submit(event) {
    event.preventDefault();
    if (username.trim()) onDone({ coach, username: username.trim() });
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
            <button type="button" className="linkbtn" onClick={() => setCoach(null)}>
              change
            </button>
          </div>
          <input
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Chess.com username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            autoFocus
          />
          <button className="btn" type="submit" disabled={!username.trim()}>
            Start
          </button>
        </form>
      )}
    </main>
  );
}
