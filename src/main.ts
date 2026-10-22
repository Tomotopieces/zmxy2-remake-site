import './style.css';
import itemsData from './data/items.json';
import monstersData from './data/monsters.json';
import guideMd from '../public/guide.md?raw';
import { CHANGED, CHANGELOG, FEATURES, HERO_SKILLS, HEROES, KEPT, KEYS, PLAY_URL, REMOVED, SHOTS } from './content';

// ------------------------------------------------------------------ data
interface Item {
  id: string; name: string; py: string[]; type: string; user: string; quality: string; color: number[] | null;
  value: number; stats: Record<string, number[]>; desc: string; descSource: string; skill: string; icon: string | null;
  recipes?: string[][]; shopPrice?: number; growth?: number[];
}
interface Monster {
  id: number; name: string; unnamed: boolean; py: string[]; boss: boolean; hp: number; def: number; mdef: number;
  exp: number; souls: number; speed: number; drops: string[]; dropChance: number; title: string; intro: string;
  skills: string; stages: string[]; portrait: string | null; forms?: { label: string; hp: number; def: number; drops: string[]; dropChance: number }[];
}
const ITEMS = itemsData as Item[];
const MONSTERS = monstersData as Monster[];
const ITEM_BY_NAME = new Map(ITEMS.map((i) => [i.name, i]));

const QUALITIES = ['普通', '优秀', '精良', '史诗', '传说'];
const Q_COLOR: Record<string, string> = { 普通: '#e9e3d8', 优秀: '#62c96b', 精良: '#5aa7ef', 史诗: '#b678ef', 传说: '#f29a3a' };
const TYPES = ['武器', '防具', '饰品', '法宝', '翅膀', '时装', '道具'];
const USERS = ['孙悟空', '唐僧', '猪八戒'];
const STAGE_ORDER = ['鬼城', '无常巷', '鬼门关', '接引院', '判官殿', '阎罗殿', '忘川河', '奈何桥', '望乡台', '转轮殿',
  '白骨秘境', '牛魔谷', '十八层地狱', '活大地狱', '螺旋地狱', '七夕活动', '国庆活动'];
const STAT_NAMES: [string, string, boolean][] = [['atk', '攻击', false], ['def', '防御', false], ['hp', '生命', false], ['mp', '魔法', false],
  ['crit', '暴击', true], ['miss', '闪避', true], ['hp_regen', '回血', false], ['mp_regen', '回魔', false],
  ['lifesteal', '吸血', true], ['mdef', '魔抗', true], ['deephit', '重击', true]];

const qColor = (q: string) => Q_COLOR[q] ?? '#e8b75a';
const asset = (p: string) => import.meta.env.BASE_URL + p;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const fmt = (n: number) => n.toLocaleString('zh-CN');
const monsterLabel = (m: Monster) => m.name || '无名小怪';

function statText(k: string, r: number[]): string {
  const pct = STAT_NAMES.find((s) => s[0] === k)?.[2];
  const f = (v: number) => (pct ? `${Math.round(v * 100)}%` : fmt(v));
  return r[0] === r[1] ? f(r[0]) : `${f(r[0])} ~ ${f(r[1])}`;
}

// ------------------------------------------------------------------ search
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');
const itemHay = new Map(ITEMS.map((i) => [i, norm([i.name, ...i.py, i.type, i.user, i.quality, i.desc, i.skill, ...(i.recipes ?? []).flat(),
  ...MONSTERS.filter((m) => m.drops.includes(i.name)).map(monsterLabel)].join('|'))]));
const monsterHay = new Map(MONSTERS.map((m) => [m, norm([monsterLabel(m), ...m.py, m.title, m.intro, m.skills, ...m.stages, ...m.drops, m.boss ? 'boss' : ''].join('|'))]));
const matches = (hay: string, q: string) => norm(q).split(/[,，]/).every((t) => !t || hay.includes(t));

// ------------------------------------------------------------------ routing
type Query = Record<string, string>;
function parseHash(): { route: string; q: Query } {
  const [p, qs] = location.hash.replace(/^#\/?/, '').split('?');
  return { route: p || 'home', q: Object.fromEntries(new URLSearchParams(qs ?? '')) };
}
function setQuery(q: Query, replace = true) {
  const { route } = parseHash();
  const s = new URLSearchParams(Object.entries(q).filter(([, v]) => v)).toString();
  const h = `#/${route}${s ? '?' + s : ''}`;
  if (replace) history.replaceState(null, '', h); else location.hash = h;
}

const main = document.getElementById('main')!;
const icon = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
};

document.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-scroll]');
  if (!a) return;
  e.preventDefault();
  document.getElementById(a.dataset.scroll!)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

function render() {
  const { route, q } = parseHash();
  if (gameFrame && route !== 'play') hideGame();
  document.querySelectorAll<HTMLAnchorElement>('.nav a').forEach((a) => {
    if (a.dataset.route === route) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  const title: Record<string, string> = { home: '', play: '开始游戏 · ', enemies: '敌人图鉴 · ', items: '物品图鉴 · ', log: '更新日志 · ', guide: '游戏指南 · ' };
  document.body.classList.toggle('playing', route === 'play');
  document.title = `${title[route] ?? ''}造梦西游2 重制版 · zmxy2-remake`;
  if (route === 'play') renderPlay();
  else if (route === 'enemies') renderEnemies(q);
  else if (route === 'items') renderItems(q);
  else if (route === 'log') renderLog();
  else if (route === 'guide') renderGuide();
  else {
    renderHome();
    if (route === 'remake') document.getElementById('changes')?.scrollIntoView();   // the old 重制说明 tab
  }
}

// ------------------------------------------------------------------ home
function renderHome() {
  const bossCount = MONSTERS.filter((m) => m.boss).length;
  main.innerHTML = `<div class="view">
    <section class="hero" aria-label="造梦西游2 重制版">
      <div class="hero-text">
        <h1>造梦西游2<span class="seal">重制版</span><small>十殿阎罗篇</small></h1>
        <p>那个熟悉的造梦西游2，在 Godot 4 里重新造了一遍。原版的手感、数值和关卡都在，场景氛围重新绘制，不再需要 Flash。</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="#/play">开始游戏</a>
          <a class="btn" href="#changes" data-scroll="changes">看看改了什么</a>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="h-heroes">
      <div class="section-head"><div><h2 id="h-heroes">取经三人组</h2></div></div>
      <div class="heroes">${HEROES.map((h) => `<article class="hero-card">
        <div class="art"><img src="${asset(`img/heroes/${h.id}.png`)}" alt="${h.name}" loading="lazy"></div>
        <h3>${h.name}</h3><p>${h.text}</p></article>`).join('')}</div>
    </section>

    <section class="section" aria-labelledby="h-feat">
      <div class="section-head"><div><h2 id="h-feat">重制版特点</h2></div></div>
      <div class="features">${FEATURES.map((f, i) => `<article class="feature"><div class="no">0${i + 1}</div><h3>${f.title}</h3><p>${f.text}</p></article>`).join('')}</div>
    </section>

    <section class="section" aria-labelledby="h-shots">
      <div class="section-head"><div><h2 id="h-shots">画面升级</h2></div></div>
      <div class="shots">${SHOTS.map((c) => `<article class="shot-card${c.before ? ' wide' : ''}">
        <h3>${c.name}</h3>
        <div class="pair">${c.before ? `<div><img src="${asset(`img/shots/${c.id}_raw.webp`)}" alt="${c.name} 原版画面" loading="lazy"><span>原版</span></div>` : ''}
          <div><img src="${asset(`img/shots/${c.id}.webp`)}" alt="${c.name} 重制版画面" loading="lazy"></div></div>
        <p>${c.text}</p></article>`).join('')}</div>
    </section>

    <section class="section" id="changes" aria-labelledby="h-changes">
      <div class="section-head"><div><h2 id="h-changes">改了什么</h2></div></div>
      <div class="compare">
        ${col('保留的原版内容', '#62c96b', KEPT)}
        ${col('重制版的变化', '#e8b75a', CHANGED)}
        ${col('移除的内容', '#d64532', REMOVED)}
      </div>
    </section>

    <section class="section" aria-labelledby="h-dex">
      <div class="section-head"><div><h2 id="h-dex">图鉴</h2></div></div>
      <div class="shortcuts">
        <a class="shortcut" href="#/enemies"><img src="${asset('img/monsters/monster46.png')}" alt="" loading="lazy">
          <div><h3>敌人图鉴</h3><p>${MONSTERS.length} 种敌人，其中 ${bossCount} 个 Boss</p></div></a>
        <a class="shortcut" href="#/items"><img src="${asset('img/items/tsgj.png')}" alt="" loading="lazy">
          <div><h3>物品图鉴</h3><p>${ITEMS.length} 件装备、法宝、时装与道具</p></div></a>
      </div>
    </section>
  </div>`;
}

// ------------------------------------------------------------------ changelog
// ------------------------------------------------------------------ guide (public/guide.md, also served raw for agents)
function inline(s: string) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>');
}
function markdown(md: string) {
  const out: string[] = [];
  const lines = md.split('\n').map((x) => x.replace(/\s+$/, ''));
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith('# ')) continue;   // the page head says it
    if (l.startsWith('## ')) { const t = l.slice(3); out.push(`<h2 id="g-${encodeURIComponent(t)}">${inline(t)}</h2>`); continue; }
    if (l.startsWith('|')) {
      const rows: string[][] = [];
      for (; i < lines.length && lines[i].startsWith('|'); i++) rows.push(lines[i].slice(1, -1).split('|').map((c) => c.trim()));
      i--;
      const [head, , ...body] = rows;
      out.push(`<div class="table-wrap"><table class="guide-table"><thead><tr>${head.map((c) => `<th scope="col">${inline(c)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c, k) => k === 0 ? `<th scope="row">${inline(c)}</th>` : `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (l.startsWith('- ')) {
      const items: string[] = [];
      for (; i < lines.length && lines[i].startsWith('- '); i++) items.push(lines[i].slice(2));
      i--;
      out.push(`<ul>${items.map((x) => `<li>${inline(x)}</li>`).join('')}</ul>`);
      continue;
    }
    if (l.trim()) out.push(`<p>${inline(l)}</p>`);
  }
  return out.join('\n');
}
function renderGuide() {
  const toc = [...guideMd.matchAll(/^## (.+)$/gm)].map((x) => x[1]);
  main.innerHTML = `<div class="view guide">
    <div class="page-head"><h1>游戏指南</h1><p>原始文本：<a href="${asset('guide.md')}">guide.md</a></p></div>
    <nav class="guide-toc" aria-label="目录">${toc.map((t) => `<a href="#g-${encodeURIComponent(t)}" data-scroll="g-${encodeURIComponent(t)}">${esc(t)}</a>`).join('')}</nav>
    ${markdown(guideMd)}
  </div>`;
}

function renderLog() {
  main.innerHTML = `<div class="view">
    <div class="page-head"><h1>更新日志</h1></div>
    ${CHANGELOG.map((v) => `<article class="log-entry"><header><h2>${v.version}</h2><span>${v.date}</span></header>
      ${v.groups.map(([g, list]) => `<section><h3>${g}</h3><ul>${list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>`).join('')}</article>`).join('')}
  </div>`;
}

function col(t: string, c: string, list: string[]) {
  return `<section class="col" style="--c:${c}"><h2><span class="dot"></span>${t}</h2><ul>${list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>`;
}

function keysTable() {
  return `<div class="table-wrap"><table class="keys-table"><thead><tr><th scope="col">操作</th><th scope="col">键盘</th><th scope="col">手柄</th></tr></thead>
    <tbody>${KEYS.map(([a, k, p]) => `<tr><th scope="row">${a}</th><td><kbd>${k}</kbd></td><td>${p === '—' ? '<span class="na">—</span>' : `<kbd>${p}</kbd>`}</td></tr>`).join('')}</tbody></table></div>`;
}

// ------------------------------------------------------------------ play (the web build in a frame)
let gameFrame: HTMLIFrameElement | null = null;
function renderPlay() {
  main.innerHTML = `<div class="view play">
    <div class="play-head"><h1>开始游戏</h1>
      <p>切换到其他页签不会停止游戏，切回来就能继续玩。</p>
      <div class="hero-actions"><button class="btn" id="fs">全屏</button><a class="btn" href="${PLAY_URL}" target="_blank" rel="noopener">在新窗口打开</a></div></div>
    <div class="frame" id="frame-slot"></div>
    <section class="section" aria-labelledby="h-keys">
      <div class="section-head"><div><h2 id="h-keys">键位</h2></div></div>
      ${keysTable()}
    </section>
    <section class="section" aria-labelledby="h-skills">
      <div class="section-head"><div><h2 id="h-skills">各角色技能</h2></div></div>
      <div class="skills">${HERO_SKILLS.map((h) => `<section class="skill-card"><h3>${h.hero}</h3><dl>${h.skills.map(([k, n]) => `<div><dt><kbd>${k}</kbd></dt><dd>${n}</dd></div>`).join('')}</dl></section>`).join('')}</div>
    </section></div>`;
  // one frame for the whole visit: going to another tab and back keeps the game running
  if (!gameFrame) {
    gameFrame = document.createElement('iframe');
    gameFrame.src = PLAY_URL;
    gameFrame.title = '造梦西游2 重制版';
    gameFrame.allow = 'fullscreen; gamepad; autoplay';
    gameFrame.setAttribute('allowfullscreen', '');
  }
  const dock = document.getElementById('game-dock')!;
  if (!gameFrame.isConnected) dock.appendChild(gameFrame);
  dock.hidden = false;
  slotWatch.disconnect();
  slotWatch.observe(document.getElementById('frame-slot')!);
  placeGame();
  gameFrame.contentWindow?.postMessage({ zmxy2: 'visible' }, '*');
  gameFrame.focus();
  document.getElementById('fs')!.addEventListener('click', () => gameFrame!.requestFullscreen());
}

// the dock sits over the page's #frame-slot box (fixed size, aspect 940:590)
function placeGame() {
  const slot = document.getElementById('frame-slot');
  const dock = document.getElementById('game-dock')!;
  if (!slot || dock.hidden) return;
  const r = slot.getBoundingClientRect();
  Object.assign(dock.style, { left: `${r.left + scrollX}px`, top: `${r.top + scrollY}px`, width: `${r.width}px`, height: `${r.height}px` });
}
// leaving the tab: the game is told so it mutes and pauses (it keeps its state for when the tab comes back)
function hideGame() {
  document.getElementById('game-dock')!.hidden = true;
  gameFrame?.contentWindow?.postMessage({ zmxy2: 'hidden' }, '*');
}
window.addEventListener('resize', placeGame);
const slotWatch = new ResizeObserver(placeGame);

// ------------------------------------------------------------------ shared dex toolbar
function chips(name: string, values: string[], current: string, color?: (v: string) => string) {
  return values.map((v) => `<button class="chip" data-f="${name}" data-v="${esc(v)}" aria-pressed="${current === v}"${color ? ` style="--cc:${color(v)}"` : ''}>${esc(v)}</button>`).join('');
}
function toolbar(placeholder: string, q: Query, groups: string, extra = '') {
  return `<div class="toolbar">
    <label class="search">${icon.search}<span class="skip">搜索</span>
      <input type="search" id="q" value="${esc(q.q ?? '')}" placeholder="${placeholder}" autocomplete="off"><span class="hint" aria-hidden="true">/</span></label>
    <div class="filters">${groups}${extra}</div></div>`;
}
function bindToolbar(q: Query, rerender: (q: Query) => void) {
  const input = document.getElementById('q') as HTMLInputElement;
  input.addEventListener('input', () => { q.q = input.value; setQuery(q); rerender(q); });
  main.querySelectorAll<HTMLButtonElement>('.chip').forEach((b) => b.addEventListener('click', () => {
    const f = b.dataset.f!, v = b.dataset.v!;
    q[f] = q[f] === v ? '' : v;
    main.querySelectorAll<HTMLButtonElement>(`.chip[data-f="${f}"]`).forEach((c) => c.setAttribute('aria-pressed', String(q[f] === c.dataset.v)));
    setQuery(q); rerender(q);
  }));
  main.querySelector<HTMLSelectElement>('.sort')?.addEventListener('change', (e) => { q.sort = (e.target as HTMLSelectElement).value; setQuery(q); rerender(q); });
}

// ------------------------------------------------------------------ enemies
function renderEnemies(q: Query) {
  const stages = STAGE_ORDER.filter((s) => MONSTERS.some((m) => m.stages.includes(s)));
  main.innerHTML = `<div class="view">
    <div class="page-head"><h1>敌人图鉴</h1><p>按关卡、类型或名字查找；支持拼音和首字母，例如 <code>hhe</code> 找到红孩儿。</p></div>
    ${toolbar('搜索敌人、技能、关卡或掉落……', q,
      `<div class="fgroup"><span>类型</span>${chips('kind', ['Boss', '小怪'], q.kind ?? '')}</div>
       <div class="fgroup"><span>关卡</span>${chips('stage', stages, q.stage ?? '')}</div>`)}
    <p class="count" id="count" aria-live="polite"></p>
    <div class="grid" id="grid"></div></div>`;
  const draw = (q: Query) => {
    const list = MONSTERS.filter((m) => (!q.kind || (q.kind === 'Boss') === m.boss) && (!q.stage || m.stages.includes(q.stage)) && matches(monsterHay.get(m)!, q.q ?? ''))
      .sort((a, b) => stageIndex(a) - stageIndex(b) || Number(a.boss) - Number(b.boss) || a.hp - b.hp);
    document.getElementById('count')!.textContent = `共 ${list.length} 种`;
    document.getElementById('grid')!.innerHTML = list.length ? list.map((m) => `<button class="card" data-m="${MONSTERS.indexOf(m)}" style="--q:${m.boss ? '#d64532' : '#e8b75a'}">
      <div class="pic">${m.portrait ? `<img src="${asset(m.portrait)}" alt="${esc(monsterLabel(m))}" loading="lazy">` : '<span class="none">暂无图像</span>'}</div>
      <div class="meta"><div class="name">${esc(monsterLabel(m))}</div>
        <div class="sub">${m.boss ? '<span class="badge badge-boss">Boss</span>' : ''}<span>${esc(m.stages.join(' · ') || '—')}</span></div></div></button>`).join('')
      : '<p class="empty">没有找到符合条件的敌人</p>';
    document.querySelectorAll<HTMLButtonElement>('#grid .card').forEach((c) => c.addEventListener('click', () => openMonster(MONSTERS[Number(c.dataset.m)])));
  };
  bindToolbar(q, draw);
  draw(q);
  if (q.open) { const m = MONSTERS.find((x) => monsterLabel(x) === q.open); if (m) openMonster(m); }
}
const stageIndex = (m: Monster) => Math.min(...m.stages.map((s) => STAGE_ORDER.indexOf(s)).filter((i) => i >= 0), 99);

function openMonster(m: Monster) {
  const st = (k: string, v: string | number, cls = '') => `<div class="stat"><span>${k}</span><b class="${cls}">${typeof v === 'number' ? fmt(v) : v}</b></div>`;
  const dropLine = (list: string[], chance: number) => `<p class="d-note">每次击败有 ${Math.round(chance * 100)}% 机会掉出其中之一</p><div class="links">${list.filter((d) => ITEM_BY_NAME.has(d)).map(itemLink).join('')}</div>`;
  const forms = m.forms ? `<div class="d-sec"><h3>各形态</h3>${m.forms.map((f, i) => `<div class="form"><h4>${esc(f.label || `第 ${i + 1} 形态`)}</h4><div class="stats">${st('生命', f.hp)}${st('防御', f.def)}</div>${f.drops.length ? `<h5>掉落</h5>${dropLine(f.drops, f.dropChance)}` : ''}</div>`).join('')}</div>` : '';
  const drops = m.drops.filter((d) => ITEM_BY_NAME.has(d));
  openDrawer(`<div style="--q:${m.boss ? '#d64532' : '#e8b75a'}">
    <div class="d-pic">${m.portrait ? `<img src="${asset(m.portrait)}" alt="${esc(monsterLabel(m))}">` : ''}</div>
    <h2 class="d-title" id="drawer-title">${esc(monsterLabel(m))}</h2>
    <div class="d-tag">${m.boss ? '<span class="badge badge-boss">Boss</span>' : '<span class="badge">小怪</span>'}${m.title ? `<span>${esc(m.title)}</span>` : ''}</div>
    ${m.intro ? `<p class="d-text">${esc(m.intro)}</p>` : ''}
    ${m.unnamed ? '<p class="d-text">原版没有为它起名字。</p>' : ''}
    <div class="d-sec"><h3>属性</h3><div class="stats">${st('生命', m.hp)}${st('防御', m.def)}${m.mdef ? st('魔抗', `${Math.round(m.mdef * 100)}%`) : ''}${st('经验', m.exp)}${st('灵魂', m.souls)}</div></div>
    ${forms}
    ${m.skills ? `<div class="d-sec"><h3>技能</h3><p class="d-text" style="margin:0">${esc(m.skills)}</p></div>` : ''}
    <div class="d-sec"><h3>出没地点</h3><div class="links">${m.stages.map((s) => `<button class="link" data-go="enemies" data-k="stage" data-v="${esc(s)}">${esc(s)}</button>`).join('') || '—'}</div></div>
    ${drops.length ? `<div class="d-sec"><h3>掉落</h3>${dropLine(drops, m.dropChance)}</div>` : ''}
  </div>`);
}

// ------------------------------------------------------------------ items
function renderItems(q: Query) {
  main.innerHTML = `<div class="view">
    <div class="page-head"><h1>物品图鉴</h1><p>装备的属性是掉落时随机的范围；支持拼音和首字母，例如 <code>tsgj</code> 找到天煞古剑。</p></div>
    ${toolbar('搜索物品、描述、合成材料或掉落来源……', q,
      `<div class="fgroup"><span>类型</span>${chips('type', TYPES, q.type ?? '')}</div>
       <div class="fgroup"><span>品质</span>${chips('quality', QUALITIES, q.quality ?? '', qColor)}</div>
       <div class="fgroup"><span>角色</span>${chips('user', USERS, q.user ?? '')}</div>`,
      `<div class="fgroup"><span>排序</span><select class="sort" aria-label="排序">
        ${[['', '默认'], ['quality', '品质'], ['atk', '攻击'], ['hp', '生命'], ['def', '防御']].map(([v, t]) => `<option value="${v}"${(q.sort ?? '') === v ? ' selected' : ''}>${t}</option>`).join('')}</select></div>`)}
    <p class="count" id="count" aria-live="polite"></p>
    <div class="grid items" id="grid"></div></div>`;
  const draw = (q: Query) => {
    const top = (i: Item, k: string) => i.stats[k]?.[1] ?? -Infinity;
    const list = ITEMS.filter((i) => (!q.type || i.type === q.type) && (!q.quality || i.quality === q.quality) && (!q.user || i.user === q.user) && matches(itemHay.get(i)!, q.q ?? ''));
    if (q.sort === 'quality') list.sort((a, b) => QUALITIES.indexOf(b.quality) - QUALITIES.indexOf(a.quality));
    else if (q.sort) list.sort((a, b) => top(b, q.sort) - top(a, q.sort));
    else list.sort((a, b) => TYPES.indexOf(a.type) - TYPES.indexOf(b.type) || QUALITIES.indexOf(a.quality) - QUALITIES.indexOf(b.quality));
    document.getElementById('count')!.textContent = `共 ${list.length} 件`;
    document.getElementById('grid')!.innerHTML = list.length ? list.map((i) => `<button class="card" data-i="${ITEMS.indexOf(i)}" style="--q:${qColor(i.quality)}">
      <div class="pic">${i.icon ? `<img src="${asset(i.icon)}" alt="${esc(i.name)}" loading="lazy">` : '<span class="none">暂无图像</span>'}</div>
      <div class="meta"><div class="name" style="color:${qColor(i.quality)}">${esc(i.name)}</div>
        <div class="sub"><span>${esc(i.type)}</span>${i.user ? `<span>${esc(i.user)}</span>` : ''}${i.quality ? `<span>${esc(i.quality)}</span>` : ''}</div></div></button>`).join('')
      : '<p class="empty">没有找到符合条件的物品</p>';
    document.querySelectorAll<HTMLButtonElement>('#grid .card').forEach((c) => c.addEventListener('click', () => openItem(ITEMS[Number(c.dataset.i)])));
  };
  bindToolbar(q, draw);
  draw(q);
  if (q.open) { const i = ITEM_BY_NAME.get(q.open); if (i) openItem(i); }
}

function itemLink(name: string) {
  return ITEM_BY_NAME.has(name) ? `<button class="link" data-item="${esc(name)}">${esc(name)}</button>` : `<span class="link" style="cursor:default">${esc(name)}</span>`;
}

function openItem(i: Item) {
  const stats = STAT_NAMES.filter(([k]) => i.stats[k]).map(([k, n]) => `<div class="stat"><span>${n}</span><b class="${i.stats[k][1] < 0 ? 'neg' : ''}">${statText(k, i.stats[k])}</b></div>`).join('');
  const droppedBy = MONSTERS.filter((m) => m.drops.includes(i.name));
  const usedIn = ITEMS.filter((o) => o.recipes?.some((r) => r.includes(i.name)));
  openDrawer(`<div class="items-d" style="--q:${qColor(i.quality)}">
    <div class="d-pic">${i.icon ? `<img src="${asset(i.icon)}" alt="${esc(i.name)}">` : ''}</div>
    <h2 class="d-title" id="drawer-title" style="color:${qColor(i.quality)}">${esc(i.name)}</h2>
    <div class="d-tag"><span>${esc(i.type)}</span>${i.quality ? `<span class="badge" style="color:${qColor(i.quality)}">${esc(i.quality)}</span>` : ''}${i.user ? `<span>${esc(i.user)}专用</span>` : ''}</div>
    ${i.desc ? `<p class="d-text">${esc(i.desc)}</p>` : ''}
    ${i.skill && i.skill.replace(/。$/, '') !== i.desc.replace(/。$/, '') ? `<div class="d-sec"><h3>法宝技能</h3><p class="d-text" style="margin:0">${esc(i.skill)}</p></div>` : ''}
    ${stats || i.growth ? `<div class="d-sec"><h3>属性</h3><div class="stats">${stats}${i.growth ? `<div class="stat"><span>成长率</span><b>${i.growth[0]} ~ ${i.growth[1]}</b></div>` : ''}</div></div>` : ''}
    <div class="d-sec"><h3>价值</h3><div class="stats"><div class="stat"><span>出售</span><b>${fmt(i.value)} 灵魂</b></div>${i.shopPrice ? `<div class="stat"><span>商城</span><b>${fmt(i.shopPrice)} 功勋</b></div>` : ''}</div></div>
    ${i.recipes ? `<div class="d-sec"><h3>合成</h3>${i.recipes.slice(0, 6).map((r) => `<div class="recipe">${r.map(itemLink).join('<span class="plus">+</span>')}</div>`).join('')}${i.recipes.length > 6 ? `<p class="d-text" style="margin:0">……共 ${i.recipes.length} 种组合</p>` : ''}</div>` : ''}
    ${usedIn.length ? `<div class="d-sec"><h3>可用于合成</h3><div class="links">${usedIn.map((o) => itemLink(o.name)).join('')}</div></div>` : ''}
    ${droppedBy.length ? `<div class="d-sec"><h3>掉落自</h3><div class="links">${droppedBy.map((m) => `<button class="link" data-monster="${MONSTERS.indexOf(m)}">${esc(monsterLabel(m))}</button>`).join('')}</div></div>` : ''}
  </div>`);
}

// ------------------------------------------------------------------ drawer
const drawer = document.getElementById('drawer')!;
const scrim = document.getElementById('scrim')!;
const body = document.getElementById('drawer-body')!;
let lastFocus: HTMLElement | null = null;
function openDrawer(html: string) {
  if (drawer.hidden) lastFocus = document.activeElement as HTMLElement;
  body.innerHTML = html;
  drawer.hidden = scrim.hidden = false;
  drawer.scrollTop = 0;
  (document.getElementById('drawer-close') as HTMLButtonElement).focus();
  body.querySelectorAll<HTMLButtonElement>('[data-item]').forEach((b) => b.addEventListener('click', () => openItem(ITEM_BY_NAME.get(b.dataset.item!)!)));
  body.querySelectorAll<HTMLButtonElement>('[data-monster]').forEach((b) => b.addEventListener('click', () => openMonster(MONSTERS[Number(b.dataset.monster)])));
  body.querySelectorAll<HTMLButtonElement>('[data-go]').forEach((b) => b.addEventListener('click', () => { closeDrawer(); location.hash = `#/${b.dataset.go}?${b.dataset.k}=${encodeURIComponent(b.dataset.v!)}`; }));
}
function closeDrawer() {
  drawer.hidden = scrim.hidden = true;
  lastFocus?.focus();
}
document.getElementById('drawer-close')!.addEventListener('click', closeDrawer);
scrim.addEventListener('click', closeDrawer);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !drawer.hidden) closeDrawer();
  else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') { const q = document.getElementById('q'); if (q) { e.preventDefault(); q.focus(); } }
});

window.addEventListener('hashchange', () => { closeDrawer(); render(); window.scrollTo(0, 0); });
render();
