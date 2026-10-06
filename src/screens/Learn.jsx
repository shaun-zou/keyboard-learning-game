import { useState } from 'react';
import { FINGERS, KEY_FINGER, KEY_TIPS, LETTERS, rowNameOf } from '../data/keyboard.js';
import Keyboard from '../components/Keyboard.jsx';
import LearnFunctions from './LearnFunctions.jsx';
import { usePhysicalKey } from '../hooks/useKeys.js';
import { sfx, speakLetter, isSoundOn } from '../audio.js';
import { recordLearn, recordActivity, getLearnStats } from '../stats.js';

const STORE_KEY = 'kb_learned_v1';

function loadLearned() {
  // 优先从统一 stats 读取；兼容旧版 localStorage
  const fromStats = getLearnStats();
  if (fromStats && fromStats.learnedLetters && fromStats.learnedLetters.length) {
    return new Set(fromStats.learnedLetters);
  }
  try {
    return new Set(JSON.parse(localStorage.getItem(STORE_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

export default function Learn() {
  // select（选卡页）| letters（认识字母）| functions（其它键区介绍）
  const [view, setView] = useState('select');
  // 初始不高亮任何键：先引导放好双手，按过键之后才展示对应的键
  const [selected, setSelected] = useState(null);
  const [learned, setLearned] = useState(loadLearned);

  const select = (raw) => {
    // 字母页之外不响应字母朗读/进度记录
    if (view !== 'letters') return;
    // 物理键盘可能传入大写（Shift/CapsLock），统一转小写
    const code = typeof raw === 'string' ? raw.toLowerCase() : raw;
    if (!/^[a-z]$/.test(code)) return;
    setSelected(code);
    sfx.click();
    speakLetter(code);
    // 按任意字母都算一次活跃（同一天内自动不重复累加连击），保证重复按已认识字母也能打卡
    recordActivity();
    setLearned((prev) => {
      if (prev.has(code)) return prev;
      const next = new Set(prev);
      next.add(code);
      const arr = [...next];
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(arr));
      } catch {}
      recordLearn(arr); // 同步写入统一数据层
      return next;
    });
  };

  // 按物理键盘也能查看对应字母
  usePhysicalKey(select);

  const fingerId = KEY_FINGER[selected];
  const finger = FINGERS[fingerId];
  const pct = Math.round((learned.size / LETTERS.length) * 100);

  const resetLearned = () => {
    setLearned(new Set());
    try {
      localStorage.removeItem(STORE_KEY);
    } catch {}
    recordLearn([]);
  };

  /* ---------- 选卡页 ---------- */
  if (view === 'select') {
    return (
      <div className="select-screen">
        <h2 className="screen-title">🎹 认识键盘</h2>
        <p className="screen-subtitle">先认识 26 个字母键，再去看看数字、符号和功能键的本领！</p>
        <div className="level-grid learn-select-grid">
          <button
            className="level-card panel"
            onClick={(e) => {
              e.currentTarget.blur();
              sfx.click();
              setView('letters');
            }}
          >
            <span className="level-card__emoji">🔤</span>
            <span className="level-card__name">第 1 关 · 认识字母键</span>
            <span className="level-card__desc">
              点一点、按一按，认识 A～Z 和它们对应的小手手指
            </span>
            <span className="level-card__keys">
              已认识 {learned.size} / {LETTERS.length} 个字母
            </span>
          </button>

          <button
            className="level-card panel"
            onClick={(e) => {
              e.currentTarget.blur();
              sfx.click();
              setView('functions');
            }}
          >
            <span className="level-card__emoji">🎛️</span>
            <span className="level-card__name">第 2 关 · 其它键区介绍</span>
            <span className="level-card__desc">
              认识数字区、符号区和功能键区：Shift、回车、退格都会做什么？
            </span>
            <span className="level-card__keys">🔢 数字 · ✨ 符号 · 🎛️ 功能键</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="learn">
      {view === 'functions' ? (
        <LearnFunctions />
      ) : (
        <>
      <section className="panel learn__panel">
        {selected === null ? (
          <div className="learn__letter-box">
            <div className="learn__letter learn__letter--idle pop-in">🖐️</div>
            <div className="learn__idle-title">先把小手放好</div>
            <p className="learn__idle-text">
              左手食指放在 <b>F</b> 上，右手食指放在 <b>J</b> 上
              <br />
              （F 和 J 键上有个小凸起，摸一摸就能找到）
            </p>
          </div>
        ) : (
          <div className="learn__letter-box">
            <div key={selected} className="learn__letter pop-in">
              {selected.toUpperCase()}
            </div>
            <div className="learn__letter-lower">小写：{selected}</div>
            <button
              className="btn btn--soft"
              onClick={(e) => {
                e.currentTarget.blur();
                speakLetter(selected);
              }}
            >
              🔊 听一听它的名字
            </button>
          </div>
        )}

        <div className="learn__info">
          <h2 className="section-title">
            {selected === null ? '准备好了吗？' : '这个键在哪里？'}
          </h2>
          <ul className="info-list">
            {selected === null ? (
              <>
                <li>
                  <span className="info-list__k">第 1 步</span>
                  <span className="info-list__v">手指放回主键位 A S D F · J K L ;</span>
                </li>
                <li>
                  <span className="info-list__k">第 2 步</span>
                  <span className="info-list__v">按一个字母键，看看它是谁 ✨</span>
                </li>
              </>
            ) : (
              <>
                <li>
                  <span className="info-list__k">位置</span>
                  <span className="info-list__v">🗺️ 键盘的{rowNameOf(selected)}</span>
                </li>
                <li>
                  <span className="info-list__k">小手</span>
                  <span className="info-list__v">
                    <span className="finger-dot" style={{ background: finger.color }} />
                    {finger.hand} · {finger.name}
                  </span>
                </li>
              </>
            )}
            <li>
              <span className="info-list__k">进度</span>
              <span className="info-list__v">
                已认识 {learned.size} / {LETTERS.length} 个字母
              </span>
            </li>
          </ul>
          {selected !== null && KEY_TIPS[selected] && (
            <p className="learn__tip">💡 {KEY_TIPS[selected]}</p>
          )}
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{ width: `${pct}%` }} />
          </div>
          <button className="btn btn--ghost learn__reset" onClick={resetLearned}>
            🧹 重新记录学习进度
          </button>
        </div>
      </section>

      <section className="panel learn__kb-wrap">
        <p className="learn__hint-text">
          {selected === null
            ? '👋 手指放在下面画了虚线的“家”里，然后按键盘上的字母键试试 ✨'
            : isSoundOn()
              ? '用手指点一点下面的字母，或者直接按电脑键盘，看看会发生什么 ✨'
              : '用手指点一点下面的字母，或者直接按电脑键盘吧 ✨'}
        </p>
        <Keyboard lit={selected} showFinger clickable onKey={select} guideHome={selected === null} />

        <div className="finger-legend">
          {Object.entries(FINGERS)
            .filter(([id]) => id !== 'TH')
            .map(([id, f]) => (
              <span key={id} className="finger-legend__item">
                <span className="finger-dot" style={{ background: f.color }} />
                {f.name}
              </span>
            ))}
        </div>
      </section>
        </>
      )}

      <button
        className="btn btn--text learn__back"
        onClick={(e) => {
          e.currentTarget.blur();
          setView('select');
        }}
      >
        ← 不玩了，返回选关
      </button>
    </div>
  );
}
