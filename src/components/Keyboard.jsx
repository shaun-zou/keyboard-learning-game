import { useEffect, useState } from 'react';
import { KEYBOARD_ROWS, KEY_FINGER, FINGERS, KEY_REGION_OF } from '../data/keyboard.js';
import { normalizeKey } from '../hooks/useKeys.js';

// 可交互屏幕键盘
// props:
//   lit        需要脉冲提示的目标键码
//   flash      答题反馈 { code, ok }
//   onKey      点击可交互按键时的回调
//   showFinger 是否显示手指配色条
//   clickable  按键是否允许点击
//   guideHome  是否显示主键位“家”的悬浮手指指引（认识键盘的初始状态）
//   regionMode 分区认识模式：按键按四大区着色，功能键可点
//   activeRegion 当前高亮的分区 id（null = 四区总览）
//   activeFuncKey 当前选中的功能键码
//   onFuncKey  分区模式下点击按键回调
const HOME_GUIDE_KEYS = new Set(['a', 's', 'd', 'f', 'j', 'k', 'l', ';']);

// 分区认识模式下，物理按键的功能键归一化
function normalizeRegionKey(e) {
  // Ctrl / Alt 单独按时（没和别的键组合）也要能识别
  if (e.key === 'Control') return 'ControlLeft';
  if (e.key === 'Alt') return 'AltLeft';
  if (e.metaKey) return null;
  const k = e.key;
  if (k === 'Shift') return 'ShiftLeft';
  if (k === 'CapsLock') return 'CapsLock';
  if (k === 'Backspace') return 'Backspace';
  if (k === 'Tab') return 'Tab';
  if (k === 'Enter') return 'Enter';
  if (k === ' ') return ' ';
  return null;
}

export default function Keyboard({
  lit = null,
  flash = null,
  onKey = null,
  showFinger = false,
  clickable = false,
  guideHome = false,
  regionMode = false,
  activeRegion = null,
  activeFuncKey = null,
  onFuncKey = null
}) {
  // 物理键盘按下时，让对应键“沉下去”
  const [down, setDown] = useState(null);

  useEffect(() => {
    const toCode = (e) => {
      const c = regionMode ? normalizeRegionKey(e) : normalizeKey(e);
      // 统一小写，兼容 'ShiftLeft'、'Backspace' 这类特殊键码
      return c ? c.toLowerCase() : null;
    };
    const onDown = (e) => {
      const code = toCode(e);
      if (code) setDown(code);
    };
    const onUp = (e) => {
      const code = toCode(e);
      if (code) setDown((d) => (d === code ? null : d));
    };
    const clear = () => setDown(null);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', clear);
    };
  }, [regionMode]);

  const isGameKey = (code) => /^[a-z]$/.test(code) || code === ' ';

  const handleClick = (k) => {
    if (regionMode) {
      if (onFuncKey) onFuncKey(k.code);
      return;
    }
    if (!clickable || !onKey || k.special || !isGameKey(k.code)) return;
    // 第二个参数标记来自屏幕点击（无 Shift，可放宽大小写匹配）
    onKey(k.code, true);
  };

  return (
    <div className={`keyboard${regionMode ? ' keyboard--regions' : ''}`} aria-label="屏幕键盘">
      {KEYBOARD_ROWS.map((row, ri) => (
        <div className="kb-row" key={ri}>
          {row.map((k) => {
            const classes = ['key'];
            if (k.special) classes.push('key--special');
            if (down === k.code.toLowerCase()) classes.push('key--down');
            if (lit === k.code) classes.push('key--lit');
            if (guideHome && HOME_GUIDE_KEYS.has(k.code)) classes.push('key--home-guide');
            if (flash && flash.code === k.code) {
              classes.push(flash.ok ? 'key--ok' : 'key--bad');
            }
            if (clickable && !k.special && isGameKey(k.code)) {
              classes.push('key--clickable');
            }

            // 分区认识模式
            const region = regionMode ? KEY_REGION_OF[k.code] : null;
            if (region) {
              classes.push('key--region', `key--rg-${region}`);
              if (activeRegion) {
                classes.push(region === activeRegion ? 'key--rg-on' : 'key--rg-dim');
              }
              if (region === 'func') classes.push('key--func-clickable');
            }
            if (regionMode && activeFuncKey) {
              const pairMap = {
                ShiftLeft: 'ShiftRight',
                ControlLeft: 'ControlRight',
                AltLeft: 'AltRight'
              };
              if (k.code === activeFuncKey || pairMap[activeFuncKey] === k.code) {
                classes.push('key--func-active');
              }
            }

            const fingerId = KEY_FINGER[k.code];

            return (
              <div
                key={k.code + ri}
                className={classes.join(' ')}
                style={{ flexGrow: k.w, flexBasis: 0 }}
                onClick={() => handleClick(k)}
              >
                <span className={k.code === ' ' ? 'key__label key__label--space' : 'key__label'}>
                  {k.label}
                </span>
                {showFinger && !regionMode && fingerId && (
                  <span
                    className="key__finger"
                    style={{ background: FINGERS[fingerId].color }}
                  />
                )}
                {guideHome && k.code === 'f' && (
                  <span className="key__guide-chip">🖐️ 左手食指</span>
                )}
                {guideHome && k.code === 'j' && (
                  <span className="key__guide-chip">🖐️ 右手食指</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
