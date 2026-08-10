import { useState } from 'react';
import Onboarding from './screens/Onboarding.jsx';
import Home from './screens/Home.jsx';
import Report from './screens/Report.jsx';
import Drills from './screens/Drills.jsx';
import Games from './screens/Games.jsx';
import GameReview from './screens/GameReview.jsx';
import { CoachMark } from './components/CoachMark.jsx';
import { useWeeklySummary } from './lib/useWeeklySummary.js';
import {
  listProfiles,
  loadActiveUser,
  loadCoach,
  migrateLegacyProfile,
  saveCoach,
  signIn,
  signOut,
} from './lib/storage.js';

function Loading({ coach, progress }) {
  const percent = progress.fraction == null ? null : Math.round(progress.fraction * 100);

  return (
    <main className="screen screen--center">
      <CoachMark coach={coach} size={56} />
      <p className="loading__stage">{progress.stage}</p>
      {progress.detail && <p className="loading__count">{progress.detail}</p>}

      <div className="progress__track">
        {/* An unknown-length step gets a moving bar rather than a frozen one. */}
        <div
          className={`progress__bar ${percent == null ? 'progress__bar--idle' : ''}`}
          style={percent == null ? undefined : { width: `${percent}%` }}
        />
      </div>

      <p className="loading__note">
        {percent == null ? 'Running Stockfish on your device.' : `${percent}% complete`}
      </p>
    </main>
  );
}

// Runs once, before the first render reads any storage.
migrateLegacyProfile();

export default function App() {
  // Returning players skip straight past onboarding; a brand-new visitor has
  // no active profile and lands on the welcome screen.
  const [username, setUsername] = useState(loadActiveUser);
  const [coach, setCoach] = useState(() => loadCoach(loadActiveUser()));
  const [view, setView] = useState('home');
  const [openGame, setOpenGame] = useState(null);

  const { summary, progress, error, refresh } = useWeeklySummary(username ?? '');

  function finishOnboarding({ coach: pickedCoach, username: pickedName }) {
    signIn(pickedName);
    saveCoach(pickedName, pickedCoach);
    setCoach(pickedCoach);
    setUsername(pickedName);
    setView('home');
  }

  // Signing out keeps this profile's games and drill progress, so coming
  // back to it later is instant rather than a fresh analysis.
  function switchPlayer() {
    signOut();
    setCoach(null);
    setUsername(null);
    setView('home');
  }

  // Changing coach later shouldn't make you retype your username.
  if (!coach || !username) {
    return (
      <Onboarding
        onDone={finishOnboarding}
        initialUsername={username ?? ''}
        // Accounts already set up on this device, offered as one tap rather
        // than a retyped username.
        knownProfiles={listProfiles()}
        onResume={(name) => {
          signIn(name);
          setUsername(name);
          setCoach(loadCoach(name));
          setView('home');
        }}
      />
    );
  }

  if (progress) return <Loading coach={coach} progress={progress} />;

  if (error) {
    return (
      <main className="screen screen--center failure">
        <h1 className="failure__title">{error.title}</h1>
        <p className="failure__message">{error.message}</p>
        <div className="failure__actions">
          {error.retry && (
            <button className="btn" onClick={refresh}>
              Try again
            </button>
          )}
          {error.switchPlayer && (
            <button
              className="linkbtn"
              onClick={switchPlayer}
            >
              Switch player
            </button>
          )}
        </div>
      </main>
    );
  }

  // Before the first effect runs there is no summary and no progress yet.
  // Showing a bare <main> here meant a flash of empty black.
  if (!summary) {
    return <Loading coach={coach} progress={{ stage: 'Getting ready', detail: null, fraction: null }} />;
  }

  if (view === 'report') {
    return (
      <Report
        coach={coach}
        summary={summary}
        onBack={() => setView('home')}
        onOpenDrills={() => setView('drills')}
      onOpenGames={() => setView('games')}
      onOpenGame={(index) => {
        setOpenGame(index);
        setView('review');
      }}
      />
    );
  }

  if (view === 'drills') {
    return <Drills summary={summary} onBack={() => setView('home')} />;
  }

  if (view === 'review' && summary.gameLog?.[openGame]) {
    return (
      <GameReview
        game={summary.gameLog[openGame]}
        onBack={() => setView('games')}
      />
    );
  }

  if (view === 'games') {
    return (
      <Games
        summary={summary}
        onBack={() => setView('home')}
        onOpen={(index) => {
          setOpenGame(index);
          setView('review');
        }}
      />
    );
  }

  return (
    <Home
      coach={coach}
      summary={summary}
      onChangeCoach={() => setCoach(null)}
      onOpenReport={() => setView('report')}
      onOpenDrills={() => setView('drills')}
      onOpenGames={() => setView('games')}
      onOpenGame={(index) => {
        setOpenGame(index);
        setView('review');
      }}
      onRefresh={refresh}
      onSwitchPlayer={switchPlayer}
    />
  );
}
