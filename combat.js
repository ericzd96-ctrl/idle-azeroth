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
  s_barrier:     { icon:'🪨', name:'护盾',     desc:'受到伤害-40%' },
  s_haste:       { icon:'💨', name:'急速',     desc:'攻速+33%' },
  s_lifesurge:   { icon:'🩸', name:'生命洪流', desc:'吸血+20·攻击+13%' },
  s_avatar:      { icon:'⚡', name:'天神下凡', desc:'攻+27%·减伤25%' },
  // 职业技能 buff (来自 skills_ext.js BUFF_FX / SKILL_AURA_LIBRARY)
  w_reckless:    { icon:'😡', name:'鲁莽',     desc:'攻击+27%·暴伤+20' },
  w_ironwall:    { icon:'🛡️', name:'钢铁壁垒', desc:'受到伤害-45%' },
  w_shieldBlock: { icon:'🧱', name:'盾牌格挡', desc:'防御+22%·减伤18%' },
  m_combust:     { icon:'🔥', name:'燃烧',     desc:'暴击+17·暴伤+34' },
  m_iceblock:    { icon:'❄️', name:'寒冰护体', desc:'受到伤害-40%' },
  p_grace:       { icon:'✨', name:'恩典',     desc:'防御+12%·暴击+4·回复+5' },
  p_voidform:    { icon:'🌑', name:'暗影形态', desc:'攻击+22%·暴击+10·暴伤+20' },
  r_dance:       { icon:'🔪', name:'剑刃乱舞', desc:'攻击+20%·攻速+18%·暴伤+15' },
  h_burst:       { icon:'🎯', name:'杀戮命令', desc:'攻击+28%·暴击+10·暴伤+22' },
  h_beastBond:   { icon:'🐾', name:'兽群羁绊', desc:'攻击+14%·攻速+10%' },
  sh_frenzy:     { icon:'⚡', name:'嗜血',     desc:'攻击+18%·攻速+25%' },
  sh_ancestral:  { icon:'🪬', name:'先祖护持', desc:'攻速+12%·回复+4·减伤10%' },
  pa_wrath:      { icon:'⚖️', name:'复仇之怒', desc:'攻击+28%·暴击+12·暴伤+24' },
  pa_devotion:   { icon:'⚜️', name:'虔诚祝福', desc:'攻击+13%·防御+18%·回复+6·减伤16%' },
  wl_dark:       { icon:'👁️', name:'黑暗灵魂', desc:'暴击+20·暴伤+38' },
  d_zerk:        { icon:'🐻', name:'狂暴',     desc:'攻击+20%·攻速+20%·暴击+8' },
  d_lifebloom:   { icon:'🌿', name:'生命绽放', desc:'防御+10%·回复+7' },
  // 硬编码 buff (效果已减1/3)
  shield:        { icon:'🛡️', name:'盾墙',     desc:'受到伤害-33%' },
  divine:        { icon:'✨', name:'神圣守护', desc:'受到伤害-45%' },
  bark:          { icon:'🌳', name:'树皮术',   desc:'受到伤害-40%' },
  iceBarrier:    { icon:'🧊', name:'寒冰屏障', desc:'受到伤害-40%' },
  earthShield:   { icon:'🪨', name:'大地之盾', desc:'受到伤害-33%' },
  evasion:       { icon:'💨', name:'闪避',     desc:'受到伤害-34%' },
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
function talentFxList(){
  const tfx = state._talentFx || [];
  const sfx = state._setFx || [];
  const afx = state._artifactFx || [];
  return tfx.concat(sfx, afx);
}
function ensureTalentState(){
  if(!state.talentAuras) state.talentAuras = {};
  if(!state.talentState) state.talentState = { cds:{}, flags:{}, shield:0 };
  if(!state.talentState.cds) state.talentState.cds = {};
  if(!state.talentState.flags) state.talentState.flags = {};
  if(typeof state.talentState.shield !== 'number') state.talentState.shield = 0;
  if(typeof state.talentState.shieldExpire !== 'number') state.talentState.shieldExpire = 0;
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
function addTalentShield(amount, quiet, durationMs){
  amount = Math.max(0, Math.floor(amount || 0));
  if(amount <= 0) return 0;
  const rt = ensureTalentState();
  rt.shield += amount;
  rt.shieldExpire = Math.max(rt.shieldExpire || 0, Date.now() + (durationMs || 10000));   // 护盾有持续时间, 到期自动消失(不再每波清盾)
  if(!quiet) showFloat($('hero-emoji'), '🛡️+' + amount, '#93c5fd', { variant:'shield', scale:1.04 });
  if(typeof pulseCombatEl === 'function') pulseCombatEl($('hero-emoji'), 'shield', 260);
  markDirty('hero');
  return amount;
}
const SHIELD_ABSORB_RATIO = 0.75;
const BOSS_SKILL_HEAL_MULT = 0.5;
function shieldAbsorbAmount(pool, amount){
  pool = Math.max(0, Math.floor(pool || 0));
  amount = Math.max(0, Math.floor(amount || 0));
  if(pool <= 0 || amount <= 0) return 0;
  const perHitCap = Math.max(1, Math.floor(amount * SHIELD_ABSORB_RATIO));
  return Math.min(pool, perHitCap);
}
function bossSkillHealPct(value){
  value = +value || 0;
  if(value <= 0) return 0;
  return +(value * BOSS_SKILL_HEAL_MULT).toFixed(3);
}
function bossSkillHealAmount(mon, value){
  if(!mon || !(mon.hpMax > 0)) return 0;
  const pct = bossSkillHealPct(value);
  if(pct <= 0) return 0;
  return Math.max(1, Math.floor(mon.hpMax * pct));
}
function absorbTalentShield(amount){
  amount = Math.max(0, Math.floor(amount || 0));
  if(amount <= 0) return 0;
  const rt = ensureTalentState();
  if(rt.shield <= 0) return amount;
  const absorb = shieldAbsorbAmount(rt.shield, amount);
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
function monsterStateCount(mon, now){
  if(!mon) return 0;
  const ts = now || Date.now();
  let count = 0;
  if(mon.slowUntil > ts) count++;
  if(mon.sunderUntil > ts) count++;
  if(mon._skillStates) for(const until of Object.values(mon._skillStates)) if(until > ts) count++;
  return count;
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
  const specMod = calcSpecIdentityRuntimeBonus(skillKey, sk, mon, now, dotCount);
  if(specMod.mult) mult *= specMod.mult;
  if(specMod.forceCrit) forceCrit = true;
  return { fx, mult, forceCrit, dotCount };
}
function calcSpecIdentityRuntimeBonus(skillKey, sk, mon, now, dotCount){
  if(!sk || sk.type !== 'dmg') return { mult:1, forceCrit:false };
  const cls = activeHeroClassKey();
  const spec = activeHeroSpecKey();
  const name = sk.name || '';
  const lowHp = !!(mon && mon.hp > 0 && mon.hp <= mon.hpMax * 0.35);
  const hasSummon = activeAllySummonCount(now) > 0;
  let mult = 1;
  let forceCrit = false;

  if(cls === 'warrior' && spec === 'arms'){
    const st = skillAuraStacks('w_sunder');
    mult *= 1 + st * (/致死|巨人|斩杀|灭战者/.test(name) ? 0.08 : 0.04);
    if(lowHp && /斩杀|致死|巨人/.test(name)) forceCrit = true;
  } else if(cls === 'warrior' && spec === 'fury'){
    const st = skillAuraStacks('w_rage');
    mult *= 1 + st * 0.045 + (buffActive('w_recklessness', now) ? 0.14 : 0);
  } else if(cls === 'warrior' && spec === 'prot'){
    const st = skillAuraStacks('w_block');
    mult *= 1 + st * 0.045 + (buffActive('shield', now) || buffActive('w_ironwall', now) ? 0.12 : 0);
  } else if(cls === 'mage' && spec === 'arcane'){
    const st = skillAuraStacks('arcaneCharge');
    mult *= 1 + st * (/弹幕|涌动/.test(name) ? 0.13 : 0.065);
  } else if(cls === 'mage' && spec === 'fire'){
    const st = skillAuraStacks('m_heat');
    mult *= 1 + st * 0.045 + dotCount * 0.045;
    if(st >= 5 && /炎爆|流星|火焰冲击|凤凰/.test(name)) forceCrit = true;
  } else if(cls === 'mage' && spec === 'frost'){
    const st = skillAuraStacks('m_frost');
    mult *= 1 + st * 0.035;
    if(monsterStateActive(mon, 'frozen')){
      mult *= /冰枪|彗星|宝珠|冰风暴/.test(name) ? 1.42 : 1.22;
      if(/冰枪|彗星/.test(name)) forceCrit = true;
    }
  } else if(cls === 'priest' && spec === 'discipline'){
    mult *= 1 + skillAuraStacks('p_grace') * 0.035 + (monsterStateActive(mon, 'exposed') ? 0.22 : 0);
  } else if(cls === 'priest' && spec === 'holy'){
    mult *= 1 + skillAuraStacks('p_grace') * 0.025;
  } else if(cls === 'priest' && spec === 'shadow'){
    mult *= 1 + skillAuraStacks('p_insanity') * 0.045 + dotCount * 0.055;
  } else if(cls === 'rogue' && spec === 'assassination'){
    mult *= 1 + skillAuraStacks('r_venom') * 0.045 + dotCount * 0.06;
  } else if(cls === 'rogue' && spec === 'combat'){
    const st = skillAuraStacks('r_combo');
    mult *= 1 + st * (/正中|杀戮|切割/.test(name) ? 0.075 : 0.035) + (buffActive('s_haste', now) ? 0.12 : 0);
  } else if(cls === 'rogue' && spec === 'subtlety'){
    mult *= 1 + skillAuraStacks('r_combo') * 0.045 + (monsterStateActive(mon, 'exposed') ? 0.24 : 0) + (buffActive('shadowstep', now) ? 0.22 : 0);
  } else if(cls === 'hunter' && spec === 'bm'){
    mult *= 1 + skillAuraStacks('h_beastBond') * 0.045 + (hasSummon ? 0.18 : 0);
  } else if(cls === 'hunter' && spec === 'marks'){
    mult *= 1 + (monsterStateActive(mon, 'marked') ? 0.34 : 0) + (/瞄准|精确|杀戮|百发|二连/.test(name) ? 0.10 : 0);
    if(monsterStateActive(mon, 'marked') && /杀戮|瞄准/.test(name)) forceCrit = true;
  } else if(cls === 'hunter' && spec === 'survival'){
    mult *= 1 + dotCount * 0.085 + (/炸弹|陷阱|屠戮|猫鼬/.test(name) ? 0.12 : 0);
  } else if(cls === 'shaman' && spec === 'element'){
    mult *= 1 + skillAuraStacks('stormCharge') * 0.07 + (buffActive('s_empower', now) ? 0.14 : 0);
  } else if(cls === 'shaman' && spec === 'enhancement'){
    mult *= 1 + skillAuraStacks('sh_maelstrom') * 0.055 + (buffActive('windfury', now) ? 0.16 : 0);
  } else if(cls === 'shaman' && spec === 'restoration'){
    mult *= 1 + skillAuraStacks('sh_totem') * 0.025;
  } else if(cls === 'paladin' && spec === 'holy'){
    mult *= 1 + skillAuraStacks('pa_bulwark') * 0.025;
  } else if(cls === 'paladin' && spec === 'prot'){
    const st = skillAuraStacks('pa_bulwark');
    mult *= 1 + st * 0.045 + (buffActive('pa_devotion', now) || buffActive('sacredShield', now) ? 0.12 : 0);
  } else if(cls === 'paladin' && spec === 'ret'){
    const st = skillAuraStacks('pa_holyPower');
    mult *= 1 + st * (/裁决|清算|愤怒之锤/.test(name) ? 0.09 : 0.045) + (monsterStateActive(mon, 'judged') ? 0.16 : 0);
  } else if(cls === 'warlock' && spec === 'affliction'){
    mult *= 1 + skillAuraStacks('wl_shard') * 0.035 + dotCount * 0.075;
  } else if(cls === 'warlock' && spec === 'demonology'){
    mult *= 1 + skillAuraStacks('wl_shard') * 0.045 + (hasSummon ? 0.22 : 0);
  } else if(cls === 'warlock' && spec === 'destruction'){
    const st = skillAuraStacks('wl_ember');
    mult *= 1 + st * (/混乱|大灾变|灵魂之火/.test(name) ? 0.095 : 0.05) + dotCount * 0.03;
  } else if(cls === 'druid' && spec === 'balance'){
    const st = skillAuraStacks('d_astral');
    mult *= 1 + st * (/星涌|星辰|新月/.test(name) ? 0.085 : 0.045) + dotCount * 0.035;
  } else if(cls === 'druid' && spec === 'feral'){
    mult *= 1 + skillAuraStacks('d_combo') * 0.055 + dotCount * 0.065;
  } else if(cls === 'druid' && spec === 'resto'){
    mult *= 1 + skillAuraStacks('d_harmony') * 0.025;
  }
  return { mult, forceCrit };
}
function calcSpecIdentityHealMult(skillKey, sk, now){
  const cls = activeHeroClassKey();
  const spec = activeHeroSpecKey();
  if(!sk || sk.type !== 'heal') return 1;
  let mult = 1;
  if(cls === 'priest' && spec === 'discipline') mult += skillAuraStacks('p_grace') * 0.04;
  else if(cls === 'priest' && spec === 'holy') mult += skillAuraStacks('p_grace') * 0.065;
  else if(cls === 'shaman' && spec === 'restoration') mult += skillAuraStacks('sh_totem') * 0.065;
  else if(cls === 'paladin' && spec === 'holy') mult += skillAuraStacks('pa_bulwark') * 0.045 + (buffActive('kings', now) ? 0.10 : 0);
  else if(cls === 'druid' && spec === 'resto') mult += skillAuraStacks('d_harmony') * 0.065;
  else if(cls === 'warrior' && spec === 'prot') mult += skillAuraStacks('w_block') * 0.035;
  return mult;
}
function applySkillFollowupDamage(mon, amount, icon, color, now){
  now = now || Date.now();
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
function splashSkillDamage(sourceMon, amount, pct, icon, now){
  if(!(pct > 0) || !(amount > 0)) return 0;
  let total = 0;
  for(const other of state.currentMonsters){
    if(other === sourceMon || other.hp <= 0) continue;
    total += applySkillFollowupDamage(other, amount * pct, icon || '💥', '#f59e0b', now);
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
  if(fx.extraHitPct) applySkillFollowupDamage(mon, dmgDone * fx.extraHitPct, sk.icon || '✨', '#fbbf24', now);
  if(fx.extraHitPctIfBuff && buffActive(fx.extraHitPctIfBuff.key, now)) applySkillFollowupDamage(mon, dmgDone * (fx.extraHitPctIfBuff.pct || 0), sk.icon || '✨', '#fbbf24', now);
  if(fx.splashPct && !ctx?.isAOE) splashSkillDamage(mon, dmgDone, fx.splashPct, sk.icon || '💥', now);
  if(fx.spreadDotsPct) spreadDotFromMonster(mon, fx.spreadDotsPct, fx.dotMs || 5000);
  if(fx.resourceGainOnKill && mon.hp <= 0) grantTalentResource(fx.resourceGainOnKill);
  applyClassMechanicAfterSkill(skillKey, sk, mon, dmgDone, Object.assign({ now, hit:true }, ctx || {}));
}
function applySkillHealEffects(skillKey, sk, amount, overheal){
  const fx = skillFxMeta(skillKey, sk);
  if(fx.shieldFromOverhealPct && overheal > 0) addTalentShield(Math.floor(overheal * fx.shieldFromOverhealPct), true);
  if(fx.shieldFromHealPct && amount > 0) addTalentShield(Math.floor(amount * fx.shieldFromHealPct), true);
  if(fx.shieldBonusIfBuff && buffActive(fx.shieldBonusIfBuff.key)) addTalentShield(Math.floor(amount * (fx.shieldBonusIfBuff.pct || 0)), true);
  if(fx.grantAura) addSkillAura(fx.grantAura.key, fx.grantAura);
  applyClassMechanicAfterSkill(skillKey, sk, null, amount, { overheal, heal:true, now:Date.now() });
}
function ensureClassRuntime(){
  if(!state.classRuntime) state.classRuntime = { cds:{} };
  if(!state.classRuntime.cds) state.classRuntime.cds = {};
  return state.classRuntime;
}
function classRuntimeReady(key, cooldownMs, now){
  const rt = ensureClassRuntime();
  const ts = now || Date.now();
  if((rt.cds[key] || 0) > ts) return false;
  rt.cds[key] = ts + (cooldownMs || 0);
  return true;
}
function activeHeroClassKey(){ return state.cls || ''; }
function activeHeroSpecKey(){ return state.specialization || ''; }
function activeAllySummonCount(now){
  return (typeof livingAllySummons === 'function') ? livingAllySummons(now || Date.now()).length : 0;
}
function applyCompanionClassSupport(fx, sk, amount, now){
  if(!fx || typeof companionTargetable !== 'function' || !companionTargetable() || typeof computeCompanionStats !== 'function') return;
  const st = computeCompanionStats();
  if(!st || compDowned()) return;
  if(fx.companionHealPct){
    healCompanionAmount(Math.floor(st.hpMax * fx.companionHealPct), sk?.icon || '💚', '#6ee7b7', 'hero', sk?.name || '职业支援');
  }
  if(fx.companionShieldPct){
    addCompanionBarrier(Math.floor(st.hpMax * fx.companionShieldPct), sk?.icon || '🛡️', '#93c5fd');
  }
  if(fx.companionBuff){
    if(!state._compBuffs) state._compBuffs = {};
    state._compBuffs[fx.companionBuff] = now + (fx.companionBuffMs || 8000);
    markDirty('companion');
  }
}
function applySpecIdentityMechanicAfterSkill(skillKey, sk, mon, value, ctx){
  if(!sk) return;
  const now = ctx?.now || Date.now();
  const cls = activeHeroClassKey();
  const spec = activeHeroSpecKey();
  const name = sk.name || '';
  const dmgSkill = sk.type === 'dmg' && mon && mon.hp > 0;
  const healSkill = sk.type === 'heal' || ctx?.heal;
  const summonSkill = sk.type === 'summon' || sk.summonCount || ctx?.summoned;
  const defensiveSkill = isDefensiveSkill(skillKey, sk);
  const dots = dmgSkill ? getMonsterDotCount(mon, now) : 0;

  if(cls === 'warrior' && spec === 'arms' && dmgSkill){
    if(/破甲|压制|碎颅|灭战者|致死/.test(name)) addSkillAura('w_sunder', { add:/灭战者|碎颅/.test(name)?2:1, max:5, duration:15000 });
    if(/致死|巨人|斩杀|灭战者/.test(name) && skillAuraStacks('w_sunder') >= 5 && classRuntimeReady('spec-arms-exec', 1600, now)){
      const spent = consumeSkillAura('w_sunder', { all:true });
      applySkillFollowupDamage(mon, value * (0.18 + spent * 0.08), '🪓', '#fbbf24', now);
    }
  } else if(cls === 'warrior' && spec === 'fury'){
    if(dmgSkill && /怒|嗜血|浴血|奥丁|乱舞/.test(name)){
      const st = addSkillAura('w_rage', { add:1, max:5, duration:12000 });
      if(st >= 5 && classRuntimeReady('spec-fury-rampage', 2200, now)){
        applySkillFollowupDamage(mon, value * 0.42, '😡', '#fb7185', now);
        healHeroAmount(Math.floor(state.hero.hpMax * 0.035), '🩸', '#fda4af', 'hero', '暴怒续战');
        consumeSkillAura('w_rage', { all:true });
      }
    }
  } else if(cls === 'mage' && spec === 'arcane' && (dmgSkill || ctx?.buff)){
    if(/奥术|阿鲁尼斯|大法师/.test(name)) addSkillAura('arcaneCharge', { add:1, max:4, duration:12000 });
    if(dmgSkill && /弹幕|涌动/.test(name) && skillAuraStacks('arcaneCharge') >= 3 && classRuntimeReady('spec-arcane-dump', 1400, now)){
      const spent = consumeSkillAura('arcaneCharge', { all:true });
      applySkillFollowupDamage(mon, value * (0.20 + spent * 0.10), '🔷', '#c4b5fd', now);
      state.resource = Math.min(state.resourceMax || state.resource, state.resource + 8 + spent * 3);
    }
  } else if(cls === 'mage' && spec === 'fire' && dmgSkill){
    if(sk.dot || dots > 0 || /火|炎|燃|流星|凤凰|炸弹|烈焰/.test(name)) addSkillAura('m_heat', { add:1, max:5, duration:12000 });
    if(/炎爆|流星|烈焰风暴|大灾/.test(name) && skillAuraStacks('m_heat') >= 5 && classRuntimeReady('spec-fire-ignite', 1800, now)){
      consumeSkillAura('m_heat', { all:true });
      applySkillFollowupDamage(mon, value * (0.35 + dots * 0.08), '🔥', '#fb923c', now);
      spreadDotFromMonster(mon, 0.45, 7000);
    }
  } else if(cls === 'mage' && spec === 'frost' && dmgSkill){
    if(/冰|霜|雪|寒|彗星/.test(name)) addSkillAura('m_frost', { add:1, max:5, duration:12000 });
    if(monsterStateActive(mon, 'frozen') && /冰枪|彗星|宝珠|冰风暴/.test(name) && classRuntimeReady('spec-frost-shatter', 1300, now)){
      const stacks = Math.max(1, skillAuraStacks('m_frost'));
      applySkillFollowupDamage(mon, value * Math.min(0.55, 0.14 + stacks * 0.07), '❄️', '#93c5fd', now);
      addTalentShield(Math.floor(state.hero.hpMax * 0.018 * Math.min(5, stacks)), true);
      if(stacks >= 5) consumeSkillAura('m_frost', { all:true });
    }
  } else if(cls === 'priest' && spec === 'discipline'){
    if(dmgSkill && /惩击|惩罚|教派|分歧/.test(name) && classRuntimeReady('spec-disc-atonement', 1200, now)){
      const shield = Math.floor((value || state.hero.atk) * 0.16);
      addTalentShield(shield, true);
      if(companionTargetable()){ const st = computeCompanionStats(); if(st) addCompanionBarrier(Math.floor(st.hpMax * 0.035), '⚖️', '#fef3c7'); }
    }
    if(defensiveSkill) addSkillAura('p_grace', { add:2, max:5, duration:15000 });
  } else if(cls === 'priest' && spec === 'holy'){
    if(healSkill){
      const st = addSkillAura('p_grace', { add:1, max:5, duration:15000 });
      if(st >= 5 && classRuntimeReady('spec-holy-echo', 1800, now)){
        healHeroAmount(Math.floor(state.hero.hpMax * 0.08), '✨', '#fde68a', 'hero', '圣言回响');
        if(companionTargetable()){ const cs = computeCompanionStats(); if(cs) healCompanionAmount(Math.floor(cs.hpMax * 0.12), '✨', '#fde68a', 'hero', '圣言回响'); }
        addTalentShield(Math.floor(state.hero.hpMax * 0.05), true);
        consumeSkillAura('p_grace', { all:true });
      }
    } else if(dmgSkill && classRuntimeReady('spec-holy-smite', 2200, now)) healHeroAmount(Math.floor(state.hero.hpMax * 0.025), '✨', '#fde68a', 'hero', '圣光回响');
  } else if(cls === 'priest' && spec === 'shadow' && dmgSkill){
    if(sk.dot || /暗|虚空|疫病|鞭笞|冲撞/.test(name)) addSkillAura('p_insanity', { add:1, max:6, duration:12000 });
    if(/虚空|疫病|冲撞/.test(name) && skillAuraStacks('p_insanity') >= 6 && classRuntimeReady('spec-shadow-void', 1800, now)){
      consumeSkillAura('p_insanity', { all:true });
      applySkillFollowupDamage(mon, value * (0.36 + dots * 0.07), '🌑', '#c084fc', now);
      spreadDotFromMonster(mon, 0.5, 8000);
    }
  } else if(cls === 'rogue' && spec === 'assassination' && dmgSkill){
    if(sk.dot || /毒|毁伤|锁喉|割裂/.test(name)) addSkillAura('r_venom', { add:/毁伤|君王/.test(name)?2:1, max:5, duration:12000 });
    if(/奉毒|君王/.test(name) && skillAuraStacks('r_venom') >= 5 && classRuntimeReady('spec-assn-venom', 1500, now)){
      consumeSkillAura('r_venom', { all:true });
      applySkillFollowupDamage(mon, value * (0.30 + dots * 0.10), '🐍', '#bef264', now);
    }
  } else if(cls === 'rogue' && spec === 'combat' && dmgSkill){
    const st = addSkillAura('r_combo', { add:/剑刃|冲刺|邪恶|背刺/.test(name)?1:0, max:5, duration:12000 });
    if(/正中|杀戮|切割/.test(name) && st >= 5 && classRuntimeReady('spec-combat-flurry', 1500, now)){
      consumeSkillAura('r_combo', { all:true });
      applySkillFollowupDamage(mon, value * 0.48, '⚔️', '#fbbf24', now);
    }
  } else if(cls === 'rogue' && spec === 'subtlety' && dmgSkill){
    if(/暗|幽|袖剑|背刺|绞喉/.test(name)) addSkillAura('r_combo', { add:1, max:5, duration:12000 });
    if((buffActive('shadowstep', now) || monsterStateActive(mon, 'exposed')) && classRuntimeReady('spec-sub-shadow', 1500, now)){
      applySkillFollowupDamage(mon, value * 0.28, '🌑', '#a78bfa', now);
    }
  } else if(cls === 'hunter' && spec === 'bm'){
    if(summonSkill || /宠物|野兽|倒刺|杀戮|兽群/.test(name)) addSkillAura('h_beastBond', { add:summonSkill?2:1, max:5, duration:15000 });
    if(dmgSkill && activeAllySummonCount(now) > 0 && classRuntimeReady('spec-bm-bite', 1400, now)){
      const stacks = Math.max(1, skillAuraStacks('h_beastBond'));
      applySkillFollowupDamage(mon, value * Math.min(0.55, 0.12 + stacks * 0.07), '🐾', '#86efac', now);
    }
  } else if(cls === 'hunter' && spec === 'marks' && dmgSkill){
    if(/印记|精确|瞄准|二连|百发/.test(name)){
      applyMonsterState(mon, 'marked', 10000);
      addSkillAura('h_frenzy', { add:/二连|百发/.test(name)?2:1, max:5, duration:12000 });
    }
    if(monsterStateActive(mon, 'marked') && /瞄准|精确|杀戮|奇美拉/.test(name) && classRuntimeReady('spec-marks-pierce', 1500, now)){
      applySkillFollowupDamage(mon, value * (mon.isBoss ? 0.38 : 0.28), '🎯', '#facc15', now);
    }
  } else if(cls === 'hunter' && spec === 'survival' && dmgSkill){
    if(sk.dot || /炸弹|陷阱|钉刺|野火|屠戮|猫鼬/.test(name)) addSkillAura('h_frenzy', { add:1, max:5, duration:12000 });
    if((sk.dot || /炸弹|陷阱|钉刺|野火/.test(name)) && classRuntimeReady('spec-surv-bomb', 1500, now)) applySkillFollowupDamage(mon, value * (0.18 + dots * 0.08), '💣', '#fb923c', now);
  } else if(cls === 'shaman' && spec === 'element' && dmgSkill){
    if(/闪电|熔岩|震击|风暴|元素/.test(name)) addSkillAura('stormCharge', { add:1, max:4, duration:12000 });
    if(/元素冲击|风暴守护|熔岩/.test(name) && classRuntimeReady('spec-ele-overload', 1400, now)){
      const stacks = Math.max(1, skillAuraStacks('stormCharge'));
      applySkillFollowupDamage(mon, value * Math.min(0.55, 0.12 + stacks * 0.08), '⛈️', '#67e8f9', now);
    }
  } else if(cls === 'shaman' && spec === 'enhancement'){
    if(dmgSkill || summonSkill) addSkillAura('sh_maelstrom', { add:summonSkill?2:1, max:5, duration:12000 });
    if(dmgSkill && /裂地|熔岩|风暴|毁灭/.test(name) && classRuntimeReady('spec-enh-wind', 1500, now)){
      const stacks = Math.max(1, skillAuraStacks('sh_maelstrom'));
      applySkillFollowupDamage(mon, value * Math.min(0.55, 0.10 + stacks * 0.08), '🌀', '#5eead4', now);
      if(stacks >= 5) consumeSkillAura('sh_maelstrom', { all:true });
    }
  } else if(cls === 'shaman' && spec === 'restoration' && healSkill){
    const st = addSkillAura('sh_totem', { add:1, max:5, duration:15000 });
    if(st >= 5 && classRuntimeReady('spec-resto-tide', 1800, now)){
      healHeroAmount(Math.floor(state.hero.hpMax * 0.075), '🌊', '#67e8f9', 'hero', '潮汐图腾');
      if(companionTargetable()){ const cs = computeCompanionStats(); if(cs){ healCompanionAmount(Math.floor(cs.hpMax * 0.12), '🌊', '#67e8f9', 'hero', '潮汐图腾'); addCompanionBarrier(Math.floor(cs.hpMax * 0.06), '🪬', '#67e8f9'); } }
      consumeSkillAura('sh_totem', { all:true });
    }
  } else if(cls === 'paladin' && spec === 'ret' && dmgSkill){
    if(/审判|十字军|公正|灰烬/.test(name)) addSkillAura('pa_holyPower', { add:/公正|灰烬/.test(name)?2:1, max:5, duration:15000 });
    if(/裁决|清算|愤怒之锤/.test(name) && skillAuraStacks('pa_holyPower') >= 5 && classRuntimeReady('spec-ret-verdict', 1500, now)){
      consumeSkillAura('pa_holyPower', { all:true });
      applySkillFollowupDamage(mon, value * 0.52, '⚜️', '#fde68a', now);
    }
  } else if(cls === 'paladin' && spec === 'holy' && healSkill){
    if(classRuntimeReady('spec-hpal-beacon', 1300, now) && companionTargetable()){ const cs = computeCompanionStats(); if(cs){ healCompanionAmount(Math.floor(cs.hpMax * 0.10), '🌟', '#fde68a', 'hero', '圣光道标'); addCompanionBarrier(Math.floor(cs.hpMax * 0.05), '🌟', '#fde68a'); } }
  } else if(cls === 'warlock' && spec === 'affliction' && dmgSkill){
    if(sk.dot || /痛|腐蚀|鬼影/.test(name)) addSkillAura('wl_shard', { add:1, max:5, duration:12000 });
    if(/狂涌|腐蚀之种|鬼影/.test(name) && dots >= 2 && classRuntimeReady('spec-aff-harvest', 1600, now)){
      applySkillFollowupDamage(mon, value * (0.24 + dots * 0.08), '💜', '#c084fc', now);
      spreadDotFromMonster(mon, 0.55, 8000);
    }
  } else if(cls === 'warlock' && spec === 'demonology'){
    if(summonSkill || /古尔丹|恶魔|恐惧|内爆/.test(name)) addSkillAura('wl_shard', { add:summonSkill?2:1, max:5, duration:12000 });
    if(dmgSkill && activeAllySummonCount(now) > 0 && classRuntimeReady('spec-demo-demon', 1500, now)) applySkillFollowupDamage(mon, value * 0.36, '😈', '#f0abfc', now);
  } else if(cls === 'warlock' && spec === 'destruction' && dmgSkill){
    if(/献祭|烧尽|燃烧|火焰|雨/.test(name)) addSkillAura('wl_ember', { add:1, max:5, duration:12000 });
    if(/混乱|大灾变|灵魂之火/.test(name) && skillAuraStacks('wl_ember') >= 5 && classRuntimeReady('spec-destro-chaos', 1600, now)){
      consumeSkillAura('wl_ember', { all:true });
      applySkillFollowupDamage(mon, value * 0.55, '🔥', '#fb7185', now);
    }
  } else if(cls === 'druid' && spec === 'balance' && dmgSkill){
    if(/月火|阳炎|星火|愤怒/.test(name)) addSkillAura('d_astral', { add:1, max:5, duration:12000 });
    if(/星涌|星辰|新月/.test(name) && classRuntimeReady('spec-balance-stars', 1500, now)){
      const stacks = Math.max(1, skillAuraStacks('d_astral'));
      applySkillFollowupDamage(mon, value * Math.min(0.55, 0.12 + stacks * 0.08), '🌠', '#c4b5fd', now);
      if(stacks >= 5) consumeSkillAura('d_astral', { all:true });
    }
  } else if(cls === 'druid' && spec === 'feral' && dmgSkill){
    if(/斜掠|撕碎|横扫/.test(name)) addSkillAura('d_combo', { add:/撕碎/.test(name)?2:1, max:5, duration:12000 });
    if(/割裂|凶猛|野性狂怒/.test(name) && skillAuraStacks('d_combo') >= 5 && classRuntimeReady('spec-feral-bite', 1500, now)){
      consumeSkillAura('d_combo', { all:true });
      applySkillFollowupDamage(mon, value * (0.35 + dots * 0.08), '🐾', '#fb923c', now);
    }
  } else if(cls === 'druid' && spec === 'resto' && healSkill){
    const st = addSkillAura('d_harmony', { add:1, max:5, duration:15000 });
    if(st >= 5 && classRuntimeReady('spec-druid-bloom', 1800, now)){
      healHeroAmount(Math.floor(state.hero.hpMax * 0.08), '🌿', '#86efac', 'hero', '繁花滋养');
      addTalentShield(Math.floor(state.hero.hpMax * 0.05), true);
      if(companionTargetable()){ const cs = computeCompanionStats(); if(cs){ healCompanionAmount(Math.floor(cs.hpMax * 0.13), '🌺', '#86efac', 'hero', '繁花滋养'); addCompanionBarrier(Math.floor(cs.hpMax * 0.06), '🌺', '#86efac'); } }
      consumeSkillAura('d_harmony', { all:true });
    }
  }
}
function applyClassMechanicAfterSkill(skillKey, sk, mon, value, ctx){
  if(!sk) return;
  const now = ctx?.now || Date.now();
  const cls = activeHeroClassKey();
  const spec = activeHeroSpecKey();
  const fx = skillFxMeta(skillKey, sk);
  applyCompanionClassSupport(fx, sk, value, now);
  applySpecIdentityMechanicAfterSkill(skillKey, sk, mon, value, ctx);
  if(mon && mon.hp > 0 && fx.extraHitPctIfSummon && activeAllySummonCount(now) > 0){
    applySkillFollowupDamage(mon, value * fx.extraHitPctIfSummon, sk.icon || '🐾', '#7dd3fc', now);
  }
  if(cls === 'hunter'){
    if(sk.type === 'summon' || sk.summonCount || /宠物|野兽|杀戮|兽群/.test(sk.name || '')){
      addSkillAura('h_beastBond', { add:1, max:5, duration:15000 });
    }
    if(mon && mon.hp > 0 && activeAllySummonCount(now) > 0 && sk.type === 'dmg' && classRuntimeReady('hunter-pack:' + skillKey, 1800, now)){
      const stacks = skillAuraStacks('h_beastBond');
      if(stacks > 0) applySkillFollowupDamage(mon, value * Math.min(0.45, 0.08 * stacks), '🐾', '#7dd3fc', now);
    }
  } else if(cls === 'warrior'){
    if(spec === 'prot' && (isDefensiveSkill(skillKey, sk) || /盾|壁垒|挑战|雷霆/.test(sk.name || ''))){
      const stacks = addSkillAura('w_block', { add:1, max:5, duration:12000 });
      if(stacks >= 5 && classRuntimeReady('warrior-block-shield', 3500, now)){
        addTalentShield(Math.floor(state.hero.hpMax * 0.045 + state.hero.def * 0.8), true);
        consumeSkillAura('w_block', { all:true });
        showFloat($('hero-emoji'), '🧱盾反护体', '#93c5fd', { variant:'shield', scale:1.04 });
      }
    }
  } else if(cls === 'paladin'){
    if(/审判|十字军|圣光|祝福|圣盾|守护|裁决|正义/.test(sk.name || '')) addSkillAura('pa_bulwark', { add:1, max:5, duration:15000 });
    if((spec === 'holy' || spec === 'prot') && (sk.type === 'heal' || isDefensiveSkill(skillKey, sk)) && classRuntimeReady('paladin-devotion:' + skillKey, 1200, now)){
      const stacks = Math.max(1, skillAuraStacks('pa_bulwark'));
      healHeroAmount(Math.floor(state.hero.hpMax * Math.min(0.08, 0.012 * stacks)), '✨', '#fef3c7', 'hero', '圣光壁垒');
      if(companionTargetable()){
        const st = computeCompanionStats();
        if(st) addCompanionBarrier(Math.floor(st.hpMax * Math.min(0.08, 0.012 * stacks)), '✨', '#fef3c7');
      }
    }
  } else if(cls === 'priest'){
    if(sk.type === 'heal' || isDefensiveSkill(skillKey, sk)) addSkillAura('p_grace', { add:1, max:5, duration:15000 });
    if((spec === 'holy' || spec === 'discipline') && companionTargetable() && (sk.type === 'heal' || isDefensiveSkill(skillKey, sk)) && classRuntimeReady('priest-grace:' + skillKey, 1000, now)){
      const st = computeCompanionStats();
      if(st){
        healCompanionAmount(Math.floor(st.hpMax * 0.045 + (value || 0) * 0.12), sk.icon || '✨', '#fef3c7', 'hero', '恩典');
        addCompanionBarrier(Math.floor(st.hpMax * 0.035), sk.icon || '🛡️', '#fef3c7');
      }
    }
  } else if(cls === 'shaman'){
    if(/闪电|震击|风暴|熔岩|治疗|大地|灵魂|嗜血|风怒/.test(sk.name || '')) addSkillAura('sh_totem', { add:1, max:5, duration:15000 });
    if(spec === 'restoration' && (sk.type === 'heal' || isDefensiveSkill(skillKey, sk)) && companionTargetable() && classRuntimeReady('shaman-totem:' + skillKey, 1200, now)){
      const st = computeCompanionStats();
      if(st){
        healCompanionAmount(Math.floor(st.hpMax * 0.055), sk.icon || '🌊', '#67e8f9', 'hero', '图腾共鸣');
        addCompanionBarrier(Math.floor(st.hpMax * 0.035), '🪬', '#67e8f9');
      }
    }
  } else if(cls === 'druid'){
    if(/月火|星火|愤怒|回春|成长|宁静|树皮|根须|横扫|撕咬/.test(sk.name || '')) addSkillAura('d_harmony', { add:1, max:5, duration:15000 });
    if(spec === 'resto' && (sk.type === 'heal' || isDefensiveSkill(skillKey, sk)) && companionTargetable() && classRuntimeReady('druid-harmony:' + skillKey, 1200, now)){
      const st = computeCompanionStats();
      if(st){
        healCompanionAmount(Math.floor(st.hpMax * 0.06), sk.icon || '🌿', '#86efac', 'hero', '自然调和');
        addCompanionBarrier(Math.floor(st.hpMax * 0.035), '🌿', '#86efac');
      }
    }
  } else if(cls === 'warlock'){
    if(mon && mon.hp > 0 && sk.type === 'dmg' && getMonsterDotCount(mon, now) >= 2 && classRuntimeReady('warlock-agony:' + skillKey, 1600, now)){
      addSkillAura(spec === 'destruction' ? 'wl_ember' : 'wl_shard', { add:1, max:5, duration:12000 });
      if(spec === 'affliction') spreadDotFromMonster(mon, 0.35, 7000);
    }
  } else if(cls === 'mage'){
    if(mon && mon.hp > 0 && sk.type === 'dmg'){
      if(spec === 'fire' && getMonsterDotCount(mon, now) > 0 && classRuntimeReady('mage-heat:' + skillKey, 1400, now)) addSkillAura('m_heat', { add:1, max:5, duration:12000 });
      if(spec === 'frost' && monsterStateActive(mon, 'frozen') && classRuntimeReady('mage-shatter:' + skillKey, 1400, now)) applySkillFollowupDamage(mon, value * 0.18, '🧊', '#93c5fd', now);
    }
  }
}
function applyClassMechanicOnTakeDamage(mon, taken, rawAmount, now){
  if(!(taken > 0)) return;
  const cls = activeHeroClassKey();
  const spec = activeHeroSpecKey();
  if(cls === 'warrior' && spec === 'prot' && mon && mon.hp > 0){
    const stacks = addSkillAura('w_block', { add:1, max:5, duration:12000 });
    const wallActive = buffActive('shield', now) || buffActive('w_ironwall', now) || buffActive('w_shieldBlock', now);
    const reflectPct = (0.16 + stacks * 0.025) * (wallActive ? 1.45 : 1);
    const reflect = Math.min(mon.hp, Math.floor(taken * reflectPct + state.hero.def * (wallActive ? 0.65 : 0.42)));
    if(reflect > 0 && classRuntimeReady('warrior-prot-reflect', 650, now)){
      mon.hp -= reflect;
      trackDmg('hero', reflect, false, '盾牌反震');
      showMonsterFloat(mon, '🧱' + reflect, '#fbbf24');
    }
    if(stacks >= 5 && classRuntimeReady('warrior-prot-bulwark', 3500, now)){
      addTalentShield(Math.floor(state.hero.hpMax * 0.05 + state.hero.def * 0.8), true);
      consumeSkillAura('w_block', { all:true });
    }
  }
  if(cls === 'paladin' && spec === 'prot' && classRuntimeReady('paladin-prot-recover', 1500, now)){
    const blessed = buffActive('kings', now) || buffActive('sacredShield', now) || buffActive('divine', now) || buffActive('pa_devotion', now);
    const stacks = skillAuraStacks('pa_bulwark');
    if(blessed || stacks > 0){
      healHeroAmount(Math.floor(state.hero.hpMax * Math.min(0.055, 0.012 + stacks * 0.008)), '✨', '#fef3c7', 'hero', '圣光回涌');
      addTalentShield(Math.floor(state.hero.hpMax * Math.min(0.06, 0.015 + stacks * 0.006)), true);
      addSkillAura('pa_bulwark', { add:1, max:5, duration:15000 });
    }
  }
  if(cls === 'priest' && spec === 'discipline'){
    const stacks = addSkillAura('p_grace', { add:1, max:5, duration:15000 });
    if(classRuntimeReady('priest-disc-reactive-shield', 1600, now)){
      addTalentShield(Math.floor(state.hero.hpMax * (0.018 + Math.min(5, stacks) * 0.006)), true);
      if(companionTargetable()){
        const st = computeCompanionStats();
        if(st) addCompanionBarrier(Math.floor(st.hpMax * (0.025 + Math.min(5, stacks) * 0.006)), '⚖️', '#fef3c7');
      }
    }
  }
  if(cls === 'priest' && spec === 'holy' && state.hp > 0 && state.hp <= state.hero.hpMax * 0.45 && classRuntimeReady('priest-holy-desperate-prayer', 9000, now)){
    healHeroAmount(Math.floor(state.hero.hpMax * 0.075), '✨', '#fde68a', 'hero', '守护圣言');
    addSkillAura('p_grace', { add:2, max:5, duration:15000 });
  }
  if(cls === 'shaman' && spec === 'restoration'){
    const stacks = addSkillAura('sh_totem', { add:1, max:5, duration:15000 });
    if(stacks >= 3 && classRuntimeReady('shaman-resto-earth-tide', 2800, now)){
      addTalentShield(Math.floor(state.hero.hpMax * 0.035), true);
      if(companionTargetable()){
        const st = computeCompanionStats();
        if(st) healCompanionAmount(Math.floor(st.hpMax * 0.055), '🌊', '#67e8f9', 'hero', '潮汐守护');
      }
    }
  }
  if(cls === 'druid' && spec === 'resto'){
    const stacks = addSkillAura('d_harmony', { add:1, max:5, duration:15000 });
    if(stacks >= 3 && classRuntimeReady('druid-resto-ironbark-bloom', 3200, now)){
      healHeroAmount(Math.floor(state.hero.hpMax * 0.045), '🌿', '#86efac', 'hero', '树皮新芽');
      addTalentShield(Math.floor(state.hero.hpMax * 0.025), true);
    }
  }
  if(cls === 'warrior' && spec === 'fury' && classRuntimeReady('warrior-fury-painrage', 1800, now)){
    addSkillAura('w_rage', { add:1, max:5, duration:12000 });
  }
}
function applyMonsterState(mon, stateKey, durMs){
  if(!mon || !stateKey) return;
  if(Array.isArray(stateKey)){
    for(const entry of stateKey){
      if(typeof entry === 'string') applyMonsterState(mon, entry, durMs);
      else if(entry && typeof entry === 'object' && entry.key) applyMonsterState(mon, entry.key, entry.durMs || entry.durationMs || durMs);
    }
    return;
  }
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
    else if(fx.type === 'whileAura' && (hasTalentAura(fx.auraKey) || (typeof hasSkillAura==='function' && hasSkillAura(fx.auraKey))) && (!fx.skill || skillMatches(fx, skillKey)) && fx.dmgPct) mult *= 1 + fx.dmgPct/100;
    else if(fx.type === 'whileBuff' && buffActive(fx.buffKey) && (!fx.skill || skillMatches(fx, skillKey)) && fx.dmgPct) mult *= 1 + fx.dmgPct/100;
    else if(fx.type === 'auraStackAmp' && fx.dmgPctPerStack && typeof skillAuraStacks==='function'){ const st = skillAuraStacks(fx.auraKey); if(st > 0) mult *= 1 + st*fx.dmgPctPerStack/100; }   // 招牌充能层数叠伤
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
function artifactProcReady(key, now, cooldownMs){
  const rt = ensureTalentState();
  const procKey = 'artifactProc:' + key;
  if((rt.flags[procKey] || 0) > now) return false;
  rt.flags[procKey] = now + (cooldownMs || 900);
  return true;
}
function artifactProcVisual(fx, mon, opts){
  if(!fx || fx.source !== 'artifact') return;
  const now = opts?.now || Date.now();
  const tag = opts?.tag || fx.type || 'proc';
  if(!artifactProcReady((fx.artifactKey || fx.artifactName || 'artifact') + ':' + tag, now, opts?.cooldownMs || 900)) return;
  const targetEl = opts?.targetEl || ((opts?.target === 'hero' || !mon) ? $('hero-emoji') : monsterFloatAnchor(mon));
  const frameEl = opts?.frameEl || targetEl?.closest?.('.fighter, .mon-row, #comp-mini');
  if(!targetEl) return;
  const label = opts?.label || '✦ 神器触发';
  showFloat(targetEl, label, '#f5d0fe', {
    variant:'artifact',
    scale:opts?.scale || 1.04,
    duration:opts?.duration || 760,
    important:true,
    y:opts?.target === 'hero' ? -6 : 0
  });
  if(typeof pulseCombatEl === 'function') pulseCombatEl(targetEl, 'artifact', opts?.pulseDuration || 280);
  if(frameEl && frameEl !== targetEl && typeof pulseCombatEl === 'function') pulseCombatEl(frameEl, 'artifact', Math.max(opts?.pulseDuration || 280, 340));
  if(typeof log === 'function'){
    const targetName = opts?.target === 'hero' ? '你' : (mon?.bossName || mon?.name || '敌人');
    log(`✦ 神器触发：${fx.artifactName || '未知节点'} · ${targetName}`, 'good');
  }
}
function activeArtifactDamageFx(mon, skillKey){
  const out = [];
  for(const fx of (state._artifactFx || [])){
    if(fx.type === 'vsBoss' && mon?.isBoss && fx.dmgPct) out.push(fx);
    else if(fx.type === 'executeWindow' && mon && mon.hp > 0 && mon.hp <= mon.hpMax * (fx.threshold || 0.35) && fx.dmgPct) out.push(fx);
    else if(fx.type === 'vsState' && monsterStateActive(mon, fx.state) && fx.dmgPct) out.push(fx);
    else if(fx.type === 'skillAmp' && skillMatches(fx, skillKey) && (!fx.state || monsterStateActive(mon, fx.state)) && fx.dmgPct) out.push(fx);
    else if(fx.type === 'whileAura' && hasTalentAura(fx.auraKey) && (!fx.skill || skillMatches(fx, skillKey)) && fx.dmgPct) out.push(fx);
    else if(fx.type === 'whileBuff' && buffActive(fx.buffKey) && (!fx.skill || skillMatches(fx, skillKey)) && fx.dmgPct) out.push(fx);
  }
  return out;
}
function activeArtifactTakenFx(mon){
  const out = [];
  for(const fx of (state._artifactFx || [])){
    if(fx.type === 'vsBoss' && mon?.isBoss && fx.takenPct) out.push(fx);
    else if(fx.type === 'whileAura' && hasTalentAura(fx.auraKey) && fx.takenPct) out.push(fx);
    else if(fx.type === 'whileBuff' && buffActive(fx.buffKey) && fx.takenPct) out.push(fx);
  }
  return out;
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
  const defensiveArtifactFx = activeArtifactTakenFx(mon);
  if(defensiveArtifactFx.length) artifactProcVisual(defensiveArtifactFx[0], mon, { now, target:'hero', tag:'taken' });
  state.hp -= taken;
  trackTaken(taken);
  applyClassMechanicOnTakeDamage(mon, taken, amountIn, now);
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
  const summonSkill = sk.type === 'summon' || sk.summonCount;
  const tag = ai.priorityTag || (summonSkill ? 'summon' : 'builder');
  const base = { heal:120, defBuff:110, buff:80, summon:88, setup:78, spender:86, execute:92, aoe:74, dot:72, strike:56, builder:40 }[tag] || 40;
  const dotCount = getMonsterDotCount(mon, ctx.now);
  if(sk.type === 'buff' && sk.buff && state.buffs[sk.buff] > ctx.now) return null;
  if(summonSkill && !canSummonAllies(sk, 'hero', ctx.now)) return null;
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
  if(tag === 'summon'){
    score += (2 - Math.min(2, allySummonOwnerCount('hero', ctx.now))) * 18;
    if(mon.isBoss) score += 16;
    if(ctx.targetHpFrac < 0.2 && !mon.isBoss) score -= 14;
  }
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
    .filter(([skillKey, sk]) => !!state.unlockedSkills[skillKey] && sk && sk.type !== 'passive' && (typeof isSkillAllowedForCurrentSpec !== 'function' || isSkillAllowedForCurrentSpec(skillKey)))
    .sort((a, b) => {
      const la = Number.isFinite(a[1]?.unlockLvl) ? a[1].unlockLvl : 9999;
      const lb = Number.isFinite(b[1]?.unlockLvl) ? b[1].unlockLvl : 9999;
      if (la !== lb) return la - lb;
      return 0;
    });
}
function autoSkillConfig(){
  if(!state.autoSkillConfig) state.autoSkillConfig = { damage:true, burst:true, buff:true, interrupt:false };
  return state.autoSkillConfig;
}
function autoSkillKindEnabled(kind){
  const cfg = autoSkillConfig();
  return cfg[kind] !== false;
}
function autoSkillKind(skillKey, sk){
  if(!sk) return 'damage';
  if(sk.type === 'interrupt') return 'interrupt';
  const ai = skillAiMeta(skillKey, sk);
  const tag = ai.priorityTag || '';
  if(sk.type === 'heal' || isDefensiveSkill(skillKey, sk)) return 'buff';
  if(sk.type === 'buff'){
    const text = `${sk.name || ''} ${sk.desc || ''}`;
    if(tag === 'buff' && /爆发|鲁莽|燃烧|嗜血|狂暴|复仇|黑暗灵魂|杀戮命令|天神下凡|暗影形态/.test(text)) return 'burst';
    return 'buff';
  }
  if(sk.type === 'summon' || sk.summonCount) return 'burst';
  if(sk.type === 'dmg'){
    if(tag === 'execute' || tag === 'spender' || tag === 'aoe') return 'burst';
    if((sk.mul || 0) >= 5 || sk.alwaysCrit || (sk.cd || 0) >= 12) return 'burst';
    return 'damage';
  }
  return 'damage';
}
function autoSkillAllowed(skillKey, sk){
  return autoSkillKindEnabled(autoSkillKind(skillKey, sk));
}
function tryAutoInterrupt(autoSkills, now){
  if(!bossCasting || !autoSkillKindEnabled('interrupt')) return false;
  if(bossCasting.interruptPolicy === 'none') return false;
  for(const [skKey, sk] of autoSkills){
    if(!sk || sk.type !== 'interrupt') continue;
    if(state.skillCooldowns[skKey] && state.skillCooldowns[skKey] > now) continue;
    let cost = sk.mp || 0;
    if(state.hero.costReduction > 0) cost = Math.max(1, Math.floor(cost * (1 - state.hero.costReduction / 100)));
    if(state.resource < cost) continue;
    castSkill(skKey, false);
    return true;
  }
  return false;
}
function runTalentAction(fx, mon, value, ctx, now){
  const artifactTarget = (fx.healPct || fx.shieldPct || fx.type === 'afterHeal' || fx.type === 'lowHp') ? 'hero' : 'monster';
  artifactProcVisual(fx, mon, { now, target:artifactTarget, tag:'trigger' });
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
  // 套装触发效果
  if(fx.auraKey && typeof applySetAura === 'function') applySetAura(fx.auraKey);
  if(fx.extraDmgPct && mon && mon.hp > 0){
    let extra = Math.max(1, Math.floor((value || state.hero.atk) * fx.extraDmgPct));
    const dr = monsterDamageReduction(mon, now);
    if(dr && extra > 0) extra = Math.max(1, Math.floor(extra * (1 - dr)));
    if(extra > 0){ mon.hp -= extra; trackDmg('hero', extra); showMonsterFloat(mon, '🛡️⚔️-' + extra, '#fbbf24'); }
  }
  if(fx.holyDmgPct && mon && mon.hp > 0){
    let extra = Math.max(1, Math.floor((value || state.hero.atk) * fx.holyDmgPct));
    const dr = monsterDamageReduction(mon, now);
    if(dr && extra > 0) extra = Math.max(1, Math.floor(extra * (1 - dr)));
    if(extra > 0){ mon.hp -= extra; trackDmg('hero', extra); showMonsterFloat(mon, '✨-' + extra, '#fbbf24'); }
  }
  if(fx.extraHitPct && mon && mon.hp > 0){
    let extra = Math.max(1, Math.floor((value || state.hero.atk) * fx.extraHitPct));
    const dr = monsterDamageReduction(mon, now);
    if(dr && extra > 0) extra = Math.max(1, Math.floor(extra * (1 - dr)));
    if(extra > 0){ mon.hp -= extra; trackDmg('hero', extra); showMonsterFloat(mon, '👊-' + extra, '#fbbf24'); }
  }
  if(fx.chainDmgPct && mon && mon.hp > 0){
    let extra = Math.max(1, Math.floor((value || state.hero.atk) * fx.chainDmgPct));
    const dr = monsterDamageReduction(mon, now);
    if(dr && extra > 0) extra = Math.max(1, Math.floor(extra * (1 - dr)));
    if(extra > 0){ mon.hp -= extra; trackDmg('hero', extra); showMonsterFloat(mon, '⚡-' + extra, '#fbbf24'); }
  }
  if(fx.nextCrit && typeof grantNextSkillCrit === 'function') grantNextSkillCrit(fx.nextCrit);
  if(fx.dotPct && mon && mon.hp > 0 && typeof applyMonsterDot === 'function'){
    const dot = Math.max(1, Math.floor((value || state.hero.atk) * fx.dotPct * (1 + (state.hero.dotBonus || 0)/100)));
    applyMonsterDot(mon, 'set:' + (fx._setKey || 'dot'), dot, fx.dotMs || 5000, { icon:'☠️', name:'套装毒伤', source:'set' });
  }
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
    const cur = {atkPct, hpPct, defPct, spdPct, critdPct, crit:critFlat, leech, vers, mastery, haste, regFlat, extraAtk};
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
  // 占星命盘 — 星座节点加成, xp/gold/dropMult 由 killMonster 消费
  _snapSrc();
  if (typeof collectAstrologyMod === 'function') {
    const p = collectAstrologyMod();
    for (const [k, v] of Object.entries(p)) {
      if (!v) continue;
      if (k==='atkPct') atkPct+=v; else if (k==='critdPct') critdPct+=v;
      else if (k==='hpPct') hpPct+=v; else if (k==='defPct') defPct+=v;
      else if (k==='spdPct') spdPct+=v; else if (k==='mpPct') mpPct+=v;
      else if (k==='crit') critFlat+=v; else if (k==='regFlat') regFlat+=v;
      else if (k==='leech') leech+=v; else if (k==='vers') vers+=v;
      else if (k==='mastery') mastery+=v; else if (k==='haste') haste+=v;
      else if (k==='cdReduction') cdReduction+=v; else if (k==='buffDuration') buffDuration+=v;
      else if (k==='dotBonus') dotBonus+=v; else if (k==='costReduction') costReduction+=v;
      else if (k==='executeBonus') executeBonus+=v; else if (k==='reflectDmg') reflectDmg+=v;
      else if (k==='armorPen') armorPen+=v; else if (k==='dodge') dodge+=v;
    }
  }
  _saveSrc('占星');
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
      else if (k==='critdPct') critdPct+=v;
      else if (k==='crit') critFlat+=v;
      else if (k==='leech') leech+=v;
      else if (k==='vers') vers+=v;
      else if (k==='mastery') mastery+=v;
      else if (k==='regFlat') regFlat+=v;
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
      else if (k==='regFlat') regFlat+=v;
      else if (k==='strPct') attrPct.str+=v;
      else if (k==='agiPct') attrPct.agi+=v;
      else if (k==='intPct') attrPct.int+=v;
      else if (k==='spiPct') attrPct.spi+=v;
      else if (k==='staPct') attrPct.sta+=v;
      else if (k==='cdReduction') cdReduction+=v;
      else if (k==='buffDuration') buffDuration+=v;
      else if (k==='extraAtk') extraAtk+=v;
      else if (k==='healBonus') healBonus+=v;
      else if (k==='dotBonus') dotBonus+=v;
      else if (k==='costReduction') costReduction+=v;
      else if (k==='executeBonus') executeBonus+=v;
      else if (k==='reflectDmg') reflectDmg+=v;
      else if (k==='armorPen') armorPen+=v;
      else if (k==='dodge') dodge+=v;
      else if (k==='stunChance') stunChance+=v;
    }
  }
  _saveSrc('神器');
  // 幻象挑战能力 — 同 schema，仅在幻象挑战中生效
  _snapSrc();
  if (typeof collectRoguelikeMod === 'function') {
    const p = collectRoguelikeMod();
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
      else if (k==='cdReduction') cdReduction+=v;
      else if (k==='extraAtk') extraAtk+=v;
      else if (k==='healBonus') healBonus+=v;
      else if (k==='dotBonus') dotBonus+=v;
      else if (k==='costReduction') costReduction+=v;
      else if (k==='executeBonus') executeBonus+=v;
      else if (k==='reflectDmg') reflectDmg+=v;
      else if (k==='armorPen') armorPen+=v;
      else if (k==='dodge') dodge+=v;
      else if (k==='stunChance') stunChance+=v;
    }
  }
  _saveSrc('幻象');
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
      else if (k==='cdReduction') cdReduction+=v;
      else if (k==='extraAtk') extraAtk+=v;
      else if (k==='costReduction') costReduction+=v;
    }
  }
  _saveSrc('竞技场');
  // 公会科技/成员(账号共享)— 同 schema,xpMult/goldMult/dropMult 由 killMonster 消费
  _snapSrc();
  if (typeof collectGuildMod === 'function') {
    const p = collectGuildMod();
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
      // xpMult/goldMult/dropMult 在 killMonster 消费
    }
  }
  _saveSrc('公会');
  // 巅峰系统(满级无限成长)— 标准 schema,xp/gold/dropMult 由 killMonster 消费
  _snapSrc();
  if (typeof collectParagonMod === 'function') {
    const p = collectParagonMod();
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
      else if (k==='cdReduction') cdReduction+=v;
      else if (k==='extraAtk') extraAtk+=v;
      else if (k==='healBonus') healBonus+=v;
      else if (k==='dotBonus') dotBonus+=v;
      else if (k==='costReduction') costReduction+=v;
      else if (k==='executeBonus') executeBonus+=v;
      else if (k==='reflectDmg') reflectDmg+=v;
      else if (k==='armorPen') armorPen+=v;
      else if (k==='dodge') dodge+=v;
      else if (k==='stunChance') stunChance+=v;
      // xpMult/goldMult/dropMult 在 killMonster 消费
    }
  }
  _saveSrc('巅峰');
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

  // 5) 副本印记
  if (_hasEnhanced && typeof collectDungeonTraitBonuses === 'function') {
    _snapSrc();
    _applyBonusSet(it => collectDungeonTraitBonuses(it));
    _saveSrc('副本印记');
  }
  atk = Math.floor(atk * (1 + atkPct/100)) + equipAtk; hpMax = Math.floor(hpMax * (1 + hpPct/100));
  def = Math.floor(def * (1 + defPct/100));
  // 攻速稀有化:spdPct 的各来源数值已在 spd_tuning.js 加载期统一归一化为 30%(显示=实际),
  // 故此处按面值应用即可,不再隐藏缩放。技能增益(风怒/嗜血等)走下方 state.buffs 独立乘法。
  spd = +(spd * (1 + spdPct/100)).toFixed(2);
  mpMax = Math.floor(mpMax * (1 + mpPct/100));

  const now = Date.now();
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

  // 大秘境/副本词缀:暴风(攻速-) / 无心(治疗-)
  const ms2 = state.mythicState || state.dungeonState;
  if (ms2 && ms2.affixes && (state.mode === 'mythic' || state.mode === 'dungeon')) {
    for (const af of ms2.affixes) {
      if (af.mod.heroSpd) spd = +(spd * (1 + af.mod.heroSpd)).toFixed(2);
      if (af.mod.healReduction) healBonus = Math.floor(healBonus * (1 - af.mod.healReduction));
    }
  }
  if (state.mode === 'dungeon' && ms2?.environments?.length) {
    for (const env of ms2.environments) {
      const mod = env.mod || {};
      if (mod.heroSpd) spd = +(spd * (1 + mod.heroSpd)).toFixed(2);
      if (mod.healReduction) healBonus = Math.floor(healBonus * (1 - mod.healReduction));
    }
  }
  if (state.mode === 'dungeon' && ms2?.edicts?.length) {
    for (const edict of ms2.edicts) {
      const mod = edict.mod || {};
      if (mod.heroSpd) spd = +(spd * (1 + mod.heroSpd)).toFixed(2);
      if (mod.healReduction) healBonus = Math.floor(healBonus * (1 - mod.healReduction));
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
  state.hero.costReduction=Math.min(costReduction,15); state.hero.executeBonus=Math.min(executeBonus,40);
  state.hero.reflectDmg=reflectDmg;
  state.hero.armorPen=Math.min(armorPen,40); state.hero.dodge=Math.min(dodge,30); state.hero.stunChance=Math.min(stunChance,15);
  state._talentFx = talentFx;
  state._artifactFx = (typeof collectArtifactFx === 'function') ? collectArtifactFx() : [];
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
  demon: { icon:'😈', names:['邪能卫士','深渊爪牙','燃烧恶魔'] },
  fire: { icon:'🔥', names:['余烬仆从','熔火幼体','烈焰爪牙'] },
  nature: { icon:'🌿', names:['孢子仆从','藤蔓守卫','林地爪牙'] },
  soldier: { icon:'👤', names:['受召守卫','战场援军','狂热卫士'] },
  generic: { icon:'👹', names:['爪牙','仆从','召唤物'] }
};
const ALLY_SUMMON_THEMES = {
  beast:   { icon:'🐺', names:['战狼伙伴','荒野猎犬','迅捷猎豹'], hpPct:0.24, atkPct:0.62, defPct:0.55, spd:1.18, crit:10, critd:155, aggro:0.58, leechPct:0.06, executeBonus:0.18, executeThreshold:0.36, frenzyThreshold:0.45, frenzyAtkBonus:0.16, frenzySpdMul:1.18, skillName:'撕咬扑袭', skillIcon:'🦴', skillMul:1.90, skillCd:7200, skillDotPct:0.14, skillDotMs:7000, skillCrit:10, extraSkills:[{ name:'裂爪撕扯', icon:'🩸', mul:1.78, cdMs:7600, dotPct:0.18, dotMs:8000, desc:'撕裂利爪造成更强流血' }, { name:'猎群奔袭', icon:'🐾', mul:1.88, cdMs:8200, slow:true, slowMs:3200, splashPct:0.18, desc:'迅猛突袭并波及周围目标' }, { name:'狂野怒嚎', icon:'📯', mul:1.96, cdMs:9000, critBonus:12, healSelfPct:0.06, executeBonus:0.18, executeThreshold:0.35, desc:'战吼强化扑杀并回复自身' }] },
  undead:  { icon:'🧟', names:['骸骨战士','亡者勇士','寒骨侍从'], hpPct:0.26, atkPct:0.58, defPct:0.60, spd:0.96, crit:7, critd:150, aggro:0.52, damageTakenMult:0.92, leechPct:0.04, bonusVsDot:0.16, reviveOnce:true, revivePct:0.34, skillName:'尸群撕扯', skillIcon:'☠️', skillMul:1.82, skillCd:7800, skillDotPct:0.12, skillDotMs:7000, skillSplashPct:0.22, extraSkills:[{ name:'瘟骨投矛', icon:'🦴', mul:1.92, cdMs:8000, dotPct:0.16, dotMs:8000, stateKey:'blighted', stateMs:8000, desc:'投出瘟疫骨矛并附加瘟疫印记' }, { name:'寒墓缠握', icon:'🧊', mul:1.84, cdMs:8600, slow:true, slowMs:4200, stateKey:'chilled', stateMs:8000, desc:'寒墓之手减速并侵蚀敌人' }, { name:'亡魂吞噬', icon:'👻', mul:2.02, cdMs:9200, bonusVsDot:0.24, healSelfPct:0.08, desc:'撕咬受创目标并吞噬生命' }] },
  demon:   { icon:'🔥', names:['地狱火','邪能恶魔','深渊卫士'], hpPct:0.30, atkPct:0.74, defPct:0.62, spd:0.94, crit:8, critd:165, aggro:0.66, leechPct:0.05, splashPct:0.16, bonusVsState:'torment', bonusStatePct:0.20, skillName:'邪焰践踏', skillIcon:'💥', skillMul:2.18, skillCd:8200, skillDotPct:0.18, skillDotMs:8000, skillSplashPct:0.30, skillStateKey:'torment', skillStateMs:7000, extraSkills:[{ name:'邪能撕咬', icon:'😈', mul:1.94, cdMs:7600, dotPct:0.14, dotMs:7000, stateKey:'torment', stateMs:7000, desc:'邪能啃噬并留下痛苦印记' }, { name:'地狱震波', icon:'🌋', mul:2.04, cdMs:8600, splashPct:0.24, slow:true, slowMs:3500, desc:'震荡烈焰冲击前排并减速' }, { name:'末日灼烧', icon:'☄️', mul:2.28, cdMs:9400, dotPct:0.22, dotMs:9000, critdBonus:20, bonusVsState:'torment', bonusStatePct:0.22, desc:'引爆邪火造成更持久的灼烧' }] },
  phoenix: { icon:'🦜', names:['炽焰凤凰'], hpPct:0.22, atkPct:0.72, defPct:0.44, spd:1.26, crit:15, critd:170, aggro:0.34, dotPct:0.12, dotMs:6000, damageTakenMult:0.94, splashPct:0.14, bonusVsDot:0.18, reviveOnce:true, revivePct:0.42, skillName:'烈羽焚空', skillIcon:'🪽', skillMul:2.04, skillCd:6800, skillDotPct:0.22, skillDotMs:9000, skillSplashPct:0.20, skillCritd:18, extraSkills:[{ name:'灰烬俯冲', icon:'☄️', mul:2.02, cdMs:7600, dotPct:0.18, dotMs:8000, splashPct:0.18, desc:'俯冲轰炸并洒下大片余烬' }, { name:'涅火尖啸', icon:'🎇', mul:2.10, cdMs:8400, critBonus:14, bonusVsDot:0.24, desc:'对灼烧目标打出更高爆发' }, { name:'焚天回旋', icon:'🔥', mul:2.16, cdMs:9200, slow:true, slowMs:3200, splashPct:0.26, desc:'卷起火羽旋风烧穿敌阵' }] },
  nature:  { icon:'🌳', names:['自然树人','林地守卫','古树幼灵'], hpPct:0.30, atkPct:0.54, defPct:0.72, spd:0.90, crit:6, critd:150, aggro:0.62, damageTakenMult:0.86, bonusVsState:'rooted', bonusStatePct:0.24, retaliatePct:0.14, skillName:'根须重击', skillIcon:'🌿', skillMul:1.76, skillCd:7600, skillSlow:true, skillSlowMs:4200, skillStateKey:'rooted', skillStateMs:7000, skillHealSelfPct:0.08, extraSkills:[{ name:'藤鞭绞杀', icon:'🌱', mul:1.82, cdMs:7800, stateKey:'rooted', stateMs:9000, bonusVsState:'rooted', bonusStatePct:0.24, desc:'缠绕已被束缚的目标' }, { name:'林泉回息', icon:'💧', mul:1.70, cdMs:8600, healSelfPct:0.10, slow:true, slowMs:3200, desc:'恢复自身并放缓敌人动作' }, { name:'古木震荡', icon:'🌲', mul:1.98, cdMs:9400, stun:true, stunMs:1100, bonusVsState:'rooted', bonusStatePct:0.20, desc:'古树猛砸,对被束缚目标更痛' }] },
  fire:    { icon:'🔥', names:['火焰之子','余烬化身','熔火幼体'], hpPct:0.20, atkPct:0.68, defPct:0.42, spd:1.10, crit:12, critd:165, aggro:0.38, dotPct:0.10, dotMs:5000, splashPct:0.20, bonusVsDot:0.24, damageTakenMult:0.95, skillName:'熔火爆裂', skillIcon:'🌋', skillMul:2.06, skillCd:7200, skillDotPct:0.20, skillDotMs:8000, skillSplashPct:0.26, extraSkills:[{ name:'烈焰喷溅', icon:'🌋', mul:1.96, cdMs:7600, dotPct:0.20, dotMs:8000, splashPct:0.18, desc:'喷发火浆并灼烧周围敌人' }, { name:'焚烬突进', icon:'🚀', mul:2.08, cdMs:8400, executeBonus:0.26, executeThreshold:0.40, desc:'对残血目标发起灼烧突袭' }, { name:'爆燃冲击', icon:'💥', mul:2.18, cdMs:9200, bonusVsDot:0.28, critdBonus:16, desc:'引爆已有火种造成暴烈爆发' }] },
  void:    { icon:'🛸', names:['虚空影魔','裂隙幽影','以太仆从'], hpPct:0.23, atkPct:0.66, defPct:0.48, spd:1.08, crit:12, critd:160, aggro:0.42, damageTakenMult:0.90, bonusVsState:'torment', bonusStatePct:0.22, bonusVsSlow:0.18, skillName:'虚空撕裂', skillIcon:'🌌', skillMul:1.94, skillCd:7600, skillSlow:true, skillSlowMs:4500, skillStateKey:'torment', skillStateMs:7000, extraSkills:[{ name:'裂隙侵蚀', icon:'🕳️', mul:1.88, cdMs:7800, stateKey:'torment', stateMs:9000, dotPct:0.16, dotMs:7000, desc:'撕开裂隙持续侵蚀目标' }, { name:'虚空迟滞', icon:'🫧', mul:1.92, cdMs:8600, slow:true, slowMs:4800, bonusVsState:'torment', bonusStatePct:0.20, desc:'让敌人动作滞涩并扩大痛苦印记' }, { name:'以太震爆', icon:'✨', mul:2.12, cdMs:9400, splashPct:0.24, critBonus:10, desc:'震爆虚空余波,扫过周围敌人' }] },
  soldier: { icon:'🛡️', names:['受命守卫','战场援军','钢铁卫兵'], hpPct:0.28, atkPct:0.56, defPct:0.68, spd:0.92, crit:7, critd:150, aggro:0.70, damageTakenMult:0.84, retaliatePct:0.28, bonusVsState:'sunder', bonusStatePct:0.18, skillName:'盾击压制', skillIcon:'🔨', skillMul:1.86, skillCd:8000, skillStun:true, skillStunMs:900, skillSunder:true, skillSunderMs:14000, extraSkills:[{ name:'列阵突刺', icon:'🗡️', mul:1.84, cdMs:7800, sunder:true, sunderMs:15000, bonusVsState:'sunder', bonusStatePct:0.22, desc:'对破甲目标追加突刺伤害' }, { name:'守卫反击', icon:'🛡️', mul:1.90, cdMs:8600, stun:true, stunMs:1100, critBonus:8, desc:'盾反重击并打断敌人节奏' }, { name:'战旗冲锋', icon:'🚩', mul:2.02, cdMs:9400, splashPct:0.20, slow:true, slowMs:3000, desc:'举旗冲阵并迫使敌方退让' }] },
  generic: { icon:'🐾', names:['召唤兽','战斗仆从','援护单位'], hpPct:0.24, atkPct:0.58, defPct:0.54, spd:1.00, crit:8, critd:155, aggro:0.44, damageTakenMult:0.96, leechPct:0.04, bonusVsSlow:0.14, skillName:'协同猛袭', skillIcon:'✨', skillMul:1.74, skillCd:7600, skillCrit:6, extraSkills:[{ name:'夹击冲锋', icon:'⚡', mul:1.84, cdMs:7800, critBonus:10, desc:'抓住空隙发动迅猛夹击' }, { name:'援护压制', icon:'🪢', mul:1.88, cdMs:8600, slow:true, slowMs:3600, splashPct:0.16, desc:'援护突击并压制周围敌人' }, { name:'连携猛扑', icon:'💫', mul:1.96, cdMs:9400, executeBonus:0.20, executeThreshold:0.35, healSelfPct:0.06, desc:'协同终结并顺势恢复自身' }] }
};
const HERO_SUMMON_BOOST = {
  power:1.10,
  hp:3.00,
  atk:1.24,
  def:1.08,
  spd:1.06,
  crit:3,
  critd:8,
};
const COMPANION_SUMMON_BOOST = {
  power:1.06,
  hp:1.89,
  atk:1.34,
  def:1.12,
  spd:1.08,
  crit:4,
  critd:8,
};
let allySummonUidSeq = 1;
function ensureAllySummons(){
  if(!Array.isArray(state._allySummons)) state._allySummons = [];
  return state._allySummons;
}
function allySummonAnchor(unit){
  if(unit?._uid){
    const el = document.querySelector(`[data-ally-summon-uid="${unit._uid}"]`);
    if(el) return el;
  }
  return unit?._ownerType === 'companion' ? $('comp-mini') : $('hero-emoji');
}
function livingAllySummons(now){
  const ts = now || Date.now();
  return ensureAllySummons().filter(unit => unit && unit.hp > 0 && (!unit.expireAt || unit.expireAt > ts));
}
function pruneAllySummons(now){
  const ts = now || Date.now();
  const pool = ensureAllySummons();
  const next = pool.filter(unit => unit && unit.hp > 0 && (!unit.expireAt || unit.expireAt > ts));
  if(next.length !== pool.length){
    state._allySummons = next;
    markDirty('stage','companion');
  }
}
function allySummonOwnerCount(ownerId, now){
  return livingAllySummons(now).filter(unit => unit._ownerId === ownerId).length;
}
function allySummonRoom(skill, ownerId, now){
  const living = livingAllySummons(now);
  const ownerCap = Math.max(1, skill?.summonCap || skill?.summonCount || 1);
  const totalCap = Math.max(ownerCap, skill?.summonTotalCap || 5);
  const ownCount = living.filter(unit => unit._ownerId === ownerId).length;
  return Math.max(0, Math.min(ownerCap - ownCount, totalCap - living.length));
}
function canSummonAllies(skill, ownerId, now){
  return allySummonRoom(skill, ownerId, now) > 0;
}
function allySummonUnlockCount(skill, owner, cfg){
  const extraCount = Array.isArray(cfg?.extraSkills) ? cfg.extraSkills.length : 0;
  if(owner?.source === 'companion'){
    const slots = Math.max(1, owner?.summonSkillSlots || skill?.summonSkillSlots || 2);
    return Math.max(1, Math.min(1 + extraCount, slots));
  }
  if(owner?.source !== 'hero') return 1;
  const baseLvl = Math.max(1, skill?.unlockLvl || owner?.lvl || state.hero.lvl || 1);
  const ownerLvl = Math.max(baseLvl, owner?.lvl || state.hero.lvl || baseLvl);
  return Math.max(1, Math.min(1 + extraCount, 1 + Math.floor(Math.max(0, ownerLvl - baseLvl) / 10)));
}
function makeAllySummonSkillPack(skill, cfg, owner, now, index){
  const primary = {
    name:skill.summonSkillName || cfg.skillName || '协同猛袭',
    icon:skill.summonSkillIcon || cfg.skillIcon || skill.summonIcon || cfg.icon || '✨',
    mul:skill.summonSkillMul || cfg.skillMul || 1.75,
    cdMs:skill.summonSkillCd || cfg.skillCd || 7800,
    dotPct:skill.summonSkillDotPct ?? cfg.skillDotPct ?? 0,
    dotMs:skill.summonSkillDotMs || cfg.skillDotMs || 7000,
    slow:skill.summonSkillSlow ?? cfg.skillSlow ?? false,
    slowMs:skill.summonSkillSlowMs || cfg.skillSlowMs || 4000,
    stun:skill.summonSkillStun ?? cfg.skillStun ?? false,
    stunMs:skill.summonSkillStunMs || cfg.skillStunMs || 1200,
    sunder:skill.summonSkillSunder ?? cfg.skillSunder ?? false,
    sunderMs:skill.summonSkillSunderMs || cfg.skillSunderMs || 12000,
    splashPct:skill.summonSkillSplashPct ?? cfg.skillSplashPct ?? 0,
    stateKey:skill.summonSkillStateKey || cfg.skillStateKey || '',
    stateMs:skill.summonSkillStateMs || cfg.skillStateMs || 7000,
    critBonus:skill.summonSkillCrit ?? cfg.skillCrit ?? 0,
    critdBonus:skill.summonSkillCritd ?? cfg.skillCritd ?? 0,
    healSelfPct:skill.summonSkillHealSelfPct ?? cfg.skillHealSelfPct ?? 0,
    bonusVsBoss:skill.summonSkillBonusVsBoss ?? cfg.skillBonusVsBoss ?? 0,
    bonusVsDot:skill.summonSkillBonusVsDot ?? cfg.skillBonusVsDot ?? 0,
    bonusVsSlow:skill.summonSkillBonusVsSlow ?? cfg.skillBonusVsSlow ?? 0,
    bonusVsState:skill.summonSkillBonusVsState || cfg.skillBonusVsState || '',
    bonusStatePct:skill.summonSkillBonusStatePct ?? cfg.skillBonusStatePct ?? 0,
    executeBonus:skill.summonSkillExecuteBonus ?? cfg.skillExecuteBonus ?? 0,
    executeThreshold:skill.summonSkillExecuteThreshold ?? cfg.skillExecuteThreshold ?? 0.35,
    desc:`主动技能 · 冷却 ${((skill.summonSkillCd || cfg.skillCd || 7800) / 1000).toFixed(1).replace(/\.0$/,'')} 秒`
  };
  const unlocked = allySummonUnlockCount(skill, owner, cfg);
  const extras = Array.isArray(cfg.extraSkills) ? cfg.extraSkills.slice(0, Math.max(0, unlocked - 1)) : [];
  const all = [primary].concat(extras);
  return all.map((entry, skillIdx) => ({
    name:entry.name || primary.name,
    icon:entry.icon || primary.icon,
    mul:entry.mul || primary.mul,
    cdMs:entry.cdMs || primary.cdMs,
    dotPct:entry.dotPct ?? 0,
    dotMs:entry.dotMs || 7000,
    slow:!!entry.slow,
    slowMs:entry.slowMs || 4000,
    stun:!!entry.stun,
    stunMs:entry.stunMs || 1200,
    sunder:!!entry.sunder,
    sunderMs:entry.sunderMs || 12000,
    splashPct:entry.splashPct ?? 0,
    stateKey:entry.stateKey || '',
    stateMs:entry.stateMs || 7000,
    critBonus:entry.critBonus || 0,
    critdBonus:entry.critdBonus || 0,
    healSelfPct:entry.healSelfPct ?? 0,
    bonusVsBoss:entry.bonusVsBoss || 0,
    bonusVsDot:entry.bonusVsDot || 0,
    bonusVsSlow:entry.bonusVsSlow || 0,
    bonusVsState:entry.bonusVsState || '',
    bonusStatePct:entry.bonusStatePct ?? 0,
    executeBonus:entry.executeBonus || 0,
    executeThreshold:entry.executeThreshold ?? 0.35,
    desc:entry.desc || primary.desc,
    readyAt:now + (owner?.source === 'companion' ? 2800 : 3600) + index * 380 + skillIdx * 620 + rng(0, 520),
  }));
}
function allySummonFrenzyActive(unit){
  return !!(unit?.frenzyThreshold > 0 && unit?.hp > 0 && unit?.hpMax > 0 && unit.hp <= unit.hpMax * unit.frenzyThreshold);
}
function allySummonAttackSpeed(unit){
  let spd = Math.max(0.45, unit?.spd || 1);
  if(allySummonFrenzyActive(unit)) spd *= unit.frenzySpdMul || 1;
  return spd;
}
function allySummonDamageMult(unit, mon, skill, now){
  let mult = 1;
  const applyBonus = src => {
    if(!src || !mon) return;
    if(src.bonusVsBoss && mon.isBoss) mult *= 1 + src.bonusVsBoss;
    if(src.bonusVsDot && getMonsterDotCount(mon, now) > 0) mult *= 1 + src.bonusVsDot;
    if(src.bonusVsSlow && mon.slowUntil > now) mult *= 1 + src.bonusVsSlow;
    if(src.bonusVsState && monsterStateActive(mon, src.bonusVsState)) mult *= 1 + (src.bonusStatePct || 0.3);
    if(src.executeBonus && mon.hp > 0 && mon.hp <= mon.hpMax * (src.executeThreshold || 0.35)) mult *= 1 + src.executeBonus;
  };
  applyBonus(unit);
  applyBonus(skill);
  if(allySummonFrenzyActive(unit)) mult *= 1 + (unit.frenzyAtkBonus || 0);
  return mult;
}
function allySummonSkillDisplay(unit){
  const skills = Array.isArray(unit?._skills) && unit._skills.length ? unit._skills : null;
  if(!skills){
    return {
      icon:unit?._skillIcon || unit?.icon || '✨',
      name:unit?._skillName || '协同猛袭',
      readyAt:unit?._skillReadyAt || 0,
      count:1,
    };
  }
  let soonest = skills[0];
  for(const skill of skills){
    if((skill.readyAt || 0) < (soonest.readyAt || 0)) soonest = skill;
  }
  return {
    icon:skills[0].icon || unit?.icon || '✨',
    name:skills[0].name || '协同猛袭',
    readyAt:soonest.readyAt || 0,
    count:skills.length,
  };
}
function pickAllySummonSkill(unit, now){
  const skills = Array.isArray(unit?._skills) ? unit._skills : [];
  if(!skills.length) return null;
  const start = Math.max(0, unit._skillCursor || 0) % skills.length;
  for(let i = 0; i < skills.length; i++){
    const idx = (start + i) % skills.length;
    if((skills[idx].readyAt || 0) <= now){
      unit._skillCursor = (idx + 1) % skills.length;
      return skills[idx];
    }
  }
  return null;
}
function allySummonDamageSource(unit){
  return unit?._ownerType === 'companion' ? 'comp' : 'hero';
}
function allySideFloatOpts(opts){
  return Object.assign({ lane:'ally-right' }, opts || {});
}
function applyAllySummonSplash(unit, mon, dmg, pct, icon, color){
  pct = Math.max(0, pct || 0);
  if(pct <= 0 || !Array.isArray(state.currentMonsters)) return;
  for(const target of state.currentMonsters){
    if(target === mon || !target || target.hp <= 0) continue;
    let splash = Math.max(1, Math.floor(dmg * pct));
    splash = absorbMonsterBarrier(target, splash, icon || unit?.icon || '💥').remaining;
    const dr = monsterDamageReduction(target, Date.now());
    if(dr && splash > 0) splash = Math.max(1, Math.floor(splash * (1 - dr)));
    if(splash <= 0) continue;
    target.hp -= splash;
    trackDmg(allySummonDamageSource(unit), splash, false, unit?._skillName || unit?.baseName || unit?.name);
    showMonsterFloat(target, (icon || unit?.icon || '💥') + '-' + splash, color || '#fca5a5', allySideFloatOpts({ variant:'comp', scale:1, important:true }));
  }
}
function makeAllySummon(skill, owner, now, index){
  const theme = skill.summonTheme || 'generic';
  const cfg = ALLY_SUMMON_THEMES[theme] || ALLY_SUMMON_THEMES.generic;
  const ownerIsCompanion = owner?.source === 'companion';
  const ownerBoost = owner?.source === 'companion' ? COMPANION_SUMMON_BOOST : (owner?.source === 'hero' ? HERO_SUMMON_BOOST : null);
  const summonPower = (skill.summonPower || 1) * (ownerBoost?.power || 1);
  const summonName = skill.summonName || choice(cfg.names || ['召唤兽']);
  const summonIcon = skill.summonIcon || cfg.icon || owner.icon || '🐾';
  const fullName = Array.from(String(summonName || '')).some(ch => /[^\u4e00-\u9fa5A-Za-z0-9]/.test(ch)) ? summonName : `${summonIcon}${summonName}`;
  const hpPct = (skill.summonHpPct || cfg.hpPct || 0.24) * (ownerBoost?.hp || 1);
  const atkPct = (skill.summonAtkPct || cfg.atkPct || 0.58) * (ownerBoost?.atk || 1);
  const defPct = (skill.summonDefPct || cfg.defPct || 0.54) * (ownerBoost?.def || 1);
  const spd = +((skill.summonSpd || cfg.spd || 1) * (ownerBoost?.spd || 1)).toFixed(2);
  const durationMs = skill.summonDuration || cfg.duration || 18000;
  const summonSkills = makeAllySummonSkillPack(skill, cfg, owner, now, index);
  const displaySkill = summonSkills[0] || {};
  const skillDisplay = { icon:displaySkill.icon || summonIcon || '✨', name:displaySkill.name || '协同猛袭', readyAt:displaySkill.readyAt || 0 };
  const unlockedSkills = summonSkills.length;
  const skillUnlockText = owner?.source === 'hero'
    ? `主角召唤成长：每高于解锁等级 10 级多解锁 1 个技能（当前 ${unlockedSkills} 个）`
    : `随从召唤成长：按随从品质/星级解锁额外技能（当前 ${unlockedSkills} 个）`;
  return {
    _uid:`ally-${allySummonUidSeq++}`,
    name:fullName,
    baseName:summonName,
    icon:summonIcon,
    lvl:owner.lvl || state.hero.lvl || 1,
    hpMax:Math.max(12, Math.floor((owner.hpMax || state.hero.hpMax || 50) * hpPct * summonPower)),
    hp:0,
    atk:Math.max(1, Math.floor((owner.atk || state.hero.atk || 1) * atkPct * summonPower)),
    def:Math.max(0, Math.floor((owner.def || state.hero.def || 0) * defPct * summonPower)),
    spd,
    crit:(skill.summonCrit || cfg.crit || Math.max(5, Math.floor((owner.crit || state.hero.crit || 5) * 0.45))) + (ownerBoost?.crit || 0),
    critd:(skill.summonCritd || cfg.critd || Math.max(150, Math.floor((owner.critd || state.hero.critd || 150) * 0.92))) + (ownerBoost?.critd || 0),
    aggro:skill.summonAggro ?? cfg.aggro ?? 0.44,
    dotPct:skill.summonDotPct ?? cfg.dotPct ?? 0,
    dotMs:skill.summonDotMs || cfg.dotMs || 5000,
    slow:!!skill.summonSlow,
    slowMs:skill.summonSlowMs || 3000,
    splashPct:skill.summonSplashPct ?? cfg.splashPct ?? 0,
    leechPct:skill.summonLeechPct ?? cfg.leechPct ?? 0,
    damageTakenMult:skill.summonDamageTakenMult ?? cfg.damageTakenMult ?? 1,
    bonusVsBoss:skill.summonBonusVsBoss ?? cfg.bonusVsBoss ?? 0,
    bonusVsDot:skill.summonBonusVsDot ?? cfg.bonusVsDot ?? 0,
    bonusVsSlow:skill.summonBonusVsSlow ?? cfg.bonusVsSlow ?? 0,
    bonusVsState:skill.summonBonusVsState || cfg.bonusVsState || '',
    bonusStatePct:skill.summonBonusStatePct ?? cfg.bonusStatePct ?? 0,
    executeBonus:skill.summonExecuteBonus ?? cfg.executeBonus ?? 0,
    executeThreshold:skill.summonExecuteThreshold ?? cfg.executeThreshold ?? 0.35,
    retaliatePct:skill.summonRetaliatePct ?? cfg.retaliatePct ?? 0,
    reviveOnce:skill.summonReviveOnce ?? cfg.reviveOnce ?? false,
    revivePct:skill.summonRevivePct ?? cfg.revivePct ?? 0.35,
    frenzyThreshold:skill.summonFrenzyThreshold ?? cfg.frenzyThreshold ?? 0,
    frenzyAtkBonus:skill.summonFrenzyAtkBonus ?? cfg.frenzyAtkBonus ?? 0,
    frenzySpdMul:skill.summonFrenzySpdMul ?? cfg.frenzySpdMul ?? 1,
    _skills:summonSkills,
    _skillCursor:0,
    _skillName:skillDisplay.name,
    _skillIcon:skillDisplay.icon,
    _skillReadyAt:skillDisplay.readyAt,
    _skillUnlockText:skillUnlockText,
    _ownerId:owner.id,
    _ownerName:owner.name,
    _ownerType:owner.source,
    _ownerIcon:owner.icon,
    _ownerSkill:skill.name,
    _theme:theme,
    expireAt:now + durationMs,
    _nextAtkAt:now + (ownerIsCompanion ? 260 : 450) + index * 140 + rng(0, 220),
  };
}
function summonAlliedUnits(skill, now, owner){
  if(!skill || !owner) return 0;
  pruneAllySummons(now);
  const room = allySummonRoom(skill, owner.id, now);
  const count = Math.max(0, Math.min(skill.summonCount || 1, room));
  if(count <= 0) return 0;
  const pool = ensureAllySummons();
  for(let i = 0; i < count; i++){
    const summon = makeAllySummon(skill, owner, now, i);
    summon.hp = summon.hpMax;
    pool.push(summon);
  }
  const anchor = owner.source === 'companion' ? $('comp-mini') : $('hero-emoji');
  if(anchor) showFloat(anchor, (skill.icon || '🐾') + '召唤', '#93c5fd', { variant:'shield', scale:1.03 });
  markDirty('stage','companion');
  return count;
}
function applyAllySummonDamage(unit, amount, mon, opts){
  if(!unit || unit.hp <= 0) return 0;
  const taken = Math.max(1, Math.floor((amount || 0) * Math.max(0.3, unit.damageTakenMult || 1)));
  unit.hp = Math.max(0, unit.hp - taken);
  if(unit.retaliatePct > 0 && mon && mon.hp > 0){
    const retaliate = Math.max(1, Math.floor(taken * unit.retaliatePct));
    mon.hp -= retaliate;
    trackDmg(allySummonDamageSource(unit), retaliate, false, '反击');
    showMonsterFloat(mon, (unit.icon || '🛡️') + '-' + retaliate, '#fca5a5', allySideFloatOpts({ variant:'comp', scale:1.02 }));
  }
  if(opts?.show !== false){
    const anchor = allySummonAnchor(unit);
    const text = typeof opts?.label === 'function' ? opts.label(taken) : (opts?.label || ('-' + taken));
    showFloat(anchor, text, opts?.color || '#ff9aa0', { variant: mon?.isBoss ? 'boss' : 'comp', scale:mon?.isBoss ? 1.05 : 1 });
  }
  if(unit.hp <= 0 && unit.reviveOnce && !unit._revived){
    unit._revived = true;
    unit.hp = Math.max(1, Math.floor(unit.hpMax * Math.max(0.2, unit.revivePct || 0.35)));
    unit._nextAtkAt = Date.now() + 900;
    showFloat(allySummonAnchor(unit), '✨复苏', '#6ee7b7', { variant:'heal', scale:1.06 });
    log(`${unit.name} 再度站起继续作战!`,'good');
  } else if(unit.hp <= 0) log(`${unit.name} 被击溃了`,'bad');
  markDirty('stage');
  return taken;
}
function activeCompanionIsTank(){
  const comp=getActiveCompanion();if(!comp)return false;
  const tpl=COMPANIONS.find(c=>c.key===comp.key);
  return !!(tpl&&tpl.role==='tank');
}
function pickMonsterAttackTarget(now){
  // 坦克随从在场且存活时,会主动护卫并高可靠吸仇恨
  const tankPresent = companionTargetable() && activeCompanionIsTank();
  const guardActive = tankPresent && ((state._compGuardUntil || 0) > now || companionTacticKey() === 'guard');
  if(tankPresent && (guardActive ? Math.random()<0.96 : Math.random()<0.88)){
    state._compGuardUntil = Math.max(state._compGuardUntil || 0, now + (guardActive ? 3200 : 1800));
    return { kind:'companion', guard:guardActive };
  }
  const choices = [{ kind:'hero', weight:1.05 }];
  // 坦克随从已由上面的 90% 短路处理,剩余 10% 只在 英雄/召唤物 间分配;非坦克随从仍按仇恨权重参与
  if(companionTargetable() && !tankPresent) choices.push({ kind:'companion', weight:Math.max(0.18, compAggroChance() * 1.7) });
  for(const unit of livingAllySummons(now)) choices.push({ kind:'summon', unit, weight:Math.max(0.12, unit.aggro || 0.35) });
  let total = 0;
  for(const choice of choices) total += choice.weight;
  let roll = Math.random() * total;
  for(const choice of choices){
    roll -= choice.weight;
    if(roll <= 0) return choice;
  }
  return choices[0];
}
function tickAllySummons(now){
  pruneAllySummons(now);
  const summons = livingAllySummons(now);
  if(!summons.length || getAliveMonsters().length === 0) return;
  for(const unit of summons){
    if(unit.hp <= 0 || (unit.expireAt || 0) <= now) continue;
    if((unit._nextAtkAt || 0) > now) continue;
    focusHighestThreat();
    const target = state.currentMonsters.find(mon => mon && mon.hp > 0);
    if(!target) break;
    const summonSkill = pickAllySummonSkill(unit, now);
    const useSkill = !!summonSkill;
    const skillIcon = useSkill ? (summonSkill.icon || unit.icon || '✨') : (unit.icon || '🐾');
    const dmgMult = allySummonDamageMult(unit, target, summonSkill, now);
    const hit = calcDmg(
      unit.atk * dmgMult * (useSkill ? (summonSkill.mul || 1.75) : 1),
      monArmor(target),
      (unit.crit || 5) + (useSkill ? (summonSkill.critBonus || 0) : 0),
      (unit.critd || 150) + (useSkill ? (summonSkill.critdBonus || 0) : 0),
      false,
      target.lvl,
      unit.lvl || state.hero.lvl
    );
    let dealt = absorbMonsterBarrier(target, hit.dmg, skillIcon).remaining;
    const dr = monsterDamageReduction(target, now);
    if(dr && dealt > 0) dealt = Math.max(1, Math.floor(dealt * (1 - dr)));
    target.hp -= dealt;
    if(dealt > 0){
      trackDmg(allySummonDamageSource(unit), dealt, hit.crit, useSkill ? (summonSkill.name || unit.baseName || unit.name) : (unit.baseName || unit.name));
      showMonsterFloat(target, skillIcon + '-' + dealt, hit.crit ? '#fbbf24' : (useSkill ? '#c4b5fd' : '#7dd3fc'), allySideFloatOpts({ variant:hit.crit ? 'crit' : 'comp', scale:(hit.crit || useSkill) ? 1.1 : 1, important:true }));
      if(unit.dotPct > 0) applyMonsterDot(target, `allysummon:${unit._uid}`, Math.max(1, Math.floor(dealt * unit.dotPct)), unit.dotMs || 5000, { icon:unit.icon || '🔥', name:unit.baseName || unit.name, source:unit._ownerName || '召唤物' });
      if(unit.slow) target.slowUntil = Math.max(target.slowUntil || 0, now + (unit.slowMs || 3000));
      if(unit.splashPct > 0) applyAllySummonSplash(unit, target, dealt, unit.splashPct, unit.icon || '💥', '#fda4af');
      if(unit.leechPct > 0 && unit.hp > 0){
        const heal = Math.max(1, Math.floor(dealt * unit.leechPct));
        unit.hp = Math.min(unit.hpMax, unit.hp + heal);
        showFloat(allySummonAnchor(unit), '+' + heal, '#6ee7b7', { variant:'heal', scale:1.02 });
      }
      if(useSkill){
        showMonsterFloat(target, `${skillIcon}${summonSkill.name || '技能'}`, '#f9a8d4', allySideFloatOpts({ variant:'comp', scale:1.02 }));
        unit._skillName = summonSkill.name || unit._skillName || '协同猛袭';
        unit._skillIcon = summonSkill.icon || unit._skillIcon || unit.icon || '✨';
        if(summonSkill.dotPct > 0) applyMonsterDot(target, `allysummon-skill:${unit._uid}:${summonSkill.name || 'skill'}`, Math.max(1, Math.floor(dealt * summonSkill.dotPct)), summonSkill.dotMs || 7000, { icon:skillIcon, name:summonSkill.name || '召唤技', source:unit.baseName || unit.name });
        if(summonSkill.slow) target.slowUntil = Math.max(target.slowUntil || 0, now + (summonSkill.slowMs || 4000));
        if(summonSkill.stun) target.stunUntil = Math.max(target.stunUntil || 0, now + (summonSkill.stunMs || 1200));
        if(summonSkill.sunder) target.sunderUntil = Math.max(target.sunderUntil || 0, now + (summonSkill.sunderMs || 12000));
        if(summonSkill.stateKey) applyMonsterState(target, summonSkill.stateKey, summonSkill.stateMs || 7000);
        if(summonSkill.splashPct > 0) applyAllySummonSplash(unit, target, dealt, summonSkill.splashPct, skillIcon, '#fda4af');
        if(summonSkill.healSelfPct > 0 && unit.hp > 0){
          const heal = Math.max(1, Math.floor(unit.hpMax * summonSkill.healSelfPct));
          unit.hp = Math.min(unit.hpMax, unit.hp + heal);
          showFloat(allySummonAnchor(unit), '+' + heal, '#6ee7b7', { variant:'comp', scale:1.02 });
        }
        summonSkill.readyAt = now + Math.max(4800, summonSkill.cdMs || 7800);
      }
    }
    const skillDisplay = allySummonSkillDisplay(unit);
    unit._skillName = skillDisplay.name;
    unit._skillIcon = skillDisplay.icon;
    unit._skillReadyAt = skillDisplay.readyAt;
    unit._nextAtkAt = now + Math.max(650, Math.floor(1000 / allySummonAttackSpeed(unit)));
  }
}
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
  const count = Math.max(0, desiredCount == null ? 1 : desiredCount);
  if(count === 0) return [];
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

function wildMonsterHpMultiplier(lvl){
  const level = Math.max(1, Math.floor(lvl || 1));
  const curveLow = Math.max(0, Math.min(1, (level - 10) / 25));
  const curveMid = Math.max(0, Math.min(1, (level - 40) / 30));
  const curveHigh = Math.max(0, Math.min(1, (level - 70) / 20));
  const curveEnd = Math.max(0, Math.min(1, (level - 95) / 15));
  return +(3.2 + curveLow * 0.55 + curveMid * 0.75 + curveHigh * 0.95 + curveEnd * 0.65).toFixed(2);
}
function applyWildMonsterHpScaling(mon, lvl){
  if(!mon || mon.isBoss) return mon;
  const mult = wildMonsterHpMultiplier(lvl || mon.lvl);
  mon.hpMax = Math.max(1, Math.floor(mon.hpMax * mult));
  mon.hp = mon.hpMax;
  mon._wildMonster = true;
  mon._wildHpMult = mult;
  return mon;
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
  state._currentRareElite = null;
  // 新战斗清除随从护盾;英雄护盾改为按持续时间到期(不再每波清盾,否则秒杀刷怪时护盾瞬间消失)
  state._compBarrier = 0;
  if(state.mode==='travel')return;
  if(state.mode==='dungeon'||state.mode==='mythic')return spawnDungeonMonster();
  if(state.mode==='tower')return spawnTowerMonster();
  if(state.mode==='roguelike')return typeof spawnRoguelikeMonster==='function'?spawnRoguelikeMonster():null;
  if(state.mode==='boss')return spawnZoneBoss();
  const map=getMap();if(!map){state.currentMap=MAPS[0].key;state.currentSubzone=0;return spawnMonster();}
  const sub=map.sub[state.currentSubzone]||map.sub[0];
  if(typeof maybeSpawnRareEliteEncounter==='function'&&maybeSpawnRareEliteEncounter(map, sub)) return;
  // 敌群:野外可同时刷出 1~4 只敌人(怪群越大,单只攻击略降,避免瞬秒,但总收益更高)
  const packRoll=Math.random();
  const count=packRoll<0.07?4:packRoll<0.25?3:packRoll<0.55?2:1;
  const atkDamp=count>=3?0.8:(count===2?0.9:1);
  for(let i=0;i<count;i++){
    const mobName=choice(sub.mobs.split('|'));const lvl=rng(sub.lvl[0],sub.lvl[1]);
    const rareRoll=Math.random();
    const maxR=rareRoll<0.06?'epic':rareRoll<0.20?'rare':'uncommon';   // 2026-06-16 提高小怪爆蓝/紫上限概率(epic 0.02→0.06, rare 0.08→0.20)
    const m=makeMonster(mobName,lvl,false,maxR);
    applyWildMonsterHpScaling(m, lvl);
    if(atkDamp!==1)m.atk=Math.max(1,Math.floor(m.atk*atkDamp));
    m.threat=m.atk*(0.6+Math.random()*0.8);   // 初始仇恨(攻击越高越容易被英雄锁定)
    state.currentMonsters.push(m);
  }
  applyCompanionChallengeScalingToCurrent();
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
  applyCompanionChallengeScalingToCurrent();
}
function spawnDungeonMonster(){
  state.currentMonsters=[];const ds=state.dungeonState||state.mythicState;if(!ds)return;
  const dg=DUNGEONS.find(d=>d.key===ds.key);if(!dg)return;
  const boss=(dg.bosses||[]).find(b=>b.wave===ds.wave);const isBoss=!!boss;
  const isEpicRaid=!!dg.epicRaid;
  const dungeonPower=(typeof dg.powerLvl==='number'&&dg.powerLvl>0)?dg.powerLvl:dg.reqLvl;
  const power=dungeonPower+(isBoss?3:0);
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
  const _dgTier = (typeof gearTierForDungeon==='function') ? gearTierForDungeon(dg.key) : (isEpicRaid?3:0);
  const req = dg.reqLvl || power;
  const curveLow = Math.max(0, Math.min(1, (req - 20) / 25));
  const curveMid = Math.max(0, Math.min(1, (req - 45) / 25));
  const curveHigh = Math.max(0, Math.min(1, (req - 70) / 10));
  const curve = {
    hp: 1 + curveLow * 0.18 + curveMid * 0.42 + curveHigh * 0.72,
    atk: 1 + curveLow * 0.15 + curveMid * 0.55 + curveHigh * 0.95,
    def: 1 + curveLow * 0.08 + curveMid * 0.24 + curveHigh * 0.42,
  };
  const atkTempo = 1 + curveLow * 0.04 + curveMid * 0.08 + curveHigh * 0.12;
  state.currentMonsters.push({name,isBoss,bossName:isBoss?boss.name:null,
    lvl:Math.max(1,Math.floor(power*1.05)),
    hpMax:Math.floor((100+power*power*8.6)*(isBoss?29.5:4.8)*scale*curve.hp),hp:Math.floor((100+power*power*8.6)*(isBoss?29.5:4.8)*scale*curve.hp),
    atk:Math.floor((12+power*3.7+Math.pow(power,1.18)*1.45)*(isBoss?2.35:1.85)*scale*curve.atk),def:Math.floor((4+power*1.7)*(isBoss?1.62:1.72)*scale*curve.def),
    baseGold:Math.floor(10+power*3),baseXp:Math.floor(35+power*5),
    goldReward:Math.floor((10+power*3)*(isBoss?15:1.5)*scale),honorReward:isBoss?Math.floor(25+power*2.5):2,
    dropRate:isBoss?1.0:0.35,gemChance:isBoss?0.8:0.05,maxRarity:bossMaxRarity,fromDungeon:true,_uid:monUidSeq++,
    _dots:{},_dotLegacyImported:true,_lastDotTick:0,
    _isRaidFinal:isRaid&&isFinalBoss,_isRaid:isRaid,_isEpicRaid:isEpicRaid,
    _spawnAt:Date.now(),
    _monSkills:isBoss?[]:monSkills,_monSkill:isBoss?null:(monSkills[0]||null),_monSupportSkills:buildMonsterSupportPool(isBoss?boss.name:name,null,power,isBoss,isBoss?bossSupportSkillCount:trashSupportSkillCount),_supportSkillCooldowns:{},_lastSupportSkill:Date.now()-rng(3000,9000),_lastSkill:Date.now()-rng(1000,4000),_lastTrick:0,_nextTrickAt:isBoss?(Date.now()+8000+rng(0,2500)):0,
    atkInterval:Math.max(isBoss?900:1080, Math.floor(((isBoss?1400:1700)/atkTempo)+rng(-160,160))),_lastAtk:Date.now()-rng(0,1200)});
  // 来源难度梯队:怪物强度 普通(0) < 英雄(1) < 团本(2) < 史诗团本(3=原史诗团本值,不变)
  const mon = state.currentMonsters[state.currentMonsters.length-1];
  const DG_TIER_MON = {
    1:{ trash:{hp:1.55,atk:1.34,def:1.20}, boss:{hp:1.90,atk:1.56,def:1.34}, final:{hp:2.20,atk:1.74,def:1.42} },   // 英雄
    2:{ trash:{hp:1.95,atk:1.56,def:1.28}, boss:{hp:2.60,atk:1.95,def:1.48}, final:{hp:3.10,atk:2.24,def:1.64} },   // 团本
    3:{ trash:{hp:2.25,atk:1.74,def:1.34}, boss:{hp:3.05,atk:2.18,def:1.60}, final:{hp:3.80,atk:2.52,def:1.84} },   // 史诗团本
    4:{ trash:{hp:1.85,atk:1.50,def:1.28}, boss:{hp:2.45,atk:1.82,def:1.42}, final:{hp:2.85,atk:2.05,def:1.55} },   // 史诗5人本(介于英雄/团本之间)
  };
  const _tm = DG_TIER_MON[_dgTier];
  if (_tm) {
    const m = isBoss ? (isFinalBoss ? _tm.final : _tm.boss) : _tm.trash;
    mon.hpMax = Math.floor(mon.hpMax * m.hp); mon.hp = mon.hpMax;
    mon.atk = Math.floor(mon.atk * m.atk);
    mon.def = Math.floor(mon.def * m.def);
    if (_dgTier >= 2) {   // 团本/史诗团本额外给奖励(英雄本的回报来自更高品质装备梯队)
      mon.goldReward = Math.floor(mon.goldReward * (isBoss ? 1.5 : 1.25));
      mon.baseXp = Math.floor(mon.baseXp * (isBoss ? 1.45 : 1.2));
    }
  }
  if (state.mode === 'dungeon' && ds.contractLevel > 0 && typeof dungeonContractInfo === 'function') {
    const contract = dungeonContractInfo(ds.contractLevel);
    mon.hpMax = Math.floor(mon.hpMax * (contract.hp || 1)); mon.hp = mon.hpMax;
    mon.atk = Math.floor(mon.atk * (contract.atk || 1));
    mon.def = Math.floor(mon.def * (contract.def || 1));
    mon.goldReward = Math.floor(mon.goldReward * (contract.reward || 1));
    mon.baseXp = Math.floor(mon.baseXp * (1 + ((contract.reward || 1) - 1) * 0.5));
    mon._dungeonContractLevel = ds.contractLevel;
  }
  if (state.mode === 'dungeon' && Array.isArray(ds.edicts) && ds.edicts.length) {
    for (const edict of ds.edicts) {
      const mod = edict.mod || {};
      if (mod.trashHp && !isBoss) { mon.hpMax = Math.floor(mon.hpMax * (1 + mod.trashHp)); mon.hp = mon.hpMax; }
      if (mod.bossHp && isBoss) { mon.hpMax = Math.floor(mon.hpMax * (1 + mod.bossHp)); mon.hp = mon.hpMax; }
      if (mod.trashDmg && !isBoss) mon.atk = Math.floor(mon.atk * (1 + mod.trashDmg));
      if (mod.bossDmg && isBoss) mon.atk = Math.floor(mon.atk * (1 + mod.bossDmg));
      if (mod.trashDef && !isBoss) mon.def = Math.floor(mon.def * (1 + mod.trashDef));
      if (mod.bossDef && isBoss) mon.def = Math.floor(mon.def * (1 + mod.bossDef));
    }
    mon._dungeonEdicts = ds.edicts;
  }
  const alertInfo = (state.mode === 'dungeon' && typeof dungeonAlertInfo === 'function') ? dungeonAlertInfo(ds) : null;
  if (alertInfo && alertInfo.level > 0) {
    mon.hpMax = Math.floor(mon.hpMax * alertInfo.hp); mon.hp = mon.hpMax;
    mon.atk = Math.floor(mon.atk * alertInfo.atk);
    mon.def = Math.floor(mon.def * alertInfo.def);
    mon.atkInterval = Math.max(isBoss ? 720 : 840, Math.floor(mon.atkInterval / alertInfo.haste));
    mon.goldReward = Math.floor(mon.goldReward * alertInfo.reward);
    mon.baseXp = Math.floor(mon.baseXp * (1 + ((alertInfo.reward || 1) - 1) * 0.5));
    mon._dungeonAlertLevel = alertInfo.level;
  }
  if (state.mode === 'dungeon' && ds.timer?.expired && ds.timer.overtimeStacks > 0) {
    const overtime = Math.min(12, ds.timer.overtimeStacks || 0);
    const mult = 1 + overtime * 0.045;
    mon.hpMax = Math.floor(mon.hpMax * (1 + overtime * 0.025)); mon.hp = mon.hpMax;
    mon.atk = Math.floor(mon.atk * mult);
    mon.def = Math.floor(mon.def * (1 + overtime * 0.018));
    mon._dungeonOvertimeStacks = overtime;
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
      if (mod.trashDmg && !isBoss) mon.atk = Math.floor(mon.atk * (1+mod.trashDmg));
      if (mod.trashDef && !isBoss) mon.def = Math.floor(mon.def * (1+mod.trashDef));
      if (mod.bossDef && isBoss) mon.def = Math.floor(mon.def * (1+mod.bossDef));
      if (mod.trashHaste && !isBoss) mon.atkInterval = Math.max(760, Math.floor(mon.atkInterval / (1 + mod.trashHaste)));
      if (mod.bossHaste && isBoss) mon.atkInterval = Math.max(640, Math.floor(mon.atkInterval / (1 + mod.bossHaste)));
      if (mod.bossLeech && isBoss) mon.lifeSteal = Math.max(mon.lifeSteal || 0, mod.bossLeech);
      if (mod.bonusGoldPct) mon.goldReward = Math.floor(mon.goldReward * (1 + mod.bonusGoldPct));
    }
    if (state.mode === 'dungeon' && !isBoss && ds.affixes.some(a => a?.mod?.addPatrol) && Math.random() < 0.45) {
      const patrol = Object.assign({}, mon, {
        name: `${temoji}巡逻铁卫`,
        hpMax: Math.max(1, Math.floor(mon.hpMax * 0.55)),
        hp: Math.max(1, Math.floor(mon.hpMax * 0.55)),
        atk: Math.max(1, Math.floor(mon.atk * 0.60)),
        def: Math.max(0, Math.floor(mon.def * 0.80)),
        goldReward: Math.max(1, Math.floor(mon.goldReward * 0.45)),
        honorReward: Math.max(1, Math.floor((mon.honorReward || 1) * 0.45)),
        baseXp: Math.max(1, Math.floor(mon.baseXp * 0.45)),
        dropRate: Math.min(mon.dropRate || 0.1, 0.18),
        gemChance: Math.min(mon.gemChance || 0, 0.03),
        _dungeonAdd: true,
        _uid: monUidSeq++,
        _dots: {},
        _dotLegacyImported: true,
        _lastDotTick: 0,
        _spawnAt: Date.now(),
        _monSkills: [],
        _monSkill: null,
        _monSupportSkills: [],
        _supportSkillCooldowns: {},
        _lastAtk: Date.now() - rng(0, 800),
      });
      state.currentMonsters.push(patrol);
    }
  }
  if (alertInfo && alertInfo.level >= 3 && !isBoss && Math.random() < alertInfo.eliteChance) {
    const captain = Object.assign({}, mon, {
      name: `${temoji}戒备队长`,
      hpMax: Math.max(1, Math.floor(mon.hpMax * 0.85)),
      hp: Math.max(1, Math.floor(mon.hpMax * 0.85)),
      atk: Math.max(1, Math.floor(mon.atk * 0.82)),
      def: Math.max(0, Math.floor(mon.def * 1.10)),
      goldReward: Math.max(1, Math.floor(mon.goldReward * 0.70)),
      honorReward: Math.max(1, Math.floor((mon.honorReward || 1) * 0.70)),
      baseXp: Math.max(1, Math.floor(mon.baseXp * 0.70)),
      dropRate: Math.min(0.24, (mon.dropRate || 0.1) + 0.04),
      gemChance: Math.min(0.08, (mon.gemChance || 0) + 0.02),
      _uid: monUidSeq++,
      _dots: {},
      _dotLegacyImported: true,
      _lastDotTick: 0,
      _dungeonAdd: true,
      _spawnAt: Date.now(),
      _supportSkillCooldowns: {},
      _lastSkill: Date.now() - rng(800, 2200),
      _lastAtk: Date.now() - rng(0, 800),
      _lastSupportSkill: Date.now() - rng(1200, 3600),
    });
    state.currentMonsters.push(captain);
    log(`🚨 警戒${alertInfo.level}: ${captain.name} 加入战斗`, 'bad');
  }
  const edictAddChance = state.mode === 'dungeon' && !isBoss
    ? (Array.isArray(ds.edicts) ? ds.edicts : []).concat(Array.isArray(ds.affixes) ? ds.affixes : [])
      .reduce((sum, rule) => sum + (rule?.mod?.edictAddChance || 0) + (rule?.mod?.ambushChance || 0), 0)
    : 0;
  if (edictAddChance > 0 && Math.random() < Math.min(0.55, edictAddChance)) {
    const enforcer = Object.assign({}, mon, {
      name: `${temoji}禁令执法者`,
      hpMax: Math.max(1, Math.floor(mon.hpMax * 0.72)),
      hp: Math.max(1, Math.floor(mon.hpMax * 0.72)),
      atk: Math.max(1, Math.floor(mon.atk * 0.74)),
      def: Math.max(0, Math.floor(mon.def * 0.92)),
      goldReward: Math.max(1, Math.floor(mon.goldReward * 0.55)),
      honorReward: Math.max(1, Math.floor((mon.honorReward || 1) * 0.55)),
      baseXp: Math.max(1, Math.floor(mon.baseXp * 0.55)),
      dropRate: Math.min(0.22, (mon.dropRate || 0.1) + 0.025),
      gemChance: Math.min(0.06, (mon.gemChance || 0) + 0.012),
      _uid: monUidSeq++,
      _dots: {},
      _dotLegacyImported: true,
      _lastDotTick: 0,
      _dungeonAdd: true,
      _spawnAt: Date.now(),
      _supportSkillCooldowns: {},
      _lastSkill: Date.now() - rng(800, 2200),
      _lastAtk: Date.now() - rng(0, 800),
      _lastSupportSkill: Date.now() - rng(1200, 3600),
    });
    state.currentMonsters.push(enforcer);
    state.dungeonState.edictAdds = (state.dungeonState.edictAdds || 0) + 1;
    log(`📜 战术禁令: ${enforcer.name} 加入战斗`, 'bad');
  }
  if (isBoss && typeof getDungeonBossCouncilMembers === 'function') {
    spawnDungeonCouncilMembers(mon, boss, dg, ds);
  }
  if (isBoss && typeof applyDungeonBossTacticsOnSpawn === 'function') {
    for(const bossUnit of (state.currentMonsters || [])){
      if(bossUnit && bossUnit.hp > 0 && bossUnit.isBoss && (bossUnit.bossName === boss.name || bossUnit._councilGroupName === boss.name)){
        applyDungeonBossTacticsOnSpawn(bossUnit, boss, dg, ds);
        if(typeof applyDungeonBossChallengesOnSpawn === 'function') applyDungeonBossChallengesOnSpawn(bossUnit, boss, dg, ds);
        if(typeof applyDungeonBossGrandMechanicsOnSpawn === 'function') applyDungeonBossGrandMechanicsOnSpawn(bossUnit, boss, dg, ds);
      }
    }
  }
  if (state.mode === 'dungeon' && typeof applyDungeonCombatRoomSpawn === 'function') {
    applyDungeonCombatRoomSpawn(ds, dg, mon, isBoss, Date.now());
  }
  applyCompanionChallengeScalingToCurrent();
}

function spawnDungeonCouncilMembers(primary, bossData, dg, ds){
  const members = getDungeonBossCouncilMembers(bossData);
  if(!primary || !bossData || !members || members.length <= 1) return;
  const groupKey = `${dg.key}:${ds.wave}:${bossData.name}`;
  const base = Object.assign({}, primary);
  const count = members.length;
  for(let i = 0; i < count; i++){
    const cfg = members[i];
    const target = i === 0 ? primary : Object.assign({}, base, {
      _uid: monUidSeq++,
      _dots: {},
      _dotLegacyImported: true,
      _lastDotTick: 0,
      _supportSkillCooldowns: {},
      _monSkills: (base._monSkills || []).slice(),
      _monSupportSkills: (base._monSupportSkills || []).slice(),
      _spawnAt: Date.now(),
      _lastAtk: Date.now() - rng(0, 1200),
      _lastSkill: Date.now() - rng(1000, 4000),
      _lastSupportSkill: Date.now() - rng(3000, 9000),
      _nextTrickAt: Date.now() + 7000 + rng(0, 3000),
    });
    target.name = `${cfg.icon || bossData.emoji || '👹'}${cfg.name}`;
    target.bossName = bossData.name;
    target._council = true;
    target._councilGroupKey = groupKey;
    target._councilGroupName = bossData.name;
    target._councilMemberName = cfg.name;
    target._councilRole = cfg.role || '首领成员';
    target._councilMemberIndex = i;
    target._councilMemberCount = count;
    target.hpMax = Math.max(1, Math.floor(base.hpMax * (cfg.hp || 0.7)));
    target.hp = target.hpMax;
    target.atk = Math.max(1, Math.floor(base.atk * (cfg.atk || 0.82)));
    target.def = Math.max(0, Math.floor(base.def * (cfg.def || 1)));
    target.goldReward = Math.max(1, Math.floor((base.goldReward || 1) / count));
    target.honorReward = Math.max(1, Math.floor((base.honorReward || 1) / count));
    target.baseXp = Math.max(1, Math.floor((base.baseXp || 1) / count));
    target._councilLootOnlyOnFinal = true;
    if(i > 0) state.currentMonsters.push(target);
  }
  ds.multiBossWaves = (ds.multiBossWaves || 0) + 1;
  log(`👥 多首领遭遇: ${bossData.name} 分成 ${members.map(m => m.name).join('、')} 同时参战`, 'bad');
}

/* ---------- 伤害 ---------- */
/* 护甲减伤:乘法+递减+封顶75%。护甲常数随"防守方等级"缩放,使低级攻击无法轻易无视高级护甲,
   反过来高级护甲也永远 floor 不到 0(怪在任何装备水平下都还能打疼你)。取代旧的减法 atk-def*0.5。 */
function armorMitig(def,defLvl){const K=50+(defLvl||1)*40;const d=Math.max(0,def||0);return Math.min(0.75,d/(d+K));}
/* 等级差伤害修正:攻方等级高于守方→增伤,低于→减伤。每级±3%,封顶 0.4~1.6 倍。
   这让"20级装备打60级怪"不再可行——越级时你的伤害被压到 0.4 倍、对方伤害放大到 1.6 倍。 */
function lvlDmgMult(atkLvl,defLvl){return Math.max(0.4,Math.min(1.6,1+((atkLvl||1)-(defLvl||1))*0.03));}
function calcDmg(atk,def,crit,critd,forceCrit,defLvl,atkLvl,opts){
  const isCrit=forceCrit||Math.random()*100<(crit||0);
  let base=Math.max(1,atk*(1-armorMitig(def,defLvl)));
  if(atkLvl!==undefined)base*=lvlDmgMult(atkLvl,defLvl);   // 传了攻方等级才启用等级差修正
  base*=(opts&&opts.tightVar)?(0.95+Math.random()*0.1):(0.85+Math.random()*0.3);   // tightVar:收口浮动到 ±5%(BOSS技能用,避免随机尖峰)
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
    setMonsterTrickAura(mon, 'shield', { name:'护盾', icon:'🛡️', desc:'' }, 0, { desc:`护盾可吸收 ${fmt(mon._arcaneShield)} 点任意伤害(单次最多吸收75%)` });
  }else if(mon._trickAuras){
    delete mon._trickAuras.shield;
  }
}
function absorbMonsterBarrier(mon, amount, icon){
  amount = Math.max(0, Math.floor(amount || 0));
  if(!mon || amount <= 0) return { remaining:0, absorbed:0 };
  if(!(mon._arcaneShield > 0)) return { remaining:amount, absorbed:0 };
  const absorbed = shieldAbsorbAmount(mon._arcaneShield, amount);
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
function isPassiveMonsterSupportTrick(skill){
  if(!skill) return false;
  return !!(skill.passiveTrigger || skill.type === 'support' || skill.type === 'buff' || skill.type === 'summon' || skill.type === 'heal' ||
    skill.healPct || skill.shieldPct || skill.summonCount || skill.atkBuffSecs || skill.spdBuffSecs ||
    skill.defBuffSecs || skill.drBuffSecs || skill.critBuffSecs || skill.leechBuffSecs || skill.nextDouble);
}
function bossTrickAvailable(mon, trick, hpFrac, now){
  if(!trick) return false;
  if(typeof trick.hpBelow === 'number' && hpFrac > trick.hpBelow) return false;
  if(typeof trick.hpAbove === 'number' && hpFrac < trick.hpAbove) return false;
  if(isPassiveMonsterSupportTrick(trick) && !canUseMonsterSupportSkill(mon, trick, now || Date.now())) return false;
  return true;
}
function monsterSkillDangerLevel(skill){
  if(!skill) return 0;
  if(skill.threat === 'extreme') return 2;
  if(skill.threat === 'high') return 2;
  if(skill.threat === 'medium') return 1;
  let score = 0;
  if((skill.mul || 0) >= 5) score += 2;
  else if((skill.mul || 0) >= 3) score += 1;
  if(skill.aoe) score += 1;
  if(skill.alwaysCrit) score += 1;
  if(skill.stun || skill.silence || skill.disarm || skill.fear || skill.freeze) score += 2;
  if(skill.summonCount || skill.spdBuff || skill.atkBuffSecs || skill.drBuffSecs || skill.defBuffSecs) score += 1;
  return score >= 4 ? 2 : score >= 2 ? 1 : 0;
}
const BOSS_CAST_THREAT_META = {
  low: { label:'压制', bar:'linear-gradient(90deg,#fbbf24,#f59e0b)', text:'#fde68a' },
  medium: { label:'危险', bar:'linear-gradient(90deg,#fb923c,#f97316)', text:'#fdba74' },
  high: { label:'高危', bar:'linear-gradient(90deg,#ef4444,#dc2626)', text:'#fca5a5' },
  extreme: { label:'致命', bar:'linear-gradient(90deg,#b91c1c,#7f1d1d)', text:'#fecaca' },
};
function bossCastThreatMeta(skill){
  return BOSS_CAST_THREAT_META[skill?.threat] || BOSS_CAST_THREAT_META.low;
}
function bossInterruptTag(skill){
  if(skill?.interruptPolicy === 'hard') return '必断';
  if(skill?.interruptPolicy === 'soft') return '断后削弱';
  if(skill?.interruptPolicy === 'none') return '不可断';
  return '可断';
}
function buildInterruptedBossResidual(skill){
  if(!skill || skill.interruptPolicy !== 'soft') return null;
  const out = {
    name:`${skill.name}·余波`,
    icon:skill.icon || '✨',
    type:'support',
    desc:'被打断后仍留下部分余波',
  };
  let hasEffect = false;
  if(skill.healPct){ out.healPct = +(bossSkillHealPct(skill.healPct) * 0.45).toFixed(3); hasEffect = true; }
  if(skill.shieldPct){ out.shieldPct = +(skill.shieldPct * 0.5).toFixed(3); hasEffect = true; }
  if(skill.atkBuffSecs){ out.atkBuffSecs = Math.max(3, Math.floor(skill.atkBuffSecs * 0.55)); out.atkBuffPct = Math.max(10, Math.floor((skill.atkBuffPct || 30) * 0.55)); hasEffect = true; }
  if(skill.spdBuffSecs){ out.spdBuffSecs = Math.max(3, Math.floor(skill.spdBuffSecs * 0.55)); out.spdBuffPct = Math.max(10, Math.floor((skill.spdBuffPct || 25) * 0.55)); hasEffect = true; }
  if(skill.defBuffSecs){ out.defBuffSecs = Math.max(3, Math.floor(skill.defBuffSecs * 0.55)); out.defBuffPct = Math.max(10, Math.floor((skill.defBuffPct || 25) * 0.55)); hasEffect = true; }
  if(skill.drBuffSecs){ out.drBuffSecs = Math.max(3, Math.floor(skill.drBuffSecs * 0.55)); out.drBuffPct = +Math.max(0.08, (skill.drBuffPct || 0.2) * 0.55).toFixed(2); hasEffect = true; }
  if(skill.critBuffSecs){ out.critBuffSecs = Math.max(3, Math.floor(skill.critBuffSecs * 0.55)); out.critBuffPct = Math.max(10, Math.floor((skill.critBuffPct || 25) * 0.55)); hasEffect = true; }
  if(skill.leechBuffSecs){ out.leechBuffSecs = Math.max(3, Math.floor(skill.leechBuffSecs * 0.55)); out.leechBuffPct = Math.max(8, Math.floor((skill.leechBuffPct || 18) * 0.55)); hasEffect = true; }
  if(skill.summonCount){
    if((skill.summonCount || 0) >= 2){
      out.summonCount = 1;
      out.summonTheme = skill.summonTheme;
      hasEffect = true;
    } else if(!hasEffect){
      out.shieldPct = 0.08;
      hasEffect = true;
    }
  }
  return hasEffect ? out : null;
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
    const heal = bossSkillHealAmount(mon, skill.healPct);
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
  if(skill.nextDouble){   // 普攻追击:接下来 N 次普通攻击会追加一次打击
    mon._nextAtkDouble = (mon._nextAtkDouble || 0) + skill.nextDouble;
    setMonsterTrickAura(mon, 'nextDouble', skill, 0, { stacks:mon._nextAtkDouble, desc:`接下来 ${mon._nextAtkDouble} 次普攻会追加一次打击` });
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
function applyDungeonBossPhase(mon, phase, now){
  if(!mon || !phase) return false;
  const mod = phase.mod || {};
  if(state.dungeonState) state.dungeonState.bossPhasesTriggered = (state.dungeonState.bossPhasesTriggered || 0) + 1;
  const skill = {
    name: phase.name,
    icon: phase.icon || '⚔️',
    shieldPct: mod.shieldPct,
    atkBuffSecs: mod.atkBuffSecs,
    atkBuffPct: mod.atkBuffPct,
    spdBuffSecs: mod.spdBuffSecs,
    spdBuffPct: mod.spdBuffPct,
    defBuffSecs: mod.defBuffSecs,
    defBuffPct: mod.defBuffPct,
    critBuffSecs: mod.critBuffSecs,
    critBuffPct: mod.critBuffPct,
    leechBuffSecs: mod.leechBuffSecs,
    leechBuffPct: mod.leechBuffPct,
    summonCount: mod.summonCount,
    summonTheme: mod.summonTheme,
    cd: 60000,
  };
  applyMonsterSupportSkill(mon, skill, now, { announce:false });
  if(mod.phaseDamagePct){
    const dmg = Math.max(1, Math.floor((state.hero.hpMax || 1) * mod.phaseDamagePct));
    applyHeroDamage(dmg, mon, { label:t=>(phase.icon || '⚔️') + '-' + t, color:'#fb7185', now });
    if(typeof processTalentLowHp === 'function') processTalentLowHp(mon, now);
  }
  if(mod.heroDebuff && typeof applyHeroDebuff === 'function'){
    applyHeroDebuff(mod.heroDebuff, mod.heroDebuffMs || 6000);
  }
  if(mod.manaDrainPct && state.resourceMax){
    const drain = Math.min(state.resource || 0, Math.floor(state.resourceMax * mod.manaDrainPct));
    if(drain > 0){
      state.resource = Math.max(0, state.resource - drain);
      showFloat($('hero-emoji'), '💧-' + drain, '#93c5fd', { variant:'status', scale:1.04 });
    }
  }
  showMonsterFloat(mon, `${phase.icon || '⚔️'}${phase.name}`, '#fb7185', { variant:'boss', scale:1.12, important:true });
  pulseMonsterEl(mon, 'bosscast', 320);
  log(`⚔️ 契约阶段: ${mon.bossName || mon.name} 触发 ${phase.icon || ''}${phase.name}! ${phase.desc || ''}`, 'bad');
  return true;
}
function checkDungeonBossPhases(mon, now){
  if(state.mode !== 'dungeon' || !mon?.isBoss || !state.dungeonState || !mon.bossName) return;
  const ds = state.dungeonState;
  if(!(ds.contractLevel > 0) || typeof getDungeonBossPhases !== 'function') return;
  const dg = DUNGEONS.find(d => d.key === ds.key);
  if(!dg) return;
  const phases = getDungeonBossPhases(dg, mon.bossName, ds.contractLevel);
  if(!phases.length) return;
  const hpFrac = mon.hpMax > 0 ? mon.hp / mon.hpMax : 1;
  let seen = mon._dungeonBossPhaseSeen;
  if(mon._councilGroupKey){
    ds._councilBossPhaseSeen = ds._councilBossPhaseSeen || {};
    seen = ds._councilBossPhaseSeen[mon._councilGroupKey] || {};
    ds._councilBossPhaseSeen[mon._councilGroupKey] = seen;
  }else{
    mon._dungeonBossPhaseSeen = mon._dungeonBossPhaseSeen || {};
    seen = mon._dungeonBossPhaseSeen;
  }
  for(const phase of phases){
    if(hpFrac <= phase.threshold && !seen[phase.phaseKey]){
      seen[phase.phaseKey] = 1;
      applyDungeonBossPhase(mon, phase, now);
    }
  }
}
function applyWorldBossContractPhase(mon, phase, encounter, now){
  if(!mon || !phase || !encounter) return false;
  const mod = phase.mod || {};
  encounter.bossPhasesTriggered = (encounter.bossPhasesTriggered || 0) + 1;
  const skill = {
    name: phase.name,
    icon: phase.icon || '⚔️',
    shieldPct: mod.shieldPct,
    atkBuffSecs: mod.atkBuffSecs,
    atkBuffPct: mod.atkBuffPct,
    spdBuffSecs: mod.spdBuffSecs,
    spdBuffPct: mod.spdBuffPct,
    defBuffSecs: mod.defBuffSecs,
    defBuffPct: mod.defBuffPct,
    critBuffSecs: mod.critBuffSecs,
    critBuffPct: mod.critBuffPct,
    leechBuffSecs: mod.leechBuffSecs,
    leechBuffPct: mod.leechBuffPct,
    summonCount: mod.summonCount,
    summonTheme: mod.summonTheme,
    cd: 60000,
  };
  applyMonsterSupportSkill(mon, skill, now, { announce:false });
  if(mod.phaseDamagePct){
    const dmg = Math.max(1, Math.floor((state.hero.hpMax || 1) * mod.phaseDamagePct));
    applyHeroDamage(dmg, mon, { label:t=>(phase.icon || '⚔️') + '-' + t, color:'#fb7185', now });
    if(typeof processTalentLowHp === 'function') processTalentLowHp(mon, now);
  }
  if(mod.heroDebuff && typeof applyHeroDebuff === 'function'){
    applyHeroDebuff(mod.heroDebuff, mod.heroDebuffMs || 6000);
  }
  if(mod.manaDrainPct && state.resourceMax){
    const drain = Math.min(state.resource || 0, Math.floor(state.resourceMax * mod.manaDrainPct));
    if(drain > 0){
      state.resource = Math.max(0, state.resource - drain);
      showFloat($('hero-emoji'), '💧-' + drain, '#93c5fd', { variant:'status', scale:1.04 });
    }
  }
  showMonsterFloat(mon, `${phase.icon || '⚔️'}${phase.name}`, '#fb7185', { variant:'boss', scale:1.12, important:true });
  pulseMonsterEl(mon, 'bosscast', 320);
  log(`🌌 世界Boss阶段: ${mon.bossName || mon.name} 触发 ${phase.icon || ''}${phase.name}! ${phase.desc || ''}`, 'bad');
  return true;
}
function checkWorldBossContractPhases(mon, now){
  if(state.mode !== 'worldboss' || !mon?.isWorldBoss || !state.worldBoss?.activeEncounter || !mon.bossName) return;
  const encounter = state.worldBoss.activeEncounter;
  if(!Array.isArray(encounter.phases) || !encounter.phases.length) return;
  const hpFrac = mon.hpMax > 0 ? mon.hp / mon.hpMax : 1;
  mon._worldBossPhaseSeen = mon._worldBossPhaseSeen || {};
  for(const phase of encounter.phases){
    if(hpFrac <= phase.threshold && !mon._worldBossPhaseSeen[phase.phaseKey]){
      mon._worldBossPhaseSeen[phase.phaseKey] = 1;
      applyWorldBossContractPhase(mon, phase, encounter, now);
    }
  }
}
function applyWorldBossAssaultEffects(encounter, mon, now){
  if(state.mode !== 'worldboss' || !encounter?.assaults?.length || !mon) return;
  const beforeHits = encounter.assaultHits || 0;
  for(const assault of encounter.assaults){
    const mod = assault.mod || {};
    const prefix = `wb:${assault.key}`;
    if(mod.drainTickMs && now - (encounter[`${prefix}:drain`] || 0) > mod.drainTickMs){
      encounter[`${prefix}:drain`] = now;
      const drain = Math.min(state.resource || 0, Math.floor((state.resourceMax || 0) * (mod.resourceDrainPct || 0.1)));
      if(drain > 0){
        state.resource = Math.max(0, state.resource - drain);
        showFloat($('hero-emoji'), `${assault.icon || '💧'}-${drain}`, '#93c5fd', { variant:'status', scale:1.04 });
        encounter.assaultHits = (encounter.assaultHits || 0) + 1;
      }
    }
    if(mod.poisonTickMs && now - (encounter[`${prefix}:poison`] || 0) > mod.poisonTickMs){
      encounter[`${prefix}:poison`] = now;
      const dps = Math.max(1, Math.floor((state.hero.hpMax || 1) * (mod.poisonDpsPct || 0.015)));
      applyHeroDebuff('burn', mod.poisonMs || 4200, { dps });
      showFloat($('hero-emoji'), `${assault.icon || '☣️'}侵蚀`, '#a3e635', { variant:'status', scale:1.04 });
      encounter.assaultHits = (encounter.assaultHits || 0) + 1;
    }
    if(mod.ceilingTickMs && now - (encounter[`${prefix}:ceiling`] || 0) > mod.ceilingTickMs){
      encounter[`${prefix}:ceiling`] = now;
      const dmg = Math.max(1, Math.floor((state.hero.hpMax || 1) * (mod.ceilingDamagePct || 0.05)));
      applyHeroDamage(dmg, mon, { label:t=>(assault.icon || '🌠') + '-' + t, color:'#f59e0b', now });
      if(mod.stunMs){
        state.heroStunUntil = Math.max(state.heroStunUntil || 0, now + mod.stunMs);
        showFloat($('hero-emoji'), '💫震荡', '#fde047', { variant:'status', scale:1.04 });
      }
      encounter.assaultHits = (encounter.assaultHits || 0) + 1;
    }
    if(mod.shieldTickMs && now - (encounter[`${prefix}:shield`] || 0) > mod.shieldTickMs){
      encounter[`${prefix}:shield`] = now;
      for(const target of (state.currentMonsters || [])){
        if(!target || target.hp <= 0) continue;
        const shield = Math.max(1, Math.floor(target.hpMax * (mod.monsterShieldPct || 0.04)));
        target._arcaneShield = (target._arcaneShield || 0) + shield;
        syncMonsterShieldAura(target);
        showMonsterFloat(target, `${assault.icon || '🔷'}盾`, '#93c5fd');
      }
      encounter.assaultHits = (encounter.assaultHits || 0) + 1;
    }
    if(mod.weakenTickMs && now - (encounter[`${prefix}:weaken`] || 0) > mod.weakenTickMs){
      encounter[`${prefix}:weaken`] = now;
      applyHeroDebuff('weaken', mod.weakenMs || 5000);
      showFloat($('hero-emoji'), `${assault.icon || '🌫️'}虚弱`, '#fca5a5', { variant:'status', scale:1.04 });
      encounter.assaultHits = (encounter.assaultHits || 0) + 1;
    }
    if(mod.silenceTickMs && now - (encounter[`${prefix}:silence`] || 0) > mod.silenceTickMs){
      encounter[`${prefix}:silence`] = now;
      applyHeroDebuff('silence', mod.silenceMs || 1200);
      showFloat($('hero-emoji'), `${assault.icon || '🔒'}沉默`, '#c4b5fd', { variant:'status', scale:1.04 });
      encounter.assaultHits = (encounter.assaultHits || 0) + 1;
    }
    if(mod.heroDebuff && now - (encounter[`${prefix}:heroDebuff`] || 0) > (mod.heroDebuffTickMs || mod.ceilingTickMs || 13000)){
      encounter[`${prefix}:heroDebuff`] = now;
      applyHeroDebuff(mod.heroDebuff, mod.heroDebuffMs || 4800);
      encounter.assaultHits = (encounter.assaultHits || 0) + 1;
    }
    if(mod.executePulsePct && mon.isBoss && mon.hpMax > 0 && mon.hp / mon.hpMax <= (mod.executeBelow || 0.35) && now - (encounter[`${prefix}:execute`] || 0) > 9000){
      encounter[`${prefix}:execute`] = now;
      const dmg = Math.max(1, Math.floor((state.hero.hpMax || 1) * mod.executePulsePct));
      applyHeroDamage(dmg, mon, { label:t=>(assault.icon || '⚔️') + '-' + t, color:'#fb7185', now });
      encounter.assaultHits = (encounter.assaultHits || 0) + 1;
    }
  }
  if((encounter.assaultHits || 0) !== beforeHits && typeof markDirty === 'function') markDirty('hero', 'stage');
}
function advanceWorldBossPressure(encounter, mon, now){
  const nightmareLevel = Math.max(0, Math.floor(encounter?.nightmareLevel || encounter?.contractLevel || 0));
  if(state.mode !== 'worldboss' || !nightmareLevel || !mon?.isWorldBoss) return;
  const interval = Math.max(5600, 15500 - nightmareLevel * 1450);
  if(now - (encounter.lastPressureAt || 0) < interval) return;
  encounter.lastPressureAt = now;
  encounter.pressure = Math.min(18, (encounter.pressure || 0) + 1);
  encounter.maxPressure = Math.max(encounter.maxPressure || 0, encounter.pressure);
  mon.atk = Math.max(1, Math.floor(mon.atk * (1 + 0.020 * nightmareLevel)));
  mon.def = Math.max(1, Math.floor(mon.def * (1 + 0.014 * nightmareLevel)));
  const shield = Math.max(1, Math.floor(mon.hpMax * (0.018 + nightmareLevel * 0.008)));
  mon._arcaneShield = (mon._arcaneShield || 0) + shield;
  syncMonsterShieldAura(mon);
  const dmg = Math.max(1, Math.floor((state.hero.hpMax || 1) * (0.016 + nightmareLevel * 0.007)));
  applyHeroDamage(dmg, mon, { label:t=>'🔥-' + t, color:'#fb7185', now });
  if(encounter.pressure % 2 === 0) applyHeroDebuff('weaken', 3000 + nightmareLevel * 650);
  showMonsterFloat(mon, `🔥压迫${encounter.pressure}`, '#fb7185', { variant:'boss', scale:1.08 });
  log(`🔥 世界Boss压迫升至 ${encounter.pressure}: ${mon.bossName || mon.name} 的攻击、防御与护盾进一步提升`, 'bad');
  if(typeof markDirty === 'function') markDirty('hero', 'stage');
}
function applyDungeonEnvironmentEffects(ds, mon, now){
  if(state.mode !== 'dungeon' || !ds?.environments?.length || !mon) return;
  const beforeHits = ds.environmentHits || 0;
  for(const env of ds.environments){
    const mod = env.mod || {};
    const prefix = `env:${env.key}`;
    if(mod.trapTickMs && now - (ds[`${prefix}:trap`] || 0) > mod.trapTickMs){
      ds[`${prefix}:trap`] = now;
      const dmg = Math.max(1, Math.floor((state.hero.hpMax || 1) * (mod.trapDamagePct || 0.05)));
      applyHeroDamage(dmg, mon, { label:t=>(env.icon || '🪤') + '-' + t, color:'#fb7185', now });
      ds.environmentHits = (ds.environmentHits || 0) + 1;
    }
    if(mod.poisonTickMs && now - (ds[`${prefix}:poison`] || 0) > mod.poisonTickMs){
      ds[`${prefix}:poison`] = now;
      const dps = Math.max(1, Math.floor((state.hero.hpMax || 1) * (mod.poisonDpsPct || 0.015)));
      applyHeroDebuff('burn', mod.poisonMs || 4000, { dps });
      showFloat($('hero-emoji'), `${env.icon || '☣️'}毒雾`, '#a3e635', { variant:'status', scale:1.04 });
      ds.environmentHits = (ds.environmentHits || 0) + 1;
    }
    if(mod.drainTickMs && now - (ds[`${prefix}:drain`] || 0) > mod.drainTickMs){
      ds[`${prefix}:drain`] = now;
      const drain = Math.min(state.resource || 0, Math.floor((state.resourceMax || 0) * (mod.resourceDrainPct || 0.1)));
      if(drain > 0){
        state.resource = Math.max(0, state.resource - drain);
        showFloat($('hero-emoji'), `${env.icon || '💧'}-${drain}`, '#93c5fd', { variant:'status', scale:1.04 });
        ds.environmentHits = (ds.environmentHits || 0) + 1;
      }
    }
    if(mod.ceilingTickMs && now - (ds[`${prefix}:ceiling`] || 0) > mod.ceilingTickMs){
      ds[`${prefix}:ceiling`] = now;
      const dmg = Math.max(1, Math.floor((state.hero.hpMax || 1) * (mod.ceilingDamagePct || 0.06)));
      applyHeroDamage(dmg, mon, { label:t=>(env.icon || '🪨') + '-' + t, color:'#f59e0b', now });
      if(mod.stunMs){
        state.heroStunUntil = Math.max(state.heroStunUntil || 0, now + mod.stunMs);
        showFloat($('hero-emoji'), '💫震荡', '#fde047', { variant:'status', scale:1.04 });
      }
      ds.environmentHits = (ds.environmentHits || 0) + 1;
    }
    if(mod.shieldTickMs && now - (ds[`${prefix}:shield`] || 0) > mod.shieldTickMs){
      ds[`${prefix}:shield`] = now;
      for(const target of (state.currentMonsters || [])){
        if(!target || target.hp <= 0) continue;
        const shield = Math.max(1, Math.floor(target.hpMax * (mod.monsterShieldPct || 0.04)));
        target._arcaneShield = (target._arcaneShield || 0) + shield;
        syncMonsterShieldAura(target);
        showMonsterFloat(target, `${env.icon || '🔷'}盾`, '#93c5fd');
      }
      ds.environmentHits = (ds.environmentHits || 0) + 1;
    }
    if(mod.weakenTickMs && now - (ds[`${prefix}:weaken`] || 0) > mod.weakenTickMs){
      ds[`${prefix}:weaken`] = now;
      applyHeroDebuff('weaken', mod.weakenMs || 5000);
      showFloat($('hero-emoji'), `${env.icon || '🌫️'}虚弱`, '#fca5a5', { variant:'status', scale:1.04 });
      ds.environmentHits = (ds.environmentHits || 0) + 1;
    }
  }
  if((ds.environmentHits || 0) !== beforeHits && typeof markDirty === 'function') markDirty('hero', 'stage');
}

function recordDungeonTimeMark(ds, key, edict) {
  if (!ds) return;
  const markKey = key || 'unknown';
  ds.timeMarks = (ds.timeMarks || 0) + 1;
  ds.timeMarkBreakdown = ds.timeMarkBreakdown || {};
  ds.timeMarkBreakdown[markKey] = (ds.timeMarkBreakdown[markKey] || 0) + 1;
  if (edict?.name) {
    ds.timeMarkSources = ds.timeMarkSources || {};
    ds.timeMarkSources[edict.key || markKey] = edict.name;
  }
}

function applyDungeonEdictEffects(ds, mon, now){
  if(state.mode !== 'dungeon' || !ds?.edicts?.length || !mon) return;
  const beforeHits = ds.edictHits || 0;
  for(const edict of ds.edicts){
    const mod = edict.mod || {};
    const prefix = `edict:${edict.key}`;
    if(mod.drainTickMs && now - (ds[`${prefix}:drain`] || 0) > mod.drainTickMs){
      ds[`${prefix}:drain`] = now;
      const drain = Math.min(state.resource || 0, Math.floor((state.resourceMax || 0) * (mod.resourceDrainPct || 0.08)));
      if(drain > 0){
        state.resource = Math.max(0, state.resource - drain);
        showFloat($('hero-emoji'), `${edict.icon || '📜'}-${drain}`, '#93c5fd', { variant:'status', scale:1.04 });
        ds.edictHits = (ds.edictHits || 0) + 1;
        recordDungeonTimeMark(ds, 'resource', edict);
      }
    }
    if(mod.poisonTickMs && now - (ds[`${prefix}:poison`] || 0) > mod.poisonTickMs){
      ds[`${prefix}:poison`] = now;
      const dps = Math.max(1, Math.floor((state.hero.hpMax || 1) * (mod.poisonDpsPct || 0.01)));
      applyHeroDebuff('burn', 4200, { dps });
      showFloat($('hero-emoji'), `${edict.icon || '📜'}腐蚀`, '#a3e635', { variant:'status', scale:1.04 });
      ds.edictHits = (ds.edictHits || 0) + 1;
      recordDungeonTimeMark(ds, 'healing', edict);
    }
    if(mod.ceilingTickMs && now - (ds[`${prefix}:ceiling`] || 0) > mod.ceilingTickMs){
      ds[`${prefix}:ceiling`] = now;
      const dmg = Math.max(1, Math.floor((state.hero.hpMax || 1) * (mod.ceilingDamagePct || 0.04)));
      applyHeroDamage(dmg, mon, { label:t=>(edict.icon || '📜') + '-' + t, color:'#f59e0b', now });
      ds.edictHits = (ds.edictHits || 0) + 1;
      recordDungeonTimeMark(ds, 'mobility', edict);
    }
    if(mod.shieldTickMs && now - (ds[`${prefix}:shield`] || 0) > mod.shieldTickMs){
      ds[`${prefix}:shield`] = now;
      for(const target of (state.currentMonsters || [])){
        if(!target || target.hp <= 0) continue;
        const shield = Math.max(1, Math.floor(target.hpMax * (mod.monsterShieldPct || 0.03)));
        target._arcaneShield = (target._arcaneShield || 0) + shield;
        syncMonsterShieldAura(target);
        showMonsterFloat(target, `${edict.icon || '📜'}盾`, '#93c5fd');
      }
      ds.edictHits = (ds.edictHits || 0) + 1;
    }
    if(mod.weakenTickMs && now - (ds[`${prefix}:weaken`] || 0) > mod.weakenTickMs){
      ds[`${prefix}:weaken`] = now;
      applyHeroDebuff('weaken', mod.weakenMs || 4500);
      showFloat($('hero-emoji'), `${edict.icon || '📜'}虚弱`, '#fca5a5', { variant:'status', scale:1.04 });
      ds.edictHits = (ds.edictHits || 0) + 1;
      recordDungeonTimeMark(ds, 'pressure', edict);
    }
    if(mod.executePulsePct && mon.isBoss && mon.hpMax > 0 && mon.hp / mon.hpMax <= (mod.executeBelow || 0.35) && now - (ds[`${prefix}:execute`] || 0) > 9000){
      ds[`${prefix}:execute`] = now;
      const dmg = Math.max(1, Math.floor((state.hero.hpMax || 1) * mod.executePulsePct));
      applyHeroDamage(dmg, mon, { label:t=>(edict.icon || '⏱️') + '-' + t, color:'#fb7185', now });
      ds.edictHits = (ds.edictHits || 0) + 1;
      recordDungeonTimeMark(ds, 'execution', edict);
    }
  }
  if((ds.edictHits || 0) !== beforeHits && typeof markDirty === 'function') markDirty('hero', 'stage');
}
function applyDungeonTimerPressure(ds, mon, now){
  const timer = ds?.timer;
  if(state.mode !== 'dungeon' || !timer || !mon) return;
  const remaining = dungeonTimerRemaining(ds, now);
  if(remaining > 0) return;
  if(!timer.expired){
    timer.expired = true;
    timer.overtimeStartedAt = now;
    timer.lastOvertimePulse = now - 12000;
    log('⏳ 限时挑战已超时!副本压迫开始叠加', 'bad');
  }
  if(now - (timer.lastOvertimePulse || 0) < 15000) return;
  timer.lastOvertimePulse = now;
  timer.overtimeStacks = Math.min(12, (timer.overtimeStacks || 0) + 1);
  timer.overtimePulses = (timer.overtimePulses || 0) + 1;
  const stack = timer.overtimeStacks;
  const dmg = Math.max(1, Math.floor((state.hero.hpMax || 1) * (0.035 + stack * 0.004)));
  applyHeroDamage(dmg, mon, { label:t=>'⏳-' + t, color:'#fb7185', now });
  if(typeof applyHeroDebuff === 'function') applyHeroDebuff('vulnerable', 4500);
  for(const target of (state.currentMonsters || [])){
    if(!target || target.hp <= 0) continue;
    target.atk = Math.floor(target.atk * 1.03);
    const shield = Math.max(1, Math.floor(target.hpMax * (0.015 + stack * 0.002)));
    target._arcaneShield = (target._arcaneShield || 0) + shield;
    syncMonsterShieldAura(target);
    showMonsterFloat(target, `⏳压迫${stack}`, '#fb7185');
  }
  if(typeof markDirty === 'function') markDirty('hero', 'stage');
}
function applyCouncilBossMechanics(now){
  if(!(state.mode === 'dungeon' || state.mode === 'mythic')) return;
  const groups = {};
  for(const m of (state.currentMonsters || [])){
    if(m && m.hp > 0 && m._councilGroupKey){
      if(!groups[m._councilGroupKey]) groups[m._councilGroupKey] = [];
      groups[m._councilGroupKey].push(m);
    }
  }
  for(const key in groups){
    const members = groups[key];
    if(members.length <= 1) continue;
    const lead = members[0];
    if(lead._councilGroupName === '双子皇帝' && now - ((state._councilTwinHeal || {})[key] || 0) > 12000){
      state._councilTwinHeal = state._councilTwinHeal || {};
      state._councilTwinHeal[key] = now;
      let low = members[0];
      for(const m of members) if((m.hp / Math.max(1, m.hpMax)) < (low.hp / Math.max(1, low.hpMax))) low = m;
      const heal = Math.max(1, Math.floor(low.hpMax * 0.045));
      low.hp = Math.min(low.hpMax, low.hp + heal);
      showMonsterFloat(low, `👑双生+${heal}`, '#facc15', { variant:'heal', scale:1.04 });
      log('👑 双子皇帝仍互相支援,恢复了伤势', 'bad');
    } else if(/议会|综合体|猎群/.test(lead._councilGroupName || '') && now - ((state._councilCoordination || {})[key] || 0) > 14000){
      state._councilCoordination = state._councilCoordination || {};
      state._councilCoordination[key] = now;
      for(const m of members){
        const shield = Math.max(1, Math.floor(m.hpMax * 0.025));
        m._arcaneShield = (m._arcaneShield || 0) + shield;
        syncMonsterShieldAura(m);
        showMonsterFloat(m, '⚖️协同', '#facc15');
      }
    }
  }
}
const DUNGEON_BOSS_SPECTACLE_LIBRARY = [
  { key:'councilConvergence', icon:'⚖️', name:'议会共振', cd:18000, match:/议会|综合体|猎群|双子|夫妇|与|皇帝/, desc:'多人首领会周期性联手点名,并为存活成员叠加护盾。' },
  { key:'oldGodGaze', icon:'👁️', name:'古神凝视', cd:16000, match:/克苏恩|古神|恩佐斯|尤格|眼|虚空|低语|疯狂|梦魇|腐化/, desc:'凝视玩家造成精神冲击,附加恐惧或易伤。' },
  { key:'twilightMeteor', icon:'☄️', name:'暮光陨星', cd:15000, match:/龙|瓦里奥那|塞拉图斯|暮光|黑龙|红龙|蓝龙|绿龙|青铜|龙息|飞龙|奈法|奥妮克希亚/, desc:'召唤陨星砸落,造成高额伤害并留下灼烧。' },
  { key:'arcanePrison', icon:'🔮', name:'奥术牢笼', cd:17000, match:/奥术|魔网|法师|档案|星界|群星|蓝龙|艾利桑德|麦迪文|符文|魔法/, desc:'抽取资源并生成奥术护盾,拖慢玩家爆发窗口。' },
  { key:'bloodRite', icon:'🩸', name:'鲜血仪式', cd:16500, match:/鲜血|血|吸血|王子|贵族|女王|心脏|献祭|屠夫/, desc:'以玩家生命为祭恢复首领,并施加易伤。' },
  { key:'plagueSwarm', icon:'🦠', name:'瘟疫虫群', cd:19000, match:/毒|瘟疫|腐|虫|蛛|螳螂|克拉希克|范克瑞斯|孢子|感染|软泥/, desc:'释放毒性虫群,持续掉血并可能召唤污染爪牙。' },
  { key:'stormOverload', icon:'⚡', name:'风暴过载', cd:14000, match:/雷|风暴|闪电|风|诺库德|奥丁|莱杉|电|云|天神/, desc:'风暴链击打断节奏,造成伤害并短暂沉默。' },
  { key:'forgePlating', icon:'🛡️', name:'熔炉装甲', cd:20000, match:/钢铁|机械|泰坦|构造|黑石|熔炉|护甲|机器人|攻城|巨像|守卫/, desc:'首领展开装甲板,获得护盾和短时减伤。' },
  { key:'necroticWinter', icon:'🧊', name:'凋零寒冬', cd:17500, match:/巫妖|冰|霜|亡|天灾|死亡|寒|墓|骨|克尔苏加德|阿尔萨斯/, desc:'寒冬侵蚀治疗和行动,并可能唤起亡者。' },
  { key:'felRift', icon:'😈', name:'邪能裂隙', cd:18500, match:/恶魔|邪能|军团|伊利丹|基尔加丹|阿克蒙德|地狱|萨格拉斯|末日/, desc:'撕开邪能裂隙,造成灼烧并召唤恶魔爪牙。' },
  { key:'shadowMirror', icon:'🪞', name:'暗影镜像', cd:21000, match:/影|暗|镜|幻象|潜行|刺客|暮光|虚空|幽魂|灵魂/, desc:'制造镜像迷阵,让玩家进入易爆并给首领套上减伤。' },
  { key:'flameDetonation', icon:'🌋', name:'熔火爆发', cd:15500, match:/火|炎|熔|岩浆|拉格纳罗斯|凤凰|燃烧|烈焰|灰烬/, desc:'引爆熔火脉冲,造成爆发伤害和持续灼烧。' },
  { key:'tidalCrush', icon:'🌊', name:'深潮碾压', cd:17500, match:/水|海|潮|娜迦|鱼|深渊|海潮|潮汐|水元素/, desc:'深潮压迫玩家,造成伤害并降低攻速。' },
  { key:'earthShatter', icon:'⛰️', name:'大地崩裂', cd:18000, match:/石|土|山|地|岩|元素|巨人|裂地|地震/, desc:'震碎地面缴械玩家,并召唤元素残片。' },
  { key:'executionBrand', icon:'🎯', name:'处刑点名', cd:22000, match:/./, desc:'所有副本首领都会周期性点名玩家,制造必须硬吃的压力。' }
];
function dungeonBossSpectacleText(bossData){
  if(!bossData) return '';
  const parts = [bossData.name || '', bossData.emoji || ''];
  for(const sk of (bossData.skills || [])) parts.push(sk?.name || '', sk?.desc || '', sk?.type || '');
  for(const sk of (bossData.tricks || bossData.passive?.tricks || [])) parts.push(sk?.name || '', sk?.desc || '');
  return parts.join(' ');
}
function getDungeonBossSpectacleMechanics(bossData){
  const text = dungeonBossSpectacleText(bossData);
  if(!text.trim()) return [];
  const out = [];
  for(const mech of DUNGEON_BOSS_SPECTACLE_LIBRARY){
    if(mech.match.test(text)) out.push(mech);
  }
  const generic = DUNGEON_BOSS_SPECTACLE_LIBRARY.find(m => m.key === 'executionBrand');
  if(generic && !out.some(m => m.key === generic.key)) out.push(generic);
  return out.slice(0, 5);
}
function dungeonBossSpectacleDmg(pct, mon, flat){
  const hp = Math.max(1, state.hero.hpMax || 1);
  const lvl = Math.max(1, mon?.lvl || 1);
  return Math.max(1, Math.floor(hp * pct + lvl * (flat || 1.5)));
}
function dungeonBossSpectacleMark(mon, mech, now, extraDesc){
  setMonsterTrickAura(mon, 'spectacle:' + mech.key, { name:mech.name, icon:mech.icon, desc:extraDesc || mech.desc }, now + 6500, { desc:extraDesc || mech.desc });
  showMonsterFloat(mon, `${mech.icon}${mech.name}`, '#f0abfc', { variant:'boss', scale:1.06 });
}
function dungeonBossSpectacleCounter(){
  const ds = state.dungeonState || state.mythicState;
  if(ds) ds.bossMechanicsTriggered = (ds.bossMechanicsTriggered || 0) + 1;
}
function triggerDungeonBossSpectacle(mon, mech, now){
  if(!mon || mon.hp <= 0 || !mech) return false;
  dungeonBossSpectacleCounter();
  const aliveBosses = (state.currentMonsters || []).filter(x => x && x.hp > 0 && x.isBoss);
  if(mech.key === 'councilConvergence'){
    const group = mon._councilGroupKey ? aliveBosses.filter(x => x._councilGroupKey === mon._councilGroupKey) : aliveBosses;
    for(const m of group){
      const shield = Math.max(1, Math.floor(m.hpMax * 0.035));
      m._arcaneShield = (m._arcaneShield || 0) + shield;
      syncMonsterShieldAura(m);
      showMonsterFloat(m, '⚖️共振盾', '#fde68a');
    }
    applyHeroDamage(dungeonBossSpectacleDmg(0.035, mon, 1.2), mon, { label:t=>'⚖️-' + t, color:'#fde68a', now });
    if(typeof applyHeroDebuff === 'function') applyHeroDebuff('vulnerable', 3500);
  }else if(mech.key === 'oldGodGaze'){
    applyHeroDamage(dungeonBossSpectacleDmg(0.048, mon, 1.8), mon, { label:t=>'👁️-' + t, color:'#c084fc', now });
    if(typeof applyHeroDebuff === 'function'){
      const feared = Math.random() < 0.45;
      applyHeroDebuff(feared ? 'fear' : 'vulnerable', feared ? 1200 : 4500);
    }
  }else if(mech.key === 'twilightMeteor'){
    applyHeroDamage(dungeonBossSpectacleDmg(0.060, mon, 2.1), mon, { label:t=>'☄️-' + t, color:'#fb7185', now, variant:'boss' });
    if(typeof applyHeroDebuff === 'function') applyHeroDebuff('burn', 5200, { dps:dungeonBossSpectacleDmg(0.010, mon, 0.35) });
  }else if(mech.key === 'arcanePrison'){
    const drain = Math.max(6, Math.floor((state.resourceMax || 100) * 0.16));
    state.resource = Math.max(0, (state.resource || 0) - drain);
    mon._arcaneShield = (mon._arcaneShield || 0) + Math.max(1, Math.floor(mon.hpMax * 0.055));
    syncMonsterShieldAura(mon);
    applyHeroDamage(dungeonBossSpectacleDmg(0.030, mon, 1.1), mon, { label:t=>'🔮-' + t, color:'#a78bfa', now });
    showFloat($('hero-emoji'), '🔮-' + drain, '#a78bfa', { variant:'hit', scale:1.03 });
  }else if(mech.key === 'bloodRite'){
    const dmg = applyHeroDamage(dungeonBossSpectacleDmg(0.046, mon, 1.4), mon, { label:t=>'🩸-' + t, color:'#ef4444', now });
    const heal = Math.max(1, Math.floor((dmg || 1) * 0.65 + mon.hpMax * 0.018));
    mon.hp = Math.min(mon.hpMax, mon.hp + heal);
    showMonsterFloat(mon, '🩸+' + heal, '#fda4af', { variant:'heal', scale:1.04 });
    if(typeof applyHeroDebuff === 'function') applyHeroDebuff('vulnerable', 5000);
  }else if(mech.key === 'plagueSwarm'){
    applyHeroDamage(dungeonBossSpectacleDmg(0.026, mon, 0.9), mon, { label:t=>'🦠-' + t, color:'#a3e635', now });
    if(typeof applyHeroDebuff === 'function') applyHeroDebuff('burn', 7000, { dps:dungeonBossSpectacleDmg(0.012, mon, 0.4) });
    summonMonsterAlly(mon, { summonCount:1, summonTheme:'nature', summonHpPct:0.16, summonAtkPct:0.32, summonDefPct:0.35 }, now);
  }else if(mech.key === 'stormOverload'){
    applyHeroDamage(dungeonBossSpectacleDmg(0.043, mon, 1.6), mon, { label:t=>'⚡-' + t, color:'#67e8f9', now });
    if(typeof applyHeroDebuff === 'function') applyHeroDebuff('silence', 1400);
    mon.spdBuffUntil = Math.max(mon.spdBuffUntil || 0, now + 5000);
  }else if(mech.key === 'forgePlating'){
    mon._arcaneShield = (mon._arcaneShield || 0) + Math.max(1, Math.floor(mon.hpMax * 0.075));
    mon._monsterDrBuffUntil = now + 6500;
    mon._monsterDrBuffPct = Math.max(mon._monsterDrBuffPct || 0, 0.26);
    mon._trickDefBuff = now + 6500;
    mon._trickDefPct = Math.max(mon._trickDefPct || 0, 40);
    syncMonsterShieldAura(mon);
    if(typeof applyHeroDebuff === 'function') applyHeroDebuff('cripple', 4200);
  }else if(mech.key === 'necroticWinter'){
    applyHeroDamage(dungeonBossSpectacleDmg(0.035, mon, 1.3), mon, { label:t=>'🧊-' + t, color:'#93c5fd', now });
    if(typeof applyHeroDebuff === 'function'){
      const frozen = Math.random() < 0.5;
      applyHeroDebuff(frozen ? 'freeze' : 'decay2', frozen ? 1100 : 5200);
    }
    summonMonsterAlly(mon, { summonCount:1, summonTheme:'undead', summonHpPct:0.18, summonAtkPct:0.34, summonDefPct:0.42 }, now);
  }else if(mech.key === 'felRift'){
    applyHeroDamage(dungeonBossSpectacleDmg(0.050, mon, 1.8), mon, { label:t=>'😈-' + t, color:'#fb923c', now });
    if(typeof applyHeroDebuff === 'function') applyHeroDebuff('burn', 6200, { dps:dungeonBossSpectacleDmg(0.011, mon, 0.35) });
    summonMonsterAlly(mon, { summonCount:1, summonTheme:'demon', summonHpPct:0.19, summonAtkPct:0.39, summonDefPct:0.38 }, now);
  }else if(mech.key === 'shadowMirror'){
    mon._monsterDrBuffUntil = now + 6000;
    mon._monsterDrBuffPct = Math.max(mon._monsterDrBuffPct || 0, 0.22);
    mon._arcaneShield = (mon._arcaneShield || 0) + Math.max(1, Math.floor(mon.hpMax * 0.035));
    syncMonsterShieldAura(mon);
    if(typeof applyHeroDebuff === 'function') applyHeroDebuff('brittle', 7000);
  }else if(mech.key === 'flameDetonation'){
    applyHeroDamage(dungeonBossSpectacleDmg(0.055, mon, 1.9), mon, { label:t=>'🌋-' + t, color:'#f97316', now, variant:'boss' });
    if(typeof applyHeroDebuff === 'function') applyHeroDebuff('burn', 5800, { dps:dungeonBossSpectacleDmg(0.013, mon, 0.45) });
    summonMonsterAlly(mon, { summonCount:1, summonTheme:'fire', summonHpPct:0.15, summonAtkPct:0.36, summonDefPct:0.30 }, now);
  }else if(mech.key === 'tidalCrush'){
    applyHeroDamage(dungeonBossSpectacleDmg(0.042, mon, 1.4), mon, { label:t=>'🌊-' + t, color:'#38bdf8', now });
    if(typeof applyHeroDebuff === 'function') applyHeroDebuff('chill', 5600);
  }else if(mech.key === 'earthShatter'){
    applyHeroDamage(dungeonBossSpectacleDmg(0.044, mon, 1.5), mon, { label:t=>'⛰️-' + t, color:'#d6d3d1', now });
    if(typeof applyHeroDebuff === 'function') applyHeroDebuff('disarm', 1300);
    summonMonsterAlly(mon, { summonCount:1, summonTheme:'elemental', summonHpPct:0.17, summonAtkPct:0.32, summonDefPct:0.50 }, now);
  }else{
    applyHeroDamage(dungeonBossSpectacleDmg(0.040, mon, 1.4), mon, { label:t=>'🎯-' + t, color:'#facc15', now });
    if(typeof applyHeroDebuff === 'function') applyHeroDebuff('brittle', 4500);
  }
  dungeonBossSpectacleMark(mon, mech, now);
  log(`${mech.icon} ${mon.bossName || mon.name} 触发首领机制: ${mech.name}!`, 'bad');
  if(typeof markDirty === 'function') markDirty('hero', 'stage');
  return true;
}
function applyDungeonBossSpectacleMechanics(now){
  if(!(state.mode === 'dungeon' || state.mode === 'mythic')) return;
  const ds = state.dungeonState || state.mythicState;
  if(!ds) return;
  let triggered = 0;
  for(const mon of (state.currentMonsters || [])){
    if(!mon || mon.hp <= 0 || !mon.isBoss) continue;
    const bossData = getMonsterBossData(mon) || { name:mon.bossName || mon.name, emoji:mon.emoji || '👹' };
    const mechanics = getDungeonBossSpectacleMechanics(bossData);
    if(!mechanics.length) continue;
    if(!mon._spectacleLast) mon._spectacleLast = {};
    const seedText = mon._uid != null ? mon._uid : (mon.name || '');
    const seed = Math.abs(String(seedText).split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0));
    for(let i = 0; i < mechanics.length; i++){
      const mech = mechanics[i];
      const cd = Math.max(9000, mech.cd || 18000);
      if(!mon._spectacleLast[mech.key]){
        mon._spectacleLast[mech.key] = (mon._spawnAt || now) + 4500 + ((seed + i * 1739) % 6500) - cd;
      }
      if(now - mon._spectacleLast[mech.key] < cd) continue;
      mon._spectacleLast[mech.key] = now;
      triggerDungeonBossSpectacle(mon, mech, now);
      triggered++;
      break;
    }
    if(triggered >= 2) break;
  }
}
const DUNGEON_BOSS_DIRECTOR_SKILLS = [
  { key:'annihilationRite', icon:'🕯️', name:'湮灭仪式', mul:3.8, aoe:true, castTime:3.2, cd:18, threat:'extreme', interruptPolicy:'hard', desc:'长读条灭团技,如果读完会重创全体并施加虚弱。', match:/古神|克苏恩|恩佐斯|尤格|虚空|低语|梦魇|腐化|暗影/ },
  { key:'twilightJudgment', icon:'☄️', name:'暮光审判', mul:3.2, aoe:true, castTime:2.8, cd:16, dotSkill:true, dotSecs:7, threat:'high', interruptPolicy:'soft', desc:'陨星审判,造成持续灼烧;打断后仍会留下余波。', match:/龙|暮光|黑龙|红龙|蓝龙|龙息|奈法|奥妮克希亚/ },
  { key:'arcaneLockdown', icon:'🔮', name:'奥术封锁', mul:2.2, castTime:2.4, cd:14, manaDrain:true, silence:1600, shieldPct:0.08, threat:'high', interruptPolicy:'soft', desc:'封锁技能与资源,并为首领补上一层奥术盾。', match:/奥术|魔网|法师|星界|群星|符文|魔法/ },
  { key:'bloodHarvest', icon:'🩸', name:'鲜血收割', mul:2.6, castTime:2.2, cd:15, lifeSteal:0.55, bleed:true, vulnerable:true, threat:'high', interruptPolicy:'soft', desc:'吸取玩家生命治疗自身,并留下易伤出血窗口。', match:/鲜血|血|吸血|王子|女王|屠夫|献祭/ },
  { key:'plagueBloom', icon:'🦠', name:'瘟疫绽放', mul:2.0, aoe:true, castTime:2.6, cd:17, plague:true, summonCount:1, summonTheme:'nature', threat:'high', interruptPolicy:'soft', desc:'让瘟疫爆开并召唤污染爪牙。', match:/毒|瘟疫|腐|虫|蛛|螳螂|软泥|孢子|感染/ },
  { key:'stormJailer', icon:'⚡', name:'雷狱锁链', mul:2.5, castTime:2.0, cd:13, silence:1500, slow:true, threat:'medium', interruptPolicy:'soft', desc:'雷霆锁链会沉默并减速玩家。', match:/雷|风暴|闪电|诺库德|奥丁|电|云/ },
  { key:'forgeReset', icon:'🛡️', name:'熔炉重铸', type:'support', castTime:2.5, cd:18, shieldPct:0.14, drBuffSecs:7, drBuffPct:0.28, defBuffSecs:7, defBuffPct:45, threat:'high', interruptPolicy:'soft', desc:'重铸装甲,获得护盾、减伤和防御强化。', match:/钢铁|机械|泰坦|构造|黑石|熔炉|护甲|守卫|巨像/ },
  { key:'necroticSentence', icon:'🧊', name:'凋零判决', mul:2.7, castTime:2.3, cd:16, decay2:true, freeze:true, summonCount:1, summonTheme:'undead', threat:'high', interruptPolicy:'hard', desc:'冻结目标并压低治疗,同时唤起亡者。', match:/巫妖|冰|霜|亡|天灾|死亡|寒|墓|骨|克尔苏加德|阿尔萨斯/ },
  { key:'felCataclysm', icon:'😈', name:'邪能灾变', mul:3.4, aoe:true, castTime:3.0, cd:18, dotSkill:true, dotSecs:6, summonCount:1, summonTheme:'demon', threat:'extreme', interruptPolicy:'hard', desc:'邪能裂隙爆发,重创全体并召来恶魔。', match:/恶魔|邪能|军团|伊利丹|基尔加丹|阿克蒙德|地狱|末日/ },
  { key:'executionOrder', icon:'🎯', name:'处刑指令', mul:3.0, castTime:2.4, cd:19, brittle:true, threat:'high', interruptPolicy:'hard', desc:'点名处刑,未打断会让玩家进入易爆状态。', match:/./ }
];
const DUNGEON_BOSS_DIRECTOR_EVENTS = [
  { key:'ritualTotem', icon:'🕯️', name:'仪式锚点', cd:26000, match:/古神|克苏恩|恩佐斯|尤格|虚空|低语|梦魇|腐化|邪能|恶魔|军团|奥术|法师|符文|魔法/, desc:'召唤限时仪式物;若未击破,首领会获得护盾并强制释放高危技能。' },
  { key:'mirrorEchoes', icon:'🪞', name:'镜像分身', cd:32000, match:/影|暗|镜|幻象|潜行|幽魂|灵魂|议会|双子|夫妇|与/, desc:'血量阶段召出镜像分身,分身存活时首领更难被爆发击杀。' },
  { key:'executeScript', icon:'💀', name:'斩杀脚本', cd:999999, match:/./, desc:'低血量时进入斩杀流程,强制读条处刑并提高攻击节奏。' },
  { key:'shieldCounterplay', icon:'💥', name:'破盾反制', cd:0, match:/./, desc:'打破首领护盾会造成短暂破绽,返还资源并削弱首领。' },
  { key:'addSacrifice', icon:'🔺', name:'献祭爪牙', cd:30000, match:/鲜血|血|吸血|瘟疫|虫|蛛|恶魔|邪能|亡|天灾|死亡/, desc:'首领会吞噬场上爪牙恢复并强化,逼迫玩家优先清理召唤物。' }
];
function getDungeonBossDirectorSkills(bossData){
  const text = dungeonBossSpectacleText(bossData);
  if(!text.trim()) return [];
  const out = [];
  for(const sk of DUNGEON_BOSS_DIRECTOR_SKILLS){
    if(sk.match.test(text)) out.push(Object.assign({}, sk));
  }
  return out.slice(0, 4);
}
function getDungeonBossDirectorEvents(bossData){
  const text = dungeonBossSpectacleText(bossData);
  if(!text.trim()) return [];
  const out = [];
  for(const ev of DUNGEON_BOSS_DIRECTOR_EVENTS){
    if(ev.match.test(text)) out.push(ev);
  }
  return out.slice(0, 5);
}
function dungeonBossDirectorCounter(key){
  const ds = state.dungeonState || state.mythicState;
  if(!ds) return;
  ds.bossDirectorEvents = (ds.bossDirectorEvents || 0) + 1;
  if(key){
    if(!ds.bossDirectorBreakdown) ds.bossDirectorBreakdown = {};
    ds.bossDirectorBreakdown[key] = (ds.bossDirectorBreakdown[key] || 0) + 1;
  }
}
function queueDungeonBossSkill(mon, skill, reason){
  if(!mon || !skill) return;
  if(!mon._queuedBossSkills) mon._queuedBossSkills = [];
  const copy = Object.assign({}, skill);
  copy._director = true;
  copy._directorReason = reason || '';
  mon._queuedBossSkills.push(copy);
  lastBossSkill = 0;
}
function spawnDungeonDirectorAdd(mon, cfg, now){
  if(!mon || !cfg) return null;
  const add = makeMonster((cfg.icon || '🔺') + (cfg.name || '机制物'), Math.max(1, mon.lvl - 1), false, 'rare');
  add.hpMax = Math.max(20, Math.floor(mon.hpMax * (cfg.hpPct || 0.11)));
  add.hp = add.hpMax;
  add.atk = Math.max(1, Math.floor(mon.atk * (cfg.atkPct || 0.24)));
  add.def = Math.max(0, Math.floor(mon.def * (cfg.defPct || 0.38)));
  add.baseGold = 0; add.baseXp = 0; add.goldReward = 0; add.honorReward = 0; add.dropRate = 0; add.gemChance = 0;
  add._summoned = true;
  add._directorAdd = cfg.key || 'director';
  add._summonerId = mon._uid;
  add._summonerName = mon.bossName || mon.name || '首领';
  add._summonerIsBoss = true;
  add._expiresAt = now + (cfg.durationMs || 11000);
  add._expireEffect = cfg.expireEffect || null;
  add._monSupportSkills = [];
  add._supportSkillCooldowns = {};
  state.currentMonsters.push(add);
  showMonsterFloat(add, (cfg.icon || '🔺') + (cfg.name || '机制物'), '#f0abfc', { variant:'boss', scale:1.05 });
  markDirty('stage');
  return add;
}
function resolveDungeonDirectorAddExpiry(add, now){
  if(!add || add.hp <= 0 || !add._expireEffect || !add._summonerId) return false;
  if(now < (add._expiresAt || 0)) return false;
  const boss = (state.currentMonsters || []).find(x => x && x.hp > 0 && x._uid === add._summonerId);
  if(boss){
    if(add._expireEffect === 'ritual'){
      boss._arcaneShield = (boss._arcaneShield || 0) + Math.max(1, Math.floor(boss.hpMax * 0.08));
      boss._trickAtkBuff = now + 7000;
      boss._trickAtkPct = Math.max(boss._trickAtkPct || 0, 35);
      syncMonsterShieldAura(boss);
      const skill = getDungeonBossDirectorSkills(getMonsterBossData(boss) || { name:boss.bossName || boss.name })[0] || DUNGEON_BOSS_DIRECTOR_SKILLS[DUNGEON_BOSS_DIRECTOR_SKILLS.length - 1];
      queueDungeonBossSkill(boss, skill, '仪式完成');
      log(`🕯️ ${boss.bossName || boss.name} 的仪式完成,下一次读条被强化!`, 'bad');
      showMonsterFloat(boss, '🕯️仪式完成', '#f0abfc', { variant:'boss', scale:1.1 });
    }else if(add._expireEffect === 'echo'){
      boss._monsterDrBuffUntil = now + 6000;
      boss._monsterDrBuffPct = Math.max(boss._monsterDrBuffPct || 0, 0.22);
      log(`🪞 镜像维持了首领的防御矩阵`, 'bad');
      showMonsterFloat(boss, '🪞镜像护主', '#c4b5fd');
    }
  }
  add.hp = 0;
  return true;
}
function applyDungeonBossDirectorMechanics(now){
  if(!(state.mode === 'dungeon' || state.mode === 'mythic')) return;
  const ds = state.dungeonState || state.mythicState;
  if(!ds) return;
  for(const add of (state.currentMonsters || [])){
    if(add && add.hp > 0 && add._directorAdd && add._expiresAt) resolveDungeonDirectorAddExpiry(add, now);
  }
  let fired = 0;
  for(const mon of (state.currentMonsters || [])){
    if(!mon || mon.hp <= 0 || !mon.isBoss) continue;
    const bossData = getMonsterBossData(mon) || { name:mon.bossName || mon.name, emoji:mon.emoji || '👹' };
    const events = getDungeonBossDirectorEvents(bossData);
    if(!mon._directorLast) mon._directorLast = {};
    const hpFrac = mon.hpMax > 0 ? mon.hp / mon.hpMax : 1;
    const shieldNow = mon._arcaneShield || 0;
    if((mon._directorPrevShield || 0) > 0 && shieldNow <= 0){
      mon.stunUntil = Math.max(mon.stunUntil || 0, now + 1400);
      mon.sunderUntil = Math.max(mon.sunderUntil || 0, now + 7000);
      state.resource = Math.min(state.resourceMax || 100, (state.resource || 0) + Math.max(8, Math.floor((state.resourceMax || 100) * 0.18)));
      if(typeof grantNextSkillCrit === 'function') grantNextSkillCrit(1);
      dungeonBossDirectorCounter('shieldBreak');
      noteDungeonBossChallenge(mon, 'shieldBreak');
      log(`💥 你击碎了 ${mon.bossName || mon.name} 的机制护盾,获得资源并制造破绽!`, 'epic');
      showMonsterFloat(mon, '💥破盾破绽', '#fde047', { variant:'boss', scale:1.12 });
      markDirty('hero', 'stage');
    }
    mon._directorPrevShield = shieldNow;
    if(events.some(e => e.key === 'executeScript') && hpFrac <= 0.22 && !mon._directorExecuteUsed){
      mon._directorExecuteUsed = true;
      mon.atkInterval = Math.max(620, Math.floor((mon.atkInterval || 1200) * 0.82));
      queueDungeonBossSkill(mon, DUNGEON_BOSS_DIRECTOR_SKILLS.find(s => s.key === 'executionOrder'), '低血斩杀');
      dungeonBossDirectorCounter('executeScript');
      log(`💀 ${mon.bossName || mon.name} 进入斩杀脚本,下一次读条将点名处刑!`, 'bad');
      showMonsterFloat(mon, '💀斩杀脚本', '#fecaca', { variant:'boss', scale:1.1 });
      fired++;
    }
    if(events.some(e => e.key === 'mirrorEchoes') && hpFrac <= 0.66 && !mon._directorEcho66){
      mon._directorEcho66 = true;
      spawnDungeonDirectorAdd(mon, { key:'echo', icon:'🪞', name:'镜像回声', hpPct:0.10, atkPct:0.28, defPct:0.28, durationMs:13000, expireEffect:'echo' }, now);
      spawnDungeonDirectorAdd(mon, { key:'echo', icon:'🪞', name:'镜像回声', hpPct:0.10, atkPct:0.28, defPct:0.28, durationMs:13000, expireEffect:'echo' }, now);
      mon._monsterDrBuffUntil = now + 9000;
      mon._monsterDrBuffPct = Math.max(mon._monsterDrBuffPct || 0, 0.18);
      dungeonBossDirectorCounter('mirrorEchoes');
      log(`🪞 ${mon.bossName || mon.name} 分裂出镜像回声,先清镜像会轻松很多!`, 'bad');
      fired++;
    }
    if(events.some(e => e.key === 'ritualTotem') && now - (mon._directorLast.ritualTotem || 0) > 26000){
      mon._directorLast.ritualTotem = now;
      spawnDungeonDirectorAdd(mon, { key:'ritual', icon:'🕯️', name:'仪式锚点', hpPct:0.13, atkPct:0.18, defPct:0.45, durationMs:11500, expireEffect:'ritual' }, now);
      dungeonBossDirectorCounter('ritualTotem');
      log(`🕯️ ${mon.bossName || mon.name} 召唤仪式锚点,限时击破可阻止强化读条!`, 'bad');
      fired++;
    }
    if(events.some(e => e.key === 'addSacrifice') && now - (mon._directorLast.addSacrifice || 0) > 30000){
      const adds = (state.currentMonsters || []).filter(x => x && x.hp > 0 && x._summoned && x._summonerId === mon._uid);
      if(adds.length){
        mon._directorLast.addSacrifice = now;
        const victim = adds[0];
        victim.hp = 0;
        const heal = Math.max(1, Math.floor(mon.hpMax * 0.055));
        mon.hp = Math.min(mon.hpMax, mon.hp + heal);
        mon._trickAtkBuff = now + 6500;
        mon._trickAtkPct = Math.max(mon._trickAtkPct || 0, 32);
        dungeonBossDirectorCounter('addSacrifice');
        log(`🔺 ${mon.bossName || mon.name} 献祭了爪牙,恢复生命并强化攻击!`, 'bad');
        showMonsterFloat(mon, `🔺+${heal}`, '#fda4af', { variant:'heal', scale:1.06 });
        fired++;
      }
    }
    if(fired >= 2) break;
  }
}
const DUNGEON_BOSS_TACTICS = [
  { key:'royalCommand', icon:'👑', name:'王者号令', match:/王|皇帝|领主|女王|议会|酋长|指挥|统御/, desc:'首领会周期性号令全场,给所有敌人加护盾并提高攻击。' },
  { key:'dragonFury', icon:'🐉', name:'龙怒升温', match:/龙|暮光|奈法|奥妮克希亚|瓦里奥那|塞拉图斯|龙息|飞龙/, desc:'首领血量越低龙怒越高,火焰机制更频繁且伤害更高。' },
  { key:'oldGodWhisper', icon:'👁️', name:'古神低语', match:/古神|克苏恩|恩佐斯|尤格|低语|疯狂|腐化|梦魇|虚空|眼/, desc:'低语会周期叠加精神压力,抽取资源并制造恐惧/易伤。' },
  { key:'bloodHunger', icon:'🩸', name:'鲜血饥渴', match:/鲜血|血|吸血|女王|王子|屠夫|献祭|心脏/, desc:'玩家生命越低,首领越容易吸血并进入嗜血。' },
  { key:'titanProtocol', icon:'⚙️', name:'泰坦协议', match:/泰坦|机械|钢铁|构造|熔炉|守卫|巨像|机器人|黑石/, desc:'首领轮换防御、攻击、净化协议,像机器一样滚动强化。' },
  { key:'necroticHarvest', icon:'☠️', name:'亡者收割', match:/巫妖|亡|天灾|死亡|骸骨|墓|霜|冰|克尔苏加德|阿尔萨斯/, desc:'首领会收割亡魂,召唤亡者并压制治疗。' },
  { key:'felPact', icon:'😈', name:'邪能契约', match:/恶魔|邪能|军团|伊利丹|基尔加丹|阿克蒙德|地狱|末日/, desc:'邪能契约会用护盾换爆发,并不断拉来恶魔爪牙。' },
  { key:'stormCharge', icon:'⚡', name:'风暴充能', match:/风暴|雷|闪电|诺库德|奥丁|莱杉|电|云|天神/, desc:'首领会积累充能,满层后释放强力链击。' },
  { key:'arcaneRunes', icon:'🔮', name:'奥术符文阵', match:/奥术|魔网|法师|符文|星界|群星|魔法|艾利桑德|麦迪文/, desc:'战场会出现符文核心,击破能打断能量循环。' },
  { key:'shadowDuel', icon:'🪞', name:'暗影决斗', match:/影|暗|镜|幻象|潜行|刺客|幽魂|灵魂|暮光/, desc:'首领会制造决斗标记,让玩家短时间承受更高单体压力。' },
  { key:'berserkClock', icon:'⏱️', name:'狂暴计时', match:/./, desc:'所有副本首领都会随战斗时间逐步升温,拖太久会越来越危险。' },
];
function getDungeonBossTactics(bossData){
  const text = dungeonBossSpectacleText(bossData);
  if(!text.trim()) return [];
  const out = [];
  for(const tactic of DUNGEON_BOSS_TACTICS){
    if(tactic.match.test(text)) out.push(tactic);
  }
  const generic = DUNGEON_BOSS_TACTICS.find(t => t.key === 'berserkClock');
  if(generic && !out.some(t => t.key === generic.key)) out.push(generic);
  return out.slice(0, 4);
}
function dungeonBossTacticCounter(key){
  const ds = state.dungeonState || state.mythicState;
  if(!ds) return;
  ds.bossTacticEvents = (ds.bossTacticEvents || 0) + 1;
  if(key){
    if(!ds.bossTacticBreakdown) ds.bossTacticBreakdown = {};
    ds.bossTacticBreakdown[key] = (ds.bossTacticBreakdown[key] || 0) + 1;
  }
}
function applyDungeonBossTacticsOnSpawn(mon, bossData, dg, ds){
  if(!mon || !mon.isBoss || !bossData) return;
  const tactics = getDungeonBossTactics(bossData);
  if(!tactics.length) return;
  mon._bossTactics = tactics.map(t => t.key);
  mon._bossTacticLast = {};
  mon._bossTacticStacks = {};
  mon._bossTacticStartedAt = Date.now();
  for(const t of tactics){
    setMonsterTrickAura(mon, 'bossTactic:' + t.key, { name:t.name, icon:t.icon, desc:t.desc }, 0, { desc:t.desc });
  }
  if(ds) ds.bossTacticsSeen = (ds.bossTacticsSeen || 0) + tactics.length;
  showMonsterFloat(mon, `🎭战术×${tactics.length}`, '#f9a8d4', { variant:'boss', scale:1.06 });
}
function bossHasTactic(mon, key){ return !!(mon && Array.isArray(mon._bossTactics) && mon._bossTactics.includes(key)); }
function triggerBossTactic(mon, key, now, cd){
  if(!mon || mon.hp <= 0 || !bossHasTactic(mon, key)) return false;
  if(!mon._bossTacticLast) mon._bossTacticLast = {};
  if(now - (mon._bossTacticLast[key] || 0) < cd) return false;
  mon._bossTacticLast[key] = now;
  dungeonBossTacticCounter(key);
  return true;
}
function applyDungeonBossTacticMechanics(now){
  if(!(state.mode === 'dungeon' || state.mode === 'mythic')) return;
  const ds = state.dungeonState || state.mythicState;
  if(!ds) return;
  let fired = 0;
  for(const mon of (state.currentMonsters || [])){
    if(!mon || mon.hp <= 0 || !mon.isBoss || !mon._bossTactics?.length) continue;
    const hpFrac = mon.hpMax > 0 ? mon.hp / mon.hpMax : 1;
    if(bossHasTactic(mon, 'dragonFury')){
      const desired = hpFrac <= 0.25 ? 3 : (hpFrac <= 0.50 ? 2 : (hpFrac <= 0.75 ? 1 : 0));
      const current = mon._bossTacticStacks.dragonFury || 0;
      if(desired > current){
        mon._bossTacticStacks.dragonFury = desired;
        mon.atk = Math.floor(mon.atk * (1 + 0.05 * (desired - current)));
        mon._trickSpdBuff = Math.max(mon._trickSpdBuff || 0, now + 9000);
        mon._trickSpdPct = Math.max(mon._trickSpdPct || 0, 18 + desired * 6);
        setMonsterTrickAura(mon, 'bossTactic:dragonFuryStacks', { name:'龙怒升温', icon:'🐉', desc:`龙怒 ${desired} 层:攻击和攻速提高` }, 0, { stacks:desired, desc:`龙怒 ${desired} 层:攻击和攻速提高` });
        showMonsterFloat(mon, `🐉龙怒${desired}`, '#fb923c', { variant:'boss', scale:1.08 });
        dungeonBossTacticCounter('dragonFuryStack');
        fired++;
      }
    }
    if(triggerBossTactic(mon, 'royalCommand', now, 19000)){
      const allies = (state.currentMonsters || []).filter(x => x && x.hp > 0);
      for(const a of allies){
        a._arcaneShield = (a._arcaneShield || 0) + Math.max(1, Math.floor(a.hpMax * 0.035));
        a._trickAtkBuff = Math.max(a._trickAtkBuff || 0, now + 6200);
        a._trickAtkPct = Math.max(a._trickAtkPct || 0, 24);
        syncMonsterShieldAura(a);
        showMonsterFloat(a, '👑号令', '#fde68a');
      }
      log(`👑 ${mon.bossName || mon.name} 发出王者号令,全场敌人获得护盾和攻击强化`, 'bad');
      fired++;
    }
    if(triggerBossTactic(mon, 'oldGodWhisper', now, 17000)){
      const stacks = (mon._bossTacticStacks.oldGodWhisper || 0) + 1;
      mon._bossTacticStacks.oldGodWhisper = Math.min(8, stacks);
      const dmg = dungeonBossSpectacleDmg(0.022 + stacks * 0.003, mon, 0.7);
      applyHeroDamage(dmg, mon, { label:t=>'👁️-' + t, color:'#c084fc', now });
      const drain = Math.min(state.resource || 0, Math.floor((state.resourceMax || 100) * (0.06 + stacks * 0.01)));
      if(drain > 0) state.resource = Math.max(0, (state.resource || 0) - drain);
      if(stacks % 3 === 0) applyHeroDebuff('fear', 900);
      else applyHeroDebuff('vulnerable', 3600);
      showMonsterFloat(mon, `👁️低语${stacks}`, '#c084fc', { variant:'boss' });
      fired++;
    }
    if(triggerBossTactic(mon, 'bloodHunger', now, (state.hp || 0) < (state.hero.hpMax || 1) * 0.45 ? 10500 : 16500)){
      const dmg = applyHeroDamage(dungeonBossSpectacleDmg((state.hp || 0) < (state.hero.hpMax || 1) * 0.45 ? 0.048 : 0.026, mon, 1.0), mon, { label:t=>'🩸-' + t, color:'#ef4444', now });
      const heal = Math.max(1, Math.floor((dmg || 1) * 0.8));
      mon.hp = Math.min(mon.hpMax, mon.hp + heal);
      mon._trickLeech = Math.max(mon._trickLeech || 0, now + 7000);
      mon._trickLeechPct = Math.max(mon._trickLeechPct || 0, 24);
      showMonsterFloat(mon, `🩸+${heal}`, '#fda4af', { variant:'heal' });
      fired++;
    }
    if(triggerBossTactic(mon, 'titanProtocol', now, 15000)){
      const step = ((mon._bossTacticStacks.titanProtocol || 0) % 3) + 1;
      mon._bossTacticStacks.titanProtocol = step;
      if(step === 1){
        mon._arcaneShield = (mon._arcaneShield || 0) + Math.max(1, Math.floor(mon.hpMax * 0.07));
        syncMonsterShieldAura(mon);
        showMonsterFloat(mon, '⚙️防御协议', '#93c5fd');
      }else if(step === 2){
        mon._trickAtkBuff = Math.max(mon._trickAtkBuff || 0, now + 7000);
        mon._trickAtkPct = Math.max(mon._trickAtkPct || 0, 34);
        showMonsterFloat(mon, '⚙️攻击协议', '#fca5a5');
      }else{
        mon._monsterDrBuffUntil = Math.max(mon._monsterDrBuffUntil || 0, now + 6200);
        mon._monsterDrBuffPct = Math.max(mon._monsterDrBuffPct || 0, 0.24);
        applyHeroDebuff('weaken', 4200);
        showMonsterFloat(mon, '⚙️净化协议', '#f0abfc');
      }
      fired++;
    }
    if(triggerBossTactic(mon, 'necroticHarvest', now, 21000)){
      applyHeroDebuff('decay2', 5200);
      summonMonsterAlly(mon, { summonCount:1, summonTheme:'undead', summonHpPct:0.17, summonAtkPct:0.32, summonDefPct:0.42 }, now);
      mon._arcaneShield = (mon._arcaneShield || 0) + Math.max(1, Math.floor(mon.hpMax * 0.025));
      syncMonsterShieldAura(mon);
      showMonsterFloat(mon, '☠️收割', '#d8b4fe');
      fired++;
    }
    if(triggerBossTactic(mon, 'felPact', now, 18500)){
      mon._arcaneShield = (mon._arcaneShield || 0) + Math.max(1, Math.floor(mon.hpMax * 0.045));
      mon._trickAtkBuff = Math.max(mon._trickAtkBuff || 0, now + 5800);
      mon._trickAtkPct = Math.max(mon._trickAtkPct || 0, 30);
      syncMonsterShieldAura(mon);
      summonMonsterAlly(mon, { summonCount:1, summonTheme:'demon', summonHpPct:0.16, summonAtkPct:0.36, summonDefPct:0.34 }, now);
      applyHeroDebuff('burn', 4800, { dps:dungeonBossSpectacleDmg(0.010, mon, 0.3) });
      showMonsterFloat(mon, '😈契约', '#fb923c');
      fired++;
    }
    if(triggerBossTactic(mon, 'stormCharge', now, 9000)){
      const charge = (mon._bossTacticStacks.stormCharge || 0) + 1;
      mon._bossTacticStacks.stormCharge = charge;
      showMonsterFloat(mon, `⚡充能${charge}`, '#67e8f9');
      if(charge >= 3){
        mon._bossTacticStacks.stormCharge = 0;
        applyHeroDamage(dungeonBossSpectacleDmg(0.065, mon, 2.0), mon, { label:t=>'⚡-' + t, color:'#67e8f9', now, variant:'boss' });
        applyHeroDebuff('silence', 1400);
        log(`⚡ ${mon.bossName || mon.name} 释放满层风暴充能!`, 'bad');
      }
      fired++;
    }
    if(triggerBossTactic(mon, 'arcaneRunes', now, 23000)){
      const rune = spawnDungeonDirectorAdd(mon, { key:'rune', icon:'🔮', name:'奥术符文核心', hpPct:0.10, atkPct:0.10, defPct:0.50, durationMs:10000, expireEffect:'ritual' }, now);
      if(rune){
        rune._bossTacticReward = { type:'arcaneRune' };
        log(`🔮 ${mon.bossName || mon.name} 展开奥术符文核心,击破可反制能量循环`, 'bad');
      }
      fired++;
    }
    if(triggerBossTactic(mon, 'shadowDuel', now, 20000)){
      applyHeroDebuff('brittle', 5200);
      mon._monsterDrBuffUntil = Math.max(mon._monsterDrBuffUntil || 0, now + 5200);
      mon._monsterDrBuffPct = Math.max(mon._monsterDrBuffPct || 0, 0.18);
      showMonsterFloat(mon, '🪞决斗标记', '#f0abfc');
      log(`🪞 ${mon.bossName || mon.name} 标记你进入暗影决斗`, 'bad');
      fired++;
    }
    if(triggerBossTactic(mon, 'berserkClock', now, 26000)){
      const stack = Math.min(10, (mon._bossTacticStacks.berserkClock || 0) + 1);
      mon._bossTacticStacks.berserkClock = stack;
      mon.atk = Math.floor(mon.atk * 1.035);
      if(stack % 2 === 0){
        mon._trickSpdBuff = Math.max(mon._trickSpdBuff || 0, now + 6000);
        mon._trickSpdPct = Math.max(mon._trickSpdPct || 0, 15 + stack);
      }
      setMonsterTrickAura(mon, 'bossTactic:berserkClockStacks', { name:'狂暴计时', icon:'⏱️', desc:`战斗拖延使首领攻击提高(${stack}层)` }, 0, { stacks:stack, desc:`战斗拖延使首领攻击提高(${stack}层)` });
      showMonsterFloat(mon, `⏱️狂暴${stack}`, '#fb7185', { variant:'boss' });
      fired++;
    }
    if(fired >= 3) break;
  }
  if(fired && typeof markDirty === 'function') markDirty('hero', 'stage');
}
const DUNGEON_BOSS_WEAKPOINTS = [
  { key:'dragonWing', icon:'🪽', name:'龙翼裂口', match:/龙|暮光|奈法|奥妮克希亚|瓦里奥那|塞拉图斯|龙息|飞龙/, threshold:0.72, hpPct:0.095, durationMs:11500, desc:'击破后使首领短暂硬直并降低攻速;超时会触发灼热俯冲。' },
  { key:'oldGodEye', icon:'👁️', name:'凝视之眼', match:/古神|克苏恩|恩佐斯|尤格|眼|低语|疯狂|梦魇|虚空|腐化/, threshold:0.78, hpPct:0.085, durationMs:10500, desc:'击破后返还资源并打断低语;超时会造成恐惧和易伤。' },
  { key:'bloodHeart', icon:'🫀', name:'鲜血心脏', match:/鲜血|血|吸血|女王|王子|屠夫|献祭|心脏/, threshold:0.66, hpPct:0.10, durationMs:12000, desc:'击破后压制首领吸血;超时会为首领大量回血。' },
  { key:'forgePlate', icon:'🛡️', name:'装甲接缝', match:/钢铁|机械|泰坦|构造|熔炉|护甲|守卫|巨像|机器人|黑石/, threshold:0.74, hpPct:0.11, durationMs:12500, desc:'击破后破甲并移除护盾;超时会重新装甲化。' },
  { key:'necroticPhylactery', icon:'⚱️', name:'命匣裂纹', match:/巫妖|亡|天灾|死亡|骸骨|墓|霜|冰|克尔苏加德|阿尔萨斯/, threshold:0.62, hpPct:0.09, durationMs:12000, desc:'击破后压制亡者召唤;超时会召唤亡魂并施加凋零。' },
  { key:'felAnchor', icon:'🟢', name:'邪能锚点', match:/恶魔|邪能|军团|伊利丹|基尔加丹|阿克蒙德|地狱|末日/, threshold:0.70, hpPct:0.10, durationMs:11000, desc:'击破后让邪能反噬首领;超时会召来恶魔援军。' },
  { key:'stormRod', icon:'⚡', name:'风暴导体', match:/风暴|雷|闪电|诺库德|奥丁|莱杉|电|云|天神/, threshold:0.68, hpPct:0.085, durationMs:10000, desc:'击破后清空风暴充能;超时会释放链雷。' },
  { key:'arcaneFocus', icon:'🔮', name:'奥术焦点', match:/奥术|魔网|法师|符文|星界|群星|魔法|艾利桑德|麦迪文/, threshold:0.76, hpPct:0.09, durationMs:10500, desc:'击破后反制读条并返还资源;超时会加速首领下一次施法。' },
  { key:'royalBanner', icon:'🚩', name:'统御战旗', match:/王|皇帝|领主|女王|议会|酋长|指挥|统御/, threshold:0.82, hpPct:0.10, durationMs:13000, desc:'击破后削弱全场敌人;超时会触发王者号令。' },
  { key:'shadowMask', icon:'🎭', name:'暗影面具', match:/影|暗|镜|幻象|潜行|刺客|幽魂|灵魂|暮光/, threshold:0.58, hpPct:0.085, durationMs:10000, desc:'击破后驱散暗影决斗;超时会让玩家易爆。' },
  { key:'exposedCore', icon:'💠', name:'暴露核心', match:/./, threshold:0.40, hpPct:0.075, durationMs:9500, desc:'通用弱点,击破后获得爆发窗口;超时会让首领小幅狂暴。' },
];
function getDungeonBossWeakpoints(bossData){
  const text = dungeonBossSpectacleText(bossData);
  if(!text.trim()) return [];
  const out = [];
  for(const wp of DUNGEON_BOSS_WEAKPOINTS){
    if(wp.match.test(text)) out.push(wp);
  }
  const generic = DUNGEON_BOSS_WEAKPOINTS.find(w => w.key === 'exposedCore');
  if(generic && !out.some(w => w.key === generic.key)) out.push(generic);
  return out.slice(0, 4);
}
function dungeonBossWeakpointCounter(key){
  const ds = state.dungeonState || state.mythicState;
  if(!ds) return;
  ds.bossWeakpointEvents = (ds.bossWeakpointEvents || 0) + 1;
  if(key){
    if(!ds.bossWeakpointBreakdown) ds.bossWeakpointBreakdown = {};
    ds.bossWeakpointBreakdown[key] = (ds.bossWeakpointBreakdown[key] || 0) + 1;
  }
}
function spawnDungeonBossWeakpoint(mon, wp, now){
  if(!mon || !wp) return null;
  const add = spawnDungeonDirectorAdd(mon, {
    key:'weakpoint:' + wp.key,
    icon:wp.icon,
    name:wp.name,
    hpPct:wp.hpPct || 0.08,
    atkPct:0.08,
    defPct:0.35,
    durationMs:wp.durationMs || 10000
  }, now);
  if(!add) return null;
  add._bossWeakpoint = wp.key;
  add._bossWeakpointName = wp.name;
  add._bossWeakpointReward = { type:wp.key, bossUid:mon._uid };
  add._bossWeakpointExpireAt = add._expiresAt;
  add._expireEffect = null;
  const ds = state.dungeonState || state.mythicState;
  if(ds) ds.bossWeakpointsSpawned = (ds.bossWeakpointsSpawned || 0) + 1;
  dungeonBossWeakpointCounter('spawn:' + wp.key);
  log(`${wp.icon} ${mon.bossName || mon.name} 暴露弱点: ${wp.name}!`, 'bad');
  return add;
}
function resolveDungeonBossWeakpointExpiry(obj, now){
  if(!obj || obj.hp <= 0 || !obj._bossWeakpoint || !obj._bossWeakpointExpireAt || now < obj._bossWeakpointExpireAt) return false;
  const boss = (state.currentMonsters || []).find(x => x && x.hp > 0 && x._uid === obj._summonerId);
  const key = obj._bossWeakpoint;
  if(boss){
    if(key === 'dragonWing'){
      applyHeroDamage(dungeonBossSpectacleDmg(0.045, boss, 1.4), boss, { label:t=>'🪽-' + t, color:'#fb923c', now });
      applyHeroDebuff('burn', 4200, { dps:dungeonBossSpectacleDmg(0.010, boss, 0.25) });
    }else if(key === 'oldGodEye'){
      applyHeroDebuff('fear', 1000);
      applyHeroDebuff('vulnerable', 4200);
    }else if(key === 'bloodHeart'){
      const heal = Math.max(1, Math.floor(boss.hpMax * 0.075));
      boss.hp = Math.min(boss.hpMax, boss.hp + heal);
      showMonsterFloat(boss, '🫀+' + heal, '#fda4af', { variant:'heal' });
    }else if(key === 'forgePlate'){
      boss._arcaneShield = (boss._arcaneShield || 0) + Math.max(1, Math.floor(boss.hpMax * 0.08));
      boss._monsterDrBuffUntil = Math.max(boss._monsterDrBuffUntil || 0, now + 6500);
      boss._monsterDrBuffPct = Math.max(boss._monsterDrBuffPct || 0, 0.28);
      syncMonsterShieldAura(boss);
    }else if(key === 'necroticPhylactery'){
      applyHeroDebuff('decay2', 5600);
      summonMonsterAlly(boss, { summonCount:1, summonTheme:'undead', summonHpPct:0.18, summonAtkPct:0.34, summonDefPct:0.42 }, now);
    }else if(key === 'felAnchor'){
      summonMonsterAlly(boss, { summonCount:1, summonTheme:'demon', summonHpPct:0.18, summonAtkPct:0.38, summonDefPct:0.34 }, now);
      applyHeroDebuff('burn', 5200, { dps:dungeonBossSpectacleDmg(0.011, boss, 0.3) });
    }else if(key === 'stormRod'){
      applyHeroDamage(dungeonBossSpectacleDmg(0.055, boss, 1.8), boss, { label:t=>'⚡-' + t, color:'#67e8f9', now });
      applyHeroDebuff('silence', 1200);
    }else if(key === 'arcaneFocus'){
      boss._trickSpdBuff = Math.max(boss._trickSpdBuff || 0, now + 6000);
      boss._trickSpdPct = Math.max(boss._trickSpdPct || 0, 28);
      if(bossCasting && bossCasting.bossName === boss.bossName) bossCasting.duration = Math.max(700, bossCasting.duration - 450);
    }else if(key === 'royalBanner'){
      for(const m of (state.currentMonsters || [])){
        if(!m || m.hp <= 0) continue;
        m._arcaneShield = (m._arcaneShield || 0) + Math.max(1, Math.floor(m.hpMax * 0.035));
        syncMonsterShieldAura(m);
      }
    }else if(key === 'shadowMask'){
      applyHeroDebuff('brittle', 5500);
    }else{
      boss.atk = Math.floor(boss.atk * 1.04);
      showMonsterFloat(boss, '💠核心稳定', '#fca5a5');
    }
    showMonsterFloat(boss, `${obj._bossWeakpointName || '弱点'}超时`, '#fb7185', { variant:'boss' });
  }
  obj._roomExpired = true;
  obj.hp = 0;
  dungeonBossWeakpointCounter('expired:' + key);
  return true;
}
function applyDungeonBossWeakpointReward(mon){
  if(!mon?._bossWeakpointReward) return false;
  const ds = state.dungeonState || state.mythicState;
  const key = mon._bossWeakpointReward.type;
  const boss = (state.currentMonsters || []).find(x => x && x.hp > 0 && x._uid === mon._bossWeakpointReward.bossUid);
  const now = Date.now();
  const gain = Math.max(8, Math.floor((state.resourceMax || 100) * 0.14));
  state.resource = Math.min(state.resourceMax || 100, (state.resource || 0) + gain);
  if(typeof grantNextSkillCrit === 'function') grantNextSkillCrit(1);
  if(boss){
    if(!boss._bossTacticStacks) boss._bossTacticStacks = {};
    boss.stunUntil = Math.max(boss.stunUntil || 0, now + 900);
    boss.sunderUntil = Math.max(boss.sunderUntil || 0, now + 6000);
    if(key === 'dragonWing'){
      boss._trickSpdBuff = 0;
      boss.atkInterval = Math.min(2200, Math.floor((boss.atkInterval || 1200) * 1.12));
    }else if(key === 'oldGodEye'){
      boss._bossTacticStacks.oldGodWhisper = 0;
    }else if(key === 'bloodHeart'){
      boss.lifeSteal = Math.max(0, (boss.lifeSteal || 0) * 0.55);
      boss._trickLeech = 0;
    }else if(key === 'forgePlate'){
      boss._arcaneShield = 0;
      boss._monsterDrBuffUntil = 0;
      syncMonsterShieldAura(boss);
    }else if(key === 'necroticPhylactery'){
      boss._monsterDrBuffUntil = Math.min(boss._monsterDrBuffUntil || 0, now + 1000);
    }else if(key === 'felAnchor'){
      applyMonsterDot(boss, 'weakpoint:fel', Math.max(1, Math.floor(boss.hpMax * 0.006)), 5000, { icon:'😈', name:'邪能反噬', source:'weakpoint' });
    }else if(key === 'stormRod'){
      boss._bossTacticStacks.stormCharge = 0;
    }else if(key === 'arcaneFocus'){
      if(bossCasting && bossCasting.bossName === boss.bossName){
        hideBossCastBar();
        bossCasting = null;
        log('🔮 奥术焦点反制了首领当前读条!', 'good');
      }
    }else if(key === 'royalBanner'){
      for(const m of (state.currentMonsters || [])){
        if(m && m.hp > 0){
          m._trickAtkBuff = 0;
          showMonsterFloat(m, '🚩溃散', '#bfdbfe');
        }
      }
    }else if(key === 'shadowMask'){
      boss._monsterDrBuffUntil = 0;
    }else{
      boss._monsterDrBuffUntil = 0;
    }
    showMonsterFloat(boss, `${mon._bossWeakpointName || '弱点'}破坏`, '#fde047', { variant:'boss', scale:1.1 });
  }
  if(ds){
    ds.bossWeakpointsBroken = (ds.bossWeakpointsBroken || 0) + 1;
    ds.bossTacticObjectivesBroken = (ds.bossTacticObjectivesBroken || 0) + 1;
  }
  if(boss){
    noteDungeonBossChallenge(boss, 'weakpoint');
    noteDungeonBossChallenge(boss, 'objective');
  }
  dungeonBossWeakpointCounter('broken:' + key);
  log(`${mon._bossWeakpointName || 'Boss弱点'} 被击破: 资源 +${gain},下个技能必暴,首领露出破绽`, 'epic');
  markDirty('hero', 'stage');
  return true;
}
function applyDungeonBossWeakpointMechanics(now){
  if(!(state.mode === 'dungeon' || state.mode === 'mythic')) return;
  for(const obj of (state.currentMonsters || [])){
    if(obj && obj.hp > 0 && obj._bossWeakpoint) resolveDungeonBossWeakpointExpiry(obj, now);
  }
  for(const mon of (state.currentMonsters || [])){
    if(!mon || mon.hp <= 0 || !mon.isBoss) continue;
    const bossData = getMonsterBossData(mon) || { name:mon.bossName || mon.name, emoji:mon.emoji || '👹' };
    const weakpoints = getDungeonBossWeakpoints(bossData);
    if(!weakpoints.length) continue;
    if(!mon._bossWeakpointSeen) mon._bossWeakpointSeen = {};
    const hpFrac = mon.hpMax > 0 ? mon.hp / mon.hpMax : 1;
    for(let i = 0; i < weakpoints.length; i++){
      const wp = weakpoints[i];
      const threshold = Math.max(0.18, (wp.threshold || 0.50) - i * 0.10);
      if(hpFrac <= threshold && !mon._bossWeakpointSeen[wp.key]){
        mon._bossWeakpointSeen[wp.key] = 1;
        spawnDungeonBossWeakpoint(mon, wp, now);
        break;
      }
    }
  }
}
const DUNGEON_BOSS_CHALLENGE_SEALS = [
  { key:'cleanInterrupts', icon:'🦶', name:'精准打断', event:'interrupt', target:1, match:/奥术|法师|魔法|古神|低语|邪能|恶魔|巫妖|符文|议会/, desc:'在本场首领战中成功打断1次可打断读条;高危读条被打断时还会制造短暂破绽。' },
  { key:'weakpointHunter', icon:'💠', name:'弱点猎手', event:'weakpoint', target:1, match:/龙|古神|鲜血|机械|巫妖|恶魔|风暴|奥术|王|影/, desc:'击破1个首领暴露的弱点;弱点通常在血线变化或机制窗口出现。' },
  { key:'addControl', icon:'👥', name:'控场清理', event:'addKill', target:2, match:/召唤|亡|恶魔|虫|瘟疫|议会|军团|血/, desc:'击杀2个首领召唤物或机制援军;优先转火小怪可以阻止献祭、护盾或额外读条。' },
  { key:'shieldBreaker', icon:'💥', name:'破盾专家', event:'shieldBreak', target:1, match:/护盾|奥术|机械|钢铁|泰坦|魔法|符文/, desc:'打破1次首领机制护盾;破盾会返还资源并让首领短暂易伤。' },
  { key:'ritualDenied', icon:'🕯️', name:'仪式否决', event:'objective', target:1, match:/仪式|古神|邪能|奥术|符文|低语|恶魔/, desc:'摧毁1个仪式锚点、符文核心或限时机制目标;未处理通常会强化首领下一次读条。' },
  { key:'swiftKill', icon:'⏱️', name:'速战速决', event:'killFast', target:1, seconds:55, match:/./, desc:'从首领出现开始55秒内击败它;适合爆发、斩杀和资源规划构筑。' },
  { key:'healthyFinish', icon:'❤️', name:'稳健收尾', event:'killHealthy', target:1, hpPct:0.35, match:/./, desc:'击败首领时自身生命不低于35%;需要防御技能、治疗窗口或更干净的机制处理。' },
];
function getDungeonBossChallengeSeals(bossData){
  const text = dungeonBossSpectacleText(bossData);
  if(!text.trim()) return [];
  const out = [];
  for(const ch of DUNGEON_BOSS_CHALLENGE_SEALS){
    if(ch.match.test(text)) out.push(Object.assign({}, ch));
  }
  const byKey = {};
  const unique = [];
  for(const ch of out){
    if(byKey[ch.key]) continue;
    byKey[ch.key] = true;
    unique.push(ch);
  }
  for(const key of ['swiftKill', 'healthyFinish']){
    if(unique.some(ch => ch.key === key)) continue;
    const generic = DUNGEON_BOSS_CHALLENGE_SEALS.find(ch => ch.key === key);
    if(generic) unique.push(Object.assign({}, generic));
  }
  return unique.slice(0, 4);
}
function applyDungeonBossChallengesOnSpawn(mon, bossData, dg, ds){
  if(!mon || !mon.isBoss || !bossData) return;
  const challenges = getDungeonBossChallengeSeals(bossData);
  if(!challenges.length) return;
  mon._bossChallenges = challenges.map(ch => Object.assign({}, ch, { progress:0, completed:false, failed:false, startedAt:Date.now() }));
  if(ds){
    ds.bossChallengesStarted = (ds.bossChallengesStarted || 0) + mon._bossChallenges.length;
    ds.bossChallengeSeals = ds.bossChallengeSeals || {};
    for(const ch of mon._bossChallenges){
      const key = ch.key || ch.name;
      if(!key) continue;
      if(!ds.bossChallengeSeals[key]){
        ds.bossChallengeSeals[key] = {
          key,
          name:ch.name,
          icon:ch.icon,
          desc:ch.desc,
          event:ch.event,
          target:ch.target,
          seconds:ch.seconds,
          hpPct:ch.hpPct,
          started:0,
          completed:0,
        };
      }
      ds.bossChallengeSeals[key].started = (ds.bossChallengeSeals[key].started || 0) + 1;
    }
  }
  showMonsterFloat(mon, `🏅挑战×${mon._bossChallenges.length}`, '#facc15', { variant:'boss', scale:1.04 });
}
function dungeonBossChallengeOwner(unit){
  if(!unit) return null;
  if(unit.isBoss) return unit;
  if(unit._summonerId){
    return (state.currentMonsters || []).find(x => x && x.hp > 0 && x.isBoss && x._uid === unit._summonerId) || null;
  }
  return null;
}
function completeDungeonBossChallenge(mon, ch, reason){
  if(!mon || !ch || ch.completed || ch.failed) return false;
  ch.completed = true;
  ch.completedAt = Date.now();
  ch.reason = reason || ch.name;
  const ds = state.dungeonState || state.mythicState;
  if(ds){
    ds.bossChallengesCompleted = (ds.bossChallengesCompleted || 0) + 1;
    const key = ch.key || ch.name;
    ds.bossChallengeSeals = ds.bossChallengeSeals || {};
    if(key){
      if(!ds.bossChallengeSeals[key]){
        ds.bossChallengeSeals[key] = {
          key,
          name:ch.name,
          icon:ch.icon,
          desc:ch.desc,
          event:ch.event,
          target:ch.target,
          seconds:ch.seconds,
          hpPct:ch.hpPct,
          started:0,
          completed:0,
        };
      }
      ds.bossChallengeSeals[key].completed = (ds.bossChallengeSeals[key].completed || 0) + 1;
    }
  }
  showMonsterFloat(mon, `🏅${ch.name}`, '#facc15', { variant:'boss', scale:1.08 });
  log(`🏅 Boss挑战完成: ${mon.bossName || mon.name} - ${ch.name}`, 'epic');
  return true;
}
function noteDungeonBossChallenge(unit, event, count){
  const mon = dungeonBossChallengeOwner(unit);
  if(!mon || !mon._bossChallenges?.length) return;
  const amount = Math.max(1, count || 1);
  for(const ch of mon._bossChallenges){
    if(ch.completed || ch.failed || ch.event !== event) continue;
    ch.progress = Math.min(ch.target || 1, (ch.progress || 0) + amount);
    if(ch.progress >= (ch.target || 1)) completeDungeonBossChallenge(mon, ch, event);
  }
}
function finalizeDungeonBossChallenges(mon, councilStillFighting){
  if(!mon || !mon.isBoss || councilStillFighting || !mon._bossChallenges?.length) return;
  const now = Date.now();
  for(const ch of mon._bossChallenges){
    if(ch.completed || ch.failed) continue;
    if(ch.event === 'killFast'){
      const elapsed = now - (mon._bossTacticStartedAt || mon._spawnAt || now);
      if(elapsed <= (ch.seconds || 55) * 1000) completeDungeonBossChallenge(mon, ch, 'killFast');
      else ch.failed = true;
    }else if(ch.event === 'killHealthy'){
      if((state.hp || 0) >= (state.hero.hpMax || 1) * (ch.hpPct || 0.35)) completeDungeonBossChallenge(mon, ch, 'killHealthy');
      else ch.failed = true;
    }
  }
  const completed = mon._bossChallenges.filter(ch => ch.completed).length;
  if(completed <= 0) return;
  const ds = state.dungeonState || state.mythicState;
  const gold = Math.max(1, Math.floor((mon.goldReward || 1) * completed * 0.08));
  const honor = completed * (mon._isRaid ? 4 : 2);
  const gems = completed >= 3 ? 1 : (Math.random() < completed * 0.18 ? 1 : 0);
  state.gold += gold;
  state.honor += honor;
  if(gems > 0) state.gem += gems;
  if(ds){
    ds.bossChallengeBonusGold = (ds.bossChallengeBonusGold || 0) + gold;
    ds.bossChallengeBonusHonor = (ds.bossChallengeBonusHonor || 0) + honor;
    ds.bossChallengeBonusGems = (ds.bossChallengeBonusGems || 0) + gems;
  }
  log(`🏅 Boss挑战奖励: +${gold}💰 +${honor}荣誉${gems ? ' +' + gems + '💎' : ''}`, 'legend');
}
const DUNGEON_BOSS_GRAND_THEMES = [
  { key:'dragon', icon:'🐉', name:'龙裔', color:'#fb923c', match:/龙|暮光|奈法|奥妮克希亚|瓦里奥那|塞拉图斯|龙息|飞龙/, desc:'龙裔威压改变战场节奏。' },
  { key:'oldgod', icon:'👁️', name:'古神', color:'#c084fc', match:/古神|克苏恩|恩佐斯|尤格|眼|低语|疯狂|梦魇|虚空|腐化/, desc:'古神低语侵蚀心智。' },
  { key:'blood', icon:'🩸', name:'鲜血', color:'#fda4af', match:/鲜血|血|吸血|女王|王子|屠夫|献祭|心脏/, desc:'鲜血仪式会转化伤害与治疗。' },
  { key:'forge', icon:'⚙️', name:'熔炉', color:'#93c5fd', match:/钢铁|机械|泰坦|构造|熔炉|护甲|守卫|巨像|机器人|黑石/, desc:'熔炉协议滚动强化首领。' },
  { key:'death', icon:'☠️', name:'亡寒', color:'#d8b4fe', match:/巫妖|亡|天灾|死亡|骸骨|墓|霜|冰|克尔苏加德|阿尔萨斯/, desc:'亡寒魔法压制恢复。' },
  { key:'fel', icon:'😈', name:'邪能', color:'#fb923c', match:/恶魔|邪能|军团|伊利丹|基尔加丹|阿克蒙德|地狱|末日/, desc:'邪能契约召来援军。' },
  { key:'storm', icon:'⚡', name:'风暴', color:'#67e8f9', match:/风暴|雷|闪电|诺库德|奥丁|莱杉|电|云|天神/, desc:'风暴能量会连锁爆发。' },
  { key:'arcane', icon:'🔮', name:'奥术', color:'#a78bfa', match:/奥术|魔网|法师|符文|星界|群星|魔法|艾利桑德|麦迪文/, desc:'奥术矩阵干扰资源。' },
  { key:'shadow', icon:'🪞', name:'暗影', color:'#f0abfc', match:/影|暗|镜|幻象|潜行|刺客|幽魂|灵魂|暮光/, desc:'暗影幻象制造错误窗口。' },
  { key:'royal', icon:'👑', name:'统御', color:'#fde68a', match:/王|皇帝|领主|女王|议会|酋长|指挥|统御/, desc:'统御号令会强化全场。' },
  { key:'plague', icon:'🦠', name:'瘟疫', color:'#a3e635', match:/毒|瘟疫|腐|虫|蛛|螳螂|软泥|孢子|感染/, desc:'瘟疫会持续扩散。' },
  { key:'flame', icon:'🌋', name:'熔火', color:'#f97316', match:/火|炎|熔|岩浆|拉格纳罗斯|凤凰|燃烧|烈焰|灰烬/, desc:'熔火脉冲压迫生命线。' },
  { key:'tidal', icon:'🌊', name:'深潮', color:'#38bdf8', match:/水|海|潮|娜迦|鱼|深渊|潮汐|水元素/, desc:'深潮会拖慢行动。' },
  { key:'earth', icon:'⛰️', name:'裂地', color:'#d6d3d1', match:/石|土|山|地|岩|元素|巨人|裂地|地震/, desc:'裂地冲击破坏节奏。' },
  { key:'beast', icon:'🐾', name:'猎群', color:'#fbbf24', match:/兽|狼|熊|虎|豹|猎犬|猎群|野性|荒野/, desc:'猎群会压迫目标。' },
  { key:'holy', icon:'✨', name:'圣光', color:'#fde68a', match:/圣|光|天使|守护|审判|神圣|净化/, desc:'圣光会保护首领。' },
  { key:'void', icon:'🕳️', name:'虚空', color:'#c4b5fd', match:/虚空|裂隙|以太|深渊|空间|扭曲/, desc:'虚空会撕开战场。' },
  { key:'venom', icon:'🐍', name:'剧毒', color:'#86efac', match:/毒|蛇|蛛|蝎|酸|腐液|毒牙/, desc:'剧毒会叠加持续伤害。' },
  { key:'time', icon:'⏳', name:'时序', color:'#67e8f9', match:/时|时间|永恒|青铜|沙漏|回响/, desc:'时序会扰动冷却和读条。' },
  { key:'generic', icon:'🎭', name:'霸主', color:'#f9a8d4', match:/./, desc:'霸主威压提供通用首领机制。' },
];
const DUNGEON_BOSS_GRAND_FORMS = [
  { key:'pulse', name:'脉冲', cd:12000, effect:'pulse', desc:'周期造成主题伤害。' },
  { key:'bulwark', name:'壁垒', cd:16000, effect:'shield', desc:'为首领或全场敌人附加护盾。' },
  { key:'edict', name:'禁令', cd:18000, effect:'debuff', desc:'施加控制或易伤类减益。' },
  { key:'summon', name:'召唤', cd:21000, effect:'summon', desc:'召唤主题援军加入战斗。' },
  { key:'siphon', name:'虹吸', cd:17000, effect:'drain', desc:'燃烧资源并治疗首领。' },
  { key:'brand', name:'点名', cd:19000, effect:'brand', desc:'给玩家打上危险标记。' },
  { key:'overload', name:'过载', cd:22000, effect:'enrage', desc:'短时间提高首领输出。' },
  { key:'fracture', name:'裂隙', cd:24000, effect:'objective', desc:'生成可击破机制目标。' },
  { key:'counter', name:'反制', cd:20000, effect:'counter', desc:'干扰玩家施法和资源节奏。' },
  { key:'cataclysm', name:'灾变', cd:28000, effect:'cataclysm', desc:'长间隔高压爆发。' },
];
const DUNGEON_BOSS_GRAND_MECHANIC_CATALOG = DUNGEON_BOSS_GRAND_THEMES.flatMap((theme, ti) =>
  DUNGEON_BOSS_GRAND_FORMS.map((form, fi) => ({
    key:`grand:${theme.key}:${form.key}`,
    icon:theme.icon,
    name:`${theme.name}${form.name}`,
    theme:theme.key,
    form:form.key,
    effect:form.effect,
    color:theme.color,
    match:theme.match,
    cd:form.cd + ((ti + fi) % 4) * 900,
    desc:`${theme.desc}${form.desc}`
  }))
);
function getDungeonBossGrandMechanics(bossData, limit){
  const text = dungeonBossSpectacleText(bossData);
  if(!text.trim()) return [];
  let pool = DUNGEON_BOSS_GRAND_MECHANIC_CATALOG.filter(m => m.match.test(text));
  if(!pool.length) pool = DUNGEON_BOSS_GRAND_MECHANIC_CATALOG.filter(m => m.theme === 'generic');
  const seedText = bossData?.name || text;
  const seed = Math.abs(String(seedText).split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0));
  pool = pool.slice().sort((a, b) => {
    const av = (a.key.length * 31 + seed + a.name.charCodeAt(0)) % 997;
    const bv = (b.key.length * 31 + seed + b.name.charCodeAt(0)) % 997;
    return av - bv;
  });
  return pool.slice(0, limit || 6).map(m => Object.assign({}, m));
}
function dungeonBossGrandCounter(key){
  const ds = state.dungeonState || state.mythicState;
  if(!ds) return;
  ds.bossGrandMechanicsTriggered = (ds.bossGrandMechanicsTriggered || 0) + 1;
  if(key){
    if(!ds.bossGrandMechanicBreakdown) ds.bossGrandMechanicBreakdown = {};
    ds.bossGrandMechanicBreakdown[key] = (ds.bossGrandMechanicBreakdown[key] || 0) + 1;
  }
}
function applyDungeonBossGrandMechanicsOnSpawn(mon, bossData, dg, ds){
  if(!mon || !mon.isBoss || !bossData) return;
  const mechanics = getDungeonBossGrandMechanics(bossData, 6);
  if(!mechanics.length) return;
  mon._bossGrandMechanics = mechanics;
  mon._bossGrandLast = {};
  for(const mech of mechanics.slice(0, 4)){
    setMonsterTrickAura(mon, 'bossGrand:' + mech.key, { name:mech.name, icon:mech.icon, desc:mech.desc }, 0, { desc:mech.desc });
  }
  if(ds) ds.bossGrandMechanicsAssigned = (ds.bossGrandMechanicsAssigned || 0) + mechanics.length;
}
function grandSummonTheme(mech){
  if(['dragon','flame'].includes(mech.theme)) return 'fire';
  if(['death'].includes(mech.theme)) return 'undead';
  if(['fel'].includes(mech.theme)) return 'demon';
  if(['storm','earth','tidal','arcane'].includes(mech.theme)) return 'elemental';
  if(['plague','venom','beast'].includes(mech.theme)) return 'beast';
  if(['oldgod','void','shadow'].includes(mech.theme)) return 'void';
  return 'soldier';
}
function triggerDungeonBossGrandMechanic(mon, mech, now){
  if(!mon || mon.hp <= 0 || !mech) return false;
  const color = mech.color || '#f9a8d4';
  dungeonBossGrandCounter(mech.key);
  if(mech.effect === 'pulse'){
    applyHeroDamage(dungeonBossSpectacleDmg(0.030, mon, 1.0), mon, { label:t=>mech.icon + '-' + t, color, now });
  }else if(mech.effect === 'shield'){
    const targets = Math.random() < 0.45 ? (state.currentMonsters || []).filter(x => x && x.hp > 0) : [mon];
    for(const t of targets){
      t._arcaneShield = (t._arcaneShield || 0) + Math.max(1, Math.floor(t.hpMax * 0.035));
      syncMonsterShieldAura(t);
      showMonsterFloat(t, mech.icon + '壁垒', color);
    }
  }else if(mech.effect === 'debuff'){
    const debuffs = ['vulnerable','weaken','chill','cripple','decay'];
    applyHeroDebuff(debuffs[(mech.key.length + now) % debuffs.length], 4200);
  }else if(mech.effect === 'summon'){
    summonMonsterAlly(mon, { summonCount:1, summonTheme:grandSummonTheme(mech), summonHpPct:0.16, summonAtkPct:0.34, summonDefPct:0.36 }, now);
  }else if(mech.effect === 'drain'){
    const drain = Math.min(state.resource || 0, Math.floor((state.resourceMax || 100) * 0.10));
    state.resource = Math.max(0, (state.resource || 0) - drain);
    const heal = Math.max(1, Math.floor(mon.hpMax * 0.018 + drain * 2));
    mon.hp = Math.min(mon.hpMax, mon.hp + heal);
    showMonsterFloat(mon, mech.icon + '+' + heal, color, { variant:'heal' });
  }else if(mech.effect === 'brand'){
    applyHeroDebuff('brittle', 4600);
    applyHeroDamage(dungeonBossSpectacleDmg(0.022, mon, 0.8), mon, { label:t=>mech.icon + '-' + t, color, now });
  }else if(mech.effect === 'enrage'){
    mon._trickAtkBuff = Math.max(mon._trickAtkBuff || 0, now + 6000);
    mon._trickAtkPct = Math.max(mon._trickAtkPct || 0, 22);
    mon._trickSpdBuff = Math.max(mon._trickSpdBuff || 0, now + 6000);
    mon._trickSpdPct = Math.max(mon._trickSpdPct || 0, 18);
    showMonsterFloat(mon, mech.icon + '过载', color, { variant:'boss' });
  }else if(mech.effect === 'objective'){
    const add = spawnDungeonDirectorAdd(mon, { key:'grand:' + mech.key, icon:mech.icon, name:mech.name + '核心', hpPct:0.085, atkPct:0.08, defPct:0.36, durationMs:9000 }, now);
    if(add){
      add._bossTacticReward = { type:'arcaneRune' };
      add._grandMechanicObjective = mech.key;
    }
  }else if(mech.effect === 'counter'){
    if(bossCasting && bossCasting.bossName === mon.bossName) bossCasting.duration = Math.max(850, bossCasting.duration - 300);
    applyHeroDebuff('silence', 900);
    const drain = Math.min(state.resource || 0, Math.floor((state.resourceMax || 100) * 0.07));
    state.resource = Math.max(0, (state.resource || 0) - drain);
  }else if(mech.effect === 'cataclysm'){
    applyHeroDamage(dungeonBossSpectacleDmg(0.052, mon, 1.8), mon, { label:t=>mech.icon + '-' + t, color, now, variant:'boss' });
    applyHeroDebuff(mech.theme === 'death' ? 'decay2' : 'burn', 5200, { dps:dungeonBossSpectacleDmg(0.010, mon, 0.3) });
  }
  showMonsterFloat(mon, `${mech.icon}${mech.name}`, color, { variant:'boss', scale:1.04 });
  log(`${mech.icon} ${mon.bossName || mon.name} 触发扩展Boss机制: ${mech.name}`, 'bad');
  if(typeof markDirty === 'function') markDirty('hero', 'stage');
  return true;
}
function applyDungeonBossGrandMechanics(now){
  if(!(state.mode === 'dungeon' || state.mode === 'mythic')) return;
  let fired = 0;
  for(const mon of (state.currentMonsters || [])){
    if(!mon || mon.hp <= 0 || !mon.isBoss || !mon._bossGrandMechanics?.length) continue;
    if(!mon._bossGrandLast) mon._bossGrandLast = {};
    for(const mech of mon._bossGrandMechanics){
      const cd = Math.max(9000, mech.cd || 16000);
      if(!mon._bossGrandLast[mech.key]) mon._bossGrandLast[mech.key] = (mon._spawnAt || now) + 5000 - cd;
      if(now - mon._bossGrandLast[mech.key] < cd) continue;
      mon._bossGrandLast[mech.key] = now;
      triggerDungeonBossGrandMechanic(mon, mech, now);
      fired++;
      break;
    }
    if(fired >= 2) break;
  }
}
function dungeonRoomCounter(ds, key){
  if(!ds) return;
  ds.roomEvents = (ds.roomEvents || 0) + 1;
  if(key){
    if(!ds.roomEventBreakdown) ds.roomEventBreakdown = {};
    ds.roomEventBreakdown[key] = (ds.roomEventBreakdown[key] || 0) + 1;
  }
}
function getDungeonRoomMod(ds, key){
  const room = (ds?.combatRooms || []).find(r => r && r.key === key);
  return room ? (room.mod || {}) : null;
}
function spawnDungeonRoomUnit(base, cfg, now){
  if(!base || !cfg) return null;
  const add = makeMonster((cfg.icon || '🎲') + (cfg.name || '房间目标'), Math.max(1, (base.lvl || 1) - (cfg.lvlOffset || 1)), false, cfg.rarity || 'rare');
  add.hpMax = Math.max(20, Math.floor((base.hpMax || 100) * (cfg.hpPct || 0.22)));
  add.hp = add.hpMax;
  add.atk = Math.max(1, Math.floor((base.atk || 1) * (cfg.atkPct || 0.42)));
  add.def = Math.max(0, Math.floor((base.def || 0) * (cfg.defPct || 0.45)));
  add.baseGold = cfg.goldReward || 0;
  add.baseXp = cfg.xpReward || 0;
  add.goldReward = cfg.goldReward || 0;
  add.honorReward = cfg.honorReward || 0;
  add.dropRate = cfg.dropRate || 0;
  add.gemChance = cfg.gemChance || 0;
  add.maxRarity = cfg.maxRarity || 'common';
  add._uid = monUidSeq++;
  add._dots = {};
  add._dotLegacyImported = true;
  add._lastDotTick = 0;
  add._summoned = true;
  add._dungeonAdd = true;
  add._roomAdd = cfg.roomKey || cfg.key || true;
  add._roomObjective = cfg.objective || null;
  add._roomExpireEffect = cfg.expireEffect || null;
  add._roomReward = cfg.reward || null;
  add._summonerId = base._uid;
  add._summonerName = base.bossName || base.name || '敌人';
  add._summonerIsBoss = !!base.isBoss;
  add._spawnAt = now;
  add._expiresAt = cfg.durationMs ? now + cfg.durationMs : 0;
  add._monSkills = cfg.skills || [];
  add._monSkill = add._monSkills[0] || null;
  add._monSupportSkills = cfg.supportSkills || [];
  add._supportSkillCooldowns = {};
  add._lastSkill = now - rng(800, 2400);
  add._lastSupportSkill = now - rng(1200, 3600);
  add._lastAtk = now - rng(0, 900);
  state.currentMonsters.push(add);
  if(cfg.announce !== false) showMonsterFloat(add, (cfg.icon || '🎲') + (cfg.name || '房间目标'), cfg.color || '#f9a8d4', { variant:'boss', scale:1.05 });
  return add;
}
function applyDungeonCombatRoomSpawn(ds, dg, primary, isBoss, now){
  if(state.mode !== 'dungeon' || !ds?.combatRooms?.length || !primary) return;
  const waveKey = `roomSpawn:${ds.wave}`;
  if(ds[waveKey]) return;
  ds[waveKey] = 1;
  ds._roomWaveStartedAt = now;
  for(const room of ds.combatRooms){
    const mod = room.mod || {};
    if(mod.openerHasteMs){
      for(const m of (state.currentMonsters || [])){
        if(!m || m.hp <= 0) continue;
        m._trickSpdBuff = Math.max(m._trickSpdBuff || 0, now + mod.openerHasteMs);
        m._trickSpdPct = Math.max(m._trickSpdPct || 0, Math.round((mod.openerHastePct || 0.2) * 100));
        setMonsterTrickAura(m, 'roomOpener', { name:room.name, icon:room.icon, desc:'房间开场攻速提高' }, m._trickSpdBuff);
      }
    }
    if(!isBoss && mod.ambushChance && Math.random() < mod.ambushChance){
      spawnDungeonRoomUnit(primary, { roomKey:room.key, icon:'🗡️', name:'伏击刺客', hpPct:0.46, atkPct:0.72, defPct:0.42, skills:pickMonSkills('暗影刺客', null, primary.lvl || 1, 1), color:'#f0abfc' }, now);
      dungeonRoomCounter(ds, 'ambush');
      log(`🗡️ ${room.name}: 伏击刺客从侧翼加入战斗`, 'bad');
    }
    if(!isBoss && mod.shooterChance && Math.random() < mod.shooterChance){
      spawnDungeonRoomUnit(primary, { roomKey:room.key, icon:'🏹', name:'攻城射手', hpPct:0.38, atkPct:0.62, defPct:0.34, skills:pickMonSkills('攻城射手', null, primary.lvl || 1, 1), color:'#fdba74' }, now);
      dungeonRoomCounter(ds, 'shooter');
      log(`🏹 ${room.name}: 攻城射手占据高台`, 'bad');
    }
    if(mod.treasureEvery && ds.wave % mod.treasureEvery === 0){
      const guard = spawnDungeonRoomUnit(primary, { roomKey:room.key, icon:'🎁', name:'宝箱守卫', hpPct:isBoss?0.18:0.62, atkPct:0.58, defPct:0.80, reward:{type:'treasure', goldPct:mod.bonusGoldPct || 0.15}, goldReward:Math.max(1, Math.floor((primary.goldReward || 1) * 0.25)), color:'#fcd34d' }, now);
      if(guard){
        for(const m of (state.currentMonsters || [])){
          if(!m || m === guard || m.hp <= 0) continue;
          m._arcaneShield = (m._arcaneShield || 0) + Math.max(1, Math.floor(m.hpMax * (mod.guardShieldPct || 0.035)));
          syncMonsterShieldAura(m);
        }
        dungeonRoomCounter(ds, 'treasureGuard');
        log(`🎁 ${room.name}: 宝箱守卫保护了战利品`, 'bad');
      }
    }
    if(isBoss && mod.altarBoss){
      spawnDungeonRoomUnit(primary, { roomKey:room.key, objective:'altar', icon:'🩸', name:'鲜血祭坛', hpPct:0.12, atkPct:0.12, defPct:0.55, durationMs:mod.altarDurationMs || 18000, reward:{type:'altar'}, color:'#fda4af' }, now);
      dungeonRoomCounter(ds, 'bloodAltar');
      log(`🩸 ${room.name}: 鲜血祭坛开始为首领蓄能`, 'bad');
    }
  }
  if(typeof markDirty === 'function') markDirty('stage');
}
function resolveDungeonRoomObjectiveExpiry(obj, ds, now){
  if(!obj || obj.hp <= 0 || !obj._roomObjective || !obj._expiresAt || now < obj._expiresAt) return false;
  const living = (state.currentMonsters || []).filter(x => x && x.hp > 0 && x !== obj);
  if(obj._roomExpireEffect === 'relic'){
    for(const m of living){
      m._arcaneShield = (m._arcaneShield || 0) + Math.max(1, Math.floor(m.hpMax * 0.045));
      m._trickAtkBuff = Math.max(m._trickAtkBuff || 0, now + 6000);
      m._trickAtkPct = Math.max(m._trickAtkPct || 0, 25);
      syncMonsterShieldAura(m);
      showMonsterFloat(m, '🔮失控', '#c4b5fd');
    }
    log('🔮 失控圣物爆发,敌人获得护盾和攻击强化', 'bad');
  }else if(obj._roomExpireEffect === 'portal'){
    const base = living.find(x => x.isBoss) || living[0];
    if(base){
      spawnDungeonRoomUnit(base, { roomKey:'unstablePortal', icon:'🌀', name:'传送援军', hpPct:0.34, atkPct:0.52, defPct:0.36, skills:pickMonSkills('传送援军', null, base.lvl || 1, 1), color:'#93c5fd' }, now);
      log('🌀 传送门稳定成形,额外援军抵达', 'bad');
    }
  }else if(obj._roomExpireEffect === 'illusion'){
    for(const m of living.filter(x => x.isBoss)){
      m._monsterDrBuffUntil = Math.max(m._monsterDrBuffUntil || 0, now + 4200);
      m._monsterDrBuffPct = Math.max(m._monsterDrBuffPct || 0, 0.18);
    }
  }
  obj._roomExpired = true;
  obj.hp = 0;
  dungeonRoomCounter(ds, `${obj._roomObjective}:expired`);
  return true;
}
function applyDungeonCombatRoomEffects(ds, mon, now){
  if(state.mode !== 'dungeon' || !ds?.combatRooms?.length || !mon) return;
  const beforeEvents = ds.roomEvents || 0;
  for(const obj of (state.currentMonsters || [])){
    if(obj && obj.hp > 0 && obj._roomObjective) resolveDungeonRoomObjectiveExpiry(obj, ds, now);
  }
  for(const room of ds.combatRooms){
    const mod = room.mod || {};
    const prefix = `room:${room.key}`;
    if(mod.flameTickMs && now - (ds[`${prefix}:flame`] || 0) > mod.flameTickMs){
      ds[`${prefix}:flame`] = now;
      const dmg = Math.max(1, Math.floor((state.hero.hpMax || 1) * (mod.flameDamagePct || 0.04)));
      applyHeroDamage(dmg, mon, { label:t=>'🔥-' + t, color:'#fb923c', now });
      applyHeroDebuff('burn', mod.burnMs || 3500, { dps:Math.max(1, Math.floor((state.hero.hpMax || 1) * (mod.burnDpsPct || 0.01))) });
      dungeonRoomCounter(ds, 'flameJets');
    }
    if(mod.relicTickMs && now - (ds[`${prefix}:relic`] || 0) > mod.relicTickMs){
      const aliveRelic = (state.currentMonsters || []).some(x => x && x.hp > 0 && x._roomObjective === 'relic');
      if(!aliveRelic){
        ds[`${prefix}:relic`] = now;
        spawnDungeonRoomUnit(mon, { roomKey:room.key, objective:'relic', expireEffect:'relic', icon:'🔮', name:'失控圣物', hpPct:0.10, atkPct:0.10, defPct:0.42, durationMs:mod.relicDurationMs || 9500, reward:{type:'relic'}, color:'#c4b5fd' }, now);
        dungeonRoomCounter(ds, 'relicSpawn');
        log('🔮 失控圣物出现: 击破可获得资源和必暴,超时会强化敌人', 'bad');
      }
    }
    if(mod.altarTickMs && now - (ds[`${prefix}:altar`] || 0) > mod.altarTickMs){
      const altarAlive = (state.currentMonsters || []).some(x => x && x.hp > 0 && x._roomObjective === 'altar');
      if(altarAlive){
        ds[`${prefix}:altar`] = now;
        for(const m of (state.currentMonsters || [])){
          if(!m || m.hp <= 0 || m._roomObjective) continue;
          const heal = Math.max(1, Math.floor(m.hpMax * (mod.altarHealPct || 0.04)));
          m.hp = Math.min(m.hpMax, m.hp + heal);
          showMonsterFloat(m, '🩸+' + heal, '#fda4af', { variant:'heal' });
        }
        dungeonRoomCounter(ds, 'altarHeal');
      }
    }
    if(mod.stormTickMs && now - (ds[`${prefix}:storm`] || 0) > mod.stormTickMs){
      ds[`${prefix}:storm`] = now;
      applyHeroDamage(Math.max(1, Math.floor((state.hero.hpMax || 1) * (mod.stormDamagePct || 0.04))), mon, { label:t=>'⚡-' + t, color:'#67e8f9', now });
      if((state.resource || 0) > (state.resourceMax || 100) * 0.45){
        const drain = Math.min(state.resource || 0, Math.floor((state.resourceMax || 100) * (mod.drainPct || 0.12)));
        state.resource = Math.max(0, (state.resource || 0) - drain);
        applyHeroDebuff('silence', mod.silenceMs || 1000);
        showFloat($('hero-emoji'), '⚡-' + drain, '#67e8f9', { variant:'status' });
      }
      dungeonRoomCounter(ds, 'stormConduit');
    }
    if(mod.frostTickMs && now - (ds[`${prefix}:frost`] || 0) > mod.frostTickMs){
      ds[`${prefix}:frost`] = now;
      applyHeroDebuff('chill', mod.chillMs || 5000);
      showFloat($('hero-emoji'), '🧊锁链', '#93c5fd', { variant:'status' });
      for(const m of (state.currentMonsters || [])){
        if(!m || m.hp <= 0) continue;
        m._arcaneShield = (m._arcaneShield || 0) + Math.max(1, Math.floor(m.hpMax * (mod.shieldPct || 0.025)));
        syncMonsterShieldAura(m);
      }
      dungeonRoomCounter(ds, 'frostLocks');
    }
    if(mod.mazeTickMs && now - (ds[`${prefix}:maze`] || 0) > mod.mazeTickMs){
      ds[`${prefix}:maze`] = now;
      spawnDungeonRoomUnit(mon, { roomKey:room.key, objective:'illusion', expireEffect:'illusion', icon:'🪞', name:'迷宫幻影', hpPct:0.13, atkPct:0.36, defPct:0.30, durationMs:mod.illusionDurationMs || 12000, color:'#f0abfc' }, now);
      if(Math.random() < 0.42) applyHeroDebuff('fear', mod.fearMs || 900);
      else applyHeroDebuff('vulnerable', mod.vulnerableMs || 4200);
      dungeonRoomCounter(ds, 'shadowMaze');
      log('🪞 暗影迷宫扭曲了战场,幻影加入战斗', 'bad');
    }
    if(mod.arrowTickMs && now - (ds[`${prefix}:arrow`] || 0) > mod.arrowTickMs){
      ds[`${prefix}:arrow`] = now;
      applyHeroDamage(Math.max(1, Math.floor((state.hero.hpMax || 1) * (mod.arrowDamagePct || 0.035))), mon, { label:t=>'🏹-' + t, color:'#fdba74', now });
      dungeonRoomCounter(ds, 'siegeArrows');
    }
    if(mod.portalTickMs && now - (ds[`${prefix}:portal`] || 0) > mod.portalTickMs){
      const alivePortal = (state.currentMonsters || []).some(x => x && x.hp > 0 && x._roomObjective === 'portal');
      if(!alivePortal){
        ds[`${prefix}:portal`] = now;
        spawnDungeonRoomUnit(mon, { roomKey:room.key, objective:'portal', expireEffect:'portal', icon:'🌀', name:'不稳定传送门', hpPct:0.11, atkPct:0.08, defPct:0.35, durationMs:mod.portalDurationMs || 10000, reward:{type:'portal'}, color:'#93c5fd' }, now);
        if(mod.bossCastJitter && mon.isBoss && bossCasting) bossCasting.duration = Math.max(800, bossCasting.duration - 350);
        dungeonRoomCounter(ds, 'portalSpawn');
        log('🌀 不稳定传送门打开,限时击破可阻止援军', 'bad');
      }
    }
  }
  if((ds.roomEvents || 0) !== beforeEvents && typeof markDirty === 'function') markDirty('hero', 'stage');
}
function handleCouncilMemberDeath(mon, hasLivingMembers){
  if(!mon?._councilGroupKey) return;
  const ds = state.dungeonState || state.mythicState;
  if(ds) ds.councilMembersDefeated = (ds.councilMembersDefeated || 0) + 1;
  const survivors = (state.currentMonsters || []).filter(x => x && x !== mon && x.hp > 0 && x._councilGroupKey === mon._councilGroupKey);
  if(!survivors.length) return;
  for(const s of survivors){
    s.atk = Math.floor(s.atk * 1.08);
    s.def = Math.floor(s.def * 1.04);
    s._councilVengeance = (s._councilVengeance || 0) + 1;
    showMonsterFloat(s, `⚖️复仇${s._councilVengeance}`, '#fb7185', { variant:'boss', scale:1.05 });
  }
  log(`⚖️ ${mon._councilGroupName} 成员倒下,其余首领进入复仇状态`, 'bad');
  if(hasLivingMembers && typeof markDirty === 'function') markDirty('stage');
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
  const now=Date.now();let m=1;
  if(state.heroDebuffs){for(const k in state.heroDebuffs){const d=state.heroDebuffs[k];if(d.expire>now){const fx=DEBUFF_FX[k];if(fx&&fx.takenMul)m*=fx.takenMul;}}}
  if(state.mode === 'dungeon' && state.dungeonState?.environments?.some(env => env?.mod?.vulnerableTaken)) m *= 1.10;
  if(state.mode === 'dungeon' && state.dungeonState?.edicts?.length) {
    for(const edict of state.dungeonState.edicts) m *= 1 + (edict?.mod?.takenMult || 0);
  }
  if(state.mode === 'dungeon' && state.dungeonState?.affixes?.length) {
    for(const affix of state.dungeonState.affixes) m *= 1 + (affix?.mod?.takenMult || 0);
  }
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
  const tactic = companionTacticKey();
  if(tactic === 'guard' && st && !compDowned() && compFrac < 0.95) return 'companion';
  if(tactic === 'support' && heroFrac < 0.92) return 'hero';
  if(st && !compDowned() && compFrac <= heroFrac && compFrac < 0.88) return 'companion';
  return 'hero';
}
function applyCompanionDamage(amount, mon, opts){
  const now = opts?.now || Date.now();
  let taken = Math.max(0, Math.floor(amount || 0));
  if((state._compBarrier || 0) > 0 && taken > 0){
    const absorb = shieldAbsorbAmount(state._compBarrier, taken);
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
  mult *= companionTacticDmgMult();
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
    showMonsterFloat(target, (icon || '💥') + '-' + splash, color || '#fca5a5', allySideFloatOpts({ variant:'comp' }));
  }
}
function applyCompanionBuffAura(sk, now){
  if(!sk?.buff) return;
  const dur = (sk.duration || 15000) + (state.hero.buffDuration || 0) * 1000;
  if(sk.buffTarget === 'hero'){
    state.buffs[sk.buff] = now + dur;
    recomputeStats();
    markDirty('hero');
  }else if(sk.buffTarget === 'both'){
    state.buffs[sk.buff] = now + dur;
    recomputeStats();
    markDirty('hero');
    if(!state._compBuffs) state._compBuffs = {};
    state._compBuffs[sk.buff] = now + dur;
    markDirty('companion');
  }else{
    if(!state._compBuffs) state._compBuffs = {};
    state._compBuffs[sk.buff] = now + dur;
    markDirty('companion');
  }
}
function applyCompanionSupportSkill(sk, st, now){
  const targetMode = companionSkillTarget(sk);
  const healMult = companionTacticHealMult();
  const shieldMult = companionTacticShieldMult();
  const applyHealPct = pct => {
    if(!(pct > 0)) return;
    pct *= healMult;
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
    pct *= shieldMult;
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

/* 受击减伤增益(旧硬编码减伤 + BUFF_FX.dr)→ 返回受伤倍率(<1) */
function buffDamageReductionMult(){
  if(!state.buffs)return 1;
  const now=Date.now();let m=1;
  const legacy = { shield:0.33, divine:0.45, bark:0.40, iceBarrier:0.40, earthShield:0.33, evasion:0.34 };
  for(const k in legacy){if(state.buffs[k]>now)m*=(1-legacy[k]);}
  if(typeof BUFF_FX==='object'){
    for(const k in BUFF_FX){const fx=BUFF_FX[k];if(fx.dr&&state.buffs[k]>now)m*=(1-fx.dr);}
  }
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
// 神器招牌技能: 入门节点解锁后, 战斗中按自身CD自动释放(不占技能栏)
function tickArtifactSkill(now){
  if(typeof artifactSkillRank!=='function'||typeof artifactSkillDef!=='function')return;
  const rank=artifactSkillRank();if(rank<=0)return;
  const spec=(typeof activeArtifactSpec==='function')?activeArtifactSpec():null;
  const def=artifactSkillDef(state.cls,spec);if(!def||!def.mul)return;
  if(state.artifactSkillCd&&state.artifactSkillCd>now)return;
  const alive=getAliveMonsters();if(!alive.length)return;
  const focus=state.currentMonsters[0];if(!focus||focus.hp<=0)return;
  const cdMul=(typeof castSpeedMul==='function')?castSpeedMul():(state.battleSpeed||1);
  const relicBoost=(typeof artifactRelicSkillBoost==='function')?artifactRelicSkillBoost():{dmgPct:0,cdPct:0};   // 印记遗物强化招牌技
  state.artifactSkillCd=now+(def.cd||20)*(1-(relicBoost.cdPct||0)/100)*1000/Math.max(0.1,cdMul);
  const tier=Math.max(0,Math.min(def.mul.length-1,rank-1));
  const mul=def.mul[tier]*(1+(relicBoost.dmgPct||0)/100);
  const targets=def.aoe?alive:[focus];
  let total=0,anyCrit=false;
  for(const t of targets){
    if(t.hp<=0)continue;
    const base=state.hero.atk*mul*((typeof masteryDmgMult==='function')?masteryDmgMult():1);
    const d=calcDmg(base,heroTargetDef(t),state.hero.crit,state.hero.critd,false,t.lvl,state.hero.lvl);
    let dd=d.dmg;const dr=monsterDamageReduction(t,now);if(dr)dd=Math.max(1,Math.floor(dd*(1-dr)));
    t.hp-=dd;total+=dd;anyCrit=anyCrit||d.crit;
    trackDmg('hero',dd,d.crit,def.name);
    showMonsterFloat(t,(def.icon||'✦')+'-'+dd,d.crit?'#fbbf24':'#f59e0b',{variant:d.crit?'crit':'hit',scale:d.crit?1.18:1.06,important:true});
    if(def.sunder)t.sunderUntil=now+15000;
    if(d.crit)processTalentOnCrit(t,dd,{skillKey:null});
  }
  if(def.selfShieldPct&&typeof addTalentShield==='function')addTalentShield(Math.floor(state.hero.hpMax*def.selfShieldPct*(1+tier*0.5)));
  if(def.healPct&&typeof healHeroAmount==='function'){const h=Math.floor(state.hero.hpMax*def.healPct*(1+tier*0.4));healHeroAmount(h,def.icon||'✦','#6ee7b7');}
  log(`${def.icon||'✦'} 神器·${def.name}! ${def.aoe?('群体 '+total+' 伤害'):(total+' 伤害')}${def.sunder?' · 破甲':''}`,'epic');
}

function tickBattle(now){
  if(state.mode==='travel'){lastHeroAtk=now;lastMonAtk=now;return;}
  if(pruneTalentAuras(now)) recomputeStats();
  pruneSkillAuras(now);
  if(state.talentState && state.talentState.shield > 0 && state.talentState.shieldExpire && now > state.talentState.shieldExpire){ state.talentState.shield = 0; state.talentState.shieldExpire = 0; markDirty('hero'); }   // 护盾到期消失
  pruneAllySummons(now);
  reapDeadMonsters();                                   // 先结算上一拍可能死亡的敌人(含 AOE 群杀)
  if(getAliveMonsters().length===0){spawnMonster();lastHeroAtk=now;lastMonAtk=now;return;}
  focusHighestThreat();                                 // 锁定仇恨最高的敌人为焦点([0])
  let mon=state.currentMonsters[0];
  applyCouncilBossMechanics(now);
  applyDungeonBossSpectacleMechanics(now);
  applyDungeonBossDirectorMechanics(now);
  applyDungeonBossTacticMechanics(now);
  applyDungeonBossWeakpointMechanics(now);
  applyDungeonBossGrandMechanics(now);
  const spdMul=state.battleSpeed||1;                    // 战斗倍速(1x / 2x)
  const regenInterval=1000/spdMul;

  if(now-lastRegen>regenInterval){
    const regenMult = heroDebuffRegenMult() * heroPassiveRegenMult(mon);
    state.hp=Math.min(state.hero.hpMax,state.hp+Math.max(0,Math.floor(state.hero.reg*regenMult)));
    const c=getCls();
    if(c.resKey==='rage')state.resource=Math.max(0,state.resource-3);
    else if(c.resKey==='energy')state.resource=Math.min(state.resourceMax,state.resource+7);
    else{
      const combatManaRegen = Math.max(1, Math.floor(
        1 +
        Math.max(0, (state._attrs?.spi || 0)) * 0.05 +
        Math.max(0, state.hero.reg || 0) * 0.35
      ));
      state.resource=Math.min(state.resourceMax,state.resource+combatManaRegen);
    }
    lastRegen=now;
  }
  const dotInterval = 1000 / spdMul;
  for(const m of state.currentMonsters){
    if(m.hp <= 0) continue;
    const dotDmg = tickMonsterDots(m, now, dotInterval);
    if(dotDmg > 0 && m === mon) showMonsterFloat(mon, '☠️-' + dotDmg, '#f97316');
  }
  tickArtifactSkill(now);                               // 神器招牌技能自动释放
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

  // 大秘境/副本词缀:周期性效果
  const ms = state.mythicState || state.dungeonState;
  if (ms && ms.affixes && (state.mode === 'mythic' || state.mode === 'dungeon')) {
    for (const af of ms.affixes) {
      const mod = af.mod || {};
      const prefix = `affix:${af.key || af.name || 'rule'}`;
      // 火山:每8秒
      if (mod.volcanic && now - (ms.lastVolcanic||0) > 8000) {
        ms.lastVolcanic = now;
        const vdmg = Math.max(1, Math.floor(state.hero.hpMax * 0.08 + rng(0, 50)));
        applyHeroDamage(vdmg, mon, { label:t=>'🌋-'+t, color:'#ff7a7a', now });
        ms.affixHits = (ms.affixHits || 0) + 1;
      }
      // 折磨:每5秒
      if (mod.afflicted && now - (ms.lastAfflicted||0) > 5000) {
        ms.lastAfflicted = now;
        const admg = Math.max(1, Math.floor(state.hero.hpMax * 0.05));
        applyHeroDamage(admg, mon, { label:t=>'😈-'+t, color:'#c084fc', now });
        ms.affixHits = (ms.affixHits || 0) + 1;
      }
      if (mod.trapTickMs && now - (ms[`${prefix}:trap`] || 0) > mod.trapTickMs) {
        ms[`${prefix}:trap`] = now;
        const dmg = Math.max(1, Math.floor((state.hero.hpMax || 1) * (mod.trapDamagePct || 0.05)));
        applyHeroDamage(dmg, mon, { label:t=>(af.icon || '🪤') + '-' + t, color:'#fb7185', now });
        ms.affixHits = (ms.affixHits || 0) + 1;
      }
      if (mod.poisonTickMs && now - (ms[`${prefix}:poison`] || 0) > mod.poisonTickMs) {
        ms[`${prefix}:poison`] = now;
        const dps = Math.max(1, Math.floor((state.hero.hpMax || 1) * (mod.poisonDpsPct || 0.01)));
        applyHeroDebuff('burn', mod.poisonMs || 4200, { dps });
        showFloat($('hero-emoji'), `${af.icon || '☣️'}毒雾`, '#a3e635', { variant:'status', scale:1.04 });
        ms.affixHits = (ms.affixHits || 0) + 1;
      }
      if (mod.ceilingTickMs && now - (ms[`${prefix}:ceiling`] || 0) > mod.ceilingTickMs) {
        ms[`${prefix}:ceiling`] = now;
        const dmg = Math.max(1, Math.floor((state.hero.hpMax || 1) * (mod.ceilingDamagePct || 0.05)));
        applyHeroDamage(dmg, mon, { label:t=>(af.icon || '🪨') + '-' + t, color:'#f59e0b', now });
        if (mod.stunMs) {
          state.heroStunUntil = Math.max(state.heroStunUntil || 0, now + mod.stunMs);
          showFloat($('hero-emoji'), '💫震荡', '#fde047', { variant:'status', scale:1.04 });
        }
        ms.affixHits = (ms.affixHits || 0) + 1;
      }
      // 奥术:每15秒给BOSS盾
      if (mod.arcane && mon.isBoss && now - (ms.lastArcane||0) > 15000) {
        ms.lastArcane = now;
        mon._arcaneShield = (mon._arcaneShield||0) + Math.floor(mon.hpMax * 0.15);
        showMonsterFloat(mon, '🔮盾', '#a78bfa');
        ms.affixHits = (ms.affixHits || 0) + 1;
      }
      if (mod.drainTickMs && now - (ms[`${prefix}:drain`] || 0) > mod.drainTickMs) {
        ms[`${prefix}:drain`] = now;
        const drain = Math.min(state.resource || 0, Math.floor((state.resourceMax || 0) * (mod.resourceDrainPct || 0.08)));
        if (drain > 0) {
          state.resource = Math.max(0, state.resource - drain);
          showFloat($('hero-emoji'), `${af.icon || '💧'}-${drain}`, '#93c5fd', { variant:'status', scale:1.04 });
          ms.affixHits = (ms.affixHits || 0) + 1;
        }
      }
      if (mod.shieldTickMs && now - (ms[`${prefix}:shield`] || 0) > mod.shieldTickMs) {
        ms[`${prefix}:shield`] = now;
        for (const target of (state.currentMonsters || [])) {
          if (!target || target.hp <= 0) continue;
          const shield = Math.max(1, Math.floor(target.hpMax * (mod.monsterShieldPct || 0.03)));
          target._arcaneShield = (target._arcaneShield || 0) + shield;
          syncMonsterShieldAura(target);
          showMonsterFloat(target, `${af.icon || '🔷'}盾`, '#93c5fd');
        }
        ms.affixHits = (ms.affixHits || 0) + 1;
      }
      if (mod.weakenTickMs && now - (ms[`${prefix}:weaken`] || 0) > mod.weakenTickMs) {
        ms[`${prefix}:weaken`] = now;
        applyHeroDebuff('weaken', mod.weakenMs || 4200);
        showFloat($('hero-emoji'), `${af.icon || '🌫️'}虚弱`, '#fca5a5', { variant:'status', scale:1.04 });
        ms.affixHits = (ms.affixHits || 0) + 1;
      }
      if (mod.executePulsePct && mon.isBoss && mon.hpMax > 0 && mon.hp / mon.hpMax <= (mod.executeBelow || 0.35) && now - (ms[`${prefix}:execute`] || 0) > 9000) {
        ms[`${prefix}:execute`] = now;
        const dmg = Math.max(1, Math.floor((state.hero.hpMax || 1) * mod.executePulsePct));
        applyHeroDamage(dmg, mon, { label:t=>(af.icon || '⚔️') + '-' + t, color:'#fb7185', now });
        ms.affixHits = (ms.affixHits || 0) + 1;
      }
      // 契约试炼:首领长时间战斗后狂暴
      if (mod.bossEnrage && mon.isBoss && !mon._trialEnraged && now - (mon._spawnAt || now) > 40000) {
        mon._trialEnraged = true;
        mon.atk = Math.floor(mon.atk * 1.35);
        showMonsterFloat(mon, '⏱️狂暴', '#fb7185');
      }
    }
  }
  if (state.mode === 'dungeon' && state.dungeonState?.environments?.length) {
    applyDungeonEnvironmentEffects(state.dungeonState, mon, now);
  }
  if (state.mode === 'dungeon' && state.dungeonState?.edicts?.length) {
    applyDungeonEdictEffects(state.dungeonState, mon, now);
  }
  if (state.mode === 'dungeon' && state.dungeonState?.combatRooms?.length) {
    applyDungeonCombatRoomEffects(state.dungeonState, mon, now);
  }
  if (state.mode === 'dungeon' && state.dungeonState?.timer) {
    applyDungeonTimerPressure(state.dungeonState, mon, now);
  }
  if (state.mode === 'worldboss' && mon?.isWorldBoss && state.worldBoss?.activeEncounter) {
    applyWorldBossAssaultEffects(state.worldBoss.activeEncounter, mon, now);
    advanceWorldBossPressure(state.worldBoss.activeEncounter, mon, now);
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
    const autoArtifactFx = activeArtifactDamageFx(mon, null);
    if(autoArtifactFx.length) artifactProcVisual(autoArtifactFx[0], mon, { now, target:'monster', tag:'auto' });
    ap=Math.floor(ap*talentDamageMult(mon,null));
    const d=calcDmg(ap,heroTargetDef(mon),state.hero.crit,state.hero.critd,false,mon.lvl,state.hero.lvl);
    let actualDmg = d.dmg;
    const dodged = mon.dodgeChance && Math.random() < mon.dodgeChance;   // BOSS 闪避
    if (dodged) actualDmg = 0;
    if (!dodged) actualDmg = absorbMonsterBarrier(mon, actualDmg, d.crit ? '💥' : '⚔️').remaining;
    {const dr=monsterDamageReduction(mon, now);if(dr&&actualDmg>0)actualDmg=Math.max(1,Math.floor(actualDmg*(1-dr)));}   // 怪物减伤
    mon.hp-=actualDmg;trackDmg('hero',actualDmg,d.crit&&!dodged,'⚔️普攻');
    if(!dodged && actualDmg > 0) companionCoordinateTrigger(mon, actualDmg, { now, crit:d.crit, skill:false });
    if(!dodged&&state.hero.extraAtk>0&&Math.random()*100<state.hero.extraAtk){const d2=calcDmg(ap,heroTargetDef(mon),state.hero.crit,state.hero.critd,false,mon.lvl,state.hero.lvl);let dd2=absorbMonsterBarrier(mon, d2.dmg, '🎯').remaining;const dr=monsterDamageReduction(mon, now);if(dr&&dd2>0)dd2=Math.max(1,Math.floor(dd2*(1-dr)));mon.hp-=dd2;trackDmg('hero',dd2,d2.crit);companionCoordinateTrigger(mon, dd2, { now, crit:d2.crit, skill:false });showMonsterFloat(mon,'🎯+'+dd2,'#fbbf24',{variant:d2.crit?'crit':'hit',scale:d2.crit?1.18:1.02});}
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
    if(state.autoSkill){
      const now2=Date.now();const aliveN=getAliveMonsters().length;
      const hpFrac=state.hp/Math.max(1,state.hero.hpMax);
      const targetHpFrac=mon&&mon.hp>0?mon.hp/Math.max(1,mon.hpMax):1;
      const autoSkills=autoCastSkillEntries(getCls());
      tryAutoInterrupt(autoSkills, now2);
      if(casting){
        // 读条期间:瞬发 buff 保持原逻辑;所有防御/减伤 buff 也可穿插,不打断当前读条。
        for(const [skKey, sk] of autoSkills){
          if(!sk||sk.type!=='buff')continue;
          if(!autoSkillAllowed(skKey, sk))continue;
          if(getCastTime(sk)>0 && !isDefensiveSkill(skKey, sk))continue;
          if(state.skillCooldowns[skKey]&&state.skillCooldowns[skKey]>now2)continue;
          let cost=sk.mp;if(state.hero.costReduction>0)cost=Math.max(1,Math.floor(sk.mp*(1-state.hero.costReduction/100)));
          if(state.resource<cost)continue;
          if(autoSkillScore(skKey,sk,mon,{now:now2,aliveN,hpFrac,targetHpFrac})==null)continue;   // buff已生效会返回null,避免重复上
          castSkill(skKey,false);
          break;   // 一拍只穿插一个,避免同帧连放
        }
      } else {
      const ready=[];
      for(let order=0;order<autoSkills.length;order++){
        const [skKey, sk] = autoSkills[order];
        if(state.skillCooldowns[skKey]&&state.skillCooldowns[skKey]>now2)continue;
        if(!sk||sk.type==='interrupt')continue;
        if(!autoSkillAllowed(skKey, sk))continue;
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
    // —— 仇恨分配:英雄 / 随从 / 我方召唤物 共同分担敌方火力——
    const target = pickMonsterAttackTarget(now);
    m._lastTargetKind = target.kind;
    m._lastTargetName = target.kind==='companion' ? '随从' : (target.kind==='summon' ? (target.unit?.baseName || target.unit?.name || '召唤物') : '主角');
    m._lastTargetAt = now;
    if(target.kind==='companion'){
      const cst=computeCompanionStats();
      const cd=calcDmg(matk,cst?cst.def:0,critRate,(m.critMult?m.critMult*100:150),false,state.hero.lvl,m.lvl);
      const tc=applyCompanionDamage(Math.max(1,cd.dmg),m,{label:t=>(kindFloat?kindFloat+' ':'')+'-'+t,color:'#ff9aa0',now});
      if(typeof pulseCombatEl === 'function') pulseCombatEl($('comp-mini'), (m.isBoss || tc >= ((computeCompanionStats()?.hpMax || 1) * 0.12)) ? 'danger' : 'comp', m.isBoss ? 300 : 220);
      if(kindSkill)skillEffects(kindSkill,m,tc,now,{allowFallback:false,target:'companion'});
      continue;   // 这只怪打了随从,英雄本拍不挨打、不进怒气
    }
    if(target.kind==='summon' && target.unit){
      const sd=calcDmg(matk,target.unit.def || 0,critRate,(m.critMult?m.critMult*100:150),false,state.hero.lvl,m.lvl);
      applyAllySummonDamage(target.unit,Math.max(1,sd.dmg),m,{label:t=>(kindFloat?kindFloat+' ':'')+'-'+t,color:'#ffb4c1',now});
      continue;
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
    // 阶段技能:按 BOSS 当前血量% 过滤可用技能(sk.hpBelow=血量跌破该比例才解锁的阶段技;sk.hpAbove=仅高血量时使用的开场技);首次跨过新阶段线→立即施放该阶段技并播报
    const _directorSkills=(typeof getDungeonBossDirectorSkills === 'function') ? getDungeonBossDirectorSkills(bossData) : [];
    const _allBossSkills=(bossData?.skills||[]).filter(sk => !isPassiveMonsterSupportTrick(sk)).concat(_directorSkills);
    const _hpFrac=mon.hpMax>0?mon.hp/mon.hpMax:1;
    checkDungeonBossPhases(mon, now);
    checkWorldBossContractPhases(mon, now);
    let _forcedPhaseSk=null;
    for(const _s of _allBossSkills){ if(typeof _s.hpBelow==='number'&&_hpFrac<=_s.hpBelow){ mon._phasesSeen=mon._phasesSeen||{}; if(!mon._phasesSeen[_s.name]){ mon._phasesSeen[_s.name]=1; _forcedPhaseSk=_s; } } }
    if(_forcedPhaseSk){ log('⚔️ '+(mon.bossName||mon.name)+' 进入新阶段 —— '+(_forcedPhaseSk.icon||'')+_forcedPhaseSk.name+'!','bad'); if(typeof showMonsterFloat==='function')showMonsterFloat(mon,'⚔️ 阶段转换!','#f59e0b'); lastBossSkill=0; }
    const _phasePool=(()=>{ const e=_allBossSkills.filter(_s=>{ if(typeof _s.hpBelow==='number'&&_hpFrac>_s.hpBelow)return false; if(typeof _s.hpAbove==='number'&&_hpFrac<_s.hpAbove)return false; return true; }); return e.length?e:_allBossSkills; })();
    const _queuedSk=(mon._queuedBossSkills&&mon._queuedBossSkills.length)?mon._queuedBossSkills.shift():null;
    const _pickSk=_queuedSk||_forcedPhaseSk||_phasePool[bossSkillIdx%Math.max(1,_phasePool.length)];
    const rawCd=(_pickSk&&_pickSk.cd)||10;
    const skillCd=Math.max(2,Math.floor(rawCd*0.42));   // 读条技更频繁:CD压缩58%,但最低2秒间隔
    if(_allBossSkills.length&&now-lastBossSkill>skillCd*1000){const sk=_pickSk;let castTime=sk.castTime!==undefined?sk.castTime:2;const instantChance=typeof mon.instantCastChance==='number'?mon.instantCastChance:(mon.instantCast?0.35:0);let instant=instantChance>0&&Math.random()<instantChance;if(instant&&isEmpoweredBossCast(sk))instant=false;/* 大伤害/灭团技(蓄力大招)绝不瞬发,必须读条可打断 */if(instant)castTime=0;bossCasting={casterUid:mon._uid,bossName:mon.bossName||mon.name,name:sk.name,icon:sk.icon,type:sk.type,heal:sk.heal,healPct:sk.healPct,mul:sk.mul,dotSkill:sk.dotSkill,dotSecs:sk.dotSecs,alwaysCrit:sk.alwaysCrit,lifeSteal:sk.lifeSteal,dot:sk.dot,slow:sk.slow,stun:sk.stun,weaken:sk.weaken,sunder:sk.sunder,spdBuff:sk.spdBuff,spdBuffSecs:sk.spdBuffSecs,spdBuffPct:sk.spdBuffPct,atkBuffSecs:sk.atkBuffSecs,atkBuffPct:sk.atkBuffPct,defBuffSecs:sk.defBuffSecs,defBuffPct:sk.defBuffPct,drBuffSecs:sk.drBuffSecs,drBuffPct:sk.drBuffPct,shieldPct:sk.shieldPct,critBuffSecs:sk.critBuffSecs,critBuffPct:sk.critBuffPct,leechBuffSecs:sk.leechBuffSecs,leechBuffPct:sk.leechBuffPct,summonCount:sk.summonCount,summonTheme:sk.summonTheme,aoe:sk.aoe,silence:sk.silence,disarm:sk.disarm,fear:sk.fear,freeze:sk.freeze,cripple:sk.cripple,decay:sk.decay,wither:sk.wither,manaDrain:sk.manaDrain,bomb:sk.bomb,plague:sk.plague,bleed:sk.bleed,brittle:sk.brittle,soulDrain:sk.soulDrain,soulLink:sk.soulLink,revenge:sk.revenge,vulnerable:sk.vulnerable,frenzy:sk.frenzy,decay2:sk.decay2,mirror:sk.mirror,threat:sk.threat,interruptPolicy:sk.interruptPolicy,_empowered:isEmpoweredBossCast(sk),startTime:now,duration:castTime*1000};const _bt=bossCastTargetInfo(sk,now);bossCasting._targetDesc=_bt.desc;bossCasting._target=_bt.target;const _emp=!instant&&isEmpoweredBossCast(sk)&&sk.interruptPolicy!=='none';const _aoeLog=(sk.type!=='heal'&&sk.type!=='buff'&&!sk.summonCount&&typeof sk.mul==='number'&&sk.mul>0)?(sk.aoe?' [🌀群体]':' [🎯单体]'):'';log('💀 '+(mon.bossName||mon.name)+(instant?' 瞬发 ':' 开始施放 ')+sk.name+_aoeLog+'!'+(instant?'(无法打断)':(_emp?' ⚡蓄力大招—打断可造成破绽!':'')),'bad');lastBossSkill=now;bossSkillIdx++;}
    // BOSS技巧(独立冷却,避免开场和支援技能一起连发)
    const tricks=bossTrickList(bossData).filter(trick => bossTrickAvailable(mon, trick, _hpFrac, now));
    const supportRecently = (mon._lastSupportSkill || 0) > 0 && now - mon._lastSupportSkill < 4500;
    const trickReady = tricks.length && now >= (mon._nextTrickAt || 0) && !supportRecently;
    if(tricks.length&&trickReady){
      const trick=tricks[Math.floor(Math.random()*tricks.length)];
      const passiveSupport = isPassiveMonsterSupportTrick(trick);
      log('⚡ '+mon.bossName+(passiveSupport?' 被动触发 ':' 使用技巧 ')+(trick.icon||'')+trick.name+'!','bad');
      mon._lastTrick=now;
      const enrageWindow = mon.hp < mon.hpMax * 0.35;
      mon._nextTrickAt = now + rng(enrageWindow ? 9000 : 12000, enrageWindow ? 12000 : 16000);
      if(passiveSupport){
        applyMonsterSupportSkill(mon, trick, now, { announce:false });
      } else {
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
        if(trick.healPct)mon.hp=Math.min(mon.hpMax,mon.hp+bossSkillHealAmount(mon, trick.healPct));
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
      }
    }}
  if(state.hp<=0)onHeroDeath();
}

function onMonsterDeath(mon){
  if(!mon||mon.hp>0)return; // 已经处理过了
  if(state.currentMonsters[0]!==mon)return; // 不是当前怪物,已刷新
  if(bossCasting && (bossCasting.casterUid === mon._uid || bossCasting.bossName === mon.bossName || bossCasting.bossName === mon.name)){
    hideBossCastBar();
    bossCasting = null;
  }
  // 大秘境词缀:崩裂/血池
  if (mon._affixes) {
    for (const af of mon._affixes) {
      if (af.mod.bursting) {
        const burstDmg = Math.max(1, Math.floor(state.hp * 0.05));
        state.hp -= burstDmg;
        trackTaken(burstDmg);
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
  const gm=(typeof collectGuildMod==='function')?collectGuildMod():{xpMult:0,goldMult:0,dropMult:0};
  bonus.xpMult  *= 1 + (gm.xpMult||0)/100;
  bonus.goldMult*= 1 + (gm.goldMult||0)/100;
  bonus.dropMult*= 1 + (gm.dropMult||0)/100;
  const pgm=(typeof collectParagonMod==='function')?collectParagonMod():{xpMult:0,goldMult:0,dropMult:0};
  bonus.xpMult  *= 1 + (pgm.xpMult||0)/100;
  bonus.goldMult*= 1 + (pgm.goldMult||0)/100;
  bonus.dropMult*= 1 + (pgm.dropMult||0)/100;
  const astm=(typeof collectAstrologyMod==='function')?collectAstrologyMod():{xpMult:0,goldMult:0,dropMult:0};
  bonus.xpMult  *= 1 + (astm.xpMult||0)/100;
  bonus.goldMult*= 1 + (astm.goldMult||0)/100;
  bonus.dropMult*= 1 + (astm.dropMult||0)/100;
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
  const councilStillFighting = !!(mon._councilGroupKey && state.currentMonsters.some(x => x && x !== mon && x.hp > 0 && x._councilGroupKey === mon._councilGroupKey));
  if(mon._councilGroupKey) handleCouncilMemberDeath(mon, councilStillFighting);
  if(mon.isBoss && (state.mode === 'dungeon' || state.mode === 'mythic')) finalizeDungeonBossChallenges(mon, councilStillFighting);
  if(Math.random()<(councilStillFighting ? 0 : mon.gemChance)){const gems=mon.isBoss?rng(3,8):1;state.gem+=gems;log('💎 +'+gems+' 钻石','loot');}
  // boss 掉宝石/精华
  if(mon.isBoss&&!councilStillFighting&&typeof bossGemDrop==='function'&&state.mode!=='mythic') bossGemDrop(mon.fromDungeon);
  // 普通怪有低概率掉精华
  else if(typeof bossGemDrop==='function'&&Math.random()<0.03){if(typeof ensureMats==='function')ensureMats();state.essence+=1;}
  // 钩子: 图鉴/声望/成就
  if(typeof progressionOnKill==='function') progressionOnKill(mon);
  // 坐骑掉落钩子(副本/大秘境 BOSS)
  if(mon.isBoss&&!councilStillFighting&&(state.mode==='dungeon'||state.mode==='mythic')&&typeof mountOnDungeonBossKill==='function') mountOnDungeonBossKill();
  if(typeof midgameMountRollOnKill==='function') midgameMountRollOnKill(mon);
  // 掉率受声望加成 (一次性提升), 副本/大秘境BOSS必掉1件
  const adjDrop=(mon.isBoss&&(state.mode==='dungeon'||state.mode==='mythic'))?(councilStillFighting ? 0 : 1):Math.min(1,mon.dropRate*bonus.dropMult*olp);
  if(Math.random()<adjDrop){
    const dKey=mon.fromDungeon?((state.dungeonState||state.mythicState)?.key):null;
    const _dgTier=(dKey&&typeof gearTierForDungeon==='function')?gearTierForDungeon(dKey):0;
    const _minR=_dgTier>=1?'epic':null;   // 英雄本及以上(英雄/史诗5人本/团本/史诗团本)只掉紫装以上
    const it=(mon._isRaid && dKey)
      ? rollItem('epic',mon.lvl,dKey,mon.isBoss?mon.bossName:null,{ exactRarity: !!mon._isEpicRaid, minRarity:_minR })
      : rollItem(_dgTier>=1?'legend':mon.maxRarity,mon.lvl,dKey,mon.isBoss?mon.bossName:null,{ minRarity:_minR });
    if((state.mode==='dungeon'||state.mode==='mythic')&&(state.dungeonState||state.mythicState))(state.dungeonState||state.mythicState).loot.push(it);addToInventory(it);if(typeof eventsOnItemGet==='function') eventsOnItemGet(it);if(it.rarity==='legend'&&typeof progressionOnLegendary==='function') progressionOnLegendary();const c=it.rarity==='legend'?'legend':(it.rarity==='epic'?'epic':'loot');log('🎁 掉落 '+it.name+(it.epicRaid?' [史诗团本]':''),c);
  }
  if(mon._isRaid && mon.fromDungeon && !councilStillFighting){
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
  if(mon._roomReward && !mon._roomExpired){
    const ds = state.dungeonState || state.mythicState;
    if(mon._roomReward.type === 'relic'){
      const gain = Math.max(8, Math.floor((state.resourceMax || 100) * 0.22));
      state.resource = Math.min(state.resourceMax || 100, (state.resource || 0) + gain);
      if(typeof grantNextSkillCrit === 'function') grantNextSkillCrit(1);
      log(`🔮 击破失控圣物: 资源 +${gain},下个技能必暴`, 'epic');
      showFloat($('hero-emoji'), `🔮+${gain}`, '#c4b5fd', { variant:'status', scale:1.05 });
      if(ds) ds.roomObjectivesBroken = (ds.roomObjectivesBroken || 0) + 1;
    }else if(mon._roomReward.type === 'portal'){
      log('🌀 你关闭了不稳定传送门,阻止了额外援军', 'good');
      if(ds) ds.roomObjectivesBroken = (ds.roomObjectivesBroken || 0) + 1;
    }else if(mon._roomReward.type === 'altar'){
      log('🩸 鲜血祭坛被摧毁,首领失去周期治疗', 'good');
      if(ds) ds.roomObjectivesBroken = (ds.roomObjectivesBroken || 0) + 1;
    }else if(mon._roomReward.type === 'treasure'){
      const bonusGold = Math.max(1, Math.floor((mon.goldReward || 1) * ((mon._roomReward.goldPct || 0.15) + 1)));
      state.gold += bonusGold;
      log(`🎁 宝箱守卫倒下,额外金币 +${bonusGold}`, 'loot');
      if(ds){
        ds.roomBonusGold = (ds.roomBonusGold || 0) + bonusGold;
        ds.roomObjectivesBroken = (ds.roomObjectivesBroken || 0) + 1;
      }
    }
    markDirty('hero');
  }
  if(mon._bossWeakpointReward && !mon._roomExpired){
    applyDungeonBossWeakpointReward(mon);
  }
  if(mon._bossTacticReward){
    const ds = state.dungeonState || state.mythicState;
    if(mon._bossTacticReward.type === 'arcaneRune'){
      const boss = (state.currentMonsters || []).find(x => x && x.hp > 0 && x._uid === mon._summonerId);
      const gain = Math.max(10, Math.floor((state.resourceMax || 100) * 0.18));
      state.resource = Math.min(state.resourceMax || 100, (state.resource || 0) + gain);
      if(boss){
        boss.stunUntil = Math.max(boss.stunUntil || 0, Date.now() + 1200);
        boss.sunderUntil = Math.max(boss.sunderUntil || 0, Date.now() + 6500);
        showMonsterFloat(boss, '🔮符文反噬', '#c4b5fd', { variant:'boss', scale:1.08 });
      }
      if(typeof grantNextSkillCrit === 'function') grantNextSkillCrit(1);
      if(ds) ds.bossTacticObjectivesBroken = (ds.bossTacticObjectivesBroken || 0) + 1;
      if(boss) noteDungeonBossChallenge(boss, 'objective');
      log(`🔮 奥术符文核心被击破: 资源 +${gain},首领遭到反噬`, 'epic');
      markDirty('hero', 'stage');
    }
  }
  if(mon._summoned && mon._summonerIsBoss){
    noteDungeonBossChallenge(mon, 'addKill');
  }
  if(mon._summoned){
    const di = state.currentMonsters.indexOf(mon);
    if(di >= 0) state.currentMonsters.splice(di, 1);
    focusHighestThreat();
    markDirty('stage');
    return;
  }
  if(state.mode==='dungeon' && state.currentMonsters.length > 1){
    const di = state.currentMonsters.indexOf(mon);
    if(di >= 0) state.currentMonsters.splice(di, 1);
    if(state.currentMonsters.some(x => x && x.hp > 0 && !x._summoned)){
      if(mon.isBoss && state.dungeonState) state.dungeonState._pendingBossWaveClear = true;
      focusHighestThreat();
      markDirty('stage');
      return;
    }
  }
  if(state.mode==='dungeon'){const ds=state.dungeonState;const dg=DUNGEONS.find(d=>d.key===ds.key);const lastBoss=(dg.bosses||[])[dg.bosses.length-1];const defeatedBoss=!!mon.isBoss||!!ds._pendingBossWaveClear;ds._pendingBossWaveClear=false;if(typeof advanceDungeonAlert==='function')advanceDungeonAlert(ds,defeatedBoss);ds.wave+=1;if(lastBoss&&ds.wave>lastBoss.wave){onDungeonClear(dg);return;}spawnDungeonMonster();}
  else if(state.mode==='mythic'){const ms=state.mythicState;const dg=DUNGEONS.find(d=>d.key===ms.key);const lastBoss=(dg.bosses||[])[dg.bosses.length-1];if(mon.isBoss)onMythicBossKill();ms.wave+=1;if(lastBoss&&ms.wave>lastBoss.wave){onMythicClear();return;}spawnDungeonMonster();}
  else if(state.mode==='tower'){if(typeof onTowerMonsterKill==='function') onTowerMonsterKill(mon);}
  else if(state.mode==='roguelike'){if(typeof onRoguelikeMonsterKill==='function') onRoguelikeMonsterKill(mon);}
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

function clearAllBuffs(){
  if(!state) return;
  state.buffs = {};
  state.talentAuras = {};
  state.skillRuntime = { auras:{} };
  state.heroDebuffs = {};
  state._compDebuffs = {};
  state._compBuffs = {};
  state._allySummons = [];
}
function onHeroDeath(){
  log('☠️ 你倒下了…','bad');killStreak=0;state._compHp=null;state._compDownUntil=0;   // 复活后随从满血归来
  clearAllBuffs();
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
  state._allySummons = [];
  state.talentState = { cds:{}, flags:{}, shield:0 };
  recomputeStats();
  if(state.mode !== 'roguelike'){
    const loss=Math.floor(state.gold*0.05);
    state.gold=Math.max(0,state.gold-loss);
  }
  state.hp=state.hero.hpMax;state.resource=state.resourceMax;
  if(state.mode==='dungeon'){showDungeonFail();return;}
  if(state.mode==='mythic'){onMythicFail();return;}
  if(state.mode==='tower'){if(typeof onTowerFail==='function') onTowerFail(); spawnMonster(); return;}
  if(state.mode==='roguelike'){if(typeof onRoguelikeFail==='function') onRoguelikeFail(); spawnMonster(); return;}
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
  if(state.hero.lvl>=MAX_LEVEL){if(typeof paragonGainXp==='function')paragonGainXp(amt);state.hero.xp=0;return;}
  const activeGate = (typeof currentXpGate==='function') ? currentXpGate() : null;
  if(activeGate && state.hero.lvl >= activeGate.level){
    const now = Date.now();
    if(!state._xpGateWarnAt || now - state._xpGateWarnAt > 6000){
      log(`⛔ 经验被锁定：击败 ${activeGate.name} 后才能突破 Lv.${activeGate.level}`, 'bad');
      state._xpGateWarnAt = now;
    }
    markDirty('hero');
    return;
  }
  state.hero.xp+=amt;
  while(state.hero.lvl<MAX_LEVEL&&state.hero.xp>=xpNeeded(state.hero.lvl)){
    const gate = (typeof currentXpGate==='function') ? currentXpGate() : null;
    if(gate && state.hero.lvl >= gate.level) break;
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
  const entries=(typeof classSkillEntriesForCurrentSpec==='function')?classSkillEntriesForCurrentSpec(c):Object.entries(c.skills);
  for(const[key,sk]of entries){if(sk.unlockLvl&&state.hero.lvl>=sk.unlockLvl&&!state.unlockedSkills[key]){state.unlockedSkills[key]=true;if(state.selectedSkills.length===0&&(typeof isSkillAllowedForCurrentSpec!=='function'||isSkillAllowedForCurrentSpec(key)))state.selectedSkills.push(key);log('✨ 学会了 ['+sk.name+']','good');markDirty('skills');}}
  if(typeof pruneSelectedSkillsForCurrentSpec==='function')pruneSelectedSkillsForCurrentSpec();
  if(typeof passiveCheckUnlocks==='function'){passiveCheckUnlocks();markDirty('skills');}
  checkDungeonUnlocks();
}
/* 新副本/团本按 reqLvl 跨级解锁时一次性提示(副本页易被遗忘)。
   state.dungeonAnnounceLvl=0 视作未初始化→静默对齐当前等级,杜绝老存档/高级新号回填刷屏。 */
function checkDungeonUnlocks(){
  if(typeof DUNGEONS==='undefined'||!Array.isArray(DUNGEONS))return;
  const lvl=state.hero.lvl||1;
  if(!state.dungeonAnnounceLvl){state.dungeonAnnounceLvl=lvl;return;}
  if(lvl<=state.dungeonAnnounceLvl)return;
  const opened=DUNGEONS.filter(d=>d.reqLvl>state.dungeonAnnounceLvl&&d.reqLvl<=lvl)
                       .sort((a,b)=>(a.reqLvl||0)-(b.reqLvl||0));
  for(const d of opened) log(`🔓 新${d.type==='raid'?'团本':'副本'}开放:【${d.name}】(Lv.${d.reqLvl}) — 去 ⚔️副本 挑战`,'legend');
  if(opened.length)markDirty('dungeon');
  state.dungeonAnnounceLvl=lvl;
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
/* 装备来源功率梯队:普通副本(0) < 英雄副本(1) < 团本(2) < 史诗团本(3)。
   决定 finishItem 的属性倍率,使同级(80)装备按来源难度拉开强度。 */
function gearTierForDungeon(dungeonKey){
  if(!dungeonKey) return 0;
  if(typeof isEpicRaidKey==='function' && isEpicRaidKey(dungeonKey)) return 3;
  const dg=(typeof DUNGEONS!=='undefined')?DUNGEONS.find(d=>d.key===dungeonKey):null;
  if(!dg) return 0;
  if(dg.epicRaid) return 3;
  if(dg.type==='raid') return 2;
  if(dg.epic5) return 4;   // 史诗5人本:介于英雄(1)与团本(2)之间(倍率 ×1.16)
  if(dg.heroic) return 1;
  return 0;
}

const DUNGEON_GEAR_TRAITS = [
  {key:'emberbrand', name:'熔火印记', icon:'🔥', tags:['fire','dragon','forge'], slots:['weapon','ring','trinket'], mod:{atkPct:2.0,crit:0.6}, desc:'首领余烬仍在装备里跳动。'},
  {key:'riftneedle', name:'裂隙针脚', icon:'🪡', tags:['void','shadow','precision'], slots:['weapon','gloves','ring'], mod:{crit:0.8,critdPct:4}, desc:'命中弱点时会放大爆发窗口。'},
  {key:'stormpulse', name:'风暴脉冲', icon:'🌩️', tags:['storm','speed','air'], slots:['weapon','boots','trinket'], mod:{spdPct:1.8,haste:0.8}, desc:'装备里封存着副本风暴的回响。'},
  {key:'bulwarkmark', name:'壁垒刻印', icon:'🛡️', tags:['fortress','holy','tank'], slots:['helmet','shoulder','armor','belt','pants','boots'], mod:{hpPct:2.4,defPct:1.6}, desc:'来自守关者护甲的硬化纹路。'},
  {key:'ironroot', name:'铁根铭文', icon:'🌿', tags:['nature','tank','beast'], slots:['armor','belt','pants','boots'], mod:{defPct:2.2,dodge:0.5}, desc:'站稳后更难被连续压低血线。'},
  {key:'bloodseal', name:'鲜血封印', icon:'🩸', tags:['blood','undead','naga'], slots:['weapon','ring','trinket'], mod:{leech:0.9,vers:0.7}, desc:'把危险的副本魔力转成续航。'},
  {key:'arcanefocus', name:'奥术聚焦', icon:'🔷', tags:['arcane','titan','mech','time'], slots:['helmet','ring','trinket'], mod:{mastery:1.0,cdReduction:0.8}, desc:'让技能循环变得更紧。'},
  {key:'ritualflame', name:'仪式火痕', icon:'🕯️', tags:['fire','shadow','ritual','dot'], minTier:1, slots:['weapon','gloves','trinket'], mod:{dotBonus:2.6,mastery:0.8}, desc:'适合持续伤害与精通构筑。'},
  {key:'executionmark', name:'处决标记', icon:'⚔️', tags:['martial','orc','pirate','execute'], minTier:1, slots:['weapon','ring','trinket'], mod:{executeBonus:2.4,extraAtk:0.8}, desc:'低血量目标会暴露更多破绽。'},
  {key:'lifeward', name:'生命护符', icon:'💚', tags:['nature','holy','heal','water'], slots:['helmet','armor','trinket'], mod:{healBonus:2.2,hpPct:1.2}, desc:'治疗与自保效果更稳定。'},
  {key:'spellweave', name:'法纹织线', icon:'✨', tags:['arcane','holy','caster','time'], slots:['shoulder','gloves','ring'], mod:{costReduction:0.8,haste:0.7}, desc:'技能消耗更轻,衔接更快。'},
  {key:'echoedge', name:'回声锋棱', icon:'〽️', tags:['martial','shadow','burst','speed'], minTier:1, slots:['weapon','gloves'], mod:{extraAtk:1.6,critdPct:3}, desc:'爆发期会把装备力量推得更尖。'},
  {key:'wardmirror', name:'镜盾碎片', icon:'🪞', tags:['arcane','shadow','tank','void'], slots:['helmet','armor','trinket'], mod:{reflectDmg:1.8,defPct:1.2}, desc:'挨打时反震一部分压力。'},
  {key:'giantbone', name:'巨骨铆钉', icon:'🦴', tags:['undead','beast','tank','giant'], slots:['shoulder','armor','belt','pants'], mod:{staPct:1.8,hpPct:1.4}, desc:'耐力型装备会更厚实。'},
  {key:'quickstep', name:'疾步扣环', icon:'👟', tags:['pirate','beast','speed','martial'], slots:['boots','belt','ring'], mod:{spdPct:1.4,dodge:0.7}, desc:'移动感更轻,闪避窗口更宽。'},
  {key:'nightglass', name:'夜玻璃棱镜', icon:'🔮', tags:['shadow','arcane','void','precision'], slots:['helmet','ring','trinket'], mod:{crit:0.5,mastery:1.1}, desc:'把副本里的暗光折成精准判断。'},
  {key:'kingward', name:'王庭护令', icon:'👑', tags:['noble','holy','fortress','raid'], minTier:2, slots:['helmet','shoulder','armor','trinket'], mod:{vers:1.4,defPct:1.8}, desc:'团本守卫留下的高阶护令。'},
  {key:'dragonspark', name:'龙息火星', icon:'🔥', tags:['dragon','fire','raid'], minTier:2, slots:['weapon','ring','trinket'], mod:{atkPct:2.8,critdPct:5}, desc:'团本装备才更容易承载的危险火星。'},
  {key:'voidstamp', name:'虚空烙印', icon:'🌌', tags:['void','oldgod','shadow','raid'], minTier:2, slots:['weapon','helmet','trinket'], mod:{mastery:1.5,dotBonus:3.2}, desc:'偏向精通与持续压制的深层烙印。'},
  {key:'titanclasp', name:'泰坦扣件', icon:'🔩', tags:['titan','mech','forge','raid'], minTier:2, slots:['belt','pants','boots','armor'], mod:{strPct:1.2,staPct:1.4}, desc:'力量与耐力都被抬高。'},
  {key:'moonchannel', name:'月井导流', icon:'🌙', tags:['nature','arcane','heal','elf'], minTier:1, slots:['helmet','ring','trinket'], mod:{intPct:1.3,spiPct:1.3}, desc:'适合法系和治疗向成长。'},
  {key:'wildhunt', name:'荒猎纹章', icon:'🏹', tags:['beast','nature','agility','pirate'], minTier:1, slots:['weapon','boots','ring'], mod:{agiPct:1.3,crit:0.6}, desc:'敏捷职业会更喜欢的副本纹章。'},
  {key:'voodoohex', name:'巫毒咒符', icon:'🪬', tags:['troll','blood','shadow','execute'], minTier:1, slots:['weapon','ring','trinket'], mod:{executeBonus:2.2,dotBonus:2.0,vers:0.8}, desc:'巨魔与洛阿副本更容易掉落,强化斩杀和持续压制。'},
  {key:'websilk', name:'蛛丝缚扣', icon:'🕸️', tags:['spider','poison','beast','speed'], minTier:1, slots:['gloves','boots','belt','ring'], mod:{spdPct:1.2,dodge:0.7,dotBonus:1.8}, desc:'蛛魔和虫巢路线的黏性战利品,兼顾机动与毒性伤害。'},
  {key:'phasebroker', name:'相位账印', icon:'🧿', tags:['ethereal','arcane','void','precision'], minTier:1, slots:['helmet','ring','trinket'], mod:{mastery:1.2,costReduction:0.9,crit:0.5}, desc:'虚灵、掮灵和卡雷什副本的结算印记,压缩资源压力。'},
  {key:'delversignal', name:'地下堡信标', icon:'🔦', tags:['delve','mythic','speed','fortress'], minTier:1, slots:['weapon','boots','trinket'], mod:{haste:1.0,hpPct:1.6,extraAtk:0.8}, desc:'短波次地下堡的紧急信标,适合快节奏推进。'},
  {key:'plagueglass', name:'疫池玻片', icon:'☣️', tags:['plague','poison','undead','nature'], minTier:1, slots:['weapon','gloves','trinket'], mod:{dotBonus:2.4,leech:0.7,mastery:0.8}, desc:'瘟疫、孢子和腐化实验副本的危险样本。'},
  {key:'thunderfeather', name:'驭雷羽饰', icon:'🦅', tags:['storm','speed','air','beast'], sourceKeys:['rookery','dawnbreaker','nokhud'], minTier:0, slots:['weapon','boots','ring','trinket'], mod:{haste:1.0,crit:0.7,spdPct:1.2}, desc:'驭雷栖巢、破晓号和风暴骑兵路线的带电羽饰,强化机动与爆发节奏。'},
  {key:'cinderbrewcap', name:'燧酿酒盖', icon:'🍺', tags:['fire','forge','speed'], sourceKeys:['cinderbrew','stormstout'], minTier:0, slots:['weapon','belt','trinket'], mod:{extraAtk:1.2,haste:0.8,vers:0.7}, desc:'烈酒与火花封在同一枚酒盖里,适合短时间打出连续压制。'},
  {key:'darkflamewick', name:'暗焰烛芯', icon:'🕯️', tags:['fire','shadow','ritual','dot'], sourceKeys:['darkflame','prioryflame'], minTier:0, slots:['weapon','gloves','trinket'], mod:{dotBonus:2.5,mastery:0.8,vers:0.7}, desc:'暗焰裂口与圣焰隐修院的烛芯残痕,让持续伤害和仪式压制更稳定。'},
  {key:'echoingsilk', name:'回响蛛丝', icon:'🕸️', tags:['spider','poison','speed','beast'], sourceKeys:['arakara','citythreads','nerubar'], minTier:0, slots:['gloves','boots','belt','ring'], mod:{spdPct:1.3,dodge:0.7,dotBonus:1.9}, desc:'蛛魔都市的回响丝线,把毒性持续伤害和移动节奏织在一起。'},
  {key:'vaultmatrix', name:'矶石矩阵钥', icon:'🔷', tags:['titan','mech','arcane','fortress'], sourceKeys:['stonevault','hallsinfusion','uldaman'], minTier:0, slots:['helmet','belt','ring','trinket'], mod:{mastery:1.1,defPct:1.5,cdReduction:0.7}, desc:'泰坦宝库里的矩阵钥,偏向精通循环和稳固防御。'},
  {key:'arathioathseal', name:'阿拉希誓徽', icon:'✝️', tags:['holy','fortress','fire','noble'], sourceKeys:['prioryflame','dawnbreaker'], minTier:0, slots:['helmet','armor','ring','trinket'], mod:{vers:1.0,healBonus:1.7,crit:0.5}, desc:'阿拉希圣焰誓约留下的徽记,兼顾治疗窗口、全能和反击。'},
  {key:'ecodomegenevial', name:'生态谱系瓶', icon:'🌱', tags:['ethereal','nature','heal','arcane'], sourceKeys:['ecodome_aldani','oasis_succession','ecodome_rhovan'], minTier:0, slots:['helmet','armor','ring','trinket'], mod:{healBonus:2.0,mastery:0.9,hpPct:1.3}, desc:'生态圆顶保存的生命谱系样本,让恢复、精通和生命上限更贴近卡雷什生态线。'},
  {key:'kareshphasecrystal', name:'卡雷什相位晶', icon:'💠', tags:['ethereal','arcane','void','precision'], sourceKeys:['manaforge_omega','shandorah_conclave','voidrazor_sanctum','shadowpoint_breach','primeus_repository'], minTier:0, slots:['weapon','helmet','ring','trinket'], mod:{mastery:1.2,costReduction:0.9,crit:0.6}, desc:'卡雷什相位网络析出的晶体,让法力熔炉与虚灵路线装备更偏向精准施法。'},
  {key:'sporefallculture', name:'孢落培养皿', icon:'🍄', tags:['plague','poison','nature','heal'], sourceKeys:['sporefall','fungal_folly'], minTier:0, slots:['weapon','gloves','trinket'], mod:{dotBonus:2.3,leech:0.7,healBonus:1.2}, desc:'孢落与真菌地下堡的活体培养皿,在持续伤害和续航之间交换收益。'},
  {key:'ulatekhexsigil', name:'乌拉泰克终咒符', icon:'🌌', tags:['troll','void','shadow','execute'], sourceKeys:['curse_ulatek'], minTier:2, slots:['weapon','ring','trinket'], mod:{executeBonus:2.7,dotBonus:2.4,vers:1.0}, desc:'盘绕岛终咒残留的咒符,强化斩杀、暗影持续压制与终局稳定性。'},
  {key:'defiaspowder', name:'迪菲亚黑火药', icon:'⚙️', tags:['pirate','martial','speed'], sourceKeys:['deadmines'], minTier:0, slots:['weapon','gloves','belt','trinket'], mod:{extraAtk:1.2,haste:0.6}, desc:'死亡矿井的火药工坊印记,让开场爆发和技能衔接更快。'},
  {key:'scarletverdict', name:'血色审判印', icon:'📕', tags:['holy','fortress','noble'], sourceKeys:['scarlet','stratholme'], minTier:0, slots:['weapon','helmet','armor','trinket'], mod:{vers:0.9,crit:0.5}, desc:'血色十字军和斯坦索姆圣焰的审判烙印,兼顾稳定伤害与抗压。'},
  {key:'uldamanrunecog', name:'奥达曼符文齿轮', icon:'🔩', tags:['titan','forge','mech'], sourceKeys:['uldaman','gnomeregan'], minTier:0, slots:['belt','ring','trinket'], mod:{mastery:1.1,cdReduction:0.6}, desc:'泰坦遗迹与机械回路中的小型齿轮,压缩循环并提高精通收益。'},
  {key:'sandfuryfang', name:'沙怒洛阿牙饰', icon:'🦷', tags:['troll','blood','nature','execute'], sourceKeys:['zulfarrak'], minTier:0, slots:['weapon','ring','trinket'], mod:{executeBonus:1.9,leech:0.6}, desc:'祖尔法拉克沙怒祭司留下的洛阿牙饰,更擅长收割残血目标。'},
  {key:'scholowax', name:'通灵骨粉封蜡', icon:'💀', tags:['undead','shadow','blood'], sourceKeys:['scholomance'], minTier:0, slots:['helmet','gloves','trinket'], mod:{dotBonus:2.0,mastery:0.7}, desc:'通灵学院讲堂里的骨粉封蜡,强化持续压制和暗影系精通。'},
  {key:'darkironrivet', name:'黑铁炉心铆钉', icon:'🌋', tags:['fire','forge','martial'], sourceKeys:['brd','lbrs','ubrs','mc'], minTier:0, slots:['weapon','armor','belt','trinket'], mod:{atkPct:1.7,defPct:1.1}, desc:'黑石深处的黑铁铆钉,把进攻和重甲防护熔在一起。'},
  {key:'diremaulvine', name:'厄运秘法藤环', icon:'🌿', tags:['nature','arcane','noble'], sourceKeys:['diremaul','maraudon'], minTier:0, slots:['helmet','ring','trinket'], mod:{intPct:1.1,spiPct:1.1}, desc:'厄运之槌和玛拉顿的奥术藤蔓,更偏向法系与恢复构筑。'},
  {key:'depthstidepearl', name:'深渊潮汐珠', icon:'🌊', tags:['water','naga','shadow'], sourceKeys:['bfd','sunktemple'], minTier:0, slots:['ring','trinket','armor'], mod:{hpPct:1.4,healBonus:1.4}, desc:'黑暗深渊与沉没神庙的潮湿珠核,提升续航和水域副本生存。'},
  {key:'auchindouncipher', name:'奥金尼密文', icon:'🔷', tags:['arcane','shadow','ethereal'], sourceKeys:['manatombs','sethekk'], minTier:0, slots:['helmet','ring','trinket'], mod:{mastery:1.0,costReduction:0.7}, desc:'奥金顿墓室与鸦人仪式留下的密文,让施法循环更紧凑。'},
  {key:'coilfangscale', name:'盘牙深鳞', icon:'🌊', tags:['naga','water','poison'], sourceKeys:['steamvault','ssc'], minTier:0, slots:['armor','ring','trinket'], mod:{healBonus:1.5,leech:0.6}, desc:'盘牙水库的潮湿鳞片,偏向续航和水域抗压。'},
  {key:'tempestphasecore', name:'风暴相位核', icon:'💠', tags:['arcane','ethereal','time'], sourceKeys:['arcatraz','tk','magister'], minTier:0, slots:['weapon','gloves','ring','trinket'], mod:{haste:0.7,mastery:0.9}, desc:'风暴要塞和魔导师平台的相位核心,强化急速与精准爆发。'},
  {key:'hellfirebrand', name:'地狱火军印', icon:'🗡️', tags:['martial','orc','fire'], sourceKeys:['shattered','hfc'], minTier:0, slots:['weapon','armor','belt','trinket'], mod:{atkPct:1.5,vers:0.7}, desc:'地狱火堡垒军团前线的烙印,适合稳定推进和武备压制。'},
  {key:'chronoscourge', name:'净化时序沙', icon:'⏳', tags:['time','undead','holy'], sourceKeys:['culling','hor'], minTier:0, slots:['ring','trinket','gloves'], mod:{cdReduction:0.8,vers:0.6}, desc:'净化斯坦索姆与映像大厅残留的时序沙,压缩技能空窗并稳住收尾。'},
  {key:'saronitechain', name:'萨隆邪铁链', icon:'⛓️', tags:['undead','forge','shadow'], sourceKeys:['forge','pit','icc'], minTier:0, slots:['weapon','armor','belt','trinket'], mod:{atkPct:1.4,leech:0.7}, desc:'冰冠堡垒外围的萨隆邪铁束链,把暗影压力转成反击和吸血。'},
  {key:'nexusleyline', name:'魔枢魔网棱镜', icon:'🔮', tags:['arcane','dragon','time'], sourceKeys:['nexus','oculus'], minTier:0, slots:['helmet','ring','trinket'], mod:{mastery:1.0,costReduction:0.6}, desc:'蓝龙军团魔网里切下的棱镜,适合法系和高频技能构筑。'},
  {key:'titanovercharge', name:'泰坦过载线圈', icon:'⚡', tags:['titan','mech','storm'], sourceKeys:['hol','ulduar'], minTier:0, slots:['weapon','gloves','belt','trinket'], mod:{extraAtk:1.2,haste:0.6}, desc:'奥杜尔与闪电大厅的过载线圈,让攻击节奏更像泰坦机械般精准。'},
  {key:'guardianoath', name:'守护誓印', icon:'🔰', tags:['holy','fortress','raid','tank'], minTier:3, slots:['armor','trinket'], mod:{hpPct:3.0,vers:1.6}, desc:'史诗团本装备上的重誓印。'},
  {key:'soulfurnace', name:'魂炉余温', icon:'♨️', tags:['fire','undead','shadow','forge'], minTier:3, slots:['weapon','trinket'], mod:{atkPct:3.2,leech:1.2}, desc:'高阶首领掉落才可能封住的炉温。'},
  {key:'chronolatch', name:'时序锁扣', icon:'⏱️', tags:['time','arcane','speed','raid'], minTier:3, slots:['ring','trinket','gloves'], mod:{cdReduction:1.4,haste:1.1}, desc:'压缩技能空窗,适合频繁施法。'},
  {key:'mythicbrand', name:'秘境强袭印', icon:'💠', tags:['mythic','speed','martial'], minTier:4, slots:['weapon','ring','trinket'], mod:{extraAtk:2.0,spdPct:1.6}, desc:'史诗五人本常见的快节奏强袭痕迹。'},
  {key:'mythicguard', name:'秘境坚守印', icon:'💠', tags:['mythic','tank','fortress'], minTier:4, slots:['helmet','armor','boots'], mod:{hpPct:2.6,dodge:0.8}, desc:'为高压五人本准备的生存印记。'},
];

const DUNGEON_TRAIT_TAG_RULES = [
  { re:/熔火|火焰|炎|烈焰|火源|焰|黑石|萨弗隆|拉格纳罗斯|地狱火|暗焰|燧酿|燃烧|邪能|熔炉|铸|炉/i, tags:['fire','forge'] },
  { re:/龙|龙眠|红玉|黑翼|奈萨里奥|死亡之翼|阿莱克丝塔萨|辛达苟萨|暮光/i, tags:['dragon','fire'] },
  { re:/风暴|雷|电|闪电|旋云|英灵|奥丁|破晓|驭雷/i, tags:['storm','speed'] },
  { re:/奥术|魔网|魔枢|魔环|法力|蓝龙|群星|星|夜井|苏拉玛|法师|时光|时序|净化斯坦索姆/i, tags:['arcane','time'] },
  { re:/泰坦|奥杜尔|奥迪尔|奥达曼|矶石|宝库|机械|麦卡贡|诺莫瑞根|列车|钢铁|齿轮|矩阵/i, tags:['titan','mech'] },
  { re:/蛛|蛛魔|虫|虫巢|尼鲁巴尔|千丝|阿拉-卡拉|孵|网|安苏雷克|阿努巴/i, tags:['spider','poison','beast'] },
  { re:/巨魔|祖尔|祖阿曼|阿曼尼|达卡莱|赞达拉|沙怒|邪枝|洛阿|乌拉泰克|古达克|阿塔达萨/i, tags:['troll','blood','nature'] },
  { re:/虚灵|掮灵|财团|塔扎维什|相位|圆顶|生态圆顶|卡雷什|普莱姆斯|档案|法力熔炉|影点|沙恩多拉|虚无剃刀/i, tags:['ethereal','arcane','void'] },
  { re:/地下堡|矿洞|圣所地下堡|档案突袭|瞰台|短波次|地匍|夜落/i, tags:['delve','fortress','speed'] },
  { re:/瘟疫|凋魂|腐|毒|疫|孢|真菌|孢落|腐沼|凋零/i, tags:['plague','poison','nature'] },
  { re:/虚空|古神|克苏恩|尤格|恩佐斯|尼奥罗萨|暗影|暮光|梦魇|萨维斯|黑心|裂隙|卡雷什|吞界/i, tags:['void','shadow'] },
  { re:/亡灵|天灾|巫妖|通灵|纳克萨玛斯|冰冠|瘟疫|凋魂|死灵|灵魂|噬魂|纳斯利亚|雷文德斯|鲜血/i, tags:['undead','shadow','blood'] },
  { re:/自然|翡翠|梦境|森林|林地|永茂|玛拉顿|塞纳里奥|生命|孢|真菌|绿洲|世界树|阿米德拉希尔/i, tags:['nature','heal'] },
  { re:/娜迦|潮|海|水|盘牙|毒蛇|永恒王宫|深渊|伯拉勒斯/i, tags:['naga','water'] },
  { re:/海盗|自由镇|码头|港|船|财团|塔扎维什|索财/i, tags:['pirate','speed'] },
  { re:/兽|狼|熊|野猪|猎|鸦|鸟|蛛|虫|蝎|蛇|古达克|阿拉-卡拉|千丝/i, tags:['beast','nature'] },
  { re:/圣光|圣焰|十字军|银色|隐修院|骑士|冠军|试炼|王庭|国王|王座|要塞|城堡|庄园/i, tags:['holy','fortress','noble'] },
  { re:/战争|围攻|奥格瑞玛|兽人|督军|破碎大厅|钢铁部落|黑暗神殿|武器|军团/i, tags:['martial','orc'] },
];
const DUNGEON_TRAIT_TAG_OVERRIDES = {
  ragefire:['fire','forge'],
  deadmines:['pirate','martial','speed'],
  wailing:['nature','beast'],
  bfd:['water','shadow','naga'],
  shadowfang:['undead','shadow','noble'],
  gnomeregan:['mech','titan'],
  razorfen:['beast','nature','poison'],
  razorfend:['undead','beast','poison'],
  scarlet:['holy','fortress','noble'],
  uldaman:['titan','forge'],
  maraudon:['nature','beast'],
  zulfarrak:['troll','blood','nature'],
  sunktemple:['dragon','nature','shadow'],
  scholomance:['undead','shadow'],
  brd:['fire','forge','martial'],
  stratholme:['undead','holy','fire'],
  diremaul:['nature','arcane','noble'],
  lbrs:['dragon','fire','orc'],
  ubrs:['dragon','fire','orc'],
  rookery:['storm','speed','air','beast'],
  cinderbrew:['fire','forge','speed'],
  darkflame:['fire','shadow','ritual','dot'],
  dawnbreaker:['storm','speed','holy','fortress'],
  arakara:['spider','poison','beast','speed'],
  citythreads:['spider','poison','beast','speed'],
  stonevault:['titan','mech','arcane','fortress'],
  prioryflame:['holy','fire','fortress','noble'],
  ecodome_aldani:['ethereal','nature','heal','arcane'],
  oasis_succession:['ethereal','nature','heal','arcane'],
  ecodome_rhovan:['ethereal','nature','heal','arcane'],
  manaforge_omega:['ethereal','arcane','void','precision'],
  shandorah_conclave:['ethereal','arcane','void','precision'],
  voidrazor_sanctum:['ethereal','arcane','void','precision'],
  sporefall:['plague','poison','nature','heal'],
  curse_ulatek:['troll','void','shadow','execute'],
};

function dungeonGearRarityRank(rarityKey){
  if(typeof lootRarityRank==='function') return lootRarityRank(rarityKey);
  return {common:0,uncommon:1,rare:2,epic:3,legend:4}[rarityKey]||0;
}

function dungeonTraitTierName(gearTier){
  if(gearTier===3) return '史诗团本印记';
  if(gearTier===2) return '团本印记';
  if(gearTier===4) return '史诗秘境印记';
  if(gearTier===1) return '英雄副本印记';
  return '副本印记';
}

function dungeonGearTraitTierRank(gearTier){
  return {0:0,1:1,4:2,2:3,3:4}[gearTier]||0;
}

function dungeonTraitBasePool(gearTier, rRank, slotKey){
  const tierRank=dungeonGearTraitTierRank(gearTier);
  return DUNGEON_GEAR_TRAITS.filter(t=>{
    if(t.minTier!==undefined){
      if(t.minTier===4){ if(gearTier!==4) return false; }
      else if(tierRank<dungeonGearTraitTierRank(t.minTier)) return false;
    }
    if(t.maxTier!==undefined&&gearTier>t.maxTier) return false;
    if(slotKey&&t.slots&&t.slots.length&&!t.slots.includes(slotKey)) return false;
    if(t.minRarity&&rRank<dungeonGearRarityRank(t.minRarity)) return false;
    return true;
  });
}

function dungeonTraitSourceMatch(trait, dungeonKey){
  if(!trait||!trait.sourceKeys||!trait.sourceKeys.length||!dungeonKey) return false;
  const baseKey=(typeof baseDungeonKey==='function')?baseDungeonKey(dungeonKey):String(dungeonKey||'');
  return trait.sourceKeys.includes(dungeonKey)||trait.sourceKeys.includes(baseKey);
}

function dungeonTraitPoolForSource(pool, dungeonKey){
  return (pool||[]).filter(t=>!t.sourceKeys||!t.sourceKeys.length||dungeonTraitSourceMatch(t,dungeonKey));
}

function dungeonTraitTagsForDungeon(dungeonKey){
  const baseKey=(typeof baseDungeonKey==='function')?baseDungeonKey(dungeonKey):String(dungeonKey||'');
  const dg=(typeof DUNGEONS!=='undefined')?(DUNGEONS.find(d=>d.key===dungeonKey)||DUNGEONS.find(d=>d.key===baseKey)):null;
  if(!dg) return [];
  const bossText=(dg.bosses||[]).map(b=>`${b.name||''} ${b.emoji||''}`).join(' ');
  const text=[dg.key,dg.name,dg.desc,dg.raidExpansion,dg.raidTier,bossText].filter(Boolean).join(' ');
  const tags=[];
  const overrides=DUNGEON_TRAIT_TAG_OVERRIDES[baseKey]||DUNGEON_TRAIT_TAG_OVERRIDES[dg.key]||[];
  for(const tag of overrides) if(!tags.includes(tag)) tags.push(tag);
  for(const rule of DUNGEON_TRAIT_TAG_RULES){
    if(rule.re.test(text)) for(const tag of rule.tags) if(!tags.includes(tag)) tags.push(tag);
  }
  if(dg.epicRaid && !tags.includes('raid')) tags.push('raid');
  if(dg.epic5 && !tags.includes('mythic')) tags.push('mythic');
  return tags;
}

function dungeonTraitAffinityPool(dungeonKey, gearTier, rRank, slotKey){
  const pool=dungeonTraitPoolForSource(dungeonTraitBasePool(gearTier,rRank,slotKey),dungeonKey);
  if(!pool.length) return [];
  const tags=dungeonTraitTagsForDungeon(dungeonKey);
  const exact=pool.filter(t=>dungeonTraitSourceMatch(t,dungeonKey));
  if(!tags.length) return pool;
  const modeTags=tags.filter(tag=>tag==='raid'||tag==='mythic');
  const coreTags=tags.filter(tag=>!modeTags.includes(tag));
  const core=coreTags.length?pool.filter(t=>!exact.includes(t)&&(t.tags||[]).some(tag=>coreTags.includes(tag))):[];
  const mode=modeTags.length?pool.filter(t=>!exact.includes(t)&&!core.includes(t)&&(t.tags||[]).some(tag=>modeTags.includes(tag))):[];
  const tagged=exact.concat(core,mode);
  return tagged.length ? tagged : pool;
}

function dungeonTraitPreviewForDungeon(dungeonKey, limit){
  const dg=(typeof DUNGEONS!=='undefined')?DUNGEONS.find(d=>d.key===dungeonKey):null;
  const gearTier=(typeof gearTierForDungeon==='function')?gearTierForDungeon(dungeonKey):(dg?.epicRaid?3:(dg?.type==='raid'?2:0));
  const tags=dungeonTraitTagsForDungeon(dungeonKey);
  const rRank=dungeonGearRarityRank('epic');
  const pool=dungeonTraitAffinityPool(dungeonKey,gearTier,rRank,null);
  const score = (t) => (dungeonTraitSourceMatch(t,dungeonKey)?40:0) + (t.tags||[]).reduce((sum,tag)=>sum+(tags.includes(tag)?(tag==='raid'||tag==='mythic'?1:3):0),0);
  const preferred=(tags.length?pool.filter(t=>(t.tags||[]).some(tag=>tags.includes(tag))):pool).sort((a,b)=>score(b)-score(a));
  return {
    tags,
    gearTier,
    tierName:dungeonTraitTierName(gearTier),
    chance:{
      rare:dungeonTraitChance('rare',gearTier,false),
      epic:dungeonTraitChance('epic',gearTier,false),
      legend:dungeonTraitChance('legend',gearTier,false),
    },
    traits:(preferred.length?preferred:pool).slice(0,limit||5).map(t=>({ key:t.key,name:t.name,icon:t.icon,desc:t.desc,tags:t.tags||[] })),
  };
}

function dungeonTraitChance(rarityKey, gearTier, hasSetKey){
  const chanceBase={rare:0.28,epic:0.58,legend:0.92}[rarityKey]||0.25;
  const chanceTier={0:0.04,1:0.12,2:0.20,3:0.30,4:0.17}[gearTier]||0;
  return Math.min(0.98,chanceBase+chanceTier+(hasSetKey?0.06:0));
}

function scaleDungeonTraitMod(baseMod, rarityKey, gearTier){
  const rarityScale={rare:1.0,epic:1.35,legend:1.85}[rarityKey]||1.0;
  const tierScale={0:1.0,1:1.12,2:1.28,3:1.45,4:1.20}[gearTier]||1.0;
  const decimalKeys=new Set(['crit','critd','leech','vers','mastery','haste','dodge','atkPct','hpPct','defPct','spdPct','critdPct','cdReduction','costReduction','extraAtk','healBonus','dotBonus','executeBonus','reflectDmg','strPct','agiPct','intPct','spiPct','staPct']);
  const out={};
  for(const [k,v] of Object.entries(baseMod||{})){
    const raw=(Number(v)||0)*rarityScale*tierScale;
    out[k]=decimalKeys.has(k)?+raw.toFixed(1):Math.max(1,Math.round(raw));
  }
  return out;
}

function applyDungeonGearTrait(item,dungeonKey,rarity,opts){
  if(!item||opts?.noRandom) return item;
  const gearTier=(typeof item.gearTier==='number')?item.gearTier:(item.epicRaid?3:0);
  const sourceKey=dungeonKey||item.sourceDungeonKey||item.dungeonKey||null;
  if(item.dungeonTrait&&item.dungeonTrait.mod) return item;
  if(!sourceKey&&gearTier<=0) return item;
  const rarityKey=rarity?.key||item.rarity||'common';
  const rRank=dungeonGearRarityRank(rarityKey);
  if(rRank<2) return item;
  const chance=dungeonTraitChance(rarityKey,gearTier,!!item.setKey);
  if(Math.random()>chance) return item;
  const pool=dungeonTraitPoolForSource(dungeonTraitBasePool(gearTier,rRank,item.slot),sourceKey);
  const affinity=dungeonTraitAffinityPool(sourceKey,gearTier,rRank,item.slot);
  const signature=affinity.filter(t=>dungeonTraitSourceMatch(t,sourceKey));
  const picked=signature.length&&Math.random()<0.62
    ? choice(signature)
    : (affinity.length&&Math.random()<0.88?choice(affinity):(pool.length?choice(pool):choice(DUNGEON_GEAR_TRAITS)));
  const sourceDg=(typeof DUNGEONS!=='undefined')?DUNGEONS.find(d=>d.key===sourceKey):null;
  const sourceTags=dungeonTraitTagsForDungeon(sourceKey);
  const matchedTags=(picked.tags||[]).filter(tag=>sourceTags.includes(tag));
  item.sourceDungeonKey=sourceKey;
  item.dungeonTrait={
    key:picked.key,
    name:picked.name,
    icon:picked.icon,
    type:dungeonTraitTierName(gearTier),
    desc:picked.desc,
    sourceDungeonKey:sourceKey,
    sourceDungeonName:sourceDg?.name||sourceKey,
    sourceTags,
    matchedTags,
    chance:+(chance*100).toFixed(0),
    mod:scaleDungeonTraitMod(picked.mod,rarityKey,gearTier),
  };
  return item;
}

function rollItem(maxRarity,fromLvl,dungeonKey,bossName,opts){
  const slotKey=choice(SLOT_ORDER);const slot=SLOT_INFO[slotKey];
  const _minRank=(opts&&opts.minRarity&&typeof lootRarityRank==='function')?lootRarityRank(opts.minRarity):-1;   // 最低品质门槛(英雄本+ = 史诗)
  let rarity=pickRarity(maxRarity);
  if(_minRank>=0&&lootRarityRank(rarity.key)<_minRank)rarity=RARITY.find(r=>r.key===opts.minRarity)||rarity;
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
    let pickRarity=RARITY.find(r=>r.key===pick.rarity)||rarity;
    if(_minRank>=0&&lootRarityRank(pick.rarity)<_minRank)pickRarity=RARITY.find(r=>r.key===opts.minRarity)||pickRarity;   // 英雄本及以上:低于史诗的池内物品提升为史诗(保留主题名)
    let poolRaidIlvl=pick.raidIlvl;
    if(typeof poolRaidIlvl==='number'&&pickRarity.key!==pick.rarity&&typeof raidDropIlvl==='function'){
      poolRaidIlvl=raidDropIlvl(pick.raidBaseKey||((typeof baseDungeonKey==='function')?baseDungeonKey(dungeonKey):dungeonKey),pickRarity.key,!!pick.raidEpicMode,pick.raidBossIndex||0,pick.raidBossCount||1);
    }
    const itemPower=(typeof poolRaidIlvl==='number'&&typeof raidDropPowerFromIlvl==='function')?raidDropPowerFromIlvl(poolRaidIlvl):((typeof pick.rollPower==='number'&&pick.rollPower>0)?pick.rollPower:power);
    const poolItem={id:itemIdSeq++,slot:pick.slot||slotKey,name:pick.name,rarity:pickRarity.key,rarityName:pickRarity.name,cls:pickRarity.cls,bcls:pickRarity.bcls,stats:{},sell:0,epicRaid:!!pick.epicRaid,setKey:pick.setKey,setName:pick.setName,setEffects:pick.setEffects?JSON.parse(JSON.stringify(pick.setEffects)):undefined,setPieces:pick.setPieces,gearTier:gearTierForDungeon(dungeonKey),sourceDungeonKey:dungeonKey,sourceBossName:bossName,raidExpansion:pick.raidExpansion,raidOrder:pick.raidOrder,raidTier:pick.raidTier,raidBaseKey:pick.raidBaseKey,raidBossIndex:pick.raidBossIndex,raidBossCount:pick.raidBossCount,raidEpicMode:pick.raidEpicMode,raidIlvl:poolRaidIlvl,reqLvlOverride:pick.reqLvlOverride};
    return finishItem(poolItem,pick.slot||slotKey,pickRarity,itemPower,pick.stats||{},opts);
  }}
  const item={id:itemIdSeq++,slot:slotKey,name:genName(slotKey,rarity),rarity:rarity.key,rarityName:rarity.name,cls:rarity.cls,bcls:rarity.bcls,stats:{},sell:0,gearTier:dungeonKey?gearTierForDungeon(dungeonKey):0,sourceDungeonKey:dungeonKey||undefined};
  const poolStats=getPoolStatBonus(slotKey,rarity.key);return finishItem(item,slotKey,rarity,power,poolStats,opts);
}
/* 生成一件“指定品质”的随机槽位装备(绕过 pickRarity 的权重),用于必爆掉落 */
function rollItemOfRarity(rarityKey,fromLvl){
  const slotKey=choice(SLOT_ORDER);const rarity=RARITY.find(r=>r.key===rarityKey)||RARITY[0];
  const power=(fromLvl||state.hero.lvl);
  const item={id:itemIdSeq++,slot:slotKey,name:genName(slotKey,rarity),rarity:rarity.key,rarityName:rarity.name,cls:rarity.cls,bcls:rarity.bcls,stats:{},sell:0};
  const poolStats=getPoolStatBonus(slotKey,rarity.key);return finishItem(item,slotKey,rarity,power,poolStats);
}
/* 魔兽式"装备等级(物品等级 / item level / 装等)":代表装备强度的总览数值,与"佩戴需求等级 reqLvl"是两回事。
   由掉落功率(_rollPower≈掉落时角色等级)+ 品质 + 装备来源梯队(普通/英雄/团本/史诗团/史诗5人)三者派生,
   与 finishItem 实际属性缩放(power×rarity.mult×_tierMult)同序——品质越高、副本梯队越高,装等越高。 */
function computeItemLevel(item){
  if(!item) return 0;
  if(typeof item.raidIlvl==='number'&&item.raidIlvl>0) return Math.max(1,Math.round(item.raidIlvl));
  let power=(typeof item._rollPower==='number'&&item._rollPower>0)?item._rollPower:0;
  if(!power) power=item.reqLvl?Math.round(item.reqLvl/0.9):1;   // 老存档无 _rollPower 时由 reqLvl 反推
  const rk=item.rarity||'common';
  const tier=(typeof item.gearTier==='number')?item.gearTier:(item.epicRaid?3:0);
  const rarityBonus={common:0,uncommon:6,rare:14,epic:24,legend:38}[rk]||0;
  const tierBonus={0:0,1:18,2:40,3:55,4:28}[tier]||0;   // 与 finishItem 的 _tierMult 同序
  return Math.max(1,Math.round(power*3+rarityBonus+tierBonus));
}
/* 装备"主属性集合"(类魔兽原版):由 职业主属性(力量/敏捷/智力)+ 槽位核心(武器→攻击 / 防具→防御)+ 耐力 组成。
   例:法师胸甲=防御/智力/耐力,法师法杖=攻击/智力/耐力;战士板甲=防御/力量/攻击/耐力。顺序=重要度降序(低品质截断时保留靠前的)。 */
function itemMainStats(slotKey, clsKey){
  const primary=(typeof CLASSES!=='undefined'&&CLASSES[clsKey]&&CLASSES[clsKey].attackAttr)||'str';
  const melee=(primary==='str'||primary==='agi');   // 近战/敏捷系:防具额外带攻击
  switch(slotKey){
    case 'weapon':  return ['atk', primary, 'sta'];
    case 'ring':    return [primary, (melee?'atk':'def'), 'sta'];
    case 'trinket': return [primary, 'sta', 'def'];
    default:        return melee ? ['def', primary, 'atk', 'sta'] : ['def', primary, 'sta'];
  }
}
function finishItem(item,slotKey,rarity,power,extraStats,opts){
  const _noRand=!!(opts&&opts.noRandom);   // 预览用:跳过随机浮动/惊喜副属/词缀宝石,得到稳定的"典型主属性"
  item.slot=slotKey;
  item.stats={};
  item._rollSlot=slotKey;
  item._rollPower=power;
  item._baseExtraStats=JSON.parse(JSON.stringify(extraStats||{}));
  if(typeof normalizeItemNameForSlot==='function') item.name=normalizeItemNameForSlot(item);
  if(item.gearTier===1 && item.name && !/·英雄$/.test(item.name)) item.name+='·英雄';   // 英雄副本掉落带后缀
  if(item.gearTier===4 && item.name && !/·史诗$/.test(item.name)) item.name+='·史诗';   // 史诗5人本掉落带后缀
  if(!item._baseName) item._baseName=item.name;
  const slot=SLOT_INFO[slotKey];
  const lvlBonus=1+power*0.01; // 等级越高属性越多(2026-06-16 0.02→0.01:压平后期二次膨胀)
  const baseVal={atk:Math.floor((3+power*1.0)*lvlBonus),def:Math.floor((2+power*0.55)*lvlBonus),hp:Math.floor((12+power*5)*lvlBonus),crit:1+power*0.1,critd:6+power*0.6,reg:1+power*0.2,str:Math.floor((1.5+power*0.4)*lvlBonus),agi:Math.floor((1.5+power*0.4)*lvlBonus),int:Math.floor((1.5+power*0.4)*lvlBonus),spi:Math.floor((1+power*0.35)*lvlBonus),sta:Math.floor((1.5+power*0.4)*lvlBonus),leech:0.5+power*0.06,vers:0.5+power*0.06,haste:0.5+power*0.06,dodge:0.5+power*0.06};
  // 以主属性为本(类魔兽原版):按 职业主属性 + 槽位核心(武器攻击/防具防御)+ 耐力 组成"主属性集合",作为装备价值的核心。
  // 品质越高,主属性集合越完整(common/uncommon 截断);随机的"惊喜副属性"(暴击/急速…)只作锦上添花。
  const clsKeyForItem=(state&&state.cls)||'warrior';
  const primaryAttr=(typeof CLASSES!=='undefined'&&CLASSES[clsKeyForItem]&&CLASSES[clsKeyForItem].attackAttr)||'str';
  const slotCore=(slotKey==='weapon')?'atk':(['helmet','shoulder','armor','gloves','belt','pants','boots'].includes(slotKey)?'def':null);
  const maxMains={common:2,uncommon:3,rare:4,epic:4,legend:4}[rarity.key]||3;
  const mainSet=itemMainStats(slotKey, clsKeyForItem).slice(0, maxMains);
  for(const k of mainSet){
    let w; if(k===slotCore)w=2.4; else if(k===primaryAttr)w=(slotCore?1.6:2.0); else if(k==='sta')w=1.0; else w=1.2;
    item.stats[k]=(item.stats[k]||0)+Math.max(1,Math.floor(baseVal[k]*rarity.mult*w));
  }
  item._mainStats=mainSet.slice(); item._mainStat=slotCore||primaryAttr;   // 供 UI 高亮主属性集合
  // 副属性只能来自下方"惊喜roll",不从命名装/池子的预设 stats 注入
  const SURPRISE_KEYS=['crit','critd','critdPct','leech','vers','haste','mastery','dodge'];
  if(extraStats){for(const[k,v]of Object.entries(extraStats)){if(SURPRISE_KEYS.includes(k))continue;item.stats[k]=(item.stats[k]||0)+Math.max(1,Math.floor(baseVal[k]*0.5*v*rarity.mult));}}
  // 品质浮动:每条主属性独立 ×0.8~1.2,使同名同品装备也有强弱差异(如 100攻/100力 可能滚出 120攻/80力)
  if(!_noRand) for(const k in item.stats){
    if(SURPRISE_KEYS.includes(k)) continue;   // 惊喜副属性本身已是随机层,不再二次浮动
    item.stats[k]=Math.max(1,Math.round(item.stats[k]*(0.8+Math.random()*0.4)));
  }
  // ---- 惊喜副属性 ----
  // 仅蓝装(rare)以上才可能出现,各自独立低概率,不占常规副属分配(额外附加),可同时出现也可能都不出现。
  // 数值随品质 蓝/紫/橙:吸血/全能/极速/暴击/精通/闪避 = 1/2/4;暴伤倍率更高 = 3/6/12。
  const SURPRISE_CHANCE=0.15;
  const SURPRISE={leech:{rare:1,epic:2,legend:4},vers:{rare:1,epic:2,legend:4},haste:{rare:1,epic:2,legend:4},mastery:{rare:1,epic:2,legend:4},dodge:{rare:1,epic:2,legend:4},crit:{rare:1,epic:2,legend:3},critd:{rare:3,epic:6,legend:12}};
  if(!_noRand) for(const sk in SURPRISE){const v=SURPRISE[sk][rarity.key];if(v&&Math.random()<SURPRISE_CHANCE)item.stats[sk]=(item.stats[sk]||0)+v;}
  // 来源功率梯队(2026-06-27 拉大,让"英雄/史诗5人本/团本"在同级时明显更强,不被±20%浮动盖过):
  // 普通(0)1.0 < 英雄(1)1.18 < 史诗5人本(4)1.28 < 团本(2)1.40 < 史诗团本(3)1.55
  const _gearTier=(typeof item.gearTier==='number')?item.gearTier:(item.epicRaid?3:0);
  const _tierMult={0:1.0,1:1.18,2:1.40,3:1.55,4:1.28}[_gearTier]||1.0;
  if(_tierMult!==1.0){
    for(const [k,v] of Object.entries(item.stats||{})){
      if(typeof v==='number') item.stats[k]=Math.max(1,Math.floor(v*_tierMult));
    }
  }
  // 安全帽:暴击/暴伤/极速/闪避上限(防止任何路径溢出)
  if(item.stats.crit>4)item.stats.crit=4;
  if(item.stats.critd>12)item.stats.critd=12;
  if(item.stats.haste>4)item.stats.haste=4;
  if(item.stats.dodge>4)item.stats.dodge=4;
  item.reqLvl=Math.max(1,Math.floor(power*0.9));
  if(typeof item.reqLvlOverride==='number'&&item.reqLvlOverride>0) item.reqLvl=Math.max(1,Math.floor(item.reqLvlOverride));
  item.sell=Math.floor(10*rarity.mult*(1+power*0.5));
  if(!_noRand && typeof enhanceItemOnCreate==='function') enhanceItemOnCreate(item,rarity,power);
  if(typeof applyDungeonGearTrait==='function') applyDungeonGearTrait(item,item.sourceDungeonKey||item.dungeonKey,rarity,opts);
  item.ilvl=computeItemLevel(item);   // 魔兽装等(物品等级),由功率+品质+梯队派生
  return item;
}
/* 自动售卖反馈:按品质自动卖出是高频事件,逐件日志会刷屏 → 累计后节流(每6秒/或强制)汇总一条 */
let _autoSoldGold=0,_autoSoldCount=0,_autoSoldLogAt=0;
function flushAutoSellLog(force){
  if(_autoSoldCount<=0)return;
  const now=Date.now();
  if(!force && now-_autoSoldLogAt<6000)return;
  log(`🤖 自动售卖 ${_autoSoldCount} 件垃圾 +${(typeof fmt==='function'?fmt(_autoSoldGold):_autoSoldGold)}💰`,'info');
  _autoSoldLogAt=now;_autoSoldGold=0;_autoSoldCount=0;
}
function addToInventory(item){
  if(typeof syncItemIdentity==='function') syncItemIdentity(item);
  if(item.mythicUnique){state.inventory.push(item);markDirty('inventory');log('🌟 专属传说已入包: '+item.name+' (背包'+state.inventory.length+'件)','loot');return;}
  // 按品质阈值自动售卖(≤所选品质),累计反馈
  if(state.autoSellRarity){
    const itemIdx=RARITY.findIndex(r=>r.key===item.rarity);
    const sellIdx=RARITY.findIndex(r=>r.key===state.autoSellRarity);
    if(itemIdx>=0&&itemIdx<=sellIdx){state.gold+=item.sell||0;_autoSoldGold+=item.sell||0;_autoSoldCount++;flushAutoSellLog(false);return;}
  }
  if(state.inventory.length>=invCap()){
    // 背包已满:若新装备是史诗+,尝试卖掉包里最不值钱的【未锁定且品质更低】装备腾位,避免丢失好装备
    const newIdx=RARITY.findIndex(r=>r.key===item.rarity);
    if(newIdx>=3){
      let worstI=-1,worstScore=Infinity;
      for(let i=0;i<state.inventory.length;i++){const it=state.inventory[i];if(it.locked)continue;const ri=RARITY.findIndex(r=>r.key===it.rarity);const sc=ri*1e7+(it.sell||0);if(sc<worstScore){worstScore=sc;worstI=i;}}
      if(worstI>=0&&RARITY.findIndex(r=>r.key===state.inventory[worstI].rarity)<newIdx){
        const sold=state.inventory.splice(worstI,1)[0];state.gold+=sold.sell||0;state.inventory.push(item);markDirty('inventory');
        log('📦 背包满,自动卖出 '+sold.name+' 腾位收纳 '+item.name,'info');return;
      }
    }
    state.gold+=item.sell||0;log('📦 背包已满,自动出售 '+item.name+' +'+(item.sell||0)+'💰','info');return;
  }
  state.inventory.push(item);markDirty('inventory');
}
function equipItem(itemId){const idx=state.inventory.findIndex(i=>i.id===itemId);if(idx<0)return;const item=state.inventory[idx];if(typeof syncItemIdentity==='function') syncItemIdentity(item);if(item.reqLvl&&state.hero.lvl<item.reqLvl){log('需要等级 Lv.'+item.reqLvl,'bad');return;}const prev=state.equipped[item.slot];state.equipped[item.slot]=item;state.inventory.splice(idx,1);if(prev)state.inventory.push(prev);recomputeStats();log('🎽 装备了 '+item.name,'good');markDirty('inventory','equipment','hero');}
/* ---------- 背包容量 ---------- */
const INV_CAP_MAX=200, INV_CAP_STEP=10, INV_CAP_BASE=60;
function invCap(){ return (state&&state.invCap)||INV_CAP_BASE; }
function invExpandCost(){ const exp=Math.max(0,(invCap()-INV_CAP_BASE)/INV_CAP_STEP); return Math.floor(8000*Math.pow(1.55,exp)); }
function expandInventory(){
  if(invCap()>=INV_CAP_MAX){ log('🎒 背包已扩展至上限 '+INV_CAP_MAX+' 格','info'); return; }
  const cost=invExpandCost();
  if((state.gold||0)<cost){ log('💰 金币不足,扩展背包需要 '+fmt(cost)+'💰','bad'); return; }
  state.gold-=cost;
  state.invCap=invCap()+INV_CAP_STEP;
  log('🎒 背包扩展至 '+state.invCap+' 格!','good');
  markDirty('inventory','hero');
}
function unequipItem(slotKey){const it=state.equipped[slotKey];if(!it)return;if(state.inventory.length>=invCap()){log('背包已满','bad');return;}state.inventory.push(it);delete state.equipped[slotKey];recomputeStats();markDirty('inventory','equipment','hero');}
function sellItem(itemId){const idx=state.inventory.findIndex(i=>i.id===itemId);if(idx<0)return;const item=state.inventory[idx];if(item.locked){log('🔒 已锁定,无法出售 '+item.name,'bad');return;}state.gold+=item.sell;state.inventory.splice(idx,1);markDirty('inventory');}
function sellAllBelow(level){const levelIdx=['common','uncommon','rare','epic','legend'].indexOf(level);let total=0,n=0;state.inventory=state.inventory.filter(i=>{if(i.locked)return true;const idx=['common','uncommon','rare','epic','legend'].indexOf(i.rarity);if(idx<=levelIdx){total+=i.sell;n++;return false;}return true;});state.gold+=total;if(n)log('💰 出售 '+n+' 件 +'+total,'info');markDirty('inventory');}
function toggleItemLock(itemId){const item=state.inventory.find(i=>i.id===itemId)||Object.values(state.equipped).find(i=>i&&i.id===itemId);if(!item)return;item.locked=!item.locked;log((item.locked?'🔒 锁定 ':'🔓 解锁 ')+item.name,'info');markDirty('inventory');}

/* 一键穿戴最优:逐部位用"模拟装备→重算→战力评估"挑选最强,不出售任何装备 */
function equipBestGear(){
  if(!state||!state.inventory) return;
  const slots=(typeof SLOT_ORDER!=='undefined')?SLOT_ORDER:Object.keys(SLOT_INFO);
  const powerOf=(typeof arenaHeroPower==='function')?arenaHeroPower:(()=>state.hero.atk||1);
  let changed=0;
  for(const slot of slots){
    // 候选 = 背包里该部位且等级达标的装备 + 当前已穿
    const cands=state.inventory.filter(it=>it.slot===slot && (!it.reqLvl||state.hero.lvl>=it.reqLvl));
    const cur=state.equipped[slot];
    if(cands.length===0) continue;
    let best=cur, bestPow=-Infinity;
    // 先评估当前(空栏=没有 cur)
    const evalWith=(item)=>{ state.equipped[slot]=item||undefined; recomputeStats(); return powerOf(); };
    if(cur){ best=cur; bestPow=evalWith(cur); } else { best=null; bestPow=evalWith(null); }
    for(const it of cands){ if(it===cur) continue; const p=evalWith(it); if(p>bestPow+1e-6){ bestPow=p; best=it; } }
    // 还原该槽并落实最优
    state.equipped[slot]=best||undefined;
    if(best!==cur){
      // 从背包移除 best,把旧装放回背包
      if(best){ const bi=state.inventory.indexOf(best); if(bi>=0) state.inventory.splice(bi,1); }
      if(cur) state.inventory.push(cur);
      changed++;
    }
  }
  recomputeStats();
  if(changed>0){ log('🎽 一键装备:更换了 '+changed+' 个部位至最强','good'); markDirty('inventory','equipment','hero'); }
  else { log('🎽 当前装备已是背包内最强,无需更换','info'); }
}

/* ---------- 技能 ---------- */
let casting=null;
let bossCasting=null;
function hideHeroCastBar(){
  const cb=document.getElementById('hero-cast-bar-wrap');
  if(cb)cb.style.visibility='hidden';
}
function hideBossCastBar(){
  const cb=document.getElementById('boss-cast-bar-wrap');
  if(cb)cb.style.visibility='hidden';
}
function bossCastingMonster(cast){
  if(!cast) return null;
  const list = state?.currentMonsters || [];
  if(cast.casterUid != null){
    const exact = list.find(m => m && m.hp > 0 && m._uid === cast.casterUid);
    if(exact) return exact;
  }
  return list.find(m => m && m.hp > 0 && m.isBoss && (!cast.bossName || m.bossName === cast.bossName || m.name === cast.bossName)) || null;
}
/* 切换角色或重置时调用,清理 combat 模块变量,避免下个角色继承上一个的状态 */
function resetCombatState(){
  casting=null;
  bossCasting=null;
  lastHeroAtk=0;lastMonAtk=0;lastRegen=0;dotTick=0;lastBossSkill=0;bossSkillIdx=0;burnTick=0;
  if(state){
    clearAllBuffs();
    state.heroStunUntil=0;state.heroSilenceUntil=0;state.heroDisarmUntil=0;
    state._compBarrier=0;state._compStunUntil=0;state._compSilenceUntil=0;state._compDisarmUntil=0;state._compSoulLinkUntil=0;state._compFrenzyUntil=0;state._compDecayUntil=0;state._compLastDotTick=0;
    state._brittleUntil=0;state._soulLinkUntil=0;state._decayUntil=0;
    state._allySummons=[];
    state.artifactSkillCd=0;                            // 神器招牌技能冷却
    state.skillCooldowns={};                             // 英雄技能冷却(全部刷新)
    state.talentState={cds:{},flags:{},shield:0};
  }
  if(typeof lastCompAtk==='number')lastCompAtk=0;
  if(typeof lastCompSkill==='number')lastCompSkill=0;
  if(typeof compSkillIdx==='number')compSkillIdx=0;
  if(typeof lastCompRegen==='number')lastCompRegen=0;
  if(state){state._compHp=null;state._compDownUntil=0;}   // 随从血量/阵亡态:下个角色重新满血
  if(typeof resetDmgStats==='function')resetDmgStats();
  if(typeof killStreak==='number')killStreak=0;
  compSkillCd={};
  hideHeroCastBar();
  hideBossCastBar();
}
function hasteFactor(){return 1+((state.hero&&state.hero.haste)||0)/100;}        // 极速倍率(>=1):提攻速/读条/CD
function castSpeedMul(){return (state.battleSpeed||1)*hasteFactor();}             // 读条速度&技能CD 提速 = 战斗倍速 × 极速
function castDmgBonus(sk){return 1+((sk&&sk.castTime)||0)*0.3;}                   // 法系补偿:带读条的技能按读条时长加伤(读条=投资,换更高爆发)
function getCastTime(sk){if(sk.type==='interrupt')return 0;if(sk.castTime!==undefined)return sk.castTime;return 0;}
const DEFENSIVE_SKILL_BUFFS = new Set(['shield','divine','bark','iceBarrier','earthShield','evasion','s_mitigate','s_barrier','s_avatar','w_ironwall','m_iceblock','sacredShield']);
function isDefensiveSkill(skillKey, sk){
  if(!sk || sk.type !== 'buff') return false;
  const buffKey = sk.buff || skillKey;
  if(DEFENSIVE_SKILL_BUFFS.has(buffKey)) return true;
  const fx = (typeof BUFF_FX !== 'undefined' && buffKey) ? BUFF_FX[buffKey] : null;
  if(fx && ((fx.dr || 0) > 0 || (fx.defMul || 1) > 1 || (fx.dmgReduction || 0) > 0)) return true;
  const text = `${sk.name || ''} ${sk.desc || ''}`;
  return /减伤|受伤|受到伤害|防御|护盾|盾墙|圣盾|壁垒|护体|树皮|闪避|守护|皮肤/.test(text);
}
function canWeaveSkillDuringCast(skillKey, sk){
  return sk && (sk.type === 'interrupt' || isDefensiveSkill(skillKey, sk));
}
function cancelHeroCast(){
  if(!casting) return;
  casting = null;
  hideHeroCastBar();
}
function getSkillCd(sk){let base;if(sk.cd)base=sk.cd;else if(sk.type==='buff')base=40;else if(sk.type==='heal')base=16;else{const mul=sk.mul||1;if(mul>=8)base=35;else if(mul>=6)base=24;else if(mul>=5)base=18;else if(mul>=4)base=13;else if(mul>=3)base=9;else base=7;}if(state.hero.cdReduction>0)base=Math.max(3,Math.floor(base*(1-state.hero.cdReduction/100)));return base;}
function startCast(skillKey,manual){
  const c=getCls();const sk=c.skills[skillKey];if(!sk)return;
  if(typeof isSkillAllowedForCurrentSpec==='function'&&!isSkillAllowedForCurrentSpec(skillKey)){if(manual)log('该技能不属于当前专精','bad');return;}
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
  if(wc.vulnerable){applyDebuff('vulnerable',6000);log('🩸 '+enemyName+(wc.icon||'')+(target==='companion'?'压出了随从的破绽!':'让你变得易伤!'),'bad');}
  if(wc.shieldPct && mon && target==='hero'){
    const shield = Math.max(1, Math.floor(mon.hpMax * wc.shieldPct));
    mon._arcaneShield = (mon._arcaneShield || 0) + shield;
    syncMonsterShieldAura(mon);
    showMonsterFloat(mon, '🛡️+' + shield, '#93c5fd', { variant:'shield', scale:1.04 });
  }
  if(wc.summonCount && mon && target==='hero'){
    const summoned = summonMonsterAlly(mon, wc, now);
    if(summoned > 0) log(`👥 ${enemyName} 的 ${wc.name || '技能'} 召来了 ${summoned} 个援军!`,'bad');
  }
  if(opts?.allowFallback!==false && !wc.dot&&!wc.slow&&!wc.stun&&!wc.weaken&&!wc.sunder&&!wc.silence&&!wc.disarm&&!wc.fear&&!wc.freeze&&!wc.cripple&&!wc.decay&&!wc.wither&&!wc.manaDrain&&!wc.bomb&&!wc.plague&&!wc.bleed&&!wc.brittle&&!wc.soulDrain&&!wc.soulLink&&!wc.revenge&&!wc.frenzy&&!wc.decay2&&!wc.mirror&&!wc.vulnerable&&!wc.shieldPct&&!wc.summonCount)applyDebuff('vulnerable',5000);
  if(target==='companion') markDirty('companion');
}
function tickCast(now){
  // 英雄施法
  if(casting){
    const elapsed=now-casting.startTime;const pct=Math.min(100,elapsed/casting.duration*100);
    const remainMs=Math.max(0,casting.duration-elapsed);
    const c=getCls();const sk=c?.skills[casting.skillKey||''];
    $('hero-cast-bar-wrap').style.visibility='visible';
    $('hero-cast-name').textContent=(sk?.icon||'')+' '+(sk?.name||'施法中');
    $('hero-cast-time').textContent=remainMs>0?(remainMs/1000).toFixed(1)+'s':'';
    $('hero-b-cast').style.width=pct+'%';
    if(elapsed>=casting.duration){
      hideHeroCastBar();
      const wasCasting=casting;casting=null;
      castSkill(wasCasting.skillKey,wasCasting.manual);
    }
  }
  // Boss施法
  if(bossCasting){
    if(!$('mon-emoji') && typeof renderMonList === 'function') renderMonList();
    const elapsed=now-bossCasting.startTime;const pct=Math.min(100,elapsed/bossCasting.duration*100);
    const remainMs=Math.max(0,bossCasting.duration-elapsed);
    const threatMeta = bossCastThreatMeta(bossCasting);
    const interruptText = bossInterruptTag(bossCasting);
    // 施法条直接标注"对谁释放"(替代战斗日志,避免日志刷太快看不到):🎯单体/🌀群体/✨自身
    const _isDmgCast = (typeof bossCasting.mul==='number' && bossCasting.mul>0) && bossCasting.type!=='heal' && bossCasting.type!=='buff' && !bossCasting.summonCount;
    const _td = bossCasting._targetDesc || (_isDmgCast ? (bossCasting.aoe?'全体':'你') : '自身');
    const tgtTag = (bossCasting.aoe?'🌀':(_isDmgCast?'🎯':'✨'))+'对'+_td;
    $('boss-cast-bar-wrap').style.visibility='visible';
    $('boss-cast-name').textContent='💀 '+(bossCasting.bossName||'BOSS')+' - '+(bossCasting.icon||'')+' '+(bossCasting.name||'施法')+'【'+tgtTag+' / '+threatMeta.label+' / '+interruptText+(bossCasting._empowered&&bossCasting.interruptPolicy!=='none'?' / ⚡可破绽':'')+'】';
    $('boss-cast-name').style.color = threatMeta.text;
    $('boss-cast-time').textContent=remainMs>0?(remainMs/1000).toFixed(1)+'s':'';
    $('boss-b-cast').style.background = threatMeta.bar;
    $('boss-b-cast').style.width=pct+'%';
    if(elapsed>=bossCasting.duration){
      hideBossCastBar();
      const bc=bossCasting;bossCasting=null;const mon=bossCastingMonster(bc);if(!mon||mon.hp<=0)return;
      const critRate = monsterCritRate(mon, now);
      if(bc.type==='heal'){const h=bossSkillHealAmount(mon, bc.heal||0.2);mon.hp=Math.min(mon.hpMax,mon.hp+h);showMonsterFloat(mon,'💚+'+h,'#6ee7b7');}
      else if(bc.type==='buff'||bc.type==='support'||bc.type==='summon'||(bc.summonCount && !bc.mul)){
        log(`💀 ${mon.bossName || mon.name} 释放了 ${bc.name}!`,'bad');
        showMonsterFloat(mon, (bc.icon || '✨') + bc.name + '!', '#fda4af');
        applyMonsterSupportSkill(mon, bc, now, { announce:false });
      } else{
        const mul=bc.mul||2;
        // DoT 类技能:不一次出伤,把这一发摊成持续灼烧(给治疗/吸血留反应空间);不暴击、读条可打断
        if(bc.dotSkill){
          const secs=bc.dotSecs||6;
          const refHit=calcDmg(Math.floor(monsterAttackValue(mon,now)*mul),heroDefAgainst(mon),0,0,false,state.hero.lvl,mon.lvl,{tightVar:true}).dmg;
          const dps=Math.max(1,Math.floor(refHit/secs*1.3));   // 摊成 secs 秒、总量略高于单次burst(可被治疗化解)
          applyHeroDebuff('burn',secs*1000,{dps});
          log(`💀 ${mon.bossName || mon.name} 释放了 ${bc.name}!持续 ${secs} 秒灼烧(每秒约 ${dps})`,'bad');
          showMonsterFloat(mon,(bc.icon||'☠️')+bc.name+'!','#a3e635');
          if(companionTargetable())applyCompanionDebuff('burn',secs*1000,{dps:Math.max(1,Math.floor(dps*0.5))});
          if(state.hp<=0)onHeroDeath();
          return;
        }
        log(`💀 ${mon.bossName || mon.name} 释放了 ${bc.name}!`,'bad');
        showMonsterFloat(mon, (bc.icon || '✨') + bc.name + '!', '#fda4af');
        const _flat=bc.alwaysCrit?1.4:1;   // 原 alwaysCrit 改为固定 ×1.4(去掉暴击随机尖峰,保留"大招更痛")
        const rawAtk=Math.floor(monsterAttackValue(mon, now)*mul*_flat);
        if(bc.aoe){
          // AOE: 同时命中英雄和随从
          let taken=calcDmg(rawAtk,heroDefAgainst(mon),0,0,false,state.hero.lvl,mon.lvl,{tightVar:true}).dmg;
          taken=resolveMonsterDamageTaken(mon,taken,{aoe:true});
          taken=applyHeroDamage(taken,mon,{label:t=>'💀'+bc.icon+'-'+t,color:'#ff4444',now});
          processTalentLowHp(mon,now);
          if(typeof passiveOnTakeDamage==='function')passiveOnTakeDamage(mon,taken);
          if(bc.lifeSteal)mon.hp=Math.min(mon.hpMax,mon.hp+Math.floor(taken*bc.lifeSteal));
          skillEffects(bc,mon,taken,now);
          if(bc._empowered&&state.hp>0){applyHeroDebuff('weaken',4000);log('⚠️ 没能打断蓄力大招,陷入虚弱!下次记得打断','bad');}
          if(companionTargetable()){
            const cst=computeCompanionStats();
            const cd=calcDmg(rawAtk,cst?cst.def:mon.def,0,0,false,state.hero.lvl,mon.lvl,{tightVar:true});
            const ct=applyCompanionDamage(cd.dmg,mon,{label:t=>'💀'+bc.icon+'-'+t,color:'#ff9aa0',now});
            skillEffects(bc,mon,ct,now,{target:'companion'});}
          for(const unit of livingAllySummons(now)){
            const sd=calcDmg(rawAtk,unit.def || 0,0,0,false,state.hero.lvl,mon.lvl,{tightVar:true});
            applyAllySummonDamage(unit,sd.dmg,mon,{label:t=>'💀'+bc.icon+'-'+t,color:'#ffb4c1',now});
          }
          if(state.hp<=0)onHeroDeath();
        }else{
          // 复用开始施法时预选的目标(施法条已据此显示"对谁");若该目标已失效则重新选
          let target = bc._target;
          if(!target || (target.kind==='companion' && !companionTargetable()) || (target.kind==='summon' && !(target.unit && target.unit.hp>0))) target = pickMonsterAttackTarget(now);
          if(target.kind==='companion'){
            const cst=computeCompanionStats();
            const d2=calcDmg(rawAtk,cst?cst.def:mon.def,0,0,false,state.hero.lvl,mon.lvl,{tightVar:true});
            const ct=applyCompanionDamage(d2.dmg,mon,{label:t=>'💀'+bc.icon+'-'+t,color:'#ff9aa0',now});
            if(bc.lifeSteal)mon.hp=Math.min(mon.hpMax,mon.hp+Math.floor(d2.dmg*bc.lifeSteal));
            log('🛡️ 随从替你承受了 '+bc.icon+'!','info');
            skillEffects(bc,mon,ct,now,{target:'companion'});
          }else if(target.kind==='summon'&&target.unit){
            const unit = target.unit;
            const d3=calcDmg(rawAtk,unit.def || 0,0,0,false,state.hero.lvl,mon.lvl,{tightVar:true});
            applyAllySummonDamage(unit,d3.dmg,mon,{label:t=>'💀'+bc.icon+'-'+t,color:'#ffb4c1',now});
            if(bc.lifeSteal)mon.hp=Math.min(mon.hpMax,mon.hp+Math.floor(d3.dmg*bc.lifeSteal));
            log(`🛡️ ${unit.baseName || unit.name} 挡下了 ${bc.icon || '✨'}!`,'info');
          }else{
            let taken=calcDmg(rawAtk,heroDefAgainst(mon),0,0,false,state.hero.lvl,mon.lvl,{tightVar:true}).dmg;
            taken=resolveMonsterDamageTaken(mon,taken);
            taken=applyHeroDamage(taken,mon,{label:t=>'💀'+bc.icon+'-'+t,color:'#ff4444',now});
            processTalentLowHp(mon,now);
            if(typeof passiveOnTakeDamage==='function')passiveOnTakeDamage(mon,taken);
            if(bc.lifeSteal)mon.hp=Math.min(mon.hpMax,mon.hp+Math.floor(taken*bc.lifeSteal));
            skillEffects(bc,mon,taken,now);
            if(bc._empowered&&state.hp>0){applyHeroDebuff('weaken',4000);log('⚠️ 没能打断蓄力大招,陷入虚弱!下次记得打断','bad');}
          }
          if(state.hp<=0)onHeroDeath();}}}}
}
function castSkill(skillKey,manual){
  const c=getCls();const sk=c.skills[skillKey];if(!sk)return;
  if(typeof isSkillAllowedForCurrentSpec==='function'&&!isSkillAllowedForCurrentSpec(skillKey)){if(manual)log('该技能不属于当前专精','bad');return;}
  const ai=skillAiMeta(skillKey, sk);
  const summonSkill = sk.type==='summon' || sk.summonCount;
  if(!state.unlockedSkills[skillKey]){if(manual)log('技能未解锁','bad');return;}
  const now=Date.now();
  if(sk.type==='interrupt'){
    if(state.skillCooldowns[skillKey]&&state.skillCooldowns[skillKey]>now){if(manual){const left=Math.ceil((state.skillCooldowns[skillKey]-now)/1000);log(sk.name+' 冷却中('+left+'秒)','bad');}return;}
    let cost=sk.mp||0;if(state.hero.costReduction>0)cost=Math.max(1,Math.floor(cost*(1-state.hero.costReduction/100)));
    if(state.resource<cost){if(manual)log(c.resource+'不足','bad');return;}
    const ok=doInterrupt();
    if(!ok)return;
    if(cost>0)state.resource-=cost;
    const cdSec=sk.cd||5;state.skillCooldowns[skillKey]=now+cdSec*1000/castSpeedMul();
    markDirty('skills','hero');
    return;
  }
  if(state.skillCooldowns[skillKey]&&state.skillCooldowns[skillKey]>now){if(manual){const left=Math.ceil((state.skillCooldowns[skillKey]-now)/1000);log(sk.name+' 冷却中('+left+'秒)','bad');}return;}
  if(summonSkill && !canSummonAllies(sk, 'hero', now)){if(manual)log('召唤物已在场上限','bad');return;}
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
        const artifactDamageFx = activeArtifactDamageFx(target, skillKey);
        if(artifactDamageFx.length) artifactProcVisual(artifactDamageFx[0], target, { now, target:'monster', tag:'skill:' + skillKey });
        const d=calcDmg(state.hero.atk*sk.mul*cb*talentDamageMult(target,skillKey)*rt.mult,heroTargetDef(target),state.hero.crit,state.hero.critd,forceCrit,target.lvl,state.hero.lvl);
        let dd=d.dmg;
        {const dr=monsterDamageReduction(target, now);if(dr)dd=Math.max(1,Math.floor(dd*(1-dr)));}
        dd=absorbMonsterBarrier(target,dd,sk.icon||'✨').remaining;   // 技能也被敌方护盾吸收(不再穿盾)
        target.hp-=dd;dmgDone+=dd;trackDmg('hero',dd,d.crit,sk.name);showMonsterFloat(target,(sk.icon||'✨')+'-'+dd,d.crit?'#fbbf24':'#a335ee',{variant:d.crit?'crit':'hit',scale:d.crit?1.14:1,important:true});
        companionCoordinateTrigger(target, dd, { now, crit:d.crit, skill:true, state:!!(sk.stateKey || sk.debuff), control:!!(sk.slow || sk.debuff === 'sunder') });
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
      const artifactDamageFx = activeArtifactDamageFx(mon, skillKey);
      if(artifactDamageFx.length) artifactProcVisual(artifactDamageFx[0], mon, { now, target:'monster', tag:'skill:' + skillKey });
      const d=calcDmg(state.hero.atk*sk.mul*cb*talentDamageMult(mon,skillKey)*rt.mult,heroTargetDef(mon),state.hero.crit,state.hero.critd,forceCrit,mon.lvl,state.hero.lvl);
      let dd=d.dmg;
      {const dr=monsterDamageReduction(mon, now);if(dr)dd=Math.max(1,Math.floor(dd*(1-dr)));}
      dd=absorbMonsterBarrier(mon,dd,sk.icon||'✨').remaining;   // 技能也被敌方护盾吸收(不再穿盾)
      mon.hp-=dd;dmgDone=dd;trackDmg('hero',dd,d.crit,sk.name);
      companionCoordinateTrigger(mon, dd, { now, crit:d.crit || forceCrit, skill:true, state:!!(sk.stateKey || sk.debuff), control:!!(sk.slow || sk.debuff === 'sunder') });
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
    // 技能伤害也吸血(英雄吸血属性,每点=0.5%实际伤害);与技能自带 lifeSteal 叠加
    if(state.hero.leech>0 && dmgDone>0){
      const leechHeal=Math.floor(dmgDone*state.hero.leech*0.5/100);
      if(leechHeal>0){state.hp=Math.min(state.hero.hpMax,state.hp+leechHeal);showFloat($('hero-emoji'),'🩸+'+leechHeal,'#6ee7b7',{variant:'heal',scale:1.04});if(typeof pulseCombatEl==='function')pulseCombatEl($('hero-emoji'),'heal',220);}
    }
    processTalentAfterSkill(skillKey, sk, mon, dmgDone, { cost });
  }else if(sk.type==='heal'){
    const healMult=(1+(state.hero.healBonus||0)/100)*calcSpecIdentityHealMult(skillKey, sk, now);
    const h=Math.floor(state.hero.hpMax*sk.heal*healMult);
    const hr=healHeroAmount(h, sk.icon, '#6ee7b7', 'hero', sk.name);
    log(sk.name+'! 恢复 '+hr.applied+' 生命','good');
    applySkillHealEffects(skillKey, sk, hr.applied, hr.overheal);
    processTalentAfterHeal(skillKey, hr.applied, hr.overheal);
    processTalentAfterSkill(skillKey, sk, null, hr.applied, { overheal:hr.overheal, cost });
  }
  else if(summonSkill){
    const owner = { id:'hero', source:'hero', name:'你', icon:sk.icon || getCls()?.icon || '🧙', lvl:state.hero.lvl, atk:state.hero.atk, def:state.hero.def, hpMax:state.hero.hpMax, crit:state.hero.crit, critd:state.hero.critd };
    const summoned = summonAlliedUnits(sk, now, owner);
    if(summoned > 0){
      log(`${sk.icon || '🐾'} ${sk.name}! 召唤了 ${summoned} 个单位助战`,'good');
      applyClassMechanicAfterSkill(skillKey, sk, state.currentMonsters[0] || null, 0, { cost, summoned, now });
      processTalentAfterSkill(skillKey, sk, state.currentMonsters[0] || null, 0, { cost, summoned });
    }
  }
  else if(sk.type==='buff'){const dur=sk.duration+(state.hero.buffDuration||0)*1000;state.buffs[sk.buff]=Date.now()+dur;recomputeStats();log(sk.name+'!','good');applyClassMechanicAfterSkill(skillKey, sk, state.currentMonsters[0] || null, 0, { cost, buff:true, now });}
  if(sk.type==='buff') processTalentAfterSkill(skillKey, sk, state.currentMonsters[0] || null, 0, { cost });
}
/* BOSS 施法目标(用于施法条提前显示"对谁释放";单体伤害在开始施法时预选,结算时复用) */
function bossCastTargetInfo(sk, now){
  if(sk.summonCount||sk.type==='summon') return { desc:'援军', target:null };
  if(sk.type==='heal'||sk.type==='buff'||sk.type==='support') return { desc:'自身', target:null };
  if(sk.aoe) return { desc:'全体', target:null };
  const t = pickMonsterAttackTarget(now);
  const desc = t.kind==='companion' ? '随从' : (t.kind==='summon' ? ((t.unit&&(t.unit.baseName||t.unit.name))||'召唤物') : '你');
  return { desc, target:t };
}
/* 蓄力大招判定:高威胁的伤害类施法值得"必须反应"——打断可换破绽 */
function isEmpoweredBossCast(sk){
  if(!sk) return false;
  if(sk.type==='heal'||sk.type==='buff'||sk.type==='support'||sk.type==='summon') return false;
  if(sk.interruptPolicy==='hard') return true;
  const mul=sk.mul||0;
  if(sk.aoe && mul>=2.2) return true;
  if(mul>=3) return true;
  return false;
}
function doInterrupt(){
  if(!bossCasting){log('没有正在施放的法术','info');return false;}
  const bossName=bossCasting.bossName||'BOSS';
  const mon=bossCastingMonster(bossCasting);
  if(bossCasting.interruptPolicy === 'none'){
    log('🧱 '+bossName+' 的 '+bossCasting.name+' 无法被打断!','bad');
    if(mon) showMonsterFloat(mon,'🧱不可断','#fca5a5',{variant:'boss',scale:1.04});
    return false;
  }
  log('🦶 打断了 '+bossName+' 的 '+bossCasting.icon+' '+bossCasting.name+'!','good');
  if(bossCasting.interruptPolicy === 'soft' && mon && mon.hp > 0){
    const residual = buildInterruptedBossResidual(bossCasting);
    if(residual){
      applyMonsterSupportSkill(mon, residual, Date.now(), { announce:false });
      log('⚠️ 施法被打断，但仍留下了部分余波','bad');
      showMonsterFloat(mon,'⚠️余波','#fda4af',{variant:'boss',scale:1.04});
    }
  }
  const empowered = bossCasting._empowered;
  hideBossCastBar();
  bossCasting=null;
  // 打断蓄力大招的奖励:让 BOSS 露出破绽(硬直 + 破甲),AI 会自动抓窗口爆发
  if(empowered && mon && mon.hp>0){
    const now=Date.now();
    mon.stunUntil=Math.max(mon.stunUntil||0, now+2200);
    mon.sunderUntil=Math.max(mon.sunderUntil||0, now+6000);
    log('💥 完美打断!'+bossName+' 露出破绽:硬直 + 破甲,抓紧爆发!','epic');
    if(typeof showMonsterFloat==='function') showMonsterFloat(mon,'💥破绽!','#fde047',{variant:'boss',scale:1.14});
  }
  if(mon && mon.hp > 0 && mon.isBoss) noteDungeonBossChallenge(mon, 'interrupt');
  return true;
}

/* ---------- 随从 ---------- */
let lastCompAtk=0,lastCompSkill=0,compSkillIdx=0,lastCompRegen=0;
/* ---------- 伤害统计(战斗日志下面的伤害条) ---------- */
let dmgStats={hero:0,comp:0,start:0,last:0,heroMax:0,compMax:0,heroCrits:0,compCrits:0,heroHits:0,compHits:0,heroHeal:0,compHeal:0,heroHealMax:0,compHealMax:0,heroHealSkills:{},compHealSkills:{},kills:0,heroSkills:{},compSkills:{},taken:0,takenMax:0,takenHits:0,killTs:0,killFast:0,killSlow:0,peakDps:0};
function trackTaken(amt){amt=Math.floor(amt||0);if(amt<=0)return;const t=Date.now();if(!dmgStats.start)dmgStats.start=t;dmgStats.last=t;dmgStats.taken=(dmgStats.taken||0)+amt;dmgStats.takenHits=(dmgStats.takenHits||0)+1;if(amt>(dmgStats.takenMax||0))dmgStats.takenMax=amt;}
/* ---- 战斗手感 polish:屏震 / 连杀提示 ---- */
let _lastShakeTs=0, killStreak=0;
function stageShakeFx(){
  if(typeof document==='undefined'||document.hidden)return;
  const now=Date.now();if(now-_lastShakeTs<500)return;_lastShakeTs=now;
  const st=document.getElementById('stage');if(!st)return;
  st.classList.remove('shake-fx');void st.offsetWidth;st.classList.add('shake-fx');
  setTimeout(()=>{const s=document.getElementById('stage');if(s)s.classList.remove('shake-fx');},240);
}
function killStreakToast(n){
  if(typeof document==='undefined'||document.hidden)return;
  const st=document.getElementById('stage');if(!st)return;
  const el=document.createElement('div');el.className='killstreak-toast';el.textContent='🔥 连杀 '+n+'!';
  st.appendChild(el);setTimeout(()=>el.remove(),1100);
}
function trackDmg(src,amt,isCrit,skillLabel){amt=Math.floor(amt||0);if(amt<=0)return;const t=Date.now();if(!dmgStats.start)dmgStats.start=t;dmgStats.last=t;dmgStats[src]=(dmgStats[src]||0)+amt;const maxKey=src==='hero'?'heroMax':'compMax';if(amt>dmgStats[maxKey])dmgStats[maxKey]=amt;const hitKey=src==='hero'?'heroHits':'compHits';dmgStats[hitKey]=(dmgStats[hitKey]||0)+1;if(isCrit){const critKey=src==='hero'?'heroCrits':'compCrits';dmgStats[critKey]=(dmgStats[critKey]||0)+1;if(src==='hero')stageShakeFx();}const cleanLabel=normalizeTrackedSkillLabel(skillLabel);if(cleanLabel){const skKey=src==='hero'?'heroSkills':'compSkills';dmgStats[skKey][cleanLabel]=(dmgStats[skKey][cleanLabel]||0)+amt;}}
function trackHeal(src,amt,skillLabel){amt=Math.floor(amt||0);if(amt<=0)return;const t=Date.now();if(!dmgStats.start)dmgStats.start=t;dmgStats.last=t;const totalKey=src==='hero'?'heroHeal':'compHeal';const maxKey=src==='hero'?'heroHealMax':'compHealMax';const skKey=src==='hero'?'heroHealSkills':'compHealSkills';dmgStats[totalKey]=(dmgStats[totalKey]||0)+amt;if(amt>(dmgStats[maxKey]||0))dmgStats[maxKey]=amt;const cleanLabel=normalizeTrackedSkillLabel(skillLabel);if(cleanLabel)dmgStats[skKey][cleanLabel]=(dmgStats[skKey][cleanLabel]||0)+amt;}
function trackKill(){const now=Date.now();if(dmgStats.killTs){const dt=(now-dmgStats.killTs)/1000;if(dt>0&&dt<600){if(!dmgStats.killFast||dt<dmgStats.killFast)dmgStats.killFast=dt;if(dt>(dmgStats.killSlow||0))dmgStats.killSlow=dt;}}dmgStats.killTs=now;dmgStats.kills=(dmgStats.kills||0)+1;killStreak++;if(killStreak>=5&&killStreak%5===0)killStreakToast(killStreak);}
function resetDmgStats(){dmgStats={hero:0,comp:0,start:0,last:0,heroMax:0,compMax:0,heroCrits:0,compCrits:0,heroHits:0,compHits:0,heroHeal:0,compHeal:0,heroHealMax:0,compHealMax:0,heroHealSkills:{},compHealSkills:{},kills:0,heroSkills:{},compSkills:{},taken:0,takenMax:0,takenHits:0,killTs:0,killFast:0,killSlow:0,peakDps:0};if(typeof markDirty==='function')markDirty('stage');}
let compSkillCd={};   // 随从每个技能的独立冷却就绪时间戳(键=技能下标;_owner 记录当前随从,换随从自动重置)
const COMP_SKILL_DEFAULT_CD=8;   // 随从技能默认CD(秒,技能未写 cd 时)
const COMPANION_SKILL_CD_MULT=0.75;   // 随从技能冷却缩短:实际CD=配置CD×75%
const COMPANION_SKILL_GCD_MS=900;     // 随从技能公共间隔,避免同一帧把所有技能打空
const COMPANION_COORDINATE_CD_MS = 9000;  // 主角命中后随从协同追击
const COMPANION_GUARD_CD_MS = 14000;      // 坦克随从主动护卫
const COMPANION_SUPPORT_SLOTS = 2;        // 支援随从栏位:不上场普攻,低频触发弱化专属
const COMPANION_SUPPORT_POWER = 0.42;     // 支援位强度折算,保留功能价值但不替代主战
const COMPANION_COMBAT_QUALITY = { white:0.74, green:0.96, blue:1.18, purple:1.37, orange:1.51 };
const COMPANION_ROLE_PROFILE = {
  tank: { atk:0.65, def:1.30, hp:0.68, spd:0.72, reg:0.60, critd:0.78 },
  dps:  { atk:0.90, def:0.80, hp:0.52, spd:0.75, reg:0.42, critd:0.92 },
  heal: { atk:0.65, def:0.90, hp:0.58, spd:0.74, reg:0.58, critd:0.82 },
};
const COMPANION_REACTION_CD_MS = 45000;
const COMPANION_TACTICS = {
  balanced: { label:'均衡', icon:'⚖️', desc:'保持当前战斗节奏，不改变随从强度；低血量时触发一次小额协助。', reaction:'均衡协助', atk:1, def:1, hp:1, spd:1, heal:1, shield:1, dmg:1, aggro:0 },
  assault: { label:'猛攻', icon:'⚔️', desc:'随从更主动打伤害，技能伤害和攻速提高，但更脆且治疗效率下降；敌人低血量时触发压制斩击。', reaction:'压制斩击', atk:1.14, def:0.92, hp:0.90, spd:1.08, heal:0.90, shield:0.92, dmg:1.08, aggro:-0.04 },
  guard: { label:'守护', icon:'🛡️', desc:'随从更愿意挡刀和放防护技能，生命防御提高，但输出降低；主角危险时触发护卫壁垒。', reaction:'护卫壁垒', atk:0.88, def:1.18, hp:1.16, spd:0.96, heal:1.06, shield:1.16, dmg:0.90, aggro:0.18 },
  support: { label:'支援', icon:'💚', desc:'随从优先治疗、护盾和净化，支援效果提高，但直接输出下降；主角危险时触发紧急救护。', reaction:'紧急救护', atk:0.90, def:0.96, hp:0.94, spd:1.02, heal:1.18, shield:1.18, dmg:0.92, aggro:-0.06 },
};
const COMPANION_STAR_GROWTH = 0.15;   // 每星成长
const COMPANION_SKILL_DMG_BONUS = 1.43;  // 随从技能伤害全局加成
const COMPANION_HEAL_SCALE = 1.25;        // 随从治疗统一收口
const COMPANION_RESONANCE_CD_MS = 60000;  // 羁绊共鸣:收藏羁绊转为低频战斗连携
const COMPANION_AWAKEN_COST = {
  white:{ shards:18, gold:80000, essence:25, gem:0, honor:0, statPct:0.10 },
  green:{ shards:28, gold:160000, essence:45, gem:0, honor:400, statPct:0.12 },
  blue:{ shards:42, gold:360000, essence:95, gem:15, honor:1000, statPct:0.15 },
  purple:{ shards:70, gold:900000, essence:220, gem:50, honor:3200, statPct:0.18 },
  orange:{ shards:110, gold:2200000, essence:520, gem:120, honor:8000, statPct:0.22 },
};
const COMPANION_AWAKEN_HERO_MOD = {
  white:{ atkPct:1, hpPct:1, defPct:1 },
  green:{ atkPct:1.5, hpPct:1.5, defPct:1 },
  blue:{ atkPct:2, hpPct:2.5, defPct:1.5, mastery:2 },
  purple:{ atkPct:3, hpPct:3.5, defPct:2, mastery:5 },
  orange:{ atkPct:4.5, hpPct:5, defPct:3, mastery:8 },
};
const COMPANION_COMBAT_SPECIALS = {
  fordring:{ name:'提尔审判', icon:'⚖️', type:'barrier', cd:28000, tags:['shield','cleanse','boss'], desc:'首领战或主角承压时审判目标,为主角补盾并净化1个减益。' },
  varian:{ name:'王者挑战', icon:'🦁', type:'guard', cd:18000, tags:['tank','shield','boss'], desc:'主角承压或首领战中主动护卫,短时间吸引火力并为双方加盾。' },
  thrall:{ name:'元素裂震', icon:'⛈️', type:'control', cd:22000, tags:['control','sunder','aoe'], desc:'目标未被控制或多目标战时引发雷霆裂震,减速、短晕并制造破甲窗口。' },
  illidan:{ name:'恶魔追猎', icon:'🪽', type:'execute', cd:24000, tags:['execute','boss','tempo'], desc:'首领或残血目标前进入追猎节奏,短时提高随从攻势并追加伤害。' },
  arthas:{ name:'亡者号令', icon:'🧟', type:'dot', cd:26000, tags:['dot','control','undead'], desc:'首领或带标记目标前释放亡者压迫,附加寒疫持续伤害与减速。' },
  jaina:{ name:'寒冰碎枪', icon:'🧊', type:'control', cd:16000, tags:['control','aoe','caster'], desc:'目标被减速、冻结标记或处于首领战时追加冰枪,并短暂冻结。' },
  sylvanas:{ name:'黑箭处决', icon:'🏹', type:'execute', cd:21000, tags:['execute','dot','mark'], desc:'目标低血或中毒时射出黑箭,造成斩杀伤害并延长暗影标记。' },
  anduin:{ name:'守护圣光', icon:'✨', type:'rescue', cd:90000, tags:['heal','shield','cleanse'], desc:'主角濒危时触发一次强治疗、护盾和净化。' },
  tyrande:{ name:'月神点名', icon:'🌙', type:'mark', cd:24000, tags:['mark','heal','boss'], desc:'首领或高血目标会被月神标记,主角获得小治疗并更容易打出暴击窗口。' },
  malfurion:{ name:'梦境回春', icon:'🌱', type:'cleanse', cd:32000, tags:['heal','cleanse','sustain'], desc:'主角承压或存在减益时触发生命回春,治疗并净化。' },
  sw_guard:{ name:'城门挡刀', icon:'🧱', type:'guard', cd:26000, tags:['tank','shield','veteran'], desc:'主角首次承压时替主角挡刀并给盾,低品质满星后冷却更短。' },
  horde_grunt:{ name:'血吼补刀', icon:'🪓', type:'execute', cd:22000, tags:['execute','control','veteran'], desc:'残血目标前猛冲补刀,附带短暂击晕。' },
  apprentice:{ name:'奥术打断', icon:'✨', type:'mark', cd:20000, tags:['mark','caster','veteran'], desc:'给施法或首领目标留下奥术印记,提高后续协同追击价值。' },
  acolyte:{ name:'虔诚急救', icon:'🙏', type:'cleanse', cd:30000, tags:['heal','cleanse','veteran'], desc:'主角有减益或血量下降时祷言急救,净化并补上小护盾。' },
  scout:{ name:'弱点照明', icon:'👁️', type:'mark', cd:18000, tags:['mark','execute','veteran'], desc:'定期标出当前目标弱点,低血目标会额外受到随从追击。' },
  guard_cap:{ name:'列阵换防', icon:'🪖', type:'guard', cd:24000, tags:['tank','shield','summon'], desc:'队长组织换防,提升随从仇恨并为主角和随从加盾。' },
  al_ranger:{ name:'鹰眼集火', icon:'🍃', type:'mark', cd:21000, tags:['mark','summon','aoe'], desc:'鹰眼标记高威胁目标,多目标战中追加溅射箭雨。' },
  field_medic:{ name:'战地急救', icon:'🩹', type:'rescue', cd:42000, tags:['heal','cleanse','shield'], desc:'主角危险时立刻包扎,治疗、护盾并净化1个减益。' },
  shaman_app:{ name:'灵狼牵制', icon:'⚡', type:'summon', cd:26000, tags:['summon','control','aoe'], desc:'召来灵狼牵制目标,并让当前目标感电减速。' },
  berserker:{ name:'浴血反扑', icon:'🩸', type:'execute', cd:23000, tags:['execute','sustain','veteran'], desc:'随从或目标血线越低越凶,追加斩杀并回复自身。' },
  saurfang:{ name:'鲜血裂伤', icon:'🩸', type:'dot', cd:23000, tags:['dot','sunder','execute'], desc:'撕裂目标造成流血,残血阶段伤害更高。' },
  muradin:{ name:'铜须震地', icon:'⛰️', type:'control', cd:24000, tags:['tank','control','sunder'], desc:'震地打断敌人节奏,减速并短暂击晕当前目标。' },
  maraad:{ name:'纳鲁庇护', icon:'🌟', type:'barrier', cd:36000, tags:['heal','shield','cleanse'], desc:'圣光护住主角,补盾并在有减益时净化。' },
  rexxar:{ name:'米莎撕咬', icon:'🐻', type:'summon', cd:26000, tags:['summon','boss','sustain'], desc:'召唤米莎牵制首领或残血目标,并追加野兽撕咬。' },
  valeera:{ name:'毒刃锁喉', icon:'☠️', type:'dot', cd:21000, tags:['dot','execute','mark'], desc:'给目标上毒并沉默式压制施法节奏,残血时追加爆发。' },
  kael:{ name:'凤凰烈焰', icon:'🦜', type:'aoe', cd:26000, tags:['aoe','dot','caster'], desc:'多目标或首领战中唤下凤凰烈焰,造成溅射并灼烧。' },
  medivh:{ name:'守护者时隙', icon:'📜', type:'tempo', cd:30000, tags:['boss','tempo','shield'], desc:'首领战中打开短暂时隙,为主角补盾并强化下一轮协同。' },
  azshara:{ name:'女王敕令', icon:'👑', type:'mark', cd:26000, tags:['mark','caster','control'], desc:'魅惑式压迫目标,施加心智标记并削弱防线。' },
  ragnaros:{ name:'炎魔重锤', icon:'🔨', type:'aoe', cd:28000, tags:['aoe','dot','stun'], desc:'多目标或首领战中砸下萨弗拉斯余威,造成溅射、灼烧和短晕。' },
  kelthuzad:{ name:'霜墓禁锢', icon:'⚰️', type:'control', cd:28000, tags:['control','dot','shield'], desc:'冻结目标行动,施加寒霜侵蚀并为随从补冰甲。' },
  lichking:{ name:'天灾压迫', icon:'👑', type:'dot', cd:26000, tags:['dot','control','boss'], desc:'首领或残血目标前施加寒疫、减速并为自身补盾。' },
  kiljaeden:{ name:'欺诈者烙印', icon:'🔥', type:'mark', cd:27000, tags:['mark','dot','boss'], desc:'烙印高威胁目标,后续随从伤害会围绕该目标爆发。' },
  garrosh:{ name:'战歌压阵', icon:'🛡️', type:'guard', cd:24000, tags:['tank','shield','sunder'], desc:'战帅压阵护住主角,同时震慑目标制造破甲窗口。' },
  cairne:{ name:'先祖坚韧', icon:'🐂', type:'barrier', cd:34000, tags:['tank','sustain','shield'], desc:'先祖之力加固战线,为双方补盾并回复随从。' },
  bolvar:{ name:'灰烬壁垒', icon:'🔥', type:'guard', cd:25000, tags:['tank','shield','cleanse'], desc:'灰烬壁垒接管压力,主角危险时挡刀并净化随从减益。' },
  chen:{ name:'醉拳化劲', icon:'🍺', type:'barrier', cd:30000, tags:['tank','sustain','control'], desc:'用醉拳化解爆发,加盾、回复并减速目标。' },
  rehgar:{ name:'幽魂链疗', icon:'🐺', type:'rescue', cd:43000, tags:['heal','summon','cleanse'], desc:'幽魂狼群带来链式治疗,危急时治疗并净化。' },
  velen:{ name:'预言圣约', icon:'🔮', type:'rescue', cd:76000, tags:['heal','shield','boss'], desc:'预见致命窗口,以强治疗和护盾稳住主角。' },
  liadrin:{ name:'血骑士审判', icon:'🌞', type:'barrier', cd:32000, tags:['heal','shield','sunder'], desc:'审判目标并为主角加盾,圣光反击会制造破甲。' },
  alexstrasza:{ name:'生命缚誓', icon:'🐉', type:'rescue', cd:70000, tags:['heal','sustain','aoe'], desc:'生命守护者在低血时大幅治疗主角,并灼烧敌人。' },
  cenarius:{ name:'林地苏醒', icon:'🌳', type:'cleanse', cd:46000, tags:['heal','summon','cleanse'], desc:'林地力量净化减益并召来根须牵制目标。' },
  khadgar:{ name:'时序脉冲', icon:'⏱️', type:'tempo', cd:26000, tags:['tempo','caster','control'], desc:'主角暴击或首领战中压缩时间,重置协同节奏并短暂减速目标。' },
  maiev:{ name:'守望绝罚', icon:'🗡️', type:'execute', cd:22000, tags:['execute','control','mark'], desc:'目标被控制、标记或残血时执行绝罚追击。' },
  grommash:{ name:'战歌狂潮', icon:'🪓', type:'execute', cd:24000, tags:['execute','boss','tempo'], desc:'首领或残血阶段进入战歌狂潮,追加高暴击压制。' },
  voljin:{ name:'洛阿咒钉', icon:'🧿', type:'dot', cd:24000, tags:['dot','mark','sustain'], desc:'洛阿咒钉侵蚀目标,并把部分伤害转为续航。' },
  akama:{ name:'灰舌伏击', icon:'🌫️', type:'mark', cd:21000, tags:['mark','execute','control'], desc:'从阴影伏击目标,施加灰舌标记并短暂减速。' },
};
const COMPANION_UNIQUE_TRAITS = {
  fordring:{ name:'灰烬守誓', icon:'⚖️', tags:['shield','cleanse','boss'], def:1.04, hp:1.03, shieldPower:1.12, cdr:0.96, desc:'首领战和高压战线更稳,护盾类专属更厚。' },
  varian:{ name:'双持国王', icon:'🦁', tags:['tank','sunder','boss'], atk:1.03, def:1.04, specialPower:1.08, cdr:0.94, desc:'兼具护卫与压迫,首领战护卫节奏更快。' },
  thrall:{ name:'大地回声', icon:'⛈️', tags:['control','sustain','aoe'], hp:1.03, reg:1.12, cdr:0.95, desc:'控制和治疗波更可靠,适合长线战斗。' },
  illidan:{ name:'怒火节拍', icon:'🪽', tags:['execute','boss','tempo'], atk:1.05, spd:1.04, critd:10, specialPower:1.10, desc:'残血和首领前爆发更狠,攻速略高。' },
  arthas:{ name:'霜之饥渴', icon:'❄️', tags:['dot','control','sustain'], atk:1.03, hp:1.02, specialPower:1.08, desc:'持续伤害和吸血节奏更强,适合磨首领。' },
  jaina:{ name:'寒冰连锁', icon:'🧊', tags:['control','aoe','caster'], crit:4, cdr:0.93, specialPower:1.06, desc:'控场专属冷却更短,冰冻与减速窗口更密。' },
  sylvanas:{ name:'黑暗游侠', icon:'🏹', tags:['execute','dot','mark'], atk:1.04, crit:3, specialPower:1.08, desc:'标记和斩杀型战斗更强,适合收割。' },
  anduin:{ name:'王储慈悲', icon:'✨', tags:['heal','shield','cleanse'], hp:1.03, healPower:1.15, cdr:0.97, desc:'治疗专属更强,支援位也能稳定救场。' },
  tyrande:{ name:'月夜指引', icon:'🌙', tags:['mark','heal','boss'], crit:5, healPower:1.06, dungeon:1.04, desc:'标记首领并提供小治疗,副本适配收益更高。' },
  malfurion:{ name:'梦境根须', icon:'🌱', tags:['heal','cleanse','sustain'], hp:1.04, healPower:1.10, supportPower:1.08, desc:'持续治疗和净化支援更强。' },
  sw_guard:{ name:'城墙纪律', icon:'🧱', tags:['tank','shield','veteran'], def:1.07, hp:1.04, supportPower:1.12, desc:'低级护卫的支援价值更高,满星后很适合当挡刀位。' },
  horde_grunt:{ name:'步兵冲锋', icon:'🪓', tags:['execute','control','veteran'], atk:1.06, specialPower:1.06, desc:'低级斩杀支援,残血补刀更有存在感。' },
  apprentice:{ name:'学徒专注', icon:'✨', tags:['mark','caster','veteran'], crit:4, cdr:0.94, supportPower:1.08, desc:'廉价施法标记位,支援触发更频繁。' },
  acolyte:{ name:'烛火祷文', icon:'🙏', tags:['heal','cleanse','veteran'], healPower:1.12, supportPower:1.12, cdr:0.96, desc:'低级净化支援,专门克制毒和诅咒。' },
  scout:{ name:'先手侦察', icon:'👁️', tags:['mark','execute','veteran'], crit:5, cdr:0.92, dungeon:1.05, desc:'标记弱点更勤,副本推荐权重更高。' },
  guard_cap:{ name:'换防口令', icon:'🪖', tags:['tank','shield','summon'], def:1.06, shieldPower:1.10, supportPower:1.08, desc:'护卫和召唤列阵更稳,支援位也能补防线。' },
  al_ranger:{ name:'鹰眼哨戒', icon:'🍃', tags:['mark','summon','aoe'], spd:1.04, crit:3, dungeon:1.05, desc:'多目标侦察和标记更强。' },
  field_medic:{ name:'绷带条例', icon:'🩹', tags:['heal','cleanse','shield'], healPower:1.14, supportPower:1.10, desc:'急救和护盾支援更强,适合高压地图。' },
  shaman_app:{ name:'图腾余响', icon:'⚡', tags:['summon','control','aoe'], spd:1.03, cdr:0.95, specialPower:1.06, desc:'图腾牵制更频繁,多目标更有用。' },
  berserker:{ name:'濒血狂热', icon:'🩸', tags:['execute','sustain','veteran'], atk:1.07, critd:8, specialPower:1.08, desc:'越到残血越有威胁,低品质输出位更容易出场。' },
  saurfang:{ name:'老兵裂口', icon:'🩸', tags:['dot','sunder','execute'], atk:1.05, hp:1.02, specialPower:1.08, desc:'流血和破甲兼具,适合打硬目标。' },
  muradin:{ name:'铜须硬骨', icon:'⛰️', tags:['tank','control','sunder'], def:1.08, hp:1.03, cdr:0.96, desc:'控制坦更硬,震地节奏略快。' },
  maraad:{ name:'纳鲁余辉', icon:'🌟', tags:['heal','shield','cleanse'], healPower:1.08, shieldPower:1.10, supportPower:1.06, desc:'治疗和护盾同时强化。' },
  rexxar:{ name:'兽群默契', icon:'🐻', tags:['summon','boss','sustain'], atk:1.04, hp:1.03, specialPower:1.09, desc:'召唤和首领牵制更强。' },
  valeera:{ name:'无声起手', icon:'☠️', tags:['dot','execute','mark'], crit:6, spd:1.03, cdr:0.95, desc:'开场标记和毒刃频率更高。' },
  kael:{ name:'凤凰余烬', icon:'🦜', tags:['aoe','dot','caster'], atk:1.05, critd:8, specialPower:1.10, desc:'火焰溅射和灼烧更有威力。' },
  medivh:{ name:'守护者预案', icon:'📜', tags:['boss','tempo','shield'], cdr:0.92, shieldPower:1.08, dungeon:1.05, desc:'首领战节奏支援更快,副本适配更高。' },
  azshara:{ name:'女王仪态', icon:'👑', tags:['mark','caster','control'], atk:1.04, crit:4, specialPower:1.07, desc:'标记和控制兼具,施法目标处理更稳。' },
  ragnaros:{ name:'熔核威压', icon:'🔨', tags:['aoe','dot','stun'], atk:1.07, specialPower:1.12, desc:'清场和灼烧爆发更强。' },
  kelthuzad:{ name:'霜墓学识', icon:'⚰️', tags:['control','dot','shield'], cdr:0.95, shieldPower:1.10, specialPower:1.07, desc:'冰甲和寒霜控制更稳定。' },
  lichking:{ name:'王座统御', icon:'👑', tags:['dot','control','boss'], hp:1.06, def:1.05, specialPower:1.09, desc:'首领压迫和生存能力更强。' },
  kiljaeden:{ name:'欺诈预谋', icon:'🔥', tags:['mark','dot','boss'], atk:1.05, crit:4, dungeon:1.05, desc:'高威胁目标标记更准,副本适配更好。' },
  garrosh:{ name:'战帅铁令', icon:'🛡️', tags:['tank','shield','sunder'], atk:1.03, def:1.07, specialPower:1.08, desc:'护卫时仍能制造进攻压力。' },
  cairne:{ name:'血蹄沉稳', icon:'🐂', tags:['tank','sustain','shield'], hp:1.08, reg:1.15, shieldPower:1.08, desc:'持续承压能力更强。' },
  bolvar:{ name:'灰烬不灭', icon:'🔥', tags:['tank','shield','cleanse'], def:1.08, hp:1.04, cdr:0.96, desc:'护卫净化更可靠,适合危险副本。' },
  chen:{ name:'酒仙步法', icon:'🍺', tags:['tank','sustain','control'], spd:1.04, def:1.05, cdr:0.95, desc:'化解伤害的频率更高。' },
  rehgar:{ name:'幽魂链路', icon:'🐺', tags:['heal','summon','cleanse'], healPower:1.12, supportPower:1.08, desc:'链疗和狼群支援更强。' },
  velen:{ name:'先知预见', icon:'🔮', tags:['heal','shield','boss'], healPower:1.15, shieldPower:1.10, cdr:0.97, desc:'大额救场更强,尤其适合首领战。' },
  liadrin:{ name:'血骑士誓约', icon:'🌞', tags:['heal','shield','sunder'], atk:1.02, shieldPower:1.12, healPower:1.08, desc:'圣光护盾和反击破甲兼具。' },
  alexstrasza:{ name:'生命女王', icon:'🐉', tags:['heal','sustain','aoe'], hp:1.05, healPower:1.18, specialPower:1.06, desc:'大治疗最强,还能提供灼烧压制。' },
  cenarius:{ name:'林地脉动', icon:'🌳', tags:['heal','summon','cleanse'], healPower:1.10, supportPower:1.10, cdr:0.96, desc:'净化和召唤牵制更常见。' },
  khadgar:{ name:'时序校准', icon:'⏱️', tags:['tempo','caster','control'], cdr:0.90, spd:1.03, dungeon:1.06, desc:'节奏型随从,协同和专属战斗更频繁。' },
  maiev:{ name:'守望者耐心', icon:'🗡️', tags:['execute','control','mark'], crit:5, specialPower:1.08, cdr:0.95, desc:'等待控制或标记窗口后爆发更高。' },
  grommash:{ name:'战歌血性', icon:'🪓', tags:['execute','boss','tempo'], atk:1.08, critd:10, specialPower:1.10, desc:'高风险高爆发,首领残血阶段压制力强。' },
  voljin:{ name:'洛阿低语', icon:'🧿', tags:['dot','mark','sustain'], crit:4, healPower:1.06, specialPower:1.07, desc:'诅咒和续航兼具,适合持续战。' },
  akama:{ name:'灰舌暗路', icon:'🌫️', tags:['mark','execute','control'], spd:1.05, crit:4, supportPower:1.07, desc:'伏击和支援标记更灵活。' },
};
function companionTacticKey(){
  const key = state?.companionTactic || 'balanced';
  return COMPANION_TACTICS[key] ? key : 'balanced';
}
function companionTacticMeta(key){ return COMPANION_TACTICS[key || companionTacticKey()] || COMPANION_TACTICS.balanced; }
function companionSetTactic(key){
  if(!COMPANION_TACTICS[key]) return;
  state.companionTactic = key;
  initCompanionHp();
  markDirty('companion');
  if(typeof saveState === 'function') saveState();
  if(typeof renderCompanion === 'function') renderCompanion();
  log(`${COMPANION_TACTICS[key].icon} 随从战术切换为「${COMPANION_TACTICS[key].label}」`,'good');
}
function companionTacticHealMult(){ return companionTacticMeta().heal || 1; }
function companionTacticShieldMult(){ return companionTacticMeta().shield || 1; }
function companionTacticDmgMult(){ return companionTacticMeta().dmg || 1; }
function companionSkillCdLeft(i){ return Math.max(0, ((compSkillCd&&compSkillCd[i])||0) - Date.now()); }   // 供 UI 显示剩余CD(毫秒)
function companionReactionLeftMs(now){ return Math.max(0, (state._compReactionUntil || 0) - (now || Date.now())); }
function companionResonanceLeftMs(now){ return Math.max(0, (state._compResonanceUntil || 0) - (now || Date.now())); }
function companionReactionUiState(now){
  const ts = now || Date.now();
  const meta = companionTacticMeta();
  const left = companionReactionLeftMs(ts);
  return {
    icon:meta.icon || '🐾',
    name:meta.reaction || '战友反应',
    tactic:meta.label || '均衡',
    desc:companionReactionDesc(companionTacticKey()),
    cdMs:COMPANION_REACTION_CD_MS,
    leftMs:left,
    ready:left <= 0,
    recent:(state._compReactionLastAt || 0) > ts - 1800
  };
}
function companionResonanceUiState(now){
  const comp = getActiveCompanion();
  const tpl = comp && COMPANIONS.find(c=>c.key===comp.key);
  const info = companionResonanceInfo(tpl);
  if(!info.rank) return null;
  const ts = now || Date.now();
  const left = companionResonanceLeftMs(ts);
  return {
    icon:'⚜️',
    name:info.name,
    desc:info.desc,
    rank:info.rank,
    bondNames:info.bondNames,
    cdMs:COMPANION_RESONANCE_CD_MS,
    leftMs:left,
    ready:left <= 0,
    recent:(state._compResonanceLastAt || 0) > ts - 1800
  };
}
function companionEffectiveSkillCdMs(sk){
  const base = Math.max(0.5, (sk?.cd || COMP_SKILL_DEFAULT_CD)) * 1000;
  const floor = sk?._signature ? 3000 : 1500;
  return Math.max(floor, Math.floor(base * COMPANION_SKILL_CD_MULT));
}
function companionEffectiveSkillCdSec(sk){ return +(companionEffectiveSkillCdMs(sk) / 1000).toFixed(1); }
const COMPANION_USE_UNLOCK_LEVEL = { white:1, green:30, blue:50, purple:60, orange:70 };
const COMPANION_USE_QUALITY_ORDER = ['white','green','blue','purple','orange'];
function companionQualityUnlockLevel(qKey){ return COMPANION_USE_UNLOCK_LEVEL[qKey || 'white'] || 1; }
function companionUseMaxQualityKey(lvl){
  const level = Number.isFinite(lvl) ? lvl : (state.hero?.lvl || 1);
  if(level >= 70) return 'orange';
  if(level >= 60) return 'purple';
  if(level >= 50) return 'blue';
  if(level >= 30) return 'green';
  return 'white';
}
function companionUseMaxQualityName(lvl){
  const key = companionUseMaxQualityKey(lvl);
  const q = (typeof COMPANION_QUALITY !== 'undefined') ? COMPANION_QUALITY.find(x => x.key === key) : null;
  return q?.name || key;
}
function companionUseRuleText(lvl){
  const level = Number.isFinite(lvl) ? lvl : (state.hero?.lvl || 1);
  return `当前${level}级最高可出战${companionUseMaxQualityName(level)}随从。30级解锁优秀,50级解锁精良,60级解锁史诗,70级解锁传说。`;
}
function companionUseGate(tpl, lvl){
  const q = (typeof compQuality === 'function') ? compQuality(tpl) : { key:tpl?.quality || 'white', name:tpl?.quality || '普通' };
  const level = Number.isFinite(lvl) ? lvl : (state.hero?.lvl || 1);
  const reqLevel = companionQualityUnlockLevel(q.key);
  const allowed = level >= reqLevel;
  return {
    allowed,
    level,
    reqLevel,
    qKey:q.key,
    qName:q.name,
    maxKey:companionUseMaxQualityKey(level),
    maxName:companionUseMaxQualityName(level),
    text:allowed ? companionUseRuleText(level) : `${q.name}随从需要${reqLevel}级才能出战或支援。${companionUseRuleText(level)}`
  };
}
function companionCanUseTpl(tpl, lvl){ return companionUseGate(tpl, lvl).allowed; }
function getActiveCompanion(){
  if(state.activeCompanion<0||!state.companions[state.activeCompanion])return null;
  const comp = state.companions[state.activeCompanion];
  const tpl = COMPANIONS.find(c => c.key === comp.key);
  if(tpl && !companionCanUseTpl(tpl)) return null;
  return comp;
}
function companionUse(idx){
  const comp = state.companions[idx];
  const tpl = comp && COMPANIONS.find(c => c.key === comp.key);
  if(!comp || !tpl) return false;
  const gate = companionUseGate(tpl);
  if(!gate.allowed){
    log(`🐾 ${tpl.name} 暂未解锁: ${gate.text}`,'bad');
    return false;
  }
  state.activeCompanion = idx;
  if(typeof ensureCompanionSupportState === 'function') ensureCompanionSupportState();
  initCompanionHp();
  recomputeStats();
  markDirty('companion','hero');
  log('🐾 随从出战!','good');
  return true;
}
function ensureCompanionUseEligibility(){
  let changed = false;
  const comp = state.activeCompanion >= 0 ? state.companions[state.activeCompanion] : null;
  const tpl = comp && COMPANIONS.find(c => c.key === comp.key);
  if(comp && tpl && !companionCanUseTpl(tpl)){
    state.activeCompanion = -1;
    state._compHp = 0;
    changed = true;
  }
  const beforeSupport = Array.isArray(state.companionSupport) ? state.companionSupport.join('|') : '';
  if(typeof ensureCompanionSupportState === 'function') ensureCompanionSupportState();
  const afterSupport = Array.isArray(state.companionSupport) ? state.companionSupport.join('|') : '';
  if(beforeSupport !== afterSupport) changed = true;
  if(changed){
    recomputeStats();
    markDirty('companion','hero');
  }
  return !changed;
}
function companionIsAwakened(comp){ return !!(comp && (comp.awakened || (comp.awakenRank || 0) > 0)); }
function companionAwakenCostBase(qKey){ return COMPANION_AWAKEN_COST[qKey || 'white'] || COMPANION_AWAKEN_COST.white; }
function companionAwakenInfo(comp, tpl){
  const q = (typeof compQuality === 'function') ? compQuality(tpl) : { key:'white', name:'普通' };
  const base = companionAwakenCostBase(q.key);
  return {
    active: companionIsAwakened(comp),
    rank: companionIsAwakened(comp) ? (comp.awakenRank || 1) : 0,
    qKey:q.key,
    qName:q.name,
    statPct:base.statPct || 0.1,
    familiarity:comp?.familiarity || 0,
  };
}
function companionAwakenSkillDef(tpl){
  if(!tpl) return null;
  const q = (typeof compQuality === 'function') ? compQuality(tpl) : { key:'white' };
  const pow = ({ white:1.00, green:1.10, blue:1.24, purple:1.42, orange:1.68 })[q.key] || 1;
  const baseName = tpl.signature?.name || tpl.name || '随从';
  if(tpl.role === 'tank'){
    return {
      _awakenSkill:true, name:`觉醒·${baseName}`, icon:'🌟', type:'buff',
      buff:'sacredShield', buffTarget:'both', duration:12000, cd:26,
      healPct:+(0.08 * pow).toFixed(3), shieldPct:+(0.18 * pow).toFixed(3), cleanse:true,
      desc:'觉醒之力守护主角和随从,施加厚护盾、少量治疗并净化减益。'
    };
  }
  if(tpl.role === 'heal'){
    return {
      _awakenSkill:true, name:`觉醒·${baseName}`, icon:'🌟', type:'heal',
      heal:+(0.30 * pow).toFixed(3), healTarget:'both', healPct:+(0.06 * pow).toFixed(3),
      shieldPct:+(0.12 * pow).toFixed(3), cleanse:true, cd:24,
      desc:'觉醒之力同时治疗主角和随从,追加护盾并净化减益。'
    };
  }
  return {
    _awakenSkill:true, name:`觉醒·${baseName}`, icon:'🌟', type:'dmg',
    mul:+(5.2 * pow).toFixed(1), alwaysCrit:q.key === 'orange',
    dotPct:+(0.14 * pow).toFixed(3), dotMs:9000, splashPct:+(0.38 * pow).toFixed(2),
    executeBonus:+(0.28 * pow).toFixed(2), executeThreshold:0.42, bonusVsBoss:+(0.18 * pow).toFixed(2),
    cd:24, desc:'觉醒爆发技,高倍率打击并溅射,对首领和低血量目标额外提高伤害。'
  };
}
function companionAwakenSkill(tpl, comp){ return companionIsAwakened(comp) ? companionAwakenSkillDef(tpl) : null; }
function companionOwnedByKey(key){ return (state.companions || []).find(c => c && c.key === key) || null; }
function companionSupportMaxSlots(){ return COMPANION_SUPPORT_SLOTS; }
function ensureCompanionSupportState(){
  if(!Array.isArray(state.companionSupport)) state.companionSupport = [];
  const owned = new Set((state.companions || []).map(c => c.key));
  const activeKey = getActiveCompanion()?.key;
  const out = [];
  for(const key of state.companionSupport){
    if(!key || !owned.has(key) || key === activeKey || out.includes(key)) continue;
    const tpl = COMPANIONS.find(c => c.key === key);
    if(tpl && !companionCanUseTpl(tpl)) continue;
    out.push(key);
    if(out.length >= companionSupportMaxSlots()) break;
  }
  state.companionSupport = out;
  return out;
}
function companionSupportEntries(){
  return ensureCompanionSupportState().map((key, slot) => {
    const comp = companionOwnedByKey(key);
    const tpl = comp && COMPANIONS.find(c => c.key === key);
    return comp && tpl ? { key, slot, comp, tpl } : null;
  }).filter(Boolean);
}
function companionSupportSet(key){
  const comp = companionOwnedByKey(key);
  const tpl = comp && COMPANIONS.find(c => c.key === key);
  if(!comp || !tpl) return log('🐾 需要先获得这个随从','bad');
  if(getActiveCompanion()?.key === key) return log('🐾 出战随从不能放入支援位','bad');
  const arr = ensureCompanionSupportState();
  if(arr.includes(key)){
    state.companionSupport = arr.filter(k => k !== key);
    log(`🐾 ${tpl.name} 已离开支援位`,'good');
  }else{
    const gate = companionUseGate(tpl);
    if(!gate.allowed) return log(`🐾 ${tpl.name} 暂未解锁: ${gate.text}`,'bad');
    if(arr.length >= companionSupportMaxSlots()) arr.shift();
    arr.push(key);
    state.companionSupport = arr;
    log(`🐾 ${tpl.name} 加入支援位`,'good');
  }
  recomputeStats();
  markDirty('companion','hero');
  if(typeof saveState === 'function') saveState();
}
function companionSupportIsSlotted(key){ return ensureCompanionSupportState().includes(key); }
function companionVeteranInfo(tpl, comp){
  if(!tpl || !comp) return null;
  const q = (typeof compQuality === 'function') ? compQuality(tpl).key : (tpl.quality || 'white');
  const stars = comp.stars || 1;
  if(q === 'white' && stars >= 5) return { key:'white', name:'老兵执勤', icon:'🎖️', desc:'白色随从满星后解锁:专属战斗和支援冷却缩短15%,支援强度提高10%。', cdMult:0.85, supportMult:1.10, power:1 };
  if(q === 'green' && stars >= 5) return { key:'green', name:'精锐老兵', icon:'🏅', desc:'绿色随从满星后解锁:专属战斗和支援冷却缩短10%,支援强度提高16%。', cdMult:0.90, supportMult:1.16, power:1 };
  if(q === 'blue' && stars >= 5) return { key:'blue', name:'战场专精', icon:'🔷', desc:'蓝色随从满星后解锁:专属战斗强度提高8%,更适合作为机制位。', cdMult:0.94, supportMult:1.08, power:1 };
  return null;
}
function companionUniqueTrait(keyOrTpl){
  const key = typeof keyOrTpl === 'string' ? keyOrTpl : keyOrTpl?.key;
  return key ? (COMPANION_UNIQUE_TRAITS[key] || null) : null;
}
function companionUniqueTraitDesc(keyOrTpl){
  const trait = companionUniqueTrait(keyOrTpl);
  return trait ? `${trait.name}:${trait.desc}` : '';
}
function companionUniqueTraitTags(tpl){
  const trait = companionUniqueTrait(tpl);
  return trait?.tags || [];
}
function companionUniqueTraitSummary(tpl){
  const trait = companionUniqueTrait(tpl);
  if(!trait) return '';
  const bits = [];
  if(trait.atk) bits.push(`攻击×${trait.atk}`);
  if(trait.def) bits.push(`防御×${trait.def}`);
  if(trait.hp) bits.push(`生命×${trait.hp}`);
  if(trait.spd) bits.push(`攻速×${trait.spd}`);
  if(trait.crit) bits.push(`暴击+${trait.crit}`);
  if(trait.critd) bits.push(`爆伤+${trait.critd}`);
  if(trait.healPower) bits.push(`治疗×${trait.healPower}`);
  if(trait.shieldPower) bits.push(`护盾×${trait.shieldPower}`);
  if(trait.specialPower) bits.push(`专属×${trait.specialPower}`);
  if(trait.supportPower) bits.push(`支援×${trait.supportPower}`);
  if(trait.cdr) bits.push(`冷却×${trait.cdr}`);
  return bits.join(' · ');
}
function companionUniqueHealMult(tpl){ return companionUniqueTrait(tpl)?.healPower || 1; }
function companionUniqueShieldMult(tpl){ return companionUniqueTrait(tpl)?.shieldPower || 1; }
function companionUniqueSpecialPower(tpl, support){
  const trait = companionUniqueTrait(tpl);
  if(!trait) return 1;
  return (trait.specialPower || 1) * (support ? (trait.supportPower || 1) : 1);
}
function companionUniqueCooldownMult(tpl, support){
  const trait = companionUniqueTrait(tpl);
  if(!trait) return 1;
  return (trait.cdr || 1) * (support && trait.supportCdr ? trait.supportCdr : 1);
}
function companionCombatSpecial(key){ return COMPANION_COMBAT_SPECIALS[key] || null; }
function companionCombatSpecialTags(tpl){
  const spec = companionCombatSpecial(tpl?.key);
  return Array.from(new Set([...(spec?.tags || []), ...companionUniqueTraitTags(tpl)]));
}
function companionCurrentDungeon(){
  const key = state.dungeonState?.key || state.mythicState?.key || '';
  return key && typeof DUNGEONS !== 'undefined' ? DUNGEONS.find(d => d.key === key) : null;
}
function companionDungeonNeedTags(dg){
  if(!dg) return [];
  const tags = new Set();
  const text = `${dg.key || ''} ${dg.name || ''} ${dg.desc || ''} ${dg.type || ''}`.toLowerCase();
  const themeTags = typeof dungeonTraitTagsForDungeon === 'function' ? dungeonTraitTagsForDungeon(dg.key) : [];
  for(const tag of themeTags || []){
    if(['poison','plague','shadow','void','ritual','undead'].includes(tag)) tags.add('cleanse');
    if(['mech','titan','fortress','giant'].includes(tag)) tags.add('sunder');
    if(['spider','beast','pirate','orc','martial'].includes(tag)) tags.add('aoe');
    if(['time','caster','arcane','ethereal'].includes(tag)) tags.add('control');
    if(['dragon','fire','burst'].includes(tag)) tags.add('shield');
    if(['raid','oldgod','boss'].includes(tag)) tags.add('boss');
    if(['dot','blood'].includes(tag)) tags.add('sustain');
    if(['execute'].includes(tag)) tags.add('execute');
  }
  if(dg.type === 'raid' || (dg.bosses || []).length >= 4) tags.add('boss');
  if(/毒|疫|瘟|诅咒|暗影|虚空|腐/.test(text)) tags.add('cleanse');
  if(/机械|泰坦|护盾|壁垒|装甲/.test(text)) tags.add('sunder');
  if(/小怪|蛛|虫|海盗|兽人|多/.test(text)) tags.add('aoe');
  if(/时序|法师|奥术|施法|虚灵/.test(text)) tags.add('control');
  if(/龙|火|爆发|熔|炎/.test(text)) tags.add('shield');
  if(!tags.size) tags.add(dg.type === 'raid' ? 'boss' : 'control');
  return Array.from(tags).slice(0, 5);
}
function companionDungeonFitInfo(tpl, dg){
  if(!tpl || !dg) return { score:0, matched:[], needs:companionDungeonNeedTags(dg), label:'常规' };
  const needs = companionDungeonNeedTags(dg);
  const tags = new Set(companionCombatSpecialTags(tpl));
  if(tpl.role === 'tank'){ tags.add('tank'); tags.add('shield'); }
  if(tpl.role === 'heal'){ tags.add('heal'); tags.add('cleanse'); tags.add('sustain'); }
  if(tpl.role === 'dps') tags.add('execute');
  const matched = needs.filter(tag => tags.has(tag) || (tag === 'shield' && tags.has('tank')) || (tag === 'sunder' && tags.has('mark')));
  return { score:matched.length, matched, needs, label:matched.length ? matched.map(companionDungeonTagLabel).join('/') : '常规' };
}
function companionDungeonTagLabel(tag){
  return ({ cleanse:'净化', sunder:'破甲', aoe:'清场', control:'控场', shield:'护盾', boss:'首领', sustain:'续航', execute:'斩杀', mark:'标记', summon:'召唤', tempo:'节奏', tank:'护卫' })[tag] || tag;
}
function companionDungeonFitMult(tpl){
  const dg = companionCurrentDungeon();
  const fit = companionDungeonFitInfo(tpl, dg);
  const unique = companionUniqueTrait(tpl);
  if(!fit.score) return unique?.dungeon || 1;
  const q = (typeof compQuality === 'function' && tpl) ? compQuality(tpl).key : 'white';
  const lowBonus = (q === 'white' || q === 'green') ? 0.012 : 0;
  return (unique?.dungeon || 1) * (1 + Math.min(0.075, fit.score * (0.018 + lowBonus)));
}
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
    if(extra > 0){ mon.hp -= extra; trackDmg('comp', extra); showMonsterFloat(mon, (sig.icon || '✨') + '-' + extra, '#fbbf24', allySideFloatOpts({ variant:'crit' })); }
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
    if(extra > 0){ mon.hp -= extra; trackDmg('comp', extra); showMonsterFloat(mon, (sig.icon || '✨') + '-' + extra, '#fbbf24', allySideFloatOpts({ variant:'crit' })); }
    note = '斩杀强化';
  }
  if(sig.bonusVsBoss && mon.isBoss){
    const extra = absorbMonsterBarrier(mon, Math.max(1, Math.floor(dmgDone * sig.bonusVsBoss)), sig.icon || '👑').remaining;
    if(extra > 0){ mon.hp -= extra; trackDmg('comp', extra); showMonsterFloat(mon, (sig.icon || '👑') + '-' + extra, '#fbbf24', allySideFloatOpts({ variant:'crit' })); }
    note = note || '首领压制';
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
function computeCompanionTemplateStats(comp, tpl, opts){
  if(!comp || !tpl) return null;
  const q=(typeof compQuality==='function')?compQuality(tpl):{key:'white'};
  const qm=COMPANION_COMBAT_QUALITY[q.key]||0.42;
  const sm=1+COMPANION_STAR_GROWTH*((comp.stars||1)-1);
  const role=COMPANION_ROLE_PROFILE[tpl.role]||COMPANION_ROLE_PROFILE.dps;
  const skills=(tpl.skills||[]).slice();
  const sigSkill = companionSignatureSkill(tpl);
  if(sigSkill) skills.push(sigSkill);
  const awakenSkill = companionAwakenSkill(tpl, comp);
  if(awakenSkill) skills.push(awakenSkill);
  const tactic = opts?.support ? { atk:1, def:1, hp:1, spd:1, heal:1 } : companionTacticMeta();
  const dungeonMult = opts?.ignoreDungeon ? 1 : companionDungeonFitMult(tpl);
  const supportScale = opts?.support ? (opts.supportScale || 1) : 1;
  const veteran = companionVeteranInfo(tpl, comp);
  const veteranPower = veteran ? (opts?.support ? veteran.supportMult : 1.04) : 1;
  const unique = companionUniqueTrait(tpl);
  const awaken = companionAwakenInfo(comp, tpl);
  const awakenMult = awaken.active ? 1 + awaken.statPct : 1;
  const stats={name:tpl.name,emoji:tpl.emoji,role:tpl.role,skills,signature:companionSignature(tpl),veteran,unique,awaken,atk:Math.floor(state.hero.atk*qm*sm*role.atk*(tpl.atkMul||1)*(tactic.atk||1)*supportScale*dungeonMult*veteranPower*(unique?.atk||1)*awakenMult),def:Math.floor(state.hero.def*qm*sm*0.72*role.def*(tpl.defMul||1)*(tactic.def||1)*supportScale*(unique?.def||1)*awakenMult),hpMax:Math.floor(state.hero.hpMax*qm*sm*role.hp*(tpl.hpMul||1)*(tactic.hp||1)*supportScale*(unique?.hp||1)*awakenMult),crit:Math.floor(state.hero.crit*qm*0.40*(tpl.critMul||1))+(unique?.crit||0)+(awaken.active?2:0),critd:Math.floor(state.hero.critd*role.critd*(tpl.critdMul||1))+(unique?.critd||0)+(awaken.active?10:0),spd:state.hero.spd*role.spd*(tpl.spdMul||1)*(tactic.spd||1)*(unique?.spd||1)*(awaken.active?1.04:1),reg:Math.max(1, Math.floor((state.hero.reg||0)*role.reg*(tpl.regMul||1)*(tactic.heal||1)*supportScale*(unique?.reg||1)*awakenMult))};
  applyCompanionSignatureStats(stats, tpl);
  if(!opts?.support){
    applyCompanionBuffEffects(stats);
    const dm = companionDebuffStatMults();
    stats.atk = Math.max(1, Math.floor(stats.atk * dm.atk));
    stats.def = Math.max(0, Math.floor(stats.def * dm.def));
    stats.spd = +(Math.max(0.35, stats.spd * dm.spd)).toFixed(2);
  }
  return stats;
}
function computeCompanionStats(){const comp=getActiveCompanion();if(!comp)return null;const tpl=COMPANIONS.find(c=>c.key===comp.key);return computeCompanionTemplateStats(comp,tpl);}
/* 随从给主角的加成:专属(随星级强化)+ 定位 + 收藏 + 羁绊 */
function collectCompanionMod(){
  const out={atkPct:0,hpPct:0,defPct:0,critdPct:0,spdPct:0,crit:0,leech:0,vers:0,mastery:0,regFlat:0};
  if(!state||!state.companions)return out;
  const comp=getActiveCompanion();
  if(comp){const tpl=COMPANIONS.find(c=>c.key===comp.key);
    if(tpl){const starF=1+0.2*((comp.stars||1)-1);
      const awaken = companionAwakenInfo(comp, tpl);
      const awakenF = awaken.active ? 1.15 : 1;
      for(const[k,v]of Object.entries(tpl.bonus||{}))out[k]=(out[k]||0)+v*starF*awakenF;
      const role=(typeof ROLE_BONUS==='object')&&ROLE_BONUS[tpl.role];
      if(role)for(const[k,v]of Object.entries(role))out[k]=(out[k]||0)+v;
      if(awaken.active){
        const mod = COMPANION_AWAKEN_HERO_MOD[awaken.qKey] || COMPANION_AWAKEN_HERO_MOD.white;
        for(const[k,v]of Object.entries(mod))out[k]=(out[k]||0)+v;
      }}}
  const owned=state.companions.length;
  out.atkPct+=Math.min(owned*0.05,1.2);
  out.hpPct+=Math.min(owned*0.08,1.8);   // 收藏被动保留存在感,但不再把角色面板顶飞
  if(typeof COMPANION_BONDS!=='undefined'){const ks=new Set(state.companions.map(c=>c.key));
    for(const b of COMPANION_BONDS){if(b.keys.every(k=>ks.has(k)))for(const[k,v]of Object.entries(b.mod))out[k]=(out[k]||0)+v;}}
  return out;
}
function activeCompanionBonds(){if(typeof COMPANION_BONDS==='undefined'||!state.companions)return[];const ks=new Set(state.companions.map(c=>c.key));return COMPANION_BONDS.filter(b=>b.keys.every(k=>ks.has(k)));}
function companionResonanceBonds(tpl){
  if(!tpl) return [];
  return activeCompanionBonds().filter(b => Array.isArray(b.keys) && b.keys.includes(tpl.key));
}
function companionResonanceInfo(tpl){
  const bonds = companionResonanceBonds(tpl);
  const rank = Math.min(3, bonds.length);
  if(!rank) return { rank:0, bonds:[], bondNames:'', name:'羁绊共鸣', desc:'出战随从参与的羁绊激活后解锁战斗共鸣。' };
  const role = tpl?.role || 'dps';
  const name = role === 'tank' ? '守护共鸣' : role === 'heal' ? '圣愈共鸣' : '夹击共鸣';
  const effect = role === 'tank'
    ? `为主角和随从施加护盾，强度按参与羁绊数提升。`
    : role === 'heal'
      ? `治疗主角并补上护盾，强度按参与羁绊数提升。`
      : `对当前目标追加一次夹击伤害，伤害有最大生命上限。`;
  const challenge = `敌方警觉:怪物生命+${Math.round(rank * 1.5)}%，攻击+${Math.round(rank * 1.2)}%。`;
  return { rank, bonds, bondNames:bonds.map(b=>b.name).join('、'), name, desc:`${effect} 冷却60秒。${challenge}` };
}
function companionResonanceChallengeMult(){
  const comp = getActiveCompanion();
  const tpl = comp && COMPANIONS.find(c=>c.key===comp.key);
  const rank = companionResonanceInfo(tpl).rank || 0;
  return rank > 0 ? { rank, hp:1 + rank * 0.015, atk:1 + rank * 0.012 } : { rank:0, hp:1, atk:1 };
}
function companionCombatPressureMult(){
  const comp = getActiveCompanion();
  const tpl = comp && COMPANIONS.find(c=>c.key===comp.key);
  const supportCount = companionSupportEntries().length;
  if(!tpl && !supportCount) return { rank:0, hp:1, atk:1, name:'' };
  const rank = tpl ? (companionResonanceInfo(tpl).rank || 0) : 0;
  const special = tpl && companionCombatSpecialDesc(tpl.key) ? 1 : 0;
  const unique = tpl && companionUniqueTrait(tpl) ? 1 : 0;
  const extraSkills = tpl && Array.isArray(tpl.skills) ? tpl.skills.filter(s => s && s._extraSkill).length : 0;
  const legendSkills = tpl && Array.isArray(tpl.skills) ? tpl.skills.filter(s => s && s._legendSkill).length : 0;
  const coverageSkills = tpl && Array.isArray(tpl.skills) ? tpl.skills.filter(s => s && s._coverageSkill).length : 0;
  const awaken = companionIsAwakened(comp) ? 1 : 0;
  const awakenedSupport = companionSupportEntries().filter(entry => companionIsAwakened(entry.comp)).length;
  const supportPressure = supportCount * 0.004;
  return {
    rank,
    hp:1.012 + rank * 0.015 + special * 0.006 + unique * 0.004 + extraSkills * 0.006 + legendSkills * 0.012 + coverageSkills * 0.004 + awaken * 0.022 + awakenedSupport * 0.008 + supportPressure,
    atk:1.010 + rank * 0.012 + special * 0.005 + unique * 0.003 + extraSkills * 0.004 + legendSkills * 0.008 + coverageSkills * 0.003 + awaken * 0.016 + awakenedSupport * 0.006 + supportPressure * 0.8,
    name:rank > 0 ? '羁绊警觉' : (supportCount ? '战团压迫' : '战友压迫')
  };
}
function applyCompanionChallengeScaling(mon){
  if(!mon || mon._companionChallengeApplied) return;
  const ch = companionCombatPressureMult();
  if(ch.hp === 1 && ch.atk === 1) return;
  mon.hpMax = Math.max(1, Math.floor(mon.hpMax * ch.hp));
  mon.hp = Math.max(1, Math.floor((mon.hp || mon.hpMax) * ch.hp));
  mon.atk = Math.max(1, Math.floor(mon.atk * ch.atk));
  mon._companionChallengeApplied = true;
  mon._companionChallengeRank = ch.rank;
  mon._companionChallengeName = ch.name;
}
function applyCompanionChallengeScalingToCurrent(){
  if(!Array.isArray(state.currentMonsters)) return;
  for(const mon of state.currentMonsters) applyCompanionChallengeScaling(mon);
}
const COMPANION_MISSION_TYPES = [
  { key:'frontline', name:'前线护送', icon:'🛡️', role:'tank', trait:'support', minutes:18, desc:'护送补给穿过交战区。坦克和护盾型随从更容易拿到额外奖励。', reward:{ gold:220, honor:18, shards:1 } },
  { key:'recon', name:'荒野侦察', icon:'🏹', role:'dps', trait:'control', minutes:16, desc:'侦察地图、标记稀有怪和伏击点。输出、控制和高星随从会提高完成度。', reward:{ gold:180, essence:5, shards:1 } },
  { key:'triage', name:'战地救护', icon:'💚', role:'heal', trait:'heal', minutes:20, desc:'救治受伤冒险者并回收可用物资。辅助和治疗随从更擅长这类任务。', reward:{ essence:7, honor:12, shards:1 } },
  { key:'artifact', name:'遗物回收', icon:'💎', role:'dps', trait:'summon', minutes:28, desc:'深入遗迹回收可用魔法残片。召唤型随从能分摊风险并提高额外随从券概率。', reward:{ gold:260, essence:8, shards:2, ticketChance:0.18 } },
  { key:'command', name:'指挥桌战役', icon:'📜', role:'tank', trait:'control', minutes:36, desc:'模拟职业大厅指挥桌的长线任务。高品质随从会显著提高奖励倍率。', reward:{ gold:420, honor:28, essence:10, shards:2, ticketChance:0.28 } },
];
function ensureCompanionMissionState(){
  if(!state.companionMissions || typeof state.companionMissions !== 'object') state.companionMissions = {active:[], totalCompleted:0, history:[]};
  if(!Array.isArray(state.companionMissions.active)) state.companionMissions.active = [];
  if(!Array.isArray(state.companionMissions.history)) state.companionMissions.history = [];
  state.companionMissions.active = state.companionMissions.active.filter(m => m && m.id && m.compKey && m.key);
  return state.companionMissions;
}
function companionMissionSlots(){
  const owned = (state.companions || []).length;
  if(owned < 2) return 1;
  return Math.min(4, 1 + Math.floor(owned / 8));
}
function companionMissionType(key){
  return COMPANION_MISSION_TYPES.find(m => m.key === key) || COMPANION_MISSION_TYPES[0];
}
function companionMissionTraitFlags(tpl){
  return typeof companionTraitFlags === 'function' ? companionTraitFlags(tpl) : {summon:false, heal:false, support:false, control:false};
}
function companionMissionCompEntry(compKey){
  const comp = (state.companions || []).find(c => c.key === compKey);
  const tpl = comp && COMPANIONS.find(t => t.key === comp.key);
  return comp && tpl ? {comp, tpl} : null;
}
function companionMissionBusyKeys(){
  const ms = ensureCompanionMissionState();
  return new Set(ms.active.map(m => m.compKey));
}
function companionMissionAvailableEntries(){
  const activeKey = getActiveCompanion()?.key;
  const busy = companionMissionBusyKeys();
  return (state.companions || []).map(comp => {
    const tpl = COMPANIONS.find(t => t.key === comp.key);
    return tpl ? {comp, tpl} : null;
  }).filter(Boolean).filter(e => e.comp.key !== activeKey && !busy.has(e.comp.key));
}
function companionMissionScore(tpl, comp, mission){
  const q = compQuality(tpl);
  const qScore = ({white:4, green:10, blue:18, purple:28, orange:40})[q.key] || 4;
  const stars = Math.max(1, comp?.stars || 1);
  const roleScore = tpl.role === mission.role ? 18 : 0;
  const traits = companionMissionTraitFlags(tpl);
  const traitScore = traits[mission.trait] ? 14 : 0;
  const skillScore = Math.min(16, ((tpl.skills || []).length + (tpl.signature ? 1 : 0)) * 3);
  return Math.max(15, Math.min(100, 28 + qScore + stars * 7 + roleScore + traitScore + skillScore));
}
function companionMissionReward(mission, tpl, comp, score, success){
  const q = compQuality(tpl);
  const lvl = Math.max(1, state.hero?.lvl || 1);
  const stars = Math.max(1, comp?.stars || 1);
  const qMult = ({white:0.85, green:1, blue:1.18, purple:1.42, orange:1.75})[q.key] || 1;
  const scoreMult = 0.75 + Math.min(100, score) / 160 + (success ? 0.22 : 0);
  const starMult = 1 + (stars - 1) * 0.08;
  const mult = qMult * scoreMult * starMult;
  const r = mission.reward || {};
  const out = {};
  if(r.gold) out.gold = Math.max(1, Math.floor((r.gold + lvl * 18) * mult));
  if(r.essence) out.essence = Math.max(1, Math.floor((r.essence + lvl * 0.14) * mult));
  if(r.honor) out.honor = Math.max(1, Math.floor((r.honor + lvl * 0.18) * mult));
  if(r.shards) out.shards = Math.max(1, Math.floor(r.shards + (success ? 1 : 0) + (stars >= 5 ? 1 : 0)));
  const roll = companionMissionRoll(`${mission.key}:${comp.key}:${stars}:${state.companionMissions?.totalCompleted || 0}`);
  if(r.ticketChance && roll < r.ticketChance + (success ? 0.08 : 0) + (q.key === 'orange' ? 0.05 : 0)) out.compTickets = 1;
  return out;
}
function companionMissionRoll(seedText){
  let h = 2166136261;
  const s = String(seedText || '');
  for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}
function companionMissionRewardText(reward, qualityName){
  const bits = [];
  if(reward.gold) bits.push(`金币 ${reward.gold}`);
  if(reward.essence) bits.push(`精华 ${reward.essence}`);
  if(reward.honor) bits.push(`荣誉 ${reward.honor}`);
  if(reward.shards) bits.push(`${qualityName || '品质'}通用碎片×${reward.shards}`);
  if(reward.compTickets) bits.push(`随从券×${reward.compTickets}`);
  return bits.join(' · ') || '少量资源';
}
function startCompanionMission(compKey, missionKey){
  const ms = ensureCompanionMissionState();
  if(ms.active.length >= companionMissionSlots()) return log('🐾 派遣栏位已满','bad');
  const entry = companionMissionCompEntry(compKey);
  if(!entry) return log('🐾 找不到这个随从','bad');
  if(getActiveCompanion()?.key === compKey) return log('🐾 出战随从不能派遣','bad');
  if(companionMissionBusyKeys().has(compKey)) return log('🐾 该随从已经在执行任务','bad');
  const mission = companionMissionType(missionKey);
  const now = Date.now();
  const score = companionMissionScore(entry.tpl, entry.comp, mission);
  const id = `${mission.key}:${compKey}:${now}`;
  ms.active.push({ id, key:mission.key, compKey, startAt:now, endAt:now + mission.minutes * 60000, score });
  markDirty('companion');
  if(typeof saveState === 'function') saveState();
  log(`🐾 ${entry.tpl.name} 开始执行「${mission.name}」(${mission.minutes}分钟)`,'good');
}
function claimCompanionMission(id){
  const ms = ensureCompanionMissionState();
  const idx = ms.active.findIndex(m => m.id === id);
  if(idx < 0) return log('🐾 找不到派遣任务','bad');
  const run = ms.active[idx];
  const now = Date.now();
  if((run.endAt || 0) > now) return log('🐾 派遣任务还没有完成','bad');
  const entry = companionMissionCompEntry(run.compKey);
  const mission = companionMissionType(run.key);
  if(!entry){ ms.active.splice(idx, 1); markDirty('companion'); return log('🐾 派遣随从已失效,任务已清理','bad'); }
  const score = Math.max(1, run.score || companionMissionScore(entry.tpl, entry.comp, mission));
  const success = companionMissionRoll(run.id) <= Math.min(0.98, score / 100);
  const reward = companionMissionReward(mission, entry.tpl, entry.comp, score, success);
  const q = compQuality(entry.tpl);
  state.gold = (state.gold || 0) + (reward.gold || 0);
  state.essence = (state.essence || 0) + (reward.essence || 0);
  state.honor = (state.honor || 0) + (reward.honor || 0);
  state.compTickets = (state.compTickets || 0) + (reward.compTickets || 0);
  if(reward.shards){
    if(!state.compUniversalShards) state.compUniversalShards = {white:0,green:0,blue:0,purple:0,orange:0};
    state.compUniversalShards[q.key] = (state.compUniversalShards[q.key] || 0) + reward.shards;
  }
  ms.active.splice(idx, 1);
  ms.totalCompleted = (ms.totalCompleted || 0) + 1;
  ms.history.unshift({
    t:now,
    name:mission.name,
    key:mission.key,
    comp:entry.tpl.name,
    compKey:entry.comp.key,
    quality:q.name,
    qualityKey:q.key,
    stars:entry.comp.stars || 1,
    score:Math.round(score),
    durationMin:Math.max(1, Math.round(((run.endAt || now) - (run.startAt || now)) / 60000)),
    success,
    reward
  });
  ms.history = ms.history.slice(0, 8);
  log(`🐾 ${entry.tpl.name} 完成「${mission.name}」${success?'大成功':'完成'}: ${companionMissionRewardText(reward, q.name)}`,'good');
  recomputeStats();
  markDirty('companion','hero','shop');
  if(typeof saveState === 'function') saveState();
}
function claimAllCompanionMissions(){
  const ms = ensureCompanionMissionState();
  const now = Date.now();
  const readyIds = (ms.active || []).filter(run => (run.endAt || 0) <= now).map(run => run.id);
  if(!readyIds.length) return log('🐾 暂无可领取的派遣战报','bad');
  for(const id of readyIds) claimCompanionMission(id);
  log(`🐾 已领取 ${readyIds.length} 份派遣战报`,'good');
}
let _nextCompanionMissionDirtyAt = 0;
function tickCompanionMissions(now){
  const ms = ensureCompanionMissionState();
  if(!ms.active.length) return;
  const nextEnd = Math.min(...ms.active.map(m => m.endAt || Infinity));
  if(nextEnd <= now && now >= _nextCompanionMissionDirtyAt){
    _nextCompanionMissionDirtyAt = now + 30000;
    markDirty('companion');
  }
}
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
function companionIntentState(st, tpl, mon, now){
  if(!st || !tpl) return { key:'idle', label:'待命', icon:'…', desc:'暂无出战随从' };
  const heroFrac = state.hp / Math.max(1, state.hero.hpMax || 1);
  const compFrac = (state._compHp || 0) / Math.max(1, st.hpMax || 1);
  if(compDowned()) return { key:'down', label:'倒下', icon:'💫', desc:'等待复活后继续参战' };
  if(tpl.role === 'heal' && (heroFrac < 0.62 || compFrac < 0.55)) return { key:'rescue', label:'救场', icon:'💚', desc:'优先治疗、护盾或净化' };
  if(tpl.role === 'tank' && (heroFrac < 0.70 || compFrac < 0.72 || companionTacticKey() === 'guard')) return { key:'guard', label:'护卫', icon:'🛡️', desc:'提高吸仇恨并准备替主角承伤' };
  if(mon && mon.hp > 0 && mon.hp <= mon.hpMax * 0.35) return { key:'execute', label:'终结', icon:'⚔️', desc:'优先斩杀与爆发技能' };
  if(mon && ((mon.slowUntil||0)>now || (mon.sunderUntil||0)>now || getMonsterDotCount(mon, now)>0 || monsterStateCount(mon, now)>0)) return { key:'exploit', label:'追击', icon:'🎯', desc:'利用减速、破甲、持续伤害或标记追击' };
  const ready = (st.skills || []).filter((sk, i) => (compSkillCd[i] || 0) <= now).sort((a,b)=>companionSkillPriority(b,st,mon,now)-companionSkillPriority(a,st,mon,now))[0];
  if(ready) return { key:'ready', label:ready.name || '技能', icon:ready.icon || '✨', desc:companionSkillTarget(ready)==='hero'?'准备支援主角':'准备释放随从技能' };
  return { key:'attack', label:'压制', icon:tpl.emoji || '🐾', desc:'普攻压制当前目标' };
}
function companionIntentUiState(now){
  const comp = getActiveCompanion();
  const tpl = comp && COMPANIONS.find(c=>c.key===comp.key);
  const st = computeCompanionStats();
  const mon = state.currentMonsters && state.currentMonsters[0];
  const intent = companionIntentState(st, tpl, mon, now || Date.now());
  return Object.assign({}, intent, { target:mon?.name || '', tactic:companionTacticMeta().label || '均衡' });
}
function companionCoordinateLeftMs(now){ return Math.max(0, (state._compCoordinateUntil || 0) - (now || Date.now())); }
function companionCoordinateUiState(now){
  const left = companionCoordinateLeftMs(now || Date.now());
  return { icon:'🤝', name:'协同追击', leftMs:left, ready:left<=0, cdMs:COMPANION_COORDINATE_CD_MS, desc:'主角造成关键命中、暴击、控制或标记时，随从按定位追加一次追击、护盾或治疗。' };
}
function companionCoordinateTrigger(mon, dmgDone, opts){
  const now = opts?.now || Date.now();
  if(!mon || mon.hp <= 0 || !(dmgDone > 0) || companionCoordinateLeftMs(now) > 0 || !companionTargetable()) return false;
  const comp = getActiveCompanion(); const tpl = comp && COMPANIONS.find(c=>c.key===comp.key); const st = computeCompanionStats();
  if(!tpl || !st) return false;
  const meaningful = !!(opts?.crit || opts?.skill || opts?.state || opts?.control || mon.hp <= mon.hpMax * 0.38 || getMonsterDotCount(mon, now)>0 || (mon.sunderUntil||0)>now || (mon.slowUntil||0)>now || monsterStateCount(mon, now)>0);
  if(!meaningful && Math.random() > 0.32) return false;
  let fired = false;
  let label = '协同追击';
  if(tpl.role === 'heal'){
    const danger = state.hp < state.hero.hpMax * 0.82;
    const heal = Math.floor(state.hero.hpMax * (danger ? 0.045 : 0.026) * companionTacticHealMult());
    const hr = healHeroAmount(heal, '🤝', '#6ee7b7', 'comp', label);
    if(danger) addTalentShield(Math.floor(state.hero.hpMax * 0.024 * companionTacticShieldMult()), true, 9000);
    fired = hr.applied > 0 || danger;
  }else if(tpl.role === 'tank'){
    const shield = Math.floor(state.hero.hpMax * 0.032 * companionTacticShieldMult());
    addTalentShield(shield, false, 9000);
    state._compGuardUntil = Math.max(state._compGuardUntil || 0, now + 4500);
    fired = shield > 0;
  }else{
    const bonus = (opts?.crit ? 0.34 : 0.22) + (mon.hp <= mon.hpMax * 0.35 ? 0.16 : 0);
    const raw = st.atk * (1.00 + bonus) * companionTacticDmgMult();
    const dd = calcDmg(raw, monArmor(mon), st.crit + (opts?.crit ? 8 : 0), st.critd + 12, false, mon.lvl, state.hero.lvl, { tightVar:true });
    const cap = Math.max(1, Math.floor(mon.hpMax * (mon.isBoss ? 0.045 : 0.075)));
    const dealt = absorbMonsterBarrier(mon, Math.min(dd.dmg, cap), '🤝').remaining;
    if(dealt > 0){ mon.hp -= dealt; trackDmg('comp', dealt, dd.crit, label); showMonsterFloat(mon, '🤝-' + dealt, '#7dd3fc', allySideFloatOpts({ variant:dd.crit?'crit':'comp', scale:dd.crit?1.12:1.05, important:true })); fired = true; }
  }
  if(!fired) return false;
  state._compCoordinateUntil = now + COMPANION_COORDINATE_CD_MS;
  state._compCoordinateLastAt = now;
  log(`${tpl.emoji || '🐾'} ${tpl.name} 响应你的攻击，触发${label}`,'good');
  markDirty('stage','companion','hero');
  return true;
}
function companionSkillPriority(sk, st, mon, now){
  const heroFrac = state.hp / Math.max(1, state.hero.hpMax || 1);
  const compFrac = (state._compHp || 0) / Math.max(1, st.hpMax || 1);
  const targetMode = companionSkillTarget(sk);
  const comp = getActiveCompanion();
  const summonSkill = sk.type === 'summon' || sk.summonCount;
  let score = 0;
  if(summonSkill){
    const ownerId = comp ? `comp:${comp.key}` : 'companion';
    if(!canSummonAllies(sk, ownerId, now)) return -999;
    score = 132 + (sk.summonCount || 1) * 20;
    if(mon?.isBoss) score += 18;
    if(st.role === 'dps') score += 8;
    if(st.role === 'tank') score += 12;
    if(sk.healPct || sk.shieldPct || sk.buff) score += 20;
    if(companionTacticKey() === 'assault') score += 12;
    if(companionTacticKey() === 'support' && (sk.healPct || sk.shieldPct || sk.buff)) score += 18;
    return score;
  }
  if(sk.type === 'heal'){
    const targetFrac = targetMode === 'companion' ? compFrac : targetMode === 'hero' ? heroFrac : Math.min(heroFrac, compFrac);
    score = 180 + (1 - targetFrac) * 200 + ((sk.heal || 0) + (sk.healPct || 0)) * 120 + (sk.cleanse ? 26 : 0) + (sk.shieldPct ? 18 : 0);
    if(targetFrac > 0.92) score -= 90;
    if(st.role === 'heal') score += 25;
    if(companionTacticKey() === 'support') score += 42;
    if(companionTacticKey() === 'guard' && targetMode !== 'hero') score += 20;
    if(companionTacticKey() === 'assault' && targetFrac > 0.55) score -= 36;
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
    if(companionTacticKey() === 'support') score += 34;
    if(companionTacticKey() === 'guard' && !targetHero) score += 24;
    if(companionTacticKey() === 'assault' && !(sk.buff && (sk.buff === 'battleShout' || sk.buff === 'bestial' || sk.buff === 'shadowstep'))) score -= 20;
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
  if(companionTacticKey() === 'assault') score += 36;
  if(companionTacticKey() === 'guard' && (sk.stun || sk.slow || sk.debuff === 'sunder' || /破甲/.test(sk.name || ''))) score += 12;
  if(companionTacticKey() === 'support') score -= 18;
  if(st.role === 'tank' && (sk.stun || sk.slow || sk.debuff === 'sunder')) score += 18;
  if(st.role === 'dps' && mon && mon.hp > 0 && mon.hp <= mon.hpMax * 0.38) score += 22;
  if(st.role === 'heal' && (sk.heal || sk.healPct || sk.shieldPct)) score += 10;
  return score;
}
function companionReactionDesc(key){
  const k = key || companionTacticKey();
  if(k === 'assault') return '敌人生命低于40%或首领生命低于55%时，随从追加一次高倍率压制伤害。';
  if(k === 'guard') return '主角或随从生命危险时，随从为双方施加护盾，主角护盾持续12秒。';
  if(k === 'support') return '主角生命低于60%或有减益时，随从立即治疗主角并优先净化1个减益。';
  return '主角或随从低血量时，随从进行一次小额治疗和护盾支援。';
}
function companionReactionTrigger(now, st, tpl, mon){
  if(!st || !tpl || !mon || mon.hp <= 0 || companionReactionLeftMs(now) > 0) return false;
  const key = companionTacticKey();
  const meta = companionTacticMeta(key);
  const heroMax = Math.max(1, state.hero.hpMax || 1);
  const heroFrac = state.hp / heroMax;
  const compMax = Math.max(1, st.hpMax || 1);
  const compFrac = (state._compHp || 0) / compMax;
  let fired = false;
  const name = meta.reaction || '战友反应';
  const icon = meta.icon || tpl.emoji || '🐾';
  if(key === 'assault'){
    const executeLine = mon.isBoss ? 0.55 : 0.40;
    if(mon.hp <= mon.hpMax * executeLine){
      const raw = st.atk * (mon.isBoss ? 2.2 : 2.55) * companionTacticDmgMult();
      const dd = calcDmg(raw, monArmor(mon), st.crit + 10, st.critd + 20, mon.hp <= mon.hpMax * 0.22, mon.lvl, state.hero.lvl, { tightVar:true });
      const capPct = mon.hp <= mon.hpMax * 0.22 ? (mon.isBoss ? 0.12 : 0.20) : (mon.isBoss ? 0.08 : 0.14);
      const capped = Math.min(dd.dmg, Math.max(1, Math.floor(mon.hpMax * capPct)));
      const dealt = absorbMonsterBarrier(mon, capped, icon).remaining;
      if(dealt > 0){
        mon.hp -= dealt;
        trackDmg('comp', dealt, dd.crit, name);
        showMonsterFloat(mon, icon + '-' + dealt, '#fbbf24', allySideFloatOpts({ variant:dd.crit ? 'crit' : 'comp', scale:dd.crit ? 1.16 : 1.08, important:true }));
        fired = true;
      }
    }
  }else if(key === 'guard'){
    if(heroFrac <= 0.50 || compFrac <= 0.46){
      const heroShield = Math.floor(heroMax * 0.065 * companionTacticShieldMult());
      const compShield = Math.floor(compMax * 0.10 * companionTacticShieldMult());
      if(heroShield > 0) addTalentShield(heroShield, false, 12000);
      if(compShield > 0) addCompanionBarrier(compShield, icon, '#93c5fd');
      fired = heroShield > 0 || compShield > 0;
    }
  }else if(key === 'support'){
    const hasDebuff = !!(state.heroDebuffs && Object.values(state.heroDebuffs).some(d => d && d.expire > now));
    if(heroFrac <= 0.60 || hasDebuff){
      const amount = Math.floor(heroMax * 0.075 * companionTacticHealMult());
      const hr = healHeroAmount(amount, icon, '#6ee7b7', 'comp', name);
      const cleansed = hasDebuff && clearDebuffGroup('hero');
      fired = (hr.applied > 0) || cleansed;
      if(cleansed) showFloat($('hero-emoji'), icon + '净化', '#93c5fd', { variant:'heal', scale:1.04 });
    }
  }else if(heroFrac <= 0.42 || compFrac <= 0.42){
    let applied = 0;
    if(heroFrac <= compFrac){
      applied += healHeroAmount(Math.floor(heroMax * 0.035), icon, '#6ee7b7', 'comp', name).applied;
      applied += addTalentShield(Math.floor(heroMax * 0.035), false, 10000);
    }else{
      applied += healCompanionAmount(Math.floor(compMax * 0.045), icon, '#6ee7b7', 'comp', name).applied;
      applied += addCompanionBarrier(Math.floor(compMax * 0.045), icon, '#93c5fd');
    }
    fired = applied > 0;
  }
  if(!fired) return false;
  state._compReactionUntil = now + COMPANION_REACTION_CD_MS;
  state._compReactionLastAt = now;
  state._compReactionName = name;
  log(`${tpl.emoji || icon} ${tpl.name} 触发战友反应「${name}」`,'good');
  markDirty('stage','companion','hero');
  return true;
}
function companionResonanceTrigger(now, st, tpl, mon){
  if(!st || !tpl || !mon || mon.hp <= 0 || companionResonanceLeftMs(now) > 0) return false;
  const info = companionResonanceInfo(tpl);
  const rank = info.rank || 0;
  if(rank <= 0) return false;
  const role = tpl.role || 'dps';
  let fired = false;
  if(role === 'tank'){
    const heroShield = Math.floor((state.hero.hpMax || 1) * (0.026 + rank * 0.012) * companionTacticShieldMult());
    const compShield = Math.floor((st.hpMax || 1) * (0.040 + rank * 0.015) * companionTacticShieldMult());
    if(heroShield > 0) addTalentShield(heroShield, false, 12000);
    if(compShield > 0) addCompanionBarrier(compShield, '⚜️', '#fcd34d');
    fired = heroShield > 0 || compShield > 0;
  }else if(role === 'heal'){
    const heal = Math.floor((state.hero.hpMax || 1) * (0.030 + rank * 0.012) * companionTacticHealMult());
    const shield = Math.floor((state.hero.hpMax || 1) * (0.018 + rank * 0.008) * companionTacticShieldMult());
    const hr = healHeroAmount(heal, '⚜️', '#6ee7b7', 'comp', info.name);
    if(shield > 0) addTalentShield(shield, true, 10000);
    fired = hr.applied > 0 || shield > 0;
  }else{
    const raw = st.atk * (1.20 + rank * 0.32) * companionTacticDmgMult();
    const dd = calcDmg(raw, monArmor(mon), st.crit + rank * 4, st.critd + rank * 8, false, mon.lvl, state.hero.lvl, { tightVar:true });
    const capPct = (mon.isBoss ? 0.026 : 0.040) + rank * (mon.isBoss ? 0.012 : 0.016);
    const capped = Math.min(dd.dmg, Math.max(1, Math.floor(mon.hpMax * capPct)));
    const dealt = absorbMonsterBarrier(mon, capped, '⚜️').remaining;
    if(dealt > 0){
      mon.hp -= dealt;
      trackDmg('comp', dealt, dd.crit, info.name);
      showMonsterFloat(mon, '⚜️-' + dealt, '#fcd34d', allySideFloatOpts({ variant:dd.crit ? 'crit' : 'comp', scale:dd.crit ? 1.14 : 1.06, important:true }));
      fired = true;
    }
  }
  if(!fired) return false;
  state._compResonanceUntil = now + COMPANION_RESONANCE_CD_MS;
  state._compResonanceLastAt = now;
  state._compResonanceName = info.name;
  log(`⚜️ ${tpl.name} 触发${info.name}: ${info.bondNames}`,'good');
  markDirty('stage','companion','hero');
  return true;
}
function companionCombatSpecialDesc(key){
  const spec = companionCombatSpecial(key);
  return spec ? `${spec.name}:${spec.desc}` : '';
}
function companionCombatSpecialUiState(now){
  const comp = getActiveCompanion();
  const tpl = comp && COMPANIONS.find(c=>c.key===comp.key);
  if(!tpl) return null;
  const spec = companionCombatSpecial(tpl.key);
  if(!spec) return null;
  const until = (state._compSpecialCd && state._compSpecialCd[tpl.key]) || 0;
  return { icon:spec.icon || '🌟', name:spec.name || '专属战斗', desc:companionCombatSpecialDesc(tpl.key), leftMs:Math.max(0, until - (now || Date.now())), ready:until <= (now || Date.now()), recent:(state._compSpecialLastAt || 0) > (now || Date.now()) - 1800 };
}
function companionSpecialReady(key, now, cdMs){
  if(!state._compSpecialCd) state._compSpecialCd = {};
  if((state._compSpecialCd[key] || 0) > now) return false;
  state._compSpecialCd[key] = now + cdMs;
  state._compSpecialLastAt = now;
  return true;
}
function companionSpecialCooldownMs(tpl, comp, support){
  const spec = companionCombatSpecial(tpl?.key);
  if(!spec) return 999999;
  const veteran = companionVeteranInfo(tpl, comp);
  const mult = (veteran?.cdMult || 1) * companionUniqueCooldownMult(tpl, support) * (support ? 1.25 : 1);
  return Math.max(10000, Math.floor((spec.cd || 30000) * mult));
}
function companionSpecialShouldTrigger(spec, tpl, mon, now, support){
  if(!spec || !tpl || !mon || mon.hp <= 0) return false;
  const heroFrac = state.hp / Math.max(1, state.hero.hpMax || 1);
  const targetLow = mon.hp <= mon.hpMax * 0.35;
  const hasDebuff = !!(state.heroDebuffs && Object.values(state.heroDebuffs).some(d => d && d.expire > now));
  const multi = (state.currentMonsters || []).filter(x => x && x.hp > 0).length >= 2;
  if(spec.type === 'guard') return heroFrac < (support ? 0.66 : 0.74) || mon.isBoss || companionTacticKey() === 'guard';
  if(spec.type === 'barrier') return heroFrac < 0.82 || hasDebuff || mon.isBoss;
  if(spec.type === 'rescue') return heroFrac < (tpl.key === 'anduin' ? 0.34 : 0.54) || hasDebuff;
  if(spec.type === 'cleanse') return hasDebuff || heroFrac < 0.76;
  if(spec.type === 'execute') return targetLow || mon.isBoss || monsterStateCount(mon, now) > 0 || getMonsterDotCount(mon, now) > 0;
  if(spec.type === 'mark') return mon.isBoss || targetLow || !monsterStateActive(mon, `compMark:${tpl.key}`);
  if(spec.type === 'control') return mon.isBoss || !(mon.stunUntil > now) || !(mon.slowUntil > now);
  if(spec.type === 'aoe') return multi || mon.isBoss;
  if(spec.type === 'dot') return mon.isBoss || targetLow || getMonsterDotCount(mon, now) < 2;
  if(spec.type === 'summon') return multi || mon.isBoss || targetLow;
  if(spec.type === 'tempo') return mon.isBoss || companionCoordinateLeftMs(now) > 2500 || targetLow;
  return mon.isBoss || targetLow;
}
function dealCompanionSpecialDamage(mon, st, tpl, spec, now, mult, capPct, opts){
  if(!mon || !st || !spec) return 0;
  const dd = calcDmg(st.atk * (mult || 1) * companionTacticDmgMult(), monArmor(mon), st.crit + (opts?.critAdd || 0), st.critd + (opts?.critdAdd || 0), !!opts?.forceCrit, mon.lvl, state.hero.lvl, { tightVar:true });
  const cap = Math.max(1, Math.floor(mon.hpMax * (capPct || (mon.isBoss ? 0.05 : 0.08))));
  const dealt = absorbMonsterBarrier(mon, Math.min(dd.dmg, cap), spec.icon || tpl.emoji || '🌟').remaining;
  if(dealt > 0){
    mon.hp -= dealt;
    trackDmg('comp', dealt, dd.crit, spec.name);
    showMonsterFloat(mon, (spec.icon || tpl.emoji || '🌟') + '-' + dealt, opts?.color || '#fbbf24', allySideFloatOpts({ variant:dd.crit ? 'crit' : 'comp', scale:dd.crit ? 1.14 : 1.06, important:true }));
  }
  return dealt;
}
function applyCompanionCombatSpecialEffect(now, st, tpl, comp, mon, ctx){
  const spec = companionCombatSpecial(tpl?.key);
  if(!spec || !companionSpecialShouldTrigger(spec, tpl, mon, now, !!ctx?.support)) return false;
  const cdKey = ctx?.support ? `support:${ctx.slot}:${tpl.key}` : tpl.key;
  const cdMs = companionSpecialCooldownMs(tpl, comp, !!ctx?.support);
  if(!companionSpecialReady(cdKey, now, cdMs)) return false;
  const power = (ctx?.power || 1) * companionUniqueSpecialPower(tpl, !!ctx?.support) * (ctx?.support ? COMPANION_SUPPORT_POWER : 1) * (companionVeteranInfo(tpl, comp)?.supportMult && ctx?.support ? companionVeteranInfo(tpl, comp).supportMult : 1);
  const healPower = companionUniqueHealMult(tpl);
  const shieldPower = companionUniqueShieldMult(tpl);
  const heroMax = Math.max(1, state.hero.hpMax || 1);
  const compMax = Math.max(1, st.hpMax || 1);
  const supportText = ctx?.support ? '支援' : '触发';
  let fired = false;
  if(spec.type === 'guard'){
    state._compGuardUntil = Math.max(state._compGuardUntil || 0, now + Math.floor(6000 * Math.max(0.65, power)));
    addTalentShield(Math.floor(heroMax * 0.050 * companionTacticShieldMult() * power * shieldPower), false, 12000);
    if(!ctx?.support) addCompanionBarrier(Math.floor(compMax * 0.080 * companionTacticShieldMult() * shieldPower), spec.icon, '#93c5fd');
    mon.sunderUntil = Math.max(mon.sunderUntil || 0, now + 9000);
    fired = true;
  }else if(spec.type === 'barrier'){
    addTalentShield(Math.floor(heroMax * 0.070 * companionTacticShieldMult() * power * shieldPower), false, 12000);
    if(!ctx?.support) addCompanionBarrier(Math.floor(compMax * 0.060 * companionTacticShieldMult() * shieldPower), spec.icon, '#93c5fd');
    if(clearDebuffGroup('hero')) showFloat($('hero-emoji'), spec.icon + '净化', '#93c5fd', { variant:'heal', scale:1.04 });
    if(spec.tags?.includes('sunder')) mon.sunderUntil = Math.max(mon.sunderUntil || 0, now + 9000);
    fired = true;
  }else if(spec.type === 'rescue'){
    const pct = tpl.key === 'anduin' ? 0.22 : tpl.key === 'velen' ? 0.18 : tpl.key === 'alexstrasza' ? 0.20 : 0.12;
    const hr = healHeroAmount(Math.floor(heroMax * pct * companionTacticHealMult() * power * healPower), spec.icon, '#6ee7b7', 'comp', spec.name);
    addTalentShield(Math.floor(heroMax * (pct * 0.55) * companionTacticShieldMult() * power * shieldPower), false, 14000);
    clearDebuffGroup('hero');
    if(tpl.key === 'alexstrasza') dealCompanionSpecialDamage(mon, st, tpl, spec, now, 1.10 * power, mon.isBoss ? 0.030 : 0.055, { color:'#fb923c' });
    fired = hr.applied > 0 || true;
  }else if(spec.type === 'cleanse'){
    const hr = healHeroAmount(Math.floor(heroMax * 0.090 * companionTacticHealMult() * power * healPower), spec.icon, '#6ee7b7', 'comp', spec.name);
    const cleansed = clearDebuffGroup('hero');
    if(cleansed) showFloat($('hero-emoji'), spec.icon + '净化', '#93c5fd', { variant:'heal', scale:1.04 });
    if(spec.tags?.includes('summon') && typeof summonAlliedUnits === 'function'){
      summonAlliedUnits({ name:spec.name, icon:spec.icon, type:'summon', summonCount:1, summonCap:1, summonTheme:'beast', summonDuration:16000, summonPower:0.45 * power }, now, { id:`support:${tpl.key}`, source:'companion', name:tpl.name, icon:tpl.emoji, lvl:state.hero.lvl, atk:st.atk, def:st.def, hpMax:st.hpMax, crit:st.crit, critd:st.critd, quality:compQuality(tpl).key, stars:comp.stars || 1, summonSkillSlots:2 });
    }
    fired = hr.applied > 0 || cleansed;
  }else if(spec.type === 'execute'){
    const low = mon.hp <= mon.hpMax * 0.35;
    const dealt = dealCompanionSpecialDamage(mon, st, tpl, spec, now, (low ? 2.20 : 1.55) * power, mon.isBoss ? (low ? 0.075 : 0.050) : (low ? 0.130 : 0.085), { critAdd:12, critdAdd:24, forceCrit:low, color:'#fbbf24' });
    if(tpl.key === 'maiev' || tpl.key === 'horde_grunt') mon.stunUntil = Math.max(mon.stunUntil || 0, now + (mon.isBoss ? 600 : 1200));
    if(tpl.key === 'berserker' || tpl.key === 'grommash') state._compFrenzyUntil = Math.max(state._compFrenzyUntil || 0, now + 6000);
    fired = dealt > 0;
  }else if(spec.type === 'mark'){
    const markKey = `compMark:${tpl.key}`;
    applyMonsterState(mon, markKey, 9000);
    mon.sunderUntil = Math.max(mon.sunderUntil || 0, now + 9000);
    if(spec.tags?.includes('dot')) applyMonsterDot(mon, `comp-special:${tpl.key}`, Math.max(1, Math.floor(st.atk * 0.13 * power)), 7000, { icon:spec.icon, name:spec.name, source:tpl.name });
    const dealt = dealCompanionSpecialDamage(mon, st, tpl, spec, now, 1.10 * power, mon.isBoss ? 0.035 : 0.060, { critAdd:6, color:'#fde68a' });
    fired = dealt > 0 || true;
  }else if(spec.type === 'control'){
    const dealt = dealCompanionSpecialDamage(mon, st, tpl, spec, now, 1.45 * power, mon.isBoss ? 0.045 : 0.075, { critAdd:6, color:'#93c5fd' });
    mon.slowUntil = Math.max(mon.slowUntil || 0, now + 5000);
    mon.stunUntil = Math.max(mon.stunUntil || 0, now + (mon.isBoss ? 700 : 1400));
    if(spec.tags?.includes('sunder')) mon.sunderUntil = Math.max(mon.sunderUntil || 0, now + 9000);
    if(spec.tags?.includes('dot')) applyMonsterDot(mon, `comp-special:${tpl.key}`, Math.max(1, Math.floor(st.atk * 0.10 * power)), 7000, { icon:spec.icon, name:spec.name, source:tpl.name });
    fired = dealt > 0 || true;
  }else if(spec.type === 'aoe'){
    const dealt = dealCompanionSpecialDamage(mon, st, tpl, spec, now, 1.70 * power, mon.isBoss ? 0.055 : 0.085, { critAdd:8, color:'#fb923c' });
    if(dealt > 0) applyCompanionSplash(mon, dealt, 0.42, spec.icon, '#fca5a5');
    applyMonsterDot(mon, `comp-special:${tpl.key}`, Math.max(1, Math.floor(st.atk * 0.12 * power)), 7000, { icon:spec.icon, name:spec.name, source:tpl.name });
    if(spec.tags?.includes('stun')) mon.stunUntil = Math.max(mon.stunUntil || 0, now + (mon.isBoss ? 500 : 1200));
    fired = dealt > 0;
  }else if(spec.type === 'dot'){
    const dealt = dealCompanionSpecialDamage(mon, st, tpl, spec, now, 1.18 * power, mon.isBoss ? 0.040 : 0.065, { critAdd:4, color:'#c4b5fd' });
    applyMonsterDot(mon, `comp-special:${tpl.key}`, Math.max(1, Math.floor(st.atk * 0.22 * power)), 8000, { icon:spec.icon, name:spec.name, source:tpl.name });
    mon.slowUntil = Math.max(mon.slowUntil || 0, now + 4500);
    if(!ctx?.support && spec.tags?.includes('shield')) addCompanionBarrier(Math.floor(compMax * 0.055 * shieldPower), spec.icon, '#93c5fd');
    fired = dealt > 0 || true;
  }else if(spec.type === 'summon'){
    let summoned = 0;
    if(typeof summonAlliedUnits === 'function'){
      const theme = tpl.key === 'shaman_app' || tpl.key === 'rexxar' || tpl.key === 'rehgar' ? 'beast' : 'soldier';
      summoned = summonAlliedUnits({ name:spec.name, icon:spec.icon, type:'summon', summonCount:1, summonCap:ctx?.support ? 1 : 2, summonTheme:theme, summonDuration:20000, summonPower:0.62 * power, summonSkillSlow:true, summonSkillStateKey:`compMark:${tpl.key}`, summonSkillStateMs:7000 }, now, { id:`${ctx?.support ? 'support' : 'comp'}:${tpl.key}`, source:'companion', name:tpl.name, icon:tpl.emoji, lvl:state.hero.lvl, atk:st.atk, def:st.def, hpMax:st.hpMax, crit:st.crit, critd:st.critd, quality:compQuality(tpl).key, stars:comp.stars || 1, summonSkillSlots:2 });
    }
    mon.slowUntil = Math.max(mon.slowUntil || 0, now + 4000);
    fired = summoned > 0 || dealCompanionSpecialDamage(mon, st, tpl, spec, now, 1.0 * power, mon.isBoss ? 0.025 : 0.045, { color:'#7dd3fc' }) > 0;
  }else if(spec.type === 'tempo'){
    const reduce = ctx?.support ? 2500 : 6500;
    state._compCoordinateUntil = Math.max(0, (state._compCoordinateUntil || 0) - reduce);
    addTalentShield(Math.floor(heroMax * 0.040 * companionTacticShieldMult() * power * shieldPower), true, 10000);
    mon.slowUntil = Math.max(mon.slowUntil || 0, now + 3500);
    const dealt = dealCompanionSpecialDamage(mon, st, tpl, spec, now, 1.22 * power, mon.isBoss ? 0.035 : 0.055, { critAdd:8, color:'#67e8f9' });
    fired = dealt > 0 || true;
  }
  if(!fired) return false;
  state._compSpecialName = spec.name;
  if(ctx?.support){
    state._compSupportLastAt = now;
    state._compSupportName = spec.name;
  }
  log(`${spec.icon || tpl.emoji || '🐾'} ${tpl.name}${ctx?.support ? '支援' : '触发'}专属战斗「${spec.name}」`,'good');
  markDirty('stage','companion','hero');
  return true;
}
function companionCombatSpecialTick(now, st, tpl, mon){
  if(!st || !tpl || !mon || mon.hp <= 0 || compDowned()) return false;
  const comp = getActiveCompanion();
  return applyCompanionCombatSpecialEffect(now, st, tpl, comp, mon, { support:false, power:1 });
}
function tickCompanionSupport(now, mon){
  if(!mon || mon.hp <= 0) return false;
  let fired = false;
  for(const entry of companionSupportEntries()){
    const st = computeCompanionTemplateStats(entry.comp, entry.tpl, { support:true });
    if(!st) continue;
    fired = applyCompanionCombatSpecialEffect(now, st, entry.tpl, entry.comp, mon, { support:true, slot:entry.slot, power:1 }) || fired;
  }
  return fired;
}
/* 按定位的吸引仇恨概率:坦克多、治疗少、输出居中 */
function compAggroChance(){const comp=getActiveCompanion();if(!comp)return 0;const tpl=COMPANIONS.find(c=>c.key===comp.key);const role=tpl&&tpl.role;const base=role==='tank'?0.88:role==='heal'?0.15:0.20;return Math.max(0.05,Math.min(0.95,base+(tpl?.aggroBonus||0)+(companionTacticMeta().aggro||0))); }
/* 随从倒下:清血、进入10秒复活计时(2026-06-27:15→10,缩短无奶职业的暴露窗口) */
function downCompanion(now){
  state._compHp=0;state._compDownUntil=now+10000;
  const comp=getActiveCompanion();const tpl=comp&&COMPANIONS.find(c=>c.key===comp.key);
  showFloat($('comp-mini'),'💫倒下','#fde047');
  const e=$('comp-mini');if(e){e.classList.add('shake');setTimeout(()=>{const x=$('comp-mini');if(x)x.classList.remove('shake');},200);}
  log((tpl?tpl.name:'随从')+' 倒下了! 10秒后归来','bad');
}
function tickCompanion(now){const comp=getActiveCompanion();if(!comp)return;const st=computeCompanionStats();if(!st)return;const tpl=COMPANIONS.find(c=>c.key===comp.key);
  // 复活计时:倒地满15秒 → 以 50% 血归来
  if(!compDowned()&&(state._compDownUntil||0)>0){state._compDownUntil=0;state._compHp=Math.floor(st.hpMax*0.6);const tpl=COMPANIONS.find(c=>c.key===comp.key);showFloat($('comp-mini'),'✨归来','#6ee7b7');log((tpl?tpl.name:'随从')+' 重新投入战斗!','good');}
  // 缓慢回血:存活且未满,每秒回复 3% 最大生命(受减益影响;2026-06-27:2%→3% 支撑更高仇恨)
  if(!compDowned()&&(state._compHp||0)>0&&state._compHp<st.hpMax&&now-lastCompRegen>1000){lastCompRegen=now;state._compHp=Math.min(st.hpMax,state._compHp+Math.max(1,Math.ceil(st.hpMax*0.03*companionDebuffRegenMult())));}
  // DOT: 每秒结算随从身上的持续伤害
  const cbd=state._compDebuffs&&state._compDebuffs.burn;
  if(!compDowned()&&cbd&&cbd.expire>now){
    if(!state._compLastDotTick||now-state._compLastDotTick>1000){state._compLastDotTick=now;applyCompanionDamage(Math.max(1,cbd.dps||1),state.currentMonsters[0],{label:t=>'☠️-'+t,color:'#a3e635',now});}
  }
  if(compDowned())return;   // 阵亡期间不攻击/不施法/不奶
  if((state._compStunUntil||0)>now) return;
  const mon=state.currentMonsters[0];if(!mon)return;
  companionReactionTrigger(now, st, tpl, mon);
  companionCombatSpecialTick(now, st, tpl, mon);
  companionResonanceTrigger(now, st, tpl, mon);
  if(compSkillCd._owner!==comp.key)compSkillCd={_owner:comp.key};   // 换随从:重置技能冷却
  const interval=1000/(st.spd||0.5);if((state._compDisarmUntil||0)<=now&&(now-lastCompAtk>interval||now-lastCompAtk>5000)){let cm=state.currentMonsters[0];if(cm&&cm.hp>0){const cd=calcDmg(st.atk,monArmor(cm),st.crit,st.critd,false,cm.lvl,state.hero.lvl);const dealt=absorbMonsterBarrier(cm, cd.dmg, st.emoji).remaining;cm.hp-=dealt;if(dealt>0){trackDmg('comp',dealt,cd.crit,'普攻');showMonsterFloat(cm,st.emoji+'-'+dealt,'#a0d0ff',allySideFloatOpts({variant:cd.crit?'crit':'comp',scale:cd.crit?1.12:1}));}applyCompanionSignatureHit(companionSignature(tpl), st, cm, dealt, now);}lastCompAtk=now;
    // 技能:每个技能按自己的 cd 独立冷却,就绪即放(GCD 0.9秒,避免一次性全放;优先治疗>buff>伤害)
    if((state._compSilenceUntil||0)<=now&&now-lastCompSkill>COMPANION_SKILL_GCD_MS){
      const ready=[];for(let i=0;i<st.skills.length;i++){if((compSkillCd[i]||0)<=now)ready.push(i);}
      ready.sort((a,b)=>companionSkillPriority(st.skills[b],st,mon,now)-companionSkillPriority(st.skills[a],st,mon,now)||a-b);
      const i=ready[0];
      if(i!==undefined){const sk=st.skills[i];
        if(sk.type==='dmg'){
          const dmgMult = companionSkillDamageMult(sk, mon, now);
          const sd=calcDmg(st.atk*sk.mul*dmgMult*COMPANION_SKILL_DMG_BONUS,monArmor(mon),st.crit,st.critd,sk.alwaysCrit,mon.lvl,state.hero.lvl);const dealt=absorbMonsterBarrier(mon, sd.dmg, sk.icon || st.emoji).remaining;mon.hp-=dealt;if(dealt>0){trackDmg('comp',dealt,sd.crit,sk.name);showMonsterFloat(mon,st.emoji+sk.icon+'-'+dealt,'#c0a0ff',allySideFloatOpts({variant:sd.crit?'crit':'comp',scale:sd.crit?1.12:1,important:true}));}
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
            const targetMode = companionSkillTarget(sk);
            const healTarget = targetMode === 'hero' ? 'hero' : targetMode === 'companion' ? 'companion' : targetMode === 'both' ? 'both' : companionHealTarget();
            if(healTarget==='both'){
              healCompanionAmount(Math.floor(st.hpMax*sk.heal*COMPANION_HEAL_SCALE*companionTacticHealMult()),st.emoji,'#6ee7b7','comp',sk.name);
              healHeroAmount(Math.floor(state.hero.hpMax*sk.heal*COMPANION_HEAL_SCALE*companionTacticHealMult()), st.emoji, '#6ee7b7', 'comp', sk.name);
            } else if(healTarget==='companion'){
              const healAmt=Math.floor(st.hpMax*sk.heal*COMPANION_HEAL_SCALE*companionTacticHealMult());
              healCompanionAmount(healAmt,st.emoji,'#6ee7b7','comp',sk.name);
            } else {
              const healAmt=Math.floor(state.hero.hpMax*sk.heal*COMPANION_HEAL_SCALE*companionTacticHealMult());
              healHeroAmount(healAmt, st.emoji, '#6ee7b7', 'comp', sk.name);
            }
          }
          if(sk.lifeSteal) healCompanionAmount(Math.floor(dealt*sk.lifeSteal), '🩸', '#6ee7b7', 'comp', sk.name);
        }
        else if(sk.type==='heal'){
          const targetMode = companionSkillTarget(sk);
          const healTarget = targetMode === 'hero' ? 'hero' : targetMode === 'companion' ? 'companion' : targetMode === 'both' ? 'both' : companionHealTarget();
          if(healTarget==='both'){
            const ch=Math.floor(st.hpMax*sk.heal*COMPANION_HEAL_SCALE*companionTacticHealMult());
            const hh=Math.floor(state.hero.hpMax*sk.heal*COMPANION_HEAL_SCALE*companionTacticHealMult());
            const cr=healCompanionAmount(ch, st.emoji, '#6ee7b7', 'comp', sk.name);
            const hr=healHeroAmount(hh, st.emoji, '#6ee7b7', 'comp', sk.name);
            log(sk.name+'! 为主角和随从恢复 '+(hr.applied+cr.applied)+' 生命','good');
          }
          else if(healTarget==='companion'){
            const h=Math.floor(st.hpMax*sk.heal*COMPANION_HEAL_SCALE*companionTacticHealMult());
            const hr=healCompanionAmount(h, st.emoji, '#6ee7b7', 'comp', sk.name); log(sk.name+'! 为随从恢复 '+hr.applied+' 生命','good');
          }
          else {
            const h=Math.floor(state.hero.hpMax*sk.heal*COMPANION_HEAL_SCALE*companionTacticHealMult());
            const hr=healHeroAmount(h, st.emoji, '#6ee7b7', 'comp', sk.name);log(sk.name+'! +'+hr.applied+' 生命','good');
          }
          applyCompanionSupportSkill(sk, st, now);
        }
        else if(sk.type==='buff'){
          applyCompanionBuffAura(sk, now);
          applyCompanionSupportSkill(sk, st, now);
          log(sk.name+'!','good');
        }
        else if(sk.type==='summon' || sk.summonCount){
          const qualityKey = compQuality(tpl).key;
          const summonSkillSlots = Math.min(4, Math.max(2, ({ white:2, green:2, blue:3, purple:4, orange:4 }[qualityKey] || 2) + ((comp.stars || 1) >= 5 ? 1 : 0)));
          const summoned = summonAlliedUnits(sk, now, { id:`comp:${comp.key}`, source:'companion', name:tpl?.name || st.name, icon:tpl?.emoji || st.emoji, lvl:state.hero.lvl, atk:st.atk, def:st.def, hpMax:st.hpMax, crit:st.crit, critd:st.critd, quality:qualityKey, stars:comp.stars || 1, summonSkillSlots });
          if(sk.buff) applyCompanionBuffAura(sk, now);
          applyCompanionSupportSkill(sk, st, now);
          if(summoned > 0) log(sk.name+'! 召唤了 '+summoned+' 个单位助战','good');
        }
        compSkillCd[i]=now+companionEffectiveSkillCdMs(sk);lastCompSkill=now;
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
    if(ofQ.length && ofQ.every(t => { const c = ownedMap[t.key]; return c && (c.stars||1) >= 5 && companionIsAwakened(c); })){
      fullQuality.add(qk);
    }
  }
  const pool = COMPANIONS.filter(t => !fullQuality.has(compQuality(t).key));
  if(!pool.length) return log('🎰 所有品质随从均已满星并觉醒!','good');
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
  const q = compQuality(tpl);
  const need=companionUpgradeNeed(comp, q);
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
  return {type:'升星',need:companionUpgradeNeed(comp, q),have:(state.companionShards[comp.key]||0)+(state.compUniversalShards[q.key]||0),maxed:false};
}
function getCompanionAwakenCost(comp, tpl){
  if(!comp || !tpl) return null;
  const q = compQuality(tpl);
  const base = companionAwakenCostBase(q.key);
  if(!state.compUniversalShards) state.compUniversalShards = {white:0,green:0,blue:0,purple:0,orange:0};
  const cost = {
    type:'觉醒',
    quality:q,
    awakened:companionIsAwakened(comp),
    locked:(comp.stars || 1) < 5,
    needShards:base.shards,
    haveShards:state.compUniversalShards[q.key] || 0,
    gold:base.gold || 0,
    essence:base.essence || 0,
    gem:base.gem || 0,
    honor:base.honor || 0,
    statPct:base.statPct || 0.1,
  };
  cost.ready = !cost.awakened && !cost.locked &&
    cost.haveShards >= cost.needShards &&
    (state.gold || 0) >= cost.gold &&
    (state.essence || 0) >= cost.essence &&
    (state.gem || 0) >= cost.gem &&
    (state.honor || 0) >= cost.honor;
  return cost;
}
function companionAwakenCostText(cost){
  if(!cost) return '';
  const bits = [`${cost.quality?.name || ''}通用碎片 ${cost.haveShards}/${cost.needShards}`];
  if(cost.gold) bits.push(`金币 ${typeof fmt === 'function' ? fmt(cost.gold) : cost.gold}`);
  if(cost.essence) bits.push(`精华 ${cost.essence}`);
  if(cost.gem) bits.push(`钻石 ${cost.gem}`);
  if(cost.honor) bits.push(`荣誉 ${cost.honor}`);
  return bits.join(' · ');
}
function awakenCompanion(idx){
  const comp=state.companions[idx];if(!comp)return;
  const tpl=COMPANIONS.find(c=>c.key===comp.key);if(!tpl)return;
  const cost = getCompanionAwakenCost(comp, tpl);
  if(cost.awakened) return log(`${tpl.name} 已觉醒`,'bad');
  if(cost.locked) return log(`${tpl.name} 需要先升到5星才能觉醒`,'bad');
  if(!cost.ready) return log(`觉醒资源不足: ${companionAwakenCostText(cost)}`,'bad');
  state.compUniversalShards[cost.quality.key] -= cost.needShards;
  state.gold -= cost.gold;
  state.essence = (state.essence || 0) - cost.essence;
  state.gem = (state.gem || 0) - cost.gem;
  state.honor = (state.honor || 0) - cost.honor;
  comp.awakened = true;
  comp.awakenRank = 1;
  comp.familiarity = Math.max(comp.familiarity || 0, 100);
  const skill = companionAwakenSkillDef(tpl);
  log(`🌟 ${tpl.name} 完成觉醒! 熟悉度+100,属性+${Math.round(cost.statPct*100)}%,解锁「${skill?.name || '觉醒专属技'}」`,'legend');
  if(state.activeCompanion === idx) initCompanionHp();
  recomputeStats();markDirty('companion','hero','stage');
}
function companionUpgradeNeed(comp, q){
  const stars = comp?.stars || 1;
  const mult = ({ white:0.55, green:0.70, blue:0.86, purple:1, orange:1 })[q?.key] || 1;
  return Math.max(2, Math.ceil(stars * 8 * mult));
}
