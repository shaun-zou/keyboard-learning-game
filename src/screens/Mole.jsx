import { useEffect, useRef, useState } from 'react';
import { LETTERS } from '../data/keyboard.js';
import { usePhysicalKey } from '../hooks/useKeys.js';
import { sfx, playWinCheer } from '../audio.js';
import { recordActivity } from '../stats.js';

// 键盘打地鼠：地鼠举着字母从地洞里冒出来，快速按下对应字母把它敲回去！
// 30 秒限时，越敲地鼠冒头越快；纯 CSS 地鼠 + 纯本地计分

const GAME_SECONDS = 30;
const HOLES = 9; // 3×3 个地洞

const BEST_KEY = 'mole_best_v1';
function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY) || 0) || 0;
  } catch {
    return 0;
  }
}

function randLetter() {
  return LETTERS[Math.floor(Math.random() * LETTERS.length)];
}

export default function Mole() {
  // select(说明页) | play(游戏中) | done(结算)
  const [phase, setPhase] = useState('select');
  const [seconds, setSeconds] = useState(GAME_SECONDS);
  const [mole, setMole] = useState(null); // { hole, letter, upMs }
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [whacked, setWhacked] = useState(0);
  const [escaped, setEscaped] = useState(0);
  const [dizzy, setDizzy] = useState(false); // 被敲中瞬间
  const [hammer, setHammer] = useState(null); // 木槌敲击动画所在的洞位
  const [newBest, setNewBest] = useState(false);

  const bestRef = useRef(loadBest());
  const scoreRef = useRef(0);
  const whackedRef = useRef(0);
  const comboRef = useRef(0);
  const spawnRef = useRef(null);
  const hideRef = useRef(null);
  const dizzyRef = useRef(null); // 敲晕延时：锤头砸中那一刻才触发
  const moleRef = useRef(null);
  const deadlineRef = useRef(0);

  moleRef.current = mole;

  const clearTimers = () => {
    clearTimeout(spawnRef.current);
    clearTimeout(hideRef.current);
    clearTimeout(dizzyRef.current);
  };
  useEffect(() => clearTimers, []);

  // 冒出一只地鼠：洞位随机、字母随机，随分数提高冒头时间变短
  const spawn = () => {
    const prevHole = moleRef.current ? moleRef.current.hole : -1;
    let hole = Math.floor(Math.random() * HOLES);
    let guard = 0;
    while (hole === prevHole && guard < 8) {
      hole = Math.floor(Math.random() * HOLES);
      guard += 1;
    }
    const upMs = Math.max(700, 1500 - whackedRef.current * 22);
    const m = { hole, letter: randLetter(), upMs };
    moleRef.current = m;
    setMole(m);
    setDizzy(false);
    // 到点没被敲中 → 缩回去，算逃走
    hideRef.current = setTimeout(() => {
      if (moleRef.current === m) {
        moleRef.current = null;
        setMole(null);
        setEscaped((n) => n + 1);
        comboRef.current = 0;
        setCombo(0);
        spawnRef.current = setTimeout(spawn, 320);
      }
    }, upMs);
  };

  // 主计时：每 100ms 刷新，时间到结算
  useEffect(() => {
    if (phase !== 'play') return;
    deadlineRef.current = Date.now() + GAME_SECONDS * 1000;
    spawnRef.current = setTimeout(spawn, 500);
    const timer = setInterval(() => {
      const left = Math.max(0, deadlineRef.current - Date.now());
      setSeconds(Math.ceil(left / 1000));
      if (left <= 0) {
        clearInterval(timer);
        clearTimers();
        moleRef.current = null;
        setMole(null);
        setSeconds(0);
        finish();
      }
    }, 100);
    return () => {
      clearInterval(timer);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const finish = () => {
    recordActivity();
    sfx.win();
    if (scoreRef.current > bestRef.current) {
      bestRef.current = scoreRef.current;
      try {
        localStorage.setItem(BEST_KEY, String(bestRef.current));
      } catch {}
      setNewBest(true);
      setTimeout(() => playWinCheer(), 900);
    }
    setPhase('done');
  };

  const whack = (raw) => {
    if (phase !== 'play' || !moleRef.current) return;
    const code = typeof raw === 'string' ? raw.toLowerCase() : raw;
    if (code !== moleRef.current.letter) return; // 没对上不打扰
    sfx.correct();
    whackedRef.current += 1;
    setWhacked(whackedRef.current);
    scoreRef.current += 10 + comboRef.current * 2; // 连击加分
    setScore(scoreRef.current);
    comboRef.current += 1;
    setCombo(comboRef.current);
    setBestCombo((b) => Math.max(b, comboRef.current));
    // 木槌敲下去！地鼠先看着锤子抡下来，锤头砸中（46% ≈ 253ms）才被敲晕
    const hitMole = moleRef.current;
    setHammer(hitMole.hole);
    // 760ms：星星 0.26s 后迸溅、0.45s 飞完；锤子 0.55s 内淡出，不遮挡 880ms 后冒头的下一只
    setTimeout(() => setHammer((h) => (h === hitMole.hole ? null : h)), 760);
    // 锤头落下的瞬间才敲晕：地鼠摇晃转星 0.55s 后缩回洞里
    clearTimeout(hideRef.current);
    clearTimeout(dizzyRef.current);
    moleRef.current = null;
    dizzyRef.current = setTimeout(() => setDizzy(true), 250);
    setTimeout(() => {
      if (phase === 'play') setMole(null);
    }, 800);
    spawnRef.current = setTimeout(spawn, 880);
    return hitMole;
  };

  usePhysicalKey(whack);

  const start = () => {
    recordActivity();
    scoreRef.current = 0;
    whackedRef.current = 0;
    comboRef.current = 0;
    setScore(0);
    setWhacked(0);
    setCombo(0);
    setBestCombo(0);
    setEscaped(0);
    setNewBest(false);
    setHammer(null);
    setSeconds(GAME_SECONDS);
    setPhase('play');
  };

  /* ---------- 说明页 ---------- */
  if (phase === 'select') {
    return (
      <div className="select-screen">
        <h2 className="screen-title">🐹 键盘打地鼠</h2>
        <p className="screen-subtitle">地鼠举着字母冒出头，快速按下那个字母把它敲回去！</p>
        <div className="result-screen panel pop-in mole-intro">
          <div className="result__emoji">🐹</div>
          <ul className="result__stats">
            <li>时长 <strong>{GAME_SECONDS}</strong> 秒，敲中越多分越高</li>
            <li>连续敲中还有 <strong>连击加分</strong> 🔥</li>
            <li>历史最高分：<strong>{bestRef.current}</strong> 分</li>
          </ul>
          <div className="result__btns">
            <button className="btn btn--primary btn--lg" autoFocus onClick={start}>
              ▶️ 开始游戏
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- 结算 ---------- */
  if (phase === 'done') {
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
        <div className="result__emoji">{newBest ? '🏆' : '🐹'}</div>
        <h2 className="result__title">{newBest ? '新纪录诞生！' : '时间到！'}</h2>
        <ul className="result__stats">
          <li>
            得分 <strong>{score}</strong> 分（历史最高 {bestRef.current}）
          </li>
          <li>
            敲中 <strong>{whacked}</strong> 只地鼠 · 最高连击 <strong>{bestCombo}</strong> 🔥
          </li>
          <li>
            逃走 <strong>{escaped}</strong> 只
          </li>
        </ul>
        <div className="result__btns">
          <button className="btn btn--ghost" onClick={() => setPhase('select')}>
            🏠 返回说明
          </button>
          <button className="btn btn--primary" onClick={start}>
            🔄 再来一局
          </button>
        </div>
      </div>
    );
  }

  /* ---------- 游戏中 ---------- */
  return (
    <div className="mole-game">
      <div className="hud">
        <span className="hud__pill" data-urgent={seconds <= 5 ? 'y' : 'n'}>
          ⏰ {seconds} 秒
        </span>
        <span className="hud__pill">🪙 {score} 分</span>
        <span className="hud__pill hud__pill--fire">🔥 连击 {combo}</span>
        <span className="hud__pill">🐹 已敲 {whacked}</span>
      </div>

      <section className="panel mole-field">
        {Array.from({ length: HOLES }, (_, i) => {
          const isHere = mole && mole.hole === i;
          return (
            <button
              key={i}
              className={`mole-hole${isHere ? ' mole-hole--up' : ''}${isHere && dizzy ? ' mole-hole--dizzy' : ''}`}
              onClick={() => whack(mole ? mole.letter : '')}
              aria-label={isHere ? `地鼠：按 ${mole.letter.toUpperCase()}` : '空地洞'}
            >
              <span className="mole-hole__dirt" aria-hidden="true" />
              {isHere && (
                <span className="mole-mole">
                  <span className="mole-mole__face" aria-hidden="true">
                    <i className="mole-mole__eye" />
                    <i className="mole-mole__eye" />
                    <i className="mole-mole__nose" />
                  </span>
                  <span className="mole-mole__letter">{mole.letter.toUpperCase()}</span>
                  {dizzy && (
                    <span className="mole-dizzy" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                  )}
                </span>
              )}
              {hammer === i && (
                <>
                  <span className="mole-hammer" aria-hidden="true">
                    <span className="mole-hammer__head" />
                    <span className="mole-hammer__handle" />
                  </span>
                  <span className="mole-fx" aria-hidden="true">
                    <i className="mole-star mole-star--1" />
                    <i className="mole-star mole-star--2" />
                    <i className="mole-star mole-star--3" />
                  </span>
                </>
              )}
            </button>
          );
        })}
      </section>
      <p className="mole-tip">举起的地鼠背上写着哪个字母，就按下哪个键！</p>
    </div>
  );
}
