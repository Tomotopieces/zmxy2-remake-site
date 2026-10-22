// Subsets the two game fonts to the characters the site actually uses (page copy + dex data) -> src/fonts/*.woff2
import fs from 'node:fs';
import path from 'node:path';
import subsetFont from 'subset-font';

const SITE = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const FONTS = path.resolve(process.argv[2] ?? path.join(SITE, '..', 'godot-zmxy2', 'game', 'assets', 'fonts'));
const text = ['index.html', 'src/main.ts', 'src/content.ts', 'src/data/items.json', 'src/data/monsters.json']
  .map((f) => fs.readFileSync(path.join(SITE, f), 'utf8')).join('')
  + '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ ·—…，。、：；！？「」（）%+-~/';
const chars = [...new Set(text)].join('');
fs.mkdirSync(path.join(SITE, 'src/fonts'), { recursive: true });
// the marker font only draws headings and names
const read = (f) => fs.readFileSync(path.join(SITE, f), 'utf8');
const names = [...JSON.parse(read('src/data/items.json')), ...JSON.parse(read('src/data/monsters.json'))].map((x) => x.name).join('');
// every character of the page code (headings are built from template strings, so no tag matching), not the long descriptions
const heads = read('src/main.ts') + read('src/content.ts') + read('index.html') + '0123456789';
const markerChars = [...new Set(names + heads)].join('');
for (const [src, out, set] of [['LXGW975YuanSC-500W.ttf', 'yuan.woff2', chars], ['GBai851Marker.ttf', 'marker.woff2', markerChars]]) {
  const buf = await subsetFont(fs.readFileSync(path.join(FONTS, src)), set, { targetFormat: 'woff2' });
  fs.writeFileSync(path.join(SITE, 'src/fonts', out), buf);
  console.log(out, (buf.length / 1024).toFixed(0) + ' KB', set.length + ' chars');
}
