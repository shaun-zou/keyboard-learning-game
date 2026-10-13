import { useEffect, useRef, useState } from 'react';
import { FUNCTION_KEYS, LETTERS, FIND_LEVELS, TYPE_LESSONS } from '../data/keyboard.js';
import {
  getStreakInfo,
  getTotalStars,
  getLearnStats,
  getStats,
  getFnKeysLearned,
  getWeakKeys,
  getShopState
} from '../stats.js';
import { sfx } from '../audio.js';

// 首页（选定稿 v2-master）：键键角色 + 欢迎 + 果冻进度卡 + 三站键帽卡 + 底部真键盘
const BOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
// 总关卡数动态计算：2（认识键盘）+ 找键位关卡数 + 打字课数（以后加课自动纳入）
const TOTAL_LEVELS = 2 + FIND_LEVELS.length + TYPE_LESSONS.length;

export default function Home({ onPick }) {
  const streak = getStreakInfo();
  const totalStars = getTotalStars();
  const stats = getStats();
  const learned = new Set(getLearnStats().learnedLetters || []);
  const fnKeys = new Set(getFnKeysLearned());

  // 闯关进度：第 1 站 2 关 + 第 2 站 6 关 + 第 3 站 6 课
  const l1 = learned.size >= LETTERS.length ? 1 : 0;
  const l2 = fnKeys.size >= FUNCTION_KEYS.length ? 1 : 0;
  const findDone = Object.values(stats.findKey).filter((v) => v && v.completed).length;
  const typeDone = Object.values(stats.typing).filter((v) => v && v.completed).length;
  // 薄弱键诊断 / 已戴装扮
  const weakKeys = getWeakKeys();
  const equippedAcc = getShopState().equipped || '';

  const stations = [
    {
      id: 'learn',
      no: '第 1 站',
      title: '认识键盘',
      desc: '26 个字母键一个个交朋友，再去按一按 8 个功能键。',
      done: l1 + l2,
      total: 2,
      label: `已闯 ${l1 + l2} / 2 关`
    },
    {
      id: 'find',
      no: '第 2 站',
      title: '找键位闯关',
      desc: `看字母找按键，${FIND_LEVELS.length} 个小关卡，眼睛和手指越练越默契。`,
      done: findDone,
      total: FIND_LEVELS.length,
      label: `已闯 ${findDone} / ${FIND_LEVELS.length} 关`
    },
    {
      id: 'type',
      no: '第 3 站',
      title: '趣味练打字',
      desc: '从主键位热身到单词、拼音、短句，再到 Shift 组合挑战。',
      done: typeDone,
      total: TYPE_LESSONS.length,
      label: `已完成 ${typeDone} / ${TYPE_LESSONS.length} 课`
    }
  ];
  const totalDone = l1 + l2 + findDone + typeDone;
  const current = stations.find((s) => s.done < s.total) || stations[stations.length - 1];

  // 蛋仔彩蛋形态：闯完全部关卡 → 学士 🎓；学士基础上连续打卡 7 天 → 博士 🎉
  const graduated = totalDone >= TOTAL_LEVELS;
  const rank = graduated ? (streak.streakDays >= 7 ? 'doctor' : 'bachelor') : 'normal';

  // 游乐场区用「🎡 游乐场 / 🏆 荣誉馆」标题式标签切换：
  //  游乐场：打字测速 / 打地鼠 / 音乐盒（每日挑战入口在打字测速的模式选择页里）
  //  荣誉馆：成就徽章 / 蛋仔装扮 / 通关证书（cert 未通关时锁定）
  const [playTab, setPlayTab] = useState('games');
  const playTabs = [
    {
      id: 'games',
      label: '🎡 游乐场',
      items: [
        { id: 'speed', emoji: '🏎️', name: '打字测速', desc: '60 秒极限挑战，刷新最快纪录！' },
        { id: 'balloon', emoji: '🎈', name: '气球雨', desc: '字母气球往上飘，快敲破它们！' },
        { id: 'mole', emoji: '🐹', name: '打地鼠', desc: '敲对地鼠背上的字母，手快有奖！' },
        { id: 'music', emoji: '🎵', name: '音乐盒', desc: '把键盘当钢琴，A 到 Z 音越来越高' },
        { id: 'cashier', emoji: '🛒', name: '收银员', desc: '用数字键收银，练最上面一排键' }
      ]
    },
    {
      id: 'honors',
      label: '🏆 荣誉馆',
      items: [
        { id: 'badges', emoji: '🏅', name: '成就徽章', desc: '点亮属于你的荣誉勋章墙' },
        { id: 'shop', emoji: '🎩', name: '蛋仔装扮', desc: '用星星给键键买新装扮' },
        {
          id: 'cert',
          emoji: '🎓',
          name: '通关证书',
          desc: graduated ? '写上名字，下载属于你的证书' : `闯完 ${TOTAL_LEVELS} 关即可解锁`,
          locked: !graduated
        }
      ]
    }
  ];
  const activePlayTab = playTabs.find((t) => t.id === playTab) || playTabs[0];
  const rankLabel =
    rank === 'doctor' ? '博士蛋仔键键' : rank === 'bachelor' ? '学士蛋仔键键' : '圆蛋小角色键键，戴着粉色键帽';

  // 真键盘 → 屏幕键帽 Q 弹；Enter → CTA 按压；点键键 → 果冻晃动
  const [popKey, setPopKey] = useState(null);
  const [ctaPop, setCtaPop] = useState(false);
  const [boing, setBoing] = useState(false);
  const popTimer = useRef(null);
  const ctaTimer = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (e.repeat) return;
      if (e.key === 'Enter') {
        setCtaPop(true);
        clearTimeout(ctaTimer.current);
        ctaTimer.current = setTimeout(() => setCtaPop(false), 170);
        return;
      }
      const k = e.key === ' ' ? 'space' : e.key.toLowerCase();
      if (/^[a-z]$/.test(k) || k === 'space') pop(k);
    };
    window.addEventListener('keydown', onDown);
    return () => {
      window.removeEventListener('keydown', onDown);
      clearTimeout(popTimer.current);
      clearTimeout(ctaTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pop = (k) => {
    setPopKey(k);
    clearTimeout(popTimer.current);
    popTimer.current = setTimeout(() => setPopKey(null), 170);
    sfx.click();
  };

  const go = (id) => {
    sfx.click();
    onPick(id);
  };

  return (
    <div className="home">
      {/* Hero：键键 + 欢迎 + 果冻进度卡 */}
      <section className="home__hero">
        <div
          className={`mascot${boing ? ' mascot--boing' : ''}`}
          role="img"
          aria-label={rankLabel}
          onClick={() => setBoing(true)}
          onAnimationEnd={() => setBoing(false)}
        >
          <span className={`egg${rank !== 'normal' ? ` egg--${rank}` : ''}`}>
            {rank === 'normal' && <span className="egg__hat">K</span>}
            {rank !== 'normal' && (
              <span className={`egg__cap egg__cap--${rank}`}>
                <i />
              </span>
            )}
            <i className="egg__eye egg__eye--l" />
            <i className="egg__eye egg__eye--r" />
            <i className="egg__blush egg__blush--l" />
            <i className="egg__blush egg__blush--r" />
            <i className="egg__mouth" />
            {rank !== 'normal' && <span className={`egg__gown egg__gown--${rank}`} />}
            {equippedAcc && <span className={`egg__acc egg__acc--${equippedAcc}`} aria-hidden="true" />}
          </span>
        </div>

        <div className="hero-copy">
          <h1>
            你好呀，<em>小键盘手</em>！
          </h1>
          <p className="hero-sub">跟着键键认识 26 个字母键，一关一关 Q 弹到打字小达人！</p>
          <button className={`cta${ctaPop ? ' cta--pressed' : ''}`} onClick={() => go(current.id)}>
            开始闯关<span className="cta__tip">按 Enter 也行</span>
          </button>
        </div>

        <aside className="jelly-card" aria-label="闯关进度">
          <div className="jelly-head">
            <span className="jelly-title">闯关进度</span>
            <span className="jelly-num">
              已闯 {totalDone}
              <em> / {TOTAL_LEVELS} 关</em>
            </span>
          </div>
          <div className="jelly-track">
            <div className="jelly-fill" style={{ width: `${(totalDone / TOTAL_LEVELS) * 100}%` }}>
              <span className="jelly-rider" />
            </div>
          </div>
          <div className="jelly-chips">
            <span className="chip">🔥 连续打卡 {streak.streakDays} 天</span>
            <span className="chip">⭐ 星星 ×{totalStars}</span>
          </div>
          <p className={`jelly-egg-tip${rank !== 'normal' ? ' jelly-egg-tip--on' : ''}`}>
            {rank === 'doctor'
              ? '🎉 键键戴上博士帽啦，你是最棒的小键盘手！'
              : rank === 'bachelor'
                ? '🎓 学士键键诞生！再连续打卡 7 天，升级博士蛋仔！'
                : `🥚 小彩蛋：闯完 ${TOTAL_LEVELS} 关，键键变身学士蛋仔；再连续打卡 7 天，升博士！`}
          </p>
        </aside>
      </section>

      {/* 三站键帽卡 */}
      <section className="stations">
        {stations.map((s, i) => (
          <button
            key={s.id}
            className={`station station--s${i + 1}`}
            aria-label={`${s.no} ${s.title}，${s.label}`}
            onClick={() => go(s.id)}
          >
            {current.id === s.id && <span className="station__now">正在闯 →</span>}
            <span className="station__ghost" aria-hidden="true">
              {i + 1}
            </span>
            <span className="station__tag">{s.no}</span>
            <h2>{s.title}</h2>
            <p>{s.desc}</p>
            <div className="station__progress">
              <div className="station__track">
                <i style={{ width: `${(s.done / s.total) * 100}%` }} />
              </div>
              <span>{s.label}</span>
            </div>
          </button>
        ))}
      </section>

      {/* 薄弱键诊断：有数据才显示 */}
      {weakKeys.length > 0 && (
        <section className="weak-card panel" aria-label="薄弱键诊断">
          <div className="weak-card__head">
            <h3>🔍 薄弱键诊断</h3>
            <p>这几个键最近老敲错，是时候练一练啦！</p>
          </div>
          <div className="weak-card__keys">
            {weakKeys.map((w) => (
              <span key={w.letter} className="weak-key">
                <b>{w.letter.toUpperCase()}</b>
                <i>正确率 {Math.round(w.acc * 100)}%</i>
              </span>
            ))}
            <button
              className="btn btn--soft btn--sm"
              onClick={(e) => {
                e.currentTarget.blur();
                go('find');
              }}
            >
              去练一练 ▸
            </button>
          </div>
        </section>
      )}

      {/* 游乐场：🎡 游乐场（测速/打地鼠/音乐盒）+ 🏆 荣誉馆（成就/装扮/证书） */}
      <section className="playground" aria-label="游乐场">
        <div className="playground-tabs" role="tablist" aria-label="游乐场分类">
          {playTabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={playTab === t.id}
              className={`playground-tab${playTab === t.id ? ' playground-tab--on' : ''}`}
              onClick={() => {
                sfx.click();
                setPlayTab(t.id);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="playground__grid">
          {activePlayTab.items.map((p) => (
            <button
              key={p.id}
              className={`play-card panel${p.locked ? ' play-card--locked' : ''}`}
              aria-label={`${p.name}，${p.desc}`}
              onClick={() => {
                if (!p.locked) go(p.id); // 锁定的玩法（未通关的证书）不允许进入
              }}
            >
              <span className="play-card__emoji">{p.locked ? '🔒' : p.emoji}</span>
              <span className="play-card__name">{p.name}</span>
              <span className="play-card__desc">{p.desc}</span>
              {p.badge && <span className="play-card__badge">{p.badge}</span>}
            </button>
          ))}
        </div>
      </section>

      {/* 底部真键盘：主角 */}
      <section className="board" aria-label="和真键盘一起玩">
        {BOARD_ROWS.map((row) => (
          <div className="board__row" key={row}>
            {row.split('').map((c) => (
              <span
                key={c}
                className={`kb${learned.has(c) ? ' kb--learned' : ''}${popKey === c ? ' candy-key--pressed' : ''}`}
                onClick={() => pop(c)}
              >
                {c.toUpperCase()}
              </span>
            ))}
          </div>
        ))}
        <div className="board__row2">
          <span className="board__hint">试试按一下真键盘，键帽会 Q 弹！</span>
          <span
            className={`board__space${popKey === 'space' ? ' candy-key--pressed' : ''}`}
            onClick={() => pop('space')}
          >
            空格
          </span>
          <span className="board__sparkle" aria-hidden="true">
            ✨
          </span>
        </div>
      </section>
    </div>
  );
}
