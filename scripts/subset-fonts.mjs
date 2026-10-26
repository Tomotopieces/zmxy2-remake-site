// Subsets the two game fonts to the characters the site actually uses -> src/fonts/*.woff2, then checks that every
// character really has a glyph in its subset (fails otherwise). Run by `npm run data` too, so the fonts always follow
// the exported data; run alone with `npm run fonts` after editing page copy (index.html, src/*.ts, public/guide.md).
import fs from 'node:fs';
import path from 'node:path';
import subsetFont from 'subset-font';
import fv from 'fontverter';
import { Blob, Face } from 'harfbuzzjs';

const SITE = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const FONTS = path.resolve(process.argv[2] ?? path.join(SITE, '..', 'godot-zmxy2', 'game', 'assets', 'fonts'));
const read = (f) => fs.readFileSync(path.join(SITE, f), 'utf8');
const EXTRA = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ ·—…，。、：；！？「」『』“”‘’（）【】《》%+-~～/';
const pageCode = read('index.html') + read('src/main.ts') + read('src/content.ts');
const guide = read('public/guide.md');
const data = [JSON.parse(read('src/data/items.json')), JSON.parse(read('src/data/monsters.json'))];
// body font: everything the site can show
const yuanText = pageCode + guide + read('src/data/items.json') + read('src/data/monsters.json') + EXTRA;
// marker font: headings, names and big numbers - the page code (headings are built from template strings), the
// guide's headings and every item / monster name
const names = data.flat().map((x) => x.name ?? '').join('');
const guideHeads = guide.split('\n').filter((l) => /^#{1,4} /.test(l)).join('');
const markerText = pageCode + guideHeads + names + EXTRA;
const uniq = (s) => [...new Set(s)].filter((c) => c.codePointAt(0) >= 0x20).join('');
fs.mkdirSync(path.join(SITE, 'src/fonts'), { recursive: true });
let bad = 0;
for (const [src, out, text] of [['LXGW975YuanSC-500W.ttf', 'yuan.woff2', uniq(yuanText)], ['GBai851Marker.ttf', 'marker.woff2', uniq(markerText)]]) {
  const full = fs.readFileSync(path.join(FONTS, src));
  const buf = await subsetFont(full, text, { targetFormat: 'woff2' });
  fs.writeFileSync(path.join(SITE, 'src/fonts', out), buf);
  // check: every wanted character the full font has must be in the subset
  const cps = (b) => new Set(new Face(new Blob(b), 0).collectUnicodes());
  const inFull = cps(full), inSub = cps(await fv.convert(buf, 'truetype'));
  const lost = [...text].filter((c) => inFull.has(c.codePointAt(0)) && !inSub.has(c.codePointAt(0)));
  const notInFont = [...text].filter((c) => c.codePointAt(0) > 0x7f && !inFull.has(c.codePointAt(0)));
  console.log(out, (buf.length / 1024).toFixed(0) + ' KB', text.length + ' chars',
    lost.length ? `LOST ${lost.join('')}` : 'all glyphs present', notInFont.length ? `(not in the font itself, drawn by the fallback: ${notInFont.join('')})` : '');
  if (lost.length) bad = 1;
}
process.exit(bad);
