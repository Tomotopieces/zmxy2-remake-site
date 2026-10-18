// Player-facing copy of the remake page. Facts here describe what the remake actually does (checked against the
// zmxy2-remake project); keep them in sync when the game changes.

export const PLAY_URL = 'https://tomotopieces.github.io/zmxy2-remake/';
export const REPO_URL = 'https://github.com/Tomotopieces/zmxy2-remake';

// the scenery before / after the remake's lighting (screenshots of the game, the left one with the lighting off)
export const SHOTS_COMPARE = [
  { id: '2-2', name: '阎罗殿', text: '殿内压暗成冷紫色，挂灯和吊灯各有一团摇曳的暖光，空中飘着少量灰烬。' },
  { id: '3-1', name: '忘川河', text: '冷青色的夜和贴水的雾，船头灯与路灯照亮周围，背景鬼火像烟一样扭动。' },
  { id: '4-1', name: '转轮殿', text: '星空背景加上会闪烁的星星，前景的物体有一圈冷色轮廓光。' },
];
export const SHOTS = [
  { id: '1-1', name: '鬼城' },
  { id: '8-1', name: '水晶宫' },
  { id: '10-1', name: '螺旋地狱' },
];

export const FEATURES = [
  { title: '原汁原味的手感', text: '移动、跳跃、连招节奏、技能冷却与伤害公式都按原版数值重建，熟悉的打法照样好用。' },
  { title: '全部关卡与 Boss', text: '主线十关、白骨秘境、牛魔谷、十八层地狱、活大地狱、螺旋地狱，以及中秋、七夕、国庆活动关。' },
  { title: '重新绘制的场景氛围', text: '每一关按主题重做了光影：鬼城的月光与雾、阎罗殿的灯火、忘川河的水面与鬼火、转轮殿的星空。' },
  { title: '现代平台运行', text: '不再需要 Flash：Windows 桌面版与网页版，支持手柄、全屏和本地存档。' },
];

export const KEPT = [
  '三位主角：孙悟空、唐僧、猪八戒（首次击败红孩儿后解锁八戒），各自的五个主动技能与五个被动技能',
  '装备、法宝、时装、翅膀与道具，品质、属性范围与原版相同',
  '炼丹炉：强化、合成配方与成功率；法宝成长率、五行与升级',
  '灵魂与功勋两种货币，商城的商品与价格',
  '无双（变身）、连击保护、受击与击退手感',
  '每个 Boss 的招式、阶段与 AI 行为',
  '隐藏关与进入方式，例如用阎罗令开启十八层地狱、用避水珠进入活大地狱',
  '原版的美术、音乐与音效',
];

export const CHANGED = [
  '用 Godot 4 原生重写，不再依赖 Flash，桌面与网页都能玩',
  '每一关都有新的光影与环境效果（雾、雨、雷电、灯火、水面、星空等）',
  'Boss 被击败时的子弹时间；无敌状态有明确的辉光提示',
  '界面重新排版：背包与法宝面板改为对齐的属性栏，文字换成清晰的矢量字体',
  '面板淡入淡出、场景切换的黑场转场',
  '全界面手柄操作；F11 全屏；随时调节音量或静音',
  '修正了原版的一些问题，例如投射物的攻击判定会跟随飞行物移动',
];

export const REMOVED = [
  '双人模式（单人游玩）',
  '4399 账号、排行榜、提交分数与在线存档（改为本地存档）',
  '赠送物品等依赖双人或网络的功能',
];

// [action, keyboard, gamepad] — the same for all three heroes
export const KEYS: [string, string, string][] = [
  ['移动', 'A / D', '左摇杆 / 十字键'],
  ['跑步', '快速按两次 A / D', '快速推两次摇杆 / 按两次十字键，或移动时按 LB'],
  ['跳跃 / 二段跳', 'K（空中再按一次）', 'A'],
  ['从平台上跳下', 'S + K', '下 + A'],
  ['普通攻击', 'J', 'X'],
  ['进入传送门', 'W', '上'],
  ['技能 1 ~ 4', 'U / I / O / L', 'RB / Y / RT / R3'],
  ['无双（怒气满时变身）', '空格', 'LT'],
  ['法宝技能', 'H', 'B'],
  ['背包 / 技能 / 法宝', 'C / V / B', 'Back（背包）'],
  ['暂停 / 返回', 'Esc', 'Start；菜单里 B 返回'],
  ['菜单选择 / 确认', '鼠标', '十字键或左摇杆 / A'],
  ['音量减 / 加 / 静音', '- / = / M', '—'],
  ['全屏', 'F11', '—'],
];

// skills are learned with souls in the skill panel; [input, name]
export const HERO_SKILLS: { hero: string; skills: [string, string][] }[] = [
  { hero: '孙悟空', skills: [['W + J', '升龙斩'], ['跑动中 J', '火炎突击'], ['U', '烈焰闪'], ['I', '烈焰风暴'], ['O', '火魔斩']] },
  { hero: '唐僧', skills: [['按住 J', '冰龙斩（蓄力）'], ['U', '玄冰阵'], ['I', '水幻影（再按 I 传送到幻影处）'], ['O', '天降甘露'], ['L', '水魔爆']] },
  { hero: '猪八戒', skills: [['U', '碎石破'], ['I', '土流盾'], ['O', '地滚战车'], ['W + J', '战争怒吼'], ['L', '土魔刺（再按 L 射出飞刺）']] },
];

export const HEROES = [
  { id: 'wukong', name: '孙悟空', text: '近战连招与爆发，火魔斩、烈焰闪。' },
  { id: 'tangseng', name: '唐僧', text: '远程法术与控制，冰龙斩、天降甘露。' },
  { id: 'bajie', name: '猪八戒', text: '厚血与反伤，土流盾、土魔刺。' },
];
