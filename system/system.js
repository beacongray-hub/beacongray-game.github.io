/* engine/system.js — 저장 슬롯 5개 · 게임 메뉴 · 설정 · 확인 대화상자 (전역 SYSTEM 하나만 선언)
   오디세우스/황금사과 두 게임이 공유한다. 게임별 차이는 init(cfg) 로 주입한다.

   cfg = {
     key: 'odyssey3',                    // localStorage 슬롯 접두사
     str: () => ({ ... }),               // 아래 STR 목록의 문자열 (언어 전환 게임은 함수 안에서 분기)
     getState: () => S,                  // 저장할 상태 객체
     applyState: (data) => {},           // 불러온 상태 적용(화면 전환 포함)
     meta: () => ({ t:'현재 장 이름', sub:'Lv.3 · ★120' }),
     canSave: () => bool,                // 지금 저장 가능한가 (맵 화면 등)
     onRestart: () => {},                // 처음부터 다시
     onTitle: () => {},                  // 타이틀로
     settings: () => [ {label, value, onToggle} ... ],
     menuExtra: () => [ {label, fn} ... ]  // 게임별 추가 메뉴 (선택)
   }
   필요 문자열 키: menu save load settings restart toTitle close back emptySlot slotTag
     confirmSave confirmLoad confirmRestart confirmTitle yes no on off savedMsg noSaveHere */
"use strict";
const SYSTEM = (function () {

  const NSLOT = 5;
  let cfg = null, box = null, view = null;

  const CSS = `
#sysov{position:fixed;inset:0;z-index:70;display:none;place-items:center;background:rgba(5,3,8,.74);padding:16px;overflow:auto}
#sysov.show{display:grid}
#sysov .win{width:min(560px,94vw);margin:0}
.sys-list{display:grid;gap:6px}
.sys-list .btn{width:100%;text-align:center;justify-content:center}
.sys-slots{display:grid;gap:6px}
.sys-slot{display:grid;grid-template-columns:26px minmax(0,1fr) auto;gap:8px;align-items:center;
  padding:9px 11px;font:700 14px/1.4 system-ui,"Malgun Gothic",sans-serif;color:var(--iv3);
  background:var(--ink1);border:2px solid var(--gd0);box-shadow:inset 1px 1px 0 0 var(--gd1);cursor:pointer;text-align:left}
.sys-slot:hover{border-color:var(--gd2);color:var(--gd4)}
.sys-slot.empty{opacity:.55;font-weight:400}
.sys-slot .no{color:var(--gd3);font-family:ui-monospace,monospace}
.sys-slot small{display:block;font-size:11px;color:var(--iv1);font-weight:400}
.sys-slot .dt{font:600 11px ui-monospace,monospace;color:var(--gd2);white-space:nowrap}
.sys-confirm{text-align:center}
.sys-confirm p{margin:6px 0 14px;font-size:15px;line-height:1.7;color:var(--iv3);word-break:keep-all}
.sys-yn{display:flex;gap:10px;justify-content:center}
.sys-yn .btn{min-width:96px;justify-content:center}
.sys-set{display:grid;gap:6px}
.sys-set-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;
  padding:8px 11px;background:var(--ink0);border:1px solid var(--ink3)}
.sys-set-row b{font-size:14px;color:var(--iv3)}
.sys-foot{display:flex;gap:6px;justify-content:flex-end;margin-top:12px}
.sys-file-tools{display:grid;gap:7px;margin-bottom:12px;padding:11px;background:rgba(211,161,54,.08);border:1px solid var(--gd0)}
.sys-file-tools .btn{width:100%;justify-content:center;color:#fff3ca!important}
.sys-file-tools small{color:var(--iv1);line-height:1.55}
`;

  function init(c) {
    cfg = c;
    if (!document.getElementById('sysovStyle')) {
      const st = document.createElement('style');
      st.id = 'sysovStyle';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    if (!box) {
      box = document.createElement('div');
      box.id = 'sysov';
      document.body.appendChild(box);
      box.addEventListener('mousedown', e => { if (e.target === box) close(); });
      window.addEventListener('keydown', e => {
        if (e.key === 'Escape' && view) { e.stopPropagation(); close(); }
      }, true);
    }
  }
  function S(k, ...a) {
    const t = (cfg.str() || {})[k];
    return typeof t === 'function' ? t(...a) : (t != null ? t : k);
  }
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- 슬롯 ---------- */
  function slotKey(i) { return cfg.key + '_slot_' + i; }
  function readSlot(i) {
    try { const x = localStorage.getItem(slotKey(i)); return x ? JSON.parse(x) : null; } catch (e) { return null; }
  }
  function writeSlot(i) {
    const now = new Date();
    const p = n => String(n).padStart(2, '0');
    const rec = {
      meta: { ...cfg.meta(), date: `${p(now.getFullYear() % 100)}/${p(now.getMonth() + 1)}/${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}` },
      data: cfg.getState()
    };
    try { localStorage.setItem(slotKey(i), JSON.stringify(rec)); return rec; } catch (e) { return null; }
  }
  function safeName(s) { return String(s || 'myth-rpg').replace(/[^a-zA-Z0-9가-힣_-]+/g, '-').replace(/^-+|-+$/g, '') || 'myth-rpg'; }
  function exportSlot(i, rec) {
    if (!rec) return false;
    try {
      const pack={format:'myth-rpg-save',version:1,game:cfg.key,slot:i,exportedAt:new Date().toISOString(),record:rec};
      const blob=new Blob([JSON.stringify(pack,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download=safeName(cfg.key)+'-slot'+i+'-'+new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);return true;
    } catch(e){return false;}
  }
  function importSaveFile(file) {
    if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const raw=JSON.parse(String(reader.result||'')),rec=raw&&raw.format==='myth-rpg-save'?raw.record:raw;if(!rec||!rec.data||typeof rec.data!=='object')throw new Error('invalid');if(raw.game&&raw.game!==cfg.key)throw new Error('wrong-game');close();cfg.applyState(rec.data);}catch(e){confirmDone(e.message==='wrong-game'?'다른 게임의 저장 파일입니다. / This save belongs to another game.':'올바른 저장 파일이 아닙니다. / Invalid save file.');}};reader.onerror=()=>confirmDone('저장 파일을 읽지 못했습니다. / Could not read the save file.');reader.readAsText(file,'utf-8');
  }

  /* ---------- 표시 ---------- */
  function active() { return !!view; }
  function close() { view = null; if (box) { box.classList.remove('show'); box.innerHTML = ''; } }
  function show(title, bodyHTML, tone) {
    box.innerHTML = '<div>' + UI.win(title, bodyHTML, { tone: tone || 'gold' }) + '</div>';
    box.classList.add('show');
  }
  function footBtns(backMode) {
    return `<div class="sys-foot">${backMode ? UI.btn(S('back'), { id: 'sysBack', cls: 'btn--ghost' }) : ''}${UI.btn(S('close'), { id: 'sysClose', cls: 'btn--ghost' })}</div>`;
  }
  function bindFoot(backMode) {
    const b = document.getElementById('sysBack');
    if (b) b.onclick = () => openMenu();
    const c = document.getElementById('sysClose');
    if (c) c.onclick = close;
  }

  /* ---------- 메뉴 ---------- */
  function openMenu() {
    view = { mode: 'menu' };
    const extra = (cfg.menuExtra ? cfg.menuExtra() : []) || [];
    const rows = [
      { label: '💾 ' + S('save'), fn: () => openSave(), off: !cfg.canSave() },
      { label: '📂 ' + S('load'), fn: () => openLoad() },
      { label: '⚙️ ' + S('settings'), fn: () => openSettings() },
      ...extra,
      { label: '🔁 ' + S('restart'), fn: () => confirmBox(S('confirmRestart'), () => { close(); cfg.onRestart(); }) },
      { label: '🏛️ ' + S('toTitle'), fn: () => confirmBox(S('confirmTitle'), () => { close(); cfg.onTitle(); }) }
    ];
    show('☰ ' + S('menu'),
      `<div class="sys-list">${rows.map((r, i) => UI.btn(r.label, { cls: 'btn--wide' + (r.off ? ' btn--ghost' : ''), data: { sys: i } })).join('')}</div>` + footBtns(false));
    rows.forEach((r, i) => {
      const b = document.querySelector(`#sysov [data-sys="${i}"]`);
      if (b) b.onclick = () => { if (r.off) return; r.fn(); };
    });
    bindFoot(false);
  }

  function slotRows(mode) {
    let html = '<div class="sys-slots">';
    for (let i = 1; i <= NSLOT; i++) {
      const rec = readSlot(i);
      if (rec) {
        html += `<button type="button" class="sys-slot" data-slot="${i}">
          <span class="no">${i}.</span>
          <span>${esc(rec.meta.t)}<small>${esc(rec.meta.sub || '')}</small></span>
          <span class="dt">${esc(rec.meta.date || '')}</span></button>`;
      } else {
        html += `<button type="button" class="sys-slot empty" data-slot="${i}" ${mode === 'load' ? 'disabled' : ''}>
          <span class="no">${i}.</span><span>${esc(S('emptySlot'))}</span><span class="dt">--/--/-- --:--</span></button>`;
      }
    }
    return html + '</div>';
  }

  function openSave() {
    if (!cfg.canSave()) { openMenu(); return; }
    view = { mode: 'save' };
    show('💾 ' + S('save'), `<p class="dimtext" style="margin:0 0 8px">${esc(S('slotTag'))}</p>` + slotRows('save') + footBtns(true));
    document.querySelectorAll('#sysov [data-slot]').forEach(b => b.onclick = () => {
      const i = +b.dataset.slot;
      const occupied = !!readSlot(i);
      const doIt = () => {
        const rec=writeSlot(i),downloaded=exportSlot(i,rec);
        confirmDone(S('savedMsg', i)+(downloaded?' 저장 파일도 다운로드했습니다. / Save file downloaded.':' 저장 파일 다운로드에 실패했습니다. / File download failed.'));
      };
      if (occupied) confirmBox(S('confirmSave', i), doIt, () => openSave());
      else doIt();
    });
    bindFoot(true);
  }

  function openLoad() {
    view = { mode: 'load' };
    show('📂 ' + S('load'), `<div class="sys-file-tools">${UI.btn('📁 저장 파일 선택 / Import save file',{id:'sysImport',cls:'btn--pri'})}<small>저장할 때 내려받은 JSON 파일을 선택하면 진행 상황을 복원합니다.<br>Choose a downloaded JSON save file to restore progress.</small><input id="sysImportFile" type="file" accept="application/json,.json" hidden></div>` + slotRows('load') + footBtns(true));
    const importBtn=document.getElementById('sysImport'),importInput=document.getElementById('sysImportFile');
    if(importBtn&&importInput){importBtn.onclick=()=>importInput.click();importInput.onchange=()=>importSaveFile(importInput.files&&importInput.files[0]);}
    document.querySelectorAll('#sysov [data-slot]:not([disabled])').forEach(b => b.onclick = () => {
      const i = +b.dataset.slot;
      const rec = readSlot(i);
      if (!rec) return;
      confirmBox(S('confirmLoad', i), () => { close(); cfg.applyState(rec.data); }, () => openLoad());
    });
    bindFoot(true);
  }

  function openSettings() {
    view = { mode: 'settings' };
    const items = cfg.settings() || [];
    show('⚙️ ' + S('settings'),
      `<div class="sys-set">${items.map((it, i) =>
        `<div class="sys-set-row"><b>${esc(it.label)}</b>${UI.btn(it.value ? S('on') : S('off'), { cls: it.value ? 'btn--pri' : 'btn--ghost', data: { set: i } })}</div>`).join('')}</div>` +
      footBtns(true));
    items.forEach((it, i) => {
      const b = document.querySelector(`#sysov [data-set="${i}"]`);
      if (b) b.onclick = () => { it.onToggle(!it.value); openSettings(); };
    });
    bindFoot(true);
  }

  /* 영걸전풍 Yes/No 확인 */
  function confirmBox(msg, onYes, onNo) {
    view = { mode: 'confirm' };
    show('❓', `<div class="sys-confirm"><p>${esc(msg)}</p>
      <div class="sys-yn">${UI.btn(S('yes'), { id: 'sysYes', cls: 'btn--pri' })}${UI.btn(S('no'), { id: 'sysNo', cls: 'btn--ghost' })}</div></div>`);
    document.getElementById('sysYes').onclick = onYes;
    document.getElementById('sysNo').onclick = onNo || (() => openMenu());
  }
  function confirmDone(msg) {
    view = { mode: 'confirm' };
    show('✔', `<div class="sys-confirm"><p>${esc(msg)}</p>
      <div class="sys-yn">${UI.btn(S('close'), { id: 'sysYes', cls: 'btn--pri' })}</div></div>`);
    document.getElementById('sysYes').onclick = close;
  }

  /* ==================================================================
     명화·조각 감상용 픽셀 렌더러 — 실물 사진 대신 실루엣 구도로 "픽셀 모사"를 그린다.
     cfg.img = { bands:[[y0,y1,c1,c2]...], items:[{k:...}...] }  좌표계 96×72.
     k: disc(해·달) fig(사람 실루엣) ship(배) blob(바위·언덕) col(기둥·나무)
        snake(뱀) wing(날개) grid(베틀·격자) band(가로 띠) statue(좌대+상)
     ================================================================== */
  function paintArt(cv, img) {
    const W2 = 96, H2 = 72;
    cv.width = W2; cv.height = H2;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    PX.rect(g, 0, 0, W2, H2, PAL.ink1);
    for (const b of (img.bands || [])) PX.vgrad(g, 0, b[0], W2, b[1] - b[0], b[2], b[3]);
    for (const it of (img.items || [])) {
      const c = it.col || PAL.ink1;
      const s = PX.shades(c);
      switch (it.k) {
        case 'disc':
          PX.circle(g, it.x, it.y, it.r || 5, c);
          PX.px(g, it.x - 1, it.y - 1, s[3]);
          break;
        case 'fig': {                       /* 사람 실루엣: 발밑 (x,y), 키 h */
          const h = it.h || 18, hw = Math.max(2, Math.round(h * 0.16));
          PX.ellipse(g, it.x, it.y - h + Math.round(h * 0.12), Math.max(1, Math.round(h * 0.11)), Math.max(1, Math.round(h * 0.12)), c);
          PX.trapezoid(g, it.x - hw + 1, it.x + hw - 1, it.y - Math.round(h * 0.72), it.x - hw - 1, it.x + hw + 1, it.y, c);
          if (it.sit) PX.rect(g, it.x - hw - 1, it.y - 2, hw * 2 + 3, 2, c);
          if (it.arm === 'up') PX.rect(g, it.x + hw, it.y - h + 2, 2, Math.round(h * 0.4), c);
          PX.px(g, it.x - 1, it.y - h + 2, s[3]);
          break;
        }
        case 'ship': {                      /* 뱃머리 곡선 + 돛대 */
          const w = it.w || 30;
          PX.trapezoid(g, it.x, it.x + w, it.y, it.x + 4, it.x + w - 4, it.y + 5, c);
          PX.px(g, it.x, it.y - 1, s[3]);
          PX.px(g, it.x + w, it.y - 2, s[2]);
          if (it.mast) {
            PX.rect(g, it.x + (w >> 1), it.y - 16, 1, 16, c);
            if (it.sail) PX.trapezoid(g, it.x + (w >> 1) - 7, it.x + (w >> 1) + 7, it.y - 15, it.x + (w >> 1) - 4, it.x + (w >> 1) + 4, it.y - 6, it.sail);
          }
          break;
        }
        case 'blob':
          PX.ellipse(g, it.x, it.y, it.rx || 10, it.ry || 6, c);
          PX.dither(g, it.x - (it.rx || 10), it.y - (it.ry || 6), (it.rx || 10) * 2, it.ry || 6, s[3], 1);
          break;
        case 'col':
          PX.rect(g, it.x - 1, it.y - (it.h || 20), 3, it.h || 20, c);
          PX.rect(g, it.x - 2, it.y - (it.h || 20), 5, 2, s[3]);
          PX.rect(g, it.x - 2, it.y - 2, 5, 2, s[1]);
          break;
        case 'snake': {
          let x = it.x, y = it.y;
          for (let i = 0; i < (it.len || 14); i++) {
            PX.px(g, x, y, c);
            PX.px(g, x, y + 1, s[1]);
            x += 1; y += (i % 4 < 2) ? -1 : 1;
          }
          break;
        }
        case 'wing':
          for (let i = 0; i < 8; i++) {
            PX.rect(g, it.x + i * (it.dir || 1), it.y - Math.round(i * 1.4), 1, 8 - i, i % 2 ? s[1] : c);
          }
          break;
        case 'grid':
          for (let yy = it.y; yy < it.y + (it.h || 14); yy += 3) PX.hline(g, it.x, yy, it.w || 18, c);
          for (let xx = it.x; xx < it.x + (it.w || 18); xx += 3) PX.vline(g, xx, it.y, it.h || 14, s[1]);
          break;
        case 'band':
          PX.rect(g, 0, it.y, W2, it.h || 3, c);
          PX.dither(g, 0, it.y, W2, it.h || 3, s[3], 1);
          break;
        case 'statue': {                    /* 좌대 위 흰 조각상 */
          PX.rect(g, it.x - 8, it.y - 4, 16, 4, PAL.st2);
          PX.rect(g, it.x - 6, it.y - 5, 12, 1, PAL.st4);
          const h = it.h || 26;
          PX.ellipse(g, it.x, it.y - h, 3, 3, c);
          PX.trapezoid(g, it.x - 3, it.x + 3, it.y - h + 4, it.x - 6, it.x + 6, it.y - 5, c);
          PX.px(g, it.x - 2, it.y - h + 1, PAL.iv4);
          PX.dither(g, it.x - 5, it.y - Math.round(h * 0.55), 10, Math.round(h * 0.3), PX.shades(c)[1], 1);
          break;
        }
      }
    }
    /* 화폭 가장자리 어둡게 — 유화 느낌 */
    PX.frameRect(g, 0, 0, W2, H2, PAL.ink0);
    PX.dither(g, 0, 0, W2, 3, PAL.ink0, 2);
    PX.dither(g, 0, H2 - 3, W2, 3, PAL.ink0, 2);
  }

  return { init, active, openMenu, openSave, openLoad, openSettings, close, paintArt };
})();
