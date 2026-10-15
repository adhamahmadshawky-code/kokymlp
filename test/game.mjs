/* game test — Rainbow Rush: full play-through, input, shop, persistence */
import puppeteer from 'puppeteer';
import fs from 'node:fs';

const BASE = 'file:///C:/Users/TB/Downloads/koky/index.html';
const OUT = 'C:/Users/TB/Downloads/koky/test-shots-game';
fs.mkdirSync(OUT, { recursive: true });

const errors = [];
const results = [];
function check(name, cond, extra) {
  results.push((cond ? 'PASS' : 'FAIL') + '  ' + name + (extra !== undefined ? '  [' + extra + ']' : ''));
}

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-device-scale-factor=2.5', '--font-render-hinting=none']
});
const page = await browser.newPage();
await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true });

page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('requestfailed', (r) => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) errors.push('reqfail: ' + r.url()); });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (n) => page.screenshot({ path: OUT + '/' + n + '.png' });
const snap = () => page.evaluate(() => window.KY.game.dbg.snap());
const save = () => page.evaluate(() => window.KY.game.dbg.save());
const grounded = () => page.waitForFunction(() => window.KY.game.dbg.snap().hy === 0, { timeout: 5000 });
const waitMode = (m, t) => page.waitForFunction((mm) => window.KY.game.dbg.snap().mode === mm, { timeout: t || 6000 }, m);
const visibleOvs = () => page.$$eval('.rr-ov', (els) => els.filter((e) => !e.hidden).length);

try {
  /* ── fresh start ─────────────────────────────────────── */
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'networkidle2' });
  await wait(700);

  await page.tap('#btn-start'); await wait(900);
  check('playground active', await page.$eval('#scene-play', el => el.classList.contains('active')));
  check('game entry button visible', await page.$eval('#btn-game', el => {
    const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0;
  }));
  await shot('g01-entry');

  /* ── enter game ──────────────────────────────────────── */
  await page.tap('#btn-game'); await wait(1000);
  check('game scene active', await page.$eval('#scene-game', el => el.classList.contains('active')));
  check('canvas sized', await page.$eval('#rr-canvas', c => c.width > 10 && c.height > 10), await page.$eval('#rr-canvas', c => c.width + 'x' + c.height));
  check('canvas has aria label', await page.$eval('#rr-canvas', c => !!c.getAttribute('aria-label')));
  check('site hud hidden in game', await page.$eval('#hud', el => getComputedStyle(el).display === 'none'));
  check('start overlay visible', await page.$eval('#ov-start', el => !el.hidden));
  check('start: best = 0', await page.$eval('#st-best', el => el.textContent === '0'));
  check('start: char preview rendered', await page.$eval('#st-char-pony svg', el => !!el).catch(() => false));
  await shot('g02-start');

  /* ── worlds overview ─────────────────────────────────── */
  await page.tap('#rr-worlds-btn'); await wait(380);
  check('worlds overlay visible', await page.$eval('#ov-worlds', el => !el.hidden) && (await visibleOvs()) === 1);
  check('4 worlds listed', await page.$$eval('#rr-worlds .rr-world', els => els.length) === 4);
  check('1 world unlocked', await page.$$eval('#rr-worlds .rr-world:not(.locked)', els => els.length) === 1);
  await page.tap('#rr-worlds-back'); await wait(320);
  check('worlds back → start', await page.$eval('#ov-start', el => !el.hidden));

  /* ── ponies + closet ─────────────────────────────────── */
  await page.tap('#rr-chars-btn'); await wait(380);
  check('chars overlay visible', await page.$eval('#ov-chars', el => !el.hidden));
  check('6 ponies listed', await page.$$eval('#rr-chars .rr-pony', els => els.length) === 6);
  check('pinkie equipped by default', await page.$eval('[data-char="pinkie"]', el => el.classList.contains('on')));
  check('6 empty on start (only pinkie owned)', await page.$$eval('#rr-chars .rr-pony:not(.locked)', els => els.length) === 1);
  await page.tap('#rr-tab-closet'); await wait(320);
  check('closet has 9 items', await page.$$eval('#rr-closet .rr-item', els => els.length) === 9);
  await page.tap('[data-item="trail:rainbow"]'); await wait(280);
  check('insufficient stars → toast', await page.$eval('#rr-toast', el => el.classList.contains('show') && /needs/.test(el.textContent)), await page.$eval('#rr-toast', el => el.textContent));
  await shot('g03-closet');
  await page.tap('#rr-chars-back'); await wait(320);

  /* ── play → tutorial → run ───────────────────────────── */
  await page.tap('#rr-play'); await wait(400);
  check('tutorial shows on first play', await page.$eval('#ov-tutorial', el => !el.hidden));
  await shot('g04-tutorial');
  await page.tap('#rr-tut-go'); await wait(550);
  check('run started', (await snap()).mode === 'run');
  check('no overlay during run', (await visibleOvs()) === 0);
  check('hud shown', await page.$eval('#rr-hud', el => !el.hidden));
  check('jump button shown', await page.$eval('#rr-jump', el => !el.hidden));

  const painted = await page.evaluate(() => {
    const c = document.getElementById('rr-canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, Math.floor(c.height * 0.4)).data;
    const set = new Set();
    for (let i = 0; i < d.length; i += 1600) set.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
    return set.size;
  });
  check('canvas painted (sky + scenery)', painted >= 4, String(painted));

  const s1 = (await snap()).score;
  await wait(1100);
  const s2 = (await snap()).score;
  check('score climbs while running', s2 > s1, s1 + '→' + s2);
  await shot('g05-running');

  /* ── input: no auto-obstacles for determinism ─────────── */
  await page.evaluate(() => window.KY.game.dbg.noSpawn(true));

  await grounded();
  await page.tap('#rr-canvas'); await wait(180);
  check('tap-to-jump lifts pony', (await snap()).hy > 20, String((await snap()).hy));

  await grounded();
  await page.tap('#rr-jump'); await wait(180);
  check('jump button lifts pony', (await snap()).hy > 20, String((await snap()).hy));

  await grounded();
  await page.keyboard.press('Space'); await wait(180);
  check('keyboard jump lifts pony', (await snap()).hy > 20, String((await snap()).hy));

  /* ── collision → game over ───────────────────────────── */
  await grounded();
  const scoreBefore = (await snap()).score;
  await page.evaluate(() => window.KY.game.dbg.place('fence'));
  await waitMode('over', 6000);
  check('game over after collision', (await snap()).mode === 'over');
  check('game over overlay visible', await page.$eval('#ov-over', el => !el.hidden));
  check('over: score shown', Number(await page.$eval('#ov-over-score', el => el.textContent)) >= scoreBefore);
  check('over: best updated', (await save()).best > 0, String((await save()).best));
  check('over: news chips', (await page.$$('#ov-over-news .rr-news-chip')).length >= 1);
  await shot('g06-over');

  /* ── restart ─────────────────────────────────────────── */
  await page.tap('#rr-again'); await wait(500);
  const rs = await snap();
  check('restart: running again', rs.mode === 'run' && rs.score < scoreBefore);

  /* ── power-ups ───────────────────────────────────────── */
  await page.evaluate(() => window.KY.game.dbg.pow('boost')); await wait(250);
  check('boost pill visible', await page.$eval('#rr-power', el => !el.hidden));
  check('boost pill icon', (await page.$eval('#rr-power-ic', el => el.textContent)) === '🌈');
  check('boost makes speed higher', (await snap()).speed > 300, String((await snap()).speed));

  await page.evaluate(() => window.KY.game.dbg.pow('party')); await wait(200);
  check('party pill icon', (await page.$eval('#rr-power-ic', el => el.textContent)) === '🎈');
  await page.evaluate(() => window.KY.game.dbg.pow('kindness')); await wait(200);
  check('kindness pill icon', (await page.$eval('#rr-power-ic', el => el.textContent)) === '🦋');
  await page.evaluate(() => window.KY.game.dbg.pow('shield')); await wait(150);
  check('shield active on pickup', (await snap()).shield === true);

  /* ── pause / resume / quit ───────────────────────────── */
  await page.tap('#rr-btn-pause'); await wait(320);
  check('pause overlay visible', await page.$eval('#ov-pause', el => !el.hidden) && (await snap()).mode === 'paused');
  await shot('g07-pause');
  await page.tap('#rr-resume'); await wait(320);
  check('resume returns to run', (await snap()).mode === 'run' && (await visibleOvs()) === 0);

  await page.tap('#rr-btn-pause'); await wait(280);
  await page.tap('#rr-home'); await wait(1000);
  check('quit → playground', await page.$eval('#scene-play', el => el.classList.contains('active')));
  check('engine stopped on leave', (await snap()).mode === 'idle');

  /* ── site still interactive after game ───────────────── */
  await page.tap('.tab[data-act="garden"]'); await wait(500);
  check('site tabs still work', await page.$eval('#panel-garden', el => el.classList.contains('active')));

  /* ── shop: buy pony + trail ──────────────────────────── */
  await page.evaluate(() => { window.KY.game.dbg.save().stars = 120; });
  await page.tap('#btn-game'); await wait(950);
  await page.tap('#rr-chars-btn'); await wait(380);
  await page.tap('[data-char="fluttershy"]'); await wait(320);
  const sv1 = await save();
  check('bought fluttershy', sv1.owned.indexOf('char:fluttershy') >= 0 && sv1.equip.char === 'fluttershy');
  check('stars deducted (120-50)', sv1.stars === 70, String(sv1.stars));
  check('fluttershy card equipped', await page.$eval('[data-char="fluttershy"]', el => el.classList.contains('on')));
  await page.tap('#rr-tab-closet'); await wait(300);
  await page.tap('[data-item="trail:rainbow"]'); await wait(320);
  const sv2 = await save();
  check('bought rainbow trail', sv2.owned.indexOf('trail:rainbow') >= 0 && sv2.equip.trail === 'rainbow');
  check('trail shows as on', await page.$eval('[data-item="trail:rainbow"]', el => el.classList.contains('on')));
  await page.tap('[data-item="acc:bow"]'); await wait(280);
  check('second buy unaffordable → toast', /needs/.test(await page.$eval('#rr-toast', el => el.textContent)));
  await page.tap('#rr-chars-back'); await wait(320);
  check('start screen shows fluttershy', (await page.$eval('#st-char-name', el => el.textContent)) === 'fluttershy');
  await shot('g08-shop');

  /* ── run #3: equipped char, trail, milestone ─────────── */
  await page.evaluate(() => window.KY.game.dbg.noSpawn(true));
  await page.tap('#rr-play'); await wait(500);
  check('tutorial skipped on later plays', (await snap()).mode === 'run' && (await visibleOvs()) === 0);
  await wait(800);
  const s3 = await snap();
  check('fluttershy running', s3.char === 'fluttershy');
  check('trail particles spawning', s3.parts > 0, String(s3.parts));

  await page.evaluate(() => window.KY.game.dbg.setScore(1200));
  await wait(450);
  const sv3 = await save();
  check('milestone unlocked acres', sv3.worlds.indexOf('acres') >= 0);
  check('milestone unlocked cloudsdale', sv3.worlds.indexOf('cloudsdale') >= 0);
  check('milestone HUD shows next world', /everfree/.test(await page.$eval('#rr-ms-label', el => el.textContent)));
  await shot('g09-milestone');

  await page.tap('#rr-btn-pause'); await wait(280);
  await page.tap('#rr-home'); await wait(2400);
  check('in-game milestone granted site star ×2', (await page.$eval('#star-count', el => el.textContent)) === '2', await page.$eval('#star-count', el => el.textContent));
  await shot('g10-site-stars');

  /* ── equip unlocked world ────────────────────────────── */
  await page.tap('#btn-game'); await wait(950);
  await page.tap('#rr-worlds-btn'); await wait(380);
  check('3 worlds unlocked now', await page.$$eval('#rr-worlds .rr-world:not(.locked)', els => els.length) === 3);
  await page.tap('[data-world="cloudsdale"]'); await wait(320);
  check('world equipped + persisted', (await save()).equip.world === 'cloudsdale');
  check('world card marked on', await page.$eval('[data-world="cloudsdale"]', el => el.classList.contains('on')));
  await page.tap('#rr-worlds-back'); await wait(300);
  check('start screen shows cloudsdale', (await page.$eval('#st-world-name', el => el.textContent)) === 'cloudsdale');

  /* ── persistence across reload ───────────────────────── */
  await page.reload({ waitUntil: 'networkidle2' });
  await wait(800);
  const sv4 = await save();
  check('persist: stars', sv4.stars === 10, String(sv4.stars));
  check('persist: best', sv4.best > 0);
  check('persist: equipped pony', sv4.equip.char === 'fluttershy');
  check('persist: owned trail', sv4.owned.indexOf('trail:rainbow') >= 0);
  check('persist: unlocked worlds', sv4.worlds.length === 3);
  check('persist: tutorial done', sv4.tut === true);
  check('persist: site stars', (await page.$eval('#star-count', el => el.textContent)) === '2');

  /* ── errors ──────────────────────────────────────────── */
  check('no console / page errors', errors.length === 0, errors.join(' | '));
} catch (e) {
  results.push('FAIL  (exception) ' + e.message);
  errors.push('EXCEPTION ' + e.stack);
}

console.log(results.join('\n'));
console.log('\n--- errors ---');
console.log(errors.length ? errors.join('\n') : 'none');
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log('\n' + (results.length - failed) + '/' + results.length + ' passed');
await browser.close();
process.exit(failed ? 1 : 0);
