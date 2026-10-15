/* ═══════════════════════════════════════════════════════════
   game/game.js — Rainbow Rush controller
   scene enter/leave · input · run lifecycle · persistence
   milestones → worlds + site stars · debug hooks
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const KY = (window.KY = window.KY || {});
  const RR = (KY.RR = KY.RR || {});
  const P = RR.PHYS;

  let eng = null, save = null, ready = false, pendingEnter = false;
  let inScene = false, sitePending = 0, runMs = [];
  let resizeT = 0;

  function cfg() {
    const e = save.equip;
    return { char: e.char, world: e.world, trail: e.trail, acc: e.acc, outfit: e.outfit };
  }

  /* ── engine callbacks ─────────────────────────────────── */

  const cbs = {
    onHud: function (d) { if (inScene) RR.UI.hud(d); },
    onSfx: function (n) { KY.sound && KY.sound.play(n); },
    onPower: function (id, on) { if (on && inScene) RR.UI.toastPower(id); },
    onMilestone: function (id, need) {
      const w = RR.WORLD_MAP[id];
      if (w && save.worlds.indexOf(id) < 0) {
        save.worlds.push(id);
        RR.save(save);
        runMs.push(w.name);
        if (inScene) RR.UI.toast('✦ ' + w.name + ' unlocked!');
        KY.sound && KY.sound.play('power');
      }
      const idx = P.SITE_STARS.indexOf(need);
      if (idx >= 0 && idx === save.siteGranted + sitePending) sitePending++;
    },
    onOver: function (res) {
      save.stars += res.stars;
      const newBest = res.score > save.best;
      if (newBest) save.best = res.score;
      RR.save(save);
      const news = [];
      if (newBest) news.push('new best!');
      runMs.forEach(function (n) { news.push('✦ ' + n + ' open'); });
      if (!news.length) news.push('★ keep running to open worlds');
      if (inScene) RR.UI.over({ score: res.score, stars: res.stars, newBest: newBest }, news, save);
      runMs = [];
    },
    onPickup: function () {},
    onDie: function () {}
  };

  /* ── site stars earned in-game ────────────────────────── */

  function flushSiteStars() {
    const n = sitePending;
    sitePending = 0;
    for (let i = 0; i < n; i++) {
      (function (k) {
        setTimeout(function () {
          if (save.siteGranted >= P.SITE_STARS.length) return;
          save.siteGranted++;
          RR.save(save);
          if (KY.grantSiteStar) KY.grantSiteStar();
        }, 450 + k * 750);
      })(i);
    }
  }

  /* ── flows ────────────────────────────────────────────── */

  function beginRun() {
    runMs = [];
    RR.UI.hideAll();
    RR.UI.hudOn(true);
    eng.start(save, cfg());
  }

  const game = {
    enter: function () {
      inScene = true;
      if (!ready) { pendingEnter = true; return; }
      eng.resize();
      eng.setCfg(cfg());
      eng.save = save;
      eng._render();
      RR.UI.start(save);
      /* scene transform settles over .38s — resize once it has */
      clearTimeout(game._rsT);
      game._rsT = setTimeout(function () {
        if (ready && inScene) eng.resize();
      }, 450);
    },

    leave: function () {
      inScene = false;
      if (!ready) { pendingEnter = false; return; }
      eng.stop();
      RR.UI.hideAll();
      RR.UI.hudOn(false);
      flushSiteStars();
      RR.save(save);
    },

    play: function () {
      if (!save.tut) { RR.UI.tutorial(); return; }
      beginRun();
    },

    tutGo: function () {
      save.tut = true;
      RR.save(save);
      beginRun();
    },

    pause: function () {
      if (eng.pause()) RR.UI.pause();
    },

    resume: function () {
      RR.UI.hideAll();
      RR.UI.hudOn(true);
      eng.resume();
    },

    restart: function () { beginRun(); },

    home: function () { KY.goScene('play'); },

    back: function () { RR.UI.start(save); },

    openWorlds: function () { RR.UI.worlds(save); },

    openChars: function () { RR.UI.openChars(save); },

    openCloset: function () { RR.UI.closet(save); },

    selectWorld: function (id) {
      if (save.worlds.indexOf(id) < 0) {
        RR.UI.toast('run a little further to reach it ♡');
        return;
      }
      if (save.equip.world === id) return;
      save.equip.world = id;
      RR.save(save);
      KY.sound && KY.sound.play('ui');
      RR.UI.worlds(save);
      RR.UI.toast('✦ ' + (RR.WORLD_MAP[id] || {}).name + ' is home!');
    },

    selectChar: function (id) {
      const ch = RR.CHAR_MAP[id];
      if (!ch) return;
      const owned = save.owned.indexOf('char:' + id) >= 0;
      if (!owned) {
        if (save.stars < ch.cost) {
          RR.UI.toast('needs ★ ' + ch.cost + ' — collect more ♡');
          KY.sound && KY.sound.play('ui');
          return;
        }
        save.stars -= ch.cost;
        save.owned.push('char:' + id);
        save.equip.char = id;
        RR.save(save);
        KY.sound && KY.sound.play('power');
        RR.UI.toast('got ' + ch.name + '! ♡');
      } else {
        save.equip.char = id;
        RR.save(save);
        KY.sound && KY.sound.play('ui');
      }
      RR.UI.openChars(save);
    },

    selectItem: function (fullId) {
      const it = RR.ITEM_MAP[fullId];
      if (!it) return;
      const i = fullId.indexOf(':');
      const kind = fullId.slice(0, i);
      const sub = fullId.slice(i + 1);
      const owned = save.owned.indexOf(fullId) >= 0;
      if (!owned) {
        if (save.stars < it.cost) {
          RR.UI.toast('needs ★ ' + it.cost + ' — collect more ♡');
          KY.sound && KY.sound.play('ui');
          return;
        }
        save.stars -= it.cost;
        save.owned.push(fullId);
        save.equip[kind] = sub;
        RR.save(save);
        KY.sound && KY.sound.play('power');
        RR.UI.toast('got ' + it.name + '! ♡');
      } else {
        save.equip[kind] = save.equip[kind] === sub ? 'none' : sub;
        RR.save(save);
        KY.sound && KY.sound.play('ui');
      }
      RR.UI.closet(save);
    },

    dbg: null
  };

  /* ── boot ─────────────────────────────────────────────── */

  function wireInput() {
    const scene = document.getElementById('scene-game');
    const canvas = document.getElementById('rr-canvas');
    const jumpBtn = document.getElementById('rr-jump');
    if (!scene || !canvas) return;

    function jumpIf(e) {
      if (e && e.cancelable) e.preventDefault();
      if (inScene && eng.mode === 'run') eng.jump();
    }
    canvas.addEventListener('pointerdown', jumpIf);
    if (jumpBtn) jumpBtn.addEventListener('pointerdown', jumpIf);

    scene.addEventListener('touchmove', function (e) {
      if (inScene && eng.mode === 'run' && e.cancelable) e.preventDefault();
    }, { passive: false });
    scene.addEventListener('contextmenu', function (e) {
      if (inScene && eng.mode === 'run') e.preventDefault();
    });

    document.addEventListener('keydown', function (e) {
      if (!inScene || !ready) return;
      const k = e.code;
      if (k === 'Space' || k === 'ArrowUp' || k === 'KeyW') {
        if (eng.mode === 'run') {
          if (e.cancelable) e.preventDefault();
          eng.jump();
        }
      } else if (k === 'Escape' || k === 'KeyP') {
        if (eng.mode === 'run') { if (e.cancelable) e.preventDefault(); game.pause(); }
        else if (eng.mode === 'paused') { if (e.cancelable) e.preventDefault(); game.resume(); }
      }
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden && inScene && ready && eng.mode === 'run') game.pause();
    });

    window.addEventListener('resize', function () {
      if (!ready) return;
      clearTimeout(resizeT);
      resizeT = setTimeout(function () {
        if (!inScene) return;
        eng.resize();
        if (eng.mode !== 'run') eng._render();
      }, 120);
    });
  }

  function boot() {
    save = RR.load();
    const canvas = document.getElementById('rr-canvas');
    eng = new RR.Engine(canvas, cbs);
    RR.UI.init({
      play: game.play,
      tutGo: game.tutGo,
      home: game.home,
      back: game.back,
      openWorlds: game.openWorlds,
      openChars: game.openChars,
      openCloset: game.openCloset,
      pause: game.pause,
      resume: game.resume,
      restart: game.restart,
      selectWorld: game.selectWorld,
      selectChar: game.selectChar,
      selectItem: game.selectItem
    });
    wireInput();

    game.dbg = {
      engine: eng,
      snap: function () { return eng.dbg.snap(eng); },
      place: function (t) { eng.dbg.place(eng, t); },
      pow: function (id) { eng.dbg.pow(eng, id); },
      setScore: function (n) { eng.dbg.score(eng, n); },
      kill: function () { eng.dbg.kick(eng); },
      noSpawn: function (on) { eng.dbg.noSpawn(eng, on); },
      save: function () { return save; },
      reload: function () { save = RR.load(); return save; },
      begin: function () { save.tut = true; beginRun(); }
    };

    ready = true;
    if (pendingEnter) { pendingEnter = false; game.enter(); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  KY.game = game;
})();
