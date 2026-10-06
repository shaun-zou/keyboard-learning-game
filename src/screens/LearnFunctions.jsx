import { useEffect, useState } from 'react';
import { REGIONS, KEY_REGION_OF, FUNCTION_INFO } from '../data/keyboard.js';
import Keyboard from '../components/Keyboard.jsx';
import { sfx } from '../audio.js';
import { recordActivity } from '../stats.js';

// 「认识键盘 · 功能键」页签
// 模拟键盘按四大分区着色；点击功能键查看功能介绍；不播放读音、不记录学习进度。
// 功能键区放在首位（本关重点），其后依次是数字区、符号区、字母区
const REGION_LIST = ['func', 'number', 'symbol', 'letter'].map((id) => REGIONS[id]);

export default function LearnFunctions() {
  const [activeRegion, setActiveRegion] = useState(null); // null = 四区总览
  const [funcKey, setFuncKey] = useState(null);

  // 物理按下功能键也能查看介绍（Tab/空格需阻止默认行为）
  useEffect(() => {
    const onDown = (e) => {
      let code = null;
      // Ctrl / Alt 单独按时识别（组合键不处理，避免打扰系统快捷键）
      if (e.key === 'Control') code = 'ControlLeft';
      else if (e.key === 'Alt') code = 'AltLeft';
      else if (e.metaKey || e.ctrlKey || e.altKey) return;
      else if (e.key === 'Shift') code = 'ShiftLeft';
      else if (['CapsLock', 'Backspace', 'Tab', 'Enter', ' '].includes(e.key)) {
        code = e.key;
      }
      if (!code) return;
      if (code === 'Tab' || code === ' ') e.preventDefault();
      if (e.repeat) return;
      recordActivity();
      setActiveRegion('func');
      setFuncKey(code);
      sfx.click();
    };
    window.addEventListener('keydown', onDown);
    return () => window.removeEventListener('keydown', onDown);
  }, []);

  const handleKeyClick = (code) => {
    const r = KEY_REGION_OF[code];
    if (!r) return;
    recordActivity();
    sfx.click();
    if (r === 'func') {
      setActiveRegion('func');
      setFuncKey(code);
    } else {
      setActiveRegion(r);
      setFuncKey(null);
    }
  };

  const pickRegion = (id) => {
    sfx.click();
    setActiveRegion((cur) => (cur === id ? null : id));
    setFuncKey(null);
  };

  const info = funcKey ? FUNCTION_INFO[funcKey] : null;
  const region = activeRegion ? REGIONS[activeRegion] : null;

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
                <p className="learn-func__example">👆 点一点键盘上橙色的键吧！</p>
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
          <h2 className="section-title">分区小地图</h2>
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
              ? '功能键区的键都可以点，每个键都有自己的小本领！'
              : '橙色的功能键最特别：它们不打字，专门帮我们换行、擦掉、变大写……'}
          </p>
        </div>
      </section>

      <section className="panel learn__kb-wrap">
        <p className="learn__hint-text">
          🎨 同一个颜色的键住在同一个区，点一点橙色的功能键，认识它们的本领
        </p>
        <Keyboard
          regionMode
          activeRegion={activeRegion}
          activeFuncKey={funcKey}
          onFuncKey={handleKeyClick}
        />
      </section>
    </>
  );
}
