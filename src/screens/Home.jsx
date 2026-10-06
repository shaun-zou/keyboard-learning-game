import { getStreakInfo, getTotalStars, getLearnStats } from '../stats.js';

const MODES = [
  {
    id: 'learn',
    emoji: '🎹',
    tag: '入门',
    title: '认识键盘',
    desc: '点一点、按一按，认识 26 个字母键，学习用几根手指敲它',
    cardClass: 'mode-card--pink'
  },
  {
    id: 'find',
    emoji: '🔍',
    tag: '进阶',
    title: '找键位闯关',
    desc: '看字母、找按键！四关挑战，看看谁的小眼睛最厉害',
    cardClass: 'mode-card--blue'
  },
  {
    id: 'type',
    emoji: '⌨️',
    tag: '挑战',
    title: '趣味练打字',
    desc: '从主键位到单词、拼音和短句，循序渐进成为打字小达人',
    cardClass: 'mode-card--green'
  }
];

export default function Home({ onPick }) {
  const streak = getStreakInfo();
  const totalStars = getTotalStars();
  const learn = getLearnStats();
  const learnedCount = learn.learnedCount || 0;

  return (
    <div className="home">
      {/* 左侧欢迎横幅 + 右侧成就统计（双列布局） */}
      <section className="hero-row">
        <div className="hero panel">
          <div className="hero__emoji" aria-hidden="true">⌨️</div>
          <h2 className="hero__title">欢迎来到键盘小达人！</h2>
          <p className="hero__text">
            这里有好多好玩的键盘游戏，跟着小手提示一起认识键盘、找到键位、练习打字吧！
          </p>
        </div>

        <aside className="stats-bar panel">
          <div className={`stats-chip ${streak.todayActive ? 'stats-chip--done' : ''}`}>
            <span className="stats-chip__emoji">{streak.todayActive ? '✅' : '📅'}</span>
            <span className="stats-chip__num">{streak.streakDays}</span>
            <span className="stats-chip__label">天连续打卡</span>
          </div>
          <div className="stats-chip">
            <span className="stats-chip__emoji">⭐</span>
            <span className="stats-chip__num">{totalStars}</span>
            <span className="stats-chip__label">颗星星</span>
          </div>
          <div className="stats-chip">
            <span className="stats-chip__emoji">🔤</span>
            <span className="stats-chip__num">{learnedCount}</span>
            <span className="stats-chip__label">/ 26 个字母</span>
          </div>
          {streak.bestStreak > streak.streakDays && (
            <div className="stats-chip stats-chip--muted">
              <span className="stats-chip__emoji">🏆</span>
              <span className="stats-chip__num">{streak.bestStreak}</span>
              <span className="stats-chip__label">最长连续</span>
            </div>
          )}
        </aside>
      </section>

      <section className="mode-grid">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`mode-card panel ${m.cardClass}`}
            onClick={(e) => {
              e.currentTarget.blur();
              onPick(m.id);
            }}
          >
            <span className="mode-card__tag">{m.tag}</span>
            <span className="mode-card__emoji" aria-hidden="true">
              {m.emoji}
            </span>
            <span className="mode-card__title">{m.title}</span>
            <span className="mode-card__desc">{m.desc}</span>
            <span className="mode-card__go">开始玩 ▸</span>
          </button>
        ))}
      </section>

      <p className="home__tip">💡 建议使用电脑键盘体验；在平板上也可以直接点击屏幕按键哦</p>
    </div>
  );
}
