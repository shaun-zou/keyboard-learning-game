import { useEffect, useRef, useState } from 'react';
import Keyboard from '../components/Keyboard.jsx';
import { usePhysicalKey } from '../hooks/useKeys.js';
import { sfx } from '../audio.js';
import { recordActivity, recordKeyHit, getWeakKeys } from '../stats.js';

// 字母气球雨：限时 60 秒；气球从底部往上飘，敲对应字母键戳破它；
// 飘出顶部算漏掉扣一颗心，3 颗心用完或时间到游戏结束。
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const COLORS = ['pink', 'blue', 'green', 'yellow', 'orange', 'purple'];
const HEARTS = 3;
const TIME_LIMIT = 60;              // 限时 60 秒，时间到游戏结束
const TICK_MS = 60;                 // 画面刷新间隔
const SPAWN_BASE = 2100;            // 初始生成间隔（越大越慢）
const SPAWN_MIN = 950;              // 最快生成间隔
const RISE_BASE = 0.34;             // 初始每 tick 上升量（% 面板高）
const MAX_BALLOONS = 5;             // 同屏气球上限
const BEST_KEY = 'balloon_best_v1';

function loadBest() {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) || '{}');
  } catch {
    return {};
  }
}

export default function Balloon() {
  // ready（开始页）| play（游戏中）| done（结算）
  const [phase, setPhase] = useState('ready');
  const [balloons, setBalloons] = useState([]);   // {id, letter, color, x, y, rise}
  const [popping, setPopping] = useState([]);      // 正在爆破动画的气球 id
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hearts, setHearts] = useState(HEARTS);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [endReason, setEndReason] = useState('time');   // 'time' 时间到 | 'hearts' 心用完
  const [lit, setLit] = useState(null);            // 键盘闪亮反馈
  const [best, setBest] = useState(loadBest);

  const balloonsRef = useRef([]);
  const popRef = useRef(new Set());                // pop 动画中，不参与命中/漏掉
  const idRef = useRef(0);
  const spawnAccRef = useRef(0);
  const scoreRef = useRef(0);
  const deadlineRef = useRef(0);                   // 本局截止时间戳
  const timeLeftRef = useRef(TIME_LIMIT);
  const weakRef = useRef([]);                      // 薄弱键：优先出这些字母的气球

  // 游戏主循环：倒计时 + 生成 + 上飘 + 漏掉判定
  useEffect(() => {
    if (phase !== 'play') return;
    const timer = setInterval(() => {
      // 0) 倒计时：时间到直接结算
      const left = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      if (left !== timeLeftRef.current) {
        timeLeftRef.current = left;
        setTimeLeft(left);
      }
      if (left <= 0) {
        setEndReason('time');
        setPhase('done');
        return;
      }

      // 1) 生成新气球
      spawnAccRef.current += TICK_MS;
      const gap = Math.max(SPAWN_MIN, SPAWN_BASE - scoreRef.current * 2.5);
      if (spawnAccRef.current >= gap && balloonsRef.current.length < MAX_BALLOONS) {
        spawnAccRef.current = 0;
        // 三成概率用薄弱键出题（有记录时），帮孩子多练不熟的键
        const weak = weakRef.current;
        const letter =
          weak.length && Math.random() < 0.3
            ? weak[Math.floor(Math.random() * weak.length)]
            : LETTERS[Math.floor(Math.random() * LETTERS.length)];
        const bln = {
          id: ++idRef.current,
          letter,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          x: 8 + Math.random() * 78,              // 水平位置 %
          y: 114,                                  // 从面板底部外往上飘（top% 越小越靠上）
          rise: RISE_BASE + Math.min(0.4, scoreRef.current / 900)
        };
        balloonsRef.current = [...balloonsRef.current, bln];
        setBalloons(balloonsRef.current);
      }

      // 2) 上飘 & 漏掉判定（飘出顶部算漏掉）
      const missed = [];
      balloonsRef.current = balloonsRef.current
        .map((b) => (popRef.current.has(b.id) ? b : { ...b, y: b.y - b.rise }))
        .filter((b) => {
          if (b.y <= 0) {
            missed.push(b);
            return false;
          }
          return true;
        });
      setBalloons(balloonsRef.current);

      if (missed.length) {
        missed.forEach((b) => {
          recordKeyHit(b.letter, false);          // 漏掉的键记入薄弱键诊断
          popRef.current.add(b.id);
          setPopping((p) => [...p, b.id]);
          setTimeout(() => setPopping((p) => p.filter((i) => i !== b.id)), 300);
        });
        setCombo(0);
        setHearts((h) => {
          const left = h - missed.length;
          if (left <= 0) {
            setEndReason('hearts');
            setPhase('done');
          }
          return Math.max(0, left);
        });
        sfx.wrong();
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [phase]);

  const start = () => {
    recordActivity();
    weakRef.current = getWeakKeys().map((w) => w.letter);
    balloonsRef.current = [];
    popRef.current = new Set();
    spawnAccRef.current = 0;
    scoreRef.current = 0;
    deadlineRef.current = Date.now() + TIME_LIMIT * 1000;
    timeLeftRef.current = TIME_LIMIT;
    setBalloons([]);
    setPopping([]);
    setScore(0);
    setCombo(0);
    setHearts(HEARTS);
    setTimeLeft(TIME_LIMIT);
    setEndReason('time');
    setPhase('play');
  };

  // 结算：记录最高分
  useEffect(() => {
    if (phase !== 'done') return;
    const s = scoreRef.current;
    if (s > (best.score || 0)) {
      const next = { ...best, score: s };
      setBest(next);
      try {
        localStorage.setItem(BEST_KEY, JSON.stringify(next));
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handleKey = (code) => {
    if (phase !== 'play') return;
    const letter = String(code).toLowerCase();
    if (!/^[a-z]$/.test(letter)) return;
    setLit(letter);
    setTimeout(() => setLit((l) => (l === letter ? null : l)), 200);

    // 命中最接近顶部的匹配气球（马上要飘走的那个）
    const target = balloonsRef.current
      .filter((b) => !popRef.current.has(b.id) && b.letter === letter)
      .sort((a, b) => a.y - b.y)[0];

    if (target) {
      popRef.current.add(target.id);
      setPopping((p) => [...p, target.id]);
      setTimeout(() => {
        setPopping((p) => p.filter((i) => i !== target.id));
        balloonsRef.current = balloonsRef.current.filter((b) => b.id !== target.id);
        setBalloons(balloonsRef.current);
      }, 300);
      recordKeyHit(letter, true);
      setCombo((c) => {
        const next = c + 1;
        setScore((s) => {
          scoreRef.current = s + 100 + (next - 1) * 10;
          return scoreRef.current;
        });
        return next;
      });
      sfx.correct();
    } else {
      setCombo(0);   // 敲错只断连击，不扣心
      sfx.wrong();
    }
  };

  usePhysicalKey(handleKey);

  /* ---------- 开始页 ---------- */
  if (phase === 'ready') {
    return (
      <div className="result-screen panel pop-in">
        <div className="result__emoji">🎈</div>
        <h2 className="result__title">字母气球雨</h2>
        <p className="result__sub">气球会从下面飘上来，快敲它身上的字母把它戳破！</p>
        <ul className="result__stats">
          <li>限时 <strong>{TIME_LIMIT}</strong> 秒，看谁戳得又多又快</li>
          <li>飘出屏幕会 <strong>漏掉扣 ❤️</strong>，3 颗心用完也会提前结束</li>
          <li>连续戳破有 <strong>连击加分</strong>，越到后面气球飘得越快</li>
          {best.score > 0 && (
            <li>
              历史最佳 <strong>{best.score}</strong> 分
            </li>
          )}
        </ul>
        <div className="result__btns">
          <button className="btn btn--primary" onClick={(e) => { e.currentTarget.blur(); start(); }}>
            🚀 开始游戏
          </button>
        </div>
      </div>
    );
  }

  /* ---------- 结算页 ---------- */
  if (phase === 'done') {
    const isBest = score >= (best.score || 0) && score > 0;
    return (
      <div className="result-screen panel pop-in">
        <div className="confetti" aria-hidden="true">
          {['🎈', '⭐', '🎉', '✨'].map((e, i) => (
            <span key={i} style={{ left: `${15 + i * 22}%`, animationDelay: `${i * 0.3}s` }}>
              {e}
            </span>
          ))}
        </div>
        <div className="result__emoji">{isBest ? '🏆' : endReason === 'hearts' ? '💔' : '🎈'}</div>
        <h2 className="result__title">
          {isBest ? '新纪录！' : endReason === 'hearts' ? '心用完啦！' : '时间到！'}
        </h2>
        <ul className="result__stats">
          <li>
            本局得分 <strong>{score}</strong>
          </li>
          <li>
            历史最佳 <strong>{best.score || score}</strong> 分
          </li>
        </ul>
        <div className="result__btns">
          <button className="btn btn--ghost" onClick={(e) => { e.currentTarget.blur(); setPhase('ready'); }}>
            🏠 返回
          </button>
          <button className="btn btn--primary" onClick={(e) => { e.currentTarget.blur(); start(); }}>
            🔄 再来一局
          </button>
        </div>
      </div>
    );
  }

  /* ---------- 游戏中 ---------- */
  return (
    <div className="balloon-game">
      <div className="hud">
        <span className="hud__pill" data-urgent={timeLeft <= 10 ? 'y' : 'n'}>
          ⏰ {timeLeft} 秒
        </span>
        <span className="hud__pill">{'❤️'.repeat(hearts) || '💔'}</span>
        <span className="hud__pill">得分 {score}</span>
        {combo >= 2 && <span className="hud__pill hud__pill--hot">🔥 连击 ×{combo}</span>}
      </div>

      <div className="balloon-air">
        {balloons.map((b) => (
          <div
            key={b.id}
            className={`bln bln--${b.color}${popping.includes(b.id) ? ' bln--pop' : ''}`}
            style={{ left: `${b.x}%`, top: `${b.y}%` }}
          >
            <span className="bln__letter">{b.letter.toUpperCase()}</span>
          </div>
        ))}
        {balloons.length === 0 && (
          <p className="balloon-air__tip">气球马上就来，准备好手指！👆</p>
        )}
      </div>

      <Keyboard lit={lit} showFinger />
    </div>
  );
}
