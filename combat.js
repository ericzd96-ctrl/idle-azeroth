/* =========================================================
   combat.js — 战斗、伤害、技能、怪物、物品、装备
   ========================================================= */

/* ---------- 精通(mastery)被动:按专精映射到一种效果原型,数值随精通点数提升(2026-06-16) ---------- */

/* ---------- Buff 中文名映射(供 UI 显示,覆盖所有来源:玩家技能/随从/硬编码) ---------- */
const BUFF_NAMES = {
  // 玩家技能 + BUFF_FX (效果已减1/3)
  s_burst:       { icon:'💢', name:'爆发',     desc:'攻击+33%·暴伤+20' },
  s_empower:     { icon:'🔥', name:'法术爆发', desc:'暴击+17·暴伤+34' },
  s_frenzy:      { icon:'😡', name:'狂热',     desc:'攻击+20%·攻速+20%' },
  s_mitigate:    { icon:'🧱', name:'减伤',     desc:'受到伤害-34%' },
  s_barrier:     { icon:'🪨', name:'护盾',     desc:'受伤-30%·防御+27%' },
  s_haste:       { icon:'💨', name:'急速',     desc:'攻速+33%' },
  s_lifesurge:   { icon:'🩸', name:'生命洪流', desc:'吸血+20·攻击+13%' },
  s_avatar:      { icon:'⚡', name:'天神下凡', desc:'攻+27%·防+20%·减伤13%' },
  // 硬编码 buff (效果已减1/3)
  shield:        { icon:'🛡️', name:'盾墙',     desc:'防御×1.33' },
  divine:        { icon:'✨', name:'神圣守护', desc:'防御×1.53' },
  bark:          { icon:'🌳', name:'树皮术',   desc:'防御×1.40' },
  iceBarrier:    { icon:'🧊', name:'寒冰屏障', desc:'防御×1.40' },
  earthShield:   { icon:'🪨', name:'大地之盾', desc:'防御×1.33' },
  evasion:       { icon:'💨', name:'闪避',     desc:'防御×1.27' },
  bestial:       { icon:'🐻', name:'野兽狂怒', desc:'攻击×1.27' },
  shadowstep:    { icon:'🌑', name:'暗影步',   desc:'攻击×1.33' },
  battleShout:   { icon:'📯', name:'战斗怒吼', desc:'攻击×1.20' },
  kings:         { icon:'👑', name:'王者祝福', desc:'攻+13%·防+13%' },
  berserk:       { icon:'😡', name:'狂暴',     desc:'攻×1.27·攻速×1.20' },
  windfury:      { icon:'⚡', name:'风怒',     desc:'攻速×1.40' },
  rapidFire:     { icon:'🏹', name:'急速射击', desc:'攻速×1.40' },
  bloodlust:     { icon:'🩸', name:'嗜血',     desc:'攻速×1.47' },
  timeWarp:      { icon:'🌀', name:'时间扭曲', desc:'攻速×1.53' },
  sacredShield:  { icon:'🟡', name:'圣盾',     desc:'防御×1.27·回复+3' },
  seraphim:      { icon:'😇', name:'炽天使',   desc:'攻×1.40·全能+7' },
  demonForm:     { icon:'😈', name:'恶魔形态', desc:'攻×1.33·吸血+10' },
};
const MASTERY_TYPE = {
  dmgAmp:    { per:0.6,  fmt:n=>`造成的伤害 +${(n*0.6).toFixed(1)}%` },
  dotAmp:    { per:1.2,  fmt:n=>`持续伤害(灼烧/中毒/流血)效果 +${(n*1.2).toFixed(0)}%` },
  leechAmp:  { per:0.3,  fmt:n=>`普攻吸血效果 +${(n*0.3*0.5).toFixed(1)}%` },
  dr:        { per:0.25, fmt:n=>`受到的伤害 -${Math.min(30,n*0.25).toFixed(1)}%` },
  healAmp:   { per:0.8,  fmt:n=>`治疗/护盾量 +${(n*0.8).toFixed(0)}%` },
  critdAmp:  { per:1.5,  fmt:n=>`暴击伤害 +${(n*1.5).toFixed(0)}%` },
  bleedOnCrit:{ per:0.5, fmt:n=>`暴击使敌人流血:每秒造成该次伤害的 ${(n*0.5).toFixed(1)}%,持续5秒` },
};
// 专精 → 精通效果(同名 key 的不同职业共享同一原型,如 prot=减伤 / holy=治疗,语义一致)
const MASTERY_SPEC = { arms:'bleedOnCrit', fury:'leechAmp', prot:'dr', arcane:'dmgAmp', fire:'dotAmp', frost:'dmgAmp', discipline:'healAmp', holy:'healAmp', shadow:'dotAmp', assassination:'dotAmp', combat:'dmgAmp', subtlety:'dmgAmp', bm:'dmgAmp', marks:'critdAmp', survival:'dotAmp', element:'dmgAmp', enhancement:'dmgAmp', restoration:'healAmp', ret:'dmgAmp', affliction:'dotAmp', demonology:'leechAmp', destruction:'dmgAmp', balance:'dotAmp', feral:'bleedOnCrit', resto:'healAmp' };
function masterySpecType(){ return MASTERY_SPEC[state.specialization] || null; }
function masteryFor(type){ return masterySpecType()===type ? (state.hero.mastery||0) : 0; }
function masteryDmgMult(){ return 1 + masteryFor('dmgAmp')*MASTERY_TYPE.dmgAmp.per/100; }       // 输出伤害增幅
function masteryTakenMult(){ return 1 - Math.min(30, masteryFor('dr')*MASTERY_TYPE.dr.per)/100; } // 受击减伤(封顶30%)
function masteryDescText(){ const t=masterySpecType(); return t ? MASTERY_TYPE[t].fmt(state.hero.mastery||0) : '未选择专精'; }

function monsterFloatAnchor(mon){
  if(mon && mon._uid != null && typeof document !== 'undefined'){
    let iconEl = document.querySelector(`#mon-list [data-uid="${String(mon._uid).replace(/"/g, '\\"')}"] .m-emoji`);
    if(!iconEl && typeof renderMonList === 'function'){
      renderMonList();
      iconEl = document.querySelector(`#mon-list [data-uid="${String(mon._uid).replace(/"/g, '\\"')}"] .m-emoji`);
    }
    if(iconEl) return iconEl;
  }
  return $('mon-emoji');
}
function showMonsterFloat(mon, text, color, opts){ showFloat(monsterFloatAnchor(mon), text, color, opts); }
function pulseMonsterEl(mon, kind, duration){ if(typeof pulseCombatEl === 'function') pulseCombatEl(monsterFloatAnchor(mon), kind, duration); }

/* ---------- 天赋特效运行时 ---------- */
function talentAuraMeta(key){ return (typeof TALENT_AURA_LIBRARY === 'object' && TALENT_AURA_LIBRARY[key]) || null; }
function talentFxList(){ return state._talentFx || []; }
function ensureTalentState(){
  if(!state.talentAuras) state.talentAuras = {};
  if(!state.talentState) state.talentState = { cds:{}, flags:{}, shield:0 };
  if(!state.talentState.cds) state.talentState.cds = {};
  if(!state.talentState.flags) state.talentState.flags = {};
  if(typeof state.talentState.shield !== 'number') state.talentState.shield = 0;
  return state.talentState;
}
function pruneTalentAuras(now){
  if(!state.talentAuras) return false;
  let changed = false;
  for(const [k, expire] of Object.entries(state.talentAuras)){
    if(!(expire > now)){ delete state.talentAuras[k]; changed = true; }
  }
  return changed;
}
function hasTalentAura(key){ return !!(state.talentAuras && state.talentAuras[key] > Date.now()); }
function addTalentAura(key, quiet){
  const meta = talentAuraMeta(key);
  if(!meta) return;
  ensureTalentState();
  const now = Date.now();
  const expire = now + (meta.duration || 5000);
  if((state.talentAuras[key] || 0) >= expire - 250) return;
  state.talentAuras[key] = expire;
  if(!quiet) showFloat($('hero-emoji'), meta.icon || '✨', '#6ee7b7', { variant:'heal', scale:1.04 });
  if(typeof pulseCombatEl === 'function') pulseCombatEl($('hero-emoji'), 'heal', 240);
  recomputeStats();
  markDirty('hero');
}
function addTalentShield(amount, quiet){
  amount = Math.max(0, Math.floor(amount || 0));
  if(amount <= 0) return 0;
  const rt = ensureTalentState();
  rt.shield += amount;
  if(!quiet) showFloat($('hero-emoji'), '🛡️+' + amount, '#93c5fd', { variant:'shield', scale:1.04 });
  if(typeof pulseCombatEl === 'function') pulseCombatEl($('hero-emoji'), 'shield', 260);
  markDirty('hero');
  return amount;
}
function absorbTalentShield(amount){
  amount = Math.max(0, Math.floor(amount || 0));
  if(amount <= 0) return 0;
  const rt = ensureTalentState();
  if(rt.shield <= 0) return amount;
  const absorb = Math.min(rt.shield, amount);
  rt.shield -= absorb;
  showFloat($('hero-emoji'), '🛡️-' + absorb, '#93c5fd', { variant:'shield-break', scale:1.02 });
  if(typeof pulseCombatEl === 'function') pulseCombatEl($('hero-emoji'), 'shield', 260);
  markDirty('hero');
  return amount - absorb;
}
function talentCooldownReady(key, cooldownMs, now){
  if(!cooldownMs) return true;
  const rt = ensureTalentState();
  if((rt.cds[key] || 0) > now) return false;
  rt.cds[key] = now + cooldownMs;
  return true;
}
function skillMatches(fx, skillKey){
  if(!fx.skill) return true;
  return Array.isArray(fx.skill) ? fx.skill.includes(skillKey) : fx.skill === skillKey;
}
function monsterStateActive(mon, stateKey){
  if(!mon || !stateKey) return false;
  const now = Date.now();
  if(stateKey === 'dot') return getMonsterDotDps(mon, now) > 0;
  if(stateKey === 'slow') return !!(mon.slowUntil > now);
  if(stateKey === 'sunder') return !!(mon.sunderUntil > now);
  if(stateKey === 'boss') return !!mon.isBoss;
  if(mon._skillStates && mon._skillStates[stateKey] > now) return true;
  return false;
}
function ensureMonsterDots(mon, now){
  if(!mon) return {};
  now = now || Date.now();
  if(!mon._dots) mon._dots = {};
  if(!mon._dotLegacyImported && mon.dot > 0 && mon.dotEnd > now){
    mon._dots._legacy = { key:'_legacy', name:'灼烧/中毒', icon:'🔥', dps:mon.dot, expire:mon.dotEnd };
  }
  mon._dotLegacyImported = true;
  for(const [key, dot] of Object.entries(mon._dots)){
    if(!dot || !(dot.expire > now) || !(dot.dps > 0)) delete mon._dots[key];
  }
  let total = 0, latest = 0;
  for(const dot of Object.values(mon._dots)){
    total += dot.dps || 0;
    latest = Math.max(latest, dot.expire || 0);
  }
  mon.dot = total > 0 ? total : 0;
  mon.dotEnd = latest > now ? latest : 0;
  return mon._dots;
}
function getMonsterDots(mon, now){
  return Object.values(ensureMonsterDots(mon, now)).sort((a, b) => (b.dps || 0) - (a.dps || 0));
}
function getMonsterDotCount(mon, now){
  return getMonsterDots(mon, now).length;
}
function monsterHasDotKey(mon, dotKey, now){
  if(!mon || !dotKey) return false;
  const dots = ensureMonsterDots(mon, now);
  return !!(dots && dots[dotKey] && dots[dotKey].expire > (now || Date.now()));
}
function getMonsterDotDps(mon, now){
  ensureMonsterDots(mon, now);
  return mon && mon.dot > 0 ? mon.dot : 0;
}
function applyMonsterDot(mon, dotKey, dps, durMs, meta){
  if(!mon || !(dps > 0)) return 0;
  const now = Date.now();
  ensureMonsterDots(mon, now);
  const key = dotKey || '_generic';
  const expire = now + (durMs || 5000);
  const prev = mon._dots[key];
  mon._dots[key] = {
    key,
    name: meta?.name || prev?.name || '持续伤害',
    icon: meta?.icon || prev?.icon || '🔥',
    source: meta?.source || prev?.source || key,
    dps: Math.max(prev?.dps || 0, Math.floor(dps)),
    expire: Math.max(prev?.expire || 0, expire),
  };
  ensureMonsterDots(mon, now);
  return mon._dots[key].dps;
}
function tickMonsterDots(mon, now, tickInterval){
  const total = getMonsterDotDps(mon, now);
  if(total <= 0) return 0;
  if(now - (mon._lastDotTick || 0) <= tickInterval) return 0;
  mon._lastDotTick = now;
  mon.hp -= total;
  trackDmg('hero', total);
  return total;
}
function consumeMonsterDots(mon, keys){
  if(!mon) return 0;
  const now = Date.now();
  const dots = ensureMonsterDots(mon, now);
  let removed = 0;
  const dotKeys = keys ? (Array.isArray(keys) ? keys : [keys]) : Object.keys(dots);
  for(const key of dotKeys){
    const dot = dots[key];
    if(!dot) continue;
    removed += dot.dps || 0;
    delete dots[key];
  }
  ensureMonsterDots(mon, now);
  return removed;
}
function clearMonsterState(mon, stateKey){
  if(!mon || !stateKey) return;
  if(stateKey === 'slow') mon.slowUntil = 0;
  else if(stateKey === 'sunder') mon.sunderUntil = 0;
  else if(mon._skillStates) delete mon._skillStates[stateKey];
}
function ensureSkillRuntime(){
  if(!state.skillRuntime) state.skillRuntime = { auras:{} };
  if(!state.skillRuntime.auras) state.skillRuntime.auras = {};
  return state.skillRuntime;
}
function pruneSkillAuras(now){
  const rt = ensureSkillRuntime();
  let changed = false;
  for(const [key, aura] of Object.entries(rt.auras)){
    if(!aura) { delete rt.auras[key]; changed = true; continue; }
    if(aura.expire && aura.expire <= now){ delete rt.auras[key]; changed = true; }
  }
  return changed;
}
function getSkillAura(key){
  const rt = ensureSkillRuntime();
  const aura = rt.auras[key];
  if(!aura) return null;
  if(aura.expire && aura.expire <= Date.now()){ delete rt.auras[key]; return null; }
  return aura;
}
function skillAuraStacks(key){
  return getSkillAura(key)?.stacks || 0;
}
function hasSkillAura(key){
  return skillAuraStacks(key) > 0;
}
function addSkillAura(key, cfg){
  if(!key) return 0;
  const rt = ensureSkillRuntime();
  const now = Date.now();
  const prev = getSkillAura(key) || { stacks:0, expire:0 };
  const add = cfg?.add || 0;
  const max = cfg?.max || prev.max || 1;
  const duration = cfg?.duration || prev.duration || 0;
  const nextStacks = Math.max(0, Math.min(max, (prev.stacks || 0) + add));
  if(nextStacks <= 0){ delete rt.auras[key]; return 0; }
  rt.auras[key] = {
    key,
    stacks: nextStacks,
    max,
    duration,
    expire: duration ? now + duration : 0,
  };
  return nextStacks;
}
function consumeSkillAura(key, cfg){
  const aura = getSkillAura(key);
  if(!aura) return 0;
  if(cfg?.all){ const out = aura.stacks || 0; ensureSkillRuntime().auras[key] = null; delete ensureSkillRuntime().auras[key]; return out; }
  const add = cfg?.add || -1;
  return addSkillAura(key, { add, max:aura.max, duration:aura.duration });
}
function buffActive(buffKey, now){
  return !!(buffKey && state.buffs && state.buffs[buffKey] > (now || Date.now()));
}
function healFromPct(base, pct){
  if(!(pct > 0) || !(base > 0)) return 0;
  return Math.max(1, Math.floor(base * pct));
}
function skillFxMeta(skillKey, sk){ return (sk && sk.fx) || {}; }
function skillBonusPctFromMap(map, key){
  if(!map || !key) return 0;
  return map[key] || 0;
}
function calcSkillRuntimeBonus(skillKey, sk, mon, now){
  const fx = skillFxMeta(skillKey, sk);
  let mult = 1;
  let forceCrit = false;
  const dotCount = getMonsterDotCount(mon, now);
  if(fx.bonusStates){
    for(const [stateKey, pct] of Object.entries(fx.bonusStates)){
      if(monsterStateActive(mon, stateKey)) mult *= 1 + pct;
    }
  }
  if(fx.bonusPerDot && dotCount > 0) mult *= 1 + dotCount * fx.bonusPerDot;
  if(fx.executeThreshold && fx.bonusVsLowHp && mon && mon.hp > 0 && mon.hp <= mon.hpMax * fx.executeThreshold) mult *= 1 + fx.bonusVsLowHp;
  if(fx.bonusPerAuraStack && fx.bonusPerAuraStack.key){
    mult *= 1 + skillAuraStacks(fx.bonusPerAuraStack.key) * (fx.bonusPerAuraStack.pct || 0);
  }
  if(fx.bonusIfBuff){
    for(const [buffKey, pct] of Object.entries(fx.bonusIfBuff)) if(buffActive(buffKey, now)) mult *= 1 + pct;
  }
  if(fx.forceCritIfBuff && buffActive(fx.forceCritIfBuff, now)) forceCrit = true;
  if(fx.forceCritIfState && monsterStateActive(mon, fx.forceCritIfState)) forceCrit = true;
  if(fx.forceCritIfDotCount && dotCount >= fx.forceCritIfDotCount) forceCrit = true;
  return { fx, mult, forceCrit, dotCount };
}
function applySkillFollowupDamage(mon, amount, icon, color){
  amount = Math.max(0, Math.floor(amount || 0));
  if(!mon || mon.hp <= 0 || amount <= 0) return 0;
  const shieldResult = absorbMonsterBarrier(mon, amount, icon || '🛡️');
  amount = shieldResult.remaining;
  const dr = monsterDamageReduction(mon, now);
  if(dr && amount > 0) amount = Math.max(1, Math.floor(amount * (1 - dr)));
  if(amount <= 0) return 0;
  mon.hp -= amount;
  trackDmg('hero', amount);
  showMonsterFloat(mon, (icon || '✨') + '-' + amount, color || '#fbbf24', { important:true });
  return amount;
}
function splashSkillDamage(sourceMon, amount, pct, icon){
  if(!(pct > 0) || !(amount > 0)) return 0;
  let total = 0;
  for(const other of state.currentMonsters){
    if(other === sourceMon || other.hp <= 0) continue;
    total += applySkillFollowupDamage(other, amount * pct, icon || '💥', '#f59e0b');
  }
  return total;
}
function applySkillHitEffects(skillKey, sk, mon, dmgDone, ctx){
  const fx = skillFxMeta(skillKey, sk);
  const now = ctx?.now || Date.now();
  if(!mon || dmgDone <= 0) return;
  if(fx.consumeDots) consumeMonsterDots(mon, fx.consumeDotKeys);
  if(sk.dot){
    const dotKey = fx.applyDotKey || ('skill:' + skillKey);
    applyMonsterDot(mon, dotKey, Math.floor(dmgDone * (fx.dotPct || 0.15) * (1 + (state.hero.dotBonus || 0) / 100)), fx.dotMs || 5000, { icon: fx.dotIcon || sk.icon || '🔥', name: fx.dotName || sk.name || '持续伤害', source: skillKey });
  }
  if(fx.applyTargetState) applyMonsterState(mon, fx.applyTargetState, fx.stateDurationMs || 6000);
  if(fx.healFromDamagePct) healHeroAmount(healFromPct(dmgDone, fx.healFromDamagePct), sk.icon || '💚', '#6ee7b7');
  if(fx.healFromDamagePctIfBuff && buffActive(fx.healFromDamagePctIfBuff.key, now)) healHeroAmount(healFromPct(dmgDone, fx.healFromDamagePctIfBuff.pct || 0), sk.icon || '💚', '#6ee7b7');
  if(fx.healBonusIfSelfHpBelow && state.hp / Math.max(1, state.hero.hpMax) <= (fx.healBonusIfSelfHpBelow || 0.5)) healHeroAmount(healFromPct(state.hero.hpMax, fx.extraHealPct || 0), '💚', '#6ee7b7');
  if(fx.shieldFromDamagePct) addTalentShield(healFromPct(dmgDone, fx.shieldFromDamagePct), true);
  if(fx.resourceGain) grantTalentResource(fx.resourceGain);
  if(fx.grantAura) addSkillAura(fx.grantAura.key, fx.grantAura);
  if(fx.consumeAura) consumeSkillAura(fx.consumeAura.key, fx.consumeAura);
  if(fx.consumeState){
    const states = Array.isArray(fx.consumeState) ? fx.consumeState : [fx.consumeState];
    for(const stateKey of states) clearMonsterState(mon, stateKey);
  }
  if(fx.extraHitPct) applySkillFollowupDamage(mon, dmgDone * fx.extraHitPct, sk.icon || '✨', '#fbbf24');
  if(fx.extraHitPctIfBuff && buffActive(fx.extraHitPctIfBuff.key, now)) applySkillFollowupDamage(mon, dmgDone * (fx.extraHitPctIfBuff.pct || 0), sk.icon || '✨', '#fbbf24');
  if(fx.splashPct && !ctx?.isAOE) splashSkillDamage(mon, dmgDone, fx.splashPct, sk.icon || '💥');
  if(fx.spreadDotsPct) spreadDotFromMonster(mon, fx.spreadDotsPct, fx.dotMs || 5000);
  if(fx.resourceGainOnKill && mon.hp <= 0) grantTalentResource(fx.resourceGainOnKill);
}
function applySkillHealEffects(skillKey, sk, amount, overheal){
  const fx = skillFxMeta(skillKey, sk);
  if(fx.shieldFromOverhealPct && overheal > 0) addTalentShield(Math.floor(overheal * fx.shieldFromOverhealPct), true);
  if(fx.shieldFromHealPct && amount > 0) addTalentShield(Math.floor(amount * fx.shieldFromHealPct), true);
  if(fx.shieldBonusIfBuff && buffActive(fx.shieldBonusIfBuff.key)) addTalentShield(Math.floor(amount * (fx.shieldBonusIfBuff.pct || 0)), true);
  if(fx.grantAura) addSkillAura(fx.grantAura.key, fx.grantAura);
}
function applyMonsterState(mon, stateKey, durMs){
  if(!mon || !stateKey) return;
  if(stateKey === 'sunder'){
    mon.sunderUntil = Math.max(mon.sunderUntil || 0, Date.now() + (durMs || 15000));
    return;
  }
  if(!mon._skillStates) mon._skillStates = {};
  mon._skillStates[stateKey] = Date.now() + (durMs || 10000);
}
function talentDamageMult(mon, skillKey){
  let mult = 1;
  for(const fx of talentFxList()){
    if(fx.type === 'vsBoss' && mon?.isBoss && fx.dmgPct) mult *= 1 + fx.dmgPct/100;
    else if(fx.type === 'executeWindow' && mon && mon.hp > 0 && mon.hp <= mon.hpMax * (fx.threshold || 0.35) && fx.dmgPct) mult *= 1 + fx.dmgPct/100;
    else if(fx.type === 'vsState' && monsterStateActive(mon, fx.state) && fx.dmgPct) mult *= 1 + fx.dmgPct/100;
    else if(fx.type === 'skillAmp' && skillMatches(fx, skillKey) && (!fx.state || monsterStateActive(mon, fx.state)) && fx.dmgPct) mult *= 1 + fx.dmgPct/100;
    else if(fx.type === 'whileAura' && hasTalentAura(fx.auraKey) && (!fx.skill || skillMatches(fx, skillKey)) && fx.dmgPct) mult *= 1 + fx.dmgPct/100;
    else if(fx.type === 'whileBuff' && buffActive(fx.buffKey) && (!fx.skill || skillMatches(fx, skillKey)) && fx.dmgPct) mult *= 1 + fx.dmgPct/100;
  }
  return mult;
}
function talentTakenMult(mon){
  let mult = 1;
  for(const fx of talentFxList()){
    if(fx.type === 'vsBoss' && mon?.isBoss && fx.takenPct) mult *= 1 - Math.min(80, fx.takenPct)/100;
    else if(fx.type === 'whileAura' && hasTalentAura(fx.auraKey) && fx.takenPct) mult *= 1 - Math.min(80, fx.takenPct)/100;
    else if(fx.type === 'whileBuff' && buffActive(fx.buffKey) && fx.takenPct) mult *= 1 - Math.min(80, fx.takenPct)/100;
  }
  return mult;
}
function grantTalentResource(amount){
  amount = Math.max(0, Math.floor(amount || 0));
  if(amount <= 0) return;
  state.resource = Math.min(state.resourceMax, state.resource + amount);
  showFloat($('hero-emoji'), '⚡+' + amount, '#fbbf24');
}
function grantNextSkillCrit(count){
  const rt = ensureTalentState();
  rt.flags.nextSkillCrit = (rt.flags.nextSkillCrit || 0) + (count || 1);
  showFloat($('hero-emoji'), '✨必暴', '#fbbf24');
}
function consumeNextSkillCrit(sk){
  if(!sk || sk.type !== 'dmg') return false;
  const rt = ensureTalentState();
  if((rt.flags.nextSkillCrit || 0) <= 0) return false;
  rt.flags.nextSkillCrit -= 1;
  return true;
}
function resetSkillCooldown(skillKey, pct){
  if(!skillKey || !state.skillCooldowns) return;
  const now = Date.now();
  const cur = state.skillCooldowns[skillKey] || 0;
  if(cur <= now) return;
  if(!pct || pct >= 1) delete state.skillCooldowns[skillKey];
  else state.skillCooldowns[skillKey] = Math.max(now, cur - Math.floor((cur - now) * pct));
  markDirty('skills');
}
function spreadDotFromMonster(mon, ratio, dotMs){
  const dots = getMonsterDots(mon);
  if(!mon || dots.length === 0) return;
  const alive = state.currentMonsters.filter(x => x.hp > 0 && x !== mon);
  if(alive.length === 0) return;
  const target = alive[0];
  for(const dot of dots){
    const spread = Math.max(1, Math.floor((dot.dps || 0) * (ratio || 0.5)));
    applyMonsterDot(target, dot.key, spread, dotMs || Math.max(1000, (dot.expire || Date.now()) - Date.now()), { icon: dot.icon, name: dot.name, source: dot.source });
  }
  showMonsterFloat(mon, '☠️蔓延', '#c084fc');
}
function healHeroAmount(amount, icon, color, source, skillLabel){
  amount = Math.max(0, Math.floor(amount || 0));
  if(amount <= 0) return { applied:0, overheal:0 };
  amount = Math.max(0, Math.floor(amount * heroDebuffHealMult()));
  if(amount <= 0) return { applied:0, overheal:0 };
  const before = state.hp;
  state.hp = Math.min(state.hero.hpMax, state.hp + amount);
  const applied = state.hp - before;
  const overheal = Math.max(0, amount - applied);
  if(applied > 0) trackHeal(source || 'hero', applied, skillLabel);
  if(applied > 0){
    showFloat($('hero-emoji'), (icon || '') + '+' + applied, color || '#6ee7b7', { variant:'heal', scale:1.06 });
    if(typeof pulseCombatEl === 'function') pulseCombatEl($('hero-emoji'), 'heal', 240);
  }
  return { applied, overheal };
}
function normalizeTrackedSkillLabel(skillLabel){
  if(!skillLabel) return '';
  return String(skillLabel)
    .replace(/<[^>]+>/g, '')
    .replace(/^[^A-Za-z0-9\u4e00-\u9fa5]+/u, '')
    .trim();
}
function applyHeroDamage(amount, mon, opts){
  const now = opts?.now || Date.now();
  let amountIn = Math.max(0, Math.floor(amount || 0));
  if(state.heroDebuffs && state.heroDebuffs.brittle && state.heroDebuffs.brittle.expire > now){
    amountIn *= 2;
    delete state.heroDebuffs.brittle;
  }
  const taken = absorbTalentShield(amountIn);
  if(taken <= 0) return 0;
  state.hp -= taken;
  if(state._soulLinkUntil > now && mon && mon.hp > 0){
    const healBack = Math.max(1, Math.floor(taken * 0.25));
    mon.hp = Math.min(mon.hpMax, mon.hp + healBack);
    showMonsterFloat(mon, '🔗+' + healBack, '#a78bfa');
  }
  if(opts?.show !== false){
    const text = typeof opts?.label === 'function' ? opts.label(taken) : (opts?.label || ('-' + taken));
    showFloat($('hero-emoji'), text, opts?.color || '#ff7a7a', {
      variant: opts?.variant || ((mon?.isBoss || taken >= state.hero.hpMax * 0.12) ? 'boss' : 'hit'),
      scale: mon?.isBoss ? 1.08 : 1
    });
  }
  if(typeof pulseCombatEl === 'function') pulseCombatEl($('hero-emoji'), (mon?.isBoss || taken >= state.hero.hpMax * 0.12) ? 'danger' : 'hit', mon?.isBoss ? 300 : 220);
  return taken;
}
function talentProcKey(fx, suffix){
  return [fx.key || fx.talentKey || fx.name || fx.aura || fx.type, suffix || 'base'].join(':');
}
function skillAiMeta(skillKey, sk){ return (sk && sk.ai) || {}; }
function stateRequirementMet(mon, req){
  if(!req) return true;
  if(Array.isArray(req)) return req.some(x => monsterStateActive(mon, x));
  return monsterStateActive(mon, req);
}
function autoSkillScore(skillKey, sk, mon, ctx){
  const ai = skillAiMeta(skillKey, sk);
  const tag = ai.priorityTag || 'builder';
  const base = { heal:120, defBuff:110, buff:80, setup:78, spender:86, execute:92, aoe:74, dot:72, strike:56, builder:40 }[tag] || 40;
  const dotCount = getMonsterDotCount(mon, ctx.now);
  if(sk.type === 'buff' && sk.buff && state.buffs[sk.buff] > ctx.now) return null;
  if(ai.useIfBuffMissing && state.buffs[ai.useIfBuffMissing] > ctx.now) return null;
  if(ai.useIfBuffActive && !buffActive(ai.useIfBuffActive, ctx.now)) return null;
  if(ai.onlyOnBoss && !mon.isBoss) return null;
  if(ai.minEnemies && ctx.aliveN < ai.minEnemies) return null;
  if(ai.useIfSelfHpBelow && ctx.hpFrac > ai.useIfSelfHpBelow) return null;
  if(sk.type === 'heal' && !ai.useIfSelfHpBelow && ctx.hpFrac > 0.75) return null;
  if(ai.useIfTargetHpBelow && ctx.targetHpFrac > ai.useIfTargetHpBelow) return null;
  if(ai.avoidIfTargetHpBelow && ctx.targetHpFrac <= ai.avoidIfTargetHpBelow) return null;
  if(ai.useIfTargetHas && !stateRequirementMet(mon, ai.useIfTargetHas)) return null;
  if(ai.useIfTargetMissing && stateRequirementMet(mon, ai.useIfTargetMissing)) return null;
  if(ai.useIfDotCountAtLeast && dotCount < ai.useIfDotCountAtLeast) return null;
  if(ai.useIfDotCountBelow !== undefined && dotCount >= ai.useIfDotCountBelow) return null;
  if(ai.useIfTargetDotKeyPresent && !monsterHasDotKey(mon, ai.useIfTargetDotKeyPresent, ctx.now)) return null;
  if(ai.useIfTargetDotKeyMissing && monsterHasDotKey(mon, ai.useIfTargetDotKeyMissing, ctx.now)) return null;
  if(ai.useIfChargeAtLeast && skillAuraStacks(ai.useIfChargeKey) < ai.useIfChargeAtLeast) return null;

  let score = base;
  if(mon.isBoss && ai.preferOnBoss) score += 18;
  if(tag === 'heal') score += Math.round((1 - ctx.hpFrac) * 120);
  if(tag === 'defBuff') score += Math.round((1 - ctx.hpFrac) * 105);
  if(tag === 'execute') score += Math.round((1 - ctx.targetHpFrac) * 70);
  if(tag === 'setup' && ai.useIfTargetMissing) score += 16;
  if(tag === 'dot' && ai.useIfTargetMissing) score += 12;
  if(tag === 'dot' && ai.useIfTargetDotKeyMissing) score += 12;
  if(tag === 'spender' && ai.useIfTargetHas) score += 16;
  if(tag === 'spender' && ai.useIfTargetDotKeyPresent) score += 16;
  if(tag === 'spender' && ai.useIfDotCountAtLeast) score += dotCount * 8;
  if(tag === 'spender' && ai.useIfChargeKey) score += skillAuraStacks(ai.useIfChargeKey) * 6;
  if(tag === 'aoe') score += Math.min(18, ctx.aliveN * 6);
  if((sk.mul || 0) >= 6 && mon.isBoss) score += 8;
  if(sk.castTime >= 2 && !mon.isBoss && ctx.targetHpFrac < 0.2) score -= 12;
  if((skillAiMeta(skillKey, sk).priorityTag === 'buff') && ctx.targetHpFrac < 0.35 && !mon.isBoss) score -= 8;
  return score;
}
function autoCastSkillEntries(cls){
  if(!cls || !cls.skills) return [];
  return Object.entries(cls.skills)
    .filter(([skillKey, sk]) => !!state.unlockedSkills[skillKey] && sk && sk.type !== 'passive')
    .sort((a, b) => {
      const la = Number.isFinite(a[1]?.unlockLvl) ? a[1].unlockLvl : 9999;
      const lb = Number.isFinite(b[1]?.unlockLvl) ? b[1].unlockLvl : 9999;
      if (la !== lb) return la - lb;
      return 0;
    });
}
function runTalentAction(fx, mon, value, ctx, now){
  if(fx.aura) addTalentAura(fx.aura, true);
  if(fx.grantCharge && fx.grantCharge.key){
    const gc = fx.grantCharge;
    addSkillAura(gc.key, { add: gc.add || 1, max: gc.max || (SKILL_AURA_LIBRARY[gc.key]?.maxStacks) || 1, duration: gc.duration || 12000 });
  }
  if(fx.resource) grantTalentResource(fx.resource);
  if(fx.healPct) healHeroAmount(Math.floor(state.hero.hpMax * fx.healPct), fx.healIcon || '💚', '#6ee7b7');
  if(fx.shieldPct) addTalentShield(Math.floor(state.hero.hpMax * fx.shieldPct), true);
  if(fx.nextSkillCrit) grantNextSkillCrit(fx.nextSkillCrit);
  if(fx.extraHitMul && mon && mon.hp > 0){
    let extra = Math.max(1, Math.floor((value || state.hero.atk) * fx.extraHitMul));
    extra = absorbMonsterBarrier(mon, extra, fx.icon || '🛡️').remaining;
    const dr = monsterDamageReduction(mon, now);
    if(dr && extra > 0) extra = Math.max(1, Math.floor(extra * (1 - dr)));
    if(extra > 0){
      mon.hp -= extra;
      trackDmg('hero', extra);
      showMonsterFloat(mon, (fx.extraHitIcon || '⚔️') + '-' + extra, '#fbbf24');
    }
  }
  if(fx.applyDotPct && mon && mon.hp > 0){
    const dot = Math.max(1, Math.floor((value || state.hero.atk) * fx.applyDotPct * (1 + (state.hero.dotBonus || 0)/100)));
    applyMonsterDot(mon, 'talent:' + talentProcKey(fx, 'dot'), dot, fx.dotMs || 5000, { icon: fx.dotIcon || '☠️', name: fx.dotName || '天赋持续伤害', source: fx.name || fx.key || 'talent' });
    showMonsterFloat(mon, fx.dotIcon || '☠️', '#c084fc');
  }
  if(fx.spreadDotPct) spreadDotFromMonster(mon, fx.spreadDotPct, fx.dotMs || 5000);
  if(fx.resetSkill) resetSkillCooldown(fx.resetSkill, fx.resetPct || 1);
}
function processTalentOnCrit(mon, value, ctx){
  const now = Date.now();
  for(const fx of talentFxList()){
    if(fx.type !== 'onCrit') continue;
    if(!skillMatches(fx, ctx?.skillKey)) continue;
    if(fx.state && !monsterStateActive(mon, fx.state)) continue;
    if(fx.chance && Math.random() * 100 > fx.chance) continue;
    if(!talentCooldownReady(talentProcKey(fx, 'crit'), fx.cooldown || 0, now)) continue;
    runTalentAction(fx, mon, value, ctx, now);
  }
}
function processTalentOnKill(mon){
  const now = Date.now();
  for(const fx of talentFxList()){
    if(fx.type !== 'onKill') continue;
    if(fx.requireDot && !monsterStateActive(mon, 'dot')) continue;
    if(!talentCooldownReady(talentProcKey(fx, 'kill'), fx.cooldown || 0, now)) continue;
    runTalentAction(fx, mon, getMonsterDotDps(mon, now) || state.hero.atk, { mon }, now);
  }
}
function processTalentLowHp(mon, now){
  const hpPct = state.hp / Math.max(1, state.hero.hpMax);
  for(const fx of talentFxList()){
    if(fx.type !== 'lowHp') continue;
    if(hpPct > (fx.threshold || 0.35)) continue;
    if(!talentCooldownReady(talentProcKey(fx, 'lowhp'), fx.cooldown || 30000, now)) continue;
    runTalentAction(fx, mon, state.hero.hpMax, { mon }, now);
  }
}
function processTalentAfterSkill(skillKey, sk, mon, value, ctx){
  const now = Date.now();
  for(const fx of talentFxList()){
    if(fx.type !== 'afterSkill') continue;
    if(!skillMatches(fx, skillKey)) continue;
    if(fx.state && !monsterStateActive(mon, fx.state)) continue;
    if(fx.chance && Math.random() * 100 > fx.chance) continue;
    if(!talentCooldownReady(talentProcKey(fx, 'skill:' + skillKey), fx.cooldown || 0, now)) continue;
    runTalentAction(fx, mon, value, Object.assign({ skillKey, sk }, ctx || {}), now);
  }
}
function processTalentAfterHeal(skillKey, amount, overheal){
  const now = Date.now();
  for(const fx of talentFxList()){
    if(fx.type !== 'afterHeal') continue;
    if(!skillMatches(fx, skillKey)) continue;
    if(!talentCooldownReady(talentProcKey(fx, 'heal:' + skillKey), fx.cooldown || 0, now)) continue;
    if(fx.overhealShieldPct && overheal > 0) addTalentShield(Math.floor(overheal * fx.overhealShieldPct), true);
    runTalentAction(fx, null, amount, { skillKey, overheal }, now);
  }
}

/* ---------- 属性重算 ---------- */
function recomputeStats() {
  const c = getCls(); if (!c) return;
  const lvl = state.hero.lvl; const base = c.baseStats;

  // 来源追踪(供 UI 展示各来源贡献明细)
  state._statSources = {};
  let _srcSnap = {};
  const _snapSrc = () => { _srcSnap = {atkPct, hpPct, defPct, spdPct, critdPct, crit:critFlat, leech, vers, mastery, haste, regFlat, extraAtk}; };
  const _saveSrc = (name) => {
    const cur = {atkPct, hpPct, defPct, spdPct, critdPct, crit:critFlat, leech, vers, mastery, haste, regFlat};
    const d = {}; let has = false;
    for (const k of Object.keys(_srcSnap)) {
      const v = +(cur[k] - (_srcSnap[k]||0)).toFixed(1);
      if (Math.abs(v) > 0.005) { d[k] = v; has = true; }
    }
    if (has) state._statSources[name] = d;
  };
  let attrs = { str:0, agi:0, int:0, spi:0, sta:0 };
  for (const k of Object.keys(attrs)) attrs[k] = c.baseAttrs[k] + state.attrs[k];

  let attrPct = { str:0, agi:0, int:0, spi:0, sta:0 };
  let atkPct=0, critdPct=0, hpPct=0, defPct=0, spdPct=0, mpPct=0;
  let critFlat=0, regFlat=0, leech=0, vers=0, mastery=5, haste=0;
  let cdReduction=0, buffDuration=0, extraAtk=0, healBonus=0, dotBonus=0;
  let costReduction=0, executeBonus=0, reflectDmg=0;
  let armorPen=0, dodge=0, stunChance=0;   // 趣味天赋:破甲/闪避/击晕
  const talentFx = [];

  _snapSrc();
  for (const [treeKey, tals] of Object.entries(state.talents)) {
    for (const [tKey, rank] of Object.entries(tals)) {
      const tree = c.trees.find(t => t.key === treeKey); if (!tree) continue;
      const t = tree.talents.find(x => x.key === tKey); if (!t || (!t.mod && !t.fx)) continue;
      if (rank > 0 && t.fx) {
        const fxList = Array.isArray(t.fx) ? t.fx : [t.fx];
        for (const fx of fxList) talentFx.push(Object.assign({ talentKey:t.key, talentName:t.name, treeKey }, fx));
      }
      if (!t.mod) continue;
      for (const [k, v] of Object.entries(t.mod)) {
        const total = v * rank;
        if (k==='atkPct') atkPct+=total; else if (k==='critdPct') critdPct+=total;
        else if (k==='hpPct') hpPct+=total; else if (k==='defPct') defPct+=total;
        else if (k==='spdPct') spdPct+=total; else if (k==='mpPct') mpPct+=total;
        else if (k==='crit') critFlat+=total; else if (k==='regFlat') regFlat+=total;
        else if (k==='strPct') attrPct.str+=total; else if (k==='agiPct') attrPct.agi+=total;
        else if (k==='intPct') attrPct.int+=total; else if (k==='spiPct') attrPct.spi+=total;
        else if (k==='staPct') attrPct.sta+=total;
        else if (k==='leech') leech+=total; else if (k==='vers') vers+=total;
        else if (k==='mastery') mastery+=total; else if (k==='cdReduction') cdReduction+=total;
        else if (k==='buffDuration') buffDuration+=total; else if (k==='extraAtk') extraAtk+=total;
        else if (k==='healBonus') healBonus+=total; else if (k==='dotBonus') dotBonus+=total;
        else if (k==='costReduction') costReduction+=total; else if (k==='executeBonus') executeBonus+=total;
        else if (k==='reflectDmg') reflectDmg+=total;
        else if (k==='armorPen') armorPen+=total; else if (k==='dodge') dodge+=total;
        else if (k==='stunChance') stunChance+=total;
      }
    }
  }
  _saveSrc('天赋');
  _snapSrc();
  pruneTalentAuras(Date.now());
  for (const [auraKey, expire] of Object.entries(state.talentAuras || {})) {
    if (!(expire > Date.now())) continue;
    const aura = talentAuraMeta(auraKey);
    if (!aura || !aura.mod) continue;
    for (const [k, v] of Object.entries(aura.mod)) {
      if (k==='atkPct') atkPct+=v; else if (k==='critdPct') critdPct+=v;
      else if (k==='hpPct') hpPct+=v; else if (k==='defPct') defPct+=v;
      else if (k==='spdPct') spdPct+=v; else if (k==='mpPct') mpPct+=v;
      else if (k==='crit') critFlat+=v; else if (k==='regFlat') regFlat+=v;
      else if (k==='strPct') attrPct.str+=v; else if (k==='agiPct') attrPct.agi+=v;
      else if (k==='intPct') attrPct.int+=v; else if (k==='spiPct') attrPct.spi+=v;
      else if (k==='staPct') attrPct.sta+=v;
      else if (k==='leech') leech+=v; else if (k==='vers') vers+=v;
      else if (k==='mastery') mastery+=v; else if (k==='cdReduction') cdReduction+=v;
      else if (k==='buffDuration') buffDuration+=v; else if (k==='extraAtk') extraAtk+=v;
      else if (k==='healBonus') healBonus+=v; else if (k==='dotBonus') dotBonus+=v;
      else if (k==='costReduction') costReduction+=v; else if (k==='executeBonus') executeBonus+=v;
      else if (k==='reflectDmg') reflectDmg+=v;
      else if (k==='armorPen') armorPen+=v; else if (k==='dodge') dodge+=v;
      else if (k==='stunChance') stunChance+=v;
    }
  }
  _saveSrc('天赋触发');
  // 永久属性加成(成就奖励)— 接入与 talent.mod 同 schema
  _snapSrc();
  if (typeof collectProgressionBonus === 'function') {
    const p = collectProgressionBonus();
    for (const [k, v] of Object.entries(p)) {
      if (!v) continue;
      if (k==='atkPct') atkPct+=v; else if (k==='critdPct') critdPct+=v;
      else if (k==='hpPct') hpPct+=v; else if (k==='defPct') defPct+=v;
      else if (k==='spdPct') spdPct+=v; else if (k==='mpPct') mpPct+=v;
      else if (k==='crit') critFlat+=v; else if (k==='regFlat') regFlat+=v;
      else if (k==='strPct') attrPct.str+=v; else if (k==='agiPct') attrPct.agi+=v;
      else if (k==='intPct') attrPct.int+=v; else if (k==='spiPct') attrPct.spi+=v;
      else if (k==='staPct') attrPct.sta+=v;
      else if (k==='leech') leech+=v; else if (k==='vers') vers+=v;
      else if (k==='mastery') mastery+=v; else if (k==='cdReduction') cdReduction+=v;
      else if (k==='extraAtk') extraAtk+=v; else if (k==='healBonus') healBonus+=v;
      else if (k==='dotBonus') dotBonus+=v; else if (k==='costReduction') costReduction+=v;
      else if (k==='executeBonus') executeBonus+=v; else if (k==='reflectDmg') reflectDmg+=v;
    }
  }
  _saveSrc('成就');
  // 觉醒(光辉值)加成 — 同 schema 但额外有 xpMult/goldMult/dropMult 由 combat 单独读取
  _snapSrc();
  if (typeof collectAscendMod === 'function') {
    const p = collectAscendMod();
    for (const [k, v] of Object.entries(p)) {
      if (!v) continue;
      if (k==='atkPct') atkPct+=v; else if (k==='critdPct') critdPct+=v;
      else if (k==='hpPct') hpPct+=v; else if (k==='defPct') defPct+=v;
      else if (k==='spdPct') spdPct+=v;
      else if (k==='crit') critFlat+=v;
      else if (k==='leech') leech+=v; else if (k==='vers') vers+=v;
      else if (k==='mastery') mastery+=v;
      // xpMult/goldMult/dropMult 在战斗中单独消费
    }
  }
  _saveSrc('觉醒');
  // 生活技能 buff(食物/药水)— 同 schema,xpMult/goldMult/dropMult 由 combat 消费
  _snapSrc();
  if (typeof collectLifeMod === 'function') {
    const p = collectLifeMod();
    for (const [k, v] of Object.entries(p)) {
      if (!v) continue;
      if (k==='atkPct') atkPct+=v;
      else if (k==='hpPct') hpPct+=v;
      else if (k==='defPct') defPct+=v;
      // xpMult/goldMult/dropMult 在 killMonster 消费
    }
  }
  _saveSrc('生活');
  // 神器 — 同 schema,xpMult/goldMult/dropMult 由 combat 消费
  _snapSrc();
  if (typeof collectArtifactMod === 'function') {
    const p = collectArtifactMod();
    for (const [k, v] of Object.entries(p)) {
      if (!v) continue;
      if (k==='atkPct') atkPct+=v;
      else if (k==='hpPct') hpPct+=v;
      else if (k==='defPct') defPct+=v;
      else if (k==='critdPct') critdPct+=v;
      else if (k==='spdPct') spdPct+=v;
      else if (k==='crit') critFlat+=v;
      else if (k==='leech') leech+=v;
      else if (k==='vers') vers+=v;
      else if (k==='mastery') mastery+=v;
    }
  }
  _saveSrc('神器');
  // 坐骑 — 同 schema
  _snapSrc();
  if (typeof collectMountMod === 'function') {
    const p = collectMountMod();
    for (const [k, v] of Object.entries(p)) {
      if (!v) continue;
      if (k==='atkPct') atkPct+=v;
      else if (k==='hpPct') hpPct+=v;
      else if (k==='defPct') defPct+=v;
      else if (k==='critdPct') critdPct+=v;
      else if (k==='spdPct') spdPct+=v;
      else if (k==='crit') critFlat+=v;
      else if (k==='leech') leech+=v;
      else if (k==='vers') vers+=v;
      else if (k==='mastery') mastery+=v;
    }
  }
  _saveSrc('坐骑');
  // 竞技场(PvP 段位 + 荣誉商店)— 同 schema
  _snapSrc();
  if (typeof collectArenaMod === 'function') {
    const p = collectArenaMod();
    for (const [k, v] of Object.entries(p)) {
      if (!v) continue;
      if (k==='atkPct') atkPct+=v;
      else if (k==='hpPct') hpPct+=v;
      else if (k==='defPct') defPct+=v;
      else if (k==='critdPct') critdPct+=v;
      else if (k==='spdPct') spdPct+=v;
      else if (k==='crit') critFlat+=v;
      else if (k==='leech') leech+=v;
      else if (k==='vers') vers+=v;
      else if (k==='mastery') mastery+=v;
    }
  }
  _saveSrc('竞技场');
  // 被动技能(按等级解锁)— 同 schema
  _snapSrc();
  if (typeof collectPassiveMod === 'function') {
    const p = collectPassiveMod();
    for (const [k, v] of Object.entries(p)) {
      if (!v) continue;
      if (k==='atkPct') atkPct+=v;
      else if (k==='hpPct') hpPct+=v;
      else if (k==='defPct') defPct+=v;
      else if (k==='critdPct') critdPct+=v;
      else if (k==='spdPct') spdPct+=v;
      else if (k==='crit') critFlat+=v;
      else if (k==='leech') leech+=v;
      else if (k==='vers') vers+=v;
      else if (k==='mastery') mastery+=v;
    }
  }
  _saveSrc('被动');
  // 随从(专属/定位/收藏/羁绊)— 同 schema(额外含 regFlat)
  _snapSrc();
  if (typeof collectCompanionMod === 'function') {
    const p = collectCompanionMod();
    for (const [k, v] of Object.entries(p)) {
      if (!v) continue;
      if (k==='atkPct') atkPct+=v;
      else if (k==='hpPct') hpPct+=v;
      else if (k==='defPct') defPct+=v;
      else if (k==='critdPct') critdPct+=v;
      else if (k==='spdPct') spdPct+=v;
      else if (k==='crit') critFlat+=v;
      else if (k==='leech') leech+=v;
      else if (k==='vers') vers+=v;
      else if (k==='mastery') mastery+=v;
      else if (k==='regFlat') regFlat+=v;
    }
  }
  _saveSrc('随从');
  for (const k of Object.keys(attrs)) attrs[k] = Math.floor(attrs[k] * (1 + attrPct[k]/100));
  state._attrs = attrs;

  const primary = attrs[c.attackAttr];
  let atk = base.atk + primary * 1.5 + (lvl-1) * 2;
  let equipAtk = 0;   // 装备攻击(不受 atkPct 加成)
  let def = base.def + Math.floor(attrs.sta * 0.3) + (lvl-1) * 1;
  let hpMax = base.hpMax + attrs.sta * 10 + (lvl-1) * 12;
  let mpMax = (c.resKey === 'rage' || c.resKey === 'energy') ? 100 : base.mpMax + attrs.int * 5 + (lvl-1) * 5;
  let crit = base.crit + critFlat;   // 敏捷不再提供暴击(2026-06-16)
  let critd = base.critd + critdPct; let spd = base.spd;
  let reg = base.reg + Math.floor(attrs.spi * 0.2) + regFlat;

  _snapSrc();
  const _hasEnhanced = (typeof collectItemBonuses === 'function');
  // 辅助:将一组加成(来自同一来源)应用到共享属性变量
  const _applyBonusSet = (getBonus) => {
    let equipAttrBonus = { str:0, agi:0, int:0, spi:0, sta:0 };
    let gearAttrPct = { str:0, agi:0, int:0, spi:0, sta:0 };
    for (const slotKey of SLOT_ORDER) {
      const it = state.equipped[slotKey]; if (!it) continue;
      const b = getBonus(it); if (!b) continue;
      equipAtk+=b.atk; def+=b.def; hpMax+=b.hp; crit+=b.crit;
      critd+=b.critd; spd+=b.spd; reg+=b.reg;
      leech+=b.leech; vers+=b.vers; mastery+=b.mastery; haste+=b.haste||0; dodge+=b.dodge||0;
      for (const ak of ['str','agi','int','spi','sta']) {
        equipAttrBonus[ak] += b[ak];
        if (ak === c.attackAttr) equipAtk += b[ak] * 1.5;
        if (ak === 'sta') hpMax += b[ak] * 10;
      }
      atkPct+=b.atkPct; hpPct+=b.hpPct; defPct+=b.defPct;
      spdPct+=b.spdPct; critdPct+=b.critdPct;
      gearAttrPct.str+=b.strPct; gearAttrPct.agi+=b.agiPct; gearAttrPct.int+=b.intPct;
      gearAttrPct.spi+=b.spiPct; gearAttrPct.sta+=b.staPct;
      cdReduction+=b.cdReduction; costReduction+=b.costReduction;
      extraAtk+=b.extraAtk; healBonus+=b.healBonus;
      dotBonus+=b.dotBonus; executeBonus+=b.executeBonus;
      reflectDmg+=b.reflectDmg;
    }
    for (const k of Object.keys(attrs)) attrs[k] += (equipAttrBonus[k] || 0);
    for (const k of ['str','agi','int','spi','sta']) {
      if (!gearAttrPct[k]) continue;
      const before = attrs[k];
      const after = Math.floor(before * (1 + gearAttrPct[k]/100));
      const delta = after - before;
      attrs[k] = after;
      if (k === c.attackAttr) equipAtk += delta * 1.5;
      if (k === 'sta') hpMax += delta * 10;
    }
  };

  // 1) 装备基础属性
  if (_hasEnhanced) {
    _applyBonusSet(it => (typeof collectBaseBonuses === 'function') ? collectBaseBonuses(it) : collectItemBonuses(it));
  } else {
    // 回退:老逻辑(不依赖 enhance.js)
    _applyBonusSet(it => {
      if (!it || !it.stats) return null;
      const b = {atk:0,def:0,hp:0,crit:0,critd:0,spd:0,reg:0,str:0,agi:0,int:0,spi:0,sta:0,leech:0,vers:0,mastery:0,haste:0,dodge:0,atkPct:0,hpPct:0,defPct:0,spdPct:0,critdPct:0,strPct:0,agiPct:0,intPct:0,spiPct:0,staPct:0,cdReduction:0,costReduction:0,extraAtk:0,healBonus:0,dotBonus:0,executeBonus:0,reflectDmg:0};
      for (const [k, v] of Object.entries(it.stats)) { if (k in b) b[k] += v; }
      return b;
    });
  }
  _saveSrc('装备');

  // 2) 词缀
  if (_hasEnhanced && typeof collectAffixBonuses === 'function') {
    _snapSrc();
    _applyBonusSet(it => collectAffixBonuses(it));
    _saveSrc('词缀');
  }

  // 3) 宝石
  if (_hasEnhanced && typeof collectGemBonuses === 'function') {
    _snapSrc();
    _applyBonusSet(it => collectGemBonuses(it));
    _saveSrc('宝石');
  }

  // 4) 附魔
  if (_hasEnhanced && typeof collectEnchantBonuses === 'function') {
    _snapSrc();
    _applyBonusSet(it => collectEnchantBonuses(it));
    _saveSrc('附魔');
  }
  atk = Math.floor(atk * (1 + atkPct/100)) + equipAtk; hpMax = Math.floor(hpMax * (1 + hpPct/100));
  def = Math.floor(def * (1 + defPct/100));
  // 攻速稀有化:spdPct 的各来源数值已在 spd_tuning.js 加载期统一归一化为 30%(显示=实际),
  // 故此处按面值应用即可,不再隐藏缩放。技能增益(风怒/嗜血等)走下方 state.buffs 独立乘法。
  spd = +(spd * (1 + spdPct/100)).toFixed(2);
  mpMax = Math.floor(mpMax * (1 + mpPct/100));

  const now = Date.now();
  if (state.buffs.shield>now) def=Math.floor(def*1.33);
  if (state.buffs.divine>now) def=Math.floor(def*1.53);
  if (state.buffs.bark>now) def=Math.floor(def*1.40);
  if (state.buffs.iceBarrier>now) def=Math.floor(def*1.40);
  if (state.buffs.earthShield>now) def=Math.floor(def*1.33);
  if (state.buffs.evasion>now) def=Math.floor(def*1.27);
  if (state.buffs.bestial>now) atk=Math.floor(atk*1.27);
  if (state.buffs.shadowstep>now) atk=Math.floor(atk*1.33);
  if (state.buffs.battleShout>now) atk=Math.floor(atk*1.20);
  if (state.buffs.kings>now){atk=Math.floor(atk*1.13);def=Math.floor(def*1.13);}
  if (state.buffs.berserk>now){atk=Math.floor(atk*1.27);spd=+(spd*1.20).toFixed(2);}
  if (state.buffs.windfury>now) spd=+(spd*1.40).toFixed(2);
  if (state.buffs.rapidFire>now) spd=+(spd*1.40).toFixed(2);
  if (state.buffs.bloodlust>now) spd=+(spd*1.47).toFixed(2);
  if (state.buffs.timeWarp>now) spd=+(spd*1.53).toFixed(2);
  if (state.buffs.sacredShield>now){def=Math.floor(def*1.27);reg+=3;}
  if (state.buffs.seraphim>now){atk=Math.floor(atk*1.40);vers+=7;}
  if (state.buffs.demonForm>now){atk=Math.floor(atk*1.33);leech+=10;}
  // 新技能通用增益(skills_ext.js 的 BUFF_FX);dr 在受击时由 buffDamageReductionMult 处理
  if (typeof BUFF_FX==='object') {
    for (const k in BUFF_FX) {
      if (!(state.buffs[k]>now)) continue;
      const fx=BUFF_FX[k];
      if (fx.atkMul) atk=Math.floor(atk*fx.atkMul);
      if (fx.defMul) def=Math.floor(def*fx.defMul);
      if (fx.spdMul) spd=+(spd*fx.spdMul).toFixed(2);
      if (fx.critAdd) critFlat+=fx.critAdd;
      if (fx.critdAdd) critd+=fx.critdAdd;
      if (fx.leechAdd) leech+=fx.leechAdd;
      if (fx.versAdd) vers+=fx.versAdd;
      if (fx.regAdd) reg+=fx.regAdd;
    }
  }
  // 英雄减益(虚弱降攻击 / 冰缚降攻速)
  if (typeof DEBUFF_FX==='object' && state.heroDebuffs) {
    for (const k in state.heroDebuffs) {
      if (!(state.heroDebuffs[k].expire>now)) continue;
      const fx=DEBUFF_FX[k]; if(!fx) continue;
      if (fx.atkMul) atk=Math.floor(atk*fx.atkMul);
      if (fx.spdMul) spd=+(spd*fx.spdMul).toFixed(2);
    }
  }

  // 大秘境词缀:暴风(攻速-) / 无心(治疗-)
  const ms2 = state.mythicState;
  if (ms2 && ms2.affixes && state.mode === 'mythic') {
    for (const af of ms2.affixes) {
      if (af.mod.heroSpd) spd = +(spd * (1 + af.mod.heroSpd)).toFixed(2);
      if (af.mod.healReduction) healBonus = Math.floor(healBonus * (1 - af.mod.healReduction));
    }
  }

  // 精通被动:属性类效果(dotAmp/healAmp/critdAmp/leechAmp)在此并入对应属性;
  // dmgAmp/dr/bleedOnCrit 为战斗时钩子(masteryDmgMult/masteryTakenMult/暴击流血)。
  const _mspec = MASTERY_SPEC[state.specialization];
  if (_mspec==='dotAmp') dotBonus += mastery*MASTERY_TYPE.dotAmp.per;
  else if (_mspec==='healAmp') healBonus += mastery*MASTERY_TYPE.healAmp.per;
  else if (_mspec==='critdAmp') critd += mastery*MASTERY_TYPE.critdAmp.per;
  else if (_mspec==='leechAmp') leech += mastery*MASTERY_TYPE.leechAmp.per;

  // 保存来源汇总(供 UI 展示)— 注意:这些是 buff 前的基础百分比汇总
  state._statSources._total = {atkPct, hpPct, defPct, spdPct, critdPct, crit:critFlat, leech, vers, mastery, haste, regFlat, extraAtk};
  state.hero.atk=atk; state.hero.def=def; state.hero.hpMax=hpMax;
  state.hero.mpMax=Math.max(50,mpMax); state.hero.crit=Math.min(crit,90);
  state.hero.critd=critd; state.hero.spd=Math.min(spd,2.5); state.hero.reg=reg;   // 攻速封顶下调 6→2.5(攻速稀有化)
  state.hero.leech=Math.min(leech,30); state.hero.vers=Math.min(vers,40);   // 吸血/全能封顶,杜绝"秒回满血"和"近乎免伤"
  state.hero.haste=Math.min(Math.max(0,haste),50);   // 极速:影响攻速/读条/技能CD,封顶50%
  state.hero.mastery=Math.max(0,mastery); state.hero.cdReduction=Math.min(cdReduction,40);
  state.hero.buffDuration=Math.min(buffDuration,15); state.hero.extraAtk=Math.min(extraAtk,25);
  state.hero.healBonus=Math.min(healBonus,50); state.hero.dotBonus=Math.min(dotBonus,50);
  state.hero.costReduction=Math.min(costReduction,30); state.hero.executeBonus=Math.min(executeBonus,40);
  state.hero.reflectDmg=reflectDmg;
  state.hero.armorPen=Math.min(armorPen,40); state.hero.dodge=Math.min(dodge,30); state.hero.stunChance=Math.min(stunChance,15);
  state._talentFx = talentFx;
  state.hp=Math.min(state.hp,state.hero.hpMax); state.resourceMax=state.hero.mpMax;
  state.resource=Math.min(state.resource,state.resourceMax);
  markDirty('hero','equipment');
}

/* ---------- 怪物 ---------- */
let monUidSeq=1;   // 每只敌人唯一 id(供 UI 点击切目标 / 渲染追踪)
// 野外小怪按名称判定"身份",赋予符合身份的技能(2026-06-16)
function mobKind(name){
  if(/猪|犀|牛|象|蛮|羊|鹿|马|熊|虎|狮|狼|猛犸|科多/.test(name)){return /熊|龟|蟹|甲|盾|岩|石/.test(name)?'tank':'charger';}
  if(/法师|术士|萨满|巫|祭司|先知|咒|灵|鬼|魔导|施法|奥术|元素/.test(name))return 'caster';
  if(/卫兵|守卫|护卫|盾|龟|蟹|甲|岩|石|骑士|战士|督军|领主/.test(name))return 'tank';
  return null;
}
function mobSkillTags(name, kind, isBoss){
  const tags = [];
  const push = tag => { if(tag && !tags.includes(tag)) tags.push(tag); };
  if(isBoss) push('boss');
  if(/蜘蛛|蛛|蝎|蛇|毒|蠕虫|爬虫|虫|异虫|蚊/.test(name)) { push('poison'); push('beast'); }
  if(/亡灵|食尸鬼|骨|骷髅|怨灵|幽灵|鬼|死|天灾|尸|亡魂|灵魂/.test(name)) { push('undead'); push('spirit'); }
  if(/火|焰|炎|熔岩|地狱火|炎魔/.test(name)) { push('fire'); push('elemental'); }
  if(/冰|霜|雪|寒|冻/.test(name)) { push('frost'); push('elemental'); }
  if(/雷|电|风暴|风|空气/.test(name)) { push('storm'); push('elemental'); }
  if(/龙|雏龙|飞龙/.test(name)) push('dragon');
  if(/机器人|机甲|傀儡|造物|守护者|泰坦/.test(name)) push('construct');
  if(/劫匪|盗贼|刺客|斥候|特工|猎手|强盗|窃贼/.test(name)) push('rogue');
  if(/兽人|战士|卫兵|守卫|护卫|督军|骑士|领主|巨魔|掠夺者|指挥官/.test(name)) push('soldier');
  if(/树精|鞭笞者|蘑菇|真菌|孢子|沼泽行者/.test(name)) push('nature');
  if(/水|潮汐|海|鲨|龟|鳄|湖|沼泽/.test(name)) push('aquatic');
  if(/鹰|狮鹫|角鹰兽|风蛇|翼/.test(name)) push('storm');
  if(/猪|野猪|公猪|鹿|马|狼|虎|狮|猎犬|豹|鳄鱼|猩猩|迅猛龙|雄鹿/.test(name)) { push('beast'); push('charger'); }
  if(/犀|牛|象|猛犸|熊|暴龙|巨熊/.test(name)) { push('beast'); push('brute'); }
  if(/元素|奥术|法师|术士|祭司|先知|巫|咒|虚空|日怒|魔导|施法/.test(name)) push('caster');
  if(kind) push(kind);
  return tags;
}
// 小怪技能池(扩展版,按主题/等级抽取,支持更多 debuff)
const MON_SKILLS = [
  {name:'重击',icon:'💥',mul:1.5,stun:1000,tags:['soldier','brute','tank','construct','generic']},
  {name:'猛击',icon:'👊',mul:2.0,stun:800,tags:['beast','brute','tank','soldier','construct','generic']},
  {name:'冲锋',icon:'🐗',mul:1.8,stun:600,tags:['beast','charger','soldier','brute','generic']},
  {name:'撕裂',icon:'🩸',mul:1.5,dot:2,tags:['beast','brute','dragon','rogue','generic']},
  {name:'穿刺',icon:'🗡️',mul:1.8,dot:2,tags:['poison','beast','rogue','soldier','generic']},
  {name:'破甲',icon:'🔨',mul:1.5,weaken:true,tags:['tank','soldier','construct','brute']},
  {name:'盾击',icon:'🛡️',mul:1.4,silence:2000,minLvl:12,tags:['tank','soldier','construct']},
  {name:'断筋',icon:'🦵',mul:1.6,cripple:true,minLvl:10,tags:['soldier','rogue','beast','brute']},
  {name:'凿骨打击',icon:'🪓',mul:1.7,brittle:true,minLvl:18,tags:['brute','undead','soldier','construct']},
  {name:'雷霆一击',icon:'⚡',mul:1.5,slow:true,tags:['tank','soldier','storm','construct']},
  {name:'旋风斩',icon:'🌀',mul:1.8,tags:['soldier','rogue','storm','generic']},
  {name:'横扫打击',icon:'🪓',mul:1.9,tags:['beast','brute','soldier','generic']},
  {name:'毒刃',icon:'🗡️',mul:1.5,dot:4,tags:['poison','rogue']},
  {name:'毒液喷吐',icon:'🦂',mul:1.5,dot:5,tags:['poison']},
  {name:'毒牙撕咬',icon:'🐍',mul:1.6,dot:4,minLvl:8,tags:['poison','beast']},
  {name:'麻痹毒针',icon:'🪡',mul:1.4,cripple:true,minLvl:16,tags:['poison']},
  {name:'腐毒感染',icon:'🦠',mul:1.4,plague:true,minLvl:24,tags:['poison','undead']},
  {name:'火球术',icon:'🔥',mul:1.5,dot:3,tags:['fire','caster','dragon']},
  {name:'灼热之触',icon:'🔥',mul:1.5,dot:3,tags:['fire','elemental','caster']},
  {name:'烈焰冲击',icon:'🌋',mul:1.7,dot:4,minLvl:14,tags:['fire','caster','dragon','elemental']},
  {name:'熔岩爆裂',icon:'🌋',mul:1.9,brittle:true,minLvl:28,tags:['fire','dragon','elemental']},
  {name:'寒冰箭',icon:'❄️',mul:1.5,slow:true,tags:['frost','caster']},
  {name:'冰霜之握',icon:'❄️',mul:1.5,slow:true,tags:['frost','undead','caster']},
  {name:'冰枪穿刺',icon:'🧊',mul:1.6,freeze:1200,minLvl:18,tags:['frost','caster','dragon']},
  {name:'寒冰新星',icon:'❄️',mul:1.4,freeze:1500,minLvl:26,tags:['frost','caster','elemental']},
  {name:'暗影箭',icon:'🌑',mul:1.8,weaken:true,tags:['undead','caster','spirit']},
  {name:'暗言术·痛',icon:'☠️',mul:1.5,dot:3,tags:['undead','caster','spirit']},
  {name:'暗影打击',icon:'💀',mul:2.0,weaken:true,tags:['undead','rogue','caster']},
  {name:'骨刺',icon:'🦴',mul:1.8,stun:1000,tags:['undead']},
  {name:'灵魂尖啸',icon:'👻',mul:1.4,fear:1800,minLvl:20,tags:['spirit','undead','caster']},
  {name:'枯萎诅咒',icon:'🥀',mul:1.4,decay:true,minLvl:24,tags:['undead','caster','spirit']},
  {name:'凋零之触',icon:'🌑',mul:1.5,decay2:true,minLvl:42,tags:['undead','caster','spirit']},
  {name:'灵魂虹吸',icon:'🧛',mul:1.5,soulDrain:true,minLvl:30,tags:['spirit','undead','caster']},
  {name:'灵魂锁链',icon:'🔗',mul:1.5,soulLink:true,minLvl:45,tags:['spirit','undead','caster']},
  {name:'奥术飞弹',icon:'✨',mul:1.8,tags:['caster']},
  {name:'法力灼烧',icon:'💧',mul:1.4,manaDrain:40,minLvl:20,tags:['caster','spirit']},
  {name:'虚空震击',icon:'🌀',mul:1.6,silence:2000,minLvl:30,tags:['caster','spirit','elemental']},
  {name:'风暴打击',icon:'⚡',mul:2.0,slow:true,tags:['storm','soldier','dragon','elemental']},
  {name:'连环闪电',icon:'🌩️',mul:1.7,manaDrain:25,minLvl:24,tags:['storm','caster','elemental']},
  {name:'静电震爆',icon:'⚡',mul:1.5,silence:1500,minLvl:32,tags:['storm','elemental','caster']},
  {name:'地震',icon:'🌍',mul:1.5,stun:800,tags:['construct','tank','brute','elemental']},
  {name:'岩刺突袭',icon:'🪨',mul:1.7,brittle:true,minLvl:20,tags:['construct','tank','elemental']},
  {name:'龙息术',icon:'🐉',mul:1.8,dot:4,minLvl:18,tags:['dragon','fire']},
  {name:'龙翼震击',icon:'🪽',mul:1.7,stun:900,minLvl:20,tags:['dragon','soldier']},
  {name:'尾击横扫',icon:'🦴',mul:1.7,slow:true,minLvl:16,tags:['dragon','beast']},
  {name:'藤蔓缠绕',icon:'🌿',mul:1.4,cripple:true,minLvl:12,tags:['nature','caster','elemental']},
  {name:'孢子侵染',icon:'🍄',mul:1.4,decay:true,minLvl:22,tags:['nature','poison']},
];
const MON_SKILL_FALLBACKS = {
  beast: ['撕裂','冲锋','猛击','穿刺','横扫打击','断筋'],
  brute: ['重击','猛击','冲锋','破甲','凿骨打击','横扫打击'],
  charger: ['冲锋','重击','猛击','断筋'],
  poison: ['毒液喷吐','毒刃','穿刺','毒牙撕咬','麻痹毒针','腐毒感染'],
  undead: ['暗影箭','暗影打击','骨刺','暗言术·痛','冰霜之握','灵魂尖啸','枯萎诅咒'],
  spirit: ['暗言术·痛','灵魂尖啸','灵魂虹吸','灵魂锁链','法力灼烧'],
  fire: ['火球术','灼热之触','烈焰冲击','熔岩爆裂','龙息术'],
  frost: ['寒冰箭','冰霜之握','冰枪穿刺','寒冰新星'],
  storm: ['风暴打击','雷霆一击','旋风斩','连环闪电','静电震爆'],
  caster: ['火球术','寒冰箭','暗影箭','暗言术·痛','灼热之触','冰霜之握','奥术飞弹','法力灼烧','虚空震击'],
  dragon: ['龙息术','龙翼震击','尾击横扫','撕裂','火球术','风暴打击'],
  construct: ['重击','雷霆一击','破甲','地震','盾击','岩刺突袭'],
  rogue: ['毒刃','穿刺','撕裂','旋风斩','暗影打击','断筋'],
  soldier: ['重击','猛击','冲锋','破甲','雷霆一击','旋风斩','盾击','断筋'],
  tank: ['重击','猛击','破甲','雷霆一击','地震','盾击','岩刺突袭'],
  nature: ['藤蔓缠绕','孢子侵染','撕裂'],
  elemental: ['灼热之触','烈焰冲击','寒冰新星','连环闪电','地震','风暴打击'],
  aquatic: ['撕裂','断筋','冲锋'],
  generic: ['重击','撕裂','猛击','冲锋','旋风斩','横扫打击']
};
function pickWeightedSkill(pool){
  const total = pool.reduce((sum, entry) => sum + Math.max(1, entry.weight || entry.score || 1), 0);
  let roll = Math.random() * total;
  for(const entry of pool){
    roll -= Math.max(1, entry.weight || entry.score || 1);
    if(roll <= 0) return entry.skill || entry;
  }
  return (pool[pool.length - 1] || {}).skill || pool[pool.length - 1];
}
function buildMonSkillCandidatePool(name, kind, lvl){
  const tags = mobSkillTags(name, kind, false);
  const level = Math.max(1, lvl || 1);
  let pool = MON_SKILLS
    .filter(sk => level >= (sk.minLvl || 1))
    .map(sk => {
      const matches = (sk.tags || []).reduce((sum, tag) => {
        const idx = tags.indexOf(tag);
        return idx >= 0 ? sum + Math.max(1, tags.length - idx) : sum;
      }, 0);
      return matches > 0 ? { skill: sk, score: matches } : null;
    })
      .filter(Boolean);
  if(pool.length){
    const bestScore = pool.reduce((best, entry) => Math.max(best, entry.score), 0);
    const minScore = bestScore >= 5 ? bestScore - 2 : (bestScore >= 3 ? 2 : 1);
    pool = pool.filter(entry => entry.score >= minScore);
  }
  if(!pool.length){
    const fallbackNames = new Set([...(MON_SKILL_FALLBACKS[kind] || []), ...(MON_SKILL_FALLBACKS.generic || [])]);
    pool = MON_SKILLS
      .filter(sk => level >= (sk.minLvl || 1) && fallbackNames.has(sk.name))
      .map(sk => ({ skill: sk, score: 1 }));
  }
  if(!pool.length){
    pool = MON_SKILLS
      .filter(sk => level >= (sk.minLvl || 1) && (sk.tags || []).includes('generic'))
      .map(sk => ({ skill: sk, score: 1 }));
  }
  return pool;
}
function pickMonSkills(name, kind, lvl, count){
  const pool = buildMonSkillCandidatePool(name, kind, lvl);
  if(!pool.length) return [];
  const picks = [];
  const used = new Set();
  const total = Math.max(1, count || 1);
  while(picks.length < total){
    const candidates = pool.filter(entry => !used.has(entry.skill.name));
    if(!candidates.length) break;
    const skill = pickWeightedSkill(candidates);
    if(!skill) break;
    picks.push(skill);
    used.add(skill.name);
  }
  return picks;
}
function pickMonSkill(name, kind, lvl){
  return pickMonSkills(name, kind, lvl, 1)[0] || null;
}
const MON_SUPPORT_SKILLS = [
  {name:'低吼', icon:'📯', desc:'6秒攻击提高20%', minLvl:1, atkBuffSecs:6, atkBuffPct:20, cd:12000, tags:['beast','soldier','generic']},
  {name:'硬皮', icon:'🪵', desc:'6秒防御提高20%', minLvl:1, defBuffSecs:6, defBuffPct:20, cd:13000, tags:['beast','tank','generic']},
  {name:'喘息', icon:'💚', desc:'恢复8%最大生命', minLvl:1, healPct:0.08, cd:15000, tags:['generic','beast','soldier']},
  {name:'战吼', icon:'📯', desc:'8秒攻击提高30%', minLvl:8, atkBuffSecs:8, atkBuffPct:30, cd:12000, tags:['soldier','brute','boss','generic']},
  {name:'疾风', icon:'💨', desc:'6秒攻速提高40%', minLvl:10, spdBuffSecs:6, spdBuffPct:40, cd:12000, tags:['beast','storm','rogue','boss']},
  {name:'石肤', icon:'🪨', desc:'8秒防御提高35%', minLvl:12, defBuffSecs:8, defBuffPct:35, cd:13000, tags:['tank','construct','elemental','boss']},
  {name:'护体屏障', icon:'🔮', desc:'获得15%最大生命值的护盾', minLvl:16, shieldPct:0.15, cd:14000, tags:['caster','construct','boss','elemental']},
  {name:'自愈', icon:'💚', desc:'恢复15%最大生命', minLvl:8, healPct:0.15, cd:14000, tags:['beast','nature','aquatic','generic','boss']},
  {name:'亡者护佑', icon:'☠️', desc:'获得10%最大生命值护盾', minLvl:12, shieldPct:0.10, cd:15000, tags:['undead','spirit']},
  {name:'邪咒回涌', icon:'🧿', desc:'恢复10%最大生命并6秒暴击提高25%', minLvl:14, healPct:0.10, critBuffSecs:6, critBuffPct:25, cd:17000, tags:['caster','spirit','undead']},
  {name:'暗影修补', icon:'🌑', desc:'恢复12%最大生命并获得25%减伤6秒', minLvl:26, healPct:0.12, drBuffSecs:6, drBuffPct:0.25, cd:18000, tags:['undead','spirit','caster','boss']},
  {name:'狂暴', icon:'😡', desc:'6秒攻击提高35%,攻速提高25%', minLvl:18, atkBuffSecs:6, atkBuffPct:35, spdBuffSecs:6, spdBuffPct:25, cd:16000, tags:['beast','brute','soldier','boss']},
  {name:'铁壁', icon:'🛡️', desc:'6秒减伤30%', minLvl:18, drBuffSecs:6, drBuffPct:0.30, cd:16000, tags:['tank','construct','boss']},
  {name:'嗜血', icon:'🩸', desc:'8秒吸血18%', minLvl:20, leechBuffSecs:8, leechBuffPct:18, cd:16000, tags:['beast','undead','boss','brute']},
  {name:'弱点洞察', icon:'👁️', desc:'6秒暴击率提高35%', minLvl:20, critBuffSecs:6, critBuffPct:35, cd:15000, tags:['rogue','caster','boss','dragon']},
  {name:'复苏结界', icon:'✨', desc:'恢复10%最大生命并获得12%护盾', minLvl:28, healPct:0.10, shieldPct:0.12, cd:17000, tags:['caster','nature','boss']},
  {name:'奥术护壁', icon:'🌀', desc:'获得18%最大生命值护盾并8秒减伤20%', minLvl:34, shieldPct:0.18, drBuffSecs:8, drBuffPct:0.20, cd:18000, tags:['caster','construct','elemental','boss']},
  {name:'呼唤同伴', icon:'📣', desc:'召唤1只同伴助战', minLvl:14, summonCount:1, summonTheme:'beast', cd:18000, tags:['beast','charger','boss']},
  {name:'亡灵再起', icon:'☠️', desc:'召唤1个亡灵仆从', minLvl:24, summonCount:1, summonTheme:'undead', cd:19000, tags:['undead','spirit','boss']},
  {name:'虚空裂隙', icon:'🛸', desc:'召唤1个虚空爪牙并获得20%护盾', minLvl:38, summonCount:1, summonTheme:'void', shieldPct:0.20, cd:22000, tags:['caster','spirit','boss']},
  {name:'元素涌现', icon:'🌪️', desc:'召唤1个元素爪牙并6秒攻速提高35%', minLvl:32, summonCount:1, summonTheme:'elemental', spdBuffSecs:6, spdBuffPct:35, cd:20000, tags:['elemental','storm','fire','frost','boss']},
  {name:'召集守卫', icon:'🚩', desc:'召唤1名守卫并6秒防御提高30%', minLvl:30, summonCount:1, summonTheme:'soldier', defBuffSecs:6, defBuffPct:30, cd:20000, tags:['soldier','tank','construct','boss']},
  {name:'生命绽放', icon:'🌿', desc:'恢复18%最大生命并8秒回复强化', minLvl:26, healPct:0.18, drBuffSecs:5, drBuffPct:0.15, cd:17000, tags:['nature','aquatic','boss']}
];
const MON_SUPPORT_SUMMONS = {
  beast: { icon:'🐺', names:['猎犬同伴','荒野幼兽','狂野扑袭者'] },
  undead: { icon:'💀', names:['骸骨仆从','幽魂爪牙','亡者残躯'] },
  elemental: { icon:'🌪️', names:['元素碎片','风暴幼体','失控元素'] },
  void: { icon:'🛸', names:['虚空仆从','裂隙幽影','以太爪牙'] },
  soldier: { icon:'👤', names:['受召守卫','战场援军','狂热卫士'] },
  generic: { icon:'👹', names:['爪牙','仆从','召唤物'] }
};
const BOSS_SUPPORT_PACKAGES = {
  beast_alpha: ['低吼','硬皮','嗜血','狂暴','呼唤同伴'],
  warlord_command: ['战吼','铁壁','召集守卫','狂暴','弱点洞察'],
  undead_lord: ['亡者护佑','邪咒回涌','亡灵再起','暗影修补','灵魂虹吸'],
  dragon_tyrant: ['弱点洞察','铁壁','嗜血','狂暴','呼唤同伴'],
  arcane_master: ['护体屏障','奥术护壁','复苏结界','虚空裂隙','弱点洞察'],
  elemental_core: ['石肤','元素涌现','护体屏障','奥术护壁','生命绽放'],
  wild_ritual: ['自愈','生命绽放','疾风','呼唤同伴','复苏结界'],
  void_prophet: ['护体屏障','虚空裂隙','奥术护壁','弱点洞察','邪咒回涌']
};
const BOSS_SUPPORT_OVERRIDES = {
  '霍格':'beast_alpha',
  '纳尔图':'undead_lord',
  '莫斯虎尔的复仇之灵':'void_prophet',
  '阿鲁高的侍从':'arcane_master',
  '山口烈焰':'dragon_tyrant',
  '沙鳞之翼':'beast_alpha',
  '萨格雷·烈焰之心':'elemental_core',
  '斯特拉霍尔姆勋爵':'warlord_command',
  '加兹瑞拉':'wild_ritual',
  '拉格纳罗斯的仆从':'elemental_core',
  '瓦斯琪':'wild_ritual',
  '伊利丹·怒风':'void_prophet',
  '辛达苟萨':'dragon_tyrant',
  '奥妮克希亚':'dragon_tyrant',
  '卡扎克':'void_prophet',
  '摩摩尔':'arcane_master',
  '格鲁尔':'warlord_command',
  '凯尔萨斯·逐日者':'arcane_master',
  '阿尔萨斯·巫妖王':'undead_lord',
  '鲁西弗隆':'elemental_core',
  '奈法利安':'dragon_tyrant',
  '克尔苏加德':'undead_lord'
};
function supportSkillByName(name){
  return MON_SUPPORT_SKILLS.find(sk => sk.name === name) || null;
}
function supportSkillsByNames(names, lvl){
  const level = Math.max(1, lvl || 1);
  return (names || []).map(supportSkillByName).filter(sk => sk && level >= (sk.minLvl || 1));
}
function supportSkillIsHealing(sk){
  return !!sk && (sk.healPct || 0) > 0;
}
function clampBossSupportSkills(skills, maxHealing){
  const out = [];
  let healingCount = 0;
  for(const sk of (skills || [])){
    if(!sk) continue;
    if(supportSkillIsHealing(sk)){
      if(healingCount >= Math.max(0, maxHealing || 0)) continue;
      healingCount++;
    }
    if(out.some(x => x.name === sk.name)) continue;
    out.push(sk);
  }
  return out;
}
function buildSupportSkillCandidatePool(name, kind, lvl, isBoss){
  const tags = mobSkillTags(name, kind, !!isBoss);
  const level = Math.max(1, lvl || 1);
  let pool = MON_SUPPORT_SKILLS
    .filter(sk => level >= (sk.minLvl || 1))
    .map(sk => {
      const matches = (sk.tags || []).reduce((sum, tag) => {
        const idx = tags.indexOf(tag);
        return idx >= 0 ? sum + Math.max(1, tags.length - idx) : sum;
      }, 0);
      return matches > 0 ? { skill: sk, score: matches } : null;
    })
    .filter(Boolean);
  if(pool.length){
    const bestScore = pool.reduce((best, entry) => Math.max(best, entry.score), 0);
    const minScore = bestScore >= 5 ? bestScore - 2 : (bestScore >= 3 ? 2 : 1);
    pool = pool.filter(entry => entry.score >= minScore);
  }
  if(!pool.length){
    pool = MON_SUPPORT_SKILLS
      .filter(sk => level >= (sk.minLvl || 1) && (sk.tags || []).includes(isBoss ? 'boss' : 'generic'))
      .map(sk => ({ skill: sk, score: 1 }));
  }
  return pool;
}
function pickMonSupportSkills(name, kind, lvl, count, isBoss){
  const pool = buildSupportSkillCandidatePool(name, kind, lvl, isBoss);
  if(!pool.length) return [];
  const picks = [];
  const used = new Set();
  const total = Math.max(1, count || 1);
  while(picks.length < total){
    const candidates = pool.filter(entry => !used.has(entry.skill.name));
    if(!candidates.length) break;
    const skill = pickWeightedSkill(candidates);
    if(!skill) break;
    picks.push(skill);
    used.add(skill.name);
  }
  return picks;
}
function inferBossSupportPackage(name){
  if(!name) return 'warlord_command';
  const clean = String(name).replace(/^[^\u4e00-\u9fa5A-Za-z]+/, '');
  if(BOSS_SUPPORT_OVERRIDES[clean]) return BOSS_SUPPORT_OVERRIDES[clean];
  if(/龙|奈法利安|奥妮克希亚|辛达苟萨|雏龙/.test(clean)) return 'dragon_tyrant';
  if(/亡灵|巫妖|克尔苏加德|阿尔萨斯|骷髅|幽魂|怨灵|纳克萨玛斯/.test(clean)) return 'undead_lord';
  if(/炎|焰|火|熔岩|拉格纳罗斯|元素/.test(clean)) return 'elemental_core';
  if(/术士|法师|虚空|奥术|先知|摩摩尔|凯尔萨斯|阿鲁高|暗影/.test(clean)) return 'arcane_master';
  if(/戈隆|督军|将军|领主|可汗|兽人|格鲁尔|赫洛德/.test(clean)) return 'warlord_command';
  if(/野兽|狼|熊|虎|豹|猎犬|猛犸|霍格|沙鳞|加兹瑞拉/.test(clean)) return 'beast_alpha';
  if(/德鲁伊|植物|孢子|沼泽|瓦斯琪|自然/.test(clean)) return 'wild_ritual';
  if(/伊利丹|卡扎克|虚空|恶魔|深渊/.test(clean)) return 'void_prophet';
  return 'warlord_command';
}
function buildMonsterSupportPool(name, kind, lvl, isBoss, desiredCount){
  const count = Math.max(1, desiredCount || 1);
  if(!isBoss){
    return pickMonSupportSkills(name, kind, lvl, count, false);
  }
  const pkg = inferBossSupportPackage(name);
  let pool = clampBossSupportSkills(supportSkillsByNames(BOSS_SUPPORT_PACKAGES[pkg], lvl), 1).slice(0, count);
  if(pool.length < count){
    const bonus = pickMonSupportSkills(name, kind, lvl, count, true);
    for(const sk of bonus){
      if(pool.length >= count) break;
      if(supportSkillIsHealing(sk) && pool.some(supportSkillIsHealing)) continue;
      if(!pool.some(x => x.name === sk.name)) pool.push(sk);
    }
  }
  return clampBossSupportSkills(pool, 1);
}
function pickMonSupportSkill(name, kind, lvl, isBoss){
  return pickMonSupportSkills(name, kind, lvl, 1, isBoss)[0] || null;
}

function makeMonster(name,lvl,isBoss,maxRarity){
  const hp=Math.floor((100+lvl*lvl*9.0)*(isBoss?18:1));
  const kind=isBoss?null:mobKind(name);   // boss 走自己的被动,小怪用身份技能
  const msList=pickMonSkills(name, kind, lvl, 1);
  const supportSkills=buildMonsterSupportPool(name, kind, lvl, isBoss, 1);
  const now = Date.now();
  return {name,isBoss,lvl,hpMax:hp,hp,atk:Math.floor((8+lvl*3.0)*(isBoss?1.8:1)*1.2),
    def:Math.floor((3+lvl*1.3)*(isBoss?1.5:1)),baseGold:Math.floor(5+lvl*1.5),
    baseXp:Math.floor(30+lvl*5.0),goldReward:Math.floor((5+lvl*1.5)*(isBoss?18:1)),
    honorReward:isBoss?Math.floor(15+lvl*3):0,dropRate:isBoss?1.0:0.18,
    gemChance:isBoss?1.0:0.015,maxRarity:maxRarity||'uncommon',_uid:monUidSeq++,
    _dots:{},_dotLegacyImported:true,_lastDotTick:0,
    kind, _monSkills:isBoss?[]:msList, _monSkill:isBoss?null:(msList[0]||null),
    _monSupportSkills:supportSkills,_supportSkillCooldowns:{},_lastSupportSkill:Date.now()-rng(3000,9000),
    _lastSkill:Date.now()-rng(1000,4000),                  // 进场1-4秒后首放
    _lastTrick:0,_nextTrickAt:isBoss?(now+8000+rng(0,2500)):0,
    dmgReduction:kind==='tank'?0.30:0,                        // 坦克:受到伤害-30%
    atkInterval:(isBoss?1400:1700)+rng(-200,200),    // 每只独立攻速(带抖动,避免同步出手)
    _lastAtk:Date.now()-rng(0,1200)};                // 进场即错峰
}
function calcXP(mon){
  const baseXp=mon.baseXp*(mon.isBoss?10:1);
  const lvlDiff=state.hero.lvl-mon.lvl;let mult=1.0;
  if(lvlDiff>=15)mult=0.1;else if(lvlDiff>=10)mult=0.3;else if(lvlDiff>=5)mult=0.6;else if(lvlDiff<=-5)mult=1.5;else if(lvlDiff<=-3)mult=1.3;
  return Math.floor(baseXp*mult);
}
/* 越级收益惩罚:把 calcXP 的等级差思路扩到金币/掉落,碾压远低于自身等级的怪不再划算,
   逼玩家去打对级内容——让大量地图/副本重新有意义。对级(diff<5)无惩罚。 */
function overLevelPenalty(mon){
  const d=state.hero.lvl-(mon?mon.lvl:state.hero.lvl);
  if(d>=15)return 0.1;if(d>=10)return 0.25;if(d>=5)return 0.5;return 1;
}
function spawnMonster(){
  initCompanionHp();state.currentMonsters=[];
  // 新战斗清除护盾(随从/天赋)
  state._compBarrier = 0;
  if (state.talentState) state.talentState.shield = 0;
  if(state.mode==='travel')return;
  if(state.mode==='dungeon'||state.mode==='mythic')return spawnDungeonMonster();
  if(state.mode==='tower')return spawnTowerMonster();
  if(state.mode==='boss')return spawnZoneBoss();
  const map=getMap();if(!map){state.currentMap=MAPS[0].key;state.currentSubzone=0;return spawnMonster();}
  const sub=map.sub[state.currentSubzone]||map.sub[0];
  // 敌群:野外可同时刷出 1~4 只敌人(怪群越大,单只攻击略降,避免瞬秒,但总收益更高)
  const packRoll=Math.random();
  const count=packRoll<0.07?4:packRoll<0.25?3:packRoll<0.55?2:1;
  const atkDamp=count>=3?0.8:(count===2?0.9:1);
  for(let i=0;i<count;i++){
    const mobName=choice(sub.mobs.split('|'));const lvl=rng(sub.lvl[0],sub.lvl[1]);
    const rareRoll=Math.random();
    const maxR=rareRoll<0.06?'epic':rareRoll<0.20?'rare':'uncommon';   // 2026-06-16 提高小怪爆蓝/紫上限概率(epic 0.02→0.06, rare 0.08→0.20)
    const m=makeMonster(mobName,lvl,false,maxR);
    if(atkDamp!==1)m.atk=Math.max(1,Math.floor(m.atk*atkDamp));
    m.threat=m.atk*(0.6+Math.random()*0.8);   // 初始仇恨(攻击越高越容易被英雄锁定)
    state.currentMonsters.push(m);
  }
}
function spawnZoneBoss(){
  state.currentMonsters=[];const map=getMap();if(!map)return;
  const maxR=map.boss.lvl>=60?'legend':'epic';
  const mon=makeMonster(map.boss.emoji+map.boss.name,map.boss.lvl,true,maxR);
  mon._monSupportSkills = buildMonsterSupportPool(map.boss.name, null, map.boss.lvl, true, map.boss.supportCount || 2);
  mon._supportSkillCooldowns = {};
  mon._nextTrickAt = Date.now() + 8000 + rng(0, 2500);
  // 应用地图BOSS被动
  if(map.boss.passive){
    if(map.boss.passive.dodgeChance)mon.dodgeChance=map.boss.passive.dodgeChance;
    if(map.boss.passive.critChance)mon.critChance=map.boss.passive.critChance;
    if(map.boss.passive.dmgReduction)mon.dmgReduction=map.boss.passive.dmgReduction;
    if(map.boss.passive.atkBonus)mon.atk=Math.floor(mon.atk*(1+map.boss.passive.atkBonus));
    if(map.boss.passive.leech)mon.lifeSteal=map.boss.passive.leech;
  }
  state.currentMonsters.push(mon);
}
function spawnDungeonMonster(){
  state.currentMonsters=[];const ds=state.dungeonState||state.mythicState;if(!ds)return;
  const dg=DUNGEONS.find(d=>d.key===ds.key);if(!dg)return;
  const boss=(dg.bosses||[]).find(b=>b.wave===ds.wave);const isBoss=!!boss;
  const isEpicRaid=!!dg.epicRaid;
  const power=dg.reqLvl+(isBoss?3:0);
  const scale=ds.scale||1;
  // 小怪名与副本对应:用本副本 BOSS 的 emoji + 角色词(让副本小怪有辨识度)
  const bossEmojis=(dg.bosses||[]).map(b=>b.emoji).filter(Boolean);
  const temoji=bossEmojis.length?choice(bossEmojis):(dg.icon||'👹');
  const name=isBoss?(boss.emoji+boss.name):(temoji+choice(['爪牙','守卫','暴徒','狂徒','奴仆','哨兵','卫士','督军']));
  // 副本小怪大幅强于野外:血量×4 / 攻击×1.6 / 防御×1.6(野外同级只是 ×1.8/×1/×1)
  const isRaid=dg.type==='raid';
  const isFinalBoss=isBoss&&boss===dg.bosses[dg.bosses.length-1];
  const bossMaxRarity=isRaid?(isFinalBoss?'legend':'epic'):(isBoss?'legend':'rare');
  const trashDamageSkillCount = !isBoss ? (isRaid ? 2 : 1) : 0;
  const trashSupportSkillCount = !isBoss ? (isRaid ? 2 : 1) : 0;
  const bossSupportSkillCount = isBoss ? (boss.supportCount || (isRaid ? (isFinalBoss ? 4 : 2) : (isFinalBoss ? 2 : 1))) : 0;
  const monSkills = !isBoss ? pickMonSkills(name, null, power, trashDamageSkillCount) : [];
  state.currentMonsters.push({name,isBoss,bossName:isBoss?boss.name:null,
    lvl:isEpicRaid ? 80 : Math.max(1,Math.floor(power*1.05)),
    hpMax:Math.floor((100+power*power*7.5)*(isBoss?17:4.0)*scale),hp:Math.floor((100+power*power*7.5)*(isBoss?17:4.0)*scale),
    atk:Math.floor((10+power*3.2)*(isBoss?2.0:1.6)*scale*1.1),def:Math.floor((3+power*1.5)*(isBoss?1.5:1.6)*scale),
    baseGold:Math.floor(10+power*3),baseXp:Math.floor(35+power*5),
    goldReward:Math.floor((10+power*3)*(isBoss?15:1.5)*scale),honorReward:isBoss?Math.floor(25+power*2.5):2,
    dropRate:isBoss?1.0:0.35,gemChance:isBoss?0.8:0.05,maxRarity:bossMaxRarity,fromDungeon:true,_uid:monUidSeq++,
    _dots:{},_dotLegacyImported:true,_lastDotTick:0,
    _isRaidFinal:isRaid&&isFinalBoss,_isRaid:isRaid,_isEpicRaid:isEpicRaid,
    _monSkills:isBoss?[]:monSkills,_monSkill:isBoss?null:(monSkills[0]||null),_monSupportSkills:buildMonsterSupportPool(isBoss?boss.name:name,null,power,isBoss,isBoss?bossSupportSkillCount:trashSupportSkillCount),_supportSkillCooldowns:{},_lastSupportSkill:Date.now()-rng(3000,9000),_lastSkill:Date.now()-rng(1000,4000),_lastTrick:0,_nextTrickAt:isBoss?(Date.now()+8000+rng(0,2500)):0,
    atkInterval:(isBoss?1400:1700)+rng(-200,200),_lastAtk:Date.now()-rng(0,1200)});
  // 大秘境词缀:修改怪物属性
  const mon = state.currentMonsters[state.currentMonsters.length-1];
  if (isEpicRaid) {
    const hpMult = isBoss ? (isFinalBoss ? 2.45 : 2.1) : 1.72;
    const atkMult = isBoss ? (isFinalBoss ? 1.85 : 1.62) : 1.38;
    const defMult = isBoss ? (isFinalBoss ? 1.72 : 1.48) : 1.26;
    mon.hpMax = Math.floor(mon.hpMax * hpMult);
    mon.hp = mon.hpMax;
    mon.atk = Math.floor(mon.atk * atkMult);
    mon.def = Math.floor(mon.def * defMult);
    mon.goldReward = Math.floor(mon.goldReward * (isBoss ? 1.5 : 1.25));
    mon.baseXp = Math.floor(mon.baseXp * (isBoss ? 1.45 : 1.2));
  }
  // 副本/大秘境 BOSS 被动:优先读数据中的passive,否则用默认
  if (isBoss) {
    mon.dodgeChance=0; mon.critChance=0; mon.critMult=2.0; mon.stunChance=0; mon.instantCast=true;
    if (boss.passive) {
      if (boss.passive.dodgeChance) mon.dodgeChance = boss.passive.dodgeChance;
      if (boss.passive.critChance) mon.critChance = boss.passive.critChance;
      if (boss.passive.dmgReduction) mon.dmgReduction = boss.passive.dmgReduction;
      if (boss.passive.atkBonus) mon.atk = Math.floor(mon.atk * (1 + boss.passive.atkBonus));
      if (boss.passive.leech) mon.lifeSteal = boss.passive.leech;
      if (boss.passive.stunChance) mon.stunChance = boss.passive.stunChance;
    } else {
      mon.dodgeChance=0.15; mon.critChance=0.25; mon.stunChance=0.12;
    }
  }
  if (ds.affixes) {
    mon._affixes = ds.affixes;
    mon._arcaneShield = 0;
    for (const af of ds.affixes) {
      const mod = af.mod || {};
      if (mod.trashHp && !isBoss) { mon.hpMax = Math.floor(mon.hpMax * (1+mod.trashHp)); mon.hp = mon.hpMax; }
      if (mod.bossHp && isBoss) { mon.hpMax = Math.floor(mon.hpMax * (1+mod.bossHp)); mon.hp = mon.hpMax; }
      if (mod.bossDmg && isBoss) mon.atk = Math.floor(mon.atk * (1+mod.bossDmg));
    }
  }
}

/* ---------- 伤害 ---------- */
/* 护甲减伤:乘法+递减+封顶75%。护甲常数随"防守方等级"缩放,使低级攻击无法轻易无视高级护甲,
   反过来高级护甲也永远 floor 不到 0(怪在任何装备水平下都还能打疼你)。取代旧的减法 atk-def*0.5。 */
function armorMitig(def,defLvl){const K=50+(defLvl||1)*40;const d=Math.max(0,def||0);return Math.min(0.75,d/(d+K));}
/* 等级差伤害修正:攻方等级高于守方→增伤,低于→减伤。每级±3%,封顶 0.4~1.6 倍。
   这让"20级装备打60级怪"不再可行——越级时你的伤害被压到 0.4 倍、对方伤害放大到 1.6 倍。 */
function lvlDmgMult(atkLvl,defLvl){return Math.max(0.4,Math.min(1.6,1+((atkLvl||1)-(defLvl||1))*0.03));}
function calcDmg(atk,def,crit,critd,forceCrit,defLvl,atkLvl){
  const isCrit=forceCrit||Math.random()*100<(crit||0);
  let base=Math.max(1,atk*(1-armorMitig(def,defLvl)));
  if(atkLvl!==undefined)base*=lvlDmgMult(atkLvl,defLvl);   // 传了攻方等级才启用等级差修正
  base*=0.85+Math.random()*0.3;
  if(isCrit)base*=(critd/100);
  return {dmg:Math.max(1,Math.floor(base)),crit:isCrit};
}
function getPrimaryMonster(){return state.currentMonsters[0];}
function getAliveMonsters(){return state.currentMonsters.filter(m=>m.hp>0);}
function bossTrickList(bossData){
  if(!bossData) return [];
  if(Array.isArray(bossData.tricks) && bossData.tricks.length) return bossData.tricks;
  if(Array.isArray(bossData.passive?.tricks) && bossData.passive.tricks.length) return bossData.passive.tricks;
  const skillTricks = [];
  for(const sk of (bossData.skills || [])){
    if(Array.isArray(sk?.tricks) && sk.tricks.length) skillTricks.push(...sk.tricks);
  }
  return skillTricks;
}
function syncMonsterShieldAura(mon){
  if(!mon) return;
  if((mon._arcaneShield || 0) > 0){
    setMonsterTrickAura(mon, 'shield', { name:'护盾', icon:'🛡️', desc:'' }, 0, { desc:`护盾吸收 ${fmt(mon._arcaneShield)} 点伤害` });
  }else if(mon._trickAuras){
    delete mon._trickAuras.shield;
  }
}
function absorbMonsterBarrier(mon, amount, icon){
  amount = Math.max(0, Math.floor(amount || 0));
  if(!mon || amount <= 0) return { remaining:0, absorbed:0 };
  if(!(mon._arcaneShield > 0)) return { remaining:amount, absorbed:0 };
  const absorbed = Math.min(mon._arcaneShield, amount);
  mon._arcaneShield -= absorbed;
  const remaining = amount - absorbed;
  if(absorbed > 0){
    showMonsterFloat(mon, (icon || '🛡️') + '-' + absorbed, '#93c5fd', { variant:'shield-break', scale:1.02 });
    pulseMonsterEl(mon, 'shield', 260);
  }
  syncMonsterShieldAura(mon);
  return { remaining, absorbed };
}
function getMonsterBossData(mon){
  if(!mon || !mon.isBoss) return null;
  if(mon.isRareElite && typeof RARE_ELITES !== 'undefined'){
    return RARE_ELITES.find(b => b.key === mon.rareKey) || null;
  }
  if(mon.isWorldBoss && typeof WORLD_BOSSES !== 'undefined'){
    return WORLD_BOSSES.find(b => b.key === mon.wbKey) || null;
  }
  if(state.mode === 'boss'){
    return getMap()?.boss || null;
  }
  if(state.mode === 'dungeon' || state.mode === 'mythic'){
    const dg = DUNGEONS.find(d=>d.key===(state.dungeonState||state.mythicState)?.key);
    if(dg) return (dg.bosses||[]).find(b=>b.name===mon.bossName) || null;
  }
  return null;
}
function ensureMonsterTrickAuras(mon){
  if(!mon) return {};
  if(!mon._trickAuras) mon._trickAuras = {};
  return mon._trickAuras;
}
function setMonsterTrickAura(mon, key, trick, expire, extra){
  if(!mon || !key || !trick) return;
  const auras = ensureMonsterTrickAuras(mon);
  auras[key] = Object.assign({
    key,
    name: trick.name || key,
    icon: trick.icon || '⚡',
    desc: trick.desc || '',
    expire: expire || 0
  }, extra || {});
}
function syncMonsterDoubleAura(mon){
  if(!mon || !mon._trickAuras) return;
  if((mon._nextAtkDouble || 0) > 0){
    const aura = mon._trickAuras.nextDouble;
    if(aura) aura.stacks = mon._nextAtkDouble;
  }else{
    delete mon._trickAuras.nextDouble;
  }
}
function monsterDamageReduction(mon, now){
  if(!mon) return 0;
  const ts = now || Date.now();
  let dr = mon.dmgReduction || 0;
  if(mon._monsterDrBuffUntil && mon._monsterDrBuffUntil > ts) dr = Math.max(dr, mon._monsterDrBuffPct || 0.2);
  return dr;
}
function monsterLeechRate(mon, now){
  if(!mon) return 0;
  const ts = now || Date.now();
  let rate = mon.lifeSteal || 0;
  if(mon._trickLeech && mon._trickLeech > ts) rate = Math.max(rate, (mon._trickLeechPct || 20) / 100);
  return rate;
}
function monsterCritRate(mon, now){
  if(!mon) return 5;
  const ts = now || Date.now();
  let rate = mon.critChance ? mon.critChance * 100 : 5;
  if(mon._trickCrit && mon._trickCrit > ts) rate = Math.max(rate, mon._trickCritPct || 100);
  return rate;
}
function monsterSpeedMult(mon, now){
  if(!mon) return 1;
  const ts = now || Date.now();
  let mult = 1;
  if(mon.spdBuffUntil && mon.spdBuffUntil > ts) mult *= 1.5;
  if(mon._trickSpdBuff && mon._trickSpdBuff > ts) mult *= 1 + ((mon._trickSpdPct || 50) / 100);
  return mult;
}
function monsterAttackValue(mon, now){
  if(!mon) return 0;
  const ts = now || Date.now();
  let atk = mon.atk;
  if(mon._trickAtkBuff && mon._trickAtkBuff > ts) atk = Math.floor(atk * (1 + ((mon._trickAtkPct || 50) / 100)));
  return atk;
}
function monsterHasActiveAura(mon, key, now){
  if(!mon?._trickAuras) return false;
  const aura = mon._trickAuras[key];
  if(!aura) return false;
  const ts = now || Date.now();
  if(aura.expire && aura.expire > ts) return true;
  if(key === 'nextDouble') return (mon._nextAtkDouble || 0) > 0;
  if(key === 'shield') return (mon._arcaneShield || 0) > 0;
  return false;
}
function summonMonsterAlly(mon, skill, now){
  const theme = skill.summonTheme || 'generic';
  const cfg = MON_SUPPORT_SUMMONS[theme] || MON_SUPPORT_SUMMONS.generic;
  const living = (state.currentMonsters || []).filter(x => x && x.hp > 0);
  const ownAdds = living.filter(x => x._summonerId === mon._uid).length;
  const maxAdds = mon.isBoss ? 3 : 2;
  const count = Math.max(0, Math.min(skill.summonCount || 1, maxAdds - ownAdds, (mon.isBoss ? 6 : 4) - living.length));
  if(count <= 0) return 0;
  for(let i = 0; i < count; i++){
    const summonName = (cfg.icon || '👹') + choice(cfg.names || ['爪牙']);
    const lvl = Math.max(1, mon.lvl - (skill.summonLvlOffset || 2));
    const add = makeMonster(summonName, lvl, false, 'common');
    add.hpMax = Math.max(20, Math.floor(mon.hpMax * (skill.summonHpPct || 0.18)));
    add.hp = add.hpMax;
    add.atk = Math.max(1, Math.floor(mon.atk * (skill.summonAtkPct || 0.35)));
    add.def = Math.max(0, Math.floor(mon.def * (skill.summonDefPct || 0.45)));
    add.baseGold = 0; add.baseXp = 0; add.goldReward = 0; add.honorReward = 0; add.dropRate = 0; add.gemChance = 0;
    add.maxRarity = 'common';
    add._summoned = true;
    add._summonerId = mon._uid;
    add._summonerName = mon.bossName || mon.name || '敌人';
    add._summonerIsBoss = !!mon.isBoss;
    add._monSupportSkills = [];
    add._supportSkillCooldowns = {};
    state.currentMonsters.push(add);
  }
  if(typeof markDirty === 'function') markDirty('stage');
  return count;
}
function canUseMonsterSupportSkill(mon, skill, now){
  if(!mon || !skill) return false;
  if(skill.healPct && mon.hp >= mon.hpMax * 0.92) return false;
  if(skill.shieldPct && mon._arcaneShield > mon.hpMax * Math.max(0.08, (skill.shieldPct || 0) * 0.6)) return false;
  if(skill.atkBuffSecs && monsterHasActiveAura(mon, 'atk', now)) return false;
  if(skill.spdBuffSecs && monsterHasActiveAura(mon, 'spd', now)) return false;
  if(skill.defBuffSecs && monsterHasActiveAura(mon, 'def', now)) return false;
  if(skill.drBuffSecs && monsterHasActiveAura(mon, 'dr', now)) return false;
  if(skill.leechBuffSecs && monsterHasActiveAura(mon, 'leech', now)) return false;
  if(skill.critBuffSecs && monsterHasActiveAura(mon, 'crit', now)) return false;
  if(skill.summonCount){
    const living = (state.currentMonsters || []).filter(x => x && x.hp > 0);
    const ownAdds = living.filter(x => x._summonerId === mon._uid).length;
    if(ownAdds >= (mon.isBoss ? 3 : 2)) return false;
  }
  return true;
}
function heroHasDebuff(key, now){
  const ts = now || Date.now();
  return !!(state.heroDebuffs && state.heroDebuffs[key] && state.heroDebuffs[key].expire > ts);
}
function monsterCombatSkillWeight(mon, skill, now){
  let score = 10 + (skill.mul || 1) * 2;
  if(skill.dot && !heroHasDebuff('burn', now)) score += 10;
  if(skill.slow && !heroHasDebuff('chill', now)) score += 9;
  if(skill.weaken && !heroHasDebuff('weaken', now)) score += 10;
  if(skill.silence && !heroHasDebuff('silence', now)) score += 14;
  if(skill.disarm && !heroHasDebuff('disarm', now)) score += 14;
  if(skill.fear && !heroHasDebuff('fear', now)) score += 13;
  if(skill.freeze && !heroHasDebuff('freeze', now)) score += 13;
  if(skill.cripple && !heroHasDebuff('cripple', now)) score += 11;
  if(skill.decay && !heroHasDebuff('decay', now)) score += 11;
  if(skill.decay2 && !heroHasDebuff('decay2', now)) score += 13;
  if(skill.brittle && !heroHasDebuff('brittle', now)) score += 12;
  if(skill.soulLink && !heroHasDebuff('soulLink', now)) score += 12;
  if(skill.revenge && !heroHasDebuff('vulnerable', now)) score += 11;
  if(skill.manaDrain && state.resource > state.resourceMax * 0.35) score += 8;
  if(skill.stun) score += 7;
  if(mon._lastSkillName === skill.name) score -= 4;
  return score;
}
function getReadyMonsterCombatSkill(mon, now){
  const pool = mon?._monSkills?.length ? mon._monSkills : (mon?._monSkill ? [mon._monSkill] : []);
  if(!pool.length) return null;
  const scored = pool.map(skill => ({ skill, weight: monsterCombatSkillWeight(mon, skill, now) }));
  return pickWeightedSkill(scored);
}
function getReadyMonsterSupportSkill(mon, now){
  const pool = mon?._monSupportSkills || [];
  if(!pool.length) return null;
  const ready = pool.filter(skill => {
    const expire = mon._supportSkillCooldowns?.[skill.name] || 0;
    return expire <= now && canUseMonsterSupportSkill(mon, skill, now);
  });
  if(!ready.length) return null;
  const scored = ready.map(skill => {
    let score = 10;
    if(skill.healPct && mon.hp < mon.hpMax * 0.55) score += 40;
    if(skill.shieldPct && (!mon._arcaneShield || mon._arcaneShield < mon.hpMax * 0.08)) score += 24;
    if(skill.summonCount) score += 12;
    if(skill.drBuffSecs && mon.hp < mon.hpMax * 0.7) score += 18;
    if(skill.atkBuffSecs || skill.critBuffSecs || skill.spdBuffSecs) score += mon.isBoss ? 16 : 8;
    return { skill, weight: score };
  });
  return pickWeightedSkill(scored);
}
function monsterSkillDangerLevel(skill){
  if(!skill) return 0;
  let score = 0;
  if((skill.mul || 0) >= 5) score += 2;
  else if((skill.mul || 0) >= 3) score += 1;
  if(skill.aoe) score += 1;
  if(skill.alwaysCrit) score += 1;
  if(skill.stun || skill.silence || skill.disarm || skill.fear || skill.freeze) score += 2;
  if(skill.summonCount || skill.spdBuff || skill.atkBuffSecs || skill.drBuffSecs || skill.defBuffSecs) score += 1;
  return score >= 4 ? 2 : score >= 2 ? 1 : 0;
}
function applyMonsterSupportSkill(mon, skill, now, opts){
  if(!mon || !skill) return false;
  if(!mon._supportSkillCooldowns) mon._supportSkillCooldowns = {};
  mon._supportSkillCooldowns[skill.name] = now + (skill.cd || 14000);
  let used = false;
  if(opts?.announce !== false){
    log(`${skill.icon || '✨'} ${mon.bossName || mon.name} 释放了 ${skill.name}!`,'bad');
    showMonsterFloat(mon, (skill.icon || '✨') + skill.name + '!', '#93c5fd', { variant:'boss', scale:1.08 });
    pulseMonsterEl(mon, 'bosscast', 300);
  }
  if(skill.healPct){
    const heal = Math.max(1, Math.floor(mon.hpMax * skill.healPct));
    mon.hp = Math.min(mon.hpMax, mon.hp + heal);
    showMonsterFloat(mon, '💚+' + heal, '#6ee7b7', { variant:'heal', scale:1.05 });
    pulseMonsterEl(mon, 'heal', 240);
    used = true;
  }
  if(skill.shieldPct){
    const shield = Math.max(1, Math.floor(mon.hpMax * skill.shieldPct));
    mon._arcaneShield = (mon._arcaneShield || 0) + shield;
    syncMonsterShieldAura(mon);
    showMonsterFloat(mon, '🛡️+' + shield, '#93c5fd', { variant:'shield', scale:1.04 });
    pulseMonsterEl(mon, 'shield', 260);
    used = true;
  }
  if(skill.atkBuffSecs){
    mon._trickAtkBuff = now + skill.atkBuffSecs * 1000;
    mon._trickAtkPct = skill.atkBuffPct || 30;
    setMonsterTrickAura(mon, 'atk', skill, mon._trickAtkBuff);
    used = true;
  }
  if(skill.spdBuffSecs){
    mon._trickSpdBuff = now + skill.spdBuffSecs * 1000;
    mon._trickSpdPct = skill.spdBuffPct || 35;
    setMonsterTrickAura(mon, 'spd', skill, mon._trickSpdBuff);
    used = true;
  }
  if(skill.defBuffSecs){
    mon._trickDefBuff = now + skill.defBuffSecs * 1000;
    mon._trickDefPct = skill.defBuffPct || 35;
    setMonsterTrickAura(mon, 'def', skill, mon._trickDefBuff);
    used = true;
  }
  if(skill.drBuffSecs){
    mon._monsterDrBuffUntil = now + skill.drBuffSecs * 1000;
    mon._monsterDrBuffPct = skill.drBuffPct || 0.25;
    setMonsterTrickAura(mon, 'dr', skill, mon._monsterDrBuffUntil);
    used = true;
  }
  if(skill.leechBuffSecs){
    mon._trickLeech = now + skill.leechBuffSecs * 1000;
    mon._trickLeechPct = skill.leechBuffPct || 18;
    setMonsterTrickAura(mon, 'leech', skill, mon._trickLeech);
    used = true;
  }
  if(skill.critBuffSecs){
    mon._trickCrit = now + skill.critBuffSecs * 1000;
    mon._trickCritPct = skill.critBuffPct || 35;
    setMonsterTrickAura(mon, 'crit', skill, mon._trickCrit);
    used = true;
  }
  if(skill.summonCount){
    const summoned = summonMonsterAlly(mon, skill, now);
    if(summoned > 0){
      log(`👥 ${mon.bossName || mon.name} 召来了 ${summoned} 个援军!`,'bad');
      used = true;
    }
  }
  return used;
}
/* 破甲(sunder)等护甲削减后的有效防御 */
function monArmor(mon){
  if(!mon)return 0;
  let def=mon.def;
  if(mon._trickDefBuff&&mon._trickDefBuff>Date.now())def=Math.floor(def*(1+((mon._trickDefPct||50)/100)));
  if(mon.sunderUntil>Date.now())def=Math.floor(def*0.7);
  return def;
}
/* 英雄视角的目标有效护甲(含"破甲"天赋:无视部分护甲) */
function heroTargetDef(mon){ return Math.floor(monArmor(mon)*(1-(state.hero.armorPen||0)/100)); }
function currentMythicPressure(){
  if(state.mode !== 'mythic') return 0;
  const level = Math.max(1, state.mythicState?.level || state.mythicLevel || 1);
  return Math.min(0.18, Math.max(0, level - 1) * 0.012);
}
function monsterArmorPenRate(mon){
  if(!mon) return 0;
  let rate = 0;
  if(mon.isWorldBoss) rate = 0.26;
  else if(mon.isBoss && mon._isEpicRaid) rate = mon._isRaidFinal ? 0.40 : 0.34;
  else if(mon._isEpicRaid) rate = 0.18;
  else if(mon.isBoss && mon.fromDungeon) rate = mon._isRaid ? (mon._isRaidFinal ? 0.32 : 0.26) : 0.20;
  else if(mon.isBoss) rate = 0.16;
  else if(mon.fromDungeon) rate = mon._isRaid ? 0.12 : 0.08;
  else rate = 0.03;
  const lvlGap = Math.max(0, (mon.lvl || 1) - (state.hero.lvl || 1));
  if(lvlGap > 0) rate += Math.min(0.08, lvlGap * 0.01);
  if(mon.fromDungeon) rate += currentMythicPressure() * (mon.isBoss ? 0.8 : 0.45);
  return Math.min(mon.isBoss ? 0.45 : 0.25, rate);
}
function heroDefAgainst(mon){
  const eff = Math.floor((state.hero.def || 0) * (1 - monsterArmorPenRate(mon)));
  return Math.max(0, eff);
}
function heroVersDamageReductionRate(mon){
  const vers = Math.max(0, state.hero.vers || 0);
  if(vers <= 0) return 0;
  let rate = vers * 0.005; // 防御向全能只保留约一半威力,避免中后期“面板一高就不掉血”
  if(mon?.isBoss) rate *= 0.75;
  if(mon?.fromDungeon) rate *= 0.9;
  if(state.mode === 'mythic' && mon?.fromDungeon) rate *= 0.9;
  return Math.min(mon?.isBoss ? 0.18 : 0.22, rate);
}
function heroPassiveRegenMult(mon){
  if(!mon || mon.hp <= 0) return 1;
  if(mon.isWorldBoss) return 0.42;
  if(mon.isBoss && mon._isEpicRaid) return mon._isRaidFinal ? 0.30 : 0.36;
  if(mon._isEpicRaid) return 0.58;
  if(mon.isBoss && mon.fromDungeon) return mon._isRaid ? 0.48 : 0.58;
  if(mon.isBoss) return 0.62;
  if(mon.fromDungeon) return mon._isRaid ? 0.72 : 0.82;
  return 1;
}
function monsterDamageFloor(mon, amount, opts){
  if(!mon) return Math.max(1, Math.floor(amount || 0));
  let floor = 0;
  const hpMax = Math.max(1, state.hero.hpMax || 1);
  if(mon.isWorldBoss) floor = hpMax * 0.028 + mon.lvl * 3;
  else if(mon.isBoss && mon._isEpicRaid) floor = hpMax * (mon._isRaidFinal ? 0.036 : 0.029) + mon.lvl * 2.8;
  else if(mon._isEpicRaid) floor = hpMax * 0.010 + mon.lvl * 1.0;
  else if(mon.isBoss && mon.fromDungeon) floor = hpMax * (mon._isRaidFinal ? 0.024 : (mon._isRaid ? 0.019 : 0.015)) + mon.lvl * 2.2;
  else if(mon.isBoss) floor = hpMax * 0.013 + mon.lvl * 1.5;
  else if(mon.fromDungeon) floor = hpMax * (mon._isRaid ? 0.007 : 0.004) + mon.lvl * 0.7;
  if(opts?.aoe) floor *= 0.85;
  if(opts?.supportHit) floor *= 0.9;
  if(mon.fromDungeon) floor *= 1 + currentMythicPressure();
  return Math.max(1, Math.max(Math.floor(amount || 0), Math.floor(floor)));
}

/* ---------- 英雄受到的减益(boss 等施加) ---------- */
const DEBUFF_FX = {
  burn:       { name:'灼烧/中毒', icon:'☠️', dot:true },        // 每秒持续伤害(dps 存在实例里)
  weaken:     { name:'虚弱',     icon:'💔', atkMul:0.85 },      // 攻击-15%
  vulnerable: { name:'易伤',     icon:'🩸', takenMul:1.2 },     // 受到伤害+20%
  chill:      { name:'冰缚',     icon:'🥶', spdMul:0.85 },      // 攻速-15%
  silence:    { name:'沉默',     icon:'🔇', desc:'无法施放技能' },
  disarm:     { name:'缴械',     icon:'⚔️', atkMul:0.75, desc:'无法普通攻击,攻击降低25%' },
  fear:       { name:'恐惧',     icon:'👻', desc:'无法行动' },
  freeze:     { name:'冻结',     icon:'🧊', spdMul:0.7, desc:'无法行动,攻速降低30%' },
  cripple:    { name:'残废',     icon:'🦿', atkMul:0.85, spdMul:0.8, desc:'攻击降低15%,攻速降低20%' },
  decay:      { name:'衰老',     icon:'👴', healMul:0.7, regMul:0.7, desc:'受到治疗和生命回复降低30%' },
  decay2:     { name:'凋零',     icon:'🌑', healMul:0.45, regMul:0.35, desc:'受到治疗降低55%,生命回复降低65%' },
  brittle:    { name:'易爆',     icon:'💥', desc:'下次受到的伤害翻倍' },
  soulLink:   { name:'灵魂链接', icon:'🔗', desc:'受到伤害时会为敌人恢复生命' },
};
function applyHeroDebuff(key, durMs, opts){
  if(!DEBUFF_FX[key])return;
  if(!state.heroDebuffs)state.heroDebuffs={};
  const d=state.heroDebuffs[key]||{};
  d.expire=Date.now()+durMs;
  if(opts&&opts.dps!=null)d.dps=opts.dps;
  state.heroDebuffs[key]=d;
  const fx=DEBUFF_FX[key];
  if(fx.atkMul||fx.spdMul)recomputeStats();   // 影响面板属性的立即重算
  markDirty('hero');
}
function heroDebuffTakenMult(){
  if(!state.heroDebuffs)return 1;const now=Date.now();let m=1;
  for(const k in state.heroDebuffs){const d=state.heroDebuffs[k];if(d.expire>now){const fx=DEBUFF_FX[k];if(fx&&fx.takenMul)m*=fx.takenMul;}}
  return m;
}
function heroDebuffHealMult(){
  if(!state.heroDebuffs)return 1;const now=Date.now();let m=1;
  for(const k in state.heroDebuffs){const d=state.heroDebuffs[k];if(d.expire>now){const fx=DEBUFF_FX[k];if(fx&&fx.healMul)m*=fx.healMul;}}
  return m;
}
function heroDebuffRegenMult(){
  if(!state.heroDebuffs)return 1;const now=Date.now();let m=1;
  for(const k in state.heroDebuffs){const d=state.heroDebuffs[k];if(d.expire>now){const fx=DEBUFF_FX[k];if(fx&&fx.regMul)m*=fx.regMul;}}
  return m;
}
function applyCompanionDebuff(key, durMs, opts){
  if(!DEBUFF_FX[key]) return;
  if(!state._compDebuffs) state._compDebuffs = {};
  const d = state._compDebuffs[key] || {};
  d.expire = Date.now() + durMs;
  if(opts && opts.dps != null) d.dps = opts.dps;
  state._compDebuffs[key] = d;
  markDirty('companion');
}
function companionDebuffTakenMult(){
  if(!state._compDebuffs) return 1;
  const now=Date.now(); let m=1;
  for(const k in state._compDebuffs){const d=state._compDebuffs[k]; if(d.expire>now){const fx=DEBUFF_FX[k]; if(fx&&fx.takenMul)m*=fx.takenMul;}}
  return m;
}
function companionDebuffHealMult(){
  if(!state._compDebuffs) return 1;
  const now=Date.now(); let m=1;
  for(const k in state._compDebuffs){const d=state._compDebuffs[k]; if(d.expire>now){const fx=DEBUFF_FX[k]; if(fx&&fx.healMul)m*=fx.healMul;}}
  return m;
}
function companionDebuffRegenMult(){
  if(!state._compDebuffs) return 1;
  const now=Date.now(); let m=1;
  for(const k in state._compDebuffs){const d=state._compDebuffs[k]; if(d.expire>now){const fx=DEBUFF_FX[k]; if(fx&&fx.regMul)m*=fx.regMul;}}
  return m;
}
function companionDebuffStatMults(){
  const out = { atk:1, spd:1, def:1 };
  const now = Date.now();
  if(state._compDebuffs){
    for(const k in state._compDebuffs){
      const d = state._compDebuffs[k];
      if(!(d.expire > now)) continue;
      const fx = DEBUFF_FX[k];
      if(!fx) continue;
      if(fx.atkMul) out.atk *= fx.atkMul;
      if(fx.spdMul) out.spd *= fx.spdMul;
    }
  }
  if((state._compFrenzyUntil || 0) > now){
    out.atk *= 1.3;
    out.def *= 0.5;
  }
  return out;
}
function companionBuffActive(buffKey, now){
  const ts = now || Date.now();
  return !!(state._compBuffs && state._compBuffs[buffKey] > ts);
}
function applyCompanionBuffEffects(stats){
  const now = Date.now();
  if(companionBuffActive('shield', now)) stats.def = Math.floor(stats.def * 1.33);
  if(companionBuffActive('divine', now)) stats.def = Math.floor(stats.def * 1.53);
  if(companionBuffActive('bark', now)) stats.def = Math.floor(stats.def * 1.40);
  if(companionBuffActive('earthShield', now)) stats.def = Math.floor(stats.def * 1.33);
  if(companionBuffActive('battleShout', now)) stats.atk = Math.floor(stats.atk * 1.20);
  if(companionBuffActive('bestial', now)) stats.atk = Math.floor(stats.atk * 1.27);
  if(companionBuffActive('shadowstep', now)) stats.atk = Math.floor(stats.atk * 1.33);
  if(companionBuffActive('kings', now)){ stats.atk = Math.floor(stats.atk * 1.13); stats.def = Math.floor(stats.def * 1.13); }
  if(companionBuffActive('berserk', now)){ stats.atk = Math.floor(stats.atk * 1.27); stats.spd = +(stats.spd * 1.20).toFixed(2); }
  if(companionBuffActive('windfury', now)) stats.spd = +(stats.spd * 1.40).toFixed(2);
  if(companionBuffActive('rapidFire', now)) stats.spd = +(stats.spd * 1.40).toFixed(2);
  if(companionBuffActive('sacredShield', now)){ stats.def = Math.floor(stats.def * 1.27); stats.reg = (stats.reg || 0) + 3; }
  if(typeof BUFF_FX === 'object'){
    for(const k in BUFF_FX){
      if(!companionBuffActive(k, now)) continue;
      const fx = BUFF_FX[k];
      if(fx.atkMul) stats.atk = Math.floor(stats.atk * fx.atkMul);
      if(fx.defMul) stats.def = Math.floor(stats.def * fx.defMul);
      if(fx.spdMul) stats.spd = +(stats.spd * fx.spdMul).toFixed(2);
      if(fx.critAdd) stats.crit += fx.critAdd;
      if(fx.critdAdd) stats.critd += fx.critdAdd;
    }
  }
  return stats;
}
function healCompanionAmount(amount, icon, color, source, skillLabel){
  const st = computeCompanionStats();
  if(!st || compDowned()) return { applied:0, overheal:0 };
  amount = Math.max(0, Math.floor((amount || 0) * companionDebuffHealMult()));
  if(amount <= 0) return { applied:0, overheal:0 };
  const before = state._compHp || 0;
  state._compHp = Math.min(st.hpMax, before + amount);
  const applied = state._compHp - before;
  const overheal = Math.max(0, amount - applied);
  if(applied > 0) trackHeal(source || 'comp', applied, skillLabel);
  if(applied > 0){
    showFloat($('comp-mini'), (icon || '') + '+' + applied, color || '#6ee7b7', { variant:'heal', scale:1.04 });
    if(typeof pulseCombatEl === 'function') pulseCombatEl($('comp-mini'), 'heal', 240);
  }
  markDirty('companion');
  return { applied, overheal };
}
function companionHealTarget(){
  const st = computeCompanionStats();
  const heroFrac = state.hp / Math.max(1, state.hero.hpMax || 1);
  const compFrac = (!st || compDowned()) ? 1 : ((state._compHp || 0) / Math.max(1, st.hpMax || 1));
  if(st && !compDowned() && compFrac <= heroFrac && compFrac < 0.88) return 'companion';
  return 'hero';
}
function applyCompanionDamage(amount, mon, opts){
  const now = opts?.now || Date.now();
  let taken = Math.max(0, Math.floor(amount || 0));
  if((state._compBarrier || 0) > 0 && taken > 0){
    const absorb = Math.min(state._compBarrier, taken);
    state._compBarrier -= absorb;
    taken -= absorb;
    showFloat($('comp-mini'), '🛡️-' + absorb, '#93c5fd', { variant:'shield-break', scale:1.02 });
    if(typeof pulseCombatEl === 'function') pulseCombatEl($('comp-mini'), 'shield', 260);
  }
  if(state._compDebuffs && state._compDebuffs.brittle && state._compDebuffs.brittle.expire > now){
    taken *= 2;
    delete state._compDebuffs.brittle;
  }
  taken = Math.max(1, Math.floor(taken * companionDebuffTakenMult()));
  state._compHp = Math.max(0, (state._compHp || 0) - taken);
  if((state._compSoulLinkUntil || 0) > now && mon && mon.hp > 0){
    const healBack = Math.max(1, Math.floor(taken * 0.25));
    mon.hp = Math.min(mon.hpMax, mon.hp + healBack);
    showMonsterFloat(mon, '🔗+' + healBack, '#a78bfa');
  }
  if(opts?.show !== false){
    const text = typeof opts?.label === 'function' ? opts.label(taken) : (opts?.label || ('-' + taken));
    showFloat($('comp-mini'), text, opts?.color || '#ff9aa0', {
      variant: opts?.variant || ((mon?.isBoss || taken >= ((computeCompanionStats()?.hpMax || 1) * 0.12)) ? 'boss' : 'comp'),
      scale: mon?.isBoss ? 1.07 : 1
    });
  }
  if(typeof pulseCombatEl === 'function') pulseCombatEl($('comp-mini'), (mon?.isBoss || taken >= ((computeCompanionStats()?.hpMax || 1) * 0.12)) ? 'danger' : 'comp', mon?.isBoss ? 300 : 220);
  if(state._compHp <= 0) downCompanion(now);
  markDirty('companion');
  return taken;
}
function addCompanionBarrier(amount, icon, color){
  amount = Math.max(0, Math.floor(amount || 0));
  if(amount <= 0) return 0;
  state._compBarrier = (state._compBarrier || 0) + amount;
  showFloat($('comp-mini'), (icon || '🛡️') + '+' + amount, color || '#93c5fd', { variant:'shield', scale:1.04 });
  if(typeof pulseCombatEl === 'function') pulseCombatEl($('comp-mini'), 'shield', 260);
  markDirty('companion');
  return amount;
}
function clearDebuffGroup(target){
  const store = target === 'companion' ? state._compDebuffs : state.heroDebuffs;
  if(!store) return false;
  const now = Date.now();
  const keys = Object.keys(store).filter(k => store[k] && store[k].expire > now);
  if(!keys.length) return false;
  const priority = ['freeze','fear','stun','silence','disarm','decay2','decay','cripple','weaken','burn','brittle','soulLink','vulnerable'];
  keys.sort((a,b)=>{
    const pa = priority.indexOf(a), pb = priority.indexOf(b);
    return (pa === -1 ? 999 : pa) - (pb === -1 ? 999 : pb);
  });
  delete store[keys[0]];
  if(target === 'hero') recomputeStats();
  markDirty(target === 'hero' ? 'hero' : 'companion');
  return true;
}
function companionSkillDamageMult(sk, mon, now){
  let mult = 1;
  if(!sk || !mon) return mult;
  if(sk.bonusVsBoss && mon.isBoss) mult *= 1 + sk.bonusVsBoss;
  if(sk.bonusVsDot && getMonsterDotCount(mon, now) > 0) mult *= 1 + sk.bonusVsDot;
  if(sk.bonusVsSlow && mon.slowUntil > now) mult *= 1 + sk.bonusVsSlow;
  if(sk.bonusVsSunder && mon.sunderUntil > now) mult *= 1 + sk.bonusVsSunder;
  if(sk.bonusVsState && monsterStateActive(mon, sk.bonusVsState)) mult *= 1 + (sk.bonusStatePct || 0.3);
  if(sk.executeBonus && mon.hp > 0 && mon.hp <= mon.hpMax * (sk.executeThreshold || 0.35)) mult *= 1 + sk.executeBonus;
  if(sk.buffAmp && sk.buffAmp.key && companionBuffActive(sk.buffAmp.key, now)) mult *= 1 + (sk.buffAmp.pct || 0);
  return mult;
}
function applyCompanionSplash(mon, dmg, pct, icon, color){
  pct = Math.max(0, pct || 0);
  if(pct <= 0 || !Array.isArray(state.currentMonsters)) return;
  for(const target of state.currentMonsters){
    if(target === mon || target.hp <= 0) continue;
    let splash = Math.max(1, Math.floor(dmg * pct));
    splash = absorbMonsterBarrier(target, splash, icon || '💥').remaining;
    if(splash <= 0) continue;
    target.hp -= splash;
    trackDmg('comp', splash);
    showMonsterFloat(other, (icon || '💥') + '-' + splash, color || '#fca5a5');
  }
}
function applyCompanionSupportSkill(sk, st, now){
  const targetMode = companionSkillTarget(sk);
  const applyHealPct = pct => {
    if(!(pct > 0)) return;
    if(targetMode === 'companion') healCompanionAmount(Math.floor(st.hpMax * pct), st.emoji, '#6ee7b7', 'comp', sk.name || '支援治疗');
    else if(targetMode === 'hero') {
      const amt = Math.floor(state.hero.hpMax * pct);
      healHeroAmount(amt, st.emoji, '#6ee7b7', 'comp', sk.name || '支援治疗');
    } else if(targetMode === 'both') {
      const heroAmt = Math.floor(state.hero.hpMax * pct);
      healHeroAmount(heroAmt, st.emoji, '#6ee7b7', 'comp', sk.name || '支援治疗');
      healCompanionAmount(Math.floor(st.hpMax * pct), st.emoji, '#6ee7b7', 'comp', sk.name || '支援治疗');
    } else {
      const t = companionHealTarget();
      if(t === 'companion') healCompanionAmount(Math.floor(st.hpMax * pct), st.emoji, '#6ee7b7', 'comp', sk.name || '支援治疗');
      else {
        const amt = Math.floor(state.hero.hpMax * pct);
        healHeroAmount(amt, st.emoji, '#6ee7b7', 'comp', sk.name || '支援治疗');
      }
    }
  };
  const applyShieldPct = pct => {
    if(!(pct > 0)) return;
    if(targetMode === 'companion') addCompanionBarrier(Math.floor(st.hpMax * pct), sk.icon || '🛡️', '#93c5fd');
    else if(targetMode === 'hero') addTalentShield(Math.floor(state.hero.hpMax * pct), true);
    else if(targetMode === 'both') {
      addTalentShield(Math.floor(state.hero.hpMax * pct), true);
      addCompanionBarrier(Math.floor(st.hpMax * pct), sk.icon || '🛡️', '#93c5fd');
    } else if(companionHealTarget() === 'companion') addCompanionBarrier(Math.floor(st.hpMax * pct), sk.icon || '🛡️', '#93c5fd');
    else addTalentShield(Math.floor(state.hero.hpMax * pct), true);
  };
  if(sk.healPct) applyHealPct(sk.healPct);
  if(sk.shieldPct) applyShieldPct(sk.shieldPct);
  if(sk.cleanse){
    if(targetMode === 'both'){
      const c1 = clearDebuffGroup('hero');
      const c2 = clearDebuffGroup('companion');
      if(c1) showFloat($('hero-emoji'), '✨净化', '#fef08a');
      if(c2) showFloat($('comp-mini'), '✨净化', '#fef08a');
    } else {
      const target = targetMode === 'companion' ? 'companion' : targetMode === 'hero' ? 'hero' : companionHealTarget();
      if(clearDebuffGroup(target)) showFloat(target === 'hero' ? $('hero-emoji') : $('comp-mini'), '✨净化', '#fef08a');
    }
  }
}
function dealDmgToAll(atk,def,crit,critd,mul,forceCrit){
  let total=0;
  for(const mon of state.currentMonsters){if(mon.hp<=0)continue;const d=calcDmg(atk*mul,heroTargetDef(mon),crit,critd,forceCrit,mon.lvl,state.hero.lvl);let dd=d.dmg;const dr=monsterDamageReduction(mon);if(dr)dd=Math.max(1,Math.floor(dd*(1-dr)));mon.hp-=dd;total+=dd;trackDmg('hero',dd);}
  return total;
}
/* 仇恨锁定:把仇恨值最高的存活敌人放到 index 0(英雄/随从/单体技能都打 [0] = 当前焦点) */
function focusHighestThreat(){
  const alive=state.currentMonsters.filter(m=>m.hp>0);
  if(alive.length<=1)return;
  let best=alive[0];
  for(const m of alive)if((m.threat||0)>(best.threat||0))best=m;
  const i=state.currentMonsters.indexOf(best);
  if(i>0){state.currentMonsters.splice(i,1);state.currentMonsters.unshift(best);}
}
/* 手动指定攻击目标(点击敌人):把它的仇恨拉到最高,焦点立即切过去 */
function setManualFocus(uid){
  const m=state.currentMonsters.find(x=>x._uid===uid&&x.hp>0);if(!m)return;
  let mx=0;for(const o of state.currentMonsters)if(o.hp>0)mx=Math.max(mx,o.threat||0);
  m.threat=mx+100;
  focusHighestThreat();
}
/* 结算所有死亡敌人(AOE 可能一次放倒多只);世界模式整波清空后才刷新下一波 */
function reapDeadMonsters(){
  let guard=0;
  while(guard++<16){
    const dead=state.currentMonsters.find(m=>m.hp<=0);
    if(!dead)break;
    if(typeof trackKill==='function')trackKill();
    const i=state.currentMonsters.indexOf(dead);
    if(i!==0){state.currentMonsters.splice(i,1);state.currentMonsters.unshift(dead);} // 满足 onMonsterDeath 的 [0]===mon 守卫
    onMonsterDeath(dead);
    if(state.mode!=='world')break; // 其它模式由 onMonsterDeath 自行刷新(单怪)
  }
}

/* 受击减伤增益(BUFF_FX 里带 dr 的 buff,如减伤技能)→ 返回受伤倍率(<1) */
function buffDamageReductionMult(){
  if(typeof BUFF_FX!=='object'||!state.buffs)return 1;
  const now=Date.now();let m=1;
  for(const k in BUFF_FX){const fx=BUFF_FX[k];if(fx.dr&&state.buffs[k]>now)m*=(1-fx.dr);}
  return m;
}
function resolveMonsterDamageTaken(mon, rawDamage, opts){
  let taken = Math.max(1, Math.floor(rawDamage || 0));
  const versRate = heroVersDamageReductionRate(mon);
  if(versRate > 0) taken = Math.max(1, Math.floor(taken * (1 - versRate)));
  if(typeof passiveDamageTakenMult === 'function') taken = Math.max(1, Math.floor(taken * passiveDamageTakenMult()));
  taken = Math.max(1, Math.floor(taken * buffDamageReductionMult()));
  taken = Math.max(1, Math.floor(taken * heroDebuffTakenMult()));
  taken = Math.max(1, Math.floor(taken * masteryTakenMult()));
  taken = Math.max(1, Math.floor(taken * talentTakenMult(mon)));
  return monsterDamageFloor(mon, taken, opts);
}

/* ---------- 战斗主循环 ---------- */
let lastHeroAtk=0,lastMonAtk=0,lastRegen=0,dotTick=0,lastBossSkill=0,bossSkillIdx=0,lastAutoCast=0,burnTick=0;
function tickBattle(now){
  if(state.mode==='travel'){lastHeroAtk=now;lastMonAtk=now;return;}
  if(pruneTalentAuras(now)) recomputeStats();
  pruneSkillAuras(now);
  reapDeadMonsters();                                   // 先结算上一拍可能死亡的敌人(含 AOE 群杀)
  if(getAliveMonsters().length===0){spawnMonster();lastHeroAtk=now;lastMonAtk=now;return;}
  focusHighestThreat();                                 // 锁定仇恨最高的敌人为焦点([0])
  let mon=state.currentMonsters[0];
  const spdMul=state.battleSpeed||1;                    // 战斗倍速(1x / 2x)
  const regenInterval=1000/spdMul;

  if(now-lastRegen>regenInterval){
    const regenMult = heroDebuffRegenMult() * heroPassiveRegenMult(mon);
    state.hp=Math.min(state.hero.hpMax,state.hp+Math.max(0,Math.floor(state.hero.reg*regenMult)));
    const c=getCls();
    if(c.resKey==='rage')state.resource=Math.max(0,state.resource-3);
    else if(c.resKey==='energy')state.resource=Math.min(state.resourceMax,state.resource+10);
    else{const reg=2+Math.floor((state._attrs?.spi||0)*0.3)+state.hero.reg;state.resource=Math.min(state.resourceMax,state.resource+reg);}
    lastRegen=now;
  }
  const dotInterval = 1000 / spdMul;
  for(const m of state.currentMonsters){
    if(m.hp <= 0) continue;
    const dotDmg = tickMonsterDots(m, now, dotInterval);
    if(dotDmg > 0 && m === mon) showMonsterFloat(mon, '☠️-' + dotDmg, '#f97316');
  }
  // 英雄身上的灼烧/中毒(boss debuff)持续掉血
  {const bd=state.heroDebuffs&&state.heroDebuffs.burn;
   if(bd&&bd.expire>now&&now-burnTick>1000/spdMul){burnTick=now;const bdmg=Math.max(1,bd.dps||1);applyHeroDamage(bdmg,mon,{label:t=>'☠️-'+t,color:'#a3e635',now});processTalentLowHp(mon,now);if(state.hp<=0)return;}}
  // 大秘境词缀:血池治疗
  for (const m of state.currentMonsters) {
    if (m._sanguineHeal > 0 && m._sanguineEnd > now && now - (m._lastSanguineTick || 0) > 1000) {
      m._lastSanguineTick = now;
      const healAmt = Math.min(m._sanguineHeal, Math.floor(m.hpMax * 0.03));
      m.hp = Math.min(m.hpMax, m.hp + healAmt);
      m._sanguineHeal -= healAmt;
    }
  }

  // 大秘境词缀:周期性效果
  const ms = state.mythicState;
  if (ms && ms.affixes && state.mode === 'mythic') {
    for (const af of ms.affixes) {
      const mod = af.mod || {};
      // 火山:每8秒
      if (mod.volcanic && now - (ms.lastVolcanic||0) > 8000) {
        ms.lastVolcanic = now;
        const vdmg = Math.max(1, Math.floor(state.hero.hpMax * 0.08 + rng(0, 50)));
        applyHeroDamage(vdmg, mon, { label:t=>'🌋-'+t, color:'#ff7a7a', now });
      }
      // 折磨:每5秒
      if (mod.afflicted && now - (ms.lastAfflicted||0) > 5000) {
        ms.lastAfflicted = now;
        const admg = Math.max(1, Math.floor(state.hero.hpMax * 0.05));
        applyHeroDamage(admg, mon, { label:t=>'😈-'+t, color:'#c084fc', now });
      }
      // 奥术:每15秒给BOSS盾
      if (mod.arcane && mon.isBoss && now - (ms.lastArcane||0) > 15000) {
        ms.lastArcane = now;
        mon._arcaneShield = (mon._arcaneShield||0) + Math.floor(mon.hpMax * 0.15);
        showMonsterFloat(mon, '🔮盾', '#a78bfa');
      }
    }
  }

  // 玩家攻击(锁定焦点 = 仇恨最高者)
  const spd=state.hero.spd||1;
  const heroInterval=1000/(spd*spdMul*hasteFactor());   // 极速也提升攻击速度
  if((now-lastHeroAtk>heroInterval||now-lastHeroAtk>5000)&&!(state.heroStunUntil>now)&&!(state.heroDisarmUntil>now)){   // 被控制或缴械时无法普通攻击

    let ap=state.hero.atk;
    if(state.hero.executeBonus>0&&mon.hp<mon.hpMax*0.3)ap=Math.floor(ap*(1+state.hero.executeBonus/100));
    if(state.hero.vers>0)ap=Math.floor(ap*(1+state.hero.vers/100));
    const zb=(typeof progressionCombatBonus==='function')?progressionCombatBonus(mon.name):{dmgMult:1};
    if(zb.dmgMult!==1)ap=Math.floor(ap*zb.dmgMult);
    ap=Math.floor(ap*masteryDmgMult());   // 精通:伤害增幅(dmgAmp 专精)
    ap=Math.floor(ap*talentDamageMult(mon,null));
    const d=calcDmg(ap,heroTargetDef(mon),state.hero.crit,state.hero.critd,false,mon.lvl,state.hero.lvl);
    let actualDmg = d.dmg;
    const dodged = mon.dodgeChance && Math.random() < mon.dodgeChance;   // BOSS 闪避
    if (dodged) actualDmg = 0;
    if (!dodged) actualDmg = absorbMonsterBarrier(mon, actualDmg, d.crit ? '💥' : '⚔️').remaining;
    {const dr=monsterDamageReduction(mon, now);if(dr&&actualDmg>0)actualDmg=Math.max(1,Math.floor(actualDmg*(1-dr)));}   // 怪物减伤
    mon.hp-=actualDmg;trackDmg('hero',actualDmg,d.crit&&!dodged,'⚔️普攻');
    if(!dodged&&state.hero.extraAtk>0&&Math.random()*100<state.hero.extraAtk){const d2=calcDmg(ap,heroTargetDef(mon),state.hero.crit,state.hero.critd,false,mon.lvl,state.hero.lvl);let dd2=absorbMonsterBarrier(mon, d2.dmg, '🎯').remaining;const dr=monsterDamageReduction(mon, now);if(dr&&dd2>0)dd2=Math.max(1,Math.floor(dd2*(1-dr)));mon.hp-=dd2;trackDmg('hero',dd2,d2.crit);showMonsterFloat(mon,'🎯+'+dd2,'#fbbf24',{variant:d2.crit?'crit':'hit',scale:d2.crit?1.18:1.02});}
    showMonsterFloat(mon,dodged?'闪避':('-'+actualDmg),dodged?'#9ca3af':(d.crit?'#fbbf24':'#fff'),{variant:dodged?'avoid':(d.crit?'crit':'hit'),scale:d.crit?1.22:1});
    pulseMonsterEl(mon, d.crit ? 'crit' : 'hit', d.crit ? 280 : 220);
    if(!dodged&&d.crit&&masteryFor('bleedOnCrit')>0){const bleed=Math.floor(actualDmg*masteryFor('bleedOnCrit')*MASTERY_TYPE.bleedOnCrit.per/100);if(bleed>0){applyMonsterDot(mon,'mastery:bleed',bleed,5000,{icon:'🩸',name:'流血',source:'mastery'});showMonsterFloat(mon,'🩸流血','#dc2626');}}   // 精通:暴击流血
    if(!dodged&&state.hero.stunChance&&Math.random()*100<state.hero.stunChance){mon.stunUntil=now+1500;showMonsterFloat(mon,'💫击晕','#fde047');}   // 趣味天赋:几率击晕敌人
    if(typeof progressionOnDamage==='function') progressionOnDamage(actualDmg);
    if(!dodged&&typeof passiveOnHit==='function')passiveOnHit(mon,actualDmg,ap);
    if(!dodged&&d.crit&&typeof passiveOnCrit==='function')passiveOnCrit(mon,actualDmg);
    if(!dodged&&d.crit)processTalentOnCrit(mon,actualDmg,{skillKey:null});
    if(!dodged&&state.hero.leech>0){const leechHeal=Math.floor(d.dmg*state.hero.leech*0.5/100);if(leechHeal>0){state.hp=Math.min(state.hero.hpMax,state.hp+leechHeal);showFloat($('hero-emoji'),'🩸+'+leechHeal,'#6ee7b7',{variant:'heal',scale:1.04});if(typeof pulseCombatEl === 'function') pulseCombatEl($('hero-emoji'),'heal',220);}}   // 吸血:每点=0.5%实际吸取,有浮动数字可见
    lastHeroAtk=now;
    if(getCls().resKey==='rage')state.resource=Math.min(state.resourceMax,state.resource+(d.crit?12:8));
    // 智能自动施法:读取当前职业全部已解锁技能;技能栏仅作为手动快捷栏
    if(state.autoSkill&&!casting){
      const now2=Date.now();const aliveN=getAliveMonsters().length;
      const hpFrac=state.hp/Math.max(1,state.hero.hpMax);
      const targetHpFrac=mon&&mon.hp>0?mon.hp/Math.max(1,mon.hpMax):1;
      const autoSkills=autoCastSkillEntries(getCls());
      const ready=[];
      for(let order=0;order<autoSkills.length;order++){
        const [skKey, sk] = autoSkills[order];
        if(state.skillCooldowns[skKey]&&state.skillCooldowns[skKey]>now2)continue;
        if(!sk||sk.type==='interrupt')continue;
        let cost=sk.mp;if(state.hero.costReduction>0)cost=Math.max(1,Math.floor(sk.mp*(1-state.hero.costReduction/100)));
        if(state.resource<cost)continue;
        const score=autoSkillScore(skKey,sk,mon,{now:now2,aliveN,hpFrac,targetHpFrac});
        if(score==null)continue;
        ready.push({skKey,sk,score,order});
      }
      if(ready.length){
        ready.sort((a,b)=>b.score-a.score||a.order-b.order);
        const top=ready[0];
        const topTag=(top.sk.ai&&top.sk.ai.priorityTag)||'builder';
        const emergencyHeal=(topTag==='heal'&&hpFrac<0.45)||(topTag==='defBuff'&&hpFrac<0.4);
        const GCD=900/spdMul;                                                  // 全局冷却(倍速下同步缩短)
        if(emergencyHeal||now2-lastAutoCast>=GCD){
          startCast(top.skKey,false);
          lastAutoCast=now2;
        }
      }
    }
  }
  if(getAliveMonsters().length===0){reapDeadMonsters();lastHeroAtk=now;lastMonAtk=now;return;}
  if(mon.hp<=0){focusHighestThreat();mon=state.currentMonsters[0];}  // 焦点已死则切换到下一仇恨目标(战利品下一拍 reap 结算)
  if(!mon)return;

  // 怪物攻击(每只敌人独立计时、独立出手,并各自累积仇恨)
  let anyHit=false;
  let totalDmg=0;
  for(const m of state.currentMonsters){
    if(m.hp<=0)continue;
    if(m.stunUntil&&m.stunUntil>now)continue;   // 被英雄击晕的敌人无法攻击
    let interval=(m.atkInterval||(m.isBoss?1400:1700))/spdMul/monsterSpeedMult(m, now);
    if(m.slowUntil&&m.slowUntil>now)interval=Math.floor(interval*1.5);
    const last=m._lastAtk||0;
    if(!(now-last>interval||now-last>6000))continue;   // 还没到这只怪的下一次出手
    m._lastAtk=now;
    const supportSkill = getReadyMonsterSupportSkill(m, now);
    if(supportSkill && now-(m._lastSupportSkill||0)>1800){
      m._lastSupportSkill=now;
      if(applyMonsterSupportSkill(m,supportSkill,now)) continue;
    }
    let matk=monsterAttackValue(m, now);if(m._affixes&&m._affixes.some(a=>a.mod.raging)&&m.hp<m.hpMax*0.3)matk=Math.floor(matk*1.5);
    const critRate=monsterCritRate(m, now);
    // 双倍攻击
    let doubleAtk=m._nextAtkDouble&&m._nextAtkDouble>0;if(doubleAtk){m._nextAtkDouble--;syncMonsterDoubleAura(m);}
    // 小怪技能(每3秒一次,瞬发低倍率,可带debuff)
    let kindFloat=null,kindColor='#f59e0b',kindLog=null,kindSkill=null;
    if(!m.isBoss&&(m._monSkills?.length||m._monSkill)&&now-(m._lastSkill||0)>3000){
      m._lastSkill=now;const sk=getReadyMonsterCombatSkill(m, now);
      if(sk){
      matk=Math.floor(matk*sk.mul);kindFloat=sk.name+'!';kindColor='#fbbf24';
      kindSkill=sk;
      kindLog=[m.name+' 释放 '+sk.name+'!','bad'];
      m._lastSkillName = sk.name;
      }
    }
    m.threat=(m.threat||0)+matk*0.6;
    // —— 仇恨分配:存活随从按定位概率把这次攻击吸引到自己身上(坦克更高)——
    if(companionTargetable()&&Math.random()<compAggroChance()){
      const cst=computeCompanionStats();
      const cd=calcDmg(matk,cst?cst.def:0,critRate,(m.critMult?m.critMult*100:150),false,state.hero.lvl,m.lvl);
      const tc=applyCompanionDamage(Math.max(1,cd.dmg),m,{label:t=>(kindFloat?kindFloat+' ':'')+'-'+t,color:'#ff9aa0',now});
      if(typeof pulseCombatEl === 'function') pulseCombatEl($('comp-mini'), (m.isBoss || tc >= ((computeCompanionStats()?.hpMax || 1) * 0.12)) ? 'danger' : 'comp', m.isBoss ? 300 : 220);
      if(kindSkill)skillEffects(kindSkill,m,tc,now,{allowFallback:false,target:'companion'});
      continue;   // 这只怪打了随从,英雄本拍不挨打、不进怒气
    }
    // —— 命中英雄(原逻辑) ——
    if(state.hero.dodge&&Math.random()*100<state.hero.dodge){showFloat($('hero-emoji'),'闪避','#9ca3af',{variant:'avoid'});continue;}   // 英雄"闪避"天赋
    if(kindFloat)showFloat($('hero-emoji'),kindFloat,kindColor,{variant:(kindSkill&&monsterSkillDangerLevel(kindSkill)>0)?'boss':'status',scale:(kindSkill&&monsterSkillDangerLevel(kindSkill)>1)?1.12:1.04});
    if(kindLog)log(kindLog[0],kindLog[1]);
    const d=calcDmg(matk,heroDefAgainst(m),critRate,(m.critMult?m.critMult*100:150),false,state.hero.lvl,m.lvl);let taken=d.dmg;
    // BOSS 普攻几率击晕英雄(1.5秒无法攻击/施法)
    if(m.stunChance&&Math.random()<m.stunChance){state.heroStunUntil=now+1500;showFloat($('hero-emoji'),'💫晕眩','#fde047');log('💫 你被 '+m.name+' 击晕了!','bad');}
    taken=resolveMonsterDamageTaken(m,taken);
    taken=applyHeroDamage(taken,m,{label:t=>'-'+t,color:'#ff7a7a',now});
    if(kindSkill)skillEffects(kindSkill,m,taken,now,{allowFallback:false});
    processTalentLowHp(m,now);
    totalDmg+=taken;
    if(state.hero.reflectDmg>0){const reflect=Math.min(m.hp,Math.floor(d.dmg*state.hero.reflectDmg/100));if(reflect>0){m.hp-=reflect;showMonsterFloat(m,'🛡️'+reflect,'#fbbf24');trackDmg('hero',reflect,false,'反伤');}}
    if(typeof passiveOnTakeDamage==='function')passiveOnTakeDamage(m,taken);
    anyHit=true;
    // 双倍攻击技巧: 再来一刀
    if(doubleAtk){
      const d2d=calcDmg(matk,heroDefAgainst(m),critRate,(m.critMult?m.critMult*100:150),false,state.hero.lvl,m.lvl);let t2=d2d.dmg;
      t2=resolveMonsterDamageTaken(m,t2);
      t2=applyHeroDamage(t2,m,{label:t=>'⚡-'+t,color:'#fbbf24',now});processTalentLowHp(m,now);totalDmg+=t2;
    }
  }
  if(anyHit){
    if(typeof pulseCombatEl === 'function') pulseCombatEl($('hero-emoji'), totalDmg >= state.hero.hpMax * 0.14 ? 'danger' : 'hit', totalDmg >= state.hero.hpMax * 0.14 ? 300 : 220);
    const ls=monsterLeechRate(mon, now);
    if(ls>0&&totalDmg>0){const heal=Math.floor(totalDmg*ls);mon.hp=Math.min(mon.hpMax,mon.hp+heal);showMonsterFloat(mon,'🩸+'+heal,'#ef4444');}
    lastMonAtk=now;
    if(getCls().resKey==='rage')state.resource=Math.min(state.resourceMax,state.resource+5);
  }
  // BOSS技能(带读条)— 使用技能自身CD, 支持副本/大秘境/地图BOSS
  if(mon.isBoss&&!bossCasting){let bossData=getMonsterBossData(mon);
    if(!bossData){const map=MAPS.find(m=>m.key===state.currentMap);if(map?.boss)bossData=map.boss;}
    const rawCd=((bossData?.skills||[])[bossSkillIdx%(bossData?.skills||[]).length])?.cd||10;
    const skillCd=Math.max(3,Math.floor(rawCd*0.6));   // CD加速40%,但最低3秒间隔
    if(bossData?.skills?.length&&now-lastBossSkill>skillCd*1000){const sk=bossData.skills[bossSkillIdx%bossData.skills.length];let castTime=sk.castTime!==undefined?sk.castTime:2;const instant=mon.instantCast&&Math.random()<0.35;if(instant)castTime=0;bossCasting={bossName:mon.bossName,name:sk.name,icon:sk.icon,type:sk.type,heal:sk.heal,mul:sk.mul,alwaysCrit:sk.alwaysCrit,lifeSteal:sk.lifeSteal,dot:sk.dot,slow:sk.slow,stun:sk.stun,weaken:sk.weaken,sunder:sk.sunder,spdBuff:sk.spdBuff,spdBuffSecs:sk.spdBuffSecs,spdBuffPct:sk.spdBuffPct,atkBuffSecs:sk.atkBuffSecs,atkBuffPct:sk.atkBuffPct,defBuffSecs:sk.defBuffSecs,defBuffPct:sk.defBuffPct,drBuffSecs:sk.drBuffSecs,drBuffPct:sk.drBuffPct,shieldPct:sk.shieldPct,critBuffSecs:sk.critBuffSecs,critBuffPct:sk.critBuffPct,leechBuffSecs:sk.leechBuffSecs,leechBuffPct:sk.leechBuffPct,summonCount:sk.summonCount,summonTheme:sk.summonTheme,aoe:sk.aoe,silence:sk.silence,disarm:sk.disarm,fear:sk.fear,freeze:sk.freeze,cripple:sk.cripple,decay:sk.decay,wither:sk.wither,manaDrain:sk.manaDrain,bomb:sk.bomb,plague:sk.plague,bleed:sk.bleed,brittle:sk.brittle,soulDrain:sk.soulDrain,soulLink:sk.soulLink,revenge:sk.revenge,frenzy:sk.frenzy,decay2:sk.decay2,mirror:sk.mirror,startTime:now,duration:castTime*1000};log('💀 '+mon.bossName+(instant?' 瞬发 ':' 开始施放 ')+sk.name+'!'+(instant?'(无法打断)':''),'bad');lastBossSkill=now;bossSkillIdx++;}
    // BOSS技巧(独立冷却,避免开场和支援技能一起连发)
    const tricks=bossTrickList(bossData);
    const supportRecently = (mon._lastSupportSkill || 0) > 0 && now - mon._lastSupportSkill < 4500;
    const trickReady = tricks.length && now >= (mon._nextTrickAt || 0) && !supportRecently;
    if(tricks.length&&trickReady){
      const trick=tricks[Math.floor(Math.random()*tricks.length)];
      log('⚡ '+mon.bossName+' 使用技巧 '+trick.icon+trick.name+'!','bad');
      mon._lastTrick=now;
      const enrageWindow = mon.hp < mon.hpMax * 0.35;
      mon._nextTrickAt = now + rng(enrageWindow ? 9000 : 12000, enrageWindow ? 12000 : 16000);
      if(trick.nextDouble){
        mon._nextAtkDouble=(mon._nextAtkDouble||0)+trick.nextDouble;
        setMonsterTrickAura(mon,'nextDouble',trick,0,{stacks:mon._nextAtkDouble, desc: trick.nextDouble>1 ? `接下来 ${trick.nextDouble} 次攻击会追加打击` : '下一次攻击会追加打击'});
      }
      if(trick.atkBuff){
        mon._trickAtkBuff=now+trick.atkBuff*1000;
        mon._trickAtkPct=trick.atkBuffPct||50;
        setMonsterTrickAura(mon,'atk',trick,mon._trickAtkBuff);
      }
      if(trick.spdBuff){
        mon._trickSpdBuff=now+trick.spdBuff*1000;
        mon._trickSpdPct=trick.spdBuffPct||50;
        setMonsterTrickAura(mon,'spd',trick,mon._trickSpdBuff);
      }
      if(trick.defBuff){
        mon._trickDefBuff=now+trick.defBuff*1000;
        mon._trickDefPct=trick.defBuffPct||50;
        setMonsterTrickAura(mon,'def',trick,mon._trickDefBuff);
      }
      if(trick.healPct)mon.hp=Math.min(mon.hpMax,mon.hp+Math.floor(mon.hpMax*trick.healPct));
      if(trick.leechBuff){
        mon._trickLeech=now+trick.leechBuff*1000;
        mon._trickLeechPct=trick.leechBuffPct||20;
        setMonsterTrickAura(mon,'leech',trick,mon._trickLeech);
      }
      if(trick.critBuff){
        mon._trickCrit=now+trick.critBuff*1000;
        mon._trickCritPct=trick.critBuffPct||100;
        setMonsterTrickAura(mon,'crit',trick,mon._trickCrit);
      }
    }}
  if(state.hp<=0)onHeroDeath();
}

function onMonsterDeath(mon){
  if(!mon||mon.hp>0)return; // 已经处理过了
  if(state.currentMonsters[0]!==mon)return; // 不是当前怪物,已刷新
  // 大秘境词缀:崩裂/血池
  if (mon._affixes) {
    for (const af of mon._affixes) {
      if (af.mod.bursting) {
        const burstDmg = Math.max(1, Math.floor(state.hp * 0.05));
        state.hp -= burstDmg;
        showFloat($('hero-emoji'), '💥-'+burstDmg, '#ef4444');
      }
      if (af.mod.sanguine) {
        for (const other of state.currentMonsters) {
          if (other !== mon && other.hp > 0) {
            other._sanguineHeal = (other._sanguineHeal || 0) + Math.floor(other.hpMax * 0.03);
            other._sanguineEnd = Date.now() + 3000;
          }
        }
      }
    }
  }
  // 声望/图鉴/最高伤害等加成
  const bonus=(typeof progressionCombatBonus==='function')?progressionCombatBonus(mon.name):{xpMult:1,goldMult:1,dropMult:1,dmgMult:1};
  // 觉醒里程碑的 xpMult/goldMult/dropMult 是百分比加成,这里乘进去
  const ab=(typeof collectAscendMod==='function')?collectAscendMod():{xpMult:0,goldMult:0,dropMult:0};
  bonus.xpMult  *= 1 + (ab.xpMult||0)/100;
  bonus.goldMult*= 1 + (ab.goldMult||0)/100;
  bonus.dropMult*= 1 + (ab.dropMult||0)/100;
  const lb=(typeof collectLifeMod==='function')?collectLifeMod():{xpMult:0,goldMult:0,dropMult:0};
  bonus.xpMult  *= 1 + (lb.xpMult||0)/100;
  bonus.goldMult*= 1 + (lb.goldMult||0)/100;
  bonus.dropMult*= 1 + (lb.dropMult||0)/100;
  const af=(typeof collectArtifactMod==='function')?collectArtifactMod():{xpMult:0,goldMult:0,dropMult:0};
  bonus.xpMult  *= 1 + (af.xpMult||0)/100;
  bonus.goldMult*= 1 + (af.goldMult||0)/100;
  bonus.dropMult*= 1 + (af.dropMult||0)/100;
  const mm=(typeof collectMountMod==='function')?collectMountMod():{xpMult:0,goldMult:0,dropMult:0};
  bonus.xpMult  *= 1 + (mm.xpMult||0)/100;
  bonus.goldMult*= 1 + (mm.goldMult||0)/100;
  bonus.dropMult*= 1 + (mm.dropMult||0)/100;
  const olp=overLevelPenalty(mon);   // 越级惩罚(对级=1)
  let xp=calcXP(mon);xp=Math.floor(xp*bonus.xpMult);
  let goldEarned=Math.floor(mon.goldReward*bonus.goldMult*olp);
  if(xp>0)log('✅ 击败 '+mon.name+',+'+goldEarned+'💰 +'+xp+'XP','good');
  else log('✅ 击败 '+mon.name+',+'+goldEarned+'💰 (灰色:无经验)','info');
  state.gold+=goldEarned;state.honor+=mon.honorReward;
  if(typeof progressionOnGoldGain==='function') progressionOnGoldGain(goldEarned);
  if(typeof eventsOnGoldGain==='function') eventsOnGoldGain(goldEarned);
  if(typeof eventsOnKill==='function') eventsOnKill(mon);
  if(xp>0)gainXP(xp);state.killsTotal+=1;
  processTalentOnKill(mon);
  if(typeof passiveOnKill==='function')passiveOnKill(mon);
  if(xp>0&&typeof artifactGainAp==='function') artifactGainAp(xp);
  if(Math.random()<mon.gemChance){const gems=mon.isBoss?rng(3,8):1;state.gem+=gems;log('💎 +'+gems+' 钻石','loot');}
  // boss 掉宝石/精华
  if(mon.isBoss&&typeof bossGemDrop==='function'&&state.mode!=='mythic') bossGemDrop(mon.fromDungeon);
  // 普通怪有低概率掉精华
  else if(typeof bossGemDrop==='function'&&Math.random()<0.03){if(typeof ensureMats==='function')ensureMats();state.essence+=1;}
  // 钩子: 图鉴/声望/成就
  if(typeof progressionOnKill==='function') progressionOnKill(mon);
  // 坐骑掉落钩子(副本/大秘境 BOSS)
  if(mon.isBoss&&(state.mode==='dungeon'||state.mode==='mythic')&&typeof mountOnDungeonBossKill==='function') mountOnDungeonBossKill();
  if(typeof midgameMountRollOnKill==='function') midgameMountRollOnKill(mon);
  // 掉率受声望加成 (一次性提升), 副本/大秘境BOSS必掉1件
  const adjDrop=(mon.isBoss&&(state.mode==='dungeon'||state.mode==='mythic'))?1:Math.min(1,mon.dropRate*bonus.dropMult*olp);
  if(Math.random()<adjDrop){
    const dKey=mon.fromDungeon?((state.dungeonState||state.mythicState)?.key):null;
    const it=(mon._isRaid && dKey)
      ? rollItem('epic',mon.lvl,dKey,mon.isBoss?mon.bossName:null,{ exactRarity: !!mon._isEpicRaid })
      : rollItem(mon.maxRarity,mon.lvl,dKey,mon.isBoss?mon.bossName:null);
    if((state.mode==='dungeon'||state.mode==='mythic')&&(state.dungeonState||state.mythicState))(state.dungeonState||state.mythicState).loot.push(it);addToInventory(it);if(typeof eventsOnItemGet==='function') eventsOnItemGet(it);if(it.rarity==='legend'&&typeof progressionOnLegendary==='function') progressionOnLegendary();const c=it.rarity==='legend'?'legend':(it.rarity==='epic'?'epic':'loot');log('🎁 掉落 '+it.name+(it.epicRaid?' [史诗团本]':''),c);
  }
  if(mon._isRaid && mon.fromDungeon){
    const dKey2=(state.dungeonState||state.mythicState)?.key;
    if(mon._isEpicRaid){
      if(mon._isRaidFinal){
        const extraEpic=rollItem('epic',mon.lvl,dKey2,mon.bossName,{ exactRarity:true });
        if((state.dungeonState||state.mythicState)) (state.dungeonState||state.mythicState).loot.push(extraEpic);
        addToInventory(extraEpic);
        if(typeof eventsOnItemGet==='function') eventsOnItemGet(extraEpic);
        log('🎁 史诗团本尾王额外掉落 '+extraEpic.name+' [史诗团本]','epic');
      }
      const dg2=DUNGEONS.find(d=>d.key===dKey2);
      const bossCount=Math.max(1,dg2?.bosses?.length||1);
      const bossIndex=Math.max(0,(dg2?.bosses||[]).findIndex(b=>b.name===mon.bossName));
      const legendChance=typeof epicRaidLegendChance==='function' ? epicRaidLegendChance(bossIndex,bossCount) : 0.02;
      if(Math.random()<legendChance){
        const legend=rollItem('legend',mon.lvl,dKey2,mon.bossName,{ exactRarity:true });
        if((state.dungeonState||state.mythicState)) (state.dungeonState||state.mythicState).loot.push(legend);
        addToInventory(legend);
        log('🎉 史诗团本BOSS额外掉落 '+legend.name+' [史诗团本]', 'legend');
        if(typeof progressionOnLegendary==='function') progressionOnLegendary();
      }
    }else if(mon._isRaidFinal&&Math.random()<0.06){
      const legend=rollItem('legend',mon.lvl,dKey2,mon.bossName,{ exactRarity:true });
      if((state.dungeonState||state.mythicState)) (state.dungeonState||state.mythicState).loot.push(legend);
      addToInventory(legend);
      log('🎉 团本关底BOSS额外掉落 '+legend.name,'legend');
      if(typeof progressionOnLegendary==='function') progressionOnLegendary();
    }
  }
  // 世界Boss 击杀
  if(mon.isWorldBoss){if(typeof onWorldBossKill==='function') onWorldBossKill(mon);return;}
  if(mon.isRareElite){if(typeof onRareEliteKill==='function') onRareEliteKill(mon);return;}
  if(mon._summoned){
    const di = state.currentMonsters.indexOf(mon);
    if(di >= 0) state.currentMonsters.splice(di, 1);
    focusHighestThreat();
    markDirty('stage');
    return;
  }
  if(state.mode==='dungeon'){const ds=state.dungeonState;const dg=DUNGEONS.find(d=>d.key===ds.key);const lastBoss=(dg.bosses||[])[dg.bosses.length-1];ds.wave+=1;if(lastBoss&&ds.wave>lastBoss.wave){onDungeonClear(dg);return;}spawnDungeonMonster();}
  else if(state.mode==='mythic'){const ms=state.mythicState;const dg=DUNGEONS.find(d=>d.key===ms.key);const lastBoss=(dg.bosses||[])[dg.bosses.length-1];if(mon.isBoss)onMythicBossKill();ms.wave+=1;if(lastBoss&&ms.wave>lastBoss.wave){onMythicClear();return;}spawnDungeonMonster();}
  else if(state.mode==='tower'){if(typeof onTowerMonsterKill==='function') onTowerMonsterKill(mon);}
  else if(state.mode==='boss'){if(mon.isBoss){const map=getMap();log('👑 '+map.boss.name+' 已被击败!','legend');
    if(map.boss.lvl>=60){
      // 60+ BOSS: 必爆紫装 + 15%概率橙装
      const purple=rollItemOfRarity('epic',mon.lvl);addToInventory(purple);if(typeof eventsOnItemGet==='function')eventsOnItemGet(purple);log('🎁 必掉 '+purple.name,'epic');
      if(Math.random()<0.15){const orange=rollItemOfRarity('legend',mon.lvl);addToInventory(orange);if(typeof eventsOnItemGet==='function')eventsOnItemGet(orange);log('🎉 额外掉落 '+orange.name,'legend');}
    }else{
      // 60以下: 必爆蓝装 + 15%概率紫装
      const blue=rollItemOfRarity('rare',mon.lvl);addToInventory(blue);if(typeof eventsOnItemGet==='function')eventsOnItemGet(blue);log('🎁 必掉 '+blue.name,'loot');
      if(Math.random()<0.15){const purple=rollItemOfRarity('epic',mon.lvl);addToInventory(purple);if(typeof eventsOnItemGet==='function')eventsOnItemGet(purple);log('🎉 额外掉落 '+purple.name,'epic');}
    }
    state.mode='world';markDirty('map');}spawnMonster();}
  else{const subKey=state.currentMap+'-'+state.currentSubzone;state.subzoneKills[subKey]=(state.subzoneKills[subKey]||0)+1;if(state.subzoneKills[subKey]===50&&!state.subzoneCleared[subKey]){state.subzoneCleared[subKey]=true;const map=getMap();const sub=map.sub[state.currentSubzone];state.gold+=sub.lvl[1]*30;log('🌟 ['+sub.name+'] 探索完成! +'+sub.lvl[1]*30+'💰','epic');const it3=rollItem('rare',sub.lvl[1],state.currentMap);addToInventory(it3);if(typeof eventsOnItemGet==='function') eventsOnItemGet(it3);if(typeof eventsOnSubzoneClear==='function') eventsOnSubzoneClear();if(typeof progressionOnSubzoneClear==='function') progressionOnSubzoneClear(state.currentMap,state.currentSubzone);markDirty('map');}
    // 多敌:仅移除这一只,整波清空后才刷新下一波
    const di=state.currentMonsters.indexOf(mon);if(di>=0)state.currentMonsters.splice(di,1);
    if(state.currentMonsters.length===0)spawnMonster();}
  // 注:不再每次击杀都 markDirty('inventory') —— 否则背包每杀一只就整体重建,
  // 导致鼠标悬停装备时按钮闪烁、点击落空。掉落时 addToInventory 已各自 markDirty。
}

function onHeroDeath(){
  log('☠️ 你倒下了…','bad');state._compHp=null;state._compDownUntil=0;   // 复活后随从满血归来
  state.heroDebuffs = {};
  state._compDebuffs = {};
  state._compBuffs = {};
  state._compBarrier = 0;
  state.heroStunUntil = 0;
  state.heroSilenceUntil = 0;
  state.heroDisarmUntil = 0;
  state._compStunUntil = 0;
  state._compSilenceUntil = 0;
  state._compDisarmUntil = 0;
  state._compSoulLinkUntil = 0;
  state._compFrenzyUntil = 0;
  state._compDecayUntil = 0;
  state._compLastDotTick = 0;
  state._brittleUntil = 0;
  state._soulLinkUntil = 0;
  state._decayUntil = 0;
  state.talentAuras = {};
  state.talentState = { cds:{}, flags:{}, shield:0 };
  state.skillRuntime = { auras:{} };
  recomputeStats();
  const loss=Math.floor(state.gold*0.05);state.gold=Math.max(0,state.gold-loss);
  state.hp=state.hero.hpMax;state.resource=state.resourceMax;
  if(state.mode==='dungeon'){showDungeonFail();return;}
  if(state.mode==='mythic'){onMythicFail();return;}
  if(state.mode==='tower'){if(typeof onTowerFail==='function') onTowerFail(); spawnMonster(); return;}
  if(state.mode==='boss'){log('🚪 BOSS 战失败,撤退到主城','bad');state.mode='world';markDirty('map');}
  if(state.mode==='worldboss'){
    if(state._currentRareElite && typeof leaveRareEliteEncounter==='function'){
      log('💀 稀有精英挑战失败,撤回营地重整','bad');
      leaveRareEliteEncounter();
    }else{
      log('💀 世界Boss 战失败! 还可再战(CD不重置)','bad');
      if(typeof leaveWorldBoss==='function')leaveWorldBoss();else{state.mode='world';state.currentMonsters=[];}
    }
    markDirty('map','events');
    return;
  }
  spawnMonster();
}

function gainXP(amt){
  if(state.hero.lvl>=MAX_LEVEL){state.hero.xp=0;return;}
  state.hero.xp+=amt;
  while(state.hero.lvl<MAX_LEVEL&&state.hero.xp>=xpNeeded(state.hero.lvl)){
    state.hero.xp-=xpNeeded(state.hero.lvl);state.hero.lvl+=1;
    for(const k of['str','agi','int','spi','sta'])state.attrs[k]+=1;
    state.talentPoints+=1;recomputeStats();state.hp=state.hero.hpMax;
    const c=getCls();state.resource=c.resKey==='rage'?0:state.resourceMax;
    checkSkillUnlocks();log('🎉 升到 Lv.'+state.hero.lvl+'! 全属性+1 +1天赋点','good');
    markDirty('hero','shop','talents','skills','map','dungeon');
  }
  if(state.hero.lvl>=MAX_LEVEL)state.hero.xp=0;
}
function xpNeeded(lvl){if(lvl>=MAX_LEVEL)return Infinity;return Math.floor((30+lvl*lvl*5+lvl*10)*(typeof XP_CURVE_MULT==='number'?XP_CURVE_MULT:1));}
function checkSkillUnlocks(){
  const c=getCls();if(!c)return;
  for(const[key,sk]of Object.entries(c.skills)){if(sk.unlockLvl&&state.hero.lvl>=sk.unlockLvl&&!state.unlockedSkills[key]){state.unlockedSkills[key]=true;if(state.selectedSkills.length===0)state.selectedSkills.push(key);log('✨ 学会了 ['+sk.name+']','good');markDirty('skills');}}
  if(typeof passiveCheckUnlocks==='function'){passiveCheckUnlocks();markDirty('skills');}
}

/* ---------- 物品 ---------- */
let itemIdSeq=1;
/* 启动时根据现有装备/背包/dungeonState.loot 校正 id 计数器,避免新生成 id 与旧物品冲突 */
function syncItemIdSeq(){
  let maxId = 0;
  const scan = arr => { if(!arr)return; for(const it of arr) if(it && typeof it.id==='number' && it.id>maxId) maxId=it.id; };
  scan(state.inventory);
  if (state.equipped) for (const k of Object.keys(state.equipped)) scan([state.equipped[k]]);
  if (state.dungeonState && state.dungeonState.loot) scan(state.dungeonState.loot);
  itemIdSeq = maxId + 1;
}
function resolveItemTemplateStats(item){
  if(!item) return {};
  if(item._baseExtraStats) return JSON.parse(JSON.stringify(item._baseExtraStats));
  const matchEntry = entry => {
    if(!entry) return false;
    return entry.name===item.name && (entry.slot||item.slot)===item.slot && (!item.rarity || entry.rarity===item.rarity);
  };
  const scanEntries = arr => {
    if(!Array.isArray(arr)) return null;
    for(const entry of arr){
      if(matchEntry(entry)) return JSON.parse(JSON.stringify(entry.stats||{}));
    }
    return null;
  };
  const poolMatch = scanEntries(ITEM_POOLS?.[item.slot]?.[item.rarity]);
  if(poolMatch) return poolMatch;
  if(typeof DUNGEON_LOOT==='object'){
    for(const loot of Object.values(DUNGEON_LOOT)){
      if(!loot) continue;
      const trashMatch = scanEntries(loot.trash);
      if(trashMatch) return trashMatch;
      const bossMatch = scanEntries(loot.boss);
      if(bossMatch) return bossMatch;
      if(loot.bosses){
        for(const list of Object.values(loot.bosses)){
          const entryMatch = scanEntries(list);
          if(entryMatch) return entryMatch;
        }
      }
    }
  }
  return {};
}
function genName(slotKey,rarity){
  const pool=ITEM_POOLS[slotKey]?.[rarity.key];if(pool&&pool.length>0)return pool[rng(0,pool.length-1)].name;
  const wowAdj={common:['粗糙的','破旧的','简陋的','磨损的'],uncommon:['坚实的','锋利的','迅捷的','闪光的'],rare:['秘银','黑曜石','寒冰','烈焰'],epic:['苍穹','深渊','龙鳞','奥金','暮光'],legend:['萨弗隆','霜之哀伤','灰烬使者','安杜尼苏斯','埃辛诺斯']};
  return choice(wowAdj[rarity.key])+SLOT_INFO[slotKey].label;
}
function getPoolStatBonus(slotKey,rarityKey){const pool=ITEM_POOLS[slotKey]?.[rarityKey];if(pool&&pool.length>0)return pool[rng(0,pool.length-1)].stats||{};return{};}
function rollItem(maxRarity,fromLvl,dungeonKey,bossName,opts){
  const slotKey=choice(SLOT_ORDER);const slot=SLOT_INFO[slotKey];const rarity=pickRarity(maxRarity);
  const ds=state.dungeonState||state.mythicState;
  const power=(fromLvl||state.hero.lvl)+(ds?2:0);
  if(dungeonKey){
    let lootPool=[];
    if(typeof getDungeonBossLoot==='function'){
      if(bossName) lootPool=getDungeonBossLoot(dungeonKey,bossName,state.cls,{ rarityKey:maxRarity, exactRarity:!!opts?.exactRarity })||[];
      else if(ds&&state.currentMonsters[0]&&state.currentMonsters[0].isBoss&&state.currentMonsters[0].bossName) lootPool=getDungeonBossLoot(dungeonKey,state.currentMonsters[0].bossName,state.cls,{ rarityKey:maxRarity, exactRarity:!!opts?.exactRarity })||[];
      else if(typeof getDungeonTrashLoot==='function') lootPool=getDungeonTrashLoot(dungeonKey,state.cls,{ rarityKey:maxRarity, exactRarity:!!opts?.exactRarity })||[];
    } else {
      const loot=DUNGEON_LOOT[dungeonKey];
      if(loot){
        if(bossName&&loot.bosses)lootPool=loot.bosses[bossName]||loot.trash||[];
        else if(ds&&state.currentMonsters[0]&&state.currentMonsters[0].isBoss&&state.currentMonsters[0].bossName&&loot.bosses)lootPool=loot.bosses[state.currentMonsters[0].bossName]||loot.trash||[];
        else if(ds&&state.currentMonsters[0]&&state.currentMonsters[0].isBoss)lootPool=loot.boss||[];
        else lootPool=loot.trash||[];
      }
    }
    if(lootPool.length>0){
    // 池内按"品质稀有度"加权挑一件(越稀有越少出),实现"必掉、但爆哪件看各装备爆率"
    let __tw=0;for(const p of lootPool)__tw+=(p.dropWeight||RARITY.find(r=>r.key===p.rarity)?.weight||1);
    let __r=Math.random()*__tw;let pick=lootPool[lootPool.length-1];
    for(const p of lootPool){__r-=(p.dropWeight||RARITY.find(r=>r.key===p.rarity)?.weight||1);if(__r<=0){pick=p;break;}}
    const pickRarity=RARITY.find(r=>r.key===pick.rarity)||rarity;
    const poolItem={id:itemIdSeq++,slot:pick.slot||slotKey,name:pick.name,rarity:pick.rarity,rarityName:pickRarity.name,cls:pickRarity.cls,bcls:pickRarity.bcls,stats:{},sell:0,epicRaid:!!pick.epicRaid,setKey:pick.setKey,setName:pick.setName};
    return finishItem(poolItem,pick.slot||slotKey,pickRarity,power,pick.stats||{});
  }}
  const item={id:itemIdSeq++,slot:slotKey,name:genName(slotKey,rarity),rarity:rarity.key,rarityName:rarity.name,cls:rarity.cls,bcls:rarity.bcls,stats:{},sell:0};
  const poolStats=getPoolStatBonus(slotKey,rarity.key);return finishItem(item,slotKey,rarity,power,poolStats);
}
/* 生成一件“指定品质”的随机槽位装备(绕过 pickRarity 的权重),用于必爆掉落 */
function rollItemOfRarity(rarityKey,fromLvl){
  const slotKey=choice(SLOT_ORDER);const rarity=RARITY.find(r=>r.key===rarityKey)||RARITY[0];
  const power=(fromLvl||state.hero.lvl);
  const item={id:itemIdSeq++,slot:slotKey,name:genName(slotKey,rarity),rarity:rarity.key,rarityName:rarity.name,cls:rarity.cls,bcls:rarity.bcls,stats:{},sell:0};
  const poolStats=getPoolStatBonus(slotKey,rarity.key);return finishItem(item,slotKey,rarity,power,poolStats);
}
function finishItem(item,slotKey,rarity,power,extraStats){
  item.slot=slotKey;
  item.stats={};
  item._rollSlot=slotKey;
  item._rollPower=power;
  item._baseExtraStats=JSON.parse(JSON.stringify(extraStats||{}));
  if(typeof normalizeItemNameForSlot==='function') item.name=normalizeItemNameForSlot(item);
  if(!item._baseName) item._baseName=item.name;
  const slot=SLOT_INFO[slotKey];
  const lvlBonus=1+power*0.01; // 等级越高属性越多(2026-06-16 0.02→0.01:压平后期二次膨胀)
  const baseVal={atk:Math.floor((3+power*1.0)*lvlBonus),def:Math.floor((2+power*0.55)*lvlBonus),hp:Math.floor((12+power*5)*lvlBonus),crit:1+power*0.1,critd:6+power*0.6,reg:1+power*0.2,str:Math.floor((1.5+power*0.4)*lvlBonus),agi:Math.floor((1.5+power*0.4)*lvlBonus),int:Math.floor((1.5+power*0.4)*lvlBonus),spi:Math.floor((1+power*0.35)*lvlBonus),sta:Math.floor((1.5+power*0.4)*lvlBonus),leech:0.5+power*0.06,vers:0.5+power*0.06,haste:0.5+power*0.06,dodge:0.5+power*0.06};
  const primary=slot.mainStat;let pv=baseVal[primary]*rarity.mult;
  item.stats[primary]=Math.max(1,Math.floor(pv));
  const bonusCount={common:1,uncommon:2,rare:3,epic:4,legend:5}[rarity.key];
  // 吸血/全能/暴击/暴伤/极速/精通/闪避已从常规副属池移除,改为下方"惊喜副属性"
  const possible=['atk','def','hp','reg','str','agi','int','spi','sta'].filter(k=>k!==primary);
  for(let i=0;i<bonusCount;i++){const k=possible.splice(rng(0,possible.length-1),1)[0];if(!k)break;item.stats[k]=Math.max(1,Math.floor(baseVal[k]*0.7*rarity.mult));}
  // 副属性只能来自下方"惊喜roll",不从命名装/池子的预设 stats 注入
  const SURPRISE_KEYS=['crit','critd','critdPct','leech','vers','haste','mastery','dodge'];
  if(extraStats){for(const[k,v]of Object.entries(extraStats)){if(SURPRISE_KEYS.includes(k))continue;item.stats[k]=(item.stats[k]||0)+Math.max(1,Math.floor(baseVal[k]*0.5*v*rarity.mult));}}
  // ---- 惊喜副属性 ----
  // 仅蓝装(rare)以上才可能出现,各自独立低概率,不占常规副属分配(额外附加),可同时出现也可能都不出现。
  // 数值随品质 蓝/紫/橙:吸血/全能/极速/暴击/精通/闪避 = 1/2/4;暴伤倍率更高 = 3/6/12。
  const SURPRISE_CHANCE=0.15;
  const SURPRISE={leech:{rare:1,epic:2,legend:4},vers:{rare:1,epic:2,legend:4},haste:{rare:1,epic:2,legend:4},mastery:{rare:1,epic:2,legend:4},dodge:{rare:1,epic:2,legend:4},crit:{rare:1,epic:2,legend:3},critd:{rare:3,epic:6,legend:12}};
  for(const sk in SURPRISE){const v=SURPRISE[sk][rarity.key];if(v&&Math.random()<SURPRISE_CHANCE)item.stats[sk]=(item.stats[sk]||0)+v;}
  if(item.epicRaid){
    const mult=item.rarity==='legend'?1.18:1.28;
    for(const [k,v] of Object.entries(item.stats||{})){
      if(typeof v==='number') item.stats[k]=Math.max(1,Math.floor(v*mult));
    }
  }
  // 安全帽:暴击/暴伤/极速/闪避上限(防止任何路径溢出)
  if(item.stats.crit>4)item.stats.crit=4;
  if(item.stats.critd>12)item.stats.critd=12;
  if(item.stats.haste>4)item.stats.haste=4;
  if(item.stats.dodge>4)item.stats.dodge=4;
  item.reqLvl=Math.max(1,Math.floor(power*0.9));item.sell=Math.floor(10*rarity.mult*(1+power*0.5));
  if(typeof enhanceItemOnCreate==='function') enhanceItemOnCreate(item,rarity,power);
  return item;
}
function addToInventory(item){
  if(typeof syncItemIdentity==='function') syncItemIdentity(item);
  if(item.mythicUnique){state.inventory.push(item);markDirty('inventory');log('🌟 专属传说已入包: '+item.name+' (背包'+state.inventory.length+'件)','loot');return;}
  if(state.autoSellRarity){const itemIdx=RARITY.findIndex(r=>r.key===item.rarity);const sellIdx=RARITY.findIndex(r=>r.key===state.autoSellRarity);if(itemIdx<=sellIdx){state.gold+=item.sell;return;}}
  if(state.inventory.length>=40){state.gold+=item.sell;log('📦 背包已满,自动出售 '+item.name+' +'+item.sell+'💰','info');return;}
  state.inventory.push(item);markDirty('inventory');
}
function equipItem(itemId){const idx=state.inventory.findIndex(i=>i.id===itemId);if(idx<0)return;const item=state.inventory[idx];if(typeof syncItemIdentity==='function') syncItemIdentity(item);if(item.reqLvl&&state.hero.lvl<item.reqLvl){log('需要等级 Lv.'+item.reqLvl,'bad');return;}const prev=state.equipped[item.slot];state.equipped[item.slot]=item;state.inventory.splice(idx,1);if(prev)state.inventory.push(prev);recomputeStats();log('🎽 装备了 '+item.name,'good');markDirty('inventory','equipment','hero');}
function unequipItem(slotKey){const it=state.equipped[slotKey];if(!it)return;if(state.inventory.length>=40){log('背包已满','bad');return;}state.inventory.push(it);delete state.equipped[slotKey];recomputeStats();markDirty('inventory','equipment','hero');}
function sellItem(itemId){const idx=state.inventory.findIndex(i=>i.id===itemId);if(idx<0)return;const item=state.inventory[idx];state.gold+=item.sell;state.inventory.splice(idx,1);markDirty('inventory');}
function sellAllBelow(level){const levelIdx=['common','uncommon','rare','epic','legend'].indexOf(level);let total=0,n=0;state.inventory=state.inventory.filter(i=>{const idx=['common','uncommon','rare','epic','legend'].indexOf(i.rarity);if(idx<=levelIdx){total+=i.sell;n++;return false;}return true;});state.gold+=total;if(n)log('💰 出售 '+n+' 件 +'+total,'info');markDirty('inventory');}

/* ---------- 技能 ---------- */
let casting=null;
let bossCasting=null;
/* 切换角色或重置时调用,清理 combat 模块变量,避免下个角色继承上一个的状态 */
function resetCombatState(){
  casting=null;
  bossCasting=null;
  lastHeroAtk=0;lastMonAtk=0;lastRegen=0;dotTick=0;lastBossSkill=0;bossSkillIdx=0;burnTick=0;
  if(state){
    state.heroDebuffs={};state.heroStunUntil=0;state.heroSilenceUntil=0;state.heroDisarmUntil=0;
    state._compDebuffs={};state._compBuffs={};state._compBarrier=0;state._compStunUntil=0;state._compSilenceUntil=0;state._compDisarmUntil=0;state._compSoulLinkUntil=0;state._compFrenzyUntil=0;state._compDecayUntil=0;state._compLastDotTick=0;
    state._brittleUntil=0;state._soulLinkUntil=0;state._decayUntil=0;
    state.talentAuras={};state.talentState={cds:{},flags:{},shield:0};state.skillRuntime={auras:{}};
  }
  if(typeof lastCompAtk==='number')lastCompAtk=0;
  if(typeof lastCompSkill==='number')lastCompSkill=0;
  if(typeof compSkillIdx==='number')compSkillIdx=0;
  if(typeof lastCompRegen==='number')lastCompRegen=0;
  if(state){state._compHp=null;state._compDownUntil=0;}   // 随从血量/阵亡态:下个角色重新满血
  if(typeof resetDmgStats==='function')resetDmgStats();
  compSkillCd={};
  const cb=document.getElementById('cast-bar-wrap');if(cb)cb.style.visibility='hidden';
}
function hasteFactor(){return 1+((state.hero&&state.hero.haste)||0)/100;}        // 极速倍率(>=1):提攻速/读条/CD
function castSpeedMul(){return (state.battleSpeed||1)*hasteFactor();}             // 读条速度&技能CD 提速 = 战斗倍速 × 极速
function castDmgBonus(sk){return 1+((sk&&sk.castTime)||0)*0.3;}                   // 法系补偿:带读条的技能按读条时长加伤(读条=投资,换更高爆发)
function getCastTime(sk){if(sk.type==='interrupt')return 0;if(sk.castTime!==undefined)return sk.castTime;return 0;}
function cancelHeroCast(){
  if(!casting) return;
  casting = null;
  const cb = document.getElementById('cast-bar-wrap');
  if(cb) cb.style.visibility = 'hidden';
}
function getSkillCd(sk){let base;if(sk.cd)base=sk.cd;else if(sk.type==='buff')base=40;else if(sk.type==='heal')base=16;else{const mul=sk.mul||1;if(mul>=8)base=35;else if(mul>=6)base=24;else if(mul>=5)base=18;else if(mul>=4)base=13;else if(mul>=3)base=9;else base=7;}if(state.hero.cdReduction>0)base=Math.max(3,Math.floor(base*(1-state.hero.cdReduction/100)));return base;}
function startCast(skillKey,manual){
  const c=getCls();const sk=c.skills[skillKey];if(!sk)return;
  const now=Date.now();
  if(state.heroSilenceUntil>now){if(manual)log('你被沉默了,无法施法','bad');return;}
  const castTime=getCastTime(sk);if(castTime<=0){castSkill(skillKey,manual);return;}
  if(state.skillCooldowns[skillKey]&&state.skillCooldowns[skillKey]>now){if(manual)log(sk.name+' 冷却中','bad');return;}
  let cost=sk.mp;if(state.hero.costReduction>0)cost=Math.max(1,Math.floor(sk.mp*(1-state.hero.costReduction/100)));
  if(state.resource<cost){if(manual)log(c.resource+'不足','bad');return;}
  casting={skillKey,startTime:now,duration:castTime*1000/castSpeedMul(),manual:!!manual};log('施放 '+sk.name+'...','info');   // 读条受 倍速×极速 影响
}
function skillEffects(wc,mon,taken,now,opts){
  const target = opts?.target === 'companion' ? 'companion' : 'hero';
  const targetEl = target === 'companion' ? $('comp-mini') : $('hero-emoji');
  const applyDebuff = target === 'companion' ? applyCompanionDebuff : applyHeroDebuff;
  const enemyName = mon?.bossName || mon?.name || '敌人';
  if(wc.dot){applyDebuff('burn',6000,{dps:Math.max(1,Math.floor(taken*0.12))});log('☠️ '+enemyName+(wc.icon||'')+(target==='companion'?'让随从中毒了!':'让你中毒了!'),'bad');}
  if(wc.slow){applyDebuff('chill',5000);log('❄️ '+enemyName+(wc.icon||'')+(target==='companion'?'减速了随从!':'减速了你!'),'bad');}
  if(wc.stun){
    const dur=wc.stun===true?2000:wc.stun;
    if(target==='companion') state._compStunUntil=now+dur;
    else { state.heroStunUntil=now+dur; cancelHeroCast(); }
    showFloat(targetEl,'💫眩晕','#fde047');log('💫 '+enemyName+(wc.icon||'')+(target==='companion'?'击晕了随从!':'击晕了你!'),'bad');
  }
  if(wc.silence){const dur=wc.silence===true?4000:wc.silence;if(target==='companion')state._compSilenceUntil=now+dur;else{state.heroSilenceUntil=now+dur;cancelHeroCast();}applyDebuff('silence',dur);log('🔇 '+enemyName+(wc.icon||'')+(target==='companion'?'沉默了随从!':'沉默了你!'),'bad');}
  if(wc.disarm){const dur=wc.disarm===true?3000:wc.disarm;if(target==='companion')state._compDisarmUntil=now+dur;else state.heroDisarmUntil=now+dur;applyDebuff('disarm',dur);log('⚔️❌ '+enemyName+(wc.icon||'')+(target==='companion'?'缴械了随从!':'缴械了你!'),'bad');}
  if(wc.fear){const dur=wc.fear===true?2500:wc.fear;if(target==='companion')state._compStunUntil=now+dur;else{state.heroStunUntil=now+dur;cancelHeroCast();}applyDebuff('fear',dur);showFloat(targetEl,'👻恐惧','#a78bfa');log('👻 '+enemyName+(wc.icon||'')+(target==='companion'?'恐惧了随从!':'恐惧了你!'),'bad');}
  if(wc.freeze){const dur=wc.freeze===true?2500:wc.freeze;if(target==='companion')state._compStunUntil=now+dur;else{state.heroStunUntil=now+dur;cancelHeroCast();}applyDebuff('freeze',dur);log('🧊 '+enemyName+(wc.icon||'')+(target==='companion'?'冻结了随从!':'冻结了你!'),'bad');}
  if(wc.cripple){applyDebuff('cripple',5000);log('🦿 '+enemyName+(wc.icon||'')+(target==='companion'?'残废了随从!':'残废了你!'),'bad');}
  if(wc.decay){applyDebuff('decay',8000);log('👴 '+enemyName+(wc.icon||'')+(target==='companion'?'让随从衰老了!':'让你衰老了!'),'bad');}
  if(wc.wither){
    if(target==='companion'){
      const st = computeCompanionStats();
      const wdmg=Math.max(1,Math.floor((state._compHp || st?.hpMax || 1)*0.15));
      applyCompanionDamage(wdmg,mon,{label:t=>'🥀-'+t,color:'#9ca3af',now});
    }else{
      const wdmg=Math.max(1,Math.floor(state.hp*0.15));
      applyHeroDamage(wdmg,mon,{label:t=>'🥀-'+t,color:'#9ca3af',now});processTalentLowHp(mon,now);
    }
    log('🥀 '+enemyName+(wc.icon||'')+(target==='companion'?'枯萎了随从的生命!':'枯萎了你的生命!'),'bad');
  }
  if(wc.manaDrain && target==='hero'){state.resource=Math.max(0,state.resource-(wc.manaDrain===true?50:wc.manaDrain));log('💧 '+enemyName+(wc.icon||'')+'吸取了你的能量!','bad');}
  if(wc.bomb){
    const bdmg=Math.floor((target==='companion'?(computeCompanionStats()?.hpMax||state.hero.hpMax):state.hero.hpMax)*0.3);
    setTimeout(()=>{
      if(target==='companion'){
        if(companionTargetable()) applyCompanionDamage(bdmg,mon,{label:t=>'💣-'+t,color:'#ef4444',now:Date.now()});
      }else if(state.hp>0){
        applyHeroDamage(bdmg,mon,{label:t=>'💣-'+t,color:'#ef4444',now:Date.now()});processTalentLowHp(mon,Date.now());
      }
      log('💣 '+enemyName+'的自爆印记爆炸了!','bad');
    },5000);
    log('💣 '+enemyName+(wc.icon||'')+(target==='companion'?'给随从施加了自爆印记(5秒后爆炸)!':'给你施加了自爆印记(5秒后爆炸)!'),'bad');
  }
  if(wc.plague){applyDebuff('burn',6000,{dps:Math.max(1,Math.floor(taken*0.15))});log('🦠 '+enemyName+(wc.icon||'')+(target==='companion'?'散播了暗影瘟疫给随从!':'散播了暗影瘟疫!'),'bad');}
  if(wc.bleed){applyDebuff('burn',8000,{dps:Math.max(1,Math.floor(taken*0.1))});log('🩸 '+enemyName+(wc.icon||'')+(target==='companion'?'让随从流血了!':'让你流血了!'),'bad');}
  if(wc.brittle){applyDebuff('brittle',6000);log('💥 '+enemyName+(wc.icon||'')+(target==='companion'?'让随从变得易爆(下次受伤翻倍)!':'让你变得易爆(下次受伤翻倍)!'),'bad');}
  if(wc.soulDrain){
    mon._trickLeech=now+8000;
    mon._trickLeechPct=Math.max(mon._trickLeechPct||0, 30);
    setMonsterTrickAura(mon,'leech',wc,mon._trickLeech,{name:wc.name||'灵魂虹吸',desc:wc.desc||'短时间内获得吸血'});
    log('🧛 '+enemyName+(wc.icon||'')+(target==='companion'?'开始吸取随从的精力!':'开始吸取你的精力!'),'bad');
  }
  if(wc.soulLink){if(target==='companion')state._compSoulLinkUntil=now+8000;else state._soulLinkUntil=now+8000;applyDebuff('soulLink',8000);log('🔗 '+enemyName+(wc.icon||'')+(target==='companion'?'链接了随从的灵魂!':'链接了你的灵魂!'),'bad');}
  if(wc.revenge){applyDebuff('vulnerable',6000);log('🎯 '+enemyName+(wc.icon||'')+(target==='companion'?'标记了随从!':'标记了你!'),'bad');}
  if(wc.frenzy){
    if(target==='companion') state._compFrenzyUntil=now+8000;
    else { state.hero.atk=Math.floor(state.hero.atk*1.3);state.hero.def=Math.floor(state.hero.def*0.5);setTimeout(()=>recomputeStats(),8100); }
    log('🤯 '+enemyName+(wc.icon||'')+(target==='companion'?'让随从陷入了狂乱!':'让你陷入了狂乱!'),'bad');
  }
  if(wc.decay2){if(target==='companion')state._compDecayUntil=now+8000;else state._decayUntil=now+8000;applyDebuff('decay2',8000);log('🌑 '+enemyName+(wc.icon||'')+(target==='companion'?'凋零了随从的回复能力!':'凋零了你的回复能力!'),'bad');}
  if(wc.mirror){log('🪞 '+enemyName+(wc.icon||'')+(target==='companion'?'制造了随从的镜像!':'制造了你的镜像!'),'bad');}
  if(wc.weaken){applyDebuff('weaken',5000);log('💔 '+enemyName+(wc.icon||'')+(target==='companion'?'削弱了随从!':'削弱了你!'),'bad');}
  if(wc.sunder){applyDebuff('vulnerable',5000);log('🩸 '+enemyName+(wc.icon||'')+(target==='companion'?'打出了随从的易伤!':'打出了易伤!'),'bad');}
  if(wc.spdBuff){mon.spdBuffUntil=now+8000;setMonsterTrickAura(mon,'spd',wc,mon.spdBuffUntil,{desc:wc.desc||'攻速提升'});log('⚡ '+enemyName+'攻速提升了!','bad');}
  if(opts?.allowFallback!==false && !wc.dot&&!wc.slow&&!wc.stun&&!wc.weaken&&!wc.sunder&&!wc.silence&&!wc.disarm&&!wc.fear&&!wc.freeze&&!wc.cripple&&!wc.decay&&!wc.wither&&!wc.manaDrain&&!wc.bomb&&!wc.plague&&!wc.bleed&&!wc.brittle&&!wc.soulDrain&&!wc.soulLink&&!wc.revenge&&!wc.frenzy&&!wc.decay2&&!wc.mirror)applyDebuff('vulnerable',5000);
  if(target==='companion') markDirty('companion');
}
function tickCast(now){
  // 英雄施法
  if(casting){
    const elapsed=now-casting.startTime;const pct=Math.min(100,elapsed/casting.duration*100);
    const remaining=Math.max(0,Math.ceil((casting.duration-elapsed)/1000));
    const c=getCls();const sk=c?.skills[casting.skillKey||''];
    $('cast-bar-wrap').style.visibility='visible';
    $('cast-name').textContent=(sk?.icon||'')+' '+(sk?.name||'施法中');
    $('b-cast').style.background='linear-gradient(90deg,#fbbf24,#f59e0b)';
    $('cast-time').textContent=remaining>0?remaining+'s':'';
    $('b-cast').style.width=pct+'%';
    if(elapsed>=casting.duration){
      $('cast-bar-wrap').style.visibility='hidden';
      const wasCasting=casting;casting=null;
      castSkill(wasCasting.skillKey,wasCasting.manual);
    }
  }
  // Boss施法
  if(bossCasting){
    if(!$('mon-emoji') && typeof renderMonList === 'function') renderMonList();
    const elapsed=now-bossCasting.startTime;const pct=Math.min(100,elapsed/bossCasting.duration*100);
    const remaining=Math.max(0,Math.ceil((bossCasting.duration-elapsed)/1000));
    $('cast-bar-wrap').style.visibility='visible';
    $('cast-name').textContent='💀 '+(bossCasting.bossName||'BOSS')+' - '+(bossCasting.icon||'');
    $('b-cast').style.background='linear-gradient(90deg,#ef4444,#dc2626)';
    $('cast-time').textContent=remaining>0?remaining+'s':'';
    $('b-cast').style.width=pct+'%';
    if(elapsed>=bossCasting.duration){
      $('cast-bar-wrap').style.visibility='hidden';
      const bc=bossCasting;bossCasting=null;const mon=state.currentMonsters[0];if(!mon||mon.hp<=0)return;
      const critRate = monsterCritRate(mon, now);
      if(bc.type==='heal'){const h=Math.floor(mon.hpMax*(bc.heal||0.2));mon.hp=Math.min(mon.hpMax,mon.hp+h);showMonsterFloat(mon,'💚+'+h,'#6ee7b7');}
      else if(bc.type==='buff'||bc.type==='support'||bc.type==='summon'){
        log(`💀 ${mon.bossName || mon.name} 释放了 ${bc.name}!`,'bad');
        showMonsterFloat(mon, (bc.icon || '✨') + bc.name + '!', '#fda4af');
        applyMonsterSupportSkill(mon, bc, now, { announce:false });
      } else{
        log(`💀 ${mon.bossName || mon.name} 释放了 ${bc.name}!`,'bad');
        showMonsterFloat(mon, (bc.icon || '✨') + bc.name + '!', '#fda4af');
        const mul=bc.mul||2;
        const rawAtk=Math.floor(monsterAttackValue(mon, now)*mul);
        if(bc.aoe){
          // AOE: 同时命中英雄和随从
          let taken=calcDmg(rawAtk,heroDefAgainst(mon),critRate,mon.critMult?mon.critMult*100:150,bc.alwaysCrit,state.hero.lvl,mon.lvl).dmg;
          taken=resolveMonsterDamageTaken(mon,taken,{aoe:true});
          taken=applyHeroDamage(taken,mon,{label:t=>'💀'+bc.icon+'-'+t,color:'#ff4444',now});
          processTalentLowHp(mon,now);
          if(typeof passiveOnTakeDamage==='function')passiveOnTakeDamage(mon,taken);
          if(bc.lifeSteal)mon.hp=Math.min(mon.hpMax,mon.hp+Math.floor(taken*bc.lifeSteal));
          skillEffects(bc,mon,taken,now);
          if(companionTargetable()){
            const cst=computeCompanionStats();
            const cd=calcDmg(rawAtk,cst?cst.def:mon.def,critRate,mon.critMult?mon.critMult*100:150,bc.alwaysCrit,state.hero.lvl,mon.lvl);
            const ct=applyCompanionDamage(cd.dmg,mon,{label:t=>'💀'+bc.icon+'-'+t,color:'#ff9aa0',now});
            skillEffects(bc,mon,ct,now,{target:'companion'});}
          if(state.hp<=0)onHeroDeath();
        }else if(companionTargetable()&&Math.random()<compAggroChance()){
          const cst=computeCompanionStats();
          const d2=calcDmg(rawAtk,cst?cst.def:mon.def,critRate,mon.critMult?mon.critMult*100:150,bc.alwaysCrit,state.hero.lvl,mon.lvl);
          const ct=applyCompanionDamage(d2.dmg,mon,{label:t=>'💀'+bc.icon+'-'+t,color:'#ff9aa0',now});
          if(bc.lifeSteal)mon.hp=Math.min(mon.hpMax,mon.hp+Math.floor(d2.dmg*bc.lifeSteal));
          log('🛡️ 随从替你承受了 '+bc.icon+'!','info');
          skillEffects(bc,mon,ct,now,{target:'companion'});
        }else{
          let taken=calcDmg(rawAtk,heroDefAgainst(mon),critRate,mon.critMult?mon.critMult*100:150,bc.alwaysCrit,state.hero.lvl,mon.lvl).dmg;
          taken=resolveMonsterDamageTaken(mon,taken);
          taken=applyHeroDamage(taken,mon,{label:t=>'💀'+bc.icon+'-'+t,color:'#ff4444',now});
          processTalentLowHp(mon,now);
          if(typeof passiveOnTakeDamage==='function')passiveOnTakeDamage(mon,taken);
          if(bc.lifeSteal)mon.hp=Math.min(mon.hpMax,mon.hp+Math.floor(taken*bc.lifeSteal));
          skillEffects(bc,mon,taken,now);
          if(state.hp<=0)onHeroDeath();}}}}
}
function castSkill(skillKey,manual){
  const c=getCls();const sk=c.skills[skillKey];if(!sk)return;
  const ai=skillAiMeta(skillKey, sk);
  if(!state.unlockedSkills[skillKey]){if(manual)log('技能未解锁','bad');return;}
  if(sk.type==='interrupt'){if(manual)doInterrupt();const cdSec=sk.cd||5;state.skillCooldowns[skillKey]=Date.now()+cdSec*1000/castSpeedMul();return;}
  const now=Date.now();
  if(state.skillCooldowns[skillKey]&&state.skillCooldowns[skillKey]>now){if(manual){const left=Math.ceil((state.skillCooldowns[skillKey]-now)/1000);log(sk.name+' 冷却中('+left+'秒)','bad');}return;}
  let cost=sk.mp;if(state.hero.costReduction>0)cost=Math.max(1,Math.floor(sk.mp*(1-state.hero.costReduction/100)));
  if(sk.consumeRage){cost=Math.min(state.resource,10);}   // 斩杀:至少需10怒,但会消耗全部
  if(state.resource<cost){if(manual)log(c.resource+'不足','bad');return;}
  if(!sk.consumeRage)state.resource-=cost;   // 斩杀在伤害计算时消耗全部怒气
  const cdSec=getSkillCd(sk);state.skillCooldowns[skillKey]=now+cdSec*1000/castSpeedMul();   // CD 受 倍速×极速 影响
  const talentForceCrit = consumeNextSkillCrit(sk);
  if(sk.type==='dmg'){const mon=state.currentMonsters[0];if(!mon)return;
    // 斩杀:消耗所有怒气,每点怒气+1%伤害
    let rageBonus=1;
    if(sk.consumeRage&&c.resKey==='rage'&&state.resource>0){rageBonus=1+state.resource/100;log('💀 消耗 '+state.resource+' 怒气,伤害 +'+(state.resource)+'%','good');state.resource=0;}
    const isAOE=((sk.aoe || sk.mul>=4)&&getAliveMonsters().length>1);
    let dmgDone=0;
    const cb=castDmgBonus(sk)*masteryDmgMult()*rageBonus;   // 读条技能补偿 + 精通 + 怒气
    const baseForceCrit = sk.alwaysCrit || talentForceCrit;
    if(isAOE){
      for(const target of state.currentMonsters){
        if(target.hp<=0) continue;
        const rt=calcSkillRuntimeBonus(skillKey, sk, target, now);
        const forceCrit = baseForceCrit || rt.forceCrit;
        const d=calcDmg(state.hero.atk*sk.mul*cb*talentDamageMult(target,skillKey)*rt.mult,heroTargetDef(target),state.hero.crit,state.hero.critd,forceCrit,target.lvl,state.hero.lvl);
        let dd=d.dmg;
        {const dr=monsterDamageReduction(target, now);if(dr)dd=Math.max(1,Math.floor(dd*(1-dr)));}
        target.hp-=dd;dmgDone+=dd;trackDmg('hero',dd,d.crit,sk.name);showMonsterFloat(target,(sk.icon||'✨')+'-'+dd,d.crit?'#fbbf24':'#a335ee',{variant:d.crit?'crit':'hit',scale:d.crit?1.14:1,important:true});
        if(d.crit||forceCrit)processTalentOnCrit(target,dd,{skillKey});
        if(sk.lifeSteal){const heal=Math.floor(dd*sk.lifeSteal);healHeroAmount(heal,'🩸','#6ee7b7');}
        if(sk.slow)target.slowUntil=Date.now()+4000;
        if(sk.debuff==='sunder'){target.sunderUntil=Date.now()+15000;}
        const applyState=(!skillFxMeta(skillKey, sk).applyTargetState && ai.applyTargetState && !['dot','slow','sunder'].includes(ai.applyTargetState)) ? ai.applyTargetState : null;
        if(applyState) applyMonsterState(target, applyState, ai.stateDurationMs || 10000);
        applySkillHitEffects(skillKey, sk, target, dd, { now, isAOE:true });
      }
      log(sk.name+'! AOE '+dmgDone+' 总伤害','good');
    }
    else if(mon.dodgeChance&&Math.random()<mon.dodgeChance){showMonsterFloat(mon,'闪避','#9ca3af',{variant:'avoid'});log(sk.name+' 被 '+mon.name+' 闪避!','bad');}
    else{
      const rt=calcSkillRuntimeBonus(skillKey, sk, mon, now);
      const forceCrit = baseForceCrit || rt.forceCrit;
      const d=calcDmg(state.hero.atk*sk.mul*cb*talentDamageMult(mon,skillKey)*rt.mult,heroTargetDef(mon),state.hero.crit,state.hero.critd,forceCrit,mon.lvl,state.hero.lvl);
      let dd=d.dmg;
      {const dr=monsterDamageReduction(mon, now);if(dr)dd=Math.max(1,Math.floor(dd*(1-dr)));}
      mon.hp-=dd;dmgDone=dd;trackDmg('hero',dd,d.crit,sk.name);
      showMonsterFloat(mon,(sk.icon||'✨')+'-'+dd,(d.crit||forceCrit)?'#fbbf24':'#a335ee',{variant:(d.crit||forceCrit)?'crit':'hit',scale:(d.crit||forceCrit)?1.16:1,important:true});
      log(sk.name+'! '+dd+' 伤害'+(forceCrit?' (必暴)':''),'good');
      if(d.crit||forceCrit)processTalentOnCrit(mon,dd,{skillKey});
      if(sk.lifeSteal){const heal=Math.floor(dmgDone*sk.lifeSteal);healHeroAmount(heal,'🩸','#6ee7b7');}
      if(sk.slow)mon.slowUntil=Date.now()+4000;
      if(sk.debuff==='sunder'){mon.sunderUntil=Date.now()+15000;}   // 破甲:15秒防御-30%
      const applyState=(!skillFxMeta(skillKey, sk).applyTargetState && ai.applyTargetState && !['dot','slow','sunder'].includes(ai.applyTargetState)) ? ai.applyTargetState : null;
      if(applyState) applyMonsterState(mon, applyState, ai.stateDurationMs || 10000);
      applySkillHitEffects(skillKey, sk, mon, dmgDone, { now, isAOE:false });
    }
    processTalentAfterSkill(skillKey, sk, mon, dmgDone, { cost });
  }else if(sk.type==='heal'){
    const healMult=1+(state.hero.healBonus||0)/100;
    const h=Math.floor(state.hero.hpMax*sk.heal*healMult);
    const hr=healHeroAmount(h, sk.icon, '#6ee7b7', 'hero', sk.name);
    log(sk.name+'! 恢复 '+hr.applied+' 生命','good');
    applySkillHealEffects(skillKey, sk, hr.applied, hr.overheal);
    processTalentAfterHeal(skillKey, hr.applied, hr.overheal);
    processTalentAfterSkill(skillKey, sk, null, hr.applied, { overheal:hr.overheal, cost });
  }
  else if(sk.type==='buff'){const dur=sk.duration+(state.hero.buffDuration||0)*1000;state.buffs[sk.buff]=Date.now()+dur;recomputeStats();log(sk.name+'!','good');}
  if(sk.type==='buff') processTalentAfterSkill(skillKey, sk, state.currentMonsters[0] || null, 0, { cost });
}
function doInterrupt(){if(!bossCasting){log('没有正在施放的法术','info');return;}const bossName=bossCasting.bossName||'BOSS';log('🦶 打断了 '+bossName+' 的 '+bossCasting.icon+' 施法!','good');$('cast-bar-wrap').style.visibility='hidden';bossCasting=null;}

/* ---------- 随从 ---------- */
let lastCompAtk=0,lastCompSkill=0,compSkillIdx=0,lastCompRegen=0;
/* ---------- 伤害统计(战斗日志下面的伤害条) ---------- */
let dmgStats={hero:0,comp:0,start:0,last:0,heroMax:0,compMax:0,heroCrits:0,compCrits:0,heroHits:0,compHits:0,heroHeal:0,compHeal:0,heroHealMax:0,compHealMax:0,heroHealSkills:{},compHealSkills:{},kills:0,heroSkills:{},compSkills:{}};
function trackDmg(src,amt,isCrit,skillLabel){amt=Math.floor(amt||0);if(amt<=0)return;const t=Date.now();if(!dmgStats.start)dmgStats.start=t;dmgStats.last=t;dmgStats[src]=(dmgStats[src]||0)+amt;const maxKey=src==='hero'?'heroMax':'compMax';if(amt>dmgStats[maxKey])dmgStats[maxKey]=amt;const hitKey=src==='hero'?'heroHits':'compHits';dmgStats[hitKey]=(dmgStats[hitKey]||0)+1;if(isCrit){const critKey=src==='hero'?'heroCrits':'compCrits';dmgStats[critKey]=(dmgStats[critKey]||0)+1;}const cleanLabel=normalizeTrackedSkillLabel(skillLabel);if(cleanLabel){const skKey=src==='hero'?'heroSkills':'compSkills';dmgStats[skKey][cleanLabel]=(dmgStats[skKey][cleanLabel]||0)+amt;}}
function trackHeal(src,amt,skillLabel){amt=Math.floor(amt||0);if(amt<=0)return;const t=Date.now();if(!dmgStats.start)dmgStats.start=t;dmgStats.last=t;const totalKey=src==='hero'?'heroHeal':'compHeal';const maxKey=src==='hero'?'heroHealMax':'compHealMax';const skKey=src==='hero'?'heroHealSkills':'compHealSkills';dmgStats[totalKey]=(dmgStats[totalKey]||0)+amt;if(amt>(dmgStats[maxKey]||0))dmgStats[maxKey]=amt;const cleanLabel=normalizeTrackedSkillLabel(skillLabel);if(cleanLabel)dmgStats[skKey][cleanLabel]=(dmgStats[skKey][cleanLabel]||0)+amt;}
function trackKill(){dmgStats.kills=(dmgStats.kills||0)+1;}
function resetDmgStats(){dmgStats={hero:0,comp:0,start:0,last:0,heroMax:0,compMax:0,heroCrits:0,compCrits:0,heroHits:0,compHits:0,heroHeal:0,compHeal:0,heroHealMax:0,compHealMax:0,heroHealSkills:{},compHealSkills:{},kills:0,heroSkills:{},compSkills:{}};if(typeof markDirty==='function')markDirty('stage');}
let compSkillCd={};   // 随从每个技能的独立冷却就绪时间戳(键=技能下标;_owner 记录当前随从,换随从自动重置)
const COMP_SKILL_DEFAULT_CD=8;   // 随从技能默认CD(秒,技能未写 cd 时)
const COMPANION_COMBAT_QUALITY = { white:0.74, green:0.96, blue:1.18, purple:1.37, orange:1.51 };
const COMPANION_ROLE_PROFILE = {
  tank: { atk:0.65, def:1.30, hp:0.68, spd:0.72, reg:0.60, critd:0.78 },
  dps:  { atk:0.90, def:0.80, hp:0.52, spd:0.75, reg:0.42, critd:0.92 },
  heal: { atk:0.65, def:0.90, hp:0.58, spd:0.74, reg:0.58, critd:0.82 },
};
const COMPANION_STAR_GROWTH = 0.15;   // 每星成长
const COMPANION_SKILL_DMG_BONUS = 1.43;  // 随从技能伤害全局加成
const COMPANION_HEAL_SCALE = 1.25;        // 随从治疗统一收口
function companionSkillCdLeft(i){ return Math.max(0, ((compSkillCd&&compSkillCd[i])||0) - Date.now()); }   // 供 UI 显示剩余CD(毫秒)
function getActiveCompanion(){if(state.activeCompanion<0||!state.companions[state.activeCompanion])return null;return state.companions[state.activeCompanion];}
function companionSignature(tpl){ return tpl?.signature || null; }
function notifyCompanionSignature(sig, tpl, text, now){
  if(!sig || !tpl) return;
  if(!state._compSignatureNoticeAt) state._compSignatureNoticeAt = {};
  const key = `${tpl.key}:${sig.name}:${text}`;
  if((state._compSignatureNoticeAt[key] || 0) > now) return;
  state._compSignatureNoticeAt[key] = now + 5000;
  log(`${tpl.emoji || '🐾'} ${tpl.name} 触发专属技 ${sig.icon || '✨'} ${sig.name}${text ? ' · ' + text : ''}`,'good');
}
function companionSignatureSkill(tpl){
  const sig = companionSignature(tpl);
  if(!sig || sig.mode === 'passive') return null;
  return Object.assign({_signature:true, cd:sig.cd||18}, sig);
}
function applyCompanionSignatureStats(stats, tpl){
  const sig = companionSignature(tpl);
  if(!sig || sig.mode !== 'passive') return stats;
  if(sig.atkMul) stats.atk = Math.floor(stats.atk * sig.atkMul);
  if(sig.defMul) stats.def = Math.floor(stats.def * sig.defMul);
  if(sig.hpMul) stats.hpMax = Math.floor(stats.hpMax * sig.hpMul);
  if(sig.spdMul) stats.spd = +(stats.spd * sig.spdMul).toFixed(2);
  if(sig.regMul) stats.reg = Math.max(1, Math.floor(stats.reg * sig.regMul));
  if(sig.critAdd) stats.crit += sig.critAdd;
  if(sig.critdAdd) stats.critd += sig.critdAdd;
  return stats;
}
function applyCompanionSignatureHit(sig, st, mon, dmgDone, now){
  if(!sig || sig.mode !== 'passive' || !mon || dmgDone <= 0) return;
  const comp = getActiveCompanion();
  const tpl = comp && COMPANIONS.find(c=>c.key===comp.key);
  let note = '';
  if(sig.bonusVsState && monsterStateActive(mon, sig.bonusVsState)){
    const extra = absorbMonsterBarrier(mon, Math.max(1, Math.floor(dmgDone * (sig.bonusStatePct || 0.3))), sig.icon || '✨').remaining;
    if(extra > 0){ mon.hp -= extra; trackDmg('comp', extra); showMonsterFloat(mon, (sig.icon || '✨') + '-' + extra, '#fbbf24'); }
    note = note || '追猎强化';
  }
  if(sig.dotPct) applyMonsterDot(mon, `sig:${st.name}:${sig.name}`, Math.max(1, Math.floor(dmgDone * sig.dotPct)), sig.dotMs || 6000, { icon:sig.icon || '✨', name:sig.name, source:st.name });
  if(sig.slow) mon.slowUntil = Math.max(mon.slowUntil || 0, now + (sig.slowMs || 4000));
  if(sig.stun) mon.stunUntil = Math.max(mon.stunUntil || 0, now + (sig.stunMs || 1200));
  if(sig.sunder) mon.sunderUntil = Math.max(mon.sunderUntil || 0, now + (sig.sunderMs || 12000));
  if(sig.stateKey) applyMonsterState(mon, sig.stateKey, sig.stateMs || 8000);
  if(sig.splashPct) applyCompanionSplash(mon, dmgDone, sig.splashPct, sig.icon || '💥', '#fca5a5');
  if(sig.executeBonus && mon.hp > 0 && mon.hp <= mon.hpMax * (sig.executeThreshold || 0.35)){
    const extra = absorbMonsterBarrier(mon, Math.max(1, Math.floor(dmgDone * sig.executeBonus)), sig.icon || '✨').remaining;
    if(extra > 0){ mon.hp -= extra; trackDmg('comp', extra); showMonsterFloat(mon, (sig.icon || '✨') + '-' + extra, '#fbbf24'); }
    note = '斩杀强化';
  }
  if(sig.bonusVsBoss && mon.isBoss){
    const extra = absorbMonsterBarrier(mon, Math.max(1, Math.floor(dmgDone * sig.bonusVsBoss)), sig.icon || '👑').remaining;
    if(extra > 0){ mon.hp -= extra; trackDmg('comp', extra); showMonsterFloat(mon, (sig.icon || '👑') + '-' + extra, '#fbbf24'); }
    note = note || 'Boss压制';
  }
  if(sig.healPctHero){
    const amt = Math.floor(state.hero.hpMax * sig.healPctHero);
    healHeroAmount(amt, sig.icon || '✨', '#6ee7b7', 'comp', sig.name || '专属治疗');
    note = note || '回响治疗';
  }
  if(sig.healPctComp) healCompanionAmount(Math.floor(st.hpMax * sig.healPctComp), sig.icon || st.emoji, '#6ee7b7', 'comp', sig.name || '专属治疗');
  if(sig.shieldPctHero) addTalentShield(Math.floor(state.hero.hpMax * sig.shieldPctHero), true);
  if(sig.shieldPctComp) addCompanionBarrier(Math.floor(st.hpMax * sig.shieldPctComp), sig.icon || '🛡️', '#93c5fd');
  if(sig.dotPct && !note) note = '附加持续伤害';
  else if(sig.stateKey && !note) note = '施加专属印记';
  else if(sig.shieldPctHero || sig.shieldPctComp) note = note || '护盾触发';
  if(note) notifyCompanionSignature(sig, tpl, note, now);
}
function computeCompanionStats(){const comp=getActiveCompanion();if(!comp)return null;const tpl=COMPANIONS.find(c=>c.key===comp.key);if(!tpl)return null;const q=(typeof compQuality==='function')?compQuality(tpl):{key:'white'};const qm=COMPANION_COMBAT_QUALITY[q.key]||0.42;const sm=1+COMPANION_STAR_GROWTH*((comp.stars||1)-1);
  const role=COMPANION_ROLE_PROFILE[tpl.role]||COMPANION_ROLE_PROFILE.dps;
  const skills=(tpl.skills||[]).slice();
  const sigSkill = companionSignatureSkill(tpl);
  if(sigSkill) skills.push(sigSkill);
  const stats={name:tpl.name,emoji:tpl.emoji,role:tpl.role,skills,signature:companionSignature(tpl),atk:Math.floor(state.hero.atk*qm*sm*role.atk*(tpl.atkMul||1)),def:Math.floor(state.hero.def*qm*sm*0.72*role.def*(tpl.defMul||1)),hpMax:Math.floor(state.hero.hpMax*qm*sm*role.hp*(tpl.hpMul||1)),crit:Math.floor(state.hero.crit*qm*0.40*(tpl.critMul||1)),critd:Math.floor(state.hero.critd*role.critd*(tpl.critdMul||1)),spd:state.hero.spd*role.spd*(tpl.spdMul||1),reg:Math.max(1, Math.floor((state.hero.reg||0)*role.reg*(tpl.regMul||1)))};
  applyCompanionSignatureStats(stats, tpl);
  applyCompanionBuffEffects(stats);
  const dm = companionDebuffStatMults();
  stats.atk = Math.max(1, Math.floor(stats.atk * dm.atk));
  stats.def = Math.max(0, Math.floor(stats.def * dm.def));
  stats.spd = +(Math.max(0.35, stats.spd * dm.spd)).toFixed(2);
  return stats;}
/* 随从给主角的加成:专属(随星级强化)+ 定位 + 收藏 + 羁绊 */
function collectCompanionMod(){
  const out={atkPct:0,hpPct:0,defPct:0,critdPct:0,spdPct:0,crit:0,leech:0,vers:0,mastery:0,regFlat:0};
  if(!state||!state.companions)return out;
  const comp=getActiveCompanion();
  if(comp){const tpl=COMPANIONS.find(c=>c.key===comp.key);
    if(tpl){const starF=1+0.2*((comp.stars||1)-1);
      for(const[k,v]of Object.entries(tpl.bonus||{}))out[k]=(out[k]||0)+v*starF;
      const role=(typeof ROLE_BONUS==='object')&&ROLE_BONUS[tpl.role];
      if(role)for(const[k,v]of Object.entries(role))out[k]=(out[k]||0)+v;}}
  const owned=state.companions.length;
  out.atkPct+=Math.min(owned*0.05,1.2);
  out.hpPct+=Math.min(owned*0.08,1.8);   // 收藏被动保留存在感,但不再把角色面板顶飞
  if(typeof COMPANION_BONDS!=='undefined'){const ks=new Set(state.companions.map(c=>c.key));
    for(const b of COMPANION_BONDS){if(b.keys.every(k=>ks.has(k)))for(const[k,v]of Object.entries(b.mod))out[k]=(out[k]||0)+v;}}
  return out;
}
function activeCompanionBonds(){if(typeof COMPANION_BONDS==='undefined'||!state.companions)return[];const ks=new Set(state.companions.map(c=>c.key));return COMPANION_BONDS.filter(b=>b.keys.every(k=>ks.has(k)));}
function initCompanionHp(){
  const st=computeCompanionStats();
  if(!st){state._compHp=null;state._compDownUntil=0;return;}   // 无随从时清空状态
  if(state._compDownUntil===undefined||state._compDownUntil===null)state._compDownUntil=0;
  if((state._compHp===undefined||state._compHp===null||state._compHp<=0)&&!compDowned())state._compHp=st.hpMax;   // 首次/复活:满血
  else if(!compDowned())state._compHp=Math.min(state._compHp,st.hpMax);                       // 跨波保留(只把超出新上限的钳回)
}
/* 随从是否处于阵亡(倒下计时中) */
function compDowned(){return (state._compDownUntil||0)>Date.now();}
/* 随从当前可否被怪攻击:出战、存活、未阵亡 */
function companionTargetable(){return !!getActiveCompanion()&&(state._compHp||0)>0&&!compDowned();}
function companionSkillTarget(sk){
  if(sk?.healTarget) return sk.healTarget;
  if(sk?.buffTarget) return sk.buffTarget;
  return 'smart';
}
function companionSkillPriority(sk, st, mon, now){
  const heroFrac = state.hp / Math.max(1, state.hero.hpMax || 1);
  const compFrac = (state._compHp || 0) / Math.max(1, st.hpMax || 1);
  const targetMode = companionSkillTarget(sk);
  let score = 0;
  if(sk.type === 'heal'){
    const targetFrac = targetMode === 'companion' ? compFrac : targetMode === 'hero' ? heroFrac : Math.min(heroFrac, compFrac);
    score = 180 + (1 - targetFrac) * 200 + ((sk.heal || 0) + (sk.healPct || 0)) * 120 + (sk.cleanse ? 26 : 0) + (sk.shieldPct ? 18 : 0);
    if(targetFrac > 0.92) score -= 90;
    if(st.role === 'heal') score += 25;
    return score;
  }
  if(sk.type === 'buff'){
    const buffKey = sk.buff;
    const targetHero = targetMode === 'hero';
    const active = buffKey ? (targetHero ? ((state.buffs?.[buffKey] || 0) > now) : companionBuffActive(buffKey, now)) : false;
    score = 110 + ((sk.duration || 0) / 1000) + (sk.shieldPct ? 24 : 0) + (sk.healPct ? 20 : 0) + (sk.cleanse ? 32 : 0);
    if(active) score -= 120;
    if(st.role === 'tank' && !targetHero && compFrac < 0.8) score += 30;
    if(st.role === 'heal' && targetHero && heroFrac < 0.8) score += 25;
    if(st.role === 'dps' && !targetHero && mon?.isBoss) score += 18;
    if(targetMode === 'both') score += 14;
    return score;
  }
  score = (sk.mul || 1) * 18 + (sk.alwaysCrit ? 18 : 0);
  if(sk.dot && !(mon?._dots && Object.keys(mon._dots).length)) score += 16;
  if(sk.dotPct && getMonsterDotCount(mon, now) === 0) score += 16;
  if(sk.slow && !(mon?.slowUntil > now)) score += 10;
  if((sk.debuff === 'sunder' || /破甲/.test(sk.name || '')) && !(mon?.sunderUntil > now)) score += 16;
  if(sk.stun && !(mon?.stunUntil > now)) score += 8;
  if(sk.stateKey && !monsterStateActive(mon, sk.stateKey)) score += 14;
  if(sk.bonusVsDot && getMonsterDotCount(mon, now) > 0) score += 18;
  if(sk.bonusVsSlow && mon?.slowUntil > now) score += 16;
  if(sk.bonusVsSunder && mon?.sunderUntil > now) score += 18;
  if(sk.bonusVsState && monsterStateActive(mon, sk.bonusVsState)) score += 18;
  if(sk.bonusVsBoss && mon?.isBoss) score += 18;
  if(sk.splashPct || sk.aoePct) score += state.currentMonsters.filter(x=>x.hp>0).length >= 3 ? 18 : -6;
  if(mon?.isBoss) score += 10;
  if(mon && mon.hp > 0 && mon.hp <= mon.hpMax * (sk.executeThreshold || 0.35)) score += (sk.executeBonus ? 22 : (sk.alwaysCrit ? 12 : 6));
  return score;
}
/* 按定位的吸引仇恨概率:坦克多、治疗少、输出居中 */
function compAggroChance(){const comp=getActiveCompanion();if(!comp)return 0;const tpl=COMPANIONS.find(c=>c.key===comp.key);const role=tpl&&tpl.role;const base=role==='tank'?0.75:role==='heal'?0.15:0.20;return Math.max(0.05,Math.min(0.9,base+(tpl?.aggroBonus||0))); }
/* 随从倒下:清血、进入15秒复活计时 */
function downCompanion(now){
  state._compHp=0;state._compDownUntil=now+15000;
  const comp=getActiveCompanion();const tpl=comp&&COMPANIONS.find(c=>c.key===comp.key);
  showFloat($('comp-mini'),'💫倒下','#fde047');
  const e=$('comp-mini');if(e){e.classList.add('shake');setTimeout(()=>{const x=$('comp-mini');if(x)x.classList.remove('shake');},200);}
  log((tpl?tpl.name:'随从')+' 倒下了! 15秒后归来','bad');
}
function tickCompanion(now){const comp=getActiveCompanion();if(!comp)return;const st=computeCompanionStats();if(!st)return;const tpl=COMPANIONS.find(c=>c.key===comp.key);
  // 复活计时:倒地满15秒 → 以 50% 血归来
  if(!compDowned()&&(state._compDownUntil||0)>0){state._compDownUntil=0;state._compHp=Math.floor(st.hpMax*0.5);const tpl=COMPANIONS.find(c=>c.key===comp.key);showFloat($('comp-mini'),'✨归来','#6ee7b7');log((tpl?tpl.name:'随从')+' 重新投入战斗!','good');}
  // 缓慢回血:存活且未满,每秒回复 2% 最大生命(受减益影响)
  if(!compDowned()&&(state._compHp||0)>0&&state._compHp<st.hpMax&&now-lastCompRegen>1000){lastCompRegen=now;state._compHp=Math.min(st.hpMax,state._compHp+Math.max(1,Math.ceil(st.hpMax*0.02*companionDebuffRegenMult())));}
  // DOT: 每秒结算随从身上的持续伤害
  const cbd=state._compDebuffs&&state._compDebuffs.burn;
  if(!compDowned()&&cbd&&cbd.expire>now){
    if(!state._compLastDotTick||now-state._compLastDotTick>1000){state._compLastDotTick=now;applyCompanionDamage(Math.max(1,cbd.dps||1),state.currentMonsters[0],{label:t=>'☠️-'+t,color:'#a3e635',now});}
  }
  if(compDowned())return;   // 阵亡期间不攻击/不施法/不奶
  if((state._compStunUntil||0)>now) return;
  const mon=state.currentMonsters[0];if(!mon)return;
  if(compSkillCd._owner!==comp.key)compSkillCd={_owner:comp.key};   // 换随从:重置技能冷却
  const interval=1000/(st.spd||0.5);if((state._compDisarmUntil||0)<=now&&(now-lastCompAtk>interval||now-lastCompAtk>5000)){let cm=state.currentMonsters[0];if(cm&&cm.hp>0){const cd=calcDmg(st.atk,monArmor(cm),st.crit,st.critd,false,cm.lvl,state.hero.lvl);const dealt=absorbMonsterBarrier(cm, cd.dmg, st.emoji).remaining;cm.hp-=dealt;if(dealt>0){trackDmg('comp',dealt,cd.crit,'普攻');showMonsterFloat(cm,st.emoji+'-'+dealt,'#a0d0ff',{variant:cd.crit?'crit':'comp',scale:cd.crit?1.12:1});}applyCompanionSignatureHit(companionSignature(tpl), st, cm, dealt, now);}lastCompAtk=now;
    // 技能:每个技能按自己的 cd 独立冷却,就绪即放(GCD 2秒,避免一次性全放;优先治疗>buff>伤害)
    if((state._compSilenceUntil||0)<=now&&now-lastCompSkill>2000){
      const ready=[];for(let i=0;i<st.skills.length;i++){if((compSkillCd[i]||0)<=now)ready.push(i);}
      ready.sort((a,b)=>companionSkillPriority(st.skills[b],st,mon,now)-companionSkillPriority(st.skills[a],st,mon,now)||a-b);
      const i=ready[0];
      if(i!==undefined){const sk=st.skills[i];
        if(sk.type==='dmg'){
          const dmgMult = companionSkillDamageMult(sk, mon, now);
          const sd=calcDmg(st.atk*sk.mul*dmgMult*COMPANION_SKILL_DMG_BONUS,monArmor(mon),st.crit,st.critd,sk.alwaysCrit,mon.lvl,state.hero.lvl);const dealt=absorbMonsterBarrier(mon, sd.dmg, sk.icon || st.emoji).remaining;mon.hp-=dealt;if(dealt>0){trackDmg('comp',dealt,sd.crit,sk.name);showMonsterFloat(mon,st.emoji+sk.icon+'-'+dealt,'#c0a0ff',{variant:sd.crit?'crit':'comp',scale:sd.crit?1.12:1,important:true});}
          const dotPct = sk.dotPct || (sk.dot ? 0.12 : 0);
          if(dotPct > 0) applyMonsterDot(mon,`comp:${comp.key}:${i}`,Math.max(1,Math.floor(dealt*dotPct)),sk.dotMs||6000,{icon:sk.icon,name:sk.name,source:st.name});
          if(sk.slow) mon.slowUntil=Math.max(mon.slowUntil||0,Date.now()+(sk.slowMs||4000));
          if(sk.stun) mon.stunUntil=Math.max(mon.stunUntil||0,Date.now()+(sk.stunMs||1500));
          if(sk.debuff==='sunder'||/破甲/.test(sk.name||'')) mon.sunderUntil=Math.max(mon.sunderUntil||0,Date.now()+(sk.sunderMs||15000));
          if(sk.stateKey) applyMonsterState(mon, sk.stateKey, sk.stateMs || 9000);
          if(sk.splashPct) applyCompanionSplash(mon, dealt, sk.splashPct, sk.icon || '💥', '#fca5a5');
          if(sk.aoePct) applyCompanionSplash(mon, dealt, sk.aoePct, sk.icon || '💥', '#fca5a5');
          applyCompanionSignatureHit(companionSignature(tpl), st, mon, dealt, now);
          if(sk.heal){
            const healTarget = companionSkillTarget(sk) === 'hero' ? 'hero' : companionSkillTarget(sk) === 'companion' ? 'companion' : companionHealTarget();
            if(healTarget==='companion'){
              const healAmt=Math.floor(st.hpMax*sk.heal*COMPANION_HEAL_SCALE);
              healCompanionAmount(healAmt,st.emoji,'#6ee7b7','comp',sk.name);
            } else {
              const healAmt=Math.floor(state.hero.hpMax*sk.heal*COMPANION_HEAL_SCALE);
              healHeroAmount(healAmt, st.emoji, '#6ee7b7', 'comp', sk.name);
            }
          }
          if(sk.lifeSteal) healCompanionAmount(Math.floor(dealt*sk.lifeSteal), '🩸', '#6ee7b7', 'comp', sk.name);
        }
        else if(sk.type==='heal'){
          const healTarget = companionSkillTarget(sk) === 'hero' ? 'hero' : companionSkillTarget(sk) === 'companion' ? 'companion' : companionHealTarget();
          if(healTarget==='companion'){
            const h=Math.floor(st.hpMax*sk.heal*COMPANION_HEAL_SCALE);
            const hr=healCompanionAmount(h, st.emoji, '#6ee7b7', 'comp', sk.name); log(sk.name+'! 为随从恢复 '+hr.applied+' 生命','good');
          }
          else {
            const h=Math.floor(state.hero.hpMax*sk.heal*COMPANION_HEAL_SCALE);
            const hr=healHeroAmount(h, st.emoji, '#6ee7b7', 'comp', sk.name);log(sk.name+'! +'+hr.applied+' 生命','good');
          }
          applyCompanionSupportSkill(sk, st, now);
        }
        else if(sk.type==='buff'){
          const dur=(sk.duration||15000)+(state.hero.buffDuration||0)*1000;
          if(sk.buffTarget === 'hero'){
            state.buffs[sk.buff]=Date.now()+dur;recomputeStats();markDirty('hero');
          }else if(sk.buffTarget === 'both'){
            state.buffs[sk.buff]=Date.now()+dur;recomputeStats();markDirty('hero');
            if(!state._compBuffs)state._compBuffs={};state._compBuffs[sk.buff]=Date.now()+dur;markDirty('companion');
          }else{
            if(!state._compBuffs)state._compBuffs={};state._compBuffs[sk.buff]=Date.now()+dur;markDirty('companion');
          }
          applyCompanionSupportSkill(sk, st, now);
          log(sk.name+'!','good');
        }
        compSkillCd[i]=now+(sk.cd||COMP_SKILL_DEFAULT_CD)*1000;lastCompSkill=now;
      }
    }
  }}
function companionDraw(){
  if((state.compTickets||0)<1)return log('🐾随从券不足,去商店购买','bad');
  state.compTickets--;
  // 初始化通用碎片
  if(!state.compUniversalShards) state.compUniversalShards = {white:0,green:0,blue:0,purple:0,orange:0};
  const univ = state.compUniversalShards;
  // 过滤奖池: 某品质全部拥有且满星 → 排除
  const qualityKeys = ['white','green','blue','purple','orange'];
  const ownedMap = {}; for(const c of state.companions) ownedMap[c.key] = c;
  const fullQuality = new Set();
  for(const qk of qualityKeys){
    const ofQ = COMPANIONS.filter(t => compQuality(t).key === qk);
    if(ofQ.length && ofQ.every(t => { const c = ownedMap[t.key]; return c && (c.stars||1) >= 5; })){
      fullQuality.add(qk);
    }
  }
  const pool = COMPANIONS.filter(t => !fullQuality.has(compQuality(t).key));
  if(!pool.length) return log('🎰 所有品质随从均已满星!','good');
  // 加权随机
  let total=0;const w=pool.map(c=>{const x=compQuality(c).weight;total+=x;return x;});
  let r=Math.random()*total;let tpl=pool[0];
  for(let i=0;i<pool.length;i++){r-=w[i];if(r<=0){tpl=pool[i];break;}}
  const q=compQuality(tpl);
  const existing=state.companions.find(c=>c.key===tpl.key);
  if(existing){
    // 重复 → 获得该品质通用碎片
    const shards=({white:1,green:2,blue:3,purple:5,orange:8})[q.key]||1;
    univ[q.key] = (univ[q.key]||0) + shards;
    log(`🎰 抽到重复! ${tpl.emoji}${tpl.name}(${q.name})→+${shards}${q.name}通用碎片 (共${univ[q.key]})`,'info');
  }else{
    state.companions.push({key:tpl.key,stars:1});
    log(`🎰 获得随从! ${tpl.emoji}${tpl.name}【${q.name}】`,(q.key==='orange'||q.key==='purple')?'legend':'good');
    recomputeStats();
  }
  markDirty('companion','hero');
}
function upgradeCompanion(idx){
  const comp=state.companions[idx];if(!comp)return;
  const tpl=COMPANIONS.find(c=>c.key===comp.key);
  if((comp.stars||1)>=5)return log('已满星','bad');
  const need=(comp.stars||1)*8;
  const q = compQuality(tpl);
  // 优先用该随从专属碎片, 不足时用通用碎片
  if(!state.compUniversalShards) state.compUniversalShards = {white:0,green:0,blue:0,purple:0,orange:0};
  const have = (state.companionShards[comp.key]||0) + (state.compUniversalShards[q.key]||0);
  if(have<need)return log(`碎片不足(${have}/${need})`,'bad');
  // 先扣专属碎片, 再扣通用
  let remaining = need;
  const specific = state.companionShards[comp.key]||0;
  const deductSpecific = Math.min(specific, remaining);
  state.companionShards[comp.key] = specific - deductSpecific;
  remaining -= deductSpecific;
  if(remaining > 0) state.compUniversalShards[q.key] -= remaining;
  comp.stars=(comp.stars||1)+1;
  log(`⭐ ${tpl?.name} 升到 ${comp.stars} 星!`,'good');
  recomputeStats();markDirty('companion','hero');
}
function getUpgradeCost(comp){
  const stars=comp.stars||1;
  if(stars>=5)return {type:'满星',need:0,have:0,maxed:true};
  const tpl = COMPANIONS.find(c=>c.key===comp.key);
  const q = compQuality(tpl);
  if(!state.compUniversalShards) state.compUniversalShards = {white:0,green:0,blue:0,purple:0,orange:0};
  return {type:'升星',need:stars*8,have:(state.companionShards[comp.key]||0)+(state.compUniversalShards[q.key]||0),maxed:false};
}
