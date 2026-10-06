// 键盘布局、手指分区与游戏关卡数据（美式 QWERTY 布局）

// 八个手指 + 大拇指的配色与名称
export const FINGERS = {
  LP: { name: '左手小指', hand: '左手', color: '#f87171' },
  LR: { name: '左手无名指', hand: '左手', color: '#fb923c' },
  LM: { name: '左手中指', hand: '左手', color: '#facc15' },
  LI: { name: '左手食指', hand: '左手', color: '#4ade80' },
  RI: { name: '右手食指', hand: '右手', color: '#2dd4bf' },
  RM: { name: '右手中指', hand: '右手', color: '#60a5fa' },
  RR: { name: '右手无名指', hand: '右手', color: '#a78bfa' },
  RP: { name: '右手小指', hand: '右手', color: '#f472b6' },
  TH: { name: '大拇指（空格）', hand: '双手', color: '#94a3b8' }
};

// 每个字母键对应的手指
export const KEY_FINGER = {
  q: 'LP', a: 'LP', z: 'LP',
  w: 'LR', s: 'LR', x: 'LR',
  e: 'LM', d: 'LM', c: 'LM',
  r: 'LI', f: 'LI', v: 'LI', t: 'LI', g: 'LI', b: 'LI',
  y: 'RI', h: 'RI', n: 'RI', u: 'RI', j: 'RI', m: 'RI',
  i: 'RM', k: 'RM', ',': 'RM',
  o: 'RR', l: 'RR', '.': 'RR',
  p: 'RP', ';': 'RP', '/': 'RP',
  ' ': 'TH'
};

// 26 个字母（键盘顺序）
export const LETTERS = 'qwertyuiopasdfghjklzxcvbnm'.split('');

// 键位小知识
export const KEY_TIPS = {
  f: 'F 键上有一个小凸起，左手食指的“家”就在这里！',
  j: 'J 键上也有一个小凸起，右手食指放在这里，准备出发！',
  ' ': '长长的空格键用大拇指敲，像按小喇叭一样～'
};

const key = (code, label = code, w = 1, special = false) => ({ code, label, w, special });

// 屏幕键盘的五排布局
export const KEYBOARD_ROWS = [
  [
    key('`'), key('1'), key('2'), key('3'), key('4'), key('5'),
    key('6'), key('7'), key('8'), key('9'), key('0'), key('-'), key('='),
    key('Backspace', '⌫ 退格', 2, true)
  ],
  [
    key('Tab', 'Tab', 1.5, true),
    ...'qwertyuiop'.split('').map((c) => key(c, c.toUpperCase())),
    key('['), key(']'), key('\\', '\\', 1.5, true)
  ],
  [
    key('CapsLock', '大写', 1.75, true),
    ...'asdfghjkl'.split('').map((c) => key(c, c.toUpperCase())),
    key(';'), key("'"),
    key('Enter', '回车 ↵', 2.25, true)
  ],
  [
    key('ShiftLeft', '⇧ 上档', 2.25, true),
    ...'zxcvbnm'.split('').map((c) => key(c, c.toUpperCase())),
    key(','), key('.'), key('/'),
    key('ShiftRight', '⇧ 上档', 2.25, true)
  ],
  [
    key('ControlLeft', 'Ctrl', 1.5, true),
    key('AltLeft', 'Alt', 1.5, true),
    key(' ', '空格', 9),
    key('AltRight', 'Alt', 1.5, true),
    key('ControlRight', 'Ctrl', 1.5, true)
  ]
];

// 键位所在排
export function rowNameOf(code) {
  if ('qwertyuiop'.includes(code)) return '上排';
  if ('asdfghjkl'.includes(code)) return '主键位行（中间一排）';
  if ('zxcvbnm'.includes(code)) return '下排';
  if (code === ' ') return '最下面长长的一排';
  return '';
}

// ============================================================
// 键盘四大分区（认识键盘 · 功能键页签）
// ============================================================

export const REGIONS = {
  letter: {
    id: 'letter',
    name: '字母区',
    emoji: '🔤',
    color: '#4ade80',
    desc: '26 个英文字母 A～Z 的家，打字时最常用的区域。它们已经在「第 1 关 · 认识字母键」里认识过啦！'
  },
  number: {
    id: 'number',
    name: '数字区',
    emoji: '🔢',
    color: '#60a5fa',
    desc: '键盘最上面一排：0～9 十个数字，还有 `-`、`=` 等符号。输入年龄、分数、电话号码都要用到。'
  },
  symbol: {
    id: 'symbol',
    name: '符号区',
    emoji: '✨',
    color: '#a78bfa',
    desc: '标点符号们住在这里：逗号、句号、分号、引号、中括号、斜杠……写句子和写代码都离不开它们。'
  },
  func: {
    id: 'func',
    name: '功能键区',
    emoji: '🎛️',
    color: '#fb923c',
    desc: '这些键不打出字母，而是帮我们「做事」：换行、擦掉、变大写、留空格，还有要和别的键组队的 Ctrl、Alt。点一点橙色的键，看看每个键有什么本领！'
  }
};

// 每个键所属分区
export const KEY_REGION_OF = (() => {
  const m = {};
  for (const c of 'abcdefghijklmnopqrstuvwxyz') m[c] = 'letter';
  for (const c of ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=']) m[c] = 'number';
  for (const c of ['[', ']', '\\', ';', "'", ',', '.', '/']) m[c] = 'symbol';
  for (const c of ['Tab', 'CapsLock', 'ShiftLeft', 'ShiftRight', 'Enter', 'Backspace', ' ',
    'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight']) m[c] = 'func';
  return m;
})();

// 功能键区每个键的介绍（左右 Shift 共用一条）
export const FUNCTION_KEYS = [
  {
    code: 'ShiftLeft',
    also: ['ShiftRight'],
    emoji: '⇧',
    name: '上档键 Shift',
    desc: '按住它不放，再按字母键，就能打出大写字母；按住它再按数字键，可以打出数字上面的符号。键盘左右各有一个，哪边顺手用哪边。',
    example: '🐘 打 Python 里的 True、False、None 时，就要按住 Shift 再按字母！'
  },
  {
    code: 'CapsLock',
    emoji: '🅰️',
    name: '大写锁定键',
    desc: '按一下，键盘上的小灯亮起来，之后打出的字母全部是大写；再按一下灯灭了，就恢复成小写。要连续打很多大写字母时，用它比一直按着 Shift 更省力。',
    example: '💡 打一整串大写字母时用它最合适。'
  },
  {
    code: 'ControlLeft',
    also: ['ControlRight'],
    emoji: '🎛️',
    name: '控制键 Ctrl',
    desc: '它单独按没有反应，要和别的键「组队」一起按，能变出好多快捷本领。键盘左右下角各有一个。',
    example: '✨ Ctrl+C 复制、Ctrl+V 粘贴、Ctrl+Z 撤销——以后在电脑里会经常用到！'
  },
  {
    code: 'AltLeft',
    also: ['AltRight'],
    emoji: '🔀',
    name: '可选键 Alt',
    desc: '它和 Ctrl 一样，也是和别的键「组队」使用的；在很多软件的菜单里，按住 Alt 再按字母就能打开菜单。空格键两边各有一个。',
    example: '💡 现在先认识它就好，等用电脑更熟练了再学它的快捷键。'
  },
  {
    code: 'Enter',
    emoji: '↵',
    name: '回车键',
    desc: '写完一行字，按它就换到下一行；在很多游戏和软件里，它也表示「确定、开始」。',
    example: '🎮 字母歌大合唱里，按 Enter 就能直接开始。'
  },
  {
    code: 'Backspace',
    emoji: '⌫',
    name: '退格键',
    desc: '写错字了别着急！按一下它，就擦掉光标前面的一个字，连按可以连续擦掉。',
    example: '🧽 它就像键盘上的小橡皮。'
  },
  {
    code: 'Tab',
    emoji: '➡️',
    name: '制表键 Tab',
    desc: '按一下会空出整齐的一小段。写代码时用它让每一行排得整整齐齐，这叫「缩进」；在表格或按钮之间，按它还能跳来跳去。',
    example: '🐍 Python 里每一行代码开头的小空位，常用 Tab 来空。'
  },
  {
    code: ' ',
    emoji: '⬜',
    name: '空格键',
    desc: '键盘最下面最长最长的键，用大拇指按。它在单词和单词之间留出空格。',
    example: '🐶 打 cat dog 时，两个单词中间的空隙就是它。'
  }
];

export const FUNCTION_INFO = (() => {
  const m = {};
  for (const f of FUNCTION_KEYS) {
    m[f.code] = f;
    for (const a of f.also || []) m[a] = f;
  }
  return m;
})();

// 「找键位闯关」关卡
export const FIND_LEVELS = [
  {
    name: '主键位安家',
    emoji: '🏠',
    desc: 'F 和 J 上有小凸起，先把食指送回家',
    keys: ['f', 'j', 'd', 'k', 's', 'l', 'a']
  },
  {
    name: '上排探险',
    emoji: '⬆️',
    desc: '主键位往上一排，认识 QWERTYUIOP',
    keys: 'qwertyuiop'.split('')
  },
  {
    name: '下排寻宝',
    emoji: '⬇️',
    desc: '主键位往下一排，认识 ZXCVBNM',
    keys: 'zxcvbnm'.split('')
  },
  {
    name: '字母大闯关',
    emoji: '🏆',
    desc: '26 个字母混合出场，终极挑战',
    keys: LETTERS.slice()
  },
  {
    name: '字母歌大合唱',
    emoji: '🎵',
    desc: '按 A→Z 顺序按键弹奏字母歌，按错或停顿 2 秒就要从头再来',
    keys: LETTERS.slice(),
    special: 'abcSong'
  },
  {
    name: '星球大战',
    emoji: '🚀',
    desc: '字母从天上掉下来啦，按下对应键把它们射落！别让它们砸到地面',
    keys: LETTERS.slice(),
    special: 'shooter'
  }
];

// 星球大战射击闯关配置
export const SHOOTER_CONFIG = {
  totalLetters: 30,
  maxLives: 3
};

// 字母歌关卡：26 个字母依次对应的音符（旋律取自《小星星》/ABC Song）
// A-G / H-N 两句之后，T 和 Z 唱长音（和原曲一致）
const ABC_NOTE_NAMES = [
  'C', 'C', 'G', 'G', 'A', 'A', 'G',
  'F', 'F', 'E', 'E', 'D', 'D', 'C',
  'G', 'G', 'F', 'F', 'E', 'D',
  'G', 'G', 'F', 'F', 'E', 'D'
];
export const ABC_SONG = {
  // 每个字母按下时播放的音符；T（下标19）、Z（下标25）为长音
  notes: ABC_NOTE_NAMES.map((note, i) => ({
    note,
    dur: i === 19 || i === 25 ? 0.72 : 0.3
  })),
  // 唱完 Z 之后自动演奏的收尾句（“Next time won't you sing with me”）
  outro: [
    { note: 'F', dur: 0.26 }, { note: 'F', dur: 0.26 },
    { note: 'E', dur: 0.26 }, { note: 'E', dur: 0.26 },
    { note: 'D', dur: 0.26 }, { note: 'D', dur: 0.26 },
    { note: 'C', dur: 0.72 }
  ],
  // 歌词分句位置（用于字母轨的视觉分组）
  groupStart: [0, 7, 14, 20],
  timeoutMs: 2000
};

// 「趣味练打字」课程
const toLine = (l) => (typeof l === 'string' ? { text: l, emoji: '', note: '' } : l);

export const TYPE_LESSONS = [
  {
    name: '主键位热身',
    emoji: '🏠',
    desc: '只练中间一排，手指别离开家哦',
    lines: [
      'fjfj fjfj',
      'jfjf jfjf',
      'dkdk dkdk',
      'slsl slsl',
      'aaa jjj',
      'dad asks',
      'salad fall',
      'lass lad',
      'asdf jkl;',
      'a;sldkfj',
      'ffjj dkdk',
      'jazz lad',
      'dad lass',
      'ask dad',
      'fall salad',
      'fad jak'
    ].map(toLine)
  },
  {
    name: '加上排字母',
    emoji: '⬆️',
    desc: '加入 QWERTYUIOP，可以打很多单词啦',
    lines: [
      'hello',
      'world',
      'type fast',
      'super hero',
      'i like you',
      'play together',
      'quiet people',
      'you are super',
      'quiet tree',
      'pop quiz',
      'write it',
      'top type',
      'we are here',
      'pretty puppy',
      'try your best',
      'happy writer'
    ].map(toLine)
  },
  {
    name: '单词连连看',
    emoji: '🐱',
    desc: '三排字母全用上，边打字边认单词',
    lines: [
      { text: 'dog', emoji: '🐶', note: '小狗' },
      { text: 'cat', emoji: '🐱', note: '小猫' },
      { text: 'sun', emoji: '☀️', note: '太阳' },
      { text: 'fish', emoji: '🐟', note: '小鱼' },
      { text: 'bird', emoji: '🐦', note: '小鸟' },
      { text: 'apple', emoji: '🍎', note: '苹果' },
      { text: 'banana', emoji: '🍌', note: '香蕉' },
      { text: 'monkey', emoji: '🐒', note: '猴子' },
      { text: 'rabbit', emoji: '🐰', note: '兔子' },
      { text: 'pig', emoji: '🐷', note: '小猪' },
      { text: 'duck', emoji: '🦆', note: '鸭子' },
      { text: 'bear', emoji: '🐻', note: '小熊' },
      { text: 'tiger', emoji: '🐯', note: '老虎' },
      { text: 'horse', emoji: '🐴', note: '小马' },
      { text: 'flower', emoji: '🌸', note: '花朵' },
      { text: 'orange', emoji: '🍊', note: '橙子' },
      { text: 'grape', emoji: '🍇', note: '葡萄' },
      { text: 'turtle', emoji: '🐢', note: '乌龟' }
    ]
  },
  {
    name: '拼音小达人',
    emoji: '🀄',
    desc: '用英文字母拼出我们会说的中文',
    lines: [
      { text: 'mama', emoji: '👩', note: '妈妈' },
      { text: 'baba', emoji: '👨', note: '爸爸' },
      { text: 'ni hao', emoji: '👋', note: '你好' },
      { text: 'xiexie', emoji: '🙏', note: '谢谢' },
      { text: 'wo ai ni', emoji: '❤️', note: '我爱你' },
      { text: 'xiao niao', emoji: '🐤', note: '小鸟' },
      { text: 'da ji mu', emoji: '🧱', note: '搭积木' },
      { text: 'shang xue', emoji: '🏫', note: '上学' },
      { text: 'xiao peng you', emoji: '🧒', note: '小朋友' },
      { text: 'yeye', emoji: '👴', note: '爷爷' },
      { text: 'nainai', emoji: '👵', note: '奶奶' },
      { text: 'gege', emoji: '👦', note: '哥哥' },
      { text: 'jiejie', emoji: '👧', note: '姐姐' },
      { text: 'chi fan', emoji: '🍚', note: '吃饭' },
      { text: 'shui jiao', emoji: '😴', note: '睡觉' },
      { text: 'qi zi xing che', emoji: '🚲', note: '骑自行车' },
      { text: 'tiao sheng', emoji: '🪢', note: '跳绳' },
      { text: 'chang ge', emoji: '🎤', note: '唱歌' }
    ]
  },
  {
    name: '小小句子家',
    emoji: '🌈',
    desc: '挑战完整的短句，你一定行！',
    lines: [
      { text: 'i love you', emoji: '💖', note: '我爱你' },
      { text: 'good job', emoji: '👍', note: '做得好' },
      { text: 'happy day', emoji: '😄', note: '快乐的一天' },
      { text: 'you are great', emoji: '🌟', note: '你真棒' },
      { text: 'keep going', emoji: '🔥', note: '继续加油' },
      { text: 'never give up', emoji: '🚀', note: '永不放弃' },
      { text: 'good morning', emoji: '🌅', note: '早上好' },
      { text: 'see you later', emoji: '👋', note: '回头见' },
      { text: 'i can do it', emoji: '💪', note: '我能做到' },
      { text: 'we are friends', emoji: '🤝', note: '我们是朋友' },
      { text: 'have a nice day', emoji: '🌞', note: '祝你愉快' },
      { text: 'practice makes perfect', emoji: '🎯', note: '熟能生巧' }
    ]
  },
  {
    name: 'Python 小程序员',
    emoji: '🐍',
    desc: '练习 Python 关键字和常用内置函数，大写字母要用 Shift 哦',
    lines: [
      { text: 'if else elif', emoji: '🤔', note: '如果 · 否则 · 否则如果' },
      { text: 'True False None', emoji: '⚪', note: '真 · 假 · 空（开头大写，按住 Shift）' },
      { text: 'for while in break continue', emoji: '🔄', note: 'for 循环 · while 循环 · 跳出 · 继续' },
      { text: 'def return pass lambda', emoji: '🛠️', note: '定义函数 · 返回 · 占位 · 匿名函数' },
      { text: 'print input int str float', emoji: '🖨️', note: '打印 · 输入 · 整数 · 字符串 · 小数' },
      { text: 'list dict set tuple', emoji: '📦', note: '列表 · 字典 · 集合 · 元组' },
      { text: 'len range sum min max', emoji: '📏', note: '长度 · 范围 · 求和 · 最小 · 最大' },
      { text: 'sorted enumerate zip map filter', emoji: '🧰', note: '排序 · 枚举 · 配对 · 映射 · 筛选' },
      { text: 'import from as try except', emoji: '📥', note: '导入 · 来自 · 命名 · 尝试 · 捕获异常' },
      { text: 'and or not is class', emoji: '🧩', note: '与 · 或 · 非 · 是同一对象 · 类' },
      { text: 'type isinstance open round', emoji: '🔍', note: '查类型 · 判断类型 · 打开文件 · 四舍五入' },
      { text: 'global nonlocal del raise assert', emoji: '🚦', note: '全局 · 局部外层 · 删除 · 抛出 · 断言' },
      { text: 'async await yield with next', emoji: '⚡', note: '异步 · 等待 · 生成 · 上下文 · 下一个' }
    ]
  }
];
