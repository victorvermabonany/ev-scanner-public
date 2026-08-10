import { useState } from 'react';
import Onboarding from './screens/Onboarding.jsx';
import Home from './screens/Home.jsx';
import Report from './screens/Report.jsx';
import Drills from './screens/Drills.jsx';
import Games from './screens/Games.jsx';
import GameReview from './screens/GameReview.jsx';
import { CoachMark } from './components/CoachMark.jsx';
import { useWeeklySummary } from './lib/useWeeklySummary.js';
import { loadCoach, loadUsername, saveCoach, saveUsername } from './lib/storage.js';

function Loading({ coach, progress }) {
  return (
    <main className="screen screen--center">
      <CoachMark coach={coach} size={56} />
      <p className="loading__stage">{progress.stage}</p>
      {progress.total > 0 && (
        <p className="loading__count">
          {progress.done} of {progress.total}
        </p>
      )}
      <div className="progress__track">
        <div
          className="progress__bar"
          style={{ width: progress.total ? `${(progress.done / progress.total) * 100}%` : '20%' }}
        />
      </div>
      <p className="loading__note">Running Stockfish on your device.</p>
    </main>
  );
}

export default function App() {
  // Returning players skip straight past onboarding.
  const [coach, setCoach] = useState(loadCoach);
  const [username, setUsername] = useState(loadUsername);
  const [view, setView] = useState('home');
  const [openGame, setOpenGame] = useState(null);

  const { summary, progress, error, refresh } = useWeeklySummary(username ?? '');

  function finishOnboarding({ coach: pickedCoach, username: pickedName }) {
    saveCoach(pickedCoach);
    saveUsername(pickedName);
    setCoach(pickedCoach);
    setUsername(pickedName);
  }

  // Changing coach later shouldn't make you retype your username.
  if (!coach || !username) {
    return <Onboarding onDone={finishOnboarding} initialUsername={username ?? ''} />;
  }

  if (progress) return <Loading coach={coach} progress={progress} />;

  if (error) {
    return (
      <main className="screen screen--center">
        <p className="error">{error}</p>
        <button className="btn" onClick={refresh}>
          Try again
        </button>
      </main>
    );
  }

  if (!summary) return <main className="screen" />;

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
    />
  );
}
