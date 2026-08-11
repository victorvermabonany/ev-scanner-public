import { useEffect, useState } from 'react';

import CheckIn from './screens/CheckIn.jsx';
import Home from './screens/Home.jsx';
import { fetchSummary } from './lib/api.js';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSummary().then(setSummary).catch((problem) => setError(problem.message));
  }, []);

  return (
    <main className="shell">
      {error && <p className="state state__error">{error}</p>}

      {!error && !summary && <p className="state">…</p>}

      {summary && screen === 'home' && <Home summary={summary} onCheckIn={() => setScreen('check-in')} />}

      {summary && screen === 'check-in' && (
        <CheckIn
          existingMood={summary.todayMood}
          // Saving returns the recalculated summary, so the streak on the home
          // screen is already right by the time it comes back into view.
          onSaved={setSummary}
          onBack={() => setScreen('home')}
        />
      )}
    </main>
  );
}
