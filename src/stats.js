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
    learn: { learnedCount: 0, learnedLetters: [], lastPlay: '' },
    speed: { bestKpm: 0, bestAccuracy: 0, plays: 0 }, // 打字测速
    daily: { date: '', done: false, bestKpm: 0 },      // 每日挑战
    keyErr: {},                                        // 薄弱键诊断 { [letter]: { total, wrong } }
    shop: { spent: 0, owned: [], equipped: '' },       // 蛋仔装扮商店
    certName: ''                                       // 通关证书名字
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

// 认识键盘 · 第 2 关：功能键按下记录（独立 key：kd_fn_keys，存规范键码数组）
const FN_KEYS_KEY = 'kd_fn_keys';

export function getFnKeysLearned() {
  try {
    const arr = JSON.parse(localStorage.getItem(FN_KEYS_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// 记录一个功能键已被按下过（code 为规范键码，如 ShiftLeft / Enter / ' '）
export function recordFnKeyLearned(code) {
  const arr = getFnKeysLearned();
  if (!arr.includes(code)) {
    arr.push(code);
    try {
      localStorage.setItem(FN_KEYS_KEY, JSON.stringify(arr));
    } catch {}
  }
  recordActivity();
  return arr;
}

export function resetFnKeysLearned() {
  try {
    localStorage.removeItem(FN_KEYS_KEY);
  } catch {}
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

/* ============================================================
   打字测速挑战
   ============================================================ */

export function getSpeedStats() {
  return load().speed;
}

export function recordSpeedTest({ kpm, accuracy }) {
  recordActivity();
  const s = load();
  s.speed = {
    bestKpm: Math.max(s.speed.bestKpm || 0, kpm),
    bestAccuracy: Math.max(s.speed.bestAccuracy || 0, accuracy),
    plays: (s.speed.plays || 0) + 1
  };
  save(s);
  return s.speed;
}

/* ============================================================
   每日挑战（30 秒内敲对目标个数，目标由日期决定）
   ============================================================ */

export function getDailyInfo(dateStr) {
  const s = load();
  const done = s.daily.date === dateStr ? !!s.daily.done : false;
  return { date: dateStr, done, bestKpm: s.daily.date === dateStr ? s.daily.bestKpm || 0 : 0 };
}

export function markDailyDone(dateStr, kpm) {
  const s = load();
  s.daily = { date: dateStr, done: true, bestKpm: Math.max(s.daily.bestKpm || 0, kpm) };
  save(s);
}

/* ============================================================
   薄弱键诊断：记录每个字母的作答次数与错误次数
   ============================================================ */

export function recordKeyHit(letter, ok) {
  const code = typeof letter === 'string' ? letter.toLowerCase() : letter;
  if (!/^[a-z]$/.test(code)) return;
  const s = load();
  const cur = s.keyErr[code] || { total: 0, wrong: 0 };
  s.keyErr[code] = { total: cur.total + 1, wrong: cur.wrong + (ok ? 0 : 1) };
  save(s);
}

// 返回最薄弱的几个字母 [{ letter, acc }]；作答不足 minTotal 次的键不参与
export function getWeakKeys({ minTotal = 5, maxKeys = 4, maxAcc = 0.85 } = {}) {
  const s = load();
  const list = [];
  for (const [letter, v] of Object.entries(s.keyErr || {})) {
    if (!v || v.total < minTotal) continue;
    const acc = (v.total - v.wrong) / v.total;
    if (acc <= maxAcc) list.push({ letter, acc });
  }
  list.sort((a, b) => a.acc - b.acc);
  return list.slice(0, maxKeys);
}

/* ============================================================
   蛋仔装扮商店：星星当零花钱（可花 = 总星星 - 已花）
   ============================================================ */

export function getShopState() {
  return load().shop;
}

export function buyShopItem(id, price) {
  const s = load();
  const shop = s.shop;
  if (shop.owned.includes(id)) return s.shop;
  const totalStars = Object.values(s.findKey).reduce((n, v) => n + (v.stars || 0), 0) +
    Object.values(s.typing).reduce((n, v) => n + (v.stars || 0), 0);
  if (totalStars - shop.spent < price) return s.shop;
  shop.spent += price;
  shop.owned.push(id);
  shop.equipped = id; // 买下即戴上
  save(s);
  return s.shop;
}

export function equipShopItem(id) {
  const s = load();
  s.shop.equipped = s.shop.owned.includes(id) ? id : '';
  save(s);
  return s.shop;
}

/* ============================================================
   通关证书名字
   ============================================================ */

export function getCertName() {
  return load().certName;
}

export function setCertName(name) {
  const s = load();
  s.certName = String(name || '').slice(0, 12);
  save(s);
}
