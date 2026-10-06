import { useEffect, useRef, useState } from 'react';
import { LETTERS, SHOOTER_CONFIG } from '../data/keyboard.js';
import { usePhysicalKey } from '../hooks/useKeys.js';
import { sfx } from '../audio.js';

// 找键位闯关 · 第 6 关：星球大战（像素风）
// 字母战斗机从屏幕顶部俯冲下来，按对应字母键，战机会转向敌机发射追踪激光弹，
// 飞弹碰到敌机后才爆炸；敌机砸到地面损失一条命。击落 N 架敌机通关，生命用完失败。
const TOTAL_LETTERS = SHOOTER_CONFIG.totalLetters;
const MAX_LIVES = SHOOTER_CONFIG.maxLives;

// 三档固定速度：慢 / 中 / 快（speed: 战场百分比/秒，spawnMs: 生成间隔毫秒）
const SPEED_MODES = [
  { id: 'slow', name: '慢速', emoji: '🐢', speed: 28, spawnMs: 2100 },
  { id: 'mid', name: '中速', emoji: '🚀', speed: 42, spawnMs: 1600 },
  { id: 'fast', name: '快速', emoji: '⚡', speed: 62, spawnMs: 1100 }
];

// 飞弹飞行速度（战场百分比/秒）
const MISSILE_SPEED = 300;
// 飞弹命中判定距离（战场百分比）
const HIT_DIST = 3.2;

// 玩家机炮口位置（战场百分比坐标，飞弹从这里发射）
const SHIP_POS = { x: 50, y: 90 };

/* ---------------- 像素精灵 ---------------- */

// 用 box-shadow 绘制的像素画：字符映射颜色，'.' 为透明
function PixelSprite({ map, palette, pixel = 5, className = '', style }) {
  const w = map[0].length;
  const h = map.length;
  const shadows = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = map[y][x];
      if (ch === '.' || ch === ' ') continue;
      shadows.push(`${x * pixel}px ${y * pixel}px 0 0 ${palette[ch]}`);
    }
  }
  return (
    <span
      className={`px-sprite${className ? ` ${className}` : ''}`}
      style={{ width: w * pixel, height: h * pixel, ...style }}
    >
      <i
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: pixel,
          height: pixel,
          boxShadow: shadows.join(',')
        }}
      />
    </span>
  );
}

// 玩家战斗机：机头朝上（11×12）
const SHIP_MAP = [
  '.....L.....',
  '....LLL....',
  '....LCL....',
  '...LLLLL...',
  '..LLLLLLL..',
  '.LLLLCLLLL.',
  'LLLLLLLLLLL',
  'DL.LLCLL.LD',
  '...LLLLL...',
  '...L...L...',
  '..OO...OO..',
  '..YY...YY..'
];
const SHIP_PALETTE = {
  L: '#dbeafe', // 机身浅蓝白
  C: '#22d3ee', // 座舱青色
  D: '#60a5fa', // 机翼深蓝
  O: '#f97316', // 引擎橙
  Y: '#fde047'  // 尾焰黄
};

// 敌机：机身垂直俯冲向下（11×11）
const ENEMY_MAP = [
  '..YY...YY..',
  '..OO...OO..',
  '...R.R.R...',
  '...RRRRR...',
  'RDRRRRRRRDR',
  '.DRRRWRRRD.',
  '..RRRRRRR..',
  '...RRRRR...',
  '....RRR....',
  '....DRD....',
  '.....R.....'
];
const ENEMY_PALETTE = {
  R: '#f43f5e', // 机身玫红
  D: '#9f1239', // 机翼暗红
  W: '#fecdd3', // 座舱浅粉
  O: '#f97316', // 引擎橙
  Y: '#fde047'  // 尾焰黄
};

// 激光弹：尖头朝上（3×8）
const MISSILE_MAP = ['.Y.', 'YYY', '.O.', '.O.', '.O.', '.O.', '.R.', 'RYR'];
const MISSILE_PALETTE = { Y: '#fef08a', O: '#f59e0b', R: '#ef4444' };

// 爆炸（9×9）
const BOOM_MAP = [
  '....Y....',
  '..Y.Y.Y..',
  '.Y.YOY.Y.',
  '..YOOOY..',
  'YYOOWOOYY',
  '..YOOOY..',
  '.Y.YOY.Y.',
  '..Y.Y.Y..',
  '....Y....'
];
const BOOM_PALETTE = { Y: '#fbbf24', O: '#f97316', W: '#fff7ed' };

// 炮口火光（5×5）
const FLASH_MAP = ['..Y..', '.YWY.', 'YWWWY', '.YWY.', '..Y..'];
const FLASH_PALETTE = { Y: '#fbbf24', W: '#fff7ed' };

// 像素爱心（7×6）
const HEART_MAP = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];

let nextId = 1;

function makeEnemy(speed) {
  return {
    id: nextId++,
    letter: LETTERS[Math.floor(Math.random() * LETTERS.length)],
    // 横向位置 8%~88%，避免贴边
    x: 8 + Math.random() * 80,
    y: -8,
    speed,
    locked: false // 已被飞弹锁定（不能重复选目标），但仍继续下落
  };
}

export default function Shooter({ level, levelIdx, onQuit, onFinish }) {
  // ready | play | over(失败) | done(通关)
  const [phase, setPhase] = useState('ready');
  const [speedMode, setSpeedMode] = useState('mid');
  const [enemies, setEnemies] = useState([]);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0); // 被击（敌机砸地）次数
  const [shots, setShots] = useState(0); // 总按键次数
  const [correctShots, setCorrectShots] = useState(0); // 正确按键次数
  const [lives, setLives] = useState(MAX_LIVES);
  const [spawned, setSpawned] = useState(0); // 已生成的敌机数
  const [destroyed, setDestroyed] = useState(0); // 已击落数
  const [explosions, setExplosions] = useState([]); // 爆炸特效 {id, x, y}
  const [missiles, setMissiles] = useState([]); // 激光弹 {id, x, y, deg, targetId}
  // 战机朝向（度，0 = 机头朝上，顺时针为正）与炮口火光
  const [shipDeg, setShipDeg] = useState(0);
  const [muzzle, setMuzzle] = useState(false);

  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);
  const spawnTimerRef = useRef(null);
  const phaseRef = useRef('ready');
  const enemiesRef = useRef([]);
  const missilesRef = useRef([]);
  const spawnedRef = useRef(0);
  const speedModeRef = useRef('mid');
  // 在飞激光弹数量：归零后战机恢复朝上
  const flyingRef = useRef(0);
  const muzzleTimerRef = useRef(null);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { spawnedRef.current = spawned; }, [spawned]);

  const clearAll = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(rafRef.current); // 兼容 setTimeout 回退调度的 id
    }
    if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
    if (muzzleTimerRef.current) clearTimeout(muzzleTimerRef.current);
  };
  useEffect(() => () => clearAll(), []);

  const start = () => {
    clearAll();
    enemiesRef.current = [];
    missilesRef.current = [];
    setEnemies([]);
    setMissiles([]);
    setScore(0);
    setHits(0);
    setShots(0);
    setCorrectShots(0);
    setLives(MAX_LIVES);
    setSpawned(0);
    setDestroyed(0);
    setExplosions([]);
    setShipDeg(0);
    setMuzzle(false);
    spawnedRef.current = 0;
    flyingRef.current = 0;
    speedModeRef.current = speedMode;
    lastTimeRef.current = 0;
    setPhase('play');
  };

  const addExplosion = (x, y) => {
    const id = nextId++;
    setExplosions((list) => [...list, { id, x, y }]);
    setTimeout(() => {
      setExplosions((list) => list.filter((e) => e.id !== id));
    }, 360);
  };

  // 敌机落地：损失一条命（在 setEnemies 外统一处理，避免重复调用 setState）
  const applyHits = (count) => {
    if (count <= 0) return;
    sfx.hit();
    setHits((h) => h + count);
    setLives((l) => {
      const nl = Math.max(0, l - count);
      if (nl <= 0) {
        clearAll();
        setPhase('over');
      }
      return nl;
    });
  };

  // 通关判定：所有敌机生成完毕且场上已清空
  const checkWin = () => {
    if (spawnedRef.current >= TOTAL_LETTERS && enemiesRef.current.length === 0) {
      clearAll();
      setPhase('done');
    }
  };

  // 主循环：敌机下落 + 激光弹追踪
  // 标签页可见时用 requestAnimationFrame（顺滑省电）；
  // 标签页隐藏/被节流 rAF 不触发时，回退到 setTimeout，保证游戏仍按真实时间推进
  useEffect(() => {
    if (phase !== 'play') return;
    let pending = false; // 防止 rAF/setTimeout 双链路重复调度
    const kick = (t) => {
      pending = false;
      loop(typeof t === 'number' ? t : performance.now());
    };
    const schedule = () => {
      if (pending || phaseRef.current !== 'play') return;
      pending = true;
      if (typeof document !== 'undefined' && document.hidden) {
        rafRef.current = setTimeout(kick, 100);
      } else {
        rafRef.current = requestAnimationFrame(kick);
      }
    };
    // 标签页重新可见时立刻唤醒（隐藏期间挂起的 rAF 不会触发）
    const onVisible = () => {
      if (!document.hidden) schedule();
    };
    document.addEventListener('visibilitychange', onVisible);
    const loop = (t) => {
      if (phaseRef.current !== 'play') return;
      const last = lastTimeRef.current || t;
      const dt = Math.min((t - last) / 1000, 0.05); // 限制单帧步长，切后台不会穿模
      lastTimeRef.current = t;

      /* —— 敌机下落（被锁定的也继续飞，不会停下） —— */
      let hitCount = 0;
      const alive = [];
      for (const e of enemiesRef.current) {
        const ny = e.y + e.speed * dt;
        if (ny >= 100) {
          hitCount += 1;
        } else {
          alive.push({ ...e, y: ny });
        }
      }

      /* —— 激光弹追踪当前目标位置，碰到才爆炸 —— */
      const impactAt = []; // {x, y, enemyId}
      const killedIds = new Set();
      const remainingMissiles = [];
      for (const m of missilesRef.current) {
        const target = alive.find((e) => e.id === m.targetId);
        if (!target) {
          // 目标已落地消失：激光弹作废
          flyingRef.current -= 1;
          continue;
        }
        const dx = target.x - m.x;
        const dy = target.y - m.y;
        const dist = Math.hypot(dx, dy);
        const step = MISSILE_SPEED * dt;
        m.deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
        if (dist <= Math.max(HIT_DIST, step * 1.1)) {
          // 命中：在敌机当前位置爆炸
          impactAt.push({ x: target.x, y: target.y, enemyId: target.id });
          killedIds.add(target.id);
          flyingRef.current -= 1;
        } else {
          m.x += (dx / dist) * step;
          m.y += (dy / dist) * step;
          remainingMissiles.push(m);
        }
      }

      let changed = false;
      if (hitCount > 0 || killedIds.size > 0) {
        enemiesRef.current = alive.filter((e) => !killedIds.has(e.id));
        changed = true;
      } else {
        enemiesRef.current = alive;
      }
      missilesRef.current = remainingMissiles;

      setEnemies(enemiesRef.current);
      setMissiles(missilesRef.current.map((m) => ({ ...m })));
      if (hitCount > 0) applyHits(hitCount);

      if (impactAt.length > 0) {
        sfx.boom();
        setScore((s) => s + 10 * impactAt.length);
        setDestroyed((d) => d + impactAt.length);
        for (const p of impactAt) addExplosion(p.x, p.y);
      }
      if (flyingRef.current <= 0) {
        flyingRef.current = 0;
        setShipDeg(0);
      }

      if (changed && killedIds.size > 0) setTimeout(checkWin, 0);

      schedule();
    };
    schedule();
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        clearTimeout(rafRef.current);
      }
    };
  }, [phase]);

  // 生成敌机：固定速度、固定间隔（速度档位在开局时锁定）
  useEffect(() => {
    if (phase !== 'play') return;
    const mode = SPEED_MODES.find((m) => m.id === speedModeRef.current) || SPEED_MODES[1];
    const schedule = () => {
      if (phaseRef.current !== 'play') return;
      if (spawnedRef.current >= TOTAL_LETTERS) {
        checkWin();
        return;
      }
      const enemy = makeEnemy(mode.speed);
      // 直接更新 ref，确保 RAF 循环立刻能读到新敌人
      enemiesRef.current = [...enemiesRef.current, enemy];
      setEnemies(enemiesRef.current);
      setSpawned((s) => s + 1);
      spawnedRef.current += 1;
      spawnTimerRef.current = setTimeout(schedule, mode.spawnMs);
    };
    spawnTimerRef.current = setTimeout(schedule, 600);
    return () => {
      if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
    };
  }, [phase]);

  // 通关回调（在 done 时触发一次）
  useEffect(() => {
    if (phase !== 'done') return;
    const acc = shots === 0 ? 100 : Math.round((correctShots / shots) * 100);
    onFinish({ score, hits, accuracy: acc });
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKey = (raw) => {
    if (phase === 'ready' || phase === 'over') {
      if (raw === 'Enter' || raw === ' ') start();
      return;
    }
    if (phase !== 'play') return;
    const code = typeof raw === 'string' ? raw.toLowerCase() : raw;
    if (!/^[a-z]$/.test(code)) return;

    // 锁定最低的（y 最大的）同字母敌机；已被锁定的不再作为目标
    let target = null;
    for (const e of enemiesRef.current) {
      if (e.locked) continue;
      if (e.letter === code && (!target || e.y > target.y)) target = e;
    }
    if (target) {
      // 1) 激光炮音效 2) 战机转向目标 3) 炮口发光 4) 弹出追踪激光弹
      sfx.shoot();
      setShots((s) => s + 1);
      setCorrectShots((c) => c + 1);
      target.locked = true;
      enemiesRef.current = enemiesRef.current.map((e) =>
        e.id === target.id ? { ...e, locked: true } : e
      );
      setEnemies(enemiesRef.current);

      const dx = target.x - SHIP_POS.x;
      const dy = target.y - SHIP_POS.y;
      const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
      setShipDeg(deg);
      setMuzzle(true);
      if (muzzleTimerRef.current) clearTimeout(muzzleTimerRef.current);
      muzzleTimerRef.current = setTimeout(() => setMuzzle(false), 150);

      const missile = { id: nextId++, x: SHIP_POS.x, y: SHIP_POS.y, deg, targetId: target.id };
      missilesRef.current = [...missilesRef.current, missile];
      setMissiles((list) => [...list, { ...missile }]);
      flyingRef.current += 1;
    } else {
      // 空枪：轻微提示，不扣命
      setShots((s) => s + 1);
      sfx.wrong();
    }
  };

  usePhysicalKey(handleKey);

  const accuracy = shots === 0 ? 100 : Math.round((correctShots / shots) * 100);
  const progress = Math.min(destroyed, TOTAL_LETTERS);
  const modeMeta = SPEED_MODES.find((m) => m.id === speedMode) || SPEED_MODES[1];

  return (
    <div className="shooter-game">
      <div className="hud">
        <span className="hud__pill">
          {level.emoji} 第 {levelIdx + 1} 关 · {level.name}
        </span>
        <span className="hud__pill">
          {modeMeta.emoji} {modeMeta.name}
        </span>
        <span className="hud__pill">🎯 击落 {progress} / {TOTAL_LETTERS}</span>
        <span className="hud__pill">💥 被击 {hits} 次</span>
        <span className="hud__pill">🎯 命中率 {accuracy}%</span>
        <span className="hud__pill hud__pill--fire">
          {[0, 1, 2].map((i) => (
            <PixelSprite
              key={i}
              className="hud__heart"
              map={HEART_MAP}
              palette={{ X: i < lives ? '#f43f5e' : '#475569' }}
              pixel={3}
            />
          ))}
        </span>
      </div>

      <section className="panel shooter-stage">
        {/* 战场 */}
        <div className="shooter-field">
          {enemies.map((e) => (
            <div
              key={e.id}
              className={`shooter-enemy${e.locked ? ' shooter-enemy--locked' : ''}`}
              style={{ left: `${e.x}%`, top: `${e.y}%` }}
            >
              <PixelSprite map={ENEMY_MAP} palette={ENEMY_PALETTE} pixel={5} />
              <span className="shooter-enemy__letter">{e.letter.toUpperCase()}</span>
            </div>
          ))}
          {missiles.map((m) => (
            <div
              key={m.id}
              className="shooter-missile"
              style={{
                left: `${m.x}%`,
                top: `${m.y}%`,
                transform: `translate(-50%, -50%) rotate(${m.deg}deg)`
              }}
            >
              <PixelSprite map={MISSILE_MAP} palette={MISSILE_PALETTE} pixel={3} />
            </div>
          ))}
          {explosions.map((ex) => (
            <div
              key={ex.id}
              className="shooter-boom"
              style={{ left: `${ex.x}%`, top: `${ex.y}%` }}
            >
              <PixelSprite map={BOOM_MAP} palette={BOOM_PALETTE} pixel={5} />
            </div>
          ))}
          {/* 地面 */}
          <div className="shooter-ground" />
          {/* 玩家战斗机：机头朝上，发射时整体转向敌机 */}
          <div className="shooter-ship">
            <div
              className="shooter-ship__rot"
              style={{ transform: `rotate(${shipDeg}deg)` }}
            >
              {muzzle && (
                <PixelSprite
                  map={FLASH_MAP}
                  palette={FLASH_PALETTE}
                  pixel={4}
                  className="shooter-ship__muzzle"
                />
              )}
              <PixelSprite map={SHIP_MAP} palette={SHIP_PALETTE} pixel={5} />
            </div>
          </div>

          {phase === 'ready' && (
            <div className="shooter-overlay">
              <div className="shooter-overlay__emoji">
                <PixelSprite map={SHIP_MAP} palette={SHIP_PALETTE} pixel={7} />
              </div>
              <h2 className="shooter-overlay__title">星球大战</h2>
              <p className="shooter-overlay__desc">
                字母战斗机从天上冲下来啦！<br />
                按下键盘上对应的字母键，激光炮会转向敌机开火！<br />
                别让敌机砸到地面，否则会损失一条命哦
              </p>
              <div className="speed-chips">
                {SPEED_MODES.map((m) => (
                  <button
                    key={m.id}
                    className={`speed-chip${speedMode === m.id ? ' speed-chip--on' : ''}`}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      setSpeedMode(m.id);
                    }}
                  >
                    {m.emoji} {m.name}
                  </button>
                ))}
              </div>
              <button
                className="btn btn--primary btn--lg"
                autoFocus
                onClick={(e) => {
                  e.currentTarget.blur();
                  start();
                }}
              >
                ▶️ 开始战斗
              </button>
              <p className="shooter-overlay__enter">（按 Enter 也可以开始）</p>
            </div>
          )}

          {phase === 'over' && (
            <div className="shooter-overlay">
              <div className="shooter-overlay__emoji">
                <PixelSprite map={BOOM_MAP} palette={BOOM_PALETTE} pixel={7} />
              </div>
              <h2 className="shooter-overlay__title shooter-overlay__title--warn">
                飞船被击落啦！
              </h2>
              <p className="shooter-overlay__desc">
                击落了 <strong>{destroyed}</strong> / {TOTAL_LETTERS} 架敌机<br />
                命中率 <strong>{accuracy}%</strong>
              </p>
              <button
                className="btn btn--primary btn--lg"
                autoFocus
                onClick={(e) => {
                  e.currentTarget.blur();
                  start();
                }}
              >
                🔄 再战一次
              </button>
              <p className="shooter-overlay__enter">（按 Enter 也可以重来）</p>
            </div>
          )}
        </div>
      </section>

      <button
        className="btn btn--text"
        onClick={(e) => {
          e.currentTarget.blur();
          clearAll();
          onQuit();
        }}
      >
        ← 不玩了，返回选关
      </button>
    </div>
  );
}
