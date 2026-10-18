// Exports the dex data from the game project (the remake's real numbers) into src/data/*.json and copies item icons.
// Text the game data lacks comes only from 4399's official guide pages (scripts/official/*.json, hand-copied, see README).
//
//   node scripts/export-data.mjs [path to the zmxy2-remake checkout]
import fs from 'node:fs';
import path from 'node:path';
import { pinyin } from 'pinyin-pro';
// search keys: full pinyin and initials, so 'tsgj' / 'tianshagujian' find 天煞古剑
const py = (t) => t ? [pinyin(t, { toneType: 'none', type: 'array' }).join(''), pinyin(t, { pattern: 'first', toneType: 'none', type: 'array' }).join('')] : [];

const SITE = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const GAME = path.join(path.resolve(process.argv[2] ?? path.join(SITE, '..', 'godot-zmxy2')), 'game');
const read = (p) => fs.readFileSync(path.join(GAME, p), 'utf8').split('\r').join('');
const official = (n) => JSON.parse(fs.readFileSync(path.join(SITE, 'scripts', 'official', n), 'utf8'));

// ------------------------------------------------------------------ tiny .tres reader
function value(src) {
  src = src.trim();
  let m;
  if ((m = src.match(/^&?"((?:[^"\\]|\\.)*)"$/))) return m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
  if ((m = src.match(/^Vector2i?\(([^)]*)\)$/))) return m[1].split(',').map(Number);
  if ((m = src.match(/^Color\(([^)]*)\)$/))) return m[1].split(',').map(Number);
  if ((m = src.match(/^Packed\w+Array\((.*)\)$/s))) return m[1].trim() ? m[1].split(',').map((x) => value(x)) : [];
  if (/^-?[\d.e+-]+$/.test(src)) return Number(src);
  if (src === 'true' || src === 'false') return src === 'true';
  return src;
}
// one [resource] / [sub_resource] block -> {key: raw}
function fields(block) {
  const out = {};
  const lines = block.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^([a-z_]+) = (.*)$/);
    if (!m) continue;
    let v = m[2];
    // multi-line dictionaries / strings
    if (v === '{' || (v.startsWith('"') && !/"$/.test(v.replace(/\\"/g, '')) )) {
      const end = v === '{' ? '}' : null;
      while (++i < lines.length) { v += '\n' + lines[i]; if (end ? lines[i] === end : /"$/.test(lines[i])) break; }
    }
    out[m[1]] = v;
  }
  return out;
}
const dictPairs = (raw) => [...raw.matchAll(/&?"([a-z_0-9]+)": (Vector2\([^)]*\)|[-\d.]+)/g)].map((m) => [m[1], value(m[2])]);

// ------------------------------------------------------------------ items
const eqTxt = read('data/equipment.tres');
const ext = {};
for (const m of eqTxt.matchAll(/\[ext_resource type="Texture2D"[^\]]*path="res:\/\/([^"]+)" id="([^"]+)"\]/g)) ext[m[2]] = m[1];
const officialItems = official('items.json');
const TYPE = { weapon: '武器', cloth: '防具', accessory: '饰品', treasure: '法宝', wing: '翅膀', fashion: '时装', item: '道具' };
const USER = { 悟空: '孙悟空', 唐僧: '唐僧', 八戒: '猪八戒' };
fs.mkdirSync(path.join(SITE, 'public/img/items'), { recursive: true });
const items = [];
for (const b of eqTxt.split('\n[sub_resource').filter((b) => /\ndisplay_name = /.test(b))) {
  const f = fields(b);
  const id = value(f.id);
  const name = value(f.display_name);
  const stats = f.stats ? Object.fromEntries(dictPairs(f.stats)) : {};
  const iconRes = f.ground_icon || f.icon;
  let icon = null;
  if (iconRes) {
    const rid = (iconRes.match(/ExtResource\("([^"]+)"\)/) || [])[1];
    if (rid && ext[rid]) {
      icon = `img/items/${id}.png`;
      fs.copyFileSync(path.join(GAME, ext[rid]), path.join(SITE, 'public', icon));
    }
  }
  const desc = f.desc ? value(f.desc) : '';
  const off = officialItems[name] ?? officialItems[name.replace(/^普通的/, '')];
  items.push({
    id, name, py: py(name),
    type: TYPE[value(f.type)] ?? value(f.type),
    user: f.user ? USER[value(f.user)] ?? value(f.user) : '',
    quality: f.quality ? value(f.quality) : '',
    color: f.color ? value(f.color) : null,
    value: f.value ? value(f.value) : 0,
    stats,
    desc: desc || off?.desc || '',
    descSource: desc ? 'game' : off?.desc ? '4399' : '',
    skill: off?.skill || '',
    icon,
  });
}

// fusion recipes / shop
const ruleBlock = (key) => { const i = eqTxt.indexOf(`\n${key} = {`); return i < 0 ? '' : eqTxt.slice(i, eqTxt.indexOf('\n}\n', i) + 2); };
const byId = Object.fromEntries(items.map((it) => [it.id, it]));
const recipes = [...ruleBlock('fusion').matchAll(/"mats": \[([^\]]*)\],\n"out": "([^"]+)"/g)].map((m) => ({ out: m[2], mats: m[1].replace(/"/g, '').split(',').map((s) => s.trim()) }));
for (const r of recipes) { const it = byId[r.out]; if (it) (it.recipes ??= []).push(r.mats.map((x) => byId[x]?.name ?? x)); }
for (const m of ruleBlock('shop').matchAll(/"([a-z0-9]+)": ([\d.]+)/g)) if (byId[m[1]] && !['amount', 'monster', 'per_day', 'per_page'].includes(m[1])) byId[m[1]].shopPrice = Number(m[2]);

// ------------------------------------------------------------------ monsters
const STAGE_NAMES = official('stages.json');   // sl11 -> {name, boss?}
const spawnIn = {};
for (const d of fs.readdirSync(path.join(GAME, 'assets/levels'))) {
  const f = path.join(GAME, 'assets/levels', d, 'level.json');
  if (!fs.existsSync(f) || !STAGE_NAMES[d]) continue;
  for (const s of JSON.parse(fs.readFileSync(f, 'utf8')).spawners ?? []) (spawnIn[s.enemy] ??= new Set()).add(d);
}
const officialMonsters = official('monsters.json');
const extraStages = official('monster_stages.json');   // id -> [stage] for summoned / scripted monsters
const HIDDEN = new Set([57]);   // 3-1's invisible fish thrower
const groups = new Map();
// a regular monster that has a named stage copy (黑无常 / 白无常 bosses of 1-2) shares that name
const nameById = {};
for (const f of fs.readdirSync(path.join(GAME, 'data/monsters'))) {
  const m = f.match(/^monster_(\d+)/);
  const n = (read('data/monsters/' + f).match(/\ndisplay_name = "([^"]+)"/) || [])[1];
  if (m && n) nameById[m[1]] ??= n;
}
for (const f of fs.readdirSync(path.join(GAME, 'data/monsters')).filter((f) => f.endsWith('.tres')).sort()) {
  const m = f.match(/^monster_(\d+)(?:_(sl\d+))?\.tres$/);
  const fl = fields(read('data/monsters/' + f).split('\n[resource]\n')[1] ?? '');
  const id = Number(m[1]);
  const off = officialMonsters[String(id)] ?? {};
  const name = (fl.display_name ? value(fl.display_name) : '') || off.name || nameById[m[1]] || '';
  // scenery / invisible helpers are not enemies
  if (fl.is_prop === 'true' || /static_prop|hub_prop/.test(fl.brain_type ?? '') || HIDDEN.has(id)) continue;
  const e = {
    id, variant: m[2] ?? null, name, unnamed: !name, py: py(name),
    boss: fl.is_boss === 'true',
    hp: value(fl.hp ?? '1'), def: value(fl.def ?? '0'), mdef: value(fl.mdef ?? '0'),
    exp: value(fl.exp ?? '0'), souls: value(fl.souls ?? '0'), speed: value(fl.speed ?? '0'),
    drops: (fl.equip_drops ? value(fl.equip_drops) : []).map((x) => byId[x]?.name ?? x),
    dropChance: fl.equip_chance ? value(fl.equip_chance) : 0,
    title: off.title ?? '', intro: off.intro ?? '', skills: off.skills ?? '',
    stages: [...new Set([...(m[2] ? [m[2]] : [...(spawnIn[id] ?? [])]), ...(extraStages[String(id)] ?? [])])],
    portrait: fs.existsSync(path.join(SITE, 'public/img/monsters', value(fl.rig) + '.png')) ? `img/monsters/${value(fl.rig)}.png` : null,
  };
  e.stages = e.stages.filter((s) => STAGE_NAMES[s]).map((s) => STAGE_NAMES[s].name);
  // one entry per name + role; the stage-specific boss copy of a regular monster is a variant
  const key = name ? `${name}|${e.boss}` : `#${id}`;
  const g = groups.get(key);
  if (!g) groups.set(key, e);
  else { (g.forms ??= [{ hp: g.hp, def: g.def, exp: g.exp }]).push({ hp: e.hp, def: e.def, exp: e.exp }); g.stages = [...new Set([...g.stages, ...e.stages])]; g.drops = [...new Set([...g.drops, ...e.drops])]; }
}
const monsters = [...groups.values()];

fs.mkdirSync(path.join(SITE, 'src/data'), { recursive: true });
fs.writeFileSync(path.join(SITE, 'src/data/items.json'), JSON.stringify(items));
fs.writeFileSync(path.join(SITE, 'src/data/monsters.json'), JSON.stringify(monsters));
console.log(`items ${items.length} (desc from 4399: ${items.filter((i) => i.descSource === '4399').length}, none: ${items.filter((i) => !i.desc).length}), monsters ${monsters.length}`);
