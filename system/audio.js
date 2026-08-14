/* engine/audio.js — WebAudio 자체 합성 BGM·효과음 (전역 AUDIO 하나만 선언)
   외부 파일 없이 오실레이터로만 소리를 만든다. 첫 사용자 입력 후에만 재생(브라우저 정책).
   음악/효과음을 따로 켜고 끌 수 있다 (설정 메뉴용). */
"use strict";
const AUDIO = (function () {

  const PREF = 'odyssey_audio';
  let ctx = null, master = null, musicGain = null, sfxGain = null, reverb = null, reverbGain = null;
  let musicMuted = false, sfxMuted = false, curTrack = null, timer = 0, step = 0;
  try {
    musicMuted = localStorage.getItem(PREF + '_m') === '1';
    sfxMuted = localStorage.getItem(PREF + '_s') === '1';
  } catch (e) { }
  function persist() {
    try {
      localStorage.setItem(PREF + '_m', musicMuted ? '1' : '0');
      localStorage.setItem(PREF + '_s', sfxMuted ? '1' : '0');
    } catch (e) { }
  }

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.19; musicGain.connect(master);
      reverb = ctx.createConvolver();
      const ir = ctx.createBuffer(2, Math.floor(ctx.sampleRate * 2.8), ctx.sampleRate);
      for (let c=0;c<2;c++) { const d=ir.getChannelData(c); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2.8); }
      reverb.buffer=ir; reverbGain=ctx.createGain(); reverbGain.gain.value=.23; reverb.connect(reverbGain); reverbGain.connect(master);
      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.3; sfxGain.connect(master);
      return true;
    } catch (e) { return false; }
  }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  /* ---------- 음 하나 ---------- */
  function tone(dest, freq, t0, dur, type, vol, slide) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.linearRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.setValueAtTime(vol, t0 + Math.max(0.012, dur - 0.05));
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  /* ---------- 효과음 ---------- */
  const N = { c4: 262, d4: 294, e4: 330, f4: 349, g4: 392, a4: 440, b4: 494, c5: 523, d5: 587, e5: 659, g5: 784, a5: 880, c6: 1047 };
  function sfx(name) {
    if (sfxMuted || !ensure()) return;
    resume();
    const t = ctx.currentTime;
    switch (name) {
      case 'blip': tone(sfxGain, N.a4, t, 0.06, 'square', 0.16); break;
      case 'ok': tone(sfxGain, N.c5, t, 0.09, 'square', 0.2); tone(sfxGain, N.e5, t + 0.09, 0.09, 'square', 0.2); tone(sfxGain, N.g5, t + 0.18, 0.16, 'square', 0.2); break;
      case 'bad': tone(sfxGain, N.e4, t, 0.12, 'sawtooth', 0.16); tone(sfxGain, 233, t + 0.12, 0.2, 'sawtooth', 0.16); break;
      case 'coin': tone(sfxGain, N.b4, t, 0.05, 'square', 0.18); tone(sfxGain, N.e5, t + 0.05, 0.14, 'square', 0.18); break;
      case 'chest': tone(sfxGain, N.g4, t, 0.08, 'triangle', 0.22); tone(sfxGain, N.c5, t + 0.08, 0.08, 'triangle', 0.22); tone(sfxGain, N.e5, t + 0.16, 0.2, 'triangle', 0.22); break;
      case 'level': [N.c5, N.e5, N.g5, N.c6].forEach((f, i) => tone(sfxGain, f, t + i * 0.09, 0.12, 'square', 0.2)); break;
      case 'hit': tone(sfxGain, 180, t, 0.1, 'sawtooth', 0.22, 90); break;
      case 'hurt': tone(sfxGain, 140, t, 0.16, 'sawtooth', 0.2, 60); break;
      case 'win': [N.c5, N.c5, N.d5, N.e5, N.g5, N.e5, N.g5].forEach((f, i) => tone(sfxGain, f, t + i * 0.11, 0.13, 'square', 0.2)); break;
      case 'talk': tone(sfxGain, N.d5, t, 0.04, 'square', 0.1); break;
      case 'clue': [N.e5, N.a5].forEach((f, i) => tone(sfxGain, f, t + i * 0.1, 0.14, 'triangle', 0.24)); break;
      case 'step3': [N.g4, N.a4, N.b4].forEach((f, i) => tone(sfxGain, f, t + i * 0.07, 0.08, 'square', 0.14)); break;
    }
  }

  /* ---------- 클래식풍 실내악 BGM ----------
     4마디 화성 위에 현악 패드·첼로·하프·목관을 겹친다. BGM에는 사각파를 쓰지 않는다. */
  const TR={
    title:{bpm:68,ch:[[50,53,57],[46,50,53],[48,52,55],[45,50,53]],mel:[69,null,72,74,72,69,67,null,65,67,69,72,69,67,65,null]},
    court:{bpm:72,ch:[[48,52,55],[43,47,50],[45,48,52],[41,45,48]],mel:[67,null,69,67,64,null,62,null,64,65,67,null,69,67,64,null]},
    pastoral:{bpm:66,ch:[[55,59,62],[50,54,57],[52,55,59],[48,52,55]],mel:[71,72,74,null,76,74,71,null,69,71,72,69,67,null,69,null]},
    tense:{bpm:76,ch:[[45,48,52],[43,47,50],[41,45,48],[43,46,50]],mel:[64,null,65,64,62,null,60,null,62,64,65,null,64,62,60,null],dark:true},
    night:{bpm:54,ch:[[45,48,52],[40,45,48],[43,47,50],[41,45,48]],mel:[64,null,null,67,null,null,69,null,67,null,64,null,62,null,null,null],soft:true},
    battle:{bpm:92,ch:[[45,48,52],[43,46,50],[41,45,48],[44,47,51]],mel:[69,null,69,67,69,null,72,null,71,69,67,null,69,67,64,null],dark:true},
    victory:{bpm:74,ch:[[48,52,55],[53,57,60],[55,59,62],[48,52,55]],mel:[72,76,79,null,76,79,81,null,79,76,74,null,72,null,76,null]},
    sea:{bpm:62,ch:[[45,48,52],[40,45,48],[43,47,50],[41,45,48]],mel:[64,null,67,null,69,67,null,64,62,null,64,67,64,null,62,null],soft:true}
  };
  const hz=m=>440*Math.pow(2,(m-69)/12);
  function orchestralNote(freq,t0,dur,kind,vol){
    const bus=ctx.createGain(),filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=kind==='wood'?2200:kind==='harp'?3100:1100;filter.Q.value=.45;
    bus.gain.setValueAtTime(.0001,t0);bus.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),t0+(kind==='strings'?.32:.025));bus.gain.exponentialRampToValueAtTime(.0001,t0+dur);
    bus.connect(filter);filter.connect(musicGain);if(reverb)filter.connect(reverb);
    const voices=kind==='strings'?[-7,7]:[0]; voices.forEach((det,i)=>{const o=ctx.createOscillator();o.type=kind==='wood'?'sine':'triangle';o.frequency.setValueAtTime(freq,t0);o.detune.value=det;o.connect(bus);o.start(t0);o.stop(t0+dur+.05)});
  }

  function stopMusic() { clearInterval(timer); timer = 0; curTrack = null; }
  function play(name) {
    if (!TR[name]) return;
    if (curTrack === name) return;
    if (!ensure()) { curTrack = name; return; }
    stopMusic();
    curTrack = name;
    if (musicMuted) return;
    resume();
    const tr = TR[name];
    const stepDur = 60 / tr.bpm;
    step = 0;
    timer = setInterval(() => {
      if (!ctx || musicMuted) return;
      const t = ctx.currentTime;
      const i=step%16, chord=tr.ch[Math.floor(i/4)%tr.ch.length], m=tr.mel[i];
      if(i%4===0){chord.forEach((n,j)=>orchestralNote(hz(n),t,stepDur*4.15,'strings',(tr.soft?.045:.065)/(j?1.15:1)));orchestralNote(hz(chord[0]-12),t,stepDur*3.7,'strings',tr.dark?.075:.055)}
      orchestralNote(hz(chord[i%3]+12),t,stepDur*.72,'harp',tr.soft?.045:.058);
      if(m)orchestralNote(hz(m),t+.035,stepDur*(i%4===3?1.7:.88),'wood',tr.soft?.055:.075);
      step++;
    }, stepDur * 1000);
  }
  function setMusic(on) {
    musicMuted = !on;
    persist();
    if (musicMuted) { clearInterval(timer); timer = 0; }
    else if (curTrack) { const c = curTrack; curTrack = null; play(c); }
  }
  function setSfx(on) { sfxMuted = !on; persist(); }
  /* 마스터 토글(단축키·버튼): 음악 기준으로 둘 다 맞춘다 */
  function toggle() { const on = musicMuted; setMusic(on); setSfx(on); return on; }
  /* 사용자 첫 입력에서 호출 — 컨텍스트를 깨우고 보류된 트랙을 재생 */
  function unlock() {
    if (!ensure()) return;
    resume();
    if (curTrack && !timer && !musicMuted) { const c = curTrack; curTrack = null; play(c); }
  }
  return {
    sfx: sfx, play: play, stop: stopMusic, toggle: toggle, unlock: unlock,
    muted: () => musicMuted, musicOn: () => !musicMuted, sfxOn: () => !sfxMuted,
    setMusic: setMusic, setSfx: setSfx
  };
})();
