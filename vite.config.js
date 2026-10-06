import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// 构建完成后把入口的 module 脚本标签改成经典脚本，
// 使 dist/index.html 直接双击（file:// 协议）也能运行
function classicScriptForFile() {
  return {
    name: 'classic-script-for-file',
    writeBundle(outputOptions) {
      const outDir = outputOptions.dir || 'dist';
      const file = resolve(process.cwd(), outDir, 'index.html');
      let html = readFileSync(file, 'utf8');
      // 经典脚本默认会在 <head> 处立即执行（此时 #root 尚未解析），必须加 defer
      html = html.replace(/<script\s+type="module"[^>]*?src=/g, '<script defer src=');
      html = html.replace(/(<link\s+rel="stylesheet")[^>]*?href=/g, '$1 href=');
      writeFileSync(file, html);
    }
  };
}

export default defineConfig({
  plugins: [react(), classicScriptForFile()],
  // 相对路径：dist 拷到任意目录 / 子路径都能找到资源
  base: './',
  build: {
    // 小资源全部内联；CSS 不拆分
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // 生成经典脚本而非 ES Module，双击 index.html（file://）也能运行
        format: 'iife',
        inlineDynamicImports: true
      }
    }
  }
});
