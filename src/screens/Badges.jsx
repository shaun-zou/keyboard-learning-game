import { LETTERS, FUNCTION_KEYS, FIND_LEVELS, TYPE_LESSONS } from '../data/keyboard.js';
import {
  getStats,
  getStreakInfo,
  getTotalStars,
  getFnKeysLearned,
  getSpeedStats
} from '../stats.js';

// 成就徽章墙：根据本地闯关数据自动点亮徽章（纯前端计算，无需存储）

const BADGES = [
  { id: 'first-day', emoji: '🌟', name: '初次打卡', desc: '第一次来到键盘小达人', test: (s) => s.playDates.length >= 1 },
  { id: 'learn-10', emoji: '🔤', name: '字母小伙伴', desc: '认识 10 个字母键', test: (s) => (s.learn.learnedCount || 0) >= 10 },
  { id: 'learn-all', emoji: '🅰️', name: '字母全明星', desc: '26 个字母全都认识', test: (s) => (s.learn.learnedCount || 0) >= LETTERS.length },
  { id: 'fn-all', emoji: '🎛️', name: '功能键大师', desc: '8 个功能键都打卡过', test: (s, fnCount) => fnCount >= FUNCTION_KEYS.length },
  { id: 'first-pass', emoji: '🎖️', name: '首战告捷', desc: '通过第 1 个闯关关卡', test: (s) => Object.values(s.findKey).some((v) => v && v.completed) },
  { id: 'combo-10', emoji: '🔥', name: '连击达人', desc: '找键位连击达到 10', test: (s) => Object.values(s.findKey).some((v) => v && (v.bestCombo || 0) >= 10) },
  { id: 'find-all', emoji: '🗺️', name: '找键位满贯', desc: '找键位关卡全部通关', test: (s) => Object.values(s.findKey).filter((v) => v && v.completed).length >= FIND_LEVELS.length },
  { id: 'shooter-ace', emoji: '🚀', name: '太空神射手', desc: '星球大战命中率 100%', test: (s) => Object.values(s.findKey).some((v) => v && v.bestAccuracy === 100) },
  { id: 'type-all', emoji: '⌨️', name: '打字全课程', desc: '打字课程全部完成', test: (s) => Object.values(s.typing).filter((v) => v && v.completed).length >= TYPE_LESSONS.length },
  { id: 'stars-20', emoji: '⭐', name: '星星收藏家', desc: '累计获得 20 颗星星', test: () => getTotalStars() >= 20 },
  { id: 'streak-7', emoji: '📅', name: '坚持一周', desc: '连续打卡 7 天', test: (s) => s.bestStreak >= 7 },
  { id: 'days-30', emoji: '🏆', name: '月度常客', desc: '累计练习 30 天', test: (s) => s.playDates.length >= 30 },
  { id: 'speed-60', emoji: '🏎️', name: '手速爆发', desc: '测速达到 60 字母/分钟', test: () => getSpeedStats().bestKpm >= 60 },
  {
    id: 'graduate',
    emoji: '🎓',
    name: '打字小达人',
    desc: '闯完全部关卡，从键键毕业',
    test: (s) => {
      const totalLevels = 2 + FIND_LEVELS.length + TYPE_LESSONS.length;
      const done =
        (s.learn.learnedCount || 0) >= LETTERS.length ? 1 : 0;
      const fn = new Set(getFnKeysLearned()).size >= FUNCTION_KEYS.length ? 1 : 0;
      const find = Object.values(s.findKey).filter((v) => v && v.completed).length;
      const type = Object.values(s.typing).filter((v) => v && v.completed).length;
      return done + fn + find + type >= totalLevels;
    }
  }
];

export default function Badges() {
  const stats = getStats();
  const streak = getStreakInfo();
  const fnCount = new Set(getFnKeysLearned()).size;
  const unlockedCount = BADGES.filter((b) => b.test(stats, fnCount)).length;

  return (
    <div className="select-screen">
      <h2 className="screen-title">🏅 成就徽章墙</h2>
      <p className="screen-subtitle">
        已点亮 {unlockedCount} / {BADGES.length} 枚徽章，继续收集属于你的荣誉！
      </p>
      <div className="badge-grid">
        {BADGES.map((b) => {
          const on = b.test(stats, fnCount);
          return (
            <div key={b.id} className={`badge-card panel${on ? ' badge-card--on' : ''}`}>
              <span className="badge-card__emoji">{on ? b.emoji : '🔒'}</span>
              <span className="badge-card__name">{b.name}</span>
              <span className="badge-card__desc">{b.desc}</span>
              {on && <span className="badge-card__glow" aria-hidden="true" />}
            </div>
          );
        })}
      </div>
      <p className="badge-streak">🔥 当前连续打卡 {streak.streakDays} 天 · 最长 {streak.bestStreak} 天</p>
    </div>
  );
}
