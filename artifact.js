/* =========================================================
   artifact.js — 神器系统(职业特效树)
   ----------------------------------------------------------
   规则:
   - Lv.10 解锁神器
   - 神器 AP 从杀怪获得(战斗 XP 的 30%)
   - 每升 1 级给 1 个神器点
   - 12 个节点 × 每个 3 阶 = 共 36 点
   - 里程碑调整为 Lv.10 / 22 / 36
   - 神器现在以职业特效为主,面板数值为辅
   ========================================================= */

const ARTIFACT_UNLOCK_LVL = 10;
const ARTIFACT_MAX_LVL = 36;

const ARTIFACTS = {
  warrior: { name:'霸者之刃 · 灰烬使者', icon:'🗡️', color:'#c79c6e' },
  mage:    { name:'风暴之眼',           icon:'🪄', color:'#69ccf0' },
  priest:  { name:'伊格诺斯的低语',     icon:'📿', color:'#ffffff' },
  rogue:   { name:'断魂双匕',           icon:'🗡️', color:'#fff569' },
  hunter:  { name:'索利达尔的命运之弓', icon:'🏹', color:'#abd473' },
  shaman:  { name:'氏族之斧 · 朵姆',    icon:'🪓', color:'#0070de' },
  paladin: { name:'灰白之刃 · 银色之手',icon:'⚒️', color:'#f58cba' },
  warlock: { name:'恐惧斯卡萨克思',     icon:'📕', color:'#9482c9' },
  druid:   { name:'菲奥纳娜',           icon:'🌿', color:'#ff7d0a' },
};

function clonePlain(v){
  return v == null ? v : JSON.parse(JSON.stringify(v));
}
function rankValue(values, rank){
  if (typeof values === 'function') return values(rank);
  if (Array.isArray(values)) return values[Math.max(0, Math.min(values.length - 1, rank - 1))];
  return values;
}
function asFxList(v){
  if (!v) return [];
  return (Array.isArray(v) ? v : [v]).filter(Boolean).map(clonePlain);
}
function trait(cfg){
  return Object.assign({ maxRank:3, mod:{} }, cfg);
}
function skillAmpTrait(cfg){
  return trait(Object.assign({}, cfg, {
    fx(rank){
      return { type:'skillAmp', skill:cfg.skill, dmgPct:rankValue(cfg.dmgPct, rank), state:cfg.state };
    }
  }));
}
function vsStateTrait(cfg){
  return trait(Object.assign({}, cfg, {
    fx(rank){
      return { type:'vsState', state:cfg.state, dmgPct:rankValue(cfg.dmgPct, rank) };
    }
  }));
}
function executeTrait(cfg){
  return trait(Object.assign({}, cfg, {
    fx(rank){
      return { type:'executeWindow', threshold:cfg.threshold || 0.35, dmgPct:rankValue(cfg.dmgPct, rank) };
    }
  }));
}
function bossTrait(cfg){
  return trait(Object.assign({}, cfg, {
    fx(rank){
      const out = { type:'vsBoss' };
      const dmg = rankValue(cfg.dmgPct, rank);
      const taken = rankValue(cfg.takenPct, rank);
      if (dmg) out.dmgPct = dmg;
      if (taken) out.takenPct = taken;
      return out;
    }
  }));
}
function onCritTrait(cfg){
  return trait(Object.assign({}, cfg, {
    fx(rank){
      const fx = Object.assign({ type:'onCrit' }, clonePlain(cfg.baseFx || {}));
      if (cfg.skill) fx.skill = cfg.skill;
      if (cfg.state) fx.state = cfg.state;
      if (cfg.chance) fx.chance = rankValue(cfg.chance, rank);
      if (cfg.cooldown) fx.cooldown = cfg.cooldown;
      if (cfg.extraHitMul) fx.extraHitMul = rankValue(cfg.extraHitMul, rank);
      if (cfg.extraHitIcon) fx.extraHitIcon = cfg.extraHitIcon;
      if (cfg.applyDotPct) fx.applyDotPct = rankValue(cfg.applyDotPct, rank);
      if (cfg.dotMs) fx.dotMs = cfg.dotMs;
      if (cfg.nextSkillCrit) fx.nextSkillCrit = rankValue(cfg.nextSkillCrit, rank);
      return fx;
    }
  }));
}
function onKillTrait(cfg){
  return trait(Object.assign({}, cfg, {
    fx(rank){
      const out = { type:'onKill' };
      if (cfg.requireDot) out.requireDot = true;
      if (cfg.cooldown) out.cooldown = cfg.cooldown;
      if (cfg.healPct) out.healPct = rankValue(cfg.healPct, rank);
      if (cfg.resource) out.resource = rankValue(cfg.resource, rank);
      if (cfg.spreadDotPct) out.spreadDotPct = rankValue(cfg.spreadDotPct, rank);
      if (cfg.nextSkillCrit) out.nextSkillCrit = rankValue(cfg.nextSkillCrit, rank);
      if (cfg.resetSkill) out.resetSkill = cfg.resetSkill;
      return out;
    }
  }));
}
function lowHpTrait(cfg){
  return trait(Object.assign({}, cfg, {
    fx(rank){
      const out = { type:'lowHp', threshold:cfg.threshold || 0.35, cooldown:cfg.cooldown || 30000 };
      if (cfg.healPct) out.healPct = rankValue(cfg.healPct, rank);
      if (cfg.shieldPct) out.shieldPct = rankValue(cfg.shieldPct, rank);
      if (cfg.resource) out.resource = rankValue(cfg.resource, rank);
      return out;
    }
  }));
}
function afterSkillTrait(cfg){
  return trait(Object.assign({}, cfg, {
    fx(rank){
      const out = Object.assign({ type:'afterSkill', skill:cfg.skill }, clonePlain(cfg.baseFx || {}));
      if (cfg.state) out.state = cfg.state;
      if (cfg.chance) out.chance = rankValue(cfg.chance, rank);
      if (cfg.cooldown) out.cooldown = cfg.cooldown;
      if (cfg.resource) out.resource = rankValue(cfg.resource, rank);
      if (cfg.healPct) out.healPct = rankValue(cfg.healPct, rank);
      if (cfg.shieldPct) out.shieldPct = rankValue(cfg.shieldPct, rank);
      if (cfg.extraDmgPct) out.extraDmgPct = rankValue(cfg.extraDmgPct, rank);
      if (cfg.holyDmgPct) out.holyDmgPct = rankValue(cfg.holyDmgPct, rank);
      if (cfg.applyDotPct) out.applyDotPct = rankValue(cfg.applyDotPct, rank);
      if (cfg.dotMs) out.dotMs = cfg.dotMs;
      if (cfg.nextSkillCrit) out.nextSkillCrit = rankValue(cfg.nextSkillCrit, rank);
      if (cfg.resetSkill) out.resetSkill = cfg.resetSkill;
      if (cfg.resetPct) out.resetPct = rankValue(cfg.resetPct, rank);
      return out;
    }
  }));
}
function afterHealTrait(cfg){
  return trait(Object.assign({}, cfg, {
    fx(rank){
      const out = { type:'afterHeal' };
      if (cfg.skill) out.skill = cfg.skill;
      if (cfg.cooldown) out.cooldown = cfg.cooldown;
      if (cfg.overhealShieldPct) out.overhealShieldPct = rankValue(cfg.overhealShieldPct, rank);
      if (cfg.shieldPct) out.shieldPct = rankValue(cfg.shieldPct, rank);
      if (cfg.healPct) out.healPct = rankValue(cfg.healPct, rank);
      return out;
    }
  }));
}
function whileBuffTrait(cfg){
  return trait(Object.assign({}, cfg, {
    fx(rank){
      const out = { type:'whileBuff', buffKey:cfg.buffKey };
      if (cfg.skill) out.skill = cfg.skill;
      if (cfg.dmgPct) out.dmgPct = rankValue(cfg.dmgPct, rank);
      if (cfg.takenPct) out.takenPct = rankValue(cfg.takenPct, rank);
      return out;
    }
  }));
}

function milestoneList(mainAttrKey){
  const attrLabel = { strPct:'力量', agiPct:'敏捷', intPct:'智力', spiPct:'精神', staPct:'耐力' }[mainAttrKey] || '主属性';
  return [
    { lvl:10, name:'觉醒', desc:`攻击 +4% · 生命 +6% · 防御 +4% · ${attrLabel} +4%`, mod:{ atkPct:4, hpPct:6, defPct:4, [mainAttrKey]:4 } },
    { lvl:22, name:'共鸣', desc:`攻击 +6% · 主技能冷却缩减 +6% · 精通 +2`, mod:{ atkPct:6, cdReduction:6, mastery:2 } },
    { lvl:36, name:'解放', desc:`攻击 +8% · 生命 +10% · 防御 +8% · 精通 +4`, mod:{ atkPct:8, hpPct:10, defPct:8, mastery:4 } },
  ];
}

const ARTIFACT_TREES = {
  warrior: {
    arms:{ name:'武器', icon:'⚔️', color:'#ef4444' },
    fury:{ name:'狂暴', icon:'🔥', color:'#f97316' },
    prot:{ name:'防护', icon:'🛡️', color:'#3b82f6' },
  },
  mage: {
    arcane:{ name:'奥术', icon:'✨', color:'#8b5cf6' },
    fire:{ name:'火焰', icon:'🔥', color:'#ef4444' },
    frost:{ name:'冰霜', icon:'❄️', color:'#38bdf8' },
  },
  priest: {
    discipline:{ name:'戒律', icon:'🕊️', color:'#fbbf24' },
    holy:{ name:'神圣', icon:'✝️', color:'#fde68a' },
    shadow:{ name:'暗影', icon:'🌑', color:'#8b5cf6' },
  },
  rogue: {
    assassination:{ name:'刺杀', icon:'🐍', color:'#84cc16' },
    combat:{ name:'战斗', icon:'⚔️', color:'#f97316' },
    subtlety:{ name:'敏锐', icon:'👤', color:'#6366f1' },
  },
  hunter: {
    bm:{ name:'兽王', icon:'🦁', color:'#65a30d' },
    marks:{ name:'射击', icon:'🎯', color:'#f59e0b' },
    survival:{ name:'生存', icon:'🪤', color:'#14b8a6' },
  },
  shaman: {
    element:{ name:'元素', icon:'⚡', color:'#60a5fa' },
    enhancement:{ name:'增强', icon:'💨', color:'#f97316' },
    restoration:{ name:'恢复', icon:'🌊', color:'#22c55e' },
  },
  paladin: {
    holy:{ name:'神圣', icon:'✨', color:'#fde68a' },
    prot:{ name:'防护', icon:'🛡️', color:'#60a5fa' },
    ret:{ name:'惩戒', icon:'⚔️', color:'#f43f5e' },
  },
  warlock: {
    affliction:{ name:'痛苦', icon:'🧿', color:'#8b5cf6' },
    demonology:{ name:'恶魔学识', icon:'😈', color:'#ec4899' },
    destruction:{ name:'毁灭', icon:'🔥', color:'#ef4444' },
  },
  druid: {
    balance:{ name:'平衡', icon:'🌙', color:'#6366f1' },
    feral:{ name:'野性', icon:'🐺', color:'#f97316' },
    resto:{ name:'恢复', icon:'🌿', color:'#22c55e' },
  },
};

const ARTIFACT_TRAITS = {
  warrior: [
    skillAmpTrait({ key:'art_war_arms_mortal', tree:'arms', name:'破军裂锋', icon:'⚔️', skill:'mortalStrike', dmgPct:[10,20,30], mod:{atkPct:1}, desc:'致死打击伤害提高 10/20/30%，并获得攻击 +1%/2%/3%。' }),
    vsStateTrait({ key:'art_war_arms_sunder', tree:'arms', name:'裂甲处刑', icon:'🔨', state:'sunder', dmgPct:[8,16,24], mod:{executeBonus:2}, prereq:'art_war_arms_mortal', desc:'对被破甲目标造成的伤害提高 8/16/24%，并获得斩杀加成 +2%/4%/6%。' }),
    afterSkillTrait({ key:'art_war_arms_mark', tree:'arms', name:'处决节律', icon:'💀', skill:'sunderArmor', chance:[35,70,100], nextSkillCrit:[1,1,1], mod:{cdReduction:2}, prereq:'art_war_arms_sunder', desc:'施放破甲攻击后有 35/70/100% 几率让下一次伤害技能必定暴击，并获得技能冷却缩减 +2%/4%/6%。' }),
    executeTrait({ key:'art_war_arms_finish', tree:'arms', name:'终幕裁决', icon:'🪓', threshold:0.45, dmgPct:[12,24,36], mod:{atkPct:1}, prereq:'art_war_arms_mark', desc:'对生命低于 45% 的目标造成的伤害提高 12/24/36%，并获得攻击 +1%/2%/3%。' }),

    skillAmpTrait({ key:'art_war_fury_blood', tree:'fury', name:'血潮双刃', icon:'🩸', skill:'bloodthirst', dmgPct:[12,24,36], mod:{spdPct:2}, desc:'嗜血伤害提高 12/24/36%，并获得攻速 +2%/4%/6%。' }),
    onCritTrait({ key:'art_war_fury_rush', tree:'fury', name:'狂怒回响', icon:'🔥', extraHitMul:[0.25,0.4,0.55], extraHitIcon:'⚔️', cooldown:2500, mod:{atkPct:1}, prereq:'art_war_fury_blood', desc:'暴击后追加一次 25%/40%/55% 伤害的追击，2.5秒冷却，并获得攻击 +1%/2%/3%。' }),
    onKillTrait({ key:'art_war_fury_hunt', tree:'fury', name:'战吼回流', icon:'📯', healPct:[0.03,0.05,0.07], resource:[4,8,12], mod:{hpPct:2}, prereq:'art_war_fury_rush', desc:'击杀敌人后恢复 3%/5%/7% 最大生命并回复 4/8/12 点资源，获得生命 +2%/4%/6%。' }),
    afterSkillTrait({ key:'art_war_fury_reset', tree:'fury', name:'嗜血不息', icon:'😡', skill:'bloodthirst', chance:[15,25,35], resetSkill:'bloodthirst', mod:{spdPct:2}, prereq:'art_war_fury_hunt', desc:'施放嗜血后有 15/25/35% 几率立刻重置嗜血冷却，并获得攻速 +2%/4%/6%。' }),

    whileBuffTrait({ key:'art_war_prot_wall', tree:'prot', name:'坚壁压阵', icon:'🛡️', buffKey:'shield', takenPct:[8,16,24], mod:{defPct:2}, desc:'盾墙持续期间，受到的伤害额外降低 8/16/24%，并获得防御 +2%/4%/6%。' }),
    bossTrait({ key:'art_war_prot_boss', tree:'prot', name:'统御前线', icon:'👑', dmgPct:[6,12,18], takenPct:[4,8,12], mod:{hpPct:2}, prereq:'art_war_prot_wall', desc:'对首领造成的伤害提高 6/12/18%，受到其伤害降低 4/8/12%，并获得生命 +2%/4%/6%。' }),
    lowHpTrait({ key:'art_war_prot_guard', tree:'prot', name:'背水壁垒', icon:'🧱', threshold:0.4, cooldown:30000, shieldPct:[0.05,0.09,0.13], mod:{defPct:2}, prereq:'art_war_prot_boss', desc:'生命低于 40% 时，获得相当于 5%/9%/13% 最大生命的护盾，30秒冷却，并获得防御 +2%/4%/6%。' }),
    afterSkillTrait({ key:'art_war_prot_punish', tree:'prot', name:'盾反压制', icon:'🔨', skill:'sunderArmor', extraDmgPct:[0.1,0.18,0.28], mod:{reflectDmg:2}, prereq:'art_war_prot_guard', desc:'施放破甲攻击后，额外造成本次伤害 10%/18%/28% 的压制伤害，并获得反伤 +2%/4%/6%。' }),
  ],
  mage: [
    skillAmpTrait({ key:'art_mage_arc_blast', tree:'arcane', name:'法网回路', icon:'✨', skill:'arcane', dmgPct:[10,20,30], mod:{intPct:2}, desc:'奥术飞弹伤害提高 10/20/30%，并获得智力 +2%/4%/6%。' }),
    afterSkillTrait({ key:'art_mage_arc_mana', tree:'arcane', name:'法力回收', icon:'🔮', skill:'arcane', resource:[4,8,12], mod:{costReduction:3}, prereq:'art_mage_arc_blast', desc:'施放奥术飞弹后回复 4/8/12 点资源，并获得减耗 +3%/6%/9%。' }),
    onCritTrait({ key:'art_mage_arc_echo', tree:'arcane', name:'奥能回响', icon:'💥', skill:['arcane','arcaneExplosion'], extraHitMul:[0.3,0.45,0.6], extraHitIcon:'✨', cooldown:3000, mod:{cdReduction:2}, prereq:'art_mage_arc_mana', desc:'奥术技能暴击后追加一次 30%/45%/60% 伤害的奥能回响，3秒冷却，并获得技能冷却缩减 +2%/4%/6%。' }),
    bossTrait({ key:'art_mage_arc_siege', tree:'arcane', name:'法阵收束', icon:'🪞', dmgPct:[8,16,24], mod:{atkPct:1}, prereq:'art_mage_arc_echo', desc:'对首领造成的伤害提高 8/16/24%，并获得攻击 +1%/2%/3%。' }),

    skillAmpTrait({ key:'art_mage_fire_ball', tree:'fire', name:'灼心余焰', icon:'🔥', skill:'fireball', dmgPct:[10,20,30], mod:{dotBonus:3}, desc:'火球术伤害提高 10/20/30%，并获得持续伤害 +3%/6%/9%。' }),
    onCritTrait({ key:'art_mage_fire_ignite', tree:'fire', name:'余烬翻涌', icon:'☄️', applyDotPct:[0.08,0.12,0.18], dotMs:6000, mod:{atkPct:1}, prereq:'art_mage_fire_ball', desc:'暴击时追加一层基于本次伤害 8%/12%/18% 的灼烧，持续 6 秒，并获得攻击 +1%/2%/3%。' }),
    afterSkillTrait({ key:'art_mage_fire_chain', tree:'fire', name:'热能连发', icon:'🔥', skill:'fireball', chance:[20,35,50], nextSkillCrit:[1,1,1], mod:{cdReduction:2}, prereq:'art_mage_fire_ignite', desc:'施放火球术后有 20/35/50% 几率让下一次伤害技能必定暴击，并获得技能冷却缩减 +2%/4%/6%。' }),
    executeTrait({ key:'art_mage_fire_finish', tree:'fire', name:'焦灼终焉', icon:'🌋', threshold:0.35, dmgPct:[12,24,36], mod:{atkPct:1}, prereq:'art_mage_fire_chain', desc:'对生命低于 35% 的目标造成的伤害提高 12/24/36%，并获得攻击 +1%/2%/3%。' }),

    skillAmpTrait({ key:'art_mage_frost_bolt', tree:'frost', name:'霜脉裂片', icon:'❄️', skill:'frostbolt', dmgPct:[10,20,30], mod:{defPct:2}, desc:'寒冰箭伤害提高 10/20/30%，并获得防御 +2%/4%/6%。' }),
    vsStateTrait({ key:'art_mage_frost_slow', tree:'frost', name:'冻伤锁定', icon:'🧊', state:'slow', dmgPct:[10,20,30], mod:{spdPct:2}, prereq:'art_mage_frost_bolt', desc:'对被减速目标造成的伤害提高 10/20/30%，并获得攻速 +2%/4%/6%。' }),
    lowHpTrait({ key:'art_mage_frost_barrier', tree:'frost', name:'极寒护体', icon:'🛡️', threshold:0.45, cooldown:30000, shieldPct:[0.04,0.08,0.12], mod:{defPct:2}, prereq:'art_mage_frost_slow', desc:'生命低于 45% 时，获得相当于 4%/8%/12% 最大生命的护盾，30秒冷却，并获得防御 +2%/4%/6%。' }),
    onCritTrait({ key:'art_mage_frost_echo', tree:'frost', name:'冰凌追击', icon:'🌨️', skill:['frostbolt','blizzard'], extraHitMul:[0.25,0.4,0.55], extraHitIcon:'❄️', cooldown:3000, mod:{atkPct:1}, prereq:'art_mage_frost_barrier', desc:'冰霜技能暴击后追加一次 25%/40%/55% 伤害的冰凌追击，3秒冷却，并获得攻击 +1%/2%/3%。' }),
  ],
  priest: [
    skillAmpTrait({ key:'art_pri_disc_wrath', tree:'discipline', name:'赎罪烙印', icon:'✝️', skill:['smite','mindBlast'], dmgPct:[10,20,30], mod:{healBonus:3}, desc:'惩击与心灵震爆伤害提高 10/20/30%，并获得治疗效果 +3%/6%/9%。' }),
    afterHealTrait({ key:'art_pri_disc_shell', tree:'discipline', name:'灵魂回护', icon:'🛡️', overhealShieldPct:[0.2,0.35,0.5], mod:{defPct:2}, prereq:'art_pri_disc_wrath', desc:'你的过量治疗会转化为 20%/35%/50% 的吸收护盾，并获得防御 +2%/4%/6%。' }),
    afterSkillTrait({ key:'art_pri_disc_shield', tree:'discipline', name:'苦修慰藉', icon:'💚', skill:'shield', healPct:[0.02,0.04,0.06], mod:{regFlat:1}, prereq:'art_pri_disc_shell', desc:'施放真言术盾后，立刻恢复 2%/4%/6% 最大生命，并获得回复 +1/2/3。' }),
    lowHpTrait({ key:'art_pri_disc_save', tree:'discipline', name:'神佑临界', icon:'🕊️', threshold:0.38, cooldown:30000, healPct:[0.04,0.08,0.12], shieldPct:[0.04,0.08,0.12], mod:{hpPct:2}, prereq:'art_pri_disc_shield', desc:'生命低于 38% 时，恢复 4%/8%/12% 最大生命并获得等量护盾，30秒冷却，同时获得生命 +2%/4%/6%。' }),

    afterSkillTrait({ key:'art_pri_holy_light', tree:'holy', name:'晨辉余温', icon:'✨', skill:['heal','renew','divineHymn'], shieldPct:[0.02,0.04,0.06], mod:{healBonus:4}, desc:'施放治疗术、恢复或神圣赞美诗后，获得相当于 2%/4%/6% 最大生命的护盾，并获得治疗效果 +4%/8%/12%。' }),
    afterHealTrait({ key:'art_pri_holy_over', tree:'holy', name:'圣光盈余', icon:'🌟', overhealShieldPct:[0.25,0.4,0.55], mod:{regFlat:1}, prereq:'art_pri_holy_light', desc:'你的过量治疗会转化为 25%/40%/55% 的吸收护盾，并获得回复 +1/2/3。' }),
    afterSkillTrait({ key:'art_pri_holy_judgement', tree:'holy', name:'圣言回声', icon:'💫', skill:'smite', healPct:[0.02,0.04,0.06], mod:{intPct:2}, prereq:'art_pri_holy_over', desc:'施放惩击后，恢复 2%/4%/6% 最大生命，并获得智力 +2%/4%/6%。' }),
    lowHpTrait({ key:'art_pri_holy_last', tree:'holy', name:'守护天启', icon:'👼', threshold:0.35, cooldown:30000, healPct:[0.06,0.1,0.15], shieldPct:[0.03,0.06,0.1], mod:{hpPct:2}, prereq:'art_pri_holy_judgement', desc:'生命低于 35% 时，恢复 6%/10%/15% 最大生命并获得 3%/6%/10% 最大生命护盾，30秒冷却，同时获得生命 +2%/4%/6%。' }),

    skillAmpTrait({ key:'art_pri_shadow_blast', tree:'shadow', name:'虚空尖啸', icon:'🌀', skill:'mindBlast', dmgPct:[10,20,30], mod:{dotBonus:3}, desc:'心灵震爆伤害提高 10/20/30%，并获得持续伤害 +3%/6%/9%。' }),
    onCritTrait({ key:'art_pri_shadow_pain', tree:'shadow', name:'暗痛回响', icon:'🌑', applyDotPct:[0.08,0.12,0.18], dotMs:6000, mod:{atkPct:1}, prereq:'art_pri_shadow_blast', desc:'暴击时追加一层基于本次伤害 8%/12%/18% 的暗影痛楚，持续 6 秒，并获得攻击 +1%/2%/3%。' }),
    onKillTrait({ key:'art_pri_shadow_spread', tree:'shadow', name:'病灶扩散', icon:'☠️', requireDot:true, spreadDotPct:[0.35,0.5,0.7], mod:{cdReduction:2}, prereq:'art_pri_shadow_pain', desc:'若目标带着持续伤害死亡，会把 35%/50%/70% 的 DOT 蔓延给下一名敌人，并获得技能冷却缩减 +2%/4%/6%。' }),
    vsStateTrait({ key:'art_pri_shadow_void', tree:'shadow', name:'虚空摄食', icon:'🧿', state:'dot', dmgPct:[10,20,30], mod:{atkPct:1}, prereq:'art_pri_shadow_spread', desc:'对带有持续伤害效果的目标造成的伤害提高 10/20/30%，并获得攻击 +1%/2%/3%。' }),
  ],
  rogue: [
    skillAmpTrait({ key:'art_rog_assn_poison', tree:'assassination', name:'淬毒刀锋', icon:'🐍', skill:['poison','rupture'], dmgPct:[10,20,30], mod:{dotBonus:3}, desc:'毒刃与割裂伤害提高 10/20/30%，并获得持续伤害 +3%/6%/9%。' }),
    vsStateTrait({ key:'art_rog_assn_dot', tree:'assassination', name:'见血封喉', icon:'🩸', state:'dot', dmgPct:[10,20,30], mod:{executeBonus:2}, prereq:'art_rog_assn_poison', desc:'对带有持续伤害效果的目标造成的伤害提高 10/20/30%，并获得斩杀加成 +2%/4%/6%。' }),
    onCritTrait({ key:'art_rog_assn_bleed', tree:'assassination', name:'暗毒回流', icon:'☠️', applyDotPct:[0.08,0.12,0.16], dotMs:6000, mod:{atkPct:1}, prereq:'art_rog_assn_dot', desc:'暴击时追加一层基于本次伤害 8%/12%/16% 的毒伤，持续 6 秒，并获得攻击 +1%/2%/3%。' }),
    executeTrait({ key:'art_rog_assn_finish', tree:'assassination', name:'无声处决', icon:'💀', threshold:0.4, dmgPct:[10,20,30], mod:{atkPct:1}, prereq:'art_rog_assn_bleed', desc:'对生命低于 40% 的目标造成的伤害提高 10/20/30%，并获得攻击 +1%/2%/3%。' }),

    skillAmpTrait({ key:'art_rog_combat_blade', tree:'combat', name:'疾刃节拍', icon:'⚔️', skill:['sinister','backstab'], dmgPct:[10,20,30], mod:{spdPct:2}, desc:'邪恶打击与背刺伤害提高 10/20/30%，并获得攻速 +2%/4%/6%。' }),
    onCritTrait({ key:'art_rog_combat_echo', tree:'combat', name:'双刃回荡', icon:'🗡️', extraHitMul:[0.25,0.4,0.55], extraHitIcon:'⚔️', cooldown:2500, mod:{extraAtk:1}, prereq:'art_rog_combat_blade', desc:'暴击后追加一次 25%/40%/55% 伤害的追击，2.5秒冷却，并获得额外攻击 +1%/2%/3%。' }),
    afterSkillTrait({ key:'art_rog_combat_flow', tree:'combat', name:'无尽连势', icon:'💨', skill:['sinister','backstab'], resource:[5,10,15], mod:{cdReduction:2}, prereq:'art_rog_combat_echo', desc:'施放邪恶打击或背刺后回复 5/10/15 点资源，并获得技能冷却缩减 +2%/4%/6%。' }),
    bossTrait({ key:'art_rog_combat_boss', tree:'combat', name:'猎首本能', icon:'🎯', dmgPct:[8,16,24], mod:{atkPct:1}, prereq:'art_rog_combat_flow', desc:'对首领造成的伤害提高 8/16/24%，并获得攻击 +1%/2%/3%。' }),

    skillAmpTrait({ key:'art_rog_sub_mark', tree:'subtlety', name:'影裂刻痕', icon:'👤', skill:['killingSpree','deathMark'], dmgPct:[10,20,30], mod:{executeBonus:2}, desc:'杀戮盛宴与死亡标记伤害提高 10/20/30%，并获得斩杀加成 +2%/4%/6%。' }),
    afterSkillTrait({ key:'art_rog_sub_shadow', tree:'subtlety', name:'影遁伏杀', icon:'🌑', skill:'shadow', nextSkillCrit:[1,1,1], mod:{atkPct:1}, prereq:'art_rog_sub_mark', desc:'施放影遁后，下一次伤害技能必定暴击，并获得攻击 +1%/2%/3%。' }),
    executeTrait({ key:'art_rog_sub_exec', tree:'subtlety', name:'喉切终结', icon:'🪢', threshold:0.35, dmgPct:[12,24,36], mod:{atkPct:1}, prereq:'art_rog_sub_shadow', desc:'对生命低于 35% 的目标造成的伤害提高 12/24/36%，并获得攻击 +1%/2%/3%。' }),
    onKillTrait({ key:'art_rog_sub_reset', tree:'subtlety', name:'夜行复归', icon:'🌘', resource:[6,12,18], resetSkill:'shadow', mod:{cdReduction:2}, prereq:'art_rog_sub_exec', desc:'击杀敌人后回复 6/12/18 点资源，并重置影遁冷却，同时获得技能冷却缩减 +2%/4%/6%。' }),
  ],
  hunter: [
    whileBuffTrait({ key:'art_hun_bm_wrath', tree:'bm', name:'兽群狂吼', icon:'🦁', buffKey:'bestial', dmgPct:[10,20,30], mod:{atkPct:1}, desc:'狂野怒火持续期间，你造成的伤害提高 10/20/30%，并获得攻击 +1%/2%/3%。' }),
    onKillTrait({ key:'art_hun_bm_feed', tree:'bm', name:'猎群进食', icon:'🐾', resource:[5,10,15], mod:{hpPct:2}, prereq:'art_hun_bm_wrath', desc:'击杀敌人后回复 5/10/15 点资源，并获得生命 +2%/4%/6%。' }),
    afterSkillTrait({ key:'art_hun_bm_stamp', tree:'bm', name:'怒兽践踏', icon:'🦬', skill:'bestialWrath', extraDmgPct:[0.12,0.2,0.3], mod:{extraAtk:1}, prereq:'art_hun_bm_feed', desc:'施放狂野怒火后，额外造成本次伤害 12%/20%/30% 的践踏伤害，并获得额外攻击 +1%/2%/3%。' }),
    bossTrait({ key:'art_hun_bm_predator', tree:'bm', name:'顶级猎食者', icon:'👑', dmgPct:[10,20,30], mod:{atkPct:1}, prereq:'art_hun_bm_stamp', desc:'对首领造成的伤害提高 10/20/30%，并获得攻击 +1%/2%/3%。' }),

    skillAmpTrait({ key:'art_hun_mark_aimed', tree:'marks', name:'狙心轨迹', icon:'🎯', skill:'aimed', dmgPct:[10,20,30], mod:{atkPct:1}, desc:'瞄准射击伤害提高 10/20/30%，并获得攻击 +1%/2%/3%。' }),
    executeTrait({ key:'art_hun_mark_kill', tree:'marks', name:'断息猎杀', icon:'💀', threshold:0.4, dmgPct:[12,24,36], mod:{executeBonus:2}, prereq:'art_hun_mark_aimed', desc:'对生命低于 40% 的目标造成的伤害提高 12/24/36%，并获得斩杀加成 +2%/4%/6%。' }),
    onCritTrait({ key:'art_hun_mark_burst', tree:'marks', name:'连珠补射', icon:'🏹', skill:['aimed','arcaneShot'], extraHitMul:[0.3,0.45,0.6], extraHitIcon:'🎯', cooldown:3000, mod:{cdReduction:2}, prereq:'art_hun_mark_kill', desc:'瞄准射击或奥术射击暴击后，追加一次 30%/45%/60% 伤害的补射，3秒冷却，并获得技能冷却缩减 +2%/4%/6%。' }),
    afterSkillTrait({ key:'art_hun_mark_mark', tree:'marks', name:'猎印逼杀', icon:'🔍', skill:'huntersMark', nextSkillCrit:[1,1,1], mod:{atkPct:1}, prereq:'art_hun_mark_burst', desc:'施放猎人印记后，下一次伤害技能必定暴击，并获得攻击 +1%/2%/3%。' }),

    skillAmpTrait({ key:'art_hun_surv_trap', tree:'survival', name:'荒野陷阱', icon:'🪤', skill:['explosiveShot','multi'], dmgPct:[10,20,30], mod:{dotBonus:3}, desc:'爆炸射击与多重射击伤害提高 10/20/30%，并获得持续伤害 +3%/6%/9%。' }),
    vsStateTrait({ key:'art_hun_surv_slow', tree:'survival', name:'困猎之网', icon:'❄️', state:'slow', dmgPct:[10,20,30], mod:{defPct:2}, prereq:'art_hun_surv_trap', desc:'对被减速目标造成的伤害提高 10/20/30%，并获得防御 +2%/4%/6%。' }),
    onKillTrait({ key:'art_hun_surv_recover', tree:'survival', name:'荒野疗创', icon:'🌿', healPct:[0.03,0.05,0.07], mod:{hpPct:2}, prereq:'art_hun_surv_slow', desc:'击杀敌人后恢复 3%/5%/7% 最大生命，并获得生命 +2%/4%/6%。' }),
    afterSkillTrait({ key:'art_hun_surv_bleed', tree:'survival', name:'裂爆追伤', icon:'💥', skill:['freezingTrap','multi'], applyDotPct:[0.08,0.12,0.18], dotMs:6000, mod:{atkPct:1}, prereq:'art_hun_surv_recover', desc:'施放冰冻陷阱或多重射击后，附加一层基于本次伤害 8%/12%/18% 的持续伤害，持续 6 秒，并获得攻击 +1%/2%/3%。' }),
  ],
  shaman: [
    skillAmpTrait({ key:'art_sha_ele_chain', tree:'element', name:'雷脉裂涌', icon:'⚡', skill:['lightning','chainLightning'], dmgPct:[10,20,30], mod:{intPct:2}, desc:'闪电箭与闪电链伤害提高 10/20/30%，并获得智力 +2%/4%/6%。' }),
    onCritTrait({ key:'art_sha_ele_echo', tree:'element', name:'过载回响', icon:'🌩️', extraHitMul:[0.25,0.4,0.55], extraHitIcon:'⚡', cooldown:3000, mod:{cdReduction:2}, prereq:'art_sha_ele_chain', desc:'暴击后追加一次 25%/40%/55% 伤害的闪电过载，3秒冷却，并获得技能冷却缩减 +2%/4%/6%。' }),
    afterSkillTrait({ key:'art_sha_ele_flame', tree:'element', name:'熔核引线', icon:'🌋', skill:'flameShock', nextSkillCrit:[1,1,1], mod:{dotBonus:3}, prereq:'art_sha_ele_echo', desc:'施放烈焰震击后，下一次伤害技能必定暴击，并获得持续伤害 +3%/6%/9%。' }),
    executeTrait({ key:'art_sha_ele_storm', tree:'element', name:'风暴终断', icon:'⛈️', threshold:0.35, dmgPct:[12,24,36], mod:{atkPct:1}, prereq:'art_sha_ele_flame', desc:'对生命低于 35% 的目标造成的伤害提高 12/24/36%，并获得攻击 +1%/2%/3%。' }),

    whileBuffTrait({ key:'art_sha_enh_wind', tree:'enhancement', name:'狂岚怒刃', icon:'💨', buffKey:'windfury', dmgPct:[10,20,30], mod:{spdPct:2}, desc:'风怒武器持续期间，你造成的伤害提高 10/20/30%，并获得攻速 +2%/4%/6%。' }),
    onCritTrait({ key:'art_sha_enh_chain', tree:'enhancement', name:'双风怒袭', icon:'⚔️', extraHitMul:[0.3,0.45,0.6], extraHitIcon:'💨', cooldown:2500, mod:{extraAtk:1}, prereq:'art_sha_enh_wind', desc:'暴击后追加一次 30%/45%/60% 伤害的风怒追击，2.5秒冷却，并获得额外攻击 +1%/2%/3%。' }),
    onKillTrait({ key:'art_sha_enh_flow', tree:'enhancement', name:'战意回潮', icon:'🩸', resource:[5,10,15], mod:{atkPct:1}, prereq:'art_sha_enh_chain', desc:'击杀敌人后回复 5/10/15 点资源，并获得攻击 +1%/2%/3%。' }),
    afterSkillTrait({ key:'art_sha_enh_reset', tree:'enhancement', name:'漩涡借势', icon:'🌀', skill:'windfury', nextSkillCrit:[1,1,1], mod:{cdReduction:2}, prereq:'art_sha_enh_flow', desc:'施放风怒武器后，下一次伤害技能必定暴击，并获得技能冷却缩减 +2%/4%/6%。' }),

    afterHealTrait({ key:'art_sha_rest_shield', tree:'restoration', name:'潮汐护膜', icon:'🌊', overhealShieldPct:[0.2,0.35,0.5], mod:{healBonus:4}, desc:'你的过量治疗会转化为 20%/35%/50% 的吸收护盾，并获得治疗效果 +4%/8%/12%。' }),
    afterSkillTrait({ key:'art_sha_rest_wave', tree:'restoration', name:'泉涌回护', icon:'💚', skill:['healingWave','spiritLink'], shieldPct:[0.02,0.04,0.06], mod:{regFlat:1}, prereq:'art_sha_rest_shield', desc:'施放治疗波或灵魂链接后，获得相当于 2%/4%/6% 最大生命的护盾，并获得回复 +1/2/3。' }),
    lowHpTrait({ key:'art_sha_rest_save', tree:'restoration', name:'先祖拯护', icon:'🪨', threshold:0.35, cooldown:30000, healPct:[0.05,0.09,0.13], shieldPct:[0.04,0.08,0.12], mod:{hpPct:2}, prereq:'art_sha_rest_wave', desc:'生命低于 35% 时，恢复 5%/9%/13% 最大生命并获得 4%/8%/12% 最大生命护盾，30秒冷却，同时获得生命 +2%/4%/6%。' }),
    afterSkillTrait({ key:'art_sha_rest_bless', tree:'restoration', name:'激流余响', icon:'🔗', skill:'healingWave', resource:[4,8,12], mod:{cdReduction:2}, prereq:'art_sha_rest_save', desc:'施放治疗波后回复 4/8/12 点资源，并获得技能冷却缩减 +2%/4%/6%。' }),
  ],
  paladin: [
    afterHealTrait({ key:'art_pal_holy_beacon', tree:'holy', name:'晨曦回护', icon:'✨', overhealShieldPct:[0.25,0.4,0.55], mod:{healBonus:4}, desc:'你的过量治疗会转化为 25%/40%/55% 的吸收护盾，并获得治疗效果 +4%/8%/12%。' }),
    afterSkillTrait({ key:'art_pal_holy_light', tree:'holy', name:'圣辉余温', icon:'💫', skill:['holyLight','flashOfLight'], shieldPct:[0.02,0.04,0.06], mod:{regFlat:1}, prereq:'art_pal_holy_beacon', desc:'施放圣光术或圣光闪现后，获得相当于 2%/4%/6% 最大生命的护盾，并获得回复 +1/2/3。' }),
    lowHpTrait({ key:'art_pal_holy_last', tree:'holy', name:'黎明垂恩', icon:'🌅', threshold:0.35, cooldown:30000, healPct:[0.06,0.1,0.14], shieldPct:[0.03,0.06,0.09], mod:{hpPct:2}, prereq:'art_pal_holy_light', desc:'生命低于 35% 时，恢复 6%/10%/14% 最大生命并获得 3%/6%/9% 最大生命护盾，30秒冷却，同时获得生命 +2%/4%/6%。' }),
    afterSkillTrait({ key:'art_pal_holy_judge', tree:'holy', name:'审判赐福', icon:'⚖️', skill:'judgement', healPct:[0.02,0.04,0.06], mod:{intPct:2}, prereq:'art_pal_holy_last', desc:'施放审判后，恢复 2%/4%/6% 最大生命，并获得智力 +2%/4%/6%。' }),

    whileBuffTrait({ key:'art_pal_prot_shield', tree:'prot', name:'圣佑壁城', icon:'🛡️', buffKey:'divine', takenPct:[8,16,24], mod:{defPct:2}, desc:'圣盾术持续期间，受到的伤害额外降低 8/16/24%，并获得防御 +2%/4%/6%。' }),
    bossTrait({ key:'art_pal_prot_guard', tree:'prot', name:'裁决守势', icon:'👑', dmgPct:[6,12,18], takenPct:[4,8,12], mod:{hpPct:2}, prereq:'art_pal_prot_shield', desc:'对首领造成的伤害提高 6/12/18%，受到其伤害降低 4/8/12%，并获得生命 +2%/4%/6%。' }),
    afterSkillTrait({ key:'art_pal_prot_judge', tree:'prot', name:'圣锤回震', icon:'🔨', skill:'judgement', holyDmgPct:[0.12,0.2,0.3], mod:{defPct:2}, prereq:'art_pal_prot_guard', desc:'施放审判后，额外造成本次伤害 12%/20%/30% 的神圣追击，并获得防御 +2%/4%/6%。' }),
    lowHpTrait({ key:'art_pal_prot_last', tree:'prot', name:'壁垒圣誓', icon:'💠', threshold:0.4, cooldown:30000, shieldPct:[0.05,0.09,0.13], mod:{hpPct:2}, prereq:'art_pal_prot_judge', desc:'生命低于 40% 时，获得相当于 5%/9%/13% 最大生命的护盾，30秒冷却，并获得生命 +2%/4%/6%。' }),

    skillAmpTrait({ key:'art_pal_ret_burst', tree:'ret', name:'裁决锋芒', icon:'⚔️', skill:['judgement','crusader','consecration'], dmgPct:[10,20,30], mod:{atkPct:1}, desc:'审判、十字军打击与奉献伤害提高 10/20/30%，并获得攻击 +1%/2%/3%。' }),
    executeTrait({ key:'art_pal_ret_exec', tree:'ret', name:'圣裁终章', icon:'😇', threshold:0.35, dmgPct:[12,24,36], mod:{executeBonus:2}, prereq:'art_pal_ret_burst', desc:'对生命低于 35% 的目标造成的伤害提高 12/24/36%，并获得斩杀加成 +2%/4%/6%。' }),
    afterSkillTrait({ key:'art_pal_ret_chain', tree:'ret', name:'审判连锁', icon:'⚖️', skill:'judgement', nextSkillCrit:[1,1,1], mod:{cdReduction:2}, prereq:'art_pal_ret_exec', desc:'施放审判后，下一次伤害技能必定暴击，并获得技能冷却缩减 +2%/4%/6%。' }),
    onKillTrait({ key:'art_pal_ret_ashes', tree:'ret', name:'灰烬战愿', icon:'🔥', healPct:[0.03,0.05,0.07], resource:[4,8,12], mod:{atkPct:1}, prereq:'art_pal_ret_chain', desc:'击杀敌人后恢复 3%/5%/7% 最大生命并回复 4/8/12 点资源，同时获得攻击 +1%/2%/3%。' }),
  ],
  warlock: [
    skillAmpTrait({ key:'art_wl_aff_curse', tree:'affliction', name:'无尽病灶', icon:'🧿', skill:['corruption','unstableAffliction'], dmgPct:[10,20,30], mod:{dotBonus:3}, desc:'腐蚀术与痛苦无常伤害提高 10/20/30%，并获得持续伤害 +3%/6%/9%。' }),
    onKillTrait({ key:'art_wl_aff_spread', tree:'affliction', name:'瘟疫外溢', icon:'☠️', requireDot:true, spreadDotPct:[0.35,0.5,0.7], mod:{cdReduction:2}, prereq:'art_wl_aff_curse', desc:'若目标带着持续伤害死亡，会把 35%/50%/70% 的 DOT 蔓延给下一名敌人，并获得技能冷却缩减 +2%/4%/6%。' }),
    vsStateTrait({ key:'art_wl_aff_siphon', tree:'affliction', name:'灵魂虹吸', icon:'🩸', state:'dot', dmgPct:[10,20,30], mod:{atkPct:1}, prereq:'art_wl_aff_spread', desc:'对带有持续伤害效果的目标造成的伤害提高 10/20/30%，并获得攻击 +1%/2%/3%。' }),
    executeTrait({ key:'art_wl_aff_end', tree:'affliction', name:'痛苦收束', icon:'💜', threshold:0.35, dmgPct:[12,24,36], mod:{atkPct:1}, prereq:'art_wl_aff_siphon', desc:'对生命低于 35% 的目标造成的伤害提高 12/24/36%，并获得攻击 +1%/2%/3%。' }),

    skillAmpTrait({ key:'art_wl_demo_drain', tree:'demonology', name:'魔血汲能', icon:'😈', skill:'drainLife', dmgPct:[10,20,30], mod:{hpPct:2}, desc:'生命分流伤害提高 10/20/30%，并获得生命 +2%/4%/6%。' }),
    lowHpTrait({ key:'art_wl_demo_skin', tree:'demonology', name:'恶魔角壳', icon:'🧱', threshold:0.4, cooldown:30000, shieldPct:[0.05,0.09,0.13], mod:{defPct:2}, prereq:'art_wl_demo_drain', desc:'生命低于 40% 时，获得相当于 5%/9%/13% 最大生命的护盾，30秒冷却，并获得防御 +2%/4%/6%。' }),
    afterSkillTrait({ key:'art_wl_demo_feed', tree:'demonology', name:'邪能回流', icon:'🔗', skill:'drainLife', healPct:[0.02,0.04,0.06], mod:{atkPct:1}, prereq:'art_wl_demo_skin', desc:'施放生命分流后，额外恢复 2%/4%/6% 最大生命，并获得攻击 +1%/2%/3%。' }),
    whileBuffTrait({ key:'art_wl_demo_meta', tree:'demonology', name:'变身压制', icon:'👿', buffKey:'demonForm', dmgPct:[10,20,30], takenPct:[4,8,12], mod:{hpPct:2}, prereq:'art_wl_demo_feed', desc:'恶魔变身期间，造成的伤害提高 10/20/30%，受到的伤害降低 4/8/12%，并获得生命 +2%/4%/6%。' }),

    skillAmpTrait({ key:'art_wl_dest_fire', tree:'destruction', name:'焚城余烬', icon:'🔥', skill:['incinerate','chaosBolt'], dmgPct:[10,20,30], mod:{atkPct:1}, desc:'烧尽与混乱之箭伤害提高 10/20/30%，并获得攻击 +1%/2%/3%。' }),
    onCritTrait({ key:'art_wl_dest_crit', tree:'destruction', name:'混沌预燃', icon:'☄️', chance:[18,30,45], nextSkillCrit:[1,1,1], cooldown:7000, mod:{cdReduction:2}, prereq:'art_wl_dest_fire', desc:'暴击后有 18/30/45% 几率让下一次伤害技能必定暴击，7秒冷却，并获得技能冷却缩减 +2%/4%/6%。' }),
    afterSkillTrait({ key:'art_wl_dest_mark', tree:'destruction', name:'献祭催化', icon:'🌋', skill:'immolate', extraDmgPct:[0.12,0.2,0.3], mod:{dotBonus:3}, prereq:'art_wl_dest_crit', desc:'施放献祭后，额外造成本次伤害 12%/20%/30% 的灼烧追击，并获得持续伤害 +3%/6%/9%。' }),
    executeTrait({ key:'art_wl_dest_end', tree:'destruction', name:'末日焚决', icon:'💀', threshold:0.35, dmgPct:[12,24,36], mod:{atkPct:1}, prereq:'art_wl_dest_mark', desc:'对生命低于 35% 的目标造成的伤害提高 12/24/36%，并获得攻击 +1%/2%/3%。' }),
  ],
  druid: [
    skillAmpTrait({ key:'art_dru_bal_lunar', tree:'balance', name:'月潮轮转', icon:'🌙', skill:['moonfire','wrath','starfire'], dmgPct:[10,20,30], mod:{dotBonus:3}, desc:'月火术、愤怒与星火术伤害提高 10/20/30%，并获得持续伤害 +3%/6%/9%。' }),
    onCritTrait({ key:'art_dru_bal_dot', tree:'balance', name:'群星灼痕', icon:'⭐', applyDotPct:[0.08,0.12,0.18], dotMs:6000, mod:{atkPct:1}, prereq:'art_dru_bal_lunar', desc:'暴击时追加一层基于本次伤害 8%/12%/18% 的星辉灼烧，持续 6 秒，并获得攻击 +1%/2%/3%。' }),
    onKillTrait({ key:'art_dru_bal_flow', tree:'balance', name:'自然回声', icon:'🌿', resource:[4,8,12], mod:{cdReduction:2}, prereq:'art_dru_bal_dot', desc:'击杀敌人后回复 4/8/12 点资源，并获得技能冷却缩减 +2%/4%/6%。' }),
    vsStateTrait({ key:'art_dru_bal_eclipse', tree:'balance', name:'蚀刻星环', icon:'🪐', state:'dot', dmgPct:[10,20,30], mod:{atkPct:1}, prereq:'art_dru_bal_flow', desc:'对带有持续伤害效果的目标造成的伤害提高 10/20/30%，并获得攻击 +1%/2%/3%。' }),

    skillAmpTrait({ key:'art_dru_feral_bite', tree:'feral', name:'裂喉本能', icon:'🦷', skill:['bite','swipe'], dmgPct:[10,20,30], mod:{atkPct:1}, desc:'凶猛撕咬与横扫伤害提高 10/20/30%，并获得攻击 +1%/2%/3%。' }),
    onCritTrait({ key:'art_dru_feral_pounce', tree:'feral', name:'兽袭回扑', icon:'🐾', extraHitMul:[0.25,0.4,0.55], extraHitIcon:'🐺', cooldown:2500, mod:{spdPct:2}, prereq:'art_dru_feral_bite', desc:'暴击后追加一次 25%/40%/55% 伤害的撕咬追击，2.5秒冷却，并获得攻速 +2%/4%/6%。' }),
    onKillTrait({ key:'art_dru_feral_hunt', tree:'feral', name:'掠食回生', icon:'🩸', healPct:[0.03,0.05,0.07], mod:{hpPct:2}, prereq:'art_dru_feral_pounce', desc:'击杀敌人后恢复 3%/5%/7% 最大生命，并获得生命 +2%/4%/6%。' }),
    executeTrait({ key:'art_dru_feral_end', tree:'feral', name:'血牙终袭', icon:'🐺', threshold:0.35, dmgPct:[12,24,36], mod:{executeBonus:2}, prereq:'art_dru_feral_hunt', desc:'对生命低于 35% 的目标造成的伤害提高 12/24/36%，并获得斩杀加成 +2%/4%/6%。' }),

    afterHealTrait({ key:'art_dru_rest_seed', tree:'resto', name:'繁花种荫', icon:'🌺', overhealShieldPct:[0.2,0.35,0.5], mod:{healBonus:4}, desc:'你的过量治疗会转化为 20%/35%/50% 的吸收护盾，并获得治疗效果 +4%/8%/12%。' }),
    afterSkillTrait({ key:'art_dru_rest_rejuv', tree:'resto', name:'春芽回护', icon:'🍃', skill:['rejuvenation','wildGrowth'], shieldPct:[0.02,0.04,0.06], mod:{regFlat:1}, prereq:'art_dru_rest_seed', desc:'施放回春术或野性成长后，获得相当于 2%/4%/6% 最大生命的护盾，并获得回复 +1/2/3。' }),
    lowHpTrait({ key:'art_dru_rest_bloom', tree:'resto', name:'自然庇命', icon:'🌿', threshold:0.35, cooldown:30000, healPct:[0.05,0.09,0.13], shieldPct:[0.04,0.08,0.12], mod:{hpPct:2}, prereq:'art_dru_rest_rejuv', desc:'生命低于 35% 时，恢复 5%/9%/13% 最大生命并获得 4%/8%/12% 最大生命护盾，30秒冷却，同时获得生命 +2%/4%/6%。' }),
    whileBuffTrait({ key:'art_dru_rest_bark', tree:'resto', name:'树皮回春', icon:'🪵', buffKey:'bark', takenPct:[8,16,24], mod:{defPct:2}, prereq:'art_dru_rest_bloom', desc:'树皮术持续期间，受到的伤害额外降低 8/16/24%，并获得防御 +2%/4%/6%。' }),
  ],
};

const ARTIFACT_MILESTONES = {
  warrior: milestoneList('strPct'),
  mage: milestoneList('intPct'),
  priest: milestoneList('spiPct'),
  rogue: milestoneList('agiPct'),
  hunter: milestoneList('agiPct'),
  shaman: milestoneList('intPct'),
  paladin: milestoneList('strPct'),
  warlock: milestoneList('intPct'),
  druid: milestoneList('agiPct'),
};

function artifactTraitsForClass(clsKey) {
  return ARTIFACT_TRAITS[clsKey || state.cls] || [];
}
function artifactTreesForClass(clsKey) {
  return ARTIFACT_TREES[clsKey || state.cls] || {};
}
function artifactMilestonesForClass(clsKey) {
  return ARTIFACT_MILESTONES[clsKey || state.cls] || [];
}
function artifactTraitByKey(key, clsKey) {
  return artifactTraitsForClass(clsKey).find(x => x.key === key) || null;
}
function artifactTraitKeys(clsKey) {
  return new Set(artifactTraitsForClass(clsKey).map(t => t.key));
}
function artifactTraitDesc(t) {
  return typeof t.desc === 'function' ? t.desc() : (t.desc || '');
}
function artifactRankModText(t, rank) {
  const modText = Object.entries(t.mod || {}).map(([k, v]) => (typeof fmtMod === 'function') ? fmtMod(k, v * rank) : `${k}+${v * rank}`).join(' · ');
  return modText || '';
}

function ensureArtifactState() {
  if (!state.artifact) state.artifact = { lvl:0, ap:0, traits:{}, milestonesSeen:{} };
  if (!state.artifact.traits) state.artifact.traits = {};
  if (!state.artifact.milestonesSeen) state.artifact.milestonesSeen = {};
}

function artifactApNeeded(lvl) {
  if (lvl >= ARTIFACT_MAX_LVL) return Infinity;
  return Math.floor(100 + Math.pow(lvl, 1.8) * 50);
}

function artifactSpentPoints() {
  ensureArtifactState();
  const keys = artifactTraitKeys();
  let n = 0;
  for (const [key, rank] of Object.entries(state.artifact.traits || {})) {
    if (keys.has(key)) n += rank || 0;
  }
  return n;
}

function artifactPointsFree() {
  ensureArtifactState();
  return Math.max(0, (state.artifact.lvl || 0) - artifactSpentPoints());
}

function artifactUnlocked() {
  if (!state.cls || !state.hero) return false;
  if (state.artifact && (state.artifact.lvl || 0) > 0) return true;
  return state.hero.lvl >= ARTIFACT_UNLOCK_LVL;
}

function artifactPrereqMet(traitDef) {
  if (!traitDef || !traitDef.prereq) return true;
  return (state.artifact.traits[traitDef.prereq] || 0) >= 1;
}

function artifactGainAp(xpReward) {
  ensureArtifactState();
  if (!artifactUnlocked()) return;
  if (state.artifact.lvl >= ARTIFACT_MAX_LVL) return;
  const gain = Math.max(1, Math.floor(xpReward * 0.3));
  state.artifact.ap += gain;
  let leveled = false;
  while (state.artifact.lvl < ARTIFACT_MAX_LVL && state.artifact.ap >= artifactApNeeded(state.artifact.lvl)) {
    state.artifact.ap -= artifactApNeeded(state.artifact.lvl);
    state.artifact.lvl += 1;
    leveled = true;
    const art = ARTIFACTS[state.cls];
    log(`${art ? art.icon : '🗡️'} 神器升到 Lv.${state.artifact.lvl}! +1 神器点`, 'epic');
    const ms = artifactMilestonesForClass().find(m => m.lvl === state.artifact.lvl);
    if (ms && !state.artifact.milestonesSeen[state.artifact.lvl]) {
      state.artifact.milestonesSeen[state.artifact.lvl] = true;
      log(`✨ 神器里程碑【${ms.name}】解锁: ${ms.desc}`, 'legend');
    }
  }
  if (leveled) {
    recomputeStats();
    markDirty('artifact', 'hero');
  }
}

function artifactBuyTrait(key) {
  ensureArtifactState();
  const t = artifactTraitByKey(key);
  if (!t) return;
  const cur = state.artifact.traits[key] || 0;
  if (cur >= t.maxRank) { log('已满阶', 'bad'); return; }
  if (!artifactPrereqMet(t)) { log('前置未解锁', 'bad'); return; }
  if (artifactPointsFree() <= 0) { log('神器点数不足', 'bad'); return; }
  state.artifact.traits[key] = cur + 1;
  log(`✦ 神器特性: ${t.name} → ${cur + 1}/${t.maxRank}`, 'good');
  recomputeStats();
  markDirty('artifact', 'hero');
}

function artifactReset() {
  ensureArtifactState();
  const cost = 100;
  if (state.gem < cost) { log(`💎 重置神器需要 ${cost} 钻石`, 'bad'); return; }
  if (!confirm(`确定重置当前职业的神器特性? 消耗 ${cost} 💎。`)) return;
  state.gem -= cost;
  for (const key of artifactTraitKeys()) delete state.artifact.traits[key];
  log(`♻️ 神器特性已重置, 返还 ${state.artifact.lvl} 点`, 'good');
  recomputeStats();
  markDirty('artifact', 'hero');
}

function collectArtifactMod() {
  ensureArtifactState();
  const out = {
    atkPct:0, hpPct:0, defPct:0, critdPct:0, spdPct:0,
    crit:0, leech:0, vers:0, mastery:0,
    xpMult:0, goldMult:0, dropMult:0,
    regFlat:0, cdReduction:0, buffDuration:0, extraAtk:0,
    healBonus:0, dotBonus:0, costReduction:0, executeBonus:0,
    reflectDmg:0, armorPen:0, dodge:0, stunChance:0,
    strPct:0, agiPct:0, intPct:0, spiPct:0, staPct:0,
  };
  if (!artifactUnlocked()) return out;
  for (const t of artifactTraitsForClass()) {
    const rank = state.artifact.traits[t.key] || 0;
    if (rank <= 0) continue;
    for (const [k, v] of Object.entries(t.mod || {})) out[k] = (out[k] || 0) + v * rank;
  }
  for (const ms of artifactMilestonesForClass()) {
    if ((state.artifact.lvl || 0) < ms.lvl) continue;
    for (const [k, v] of Object.entries(ms.mod || {})) out[k] = (out[k] || 0) + v;
  }
  return out;
}

function collectArtifactFx() {
  ensureArtifactState();
  if (!artifactUnlocked()) return [];
  const out = [];
  for (const t of artifactTraitsForClass()) {
    const rank = state.artifact.traits[t.key] || 0;
    if (rank <= 0 || !t.fx) continue;
    for (const fx of asFxList(typeof t.fx === 'function' ? t.fx(rank) : t.fx)) {
      out.push(Object.assign({ artifactKey:t.key, artifactName:t.name, treeKey:t.tree, source:'artifact' }, fx));
    }
  }
  return out;
}

function renderArtifact() {
  ensureArtifactState();
  const root = $('tab-artifact');
  if (!root) return;
  if (!state.cls) { root.innerHTML = '<div class="muted">先创建角色</div>'; return; }
  if (!artifactUnlocked()) {
    const lockedIconHtml = (typeof symbolIcon === 'function') ? symbolIcon('🗡️', 28, '神器', 'inv_sword_39') : '🗡️';
    root.innerHTML = `<div class="ascend-box">
      <div style="font-size:14px;font-weight:bold;text-align:center;margin:20px 0">${lockedIconHtml} 神器尚未觉醒</div>
      <div class="muted" style="text-align:center">需达到 Lv.${ARTIFACT_UNLOCK_LVL} 才能开启专属神器</div>
    </div>`;
    return;
  }

  const art = ARTIFACTS[state.cls] || { name:'神器', icon:'🗡️', color:'#888' };
  const a = state.artifact;
  const need = artifactApNeeded(a.lvl);
  const pct = a.lvl >= ARTIFACT_MAX_LVL ? 100 : Math.floor((a.ap || 0) * 100 / Math.max(1, need));
  const free = artifactPointsFree();
  const spent = artifactSpentPoints();
  const artIconHtml = (typeof symbolIcon === 'function') ? symbolIcon(art.icon, 30, art.name, 'inv_sword_39') : art.icon;
  const lightningIconHtml = (typeof statusIcon === 'function') ? statusIcon('神器能量', '⚡', 12, 'spell_arcane_arcanepotency') : '⚡';

  let html = `<div class="ascend-box" style="border:1px solid ${art.color}">
    <div style="display:flex;align-items:center;gap:8px">
      <div style="font-size:30px">${artIconHtml}</div>
      <div style="flex:1">
        <div style="font-weight:bold;color:${art.color}">${art.name}</div>
        <div class="muted" style="font-size:11px">神器 Lv.${a.lvl}/${ARTIFACT_MAX_LVL} · 可用 <b style="color:var(--accent)">${free}</b> 点 · 已加 ${spent}</div>
      </div>
    </div>
    <div class="bar xp" style="margin:6px 0"><i style="width:${pct}%;background:${art.color}"></i><span>${a.lvl >= ARTIFACT_MAX_LVL ? 'MAX' : `${a.ap}/${need} AP`}</span></div>
    <div class="muted" style="font-size:10px">${lightningIconHtml} 每杀敌获得 30% XP 作为 AP · <button class="danger" data-action="artifactReset" style="float:right;padding:2px 8px;font-size:11px">重置 100💎</button></div>
  </div>`;

  const trees = artifactTreesForClass();
  for (const [treeKey, tree] of Object.entries(trees)) {
    const treeTraits = artifactTraitsForClass().filter(t => t.tree === treeKey);
    const treeIconHtml = (typeof symbolIcon === 'function') ? symbolIcon(tree.icon, 16, tree.name, 'spell_holy_powerinfusion') : tree.icon;
    html += `<div class="ascend-box" style="border-left:3px solid ${tree.color}">
      <div class="detail-label" style="color:${tree.color}">${treeIconHtml} ${tree.name}</div>`;
    for (const t of treeTraits) {
      const rank = a.traits[t.key] || 0;
      const prereqOk = artifactPrereqMet(t);
      const canBuy = prereqOk && rank < t.maxRank && free > 0;
      const prereq = t.prereq ? artifactTraitByKey(t.prereq) : null;
      const lockHint = (!prereqOk && prereq) ? `<span class="muted" style="font-size:10px">🔒 需 [${prereq.name}]</span>` : '';
      const currentText = artifactRankModText(t, rank);
      html += `<div class="ascend-milestone ${rank > 0 ? 'reached' : ''}" style="padding:6px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">
          <div style="min-width:0">
            <div><b>${t.icon || '✦'} ${t.name}</b> <span class="muted" style="font-size:10px">${rank}/${t.maxRank}</span> ${lockHint}</div>
            <div class="muted" style="font-size:10px;line-height:1.45">${artifactTraitDesc(t)}${currentText ? ` · 当前: ${currentText}` : ''}</div>
          </div>
          <button class="${canBuy ? 'success' : ''}" data-action="artifactBuy" data-key="${t.key}" ${canBuy ? '' : 'disabled'} style="padding:4px 10px">+</button>
        </div>
      </div>`;
    }
    html += `</div>`;
  }

  html += `<div class="ascend-box"><div class="detail-label">里程碑</div>`;
  for (const ms of artifactMilestonesForClass()) {
    const reached = (a.lvl || 0) >= ms.lvl;
    const modTxt = Object.entries(ms.mod || {}).map(([k, v]) => (typeof fmtMod === 'function') ? fmtMod(k, v) : `${k}+${v}`).join(' · ');
    html += `<div class="ascend-milestone ${reached ? 'reached' : ''}">
      <div><b>Lv.${ms.lvl} ${ms.name}</b> ${reached ? '<span class="r-legend">✓</span>' : '<span class="muted">🔒</span>'}</div>
      <div class="muted" style="font-size:10px;line-height:1.45">${ms.desc}${modTxt ? ` · ${modTxt}` : ''}</div>
    </div>`;
  }
  html += `</div>`;

  root.innerHTML = html;
}
