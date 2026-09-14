/* ---------- 程序化音效层 ----------
   WebAudio 合成, 零音频素材。默认开启(低音量), 存档与设置里可关。
   浏览器自动播放策略: 首次用户交互后才解锁 AudioContext, 之前的调用静默跳过。 */
let _sfxCtx = null;
const _sfxLastAt = {};
function sfxEnabled(){ return !(typeof account !== 'undefined' && account && account.sound === 'off'); }
function sfxCtx(){
  if (!sfxEnabled()) return null;
  if (!_sfxCtx) {
    const AC = (typeof window !== 'undefined') ? (window.AudioContext || window.webkitAudioContext) : null;
    if (!AC) return null;
    try { _sfxCtx = new AC(); } catch(e) { return null; }
  }
  if (_sfxCtx.state === 'suspended') { try { _sfxCtx.resume().catch(()=>{}); } catch(e){} }
  return _sfxCtx.state === 'running' ? _sfxCtx : null;
}
function sfxUnlock(){
  /* 在首次用户交互时解锁音频(浏览器自动播放策略), 之后 SFX 才会真正发声 */
  sfxCtx();
}
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', sfxUnlock, { once:false });
  document.addEventListener('keydown', sfxUnlock, { once:false });
}
function sfxTone(ctx, at, o){
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.f || 440, at);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(30, o.f2), at + (o.dur || 0.15));
  const v = Math.max(0.0001, o.vol || 0.16);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(v, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + (o.dur || 0.15));
  osc.connect(g); g.connect(ctx.destination);
  osc.start(at); osc.stop(at + (o.dur || 0.15) + 0.03);
}
function sfxNoise(ctx, at, o){
  const dur = o.dur || 0.18, v = o.vol || 0.2;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const flt = ctx.createBiquadFilter(); flt.type = o.hp ? 'highpass' : 'lowpass';
  flt.frequency.value = o.freq || (o.hp ? 900 : 700);
  const g = ctx.createGain(); g.gain.value = v;
  src.connect(flt); flt.connect(g); g.connect(ctx.destination);
  src.start(at);
}
const SFX_DEFS = {
  levelup(ctx, t){ [523, 659, 784, 1047].forEach((f, i) => sfxTone(ctx, t + i * 0.09, { f, dur: 0.14, type: 'triangle', vol: 0.14 })); },
  legend(ctx, t){ [659, 784, 988, 1319].forEach((f, i) => sfxTone(ctx, t + i * 0.08, { f, dur: 0.2, type: 'triangle', vol: 0.15 })); sfxTone(ctx, t + 0.34, { f: 1568, dur: 0.4, type: 'sine', vol: 0.1 }); },
  epic(ctx, t){ [587, 740, 880].forEach((f, i) => sfxTone(ctx, t + i * 0.07, { f, dur: 0.16, type: 'triangle', vol: 0.13 })); },
  loot(ctx, t){ sfxTone(ctx, t, { f: 659, dur: 0.08, type: 'triangle', vol: 0.1 }); sfxTone(ctx, t + 0.07, { f: 880, dur: 0.1, type: 'triangle', vol: 0.1 }); },
  crit(ctx, t){ sfxTone(ctx, t, { f: 200, f2: 70, dur: 0.12, type: 'square', vol: 0.12 }); sfxNoise(ctx, t, { dur: 0.08, vol: 0.1, hp: true }); },
  boss(ctx, t){ sfxTone(ctx, t, { f: 110, dur: 0.3, type: 'sawtooth', vol: 0.13 }); sfxTone(ctx, t + 0.25, { f: 98, dur: 0.35, type: 'sawtooth', vol: 0.13 }); },
  interrupt(ctx, t){ sfxTone(ctx, t, { f: 1245, f2: 415, dur: 0.14, type: 'square', vol: 0.1 }); },
  event(ctx, t){ sfxTone(ctx, t, { f: 660, dur: 0.09, type: 'sine', vol: 0.12 }); sfxTone(ctx, t + 0.08, { f: 880, dur: 0.12, type: 'sine', vol: 0.12 }); },
  boom(ctx, t){ sfxNoise(ctx, t, { dur: 0.3, vol: 0.24 }); sfxTone(ctx, t, { f: 82, f2: 40, dur: 0.32, type: 'sine', vol: 0.2 }); },
  down(ctx, t){ sfxTone(ctx, t, { f: 330, f2: 110, dur: 0.55, type: 'sawtooth', vol: 0.12 }); },
  victory(ctx, t){ [392, 523, 659, 784].forEach((f, i) => sfxTone(ctx, t + i * 0.1, { f, dur: 0.18, type: 'triangle', vol: 0.14 })); },
};
function playSfx(name){
  if (!name || !sfxEnabled()) return;
  const now = Date.now();
  if (now - (_sfxLastAt[name] || 0) < 90) return;   // 同名音效 90ms 内去重, 防刷屏
  _sfxLastAt[name] = now;
  const ctx = sfxCtx();
  if (!ctx || !SFX_DEFS[name]) return;
  try { SFX_DEFS[name](ctx, ctx.currentTime + 0.01); } catch(e) {}
}
