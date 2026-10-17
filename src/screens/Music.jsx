import { useEffect, useRef, useState } from 'react';
import Keyboard from '../components/Keyboard.jsx';
import { usePhysicalKey } from '../hooks/useKeys.js';
import { playFreq, sfx, playWinCheer } from '../audio.js';
import { recordKeyHit } from '../stats.js';

// 键盘音乐盒：弹字母演奏经典乐曲！
// 每个字母对应一个音高（A→Z 越来越高），把名曲翻译成字母谱，
// 孩子按顺序敲字母，就等于亲手把这首曲子弹出来——
// 敲键即出音（钢琴感）+ 乐谱推进（目标感）合成一个玩法。

const SCALE = [0, 2, 4, 5, 7, 9, 11]; // C 大调音阶（半音数）
const NOTE_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const C4 = 261.63;

// 第 i 个字母（a=0）对应的音：频率 + 音名（如 C4）
function noteOf(i) {
  const semi = Math.floor(i / 7) * 12 + SCALE[i % 7];
  const freq = C4 * Math.pow(2, semi / 12);
  return { freq, name: `${NOTE_NAMES[i % 7]}${4 + Math.floor(i / 7)}` };
}

// 字母 → 音信息映射
const LETTER_NOTE = {};
'abcdefghijklmnopqrstuvwxyz'
  .split('')
  .forEach((ch, i) => {
    LETTER_NOTE[ch] = noteOf(i);
  });

// 经典乐曲字母谱（音符按 C 大调翻译成字母：C4=a D4=b E4=c F4=d G4=e A4=f B4=g C5=h ...）
const SONGS = [
  {
    id: 'star',
    name: '小星星',
    emoji: '⭐',
    level: 1,
    notes: 'a a e e f f e d d c c b b a a a e e f f e d d c c b b a a a e e f f e d d c c b b a'
  },
  {
    id: 'tiger',
    name: '两只老虎',
    emoji: '🐯',
    level: 1,
    notes: 'a b c a a b c a c d e c d e e f e d c a e f e d c a a e a a e a'
  },
  {
    id: 'ode',
    name: '欢乐颂',
    emoji: '🎼',
    level: 2,
    notes: 'c c d e e d c b a a b c c b b c c d e e d c b a a b c b a a'
  },
  {
    id: 'birthday',
    name: '生日快乐',
    emoji: '🎂',
    level: 2,
    notes: 'e e f e h g e e f e i h e e l j h g f k k j h i h'
  }
];

const NOTE_COLORS = ['pink', 'blue', 'green', 'orange', 'purple'];
const NOTE_W = 54;   // 乐谱条上单个音符宽度
const NOTE_GAP = 10; // 音符间距
const BEST_KEY = 'music_best_v1';

function loadBest() {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) || '{}');
  } catch {
    return {};
  }
}

export default function Music() {
  // select（选曲）| play（演奏中）| done（演奏完成）
  const [phase, setPhase] = useState('select');
  const [songIdx, setSongIdx] = useState(0);
  const [pos, setPos] = useState(0);          // 当前弹到第几个音
  const [err, setErr] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lit, setLit] = useState(null);       // 键盘闪亮反馈
  const [shake, setShake] = useState(false);  // 敲错抖动
  const [stars, setStars] = useState(0);
  const [best, setBest] = useState(loadBest);

  const posRef = useRef(0);
  const errRef = useRef(0);
  const shakeTimer = useRef(null);
  const winRef = useRef(null);                // 乐谱窗口（测宽度用）
  const [winW, setWinW] = useState(1000);

  const song = SONGS[songIdx];
  const notes = song.notes.split(' ');

  // 乐谱窗口宽度变化时重新测量（滚动居中计算依赖它）
  useEffect(() => {
    if (phase !== 'play') return;
    const el = winRef.current;
    if (!el) return;
    const measure = () => setWinW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [phase]);

  useEffect(() => () => clearTimeout(shakeTimer.current), []);

  // 演奏完成结算
  useEffect(() => {
    if (phase !== 'done') return;
    const s = errRef.current === 0 ? 3 : errRef.current <= 3 ? 2 : 1;
    setStars(s);
    if (s > (best[song.id] || 0)) {
      const next = { ...best, [song.id]: s };
      setBest(next);
      try {
        localStorage.setItem(BEST_KEY, JSON.stringify(next));
      } catch {}
    }
    if (errRef.current === 0) setTimeout(() => playWinCheer(), 900);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const start = (i) => {
    setSongIdx(i);
    posRef.current = 0;
    errRef.current = 0;
    setPos(0);
    setErr(0);
    setCombo(0);
    setStars(0);
    setPhase('play');
  };

  const handleKey = (code) => {
    if (phase !== 'play') return;
    const letter = String(code).toLowerCase();
    if (!/^[a-z]$/.test(letter)) return;
    setLit(letter);
    setTimeout(() => setLit((l) => (l === letter ? null : l)), 220);

    const expected = notes[posRef.current];
    if (letter === expected) {
      // 敲对：真的弹出这个音，推进乐谱
      playFreq(LETTER_NOTE[expected].freq, 0.6);
      recordKeyHit(expected, true);
      posRef.current += 1;
      setPos(posRef.current);
      setCombo((c) => c + 1);
      if (posRef.current >= notes.length) {
        sfx.win();
        setPhase('done');
      }
    } else {
      // 敲错：抖一下提示，不断进度
      sfx.wrong();
      recordKeyHit(expected, false);
      errRef.current += 1;
      setErr(errRef.current);
      setCombo(0);
      setShake(true);
      clearTimeout(shakeTimer.current);
      shakeTimer.current = setTimeout(() => setShake(false), 420);
    }
  };

  usePhysicalKey(handleKey);

  /* ---------- 选曲页 ---------- */
  if (phase === 'select') {
    return (
      <div className="select-screen">
        <h2 className="screen-title">🎵 键盘音乐盒</h2>
        <p className="screen-subtitle">
          每个字母都是一个琴键（A→Z 音越来越高），跟着字母谱敲，就能把名曲弹出来！
        </p>
        <div className="lesson-grid">
          {SONGS.map((s, i) => (
            <button
              key={s.id}
              className="level-card panel"
              onClick={(e) => {
                e.currentTarget.blur();
                start(i);
              }}
            >
              <span className="level-card__emoji">{s.emoji}</span>
              <span className="level-card__name">{s.name}</span>
              <span className="level-card__desc">{s.notes.split(' ').length} 个音符，按字母顺序弹</span>
              <span className="level-card__stars">
                {[1, 2, 3].map((n) => (
                  <span key={n} className={n <= (best[s.id] || 0) ? 'mini-star mini-star--on' : 'mini-star'}>
                    ★
                  </span>
                ))}
                {best[s.id] ? <span className="level-card__acc">最佳 {best[s.id]} 星</span> : null}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ---------- 演奏完成 ---------- */
  if (phase === 'done') {
    return (
      <div className="result-screen panel pop-in">
        <div className="confetti" aria-hidden="true">
          {['🎵', '⭐', '✨', '🎉'].map((e, i) => (
            <span key={i} style={{ left: `${12 + i * 24}%`, animationDelay: `${i * 0.3}s` }}>
              {e}
            </span>
          ))}
        </div>
        <div className="result__emoji">{stars === 3 ? '🏆' : '🎵'}</div>
        <h2 className="result__title">演奏完成！</h2>
        <p className="result__sub">
          {song.emoji} {song.name}
        </p>
        <div className="result__stars">
          {[1, 2, 3].map((n) => (
            <span key={n} className={n <= stars ? 'star star--on' : 'star'}>
              ★
            </span>
          ))}
        </div>
        <ul className="result__stats">
          <li>
            弹了 <strong>{notes.length}</strong> 个音符 · 敲错 <strong>{err}</strong> 次
          </li>
          <li>
            {stars === 3 ? '一个都没错，完美演奏！👏' : stars === 2 ? '弹得很棒，再来一遍试试零失误！' : '加油，跟着亮起的键再弹一次！'}
          </li>
        </ul>
        <div className="result__btns">
          <button className="btn btn--ghost" onClick={(e) => { e.currentTarget.blur(); setPhase('select'); }}>
            🎼 返回选曲
          </button>
          <button className="btn btn--primary" onClick={(e) => { e.currentTarget.blur(); start(songIdx); }}>
            🔄 再弹一次
          </button>
          {songIdx + 1 < SONGS.length && (
            <button className="btn btn--green" onClick={(e) => { e.currentTarget.blur(); start(songIdx + 1); }}>
              下一首 ▸
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ---------- 演奏中 ---------- */
  // 乐谱条滚动位置：让当前音符保持在条的中线
  const offset = pos * (NOTE_W + NOTE_GAP) + NOTE_W / 2;
  return (
    <div className="music-game">
      <div className="hud">
        <span className="hud__pill">
          {song.emoji} {song.name}
        </span>
        <span className="hud__pill">
          音符 {Math.min(pos + 1, notes.length)} / {notes.length}
        </span>
        <span className="hud__pill">错误 {err}</span>
        {combo >= 5 && <span className="hud__pill hud__pill--hot">🔥 连击 ×{combo}</span>}
      </div>

      <div className="song-strip panel">
        <span className="song-strip__flag">♪</span>
        <div className="song-strip__window" ref={winRef}>
          <div
            className="song-strip__inner"
            style={{ transform: `translateX(${winW / 2 - offset}px)` }}
          >
            {notes.map((n, i) => (
              <span
                key={i}
                className={`song-note song-note--${NOTE_COLORS[i % NOTE_COLORS.length]}${
                  i < pos ? ' song-note--done' : i === pos ? ' song-note--now' : ''
                }${i === pos && shake ? ' song-note--shake' : ''}`}
              >
                {n.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Keyboard lit={lit || notes[pos]} showFinger clickable onKey={handleKey} />
    </div>
  );
}
