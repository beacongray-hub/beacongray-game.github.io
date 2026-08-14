/* engine/props.js — 오브젝트·소품 (전역 PROPS)
   SPEC v2 §3 / §4-2 준수.
   - 앵커: 좌측 하단 타일. 그림 밑변이 ty*16+16 에 닿는다.
   - 모든 오브젝트는 모듈 로드 시 오프스크린 캔버스에 1회 렌더 후 캐시. draw 는 drawImage 만 한다.
   - 렌더 순서: (1) 아트 → (2) PX.outline(ink0) → (3) 새 캔버스에 접지 그림자 → 글로우 → 아트 합성.
     외곽선을 먼저 두르고 나중에 그림자를 깔아야 반투명 그림자에 외곽선이 생기지 않는다.
   - 광원은 항상 왼쪽 위. 색은 PAL 과 PX.shift 파생만 사용. */
"use strict";
const PROPS = (function () {

  const P = PAL;
  const HD_CELL = 128;
  const HD_ATLASES = {};
  if (typeof Image !== 'undefined') {
    ['nature', 'architecture'].forEach(function (name) {
      const img = new Image(); img.decoding = 'async';
      img.src = 'assets/map-hd/' + name + '-atlas.png?v=1'; HD_ATLASES[name] = img;
    });
  }
  const HD_PROPS = {
    R:{atlas:'nature',row:0,w:26,h:20}, P:{atlas:'nature',row:1,w:26,h:52},
    T:{atlas:'nature',row:2,w:42,h:42}, v:{atlas:'nature',row:3,w:28,h:20},
    C:{atlas:'architecture',row:0,w:28,h:54}, c:{atlas:'architecture',row:1,w:32,h:34},
    B:{atlas:'architecture',row:2,w:31,h:39,animated:true}, U:{atlas:'architecture',row:3,w:25,h:36}
  };
  function drawHDProp(g, ch, tx, ty, frame) {
    const d = HD_PROPS[ch]; if (!d) return false;
    const img = HD_ATLASES[d.atlas];
    if (!img || !img.complete || !img.naturalWidth) return false;
    const col = d.animated ? (((frame | 0) % 4 + 4) % 4) : ((PX.hash(tx, ty, ch.charCodeAt(0)) * 4) | 0);
    const by = ty * 16 + 16, cx = tx * 16 + 8;
    PX.shadow(g, cx, by, Math.max(5, Math.round(d.w * .28)), 2, .25);
    g.save(); g.imageSmoothingEnabled = true;
    g.drawImage(img, col * HD_CELL, d.row * HD_CELL, HD_CELL, HD_CELL,
      Math.round(cx - d.w / 2), by - d.h, d.w, d.h);
    g.restore();
    return true;
  }

  /* ===================== 공통 헬퍼 ===================== */

  /* 잎 덩어리: 같은 타원을 왼쪽 위로 조금씩 옮겨 겹쳐 광원 방향을 만든다(동심원 금지) */
  function clump(g, cx, cy, rx, ry, c0, c1, c2, c3) {
    PX.ellipse(g, cx, cy, rx, ry, c0);
    if (c1) PX.ellipse(g, cx - 1, cy - 1, Math.max(1, rx - 1), Math.max(1, ry - 1), c1);
    if (c2) PX.ellipse(g, cx - 2, cy - 2, Math.max(1, rx - 3), Math.max(1, ry - 2), c2);
    if (c3) { PX.px(g, cx - 2, cy - ry + 1, c3); PX.px(g, cx - 1, cy - ry + 1, c3); PX.px(g, cx - 3, cy - ry + 2, c3); }
  }

  /* 실루엣을 울퉁불퉁하게 깎는다 */
  function bite(g, pts) { for (let i = 0; i < pts.length; i++) g.clearRect(pts[i][0], pts[i][1], 1, 1); }

  /* 세로 기둥/원통 셰이딩: 열마다 색을 지정 */
  function cols(g, x, y, w, h, list) {
    for (let i = 0; i < w; i++) PX.rect(g, x + i, y, 1, h, list[i % list.length]);
  }

  /* 계단 한 단: 윗면 밝게 / 앞면 / 아랫·오른쪽 어둡게 */
  function stair(g, x, y, w, h, top, face, dark) {
    PX.rect(g, x, y, w, h, face);
    PX.hline(g, x, y, w, top);
    PX.hline(g, x, y + h - 1, w, dark);
    PX.vline(g, x + w - 1, y + 1, h - 1, dark);
  }

  /* 나무 기둥(세로): 왼쪽 하이라이트 + 오른쪽 그늘 */
  function post(g, x, y, w, h, c0, c1, c2) {
    PX.rect(g, x, y, w, h, c1);
    PX.vline(g, x, y, h, c2);
    PX.vline(g, x + w - 1, y, h, c0);
  }

  /* 나무 널빤지 가로 보 */
  function beam(g, x, y, w, h, c0, c1, c2) {
    PX.rect(g, x, y, w, h, c1);
    PX.hline(g, x, y, w, c2);
    PX.hline(g, x, y + h - 1, w, c0);
  }

  /* 석재 벽면: 결정적 노이즈로 블록마다 명도를 살짝 흔든다 */
  function masonry(g, x, y, w, h, bh, bw, seed, dark, mid, lite) {
    for (let j = 0; j < h; j += bh) {
      const off = ((j / bh) | 0) % 2 ? (bw >> 1) : 0;
      for (let i = -off; i < w; i += bw) {
        const ix = Math.max(0, i);
        const bx = x + ix, by = y + j;
        const bwid = Math.min(bw - 1, w - ix);
        if (bwid <= 0) continue;
        const bhh = Math.min(bh - 1, h - j);
        const n = PX.hash(bx, by, seed);
        const c = n < 0.3 ? dark : (n < 0.75 ? mid : lite);
        PX.rect(g, bx, by, bwid, bhh, c);
        PX.hline(g, bx, by, bwid, PX.shift(c, 12));
      }
    }
  }

  /* ===================== 개별 오브젝트 아트 ===================== */

  /* --- T : 올리브나무 16x24 --- */
  function artOlive(g) {
    /* 두툼하게 뒤틀린 밑동 + 살짝 S자로 굽은 줄기 */
    const trunk = [[23, 4, 8], [22, 5, 6], [21, 5, 5], [20, 6, 4],
                   [19, 7, 3], [18, 7, 3], [17, 7, 3], [16, 6, 4], [15, 6, 4]];
    for (let i = 0; i < trunk.length; i++) {
      const t = trunk[i];
      PX.rect(g, t[1], t[0], t[2], 1, P.wd2);
      PX.px(g, t[1], t[0], P.wd3);
      PX.px(g, t[1] + t[2] - 1, t[0], P.wd1);
      if (i % 3 === 1) PX.px(g, t[1] + 1, t[0], P.wd1);   /* 뒤틀린 결 */
    }
    PX.px(g, 3, 23, P.wd1); PX.px(g, 12, 23, P.wd1);
    PX.px(g, 4, 22, P.wd1); PX.px(g, 11, 22, P.wd1);
    PX.px(g, 6, 21, P.wd3); PX.px(g, 9, 20, P.wd1);
    /* 밑동에서 두 갈래로 갈라져 잎 속으로 들어가는 가지 */
    PX.line(g, 6, 16, 3, 11, P.wd2); PX.line(g, 7, 16, 4, 12, P.wd1);
    PX.line(g, 9, 16, 12, 12, P.wd2); PX.line(g, 8, 16, 11, 13, P.wd1);
    PX.px(g, 3, 11, P.wd1); PX.px(g, 12, 12, P.wd1);
    PX.line(g, 5, 14, 3, 15, P.wd2); PX.line(g, 10, 14, 13, 15, P.wd1);

    /* 잎 덩어리 8개를 어긋나게 겹쳐 16px 폭을 꽉 채운다.
       위쪽 실루엣이 매끄러운 원호가 되지 않도록 크기·높이를 모두 다르게 둔다. */
    clump(g, 12, 14, 4, 3, P.gr1, P.gr2, null, null);   /* 오른쪽 아래: 어둡다 */
    clump(g, 3, 14, 4, 3, P.gr1, P.gr2, null, null);    /* 왼쪽 아래 */
    clump(g, 13, 9, 3, 4, P.gr1, P.gr2, null, null);    /* 오른쪽 */
    clump(g, 8, 11, 5, 4, P.gr1, P.gr2, P.gr3, null);   /* 가운데 */
    clump(g, 2, 9, 3, 4, P.gr1, P.gr2, P.gr3, null);    /* 왼쪽 */
    clump(g, 5, 6, 5, 4, P.gr1, P.gr2, P.gr3, null);    /* 왼쪽 위: 가장 밝다 */
    clump(g, 10, 4, 4, 3, P.gr1, P.gr2, P.gr3, null);   /* 꼭대기 오른쪽 */
    clump(g, 6, 2, 3, 2, P.gr2, P.gr3, null, null);     /* 꼭대기 돌출 */

    /* 오른쪽 아래는 눌러서 잔디보다 확실히 어둡게, 왼쪽 위는 잎살을 밝게 */
    PX.dither(g, 9, 11, 7, 7, P.gr0, 1, 1);
    PX.dither(g, 11, 6, 5, 7, P.gr1, 2, 1);
    PX.dither(g, 1, 13, 7, 4, P.gr0, 1, 0);
    PX.dither(g, 2, 3, 8, 7, P.gr3, 1, 0);
    /* 잎 뭉치 결 (평평해 보이지 않게) */
    PX.px(g, 8, 8, P.gr3); PX.px(g, 10, 9, P.gr2); PX.px(g, 7, 10, P.gr2);
    PX.px(g, 5, 11, P.gr2); PX.px(g, 12, 11, P.gr0); PX.px(g, 9, 14, P.gr0);
    PX.px(g, 3, 12, P.gr2); PX.px(g, 14, 8, P.gr0);
    /* gr4 하이라이트는 왼쪽 위 덩어리에만 8픽셀 */
    PX.px(g, 3, 4, P.gr4); PX.px(g, 4, 4, P.gr4); PX.px(g, 2, 5, P.gr4);
    PX.px(g, 5, 3, P.gr4); PX.px(g, 3, 6, P.gr4); PX.px(g, 6, 4, P.gr4);
    PX.px(g, 1, 8, P.gr4); PX.px(g, 7, 2, P.gr4);
    PX.px(g, 4, 5, P.gr5); PX.px(g, 6, 3, P.gr5);
    /* 올리브 열매 */
    PX.px(g, 11, 12, P.pu2); PX.px(g, 6, 13, P.pu2); PX.px(g, 13, 6, P.pu2);
    /* 실루엣 가장자리를 깎아 매끄러운 원호가 되지 않게 한다 */
    bite(g, [[0, 6], [15, 7], [8, 0], [12, 1], [4, 1], [1, 12], [14, 13]]);
  }

  /* --- P : 사이프러스 16x30 --- */
  function artCypress(g) {
    post(g, 6, 24, 4, 5, P.wd1, P.wd2, P.wd3);
    PX.rect(g, 5, 28, 6, 1, P.wd1);
    const body = [[8, 1], [11, 8], [12, 16], [12, 23], [9, 26], [6, 26], [4, 23], [4, 16], [5, 8]];
    PX.poly(g, body, P.gr1);
    PX.poly(g, [[8, 3], [10, 9], [11, 17], [10, 24], [6, 24], [5, 17], [6, 9]], P.gr2);
    PX.poly(g, [[7, 4], [8, 10], [8, 18], [7, 23], [6, 18], [6, 10]], P.gr3);
    /* 세로 결 */
    for (let x = 4; x <= 12; x += 2) {
      for (let y = 4 + ((x & 3) ? 0 : 2); y < 25; y += 3) PX.px(g, x, y, x < 8 ? P.gr3 : P.gr0);
    }
    PX.dither(g, 9, 8, 4, 17, P.gr0, 1, 1);
    PX.px(g, 7, 3, P.gr4); PX.px(g, 6, 6, P.gr4); PX.px(g, 7, 11, P.gr4);
    PX.px(g, 6, 16, P.gr4); PX.px(g, 7, 21, P.gr4); PX.px(g, 8, 2, P.gr3);
    bite(g, [[4, 12], [12, 12], [4, 20], [12, 20], [5, 7], [11, 7], [12, 25], [4, 25]]);
  }

  /* --- L : 야자수 18x28 ---
     잎 하나 = 2차 곡선 중앙맥(gr1) + 양쪽 잎살. 끝으로 갈수록 가늘어지고 아래로 처진다. */
  function frond(g, x0, y0, ctlX, ctlY, x1, y1, cRib, cA, cB) {
    const pts = [];
    for (let i = 0; i <= 20; i++) {
      const u = i / 20, v = 1 - u;
      const x = Math.round(v * v * x0 + 2 * v * u * ctlX + u * u * x1);
      const y = Math.round(v * v * y0 + 2 * v * u * ctlY + u * u * y1);
      const last = pts[pts.length - 1];
      if (!last || last[0] !== x || last[1] !== y) pts.push([x, y]);
    }
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      const horiz = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]);
      const t = n < 2 ? 1 : i / (n - 1);
      /* 잎살은 얇게. 뿌리 쪽은 맨 중앙맥만 남겨 잎끼리 붙지 않게 한다 */
      let wid = t < 0.24 ? 0 : (t < 0.88 ? 1 : 0);
      if (wid > 0 && t > 0.32 && t < 0.72 && i % 3 === 0) wid = 2;   /* 잎살 톱니 */
      for (let k = 1; k <= wid; k++) {
        const c = (k === 1) ? cA : cB;
        if (horiz) { PX.px(g, p[0], p[1] - k, c); PX.px(g, p[0], p[1] + k, cB); }
        else { PX.px(g, p[0] - k, p[1], c); PX.px(g, p[0] + k, p[1], cB); }
      }
      PX.px(g, p[0], p[1], cRib);
    }
  }
  function artPalm(g) {
    /* 줄기: 위로 갈수록 가늘어지고 오른쪽으로 휜다 */
    for (let y = 26; y >= 9; y--) {
      const u = (26 - y) / 17;
      const x = Math.round(5 + u * 4);
      const w = y >= 21 ? 4 : 3;
      PX.rect(g, x, y, w, 1, P.wd2);
      PX.px(g, x, y, P.wd3);
      PX.px(g, x + w - 1, y, P.wd1);
    }
    /* 마디 6줄 */
    for (let i = 0; i < 6; i++) {
      const y = 25 - i * 3;
      const u = (26 - y) / 17;
      const x = Math.round(5 + u * 4);
      const w = y >= 21 ? 4 : 3;
      PX.rect(g, x, y, w, 1, P.wd1);
      PX.px(g, x, y, P.wd2);
      PX.px(g, x + w - 1, y, P.wd0);
    }
    PX.rect(g, 4, 26, 7, 1, P.wd1);
    PX.px(g, 3, 26, P.wd1); PX.px(g, 11, 26, P.wd1);

    /* 꼭대기 한 점에서 부챗살처럼 6장 — 솟았다가 끝이 아래로 처진다 */
    const hx = 10, hy = 8;
    frond(g, hx, hy, 5, 5, 0, 12, P.gr1, P.gr2, P.gr1);      /* 왼쪽 → 아래로 */
    frond(g, hx, hy, 5, 3, 1, 4, P.gr1, P.gr3, P.gr2);       /* 왼쪽 위 */
    frond(g, hx, hy, 10, 2, 8, 0, P.gr1, P.gr3, P.gr2);      /* 위 */
    frond(g, hx, hy, 15, 3, 17, 3, P.gr1, P.gr2, P.gr1);     /* 오른쪽 위 */
    frond(g, hx, hy, 16, 6, 17, 11, P.gr1, P.gr2, P.gr1);    /* 오른쪽 → 아래로 */
    frond(g, hx, hy, 13, 11, 14, 15, P.gr0, P.gr1, P.gr0);   /* 오른쪽 아래 */
    frond(g, hx, hy, 7, 11, 4, 14, P.gr1, P.gr2, P.gr1);     /* 왼쪽 아래 */

    /* 관부 */
    PX.rect(g, 9, 7, 3, 3, P.gr1);
    PX.px(g, 9, 7, P.gr3); PX.px(g, 11, 9, P.gr0);
    /* 코코넛 3개 */
    PX.ellipse(g, 8, 11, 1, 1, P.wd2); PX.px(g, 7, 10, P.wd3);
    PX.ellipse(g, 11, 12, 1, 1, P.wd2); PX.px(g, 10, 11, P.wd3);
    PX.ellipse(g, 10, 10, 1, 1, P.wd1); PX.px(g, 11, 11, P.wd0);
    /* 왼쪽 위 잎살 하이라이트 */
    PX.px(g, 5, 4, P.gr4); PX.px(g, 7, 3, P.gr4); PX.px(g, 3, 6, P.gr4);
    PX.px(g, 6, 5, P.gr4); PX.px(g, 2, 9, P.gr4);
  }

  /* --- R : 큰 바위 16x14 --- */
  function artRock(g) {
    PX.poly(g, [[2, 6], [4, 3], [7, 1], [11, 2], [14, 6], [15, 10], [13, 12], [3, 12], [1, 9]], P.st2);
    PX.poly(g, [[3, 6], [5, 3], [8, 2], [10, 4], [8, 7], [4, 8]], P.st3);
    PX.poly(g, [[5, 4], [7, 3], [8, 4], [6, 6]], P.st4);
    PX.poly(g, [[11, 3], [14, 6], [15, 10], [13, 12], [10, 12], [10, 6]], P.st1);
    PX.dither(g, 9, 8, 6, 4, P.st0, 1, 1);
    PX.dither(g, 3, 9, 6, 3, P.st1, 1, 0);
    PX.line(g, 8, 6, 9, 11, P.st0);
    PX.line(g, 5, 8, 4, 11, P.st0);
    PX.px(g, 4, 4, P.st5); PX.px(g, 6, 3, P.st5);
    PX.px(g, 2, 8, P.gr1); PX.px(g, 3, 7, P.gr1);
    bite(g, [[1, 6], [15, 6], [2, 11], [14, 11]]);
  }

  /* 대리석 기둥 몸통 열 색 (원통 셰이딩 + 세로 홈) */
  function shaftCols() { return [P.st3, P.st5, P.st4, P.st3, P.st4, P.st3, P.st2, P.st1]; }

  /* --- C : 온전한 대리석 기둥 14x32 --- */
  function artColumn(g) {
    /* 주두: 아바쿠스(사각 판) + 에키누스 */
    PX.rect(g, 1, 1, 12, 3, P.st4);
    PX.hline(g, 1, 1, 12, P.st5);
    PX.hline(g, 1, 3, 12, P.st2);
    PX.vline(g, 12, 1, 3, P.st3);
    PX.trapezoid(g, 2, 11, 4, 3, 10, 7, P.st3);
    PX.trapezoid(g, 2, 6, 4, 3, 6, 7, P.st4);
    PX.hline(g, 3, 6, 8, P.st2);
    /* 몸통 + 플루팅 */
    cols(g, 3, 7, 8, 19, shaftCols());
    /* 드럼 이음선 */
    PX.hline(g, 3, 13, 8, P.st2); PX.hline(g, 3, 20, 8, P.st2);
    PX.px(g, 4, 13, P.st4); PX.px(g, 4, 20, P.st4);
    PX.dither(g, 8, 7, 3, 19, P.st1, 1, 1);
    /* 주춧돌 */
    PX.rect(g, 2, 26, 10, 2, P.st3);
    PX.hline(g, 2, 26, 10, P.st4);
    PX.rect(g, 1, 28, 12, 2, P.st3);
    PX.hline(g, 1, 28, 12, P.st4);
    PX.hline(g, 1, 29, 12, P.st2);
    PX.vline(g, 12, 28, 2, P.st2); PX.vline(g, 11, 26, 2, P.st2);
  }

  /* --- c : 부러진 기둥 14x16 --- */
  function artColumnBroken(g) {
    const jag = [3, 1, 2, 0, 1, 3, 2, 4];
    /* 몸통 */
    const sc = shaftCols();
    for (let i = 0; i < 8; i++) {
      const top = 2 + jag[i];
      PX.rect(g, 3 + i, top, 1, 11 - top + 1, sc[i]);
      PX.px(g, 3 + i, top, P.st5);           /* 부러진 단면 */
      PX.px(g, 3 + i, top + 1, P.st4);
    }
    PX.px(g, 5, 3, P.st2); PX.px(g, 8, 4, P.st2); PX.px(g, 9, 6, P.st2);
    PX.hline(g, 3, 8, 8, P.st2); PX.px(g, 4, 8, P.st4);
    PX.dither(g, 8, 3, 3, 9, P.st1, 1, 1);
    /* 주춧돌 */
    PX.rect(g, 2, 11, 10, 2, P.st3);
    PX.hline(g, 2, 11, 10, P.st4);
    PX.rect(g, 1, 13, 12, 2, P.st3);
    PX.hline(g, 1, 13, 12, P.st4);
    PX.hline(g, 1, 14, 12, P.st2);
    PX.vline(g, 12, 13, 2, P.st2);
    /* 바닥 파편 */
    PX.poly(g, [[0, 12], [2, 11], [3, 14], [0, 14]], P.st3);
    PX.px(g, 1, 12, P.st4);
    PX.poly(g, [[12, 10], [13, 9], [13, 12], [11, 12]], P.st3);
    PX.px(g, 12, 10, P.st4); PX.px(g, 13, 12, P.st2);
  }

  /* --- B : 화로 12x22 (불꽃 4프레임) --- */
  const FLAME = [
    { o: [[3, 10], [2, 6], [4, 3], [6, 0], [8, 4], [9, 7], [9, 10]],
      i: [[4, 10], [4, 6], [6, 3], [7, 6], [8, 10]], c: [[5, 9], [5, 6], [6, 4], [7, 7], [7, 9]] },
    { o: [[3, 10], [2, 7], [3, 4], [5, 1], [7, 3], [9, 6], [9, 10]],
      i: [[4, 10], [4, 7], [5, 4], [7, 7], [8, 10]], c: [[5, 9], [5, 7], [6, 5], [7, 8], [6, 9]] },
    { o: [[3, 10], [3, 6], [5, 2], [7, 1], [9, 5], [9, 8], [9, 10]],
      i: [[4, 10], [4, 6], [6, 3], [8, 6], [8, 10]], c: [[5, 9], [6, 6], [7, 4], [8, 7], [7, 9]] },
    { o: [[3, 10], [2, 8], [4, 4], [6, 2], [8, 3], [9, 8], [9, 10]],
      i: [[4, 10], [4, 7], [5, 5], [7, 5], [8, 10]], c: [[5, 9], [5, 7], [6, 5], [7, 6], [7, 9]] }
  ];
  function artBrazier(g, f) {
    const fr = FLAME[f & 3];
    PX.poly(g, fr.o, P.fl1);
    PX.poly(g, fr.i, P.fl2);
    PX.poly(g, fr.c, P.fl3);
    PX.px(g, 5, 8, P.fl4); PX.px(g, 6, 7, P.fl4);
    PX.px(g, fr.c[2][0], fr.c[2][1] + 1, P.fl4);
    PX.dither(g, 2, 8, 8, 3, P.fl0, 1, f & 1);
    /* 청동 그릇 */
    PX.trapezoid(g, 1, 10, 10, 3, 8, 15, P.gd2);
    PX.hline(g, 1, 10, 10, P.gd3);
    PX.hline(g, 1, 11, 10, P.gd1);
    PX.px(g, 1, 10, P.gd4); PX.px(g, 2, 10, P.gd4);
    PX.dither(g, 6, 11, 4, 4, P.gd1, 2, 0);
    PX.px(g, 9, 11, P.gd0); PX.px(g, 8, 13, P.gd0);
    /* 숯 */
    PX.px(g, 4, 11, P.fl0); PX.px(g, 6, 11, P.rd1); PX.px(g, 7, 11, P.fl0);
    /* 삼각대 다리 */
    PX.line(g, 3, 15, 2, 20, P.gd1); PX.line(g, 4, 15, 3, 20, P.gd2);
    PX.line(g, 8, 15, 9, 20, P.gd0); PX.line(g, 7, 15, 8, 20, P.gd1);
    PX.rect(g, 5, 15, 2, 5, P.gd1); PX.px(g, 5, 16, P.gd2);
    PX.hline(g, 3, 18, 6, P.gd1); PX.px(g, 4, 18, P.gd2);
    PX.rect(g, 1, 20, 3, 1, P.gd0); PX.rect(g, 8, 20, 3, 1, P.gd0);
    PX.rect(g, 4, 20, 4, 1, P.gd0);
  }
  function glowBrazier(og, f) {
    og.save(); og.globalAlpha = 0.18;
    PX.ellipse(og, 6, 14, 8 + (f & 1), 7, P.fl2);
    og.globalAlpha = 0.14;
    PX.ellipse(og, 6, 8, 6, 7 + ((f >> 1) & 1), P.fl2);
    og.restore();
  }

  /* --- A : 제단 16x16 --- */
  const MEANDER = { pal: { k: null }, rows: [".kkkk.kkkk", ".k..k.k..k", "kkk.kkk.kk"] };
  function artAltar(g) {
    /* 봉헌 그릇 */
    PX.rect(g, 5, 1, 6, 1, P.gd3);
    PX.px(g, 5, 1, P.gd4); PX.px(g, 6, 1, P.gd4);
    PX.trapezoid(g, 5, 10, 2, 6, 9, 5, P.gd2);
    PX.dither(g, 8, 2, 3, 3, P.gd1, 2, 0);
    PX.rect(g, 7, 5, 2, 1, P.gd1);
    PX.px(g, 7, 2, P.fl2); PX.px(g, 8, 2, P.fl1);
    /* 윗판 */
    PX.rect(g, 1, 6, 14, 2, P.st4);
    PX.hline(g, 1, 6, 14, P.st5);
    PX.hline(g, 1, 7, 14, P.st3);
    PX.vline(g, 14, 6, 2, P.st3);
    /* 앞면 + 그리스 문양(메안드로스) */
    PX.rect(g, 2, 8, 12, 3, P.st4);
    PX.dither(g, 9, 8, 5, 3, P.st3, 2, 0);
    MEANDER.pal.k = P.st2;
    PX.drawRows(g, MEANDER, 3, 8);
    /* 아래 턱 + 계단 받침 */
    stair(g, 1, 11, 14, 2, P.st4, P.st3, P.st2);
    stair(g, 0, 13, 16, 2, P.st3, P.st2, P.st1);
    PX.px(g, 1, 11, P.st5); PX.px(g, 0, 13, P.st4);
  }

  /* --- U : 암포라 12x16 (행문자열 DSL) --- */
  const AMPHORA = {
    pal: { d: P.sd3, c: P.sd2, b: P.sd1, a: P.sd0, k: P.ink1, w: P.sd3 },
    rows: [
      "...dccccb...",
      "...bcccab...",
      "....dccb....",
      "..bbdccbbb..",
      ".bc.dccb.cb.",
      ".bc.dccb.cb.",
      ".bbddcccbbb.",
      ".bdddcccbba.",
      ".bdddcccbba.",
      ".bdkwkkwkba.",
      ".bdkkwwkkba.",
      ".bdddcccbba.",
      "..bddcccbb..",
      "....dccb....",
      "...bccccb...",
      "............"
    ]
  };
  function artAmphora(g) {
    PX.drawRows(g, AMPHORA, 0, 0);
    PX.px(g, 3, 7, P.sd4); PX.px(g, 3, 8, P.sd4); PX.px(g, 4, 6, P.sd4);
    PX.px(g, 4, 0, P.sd4);
  }

  /* --- S : 신상(아테나) 16x30 --- */
  function artStatue(g) {
    /* 창 */
    PX.vline(g, 2, 4, 20, P.st3);
    PX.vline(g, 1, 4, 20, P.st4);
    PX.poly(g, [[2, 0], [3, 3], [2, 5], [1, 3]], P.st4);
    PX.px(g, 2, 1, P.st5);
    /* 투구 볏 */
    PX.rect(g, 6, 1, 5, 2, P.st4);
    PX.hline(g, 6, 1, 5, P.st5);
    PX.px(g, 10, 2, P.st2); PX.px(g, 5, 2, P.st3);
    /* 머리 + 투구 */
    PX.rect(g, 6, 3, 4, 4, P.st4);
    PX.vline(g, 9, 3, 4, P.st2);
    PX.hline(g, 6, 5, 4, P.st3);
    PX.px(g, 6, 3, P.st5); PX.px(g, 7, 6, P.st2); PX.px(g, 8, 6, P.st2);
    /* 어깨·몸통 */
    PX.trapezoid(g, 5, 10, 8, 4, 11, 10, P.st4);
    PX.rect(g, 5, 10, 6, 8, P.st4);
    PX.dither(g, 8, 8, 4, 10, P.st3, 2, 0);
    PX.vline(g, 10, 10, 8, P.st2);
    /* 팔 */
    PX.rect(g, 3, 10, 2, 4, P.st3); PX.px(g, 3, 10, P.st4);
    PX.rect(g, 11, 10, 2, 3, P.st3); PX.px(g, 12, 12, P.st2);
    /* 방패 */
    PX.ellipse(g, 12, 15, 3, 4, P.st3);
    PX.ellipseOutline(g, 12, 15, 3, 4, P.st2);
    PX.ellipse(g, 11, 14, 1, 1, P.st5);
    PX.px(g, 12, 16, P.st2); PX.px(g, 13, 16, P.st1);
    /* 옷자락 */
    PX.trapezoid(g, 5, 11, 18, 3, 12, 23, P.st4);
    for (let x = 4; x <= 11; x += 2) PX.line(g, x + 1, 18, x, 23, P.st2);
    PX.dither(g, 8, 18, 5, 5, P.st3, 2, 1);
    PX.hline(g, 3, 23, 10, P.st2);
    /* 받침대 */
    stair(g, 2, 24, 12, 2, P.st5, P.st4, P.st2);
    stair(g, 1, 26, 14, 3, P.st4, P.st3, P.st1);
    PX.px(g, 4, 27, P.st2); PX.px(g, 9, 27, P.st2);
  }

  /* --- n : 왕좌 16x24 --- */
  function artThrone(g) {
    /* 등받이 */
    PX.rect(g, 3, 2, 10, 13, P.wd2);
    PX.vline(g, 3, 2, 13, P.wd3);
    PX.vline(g, 12, 2, 13, P.wd1);
    PX.hline(g, 3, 2, 10, P.wd3);
    PX.rect(g, 5, 4, 6, 10, P.rd1);
    PX.hline(g, 5, 4, 6, P.rd0);
    PX.vline(g, 10, 4, 10, P.rd0);
    PX.dither(g, 5, 4, 6, 10, P.rd2, 1, 0);
    /* 금 장식 */
    PX.rect(g, 2, 1, 3, 2, P.gd2); PX.px(g, 2, 1, P.gd4); PX.px(g, 4, 2, P.gd1);
    PX.rect(g, 11, 1, 3, 2, P.gd2); PX.px(g, 11, 1, P.gd3); PX.px(g, 13, 2, P.gd1);
    PX.hline(g, 3, 3, 10, P.gd1);
    PX.ellipse(g, 7, 9, 2, 2, P.gd2);
    PX.px(g, 6, 8, P.gd4); PX.px(g, 7, 8, P.gd3); PX.px(g, 8, 10, P.gd1);
    PX.px(g, 5, 9, P.gd3); PX.px(g, 9, 9, P.gd1); PX.px(g, 7, 7, P.gd3); PX.px(g, 7, 11, P.gd1);
    /* 팔걸이 */
    beam(g, 1, 13, 4, 2, P.wd1, P.wd2, P.wd3);
    beam(g, 11, 13, 4, 2, P.wd1, P.wd2, P.wd3);
    PX.px(g, 1, 13, P.gd2); PX.px(g, 14, 13, P.gd2);
    /* 방석 */
    PX.rect(g, 4, 14, 8, 3, P.rd2);
    PX.hline(g, 4, 14, 8, P.rd3);
    PX.hline(g, 4, 16, 8, P.rd1);
    PX.px(g, 4, 14, P.rd4); PX.px(g, 5, 14, P.rd4);
    PX.px(g, 11, 15, P.rd1); PX.px(g, 11, 16, P.rd0);
    /* 좌판 + 앞치마 */
    beam(g, 2, 17, 12, 2, P.wd1, P.wd2, P.wd3);
    PX.hline(g, 3, 19, 10, P.gd1);
    PX.rect(g, 3, 20, 10, 1, P.wd2);
    /* 다리 */
    post(g, 2, 19, 3, 4, P.wd1, P.wd2, P.wd3);
    post(g, 11, 19, 3, 4, P.wd1, P.wd2, P.wd3);
    PX.rect(g, 2, 22, 3, 1, P.gd1); PX.rect(g, 11, 22, 3, 1, P.gd1);
  }

  /* --- m : 베틀 18x20 --- */
  function artLoom(g) {
    /* 틀 */
    beam(g, 1, 1, 16, 2, P.wd1, P.wd2, P.wd3);
    post(g, 1, 3, 3, 16, P.wd1, P.wd2, P.wd3);
    post(g, 14, 3, 3, 16, P.wd1, P.wd2, P.wd3);
    beam(g, 1, 17, 16, 2, P.wd1, P.wd2, P.wd3);
    PX.px(g, 1, 1, P.wd4); PX.px(g, 2, 1, P.wd4);
    /* 도투마리 */
    beam(g, 3, 3, 12, 1, P.wd0, P.wd3, P.wd4);
    /* 짜다 만 천 (위쪽) */
    PX.rect(g, 4, 4, 10, 6, P.iv3);
    PX.hline(g, 4, 4, 10, P.iv4);
    PX.hline(g, 4, 5, 10, P.rd2);
    PX.hline(g, 4, 7, 10, P.se2);
    PX.hline(g, 4, 9, 10, P.pu3);
    PX.dither(g, 10, 4, 4, 6, P.iv1, 1, 1);
    PX.vline(g, 13, 4, 6, P.iv1);
    /* 천 아랫단 (짜다 만 가장자리) */
    for (let x = 4; x < 14; x += 2) { PX.px(g, x, 10, P.iv2); PX.px(g, x + 1, 10, P.iv3); }
    /* 세로 날실 */
    for (let x = 4; x <= 13; x += 2) {
      PX.vline(g, x, 11, 4, P.iv2);
      PX.vline(g, x + 1, 11, 4, P.iv1);
    }
    /* 추 */
    for (let x = 4; x <= 12; x += 4) {
      PX.rect(g, x, 15, 2, 2, P.st3);
      PX.px(g, x, 15, P.st4); PX.px(g, x + 1, 16, P.st1);
    }
    /* 북(셔틀) */
    PX.rect(g, 5, 12, 5, 1, P.wd3);
    PX.px(g, 5, 12, P.wd4); PX.px(g, 9, 12, P.wd1);
    PX.px(g, 10, 12, P.iv2); PX.px(g, 11, 13, P.iv2);
  }

  /* --- k : 소 22x16 --- */
  function artOx(g) {
    /* 다리 */
    const legs = [[6, 11, 2, 4], [9, 11, 2, 3], [14, 11, 2, 3], [17, 11, 2, 4]];
    for (let i = 0; i < legs.length; i++) {
      const L = legs[i];
      PX.rect(g, L[0], L[1], L[2], L[3], i % 2 ? P.iv1 : P.iv2);
      PX.vline(g, L[0], L[1], L[3], P.iv2);
      PX.rect(g, L[0], L[1] + L[3] - 1, L[2], 1, P.ink2);
    }
    /* 몸통 */
    PX.ellipse(g, 12, 7, 7, 4, P.iv3);
    PX.rect(g, 6, 4, 13, 7, P.iv3);
    PX.hline(g, 6, 3, 12, P.iv4);
    PX.dither(g, 12, 8, 8, 3, P.iv1, 2, 0);
    PX.hline(g, 7, 10, 12, P.iv1);
    PX.vline(g, 18, 4, 7, P.iv1);
    /* 갈색 반점 */
    PX.ellipse(g, 10, 6, 2, 2, P.sd1);
    PX.ellipse(g, 15, 8, 3, 1, P.sd1);
    PX.px(g, 13, 4, P.sd1); PX.px(g, 17, 5, P.sd0);
    PX.px(g, 9, 4, P.sd2); PX.px(g, 16, 9, P.sd0);
    /* 목·머리 */
    PX.poly(g, [[6, 4], [3, 5], [2, 9], [5, 10], [7, 9]], P.iv3);
    PX.px(g, 4, 5, P.iv4); PX.px(g, 3, 6, P.iv4);
    PX.dither(g, 3, 8, 4, 2, P.iv1, 2, 1);
    PX.rect(g, 1, 7, 3, 3, P.iv2);
    PX.hline(g, 1, 9, 3, P.sd1);
    PX.px(g, 1, 8, P.ink2); PX.px(g, 2, 8, P.sd0);
    PX.px(g, 4, 7, P.ink1);              /* 눈 */
    PX.px(g, 5, 6, P.iv4);
    /* 뿔 */
    PX.px(g, 3, 4, P.iv2); PX.px(g, 2, 3, P.iv1); PX.px(g, 2, 2, P.iv2);
    PX.px(g, 6, 3, P.iv2); PX.px(g, 6, 2, P.iv1); PX.px(g, 7, 2, P.iv2);
    /* 귀 */
    PX.px(g, 5, 4, P.iv1); PX.px(g, 4, 3, P.iv2);
    /* 꼬리 */
    PX.line(g, 19, 4, 20, 10, P.iv2);
    PX.px(g, 20, 11, P.iv1); PX.px(g, 20, 12, P.iv0); PX.px(g, 19, 12, P.iv1);
  }

  /* --- x : 보물 상자 14x12 (행문자열 DSL) --- */
  const CHEST = {
    pal: { a: P.wd0, b: P.wd1, c: P.wd2, d: P.wd3, e: P.wd4, g: P.gd2, h: P.gd3, i: P.gd0 },
    rows: [
      "..............",
      "...ddeeeedd...",
      "..edeeeeeede..",
      ".eddhddddhddc.",
      ".cbbgbiibgbbb.",
      ".cddghhhhgddb.",
      ".cddghiihgddb.",
      ".cddghhhhgddb.",
      ".cddgddddgddb.",
      ".cbbgbbbbgbbb.",
      ".aaaaaaaaaaaa.",
      ".............."
    ]
  };
  function artChest(g) {
    PX.drawRows(g, CHEST, 0, 0);
    PX.px(g, 4, 1, P.gd4); PX.px(g, 5, 1, P.wd4);
    PX.px(g, 4, 3, P.gd4); PX.px(g, 5, 5, P.gd4);
    PX.px(g, 9, 8, P.gd1); PX.px(g, 4, 8, P.gd1);
    PX.px(g, 12, 5, P.wd0); PX.px(g, 12, 8, P.wd0);
  }

  /* --- b : 해골·뼈 무더기 14x10 --- */
  const BONES = {
    pal: { w: P.iv3, v: P.iv2, u: P.iv1, s: P.iv0, k: P.ink1 },
    rows: [
      ".....wwww.....",
      "....wwvvvu....",
      "...wwvvvvvu...",
      "...wkkvvkku...",
      "...wkkvvkku...",
      "...wvvkkvvu...",
      "....wvvvvu....",
      "....wukuku....",
      "..wwuvvvvuww..",
      ".wvwwwwwwwwvw."
    ]
  };
  function artBones(g) {
    PX.drawRows(g, BONES, 0, 0);
    PX.px(g, 5, 1, P.iv4); PX.px(g, 4, 2, P.iv4); PX.px(g, 6, 0, P.iv4);
    PX.px(g, 10, 3, P.iv0); PX.px(g, 10, 4, P.iv0);
    PX.px(g, 3, 9, P.iv1); PX.px(g, 12, 9, P.iv0);
  }

  /* --- l : 연꽃 무더기 14x10 --- */
  const LOTUS = {
    pal: { a: P.gr1, b: P.gr2, c: P.gr3, e: P.iv4, g: P.pu4, h: P.gd3 },
    rows: [
      "....e.........",
      "...ege...e....",
      "..eeheee.ege..",
      "...eee..eehee.",
      "....e....eee..",
      ".bccb...bccb..",
      "bccccb.bccccb.",
      ".bcab...bcab..",
      "...bccccccb...",
      "..bcccccccab.."
    ]
  };
  function artLotus(g) {
    PX.drawRows(g, LOTUS, 0, 0);
    PX.px(g, 2, 6, P.gr4); PX.px(g, 8, 6, P.gr4); PX.px(g, 4, 8, P.gr4);
    PX.px(g, 11, 6, P.gr1); PX.px(g, 10, 9, P.gr1);
    PX.px(g, 3, 2, P.iv2); PX.px(g, 11, 3, P.iv2);
  }

  /* --- v : 덤불 14x12 --- */
  function artBush(g) {
    clump(g, 4, 7, 4, 3, P.gr1, P.gr2, P.gr3, null);
    clump(g, 9, 6, 4, 3, P.gr1, P.gr2, P.gr3, P.gr4);
    clump(g, 6, 4, 3, 3, P.gr1, P.gr2, P.gr3, P.gr4);
    clump(g, 11, 9, 3, 2, P.gr1, P.gr2, null, null);
    clump(g, 3, 9, 3, 2, P.gr1, P.gr2, P.gr3, null);
    clump(g, 7, 9, 4, 2, P.gr1, P.gr2, null, null);
    PX.dither(g, 7, 7, 7, 4, P.gr0, 1, 1);
    PX.px(g, 3, 3, P.gr4); PX.px(g, 8, 2, P.gr4); PX.px(g, 2, 6, P.gr4);
    /* 열매 */
    PX.px(g, 5, 6, P.rd2); PX.px(g, 10, 5, P.rd2); PX.px(g, 8, 8, P.rd3);
    /* 밑동 잔가지 */
    PX.px(g, 6, 10, P.wd1); PX.px(g, 8, 10, P.wd1); PX.px(g, 7, 11, P.wd0);
    bite(g, [[0, 7], [13, 6], [1, 4], [12, 3], [5, 1], [13, 10], [0, 10]]);
  }

  /* --- G : 궁전 대문 32x36 (2x1) --- */
  function artGate(g) {
    /* 상인방 + 코니스 */
    PX.rect(g, 0, 0, 32, 2, P.st4);
    PX.hline(g, 0, 0, 32, P.st5);
    PX.rect(g, 1, 2, 30, 5, P.st3);
    PX.hline(g, 1, 2, 30, P.st4);
    PX.hline(g, 1, 6, 30, P.st2);
    PX.dither(g, 20, 2, 11, 5, P.st2, 1, 1);
    for (let x = 3; x < 30; x += 4) { PX.rect(g, x, 3, 2, 2, P.st2); PX.px(g, x, 3, P.st4); }
    PX.hline(g, 2, 5, 28, P.gd1);
    /* 문설주 */
    cols(g, 1, 7, 5, 26, [P.st3, P.st5, P.st4, P.st2, P.st1]);
    cols(g, 26, 7, 5, 26, [P.st3, P.st4, P.st3, P.st2, P.st1]);
    for (let y = 9; y < 32; y += 6) { PX.hline(g, 1, y, 5, P.st2); PX.hline(g, 26, y, 5, P.st1); }
    /* 청동 두 짝 문 */
    PX.rect(g, 6, 7, 20, 26, P.gd1);
    PX.hline(g, 6, 7, 20, P.gd2);
    PX.dither(g, 17, 7, 9, 26, P.gd0, 1, 1);
    PX.vline(g, 15, 7, 26, P.gd0); PX.vline(g, 16, 7, 26, P.gd0);
    PX.vline(g, 6, 7, 26, P.gd2); PX.vline(g, 25, 7, 26, P.gd0);
    /* 패널 6장 */
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
      const px0 = 8 + c * 10, py0 = 9 + r * 8;
      PX.frameRect(g, px0, py0, 6, 7, P.gd0);
      PX.rect(g, px0 + 1, py0 + 1, 4, 5, P.gd2);
      PX.hline(g, px0 + 1, py0 + 1, 4, P.gd3);
      PX.vline(g, px0 + 4, py0 + 1, 5, P.gd1);
    }
    /* 왼쪽: 사자 얼굴 / 오른쪽: 올빼미 */
    PX.rect(g, 9, 10, 4, 5, P.gd3);
    PX.px(g, 9, 10, P.gd4); PX.px(g, 12, 14, P.gd1);
    PX.px(g, 10, 11, P.ink0); PX.px(g, 12, 11, P.ink0);
    PX.px(g, 11, 12, P.gd1); PX.px(g, 10, 13, P.ink0); PX.px(g, 11, 13, P.ink0); PX.px(g, 12, 13, P.ink0);
    PX.px(g, 8, 11, P.gd2); PX.px(g, 13, 11, P.gd2); PX.px(g, 8, 13, P.gd2); PX.px(g, 13, 13, P.gd2);
    PX.rect(g, 19, 10, 4, 5, P.gd3);
    PX.px(g, 19, 10, P.gd4); PX.px(g, 22, 14, P.gd1);
    PX.px(g, 20, 11, P.ink0); PX.px(g, 22, 11, P.ink0);
    PX.px(g, 21, 12, P.gd1); PX.px(g, 21, 13, P.gd1);
    PX.px(g, 19, 9, P.gd2); PX.px(g, 22, 9, P.gd2);
    /* 손잡이 고리 */
    PX.ellipseOutline(g, 13, 21, 2, 2, P.gd3);
    PX.ellipseOutline(g, 18, 21, 2, 2, P.gd3);
    PX.px(g, 13, 19, P.gd4); PX.px(g, 18, 19, P.gd4);
    PX.px(g, 13, 23, P.gd0); PX.px(g, 18, 23, P.gd0);
    /* 문턱 */
    stair(g, 0, 33, 32, 2, P.st4, P.st3, P.st1);
  }

  /* --- H : 오두막 32x32 (2x2) --- */
  function artHut(g) {
    /* 짚 지붕 (앞면이 보이게) — 용마루 x11..21, 처마 y15 */
    PX.trapezoid(g, 11, 21, 1, 1, 31, 15, P.sd1);
    for (let x = 1; x <= 31; x++) {
      const top = x < 11 ? 1 + Math.round((11 - x) * 1.4)
                : (x > 21 ? 1 + Math.round((x - 21) * 1.4) : 1);
      if (top > 15) continue;
      const n = PX.hash(x, 7, 11);
      const c = x < 15 ? (n < 0.34 ? P.sd2 : (n < 0.72 ? P.sd1 : P.sd3))
                       : (n < 0.34 ? P.sd0 : (n < 0.72 ? P.sd1 : P.sd2));
      PX.vline(g, x, top, 16 - top, c);
      /* 짚 다발 마디 */
      const m = 2 + Math.floor(PX.hash(x, 2, 13) * 4);
      for (let y = top + m; y < 15; y += 5) PX.px(g, x, y, P.sd0);
    }
    /* 용마루 덮개 */
    PX.rect(g, 10, 1, 12, 1, P.sd3);
    PX.hline(g, 10, 2, 12, P.sd2);
    PX.px(g, 10, 1, P.sd4); PX.px(g, 11, 1, P.sd4);
    PX.dither(g, 18, 3, 13, 12, P.sd0, 1, 1);
    /* 처마 (들쭉날쭉) */
    for (let x = 0; x < 32; x++) {
      PX.px(g, x, 15, P.sd0);
      if (PX.hash(x, 15, 5) < 0.45) PX.px(g, x, 16, P.sd0);
    }
    /* 돌벽 */
    PX.rect(g, 3, 16, 26, 13, P.st2);
    masonry(g, 3, 16, 26, 13, 4, 7, 3, P.st1, P.st2, P.st3);
    PX.vline(g, 3, 16, 13, P.st3);
    PX.dither(g, 21, 16, 8, 13, P.st1, 1, 0);
    /* 창문 2개 */
    for (let i = 0; i < 2; i++) {
      const wx = i ? 22 : 5;
      PX.rect(g, wx, 19, 5, 4, P.wd1);
      PX.rect(g, wx + 1, 20, 3, 2, P.ink1);
      PX.px(g, wx + 1, 20, P.ink2);
      PX.hline(g, wx, 22, 5, P.st4);
      PX.hline(g, wx, 18, 5, P.wd2);
    }
    /* 나무 문 */
    PX.rect(g, 12, 18, 9, 1, P.wd3);
    PX.rect(g, 12, 19, 9, 10, P.wd1);
    PX.rect(g, 13, 20, 7, 9, P.wd2);
    for (let x = 13; x < 20; x += 2) PX.vline(g, x, 20, 9, P.wd3);
    for (let x = 14; x < 20; x += 2) PX.vline(g, x, 20, 9, P.wd1);
    PX.hline(g, 13, 20, 7, P.wd3);
    PX.hline(g, 13, 24, 7, P.wd0);
    PX.dither(g, 17, 20, 3, 9, P.wd0, 1, 1);
    PX.px(g, 19, 25, P.gd2); PX.px(g, 19, 26, P.gd1);
    /* 지대석 */
    stair(g, 2, 29, 28, 2, P.st3, P.st2, P.st0);
  }

  /* --- t : 신전 정면 48x44 (3x2) — 가장 공들인 오브젝트 --- */
  function artTemple(g) {
    /* 아크로테리온 */
    PX.rect(g, 22, 0, 4, 2, P.st4);
    PX.px(g, 22, 0, P.st5); PX.px(g, 25, 1, P.st2);
    PX.rect(g, 2, 9, 2, 2, P.st3); PX.rect(g, 44, 9, 2, 2, P.st2);

    /* 페디먼트(박공) */
    PX.poly(g, [[23, 2], [45, 11], [2, 11]], P.st4);
    PX.poly(g, [[24, 2], [45, 11], [24, 11]], P.st3);
    PX.dither(g, 21, 4, 7, 7, P.st4, 2, 0);
    /* 팀파눔(안쪽 오목한 면) */
    PX.poly(g, [[23, 4], [41, 10], [6, 10]], P.st2);
    PX.dither(g, 24, 6, 16, 4, P.st1, 1, 1);
    /* 부조 실루엣: 가운데 선 신 + 좌우 시종 + 모서리 와상 인물 */
    PX.rect(g, 22, 5, 2, 5, P.st4);            /* 중앙 신상 */
    PX.px(g, 22, 4, P.st5); PX.px(g, 23, 4, P.st4);
    PX.px(g, 20, 6, P.st4); PX.px(g, 21, 6, P.st4);
    PX.px(g, 24, 6, P.st3); PX.px(g, 25, 6, P.st3);
    PX.rect(g, 17, 7, 2, 3, P.st4); PX.px(g, 17, 6, P.st4); PX.px(g, 16, 8, P.st3);
    PX.rect(g, 28, 7, 2, 3, P.st3); PX.px(g, 28, 6, P.st3); PX.px(g, 30, 8, P.st3);
    PX.rect(g, 11, 8, 4, 2, P.st3); PX.px(g, 11, 7, P.st4); PX.px(g, 15, 9, P.st3);
    PX.rect(g, 32, 8, 4, 2, P.st2); PX.px(g, 35, 7, P.st3); PX.px(g, 31, 9, P.st2);
    PX.px(g, 9, 9, P.st3); PX.px(g, 38, 9, P.st2);
    /* 레이킹 코니스 */
    PX.line(g, 2, 11, 23, 2, P.st5);
    PX.line(g, 24, 2, 45, 11, P.st3);
    PX.line(g, 3, 11, 23, 3, P.st4);
    PX.line(g, 24, 3, 44, 11, P.st2);

    /* 코니스 + 프리즈 + 아키트레이브 */
    PX.rect(g, 1, 12, 46, 1, P.st4);
    PX.hline(g, 1, 12, 46, P.st5);
    PX.rect(g, 2, 13, 44, 2, P.st4);          /* 프리즈 바탕(메토프) */
    PX.dither(g, 26, 13, 20, 2, P.st3, 2, 0);
    const trig = [2, 10, 18, 27, 35, 43];
    for (let i = 0; i < trig.length; i++) {
      const x = trig[i];
      PX.rect(g, x, 13, 3, 2, P.st2);
      PX.vline(g, x, 13, 2, P.st1);
      PX.vline(g, x + 2, 13, 2, P.st1);
      PX.px(g, x + 1, 13, P.st3);
    }
    PX.rect(g, 2, 15, 44, 2, P.st3);          /* 아키트레이브 */
    PX.hline(g, 2, 15, 44, P.st4);
    PX.hline(g, 2, 16, 44, P.st2);
    PX.dither(g, 28, 15, 18, 2, P.st2, 1, 1);

    /* 켈라(안쪽 벽)와 문 — 기둥이 앞에 서 보이게 */
    PX.rect(g, 5, 17, 38, 17, P.st1);
    PX.dither(g, 5, 17, 38, 17, P.st0, 1, 0);
    PX.rect(g, 19, 21, 10, 13, P.ink2);
    PX.hline(g, 19, 21, 10, P.st1);
    PX.vline(g, 19, 21, 13, P.st1);
    PX.vline(g, 24, 22, 12, P.ink1);
    PX.px(g, 23, 27, P.gd1); PX.px(g, 25, 27, P.gd1);

    /* 기둥 4개 (홈 + 도리아식 주두) */
    const cx4 = [9, 17, 26, 34];
    for (let i = 0; i < 4; i++) {
      const x = cx4[i];
      /* 주두: 아바쿠스(사각 판) + 위로 벌어지는 에키누스 */
      PX.trapezoid(g, x - 1, x + 5, 17, x, x + 4, 19, P.st4);
      PX.rect(g, x - 1, 17, 7, 1, P.st5);
      PX.hline(g, x - 1, 18, 7, P.st3);
      PX.px(g, x + 5, 17, P.st3); PX.px(g, x + 4, 18, P.st2);
      /* 몸통 */
      cols(g, x, 20, 5, 14, [P.st3, P.st5, P.st4, P.st2, P.st1]);
      PX.hline(g, x, 25, 5, P.st2); PX.px(g, x + 1, 25, P.st4);
      PX.hline(g, x, 30, 5, P.st2); PX.px(g, x + 1, 30, P.st4);
      PX.dither(g, x + 3, 20, 2, 14, P.st1, 1, 1);
    }

    /* 계단 3단 */
    stair(g, 5, 34, 38, 3, P.st5, P.st4, P.st2);
    stair(g, 3, 37, 42, 3, P.st4, P.st3, P.st1);
    stair(g, 1, 40, 46, 3, P.st4, P.st3, P.st1);
    /* 계단 이음선으로 판석 느낌 */
    for (let x = 9; x < 44; x += 9) {
      PX.vline(g, x, 35, 2, P.st3); PX.vline(g, x + 2, 38, 2, P.st2); PX.vline(g, x - 2, 41, 2, P.st2);
    }
  }

  /* --- r : 뗏목 32x16 (2x1) --- */
  function artRaft(g) {
    /* 통나무 6개 */
    for (let i = 0; i < 6; i++) {
      const y = 3 + i * 2;
      PX.rect(g, 1, y, 30, 1, i % 2 ? P.wd3 : P.wd2);
      PX.rect(g, 1, y + 1, 30, 1, P.wd1);
      PX.px(g, 1, y, P.wd2); PX.px(g, 30, y, P.wd1); PX.px(g, 30, y + 1, P.wd0);
      /* 나뭇결 */
      for (let x = 3; x < 29; x += 5) PX.px(g, x + (i & 1), y, P.wd0);
    }
    /* 마구리(끝 나이테) */
    for (let i = 0; i < 6; i++) {
      const y = 3 + i * 2;
      PX.rect(g, 0, y, 2, 2, P.wd1);
      PX.px(g, 0, y, P.wd2); PX.px(g, 1, y + 1, P.wd0);
      PX.rect(g, 30, y, 2, 2, P.wd0);
      PX.px(g, 30, y, P.wd1);
    }
    /* 밧줄 결박 */
    for (let i = 0; i < 2; i++) {
      const x = i ? 23 : 6;
      PX.vline(g, x, 2, 13, P.iv1);
      PX.vline(g, x + 1, 2, 13, P.iv0);
      for (let y = 3; y < 15; y += 2) PX.px(g, x, y, P.iv2);
      PX.px(g, x, 2, P.iv2); PX.px(g, x + 1, 14, P.ink2);
    }
    /* 돛대 그루터기(부러진 채) */
    PX.rect(g, 14, 0, 4, 8, P.wd2);
    PX.vline(g, 14, 0, 8, P.wd3);
    PX.vline(g, 17, 0, 8, P.wd1);
    PX.px(g, 14, 0, P.wd4); PX.px(g, 16, 0, P.wd1); PX.px(g, 15, 1, P.wd4);
    PX.px(g, 17, 1, P.wd0); PX.px(g, 15, 0, P.wd3);
    /* 밧줄 뭉치 */
    PX.ellipse(g, 25, 9, 2, 1, P.iv1);
    PX.px(g, 24, 9, P.iv2); PX.px(g, 26, 10, P.iv0);
  }

  /* --- V : 검은 배 48x30 (3x2) --- */
  function artShip(g) {
    /* 돛대 */
    PX.rect(g, 23, 2, 2, 16, P.wd2);
    PX.vline(g, 23, 2, 16, P.wd3);
    PX.vline(g, 24, 2, 16, P.wd1);
    PX.px(g, 23, 1, P.wd3); PX.px(g, 24, 1, P.wd1);
    /* 활대 */
    PX.rect(g, 13, 5, 22, 1, P.wd3);
    PX.rect(g, 13, 6, 22, 1, P.wd1);
    PX.px(g, 13, 5, P.wd4); PX.px(g, 34, 6, P.wd0);
    /* 접힌 사각 돛 */
    PX.rect(g, 15, 7, 18, 1, P.iv3);
    PX.rect(g, 14, 8, 20, 2, P.iv2);
    PX.rect(g, 15, 10, 18, 1, P.iv1);
    PX.hline(g, 15, 7, 18, P.iv4);
    PX.dither(g, 25, 8, 9, 3, P.iv1, 1, 1);
    for (let x = 16; x < 33; x += 4) { PX.vline(g, x, 7, 4, P.iv0); PX.px(g, x, 11, P.iv1); }
    /* 삭구 */
    PX.line(g, 23, 3, 8, 16, P.iv0);
    PX.line(g, 25, 3, 40, 16, P.iv0);
    /* 노 */
    for (let i = 0; i < 6; i++) {
      const x = 12 + i * 5;
      PX.line(g, x, 22, x - 5, 27, P.wd2);
      PX.line(g, x, 23, x - 5, 28, P.wd1);
      PX.rect(g, x - 6, 26, 2, 3, P.wd3);
      PX.px(g, x - 6, 26, P.wd4); PX.px(g, x - 5, 28, P.wd1);
    }
    /* 선체(검은 배) */
    PX.poly(g, [[5, 17], [42, 17], [38, 25], [10, 25]], P.ink2);
    PX.hline(g, 5, 17, 38, P.wd2);
    PX.hline(g, 5, 18, 38, P.wd1);
    PX.dither(g, 24, 19, 18, 6, P.ink1, 1, 1);
    PX.poly(g, [[10, 24], [38, 24], [37, 25], [11, 25]], P.ink1);
    /* 뱃전 띠 */
    PX.line(g, 6, 20, 41, 20, P.rd1);
    PX.line(g, 6, 21, 41, 21, P.rd0);
    /* 휘어 올라간 뱃머리(왼쪽) */
    PX.poly(g, [[1, 9], [4, 10], [7, 17], [4, 17], [1, 13]], P.ink2);
    PX.line(g, 1, 9, 1, 13, P.wd2);
    PX.px(g, 2, 9, P.wd3); PX.px(g, 1, 10, P.wd2);
    /* 충각(램) */
    PX.poly(g, [[0, 21], [6, 19], [6, 24], [1, 24]], P.gd1);
    PX.hline(g, 1, 20, 5, P.gd2);
    PX.px(g, 0, 21, P.gd3); PX.px(g, 5, 23, P.gd0); PX.px(g, 3, 23, P.gd0);
    /* 눈 문양 */
    PX.ellipse(g, 11, 20, 3, 2, P.iv4);
    PX.ellipseOutline(g, 11, 20, 3, 2, P.ink0);
    PX.rect(g, 10, 19, 2, 2, P.ink0);
    PX.px(g, 10, 19, P.se4);
    PX.px(g, 8, 18, P.rd2); PX.px(g, 14, 18, P.rd2); PX.px(g, 11, 22, P.rd1);
    /* 고물(오른쪽) — 아플라스톤 */
    PX.poly(g, [[46, 7], [43, 9], [41, 17], [44, 17], [46, 11]], P.ink2);
    PX.line(g, 46, 7, 43, 9, P.wd2);
    PX.px(g, 45, 8, P.wd3); PX.px(g, 46, 9, P.wd1);
    PX.px(g, 45, 6, P.wd2); PX.px(g, 44, 7, P.wd3);
    /* 방패 */
    for (let i = 0; i < 4; i++) {
      const x = 17 + i * 6;
      PX.ellipse(g, x, 16, 2, 2, i % 2 ? P.rd1 : P.gd1);
      PX.ellipseOutline(g, x, 16, 2, 2, i % 2 ? P.rd0 : P.gd0);
      PX.px(g, x, 16, P.st3); PX.px(g, x - 1, 15, i % 2 ? P.rd2 : P.gd2);
    }
    /* 물살 */
    PX.dither(g, 6, 25, 36, 1, P.se3, 2, 0);
    PX.px(g, 8, 26, P.se4); PX.px(g, 20, 26, P.se4); PX.px(g, 33, 26, P.se4);
  }

  /* ===================== 정의 표 (SPEC §3 순서) ===================== */

  const DEF = {};
  function def(ch, w, h, fw, fh, solid, art, opts) {
    const d = { ch: ch, w: w, h: h, fw: fw, fh: fh, solid: solid, art: art, frames: 1, sh: null, glow: null };
    if (opts) for (const k in opts) d[k] = opts[k];
    d.ox = Math.round((fw * 16 - w) / 2);
    DEF[ch] = d;
  }

  /*   ch  w   h  fw fh solid  art               opts */
  def('T', 16, 24, 1, 1, true, artOlive,        { sh: [8, 22, 6, 2, 0.32] });
  def('P', 16, 30, 1, 1, true, artCypress,      { sh: [8, 28, 5, 2, 0.32] });
  def('L', 18, 28, 1, 1, true, artPalm,         { sh: [9, 26, 6, 2, 0.32] });
  def('R', 16, 14, 1, 1, true, artRock,         { sh: [8, 12, 7, 2, 0.34] });
  def('C', 14, 32, 1, 1, true, artColumn,       { sh: [7, 30, 7, 2, 0.32] });
  def('c', 14, 16, 1, 1, true, artColumnBroken, { sh: [7, 15, 7, 2, 0.32] });
  def('B', 12, 22, 1, 1, true, artBrazier,      { frames: 4, glow: glowBrazier, sh: [6, 21, 5, 2, 0.3] });
  def('A', 16, 16, 1, 1, true, artAltar,        { sh: [8, 15, 8, 2, 0.3] });
  def('U', 12, 16, 1, 1, true, artAmphora,      { sh: [6, 15, 5, 2, 0.32] });
  def('S', 16, 30, 1, 1, true, artStatue,       { sh: [8, 29, 8, 2, 0.3] });
  def('n', 16, 24, 1, 1, true, artThrone,       { sh: [8, 23, 7, 2, 0.32] });
  def('m', 18, 20, 1, 1, true, artLoom,         { sh: [9, 19, 8, 2, 0.3] });
  def('k', 22, 16, 1, 1, true, artOx,           { sh: [12, 14, 9, 2, 0.3] });
  def('x', 14, 12, 1, 1, true, artChest,        { sh: [7, 11, 6, 2, 0.32] });
  def('b', 14, 10, 1, 1, false, artBones,       { sh: [7, 9, 6, 2, 0.26] });
  def('l', 14, 10, 1, 1, false, artLotus,       { sh: [7, 9, 6, 2, 0.22] });
  def('v', 14, 12, 1, 1, false, artBush,        { sh: [7, 11, 6, 2, 0.28] });
  def('G', 32, 36, 2, 1, true, artGate,         { sh: [16, 35, 16, 3, 0.3] });
  def('H', 32, 32, 2, 2, true, artHut,          { sh: [16, 31, 16, 3, 0.3] });
  def('t', 48, 44, 3, 2, true, artTemple,       { sh: [24, 43, 24, 3, 0.3] });
  def('r', 32, 16, 2, 1, true, artRaft,         { sh: [16, 15, 15, 2, 0.26] });
  def('V', 48, 30, 3, 2, true, artShip,         { sh: [24, 28, 20, 3, 0.28] });

  const CHARS = Object.keys(DEF).join('');

  /* ===================== 렌더 + 캐시 ===================== */

  function compose(d, f) {
    const art = PX.canvas(d.w, d.h);
    const ag = PX.ctx2d(art);
    d.art(ag, f);
    PX.outline(art, P.ink0);

    const out = PX.canvas(d.w, d.h);
    const og = PX.ctx2d(out);
    const s = d.sh || [d.w >> 1, d.h - 2, Math.max(3, (d.w * 0.34) | 0), 2, 0.3];
    if (s[4] > 0) PX.shadow(og, s[0], s[1], s[2], s[3], s[4]);
    if (d.glow) d.glow(og, f);
    og.drawImage(art, 0, 0);
    return out;
  }

  const CACHE = {};
  function sheet(ch) {
    let s = CACHE[ch];
    if (s) return s;
    const d = DEF[ch];
    if (!d) return null;
    s = [];
    for (let f = 0; f < d.frames; f++) s.push(compose(d, f));
    CACHE[ch] = s;
    return s;
  }

  /* ===================== 공개 API (SPEC §4-2) ===================== */

  /* 앵커 = 좌측 하단 타일. 그림 밑변이 ty*16+16 에 닿는다. */
  function draw(g, ch, tx, ty, frame) {
    if (drawHDProp(g, ch, tx, ty, frame)) return;
    const d = DEF[ch];
    if (!d) return;
    const s = sheet(ch);
    const n = s.length;
    const img = n > 1 ? s[(((frame | 0) % n) + n) % n] : s[0];
    g.drawImage(img, (tx * 16 + d.ox) | 0, (ty * 16 + 16 - d.h) | 0);
  }

  /* 막는 타일 오프셋 (앵커 기준). 통행 가능하면 [] */
  function foot(ch) {
    const d = DEF[ch];
    if (!d || !d.solid) return [];
    const out = [];
    for (let j = 0; j < d.fh; j++) for (let i = 0; i < d.fw; i++) out.push([i, -j]);
    return out;
  }

  function height(ch) { const d = DEF[ch]; return d ? d.h : 0; }
  function width(ch) { const d = DEF[ch]; return d ? d.w : 0; }
  function has(ch) { return !!DEF[ch]; }
  /* 캐시 캔버스 직접 접근 (미리보기·툴용) */
  function get(ch, frame) {
    const s = sheet(ch);
    if (!s) return null;
    const n = s.length;
    return n > 1 ? s[(((frame | 0) % n) + n) % n] : s[0];
  }

  /* 모듈 로드 시 전부 1회 렌더해 캐시해 둔다 (draw 는 drawImage 만) */
  if (typeof document !== 'undefined' && document.createElement) {
    for (let i = 0; i < CHARS.length; i++) sheet(CHARS[i]);
  }

  return { draw: draw, foot: foot, height: height, width: width, has: has, get: get, CHARS: CHARS };
})();
