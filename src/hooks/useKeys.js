import { useEffect, useRef } from 'react';

// 把浏览器 KeyboardEvent 归一化成游戏内部使用的键码
// 字母 -> 保留大小写（支持 True/False 这类大写练习）；空格 -> ' '；回车 -> 'Enter'；其余忽略
export function normalizeKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  if (e.key === ' ') return ' ';
  if (e.key === 'Enter') return 'Enter';
  if (e.key && e.key.length === 1 && /[a-z'`,.;/\\\[\]-]/i.test(e.key)) {
    return e.key;
  }
  return null;
}

// 监听全局物理键盘按键（自动忽略长按重复触发）
export function usePhysicalKey(callback) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    const handler = (e) => {
      const code = normalizeKey(e);
      if (!code) return;
      // 阻止空格滚屏 / 按钮被回车意外触发
      e.preventDefault();
      if (e.repeat) return;
      cbRef.current(code);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}

// 从数组中随机取一个元素，可指定需要排除的值
export function pickRandom(arr, exclude) {
  if (arr.length === 1) return arr[0];
  let v = arr[Math.floor(Math.random() * arr.length)];
  let guard = 0;
  while (v === exclude && guard < 10) {
    v = arr[Math.floor(Math.random() * arr.length)];
    guard += 1;
  }
  return v;
}
