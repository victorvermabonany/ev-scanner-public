import { useState } from 'react';

import { MoodMark } from '../components/MoodMark.jsx';
import { MOOD_ORDER, MOODS } from '../lib/moods.js';
import { saveCheckIn } from '../lib/api.js';

function BackArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M11 3.5 5.5 9l5.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function CheckIn({ existingMood, onSaved, onBack }) {
  const [saving, setSaving] = useState(null);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState(null);

  async function choose(mood) {
    setError(null);
    setSaving(mood);

    try {
      const summary = await saveCheckIn(mood);
      onSaved(summary);
      setSaved(mood);
    } catch (problem) {
      setError(problem.message);
    } finally {
      setSaving(null);
    }
  }

  // The moment after answering, before going back. A day should get a beat of
  // acknowledgement rather than snapping straight to a number.
  if (saved) {
    const mood = MOODS[saved];

    return (
      <div className="screen">
        <section className="confirmation">
          <span className={`confirmation__mark answer__mark--${saved}`}>
            <MoodMark mood={saved} size={34} />
          </span>
          <p className="confirmation__line">{mood.confirmation}</p>
          <p className="confirmation__note">{mood.afterword}</p>
        </section>

        <div className="spacer" />

        <div className="actions">
          <button type="button" className="button button--primary" onClick={onBack}>
            Done for today
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <button type="button" className="back" onClick={onBack} aria-label="Back to home">
        <BackArrow />
      </button>

      <p className="kicker">Today’s check-in</p>
      <h1 className="headline">How did the day go?</h1>
      <p className="subhead">
        There is no wrong answer here, only the one that is true. Nothing is shared with anyone.
      </p>

      <div className="answers">
        {MOOD_ORDER.map((mood) => (
          <button
            key={mood}
            type="button"
            className={`answer ${saving && saving !== mood ? 'answer--dimmed' : ''}`}
            onClick={() => choose(mood)}
            disabled={saving !== null}
            aria-pressed={existingMood === mood}
          >
            <span className={`answer__mark answer__mark--${mood}`}>
              <MoodMark mood={mood} />
            </span>
            <span>
              <span className="answer__label">{MOODS[mood].label}</span>
              <p className="answer__note">{MOODS[mood].note}</p>
            </span>
          </button>
        ))}
      </div>

      {existingMood && !saving && (
        <p className="count__note" style={{ margin: '1.5rem auto 0', textAlign: 'center' }}>
          You already answered {MOODS[existingMood].label.toLowerCase()} today. Choosing again replaces it.
        </p>
      )}

      {error && <p className="state state__error">{error}</p>}
    </div>
  );
}
