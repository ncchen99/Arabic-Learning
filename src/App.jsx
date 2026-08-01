import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { watchAuth } from './lib/firebase.js';
import { normalizeVoice } from './lib/voices.js';
import { ToastProvider } from './components/Toast.jsx';
import Loading from './components/Loading.jsx';
import Rooms from './pages/Rooms.jsx';
import NewRoom from './pages/NewRoom.jsx';
import RoomShell from './pages/RoomShell.jsx';
import Settings from './pages/Settings.jsx';

function usePref(key, fallback, clean = (v) => v) {
  const [v, setV] = useState(() => clean(localStorage.getItem(key) || fallback));
  useEffect(() => localStorage.setItem(key, v), [key, v]);
  return [v, setV];
}

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = 還在確認登入狀態
  const [theme, setTheme] = usePref('kalima.theme', 'auto');
  const [voice, setVoice] = usePref('kalima.voice', 'sana', normalizeVoice);

  useEffect(() => watchAuth(setUser), []);

  // 主題：auto 時跟隨系統
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const apply = () => {
      const resolved = theme === 'auto' ? (mq.matches ? 'light' : 'dark') : theme;
      document.documentElement.dataset.theme = resolved;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', resolved === 'light' ? '#faf2e2' : '#0c1a21');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  if (user === undefined) {
    return (
      <div className="app">
        <div className="page">
          <Loading size="lg" fullPage />
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="app">
        <Routes>
          <Route path="/" element={<Rooms user={user} />} />
          <Route path="/new" element={<NewRoom user={user} />} />
          <Route path="/r/:roomId/*" element={<RoomShell user={user} voice={voice} />} />
          <Route
            path="/settings"
            element={
              <Settings
                user={user}
                theme={theme}
                setTheme={setTheme}
                voice={voice}
                setVoice={setVoice}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </ToastProvider>
  );
}
