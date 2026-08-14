/* engine/sprites.js — 캐릭터 스프라이트 (파라미터형 레이어 조립 엔진)
   전역 SPRITES 하나만 선언한다. PX / PAL 은 이미 로드되어 있다고 가정한다.
   레이어 순서: 그림자 → 뒤소품(망토·날개·등짐) → 다리 → 몸통 → 팔 → 머리 →
                머리카락/수염 → 얼굴 → 머리장식 → 앞소품 → 외곽선
   모든 id × 4방향 × 4프레임 = 16장을 로드 시점에 오프스크린으로 미리 렌더해 캐시한다. */
"use strict";
const SPRITES = (function () {

  const W = 16, H = 26;

  /* Hand-painted HD map actors. The procedural sprites remain as a safe fallback
     while an image is loading or when the game is opened from a slow drive. */
  const HD_CELL = { w: 64, h: 96, footY: 92 };
  const HD_ACTORS = {
    odysseus:  { src: 'assets/sprites-hd/odysseus-sheet.png?v=2',  w: 32, h: 48 },
    calypso:   { src: 'assets/sprites-hd/calypso-sheet.png?v=2',   w: 30, h: 45 },
    nausicaa:  { src: 'assets/sprites-hd/nausicaa-sheet.png?v=2',  w: 30, h: 45 },
    alcinous:  { src: 'assets/sprites-hd/alcinous-sheet.png?v=2',  w: 34, h: 49 },
    ciconian:  { src: 'assets/sprites-hd/ciconian-sheet.png?v=2',  w: 36, h: 50 },
    lotus:     { src: 'assets/sprites-hd/lotus-sheet.png?v=2',     w: 29, h: 44 },
    polyphemus:{ src: 'assets/sprites-hd/polyphemus-sheet.png?v=2',w: 48, h: 62 },
    circe:     { src: 'assets/sprites-hd/circe-sheet.png?v=2',     w: 31, h: 47 },
    tiresias:  { src: 'assets/sprites-hd/tiresias-sheet.png?v=2',  w: 31, h: 47 },
    siren:     { src: 'assets/sprites-hd/siren-sheet.png?v=2',     w: 48, h: 48 },
    poseidon:  { src: 'assets/sprites-hd/poseidon-sheet.png?v=2',  w: 40, h: 56 },
    eurylochus:{ src: 'assets/sprites-hd/eurylochus-sheet.png?v=2',w: 32, h: 48 },
    athena:    { src: 'assets/sprites-hd/athena-sheet.png?v=2',    w: 40, h: 54 },
    telemachus:{ src: 'assets/sprites-hd/telemachus-sheet.png?v=2',w: 32, h: 48 },
    penelope:  { src: 'assets/sprites-hd/penelope-sheet.png?v=2',  w: 30, h: 46 },
    suitor:    { src: 'assets/sprites-hd/suitor-sheet.png?v=2',    w: 32, h: 48 },
    sailor:    { src: 'assets/sprites-hd/sailor-sheet.png?v=2',    w: 32, h: 48 },
    muse:      { src: 'assets/sprites-hd/muse-sheet.png?v=2',      w: 31, h: 47 },
    trader:    { src: 'assets/sprites-hd/trader-sheet.png?v=2',    w: 34, h: 48 }
  };
  const HD_IMAGES = {};
  if (typeof Image !== 'undefined') {
    Object.keys(HD_ACTORS).forEach(function (id) {
      const img = new Image();
      img.decoding = 'async';
      img.src = HD_ACTORS[id].src;
      HD_IMAGES[id] = img;
    });
  }

  /* ==================================================================
     0. 색 파생 유틸 — PAL 에서만 파생한다 (새 hex 리터럴 금지)
     ================================================================== */
  const SH = c => PX.shades(c);                 /* [어둠, 중간어둠, 기본, 밝음] */
  const D = (c, n) => PX.shift(c, -(n === undefined ? 22 : n));
  const L = (c, n) => PX.shift(c, (n === undefined ? 20 : n));
  const MIX = PX.mix;
  const INK = PAL.ink0;

  /* 자주 쓰는 파생색 */
  const PINK = MIX(PAL.rd3, PAL.iv4, 0.52);     /* 연분홍(로토파고스) */
  const OGRE = MIX(PAL.gr3, PAL.sk1, 0.42);     /* 키클롭스 초록 피부 */
  const GHST = MIX(PAL.sk1, PAL.st3, 0.45);     /* 저승 예언자 창백한 피부 */
  const STEEL = MIX(PAL.st3, PAL.se2, 0.30);    /* 아테나 회청색 갑옷 */

  /* ==================================================================
     1. 캐릭터 설정 — 픽셀을 새로 찍지 않고 "설정"으로 차별화한다
     ================================================================== */
  const CFG = {

    /* 주인공: 청록 튜닉 + 가죽 흉갑, 짧은 수염, 붉은 머리띠, 청동 검 + 등에 활 */
    odysseus: {
      body: PAL.se2, trim: PAL.gd2, belt: PAL.wd1, skin: PAL.sk3, shoe: PAL.wd1,
      garment: 'tunic', chest: 'leather', chestCol: PAL.wd2,
      hair: 'short', hairCol: PAL.wd1, beard: 'full', beardCol: PAL.wd1,
      head: 'headband', headCol: PAL.rd2, propR: 'sword', back: 'bow'
    },

    /* 님프: 보라 드레스, 긴 물결 머리, 초승달·별 장식 */
    calypso: {
      h: 27, pad: 3, body: PAL.pu2, body2: PAL.pu1, trim: PAL.se4, skin: PAL.sk4, shoe: PAL.pu0,
      garment: 'dress', hair: 'wave', hairCol: PAL.ink3,
      head: 'moon', headCol: PAL.gd3, idle: 'hair'
    },

    /* 공주: 흰·상아 드레스, 땋은 머리 + 금 머리띠, 빨래 바구니 */
    nausicaa: {
      h: 26, pad: 1, body: PAL.iv3, body2: PAL.iv2, trim: PAL.se3, skin: PAL.sk4, shoe: PAL.sd2,
      garment: 'dress', hair: 'braid', hairCol: PAL.sd1,
      head: 'circlet', headCol: PAL.gd3, propL: 'basket'
    },

    /* 왕: 자주+금 예복, 흰 수염, 금관, 홀 */
    alcinous: {
      h: 27, pad: 3, body: PAL.pu2, body2: PAL.pu1, trim: PAL.gd3, belt: PAL.gd2,
      skin: PAL.sk2, shoe: PAL.wd2,
      garment: 'robe', hair: 'short', hairCol: PAL.iv3,
      beard: 'long', beardCol: PAL.iv3,
      head: 'crown', headCol: PAL.gd3, cape: PAL.pu1, propR: 'scepter', shoulder: 1, idle: 'cape'
    },

    /* 키코네스 전사: 볏 달린 청동 투구, 둥근 방패, 창 */
    ciconian: {
      h: 28, pad: 4, body: PAL.sd1, body2: PAL.sd0, trim: PAL.gd1, belt: PAL.wd1,
      skin: PAL.sk2, shoe: PAL.wd1,
      garment: 'tunic', chest: 'bronze', chestCol: PAL.gd1,
      hair: 'short', hairCol: PAL.wd0, beard: 'stubble',
      head: 'helm', headCol: PAL.gd1, headCol2: PAL.rd2,
      propR: 'spear', propL: 'shield', shoulder: 1
    },

    /* 로토파고스: 연분홍 옷, 머리에 화관, 반쯤 감긴 눈 */
    lotus: {
      h: 25, pad: 1, body: PINK, body2: MIX(PAL.rd2, PAL.iv3, 0.5), trim: PAL.gr3,
      skin: PAL.sk3, shoe: PAL.sd1, garment: 'dress',
      hair: 'bob', hairCol: PAL.sd1, eyes: 'half',
      head: 'flower', headCol: PAL.rd3, headCol2: PAL.gd3, pose: 'dreamy', idle: 'sway'
    },

    /* 키클롭스: 24×40 거인. 넓은 어깨→좁은 허리 사다리꼴, 굵은 목, 외눈, 어깨에 몽둥이 */
    polyphemus: {
      w: 24, h: 40, pad: 2, build: 'giant', skin: OGRE, shoe: PAL.wd0,
      body: PAL.sd1, body2: PAL.sd0, belt: PAL.wd0, hemJag: true,
      garment: 'tunic', chest: 'fur', chestCol: PAL.sd0,
      hair: 'wild', hairCol: PAL.ink2, beard: 'stubble', beardCol: PAL.ink2,
      eyes: 'single', propR: 'club',
      shoulder: 2, flare: -1, neck: 2, headBig: -1, armW: 3, hemDrop: 3, idle: 'breathe'
    },

    /* 마녀: 짙은 보라 로브, 붉은 긴 머리, 금 지팡이, 잔, 금 서클릿 */
    circe: {
      h: 26, pad: 1, body: PAL.pu1, body2: PAL.pu0, trim: PAL.gd2, belt: PAL.gd2,
      skin: PAL.sk4, shoe: PAL.pu0,
      garment: 'robe', hair: 'long', hairCol: PAL.rd2, hairLong: 1,
      head: 'circlet', headCol: PAL.gd2,
      propR: 'staff', propL: 'cup', idle: 'hair'
    },

    /* 예언자: 불투명한 잿빛 로브 + 두건, 완전한 흰 눈(맹인), 가슴까지 오는 흰 수염,
       굽은 나무 지팡이. 반투명은 밑단·실루엣 테두리에만 남긴다. */
    tiresias: {
      h: 26, pad: 1, body: PAL.st3, body2: PAL.st2, trim: PAL.iv1, skin: GHST, shoe: PAL.st2,
      garment: 'robe', hair: 'short', hairCol: PAL.iv3,
      beard: 'long', beardCol: PAL.iv3, eyes: 'blind',
      head: 'hood', headCol: PAL.st2,
      propR: 'woodstaff', ghost: true, idle: 'ghost'
    },

    /* 세이렌: 청록 몸, 좌우로 펼친 새 날개, 긴 머리 */
    siren: {
      h: 26, pad: 1, body: PAL.se2, body2: PAL.se1, trim: PAL.se5, skin: PAL.se4, shoe: PAL.se1,
      garment: 'dress', hair: 'wave', hairCol: PAL.ink2,
      wings: true, wingCol: PAL.st3, idle: 'wing'
    },

    /* 바다신: 20×32, 청록 로브, 파도 같은 흰 머리·수염, 몸 위로 솟은 금 삼지창 */
    poseidon: {
      w: 20, h: 32, pad: 4, body: PAL.se1, body2: PAL.se0, trim: PAL.se4, belt: PAL.gd2,
      skin: PAL.sk2, shoe: PAL.se0, garment: 'robe',
      hair: 'flow', hairCol: PAL.iv4, beard: 'flow', beardCol: PAL.iv4,
      propR: 'trident', shoulder: 1, flare: 1, idle: 'beard'
    },

    /* 동료 선원: 갈색 튜닉, 수염, 어깨에 노, 걱정스러운 자세 */
    eurylochus: {
      body: PAL.wd3, body2: PAL.wd2, trim: PAL.sd2, belt: PAL.wd1, skin: PAL.sk2, shoe: PAL.wd1,
      garment: 'tunic', hair: 'short', hairCol: PAL.wd0,
      beard: 'full', beardCol: PAL.wd0, pose: 'worry', propR: 'oarShoulder'
    },

    /* 여신: 회청 갑옷 + 흰 페플로스, 볏 달린 코린토스 투구, 창·방패, 어깨 위 올빼미 */
    athena: {
      h: 28, pad: 4, body: STEEL, body2: PAL.iv3, trim: PAL.gd2, belt: PAL.gd2,
      skin: PAL.sk3, shoe: PAL.gd1,
      garment: 'dress', chest: 'bronze', chestCol: STEEL,
      hair: 'long', hairCol: PAL.gd1,
      head: 'corinth', headCol: PAL.gd1, headCol2: PAL.iv3,
      propR: 'spear', propL: 'shield', owl: true, shoulder: 1
    },

    /* 왕자: 젊고 수염 없음, 파란 튜닉, 등에 활, 흰 머리띠 */
    telemachus: {
      h: 25, body: PAL.se3, body2: PAL.se2, trim: PAL.iv3, belt: PAL.wd2,
      skin: PAL.sk3, shoe: PAL.wd2, garment: 'tunic',
      hair: 'short', hairCol: PAL.wd2, head: 'fillet', headCol: PAL.iv3, back: 'bow'
    },

    /* 왕비: 진홍 드레스, 등 뒤로 흐르는 베일, 실타래 */
    penelope: {
      h: 26, pad: 1, body: PAL.rd1, body2: PAL.rd0, trim: PAL.gd2, skin: PAL.sk4, shoe: PAL.rd0,
      garment: 'dress', hair: 'long', hairCol: PAL.wd1,
      head: 'veil', headCol: PAL.iv3, propL: 'yarn', idle: 'veil'
    },

    /* 구혼자(잡몹): 화려한 노랑·주황, 화관, 잔을 들고 거들먹거림 */
    suitor: {
      h: 26, pad: 1, body: PAL.gd3, body2: PAL.gd2, trim: PAL.fl2, belt: PAL.rd2,
      skin: PAL.sk3, shoe: PAL.rd1,
      garment: 'tunic', chest: 'sash', chestCol: PAL.fl1,
      hair: 'short', hairCol: PAL.wd2, beard: 'stubble',
      head: 'wreath', headCol: PAL.gr3, headCol2: PAL.gd3,
      cape: PAL.fl1, propR: 'cup', pose: 'strut', idle: 'cape'
    },

    /* 일반 선원: 갈색 조끼, 두건, 노 */
    sailor: {
      body: PAL.iv2, body2: PAL.iv1, trim: PAL.sd1, belt: PAL.wd1, skin: PAL.sk2, shoe: PAL.wd1,
      garment: 'tunic', chest: 'vest', chestCol: PAL.wd2,
      hair: 'short', hairCol: PAL.wd1, beard: 'stubble',
      head: 'rag', headCol: PAL.rd2, propR: 'oar'
    },

    /* 무사이: 상아 드레스 + 월계관, 흑발 긴 머리 — 힌트를 주는 노래의 여신 */
    muse: {
      h: 27, pad: 1, body: PAL.iv3, body2: PAL.iv2, trim: PAL.gd2, skin: PAL.sk4, shoe: PAL.gd1,
      garment: 'dress', hair: 'wave', hairCol: PAL.ink3, hairLong: 1,
      head: 'wreath', headCol: PAL.gr3, headCol2: PAL.gd4, idle: 'hair'
    },

    /* 떠돌이 상인: 모래색 튜닉 + 붉은 두건, 보따리 바구니 */
    trader: {
      h: 26, body: PAL.sd2, body2: PAL.sd1, trim: PAL.rd2, belt: PAL.wd1, skin: PAL.sk2, shoe: PAL.wd1,
      garment: 'tunic', chest: 'vest', chestCol: PAL.wd2,
      hair: 'short', hairCol: PAL.wd0, beard: 'stubble',
      head: 'rag', headCol: PAL.rd2, propL: 'basket', pose: 'strut'
    }
  };

  const IDS = ['odysseus', 'calypso', 'nausicaa', 'alcinous', 'ciconian', 'lotus',
    'polyphemus', 'circe', 'tiresias', 'siren', 'poseidon', 'eurylochus',
    'athena', 'telemachus', 'penelope', 'suitor', 'sailor', 'muse', 'trader'];

  /* ==================================================================
     2. 기하 — 크기가 달라도 같은 비율로 자동 계산된다
     ================================================================== */
  /* pad = 머리 위 여백(투구 볏·삼지창·관이 실루엣 위로 솟을 자리).
     몸은 pad 만큼 아래로 내려앉고 발밑(footY)은 그대로라 앵커 규칙이 유지된다. */
  function geom(C) {
    const w = C.w || W, h = C.h || H, pad = C.pad || 0;
    const fh = h - pad;
    const cx = w >> 1;
    const headTop = Math.round(fh * 0.077) + pad;
    const bodyTop = Math.round(fh * 0.42) + pad;
    const legTop = fh - Math.round(fh * 0.225) + pad;
    const G = {
      w: w, h: h, cx: cx, pad: pad,
      headTop: headTop,
      headBot: bodyTop - 1 - (C.neck || 0),        /* neck: 머리와 몸통 사이 목 길이 */
      headHW: Math.round(w * 0.27) + (C.headBig || 0),
      bodyTop: bodyTop,
      chestY: bodyTop + Math.round((legTop - bodyTop) * 0.28),
      waistY: bodyTop + Math.round((legTop - bodyTop) * 0.62),
      hemY: legTop - 1 + (C.hemDrop || 0),         /* hemDrop: 옷단을 내려 다리를 짧게 */
      legTop: legTop + (C.hemDrop || 0),
      footY: h - 2,
      shRX: Math.round(w * 0.30),
      shRY: Math.max(1, Math.round(fh * 0.062)),
      shHW: Math.round(w * 0.19) + (C.shoulder || 0),
      hemHW: Math.round(w * 0.27) + (C.flare || 0),
      legHW: Math.round(w * 0.19)
    };
    G.eyeY = headTop + Math.round((G.headBot - headTop) * 0.62);
    return G;
  }

  /* ==================================================================
     3. 그리기 유틸
     ================================================================== */
  function hrun(g, cx, y, hw, col) { if (hw < 0) return; PX.rect(g, cx - hw, y, hw * 2 + 1, 1, col); }
  function headHW(G, y, top, bot) {           /* 둥근 머리 실루엣의 행별 반폭 */
    const d = Math.min(y - top, bot - y);
    return G.headHW - (d <= 0 ? 2 : (d === 1 ? 1 : 0));
  }

  /* ---------- 3-1. 뒤쪽 레이어 : 망토 / 날개 / 등에 멘 것 ---------- */
  function layBack(g, G, C, A) {
    if (C.cape) drawCape(g, G, C, A);
    if (C.wings) drawWings(g, G, C, A);
    if (C.back === 'bow') drawBackBow(g, G, C, A);
  }

  function drawCape(g, G, C, A) {
    const s = SH(C.cape);
    const sway = A.idle ? 1 : 0;                 /* 정지 2프레임: 옷자락 1px 흔들림 */
    const top = G.bodyTop - 1 + A.bob, bot = G.hemY + 2 + A.bob + sway;
    const span = Math.max(1, bot - top);
    if (A.kind === 'side') {
      for (let y = top; y <= bot; y++) {
        const t = (y - top) / span;
        const wd = 2 + Math.round(t * 2);
        PX.rect(g, G.cx - G.shHW - wd, y, wd, 1, s[1]);
      }
    } else {
      const front = (A.dir === 'down');
      for (let y = top; y <= bot; y++) {
        const t = (y - top) / span;
        const hw = Math.round(G.shHW + 1 + t * 2);
        if (front) {                       /* 앞모습: 어깨 밖으로만 보임 */
          PX.rect(g, G.cx - hw, y, hw - G.shHW, 1, s[1]);
          PX.rect(g, G.cx + G.shHW + 1, y, hw - G.shHW, 1, s[0]);
        } else {
          hrun(g, G.cx, y, hw, s[2]);
          PX.px(g, G.cx - hw, y, s[3]);
          PX.px(g, G.cx + hw, y, s[0]);
        }
      }
      if (!front) PX.dither(g, G.cx - 1, top, 3, span, s[1], 2);
    }
  }

  /* 좌우로 펼친 새 날개 — 실루엣 폭을 몸통보다 훨씬 넓게 만든다 */
  function drawWings(g, G, C, A) {
    const s = SH(C.wingCol || PAL.st3);
    const sh = G.bodyTop + A.bob;
    const flap = A.st ? 1 : (A.idle ? -1 : 0);   /* 걸을 때 아래로, idle 2프레임은 위로 */
    const cols = 3;
    if (A.kind === 'side') {
      for (let i = 0; i < cols + 1; i++) {
        const x = G.cx - G.shHW - 1 - i;
        const yt = sh - 1 - i * 2 + (i ? flap : 0);
        const hgt = Math.max(2, 7 - i);
        PX.rect(g, x, yt, 1, hgt, (i & 1) ? s[1] : s[2]);
        PX.px(g, x, yt + hgt - 1, s[0]);
      }
      PX.px(g, G.cx - G.shHW - 1, sh, s[3]);
      return;
    }
    for (let i = 0; i < cols; i++) {
      const off = G.shHW + 1 + i;
      const yt = sh - 1 - i * 2 + (i ? flap : 0);
      const hgt = Math.max(2, 6 - i);
      PX.rect(g, G.cx - off, yt, 1, hgt, (i & 1) ? s[1] : s[2]);
      PX.rect(g, G.cx + off, yt, 1, hgt, (i & 1) ? s[0] : s[1]);
      PX.px(g, G.cx - off, yt + hgt - 1, s[0]);
      PX.px(g, G.cx + off, yt + hgt - 1, s[0]);
      PX.px(g, G.cx - off, yt, s[3]);
    }
  }

  /* 등에 멘 활 — 어느 방향에서도 실루엣 바깥선에 걸치게 그린다 */
  function drawBackBow(g, G, C, A) {
    const s = SH(PAL.wd2), str = PAL.iv2;
    const top = G.bodyTop - 2 + A.bob, bot = G.hemY - 1 + A.bob;
    const span = Math.max(1, bot - top);
    if (A.dir === 'up') {                    /* 뒷모습: 활이 온전히 보인다 */
      const x = G.cx + 2;
      for (let y = top; y <= bot; y++) {
        const bulge = Math.round(Math.sin((y - top) / span * Math.PI) * 2);
        PX.px(g, x + bulge, y, s[2]);
        PX.px(g, x + bulge + 1, y, s[1]);
      }
      PX.line(g, x, top, x, bot, str);
      PX.rect(g, G.cx - 4, G.chestY + A.bob, 3, 5, PAL.wd1);   /* 화살통 */
      PX.rect(g, G.cx - 4, G.chestY + A.bob - 2, 1, 2, PAL.iv3);
      PX.rect(g, G.cx - 2, G.chestY + A.bob - 2, 1, 2, PAL.iv3);
      return;
    }
    /* 앞·옆모습: 몸통 바깥 왼쪽 윤곽을 따라 활대가 활처럼 휘어 나온다 */
    const x = G.cx - G.shHW - (A.kind === 'side' ? 2 : 3);
    for (let y = top; y <= bot; y++) {
      const bulge = Math.round(Math.sin((y - top) / span * Math.PI) * 1.4);
      PX.px(g, x - bulge, y, s[2]);
      PX.px(g, x - bulge + 1, y, s[0]);
    }
    PX.px(g, x, top, s[3]);
    PX.px(g, x, bot, s[3]);
  }

  /* ---------- 3-2. 다리 / 발 ---------- */
  function layLegs(g, G, C, A) {
    const skirt = (C.garment === 'dress' || C.garment === 'robe');
    const s = SH(C.leg || C.skin);
    const sh = SH(C.shoe || PAL.wd1);
    const dark = (A.dir === 'up');
    const top = (skirt ? G.footY - 3 : G.legTop) + A.bob;

    if (A.kind === 'side') {
      const fwd = A.st;
      if (!fwd) {
        sideLeg(g, G, G.cx - 1, top, 0, dark ? s[1] : s[1], sh[1]);
        sideLeg(g, G, G.cx, top, 0, dark ? s[1] : s[2], sh[2]);
      } else {
        const nearFwd = fwd > 0;
        sideLeg(g, G, G.cx + 1, top, 0, nearFwd ? s[2] : s[1], nearFwd ? sh[2] : sh[1]);
        sideLeg(g, G, G.cx - 3, top, 1, nearFwd ? s[1] : s[2], nearFwd ? sh[1] : sh[2]);
      }
      return;
    }

    /* 앞/뒷모습 */
    const lw = Math.max(2, G.legHW);
    const legs = [
      { x: G.cx - lw, w: lw, lift: 0, col: dark ? s[1] : s[2], sc: dark ? sh[1] : sh[2] },
      { x: G.cx + 1, w: lw, lift: 0, col: dark ? s[0] : s[1], sc: dark ? sh[0] : sh[1] }
    ];
    if (A.st > 0) { legs[0].lift = 0; legs[1].lift = 1; legs[1].x += 1; legs[1].w -= 1; }
    if (A.st < 0) { legs[1].lift = 0; legs[0].lift = 1; legs[0].w -= 1; }
    for (const lg of legs) {
      const bot = G.footY - 2 - lg.lift;
      if (bot >= top) PX.rect(g, lg.x, top, lg.w, bot - top + 1, lg.col);
      PX.rect(g, lg.x, bot + 1, lg.w, 2, lg.sc);
      PX.rect(g, lg.x, bot + 1, lg.w, 1, L(lg.sc, 14));
    }
  }

  function sideLeg(g, G, x, top, heel, col, shoeCol) {
    const bot = G.footY - 2 - heel;
    if (bot >= top) PX.rect(g, x, top, 2, bot - top + 1, col);
    PX.rect(g, x, bot + 1, 3, 2, shoeCol);
    PX.rect(g, x, bot + 1, 3, 1, L(shoeCol, 14));
  }

  /* ---------- 3-3. 몸통 (튜닉 / 드레스 / 로브 / 갑옷) ---------- */
  function layBody(g, G, C, A) {
    const base = (A.dir === 'up' && C.body2) ? C.body2 : C.body;
    const s = SH(base);
    const top = G.bodyTop + A.bob - A.breathe, hem = G.hemY + A.bob;
    const sway = (C.idle === 'sway') ? A.idle : 0;      /* 옷자락 1px 흔들림 */
    const span = Math.max(1, hem - top);
    const side = (A.kind === 'side');
    const shHW = side ? Math.max(1, G.shHW - 1) : G.shHW;
    const hemHW = side ? Math.max(2, G.hemHW - 1) : G.hemHW;

    /* giant: 어깨가 가장 넓고 허리로 갈수록 좁아지는 사다리꼴 (직선 보간) */
    const giant = (C.build === 'giant');
    for (let y = top; y <= hem; y++) {
      const t = (y - top) / span;
      const hw = Math.round(shHW + (hemHW - shHW) * (giant ? t : t * t));
      hrun(g, G.cx, y, hw, s[2]);
      PX.rect(g, G.cx + hw - 1, y, 2, 1, s[1]);
      PX.px(g, G.cx - hw, y, s[3]);
    }
    /* 목 — C.neck 이 있으면 굵고 짧은 목을 따로 세운다 */
    if (C.neck) {
      const nk = SH(C.skin);
      const ny = G.headBot + A.bob + 1;
      PX.rect(g, G.cx - 2, ny, 5, top - ny + 1, A.dir === 'up' ? nk[1] : nk[2]);
      PX.rect(g, G.cx + 1, ny, 2, top - ny + 1, nk[1]);
      PX.px(g, G.cx - 2, ny, nk[3]);
    } else if (A.kind !== 'up') PX.rect(g, G.cx - 1, top - 1, 3, 2, D(C.skin, 26));
    else PX.rect(g, G.cx - 1, top - 1, 3, 2, D(C.skin, 34));

    /* 아래옷(치마) 주름 */
    if (C.garment !== 'tunic') {
      for (let y = G.waistY + A.bob; y <= hem; y++) {
        PX.px(g, G.cx - 2, y, s[1]);
        PX.px(g, G.cx + 2, y, s[1]);
      }
    }
    /* 허리띠 */
    if (C.belt) {
      const wy = G.waistY + A.bob;
      const t = (wy - top) / span;
      const hw = Math.round(shHW + (hemHW - shHW) * t * t);
      hrun(g, G.cx, wy, hw, C.belt);
      PX.px(g, G.cx - hw, wy, L(C.belt, 26));
      if (A.dir === 'down') PX.rect(g, G.cx - 1, wy, 2, 1, L(C.belt, 34));
    }
    /* 밑단 — 야만족은 들쭉날쭉하게 잘린 털가죽 자락 */
    if (C.hemJag) {
      const hw = hemHW;
      for (let x = G.cx - hw; x <= G.cx + hw; x++) {
        const k = ((x + (A.st ? 1 : 0)) % 3);
        PX.rect(g, x, hem - 1, 1, k === 0 ? 3 : (k === 1 ? 2 : 1), x > G.cx + hw - 3 ? s[0] : s[1]);
      }
    } else if (C.trim) {
      const hw = hemHW + sway;
      hrun(g, G.cx, hem, hw, C.trim);
      hrun(g, G.cx, hem - 1, hw, D(C.trim, 26));
      if (A.dir !== 'up') for (let x = G.cx - hw + 1; x < G.cx + hw; x += 2) PX.px(g, x, hem, L(C.trim, 26));
    }
    /* 가슴 장식 */
    drawChest(g, G, C, A, shHW);
    /* 어깨 위 올빼미 */
    if (C.owl) drawOwl(g, G, C, A);
  }

  function drawChest(g, G, C, A, shHW) {
    if (!C.chest) return;
    const top = G.bodyTop + A.bob - A.breathe, cy = G.chestY + A.bob;
    const col = C.chestCol || PAL.wd2, s = SH(col);
    if (C.chest === 'leather') {              /* 가죽 흉갑 */
      PX.rect(g, G.cx - shHW, top, shHW * 2 + 1, cy - top + 2, s[2]);
      PX.rect(g, G.cx + shHW - 1, top, 2, cy - top + 2, s[1]);
      PX.hline(g, G.cx - shHW, top, shHW * 2 + 1, s[3]);
      hrun(g, G.cx, cy + 2, shHW, s[0]);
      if (A.dir !== 'up') {
        PX.px(g, G.cx - shHW + 1, cy, PAL.gd3);
        PX.px(g, G.cx + shHW - 1, cy, PAL.gd2);
        PX.px(g, G.cx, top + 1, PAL.gd3);
      }
    } else if (C.chest === 'bronze') {        /* 청동 흉갑 */
      PX.rect(g, G.cx - shHW, top, shHW * 2 + 1, cy - top + 3, s[2]);
      PX.hline(g, G.cx - shHW, top, shHW * 2 + 1, s[3]);
      PX.rect(g, G.cx + shHW - 1, top, 2, cy - top + 3, s[1]);
      hrun(g, G.cx, cy + 3, shHW, s[0]);
      if (A.dir === 'down') {
        PX.px(g, G.cx - 2, top + 2, s[3]); PX.px(g, G.cx + 2, top + 2, s[3]);
        PX.rect(g, G.cx - 1, cy, 3, 1, s[3]);
      }
    } else if (C.chest === 'fur') {           /* 털가죽 — 사다리꼴 몸통을 따라간다 */
      const hem = G.hemY + A.bob, span = Math.max(1, hem - top);
      const bot2 = cy + 2;
      for (let y = top; y <= bot2; y++) {
        const hw = Math.round(shHW + (G.hemHW - shHW) * ((y - top) / span));
        hrun(g, G.cx, y, hw, s[2]);
        PX.dither(g, G.cx - hw, y, hw * 2 + 1, 1, s[0], 1, y);
        PX.px(g, G.cx - hw, y, s[3]);
        PX.rect(g, G.cx + hw - 1, y, 2, 1, s[1]);
      }
      PX.dither(g, G.cx - shHW + 1, top, shHW * 2 - 1, 2, s[3], 1, 1);
      for (let x = G.cx - shHW + 2; x <= G.cx + shHW - 2; x += 3) PX.rect(g, x, bot2, 1, 2, s[0]);
    } else if (C.chest === 'sash') {          /* 어깨띠 */
      for (let i = 0; i <= shHW * 2; i++) {
        const y = top + Math.round(i * 0.7);
        PX.px(g, G.cx - shHW + i, y, s[2]);
        PX.px(g, G.cx - shHW + i, y + 1, s[1]);
      }
    } else if (C.chest === 'vest') {          /* 조끼 */
      PX.rect(g, G.cx - shHW, top, 2, G.waistY - top + A.bob, s[2]);
      PX.rect(g, G.cx + shHW - 1, top, 2, G.waistY - top + A.bob, s[1]);
      PX.hline(g, G.cx - shHW, top, shHW * 2 + 1, s[2]);
      if (A.dir === 'up') PX.rect(g, G.cx - shHW, top, shHW * 2 + 1, G.waistY - top + A.bob, s[2]);
    }
  }

  function drawOwl(g, G, C, A) {
    const x = (A.dir === 'up') ? G.cx + G.shHW - 1 : G.cx - G.shHW - 1;
    const y = G.bodyTop + A.bob - 4;
    const s = SH(PAL.iv1);
    PX.rect(g, x, y + 1, 3, 3, s[2]);
    PX.rect(g, x, y, 3, 1, s[3]);
    PX.px(g, x + 2, y + 2, s[1]);
    if (A.dir !== 'up') {
      PX.px(g, x, y + 1, INK); PX.px(g, x + 2, y + 1, INK);
      PX.px(g, x + 1, y + 2, PAL.gd3);
    }
    PX.px(g, x, y, s[0]); PX.px(g, x + 2, y, s[0]);
  }

  /* ---------- 3-4. 팔 ---------- */
  function layArms(g, G, C, A) {
    const sl = SH(C.body);                   /* 소매 */
    const sk = SH(C.skin);
    const top = G.bodyTop + 1 + A.bob;
    let bot = G.waistY + 1 + A.bob;
    const pose = C.pose;

    if (A.kind === 'side') {
      const swing = A.st;
      const nx = G.cx + Math.max(1, G.shHW - 2) + (swing > 0 ? 1 : 0);
      const fx = G.cx - Math.max(1, G.shHW - 1) - (swing > 0 ? 0 : 1);
      /* 먼 팔 */
      PX.rect(g, fx, top, 2, bot - top, D(sl[1], 16));
      PX.rect(g, fx, bot, 2, 2, D(sk[1], 16));
      /* 가까운 팔 */
      PX.rect(g, nx, top, 2, bot - top, sl[2]);
      PX.px(g, nx, top, sl[3]);
      PX.rect(g, nx, bot, 2, 2, sk[2]);
      return;
    }

    const aw = C.armW || 2;                  /* 거인은 팔도 굵게 */
    const inner = G.shHW + 1;
    let ldy = 0, rdy = 0, lift = 0;
    if (A.st > 0) { rdy = -1; ldy = 1; }
    if (A.st < 0) { rdy = 1; ldy = -1; }
    if (pose === 'worry') { lift = -3; }
    if (pose === 'dreamy') { lift = -1; }

    const arms = [
      { x: G.cx - inner - aw + 1, dy: ldy, col: A.dir === 'up' ? sl[1] : sl[2], sc: A.dir === 'up' ? sk[1] : sk[2] },
      { x: G.cx + inner, dy: rdy, col: sl[1], sc: sk[1] }
    ];
    if (pose === 'strut') { arms[1].dy = -2; arms[0].dy = 0; }
    for (const a of arms) {
      const t = top + a.dy + (a === arms[0] ? 0 : 0);
      const b = bot + a.dy + lift;
      if (b > t) PX.rect(g, a.x, t, aw, b - t, a.col);
      PX.rect(g, a.x, b, aw, 2, a.sc);         /* 손 */
      PX.px(g, a.x, t, L(a.col, 16));
    }
    if (pose === 'worry' && A.dir === 'down') {  /* 가슴 앞으로 모은 손 */
      PX.rect(g, G.cx - 3, G.chestY + A.bob, 2, 2, sk[2]);
      PX.rect(g, G.cx + 1, G.chestY + A.bob + 1, 2, 2, sk[1]);
    }
  }

  /* ---------- 3-5. 머리 ---------- */
  function layHead(g, G, C, A) {
    const s = SH(C.skin);
    const hcx = G.cx + A.hx;
    const top = G.headTop + A.bob, bot = G.headBot + A.bob;
    for (let y = top; y <= bot; y++) {
      const hw = headHW(G, y, top, bot);
      hrun(g, hcx, y, hw, s[2]);
      PX.rect(g, hcx + hw - 1, y, 2, 1, s[1]);
      PX.px(g, hcx - hw, y, s[3]);
    }
    /* 왼쪽 위 하이라이트 */
    PX.rect(g, hcx - G.headHW + 1, top + 2, 2, 2, s[3]);
    /* 턱 그림자 */
    hrun(g, hcx, bot, headHW(G, bot, top, bot), s[1]);
    if (A.kind === 'side') {                 /* 옆모습 코·귀 */
      PX.px(g, hcx + G.headHW + 1, G.eyeY + A.bob, s[2]);
      PX.px(g, hcx + G.headHW + 1, G.eyeY + A.bob + 1, s[1]);
      PX.px(g, hcx - 1, G.eyeY + A.bob + 1, s[1]);
    }
  }

  /* ---------- 3-6. 머리카락 / 수염 ---------- */
  function layHair(g, G, C, A) {
    const style = C.hair || 'short';
    const hc = SH(C.hairCol || PAL.wd1);
    const hcx = G.cx + A.hx;
    const top = G.headTop + A.bob, bot = G.headBot + A.bob;
    const longStyles = { long: 1, wave: 1, flow: 1, braid: 1 };
    const isLong = !!longStyles[style];
    const ph = (C.idle === 'hair') ? A.idle : 0;        /* 머릿결 1px 출렁 */
    const ext = C.hairLong || 0;                        /* 어깨 아래까지 더 내리기 */

    if (A.dir === 'up') {
      for (let y = top; y <= bot; y++) {
        const hw = headHW(G, y, top, bot);
        hrun(g, hcx, y, hw, hc[2]);
        PX.rect(g, hcx + hw - 1, y, 2, 1, hc[1]);
        PX.px(g, hcx - hw, y, hc[3]);
      }
      PX.rect(g, hcx - G.headHW + 1, top + 2, 2, 2, hc[3]);
      if (isLong) {
        const to = ((style === 'flow') ? G.chestY : G.waistY) + A.bob + ext * 2;
        for (let y = bot + 1; y <= to; y++) {
          const t = (y - bot) / Math.max(1, to - bot);
          const hw = Math.round(G.headHW - t * 1 + (style === 'flow' ? 1 : 0));
          const wob = (style === 'wave' && (((y >> 1) + ph) & 1)) ? 1 : 0;
          hrun(g, hcx, y, hw + wob, hc[2]);
          PX.px(g, hcx - hw - wob, y, hc[3]);
          PX.rect(g, hcx + hw + wob - 1, y, 2, 1, hc[1]);
        }
        if (style === 'braid') {
          for (let y = bot + 1; y <= G.hemY + A.bob; y++) {
            PX.rect(g, hcx - 1, y, 3, 1, ((y & 1) ? hc[2] : hc[1]));
            PX.px(g, hcx - 1, y, hc[3]);
          }
          PX.rect(g, hcx - 1, G.hemY + A.bob + 1, 3, 1, C.trim || hc[0]);
        }
      } else if (style === 'wild') {
        for (let x = hcx - G.headHW; x <= hcx + G.headHW; x += 2) PX.rect(g, x, bot + 1, 1, 2, hc[1]);
      }
      return;
    }

    /* 앞/옆모습: 이마 위 캡 */
    if (style !== 'bald') {
      for (let y = top; y <= top + 2; y++) {
        const hw = headHW(G, y, top, bot);
        hrun(g, hcx, y, hw, hc[2]);
        PX.rect(g, hcx + hw - 1, y, 2, 1, hc[1]);
        PX.px(g, hcx - hw, y, hc[3]);
      }
      PX.rect(g, hcx - G.headHW + 1, top + 1, 2, 1, hc[3]);
      /* 구레나룻 */
      const sideBot = (style === 'bob') ? G.headBot + A.bob : top + 3;
      for (let y = top + 3; y <= sideBot; y++) {
        const hw = headHW(G, y, top, bot);
        PX.px(g, hcx - hw, y, hc[2]);
        PX.px(g, hcx + hw, y, hc[1]);
      }
      if (A.kind === 'side') {           /* 뒤통수 덮기 */
        for (let y = top; y <= G.eyeY + A.bob; y++) {
          const hw = headHW(G, y, top, bot);
          PX.rect(g, hcx - hw, y, Math.max(1, hw), 1, hc[2]);
          PX.px(g, hcx - hw, y, hc[3]);
        }
      }
      /* 앞머리 결 */
      if (A.kind !== 'side') {
        PX.px(g, hcx - 1, top + 3, hc[1]);
        PX.px(g, hcx + 1, top + 3, hc[1]);
      }
    }

    /* 긴 머리 옆다발 */
    if (isLong) {
      const to = ((style === 'flow') ? G.chestY : G.waistY) + A.bob + ext * 2;
      for (let y = top + 2; y <= to; y++) {
        const base = G.headHW + (y > bot ? 0 : 0);
        const wob = (style === 'wave' && (((y >> 1) + ph) & 1)) ? 1 : 0;
        const fl = (style === 'flow' && y > bot) ? 1 : 0;
        const xl = hcx - base - wob - fl, xr = hcx + base + wob + fl;
        PX.px(g, xl, y, hc[2]); PX.px(g, xl + 1, y, hc[2]);
        PX.px(g, xr, y, hc[1]); PX.px(g, xr - 1, y, hc[1]);
        PX.px(g, xl, y, hc[3]);
      }
      if (style === 'braid' && A.kind !== 'side') {
        const bx = hcx + G.headHW;
        for (let y = bot; y <= G.waistY + A.bob; y++) {
          PX.rect(g, bx, y, 2, 1, ((y & 1) ? hc[2] : hc[1]));
        }
        PX.rect(g, bx, G.waistY + A.bob + 1, 2, 1, C.trim || hc[0]);
      }
    }
    if (style === 'wild') {              /* 헝클어진 머리 */
      for (let x = hcx - G.headHW; x <= hcx + G.headHW; x += 2) {
        PX.rect(g, x, top - 1, 1, 2, hc[1]);
      }
      PX.px(g, hcx - G.headHW - 1, top + 2, hc[2]);
      PX.px(g, hcx + G.headHW + 1, top + 2, hc[1]);
    }
    if (style === 'flow') {              /* 파도처럼 퍼지는 머리 */
      for (let i = 0; i < 3; i++) {
        PX.px(g, hcx - G.headHW - 1 - i, top + 2 + i * 2, hc[2]);
        PX.px(g, hcx + G.headHW + 1 + i, top + 2 + i * 2, hc[1]);
      }
    }

    drawBeard(g, G, C, A, hcx);
  }

  function drawBeard(g, G, C, A, hcx) {
    if (!C.beard || A.dir === 'up') return;
    const bc = SH(C.beardCol || C.hairCol || PAL.wd1);
    const top = G.headTop + A.bob, bot = G.headBot + A.bob;
    const jaw = G.eyeY + A.bob + 2;
    if (C.beard === 'stubble') {
      for (let y = jaw; y <= bot; y++) {
        const hw = headHW(G, y, top, bot);
        PX.dither(g, hcx - hw, y, hw * 2 + 1, 1, bc[1], 2, y & 1);
      }
      return;
    }
    const idl = (C.idle === 'beard') ? A.idle : 0;      /* 수염이 파도처럼 1px 출렁 */
    const to = (C.beard === 'long' || C.beard === 'flow') ? G.chestY + A.bob + idl
      : (C.beard === 'wild' ? G.bodyTop + 1 + A.bob : bot + 1);
    for (let y = jaw; y <= to; y++) {
      let hw;
      if (y <= bot) hw = headHW(G, y, top, bot);
      else {
        const t = (y - bot) / Math.max(1, to - bot);
        hw = Math.round(G.headHW * (1 - t * 0.55)) + (C.beard === 'flow' ? 1 : 0);
      }
      if (C.beard === 'wild') hw = Math.round(hw * (1 - (y - jaw) * 0.06));
      hrun(g, hcx, y, hw, bc[2]);
      PX.rect(g, hcx + hw - 1, y, 2, 1, bc[1]);
      PX.px(g, hcx - hw, y, bc[3]);
      if (C.beard === 'flow' && ((y + idl) & 1)) { PX.px(g, hcx - hw - 1, y, bc[2]); PX.px(g, hcx + hw + 1, y, bc[1]); }
    }
    /* 콧수염 자리는 입을 살짝 비운다 */
    if (A.kind !== 'side') PX.rect(g, hcx - 1, jaw + 1, 3, 1, bc[0]);
  }

  /* ---------- 3-7. 얼굴(눈·입) ---------- */
  function layFace(g, G, C, A) {
    if (A.dir === 'up') return;
    const hcx = G.cx + A.hx;
    const ey = G.eyeY + A.bob;
    const kind = C.eyes || 'normal';
    const big = G.headHW >= 5;

    if (kind === 'single') {                 /* 키클롭스 외눈 — 크고 위협적으로 */
      const ex = hcx + (A.kind === 'side' ? 2 : 0);
      const hw = G.headHW;
      PX.rect(g, hcx - hw + 1, ey - 3, hw * 2 - 1, 2, D(C.skin, 34));   /* 움푹한 눈두덩 */
      PX.ellipse(g, ex, ey, 3, 2, PAL.iv4);                             /* 흰자 7×5 */
      PX.rect(g, ex - 3, ey + 2, 7, 1, PAL.iv1);
      PX.ellipse(g, ex, ey, 1, 1, PAL.wd2);                             /* 갈색 홍채 3×3 */
      PX.rect(g, ex, ey, 1, 2, INK);                                    /* 검은 동공 */
      PX.px(g, ex - 1, ey - 1, PAL.iv4);
      PX.rect(g, hcx - hw + 1, ey - 5, hw * 2 - 1, 2, D(C.hairCol || PAL.ink2, 6));  /* 눈썹 능선 */
      PX.rect(g, hcx - hw + 1, ey - 5, 2, 2, D(C.hairCol || PAL.ink2, -20));
      return;
    }
    const xs = (A.kind === 'side') ? [hcx + 2] : [hcx - 2, hcx + 2];
    for (const x of xs) {
      if (kind === 'blind') {               /* 맹인: 홍채 없는 완전한 흰 눈 2×2 */
        PX.rect(g, x - 1, ey - 1, 2, 4, PAL.ink2);        /* 움푹 꺼진 눈구멍 */
        PX.rect(g, x - 1, ey, 2, 2, PAL.iv4);
      } else if (kind === 'half') {
        PX.rect(g, x - (A.kind === 'side' ? 1 : 0), ey + 1, 2, 1, PAL.ink1);
      } else {
        PX.rect(g, x, ey, 1, 2, PAL.ink1);
        PX.px(g, x, ey + 1, INK);
      }
    }
    /* 입 */
    if (!C.beard || C.beard === 'stubble') {
      const my = G.headBot + A.bob - 1;
      if (A.kind === 'side') PX.px(g, hcx + 2, my, D(C.skin, 40));
      else PX.rect(g, hcx - 1, my, 2, 1, D(C.skin, 40));
    }
    /* 볼 */
    if (A.kind !== 'side' && (C.eyes === 'half' || C.garment === 'dress')) {
      PX.px(g, hcx - 3, ey + 1, MIX(C.skin, PAL.rd3, 0.45));
      PX.px(g, hcx + 3, ey + 1, MIX(C.skin, PAL.rd3, 0.45));
    }
  }

  /* ---------- 3-8. 머리 장식 ---------- */
  function layHeadgear(g, G, C, A) {
    if (!C.head) return;
    const hcx = G.cx + A.hx;
    const top = G.headTop + A.bob, bot = G.headBot + A.bob;
    const hw = G.headHW;
    const c1 = C.headCol || PAL.gd2, c2 = C.headCol2 || PAL.rd2;
    const s = SH(c1), s2 = SH(c2);

    switch (C.head) {
      case 'headband': {
        const y = top + 2;
        hrun(g, hcx, y, headHW(G, y, top, bot), s[2]);
        PX.px(g, hcx - headHW(G, y, top, bot), y, s[3]);
        if (A.dir === 'down') PX.px(g, hcx, y, s[3]);
        if (A.kind === 'side') { PX.rect(g, hcx - hw - 2, y, 2, 1, s[1]); PX.rect(g, hcx - hw - 2, y + 1, 1, 2, s[1]); }
        else { PX.rect(g, hcx - hw - 1, y, 1, 3, s[1]); PX.rect(g, hcx + hw + 1, y, 1, 2, s[1]); }
        break;
      }
      case 'crown': {                       /* 금관: 머리 위로 3px 솟는 뿔장식 */
        const y = top;
        hrun(g, hcx, y, hw - 1, s[2]);
        hrun(g, hcx, y + 1, hw - 1, s[1]);
        PX.px(g, hcx - hw + 1, y, s[3]);
        for (let x = hcx - hw + 1; x <= hcx + hw - 1; x += 2) PX.rect(g, x, y - 2, 1, 2, s[2]);
        PX.rect(g, hcx, y - 3, 1, 3, s[3]);
        if (A.dir !== 'up') PX.px(g, hcx, y + 1, PAL.rd2);
        break;
      }
      case 'circlet': {                     /* 가는 금 서클릿 + 가운데 보석 */
        const y = top + 1;
        const w0 = headHW(G, y, top, bot);
        hrun(g, hcx, y, w0, s[2]);
        PX.px(g, hcx - w0, y, s[3]);
        PX.rect(g, hcx + w0 - 1, y, 2, 1, s[1]);
        if (A.dir !== 'up') {
          PX.px(g, hcx, y - 1, s[3]);
          PX.px(g, hcx, y, C.headCol2 || PAL.rd2);
        }
        break;
      }
      case 'fillet': {                      /* 젊은이의 흰 머리끈 */
        const y = top + 2;
        const w0 = headHW(G, y, top, bot);
        hrun(g, hcx, y, w0, s[2]);
        PX.px(g, hcx - w0, y, s[3]);
        PX.rect(g, hcx + w0 - 1, y, 2, 1, s[1]);
        break;
      }
      case 'wreath': {                      /* 잎사귀 화관 */
        const y = top + 1;
        const w0 = headHW(G, y, top, bot);
        hrun(g, hcx, y, w0, s[2]);
        for (let x = hcx - w0; x <= hcx + w0; x += 2) PX.px(g, x, y - 1, s[3]);
        for (let x = hcx - w0 + 1; x <= hcx + w0; x += 2) PX.px(g, x, y, s[1]);
        if (A.dir !== 'up') {
          PX.px(g, hcx - w0 - 1, y - 1, s[2]);
          PX.px(g, hcx + w0 + 1, y - 1, s[1]);
          PX.px(g, hcx, y - 2, C.headCol2 || PAL.gd3);
        }
        break;
      }
      case 'helm': {                        /* 볏 달린 청동 투구 */
        for (let y = top - 1; y <= G.eyeY + A.bob - 1; y++) {
          const w = headHW(G, y, top, bot) + (y > top ? 1 : 0);
          hrun(g, hcx, y, w, s[2]);
          PX.rect(g, hcx + w - 1, y, 2, 1, s[1]);
          PX.px(g, hcx - w, y, s[3]);
        }
        if (A.kind === 'side') {           /* 볏이 뒤로 흐른다 */
          for (let i = 0; i < 5; i++) {
            PX.rect(g, hcx - 3 + i, top - 4 + (i < 2 ? 1 : 0), 1, 4 + (i < 2 ? 0 : 1), (i & 1) ? s2[2] : s2[1]);
          }
          PX.rect(g, hcx - hw - 1, G.eyeY + A.bob - 1, 2, 3, s[1]);
        } else {
          PX.rect(g, hcx - 1, top - 4, 3, 5, s2[2]);
          PX.rect(g, hcx + 1, top - 4, 1, 5, s2[1]);
          PX.rect(g, hcx - 1, top - 4, 1, 5, s2[3]);
          if (A.dir === 'down') { PX.rect(g, hcx, G.eyeY + A.bob - 1, 1, 3, s[1]); }
        }
        break;
      }
      case 'corinth': {                     /* 코린토스 투구 */
        for (let y = top - 1; y <= bot - 1; y++) {
          const w = headHW(G, y, top, bot) + 1;
          if (A.dir !== 'up' && y >= G.eyeY + A.bob - 1 && y <= G.eyeY + A.bob + 1) {
            /* 눈구멍 */
            if (A.kind === 'side') { PX.rect(g, hcx - w, y, w + 1, 1, s[2]); PX.px(g, hcx - w, y, s[3]); }
            else {
              PX.rect(g, hcx - w, y, 2, 1, s[2]); PX.rect(g, hcx + w - 1, y, 2, 1, s[1]);
              PX.rect(g, hcx - 1, y, 3, 1, s[2]);
              PX.px(g, hcx - w, y, s[3]);
            }
            continue;
          }
          hrun(g, hcx, y, w, s[2]);
          PX.rect(g, hcx + w - 1, y, 2, 1, s[1]);
          PX.px(g, hcx - w, y, s[3]);
        }
        /* 볏 — 머리 위로 3px 이상 솟는다 */
        if (A.kind === 'side') {
          for (let i = 0; i < 6; i++) {
            PX.rect(g, hcx - 3 + i, top - 4 + (i < 2 ? 1 : 0), 1, 5, (i & 1) ? s2[2] : s2[1]);
          }
        } else {
          PX.rect(g, hcx - 1, top - 4, 3, 5, s2[2]);
          PX.rect(g, hcx + 1, top - 4, 1, 5, s2[1]);
          PX.rect(g, hcx - 1, top - 4, 1, 5, s2[3]);
          PX.px(g, hcx, top - 5, s2[2]);
        }
        break;
      }
      case 'flower': {
        const y = top + 1;
        const fx = (A.kind === 'side') ? hcx - hw : hcx + hw - 1;
        PX.px(g, fx, y, s[2]); PX.px(g, fx + 1, y - 1, s[2]);
        PX.px(g, fx + 1, y + 1, s[2]); PX.px(g, fx + 2, y, s[1]);
        PX.px(g, fx + 1, y, C.headCol2 || PAL.gd3);
        PX.px(g, fx - 1, y + 1, PAL.gr3);
        if (A.dir !== 'up') PX.px(g, hcx - hw + 1, y - 1, s[3]);
        break;
      }
      case 'veil': {                        /* 베일이 등 뒤로 흐른다 */
        const s3 = SH(C.headCol || PAL.iv3);
        const sway = A.idle ? 1 : 0;
        const to = (A.dir === 'up' ? G.waistY : G.chestY) + A.bob + sway;
        for (let y = top - 1; y <= to; y++) {
          if (y <= top + 2) {
            const w = headHW(G, y, top, bot);
            hrun(g, hcx, y, w, s3[2]);
            PX.px(g, hcx - w, y, s3[3]);
            PX.rect(g, hcx + w - 1, y, 2, 1, s3[1]);
          } else {
            const w = headHW(G, Math.min(y, bot), top, bot) + (y > bot ? 1 : 0);
            PX.rect(g, hcx - w, y, 2, 1, s3[2]);
            PX.rect(g, hcx + w - 1, y, 2, 1, s3[1]);
            if (A.dir === 'up') { hrun(g, hcx, y, w, s3[2]); PX.px(g, hcx - w, y, s3[3]); }
            if (A.kind === 'side') PX.rect(g, hcx - w - 1, y, 2, 1, s3[2]);
          }
        }
        break;
      }
      case 'moon': {                        /* 초승달 + 별 (머리 위 3px) */
        const y = top - 4;
        PX.px(g, hcx - 1, y, s[3]);
        PX.px(g, hcx - 2, y + 1, s[2]);
        PX.px(g, hcx - 2, y + 2, s[2]);
        PX.px(g, hcx - 1, y + 3, s[1]);
        PX.px(g, hcx, y + 3, s[1]);
        if (A.dir !== 'up') {
          PX.px(g, hcx + 2, y + 1, PAL.iv4);
          PX.px(g, hcx + 2, y + 2, s[2]);
          PX.px(g, hcx + 3, y + 2, s[1]);
          PX.px(g, hcx + 1, y + 2, s[2]);
        }
        const by = top + 2;
        hrun(g, hcx, by, headHW(G, by, top, bot), s[1]);
        PX.px(g, hcx - headHW(G, by, top, bot), by, s[3]);
        break;
      }
      case 'rag': {                         /* 두건 */
        for (let y = top; y <= top + 2; y++) {
          const w = headHW(G, y, top, bot);
          hrun(g, hcx, y, w, s[2]);
          PX.rect(g, hcx + w - 1, y, 2, 1, s[1]);
          PX.px(g, hcx - w, y, s[3]);
        }
        if (A.dir !== 'up') PX.dither(g, hcx - hw, top + 1, hw * 2 + 1, 1, s[3], 1);
        const kx = (A.kind === 'side') ? hcx - hw - 1 : hcx + hw;
        PX.rect(g, kx, top + 2, 2, 2, s[1]);
        break;
      }
      case 'hood': {
        for (let y = top - 1; y <= G.eyeY + A.bob - 1; y++) {
          const w = headHW(G, y, top, bot) + 1;
          hrun(g, hcx, y, w, s[2]);
          PX.rect(g, hcx + w - 1, y, 2, 1, s[1]);
          PX.px(g, hcx - w, y, s[3]);
        }
        break;
      }
    }
  }

  /* ---------- 3-9. 소품 ---------- */
  function propX(G, A) {
    if (A.kind === 'side') return G.cx + G.shHW + 1;
    return (A.dir === 'up') ? G.cx - G.shHW - 2 : G.cx + G.shHW + 2;
  }
  function propX2(G, A) {
    if (A.kind === 'side') return G.cx - 1;
    return (A.dir === 'up') ? G.cx + G.shHW + 2 : G.cx - G.shHW - 2;
  }

  function layProps(g, G, C, A) {
    if (C.propL) drawProp(g, G, C, A, C.propL, propX2(G, A), true);
    if (C.propR) drawProp(g, G, C, A, C.propR, propX(G, A), false);
  }

  /* 소품이 캔버스 밖으로 나가 외곽선이 잘리지 않도록 좌우 여백을 확보한다 */
  function clampX(G, x, lm, rm) { return Math.max(1 + lm, Math.min(x, G.w - 2 - rm)); }

  function drawProp(g, G, C, A, kind, x, isLeft) {
    const gy = G.chestY + A.bob + 1;          /* 손 높이 */
    const sk = SH(C.skin);
    /* 긴 소품은 머리 실루엣 위로 3~4px 솟게 한다 */
    const top1 = Math.max(1, G.headTop + A.bob - 4);

    switch (kind) {
      case 'sword': {
        x = clampX(G, x, 1, 1);
        const st = SH(PAL.st4);
        PX.rect(g, x, top1, 1, gy - top1 - 2, st[3]);
        PX.rect(g, x + 1, top1 + 1, 1, gy - top1 - 3, st[1]);
        PX.px(g, x, top1, PAL.st5);
        PX.rect(g, x - 1, gy - 2, 3, 1, PAL.gd2);      /* 코등이 */
        PX.rect(g, x, gy - 1, 1, 3, PAL.wd1);          /* 손잡이 */
        PX.px(g, x, gy + 2, PAL.gd3);
        PX.rect(g, x - 1, gy, 2, 2, sk[2]);            /* 손 */
        break;
      }
      case 'spear': {
        x = clampX(G, x, 1, 1);
        const wd = SH(PAL.wd2);
        PX.rect(g, x, top1 + 2, 1, G.hemY + A.bob - top1, wd[2]);
        PX.px(g, x + 1, top1 + 3, wd[0]);
        PX.rect(g, x, top1, 1, 2, PAL.st5);            /* 창날 */
        PX.px(g, x - 1, top1 + 1, PAL.st3);
        PX.px(g, x + 1, top1 + 1, PAL.st3);
        PX.px(g, x, top1 + 2, PAL.gd2);
        PX.rect(g, x - 1, gy, 2, 2, sk[2]);
        break;
      }
      case 'trident': {
        x = clampX(G, x, 2, 2);
        const gs = SH(PAL.gd3);
        PX.rect(g, x, top1 + 3, 1, G.hemY + A.bob - top1, gs[2]);
        PX.px(g, x + 1, top1 + 4, gs[0]);
        PX.rect(g, x - 2, top1 + 2, 5, 1, gs[2]);      /* 가로대 */
        PX.rect(g, x - 2, top1, 1, 3, gs[3]);
        PX.rect(g, x, top1 - 1, 1, 3, gs[3]);
        PX.rect(g, x + 2, top1, 1, 3, gs[1]);
        PX.rect(g, x - 1, gy, 2, 2, sk[2]);
        break;
      }
      case 'staff': {
        x = clampX(G, x, 1, 1);
        const gs = SH(PAL.gd2);
        PX.rect(g, x, top1 + 3, 1, G.hemY + A.bob - top1, gs[2]);
        PX.px(g, x + 1, top1 + 4, gs[0]);
        PX.circle(g, x, top1 + 1, 1, PAL.gd4);
        PX.px(g, x - 1, top1, PAL.iv4);
        PX.px(g, x + 1, top1 + 2, PAL.gd1);
        PX.rect(g, x - 1, gy, 2, 2, sk[2]);
        break;
      }
      case 'woodstaff': {                              /* 굽은 나무 지팡이 */
        x = clampX(G, x, 2, 3);
        const wd = SH(PAL.wd1);
        const bt = G.footY - 1;
        for (let y = top1 + 2; y <= bt; y++) {
          const t = (y - top1) / Math.max(1, bt - top1);
          const b = Math.round(Math.sin(t * Math.PI) * 2.2);   /* 몸 바깥으로 활처럼 휜다 */
          PX.px(g, x + b, y, wd[2]);
          PX.px(g, x + b + 1, y, wd[0]);
        }
        PX.px(g, x, top1 + 1, wd[2]);                  /* 몸 바깥으로 굽은 지팡이 머리 */
        PX.px(g, x + 1, top1, wd[2]);
        PX.px(g, x + 2, top1 + 1, wd[1]);
        PX.px(g, x + 2, top1 + 2, wd[1]);
        PX.rect(g, x - 1, gy, 2, 2, sk[2]);
        break;
      }
      case 'scepter': {
        x = clampX(G, x, 1, 1);
        const gs = SH(PAL.gd3);
        PX.rect(g, x, top1 + 3, 1, G.waistY + A.bob - top1, gs[2]);
        PX.px(g, x + 1, top1 + 4, gs[0]);
        PX.rect(g, x - 1, top1 + 1, 3, 2, gs[2]);
        PX.px(g, x - 1, top1 + 1, gs[3]);
        PX.px(g, x, top1, PAL.rd2);
        PX.rect(g, x - 1, gy, 2, 2, sk[2]);
        break;
      }
      case 'club': {          /* 어깨에 걸친 굵은 올리브나무 몽둥이 — 실루엣 밖으로 튀어나온다 */
        const wd = SH(PAL.wd1);
        const flip = (A.dir === 'up');
        const y0 = 1;                                    /* 몽둥이 머리 — 머리 위로 솟는다 */
        const y1 = G.waistY + A.bob;                     /* 손잡이 끝 */
        const xTop = G.w - 5, xBot = G.cx + 4;
        for (let y = y0; y <= y1; y++) {
          const t = (y - y0) / Math.max(1, y1 - y0);
          const bx = Math.round(xTop - (xTop - xBot) * t);
          const th = Math.max(1, Math.round(4 - t * 3));
          const px0 = flip ? (2 * G.cx - bx - th + 1) : bx;
          PX.rect(g, px0, y, th, 1, wd[2]);
          PX.px(g, flip ? px0 + th - 1 : px0, y, wd[3]);
          PX.px(g, flip ? px0 : px0 + th - 1, y, wd[0]);
          if (th > 2 && ((y + 1) % 4 === 0)) PX.px(g, px0 + 1, y, wd[0]);   /* 옹이 */
        }
        const hx = flip ? (2 * G.cx - xBot - 1) : xBot;
        PX.rect(g, hx, y1 - 1, 3, 3, sk[2]);             /* 움켜쥔 손 */
        PX.rect(g, hx, y1 - 1, 3, 1, sk[3]);
        break;
      }
      case 'oar': {                                    /* 세워 짚은 노 */
        x = clampX(G, x, 1, 1);
        const wd = SH(PAL.wd3);
        PX.rect(g, x, top1 + 4, 1, G.footY - top1 - 4, wd[2]);
        PX.px(g, x + 1, top1 + 5, wd[0]);
        PX.ellipse(g, x, top1 + 2, 1, 2, wd[2]);       /* 노깃 */
        PX.px(g, x - 1, top1 + 1, wd[3]);
        PX.px(g, x + 1, top1 + 3, wd[0]);
        PX.rect(g, x - 1, gy, 2, 2, sk[2]);
        break;
      }
      case 'oarShoulder': {                            /* 양어깨에 가로로 멘 노 */
        const wd = SH(PAL.wd3);
        const y0 = G.bodyTop + A.bob;
        PX.rect(g, 1, y0, G.w - 2, 1, wd[2]);
        PX.rect(g, 1, y0 + 1, G.w - 2, 1, wd[0]);
        const bx = (A.dir === 'up') ? 2 : G.w - 3;
        PX.ellipse(g, bx, y0 + 1, 1, 2, wd[2]);
        PX.px(g, bx - 1, y0, wd[3]);
        PX.rect(g, G.cx - 3, y0 + 2, 2, 2, sk[2]);     /* 노를 붙잡은 두 손 */
        PX.rect(g, G.cx + 2, y0 + 2, 2, 2, sk[1]);
        break;
      }
      case 'cup': {
        x = clampX(G, x, 1, 1);
        const gs = SH(PAL.gd3);
        const y = A.st ? gy - 3 : gy - 2;
        PX.rect(g, x - 1, y, 3, 2, gs[2]);
        PX.px(g, x - 1, y, gs[3]);
        PX.px(g, x + 1, y + 1, gs[0]);
        PX.rect(g, x, y + 2, 1, 1, gs[1]);
        PX.rect(g, x - 1, y + 3, 3, 1, gs[1]);
        PX.rect(g, x - 1, y + 4, 2, 2, sk[2]);
        break;
      }
      case 'basket': {
        x = clampX(G, x, 2, 2);
        const wd = SH(PAL.wd3);
        const y = G.waistY + A.bob - 1;
        PX.rect(g, x - 2, y, 4, 4, wd[2]);
        PX.rect(g, x - 2, y, 4, 1, wd[3]);
        PX.dither(g, x - 2, y + 1, 4, 3, wd[0], 1);
        PX.rect(g, x - 2, y - 1, 4, 1, PAL.iv3);
        PX.px(g, x - 1, y - 2, PAL.iv4);
        PX.rect(g, x, y - 2, 2, 2, sk[2]);
        break;
      }
      case 'yarn': {
        x = clampX(G, x, 2, 2);
        const y = G.waistY + A.bob - 2;
        PX.circle(g, x, y + 1, 2, PAL.iv3);
        PX.px(g, x - 1, y, PAL.iv4);
        PX.px(g, x + 1, y + 2, PAL.iv1);
        PX.px(g, x + 2, y - 1, PAL.rd2);
        PX.px(g, x + 1, y - 2, PAL.rd2);
        PX.rect(g, x - 1, y - 2, 2, 2, sk[2]);
        break;
      }
      case 'shield': {
        const wd = SH(PAL.wd2);
        const rr = Math.max(2, G.shHW - 1);
        const cxs = (A.kind === 'side') ? G.cx + 1 : clampX(G, x, rr, rr);
        const cys = G.chestY + A.bob + 1;
        const r = rr;
        PX.ellipse(g, cxs, cys, r, r, wd[2]);
        PX.ellipseOutline(g, cxs, cys, r, r, PAL.gd1);
        PX.px(g, cxs - r + 1, cys - 1, wd[3]);
        PX.circle(g, cxs, cys, 1, PAL.gd2);
        PX.px(g, cxs, cys, PAL.gd3);
        break;
      }
    }
  }

  /* ---------- 3-10. 반투명(예언자) ---------- */
  /* 반투명 — 형태를 지우지 않도록 밑단과 실루엣 안쪽 1px 에만 디더를 남긴다 */
  function layGhost(g, G, C, A) {
    const top = G.bodyTop + A.bob, hem = G.hemY + A.bob;
    const span = Math.max(1, hem - top);
    const ph = A.idle;
    /* 로브 밑단 4px 가 아래로 갈수록 흐려진다 */
    PX.dither(g, G.cx - G.hemHW, hem - 1, G.hemHW * 2 + 1, 2, PAL.st5, 2, ph);
    PX.dither(g, G.cx - G.hemHW + 1, hem - 3, G.hemHW * 2 - 1, 2, PAL.st4, 1, ph);
    /* 어깨선 안쪽 테두리만 아른거린다 */
    for (let y = top; y <= hem; y++) {
      if (((y + ph) & 1) === 0) continue;
      const t = (y - top) / span;
      const hw = Math.round(G.shHW + (G.hemHW - G.shHW) * t * t);
      PX.px(g, G.cx - hw, y, PAL.st5);
      PX.px(g, G.cx + hw, y, PAL.st4);
    }
  }

  /* ==================================================================
     4. 렌더 & 캐시
     ================================================================== */
  const GEO = {}, CACHE = {};
  for (const id of IDS) GEO[id] = geom(CFG[id]);

  function render(id, dir, frame) {
    const C = CFG[id], G = GEO[id];
    const kind = (dir === 'left' || dir === 'right') ? 'side' : dir;
    const st = (frame === 1) ? 1 : (frame === 3 ? -1 : 0);
    /* idle: 정지 프레임(0,2)에서도 1px 씩 살아 움직이게 하는 미세 모션 플래그 */
    const A = {
      dir: dir, kind: kind, frame: frame, st: st,
      bob: st ? -1 : 0, hx: kind === 'side' ? 1 : 0,
      idle: (frame === 2) ? 1 : 0, breathe: (frame === 2 && C.idle === 'breathe') ? 1 : 0
    };

    const cv = PX.canvas(G.w, G.h);
    const g = PX.ctx2d(cv);
    layBack(g, G, C, A);
    layLegs(g, G, C, A);
    layBody(g, G, C, A);
    layArms(g, G, C, A);
    layHead(g, G, C, A);
    layHair(g, G, C, A);
    layFace(g, G, C, A);
    layHeadgear(g, G, C, A);
    layProps(g, G, C, A);
    if (C.ghost) layGhost(g, G, C, A);
    PX.outline(cv, PAL.ink0);

    /* 그림자는 외곽선 대상이 아니므로 뒤에 따로 깐다 */
    const out = PX.canvas(G.w, G.h);
    const og = PX.ctx2d(out);
    PX.shadow(og, G.cx, G.footY, G.shRX, G.shRY, 0.30);
    og.drawImage(cv, 0, 0);
    return out;
  }

  function mirrored(src) {
    const w = src.width, h = src.height;
    const out = PX.canvas(w, h);
    const og = PX.ctx2d(out);
    const sg = PX.ctx2d(src);
    const s = sg.getImageData(0, 0, w, h).data;
    const img = og.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const a = (y * w + x) * 4, b = (y * w + (w - 1 - x)) * 4;
      d[a] = s[b]; d[a + 1] = s[b + 1]; d[a + 2] = s[b + 2]; d[a + 3] = s[b + 3];
    }
    og.putImageData(img, 0, 0);
    return out;
  }

  function build() {
    for (const id of IDS) {
      const set = { down: [], up: [], right: [], left: [] };
      for (let f = 0; f < 4; f++) {
        set.down[f] = render(id, 'down', f);
        set.up[f] = render(id, 'up', f);
        set.right[f] = render(id, 'right', f);
      }
      for (let f = 0; f < 4; f++) set.left[f] = mirrored(set.right[f]);
      CACHE[id] = set;
    }
  }
  build();

  /* ==================================================================
     5. 공개 API
     ================================================================== */
  function get(id, dir, frame) {
    const set = CACHE[id] || CACHE.odysseus;
    const d = (dir === 'up' || dir === 'left' || dir === 'right') ? dir : 'down';
    const f = ((frame | 0) % 4 + 4) % 4;
    return set[d][f];
  }

  function draw(g, id, dir, frame, cx, by, motion) {
    const hd = HD_ACTORS[id], img = HD_IMAGES[id];
    if (hd && img && img.complete && img.naturalWidth) {
      const rows = { down: 0, up: 1, right: 2, left: 3 };
      const row = rows[dir] === undefined ? 0 : rows[dir];
      const col = ((frame | 0) % 4 + 4) % 4;
      const sway = motion && motion.sway ? motion.sway : 0;
      const bob = motion && motion.bob ? motion.bob : 0;
      const dx = Math.round(cx - hd.w / 2 + sway);
      const dy = Math.round(by - hd.h * HD_CELL.footY / HD_CELL.h + bob);
      /* 그림자는 땅에 고정하고 몸만 위아래로 움직여 발을 들어 올리는
         느낌을 만든다. 그림자까지 따라 움직이면 다시 미끄러져 보인다. */
      PX.shadow(g, cx | 0, by | 0, Math.max(6, Math.round(hd.w * 0.28)), 2, 0.28);
      g.save();
      g.imageSmoothingEnabled = true;
      g.drawImage(img, col * HD_CELL.w, row * HD_CELL.h, HD_CELL.w, HD_CELL.h,
        dx, dy, hd.w, hd.h);
      g.restore();
      return;
    }
    const c = get(id, dir, frame);
    const G = GEO[id] || GEO.odysseus;
    /* v4 HD: 지도에서 장수의 실루엣이 지형 소품에 묻히지 않도록 20% 확대한다.
       발 위치는 고정해 이동 판정과 원근 정렬은 구버전과 동일하다. */
    const scale = 1.2;
    const dw = Math.round(c.width * scale), dh = Math.round(c.height * scale);
    const foot = Math.round(G.footY * scale);
    const sway = motion && motion.sway ? motion.sway : 0;
    const bob = motion && motion.bob ? motion.bob : 0;
    g.drawImage(c, (cx | 0) - (dw >> 1) + sway, (by | 0) - foot + bob, dw, dh);
  }

  function size(id) { const G = GEO[id] || GEO.odysseus; return { w: G.w, h: G.h, footY: G.footY }; }

  return { draw: draw, get: get, size: size, IDS: IDS, W: W, H: H };
})();
