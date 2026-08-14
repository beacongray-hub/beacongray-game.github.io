/* engine/fx.js — 항해지도 화면의 조명·후처리 엔진 (전역 FX)
   의존: PX, PAL  (tiles/props/sprites 보다 뒤, main.js 보다 앞에 로드)

   왜 이 모듈이 필요한가
   ────────────────────────────────────────────────────────────────
   타일·소품 그림 자체는 16x16 도트로 충분히 정교하다. 그런데도 지도가 "그래픽이 낮다"고
   느껴지는 이유는 그림의 해상도가 아니라 화면 전체를 묶어 주는 층이 없기 때문이다.
   2000년대 2D 게임(젤다 이상한 모자·황금의 태양·라그나로크)이 같은 도트로 훨씬 좋아
   보이는 근거는 다음 여섯 가지이며, 이 모듈이 그 여섯을 전부 담당한다.

     1) 대면적 명암 변조(macro tone) — 바닥이 넓게 밝고 어두워져 타일 반복이 사라진다
     2) 흐르는 구름 그림자          — 화면이 살아 있다는 신호
     3) 방향성 그림자 + 접지 AO      — 소품·인물이 땅에 "붙는다" (깊이감의 90%)
     4) 물의 커스틱·햇빛 반짝임      — 바다가 평면 무늬에서 액체로 바뀐다
     5) 빛기둥·먼지·불티(파티클)     — 공간에 공기가 생긴다
     6) 블룸 + 색보정 + 비네트       — 화면이 한 장의 그림으로 묶인다

   구조
     · 세계는 보이는 캔버스와 같은 크기(SS배 슈퍼샘플)의 오프스크린 버퍼에 그린다.
     · 도트 원본은 nearest 로 확대해 선명함을 유지하고, 조명·그림자·블룸만 부드럽게 얹는다.
     · 블러는 ctx.filter 대신 "축소 → 부드럽게 확대"로 만든다. 모든 브라우저에서 같고 더 빠르다.
     · 프레임 시간을 재서 느린 기기에서는 품질을 자동으로 한 단계씩 낮춘다.
*/
"use strict";
const FX = (function () {

  const T = 16;
  /* 그림자 변환. 광원은 왼쪽 위 뒤편이므로 그림자는 오른쪽 "아래"로 눕는다.
     세로 성분이 음수라 실루엣이 위아래로 뒤집히는데, 그게 맞다 —
     바닥에 누운 그림자에서는 물체의 꼭대기가 가장 멀리(=화면 아래로) 간다. */
  const SUN = [-0.55, -0.42];

  /* ================================================================
     0. 버퍼

     세계 버퍼는 논리 해상도(384x320) 그대로 쓴다. 조명·그림자·번짐은 화면 전체를
     덮는 합성이라 비용이 픽셀 수에 정비례하는데, 2배 버퍼에서 하면 그 비용도 4배가 된다.
     그래서 모든 층을 1배에서 합성하고, 마지막에 단 한 번 2배로 nearest 확대한다.
     도트의 선명함은 그대로이고(정수배 확대), 후처리 비용만 1/4 로 준다.
     ================================================================ */
  const SS = 1;
  let W = 0, H = 0;
  let world = null, wg = null;    /* 세계 버퍼 */
  let shad = null, sg = null;     /* 그림자 레이어 */
  let half = null, hg = null;     /* 1/2 임시판 (물·구름·그림자 합치기) */
  let hw = 0, hh = 0;
  let b4 = null, b4g = null;      /* 블룸 1/4 */
  let b4b = null, b4bg = null;    /* 블룸 1/4 사본 */
  let b8 = null, b8g = null;      /* 블룸 1/8 */
  let cur = null;                 /* 이번 프레임 상태 */

  function ctxOf(cv, smooth) {
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = !!smooth;
    if (smooth) g.imageSmoothingQuality = 'high';
    return g;
  }
  function reset(g, smooth) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.imageSmoothingEnabled = !!smooth;
    return g;
  }
  function ensure(w, h) {
    if (world && W === w && H === h) return;
    W = w; H = h;
    world = PX.canvas(W, H); wg = ctxOf(world, false);
    shad = PX.canvas(W, H); sg = ctxOf(shad, false);
    hw = Math.max(4, Math.ceil(W / 2)); hh = Math.max(4, Math.ceil(H / 2));
    half = PX.canvas(hw, hh); hg = ctxOf(half, true);
    const q4w = Math.max(2, Math.ceil(W / 4)), q4h = Math.max(2, Math.ceil(H / 4));
    const q8w = Math.max(2, Math.ceil(W / 8)), q8h = Math.max(2, Math.ceil(H / 8));
    b4 = PX.canvas(q4w, q4h); b4g = ctxOf(b4, true);
    b4b = PX.canvas(q4w, q4h); b4bg = ctxOf(b4b, true);
    b8 = PX.canvas(q8w, q8h); b8g = ctxOf(b8, true);
  }
  /* 월드 좌표 → 디바이스 픽셀 변환을 걸어 준다 */
  function camXf(g, cam) { g.setTransform(SS, 0, 0, SS, -cam.x * SS, -cam.y * SS); }

  /* ================================================================
     1. 품질 (느린 기기 자동 강하)
     ================================================================ */
  let quality = 2;        /* 2 높음 · 1 보통 · 0 끔 */
  let forced = null;      /* 사용자가 직접 고른 값 */
  let ema = 16, samples = 0, lastStamp = 0;
  function measure() {
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (lastStamp) {
      const raw = now - lastStamp;
      /* 250ms 를 넘는 간격은 창을 가렸거나 다른 일이 끼어든 것이다. 성능 판단에서 뺀다 */
      if (raw > 250) { lastStamp = now; return; }
      const dt = Math.min(150, raw);
      ema = ema * 0.92 + dt * 0.08;
      samples++;
      if (forced === null && samples > 120) {
        if (ema > 30 && quality > 0) { quality--; samples = 0; ema = 16; }
      }
    }
    lastStamp = now;
  }

  /* ================================================================
     2. 절차적 텍스처 (씬마다 1회)
     ================================================================ */
  /* 저주파 노이즈: 작게 만들고 부드럽게 확대해 "얼룩 없는 큰 덩어리"를 얻는다 */
  function noise(w, h, seed, lo, hi, tint) {
    const c = PX.canvas(w, h), g = ctxOf(c, false);
    const img = g.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const n = PX.hash(x * 13 + seed, y * 29 + seed * 3, seed);
      const v = lo + (hi - lo) * n, i = (y * w + x) * 4;
      d[i] = Math.min(255, v * (tint ? tint[0] : 1));
      d[i + 1] = Math.min(255, v * (tint ? tint[1] : 1));
      d[i + 2] = Math.min(255, v * (tint ? tint[2] : 1));
      d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  function upscale(src, k) {
    const c = PX.canvas(Math.max(2, src.width * k), Math.max(2, src.height * k));
    const g = ctxOf(c, true);
    g.drawImage(src, 0, 0, c.width, c.height);
    return c;
  }
  /* 물 커스틱: 사인 합으로 만든 이어 붙는(tileable) 그물 무늬 */
  function caustic(size, seed) {
    const c = PX.canvas(size, size), g = ctxOf(c, false);
    const img = g.createImageData(size, size), d = img.data;
    const p = Math.PI * 2, ph = seed * 1.7;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size * p, v = y / size * p;
      let n = Math.sin(u + Math.cos(v * 2 + ph)) + Math.sin(v * 2 + Math.cos(u * 3 + ph)) * 0.8
            + Math.sin((u + v) * 3 + ph) * 0.45;
      n = n / 2.25;
      const a = Math.pow(Math.max(0, n), 3.2);
      const i = (y * size + x) * 4;
      d[i] = 255; d[i + 1] = 251; d[i + 2] = 228; d[i + 3] = (a * 235) | 0;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  /* 부드러운 점 (파티클·글로우 공용) */
  const DOTS = {};
  function dot(col, r) {
    const key = col + '|' + r;
    if (DOTS[key]) return DOTS[key];
    const s = Math.max(4, r * 2), c = PX.canvas(s, s), g = ctxOf(c, true);
    const rg = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    rg.addColorStop(0, col); rg.addColorStop(0.42, hexA(col, 0.55)); rg.addColorStop(1, hexA(col, 0));
    g.fillStyle = rg; g.fillRect(0, 0, s, s);
    DOTS[key] = c;
    return c;
  }
  function hexA(hex, a) {
    const c = PX.hex2rgb(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }
  /* 타일 마스크: 1타일 = 1픽셀 */
  function mask(m, test) {
    const mw = m.ground[0].length, mh = m.ground.length;
    const c = PX.canvas(mw, mh), g = ctxOf(c, false);
    let any = false;
    g.fillStyle = '#ffffff';
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
      if (test(m.ground[y][x])) { g.fillRect(x, y, 1, 1); any = true; }
    }
    return { cv: c, any: any };
  }

  /* ================================================================
     3. 씬 프로필 — 장소마다 다른 공기
     ================================================================ */
  /* grade: 색보정 이름 · tone: 대면적 명암 세기 · cloud: 구름 그림자 세기
     water: 물 연출 세기 · shafts: 빛기둥(타일 좌표) · parts: 파티클 목록 */
  /* hi/lo = 위·아래 색조(overlay) · key = 왼쪽 위 주광(lighter) · mul = 전체 어둡기(multiply)
     vig = 비네트 · warm = 온도 보정. 값은 "도트 원본 색을 해치지 않는 선"에서 낮게 잡는다. */
  const GRADE = {
    day:    { hi: ['#bfe4ff', 0.10], lo: ['#ffce85', 0.10], key: ['#fff4d2', 0.055], vig: 0.34, warm: 0.05 },
    isle:   { hi: ['#a8dcff', 0.11], lo: ['#ffd79a', 0.10], key: ['#fff6dc', 0.06],  vig: 0.33, warm: 0.04 },
    dusk:   { hi: ['#ff9b57', 0.15], lo: ['#2b1630', 0.20], key: ['#ffb469', 0.07],  vig: 0.46, warm: 0.09,
              mul: ['#6b5a86', 0.14] },
    dream:  { hi: ['#ffd0ea', 0.13], lo: ['#ffe6a8', 0.11], key: ['#fff0f6', 0.06],  vig: 0.31, warm: 0.03 },
    cave:   { hi: ['#3f5f96', 0.12], lo: ['#0b0812', 0.30], key: ['#ffb663', 0.04],  vig: 0.54, warm: 0.10,
              mul: ['#5b5570', 0.34] },
    forest: { hi: ['#9fe6b6', 0.12], lo: ['#122a1c', 0.17], key: ['#eaffc9', 0.06],  vig: 0.40, warm: 0.03,
              mul: ['#9aa88f', 0.10] },
    under:  { hi: ['#7f7bd6', 0.13], lo: ['#150c22', 0.30], key: ['#b9a6ff', 0.04],  vig: 0.50, warm: 0.02,
              mul: ['#6a6090', 0.28] },
    sea:    { hi: ['#cdefff', 0.12], lo: ['#0d3550', 0.17], key: ['#f2fbff', 0.055], vig: 0.36, warm: 0.03 },
    sun:    { hi: ['#ffe9a8', 0.13], lo: ['#c98a3a', 0.11], key: ['#fff8d6', 0.08],  vig: 0.31, warm: 0.10 },
    hall:   { hi: ['#c8dcff', 0.10], lo: ['#2a1b10', 0.18], key: ['#ffe2a4', 0.06],  vig: 0.44, warm: 0.08,
              mul: ['#b9aa9a', 0.12] }
  };
  const PROFILE = {
    ogygia:     { grade: 'isle',  tone: 1.0, cloud: 0.9, water: 1.0, parts: ['spray', 'pollen'] },
    scheria:    { grade: 'day',   tone: 1.0, cloud: 1.0, water: 0.8, parts: ['pollen', 'leaf'] },
    cicones:    { grade: 'dusk',  tone: 1.1, cloud: 0.5, water: 0.7, parts: ['ember', 'soot'],
                  shafts: [[24, 2, 4, 16, 0.07], [33, 2, 3, 15, 0.055]] },
    lotus:      { grade: 'dream', tone: 0.9, cloud: 0.7, water: 0.9, parts: ['petal', 'pollen', 'haze'] },
    cyclops:    { grade: 'cave',  tone: 1.2, cloud: 0.0, water: 0.0, parts: ['dust', 'drip'],
                  shafts: [[20, 2, 5, 17, 0.13], [25, 4, 3, 14, 0.09]] },
    aeaea:      { grade: 'forest',tone: 1.1, cloud: 0.8, water: 0.6, parts: ['firefly', 'dust', 'pollen'],
                  shafts: [[9, 2, 3, 15, 0.10], [21, 2, 4, 13, 0.11], [32, 3, 3, 12, 0.08]] },
    underworld: { grade: 'under', tone: 1.2, cloud: 0.0, water: 0.8, parts: ['ash', 'wisp'],
                  shafts: [[18, 2, 4, 18, 0.08]] },
    sirens:     { grade: 'sea',   tone: 1.0, cloud: 0.9, water: 1.2, parts: ['spray', 'gull'] },
    thrinacia:  { grade: 'sun',   tone: 1.0, cloud: 1.1, water: 0.8, parts: ['pollen', 'heat', 'leaf'] },
    ithaca:     { grade: 'hall',  tone: 1.0, cloud: 0.3, water: 0.0, parts: ['dust', 'soot'],
                  shafts: [[9, 3, 4, 9, 0.10], [20, 3, 4, 9, 0.09], [30, 3, 4, 9, 0.10]] }
  };
  /* 파티클 규격: n 개수 · col 색 · r 반지름 · vx,vy 속도(px/tick) · wob 흔들림 · a 밝기 */
  const PARTS = {
    spray:   { n: 30, col: '#e6f8ff', r: 3, vx: 0.16, vy: -0.05, wob: 5, a: 0.42, blend: 'lighter' },
    pollen:  { n: 26, col: '#ffeeb4', r: 3, vx: 0.07, vy: -0.03, wob: 7, a: 0.34, blend: 'lighter' },
    petal:   { n: 22, col: '#ffd7ea', r: 4, vx: 0.11, vy: 0.05, wob: 9, a: 0.36, blend: 'lighter' },
    leaf:    { n: 12, col: '#cfe89a', r: 3, vx: 0.13, vy: 0.06, wob: 8, a: 0.26, blend: 'lighter' },
    dust:    { n: 34, col: '#fff2cf', r: 2, vx: 0.03, vy: -0.02, wob: 4, a: 0.30, blend: 'lighter' },
    drip:    { n: 10, col: '#bfe2ff', r: 2, vx: 0.00, vy: 0.55, wob: 1, a: 0.34, blend: 'lighter' },
    ember:   { n: 24, col: '#ffb24a', r: 3, vx: 0.05, vy: -0.22, wob: 6, a: 0.50, blend: 'lighter' },
    soot:    { n: 16, col: '#3a3038', r: 7, vx: 0.09, vy: -0.06, wob: 8, a: 0.22, blend: 'source-over' },
    ash:     { n: 30, col: '#cfc7d8', r: 3, vx: 0.04, vy: 0.09, wob: 7, a: 0.28, blend: 'lighter' },
    wisp:    { n: 9,  col: '#b7a4ff', r: 12, vx: 0.03, vy: -0.05, wob: 12, a: 0.20, blend: 'lighter' },
    haze:    { n: 8,  col: '#ffe9f6', r: 16, vx: 0.05, vy: -0.02, wob: 14, a: 0.16, blend: 'lighter' },
    heat:    { n: 14, col: '#ffe2a0', r: 9, vx: 0.06, vy: -0.10, wob: 10, a: 0.16, blend: 'lighter' },
    firefly: { n: 14, col: '#d4ff8e', r: 3, vx: 0.05, vy: -0.04, wob: 14, a: 0.52, blend: 'lighter' },
    gull:    { n: 5,  col: '#f4fbff', r: 3, vx: 0.22, vy: -0.01, wob: 10, a: 0.30, blend: 'lighter' }
  };

  /* ---------------------------------------------------------------
     색보정 텍스처 굽기
     색보정은 카메라·시간과 무관한 고정 화면 오버레이다. 매 프레임 그라데이션을
     다섯 번 칠하는 대신, "어둡게(곱하기) 한 장 + 밝게(더하기) 한 장"으로 미리 구워
     프레임마다 두 번만 합성한다.
     --------------------------------------------------------------- */
  const GBAKE = {};
  function gradeTex(name, gd) {
    const key = name + '@' + W + 'x' + H;
    let t = GBAKE[key];
    if (t) return t;
    const w = Math.max(16, W >> 1), h = Math.max(16, H >> 1);
    /* (1) 곱하기 판 : 흰 바닥에서 시작해 어두워질 요소만 곱해 넣는다 */
    const dk = PX.canvas(w, h), a = ctxOf(dk, true);
    a.fillStyle = '#ffffff'; a.fillRect(0, 0, w, h);
    a.globalCompositeOperation = 'multiply';
    const lg = a.createLinearGradient(0, h * 0.35, 0, h);
    lg.addColorStop(0, hexA(gd.lo[0], 0));
    lg.addColorStop(1, hexA(gd.lo[0], gd.lo[1] * 1.25));
    a.fillStyle = lg; a.fillRect(0, 0, w, h);
    if (gd.mul) { a.fillStyle = hexA(gd.mul[0], gd.mul[1]); a.fillRect(0, 0, w, h); }
    if (gd.warm > 0) { a.fillStyle = hexA('#ffd7a0', gd.warm * 0.9); a.fillRect(0, 0, w, h); }
    const rg = a.createRadialGradient(w / 2, h * 0.46, Math.min(w, h) * 0.30,
                                      w / 2, h * 0.5, Math.max(w, h) * 0.76);
    rg.addColorStop(0, 'rgba(255,255,255,0)');
    rg.addColorStop(0.45, hexA('#3a3550', gd.vig * 0.13));
    rg.addColorStop(0.72, hexA('#3a3550', gd.vig * 0.50));
    rg.addColorStop(1, hexA('#241f38', gd.vig));
    a.fillStyle = rg; a.fillRect(0, 0, w, h);
    /* (2) 더하기 판 : 검은 바닥에 밝아질 요소만 얹는다.
       그라데이션이 알파 0 으로 "꺾이면" 그 자리에 눈에 보이는 띠(마하 밴드)가 생긴다.
       중간 정지점을 넣어 기울기가 완만하게 사그라지도록 한다. */
    const lt = PX.canvas(w, h), b = ctxOf(lt, true);
    b.fillStyle = '#000000'; b.fillRect(0, 0, w, h);
    b.globalCompositeOperation = 'lighter';
    const hi = gd.hi[1] * 0.62;
    const hgr = b.createLinearGradient(0, 0, 0, h);
    hgr.addColorStop(0, hexA(gd.hi[0], hi));
    hgr.addColorStop(0.35, hexA(gd.hi[0], hi * 0.34));
    hgr.addColorStop(0.70, hexA(gd.hi[0], hi * 0.06));
    hgr.addColorStop(1, hexA(gd.hi[0], 0));
    b.fillStyle = hgr; b.fillRect(0, 0, w, h);
    const kk = gd.key[1];
    const kg = b.createLinearGradient(0, 0, w * 0.95, h * 1.05);
    kg.addColorStop(0, hexA(gd.key[0], kk));
    kg.addColorStop(0.35, hexA(gd.key[0], kk * 0.36));
    kg.addColorStop(0.72, hexA(gd.key[0], kk * 0.07));
    kg.addColorStop(1, hexA(gd.key[0], 0));
    b.fillStyle = kg; b.fillRect(0, 0, w, h);
    t = { dk: dk, lt: lt };
    GBAKE[key] = t;
    return t;
  }

  const cache = {};
  function sceneData(m) {
    let c = cache[m.scene];
    if (c) return c;
    const mw = m.ground[0].length, mh = m.ground.length;
    const seed = 0; let s = 0;
    for (let i = 0; i < m.scene.length; i++) s = (s * 31 + m.scene.charCodeAt(i)) % 9973;
    c = {
      mw: mw, mh: mh, seed: s,
      prof: PROFILE[m.scene] || PROFILE.ogygia,
      water: mask(m, ch => ch === '~' || ch === '_'),
      wall: mask(m, ch => ch === '#' || ch === '^'),
      /* 대면적 명암 : 3~4타일짜리 덩어리. 폭이 크면 얼룩(때)처럼 보이므로 대비를 얕게 잡는다.
         볕든 자리(lit)는 정적이므로 같은 판에 미리 구워 넣어 프레임당 합성 횟수를 줄인다 */
      tone: bakeTone(mw, mh, s),
      cloud: upscale(noise(Math.max(6, Math.ceil(mw / 3.2)), Math.max(4, Math.ceil(mh / 3.2)), s + 47, 176, 255, null), 5),
      ca1: caustic(64, 1), ca2: caustic(64, 2.6),
      glint: null
    };
    if (c.water.any) c.glint = bakeGlint(mw, mh);
    cache[m.scene] = c;
    return c;
  }
  /* 곱하기용 지형 명암판 하나로 합치기 */
  function bakeTone(mw, mh, s) {
    const base = upscale(noise(Math.max(6, Math.ceil(mw / 3.4)), Math.max(4, Math.ceil(mh / 3.4)), s + 11, 206, 255, [0.99, 0.99, 1.03]), 5);
    const lit = upscale(noise(Math.max(5, Math.ceil(mw / 4.5)), Math.max(4, Math.ceil(mh / 4.5)), s + 29, 40, 255, [1.0, 0.97, 0.86]), 6);
    const g = ctxOf(base, true);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.055;
    g.drawImage(lit, 0, 0, base.width, base.height);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    return base;
  }
  /* 물에 비치는 해 — 월드 좌표에 고정된 넓은 광택. 매 프레임 그라데이션을 만들지 않는다 */
  function bakeGlint(mw, mh) {
    const w = Math.max(24, (mw * T) >> 3), h = Math.max(16, (mh * T) >> 3);
    const c = PX.canvas(w, h), g = ctxOf(c, true);
    const cx = w * 0.30, cy = h * 0.16, r = Math.max(w, h) * 0.62;
    const rg = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    rg.addColorStop(0, 'rgba(255,247,214,0.50)');
    rg.addColorStop(0.45, 'rgba(190,230,255,0.16)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
    return c;
  }

  /* ================================================================
     4. 프레임 시작 — 세계 버퍼를 비우고 카메라 변환을 건다
     ================================================================ */
  function begin(canvas, m, cam, tick, vw, vh) {
    ensure(vw, vh);
    const d = sceneData(m);
    cur = { m: m, cam: cam, tick: tick, vw: vw, vh: vh, d: d, prof: d.prof, q: quality };
    reset(wg, false); wg.clearRect(0, 0, W, H); camXf(wg, cam);
    reset(sg, false); sg.clearRect(0, 0, W, H);
    return wg;
  }

  /* ================================================================
     5. 바닥 패스 — 타일을 다 깐 직후에 호출
        (1) 대면적 명암  (2) 구름 그림자  (3) 물 커스틱·반짝임  (4) 벽 그림자·AO
     ================================================================ */
  function ground() {
    if (!cur || quality <= 0) return;
    const { m, cam, tick, d, prof } = cur;
    const MW = d.mw * T, MH = d.mh * T;
    const g = wg;

    /* (1)+(2) 대면적 명암과 흐르는 구름 그림자.
       둘 다 "곱하기" 판이므로 절반 크기 임시판에서 먼저 합치고 화면에는 한 번만 얹는다 */
    if (prof.tone > 0) {
      const cloudOn = prof.cloud > 0 && quality >= 2;
      if (cloudOn) {
        const ox = Math.sin(tick * 0.0016) * (5 * T), oy = Math.cos(tick * 0.0011) * (3 * T);
        reset(hg, true); hg.clearRect(0, 0, hw, hh);
        hg.setTransform(0.5, 0, 0, 0.5, -cam.x * 0.5, -cam.y * 0.5);
        hg.drawImage(d.tone, 0, 0, MW, MH);
        hg.globalCompositeOperation = 'multiply';
        hg.globalAlpha = 0.34 * prof.cloud;
        hg.drawImage(d.cloud, -6 * T + ox, -4 * T + oy, MW + 12 * T, MH + 8 * T);
        reset(g, true);
        g.globalCompositeOperation = 'multiply';
        g.globalAlpha = 0.50 * prof.tone;
        g.drawImage(half, 0, 0, W, H);
      } else {
        reset(g, true); camXf(g, cam); g.imageSmoothingEnabled = true;
        g.globalCompositeOperation = 'multiply';
        g.globalAlpha = 0.50 * prof.tone;
        g.drawImage(d.tone, 0, 0, MW, MH);
      }
    }

    /* (3) 물 — 커스틱 두 겹(반대 방향) + 해 광택. 절반 크기에서 만들고 물 타일에만 남긴다 */
    if (prof.water > 0 && d.water.any) {
      reset(hg, true); hg.clearRect(0, 0, hw, hh);
      hg.globalCompositeOperation = 'lighter';
      const k = 0.4;                                        /* 커스틱 한 칸 ≈ 1.6타일 */
      paintPattern(hg, d.ca1, tick * 0.11, tick * 0.065, k, 0.60, hw, hh);
      if (quality >= 2) paintPattern(hg, d.ca2, -tick * 0.075, tick * 0.045, k * 1.45, 0.42, hw, hh);
      hg.setTransform(0.5, 0, 0, 0.5, -cam.x * 0.5, -cam.y * 0.5);
      hg.globalAlpha = 1; hg.globalCompositeOperation = 'lighter';
      hg.drawImage(d.glint, 0, 0, MW, MH);
      /* 물 마스크로 잘라내기 */
      hg.globalCompositeOperation = 'destination-in';
      hg.imageSmoothingEnabled = false;
      hg.drawImage(d.water.cv, 0, 0, MW, MH);
      /* 세계에 얹기 */
      reset(g, true);
      g.globalCompositeOperation = 'screen';
      g.globalAlpha = 0.34 * Math.min(1.4, prof.water);
      g.drawImage(half, 0, 0, W, H);
    }

    /* (4) 벽·절벽이 바닥에 드리우는 그림자 → 그림자 레이어에 적립 */
    if (d.wall.any) {
      const off = 3.2, down = 4.4;
      reset(sg, false);
      sg.globalAlpha = 0.62; sg.fillStyle = '#000000';
      sg.globalCompositeOperation = 'source-over';
      sg.drawImage(d.wall.cv, (-cam.x + off) * SS, (-cam.y + down) * SS, MW * SS, MH * SS);
      /* 벽 자신에게는 그림자가 앉지 않게 도려낸다 */
      sg.globalCompositeOperation = 'destination-out';
      sg.globalAlpha = 1;
      sg.drawImage(d.wall.cv, -cam.x * SS, -cam.y * SS, MW * SS, MH * SS);
      sg.globalCompositeOperation = 'source-over';
    }
    reset(g, false); camXf(g, cam);
  }

  /* 이어 붙는 무늬를 스크롤해 dw x dh 를 채운다 */
  function paintPattern(g, img, ox, oy, scale, alpha, dw, dh) {
    const pat = g.createPattern(img, 'repeat');
    if (!pat) return;
    const sw = img.width * scale, sh = img.height * scale;
    g.save();
    g.globalAlpha = alpha;
    g.imageSmoothingEnabled = true;
    /* 무늬는 사용자 좌표계에 붙으므로 변환으로 스크롤한다 */
    g.setTransform(scale, 0, 0, scale, ((ox % sw) + sw) % sw - sw, ((oy % sh) + sh) % sh - sh);
    g.fillStyle = pat;
    g.fillRect(0, 0, dw / scale + img.width * 2, dh / scale + img.height * 2);
    g.restore();
  }

  /* ================================================================
     6. 방향성 그림자
        - 실루엣을 만들어 발밑을 축으로 눕힌다(오른쪽 아래로 기울이고 납작하게)
        - 개별 블러는 비싸므로 한 레이어에 모아 두고 한 번만 흐린다
     ================================================================ */
  /* 실루엣은 원본 캔버스를 키로 캐시한다(같은 그림이면 다시 만들지 않는다) */
  const SIL = (typeof WeakMap !== 'undefined') ? new WeakMap() : null;
  const SILALT = {};
  function silhouette(img, key) {
    let c = SIL ? SIL.get(img) : SILALT[key];
    if (c) return c;
    c = PX.canvas(img.width, img.height);
    const g = ctxOf(c, false);
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-in';   /* 색만 검게, 알파는 원본 그대로 */
    g.fillStyle = '#000000';
    g.fillRect(0, 0, c.width, c.height);
    if (SIL) SIL.set(img, c); else SILALT[key] = c;
    return c;
  }
  /* 발밑(footX,footY)을 축으로 실루엣을 오른쪽 아래로 눕힌다 */
  function cast(key, img, footX, footY, left, top, w, h) {
    const sil = silhouette(img, key);
    const g = sg;
    g.setTransform(SS, 0, 0, SS, (footX - cur.cam.x) * SS, (footY - cur.cam.y) * SS);
    g.transform(1, 0, SUN[0], SUN[1], 0, 0);
    g.globalAlpha = 0.9;
    g.globalCompositeOperation = 'source-over';
    g.imageSmoothingEnabled = false;
    g.drawImage(sil, left, top, w, h);
    g.setTransform(1, 0, 0, 1, 0, 0);
  }
  /* 접지점의 x = 발자리 폭의 가운데. PROPS.draw 의 앵커 규칙과 같은 값이 나온다 */
  const ANCHOR = {};
  function anchorX(ch) {
    if (ANCHOR[ch] !== undefined) return ANCHOR[ch];
    const f = PROPS.foot(ch);
    let fw = Math.max(1, Math.ceil(PROPS.width(ch) / T));   /* 통행 가능한 소품은 발자리가 없다 */
    if (f && f.length) { let mx = 0; for (let i = 0; i < f.length; i++) if (f[i][0] > mx) mx = f[i][0]; fw = mx + 1; }
    ANCHOR[ch] = fw * T / 2;
    return ANCHOR[ch];
  }
  function propShadow(ch, tx, ty, frame) {
    if (!cur || quality <= 0 || !PROPS.has(ch)) return;
    const img = PROPS.get(ch, frame);
    if (!img) return;
    cast('p' + ch + frame, img, tx * T + anchorX(ch), ty * T + T,
         -Math.round(img.width / 2), -img.height, img.width, img.height);
  }
  function spriteShadow(id, dir, frame, cx, by) {
    if (!cur || quality <= 0) return;
    const img = SPRITES.get(id, dir, frame);
    if (!img) return;
    const sz = SPRITES.size(id), s = 1.2;               /* SPRITES.draw 와 같은 확대율 */
    const dw = Math.round(img.width * s), dh = Math.round(img.height * s);
    cast('s' + id + dir + frame, img, cx, by, -(dw >> 1), -Math.round(sz.footY * s), dw, dh);
  }
  /* 모아 둔 그림자를 얹는다.
     넓게 퍼진 반영(1/4 로 줄였다 키운 것) 과 발밑의 또렷한 접지(원본) 를
     1/2 판에서 먼저 합친 뒤 화면에는 한 번만 그린다. */
  function shadows() {
    if (!cur || quality <= 0) return;
    reset(b4g, true); b4g.clearRect(0, 0, b4.width, b4.height);
    b4g.drawImage(shad, 0, 0, b4.width, b4.height);
    reset(hg, true); hg.clearRect(0, 0, hw, hh);
    hg.globalAlpha = 0.58; hg.drawImage(b4, 0, 0, hw, hh);
    hg.globalAlpha = 0.42; hg.drawImage(shad, 0, 0, hw, hh);
    const g = wg;
    reset(g, true);
    g.globalAlpha = 0.62;
    g.drawImage(half, 0, 0, W, H);
    reset(g, false); camXf(g, cur.cam);
  }

  /* ================================================================
     7. 빛 — 빛기둥 · 불꽃 글로우 · 인물 손전등
     ================================================================ */
  function lights(playerX, playerY) {
    if (!cur || quality <= 0) return;
    const { m, cam, tick, d, prof } = cur;
    const g = wg;
    reset(g, true);
    g.globalCompositeOperation = 'lighter';

    /* 빛기둥 : 위에서 비스듬히 내려오는 평행사변형 */
    if (prof.shafts) {
      for (let i = 0; i < prof.shafts.length; i++) {
        const s = prof.shafts[i];
        const x = s[0] * T, y = s[1] * T, w = s[2] * T, h = s[3] * T;
        const breathe = 0.78 + 0.22 * Math.sin(tick * 0.013 + i * 1.9);
        const sx = (x - cam.x) * SS, sy = (y - cam.y) * SS;
        const sw = w * SS, sh = h * SS, tilt = sh * 0.42;
        if (sx + sw + tilt < -40 || sx > W + 40 || sy > H + 40) continue;
        const lg = g.createLinearGradient(sx, sy, sx + tilt, sy + sh);
        lg.addColorStop(0, hexA('#fff3cd', s[4] * breathe));
        lg.addColorStop(0.55, hexA('#ffe9b0', s[4] * 0.45 * breathe));
        lg.addColorStop(1, hexA('#ffe0a0', 0));
        g.fillStyle = lg;
        g.beginPath();
        g.moveTo(sx, sy); g.lineTo(sx + sw, sy);
        g.lineTo(sx + sw + tilt, sy + sh); g.lineTo(sx + tilt, sy + sh);
        g.closePath(); g.fill();
      }
    }

    /* 불꽃 소품(화로) 글로우 : 흔들리는 따뜻한 빛 */
    const flick = 0.82 + 0.18 * Math.sin(tick * 0.21) + 0.06 * Math.sin(tick * 0.53);
    for (let i = 0; i < m.props.length; i++) {
      const p = m.props[i];
      if (p.ch !== 'B') continue;
      const wx = p.tx * T + T / 2, wy = p.ty * T + 4;
      const sx = (wx - cam.x) * SS, sy = (wy - cam.y) * SS;
      if (sx < -120 || sx > W + 120 || sy < -120 || sy > H + 120) continue;
      const R = 44 * SS * flick;
      const rg = g.createRadialGradient(sx, sy, 0, sx, sy, R);
      rg.addColorStop(0, 'rgba(255,214,138,0.34)');
      rg.addColorStop(0.35, 'rgba(255,164,64,0.15)');
      rg.addColorStop(1, 'rgba(255,120,30,0)');
      g.fillStyle = rg; g.fillRect(sx - R, sy - R, R * 2, R * 2);
    }

    /* 어두운 장소에서는 주인공 주변만 밝힌다 */
    const gr = m.meta.light;
    if (gr === 'cave' || gr === 'under') {
      const sx = (playerX - cam.x) * SS, sy = (playerY - 12 - cam.y) * SS;
      const R = (86 + Math.sin(tick * 0.14) * 4) * SS;
      const rg = g.createRadialGradient(sx, sy, 0, sx, sy, R);
      rg.addColorStop(0, gr === 'cave' ? 'rgba(255,206,142,0.30)' : 'rgba(178,164,255,0.24)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.fillRect(sx - R, sy - R, R * 2, R * 2);
    }
    reset(g, false); camXf(g, cam);
  }

  /* ================================================================
     8. 파티클 — 위치는 tick 의 함수라 상태를 들고 있지 않는다
     ================================================================ */
  function particles() {
    if (!cur || quality <= 0 || !cur.prof.parts) return;
    const { cam, tick, d, prof } = cur;
    const MW = d.mw * T, MH = d.mh * T;
    const g = wg;
    reset(g, true);
    const thin = quality < 2 ? 0.5 : 1;
    for (let k = 0; k < prof.parts.length; k++) {
      const P = PARTS[prof.parts[k]];
      if (!P) continue;
      const n = Math.max(3, Math.round(P.n * thin));
      const spr = dot(P.col, Math.max(3, P.r * SS));
      g.globalCompositeOperation = P.blend;
      for (let i = 0; i < n; i++) {
        const h1 = PX.hash(i * 7 + k * 31, 3 + d.seed, 17);
        const h2 = PX.hash(i * 11 + k * 13, 9 + d.seed, 23);
        const h3 = PX.hash(i * 5 + k * 17, 5 + d.seed, 31);
        const sp = 0.55 + h3;
        let x = (h1 * MW + tick * P.vx * sp) % MW; if (x < 0) x += MW;
        let y = (h2 * MH + tick * P.vy * sp) % MH; if (y < 0) y += MH;
        x += Math.sin(tick * 0.021 + i * 1.7) * P.wob;
        y += Math.cos(tick * 0.017 + i * 2.3) * P.wob * 0.6;
        const sx = (x - cam.x) * SS, sy = (y - cam.y) * SS;
        if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
        g.globalAlpha = P.a * (0.5 + 0.5 * Math.sin(tick * 0.045 + i * 2.1));
        g.drawImage(spr, sx - spr.width / 2, sy - spr.height / 2);
      }
    }
    reset(g, false); camXf(g, cam);
  }

  /* ================================================================
     9. 마무리 — 블룸 + 색보정을 얹고, 완성한 1배 화면을 정수배로 확대해 내보낸다
     ================================================================ */
  function finish(canvas) {
    if (!cur) return;
    const gd = GRADE[cur.prof.grade] || GRADE.day;
    const w = wg;

    /* 블룸 : 1/4 로 줄여 자기 자신과 곱해 밝은 곳만 남긴다.
       넓은 번짐(1/8)과 좁은 번짐(1/4)은 작은 판에서 미리 합쳐 화면에는 한 번만 얹는다. */
    if (quality >= 2) {
      reset(b4g, true); b4g.clearRect(0, 0, b4.width, b4.height);
      b4g.drawImage(world, 0, 0, b4.width, b4.height);
      reset(b4bg, true); b4bg.clearRect(0, 0, b4b.width, b4b.height);
      b4bg.drawImage(b4, 0, 0);
      b4g.globalCompositeOperation = 'multiply';
      /* 두 번 곱해 세제곱을 만든다. 제곱만 하면 흰 대리석 바닥까지 번져 화면이 날아간다 —
         불꽃·금·물비늘처럼 정말로 밝은 것만 남겨야 한다 */
      b4g.drawImage(b4b, 0, 0);
      b4g.drawImage(b4b, 0, 0);
      reset(b8g, true); b8g.clearRect(0, 0, b8.width, b8.height);
      b8g.drawImage(b4, 0, 0, b8.width, b8.height);
      b4g.globalCompositeOperation = 'lighter';
      b4g.globalAlpha = 0.9;
      b4g.drawImage(b8, 0, 0, b4.width, b4.height);
      reset(w, true);
      w.globalCompositeOperation = 'screen';
      w.globalAlpha = 0.26;
      w.drawImage(b4, 0, 0, W, H);
    }

    /* 색보정 : 미리 구운 두 장(곱하기 = 어둡게·비네트·온도, 더하기 = 하늘빛·주광) */
    const t = gradeTex(cur.prof.grade, gd);
    reset(w, true);
    w.globalCompositeOperation = 'multiply';
    w.drawImage(t.dk, 0, 0, W, H);
    w.globalCompositeOperation = 'lighter';
    w.drawImage(t.lt, 0, 0, W, H);
    reset(w, false);

    /* 정수배 확대 한 번으로 내보낸다 — 도트가 뭉개지지 않는다 */
    const g = reset(canvas.getContext('2d'), false);
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.drawImage(world, 0, 0, W, H, 0, 0, canvas.width, canvas.height);
    measure();
  }

  /* ================================================================
     10. 공개 API
     ================================================================ */
  /* v = null 이면 자동(높음에서 시작해 느리면 알아서 낮춘다), 0~2 면 고정 */
  function setQuality(v) {
    if (v === null || v === undefined) { forced = null; quality = 2; }
    else { forced = Math.max(0, Math.min(2, v | 0)); quality = forced; }
    samples = 0; ema = 16; lastStamp = 0;
  }
  function level() { return quality; }
  function clearScene(key) { if (key) delete cache[key]; else for (const k in cache) delete cache[k]; }

  return {
    begin: begin, ground: ground,
    propShadow: propShadow, spriteShadow: spriteShadow, shadows: shadows,
    lights: lights, particles: particles, finish: finish,
    setQuality: setQuality, level: level, clearScene: clearScene,
    GRADE: GRADE, PROFILE: PROFILE,
    _dbg: () => ({ world: world, shad: shad, half: half })
  };
})();
