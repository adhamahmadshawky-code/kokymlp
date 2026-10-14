/* ═══════════════════════════════════════════════════════════
   effects.js — tiny sound engine (WebAudio, no assets) + particle magic
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const KY = (window.KY = window.KY || {});

  const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── sound: off by default, gentle synthesized chimes ──── */
  const Sound = {
    ctx: null,
    on: false,
    bg: null,
    bgOk: true,
    bgVol: 0.34,
    bgFade: null,

    enable: function () {
      this.on = true;
      try {
        if (!this.ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (AC) this.ctx = new AC();
        }
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      } catch (e) { /* audio unavailable — stay silent, never break the fun */ }
      this.startBg();
      if (this.ctx) this.play('sparkle');
    },

    disable: function () { this.on = false; this.stopBg(); },

    toggle: function () { this.on ? this.disable() : this.enable(); return this.on; },

    /* background music — plain <audio> so any file works */
    initBg: function () {
      if (this.bg || !this.bgOk) return;
      try {
        const a = new Audio('song.mp3');
        a.loop = true;
        a.preload = 'auto';
        a.volume = 0;
        a.addEventListener('error', () => { this.bgOk = false; });
        this.bg = a;
        /* browsers block autoplay without a gesture — retry on first tap */
        document.addEventListener('pointerdown', () => {
          if (this.on && this.bg && this.bg.paused) this.startBg();
        }, { once: true });
      } catch (e) { this.bgOk = false; }
    },

    startBg: function () {
      this.initBg();
      if (!this.bg || !this.bgOk) return;
      const a = this.bg;
      try {
        const p = a.play();
        if (p && p.catch) p.catch(() => {});
      } catch (e) { return; }
      clearInterval(this.bgFade);
      this.bgFade = setInterval(() => {
        if (a.volume < this.bgVol) a.volume = Math.min(this.bgVol, a.volume + 0.02);
        else clearInterval(this.bgFade);
      }, 60);
    },

    stopBg: function () {
      if (!this.bg) return;
      const a = this.bg;
      clearInterval(this.bgFade);
      this.bgFade = setInterval(() => {
        a.volume = Math.max(0, a.volume - 0.04);
        if (a.volume <= 0.001) { clearInterval(this.bgFade); a.pause(); }
      }, 50);
    },

    tone: function (freq, t0, dur, type, vol) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.16, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t0); osc.stop(t0 + dur + 0.05);
      return osc;
    },

    slide: function (f1, f2, t0, dur, type, vol) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(f1, t0);
      osc.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.14, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t0); osc.stop(t0 + dur + 0.05);
    },

    noise: function (t0, dur, vol) {
      const ctx = this.ctx;
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol || 0.1, t0);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800;
      src.connect(f); f.connect(g); g.connect(ctx.destination);
      src.start(t0);
    },

    play: function (name) {
      if (!this.on || !this.ctx) return;
      try {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const t = this.ctx.currentTime;
        switch (name) {
          case 'ui':      this.tone(660, t, .12, 'sine', .10); break;
          case 'pop':     this.slide(320, 880, t, .14, 'sine', .16); break;
          case 'sparkle': [880, 1180, 1560].forEach((f, i) => this.tone(f, t + i * .05, .18, 'sine', .09)); break;
          case 'bloom':   this.tone(520, t, .3, 'triangle', .12); this.tone(780, t + .06, .3, 'sine', .07); break;
          case 'party':
            this.noise(t, .22, .07);
            [523, 659, 784, 1046].forEach((f, i) => this.tone(f, t + i * .07, .24, 'square', .05));
            break;
          case 'star':    [660, 880, 1100, 1320].forEach((f, i) => this.tone(f, t + i * .06, .26, 'sine', .10)); break;
          case 'fly':     this.slide(500, 1400, t, .4, 'triangle', .08); break;
          case 'hug':
            [523, 659, 784].forEach((f, i) => this.tone(f, t + i * .05, .9, 'sine', .09));
            this.tone(1046, t + .25, 1.1, 'triangle', .06);
            break;
          case 'meow':    this.slide(700, 480, t, .25, 'triangle', .09); this.tone(940, t + .12, .16, 'sine', .05); break;
        }
      } catch (e) { /* never let audio break gameplay */ }
    }
  };
  KY.sound = Sound;

  /* ── fx layer ─────────────────────────────────────────── */
  const fx = document.getElementById('fx');

  /* fx may be offset from the viewport (desktop frame) — convert */
  function pt(x, y) {
    const r = fx.getBoundingClientRect();
    return { x: x - r.left, y: y - r.top };
  }

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  const PASTELS = ['#ff8fb8', '#ffb37e', '#ffe98a', '#a8ecd9', '#a8dcf0', '#c9a7f0', '#ff9ecb', '#fff'];
  const MAX_PARTICLES = 220;
  let live = 0;

  function makeEl(html, cls) {
    if (live > MAX_PARTICLES) return null;
    const el = document.createElement('div');
    el.className = cls || 'p-bit';
    el.innerHTML = html;
    fx.appendChild(el);
    live++;
    el.addEventListener('animationend', function () { el.remove(); live--; });
    // safety cleanup
    setTimeout(function () { if (el.isConnected) { el.remove(); live--; } }, 4000);
    return el;
  }

  /* confetti burst at viewport point */
  KY.confetti = function (x, y, n) {
    if (REDUCED) n = Math.min(n, 8);
    for (let i = 0; i < n; i++) {
      const el = makeEl('<i style="background:' + pick(PASTELS) + '"></i>', 'p-confetti');
      if (!el) return;
      const ang = rand(-Math.PI, 0);
      const dist = rand(60, Math.min(260, Math.max(90, fx.clientWidth * 0.45)));
      const dx = Math.cos(ang) * dist * rand(.4, 1);
      const dy = Math.sin(ang) * dist;
      const rot = rand(-720, 720);
      const dur = rand(700, 1500);
      const p = pt(x, y);
      el.style.left = p.x + 'px';
      el.style.top = p.y + 'px';
      el.animate([
        { transform: 'translate(-50%,-50%) rotate(0deg) scale(.4)', opacity: 1 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + rot + 'deg) scale(1)', opacity: 1, offset: .55 },
        { transform: 'translate(' + dx * 1.35 + 'px,' + (dy + rand(160, 300)) + 'px) rotate(' + rot * 1.4 + 'deg) scale(.7)', opacity: 0 }
      ], { duration: dur, easing: 'cubic-bezier(.18,.7,.4,1)', fill: 'forwards' });
    }
  };

  /* hearts float up */
  KY.hearts = function (x, y, n) {
    for (let i = 0; i < n; i++) {
      const el = makeEl(KY.heartSVG(pick(['#ff8fb8', '#ff6fa5', '#ffb7d5', '#f76d9b'])), 'p-heart');
      if (!el) return;
      const dx = rand(-70, 70);
      const p = pt(x, y);
      el.style.left = (p.x + rand(-14, 14)) + 'px';
      el.style.top = p.y + 'px';
      el.style.width = el.style.height = rand(18, 40) + 'px';
      el.animate([
        { transform: 'translate(-50%,-50%) scale(.2) rotate(' + rand(-20, 20) + 'deg)', opacity: 0 },
        { transform: 'translate(calc(-50% + ' + dx * .5 + 'px),' + -rand(70, 130) + 'px) scale(1.15) rotate(' + rand(-14, 14) + 'deg)', opacity: 1, offset: .4 },
        { transform: 'translate(calc(-50% + ' + dx + 'px),' + -rand(180, 320) + 'px) scale(.85) rotate(' + rand(-12, 12) + 'deg)', opacity: 0 }
      ], { duration: rand(1100, 1900), easing: 'ease-out', fill: 'forwards' });
    }
  };

  /* sparkle pop */
  KY.sparkles = function (x, y, n) {
    if (REDUCED) n = Math.min(n, 5);
    for (let i = 0; i < n; i++) {
      const el = makeEl('<span style="color:' + pick(['#ffe98a', '#fff', '#ffd94a', '#c9f0ff']) + '">✦</span>', 'p-spark');
      if (!el) return;
      const ang = rand(0, Math.PI * 2);
      const d = rand(24, 90);
      const p = pt(x, y);
      el.style.left = p.x + 'px';
      el.style.top = p.y + 'px';
      el.style.fontSize = rand(10, 26) + 'px';
      el.animate([
        { transform: 'translate(-50%,-50%) scale(0) rotate(0deg)', opacity: 1 },
        { transform: 'translate(calc(-50% + ' + Math.cos(ang) * d + 'px), calc(-50% + ' + Math.sin(ang) * d + 'px)) scale(1.3) rotate(160deg)', opacity: 0 }
      ], { duration: rand(500, 900), easing: 'cubic-bezier(.1,.7,.3,1)', fill: 'forwards' });
    }
  };

  /* little floating word / symbol */
  KY.floatText = function (x, y, txt, color) {
    const el = makeEl('<span style="color:' + (color || '#e7549c') + '">' + txt + '</span>', 'p-text');
    if (!el) return;
    const p = pt(x, y);
    el.style.left = p.x + 'px';
    el.style.top = p.y + 'px';
    el.animate([
      { transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 },
      { transform: 'translate(-50%,-160%) scale(1.15)', opacity: 1, offset: .35 },
      { transform: 'translate(-50%,-320%) scale(1)', opacity: 0 }
    ], { duration: 1200, easing: 'ease-out', fill: 'forwards' });
  };

  /* a friendship star flying from one element to another */
  KY.flyStar = function (fromEl, toEl, done) {
    if (!fromEl || !toEl) { if (done) done(); return; }
    const a = fromEl.getBoundingClientRect();
    const b = toEl.getBoundingClientRect();
    const fr = fx.getBoundingClientRect();
    const x0 = a.left + a.width / 2 - fr.left, y0 = a.top + a.height / 2 - fr.top;
    const x1 = b.left + b.width / 2 - fr.left, y1 = b.top + b.height / 2 - fr.top;
    const el = document.createElement('div');
    el.className = 'p-flystar';
    el.innerHTML = KY.starSVG();
    el.style.left = x0 + 'px';
    el.style.top = y0 + 'px';
    el.style.width = el.style.height = '44px';
    fx.appendChild(el);
    const anim = el.animate([
      { transform: 'translate(-50%,-50%) scale(.3) rotate(0deg)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(1.25) rotate(180deg)', opacity: 1, offset: .3 },
      { transform: 'translate(' + (x1 - x0) + 'px,' + (y1 - y0) + 'px) scale(.4) rotate(540deg)', opacity: 1, offset: .85 },
      { transform: 'translate(' + (x1 - x0) + 'px,' + (y1 - y0) + 'px) scale(.1) rotate(720deg)', opacity: 0 }
    ], { duration: 850, easing: 'cubic-bezier(.5,-0.2,.4,1)', fill: 'forwards' });
    anim.onfinish = function () { el.remove(); if (done) done(); };
    // sparkle trail along the way
    const trail = setInterval(function () {
      if (!el.isConnected) { clearInterval(trail); return; }
      const r = el.getBoundingClientRect();
      KY.sparkles(r.left + r.width / 2, r.top + r.height / 2, 1);
    }, 90);
    setTimeout(function () { clearInterval(trail); }, 1000);
  };

  /* center-of-element helper */
  KY.centerOf = function (el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  /* rainbow sweep transition (CSS-driven; returns duration) */
  KY.sweep = function () {
    const t = document.getElementById('transition');
    t.classList.remove('go');
    void t.offsetWidth;
    t.classList.add('go');
    setTimeout(function () { t.classList.remove('go'); }, 1000);
  };

  KY.reduced = REDUCED;
})();
