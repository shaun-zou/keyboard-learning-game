// 用本机 Edge 无头模式截取宣传用界面图（无无障碍标注，干净画面）
import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'promotion', 'rednote-keyboard', 'images');
const BASE = 'http://localhost:3456/';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(dir, 'shot-home.png') });
console.log('1 home done');

// 认识键盘：选关页
await page.getByText('认识键盘', { exact: true }).first().click();
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(dir, 'shot-learn.png') });
console.log('2 learn done');

// 找键位闯关：选关页（六关）
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.getByText('找键位闯关', { exact: true }).first().click();
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(dir, 'shot-findkey.png') });
console.log('3 findkey done');

// 星球大战：进入第 6 关开始战斗，等敌机出现后截战斗画面
await page.getByText('星球大战').first().click();
await page.waitForTimeout(500);
await page.getByText('开始战斗').click();
await page.waitForTimeout(4200); // 等 2~3 架敌机出现并下落
await page.screenshot({ path: path.join(dir, 'shot-shooter.png') });
console.log('4 shooter done');

// 趣味练打字：第 1 课进行中
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.getByText('趣味练打字', { exact: true }).first().click();
await page.waitForTimeout(500);
// 选关页点第 1 课卡片
const lessonCard = page.locator('.level-card').first();
await lessonCard.click();
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(dir, 'shot-type.png') });
console.log('5 type done');

await browser.close();
console.log('all saved to', dir);
