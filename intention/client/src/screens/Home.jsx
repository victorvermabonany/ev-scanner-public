import { MoodMark } from '../components/MoodMark.jsx';
import { MOODS } from '../lib/moods.js';

/** The line under the number. It explains the count without keeping score. */
function note(summary) {
  if (summary.total === 0) return 'Your first check-in starts the count.';
  if (summary.todayMood === 'slipped') return 'Today is on the record. The count begins again tomorrow.';
  if (summary.days === 0) return 'A fresh start, from here.';
  if (summary.hasSlipped) return 'Since the last day that got away from you.';
  return 'Every day since you started.';
}

/** A day the user can read at a glance: "Tue 10". */
function weekday(iso) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'short' });
}

export default function Home({ summary, onCheckIn }) {
  const todayMood = summary.todayMood ? MOODS[summary.todayMood] : null;

  return (
    <div className="screen">
      <p className="kicker">Intention</p>

      <section className="count">
        <div className="count__well">
          <span className="count__number">{summary.days}</span>
        </div>

        <p className="count__label">{summary.days === 1 ? 'day of intention' : 'days of intention'}</p>
        <p className="count__note">{note(summary)}</p>
      </section>

      {summary.total > 0 && (
        <section>
          <div className="week">
            {summary.recent.map((day) => (
              <div
                key={day.date}
                className={[
                  'week__day',
                  day.mood ? `week__day--${day.mood}` : '',
                  day.date === summary.today ? 'week__day--today' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                title={`${weekday(day.date)} — ${day.mood ? MOODS[day.mood].label : 'no check-in'}`}
              />
            ))}
          </div>
          <p className="week__caption">The last seven days</p>
        </section>
      )}

      <div className="spacer" />

      {todayMood ? (
        <>
          <div className="today-card">
            <span className={`answer__mark answer__mark--${summary.todayMood}`}>
              <MoodMark mood={summary.todayMood} />
            </span>
            <span>
              <span className="today-card__label">Today</span>
              <span className="today-card__value">{todayMood.label}</span>
            </span>
          </div>

          <div className="actions">
            <button type="button" className="button button--bare" onClick={onCheckIn}>
              Change today’s answer
            </button>
          </div>
        </>
      ) : (
        <div className="actions">
          <button type="button" className="button button--primary" onClick={onCheckIn}>
            Check in for today
          </button>
          <p className="count__note">One question. It takes a moment.</p>
        </div>
      )}
    </div>
  );
}
