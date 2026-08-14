/* engine/tiles.js — 지형 타일 렌더러 (18종)
   규격: SPEC.md 2장 / 4-1절.  PX, PAL 은 전역으로 이미 로드되어 있다고 가정한다.

   설계 요점
   - 모든 타일은 모듈 로드 시점에 16x16 오프스크린 시트로 미리 렌더해 캐시한다.
     draw() 는 g.drawImage 와 얇은 경계 오버레이만 수행한다(캔버스를 새로 만들지 않는다).
   - 바닥 지형에는 "타일 변에 정렬된 가로/세로 줄"을 절대 넣지 않는다.
     그런 선은 16px 격자를 그대로 드러낸다. 대신 불규칙 얼룩(mottle)으로 명암을 준다.
   - 벽(#)·바위(^)는 남쪽 이웃이 벽이 아닐 때 윗면 8px + 밝은 립 1px + 앞면 6px + 접지 그림자 1px.
*/
"use strict";
const TILES = (function () {

  const T = 16;
  const CHARS = '~_,."*:=oOw%#^fabs';
  const SOLID = '~_#^';

  /* v5 painted terrain atlas. Procedural tiles remain the fallback while this
     image is loading. The atlas is a strict 4x4 grid (128px source cells). */
  const HD_TERRAIN = typeof Image !== 'undefined' ? new Image() : null;
  if (HD_TERRAIN) { HD_TERRAIN.decoding = 'async'; HD_TERRAIN.src = 'assets/map-hd/terrain-atlas.png?v=1'; }
  const HD_ROWS = { grass: 0, sand: 1, water: 2, stone: 3 };
  function hdKind(ch) {
    if (isWater(ch)) return 'water';
    if (ch === ',' || ch === 'f' || isRoad(ch)) return 'sand';
    if (isWall(ch) || ch === 'o' || ch === 'O' || ch === 'w' || ch === '%') return 'stone';
    if (isGrass(ch)) return 'grass';
    return null;
  }
  function drawHD(g, ch, px, py, tx, ty, frame) {
    if (!HD_TERRAIN || !HD_TERRAIN.complete || !HD_TERRAIN.naturalWidth) return false;
    const kind = hdKind(ch); if (!kind) return false;
    const row = HD_ROWS[kind];
    /* Read adjacent 16px pieces from one 128px painting. A mirrored 14-tile
       period prevents a hard seam where the source edge would otherwise wrap. */
    /* Never sample the atlas dividers: touching the outer pixels created the
       long black L-shaped seams that crossed several map tiles. */
    const tri = function (n) { n = ((n % 12) + 12) % 12; return n > 6 ? 12 - n : n; };
    const col = kind === 'stone' ? 1 : 0;
    const sx = col * 128 + 4 + tri(tx) * 16;
    const sy = row * 128 + 4 + tri(ty) * 16;
    g.drawImage(HD_TERRAIN, sx, sy, 16, 16, px, py, T, T);
    return true;
  }

  /* ================================================================
     0. 공통 유틸
     ================================================================ */

  /* 결정적 난수 스트림 (PX.hash 기반). 같은 seed → 항상 같은 수열 */
  function rng(seed) {
    let i = 0;
    return function () { i++; return PX.hash(i * 7919, (seed + 1) * 131 + i * 37, seed); };
  }
  function ri(r, n) { return (r() * n) | 0; }                 /* 0..n-1 */

  function isWater(c) { return c === '~' || c === '_'; }
  function isWall(c) { return c === '#' || c === '^'; }
  function isGrass(c) { return c === '.' || c === '"' || c === '*'; }
  function isRoad(c) { return c === ':' || c === '='; }
  function solid(ch) { return SOLID.indexOf(ch) >= 0; }

  /* ---------------------------------------------------------------
     격자 반복을 없애는 핵심 장치 : 감싸기(wrap) 배치

     자연 지형의 무늬(얼룩·풀포기·균열·물결)를 타일 안에만 그리면, 그림이
     아래쪽/오른쪽에서 잘려 나가 특정 행·열의 피복률이 항상 낮아진다.
     40x24 로 깔면 그 차이가 16px 주기의 밝기 띠로 보인다.
     그래서 무늬는 반드시 이 헬퍼로 그려 넘친 부분을 반대편에 이어 붙인다.
       - 모든 행·열이 같은 확률로 무늬를 갖는다 → 16px 주기 띠가 사라진다
       - 같은 변형끼리 인접해도 무늬가 끊기지 않는다
     오프셋이 16의 배수(짝수)라 PX.dither 의 체커 위상도 보존된다.
     --------------------------------------------------------------- */
  function at(g, x, y, fn) {
    for (let dy = -16; dy <= 16; dy += 16) {
      for (let dx = -16; dx <= 16; dx += 16) {
        g.save(); g.translate(x + dx, y + dy); fn(g); g.restore();
      }
    }
  }
  /* 불규칙 얼룩 (명암 변화용). level 1·2 만 쓴다 — 전면 75% 디더는 '방충망'이 된다 */
  function mottle(g, r, col, n, wmin, wmax, level) {
    for (let i = 0; i < n; i++) {
      const w = wmin + ri(r, wmax - wmin + 1);
      const h = Math.max(2, (w >> 1) + ri(r, 3));
      const ph = i + w;
      at(g, ri(r, 16), ri(r, 16), function (q) { PX.dither(q, 0, 0, w, h, col, level, ph); });
    }
  }
  /* 1px 점 뿌리기 */
  function specks(g, r, n, col, col2) {
    for (let i = 0; i < n; i++) {
      const two = col2 && r() < 0.5;
      at(g, ri(r, 16), ri(r, 16), function (q) {
        PX.px(q, 0, 0, col);
        if (two) PX.px(q, 0, 1, col2);
      });
    }
  }
  /* 짧은 파선 (물결 자국·수레바퀴 자국·물결 마루) */
  function dash(g, r, w, col, level, phase) {
    at(g, ri(r, 16), ri(r, 16), function (q) { PX.dither(q, 0, 0, w, 1, col, level, phase); });
  }
  /* 풀 포기 (2x3) */
  function tuft(g, r, dark, lite) {
    at(g, ri(r, 16), ri(r, 16), function (q) {
      PX.px(q, 0, 2, dark); PX.px(q, 1, 2, dark);
      PX.px(q, 0, 1, dark); PX.px(q, 1, 1, lite);
      PX.px(q, 1, 0, lite);
    });
  }
  /* 가늘게 갈라진 틈 (아래로 흐르는 1px 선). 경로를 먼저 만들고 감싸서 그린다 */
  function crack(g, r, len, col, col2) {
    const pts = [];
    let cx = 0, cy = 0;
    for (let k = 0; k < len; k++) {
      pts.push([cx, cy, (col2 && k % 4 === 1)]);
      cy++;
      if (r() < 0.35) cx += (r() < 0.5 ? 1 : -1);
    }
    at(g, ri(r, 16), ri(r, 16), function (q) {
      for (let k = 0; k < pts.length; k++) {
        PX.px(q, pts[k][0], pts[k][1], col);
        if (pts[k][2]) PX.px(q, pts[k][0] + 1, pts[k][1], col2);
      }
    });
  }

  /* ================================================================
     1. 시트 캐시 : ch -> { cv, V(변형수), F(프레임/형태수) }
     ================================================================ */
  const SHEET = {};
  function build(ch, V, F, painter) {
    const cv = PX.canvas(T * V, T * F);
    const g = PX.ctx2d(cv);
    for (let f = 0; f < F; f++) {
      for (let v = 0; v < V; v++) {
        g.save();
        g.beginPath(); g.rect(v * T, f * T, T, T); g.clip();
        g.translate(v * T, f * T);
        painter(g, v, f);
        g.restore();
      }
    }
    SHEET[ch] = { cv: cv, V: V, F: F };
  }

  /* ================================================================
     2. 지형별 페인터
     ================================================================ */

  /* ---- '.' 풀밭 : 가장 흔한 바닥. 절대 튀지 않게 ------------------ */
  function pGrass(g, v) {
    const r = rng(101 + v);
    /* 가장 넓게 깔리는 바닥이므로 내부 대비를 최대한 낮춘다(1단 이내).
       어두운 얼룩은 gr1 이 아니라 gr2 를 살짝 죽인 색 → 체커 얼룩이 눈에 띄지 않는다 */
    PX.rect(g, 0, 0, T, T, PAL.gr2);
    mottle(g, r, PX.shift(PAL.gr2, -13), 2, 5, 9, 2);
    mottle(g, r, PAL.gr3, 2, 4, 7, 1);         /* 볕 든 자리 (선이 아니라 얼룩) */
    mottle(g, r, PAL.gr1, 1, 3, 5, 1);
    const n = 2 + ri(r, 2);
    for (let i = 0; i < n; i++) tuft(g, r, PAL.gr1, PAL.gr3);
    if (r() < 0.45) at(g, ri(r, 16), ri(r, 16), function (q) { PX.px(q, 0, 0, PAL.gr4); PX.px(q, 1, 1, PAL.gr3); });
    if (r() < 0.22) at(g, ri(r, 16), ri(r, 16), function (q) {   /* 드물게 작은 돌 */
      PX.px(q, 0, 0, PAL.st2); PX.px(q, 1, 0, PAL.gr0);
    });
  }

  /* ---- '"' 무성한 풀 --------------------------------------------- */
  function pLush(g, v) {
    const r = rng(211 + v);
    PX.rect(g, 0, 0, T, T, PAL.gr2);
    mottle(g, r, PAL.gr1, 4, 5, 9, 2);
    mottle(g, r, PAL.gr3, 2, 4, 6, 1);
    const n = 10 + ri(r, 4);
    for (let i = 0; i < n; i++) {
      const h = 2 + ri(r, 2), tip = (r() < 0.3) ? PAL.gr4 : PAL.gr3, side = r() < 0.45;
      at(g, ri(r, 16), ri(r, 16), function (q) {
        PX.px(q, 0, 0, tip);
        for (let k = 1; k <= h; k++) PX.px(q, 0, k, (k === h) ? PAL.gr0 : PAL.gr1);
        if (side) { PX.px(q, 1, 1, PAL.gr3); PX.px(q, 1, 2, PAL.gr1); }
      });
    }
  }

  /* ---- '*' 꽃밭 (로토파고스 : 나른하고 몽롱하게) ------------------ */
  /* 흰색·분홍 위주 2~3종. 노랑은 드물게. 알록달록한 사탕색은 피한다 */
  const FLOWER = [PAL.iv3, PX.shift(PAL.rd3, 34), PAL.iv4];
  function pFlower(g, v) {
    const r = rng(307 + v);
    PX.rect(g, 0, 0, T, T, PAL.gr2);
    mottle(g, r, PX.shift(PAL.gr2, -13), 2, 5, 9, 2);
    mottle(g, r, PAL.gr3, 2, 4, 7, 1);
    for (let i = 0; i < 3; i++) tuft(g, r, PAL.gr1, PAL.gr3);
    const n = 4 + ri(r, 3);
    for (let i = 0; i < n; i++) {
      const c = (r() < 0.12) ? PAL.gd3 : FLOWER[ri(r, FLOWER.length)];
      const d = PX.shift(c, -26), square = r() < 0.5;
      at(g, ri(r, 16), ri(r, 16), function (q) {
        PX.px(q, 0, 2, PAL.gr1);                /* 줄기 */
        if (square) {                           /* 2x2 꽃송이 */
          PX.px(q, 0, 0, c); PX.px(q, 1, 0, c);
          PX.px(q, 0, 1, d); PX.px(q, 1, 1, d);
        } else {                                /* 십자 꽃송이 */
          PX.px(q, 0, 0, c);
          PX.px(q, -1, 0, d); PX.px(q, 1, 0, d); PX.px(q, 0, -1, d);
        }
      });
    }
  }

  /* ---- ',' 젖은 모래·해변 ---------------------------------------- */
  function pBeach(g, v) {
    const r = rng(401 + v);
    PX.rect(g, 0, 0, T, T, PAL.sd2);
    mottle(g, r, PAL.sd3, 3, 5, 9, 1);
    mottle(g, r, PAL.sd1, 3, 4, 8, 1);
    for (let i = 0; i < 3; i++) {               /* 물결 자국 : 짧은 파선 */
      const w = 4 + ri(r, 5), hi = r() < 0.5;
      at(g, ri(r, 16), ri(r, 16), function (q) {
        PX.dither(q, 0, 0, w, 1, PAL.sd1, 2, i + v);
        if (hi) PX.dither(q, 1, -1, w - 2, 1, PAL.sd4, 2, i);
      });
    }
    specks(g, r, 5, PAL.sd1, PAL.sd4);
    if (r() < 0.5) at(g, ri(r, 16), ri(r, 16), function (q) {   /* 조약돌 */
      PX.px(q, 0, 0, PAL.sd4); PX.px(q, 1, 0, PAL.sd3); PX.px(q, 0, 1, PAL.sd1);
    });
  }

  /* ---- ':' 흙길 --------------------------------------------------- */
  function pDirt(g, v) {
    const r = rng(503 + v);
    PX.rect(g, 0, 0, T, T, PAL.sd1);
    mottle(g, r, PAL.sd2, 3, 5, 9, 2);
    mottle(g, r, PAL.sd0, 3, 4, 8, 1);
    mottle(g, r, PAL.sd3, 2, 3, 6, 1);
    for (let i = 0; i < 2; i++) dash(g, r, 5 + ri(r, 6), PAL.sd0, 2, i + v);  /* 수레바퀴 자국 */
    for (let i = 0; i < 5; i++) {               /* 자갈 */
      at(g, ri(r, 16), ri(r, 16), function (q) { PX.px(q, 0, 0, PAL.sd3); PX.px(q, 0, 1, PAL.sd0); });
    }
    if (r() < 0.4) at(g, ri(r, 16), ri(r, 16), function (q) {   /* 박힌 돌 */
      PX.px(q, 0, 0, PAL.st3); PX.px(q, 1, 0, PAL.st2);
      PX.px(q, 0, 1, PAL.st1); PX.px(q, 1, 1, PAL.st1);
    });
    if (r() < 0.3) tuft(g, r, PAL.gr1, PAL.gr2);
  }

  /* ---- '=' 돌 포장길 : 8x8 판석 2x2 ------------------------------- */
  function pFlag(g, v) {
    const r = rng(601 + v);
    PX.rect(g, 0, 0, T, T, PAL.st1);                       /* 이음새 */
    const tones = [PAL.st2, PX.shift(PAL.st2, 9), PX.shift(PAL.st2, -9), PAL.st3];
    for (let sy = 0; sy < 2; sy++) {
      for (let sx = 0; sx < 2; sx++) {
        const x = sx * 8, y = sy * 8;
        const col = tones[ri(r, tones.length)];
        PX.rect(g, x, y, 7, 7, col);
        PX.hline(g, x, y, 7, PX.shift(col, 12));            /* 위 모서리 */
        PX.vline(g, x, y, 7, PX.shift(col, 9));             /* 왼쪽 모서리 */
        PX.px(g, x, y, PAL.st4); PX.px(g, x + 1, y, PAL.st4);
        PX.hline(g, x, y + 6, 7, PX.shift(col, -15));       /* 아래 그늘 */
        PX.vline(g, x + 6, y, 7, PX.shift(col, -11));
        PX.dither(g, x + 1, y + 1, 5, 5, PX.shift(col, -7), 1, sx + sy);
        if (r() < 0.65) {                                   /* 균열 1~2px */
          const cx = x + 1 + ri(r, 4), cy = y + 1 + ri(r, 4);
          PX.px(g, cx, cy, PAL.st1); PX.px(g, cx + 1, cy + 1, PAL.st1);
          if (r() < 0.5) PX.px(g, cx + 1, cy + 2, PAL.st1);
        }
        if (r() < 0.5) PX.px(g, x + 2 + ri(r, 3), y + 2 + ri(r, 3), PAL.st4);
      }
    }
  }

  /* ---- 'o' 대리석 : 32x32 주기 판 구획선 -------------------------- */
  function pMarble(g, v) {
    const quad = v & 3, gv = v >> 2;
    const r = rng(701 + v);
    PX.rect(g, 0, 0, T, T, PAL.st4);
    mottle(g, r, PAL.st5, 3, 5, 9, 1);
    mottle(g, r, PAL.st3, 2, 4, 7, 1);
    for (let i = 0; i < 3; i++) {                           /* 결 : 사선 1px */
      const x0 = ri(r, 16), y0 = ri(r, 14), len = 4 + ri(r, 7);
      const col = (r() < 0.5) ? PAL.st5 : PAL.st3;
      const dir = (r() < 0.5) ? 1 : -1;
      for (let k = 0; k < len; k++) PX.px(g, x0 + k * dir, y0 + k, col);
    }
    const qx = quad & 1, qy = (quad >> 1) & 1;              /* 큰 판 구획 */
    if (qx === 0) { PX.vline(g, 0, 0, T, PAL.st3); PX.vline(g, 1, 0, T, PAL.st5); }
    else PX.vline(g, 15, 0, T, PX.shift(PAL.st4, -8));
    if (qy === 0) { PX.hline(g, 0, 0, T, PAL.st3); PX.hline(g, 0, 1, T, PAL.st5); }
    else PX.hline(g, 0, 15, T, PX.shift(PAL.st4, -8));
  }

  /* ---- 'O' 모자이크 : 32x32 그리스 파도 문양 패널을 4등분 ---------- */
  let MOSAIC = null;
  function buildMosaic() {
    const cv = PX.canvas(32, 32), g = PX.ctx2d(cv);
    function put(x, y, col) { if (x >= 0 && y >= 0 && x < 32 && y < 32) PX.px(g, x, y, col); }

    PX.rect(g, 0, 0, 32, 32, PAL.iv3);
    for (let i = 0; i < 32; i += 4) {                       /* 테세라 줄눈 */
      PX.hline(g, 0, i, 32, PAL.iv2); PX.vline(g, i, 0, 32, PAL.iv2);
    }
    PX.frameRect(g, 0, 0, 32, 32, PAL.gd1);                 /* 패널 테두리 */

    /* 파도(뇌문) 띠 : 깊이 1..4, 주기 8 */
    const WY = [1, 2, 3, 4, 4, 3, 2, 1];
    function bandCol(d, wy) { return (d < wy) ? PAL.iv2 : (d === wy ? PAL.gd2 : PAL.rd1); }
    for (let u = 0; u < 32; u++) {                          /* 위 / 아래 (점대칭) */
      const wy = WY[u & 7];
      for (let d = 1; d <= 4; d++) {
        const c = bandCol(d, wy);
        put(u, d, c); put(31 - u, 31 - d, c);
      }
    }
    for (let u = 5; u <= 26; u++) {                         /* 좌 / 우 (모서리는 비움) */
      const wy = WY[u & 7];
      for (let d = 1; d <= 4; d++) {
        const c = bandCol(d, wy);
        put(d, 31 - u, c); put(31 - d, u, c);
      }
    }
    for (let i = 5; i < 27; i++) {                          /* 띠 안쪽 경계선 */
      put(i, 5, PAL.gd1); put(i, 26, PAL.gd1);
      put(5, i, PAL.gd1); put(26, i, PAL.gd1);
    }
    /* 중앙 로제트 : 타일 2x2 경계를 가로지른다 */
    for (let dy = -5; dy <= 5; dy++) {
      const w = 5 - Math.abs(dy);
      for (let dx = -w; dx <= w; dx++) {
        const m = Math.abs(dx) + Math.abs(dy);
        let c = PAL.gd1;
        if (m <= 1) c = PAL.rd1;
        else if (m === 3) c = PAL.gd2;
        else if (m === 5) c = PAL.gd2;
        else c = PAL.iv2;
        put(16 + dx, 16 + dy, c);
      }
    }
    put(15, 15, PAL.gd3); put(16, 15, PAL.gd3);
    /* 네 귀퉁이 작은 점 */
    const CN = [[11, 11], [21, 11], [11, 21], [21, 21]];
    for (let i = 0; i < CN.length; i++) {
      const cx = CN[i][0], cy = CN[i][1];
      put(cx, cy, PAL.gd2); put(cx - 1, cy, PAL.rd1); put(cx + 1, cy, PAL.rd1);
      put(cx, cy - 1, PAL.rd1); put(cx, cy + 1, PAL.rd1);
    }
    MOSAIC = cv;
  }
  function pMosaic(g, v) {
    g.drawImage(MOSAIC, (v & 1) * 16, ((v >> 1) & 1) * 16, 16, 16, 0, 0, 16, 16);
  }

  /* ---- 'w' 나무 갑판 ---------------------------------------------- */
  function pDeck(g, v) {
    const r = rng(809 + v);
    PX.rect(g, 0, 0, T, T, PAL.wd2);
    const dk = PX.shift(PAL.wd2, -14);
    for (let p = 0; p < 4; p++) {                           /* 4px 판자 4장 (세로로 이어짐) */
      const y = p * 4;
      PX.hline(g, 0, y, T, PAL.wd3);                        /* 판자 윗 모서리 */
      PX.hline(g, 0, y + 3, T, PAL.wd1);                    /* 이음새 */
      const n = 1 + ri(r, 2);
      for (let i = 0; i < n; i++) PX.hline(g, ri(r, 12), y + 1 + ri(r, 2), 3 + ri(r, 5), dk);
      if (r() < 0.45) { const x = 1 + ri(r, 13); PX.px(g, x, y + 1, PAL.wd4); PX.px(g, x, y + 2, PAL.wd0); }
    }
    const bx = 3 + ri(r, 10), bp = ri(r, 4);                /* 버트 조인트 */
    PX.vline(g, bx, bp * 4, 4, PAL.wd1);
    PX.vline(g, bx + 1, bp * 4, 4, PAL.wd3);
  }

  /* ---- '%' 동굴 바닥 ---------------------------------------------- */
  function pCaveFloor(g, v) {
    const r = rng(907 + v);
    PX.rect(g, 0, 0, T, T, PAL.st1);
    mottle(g, r, PAL.st0, 3, 5, 9, 2);
    mottle(g, r, PAL.st2, 3, 4, 8, 1);
    for (let i = 0; i < 2; i++) {                           /* 균열 (계단 모양) */
      const len = 3 + ri(r, 5), step = [];
      let sx = 0, sy = 0;
      for (let k = 0; k < len; k++) { step.push([sx, sy]); if (r() < 0.5) sx++; else sy++; }
      at(g, ri(r, 16), ri(r, 16), function (q) {
        for (let k = 0; k < step.length; k++) PX.px(q, step[k][0], step[k][1], PAL.st0);
      });
    }
    for (let i = 0; i < 4; i++) {                           /* 자갈 */
      const lit = r() < 0.35;
      at(g, ri(r, 16), ri(r, 16), function (q) {
        PX.px(q, 0, 0, lit ? PAL.st3 : PAL.st2); PX.px(q, 1, 0, PAL.st2); PX.px(q, 0, 1, PAL.st0);
      });
    }
  }

  /* ---- '#' 석벽·동굴벽 (f=0 앞면 있음 / f=1 윗면만) ---------------- */
  function pWall(g, v, f) {
    const r = rng(1009 + v * 5 + f);
    const topH = (f === 0) ? 8 : 16;
    /* 윗면 : 밝게 */
    PX.rect(g, 0, 0, T, topH, PAL.st2);
    PX.dither(g, 0, 0, T, topH, PAL.st3, 1, v + 2);
    mottle(g, r, PAL.st1, 2, 4, 7, 1);
    /* 블록 줄눈 (벽이므로 가로 켜는 의도적으로 유지) */
    const rows = (f === 0) ? [4] : [5, 11];
    for (let i = 0; i < rows.length; i++) {
      const yy = rows[i];
      PX.hline(g, 0, yy - 1, T, PX.shift(PAL.st2, 13));
      PX.hline(g, 0, yy, T, PAL.st1);
      const vx = (i % 2 === 0) ? 4 + ri(r, 4) : 9 + ri(r, 4);
      PX.vline(g, vx, yy + 1, Math.min(6, topH - yy - 1), PAL.st1);
    }
    PX.vline(g, 6 + ri(r, 5), 0, rows[0], PAL.st1);
    for (let i = 0; i < 4; i++) {                           /* 잔 요철 */
      const x = ri(r, 15), y = ri(r, topH - 1);
      PX.px(g, x, y, PAL.st3); PX.px(g, x, y + 1, PAL.st1);
    }
    if (f === 0) {
      PX.hline(g, 0, 8, T, PAL.st4);                        /* 벽 윗 모서리 립 */
      PX.rect(g, 0, 9, T, 6, PAL.st1);                      /* 앞면 6px : 어둡게 */
      PX.dither(g, 0, 9, T, 2, PAL.st2, 1, v);
      PX.dither(g, 0, 12, T, 3, PAL.st0, 1, v + 1);
      PX.hline(g, 0, 11, T, PAL.st0);                       /* 앞면 벽돌 줄눈 */
      PX.vline(g, 3 + ri(r, 4), 9, 2, PAL.st0);
      PX.vline(g, 9 + ri(r, 5), 12, 3, PAL.st0);
      PX.px(g, 1, 10, PX.shift(PAL.st1, 15));
      PX.px(g, 8 + ri(r, 4), 13, PX.shift(PAL.st1, 12));
      PX.hline(g, 0, 15, T, PAL.ink1);                      /* 접지 그림자 1px */
    }
  }

  /* ---- '^' 바위·절벽 ---------------------------------------------- */
  function pRock(g, v, f) {
    const r = rng(1103 + v * 5 + f);
    const topH = (f === 0) ? 8 : 16;
    PX.rect(g, 0, 0, T, topH, PX.shift(PAL.st2, -8));
    PX.dither(g, 0, 0, T, topH, PAL.st1, 2, v);
    /* 각진 면 : 큰 덩어리 얼룩 + 짧은 능선 (긴 사선 빗금 금지) */
    for (let i = 0; i < 3; i++) {
      const x = ri(r, 13), y = ri(r, Math.max(1, topH - 3));
      const w = 5 + ri(r, 5), h = 4 + ri(r, 3);
      PX.dither(g, x, y, w, h, (i % 2) ? PAL.st0 : PAL.st3, 2, i + v);
      const len = 2 + ri(r, 2), dir = (r() < 0.5) ? 1 : -1;
      for (let k = 0; k < len; k++) { PX.px(g, x + k * dir, y + k, PAL.st0); PX.px(g, x + k * dir, y + k - 1, PAL.st3); }
    }
    mottle(g, r, PAL.sd0, 2, 4, 7, 1);                      /* 흙 얼룩 (따뜻한 기운) */
    if (r() < 0.45) mottle(g, r, PAL.gr1, 1, 3, 5, 1);      /* 이끼 */
    specks(g, r, 3, PAL.st4, PAL.st0);
    if (f === 0) {
      PX.hline(g, 0, 8, T, PAL.st4);
      PX.rect(g, 0, 9, T, 6, PAL.st1);
      PX.dither(g, 0, 9, T, 2, PAL.st2, 1, v);
      PX.dither(g, 0, 12, T, 3, PAL.st0, 1, v + 2);
      for (let i = 0; i < 4; i++) {                         /* 세로 결 */
        const x = ri(r, 16);
        PX.vline(g, x, 9, 3 + ri(r, 3), PAL.st0);
        PX.vline(g, x + 1, 9, 2, PX.shift(PAL.st1, 12));
      }
      PX.hline(g, 0, 15, T, PAL.ink1);
    }
  }

  /* ---- 'f' 숲 바닥 : 낙엽·뿌리 ------------------------------------ */
  const LEAF = [PAL.gd1, PAL.rd2, PAL.wd3, PAL.gr3];
  function pForest(g, v) {
    const r = rng(1201 + v);
    PX.rect(g, 0, 0, T, T, PAL.gr1);
    mottle(g, r, PAL.gr0, 3, 5, 9, 2);
    mottle(g, r, PAL.wd1, 3, 4, 8, 1);
    mottle(g, r, PAL.gr2, 2, 4, 7, 1);
    if (r() < 0.55) {                                       /* 뿌리 : 옆으로 뻗는다 */
      const path = [];
      let px2 = 0, py2 = 0;
      for (let k = 0; k < 12; k++) { path.push([px2, py2]); px2++; if (r() < 0.3) py2 += (r() < 0.5 ? 1 : -1); }
      at(g, ri(r, 16), ri(r, 16), function (q) {
        for (let k = 0; k < path.length; k++) {
          PX.px(q, path[k][0], path[k][1], PAL.wd1);
          PX.px(q, path[k][0], path[k][1] + 1, PAL.wd0);
        }
      });
    }
    const n = 3 + ri(r, 3);                                 /* 낙엽 */
    for (let i = 0; i < n; i++) {
      const c = PX.shift(LEAF[ri(r, LEAF.length)], -14), d = PX.shift(c, -22);
      at(g, ri(r, 16), ri(r, 16), function (q) { PX.px(q, 0, 0, c); PX.px(q, 1, 0, d); });
    }
    if (r() < 0.5) tuft(g, r, PAL.gr0, PAL.gr2);
  }

  /* ---- 'a' 잿빛 땅 (저승) ----------------------------------------- */
  function pAsh(g, v) {
    const r = rng(1301 + v);
    PX.rect(g, 0, 0, T, T, PAL.st1);
    mottle(g, r, PAL.ink2, 4, 5, 9, 2);
    mottle(g, r, PAL.st2, 2, 4, 7, 1);
    mottle(g, r, PAL.ink3, 2, 3, 6, 1);
    crack(g, r, 5 + ri(r, 5), PAL.ink1, PAL.ink2);
    if (r() < 0.5) crack(g, r, 4 + ri(r, 4), PAL.ink1, null);
    specks(g, r, 5, PAL.st3, null);
  }

  /* ---- 'b' 뼈밭 (저승) -------------------------------------------- */
  function pBone(g, v) {
    const r = rng(1409 + v);
    /* 배경이므로 뼈와 바닥의 명암 폭을 억제한다(캐릭터가 묻히면 안 된다).
       어둡게 할 때 ink 계열을 넓게 쓰면 대비가 과해지므로 iv0 을 죽인 색을 주로 쓴다 */
    PX.rect(g, 0, 0, T, T, PAL.iv1);
    mottle(g, r, PAL.iv0, 3, 5, 9, 2);
    mottle(g, r, PX.shift(PAL.iv0, -18), 3, 4, 8, 1);
    mottle(g, r, PAL.ink2, 1, 4, 6, 1);
    const kind = v % 3;
    if (kind === 0) {                                       /* 두개골 조각 */
      at(g, ri(r, 16), ri(r, 16), function (q) {
        PX.rect(q, 0, 0, 6, 5, PAL.iv2);
        PX.hline(q, 1, -1, 4, PAL.iv3);
        PX.px(q, 0, 0, PAL.iv1); PX.px(q, 5, 0, PAL.iv1);
        PX.px(q, 1, 2, PAL.ink2); PX.px(q, 4, 2, PAL.ink2);
        PX.px(q, 3, 4, PAL.iv0);
        PX.hline(q, 1, 5, 4, PAL.iv1);
      });
    } else if (kind === 1) {                                /* 갈비뼈 */
      const spine = 8 + ri(r, 2), ws = [4 + ri(r, 4), 4 + ri(r, 4), 4 + ri(r, 4)];
      at(g, ri(r, 16), ri(r, 16), function (q) {
        PX.vline(q, 0, 0, spine, PAL.iv1);
        for (let i = 0; i < 3; i++) {
          const yy = 1 + i * 3, w = ws[i];
          PX.hline(q, 1, yy, w, PAL.iv2);
          PX.hline(q, 1, yy + 1, w - 1, PX.shift(PAL.iv0, -8));
        }
      });
    } else {                                                /* 긴 뼈 2개 */
      for (let i = 0; i < 2; i++) {
        at(g, ri(r, 16), ri(r, 16), function (q) {
          PX.hline(q, 1, 0, 5, PAL.iv2);
          PX.hline(q, 1, 1, 5, PAL.iv0);
          PX.px(q, 0, -1, PAL.iv2); PX.px(q, 0, 0, PAL.iv3); PX.px(q, 0, 1, PAL.iv1);
          PX.px(q, 6, -1, PAL.iv2); PX.px(q, 6, 0, PAL.iv3); PX.px(q, 6, 1, PAL.iv1);
        });
      }
    }
    for (let i = 0; i < 3; i++) {                           /* 자잘한 조각 */
      at(g, ri(r, 16), ri(r, 16), function (q) { PX.px(q, 0, 0, PAL.iv2); PX.px(q, 1, 0, PAL.iv1); });
    }
  }

  /* ---- 's' 그을린 땅 (트리나키아) --------------------------------- */
  function pScorch(g, v) {
    const r = rng(1511 + v);
    PX.rect(g, 0, 0, T, T, PAL.sd1);
    mottle(g, r, PAL.sd2, 3, 5, 9, 1);
    mottle(g, r, PAL.sd0, 4, 5, 10, 2);                     /* 그을음 */
    /* 그을음·숯은 반드시 '따뜻한' 어두운 색(wd0)으로. ink 계열(푸른 보라)을 쓰면
       갈색 바탕 위에서 파란 점처럼 튄다 */
    mottle(g, r, PAL.wd0, 2, 4, 8, 1);
    /* 갈라진 틈 : 얇고 드물게. 붉은색이 화면을 지배하면 안 된다 */
    crack(g, r, 5 + ri(r, 5), PX.shift(PAL.rd1, -18), null);
    if (r() < 0.4) crack(g, r, 3 + ri(r, 4), PAL.rd1, null);
    specks(g, r, 5, PAL.wd0, null);
    specks(g, r, 2, PAL.sd3, null);
    if (r() < 0.25) specks(g, r, 1, PAL.fl0, null);
  }

  /* ---- '~' 깊은 바다 (프레임 4 : 물결 이동 + 반짝임) --------------- */
  function pSea(g, v, f) {
    const r = rng(1601 + v);
    PX.rect(g, 0, 0, T, T, PAL.se1);
    mottle(g, r, PAL.se0, 3, 5, 11, 2);                     /* 깊은 자리 */
    mottle(g, r, PAL.se2, 2, 4, 9, 1);                      /* 얕은 자리 */
    /* 물결 마루 : 통짜 가로선을 쓰면 특정 행만 밝아져 16px 줄무늬가 생긴다.
       디더로 끊어 그리고, 프레임마다 아래로 4px 흐르게 한다 */
    const n = 2 + (v % 2);
    for (let i = 0; i < n; i++) {
      const bx = ri(r, 16), by = ri(r, 16), w = 4 + ri(r, 5);
      const tip = ((i + f) % 2) === 0;
      at(g, bx, (by + f * 4) & 15, function (q) {
        PX.dither(q, 0, 0, w, 1, PAL.se2, 3, f);
        PX.dither(q, 1, -1, w - 2, 1, PAL.se3, 2, f + 1);
        if (tip) PX.px(q, 2, -1, PAL.se4);
      });
    }
    if (((v * 3 + f) % 5) === 0) {                          /* 드문 반짝임 */
      at(g, ri(r, 16), ri(r, 16), function (q) { PX.px(q, 0, 0, PAL.se5); PX.px(q, 1, 0, PAL.se4); });
    }
  }

  /* ---- '_' 얕은 물·해안 (프레임 4 : 포말 밀려듦) ------------------- */
  function pShallow(g, v, f) {
    const r = rng(1709 + v);
    /* 바탕은 어디까지나 '물'. 깊은 바다(se1)보다 밝은 청록(se2)으로 읽혀야 한다.
       바닥이 비치는 모래는 타일 전체가 아니라 국소적인 덩어리에만 얹는다.
       (전면 75% 디더는 규칙적인 구멍이 남아 '방충망'처럼 보인다 → 금지) */
    PX.rect(g, 0, 0, T, T, PAL.se2);
    mottle(g, r, PAL.se1, 3, 5, 9, 2);                      /* 조금 깊은 자리 */
    mottle(g, r, PAL.se3, 3, 4, 8, 1);                      /* 얕아 밝은 자리 */
    /* 바닥이 비치는 부분. 청록 바탕에서 따뜻한 색은 보색 대비로 유난히 튀므로
       모래는 아주 좁게만 쓰고, 대부분은 해초(gr1)로 표현한다.
       (모래를 넓게 깔면 물 전체가 '녹슨 물'로 보인다) */
    mottle(g, r, PAL.gr1, 2, 4, 7, 1);                      /* 해초 그림자 */
    mottle(g, r, PX.shift(PAL.sd0, -30), 1, 4, 6, 1);       /* 모래톱 */
    mottle(g, r, PAL.se4, 1, 3, 5, 1);                      /* 모래톱 위 밝은 물 */
    for (let i = 0; i < 2; i++) {                           /* 밀려드는 포말 (끊어진 파선) */
      const bx = ri(r, 16), by = ri(r, 16), w = 5 + ri(r, 5);
      at(g, bx, (by + f * 4) & 15, function (q) {
        PX.dither(q, 0, 0, w, 1, PAL.se4, 3, f);
        PX.dither(q, 1, -1, w - 2, 1, PAL.se5, 1, f);
        PX.dither(q, 0, 1, w, 1, PAL.se3, 2, f + 1);
      });
    }
  }

  /* ================================================================
     3. 시트 생성 (모듈 로드 시 1회)
     ================================================================ */
  /* 변형 수는 "40x24 로 깔았을 때 16px 주기 줄무늬가 보이지 않는가"를 기준으로 정했다.
     특징이 강한 지형(뼈·물결·꽃)일수록 변형이 많아야 특징이 특정 행에 몰리지 않는다. */
  buildMosaic();
  build('.', 12, 1, pGrass);
  build('"', 12, 1, pLush);
  build('*', 12, 1, pFlower);
  build(',', 12, 1, pBeach);
  build(':', 12, 1, pDirt);
  build('=', 5, 1, pFlag);
  build('o', 8, 1, pMarble);
  build('O', 4, 1, pMosaic);      /* 2x2 타일 주기 문양이므로 변형 없음 */
  build('w', 5, 1, pDeck);
  build('%', 12, 1, pCaveFloor);
  build('#', 4, 2, pWall);
  build('^', 4, 2, pRock);
  build('f', 12, 1, pForest);
  build('a', 12, 1, pAsh);
  build('b', 12, 1, pBone);       /* 3종 실루엣 x 4 배치 */
  build('s', 12, 1, pScorch);
  build('~', 12, 4, pSea);
  build('_', 12, 4, pShallow);

  /* ================================================================
     4. 자동 이음(autotile) 오버레이 — 전부 로드 시점에 캐시
     ================================================================ */
  const OV = {};
  function mkOv(key, fn) { const c = PX.canvas(T, T); fn(PX.ctx2d(c)); OV[key] = c; }
  /* side: 0=N 1=E 2=S 3=W , u=변 방향 0..15 , d=변에서의 깊이 0.. */
  function em(side, u, d) {
    if (side === 0) return [u, d];
    if (side === 1) return [15 - d, u];
    if (side === 2) return [u, 15 - d];
    return [d, u];
  }

  /* 4-1. 물↔땅 : 젖은 모래 테두리 + 흰 포말 선 (물 타일 쪽에 덧그린다) */
  for (let side = 0; side < 4; side++) {
    for (let f = 0; f < 4; f++) {
      (function (side, f) {
        mkOv('sh' + side + f, function (g) {
          for (let u = 0; u < T; u++) {
            const wob = (PX.hash(u, side * 3, 7) < 0.45) ? 0 : 1;   /* 물가 요철 */
            let p = em(side, u, 0); PX.px(g, p[0], p[1], PAL.sd2);  /* 젖은 모래 */
            p = em(side, u, 1); PX.px(g, p[0], p[1], PAL.sd1);
            if (wob) { p = em(side, u, 2); PX.px(g, p[0], p[1], PX.shift(PAL.sd1, -12)); }
            const fd = 2 + wob;
            p = em(side, u, fd);                                     /* 흰 포말 */
            PX.px(g, p[0], p[1], (((u + f * 2) % 3) !== 2) ? PAL.iv4 : PAL.se5);
            if (((u + f) % 2) === 0) { p = em(side, u, fd + 1); PX.px(g, p[0], p[1], PAL.se4); }
            if (((u * 3 + f) % 5) === 0) { p = em(side, u, fd + 2); PX.px(g, p[0], p[1], PAL.se3); }
          }
        });
      })(side, f);
    }
  }

  /* 4-2. 물 대각 코너 (0=NW 1=NE 2=SE 3=SW) */
  function cm(c, i, j) {
    return [(c === 0 || c === 3) ? i : 15 - i, (c === 0 || c === 1) ? j : 15 - j];
  }
  for (let c = 0; c < 4; c++) {
    for (let f = 0; f < 4; f++) {
      (function (c, f) {
        mkOv('sc' + c + f, function (g) {
          for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
            const m = i + j, p = cm(c, i, j);
            if (m <= 1) PX.px(g, p[0], p[1], PAL.sd2);
            else if (m === 2) PX.px(g, p[0], p[1], PAL.sd1);
            else if (m === 3 && ((i + f) % 2 === 0)) PX.px(g, p[0], p[1], PAL.iv4);
          }
        });
      })(c, f);
    }
  }

  /* 4-3. 길↔풀 등 경계 뭉개기 : 변의 가장자리 픽셀을 이웃 색으로 섞는다 */
  const BLEND = [PAL.gr2, PAL.gr1, PAL.sd2, PAL.st2];
  for (let side = 0; side < 4; side++) {
    for (let ci = 0; ci < BLEND.length; ci++) {
      (function (side, ci) {
        mkOv('bl' + side + ci, function (g) {
          for (let u = 0; u < T; u++) {
            const h = PX.hash(u * 5 + ci, side * 13 + ci, 11);
            const depth = (h < 0.3) ? 0 : (h < 0.8 ? 1 : 2);
            for (let d = 0; d < depth; d++) {
              const p = em(side, u, d);
              PX.px(g, p[0], p[1], (d === 0) ? BLEND[ci] : PX.shift(BLEND[ci], -8));
            }
          }
        });
      })(side, ci);
    }
  }

  /* 4-4. 벽 좌/우 모서리 (광원 좌상 : 왼쪽 밝게, 오른쪽 어둡게) */
  mkOv('wL', function (g) { PX.dither(g, 0, 0, 1, 15, PAL.st4, 3, 0); });
  mkOv('wR', function (g) { PX.dither(g, 15, 0, 1, 15, PAL.st0, 2, 0); });

  /* 4-5. 벽 아래 바닥 : 앞면 그림자를 받아 상단 2px 어둡게 */
  mkOv('cs', function (g) {
    PX.dither(g, 0, 0, T, 1, PAL.ink1, 3, 0);
    PX.dither(g, 0, 1, T, 1, PAL.ink1, 1, 0);
  });

  /* ================================================================
     5. draw
     ================================================================ */
  const EMPTY = {};

  /* 내 타일(ch)의 변 가장자리에 섞어 넣을 BLEND 색 인덱스. 없으면 -1 */
  function blendIdx(ch, nch) {
    if (isRoad(ch) && isGrass(nch)) return 0;      /* 길 위에 풀색 */
    if (isRoad(ch) && nch === 'f') return 1;
    if (ch === ',' && isGrass(nch)) return 0;      /* 모래 위에 풀색 */
    if (isGrass(ch) && nch === ',') return 2;      /* 풀 위에 모래색 */
    if (isGrass(ch) && isRoad(nch)) return 3;      /* 풀 위에 옅은 돌색 */
    if (ch === 'f' && isGrass(nch)) return 0;
    return -1;
  }

  function draw(g, ch, px, py, tx, ty, frame, neigh) {
    const hdPainted = drawHD(g, ch, px, py, tx, ty, frame);
    const s = SHEET[ch] || SHEET['.'];
    const nb = neigh || EMPTY;
    const f4 = (frame | 0) & 3;
    const cn = nb.n || ch, ce = nb.e || ch, cs = nb.s || ch, cw = nb.w || ch;

    /* --- 변형 / 프레임(형태) 선택 --- */
    let v = 0, fr = 0;
    if (ch === 'O') {
      v = (tx & 1) | ((ty & 1) << 1);                       /* 2x2 타일 주기 */
    } else if (ch === 'o') {
      v = ((tx & 1) | ((ty & 1) << 1)) + ((PX.hash(tx, ty, 79) < 0.5) ? 0 : 4);
    } else if (ch === '#' || ch === '^') {
      v = (PX.hash(tx, ty, ch.charCodeAt(0)) * s.V) | 0;
      fr = isWall(cs) ? 1 : 0;                              /* 아래가 벽이 아니면 앞면 */
    } else {
      v = (PX.hash(tx, ty, ch.charCodeAt(0)) * s.V) | 0;
      if (s.F > 1) fr = f4;                                 /* ~, _ 만 애니메이션 */
    }
    if (v >= s.V) v = s.V - 1;
    if (fr >= s.F) fr = s.F - 1;

    if (!hdPainted) g.drawImage(s.cv, v * T, fr * T, T, T, px, py, T, T);

    /* --- 자동 이음 --- */
    if (isWater(ch)) {
      if (!isWater(cn)) g.drawImage(OV['sh0' + f4], px, py);
      if (!isWater(ce)) g.drawImage(OV['sh1' + f4], px, py);
      if (!isWater(cs)) g.drawImage(OV['sh2' + f4], px, py);
      if (!isWater(cw)) g.drawImage(OV['sh3' + f4], px, py);
      const cnw = nb.nw || ch, cne = nb.ne || ch, cse = nb.se || ch, csw = nb.sw || ch;
      if (isWater(cn) && isWater(cw) && !isWater(cnw)) g.drawImage(OV['sc0' + f4], px, py);
      if (isWater(cn) && isWater(ce) && !isWater(cne)) g.drawImage(OV['sc1' + f4], px, py);
      if (isWater(cs) && isWater(ce) && !isWater(cse)) g.drawImage(OV['sc2' + f4], px, py);
      if (isWater(cs) && isWater(cw) && !isWater(csw)) g.drawImage(OV['sc3' + f4], px, py);
    } else if (isWall(ch)) {
      if (!isWall(cw)) g.drawImage(OV['wL'], px, py);
      if (!isWall(ce)) g.drawImage(OV['wR'], px, py);
    } else {
      let bi = blendIdx(ch, cn); if (bi >= 0) g.drawImage(OV['bl0' + bi], px, py);
      bi = blendIdx(ch, ce); if (bi >= 0) g.drawImage(OV['bl1' + bi], px, py);
      bi = blendIdx(ch, cs); if (bi >= 0) g.drawImage(OV['bl2' + bi], px, py);
      bi = blendIdx(ch, cw); if (bi >= 0) g.drawImage(OV['bl3' + bi], px, py);
      if (isWall(cn)) g.drawImage(OV['cs'], px, py);        /* 벽 앞면 그림자 받기 */
    }
  }

  return {
    draw: draw,
    solid: solid,
    SOLID: SOLID,
    CHARS: CHARS,
    T: T
  };
})();
