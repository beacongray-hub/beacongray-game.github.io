/* engine/pixel.js — 공용 픽셀아트 코어 (모든 아트 모듈이 이 API만 사용한다) */
"use strict";
const PX = (function () {
  /* ---------- 캔버스 ---------- */
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    return c;
  }
  function ctx2d(c) { const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return x; }

  /* ---------- 기본 도형 (모두 정수 좌표, 안티앨리어싱 없음) ---------- */
  function px(g, x, y, col) { if (!col) return; g.fillStyle = col; g.fillRect(x | 0, y | 0, 1, 1); }
  function rect(g, x, y, w, h, col) { if (!col) return; g.fillStyle = col; g.fillRect(x | 0, y | 0, w | 0, h | 0); }
  function frameRect(g, x, y, w, h, col) { rect(g, x, y, w, 1, col); rect(g, x, y + h - 1, w, 1, col); rect(g, x, y, 1, h, col); rect(g, x + w - 1, y, 1, h, col); }
  function hline(g, x, y, w, col) { rect(g, x, y, w, 1, col); }
  function vline(g, x, y, h, col) { rect(g, x, y, 1, h, col); }
  function line(g, x0, y0, x1, y1, col) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (; ;) {
      px(g, x0, y0, col);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  /* 픽셀 퍼펙트 채운 타원 */
  function ellipse(g, cx, cy, rx, ry, col) {
    if (rx <= 0 || ry <= 0) return;
    for (let y = -ry; y <= ry; y++) {
      const t = 1 - (y * y) / (ry * ry);
      if (t < 0) continue;
      const w = Math.floor(rx * Math.sqrt(t));
      rect(g, cx - w, cy + y, w * 2 + 1, 1, col);
    }
  }
  function circle(g, cx, cy, r, col) { ellipse(g, cx, cy, r, r, col); }
  function ellipseOutline(g, cx, cy, rx, ry, col) {
    let prev = -1;
    for (let y = -ry; y <= ry; y++) {
      const t = 1 - (y * y) / (ry * ry);
      const w = t < 0 ? -1 : Math.floor(rx * Math.sqrt(t));
      if (w < 0) { prev = w; continue; }
      if (prev < 0 || y === ry) rect(g, cx - w, cy + y, w * 2 + 1, 1, col);
      else { px(g, cx - w, cy + y, col); px(g, cx + w, cy + y, col); for (let k = w + 1; k <= prev; k++) { px(g, cx - k, cy + y, col); px(g, cx + k, cy + y, col); } }
      prev = w;
    }
  }
  /* 볼록 다각형 스캔라인 채우기: pts = [[x,y],...] */
  function poly(g, pts, col) {
    let minY = 1e9, maxY = -1e9;
    for (const p of pts) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
      if (!xs.length) continue;
      xs.sort((m, n) => m - n);
      for (let i = 0; i + 1 < xs.length; i += 2) rect(g, Math.round(xs[i]), y, Math.max(1, Math.round(xs[i + 1]) - Math.round(xs[i])), 1, col);
    }
  }
  /* 사다리꼴(옷·지붕에 자주 쓴다) */
  function trapezoid(g, xTopL, xTopR, yTop, xBotL, xBotR, yBot, col) {
    poly(g, [[xTopL, yTop], [xTopR, yTop], [xBotR, yBot], [xBotL, yBot]], col);
  }

  /* ---------- 디더링 ---------- */
  /* level: 1=25%, 2=50%(체커), 3=75%. 16비트 그라데이션 표현에 사용 */
  function dither(g, x, y, w, h, col, level, phase) {
    if (!col) return;
    g.fillStyle = col; const p = phase || 0;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const ax = (x + i) | 0, ay = (y + j) | 0;
      const c = ((ax + p) & 1) ^ ((ay) & 1);
      let on;
      if (level === 2) on = c === 0;
      else if (level === 1) on = ((ax + p) % 2 === 0) && (ay % 2 === 0);
      else on = !(((ax + p) % 2 === 1) && (ay % 2 === 1));
      if (on) g.fillRect(ax, ay, 1, 1);
    }
  }
  /* 위→아래 3단 그라데이션(디더 경계 포함) */
  function vgrad(g, x, y, w, h, top, bot) {
    const steps = ramp2(top, bot, 4);
    const seg = h / 4;
    for (let i = 0; i < 4; i++) rect(g, x, y + Math.round(i * seg), w, Math.round((i + 1) * seg) - Math.round(i * seg), steps[i]);
    for (let i = 1; i < 4; i++) dither(g, x, y + Math.round(i * seg) - 1, w, 1, steps[i - 1], 2);
  }

  /* ---------- 색 유틸 ---------- */
  function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgb2hex(r, g, b) { const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'); return '#' + c(r) + c(g) + c(b); }
  /* amt: -100..100 (밝게/어둡게) */
  function shift(col, amt) { const [r, g, b] = hex2rgb(col); const f = amt / 100; return f >= 0 ? rgb2hex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f) : rgb2hex(r * (1 + f), g * (1 + f), b * (1 + f)); }
  function mix(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
  function ramp2(a, b, n) { const out = []; for (let i = 0; i < n; i++) out.push(mix(a, b, n === 1 ? 0 : i / (n - 1))); return out; }
  /* 베이스 색에서 4단 명암(어두움→밝음) 만들기: 픽셀아트 표준 셰이딩 */
  function shades(base) { return [shift(base, -45), shift(base, -22), base, shift(base, 24)]; }

  /* ---------- 결정적 노이즈 (타일 변형용, 항상 같은 좌표 → 같은 값) ---------- */
  function hash(x, y, s) {
    let h = (x | 0) * 374761393 + (y | 0) * 668265263 + ((s | 0) + 1) * 1442695040888963407;
    h = (h ^ (h >> 13)) * 1274126177;
    h = h ^ (h >> 16);
    return ((h >>> 0) % 100000) / 100000;
  }
  function pick(arr, x, y, s) { return arr[Math.floor(hash(x, y, s) * arr.length) % arr.length]; }

  /* ---------- 행문자열 DSL ----------
     def = { pal:{ 'a':'#fff', ... }, rows:[ "..aa..", ... ] }   '.' 또는 ' ' = 투명
     반환: 캔버스 */
  function fromRows(def) {
    const rows = def.rows, h = rows.length, w = Math.max(...rows.map(r => r.length));
    const c = canvas(w, h), g = ctx2d(c);
    for (let y = 0; y < h; y++) {
      const r = rows[y];
      for (let x = 0; x < r.length; x++) {
        const ch = r[x];
        if (ch === '.' || ch === ' ') continue;
        const col = def.pal[ch];
        if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
      }
    }
    return c;
  }
  function drawRows(g, def, ox, oy) {
    const rows = def.rows;
    for (let y = 0; y < rows.length; y++) {
      const r = rows[y];
      for (let x = 0; x < r.length; x++) {
        const ch = r[x];
        if (ch === '.' || ch === ' ') continue;
        const col = def.pal[ch];
        if (col) { g.fillStyle = col; g.fillRect((ox + x) | 0, (oy + y) | 0, 1, 1); }
      }
    }
  }

  /* ---------- 후처리 ---------- */
  /* 불투명 픽셀 바깥쪽에 1px 외곽선 추가 (캐릭터 가독성의 핵심) */
  function outline(cv, col, alphaMin) {
    const g = ctx2d(cv), w = cv.width, h = cv.height;
    const src = g.getImageData(0, 0, w, h), d = src.data;
    const out = g.createImageData(w, h), o = out.data;
    const [r, gg, b] = hex2rgb(col);
    const A = (alphaMin === undefined ? 40 : alphaMin);
    const on = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? false : d[(y * w + x) * 4 + 3] > A;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (on(x, y)) { o[i] = d[i]; o[i + 1] = d[i + 1]; o[i + 2] = d[i + 2]; o[i + 3] = d[i + 3]; }
      else if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) { o[i] = r; o[i + 1] = gg; o[i + 2] = b; o[i + 3] = 255; }
    }
    g.putImageData(out, 0, 0);
    return cv;
  }
  /* 그림자(바닥 타원) */
  function shadow(g, cx, cy, rx, ry, alpha) {
    g.save(); g.globalAlpha = alpha === undefined ? 0.34 : alpha;
    ellipse(g, cx, cy, rx, ry, '#000000');
    g.restore();
  }
  /* 캔버스 전체 색조 입히기(밤·동굴 연출) */
  function tint(g, x, y, w, h, col, alpha) { g.save(); g.globalAlpha = alpha; rect(g, x, y, w, h, col); g.restore(); }

  return {
    canvas, ctx2d, px, rect, frameRect, hline, vline, line, ellipse, circle, ellipseOutline,
    poly, trapezoid, dither, vgrad, shift, mix, ramp2, shades, hex2rgb, rgb2hex,
    hash, pick, fromRows, drawRows, outline, shadow, tint
  };
})();

/* ---------- 마스터 팔레트 (모든 모듈이 이 색만 쓴다 = 통일감의 근거) ---------- */
const PAL = {
  /* 어둠·외곽선 */
  ink0: '#0b0812', ink1: '#171223', ink2: '#241c34', ink3: '#372a4c', ink4: '#4d3c66',
  /* 피부 */
  sk0: '#5d3226', sk1: '#8d5136', sk2: '#bd7f52', sk3: '#dda87c', sk4: '#f3d2a8',
  /* 금·황동 */
  gd0: '#5c3d10', gd1: '#96681c', gd2: '#c99a32', gd3: '#eec358', gd4: '#ffe9a6',
  /* 붉은색 */
  rd0: '#3d1119', rd1: '#6e2325', rd2: '#a84334', rd3: '#cd6f47', rd4: '#e79c6c',
  /* 바다·청록 */
  se0: '#08202f', se1: '#0f3f56', se2: '#1a6480', se3: '#2f93a3', se4: '#6cc6c6', se5: '#b3e8e0',
  /* 풀·숲 */
  gr0: '#1b3322', gr1: '#2f562e', gr2: '#4a7f3c', gr3: '#75a94c', gr4: '#a8cd6e', gr5: '#d3e79a',
  /* 모래·흙 */
  sd0: '#5f4327', sd1: '#8d6939', sd2: '#b8905a', sd3: '#dcbb87', sd4: '#f3e0b4',
  /* 돌·대리석 */
  st0: '#26232c', st1: '#403c49', st2: '#635d6e', st3: '#8d8697', st4: '#b8b1bf', st5: '#e3dee6',
  /* 나무 */
  wd0: '#2e1b11', wd1: '#4c2f1b', wd2: '#74492a', wd3: '#9c6a3d', wd4: '#c2915c',
  /* 보라·마법 */
  pu0: '#20122d', pu1: '#3b2050', pu2: '#5d3577', pu3: '#8757a0', pu4: '#b48ac6',
  /* 상아·천 */
  iv0: '#8e8067', iv1: '#b6a888', iv2: '#d8ccab', iv3: '#f0e6cc', iv4: '#fff8e8',
  /* 불꽃 */
  fl0: '#7a2408', fl1: '#c25412', fl2: '#ef8f1e', fl3: '#ffc94a', fl4: '#fff3b0'
};
