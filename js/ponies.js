/* ═══════════════════════════════════════════════════════════
   ponies.js — hand-built SVG character art for Koka's Pony World
   Pure vector: no image assets, no network needed, instant load.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const KY = (window.KY = window.KY || {});

  /* ── cutie marks (drawn at ~24px, centered on 0,0) ─────── */
  const CUTIES = {
    pinkie:
      '<g transform="scale(.95)">' +
      '<ellipse cx="-7" cy="-4" rx="3.6" ry="4.4" fill="#7ecbf0"/><path d="M-7 .4l1.6 2.6h-3.2z" fill="#7ecbf0"/><path d="M-7 3q-1 4 2 7" stroke="#d78bb5" stroke-width=".9" fill="none"/>' +
      '<ellipse cx="1" cy="-7" rx="3.6" ry="4.4" fill="#ffd94a"/><path d="M1 -2.6l1.6 2.6h-3.2z" fill="#ffd94a"/><path d="M1 0q0 4 0 8" stroke="#d78bb5" stroke-width=".9" fill="none"/>' +
      '<ellipse cx="9" cy="-3" rx="3.6" ry="4.4" fill="#9ee7c4"/><path d="M9 1.4l1.6 2.6h-3.2z" fill="#9ee7c4"/><path d="M9 4q1 3 0 6" stroke="#d78bb5" stroke-width=".9" fill="none"/></g>',
    fluttershy:
      '<g transform="scale(.95)" fill="#f49ec4">' +
      '<path d="M0 0c-5-6-12-6-12 0 0 5 6 6 12 0z" transform="translate(-7,-3)"/>' +
      '<path d="M0 0c5-6 12-6 12 0 0 5-6 6-12 0z" transform="translate(-7,-3)"/>' +
      '<path d="M0 0c-4-5-10-5-10 0 0 4 5 5 10 0z" transform="translate(9,1)"/>' +
      '<path d="M0 0c4-5 10-5 10 0 0 4-5 5-10 0z" transform="translate(9,1)"/></g>',
    twilight:
      '<g transform="scale(.95)">' +
      '<path d="M0-9 2-3.4 8-3 3.4 1 5.2 6.8 0 3.2-5.2 6.8-3.4 1-8-3l6-.4z" fill="#b79de8"/>' +
      '<g fill="#fff"><circle cx="-8" cy="-7" r="1.2"/><circle cx="8" cy="-6" r="1.2"/><circle cx="-6" cy="6" r="1.2"/><circle cx="7" cy="7" r="1.2"/><circle cx="0" cy="9" r="1.2"/></g></g>',
    rainbow:
      '<g transform="scale(.95)">' +
      '<g fill="#fff"><ellipse cx="-4" cy="-2" rx="4" ry="3"/><ellipse cx="1" cy="-4" rx="4.6" ry="3.6"/><ellipse cx="6" cy="-1" rx="3.6" ry="2.8"/><rect x="-7" y="-1" width="14" height="2.4" rx="1.2"/></g>' +
      '<path d="M-7 4l4 0-2 4 4 0-3 6 6-9 3 0z" fill="#ff5d5d"/>' +
      '<path d="M-7 4l4 0-2 4 4 0-3 6" fill="none" stroke="#ffd94a" stroke-width="1.6"/>' +
      '<path d="M-2 12l3-4" stroke="#7cc7f0" stroke-width="1.6"/></g>',
    rarity:
      '<g transform="scale(.95)">' +
      '<path d="M-10-2-4-9l6 7-6 7z" fill="#8fd4f5"/><path d="M-4-9-10-2l6 2z" fill="#c4e9fb"/>' +
      '<path d="M2-6l6 7-6 7-6-7z" fill="#8fd4f5"/><path d="M8 1L2-6l6-1z" fill="#c4e9fb"/>' +
      '<path d="M-2 8l6 6-6 1-6-1z" fill="#8fd4f5"/><path d="M4 14l-6-6 6-1z" fill="#c4e9fb"/></g>',
    applejack:
      '<g transform="scale(.95)">' +
      '<g fill="#e2543f"><circle cx="-6" cy="-3" r="4.2"/><circle cx="2" cy="-6" r="4.2"/><circle cx="8" cy="1" r="4.2"/></g>' +
      '<g fill="#ff9c8a"><circle cx="-7.2" cy="-4.4" r="1.2"/><circle cx="0.8" cy="-7.4" r="1.2"/><circle cx="6.8" cy="-.4" r="1.2"/></g>' +
      '<g stroke="#7a4a2a" stroke-width="1" fill="none"><path d="M-6-7v-2M2-10v-2M8-3v-2"/></g>' +
      '<g fill="#5fae72"><path d="M-5-9q4-4 7-1-3 3-7 1z"/><path d="M3-12q4-4 7-1-3 3-7 1z"/></g></g>'
  };

  /* ── characters ────────────────────────────────────────── */
  const CHARS = {
    pinkie:     { body: '#f7bed6', shade: '#eba6c6', muzzle: '#ffe6f0', mane: '#ec4f92', mane2: '#f689b4', eye: '#79cfe6', cutie: 'pinkie' },
    fluttershy: { body: '#faeaa4', shade: '#e8cf7c', muzzle: '#fff6d8', mane: '#f49ec4', mane2: '#fbc3da', eye: '#3fbfa8', cutie: 'fluttershy', wing: true },
    twilight:   { body: '#d6bdee', shade: '#c2a4e0', muzzle: '#f3e9fb', mane: '#5b3a9e', mane2: '#8a5fc4', eye: '#9b7ede', cutie: 'twilight', wing: true, horn: true },
    rainbow:    { body: '#8fd9f7', shade: '#74c4e6', muzzle: '#dff4fd', mane: ['#ff5d5d', '#ffa54d', '#ffe14d', '#5ec96e', '#4f9de0', '#a06cd5'], eye: '#e879b9', cutie: 'rainbow', wing: true },
    rarity:     { body: '#fdfdff', shade: '#e6e3f0', muzzle: '#ffffff', mane: '#7c4dcc', mane2: '#a678e8', eye: '#7cb9e8', cutie: 'rarity', horn: true, lashes: true },
    applejack:  { body: '#fcbf7e', shade: '#eea75f', muzzle: '#ffe8cd', mane: '#f6dd8a', mane2: '#e9c45f', eye: '#4fbf8f', cutie: 'applejack' }
  };

  /* ── tiny helper art ───────────────────────────────────── */

  KY.heartSVG = function (fill) {
    return '<svg viewBox="0 0 24 24"><path d="M12 21S3.4 14.9 3.4 8.9C3.4 5.6 5.9 3.4 8.8 3.4c1.7 0 3.2 1 3.2 1s1.5-1 3.2-1c2.9 0 5.4 2.2 5.4 5.5C20.6 14.9 12 21 12 21z" fill="' + (fill || '#ff8fb8') + '"/></svg>';
  };

  KY.starSVG = function (fill) {
    return '<svg viewBox="0 0 24 24"><path d="M12 1.6l2.7 6.6 7.1.5-5.5 4.6 1.8 6.9L12 16.4 5.9 20.2l1.8-6.9-5.5-4.6 7.1-.5z" fill="' + (fill || '#ffd94a') + '" stroke="#f0b429" stroke-width="1.3" stroke-linejoin="round"/></svg>';
  };

  KY.cloudSVG = function (o) {
    o = o || {};
    return '<svg viewBox="0 0 120 70" style="width:' + (o.w || 120) + 'px">' +
      '<g fill="' + (o.fill || '#ffffff') + '" opacity="' + (o.o == null ? 1 : o.o) + '">' +
      '<ellipse cx="34" cy="42" rx="22" ry="16"/><ellipse cx="60" cy="30" rx="24" ry="19"/><ellipse cx="86" cy="42" rx="21" ry="15"/>' +
      '<rect x="14" y="42" width="92" height="16" rx="8"/></g></svg>';
  };

  KY.butterflySVG = function (c1, c2) {
    return '<svg viewBox="0 0 40 34" class="bfly-svg">' +
      '<g class="bfly-wings">' +
      '<path d="M20 17C14 4 2 3 3 12c1 8 12 9 17 5z" fill="' + c1 + '"/>' +
      '<path d="M20 17C26 4 38 3 37 12c-1 8-12 9-17 5z" fill="' + c1 + '"/>' +
      '<path d="M20 17c-5 6-13 7-13 0 0-5 7-6 13 0z" fill="' + c2 + '" opacity=".85"/>' +
      '<path d="M20 17c5 6 13 7 13 0 0-5-7-6-13 0z" fill="' + c2 + '" opacity=".85"/></g>' +
      '<ellipse cx="20" cy="17" rx="2" ry="8" fill="#6b4a7a"/>' +
      '<path d="M20 9 17 3M20 9l3-6" stroke="#6b4a7a" stroke-width="1.2" stroke-linecap="round"/></svg>';
  };

  KY.flowerSVG = function (c) {
    return '<svg viewBox="0 0 60 92" class="flower-svg">' +
      '<path class="stem" d="M30 44V88" stroke="#5fae72" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<path class="leaf" d="M30 62C20 58 14 64 16 72c8 2 13-4 14-10z" fill="#7ec98d"/>' +
      '<g class="petals">' +
      '<ellipse cx="30" cy="24" rx="8" ry="11" fill="' + c + '"/>' +
      '<ellipse cx="16" cy="32" rx="11" ry="8" fill="' + c + '"/>' +
      '<ellipse cx="44" cy="32" rx="11" ry="8" fill="' + c + '"/>' +
      '<ellipse cx="21" cy="46" rx="8" ry="10" fill="' + c + '" opacity=".9"/>' +
      '<ellipse cx="39" cy="46" rx="8" ry="10" fill="' + c + '" opacity=".9"/></g>' +
      '<circle class="face" cx="30" cy="35" r="8" fill="#ffe98a"/>' +
      '<circle cx="27" cy="33" r="1.4" fill="#a1724a"/><circle cx="33" cy="33" r="1.4" fill="#a1724a"/>' +
      '<path d="M27 38q3 3 6 0" stroke="#a1724a" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>';
  };

  KY.balloonSVG = function (c) {
    return '<svg viewBox="0 0 70 120" class="balloon-svg">' +
      '<path d="M35 60q-4 20 4 34" stroke="#d9a7c6" stroke-width="2" fill="none"/>' +
      '<ellipse cx="35" cy="36" rx="24" ry="28" fill="' + c + '"/>' +
      '<ellipse cx="27" cy="27" rx="6" ry="9" fill="#fff" opacity=".45"/>' +
      '<path d="M35 64l-4 6h8z" fill="' + c + '"/></svg>';
  };

  KY.bunnySVG = function () {
    return '<svg viewBox="0 0 70 80" class="bunny-svg">' +
      '<ellipse cx="35" cy="58" rx="20" ry="18" fill="#fdfbff"/>' +
      '<circle cx="35" cy="38" r="14" fill="#fdfbff"/>' +
      '<path d="M26 26q-4-18 3-18 6 0 4 18zM44 26q4-18-3-18-6 0-4 18z" fill="#fdfbff"/>' +
      '<path d="M28 24q-2-11 2-11 4 0 3 11zM42 24q2-11-2-11-4 0-3 11z" fill="#f7a8c9"/>' +
      '<circle cx="30" cy="38" r="2" fill="#5b4a5e"/><circle cx="40" cy="38" r="2" fill="#5b4a5e"/>' +
      '<path d="M33 43q2 2 4 0" stroke="#d9a7c6" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
      '<circle cx="24" cy="42" r="2.6" fill="#ffb7d5" opacity=".7"/><circle cx="46" cy="42" r="2.6" fill="#ffb7d5" opacity=".7"/></svg>';
  };

  KY.birdSVG = function () {
    return '<svg viewBox="0 0 60 70" class="bird-svg">' +
      '<ellipse cx="30" cy="42" rx="15" ry="13" fill="#a8dcf0"/>' +
      '<circle cx="30" cy="27" r="10" fill="#a8dcf0"/>' +
      '<path d="M40 27l10 3-10 4z" fill="#ffb37e"/>' +
      '<circle cx="32" cy="25" r="2" fill="#5b4a5e"/>' +
      '<path d="M22 20q4-8 9-2" stroke="#7cc0e0" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<path class="bird-wing" d="M22 40q-12 4-8 16 10-4 12-12z" fill="#7cc0e0"/>' +
      '<path d="M28 54v8M34 54v8" stroke="#ffb37e" stroke-width="2" stroke-linecap="round"/></svg>';
  };

  KY.giftSVG = function () {
    return '<svg viewBox="0 0 100 100" class="gift-svg" aria-hidden="true">' +
      '<rect x="16" y="34" width="68" height="50" rx="8" fill="#a8dcf0" stroke="#5b8fb9" stroke-width="3"/>' +
      '<rect x="16" y="34" width="68" height="15" rx="6" fill="#f7a8c9"/>' +
      '<rect x="44" y="34" width="12" height="50" fill="#7cc0e0"/>' +
      '<path d="M50 34c-8 0-13-4-11-8 2-4 8-4 9-1 2-4 7-4 8 0 3-4 8-4 9 0 2 4-4 9-11 9z" fill="#ffd1e8" stroke="#c2418f" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<circle cx="30" cy="52" r="4" fill="#fff" opacity=".8"/></svg>';
  };

  /* ── the pony ─────────────────────────────────────────── */

  KY.pony = function (name, opts) {
    const o = opts || {};
    const base = CHARS[name] || CHARS.pinkie;
    const c = o.colors ? Object.assign({}, base, o.colors) : base;
    const face = o.face || 'happy';
    const gid = 'mg' + name + (o.uid ? '-' + o.uid : '');
    const cls = ['pony', 'pony-' + name].concat(o.cls ? [o.cls] : []).join(' ');

    const body = c.body, shade = c.shade, muzzle = c.muzzle, eye = c.eye;

    let maneDefs;
    if (Array.isArray(c.mane)) {
      let stops = '';
      c.mane.forEach(function (col, i) {
        stops += '<stop offset="' + Math.round((i / (c.mane.length - 1)) * 100) + '%" stop-color="' + col + '"/>';
      });
      maneDefs = '<linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1">' + stops + '</linearGradient>';
    } else {
      maneDefs = '<linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' + c.mane + '"/><stop offset="1" stop-color="' + c.mane2 + '"/></linearGradient>';
    }
    const Mane = 'url(#' + gid + ')';

    let tail;
    if (Array.isArray(c.mane)) {
      tail = c.mane.map(function (col, i) {
        return '<path d="M0 ' + i * 4 + ' C ' + (16 + i * 6) + ' ' + (2 + i * 3) + ' ' + (34 + i * 4) + ' ' + (-14 - i * 8) + ' ' + (32 - i * 3) + ' ' + (-46 - i * 4) +
          ' C ' + (18 - i * 2) + ' ' + (-26 - i * 3) + ' 10 ' + (-16 - i * 2) + ' 0 ' + i * 4 + ' Z" fill="' + col + '" opacity="' + (i % 2 ? .78 : 1) + '"/>';
      }).join('');
    } else {
      tail = '<path d="M0 0 C 42 -10 62 -40 54 -74 C 42 -46 28 -32 4 -22 Z" fill="' + Mane + '"/>' +
             '<path d="M4 -8 C 28 -16 42 -38 38 -58 C 30 -40 20 -28 6 -20 Z" fill="#ffffff" opacity=".18"/>';
    }

    const cutie = CUTIES[c.cutie] || '';

    const wings = c.wing
      ? '<g transform="translate(74,148)"><g class="p-wing wing-left">' +
          '<path d="M0 0 C -10 -22 -2 -42 16 -46 C 12 -30 14 -20 22 -12 C 14 -6 6 -4 0 0 Z" fill="' + body + '" stroke="' + shade + '" stroke-width="2"/>' +
          '<path d="M0 0 C -6 -16 -2 -30 12 -34" stroke="rgba(255,255,255,.5)" stroke-width="2.2" fill="none" stroke-linecap="round"/></g></g>' +
        '<g transform="translate(146,148)"><g class="p-wing wing-right">' +
          '<path d="M0 0 C 10 -22 2 -42 -16 -46 C -12 -30 -14 -20 -22 -12 C -14 -6 -6 -4 0 0 Z" fill="' + body + '" stroke="' + shade + '" stroke-width="2"/>' +
          '<path d="M0 0 C 6 -16 2 -30 -12 -34" stroke="rgba(255,255,255,.5)" stroke-width="2.2" fill="none" stroke-linecap="round"/></g></g>'
      : '';

    const horn = c.horn
      ? '<g class="p-horn">' +
          '<path d="M110 8 C 116 18 118 26 116 34 L104 34 C 102 26 104 18 110 8 Z" fill="' + body + '" stroke="' + shade + '" stroke-width="1.4"/>' +
          '<path d="M107 18l6 0M108.4 25l4.4 0" stroke="' + shade + '" stroke-width="1.6" stroke-linecap="round"/></g>'
      : '';

    const lash = c.lashes
      ? '<path d="M84 71 78 64M136 71l6-7" stroke="#4a2b52" stroke-width="2.2" stroke-linecap="round"/>'
      : '';

    const eyesOpen =
      '<g class="f f-happy"><g class="p-eyes">' +
        '<ellipse cx="94" cy="80" rx="10" ry="12.5" fill="#fff"/><ellipse cx="126" cy="80" rx="10" ry="12.5" fill="#fff"/>' +
        '<ellipse cx="94" cy="79" rx="8.4" ry="10.6" fill="' + eye + '"/><ellipse cx="126" cy="79" rx="8.4" ry="10.6" fill="' + eye + '"/>' +
        '<ellipse cx="94" cy="74" rx="4" ry="5.2" fill="#3a2a4d"/><ellipse cx="126" cy="74" rx="4" ry="5.2" fill="#3a2a4d"/>' +
        '<circle cx="90.5" cy="73.5" r="2.6" fill="#fff"/><circle cx="97" cy="83" r="1.4" fill="#fff" opacity=".85"/>' +
        '<circle cx="122.5" cy="73.5" r="2.6" fill="#fff"/><circle cx="129" cy="83" r="1.4" fill="#fff" opacity=".85"/>' +
        lash + '</g></g>';

    const eyesClosed =
      '<g class="f f-closed">' +
        '<path d="M85 80 Q94 70 103 80" stroke="#4a2b52" stroke-width="3.4" stroke-linecap="round" fill="none"/>' +
        '<path d="M117 80 Q126 70 135 80" stroke="#4a2b52" stroke-width="3.4" stroke-linecap="round" fill="none"/></g>';

    const eyesShy =
      '<g class="f f-shy">' +
        '<path d="M85 82 Q94 74 103 82" stroke="#4a2b52" stroke-width="3" stroke-linecap="round" fill="none"/>' +
        '<path d="M117 82 Q126 74 135 82" stroke="#4a2b52" stroke-width="3" stroke-linecap="round" fill="none"/></g>';

    const eyesWow =
      '<g class="f f-wow"><g class="p-eyes">' +
        '<ellipse cx="94" cy="78" rx="11" ry="13.5" fill="#fff"/><ellipse cx="126" cy="78" rx="11" ry="13.5" fill="#fff"/>' +
        '<ellipse cx="94" cy="77" rx="9" ry="11.4" fill="' + eye + '"/><ellipse cx="126" cy="77" rx="9" ry="11.4" fill="' + eye + '"/>' +
        '<ellipse cx="94" cy="73" rx="4.4" ry="5.6" fill="#3a2a4d"/><ellipse cx="126" cy="73" rx="4.4" ry="5.6" fill="#3a2a4d"/>' +
        '<circle cx="90" cy="71" r="2.8" fill="#fff"/><circle cx="122" cy="71" r="2.8" fill="#fff"/>' +
        '<circle cx="98" cy="82" r="1.5" fill="#fff"/><circle cx="130" cy="82" r="1.5" fill="#fff"/></g></g>';

    const eyesSilly =
      '<g class="f f-silly">' +
        '<path d="M85 79 Q94 70 103 79" stroke="#4a2b52" stroke-width="3.4" stroke-linecap="round" fill="none"/>' +
        '<ellipse cx="126" cy="80" rx="9.6" ry="12" fill="#fff"/>' +
        '<ellipse cx="127" cy="79" rx="8" ry="10" fill="' + eye + '"/>' +
        '<ellipse cx="127" cy="74" rx="3.8" ry="5" fill="#3a2a4d"/>' +
        '<circle cx="123.6" cy="73.6" r="2.4" fill="#fff"/></g>';

    const mouths =
      '<g class="f f-muzzle">' +
        '<ellipse cx="102" cy="101" rx="2.1" ry="2.7" fill="rgba(120,70,100,.35)"/>' +
        '<ellipse cx="118" cy="101" rx="2.1" ry="2.7" fill="rgba(120,70,100,.35)"/>' +
        '<path d="M101 111 Q110 119 119 111" stroke="#b4527f" stroke-width="2.8" stroke-linecap="round" fill="none"/></g>' +
      '<g class="f f-open">' +
        '<path d="M97 111 Q110 108 123 111 Q110 129 97 111 Z" fill="#8f3a5e"/>' +
        '<path d="M101 119 Q110 127 119 119 Q110 122 101 119 Z" fill="#f7a8c9"/>' +
        '<ellipse cx="102" cy="101" rx="2.1" ry="2.7" fill="rgba(120,70,100,.35)"/>' +
        '<ellipse cx="118" cy="101" rx="2.1" ry="2.7" fill="rgba(120,70,100,.35)"/></g>' +
      '<g class="f f-bigsmile">' +
        '<path d="M98 110 Q110 122 122 110" stroke="#b4527f" stroke-width="2.8" stroke-linecap="round" fill="none"/>' +
        '<ellipse cx="102" cy="101" rx="2.1" ry="2.7" fill="rgba(120,70,100,.35)"/>' +
        '<ellipse cx="118" cy="101" rx="2.1" ry="2.7" fill="rgba(120,70,100,.35)"/></g>' +
      '<g class="f f-tongue">' +
        '<ellipse cx="102" cy="101" rx="2.1" ry="2.7" fill="rgba(120,70,100,.35)"/>' +
        '<ellipse cx="118" cy="101" rx="2.1" ry="2.7" fill="rgba(120,70,100,.35)"/>' +
        '<path d="M102 112 Q110 120 118 112" stroke="#b4527f" stroke-width="2.6" stroke-linecap="round" fill="none"/>' +
        '<path d="M106 118 q5 8 9 1 q-2 7-5 6 q-4-1-4-7z" fill="#f76d9b"/></g>';

    const blush = '<g class="p-blush" fill="#ff8fb8" opacity=".5">' +
      '<ellipse cx="78" cy="100" rx="8.5" ry="4.6"/><ellipse cx="142" cy="100" rx="8.5" ry="4.6"/></g>';

    const frontLeg = function (legCls) {
      return '<g class="p-leg ' + legCls + '">' +
        '<rect x="-9" y="0" width="18" height="46" rx="9" fill="' + body + '"/>' +
        '<rect x="-9" y="32" width="18" height="14" rx="7" fill="' + shade + '"/></g>';
    };

    return '<svg class="' + cls + '" viewBox="0 0 220 245" data-face="' + face + '" role="img" aria-label="' + name + '" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' + maneDefs + '</defs>' +
      '<g class="p-body-wrap">' +
        '<g class="p-tail" transform="translate(150,158)">' + tail + '</g>' +
        '<ellipse cx="72" cy="210" rx="18" ry="10" fill="' + shade + '"/>' +
        '<ellipse cx="148" cy="210" rx="18" ry="10" fill="' + shade + '"/>' +
        '<ellipse class="p-body" cx="110" cy="174" rx="47" ry="44" fill="' + body + '"/>' +
        '<ellipse cx="110" cy="187" rx="34" ry="30" fill="' + shade + '" opacity=".35"/>' +
        '<g transform="translate(74,164) scale(-1,1)">' + cutie + '</g>' +
        '<g transform="translate(146,164)">' + cutie + '</g>' +
        wings +
        '<g transform="translate(92,190)">' + frontLeg('p-leg-left') + '</g>' +
        '<g transform="translate(128,190)">' + frontLeg(o.wave ? 'p-leg-wave' : 'p-leg-right') + '</g>' +
      '</g>' +
      '<g class="p-head">' +
        '<path class="p-neck" d="M90 104 C 102 116 118 116 130 104 L136 154 L84 154 Z" fill="' + body + '"/>' +
        '<g class="p-ears">' +
          '<path d="M76 54 C 72 32 78 22 90 30 C 96 36 98 46 98 52 Z" fill="' + body + '"/>' +
          '<path d="M80 50 C 78 36 82 30 89 35 C 93 39 94 45 94 49 Z" fill="' + shade + '" opacity=".7"/>' +
          '<path d="M144 54 C 148 32 142 22 130 30 C 124 36 122 46 122 52 Z" fill="' + body + '"/>' +
          '<path d="M140 50 C 142 36 138 30 131 35 C 127 39 126 45 126 49 Z" fill="' + shade + '" opacity=".7"/>' +
        '</g>' +
        horn +
        '<ellipse class="p-skull" cx="110" cy="84" rx="44" ry="40" fill="' + body + '"/>' +
        '<path class="p-bangs" d="M66 78 C 58 40 80 24 110 24 C 140 24 162 40 154 78 C 145 58 135 47 121 55 C 110 62 98 57 90 49 C 80 58 71 66 66 78 Z" fill="' + Mane + '"/>' +
        '<path class="p-bangs2" d="M110 32 C 98 26 86 30 80 40 C 90 33 100 35 110 41 C 120 35 130 33 140 40 C 134 30 122 26 110 32 Z" fill="' + Mane + '" opacity=".9"/>' +
        '<path class="p-lock lock-left" d="M66 84 C 55 100 53 126 61 144 C 68 124 70 102 80 92 Z" fill="' + Mane + '"/>' +
        '<path class="p-lock lock-right" d="M154 84 C 165 100 167 126 159 144 C 152 124 150 102 140 92 Z" fill="' + Mane + '"/>' +
        '<ellipse class="p-muzzle" cx="110" cy="103" rx="26" ry="17" fill="' + muzzle + '"/>' +
        eyesOpen + eyesClosed + eyesShy + eyesWow + eyesSilly +
        mouths + blush +
      '</g>' +
    '</svg>';
  };

  KY.mountPony = function (el, name, opts) {
    if (!el) return null;
    el.innerHTML = KY.pony(name, opts);
    return el.querySelector('svg');
  };

  KY.setFace = function (svg, face) {
    if (svg) svg.setAttribute('data-face', face);
  };
})();
