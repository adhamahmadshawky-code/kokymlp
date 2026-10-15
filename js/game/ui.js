/* ═══════════════════════════════════════════════════════════
   game/ui.js — Rainbow Rush DOM layer
   overlays · HUD · world/character/closet grids · toast
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const KY = (window.KY = window.KY || {});
  const RR = (KY.RR = KY.RR || {});

  const $ = function (s, r) { return (r || document).querySelector(s); };
  const UID = { n: 0 };

  const EL = {};
  const OVS = ['ov-start', 'ov-worlds', 'ov-chars', 'ov-tutorial', 'ov-pause', 'ov-over'];

  function ponyPreview(charId, save, cls, tag) {
    const ch = RR.CHAR_MAP[charId] || RR.CHARS[0];
    const outfit = save.equip.outfit !== 'none' ? RR.ITEM_MAP['outfit:' + save.equip.outfit] : null;
    const opts = { cls: cls, face: 'happy', uid: (tag || 'g') + (++UID.n) };
    if (outfit && outfit.colors) opts.colors = outfit.colors;
    return KY.pony(ch.id, opts);
  }

  const UI = {
    bus: null,

    init: function (bus) {
      this.bus = bus;
      [
        'rr-hud', 'rr-score', 'rr-runstars', 'rr-power', 'rr-power-ic', 'rr-power-fill',
        'rr-btn-pause', 'rr-ms', 'rr-ms-label', 'rr-ms-fill', 'rr-jump',
        'ov-start', 'st-best', 'st-gstars', 'st-world', 'st-world-name', 'st-char', 'st-char-pony', 'st-char-name',
        'rr-play', 'rr-worlds-btn', 'rr-chars-btn', 'rr-quit',
        'ov-worlds', 'rr-worlds', 'rr-worlds-back',
        'ov-chars', 'rr-tab-ponies', 'rr-tab-closet', 'rr-chars', 'rr-closet', 'rr-chars-back',
        'ov-tutorial', 'rr-tut-go', 'ov-pause', 'rr-resume', 'rr-restart', 'rr-home',
        'ov-over', 'ov-over-kick', 'ov-over-score', 'ov-over-best', 'ov-over-stars', 'ov-over-news',
        'rr-again', 'rr-over-home', 'rr-toast'
      ].forEach(function (n) { EL[n] = document.getElementById(n); });

      const b = bus;
      EL['rr-play'].addEventListener('click', function () { b.play(); });
      EL['rr-tut-go'].addEventListener('click', function () { b.tutGo(); });
      EL['rr-quit'].addEventListener('click', function () { b.home(); });
      EL['rr-home'].addEventListener('click', function () { b.home(); });
      EL['rr-over-home'].addEventListener('click', function () { b.home(); });
      EL['rr-worlds-btn'].addEventListener('click', function () { b.openWorlds(); });
      EL['st-world'].addEventListener('click', function () { b.openWorlds(); });
      EL['rr-chars-btn'].addEventListener('click', function () { b.openChars(); });
      EL['st-char'].addEventListener('click', function () { b.openChars(); });
      EL['rr-worlds-back'].addEventListener('click', function () { b.back(); });
      EL['rr-chars-back'].addEventListener('click', function () { b.back(); });
      EL['rr-tab-ponies'].addEventListener('click', function () { b.openChars(); });
      EL['rr-tab-closet'].addEventListener('click', function () { b.openCloset(); });
      EL['rr-resume'].addEventListener('click', function () { b.resume(); });
      EL['rr-restart'].addEventListener('click', function () { b.restart(); });
      EL['rr-again'].addEventListener('click', function () { b.restart(); });
      EL['rr-btn-pause'].addEventListener('click', function () { b.pause(); });

      EL['rr-worlds'].addEventListener('click', function (e) {
        const card = e.target.closest('[data-world]');
        if (card) b.selectWorld(card.dataset.world);
      });
      EL['rr-chars'].addEventListener('click', function (e) {
        const card = e.target.closest('[data-char]');
        if (card) b.selectChar(card.dataset.char);
      });
      EL['rr-closet'].addEventListener('click', function (e) {
        const card = e.target.closest('[data-item]');
        if (card) b.selectItem(card.dataset.item);
      });
    },

    /* ── overlays ─────────────────────────────────────────── */

    hideAll: function () {
      OVS.forEach(function (id) { const e = document.getElementById(id); if (e) e.hidden = true; });
    },

    only: function (id) {
      this.hideAll();
      EL[id].hidden = false;
    },

    start: function (save) {
      EL['st-best'].textContent = save.best | 0;
      EL['st-gstars'].textContent = save.stars | 0;
      const w = RR.WORLD_MAP[save.equip.world] || RR.WORLDS[0];
      EL['st-world-name'].textContent = w.name;
      const ch = RR.CHAR_MAP[save.equip.char] || RR.CHARS[0];
      EL['st-char-name'].textContent = ch.name;
      EL['st-char-pony'].innerHTML = ponyPreview(ch.id, save, 'pony-tiny', 'hub');
      this.only('ov-start');
      this.hudOn(false);
    },

    tutorial: function () { this.only('ov-tutorial'); },

    pause: function () { this.only('ov-pause'); },

    over: function (res, news, save) {
      EL['ov-over-kick'].textContent = res.newBest ? 'new best! ♡' : 'run over ♡';
      EL['ov-over-score'].textContent = res.score;
      EL['ov-over-best'].textContent = 'best ' + save.best;
      EL['ov-over-stars'].textContent = '★ +' + res.stars + ' collected';
      EL['ov-over-news'].innerHTML = news.map(function (n) {
        return '<span class="rr-news-chip">' + n + '</span>';
      }).join('');
      this.only('ov-over');
      this.hudOn(false);
    },

    worlds: function (save) {
      EL['rr-worlds'].innerHTML = RR.WORLDS.map(function (w) {
        const unlocked = save.worlds.indexOf(w.id) >= 0;
        const on = save.equip.world === w.id;
        const state = on ? 'running here ♡' : (unlocked ? 'choose' : 'reach ' + w.need + ' pts');
        return '<button class="rr-world' + (on ? ' on' : '') + (unlocked ? '' : ' locked') +
          '" data-world="' + w.id + '" type="button" style="background:' + w.card + '"' +
          (unlocked ? '' : ' aria-disabled="true"') + '>' +
          '<span class="rr-world-name">' + (unlocked ? w.name : '✦ ' + w.name) + '</span>' +
          '<span class="rr-world-state">' + state + '</span></button>';
      }).join('');
      this.only('ov-worlds');
    },

    openChars: function (save) {
      const eq = save.equip;
      EL['rr-chars'].innerHTML = RR.CHARS.map(function (c) {
        const owned = save.owned.indexOf('char:' + c.id) >= 0;
        const on = eq.char === c.id;
        const state = on ? 'wearing ♡' : (owned ? 'choose' : '★ ' + c.cost);
        return '<button class="rr-pony' + (on ? ' on' : '') + (owned ? '' : ' locked') +
          '" data-char="' + c.id + '" type="button">' +
          '<span class="rr-pony-pv">' + ponyPreview(c.id, save, 'pony-tiny', 'ch') + '</span>' +
          '<span class="rr-pony-name">' + c.name + '</span>' +
          '<span class="rr-pony-perk">' + c.perk + '</span>' +
          '<span class="rr-tag' + (on ? ' got' : owned ? '' : ' cost') + '">' + state + '</span>' +
          '</button>';
      }).join('');
      this.tab('ponies');
      this.only('ov-chars');
    },

    closet: function (save) {
      const eq = save.equip;
      EL['rr-closet'].innerHTML = RR.ITEMS.map(function (it) {
        const parts = it.id.split(':');
        const kind = parts[0], sub = parts.slice(1).join(':');
        const owned = save.owned.indexOf(it.id) >= 0;
        const on = eq[kind] === sub;
        const state = on ? 'on ♡' : (owned ? 'wear' : '★ ' + it.cost);
        return '<button class="rr-item' + (on ? ' on' : '') + (owned ? '' : ' locked') +
          '" data-item="' + it.id + '" type="button">' +
          '<span class="rr-item-ic">' + it.icon + '</span>' +
          '<span class="rr-item-name">' + it.name + '</span>' +
          '<span class="rr-tag' + (on ? ' got' : owned ? '' : ' cost') + '">' + state + '</span>' +
          '</button>';
      }).join('');
      this.tab('closet');
      this.only('ov-chars');
    },

    tab: function (which) {
      EL['rr-tab-ponies'].classList.toggle('active', which === 'ponies');
      EL['rr-tab-closet'].classList.toggle('active', which === 'closet');
      EL['rr-chars'].hidden = which !== 'ponies';
      EL['rr-closet'].hidden = which !== 'closet';
    },

    /* ── HUD ──────────────────────────────────────────────── */

    hudOn: function (on) {
      EL['rr-hud'].hidden = !on;
      EL['rr-jump'].hidden = !on;
      if (!on) { EL['rr-power'].hidden = true; this._powId = null; }
    },

    hud: function (d) {
      EL['rr-score'].textContent = d.score;
      EL['rr-runstars'].textContent = d.stars;
      if (d.power) {
        const def = RR.POWERUPS[d.power.id];
        if (this._powId !== d.power.id) {
          this._powId = d.power.id;
          EL['rr-power-ic'].textContent = def ? def.icon : '✦';
        }
        EL['rr-power'].hidden = false;
        EL['rr-power-fill'].style.width = Math.round((d.power.frac || 0) * 100) + '%';
        EL['rr-power-fill'].style.background = def ? def.color : '#fff';
      } else {
        EL['rr-power'].hidden = true;
      }
      if (d.ms && d.ms.name) {
        EL['rr-ms-label'].textContent = 'next: ' + d.ms.name + ' ✦ ' + d.ms.need;
        EL['rr-ms-fill'].style.width = Math.round((d.ms.frac || 0) * 100) + '%';
        EL['rr-ms'].hidden = false;
      } else {
        EL['rr-ms-label'].textContent = 'all worlds open ♡';
        EL['rr-ms-fill'].style.width = '100%';
        EL['rr-ms'].hidden = false;
      }
    },

    /* ── toast ────────────────────────────────────────────── */

    toast: function (msg, ms) {
      const t = EL['rr-toast'];
      if (!t) return;
      t.textContent = msg;
      t.classList.remove('show');
      void t.offsetWidth;
      t.classList.add('show');
      clearTimeout(t._t);
      t._t = setTimeout(function () { t.classList.remove('show'); }, ms || 2000);
    },

    toastPower: function (id) {
      const def = RR.POWERUPS[id];
      if (def) this.toast(def.icon + ' ' + def.name + '!');
    }
  };

  RR.UI = UI;
})();
