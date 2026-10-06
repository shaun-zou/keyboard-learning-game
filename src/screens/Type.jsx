import { useEffect, useRef, useState } from 'react';
import { TYPE_LESSONS, FINGERS, KEY_FINGER } from '../data/keyboard.js';
import Keyboard from '../components/Keyboard.jsx';
import { usePhysicalKey } from '../hooks/useKeys.js';
import { sfx, playWinCheer } from '../audio.js';
import { recordTyping, getTypingStats, recordActivity } from '../stats.js';

function starsOf(errors) {
  if (errors === 0) return 3;
  if (errors <= 2) return 2;
  return 1;
}

export default function TypeGame() {
  // select(选课) | play(打字中) | lineDone(一行完成) | done(课程结算)
  const [phase, setPhase] = useState('select');
  const [lessonIdx, setLessonIdx] = useState(0);
  const [lineIdx, setLineIdx] = useState(0);
  const [pos, setPos] = useState(0);
  const [errTotal, setErrTotal] = useState(0);
  const [errLine, setErrLine] = useState(0);
  const [starsTotal, setStarsTotal] = useState(0);
  const [lineStars, setLineStars] = useState(0);
  const [shakeAt, setShakeAt] = useState(-1);
  const [flash, setFlash] = useState(null);
  const shakeTimer = useRef(null);

  useEffect(() => () => clearTimeout(shakeTimer.current), []);

  const lesson = TYPE_LESSONS[lessonIdx];
  const line = lesson.lines[lineIdx];
  const chars = line.text.split('');
  const expected = chars[pos];
  // 大写字母（True/False/None）也要能找到对应手指
  const finger = expected ? FINGERS[KEY_FINGER[expected.toLowerCase()]] : null;
  const isUpper = !!expected && /[A-Z]/.test(expected);

  // 课程结算时把成绩写入本地；整课零失误（正确率 100%）再播放“你真棒”
  useEffect(() => {
    if (phase !== 'done') return;
    const totalChars = lesson.lines.reduce((n, l) => n + l.text.length, 0);
    const accuracy =
      totalChars + errTotal === 0
        ? 100
        : Math.round((totalChars / (totalChars + errTotal)) * 100);
    const avgStars = Math.round(starsTotal / lesson.lines.length);
    recordTyping(lessonIdx, { stars: avgStars, accuracy, errors: errTotal });
    if (errTotal === 0) {
      // 通关旋律（约 1 秒）之后播放中文“你真棒！”
      setTimeout(() => playWinCheer(), 1050);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const startLesson = (i) => {
    setLessonIdx(i);
    recordActivity(); // 进入课程就算今日打卡
    setLineIdx(0);
    setPos(0);
    setErrTotal(0);
    setErrLine(0);
    setStarsTotal(0);
    setFlash(null);
    setPhase('play');
  };

  const goNextLine = () => {
    setFlash(null);
    if (lineIdx + 1 >= lesson.lines.length) {
      sfx.win();
      setPhase('done');
    } else {
      setLineIdx((i) => i + 1);
      setPos(0);
      setErrLine(0);
      setPhase('play');
    }
  };

  const handleKey = (code, fromScreen = false) => {
    // 一行打完后，按回车或点按钮继续
    if (phase === 'lineDone') {
      if (code === 'Enter') goNextLine();
      return;
    }
    if (phase !== 'play') return;

    // 物理键盘要求大小写完全一致（练 Shift）；屏幕点击没有 Shift，放宽为不区分大小写
    const hit =
      code === expected ||
      (fromScreen &&
        typeof code === 'string' &&
        typeof expected === 'string' &&
        code.toLowerCase() === expected.toLowerCase());

    if (hit) {
      sfx.click();
      setFlash({ code: String(code).toLowerCase(), ok: true });
      setTimeout(
        () => setFlash((f) => (f && f.code === String(code).toLowerCase() && f.ok ? null : f)),
        220
      );

      if (pos + 1 >= chars.length) {
        // 本行完成
        sfx.correct();
        const s = starsOf(errLine);
        setLineStars(s);
        setStarsTotal((v) => v + s);
        setPhase('lineDone');
      } else {
        setPos((p) => p + 1);
      }
    } else if (/^[a-z]$/i.test(code) || code === ' ') {
      // 只对字母/空格判错，其他键不打扰小朋友
      sfx.wrong();
      setErrTotal((v) => v + 1);
      setErrLine((v) => v + 1);
      setFlash({ code: String(code).toLowerCase(), ok: false });
      setShakeAt(pos);
      clearTimeout(shakeTimer.current);
      shakeTimer.current = setTimeout(() => setShakeAt(-1), 420);
      setTimeout(
        () => setFlash((f) => (f && f.code === String(code).toLowerCase() && !f.ok ? null : f)),
        420
      );
    }
  };

  usePhysicalKey(handleKey);

  /* ---------- 选课 ---------- */
  if (phase === 'select') {
    return (
      <div className="select-screen">
        <h2 className="screen-title">⌨️ 趣味练打字</h2>
        <p className="screen-subtitle">跟着发光的按键走，一行一行慢慢打，加油！</p>
        <div className="lesson-grid">
          {TYPE_LESSONS.map((ls, i) => {
            const best = getTypingStats(i);
            return (
            <button
              key={ls.name}
              className="level-card panel"
              onClick={(e) => {
                e.currentTarget.blur();
                startLesson(i);
              }}
            >
              <span className="level-card__emoji">{ls.emoji}</span>
              <span className="level-card__name">
                第 {i + 1} 课 · {ls.name}
              </span>
              <span className="level-card__desc">{ls.desc}</span>
              <span className="level-card__keys">{ls.lines.length} 个小练习</span>
              {best && best.completed && (
                <span className="level-card__stars" title={`历史最佳：${best.stars} 星 · 正确率 ${best.bestAccuracy}%`}>
                  {[1, 2, 3].map((n) => (
                    <span key={n} className={n <= best.stars ? 'mini-star mini-star--on' : 'mini-star'}>★</span>
                  ))}
                  <span className="level-card__acc">{best.bestAccuracy}%</span>
                </span>
              )}
            </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ---------- 课程结算 ---------- */
  if (phase === 'done') {
    const totalChars = lesson.lines.reduce((n, l) => n + l.text.length, 0);
    const accuracy =
      totalChars + errTotal === 0
        ? 100
        : Math.round((totalChars / (totalChars + errTotal)) * 100);
    const avgStars = Math.round(starsTotal / lesson.lines.length);
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
        <div className="result__emoji">🎓</div>
        <h2 className="result__title">课程完成！</h2>
        <p className="result__sub">
          第 {lessonIdx + 1} 课 · {lesson.name}
        </p>
        <div className="result__stars">
          {[1, 2, 3].map((n) => (
            <span key={n} className={n <= avgStars ? 'star star--on' : 'star'}>
              ★
            </span>
          ))}
        </div>
        <ul className="result__stats">
          <li>
            获得星星 <strong>{starsTotal}</strong> ⭐（共 {lesson.lines.length * 3} 颗）
          </li>
          <li>
            正确率 <strong>{accuracy}%</strong>
          </li>
        </ul>
        <div className="result__btns">
          <button
            className="btn btn--ghost"
            onClick={(e) => {
              e.currentTarget.blur();
              setPhase('select');
            }}
          >
            🗺️ 返回选课
          </button>
          <button
            className="btn btn--primary"
            onClick={(e) => {
              e.currentTarget.blur();
              startLesson(lessonIdx);
            }}
          >
            🔄 再练一次
          </button>
          {lessonIdx + 1 < TYPE_LESSONS.length && (
            <button
              className="btn btn--green"
              onClick={(e) => {
                e.currentTarget.blur();
                startLesson(lessonIdx + 1);
              }}
            >
              下一课 ▸
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ---------- 打字练习 ---------- */
  return (
    <div className="type-game">
      <div className="hud">
        <span className="hud__pill">
          {lesson.emoji} 第 {lessonIdx + 1} 课 · {lesson.name}
        </span>
        <span className="hud__pill">
          练习 {lineIdx + 1} / {lesson.lines.length}
        </span>
        <span className="hud__pill">错误 {errTotal} 次</span>
      </div>

      <section className="panel type-card">
        <div className="type-card__top">
          {line.emoji && <span className="type-card__emoji">{line.emoji}</span>}
          {line.note && <span className="type-card__note">{line.note}</span>}
        </div>

        <div className="chips">
          {chars.map((ch, i) => {
            const cls = ['chip'];
            // lineDone 时 pos 停在最后一个字符，需要整行统一标记为完成
            if (i < pos || phase === 'lineDone') cls.push('chip--done');
            if (i === pos && phase === 'play') cls.push('chip--now');
            if (i === shakeAt) cls.push('chip--shake');
            if (ch === ' ') cls.push('chip--space');
            return (
              <span key={i} className={cls.join(' ')}>
                {ch === ' ' ? '空格' : ch}
              </span>
            );
          })}
        </div>

        {phase === 'play' ? (
          <p className="type-card__guide">
            下一个：按
            <span className="next-key">
              {expected === ' ' ? '空格键' : isUpper ? `Shift + ${expected}` : expected.toUpperCase()}
            </span>
            键
            {isUpper && <span className="shift-tip">（先按住 Shift 再按字母）</span>}
            {finger && (
              <>
                ，用
                <span className="finger-dot" style={{ background: finger.color }} />
                <strong>{finger.name}</strong>
              </>
            )}
          </p>
        ) : (
          <div className="line-done pop-in">
            <p className="line-done__text">
              完美！本轮得到 {[1, 2, 3].map((n) => (
                <span key={n} className={n <= lineStars ? 'star star--on star--sm' : 'star star--sm'}>
                  ★
                </span>
              ))}
            </p>
            <button
              className="btn btn--primary"
              onClick={(e) => {
                e.currentTarget.blur();
                goNextLine();
              }}
            >
              {lineIdx + 1 >= lesson.lines.length ? '查看成绩 🏆' : '下一行 ▸'}（按回车也行）
            </button>
          </div>
        )}
      </section>

      <section className="panel type-game__kb">
        <Keyboard
          lit={phase === 'play' && expected ? expected.toLowerCase() : null}
          flash={flash}
          showFinger
          clickable
          onKey={(k) => handleKey(k)}
        />
      </section>

      <button
        className="btn btn--text"
        onClick={(e) => {
          e.currentTarget.blur();
          setPhase('select');
        }}
      >
        ← 不练了，返回选课
      </button>
    </div>
  );
}
