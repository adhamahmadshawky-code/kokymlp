/* ═══════════════════════════════════════════════════════════
   app.js — scenes, activities, friendship stars, secrets
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const KY = window.KY;
  const SAVE_KEY = 'koka-pony-world-v1';
  const MAX_STARS = 15;

  /* ── persistent state ─────────────────────────────────── */
  const state = {
    stars: 0,
    sound: false,
    secret: false,
    counts: { party: 0, garden: 0, rainbow: 0 },
    once: { sun: false, cat: false, dash: false, first: false }
  };

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d && typeof d === 'object') {
        state.stars = Math.max(0, Math.min(MAX_STARS, d.stars | 0));
        state.sound = !!d.sound;
        state.secret = !!d.secret;
        if (d.counts) state.counts = d.counts;
        if (d.once) state.once = d.once;
      }
    } catch (e) {}
  }

  /* ── shortcuts ────────────────────────────────────────── */
  const $ = function (s, r) { return (r || document).querySelector(s); };
  const $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  const rand = function (a, b) { return a + Math.random() * (b - a); };
  const pick = function (a) { return a[(Math.random() * a.length) | 0]; };

  const EL = {};
  const sceneNames = ['home', 'play', 'collection', 'secret'];
  let currentScene = '';

  /* ── sticker book ─────────────────────────────────────── */
  const STICKERS = [
    { id: 'duo',      need: 1,  label: 'pinky pie + fluttershy' },
    { id: 'twilight', need: 4,  label: 'twilight sparkle' },
    { id: 'rainbow',  need: 7,  label: 'rainbow dash' },
    { id: 'rarity',   need: 10, label: 'rarity' },
    { id: 'applejack',need: 13, label: 'applejack' },
    { id: 'finale',   need: 15, label: 'all of ponyville ♡' }
  ];

  /* ═══════════ HUD ═══════════ */

  function updateHUD() {
    $('#star-count').textContent = state.stars;
    $('#pill-bar-fill').style.width = (state.stars / MAX_STARS * 100) + '%';
    EL.btnSecret.hidden = !(state.secret && state.stars >= 3);
    EL.btnSound.classList.toggle('on', state.sound);
    EL.btnSound.setAttribute('aria-pressed', state.sound ? 'true' : 'false');
  }

  function toast(msg, ms) {
    const t = EL.toast;
    t.textContent = msg;
    t.classList.remove('show');
    void t.offsetWidth;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove('show'); }, ms || 2200);
  }

  /* ═══════════ friendship stars ═══════════ */

  function grantStar(fromEl) {
    if (state.stars >= MAX_STARS) {
      KY.sound.play('sparkle');
      KY.hearts(window.innerWidth / 2, window.innerHeight * 0.4, 6);
      toast('your collection is complete ♡');
      return;
    }
    state.stars++;
    state.once.first = true;
    save();
    KY.sound.play('star');
    const from = fromEl || EL.pill;
    KY.flyStar(from, EL.pill, function () {
      updateHUD();
      EL.pill.animate([
        { transform: 'scale(1)' }, { transform: 'scale(1.28)' }, { transform: 'scale(1)' }
      ], { duration: 420, easing: 'ease-out' });
    });
    updateHUD();
    revealBigBar();
    checkMilestones();
  }

  function checkMilestones() {
    const s = state.stars;
    if (s >= 1 && !state.once.first) { /* handled in grantStar */ }
    if (s >= 1) toast('friendship star! ✦ ' + s + '/' + MAX_STARS);
    if (s >= 3 && !state.secret) {
      state.secret = true; save();
      setTimeout(function () {
        toast('fluttershy has a secret for you…');
      }, 700);
    }
    if (s === 6) setTimeout(function () { toast('twilight sparkle says hi ✦'); }, 500);
    if (s === 9) { startDashing(); setTimeout(function () { toast('rainbow dash zooms by! ✦'); }, 500); }
    if (s === 12) setTimeout(function () { toast('rarity sparkles in ✦'); }, 500);
    if (s >= MAX_STARS) {
      setTimeout(function () {
        KY.confetti(window.innerWidth / 2, window.innerHeight * 0.35, 90);
        KY.hearts(window.innerWidth / 2, window.innerHeight * 0.5, 24);
        toast('all of ponyville loves you! ♡', 4200);
      }, 500);
    }
    buildStickerGrid();
    updateHUD();
    spawnHiddenFriends();
  }

  /* count an interaction; award a star every `every` taps */
  function interact(kind, every, fromEl) {
    state.counts[kind] = (state.counts[kind] || 0) + 1;
    save();
    if (state.counts[kind] % every === 0) {
      grantStar(fromEl || EL.pill);
      return true;
    }
    return false;
  }

  /* ═══════════ router ═══════════ */

  function showScene(name) {
    if (sceneNames.indexOf(name) < 0) name = 'home';
    if (name === 'secret' && !(state.secret && state.stars >= 3)) name = 'play';
    currentScene = name;
    $$('.scene').forEach(function (sc) {
      sc.classList.toggle('active', sc.id === 'scene-' + name);
    });
    EL.app.setAttribute('data-scene', name);
    EL.btnHome.style.visibility = name === 'home' ? 'hidden' : 'visible';
    if (name === 'collection') buildCollection();
    if (name === 'play') activatePanel(currentPanel, true);
    if (name === 'home') animateHomePonies();
    if (name === 'secret') {
      resetSecret();
      st(runSecretSequence, 450);
    }
    stopDashing();
    try { history.replaceState(null, '', '#' + name); } catch (e) {}
  }

  function go(name) {
    if (name === currentScene) return;
    KY.sweep();
    KY.sound.play('ui');
    setTimeout(function () { showScene(name); }, 260);
  }

  /* ═══════════ SCENE 1 — home ═══════════ */

  let homePinkie, homeFluttershy, blinkTimer, winkTimer;

  function animateHomePonies() {
    clearInterval(blinkTimer); clearInterval(winkTimer);
    blinkTimer = setInterval(function () {
      if (currentScene !== 'home') return;
      KY.setFace(homePinkie, 'closed');
      KY.setFace(homeFluttershy, 'closed');
      setTimeout(function () {
        KY.setFace(homePinkie, 'happy');
        KY.setFace(homeFluttershy, 'happy');
      }, 180);
    }, 5200);
    winkTimer = setInterval(function () {
      if (currentScene !== 'home' || Math.random() > 0.5) return;
      KY.setFace(homeFluttershy, 'closed');
      setTimeout(function () { KY.setFace(homeFluttershy, 'happy'); }, 500);
    }, 9000);
  }

  function buildTwinkles(el, n) {
    let html = '';
    for (let i = 0; i < n; i++) {
      html += '<span class="twinkle" style="left:' + rand(2, 98).toFixed(1) + '%;top:' + rand(2, 60).toFixed(1) +
        '%;font-size:' + rand(8, 20).toFixed(0) + 'px;animation-delay:' + rand(0, 3).toFixed(2) + 's">✦</span>';
    }
    el.innerHTML = html;
  }

  /* ═══════════ SCENE 2 — playground ═══════════ */

  let currentPanel = 'party';
  let pinkieSvg, fluttershySvg, dashSvg;

  /* --- party --- */
  const BALLOON_COLORS = ['#ff8fb8', '#ffd94a', '#a8dcf0', '#c9a7f0', '#a8ecd9', '#ffb37e'];
  let danceTimer = null, partyBurstTimer = null;

  function buildBalloons() {
    const zone = EL.balloonZone;
    zone.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const b = document.createElement('button');
      b.className = 'balloon';
      b.type = 'button';
      b.setAttribute('aria-label', 'pop the balloon');
      b.style.left = (8 + i * 23 + rand(-3, 3)).toFixed(1) + '%';
      b.style.setProperty('--s', rand(0.85, 1.15).toFixed(2));
      b.style.setProperty('--sway', rand(2.2, 3.6).toFixed(2) + 's');
      b.style.setProperty('--d', rand(-2, 0).toFixed(2) + 's');
      b.style.setProperty('--y', rand(6, 20).toFixed(0) + '%');
      b.innerHTML = KY.balloonSVG(pick(BALLOON_COLORS));
      zone.appendChild(b);
    }
  }

  function popBalloon(b) {
    if (b.classList.contains('popped')) return;
    b.classList.add('popped');
    const c = KY.centerOf(b);
    KY.confetti(c.x, c.y, 22);
    KY.sparkles(c.x, c.y, 10);
    KY.floatText(c.x, c.y, pick(['pop!', 'yay!', '♡', 'wheee!']));
    KY.sound.play('party');
    interact('party', 4, b);
    setTimeout(function () { respawnBalloon(b); }, 950);
  }

  function respawnBalloon(b) {
    b.classList.remove('popped');
    b.classList.add('incoming');
    b.innerHTML = KY.balloonSVG(pick(BALLOON_COLORS));
    b.style.left = (8 + rand(0, 88)).toFixed(1) + '%';
    setTimeout(function () { b.classList.remove('incoming'); }, 500);
  }

  const PARTY_TALK = ['whee!', 'yay!', 'party time!', 'hehe!', 'best day ever!', '♡!'];

  function pinkieDance() {
    if (!pinkieSvg) return;
    const holder = EL.tapPinkie;
    holder.classList.add('dancing');
    KY.setFace(pinkieSvg, 'silly');
    KY.sound.play('party');
    EL.hintParty.classList.add('gone');

    clearTimeout(danceTimer); clearInterval(partyBurstTimer);
    const c = KY.centerOf(holder);
    KY.confetti(c.x, c.y, 40);
    KY.hearts(c.x, c.y - 20, 5);
    speak('party', pick(PARTY_TALK));

    partyBurstTimer = setInterval(function () {
      if (!holder.classList.contains('dancing')) { clearInterval(partyBurstTimer); return; }
      const r = KY.centerOf(holder);
      KY.confetti(r.x + rand(-60, 60), r.y + rand(-30, 40), 8);
    }, 220);

    danceTimer = setTimeout(function () {
      holder.classList.remove('dancing');
      KY.setFace(pinkieSvg, 'happy');
      clearInterval(partyBurstTimer);
    }, 2400);

    interact('party', 4, holder);
  }

  function speak(which, text) {
    const el = which === 'party' ? EL.speechParty : EL.speechGarden;
    el.textContent = text;
    el.hidden = false;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
    clearTimeout(speak['_t_' + which]);
    speak['_t_' + which] = setTimeout(function () {
      el.hidden = true;
    }, 1600);
  }

  /* --- garden --- */
  const FLOWER_COLORS = ['#ff8fb8', '#ffd94a', '#c9a7f0', '#a8dcf0', '#ff9ecb', '#a8ecd9'];
  let crittersOut = false;

  function buildGarden() {
    const fz = EL.flowerZone;
    fz.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const f = document.createElement('button');
      f.className = 'flower';
      f.type = 'button';
      f.setAttribute('aria-label', 'make a flower bloom');
      f.style.left = (5 + i * 15.5 + rand(-2, 2)).toFixed(1) + '%';
      f.style.setProperty('--h', rand(58, 92).toFixed(0) + 'px');
      f.style.setProperty('--d', rand(-2, 2).toFixed(2) + 's');
      f.innerHTML = KY.flowerSVG(pick(FLOWER_COLORS));
      fz.appendChild(f);
    }
    const cz = EL.critterZone;
    cz.innerHTML = '';
    const bun = document.createElement('div');
    bun.className = 'critter bunny';
    bun.innerHTML = KY.bunnySVG();
    const bird = document.createElement('div');
    bird.className = 'critter bird';
    bird.innerHTML = KY.birdSVG();
    cz.appendChild(bun); cz.appendChild(bird);
    crittersOut = false;
  }

  function bloomFlower(f) {
    const c = KY.centerOf(f);
    f.classList.toggle('bloom');
    KY.sparkles(c.x, c.y, 9);
    if (f.classList.contains('bloom')) {
      KY.floatText(c.x, c.y, pick(['♡', '✦', 'so pretty!']));
      KY.sound.play('bloom');
      KY.hearts(c.x, c.y, 2);
    } else {
      KY.sound.play('ui');
    }
    EL.hintGarden.classList.add('gone');
    interact('garden', 4, f);
  }

  function buildButterflies() {
    const zone = EL.flowerZone;
    $$('.butterfly', EL.panelGarden).forEach(function (b) { b.remove(); });
    for (let i = 0; i < 3; i++) addButterfly();
  }

  function addButterfly() {
    const b = document.createElement('button');
    b.className = 'butterfly';
    b.type = 'button';
    b.setAttribute('aria-label', 'chase a butterfly');
    b.style.setProperty('--x', rand(8, 78).toFixed(1) + '%');
    b.style.setProperty('--y', rand(18, 60).toFixed(1) + '%');
    b.style.setProperty('--dx', rand(80, 220).toFixed(0) + 'px');
    b.style.setProperty('--dy', rand(-70, 70).toFixed(0) + 'px');
    b.style.setProperty('--dur', rand(6, 11).toFixed(1) + 's');
    b.style.setProperty('--d', rand(-6, 0).toFixed(2) + 's');
    b.style.setProperty('--s', rand(0.7, 1.15).toFixed(2));
    b.innerHTML = KY.butterflySVG(pick(['#f7a8c9', '#c9a7f0', '#a8dcf0', '#ffe98a']), pick(['#e0b7f0', '#b7e3f5', '#ffd1e8']));
    EL.panelGarden.appendChild(b);
  }

  function catchButterfly(b) {
    if (b.classList.contains('caught')) return;
    b.classList.add('caught');
    const c = KY.centerOf(b);
    KY.sparkles(c.x, c.y, 14);
    KY.hearts(c.x, c.y, 3);
    KY.floatText(c.x, c.y, pick(['♡', 'flut-ter-fly!', '✦']));
    KY.sound.play('sparkle');
    interact('garden', 4, b);
    setTimeout(function () { b.remove(); addButterfly(); }, 1200);
  }

  function fluttershyReact() {
    if (!fluttershySvg) return;
    EL.hintGarden.classList.add('gone');
    KY.setFace(fluttershySvg, 'shy');
    KY.sound.play('bloom');
    const c = KY.centerOf(EL.tapFluttershy);
    KY.hearts(c.x, c.y, 3);
    KY.sparkles(c.x, c.y, 6);
    speak('garden', pick(['oh my…', 'hi there…', "you're so sweet", 'eep!']));
    if (!crittersOut) {
      crittersOut = true;
      setTimeout(function () {
        $$('.critter', EL.critterZone).forEach(function (cr, i) {
          setTimeout(function () { cr.classList.add('in'); }, i * 320);
        });
      }, 500);
    } else {
      const bun = $('.critter.bunny', EL.critterZone);
      if (bun) {
        bun.classList.remove('hop'); void bun.getBoundingClientRect();
        bun.classList.add('hop');
      }
    }
    clearTimeout(fluttershyReact._t);
    fluttershyReact._t = setTimeout(function () {
      KY.setFace(fluttershySvg, 'happy');
    }, 1500);
    interact('garden', 4, EL.tapFluttershy);
  }

  /* --- rainbow magic (canvas) --- */
  const cv = { canvas: null, ctx: null, w: 0, h: 0, dpr: 1, drawing: false, hue: 0, loop: 0, active: false, lastClear: 0 };

  function sizeCanvas() {
    if (!cv.canvas) return;
    const r = EL.panelRainbow.getBoundingClientRect();
    cv.w = Math.max(1, r.width); cv.h = Math.max(1, r.height);
    cv.dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.canvas.width = cv.w * cv.dpr;
    cv.canvas.height = cv.h * cv.dpr;
    cv.canvas.style.width = cv.w + 'px';
    cv.canvas.style.height = cv.h + 'px';
    cv.ctx.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
    cv.ctx.lineCap = 'round';
    cv.ctx.lineJoin = 'round';
  }

  function fadeLoop() {
    if (!cv.active) return;
    if (cv.drawing) { cv.loop = requestAnimationFrame(fadeLoop); return; }
    const ctx = cv.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.014)';
    ctx.fillRect(0, 0, cv.w, cv.h);
    ctx.restore();
    cv.loop = requestAnimationFrame(fadeLoop);
  }

  function paintStroke(x0, y0, x1, y1) {
    const ctx = cv.ctx;
    cv.hue = (cv.hue + 7) % 360;
    ctx.save();
    ctx.shadowColor = 'hsla(' + cv.hue + ',100%,65%,.9)';
    ctx.shadowBlur = 18;
    ctx.strokeStyle = 'hsl(' + cv.hue + ',100%,62%)';
    ctx.lineWidth = 16;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.shadowBlur = 8;
    ctx.strokeStyle = 'hsla(' + cv.hue + ',100%,86%,.95)';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.restore();
  }

  function scatterStars(x, y) {
    const layer = EL.starLayer;
    const cap = 24;
    while (layer.children.length >= cap) layer.removeChild(layer.children[0]);
    const n = 2 + (Math.random() * 3 | 0);
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'sky-star';
      s.innerHTML = '✦';
      s.style.left = (x + rand(-40, 40)) + 'px';
      s.style.top = (y + rand(-40, 40)) + 'px';
      s.style.fontSize = rand(9, 22).toFixed(0) + 'px';
      s.style.setProperty('--tw', rand(1.4, 3).toFixed(2) + 's');
      s.style.setProperty('--dy', rand(-26, 26).toFixed(0) + 'px');
      layer.appendChild(s);
    }
  }

  function wireCanvas() {
    const c = EL.rainbowCanvas;
    cv.canvas = c; cv.ctx = c.getContext('2d');
    sizeCanvas();

    function pos(e) {
      const r = c.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    let px = 0, py = 0, strokes = 0;

    c.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      cv.drawing = true;
      c.setPointerCapture(e.pointerId);
      const p = pos(e);
      px = p.x; py = p.y;
      cv.hue = rand(0, 360) | 0;
      scatterStars(p.x, p.y);
      KY.sparkles(c.getBoundingClientRect().left + p.x, c.getBoundingClientRect().top + p.y, 5);
      KY.sound.play('fly');
      EL.hintRainbow.classList.add('gone');
    });

    c.addEventListener('pointermove', function (e) {
      if (!cv.drawing) return;
      e.preventDefault();
      const p = pos(e);
      const dx = p.x - px, dy = p.y - py;
      if (dx * dx + dy * dy < 3) return;
      paintStroke(px, py, p.x, p.y);
      if (Math.random() < 0.12) scatterStars(p.x, p.y);
      px = p.x; py = p.y;
    });

    function endStroke() {
      if (!cv.drawing) return;
      cv.drawing = false;
      strokes++;
      if (strokes % 3 === 0) grantStar(EL.panelRainbow);
    }
    c.addEventListener('pointerup', endStroke);
    c.addEventListener('pointercancel', endStroke);
    c.addEventListener('pointerleave', endStroke);

    EL.btnClearSky.addEventListener('click', function () {
      const ctx = cv.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.fillRect(0, 0, cv.w, cv.h);
      ctx.restore();
      EL.starLayer.innerHTML = '';
      KY.sound.play('sparkle');
      KY.sparkles(window.innerWidth / 2, window.innerHeight * 0.4, 16);
    });

    activatePanel('party', true);
  }

  function activatePanel(name, silent) {
    currentPanel = name;
    $$('.panel').forEach(function (p) { p.classList.toggle('active', p.id === 'panel-' + name); });
    $$('.tab').forEach(function (t) { t.classList.toggle('active', t.dataset.act === name); });
    cv.active = (name === 'rainbow');
    if (cv.active) {
      sizeCanvas();
      cancelAnimationFrame(cv.loop);
      fadeLoop();
    } else {
      cancelAnimationFrame(cv.loop);
    }
    if (!silent) KY.sound.play('ui');
  }

  /* --- hidden friends --- */
  function spawnHiddenFriends() {
    // twilight sparkle tiptoes in at 6 stars
    let tw = $('#hidden-twilight');
    if (state.stars >= 6 && !tw) {
      tw = document.createElement('button');
      tw.id = 'hidden-twilight';
      tw.className = 'hidden-friend';
      tw.type = 'button';
      tw.setAttribute('aria-label', 'twilight sparkle');
      tw.innerHTML = KY.pony('twilight', { cls: 'pony-mini' });
      EL.stage.appendChild(tw);
      tw.addEventListener('click', function () {
        const c = KY.centerOf(tw);
        KY.sparkles(c.x, c.y, 14);
        KY.hearts(c.x, c.y, 3);
        KY.sound.play('sparkle');
        tw.classList.add('bye');
        setTimeout(function () { tw.remove(); spawnHiddenFriends(); }, 900);
      });
    } else if (state.stars >= 6 && tw) {
      tw.style.display = '';
    }
    // rarity's gem sparkle in the garden at 12 stars
    let gem = $('#hidden-gem');
    if (state.stars >= 12 && !gem) {
      gem = document.createElement('button');
      gem.id = 'hidden-gem';
      gem.className = 'hidden-gem';
      gem.type = 'button';
      gem.setAttribute('aria-label', 'a sparkly gem');
      gem.innerHTML = '<span>💎</span>';
      EL.panelGarden.appendChild(gem);
      gem.addEventListener('click', function () {
        const c = KY.centerOf(gem);
        KY.sparkles(c.x, c.y, 18);
        KY.hearts(c.x, c.y, 4);
        KY.sound.play('sparkle');
        toast('rarity adores your eye for beauty! ✦');
        gem.classList.add('bye');
        setTimeout(function () { gem.remove(); }, 700);
      });
    }
  }

  /* --- rainbow dash fly-by --- */
  let dashTimer = null;
  function startDashing() {
    if (dashTimer || state.stars < 9) return;
    const run = function () {
      if (currentScene !== 'play' || state.stars < 9) { dashTimer = setTimeout(run, 4000); return; }
      EL.dashRunner.hidden = false;
      EL.dashRunner.innerHTML = KY.pony('rainbow', { cls: 'pony-mini' });
      dashSvg = EL.dashRunner.querySelector('svg');
      EL.dashRunner.classList.remove('run');
      void EL.dashRunner.offsetWidth;
      EL.dashRunner.classList.add('run');
      KY.sound.play('fly');
      setTimeout(function () {
        EL.dashRunner.classList.remove('run');
        EL.dashRunner.hidden = true;
      }, 5200);
      dashTimer = setTimeout(run, 14000);
    };
    dashTimer = setTimeout(run, 2500);
  }
  function stopDashing() {
    if (dashTimer) { clearTimeout(dashTimer); dashTimer = null; }
    EL.dashRunner.classList.remove('run');
    EL.dashRunner.hidden = true;
  }

  /* ═══════════ SCENE 3 — collection ═══════════ */

  function buildBigBar() {
    let html = '';
    for (let i = 0; i < MAX_STARS; i++) {
      html += '<span class="slot' + (i < state.stars ? ' got' : '') + '">' + KY.starSVG() + '</span>';
    }
    EL.bigBar.innerHTML = html;
  }
  function revealBigBar() {
    const slots = $$('.slot', EL.bigBar);
    slots.forEach(function (s, i) {
      if (i < state.stars && !s.classList.contains('got')) {
        s.classList.add('got');
        s.animate([{ transform: 'scale(0) rotate(-120deg)' }, { transform: 'scale(1.4) rotate(10deg)' }, { transform: 'scale(1)' }],
          { duration: 480, easing: 'cubic-bezier(.2,1.4,.4,1)' });
      }
    });
    $('#coll-count').textContent = state.stars;
  }

  function buildStickerGrid() {
    const grid = EL.stickerGrid;
    if (!grid) return;
    grid.innerHTML = '';
    STICKERS.forEach(function (st) {
      const unlocked = state.stars >= st.need;
      const card = document.createElement('div');
      card.className = 'sticker' + (unlocked ? ' unlocked' : ' locked');
      card.innerHTML =
        '<div class="sticker-art">' + (unlocked ? stickerArt(st.id) : '<span class="q">?</span>') + '</div>' +
        '<span class="sticker-label">' + (unlocked ? st.label : st.need + '★') + '</span>';
      if (unlocked) {
        card.addEventListener('click', function () {
          KY.sound.play('sparkle');
          KY.confetti(KY.centerOf(card).x, KY.centerOf(card).y, 16);
        });
      }
      grid.appendChild(card);
    });
  }

  function stickerArt(id) {
    if (id === 'duo') {
      return '<span class="duo-minis"><span class="mini m1">' + KY.pony('pinkie', { cls: 'pony-tiny' }) + '</span>' +
             '<span class="mini m2">' + KY.pony('fluttershy', { cls: 'pony-tiny' }) + '</span></span>';
    }
    if (id === 'finale') {
      return '<span class="duo-minis finale-minis">' + ['pinkie', 'fluttershy', 'twilight', 'rainbow', 'rarity', 'applejack']
        .map(function (n) { return '<span class="mini">' + KY.pony(n, { cls: 'pony-pico' }) + '</span>'; }).join('') + '</span>';
    }
    return '<span class="mini">' + KY.pony(id, { cls: 'pony-tiny' }) + '</span>';
  }

  function buildCollection() {
    buildBigBar();
    revealBigBar();
    buildStickerGrid();
    const row = EL.friendsRow;
    row.innerHTML = '';
    const names = ['pinkie', 'fluttershy', 'twilight', 'rainbow', 'rarity', 'applejack'];
    names.forEach(function (n, i) {
      const unlocked = n === 'pinkie' || n === 'fluttershy' || state.stars >= [1, 1, 4, 7, 10, 13][i];
      const slot = document.createElement('div');
      slot.className = 'friend-slot' + (unlocked ? ' on' : '');
      slot.style.setProperty('--d', (i * 0.18) + 's');
      slot.innerHTML = unlocked ? KY.pony(n, { cls: 'pony-mini' }) : '<span class="q">?</span>';
      if (unlocked) {
        slot.addEventListener('click', function () {
          KY.sound.play('ui');
          KY.hearts(KY.centerOf(slot).x, KY.centerOf(slot).y - 20, 3);
          KY.sparkles(KY.centerOf(slot).x, KY.centerOf(slot).y, 6);
        });
      }
      row.appendChild(slot);
    });
  }

  /* ═══════════ SCENE 4 — the secret ═══════════ */

  let secretPinkie, secretFluttershy;
  let secretTimers = [];
  let secretDone = false;
  let hugRain = null;

  function st(fn, ms) { secretTimers.push(setTimeout(fn, ms)); }
  function clearSecretTimers() {
    secretTimers.forEach(clearTimeout);
    secretTimers = [];
    if (hugRain) { clearInterval(hugRain); hugRain = null; }
  }

  function resetSecret() {
    clearSecretTimers();
    secretDone = false;
    EL.sceneSecret.classList.remove('gifted', 'hug', 'rainbow-on');
    EL.secretGift.classList.remove('open');
    EL.secretGift.style.display = '';
    EL.secretMsg.innerHTML = '';
    EL.secretMsg.classList.remove('show');
    EL.btnHug.hidden = true;
    KY.mountPony(EL.secretFluttershy, 'fluttershy', { cls: 'pony-mid' });
    KY.mountPony(EL.secretPinkie, 'pinkie', { cls: 'pony-mid' });
    secretPinkie = EL.secretPinkie.querySelector('svg');
    secretFluttershy = EL.secretFluttershy.querySelector('svg');
    EL.secretPinkie.classList.remove('in');
  }

  function runSecretSequence() {
    if (secretDone) return;
    secretDone = true;
    EL.sceneSecret.classList.add('gifted');

    st(function () {
      EL.secretGift.classList.add('open');
      KY.sound.play('sparkle');
      const c = KY.centerOf(EL.secretGift);
      KY.sparkles(c.x, c.y, 16);
    }, 500);

    st(function () {
      const c = KY.centerOf(EL.secretGift);
      KY.confetti(c.x, c.y, 30);
      KY.hearts(c.x, c.y, 8);
      EL.secretGift.style.display = 'none';
      KY.setFace(secretFluttershy, 'happy');
      EL.sceneSecret.classList.add('opened');
    }, 1150);

    st(function () {
      EL.secretPinkie.classList.add('in');
      KY.sound.play('party');
      const c = KY.centerOf(EL.secretPinkie);
      KY.confetti(c.x, c.y - 30, 46);
      KY.sparkles(c.x, c.y, 12);
    }, 1600);

    st(function () { typeMessage(); }, 2200);

    st(function () {
      EL.btnHug.hidden = false;
      EL.btnHug.classList.add('pop-in');
      KY.sound.play('ui');
    }, 3900);
  }

  function typeMessage() {
    const msg = 'a little magic, just for you ♡';
    const el = EL.secretMsg;
    el.innerHTML = '';
    el.classList.add('show');
    msg.split('').forEach(function (ch, i) {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = ch === ' ' ? '\u00A0' : ch;
      s.style.setProperty('--d', (i * 55) + 'ms');
      el.appendChild(s);
    });
    KY.sound.play('sparkle');
    st(function () {
      const r = el.getBoundingClientRect();
      KY.sparkles(r.left + rand(r.width * .2, r.width * .8), r.top + r.height / 2, 10);
    }, 500);
  }

  function bigHug() {
    const scene = EL.sceneSecret;
    scene.classList.add('hug', 'rainbow-on');
    KY.sound.play('hug');
    KY.setFace(secretPinkie, 'closed');
    KY.setFace(secretFluttershy, 'closed');

    const c1 = KY.centerOf(EL.secretFluttershy);
    const c2 = KY.centerOf(EL.secretPinkie);
    KY.confetti((c1.x + c2.x) / 2, Math.min(c1.y, c2.y) - 20, 60);
    KY.hearts(c1.x, c1.y, 8);

    if (hugRain) clearInterval(hugRain);
    hugRain = setInterval(function () {
      if (currentScene !== 'secret') { clearInterval(hugRain); hugRain = null; return; }
      KY.hearts(rand(0, window.innerWidth), rand(window.innerHeight * 0.25, window.innerHeight * 0.5), 2);
    }, 170);

    st(function () {
      scene.classList.remove('hug');
      scene.classList.add('hug-done');
      KY.setFace(secretPinkie, 'happy');
      KY.setFace(secretFluttershy, 'happy');
      if (hugRain) { clearInterval(hugRain); hugRain = null; }
    }, 2800);

    const r = EL.secretMsg.getBoundingClientRect();
    KY.sparkles(r.left + r.width / 2, r.top + r.height / 2, 14);
  }

  /* ═══════════ boot ═══════════ */

  function cacheEls() {
    [
      'app', 'btnHome', 'pill', 'pillStars', 'btnSecret', 'btnSound',
      'btnStart', 'btnCat', 'homeTwinkles', 'homePinkie', 'homeFluttershy',
      'balloonZone', 'tapPinkie', 'speechParty', 'hintParty',
      'panelGarden', 'flowerZone', 'critterZone', 'tapFluttershy', 'speechGarden', 'hintGarden',
      'panelRainbow', 'rainbowCanvas', 'starLayer', 'btnClearSky', 'hintRainbow',
      'tabbar', 'stage', 'bigBar', 'stickerGrid', 'friendsRow',
      'sceneSecret', 'secretStars', 'secretFluttershy', 'secretPinkie', 'secretGift', 'secretMsg', 'btnHug',
      'btnBackSecret', 'btnBackPlay', 'toast', 'dashRunner', 'btnSun', 'playSky', 'pillBarFill'
    ].forEach(function (n) {
      EL[n] = document.getElementById(n.replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); }));
    });
    EL.pill = EL.pill || $('#pill-stars');
  }

  function wire() {
    /* HUD */
    EL.btnHome.addEventListener('click', function () { go('home'); });
    EL.pillStars.addEventListener('click', function () { go('collection'); });
    EL.btnSecret.addEventListener('click', function () { go('secret'); });
    EL.btnSound.addEventListener('click', function () {
      KY.sound.toggle();
      state.sound = KY.sound.on;
      save();
      updateHUD();
    });

    /* home */
    EL.btnStart.addEventListener('click', function () {
      KY.confetti(window.innerWidth / 2, window.innerHeight * 0.72, 30);
      KY.hearts(window.innerWidth / 2, window.innerHeight * 0.6, 6);
      go('play');
    });
    EL.btnCat.addEventListener('click', function () {
      KY.sound.play('meow');
      const c = KY.centerOf(EL.btnCat);
      KY.hearts(c.x, c.y - 10, 5);
      KY.floatText(c.x, c.y - 24, 'mrrp~ ♡', '#c2418f');
      EL.btnCat.classList.remove('purr'); void EL.btnCat.offsetWidth; EL.btnCat.classList.add('purr');
      if (!state.once.cat) { state.once.cat = true; save(); }
    });
    EL.btnSun.addEventListener('click', function () {
      KY.sparkles(window.innerWidth * 0.82, 60, 18);
      KY.hearts(window.innerWidth * 0.82, 70, 5);
      KY.sound.play('sparkle');
      if (!state.once.sun) {
        state.once.sun = true; save();
        grantStar(EL.btnSun);
        toast('the sun gives you a friendship star! ☀︎');
      } else {
        KY.floatText(window.innerWidth * 0.82, 60, '☀︎');
      }
    });

    /* tabs */
    EL.tabbar.addEventListener('click', function (e) {
      const t = e.target.closest('.tab');
      if (!t) return;
      activatePanel(t.dataset.act);
    });

    /* party */
    EL.tapPinkie.addEventListener('click', pinkieDance);
    EL.balloonZone.addEventListener('click', function (e) {
      const b = e.target.closest('.balloon');
      if (b) popBalloon(b);
    });

    /* garden */
    EL.tapFluttershy.addEventListener('click', fluttershyReact);
    EL.panelGarden.addEventListener('click', function (e) {
      const f = e.target.closest('.flower');
      if (f) { bloomFlower(f); return; }
      const b = e.target.closest('.butterfly');
      if (b) { catchButterfly(b); return; }
    });

    /* rainbow dash fly-by */
    EL.dashRunner.addEventListener('click', function () {
      if (!state.once.dash) {
        state.once.dash = true; save();
        KY.hearts(window.innerWidth / 2, window.innerHeight * 0.3, 6);
        toast('rainbow dash says: you rock! ✦');
        grantStar(EL.dashRunner);
      } else {
        KY.sparkles(window.innerWidth / 2, window.innerHeight * 0.3, 12);
      }
      EL.dashRunner.classList.remove('run');
      EL.dashRunner.hidden = true;
    });

    /* collection */
    EL.btnBackPlay.addEventListener('click', function () { go('play'); });

    /* secret */
    EL.btnHug.addEventListener('click', bigHug);
    EL.btnBackSecret.addEventListener('click', function () {
      clearSecretTimers();
      go('play');
    });
    EL.secretGift.addEventListener('click', function () {
      if (!secretDone) { secretDone = false; runSecretSequence(); }
    });
    EL.secretFluttershy.addEventListener('click', function () {
      KY.setFace(secretFluttershy, 'shy');
      KY.hearts(KY.centerOf(EL.secretFluttershy).x, KY.centerOf(EL.secretFluttershy).y - 20, 3);
      KY.sound.play('bloom');
      clearTimeout(EL.secretFluttershy._t);
      EL.secretFluttershy._t = setTimeout(function () {
        if (!EL.sceneSecret.classList.contains('hug')) KY.setFace(secretFluttershy, 'happy');
      }, 1400);
      if (!secretDone) { secretDone = false; runSecretSequence(); }
    });

    /* resize */
    let rz;
    window.addEventListener('resize', function () {
      clearTimeout(rz);
      rz = setTimeout(function () {
        EL.app.style.setProperty('--appw', EL.app.clientWidth + 'px');
        if (cv.active) sizeCanvas();
      }, 120);
    });

    window.addEventListener('hashchange', function () {
      const h = (location.hash || '').replace('#', '');
      if (h && h !== currentScene) showScene(h);
    });
  }

  function mountArt() {
    KY.mountPony(EL.homePinkie, 'pinkie', { wave: true, cls: 'pony-big' });
    KY.mountPony(EL.homeFluttershy, 'fluttershy', { wave: true, cls: 'pony-big' });
    homePinkie = EL.homePinkie.querySelector('svg');
    homeFluttershy = EL.homeFluttershy.querySelector('svg');

    KY.mountPony(EL.tapPinkie, 'pinkie', { cls: 'pony-big' });
    pinkieSvg = EL.tapPinkie.querySelector('svg');
    KY.mountPony(EL.tapFluttershy, 'fluttershy', { cls: 'pony-big' });
    fluttershySvg = EL.tapFluttershy.querySelector('svg');

    buildTwinkles(EL.homeTwinkles, 16);
    buildTwinkles(EL.secretStars, 30);
    buildBalloons();
    buildGarden();
    buildButterflies();
    buildBigBar();
    buildStickerGrid();
  }

  function init() {
    load();
    cacheEls();
    EL.app.style.setProperty('--appw', EL.app.clientWidth + 'px');
    /* sun + dash fly-by must live above the (transparent) panels to stay tappable */
    EL.stage.appendChild(EL.btnSun);
    EL.stage.appendChild(EL.dashRunner);
    mountArt();
    wire();
    wireCanvas();
    updateHUD();
    spawnHiddenFriends();
    if (state.sound) KY.sound.enable(); else KY.sound.disable();

    const h = (location.hash || '').replace('#', '');
    showScene(h || 'home');
    if (state.stars > 0) toast('welcome back, koka ♡ ' + state.stars + '/' + MAX_STARS);

    // magic sparkle drizzle on the home sky, forever
    setInterval(function () {
      if (currentScene !== 'home' || KY.reduced) return;
      KY.sparkles(rand(0, window.innerWidth), rand(40, window.innerHeight * 0.5), 1);
    }, 2600);

    startDashing();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
