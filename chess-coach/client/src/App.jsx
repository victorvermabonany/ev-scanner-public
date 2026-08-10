import { useState } from 'react';
import Onboarding from './screens/Onboarding.jsx';
import Home from './screens/Home.jsx';
import { loadCoach, loadUsername, saveCoach, saveUsername } from './lib/storage.js';

export default function App() {
  // Returning players skip straight past onboarding.
  const [coach, setCoach] = useState(loadCoach);
  const [username, setUsername] = useState(loadUsername);

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

  // The build stamp lives inside Home's own layout — as a sibling it sat
  // below a 100dvh screen and pushed the page into scrolling.
  return (
    <Home coach={coach} username={username} onChangeCoach={() => setCoach(null)} />
  );
}
