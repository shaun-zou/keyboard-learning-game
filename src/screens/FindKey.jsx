import { useEffect, useRef, useState } from 'react';
import { FIND_LEVELS, FINGERS, KEY_FINGER, SHOOTER_CONFIG } from '../data/keyboard.js';
import Keyboard from '../components/Keyboard.jsx';
import AbcSong from './AbcSong.jsx';
import Shooter from './Shooter.jsx';
import { usePhysicalKey, pickRandom } from '../hooks/useKeys.js';
import { sfx, playPraise, playWinCheer } from '../audio.js';
import { recordFindKey, getFindKeyStats, recordActivity } from '../stats.js';

const ROUNDS = 20;
// 每达到这么多连击朗读一次英语鼓励（3、6、9…）
const PRAISE_COMBO_STEP = 3;

// 答对时的英语夸奖（连击达标时显示，并播放预生成的真人语音）
const PRAISE = [
  { id: 'awesome', text: 'Awesome!', emoji: '🎉' },
  { id: 'great-job', text: 'Great job!', emoji: '⭐' },
  { id: 'amazing', text: 'Amazing!', emoji: '💪' },
  { id: 'well-done', text: 'Well done!', emoji: '👏' },
  { id: 'super-smart', text: 'Super smart!', emoji: '🦊' },
  { id: 'bullseye', text: 'Bullseye!', emoji: '🎯' }
];
const ENCOURAGE = [
  { text: '再试一次哦～' },
  { text: '没关系，再找找看！' },
  { text: '差一点点，加油！' },
  { text: '小眼睛看仔细啦', emoji: '🔍' }
];

function starsOf(firstTry) {
  // 阈值随题数等比缩放（90% / 60%）
  if (firstTry >= ROUNDS * 0.9) return 3;
  if (firstTry >= ROUNDS * 0.6) return 2;
  return 1;
}

export default function FindKey() {
  // select(选关) | play(答题中) | between(答对过渡) | done(结算)
  const [phase, setPhase] = useState('select');
  const [levelIdx, setLevelIdx] = useState(0);
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState(null);
  const [wrong, setWrong] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [hint, setHint] = useState(false);
  const [message, setMessage] = useState('');
  const [happy, setHappy] = useState(false);
  const [flash, setFlash] = useState(null);
  // 字母歌关卡：通关时尝试了几次（用于结算页星级）
  const [songAttempts, setSongAttempts] = useState(1);
  // 星球大战关卡：结算时的成绩（ref 保证 done effect 读到最新值）
  const [shooterResult, setShooterResult] = useState({ score: 0, hits: 0, accuracy: 100 });
  const shooterResultRef = useRef(shooterResult);
  const timerRef = useRef(null);
  // 连击数用 ref 作为唯一真相，避免快速连按（答错后立即答对）时闭包值过期
  const streakRef = useRef(0);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const level = FIND_LEVELS[levelIdx];

  const startLevel = (i) => {
    setLevelIdx(i);
    recordActivity(); // 进入关卡就算今日打卡（未通关也保留）
    setRound(0);
    setWrong(0);
    setFirstTry(0);
    streakRef.current = 0;
    setStreak(0);
    setBest(0);
    setHint(false);
    setMessage('');
    setFlash(null);
    setSongAttempts(1);
    if (FIND_LEVELS[i].special) {
      setTarget(null);
      setPhase('play');
      return;
    }
    setTarget(pickRandom(FIND_LEVELS[i].keys));
    setPhase('play');
  };

  // 字母歌关卡通关回调：收尾句演奏完毕后进入结算
  // 是否播放“你真棒”在进入结算页时按尝试次数统一判断
  const handleSongFinish = (attempts) => {
    setSongAttempts(attempts);
    setBest(26);
    setPhase('done');
  };

  // 星球大战关卡通关回调
  const handleShootFinish = ({ score, hits, accuracy }) => {
    shooterResultRef.current = { score, hits, accuracy };
    setShooterResult({ score, hits, accuracy });
    setPhase('done');
  };

  // 进入结算时记录本次成绩（持久化到本地）
  useEffect(() => {
    if (phase !== 'done') return;
    if (level.special === 'abcSong') {
      const stars = songAttempts <= 1 ? 3 : songAttempts <= 2 ? 2 : 1;
      recordFindKey(levelIdx, { stars, isSong: true, attempts: songAttempts });
      // 字母歌：一次唱完（零差错）才播放“你真棒”
      if (songAttempts <= 1) setTimeout(() => playWinCheer(), 700);
    } else if (level.special === 'shooter') {
      // 星球大战：命中率 >= 90% 且被击 <= 1 次三星；命中率 >= 70% 二星；否则一星
      const { accuracy, hits } = shooterResultRef.current;
      const stars = accuracy >= 90 && hits <= 1 ? 3 : accuracy >= 70 ? 2 : 1;
      recordFindKey(levelIdx, { stars, isShooter: true, accuracy, hits });
      // 完美表现（命中率 100% 且零被击）才播放“你真棒”
      if (accuracy === 100 && hits === 0) setTimeout(() => playWinCheer(), 700);
    } else {
      recordFindKey(levelIdx, { stars: starsOf(firstTry), firstTry, combo: best });
      // 普通关：全部题一次答对才播放“你真棒”
      if (firstTry === ROUNDS) setTimeout(() => playWinCheer(), 1050);
    }
    // 依赖 phase 变化触发一次；starsOf 依赖 firstTry，此处 phase===done 时 firstTry 已是最终值
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const answer = (raw) => {
    // 特殊关卡由专属组件接管键盘，普通答题逻辑一律不响应
    if (level.special) return;
    if (phase !== 'play') return;
    // 物理键盘可能传入大写（Shift/CapsLock），统一转小写
    const code = typeof raw === 'string' ? raw.toLowerCase() : raw;
    if (!/^[a-z]$/.test(code)) return; // 只接受字母

    if (code === target) {
      sfx.correct();
      setFlash({ code, ok: true });
      const okFirst = wrong === 0;
      setFirstTry((v) => v + (okFirst ? 1 : 0));
      // 从 ref 读取并立即递增，保证任何按键速度下连击数都准确
      streakRef.current += 1;
      const newStreak = streakRef.current;
      setStreak(newStreak);
      setBest((b) => Math.max(b, newStreak));
      setHappy(true);
      // 连击达到 3、6、9… 时才显示并朗读英语鼓励；其他情况只显示 OK
      const isPraiseCombo =
        newStreak >= PRAISE_COMBO_STEP && newStreak % PRAISE_COMBO_STEP === 0;
      const praise = pickRandom(PRAISE);
      setMessage(isPraiseCombo ? praise : { text: 'OK', emoji: '' });
      if (isPraiseCombo) {
        // 先播答对音效，再播放真人夸奖录音（音频不可用时内部自动回退朗读）
        setTimeout(() => playPraise(praise.id, praise.text), 380);
      }
      setPhase('between');

      timerRef.current = setTimeout(() => {
        setFlash(null);
        setHappy(false);
        setMessage('');
        setHint(false);
        setWrong(0);
        if (round + 1 >= ROUNDS) {
          sfx.win();
          // 是否播放“你真棒”在进入结算页时按最终成绩统一判断
          setPhase('done');
        } else {
          setRound((r) => r + 1);
          setTarget((t) => pickRandom(level.keys, t));
          setPhase('play');
        }
      }, 950);
    } else {
      sfx.wrong();
      setFlash({ code, ok: false });
      setTimeout(() => {
        setFlash((f) => (f && f.code === code && f.ok === false ? null : f));
      }, 450);
      setWrong((w) => w + 1);
      streakRef.current = 0;
      setStreak(0);
      setHint(true);
      setMessage(pickRandom(ENCOURAGE));
    }
  };

  usePhysicalKey(answer);

  const finger = target ? FINGERS[KEY_FINGER[target]] : null;

  /* ---------- 选关 ---------- */
  if (phase === 'select') {
    return (
      <div className="select-screen">
        <h2 className="screen-title">🔍 找键位闯关</h2>
        <p className="screen-subtitle">看清目标，在键盘上又快又准地按下它！</p>
        <div className="level-grid">
          {FIND_LEVELS.map((lv, i) => {
            const best = getFindKeyStats(i);
            return (
            <button
              key={lv.name}
              className="level-card panel"
              onClick={(e) => {
                e.currentTarget.blur();
                startLevel(i);
              }}
            >
              <span className="level-card__emoji">{lv.emoji}</span>
              <span className="level-card__name">
                第 {i + 1} 关 · {lv.name}
              </span>
              <span className="level-card__desc">{lv.desc}</span>
              <span className="level-card__keys">
                {lv.special === 'abcSong'
                  ? 'A → B → C … → Z 🎵'
                  : lv.special === 'shooter'
                    ? '击落字母 🚀 保护飞船'
                    : `${lv.keys.slice(0, 10).map((k) => k.toUpperCase()).join(' ')}${lv.keys.length > 10 ? ' …' : ''}`}
              </span>
              {best && best.completed && (
                <span className="level-card__stars" title={`历史最佳：${best.stars} 星`}>
                  {[1, 2, 3].map((n) => (
                    <span key={n} className={n <= best.stars ? 'mini-star mini-star--on' : 'mini-star'}>★</span>
                  ))}
                </span>
              )}
            </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ---------- 结算 ---------- */
  if (phase === 'done') {
    const isSong = level.special === 'abcSong';
    const isShooter = level.special === 'shooter';
    let stars;
    if (isSong) {
      stars = songAttempts <= 1 ? 3 : songAttempts <= 2 ? 2 : 1;
    } else if (isShooter) {
      const { accuracy, hits } = shooterResultRef.current;
      stars = accuracy >= 90 && hits <= 1 ? 3 : accuracy >= 70 ? 2 : 1;
    } else {
      stars = starsOf(firstTry);
    }
    return (
      <div className="result-screen panel pop-in">
        <div className="confetti" aria-hidden="true">
          {['⭐', '🎉', '✨', '🌟', '🎊'].map((e, i) => (
            <span
              key={i}
              style={{
                left: `${8 + i * 19}%`,
                animationDelay: `${(i % 4) * 0.35}s`,
                animationDuration: `${2.6 + (i % 3) * 0.5}s`
              }}
            >
              {e}
            </span>
          ))}
        </div>
        <div className="result__emoji">🏆</div>
        <h2 className="result__title">闯关成功！</h2>
        <p className="result__sub">
          第 {levelIdx + 1} 关 · {level.name}
        </p>
        <div className="result__stars">
          {[1, 2, 3].map((n) => (
            <span key={n} className={n <= stars ? 'star star--on' : 'star'}>
              ★
            </span>
          ))}
        </div>
        <ul className="result__stats">
          {isSong ? (
            <>
              <li>
                26 个字母 <strong>零差错</strong> 唱完 🎵
              </li>
              <li>
                一共尝试 <strong>{songAttempts}</strong> 次
              </li>
            </>
          ) : isShooter ? (
            <>
              <li>
                击落 <strong>{SHOOTER_CONFIG.totalLetters}</strong> 个字母，得分 <strong>{shooterResultRef.current.score}</strong> 分
              </li>
              <li>
                命中率 <strong>{shooterResultRef.current.accuracy}%</strong>
              </li>
              <li>
                被击 <strong>{shooterResultRef.current.hits}</strong> 次
              </li>
            </>
          ) : (
            <>
              <li>
                <strong>{firstTry}</strong> / {ROUNDS} 题一次答对
              </li>
              <li>
                最高连击 <strong>{best}</strong> 🔥
              </li>
            </>
          )}
        </ul>
        <div className="result__btns">
          <button
            className="btn btn--ghost"
            onClick={(e) => {
              e.currentTarget.blur();
              setPhase('select');
            }}
          >
            🗺️ 返回选关
          </button>
          <button
            className="btn btn--primary"
            onClick={(e) => {
              e.currentTarget.blur();
              startLevel(levelIdx);
            }}
          >
            🔄 再玩一次
          </button>
          {levelIdx + 1 < FIND_LEVELS.length && (
            <button
              className="btn btn--green"
              onClick={(e) => {
                e.currentTarget.blur();
                startLevel(levelIdx + 1);
              }}
            >
              下一关 ▸
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ---------- 字母歌特殊关卡 ---------- */
  if (level.special === 'abcSong') {
    return (
      <AbcSong
        level={level}
        levelIdx={levelIdx}
        onQuit={() => setPhase('select')}
        onFinish={handleSongFinish}
      />
    );
  }

  /* ---------- 星球大战特殊关卡 ---------- */
  if (level.special === 'shooter') {
    return (
      <Shooter
        level={level}
        levelIdx={levelIdx}
        onQuit={() => setPhase('select')}
        onFinish={handleShootFinish}
      />
    );
  }

  /* ---------- 答题 ---------- */
  return (
    <div className="find-game">
      <div className="hud">
        <span className="hud__pill">
          {level.emoji} 第 {levelIdx + 1} 关 · {level.name}
        </span>
        <span className="hud__pill">
          第 {round + 1} / {ROUNDS} 题
        </span>
        <span className="hud__pill hud__pill--fire">🔥 连击 {streak}</span>
      </div>

      <section className={`find-card panel ${happy ? 'find-card--happy' : ''}`}>
        <p className="find-card__ask">请在键盘上按下这个字母</p>
        <div key={target} className="find-card__letter pop-in">
          {target.toUpperCase()}
        </div>
        <p className="find-card__lower">小写长这样：{target}</p>
        <p
          className={`find-card__msg ${
            phase === 'between' ? 'find-card__msg--ok' : hint ? 'find-card__msg--warn' : ''
          }`}
        >
          {message
            ? message.emoji
              ? `${message.emoji} ${message.text}`
              : message.text
            : hint
              ? ''
              : '准备好了吗？'}
        </p>
        {hint && finger && phase === 'play' && (
          <p className="find-card__hint">
            💡 提示：用
            <span className="finger-dot" style={{ background: finger.color }} />
            <strong>{finger.name}</strong>
            ，黄色发光的键就是它！
          </p>
        )}
      </section>

      <section className="panel find-game__kb">
        <Keyboard
          lit={hint && phase === 'play' ? target : null}
          flash={flash}
          showFinger
          clickable
          onKey={answer}
        />
      </section>

      <button
        className="btn btn--text"
        onClick={(e) => {
          e.currentTarget.blur();
          clearTimeout(timerRef.current);
          setPhase('select');
        }}
      >
        ← 不玩了，返回选关
      </button>
    </div>
  );
}
