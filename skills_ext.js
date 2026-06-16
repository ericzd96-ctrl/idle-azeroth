/* =========================================================
   skills_ext.js — 给每个职业追加 4 个新技能(爆发/减伤/功能/特色)
   ----------------------------------------------------------
   - 在 data.js 之后加载,把新技能注入 CLASSES[x].skills
   - 新增 buff 走通用 BUFF_FX 表(combat.recomputeStats 统一读取),
     减伤 dr 由 buffDamageReductionMult() 在受击结算时应用
   - buff 的 duration 单位毫秒(与现有技能一致);无 castTime = 瞬发
   ========================================================= */

/* 通用增益效果表(键以 s_ 开头,避免与旧硬编码 buff 冲突;
   同名键跨职业复用没问题——一个角色只有一个职业的技能) */
const BUFF_FX = {
  s_burst:    { atkMul:1.33,  critdAdd:20 },              // 爆发:攻击+33%、暴伤+20
  s_empower:  { critAdd:17,  critdAdd:34 },              // 法术爆发:暴击+17、暴伤+34
  s_frenzy:   { atkMul:1.20,  spdMul:1.20 },               // 狂热:攻击+20%、攻速+20%
  s_mitigate: { dr:0.34 },                                // 减伤 50%
  s_barrier:  { dr:0.30, defMul:1.27 },                   // 护盾:减伤45% + 防御+40%
  s_haste:    { spdMul:1.33 },                            // 急速:攻速+33%
  s_lifesurge:{ leechAdd:20, atkMul:1.13 },              // 生命洪流:吸血+20、攻击+13%
  s_avatar:   { atkMul:1.27,  defMul:1.20, dr:0.13 },       // 化身(终极):攻+27%、防+20%、减伤13%
};

/* 每个职业 4 个新技能:爆发 / 减伤 / 功能性 / 职业特色 */
const NEW_SKILLS = {
  warrior: {
    w_recklessness:{name:'鲁莽',     icon:'💢', desc:'爆发:6秒内攻击+33%、暴伤+20', mp:25, type:'buff', buff:'s_burst',    duration:6000, unlockLvl:26},
    w_ironwall:    {name:'钢铁壁垒', icon:'🧱', desc:'减伤:5秒内受到伤害降低34%',    mp:20, type:'buff', buff:'s_mitigate', duration:5000, unlockLvl:34},
    w_enrageRegen: {name:'狂怒回复', icon:'❤️‍🔥',desc:'功能:立即恢复35%最大生命',      mp:15, type:'heal', heal:0.35,                       unlockLvl:44},
    w_avatar:      {name:'天神下凡', icon:'⚡', desc:'特色:8秒攻+27%、防+20%、减伤13%',mp:40, type:'buff', buff:'s_avatar',   duration:7500, unlockLvl:54},
  },
  mage: {
    m_combustion:{name:'燃烧',     icon:'🔥', desc:'爆发:5秒内暴击+17、暴伤+34',    mp:40, type:'buff', buff:'s_empower',  duration:5000, unlockLvl:26},
    m_iceBlock:  {name:'寒冰屏障', icon:'🧊', desc:'减伤:4秒内受到伤害降低34%',      mp:30, type:'buff', buff:'s_mitigate', duration:4000,  unlockLvl:34},
    m_arcanePower:{name:'奥术强化',icon:'🌀', desc:'功能:5秒内攻速+33%',           mp:25, type:'buff', buff:'s_haste',    duration:5000, unlockLvl:44},
    m_meteor:    {name:'流星',     icon:'☄️', desc:'特色:3倍火焰范围伤害并灼烧',    mp:60, type:'dmg',  mul:9, dot:true,                    unlockLvl:54},
  },
  priest: {
    p_shadowform:{name:'暗影形态', icon:'🌑', desc:'爆发:6秒内攻击+20%、攻速+20%', mp:40, type:'buff', buff:'s_frenzy',   duration:6000, unlockLvl:26},
    p_pwShield:  {name:'真言术·盾',icon:'🟡', desc:'减伤:5秒内受伤-30%、防御+27%', mp:30, type:'buff', buff:'s_barrier',  duration:5000, unlockLvl:34},
    p_holyNova:  {name:'神圣新星', icon:'✨', desc:'功能:立即恢复40%最大生命',      mp:35, type:'heal', heal:0.40,                       unlockLvl:44},
    p_mindBlast: {name:'心灵震爆', icon:'💥', desc:'特色:3倍精神伤害,必定暴击',    mp:50, type:'dmg',  mul:7, alwaysCrit:true,             unlockLvl:54},
  },
  rogue: {
    r_bladeflurry:{name:'剑刃乱舞',icon:'🗡️', desc:'爆发:6秒内攻击+20%、攻速+20%', mp:35, type:'buff', buff:'s_frenzy',   duration:6000, unlockLvl:26},
    r_evasion:   {name:'闪避',     icon:'💨', desc:'减伤:4秒内受到伤害降低34%',      mp:30, type:'buff', buff:'s_mitigate', duration:4000,  unlockLvl:34},
    r_adrenaline:{name:'冲动',     icon:'⚡', desc:'功能:5秒内攻速+33%',           mp:30, type:'buff', buff:'s_haste',    duration:5000, unlockLvl:44},
    r_eviscerate:{name:'切割',     icon:'🩸', desc:'特色:3倍攻击,吸血30%并致流血',  mp:45, type:'dmg',  mul:8, dot:true, lifeSteal:0.3,      unlockLvl:54},
  },
  hunter: {
    h_killCommand:{name:'杀戮命令',icon:'🎯', desc:'爆发:6秒内攻击+33%、暴伤+20',  mp:35, type:'buff', buff:'s_burst',    duration:6000, unlockLvl:26},
    h_feignDeath:{name:'假死',     icon:'🦗', desc:'减伤:4秒内受到伤害降低34%',      mp:25, type:'buff', buff:'s_mitigate', duration:4000,  unlockLvl:34},
    h_rapidFire: {name:'急速射击', icon:'🏹', desc:'功能:5秒内攻速+33%',           mp:25, type:'buff', buff:'s_haste',    duration:5000, unlockLvl:44},
    h_explosiveShot:{name:'爆炸射击',icon:'💥',desc:'特色:3倍攻击,引爆灼烧',        mp:45, type:'dmg',  mul:8, dot:true,                    unlockLvl:54},
  },
  shaman: {
    s_bloodlust: {name:'嗜血',     icon:'🩸', desc:'爆发:6秒内攻击+20%、攻速+20%', mp:35, type:'buff', buff:'s_frenzy',   duration:6000, unlockLvl:26},
    s_earthShield:{name:'大地之盾',icon:'🪨', desc:'减伤:5秒内受伤-30%、防御+27%', mp:30, type:'buff', buff:'s_barrier',  duration:5000, unlockLvl:34},
    s_healingTide:{name:'治疗之泉',icon:'💧', desc:'功能:立即恢复35%最大生命',      mp:35, type:'heal', heal:0.35,                       unlockLvl:44},
    s_stormstrike:{name:'风暴打击',icon:'⚡', desc:'特色:3倍闪电伤害',              mp:45, type:'dmg',  mul:7,                              unlockLvl:54},
  },
  paladin: {
    pa_avengingWrath:{name:'复仇之怒',icon:'⚖️',desc:'爆发:6秒内攻击+33%、暴伤+20',mp:40, type:'buff', buff:'s_burst',    duration:6000, unlockLvl:26},
    pa_guardian: {name:'守护者',   icon:'🟨', desc:'减伤:5秒内受到伤害降低34%',    mp:30, type:'buff', buff:'s_mitigate', duration:5000, unlockLvl:34},
    pa_flashLight:{name:'圣光闪现',icon:'🌟', desc:'功能:立即恢复40%最大生命',      mp:35, type:'heal', heal:0.40,                       unlockLvl:44},
    pa_holyWrath:{name:'神圣风暴', icon:'🔨', desc:'特色:3倍神圣范围伤害',          mp:45, type:'dmg',  mul:7,                              unlockLvl:54},
  },
  warlock: {
    wl_darkSoul: {name:'黑暗灵魂', icon:'😈', desc:'爆发:6秒内暴击+17、暴伤+34',   mp:40, type:'buff', buff:'s_empower',  duration:6000, unlockLvl:26},
    wl_demonSkin:{name:'恶魔皮肤', icon:'🟪', desc:'减伤:5秒内受伤-30%、防御+27%', mp:30, type:'buff', buff:'s_barrier',  duration:5000, unlockLvl:34},
    wl_lifeTap:  {name:'生命通道', icon:'🩸', desc:'功能:6秒内吸血+20、攻击+13%',  mp:30, type:'buff', buff:'s_lifesurge',duration:6000, unlockLvl:44},
    wl_chaosBolt:{name:'混乱之箭', icon:'🟣', desc:'特色:3倍暗影火,必暴并灼烧',    mp:55, type:'dmg',  mul:8, dot:true, alwaysCrit:true,   unlockLvl:54},
  },
  druid: {
    d_berserk:   {name:'狂暴',     icon:'🐻', desc:'爆发:6秒内攻击+20%、攻速+20%', mp:35, type:'buff', buff:'s_frenzy',   duration:6000, unlockLvl:26},
    d_barkskin:  {name:'树皮术',   icon:'🌳', desc:'减伤:4秒内受到伤害降低34%',      mp:25, type:'buff', buff:'s_mitigate', duration:4000,  unlockLvl:34},
    d_rejuv:     {name:'回春术',   icon:'🌿', desc:'功能:立即恢复35%最大生命',      mp:30, type:'heal', heal:0.35,                       unlockLvl:44},
    d_ferociousBite:{name:'凶猛撕咬',icon:'🐾',desc:'特色:3倍攻击,吸血30%',         mp:40, type:'dmg',  mul:8, lifeSteal:0.3,               unlockLvl:54},
  },
};

(function injectNewSkills() {
  if (typeof CLASSES === 'undefined') return;
  for (const clsKey in NEW_SKILLS) {
    const cls = CLASSES[clsKey];
    if (!cls || !cls.skills) continue;
    const adds = NEW_SKILLS[clsKey];
    for (const skKey in adds) {
      if (!cls.skills[skKey]) cls.skills[skKey] = adds[skKey];  // 幂等
    }
  }
})();
