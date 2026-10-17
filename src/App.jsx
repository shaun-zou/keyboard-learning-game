import { useEffect, useState } from 'react';
import Home from './screens/Home.jsx';
import Learn from './screens/Learn.jsx';
import FindKey from './screens/FindKey.jsx';
import TypeGame from './screens/Type.jsx';
import Privacy from './screens/Privacy.jsx';
import SpeedTest from './screens/SpeedTest.jsx';
import Cert from './screens/Cert.jsx';
import Shop from './screens/Shop.jsx';
import Badges from './screens/Badges.jsx';
import Music from './screens/Music.jsx';
import Mole from './screens/Mole.jsx';
import Balloon from './screens/Balloon.jsx';
import Kart from './screens/Kart.jsx';
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

  // 切换页面时回到顶部，避免上一页的滚动位置带进新页面
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  const toggleSound = () => {
    const next = !sound;
    setSoundOn(next);
    setSound(next);
  };

  const goHome = (e) => {
    e.currentTarget.blur();
    setScreen('home');
  };

  return (
    <div className="app">
      <div className="bg-deco" aria-hidden="true">
        <span>⭐</span>
        <span>🍬</span>
        <span>✨</span>
        <span>🎈</span>
        <span>🍬</span>
      </div>

      <header className="topbar">
        <button className="topbar__brand" onClick={goHome}>
          <span className="topbar__mark" aria-hidden="true">
            键
          </span>
          <span className="topbar__name">
            键盘<b>小达人</b>
          </span>
        </button>
        <div className="topbar__actions">
          {screen !== 'home' && (
            <button className="btn btn--ghost btn--sm" onClick={goHome}>
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
          <button className="topbar__privacy" onClick={() => setScreen('privacy')}>
            隐私
          </button>
        </div>
      </header>

      <main className="app__main">
        {screen === 'home' && <Home onPick={setScreen} />}
        {screen === 'learn' && <Learn />}
        {screen === 'find' && <FindKey />}
        {screen === 'type' && <TypeGame />}
        {screen === 'speed' && <SpeedTest />}
        {screen === 'daily' && <SpeedTest forceDaily />}
        {screen === 'cert' && <Cert />}
        {screen === 'shop' && <Shop />}
        {screen === 'badges' && <Badges />}
        {screen === 'music' && <Music />}
        {screen === 'mole' && <Mole />}
        {screen === 'balloon' && <Balloon />}
        {screen === 'kart' && <Kart />}
        {screen === 'privacy' && <Privacy onBack={() => setScreen('home')} />}
      </main>
    </div>
  );
}
