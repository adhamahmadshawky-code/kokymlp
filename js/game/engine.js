/* ═══════════════════════════════════════════════════════════
   game/engine.js — Rainbow Rush core
   rAF + delta-time loop · physics · spawning · collision · draw
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const KY = (window.KY = window.KY || {});
  const RR = (KY.RR = KY.RR || {});
  const P = RR.PHYS;
  const OBS = RR.OBS;
  const POW = RR.POWERUPS;

  const PONY_W = 42;
  const PONY_H = 62;
  const RUN_F = 11;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function Engine(canvas, cb) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.cb = cb || {};
    this.dpr = 1; this.w = 0; this.h = 0; this.S = 1; this.gy = 0;
    this.mode = 'idle';
    this.raf = 0;
    this.last = 0;
    this.bound = this._loop.bind(this);
    this.obs = []; this.picks = []; this.parts = []; this.floats = [];
    this.critters = [];
    this.pony = { x: 0, hy: 0, vy: 0, onG: true, buf: 0, anim: 0, tilt: 0, alpha: 1 };
    this.power = null; this.shield = false;
    this.save = RR.defaults();
    this.setCfg({ char: 'pinkie', world: 'ponyville', trail: 'none', acc: 'none', outfit: 'none' });
    this.reset();
    this.skyGrad = null; this.lastHud = 0;
  }

  Engine.prototype.reset = function () {
    this.mode = 'idle';
    this.obs.length = 0; this.picks.length = 0; this.parts.length = 0;
    this.floats.length = 0; this.critters.length = 0;
    this.pony.hy = 0; this.pony.vy = 0; this.pony.onG = true; this.pony.buf = 0;
    this.pony.anim = 0; this.pony.tilt = 0; this.pony.alpha = 1;
    this.power = null; this.shield = false;
    this.scroll = 0; this.score = 0; this.stars = 0;
    this.speed = P.SPEED0; this.time = 0;
    this.diff = 0; this.spawnOb = 420; this.spawnPick = 600; this.spawnPow = rand(900, 1500);
    this.obsCount = 0; this.lastObs = '';
    this.msIdx = 0; this.dieT = 0; this.dieKind = '';
    this.trailT = 0; this.trailI = 0; this.hudT = 0;
  };

  Engine.prototype.resize = function () {
    const r = this.cv.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cv.width = Math.round(w * this.dpr);
    this.cv.height = Math.round(h * this.dpr);
    this.w = w; this.h = h;
    this.S = clamp(h / 760, 0.78, 1.12);
    this.gy = h - clamp(h * 0.17, 96, 150);
    this.pony.x = Math.max(64, w * 0.22);
    this.skyGrad = null;
  };

  Engine.prototype.setCfg = function (cfg) {
    const ch = RR.CHAR_MAP[cfg.char] || RR.CHARS[0];
    let outfit = null;
    if (cfg.outfit && cfg.outfit !== 'none') {
      outfit = RR.ITEM_MAP[cfg.outfit] || RR.ITEM_MAP['outfit:' + cfg.outfit] || null;
    }
    this.cfg = {
      char: ch,
      world: RR.WORLD_MAP[cfg.world] || RR.WORLDS[0],
      trail: cfg.trail || 'none',
      acc: cfg.acc || 'none',
      paint: Object.assign({}, ch.paint, outfit && outfit.colors ? outfit.colors : {}),
      extras: ch.extras || {},
      perks: {
        cake: ch.id === 'pinkie',
        kindness: ch.id === 'fluttershy',
        boost: ch.id === 'rainbow',
        score: ch.id === 'twilight' ? 1.15 : 1,
        stars: ch.id === 'rarity' ? 2 : 1,
        shield: ch.id === 'applejack'
      }
    };
    this.skyGrad = null;
    return this.cfg;
  };

  Engine.prototype.start = function (save, cfg) {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.save = save;
    this.setCfg(cfg);
    this.reset();
    this.shield = !!this.cfg.perks.shield;
    if (this.shield) this.power = { id: 'shield', t: 0 };
    this.mode = 'run';
    this.last = 0;
    if (!this.raf) this.raf = requestAnimationFrame(this.bound);
    this._hud(true);
  };

  Engine.prototype.stop = function () {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.mode = 'idle';
  };

  Engine.prototype.pause = function () {
    if (this.mode !== 'run') return false;
    this.mode = 'paused';
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this._render();
    return true;
  };

  Engine.prototype.resume = function () {
    if (this.mode !== 'paused') return false;
    this.mode = 'run';
    this.last = 0;
    this.raf = requestAnimationFrame(this.bound);
    return true;
  };

  Engine.prototype.jump = function () {
    if (this.mode !== 'run') return false;
    const pn = this.pony;
    if (pn.onG) {
      pn.vy = P.JUMP;
      pn.onG = false;
      pn.buf = 0;
      this.puff(pn.x, this.gy, 5, '#ffffff');
      if (this.cb.onSfx) this.cb.onSfx('jump');
      return true;
    }
    pn.buf = P.BUFFER;
    return false;
  };

  /* ── loop ─────────────────────────────────────────────── */

  Engine.prototype._loop = function (ts) {
    this.raf = requestAnimationFrame(this.bound);
    if (this.mode !== 'run' && this.mode !== 'dying') return;
    const dt = this.last ? Math.min(0.05, (ts - this.last) / 1000) : 0.016;
    this.last = ts;
    this._step(dt);
    this._render();
  };

  Engine.prototype._step = function (dt) {
    const S = this.S;
    if (this.mode === 'dying') {
      this.dieT += dt;
      const pn = this.pony;
      pn.vy -= P.GRAV * 0.75 * dt;
      pn.hy += pn.vy * dt;
      if (this.dieKind !== 'fall' && pn.hy < 0) { pn.hy = 0; pn.vy = 0; }
      pn.tilt += dt * (this.dieKind === 'fall' ? 4 : 9);
      this.speed *= Math.max(0, 1 - dt * 4);
      this._moveAll(dt, false);
      this._parts(dt);
      if (this.dieT > 1.0) this._over();
      return;
    }

    this.time += dt;
    this.diff = clamp(this.score / 2600, 0, 1);
    let target = Math.min(P.SPEED_MAX, P.SPEED0 + this.score * P.SPEED_PER_PT);
    if (this.power && this.power.id === 'boost') target *= P.BOOST_MULT;
    this.speed += (target - this.speed) * Math.min(1, dt * 3.2);
    const sp = this.speed;
    this.scroll += sp * dt;
    this.addScore(sp * dt * 0.1, true);

    /* pony physics */
    const pn = this.pony;
    pn.anim += dt * (pn.onG ? RUN_F : 4) * (this.power && this.power.id === 'boost' ? 1.5 : 1);
    if (pn.buf > 0) { pn.buf -= dt; if (pn.buf <= 0) pn.buf = 0; }
    if (!pn.onG || pn.hy > 0) {
      pn.vy -= P.GRAV * dt;
      pn.hy += pn.vy * dt;
      if (pn.hy <= 0) {
        pn.hy = 0;
        if (!pn.onG) {
          pn.onG = true;
          pn.vy = 0;
          this.puff(pn.x, this.gy, 6, '#ffffff');
          if (pn.buf > 0) { pn.buf = 0; this.jump(); }
        }
      }
    }

    /* power timers */
    if (this.power) {
      if (this.power.id === 'shield') {
        /* shield waits for a hit */
      } else {
        this.power.t -= dt;
        if (this.power.id === 'kindness') this._critters(dt);
        if (this.power.t <= 0) {
          const id = this.power.id;
          this.power = null;
          this.critters.length = 0;
          if (this.cb.onPower) this.cb.onPower(id, false);
        }
      }
    }

    /* trail particles */
    if (this.cfg.trail !== 'none' && this.mode === 'run') {
      this.trailT -= dt;
      if (this.trailT <= 0) {
        this.trailT = 0.05;
        this.spawnTrail();
      }
    }

    this._spawn(sp * dt, dt);
    this._moveAll(dt, true);
    this._collide();
    this._parts(dt);

    while (this.msIdx < P.MILESTONES.length && this.score >= P.MILESTONES[this.msIdx].need) {
      const m = P.MILESTONES[this.msIdx];
      this.msIdx++;
      if (this.cb.onMilestone) this.cb.onMilestone(m.id, m.need);
    }

    this.hudT -= dt;
    if (this.hudT <= 0) { this.hudT = 0.1; this._hud(false); }
  };

  Engine.prototype.addScore = function (n, silent) {
    this.score += n * this.cfg.perks.score;
    if (!silent && this.cb.onScore) this.cb.onScore();
  };

  /* ── spawning ─────────────────────────────────────────── */

  Engine.prototype._spawn = function (d, dt) {
    if (this.noSpawn) return;
    const S = this.S;
    this.spawnOb -= d;
    if (this.spawnOb <= 0) {
      this._spawnObstacle();
      const gapT = rand(P.OB_GAP[0], P.OB_GAP[1]) * (1 - 0.3 * this.diff);
      this.spawnOb = Math.max(this.speed * (P.OB_GAP[0] - 0.08), this.speed * gapT + 70);
    }
    this.spawnPick -= d;
    if (this.spawnPick <= 0) {
      this._spawnPickup();
      this.spawnPick = this.speed * rand(P.PICK_T[0], P.PICK_T[1]);
    }
    this.spawnPow -= d;
    if (this.spawnPow <= 0) {
      this.spawnPow = this.speed * rand(P.POW_T[0], P.POW_T[1]);
      if (!this.power || this.power.id !== 'boost') this._spawnPower();
    }
  };

  Engine.prototype._spawnObstacle = function () {
    const S = this.S;
    const w = this.cfg.world;
    let list = w.obs.filter(function (t) {
      const o = OBS[t];
      if (o.kind === 'float' && this.score < 80) return false;
      if (t === 'gap' && this.obsCount < 3) return false;
      return true;
    }, this);
    let type = pick(list);
    if (type === this.lastObs && Math.random() < 0.6) type = pick(list);
    this.lastObs = type;
    this.obsCount++;

    const def = OBS[type];
    const o = { type: type, kind: def.kind, x: this.w + 40, passed: false, w: def.w, h: def.h };
    if (type === 'gap') o.w = Math.max(70, this.speed * P.GAP_FRAC * 0.73) * this.S;
    this.obs.push(o);

    if (def.kind === 'ground' && Math.random() < 0.6) {
      const n = 3 + (Math.random() * 2 | 0);
      const peak = rand(95, 150) * S;
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const y = this.gy - (45 * S + Math.sin(t * Math.PI) * peak);
        this.picks.push({ type: 'star', x: o.x + 10 * S + t * (o.w * S), hy: (this.gy - y) / S, got: false, wob: rand(0, 6) });
      }
    } else if (type === 'gap') {
      const n = 3;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        this.picks.push({ type: 'star', x: o.x + t * o.w, hy: 70 + Math.sin(t * Math.PI) * 70, got: false, wob: rand(0, 6) });
      }
    }
  };

  Engine.prototype._spawnPickup = function () {
    const S = this.S;
    if (this.spawnOb < this.speed * 0.9) { this.spawnOb = this.speed * 0.9; }
    const r = Math.random();
    if (r < 0.45) {
      const n = 3 + (Math.random() * 3 | 0);
      const base = rand(45, 95) * S;
      const arc = Math.random() < 0.55;
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const hy = arc ? base + Math.sin(t * Math.PI) * 85 * S : base;
        this.picks.push({ type: 'star', x: this.w + 40 + i * 46 * S, hy: hy / S, got: false, wob: rand(0, 6) });
      }
    } else if (r < 0.8) {
      this.picks.push({ type: 'cake', x: this.w + 40, hy: rand(30, 55), got: false, wob: rand(0, 6) });
    } else {
      this.picks.push({ type: 'star', x: this.w + 40, hy: rand(40, 70), got: false, wob: rand(0, 6) });
      this.picks.push({ type: 'cake', x: this.w + 40 + 70 * S, hy: rand(40, 120), got: false, wob: rand(0, 6) });
    }
  };

  Engine.prototype._spawnPower = function () {
    const free = RR.POWER_IDS.filter(function (id) {
      return !(this.power && this.power.id === id);
    }, this);
    if (!free.length) return;
    this.spawnOb = Math.max(this.spawnOb, this.speed * 1.1);
    this.picks.push({
      type: 'pow', pow: pick(free),
      x: this.w + 40, hy: Math.random() < 0.5 ? rand(40, 70) : rand(95, 150), got: false, wob: rand(0, 6)
    });
  };

  /* ── movement / collision ─────────────────────────────── */

  Engine.prototype._moveAll = function (dt, interact) {
    const sp = this.speed, S = this.S;
    const pn = this.pony;
    const px = pn.x, hy = pn.hy;

    for (let i = this.obs.length - 1; i >= 0; i--) {
      const o = this.obs[i];
      o.x -= sp * dt;
      if (o.x + o.w * S < -60) { this.obs.splice(i, 1); continue; }
      if (!interact) continue;
      if (!o.passed && o.kind !== 'gap' && o.x + o.w * S < px - 12) {
        o.passed = true;
        this.addScore(P.PASS_PT * (this.cfg.char.id === 'rainbow' ? 1.05 : 1));
        this.floats.push({ x: px + 26, y: this.gy - 90 * S, txt: '+' + Math.round(P.PASS_PT), life: 0.8, color: '#ffd94a' });
        if (this.cb.onSfx) this.cb.onSfx('ui');
      }
    }

    const partyOn = this.power && this.power.id === 'party';
    for (let i = this.picks.length - 1; i >= 0; i--) {
      const k = this.picks[i];
      k.x -= sp * dt;
      k.wob += dt * 4;
      if (interact && partyOn) {
        const tx = px, ty = this.gy - 45 * S;
        const ddx = tx - k.x, ddy = ty - (this.gy - k.hy * S);
        const dist = Math.hypot(ddx, ddy);
        if (dist < 165 * S) {
          k.x += ddx / dist * 430 * dt;
          k.hy += -ddy / dist * 430 / S * dt;
        }
      }
      if (k.x < -80) { this.picks.splice(i, 1); continue; }
      if (!interact) continue;
      const box = { x: px - PONY_W * S / 2 + 4, y: this.gy - hy - PONY_H * S + 6, w: PONY_W * S - 8, h: PONY_H * S - 10 };
      const kx = k.x, ky = this.gy - k.hy * S;
      if (kx > box.x - 20 && kx < box.x + box.w + 20 && ky > box.y - 20 && ky < box.y + box.h + 20) {
        this.collect(k, i);
      }
    }
  };

  Engine.prototype.collect = function (k, i) {
    this.picks.splice(i, 1);
    const S = this.S;
    const sx = k.x, sy = this.gy - k.hy * S;
    if (k.type === 'pow') {
      this.activatePower(k.pow);
      this.sparkle(sx, sy, 14, '#ffffff');
      if (this.cb.onSfx) this.cb.onSfx('power');
      return;
    }
    if (k.type === 'star') {
      const n = this.cfg.perks.stars;
      this.stars += n;
      this.addScore(P.STAR_PT);
      this.sparkle(sx, sy, 6, '#ffd94a');
      this.floats.push({ x: sx, y: sy, txt: n > 1 ? '★×2' : '+★', life: 0.7, color: '#ffd94a' });
      if (this.cb.onSfx) this.cb.onSfx('coin');
    } else {
      const cake = P.CAKE_PT * (this.cfg.perks.cake ? 1.5 : 1);
      this.addScore(cake);
      this.sparkle(sx, sy, 6, '#ff8fb8');
      this.floats.push({ x: sx, y: sy, txt: '+' + Math.round(cake), life: 0.7, color: '#ff8fb8' });
      if (this.cb.onSfx) this.cb.onSfx('coin');
    }
    if (this.cb.onPickup) this.cb.onPickup(k.type, this.stars, Math.round(this.score));
  };

  Engine.prototype.activatePower = function (id) {
    const def = POW[id];
    if (!def) return;
    if (id === 'shield') {
      if (this.shield) { this.addScore(30); this.floats.push({ x: this.pony.x, y: this.gy - 110 * this.S, txt: '+30', life: 0.7, color: '#a8ecd9' }); return; }
      this.shield = true;
      this.power = { id: 'shield', t: 0 };
    } else {
      let dur = def.dur;
      if (id === 'kindness' && this.cfg.perks.kindness) dur *= 1.5;
      if (id === 'boost' && this.cfg.perks.boost) dur *= 1.4;
      this.power = { id: id, t: dur, dur: dur };
      if (id === 'kindness') {
        this.critters.length = 0;
        for (let i = 0; i < 3; i++) this.critters.push({ x: this.pony.x + 60 + i * 34, hy: 60 + i * 30, tx: 0, ty: 0, re: 0, kind: i % 2 });
      }
      if (id === 'boost') this.sparkle(this.pony.x, this.gy - 60 * this.S, 16, '#6fc3f2');
    }
    if (this.cb.onPower) this.cb.onPower(id, true);
    this._hud(true);
  };

  Engine.prototype._critters = function (dt) {
    const S = this.S;
    for (let i = 0; i < this.critters.length; i++) {
      const c = this.critters[i];
      c.re -= dt;
      if (c.re <= 0 || !c.tgt) {
        c.re = 0.3;
        c.tgt = null;
        let bd = 240 * S;
        for (let j = 0; j < this.picks.length; j++) {
          const k = this.picks[j];
          if (k.x < this.pony.x - 20) continue;
          const d = Math.hypot(k.x - c.x, (this.gy - k.hy * S) - (this.gy - c.hy * S));
          if (d < bd) { bd = d; c.tgt = k; }
        }
      }
      const home = !c.tgt || c.tgt.got;
      const tx = home ? this.pony.x + 70 + i * 30 : c.tgt.x;
      const ty = home ? this.gy - (70 + i * 34) * S : this.gy - c.tgt.hy * S;
      const dx = tx - c.x, dy = ty - c.hy;
      const dist = Math.hypot(dx, dy) || 1;
      const step = 560 * dt;
      if (dist <= step + 6) {
        if (!home && !c.tgt.got) {
          const idx = this.picks.indexOf(c.tgt);
          if (idx >= 0) { this.collect(c.tgt, idx); c.tgt = null; }
        }
      } else {
        c.x += dx / dist * step;
        c.hy += dy / dist * step;
      }
      c.x -= 0;
    }
  };

  Engine.prototype._collide = function () {
    const S = this.S;
    const pn = this.pony;
    const bl = pn.x - PONY_W * S / 2 + 6;
    const br = pn.x + PONY_W * S / 2 - 6;
    const bBot = pn.hy + 4;
    const bTop = pn.hy + PONY_H * S - 6;

    for (let i = 0; i < this.obs.length; i++) {
      const o = this.obs[i];
      if (o.x > br || o.x + o.w * S < bl) continue;

      if (o.kind === 'gap') {
        const gl = o.x + 8, gr = o.x + o.w * S - 8;
        if (pn.hy <= 1 && pn.x > gl && pn.x < gr) {
          this._die('fall');
          return;
        }
        continue;
      }

      let ohTop, ohBot;
      if (o.kind === 'float') {
        ohBot = RR.FLOAT_BOT * S;
        ohTop = RR.FLOAT_TOP * S;
      } else {
        ohBot = 0;
        ohTop = o.h * S;
      }
      const ol = o.x + 5, or = o.x + o.w * S - 5;
      if (br < ol || bl > or) continue;
      if (bTop > ohBot + 4 && bBot < ohTop - 4) {
        /* contact! */
        if ((this.power && this.power.id === 'boost') || this.shield) {
          if (this.shield && !(this.power && this.power.id === 'boost')) {
            this.shield = false;
            if (this.power && this.power.id === 'shield') this.power = null;
            if (this.cb.onPower) this.cb.onPower('shield', false);
          }
          this.sparkle(o.x + o.w * S / 2, this.gy - (o.kind === 'float' ? 140 * S : o.h * S / 2), 16, '#ffffff');
          this.floats.push({ x: o.x + o.w * S / 2, y: this.gy - 110 * S, txt: 'boom!', life: 0.7, color: '#ff8fb8' });
          this.obs.splice(i, 1);
          if (this.cb.onSfx) this.cb.onSfx('shield');
          this._hud(true);
        } else {
          this._die('hit');
          return;
        }
      }
    }
  };

  Engine.prototype._die = function (kind) {
    if (this.mode !== 'run') return;
    this.mode = 'dying';
    this.dieT = 0;
    this.dieKind = kind;
    const pn = this.pony;
    pn.vy = kind === 'fall' ? -80 : 330;
    pn.onG = false;
    if (kind === 'hit') this.sparkle(pn.x, this.gy - 40 * this.S, 18, '#ff8fb8');
    if (this.cb.onSfx) this.cb.onSfx('crash');
    if (this.cb.onDie) this.cb.onDie(kind);
    this._hud(true);
  };

  Engine.prototype._over = function () {
    this.mode = 'over';
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this._render();
    if (this.cb.onOver) {
      this.cb.onOver({
        score: Math.round(this.score),
        stars: this.stars,
        world: this.cfg.world.id
      });
    }
  };

  /* ── particles ────────────────────────────────────────── */

  Engine.prototype.mkPart = function (x, y, vx, vy, life, kind, color, size) {
    if (this.parts.length > 90) this.parts.shift();
    this.parts.push({ x: x, y: y, vx: vx, vy: vy, life: life, max: life, kind: kind, color: color, size: size, rot: rand(0, 6.3), vr: rand(-6, 6) });
  };

  Engine.prototype.puff = function (x, y, n, color) {
    for (let i = 0; i < n; i++) {
      this.mkPart(x + rand(-14, 14), y - rand(0, 6), rand(-40, 40), rand(-70, -20), rand(0.3, 0.55), 'dot', color, rand(3, 6));
    }
  };

  Engine.prototype.sparkle = function (x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      this.mkPart(x, y, Math.cos(a) * rand(40, 160), Math.sin(a) * rand(40, 160) - 40, rand(0.4, 0.8), 'star', color, rand(4, 8));
    }
  };

  Engine.prototype.spawnTrail = function () {
    const S = this.S;
    const pn = this.pony;
    const x = pn.x - 18 * S, y = this.gy - pn.hy - 26 * S;
    const t = this.cfg.trail;
    this.trailI++;
    if (t === 'rainbow') {
      const cols = ['#ff5d5d', '#ffa54d', '#ffe14d', '#5ec96e', '#4f9de0', '#a06cd5'];
      this.mkPart(x + rand(-8, 4), y + rand(-10, 10), -this.speed * 0.25, rand(-20, 20), 0.5, 'rect', cols[this.trailI % 6], rand(6, 9));
    } else if (t === 'sparkle') {
      this.mkPart(x + rand(-10, 4), y + rand(-14, 14), -this.speed * 0.2, rand(-30, -5), 0.55, 'star', this.trailI % 2 ? '#ffffff' : '#ffd94a', rand(5, 9));
    } else if (t === 'hearts') {
      this.mkPart(x + rand(-10, 4), y + rand(-12, 12), -this.speed * 0.18, rand(-34, -10), 0.6, 'heart', '#ff8fb8', rand(7, 11));
    }
  };

  Engine.prototype._parts = function (dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) { this.parts.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 380 * dt;
      p.rot += p.vr * dt;
    }
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.life -= dt;
      f.y -= 42 * dt;
      if (f.life <= 0) this.floats.splice(i, 1);
    }
  };

  /* ── HUD ──────────────────────────────────────────────── */

  Engine.prototype._hud = function (force) {
    if (!this.cb.onHud) return;
    let power = null;
    if (this.power) {
      if (this.power.id === 'shield') power = { id: 'shield', frac: 1 };
      else power = { id: this.power.id, frac: clamp(this.power.t / this.power.dur, 0, 1) };
    }
    const ms = this.nextMilestone();
    this.cb.onHud({
      score: Math.round(this.score),
      stars: this.stars,
      shield: this.shield,
      power: power,
      ms: ms,
      mode: this.mode
    }, force);
  };

  Engine.prototype.nextMilestone = function () {
    for (let i = 0; i < P.MILESTONES.length; i++) {
      const m = P.MILESTONES[i];
      if (this.save.worlds.indexOf(m.id) < 0) {
        return { name: RR.WORLD_MAP[m.id].name, need: m.need, frac: clamp(this.score / m.need, 0, 1) };
      }
    }
    return { name: null, need: 0, frac: 1 };
  };

  /* ── render ───────────────────────────────────────────── */

  Engine.prototype._render = function () {
    const ctx = this.ctx, w = this.w, h = this.h, S = this.S;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const wld = this.cfg.world;

    if (!this.skyGrad) {
      const g = ctx.createLinearGradient(0, 0, 0, this.gy);
      g.addColorStop(0, wld.sky[0]);
      g.addColorStop(1, wld.sky[1]);
      this.skyGrad = g;
    }
    ctx.fillStyle = this.skyGrad;
    ctx.fillRect(0, 0, w, this.gy);

    this._drawSkyBits(ctx);
    this._drawFar(ctx);
    this._drawMid(ctx);
    this._drawGround(ctx);
    this._drawObs(ctx);
    this._drawPicks(ctx);
    if (this.power && this.power.id === 'party') this._drawMagnet(ctx);
    this._drawCritters(ctx);
    if (this.mode !== 'over') this._drawPony(ctx);
    this._drawParts(ctx);
    this._drawFloats(ctx);
    if (this.power && this.power.id === 'boost') this._drawBoost(ctx);
  };

  Engine.prototype._drawSkyBits = function (ctx) {
    const w = this.w, wld = this.cfg.world;
    const off = this.scroll * 0.06;
    if (wld.id === 'everfree') {
      ctx.fillStyle = '#fff8d8';
      for (let i = 0; i < 26; i++) {
        const x = ((i * 173.3 - off) % (w + 40) + w + 40) % (w + 40) - 20;
        const y = 24 + (i * 97.7) % (this.gy * 0.5);
        const tw = 0.5 + 0.5 * Math.sin(this.time * 2 + i);
        ctx.globalAlpha = 0.35 + tw * 0.5;
        ctx.fillRect(x, y, 2.5, 2.5);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff3c9';
      ctx.beginPath(); ctx.arc(w - 64, 74, 30, 0, 6.3); ctx.fill();
      ctx.fillStyle = wld.sky[0];
      ctx.beginPath(); ctx.arc(w - 76, 66, 26, 0, 6.3); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      const sunX = w - 66, sunY = 72;
      ctx.beginPath(); ctx.arc(sunX, sunY, 26, 0, 6.3); ctx.fill();
      ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.arc(sunX, sunY, 38, 0, 6.3); ctx.fill();
      ctx.globalAlpha = 1;
      for (let i = 0; i < 5; i++) {
        const cw = 70 + (i % 3) * 26;
        const x = ((i * 233 - this.scroll * 0.1) % (w + cw * 2) + w + cw * 2) % (w + cw * 2) - cw;
        const y = 40 + (i * 61) % (this.gy * 0.32);
        ctx.fillRect(x, y, cw, 14);
        ctx.beginPath(); ctx.arc(x + cw * 0.32, y, 11, 0, 6.3); ctx.arc(x + cw * 0.6, y - 6, 15, 0, 6.3); ctx.arc(x + cw * 0.85, y, 11, 0, 6.3); ctx.fill();
      }
    }
  };

  Engine.prototype._drawFar = function (ctx) {
    const w = this.w, wld = this.cfg.world;
    const off = this.scroll * 0.25;
    if (wld.id === 'cloudsdale') {
      ctx.fillStyle = 'rgba(255,255,255,.65)';
      for (let i = 0; i < 6; i++) {
        const cw = 130 + (i % 3) * 40;
        const x = ((i * 311 - off) % (w + cw * 2) + w + cw * 2) % (w + cw * 2) - cw;
        const y = this.gy - 130 - (i * 77) % 160;
        ctx.fillRect(x, y, cw, 24);
        ctx.beginPath(); ctx.arc(x + cw * 0.3, y, 20, 0, 6.3); ctx.arc(x + cw * 0.58, y - 12, 27, 0, 6.3); ctx.arc(x + cw * 0.84, y, 19, 0, 6.3); ctx.fill();
      }
      return;
    }
    if (wld.id === 'everfree') {
      ctx.fillStyle = wld.hill1;
      ctx.beginPath();
      ctx.moveTo(0, this.gy);
      for (let x = 0; x <= w; x += 16) {
        const wx = x + off;
        const y = this.gy - 90 - Math.abs(Math.sin(wx * 0.006)) * 120 - Math.sin(wx * 0.017) * 30;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, this.gy);
      ctx.closePath(); ctx.fill();
      return;
    }
    ctx.fillStyle = wld.hill1;
    ctx.beginPath();
    ctx.moveTo(0, this.gy);
    for (let x = 0; x <= w; x += 14) {
      const wx = x + off;
      const y = this.gy - 46 - Math.sin(wx * 0.008) * 34 - Math.sin(wx * 0.021 + 2) * 16;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, this.gy);
    ctx.closePath(); ctx.fill();
  };

  Engine.prototype._drawMid = function (ctx) {
    const w = this.w, wld = this.cfg.world;
    const off = this.scroll * 0.5;
    const TW = 340;
    const n = Math.ceil(w / TW) + 2;
    const start = Math.floor(off / TW);
    for (let i = start; i < start + n; i++) {
      const x = i * TW - off;
      const seed = ((i * 4711) % 1000) / 1000;
      if (wld.id === 'ponyville') {
        const hx = x + 40 + seed * 90;
        const hw = 62, hh = 54 + seed * 26;
        ctx.fillStyle = '#fdfbf4';
        ctx.fillRect(hx, this.gy - hh, hw, hh);
        ctx.fillStyle = '#f7a8c9';
        ctx.beginPath();
        ctx.moveTo(hx - 7, this.gy - hh); ctx.lineTo(hx + hw / 2, this.gy - hh - 30);
        ctx.lineTo(hx + hw + 7, this.gy - hh); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffe08a';
        ctx.fillRect(hx + 12, this.gy - hh + 14, 14, 14);
        ctx.fillRect(hx + 38, this.gy - hh + 14, 14, 14);
        this._tree(ctx, x + 230, this.gy, 34 + seed * 18, '#5fae72', '#7ec98d');
      } else if (wld.id === 'acres') {
        this._appleTree(ctx, x + 60 + seed * 60, this.gy, 40 + seed * 20);
        this._tree(ctx, x + 250, this.gy, 30 + seed * 16, '#7aa64a', '#93bd5c');
        ctx.fillStyle = '#c0503a';
        for (let k = 0; k < 3; k++) {
          const px = x + 200 + k * 26 + seed * 20;
          ctx.beginPath(); ctx.arc(px, this.gy - 6, 5, 0, 6.3); ctx.fill();
        }
      } else if (wld.id === 'cloudsdale') {
        const py = this.gy - 60 - seed * 130;
        const pw = 90 + seed * 50;
        ctx.fillStyle = 'rgba(255,255,255,.92)';
        ctx.fillRect(x + 60, py, pw, 18);
        ctx.beginPath();
        ctx.arc(x + 60 + pw * 0.25, py, 15, 0, 6.3);
        ctx.arc(x + 60 + pw * 0.55, py - 9, 21, 0, 6.3);
        ctx.arc(x + 60 + pw * 0.85, py, 15, 0, 6.3);
        ctx.fill();
        if (seed > 0.55) {
          ctx.strokeStyle = 'rgba(255,255,255,.75)';
          ctx.lineWidth = 6;
          ctx.beginPath(); ctx.arc(x + 290, this.gy + 40, 66, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
        }
      } else {
        ctx.fillStyle = '#22333c';
        const tw = 26 + seed * 14;
        ctx.fillRect(x + 70, this.gy - 190, tw, 190);
        ctx.fillStyle = '#274149';
        ctx.beginPath();
        ctx.ellipse(x + 70 + tw / 2, this.gy - 205, 78 + seed * 30, 46, 0, 0, 6.3);
        ctx.fill();
        ctx.fillStyle = '#35684e';
        ctx.fillRect(x + 240, this.gy - 120, 18, 120);
        ctx.beginPath(); ctx.ellipse(x + 249, this.gy - 134, 46, 30, 0, 0, 6.3); ctx.fill();
        const mgx = x + 180 + seed * 40;
        ctx.fillStyle = 'rgba(125,255,196,.28)';
        ctx.beginPath(); ctx.arc(mgx, this.gy - 14, 20, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#7dffc4';
        ctx.fillRect(mgx - 7, this.gy - 18, 14, 14);
        ctx.fillStyle = '#35684e';
        ctx.beginPath(); ctx.arc(mgx, this.gy - 20, 14, Math.PI, 0); ctx.fill();
      }
    }
  };

  Engine.prototype._tree = function (ctx, x, base, r, dark, light) {
    ctx.fillStyle = '#8d6a55';
    ctx.fillRect(x - 5, base - r, 10, r);
    ctx.fillStyle = light;
    ctx.beginPath(); ctx.arc(x, base - r - r * 0.5, r * 0.85, 0, 6.3); ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.arc(x - r * 0.4, base - r - r * 0.28, r * 0.55, 0, 6.3); ctx.arc(x + r * 0.42, base - r - r * 0.3, r * 0.5, 0, 6.3); ctx.fill();
  };

  Engine.prototype._appleTree = function (ctx, x, base, r) {
    ctx.fillStyle = '#7a5a40';
    ctx.fillRect(x - 6, base - r * 1.2, 12, r * 1.2);
    ctx.fillStyle = '#69a84c';
    ctx.beginPath(); ctx.arc(x, base - r * 1.6, r, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#e2543f';
    for (let i = 0; i < 5; i++) {
      const a = i * 2.4;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r * 0.55, base - r * 1.6 + Math.sin(a) * r * 0.5, 4.5, 0, 6.3);
      ctx.fill();
    }
  };

  Engine.prototype._drawGround = function (ctx) {
    const w = this.w, h = this.h, wld = this.cfg.world;
    const gy = this.gy;
    ctx.fillStyle = wld.dirt;
    ctx.fillRect(0, gy, w, h - gy);
    ctx.fillStyle = wld.dirtD;
    for (let x = -((this.scroll * 0.9) % 56); x < w; x += 56) {
      ctx.fillRect(x, gy + 26, 26, 8);
      ctx.fillRect(x + 30, gy + 52, 18, 7);
    }
    ctx.fillStyle = wld.grass;
    ctx.fillRect(0, gy, w, 13);
    ctx.fillStyle = wld.grassD;
    ctx.fillRect(0, gy + 9, w, 5);

    /* pits */
    for (let i = 0; i < this.obs.length; i++) {
      const o = this.obs[i];
      if (o.kind !== 'gap') continue;
      const x = o.x, gw = o.w * this.S;
      if (x > w || x + gw < 0) continue;
      const g2 = ctx.createLinearGradient(0, gy, 0, h);
      g2.addColorStop(0, '#1c1420');
      g2.addColorStop(1, '#3a2c34');
      ctx.fillStyle = g2;
      ctx.fillRect(x, gy, gw, h - gy);
      ctx.fillStyle = wld.grassD;
      ctx.fillRect(x - 3, gy, 5, 13);
      ctx.fillRect(x + gw - 2, gy, 5, 13);
    }

    /* near details */
    const off = this.scroll * 0.9;
    ctx.fillStyle = wld.grassD;
    for (let x = -((off) % 88); x < w; x += 88) {
      ctx.fillRect(x + 14, gy - 5, 3, 6);
      ctx.fillRect(x + 20, gy - 3, 3, 4);
      ctx.fillRect(x + 60, gy - 4, 3, 5);
    }
    if (wld.id === 'ponyville' || wld.id === 'acres') {
      const fo = this.scroll * 0.9;
      for (let x = -((fo) % 147); x < w; x += 147) {
        const fx = x + 100;
        ctx.fillStyle = wld.id === 'acres' ? '#ff9c6e' : '#ffd94a';
        ctx.beginPath(); ctx.arc(fx, gy - 4, 3.4, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(fx + 6, gy - 6, 3.4, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#ff8fb8';
        ctx.beginPath(); ctx.arc(fx - 7, gy - 5, 3, 0, 6.3); ctx.fill();
      }
    }
    if (wld.id === 'everfree') {
      const fo = this.scroll * 0.9;
      for (let x = -((fo) % 120); x < w; x += 120) {
        ctx.fillStyle = 'rgba(125,255,196,.55)';
        ctx.beginPath(); ctx.arc(x + 55, gy - 8, 4, 0, 6.3); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 95, gy - 5, 3, 0, 6.3); ctx.fill();
      }
      for (let i = 0; i < 6; i++) {
        const fx = ((i * 211 - this.scroll * 0.75) % (w + 60) + w + 60) % (w + 60) - 30;
        const fy = this.gy - 30 - (i * 53) % 90 + Math.sin(this.time * 1.6 + i * 2) * 9;
        ctx.fillStyle = 'rgba(125,255,196,.8)';
        ctx.beginPath(); ctx.arc(fx, fy, 2.4, 0, 6.3); ctx.fill();
      }
    }
  };

  Engine.prototype._drawObs = function (ctx) {
    const S = this.S, gy = this.gy, wld = this.cfg.world;
    for (let i = 0; i < this.obs.length; i++) {
      const o = this.obs[i];
      const x = o.x, w = o.w * S;
      if (x > this.w + 60 || x + w < -40) continue;

      if (o.kind === 'gap') continue;

      if (o.kind === 'float') {
        const topY = gy - RR.FLOAT_TOP * S;
        const hgt = (RR.FLOAT_TOP - RR.FLOAT_BOT) * S;
        ctx.save();
        if (o.type === 'kite') {
          ctx.fillStyle = '#ff8fb8';
          ctx.beginPath();
          ctx.moveTo(x + w / 2, topY);
          ctx.lineTo(x + w, topY + 46 * S);
          ctx.lineTo(x + w / 2, topY + 88 * S);
          ctx.lineTo(x, topY + 46 * S);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#ffd94a';
          ctx.beginPath();
          ctx.moveTo(x + w / 2, topY);
          ctx.lineTo(x + w, topY + 46 * S);
          ctx.lineTo(x + w / 2, topY + 46 * S);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#c2418f';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + w / 2, topY + 88 * S);
          for (let k = 1; k <= 4; k++) {
            ctx.lineTo(x + w / 2 + Math.sin(k * 2.2) * 9, topY + 88 * S + k * (hgt - 88 * S) / 4);
          }
          ctx.stroke();
        } else if (o.type === 'bird') {
          ctx.strokeStyle = 'rgba(255,255,255,.9)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x + w * 0.2, topY + 14 * S);
          ctx.quadraticCurveTo(x + w * 0.5, topY + 4 * S, x + w * 0.8, topY + 16 * S);
          ctx.stroke();
          ctx.fillStyle = '#a8dcf0';
          ctx.beginPath(); ctx.arc(x + w / 2, topY + 34 * S, 20 * S, 0, 6.3); ctx.fill();
          ctx.beginPath(); ctx.arc(x + w / 2 - 8 * S, topY + 18 * S, 12 * S, 0, 6.3); ctx.fill();
          ctx.fillStyle = '#ffb37e';
          ctx.beginPath();
          ctx.moveTo(x + w / 2 + 4 * S, topY + 20 * S);
          ctx.lineTo(x + w / 2 + 16 * S, topY + 24 * S);
          ctx.lineTo(x + w / 2 + 4 * S, topY + 28 * S);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#3a2a4d';
          ctx.beginPath(); ctx.arc(x + w / 2 - 10 * S, topY + 16 * S, 2.6, 0, 6.3); ctx.fill();
          ctx.strokeStyle = '#a8dcf0';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x + w / 2, topY + 54 * S);
          ctx.lineTo(x + w / 2 + Math.sin(this.time * 5) * 8, topY + 76 * S);
          ctx.lineTo(x + w / 2 - 4, topY + 96 * S);
          ctx.stroke();
        } else if (o.type === 'beehive') {
          ctx.strokeStyle = '#8d6a55';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x + w / 2, topY);
          ctx.lineTo(x + w / 2, topY + 26 * S);
          ctx.stroke();
          const hy = topY + 26 * S;
          ctx.fillStyle = '#ffd94a';
          ctx.beginPath();
          ctx.ellipse(x + w / 2, hy + 44 * S, w * 0.44, 46 * S, 0, 0, 6.3);
          ctx.fill();
          ctx.strokeStyle = '#e8a33d';
          ctx.lineWidth = 4;
          for (let k = 1; k <= 3; k++) {
            ctx.beginPath();
            ctx.arc(x + w / 2, hy + 40 * S + k * 14 * S, w * 0.4 - k * 3, 0.3, Math.PI - 0.3);
            ctx.stroke();
          }
          ctx.fillStyle = '#4a3a2a';
          ctx.beginPath(); ctx.arc(x + w / 2, hy + 76 * S, 6, 0, 6.3); ctx.fill();
        } else if (o.type === 'gate') {
          const cols = ['#ff8fb8', '#ffd94a', '#a8ecd9', '#a8dcf0', '#c9a7f0'];
          for (let k = 0; k < 5; k++) {
            ctx.fillStyle = cols[k];
            ctx.fillRect(x, topY + k * 18 * S, w, 14 * S);
          }
          ctx.fillStyle = 'rgba(255,255,255,.5)';
          ctx.fillRect(x, topY, w, 6 * S);
        } else {
          ctx.fillStyle = 'rgba(169,143,240,.35)';
          ctx.beginPath(); ctx.arc(x + w / 2, topY + hgt / 2, 34 * S, 0, 6.3); ctx.fill();
          ctx.fillStyle = '#c9a7f0';
          ctx.beginPath(); ctx.arc(x + w / 2, topY + hgt * 0.32, 17 * S, 0, 6.3); ctx.fill();
          ctx.fillStyle = '#e5d7fb';
          ctx.beginPath(); ctx.arc(x + w / 2 + 5 * S, topY + hgt * 0.27, 6 * S, 0, 6.3); ctx.fill();
          ctx.fillStyle = '#a48fe4';
          ctx.beginPath();
          ctx.moveTo(x + w / 2 - 12 * S, topY + hgt * 0.44);
          ctx.quadraticCurveTo(x + w / 2, topY + hgt * 0.66, x + w / 2 + 12 * S, topY + hgt * 0.44);
          ctx.quadraticCurveTo(x + w / 2, topY + hgt * 0.54, x + w / 2 - 12 * S, topY + hgt * 0.44);
          ctx.fill();
          ctx.fillStyle = '#7dffc4';
          ctx.beginPath(); ctx.arc(x + w / 2 - 14 * S, topY + hgt * 0.78, 4, 0, 6.3); ctx.fill();
          ctx.beginPath(); ctx.arc(x + w / 2 + 12 * S, topY + hgt * 0.9, 3.4, 0, 6.3); ctx.fill();
        }
        ctx.restore();
        continue;
      }

      /* ground obstacles */
      const y = gy - o.h * S;
      if (o.type === 'hay') {
        ctx.fillStyle = '#e8c46a';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, w, o.h * S, 9);
        else ctx.rect(x, y, w, o.h * S);
        ctx.fill();
        ctx.strokeStyle = '#cfa54e';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x + 4, y + o.h * S * 0.4); ctx.lineTo(x + w - 4, y + o.h * S * 0.4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + w * 0.5, y + 3); ctx.lineTo(x + w * 0.5, y + o.h * S - 3); ctx.stroke();
        ctx.strokeStyle = '#b98f3f';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + 6, y + o.h * S * 0.75); ctx.lineTo(x + w - 6, y + o.h * S * 0.25); ctx.stroke();
      } else if (o.type === 'fence') {
        ctx.fillStyle = wld.id === 'acres' ? '#c0503a' : '#c78d5a';
        ctx.fillRect(x + 4, y + 6, 7, o.h * S - 6);
        ctx.fillRect(x + w - 11, y + 6, 7, o.h * S - 6);
        ctx.fillRect(x + w * 0.5 - 3.5, y + 2, 7, o.h * S - 2);
        ctx.fillRect(x, y + 10 * S, w, 6);
        ctx.fillRect(x, y + o.h * S * 0.62, w, 6);
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.fillRect(x, y + 10 * S, w, 2);
      } else if (o.type === 'pond') {
        ctx.fillStyle = '#5fb8ef';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, w, o.h * S + 6, 10);
        else ctx.rect(x, y, w, o.h * S + 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.8)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + 8, y + 8); ctx.quadraticCurveTo(x + w * 0.4, y + 3, x + w * 0.7, y + 9); ctx.stroke();
        ctx.fillStyle = '#8fd9f7';
        ctx.beginPath(); ctx.arc(x + w * 0.72, y + o.h * S - 2, 5, 0, 6.3); ctx.fill();
      } else if (o.type === 'cart') {
        ctx.fillStyle = wld.id === 'acres' ? '#a5673f' : '#e07ab0';
        ctx.fillRect(x, y + 6, w, o.h * S - 20);
        ctx.fillStyle = 'rgba(255,255,255,.4)';
        ctx.fillRect(x, y + 6, w, 6);
        ctx.fillStyle = '#5b4a5e';
        ctx.beginPath(); ctx.arc(x + 14, gy - 8, 9, 0, 6.3); ctx.fill();
        ctx.beginPath(); ctx.arc(x + w - 14, gy - 8, 9, 0, 6.3); ctx.fill();
        if (wld.id === 'acres') {
          ctx.fillStyle = '#e2543f';
          ctx.beginPath(); ctx.arc(x + 16, y + 4, 8, 0, 6.3); ctx.arc(x + 34, y + 2, 9, 0, 6.3); ctx.arc(x + 52, y + 5, 7, 0, 6.3); ctx.fill();
        } else {
          ctx.fillStyle = '#ffd94a';
          ctx.beginPath(); ctx.arc(x + 16, y + 3, 7, 0, 6.3); ctx.fill();
          ctx.fillStyle = '#a8ecd9';
          ctx.beginPath(); ctx.arc(x + 34, y + 1, 8, 0, 6.3); ctx.fill();
          ctx.fillStyle = '#c9a7f0';
          ctx.beginPath(); ctx.arc(x + 52, y + 4, 6, 0, 6.3); ctx.fill();
        }
      } else if (o.type === 'barrel') {
        ctx.fillStyle = '#b5794e';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, w, o.h * S, 8);
        else ctx.rect(x, y, w, o.h * S);
        ctx.fill();
        ctx.strokeStyle = '#8d5a38';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.lineTo(x + w, y + 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y + o.h * S - 12); ctx.lineTo(x + w, y + o.h * S - 12); ctx.stroke();
        ctx.fillStyle = '#e2543f';
        ctx.beginPath(); ctx.arc(x + w * 0.5, y - 3, 9, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#5fae72';
        ctx.fillRect(x + w * 0.5 + 4, y - 9, 7, 4);
      } else if (o.type === 'cloudpuff') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(x + w * 0.5, gy - 6, w * 0.5, o.h * S * 0.7, 0, Math.PI, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + w * 0.3, y + 10, 12 * S, 0, 6.3);
        ctx.arc(x + w * 0.6, y + 4, 15 * S, 0, 6.3);
        ctx.fill();
        ctx.fillStyle = 'rgba(168,220,240,.6)';
        ctx.beginPath(); ctx.ellipse(x + w * 0.5, gy - 3, w * 0.42, 5, 0, 0, 6.3); ctx.fill();
      } else if (o.type === 'stump') {
        ctx.fillStyle = '#6b4a35';
        ctx.fillRect(x + 4, y + 4, w - 8, o.h * S - 4);
        ctx.fillStyle = '#8d6a55';
        ctx.beginPath(); ctx.ellipse(x + w / 2, y + 5, w / 2 - 3, 8, 0, 0, 6.3); ctx.fill();
        ctx.strokeStyle = '#6b4a35';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(x + w / 2, y + 5, w / 4, 4, 0, 0, 6.3); ctx.stroke();
        ctx.fillStyle = '#5fae72';
        ctx.fillRect(x + 6, y + o.h * S * 0.55, 6, 12);
      } else {
        ctx.fillStyle = '#35684e';
        ctx.beginPath();
        ctx.moveTo(x, gy);
        for (let k = 0; k <= 6; k++) {
          const tx = x + (w * k) / 6;
          const th = (k % 2 ? o.h * S : o.h * S * 0.5);
          ctx.lineTo(tx - (k % 2 ? 0 : 0), gy - th);
        }
        ctx.lineTo(x + w, gy);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#7dffc4';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + w * 0.3, gy - o.h * S * 0.4); ctx.lineTo(x + w * 0.5, gy - o.h * S * 0.75); ctx.stroke();
      }
    }
  };

  Engine.prototype._drawPicks = function (ctx) {
    const S = this.S, gy = this.gy;
    for (let i = 0; i < this.picks.length; i++) {
      const k = this.picks[i];
      if (k.x < -40 || k.x > this.w + 60) continue;
      const bob = Math.sin(k.wob) * 4;
      const x = k.x, y = gy - k.hy * S + bob;
      if (k.type === 'star') {
        const r = 11 * S;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(k.wob * 0.7) * 0.3);
        ctx.fillStyle = '#ffd94a';
        ctx.strokeStyle = '#f0b429';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let p = 0; p < 5; p++) {
          const a1 = -Math.PI / 2 + p * Math.PI * 2 / 5;
          const a2 = a1 + Math.PI / 5;
          ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
          ctx.lineTo(Math.cos(a2) * r * 0.46, Math.sin(a2) * r * 0.46);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      } else if (k.type === 'cake') {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = '#f2c48c';
        ctx.beginPath();
        ctx.moveTo(-9 * S, 4 * S);
        ctx.lineTo(9 * S, 4 * S);
        ctx.lineTo(6 * S, 13 * S);
        ctx.lineTo(-6 * S, 13 * S);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ff8fb8';
        ctx.beginPath(); ctx.ellipse(0, 1 * S, 10 * S, 7 * S, 0, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-3 * S, -3 * S, 3 * S, 0, 6.3); ctx.arc(4 * S, -2 * S, 3.4 * S, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#e2543f';
        ctx.beginPath(); ctx.arc(1 * S, -8 * S, 3.4 * S, 0, 6.3); ctx.fill();
        ctx.restore();
      } else {
        const def = POW[k.pow];
        const r = 16 * S;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(k.wob * 0.6) * 0.2);
        ctx.fillStyle = def.color;
        ctx.globalAlpha = 0.95;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.3); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, r - 1.5, 0, 6.3); ctx.stroke();
        ctx.font = 'bold ' + Math.round(r * 1.1) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(def.icon, 0, 1);
        ctx.restore();
      }
    }
  };

  Engine.prototype._drawMagnet = function (ctx) {
    const S = this.S;
    const pn = this.pony;
    const x = pn.x, y = this.gy - pn.hy - 30 * S;
    ctx.strokeStyle = 'rgba(255,143,184,.65)';
    ctx.lineWidth = 3;
    ctx.setLineDash([9, 9]);
    ctx.lineDashOffset = -this.time * 40;
    ctx.beginPath(); ctx.arc(x, y, 165 * S, 0, 6.3); ctx.stroke();
    ctx.setLineDash([]);
  };

  Engine.prototype._drawCritters = function (ctx) {
    const S = this.S, gy = this.gy;
    for (let i = 0; i < this.critters.length; i++) {
      const c = this.critters[i];
      const x = c.x, y = gy - c.hy;
      if (c.kind === 0) {
        ctx.fillStyle = '#fdfbff';
        ctx.beginPath(); ctx.ellipse(x, y, 11 * S, 9 * S, 0, 0, 6.3); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 6 * S, y - 6 * S, 7 * S, 0, 6.3); ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 4 * S, y - 17 * S, 3 * S, 8 * S, -0.3, 0, 6.3);
        ctx.ellipse(x + 10 * S, y - 16 * S, 3 * S, 8 * S, 0.25, 0, 6.3);
        ctx.fill();
        ctx.fillStyle = '#5b4a5e';
        ctx.beginPath(); ctx.arc(x + 8 * S, y - 7 * S, 1.6, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#ffb7d5';
        ctx.beginPath(); ctx.arc(x + 3 * S, y - 3 * S, 2.4, 0, 6.3); ctx.fill();
      } else {
        ctx.fillStyle = '#a8dcf0';
        ctx.beginPath(); ctx.ellipse(x, y, 10 * S, 8 * S, 0, 0, 6.3); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 7 * S, y - 6 * S, 6 * S, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#ffb37e';
        ctx.beginPath();
        ctx.moveTo(x + 12 * S, y - 7 * S);
        ctx.lineTo(x + 19 * S, y - 5 * S);
        ctx.lineTo(x + 12 * S, y - 3 * S);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#7cc0e0';
        ctx.beginPath();
        ctx.ellipse(x - 4 * S, y - 2 * S, 7 * S, 4 * S, Math.sin(this.time * 12 + i) * 0.5 - 0.4, 0, 6.3);
        ctx.fill();
      }
    }
  };

  Engine.prototype._drawPony = function (ctx) {
    const S = this.S, gy = this.gy;
    const pn = this.pony;
    const px = pn.x, feet = gy - pn.hy;
    const paint = this.cfg.paint;
    const ex = this.cfg.extras;
    const acc = this.cfg.acc;
    const running = pn.onG && this.mode === 'run';
    const phase = pn.anim;
    const blink = (this.power && this.power.id === 'boost');

    ctx.save();
    ctx.translate(px, feet);
    if (pn.tilt) ctx.rotate(pn.tilt);
    ctx.scale(S, S);
    if (pn.alpha < 1) ctx.globalAlpha = pn.alpha;
    if (blink) ctx.globalAlpha = 0.72 + 0.28 * Math.sin(this.time * 22);

    const bodyY = -30;
    const bob = running ? Math.abs(Math.sin(phase)) * 2.2 : 0;
    ctx.translate(0, -bob);

    /* tail */
    ctx.fillStyle = Array.isArray(paint.mane) ? paint.mane[4] : paint.mane2;
    ctx.beginPath();
    ctx.moveTo(-16, bodyY - 6);
    ctx.quadraticCurveTo(-34, bodyY - 12 + Math.sin(phase) * 3, -40, bodyY + 14 + Math.sin(phase * 0.7) * 4);
    ctx.quadraticCurveTo(-30, bodyY + 6, -27, bodyY + 16);
    ctx.quadraticCurveTo(-22, bodyY + 6, -16, bodyY + 8);
    ctx.closePath(); ctx.fill();

    /* back legs */
    const legSwing = running ? Math.sin(phase) * 14 : 0;
    const legSwing2 = running ? Math.sin(phase + Math.PI) * 14 : 0;
    ctx.strokeStyle = paint.shade;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    const tucked = !pn.onG;
    if (tucked) {
      ctx.beginPath(); ctx.moveTo(-8, bodyY + 8); ctx.lineTo(-14, bodyY + 22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-14, bodyY + 8); ctx.lineTo(-20, bodyY + 20); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(-8, bodyY + 8); ctx.lineTo(-8 + legSwing, -4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-14, bodyY + 8); ctx.lineTo(-14 + legSwing2, -4); ctx.stroke();
    }

    /* body */
    ctx.fillStyle = paint.body;
    ctx.beginPath();
    ctx.ellipse(-1, bodyY, 21, 15, -0.06, 0, 6.3);
    ctx.fill();

    /* cutie mark */
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath(); ctx.arc(-14, bodyY - 2, 3.6, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#7ecbf0';
    ctx.beginPath(); ctx.arc(-8, bodyY + 3, 3.2, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#9ee7c4';
    ctx.beginPath(); ctx.arc(-18, bodyY + 5, 3, 0, 6.3); ctx.fill();

    /* wing */
    if (ex.wing) {
      ctx.fillStyle = paint.shade;
      ctx.beginPath();
      ctx.ellipse(-3, bodyY - 9, 13, 8, -0.5 + (pn.onG ? 0 : Math.sin(this.time * 18) * 0.4), 0, 6.3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.65)';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-8, bodyY - 6); ctx.quadraticCurveTo(-2, bodyY - 12, 6, bodyY - 13); ctx.stroke();
    }

    /* front legs */
    ctx.strokeStyle = paint.body;
    ctx.lineWidth = 7;
    if (tucked) {
      ctx.beginPath(); ctx.moveTo(10, bodyY + 8); ctx.lineTo(17, bodyY + 20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(14, bodyY + 10); ctx.lineTo(22, bodyY + 18); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(10, bodyY + 8); ctx.lineTo(10 + legSwing2, -4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(14, bodyY + 8); ctx.lineTo(14 + legSwing, -4); ctx.stroke();
    }
    ctx.strokeStyle = paint.shade;
    if (!tucked) {
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(10 + legSwing2, -8); ctx.lineTo(10 + legSwing2, -4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(14 + legSwing, -8); ctx.lineTo(14 + legSwing, -4); ctx.stroke();
    }

    /* head */
    const hx = 19, hy = bodyY - 20;
    ctx.fillStyle = paint.body;
    ctx.beginPath(); ctx.arc(hx, hy, 13.5, 0, 6.3); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hx + 10, hy + 5, 8.5, 6.5, 0.1, 0, 6.3); ctx.fill();
    ctx.fillStyle = paint.muzzle;
    ctx.beginPath(); ctx.ellipse(hx + 12, hy + 5.5, 5.6, 4.4, 0.1, 0, 6.3); ctx.fill();
    ctx.fillStyle = 'rgba(120,70,100,.5)';
    ctx.beginPath(); ctx.arc(hx + 14.5, hy + 3, 1.3, 0, 6.3); ctx.fill();

    /* ear */
    ctx.fillStyle = paint.body;
    ctx.beginPath();
    ctx.moveTo(hx - 4, hy - 11);
    ctx.lineTo(hx - 1, hy - 21);
    ctx.lineTo(hx + 6, hy - 12);
    ctx.closePath(); ctx.fill();

    /* horn */
    if (ex.horn) {
      ctx.fillStyle = paint.body;
      ctx.beginPath();
      ctx.moveTo(hx + 2, hy - 12);
      ctx.lineTo(hx + 8, hy - 25);
      ctx.lineTo(hx + 10, hy - 11);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = paint.shade;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(hx + 5, hy - 17); ctx.lineTo(hx + 9, hy - 16); ctx.stroke();
    }

    /* mane */
    const maneCol = Array.isArray(paint.mane) ? paint.mane : paint.mane;
    ctx.fillStyle = Array.isArray(maneCol) ? maneCol[0] : maneCol;
    ctx.beginPath();
    ctx.arc(hx - 6, hy - 8, 8.4, 0, 6.3);
    ctx.arc(hx - 12, hy - 1, 7.2, 0, 6.3);
    ctx.arc(hx - 13, hy + 7, 6.4, 0, 6.3);
    ctx.fill();
    ctx.fillStyle = Array.isArray(maneCol) ? paint.mane2 : paint.mane2;
    ctx.beginPath();
    ctx.arc(hx - 3, hy - 12, 6.4, 0, 6.3);
    ctx.arc(hx - 10, hy - 6, 6, 0, 6.3);
    ctx.fill();
    if (Array.isArray(paint.mane)) {
      const cols = paint.mane;
      for (let i = 0; i < cols.length; i++) {
        ctx.fillStyle = cols[i];
        ctx.fillRect(hx - 16 + i * 2.6, hy - 6 + i * 2.4, 9, 3);
      }
    }

    /* eye + face */
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(hx + 5, hy - 1, 4.6, 5.4, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = paint.eye;
    ctx.beginPath(); ctx.ellipse(hx + 5.8, hy, 3.7, 4.6, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#3a2a4d';
    ctx.beginPath(); ctx.arc(hx + 6.4, hy - 1.6, 1.9, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(hx + 4.6, hy - 2.4, 1.2, 0, 6.3); ctx.fill();
    ctx.strokeStyle = '#4a2b52';
    ctx.lineWidth = 1.7;
    ctx.beginPath(); ctx.arc(hx + 13, hy + 7.5, 3.4, 0.25, 1.35); ctx.stroke();

    /* accessories */
    if (acc === 'bow') {
      ctx.fillStyle = '#ec4f92';
      ctx.beginPath();
      ctx.moveTo(hx - 6, hy - 14); ctx.lineTo(hx - 16, hy - 21); ctx.lineTo(hx - 15, hy - 10);
      ctx.closePath();
      ctx.moveTo(hx - 5, hy - 14); ctx.lineTo(hx + 4, hy - 21); ctx.lineTo(hx + 3, hy - 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffd94a';
      ctx.beginPath(); ctx.arc(hx - 5.5, hy - 14.5, 3.4, 0, 6.3); ctx.fill();
    } else if (acc === 'crown') {
      ctx.fillStyle = '#ffd94a';
      ctx.beginPath();
      ctx.moveTo(hx - 9, hy - 14);
      ctx.lineTo(hx - 8, hy - 23); ctx.lineTo(hx - 3, hy - 17);
      ctx.lineTo(hx + 1, hy - 25); ctx.lineTo(hx + 5, hy - 17);
      ctx.lineTo(hx + 10, hy - 22); ctx.lineTo(hx + 9, hy - 13);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff8fb8';
      ctx.beginPath(); ctx.arc(hx + 1, hy - 14, 2.2, 0, 6.3); ctx.fill();
    } else if (acc === 'shades') {
      ctx.fillStyle = '#3a2a4d';
      ctx.fillRect(hx - 1, hy - 5, 17, 8);
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.fillRect(hx + 3, hy - 3.4, 5, 2.4);
    } else if (ex.hat) {
      ctx.fillStyle = '#e8a94e';
      ctx.beginPath(); ctx.ellipse(hx - 3, hy - 12, 17, 5, -0.12, 0, 6.3); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(hx - 12, hy - 13);
      ctx.quadraticCurveTo(hx - 10, hy - 26, hx + 2, hy - 24);
      ctx.quadraticCurveTo(hx + 11, hy - 23, hx + 10, hy - 12);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c96b3a';
      ctx.fillRect(hx - 11, hy - 16, 21, 3.4);
    }

    /* shield bubble */
    if (this.shield) {
      ctx.strokeStyle = 'rgba(168,236,217,.9)';
      ctx.fillStyle = 'rgba(168,236,217,.18)';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(0, bodyY, 42, 46, 0, 0, 6.3);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.beginPath(); ctx.arc(-16, bodyY - 22, 3.4, 0, 6.3); ctx.fill();
    }

    ctx.restore();
  };

  Engine.prototype._drawParts = function (ctx) {
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i];
      const a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.kind === 'dot') {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.3); ctx.fill();
      } else if (p.kind === 'rect') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      } else if (p.kind === 'heart') {
        this._heart(ctx, p.x, p.y, p.size, p.rot);
      } else {
        this._star(ctx, p.x, p.y, p.size, p.rot);
      }
    }
    ctx.globalAlpha = 1;
  };

  Engine.prototype._heart = function (ctx, x, y, r, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.beginPath();
    ctx.moveTo(0, r * 0.35);
    ctx.bezierCurveTo(-r, -r * 0.55, -r * 0.4, -r, 0, -r * 0.35);
    ctx.bezierCurveTo(r * 0.4, -r, r, -r * 0.55, 0, r * 0.35);
    ctx.fill();
    ctx.restore();
  };

  Engine.prototype._star = function (ctx, x, y, r, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 4;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.lineTo(Math.cos(a + Math.PI / 4) * r * 0.36, Math.sin(a + Math.PI / 4) * r * 0.36);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  Engine.prototype._drawFloats = function (ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < this.floats.length; i++) {
      const f = this.floats[i];
      ctx.globalAlpha = clamp(f.life / 0.8, 0, 1);
      ctx.font = 'bold 17px "Baloo 2", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(f.txt, f.x + 1, f.y + 2);
      ctx.fillStyle = f.color;
      ctx.fillText(f.txt, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  };

  Engine.prototype._drawBoost = function (ctx) {
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const y = this.gy - 20 - ((i * 71 + this.time * 620) % (this.gy - 40));
      const x = (i * 137 + this.time * 900) % (this.w + 200) - 100;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 70, y);
      ctx.stroke();
    }
  };

  /* ── debug hooks (tests) ──────────────────────────────── */

  Engine.prototype.dbg = {
    snap: function (e) {
      return {
        mode: e.mode, score: Math.round(e.score), stars: e.stars,
        hy: Math.round(e.pony.hy), obs: e.obs.length, picks: e.picks.length,
        power: e.power ? e.power.id : null, shield: e.shield,
        speed: Math.round(e.speed), w: e.w, h: e.h, gy: e.gy,
        parts: e.parts.length, world: e.cfg.world.id, char: e.cfg.char.id
      };
    },
    place: function (e, type) {
      const def = OBS[type] || OBS.hay;
      e.obs.push({ type: type, kind: def.kind, x: e.pony.x + (def.kind === 'gap' ? -20 : 6), passed: true, w: def.w, h: def.h });
    },
    pow: function (e, id) { e.activatePower(id); },
    score: function (e, n) { e.score = n; e.msIdx = 0; e._hud(true); },
    kick: function (e) { e._die('hit'); },
    noSpawn: function (e, on) { e.noSpawn = !!on; }
  };

  RR.Engine = Engine;
})();
