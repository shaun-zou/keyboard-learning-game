import { useRef, useState } from 'react';
import { LETTERS } from '../data/keyboard.js';
import Keyboard from '../components/Keyboard.jsx';
import { usePhysicalKey } from '../hooks/useKeys.js';
import { playFreq } from '../audio.js';

// 键盘音乐盒：把 26 个字母键当成钢琴键，按下一个字母就弹出一个音符
// 音高沿 C 大调音阶从低到高排列（a 最低，z 最高），超过一个八度自动升八度

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
LETTERS.slice()
  .sort()
  .forEach((ch, i) => {
    LETTER_NOTE[ch] = noteOf(i);
  });

let bubbleId = 1;

export default function Music() {
  // 飘出的音符气泡 { id, letter, name }
  const [bubbles, setBubbles] = useState([]);
  const timerRef = useRef(null);

  const play = (raw) => {
    const code = typeof raw === 'string' ? raw.toLowerCase() : raw;
    const note = LETTER_NOTE[code];
    if (!note) return;
    playFreq(note.freq, 0.5);
    const id = bubbleId++;
    setBubbles((list) => [...list.slice(-7), { id, letter: code, name: note.name }]);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setBubbles((list) => list.filter((b) => b.id !== id));
    }, 950);
  };

  usePhysicalKey(play);

  return (
    <div className="music-screen">
      <h2 className="screen-title">🎵 键盘音乐盒</h2>
      <p className="screen-subtitle">把键盘当钢琴弹！字母越靠后（A→Z），声音越高哦</p>

      <div className="music-stage panel">
        <div className="music-bubbles" aria-hidden="true">
          {bubbles.map((b) => (
            <span key={b.id} className="music-bubble pop-in" style={{ left: `${8 + (b.letter.charCodeAt(0) - 97) * 3.4}%` }}>
              ♪ {b.name}
            </span>
          ))}
        </div>
        <p className="music-hint">
          试试按 <strong>a s d f</strong> 弹一句哆来咪发 ☁️ 用鼠标点键盘也可以
        </p>
      </div>

      <section className="panel music-kb">
        <Keyboard clickable onKey={play} />
      </section>
    </div>
  );
}
