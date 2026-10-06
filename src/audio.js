// 基于 Web Audio API 的本地音效（无需任何音频文件，完全离线可用）

const SOUND_KEY = 'kb_sound_v1';
let enabled = true;
try {
  enabled = localStorage.getItem(SOUND_KEY) !== '0';
} catch {
  enabled = true;
}

export function isSoundOn() {
  return enabled;
}

export function setSoundOn(v) {
  enabled = !!v;
  try {
    localStorage.setItem(SOUND_KEY, enabled ? '1' : '0');
  } catch {
    /* 忽略存储异常 */
  }
}

let ctx = null;
function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// 播放一个音符
function tone(freq, startOffset, duration, type = 'sine', volume = 0.12) {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime + startOffset;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export const sfx = {
  // 轻轻的打字咔哒声
  click() {
    if (!enabled) return;
    try {
      tone(660, 0, 0.06, 'triangle', 0.08);
    } catch {}
  },
  // 答对：明亮的上行三音
  correct() {
    if (!enabled) return;
    try {
      tone(523.25, 0, 0.12, 'triangle', 0.12); // C5
      tone(659.25, 0.09, 0.12, 'triangle', 0.12); // E5
      tone(783.99, 0.18, 0.18, 'triangle', 0.12); // G5
    } catch {}
  },
  // 答错：柔和的低低提示音（不吓小朋友）
  wrong() {
    if (!enabled) return;
    try {
      tone(261.63, 0, 0.14, 'sine', 0.09);
      tone(196.0, 0.12, 0.2, 'sine', 0.09);
    } catch {}
  },
  // 过关：一小段欢快旋律
  win() {
    if (!enabled) return;
    try {
      const notes = [523.25, 587.33, 659.25, 783.99, 1046.5];
      notes.forEach((n, i) => tone(n, i * 0.12, 0.22, 'triangle', 0.12));
      tone(1318.5, 0.62, 0.35, 'triangle', 0.1);
    } catch {}
  },
  // 激光炮发射：频率快速下滑的“biu——”激光声（锯齿波 + 低通，太空游戏经典质感）
  shoot() {
    if (!enabled) return;
    try {
      const ac = getCtx();
      if (!ac) return;
      const t0 = ac.currentTime;
      const osc = ac.createOscillator();
      const filter = ac.createBiquadFilter();
      const gain = ac.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1500, t0);
      osc.frequency.exponentialRampToValueAtTime(150, t0 + 0.2);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, t0);
      filter.frequency.exponentialRampToValueAtTime(700, t0 + 0.2);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.14, t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      osc.connect(filter).connect(gain).connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + 0.24);

      // 叠加一声高频脆响，模拟激光激发瞬间的“噼”
      const zap = ac.createOscillator();
      const zapGain = ac.createGain();
      zap.type = 'square';
      zap.frequency.setValueAtTime(2600, t0);
      zap.frequency.exponentialRampToValueAtTime(900, t0 + 0.06);
      zapGain.gain.setValueAtTime(0.0001, t0);
      zapGain.gain.exponentialRampToValueAtTime(0.06, t0 + 0.005);
      zapGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
      zap.connect(zapGain).connect(ac.destination);
      zap.start(t0);
      zap.stop(t0 + 0.08);
    } catch {}
  },
  // 战机爆炸：白噪声爆裂（低通快速收窄）+ 低频轰鸣，模拟真实爆炸
  boom() {
    if (!enabled) return;
    try {
      const ac = getCtx();
      if (!ac) return;
      const t0 = ac.currentTime;
      const dur = 0.5;

      // 白噪声爆裂
      const bufferSize = Math.floor(ac.sampleRate * dur);
      const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        // 起始噪声强，逐点衰减，尾部更碎
        const decay = 1 - i / bufferSize;
        data[i] = (Math.random() * 2 - 1) * decay * decay;
      }
      const noise = ac.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = ac.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(2400, t0);
      noiseFilter.frequency.exponentialRampToValueAtTime(120, t0 + dur);
      const noiseGain = ac.createGain();
      noiseGain.gain.setValueAtTime(0.0001, t0);
      noiseGain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.01);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      noise.connect(noiseFilter).connect(noiseGain).connect(ac.destination);
      noise.start(t0);
      noise.stop(t0 + dur);

      // 低频轰鸣：机体解体的“咚”
      const rumble = ac.createOscillator();
      const rumbleGain = ac.createGain();
      rumble.type = 'sine';
      rumble.frequency.setValueAtTime(150, t0);
      rumble.frequency.exponentialRampToValueAtTime(42, t0 + 0.4);
      rumbleGain.gain.setValueAtTime(0.0001, t0);
      rumbleGain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.015);
      rumbleGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
      rumble.connect(rumbleGain).connect(ac.destination);
      rumble.start(t0);
      rumble.stop(t0 + 0.45);
    } catch {}
  },
  // 被击：字母砸到地面，低沉警告
  hit() {
    if (!enabled) return;
    try {
      tone(180, 0, 0.18, 'sawtooth', 0.1);
      tone(90, 0.14, 0.22, 'sawtooth', 0.1);
    } catch {}
  }
};

// —— 英文朗读：预选声音 + 引擎预热，消除首次朗读的延迟 ——

let enVoice = null;
function refreshVoices() {
  if (!('speechSynthesis' in window)) return;
  try {
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return;
    // 优先好听的英语女声，其次任意 en-US，再退到任意英语声音
    enVoice =
      voices.find((v) => v.lang === 'en-US' && /Google|Natural|Aria|Zira/i.test(v.name)) ||
      voices.find((v) => (v.lang || '').toLowerCase().startsWith('en-us')) ||
      voices.find((v) => (v.lang || '').toLowerCase().startsWith('en')) ||
      null;
  } catch {}
}

if ('speechSynthesis' in window) {
  refreshVoices();
  // Chrome 的声音列表是异步加载的，多兜几次底
  window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
  setTimeout(refreshVoices, 300);
  setTimeout(refreshVoices, 1200);
}

// 首次用户交互时用一条静音空语音预热合成引擎，之后每次朗读都是即时发声
let speechWarmed = false;
export function warmUpSpeech() {
  if (speechWarmed || !enabled || !('speechSynthesis' in window)) return;
  speechWarmed = true;
  refreshVoices();
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    if (enVoice) u.voice = enVoice;
    window.speechSynthesis.speak(u);
  } catch {}
}

// 用英文语音朗读文本（浏览器支持时使用，失败则静默）
export function speakEnglish(text, { rate = 0.95, pitch = 1.2 } = {}) {
  if (!enabled || !('speechSynthesis' in window)) return;
  try {
    const synth = window.speechSynthesis;
    if (synth.speaking || synth.pending) synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    if (enVoice) u.voice = enVoice; // 显式指定已缓存的声音，免去每次的引擎/声音解析
    u.rate = rate;
    u.pitch = pitch;
    synth.speak(u);
    if (synth.paused) synth.resume(); // 防止个别浏览器把合成器置于暂停态
  } catch {}
}

// 弹奏指定音名的音符（字母歌关卡用，C4~A4 中央音区，triangle 柔和像木琴）
const NOTE_FREQ = { C: 261.63, D: 293.66, E: 329.63, F: 349.23, G: 392.0, A: 440.0, B: 493.88 };
export function playNote(name, duration = 0.3, volume = 0.14) {
  if (!enabled) return;
  const freq = NOTE_FREQ[name];
  if (!freq) return;
  try {
    tone(freq, 0, duration, 'triangle', volume);
  } catch {}
}

// 朗读字母的英文名字：优先播放预生成的真人音频（按键即播零延迟），缺失时回退 TTS
const letterCache = {};
export function speakLetter(letter) {
  const code = typeof letter === 'string' ? letter.toLowerCase() : letter;
  if (!/^[a-z]$/.test(code)) return;
  playSoundFile(`sounds/letters/${code}.mp3`, code.toUpperCase(), letterCache);
}

/* ============================================================
   连击夸奖：预生成的真人神经语音（离线可用、双击 file:// 也能播）
   ============================================================ */

// id -> 相对路径下的 mp3（BASE_URL 在构建后是 './'，保证 file:// 也能找到）
const PRAISE_SOUNDS = {
  awesome: 'sounds/praise/awesome.mp3',
  'great-job': 'sounds/praise/great-job.mp3',
  amazing: 'sounds/praise/amazing.mp3',
  'well-done': 'sounds/praise/well-done.mp3',
  'super-smart': 'sounds/praise/super-smart.mp3',
  bullseye: 'sounds/praise/bullseye.mp3'
};

const praiseCache = {};

// 通用：播放 public 下打包好的语音 mp3（相对路径，file:// 也可用），失败回退 TTS
function playSoundFile(rel, fallbackText, cache) {
  if (!enabled) return;
  try {
    let audio = cache[rel];
    if (!audio) {
      // import.meta.env.BASE_URL：dev 下为 '/'，构建后为 './'
      audio = new Audio(`${import.meta.env.BASE_URL}${rel}`);
      audio.preload = 'auto';
      audio.addEventListener('error', () => speakEnglish(fallbackText), { once: true });
      cache[rel] = audio;
    }
    audio.currentTime = 0; // 允许立即重播
    audio.play().catch(() => speakEnglish(fallbackText));
  } catch {
    speakEnglish(fallbackText);
  }
}

// 播放打包的真人夸奖音频；音频缺失或加载失败时回退到浏览器英文朗读
export function playPraise(id, fallbackText) {
  const rel = PRAISE_SOUNDS[id];
  if (!rel) {
    speakEnglish(fallbackText);
    return;
  }
  playSoundFile(rel, fallbackText, praiseCache);
}

// 闯关成功后播放中文“你真棒！”真人语音
const cheerCache = {};
export function playWinCheer() {
  playSoundFile('sounds/cheer/ni-zhen-bang.mp3', '你真棒', cheerCache);
}
