import { useState } from 'react';
import { getTotalStars, getShopState, buyShopItem, equipShopItem } from '../stats.js';
import { sfx } from '../audio.js';

// 蛋仔装扮商店：闯关攒下的星星当零花钱，给键键买新装扮
// 装扮全部用纯 CSS 绘制（样式在 styles.css 的 .egg__acc--* 段落）

const SHOP_ITEMS = [
  { id: 'bow', name: '粉粉蝴蝶结', price: 5, desc: '戴在头顶右侧，甜度满分' },
  { id: 'flower', name: '太阳小花', price: 8, desc: '每天都是好心情' },
  { id: 'headset', name: '音乐耳机', price: 10, desc: '戴上它，敲键都带节奏' },
  { id: 'wizard', name: '魔法星帽', price: 12, desc: '敲键盘像施魔法一样快' },
  { id: 'crown', name: '星星皇冠', price: 15, desc: '只有真正的键盘王者才配拥有' }
];

export default function Shop() {
  const [shop, setShop] = useState(() => getShopState());
  const totalStars = getTotalStars();
  const coins = totalStars - shop.spent;
  const equipped = shop.equipped && shop.owned.includes(shop.equipped) ? shop.equipped : '';

  const buy = (item) => {
    if (coins < item.price) return;
    sfx.correct();
    setShop(buyShopItem(item.id, item.price));
  };

  const toggleEquip = (item) => {
    sfx.click();
    setShop(equipShopItem(equipped === item.id ? '' : item.id));
  };

  return (
    <div className="select-screen">
      <h2 className="screen-title">🎩 蛋仔装扮商店</h2>
      <p className="screen-subtitle">闯关攒下的星星可以在这里花掉，给键键换新装扮！</p>

      <div className="shop-try panel">
        <div className="mascot">
          <span className="egg">
            <span className="egg__hat">K</span>
            <i className="egg__eye egg__eye--l" />
            <i className="egg__eye egg__eye--r" />
            <i className="egg__blush egg__blush--l" />
            <i className="egg__blush egg__blush--r" />
            <i className="egg__mouth" />
            {equipped && <span className={`egg__acc egg__acc--${equipped}`} />}
          </span>
        </div>
        <p className="shop-try__tip">
          {equipped
            ? '这就是戴上新装扮的键键，回首页也能看到哦！'
            : '还没有戴装扮，选一件试试吧～'}
        </p>
      </div>

      <div className="shop-coins panel">
        <span>💰 我的零花钱：<strong>{coins}</strong> ⭐</span>
        <span className="shop-coins__sub">（已获得 {totalStars} ⭐ − 已花 {shop.spent} ⭐）</span>
      </div>

      <div className="lesson-grid">
        {SHOP_ITEMS.map((item) => {
          const owned = shop.owned.includes(item.id);
          const isOn = equipped === item.id;
          const afford = coins >= item.price;
          return (
            <div key={item.id} className={`level-card panel shop-card${isOn ? ' shop-card--on' : ''}`}>
              <span className={`shop-item-egg egg__acc egg__acc--${item.id}`} aria-hidden="true" />
              <span className="level-card__name">{item.name}</span>
              <span className="level-card__desc">{item.desc}</span>
              <span className="level-card__keys">价格 {item.price} ⭐</span>
              {!owned ? (
                <button
                  className={`btn btn--sm ${afford ? 'btn--green' : 'btn--ghost'}`}
                  disabled={!afford}
                  onClick={() => buy(item)}
                >
                  {afford ? `用 ${item.price} ⭐ 购买` : '星星不够啦'}
                </button>
              ) : (
                <button className={`btn btn--sm ${isOn ? 'btn--ghost' : 'btn--primary'}`} onClick={() => toggleEquip(item)}>
                  {isOn ? '取下' : '戴上'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
