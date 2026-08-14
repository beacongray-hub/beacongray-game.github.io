/* engine/main.js — 게임 본체
   의존: PX, PAL, TILES, PROPS, SPRITES, PORTRAITS, MAPS, UI, CONTENT */
"use strict";

/* ==================== 상수 ==================== */
const T = 16, MAPW = 40, MAPH = 24, VIEWW = 24, VIEWH = 20;
const CW = VIEWW * T, CH = VIEWH * T;              // 384 x 320 · 세로 시야 확장
const SAVE_KEY = 'odysseus_nostos_rpg_v4_hd';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

/* UI.CSS 가 덮지 않는, 게임 화면 전용 보조 스타일 */
const EXTRA_CSS = `
/* 모든 게임 화면은 배포 폴더에 포함된 명조체를 사용한다. */
html body,html body button,html body input,html body select,html body textarea{
  font-family:"Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif!important
}
html body *:not(.icon):not(canvas){font-family:"Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif!important}
.storyveil{position:fixed;inset:0;z-index:80;background:#03050a;overflow:auto;color:#f4ecd7}
.storybox{position:relative;min-height:100vh;display:flex;align-items:flex-end;background-position:center;background-size:cover;isolation:isolate;animation:storyFade .55s ease both}
.storybox:before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(3,7,13,.05) 0%,rgba(3,7,13,.28) 43%,rgba(3,7,13,.91) 69%,#03060b 100%),linear-gradient(0deg,#03060b 0%,transparent 52%,rgba(3,7,13,.28) 100%)}
.storybox:after{content:"";position:absolute;inset:10px;border:1px solid rgba(222,171,63,.78);box-shadow:inset 0 0 0 3px rgba(3,5,9,.8),inset 0 0 0 4px rgba(222,171,63,.18);pointer-events:none}
@keyframes storyFade{from{opacity:0}to{opacity:1}}@keyframes storyIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.story-layout{width:100%;min-height:100vh;display:grid;grid-template-columns:minmax(0,1.3fr) minmax(390px,.7fr);align-items:end;gap:clamp(24px,4vw,62px);padding:clamp(28px,4vw,58px)}
.story-heading{padding-bottom:18px;text-shadow:0 3px 14px #000}.story-eyebrow{font:800 11px ui-monospace,monospace;letter-spacing:.24em;color:#f0c55b;text-transform:uppercase}
.story-title{margin:8px 0 4px;color:#fff0bd;font-family:"Pretendard",sans-serif;font-size:clamp(34px,5vw,64px);font-weight:900;line-height:1.08;text-shadow:0 3px 0 #5b3a10,0 8px 24px #000}
.story-en-title{font:700 12px ui-monospace,monospace;letter-spacing:.15em;color:#d7b45f}.story-hook{max-width:680px;margin-top:12px;font-family:var(--ui-serif);font-size:clamp(16px,2vw,22px);line-height:1.65;color:white;word-break:keep-all}
.story-panel{position:relative;min-height:505px;padding:clamp(20px,3vw,34px);display:flex;flex-direction:column;justify-content:space-between;background:linear-gradient(145deg,rgba(15,22,32,.98),rgba(5,8,14,.97));border:1px solid #9c6d22;box-shadow:0 22px 65px rgba(0,0,0,.7),inset 0 0 0 3px #05080d,inset 0 0 0 4px rgba(224,174,67,.25);animation:storyIn .45s ease both}
.story-panel-hd{display:flex;justify-content:space-between;gap:12px;padding-bottom:11px;border-bottom:1px solid rgba(219,166,53,.36);font:800 10px ui-monospace,monospace;letter-spacing:.17em;color:#dfae45}.story-page{color:#9e9279;letter-spacing:.06em}
.story-question{margin:18px 0 12px;font-family:var(--ui-serif);font-size:clamp(18px,2vw,24px);line-height:1.55;color:#ffe6a1;word-break:keep-all}
.story-copy{display:grid;gap:11px}.story-line{padding:11px 12px;background:rgba(255,255,255,.035);border-left:3px solid #ae7d2a;line-height:1.75;animation:storyIn .5s ease both}.story-line b{display:block;font:800 10px ui-monospace,monospace;color:#d8aa48;letter-spacing:.1em;margin-bottom:3px}.story-line p{margin:0;color:#f0e6cc;font-size:14px;word-break:keep-all}.story-line p.en{margin-top:5px;color:#aaa085;font-size:12px}
.story-mission{margin-top:18px;padding:15px;background:rgba(218,160,42,.08);border-left:4px solid #d4a037}.story-mission b{display:block;margin-bottom:8px;font:800 11px ui-monospace,monospace;letter-spacing:.15em;color:#f0bd4b}.story-mission p{margin:0;font-size:14px;line-height:1.75;color:#fff1cb;word-break:keep-all}
.story-tasks{display:grid;gap:8px;margin-top:14px}.story-tasks li{position:relative;padding:9px 10px 9px 31px;background:rgba(255,255,255,.035);border:1px solid rgba(220,171,63,.18);font-size:13px;line-height:1.5;color:#ddd2b5;word-break:keep-all}.story-tasks li:before{content:"◆";position:absolute;left:10px;top:10px;color:#e1ac3b;font-size:9px}
.story-cast{display:flex;gap:8px;margin:16px 0 10px}.story-cast img{width:58px;height:72px;object-fit:cover;object-position:center 22%;border:2px solid #b98732;box-shadow:inset 0 0 0 2px #1b1108,2px 3px 8px #000}.story-progress{display:flex;gap:6px;justify-content:center;margin-bottom:10px}.story-progress i{width:24px;height:3px;background:#303039}.story-progress i.on{background:#e0aa37}.story-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}.story-actions .btn--pri{min-width:145px}
@media(max-width:840px){.storybox:before{background:linear-gradient(0deg,#03060b 0%,rgba(3,7,13,.96) 52%,rgba(3,7,13,.12) 100%)}.story-layout{grid-template-columns:1fr;align-content:end;padding:31vh 18px 22px;gap:14px}.story-heading{padding:0}.story-title{font-size:clamp(30px,8vw,46px)}.story-panel{min-height:0;padding:20px}.story-cast{display:none}}
.od-cinema{position:fixed;inset:0;z-index:95;overflow:hidden;background:#02050a;color:#fff;font-family:"Pretendard",sans-serif;isolation:isolate}
.od-cinema-bg{position:absolute;inset:-3%;width:106%;height:106%;object-fit:cover;animation:odCamera 8.2s ease-out both;filter:saturate(1.07) contrast(1.02)}
.od-cinema-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(2,5,10,.28),transparent 28%,transparent 48%,rgba(2,5,10,.92) 88%,#02050a),linear-gradient(90deg,rgba(2,5,10,.3),transparent 35%,transparent 74%,rgba(2,5,10,.18))}
.od-cinema-smoke{position:absolute;inset:-20%;opacity:.2;background:radial-gradient(ellipse at 25% 35%,rgba(255,218,147,.28),transparent 25%),radial-gradient(ellipse at 75% 28%,rgba(164,196,222,.18),transparent 25%);animation:odDrift 9s linear infinite;mix-blend-mode:screen;pointer-events:none}
.od-cinema-frame{position:absolute;inset:10px;border:1px solid rgba(235,190,92,.72);box-shadow:inset 0 0 0 3px rgba(4,7,12,.72),inset 0 0 0 4px rgba(235,190,92,.16);pointer-events:none}
.od-cinema-top{position:absolute;z-index:2;left:clamp(20px,4vw,58px);right:clamp(20px,4vw,58px);top:clamp(19px,4vw,44px);display:flex;justify-content:space-between;align-items:flex-start;gap:16px;text-shadow:0 2px 8px #000}
.od-cinema-brand{font:800 11px ui-monospace,monospace;letter-spacing:.22em;color:#f2c968}.od-cinema-brand b{display:block;margin-top:7px;font-family:"Pretendard",sans-serif;font-size:clamp(18px,2.4vw,30px);letter-spacing:.04em;color:#fff2c5}
.od-cinema-tools{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.od-cinema-tools .btn{min-height:36px;padding:7px 12px;background:rgba(4,8,14,.72);backdrop-filter:blur(5px)}
.od-cinema-copy{position:absolute;z-index:3;left:clamp(22px,6vw,92px);right:clamp(22px,6vw,92px);bottom:clamp(28px,5vh,58px);display:grid;grid-template-columns:minmax(0,760px) auto;align-items:end;justify-content:space-between;gap:24px;animation:storyIn .65s .12s ease both}
.od-cinema-kicker{font:800 11px ui-monospace,monospace;letter-spacing:.2em;color:#f2c15e}.od-cinema-copy h2{margin:8px 0 10px;font-family:"Pretendard",sans-serif;font-size:clamp(30px,5vw,64px);line-height:1.06;color:#fff0bd;text-shadow:0 3px 0 #53340f,0 8px 22px #000}.od-cinema-ko{margin:0;max-width:760px;font-family:"Pretendard",sans-serif;font-size:clamp(16px,2vw,23px);font-weight:700;line-height:1.65;color:#fff;word-break:keep-all;text-shadow:0 2px 7px #000}.od-cinema-en{margin:7px 0 0;max-width:760px;font-size:clamp(11px,1.2vw,14px);line-height:1.5;color:#d5d9db;text-shadow:0 2px 5px #000}
.od-cinema-nav{display:flex;gap:8px;align-items:center;justify-content:flex-end;flex-wrap:wrap}.od-cinema-nav .btn--pri{min-width:155px;min-height:50px;font-size:15px}.od-cinema-dots{position:absolute;z-index:4;left:50%;bottom:14px;transform:translateX(-50%);display:flex;gap:6px}.od-cinema-dots i{position:relative;display:block;width:42px;height:3px;overflow:hidden;background:rgba(255,255,255,.25)}.od-cinema-dots i.on{background:#8d6a27}.od-cinema-dots i.on:after{content:"";position:absolute;inset:0;background:#ffd66d;transform-origin:left;animation:odProgress 8s linear both}.od-cinema-dots i.done{background:#d7a83f}
@keyframes odCamera{from{transform:scale(1.01) translate3d(-.4%,.2%,0)}to{transform:scale(1.075) translate3d(.5%,-.4%,0)}}@keyframes odDrift{from{transform:translate3d(-2%,0,0)}to{transform:translate3d(2%,-1%,0)}}@keyframes odProgress{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@media(max-width:760px){.od-cinema-copy{grid-template-columns:1fr;gap:13px;bottom:34px}.od-cinema-nav{justify-content:flex-start}.od-cinema-en{display:none}.od-cinema-tools .btn{font-size:11px}.od-cinema-dots i{width:27px}.od-cinema-bg{object-position:center}.od-cinema-brand b{font-size:17px}}
@media(prefers-reduced-motion:reduce){.od-cinema-bg,.od-cinema-smoke,.od-cinema-dots i.on:after{animation:none}}
.title-hero{position:relative;isolation:isolate;min-height:min(760px,calc(100vh - 118px));overflow:hidden;border:2px solid var(--gd0);background:#090b18;box-shadow:inset 0 0 0 1px var(--gd3),4px 4px 0 var(--ink0)}
.title-art{position:absolute;z-index:-2;inset:0;width:100%;height:100%;object-fit:cover;object-position:center top;filter:saturate(.92) contrast(1.05)}
.title-veil{position:absolute;z-index:-1;inset:0;background:linear-gradient(180deg,rgba(4,7,17,.08) 0%,rgba(4,7,17,.15) 31%,rgba(4,7,17,.82) 62%,rgba(4,7,17,.97) 100%)}
.title-content{min-height:inherit;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;text-align:center;padding:clamp(26px,7vh,72px) clamp(14px,4vw,44px) 30px}
.title-kicker{margin:0 0 9px;color:var(--gd3);font-size:12px;font-weight:800;letter-spacing:.17em;text-shadow:0 2px 2px #000}
.title-copy{width:min(100%,620px);padding:18px 20px 20px;background:linear-gradient(180deg,rgba(13,13,30,.57),rgba(11,9,22,.91));border:1px solid rgba(213,165,50,.7);box-shadow:0 0 0 3px rgba(5,5,12,.58),0 8px 25px rgba(0,0,0,.52)}
.title-copy h1{margin:0;font-family:"Pretendard",sans-serif;font-size:clamp(37px,7vw,66px);font-weight:900;color:#ffe6a0;line-height:.98;letter-spacing:.02em;text-shadow:0 3px 0 #552c18,0 6px 14px #000}
.title-copy h1 small{display:block;margin-top:9px;font-family:var(--ui);font-size:12px;letter-spacing:.23em;color:var(--gd2);line-height:1.3}
.title-copy p{margin:12px auto 0;max-width:520px;color:var(--iv3);line-height:1.65;font-size:14px;text-shadow:0 1px #000}
.title-menu{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:17px;text-align:left}
.title-menu .btn{min-height:58px;justify-content:flex-start;text-align:left;background:rgba(19,16,34,.92)}
.title-menu .btn:hover{transform:translateY(-1px);filter:brightness(1.17)}
.title-menu .btn small{display:block;margin-top:2px;color:var(--iv1);font-size:11px;font-weight:400}
.title-menu #titleResume,.title-menu #titleResume small,#cont{color:#fff3cf!important;text-shadow:0 2px 4px #000}.title-menu #titleResume{background:rgba(18,36,49,.96)!important;border-color:#e0b34e!important}
.opening-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px}
.opening-card{min-height:94px;justify-content:flex-start;text-align:left;align-items:flex-start;flex-direction:column}
.opening-card small{display:block;color:var(--iv1);font-size:11px;font-weight:400}
.opening-card[disabled]{opacity:.42;cursor:not-allowed}
.extras-copy{line-height:1.7;color:var(--iv2)}
@media(max-width:520px){.title-hero{min-height:calc(100vh - 92px)}.title-content{padding:120px 11px 16px}.title-copy{padding:14px 12px 15px}.title-copy h1{font-size:38px}.title-menu{grid-template-columns:1fr}.opening-grid{grid-template-columns:1fr}}
.topbar{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:10px;
  padding:10px 12px;background:var(--ink1);border:2px solid var(--gd0);
  box-shadow:inset 1px 1px 0 0 var(--gd2),inset -1px -1px 0 0 var(--gd0),3px 3px 0 0 var(--ink0)}
.topbar .eyebrow{font:700 10px/1 ui-monospace,monospace;letter-spacing:.16em;color:var(--gd2)}
.topbar h1{margin:4px 0 0;font-family:var(--ui-serif);font-size:clamp(20px,4vw,30px);color:var(--iv4);text-shadow:var(--hard)}
.topbar h1 em{font-style:normal;color:var(--gd3)}
.topstats{display:flex;flex-wrap:wrap;gap:5px;align-items:center}
.chip{display:inline-block;padding:4px 8px;font:700 13px/1.2 ui-monospace,monospace;color:var(--iv3);
  background:var(--ink2);border:2px solid var(--ink0);box-shadow:inset 1px 1px 0 0 var(--ink4)}
.chip b{color:var(--iv4)}
.chip.gold{color:var(--gd4);border-color:var(--gd0);box-shadow:inset 1px 1px 0 0 var(--gd1)}
.chip.dim{color:var(--iv1);font-weight:400}
.foot{padding:8px 4px;font-size:12px;color:var(--iv1);text-align:center}
/* 알림이 상단 HUD를 가리지 않도록 오른쪽 아래로 옮긴다 */
.toasts{left:auto;right:12px;top:auto;bottom:12px;transform:none;width:min(88vw,340px)}
@media(max-width:820px){.toasts{left:50%;right:auto;transform:translateX(-50%)}}
/* v4 HD · 영상에서 참고한 장수전/전략화면 계층 */
body{background:#080807 radial-gradient(circle at 50% 0,#18283a 0,#0b1016 38%,#070708 78%) fixed}
body:before{content:"";position:fixed;inset:0;z-index:-1;background:linear-gradient(rgba(4,8,10,.82),rgba(4,8,10,.92)),url('assets/ui-navy.jpg') center/620px auto repeat;opacity:.94}
.app{max-width:1440px!important;padding:8px 14px 18px!important}
body.title-shell #topbar,body.title-shell #tabs,body.title-shell .foot{display:none}body.title-shell #screen{padding-top:0}
.topbar{position:relative;padding:10px 14px 12px;border:1px solid #e0b04e;background:linear-gradient(180deg,rgba(8,42,72,.82),rgba(4,21,38,.94)),url('assets/ui-navy.jpg') center/700px auto;box-shadow:inset 0 0 0 3px #16100a,inset 0 0 0 5px #8b5c18,inset 0 -5px 0 #271608,0 5px 0 #030507,0 10px 24px rgba(0,0,0,.55)}
.topbar h1{font-size:clamp(21px,3vw,31px)}.chip{background:linear-gradient(180deg,#18212a,#0a1118);border-color:#38230c;box-shadow:inset 0 0 0 1px #9e722d,0 2px 0 #020305}
#tabs .tabs{background:linear-gradient(180deg,#4a2e1c,#23150d);border:1px solid #a3752c;box-shadow:inset 0 1px #d2a65e,inset 0 -2px #120a06;padding:5px}
#tabs .tab{min-height:38px;background:linear-gradient(180deg,#35251e,#1a100d);border-right:1px solid #775329}.tab.is-on{background:linear-gradient(180deg,#73502b,#382116);color:#ffe5a0}
.stage{grid-template-columns:minmax(0,1fr) 330px!important;gap:16px!important;align-items:start!important}.screen{align-self:start!important;display:block!important;min-height:0!important}.win{border:1px solid #e2b85d!important;padding:9px!important;background-image:linear-gradient(rgba(22,14,9,.87),rgba(6,7,8,.95)),url('assets/ui-leather.jpg')!important;background-size:auto,520px auto!important;box-shadow:inset 0 0 0 2px #120b07,inset 0 0 0 4px #b27b2e,inset 0 0 0 6px #35200d,inset 0 0 24px rgba(231,181,75,.08),0 14px 34px rgba(0,0,0,.58)!important}.win::before,.win::after,.win-bd::before,.win-bd::after{width:15px!important;height:15px!important;background:radial-gradient(circle at center,#f2cd74 0 15%,#8d5a19 18% 34%,#281507 37% 48%,#c48c35 51% 66%,#3a210b 69%)!important;border:1px solid #f0cd79!important;transform:rotate(45deg);box-shadow:inset 0 0 0 2px #44290b,0 0 0 2px #120b05!important}.win-hd{min-height:43px;padding:9px 17px!important;background:linear-gradient(180deg,rgba(68,43,23,.96),rgba(13,9,7,.99)),url('assets/ui-bronze.jpg') center/620px auto!important;border-top:1px solid rgba(255,222,142,.35)!important;border-bottom:2px solid #a8782c!important;box-shadow:inset 0 -8px 18px rgba(0,0,0,.35)!important}.win-tl{font-size:16px!important;color:#f6d98d!important;letter-spacing:.08em!important}.side .win{background-image:linear-gradient(rgba(27,18,11,.9),rgba(7,8,8,.96)),url('assets/ui-leather.jpg')!important}.win--paper{color:#291b12!important;background-image:linear-gradient(rgba(246,231,196,.9),rgba(218,195,151,.9)),url('assets/ui-parchment.jpg')!important}.win--paper .win-bd{color:#291b12!important}
.viewport{overflow:hidden;background:#05070a}.viewport:after{content:"";position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 36px rgba(0,0,0,.52);background:linear-gradient(180deg,rgba(255,205,112,.035),transparent 45%,rgba(0,21,35,.11))}
.cv{transform:scale(1.002);filter:saturate(1.16) contrast(1.07)!important}.nametag{padding:3px 7px;border-color:#80602d;background:linear-gradient(180deg,rgba(18,26,34,.95),rgba(5,8,12,.95));box-shadow:0 2px 5px #000;color:#f5e6be}.nametag.on{box-shadow:0 0 0 1px #f2c665,0 2px 8px #000}
.dlgwrap{left:12px;right:12px;bottom:12px}.dlgwrap .win{padding:9px!important;background-image:linear-gradient(90deg,rgba(4,9,14,.96),rgba(13,17,23,.94)),url('assets/ui-leather.jpg')!important;box-shadow:0 16px 40px rgba(0,0,0,.82),inset 0 0 0 2px #0a0806,inset 0 0 0 5px #a6782b,inset 0 0 0 7px #2c1b0b!important}.talk{padding:8px}.talk-por{width:112px;flex-basis:112px;border:3px solid #a97a2c;box-shadow:inset 0 0 0 2px #1c1209,4px 4px 0 #030303}.talk-nm{font-family:var(--ui-serif);font-size:18px;color:#f1c65e}.talk-tx{font-size:17px;line-height:1.8}.overlay>.modal{width:min(1000px,96vw)!important}.overlay>.modal>.win{background-image:linear-gradient(rgba(18,12,8,.9),rgba(6,6,7,.96)),url('assets/ui-leather.jpg')!important}.overlay>.modal>.win .win-bd.is-pad{padding:20px!important}
.hero-strip{background:linear-gradient(180deg,#151d24,#090e13);padding:7px;border-left:3px solid #b48129}.hs-por canvas{width:64px}.hs-id b{font-size:18px}
.battle{min-height:68vh;padding:22px;background:radial-gradient(circle at 50% 12%,#1c3346 0,#0b1118 44%,#050609 100%);border:1px solid #80602b}.foes{min-height:250px;align-items:center;gap:24px}.foe{width:160px;padding:10px;background:linear-gradient(180deg,rgba(30,38,46,.86),rgba(7,10,14,.94));border:1px solid #715024;box-shadow:0 9px 25px #000}.foe canvas{filter:drop-shadow(0 8px 5px #000)}.blog{min-height:105px;background:#080706;border:1px solid #745321;box-shadow:inset 0 0 18px #000}.me{padding:10px;background:linear-gradient(90deg,#111923,#080b0f);border-left:4px solid #c19439}.actions .btn{min-height:50px}
@media(max-width:1100px){.stage{grid-template-columns:minmax(0,1fr)!important}.side{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))}.side>*{min-width:0}}@media(max-width:700px){.side{grid-template-columns:1fr}.talk-por{width:72px;flex-basis:72px}.talk-tx{font-size:15px}}

.viewport{position:relative;line-height:0}
.labels{position:absolute;inset:0;pointer-events:none;font-size:0}
.nametag{position:absolute;transform:translate(-50%,-50%);white-space:nowrap;
  padding:2px 6px;font:700 12px/1.3 system-ui,"Malgun Gothic",sans-serif;
  color:var(--iv3);background:rgba(11,8,18,.82);border:1px solid var(--ink4);text-shadow:var(--hard1)}
.nametag.on{color:var(--gd4);border-color:var(--gd2);background:rgba(11,8,18,.94)}
.nametag.exit{color:var(--st3)}
.nametag.exit.on{color:var(--gd4);border-color:var(--gd2)}
.nametag.chest{color:var(--gd3);border-color:var(--gd0)}
.prompt{position:absolute;transform:translate(-50%,-50%);white-space:nowrap;
  padding:3px 8px;font:700 13px/1.3 system-ui,sans-serif;color:var(--ink0);background:var(--gd3);
  border:2px solid var(--gd0);animation:uiToastIn .2s steps(3,end) both}
.dlgwrap{position:absolute;left:8px;right:8px;bottom:8px;z-index:9;display:none}
.dlgwrap.show{display:block}
.dlgwrap .win{margin:0}
.talk-por canvas,.por canvas{display:block;width:100%;height:auto;image-rendering:pixelated}
.por{overflow:hidden}
.talk-por{width:84px;flex:0 0 84px}
@media(max-width:620px){.talk-por{width:56px;flex:0 0 56px}}

/* 아래 가로 상태 바 — 메시지창 바로 아래 붙는다(오른쪽 패널 높이와 무관) */
.herobar{min-width:0;margin-top:8px;clear:both}
@media(min-width:821px){.screen .viewport,.screen #herobar{width:min(100%,720px);margin-left:auto;margin-right:auto}}
.fold-head{cursor:pointer!important;user-select:none;transition:filter .15s}.fold-head:hover{filter:brightness(1.18)}.fold-head .fold-arrow{margin-left:auto;color:var(--gd3);font-size:16px}.challenge-note{margin:7px 0;padding:8px 10px;background:rgba(190,132,30,.1);border-left:3px solid var(--gd2);font-size:12px;line-height:1.55;color:var(--iv2)}
.sail-challenge{text-align:center;padding:16px}.sail-help{margin:0 0 10px!important;font-size:16px;line-height:1.65;color:#f2e6c7}.sail-help b{color:#83f4b7}.sail-board{position:relative;height:250px;margin:10px 0 15px;overflow:hidden;border:3px solid #bd8731;background:linear-gradient(#82b9d1 0 36%,#21718e 37% 54%,#07506d 55% 72%,#032e47 73%);box-shadow:inset 0 0 0 2px #08151c,inset 0 -25px 45px rgba(0,0,0,.32)}.sail-board:before,.sail-board:after{content:"";position:absolute;left:-5%;width:110%;height:22px;background:repeating-radial-gradient(ellipse at 50% 100%,transparent 0 13px,rgba(190,239,250,.72) 14px 16px,transparent 17px 28px);animation:sailWater 2.1s linear infinite}.sail-board:before{top:126px}.sail-board:after{top:166px;opacity:.45;animation-direction:reverse}.sail-route{position:absolute;left:8%;right:8%;top:111px;height:4px;border-radius:4px;background:linear-gradient(90deg,transparent,#f8dc78 12% 88%,transparent);box-shadow:0 0 9px rgba(255,220,100,.72)}.sail-route:before,.sail-route:after{content:"";position:absolute;top:-5px;width:11px;height:11px;border:2px solid #ffe79a;border-radius:50%;background:#214e61}.sail-route:before{left:0}.sail-route:after{right:0}.sail-boat{position:absolute;z-index:3;left:9%;top:52px;width:92px;height:82px;display:grid;place-items:center;font-size:72px;line-height:1;filter:drop-shadow(0 8px 5px rgba(0,0,0,.55));animation:sailPatrol 1.45s ease-in-out infinite alternate}.sail-wave{position:absolute;z-index:2;right:-150px;top:77px;font-size:105px;line-height:1;filter:drop-shadow(0 5px 5px #002033);opacity:.55}.sail-board.warning .sail-wave{animation:waveWarn .75s ease-out forwards}.sail-board.go{background:linear-gradient(#8bd3c4 0 36%,#218c81 37% 54%,#08655e 55% 72%,#063c49 73%);box-shadow:inset 0 0 0 5px #45e99b,inset 0 0 42px rgba(69,233,155,.55)}.sail-board.go .sail-boat{animation:sailGo .55s ease-out infinite alternate;filter:drop-shadow(0 0 10px #aaffd1) drop-shadow(0 8px 5px #000)}.sail-board.go .sail-wave{right:7%;opacity:1;animation:wavePulse .45s ease-in-out infinite alternate}.sail-board.hit{box-shadow:inset 0 0 0 7px #80ffc0,inset 0 0 70px #42e89a}.sail-board.miss{filter:saturate(.35);box-shadow:inset 0 0 0 7px #ec6652,inset 0 0 65px rgba(220,55,39,.6)}
.sail-lights{position:absolute;z-index:5;top:14px;left:50%;transform:translateX(-50%);display:flex;gap:9px;padding:8px 12px;border:2px solid #9d762f;border-radius:22px;background:#151514;box-shadow:0 5px 12px #000}.sail-light{width:22px;height:22px;border-radius:50%;background:#393835;border:2px solid #050505;box-shadow:inset 0 2px 5px #000}.sail-light.red.on{background:#ed5b4c;box-shadow:0 0 15px #ed5b4c}.sail-light.yellow.on{background:#ffd451;box-shadow:0 0 17px #ffd451}.sail-light.green.on{background:#55f29d;box-shadow:0 0 20px #55f29d}.sail-timing{position:absolute;z-index:5;left:8%;right:8%;bottom:16px;height:24px;padding:4px;background:#071219;border:2px solid #dfb14f}.sail-zone{position:absolute;left:38%;width:24%;top:4px;bottom:4px;background:rgba(64,233,146,.42);border-left:2px solid #6fffb2;border-right:2px solid #6fffb2}.sail-marker{position:absolute;z-index:2;left:4px;top:1px;width:7px;height:18px;background:#fff0a0;box-shadow:0 0 10px #fff}.sail-board.go .sail-marker{animation:sailTiming var(--sail-window,900ms) linear forwards}.sail-signal{min-height:42px;font-family:var(--ui-serif);font-size:28px;font-weight:800;color:#ffe59a}.sail-signal.go{color:#7dffbd;text-shadow:0 0 15px #19b67b}.sail-signal.bad{color:#ff8876}.sail-rounds{display:flex;justify-content:center;gap:10px;margin:8px}.sail-round{width:48px;height:10px;border:1px solid #8a672c;background:#211a14}.sail-round.hit{background:#4ee295;box-shadow:0 0 8px #33c27c}.sail-round.miss{background:#d45b4a}.sail-actions{display:flex;justify-content:center;gap:10px;flex-wrap:wrap}.sail-actions #sailHit{min-width:190px;min-height:64px;font-size:22px}.sail-key{display:block;margin-top:5px;font-size:12px;color:#b9ae95}@keyframes sailPatrol{from{left:9%;transform:rotate(-2deg)}to{left:calc(91% - 92px);transform:rotate(2deg)}}@keyframes sailGo{from{transform:translateY(-3px) rotate(-3deg)}to{transform:translateY(4px) rotate(3deg)}}@keyframes sailWater{to{transform:translateX(28px)}}@keyframes waveWarn{to{right:18%;opacity:.9}}@keyframes wavePulse{to{transform:scale(1.08)}}@media(max-width:620px){.sail-board{height:215px}.sail-boat{width:72px;font-size:58px;animation-name:sailPatrolMobile}.sail-wave{font-size:80px}.sail-signal{font-size:23px}@keyframes sailPatrolMobile{from{left:7%}to{left:calc(93% - 72px)}}}
.divine-meta{display:block;margin-top:4px;font:700 11px/1.55 ui-monospace,monospace;color:#22788d;letter-spacing:.01em}.divine-meta em{color:#8b5919;font-style:normal}.conversation-line .divine-meta{color:#287b8b}.conversation-line .divine-meta em{color:#9a651e}.item-legend{margin:0 0 8px;padding:7px 10px;border-left:4px solid #e1ae3f;background:rgba(220,166,48,.1);color:var(--iv2);font-size:12px}
.voyage-frame{display:grid;grid-template-columns:minmax(0,1fr) 224px;align-items:stretch;gap:12px;padding:10px;background:linear-gradient(145deg,#452a12,#120b07 34%,#07090b 70%,#2a190b);border:1px solid #e2bc65;box-shadow:inset 0 0 0 3px #0b0705,inset 0 0 0 5px #8e5e22,inset 0 0 22px rgba(231,186,83,.2);overflow:hidden}.voyage-frame .viewport{width:100%!important;height:100%;min-width:0;margin:0!important;border:3px solid #d7b05a;outline:2px solid #241509;outline-offset:-7px;box-shadow:inset 0 0 0 1px #f5dd9b,0 8px 20px #000}.voyage-frame .viewport:before{content:"";position:absolute;z-index:6;inset:10px;pointer-events:none;border:1px solid rgba(255,233,170,.6);box-shadow:inset 0 0 0 2px rgba(18,10,5,.7),inset 0 0 32px rgba(7,12,15,.42)}.voyage-frame .viewport .cv{width:100%;height:100%;object-fit:fill;image-rendering:auto;filter:saturate(1.18) contrast(1.08) brightness(1.1)}.voyage-map-plaque{position:absolute;z-index:8;left:50%;top:12px;transform:translateX(-50%);min-width:210px;padding:7px 18px;text-align:center;line-height:1.25;color:#f8df99;background:linear-gradient(#54351c,#150d08);border:1px solid #e0b65b;box-shadow:inset 0 0 0 2px #211207,0 5px 12px rgba(0,0,0,.65);font-family:var(--ui-serif);font-size:14px;letter-spacing:.08em}.voyage-map-plaque small{display:block;margin-top:2px;color:#bfcbd0;font-size:9px;letter-spacing:.14em}.voyage-frame #herobar{width:auto!important;height:100%;min-width:0;margin:0!important;display:flex;overflow:auto}.voyage-frame #herobar>.win{width:100%;margin:0}.voyage-frame #herobar .win-bd{height:100%;padding:5px!important}.hero-vertical{min-height:100%;display:flex!important;flex-direction:column;grid-template-columns:none!important;gap:7px!important;align-items:stretch!important;padding:9px!important;border:1px solid #bd8a34;background:linear-gradient(180deg,#263b4c,#0a131b 62%,#080b0e)}.hero-vertical .hs-por{display:flex;justify-content:center}.hero-vertical .hs-por img{display:block;width:112px;height:112px;object-fit:cover;object-position:center 25%;border:3px solid #d5a846;box-shadow:inset 0 0 0 2px #16100a,0 6px 16px #000}.hero-vertical .hs-id{text-align:center}.hero-vertical .hs-id b{font-size:18px}.hero-vertical .hs-gauges{display:grid;grid-template-columns:1fr!important;gap:3px!important}.hero-vertical .hs-right{display:flex!important;flex-direction:column;gap:5px;justify-items:stretch!important}.hero-vertical .hs-stats{display:grid!important;grid-template-columns:repeat(3,1fr);gap:4px!important}.hero-vertical .hs-stats span{padding:4px 2px}.hero-vertical .hs-equip{display:grid!important;grid-template-columns:1fr;gap:3px!important}.hero-vertical .hs-equip .eq{min-width:0;padding:4px}.voyage-destination{margin-top:auto;padding:8px;text-align:center;background:rgba(211,161,54,.12);border:1px solid #8b6429;color:var(--iv2);font-size:10px;line-height:1.5}.voyage-destination b{display:block;color:var(--gd3);font-family:var(--ui-serif);font-size:14px}@media(max-width:900px){.voyage-frame{height:auto!important;grid-template-columns:1fr;overflow:visible}.voyage-frame .viewport{height:auto}.voyage-frame .viewport .cv{height:auto}.voyage-frame #herobar{height:auto;display:block;overflow:visible}.hero-vertical{height:auto;display:grid!important;grid-template-columns:120px minmax(0,1fr)!important}.hero-vertical .hs-gauges,.hero-vertical .hs-right,.hero-vertical .voyage-destination{grid-column:1/-1}.hero-vertical .hs-id{text-align:left;align-self:center}}
.hero-strip{display:grid;grid-template-columns:56px auto minmax(200px,1fr) auto;gap:12px;align-items:center}
.hs-por canvas{display:block;width:56px;height:auto;image-rendering:pixelated;border:2px solid var(--gd1)}
.hs-id{min-width:84px}
.hs-id b{display:block;font-family:var(--ui-serif);font-size:16px;color:var(--gd4);text-shadow:var(--hard1)}
.hs-id span{display:block;font-size:11px;color:var(--iv1);margin-top:3px}
.hs-gauges{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:2px 10px;align-self:center;min-width:0}
.hs-gauges .gauge-hd{font-size:11px}
.hs-right{display:grid;gap:4px;justify-items:end}
.hs-stats{display:flex;gap:3px;flex-wrap:wrap;justify-content:flex-end}
.hs-stats span{padding:2px 7px;background:var(--ink0);border:1px solid var(--ink3);font-size:10px;color:var(--iv1);text-align:center}
.hs-stats b{display:block;font-size:12px;color:var(--gd3)}
.hs-equip{display:flex;gap:3px;flex-wrap:wrap;justify-content:flex-end}
.hs-equip .eq{min-width:78px;font-size:10px}
@media(max-width:1100px){.hero-strip{grid-template-columns:56px minmax(0,1fr)}.hs-gauges{grid-column:1/-1}.hs-right{grid-column:1/-1;justify-items:start}.hs-stats,.hs-equip{justify-content:flex-start}}
.equip{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:8px}
.eq{display:block;padding:5px 4px;text-align:center;font-size:11px;color:var(--iv1);
  background:var(--ink0);border:1px solid var(--ink3)}
.eq b{display:block;margin-top:2px;font-size:12px;color:var(--iv2);word-break:keep-all}
.eq.on{border-color:var(--gd1)}.eq.on b{color:var(--gd3)}
.qgoal b{display:block;font-family:var(--ui-serif);font-size:17px;color:var(--gd4);text-shadow:var(--hard1)}
.qgoal p{margin:4px 0 8px;font-size:14px;color:var(--iv2)}
.qsteps{list-style:none;margin:0;padding:0;display:grid;gap:4px}
.qsteps li{font-size:13px;color:var(--iv1);padding-left:2px}
.qsteps li.ok{color:var(--gr4)}
.sidelist{margin-top:10px;padding-top:8px;border-top:2px solid var(--ink0)}
.sidelist>b{display:block;font-size:12px;color:var(--gd2);margin-bottom:5px}
.sq{font-size:13px;color:var(--iv2);padding:4px 0}
.sq small{display:block;font-size:11px;color:var(--iv1)}
.loglist{display:grid;gap:4px}
.logline{font-size:13px;color:var(--iv2);padding:5px 7px;background:var(--ink0);border-left:3px solid var(--se2)}
.dimtext{font-size:12px;color:var(--iv1)}

.startpage{display:grid;gap:10px}
.hero{display:grid;grid-template-columns:170px minmax(0,1fr);gap:16px;align-items:start}
.hero canvas{width:100%;height:auto;image-rendering:pixelated;display:block}
.hero h2{margin:0 0 8px;font-family:var(--ui-serif);font-size:clamp(19px,3.4vw,26px);color:var(--gd4);line-height:1.3;text-shadow:var(--hard)}
.hero p{margin:0 0 12px;font-size:15px;color:var(--iv2);line-height:1.7;word-break:keep-all}
@media(max-width:620px){.hero{grid-template-columns:110px minmax(0,1fr);gap:10px}}
.chapters{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}
.chapter{padding:7px 9px;background:var(--ink0);border:1px solid var(--ink3);opacity:.5}
.chapter.on{opacity:1;border-color:var(--gd1)}
.chapter b{color:var(--gd2);font:700 11px ui-monospace,monospace}
.chapter span{display:block;font-size:14px;color:var(--iv3)}
.chapter small{display:block;font-size:11px;color:var(--iv1)}

.two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;align-items:start}
@media(max-width:900px){.two{grid-template-columns:minmax(0,1fr)}}
.statwrap{display:grid;grid-template-columns:150px minmax(0,1fr);gap:14px;align-items:start}
@media(max-width:620px){.statwrap{grid-template-columns:100px minmax(0,1fr);gap:9px}}
.statcol{display:grid;gap:7px}
.titles{margin-top:6px}
.titles>b{display:block;font-size:12px;color:var(--gd2);margin-bottom:4px}
.titlechip{display:inline-block;margin:2px 3px 0 0;padding:3px 7px;font-size:12px;
  color:var(--gd4);background:var(--ink0);border:1px solid var(--gd1)}
.rankline{display:flex;flex-wrap:wrap;gap:4px;margin-top:12px;padding-top:9px;border-top:2px solid var(--ink0)}
.rk{padding:4px 7px;font-size:11px;color:var(--iv0);background:var(--ink0);border:1px solid var(--ink3);opacity:.55}
.rk small{display:block;font-size:9px}
.rk.on{opacity:1;color:var(--gd3);border-color:var(--gd1)}
.itemgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:6px}
canvas.icon{width:26px;height:26px;image-rendering:pixelated;display:block;margin:0 auto}

.qlist{display:grid;gap:12px}
.qgroup h3{margin:0 0 6px;font-family:var(--ui-serif);font-size:16px;color:var(--gd3)}
.qgroup h3 small{font-family:system-ui,sans-serif;font-size:11px;color:var(--iv1)}
.qgroup.locked{opacity:.5}
.qcard{padding:9px 11px;margin-bottom:6px;background:var(--ink0);border:1px solid var(--ink3);border-left:4px solid var(--se2)}
.qcard.main{border-left-color:var(--gd2)}
.qcard.done{border-left-color:var(--gr2);opacity:.75}
.qcard.hidden{color:var(--iv0);font-size:13px}
.qhead{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.qhead b{font-size:15px;color:var(--iv4)}
.qtype{padding:2px 6px;font-size:10px;color:var(--ink0);background:var(--gd2)}
.qdone{padding:2px 6px;font-size:10px;color:var(--ink0);background:var(--gr3)}
.qcard p{margin:5px 0;font-size:13px;color:var(--iv2);word-break:keep-all}
.qreward{margin-top:6px;font-size:12px;color:var(--gd3)}

.chargrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(238px,1fr));gap:16px;margin-top:14px}
.charcard{min-height:420px;padding:13px;background:linear-gradient(180deg,#31465d,#0a1018 68%);border:1px solid #c59743;box-shadow:inset 0 0 0 2px #090b0f,inset 0 0 0 3px rgba(226,183,86,.3),0 9px 22px rgba(0,0,0,.45);text-align:center;transition:transform .16s ease,filter .16s ease}
.charcard[data-char]{cursor:pointer}.charcard[data-char]:hover{transform:translateY(-3px);filter:brightness(1.1)}
.charcard.off{opacity:.38;filter:grayscale(1)}
.charcard .por{width:100%;height:240px;margin:0 auto 11px;overflow:hidden;background:#090d14;border:2px solid #d19b42;box-shadow:inset 0 0 0 2px #15100a,0 5px 13px #000}
.charcard canvas,.charcard .encounter-portrait,.charcard .codex-hd{display:block;width:100%!important;height:240px!important;object-fit:cover;object-position:center 30%;image-rendering:auto!important;filter:none!important}
.charcard b{display:block;margin-top:6px;font-family:var(--ui-serif);font-size:19px;color:#ffe8a4;text-shadow:0 2px 3px #000}
.charcard small{display:block;min-height:34px;font-size:12px;line-height:1.45;color:#e4d7ba}
.charcard .chartalk{margin:9px 0 0;padding:8px;background:rgba(255,255,255,.045);border-left:3px solid #a8792d;color:#cfc4aa;font-size:11px;line-height:1.55;text-align:left}
.chartalk{margin:6px 0 0;font-size:12px;color:var(--se4);word-break:keep-all}
.character-sheet{display:grid;grid-template-columns:minmax(280px,420px) minmax(320px,1fr);gap:24px;padding:22px;background:#efe0c2 url('assets/ui-parchment.jpg') center/560px auto;color:#27180d;border:2px solid #a2772e}
.character-portrait{min-height:430px;background:#111;border:5px solid #9a6f2d;box-shadow:inset 0 0 0 3px #f4dca8,0 10px 24px rgba(0,0,0,.35);overflow:hidden}.character-portrait img{display:block;width:100%;height:100%;min-height:430px;object-fit:cover;object-position:center 30%}.character-portrait canvas{width:100%;height:auto;image-rendering:auto}.character-copy h2{margin:0;font-family:var(--ui-serif);font-size:34px;color:#255e70}.character-copy .role{margin:4px 0 12px;color:#80571d;font-weight:800}.character-copy .symbols{padding:10px 12px;background:#fff7e5;border-left:5px solid #b98632}.character-copy h3{margin:18px 0 6px;font-family:var(--ui-serif);color:#295f70}.character-copy p{font-size:15px;line-height:1.78;word-break:keep-all}.character-quote{padding:14px;background:#173749;color:#f7e8c8;border:1px solid #b98b3d;font-family:var(--ui-serif)}
@media(max-width:760px){.character-sheet{grid-template-columns:1fr}.character-portrait{min-height:320px}.character-portrait img{min-height:320px}}

.lorelist{display:grid;gap:8px}
.lore{padding:9px 11px;background:var(--ink0);border-left:4px solid var(--gd1)}
.lore.off{opacity:.45;border-left-color:var(--ink3)}
.lorehead{display:flex;justify-content:space-between;gap:8px;align-items:baseline}
.lorehead b{font-family:var(--ui-serif);font-size:15px;color:var(--gd3)}
.lorehead small{font:10px ui-monospace,monospace;color:var(--iv1)}
.lore p{margin:5px 0 0;font-size:13px;color:var(--iv2);line-height:1.65;word-break:keep-all}

.battle{display:grid;gap:10px}
.foes{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.foe{width:120px;text-align:center}
.foe.down{opacity:.35;filter:grayscale(1)}
.foe canvas{width:100%;height:auto;image-rendering:pixelated;display:block}
.foe b{display:block;font-size:13px;color:var(--iv3);margin:4px 0}
.blog{min-height:76px;padding:8px 10px;background:var(--ink0);border:1px solid var(--ink3);font-size:13px;color:var(--iv2);display:grid;gap:3px}
.blog div:first-child{color:var(--gd3)}
.me{display:grid;grid-template-columns:96px minmax(0,1fr);gap:10px;align-items:center}
.me canvas{width:100%;height:auto;image-rendering:pixelated;display:block}
.actions{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}
@media(max-width:620px){.actions{grid-template-columns:1fr}}

.quiz-meta{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px}
.quiz-meta .badge2{padding:3px 7px;font-size:11px;color:var(--iv2);background:var(--ink0);border:1px solid var(--ink3)}
.quiz-meta .badge2.gold{color:var(--gd3);border-color:var(--gd1)}
.quiz-hint{margin:8px 0;padding:8px 10px;font-size:13px;color:var(--gd4);background:var(--ink0);border-left:4px solid var(--gd2)}
.quiz-opt.is-ok{border-color:var(--gr2)!important;color:var(--gr5)!important}
.quiz-opt.is-no{border-color:var(--rd2)!important;color:var(--rd4)!important}
.quiz-opt.dim{opacity:.4}
.quiz-actions{display:flex;gap:6px;justify-content:flex-end;margin-top:10px;flex-wrap:wrap}
.declist{display:grid;gap:6px}
.declist .btn{text-align:left;justify-content:flex-start}
.dec{display:grid;grid-template-columns:104px minmax(0,1fr);gap:16px;align-items:start}
.dec:has(.dec-body:only-child),.dec.solo{grid-template-columns:minmax(0,1fr)}
@media(max-width:620px){.dec{grid-template-columns:minmax(0,1fr)}.dec-por{max-width:110px}}
.dec-por canvas{width:100%;height:auto;image-rendering:pixelated;display:block}
.dec-sit{margin:0 0 10px;font-size:15px;line-height:1.75;color:var(--iv3);word-break:keep-all}
.dec-lesson{margin-top:9px;padding:9px 11px;font-size:13px;line-height:1.7;color:var(--gd4);
  background:var(--ink0);border-left:4px solid var(--gd2);word-break:keep-all}
/* 결단은 선택지 문장이 길어서 한 줄에 하나씩 */
.dec .quiz-opts{grid-template-columns:minmax(0,1fr)}
.ending{text-align:center}
.ending h2{font-family:var(--ui-serif);font-size:clamp(20px,4vw,28px);color:var(--gd4);text-shadow:var(--hard)}
.ending p{font-size:15px;color:var(--iv2);line-height:1.75;max-width:560px;margin:10px auto;word-break:keep-all}
.endstats{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:6px;margin:16px 0}
.endstats div{padding:9px;background:var(--ink0);border:1px solid var(--gd0)}
.endstats b{display:block;font-size:19px;color:var(--gd4)}
.endstats span{font-size:11px;color:var(--iv1)}
.fx-level span{display:block;font-size:15px;color:var(--iv3);margin-top:4px}

/* v3: 상점 · 살펴보기 · 명화 감상 · 메뉴 */
.nametag.shopk{color:var(--gd4)}
.nametag.hintg{color:var(--se4)}
.nametag.spotg{color:var(--gr4);border-color:var(--gr1)}
.chip.btnchip{cursor:pointer;user-select:none}
.chip.btnchip:hover{border-color:var(--gd2);color:var(--gd4)}
#map{cursor:pointer}
.shoplist{display:grid;gap:6px;max-height:56vh;overflow:auto;padding-right:2px}
.shoprow{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:10px;align-items:center;
  padding:7px 9px;background:var(--ink0);border:1px solid var(--ink3)}
.shoprow b{display:block;font-size:14px;color:var(--iv4)}
.shoprow small{display:block;font-size:11px;color:var(--iv1);word-break:keep-all}
.shoprow .price{font:700 13px ui-monospace,monospace;color:var(--gd3);white-space:nowrap}
.shophead{display:grid;grid-template-columns:64px minmax(0,1fr);gap:10px;align-items:center;margin-bottom:10px}
.shophead canvas{display:block;width:64px;image-rendering:pixelated;border:2px solid var(--gd1)}
.shophead .encounter-portrait{display:block;width:64px;height:80px;object-fit:cover;object-position:center top;border:2px solid var(--gd1)}
.shophead p{margin:0;font-size:13px;color:var(--iv2);word-break:keep-all}
.spotbody p{margin:0 0 10px;font-size:14.5px;line-height:1.8;color:var(--iv3);word-break:keep-all}
.spot-hint{margin:8px 0;padding:8px 10px;font-size:13px;color:var(--gd4);background:var(--ink0);border-left:4px solid var(--gd2)}
.artwrap{display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;align-items:start}
@media(max-width:620px){.artwrap{grid-template-columns:minmax(0,1fr)}}
.artframe{padding:7px;background:var(--wd1);border:3px solid var(--gd1);
  box-shadow:inset 0 0 0 2px var(--wd0),inset 2px 2px 0 2px var(--gd2),4px 4px 0 0 rgba(0,0,0,.45)}
.artframe canvas{display:block;width:min(288px,68vw);height:auto;image-rendering:pixelated}
.artmeta b{display:block;font-family:var(--ui-serif);font-size:17px;color:var(--gd4);text-shadow:var(--hard1)}
.artmeta small{display:block;margin:3px 0 8px;font-size:11px;color:var(--gd2)}
.artmeta p{margin:0;font-size:13.5px;line-height:1.75;color:var(--iv2);word-break:keep-all}
.artnote{margin-top:8px;font-size:11px;color:var(--iv0)}

/* v4.1: 밝은 전면 대화 · 오디세이 수집 박물관 */
#map{filter:brightness(1.16) saturate(1.08) contrast(1.01)}
.title-veil{background:linear-gradient(180deg,rgba(4,7,17,.02),rgba(4,7,17,.08) 34%,rgba(4,7,17,.5) 66%,rgba(4,7,17,.8))!important}
.dlgwrap.conversation{position:fixed!important;inset:0!important;z-index:86!important;display:grid!important;place-items:center;padding:24px;background:rgba(7,18,24,.52);backdrop-filter:blur(2px)}
.conversation-dialog{width:min(1080px,96vw);padding:18px;background:#e9dabd url('assets/ui-parchment.jpg') center/520px auto;color:#21170f;border:18px solid transparent;border-image:url('assets/ui-frame-dialogue-v2.png') 150 round;box-shadow:0 24px 70px rgba(0,0,0,.68)}
.conversation-head{display:flex;justify-content:space-between;align-items:center;padding:8px 12px 14px;border-bottom:2px solid #9a6a27}.conversation-head h3{margin:0;font-family:var(--ui-serif);font-size:25px;color:#39200f}.conversation-head small{color:#79562c;letter-spacing:.08em}
.conversation-scene{position:relative;min-height:470px;margin:14px 0;background-position:center 35%;background-size:cover;border:2px solid #9c712f;box-shadow:inset 0 0 0 4px rgba(255,244,208,.35)}
.conversation-scene:after{content:"";position:absolute;inset:38% 0 0;background:linear-gradient(0deg,rgba(17,28,30,.72),transparent);pointer-events:none}
.conversation-cast{position:absolute;z-index:2;inset:18px 22px 104px;display:flex;justify-content:space-between;align-items:flex-end}.conversation-person{display:flex;align-items:end;gap:10px;padding:9px;background:rgba(255,247,223,.9);border:1px solid #c79846;box-shadow:0 8px 22px rgba(0,0,0,.35)}.conversation-person.right{flex-direction:row-reverse;text-align:right}.conversation-person canvas{width:118px;height:auto;image-rendering:pixelated;border:3px solid #b47c2a;box-shadow:inset 0 0 0 2px #fff1c7}.conversation-person b{display:block;font-family:var(--ui-serif);font-size:18px;color:#40230e}.conversation-person small{display:block;color:#79562c}
.conversation-person .encounter-portrait{display:block;width:118px;height:142px;object-fit:cover;object-position:center top;border:3px solid #b47c2a;box-shadow:inset 0 0 0 2px #fff1c7}
.conversation-line{position:absolute;z-index:3;left:24px;right:24px;bottom:18px;padding:16px 20px;background:rgba(255,248,225,.96);border:1px solid #d5a64d;border-left:6px solid #37798c;box-shadow:0 8px 24px rgba(0,0,0,.38)}.conversation-line b{color:#1d657a;font-family:var(--ui-serif);font-size:17px}.conversation-line p{margin:6px 0 0;color:#20170f;font-size:18px;line-height:1.7;word-break:keep-all}.conversation-actions{display:flex;justify-content:flex-end}.conversation-actions .btn{min-width:190px}
.conversation-focus{position:absolute;z-index:3;left:24px;right:24px;bottom:18px;display:grid;grid-template-columns:144px minmax(0,1fr);align-items:stretch;background:rgba(255,248,225,.97);border:1px solid #d5a64d;border-left:6px solid #37798c;box-shadow:0 10px 28px rgba(0,0,0,.48)}.conversation-focus>.pimg,.conversation-focus>canvas{display:block;width:144px;height:164px;object-fit:cover;object-position:center 24%;image-rendering:auto;border:0;border-right:3px solid #9f722d}.speaker-dialogue{padding:17px 20px;align-self:center}.speaker-dialogue b{display:block;color:#1d657a;font-size:19px}.speaker-dialogue small{display:block;margin-top:2px;color:#75572f;font-size:12px}.speaker-dialogue p{margin:9px 0 0;color:#20170f;font-size:18px;line-height:1.72;word-break:keep-all}
@media(max-width:720px){.conversation-focus{left:10px;right:10px;bottom:10px;grid-template-columns:86px minmax(0,1fr)}.conversation-focus>.pimg,.conversation-focus>canvas{width:86px;height:116px}.speaker-dialogue{padding:10px 12px}.speaker-dialogue p{font-size:15px;line-height:1.55}}
.collection-summary{display:grid;grid-template-columns:minmax(0,1fr) 210px;gap:18px;align-items:center;margin-bottom:16px;padding:17px 20px;background:#ead9b8 url('assets/ui-parchment.jpg') center/500px auto;color:#2c1d10;border:2px solid #a77930}.collection-summary h2{margin:0 0 5px;font-family:var(--ui-serif);color:#294e59}.collection-summary p{margin:0;line-height:1.65}.collection-count{text-align:center;font-family:var(--ui-serif);font-size:34px;color:#23657a}.collection-count small{display:block;font:12px system-ui;color:#77572e}
.museum-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(205px,1fr));gap:14px}.museum-card{position:relative;min-height:280px;padding:9px;text-align:left;background:#e8d7b6;border:2px solid #7d683a;box-shadow:inset 0 0 0 3px #f8eccf,0 7px 18px rgba(0,0,0,.28);cursor:pointer;transition:.18s}.museum-card:hover{transform:translateY(-3px);border-color:#d9ad54}.museum-card.locked{cursor:default;filter:saturate(.25)}.museum-card img{display:block;width:100%;aspect-ratio:1.2;object-fit:cover;border:1px solid #79501c}.museum-card.locked img{filter:brightness(.16) sepia(1);opacity:.75}.museum-card b{display:block;margin:9px 4px 2px;font-family:var(--ui-serif);font-size:17px;color:#48270f}.museum-card small{display:block;margin:0 4px;color:#805d31}.museum-no{position:absolute;top:15px;left:15px;padding:3px 7px;background:#153844;color:#f1d17f;font:800 10px ui-monospace,monospace}
.artifact-sheet{overflow:hidden;background:#efe0c2 url('assets/ui-parchment.jpg') center/560px auto;color:#24170d;border:2px solid #9f762f}.artifact-hero{position:relative;min-height:330px;background-position:center;background-size:cover}.artifact-hero:after{content:"";position:absolute;inset:45% 0 0;background:linear-gradient(0deg,rgba(20,34,37,.76),transparent)}.artifact-title{position:absolute;z-index:2;left:24px;right:24px;bottom:20px;color:#fff6d9;text-shadow:0 2px 8px #000}.artifact-title .new{display:inline-block;margin-bottom:6px;padding:4px 8px;background:#247087;color:white;font:800 11px system-ui}.artifact-title h2{margin:0;font-family:var(--ui-serif);font-size:34px}.artifact-body{display:grid;grid-template-columns:230px minmax(0,1fr);gap:22px;padding:22px}.artifact-object{width:100%;border:4px solid #8b672e;box-shadow:inset 0 0 0 3px #f7e8c5}.artifact-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.artifact-meta span{padding:8px;background:rgba(51,109,127,.1);border-left:3px solid #36798d;font-size:12px}.artifact-story h3{margin:0 0 7px;font-family:var(--ui-serif);color:#285e70}.artifact-story p{margin:0 0 14px;font-size:15px;line-height:1.78;color:#2b1e13;word-break:keep-all}.learning-points{display:grid;grid-template-columns:1fr 1fr;gap:10px}.learning-points section{padding:12px;background:#fff7e4;border:1px solid #c69a52}.learning-points b{display:block;margin-bottom:5px;color:#25677b}.artifact-footer{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px 22px;background:#d6bd8e;border-top:1px solid #9c6c28}.artifact-footer p{margin:0;color:#523518;font-size:12px}.today-box{margin-top:14px;padding:14px 16px;background:#e8f3f0;border:1px solid #70a99e;border-left:6px solid #237d70;color:#173c37}.today-box b{display:block;margin-bottom:5px;color:#17695f;font-family:var(--ui-serif);font-size:16px}.today-box p{margin:0!important;color:#173c37!important}.culture-title{margin:24px 0 10px;font-family:var(--ui-serif);color:#edc56c}.culture-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}.culture-card{padding:13px 15px;background:#f1e5ca;color:#2c1d10;border:1px solid #b98739;border-left:5px solid #2d8277}.culture-card.off{filter:grayscale(1);opacity:.48}.culture-card b{display:block;color:#245e70;font-family:var(--ui-serif);font-size:16px}.culture-card small{display:block;margin:3px 0 7px;color:#53716a}.culture-card p{margin:0;line-height:1.6;font-size:13px;word-break:keep-all}
@media(max-width:720px){.dlgwrap.conversation{padding:8px}.conversation-dialog{padding:12px}.conversation-scene{min-height:68vh}.conversation-cast{inset:10px 10px 130px}.conversation-person{padding:5px}.conversation-person canvas{width:74px}.conversation-person div{display:none}.conversation-line{left:10px;right:10px;bottom:10px}.conversation-line p{font-size:15px}.collection-summary{grid-template-columns:1fr}.artifact-body{grid-template-columns:1fr}.artifact-object{max-width:260px}.learning-points{grid-template-columns:1fr}}
/* Pretendard layout guard: every title, role and speech gets its own flow row. */
.win-hd{height:auto!important;min-height:43px!important;align-items:flex-start!important}.win-tl{position:static!important;margin:0!important;line-height:1.45!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:anywhere!important}
.conversation-head{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:12px!important;align-items:start!important}.conversation-head>div{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:5px!important;min-width:0}.conversation-head h3,.conversation-head small,.conversation-head>b{display:block!important;position:static!important;margin:0!important}.conversation-head h3{line-height:1.3!important;overflow-wrap:anywhere}.conversation-head small{font-size:12px!important;line-height:1.5!important;letter-spacing:.03em!important}.conversation-head>b{line-height:1.4!important;white-space:nowrap}
.speaker-dialogue{position:static!important;display:grid!important;grid-template-columns:minmax(0,1fr)!important;align-content:center!important;gap:5px!important;min-width:0!important}.speaker-dialogue b,.speaker-dialogue small,.speaker-dialogue p{display:block!important;position:static!important}.speaker-dialogue b{margin:0!important;line-height:1.35!important}.speaker-dialogue small{margin:0!important;line-height:1.45!important}.speaker-dialogue p{margin:5px 0 0!important}
.items{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))!important;gap:10px!important}.item{padding:8px!important;gap:6px!important;background:linear-gradient(180deg,#142431,#09131c)!important}.item-ic{width:100%!important;height:auto!important;aspect-ratio:1/1;overflow:hidden;background:#1b2a31!important}.item-ic .item-thumb{width:100%;height:100%;object-fit:cover;display:block;image-rendering:auto!important}.item-nm{font-size:14px!important}.item-record-object{display:block;aspect-ratio:1/1;object-fit:cover;image-rendering:auto!important}.item-record-hero{min-height:360px!important;background-position:center!important}.fx-item-discovery{position:fixed;inset:0;z-index:180;display:grid;place-items:center;pointer-events:none;background:rgba(4,13,20,.38);animation:itemReveal .28s ease-out}.fx-item-discovery>div{width:min(390px,84vw);padding:12px 12px 18px;text-align:center;background:#efe0c2 url('assets/ui-parchment.jpg') center/cover;color:#24170d;border:3px solid #d0a13e;box-shadow:inset 0 0 0 3px #203847,0 24px 70px #000b}.fx-item-discovery img{display:block;width:100%;aspect-ratio:1/1;object-fit:cover;border:2px solid #7d5928}.fx-item-discovery span{display:block;margin-top:11px;color:#21748a;font-size:11px;font-weight:800;letter-spacing:.17em}.fx-item-discovery b{display:block;margin:4px 0;font-size:22px}.fx-item-discovery small{display:block;line-height:1.5}.fx-item-discovery.out{opacity:0;transition:opacity .45s}@keyframes itemReveal{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:none}}@media(max-width:720px){.items{grid-template-columns:repeat(2,minmax(0,1fr))!important}.item-record-hero{min-height:250px!important}}
.hero-vertical{border:14px solid transparent!important;border-image:url('assets/ui-frame-hero-v2.png') 150 round!important;padding:12px!important}.lang-toggle{cursor:pointer;color:#ffe6a0!important}.nametag.spotg{transform:translate(-50%,4px)!important;font-size:11px!important;padding:2px 6px!important}.art-original{display:block;width:100%;max-height:68vh;object-fit:contain;background:#14110e}.art-movement{display:inline-block;margin:7px 0;padding:4px 8px;background:#245e70;color:#fff0c8;font-size:11px;font-weight:800;letter-spacing:.08em}
.map-hint{position:absolute;z-index:12;left:18px;right:18px;bottom:18px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;padding:10px 12px;line-height:1.45;color:#fff1bd;background:linear-gradient(90deg,rgba(16,31,42,.96),rgba(23,17,35,.94));border:1px solid #e0b65b;box-shadow:inset 0 0 0 2px #111c25,0 5px 18px rgba(0,0,0,.65);font-size:13px}.map-hint[hidden]{display:none}.map-hint>i{font-style:normal;font-size:20px}.map-hint>b{color:#f0c85a}.map-hint button{width:28px;height:28px;padding:0;border:1px solid #a87a2d;background:#1c2631;color:#f5df9a;cursor:pointer}@media(max-width:720px){.map-hint{left:10px;right:10px;bottom:10px;font-size:11px}}
`;

const COLLECTIONS = [
 {id:'phaeacian-brooch',scene:'scheria',at:[29,10],img:'assets/collect-phaeacian-brooch.jpg',name:'파이아케스의 파도 브로치',kind:'금제 망토 브로치',place:'아레테 왕비의 화로',story:'난파한 오디세우스가 궁전에 도착했을 때 파이아케스 사람들은 먼저 그의 이름이 아니라 필요한 도움을 물었습니다. 왕비 아레테의 화로 곁에서 탄원한 손님은 공동체의 보호를 받았습니다. 이 브로치는 손님에게 새 옷을 내어 주는 환대의 표시입니다.',symbol:'파도무늬 브로치는 낯선 이를 손님으로 받아들이는 환대, 즉 크세니아를 상징합니다.',remember:'파이아케스 사람들은 오디세우스의 마지막 귀향길을 배로 도와주었습니다.',source:'호메로스 《오디세이아》 6~8권과 고대 그리스 금세공품을 바탕으로 한 복원도'},
 {id:'maronian-wine',scene:'cicones',at:[20,20],img:'assets/collect-maronian-wine.jpg',name:'마론의 진한 포도주',kind:'적회식 포도주 암포라',place:'이스마로스의 검은 배',story:'오디세우스는 아폴론의 사제 마론과 가족을 해치지 않았고, 마론은 감사의 뜻으로 아주 진한 포도주를 주었습니다. 훗날 그는 이 술로 키클롭스 폴리페모스를 취하게 해 동료들을 탈출시킵니다. 앞선 절제가 뒤의 위기를 구한 셈입니다.',symbol:'포도주는 힘보다 절제와 준비가 어려움을 푸는 도구가 될 수 있음을 보여 줍니다.',remember:'오디세우스는 이 술을 물에 스무 배 섞어도 향이 강했다고 말합니다.',source:'호메로스 《오디세이아》 9권과 고대 운송용 암포라를 바탕으로 한 복원도'},
 {id:'lotus-wreath',scene:'lotus',at:[23,4],img:'assets/collect-lotus-wreath.jpg',name:'망각의 연꽃 화관',kind:'연꽃 식물 표본',place:'연꽃 먹는 사람들의 섬',story:'연꽃을 맛본 선원들은 고향으로 돌아가려는 마음을 잊고 섬에 머물고 싶어 했습니다. 오디세우스는 울며 버티는 동료들을 배로 데려와 노 자리 아래 묶었습니다. 달콤한 휴식이 삶의 목적을 지워 버릴 수도 있다는 이야기입니다.',symbol:'연꽃은 편안함, 유혹, 기억을 잃는 위험을 상징합니다.',remember:'오디세우스가 지킨 것은 항로만이 아니라 동료들의 귀향 의지였습니다.',source:'호메로스 《오디세이아》 9권의 로토파고이 이야기에서 착안한 학습용 식물 복원도'},
 {id:'cyclops-cup',scene:'cyclops',at:[16,8],img:'assets/collect-cyclops-cup.jpg',name:'폴리페모스의 거대한 잔',kind:'올리브나무 대형 잔',place:'키클롭스의 치즈 동굴',story:'외눈박이 폴리페모스는 손님을 보호하는 법을 무시했습니다. 오디세우스는 마론의 포도주를 이 큰 잔에 따라 그를 취하게 하고, 자신의 이름을 “아무도”라고 속여 위기를 벗어났습니다.',symbol:'큰 잔은 힘과 욕망을, 옆의 작은 잔은 지혜가 힘을 이길 수 있음을 보여 줍니다.',remember:'폴리페모스가 도움을 청하며 “아무도 나를 해친다”고 외쳐 다른 키클롭스들이 돌아갔습니다.',source:'호메로스 《오디세이아》 9권과 고대 목기를 바탕으로 한 상상 복원'},
 {id:'moly-herb',scene:'aeaea',at:[20,10],img:'assets/collect-moly-herb.jpg',name:'헤르메스의 몰리',kind:'검은 뿌리와 흰 꽃의 신성한 약초',place:'키르케의 저택',story:'키르케가 동료들을 돼지로 바꾸자 헤르메스는 오디세우스에게 몰리라는 약초를 주었습니다. 뿌리는 검고 꽃은 우유처럼 희며, 인간이 캐기는 어렵지만 신에게는 가능하다고 합니다. 이 약초 덕분에 오디세우스는 마법에 정신을 잃지 않았습니다.',symbol:'몰리는 위험한 유혹 속에서도 자신을 지키는 지식과 도움을 상징합니다.',remember:'영웅도 혼자 모든 일을 해결하지 않습니다. 올바른 조언을 듣는 능력도 지혜입니다.',source:'호메로스 《오디세이아》 10권의 묘사를 바탕으로 한 학습용 식물 복원도'},
 {id:'underworld-bowl',scene:'underworld',at:[17,3],img:'assets/collect-underworld-bowl.jpg',name:'저승의 기억 제의 그릇',kind:'청동 제의용 그릇',place:'저승의 푸른 화로',story:'오디세우스는 테이레시아스의 예언을 듣기 위해 땅에 구덩이를 파고 꿀·우유·포도주·물과 곡식을 바쳤습니다. 죽은 자를 함부로 부른 것이 아니라, 예를 갖추고 기억하며 지혜를 구한 것입니다.',symbol:'제의 그릇은 산 자와 죽은 자를 잇는 기억과 존중을 상징합니다.',remember:'저승에서 오디세우스는 어머니의 혼백을 만나 자신의 귀향이 가족의 시간과도 이어져 있음을 깨닫습니다.',source:'호메로스 《오디세이아》 11권과 고대 그리스 제의용 그릇을 바탕으로 한 복원도'},
 {id:'sirens-wax-rope',scene:'sirens',at:[37,7],img:'assets/collect-sirens-wax-rope.jpg',name:'세이렌의 밀랍과 돛대 밧줄',kind:'밀랍 귀마개 · 삼줄',place:'세이렌 바위의 난파선',story:'오디세우스는 세이렌의 노래를 듣고도 살아남고 싶었습니다. 선원들의 귀는 밀랍으로 막고, 자신은 돛대에 묶은 뒤 아무리 풀어 달라고 해도 더 단단히 묶으라고 명령했습니다. 미래의 약한 자신을 미리 대비한 선택입니다.',symbol:'밀랍과 밧줄은 유혹을 이기기 위한 규칙과 자기 통제를 상징합니다.',remember:'지혜는 유혹이 시작된 뒤 참는 것뿐 아니라, 그 전에 안전장치를 만드는 것입니다.',source:'호메로스 《오디세이아》 12권과 고대 항해 도구를 바탕으로 한 복원도'},
 {id:'odysseus-bow',scene:'ithaca',at:[30,7],img:'assets/collect-odysseus-bow.jpg',name:'오디세우스의 활과 열두 도끼',kind:'복합궁 · 도끼날',place:'페넬로페의 베틀',story:'페넬로페는 오디세우스의 활을 당겨 열두 도끼 구멍을 한 번에 꿰뚫는 사람과 결혼하겠다고 선언했습니다. 구혼자들은 아무도 활시위를 걸지 못했지만, 거지로 변장한 오디세우스는 해냈습니다. 오래된 물건이 주인의 정체를 증명한 순간입니다.',symbol:'활은 힘뿐 아니라 주인만이 아는 기술, 정체성, 귀환의 완성을 상징합니다.',remember:'페넬로페는 마지막에도 침대의 비밀을 물어 그가 진짜 남편인지 확인했습니다.',source:'호메로스 《오디세이아》 21~23권과 고대 복합궁을 바탕으로 한 복원도'}
];
const CULTURE_LINKS = [
 {scene:'ogygia',item:'phaeacian-brooch',title:'긴 모험을 뜻하는 “오디세이”',text:'오늘날 영어 odyssey는 단순한 여행이 아니라 길고 파란만장하며 사람을 변화시키는 여정을 뜻합니다. 오디세우스의 10년 귀향에서 생긴 말입니다.',source:'Homer · The Odyssey에서 생긴 보통명사'},
 {scene:'scheria',item:'phaeacian-brooch',title:'조언자를 뜻하는 “멘토”',text:'오디세우스는 아들 텔레마코스를 친구 멘토르에게 맡겼습니다. 아테나도 멘토르 모습으로 조언했고, 훗날 mentor는 경험이 적은 사람을 돕는 믿을 만한 지도자를 뜻하게 되었습니다.',source:'Merriam-Webster · mentor'},
 {scene:'cicones',item:'maronian-wine',title:'Xenia, 낯선 이를 손님으로',text:'그리스인의 환대 규칙 크세니아는 낯선 사람에게 음식과 보호를 제공하고, 손님도 주인을 존중해야 한다는 상호 약속이었습니다. 오디세이의 많은 사건은 이 규칙을 지켰는지 묻습니다.',source:'호메로스 서사시의 환대 관습'},
 {scene:'lotus',item:'lotus-wreath',title:'현실을 잊는 “lotus-eater”',text:'영어 lotus-eater는 편안한 즐거움에 빠져 해야 할 일을 잊는 사람을 가리키기도 합니다. 귀향을 잊은 로토파고스 섬 이야기에서 나온 표현입니다.',source:'《오디세이아》의 로토파고이 전승'},
 {scene:'cyclops',item:'cyclops-cup',title:'거대하다는 뜻의 “Cyclopean”',text:'영어 Cyclopean은 키클롭스가 만들었을 것처럼 엄청나게 크고 무거운 돌 구조물을 묘사할 때 씁니다. 미케네의 거대한 성벽도 오래전부터 ‘키클롭스식 성벽’이라 불렸습니다.',source:'고전 건축 용어 · Cyclopean masonry'},
 {scene:'aeaea',item:'moly-herb',title:'약 이름으로도 남은 Circe',text:'키르케의 이름 Circe는 사람을 홀리거나 변화시키는 마법사의 이미지로 문학과 예술에 계속 등장합니다. 생물학의 식물 이름과 동물 이름에도 신화 이름이 자주 쓰입니다.',source:'고전 신화가 남긴 과학·문학 이름'},
 {scene:'sirens',item:'sirens-wax-rope',title:'경보음 “사이렌”의 뿌리',text:'위험을 알리는 경보 장치 siren은 사람을 홀려 파멸로 이끄는 세이렌에서 이름을 얻었습니다. 오늘날에는 유혹의 노래가 아니라 위험을 피하라고 울리는 소리가 되었습니다.',source:'세이렌 신화에서 이어진 현대 단어'},
 {scene:'ithaca',item:'odysseus-bow',title:'이름이 증거가 되지 않을 때',text:'오디세우스는 변장만 풀고 자신이 왕이라고 주장하지 않았습니다. 활, 발의 흉터, 둘만 아는 침대의 비밀처럼 서로 다른 증거를 차례로 보여 주었습니다. 오늘날의 신원 확인과도 닮았습니다.',source:'《오디세이아》 19·21·23권'}
];

/* High-resolution item art. Pixel icons remain as fallback. */
const ITEM_ART = {
  hermes_word:'hermes-divine-letter.jpg',raft_log:'sturdy-raft-log.jpg',sail_cloth:'calypso-sail-cloth.jpg',bronze_axe:'calypso-bronze-axe.jpg',star_chart:'ithaca-pocket-chart.jpg',ino_veil:'ino-sea-veil.jpg',lotus_fruit:'lotus-fruit.jpg',leather_cuirass:'sailors-leather-gloves.jpg',phaeacian_chest:'nausicaa-phaeacian-brooch.jpg',wind_bag:'aeolus-wind-knot.jpg',wax_plug:'sirens-wax-earplugs.jpg',mast_rope:'flowered-sailors-rope.jpg',argos_collar:'argos-collar.jpg',penelope_shroud:'penelope-weaving-shuttle.jpg',bow_string:'odysseus-bowstring.jpg',great_bow:'odysseus-bowstring.jpg',olive_bed_post:'olive-marriage-bed-token.jpg',penelope_shuttle:'penelope-weaving-shuttle.jpg',ithaca_seal:'ithaca-seal-ring.jpg',telemachus_horse:'telemachus-wooden-horse.jpg',eurycleia_lamp:'eurycleia-oil-lamp.jpg',laertes_knife:'laertes-pruning-knife.jpg',anticleia_spindle:'anticleia-spindle.jpg',calypso_comb:'calypso-shell-comb.jpg',nausicaa_brooch:'nausicaa-phaeacian-brooch.jpg',sealed_provisions:'sealed-provisions-bundle.jpg',aeolus_knot:'aeolus-wind-knot.jpg'
};
const TREASURE_CHESTS_HD = typeof Image !== 'undefined' ? new Image() : null;
if (TREASURE_CHESTS_HD) { TREASURE_CHESTS_HD.decoding = 'async'; TREASURE_CHESTS_HD.src = 'assets/treasure-chests-hd-v2.png'; }
Object.assign(CONTENT.ITEMS,{
 penelope_shuttle:{name:'페넬로페의 베틀 북',kind:'relic',rarity:3,desc:'푸른 실이 감긴 올리브나무 베틀 북. 긴 항해에서도 페넬로페와 이타카를 기억하게 한다.',effect:'귀향의 기억 · 지혜 +5',stat:{atk:0,def:0,wis:5,hp:0}},
 ithaca_seal:{name:'이타카의 인장 반지',kind:'relic',rarity:2,desc:'섬과 올리브나무, 배가 새겨진 이타카 왕가의 청동 인장.',effect:'정체성의 증표 · 지혜 +4',stat:{atk:0,def:1,wis:4,hp:0}},
 telemachus_horse:{name:'텔레마코스의 어린 시절 목마',kind:'relic',rarity:2,desc:'아들을 갓난아이로 두고 떠났던 아버지가 간직한 작은 올리브나무 목마.',effect:'가족의 기억 · 최대 HP +8',stat:{atk:0,def:0,wis:2,hp:8}},
 eurycleia_lamp:{name:'에우리클레이아의 등잔',kind:'relic',rarity:2,desc:'오디세우스의 오래된 흉터를 알아본 유모가 밝히던 테라코타 등잔.',effect:'숨은 흔적 발견 · 지혜 +4',stat:{atk:0,def:0,wis:4,hp:0}},
 laertes_knife:{name:'라에르테스의 가지치기 칼',kind:'weapon',rarity:2,desc:'아버지 라에르테스가 이타카의 과수원을 돌볼 때 쓰던 굽은 청동 칼.',effect:'과수원의 손길 · 힘 +4, 지혜 +2',stat:{atk:4,def:0,wis:2,hp:0}},
 anticleia_spindle:{name:'안티클레이아의 물레가락',kind:'relic',rarity:2,desc:'저승에서 다시 만난 어머니의 기억을 담은 물레가락과 붉은 실.',effect:'어머니의 기억 · 지혜 +5',stat:{atk:0,def:0,wis:5,hp:0}},
 calypso_comb:{name:'칼립소의 자개 빗',kind:'relic',rarity:2,desc:'오디세우스를 놓아주며 칼립소가 남긴 조개와 자개 장식의 빗.',effect:'떠날 용기 · 지혜 +3, 최대 HP +4',stat:{atk:0,def:0,wis:3,hp:4}},
 nausicaa_brooch:{name:'나우시카아의 파도 브로치',kind:'relic',rarity:2,desc:'난파한 나그네에게 옷과 도움을 내어 준 파이아케스 왕녀의 브로치.',effect:'환대의 표식 · 방어 +2, 지혜 +3',stat:{atk:0,def:2,wis:3,hp:0}},
 sealed_provisions:{name:'밀랍 봉인 보급 꾸러미',kind:'consume',rarity:1,desc:'보릿과자와 말린 무화과를 리넨으로 싸고 밀랍으로 봉한 항해 식량.',effect:'사용 시 체력 회복',stat:{atk:0,def:0,wis:0,hp:28}},
 aeolus_knot:{name:'아이올로스의 바람 매듭',kind:'relic',rarity:3,desc:'네 방향의 깃털과 푸른 유리병에 바람을 묶어 둔 희귀한 부적.',effect:'항해의 길잡이 · 지혜 +7',stat:{atk:0,def:0,wis:7,hp:0}}
});
function itemArt(id){return ITEM_ART[id]?'assets/items-v2/'+ITEM_ART[id]:''}
function itemVisual(id,clsName){const src=itemArt(id);return src?`<img class="${esc(clsName||'item-art')}" src="${esc(src)}" alt="">`:`<canvas class="icon" width="12" height="12" data-icon="${esc(id)}"></canvas>`}

/* ==================== 씬·인물 데이터 ==================== */
const SCENES = {
  ogygia: { title: '오기기아 섬', sub: '현재 · 칼립소의 동굴', npcs: ['calypso', 'muse', 'trader'], next: 'scheria', exitLabel: '뗏목을 띄운다' },
  scheria: { title: '스케리아', sub: '현재 · 파이아케스의 땅', npcs: ['nausicaa', 'alcinous', 'muse', 'trader'], next: 'cicones', exitLabel: '항해 이야기를 시작한다' },
  cicones: { title: '이즈마로스 해안', sub: '회상 · 키코네스의 도시', npcs: ['ciconian', 'muse', 'trader'], next: 'lotus', exitLabel: '서둘러 출항한다', battle: 'cicones' },
  lotus: { title: '로토파고스의 섬', sub: '회상 · 잊음의 유혹', npcs: ['lotus', 'muse', 'trader'], next: 'cyclops', exitLabel: '고향을 향해 떠난다', battle: 'lotus' },
  cyclops: { title: '키클롭스의 동굴', sub: '회상 · 폴리페모스와 포도주', npcs: ['polyphemus', 'muse', 'trader'], next: 'aeaea', exitLabel: '양 떼 아래로 탈출한다', battle: 'cyclops' },
  aeaea: { title: '아이아이에 섬', sub: '회상 · 키르케의 집', npcs: ['circe', 'muse', 'trader'], next: 'underworld', exitLabel: '저승으로 향한다', battle: 'aeaea' },
  underworld: { title: '저승의 문', sub: '회상 · 테이레시아스의 예언', npcs: ['tiresias', 'muse', 'trader'], next: 'sirens', exitLabel: '다시 산 자의 바다로', battle: 'underworld' },
  sirens: { title: '세이렌의 바다', sub: '회상 · 스킬라와 카리브디스 앞', npcs: ['siren', 'poseidon', 'muse', 'trader'], next: 'thrinacia', exitLabel: '돛을 올린다', battle: 'sirens' },
  thrinacia: { title: '트리나키아', sub: '회상 · 태양신의 소', npcs: ['eurylochus', 'muse', 'trader'], next: 'ithaca', exitLabel: '마지막 항해를 시작한다', battle: 'thrinacia' },
  ithaca: { title: '이타카 궁전', sub: '현재 · 돌아온 왕의 시험', npcs: ['athena', 'telemachus', 'penelope', 'muse', 'trader'], next: null, exitLabel: '구혼자들과 맞선다', battle: 'ithaca' }
};
const ORDER = Object.keys(SCENES);
const SCENES_EN = {
  ogygia:{title:'Ogygia',sub:'Present · Calypso’s cave',exitLabel:'Launch the raft'}, scheria:{title:'Scheria',sub:'Present · Land of the Phaeacians',exitLabel:'Begin the sea tale'},
  cicones:{title:'Coast of Ismaros',sub:'Memory · City of the Cicones',exitLabel:'Sail before nightfall'}, lotus:{title:'Island of the Lotus-Eaters',sub:'Memory · The temptation to forget',exitLabel:'Sail toward home'},
  cyclops:{title:'Cave of the Cyclops',sub:'Memory · Polyphemus and the wine',exitLabel:'Escape beneath the rams'}, aeaea:{title:'Aeaea',sub:'Memory · House of Circe',exitLabel:'Sail for the Underworld'},
  underworld:{title:'Gate of the Underworld',sub:'Memory · Prophecy of Tiresias',exitLabel:'Return to the living sea'}, sirens:{title:'Sea of the Sirens',sub:'Memory · Before Scylla and Charybdis',exitLabel:'Raise the sail'},
  thrinacia:{title:'Thrinacia',sub:'Memory · Cattle of the Sun',exitLabel:'Begin the final voyage'}, ithaca:{title:'Palace of Ithaca',sub:'Present · Trial of the returned king',exitLabel:'Face the suitors'}
};
function isEn(){ return typeof S !== 'undefined' && S.lang === 'en'; }
function L(ko,en){ return isEn() ? (en || ko) : ko; }
function sceneText(key){ return isEn() ? (SCENES_EN[key] || SCENES[key]) : SCENES[key]; }
const SPOT_NAME_EN = {
 '칼립소의 화로':'Calypso’s Hearth','포도주 암포라':'Wine Amphora','바닷가의 바위':'Rock by the Sea',
 '포세이돈 신전':'Temple of Poseidon','궁전의 화로':'Palace Hearth','부러진 기둥':'Broken Column','검은 배':'Black Ship',
 '연꽃 무더기':'Lotus Patch','버려진 항아리':'Abandoned Jar','거대한 치즈 선반':'Giant Cheese Rack','뼈 무더기':'Pile of Bones','동굴의 그림자':'Shadow in the Cave',
 '키르케의 저택':'House of Circe','돌짐승 상':'Stone Beasts','저승의 화로':'Hearth of the Dead','오래된 뼈':'Ancient Bones','검은 석상':'Black Figure',
 '난파선의 항아리':'Jar from a Wreck','하얀 바위':'White Rock','태양신의 제단':'Altar of the Sun','태양신의 소':'Cattle of the Sun',
 '페넬로페의 베틀':'Penelope’s Loom','이타카의 왕좌':'Throne of Ithaca','홀의 벽화':'Mural of the Hall'
};
function spotName(name){ return isEn() ? (SPOT_NAME_EN[name] || name) : name; }
const BOOK_ROUTE = {
  ogygia:['《오디세이아》 5권','칼립소의 섬을 떠나 귀향을 다시 시작한다.'], scheria:['6–8권','나우시카아와 파이아케스에게 환대받고 자신의 이름을 밝힌다.'],
  cicones:['9권','트로이 이후 첫 약탈과 패배를 회상한다.'], lotus:['9권','망각의 유혹에서 동료들을 데리고 나온다.'], cyclops:['9권','폴리페모스의 동굴에서 지혜로 탈출한다.'],
  aeaea:['10권','키르케의 마법을 이겨 내고 저승으로 갈 길을 듣는다.'], underworld:['11권','테이레시아스에게 귀향의 조건과 금기를 듣는다.'],
  sirens:['12권','세이렌과 스킬라·카리브디스 사이를 통과한다.'], thrinacia:['12권','태양신의 소라는 마지막 금기 앞에서 버틴다.'],
  ithaca:['13–23권','이타카에서 정체를 숨기고 궁전과 가족, 자기 집을 되찾는다.']
};
const BOOK_ROUTE_EN = {
 ogygia:['Odyssey Book 5','Leave Calypso’s island and restart the journey home.'],scheria:['Books 6–8','Receive Phaeacian hospitality and reveal your identity.'],cicones:['Book 9','Recall the first raid and defeat after Troy.'],lotus:['Book 9','Rescue the crew from the temptation to forget.'],cyclops:['Book 9','Escape Polyphemus through wit rather than strength.'],aeaea:['Book 10','Resist Circe’s magic and learn the route to the dead.'],underworld:['Book 11','Hear Tiresias explain the conditions of homecoming.'],sirens:['Book 12','Pass the Sirens, Scylla, and Charybdis.'],thrinacia:['Book 12','Endure the final taboo: the cattle of the Sun.'],ithaca:['Books 13–23','Hide your identity and recover your home and family.']
};
const DECISION_TITLE_EN={storm_survived:'Survive the Storm',song_heard:'Hear the Bard’s Song',name_told:'Reveal Your Name',maron_saved:'House of Maron',board_ship:'Know When to Stop',storm_ready:'Prepare for the North Wind',crew_recovered:'Recover the Forgotten Crew',log_written:'Write the Voyage Record',cave_searched:'Search the Cave',stake_carved:'Shape the Olive Stake',escaped_cave:'Escape beneath the Rams',hermes_met:'The Stranger in the Forest',crew_restored:'Restore the Crew',bag_lesson:'The Bag That Should Stay Closed',elpenor_buried:'Elpenor’s Request',mother_met:'The Shade of His Mother',wax_made:'Wax from the Beehive',strait_passed:'Cross the Narrow Strait',oath_sworn:'Secure the Oath',food_found:'The Bent Fishhook',cattle_safe:'The Courage Not to Touch',disguised:'The King in Rags',allies_found:'Find the Loyal Few',bow_drawn:'Draw the Great Bow'};

const NPCS = {
  calypso: {
    name: '칼립소', role: '오기기아의 님프',
    lines: ['낯선 땅을 바라보는 눈빛이구나. 너는 트로이에서 온 오디세우스지?', '이 섬에서는 아무도 너를 해치지 않는다. 나와 함께라면 늙지도, 죽지도 않을 수 있어.', '하지만 네 마음은 이타카에 남아 있구나. 신들의 뜻이 정해졌다면 너를 붙잡을 수는 없겠지.', '가서 뗏목을 만들어라. 바다는 험하지만, 네가 원하는 것은 불멸이 아니라 귀향일 테니.'],
    repeat: ['바다는 네가 원하는 길을 쉽게 내주지 않을 거야. 그래도 집을 향해 노를 저어.']
  },
  nausicaa: {
    name: '나우시카아', role: '파이아케스의 공주',
    lines: ['그대는 누구인가요? 강가에서 잠든 이방인을 그냥 지나칠 수는 없어요.', '우리 백성은 낯선 손님을 함부로 내쫓지 않습니다. 먼저 몸을 씻고 옷을 입으세요.', '궁전으로 가려면 이 길을 따라가되, 나보다 조금 늦게 들어오세요.'],
    repeat: ['알키노오스 왕은 손님에게 이야기를 청할 거예요. 마음을 다잡으세요.']
  },
  alcinous: {
    name: '알키노오스', role: '파이아케스의 왕',
    lines: ['이방인이여, 우리 식탁에 앉으시오. 누구든 제우스가 보낸 손님일 수 있으니.', '그대의 이름을 묻기 전에 무엇이 필요한지부터 묻겠소. 이것이 우리의 법도요.', '데모도코스의 노래에 눈물을 보이는구려. 이제 그대가 누구인지 들려주시오.'],
    repeat: ['파이아케스의 배는 잠든 손님도 이타카에 데려다줄 만큼 빠르오.']
  },
  ciconian: {
    name: '이즈마로스의 파수꾼', role: '키코네스의 전사',
    lines: ['트로이에서 온 자들이여, 우리 도시를 약탈하고도 떠나지 않는가!', '처음 승리했다고 오래 머물면, 바람은 곧 적의 편이 된다.'],
    repeat: ['배를 타고 떠나라. 해안에 머문 대가를 이미 치렀을 테니.']
  },
  lotus: {
    name: '로토파고스', role: '연꽃 먹는 사람',
    lines: ['이 꽃을 먹으면 고향으로 돌아가고 싶은 마음이 사라져요.', '아픔도, 기다림도, 집도 잊게 되지요. 그게 정말 나쁜 일일까요?'],
    repeat: ['잊는 것은 편안하지만, 귀향할 이유도 함께 지워 버립니다.']
  },
  polyphemus: {
    name: '폴리페모스', role: '키클롭스 · 포세이돈의 아들',
    lines: ['누가 내 동굴에 들어와 포도주와 양을 훔쳤느냐?', '나는 손님을 맞는 법을 인간에게서 배우지 않았다. 내 동굴의 법은 내 힘이다.', '네 이름을 말해라. 마지막으로 기억해 둘 이름이 필요하니.'],
    repeat: ['아무도 나를 속일 수 없다. 감히 다시 내 눈앞에 나타나지 마라.']
  },
  circe: {
    name: '키르케', role: '아이아이에 섬의 마녀',
    lines: ['내 잔을 마신 자는 자신의 욕망을 닮은 모습으로 변하지.', '너는 다른 자들과 다르구나. 누군가의 약초가 네 마음을 지켜 주었어.', '검을 내리고 내 집에 머물러라. 떠날 때를 아는 것이 더 어렵다.'],
    repeat: ['저승으로 가려면 태양이 지는 쪽으로 배를 돌려라.']
  },
  tiresias: {
    name: '테이레시아스', role: '테베의 예언자',
    lines: ['살아 있는 자가 죽은 자의 땅에 들어왔구나. 네가 원하는 것은 귀향이지.', '포세이돈의 분노는 아직 끝나지 않았다.', '태양신의 소를 건드리지 마라. 그것이 귀향의 조건이다.', '이타카에 도착해도 집은 예전과 같지 않을 것이다.'],
    repeat: ['배고픔은 한 끼를 요구하지만, 욕심은 귀향 전체를 빼앗는다.']
  },
  siren: {
    name: '세이렌', role: '노래하는 바다의 존재',
    lines: ['오디세우스여, 너는 트로이와 바다의 모든 일을 알고 싶지 않은가?', '우리 노래를 들으면 네가 지나온 전쟁도, 앞으로 올 운명도 알 수 있다.'],
    repeat: ['듣고 싶은 마음을 이기는 것은 미리 약속을 지키는 일이야.']
  },
  poseidon: {
    name: '포세이돈', role: '바다를 흔드는 신',
    lines: ['나는 바다의 신 포세이돈이다. 삼지창은 바다를 흔드는 힘이지.', '네가 내 아들의 눈을 멀게 한 일을 잊지 않았다.', '그러나 신의 분노도 인간의 귀향 의지를 완전히 없애지는 못한다.'],
    repeat: ['바다는 네 적이면서 네 길이다. 파도의 성질을 읽어라.']
  },
  eurylochus: {
    name: '에우리로코스', role: '오디세우스의 동료',
    lines: ['선장님, 우리는 오래 굶었습니다. 저 소들은 신에게 바쳐진 것이 맞습니까?', '테이레시아스의 경고를 기억해야 합니다. 한 번의 칼질이 모두의 귀향을 끊을 수 있습니다.'],
    repeat: ['동료의 배고픔과 신의 금기를 함께 생각해야 합니다.']
  },
  athena: {
    name: '아테나', role: '지혜와 전략의 여신',
    lines: ['이타카에 돌아왔지만 네 얼굴을 아는 자가 너무 많다. 낯선 노인의 모습으로 숨어라.', '힘으로 궁전을 바로 되찾을 수는 없다. 텔레마코스부터 찾아라.', '지혜는 속이는 기술만이 아니다. 언제 드러낼지 아는 절제이기도 하다.'],
    repeat: ['활을 당길 때는 손보다 마음이 먼저 흔들리지 않아야 한다.']
  },
  telemachus: {
    name: '텔레마코스', role: '이타카의 왕자',
    lines: ['아버지라면 내가 알아볼 수 있을까요? 사람들은 바다에서 죽었다고 말합니다.', '나는 이제 어린아이가 아닙니다. 구혼자들과 맞서겠습니다.', '하지만 혼자서는 어렵습니다. 우리 둘이 계획을 세워야 합니다.'],
    repeat: ['아버지, 활과 무기를 준비했습니다. 이제 때를 기다리겠습니다.']
  },
  penelope: {
    name: '페넬로페', role: '이타카의 왕비',
    lines: ['낯선 노인이여, 당신은 내 남편에 관한 꿈을 꾸었다고 했지요.', '나는 매일 밤 천을 풀며 시간을 벌었지만, 이제 더는 미룰 수 없습니다.', '이 활을 당기는 자를 남편의 자리에 앉히겠습니다.'],
    repeat: ['활은 힘만으로 당겨지지 않습니다. 손에 익은 기억이 함께 필요합니다.']
  },
  muse: {
    name: '무사이', role: '기억과 예술을 전하는 아홉 여신의 안내자', hint: true,
    lines: ['나는 무사이 가운데 한 사람. 우리 아홉 자매는 시와 노래뿐 아니라 역사, 비극, 춤, 천문까지 맡아 인간이 배운 것을 기억하게 한단다.', '영어로 뮤즈(Muse)라 부르고, 박물관을 뜻하는 뮤지엄(Museum)도 본래 “무사이의 집”이라는 말에서 시작되었지.', '이 바다의 이야기를 잘 기억해 두렴. 다음 신화 시험에서 헤매면 중요한 단서를 노래해 줄게.'],
    repeat: ['귀를 기울여 보렴. 다음 시험에서 기억해야 할 한마디를 노래해 줄게.']
  },
  trader: {
    name: '떠돌이 상인', role: '에게해의 섬과 항구를 오가는 인간 장사꾼', shop: true,
    lines: ['어서 오시오, 항해자! 나는 섬과 항구를 돌며 등잔, 밧줄, 약초와 여행 도구를 파는 평범한 장사꾼이오.', '영웅의 물건처럼 화려하진 않아도 바다에서는 튼튼한 밧줄 하나가 금관보다 귀할 때가 있지.', '물건마다 어디서 왔고 어떻게 쓰는지 알려 드리리다. 필요한 것이 있는지 천천히 살펴보시오.'],
    repeat: ['오늘도 항구에서 쓸 만한 물건을 구했소. 물건의 유래까지 듣고 가시겠소?']
  }
};

/* English dialogue data. The Korean source remains authoritative; English mode
   selects these localized lines and keeps every interaction playable. */
const NPC_EN = {
  calypso:{name:'Calypso',role:'Nymph of Ogygia',lines:['For seven years this island has sheltered you, yet every dawn you look toward a home beyond the horizon.','Stay with me and I can keep age and death away. Why choose a hard mortal road?','Hermes has carried Zeus’s command. I must let you go, though the sea will not welcome you.','Take my bronze axe and this woven sailcloth. Build a broad raft and follow the stars.'],repeat:['Keep Ithaca before your mind when the sea tests you.']},
  nausicaa:{name:'Nausicaa',role:'Princess of the Phaeacians',lines:['Who are you, stranger, sleeping beside our river?','Wash, dress, and follow the road to our palace. A guest must not be abandoned.','Enter a little after me so gossip harms neither of us.'],repeat:['King Alcinous will ask for your story.']},
  alcinous:{name:'Alcinous',role:'King of the Phaeacians',lines:['Stranger, sit at our table. Any guest may be sent by Zeus.','We shall feed you before we ask your name.','Demodocus’s song has moved you. Now tell us who you are.'],repeat:['Our ship can carry a sleeping guest safely to Ithaca.']},
  ciconian:{name:'Ciconian Guard',role:'Warrior of Ismaros',lines:['Why do you linger after plundering our city?','Victory becomes defeat when greed refuses to leave.'],repeat:['Board your ships before our allies arrive.']},
  lotus:{name:'Lotus-Eater',role:'Keeper of the lotus',lines:['Taste the lotus and the wish to go home will disappear.','Pain, waiting, and duty will fade. Is forgetting always evil?'],repeat:['Comfort can erase the reason for your journey.']},
  polyphemus:{name:'Polyphemus',role:'Cyclops · son of Poseidon',lines:['Who entered my cave and touched my flocks?','The law here is my strength, not the custom of guests.','Tell me your name.'],repeat:['No one can deceive Polyphemus!']},
  circe:{name:'Circe',role:'Enchantress of Aeaea',lines:['My cup changes each man into the shape of his appetite.','A godly herb guards your mind.','Lower your sword and I will show you the road below the world.'],repeat:['Turn your ship toward the setting sun.']},
  tiresias:{name:'Tiresias',role:'Theban prophet',lines:['A living man has entered the country of the dead.','Poseidon’s anger has not ended.','Do not touch the cattle of the Sun.','Even in Ithaca, your house will not be as you left it.'],repeat:['Hunger asks for one meal; greed can take the whole homecoming.']},
  siren:{name:'Siren',role:'Singer of the fatal shore',lines:['Would you not hear every truth of Troy and the sea?','Listen, and all hidden knowledge will be yours.'],repeat:['Rules made before temptation are stronger than will alone.']},
  poseidon:{name:'Poseidon',role:'God who shakes the sea',lines:['I am Poseidon, lord of the sea and the trident.','I have not forgotten the eye of my son Polyphemus.','Even divine anger cannot erase a mortal’s longing for home.'],repeat:['The sea is both your enemy and your road.']},
  eurylochus:{name:'Eurylochus',role:'Companion of Odysseus',lines:['Captain, we have starved for days. Are those cattle truly sacred?','We must remember the warning of Tiresias.'],repeat:['Fear and hunger can disguise themselves as reason.']},
  athena:{name:'Athena',role:'Goddess of wisdom and strategy',lines:['You are home, but too many enemies know your face.','Find Telemachus before you reveal yourself.','Wisdom is knowing the right moment to be seen.'],repeat:['Steady the mind before you draw the bow.']},
  telemachus:{name:'Telemachus',role:'Prince of Ithaca',lines:['Would I recognize my father after twenty years?','I am no longer a child. I will stand against the suitors.','Together we can prepare the hall.'],repeat:['Father, the weapons are ready.']},
  penelope:{name:'Penelope',role:'Queen of Ithaca',lines:['Stranger, you say you have news of my husband.','By day I wove and by night I undid the cloth.','The man who strings this bow will face the final test.'],repeat:['A familiar hand remembers what force alone cannot.']},
  muse:{name:'Muse',role:'Guide of memory and the arts',lines:['We Muses preserve poetry, history, dance, and the stars.','The words Muse and museum both carry our name.','Memory will help in the next trial.'],repeat:['Listen carefully for a clue.']},
  trader:{name:'Wandering Merchant',role:'Trader of Aegean ports',lines:['I trade lamps, rope, herbs, and useful tools.','At sea, a sound rope can be worth more than a crown.','Examine each object and learn where it came from.'],repeat:['I found a few useful things in the harbor.']}
};
const ODYSSEUS_REPLIES = {
  calypso:[['일곱 해였소. 트로이의 기억은 멀어졌지만 페넬로페와 텔레마코스, 이타카의 해안은 아직 또렷하오.','Seven years. Troy has grown distant, but Penelope, Telemachus, and Ithaca remain clear.'],['페넬로페는 인간이라 늙겠지. 그래도 나는 영원한 낯선 섬보다 유한한 내 집을 선택하오.','Penelope is mortal and will age. Still, I choose my finite home over endless life on a foreign shore.'],['신의 말이라도 바다를 가볍게 믿을 수는 없소. 배도 동료도 없이 어떻게 떠나야 하오?','Even with a god’s command, I do not trust the sea lightly. How can I leave without ship or crew?'],['도끼와 천을 받겠소. 내 손으로 뗏목을 만들고 별을 따라 집으로 가겠소.','I will build the raft with my own hands and follow the stars home.']],
  nausicaa:[['두려워하지 마시오. 트로이에서 돌아가다 난파한 사람일 뿐이오.','Do not fear me. I am only a shipwrecked man returning from Troy.']], alcinous:[['먼저 베푼 환대를 잊지 않겠소. 이제 내 이름을 밝히리다.','I will not forget your hospitality. Now I will reveal my name.']], ciconian:[['승리에 취한 동료들을 너무 늦게 재촉했소. 지금 떠나야 하오.','I warned my men too late. We must leave now.']], lotus:[['집까지 잊는 평안은 내가 찾는 평안이 아니오.','Peace that erases home is not the peace I seek.']], polyphemus:[['손님을 잡아먹는 자에게 진짜 이름을 줄 수는 없지. 내 이름은 아무도다.','You do not deserve my true name. My name is Nobody.']], circe:[['동료를 돌려주면 칼을 거두겠소.','Restore my men and I will lower the sword.']], tiresias:[['경고를 기억하고 산 자들에게 전하겠소.','I will remember and carry the warning to the living.']], siren:[['듣고 싶기에 스스로를 묶겠소.','Because I wish to listen, I will bind myself.']], poseidon:[['파도를 읽으며 끝까지 견디겠소.','I will read the waves and endure.']], eurylochus:[['그 소를 베면 귀향 전체를 잃을 수 있소.','Killing those cattle may cost our whole homecoming.']], athena:[['힘을 숨기고 아들을 먼저 찾겠소.','I will hide my strength and find my son first.']], telemachus:[['이제 함께 집을 되찾자.','Now let us recover our house together.']], penelope:[['우리 둘만 아는 침대의 비밀이 증거가 될 것이오.','The secret of our bed will be the proof.']], muse:[['이름을 붙이고 기록하며 기억하겠소.','I will remember by naming and recording.']], trader:[['화려함보다 쓸모를 보겠소.','I will value usefulness over splendor.']]
};

/* 장별 배경 음악 */
const MUSIC = {
  ogygia: 'sea', scheria: 'court', cicones: 'tense', lotus: 'pastoral', cyclops: 'night',
  aeaea: 'pastoral', underworld: 'night', sirens: 'sea', thrinacia: 'pastoral', ithaca: 'court'
};

/* ==================== 상태 ==================== */
function fresh() {
  return {
    started: false, route: 'start', scene: 'ogygia', lang: 'ko',
    lv: 1, exp: 0, hp: 100, maxHp: 100, mp: 30, maxMp: 30,
    atk: 10, def: 6, wis: 8,
    stars: 0, gold: 20,
    items: {}, equip: { weapon: null, armor: null, relic: null },
    flags: {}, met: {}, talkCount: {}, quizDone: {}, quizRight: {},
    quests: {}, titles: [], chests: {}, spotSeen: {}, collections: {}, fastMove: false,
    log: [], seenScenes: { ogygia: true }, storySeen: {}, goalOpen: true,
    panelFold: {}, resolve: 70, training: { atk: 0, def: 0, wis: 0 }, minisDone: {}, miniFails: 0, quizSets: {}
  };
}
function migrateItemArtV2(){
  if(S.flags&&S.flags.itemArtV2)return;
  const grants={
    'ogy-main':['calypso_comb','sealed_provisions'],'ogy-s1':['penelope_shuttle'],'ogy-s2':['ithaca_seal'],
    'sch-main':['nausicaa_brooch'],'aea-s2':['aeolus_knot'],'und-s2':['anticleia_spindle'],
    'ith-main':['telemachus_horse'],'ith-s2':['eurycleia_lamp','laertes_knife']
  };
  for(const qid of Object.keys(grants))if(S.quests&&S.quests[qid]&&S.quests[qid].done)for(const id of grants[qid])S.items[id]=Math.max(1,S.items[id]||0);
  S.flags=S.flags||{};S.flags.itemArtV2=true;
}
let S = fresh();
let cam = { x: 0, y: 0 };
let P = { x: 0, y: 0, dir: 'down', anim: 0, moving: false };
let keys = {}, tick = 0, raf = 0;
let dialogue = null, quiz = null, battle = null, decision = null, shop = null, spotView = null, voyageGame = null, openingMovie = null;
let mapHintTimer = 0;
let autoPath = null, autoGoal = null;   /* 마우스 클릭 이동 경로 */
let mapCache = null;

const Store = {
  load() { try { const x = localStorage.getItem(SAVE_KEY); return x ? JSON.parse(x) : null; } catch (e) { return null; } },
  put(o) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(o)); } catch (e) { } }
};
let saveTimer = 0;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => Store.put(S), 300); }

/* ==================== 알림 연출 ==================== */
function toast(msg, kind) {
  const box = $('#toasts'); if (!box) return;
  const w = document.createElement('div');
  w.innerHTML = UI.toast(msg, kind);
  const e = w.firstElementChild;
  box.appendChild(e);
  /* 한 번에 3개까지만 — 그 이상은 화면을 가린다 */
  while (box.children.length > 3) box.removeChild(box.firstElementChild);
  setTimeout(() => e.remove(), 2400);
}
function celebrate(title, sub) {
  const e = document.createElement('div');
  e.className = 'fx-level';
  e.innerHTML = esc(title) + (sub ? '<span>' + esc(sub) + '</span>' : '');
  document.body.appendChild(e);
  setTimeout(() => e.remove(), 1700);
}
function logIt(t) { S.log.unshift({ t: Date.now(), text: t }); if (S.log.length > 120) S.log.length = 120; }

/* ==================== 성장 ==================== */
/* 성장 곡선 보정 ────────────────────────────────────────────────
   콘텐츠의 등급·레벨 구간은 퀴즈·퀘스트 보상만 계산해 만들어졌다.
   실제로는 결단·상자·대화·장 이동·전투 보상이 더 붙어 총량이 커지므로,
   구간의 "모양"은 그대로 두고 전체 배율만 실제 획득 가능량에 맞춘다.
   이렇게 해야 마지막 등급이 마지막 장에서 떨어진다. */
let RANK_SCALE = 1, EXP_SCALE = 1;
function calibrate() {
  let stars = 0, exp = 0, npcN = 0, chestN = 0;
  for (const k of ORDER) {
    for (const q of (CONTENT.QUIZ[k] || [])) {
      stars += (q.reward && q.reward.stars) || 2;
      exp += 6 + ((q.diff || 1) * 6);
    }
    for (const q of (CONTENT.QUESTS[k] || [])) {
      stars += (q.reward && q.reward.stars) || 0;
      exp += (q.reward && q.reward.exp) || 0;
    }
    for (const d of sceneDecisions(k)) {
      stars += (d.reward && d.reward.stars) || 5;
      exp += (d.reward && d.reward.exp) || 25;
    }
    npcN += SCENES[k].npcs.length;
    let c = 0;
    for (const row of (MAPS[k] ? MAPS[k].objects : [])) for (const ch of row) if (ch === 'x') c++;
    chestN += c;
  }
  const battles = Object.keys(SCENES).filter(k => SCENES[k].battle).length;
  stars += npcN * 2 + chestN * 1 + (ORDER.length - 1) * 5 + battles * 8;
  exp += npcN * 10 + chestN * 8 + (ORDER.length - 1) * 30 + battles * 45;
  const lastRank = CONTENT.RANKS[CONTENT.RANKS.length - 1].min || 1;
  const lastLv = CONTENT.LEVELS[CONTENT.LEVELS.length - 1].need || 1;
  RANK_SCALE = Math.max(1, (stars * 0.93) / lastRank);
  EXP_SCALE = Math.max(1, (exp * 0.96) / lastLv);
}
function rankNeed(x) { return Math.round(x.min * RANK_SCALE); }
function lvNeed(x) { return Math.round(x.need * EXP_SCALE); }
function rankOf() {
  let r = CONTENT.RANKS[0];
  for (const x of CONTENT.RANKS) if (S.stars >= rankNeed(x)) r = x;
  return r;
}
function levelInfo() {
  const L = CONTENT.LEVELS;
  let cur = L[0];
  for (const x of L) if (S.exp >= lvNeed(x)) cur = x;
  const next = L.find(x => lvNeed(x) > S.exp) || null;
  return { cur, next: next ? { ...next, need: lvNeed(next) } : null, curNeed: lvNeed(cur) };
}
function equipBonus() {
  const b = { atk: 0, def: 0, wis: 0, hp: 0 };
  for (const slot of ['weapon', 'armor', 'relic']) {
    const id = S.equip[slot]; if (!id) continue;
    const it = CONTENT.ITEMS[id]; if (!it || !it.stat) continue;
    b.atk += it.stat.atk || 0; b.def += it.stat.def || 0; b.wis += it.stat.wis || 0; b.hp += it.stat.hp || 0;
  }
  return b;
}
function totalStats() {
  const b = equipBonus();
  const t = S.training || { atk: 0, def: 0, wis: 0 };
  const mood = (S.resolve || 0) >= 70 ? 1 : ((S.resolve || 0) <= 25 ? -1 : 0);
  return { atk: Math.max(1, S.atk + b.atk + (t.atk || 0) + mood), def: Math.max(1, S.def + b.def + (t.def || 0)), wis: Math.max(1, S.wis + b.wis + (t.wis || 0) + mood), maxHp: S.maxHp + b.hp };
}
function setResolve(delta) { S.resolve = Math.max(0, Math.min(100, (S.resolve == null ? 70 : S.resolve) + delta)); }
const DIVINE_NAMES = {
  athena:['그리스','Athena','/əˈθiːnə/','로마','Minerva','/mɪˈnɜːrvə/'],
  poseidon:['그리스','Poseidon','/pəˈsaɪdən/','로마','Neptune','/ˈnɛptjuːn/']
};
function divineMeta(id) { const d = DIVINE_NAMES[id]; if (!d) return ''; return `<span class="divine-meta"><em>${d[0]}</em> ${esc(d[1])} ${esc(d[2])} · <em>${d[3]}</em> ${esc(d[4])} ${esc(d[5])}</span>`; }
const HD_CODEX_PORTRAITS = new Set(['odysseus','calypso','nausicaa','alcinous','ciconian','lotus','polyphemus','circe','tiresias','siren','poseidon','eurylochus','athena','telemachus','penelope','suitor','sailor']);
function portraitAsset(id) { return id === 'trader' ? 'assets/portrait-trader.jpg' : id === 'muse' ? 'assets/portrait-muse.jpg' : `assets/portrait-hd-${esc(id)}.jpg`; }
function hdPortrait(id, name = id, cls = 'pimg') {
  if (HD_CODEX_PORTRAITS.has(id) || id === 'trader' || id === 'muse') return `<img class="${cls}" src="${portraitAsset(id)}?v=hd-audit-20260813" alt="${esc(name)}">`;
  if (COMMON_ENCOUNTERS[id]) return `<img class="${cls} encounter-portrait" src="${COMMON_ENCOUNTERS[id].portrait}" alt="${esc(name)}">`;
  return `<canvas width="80" height="96" data-pt="${esc(id)}"></canvas>`;
}
function codexPortrait(id, name) {
  return hdPortrait(id, name, 'codex-hd');
}
const CHARACTER_RECORDS = {
  calypso:['섬꽃 · 진주 · 뗏목','오디세우스를 사랑해 불멸을 제안했지만, 신들의 명령에 따라 뗏목과 항해 준비를 도왔다.','안전하고 편안한 삶도 스스로 선택한 목적을 대신할 수는 없다.'],
  nausicaa:['접은 옷 · 강가 · 세탁 바구니','난파한 이방인을 두려워하면서도 보호하고 궁전으로 가는 길을 알려 준 파이아케스의 공주다.','환대는 낯선 이를 존중하면서도 안전하게 돕는 태도다.'],
  alcinous:['왕홀 · 환대의 잔 · 빠른 배','이름 모를 표류자를 먼저 먹이고 쉬게 한 뒤 사연을 듣고 이타카행 배를 내주었다.','좋은 지도자는 힘보다 규칙과 환대로 공동체의 품격을 보인다.'],
  ciconian:['말총 투구 · 원형 방패 · 창','오디세우스 일행이 승리 뒤에도 약탈을 멈추지 않자 지원군과 함께 반격한 키코네스 전사다.','승리 뒤의 탐욕과 지체는 이미 얻은 성과까지 잃게 한다.'],
  lotus:['푸른 연꽃 · 몽롱한 눈 · 연못','연꽃을 먹은 사람에게 고통뿐 아니라 고향으로 돌아갈 이유까지 잊게 하는 섬사람이다.','괴로운 기억을 피하려다 소중한 약속과 목표도 잊을 수 있다.'],
  polyphemus:['하나의 눈 · 양가죽 · 큰 몽둥이','동굴의 손님을 가두었지만 “아무도”라는 이름과 포도주, 양 떼를 이용한 계략에 속은 키클롭스다.','지혜는 힘을 이길 수 있지만 승리 뒤의 자만은 새 위험을 부른다.'],
  circe:['황금 지팡이 · 마법의 잔 · 몰리','선원들을 돼지로 바꾸지만 오디세우스와 화해한 뒤 저승과 세이렌 항로의 방법을 알려 준다.','유혹을 이긴 뒤에도 머물 때와 떠날 때를 판단해야 한다.'],
  tiresias:['눈먼 눈 · 지팡이 · 제의 그릇','저승에서 태양신의 소를 해치지 말라는 귀향의 조건과 이타카의 위험을 예언한다.','경고를 아는 것보다 배고픔과 충동 속에서도 지키는 일이 어렵다.'],
  siren:['새 날개 · 리라 · 난파선','모든 지식을 약속하는 노래로 항해자를 암초로 이끄는 존재다.','의지만 믿기보다 유혹이 오기 전에 안전장치를 만드는 편이 현명하다.'],
  poseidon:['삼지창 · 파도 · 말','아들 폴리페모스의 일로 오디세우스의 귀향을 방해하는 바다와 지진의 신이다.','자연은 인간의 계획을 넘어서는 힘이며 행동의 결과는 오래 남는다.'],
  eurylochus:['선원의 칼 · 붉은 망토 · 태양신의 소','위험을 먼저 의심하는 현실적인 부지휘관이지만 굶주림 앞에서는 금기를 깨도록 동료들을 설득한다.','합리적인 말처럼 들려도 두려움과 욕망이 판단을 이끄는지 살펴야 한다.'],
  athena:['볏 투구 · 올빼미 · 방패','오디세우스와 텔레마코스를 도와 이타카 귀환과 궁전 탈환의 계획을 세우는 지혜와 전략의 여신이다.','좋은 전략은 힘보다 정보와 협력, 알맞은 때를 중요하게 여긴다.'],
  telemachus:['젊은 활 · 짧은 창 · 이타카','아버지의 소식을 찾는 여행을 통해 성장하고 돌아온 오디세우스와 함께 궁전을 되찾는다.','성장은 두려움이 사라지는 것이 아니라 책임을 맡고 행동하는 과정이다.'],
  penelope:['베틀실 · 붉은 머리띠 · 활의 시험','낮에 짠 천을 밤에 풀어 구혼을 미루고, 침대의 비밀로 돌아온 남편의 정체를 확인한다.','기다림은 수동적인 일이 아니라 기억과 판단으로 삶을 지키는 지혜다.'],
  muse:['두루마리 · 리라 · 기억','무사이는 시와 노래, 역사와 춤, 천문을 맡아 인간이 배운 것을 기억하게 하는 아홉 여신이다.','Museum은 본래 “무사이의 집”에서 온 말이다. 이야기를 기록하는 일도 배움의 일부다.'],
  trader:['등잔 · 밧줄 · 여행 도구','에게해의 섬과 항구를 오가며 항해자에게 평범하지만 꼭 필요한 물건을 파는 인간 상인이다.','신화의 영웅도 생활 도구와 평범한 사람들의 도움 없이는 여행을 이어 갈 수 없다.']
};
function itemDisplayName(it) { const gear = ['weapon','armor','relic'].includes(it.kind); return gear && (it.rarity || 0) >= 3 ? '◆ 신화급 · ' + it.name : it.name; }
const ITEM_LORE = {
  aeolus_compass:'아이올로스는 바람을 관리하는 존재다. 《오디세이아》 10권에서 바람을 자루에 봉해 오디세우스에게 주지만, 동료들이 자루를 열어 배는 다시 밀려난다. 나침반은 이 사건을 바탕으로 만든 게임의 상징 유물이다.',
  ino_veil:'바다의 여신 이노, 곧 레우코테아가 난파한 오디세우스에게 준 베일이다. 그는 뗏목이 완전히 부서진 뒤 베일을 두르고 헤엄쳐 살아난다.',
  wind_bag:'아이올로스가 귀향에 필요한 바람만 남기고 나머지를 가둔 자루다. 오해와 불신 때문에 고향을 눈앞에 두고 다시 멀어진 사건을 보여 준다.',
  moly:'헤르메스가 키르케의 마법을 막으라고 준 검은 뿌리와 흰 꽃의 약초다. 신에게는 뽑기 쉽지만 인간에게는 어렵다고 시인은 설명한다.',
  great_bow:'오디세우스만 쉽게 시위를 걸 수 있는 큰 활이다. 페넬로페의 활쏘기 시험에서 왕의 정체와 숙련을 증명하는 물건이 된다.',
  olive_bed_post:'오디세우스가 살아 있는 올리브나무를 기둥 삼아 만든 침대의 일부다. 부부만 아는 비밀이어서 최종 귀향의 신원 증거가 된다.'
};
function openItemRecord(id){const it=CONTENT.ITEMS[id];if(!it)return;const lore=ITEM_LORE[id]||'이 물건은 《오디세이아》의 항해, 환대, 금기, 가족과 귀향의 기억에 연결된다. 물건의 모습과 쓰임을 살피며 어느 사건에서 중요한 역할을 했는지 기억해 보자.';const ov=$('#overlay');spotView={item:id};ov.hidden=false;ov.innerHTML='<div class="modal">'+UI.win('신화 유물 기록 · '+itemDisplayName(it),`<div class="artifact-sheet">${itemArt(id)?`<div class="artifact-hero item-record-hero" style="background-image:url('${esc(itemArt(id))}')"><div class="artifact-title"><h2>${esc(it.name)}</h2><div>오디세이아 항해 수집품</div></div></div>`:''}<div class="artifact-body"><div>${itemVisual(id,'artifact-object item-record-object')}</div><div class="artifact-story"><h3>${esc(it.name)}</h3><p>${esc(it.desc)}</p><div class="learning-points"><section><b>이야기 속 배경</b>${esc(lore)}</section><section><b>게임 효과</b>${esc(it.effect||it.desc)}</section></div></div></div><footer class="artifact-footer"><p>희귀도 · ${it.rarity||0}/3</p>${UI.btn('기록 닫기',{id:'itemRecordClose',cls:'btn--pri'})}</footer></div>`,{tone:'gold'})+'</div>';paintIcons();$('#itemRecordClose').onclick=()=>{spotView=null;renderOverlay()}}
function showItemDiscovery(id){const it=CONTENT.ITEMS[id],src=itemArt(id);if(!it||!src)return;const e=document.createElement('div');e.className='fx-item-discovery';e.innerHTML=`<div><img src="${esc(src)}" alt=""><span>새로운 소지품</span><b>${esc(it.name)}</b><small>${esc(it.desc)}</small></div>`;document.body.appendChild(e);setTimeout(()=>e.classList.add('out'),2200);setTimeout(()=>e.remove(),2700)}
function gainExp(n) {
  const before = levelInfo().cur.lv;
  S.exp += n;
  const after = levelInfo().cur;
  if (after.lv > before) {
    S.lv = after.lv; S.maxHp = after.hp; S.maxMp = after.mp;
    S.hp = S.maxHp; S.mp = S.maxMp;
    S.atk += 3; S.def += 2; S.wis += 3;
    celebrate('LEVEL UP  Lv.' + after.lv, '최대 HP ' + after.hp + ' · 힘과 지혜가 올랐다');
    logIt('레벨이 ' + after.lv + '이 되었다');
  }
}
function gainStars(n) {
  const before = rankOf();
  S.stars += n;
  const after = rankOf();
  if (after.name !== before.name) {
    celebrate('등급 상승 · ' + after.name, after.desc || '');
    logIt('등급이 「' + after.name + '」(으)로 올랐다');
  }
}
function giveItem(id, qty) {
  const it = CONTENT.ITEMS[id]; if (!it) return;
  const first = !(S.items[id] > 0);
  S.items[id] = (S.items[id] || 0) + (qty || 1);
  toast(it.name + ' 획득', 'gold');
  logIt(it.name + '을(를) 얻었다');
  if (first && itemArt(id)) showItemDiscovery(id);
  if (first && (it.rarity || 0) >= 3 && ['weapon','armor','relic'].includes(it.kind)) {
    AUDIO.sfx('level');
    celebrate('신화급 아이템 발견', it.name + ' · ' + (it.effect || it.desc));
    logIt('신화급 아이템 · ' + it.name);
  }
  autoEquip(id);
}
function autoEquip(id) {
  const it = CONTENT.ITEMS[id];
  if (!it || !it.stat) return;
  const slot = it.kind === 'weapon' ? 'weapon' : it.kind === 'armor' ? 'armor' : it.kind === 'relic' ? 'relic' : null;
  if (!slot) return;
  const cur = S.equip[slot] ? CONTENT.ITEMS[S.equip[slot]] : null;
  const score = x => x && x.stat ? (x.stat.atk || 0) + (x.stat.def || 0) + (x.stat.wis || 0) + (x.stat.hp || 0) / 10 : -1;
  if (score(it) > score(cur)) {
    S.equip[slot] = id;
    toast(it.name + ' 장착 · 능력치 상승', 'good');
  }
}
function giveTitle(id) {
  if (S.titles.includes(id)) return;
  S.titles.push(id);
  const t = (CONTENT.TITLES || []).find(x => x.id === id);
  celebrate('칭호 획득', t ? t.name : id);
}

/* ==================== 퀘스트 ==================== */
function sceneQuests(sc) { return (CONTENT.QUESTS && CONTENT.QUESTS[sc]) || []; }
function allQuests() { const out = []; for (const k of ORDER) out.push(...sceneQuests(k).map(q => ({ ...q, scene: k }))); return out; }
function qState(id) { return S.quests[id] || (S.quests[id] = { done: false, steps: {} }); }
function stepDone(check, sc) {
  const [kind, arg] = String(check).split(':');
  if (kind === 'talk') return !!S.met[arg];
  if (kind === 'quiz') return (S.quizRight[sc || S.scene] || 0) >= Number(arg);
  if (kind === 'item') return (S.items[arg] || 0) > 0;
  if (kind === 'flag') return !!S.flags[arg];
  return false;
}
function checkQuests() {
  let changed = false;
  for (const q of sceneQuests(S.scene)) {
    const st = qState(q.id);
    if (st.done) continue;
    let all = true;
    const newly = [];
    for (const s of (q.steps || [])) {
      const ok = stepDone(s.check);
      if (ok && !st.steps[s.id]) { st.steps[s.id] = true; changed = true; newly.push(s.text); }
      if (!ok) all = false;
    }
    /* 스텝이 한꺼번에 여러 개 채워져도 알림은 한 줄로 묶는다 */
    if (newly.length && !all) toast(newly.length === 1 ? '진행 · ' + newly[0] : '진행 · ' + newly[0] + ' 외 ' + (newly.length - 1) + '건', 'good');
    if (all && (q.steps || []).length) {
      st.done = true; changed = true;
      const r = q.reward || {};
      gainStars(r.stars || 0);
      S.gold += r.gold || 0;
      (r.items || []).forEach(i => giveItem(i));
      if (r.title) giveTitle(r.title);
      gainExp(r.exp || 0);
      celebrate('퀘스트 완료', q.title);
      logIt('퀘스트 완료 — ' + q.title);
      if (q.type === 'main') S.flags['main_' + S.scene] = true;
    }
  }
  if (changed) { save(); if (S.route === 'map') renderPanel(); }
  return changed;
}
function mainDone(sc) {
  const m = sceneQuests(sc).find(q => q.type === 'main');
  return m ? !!(S.quests[m.id] && S.quests[m.id].done) : true;
}

/* ==================== 맵 ==================== */
function buildMap(sceneKey) {
  const m = MAPS[sceneKey];
  const solid = [];
  for (let y = 0; y < MAPH; y++) {
    solid[y] = [];
    for (let x = 0; x < MAPW; x++) solid[y][x] = TILES.solid(m.ground[y][x]);
  }
  const props = [];
  for (let y = 0; y < MAPH; y++) for (let x = 0; x < MAPW; x++) {
    const ch = m.objects[y][x];
    if (ch === '.' || ch === ' ') continue;
    props.push({ ch, tx: x, ty: y });
    for (const [dx, dy] of (PROPS.foot(ch) || [])) {
      const ax = x + dx, ay = y + dy;
      if (ax >= 0 && ay >= 0 && ax < MAPW && ay < MAPH) solid[ay][ax] = true;
    }
  }
  props.sort((a, b) => a.ty - b.ty);
  const chests = props.filter(p => p.ch === 'x').map((p, i) => ({ ...p, key: sceneKey + ':' + i }));
  // NPC·출구·시작 지점 주변은 항상 지나갈 수 있게 열어 둔다
  const openAt = (tx, ty) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const ax = tx + dx, ay = ty + dy; if (ax >= 0 && ay >= 0 && ax < MAPW && ay < MAPH && !TILES.solid(m.ground[ay][ax])) solid[ay][ax] = false; } };
  openAt(m.spawn[0], m.spawn[1]);
  (m.slots || []).forEach(s => openAt(s[0], s[1]));
  openAt(m.exit[0], m.exit[1]);
  return { scene: sceneKey, ground: m.ground, objects: m.objects, solid, props, chests, meta: m };
}
function ensureMap() { if (!mapCache || mapCache.scene !== S.scene) mapCache = buildMap(S.scene); return mapCache; }
function solidAt(px, py) {
  const tx = Math.floor(px / T), ty = Math.floor(py / T);
  if (tx < 0 || ty < 0 || tx >= MAPW || ty >= MAPH) return true;
  return ensureMap().solid[ty][tx];
}
function npcList() {
  const m = ensureMap();
  return SCENES[S.scene].npcs.map((id, i) => {
    const slot = (m.meta.slots && m.meta.slots[i]) || m.meta.spawn;
    return { id, ...NPCS[id], tx: slot[0], ty: slot[1], x: slot[0] * T + T / 2, y: slot[1] * T + T };
  });
}
function chestList() { return ensureMap().chests.map(c => ({ ...c, x: c.tx * T + T / 2, y: c.ty * T + T })); }
function sceneChestItems(sc) {
  const want = [];
  for (const q of sceneQuests(sc)) {
    for (const s of (q.steps || [])) {
      const [k, a] = String(s.check).split(':');
      if (k === 'item' && CONTENT.ITEMS[a] && !want.includes(a)) want.push(a);
    }
    for (const it of ((q.reward && q.reward.items) || [])) if (CONTENT.ITEMS[it] && !want.includes(it)) want.push(it);
  }
  return want;
}
function exitPos() { const m = ensureMap(); return { tx: m.meta.exit[0], ty: m.meta.exit[1], x: m.meta.exit[0] * T + T / 2, y: m.meta.exit[1] * T + T }; }

/* ==================== 카메라·렌더 ==================== */
function updateCam() {
  cam.x = clamp(Math.round(P.x - CW / 2), 0, MAPW * T - CW);
  cam.y = clamp(Math.round(P.y - CH / 2 - 8), 0, MAPH * T - CH);
}
const LIGHT = { day: null, dusk: ['#6e2325', 0.20], cave: ['#0b0812', 0.40], under: ['#20122d', 0.36], sun: ['#eec358', 0.12], sea: ['#0f3f56', 0.14] };
function neighOf(g, x, y) {
  const at = (a, b) => g[clamp(b, 0, MAPH - 1)][clamp(a, 0, MAPW - 1)];
  return { n: at(x, y - 1), s: at(x, y + 1), e: at(x + 1, y), w: at(x - 1, y), ne: at(x + 1, y - 1), nw: at(x - 1, y - 1), se: at(x + 1, y + 1), sw: at(x - 1, y + 1) };
}
function drawTreasureChest(g, p, opened) {
  if (!TREASURE_CHESTS_HD || !TREASURE_CHESTS_HD.complete || !TREASURE_CHESTS_HD.naturalWidth) return false;
  const cx = p.tx * T + T / 2, by = p.ty * T + T;
  const src = opened ? { x:388, y:12, w:365, h:475, dw:28, dh:36 } : { x:16, y:65, w:360, h:420, dw:26, dh:30 };
  PX.shadow(g, cx, by, opened ? 11 : 10, 2, opened ? 0.20 : 0.30);
  g.save(); g.imageSmoothingEnabled = true;
  g.drawImage(TREASURE_CHESTS_HD, src.x, src.y, src.w, src.h, Math.round(cx - src.dw / 2), Math.round(by - src.dh), src.dw, src.dh);
  g.restore();
  return true;
}
function drawFrame() {
  const c = $('#map'); if (!c) return;
  const g = c.getContext('2d');
  /* 논리 좌표는 유지하되 2배 내부 해상도로 그려 축소 시 거친 계단을 줄인다. */
  const renderScale = c.width / CW;
  g.setTransform(renderScale, 0, 0, renderScale, 0, 0);
  g.imageSmoothingEnabled = false;
  const m = ensureMap();
  const frame = (tick >> 4) & 3;
  updateCam();

  const x0 = Math.floor(cam.x / T), y0 = Math.floor(cam.y / T);
  g.save();
  g.translate(-cam.x, -cam.y);

  for (let y = y0; y <= y0 + VIEWH; y++) {
    if (y < 0 || y >= MAPH) continue;
    for (let x = x0; x <= x0 + VIEWW; x++) {
      if (x < 0 || x >= MAPW) continue;
      TILES.draw(g, m.ground[y][x], x * T, y * T, x, y, frame, neighOf(m.ground, x, y));
    }
  }

  const draws = [];
  for (const p of m.props) {
    if (p.tx < x0 - 4 || p.tx > x0 + VIEWW + 4 || p.ty < y0 - 4 || p.ty > y0 + VIEWH + 3) continue;
    let opened = false;
    if (p.ch === 'x') { const c = m.chests.find(q => q.tx === p.tx && q.ty === p.ty); opened = !!(c && S.chests[c.key]); }
    draws.push({
      y: p.ty * T + T, f: () => {
        if (p.ch === 'x' && drawTreasureChest(g, p, opened)) return;
        /* 이미 연 상자는 흐리게 그려 "가져갔다"는 것을 보여 준다 */
        if (opened) { g.save(); g.globalAlpha = 0.45; PROPS.draw(g, p.ch, p.tx, p.ty, frame); g.restore(); }
        else PROPS.draw(g, p.ch, p.tx, p.ty, frame);
      }
    });
  }
  for (const n of npcList()) draws.push({ y: n.y, f: () => SPRITES.draw(g, n.id, npcFacing(n), (tick >> 5) & 3, n.x, n.y) });
  /* 이전에는 4프레임 한 주기 동안 약 50px을 이동해 발보다 지면이 먼저
     미끄러졌다. 2틱마다 프레임을 바꾸면 보통 속도에서 한 보행 주기가
     약 13px이 되어 32px 캐릭터의 보폭과 맞는다. */
  const walkFrame = P.moving ? ((P.anim >> 1) & 3) : 0;
  const passing = P.moving && (walkFrame === 1 || walkFrame === 3);
  const walkMotion = P.moving ? {
    bob: passing ? -1 : 0,
    sway: (P.dir === 'up' || P.dir === 'down') ? (walkFrame === 1 ? -1 : walkFrame === 3 ? 1 : 0) : 0
  } : null;
  draws.push({ y: P.y, f: () => SPRITES.draw(g, 'odysseus', P.dir, walkFrame, Math.round(P.x), Math.round(P.y), walkMotion) });
  draws.sort((a, b) => a.y - b.y);
  draws.forEach(d => { try { d.f(); } catch (e) { } });

  const ex = exitPos(), open = mainDone(S.scene), bob = Math.round(Math.sin(tick * 0.08) * 2);
  PX.rect(g, ex.tx * T + 3, ex.ty * T - 8 + bob, 10, 2, open ? PAL.gd3 : PAL.st2);
  PX.rect(g, ex.tx * T + 5, ex.ty * T - 12 + bob, 6, 4, open ? PAL.gd4 : PAL.st3);
  PX.rect(g, ex.tx * T + 6, ex.ty * T - 16 + bob, 4, 4, open ? PAL.gd2 : PAL.st1);
  g.restore();

  const li = LIGHT[m.meta.light];
  if (li) { g.save(); g.globalAlpha = li[1]; g.fillStyle = li[0]; g.fillRect(0, 0, CW, CH); g.restore(); }
  if (m.meta.light === 'cave' || m.meta.light === 'under') {
    const sx = P.x - cam.x, sy = P.y - cam.y - 12;
    const rg = g.createRadialGradient(sx, sy, 12, sx, sy, 118);
    rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(6,4,12,0.58)');
    g.fillStyle = rg; g.fillRect(0, 0, CW, CH);
  }
  drawLabels();
}
function npcFacing(n) {
  const dx = P.x - n.x, dy = P.y - n.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}
function drawLabels() {
  const layer = $('#labels'); if (!layer) return;
  const near = nearestTarget();
  let html = '';
  /* Characters are recognized by approaching and speaking; permanent name
     plates covered the new sprites. Only the nearby E prompt is retained. */
  for (const sp of spotList()) {
    const sx = (sp.x - cam.x) / CW * 100, sy = (sp.y - cam.y + 24) / CH * 100;
    if (sx < -6 || sx > 106 || sy < -6 || sy > 106) continue;
    const seen = S.spotSeen[sp.key];
    html += `<span class="nametag spotg" style="left:${sx}%;top:${sy}%">${sp.art ? '🖼' : (seen ? '✔' : '🔍')} ${esc(sp.name)}</span>`;
  }
  const ex = exitPos();
  const esx = (ex.x - cam.x) / CW * 100, esy = (ex.y - cam.y - 24) / CH * 100;
  if (esx > -6 && esx < 106 && esy > -6 && esy < 106) {
    const open = mainDone(S.scene);
    html += `<span class="nametag exit${open ? ' on' : ''}" style="left:${esx}%;top:${esy}%">${open ? '▶ ' + esc(sceneText(S.scene).exitLabel) : L('자물쇠 · 잠김','Locked')}</span>`;
  }
  for (const ch of chestList()) {
    if (S.chests[ch.key]) continue;
    const sx = (ch.x - cam.x) / CW * 100, sy = (ch.y - cam.y + 10) / CH * 100;
    if (sx < -6 || sx > 106 || sy < -6 || sy > 106) continue;
    html += `<span class="nametag chest" style="left:${sx}%;top:${sy}%">${L('보물','Treasure')}</span>`;
  }
  if (near && near.d < 30) {
    const sx = (P.x - cam.x) / CW * 100, sy = (P.y - cam.y - 44) / CH * 100;
    const label = near.kind === 'npc' ? (near.o.shop ? L('가게','Shop') : L('대화','Talk')) : near.kind === 'chest' ? L('열기','Open') : near.kind === 'spot' ? L('살펴보기','Examine') : L('이동','Travel');
    html += `<span class="prompt" style="left:${sx}%;top:${sy}%">E · ${label}</span>`;
  }
  layer.innerHTML = html;
}

/* ==================== 이동·상호작용 ==================== */
function placePlayer() {
  const m = ensureMap();
  P.x = m.meta.spawn[0] * T + T / 2;
  P.y = m.meta.spawn[1] * T + T;
  P.dir = 'down'; P.anim = 0;
  updateCam();
}
function canStand(px, py) {
  return !solidAt(px - 4, py - 3) && !solidAt(px + 4, py - 3) && !solidAt(px - 4, py - 1) && !solidAt(px + 4, py - 1);
}
function cancelAuto() { autoPath = null; autoGoal = null; }
function stepMove() {
  if (dialogue || quiz || battle || shop || spotView || SYSTEM.active()) { P.moving = false; return; }
  let dx = 0, dy = 0;
  const manual = keys.left || keys.right || keys.up || keys.down;
  if (manual) cancelAuto();
  if (keys.left) dx--; if (keys.right) dx++; if (keys.up) dy--; if (keys.down) dy++;
  /* 마우스 클릭 경로를 따라 자동 이동 */
  if (!manual && autoPath && autoPath.length) {
    const [tx, ty] = autoPath[0];
    const cx = tx * T + T / 2, cy = ty * T + T - 2;
    dx = cx - P.x; dy = cy - P.y;
    if (Math.hypot(dx, dy) < 2.2) {
      autoPath.shift();
      if (!autoPath.length) {
        const goal = autoGoal;
        cancelAuto();
        if (goal) { const d = Math.hypot(goal.x - P.x, goal.y - (P.y - 8)); if (d < 34) interactWith(goal); }
        P.moving = false; P.anim = 0;
        return;
      }
      return;
    }
  }
  P.moving = !!(dx || dy);
  if (!P.moving) { P.anim = 0; return; }
  P.anim++;
  const len = Math.hypot(dx, dy), sp = S.fastMove ? 2.4 : 1.6;
  const nx = P.x + dx / len * sp, ny = P.y + dy / len * sp;
  if (canStand(nx, P.y)) P.x = nx;
  if (canStand(P.x, ny)) P.y = ny;
  P.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
}
/* BFS 경로 탐색 — 목적지가 막혀 있으면 도달 가능한 가장 가까운 칸까지 */
function findPath(sx, sy, gx, gy) {
  const m = ensureMap();
  const seen = Array.from({ length: MAPH }, () => new Array(MAPW).fill(false));
  const prev = {};
  const qx = [sx], qy = [sy];
  seen[sy][sx] = true;
  let best = null, bestD = Infinity;
  while (qx.length) {
    const x = qx.shift(), y = qy.shift();
    const d = Math.abs(x - gx) + Math.abs(y - gy);
    if (d < bestD) { bestD = d; best = [x, y]; }
    if (x === gx && y === gy) break;
    for (const [ddx, ddy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ax = x + ddx, ay = y + ddy;
      if (ax < 0 || ay < 0 || ax >= MAPW || ay >= MAPH || seen[ay][ax] || m.solid[ay][ax]) continue;
      seen[ay][ax] = true;
      prev[ax + ',' + ay] = [x, y];
      qx.push(ax); qy.push(ay);
    }
  }
  if (!best || bestD > 3 && !(best[0] === gx && best[1] === gy)) { if (!best || bestD > 3) return null; }
  const path = [];
  let cur = best;
  while (cur && !(cur[0] === sx && cur[1] === sy)) {
    path.unshift(cur);
    cur = prev[cur[0] + ',' + cur[1]];
  }
  return path.length ? path : null;
}
function spotList() {
  return ((CONTENT.SPOTS && CONTENT.SPOTS[S.scene]) || []).map(sp => ({
    ...sp, name:spotName(sp.name), tx: sp.at[0], ty: sp.at[1],
    x: sp.at[0] * T + T / 2, y: sp.at[1] * T + T,
    key: S.scene + ':' + sp.at.join(',')
  }));
}
function nearestTarget() {
  const list = [];
  npcList().forEach(n => list.push({ kind: 'npc', o: n, x: n.x, y: n.y - 8 }));
  chestList().forEach(c => { if (!S.chests[c.key]) list.push({ kind: 'chest', o: c, x: c.x, y: c.y - 6 }); });
  spotList().forEach(sp => list.push({ kind: 'spot', o: sp, x: sp.x, y: sp.y - 6 }));
  const ex = exitPos(); list.push({ kind: 'exit', o: ex, x: ex.x, y: ex.y - 6 });
  let best = null;
  for (const o of list) { const d = Math.hypot(o.x - P.x, o.y - (P.y - 8)); if (!best || d < best.d) best = { ...o, d }; }
  return best;
}
function interactWith(t) {
  if (t.kind === 'npc') startDialogue(t.o);
  else if (t.kind === 'chest') openChest(t.o);
  else if (t.kind === 'spot') openSpot(t.o);
  else if (t.kind === 'exit') tryExit();
}
function interact() {
  if (typeof AUDIO !== 'undefined') AUDIO.unlock();
  if (SYSTEM.active()) return;
  if (dialogue) { nextDialogue(); return; }
  if (quiz || battle || shop || spotView || voyageGame) return;
  const n = nearestTarget();
  if (!n || n.d > 30) { showMsg('가까이 다가가서 E를 누르세요.'); return; }
  interactWith(n);
}
/* 마우스 클릭: 대상 클릭 → 걸어가서 상호작용 / 빈 곳 클릭 → 그 자리로 이동 */
function mapClick(ev) {
  if (typeof AUDIO !== 'undefined') AUDIO.unlock();
  if (SYSTEM.active()) return;
  if (dialogue) { nextDialogue(); return; }
  if (quiz || battle || shop || spotView || voyageGame) return;
  const cvs = $('#map'); if (!cvs) return;
  const r = cvs.getBoundingClientRect();
  const mx = (ev.clientX - r.left) / r.width * CW + cam.x;
  const my = (ev.clientY - r.top) / r.height * CH + cam.y;
  /* 클릭 지점 근처의 대상 찾기 */
  const cands = [];
  npcList().forEach(n => cands.push({ kind: 'npc', o: n, x: n.x, y: n.y - 8, tx: n.tx, ty: n.ty, py: n.y - 13 }));
  chestList().forEach(c => { if (!S.chests[c.key]) cands.push({ kind: 'chest', o: c, x: c.x, y: c.y - 6, tx: c.tx, ty: c.ty, py: c.y - 6 }); });
  spotList().forEach(sp => cands.push({ kind: 'spot', o: sp, x: sp.x, y: sp.y - 6, tx: sp.tx, ty: sp.ty, py: sp.y - 8 }));
  const ex = exitPos();
  cands.push({ kind: 'exit', o: ex, x: ex.x, y: ex.y - 6, tx: ex.tx, ty: ex.ty, py: ex.y - 6 });
  let best = null;
  for (const c of cands) {
    const d = Math.hypot(c.x - mx, c.py - my);
    if (d < 17 && (!best || d < best.d)) best = { ...c, d };
  }
  const ptx = clamp(Math.floor(P.x / T), 0, MAPW - 1), pty = clamp(Math.floor((P.y - 2) / T), 0, MAPH - 1);
  if (best) {
    const near = Math.hypot(best.x - P.x, best.y - (P.y - 8));
    if (near < 30) { cancelAuto(); interactWith(best); return; }
    const path = findPath(ptx, pty, best.tx, best.ty);
    if (path) { autoPath = path; autoGoal = best; }
    return;
  }
  const tx = clamp(Math.floor(mx / T), 0, MAPW - 1), ty = clamp(Math.floor(my / T), 0, MAPH - 1);
  const path = findPath(ptx, pty, tx, ty);
  if (path) { autoPath = path; autoGoal = null; }
}
/* 이 장의 퀘스트가 요구하는 아이템 중, 아직 갖지 않은 첫 번째 */
function nextNeededItem() { return sceneChestItems(S.scene).find(id => !(S.items[id] > 0)) || null; }
function unopenedChests() { return ensureMap().chests.filter(c => !S.chests[c.key]).length; }
function openChest(c) {
  S.chests[c.key] = true;
  AUDIO.sfx('chest');
  const critical = S.scene === 'ogygia' ? new Set(['bronze_axe','sail_cloth','raft_log']) : null;
  const id = sceneChestItems(S.scene).find(x => !(S.items[x] > 0) && !(critical && critical.has(x))) || null;
  if (id) giveItem(id);
  else { const g = 15 + Math.floor(Math.random() * 4) * 5; S.gold += g; toast(L('상자에서 ','Found ') + g + L(' 드라크마를 찾았다',' drachma in the chest'), 'gold'); }
  gainStars(1); gainExp(8);
  showMsg(L('보물함을 열었다.','You opened the treasure chest.'));
  save(); checkQuests(); renderPanel(); renderTop();
}

/* ==================== 대화 ==================== */
function startDialogue(n) {
  AUDIO.sfx('talk');
  const first = !S.met[n.id];
  S.met[n.id] = true;
  S.talkCount[n.id] = (S.talkCount[n.id] || 0) + 1;
  const localized = isEn() ? (NPC_EN[n.id] || n) : n;
  const lines = first ? localized.lines : localized.repeat;
  const replies = ODYSSEUS_REPLIES[n.id] || [];
  const turns = [];
  lines.forEach((text, i) => {
    turns.push({ speaker:n.id, text });
    if (replies[i]) turns.push({ speaker:'odysseus', text:isEn() ? replies[i][1] : replies[i][0] });
  });
  dialogue = { npc: n, lines: turns, i: 0, first };
  if (first) {
    gainStars(2); gainExp(10);
    logIt(n.name + '와(과) 처음 대화했다');
    toast('인물 기록 해금 · ' + n.name, 'good');
  }
  renderDialogue();
  checkQuests();
  save();
}
function nextDialogue() {
  if (!dialogue) return;
  dialogue.i++;
  AUDIO.sfx('talk');
  if (dialogue.i < dialogue.lines.length) { renderDialogue(); return; }
  const npc = dialogue.npc;
  const first = dialogue.first;
  dialogue = null;
  renderDialogue();
  /* Calypso gives the actual raft-building tools only after the complete
     two-way Book 5 conversation. Chests can no longer bypass this gate. */
  if (first && npc.id === 'calypso') {
    if (!S.items.bronze_axe) giveItem('bronze_axe');
    if (!S.items.sail_cloth) giveItem('sail_cloth');
    showMsg(L('칼립소가 청동 도끼와 돛 천을 건넸습니다. 이제 항해 시련에서 뗏목을 완성하세요.','Calypso gave you a bronze axe and sailcloth. Complete the sailing trial to finish the raft.'));
    checkQuests(); save();
  }
  /* 무사이는 힌트, 상인은 가게, 나머지는 시험으로 이어진다 */
  if (npc.shop) { openShop(); return; }
  if (npc.hint) {
    const q = pickQuiz();
    if (q) { const lq = localizedQuiz(q); showMapHint(lq.hint); logIt(L('무사이의 귀띔을 들었다','Received a clue from the Muse')); return; }
  }
  const q = pickQuiz();
  if (q) setTimeout(() => openQuiz(q, npc), 200);
  else showMsg('이 장의 시험을 모두 마쳤습니다. 다음 장소로 갈 준비를 하세요.');
}
/* 초상화가 없는 인물(무사이·상인)은 스프라이트를 확대한 흉상으로 대신한다 */
function drawPortraitInto(cv, id) {
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  if (PORTRAITS.IDS && PORTRAITS.IDS.indexOf(id) >= 0) {
    try { PORTRAITS.draw(g, id, 0, 0); return; } catch (e) { }
  }
  PX.rect(g, 0, 0, 80, 96, PAL.ink1);
  PX.vgrad(g, 3, 3, 74, 90, PX.mix(PAL.ink2, PAL.pu0, 0.4), PAL.ink1);
  PX.frameRect(g, 1, 1, 78, 94, PAL.gd1);
  try {
    g.save();
    g.translate(40, 90);
    g.scale(3, 3);
    SPRITES.draw(g, id, 'down', 0, 0, 0);
    g.restore();
  } catch (e) { }
}
const COMMON_ENCOUNTERS = {
  muse: {
    scene:'assets/encounter-muse.jpg', portrait:'assets/portrait-muse.jpg',
    title:'무사이의 샘 · 이야기와 기억',
    note:'무사이(Mousai)는 시·노래·역사·천문 등 학문과 예술을 맡은 아홉 여신입니다. 영어 Muse와 Museum이라는 말도 이 이름에서 이어졌습니다.'
  },
  trader: {
    scene:'assets/encounter-trader.jpg', portrait:'assets/portrait-trader.jpg',
    title:'항구 시장 · 떠돌이 상인의 좌판',
    note:'섬과 항구를 오가며 등잔, 밧줄, 약초와 여행 도구를 파는 평범한 인간 상인입니다. 귀한 물건의 쓰임과 유래도 들려줍니다.'
  }
};
function encounterPortrait(id) {
  const e = COMMON_ENCOUNTERS[id];
  return e ? `<img class="encounter-portrait" src="${e.portrait}" alt="${esc(NPCS[id].name)}">` : hdPortrait(id, NPCS[id] ? NPCS[id].name : id, 'encounter-portrait');
}
function renderDialogue() {
  const box = $('#dlg'); if (!box) return;
  if (!dialogue) { box.className = 'dlgwrap'; box.innerHTML = ''; return; }
  const n = dialogue.npc;
  const turn = dialogue.lines[dialogue.i];
  const speakerId = turn.speaker;
  const speakerKo = speakerId === 'odysseus' ? {name:'오디세우스',role:'이타카로 돌아가는 왕'} : NPCS[speakerId];
  const speakerEn = speakerId === 'odysseus' ? {name:'Odysseus',role:'King returning to Ithaca'} : (NPC_EN[speakerId] || speakerKo);
  const speaker = isEn() ? speakerEn : speakerKo;
  const last = dialogue.i >= dialogue.lines.length - 1;
  const brief = (typeof ODYSSEY_BRIEFING !== 'undefined' && ODYSSEY_BRIEFING[S.scene]) || {};
  const common = COMMON_ENCOUNTERS[n.id];
  const sceneArt = common ? common.scene : (brief.art || 'assets/odyssey-title-keyart-hd.jpg');
  const sceneTitle = common ? common.title : SCENES[S.scene].title;
  box.className = 'dlgwrap conversation show';
  box.innerHTML = `<article class="conversation-dialog"><header class="conversation-head"><div><h3>${esc(isEn() ? sceneText(S.scene).title : sceneTitle)}</h3><small>${common ? esc(common.note) : esc(sceneText(S.scene).sub) + ' · ' + L('현장 대화 기록','Conversation record')}</small></div><b>${String(dialogue.i + 1).padStart(2,'0')} / ${String(dialogue.lines.length).padStart(2,'0')}</b></header><div class="conversation-scene" style="background-image:url('${esc(sceneArt)}')"><div class="conversation-focus">${encounterPortrait(speakerId)}<div class="speaker-dialogue"><b>${esc(speaker.name)}</b><small>${esc(speaker.role)}</small><p>${esc(turn.text)}</p></div></div></div><div class="conversation-actions">${UI.btn(last ? L('대화 마침 ▶','Finish conversation ▶') : L('다음 ▶','Next ▶'), { id:'conversationNext', cls:'btn--pri btn--big' })}</div></article>`;
  paintPortraits();
  const b = box.querySelector('#conversationNext'); if (b) b.onclick = nextDialogue;
}

/* ==================== 살펴보기 · 명화 감상 ==================== */
function openSpot(sp) {
  const collectible = COLLECTIONS.find(c => c.scene === S.scene && c.at[0] === sp.tx && c.at[1] === sp.ty);
  const newly = !!(collectible && !S.collections[collectible.id]);
  if (collectible) S.collections[collectible.id] = true;
  spotView = { sp, collectible, newly };
  const first = !S.spotSeen[sp.key];
  if (first) {
    S.spotSeen[sp.key] = true;
    AUDIO.sfx('clue');
    gainStars(2); gainExp(8);
    logIt(sp.name + '을(를) 살펴보았다');
  } else AUDIO.sfx('blip');
  if (newly) { celebrate('오디세이 컬렉션 발견!', collectible.name); logIt('수집품 · ' + collectible.name); }
  save(); renderOverlay(); renderPanel(); renderTop();
}
function renderSpotInto(ov) {
  if (spotView.character) { renderCharacterRecord(ov, spotView.character); return; }
  if (spotView.collection) { renderCollectionDetail(ov, spotView.collection, false); return; }
  const sp = spotView.sp;
  if (spotView.collectible) { renderCollectionDetail(ov, spotView.collectible, spotView.newly, sp); return; }
  const art = sp.art ? (CONTENT.ARTS || []).find(a => a.id === sp.art) : null;
  const q0 = sp.hint ? pickQuiz() : null;
  const q = q0 ? localizedQuiz(q0) : null;
  let body = (sp.img ? `<div class="artifact-sheet"><div class="artifact-hero object" style="background-image:url('${esc(sp.img)}')"><div class="artifact-title"><h2>${esc(sp.name)}</h2><div>${esc(sp.kind || '신화 속 생활 유물')}</div></div></div><div class="artifact-body"><div><img class="artifact-object" src="${esc(sp.img)}" alt="${esc(sp.name)}"></div><div class="artifact-story"><h3>이 물건은 무엇일까?</h3><p>${esc(sp.detail || sp.text)}</p><div class="learning-points"><section><b>장면 속 의미</b>${esc(sp.text)}</section><section><b>기억할 점</b>${esc(sp.remember || '신화 속 물건은 당시 사람들의 생활과 가치관을 함께 보여 줍니다.')}</section></div></div></div><footer class="artifact-footer"><p><b>그림 안내</b><br>${esc(sp.source || '고대 유물과 원전 기록을 참고한 학습용 상상 복원도입니다.')}</p></footer></div>` : '') + '<div class="spotbody"' + (sp.img ? ' style="margin-top:10px"' : '') + '><p>' + esc(sp.text) + '</p>' +
    (q ? '<div class="spot-hint">💡 힌트 · ' + esc(q.hint) + '</div>' : '') + '</div>';
  if (art) {
    body = `<div class="artwrap">
      <div class="artframe">${art.image ? `<img class="art-original" src="${esc(art.image)}" alt="${esc(art.title)}">` : '<canvas id="artCv"></canvas>'}</div>
      <div class="artmeta"><b>${esc(art.title)}</b><small>${esc(art.artist)}</small>
        ${art.movement ? `<span class="art-movement">${esc(art.movement)}</span>` : ''}
        <p>${esc(art.text)}</p>
        <p class="artnote">${art.image ? L('퍼블릭 도메인 원작 이미지를 게임 폴더에 저장해 표시합니다. 작품의 시대와 표현 방식을 장면의 선택과 함께 살펴보세요.','This public-domain artwork is stored inside the game folder. Notice how its period and visual language shape the scene.') : L('실제 작품의 구도를 학습용 그림으로 옮겼습니다.','This learning image adapts the composition of the original artwork.')}</p></div>
    </div><div class="spotbody" style="margin-top:10px"><p>${esc(sp.text)}</p>${q ? '<div class="spot-hint">💡 힌트 · ' + esc(q.hint) + '</div>' : ''}</div>`;
  }
  body += `<div class="quiz-actions">${UI.btn('닫기', { id: 'spotClose', cls: 'btn--pri' })}</div>`;
  ov.hidden = false;
  ov.innerHTML = '<div class="modal">' + UI.win((art ? '🖼 ' : '🔍 ') + sp.name, body, { tone: art ? 'gold' : 'dark' }) + '</div>';
  if (art && !art.image) { const cv = $('#artCv'); if (cv) SYSTEM.paintArt(cv, art.img); }
  const c = $('#spotClose'); if (c) c.onclick = () => { spotView = null; renderOverlay(); };
}

/* ==================== 떠돌이 상인의 가게 ==================== */
function shopStock() { return (CONTENT.SHOP || []).filter(row => !row.after || S.seenScenes[row.after]); }
function openShop() {
  if (quiz || battle || SYSTEM.active()) return;
  AUDIO.sfx('coin');
  shop = { t: 0 };
  renderOverlay();
}
function buyItem(idx) {
  const row = shopStock()[idx]; if (!row) return;
  const it = CONTENT.ITEMS[row.item];
  const owned = (S.items[row.item] || 0) > 0 && it.kind !== 'consume';
  if (owned) return;
  if (S.gold < row.price) { toast('드라크마가 부족합니다', 'bad'); AUDIO.sfx('bad'); return; }
  S.gold -= row.price;
  giveItem(row.item);
  save(); renderOverlay(); renderTop();
}
function renderShopInto(ov) {
  const stock = shopStock();
  const rows = stock.map((row, i) => {
    const it = CONTENT.ITEMS[row.item];
    const owned = (S.items[row.item] || 0) > 0 && it.kind !== 'consume';
    const have = S.items[row.item] || 0;
    return `<div class="shoprow">
      <canvas class="icon" width="12" height="12" data-icon="${esc(row.item)}"></canvas>
      <div><b>${esc(it.name)}${have ? ` <small>×${have}</small>` : ''}</b><small>${esc(it.desc)}</small></div>
      <div style="text-align:right"><div class="price">◉ ${row.price}</div>
        ${owned ? '<span class="dimtext">보유</span>' : UI.btn('산다', { cls: 'btn--pri', data: { buy: i } })}</div>
    </div>`;
  }).join('');
  ov.hidden = false;
  ov.innerHTML = '<div class="modal">' + UI.win('💰 떠돌이 상인의 가게',
    `<div class="shophead"><img class="encounter-portrait" src="assets/portrait-trader.jpg" alt="떠돌이 상인">
      <p><b>에게해의 떠돌이 상인</b><br>항구마다 모은 여행 도구와 그 유래를 함께 알려 드리오.<br><b class="gold">◉ ${S.gold}</b></p></div>
     <div class="shoplist">${rows}</div>
     <div class="quiz-actions">${UI.btn('닫기', { id: 'shopClose', cls: 'btn--ghost' })}</div>`,
    { tone: 'gold' }) + '</div>';
  paintIcons();
  ov.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => buyItem(+b.dataset.buy));
  const c = $('#shopClose'); if (c) c.onclick = () => { shop = null; renderOverlay(); };
}
function showMsg(t) { const m = $('#msg'); if (m) m.innerHTML = UI.msgBar('', sceneText(S.scene).title, t); }
function showMapHint(text) {
  const h = $('#mapHint'); if (!h) return;
  clearTimeout(mapHintTimer);
  h.hidden = false;
  h.innerHTML = `<i>💡</i><span><b>${L('힌트','Hint')}</b> · ${esc(text)}</span><button type="button" aria-label="${L('힌트 닫기','Close hint')}">×</button>`;
  h.querySelector('button').onclick = () => { h.hidden = true; };
  mapHintTimer = setTimeout(() => { const now = $('#mapHint'); if (now) now.hidden = true; }, 12000);
}

/* ==================== 퀴즈 ==================== */
const QUIZ_EN = {
 'ogy-q1':['Which nymph kept Odysseus on Ogygia?',['Circe','Calypso','Nausicaa','Siren']],
 'ogy-q2':['What did Calypso offer that Odysseus refused?',['A fast ship','Ageless immortality','Gold and jewels','A bag of winds']],
 'ogy-q3':['Which god carried Zeus’s command to Calypso?',['Hermes','Apollo','Poseidon','Ares']],
 'ogy-q4':['What did Calypso provide for building the raft?',['A bronze axe and sailcloth','A sword and shield','A bow and arrows','Ten rowers']],
 'ogy-q5':['How did Odysseus steer his raft?',['By watching the constellations','By following seabirds','By counting waves','By following changes in water color']],
 'ogy-q6':['Which sea goddess gave Odysseus a lifesaving veil?',['Athena','Ino','Amphitrite','Calypso']],
 'ogy-q7':['Choose the correct order of events.',['Hermes arrives → raft → storm → Ino’s veil','Raft → Hermes arrives → veil → storm','Storm → raft → Hermes arrives → veil','Veil → storm → Hermes arrives → raft']],
 'ogy-q8':['Who is named as Calypso’s father?',['Atlas','Helios','Oceanus','Prometheus']],
 'ogy-q9':['How long did Odysseus remain on Ogygia?',['Three years','Seven years','Ten years','Twenty years']],
 'ogy-q10':['When Ino told him to abandon the raft, what did Odysseus do?',['Jumped in at once','Held on until the raft broke, then swam','Threw away the veil','Raised the sail against the storm']],
 'sch-q1':['Why did Nausicaa go to the river with her attendants?',['To wash clothes','To catch fish','To gather shells','To search for a stranger']],
 'sch-q2':['Who was Nausicaa’s father and king of the Phaeacians?',['Alcinous','Menelaus','Nestor','Laertes']],
 'sch-q3':['Who was the blind bard who sang of Troy at the Phaeacian court?',['Demodocus','Phemius','Orpheus','Tyrtaeus']],
 'sch-q4':['What did Odysseus do when Demodocus sang of Troy?',['Sang with him','Covered his face and wept','Ordered him to stop','Showed no emotion']],
 'sch-q5':['Whom did Nausicaa tell Odysseus to petition first in the palace?',['King Alcinous','Queen Arete','Demodocus','The gatekeeper']],
 'cic-q1':['Where did Odysseus’s fleet first land after leaving Troy?',['Ismaros','Aeaea','Thrinacia','Scheria']],
 'cic-q2':['What did the crew do after taking the city?',['Sailed away at once','Stayed on shore eating and drinking','Rebuilt the walls','Freed every captive']],
 'cic-q3':['Which priest of Apollo did Odysseus spare?',['Maron','Calchas','Tiresias','Laocoön']],
 'cic-q4':['What gift did Maron give in return?',['Powerful wine','A bronze shield','A golden cup','A prophetic scroll']],
 'cic-q5':['How many men per ship were lost against the Cicones?',['Two','Six','Twelve','Twenty']],
 'lot-q1':['What did the Lotus-Eaters offer their guests?',['Lotus fruit','Wine','Barley bread','Sea fish']],
 'lot-q2':['What happened after eating the lotus?',['The body grew larger','The desire to return home vanished','The eater became an animal','The eater slept forever']],
 'lot-q3':['How many scouts did Odysseus send inland?',['One','Three','Ten','Twenty']],
 'lot-q4':['How did the Lotus-Eaters treat the visitors?',['They shared food without violence','They drove them away with arrows','They tried to break the ship','They demanded payment']],
 'lot-q5':['How did Odysseus recover the men who would not return?',['Left them behind','Dragged them back and tied them in the ship','Ate lotus with them','Defeated them in battle']],
 'cyc-q1':['Which god was Polyphemus’s father?',['Zeus','Poseidon','Helios','Hades']],
 'cyc-q2':['What false name did Odysseus give Polyphemus?',['Nobody','Ithaca','Old Man','Seafarer']],
 'cyc-q3':['How many eyes did a Cyclops have?',['One','Two','Three','Four']],
 'cyc-q4':['What did the crew find inside the cave?',['Cheese, milk, sheep, and goats','Gold and silver','A wrecked ship','Other men’s weapons']],
 'cyc-q5':['What put Polyphemus to sleep?',['Maron’s strong wine','Circe’s drug','A lullaby','A sleep-inducing incense']],
 'aea-q1':['What did Aeolus give Odysseus?',['An oxhide bag holding the winds','A golden sail','A bird that knew the route','A flask that never emptied']],
 'aea-q2':['Who opened the bag of winds?',['Odysseus','The crew','Aeolus','Circe']],
 'aea-q3':['Who was Circe’s father?',['Helios','Atlas','Poseidon','Hermes']],
 'aea-q4':['Into what animals did Circe transform the crew?',['Pigs','Wolves','Ravens','Stone statues']],
 'aea-q5':['What was the herb Hermes gave Odysseus?',['Moly','Lotus','Ambrosia','Nectar']],
 'und-q1':['Which seer did Odysseus need to meet in the underworld?',['Tiresias','Calchas','Achilles','Agamemnon']],
 'und-q2':['What did Tiresias carry when he appeared?',['A golden staff','A bronze sword','A torch','A mirror']],
 'und-q3':['Whose shade approached Odysseus first?',['Elpenor','Anticleia','Achilles','Ajax']],
 'und-q4':['What did Elpenor ask Odysseus to do?',['Bury him and set an oar on his grave','Carry a letter home','Avenge him on Circe','Divide his treasure']],
 'und-q5':['How did Odysseus summon the shades?',['Dug a trench and poured offerings, then scattered barley','Raised twelve torches','Sang for three days','Burned a black ship']],
 'sir-q1':['What blocked the Sirens’ song from the crew’s ears?',['Beeswax','Pieces of cloth','Clay','Seawater']],
 'sir-q2':['What precaution did Odysseus take for himself?',['Blocked his ears','Had himself tied to the mast','Locked himself below deck','Sang along']],
 'sir-q3':['What did the Sirens promise through their song?',['All news of the world and Troy','Endless gold','Eternal youth','Rule over the sea']],
 'sir-q4':['Why did Poseidon remain angry with Odysseus?',['He offered no sacrifice','He harmed Poseidon’s son Polyphemus','He launched too many ships','He destroyed a Trojan temple']],
 'sir-q5':['What order did Odysseus give the crew in advance?',['Tie him tighter even if he begged for release','Stop rowing when the song began','Release him when he called','Lower the sail and wait']],
 'thr-q1':['What lived on the island of Thrinacia?',['The cattle and sheep of Helios','The horses of Poseidon','The eagle of Zeus','The herbs of Circe']],
 'thr-q2':['Which crewman strongly argued that they should land?',['Eurylochus','Elpenor','Perimedes','Eumaeus']],
 'thr-q3':['Which nymphs tended Helios’s herds?',['Phaethusa and Lampetie','Circe and Calypso','Scylla and Charybdis','Arete and Nausicaa']],
 'thr-q4':['What did the crew swear before landing?',['Not to touch the sacred herds','Never to sleep again','To divide all treasure','To build a temple']],
 'thr-q5':['Which wind kept the ship trapped for a month?',['The south wind','The north wind','The west wind','The east wind']],
 'ith-q1':['Which goddess disguised Odysseus as an old beggar?',['Athena','Hermes','Hera','Aphrodite']],
 'ith-q2':['Whom did Odysseus visit first after reaching Ithaca?',['Eumaeus the swineherd','Penelope','Telemachus','Laertes']],
 'ith-q3':['What was the name of the old dog who recognized his master?',['Argos','Cerberus','Laelaps','Artemis']],
 'ith-q4':['Who recognized Odysseus by the scar while washing his feet?',['Eurycleia','Penelope','Eumaeus','Telemachus']],
 'ith-q5':['How did Penelope delay remarriage?',['Wove a shroud by day and undid it at night','Pretended to be ill','Waited for an oracle','Hid on another island']]
};
const HINT_EN = {
 'ogy-q1':'She is the daughter of Atlas and the immortal ruler of Ogygia.',
 'ogy-q2':'He still chose mortal Penelope and his own home over a divine life without aging.',
 'ogy-q3':'Look for the messenger god with winged sandals and a herald’s staff.',
 'ogy-q4':'A raft needs a tool for cutting timber and a material that can catch the wind.',
 'ogy-q5':'With no coast in sight, he kept the Bear and other constellations in view.',
 'ogy-q6':'This sea goddess was once the mortal Ino and is also called Leucothea.',
 'ogy-q7':'First came Zeus’s order, then construction; the storm and rescue happened at sea.',
 'ogy-q8':'Calypso’s father is the Titan condemned to bear the heavens.',
 'ogy-q9':'The stay was longer than the Trojan War’s final campaign but shorter than ten years.',
 'ogy-q10':'He distrusted sudden advice and stayed with the raft until the waves broke it apart.',
 'sch-q1':'Athena sent a dream about preparing clean clothes for a future marriage.',
 'sch-q2':'The king who welcomed the nameless guest ruled beside Queen Arete.',
 'sch-q3':'His song about the wooden horse made the hidden Odysseus weep.',
 'sch-q4':'He did not want the court to see that the Trojan song was his own story.',
 'sch-q5':'Nausicaa said that winning the queen’s goodwill would open the way home.',
 'cic-q1':'This Thracian coastal city belonged to the Cicones and was the first stop after Troy.',
 'cic-q2':'Odysseus urged departure, but the crew slaughtered animals and continued feasting.',
 'cic-q3':'Sparing this priest later earned the wine used against Polyphemus.',
 'cic-q4':'The gift was so strong that it was normally diluted with twenty parts water.',
 'cic-q5':'The loss was counted equally for every ship and was half of twelve.',
 'lot-q1':'The people’s Greek name literally means “lotus eaters.”',
 'lot-q2':'The danger changes a traveler’s desire and memory, not the shape of the body.',
 'lot-q3':'Odysseus sent two scouts together with one herald.',
 'lot-q4':'There was no battle here; the danger arrived as a friendly gift.',
 'lot-q5':'The affected sailors resisted rescue, so Odysseus could not rely on persuasion alone.',
 'cyc-q1':'The angry god who controls the sea later answers his blinded son’s prayer.',
 'cyc-q2':'The false name turns “Who is hurting you?” into a useless answer.',
 'cyc-q3':'The escape plan works because every Cyclops has a single eye in the forehead.',
 'cyc-q4':'Polyphemus was a shepherd, so think of food and animals kept by a herdsman.',
 'cyc-q5':'An earlier act of mercy at Ismaros supplied the unusually strong drink.',
 'aea-q1':'Aeolus tied every dangerous wind except the helpful west wind inside one container.',
 'aea-q2':'They suspected their captain was hiding treasure while he slept.',
 'aea-q3':'Circe is the daughter of the god whose sacred cattle appear later.',
 'aea-q4':'The victims kept human minds inside the bodies of common farm animals.',
 'aea-q5':'Hermes described this plant as having a black root and a milk-white flower.',
 'und-q1':'Circe sent Odysseus to the blind Theban prophet who retained wisdom after death.',
 'und-q2':'The object was a symbol of the prophet’s authority, not a weapon or a light.',
 'und-q3':'The first shade was a young crewmate who had died accidentally on Aeaea and remained unburied.',
 'und-q4':'The dead sailor wanted a proper burial and the tool of his life placed above the grave.',
 'und-q5':'The rite began in the earth with liquid offerings and grain, not with fire or music.',
 'sir-q1':'The sailors warmed a substance taken from honeycombs and pressed it into their ears.',
 'sir-q2':'He wanted to hear the song, so he restrained his body instead of blocking his ears.',
 'sir-q3':'The bait was knowledge—especially everything that happened at Troy—not wealth.',
 'sir-q4':'The sea god’s son was the Cyclops blinded with an olive stake.',
 'sir-q5':'He made the rule before hearing the song because he knew his future judgment would fail.',
 'thr-q1':'Tiresias warned about immortal herds belonging to the god who crosses the sky each day.',
 'thr-q2':'This skeptical lieutenant had also led the scouting party to Circe’s house.',
 'thr-q3':'The two daughters of Helios have names connected with shining light.',
 'thr-q4':'The promise concerned the one sacred food source they had been forbidden to touch.',
 'thr-q5':'This wind blew from the direction opposite the voyage and trapped them for a month.',
 'ith-q1':'The goddess of wisdom favored disguise and timing over an immediate attack.',
 'ith-q2':'He first tested the loyalty and hospitality of the swineherd living away from the palace.',
 'ith-q3':'This dog waited twenty years and recognized his master when the humans did not.',
 'ith-q4':'The old nurse who raised him felt the hunting scar while washing his feet.',
 'ith-q5':'Her weaving advanced in daylight but secretly returned to its starting point each night.'
};
const TOPIC_EN={ '가족':'Family','괴물':'Monsters','금기':'Taboo','신과 인간':'Gods & Mortals','정체성':'Identity','지혜':'Wisdom','항해':'Voyage','환대':'Hospitality' };
const MAIN_QUEST_EN = {
 'ogy-main':['A Raft for the Open Sea','Receive Calypso’s permission, complete the raft, and put to sea.',['Speak with Calypso about both of your choices','Receive the bronze axe from Calypso','Receive sailcloth from Calypso','Answer 3 quiz questions correctly','Complete the raft in the sea trial']],
 'sch-main':['The Guest’s Name','Receive hospitality in the Phaeacian palace and reveal your name.',['Speak with Nausicaa','Meet King Alcinous','Answer 4 quiz questions correctly','Reveal your true name']],
 'cic-main':['Knowing When to Stop','Persuade the crew to board before sunset.',['Speak with the watchman of Ismaros','Answer 4 quiz questions correctly','Get the crew aboard']],
 'lot-main':['The Forgotten Crew','Recover the men who ate lotus and bring them aboard.',['Speak with a Lotus-Eater','Answer 4 quiz questions correctly','Bring the crew back to the ship']],
 'cyc-main':['The Trick of Nobody','Escape the cave with a false name and an olive stake.',['Speak with Polyphemus','Prepare the olive-wood stake','Answer 4 quiz questions correctly','Escape beneath the flock']],
 'aea-main':['Moly in Hand','Carry moly, confront Circe, and restore the crew.',['Obtain the moly herb','Speak with Circe','Answer 4 quiz questions correctly','Restore the crew to human form']],
 'und-main':['A Rite for the Seer','Prepare the offerings and hear Tiresias’s prophecy.',['Prepare a black ewe','Prepare milk mixed with honey','Speak with Tiresias','Answer 4 quiz questions correctly']],
 'sir-main':['Bound to the Mast','Prepare wax and rope, then cross the Sirens’ sea.',['Prepare wax earplugs','Take rope for the mast','Hear the Sirens’ song','Answer 4 quiz questions correctly']],
 'thr-main':['The Courage Not to Touch','Take an oath and leave the Sun God’s cattle unharmed.',['Speak with Eurylochus','Secure the oath','Answer 4 quiz questions correctly','Keep the cattle safe']],
 'ith-main':['The Man Who Draws the Great Bow','String the bow and shoot through twelve axe heads.',['Hear Athena’s counsel','Plan with Telemachus','Find the bowstring','Set up twelve axes','Answer 5 quiz questions correctly','Draw the great bow']]
};
function localizedQuest(q){
  const e=isEn()&&q&&MAIN_QUEST_EN[q.id];
  return e?Object.assign({},q,{title:e[0],goal:e[1],steps:(q.steps||[]).map((s,i)=>Object.assign({},s,{text:e[2][i]||s.text}))}):q;
}
function localizedQuiz(q){const e=isEn()&&QUIZ_EN[q.id];return e?Object.assign({},q,{q:e[0],choices:e[1],topic:TOPIC_EN[q.topic]||q.topic,hint:HINT_EN[q.id]||'Use the people and objects visible in this chapter to narrow the choices.',explain:'This answer follows the characters and events of the Odyssey.',wrong:'Compare the choices with the people, objects, and sequence shown in this chapter.'}):q;}
function scenePool() {
  const raw = (CONTENT.QUIZ && CONTENT.QUIZ[S.scene]) || [];
  const all = isEn() ? raw.filter(q => QUIZ_EN[q.id]) : raw;
  S.quizSets = S.quizSets || {};
  let ids = S.quizSets[S.scene];
  if (!ids || !Array.isArray(ids) || ids.some(id => !all.some(q => q.id === id))) {
    ids = all.map(q => q.id).sort(() => Math.random() - 0.5).slice(0, Math.min(5, all.length));
    S.quizSets[S.scene] = ids; save();
  }
  return ids.map(id => all.find(q => q.id === id)).filter(Boolean);
}
function pickQuiz() {
  const pool = scenePool().filter(q => !S.quizDone[q.id]);
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
function openQuiz(q, npc) {
  q = localizedQuiz(q);
  const order = q.choices.map((_,i)=>i).sort(()=>Math.random()-.5);
  const shuffled = Object.assign({},q,{choices:order.map(i=>q.choices[i]),answer:order.indexOf(q.answer)});
  quiz = { q:shuffled, npc, answered: false, picked: -1, hinted: false, cut: [] }; renderOverlay();
}
function closeQuiz() { quiz = null; renderOverlay(); }
function renderQuiz() { renderOverlay(); }
function renderQuizInto(ov) {
  const { q, answered, picked, hinted, cut } = quiz;
  const kindLabel = isEn() ? ({fact:'Knowledge',judge:'Judgment',order:'Sequence',who:'People'}[q.kind]||'Knowledge') : ({ fact: '지식', judge: '판단', order: '순서', who: '인물' }[q.kind] || '지식');
  const pool = scenePool(), doneN = pool.filter(x => S.quizDone[x.id]).length;
  const scrolls = S.items.hint_scroll || 0;
  const body =
    `<div class="quiz-meta"><span class="badge2">${esc(kindLabel)}</span>` +
    `<span class="badge2">${esc(q.topic || '')}</span>` +
    `<span class="badge2 gold">${'★'.repeat(q.diff || 1)}</span>` +
    `<span class="badge2">${doneN}/${pool.length}</span></div>` +
    UI.quiz(q.q, q.choices, {}) +
    (hinted && !answered ? `<div class="quiz-hint">${L('힌트','Hint')} · ${esc(q.hint)}</div>` : '') +
    (answered ? UI.feedback(picked === q.answer, picked === q.answer ? q.explain : (q.wrong + ' ' + L('정답은','Correct answer:') + ' ' + '①②③④'[q.answer] + ' ' + q.choices[q.answer] + '. ' + q.explain)) : '') +
    `<div class="quiz-actions">` +
    (!answered ? UI.btn(L('힌트 보기','Show hint'), { id: 'quizHint', cls: 'btn--ghost' }) : '') +
    (!answered && scrolls > 0 && !(cut && cut.length) ? UI.btn('📜 귀띔 두루마리 ×' + scrolls, { id: 'quizScroll', cls: 'btn--ghost' }) : '') +
    (!answered ? UI.btn(L('나중에','Later'), { id: 'quizSkip', cls: 'btn--ghost' }) : '') +
    (answered ? UI.btn(pickQuiz() ? L('다음 문제 ▶','Next question ▶') : L('닫기','Close'), { id: 'quizNext', cls: 'btn--pri' }) : '') +
    `</div>`;
  ov.hidden = false;
  ov.innerHTML = '<div class="modal">' + UI.win(L('신화의 시험','Myth trial') + ' · ' + sceneText(S.scene).title, body, { tone: 'gold' }) + '</div>';
  ov.querySelectorAll('.quiz-opt').forEach((b, i) => {
    if (answered) {
      b.disabled = true;
      if (i === q.answer) b.classList.add('is-ok');
      else if (i === picked) b.classList.add('is-no');
      else b.classList.add('dim');
    } else if (cut && cut.includes(i)) { b.disabled = true; b.classList.add('dim'); }
    else b.onclick = () => answerQuiz(i);
  });
  const h = $('#quizHint'); if (h) h.onclick = () => { quiz.hinted = true; renderQuiz(); };
  const sc = $('#quizScroll'); if (sc) sc.onclick = () => {
    if ((S.items.hint_scroll || 0) <= 0) return;
    S.items.hint_scroll--;
    const wrong = q.choices.map((_, i) => i).filter(i => i !== q.answer);
    wrong.sort(() => Math.random() - 0.5);
    quiz.cut = wrong.slice(0, 2);
    quiz.hinted = true;
    AUDIO.sfx('clue');
    save(); renderQuiz();
  };
  const s = $('#quizSkip'); if (s) s.onclick = closeQuiz;
  const nx = $('#quizNext'); if (nx) nx.onclick = () => { const n = pickQuiz(); if (n) openQuiz(n, quiz.npc); else closeQuiz(); };
}
function answerQuiz(i) {
  if (!quiz || quiz.answered) return;
  quiz.answered = true; quiz.picked = i;
  const q = quiz.q;
  if (i === q.answer) {
    S.quizDone[q.id] = true;
    S.quizRight[S.scene] = (S.quizRight[S.scene] || 0) + 1;
    const r = q.reward || {};
    gainStars(r.stars || 2);
    S.gold += r.gold || 3;
    if (r.item) giveItem(r.item);
    gainExp(6 + (q.diff || 1) * 6);
    setResolve(5);
    logIt('시험 통과 — ' + (q.topic || ''));
  } else {
    delete S.quizDone[q.id];
    S.hp = Math.max(1, S.hp - 4);
    logIt('시험에서 틀렸다 — ' + (q.topic || ''));
  }
  renderQuiz(); renderPanel(); renderTop(); save(); checkQuests();
}

/* ==================== 결단 이벤트 ====================
   원전의 결정적 장면을 플레이어가 직접 고른다. 옳은 선택이 퀘스트 플래그를 켠다. */
function sceneDecisions(sc) { return (typeof DECISIONS !== 'undefined' && DECISIONS[sc || S.scene]) || []; }
function decisionReady(d) {
  if (S.flags[d.flag]) return false;
  if (!d.need) return true;
  const [k, a] = String(d.need).split(':');
  if (k === 'talk') return !!S.met[a];
  if (k === 'quiz') return (S.quizRight[S.scene] || 0) >= Number(a);
  if (k === 'flag') return !!S.flags[a];
  return true;
}
function openDecision(d) { decision = { d, picked: -1, tried: [] }; renderOverlay(); }
function chooseDecision(i) {
  if (!decision || decision.picked >= 0) return;
  const d = decision.d, c = d.choices[i];
  if (!c) return;
  if (c.ok) {
    decision.picked = i;
    S.flags[d.flag] = true;
    const r = d.reward || {};
    gainStars(r.stars || 5);
    S.gold += r.gold || 10;
    if (r.item) giveItem(r.item);
    gainExp(r.exp || 25);
    logIt('결단 — ' + d.title);
    celebrate('결단', d.title);
    save(); checkQuests(); renderPanel(); renderTop();
  } else {
    if (!decision.tried.includes(i)) decision.tried.push(i);
    S.hp = Math.max(1, S.hp - 3);
  }
  decision.last = i;
  renderOverlay();
}
function renderDecisionBody() {
  const { d, picked, last, tried } = decision;
  const done = picked >= 0;
  const shownResult = (last !== undefined && last >= 0) ? d.choices[last] : null;
  return `<div class="dec">
    ${d.speaker ? `<div class="dec-por"><div class="por">${hdPortrait(d.speaker, NPCS[d.speaker] ? NPCS[d.speaker].name : d.speaker)}</div></div>` : ''}
    <div class="dec-body">
      <p class="dec-sit">${esc(d.situation)}</p>
      <div class="quiz-opts">${d.choices.map((c, i) => {
    let cls = 'quiz-opt';
    if (done && i === picked) cls += ' is-ok';
    else if (tried.includes(i)) cls += ' is-no';
    return `<button type="button" class="${cls}" data-choice="${i}" ${done ? 'disabled' : ''}>
        <span class="quiz-key">${'①②③'[i]}</span><span class="quiz-tx">${esc(c.text)}</span></button>`;
  }).join('')}</div>
      ${shownResult ? `<div class="quiz-fb ${shownResult.ok ? 'is-ok' : 'is-no'}"><span class="quiz-fb-ic">${shownResult.ok ? '○' : '✕'}</span><span>${esc(shownResult.result)}</span></div>` : ''}
      ${done ? `<div class="dec-lesson">${esc(d.lesson)}</div>` : '<p class="dimtext">틀려도 괜찮습니다. 다시 고를 수 있어요.</p>'}
      <div class="quiz-actions">${UI.btn(done ? '닫기' : '나중에 결정한다', { id: 'decClose', cls: done ? 'btn--pri' : 'btn--ghost' })}</div>
    </div></div>`;
}

/* ==================== 오버레이(퀴즈·결단 공용) ==================== */
function renderOverlay() {
  const ov = $('#overlay'); if (!ov) return;
  if (voyageGame) return;
  if (quiz) { renderQuizInto(ov); return; }
  if (shop) { renderShopInto(ov); return; }
  if (spotView) { renderSpotInto(ov); return; }
  if (decision) {
    ov.hidden = false;
    ov.innerHTML = '<div class="modal">' + UI.win('결단의 순간 · ' + decision.d.title, renderDecisionBody(), { tone: 'gold' }) + '</div>';
    paintPortraits();
    ov.querySelectorAll('.quiz-opt').forEach((b, i) => { if (!b.disabled) b.onclick = () => chooseDecision(i); });
    const c = $('#decClose'); if (c) c.onclick = () => { decision = null; renderOverlay(); };
    return;
  }
  ov.hidden = true; ov.innerHTML = '';
}

/* ==================== 장소 이동 ==================== */
const ODYSSEY_OPENING_FILM = [
  { art:'assets/odyssey-opening-01-battle.jpg', kicker:'PROLOGUE I · THE TENTH YEAR', title:'트로이 전쟁의 마지막 날', enTitle:'The Last Day of the Trojan War', ko:'바다 건너 트로이에서 시작된 전쟁은 어느덧 열 번째 해를 맞았다. 수많은 영웅이 쓰러졌지만 높은 성벽은 굳게 버텼고, 그리스군에게 남은 것은 마지막 한 번의 기회뿐이었다.', en:'Across the sea, the war at Troy had entered its tenth year. The walls still stood, and the Greeks had only one final chance.' },
  { art:'assets/odyssey-opening-02-horse.jpg', kicker:'PROLOGUE II · THE STRATAGEM', title:'힘이 아닌 지혜로', enTitle:'A Victory of Cunning', ko:'이타카의 왕 오디세우스는 칼로 무너뜨릴 수 없는 성벽을 생각으로 열기로 했다. 거대한 목마와 거짓 퇴각—적의 판단을 움직이는 위험한 계략이 밤의 트로이에서 시작되었다.', en:'Odysseus of Ithaca chose wit where force had failed. The wooden horse and a false retreat set his daring plan in motion.' },
  { art:'assets/odyssey-opening-03-victory.jpg', kicker:'PROLOGUE III · VICTORY AND ITS PRICE', title:'마침내 얻은 승리', enTitle:'Victory—and Its Cost', ko:'새벽이 밝자 전쟁은 끝나 있었다. 동료들은 승리를 외쳤지만 오디세우스는 불타는 도시를 오래 바라보았다. 지혜가 승리를 주었어도, 전쟁이 남긴 슬픔까지 지울 수는 없었다.', en:'At dawn the war was over. His companions cheered, but Odysseus looked back, knowing that victory could not erase the sorrow of war.' },
  { art:'assets/odyssey-opening-04-feast.jpg', kicker:'PROLOGUE IV · THE LAST FEAST', title:'트로이 해변의 축제', enTitle:'The Feast Before the Voyage', ko:'그리스군은 바닷가에 등불을 밝히고 노래와 음식으로 긴 전쟁의 끝을 축하했다. 그러나 웃음 속의 오디세우스는 아내 페넬로페와 아들 텔레마코스, 그리고 오래 떠나온 이타카를 생각했다.', en:'The Greeks celebrated beside the sea. Amid the songs, Odysseus thought of Penelope, Telemachus, and the island he called home.' },
  { art:'assets/odyssey-opening-05-departure.jpg', kicker:'PROLOGUE V · NOSTOS', title:'이제, 집으로', enTitle:'Now, Homeward', ko:'“돛을 올려라. 이타카로 돌아간다.” 승리는 끝이 아니었다. 신들의 바다와 낯선 섬, 유혹과 분노가 기다리는 진짜 모험—오디세우스의 귀향이 이제 시작된다.', en:'“Raise the sail. We are going home.” Beyond victory waited gods, strange islands, temptation, and the long road back to Ithaca.' }
];

function showOdysseyOpening(after, gallery = false) {
  const ov = $('#overlay'); if (!ov) { if (after) after(); return; }
  AUDIO.unlock(); AUDIO.play('victory');
  if (openingMovie?.timer) clearTimeout(openingMovie.timer);
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  openingMovie = { index:0, playing:true, narration:false, timer:0 };
  ov.hidden = false;
  const finish = () => {
    if (!openingMovie) return;
    clearTimeout(openingMovie.timer);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    openingMovie = null;
    if (!gallery) { S.flags.openingSeen = true; save(); }
    ov.hidden = true; ov.innerHTML = '';
    if (after) after();
  };
  const speak = scene => {
    if (!openingMovie?.narration || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(scene.title + '. ' + scene.ko);
    utter.lang = 'ko-KR'; utter.rate = .88; utter.pitch = .93;
    window.speechSynthesis.speak(utter);
  };
  const schedule = paint => {
    clearTimeout(openingMovie.timer);
    if (!openingMovie.playing || openingMovie.index >= ODYSSEY_OPENING_FILM.length - 1) return;
    openingMovie.timer = setTimeout(() => { openingMovie.index++; paint(); }, 8000);
  };
  function paint() {
    if (!openingMovie) return;
    const i = openingMovie.index, scene = ODYSSEY_OPENING_FILM[i], last = i === ODYSSEY_OPENING_FILM.length - 1;
    ov.innerHTML = `<section class="od-cinema" role="dialog" aria-modal="true" aria-label="오디세우스 오프닝 영상">
      <img class="od-cinema-bg" src="${scene.art}" alt="${esc(scene.title)}">
      <div class="od-cinema-shade"></div><div class="od-cinema-smoke"></div><div class="od-cinema-frame"></div>
      <header class="od-cinema-top"><div class="od-cinema-brand">THE ODYSSEY · OPENING FILM<b>귀향의 바다</b></div>
        <div class="od-cinema-tools">${UI.btn(openingMovie.narration ? '🔊 내레이션 켬' : '🔈 내레이션', {id:'filmVoice',cls:'btn--ghost'})}${UI.btn(openingMovie.playing ? 'Ⅱ 일시정지' : '▶ 자동재생', {id:'filmPlay',cls:'btn--ghost'})}${UI.btn(gallery ? '기록으로 돌아가기' : '건너뛰기', {id:'filmSkip',cls:'btn--ghost'})}</div></header>
      <div class="od-cinema-copy"><div><div class="od-cinema-kicker">${scene.kicker}</div><h2>${scene.title}<small style="display:block;margin-top:7px;font:700 12px ui-monospace,monospace;letter-spacing:.13em;color:#e1bd69">${scene.enTitle}</small></h2><p class="od-cinema-ko">${scene.ko}</p><p class="od-cinema-en">${scene.en}</p></div>
        <nav class="od-cinema-nav">${i ? UI.btn('이전', {id:'filmPrev',cls:'btn--ghost'}) : ''}${UI.btn(last ? (gallery ? '오프닝 닫기' : '귀향 항해 시작 ▶') : '다음 장면 ▶', {id:'filmNext',cls:'btn--pri'})}</nav></div>
      <div class="od-cinema-dots">${ODYSSEY_OPENING_FILM.map((_,n)=>`<i class="${n<i?'done':n===i?'on':''}"></i>`).join('')}</div>
    </section>`;
    $('#filmNext').onclick = () => { if (last) finish(); else { openingMovie.index++; paint(); } };
    const prev = $('#filmPrev'); if (prev) prev.onclick = () => { openingMovie.index--; paint(); };
    $('#filmSkip').onclick = finish;
    $('#filmPlay').onclick = () => { openingMovie.playing = !openingMovie.playing; paint(); };
    $('#filmVoice').onclick = () => { openingMovie.narration = !openingMovie.narration; paint(); };
    speak(scene); schedule(paint);
  }
  paint();
}

function renderCharacterRecord(ov, id) {
  const n=NPCS[id]; if(!n)return;
  const rec=CHARACTER_RECORDS[id]||['신화 속 상징','《오디세이아》의 귀향 여정에서 만나는 인물이다.','대화와 선택을 통해 이 인물이 맡은 역할을 살펴보자.'];
  const meta=divineMeta(id);
  ov.hidden=false;
  ov.innerHTML='<div class="modal">'+UI.win('인물 기록 · '+esc(n.name),`<article class="character-sheet"><div class="character-portrait">${codexPortrait(id,n.name)}</div><div class="character-copy"><h2>${esc(n.name)}</h2><p class="role">${esc(n.role)}</p>${meta}<p class="symbols"><b>대표 상징</b><br>${esc(rec[0])}</p><h3>《오디세이아》 속 역할</h3><p>${esc(rec[1])}</p><h3>이 인물에게서 배울 점</h3><p>${esc(rec[2])}</p><p class="character-quote">「${esc(n.repeat[0])}」</p>${UI.btn('인물 기록 닫기',{id:'charRecordClose',cls:'btn--pri btn--big'})}</div></article>`,{tone:'gold'})+'</div>';
  paintPortraits();
  $('#charRecordClose').onclick=()=>{spotView=null;renderOverlay()};
}

function showChapterStory(scene, after, gallery = false) {
  const data = ODYSSEY_STORY[scene];
  const brief = (typeof ODYSSEY_BRIEFING !== 'undefined' && ODYSSEY_BRIEFING[scene]) || {};
  if (!data) { if (after) after(); return; }
  const ov = $('#overlay');
  if (!ov) { if (after) after(); return; }
  const cast = data.cast || [];
  ov.hidden = false;
  const close = () => {
    if (!gallery) {
      if (!S.storySeen) S.storySeen = {};
      S.storySeen[scene] = true;
      save();
    }
    ov.hidden = true; ov.innerHTML = '';
    if (after) after();
  };
  let page = 0;
  const textPages = data.paragraphs.map((p, i) => ({ i, p }));
  const pageCount = textPages.length + 1;
  function paintStory() {
    const missionPage = page === pageCount - 1;
    const body = missionPage
      ? `<div class="story-mission"><b>VOYAGE ORDER · 이번 장의 임무</b><p>${esc(brief.mission || data.paragraphs[data.paragraphs.length - 1].ko)}</p></div>
         <ul class="story-tasks">${(brief.tasks || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul>`
      : `<h3 class="story-question">${esc(brief.question || brief.hook || data.title.ko)}</h3>
         <div class="story-copy"><section class="story-line"><b>SCENE ${textPages[page].i + 1}</b><p>${esc(textPages[page].p.ko)}</p><p class="en">${esc(textPages[page].p.en)}</p></section></div>`;
    const finalLabel = gallery ? '기록 닫기 / Close record' : '항해 시작 / Begin voyage';
    ov.innerHTML = `<div class="storyveil"><article class="storybox" role="document" style="background-image:url('${esc(brief.art || 'assets/odyssey-title-keyart-hd.jpg')}')">
      <div class="story-layout">
        <header class="story-heading"><div class="story-eyebrow">${esc(data.chapter)} · THE ODYSSEY</div><h2 class="story-title">${esc(data.title.ko)}</h2><div class="story-en-title">${esc(data.title.en)}</div><p class="story-hook">${esc(brief.hook || data.paragraphs[0].ko)}</p></header>
        <section class="story-panel"><div><div class="story-panel-hd"><span>${missionPage ? 'VOYAGE BRIEFING · 항해 명령' : 'CHAPTER RECORD · 장면 기록'}</span><span class="story-page">${String(page + 1).padStart(2,'0')} / ${String(pageCount).padStart(2,'0')}</span></div>${body}</div>
          <footer><div class="story-cast">${cast.map(id => hdPortrait(id, NPCS[id] ? NPCS[id].name : id, 'story-portrait')).join('')}</div><div class="story-progress">${Array.from({length:pageCount},(_,i)=>`<i class="${i===page?'on':''}"></i>`).join('')}</div><div class="story-actions">${page > 0 ? UI.btn('이전 / Previous',{id:'storyPrev',cls:'btn--ghost'}) : ''}${UI.btn(page < pageCount - 1 ? '이야기 계속 / Continue' : finalLabel,{id:'storyContinue',cls:'btn--pri btn--big'})}</div></footer>
        </section>
      </div></article></div>`;
    const prev = $('#storyPrev'); if (prev) prev.onclick = () => { page--; paintStory(); };
    $('#storyContinue').onclick = () => { if (page < pageCount - 1) { page++; paintStory(); } else close(); };
  }
  paintStory();
}

/* ==================== 항해 시련 미니게임 ==================== */
function voyageChallenge() {
  const idx = Math.max(0, ORDER.indexOf(S.scene));
  return { id: 'sail_' + S.scene, stat: ['wis', 'def', 'atk'][idx % 3], wait: Math.max(420, 1000 - idx * 45), title: ['돛의 균형', '파도의 호흡', '키잡이의 판단'][idx % 3] };
}
function openVoyageGame(exitAfter) {
  if (quiz || battle || shop || decision || spotView || voyageGame) return;
  voyageGame = { round: 0, hits: 0, results: [], ready: false, timer: 0, warnTimer: 0, started: 0, keyHandler: null, exitAfter: !!exitAfter };
  renderVoyageGame();
}
function renderVoyageGame() {
  const ov = $('#overlay'); if (!ov || !voyageGame) return;
  const c = voyageChallenge();
  ov.hidden = false;
  ov.innerHTML = '<div class="modal">' + UI.win(L('항해 시련 · ','Sea passage · ') + c.title, `<div class="sail-challenge">
    <p class="sail-help">${L('섬을 떠나 다음 바다로 나아갑니다. 배와 파도의 움직임을 지켜보고 <b>초록불이 켜질 때</b> 지금 버튼이나 Space를 누르세요.','Leave the island and cross the next stretch of sea. Watch the ship and waves, then press Now or Space <b>when the green light appears</b>.')}</p>
    <div id="sailBoard" class="sail-board" style="--sail-window:${c.wait}ms">
      <div class="sail-lights"><i class="sail-light red on"></i><i class="sail-light yellow"></i><i class="sail-light green"></i></div>
      <div class="sail-route"></div><div class="sail-boat" aria-label="왕복하는 배">⛵</div><div class="sail-wave" aria-hidden="true">🌊</div>
      <div class="sail-timing"><div class="sail-zone"></div><div class="sail-marker"></div></div>
    </div>
    <div id="sailSignal" class="sail-signal" role="status">${L('배와 파도를 지켜보세요','Watch the ship and waves')}</div>
    <div class="sail-rounds">${[0,1,2].map(i => `<i class="sail-round ${voyageGame.results[i] === true ? 'hit' : voyageGame.results[i] === false ? 'miss' : ''}"></i>`).join('')}</div>
    ${UI.gauge(L('성공','Success'), voyageGame.hits, 3, 'quest')}<p><b>${L('라운드','Round')} ${voyageGame.round + 1}/3</b> · ${L('3번 중 2번 성공하면 통과','Succeed twice out of three to pass')}</p>
    <div class="sail-actions">${UI.btn(L('지금!','Now!'), { id: 'sailHit', cls: 'btn--pri btn--big' })}${UI.btn(L('그만두기','Quit'), { id: 'sailQuit', cls: 'btn--ghost' })}</div><span class="sail-key">${L('키보드 Space 또는 Enter도 사용할 수 있습니다.','You can also use Space or Enter.')}</span>
  </div>`, { tone: 'gold' }) + '</div>';
  $('#sailHit').onclick = hitVoyage;
  $('#sailQuit').onclick = () => finishVoyage(false, true);
  voyageGame.keyHandler = e => { if ((e.code === 'Space' || e.code === 'Enter') && voyageGame) { e.preventDefault(); hitVoyage(); } };
  document.addEventListener('keydown', voyageGame.keyHandler);
  voyageGame.ready = false; voyageGame.started = performance.now();
  const delay = 1250 + Math.random() * 900;
  voyageGame.warnTimer = setTimeout(() => {
    if (!voyageGame) return;
    const b = $('#sailBoard'), s = $('#sailSignal');
    if (b) { b.classList.add('warning'); const ls = b.querySelectorAll('.sail-light'); ls[0].classList.remove('on'); ls[1].classList.add('on'); }
    if (s) s.textContent = '파도가 다가옵니다… 준비!';
  }, Math.max(450, delay - 650));
  voyageGame.timer = setTimeout(() => {
    if (!voyageGame) return;
    voyageGame.ready = true; voyageGame.started = performance.now();
    const b = $('#sailBoard'), s = $('#sailSignal');
    if (b) { b.classList.remove('warning'); b.classList.add('go'); const ls = b.querySelectorAll('.sail-light'); ls[1].classList.remove('on'); ls[2].classList.add('on'); }
    if (s) { s.textContent = '지금! 돛을 당겨라!'; s.classList.add('go'); }
    voyageGame.timer = setTimeout(() => { if (voyageGame && voyageGame.ready) scoreVoyage(false); }, c.wait);
  }, delay);
}
function hitVoyage() {
  if (!voyageGame) return;
  if (!voyageGame.ready) { scoreVoyage(false); return; }
  scoreVoyage(performance.now() - voyageGame.started <= voyageChallenge().wait);
}
function scoreVoyage(ok) {
  if (!voyageGame) return;
  clearTimeout(voyageGame.timer); clearTimeout(voyageGame.warnTimer);
  if (voyageGame.keyHandler) document.removeEventListener('keydown', voyageGame.keyHandler);
  voyageGame.keyHandler = null; voyageGame.ready = false;
  if (ok) voyageGame.hits++;
  voyageGame.results.push(ok);
  const b = $('#sailBoard'), s = $('#sailSignal');
  if (b) { b.classList.remove('go','warning'); b.classList.add(ok ? 'hit' : 'miss'); }
  if (s) { s.textContent = ok ? '성공! 파도와 호흡이 맞았습니다.' : '실패! 초록불이 켜진 순간을 노리세요.'; s.classList.remove('go'); if (!ok) s.classList.add('bad'); }
  voyageGame.round++;
  toast(ok ? '완벽한 타이밍!' : '파도에 한발 늦었습니다.', ok ? 'good' : 'bad');
  if (voyageGame.round >= 3) { setTimeout(() => finishVoyage(voyageGame.hits >= 2, false), 950); return; }
  setTimeout(renderVoyageGame, 1000);
}
function finishVoyage(win, quit) {
  if (!voyageGame) return;
  clearTimeout(voyageGame.timer); clearTimeout(voyageGame.warnTimer);
  if (voyageGame.keyHandler) document.removeEventListener('keydown', voyageGame.keyHandler);
  const c = voyageChallenge(), first = !(S.minisDone || {})[c.id];
  const continueExit = !!(voyageGame.exitAfter && win);
  if (win) {
    S.minisDone = S.minisDone || {}; S.minisDone[c.id] = true; setResolve(12);
    S.flags['voyage_' + S.scene] = true;
    if (S.scene === 'ogygia' && !S.items.raft_log) giveItem('raft_log');
    if (first) { S.training = S.training || { atk: 0, def: 0, wis: 0 }; S.training[c.stat] = (S.training[c.stat] || 0) + 1; gainExp(18); S.gold += 5; }
    if (first && ORDER.indexOf(S.scene) >= 5 && Object.keys(S.minisDone).length >= 3 && !S.items.aeolus_compass) giveItem('aeolus_compass');
    celebrate('항해 시련 성공', (first ? ({ atk: '힘', def: '방어', wis: '지혜' }[c.stat]) + ' +1 · ' : '') + '사기 +12');
    logIt('항해 시련 성공 — ' + c.title);
  } else {
    S.miniFails = (S.miniFails || 0) + 1; setResolve(quit ? -8 : -15);
    toast((quit ? '중도 포기' : '항해 시련 실패') + ' · 사기 ' + (quit ? '-8' : '-15'), 'bad');
    logIt('항해 시련 실패 — ' + c.title);
  }
  voyageGame = null; const ov = $('#overlay'); if (ov) { ov.hidden = true; ov.innerHTML = ''; }
  checkQuests(); save(); renderPanel(); renderTop();
  if (continueExit) setTimeout(tryExit, 300);
}

function tryExit() {
  const sc = SCENES[S.scene];
  if (S.scene === 'ogygia' && !S.items.raft_log && S.met.calypso && S.items.bronze_axe && S.items.sail_cloth && (S.quizRight.ogygia || 0) >= 3) {
    showMsg(L('칼립소가 준 도구로 뗏목을 완성할 때입니다. 항해 시련을 통과하세요.','Use Calypso’s tools to complete the raft. Pass the sea trial.'));
    openVoyageGame(true); return;
  }
  if (!mainDone(S.scene)) {
    const m = sceneQuests(S.scene).find(q => q.type === 'main');
    showMsg('아직 떠날 수 없습니다. ' + (m ? m.goal : '이곳의 일을 마치세요.'));
    toast('메인 퀘스트를 먼저 완료하세요', 'bad');
    return;
  }
  if (sc.battle && !S.flags['battle_' + sc.battle]) { startBattle(sc.battle); return; }
  if (sc.next && !S.flags['voyage_' + S.scene]) {
    showMsg(L('다음 섬으로 가려면 바다의 파도와 바람을 통과해야 합니다.','To reach the next island, you must cross the wind and waves.'));
    openVoyageGame(true); return;
  }
  if (!sc.next) { S.flags.won = true; go('ending'); return; }
  S.scene = sc.next;
  S.seenScenes[S.scene] = true;
  mapCache = null;
  gainStars(5); gainExp(30);
  celebrate(SCENES[S.scene].title, '새로운 장으로 나아간다');
  logIt(SCENES[S.scene].title + '에 도착했다');
  save();
  go('map');
}

/* ==================== 전투 ==================== */
const BATTLES = {
  cicones: { title: '이즈마로스의 반격', foes: ['ciconian_spear', 'ciconian_chief'] },
  lotus: { title: '잊음의 안개', foes: ['lotus_haze'] },
  cyclops: { title: '폴리페모스의 동굴', foes: ['polyphemus'] },
  aeaea: { title: '키르케의 마법', foes: ['charmed_crew', 'circe_wand'] },
  underworld: { title: '그리움의 그림자', foes: ['longing_shade'] },
  sirens: { title: '노래하는 바다', foes: ['siren_chorus', 'deep_swell'] },
  thrinacia: { title: '굶주림과의 싸움', foes: ['hungry_crew', 'greedy_crew'] },
  ithaca: { title: '궁전을 되찾는 활', foes: ['suitor_a', 'suitor_b', 'suitor_lead'] }
};
function enemyDef(id) {
  const E = CONTENT.ENEMIES || {};
  if (E[id]) return E[id];
  const keys = Object.keys(E);
  return keys.length ? E[keys[0]] : { name: '적', sprite: 'suitor', hp: 30, atk: 6, def: 2, lines: [], drop: [] };
}
function startBattle(key) {
  const b = BATTLES[key] || BATTLES.ithaca;
  const foes = b.foes.map(id => { const d = enemyDef(id); return { id, ...d, hp: d.hp, maxHp: d.hp }; });
  battle = { key, title: b.title, foes, log: ['전투가 시작되었다!'], turn: 'player', busy: false, guard: false };
  go('battle');
}
function battleAlive() { return battle.foes.filter(f => f.hp > 0); }
function bLog(t) { battle.log.unshift(t); if (battle.log.length > 6) battle.log.length = 6; }
function battleAction(kind) {
  if (!battle || battle.busy || battle.turn !== 'player') return;
  const st = totalStats();
  const target = battleAlive()[0];
  if (!target) return;
  if (kind === 'attack') {
    const dmg = Math.max(3, st.atk + Math.floor(Math.random() * 6) - target.def);
    target.hp -= dmg; bLog(`오디세우스의 공격! ${target.name}에게 ${dmg}의 피해.`);
    afterPlayer();
  } else if (kind === 'wisdom') {
    const q = pickQuiz();
    if (!q) { bLog('더 떠올릴 지식이 없다. 검을 쓰자.'); renderBattle(); return; }
    battle.busy = true;
    openQuiz(q, null);
    const watcher = setInterval(() => {
      if (!quiz) { clearInterval(watcher); battle.busy = false; renderBattle(); return; }
      if (!quiz.answered) return;
      clearInterval(watcher);
      const right = quiz.picked === quiz.q.answer;
      if (right) { const dmg = Math.max(10, st.wis * 2 + 8); target.hp -= dmg; bLog(`지혜의 일격! ${target.name}에게 ${dmg}의 큰 피해.`); }
      else bLog('생각이 흐트러졌다. 기회를 놓쳤다.');
      setTimeout(() => { closeQuiz(); battle.busy = false; afterPlayer(); }, 1600);
    }, 160);
  } else if (kind === 'guard') {
    battle.guard = true; bLog('방패를 들어 몸을 낮췄다.');
    afterPlayer();
  } else if (kind === 'item') {
    const heal = Object.keys(S.items).find(id => (CONTENT.ITEMS[id] || {}).kind === 'consume' && S.items[id] > 0);
    if (!heal) { bLog('쓸 만한 물건이 없다.'); renderBattle(); return; }
    S.items[heal]--;
    S.hp = Math.min(totalStats().maxHp, S.hp + 30);
    bLog(`${CONTENT.ITEMS[heal].name}을(를) 썼다. HP를 30 회복했다.`);
    afterPlayer();
  }
}
function afterPlayer() {
  renderBattle();
  if (!battleAlive().length) { setTimeout(winBattle, 650); return; }
  battle.turn = 'enemy';
  setTimeout(enemyTurn, 750);
}
function enemyTurn() {
  if (!battle) return;
  const st = totalStats();
  for (const f of battleAlive()) {
    let dmg = Math.max(2, f.atk + Math.floor(Math.random() * 4) - Math.floor(st.def / 2));
    if (battle.guard) dmg = Math.max(1, Math.floor(dmg / 2));
    S.hp -= dmg;
    bLog(`${f.name}의 공격! ${dmg}의 피해.`);
    if (f.lines && f.lines.length && Math.random() < 0.4) bLog(`「${f.lines[0]}」`);
  }
  battle.guard = false;
  battle.turn = 'player';
  if (S.hp <= 0) { S.hp = 1; bLog('쓰러질 뻔했다… 아테나의 도움으로 겨우 버텼다.'); }
  renderBattle(); renderTop(); save();
}
function winBattle() {
  if (!battle) return;
  const key = battle.key, title = battle.title;
  S.flags['battle_' + key] = true;
  let gold = 0;
  battle.foes.forEach(f => (f.drop || []).forEach(d => {
    const [k, v] = String(d).split(':');
    if (k === 'gold') gold += Number(v) || 0;
    else if (CONTENT.ITEMS[k]) giveItem(k);
  }));
  S.gold += gold; gainStars(8); gainExp(45);
  celebrate('승리!', title);
  logIt(title + ' — 승리');
  battle = null;
  save();
  const sc = SCENES[S.scene];
  if (!sc.next) { S.flags.won = true; go('ending'); return; }
  go('map');
  setTimeout(tryExit, 500);
}

/* ==================== 화면 ==================== */
const TABS = [['map', '항해 지도'], ['status', '상태·장비'], ['quests', '퀘스트'], ['collection', '오디세이 컬렉션'], ['chars', '인물도감'], ['lore', '지식 기록']];
const TABS_EN = [['map','Voyage Map'],['status','Hero & Gear'],['quests','Quests'],['collection','Odyssey Collection'],['chars','Characters'],['lore','Knowledge']];
function toggleLang() {
  S.lang = isEn() ? 'ko' : 'en';
  Store.put(S);
  go(S.route || 'start');
}
function go(route) {
  if (voyageGame) { clearTimeout(voyageGame.timer); voyageGame = null; }
  if (route !== 'map') stopLoop();
  S.route = route;
  document.body.classList.toggle('title-shell', route === 'start' || route === 'openings');
  dialogue = null; decision = null; shop = null; spotView = null;
  cancelAuto();
  if (!battle) quiz = null;
  renderOverlay();
  renderTop(); renderTabs();
  if (route === 'start') { AUDIO.play('title'); renderStart(); }
  else if (route === 'openings') { AUDIO.play('title'); renderOpeningGallery(); }
  else if (route === 'map') { AUDIO.play(MUSIC[S.scene] || 'sea'); renderMap(); }
  else if (route === 'status') renderStatus();
  else if (route === 'quests') renderQuests();
  else if (route === 'collection') renderCollection();
  else if (route === 'chars') renderChars();
  else if (route === 'lore') renderLore();
  else if (route === 'battle') { AUDIO.play('battle'); renderBattle(); }
  else if (route === 'ending') { AUDIO.play('victory'); renderEnding(); }
}
function startLoop() { stopLoop(); raf = requestAnimationFrame(loop); }
function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
function loop() {
  if (S.route !== 'map') { raf = 0; return; }
  tick++; stepMove(); drawFrame();
  raf = requestAnimationFrame(loop);
}
function renderTop() {
  const r = rankOf(), st = totalStats(), li = levelInfo();
  $('#topbar').innerHTML =
    `<div class="brand"><div class="eyebrow">A NOSTOS RPG · HOMERIC CYCLE</div>
      <h1>${L('오디세우스 <em>귀향의 바다</em>','ODYSSEUS <em>SEA OF HOMECOMING</em>')}</h1></div>
     <div class="topstats">${UI.rankBadge(r.name, r.tier)}
      <span class="chip">Lv.<b>${S.lv}</b></span>
      <span class="chip">★<b>${S.stars}</b></span>
      <span class="chip gold">◉<b>${S.gold}</b></span>
      <span class="chip">HP <b>${S.hp}</b>/${st.maxHp}</span>
      ${li.next ? `<span class="chip dim">${L('다음 레벨','Next level')} ${li.next.need - S.exp}</span>` : ''}
      <span class="chip btnchip lang-toggle" id="langChip">🌐 <b>${isEn() ? 'ENG' : 'KOR'}</b> / ${isEn() ? 'KOR' : 'ENG'}</span>
      <span class="chip btnchip" id="menuChip">☰ ${L('메뉴','Menu')}</span>
     </div>`;
  const lc = $('#langChip'); if (lc) lc.onclick = toggleLang;
  const mc = $('#menuChip');
  if (mc) mc.onclick = () => { AUDIO.unlock(); SYSTEM.openMenu(); };
}
function renderTabs() {
  $('#tabs').innerHTML = UI.tabs(isEn() ? TABS_EN : TABS, S.route);
  $$('#tabs [data-tab]').forEach(b => b.onclick = () => go(b.dataset.tab));
}
function beginFromTitle(savedGame) {
  AUDIO.unlock();
  if (savedGame && savedGame.started && !savedGame.flags?.won) {
    const chosenLang = S.lang || 'ko'; S = Object.assign(fresh(), savedGame); S.lang = chosenLang; mapCache = null;
    go('map');
    toast('이어하기 · ' + SCENES[S.scene].title, 'good');
    return;
  }
  const chosenLang = S.lang || 'ko'; S = fresh(); S.lang = chosenLang; S.started = true; mapCache = null;
  logIt('오디세우스의 귀향이 시작되었다'); save(); go('map');
}

function renderOpeningGallery() {
  const seen = ORDER.filter(k => S.seenScenes[k]);
  $('#screen').innerHTML = `<div class="startpage">
    ${UI.win('스토리 보기 · Chapter Stories', `<p class="extras-copy">도착한 장소의 이야기를 다시 볼 수 있습니다. 잠긴 장은 여정을 진행하면 열립니다.</p>
      <button type="button" id="openingFilmCard" class="btn btn--pri opening-card" style="width:100%;min-height:112px;margin-bottom:10px;background:linear-gradient(90deg,rgba(8,25,46,.92),rgba(76,45,17,.78)),url('assets/odyssey-opening-05-departure.jpg') center 43%/cover"><b>▶ 특별 서막 · 트로이에서 이타카로</b><small>전쟁의 마지막 날, 목마의 계략, 승리의 축제와 귀향 출항을 다시 봅니다</small></button>
      <div class="opening-grid">${ORDER.map((k, i) => {
        const unlocked = !!S.seenScenes[k];
        return UI.btn((unlocked ? '▶ ' : '🔒 ') + String(i + 1).padStart(2, '0') + '. ' + SCENES[k].title + `<small>${SCENES[k].sub}</small>`, {
          cls: 'opening-card ' + (unlocked ? 'btn--pri' : 'btn--ghost'), data: { chapter: k }, disabled: !unlocked, html: true
        });
      }).join('')}</div>
      <p class="dimtext" style="margin-top:10px">${seen.length}/10개 오프닝 해금</p>
      <div class="row row--end">${UI.btn('메인 화면으로', { id: 'backTitle', cls: 'btn--ghost' })}</div>`, { tone: 'gold' })}
  </div>`;
  $('#openingFilmCard').onclick = () => showOdysseyOpening(() => go('openings'), true);
  $$('#screen [data-chapter]').forEach(b => b.onclick = () => showChapterStory(b.dataset.chapter, () => go('openings'), true));
  const back = $('#backTitle'); if (back) back.onclick = () => go('start');
}

function showExtras() {
  const ov = $('#overlay'); if (!ov) return;
  ov.hidden = false;
  ov.innerHTML = `<div class="modal">${UI.win('모험 안내 · Adventure Guide', `<p class="extras-copy"><b>조작법</b><br>마우스 왼쪽 클릭 또는 방향키/WASD로 이동합니다. E·Enter·Space로 대화하거나 조사합니다. 마우스 오른쪽 클릭 또는 ESC는 메뉴를 엽니다.</p>
      <div class="hr"></div><p class="extras-copy"><b>여기에서 할 수 있는 일</b><br>배경 음악·효과음·이동 속도를 바꾸고, 저장 슬롯에 기록을 보관하거나 불러올 수 있습니다.</p>
      <div class="row row--end">${UI.btn('새 게임', { id: 'extraNew', cls: 'btn--danger' })}${UI.btn('저장 슬롯 관리', { id: 'extraLoad', cls: 'btn--ghost' })}${UI.btn('기능 설정', { id: 'extraSettings', cls: 'btn--pri' })}${UI.btn('닫기', { id: 'extraClose', cls: 'btn--ghost' })}</div>`, { tone: 'dark' })}</div>`;
  $('#extraNew').onclick = () => {
    if (!confirm('자동 저장된 현재 여정을 지우고 처음부터 시작할까요?')) return;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { }
    S = fresh(); mapCache = null; ov.hidden = true; ov.innerHTML = ''; go('start');
  };
  $('#extraLoad').onclick = () => SYSTEM.openLoad();
  $('#extraSettings').onclick = () => SYSTEM.openSettings();
  $('#extraClose').onclick = () => { ov.hidden = true; ov.innerHTML = ''; };
}

function drawOdysseyTitleArt() {
  const cv = $('#titleArt'); if (!cv) return;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  const W = cv.width, H = cv.height;
  g.fillStyle = '#0b0b1c'; g.fillRect(0, 0, W, H);
  /* 별과 달이 있는 귀향의 밤 */
  const stars = [[18,18],[43,31],[68,15],[102,25],[130,13],[260,23],[288,12],[319,36],[352,18],[371,47],[231,41]];
  g.fillStyle = '#f5e9b8'; stars.forEach(([x,y], i) => { g.fillRect(x, y, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1); });
  g.fillStyle = '#f3cf76'; g.fillRect(302, 25, 22, 22); g.fillStyle = '#fff1bd'; g.fillRect(306, 28, 16, 16); g.fillStyle = '#0b0b1c'; g.fillRect(318, 27, 8, 12);
  g.fillStyle = '#5d3154'; g.fillRect(0, 64, W, 24); g.fillStyle = '#a95045'; g.fillRect(0, 83, W, 10);
  g.fillStyle = '#182a48'; g.fillRect(0, 93, W, 83);
  g.fillStyle = '#1f6580'; g.fillRect(0, 112, W, 64);
  g.fillStyle = '#7cc3c5';
  [[8,119,38],[58,136,52],[248,117,46],[315,143,55],[16,160,73],[181,153,35],[275,168,58]].forEach(([x,y,w]) => g.fillRect(x,y,w,2));
  g.fillStyle = '#10495e';
  for (let x = 0; x < W; x += 32) g.fillRect(x + ((x / 32) % 2 ? 8 : 0), 102, 22, 3);
  /* 이타카의 어두운 섬 */
  g.fillStyle = '#111d2a'; g.beginPath(); g.moveTo(0,112); g.lineTo(0,87); g.lineTo(26,78); g.lineTo(49,90); g.lineTo(77,74); g.lineTo(112,98); g.lineTo(139,110); g.closePath(); g.fill();
  g.fillStyle = '#33484a'; g.fillRect(45,83,5,16); g.fillRect(40,86,16,5);
  /* 검은 배와 돛 위의 오디세우스 */
  try { PROPS.draw(g, 'V', 9, 7, 0); } catch (e) { }
  try { SPRITES.draw(g, 'odysseus', 'down', 0, 192, 123); } catch (e) { }
  g.fillStyle = '#c99a32'; g.fillRect(8, 8, W - 16, 2); g.fillRect(8, H - 10, W - 16, 2); g.fillRect(8, 8, 2, H - 16); g.fillRect(W - 10, 8, 2, H - 16);
  g.fillStyle = '#f5d985'; g.font = '700 10px Pretendard, sans-serif'; g.textAlign = 'left'; g.fillText('HOMEWARD ACROSS THE AEGEAN', 18, H - 18);
}

function renderStart() {
  const savedGame = Store.load();
  const hasSave = !!(savedGame && savedGame.started && !savedGame.flags?.won);
  const savedScene = hasSave ? (SCENES[savedGame.scene] || SCENES.ogygia) : null;
  $('#screen').innerHTML = `<div class="startpage">
    <section class="title-hero" aria-label="오디세우스 귀향의 바다 시작 화면">
      <img class="title-art" src="assets/odyssey-title-keyart-hd.jpg" alt="폭풍의 바다에서 귀향선을 이끄는 오디세우스와 하늘의 아테나">
      <div class="title-veil"></div>
      <button type="button" id="titleLang" class="btn btn--ghost lang-toggle" style="position:absolute;right:22px;top:22px;z-index:5">🌐 <b>${isEn() ? 'ENG' : 'KOR'}</b> / ${isEn() ? 'KOR' : 'ENG'}</button>
      <div class="title-content"><p class="title-kicker">GREEK MYTHOLOGY RPG · HD EDITION</p>
      <div class="title-copy"><h1>${L('오디세우스<br>귀향의 바다','ODYSSEUS<br>SEA OF HOMECOMING')}<small>THE ODYSSEY · SEA OF HOMECOMING</small></h1>
        <p>${L('신들의 뜻과 바다의 시련을 지나 이타카로 돌아가는 모험입니다. 탐험, 대화, 퀴즈, 결단, 전투를 통해 이야기를 완성하세요.','Cross the trials of gods and sea to return to Ithaca. Complete the epic through exploration, dialogue, quizzes, choices, and battles.')}</p>
        <div class="title-menu">
          ${UI.btn((hasSave ? L('▶ 이어하기','▶ Continue') : L('▶ 새로 시작하기','▶ New Journey')) + (hasSave ? `<small>${esc(isEn() ? sceneText(savedGame.scene).title : savedScene.title)} · Lv.${savedGame.lv || 1}</small>` : `<small>${L('오디세우스의 여정을 시작합니다','Begin Odysseus’s voyage')}</small>`), { id: 'titleStart', cls: 'btn--pri', html: true })}
          ${UI.btn(`📂 ${L('불러오기','Load Game')}<small>${L('저장 슬롯의 기록을 불러옵니다','Load a record from a save slot')}</small>`, { id: 'titleLoad', cls: 'btn--ghost', html: true })}
          ${UI.btn(`✦ ${L('스토리 보기','Chapter Stories')}<small>${L('도착한 챕터의 이야기를 다시 봅니다','Replay chapters you have reached')}</small>`, { id: 'titleOpenings', cls: 'btn--ghost', html: true })}
          ${UI.btn(`⚙ ${L('모험 안내','Adventure Guide')}<small>${L('조작법 · 설정 · 저장 관리','Controls · settings · save management')}</small>`, { id: 'titleExtras', cls: 'btn--ghost', html: true })}
        </div>
        ${hasSave ? '<p class="dimtext" style="margin-top:8px">진행 상황은 이 브라우저에 자동 저장됩니다.</p>' : ''}
      </div></div>
    </section>
  </div>`;
  $('#titleStart').onclick = () => {
    if (savedGame && savedGame.started && !savedGame.flags?.won) return beginFromTitle(savedGame);
    const chosenLang = S.lang || 'ko'; S = fresh(); S.lang = chosenLang; S.started = true; mapCache = null;
    logIt('오디세우스의 귀향이 시작되었다'); save();
    showOdysseyOpening(() => showChapterStory(S.scene, () => go('map')));
  };
  $('#titleLoad').onclick = () => { AUDIO.unlock(); SYSTEM.openLoad(); };
  $('#titleOpenings').onclick = () => go('openings');
  $('#titleExtras').onclick = () => { AUDIO.unlock(); showExtras(); };
  $('#titleLang').onclick = toggleLang;
}

function renderStartLegacy() {
  const seen = ORDER.filter(k => S.seenScenes[k]).length;
  const savedGame = Store.load();
  const hasSave = !!(savedGame && savedGame.started && !savedGame.flags?.won);
  const savedScene = hasSave ? (SCENES[savedGame.scene] || SCENES.ogygia) : null;
  $('#screen').innerHTML = `<div class="startpage">
    ${UI.win('THE ODYSSEY', `<div class="hero">
      <div class="por">${hdPortrait('odysseus','오디세우스')}</div>
      <div><h2>트로이가 무너진 뒤,<br>진짜 이야기가 시작된다</h2>
        <p>오디세우스가 되어 신들의 뜻과 바다의 괴물, 동료의 선택을 헤쳐 나가세요.
           장소마다 <b>신화의 시험</b>과 <b>퀘스트</b>가 기다립니다.
           풀어낼수록 별이 쌓여 등급이 오르고, 상자에서 원전의 보물이 나옵니다.</p>
        <div class="row">
          ${hasSave ? UI.btn('이어하기 ▶ ' + savedScene.title + ' · Lv.' + (savedGame.lv || 1) + ' · ★' + (savedGame.stars || 0), { id: 'cont', cls: 'btn--pri btn--big' }) : ''}
          ${UI.btn('📂 불러오기', { id: 'loadBtn', cls: 'btn--ghost btn--big' })}
          ${UI.btn(hasSave ? '처음부터 새로 시작' : '귀향을 시작한다 ▶', { id: 'begin', cls: hasSave ? 'btn--ghost btn--big' : 'btn--pri btn--big' })}
          ${UI.btn('⚙️ 기능설정', { id: 'setBtn', cls: 'btn--ghost btn--big' })}
        </div>
        ${hasSave ? '<p class="dimtext" style="margin-top:8px">진행 상황은 이 컴퓨터의 브라우저에 자동 저장됩니다.</p>' : ''}
      </div></div>`, { tone: 'gold' })}
    ${UI.win('여정 · 열 개의 장', `<div class="chapters">${ORDER.map((k, i) => `
      <div class="chapter ${S.seenScenes[k] ? 'on' : ''}"><b>${String(i + 1).padStart(2, '0')}</b>
        <span>${esc(SCENES[k].title)}</span><small>${esc(SCENES[k].sub)}</small></div>`).join('')}</div>
      <p class="dimtext">${seen}/10 장 방문 · 방향키나 WASD로 이동, E 또는 화면을 눌러 접촉</p>`, { tone: 'dark' })}
  </div>`;
  const b = $('#begin'); if (b) b.onclick = () => {
    AUDIO.unlock();
    if (hasSave && !confirm('저장된 여정을 지우고 처음부터 시작할까요?')) return;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { }
    S = fresh(); S.started = true; mapCache = null;
    logIt('오디세우스의 귀향이 시작되었다'); save(); go('map');
  };
  const c = $('#cont'); if (c) c.onclick = () => {
    AUDIO.unlock();
    if (savedGame) { S = Object.assign(fresh(), savedGame); mapCache = null; }
    go('map');
    toast('이어하기 · ' + SCENES[S.scene].title, 'good');
  };
  const lb = $('#loadBtn'); if (lb) lb.onclick = () => { AUDIO.unlock(); SYSTEM.openLoad(); };
  const sb = $('#setBtn'); if (sb) sb.onclick = () => { AUDIO.unlock(); SYSTEM.openSettings(); };
}
function renderMap() {
  S.route = 'map';
  const sc = SCENES[S.scene], scLabel = sceneText(S.scene), idx = ORDER.indexOf(S.scene);
  $('#screen').innerHTML = `<div class="stage">
    <section class="screen">
      ${UI.win(scLabel.title + ' · ' + (idx + 1) + '/10', `
        <div class="voyage-frame"><div class="viewport voyage-map-art">
          <div class="voyage-map-plaque">${esc(scLabel.title)}<small>THE VOYAGE RECORD · CHAPTER ${String(idx + 1).padStart(2,'0')}</small></div>
          <canvas id="map" class="cv" width="${CW * 2}" height="${CH * 2}" aria-label="${esc(scLabel.title)} map"></canvas>
          <div id="labels" class="labels"></div>
          <div id="mapHint" class="map-hint" hidden></div>
          <div id="dlg" class="dlgwrap"></div>
        </div><div id="herobar" class="herobar"></div></div>`, { tone: 'blue', pad: false })}
      <div id="msg"></div>
      ${UI.dpad()}
    </section>
    <aside id="panel" class="side"></aside>
  </div>`;
  placePlayer();
  renderPanel();
  showMsg(scLabel.sub + L(' — 주변을 살펴보세요. (클릭으로 이동·대화, 오른쪽 클릭은 메뉴)',' — Explore the area. Click to move or talk; right-click for the menu.'));
  const cvs = $('#map');
  cvs.onclick = mapClick;
  cvs.oncontextmenu = e => { e.preventDefault(); AUDIO.unlock(); SYSTEM.openMenu(); };
  $$('.pad-btn').forEach(b => {
    const d = b.dataset.dir;
    if (d === 'ok') { b.onclick = interact; return; }
    b.onpointerdown = e => { e.preventDefault(); keys[d] = true; };
    b.onpointerup = b.onpointerleave = b.onpointercancel = () => keys[d] = false;
  });
  startLoop(); drawFrame();
  if (!S.storySeen || !S.storySeen[S.scene]) setTimeout(() => showChapterStory(S.scene), 80);
}
function renderPanel() {
  const p = $('#panel'); if (!p) return;
  const idx = Math.max(0, ORDER.indexOf(S.scene));
  const st = totalStats(), r = rankOf(), li = levelInfo();
  const qs = sceneQuests(S.scene);
  const main = localizedQuest(qs.find(q => q.type === 'main'));
  const sideOpen = qs.filter(q => q.type === 'side' && !(S.quests[q.id] || {}).done);
  const pool = scenePool(), doneQ = pool.filter(q => S.quizDone[q.id]).length;
  const eq = ['weapon', 'armor', 'relic'].map(s => S.equip[s] ? CONTENT.ITEMS[S.equip[s]] : null);
  const goalOpen = true;
  /* 오른쪽 세로 패널: 할 일 → 현재 목표 → 기록. 목표를 항상 보면서 움직인다 */
  const spots = spotList();
  const spotDone = spots.filter(sp => S.spotSeen[sp.key]).length;
  p.innerHTML =
    decisionPanel() +
    (spots.length ? UI.win(L('둘러보기','Explore'), UI.gauge(L('살펴본 곳','Places examined'), spotDone, spots.length, 'quest') +
      `<div class="sq">${L('🔍 오브젝트 아래의 이름표를 눌러 살펴보세요.','🔍 Select the label below an object to examine it.')}${spots.some(sp => sp.art) ? L(' 🖼 표시는 실제 명화 감상입니다.',' 🖼 marks a real artwork.') : ''}</div>`, { tone: 'dark' }) : '') +
    UI.win(L('현재 목표','Current Objective'),
      UI.btn(goalOpen ? L('▾ 현재 목표 접기','▾ Collapse objective') : L('▸ 현재 목표 펼치기','▸ Expand objective'), { id: 'goalFold', cls: 'btn--ghost btn--wide' }) +
      (goalOpen ? ((main ? `<div class="qgoal"><b>${esc(main.title)}</b><p>${esc(main.goal)}</p>
        <ul class="qsteps">${(main.steps || []).map(s => `<li class="${stepDone(s.check) ? 'ok' : ''}">${stepDone(s.check) ? '✔' : '□'} ${esc(s.text)}</li>`).join('')}</ul></div>` : '') +
      UI.gauge(L('이 장의 시험','Chapter trial'), doneQ, pool.length || 1, 'quest') +
      (pickQuiz()
        ? UI.btn(L('신화의 시험을 본다 (','Take the myth trial (') + (pool.length - doneQ) + L('문제 남음)',' remaining)'), { id: 'quizGo', cls: 'btn--pri btn--wide' })
        : `<p class="dimtext">${L('이 장의 시험을 모두 마쳤습니다.','All trials in this chapter are complete.')}</p>`) +
      (sideOpen.length ? `<div class="sidelist"><b>곁가지 퀘스트</b>${sideOpen.map(q => `<div class="sq">◆ ${esc(q.title)}<small>${esc(q.goal)}</small></div>`).join('')}</div>` : '')) :
      `<div class="sq"><b>${main ? esc(main.title) : '진행 중인 목표'}</b><small>${main ? esc(main.goal) : '목표를 확인하려면 펼치세요.'}</small></div>`),
      { tone: 'gold' }) +
    UI.win(L('기록','Journal'), `<div class="loglist">${S.log.slice(0, 5).map(x => `<div class="logline">${esc(x.text)}</div>`).join('') || `<div class="logline">${L('아직 기록이 없습니다.','No records yet.')}</div>`}</div>`, { tone: 'dark' });
  /* 아래 가로 바: 오디세우스 상태 (초상화·게이지·능력치·장비) */
  const hb = $('#herobar');
  if (hb) {
    hb.innerHTML = UI.win(null, `<div class="hero-strip hero-vertical">
      <div class="hs-por"><img src="assets/portrait-hd-odysseus.jpg?v=voyage-ui-20260813" alt="오디세우스"></div>
      <div class="hs-id"><b>${L('오디세우스','Odysseus')}</b><span>${esc(r.name)} · Lv.${S.lv}</span></div>
      <div class="hs-gauges">${UI.gauge('HP', S.hp, st.maxHp, 'hp')}${UI.gauge('MP', S.mp, S.maxMp, 'mp')}${UI.gauge(L('사기','Resolve'), S.resolve == null ? 70 : S.resolve, 100, 'quest')}${li.next ? UI.gauge('EXP', S.exp - li.curNeed, li.next.need - li.curNeed, 'exp') : ''}</div>
      <div class="hs-right">
        <div class="hs-stats">${[[L('힘','Power'), st.atk], [L('방어','Guard'), st.def], [L('지혜','Wisdom'), st.wis], [L('별','Stars'), S.stars], [L('드라크마','Drachma'), S.gold]].map(x => `<span>${x[0]}<b>${x[1]}</b></span>`).join('')}</div>
        <div class="hs-equip">${eq.map((it, i) => `<span class="eq ${it ? 'on' : ''}">${(isEn()?['Weapon','Armor','Relic']:['무기','방어','보물'])[i]}<b>${it ? esc(it.name) : '—'}</b></span>`).join('')}</div>
      </div>
      <div class="voyage-destination"><b>${L('최종 목적지 · 이타카의 집','Final destination · Home in Ithaca')}</b>${L('귀향 여정','Homecoming')} ${idx + 1}/10 · ${idx < 9 ? (9 - idx) + L('개 장 남음',' chapters remaining') : L('문턱까지 도착','At the threshold')}</div>
    </div>`, { tone: 'dark' });
  }
  const vf = document.querySelector('.voyage-frame');
  if (vf && innerWidth > 900) vf.style.height = Math.round(vf.clientWidth * CH / (CW + 208)) + 'px';
  $$('#panel [data-dec]').forEach(b => {
    const d = sceneDecisions().find(x => x.flag === b.dataset.dec);
    if (d) b.onclick = () => openDecision(d);
  });
  const qb = $('#quizGo');
  if (qb) qb.onclick = () => { const q = pickQuiz(); if (q) openQuiz(q, null); };
  const gf = $('#goalFold'); if (gf) gf.hidden = true;
  const foldKeys = spots.length ? ['todo', 'explore', 'goal', 'log'] : ['todo', 'goal', 'log'];
  $$('#panel > .win').forEach((w, i) => {
    const key = foldKeys[i] || ('panel' + i), hd = w.querySelector('.win-hd'), bd = w.querySelector('.win-bd');
    if (!hd || !bd) return;
    S.panelFold = S.panelFold || {}; const open = !S.panelFold[key];
    bd.hidden = !open; hd.classList.add('fold-head'); hd.dataset.fold = key; hd.tabIndex = 0; hd.setAttribute('role', 'button'); hd.setAttribute('aria-expanded', String(open));
    const mark = document.createElement('span'); mark.className = 'fold-arrow'; mark.textContent = open ? '▾' : '▸'; hd.appendChild(mark);
    const toggle = () => { S.panelFold[key] = !S.panelFold[key]; save(); renderPanel(); };
    hd.onclick = toggle; hd.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } };
  });
  const vg = $('#voyageGo'); if (vg) vg.onclick = () => openVoyageGame(false);
  const rb = $('#resolveRest'); if (rb) rb.onclick = () => { if (S.mp < 5 || S.resolve >= 100) return; S.mp -= 5; setResolve(15); toast('숨을 고르고 사기 +15', 'good'); save(); renderPanel(); renderTop(); };
}
/* 「이곳에서 할 일」 — 결단 이벤트 목록 */
function decisionPanel() {
  const list = sceneDecisions();
  const ready = list.filter(decisionReady);
  const doneN = list.filter(d => S.flags[d.flag]).length;
  const c = voyageChallenge(), miniDone = !!(S.minisDone || {})[c.id];
  const book = (isEn() ? BOOK_ROUTE_EN : BOOK_ROUTE)[S.scene] || ['', ''];
  const voyageTitles={atk:L('키잡이의 판단','Helmsman’s Judgment'),def:L('파도의 호흡','Rhythm of the Waves'),wis:L('돛의 균형','Balance of the Sail')};
  const routeStory = `<div class="qgoal"><b>📖 ${L('귀향 서사','Homecoming Epic')} · ${book[0]}</b><p>${book[1]}</p>${UI.gauge(L('이타카의 집까지','Journey to Ithaca'),ORDER.indexOf(S.scene)+1,ORDER.length,'quest')}</div>`;
  const body = routeStory + (ready.length
    ? ready.map(d => UI.btn('◆ ' + (isEn() ? (DECISION_TITLE_EN[d.flag]||d.title) : d.title), { cls: 'btn--wide', data: { dec: d.flag } })).join('')
    : (doneN >= list.length
      ? `<p class="dimtext">${L('이곳에서 할 일을 모두 마쳤습니다.','All tasks here are complete.')}</p>`
      : `<p class="dimtext">${L('인물과 더 대화하거나 시험을 풀면 새로운 선택이 열립니다.','Speak with characters or pass a trial to unlock another choice.')}</p>`))
    + (list.length ? UI.gauge(L('결단','Decisions'), doneN, list.length, 'quest') : '') +
    UI.btn((miniDone ? '✔ ' : '⛵ ') + L('항해 시련 · ','Sea Trial · ') + (voyageTitles[c.stat]||c.title), { id: 'voyageGo', cls: 'btn--wide' + (miniDone ? ' btn--ghost' : ' btn--pri') }) +
    UI.gauge(L('사기','Resolve'), S.resolve == null ? 70 : S.resolve, 100, 'quest') +
    `<div class="challenge-note">${L('3라운드 중 2번 성공하면 영구 능력치 +1. 실패하면 사기 -15이며, 사기가 매우 낮으면 힘과 지혜가 감소합니다.','Win 2 of 3 rounds for a permanent +1 stat. Failure costs 15 Resolve; very low Resolve reduces Power and Wisdom.')}</div>` +
    UI.btn(L('마음 다잡기 (MP 5 → 사기 +15)','Recover Focus (MP 5 → Resolve +15)'), { id: 'resolveRest', cls: 'btn--wide btn--ghost' });
  return UI.win(L('이곳에서 할 일','Tasks Here'), `<div class="declist">${body}</div>`, { tone: 'blue' });
}
function renderStatus() {
  const st = totalStats(), r = rankOf(), li = levelInfo();
  const owned = Object.keys(S.items).filter(id => S.items[id] > 0 && CONTENT.ITEMS[id]);
  $('#screen').innerHTML = `<div class="two">
    ${UI.win('오디세우스 · ' + r.name, `<div class="statwrap">
      <div class="por">${hdPortrait('odysseus','오디세우스')}</div>
      <div class="statcol">
        ${UI.gauge('HP', S.hp, st.maxHp, 'hp')}${UI.gauge('MP', S.mp, S.maxMp, 'mp')}
        ${li.next ? UI.gauge('EXP', S.exp - li.curNeed, li.next.need - li.curNeed, 'exp') : ''}
        ${UI.stats([['레벨', S.lv], ['힘', st.atk], ['방어', st.def], ['지혜', st.wis], ['별', S.stars], ['드라크마', S.gold]])}
        <div class="titles"><b>얻은 칭호</b>${S.titles.length ? S.titles.map(t => {
    const d = (CONTENT.TITLES || []).find(x => x.id === t);
    return `<span class="titlechip">${esc(d ? d.name : t)}</span>`;
  }).join('') : '<span class="dimtext">아직 없습니다</span>'}</div>
      </div></div>
      <div class="rankline">${CONTENT.RANKS.map(x => `<span class="rk ${S.stars >= rankNeed(x) ? 'on' : ''}" title="${esc(x.desc || '')}">${esc(x.name)}<small>★${rankNeed(x)}</small></span>`).join('')}</div>`,
    { tone: 'gold' })}
    ${UI.win('소지품 · ' + owned.length + '종', `<div class="item-legend">희귀도: 일반 · 고급 · 희귀 · ◆ 신화급. 신화급 장비에는 고유 효과가 있습니다.</div><div class="items">${owned.length ? owned.map(id => {
      const it = CONTENT.ITEMS[id];
      return UI.itemCell({
        name: itemDisplayName(it), icon: itemVisual(id,'item-thumb'), data:{item:id},
        qty: S.items[id], rarity: it.rarity || 0, desc: it.desc + (it.effect ? ' · ✦ ' + it.effect : ''), equipped: Object.values(S.equip).includes(id)
      });
    }).join('') : '<p class="dimtext">아직 아무것도 없습니다. 상자를 열고 퀘스트를 완료하세요.</p>'}</div>`, { tone: 'dark' })}
  </div>`;
  paintIcons();
  $$('[data-item]').forEach(b=>b.onclick=()=>openItemRecord(b.dataset.item));
}
function paintIcons() {
  $$('canvas.icon[data-icon]').forEach(cv => {
    const it = CONTENT.ITEMS[cv.dataset.icon];
    if (!it || !it.icon) return;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    PX.drawRows(g, it.icon, 0, 0);
  });
}
function renderQuests() {
  const all = allQuests(), doneN = all.filter(q => (S.quests[q.id] || {}).done).length;
  $('#screen').innerHTML = UI.win(`퀘스트 · ${doneN}/${all.length} 완료`,
    UI.gauge('전체 진행', doneN, all.length, 'quest') +
    `<div class="qlist">${ORDER.map(k => {
      const qs = sceneQuests(k); if (!qs.length) return '';
      const seen = S.seenScenes[k];
      return `<div class="qgroup ${seen ? '' : 'locked'}"><h3>${esc(SCENES[k].title)}${seen ? '' : ' <small>아직 도착하지 않음</small>'}</h3>
        ${qs.map(q => {
        const st = S.quests[q.id] || { done: false, steps: {} };
        if (!seen) return `<div class="qcard hidden">??? <small>이 장에 도착하면 열립니다</small></div>`;
        return `<div class="qcard ${st.done ? 'done' : ''} ${q.type}">
            <div class="qhead"><span class="qtype">${q.type === 'main' ? '메인' : '곁가지'}</span><b>${esc(q.title)}</b>${st.done ? '<span class="qdone">완료</span>' : ''}</div>
            <p>${esc(q.detail || q.goal)}</p>
            <ul class="qsteps">${(q.steps || []).map(s => {
          const ok = st.steps[s.id] || (k === S.scene && stepDone(s.check, k));
          return `<li class="${ok ? 'ok' : ''}">${ok ? '✔' : '□'} ${esc(s.text)}</li>`;
        }).join('')}</ul>
            <div class="qreward">보상 ★${(q.reward || {}).stars || 0} · ◉${(q.reward || {}).gold || 0}${((q.reward || {}).items || []).map(i => ' · ' + esc((CONTENT.ITEMS[i] || {}).name || i)).join('')}</div>
          </div>`;
      }).join('')}</div>`;
    }).join('')}</div>`, { tone: 'gold' });
}
function collectionUnlocked(c) { return !!(S.collections && S.collections[c.id]); }
function cultureFor(c) { return CULTURE_LINKS.find(x => x.item === c.id && x.scene === c.scene) || CULTURE_LINKS.find(x => x.item === c.id); }
function renderCollectionDetail(ov, c, newly, sp) {
  const live = cultureFor(c);
  const body = `<div class="artifact-sheet"><div class="artifact-hero" style="background-image:url('${esc(c.img)}')"><div class="artifact-title">${newly ? '<span class="new">새로운 오디세이 수집품</span>' : ''}<h2>${esc(c.name)}</h2><div>${esc(c.kind)}</div></div></div><div class="artifact-body"><div><img class="artifact-object" src="${esc(c.img)}" alt="${esc(c.name)}"><div class="artifact-meta"><span><b>발견 장소</b><br>${esc(c.place)}</span><span><b>관련 장</b><br>${esc(SCENES[c.scene].title)}</span></div></div><div class="artifact-story"><h3>이 물건에 담긴 이야기</h3><p>${esc(c.story)}</p><div class="learning-points"><section><b>무엇을 상징할까?</b>${esc(c.symbol)}</section><section><b>이것만은 기억해요</b>${esc(c.remember)}</section></div>${live ? `<div class="today-box"><b>🌍 신화는 지금도 살아 있어요</b><p><strong>${esc(live.title)}</strong><br>${esc(live.text)}<br><small>${esc(live.source)}</small></p></div>` : ''}${sp ? `<p style="margin-top:14px"><b>항해자의 현장 기록</b><br>${esc(sp.text)}</p>` : ''}</div></div><footer class="artifact-footer"><p><b>출전·그림 안내</b><br>${esc(c.source)}<br>삽화는 학습을 위해 신화와 고대 유물을 참고해 만든 상상 복원도입니다.</p>${UI.btn('기록 닫기', { id:'spotClose', cls:'btn--pri' })}</footer></div>`;
  ov.hidden = false;
  ov.innerHTML = '<div class="modal">' + UI.win('오디세이 컬렉션 · ' + c.name, body, { tone:'gold' }) + '</div>';
  $('#spotClose').onclick = () => { spotView = null; renderOverlay(); };
}
function renderCollection() {
  const found = COLLECTIONS.filter(collectionUnlocked).length;
  $('#screen').innerHTML = UI.win(`오디세이 컬렉션 · ${found}/${COLLECTIONS.length}`,
    `<div class="collection-summary"><div><h2>이타카 귀향 박물관</h2><p>각 섬에서 중요한 물건을 조사해 모으세요. 한 점마다 모험의 원전 이야기, 물건이 상징하는 생각, 기억할 핵심이 열립니다.</p></div><div class="collection-count">${found} / ${COLLECTIONS.length}<small>수집 진행도</small></div></div>${UI.gauge('', found, COLLECTIONS.length, 'quest')}<div class="museum-grid">${COLLECTIONS.map((c,i)=>{const on=collectionUnlocked(c);return `<button class="museum-card${on?'':' locked'}" ${on?`data-col="${esc(c.id)}"`:''}><span class="museum-no">No. ${String(i+1).padStart(2,'0')}</span><img src="${esc(c.img)}" alt=""><b>${on?esc(c.name):'???'}</b><small>${on?esc(c.kind):esc(SCENES[c.scene].title)+' · 미발견'}</small></button>`}).join('')}</div><h2 class="culture-title">🌍 오늘의 말과 문화 속 오디세이</h2><div class="culture-grid">${CULTURE_LINKS.map(x=>{const on=!!S.seenScenes[x.scene];return `<article class="culture-card${on?'':' off'}"><b>${on?esc(x.title):'???'}</b><small>${esc(SCENES[x.scene].title)} · ${on?esc(x.source):'아직 잠김'}</small><p>${on?esc(x.text):'해당 장에 도착하면 오늘날과 이어지는 이야기가 열립니다.'}</p></article>`}).join('')}</div>`, {tone:'gold'});
  $$('[data-col]').forEach(b => b.onclick = () => { const c=COLLECTIONS.find(x=>x.id===b.dataset.col); if(c){spotView={collection:c};renderOverlay();} });
}
function renderChars() {
  const ids = Object.keys(NPCS);
  $('#screen').innerHTML = UI.win('인물도감 · ' + ids.filter(i => S.met[i]).length + '/' + ids.length,
    `<div class="item-legend">그리스와 로마에서 이름이 실제로 다른 신에게만 두 이름과 IPA 발음을 표시합니다. 예: 아테나(Athena) · 미네르바(Minerva)</div><p class="dimtext">대화한 인물은 선명한 초상화와 기록이 열리고, 만나지 않은 인물만 흐리게 표시됩니다.</p>
     <div class="chargrid">${ids.map(id => {
      const n = NPCS[id], met = S.met[id];
      return `<div class="charcard ${met ? '' : 'off'}" ${met ? `data-char="${esc(id)}" role="button" tabindex="0" aria-label="${esc(n.name)} 인물 기록 열기"` : ''}>
        <div class="por">${met ? codexPortrait(id, n.name) : `<canvas width="80" height="96" data-pt=""></canvas>`}</div>
        <b>${met ? esc(n.name) : '???'}</b><small>${met ? esc(n.role) : '아직 만나지 않았습니다'}</small>${met ? divineMeta(id) : ''}
        ${met ? `<p class="chartalk">「${esc(n.repeat[0])}」</p>` : ''}</div>`;
    }).join('')}</div>`, { tone: 'dark' });
  paintPortraits();
  $$('[data-char]').forEach(card=>{const open=()=>{spotView={character:card.dataset.char};renderOverlay()};card.onclick=open;card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}}});
}
/* 같은 스프라이트를 쓰는 적이 여럿일 때 개체별로 살짝 다른 색조를 입힌다 */
const TINTS = [null, [PAL.se2, 0.18], [PAL.rd2, 0.16], [PAL.gr2, 0.16], [PAL.pu2, 0.18]];
function paintPortraits() {
  $$('canvas[data-pt]').forEach(cv => {
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    const id = cv.dataset.pt;
    if (id) {
      try { PORTRAITS.draw(g, id, 0, 0); } catch (e) { }
      const t = TINTS[Number(cv.dataset.tint || 0) % TINTS.length];
      if (t) { g.save(); g.globalAlpha = t[1]; g.fillStyle = t[0]; g.fillRect(4, 4, 72, 88); g.restore(); }
    }
    else { g.fillStyle = PAL.ink1; g.fillRect(0, 0, 80, 96); g.fillStyle = PAL.ink3; g.font = '700 28px Pretendard, sans-serif'; g.textAlign = 'center'; g.fillText('?', 40, 58); }
  });
}
function renderLore() {
  const L = CONTENT.LORE || [];
  $('#screen').innerHTML = UI.win('지식 기록 · ' + L.filter(x => S.seenScenes[x.scene]).length + '/' + L.length,
    `<div class="lorelist">${L.map(x => {
      const on = S.seenScenes[x.scene];
      return `<div class="lore ${on ? '' : 'off'}"><div class="lorehead"><b>${on ? esc(x.title) : '???'}</b><small>${esc(x.book || '')}</small></div>
        <p>${on ? esc(x.text) : '해당 장소에 도착하면 열립니다.'}</p></div>`;
    }).join('')}</div>`, { tone: 'gold' });
}
function renderBattle() {
  if (!battle) return;
  const st = totalStats();
  $('#screen').innerHTML = UI.win('전투 · ' + battle.title, `<div class="battle">
    <div class="foes">${battle.foes.map((f, i) => {
    const dup = battle.foes.filter(x => x.sprite === f.sprite).length > 1;
    return `<div class="foe ${f.hp <= 0 ? 'down' : ''}">
      <div class="por">${hdPortrait(f.sprite, f.name)}</div>
      <b>${esc(f.name)}</b>${UI.gauge('HP', Math.max(0, f.hp), f.maxHp, 'hp')}</div>`;
  }).join('')}</div>
    <div class="blog">${battle.log.map(l => `<div>${esc(l)}</div>`).join('')}</div>
    <div class="me"><div class="por">${hdPortrait('odysseus','오디세우스')}</div>
      <div>${UI.gauge('HP', S.hp, st.maxHp, 'hp')}${UI.stats([['힘', st.atk], ['방어', st.def], ['지혜', st.wis]])}</div></div>
    <div class="actions">
      ${UI.btn('검으로 공격', { id: 'bAtk', cls: 'btn--pri' })}
      ${UI.btn('지혜의 일격 · 문제를 푼다', { id: 'bWis', cls: 'btn--pri' })}
      ${UI.btn('방어', { id: 'bGuard', cls: 'btn--ghost' })}
      ${UI.btn('물건 사용', { id: 'bItem', cls: 'btn--ghost' })}
    </div></div>`, { tone: 'gold' });
  paintPortraits();
  const map = { bAtk: 'attack', bWis: 'wisdom', bGuard: 'guard', bItem: 'item' };
  Object.keys(map).forEach(id => { const b = $('#' + id); if (b) b.onclick = () => battleAction(map[id]); });
}
function renderEnding() {
  const all = allQuests(), doneN = all.filter(q => (S.quests[q.id] || {}).done).length;
  const quizAll = ORDER.reduce((a, k) => a + ((CONTENT.QUIZ[k] || []).length), 0);
  $('#screen').innerHTML = UI.win('귀향', `<div class="ending">
    <h2>오디세우스는 마침내 자기 집으로 돌아왔다</h2>
    <p>오기기아의 해변에서 시작한 귀향은 이타카 궁전과 올리브나무 침대 앞에서 끝납니다. 20년 만에 그는 자기 집 문턱을 넘었습니다. 힘으로만 이긴 것이 아니라, 참을 때를 알고 말할 때를 골랐기 때문입니다.</p>
    <div class="dec-lesson"><b>원전의 마지막 증거</b><br>페넬로페는 침대를 옮기라고 시험합니다. 살아 있는 올리브나무를 중심으로 오디세우스가 직접 만든 침대는 두 사람만 아는 비밀이었습니다. 그 대답으로 왕과 아내는 서로를 확인하고, 긴 귀향이 비로소 ‘집으로 돌아옴’이 됩니다.</div>
    <div class="endstats">
      <div><b>Lv.${S.lv}</b><span>최종 레벨</span></div>
      <div><b>★${S.stars}</b><span>모은 별</span></div>
      <div><b>${esc(rankOf().name)}</b><span>최종 등급</span></div>
      <div><b>${doneN}/${all.length}</b><span>퀘스트</span></div>
      <div><b>${Object.keys(S.quizDone).length}/${quizAll}</b><span>시험</span></div>
      <div><b>${Object.keys(S.items).length}종</b><span>보물</span></div>
    </div>
    <div class="row row--end">${UI.btn('여정을 다시 본다', { id: 'endLore', cls: 'btn--ghost' })}${UI.btn('처음부터 다시', { id: 'endReset', cls: 'btn--pri' })}</div>
  </div>`, { tone: 'gold' });
  const a = $('#endLore'); if (a) a.onclick = () => go('lore');
  const b = $('#endReset'); if (b) b.onclick = () => { if (confirm('처음부터 다시 시작할까요?')) { S = fresh(); mapCache = null; save(); go('start'); } };
}

/* ==================== 입력 ==================== */
const KEYMAP = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  a: 'left', d: 'right', w: 'up', s: 'down', A: 'left', D: 'right', W: 'up', S: 'down',
  'ㅁ': 'left', 'ㅇ': 'right', 'ㅈ': 'up', 'ㄴ': 'down'
};
function initInput() {
  window.addEventListener('keydown', e => {
    if (SYSTEM.active()) return;
    const k = KEYMAP[e.key];
    if (k) { e.preventDefault(); AUDIO.unlock(); keys[k] = true; }
    if (e.key === 'e' || e.key === 'E' || e.key === 'ㄷ' || e.key === 'Enter' || e.key === ' ') {
      if (S.route === 'map') { e.preventDefault(); interact(); }
    }
    if (e.key === 'm' || e.key === 'M') { AUDIO.unlock(); AUDIO.toggle(); }
    if (e.key === 'Escape') {
      if (quiz && !battle) closeQuiz();
      else if (shop) { shop = null; renderOverlay(); }
      else if (spotView) { spotView = null; renderOverlay(); }
      else if (decision) { decision = null; renderOverlay(); }
      else if (S.started) SYSTEM.openMenu();
    }
  });
  window.addEventListener('pointerdown', () => AUDIO.unlock(), { once: true });
  window.addEventListener('keyup', e => { const k = KEYMAP[e.key]; if (k) keys[k] = false; });
  window.addEventListener('blur', () => { keys = {}; });
  /* 저장은 300ms 디바운스라 창을 바로 닫으면 마지막 행동이 유실될 수 있다 — 종료 직전 즉시 기록 */
  window.addEventListener('beforeunload', () => { try { Store.put(S); } catch (e) { } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { try { Store.put(S); } catch (e) { } } });
}

/* ==================== 시작 ==================== */
function initSystem() {
  SYSTEM.init({
    key: 'odyssey_nostos',
    str: () => ({
      menu: '메뉴', save: '저장하기', load: '불러오기', settings: '기능설정',
      restart: '처음부터 새로 시작', toTitle: '타이틀로 돌아가기',
      close: '닫기', back: '뒤로', emptySlot: '— 빈 자리 —',
      slotTag: '저장할 자리를 고르세요. (이 컴퓨터의 브라우저에 저장됩니다)',
      confirmSave: n => n + '번 자리에 덮어써서 저장할까요?',
      confirmLoad: n => n + '번 자리의 기록을 불러올까요? 저장하지 않은 진행은 사라집니다.',
      confirmRestart: '지금까지의 여정을 지우고 처음부터 새로 시작할까요?',
      confirmTitle: '타이틀 화면으로 돌아갈까요? (자동 저장된 진행은 남습니다)',
      yes: '예', no: '아니오', on: '켜짐', off: '꺼짐',
      savedMsg: n => n + '번 자리에 저장했습니다.',
      noSaveHere: '지금은 저장할 수 없습니다.'
    }),
    getState: () => S,
    applyState: data => {
      S = Object.assign(fresh(), data);
      mapCache = null;
      save();
      go(S.flags && S.flags.won ? 'ending' : 'map');
      toast('기록을 불러왔습니다 · ' + SCENES[S.scene].title, 'good');
    },
    meta: () => ({
      t: SCENES[S.scene] ? SCENES[S.scene].title : '이타카',
      sub: 'Lv.' + S.lv + ' · ★' + S.stars + ' · ' + rankOf().name
    }),
    canSave: () => S.started && (S.route === 'map' || S.route === 'status' || S.route === 'quests' || S.route === 'collection' || S.route === 'chars' || S.route === 'lore'),
    onRestart: () => {
      try { localStorage.removeItem(SAVE_KEY); } catch (e) { }
      S = fresh(); S.started = true; mapCache = null;
      logIt('오디세우스의 귀향이 다시 시작되었다'); save(); go('map');
    },
    onTitle: () => { save(); go('start'); },
    settings: () => [
      { label: '🎵 배경 음악', value: AUDIO.musicOn(), onToggle: v => AUDIO.setMusic(v) },
      { label: '🔔 효과음', value: AUDIO.sfxOn(), onToggle: v => AUDIO.setSfx(v) },
      { label: '🏃 빠른 이동', value: !!S.fastMove, onToggle: v => { S.fastMove = v; save(); } }
    ]
  });
}
function init() {
  const style = document.getElementById('gameStyle');
  if (style) style.textContent = UI.CSS + EXTRA_CSS;
  const saved = Store.load();
  if (saved) S = Object.assign(fresh(), saved);
  migrateItemArtV2();
  calibrate();
  initSystem();
  initInput();
  go('start');
  if (saved && S.started && !S.flags.won) toast('저장된 여정을 이어서 합니다 · ' + SCENES[S.scene].title, 'good');
}
if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', init);
else init();
