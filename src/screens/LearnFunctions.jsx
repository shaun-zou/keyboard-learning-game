import { useEffect, useRef, useState } from 'react';
import { REGIONS, KEY_REGION_OF, FUNCTION_INFO, FUNCTION_KEYS } from '../data/keyboard.js';
import Keyboard from '../components/Keyboard.jsx';
import { sfx } from '../audio.js';
import {
  getFnKeysLearned,
  recordFnKeyLearned,
  resetFnKeysLearned,
  recordActivity
} from '../stats.js';

// 「认识键盘 · 第 2 关 · 其它键区」
// 用键盘四大分区 + 8 个功能键做互动介绍：孩子逐个按下 8 个功能键（真实 keydown 或鼠标点键帽），
// 每按一个记入 localStorage（kd_fn_keys），8 键全按过 = 第 2 关过关。键帽 Q 弹 + 打勾即时反馈。
const REGION_LIST = ['func', 'number', 'symbol', 'letter'].map((id) => REGIONS[id]);

// 打卡清单上的短名字（完整介绍见 FUNCTION_INFO）
const SHORT_NAME = {
  ShiftLeft: 'Shift',
  CapsLock: '大写锁定',
  ControlLeft: 'Ctrl',
  AltLeft: 'Alt',
  Enter: '回车',
  Backspace: '退格',
  Tab: 'Tab',
  ' ': '空格'
};

// 物理按键 → 功能键码（Ctrl / Alt 单独按时识别，组合键不处理，避免打扰系统快捷键）
function physToFuncKey(e) {
  if (e.key === 'Control') return 'ControlLeft';
  if (e.key === 'Alt') return 'AltLeft';
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  if (e.key === 'Shift') return 'ShiftLeft';
  if (e.key === 'CapsLock') return 'CapsLock';
  if (e.key === 'Backspace') return 'Backspace';
  if (e.key === 'Tab') return 'Tab';
  if (e.key === 'Enter') return 'Enter';
  if (e.key === ' ') return ' ';
  return null;
}

export default function LearnFunctions() {
  const [activeRegion, setActiveRegion] = useState(null); // null = 四区总览
  const [funcKey, setFuncKey] = useState(null);
  const pressedRef = useRef(new Set(getFnKeysLearned()));
  const [pressed, setPressed] = useState(() => new Set(pressedRef.current));
  const allDone = pressed.size >= FUNCTION_KEYS.length;

  // 按下一个功能键：记录打卡 + 展示介绍 + 即时反馈
  const pressKey = (rawCode) => {
    const info = FUNCTION_INFO[rawCode];
    if (!info) return;
    const code = info.code; // 规范键码（ShiftRight → ShiftLeft 等左右共用一条）
    recordActivity();
    setActiveRegion('func');
    setFuncKey(rawCode);
    if (pressedRef.current.has(code)) {
      sfx.click(); // 已经按过：只给按键反馈
      return;
    }
    const next = new Set(pressedRef.current);
    next.add(code);
    pressedRef.current = next;
    setPressed(next);
    recordFnKeyLearned(code); // 写入 kd_fn_keys
    if (next.size >= FUNCTION_KEYS.length) {
      sfx.win(); // 8 键全按过 → 第 2 关过关
    } else {
      sfx.correct();
    }
  };

  // 物理按下功能键也能打卡（Tab/空格需阻止默认行为）
  useEffect(() => {
    const onDown = (e) => {
      const code = physToFuncKey(e);
      if (!code) return;
      if (code === 'Tab' || code === ' ') e.preventDefault();
      if (e.repeat) return;
      pressKey(code);
    };
    window.addEventListener('keydown', onDown);
    return () => window.removeEventListener('keydown', onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyClick = (code) => {
    const r = KEY_REGION_OF[code];
    if (!r) return;
    if (r === 'func') {
      pressKey(code);
    } else {
      recordActivity();
      sfx.click();
      setActiveRegion(r);
      setFuncKey(null);
    }
  };

  const pickRegion = (id) => {
    sfx.click();
    setActiveRegion((cur) => (cur === id ? null : id));
    setFuncKey(null);
  };

  const resetPressed = () => {
    resetFnKeysLearned();
    pressedRef.current = new Set();
    setPressed(new Set());
  };

  const info = funcKey ? FUNCTION_INFO[funcKey] : null;
  const region = activeRegion ? REGIONS[activeRegion] : null;

  // 已打卡功能键对应的全部物理键（含左右成对的键），用于键帽打勾
  const doneRawKeys = new Set();
  for (const f of FUNCTION_KEYS) {
    if (pressed.has(f.code)) {
      doneRawKeys.add(f.code);
      for (const a of f.also || []) doneRawKeys.add(a);
    }
  }

  return (
    <>
      <section className="panel learn__panel learn-func__panel">
        <div className="learn-func__card">
          {info ? (
            <div key={info.code} className="pop-in">
              <div className="learn-func__cap">{info.emoji}</div>
              <h2 className="learn-func__name">{info.name}</h2>
              <p className="learn-func__desc">{info.desc}</p>
              <p className="learn-func__example">{info.example}</p>
            </div>
          ) : region ? (
            <div key={region.id} className="pop-in">
              <div className="learn-func__cap" style={{ background: region.color }}>
                {region.emoji}
              </div>
              <h2 className="learn-func__name">{region.name}</h2>
              <p className="learn-func__desc">{region.desc}</p>
              {region.id === 'func' && (
                <p className="learn-func__example">👆 点一点键盘上橙色的键，给它们打个勾吧！</p>
              )}
            </div>
          ) : (
            <div className="pop-in">
              <div className="learn-func__cap">🗺️</div>
              <h2 className="learn-func__name">键盘的四大区</h2>
              <p className="learn-func__desc">
                键盘上的键按本领分成了 <b>四个大区</b>。点一点右边的小标签，
                或者直接点键盘上的键，看看它们分别住在哪里！
              </p>
            </div>
          )}
        </div>

        <div className="learn__info">
          <h2 className="section-title">🎛️ 第 2 关任务 · 认识 8 个功能键</h2>
          <p className={`learn-func__task ${allDone ? 'learn-func__task--done' : ''}`}>
            {allDone
              ? '🎉 太棒了！8 个功能键都按过啦，第 2 关过关！'
              : '逐个按下（或点一点）下面键盘上的橙色功能键，每认识一个就打一个勾 ✅'}
          </p>

          <div className="fn-checklist">
            {FUNCTION_KEYS.map((f) => {
              const done = pressed.has(f.code);
              return (
                <span key={f.code} className={`fn-chip${done ? ' fn-chip--done' : ''}`}>
                  <span className="fn-chip__emoji">{f.emoji}</span>
                  {SHORT_NAME[f.code] || f.name}
                  {done && <span className="fn-chip__check">✓</span>}
                </span>
              );
            })}
          </div>

          <div className="progress-bar">
            <div
              className="progress-bar__fill"
              style={{ width: `${(pressed.size / FUNCTION_KEYS.length) * 100}%` }}
            />
          </div>
          <p className="learn-func__count">
            已认识 <strong>{pressed.size}</strong> / {FUNCTION_KEYS.length} 个功能键
          </p>

          <h2 className="section-title learn-func__map-title">分区小地图</h2>
          <div className="region-chips">
            {REGION_LIST.map((r) => (
              <button
                key={r.id}
                className={`region-chip${activeRegion === r.id ? ' region-chip--on' : ''}`}
                style={{
                  '--rc': r.color,
                  borderColor: activeRegion === r.id ? r.color : undefined
                }}
                onClick={(e) => {
                  e.currentTarget.blur();
                  pickRegion(r.id);
                }}
              >
                <span className="region-dot" style={{ background: r.color }} />
                {r.emoji} {r.name}
              </button>
            ))}
          </div>
          <p className="learn__tip">
            💡 {activeRegion === 'func'
              ? '功能键区的键都可以按，每个键都有自己的小本领！'
              : '橙色的功能键最特别：它们不打字，专门帮我们换行、擦掉、变大写……'}
          </p>
          {pressed.size > 0 && !allDone && (
            <button className="btn btn--ghost learn-func__reset" onClick={resetPressed}>
              🧹 重新打卡
            </button>
          )}
        </div>
      </section>

      <section className="panel learn__kb-wrap learn-func__kb">
        <p className="learn__hint-text">
          🎨 同一个颜色的键住在同一个区，按一按橙色的功能键，键帽会 Q 弹并打上勾 ✅
        </p>
        <Keyboard
          regionMode
          activeRegion={activeRegion}
          activeFuncKey={funcKey}
          doneFuncKeys={doneRawKeys}
          onFuncKey={handleKeyClick}
        />
      </section>
    </>
  );
}
