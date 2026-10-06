// 统一的本地数据层（localStorage，纯前端、离线可用）
// 记录：连续打卡天数、各关卡/课程的最高分与星级、认识键盘进度

const STORE_KEY = 'kb_stats_v2';

const todayStr = () => new Date().toISOString().slice(0, 10);
const yesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return defaultStats();
    return { ...defaultStats(), ...raw };
  } catch {
    return defaultStats();
  }
}

function save(s) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {}
}

function defaultStats() {
  return {
    lastActiveDate: '',
    streakDays: 0,
    bestStreak: 0,
    playDates: [],
    findKey: {},   // { [levelIdx]: { stars, bestFirstTry, bestCombo, minAttempts, completed, lastPlay } }
    typing: {},    // { [lessonIdx]: { stars, bestAccuracy, leastErrors, completed, lastPlay } }
    learn: { learnedCount: 0, learnedLetters: [], lastPlay: '' }
  };
}

// 记录一次活跃：更新打卡天数、今日日期、最长连续
export function recordActivity() {
  const s = load();
  const today = todayStr();
  if (s.lastActiveDate === today) {
    // 今天已经记过一次，不重复累加连击
    return s;
  }
  if (s.lastActiveDate === yesterdayStr()) {
    s.streakDays += 1;
  } else {
    s.streakDays = 1;
  }
  s.bestStreak = Math.max(s.bestStreak, s.streakDays);
  s.lastActiveDate = today;
  if (!s.playDates.includes(today)) {
    s.playDates.push(today);
    if (s.playDates.length > 400) s.playDates = s.playDates.slice(-400);
  }
  save(s);
  return s;
}

// 找键位闯关（含字母歌、星球大战）通关后记录最佳成绩
export function recordFindKey(levelIdx, { stars, firstTry = 0, combo = 0, isSong = false, attempts = 1, isShooter = false, accuracy = 0, hits = 0 } = {}) {
  recordActivity();
  const s = load();
  const prev = s.findKey[levelIdx] || {};
  s.findKey[levelIdx] = {
    stars: Math.max(prev.stars || 0, stars),
    bestFirstTry: Math.max(prev.bestFirstTry || 0, firstTry),
    bestCombo: Math.max(prev.bestCombo || 0, combo),
    minAttempts: isSong ? Math.min(prev.minAttempts || Infinity, attempts) : prev.minAttempts,
    bestAccuracy: isShooter ? Math.max(prev.bestAccuracy || 0, accuracy) : prev.bestAccuracy,
    leastHits: isShooter ? (prev.leastHits === undefined ? hits : Math.min(prev.leastHits, hits)) : prev.leastHits,
    completed: true,
    lastPlay: todayStr()
  };
  save(s);
  return s;
}

// 打字课程结算后记录最佳成绩
export function recordTyping(lessonIdx, { stars, accuracy = 0, errors = 0 } = {}) {
  recordActivity();
  const s = load();
  const prev = s.typing[lessonIdx] || {};
  s.typing[lessonIdx] = {
    stars: Math.max(prev.stars || 0, stars),
    bestAccuracy: Math.max(prev.bestAccuracy || 0, accuracy),
    leastErrors: prev.leastErrors === undefined ? errors : Math.min(prev.leastErrors, errors),
    completed: true,
    lastPlay: todayStr()
  };
  save(s);
  return s;
}

// 认识键盘：每认识一个字母就更新进度
export function recordLearn(learnedLetters) {
  recordActivity();
  const s = load();
  s.learn = {
    learnedCount: learnedLetters.length,
    learnedLetters,
    lastPlay: todayStr()
  };
  save(s);
  return s;
}

export function getStats() {
  return load();
}

export function getStreakInfo() {
  const s = load();
  return {
    streakDays: s.streakDays,
    bestStreak: s.bestStreak,
    totalDays: s.playDates.length,
    todayActive: s.lastActiveDate === todayStr()
  };
}

export function getFindKeyStats(levelIdx) {
  return load().findKey[levelIdx] || null;
}

export function getTypingStats(lessonIdx) {
  return load().typing[lessonIdx] || null;
}

export function getLearnStats() {
  return load().learn;
}

// 总获星数（找键位 + 打字 所有已通关关卡的最佳星级之和）
export function getTotalStars() {
  const s = load();
  const fk = Object.values(s.findKey).reduce((n, v) => n + (v.stars || 0), 0);
  const ty = Object.values(s.typing).reduce((n, v) => n + (v.stars || 0), 0);
  return fk + ty;
}

// 一键清空全部记录（家长可手动重置）
export function resetAllStats() {
  save(defaultStats());
}
