/* ═══════════════════════════════════════════════════════════
   game/data.js — Rainbow Rush static data
   worlds · characters · power-ups · obstacles · shop · save
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const KY = (window.KY = window.KY || {});
  const RR = (KY.RR = KY.RR || {});

  RR.SAVE_KEY = 'koka-rainbow-rush-v1';

  RR.PHYS = {
    GRAV: 2600,
    JUMP: 950,
    BUFFER: 0.15,
    SPEED0: 255,
    SPEED_MAX: 520,
    SPEED_PER_PT: 0.062,
    BOOST_MULT: 1.45,
    OB_GAP: [1.02, 1.45],
    PICK_T: [1.0, 1.9],
    POW_T: [13, 21],
    GAP_FRAC: 0.34,
    PASS_PT: 10,
    STAR_PT: 10,
    CAKE_PT: 25,
    MILESTONES: [
      { id: 'acres', need: 500 },
      { id: 'cloudsdale', need: 1200 },
      { id: 'everfree', need: 2200 }
    ],
    SITE_STARS: [500, 1200, 2200]
  };

  RR.WORLDS = [
    {
      id: 'ponyville', name: 'ponyville', need: 0,
      card: 'linear-gradient(160deg,#aee3ff,#e8f9ff 70%,#c8f0d4)',
      sky: ['#8ed0f5', '#e6f8ff'],
      hill1: '#b7e8c4', hill2: '#8ed9a4',
      grass: '#6fc486', grassD: '#57ab6f',
      dirt: '#8d6a55', dirtD: '#79594a',
      obs: ['hay', 'fence', 'pond', 'cart', 'kite']
    },
    {
      id: 'acres', name: 'sweet apple acres', need: 500,
      card: 'linear-gradient(160deg,#ffd9a0,#fff4e0 70%,#e8f0b4)',
      sky: ['#ffcf92', '#fff4e2'],
      hill1: '#f2e39a', hill2: '#dfd078',
      grass: '#9ec85f', grassD: '#86b24b',
      dirt: '#9c6b45', dirtD: '#875a3a',
      obs: ['hay', 'fence', 'barrel', 'cart', 'beehive']
    },
    {
      id: 'cloudsdale', name: 'cloudsdale', need: 1200,
      card: 'linear-gradient(160deg,#6fc3f2,#d8f2ff 70%,#f0f9ff)',
      sky: ['#5fb8ef', '#dcf3ff'],
      hill1: '#eaf7ff', hill2: '#d3ecfb',
      grass: '#f6fbff', grassD: '#e2eff8',
      dirt: '#cfe2f0', dirtD: '#b9d2e5',
      obs: ['cloudpuff', 'pond', 'gate', 'bird']
    },
    {
      id: 'everfree', name: 'everfree forest', need: 2200,
      card: 'linear-gradient(160deg,#3b4474,#5a5490 70%,#7dffc4)',
      sky: ['#333c6e', '#6a5f96'],
      hill1: '#2f4d58', hill2: '#27414c',
      grass: '#3f7a5c', grassD: '#35684e',
      dirt: '#3c4a44', dirtD: '#313d38',
      obs: ['stump', 'thorn', 'pond', 'wisp']
    }
  ];
  RR.WORLD_MAP = {};
  RR.WORLDS.forEach(function (w) { RR.WORLD_MAP[w.id] = w; });

  RR.OBS = {
    hay:       { w: 44, h: 40, kind: 'ground' },
    fence:     { w: 58, h: 38, kind: 'ground' },
    pond:      { w: 64, h: 26, kind: 'ground' },
    cart:      { w: 64, h: 50, kind: 'ground' },
    barrel:    { w: 44, h: 46, kind: 'ground' },
    cloudpuff: { w: 56, h: 34, kind: 'ground' },
    stump:     { w: 46, h: 44, kind: 'ground' },
    thorn:     { w: 66, h: 30, kind: 'ground' },
    kite:      { w: 54, h: 90, kind: 'float' },
    bird:      { w: 56, h: 90, kind: 'float' },
    beehive:   { w: 48, h: 90, kind: 'float' },
    gate:      { w: 58, h: 90, kind: 'float' },
    wisp:      { w: 50, h: 90, kind: 'float' },
    gap:       { w: 90, h: 0, kind: 'gap' }
  };
  RR.FLOAT_BOT = 100;
  RR.FLOAT_TOP = 190;

  RR.POWERUPS = {
    boost:    { id: 'boost',    name: 'rainbow dash boost', icon: '🌈', dur: 4.5, color: '#6fc3f2' },
    kindness: { id: 'kindness', name: "fluttershy's kindness", icon: '🦋', dur: 6.5, color: '#ffe07e' },
    party:    { id: 'party',    name: 'pinkie pie party', icon: '🎈', dur: 6.5, color: '#ff8fb8' },
    shield:   { id: 'shield',   name: 'friendship shield', icon: '⭐', dur: 0,  color: '#a8ecd9' }
  };
  RR.POWER_IDS = ['boost', 'kindness', 'party', 'shield'];

  RR.CHARS = [
    { id: 'pinkie', name: 'pinkie pie', cost: 0, perk: 'cupcakes +50% score',
      paint: { body: '#f7bed6', shade: '#eba6c6', muzzle: '#ffe6f0', mane: '#ec4f92', mane2: '#f689b4', eye: '#79cfe6' }, extras: {} },
    { id: 'fluttershy', name: 'fluttershy', cost: 50, perk: 'kindness lasts +50%',
      paint: { body: '#faeaa4', shade: '#e8cf7c', muzzle: '#fff6d8', mane: '#f49ec4', mane2: '#fbc3da', eye: '#3fbfa8' }, extras: { wing: true } },
    { id: 'rainbow', name: 'rainbow dash', cost: 100, perk: 'boost lasts +40%',
      paint: { body: '#8fd9f7', shade: '#74c4e6', muzzle: '#dff4fd',
        mane: ['#ff5d5d', '#ffa54d', '#ffe14d', '#5ec96e', '#4f9de0', '#a06cd5'], mane2: '#7c5cd0', eye: '#e879b9' }, extras: { wing: true } },
    { id: 'twilight', name: 'twilight sparkle', cost: 150, perk: 'all score +15%',
      paint: { body: '#d6bdee', shade: '#c2a4e0', muzzle: '#f3e9fb', mane: '#5b3a9e', mane2: '#8a5fc4', eye: '#9b7ede' }, extras: { wing: true, horn: true } },
    { id: 'rarity', name: 'rarity', cost: 200, perk: 'friendship stars ×2',
      paint: { body: '#fdfdff', shade: '#e6e3f0', muzzle: '#ffffff', mane: '#7c4dcc', mane2: '#a678e8', eye: '#7cb9e8' }, extras: { horn: true } },
    { id: 'applejack', name: 'applejack', cost: 250, perk: 'starts with a shield',
      paint: { body: '#fcbf7e', shade: '#eea75f', muzzle: '#ffe8cd', mane: '#f6dd8a', mane2: '#e9c45f', eye: '#4fbf8f' }, extras: { hat: true } }
  ];
  RR.CHAR_MAP = {};
  RR.CHARS.forEach(function (c) { RR.CHAR_MAP[c.id] = c; });

  RR.ITEMS = [
    { id: 'trail:rainbow', kind: 'trail', name: 'rainbow trail', icon: '🌈', cost: 60 },
    { id: 'trail:sparkle', kind: 'trail', name: 'sparkle trail', icon: '✨', cost: 100 },
    { id: 'trail:hearts', kind: 'trail', name: 'heart trail', icon: '💗', cost: 140 },
    { id: 'acc:bow', kind: 'acc', name: 'party bow', icon: '🎀', cost: 40 },
    { id: 'acc:crown', kind: 'acc', name: 'star crown', icon: '👑', cost: 90 },
    { id: 'acc:shades', kind: 'acc', name: 'cool shades', icon: '🕶', cost: 130 },
    { id: 'outfit:cotton', kind: 'outfit', name: 'cotton candy', icon: '🍬', cost: 90,
      colors: { body: '#ffd9ec', shade: '#f7bcdf', muzzle: '#fff3fa', mane: '#ff7fb8', mane2: '#a5d8ff', eye: '#4fb0e8' } },
    { id: 'outfit:mint', kind: 'outfit', name: 'minty fresh', icon: '🍀', cost: 120,
      colors: { body: '#a8ecd9', shade: '#8ad8c4', muzzle: '#eafff9', mane: '#3fae94', mane2: '#7ad8c0', eye: '#2f9e86' } },
    { id: 'outfit:midnight', kind: 'outfit', name: 'midnight magic', icon: '🌙', cost: 150,
      colors: { body: '#b9a7f0', shade: '#a48fe4', muzzle: '#efe9ff', mane: '#4a3f8f', mane2: '#7b6bd0', eye: '#ffd94a' } }
  ];
  RR.ITEM_MAP = {};
  RR.ITEMS.forEach(function (i) { RR.ITEM_MAP[i.id] = i; });

  RR.defaults = function () {
    return {
      best: 0,
      stars: 0,
      worlds: ['ponyville'],
      owned: ['char:pinkie', 'trail:none', 'acc:none', 'outfit:none'],
      equip: { char: 'pinkie', world: 'ponyville', trail: 'none', acc: 'none', outfit: 'none' },
      tut: false,
      siteGranted: 0
    };
  };

  RR.load = function () {
    const d = RR.defaults();
    try {
      const raw = localStorage.getItem(RR.SAVE_KEY);
      if (!raw) return d;
      const s = JSON.parse(raw);
      if (!s || typeof s !== 'object') return d;
      if (typeof s.best === 'number') d.best = Math.max(0, s.best | 0);
      if (typeof s.stars === 'number') d.stars = Math.max(0, s.stars | 0);
      if (Array.isArray(s.worlds) && s.worlds.length) {
        d.worlds = s.worlds.filter(function (w) { return !!RR.WORLD_MAP[w]; });
        if (d.worlds.indexOf('ponyville') < 0) d.worlds.unshift('ponyville');
      }
      if (Array.isArray(s.owned)) {
        s.owned.forEach(function (id) {
          if (typeof id !== 'string') return;
          const parts = id.split(':');
          const ok = parts[0] === 'char' ? !!RR.CHAR_MAP[parts[1]] :
            (['trail', 'acc', 'outfit'].indexOf(parts[0]) >= 0 && !!RR.ITEM_MAP[id]);
          if (ok && d.owned.indexOf(id) < 0) d.owned.push(id);
        });
      }
      if (s.equip && typeof s.equip === 'object') {
        ['char', 'world', 'trail', 'acc', 'outfit'].forEach(function (k) {
          if (typeof s.equip[k] === 'string') d.equip[k] = s.equip[k];
        });
      }
      if (d.owned.indexOf('char:' + d.equip.char) < 0) d.equip.char = 'pinkie';
      if (d.worlds.indexOf(d.equip.world) < 0) d.equip.world = 'ponyville';
      d.tut = !!s.tut;
      if (typeof s.siteGranted === 'number') d.siteGranted = Math.max(0, Math.min(3, s.siteGranted | 0));
    } catch (e) {}
    return d;
  };

  RR.save = function (data) {
    try { localStorage.setItem(RR.SAVE_KEY, JSON.stringify(data)); } catch (e) {}
  };
})();
