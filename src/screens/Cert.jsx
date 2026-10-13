import { useEffect, useRef, useState } from 'react';
import { LETTERS, FUNCTION_KEYS, FIND_LEVELS, TYPE_LESSONS } from '../data/keyboard.js';
import { getStats, getStreakInfo, getTotalStars, getCertName, setCertName } from '../stats.js';
import { sfx } from '../audio.js';

// 通关证书：Canvas 绘制 + 一键下载 PNG（纯前端，离线可用）
// 闯完全部关卡后解锁；未通关一律拦截，不展示证书

const W = 1000;
const H = 700;

export default function Cert() {
  const stats = getStats();
  const streak = getStreakInfo();
  const totalStars = getTotalStars();
  const totalLevels = 2 + FIND_LEVELS.length + TYPE_LESSONS.length;

  const l1 = (stats.learn.learnedCount || 0) >= LETTERS.length ? 1 : 0;
  const l2 = getFnCount() >= FUNCTION_KEYS.length ? 1 : 0;
  const findDone = Object.values(stats.findKey).filter((v) => v && v.completed).length;
  const typeDone = Object.values(stats.typing).filter((v) => v && v.completed).length;
  const graduated = l1 + l2 + findDone + typeDone >= totalLevels;

  const [name, setName] = useState(() => getCertName() || '');
  const canvasRef = useRef(null);

  function getFnCount() {
    try {
      const arr = JSON.parse(localStorage.getItem('kd_fn_keys') || '[]');
      return Array.isArray(arr) ? new Set(arr).size : 0;
    } catch {
      return 0;
    }
  }

  // 绘制证书
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = 2; // 高清导出
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const FONT = "'Comic Sans MS','Chalkboard SE','PingFang SC','Microsoft YaHei',sans-serif";

    // 底色
    ctx.fillStyle = '#fff8ee';
    ctx.fillRect(0, 0, W, H);

    // 外边框（糖果蓝）+ 内虚线框（粉）
    ctx.strokeStyle = '#5fb6f5';
    ctx.lineWidth = 14;
    roundRect(ctx, 18, 18, W - 36, H - 36, 30);
    ctx.stroke();
    ctx.strokeStyle = '#ff8fb1';
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 10]);
    roundRect(ctx, 44, 44, W - 88, H - 88, 22);
    ctx.stroke();
    ctx.setLineDash([]);

    // 四角星星
    ctx.font = '34px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const [x, y] of [[70, 70], [W - 70, 70], [70, H - 70], [W - 70, H - 70]]) {
      ctx.fillText('⭐', x, y);
    }

    // 标题
    ctx.fillStyle = '#e2628f';
    ctx.font = `900 58px ${FONT}`;
    ctx.fillText('通 关 证 书', W / 2, 130);
    ctx.fillStyle = '#75655a';
    ctx.font = `700 20px ${FONT}`;
    ctx.fillText('—— 键盘小达人 · TYPING STAR ——', W / 2, 178);

    // 蛋仔
    drawEgg(ctx, W / 2, 292, graduated);

    // 名字
    ctx.fillStyle = '#4a3f35';
    ctx.font = `900 44px ${FONT}`;
    ctx.fillText(`恭喜  ${name.trim() || '小小键盘手'}  同学`, W / 2, 418);

    // 正文
    ctx.font = `600 24px ${FONT}`;
    ctx.fillStyle = '#75655a';
    ctx.fillText(
      graduated
        ? `已完成全部 ${totalLevels} 关闯关，正式获得「打字小达人」称号！`
        : `已闯 ${l1 + l2 + findDone + typeDone} / ${totalLevels} 关，继续加油闯完全部关卡！`,
      W / 2,
      470
    );

    // 成绩章
    ctx.font = `800 26px ${FONT}`;
    ctx.fillStyle = '#e8a81d';
    ctx.fillText(`⭐ 星星 ×${totalStars}    🔥 连续打卡 ${streak.streakDays} 天`, W / 2, 522);

    // 日期
    const d = new Date();
    ctx.font = `600 20px ${FONT}`;
    ctx.fillStyle = '#a89b8f';
    ctx.fillText(`颁发日期：${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`, W / 2, 610);

    // 落款
    ctx.font = `800 24px ${FONT}`;
    ctx.fillStyle = '#3e93d9';
    ctx.fillText('键键 敬上 🥚', W / 2, 650);
  }, [name, graduated, totalStars, streak.streakDays, totalLevels, l1, l2, findDone, typeDone]);

  const download = () => {
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `键盘小达人通关证书-${name.trim() || '小小键盘手'}.png`;
    a.click();
    sfx.win();
  };

  // 未通关：证书未解锁。放在所有 hooks 之后，保证任何入口进来都拦得住
  if (!graduated) {
    const done = l1 + l2 + findDone + typeDone;
    return (
      <div className="result-screen panel pop-in">
        <div className="result__emoji">🔒</div>
        <h2 className="result__title">证书还没解锁</h2>
        <p className="result__sub">
          闯完全部 {totalLevels} 关就能领取通关证书，目前进度 {done} / {totalLevels} 关
        </p>
        <p className="result__sub">回到首页继续闯关，加油！💪</p>
      </div>
    );
  }

  return (
    <div className="cert-screen">
      <h2 className="screen-title">🎓 通关证书</h2>
      <p className="screen-subtitle">闯完全部关卡啦！写下名字，领取属于你的证书！</p>
      <div className="cert-canvas-wrap panel">
        <canvas ref={canvasRef} style={{ width: '100%', maxWidth: W, borderRadius: 18 }} />
      </div>
      <div className="cert-actions">
        <input
          className="cert-name-input"
          placeholder="写上你的名字（最多 12 个字）"
          maxLength={12}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setCertName(e.target.value);
          }}
        />
        <button className="btn btn--green" onClick={download}>
          🖼️ 下载证书
        </button>
      </div>
    </div>
  );
}

// 圆角矩形路径
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 用 Canvas 画一只蛋仔（通关后戴学士帽）
function drawEgg(ctx, cx, cy, graduated) {
  ctx.save();
  // 身体
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#e8d8c2';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 66, 78, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // 眼睛
  ctx.fillStyle = '#4a3f35';
  ctx.beginPath();
  ctx.arc(cx - 20, cy - 8, 7, 0, Math.PI * 2);
  ctx.arc(cx + 20, cy - 8, 7, 0, Math.PI * 2);
  ctx.fill();
  // 腮红
  ctx.fillStyle = 'rgba(255,143,177,0.55)';
  ctx.beginPath();
  ctx.arc(cx - 32, cy + 8, 9, 0, Math.PI * 2);
  ctx.arc(cx + 32, cy + 8, 9, 0, Math.PI * 2);
  ctx.fill();
  // 微笑
  ctx.strokeStyle = '#4a3f35';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy + 4, 16, 0.25 * Math.PI, 0.75 * Math.PI);
  ctx.stroke();
  // 学士帽（已通关才有）
  if (graduated) {
    ctx.fillStyle = '#3a3f4d';
    ctx.beginPath();
    ctx.moveTo(cx - 56, cy - 62);
    ctx.lineTo(cx, cy - 92);
    ctx.lineTo(cx + 56, cy - 62);
    ctx.lineTo(cx, cy - 44);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(cx - 22, cy - 66, 44, 12);
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 88);
    ctx.lineTo(cx, cy - 58);
    ctx.stroke();
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.arc(cx, cy - 52, 5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 默认 K 键帽小帽
    ctx.fillStyle = '#ff8fb1';
    roundRect(ctx, cx - 24, cy - 96, 48, 34, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = "900 22px 'Comic Sans MS',sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('K', cx, cy - 78);
  }
  ctx.restore();
}
