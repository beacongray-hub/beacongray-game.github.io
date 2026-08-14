/* engine/ui.js — 삼국지 영걸전(1993) 풍 UI 스킨 (전역 UI 하나만 선언)
   - 모든 함수는 HTML "문자열"만 돌려준다. DOM 을 만들거나 document 에 붙이지 않는다.
   - 색은 PAL 과 1:1 로 맞춘 CSS 변수만 쓴다. 웹폰트 로드 없음. 모서리 둥글리기 없음. */
"use strict";
const UI = (function () {

  /* ══════════════════════════════════════════════════════════════════
     0. 내부 유틸
     ══════════════════════════════════════════════════════════════════ */
  const ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function (c) { return ENT[c]; });
  }
  /* 줄바꿈을 <br> 로 바꾼 안전한 본문 */
  function escLines(s) { return esc(s).replace(/\r?\n/g, '<br>'); }
  function num(v, d) { const n = Number(v); return isFinite(n) ? n : (d || 0); }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function pct(cur, max) {
    const m = num(max, 0), c = num(cur, 0);
    if (m <= 0) return 0;
    return clamp(Math.round((c / m) * 1000) / 10, 0, 100);
  }
  function cls() {
    const out = [];
    for (let i = 0; i < arguments.length; i++) { const a = arguments[i]; if (a) out.push(String(a)); }
    return out.join(' ');
  }
  /* attrs.data = {k:v} -> ' data-k="v"' */
  function dataAttrs(d) {
    let out = '';
    if (!d) return out;
    for (const k in d) {
      if (!Object.prototype.hasOwnProperty.call(d, k)) continue;
      if (d[k] === null || d[k] === undefined) continue;
      out += ' data-' + esc(String(k).replace(/[^a-zA-Z0-9_-]/g, '')) + '="' + esc(d[k]) + '"';
    }
    return out;
  }
  function idAttr(id) { return id ? ' id="' + esc(id) + '"' : ''; }

  /* ══════════════════════════════════════════════════════════════════
     1. CSS — <style> 안에 그대로 들어간다
     ══════════════════════════════════════════════════════════════════ */
  const CSS = `
@font-face{font-family:"Pretendard";src:url("assets/Pretendard-Light.woff2") format("woff2");font-style:normal;font-weight:300;font-display:swap}
@font-face{font-family:"Pretendard";src:url("assets/Pretendard-Regular.woff2") format("woff2");font-style:normal;font-weight:400 600;font-display:swap}
@font-face{font-family:"Pretendard";src:url("assets/Pretendard-Bold.woff2") format("woff2");font-style:normal;font-weight:700 900;font-display:swap}
/* ───────── 1. 팔레트 (engine/pixel.js 의 PAL 과 동일한 색값) ───────── */
:root{
  --ink0:#0b0812; --ink1:#171223; --ink2:#241c34; --ink3:#372a4c; --ink4:#4d3c66;
  --sk0:#5d3226;  --sk1:#8d5136;  --sk2:#bd7f52;  --sk3:#dda87c;  --sk4:#f3d2a8;
  --gd0:#5c3d10;  --gd1:#96681c;  --gd2:#c99a32;  --gd3:#eec358;  --gd4:#ffe9a6;
  --rd0:#3d1119;  --rd1:#6e2325;  --rd2:#a84334;  --rd3:#cd6f47;  --rd4:#e79c6c;
  --se0:#08202f;  --se1:#0f3f56;  --se2:#1a6480;  --se3:#2f93a3;  --se4:#6cc6c6; --se5:#b3e8e0;
  --gr0:#1b3322;  --gr1:#2f562e;  --gr2:#4a7f3c;  --gr3:#75a94c;  --gr4:#a8cd6e; --gr5:#d3e79a;
  --sd0:#5f4327;  --sd1:#8d6939;  --sd2:#b8905a;  --sd3:#dcbb87;  --sd4:#f3e0b4;
  --st0:#26232c;  --st1:#403c49;  --st2:#635d6e;  --st3:#8d8697;  --st4:#b8b1bf; --st5:#e3dee6;
  --wd0:#2e1b11;  --wd1:#4c2f1b;  --wd2:#74492a;  --wd3:#9c6a3d;  --wd4:#c2915c;
  --pu0:#20122d;  --pu1:#3b2050;  --pu2:#5d3577;  --pu3:#8757a0;  --pu4:#b48ac6;
  --iv0:#8e8067;  --iv1:#b6a888;  --iv2:#d8ccab;  --iv3:#f0e6cc;  --iv4:#fff8e8;
  --fl0:#7a2408;  --fl1:#c25412;  --fl2:#ef8f1e;  --fl3:#ffc94a;  --fl4:#fff3b0;

  /* 글꼴: 웹폰트 로드 없이 시스템 글꼴만 (오프라인 실행) */
  --ui-font:"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
  --ui-serif:"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;

  /* 90년대식 딱딱한 그림자 (blur 0) */
  --hard:2px 2px 0 var(--ink0);
  --hard1:1px 1px 0 var(--ink0);

  --side-w:300px;
  --win-bg:var(--ink1);
  --win-fg:var(--iv3);
}

/* ───────── 2. 리셋 ───────── */
*,*::before,*::after{box-sizing:border-box;}
html{-webkit-text-size-adjust:100%;}
body{
  margin:0; padding:0;
  background-color:var(--ink0);
  background-image:repeating-linear-gradient(0deg, rgba(255,255,255,.016) 0 1px, rgba(0,0,0,0) 1px 3px);
  color:var(--iv3);
  font-family:var(--ui-font); font-size:15px; line-height:1.6;
  letter-spacing:.01em;
}
h1,h2,h3,h4,p,dl,dd,dt,ul,ol,li,figure{margin:0; padding:0;}
ul,ol{list-style:none;}
img,canvas{max-width:100%;}
button{font:inherit; color:inherit; background:none; border:0;}
body,button,input,select,textarea,.btn,.tab,.chip,.nametag,.storyveil,.od-cinema,
.win,.talk,.dlgwrap,.side,.hero,.qgoal,.qgroup,.lorehead,.sys-modal,.sys-slot,
.artifact-sheet,.conversation-shell,.event-dialog,.introveil,.mg-wrap{
  font-family:"Pretendard","Malgun Gothic",sans-serif!important;
}
a{color:var(--gd3);}
:focus{outline:none;}
:focus-visible{outline:3px solid var(--gd4); outline-offset:2px;}

/* ───────── 3. 뼈대 레이아웃 ───────── */
.app{
  max-width:1200px; margin:0 auto; padding:10px;
  display:flex; flex-direction:column; gap:10px;
}
.stage{
  display:grid; grid-template-columns:minmax(0,1fr) var(--side-w);
  gap:10px; align-items:start;
}
.screen{min-width:0;}
.side{min-width:0; display:flex; flex-direction:column; gap:10px;}
.side > *{width:100%;}

/* 게임 캔버스 — 그림자/필터 금지 (픽셀아트가 뭉개진다) */
.cv,.screen canvas{
  image-rendering:pixelated;
  image-rendering:crisp-edges;
  width:100%; display:block;
  aspect-ratio:384 / 240;
  background:var(--ink0);
  filter:none; box-shadow:none;
}

/* ───────── 4. 금장 이중(3중) 창틀 ─────────
   구조: 바깥 2px 어두운 금(gd0) → 3px 금색 본체(위/왼 gd3, 아래/오른 gd1)
         → 1px 암부(ink0) → 내용 영역(ink1 또는 양피지 iv3) */
.win{
  position:relative;
  border:2px solid var(--gd0);
  padding:4px;
  background:var(--win-bg);
  color:var(--win-fg);
  box-shadow:
    inset  1px  1px 0 0 var(--gd3),   /* 금 본체 밝은 면(위·왼) */
    inset -1px -1px 0 0 var(--gd1),   /* 금 본체 어두운 면(아래·오른) */
    inset  0 0 0 3px var(--gd2),      /* 금 본체 3px */
    inset  0 0 0 4px var(--ink0);     /* 1px 암부 */
}
/* 네 모서리 6×6 금색 장식 — 그라데이션 없이 단색만 조합
   위 두 개는 .win 의 의사요소, 아래 두 개는 .win-bd 의 의사요소를 쓴다
   (.win-bd 는 position:static 이라 .win 을 기준으로 배치된다) */
.win::before,.win::after,
.win-bd::before,.win-bd::after{
  content:''; position:absolute; width:6px; height:6px;
  background:var(--gd2);
  box-shadow:
    inset  1px  1px 0 0 var(--gd4),
    inset -1px -1px 0 0 var(--gd1),
    0 0 0 1px var(--gd0);
  pointer-events:none; z-index:2;
}
.win::before{left:2px;  top:2px;}
.win::after {right:2px; top:2px;}
.win-bd::before{left:2px;  bottom:2px;}
.win-bd::after {right:2px; bottom:2px;}

/* 창 제목줄 */
.win-hd{
  position:relative; z-index:1;
  display:flex; align-items:flex-start; gap:8px;
  background:var(--ink0);
  box-shadow:inset 0 -1px 0 0 var(--gd1), inset 0 1px 0 0 var(--ink2);
  padding:5px 10px;
}
.win-tl{
  flex:1 1 auto; min-width:0;
  font-family:var(--ui-serif); font-size:14px; font-weight:700;
  letter-spacing:.08em; text-transform:none; line-height:1.45;
  color:var(--gd3); text-shadow:var(--hard1);
  white-space:normal; overflow-wrap:anywhere;
}
.win-dia{flex:0 0 auto; color:var(--gd2); font-size:10px; line-height:1; text-shadow:var(--hard1);}
.win-bd{position:static; padding:0;}
.win-bd.is-pad{padding:10px 12px;}
.win-bd.scroll{max-height:260px; overflow-y:auto;}

/* 창 색조 */
.win--gold{--win-bg:var(--ink1); --win-fg:var(--iv3);}
.win--dark{--win-bg:var(--ink0); --win-fg:var(--st4);}
.win--dark .win-hd{background:var(--ink1);}
.win--blue{--win-bg:var(--se0); --win-fg:var(--se5);}
.win--blue .win-hd{background:var(--se1); box-shadow:inset 0 -1px 0 0 var(--gd1), inset 0 1px 0 0 var(--se2);}
.win--paper{--win-bg:var(--iv3); --win-fg:var(--ink1);}
.win--paper .win-bd{text-shadow:none;}
.win--paper .win-hd{background:var(--ink1);}

/* ───────── 5. 탭 바 ───────── */
.tabs{
  display:flex; flex-wrap:wrap; gap:3px;
  padding:3px; background:var(--ink0);
  box-shadow:inset 0 0 0 1px var(--gd0);
}
.tab{
  flex:1 1 auto; min-width:64px; min-height:34px;
  padding:6px 10px; cursor:pointer;
  font-size:14px; font-weight:700; color:var(--iv1);
  background:var(--ink2);
  box-shadow:inset 1px 1px 0 0 var(--ink4), inset -1px -1px 0 0 var(--ink0), inset 0 0 0 1px var(--ink0);
  text-shadow:var(--hard1);
}
.tab:hover{color:var(--gd4);}
.tab.is-on{
  color:var(--ink0); background:var(--gd2);
  box-shadow:inset 1px 1px 0 0 var(--gd4), inset -1px -1px 0 0 var(--gd1), inset 0 0 0 1px var(--gd0);
  text-shadow:none;
}
.tab:active{transform:translate(2px,2px);}
.tab[disabled]{opacity:.45; cursor:not-allowed;}

/* ───────── 6. 버튼 ───────── */
.btn{
  display:inline-flex; align-items:center; justify-content:center; gap:6px;
  min-height:38px; padding:8px 14px; cursor:pointer;
  font-size:15px; font-weight:700; line-height:1.2;
  color:var(--iv4); background:var(--ink2);
  border:2px solid var(--gd0);
  box-shadow:inset 1px 1px 0 0 var(--ink4), inset -1px -1px 0 0 var(--ink0), 2px 2px 0 0 var(--ink0);
  text-shadow:var(--hard1);
  transition:none;
}
.btn:hover{background:var(--ink3); color:var(--gd4);}
.btn:active{transform:translate(2px,2px); box-shadow:inset 1px 1px 0 0 var(--ink0), inset -1px -1px 0 0 var(--ink4), 0 0 0 0 var(--ink0);}
.btn[disabled],.btn.is-off{
  cursor:not-allowed; color:var(--st2); background:var(--ink1);
  border-color:var(--st0); box-shadow:inset 0 0 0 1px var(--ink0); text-shadow:none;
  transform:none; opacity:.7;
}
.btn--pri{
  color:var(--ink0); background:var(--gd2); border-color:var(--gd0);
  box-shadow:inset 1px 1px 0 0 var(--gd4), inset -1px -1px 0 0 var(--gd1), 2px 2px 0 0 var(--ink0);
  text-shadow:none;
}
.btn--pri:hover{background:var(--gd3); color:var(--ink0);}
.btn--danger{
  color:var(--iv4); background:var(--rd2); border-color:var(--rd0);
  box-shadow:inset 1px 1px 0 0 var(--rd3), inset -1px -1px 0 0 var(--rd1), 2px 2px 0 0 var(--ink0);
}
.btn--danger:hover{background:var(--rd3); color:var(--ink0);}
.btn--ghost{background:transparent; border-color:var(--gd1); box-shadow:inset 0 0 0 1px var(--ink0);}
.btn--wide{width:100%;}
.btn--big{min-height:52px; font-size:17px; padding:12px 16px;}

/* ───────── 7. 게이지 4종 ───────── */
.gauge{display:block; margin:0 0 8px 0;}
.gauge:last-child{margin-bottom:0;}
.gauge-hd{
  display:flex; align-items:baseline; gap:6px;
  font-size:13px; font-weight:700; letter-spacing:.06em;
  color:var(--iv2); text-shadow:var(--hard1); margin-bottom:3px;
}
.gauge-ico{flex:0 0 auto; font-size:12px; line-height:1;}
.gauge-lb{flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
.gauge-vl{flex:0 0 auto; font-variant-numeric:tabular-nums; color:var(--iv4); text-shadow:var(--hard);}
.gauge-bar{
  position:relative; height:14px; overflow:hidden;
  background:var(--ink0);
  box-shadow:inset 0 0 0 1px var(--gd0), inset 1px 1px 0 1px var(--ink2);
}
.gauge-fill{
  position:absolute; left:0; top:0; bottom:0;
  background:var(--st2);
  box-shadow:inset 0 2px 0 0 var(--st3), inset 0 -3px 0 0 var(--st1);
}
.gauge-bar::after{
  content:''; position:absolute; inset:0; pointer-events:none;
  background-image:repeating-linear-gradient(90deg, rgba(11,8,18,.55) 0 1px, rgba(0,0,0,0) 1px 10%);
}
.gauge--hp   .gauge-fill{background:var(--rd2); box-shadow:inset 0 2px 0 0 var(--rd3), inset 0 -3px 0 0 var(--rd1);}
.gauge--mp   .gauge-fill{background:var(--se2); box-shadow:inset 0 2px 0 0 var(--se4), inset 0 -3px 0 0 var(--se1);}
.gauge--exp  .gauge-fill{background:var(--gd2); box-shadow:inset 0 2px 0 0 var(--gd4), inset 0 -3px 0 0 var(--gd1);}
.gauge--quest .gauge-fill{background:var(--pu2); box-shadow:inset 0 2px 0 0 var(--pu4), inset 0 -3px 0 0 var(--pu1);}
.gauge--hp .gauge-ico{color:var(--rd3);}
.gauge--mp .gauge-ico{color:var(--se4);}
.gauge--exp .gauge-ico{color:var(--gd3);}
.gauge--quest .gauge-ico{color:var(--pu4);}
.gauge.is-low .gauge-fill{animation:uiBlink .7s steps(2,end) infinite;}
.gauge.is-low .gauge-vl{color:var(--rd4);}

/* ───────── 8. 스탯표 (2열) ───────── */
.stats{display:grid; grid-template-columns:1fr 1fr; gap:3px;}
.stat{
  display:flex; align-items:baseline; justify-content:space-between; gap:6px;
  padding:4px 7px; background:var(--ink0);
  box-shadow:inset 0 0 0 1px var(--ink2), inset 1px 1px 0 0 var(--ink3);
}
.stat-k{font-size:13px; color:var(--iv1); letter-spacing:.04em;}
.stat-v{
  font-size:15px; font-weight:700; color:var(--gd3);
  font-variant-numeric:tabular-nums; text-shadow:var(--hard1);
}
.stats--1{grid-template-columns:1fr;}

/* ───────── 9. 인물 초상화 액자 / 이름·칭호 ───────── */
.por{
  display:block; margin:0 auto; width:120px; padding:3px;
  background:var(--ink0);
  box-shadow:inset 0 0 0 1px var(--gd1), 0 0 0 2px var(--gd0);
}
.por canvas,.por img{display:block; width:100%; image-rendering:pixelated; aspect-ratio:80 / 96;}
.who{text-align:center; margin:8px 0 10px;}
.who-nm{
  font-family:var(--ui-serif); font-size:19px; font-weight:700;
  color:var(--gd3); text-shadow:var(--hard); letter-spacing:.05em;
}
.who-ti{display:block; font-size:13px; color:var(--iv1); letter-spacing:.08em; margin-top:2px;}

/* ───────── 10. 등급 배지 6단 ───────── */
.badge{
  display:inline-flex; align-items:center; gap:6px; max-width:100%;
  padding:4px 9px; font-size:13px; font-weight:700; letter-spacing:.04em;
  border:2px solid var(--ink0);
  background:var(--st1); color:var(--st5);
  box-shadow:inset 1px 1px 0 0 var(--st2), inset -1px -1px 0 0 var(--st0), 2px 2px 0 0 var(--ink0);
  text-shadow:var(--hard1);
}
.badge-star{flex:0 0 auto; font-size:11px; letter-spacing:.05em; line-height:1;}
.badge-nm{flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
.badge--t0{background:var(--st1); color:var(--st5); box-shadow:inset 1px 1px 0 0 var(--st2), inset -1px -1px 0 0 var(--st0), 2px 2px 0 0 var(--ink0);}
.badge--t1{background:var(--gr1); color:var(--gr5); box-shadow:inset 1px 1px 0 0 var(--gr2), inset -1px -1px 0 0 var(--gr0), 2px 2px 0 0 var(--ink0);}
.badge--t2{background:var(--se1); color:var(--se5); box-shadow:inset 1px 1px 0 0 var(--se2), inset -1px -1px 0 0 var(--se0), 2px 2px 0 0 var(--ink0);}
.badge--t3{background:var(--pu1); color:var(--pu4); box-shadow:inset 1px 1px 0 0 var(--pu2), inset -1px -1px 0 0 var(--pu0), 2px 2px 0 0 var(--ink0);}
.badge--t4{background:var(--gd1); color:var(--gd4); border-color:var(--gd0); box-shadow:inset 1px 1px 0 0 var(--gd2), inset -1px -1px 0 0 var(--gd0), 2px 2px 0 0 var(--ink0);}
.badge--t5{
  position:relative; background:var(--fl1); color:var(--fl4); border-color:var(--gd0);
  box-shadow:inset 1px 1px 0 0 var(--fl3), inset -1px -1px 0 0 var(--fl0), 2px 2px 0 0 var(--ink0);
}
.badge--t5::after{
  content:'✦'; position:absolute; top:-8px; right:-6px;
  font-size:12px; color:var(--fl4); text-shadow:var(--hard1);
  animation:uiSpark 1.1s steps(4,end) infinite;
}

/* ───────── 11. 아이템 격자 + 희귀도 4단 ───────── */
.items{display:grid; grid-template-columns:repeat(auto-fill, minmax(84px,1fr)); gap:6px;}
.item{
  position:relative; display:flex; flex-direction:column; align-items:center; gap:3px;
  padding:6px 4px 5px; text-align:center; cursor:pointer;
  background:var(--ink0); color:var(--iv2);
  border:2px solid var(--st2);
  box-shadow:inset 0 0 0 1px var(--ink0), 2px 2px 0 0 var(--ink0);
}
.item:hover{background:var(--ink1);}
.item:active{transform:translate(2px,2px); box-shadow:inset 0 0 0 1px var(--ink0);}
.item-ic{
  display:flex; align-items:center; justify-content:center;
  width:40px; height:40px; font-size:22px; line-height:1;
  background:var(--ink1); box-shadow:inset 0 0 0 1px var(--ink2);
}
.item-ic canvas,.item-ic img{image-rendering:pixelated; display:block;}
.item-nm{font-size:13px; font-weight:700; line-height:1.25; word-break:keep-all; text-shadow:var(--hard1);}
.item-qty{
  position:absolute; right:2px; bottom:2px;
  padding:0 4px; font-size:12px; font-weight:700;
  background:var(--ink0); color:var(--gd4);
  box-shadow:inset 0 0 0 1px var(--gd1); font-variant-numeric:tabular-nums;
}
.item-rar{
  font-size:11px; letter-spacing:.06em; padding:0 4px;
  background:var(--ink1); box-shadow:inset 0 0 0 1px var(--ink2);
}
.item-eq{
  position:absolute; left:2px; top:2px;
  padding:0 4px; font-size:11px; font-weight:700;
  background:var(--gd2); color:var(--ink0); box-shadow:0 0 0 1px var(--gd0);
}
.item--common{border-color:var(--st2);}
.item--common .item-rar{color:var(--st4);}
.item--good{border-color:var(--gr2);}
.item--good .item-rar{color:var(--gr4);}
.item--good .item-nm{color:var(--gr5);}
.item--rare{border-color:var(--se3);}
.item--rare .item-rar{color:var(--se4);}
.item--rare .item-nm{color:var(--se5);}
.item--legend{border-color:var(--gd2); box-shadow:inset 0 0 0 1px var(--gd0), 2px 2px 0 0 var(--ink0);}
.item--legend .item-rar{color:var(--gd4);}
.item--legend .item-nm{color:var(--gd4);}
.item-desc{
  grid-column:1 / -1; font-size:13px; color:var(--iv1);
  padding:4px 6px; background:var(--ink0); box-shadow:inset 0 0 0 1px var(--ink2);
}

/* ───────── 12. 하단 메시지 바 ───────── */
.msg{
  display:flex; align-items:stretch; gap:0;
  border:2px solid var(--gd0); padding:4px;
  background:var(--ink1);
  box-shadow:
    inset  1px  1px 0 0 var(--gd3),
    inset -1px -1px 0 0 var(--gd1),
    inset  0 0 0 3px var(--gd2),
    inset  0 0 0 4px var(--ink0);
  min-height:86px;
}
.msg-ic{
  flex:0 0 auto; width:64px; margin-right:10px;
  display:flex; align-items:center; justify-content:center;
  background:var(--ink0); box-shadow:inset 0 0 0 1px var(--gd1);
}
.msg-ic canvas,.msg-ic img{display:block; width:100%; image-rendering:pixelated;}
.msg-bd{flex:1 1 auto; min-width:0; padding:6px 8px 6px 0; display:flex; flex-direction:column; gap:3px;}
.msg-nm{
  font-family:var(--ui-serif); font-size:15px; font-weight:700;
  color:var(--gd3); text-shadow:var(--hard1); letter-spacing:.06em;
}
.msg-nm::before{content:'◆ '; color:var(--gd1); font-size:10px;}
.msg-tx{font-size:16px; line-height:1.6; color:var(--iv3); word-break:keep-all;}
.msg-next{
  align-self:flex-end; margin-top:auto;
  font-size:13px; color:var(--gd4); text-shadow:var(--hard1);
  animation:uiFloatSm .9s steps(2,end) infinite;
}

/* ───────── 13. 대화창 (초상화 + 이름 + 본문 + 다음) ───────── */
.talk{display:flex; gap:10px; align-items:flex-start;}
.talk-por{
  flex:0 0 auto; width:96px; padding:3px;
  background:var(--ink0); box-shadow:inset 0 0 0 1px var(--gd1), 0 0 0 1px var(--gd0);
}
.talk-por canvas,.talk-por img{display:block; width:100%; image-rendering:pixelated; aspect-ratio:80 / 96;}
.talk-bd{flex:1 1 auto; min-width:0; display:grid; grid-template-columns:minmax(0,1fr); align-content:start; gap:7px;}
.talk-nm{
  display:block; position:static; margin:0; font-family:var(--ui-serif); font-size:16px; font-weight:700; line-height:1.4;
  color:var(--gd3); text-shadow:var(--hard1); letter-spacing:.06em;
}
.talk-tx{display:block; position:static; margin:0; font-size:16px; line-height:1.7; color:var(--iv3); word-break:keep-all; min-height:3.4em;}
.talk-ft{display:flex; justify-content:flex-end; gap:6px;}

/* ───────── 14. 퀴즈 화면 ───────── */
.quiz-no{
  display:inline-block; padding:2px 8px; margin-bottom:6px;
  font-size:12px; font-weight:700; letter-spacing:.1em;
  background:var(--gd2); color:var(--ink0); box-shadow:2px 2px 0 0 var(--ink0);
}
.quiz-q{
  font-family:var(--ui-serif); font-size:18px; line-height:1.65; font-weight:700;
  color:var(--iv4); text-shadow:var(--hard); word-break:keep-all; margin-bottom:10px;
}
.quiz-opts{display:grid; grid-template-columns:1fr 1fr; gap:8px;}
.quiz-opt{
  display:flex; align-items:center; gap:8px; text-align:left;
  min-height:56px; padding:10px 12px; cursor:pointer;
  font-size:16px; font-weight:700; line-height:1.35; word-break:keep-all;
  color:var(--iv4); background:var(--ink2);
  border:2px solid var(--gd0);
  box-shadow:inset 1px 1px 0 0 var(--ink4), inset -1px -1px 0 0 var(--ink0), 2px 2px 0 0 var(--ink0);
  text-shadow:var(--hard1);
}
.quiz-opt:hover{background:var(--ink3); color:var(--gd4);}
.quiz-opt:active{transform:translate(2px,2px); box-shadow:inset 1px 1px 0 0 var(--ink0);}
.quiz-opt[disabled]{cursor:not-allowed; opacity:.6; transform:none;}
.quiz-key{
  flex:0 0 auto; width:26px; height:26px;
  display:flex; align-items:center; justify-content:center;
  font-size:14px; background:var(--gd2); color:var(--ink0);
  box-shadow:inset -1px -1px 0 0 var(--gd1), inset 1px 1px 0 0 var(--gd4);
  text-shadow:none;
}
.quiz-opt.is-ok{background:var(--gr1); border-color:var(--gr0); color:var(--gr5);}
.quiz-opt.is-ok .quiz-key{background:var(--gr3);}
.quiz-opt.is-no{background:var(--rd1); border-color:var(--rd0); color:var(--rd4);}
.quiz-opt.is-no .quiz-key{background:var(--rd2); color:var(--iv4);}
.quiz-fb{
  display:flex; align-items:flex-start; gap:8px; margin-top:10px;
  padding:9px 11px; font-size:15px; line-height:1.6; word-break:keep-all;
  border:2px solid var(--ink0); background:var(--ink0);
  animation:uiPop .18s steps(3,end) both;
}
.quiz-fb-ic{flex:0 0 auto; font-size:19px; line-height:1.3;}
.quiz-fb.is-ok{border-color:var(--gr2); color:var(--gr5); box-shadow:inset 0 0 0 1px var(--gr0);}
.quiz-fb.is-no{border-color:var(--rd2); color:var(--rd4); box-shadow:inset 0 0 0 1px var(--rd0);}

/* ───────── 15. 퀘스트 목록 ───────── */
.quests{display:flex; flex-direction:column; gap:5px;}
.quest{
  display:flex; align-items:flex-start; gap:7px;
  padding:6px 8px; font-size:14px; line-height:1.5; word-break:keep-all;
  background:var(--ink0); box-shadow:inset 0 0 0 1px var(--ink2), inset 2px 0 0 0 var(--gd1);
}
.quest-ck{
  flex:0 0 auto; width:18px; height:18px; margin-top:2px;
  display:flex; align-items:center; justify-content:center;
  font-size:12px; font-weight:700;
  background:var(--ink1); color:var(--iv1);
  box-shadow:inset 0 0 0 1px var(--st2);
}
.quest-tx{flex:1 1 auto; min-width:0; color:var(--iv3);}
.quest-sub{display:block; font-size:12px; color:var(--iv0); margin-top:1px;}
.quest.is-done{box-shadow:inset 0 0 0 1px var(--ink2), inset 2px 0 0 0 var(--gr2);}
.quest.is-done .quest-ck{background:var(--gr2); color:var(--iv4); box-shadow:inset 0 0 0 1px var(--gr0);}
.quest.is-done .quest-tx{color:var(--iv0); text-decoration:line-through;}
.quest.is-now{box-shadow:inset 0 0 0 1px var(--gd1), inset 2px 0 0 0 var(--gd3);}
.quest.is-now .quest-ck{color:var(--gd3);}

/* ───────── 16. 토스트 알림 ───────── */
.toasts{
  position:fixed; left:50%; top:14px; transform:translateX(-50%);
  z-index:60; display:flex; flex-direction:column; gap:6px;
  width:min(92vw,420px); pointer-events:none;
}
.toast{
  display:flex; align-items:center; gap:8px;
  padding:8px 12px; font-size:15px; font-weight:700; word-break:keep-all;
  color:var(--iv4); background:var(--ink1);
  border:2px solid var(--gd0);
  box-shadow:inset 1px 1px 0 0 var(--gd2), inset -1px -1px 0 0 var(--gd0), 3px 3px 0 0 var(--ink0);
  text-shadow:var(--hard1);
  animation:uiToastIn .22s steps(4,end) both;
}
.toast-ic{flex:0 0 auto; font-size:18px; line-height:1;}
.toast--good{border-color:var(--gr0); box-shadow:inset 1px 1px 0 0 var(--gr2), inset -1px -1px 0 0 var(--gr0), 3px 3px 0 0 var(--ink0); color:var(--gr5);}
.toast--bad{border-color:var(--rd0); box-shadow:inset 1px 1px 0 0 var(--rd2), inset -1px -1px 0 0 var(--rd0), 3px 3px 0 0 var(--ink0); color:var(--rd4);}
.toast--gold{color:var(--gd4);}

/* ───────── 17. 모달 오버레이 ───────── */
.overlay{
  position:fixed; inset:0; z-index:50;
  display:flex; align-items:center; justify-content:center; padding:14px;
  background:rgba(11,8,18,.82);
  animation:uiFade .15s steps(3,end) both;
}
.overlay[hidden],[hidden]{display:none !important;}
.modal{
  width:min(96vw,560px); max-height:88vh; overflow:auto;
  animation:uiPop .18s steps(3,end) both;
}
.modal-ft{display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end; margin-top:12px;}

/* ───────── 18. 레벨업 / 획득 연출 ───────── */
.fx-level{
  position:fixed; left:50%; top:38%; transform:translate(-50%,-50%); z-index:70;
  pointer-events:none; text-align:center;
  font-family:var(--ui-serif); font-size:32px; font-weight:700;
  color:var(--gd4); text-shadow:var(--hard);
  animation:uiRise 1.5s steps(12,end) both;
}
.fx-gain{
  position:absolute; z-index:12; pointer-events:none;
  font-size:16px; font-weight:700; color:var(--gd4); text-shadow:var(--hard);
  animation:uiRise 1.1s steps(10,end) both;
}
.fx-spark{display:inline-block; animation:uiSpark .8s steps(4,end) infinite; color:var(--fl4);}
.is-shake{animation:uiShake .3s steps(2,end) 2;}

@keyframes uiSpark{
  0%{opacity:1;   transform:scale(1);}
  50%{opacity:.35; transform:scale(1.35);}
  100%{opacity:1; transform:scale(1);}
}
@keyframes uiRise{
  0%{opacity:0; transform:translate(-50%,-30%) scale(.8);}
  18%{opacity:1; transform:translate(-50%,-55%) scale(1.1);}
  70%{opacity:1; transform:translate(-50%,-62%) scale(1);}
  100%{opacity:0; transform:translate(-50%,-92%) scale(1);}
}
@keyframes uiFloatSm{
  0%{transform:translateY(0);}
  50%{transform:translateY(-3px);}
  100%{transform:translateY(0);}
}
@keyframes uiBlink{
  0%{opacity:1;}
  50%{opacity:.35;}
  100%{opacity:1;}
}
@keyframes uiPop{
  0%{opacity:0; transform:scale(.9);}
  100%{opacity:1; transform:scale(1);}
}
@keyframes uiFade{
  0%{opacity:0;}
  100%{opacity:1;}
}
@keyframes uiToastIn{
  0%{opacity:0; transform:translateY(-12px);}
  100%{opacity:1; transform:translateY(0);}
}
@keyframes uiShake{
  0%{transform:translate(0,0);}
  25%{transform:translate(-3px,0);}
  75%{transform:translate(3px,0);}
  100%{transform:translate(0,0);}
}

/* ───────── 19. 스크롤바 ───────── */
*{scrollbar-width:thin; scrollbar-color:var(--gd2) var(--ink0);}
::-webkit-scrollbar{width:12px; height:12px;}
::-webkit-scrollbar-track{background:var(--ink0); box-shadow:inset 0 0 0 1px var(--ink2);}
::-webkit-scrollbar-thumb{
  background:var(--gd2);
  box-shadow:inset 1px 1px 0 0 var(--gd4), inset -1px -1px 0 0 var(--gd1), inset 0 0 0 1px var(--gd0);
}
::-webkit-scrollbar-thumb:hover{background:var(--gd3);}
::-webkit-scrollbar-corner{background:var(--ink0);}

/* ───────── 20. 잡동사니 ───────── */
.hr{height:2px; margin:9px 0; background:var(--ink0); box-shadow:inset 0 1px 0 0 var(--gd1);}
.center{text-align:center;}
.row{display:flex; flex-wrap:wrap; gap:6px;}
.row--end{justify-content:flex-end;}
.small{font-size:13px; color:var(--iv1);}
.gold{color:var(--gd3); text-shadow:var(--hard1);}
.sr{position:absolute; width:1px; height:1px; margin:-1px; padding:0; overflow:hidden; clip-path:inset(50%); white-space:nowrap;}

/* ───────── 21. 모바일 (≤820px): 1열 + D-pad ───────── */
.pad{display:none;}
.pad-act{display:none;}
@media (max-width:820px){
  body{font-size:16px;}
  .app{padding:6px; gap:8px;}
  .stage{grid-template-columns:minmax(0,1fr);}
  .side{order:2;}
  .screen{order:1;}
  .quiz-opts{grid-template-columns:1fr;}
  .items{grid-template-columns:repeat(auto-fill, minmax(78px,1fr));}
  .pad{
    display:grid; justify-content:center; align-content:center;
    grid-template-columns:repeat(3,56px); grid-template-rows:repeat(3,56px);
    gap:6px; margin:8px auto 0;
  }
  .pad-act{display:flex; gap:8px; justify-content:center; margin-top:8px; flex-wrap:wrap;}
}
.pad-btn{
  min-width:48px; min-height:48px; width:56px; height:56px;
  display:flex; align-items:center; justify-content:center;
  font-size:20px; font-weight:700; cursor:pointer;
  color:var(--gd4); background:var(--ink2);
  border:2px solid var(--gd0);
  box-shadow:inset 1px 1px 0 0 var(--ink4), inset -1px -1px 0 0 var(--ink0), 2px 2px 0 0 var(--ink0);
  text-shadow:var(--hard1); touch-action:manipulation; user-select:none;
}
.pad-btn:active{transform:translate(2px,2px); box-shadow:inset 1px 1px 0 0 var(--ink0);}
.pad-up{grid-area:1 / 2 / 2 / 3;}
.pad-left{grid-area:2 / 1 / 3 / 2;}
.pad-ok{grid-area:2 / 2 / 3 / 3; background:var(--gd2); color:var(--ink0); box-shadow:inset 1px 1px 0 0 var(--gd4), inset -1px -1px 0 0 var(--gd1), 2px 2px 0 0 var(--ink0); text-shadow:none;}
.pad-right{grid-area:2 / 3 / 3 / 4;}
.pad-down{grid-area:3 / 2 / 4 / 3;}
.pad-act .btn{min-width:96px; min-height:48px;}

/* ───────── 22. 접근성: 움직임 줄이기 ───────── */
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{
    animation-duration:.001ms !important;
    animation-iteration-count:1 !important;
    transition-duration:.001ms !important;
    scroll-behavior:auto !important;
  }
  .msg-next,.gauge.is-low .gauge-fill,.badge--t5::after,.fx-spark{animation:none !important;}
}
`;

  /* ══════════════════════════════════════════════════════════════════
     2. 창틀
     ══════════════════════════════════════════════════════════════════ */
  const TONES = { gold: 'win--gold', dark: 'win--dark', blue: 'win--blue', paper: 'win--paper' };

  /* UI.win(title, bodyHTML, opts) — opts={tone,pad,id,cls,scroll} */
  function win(title, bodyHTML, opts) {
    const o = opts || {};
    const tone = TONES[o.tone] || TONES.gold;
    const pad = (o.pad === false) ? '' : ' is-pad';
    const scroll = o.scroll ? ' scroll' : '';
    const head = title
      ? '<div class="win-hd"><span class="win-dia" aria-hidden="true">◆</span>' +
        '<h3 class="win-tl">' + esc(title) + '</h3>' +
        '<span class="win-dia" aria-hidden="true">◆</span></div>'
      : '';
    return '<section class="' + esc(cls('win', tone, o.cls)) + '"' + idAttr(o.id) + dataAttrs(o.data) + '>' +
      head +
      '<div class="win-bd' + pad + scroll + '">' + (bodyHTML == null ? '' : bodyHTML) + '</div>' +
      '</section>';
  }

  /* ══════════════════════════════════════════════════════════════════
     3. 게이지
     ══════════════════════════════════════════════════════════════════ */
  const GAUGE = {
    hp:    { ico: '♥', name: '생명력' },   /* ♥ */
    mp:    { ico: '◆', name: '기력' },     /* ◆ */
    exp:   { ico: '★', name: '경험치' },   /* ★ */
    quest: { ico: '✦', name: '진행도' }    /* ✦ */
  };

  /* UI.gauge(label, cur, max, kind) */
  function gauge(label, cur, max, kind) {
    const k = GAUGE[kind] ? kind : 'hp';
    const info = GAUGE[k];
    const c = num(cur, 0), m = num(max, 0);
    const p = pct(c, m);
    const low = (k === 'hp' && p > 0 && p <= 25) ? ' is-low' : '';
    const lb = (label === null || label === undefined || label === '') ? info.name : label;
    return '<div class="' + esc(cls('gauge', 'gauge--' + k)) + low + '">' +
      '<div class="gauge-hd">' +
        '<span class="gauge-ico" aria-hidden="true">' + info.ico + '</span>' +
        '<span class="gauge-lb">' + esc(lb) + '</span>' +
        '<span class="gauge-vl">' + esc(c) + ' / ' + esc(m) + '</span>' +
      '</div>' +
      '<div class="gauge-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + esc(m) +
        '" aria-valuenow="' + esc(c) + '" aria-label="' + esc(lb) + '">' +
        '<span class="gauge-fill" style="width:' + p + '%"></span>' +
      '</div>' +
    '</div>';
  }

  /* ══════════════════════════════════════════════════════════════════
     4. 스탯표
     ══════════════════════════════════════════════════════════════════ */
  /* UI.stats([['힘',12],['지혜',9], ...]) */
  function stats(pairs) {
    const list = Array.isArray(pairs) ? pairs : [];
    let out = '<dl class="stats">';
    for (let i = 0; i < list.length; i++) {
      const p = list[i] || [];
      out += '<div class="stat"><dt class="stat-k">' + esc(p[0]) + '</dt>' +
             '<dd class="stat-v">' + esc(p[1]) + '</dd></div>';
    }
    return out + '</dl>';
  }

  /* ══════════════════════════════════════════════════════════════════
     5. 버튼
     ══════════════════════════════════════════════════════════════════ */
  /* UI.btn(label, attrs) — attrs={id,cls,data,disabled,html,title,type} */
  function btn(label, attrs) {
    const a = attrs || {};
    const body = a.html ? String(label == null ? '' : label) : esc(label);
    return '<button type="' + esc(a.type || 'button') + '" class="' + esc(cls('btn', a.cls)) + '"' +
      idAttr(a.id) +
      (a.title ? ' title="' + esc(a.title) + '"' : '') +
      (a.disabled ? ' disabled aria-disabled="true"' : '') +
      dataAttrs(a.data) +
      '>' + body + '</button>';
  }

  /* ══════════════════════════════════════════════════════════════════
     6. 아이템 칸
     ══════════════════════════════════════════════════════════════════ */
  const RARITY = ['common', 'good', 'rare', 'legend'];
  const RARITY_KO = { common: '흔함', good: '좋음', rare: '희귀', legend: '전설' };
  const RARITY_MARK = { common: '○', good: '◇', rare: '◆', legend: '★' };
  function rarityKey(r) {
    if (typeof r === 'number') return RARITY[clamp(r | 0, 0, 3)];
    const s = String(r || '').toLowerCase();
    if (RARITY.indexOf(s) >= 0) return s;
    if (s === '흔함') return 'common';
    if (s === '좋음') return 'good';
    if (s === '희귀') return 'rare';
    if (s === '전설') return 'legend';
    return 'common';
  }

  /* UI.itemCell({name,icon,qty,rarity,desc,equipped,id,data,cls}) */
  function itemCell(opt) {
    const o = opt || {};
    const r = rarityKey(o.rarity);
    const qty = (o.qty === null || o.qty === undefined || num(o.qty, 1) <= 1) ? '' :
      '<span class="item-qty">×' + esc(o.qty) + '</span>';
    const eq = o.equipped ? '<span class="item-eq">착용</span>' : '';
    const ico = '<span class="item-ic" aria-hidden="true">' + (o.icon == null ? '❖' : o.icon) + '</span>';
    const rar = '<span class="item-rar">' + RARITY_MARK[r] + ' ' + RARITY_KO[r] + '</span>';
    const title = o.desc ? ' title="' + esc(o.desc) + '"' : '';
    return '<button type="button" class="' + esc(cls('item', 'item--' + r, o.cls)) + '"' +
      idAttr(o.id) + title + dataAttrs(o.data) + '>' +
      eq + ico +
      '<span class="item-nm">' + esc(o.name) + '</span>' +
      rar + qty +
    '</button>';
  }

  /* ══════════════════════════════════════════════════════════════════
     7. 등급 배지 (tier 0..5)
     ══════════════════════════════════════════════════════════════════ */
  function rankBadge(name, tier) {
    const t = clamp(num(tier, 0) | 0, 0, 5);
    let star = '';
    for (let i = 0; i < 5; i++) star += (i < t) ? '★' : '☆';
    return '<span class="' + esc(cls('badge', 'badge--t' + t)) + '" title="' + esc(name) + ' (' + t + '등급)">' +
      '<span class="badge-star" aria-hidden="true">' + star + '</span>' +
      '<span class="badge-nm">' + esc(name) + '</span>' +
      '<span class="sr">' + t + '등급</span>' +
    '</span>';
  }

  /* ══════════════════════════════════════════════════════════════════
     8. 하단 메시지 바
     ══════════════════════════════════════════════════════════════════ */
  /* UI.msgBar(iconHTML, name, text) */
  function msgBar(iconHTML, name, text) {
    const ic = iconHTML ? '<div class="msg-ic" aria-hidden="true">' + iconHTML + '</div>' : '';
    const nm = name ? '<div class="msg-nm">' + esc(name) + '</div>' : '';
    return '<div class="msg" role="status" aria-live="polite">' +
      ic +
      '<div class="msg-bd">' + nm +
        '<div class="msg-tx">' + escLines(text) + '</div>' +
        '<div class="msg-next" aria-hidden="true">▼</div>' +
      '</div>' +
    '</div>';
  }

  /* ══════════════════════════════════════════════════════════════════
     9. 탭 바
     ══════════════════════════════════════════════════════════════════ */
  /* UI.tabs([['bag','소지품'],['quest','임무']], 'bag') */
  function tabs(items, active) {
    const list = Array.isArray(items) ? items : [];
    let out = '<div class="tabs" role="tablist">';
    for (let i = 0; i < list.length; i++) {
      const it = list[i] || [];
      const id = String(it[0] == null ? i : it[0]);
      const on = (String(active) === id);
      out += '<button type="button" role="tab" class="tab' + (on ? ' is-on' : '') + '"' +
        ' id="tab-' + esc(id) + '" data-tab="' + esc(id) + '"' +
        ' aria-selected="' + (on ? 'true' : 'false') + '"' +
        ' tabindex="' + (on ? '0' : '-1') + '">' + esc(it[1]) + '</button>';
    }
    return out + '</div>';
  }

  /* ══════════════════════════════════════════════════════════════════
     10. 보너스 조립기 (CSS 구조를 그대로 쓰기 쉬우라고 함께 제공)
     ══════════════════════════════════════════════════════════════════ */
  /* 대화창 본문 (UI.win 의 bodyHTML 로 넣어 쓴다) */
  function talk(portraitHTML, name, text, nextLabel) {
    const por = portraitHTML ? '<div class="talk-por" aria-hidden="true">' + portraitHTML + '</div>' : '';
    return '<div class="talk">' + por +
      '<div class="talk-bd">' +
        (name ? '<div class="talk-nm">◆ ' + esc(name) + '</div>' : '') +
        '<div class="talk-tx">' + escLines(text) + '</div>' +
        '<div class="talk-ft">' + btn(nextLabel || '다음 ▶', { cls: 'btn--pri', data: { act: 'next' } }) + '</div>' +
      '</div>' +
    '</div>';
  }

  /* 퀴즈 화면 본문: choices 는 문자열 4개 권장 */
  function quiz(question, choices, opts) {
    const o = opts || {};
    const list = Array.isArray(choices) ? choices : [];
    const keys = ['①', '②', '③', '④', '⑤', '⑥'];
    let out = '';
    if (o.no) out += '<span class="quiz-no">문제 ' + esc(o.no) + '</span>';
    out += '<p class="quiz-q">' + escLines(question) + '</p><div class="quiz-opts">';
    for (let i = 0; i < list.length; i++) {
      out += '<button type="button" class="quiz-opt" data-choice="' + i + '">' +
        '<span class="quiz-key" aria-hidden="true">' + (keys[i] || (i + 1)) + '</span>' +
        '<span class="quiz-tx">' + esc(list[i]) + '</span></button>';
    }
    return out + '</div>';
  }

  /* 정답/오답 피드백 박스 */
  function feedback(ok, text) {
    return '<div class="quiz-fb ' + (ok ? 'is-ok' : 'is-no') + '" role="status" aria-live="polite">' +
      '<span class="quiz-fb-ic" aria-hidden="true">' + (ok ? '○' : '✕') + '</span>' +
      '<span>' + (ok ? '<b>정답!</b> ' : '<b>아쉬워요.</b> ') + escLines(text) + '</span>' +
    '</div>';
  }

  /* 퀘스트 목록: [{text, sub, done, now}, ...] */
  function questList(list) {
    const arr = Array.isArray(list) ? list : [];
    let out = '<ul class="quests">';
    for (let i = 0; i < arr.length; i++) {
      const q = arr[i] || {};
      const st = q.done ? ' is-done' : (q.now ? ' is-now' : '');
      const mark = q.done ? '✔' : (q.now ? '▶' : '·');
      out += '<li class="quest' + st + '">' +
        '<span class="quest-ck" aria-hidden="true">' + mark + '</span>' +
        '<span class="quest-tx">' + esc(q.text) +
          (q.sub ? '<span class="quest-sub">' + esc(q.sub) + '</span>' : '') +
          '<span class="sr">' + (q.done ? ' (완료)' : ' (진행 중)') + '</span>' +
        '</span></li>';
    }
    return out + '</ul>';
  }

  /* 토스트 한 줄. kind='good'|'bad'|'gold'|'' */
  function toast(text, kind) {
    const k = (kind === 'good' || kind === 'bad' || kind === 'gold') ? ' toast--' + kind : '';
    const ic = kind === 'good' ? '✔' : (kind === 'bad' ? '✕' : '✦');
    return '<div class="toast' + k + '" role="status"><span class="toast-ic" aria-hidden="true">' + ic +
      '</span><span>' + escLines(text) + '</span></div>';
  }

  /* 초상화 액자 (안에 canvas/img HTML 을 넣는다) */
  function portrait(innerHTML, name, titleText) {
    return '<div class="por">' + (innerHTML || '') + '</div>' +
      ((name || titleText) ? '<div class="who"><span class="who-nm">' + esc(name) + '</span>' +
        (titleText ? '<span class="who-ti">' + esc(titleText) + '</span>' : '') + '</div>' : '');
  }

  /* 모바일 D-pad + 확인 버튼 */
  function dpad() {
    const b = (c, l, dir) => '<button type="button" class="pad-btn ' + c + '" data-dir="' + dir +
      '" aria-label="' + (dir === 'ok' ? '확인' : dir) + '">' + l + '</button>';
    return '<div class="pad" role="group" aria-label="이동 조작">' +
      b('pad-up', '▲', 'up') +
      b('pad-left', '◀', 'left') +
      b('pad-ok', '●', 'ok') +
      b('pad-right', '▶', 'right') +
      b('pad-down', '▼', 'down') +
    '</div>';
  }

  /* ══════════════════════════════════════════════════════════════════
     11. 클래스 안내 (통합 담당자용)
     ══════════════════════════════════════════════════════════════════ */
  const CLASSES = {
    layout: {
      app: '.app — 가운데 정렬, 최대 1200px 바깥 상자',
      stage: '.stage — [게임화면 | 300px 정보패널] 2열 그리드. ≤820px 에서 1열',
      screen: '.screen — 캔버스가 들어가는 왼쪽 칸',
      side: '.side — 오른쪽 정보 패널(세로 스택). 초상화→이름→게이지→배지→스탯→소지품→퀘스트 순서로 넣는다',
      canvas: '.cv — 게임 캔버스. pixelated, width:100%, aspect-ratio 384/240. 그림자·필터 금지'
    },
    win: {
      root: '.win — 금장 3중 테두리 창. 색조 .win--gold / .win--dark / .win--blue / .win--paper',
      head: '.win-hd > .win-dia + .win-tl + .win-dia — 제목줄',
      body: '.win-bd (.is-pad 안쪽 여백, .scroll 세로 스크롤)',
      note: '네 모서리 장식은 .win::before/::after 와 .win-bd::before/::after 가 그린다'
    },
    tabs: '.tabs > .tab (.is-on 선택됨). data-tab 에 id 가 들어있다',
    btn: '.btn (+ .btn--pri 강조 / .btn--danger 위험 / .btn--ghost / .btn--wide / .btn--big), [disabled] 또는 .is-off 비활성',
    gauge: '.gauge.gauge--hp|--mp|--exp|--quest > .gauge-hd(.gauge-ico/.gauge-lb/.gauge-vl) + .gauge-bar > .gauge-fill. HP 25% 이하면 .is-low',
    stats: '.stats > .stat > .stat-k + .stat-v (2열). .stats--1 로 1열',
    portrait: '.por (액자) + .who > .who-nm / .who-ti',
    badge: '.badge.badge--t0 ~ .badge--t5 > .badge-star + .badge-nm',
    item: '.items(격자) > .item.item--common|--good|--rare|--legend > .item-ic/.item-nm/.item-rar/.item-qty/.item-eq',
    msg: '.msg > .msg-ic + .msg-bd(.msg-nm/.msg-tx/.msg-next) — 하단 메시지 바',
    talk: '.talk > .talk-por + .talk-bd(.talk-nm/.talk-tx/.talk-ft)',
    quiz: '.quiz-no, .quiz-q, .quiz-opts > .quiz-opt(.quiz-key/.quiz-tx, 상태 .is-ok/.is-no), 피드백 .quiz-fb.is-ok|.is-no',
    quest: '.quests > .quest(.is-done 완료 / .is-now 진행) > .quest-ck + .quest-tx(.quest-sub)',
    toast: '.toasts(고정 컨테이너) > .toast(.toast--good/--bad/--gold)',
    modal: '.overlay > .modal(안에 UI.win 을 넣는다) + .modal-ft',
    fx: '.fx-level 레벨업 / .fx-gain 획득 수치 떠오름 / .fx-spark 반짝임 / .is-shake 흔들기',
    pad: '.pad > .pad-btn.pad-up|.pad-left|.pad-ok|.pad-right|.pad-down (≤820px 에서만 보임, 48px 이상), .pad-act 보조 버튼 줄',
    util: '.hr .center .row .row--end .small .gold .sr(스크린리더 전용) [hidden]'
  };

  /* ══════════════════════════════════════════════════════════════════ */
  return {
    CSS: CSS,
    win: win,
    gauge: gauge,
    stats: stats,
    btn: btn,
    itemCell: itemCell,
    rankBadge: rankBadge,
    msgBar: msgBar,
    tabs: tabs,
    CLASSES: CLASSES,
    /* 보너스 */
    talk: talk,
    quiz: quiz,
    feedback: feedback,
    questList: questList,
    toast: toast,
    portrait: portrait,
    dpad: dpad,
    esc: esc
  };
})();
