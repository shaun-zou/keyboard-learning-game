import { useEffect, useRef, useState } from 'react';
import { ABC_SONG } from '../data/keyboard.js';
import Keyboard from '../components/Keyboard.jsx';
import { usePhysicalKey } from '../hooks/useKeys.js';
import { sfx, playNote } from '../audio.js';

// 字母表顺序（注意：data 里的 LETTERS 是键盘排键顺序，这里必须用 A→Z）
const ABC_ORDER = 'abcdefghijklmnopqrstuvwxyz'.split('');

// 找键位闯关 · 第 5 关：字母歌大合唱
// 按 A→Z 顺序输入，每按对一个奏响字母歌的一个音符；
// 按错键或停顿超过 2 秒即失败，必须从 A 重新开始；
// 26 个字母零差错 + 收尾句演奏完成 = 通关。
export default function AbcSong({ level, levelIdx, onQuit, onFinish }) {
  // ready(开始前说明) | play(弹奏中) | fail(失败重来) | finishing(收尾句自动演奏)
  const [phase, setPhase] = useState('ready');
  const [pos, setPos] = useState(0); // 已正确按下的字母数（0~26）
  const [attempts, setAttempts] = useState(1);
  const [failInfo, setFailInfo] = useState(null); // { type: 'wrong'|'timeout', key }
  const [flash, setFlash] = useState(null);

  const inputTimer = useRef(null);
  const codaTimers = useRef([]);

  const clearAllTimers = () => {
    clearTimeout(inputTimer.current);
    codaTimers.current.forEach(clearTimeout);
    codaTimers.current = [];
  };
  useEffect(() => () => clearAllTimers(), []);

  const beginPlay = () => {
    clearAllTimers();
    setPos(0);
    setFlash(null);
    setFailInfo(null);
    setPhase('play');
    // 开局即开始 2 秒倒计时（之后每次答对会重新计时）
    inputTimer.current = setTimeout(() => failRun({ type: 'timeout' }), ABC_SONG.timeoutMs);
  };

  const start = () => {
    setAttempts(1);
    beginPlay();
  };

  const restart = () => {
    setAttempts((a) => a + 1);
    beginPlay();
  };

  const failRun = (info) => {
    clearAllTimers();
    setFailInfo(info);
    setPhase('fail');
  };

  // 每次答对后重新计时：2 秒内没有按下下一个字母就判定失败
  const armInputTimer = () => {
    clearTimeout(inputTimer.current);
    inputTimer.current = setTimeout(() => failRun({ type: 'timeout' }), ABC_SONG.timeoutMs);
  };

  // 26 个字母唱完：自动演奏收尾句，结束后才算通关（歌曲与输入同时完成）
  const playCodaAndFinish = () => {
    clearAllTimers();
    setPhase('finishing');
    let t = 0;
    for (const n of ABC_SONG.outro) {
      t += n.dur * 1000;
      codaTimers.current.push(setTimeout(() => playNote(n.note, n.dur), t));
    }
    codaTimers.current.push(setTimeout(() => onFinish(attempts), t + 520));
  };

  const handleKey = (raw) => {
    // 开始 / 失败页支持按 Enter 或空格继续
    if (phase === 'ready') {
      if (raw === 'Enter' || raw === ' ') start();
      return;
    }
    if (phase === 'fail') {
      if (raw === 'Enter' || raw === ' ') restart();
      return;
    }
    if (phase !== 'play') return;

    const code = typeof raw === 'string' ? raw.toLowerCase() : raw;
    if (!/^[a-z]$/.test(code)) return;

    const expected = ABC_ORDER[pos];
    if (code === expected) {
      const cur = ABC_SONG.notes[pos];
      playNote(cur.note, cur.dur);
      setFlash({ code, ok: true });
      setTimeout(
        () => setFlash((f) => (f && f.code === code && f.ok ? null : f)),
        320
      );
      const nextPos = pos + 1;
      setPos(nextPos);
      if (nextPos >= ABC_ORDER.length) {
        playCodaAndFinish();
      } else {
        armInputTimer();
      }
    } else {
      sfx.wrong();
      setFlash({ code, ok: false });
      failRun({ type: 'wrong', key: code });
    }
  };

  usePhysicalKey(handleKey);

  const expected = phase === 'play' ? ABC_ORDER[pos] : null;
  const progress = Math.min(pos, 26);

  return (
    <div className="song-game">
      <div className="hud">
        <span className="hud__pill">
          {level.emoji} 第 {levelIdx + 1} 关 · {level.name}
        </span>
        <span className="hud__pill">
          唱到 {progress} / 26
        </span>
        <span className="hud__pill hud__pill--fire">🔁 第 {attempts} 次尝试</span>
      </div>

      <section className="panel song-card">
        {/* 26 个字母进度轨：A-N 第一行，O-Z 第二行 */}
        <div className="song-track">
          {ABC_ORDER.slice(0, 14).map((l, i) => {
            const cls = ['song-chip'];
            if (i < pos || phase === 'finishing') cls.push('song-chip--done');
            if (i === pos && phase === 'play') cls.push('song-chip--now');
            return (
              <span key={l} className={cls.join(' ')}>
                {l.toUpperCase()}
              </span>
            );
          })}
        </div>
        <div className="song-track">
          {ABC_ORDER.slice(14).map((l, i) => {
            const cls = ['song-chip'];
            const realIdx = 14 + i;
            if (realIdx < pos || phase === 'finishing') cls.push('song-chip--done');
            if (realIdx === pos && phase === 'play') cls.push('song-chip--now');
            return (
              <span key={l} className={cls.join(' ')}>
                {l.toUpperCase()}
              </span>
            );
          })}
        </div>

        <div className="song-stage">
          {phase === 'play' && (
            <>
              <p className="find-card__ask">按下下一个字母，唱出音符</p>
              <div key={expected} className="find-card__letter pop-in">
                {expected.toUpperCase()}
              </div>
              <p className="song-stage__tip">
                ⏱️ 要在 <strong>2 秒</strong>内按下它哦
              </p>
              {/* 2 秒倒计时条，随 pos 重新挂载重新缩短 */}
              <div className="song-timer">
                <div key={pos} className="song-timer__bar" />
              </div>
            </>
          )}

          {phase === 'finishing' && (
            <div className="song-banner pop-in">
              🎶 最后一句啦，跟着小琴一起唱完～
            </div>
          )}

          {phase === 'ready' && (
            <div className="song-overlay">
              <div className="song-overlay__emoji">🎵</div>
              <h2 className="song-overlay__title">字母歌大合唱</h2>
              <button
                className="btn btn--primary btn--lg"
                autoFocus
                onClick={(e) => {
                  e.currentTarget.blur();
                  start();
                }}
              >
                ▶️ 开始唱歌
              </button>
              <p className="song-overlay__enter">（也可以按 Enter 键开始）</p>
            </div>
          )}

          {phase === 'fail' && (
            <div className="song-overlay">
              <div className="song-overlay__emoji">🫧</div>
              <h2 className="song-overlay__title song-overlay__title--warn">
                {failInfo?.type === 'timeout'
                  ? '小歌曲停下来啦～'
                  : `哎呀，按成 ${failInfo?.key?.toUpperCase()} 啦！`}
              </h2>
              <p className="song-overlay__desc">
                没关系，我们从 <b>A</b> 再唱一遍，这一次一定行！💪
              </p>
              <button
                className="btn btn--primary btn--lg"
                autoFocus
                onClick={(e) => {
                  e.currentTarget.blur();
                  restart();
                }}
              >
                🔄 从头再来
              </button>
              <p className="song-overlay__enter">（按 Enter 也可以重来）</p>
            </div>
          )}
        </div>
      </section>

      <section className="panel find-game__kb">
        <Keyboard
          lit={expected}
          flash={flash}
          showFinger
          clickable
          onKey={handleKey}
        />
      </section>

      <button
        className="btn btn--text"
        onClick={(e) => {
          e.currentTarget.blur();
          clearAllTimers();
          onQuit();
        }}
      >
        ← 不玩了，返回选关
      </button>
    </div>
  );
}
