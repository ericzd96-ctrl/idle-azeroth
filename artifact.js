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
const ARTIFACT_MAX_LVL = 120;            // 软上限(留给无限特性长线);点满核心树约需 ~20 点
const ARTIFACT_AP_RATE = 0.05;           // 杀怪 XP → AP 转化率(旧版 0.30,收紧)
const ARTIFACT_CORE_GATE = 8;            // 解锁核心三选一前,需在本树次要节点累计花费的点数

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
    afterSkillTrait({ key:'art_war_arms_mark', tree:'arms', name:'处决节律', icon:'💀', skill:'sunderArmor', chance:[30,55,80], nextSkillCrit:[1,1,1], mod:{cdReduction:2}, prereq:'art_war_arms_sunder', desc:'施放破甲攻击后有 30/55/80% 几率让下一次伤害技能必定暴击，并获得技能冷却缩减 +2%/4%/6%。' }),
    executeTrait({ key:'art_war_arms_finish', tree:'arms', name:'终幕裁决', icon:'🪓', threshold:0.45, dmgPct:[12,24,36], mod:{atkPct:1}, prereq:'art_war_arms_mark', desc:'对生命低于 45% 的目标造成的伤害提高 12/24/36%，并获得攻击 +1%/2%/3%。' }),

    skillAmpTrait({ key:'art_war_fury_blood', tree:'fury', name:'血潮双刃', icon:'🩸', skill:'bloodthirst', dmgPct:[12,24,36], mod:{spdPct:2}, desc:'嗜血伤害提高 12/24/36%，并获得攻速 +2%/4%/6%。' }),
    onCritTrait({ key:'art_war_fury_rush', tree:'fury', name:'狂怒回响', icon:'🔥', extraHitMul:[0.22,0.34,0.46], extraHitIcon:'⚔️', cooldown:2500, mod:{atkPct:1}, prereq:'art_war_fury_blood', desc:'暴击后追加一次 22%/34%/46% 伤害的追击，2.5秒冷却，并获得攻击 +1%/2%/3%。' }),
    onKillTrait({ key:'art_war_fury_hunt', tree:'fury', name:'战吼回流', icon:'📯', healPct:[0.03,0.05,0.07], resource:[4,8,12], mod:{hpPct:2}, prereq:'art_war_fury_rush', desc:'击杀敌人后恢复 3%/5%/7% 最大生命并回复 4/8/12 点资源，获得生命 +2%/4%/6%。' }),
    afterSkillTrait({ key:'art_war_fury_reset', tree:'fury', name:'嗜血不息', icon:'😡', skill:'bloodthirst', chance:[10,18,26], resetSkill:'bloodthirst', mod:{spdPct:2}, prereq:'art_war_fury_hunt', desc:'施放嗜血后有 10/18/26% 几率立刻重置嗜血冷却，并获得攻速 +2%/4%/6%。' }),

    whileBuffTrait({ key:'art_war_prot_wall', tree:'prot', name:'坚壁压阵', icon:'🛡️', buffKey:'shield', takenPct:[8,16,24], mod:{defPct:2}, desc:'盾墙持续期间，受到的伤害额外降低 8/16/24%，并获得防御 +2%/4%/6%。' }),
    bossTrait({ key:'art_war_prot_boss', tree:'prot', name:'统御前线', icon:'👑', dmgPct:[6,12,18], takenPct:[4,8,12], mod:{hpPct:2}, prereq:'art_war_prot_wall', desc:'对首领造成的伤害提高 6/12/18%，受到其伤害降低 4/8/12%，并获得生命 +2%/4%/6%。' }),
    lowHpTrait({ key:'art_war_prot_guard', tree:'prot', name:'背水壁垒', icon:'🧱', threshold:0.4, cooldown:30000, shieldPct:[0.05,0.09,0.13], mod:{defPct:2}, prereq:'art_war_prot_boss', desc:'生命低于 40% 时，获得相当于 5%/9%/13% 最大生命的护盾，30秒冷却，并获得防御 +2%/4%/6%。' }),
    afterSkillTrait({ key:'art_war_prot_punish', tree:'prot', name:'盾反压制', icon:'🔨', skill:'sunderArmor', extraDmgPct:[0.1,0.18,0.28], mod:{reflectDmg:2}, prereq:'art_war_prot_guard', desc:'施放破甲攻击后，额外造成本次伤害 10%/18%/28% 的压制伤害，并获得反伤 +2%/4%/6%。' }),
  ],
  mage: [
    skillAmpTrait({ key:'art_mage_arc_blast', tree:'arcane', name:'法网回路', icon:'✨', skill:'arcane', dmgPct:[10,20,30], mod:{intPct:2}, desc:'奥术飞弹伤害提高 10/20/30%，并获得智力 +2%/4%/6%。' }),
    afterSkillTrait({ key:'art_mage_arc_mana', tree:'arcane', name:'法力回收', icon:'🔮', skill:'arcane', resource:[4,8,12], mod:{costReduction:3}, prereq:'art_mage_arc_blast', desc:'施放奥术飞弹后回复 4/8/12 点资源，并获得减耗 +3%/6%/9%。' }),
    onCritTrait({ key:'art_mage_arc_echo', tree:'arcane', name:'奥能回响', icon:'💥', skill:['arcane','arcaneExplosion'], extraHitMul:[0.24,0.36,0.48], extraHitIcon:'✨', cooldown:3000, mod:{cdReduction:2}, prereq:'art_mage_arc_mana', desc:'奥术技能暴击后追加一次 24%/36%/48% 伤害的奥能回响，3秒冷却，并获得技能冷却缩减 +2%/4%/6%。' }),
    bossTrait({ key:'art_mage_arc_siege', tree:'arcane', name:'法阵收束', icon:'🪞', dmgPct:[8,16,24], mod:{atkPct:1}, prereq:'art_mage_arc_echo', desc:'对首领造成的伤害提高 8/16/24%，并获得攻击 +1%/2%/3%。' }),

    skillAmpTrait({ key:'art_mage_fire_ball', tree:'fire', name:'灼心余焰', icon:'🔥', skill:'fireball', dmgPct:[10,20,30], mod:{dotBonus:3}, desc:'火球术伤害提高 10/20/30%，并获得持续伤害 +3%/6%/9%。' }),
    onCritTrait({ key:'art_mage_fire_ignite', tree:'fire', name:'余烬翻涌', icon:'☄️', applyDotPct:[0.08,0.12,0.18], dotMs:6000, mod:{atkPct:1}, prereq:'art_mage_fire_ball', desc:'暴击时追加一层基于本次伤害 8%/12%/18% 的灼烧，持续 6 秒，并获得攻击 +1%/2%/3%。' }),
    afterSkillTrait({ key:'art_mage_fire_chain', tree:'fire', name:'热能连发', icon:'🔥', skill:'fireball', chance:[15,28,40], nextSkillCrit:[1,1,1], mod:{cdReduction:2}, prereq:'art_mage_fire_ignite', desc:'施放火球术后有 15/28/40% 几率让下一次伤害技能必定暴击，并获得技能冷却缩减 +2%/4%/6%。' }),
    executeTrait({ key:'art_mage_fire_finish', tree:'fire', name:'焦灼终焉', icon:'🌋', threshold:0.35, dmgPct:[12,24,36], mod:{atkPct:1}, prereq:'art_mage_fire_chain', desc:'对生命低于 35% 的目标造成的伤害提高 12/24/36%，并获得攻击 +1%/2%/3%。' }),

    skillAmpTrait({ key:'art_mage_frost_bolt', tree:'frost', name:'霜脉裂片', icon:'❄️', skill:'frostbolt', dmgPct:[10,20,30], mod:{defPct:2}, desc:'寒冰箭伤害提高 10/20/30%，并获得防御 +2%/4%/6%。' }),
    vsStateTrait({ key:'art_mage_frost_slow', tree:'frost', name:'冻伤锁定', icon:'🧊', state:'slow', dmgPct:[10,20,30], mod:{spdPct:2}, prereq:'art_mage_frost_bolt', desc:'对被减速目标造成的伤害提高 10/20/30%，并获得攻速 +2%/4%/6%。' }),
    lowHpTrait({ key:'art_mage_frost_barrier', tree:'frost', name:'极寒护体', icon:'🛡️', threshold:0.45, cooldown:30000, shieldPct:[0.05,0.1,0.15], mod:{defPct:2}, prereq:'art_mage_frost_slow', desc:'生命低于 45% 时，获得相当于 5%/10%/15% 最大生命的护盾，30秒冷却，并获得防御 +2%/4%/6%。' }),
    onCritTrait({ key:'art_mage_frost_echo', tree:'frost', name:'冰凌追击', icon:'🌨️', skill:['frostbolt','blizzard'], extraHitMul:[0.25,0.4,0.55], extraHitIcon:'❄️', cooldown:3000, mod:{atkPct:1}, prereq:'art_mage_frost_barrier', desc:'冰霜技能暴击后追加一次 25%/40%/55% 伤害的冰凌追击，3秒冷却，并获得攻击 +1%/2%/3%。' }),
  ],
  priest: [
    skillAmpTrait({ key:'art_pri_disc_wrath', tree:'discipline', name:'赎罪烙印', icon:'✝️', skill:['smite','mindBlast'], dmgPct:[10,20,30], mod:{healBonus:3}, desc:'惩击与心灵震爆伤害提高 10/20/30%，并获得治疗效果 +3%/6%/9%。' }),
    afterHealTrait({ key:'art_pri_disc_shell', tree:'discipline', name:'灵魂回护', icon:'🛡️', overhealShieldPct:[0.35,0.5,0.65], mod:{defPct:2}, prereq:'art_pri_disc_wrath', desc:'你的过量治疗会转化为 35%/50%/65% 的吸收护盾，并获得防御 +2%/4%/6%。' }),
    afterSkillTrait({ key:'art_pri_disc_shield', tree:'discipline', name:'苦修慰藉', icon:'💚', skill:'shield', healPct:[0.03,0.06,0.09], mod:{regFlat:1}, prereq:'art_pri_disc_shell', desc:'施放真言术盾后，立刻恢复 3%/6%/9% 最大生命，并获得回复 +1/2/3。' }),
    lowHpTrait({ key:'art_pri_disc_save', tree:'discipline', name:'神佑临界', icon:'🕊️', threshold:0.38, cooldown:30000, healPct:[0.06,0.1,0.14], shieldPct:[0.06,0.1,0.14], mod:{hpPct:2}, prereq:'art_pri_disc_shield', desc:'生命低于 38% 时，恢复 6%/10%/14% 最大生命并获得等量护盾，30秒冷却，同时获得生命 +2%/4%/6%。' }),

    afterSkillTrait({ key:'art_pri_holy_light', tree:'holy', name:'晨辉余温', icon:'✨', skill:['heal','renew','divineHymn'], shieldPct:[0.03,0.06,0.09], mod:{healBonus:4}, desc:'施放治疗术、恢复或神圣赞美诗后，获得相当于 3%/6%/9% 最大生命的护盾，并获得治疗效果 +4%/8%/12%。' }),
    afterHealTrait({ key:'art_pri_holy_over', tree:'holy', name:'圣光盈余', icon:'🌟', overhealShieldPct:[0.35,0.5,0.65], mod:{regFlat:1}, prereq:'art_pri_holy_light', desc:'你的过量治疗会转化为 35%/50%/65% 的吸收护盾，并获得回复 +1/2/3。' }),
    afterSkillTrait({ key:'art_pri_holy_judgement', tree:'holy', name:'圣言回声', icon:'💫', skill:'smite', healPct:[0.03,0.06,0.09], mod:{intPct:2}, prereq:'art_pri_holy_over', desc:'施放惩击后，恢复 3%/6%/9% 最大生命，并获得智力 +2%/4%/6%。' }),
    lowHpTrait({ key:'art_pri_holy_last', tree:'holy', name:'守护天启', icon:'👼', threshold:0.35, cooldown:30000, healPct:[0.08,0.12,0.16], shieldPct:[0.05,0.08,0.12], mod:{hpPct:2}, prereq:'art_pri_holy_judgement', desc:'生命低于 35% 时，恢复 8%/12%/16% 最大生命并获得 5%/8%/12% 最大生命护盾，30秒冷却，同时获得生命 +2%/4%/6%。' }),

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
    onCritTrait({ key:'art_rog_combat_echo', tree:'combat', name:'双刃回荡', icon:'🗡️', extraHitMul:[0.2,0.32,0.44], extraHitIcon:'⚔️', cooldown:2500, mod:{extraAtk:1}, prereq:'art_rog_combat_blade', desc:'暴击后追加一次 20%/32%/44% 伤害的追击，2.5秒冷却，并获得额外攻击 +1%/2%/3%。' }),
    afterSkillTrait({ key:'art_rog_combat_flow', tree:'combat', name:'无尽连势', icon:'💨', skill:['sinister','backstab'], resource:[5,10,15], mod:{cdReduction:2}, prereq:'art_rog_combat_echo', desc:'施放邪恶打击或背刺后回复 5/10/15 点资源，并获得技能冷却缩减 +2%/4%/6%。' }),
    bossTrait({ key:'art_rog_combat_boss', tree:'combat', name:'猎首本能', icon:'🎯', dmgPct:[6,12,18], mod:{atkPct:1}, prereq:'art_rog_combat_flow', desc:'对首领造成的伤害提高 6/12/18%，并获得攻击 +1%/2%/3%。' }),

    skillAmpTrait({ key:'art_rog_sub_mark', tree:'subtlety', name:'影裂刻痕', icon:'👤', skill:['killingSpree','deathMark'], dmgPct:[10,20,30], mod:{executeBonus:2}, desc:'杀戮盛宴与死亡标记伤害提高 10/20/30%，并获得斩杀加成 +2%/4%/6%。' }),
    afterSkillTrait({ key:'art_rog_sub_shadow', tree:'subtlety', name:'影遁伏杀', icon:'🌑', skill:'shadow', nextSkillCrit:[1,1,1], mod:{atkPct:1}, prereq:'art_rog_sub_mark', desc:'施放影遁后，下一次伤害技能必定暴击，并获得攻击 +1%/2%/3%。' }),
    executeTrait({ key:'art_rog_sub_exec', tree:'subtlety', name:'喉切终结', icon:'🪢', threshold:0.35, dmgPct:[12,24,36], mod:{atkPct:1}, prereq:'art_rog_sub_shadow', desc:'对生命低于 35% 的目标造成的伤害提高 12/24/36%，并获得攻击 +1%/2%/3%。' }),
    onKillTrait({ key:'art_rog_sub_reset', tree:'subtlety', name:'夜行复归', icon:'🌘', resource:[6,12,18], resetSkill:'shadow', mod:{cdReduction:2}, prereq:'art_rog_sub_exec', desc:'击杀敌人后回复 6/12/18 点资源，并重置影遁冷却，同时获得技能冷却缩减 +2%/4%/6%。' }),
  ],
  hunter: [
    whileBuffTrait({ key:'art_hun_bm_wrath', tree:'bm', name:'兽群狂吼', icon:'🦁', buffKey:'bestial', dmgPct:[10,20,30], mod:{atkPct:1}, desc:'狂野怒火持续期间，你造成的伤害提高 10/20/30%，并获得攻击 +1%/2%/3%。' }),
    onKillTrait({ key:'art_hun_bm_feed', tree:'bm', name:'猎群进食', icon:'🐾', resource:[5,10,15], mod:{hpPct:2}, prereq:'art_hun_bm_wrath', desc:'击杀敌人后回复 5/10/15 点资源，并获得生命 +2%/4%/6%。' }),
    afterSkillTrait({ key:'art_hun_bm_stamp', tree:'bm', name:'怒兽践踏', icon:'🦬', skill:'bestialWrath', extraDmgPct:[0.12,0.2,0.3], mod:{extraAtk:1}, prereq:'art_hun_bm_feed', desc:'施放狂野怒火后，额外造成本次伤害 12%/20%/30% 的践踏伤害，并获得额外攻击 +1%/2%/3%。' }),
    bossTrait({ key:'art_hun_bm_predator', tree:'bm', name:'顶级猎食者', icon:'👑', dmgPct:[8,16,24], mod:{atkPct:1}, prereq:'art_hun_bm_stamp', desc:'对首领造成的伤害提高 8/16/24%，并获得攻击 +1%/2%/3%。' }),

    skillAmpTrait({ key:'art_hun_mark_aimed', tree:'marks', name:'狙心轨迹', icon:'🎯', skill:'aimed', dmgPct:[10,20,30], mod:{atkPct:1}, desc:'瞄准射击伤害提高 10/20/30%，并获得攻击 +1%/2%/3%。' }),
    executeTrait({ key:'art_hun_mark_kill', tree:'marks', name:'断息猎杀', icon:'💀', threshold:0.4, dmgPct:[12,24,36], mod:{executeBonus:2}, prereq:'art_hun_mark_aimed', desc:'对生命低于 40% 的目标造成的伤害提高 12/24/36%，并获得斩杀加成 +2%/4%/6%。' }),
    onCritTrait({ key:'art_hun_mark_burst', tree:'marks', name:'连珠补射', icon:'🏹', skill:['aimed','arcaneShot'], extraHitMul:[0.24,0.36,0.48], extraHitIcon:'🎯', cooldown:3000, mod:{cdReduction:2}, prereq:'art_hun_mark_kill', desc:'瞄准射击或奥术射击暴击后，追加一次 24%/36%/48% 伤害的补射，3秒冷却，并获得技能冷却缩减 +2%/4%/6%。' }),
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
    onCritTrait({ key:'art_sha_enh_chain', tree:'enhancement', name:'双风怒袭', icon:'⚔️', extraHitMul:[0.24,0.36,0.48], extraHitIcon:'💨', cooldown:2500, mod:{extraAtk:1}, prereq:'art_sha_enh_wind', desc:'暴击后追加一次 24%/36%/48% 伤害的风怒追击，2.5秒冷却，并获得额外攻击 +1%/2%/3%。' }),
    onKillTrait({ key:'art_sha_enh_flow', tree:'enhancement', name:'战意回潮', icon:'🩸', resource:[5,10,15], mod:{atkPct:1}, prereq:'art_sha_enh_chain', desc:'击杀敌人后回复 5/10/15 点资源，并获得攻击 +1%/2%/3%。' }),
    afterSkillTrait({ key:'art_sha_enh_reset', tree:'enhancement', name:'漩涡借势', icon:'🌀', skill:'windfury', nextSkillCrit:[1,1,1], mod:{cdReduction:2}, prereq:'art_sha_enh_flow', desc:'施放风怒武器后，下一次伤害技能必定暴击，并获得技能冷却缩减 +2%/4%/6%。' }),

    afterHealTrait({ key:'art_sha_rest_shield', tree:'restoration', name:'潮汐护膜', icon:'🌊', overhealShieldPct:[0.32,0.48,0.64], mod:{healBonus:4}, desc:'你的过量治疗会转化为 32%/48%/64% 的吸收护盾，并获得治疗效果 +4%/8%/12%。' }),
    afterSkillTrait({ key:'art_sha_rest_wave', tree:'restoration', name:'泉涌回护', icon:'💚', skill:['healingWave','spiritLink'], shieldPct:[0.03,0.06,0.09], mod:{regFlat:1}, prereq:'art_sha_rest_shield', desc:'施放治疗波或灵魂链接后，获得相当于 3%/6%/9% 最大生命的护盾，并获得回复 +1/2/3。' }),
    lowHpTrait({ key:'art_sha_rest_save', tree:'restoration', name:'先祖拯护', icon:'🪨', threshold:0.35, cooldown:30000, healPct:[0.07,0.11,0.15], shieldPct:[0.06,0.1,0.14], mod:{hpPct:2}, prereq:'art_sha_rest_wave', desc:'生命低于 35% 时，恢复 7%/11%/15% 最大生命并获得 6%/10%/14% 最大生命护盾，30秒冷却，同时获得生命 +2%/4%/6%。' }),
    afterSkillTrait({ key:'art_sha_rest_bless', tree:'restoration', name:'激流余响', icon:'🔗', skill:'healingWave', resource:[6,10,14], mod:{cdReduction:2}, prereq:'art_sha_rest_save', desc:'施放治疗波后回复 6/10/14 点资源，并获得技能冷却缩减 +2%/4%/6%。' }),
  ],
  paladin: [
    afterHealTrait({ key:'art_pal_holy_beacon', tree:'holy', name:'晨曦回护', icon:'✨', overhealShieldPct:[0.35,0.5,0.65], mod:{healBonus:4}, desc:'你的过量治疗会转化为 35%/50%/65% 的吸收护盾，并获得治疗效果 +4%/8%/12%。' }),
    afterSkillTrait({ key:'art_pal_holy_light', tree:'holy', name:'圣辉余温', icon:'💫', skill:['holyLight','flashOfLight'], shieldPct:[0.03,0.06,0.09], mod:{regFlat:1}, prereq:'art_pal_holy_beacon', desc:'施放圣光术或圣光闪现后，获得相当于 3%/6%/9% 最大生命的护盾，并获得回复 +1/2/3。' }),
    lowHpTrait({ key:'art_pal_holy_last', tree:'holy', name:'黎明垂恩', icon:'🌅', threshold:0.35, cooldown:30000, healPct:[0.08,0.12,0.16], shieldPct:[0.05,0.08,0.12], mod:{hpPct:2}, prereq:'art_pal_holy_light', desc:'生命低于 35% 时，恢复 8%/12%/16% 最大生命并获得 5%/8%/12% 最大生命护盾，30秒冷却，同时获得生命 +2%/4%/6%。' }),
    afterSkillTrait({ key:'art_pal_holy_judge', tree:'holy', name:'审判赐福', icon:'⚖️', skill:'judgement', healPct:[0.03,0.06,0.09], mod:{intPct:2}, prereq:'art_pal_holy_last', desc:'施放审判后，恢复 3%/6%/9% 最大生命，并获得智力 +2%/4%/6%。' }),

    whileBuffTrait({ key:'art_pal_prot_shield', tree:'prot', name:'圣佑壁城', icon:'🛡️', buffKey:'divine', takenPct:[8,16,24], mod:{defPct:2}, desc:'圣盾术持续期间，受到的伤害额外降低 8/16/24%，并获得防御 +2%/4%/6%。' }),
    bossTrait({ key:'art_pal_prot_guard', tree:'prot', name:'裁决守势', icon:'👑', dmgPct:[6,12,18], takenPct:[4,8,12], mod:{hpPct:2}, prereq:'art_pal_prot_shield', desc:'对首领造成的伤害提高 6/12/18%，受到其伤害降低 4/8/12%，并获得生命 +2%/4%/6%。' }),
    afterSkillTrait({ key:'art_pal_prot_judge', tree:'prot', name:'圣锤回震', icon:'🔨', skill:'judgement', holyDmgPct:[0.12,0.2,0.3], mod:{defPct:2}, prereq:'art_pal_prot_guard', desc:'施放审判后，额外造成本次伤害 12%/20%/30% 的神圣追击，并获得防御 +2%/4%/6%。' }),
    lowHpTrait({ key:'art_pal_prot_last', tree:'prot', name:'壁垒圣誓', icon:'💠', threshold:0.4, cooldown:30000, shieldPct:[0.05,0.09,0.13], mod:{hpPct:2}, prereq:'art_pal_prot_judge', desc:'生命低于 40% 时，获得相当于 5%/9%/13% 最大生命的护盾，30秒冷却，并获得生命 +2%/4%/6%。' }),

    skillAmpTrait({ key:'art_pal_ret_burst', tree:'ret', name:'裁决锋芒', icon:'⚔️', skill:['judgement','crusader','consecration'], dmgPct:[10,20,30], mod:{atkPct:1}, desc:'审判、十字军打击与奉献伤害提高 10/20/30%，并获得攻击 +1%/2%/3%。' }),
    executeTrait({ key:'art_pal_ret_exec', tree:'ret', name:'圣裁终章', icon:'😇', threshold:0.35, dmgPct:[10,20,30], mod:{executeBonus:2}, prereq:'art_pal_ret_burst', desc:'对生命低于 35% 的目标造成的伤害提高 10/20/30%，并获得斩杀加成 +2%/4%/6%。' }),
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
    onCritTrait({ key:'art_dru_feral_pounce', tree:'feral', name:'兽袭回扑', icon:'🐾', extraHitMul:[0.22,0.34,0.46], extraHitIcon:'🐺', cooldown:2500, mod:{spdPct:2}, prereq:'art_dru_feral_bite', desc:'暴击后追加一次 22%/34%/46% 伤害的撕咬追击，2.5秒冷却，并获得攻速 +2%/4%/6%。' }),
    onKillTrait({ key:'art_dru_feral_hunt', tree:'feral', name:'掠食回生', icon:'🩸', healPct:[0.03,0.05,0.07], mod:{hpPct:2}, prereq:'art_dru_feral_pounce', desc:'击杀敌人后恢复 3%/5%/7% 最大生命，并获得生命 +2%/4%/6%。' }),
    executeTrait({ key:'art_dru_feral_end', tree:'feral', name:'血牙终袭', icon:'🐺', threshold:0.35, dmgPct:[12,24,36], mod:{executeBonus:2}, prereq:'art_dru_feral_hunt', desc:'对生命低于 35% 的目标造成的伤害提高 12/24/36%，并获得斩杀加成 +2%/4%/6%。' }),

    afterHealTrait({ key:'art_dru_rest_seed', tree:'resto', name:'繁花种荫', icon:'🌺', overhealShieldPct:[0.32,0.48,0.64], mod:{healBonus:4}, desc:'你的过量治疗会转化为 32%/48%/64% 的吸收护盾，并获得治疗效果 +4%/8%/12%。' }),
    afterSkillTrait({ key:'art_dru_rest_rejuv', tree:'resto', name:'春芽回护', icon:'🍃', skill:['rejuvenation','wildGrowth'], shieldPct:[0.03,0.06,0.09], mod:{regFlat:1}, prereq:'art_dru_rest_seed', desc:'施放回春术或野性成长后，获得相当于 3%/6%/9% 最大生命的护盾，并获得回复 +1/2/3。' }),
    lowHpTrait({ key:'art_dru_rest_bloom', tree:'resto', name:'自然庇命', icon:'🌿', threshold:0.35, cooldown:30000, healPct:[0.07,0.11,0.15], shieldPct:[0.06,0.1,0.14], mod:{hpPct:2}, prereq:'art_dru_rest_rejuv', desc:'生命低于 35% 时，恢复 7%/11%/15% 最大生命并获得 6%/10%/14% 最大生命护盾，30秒冷却，同时获得生命 +2%/4%/6%。' }),
    whileBuffTrait({ key:'art_dru_rest_bark', tree:'resto', name:'树皮回春', icon:'🪵', buffKey:'bark', takenPct:[10,18,26], mod:{defPct:2}, prereq:'art_dru_rest_bloom', desc:'树皮术持续期间，受到的伤害额外降低 10/18/26%，并获得防御 +2%/4%/6%。' }),
  ],
};

/* =========================================================
   新版 per-spec 神器内容
   - 每专精一把神器,一棵专属树(分两条支路) + 核心三选一 + 无限特性
   - 次要节点复用上方 ARTIFACT_TRAITS(每专精 4 个)
   - SPEC_EXTRA_MINORS: 给指定专精追加次要节点(战士样板 +2/专精 → 6 个)
   - SPEC_CAPSTONES: 核心三选一(战士手写;其余职业用 GENERIC_CAPSTONES)
   ========================================================= */

// 神器身份(战士手写;其余职业由 ARTIFACTS + 树名派生)
const SPEC_ARTIFACT_IDENTITY = {
  warrior: {
    arms: { name:'斯特拉之颌·灰烬使者', icon:'⚔️', color:'#ef4444' },
    fury: { name:'瓦拉加双刃', icon:'🔥', color:'#f97316' },
    prot: { name:'守护之鳞·大地之怒', icon:'🛡️', color:'#3b82f6' },
  },
  mage: {
    arcane: { name:'阿鲁尼斯·魔导师巨杖', icon:'🔮', color:'#8b5cf6' },
    fire:   { name:'斐瑞斯托玛',          icon:'🔥', color:'#ef4444' },
    frost:  { name:'埃博奇尔·艾洛迪之杖',  icon:'❄️', color:'#38bdf8' },
  },
  priest: {
    discipline: { name:'光明之愿杖',       icon:'✝️', color:'#fbbf24' },
    holy:       { name:'图尔·纳鲁的信标',  icon:'🕊️', color:'#fde68a' },
    shadow:     { name:'萨拉塔斯·黑暗帝国之刃', icon:'🌀', color:'#8b5cf6' },
  },
  rogue: {
    assassination: { name:'弑君者',        icon:'🗡️', color:'#84cc16' },
    combat:        { name:'恐惧之刃',      icon:'⚔️', color:'#f97316' },
    subtlety:      { name:'噬魂者之牙',    icon:'🌑', color:'#6366f1' },
  },
  hunter: {
    bm:       { name:'泰坦之击',           icon:'⚡', color:'#65a30d' },
    marks:    { name:'萨多哈尔·风行者的遗产', icon:'🎯', color:'#f59e0b' },
    survival: { name:'鹰爪',               icon:'🦅', color:'#14b8a6' },
  },
  shaman: {
    element:     { name:'拉登之拳',        icon:'⚡', color:'#60a5fa' },
    enhancement: { name:'毁灭之锤',        icon:'💨', color:'#f97316' },
    restoration: { name:'莎拉达尔·潮汐之杖', icon:'🌊', color:'#22c55e' },
  },
  paladin: {
    holy: { name:'白银之手',               icon:'✨', color:'#fde68a' },
    prot: { name:'真理之守',               icon:'🛡️', color:'#60a5fa' },
    ret:  { name:'灰烬使者',               icon:'⚔️', color:'#f43f5e' },
  },
  warlock: {
    affliction:  { name:'乌索勒什·逐风者之镰', icon:'🟣', color:'#8b5cf6' },
    demonology:  { name:'曼阿里头骨',      icon:'😈', color:'#ec4899' },
    destruction: { name:'萨格拉斯之杖',    icon:'🔥', color:'#ef4444' },
  },
  druid: {
    balance: { name:'埃露恩之镰',          icon:'🌙', color:'#6366f1' },
    feral:   { name:'阿莎曼之牙',          icon:'🐆', color:'#f97316' },
    resto:   { name:'吉哈尔·母树',         icon:'🌳', color:'#22c55e' },
  },
};

// 追加次要节点(战士每专精 +2,凑成 6 个次要 → 两条支路各 3)
const SPEC_EXTRA_MINORS = {
  warrior: {
    arms: [
      onKillTrait({ key:'art_war_arms_ex_tempo', tree:'arms', name:'战场韵律', icon:'🥁', healPct:[0.02,0.04,0.06], resource:[4,8,12], mod:{spdPct:1}, desc:'击杀敌人后恢复 2%/4%/6% 最大生命并回复 4/8/12 点资源,并获得攻速 +1%/2%/3%。' }),
      bossTrait({ key:'art_war_arms_ex_domin', tree:'arms', name:'主宰之势', icon:'👑', dmgPct:[6,12,18], mod:{atkPct:1}, desc:'对首领造成的伤害提高 6/12/18%,并获得攻击 +1%/2%/3%。' }),
    ],
    fury: [
      executeTrait({ key:'art_war_fury_ex_slay', tree:'fury', name:'嗜杀本能', icon:'🩸', threshold:0.35, dmgPct:[10,20,30], mod:{atkPct:1}, desc:'对生命低于 35% 的目标造成的伤害提高 10/20/30%,并获得攻击 +1%/2%/3%。' }),
      lowHpTrait({ key:'art_war_fury_ex_blood', tree:'fury', name:'血色护盾', icon:'🛡️', threshold:0.4, cooldown:30000, shieldPct:[0.05,0.09,0.13], mod:{hpPct:2}, desc:'生命低于 40% 时,获得相当于 5%/9%/13% 最大生命的护盾,30秒冷却,并获得生命 +2%/4%/6%。' }),
    ],
    prot: [
      onKillTrait({ key:'art_war_prot_ex_hold', tree:'prot', name:'镇守回复', icon:'💚', healPct:[0.03,0.05,0.07], mod:{defPct:1}, desc:'击杀敌人后恢复 3%/5%/7% 最大生命,并获得防御 +1%/2%/3%。' }),
      vsStateTrait({ key:'art_war_prot_ex_crush', tree:'prot', name:'碎甲突进', icon:'🔨', state:'sunder', dmgPct:[8,16,24], mod:{atkPct:1}, desc:'对被破甲目标造成的伤害提高 8/16/24%,并获得攻击 +1%/2%/3%。' }),
    ],
  },
};

// 核心三选一(战士手写;每项 = 一种 build 方向)
function capstone(cfg){ return Object.assign({ maxRank:1, mod:{}, fx:null }, cfg); }
const SPEC_CAPSTONES = {
  warrior: {
    arms: [
      capstone({ key:'cap_arms_titan', name:'泰坦之握', icon:'💥', dir:'爆发', mod:{critdPct:25, atkPct:4}, fx:{ type:'onCrit', extraHitMul:0.6, extraHitIcon:'⚔️', cooldown:2000 }, desc:'【爆发】暴击伤害 +25% · 攻击 +4%;暴击后追加一次 60% 伤害的强力追击(2秒冷却)。' }),
      capstone({ key:'cap_arms_reaper', name:'死神镰歌', icon:'💀', dir:'斩杀', mod:{executeBonus:6, atkPct:3}, fx:{ type:'executeWindow', threshold:0.5, dmgPct:50 }, desc:'【斩杀】斩杀加成 +6% · 攻击 +3%;对生命低于 50% 的目标造成的伤害提高 50%。' }),
      capstone({ key:'cap_arms_warlord', name:'不败战将', icon:'🛡️', dir:'生存', mod:{defPct:5, hpPct:6}, fx:{ type:'vsBoss', dmgPct:10, takenPct:12 }, desc:'【生存】防御 +5% · 生命 +6%;对首领伤害 +10%,受其伤害 -12%。' }),
    ],
    fury: [
      capstone({ key:'cap_fury_blood', name:'血之狂澜', icon:'🩸', dir:'爆发', mod:{spdPct:5, atkPct:3}, fx:{ type:'onCrit', extraHitMul:0.5, extraHitIcon:'🩸', cooldown:1500 }, desc:'【爆发】攻速 +5% · 攻击 +3%;暴击后追加一次 50% 伤害的狂乱追击(1.5秒冷却)。' }),
      capstone({ key:'cap_fury_undying', name:'不灭狂怒', icon:'♾️', dir:'生存', mod:{hpPct:6, defPct:3}, fx:{ type:'lowHp', threshold:0.4, shieldPct:0.16, cooldown:25000 }, desc:'【生存】生命 +6% · 防御 +3%;生命低于 40% 时获得 16% 最大生命护盾(25秒冷却)。' }),
      capstone({ key:'cap_fury_rampage', name:'无尽杀戮', icon:'🔥', dir:'持续', mod:{atkPct:5}, fx:{ type:'onKill', healPct:0.06, resource:14 }, desc:'【持续】攻击 +5%;击杀敌人后恢复 6% 最大生命并回复 14 点资源。' }),
    ],
    prot: [
      capstone({ key:'cap_prot_bulwark', name:'不破壁垒', icon:'🧱', dir:'格挡', mod:{defPct:6, hpPct:5}, fx:{ type:'whileBuff', buffKey:'shield', takenPct:25 }, desc:'【格挡】防御 +6% · 生命 +5%;盾墙持续期间受到的伤害额外降低 25%。' }),
      capstone({ key:'cap_prot_avenger', name:'以盾还击', icon:'🔨', dir:'反击', mod:{reflectDmg:6, atkPct:3}, fx:{ type:'afterSkill', skill:'sunderArmor', extraDmgPct:0.4 }, desc:'【反击】反伤 +6% · 攻击 +3%;施放破甲攻击后额外造成本次伤害 40% 的压制伤害。' }),
      capstone({ key:'cap_prot_guardian', name:'磐石守护', icon:'⛰️', dir:'坦克', mod:{hpPct:8, defPct:3}, fx:{ type:'vsBoss', dmgPct:8, takenPct:15 }, desc:'【坦克】生命 +8% · 防御 +3%;对首领伤害 +8%,受其伤害 -15%。' }),
    ],
  },
  mage: {
    arcane: [
      capstone({ key:'cap_mag_arcane_burst', name:'奥能涌动', icon:'💥', dir:'爆发', mod:{critdPct:20, atkPct:3}, fx:{ type:'onCrit', extraHitMul:0.55, extraHitIcon:'✨', cooldown:2000 }, desc:'【爆发】暴伤 +20% · 攻击 +3%;暴击后追加一次 55% 伤害的奥能追击(2秒冷却)。' }),
      capstone({ key:'cap_mag_arcane_boss', name:'法阵聚焦', icon:'🪞', dir:'攻坚', mod:{atkPct:4, critdPct:12}, fx:{ type:'vsBoss', dmgPct:14 }, desc:'【攻坚】攻击 +4% · 暴伤 +12%;对首领造成的伤害提高 14%。' }),
      capstone({ key:'cap_mag_arcane_charge', name:'法网共鸣', icon:'🔷', dir:'招牌', mod:{atkPct:3, critdPct:8}, fx:{ type:'auraStackAmp', auraKey:'arcaneCharge', dmgPctPerStack:10 }, desc:'【招牌·奥术充能】每层【奥术充能】使你造成的伤害提高 10%(最多3层 +30%);攻击 +3% · 暴伤 +8%。' }),
    ],
    fire: [
      capstone({ key:'cap_mag_fire_heat', name:'炽焰共鸣', icon:'🔥', dir:'招牌', mod:{atkPct:3, critdPct:8}, fx:{ type:'auraStackAmp', auraKey:'m_heat', dmgPctPerStack:6 }, desc:'【招牌·炽热】每层【炽热】使你造成的伤害提高 6%(最多5层 +30%);攻击 +3% · 暴伤 +8%。' }),
      capstone({ key:'cap_mag_fire_dot', name:'余烬燎原', icon:'☄️', dir:'灼蚀', mod:{dotBonus:4, atkPct:2}, fx:{ type:'vsState', state:'dot', dmgPct:25 }, desc:'【灼蚀】持续伤害 +4% · 攻击 +2%;对带有灼烧的目标造成的伤害提高 25%。' }),
      capstone({ key:'cap_mag_fire_exec', name:'焚尽', icon:'🌋', dir:'斩杀', mod:{executeBonus:6, atkPct:3}, fx:{ type:'executeWindow', threshold:0.5, dmgPct:45 }, desc:'【斩杀】斩杀加成 +6% · 攻击 +3%;对生命低于 50% 的目标伤害 +45%。' }),
    ],
    frost: [
      capstone({ key:'cap_mag_frost_fingers', name:'寒冰共鸣', icon:'❄️', dir:'招牌', mod:{atkPct:3, critdPct:8}, fx:{ type:'auraStackAmp', auraKey:'m_frost', dmgPctPerStack:6 }, desc:'【招牌·指尖寒冰】每层【指尖寒冰】使你造成的伤害提高 6%(最多5层 +30%);攻击 +3% · 暴伤 +8%。' }),
      capstone({ key:'cap_mag_frost_slow', name:'彻骨严寒', icon:'🧊', dir:'控制', mod:{spdPct:3, atkPct:2}, fx:{ type:'vsState', state:'slow', dmgPct:25 }, desc:'【控制】攻速 +3% · 攻击 +2%;对被减速目标造成的伤害提高 25%。' }),
      capstone({ key:'cap_mag_frost_guard', name:'寒冰护体', icon:'🛡️', dir:'生存', mod:{defPct:5, hpPct:5}, fx:{ type:'lowHp', threshold:0.4, shieldPct:0.14, cooldown:25000 }, desc:'【生存】防御 +5% · 生命 +5%;生命低于 40% 时获得 14% 最大生命护盾(25秒冷却)。' }),
    ],
  },
  priest: {
    discipline: [
      capstone({ key:'cap_pri_disc_shield', name:'救赎护壁', icon:'🛡️', dir:'守护', mod:{hpPct:6, healBonus:6}, fx:{ type:'lowHp', threshold:0.45, shieldPct:0.12, healPct:0.1, cooldown:25000 }, desc:'【守护】生命 +6% · 治疗 +6%;生命低于 45% 时恢复 10% 生命并获得 12% 护盾(25秒冷却)。' }),
      capstone({ key:'cap_pri_disc_flow', name:'仁慈涌泉', icon:'💧', dir:'续航', mod:{healBonus:8, atkPct:2}, fx:{ type:'onKill', healPct:0.06, resource:12 }, desc:'【续航】治疗 +8% · 攻击 +2%;击杀敌人后恢复 6% 生命并回复 12 点资源。' }),
      capstone({ key:'cap_pri_disc_boss', name:'戒律坚守', icon:'⚖️', dir:'坚壁', mod:{hpPct:8, defPct:3}, fx:{ type:'vsBoss', takenPct:14, dmgPct:6 }, desc:'【坚壁】生命 +8% · 防御 +3%;对首领伤害 +6%,受其伤害 -14%。' }),
    ],
    holy: [
      capstone({ key:'cap_pri_holy_shield', name:'圣愈壁垒', icon:'🛡️', dir:'守护', mod:{hpPct:6, healBonus:6}, fx:{ type:'lowHp', threshold:0.45, shieldPct:0.12, healPct:0.1, cooldown:25000 }, desc:'【守护】生命 +6% · 治疗 +6%;生命低于 45% 时恢复 10% 生命并获得 12% 护盾(25秒冷却)。' }),
      capstone({ key:'cap_pri_holy_flow', name:'圣光不息', icon:'✨', dir:'续航', mod:{healBonus:8, atkPct:2}, fx:{ type:'onKill', healPct:0.06, resource:12 }, desc:'【续航】治疗 +8% · 攻击 +2%;击杀敌人后恢复 6% 生命并回复 12 点资源。' }),
      capstone({ key:'cap_pri_holy_guard', name:'神圣庇护', icon:'👼', dir:'坚壁', mod:{hpPct:8, defPct:3}, fx:{ type:'vsBoss', takenPct:14, dmgPct:6 }, desc:'【坚壁】生命 +8% · 防御 +3%;对首领伤害 +6%,受其伤害 -14%。' }),
    ],
    shadow: [
      capstone({ key:'cap_pri_shadow_insanity', name:'疯狂共鸣', icon:'🌀', dir:'招牌', mod:{atkPct:3, critdPct:8}, fx:{ type:'auraStackAmp', auraKey:'p_insanity', dmgPctPerStack:5 }, desc:'【招牌·疯狂】每层【疯狂】使你造成的伤害提高 5%(最多6层 +30%);攻击 +3% · 暴伤 +8%。' }),
      capstone({ key:'cap_pri_shadow_dot', name:'暗影蔓延', icon:'🌑', dir:'灼蚀', mod:{dotBonus:4, atkPct:2}, fx:{ type:'vsState', state:'dot', dmgPct:25 }, desc:'【灼蚀】持续伤害 +4% · 攻击 +2%;对带有持续伤害的目标造成的伤害提高 25%。' }),
      capstone({ key:'cap_pri_shadow_exec', name:'湮灭', icon:'☠️', dir:'斩杀', mod:{executeBonus:6, atkPct:3}, fx:{ type:'executeWindow', threshold:0.5, dmgPct:45 }, desc:'【斩杀】斩杀加成 +6% · 攻击 +3%;对生命低于 50% 的目标伤害 +45%。' }),
    ],
  },
  rogue: {
    assassination: [
      capstone({ key:'cap_rog_assn_venom', name:'毒锋共鸣', icon:'🐍', dir:'招牌', mod:{atkPct:3, critdPct:8}, fx:{ type:'auraStackAmp', auraKey:'r_venom', dmgPctPerStack:6 }, desc:'【招牌·毒锋】每层【毒锋】使你造成的伤害提高 6%(最多5层 +30%);攻击 +3% · 暴伤 +8%。' }),
      capstone({ key:'cap_rog_assn_dot', name:'毒囊横流', icon:'☠️', dir:'灼蚀', mod:{dotBonus:4, atkPct:2}, fx:{ type:'vsState', state:'dot', dmgPct:25 }, desc:'【灼蚀】持续伤害 +4% · 攻击 +2%;对中毒/流血的目标造成的伤害提高 25%。' }),
      capstone({ key:'cap_rog_assn_exec', name:'见血封喉', icon:'🩸', dir:'斩杀', mod:{executeBonus:6, atkPct:3}, fx:{ type:'executeWindow', threshold:0.5, dmgPct:45 }, desc:'【斩杀】斩杀加成 +6% · 攻击 +3%;对生命低于 50% 的目标伤害 +45%。' }),
    ],
    combat: [
      capstone({ key:'cap_rog_combat_combo', name:'连击共鸣', icon:'🔆', dir:'招牌', mod:{atkPct:3, spdPct:3}, fx:{ type:'auraStackAmp', auraKey:'r_combo', dmgPctPerStack:6 }, desc:'【招牌·连击点】每层【连击点】使你造成的伤害提高 6%(最多5层 +30%);攻击 +3% · 攻速 +3%。' }),
      capstone({ key:'cap_rog_combat_flow', name:'浴血连势', icon:'🔥', dir:'持续', mod:{atkPct:5}, fx:{ type:'onKill', healPct:0.05, resource:14 }, desc:'【持续】攻击 +5%;击杀敌人后恢复 5% 生命并回复 14 点资源。' }),
      capstone({ key:'cap_rog_combat_exec', name:'终结', icon:'💀', dir:'斩杀', mod:{executeBonus:6, atkPct:3}, fx:{ type:'executeWindow', threshold:0.5, dmgPct:45 }, desc:'【斩杀】斩杀加成 +6% · 攻击 +3%;对生命低于 50% 的目标伤害 +45%。' }),
    ],
    subtlety: [
      capstone({ key:'cap_rog_sub_combo', name:'背袭共鸣', icon:'🔆', dir:'招牌', mod:{atkPct:3, critdPct:8}, fx:{ type:'auraStackAmp', auraKey:'r_combo', dmgPctPerStack:6 }, desc:'【招牌·连击点】每层【连击点】使你造成的伤害提高 6%(最多5层 +30%);攻击 +3% · 暴伤 +8%。' }),
      capstone({ key:'cap_rog_sub_exec', name:'喉切', icon:'🪢', dir:'斩杀', mod:{executeBonus:7, atkPct:3}, fx:{ type:'executeWindow', threshold:0.5, dmgPct:50 }, desc:'【斩杀】斩杀加成 +7% · 攻击 +3%;对生命低于 50% 的目标伤害 +50%。' }),
      capstone({ key:'cap_rog_sub_boss', name:'猎首', icon:'🎯', dir:'攻坚', mod:{atkPct:5, critdPct:10}, fx:{ type:'vsBoss', dmgPct:14 }, desc:'【攻坚】攻击 +5% · 暴伤 +10%;对首领造成的伤害提高 14%。' }),
    ],
  },
  hunter: {
    bm: [
      capstone({ key:'cap_hun_bm_frenzy', name:'野性共鸣', icon:'🐾', dir:'招牌', mod:{atkPct:3, critdPct:8}, fx:{ type:'auraStackAmp', auraKey:'h_frenzy', dmgPctPerStack:6 }, desc:'【招牌·野兽狂怒】每层【野兽狂怒】使你造成的伤害提高 6%(最多5层 +30%);攻击 +3% · 暴伤 +8%。' }),
      capstone({ key:'cap_hun_bm_flow', name:'兽群盛宴', icon:'🐾', dir:'持续', mod:{atkPct:5}, fx:{ type:'onKill', healPct:0.05, resource:14 }, desc:'【持续】攻击 +5%;击杀敌人后恢复 5% 生命并回复 14 点资源。' }),
      capstone({ key:'cap_hun_bm_boss', name:'顶级猎食', icon:'👑', dir:'攻坚', mod:{atkPct:5, critdPct:10}, fx:{ type:'vsBoss', dmgPct:14 }, desc:'【攻坚】攻击 +5% · 暴伤 +10%;对首领造成的伤害提高 14%。' }),
    ],
    marks: [
      capstone({ key:'cap_hun_marks_command', name:'杀戮号令', icon:'🎯', dir:'招牌', mod:{atkPct:3, critdPct:10}, fx:{ type:'whileBuff', buffKey:'h_burst', dmgPct:30 }, desc:'【招牌·杀戮命令】杀戮命令(爆发)持续期间, 你造成的伤害提高 30%;攻击 +3% · 暴伤 +10%。' }),
      capstone({ key:'cap_hun_marks_exec', name:'断头狙杀', icon:'💀', dir:'斩杀', mod:{executeBonus:7, atkPct:3}, fx:{ type:'executeWindow', threshold:0.5, dmgPct:50 }, desc:'【斩杀】斩杀加成 +7% · 攻击 +3%;对生命低于 50% 的目标伤害 +50%。' }),
      capstone({ key:'cap_hun_marks_boss', name:'猎物标记', icon:'🔍', dir:'攻坚', mod:{atkPct:5, critdPct:10}, fx:{ type:'vsBoss', dmgPct:14 }, desc:'【攻坚】攻击 +5% · 暴伤 +10%;对首领造成的伤害提高 14%。' }),
    ],
    survival: [
      capstone({ key:'cap_hun_surv_command', name:'猎杀号令', icon:'🦅', dir:'招牌', mod:{atkPct:3, spdPct:4}, fx:{ type:'whileBuff', buffKey:'h_burst', dmgPct:28 }, desc:'【招牌·杀戮命令】杀戮命令(爆发)持续期间, 你造成的伤害提高 28%;攻击 +3% · 攻速 +4%。' }),
      capstone({ key:'cap_hun_surv_dot', name:'陷阱毒伤', icon:'☠️', dir:'灼蚀', mod:{dotBonus:4, atkPct:2}, fx:{ type:'vsState', state:'dot', dmgPct:25 }, desc:'【灼蚀】持续伤害 +4% · 攻击 +2%;对带有持续伤害的目标造成的伤害提高 25%。' }),
      capstone({ key:'cap_hun_surv_guard', name:'荒野生存', icon:'🪤', dir:'生存', mod:{defPct:5, hpPct:5}, fx:{ type:'lowHp', threshold:0.4, shieldPct:0.14, cooldown:25000 }, desc:'【生存】防御 +5% · 生命 +5%;生命低于 40% 时获得 14% 最大生命护盾(25秒冷却)。' }),
    ],
  },
  shaman: {
    element: [
      capstone({ key:'cap_sha_ele_storm', name:'雷霆共鸣', icon:'⚡', dir:'招牌', mod:{atkPct:3, critdPct:8}, fx:{ type:'auraStackAmp', auraKey:'stormCharge', dmgPctPerStack:10 }, desc:'【招牌·雷霆充能】每层【雷霆充能】使你造成的伤害提高 10%(最多3层 +30%);攻击 +3% · 暴伤 +8%。' }),
      capstone({ key:'cap_sha_ele_boss', name:'雷霆聚焦', icon:'🌩️', dir:'攻坚', mod:{atkPct:4, critdPct:12}, fx:{ type:'vsBoss', dmgPct:14 }, desc:'【攻坚】攻击 +4% · 暴伤 +12%;对首领造成的伤害提高 14%。' }),
      capstone({ key:'cap_sha_ele_flow', name:'元素回响', icon:'🌀', dir:'持续', mod:{atkPct:5}, fx:{ type:'onKill', healPct:0.05, resource:12 }, desc:'【持续】攻击 +5%;击杀敌人后恢复 5% 生命并回复 12 点资源。' }),
    ],
    enhancement: [
      capstone({ key:'cap_sha_enh_maelstrom', name:'漩涡共鸣', icon:'🌀', dir:'招牌', mod:{atkPct:3, spdPct:3}, fx:{ type:'auraStackAmp', auraKey:'sh_maelstrom', dmgPctPerStack:6 }, desc:'【招牌·漩涡之力】每层【漩涡之力】使你造成的伤害提高 6%(最多5层 +30%);攻击 +3% · 攻速 +3%。' }),
      capstone({ key:'cap_sha_enh_flow', name:'战意奔涌', icon:'🩸', dir:'持续', mod:{atkPct:5}, fx:{ type:'onKill', healPct:0.05, resource:14 }, desc:'【持续】攻击 +5%;击杀敌人后恢复 5% 生命并回复 14 点资源。' }),
      capstone({ key:'cap_sha_enh_exec', name:'雷霆终结', icon:'💀', dir:'斩杀', mod:{executeBonus:6, atkPct:3}, fx:{ type:'executeWindow', threshold:0.5, dmgPct:45 }, desc:'【斩杀】斩杀加成 +6% · 攻击 +3%;对生命低于 50% 的目标伤害 +45%。' }),
    ],
    restoration: [
      capstone({ key:'cap_sha_rest_shield', name:'潮汐护壁', icon:'🛡️', dir:'守护', mod:{hpPct:6, healBonus:6}, fx:{ type:'lowHp', threshold:0.45, shieldPct:0.12, healPct:0.1, cooldown:25000 }, desc:'【守护】生命 +6% · 治疗 +6%;生命低于 45% 时恢复 10% 生命并获得 12% 护盾(25秒冷却)。' }),
      capstone({ key:'cap_sha_rest_flow', name:'生命之泉', icon:'💧', dir:'续航', mod:{healBonus:8, atkPct:2}, fx:{ type:'onKill', healPct:0.06, resource:12 }, desc:'【续航】治疗 +8% · 攻击 +2%;击杀敌人后恢复 6% 生命并回复 12 点资源。' }),
      capstone({ key:'cap_sha_rest_guard', name:'先祖庇护', icon:'🪨', dir:'坚壁', mod:{hpPct:8, defPct:3}, fx:{ type:'vsBoss', takenPct:14, dmgPct:6 }, desc:'【坚壁】生命 +8% · 防御 +3%;对首领伤害 +6%,受其伤害 -14%。' }),
    ],
  },
  paladin: {
    holy: [
      capstone({ key:'cap_pal_holy_shield', name:'圣愈壁垒', icon:'🛡️', dir:'守护', mod:{hpPct:6, healBonus:6}, fx:{ type:'lowHp', threshold:0.45, shieldPct:0.12, healPct:0.1, cooldown:25000 }, desc:'【守护】生命 +6% · 治疗 +6%;生命低于 45% 时恢复 10% 生命并获得 12% 护盾(25秒冷却)。' }),
      capstone({ key:'cap_pal_holy_flow', name:'圣恩不息', icon:'✨', dir:'续航', mod:{healBonus:8, atkPct:2}, fx:{ type:'onKill', healPct:0.06, resource:12 }, desc:'【续航】治疗 +8% · 攻击 +2%;击杀敌人后恢复 6% 生命并回复 12 点资源。' }),
      capstone({ key:'cap_pal_holy_guard', name:'神圣庇护', icon:'👼', dir:'坚壁', mod:{hpPct:8, defPct:3}, fx:{ type:'vsBoss', takenPct:14, dmgPct:6 }, desc:'【坚壁】生命 +8% · 防御 +3%;对首领伤害 +6%,受其伤害 -14%。' }),
    ],
    prot: [
      capstone({ key:'cap_pal_prot_guard', name:'圣盾壁垒', icon:'🛡️', dir:'生存', mod:{defPct:5, hpPct:6}, fx:{ type:'lowHp', threshold:0.4, shieldPct:0.15, cooldown:25000 }, desc:'【生存】防御 +5% · 生命 +6%;生命低于 40% 时获得 15% 最大生命护盾(25秒冷却)。' }),
      capstone({ key:'cap_pal_prot_boss', name:'正义壁垒', icon:'⛰️', dir:'坚壁', mod:{hpPct:8, defPct:3}, fx:{ type:'vsBoss', takenPct:15, dmgPct:8 }, desc:'【坚壁】生命 +8% · 防御 +3%;对首领伤害 +8%,受其伤害 -15%。' }),
      capstone({ key:'cap_pal_prot_flow', name:'奉献回复', icon:'💚', dir:'持续', mod:{defPct:4, hpPct:3}, fx:{ type:'onKill', healPct:0.06, resource:10 }, desc:'【持续】防御 +4% · 生命 +3%;击杀敌人后恢复 6% 生命并回复 10 点资源。' }),
    ],
    ret: [
      capstone({ key:'cap_pal_ret_holypower', name:'圣能共鸣', icon:'⚜️', dir:'招牌', mod:{atkPct:3, critdPct:8}, fx:{ type:'auraStackAmp', auraKey:'pa_holyPower', dmgPctPerStack:6 }, desc:'【招牌·圣能】每层【圣能】使你造成的伤害提高 6%(最多5层 +30%);攻击 +3% · 暴伤 +8%。' }),
      capstone({ key:'cap_pal_ret_exec', name:'终极审判', icon:'😇', dir:'斩杀', mod:{executeBonus:6, atkPct:3}, fx:{ type:'executeWindow', threshold:0.5, dmgPct:45 }, desc:'【斩杀】斩杀加成 +6% · 攻击 +3%;对生命低于 50% 的目标伤害 +45%。' }),
      capstone({ key:'cap_pal_ret_boss', name:'制裁强敌', icon:'⚖️', dir:'攻坚', mod:{atkPct:5, critdPct:10}, fx:{ type:'vsBoss', dmgPct:14 }, desc:'【攻坚】攻击 +5% · 暴伤 +10%;对首领造成的伤害提高 14%。' }),
    ],
  },
  warlock: {
    affliction: [
      capstone({ key:'cap_wl_aff_dot', name:'灵魂腐蚀', icon:'☠️', dir:'灼蚀', mod:{dotBonus:5, atkPct:2}, fx:{ type:'vsState', state:'dot', dmgPct:28 }, desc:'【灼蚀】持续伤害 +5% · 攻击 +2%;对带有持续伤害的目标造成的伤害提高 28%。' }),
      capstone({ key:'cap_wl_aff_shard', name:'碎片共鸣', icon:'💜', dir:'招牌', mod:{atkPct:3, dotBonus:4}, fx:{ type:'auraStackAmp', auraKey:'wl_shard', dmgPctPerStack:6 }, desc:'【招牌·灵魂碎片】每层【灵魂碎片】使你造成的伤害提高 6%(最多5层 +30%);攻击 +3% · 持续伤害 +4%。' }),
      capstone({ key:'cap_wl_aff_exec', name:'痛苦终结', icon:'💜', dir:'斩杀', mod:{executeBonus:6, atkPct:3}, fx:{ type:'executeWindow', threshold:0.5, dmgPct:45 }, desc:'【斩杀】斩杀加成 +6% · 攻击 +3%;对生命低于 50% 的目标伤害 +45%。' }),
    ],
    demonology: [
      capstone({ key:'cap_wl_demo_darksoul', name:'黑暗灵魂', icon:'😈', dir:'招牌', mod:{atkPct:3, critdPct:10}, fx:{ type:'whileBuff', buffKey:'wl_dark', dmgPct:30 }, desc:'【招牌·黑暗灵魂】黑暗灵魂(爆发)持续期间, 你造成的伤害提高 30%;攻击 +3% · 暴伤 +10%。' }),
      capstone({ key:'cap_wl_demo_boss', name:'恶魔统御', icon:'👿', dir:'攻坚', mod:{atkPct:5, hpPct:3}, fx:{ type:'vsBoss', dmgPct:14 }, desc:'【攻坚】攻击 +5% · 生命 +3%;对首领造成的伤害提高 14%。' }),
      capstone({ key:'cap_wl_demo_guard', name:'魔壳护体', icon:'🧱', dir:'生存', mod:{defPct:5, hpPct:5}, fx:{ type:'lowHp', threshold:0.4, shieldPct:0.14, cooldown:25000 }, desc:'【生存】防御 +5% · 生命 +5%;生命低于 40% 时获得 14% 最大生命护盾(25秒冷却)。' }),
    ],
    destruction: [
      capstone({ key:'cap_wl_dest_ember', name:'余烬共鸣', icon:'🔥', dir:'招牌', mod:{atkPct:3, critdPct:8}, fx:{ type:'auraStackAmp', auraKey:'wl_ember', dmgPctPerStack:6 }, desc:'【招牌·余烬】每层【余烬】使你造成的伤害提高 6%(最多5层 +30%);攻击 +3% · 暴伤 +8%。' }),
      capstone({ key:'cap_wl_dest_exec', name:'末日焚决', icon:'💀', dir:'斩杀', mod:{executeBonus:6, atkPct:3}, fx:{ type:'executeWindow', threshold:0.5, dmgPct:45 }, desc:'【斩杀】斩杀加成 +6% · 攻击 +3%;对生命低于 50% 的目标伤害 +45%。' }),
      capstone({ key:'cap_wl_dest_boss', name:'灼烧强敌', icon:'🌋', dir:'攻坚', mod:{atkPct:5, critdPct:10}, fx:{ type:'vsBoss', dmgPct:14 }, desc:'【攻坚】攻击 +5% · 暴伤 +10%;对首领造成的伤害提高 14%。' }),
    ],
  },
  druid: {
    balance: [
      capstone({ key:'cap_dru_bal_astral', name:'星界共鸣', icon:'🌗', dir:'招牌', mod:{atkPct:3, critdPct:8}, fx:{ type:'auraStackAmp', auraKey:'d_astral', dmgPctPerStack:6 }, desc:'【招牌·星界能量】每层【星界能量】使你造成的伤害提高 6%(最多5层 +30%);攻击 +3% · 暴伤 +8%。' }),
      capstone({ key:'cap_dru_bal_dot', name:'月蚀灼烧', icon:'🌙', dir:'灼蚀', mod:{dotBonus:4, atkPct:2}, fx:{ type:'vsState', state:'dot', dmgPct:25 }, desc:'【灼蚀】持续伤害 +4% · 攻击 +2%;对带有持续伤害的目标造成的伤害提高 25%。' }),
      capstone({ key:'cap_dru_bal_boss', name:'星界聚焦', icon:'🪐', dir:'攻坚', mod:{atkPct:4, critdPct:12}, fx:{ type:'vsBoss', dmgPct:14 }, desc:'【攻坚】攻击 +4% · 暴伤 +12%;对首领造成的伤害提高 14%。' }),
    ],
    feral: [
      capstone({ key:'cap_dru_feral_combo', name:'裂伤共鸣', icon:'🐾', dir:'招牌', mod:{atkPct:3, spdPct:3}, fx:{ type:'auraStackAmp', auraKey:'d_combo', dmgPctPerStack:6 }, desc:'【招牌·撕咬连击】每层【撕咬连击】使你造成的伤害提高 6%(最多5层 +30%);攻击 +3% · 攻速 +3%。' }),
      capstone({ key:'cap_dru_feral_dot', name:'血牙撕裂', icon:'🩸', dir:'灼蚀', mod:{dotBonus:4, atkPct:2}, fx:{ type:'vsState', state:'dot', dmgPct:25 }, desc:'【灼蚀】持续伤害 +4% · 攻击 +2%;对流血的目标造成的伤害提高 25%。' }),
      capstone({ key:'cap_dru_feral_exec', name:'血牙终袭', icon:'🐺', dir:'斩杀', mod:{executeBonus:6, atkPct:3}, fx:{ type:'executeWindow', threshold:0.5, dmgPct:45 }, desc:'【斩杀】斩杀加成 +6% · 攻击 +3%;对生命低于 50% 的目标伤害 +45%。' }),
    ],
    resto: [
      capstone({ key:'cap_dru_resto_shield', name:'繁花护壁', icon:'🛡️', dir:'守护', mod:{hpPct:6, healBonus:6}, fx:{ type:'lowHp', threshold:0.45, shieldPct:0.12, healPct:0.1, cooldown:25000 }, desc:'【守护】生命 +6% · 治疗 +6%;生命低于 45% 时恢复 10% 生命并获得 12% 护盾(25秒冷却)。' }),
      capstone({ key:'cap_dru_resto_flow', name:'生命绽放', icon:'🌺', dir:'续航', mod:{healBonus:8, atkPct:2}, fx:{ type:'onKill', healPct:0.06, resource:12 }, desc:'【续航】治疗 +8% · 攻击 +2%;击杀敌人后恢复 6% 生命并回复 12 点资源。' }),
      capstone({ key:'cap_dru_resto_guard', name:'自然庇护', icon:'🌿', dir:'坚壁', mod:{hpPct:8, defPct:3}, fx:{ type:'vsBoss', takenPct:14, dmgPct:6 }, desc:'【坚壁】生命 +8% · 防御 +3%;对首领伤害 +6%,受其伤害 -14%。' }),
    ],
  },
};

// 通用核心三选一(尚未手写专属内容的职业)
const GENERIC_CAPSTONES = [
  capstone({ key:'cap_gen_offense', name:'湮灭核心', icon:'💥', dir:'爆发', mod:{atkPct:6, critdPct:15}, fx:{ type:'vsBoss', dmgPct:12 }, desc:'【爆发】攻击 +6% · 暴伤 +15%;对首领造成的伤害提高 12%。' }),
  capstone({ key:'cap_gen_defense', name:'壁垒核心', icon:'🛡️', dir:'生存', mod:{defPct:6, hpPct:6}, fx:{ type:'lowHp', threshold:0.4, shieldPct:0.13, cooldown:25000 }, desc:'【生存】防御 +6% · 生命 +6%;生命低于 40% 时获得 13% 最大生命护盾(25秒冷却)。' }),
  capstone({ key:'cap_gen_sustain', name:'不竭核心', icon:'🔥', dir:'持续', mod:{spdPct:4, atkPct:3}, fx:{ type:'onKill', healPct:0.05, resource:10 }, desc:'【持续】攻速 +4% · 攻击 +3%;击杀敌人后恢复 5% 最大生命并回复 10 点资源。' }),
];

// 无限特性(所有专精共用;核心点完后开放,可无限叠,吃溢出 AP)
const ARTIFACT_INFINITE = {
  key:'art_infinite', name:'神器共鸣', icon:'♾️',
  perRank:{ atkPct:0.5, hpPct:0.6, defPct:0.4 },
  desc:'每阶: 攻击 +0.5% · 生命 +0.6% · 防御 +0.4%(可无限提升,消耗溢出神器点)',
};

/* 神器招牌技能(由"神器觉醒"入门节点解锁, 自动释放不占技能栏, 阶数=威力档位)
   战士参考 WoW 军团神器主动技; 其余职业用 _generic, 后续逐职业替换 */
const ARTIFACT_SKILLS = {
  _generic: { name:'神器爆发', icon:'✦', cd:20, mul:[3,4,5], aoe:true, desc:'释放神器之力, 对全体敌人造成 ATK× 伤害。' },
  warrior: {
    arms: { name:'破城', icon:'🪓', cd:16, mul:[3,4,5], aoe:true, sunder:true, desc:'横扫全体敌人, 造成 ATK× 伤害并破甲(防御-30%, 15秒)。' },          // Warbreaker
    fury: { name:'奥丁之怒', icon:'🔥', cd:20, mul:[4,5.5,7], aoe:true, desc:'引爆奥丁之怒, 对全体敌人造成 ATK× 烈焰爆发伤害。' },                    // Odyn's Fury
    prot: { name:'死翼之怒', icon:'🐲', cd:18, mul:[2.5,3.5,4.5], selfShieldPct:0.08, desc:'喷吐烈焰对焦点造成 ATK× 伤害, 并获得 8%/12%/16% 最大生命的吸收护盾。' },     // Neltharion's Fury
  },
  mage: {
    arcane: { name:'阿鲁尼斯印记', icon:'🔮', cd:18, mul:[3,4,5],     aoe:true, desc:'对全体敌人烙下奥术印记爆发, 造成 ATK× 奥术伤害。' },
    fire:   { name:'凤凰烈焰',     icon:'🔥', cd:16, mul:[3.5,4.5,5.5], aoe:true, desc:'召唤凤凰扑击全体敌人, 造成 ATK× 烈焰伤害。' },
    frost:  { name:'乌玄之珠',     icon:'❄️', cd:14, mul:[3,4,5],               desc:'凝聚乌玄冰晶轰击焦点, 造成 ATK× 冰霜伤害。' },
  },
  priest: {
    discipline: { name:'光明之怒', icon:'✝️', cd:18, mul:[2.5,3.5,4.5], healPct:0.06, desc:'倾泻光明之怒打击焦点造成 ATK× 神圣伤害并回复生命。' },
    holy:       { name:'图尔的恩泽', icon:'🕊️', cd:20, mul:[1.5,2,2.5], healPct:0.1, selfShieldPct:0.06, desc:'沐浴纳鲁圣光, 对焦点造成 ATK× 伤害并大幅回复生命与护盾。' },
    shadow:     { name:'虚空洪流', icon:'🌀', cd:16, mul:[3.5,4.5,6],            desc:'引导虚空洪流灌注焦点, 造成 ATK× 暗影伤害。' },
  },
  rogue: {
    assassination: { name:'弑君者', icon:'🗡️', cd:16, mul:[3,4,5],              desc:'以弑君之毒刺入焦点, 造成 ATK× 自然伤害。' },
    combat:        { name:'恐惧之刃', icon:'⚔️', cd:14, mul:[2.5,3.5,4.5], aoe:true, desc:'恐惧之刃横扫全体敌人, 造成 ATK× 物理伤害。' },
    subtlety:      { name:'血喉之噬', icon:'🌑', cd:18, mul:[4,5,6],             desc:'血喉巨口吞噬焦点, 造成 ATK× 暗影伤害。' },
  },
  hunter: {
    bm:       { name:'泰坦之雷', icon:'⚡', cd:18, mul:[3,4,5],       aoe:true, desc:'引动泰坦之雷劈击全体敌人, 造成 ATK× 自然伤害。' },
    marks:    { name:'风暴迸发', icon:'🎯', cd:14, mul:[3.5,4.5,5.5],          desc:'风行者之箭贯穿焦点, 造成 ATK× 物理伤害。' },
    survival: { name:'雄鹰之怒', icon:'🦅', cd:16, mul:[3,4,5],       aoe:true, desc:'雄鹰之怒席卷全体敌人, 造成 ATK× 物理伤害。' },
  },
  shaman: {
    element:     { name:'拉登之拳', icon:'⚡', cd:16, mul:[3.5,4.5,6],           desc:'落下拉登之拳轰击焦点, 造成 ATK× 自然伤害。' },
    enhancement: { name:'末日之风', icon:'💨', cd:16, mul:[2.5,3.5,4.5], aoe:true, desc:'末日之风席卷全体敌人, 造成 ATK× 自然伤害。' },
    restoration: { name:'潮汐图腾', icon:'🌊', cd:20, mul:[1.5,2,2.5], healPct:0.1, selfShieldPct:0.05, desc:'潮汐图腾涌动, 对焦点造成 ATK× 伤害并大幅回复生命。' },
  },
  paladin: {
    holy: { name:'提尔的救赎', icon:'✨', cd:20, mul:[1.5,2,2.5], healPct:0.1, selfShieldPct:0.06, desc:'提尔之力降临, 对焦点造成 ATK× 神圣伤害并大幅回复生命。' },
    prot: { name:'提尔之眼', icon:'🛡️', cd:16, mul:[2.5,3.5,4.5], aoe:true, selfShieldPct:0.07, desc:'提尔之眼审判全体敌人, 造成 ATK× 神圣伤害并获得护盾。' },
    ret:  { name:'灰烬觉醒', icon:'⚔️', cd:16, mul:[3.5,4.5,5.5], aoe:true, sunder:true, desc:'灰烬使者觉醒横扫全体敌人, 造成 ATK× 神圣伤害并破甲。' },
  },
  warlock: {
    affliction:  { name:'收割灵魂', icon:'🟣', cd:18, mul:[3,4,5],       aoe:true, desc:'收割全体敌人的灵魂, 造成 ATK× 暗影伤害。' },
    demonology:  { name:'萨尔凯尔的吞噬', icon:'😈', cd:18, mul:[3.5,4.5,6],     desc:'召唤恶魔吞噬焦点, 造成 ATK× 暗影伤害。' },
    destruction: { name:'次元裂隙', icon:'🔥', cd:16, mul:[3.5,4.5,5.5], aoe:true, desc:'撕开次元裂隙轰击全体敌人, 造成 ATK× 混乱伤害。' },
  },
  druid: {
    balance: { name:'新月之蚀', icon:'🌙', cd:16, mul:[3,4,5],       aoe:true, desc:'新月落下蚀刻全体敌人, 造成 ATK× 自然伤害。' },
    feral:   { name:'阿莎曼之怒', icon:'🐆', cd:14, mul:[3,4,5],               desc:'阿莎曼之爪狂乱撕咬焦点, 造成 ATK× 物理伤害。' },
    resto:   { name:'母亲之树', icon:'🌳', cd:20, mul:[1.5,2,2.5], healPct:0.1, selfShieldPct:0.05, desc:'吉哈尔母树绽放, 对焦点造成 ATK× 伤害并大幅回复生命。' },
  },
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

/* ============ 新版 per-spec 引擎 ============ */

function activeArtifactSpec(){ return (state && state.specialization) || null; }

function artifactBucketRaw(spec){
  if(!state.artifacts[spec]) state.artifacts[spec] = { ap:0, lvl:0, traits:{}, capstone:null, infRank:0, relics:[] };
  const b = state.artifacts[spec];
  if(!b.traits) b.traits = {};
  if(b.capstone === undefined) b.capstone = null;
  if(!b.infRank) b.infRank = 0;
  if(!b.relics) b.relics = [];
  return b;
}

function ensureArtifactStore(){
  if(!state.artifacts || typeof state.artifacts !== 'object') state.artifacts = {};
  // 旧版单神器(per-char) → 当前专精桶: 一次性迁移, ap/lvl 保留, 特性重置返还为自由点
  const legacy = state.artifact;
  if(legacy && !legacy._migrated && ((legacy.lvl||0) > 0 || (legacy.ap||0) > 0)){
    const sp = activeArtifactSpec();
    if(sp){
      const b = artifactBucketRaw(sp);
      b.ap  = Math.max(b.ap||0,  legacy.ap||0);
      b.lvl = Math.max(b.lvl||0, legacy.lvl||0);
      legacy._migrated = true;
    }
  }
  return state.artifacts;
}

// 兼容旧调用名
function ensureArtifactState(){ ensureArtifactStore(); }

function artifactBucket(spec){
  spec = spec || activeArtifactSpec();
  if(!spec) return null;
  ensureArtifactStore();
  return artifactBucketRaw(spec);
}

// ---- 身份 / 节点 / 核心 ----
function artifactIdentity(cls, spec){
  cls = cls || state.cls; spec = spec || activeArtifactSpec();
  const bespoke = SPEC_ARTIFACT_IDENTITY[cls] && SPEC_ARTIFACT_IDENTITY[cls][spec];
  if(bespoke) return bespoke;
  const tree = (ARTIFACT_TREES[cls]||{})[spec];
  const base = ARTIFACTS[cls] || { name:'神器', icon:'🗡️', color:'#888' };
  return { name: tree ? `${base.name}·${tree.name}` : base.name, icon:(tree&&tree.icon)||base.icon, color:(tree&&tree.color)||base.color };
}

// 次要节点: 入门 + 现有特性(+追加) 分两条支路链式前置
function artifactMinorNodes(cls, spec){
  cls = cls || state.cls; spec = spec || activeArtifactSpec();
  if(!cls || !spec) return [];
  const baseTraits = (ARTIFACT_TRAITS[cls]||[]).filter(t => t.tree === spec);
  const extra = (SPEC_EXTRA_MINORS[cls] && SPEC_EXTRA_MINORS[cls][spec]) || [];
  const minors = baseTraits.concat(extra);
  const skDef = artifactSkillDef(cls, spec);
  const entry = { key:`art_${cls}_${spec}_entry`, tree:spec, name:`神器觉醒 · ${skDef.name}`, icon:skDef.icon, maxRank:3, ring:0, branch:null, isSkill:true,
    desc:`解锁神器招牌技能【${skDef.name}】(自动释放, 不占技能栏)。${artifactSkillDescText(skDef)} 投入越多阶威力越高。` };
  const branchA = [], branchB = [];
  minors.forEach((m,i)=>{ (i % 2 === 0 ? branchA : branchB).push(m); });
  const out = [entry];
  [['a',branchA],['b',branchB]].forEach(pair=>{
    const br = pair[0], list = pair[1];
    list.forEach((m,i)=>{
      out.push(Object.assign({}, m, { branch:br, ring:i+1, prereq: i===0 ? entry.key : list[i-1].key }));
    });
  });
  return out;
}
function artifactNodeByKey(key, cls, spec){ return artifactMinorNodes(cls, spec).find(n => n.key === key) || null; }

function artifactCapstoneList(cls, spec){
  cls = cls || state.cls; spec = spec || activeArtifactSpec();
  const bespoke = SPEC_CAPSTONES[cls] && SPEC_CAPSTONES[cls][spec];
  return bespoke || GENERIC_CAPSTONES;
}
function artifactCapstoneByKey(key, cls, spec){ return artifactCapstoneList(cls, spec).find(c => c.key === key) || null; }

// ---- 神器招牌技能(入门节点解锁, 战斗中自动释放) ----
function artifactSkillDef(cls, spec){
  cls = cls || state.cls; spec = spec || activeArtifactSpec();
  const bySpec = ARTIFACT_SKILLS[cls] && ARTIFACT_SKILLS[cls][spec];
  return bySpec || ARTIFACT_SKILLS._generic;
}
function artifactSkillDescText(def){
  if(!def) return '';
  const mulTxt = Array.isArray(def.mul) ? def.mul.join('/') : def.mul;
  let s = (def.desc || '').replace('ATK×', `ATK×${mulTxt}`);
  s += ` 冷却 ${def.cd||20} 秒。`;
  return s;
}
// 当前激活专精的神器技能阶数(0=未解锁); 战斗每拍调用
function artifactSkillRank(){
  if(!artifactUnlocked()) return 0;
  const spec = activeArtifactSpec(); if(!spec) return 0;
  const b = artifactBucket(spec); if(!b) return 0;
  return b.traits[`art_${state.cls}_${spec}_entry`] || 0;
}

// ---- 点数核算 ----
function artifactMinorSpent(spec){
  spec = spec || activeArtifactSpec(); if(!spec) return 0;
  const b = artifactBucket(spec); if(!b) return 0;
  const keys = new Set(artifactMinorNodes(state.cls, spec).map(n => n.key));
  let n = 0;
  for(const e of Object.entries(b.traits||{})){ if(keys.has(e[0])) n += e[1]||0; }
  return n;
}
function artifactSpentPoints(spec){
  spec = spec || activeArtifactSpec(); if(!spec) return 0;
  const b = artifactBucket(spec); if(!b) return 0;
  let n = artifactMinorSpent(spec);
  if(b.capstone) n += 1;
  n += b.infRank || 0;
  return n;
}
function artifactPointsFree(spec){
  spec = spec || activeArtifactSpec(); if(!spec) return 0;
  const b = artifactBucket(spec); if(!b) return 0;
  return Math.max(0, (b.lvl||0) - artifactSpentPoints(spec));
}
function artifactCoreUnlocked(spec){
  spec = spec || activeArtifactSpec();
  return artifactMinorSpent(spec) >= ARTIFACT_CORE_GATE;
}

function artifactApNeeded(lvl){
  if(lvl >= ARTIFACT_MAX_LVL) return Infinity;
  return Math.floor(220 + Math.pow(lvl, 1.9) * 65);
}

function artifactUnlocked(){
  if(!state.cls || !state.hero) return false;
  const sp = activeArtifactSpec(); if(!sp) return false;
  ensureArtifactStore();
  const b = state.artifacts[sp];
  if(b && (b.lvl||0) > 0) return true;
  return state.hero.lvl >= ARTIFACT_UNLOCK_LVL;
}

function artifactPrereqMet(node, b){
  if(!node || !node.prereq) return true;
  b = b || artifactBucket();
  if(!b) return false;
  return (b.traits[node.prereq]||0) >= 1;
}

function artifactGainAp(xpReward){
  if(!artifactUnlocked()) return;
  const spec = activeArtifactSpec(); if(!spec) return;
  const b = artifactBucket(spec); if(!b) return;
  if(b.lvl >= ARTIFACT_MAX_LVL) return;
  const gain = Math.max(1, Math.floor(xpReward * ARTIFACT_AP_RATE));
  b.ap += gain;
  let leveled = false;
  while(b.lvl < ARTIFACT_MAX_LVL && b.ap >= artifactApNeeded(b.lvl)){
    b.ap -= artifactApNeeded(b.lvl);
    b.lvl += 1; leveled = true;
    const id = artifactIdentity(state.cls, spec);
    log(`${id.icon} 神器升到 Lv.${b.lvl}! +1 神器点`, 'epic');
    const ms = artifactMilestonesForClass().find(m => m.lvl === b.lvl);
    if(ms) log(`✨ 神器里程碑【${ms.name}】解锁: ${ms.desc}`, 'legend');
  }
  if(leveled){ recomputeStats(); markDirty('artifact','hero'); }
}

function artifactBuyTrait(key){
  const spec = activeArtifactSpec();
  if(!spec){ log('请先选择专精', 'bad'); return; }
  const b = artifactBucket(spec); if(!b) return;
  const node = artifactNodeByKey(key, state.cls, spec);
  if(!node) return;
  const cur = b.traits[key] || 0;
  if(cur >= node.maxRank){ log('已满阶', 'bad'); return; }
  if(!artifactPrereqMet(node, b)){ log('前置未解锁', 'bad'); return; }
  if(artifactPointsFree(spec) <= 0){ log('神器点数不足', 'bad'); return; }
  b.traits[key] = cur + 1;
  log(`✦ 神器特性: ${node.name} → ${cur+1}/${node.maxRank}`, 'good');
  recomputeStats();
  markDirty('artifact','hero');
}

function artifactChooseCapstone(key){
  const spec = activeArtifactSpec();
  if(!spec){ log('请先选择专精', 'bad'); return; }
  const b = artifactBucket(spec); if(!b) return;
  if(!artifactCoreUnlocked(spec)){ log(`需在本树次要节点累计投入 ${ARTIFACT_CORE_GATE} 点才能激活核心`, 'bad'); return; }
  const cap = artifactCapstoneByKey(key, state.cls, spec);
  if(!cap) return;
  if(b.capstone === key){ log('已激活该核心', 'bad'); return; }
  if(b.capstone){
    b.capstone = key;                       // 切换核心(免费, 核心仅占 1 点)
    log(`✦ 神器核心已切换:【${cap.name}】`, 'epic');
  } else {
    if(artifactPointsFree(spec) <= 0){ log('神器点数不足', 'bad'); return; }
    b.capstone = key;
    log(`✦ 神器核心激活:【${cap.name}】`, 'epic');
  }
  recomputeStats();
  markDirty('artifact','hero');
}

function artifactBuyInfinite(){
  const spec = activeArtifactSpec();
  if(!spec){ log('请先选择专精', 'bad'); return; }
  const b = artifactBucket(spec); if(!b) return;
  if(!b.capstone){ log('需先激活神器核心才能开启无限共鸣', 'bad'); return; }
  if(artifactPointsFree(spec) <= 0){ log('神器点数不足', 'bad'); return; }
  b.infRank = (b.infRank||0) + 1;
  log(`♾️ 神器共鸣 → ${b.infRank} 阶`, 'good');
  recomputeStats();
  markDirty('artifact','hero');
}

function artifactReset(){
  const spec = activeArtifactSpec();
  if(!spec){ log('请先选择专精', 'bad'); return; }
  const b = artifactBucket(spec); if(!b) return;
  const cost = 100;
  const refundable = artifactSpentPoints(spec);
  if(refundable <= 0){ log('当前神器没有可重置的投入', 'bad'); return; }
  if(state.gem < cost){ log(`💎 重置神器需要 ${cost} 钻石`, 'bad'); return; }
  if(!confirm(`确定重置当前专精神器的全部投入? 返还 ${refundable} 点, 消耗 ${cost} 💎。`)) return;
  state.gem -= cost;
  b.traits = {}; b.capstone = null; b.infRank = 0;
  log(`♻️ 神器已重置, 返还 ${refundable} 点`, 'good');
  recomputeStats();
  markDirty('artifact','hero');
}

function collectArtifactMod(){
  const out = {
    atkPct:0, hpPct:0, defPct:0, critdPct:0, spdPct:0,
    crit:0, leech:0, vers:0, mastery:0,
    xpMult:0, goldMult:0, dropMult:0,
    regFlat:0, cdReduction:0, buffDuration:0, extraAtk:0,
    healBonus:0, dotBonus:0, costReduction:0, executeBonus:0,
    reflectDmg:0, armorPen:0, dodge:0, stunChance:0,
    strPct:0, agiPct:0, intPct:0, spiPct:0, staPct:0,
  };
  if(!artifactUnlocked()) return out;
  const spec = activeArtifactSpec(); if(!spec) return out;
  const b = artifactBucket(spec); if(!b) return out;
  for(const node of artifactMinorNodes(state.cls, spec)){
    const r = b.traits[node.key] || 0; if(r <= 0) continue;
    for(const e of Object.entries(node.mod||{})) out[e[0]] = (out[e[0]]||0) + e[1]*r;
  }
  if(b.capstone){
    const cap = artifactCapstoneByKey(b.capstone, state.cls, spec);
    if(cap) for(const e of Object.entries(cap.mod||{})) out[e[0]] = (out[e[0]]||0) + e[1];
  }
  if((b.infRank||0) > 0){
    for(const e of Object.entries(ARTIFACT_INFINITE.perRank)) out[e[0]] = (out[e[0]]||0) + e[1]*b.infRank;
  }
  for(const ms of artifactMilestonesForClass()){
    if((b.lvl||0) < ms.lvl) continue;
    for(const e of Object.entries(ms.mod||{})) out[e[0]] = (out[e[0]]||0) + e[1];
  }
  return out;
}

function collectArtifactFx(){
  if(!artifactUnlocked()) return [];
  const spec = activeArtifactSpec(); if(!spec) return [];
  const b = artifactBucket(spec); if(!b) return [];
  const out = [];
  for(const node of artifactMinorNodes(state.cls, spec)){
    const r = b.traits[node.key] || 0; if(r <= 0 || !node.fx) continue;
    for(const fx of asFxList(typeof node.fx === 'function' ? node.fx(r) : node.fx))
      out.push(Object.assign({ key:node.key, artifactKey:node.key, artifactName:node.name, treeKey:node.tree, source:'artifact' }, fx));
  }
  if(b.capstone){
    const cap = artifactCapstoneByKey(b.capstone, state.cls, spec);
    if(cap && cap.fx){
      for(const fx of asFxList(typeof cap.fx === 'function' ? cap.fx(1) : cap.fx))
        out.push(Object.assign({ key:cap.key, artifactKey:cap.key, artifactName:cap.name, source:'artifact', capstone:true }, fx));
    }
  }
  return out;
}

function renderArtifact(){
  ensureArtifactStore();
  const root = $('tab-artifact');
  if(!root) return;
  if(!state.cls){ root.innerHTML = '<div class="muted">先创建角色</div>'; return; }
  const spec = activeArtifactSpec();
  const heroLvl = (state.hero && state.hero.lvl) || 0;
  const specBucket = spec && state.artifacts[spec];
  if(heroLvl < ARTIFACT_UNLOCK_LVL && !(specBucket && specBucket.lvl > 0)){
    const lockedIconHtml = (typeof symbolIcon === 'function') ? symbolIcon('🗡️', 28, '神器', 'inv_sword_39') : '🗡️';
    root.innerHTML = `<div class="ascend-box"><div style="font-size:14px;font-weight:bold;text-align:center;margin:20px 0">${lockedIconHtml} 神器尚未觉醒</div><div class="muted" style="text-align:center">需达到 Lv.${ARTIFACT_UNLOCK_LVL} 才能开启专属神器</div></div>`;
    return;
  }
  if(!spec){
    root.innerHTML = `<div class="ascend-box"><div style="text-align:center;margin:20px 0">⚔️ 请先在 <b>天赋</b> 面板选择一个专精</div><div class="muted" style="text-align:center;font-size:11px">每个专精拥有独立的神器与神器树, 切换专精即切换神器</div></div>`;
    return;
  }

  const id = artifactIdentity(state.cls, spec);
  const b = artifactBucket(spec);
  const need = artifactApNeeded(b.lvl);
  const pct = b.lvl >= ARTIFACT_MAX_LVL ? 100 : Math.floor((b.ap||0) * 100 / Math.max(1, need));
  const free = artifactPointsFree(spec);
  const spent = artifactSpentPoints(spec);
  const minorSpent = artifactMinorSpent(spec);
  const coreOk = artifactCoreUnlocked(spec);
  const specName = (ARTIFACT_TREES[state.cls] && ARTIFACT_TREES[state.cls][spec] && ARTIFACT_TREES[state.cls][spec].name) || spec;
  const artIconHtml = (typeof symbolIcon === 'function') ? symbolIcon(id.icon, 30, id.name, 'inv_sword_39') : id.icon;
  const lightningIconHtml = (typeof statusIcon === 'function') ? statusIcon('神器能量', '⚡', 12, 'spell_arcane_arcanepotency') : '⚡';

  const renderNode = (node)=>{
    const rank = b.traits[node.key] || 0;
    const prereqOk = artifactPrereqMet(node, b);
    const canBuy = prereqOk && rank < node.maxRank && free > 0;
    const prereqNode = node.prereq ? artifactNodeByKey(node.prereq, state.cls, spec) : null;
    const lockHint = (!prereqOk && prereqNode) ? `<span class="muted" style="font-size:10px">🔒 需 [${prereqNode.name}]</span>` : '';
    const curText = artifactRankModText(node, rank);
    return `<div class="ascend-milestone ${rank>0?'reached':''}" style="padding:6px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">
        <div style="min-width:0">
          <div><b>${node.icon||'✦'} ${node.name}</b> <span class="muted" style="font-size:10px">${rank}/${node.maxRank}</span> ${lockHint}</div>
          <div class="muted" style="font-size:10px;line-height:1.45">${artifactTraitDesc(node)}${curText?` · 当前: ${curText}`:''}</div>
        </div>
        <button class="${canBuy?'success':''}" data-action="artifactBuy" data-key="${node.key}" ${canBuy?'':'disabled'} style="padding:4px 10px">+</button>
      </div>
    </div>`;
  };
  const renderCap = (cap)=>{
    const chosen = b.capstone === cap.key;
    const canPick = coreOk && !chosen && (b.capstone ? true : free > 0);
    return `<div class="ascend-milestone ${chosen?'reached':''}" style="padding:6px;${chosen?`border-left:3px solid ${id.color}`:''}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">
        <div style="min-width:0">
          <div><b>${cap.icon} ${cap.name}</b> <span class="muted" style="font-size:10px">[${cap.dir||'核心'}]</span> ${chosen?'<span class="r-legend">✓ 已激活</span>':''}</div>
          <div class="muted" style="font-size:10px;line-height:1.45">${cap.desc}</div>
        </div>
        <button class="${canPick?'success':''}" data-action="artifactCapstone" data-key="${cap.key}" ${canPick?'':'disabled'} style="padding:4px 10px;min-width:34px">${chosen?'★':(b.capstone?'换':'选')}</button>
      </div>
    </div>`;
  };

  const nodes = artifactMinorNodes(state.cls, spec);
  const entry = nodes.find(n => n.ring === 0);
  const branchA = nodes.filter(n => n.branch === 'a');
  const branchB = nodes.filter(n => n.branch === 'b');

  let html = `<div class="ascend-box" style="border:1px solid ${id.color}">
    <div style="display:flex;align-items:center;gap:8px">
      <div style="font-size:30px">${artIconHtml}</div>
      <div style="flex:1">
        <div style="font-weight:bold;color:${id.color}">${id.name}</div>
        <div class="muted" style="font-size:11px">${specName} · 神器 Lv.${b.lvl} · 可用 <b style="color:var(--accent)">${free}</b> 点 · 已加 ${spent}</div>
      </div>
    </div>
    <div class="bar xp" style="margin:6px 0"><i style="width:${pct}%;background:${id.color}"></i><span>${b.lvl>=ARTIFACT_MAX_LVL?'MAX':`${b.ap}/${need} AP`}</span></div>
    <div class="muted" style="font-size:10px">${lightningIconHtml} 杀敌获得 ${Math.round(ARTIFACT_AP_RATE*100)}% XP 作为 AP(仅当前专精) · <button class="danger" data-action="artifactReset" style="float:right;padding:2px 8px;font-size:11px">重置 100💎</button></div>
  </div>`;

  html += `<div class="ascend-box" style="border-left:3px solid ${id.color}"><div class="detail-label" style="color:${id.color}">✦ 觉醒</div>${entry?renderNode(entry):''}</div>`;
  html += `<div class="ascend-box"><div class="detail-label">⚔️ 支路 A</div>${branchA.map(renderNode).join('')||'<div class="muted" style="font-size:10px">—</div>'}</div>`;
  html += `<div class="ascend-box"><div class="detail-label">🔱 支路 B</div>${branchB.map(renderNode).join('')||'<div class="muted" style="font-size:10px">—</div>'}</div>`;

  html += `<div class="ascend-box"><div class="detail-label">💠 核心 · 三选一 ${coreOk?'':`<span class="muted" style="font-weight:normal">(需投入 ${ARTIFACT_CORE_GATE} 点 · 当前 ${minorSpent})</span>`}</div>${artifactCapstoneList(state.cls, spec).map(renderCap).join('')}</div>`;

  const infOk = !!b.capstone;
  const canInf = infOk && free > 0;
  const infCur = (b.infRank>0) ? ` · 当前: ${artifactRankModText({ mod:ARTIFACT_INFINITE.perRank }, b.infRank)}` : '';
  html += `<div class="ascend-box"><div class="detail-label">${ARTIFACT_INFINITE.icon} ${ARTIFACT_INFINITE.name}</div>
    <div class="ascend-milestone ${b.infRank>0?'reached':''}" style="padding:6px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">
        <div style="min-width:0">
          <div><b>${ARTIFACT_INFINITE.icon} 共鸣阶数</b> <span class="muted" style="font-size:10px">${b.infRank} 阶</span> ${infOk?'':'<span class="muted" style="font-size:10px">🔒 需先激活核心</span>'}</div>
          <div class="muted" style="font-size:10px;line-height:1.45">${ARTIFACT_INFINITE.desc}${infCur}</div>
        </div>
        <button class="${canInf?'success':''}" data-action="artifactInfinite" ${canInf?'':'disabled'} style="padding:4px 10px">+</button>
      </div>
    </div></div>`;

  html += `<div class="ascend-box"><div class="detail-label">里程碑</div>`;
  for(const ms of artifactMilestonesForClass()){
    const reached = (b.lvl||0) >= ms.lvl;
    const modTxt = Object.entries(ms.mod||{}).map(e => (typeof fmtMod==='function') ? fmtMod(e[0], e[1]) : `${e[0]}+${e[1]}`).join(' · ');
    html += `<div class="ascend-milestone ${reached?'reached':''}">
      <div><b>Lv.${ms.lvl} ${ms.name}</b> ${reached?'<span class="r-legend">✓</span>':'<span class="muted">🔒</span>'}</div>
      <div class="muted" style="font-size:10px;line-height:1.45">${ms.desc}${modTxt?` · ${modTxt}`:''}</div>
    </div>`;
  }
  html += `</div>`;

  root.innerHTML = html;
}
