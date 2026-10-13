import { useEffect, useRef, useState } from 'react';
import Keyboard from '../components/Keyboard.jsx';
import { usePhysicalKey } from '../hooks/useKeys.js';
import { sfx } from '../audio.js';
import { recordActivity } from '../stats.js';

// 超市收银员：看商品价格用数字键敲出来，60 秒限时看能收几单！
// 补齐数字键区的专项练习，顺带认识人民币价格。
const TIME_LIMIT = 60;
const BEST_KEY = 'cashier_best_v1';

// 商品池：emoji + 名称 + 价格（低年级最多两位数）
const GOODS = [
  { emoji: '🍎', name: '大苹果', price: 3 },
  { emoji: '✏️', name: '铅笔', price: 2 },
  { emoji: '🧸', name: '小熊玩偶', price: 15 },
  { emoji: '🪢', name: '跳绳', price: 12 },
  { emoji: '📕', name: '笔记本', price: 5 },
  { emoji: '🍦', name: '冰淇淋', price: 8 },
  { emoji: '🚗', name: '玩具小车', price: 23 },
  { emoji: '🎨', name: '水彩笔', price: 18 },
  { emoji: '🦆', name: '小黄鸭', price: 7 },
  { emoji: '⚽', name: '皮球', price: 26 },
  { emoji: '🍭', name: '棒棒糖', price: 4 },
  { emoji: '🧃', name: '果汁', price: 6 }
];

function loadBest() {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) || '{}');
  } catch {
    return {};
  }
}

export default function Cashier() {
  // ready（开始页）| play（收银中）| done（结算）
  const [phase, setPhase] = useState('ready');
  const [order, setOrder] = useState(null);      // 当前商品 {emoji, name, price, digits, idx}
  const [seconds, setSeconds] = useState(TIME_LIMIT);
  const [orders, setOrders] = useState(0);       // 已收单数
  const [earned, setEarned] = useState(0);       // 营业额
  const [errors, setErrors] = useState(0);       // 敲错次数
  const [shake, setShake] = useState(false);
  const [lit, setLit] = useState(null);
  const [best, setBest] = useState(loadBest);
  const bestRef = useRef(best);

  // 下一单：收得越多价格越大（练习难度平滑上升）
  const nextOrder = (doneCount) => {
    const pool = doneCount < 3 ? GOODS.filter((g) => g.price < 10) : GOODS;
    const g = pool[Math.floor(Math.random() * pool.length)];
    const price = doneCount >= 3 && g.price < 10 ? g.price * 10 + Math.floor(Math.random() * 9) + 1 : g.price;
    setOrder({
      ...g,
      price,
      digits: String(price).split(''),
      idx: 0
    });
  };

  // 60 秒倒计时
  useEffect(() => {
    if (phase !== 'play') return;
    const timer = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(timer);
          setPhase('done');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const start = () => {
    recordActivity();
    setSeconds(TIME_LIMIT);
    setOrders(0);
    setEarned(0);
    setErrors(0);
    nextOrder(0);
    setPhase('play');
  };

  // 结算：记录最佳单数
  useEffect(() => {
    if (phase !== 'done') return;
    if (orders > (bestRef.current.orders || 0)) {
      const next = { orders, earned };
      setBest(next);
      bestRef.current = next;
      try {
        localStorage.setItem(BEST_KEY, JSON.stringify(next));
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handleKey = (code) => {
    if (phase !== 'play' || !order) return;
    const d = String(code);
    if (!/^[0-9]$/.test(d)) return;
    setLit(d);
    setTimeout(() => setLit((l) => (l === d ? null : l)), 200);

    if (d === order.digits[order.idx]) {
      // 敲对一位
      if (order.idx + 1 >= order.digits.length) {
        // 整单收银成功！
        sfx.correct();
        setOrders((n) => {
          nextOrder(n + 1);
          return n + 1;
        });
        setEarned((m) => m + order.price);
      } else {
        sfx.click();
        setOrder((o) => ({ ...o, idx: o.idx + 1 }));
      }
    } else {
      // 敲错：抖一下当前位
      sfx.wrong();
      setErrors((n) => n + 1);
      setShake(true);
      setTimeout(() => setShake(false), 420);
    }
  };

  usePhysicalKey(handleKey);

  /* ---------- 开始页 ---------- */
  if (phase === 'ready') {
    return (
      <div className="result-screen panel pop-in">
        <div className="result__emoji">🛒</div>
        <h2 className="result__title">超市收银员</h2>
        <p className="result__sub">看商品的价格，用键盘上的数字键把它敲出来，就是收银成功！</p>
        <ul className="result__stats">
          <li>
            限时 <strong>{TIME_LIMIT} 秒</strong>，看你能收几单
          </li>
          <li>练的是键盘最右边的数字键，收得越多价格越大哦</li>
          {best.orders > 0 && (
            <li>
              历史最佳 <strong>{best.orders}</strong> 单 · 营业额 ¥{best.earned}
            </li>
          )}
        </ul>
        <div className="result__btns">
          <button className="btn btn--primary" onClick={(e) => { e.currentTarget.blur(); start(); }}>
            🚀 开始上班
          </button>
        </div>
      </div>
    );
  }

  /* ---------- 结算页 ---------- */
  if (phase === 'done') {
    const isBest = orders >= (best.orders || 0) && orders > 0;
    return (
      <div className="result-screen panel pop-in">
        <div className="confetti" aria-hidden="true">
          {['💰', '⭐', '🛒', '🎉'].map((e, i) => (
            <span key={i} style={{ left: `${15 + i * 22}%`, animationDelay: `${i * 0.3}s` }}>
              {e}
            </span>
          ))}
        </div>
        <div className="result__emoji">{isBest ? '🏆' : '🛒'}</div>
        <h2 className="result__title">{isBest ? '金牌收银员！' : '下班啦！'}</h2>
        <ul className="result__stats">
          <li>
            收银 <strong>{orders}</strong> 单 · 营业额 <strong>¥{earned}</strong>
          </li>
          <li>
            敲错 <strong>{errors}</strong> 次
          </li>
          <li>
            历史最佳 <strong>{best.orders || orders}</strong> 单
          </li>
        </ul>
        <div className="result__btns">
          <button className="btn btn--ghost" onClick={(e) => { e.currentTarget.blur(); setPhase('ready'); }}>
            🏠 返回
          </button>
          <button className="btn btn--primary" onClick={(e) => { e.currentTarget.blur(); start(); }}>
            🔄 再来一局
          </button>
        </div>
      </div>
    );
  }

  /* ---------- 收银中 ---------- */
  const urgent = seconds <= 10;
  return (
    <div className="cashier-game">
      <div className="hud">
        <span className={`hud__pill${urgent ? ' hud__pill--hot' : ''}`}>⏰ {seconds}s</span>
        <span className="hud__pill">已收 {orders} 单</span>
        <span className="hud__pill">💰 ¥{earned}</span>
      </div>

      <div className="cashier-stage">
        <div className="goods-card pop-in" key={order.emoji + order.price}>
          <span className="goods-card__emoji">{order.emoji}</span>
          <span className="goods-card__name">{order.name}</span>
          <span className="goods-card__tag">¥{order.price}</span>
        </div>

        <div className="price-slot">
          {order.digits.map((d, i) => (
            <span
              key={i}
              className={`price-slot__digit${
                i < order.idx ? ' price-slot__digit--done' : i === order.idx ? ' price-slot__digit--now' : ''
              }${i === order.idx && shake ? ' price-slot__digit--shake' : ''}`}
            >
              {i < order.idx ? d : i === order.idx ? d : '·'}
            </span>
          ))}
        </div>
        <p className="cashier-tip">用键盘最上面的数字行敲出 ¥{order.price}</p>
      </div>

      <Keyboard lit={lit} />
    </div>
  );
}
