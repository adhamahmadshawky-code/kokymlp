/* smoke test — plays through every scene/interaction, checks for errors */
import puppeteer from 'puppeteer';
import fs from 'node:fs';

const BASE = 'file:///C:/Users/TB/Downloads/koky/index.html';
const OUT = 'C:/Users/TB/Downloads/koky/test-shots';
fs.mkdirSync(OUT, { recursive: true });

const errors = [];
const results = [];
function check(name, cond, extra) {
  results.push((cond ? 'PASS' : 'FAIL') + '  ' + name + (extra ? '  [' + extra + ']' : ''));
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

const shot = (n) => page.screenshot({ path: OUT + '/' + n + '.png' });
const wait = (ms) => page.waitForTimeout ? page.waitForTimeout(ms) : new Promise(r => setTimeout(r, ms));

try {
  /* ── SCENE 1 ── */
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  await wait(900);
  check('home scene visible', await page.$eval('#scene-home', el => el.classList.contains('active')));
  check('title text', (await page.$eval('.title', el => el.textContent)).replace(/\s+/g, ' ').trim() === "Koka's Pony World ♡");
  check('start button label', (await page.$eval('#btn-start .cloud-label', el => el.textContent)).trim() === "let's play!");
  check('both ponies rendered', (await page.$$eval('#scene-home .pony', els => els.length)) === 2);
  check('wave pose present', await page.$eval('#scene-home .p-leg-wave', el => !!el).catch(() => false));
  check('rainbow arc + ponyville present', (await page.$$('#scene-home .rainbow-arc, #scene-home .ponyville')).length === 2);
  await shot('01-home');

  /* ── SCENE 2 ── */
  await page.tap('#btn-start');
  await wait(900);
  check('play scene visible', await page.$eval('#scene-play', el => el.classList.contains('active')));
  check('party panel active', await page.$eval('#panel-party', el => el.classList.contains('active')));
  await shot('02-play');

  /* party: dance + balloons */
  await page.tap('#tap-pinkie');
  await wait(200);
  check('pinkie dancing', await page.$eval('#tap-pinkie', el => el.classList.contains('dancing')));
  check('silly face during dance', await page.$eval('#tap-pinkie svg', el => el.getAttribute('data-face') === 'silly'));
  await shot('03-party-dance');
  await wait(2600);
  const balloons = await page.$$('#balloon-zone .balloon');
  check('balloons spawned', balloons.length === 4, String(balloons.length));
  for (let i = 0; i < balloons.length && i < 3; i++) { await page.tap('#balloon-zone .balloon:nth-child(1)'); await wait(150); }
  await page.tap('#tap-pinkie'); await wait(1200);
  await page.tap('#tap-pinkie'); await wait(1200);
  await page.tap('#tap-pinkie'); await wait(2600);
  const starsAfterParty = await page.evaluate(() => +document.getElementById('star-count').textContent);
  check('star awarded from party', starsAfterParty >= 1, 'stars=' + starsAfterParty);

  /* garden */
  await page.tap('.tab[data-act="garden"]');
  await wait(500);
  check('garden panel active', await page.$eval('#panel-garden', el => el.classList.contains('active')));
  check('flowers + butterflies exist', await page.evaluate(() => document.querySelectorAll('#panel-garden .flower').length >= 5 && document.querySelectorAll('#panel-garden .butterfly').length === 3));
  const noBugTap = await page.addStyleTag({ content: '.butterfly{pointer-events:none !important}' });
  for (let t = 0; t < 16; t++) {
    const blooms = await page.evaluate(() => document.querySelectorAll('#panel-garden .flower.bloom').length);
    if (blooms >= 4) break;
    const idx = await page.evaluate((n) => {
      const fs = Array.from(document.querySelectorAll('#flower-zone .flower'));
      const open = fs.map((f, i) => f.classList.contains('bloom') ? -1 : i).filter(i => i >= 0);
      return open.length ? open[n % open.length] + 1 : 1;
    }, t);
    await page.tap('#flower-zone .flower:nth-child(' + idx + ')').catch(() => {});
    await wait(170);
  }
  check('flowers bloom', await page.evaluate(() => document.querySelectorAll('#panel-garden .flower.bloom').length >= 4),
    String(await page.evaluate(() => document.querySelectorAll('#panel-garden .flower.bloom').length)));
  await noBugTap.evaluate(el => el.remove());
  await page.tap('#panel-garden .butterfly').catch(() => {});
  await wait(800);
  await page.tap('#tap-fluttershy');
  await wait(700);
  check('critters appear after fluttershy tap', await page.evaluate(() => document.querySelectorAll('#critter-zone .critter.in').length === 2));
  await shot('04-garden');

  /* rainbow magic */
  await page.tap('.tab[data-act="rainbow"]');
  await wait(500);
  check('rainbow panel active', await page.$eval('#panel-rainbow', el => el.classList.contains('active')));
  const box = await page.$eval('#rainbow-canvas', el => ({ w: el.clientWidth, h: el.clientHeight }));
  await page.mouse.move(box.w * 0.25, box.h * 0.5);
  await page.mouse.down();
  for (let i = 0; i <= 12; i++) await page.mouse.move(box.w * (0.25 + i * 0.04), box.h * (0.5 - i * 0.02));
  await page.mouse.up();
  await wait(200);
  await page.mouse.move(box.w * 0.7, box.h * 0.3);
  await page.mouse.down();
  for (let i = 0; i <= 10; i++) await page.mouse.move(box.w * (0.7 - i * 0.05), box.h * (0.3 + i * 0.03));
  await page.mouse.up();
  await page.mouse.move(box.w * 0.5, box.h * 0.7);
  await page.mouse.down();
  for (let i = 0; i <= 10; i++) await page.mouse.move(box.w * (0.5 + i * 0.03), box.h * (0.7 - i * 0.02));
  await page.mouse.up();
  await wait(300);
  const painted = await page.evaluate(() => {
    const c = document.getElementById('rainbow-canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 12) n++;
    return n;
  });
  check('rainbow canvas painted', painted > 500, 'px=' + painted);
  check('stars scattered in sky', await page.evaluate(() => document.querySelectorAll('#star-layer .sky-star').length > 0));
  await shot('05-rainbow');

  /* sun surprise */
  const starsBeforeSun = await page.evaluate(() => +document.getElementById('star-count').textContent);
  await page.tap('#btn-sun').catch(() => {});
  await wait(1400);
  const starsAfterSun = await page.evaluate(() => +document.getElementById('star-count').textContent);
  check('sun grants a star', starsAfterSun === starsBeforeSun + 1, starsBeforeSun + '->' + starsAfterSun);

  /* ── SCENE 3 ── */
  await page.tap('#pill-stars');
  await wait(800);
  check('collection scene visible', await page.$eval('#scene-collection', el => el.classList.contains('active')));
  const bar = await page.evaluate(() => ({
    slots: document.querySelectorAll('#big-bar .slot').length,
    got: document.querySelectorAll('#big-bar .slot.got').length,
    count: document.getElementById('coll-count').textContent,
    max: document.getElementById('coll-max').textContent,
    friends: document.querySelectorAll('#friends-row .friend-slot.on').length,
    stickers: document.querySelectorAll('#sticker-grid .sticker').length,
    unlocked: document.querySelectorAll('#sticker-grid .sticker.unlocked').length
  }));
  check('15 star slots', bar.slots === 15);
  check('bar matches count', bar.got === +bar.count, 'got=' + bar.got + ' count=' + bar.count);
  const expStars = await page.evaluate(() => +document.getElementById('star-count').textContent);
  const expFriends = 2 + [4, 7, 10, 13].filter(n => expStars >= n).length;
  const expStickers = [1, 4, 7, 10, 13, 15].filter(n => expStars >= n).length;
  check('two friends by default', bar.friends === expFriends, 'got=' + bar.friends + ' expect=' + expFriends);
  check('6 stickers, first ones unlocked', bar.stickers === 6 && bar.unlocked === expStickers, 'unlocked=' + bar.unlocked + ' expect=' + expStickers);
  await shot('06-collection');

  /* ── SCENE 4 — force progress then open secret ── */
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('koka-pony-world-v1') || '{}');
    s.stars = 15; s.secret = true; s.once = s.once || {};
    localStorage.setItem('koca-pony-world-v1', JSON.stringify(s));
    localStorage.setItem('koka-pony-world-v1', JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'networkidle2' });
  await wait(1200);
  check('gift button unlocked', await page.$eval('#btn-secret', el => !el.hidden));
  check('all stars restored from storage', await page.evaluate(() => +document.getElementById('star-count').textContent) === 15);
  check('dash runner unlocked', await page.evaluate(() => !!document.getElementById('dash-runner')));
  await page.tap('#btn-secret');
  await wait(1200);
  check('secret scene visible', await page.$eval('#scene-secret', el => el.classList.contains('active')));
  await wait(3600);
  check('pinkie jumped in', await page.$eval('#secret-pinkie', el => el.classList.contains('in')));
  const msg = await page.$eval('#secret-msg', el => el.textContent.replace(/\u00A0/g, ' ').trim());
  check('secret message', msg === 'a little magic, just for you ♡', msg);
  check('hug button shown', await page.$eval('#btn-hug', el => !el.hidden));
  await shot('07-secret');

  await page.tap('#btn-hug');
  await wait(900);
  check('hug animation active', await page.$eval('#scene-secret', el => el.classList.contains('hug')));
  check('rainbow revealed', await page.$eval('#scene-secret', el => el.classList.contains('rainbow-on')));
  await shot('08-hug');
  await wait(3000);

  /* dash fly-by + collection full state */
  await page.tap('#btn-back-secret');
  await wait(700);
  check('back to playground', await page.$eval('#scene-play', el => el.classList.contains('active')));
  await page.waitForFunction(() => !document.getElementById('dash-runner').hidden, { timeout: 20000 }).catch(() => {});
  const dashVisible = await page.$eval('#dash-runner', el => !el.hidden);
  check('rainbow dash flies by', dashVisible);
  if (dashVisible) await shot('09-dash');
  await page.tap('#pill-stars'); await wait(800);
  const full = await page.evaluate(() => ({
    got: document.querySelectorAll('#big-bar .slot.got').length,
    stickers: document.querySelectorAll('#sticker-grid .sticker.unlocked').length,
    friends: document.querySelectorAll('#friends-row .friend-slot.on').length
  }));
  check('collection complete (15/6/6)', full.got === 15 && full.stickers === 6 && full.friends === 6, JSON.stringify(full));
  await shot('10-collection-full');

  /* background music follows the sound toggle */
  await page.tap('#btn-sound');
  await wait(1800);
  check('background music plays', await page.evaluate(() => {
    const b = window.KY.sound.bg;
    return !!b && b.loop === true && !b.paused && b.currentTime > 0.2;
  }));
  await page.tap('#btn-sound');
  await wait(1500);
  check('background music stops with toggle', await page.evaluate(() => {
    const b = window.KY.sound.bg;
    return !!b && b.paused;
  }));

  /* sound toggle default off */
  const soundState = await page.evaluate(() => ({
    on: window.KY.sound.on,
    pressed: document.getElementById('btn-sound').getAttribute('aria-pressed')
  }));
  check('sound OFF by default', soundState.on === false && soundState.pressed === 'false', JSON.stringify(soundState));

  /* home again */
  await page.tap('#btn-home');
  await wait(900);
  check('home again', await page.$eval('#scene-home', el => el.classList.contains('active')));
  await page.tap('#btn-cat'); await wait(300);
  await shot('11-home-final');

  /* reduced motion + tiny screen sanity */
  await page.setViewport({ width: 320, height: 480, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.tap('#btn-start'); await wait(800);
  check('works on 320x480', await page.$eval('#scene-play', el => el.classList.contains('active')));
  await shot('12-small-screen');
} catch (e) {
  errors.push('FATAL: ' + e.message + '\n' + (e.stack || ''));
}

console.log('\n────RESULTS────');
results.forEach(r => console.log(r));
console.log('\n────ERRORS────');
console.log(errors.length ? errors.join('\n') : '(none)');
await browser.close();
process.exit(results.some(r => r.startsWith('FAIL')) || errors.length > 0 ? 1 : 0);
