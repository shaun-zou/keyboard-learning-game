import { useEffect, useState } from 'react';
import Home from './screens/Home.jsx';
import Learn from './screens/Learn.jsx';
import FindKey from './screens/FindKey.jsx';
import TypeGame from './screens/Type.jsx';
import { isSoundOn, setSoundOn, warmUpSpeech } from './audio.js';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [sound, setSound] = useState(isSoundOn());

  // 首次点击/按键时预热语音合成引擎，消除第一次朗读的延迟
  useEffect(() => {
    const warm = () => warmUpSpeech();
    window.addEventListener('pointerdown', warm, { once: true });
    window.addEventListener('keydown', warm, { once: true });
    return () => {
      window.removeEventListener('pointerdown', warm);
      window.removeEventListener('keydown', warm);
    };
  }, []);

  const toggleSound = () => {
    const next = !sound;
    setSoundOn(next);
    setSound(next);
  };

  return (
    <div className="app">
      <div className="bg-deco" aria-hidden="true">
        <span>🎈</span>
        <span>⭐</span>
        <span>☁️</span>
        <span>🌈</span>
        <span>🎵</span>
      </div>

      <header className="topbar">
        <button
          className="topbar__logo"
          onClick={(e) => {
            e.currentTarget.blur();
            setScreen('home');
          }}
        >
          <span className="topbar__logo-emoji">🎹</span>
          键盘小达人
        </button>
        <div className="topbar__actions">
          {screen !== 'home' && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={(e) => {
                e.currentTarget.blur();
                setScreen('home');
              }}
            >
              🏠 首页
            </button>
          )}
          <button
            className="btn btn--ghost btn--sm"
            onClick={(e) => {
              e.currentTarget.blur();
              toggleSound();
            }}
            title={sound ? '关闭声音' : '打开声音'}
          >
            {sound ? '🔊 声音' : '🔇 静音'}
          </button>
        </div>
      </header>

      <main className="app__main">
        {screen === 'home' && <Home onPick={setScreen} />}
        {screen === 'learn' && <Learn />}
        {screen === 'find' && <FindKey />}
        {screen === 'type' && <TypeGame />}
      </main>

      <footer className="app__foot">小朋友，每天练一练，你就是键盘小达人！⭐</footer>
    </div>
  );
}
