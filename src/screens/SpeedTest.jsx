import { useEffect, useRef, useState } from 'react';
import { LETTERS } from '../data/keyboard.js';
import { usePhysicalKey } from '../hooks/useKeys.js';
import { sfx, playWinCheer } from '../audio.js';
import {
  recordSpeedTest,
  getSpeedStats,
  getDailyInfo,
  markDailyDone,
  recordKeyHit,
  recordActivity
} from '../stats.js';

// 打字测速挑战：限时敲字母，看每分钟能敲对多少个（KPM）
// 自由练习 = 60 秒；每日挑战 = 30 秒内敲够目标个数（目标由日期决定）

const PRACTICE_SECONDS = 60;
const DAILY_SECONDS = 30;
const STRIP_LEN = 14; // 一行展示的字母个数，全部敲对后换新的一行

// 由日期决定每日挑战目标：25 / 35 / 45 个（30 秒内敲对）
function dailyTargetOf(dateStr) {
  const day = Number(dateStr.slice(8, 10));
  return 25 + (day % 3) * 10;
}

function starsOf(kpm) {
  if (kpm >= 45) return 3;
  if (kpm >= 28) return 2;
  return 1;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function SpeedTest({ forceDaily = false }) {
  const today = todayStr();
  const dailyTarget = dailyTargetOf(today);

  // select(模式选择) | play(测速中) | done(结算)
  const [phase, setPhase] = useState('select');
  const [mode, setMode] = useState(forceDaily ? 'daily' : 'practice'); // practice | daily
  const [seq, setSeq] = useState([]);
  const [pos, setPos] = useState(0); // 当前敲到这一行的第几个字母
  const [seconds, setSeconds] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [shake, setShake] = useState(false);
  const [dailyWin, setDailyWin] = useState(false);
  const resultRef = useRef({ kpm: 0, accuracy: 100, stars: 1 });
  const deadlineRef = useRef(0);
  const comboRef = useRef(0);
  const seqRef = useRef([]);
  const posRef = useRef(0);
  const correctRef = useRef(0);
  const errorsRef = useRef(0);

  const speed = getSpeedStats();
  const daily = getDailyInfo(today);

  // 从首页「每日挑战」入口进来时，直接开始今天的挑战
  useEffect(() => {
    if (forceDaily) start('daily');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalSeconds = mode === 'daily' ? DAILY_SECONDS : PRACTICE_SECONDS;
  const remaining = deadlineRef.current ? Math.max(0, deadlineRef.current - Date.now()) : 0;

  const randLetter = () => LETTERS[Math.floor(Math.random() * LETTERS.length)];

  const start = (m) => {
    setMode(m);
    recordActivity(); // 开始测速即算今日打卡
    const sec = m === 'daily' ? DAILY_SECONDS : PRACTICE_SECONDS;
    const arr = Array.from({ length: STRIP_LEN }, randLetter);
    seqRef.current = arr;
    posRef.current = 0;
    correctRef.current = 0;
    errorsRef.current = 0;
    comboRef.current = 0;
    setSeq(arr);
    setPos(0);
    setSeconds(sec);
    setCorrect(0);
    setErrors(0);
    setCombo(0);
    setBestCombo(0);
    setDailyWin(false);
    setShake(false);
    deadlineRef.current = Date.now() + sec * 1000;
    setPhase('play');
  };

  // 计时：每 100ms 刷新剩余时间，时间到进入结算
  useEffect(() => {
    if (phase !== 'play') return;
    const timer = setInterval(() => {
      const left = Math.max(0, deadlineRef.current - Date.now());
      setSeconds(Math.ceil(left / 1000));
      if (left <= 0) {
        clearInterval(timer);
        finish();
      }
    }, 100);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const finish = () => {
    const sec = mode === 'daily' ? DAILY_SECONDS : PRACTICE_SECONDS;
    const c = correctRef.current;
    const w = errorsRef.current;
    const kpm = Math.round((c / sec) * 60);
    const accuracy = c + w === 0 ? 100 : Math.round((c / (c + w)) * 100);
    const stars = starsOf(kpm);
    resultRef.current = { kpm, accuracy, stars };
    const win = mode === 'daily' && c >= dailyTargetOf(today);
    setDailyWin(win);
    if (mode === 'daily') {
      markDailyDone(today, kpm);
      if (win) setTimeout(() => playWinCheer(), 900);
    } else {
      recordSpeedTest({ kpm, accuracy });
      if (stars === 3) setTimeout(() => playWinCheer(), 900);
    }
    sfx.win();
    setPhase('done');
  };

  const answer = (raw) => {
    if (phase !== 'play') return;
    const code = typeof raw === 'string' ? raw.toLowerCase() : raw;
    if (!/^[a-z]$/.test(code)) return;
    const expected = seqRef.current[posRef.current];
    if (code === expected) {
      sfx.click();
      recordKeyHit(expected, true);
      correctRef.current += 1;
      setCorrect(correctRef.current);
      comboRef.current += 1;
      setCombo(comboRef.current);
      setBestCombo((b) => Math.max(b, comboRef.current));
      // 敲对一个：黄色标记停在原地；整行敲完后换一行新字母
      const nextPos = posRef.current + 1;
      if (nextPos >= STRIP_LEN) {
        const arr = Array.from({ length: STRIP_LEN }, randLetter);
        seqRef.current = arr;
        posRef.current = 0;
        setSeq(arr);
        setPos(0);
      } else {
        posRef.current = nextPos;
        setPos(nextPos);
      }
    } else {
      sfx.wrong();
      recordKeyHit(expected, false);
      errorsRef.current += 1;
      setErrors(errorsRef.current);
      comboRef.current = 0;
      setCombo(0);
      setShake(true);
      setTimeout(() => setShake(false), 380);
    }
  };

  usePhysicalKey(answer);

  /* ---------- 模式选择 ---------- */
  if (phase === 'select') {
    return (
      <div className="select-screen">
        <h2 className="screen-title">🏎️ 打字测速挑战</h2>
        <p className="screen-subtitle">限时敲字母，看看你的手速能有多快！</p>
        <div className="lesson-grid">
          <button className="level-card panel" onClick={() => start('practice')}>
            <span className="level-card__emoji">🏁</span>
            <span className="level-card__name">自由练习 · {PRACTICE_SECONDS} 秒</span>
            <span className="level-card__desc">不计输赢，专心提速，刷新你的最快纪录！</span>
            <span className="level-card__keys">
              最快纪录：{speed.bestKpm || 0} 字母/分钟 · 最高正确率 {speed.bestAccuracy || 0}%
            </span>
          </button>
          <button className="level-card panel" onClick={() => start('daily')}>
            <span className="level-card__emoji">🎯</span>
            <span className="level-card__name">每日挑战 · {DAILY_SECONDS} 秒</span>
            <span className="level-card__desc">
              今天的目标：{DAILY_SECONDS} 秒内敲对 {dailyTarget} 个字母！
            </span>
            <span className="level-card__keys">
              {daily.done ? `✅ 今日已完成（最好成绩 ${daily.bestKpm} 字母/分钟）` : '今天还没挑战，快来试试'}
            </span>
            {daily.done && (
              <span className="level-card__stars" title="今日已完成">
                <span className="mini-star mini-star--on">★</span>
              </span>
            )}
          </button>
        </div>
      </div>
    );
  }

  /* ---------- 结算 ---------- */
  if (phase === 'done') {
    const { kpm, accuracy, stars } = resultRef.current;
    return (
      <div className="result-screen panel pop-in">
        <div className="confetti" aria-hidden="true">
          {['⭐', '🎉', '✨', '🌟', '🎊'].map((e, i) => (
            <span
              key={i}
              style={{
                left: `${8 + i * 19}%`,
                animationDelay: `${(i % 4) * 0.35}s`,
                animationDuration: `${2.6 + (i % 3) * 0.5}s`
              }}
            >
              {e}
            </span>
          ))}
        </div>
        <div className="result__emoji">{mode === 'daily' ? (dailyWin ? '🏆' : '🎯') : '🏁'}</div>
        <h2 className="result__title">
          {mode === 'daily' ? (dailyWin ? '每日挑战达成！' : '挑战结束，明天再来！') : '时间到！'}
        </h2>
        {mode === 'daily' && (
          <p className="result__sub">
            今日目标：{DAILY_SECONDS} 秒敲对 {dailyTarget} 个 —— 你敲对了 {correct} 个
          </p>
        )}
        <div className="result__stars">
          {[1, 2, 3].map((n) => (
            <span key={n} className={n <= stars ? 'star star--on' : 'star'}>
              ★
            </span>
          ))}
        </div>
        <ul className="result__stats">
          <li>
            速度 <strong>{kpm}</strong> 字母/分钟
          </li>
          <li>
            正确率 <strong>{accuracy}%</strong>
          </li>
          <li>
            最高连击 <strong>{bestCombo}</strong> 🔥
          </li>
          {mode === 'practice' && kpm >= (speed.bestKpm || 0) && kpm > 0 && (
            <li className="speed-record">🎉 打破纪录！新的最快纪录诞生啦</li>
          )}
        </ul>
        <div className="result__btns">
          <button className="btn btn--ghost" onClick={() => setPhase('select')}>
            🗺️ 返回选择
          </button>
          <button className="btn btn--primary" onClick={() => start(mode)}>
            🔄 再来一次
          </button>
        </div>
      </div>
    );
  }

  /* ---------- 测速进行中 ---------- */
  return (
    <div className="speed-game">
      <div className="hud">
        <span className="hud__pill">{mode === 'daily' ? '🎯 每日挑战' : '🏁 自由练习'}</span>
        {mode === 'daily' && (
          <span className="hud__pill">
            目标 {dailyTarget} 个 · 已敲对 {correct}
          </span>
        )}
        <span className="hud__pill hud__pill--fire">🔥 连击 {combo}</span>
        <span className="hud__pill">❌ 错误 {errors}</span>
      </div>

      <section className={`panel speed-card${shake ? ' speed-card--shake' : ''}`}>
        <div className="speed-timer" data-urgent={seconds <= 5 ? 'y' : 'n'}>
          ⏰ {seconds}
        </div>
        <div className="speed-strip">
          {seq.map((ch, i) => (
            <span
              key={`${i}-${ch}`}
              className={`speed-tile${i < pos ? ' speed-tile--done' : i === pos ? ' speed-tile--now' : i < pos + 4 ? ' speed-tile--next' : ''}`}
            >
              {ch.toUpperCase()}
            </span>
          ))}
        </div>
        <p className="speed-tip">敲白色凸起带光标的字母！敲对了会留在原地变黄，一行敲完自动换新的一行～</p>
      </section>

      <button className="btn btn--text" onClick={() => setPhase('select')}>
        ← 不测了，返回选择
      </button>
    </div>
  );
}
