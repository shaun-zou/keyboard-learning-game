import { useEffect, useRef, useState } from 'react';
import Keyboard from '../components/Keyboard.jsx';
import { usePhysicalKey } from '../hooks/useKeys.js';
import { sfx, playWinCheer } from '../audio.js';
import { recordActivity } from '../stats.js';

// 蛋仔卡丁车竞速：敲对路标上的字母给小车加速，
// 和 AI 小对手比谁先冲过终点线！
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const WIN_POS = 98;         // 终点位置 %：终点线贴赛道右边缘（约 98%），车尾越过线即全身冲线，车头冲出画面边缘瞬间结算
const STEP = 4.9;           // 玩家每敲对一次前进量（4.9×20=98 正好压线，20 次正确完赛）
// AI 三档速度（像星球大战的敌机速度那样可选）：每 tick（100ms）前进量
const AI_MODES = [
  { id: 'slow', name: '慢速', emoji: '🐢', speed: 0.26 }, // ≈ 38 秒完赛
  { id: 'mid', name: '中速', emoji: '🚀', speed: 0.38 },  // ≈ 26 秒完赛
  { id: 'fast', name: '快速', emoji: '⚡', speed: 0.52 }  // ≈ 19 秒完赛
];
const BEST_KEY = 'kart_best_v1';

function loadBest() {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) || '{}');
  } catch {
    return {};
  }
}

export default function Kart() {
  // ready（开始页）| race（比赛中）| done（结算）
  const [phase, setPhase] = useState('ready');
  const [letter, setLetter] = useState('a');     // 当前路标字母
  const [playerX, setPlayerX] = useState(0);
  const [aiX, setAiX] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [errors, setErrors] = useState(0);
  const [lit, setLit] = useState(null);
  const [bump, setBump] = useState(false);       // 敲错的顿挫动画
  const [result, setResult] = useState(null);    // 'win' | 'lose'
  const [best, setBest] = useState(loadBest);
  const [speedMode, setSpeedMode] = useState('mid'); // AI 速度档位
  // 超级玛丽式动效：敲对弹金币 + 车尾烟尘
  const [coin, setCoin] = useState(0);           // 金币动画触发计数（key）
  const [puffs, setPuffs] = useState([]);        // 烟尘粒子 [{id}]
  const puffId = useRef(0);

  const playerRef = useRef(0);
  const aiRef = useRef(0);
  const errRef = useRef(0);
  const secRef = useRef(0);
  const letterRef = useRef('a');
  const aiSpeedRef = useRef(AI_MODES[1].speed);

  // 比赛主循环：AI 前进 + 计时 + 终点判定
  useEffect(() => {
    if (phase !== 'race') return;
    const timer = setInterval(() => {
      secRef.current = +(secRef.current + 0.1).toFixed(1);
      setSeconds(secRef.current);
      aiRef.current = Math.min(WIN_POS, aiRef.current + aiSpeedRef.current);
      setAiX(aiRef.current);
      if (aiRef.current >= WIN_POS) finish('lose');
      else if (playerRef.current >= WIN_POS) finish('win');
    }, 100);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const start = () => {
    recordActivity();
    // 速度档位在开局时锁定
    aiSpeedRef.current = (AI_MODES.find((m) => m.id === speedMode) || AI_MODES[1]).speed;
    playerRef.current = 0;
    aiRef.current = 0;
    errRef.current = 0;
    secRef.current = 0;
    setPlayerX(0);
    setAiX(0);
    setSeconds(0);
    setErrors(0);
    setResult(null);
    nextLetter();
    setPhase('race');
  };

  // 结算：赢过的场次累计，赢的时间取最快
  useEffect(() => {
    if (phase !== 'done' || result !== 'win') return;
    const next = {
      wins: (best.wins || 0) + 1,
      bestTime: best.bestTime ? Math.min(best.bestTime, secRef.current) : secRef.current
    };
    setBest(next);
    try {
      localStorage.setItem(BEST_KEY, JSON.stringify(next));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const finish = (r) => {
    setResult(r);
    setPhase('done');
    if (r === 'win') {
      sfx.win();
      setTimeout(() => playWinCheer(), 1050);
    } else {
      sfx.wrong();
    }
  };

  const nextLetter = () => {
    // 避免连续出现同一个字母
    let l = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    while (l === letterRef.current) {
      l = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    }
    letterRef.current = l;
    setLetter(l);
  };

  const handleKey = (code) => {
    if (phase !== 'race') return;
    const k = String(code).toLowerCase();
    if (!/^[a-z]$/.test(k)) return;
    setLit(k);
    setTimeout(() => setLit((v) => (v === k ? null : v)), 200);

    if (k === letterRef.current) {
      // 敲对：小车加速前进，换下一个路标
      sfx.correct();
      playerRef.current = Math.min(WIN_POS, playerRef.current + STEP);
      setPlayerX(playerRef.current);
      nextLetter();
      // 马里奥金币从车顶弹出 + 车尾喷出烟尘
      setCoin((c) => c + 1);
      const pid = ++puffId.current;
      setPuffs((p) => [...p.slice(-3), { id: pid }]);
      setTimeout(() => setPuffs((p) => p.filter((x) => x.id !== pid)), 420);
    } else {
      // 敲错：小车顿一下（时间就是损失）
      sfx.wrong();
      errRef.current += 1;
      setErrors(errRef.current);
      setBump(true);
      setTimeout(() => setBump(false), 380);
    }
  };

  usePhysicalKey(handleKey);

  /* ---------- 开始页 ---------- */
  if (phase === 'ready') {
    return (
      <div className="result-screen panel pop-in">
        <div className="result__emoji">🏁</div>
        <h2 className="result__title">蛋仔卡丁车</h2>
        <p className="result__sub">敲对路标上的字母，你的卡丁车就会加速！先冲过终点线就赢啦！</p>
        <ul className="result__stats">
          <li>对手是 AI 小蛋仔，敲错会 <strong>顿一下</strong>，小心别分神</li>
          {best.wins > 0 && (
            <li>
              已赢 <strong>{best.wins}</strong> 场 · 最快 <strong>{best.bestTime}s</strong> 冲线
            </li>
          )}
        </ul>
        <div className="speed-chips speed-chips--kart">
          {AI_MODES.map((m) => (
            <button
              key={m.id}
              className={`speed-chip${speedMode === m.id ? ' speed-chip--on' : ''}`}
              onClick={(e) => {
                e.currentTarget.blur();
                setSpeedMode(m.id);
              }}
            >
              {m.emoji} {m.name}
            </button>
          ))}
        </div>
        <div className="result__btns">
          <button className="btn btn--primary" onClick={(e) => { e.currentTarget.blur(); start(); }}>
            🚦 出发！
          </button>
        </div>
      </div>
    );
  }

  /* ---------- 结算页 ---------- */
  if (phase === 'done') {
    const win = result === 'win';
    return (
      <div className="result-screen panel pop-in">
        <div className="confetti" aria-hidden="true">
          {['🏁', '⭐', '🎉', '✨'].map((e, i) => (
            <span key={i} style={{ left: `${15 + i * 22}%`, animationDelay: `${i * 0.3}s` }}>
              {e}
            </span>
          ))}
        </div>
        <div className="result__emoji">{win ? '🏆' : '😅'}</div>
        <h2 className="result__title">{win ? '你赢啦！' : '差一点点！'}</h2>
        <ul className="result__stats">
          <li>用时 <strong>{seconds}s</strong> · 敲错 <strong>{errors}</strong> 次</li>
          {best.wins > 0 && (
            <li>
              累计获胜 <strong>{best.wins}</strong> 场 · 最快 <strong>{best.bestTime}s</strong>
            </li>
          )}
        </ul>
        <div className="result__btns">
          <button className="btn btn--ghost" onClick={(e) => { e.currentTarget.blur(); setPhase('ready'); }}>
            🏠 返回
          </button>
          <button className="btn btn--primary" onClick={(e) => { e.currentTarget.blur(); start(); }}>
            🔄 再比一场
          </button>
        </div>
      </div>
    );
  }

  /* ---------- 比赛中 ---------- */
  const modeMeta = AI_MODES.find((m) => m.id === speedMode) || AI_MODES[1];
  return (
    <div className="kart-game">
      <div className="hud">
        <span className="hud__pill">⏱️ {seconds}s</span>
        <span className="hud__pill">敲错 {errors}</span>
        <span className="hud__pill">{modeMeta.emoji} {modeMeta.name}</span>
      </div>

      {/* 路标：敲这里的字母就加速 */}
      <div className="kart-sign">
        <span className="kart-sign__label">敲下这个字母</span>
        <span className="kart-sign__letter pop-in" key={letter}>{letter.toUpperCase()}</span>
      </div>

      <div className="kart-track">
        {/* 马里奥式天空：飘云 + 远山视差 */}
        <div className="kart-sky" aria-hidden="true">
          <i className="kart-cloud kart-cloud--1" />
          <i className="kart-cloud kart-cloud--2" />
          <i className="kart-cloud kart-cloud--3" />
        </div>
        <div className="kart-hills" aria-hidden="true" />
        <div className="kart-lane">
          <span className="kart-lane__who">你</span>
          <div className={`kart-car kart-car--me${bump ? ' kart-car--bump' : ''}`} style={{ left: `${playerX}%` }}>
            <span className="kart-car__egg" />
            <span className="kart-car__body" />
            <span className="kart-car__wheel kart-car__wheel--b" />
            <span className="kart-car__wheel kart-car__wheel--f" />
          </div>
          {puffs.map((p) => (
            <span key={p.id} className="kart-puff" aria-hidden="true" style={{ left: `${playerX}%` }} />
          ))}
          {coin > 0 && (
            <span key={coin} className="kart-coin" aria-hidden="true" style={{ left: `${playerX}%` }} />
          )}
        </div>
        <div className="kart-lane kart-lane--ai">
          <span className="kart-lane__who">AI 蛋仔</span>
          <div className="kart-car kart-car--rival" style={{ left: `${aiX}%` }}>
            <span className="kart-car__egg" />
            <span className="kart-car__body" />
            <span className="kart-car__wheel kart-car__wheel--b" />
            <span className="kart-car__wheel kart-car__wheel--f" />
          </div>
        </div>
        {/* 马里奥砖块路面（向左滚动，越开越有速度感） */}
        <div className="kart-road" aria-hidden="true" />
        <div className="kart-finish" aria-hidden="true">🏁</div>
      </div>

      <Keyboard lit={lit} showFinger />
    </div>
  );
}
