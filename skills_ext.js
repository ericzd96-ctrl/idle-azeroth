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
  s_mitigate: { dr:0.34 },                                // 减伤34%
  s_barrier:  { dr:0.40 },                                // 护盾:减伤40%
  s_haste:    { spdMul:1.33 },                            // 急速:攻速+33%
  s_lifesurge:{ leechAdd:20, atkMul:1.13 },              // 生命洪流:吸血+20、攻击+13%
  s_avatar:   { atkMul:1.27, dr:0.25 },                    // 化身(终极):攻+27%、减伤25%

  /* ===== 职业风味爆发/减伤(去同化:每职业独立数值与倾向) ===== */
  w_reckless: { atkMul:1.30, critAdd:12, critdAdd:24 },    // 战士·鲁莽:近战暴击爆发
  w_ironwall: { dr:0.45 },                                 // 战士·钢铁壁垒:重甲减伤墙
  m_combust:  { critAdd:20, critdAdd:40 },                 // 法师·燃烧:火法暴击/暴伤爆发
  m_iceblock: { dr:0.40 },                                 // 法师·寒冰屏障:纯减伤
  p_voidform: { atkMul:1.22, critAdd:10, critdAdd:20 },    // 牧师·暗影形态
  r_dance:    { atkMul:1.20, spdMul:1.18, critdAdd:15 },   // 盗贼·剑刃乱舞
  h_burst:    { atkMul:1.28, critAdd:10, critdAdd:22 },    // 猎人·杀戮命令
  sh_frenzy:  { atkMul:1.18, spdMul:1.25 },                // 萨满·嗜血:急速倾向
  pa_wrath:   { atkMul:1.28, critAdd:12, critdAdd:24 },    // 骑士·复仇之怒
  wl_dark:    { critAdd:20, critdAdd:38 },                 // 术士·黑暗灵魂
  d_zerk:     { atkMul:1.20, spdMul:1.20, critAdd:8 },     // 德鲁伊·狂暴
  w_shieldBlock:{ defMul:1.22, dr:0.18 },                  // 防战·盾牌格挡:高防御+反击窗口
  pa_devotion:{ atkMul:1.13, defMul:1.18, regAdd:6, dr:0.16 }, // 防骑·虔诚祝福:属性+回复+减伤
  p_grace:    { defMul:1.12, critAdd:4, regAdd:5 },        // 牧师·恩典:治疗职业给随从/自身的续航增益
  sh_ancestral:{ spdMul:1.12, regAdd:4, dr:0.10 },         // 萨满·先祖护持:图腾式支援
  d_lifebloom:{ defMul:1.10, regAdd:7 },                   // 德鲁伊·生命绽放:持续恢复与小防御
  h_beastBond:{ atkMul:1.14, spdMul:1.10 },                // 猎人·兽群羁绊:宠物/召唤物协同
};

const SKILL_AURA_LIBRARY = {
  arcaneCharge: { icon:'🔷', name:'奥术充能', desc:'奥术飞弹叠加,强化奥术爆炸', maxStacks:3 },
  stormCharge:  { icon:'⚡', name:'雷霆充能', desc:'闪电箭叠加,强化风暴打击与闪电链', maxStacks:3 },
  /* ===== 战士招牌资源 ===== */
  w_sunder:     { icon:'🔨', name:'破甲印记', desc:'致死打击/破甲攻击叠加,巨人之击按层消耗并暴增', maxStacks:5 },
  w_rage:       { icon:'💢', name:'暴怒', desc:'暴击叠加,强化怒火乱舞', maxStacks:5 },
  /* ===== 法师招牌资源 ===== */
  m_heat:       { icon:'🔥', name:'炽热', desc:'暴击叠加,炎爆术按层引爆暴增', maxStacks:5 },
  m_frost:      { icon:'❄️', name:'指尖寒冰', desc:'寒冰箭叠加,冰枪术按层 shatter 暴增', maxStacks:5 },
  /* ===== 牧师 ===== */
  p_insanity:   { icon:'🌀', name:'疯狂', desc:'暗言术·痛/心灵震爆叠加,虚空爆发按层暴增', maxStacks:6 },
  /* ===== 盗贼 ===== */
  r_combo:      { icon:'🔆', name:'连击点', desc:'邪恶打击/背刺叠加,切割按点数消耗暴增', maxStacks:5 },
  r_venom:      { icon:'🐍', name:'毒锋', desc:'毒刃叠加,致命终结技按层引爆', maxStacks:5 },
  /* ===== 猎人 ===== */
  h_frenzy:     { icon:'🐾', name:'野兽狂怒', desc:'命中/击杀叠加,提升杀戮命令并强化爆发', maxStacks:5 },
  /* ===== 萨满 ===== */
  sh_maelstrom: { icon:'🌀', name:'漩涡之力', desc:'命中叠加,风暴打击按层追击暴增', maxStacks:5 },
  /* ===== 骑士 ===== */
  pa_holyPower: { icon:'⚜️', name:'圣能', desc:'审判叠加,制裁/圣光术按层强化', maxStacks:5 },
  /* ===== 术士 ===== */
  wl_ember:     { icon:'🔥', name:'余烬', desc:'献祭/烧尽叠加,混乱之箭按层引爆', maxStacks:5 },
  wl_shard:     { icon:'💜', name:'灵魂碎片', desc:'痛苦效果叠加,痛苦无常按层暴增', maxStacks:5 },
  /* ===== 德鲁伊 ===== */
  d_astral:     { icon:'🌗', name:'星界能量', desc:'月火/星火叠加,新月强击按层暴增', maxStacks:5 },
  d_combo:      { icon:'🐾', name:'撕咬连击', desc:'斜掠/撕碎叠加,凶猛撕咬按层引爆', maxStacks:5 },
  w_block:      { icon:'🧱', name:'盾牌格挡', desc:'防战承伤和盾系技能叠加,提高反震并可转成护盾', maxStacks:5 },
  pa_bulwark:   { icon:'🛡️', name:'圣光壁垒', desc:'防骑祝福/审判叠加,治疗、护盾和属性越滚越厚', maxStacks:5 },
  p_grace:      { icon:'✨', name:'恩典', desc:'牧师治疗/护盾叠加,强化随从与主角的保护窗口', maxStacks:5 },
  h_beastBond:  { icon:'🐾', name:'兽群羁绊', desc:'猎人与宠物/召唤物共同叠加,强化协同猛攻', maxStacks:5 },
  sh_totem:     { icon:'🪬', name:'图腾共鸣', desc:'萨满治疗、护盾与元素技能叠加,强化全队支援', maxStacks:5 },
  d_harmony:    { icon:'🌿', name:'自然调和', desc:'德鲁伊治疗、月火与野性技能叠加,在恢复/输出间转换', maxStacks:5 },
  spec_flow:    { icon:'✦', name:'专精连段', desc:'按当前专精的技能顺序推进,完成后触发独特战斗效果', maxStacks:3 },
  spec_core:    { icon:'✦', name:'专精核心', desc:'当前专精独有的战斗引擎资源,满层后用指定技能收束触发强力效果', maxStacks:8 },
  spec_proc:    { icon:'✦', name:'临场强化', desc:'当前专精触发的下一技能变招,命中符合条件的技能后自动消费', maxStacks:1 },
  spec_stance:  { icon:'✦', name:'专精姿态', desc:'当前专精的短暂战斗法则,会改变后续技能的附加效果', maxStacks:1 },
};

const CLASS_COMBAT_MECHANICS = {
  warrior: { icon:'🧱', name:'战士姿态', desc:'防护战士承伤会叠盾牌格挡并按防御反震；武器围绕破甲与斩杀；狂暴围绕暴怒和多段追击。' },
  mage: { icon:'🔷', name:'三系法术循环', desc:'奥术叠充能爆发，火焰铺点燃再引爆，冰霜冻结后用冰枪/暴风雪打碎裂伤害。' },
  priest: { icon:'✨', name:'圣光与暗影', desc:'戒律/神圣治疗会同步照顾随从，给随从加血、护盾和恩典；暗影依靠疯狂与持续伤害爆发。' },
  rogue: { icon:'🔪', name:'潜行者终结技', desc:'通过连击点、毒锋、破绽和持续伤害组织终结技，不再只靠高倍率技能硬砍。' },
  hunter: { icon:'🐾', name:'兽群协同', desc:'宠物和召唤物会给猎人叠兽群羁绊，猎人印记/钉刺/杀戮命令共同推动协同猛攻。' },
  shaman: { icon:'🪬', name:'元素与图腾', desc:'元素叠雷霆充能，增强叠漩涡，恢复会通过图腾共鸣为随从和主角提供治疗、护盾与属性。' },
  paladin: { icon:'⚜️', name:'圣能祝福', desc:'圣骑士靠审判、祝福、圣盾和圣能滚属性；防骑在祝福窗口中拥有更强回血与护盾。' },
  warlock: { icon:'💜', name:'痛苦契约', desc:'术士通过多种 DOT、余烬和灵魂碎片打伤害，混乱之箭/邪能狂涌负责引爆痛苦。' },
  druid: { icon:'🌗', name:'自然形态', desc:'平衡靠月火与星界能量，野性靠连击和斩杀，恢复德会把治疗与自然护盾扩展到随从。' },
};

const MONSTER_STATE_META = {
  slow:    { icon:'❄️', name:'减速',   desc:'攻击速度降低约33%' },
  sunder:  { icon:'🔨', name:'破甲',   desc:'防御降低30%' },
  decay:   { icon:'👴', name:'衰老',   desc:'受到治疗和生命回复降低30%' },
  decay2:  { icon:'🌑', name:'凋零',   desc:'受到治疗降低55%,生命回复降低65%' },
  judged:  { icon:'⚖️', name:'审判',   desc:'十字军打击额外+55%，奉献额外+35%，神圣风暴额外+45%' },
  frozen:  { icon:'🧊', name:'冻结',   desc:'暴风雪额外+50%伤害' },
  exposed: { icon:'🗡️', name:'破绽',   desc:'背刺额外+60%伤害' },
  terror:  { icon:'👻', name:'恐惧',   desc:'目标陷入恐惧状态' },
  marked:  { icon:'🎯', name:'猎人印记', desc:'射击猎精准技能会造成额外伤害' },
  rooted:  { icon:'🌿', name:'缠绕',   desc:'被自然法术束缚,后续自然技能更容易接上' },
  dot:     { icon:'☠️', name:'持续伤害', desc:'目标身上已有持续伤害效果' },
  trauma:  { icon:'🩸', name:'创伤', desc:'被武器撕开弱点,后续处决/流血类技能更危险' },
  fever:   { icon:'🔥', name:'灼热', desc:'火焰在护甲下蔓延,会被火系收束技能引爆' },
  brittle: { icon:'❄️', name:'易碎', desc:'寒冰让目标变脆,碎裂类技能会追加伤害' },
  unstable:{ icon:'🔷', name:'不稳定', desc:'奥术或元素能量失衡,会被倾泻类技能引爆' },
  penanceMark:{ icon:'⚖️', name:'赎罪印记', desc:'戒律法术留下印记,后续伤害会转化为护盾' },
  voidTorn:{ icon:'🌑', name:'虚空裂口', desc:'暗影持续侵蚀目标,会被虚空类技能扩散' },
  venomBloom:{ icon:'🐍', name:'毒花', desc:'毒药在体内积蓄,终结技会触发毒爆' },
  huntWound:{ icon:'🎯', name:'猎伤', desc:'被猎人锁定的弱点,精准射击会穿透' },
  stormBrand:{ icon:'⛈️', name:'风暴烙印', desc:'元素能量导电,风暴技能会过载弹射' },
  holyBrand:{ icon:'🌟', name:'圣印', desc:'圣光审判目标,裁决或护盾技能会引爆圣能' },
  doomBrand:{ icon:'💜', name:'末日契印', desc:'邪能契约正在收紧,术士收割技能会爆发' },
  astralBrand:{ icon:'🌗', name:'星痕', desc:'日月星辉校准目标,星界技能会坠落追击' },
  lifeSeed:{ icon:'🌿', name:'生命种子', desc:'自然能量扎根,治疗收束会绽放为护盾与恢复' },
};

/* 每个职业 4 个新技能:爆发 / 减伤 / 功能性 / 职业特色 */
const NEW_SKILLS = {
  warrior: {
    w_recklessness:{name:'鲁莽',     icon:'💢', desc:'爆发:6秒内攻击+30%、暴击+12、暴伤+24', mp:25, type:'buff', buff:'w_reckless', duration:6000, unlockLvl:26},
    w_ironwall:    {name:'钢铁壁垒', icon:'🧱', desc:'减伤:5秒内受到伤害降低45%', mp:20, type:'buff', buff:'w_ironwall', duration:5000, unlockLvl:34},
    w_enrageRegen: {name:'狂怒回复', icon:'❤️‍🔥',desc:'功能:立即恢复35%最大生命',      mp:15, type:'heal', heal:0.35,                       unlockLvl:44},
    w_avatar:      {name:'天神下凡', icon:'⚡', desc:'特色:8秒攻击+27%、受到伤害降低25%',mp:40, type:'buff', buff:'s_avatar',   duration:7500, unlockLvl:54},
    w_colossus:    {name:'巨人之击', icon:'🪨', desc:'招牌:5倍攻击的破甲重击', mp:45, type:'dmg', mul:5, unlockLvl:60,
                    fx:{ applyTargetState:'sunder', stateDurationMs:15000, bonusStates:{ sunder:0.4 }, bonusPerAuraStack:{ key:'w_sunder', pct:0.2 }, consumeAura:{ key:'w_sunder', all:true } }},
    w_rampage:     {name:'怒火乱舞', icon:'😤', desc:'招牌:4倍攻击的狂怒连舞', mp:40, type:'dmg', mul:4, unlockLvl:70,
                    fx:{ bonusPerAuraStack:{ key:'w_rage', pct:0.18 }, consumeAura:{ key:'w_rage', all:true }, extraHitPct:0.4 }},
  },
  mage: {
    m_combustion:{name:'燃烧',     icon:'🔥', desc:'爆发:5秒内暴击+20、暴伤+40',    mp:40, type:'buff', buff:'m_combust',  duration:5000, unlockLvl:26},
    m_iceBlock:  {name:'寒冰屏障', icon:'🧊', desc:'减伤:4秒内受到伤害降低40%',      mp:30, type:'buff', buff:'m_iceblock', duration:4000,  unlockLvl:34},
    m_arcanePower:{name:'奥术强化',icon:'🌀', desc:'功能:5秒内攻速+33%',           mp:25, type:'buff', buff:'s_haste',    duration:5000, unlockLvl:44},
    m_meteor:    {name:'流星',     icon:'☄️', desc:'特色:3倍火焰范围伤害并灼烧',    mp:60, type:'dmg',  mul:9, dot:true,                    unlockLvl:54},
    m_arcaneBarrage:{name:'奥术弹幕',icon:'🌟',desc:'招牌:4倍奥术伤害',            mp:35, type:'dmg', mul:4, unlockLvl:60, castTime:0,
                    fx:{ bonusPerAuraStack:{ key:'arcaneCharge', pct:0.30 }, consumeAura:{ key:'arcaneCharge', all:true } }},
    m_iceLance:  {name:'冰枪术',   icon:'🧊', desc:'招牌:3倍寒冰伤害',             mp:25, type:'dmg', mul:3, unlockLvl:70, castTime:0,
                    fx:{ bonusStates:{ frozen:0.6 }, bonusPerAuraStack:{ key:'m_frost', pct:0.25 }, consumeAura:{ key:'m_frost', all:true } }},
  },
  priest: {
    p_shadowform:{name:'暗影形态', icon:'🌑', desc:'爆发:6秒内攻击+22%、暴击+10、暴伤+20', mp:40, type:'buff', buff:'p_voidform', duration:6000, unlockLvl:26},
    p_pwShield:  {name:'真言术·盾',icon:'🟡', desc:'减伤:5秒内受到伤害降低40%', mp:30, type:'buff', buff:'s_barrier',  duration:5000, unlockLvl:34},
    p_holyNova:  {name:'神圣新星', icon:'✨', desc:'功能:立即恢复40%最大生命',      mp:35, type:'heal', heal:0.40,                       unlockLvl:44},
    p_mindBlast: {name:'心灵震爆', icon:'💥', desc:'特色:3倍精神伤害,必定暴击',    mp:50, type:'dmg',  mul:9, alwaysCrit:true,             unlockLvl:54},
    p_voidEruption:{name:'虚空爆发',icon:'🌌',desc:'招牌:5倍暗影伤害',           mp:50, type:'dmg', mul:5, unlockLvl:60, castTime:0,
                    fx:{ bonusPerDot:0.18, bonusPerAuraStack:{ key:'p_insanity', pct:0.18 }, consumeAura:{ key:'p_insanity', all:true } }},
    p_penance:   {name:'惩罚',     icon:'⚜️',desc:'招牌:4倍神圣伤害并治疗',      mp:40, type:'dmg', mul:4, unlockLvl:70, castTime:0,
                    fx:{ healFromDamagePct:0.4 }},
  },
  rogue: {
    r_bladeflurry:{name:'剑刃乱舞',icon:'🗡️', desc:'爆发:6秒内攻击+20%、攻速+18%、暴伤+15', mp:35, type:'buff', buff:'r_dance', duration:6000, unlockLvl:26},
    r_evasion:   {name:'闪避',     icon:'💨', desc:'减伤:4秒内受到伤害降低34%',      mp:30, type:'buff', buff:'s_mitigate', duration:4000,  unlockLvl:34},
    r_adrenaline:{name:'冲动',     icon:'⚡', desc:'功能:5秒内攻速+33%',           mp:30, type:'buff', buff:'s_haste',    duration:5000, unlockLvl:44},
    r_eviscerate:{name:'切割',     icon:'🩸', desc:'特色:5倍攻击,吸血30%并致流血',  mp:45, type:'dmg',  mul:10, dot:true, lifeSteal:0.3,      unlockLvl:54},
    r_envenom:   {name:'奉毒',     icon:'🐍', desc:'招牌:4倍攻击的剧毒终结',        mp:40, type:'dmg', mul:4, unlockLvl:60,
                    fx:{ bonusPerDot:0.2, bonusPerAuraStack:{ key:'r_venom', pct:0.2 }, consumeAura:{ key:'r_venom', all:true } }},
    r_shadowstrike:{name:'暗袭',   icon:'👤', desc:'招牌:4倍攻击,对破绽目标致命',   mp:38, type:'dmg', mul:4, unlockLvl:70,
                    fx:{ bonusStates:{ exposed:0.7 }, bonusPerAuraStack:{ key:'r_combo', pct:0.16 }, consumeAura:{ key:'r_combo', all:true } }},
  },
  hunter: {
    h_killCommand:{name:'杀戮命令',icon:'🎯', desc:'爆发:6秒内攻击+28%、暴击+10、暴伤+22', mp:35, type:'buff', buff:'h_burst', duration:6000, unlockLvl:26},
    h_feignDeath:{name:'假死',     icon:'🦗', desc:'减伤:4秒内受到伤害降低34%',      mp:25, type:'buff', buff:'s_mitigate', duration:4000,  unlockLvl:34},
    h_rapidFire: {name:'急速射击', icon:'🏹', desc:'功能:5秒内攻速+33%',           mp:25, type:'buff', buff:'s_haste',    duration:5000, unlockLvl:44},
    h_explosiveShot:{name:'爆炸射击',icon:'💥',desc:'特色:5倍攻击,引爆灼烧',        mp:45, type:'dmg',  mul:10, dot:true,                    unlockLvl:54},
    h_coordinatedAssault:{name:'协同猛攻',icon:'🐾',desc:'招牌:5倍攻击的兽群强袭',  mp:45, type:'dmg', mul:5, unlockLvl:60,
                    fx:{ bonusPerAuraStack:{ key:'h_frenzy', pct:0.18 }, consumeAura:{ key:'h_frenzy', all:true }, extraHitPct:0.4 }},
    h_chimaera:  {name:'奇美拉射击',icon:'🐉',desc:'招牌:4倍攻击,对中毒/钉刺目标暴增', mp:38, type:'dmg', mul:4, unlockLvl:70,
                    fx:{ bonusPerDot:0.28 }},
  },
  shaman: {
    s_bloodlust: {name:'嗜血',     icon:'🩸', desc:'爆发:6秒内攻击+18%、攻速+25%', mp:35, type:'buff', buff:'sh_frenzy',  duration:6000, unlockLvl:26},
    s_earthShield:{name:'大地之盾',icon:'🪨', desc:'减伤:5秒内受到伤害降低40%', mp:30, type:'buff', buff:'s_barrier',  duration:5000, unlockLvl:34},
    s_healingTide:{name:'治疗之泉',icon:'💧', desc:'功能:立即恢复35%最大生命',      mp:35, type:'heal', heal:0.35,                       unlockLvl:44},
    s_stormstrike:{name:'风暴打击',icon:'⚡', desc:'特色:4倍闪电伤害',              mp:45, type:'dmg',  mul:9,                              unlockLvl:54},
    sh_earthShock:{name:'大地震击',icon:'🌎',desc:'招牌:4倍自然伤害',             mp:35, type:'dmg', mul:4, unlockLvl:60, castTime:0,
                    fx:{ bonusPerAuraStack:{ key:'stormCharge', pct:0.22 }, consumeAura:{ key:'stormCharge', all:true } }},
    sh_lavaLash: {name:'熔岩猛击',icon:'🌋',desc:'招牌:4倍火焰的漩涡释放',        mp:38, type:'dmg', mul:4, unlockLvl:70, castTime:0,
                    fx:{ bonusPerAuraStack:{ key:'sh_maelstrom', pct:0.2 }, consumeAura:{ key:'sh_maelstrom', all:true }, extraHitPctIfBuff:{ key:'windfury', pct:0.4 } }},
  },
  paladin: {
    pa_avengingWrath:{name:'复仇之怒',icon:'⚖️',desc:'爆发:6秒内攻击+28%、暴击+12、暴伤+24',mp:40, type:'buff', buff:'pa_wrath', duration:6000, unlockLvl:26},
    pa_guardian: {name:'守护者',   icon:'🟨', desc:'减伤:5秒内受到伤害降低34%',    mp:30, type:'buff', buff:'s_mitigate', duration:5000, unlockLvl:34},
    pa_flashLight:{name:'圣光闪现',icon:'🌟', desc:'功能:立即恢复40%最大生命',      mp:35, type:'heal', heal:0.40,                       unlockLvl:44},
    pa_holyWrath:{name:'神圣风暴', icon:'🔨', desc:'特色:4倍神圣范围伤害',          mp:45, type:'dmg',  mul:9,                              unlockLvl:54},
    pa_templarVerdict:{name:'圣殿裁决',icon:'⚔️',desc:'招牌:5倍神圣伤害的裁决',     mp:45, type:'dmg', mul:5, unlockLvl:60, castTime:0,
                    fx:{ bonusStates:{ judged:0.4 }, bonusPerAuraStack:{ key:'pa_holyPower', pct:0.2 }, consumeAura:{ key:'pa_holyPower', all:true } }},
    pa_hammerWrath:{name:'愤怒之锤',icon:'🔨',desc:'招牌:5倍神圣伤害,残血斩杀',     mp:38, type:'dmg', mul:5, unlockLvl:70, castTime:0,
                    fx:{ bonusVsLowHp:0.8, executeThreshold:0.35, resourceGainOnKill:10 }},
  },
  warlock: {
    wl_darkSoul: {name:'黑暗灵魂', icon:'😈', desc:'爆发:6秒内暴击+20、暴伤+38%',  mp:40, type:'buff', buff:'wl_dark',    duration:6000, unlockLvl:26},
    wl_demonSkin:{name:'恶魔皮肤', icon:'🟪', desc:'减伤:5秒内受到伤害降低40%', mp:30, type:'buff', buff:'s_barrier',  duration:5000, unlockLvl:34},
    wl_lifeTap:  {name:'生命通道', icon:'🩸', desc:'功能:6秒内吸血+20、攻击+13%',  mp:30, type:'buff', buff:'s_lifesurge',duration:6000, unlockLvl:44},
    wl_chaosBolt:{name:'混乱之箭', icon:'🟣', desc:'特色:5倍暗影火,必暴并灼烧',    mp:55, type:'dmg',  mul:10, dot:true, alwaysCrit:true,   unlockLvl:54},
    wl_maleficRapture:{name:'邪能狂涌',icon:'💜',desc:'招牌:4倍暗影伤害,痛苦越多越狠',mp:42, type:'dmg', mul:4, unlockLvl:60, castTime:0,
                    fx:{ bonusPerDot:0.28, bonusPerAuraStack:{ key:'wl_shard', pct:0.18 }, consumeAura:{ key:'wl_shard', all:true } }},
    wl_demonbolt:{name:'恶魔之箭',icon:'😈',desc:'招牌:5倍暗影火,变身期间更强',     mp:45, type:'dmg', mul:5, unlockLvl:70, castTime:0,
                    fx:{ bonusIfBuff:{ demonForm:0.5 } }},
  },
  druid: {
    d_berserk:   {name:'狂暴',     icon:'🐻', desc:'爆发:6秒内攻击+20%、攻速+20%、暴击+8', mp:35, type:'buff', buff:'d_zerk', duration:6000, unlockLvl:26},
    d_barkskin:  {name:'树皮术',   icon:'🌳', desc:'减伤:4秒内受到伤害降低34%',      mp:25, type:'buff', buff:'s_mitigate', duration:4000,  unlockLvl:34},
    d_rejuv:     {name:'回春术',   icon:'🌿', desc:'功能:立即恢复35%最大生命',      mp:30, type:'heal', heal:0.35,                       unlockLvl:44},
    d_ferociousBite:{name:'凶猛撕咬',icon:'🐾',desc:'特色:5倍攻击,吸血30%',         mp:40, type:'dmg',  mul:10, lifeSteal:0.3,               unlockLvl:54},
    d_starsurge: {name:'新月强击',icon:'🌟',desc:'招牌:4倍奥术伤害,吃月火/星界能量', mp:42, type:'dmg', mul:4, unlockLvl:60, castTime:0,
                    fx:{ bonusPerDot:0.2, bonusPerAuraStack:{ key:'d_astral', pct:0.2 }, consumeAura:{ key:'d_astral', all:true } }},
    d_primalWrath:{name:'野性狂怒',icon:'🐾',desc:'招牌:4倍范围撕咬,消耗连击',      mp:40, type:'dmg', mul:4, aoe:true, unlockLvl:70,
                    fx:{ bonusPerAuraStack:{ key:'d_combo', pct:0.18 }, consumeAura:{ key:'d_combo', all:true } }},
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

const SKILL_REWORKS = {
  warrior: {
    cleave:{ desc:'对当前目标造成3倍伤害,并横扫周围敌人', aoe:true, cd:5, fx:{ resourceGain:4 } },
    thunderClap:{ desc:'对所有敌人造成2倍伤害并减速,为斩杀做准备', aoe:true, cd:8, fx:{ bonusVsLowHp:0.18, executeThreshold:0.35 } },
    battleShout:{ desc:'15秒攻击+30%,期间致死打击与斩杀额外造成伤害' },
    mortalStrike:{ desc:'3倍攻击,附带8秒凋零,对破甲目标额外造成60%伤害,并叠加破甲印记', cd:9, fx:{ applyTargetState:'decay2', stateDurationMs:8000, bonusStates:{ sunder:0.6 }, grantAura:{ key:'w_sunder', add:1, max:5, duration:15000 } } },
    bloodthirst:{ desc:'4倍攻击,吸血50%,叠加暴怒,并在低血时额外恢复', cd:8, fx:{ healFromDamagePct:0.25, healBonusIfSelfHpBelow:0.55, extraHealPct:0.08, grantAura:{ key:'w_rage', add:1, max:5, duration:12000 } } },
    execute:{ desc:'5倍攻击,消耗全部怒气;对残血与破甲目标造成更高伤害', cd:12, fx:{ bonusStates:{ sunder:0.45 }, bonusVsLowHp:0.7, executeThreshold:0.35, resourceGainOnKill:12 } },
    sunderArmor:{ desc:'3倍攻击并施加15秒破甲,叠加2层破甲印记', cd:7, fx:{ applyTargetState:'sunder', stateDurationMs:15000, resourceGain:6, grantAura:{ key:'w_sunder', add:2, max:5, duration:15000 } } },
    sweepingStrikes:{ desc:'5倍范围伤害,对残血敌人额外提高伤害', aoe:true, cd:18, fx:{ bonusVsLowHp:0.35, executeThreshold:0.4 } },
    bladestorm:{ desc:'8倍范围伤害,对每个被命中的敌人追加旋风斩', aoe:true, cd:24, fx:{ extraHitPct:0.35 } },
    shieldWall:{ desc:'15秒减伤50%,并在持续期间提升反击能力', cd:28 },
    w_recklessness:{ desc:'6秒内攻击+30%、暴击+12、暴伤+24,适合斩杀窗口', cd:24 },
    w_avatar:{ desc:'8秒攻防兼备,武器技和斩杀都更稳定', cd:28 },
    w_colossus:{ cd:14 },
    w_rampage:{ cd:10 },
  },
  mage: {
    arcane:{ desc:'3倍伤害并叠加奥术充能,强化奥术爆炸', cd:4, fx:{ grantAura:{ key:'arcaneCharge', duration:12000, add:1, max:3 } } },
    arcaneExplosion:{ desc:'3倍范围伤害,消耗奥术充能,每层额外增伤35%', aoe:true, cd:10, fx:{ bonusPerAuraStack:{ key:'arcaneCharge', pct:0.35 }, consumeAura:{ key:'arcaneCharge', all:true } } },
    fireball:{ desc:'3倍伤害并施加点燃与8秒衰老,为炎爆与流星铺垫', cd:6, fx:{ applyTargetState:'decay', stateDurationMs:8000, applyDotKey:'skill:fireball', dotName:'点燃', dotIcon:'🔥', dotPct:0.18, dotMs:6000 } },
    frostbolt:{ desc:'3倍伤害并冰缓目标,叠加指尖寒冰,让冰枪更致命', cd:6, fx:{ applyTargetState:'frozen', stateDurationMs:7000, bonusStates:{ slow:0.2 }, grantAura:{ key:'m_frost', add:1, max:5, duration:12000 } } },
    iceBarrier:{ desc:'15秒受到伤害降低40%,护体存在时寒冰法术更稳' },
    pyroblast:{ desc:'7倍必暴,消耗全部炽热每层+20%,对点燃目标额外60%并引爆灼烧', cd:14, fx:{ bonusStates:{ dot:0.6 }, bonusPerDot:0.18, bonusPerAuraStack:{ key:'m_heat', pct:0.2 }, consumeAura:{ key:'m_heat', all:true }, consumeDots:true, applyDotKey:'skill:pyroblast', dotName:'炎爆灼烧', dotIcon:'☄️', dotPct:0.12, dotMs:5000 } },
    blizzard:{ desc:'5倍范围伤害,对减速/冻结目标额外提高伤害', aoe:true, cd:16, fx:{ bonusStates:{ slow:0.35, frozen:0.5 } } },
    m_combustion:{ desc:'5秒内暴击+20、暴伤+40%,适合火法爆发' },
    m_meteor:{ desc:'9倍范围火焰伤害,对带灼烧目标额外增伤并附加新灼烧', aoe:true, cd:24, fx:{ bonusStates:{ dot:0.45 }, applyDotKey:'skill:m_meteor', dotName:'流星余烬', dotIcon:'☄️', dotPct:0.14, dotMs:5000 } },
  },
  priest: {
    smite:{ desc:'2倍神圣伤害;若你有真言术盾,将把部分伤害转为治疗', cd:4, fx:{ healFromDamagePct:0.2, healFromDamagePctIfBuff:{ key:'shield', pct:0.4 } } },
    shadowWord:{ desc:'3倍伤害并施加暗言术·痛与8秒凋零,叠加疯狂,为暗影技能提供联动', cd:6, fx:{ applyTargetState:'decay2', stateDurationMs:8000, applyDotKey:'skill:shadowWord', dotName:'暗言术·痛', dotIcon:'🌑', dotPct:0.16, dotMs:7000, grantAura:{ key:'p_insanity', add:1, max:6, duration:12000 } } },
    shield:{ desc:'15秒受到伤害降低33%,并让惩击转化为额外治疗' },
    heal:{ desc:'恢复40%生命,过量治疗将转化为护盾', cd:12, fx:{ shieldFromOverhealPct:0.65 } },
    holyNova:{ desc:'3倍范围神圣伤害并自愈,敌人越多恢复越多', aoe:true, cd:10, fx:{ healFromDamagePct:0.32 } },
    powerInfusion:{ desc:'15秒攻速+50%,让惩击与心灵震爆更快成型' },
    mindBlast:{ desc:'4倍伤害,对带暗言术·痛的目标额外造成伤害,叠加2层疯狂并获得护盾', cd:9, fx:{ bonusPerDot:0.25, shieldFromDamagePct:0.16, grantAura:{ key:'p_insanity', add:2, max:6, duration:12000 } } },
    p_pwShield:{ desc:'5秒受到伤害降低40%,适合戒律窗口' },
    p_holyNova:{ desc:'立即恢复40%生命,并留下短暂护盾', fx:{ shieldFromHealPct:0.25 } },
    p_mindBlast:{ desc:'9倍必暴暗影冲击,对持续伤害目标收益更高', fx:{ bonusPerDot:0.3, shieldFromDamagePct:0.18 } },
  },
  rogue: {
    sinister:{ desc:'2倍伤害,叠加连击点,命中减速/中毒目标时更易追击', cd:4, fx:{ bonusStates:{ slow:0.2 }, resourceGain:4, grantAura:{ key:'r_combo', add:1, max:5, duration:12000 } } },
    backstab:{ desc:'3倍伤害,叠加2点连击,对减速/破绽目标额外造成伤害', cd:5, fx:{ bonusStates:{ slow:0.6, exposed:0.5 }, grantAura:{ key:'r_combo', add:2, max:5, duration:12000 } } },
    poison:{ desc:'3倍伤害并施加致命毒药与8秒衰老,叠加毒锋,为终结技提供收益', cd:6, fx:{ applyTargetState:'decay', stateDurationMs:8000, applyDotKey:'skill:poison', dotName:'致命毒药', dotIcon:'🐍', dotPct:0.17, dotMs:7000, grantAura:{ key:'r_venom', add:1, max:5, duration:12000 } } },
    evasion:{ desc:'15秒受到伤害降低34%,帮助你撑过危险窗口' },
    kidneyShot:{ desc:'4倍伤害并让目标进入破绽状态,便于背刺', cd:10, fx:{ applyTargetState:'exposed', stateDurationMs:7000 } },
    killingSpree:{ desc:'7倍必暴,对中毒目标追加连击', cd:16, fx:{ bonusPerDot:0.22, extraHitPct:0.45 } },
    shadow:{ desc:'15秒攻击+50%,且下一个终结技必定暴击' },
    r_bladeflurry:{ desc:'6秒攻速与攻击提升,盗贼进入连打窗口' },
    r_adrenaline:{ desc:'5秒攻速+33%,更快倾泻终结技' },
    r_eviscerate:{ desc:'10倍攻击,消耗全部连击点每层+16%,中毒则额外增伤并引爆持续伤害', cd:14, fx:{ bonusPerDot:0.28, bonusPerAuraStack:{ key:'r_combo', pct:0.16 }, consumeAura:{ key:'r_combo', all:true }, forceCritIfBuff:'shadowstep', consumeDots:true, applyDotKey:'skill:r_eviscerate', dotName:'撕裂伤口', dotIcon:'🩸', dotPct:0.1, dotMs:5000 } },
  },
  hunter: {
    arcaneShot:{ desc:'2倍攻击,叠加野兽狂怒,对带钉刺目标额外提高伤害', cd:4, fx:{ bonusPerDot:0.18, grantAura:{ key:'h_frenzy', add:1, max:5, duration:12000 } } },
    serpentSting:{ desc:'3倍攻击并施加毒蛇钉刺与8秒衰老,为瞄准与爆炸射击做准备', cd:6, fx:{ applyTargetState:'decay', stateDurationMs:8000, applyDotKey:'skill:serpentSting', dotName:'毒蛇钉刺', dotIcon:'🐍', dotPct:0.16, dotMs:7000 } },
    rapidFire:{ desc:'15秒攻速+60%,让射击循环明显提速' },
    aimed:{ desc:'4倍必暴,对带钉刺目标额外提高伤害', cd:10, fx:{ bonusPerDot:0.32 } },
    multi:{ desc:'3倍范围伤害,命中的敌人越多越适合接杀戮射击', aoe:true, cd:8, fx:{ bonusVsLowHp:0.12, executeThreshold:0.4 } },
    killShot:{ desc:'7倍攻击,对残血目标造成更高伤害并在击杀后返还能量', cd:12, fx:{ bonusVsLowHp:0.8, executeThreshold:0.35, resourceGainOnKill:14 } },
    bestialWrath:{ desc:'15秒攻击+40%,野兽之怒期间高倍率技能更狠' },
    h_killCommand:{ desc:'6秒爆发窗口,适合开怪与Boss' },
    h_explosiveShot:{ desc:'10倍爆炸射击,对带钉刺目标额外增伤并溅射附近敌人', cd:14, fx:{ bonusPerDot:0.3, splashPct:0.35 } },
  },
  shaman: {
    lightning:{ desc:'2倍闪电伤害,命中会为风暴打击积蓄雷霆', cd:4, fx:{ grantAura:{ key:'stormCharge', duration:12000, add:1, max:3 } } },
    flameShock:{ desc:'3倍伤害并施加烈焰震击与8秒衰老,叠加漩涡之力,点燃后续爆发', cd:6, fx:{ applyTargetState:'decay', stateDurationMs:8000, applyDotKey:'skill:flameShock', dotName:'烈焰震击', dotIcon:'🔥', dotPct:0.16, dotMs:7000, grantAura:{ key:'sh_maelstrom', add:1, max:5, duration:12000 } } },
    earthShield:{ desc:'15秒受到伤害降低33%,并强化你的治疗波' },
    chainLightning:{ desc:'4倍范围闪电伤害,雷霆充能会强化它', aoe:true, cd:10, fx:{ bonusPerAuraStack:{ key:'stormCharge', pct:0.18 }, consumeAura:{ key:'stormCharge', add:-1 } } },
    healingWave:{ desc:'恢复35%生命,过量治疗会转成大地护盾', cd:12, fx:{ shieldFromOverhealPct:0.55, shieldBonusIfBuff:{ key:'earthShield', pct:0.2 } } },
    bloodlust:{ desc:'15秒攻速+80%,让萨满进入狂风窗口' },
    windfury:{ desc:'15秒攻速+60%,期间风暴打击会额外追击' },
    s_bloodlust:{ desc:'6秒短爆发,急速更集中' },
    s_stormstrike:{ desc:'9倍风暴打击,叠漩涡之力,受烈焰震击/风怒/雷霆充能共同强化', cd:12, fx:{ bonusPerDot:0.2, bonusIfBuff:{ windfury:0.4 }, bonusPerAuraStack:{ key:'stormCharge', pct:0.16 }, extraHitPctIfBuff:{ key:'windfury', pct:0.4 }, consumeAura:{ key:'stormCharge', all:true }, grantAura:{ key:'sh_maelstrom', add:1, max:5, duration:12000 } } },
  },
  paladin: {
    judgement:{ desc:'2倍神圣伤害并施加审判与8秒衰老,叠加圣能,为制裁与神圣风暴开路', cd:5, fx:{ applyTargetState:[{ key:'judged', durMs:12000 }, { key:'decay', durMs:8000 }], grantAura:{ key:'pa_holyPower', add:1, max:5, duration:15000 } } },
    consecration:{ desc:'3倍范围神圣伤害,对被审判敌人额外提高伤害', aoe:true, cd:10, fx:{ bonusStates:{ judged:0.35 } } },
    holyLight:{ desc:'恢复40%生命,过量治疗会化为圣光护盾', cd:12, fx:{ shieldFromOverhealPct:0.75 } },
    crusader:{ desc:'3倍必暴,叠加圣能,对被审判目标额外提高伤害并回复生命', cd:8, fx:{ bonusStates:{ judged:0.55 }, healFromDamagePct:0.22, grantAura:{ key:'pa_holyPower', add:1, max:5, duration:15000 } } },
    blessingKings:{ desc:'15秒全属性+20%,适合长线战斗' },
    avengingWrath:{ desc:'15秒攻击+50%,配合审判窗口爆发' },
    divineShield:{ desc:'15秒减伤80%,濒危时强保命' },
    pa_avengingWrath:{ desc:'6秒爆发更锐利' },
    pa_flashLight:{ desc:'立即恢复40%生命,并留下一层护盾', cd:9, fx:{ shieldFromHealPct:0.3 } },
    pa_holyWrath:{ desc:'9倍范围神圣风暴,对被审判敌人更狠', aoe:true, cd:16, fx:{ bonusStates:{ judged:0.45 } } },
  },
  warlock: {
    shadowBolt:{ desc:'3倍暗影伤害,目标每多一种痛苦效果伤害越高', cd:5, fx:{ bonusPerDot:0.18 } },
    immolate:{ desc:'3倍火焰伤害并施加献祭,叠加余烬,和腐蚀术可同时存在', cd:6, fx:{ applyDotKey:'skill:immolate', dotName:'献祭', dotIcon:'🔥', dotPct:0.17, dotMs:7000, grantAura:{ key:'wl_ember', add:1, max:5, duration:12000 } } },
    corruption:{ desc:'3倍暗影伤害并施加腐蚀术,叠加灵魂碎片,是术士循环的起点', cd:6, fx:{ applyDotKey:'skill:corruption', dotName:'腐蚀术', dotIcon:'🧿', dotPct:0.15, dotMs:8000, grantAura:{ key:'wl_shard', add:1, max:5, duration:12000 } } },
    unstableAffliction:{ desc:'4倍伤害并施加痛苦无常与8秒凋零,叠加2层灵魂碎片', cd:7, fx:{ applyTargetState:'decay2', stateDurationMs:8000, applyDotKey:'skill:unstableAffliction', dotName:'痛苦无常', dotIcon:'💜', dotPct:0.18, dotMs:8000, grantAura:{ key:'wl_shard', add:2, max:5, duration:12000 } } },
    drainLife:{ desc:'4倍吸取生命,低血时额外治疗并留下护盾', cd:12, fx:{ healFromDamagePct:0.35, healBonusIfSelfHpBelow:0.6, shieldFromDamagePct:0.12 } },
    fear:{ desc:'3倍伤害并减速,让献祭与混乱之箭更容易打满', cd:10, fx:{ applyTargetState:'terror', stateDurationMs:6000 } },
    chaosBolt:{ desc:'8倍混乱之箭,消耗全部余烬每层+18%,引爆痛苦', cd:16, fx:{ bonusPerDot:0.26, bonusPerAuraStack:{ key:'wl_ember', pct:0.18 }, consumeAura:{ key:'wl_ember', all:true }, consumeDots:true, splashPct:0.25 } },
    incinerate:{ desc:'5倍烧尽,叠加余烬,对痛苦缠身的目标额外提高伤害', cd:8, fx:{ bonusPerDot:0.22, grantAura:{ key:'wl_ember', add:1, max:5, duration:12000 } } },
    wl_darkSoul:{ desc:'6秒暗影增幅,非常适合多DOT爆发' },
    wl_lifeTap:{ desc:'6秒吸血+20与攻击+13%,配合生命通道续航' },
    wl_chaosBolt:{ desc:'10倍混乱之箭,必暴,消耗全部余烬每层+18%并引爆痛苦', cd:18, fx:{ bonusPerDot:0.32, bonusPerAuraStack:{ key:'wl_ember', pct:0.18 }, consumeAura:{ key:'wl_ember', all:true }, consumeDots:true, splashPct:0.35 } },
  },
  druid: {
    wrath:{ desc:'2倍自然伤害,对带月火术的目标额外提高伤害', cd:4, fx:{ bonusPerDot:0.2 } },
    swipe:{ desc:'2倍范围横扫,叠加撕咬连击,对残血敌人额外提高伤害', aoe:true, cd:8, fx:{ bonusVsLowHp:0.22, executeThreshold:0.4, grantAura:{ key:'d_combo', add:1, max:5, duration:12000 } } },
    rejuvenation:{ desc:'恢复35%生命,过量治疗会化为自然护盾', cd:10, fx:{ shieldFromOverhealPct:0.5 } },
    moonfire:{ desc:'3倍伤害并施加月火术与8秒衰老,叠加星界能量,是平衡与野性的共同起点', cd:6, fx:{ applyTargetState:'decay', stateDurationMs:8000, applyDotKey:'skill:moonfire', dotName:'月火术', dotIcon:'🌙', dotPct:0.16, dotMs:7000, grantAura:{ key:'d_astral', add:1, max:5, duration:12000 } } },
    starfire:{ desc:'5倍奥术伤害,叠加2层星界能量', fx:{ grantAura:{ key:'d_astral', add:2, max:5, duration:12000 } } },
    bite:{ desc:'4倍必暴,叠加撕咬连击,对带月火术或残血目标额外提高伤害', cd:10, fx:{ bonusPerDot:0.24, bonusVsLowHp:0.5, executeThreshold:0.35, grantAura:{ key:'d_combo', add:1, max:5, duration:12000 } } },
    berserk:{ desc:'15秒攻击+40%攻速+30%,野性窗口全面强化' },
    barkskin:{ desc:'15秒减伤60%,帮助德鲁伊稳住回复节奏' },
    d_berserk:{ desc:'6秒短爆发,野性全开' },
    d_rejuv:{ desc:'立即恢复35%生命,并留下自然护盾', cd:8, fx:{ shieldFromHealPct:0.25 } },
    d_ferociousBite:{ desc:'10倍凶猛撕咬,消耗全部连击每层+18%,对残血与月火目标额外提高伤害', cd:14, fx:{ bonusPerDot:0.3, bonusPerAuraStack:{ key:'d_combo', pct:0.18 }, consumeAura:{ key:'d_combo', all:true }, bonusVsLowHp:0.55, executeThreshold:0.35 } },
  },
};

(function injectSkillReworks() {
  if (typeof CLASSES === 'undefined') return;
  for (const [clsKey, skills] of Object.entries(SKILL_REWORKS)) {
    const cls = CLASSES[clsKey];
    if (!cls || !cls.skills) continue;
    for (const [skillKey, patch] of Object.entries(skills)) {
      if (!cls.skills[skillKey]) continue;
      Object.assign(cls.skills[skillKey], patch);
    }
  }
})();

const CLASS_MECHANIC_SKILL_PATCHES = {
  warrior: {
    shieldWall:{ desc:'15秒减伤50%,叠加盾牌格挡;防护专精承伤会按防御高额反震', fx:{ grantAura:{ key:'w_block', add:3, max:5, duration:15000 }, classMechanic:'防护:承伤叠盾牌格挡并反震;盾牌格挡满层会转为护盾' } },
    challengingShout:{ desc:'10秒减伤并嘲讽战场,立即叠加盾牌格挡', buff:'w_shieldBlock', fx:{ grantAura:{ key:'w_block', add:2, max:5, duration:12000 }, classMechanic:'防护:挑战期间反伤更高' } },
    w_ironwall:{ desc:'5秒钢铁壁垒,叠加盾牌格挡并提高反震效率', buff:'w_ironwall', fx:{ grantAura:{ key:'w_block', add:3, max:5, duration:12000 }, classMechanic:'防护:壁垒期间承伤会额外反击' } },
    thunderClap:{ desc:'范围雷霆一击,降低敌速并叠1层盾牌格挡', fx:{ bonusVsLowHp:0.18, executeThreshold:0.35, grantAura:{ key:'w_block', add:1, max:5, duration:12000 } } },
  },
  mage: {
    dragonBreath:{ desc:'瞬发龙息造成火焰伤害,对点燃目标额外提高并刷新炽热', fx:{ bonusStates:{ dot:0.35 }, applyDotKey:'skill:dragonBreath', dotName:'龙息余焰', dotIcon:'🐲', dotPct:0.12, dotMs:5000, grantAura:{ key:'m_heat', add:1, max:5, duration:12000 } } },
    slow:{ desc:'减速并施加冻结印记,冰枪术和暴风雪会吃到碎裂收益', fx:{ applyTargetState:[{ key:'frozen', durMs:7000 }], grantAura:{ key:'m_frost', add:1, max:5, duration:12000 } } },
    timeWarp:{ desc:'15秒时间扭曲,立即获得奥术充能并让爆发窗口更集中', fx:{ grantAura:{ key:'arcaneCharge', add:2, max:3, duration:12000 } } },
    m_arcanePower:{ desc:'5秒奥术强化,获得2层奥术充能并加速施法', fx:{ grantAura:{ key:'arcaneCharge', add:2, max:3, duration:12000 } } },
  },
  priest: {
    shield:{ desc:'15秒真言术盾,同时给随从施加恩典护盾', fx:{ grantAura:{ key:'p_grace', add:1, max:5, duration:15000 }, companionShieldPct:0.10, companionBuff:'p_grace', companionBuffMs:10000, classMechanic:'戒律/神圣:护盾也会保护随从' } },
    p_pwShield:{ desc:'5秒强力真言术盾,同步给随从加盾和恩典', fx:{ grantAura:{ key:'p_grace', add:2, max:5, duration:15000 }, companionShieldPct:0.12, companionBuff:'p_grace', companionBuffMs:10000 } },
    heal:{ desc:'治疗主角并让随从获得溅射治疗与恩典', fx:{ shieldFromOverhealPct:0.65, grantAura:{ key:'p_grace', add:1, max:5, duration:15000 }, companionHealPct:0.28, companionShieldPct:0.05, companionBuff:'p_grace', companionBuffMs:10000 } },
    p_holyNova:{ desc:'立即恢复生命,并让随从获得治疗、护盾和恩典', fx:{ shieldFromHealPct:0.25, grantAura:{ key:'p_grace', add:1, max:5, duration:15000 }, companionHealPct:0.22, companionShieldPct:0.08, companionBuff:'p_grace', companionBuffMs:10000 } },
    powerInfusion:{ desc:'15秒能量灌注,主角和随从一起获得急速与恩典', fx:{ companionBuff:'p_grace', companionBuffMs:12000, companionShieldPct:0.06 } },
    divineHymn:{ desc:'神圣赞美诗大治疗,会同时治疗随从并给双方加护盾', fx:{ companionHealPct:0.40, companionShieldPct:0.10, companionBuff:'p_grace', companionBuffMs:12000, grantAura:{ key:'p_grace', add:2, max:5, duration:15000 } } },
  },
  hunter: {
    summonPet:{ desc:'召唤宠物持续作战;宠物在场时猎人获得兽群羁绊', fx:{ grantAura:{ key:'h_beastBond', add:2, max:5, duration:16000 }, classMechanic:'宠物/召唤物在场时协同猛攻更强' } },
    huntersMark:{ desc:'猎人印记施加破绽和钉刺窗口,并叠兽群羁绊', fx:{ applyTargetState:[{ key:'marked', durMs:14000 }, { key:'exposed', durMs:9000 }], grantAura:{ key:'h_beastBond', add:1, max:5, duration:15000 } } },
    bestialWrath:{ desc:'野兽狂怒强化猎人与宠物,并立即叠兽群羁绊', fx:{ grantAura:{ key:'h_beastBond', add:2, max:5, duration:15000 } } },
    h_killCommand:{ desc:'短爆发命令宠物撕咬,宠物/召唤物在场时额外追击', fx:{ grantAura:{ key:'h_beastBond', add:1, max:5, duration:15000 }, extraHitPctIfSummon:0.35 } },
    h_coordinatedAssault:{ desc:'兽群协同猛攻,消耗兽群羁绊后多段追击', fx:{ bonusPerAuraStack:{ key:'h_beastBond', pct:0.20 }, consumeAura:{ key:'h_beastBond', all:true }, extraHitPct:0.45, extraHitPctIfSummon:0.35 } },
    stampede:{ desc:'兽群奔腾召唤多只野兽,大幅堆叠兽群羁绊', fx:{ grantAura:{ key:'h_beastBond', add:3, max:5, duration:16000 } } },
  },
  shaman: {
    earthShield:{ desc:'大地之盾保护主角与随从,叠图腾共鸣', fx:{ grantAura:{ key:'sh_totem', add:1, max:5, duration:15000 }, companionShieldPct:0.08, companionBuff:'sh_ancestral', companionBuffMs:10000 } },
    s_earthShield:{ desc:'强力大地之盾,同步保护随从并叠图腾共鸣', fx:{ grantAura:{ key:'sh_totem', add:2, max:5, duration:15000 }, companionShieldPct:0.10, companionBuff:'sh_ancestral', companionBuffMs:10000 } },
    healingWave:{ desc:'治疗主角,过量转盾;恢复专精会额外治疗随从并叠图腾共鸣', fx:{ shieldFromOverhealPct:0.55, shieldBonusIfBuff:{ key:'earthShield', pct:0.2 }, grantAura:{ key:'sh_totem', add:1, max:5, duration:15000 }, companionHealPct:0.24, companionShieldPct:0.05, companionBuff:'sh_ancestral', companionBuffMs:9000 } },
    s_healingTide:{ desc:'治疗之泉涌起,同时治疗随从并给双方图腾护持', fx:{ grantAura:{ key:'sh_totem', add:2, max:5, duration:15000 }, companionHealPct:0.30, companionShieldPct:0.07, companionBuff:'sh_ancestral', companionBuffMs:10000 } },
    spiritLink:{ desc:'灵魂链接让主角与随从互相分担压力,并叠满图腾共鸣', fx:{ grantAura:{ key:'sh_totem', add:3, max:5, duration:15000 }, companionHealPct:0.18, companionShieldPct:0.12, companionBuff:'sh_ancestral', companionBuffMs:12000 } },
    thunderstorm:{ desc:'雷霆风暴击退战场,图腾共鸣越高伤害越强', fx:{ bonusPerAuraStack:{ key:'sh_totem', pct:0.12 }, consumeAura:{ key:'sh_totem', add:-1 }, applyTargetState:'shocked', stateDurationMs:8000 } },
  },
  paladin: {
    blessingKings:{ desc:'王者祝福提高属性并叠圣光壁垒,防骑依靠祝福滚回复和护盾', fx:{ grantAura:{ key:'pa_bulwark', add:2, max:5, duration:15000 }, companionBuff:'pa_devotion', companionBuffMs:12000, companionShieldPct:0.08 } },
    sacredShield:{ desc:'圣洁护盾叠圣光壁垒,同时保护随从', fx:{ grantAura:{ key:'pa_bulwark', add:2, max:5, duration:15000 }, companionBuff:'pa_devotion', companionBuffMs:12000, companionShieldPct:0.10 } },
    divineShield:{ desc:'圣盾术高额减伤并叠圣光壁垒;防骑低血时会触发圣光回涌', fx:{ grantAura:{ key:'pa_bulwark', add:3, max:5, duration:15000 }, companionShieldPct:0.08, companionBuff:'pa_devotion', companionBuffMs:10000 } },
    pa_guardian:{ desc:'守护者减伤并叠圣光壁垒,随从同步获得虔诚祝福', fx:{ grantAura:{ key:'pa_bulwark', add:2, max:5, duration:15000 }, companionBuff:'pa_devotion', companionBuffMs:10000, companionShieldPct:0.08 } },
    holyLight:{ desc:'圣光术恢复生命,消耗部分圣光壁垒会额外给随从回血和护盾', fx:{ shieldFromOverhealPct:0.75, companionHealPct:0.20, companionShieldPct:0.06, companionBuff:'pa_devotion', companionBuffMs:9000 } },
    flashOfLight:{ desc:'圣光闪现快速救急,同时给随从小治疗', fx:{ shieldFromHealPct:0.22, companionHealPct:0.16, companionShieldPct:0.04, companionBuff:'pa_devotion', companionBuffMs:7000 } },
    pa_flashLight:{ desc:'瞬发圣光闪现,随从同步获得治疗与虔诚护持', fx:{ shieldFromHealPct:0.3, companionHealPct:0.22, companionShieldPct:0.08, companionBuff:'pa_devotion', companionBuffMs:9000 } },
    hammerOfRighteous:{ desc:'正义之锤对被审判目标更痛,并叠圣光壁垒', fx:{ bonusStates:{ judged:0.40 }, grantAura:{ key:'pa_bulwark', add:1, max:5, duration:15000 } } },
  },
  warlock: {
    inferno:{ desc:'召唤地狱火,每个恶魔在场都会让恶魔之箭更强', fx:{ grantAura:{ key:'wl_ember', add:2, max:5, duration:15000 }, classMechanic:'恶魔在场时恶魔之箭和混乱之箭获得额外收益' } },
    metamorphosis:{ desc:'恶魔变身,强化恶魔之箭、吸血和恶魔召唤循环', fx:{ grantAura:{ key:'wl_shard', add:2, max:5, duration:15000 } } },
    shadowFury:{ desc:'暗影之怒范围压制,对多DOT目标额外提高并散播痛苦', fx:{ bonusPerDot:0.18, spreadDotsPct:0.45, applyTargetState:'terror', stateDurationMs:7000 } },
    soulFire:{ desc:'灵魂之火必暴,目标痛苦越多越痛并转化为护盾', fx:{ bonusPerDot:0.25, shieldFromDamagePct:0.10, grantAura:{ key:'wl_ember', add:1, max:5, duration:12000 } } },
    wl_demonbolt:{ desc:'恶魔之箭,恶魔形态或召唤物在场时都会强化', fx:{ bonusIfBuff:{ demonForm:0.5 }, bonusPerAuraStack:{ key:'wl_shard', pct:0.10 }, extraHitPctIfSummon:0.30 } },
  },
  druid: {
    rejuvenation:{ desc:'回春术治疗主角,恢复专精会同步滋养随从并叠自然调和', fx:{ shieldFromOverhealPct:0.5, grantAura:{ key:'d_harmony', add:1, max:5, duration:15000 }, companionHealPct:0.22, companionShieldPct:0.05, companionBuff:'d_lifebloom', companionBuffMs:10000 } },
    wildGrowth:{ desc:'野性成长治疗主角和随从,叠自然调和', fx:{ grantAura:{ key:'d_harmony', add:2, max:5, duration:15000 }, companionHealPct:0.28, companionShieldPct:0.06, companionBuff:'d_lifebloom', companionBuffMs:10000 } },
    tranquility:{ desc:'宁静大量治疗,为随从和主角留下自然护盾', fx:{ grantAura:{ key:'d_harmony', add:3, max:5, duration:15000 }, companionHealPct:0.38, companionShieldPct:0.10, companionBuff:'d_lifebloom', companionBuffMs:12000 } },
    barkskin:{ desc:'树皮术减伤,同时给随从套上生命绽放', fx:{ grantAura:{ key:'d_harmony', add:1, max:5, duration:15000 }, companionShieldPct:0.08, companionBuff:'d_lifebloom', companionBuffMs:10000 } },
    entanglingRoots:{ desc:'纠缠根须施加缠绕,平衡/恢复德可借自然调和强化后续伤害', fx:{ applyTargetState:'rooted', stateDurationMs:9000, bonusPerAuraStack:{ key:'d_harmony', pct:0.08 }, grantAura:{ key:'d_harmony', add:1, max:5, duration:15000 } } },
    hurricane:{ desc:'飓风范围伤害,会消耗1层自然调和打出额外风暴', fx:{ bonusPerAuraStack:{ key:'d_harmony', pct:0.10 }, consumeAura:{ key:'d_harmony', add:-1 }, applyTargetState:'slow', stateDurationMs:6000 } },
  },
};

(function injectClassMechanicSkillPatches() {
  if (typeof CLASSES === 'undefined') return;
  for (const [clsKey, skills] of Object.entries(CLASS_MECHANIC_SKILL_PATCHES)) {
    const cls = CLASSES[clsKey];
    if (!cls || !cls.skills) continue;
    for (const [skillKey, patch] of Object.entries(skills)) {
      if (!cls.skills[skillKey]) continue;
      const sk = cls.skills[skillKey];
      const mergedFx = Object.assign({}, sk.fx || {}, patch.fx || {});
      Object.assign(sk, patch);
      if (Object.keys(mergedFx).length) sk.fx = mergedFx;
    }
  }
})();

const SPEC_SIGNATURE_SKILLS = {
  warrior: {
    w_overpower:{ name:'压制', icon:'⚔️', desc:'武器专精:4倍攻击,对破甲目标更强并叠破甲印记', mp:24, type:'dmg', mul:4, unlockLvl:16, fx:{ bonusStates:{ sunder:0.45 }, grantAura:{ key:'w_sunder', add:1, max:5, duration:15000 } } },
    w_ragingBlow:{ name:'怒击', icon:'😡', desc:'狂暴专精:4倍双持猛击,叠暴怒并追加一次轻击', mp:26, type:'dmg', mul:4, unlockLvl:16, fx:{ grantAura:{ key:'w_rage', add:2, max:5, duration:12000 }, extraHitPct:0.25 } },
    w_shieldSlam:{ name:'盾牌猛击', icon:'🛡️', desc:'防护专精:3倍盾击,按盾牌格挡层数提高伤害并转化护盾', mp:22, type:'dmg', mul:3, unlockLvl:1, fx:{ bonusPerAuraStack:{ key:'w_block', pct:0.18 }, grantAura:{ key:'w_block', add:1, max:5, duration:12000 }, shieldFromDamagePct:0.12 } },
    w_revenge:{ name:'复仇', icon:'🧱', desc:'防护专精:4倍反击,盾牌格挡越高伤害越高', mp:28, type:'dmg', mul:4, unlockLvl:24, fx:{ bonusPerAuraStack:{ key:'w_block', pct:0.22 }, extraHitPctIfBuff:{ key:'w_shieldBlock', pct:0.35 } } },
  },
  mage: {
    m_arcaneBlast:{ name:'奥术冲击', icon:'🔷', desc:'奥术专精:3倍奥术伤害,叠奥术充能;充能越高蓝耗越高但爆发更强', mp:18, type:'dmg', mul:3, unlockLvl:1, castTime:1.8, fx:{ grantAura:{ key:'arcaneCharge', add:1, max:4, duration:12000 } } },
    m_livingBomb:{ name:'活动炸弹', icon:'💣', desc:'火焰专精:3倍火焰伤害并附加活动炸弹,为炎爆/流星铺点燃', mp:26, type:'dmg', mul:3, dot:true, unlockLvl:18, castTime:0, fx:{ applyTargetState:'decay', stateDurationMs:8000, applyDotKey:'skill:m_livingBomb', dotName:'活动炸弹', dotIcon:'💣', dotPct:0.2, dotMs:8000, grantAura:{ key:'m_heat', add:1, max:5, duration:12000 } } },
    m_frozenOrb:{ name:'冰冻宝珠', icon:'🧊', desc:'冰霜专精:4倍范围冰霜伤害,冻结敌人并叠指尖寒冰', mp:36, type:'dmg', mul:4, aoe:true, unlockLvl:18, castTime:0, fx:{ applyTargetState:[{ key:'frozen', durMs:8000 }, { key:'slow', durMs:8000 }], grantAura:{ key:'m_frost', add:2, max:5, duration:12000 } } },
  },
  priest: {
    p_prayerMending:{ name:'愈合祷言', icon:'✨', desc:'神圣专精:恢复生命,并给随从弹跳治疗与恩典', mp:32, type:'heal', heal:0.32, unlockLvl:16, fx:{ companionHealPct:0.22, companionShieldPct:0.05, companionBuff:'p_grace', companionBuffMs:10000, grantAura:{ key:'p_grace', add:1, max:5, duration:15000 } } },
    p_devouringPlague:{ name:'噬灵疫病', icon:'🦠', desc:'暗影专精:4倍暗影伤害,目标痛苦越多越强并治疗自身', mp:34, type:'dmg', mul:4, dot:true, unlockLvl:18, fx:{ bonusPerDot:0.28, healFromDamagePct:0.28, grantAura:{ key:'p_insanity', add:2, max:6, duration:12000 } } },
  },
  rogue: {
    r_mutilate:{ name:'毁伤', icon:'🗡️', desc:'刺杀专精:4倍攻击,对中毒目标额外提高并叠毒锋', mp:28, type:'dmg', mul:4, unlockLvl:16, fx:{ bonusPerDot:0.3, grantAura:{ key:'r_venom', add:2, max:5, duration:12000 } } },
    r_bladeRush:{ name:'剑刃冲刺', icon:'⚔️', desc:'战斗专精:4倍攻击,叠连击点并追加乱舞追击', mp:30, type:'dmg', mul:4, unlockLvl:18, fx:{ grantAura:{ key:'r_combo', add:2, max:5, duration:12000 }, extraHitPct:0.28 } },
    r_shadowDance:{ name:'暗影之舞', icon:'🌑', desc:'敏锐专精:6秒进入暗影爆发,暗袭/背刺更致命', mp:30, type:'buff', buff:'shadowstep', duration:6000, unlockLvl:22 },
  },
  hunter: {
    h_barbedShot:{ name:'倒刺射击', icon:'🐾', desc:'兽王专精:3倍射击,叠兽群羁绊并让宠物追击', mp:22, type:'dmg', mul:3, unlockLvl:1, fx:{ grantAura:{ key:'h_beastBond', add:1, max:5, duration:15000 }, extraHitPctIfSummon:0.25 } },
    h_preciseShot:{ name:'精确射击', icon:'🎯', desc:'射击专精:4倍远程伤害,对猎人印记目标额外提高', mp:30, type:'dmg', mul:4, unlockLvl:16, fx:{ bonusStates:{ marked:0.45, exposed:0.3 } } },
    h_wildfireBomb:{ name:'野火炸弹', icon:'💣', desc:'生存专精:4倍火焰范围伤害,附加持续灼烧', mp:34, type:'dmg', mul:4, aoe:true, dot:true, unlockLvl:18, fx:{ applyDotKey:'skill:h_wildfireBomb', dotName:'野火', dotIcon:'💣', dotPct:0.18, dotMs:7000, splashPct:0.25 } },
  },
  shaman: {
    sh_elementalBlast:{ name:'元素冲击', icon:'🌋', desc:'元素专精:4倍元素伤害,消耗雷霆充能爆发', mp:34, type:'dmg', mul:4, unlockLvl:18, fx:{ bonusPerAuraStack:{ key:'stormCharge', pct:0.24 }, consumeAura:{ key:'stormCharge', all:true } } },
    sh_crashLightning:{ name:'毁灭闪电', icon:'⚡', desc:'增强专精:4倍范围近战闪电,叠漩涡并触发风怒追击', mp:32, type:'dmg', mul:4, aoe:true, unlockLvl:18, fx:{ grantAura:{ key:'sh_maelstrom', add:2, max:5, duration:12000 }, extraHitPctIfBuff:{ key:'windfury', pct:0.35 } } },
    sh_riptide:{ name:'激流', icon:'🌊', desc:'恢复专精:快速治疗主角和随从,叠图腾共鸣', mp:28, type:'heal', heal:0.28, unlockLvl:1, fx:{ companionHealPct:0.18, companionBuff:'sh_ancestral', companionBuffMs:9000, grantAura:{ key:'sh_totem', add:1, max:5, duration:15000 } } },
  },
  paladin: {
    pa_beacon:{ name:'圣光道标', icon:'🌟', desc:'神圣专精:治疗主角并把一部分圣光转给随从', mp:30, type:'heal', heal:0.30, unlockLvl:16, fx:{ companionHealPct:0.24, companionShieldPct:0.06, companionBuff:'pa_devotion', companionBuffMs:10000 } },
    pa_shieldRighteous:{ name:'正义盾击', icon:'🛡️', desc:'防护专精:3倍盾击,叠圣光壁垒并获得护盾', mp:24, type:'dmg', mul:3, unlockLvl:1, fx:{ grantAura:{ key:'pa_bulwark', add:1, max:5, duration:15000 }, shieldFromDamagePct:0.16 } },
    pa_bladeJustice:{ name:'公正之剑', icon:'⚔️', desc:'惩戒专精:4倍神圣攻击,对审判目标额外提高并叠圣能', mp:30, type:'dmg', mul:4, unlockLvl:16, fx:{ bonusStates:{ judged:0.5 }, grantAura:{ key:'pa_holyPower', add:2, max:5, duration:15000 } } },
  },
  warlock: {
    wl_agony:{ name:'痛楚', icon:'💜', desc:'痛苦专精:2倍暗影伤害,附加痛楚并叠灵魂碎片', mp:20, type:'dmg', mul:2, dot:true, unlockLvl:1, fx:{ applyDotKey:'skill:wl_agony', dotName:'痛楚', dotIcon:'💜', dotPct:0.16, dotMs:9000, grantAura:{ key:'wl_shard', add:1, max:5, duration:12000 } } },
    wl_handGuldan:{ name:'古尔丹之手', icon:'😈', desc:'恶魔学识专精:4倍暗影火,恶魔在场时追加追击', mp:34, type:'dmg', mul:4, unlockLvl:16, fx:{ grantAura:{ key:'wl_shard', add:1, max:5, duration:12000 }, extraHitPctIfSummon:0.35 } },
    wl_conflagrate:{ name:'燃烧', icon:'🔥', desc:'毁灭专精:瞬发火焰爆发,对献祭目标更强并叠余烬', mp:26, type:'dmg', mul:4, unlockLvl:16, castTime:0, fx:{ bonusPerDot:0.22, grantAura:{ key:'wl_ember', add:2, max:5, duration:12000 } } },
  },
  druid: {
    d_eclipse:{ name:'星涌术', icon:'🌠', desc:'平衡专精:4倍星界伤害,消耗星界能量爆发', mp:34, type:'dmg', mul:4, unlockLvl:16, fx:{ bonusPerAuraStack:{ key:'d_astral', pct:0.24 }, consumeAura:{ key:'d_astral', all:true } } },
    d_rake:{ name:'斜掠', icon:'🐾', desc:'野性专精:3倍流血攻击,叠撕咬连击并铺持续伤害', mp:24, type:'dmg', mul:3, dot:true, unlockLvl:1, fx:{ applyDotKey:'skill:d_rake', dotName:'斜掠流血', dotIcon:'🐾', dotPct:0.16, dotMs:7000, grantAura:{ key:'d_combo', add:1, max:5, duration:12000 } } },
    d_lifebloomSpell:{ name:'生命绽放', icon:'🌿', desc:'恢复专精:恢复生命,过量治疗转护盾并强化随从', mp:30, type:'heal', heal:0.30, unlockLvl:16, fx:{ shieldFromOverhealPct:0.55, companionHealPct:0.20, companionBuff:'d_lifebloom', companionBuffMs:10000, grantAura:{ key:'d_harmony', add:1, max:5, duration:15000 } } },
  },
};

(function injectSpecSignatureSkills() {
  if (typeof CLASSES === 'undefined') return;
  for (const [clsKey, skills] of Object.entries(SPEC_SIGNATURE_SKILLS)) {
    const cls = CLASSES[clsKey];
    if (!cls || !cls.skills) continue;
    for (const [skillKey, sk] of Object.entries(skills)) {
      if (!cls.skills[skillKey]) cls.skills[skillKey] = sk;
    }
  }
})();

const SPEC_EXTRA_SKILLS = {
  warrior: {
    w_skullsplitter:{ name:'碎颅打击', icon:'🪓', desc:'武器专精:4倍攻击,获得怒气并叠2层破甲印记', mp:22, type:'dmg', mul:4, unlockLvl:28, fx:{ resourceGain:8, grantAura:{ key:'w_sunder', add:2, max:5, duration:15000 } } },
    w_warbreaker:{ name:'灭战者', icon:'🔨', desc:'武器专精:范围破甲重击,对破甲目标更强', mp:42, type:'dmg', mul:5, aoe:true, unlockLvl:52, fx:{ applyTargetState:'sunder', stateDurationMs:15000, bonusStates:{ sunder:0.35 } } },
    w_bloodbath:{ name:'浴血奋战', icon:'🩸', desc:'狂暴专精:4倍流血攻击,叠暴怒并吸血', mp:28, type:'dmg', mul:4, dot:true, lifeSteal:0.25, unlockLvl:30, fx:{ grantAura:{ key:'w_rage', add:2, max:5, duration:12000 } } },
    w_odynFury:{ name:'奥丁之怒', icon:'⚡', desc:'狂暴专精:范围烈焰猛击,消耗暴怒造成爆发', mp:46, type:'dmg', mul:6, aoe:true, unlockLvl:58, fx:{ bonusPerAuraStack:{ key:'w_rage', pct:0.18 }, consumeAura:{ key:'w_rage', all:true } } },
    w_shieldCharge:{ name:'盾牌冲锋', icon:'🛡️', desc:'防护专精:冲锋盾击,叠盾牌格挡并获得护盾', mp:26, type:'dmg', mul:4, unlockLvl:32, fx:{ grantAura:{ key:'w_block', add:2, max:5, duration:12000 }, shieldFromDamagePct:0.18 } },
    w_lastStand:{ name:'破釜沉舟', icon:'⛰️', desc:'防护专精:立即恢复生命并强化下一轮反震', mp:24, type:'heal', heal:0.30, unlockLvl:48, fx:{ grantAura:{ key:'w_block', add:3, max:5, duration:12000 }, shieldFromHealPct:0.30 } },
  },
  mage: {
    m_touchMagi:{ name:'大法师之触', icon:'🔮', desc:'奥术专精:施加奥术印记,后续奥术伤害更高', mp:30, type:'dmg', mul:3, unlockLvl:24, fx:{ applyTargetState:'exposed', stateDurationMs:9000, grantAura:{ key:'arcaneCharge', add:1, max:4, duration:12000 } } },
    m_arcaneSurge:{ name:'奥术涌动', icon:'🌌', desc:'奥术专精:消耗奥术充能造成爆发并回复资源', mp:48, type:'dmg', mul:6, unlockLvl:56, fx:{ bonusPerAuraStack:{ key:'arcaneCharge', pct:0.32 }, consumeAura:{ key:'arcaneCharge', all:true }, resourceGain:12 } },
    m_fireBlast:{ name:'火焰冲击', icon:'🔥', desc:'火焰专精:瞬发火焰暴击窗口,叠炽热', mp:24, type:'dmg', mul:3, alwaysCrit:true, unlockLvl:24, castTime:0, fx:{ grantAura:{ key:'m_heat', add:2, max:5, duration:12000 } } },
    m_flamestrike:{ name:'烈焰风暴', icon:'🌋', desc:'火焰专精:范围火焰伤害,点燃所有敌人', mp:44, type:'dmg', mul:5, aoe:true, dot:true, unlockLvl:50, fx:{ applyDotKey:'skill:m_flamestrike', dotName:'烈焰风暴', dotIcon:'🌋', dotPct:0.14, dotMs:7000 } },
    m_flurry:{ name:'冰风暴', icon:'🌨️', desc:'冰霜专精:冻结目标并叠2层指尖寒冰', mp:28, type:'dmg', mul:3, unlockLvl:24, castTime:0, fx:{ applyTargetState:{ key:'frozen', durMs:8000 }, grantAura:{ key:'m_frost', add:2, max:5, duration:12000 } } },
    m_cometStorm:{ name:'彗星风暴', icon:'☄️', desc:'冰霜专精:范围冰霜爆发,对冻结目标额外提高', mp:46, type:'dmg', mul:5, aoe:true, unlockLvl:54, fx:{ bonusStates:{ frozen:0.55, slow:0.25 } } },
  },
  priest: {
    p_schism:{ name:'教派分歧', icon:'⚖️', desc:'戒律专精:4倍神圣伤害,让后续惩罚/惩击更强', mp:28, type:'dmg', mul:4, unlockLvl:24, fx:{ applyTargetState:'exposed', stateDurationMs:8000, shieldFromDamagePct:0.12 } },
    p_powerBarrier:{ name:'真言术·障', icon:'🛡️', desc:'戒律专精:大护盾,主角和随从一起获得恩典', mp:42, type:'buff', buff:'p_grace', duration:10000, unlockLvl:52, fx:{ companionShieldPct:0.12, companionBuff:'p_grace', companionBuffMs:10000, grantAura:{ key:'p_grace', add:2, max:5, duration:15000 } } },
    p_serenity:{ name:'圣言术·静', icon:'🌟', desc:'神圣专精:强效单体治疗,过量治疗转护盾', mp:38, type:'heal', heal:0.45, unlockLvl:28, fx:{ shieldFromOverhealPct:0.80, companionHealPct:0.14 } },
    p_prayerHealing:{ name:'治疗祷言', icon:'🙏', desc:'神圣专精:治疗主角并溅射治疗随从', mp:44, type:'heal', heal:0.36, unlockLvl:50, fx:{ companionHealPct:0.30, companionShieldPct:0.06, grantAura:{ key:'p_grace', add:1, max:5, duration:15000 } } },
    p_mindFlay:{ name:'精神鞭笞', icon:'🌀', desc:'暗影专精:暗影引导伤害,叠疯狂并延长痛苦循环', mp:24, type:'dmg', mul:3, unlockLvl:24, fx:{ bonusPerDot:0.18, grantAura:{ key:'p_insanity', add:2, max:6, duration:12000 } } },
    p_shadowCrash:{ name:'暗影冲撞', icon:'🌌', desc:'暗影专精:范围暗影爆发,对持续伤害目标更强', mp:46, type:'dmg', mul:5, aoe:true, unlockLvl:54, fx:{ bonusPerDot:0.26, grantAura:{ key:'p_insanity', add:2, max:6, duration:12000 } } },
  },
  rogue: {
    r_garrote:{ name:'锁喉', icon:'🩸', desc:'刺杀专精:流血起手,叠毒锋并附加持续伤害', mp:24, type:'dmg', mul:3, dot:true, unlockLvl:24, fx:{ grantAura:{ key:'r_venom', add:1, max:5, duration:12000 } } },
    r_kingsbane:{ name:'君王之灾', icon:'🐍', desc:'刺杀专精:毒药终结技,目标DOT越多越强', mp:42, type:'dmg', mul:5, unlockLvl:56, fx:{ bonusPerDot:0.32, bonusPerAuraStack:{ key:'r_venom', pct:0.20 }, consumeAura:{ key:'r_venom', all:true } } },
    r_betweenEyes:{ name:'正中眉心', icon:'🎯', desc:'战斗专精:手枪终结技,消耗连击点必暴', mp:34, type:'dmg', mul:5, alwaysCrit:true, unlockLvl:34, fx:{ bonusPerAuraStack:{ key:'r_combo', pct:0.16 }, consumeAura:{ key:'r_combo', all:true } } },
    r_rollBones:{ name:'命运骨骰', icon:'🎲', desc:'战斗专精:短爆发,提高攻速并叠连击点', mp:28, type:'buff', buff:'s_haste', duration:7000, unlockLvl:46, fx:{ grantAura:{ key:'r_combo', add:2, max:5, duration:12000 } } },
    r_secretTechnique:{ name:'袖剑风暴', icon:'🌑', desc:'敏锐专精:范围暗影终结,破绽目标额外提高', mp:42, type:'dmg', mul:5, aoe:true, unlockLvl:50, fx:{ bonusStates:{ exposed:0.45 }, bonusPerAuraStack:{ key:'r_combo', pct:0.14 }, consumeAura:{ key:'r_combo', all:true } } },
    r_gloomblade:{ name:'幽暗之刃', icon:'🗡️', desc:'敏锐专精:暗影背刺,叠连击并制造破绽', mp:24, type:'dmg', mul:3, unlockLvl:24, fx:{ applyTargetState:'exposed', stateDurationMs:7000, grantAura:{ key:'r_combo', add:1, max:5, duration:12000 } } },
  },
  hunter: {
    h_bestialCleave:{ name:'野兽顺劈', icon:'🐾', desc:'兽王专精:宠物范围撕咬,召唤物在场时追加追击', mp:30, type:'dmg', mul:4, aoe:true, unlockLvl:28, fx:{ grantAura:{ key:'h_beastBond', add:1, max:5, duration:15000 }, extraHitPctIfSummon:0.30 } },
    h_direBeast:{ name:'凶暴野兽', icon:'🐺', desc:'兽王专精:召唤野兽助战,大量叠兽群羁绊', mp:36, type:'summon', summonCount:1, summonPower:0.75, summonDuration:14000, unlockLvl:46, fx:{ grantAura:{ key:'h_beastBond', add:3, max:5, duration:16000 } } },
    h_doubleTap:{ name:'二连发', icon:'🎯', desc:'射击专精:下个强力射击窗口,叠破绽并提高爆发', mp:28, type:'buff', buff:'h_burst', duration:6000, unlockLvl:36, fx:{ grantAura:{ key:'h_frenzy', add:2, max:5, duration:12000 } } },
    h_trueshot:{ name:'百发百中', icon:'🏹', desc:'射击专精:长弓爆发,提高攻速与暴击窗口', mp:42, type:'buff', buff:'rapidFire', duration:10000, unlockLvl:54 },
    h_butchery:{ name:'屠戮', icon:'🪓', desc:'生存专精:近战范围劈砍,对灼烧/中毒目标更强', mp:30, type:'dmg', mul:4, aoe:true, unlockLvl:32, fx:{ bonusPerDot:0.22 } },
    h_mongooseBite:{ name:'猫鼬撕咬', icon:'🦷', desc:'生存专精:单体连击,目标DOT越多伤害越高', mp:28, type:'dmg', mul:4, unlockLvl:42, fx:{ bonusPerDot:0.26, extraHitPct:0.20 } },
  },
  shaman: {
    sh_lavaBurst2:{ name:'熔岩爆裂·过载', icon:'🌋', desc:'元素专精:对烈焰震击目标必定暴击并叠雷霆', mp:34, type:'dmg', mul:4, alwaysCrit:true, unlockLvl:30, fx:{ bonusPerDot:0.22, grantAura:{ key:'stormCharge', add:1, max:4, duration:12000 } } },
    sh_stormkeeper:{ name:'风暴守护者', icon:'⛈️', desc:'元素专精:短爆发,获得雷霆充能并提高后续闪电', mp:38, type:'buff', buff:'s_empower', duration:7000, unlockLvl:52, fx:{ grantAura:{ key:'stormCharge', add:3, max:4, duration:12000 } } },
    sh_feralSpirit:{ name:'幽魂狼', icon:'🐺', desc:'增强专精:召唤幽魂狼助战,叠漩涡之力', mp:36, type:'summon', summonCount:2, summonPower:0.45, summonDuration:12000, unlockLvl:40, fx:{ grantAura:{ key:'sh_maelstrom', add:2, max:5, duration:12000 } } },
    sh_sundering:{ name:'裂地术', icon:'🌎', desc:'增强专精:范围地裂,消耗漩涡造成爆发', mp:42, type:'dmg', mul:5, aoe:true, unlockLvl:58, fx:{ bonusPerAuraStack:{ key:'sh_maelstrom', pct:0.18 }, consumeAura:{ key:'sh_maelstrom', all:true } } },
    sh_chainHeal:{ name:'治疗链', icon:'🔗', desc:'恢复专精:治疗主角和随从,叠图腾共鸣', mp:38, type:'heal', heal:0.34, unlockLvl:32, fx:{ companionHealPct:0.28, companionShieldPct:0.05, grantAura:{ key:'sh_totem', add:2, max:5, duration:15000 } } },
    sh_cloudburst:{ name:'暴雨图腾', icon:'🌧️', desc:'恢复专精:治疗后留下护盾,图腾共鸣越高越稳', mp:42, type:'heal', heal:0.28, unlockLvl:56, fx:{ shieldFromHealPct:0.45, companionShieldPct:0.10, grantAura:{ key:'sh_totem', add:2, max:5, duration:15000 } } },
  },
  paladin: {
    pa_holyShock:{ name:'神圣震击', icon:'✨', desc:'神圣专精:瞬发治疗/伤害,给随从圣光护盾', mp:26, type:'heal', heal:0.26, unlockLvl:24, fx:{ companionHealPct:0.16, companionShieldPct:0.06, companionBuff:'pa_devotion', companionBuffMs:9000 } },
    pa_lightDawn:{ name:'黎明之光', icon:'🌅', desc:'神圣专精:群体圣光治疗,强化随从支援', mp:44, type:'heal', heal:0.38, unlockLvl:54, fx:{ companionHealPct:0.32, companionShieldPct:0.08, grantAura:{ key:'pa_bulwark', add:1, max:5, duration:15000 } } },
    pa_avengerShield:{ name:'复仇者之盾', icon:'🛡️', desc:'防护专精:盾牌弹射,叠圣光壁垒并沉默战场', mp:30, type:'dmg', mul:4, aoe:true, unlockLvl:30, fx:{ grantAura:{ key:'pa_bulwark', add:2, max:5, duration:15000 }, shieldFromDamagePct:0.10 } },
    pa_ardentDefender:{ name:'炽热防御者', icon:'🔥', desc:'防护专精:减伤并在危急时回血', mp:34, type:'buff', buff:'pa_devotion', duration:8000, unlockLvl:50, fx:{ companionShieldPct:0.08 } },
    pa_wakeAshes:{ name:'灰烬觉醒', icon:'🔥', desc:'惩戒专精:范围圣焰,叠满圣能准备裁决', mp:46, type:'dmg', mul:5, aoe:true, unlockLvl:48, fx:{ grantAura:{ key:'pa_holyPower', add:3, max:5, duration:15000 }, applyTargetState:'judged', stateDurationMs:10000 } },
    pa_finalReckoning:{ name:'最终清算', icon:'⚖️', desc:'惩戒专精:对审判目标造成巨额神圣爆发', mp:52, type:'dmg', mul:7, unlockLvl:64, fx:{ bonusStates:{ judged:0.65 }, bonusPerAuraStack:{ key:'pa_holyPower', pct:0.16 }, consumeAura:{ key:'pa_holyPower', all:true } } },
  },
  warlock: {
    wl_haunt:{ name:'鬼影缠身', icon:'👻', desc:'痛苦专精:暗影缠身,提高后续DOT爆发', mp:30, type:'dmg', mul:4, dot:true, unlockLvl:28, fx:{ bonusPerDot:0.22, grantAura:{ key:'wl_shard', add:1, max:5, duration:12000 } } },
    wl_seedCorruption:{ name:'腐蚀之种', icon:'🌱', desc:'痛苦专精:范围腐蚀,多DOT铺场', mp:46, type:'dmg', mul:5, aoe:true, dot:true, unlockLvl:54, fx:{ applyDotKey:'skill:wl_seedCorruption', dotName:'腐蚀之种', dotIcon:'🌱', dotPct:0.16, dotMs:8000, grantAura:{ key:'wl_shard', add:2, max:5, duration:12000 } } },
    wl_callDreadstalkers:{ name:'召唤恐惧猎犬', icon:'🐺', desc:'恶魔学识专精:召唤恶魔猎犬,强化恶魔之箭', mp:38, type:'summon', summonCount:2, summonPower:0.48, summonDuration:12000, unlockLvl:34, fx:{ grantAura:{ key:'wl_shard', add:2, max:5, duration:12000 } } },
    wl_implosion:{ name:'内爆', icon:'💥', desc:'恶魔学识专精:恶魔在场时范围爆发', mp:40, type:'dmg', mul:5, aoe:true, unlockLvl:52, fx:{ extraHitPctIfSummon:0.45, bonusPerAuraStack:{ key:'wl_shard', pct:0.12 }, consumeAura:{ key:'wl_shard', all:true } } },
    wl_rainFire:{ name:'火焰之雨', icon:'🌧️', desc:'毁灭专精:范围火雨,叠余烬并灼烧敌人', mp:44, type:'dmg', mul:5, aoe:true, dot:true, unlockLvl:44, fx:{ grantAura:{ key:'wl_ember', add:2, max:5, duration:12000 }, applyDotKey:'skill:wl_rainFire', dotName:'火焰之雨', dotIcon:'🔥', dotPct:0.14, dotMs:7000 } },
    wl_cataclysm:{ name:'大灾变', icon:'☄️', desc:'毁灭专精:大范围混乱爆发,对献祭目标更强', mp:56, type:'dmg', mul:7, aoe:true, unlockLvl:62, fx:{ bonusPerDot:0.30, bonusPerAuraStack:{ key:'wl_ember', pct:0.14 } } },
  },
  druid: {
    d_sunfire:{ name:'阳炎术', icon:'☀️', desc:'平衡专精:范围太阳灼烧,叠星界能量', mp:28, type:'dmg', mul:3, aoe:true, dot:true, unlockLvl:24, fx:{ grantAura:{ key:'d_astral', add:1, max:5, duration:12000 }, applyDotKey:'skill:d_sunfire', dotName:'阳炎术', dotIcon:'☀️', dotPct:0.14, dotMs:7000 } },
    d_starfall:{ name:'星辰坠落', icon:'🌠', desc:'平衡专精:范围星界爆发,星界能量越高越强', mp:46, type:'dmg', mul:5, aoe:true, unlockLvl:56, fx:{ bonusPerAuraStack:{ key:'d_astral', pct:0.18 }, consumeAura:{ key:'d_astral', add:-2 } } },
    d_shred:{ name:'撕碎', icon:'🗡️', desc:'野性专精:高频爪击,叠撕咬连击', mp:24, type:'dmg', mul:3, unlockLvl:24, fx:{ grantAura:{ key:'d_combo', add:2, max:5, duration:12000 }, bonusPerDot:0.18 } },
    d_rip:{ name:'割裂', icon:'🩸', desc:'野性专精:消耗连击点造成流血爆发', mp:38, type:'dmg', mul:4, dot:true, unlockLvl:44, fx:{ bonusPerAuraStack:{ key:'d_combo', pct:0.20 }, consumeAura:{ key:'d_combo', all:true }, applyDotKey:'skill:d_rip', dotName:'割裂', dotIcon:'🩸', dotPct:0.20, dotMs:8000 } },
    d_swiftmend:{ name:'迅捷治愈', icon:'🍃', desc:'恢复专精:瞬发治疗,过量转盾并治疗随从', mp:26, type:'heal', heal:0.28, unlockLvl:24, fx:{ shieldFromOverhealPct:0.65, companionHealPct:0.16, grantAura:{ key:'d_harmony', add:1, max:5, duration:15000 } } },
    d_efflorescence:{ name:'百花齐放', icon:'🌺', desc:'恢复专精:持续治疗场,主角和随从一起获得生命绽放', mp:44, type:'heal', heal:0.34, unlockLvl:54, fx:{ companionHealPct:0.28, companionShieldPct:0.08, companionBuff:'d_lifebloom', companionBuffMs:12000, grantAura:{ key:'d_harmony', add:2, max:5, duration:15000 } } },
  },
};

(function injectSpecExtraSkills() {
  if (typeof CLASSES === 'undefined') return;
  for (const [clsKey, skills] of Object.entries(SPEC_EXTRA_SKILLS)) {
    const cls = CLASSES[clsKey];
    if (!cls || !cls.skills) continue;
    for (const [skillKey, sk] of Object.entries(skills)) {
      if (!cls.skills[skillKey]) cls.skills[skillKey] = sk;
    }
  }
})();

const SPEC_SKILL_LOADOUTS = {
  warrior: {
    core:['interrupt'], novice:['cleave','thunderClap'],
    arms:{ icon:'⚔️', name:'武器战', desc:'围绕破甲印记、压制、致死打击与斩杀构建节奏,偏单体斩杀。', skills:['cleave','sunderArmor','w_overpower','mortalStrike','shatteringThrow','execute','sweepingStrikes','w_recklessness','w_avatar','w_colossus','bladestorm'] },
    fury:{ icon:'😡', name:'狂暴战', desc:'用怒击、嗜血和怒火乱舞叠暴怒,靠多段追击与吸血续战。', skills:['cleave','w_ragingBlow','bloodthirst','battleShout','w_recklessness','w_enrageRegen','execute','w_rampage','bladestorm'] },
    prot:{ icon:'🛡️', name:'防护战', desc:'盾牌猛击、雷霆一击和盾牌格挡叠防线,承伤反震并把满层转护盾。', skills:['thunderClap','w_shieldSlam','shieldWall','w_ironwall','w_revenge','challengingShout','w_enrageRegen'] },
  },
  mage: {
    core:['interrupt','polymorph'], novice:['arcane','fireball','frostbolt'],
    arcane:{ icon:'🔷', name:'奥术法', desc:'只使用奥术冲击、飞弹、奥爆、弹幕和时间系技能,叠充能后爆发。', skills:['m_arcaneBlast','arcane','arcaneExplosion','m_arcanePower','m_arcaneBarrage','mirrorImage','timeWarp','polymorph'] },
    fire:{ icon:'🔥', name:'火法', desc:'只使用火焰技能,点燃、活动炸弹、燃烧、炎爆和流星组成爆发链。', skills:['fireball','m_livingBomb','m_combustion','pyroblast','dragonBreath','m_meteor'] },
    frost:{ icon:'❄️', name:'冰法', desc:'只使用冰霜控制与碎裂技能,冻结后用冰枪、暴风雪、冰冻宝珠打爆发。', skills:['frostbolt','iceBarrier','m_iceBlock','slow','blizzard','m_frozenOrb','m_iceLance'] },
  },
  priest: {
    core:['interrupt','smite'], novice:['smite','shield','heal','shadowWord'],
    discipline:{ icon:'🛡️', name:'戒律牧', desc:'真言术盾、惩罚和能量灌注把伤害转成治疗与随从护盾。', skills:['smite','shield','p_pwShield','p_penance','powerInfusion','p_holyNova'] },
    holy:{ icon:'✨', name:'神牧', desc:'治疗术、恢复、愈合祷言、神圣新星和赞美诗专注群体回复。', skills:['smite','heal','renew','p_prayerMending','holyNova','holyFire','p_holyNova','divineHymn'] },
    shadow:{ icon:'🌑', name:'暗牧', desc:'暗言术、心灵震爆、噬灵疫病、暗影形态和虚空爆发组成持续伤害循环。', skills:['shadowWord','mindBlast','p_devouringPlague','p_shadowform','p_mindBlast','shadowDeath','p_voidEruption'] },
  },
  rogue: {
    core:['interrupt','evasion'], novice:['sinister','poison','backstab'],
    assassination:{ icon:'🐍', name:'刺杀贼', desc:'只围绕毒药、毁伤、割裂、奉毒和死亡标记打持续毒伤。', skills:['poison','r_mutilate','garrote','rupture','r_envenom','deathMark','r_evasion'] },
    combat:{ icon:'⚔️', name:'战斗贼', desc:'邪恶打击、背刺、剑刃乱舞、冲动和杀戮盛宴走正面连击。', skills:['sinister','backstab','r_bladeRush','r_bladeflurry','r_adrenaline','killingSpree','throw','evasion'] },
    subtlety:{ icon:'🌑', name:'敏锐贼', desc:'背刺、暗影之舞、暗袭、绞喉和暗影斗篷围绕破绽爆发。', skills:['backstab','kidneyShot','r_shadowDance','r_shadowstrike','garrote','shadow','cloakOfShadows','r_evasion'] },
  },
  hunter: {
    core:['interrupt'], novice:['arcaneShot','serpentSting','summonPet'],
    bm:{ icon:'🐾', name:'兽王猎', desc:'召唤宠物、倒刺射击、狂野怒火和协同猛攻强化宠物追击。', skills:['summonPet','h_barbedShot','bestialWrath','h_killCommand','h_coordinatedAssault','stampede','h_feignDeath'] },
    marks:{ icon:'🎯', name:'射击猎', desc:'猎人印记、精确射击、瞄准射击、急速射击和杀戮射击组成远程狙击。', skills:['arcaneShot','huntersMark','h_preciseShot','aimed','rapidFire','h_rapidFire','killShot','barrage','h_chimaera'] },
    survival:{ icon:'💣', name:'生存猎', desc:'毒蛇钉刺、野火炸弹、爆炸射击、冰冻陷阱和奇美拉打陷阱DOT。', skills:['serpentSting','h_wildfireBomb','explosiveShot','h_explosiveShot','freezingTrap','multi','h_chimaera','h_feignDeath'] },
  },
  shaman: {
    core:['interrupt'], novice:['lightning','healingWave'],
    element:{ icon:'🌋', name:'元素萨', desc:'闪电箭、烈焰震击、熔岩爆裂、闪电链和元素冲击走法术爆发。', skills:['lightning','flameShock','lavaBurst','chainLightning','sh_earthShock','sh_elementalBlast','earthquake','thunderstorm'] },
    enhancement:{ icon:'⚡', name:'增强萨', desc:'风怒武器、风暴打击、毁灭闪电、熔岩猛击和嗜血走近战漩涡。', skills:['windfury','s_stormstrike','sh_crashLightning','sh_lavaLash','s_bloodlust','bloodlust','s_earthShield'] },
    restoration:{ icon:'🌊', name:'恢复萨', desc:'治疗波、激流、大地之盾、治疗之泉和灵魂链接支援主角与随从。', skills:['healingWave','sh_riptide','earthShield','s_earthShield','s_healingTide','spiritLink','bloodlust'] },
  },
  paladin: {
    core:['interrupt','judgement'], novice:['judgement','holyLight','crusader'],
    holy:{ icon:'✨', name:'奶骑', desc:'圣光术、圣光闪现、道标、王者祝福和神圣愤怒专注治疗支援。', skills:['holyLight','flashOfLight','pa_flashLight','pa_beacon','blessingKings','sacredShield','holyWrath'] },
    prot:{ icon:'🛡️', name:'防骑', desc:'审判、正义盾击、圣盾、奉献和圣洁护盾滚圣光壁垒。', skills:['judgement','pa_shieldRighteous','divineShield','consecration','hammerOfRighteous','sacredShield','pa_guardian','blessingKings'] },
    ret:{ icon:'⚔️', name:'惩戒骑', desc:'十字军打击、公正之剑、审判、复仇之怒、圣殿裁决和愤怒之锤打圣能爆发。', skills:['judgement','crusader','pa_bladeJustice','avengingWrath','pa_avengingWrath','pa_templarVerdict','pa_hammerWrath','pa_holyWrath','seraphim'] },
  },
  warlock: {
    core:['interrupt','fear'], novice:['shadowBolt','corruption','incinerate'],
    affliction:{ icon:'💜', name:'痛苦术', desc:'痛楚、腐蚀术、痛苦无常和邪能狂涌堆多DOT后引爆。', skills:['wl_agony','corruption','unstableAffliction','drainLife','wl_maleficRapture','wl_darkSoul','fear'] },
    demonology:{ icon:'😈', name:'恶魔术', desc:'暗影箭、古尔丹之手、地狱火、恶魔变身和恶魔之箭围绕召唤物。', skills:['shadowBolt','drainLife','wl_handGuldan','inferno','metamorphosis','wl_demonbolt','wl_demonSkin','wl_lifeTap'] },
    destruction:{ icon:'🔥', name:'毁灭术', desc:'献祭、烧尽、燃烧、灵魂之火和混乱之箭堆余烬爆发。', skills:['immolate','incinerate','wl_conflagrate','soulFire','chaosBolt','wl_chaosBolt','wl_darkSoul','wl_demonSkin'] },
  },
  druid: {
    core:['interrupt'], novice:['wrath','moonfire','d_rake','rejuvenation'],
    balance:{ icon:'🌗', name:'平衡德', desc:'月火、愤怒、星火、星涌、新月强击和飓风走星界能量循环。', skills:['moonfire','wrath','starfire','d_eclipse','d_starsurge','hurricane','entanglingRoots'] },
    feral:{ icon:'🐾', name:'野德', desc:'斜掠、横扫、凶猛撕咬、狂暴和野性狂怒围绕连击点/流血。', skills:['d_rake','swipe','bite','berserk','d_berserk','d_ferociousBite','d_primalWrath'] },
    resto:{ icon:'🌿', name:'奶德', desc:'回春、生命绽放、野性成长、树皮术和宁静治疗主角与随从。', skills:['rejuvenation','d_lifebloomSpell','d_rejuv','barkskin','d_barkskin','wildGrowth','tranquility','entanglingRoots'] },
  },
};

const SPEC_EXTRA_SKILL_KEYS = {
  warrior:{ arms:['w_skullsplitter','w_warbreaker'], fury:['w_bloodbath','w_odynFury'], prot:['w_shieldCharge','w_lastStand'] },
  mage:{ arcane:['m_touchMagi','m_arcaneSurge'], fire:['m_fireBlast','m_flamestrike'], frost:['m_flurry','m_cometStorm'] },
  priest:{ discipline:['p_schism','p_powerBarrier'], holy:['p_serenity','p_prayerHealing'], shadow:['p_mindFlay','p_shadowCrash'] },
  rogue:{ assassination:['r_garrote','r_kingsbane'], combat:['r_betweenEyes','r_rollBones'], subtlety:['r_gloomblade','r_secretTechnique'] },
  hunter:{ bm:['h_bestialCleave','h_direBeast'], marks:['h_doubleTap','h_trueshot'], survival:['h_butchery','h_mongooseBite'] },
  shaman:{ element:['sh_lavaBurst2','sh_stormkeeper'], enhancement:['sh_feralSpirit','sh_sundering'], restoration:['sh_chainHeal','sh_cloudburst'] },
  paladin:{ holy:['pa_holyShock','pa_lightDawn'], prot:['pa_avengerShield','pa_ardentDefender'], ret:['pa_wakeAshes','pa_finalReckoning'] },
  warlock:{ affliction:['wl_haunt','wl_seedCorruption'], demonology:['wl_callDreadstalkers','wl_implosion'], destruction:['wl_rainFire','wl_cataclysm'] },
  druid:{ balance:['d_sunfire','d_starfall'], feral:['d_shred','d_rip'], resto:['d_swiftmend','d_efflorescence'] },
};

(function appendSpecExtraSkillPools() {
  for (const [clsKey, specs] of Object.entries(SPEC_EXTRA_SKILL_KEYS)) {
    const clsProfile = SPEC_SKILL_LOADOUTS[clsKey];
    if (!clsProfile) continue;
    for (const [specKey, keys] of Object.entries(specs)) {
      const profile = clsProfile[specKey];
      if (!profile) continue;
      if (!Array.isArray(profile.skills)) profile.skills = [];
      for (const key of keys) {
        if (!profile.skills.includes(key)) profile.skills.push(key);
      }
    }
  }
})();

const SPEC_TALENT_THEME_PATCHES = {
  warrior:{
    arms:{ masteryDesc:'破甲印记、压制、灭战者与斩杀伤害 +2%/精通', unlockSkill:'w_overpower', unlockName:'压制', unlockDesc:'解锁: 压制(武器核心连击)' },
    fury:{ masteryDesc:'暴怒层数、怒击、浴血奋战与怒火乱舞伤害 +2%/精通', unlockSkill:'w_ragingBlow', unlockName:'怒击', unlockDesc:'解锁: 怒击(狂暴核心连击)' },
    prot:{ masteryDesc:'盾牌格挡、盾牌猛击、复仇与反震护盾 +3%/精通', unlockSkill:'w_shieldSlam', unlockName:'盾牌猛击', unlockDesc:'解锁: 盾牌猛击(防护核心)' },
  },
  mage:{
    arcane:{ masteryDesc:'奥术充能、奥术冲击、奥术弹幕与奥术涌动伤害 +3%/精通', unlockSkill:'m_arcaneBlast', unlockName:'奥术冲击', unlockDesc:'解锁: 奥术冲击(奥法核心)' },
    fire:{ masteryDesc:'点燃、活动炸弹、火焰冲击、炎爆与流星伤害 +4%/精通', unlockSkill:'m_livingBomb', unlockName:'活动炸弹', unlockDesc:'解锁: 活动炸弹(火法核心)' },
    frost:{ masteryDesc:'冻结、指尖寒冰、冰风暴、冰枪与彗星风暴伤害 +3%/精通', unlockSkill:'m_frozenOrb', unlockName:'冰冻宝珠', unlockDesc:'解锁: 冰冻宝珠(冰法核心)' },
  },
  priest:{
    discipline:{ masteryDesc:'护盾、恩典、惩罚、教派分歧与随从护盾 +4%/精通', unlockSkill:'p_schism', unlockName:'教派分歧', unlockDesc:'解锁: 教派分歧(戒律输出治疗)' },
    holy:{ masteryDesc:'圣言术、愈合祷言、治疗祷言和随从治疗 +5%/精通', unlockSkill:'p_prayerMending', unlockName:'愈合祷言', unlockDesc:'解锁: 愈合祷言(神圣支援)' },
    shadow:{ masteryDesc:'疯狂、噬灵疫病、精神鞭笞与虚空爆发伤害 +3%/精通', unlockSkill:'p_devouringPlague', unlockName:'噬灵疫病', unlockDesc:'解锁: 噬灵疫病(暗影核心)' },
  },
  rogue:{
    assassination:{ masteryDesc:'毒锋、毁伤、锁喉、君王之灾和持续毒伤 +4%/精通', unlockSkill:'r_mutilate', unlockName:'毁伤', unlockDesc:'解锁: 毁伤(刺杀核心)' },
    combat:{ masteryDesc:'连击点、剑刃冲刺、正中眉心和杀戮盛宴伤害 +3%/精通', unlockSkill:'r_bladeRush', unlockName:'剑刃冲刺', unlockDesc:'解锁: 剑刃冲刺(战斗核心)' },
    subtlety:{ masteryDesc:'破绽、暗影之舞、幽暗之刃和暗袭伤害 +4%/精通', unlockSkill:'r_shadowDance', unlockName:'暗影之舞', unlockDesc:'解锁: 暗影之舞(敏锐核心)' },
  },
  hunter:{
    bm:{ masteryDesc:'兽群羁绊、倒刺射击、凶暴野兽与协同猛攻伤害 +4%/精通', unlockSkill:'h_barbedShot', unlockName:'倒刺射击', unlockDesc:'解锁: 倒刺射击(兽王核心)' },
    marks:{ masteryDesc:'猎人印记、精确射击、二连发、瞄准和杀戮射击伤害 +4%/精通', unlockSkill:'h_preciseShot', unlockName:'精确射击', unlockDesc:'解锁: 精确射击(射击核心)' },
    survival:{ masteryDesc:'野火炸弹、猫鼬撕咬、屠戮和陷阱DOT伤害 +4%/精通', unlockSkill:'h_wildfireBomb', unlockName:'野火炸弹', unlockDesc:'解锁: 野火炸弹(生存核心)' },
  },
  shaman:{
    element:{ masteryDesc:'雷霆充能、熔岩爆裂、元素冲击和风暴守护者伤害 +4%/精通', unlockSkill:'sh_elementalBlast', unlockName:'元素冲击', unlockDesc:'解锁: 元素冲击(元素核心)' },
    enhancement:{ masteryDesc:'漩涡之力、风暴打击、毁灭闪电和幽魂狼伤害 +4%/精通', unlockSkill:'sh_crashLightning', unlockName:'毁灭闪电', unlockDesc:'解锁: 毁灭闪电(增强核心)' },
    restoration:{ masteryDesc:'激流、治疗链、暴雨图腾和图腾共鸣治疗 +5%/精通', unlockSkill:'sh_riptide', unlockName:'激流', unlockDesc:'解锁: 激流(恢复核心)' },
  },
  paladin:{
    holy:{ masteryDesc:'神圣震击、圣光道标、黎明之光和随从圣光治疗 +5%/精通', unlockSkill:'pa_holyShock', unlockName:'神圣震击', unlockDesc:'解锁: 神圣震击(奶骑核心)' },
    prot:{ masteryDesc:'圣光壁垒、正义盾击、复仇者之盾和防骑回血护盾 +4%/精通', unlockSkill:'pa_shieldRighteous', unlockName:'正义盾击', unlockDesc:'解锁: 正义盾击(防骑核心)' },
    ret:{ masteryDesc:'圣能、公正之剑、灰烬觉醒、圣殿裁决和最终清算伤害 +4%/精通', unlockSkill:'pa_bladeJustice', unlockName:'公正之剑', unlockDesc:'解锁: 公正之剑(惩戒核心)' },
  },
  warlock:{
    affliction:{ masteryDesc:'痛楚、鬼影缠身、腐蚀之种和多DOT引爆伤害 +5%/精通', unlockSkill:'wl_agony', unlockName:'痛楚', unlockDesc:'解锁: 痛楚(痛苦核心)' },
    demonology:{ masteryDesc:'恶魔召唤、古尔丹之手、恐惧猎犬和恶魔之箭伤害 +5%/精通', unlockSkill:'wl_handGuldan', unlockName:'古尔丹之手', unlockDesc:'解锁: 古尔丹之手(恶魔核心)' },
    destruction:{ masteryDesc:'余烬、燃烧、火焰之雨、大灾变和混乱之箭伤害 +4%/精通', unlockSkill:'wl_conflagrate', unlockName:'燃烧', unlockDesc:'解锁: 燃烧(毁灭核心)' },
  },
  druid:{
    balance:{ masteryDesc:'星界能量、阳炎、星涌、星辰坠落和新月强击伤害 +4%/精通', unlockSkill:'d_eclipse', unlockName:'星涌术', unlockDesc:'解锁: 星涌术(平衡核心)' },
    feral:{ masteryDesc:'撕咬连击、斜掠、撕碎、割裂和凶猛撕咬伤害 +4%/精通', unlockSkill:'d_rake', unlockName:'斜掠', unlockDesc:'解锁: 斜掠(野性核心)' },
    resto:{ masteryDesc:'生命绽放、迅捷治愈、百花齐放和随从治疗 +5%/精通', unlockSkill:'d_lifebloomSpell', unlockName:'生命绽放', unlockDesc:'解锁: 生命绽放(恢复核心)' },
  },
};

(function patchSpecTalentThemes() {
  if (typeof CLASSES === 'undefined') return;
  for (const [clsKey, specs] of Object.entries(SPEC_TALENT_THEME_PATCHES)) {
    const cls = CLASSES[clsKey];
    if (!cls || !Array.isArray(cls.trees)) continue;
    for (const [specKey, patch] of Object.entries(specs)) {
      const tree = cls.trees.find(t => t.key === specKey);
      if (!tree) continue;
      tree.masteryDesc = patch.masteryDesc;
      const unlockTalent = (tree.talents || []).find(t => t.unlockSkill);
      if (unlockTalent) {
        unlockTalent.unlockSkill = patch.unlockSkill;
        unlockTalent.name = patch.unlockName;
        unlockTalent.desc = patch.unlockDesc;
      }
    }
  }
})();

const SPEC_COMBAT_RULES = {
  warrior:{
    arms:{ icon:'🪓', name:'破甲处决链', desc:'压制/碎颅/灭战者叠破甲印记;满层后致死打击、巨人之击或斩杀会消耗印记,追加一次处决伤害。' },
    fury:{ icon:'😡', name:'暴怒连舞', desc:'怒击、嗜血、浴血奋战不断叠暴怒;满层会自动打出狂乱追击并小幅回血,适合高速续战。' },
    prot:{ icon:'🛡️', name:'盾反壁垒', desc:'盾牌技能和承伤叠盾牌格挡;满层转化为护盾,受到攻击会按防御反震。' },
  },
  mage:{
    arcane:{ icon:'🔷', name:'充能倾泻', desc:'奥术技能叠奥术充能;奥术弹幕/奥术涌动消耗充能造成额外爆发并返还法力。' },
    fire:{ icon:'🔥', name:'点燃引爆', desc:'火焰技能和持续伤害叠炽热;满层后炎爆、流星或烈焰风暴会引爆点燃并扩散余焰。' },
    frost:{ icon:'❄️', name:'冻结碎裂', desc:'冰霜技能冻结敌人并叠指尖寒冰;冰枪、彗星风暴命中冻结目标会碎裂追击并生成护盾。' },
  },
  priest:{
    discipline:{ icon:'⚖️', name:'赎罪护盾', desc:'戒律伤害会给自己和随从转化护盾;真言术和障会强化下一轮惩罚/教派分歧。' },
    holy:{ icon:'✨', name:'圣言回响', desc:'治疗技能叠恩典;满层治疗会溅射随从并留下护盾,神圣伤害会触发小治疗。' },
    shadow:{ icon:'🌑', name:'疯狂疫病', desc:'暗影DOT叠疯狂;满层后噬灵疫病、虚空爆发或暗影冲撞会扩散痛苦并追加暗影爆发。' },
  },
  rogue:{
    assassination:{ icon:'🐍', name:'毒药处刑', desc:'毒药/流血叠毒锋;奉毒或君王之灾消耗毒锋,按目标DOT数量打出毒爆。' },
    combat:{ icon:'⚔️', name:'连击乱舞', desc:'战斗技能叠连击点;正中眉心、杀戮盛宴或切割满点时追加乱舞追击。' },
    subtlety:{ icon:'🌑', name:'暗影破绽', desc:'敏锐技能制造破绽并叠连击;暗影之舞期间暗袭/袖剑风暴会触发暗影追击。' },
  },
  hunter:{
    bm:{ icon:'🐾', name:'兽群指挥', desc:'宠物/野兽技能叠兽群羁绊;召唤物在场时杀戮命令和协同猛攻会触发宠物追咬。' },
    marks:{ icon:'🎯', name:'狙击窗口', desc:'猎人印记与精确射击制造破绽;瞄准/杀戮射击对标记目标追加穿透伤害。' },
    survival:{ icon:'💣', name:'陷阱野火', desc:'炸弹、陷阱和钉刺铺持续伤害;猫鼬撕咬/屠戮会按DOT数量追加爆炸。' },
  },
  shaman:{
    element:{ icon:'⛈️', name:'元素过载', desc:'闪电与熔岩技能叠雷霆充能;元素冲击和风暴守护者触发过载追击。' },
    enhancement:{ icon:'🌀', name:'漩涡风怒', desc:'近战与幽魂狼叠漩涡;裂地术/熔岩猛击消耗漩涡并在风怒期间追加打击。' },
    restoration:{ icon:'🌊', name:'潮汐图腾', desc:'治疗技能叠图腾共鸣;治疗链和暴雨图腾会同步治疗随从并生成护盾。' },
  },
  paladin:{
    holy:{ icon:'🌟', name:'道标圣光', desc:'神圣震击、道标和黎明之光会把治疗转给随从;过量治疗转化护盾。' },
    prot:{ icon:'🛡️', name:'圣光壁垒', desc:'审判和盾击叠圣光壁垒;格挡窗口会回血、护盾并强化复仇者之盾。' },
    ret:{ icon:'⚜️', name:'圣能裁决', desc:'审判、公正之剑和灰烬觉醒叠圣能;裁决/最终清算消耗圣能打爆发。' },
  },
  warlock:{
    affliction:{ icon:'💜', name:'痛苦收割', desc:'痛楚、腐蚀和鬼影叠灵魂碎片;多DOT目标会被邪能狂涌/腐蚀之种收割扩散。' },
    demonology:{ icon:'😈', name:'恶魔军团', desc:'召唤恶魔叠碎片;恶魔在场时古尔丹之手、内爆和恶魔之箭会追加恶魔协击。' },
    destruction:{ icon:'🔥', name:'余烬爆燃', desc:'献祭、燃烧和火雨叠余烬;混乱之箭/大灾变消耗余烬打出混乱爆发。' },
  },
  druid:{
    balance:{ icon:'🌗', name:'日月蚀循环', desc:'月火/阳炎/星火叠星界能量;星涌和星辰坠落消耗能量触发星界追击。' },
    feral:{ icon:'🐾', name:'流血连击', desc:'斜掠、撕碎和横扫叠连击;割裂/凶猛撕咬消耗连击并按流血目标追加撕咬。' },
    resto:{ icon:'🌿', name:'繁花滋养', desc:'回春、生命绽放和百花齐放叠自然调和;满层会给主角与随从大治疗和护盾。' },
  },
};

const SPEC_COMBAT_METERS = {
  warrior:{
    arms:{ key:'w_sunder', icon:'🪓', name:'破甲印记', max:5, hint:'满层后用致死打击/巨人之击/斩杀收束' },
    fury:{ key:'w_rage', icon:'😡', name:'暴怒', max:5, hint:'层数越高,所有狂暴伤害和续战越强' },
    prot:{ key:'w_block', icon:'🛡️', name:'盾牌格挡', max:5, hint:'承伤、盾击和防御技能叠层,满层转护盾反震' },
  },
  mage:{
    arcane:{ key:'arcaneCharge', icon:'🔷', name:'奥术充能', max:4, hint:'充能越高奥术越痛,弹幕/涌动负责倾泻' },
    fire:{ key:'m_heat', icon:'🔥', name:'炽热', max:5, hint:'满层让炎爆/流星/烈焰风暴引爆点燃' },
    frost:{ key:'m_frost', icon:'❄️', name:'指尖寒冰', max:5, hint:'冻结目标后用冰枪/彗星风暴打碎裂' },
  },
  priest:{
    discipline:{ key:'p_grace', icon:'⚖️', name:'恩典', max:5, hint:'伤害与防御会转成主角/随从护盾' },
    holy:{ key:'p_grace', icon:'✨', name:'圣言恩典', max:5, hint:'满层治疗会回响到主角和随从' },
    shadow:{ key:'p_insanity', icon:'🌑', name:'疯狂', max:6, hint:'满层用虚空爆发/噬灵疫病扩散痛苦' },
  },
  rogue:{
    assassination:{ key:'r_venom', icon:'🐍', name:'毒锋', max:5, hint:'满层用奉毒/君王之灾打毒爆' },
    combat:{ key:'r_combo', icon:'⚔️', name:'连击点', max:5, hint:'满点用正中眉心/杀戮盛宴追加乱舞' },
    subtlety:{ key:'r_combo', icon:'🌑', name:'暗影连击', max:5, hint:'暗影之舞和破绽窗口内爆发' },
  },
  hunter:{
    bm:{ key:'h_beastBond', icon:'🐾', name:'兽群羁绊', max:5, hint:'宠物/召唤物越多,追咬越频繁' },
    marks:{ key:'h_frenzy', icon:'🎯', name:'狙击窗口', max:5, hint:'印记目标会被瞄准/杀戮射击穿透' },
    survival:{ key:'h_frenzy', icon:'💣', name:'野火节奏', max:5, hint:'炸弹、陷阱和DOT越多,猫鼬/屠戮越痛' },
  },
  shaman:{
    element:{ key:'stormCharge', icon:'⛈️', name:'雷霆充能', max:4, hint:'元素冲击和风暴守护者触发过载' },
    enhancement:{ key:'sh_maelstrom', icon:'🌀', name:'漩涡之力', max:5, hint:'裂地术/熔岩猛击消耗漩涡追加风怒' },
    restoration:{ key:'sh_totem', icon:'🌊', name:'图腾共鸣', max:5, hint:'治疗链/暴雨图腾同步治疗随从并护盾' },
  },
  paladin:{
    holy:{ key:'pa_bulwark', icon:'🌟', name:'圣光道标', max:5, hint:'祝福和治疗让随从获得治疗与护盾' },
    prot:{ key:'pa_bulwark', icon:'🛡️', name:'圣光壁垒', max:5, hint:'祝福窗口内回血、护盾和盾击更强' },
    ret:{ key:'pa_holyPower', icon:'⚜️', name:'圣能', max:5, hint:'满层用裁决/最终清算打圣能爆发' },
  },
  warlock:{
    affliction:{ key:'wl_shard', icon:'💜', name:'灵魂碎片', max:5, hint:'多DOT目标会被邪能狂涌/腐蚀之种收割' },
    demonology:{ key:'wl_shard', icon:'😈', name:'恶魔碎片', max:5, hint:'召唤物在场时恶魔之箭/内爆更强' },
    destruction:{ key:'wl_ember', icon:'🔥', name:'余烬', max:5, hint:'满层用混乱之箭/大灾变引爆' },
  },
  druid:{
    balance:{ key:'d_astral', icon:'🌗', name:'星界能量', max:5, hint:'星涌/星辰坠落消耗能量触发星界追击' },
    feral:{ key:'d_combo', icon:'🐾', name:'撕咬连击', max:5, hint:'满层割裂/凶猛撕咬按流血数量爆发' },
    resto:{ key:'d_harmony', icon:'🌿', name:'自然调和', max:5, hint:'满层让治疗扩展到随从并生成护盾' },
  },
};

const SPEC_TACTICAL_WINDOWS = {
  warrior:{
    arms:{ icon:'🪓', name:'巨人压迫', kind:'breaker', desc:'破甲印记接近满层时进入处决窗口: 目标被破甲/破绽压住,并追加一次斩杀伤害。' },
    fury:{ icon:'😡', name:'怒火脱缰', kind:'berserk', desc:'暴怒接近满层时进入狂乱窗口: 获得短暂急速,追击目标并回复生命。' },
    prot:{ icon:'🛡️', name:'盾墙反攻', kind:'bulwark', desc:'盾牌格挡接近满层时进入反攻窗口: 获得吸收盾,按防御反震敌人。' },
  },
  mage:{
    arcane:{ icon:'🔷', name:'法力虹吸', kind:'arcane', desc:'奥术充能接近满层时进入倾泻窗口: 追加奥术伤害并返还资源。' },
    fire:{ icon:'🔥', name:'活动燃线', kind:'fire', desc:'炽热接近满层时进入点燃窗口: 给目标挂上高额燃烧并向周围扩散火焰。' },
    frost:{ icon:'❄️', name:'碎冰护体', kind:'frost', desc:'指尖寒冰接近满层时进入碎裂窗口: 冻结目标,追加冰霜伤害并获得护盾。' },
  },
  priest:{
    discipline:{ icon:'⚖️', name:'赎罪棱镜', kind:'atonement', desc:'恩典接近满层时进入赎罪窗口: 伤害转化为主角与随从护盾。' },
    holy:{ icon:'✨', name:'圣言合唱', kind:'holyEcho', desc:'圣言恩典接近满层时进入合唱窗口: 治疗主角和随从,并留下圣光护盾。' },
    shadow:{ icon:'🌑', name:'虚空裂隙', kind:'void', desc:'疯狂接近满层时进入虚空窗口: 追加暗影爆发,强化并扩散持续伤害。' },
  },
  rogue:{
    assassination:{ icon:'🐍', name:'毒刃入骨', kind:'poison', desc:'毒锋接近满层时进入处刑窗口: 给目标补强毒伤并按持续伤害数量追加毒爆。' },
    combat:{ icon:'⚔️', name:'乱舞节拍', kind:'flurry', desc:'连击点接近满层时进入乱舞窗口: 获得急速,并把一次打击溅射到其他敌人。' },
    subtlety:{ icon:'🌑', name:'暗影伏击', kind:'shadow', desc:'暗影连击接近满层时进入伏击窗口: 制造破绽,下一轮敏锐技能更容易爆发。' },
  },
  hunter:{
    bm:{ icon:'🐾', name:'兽群围猎', kind:'beast', desc:'兽群羁绊接近满层时进入围猎窗口: 召唤/强化野兽协击,并追加追咬伤害。' },
    marks:{ icon:'🎯', name:'弱点瞄准', kind:'marks', desc:'狙击窗口接近满层时进入瞄准窗口: 标记目标并追加穿透伤害。' },
    survival:{ icon:'💣', name:'野火陷阱链', kind:'survival', desc:'野火节奏接近满层时进入陷阱窗口: 束缚目标,叠加爆炸持续伤害。' },
  },
  shaman:{
    element:{ icon:'⛈️', name:'风暴过载', kind:'element', desc:'雷霆充能接近满层时进入过载窗口: 追加闪电链式伤害并短暂减速。' },
    enhancement:{ icon:'🌀', name:'双狼漩涡', kind:'enhance', desc:'漩涡之力接近满层时进入风怒窗口: 获得风怒急速并追加近战追击。' },
    restoration:{ icon:'🌊', name:'灵魂潮汐', kind:'tide', desc:'图腾共鸣接近满层时进入潮汐窗口: 治疗主角和随从,并制造图腾护盾。' },
  },
  paladin:{
    holy:{ icon:'🌟', name:'双道标圣光', kind:'beacon', desc:'圣光道标接近满层时进入双道标窗口: 主角与随从同时获得治疗和护盾。' },
    prot:{ icon:'🛡️', name:'奉献壁垒', kind:'divineBulwark', desc:'圣光壁垒接近满层时进入奉献窗口: 获得减伤护盾,并以圣光反击。' },
    ret:{ icon:'⚜️', name:'最终裁决', kind:'verdict', desc:'圣能接近满层时进入裁决窗口: 标记审判目标并追加圣能爆发。' },
  },
  warlock:{
    affliction:{ icon:'💜', name:'灵魂收割', kind:'affliction', desc:'灵魂碎片接近满层时进入收割窗口: 强化痛苦持续伤害并扩散。' },
    demonology:{ icon:'😈', name:'恶魔传送门', kind:'demon', desc:'恶魔碎片接近满层时进入军团窗口: 召唤恶魔协战并追加恶魔协击。' },
    destruction:{ icon:'🔥', name:'混乱裂变', kind:'chaos', desc:'余烬接近满层时进入裂变窗口: 追加混乱伤害并点燃其他敌人。' },
  },
  druid:{
    balance:{ icon:'🌗', name:'星穹校准', kind:'eclipse', desc:'星界能量接近满层时进入星穹窗口: 追加星界伤害,多目标时落下星雨。' },
    feral:{ icon:'🐾', name:'血爪撕咬', kind:'feral', desc:'撕咬连击接近满层时进入血爪窗口: 给目标撕裂伤口并追加凶猛撕咬。' },
    resto:{ icon:'🌿', name:'生命林地', kind:'bloom', desc:'自然调和接近满层时进入林地窗口: 主角和随从获得持续治疗、护盾与自然调和。' },
  },
};

const SPEC_SKILL_CHAINS = {
  warrior:{
    arms:{ icon:'🪓', name:'压制破甲处决', finish:'收束时施加破甲/破绽并追加处决伤害', steps:[
      { label:'压制或碎颅打开缺口', match:/压制|碎颅|破甲|灭战者/ },
      { label:'致死或巨人压住护甲', match:/致死|巨人|灭战者/ },
      { label:'斩杀或巨人之击收束', match:/斩杀|巨人|致死/ },
    ] },
    fury:{ icon:'😡', name:'嗜血暴怒连舞', finish:'收束时获得狂乱、回血并追加怒火追击', steps:[
      { label:'嗜血或浴血点燃怒气', match:/嗜血|浴血|怒击/ },
      { label:'怒火乱舞或奥丁之怒加速', match:/怒火|乱舞|奥丁|鲁莽/ },
      { label:'斩杀或暴怒技能收束', match:/斩杀|暴怒|怒火|乱舞/ },
    ] },
    prot:{ icon:'🛡️', name:'盾挡复仇壁垒', finish:'收束时获得吸收盾并按防御反震', steps:[
      { label:'盾牌或雷霆建立格挡', match:/盾|雷霆|复仇/ },
      { label:'盾墙或壁垒稳住阵线', match:/盾墙|壁垒|格挡|钢铁/ },
      { label:'盾击或复仇反攻', match:/盾牌猛击|盾击|复仇|盾牌冲锋/ },
    ] },
  },
  mage:{
    arcane:{ icon:'🔷', name:'奥能充能倾泻', finish:'收束时追加奥术爆发并返还法力', steps:[
      { label:'奥术冲击叠充能', match:/奥术冲击|奥术飞弹|奥术/ },
      { label:'大法师或强化聚焦', match:/大法师|奥术强化|阿鲁尼斯|涌动/ },
      { label:'奥术弹幕倾泻', match:/奥术弹幕|弹幕|涌动/ },
    ] },
    fire:{ icon:'🔥', name:'点燃凤凰燃线', finish:'收束时点燃目标并扩散火焰', steps:[
      { label:'火球或活动炸弹铺火', match:/火球|活动炸弹|灼烧|燃烧/ },
      { label:'火焰冲击或凤凰升温', match:/火焰冲击|凤凰|流星|燃烧/ },
      { label:'炎爆或烈焰风暴引爆', match:/炎爆|烈焰风暴|流星|大灾/ },
    ] },
    frost:{ icon:'❄️', name:'冻结碎冰循环', finish:'收束时冻结目标、碎裂追击并获得护盾', steps:[
      { label:'寒冰箭或冰风暴挂寒意', match:/寒冰|冰风暴|暴风雪|冰霜/ },
      { label:'冰冻宝珠或彗星压制', match:/宝珠|彗星|冻结|冰/ },
      { label:'冰枪打碎裂', match:/冰枪|彗星|碎裂|冰风暴/ },
    ] },
  },
  priest:{
    discipline:{ icon:'⚖️', name:'真言赎罪棱镜', finish:'收束时伤害转化为主角与随从护盾', steps:[
      { label:'真言术或护盾建立恩典', match:/真言|盾|障|恩典/ },
      { label:'教派分歧制造破绽', match:/教派|分歧|惩罚/ },
      { label:'惩罚或惩击完成赎罪', match:/惩罚|惩击|光明之怒/ },
    ] },
    holy:{ icon:'✨', name:'圣言合唱回响', finish:'收束时治疗主角与随从并留下护盾', steps:[
      { label:'恢复或愈合祷言铺底', match:/恢复|愈合|治疗|祷言/ },
      { label:'圣言术聚光', match:/圣言|静|神圣新星/ },
      { label:'治疗祷言或圣光收束', match:/治疗祷言|圣言|圣光|神圣/ },
    ] },
    shadow:{ icon:'🌑', name:'痛苦疯狂虚空', finish:'收束时扩散暗影持续伤害并追加虚空爆发', steps:[
      { label:'暗言术或痛苦铺暗影', match:/暗言|痛|腐蚀|暗影/ },
      { label:'精神鞭笞堆疯狂', match:/鞭笞|心灵|疯狂|虚空/ },
      { label:'噬灵疫病或虚空爆发收割', match:/噬灵|疫病|虚空|冲撞/ },
    ] },
  },
  rogue:{
    assassination:{ icon:'🐍', name:'锁喉毒爆处刑', finish:'收束时按持续伤害数量追加毒爆', steps:[
      { label:'锁喉或割裂开伤口', match:/锁喉|割裂|毒|毁伤/ },
      { label:'毁伤堆毒锋', match:/毁伤|毒刃|君王/ },
      { label:'奉毒或君王之灾处刑', match:/奉毒|君王|毒/ },
    ] },
    combat:{ icon:'⚔️', name:'剑刃眉心乱舞', finish:'收束时获得急速并溅射乱舞伤害', steps:[
      { label:'邪恶打击或剑刃冲刺起手', match:/邪恶|剑刃|冲刺|背刺/ },
      { label:'命运骨骰加速节拍', match:/命运|骨骰|冲动|切割/ },
      { label:'正中眉心或杀戮盛宴收束', match:/正中|眉心|杀戮|切割/ },
    ] },
    subtlety:{ icon:'🌑', name:'暗影伏击秘技', finish:'收束时制造破绽并触发暗影追击', steps:[
      { label:'背刺或幽暗之刃找破绽', match:/背刺|幽暗|暗袭|绞喉/ },
      { label:'暗影之舞进入窗口', match:/暗影之舞|暗影|袖剑/ },
      { label:'袖剑风暴或暗袭收束', match:/袖剑|暗袭|秘技|暗影/ },
    ] },
  },
  hunter:{
    bm:{ icon:'🐾', name:'倒刺兽群围猎', finish:'收束时召唤或强化野兽并追加追咬', steps:[
      { label:'倒刺射击激怒野兽', match:/倒刺|宠物|野兽|杀戮/ },
      { label:'凶暴野兽或召唤物入场', match:/凶暴|野兽|召唤|宠物/ },
      { label:'杀戮命令或协同猛攻收束', match:/杀戮|协同|猛攻|兽群/ },
    ] },
    marks:{ icon:'🎯', name:'印记瞄准穿透', finish:'收束时标记弱点并追加穿透伤害', steps:[
      { label:'猎人印记标定目标', match:/印记|标记|精确/ },
      { label:'瞄准或百发蓄势', match:/瞄准|百发|二连|急速射击/ },
      { label:'杀戮射击或奇美拉穿透', match:/杀戮|奇美拉|瞄准|精确/ },
    ] },
    survival:{ icon:'💣', name:'陷阱野火屠戮', finish:'收束时束缚目标并引爆野火持续伤害', steps:[
      { label:'钉刺或陷阱铺场', match:/钉刺|陷阱|毒蛇|野火/ },
      { label:'野火炸弹制造爆点', match:/野火|炸弹|爆炸/ },
      { label:'猫鼬撕咬或屠戮收束', match:/猫鼬|屠戮|猛禽|爆炸/ },
    ] },
  },
  shaman:{
    element:{ icon:'⛈️', name:'熔岩风暴过载', finish:'收束时追加链式闪电并减速', steps:[
      { label:'闪电或震击充能', match:/闪电|震击|雷霆/ },
      { label:'熔岩爆裂点燃过载', match:/熔岩|元素冲击|过载/ },
      { label:'风暴守护者释放', match:/风暴守护|元素冲击|风暴|拉登/ },
    ] },
    enhancement:{ icon:'🌀', name:'风怒漩涡裂地', finish:'收束时获得风怒并追加近战追击', steps:[
      { label:'风暴打击或毁灭闪电起势', match:/风暴打击|毁灭闪电|风怒/ },
      { label:'幽魂狼或漩涡蓄力', match:/幽魂|漩涡|狼|嗜血/ },
      { label:'裂地术或熔岩猛击收束', match:/裂地|熔岩猛击|熔岩|毁灭/ },
    ] },
    restoration:{ icon:'🌊', name:'激流链愈潮汐', finish:'收束时治疗主角与随从并制造图腾护盾', steps:[
      { label:'激流或治疗波起潮', match:/激流|治疗波|治疗之泉/ },
      { label:'治疗链连接队友', match:/治疗链|链愈|图腾/ },
      { label:'暴雨图腾或潮汐收束', match:/暴雨|潮汐|治疗链|图腾/ },
    ] },
  },
  paladin:{
    holy:{ icon:'🌟', name:'震击道标黎明', finish:'收束时双道标治疗并护盾随从', steps:[
      { label:'神圣震击点亮道标', match:/神圣震击|圣光|道标/ },
      { label:'圣光闪现或祝福续航', match:/圣光闪现|祝福|圣光/ },
      { label:'黎明之光收束', match:/黎明|圣言|圣光|震击/ },
    ] },
    prot:{ icon:'🛡️', name:'审判复仇壁垒', finish:'收束时获得减伤护盾并以圣光反击', steps:[
      { label:'审判或奉献建立威胁', match:/审判|奉献|正义/ },
      { label:'复仇者之盾弹射', match:/复仇者|盾|守护|炽热/ },
      { label:'正义盾击收束', match:/正义盾击|盾击|复仇者|盾/ },
    ] },
    ret:{ icon:'⚜️', name:'审判圣能裁决', finish:'收束时标记审判目标并追加圣能爆发', steps:[
      { label:'审判或十字军积攒圣能', match:/审判|十字军|公正/ },
      { label:'灰烬觉醒点燃圣能', match:/灰烬|公正|复仇之怒/ },
      { label:'圣殿裁决或最终清算收束', match:/圣殿裁决|裁决|最终清算|愤怒之锤/ },
    ] },
  },
  warlock:{
    affliction:{ icon:'💜', name:'痛楚鬼影收割', finish:'收束时强化并扩散痛苦持续伤害', steps:[
      { label:'痛楚或腐蚀铺病', match:/痛楚|腐蚀|痛苦/ },
      { label:'鬼影缠身压迫灵魂', match:/鬼影|缠身|痛苦无常/ },
      { label:'邪能狂涌或腐蚀之种收割', match:/邪能狂涌|腐蚀之种|收割|狂涌/ },
    ] },
    demonology:{ icon:'😈', name:'恶犬古手内爆', finish:'收束时召唤恶魔协战并追加恶魔协击', steps:[
      { label:'恐惧猎犬或恶魔召唤入场', match:/恐惧猎犬|恶魔|召唤/ },
      { label:'古尔丹之手聚集军团', match:/古尔丹|恶魔之箭|曼阿里/ },
      { label:'内爆或恶魔之箭收束', match:/内爆|恶魔之箭|吞噬|恶魔/ },
    ] },
    destruction:{ icon:'🔥', name:'献祭燃烧混乱', finish:'收束时追加混乱裂变并点燃敌人', steps:[
      { label:'献祭或烧尽铺火', match:/献祭|烧尽|燃烧/ },
      { label:'火焰之雨或大灾变升温', match:/火焰之雨|大灾变|余烬/ },
      { label:'混乱之箭收束', match:/混乱之箭|混乱|灵魂之火|裂隙/ },
    ] },
  },
  druid:{
    balance:{ icon:'🌗', name:'日月星涌星落', finish:'收束时追加星界伤害并落下星雨', steps:[
      { label:'月火或阳炎铺星痕', match:/月火|阳炎|日炎/ },
      { label:'星火或愤怒校准日月', match:/星火|愤怒|星界/ },
      { label:'星涌或星辰坠落收束', match:/星涌|星辰|新月|星落/ },
    ] },
    feral:{ icon:'🐾', name:'斜掠割裂撕咬', finish:'收束时撕裂伤口并追加凶猛撕咬', steps:[
      { label:'斜掠或撕碎建立连击', match:/斜掠|撕碎|横扫/ },
      { label:'割裂放血', match:/割裂|流血|野性/ },
      { label:'凶猛撕咬收束', match:/凶猛|撕咬|野性狂怒/ },
    ] },
    resto:{ icon:'🌿', name:'回春绽放林地', finish:'收束时主角和随从获得大治疗与自然护盾', steps:[
      { label:'回春术铺恢复', match:/回春|恢复|生命绽放/ },
      { label:'迅捷治愈催生繁花', match:/迅捷|治愈|野性成长/ },
      { label:'百花齐放或宁静收束', match:/百花|宁静|母树|绽放/ },
    ] },
  },
};

const SPEC_REACTION_SYSTEMS = {
  warrior:{
    arms:{ key:'warriorArmsTrauma', icon:'🪓', name:'撕裂创伤', stackName:'创伤', max:4, state:'trauma', desc:'破甲、压制、致死打击叠创伤;斩杀/巨人之击会引爆为破甲、破绽和处决追击。', primer:/破甲|压制|致死|碎颅|灭战者/, detonator:/斩杀|巨人|灭战者/ },
    fury:{ key:'warriorFuryBloodheat', icon:'😡', name:'血热', stackName:'血热', max:5, state:'trauma', desc:'嗜血、怒击、浴血奋战叠血热;怒火乱舞/奥丁之怒引爆,获得回血和狂怒追击。', primer:/嗜血|怒击|浴血|鲁莽|暴怒/, detonator:/怒火|乱舞|奥丁|斩杀/ },
    prot:{ key:'warriorProtCounter', icon:'🛡️', name:'盾反裂口', stackName:'裂口', max:4, state:'trauma', desc:'盾牌、复仇、雷霆和承伤节奏叠裂口;盾击/复仇引爆为护盾反震。', primer:/盾|复仇|雷霆|壁垒|格挡/, detonator:/盾牌猛击|盾击|复仇|盾牌冲锋/ },
  },
  mage:{
    arcane:{ key:'mageArcaneInstability', icon:'🔷', name:'奥术失衡', stackName:'失衡', max:4, state:'unstable', desc:'奥术冲击/飞弹叠失衡;弹幕/涌动引爆,造成奥术爆发并返还法力。', primer:/奥术|飞弹|冲击|阿鲁尼斯/, detonator:/弹幕|涌动|大法师/ },
    fire:{ key:'mageFireCombustion', icon:'🔥', name:'内燃', stackName:'燃点', max:5, state:'fever', desc:'火球、活动炸弹、凤凰、流星叠燃点;炎爆/烈焰风暴引爆为灼烧 DOT 和扩散火焰。', primer:/火球|活动炸弹|燃烧|凤凰|流星|火焰/, detonator:/炎爆|烈焰风暴|流星|大灾/ },
    frost:{ key:'mageFrostBrittle', icon:'❄️', name:'寒脆', stackName:'寒脆', max:4, state:'brittle', desc:'寒冰箭、冰风暴、宝珠叠寒脆;冰枪/彗星引爆为冻结、碎裂追击和护盾。', primer:/寒冰|冰霜|冰风暴|宝珠|暴风雪/, detonator:/冰枪|彗星|碎裂|冰风暴/ },
  },
  priest:{
    discipline:{ key:'priestDiscPrism', icon:'⚖️', name:'赎罪棱镜', stackName:'棱镜', max:4, state:'penanceMark', desc:'真言术、护盾、教派分歧叠棱镜;惩罚/惩击引爆,把伤害转成主角与随从护盾。', primer:/真言|盾|障|教派|分歧/, detonator:/惩罚|惩击|光明之怒/ },
    holy:{ key:'priestHolyEcho', icon:'✨', name:'圣光回响', stackName:'回响', max:4, state:'holyBrand', desc:'恢复、圣言、祷言叠回响;治疗祷言/圣言引爆,治疗主角和随从并留下护盾。', primer:/恢复|治疗|祷言|圣言|神圣/, detonator:/治疗祷言|圣言|神圣新星|圣光/ },
    shadow:{ key:'priestShadowMadness', icon:'🌑', name:'虚空裂口', stackName:'裂口', max:5, state:'voidTorn', desc:'暗言、鞭笞、疫病叠裂口;虚空爆发/暗影冲撞引爆,扩散暗影 DOT。', primer:/暗言|痛|鞭笞|心灵|暗影|疫病/, detonator:/虚空|噬灵|疫病|冲撞/ },
  },
  rogue:{
    assassination:{ key:'rogueAssnVenomBloom', icon:'🐍', name:'毒花', stackName:'毒花', max:5, state:'venomBloom', desc:'锁喉、割裂、毁伤和毒药叠毒花;奉毒/君王之灾引爆,按 DOT 数量追加毒爆。', primer:/锁喉|割裂|毁伤|毒|君王/, detonator:/奉毒|君王|毒/ },
    combat:{ key:'rogueCombatTempo', icon:'⚔️', name:'乱舞节拍', stackName:'节拍', max:5, state:'exposed', desc:'邪恶打击、剑刃冲刺、命运骨骰叠节拍;正中眉心/杀戮盛宴引爆为急速和溅射追击。', primer:/邪恶|剑刃|冲刺|命运|骨骰|切割/, detonator:/正中|眉心|杀戮|切割/ },
    subtlety:{ key:'rogueSubShadowGap', icon:'🌑', name:'暗影破绽', stackName:'破绽', max:4, state:'exposed', desc:'背刺、幽暗之刃、暗影之舞叠破绽;暗袭/袖剑风暴引爆为暗影追击。', primer:/背刺|幽暗|暗影|袖剑|绞喉/, detonator:/暗袭|袖剑|秘技|暗影/ },
  },
  hunter:{
    bm:{ key:'hunterBmPackScent', icon:'🐾', name:'兽群气味', stackName:'气味', max:5, state:'huntWound', desc:'倒刺射击、宠物、野兽技能叠气味;杀戮命令/协同猛攻引爆,触发追咬和野兽协战。', primer:/倒刺|宠物|野兽|凶暴|召唤/, detonator:/杀戮|协同|猛攻|兽群/ },
    marks:{ key:'hunterMarksWeakpoint', icon:'🎯', name:'弱点锁定', stackName:'锁定', max:4, state:'huntWound', desc:'印记、瞄准、百发叠锁定;杀戮射击/奇美拉引爆为穿透伤害。', primer:/印记|标记|瞄准|百发|二连|精确/, detonator:/杀戮|奇美拉|瞄准|精确/ },
    survival:{ key:'hunterSurvWildfire', icon:'💣', name:'野火药引', stackName:'药引', max:5, state:'fever', desc:'钉刺、陷阱、野火炸弹叠药引;猫鼬/屠戮引爆为束缚和野火 DOT。', primer:/钉刺|陷阱|毒蛇|野火|炸弹/, detonator:/猫鼬|屠戮|猛禽|爆炸/ },
  },
  shaman:{
    element:{ key:'shamanEleStormbrand', icon:'⛈️', name:'风暴烙印', stackName:'烙印', max:4, state:'stormBrand', desc:'闪电、熔岩、震击叠烙印;元素冲击/风暴守护者引爆为过载弹射和减速。', primer:/闪电|熔岩|震击|雷霆|元素/, detonator:/元素冲击|风暴守护|风暴|拉登/ },
    enhancement:{ key:'shamanEnhMaelbrand', icon:'🌀', name:'漩涡刻痕', stackName:'刻痕', max:5, state:'stormBrand', desc:'风暴打击、毁灭闪电、幽魂狼叠刻痕;裂地术/熔岩猛击引爆为风怒追击。', primer:/风暴打击|毁灭闪电|风怒|幽魂|漩涡|狼/, detonator:/裂地|熔岩猛击|熔岩|毁灭/ },
    restoration:{ key:'shamanRestTidewell', icon:'🌊', name:'潮汐井', stackName:'潮汐', max:4, state:'lifeSeed', desc:'激流、治疗波、治疗链叠潮汐;暴雨图腾/潮汐引爆,治疗主角与随从并制造护盾。', primer:/激流|治疗波|治疗链|链愈|图腾/, detonator:/暴雨|潮汐|治疗链|图腾/ },
  },
  paladin:{
    holy:{ key:'paladinHolyBeacon', icon:'🌟', name:'双道标', stackName:'道标', max:4, state:'holyBrand', desc:'神圣震击、圣光、祝福叠道标;黎明之光/圣光引爆,双目标治疗并护盾随从。', primer:/神圣震击|圣光|祝福|道标/, detonator:/黎明|圣光|震击/ },
    prot:{ key:'paladinProtConsecrate', icon:'🛡️', name:'奉献圣印', stackName:'圣印', max:5, state:'holyBrand', desc:'审判、奉献、复仇者之盾叠圣印;正义盾击引爆为减伤护盾和圣光反击。', primer:/审判|奉献|复仇者|盾|正义/, detonator:/正义盾击|盾击|复仇者|盾/ },
    ret:{ key:'paladinRetVerdict', icon:'⚜️', name:'裁决圣印', stackName:'圣印', max:5, state:'holyBrand', desc:'审判、十字军、公正之剑叠圣印;圣殿裁决/最终清算引爆为圣能爆发。', primer:/审判|十字军|公正|灰烬|复仇之怒/, detonator:/圣殿裁决|裁决|最终清算|愤怒之锤/ },
  },
  warlock:{
    affliction:{ key:'warlockAffDoombrand', icon:'💜', name:'痛苦契印', stackName:'契印', max:5, state:'doomBrand', desc:'痛楚、腐蚀、鬼影叠契印;邪能狂涌/腐蚀之种引爆,强化并扩散 DOT。', primer:/痛楚|腐蚀|痛苦|鬼影|缠身/, detonator:/邪能狂涌|腐蚀之种|收割|狂涌/ },
    demonology:{ key:'warlockDemoPortal', icon:'😈', name:'军团裂门', stackName:'裂门', max:4, state:'doomBrand', desc:'恐惧猎犬、古尔丹之手、恶魔技能叠裂门;内爆/恶魔之箭引爆,召唤恶魔协战。', primer:/恐惧猎犬|古尔丹|恶魔|召唤|曼阿里/, detonator:/内爆|恶魔之箭|吞噬|恶魔/ },
    destruction:{ key:'warlockDestChaosbrand', icon:'🔥', name:'混乱余烬', stackName:'余烬', max:5, state:'fever', desc:'献祭、烧尽、燃烧叠余烬;混乱之箭/大灾变引爆为混乱裂变和火焰 DOT。', primer:/献祭|烧尽|燃烧|火焰之雨|大灾变/, detonator:/混乱之箭|混乱|灵魂之火|裂隙/ },
  },
  druid:{
    balance:{ key:'druidBalAstralbrand', icon:'🌗', name:'星痕', stackName:'星痕', max:5, state:'astralBrand', desc:'月火、阳炎、星火叠星痕;星涌/星辰坠落引爆为星界追击和星雨溅射。', primer:/月火|阳炎|日炎|星火|愤怒/, detonator:/星涌|星辰|新月|星落/ },
    feral:{ key:'druidFeralDeepbleed', icon:'🐾', name:'深裂', stackName:'深裂', max:5, state:'trauma', desc:'斜掠、撕碎、割裂叠深裂;凶猛撕咬/野性狂怒引爆为流血和撕咬追击。', primer:/斜掠|撕碎|横扫|割裂|流血/, detonator:/凶猛|撕咬|野性狂怒/ },
    resto:{ key:'druidRestLifeseed', icon:'🌿', name:'生命种子', stackName:'种子', max:4, state:'lifeSeed', desc:'回春、生命绽放、迅捷治愈叠种子;百花齐放/宁静引爆,治疗主角与随从并生成自然护盾。', primer:/回春|生命绽放|迅捷|治愈|野性成长/, detonator:/百花|宁静|母树|绽放/ },
  },
};

const SPEC_PROC_SYSTEMS = {
  warrior:{
    arms:{ key:'armsExecutionOrder', icon:'🪓', name:'处决号令', desc:'引爆创伤后,下一次斩杀/巨人之击资源消耗降低40%,必定暴击,并溅射20%。', spender:/斩杀|巨人|灭战者/, damagePct:0.22, costPct:0.60, forceCrit:true, splashPct:0.20 },
    fury:{ key:'furyBloodSurge', icon:'😡', name:'血涌', desc:'暴怒节奏触发后,下一次怒火乱舞/奥丁之怒必暴,造成额外追击并恢复生命。', spender:/怒火|乱舞|奥丁|斩杀/, damagePct:0.18, forceCrit:true, healPct:0.035, extraHitPct:0.22 },
    prot:{ key:'protShieldRiposte', icon:'🛡️', name:'盾牌还击', desc:'盾反裂口触发后,下一次盾击/复仇获得护盾,按防御追加反震并返还资源。', spender:/盾牌猛击|盾击|复仇|盾牌冲锋/, damagePct:0.12, shieldPct:0.05, resource:8, cooldownPct:0.20 },
  },
  mage:{
    arcane:{ key:'arcaneClearcast', icon:'🔷', name:'节能倾泻', desc:'奥术失衡触发后,下一次弹幕/涌动资源消耗降低50%,额外返还法力并追加奥术爆发。', spender:/弹幕|涌动|大法师/, damagePct:0.20, costPct:0.50, resource:14, extraHitPct:0.18 },
    fire:{ key:'fireHotStreak', icon:'🔥', name:'炎爆瞬发', desc:'内燃触发后,下一次炎爆/流星必暴,点燃目标并扩散火焰。', spender:/炎爆|流星|烈焰风暴|大灾/, damagePct:0.20, forceCrit:true, dotPct:0.16, spreadDotPct:0.45, splashPct:0.22 },
    frost:{ key:'frostBrainFreeze', icon:'❄️', name:'冰冷智慧', desc:'寒脆触发后,下一次冰枪/彗星冻结目标,必暴并获得冰盾。', spender:/冰枪|彗星|冰风暴|宝珠/, damagePct:0.18, forceCrit:true, state:'frozen', shieldPct:0.035 },
  },
  priest:{
    discipline:{ key:'discAtonementSurge', icon:'⚖️', name:'赎罪涌动', desc:'赎罪棱镜触发后,下一次惩罚/惩击必暴,伤害转化为主角与随从护盾。', spender:/惩罚|惩击|光明之怒/, damagePct:0.16, forceCrit:true, shieldPct:0.045, companionShieldPct:0.055 },
    holy:{ key:'holySerendipity', icon:'✨', name:'圣光机缘', desc:'圣光回响触发后,下一次圣言/治疗祷言治疗提高,过量治疗转为护盾并治疗随从。', spender:/治疗祷言|圣言|神圣新星|圣光/, healPct:0.16, shieldPct:0.035, companionHealPct:0.07, costPct:0.70 },
    shadow:{ key:'shadowVoidTorrent', icon:'🌑', name:'虚空洪流', desc:'虚空裂口触发后,下一次虚空/疫病技能必暴并扩散暗影持续伤害。', spender:/虚空|噬灵|疫病|冲撞/, damagePct:0.22, forceCrit:true, spreadDotPct:0.55, dotPct:0.14 },
  },
  rogue:{
    assassination:{ key:'assnToxicFinish', icon:'🐍', name:'毒伤终结', desc:'毒花触发后,下一次奉毒/君王之灾必暴,消耗更少能量并追加毒爆。', spender:/奉毒|君王|毒/, damagePct:0.20, costPct:0.55, forceCrit:true, dotPct:0.14 },
    combat:{ key:'combatLoadedDice', icon:'⚔️', name:'灌铅骰子', desc:'乱舞节拍触发后,下一次正中眉心/杀戮盛宴必暴,刷新部分冷却并溅射。', spender:/正中|眉心|杀戮|切割/, damagePct:0.18, forceCrit:true, cooldownPct:0.35, splashPct:0.25 },
    subtlety:{ key:'subShadowOpportunity', icon:'🌑', name:'暗影机会', desc:'暗影破绽触发后,下一次暗袭/袖剑风暴必暴,制造破绽并追加暗影伤害。', spender:/暗袭|袖剑|秘技|暗影/, damagePct:0.20, forceCrit:true, state:'exposed', extraHitPct:0.18 },
  },
  hunter:{
    bm:{ key:'bmKillWindow', icon:'🐾', name:'杀戮窗口', desc:'兽群气味触发后,下一次杀戮命令/协同猛攻召唤兽群追咬并强化宠物协同。', spender:/杀戮|协同|猛攻|兽群/, damagePct:0.16, summon:'beast', extraHitPct:0.20, resource:8 },
    marks:{ key:'marksLockAndLoad', icon:'🎯', name:'荷枪实弹', desc:'弱点锁定触发后,下一次瞄准/杀戮射击资源消耗降低,必暴并穿透标记目标。', spender:/杀戮|奇美拉|瞄准|精确/, damagePct:0.24, costPct:0.50, forceCrit:true, state:'marked' },
    survival:{ key:'survTrapChain', icon:'💣', name:'陷阱连锁', desc:'野火药引触发后,下一次猫鼬/屠戮引爆野火,束缚并扩散持续伤害。', spender:/猫鼬|屠戮|猛禽|爆炸/, damagePct:0.18, state:'rooted', dotPct:0.15, spreadDotPct:0.35 },
  },
  shaman:{
    element:{ key:'eleLavaOverload', icon:'⛈️', name:'熔岩过载', desc:'风暴烙印触发后,下一次元素冲击/风暴守护者必暴并弹射闪电。', spender:/元素冲击|风暴守护|风暴|拉登/, damagePct:0.22, forceCrit:true, splashPct:0.28, state:'slow' },
    enhancement:{ key:'enhWindlash', icon:'🌀', name:'风怒连击', desc:'漩涡刻痕触发后,下一次裂地/熔岩猛击追加风怒追击并返还资源。', spender:/裂地|熔岩猛击|熔岩|毁灭/, damagePct:0.18, extraHitPct:0.26, resource:10, cooldownPct:0.20 },
    restoration:{ key:'restTidalCore', icon:'🌊', name:'潮汐核心', desc:'潮汐井触发后,下一次治疗链/暴雨图腾治疗提高,同时护盾主角和随从。', spender:/暴雨|潮汐|治疗链|图腾/, healPct:0.18, shieldPct:0.04, companionHealPct:0.08, companionShieldPct:0.05 },
  },
  paladin:{
    holy:{ key:'hpalBeaconBloom', icon:'🌟', name:'道标绽放', desc:'双道标触发后,下一次黎明/圣光治疗提高,并给随从同步治疗与护盾。', spender:/黎明|圣光|震击/, healPct:0.18, companionHealPct:0.08, companionShieldPct:0.05, costPct:0.70 },
    prot:{ key:'ppalAvengerEcho', icon:'🛡️', name:'复仇回声', desc:'奉献圣印触发后,下一次盾击/复仇者之盾获得护盾并弹射圣光伤害。', spender:/正义盾击|盾击|复仇者|盾/, damagePct:0.14, shieldPct:0.055, splashPct:0.22, resource:8 },
    ret:{ key:'retFinalVerdict', icon:'⚜️', name:'最终裁决', desc:'裁决圣印触发后,下一次圣殿裁决/最终清算必暴并标记审判。', spender:/圣殿裁决|裁决|最终清算|愤怒之锤/, damagePct:0.24, forceCrit:true, state:'judged', costPct:0.65 },
  },
  warlock:{
    affliction:{ key:'affSoulRapture', icon:'💜', name:'灵魂狂欢', desc:'痛苦契印触发后,下一次邪能狂涌/腐蚀之种扩散所有持续伤害并返还资源。', spender:/邪能狂涌|腐蚀之种|收割|狂涌/, damagePct:0.18, spreadDotPct:0.65, dotPct:0.14, resource:10 },
    demonology:{ key:'demoDemonicCore', icon:'😈', name:'恶魔核心', desc:'军团裂门触发后,下一次内爆/恶魔之箭必暴并召唤恶魔协击。', spender:/内爆|恶魔之箭|吞噬|恶魔/, damagePct:0.20, forceCrit:true, summon:'demon', extraHitPct:0.18 },
    destruction:{ key:'destBackdraft', icon:'🔥', name:'爆燃回流', desc:'混乱余烬触发后,下一次混乱之箭/裂隙必暴,消耗降低并点燃附近敌人。', spender:/混乱之箭|混乱|灵魂之火|裂隙/, damagePct:0.24, forceCrit:true, costPct:0.55, dotPct:0.15, splashPct:0.22 },
  },
  druid:{
    balance:{ key:'balShootingStars', icon:'🌗', name:'坠星预兆', desc:'星痕触发后,下一次星涌/星落必暴并落下星界溅射。', spender:/星涌|星辰|新月|星落/, damagePct:0.20, forceCrit:true, splashPct:0.25, resource:8 },
    feral:{ key:'feralBloodtalons', icon:'🐾', name:'血爪', desc:'深裂触发后,下一次凶猛撕咬/野性狂怒必暴,追加流血并返还能量。', spender:/凶猛|撕咬|野性狂怒/, damagePct:0.22, forceCrit:true, dotPct:0.14, resource:10 },
    resto:{ key:'restForestGrace', icon:'🌿', name:'林地恩典', desc:'生命种子触发后,下一次百花/宁静治疗提高,给主角和随从生成自然护盾。', spender:/百花|宁静|母树|绽放/, healPct:0.20, shieldPct:0.045, companionHealPct:0.08, companionShieldPct:0.05 },
  },
};

function specCore(key, icon, name, desc, generator, spender, payoff, opts) {
  return Object.assign({
    key, icon, name, desc,
    max: opts?.max || 6,
    threshold: opts?.threshold || opts?.max || 6,
    durationMs: opts?.durationMs || 18000,
    generator,
    spender,
    gain: Object.assign({ dmg:1, heal:1, buff:1, summon:1, defensive:1, generatorAdd:1 }, opts?.gain || {}),
    passive: Object.assign({ damagePctPerStack:0.012, healPctPerStack:0.012 }, opts?.passive || {}),
    payoff: Object.assign({ damagePct:0.18, resource:5 }, payoff || {}),
  }, opts?.extra || {});
}

const SPEC_CORE_SYSTEMS = {
  warrior:{
    arms:specCore('armsExecutionEngine','🪓','斩杀校准','压制、破甲和致死打击会校准处决角度;满层用斩杀/巨人之击收束,造成破甲追击并让目标暴露。',/压制|破甲|致死|碎颅|灭战者|巨人/,/斩杀|巨人|灭战者/,{ damagePctPerStack:0.075, state:['sunder','exposed'], extraHitPct:0.18, resource:8 },{ passive:{ damagePctPerStack:0.014 } }),
    fury:specCore('furyBloodboilEngine','😡','血沸节拍','嗜血、怒击和乱舞会让血液沸腾;满层用怒火乱舞/奥丁之怒释放,触发追击、回血和急速窗口。',/嗜血|怒击|浴血|怒火|乱舞|奥丁|鲁莽/,/怒火|乱舞|奥丁|斩杀/,{ damagePctPerStack:0.055, extraHitPct:0.26, healPct:0.045, buff:'s_frenzy', buffMs:4200 },{ passive:{ damagePctPerStack:0.011 } }),
    prot:specCore('protBastionEngine','🛡️','壁垒压力','盾牌、复仇和雷霆会累积壁垒压力;满层用盾击/复仇收束,获得厚盾并按防御反震。',/盾|复仇|雷霆|壁垒|格挡|盾墙/,/盾牌猛击|盾击|复仇|盾牌冲锋/,{ damagePctPerStack:0.035, shieldPct:0.08, state:'trauma', resource:10 },{ passive:{ damagePctPerStack:0.008, shieldPctPerStack:0.006 } }),
  },
  mage:{
    arcane:specCore('arcaneLeylineEngine','🔷','魔网过载','奥术技能会压缩魔网;满层用弹幕/涌动倾泻,返还法力并制造不稳定爆发。',/奥术|飞弹|冲击|弹幕|涌动|阿鲁尼斯/,/弹幕|涌动|大法师/,{ damagePctPerStack:0.065, state:'unstable', splashPct:0.22, resource:16, cooldownPct:0.18 },{ passive:{ damagePctPerStack:0.016 } }),
    fire:specCore('fireKindlingEngine','🔥','燃点链','火球、凤凰、流星和燃烧会串起燃点;满层用炎爆/烈焰风暴收束,点燃并扩散灼烧。',/火|炎|燃|凤凰|流星|灼烧|烈焰/,/炎爆|流星|烈焰风暴|大灾/,{ damagePctPerStack:0.06, dotPct:0.18, spreadDotPct:0.55, splashPct:0.20, state:'fever' },{ passive:{ damagePctPerStack:0.011 } }),
    frost:specCore('frostShatterEngine','❄️','碎裂温差','寒冰、冰风暴、宝珠和屏障会制造温差;满层用冰枪/彗星收束,冻结并打出碎裂护盾。',/冰|霜|寒|雪|宝珠|屏障|彗星/,/冰枪|彗星|碎裂|冰风暴/,{ damagePctPerStack:0.055, state:'frozen', shieldPct:0.055, extraHitPct:0.16, forceCrit:true },{ passive:{ damagePctPerStack:0.012 } }),
  },
  priest:{
    discipline:specCore('discAtonementEngine','⚖️','赎罪回路','真言术、护盾和惩罚会建立赎罪回路;满层用惩罚/惩击收束,把伤害转为主角与随从护盾。',/真言|盾|障|惩罚|惩击|教派|分歧/,/惩罚|惩击|光明之怒/,{ damagePctPerStack:0.04, shieldPct:0.075, companionShieldPct:0.08, state:'penanceMark' },{ passive:{ damagePctPerStack:0.008, healPctPerStack:0.018 } }),
    holy:specCore('holyChoirEngine','✨','圣言合唱','治疗、祷言和圣言会让圣光合唱升调;满层用圣言/治疗祷言收束,治疗主角和随从并留下护盾。',/治疗|祷言|圣言|恢复|神圣|圣光/,/治疗祷言|圣言|神圣新星|圣光/,{ healPct:0.16, shieldPct:0.055, companionHealPct:0.10, companionShieldPct:0.055, resource:8 },{ passive:{ damagePctPerStack:0.006, healPctPerStack:0.022 } }),
    shadow:specCore('shadowEntropyEngine','🌑','虚空熵变','暗言、鞭笞、心灵和疫病会提高虚空熵;满层用虚空爆发/噬灵疫病收束,扩散暗影持续伤害。',/暗言|痛|鞭笞|心灵|暗影|疫病|虚空/,/虚空|噬灵|疫病|冲撞/,{ damagePctPerStack:0.065, dotPct:0.17, spreadDotPct:0.60, state:'voidTorn', resource:8 },{ passive:{ damagePctPerStack:0.012 } }),
  },
  rogue:{
    assassination:specCore('assnVenomEngine','🐍','毒液调配','锁喉、割裂、毁伤和毒药会调配毒液;满层用奉毒/君王之灾收束,触发毒爆并延长痛苦。',/锁喉|割裂|毁伤|毒|君王/,/奉毒|君王|毒/,{ damagePctPerStack:0.058, dotPct:0.18, state:'venomBloom', forceCrit:true, resource:8 },{ passive:{ damagePctPerStack:0.012 } }),
    combat:specCore('combatTempoEngine','⚔️','刀锋节拍','邪恶打击、剑刃冲刺和命运骨骰会推进节拍;满层用正中眉心/杀戮盛宴收束,刷新冷却并乱舞溅射。',/邪恶|剑刃|冲刺|命运|骨骰|切割|眉心/,/正中|眉心|杀戮|切割/,{ damagePctPerStack:0.052, splashPct:0.30, cooldownPct:0.30, buff:'s_haste', buffMs:3500 },{ passive:{ damagePctPerStack:0.011 } }),
    subtlety:specCore('subUmbralEngine','🌑','暗幕步点','背刺、暗影之舞和袖剑会在目标背后布下步点;满层用暗袭/秘技收束,制造破绽并追加暗影刀。',/背刺|幽暗|暗影|袖剑|暗袭|绞喉/,/暗袭|袖剑|秘技|暗影/,{ damagePctPerStack:0.06, state:'exposed', extraHitPct:0.24, forceCrit:true, resource:8 },{ passive:{ damagePctPerStack:0.013 } }),
  },
  hunter:{
    bm:specCore('bmPackEngine','🐾','兽群号令','宠物、倒刺和野兽技能会吹响号令;满层用杀戮命令/协同猛攻收束,召唤兽群追咬。',/宠物|野兽|倒刺|杀戮|兽群|召唤|协同/,/杀戮|协同|猛攻|兽群/,{ damagePctPerStack:0.045, summon:'beast', extraHitPct:0.22, companionShieldPct:0.055, resource:10 },{ passive:{ damagePctPerStack:0.010 } }),
    marks:specCore('marksBallisticEngine','🎯','弹道测算','印记、瞄准和百发会完成弹道测算;满层用瞄准/杀戮射击收束,标记弱点并必暴穿透。',/印记|标记|瞄准|百发|二连|精确|奇美拉/,/杀戮|奇美拉|瞄准|精确/,{ damagePctPerStack:0.07, state:'marked', forceCrit:true, splashPct:0.18, resource:8 },{ passive:{ damagePctPerStack:0.015 } }),
    survival:specCore('survTrapEngine','💣','陷阱网络','钉刺、炸弹、陷阱和近战会布置陷阱网络;满层用猫鼬/屠戮收束,束缚并引燃野火。',/钉刺|陷阱|毒蛇|野火|炸弹|猫鼬|猛禽/,/猫鼬|屠戮|猛禽|爆炸/,{ damagePctPerStack:0.052, dotPct:0.17, state:'rooted', spreadDotPct:0.38, resource:8 },{ passive:{ damagePctPerStack:0.011 } }),
  },
  shaman:{
    element:specCore('eleConduitEngine','⛈️','元素导线','闪电、熔岩和震击会铺设元素导线;满层用元素冲击/风暴守护者收束,过载弹射。',/闪电|熔岩|震击|雷霆|元素|风暴/,/元素冲击|风暴守护|风暴|拉登/,{ damagePctPerStack:0.062, splashPct:0.32, state:'stormBrand', resource:10 },{ passive:{ damagePctPerStack:0.014 } }),
    enhancement:specCore('enhWolfEngine','🌀','幽魂双狼','风暴打击、毁灭闪电和幽魂狼会积蓄双狼节奏;满层用裂地/熔岩猛击收束,触发风怒连击。',/风暴打击|毁灭闪电|风怒|幽魂|漩涡|狼|熔岩/,/裂地|熔岩猛击|熔岩|毁灭/,{ damagePctPerStack:0.052, extraHitPct:0.30, buff:'windfury', buffMs:4200, resource:12 },{ passive:{ damagePctPerStack:0.012 } }),
    restoration:specCore('restTideEngine','🌊','潮汐库容','激流、治疗波、治疗链和图腾会积蓄潮汐;满层用治疗链/暴雨图腾收束,治疗全队并制造护盾。',/激流|治疗波|治疗链|链愈|图腾|潮汐|暴雨/,/暴雨|潮汐|治疗链|图腾/,{ healPct:0.15, shieldPct:0.055, companionHealPct:0.10, companionShieldPct:0.06, resource:10 },{ passive:{ damagePctPerStack:0.006, healPctPerStack:0.022 } }),
  },
  paladin:{
    holy:specCore('hpalBeaconEngine','🌟','道标折射','神圣震击、圣光和祝福会折射道标;满层用黎明/圣光收束,双目标治疗并护盾随从。',/神圣震击|圣光|祝福|道标|黎明|治疗/,/黎明|圣光|震击/,{ healPct:0.16, shieldPct:0.05, companionHealPct:0.105, companionShieldPct:0.06, resource:8 },{ passive:{ damagePctPerStack:0.006, healPctPerStack:0.021 } }),
    prot:specCore('ppalConsecrateEngine','🛡️','奉献矩阵','审判、奉献、复仇者之盾和祝福会展开奉献矩阵;满层用盾击/复仇者之盾收束,护盾反击。',/审判|奉献|复仇者|盾|正义|祝福|圣盾/,/正义盾击|盾击|复仇者|盾/,{ damagePctPerStack:0.038, shieldPct:0.085, splashPct:0.20, state:'holyBrand', resource:10 },{ passive:{ damagePctPerStack:0.008, shieldPctPerStack:0.006 } }),
    ret:specCore('retJudgmentEngine','⚜️','裁决天平','审判、十字军和公正之剑会压低裁决天平;满层用圣殿裁决/愤怒之锤收束,必暴清算。',/审判|十字军|公正|灰烬|复仇之怒|圣能/,/圣殿裁决|裁决|最终清算|愤怒之锤/,{ damagePctPerStack:0.07, state:'judged', forceCrit:true, resource:8 },{ passive:{ damagePctPerStack:0.014 } }),
  },
  warlock:{
    affliction:specCore('affRotEngine','💜','腐蚀账本','痛楚、腐蚀、鬼影和痛苦会记录灵魂债务;满层用邪能狂涌/腐蚀之种收束,扩散所有痛苦。',/痛楚|腐蚀|痛苦|鬼影|缠身|吸取/,/邪能狂涌|腐蚀之种|收割|狂涌/,{ damagePctPerStack:0.052, dotPct:0.18, spreadDotPct:0.68, state:'doomBrand', resource:10 },{ passive:{ damagePctPerStack:0.011 } }),
    demonology:specCore('demoLegionEngine','😈','军团队列','恶魔、恐惧猎犬和古尔丹之手会排队穿门;满层用内爆/恶魔之箭收束,召唤恶魔协击。',/恐惧猎犬|古尔丹|恶魔|召唤|曼阿里|内爆/,/内爆|恶魔之箭|吞噬|恶魔/,{ damagePctPerStack:0.05, summon:'demon', extraHitPct:0.24, companionShieldPct:0.055, resource:10 },{ passive:{ damagePctPerStack:0.011 } }),
    destruction:specCore('destRiftEngine','🔥','混乱裂隙','献祭、烧尽、燃烧和火雨会撕开裂隙;满层用混乱之箭/裂隙收束,必暴并点燃周围。',/献祭|烧尽|燃烧|火焰之雨|大灾变|混乱/,/混乱之箭|混乱|灵魂之火|裂隙/,{ damagePctPerStack:0.073, forceCrit:true, dotPct:0.16, splashPct:0.24, state:'fever' },{ passive:{ damagePctPerStack:0.015 } }),
  },
  druid:{
    balance:specCore('balanceOrbitEngine','🌗','日月轨道','月火、阳炎、愤怒和星火会校准日月轨道;满层用星涌/星落收束,落下星界溅射。',/月火|阳炎|日炎|星火|愤怒|星涌|星辰/,/星涌|星辰|新月|星落/,{ damagePctPerStack:0.06, splashPct:0.30, state:'astralBrand', resource:10 },{ passive:{ damagePctPerStack:0.013 } }),
    feral:specCore('feralHuntEngine','🐾','猎杀本能','斜掠、撕碎、割裂和横扫会唤醒猎杀本能;满层用凶猛撕咬/野性狂怒收束,必暴并撕开深裂。',/斜掠|撕碎|横扫|割裂|流血|凶猛/,/凶猛|撕咬|野性狂怒/,{ damagePctPerStack:0.064, forceCrit:true, dotPct:0.16, extraHitPct:0.20, state:'trauma' },{ passive:{ damagePctPerStack:0.013 } }),
    resto:specCore('restGroveEngine','🌿','林地生长','回春、生命绽放、迅捷治愈和宁静会让林地生长;满层用百花/宁静收束,治疗主角和随从并生成自然护盾。',/回春|生命绽放|迅捷|治愈|野性成长|宁静|百花/,/百花|宁静|母树|绽放/,{ healPct:0.17, shieldPct:0.055, companionHealPct:0.11, companionShieldPct:0.06, resource:8 },{ passive:{ damagePctPerStack:0.006, healPctPerStack:0.023 } }),
  },
};

const SPEC_STANCE_SYSTEMS = {
  warrior:{
    arms:{ key:'warriorArmsLaw', icon:'🪓', name:'武器战斗法则', desc:'破甲/压制进入破阵姿态,防御怒吼进入稳步姿态。', assault:{ icon:'🪓', name:'破阵姿态', trigger:/破甲|压制|致死|巨人|斩杀|灭战者/, damagePct:0.10, state:'trauma', extraHitPct:0.10 }, sustain:{ icon:'🛡️', name:'稳步姿态', trigger:/盾|壁垒|回复|怒吼|防御/, shieldPct:0.025, resource:4 } },
    fury:{ key:'warriorFuryLaw', icon:'😡', name:'狂暴战斗法则', desc:'怒系技能进入狂乱姿态,回复/防御进入血性姿态。', assault:{ icon:'😡', name:'狂乱姿态', trigger:/怒|嗜血|浴血|奥丁|乱舞|鲁莽/, damagePct:0.09, extraHitPct:0.12, resource:3 }, sustain:{ icon:'🩸', name:'血性姿态', trigger:/回复|壁垒|盾|治疗/, healPct:0.025, shieldPct:0.018 } },
    prot:{ key:'warriorProtLaw', icon:'🛡️', name:'防战战斗法则', desc:'盾牌技能进入堡垒姿态,雷霆/复仇进入反击姿态。', assault:{ icon:'🔨', name:'反击姿态', trigger:/雷霆|复仇|盾牌猛击|盾击/, damagePct:0.07, extraHitPct:0.10, state:'trauma' }, sustain:{ icon:'🛡️', name:'堡垒姿态', trigger:/盾|壁垒|格挡|盾墙|守护/, shieldPct:0.045, resource:5 } },
  },
  mage:{
    arcane:{ key:'mageArcaneLaw', icon:'🔷', name:'奥术法则', desc:'奥术伤害进入充能姿态,强化技能进入节能姿态。', assault:{ icon:'🔷', name:'充能姿态', trigger:/奥术|飞弹|弹幕|涌动|阿鲁尼斯/, damagePct:0.10, resource:4, state:'unstable' }, sustain:{ icon:'✨', name:'节能姿态', trigger:/强化|护盾|屏障|法力/, costPct:0.90, shieldPct:0.018 } },
    fire:{ key:'mageFireLaw', icon:'🔥', name:'火焰法则', desc:'火焰技能进入燃线姿态,燃烧进入焦灼姿态。', assault:{ icon:'🔥', name:'燃线姿态', trigger:/火|炎|燃|流星|凤凰|烈焰/, damagePct:0.09, dotPct:0.055, state:'fever' }, sustain:{ icon:'☄️', name:'焦灼姿态', trigger:/燃烧|屏障|护盾|冰箱/, forceCritIfDot:true, resource:3 } },
    frost:{ key:'mageFrostLaw', icon:'❄️', name:'冰霜法则', desc:'冰霜技能进入寒流姿态,屏障技能进入冰甲姿态。', assault:{ icon:'❄️', name:'寒流姿态', trigger:/冰|霜|寒|雪|彗星|宝珠/, damagePct:0.08, state:'brittle', shieldPct:0.014 }, sustain:{ icon:'🧊', name:'冰甲姿态', trigger:/屏障|护盾|冰箱|寒冰/, shieldPct:0.035, state:'frozen' } },
  },
  priest:{
    discipline:{ key:'priestDiscLaw', icon:'⚖️', name:'戒律法则', desc:'伤害进入赎罪姿态,护盾治疗进入庇护姿态。', assault:{ icon:'⚖️', name:'赎罪姿态', trigger:/惩罚|惩击|教派|分歧|光明之怒/, damagePct:0.07, shieldPct:0.025, state:'penanceMark' }, sustain:{ icon:'🛡️', name:'庇护姿态', trigger:/真言|盾|障|治疗|恩典/, shieldPct:0.038, companionShieldPct:0.04 } },
    holy:{ key:'priestHolyLaw', icon:'✨', name:'神圣法则', desc:'治疗进入合唱姿态,神圣伤害进入圣火姿态。', assault:{ icon:'🔥', name:'圣火姿态', trigger:/神圣|惩击|新星|圣火/, damagePct:0.06, healPct:0.018, state:'holyBrand' }, sustain:{ icon:'✨', name:'合唱姿态', trigger:/治疗|祷言|恢复|圣言|静/, healPct:0.10, companionHealPct:0.05 } },
    shadow:{ key:'priestShadowLaw', icon:'🌑', name:'暗影法则', desc:'暗影持续伤害进入虚空姿态,爆发进入疯狂姿态。', assault:{ icon:'🌑', name:'虚空姿态', trigger:/暗|虚空|鞭笞|疫病|痛/, damagePct:0.10, dotPct:0.06, state:'voidTorn' }, sustain:{ icon:'🌀', name:'疯狂姿态', trigger:/形态|爆发|心灵|暗影/, resource:5, extraHitPct:0.08 } },
  },
  rogue:{
    assassination:{ key:'rogueAssnLaw', icon:'🐍', name:'刺杀法则', desc:'毒与流血进入毒刃姿态,终结技进入处刑姿态。', assault:{ icon:'🐍', name:'毒刃姿态', trigger:/毒|锁喉|割裂|毁伤|君王/, damagePct:0.09, dotPct:0.06, state:'venomBloom' }, sustain:{ icon:'🗡️', name:'处刑姿态', trigger:/奉毒|切割|终结|闪避/, costPct:0.90, extraHitPct:0.10 } },
    combat:{ key:'rogueCombatLaw', icon:'⚔️', name:'战斗法则', desc:'连击技能进入乱舞姿态,功能技能进入节拍姿态。', assault:{ icon:'⚔️', name:'乱舞姿态', trigger:/邪恶|剑刃|正中|杀戮|冲刺/, damagePct:0.08, splashPct:0.12 }, sustain:{ icon:'🎲', name:'节拍姿态', trigger:/命运|骨骰|冲动|切割|闪避/, resource:5, cooldownPct:0.12 } },
    subtlety:{ key:'rogueSubLaw', icon:'🌑', name:'敏锐法则', desc:'暗影技能进入潜影姿态,破绽技能进入伏击姿态。', assault:{ icon:'🌑', name:'潜影姿态', trigger:/暗|幽|袖剑|背刺|暗袭/, damagePct:0.10, state:'exposed' }, sustain:{ icon:'👤', name:'伏击姿态', trigger:/暗影之舞|闪避|破绽|绞喉/, forceCritIfState:'exposed', resource:4 } },
  },
  hunter:{
    bm:{ key:'hunterBmLaw', icon:'🐾', name:'兽王法则', desc:'宠物技能进入兽群姿态,射击技能进入指挥姿态。', assault:{ icon:'🐾', name:'兽群姿态', trigger:/宠物|野兽|倒刺|杀戮|兽群|召唤/, damagePct:0.07, summon:'beast', extraHitPct:0.08 }, sustain:{ icon:'📣', name:'指挥姿态', trigger:/协同|命令|急速|假死/, companionShieldPct:0.035, resource:5 } },
    marks:{ key:'hunterMarksLaw', icon:'🎯', name:'射击法则', desc:'标记与瞄准进入狙击姿态,急速技能进入装填姿态。', assault:{ icon:'🎯', name:'狙击姿态', trigger:/印记|瞄准|杀戮|奇美拉|精确/, damagePct:0.11, state:'marked' }, sustain:{ icon:'🏹', name:'装填姿态', trigger:/急速|二连|百发|假死/, costPct:0.88, forceCritIfState:'marked' } },
    survival:{ key:'hunterSurvLaw', icon:'💣', name:'生存法则', desc:'陷阱炸弹进入野火姿态,近战技能进入猎手姿态。', assault:{ icon:'💣', name:'野火姿态', trigger:/陷阱|炸弹|野火|爆炸|钉刺/, damagePct:0.08, dotPct:0.06, state:'fever' }, sustain:{ icon:'🦅', name:'猎手姿态', trigger:/猫鼬|屠戮|猛禽|协同/, extraHitPct:0.10, resource:5 } },
  },
  shaman:{
    element:{ key:'shamanEleLaw', icon:'⛈️', name:'元素法则', desc:'闪电熔岩进入过载姿态,震击进入调和姿态。', assault:{ icon:'⛈️', name:'过载姿态', trigger:/闪电|熔岩|元素|风暴|拉登/, damagePct:0.10, splashPct:0.12, state:'stormBrand' }, sustain:{ icon:'🌎', name:'调和姿态', trigger:/震击|大地|护盾|治疗/, shieldPct:0.02, resource:5 } },
    enhancement:{ key:'shamanEnhLaw', icon:'🌀', name:'增强法则', desc:'近战风暴进入风怒姿态,狼与护盾进入灵魂姿态。', assault:{ icon:'🌀', name:'风怒姿态', trigger:/风暴打击|毁灭|裂地|熔岩猛击|风怒/, damagePct:0.08, extraHitPct:0.12 }, sustain:{ icon:'🐺', name:'灵魂姿态', trigger:/幽魂|狼|嗜血|护盾|治疗/, resource:5, shieldPct:0.018 } },
    restoration:{ key:'shamanRestLaw', icon:'🌊', name:'恢复法则', desc:'治疗进入潮汐姿态,元素技能进入浪涌姿态。', assault:{ icon:'⚡', name:'浪涌姿态', trigger:/闪电|熔岩|震击|风暴/, damagePct:0.06, healPct:0.02 }, sustain:{ icon:'🌊', name:'潮汐姿态', trigger:/治疗|激流|链|暴雨|图腾|潮汐/, healPct:0.11, companionHealPct:0.05, shieldPct:0.018 } },
  },
  paladin:{
    holy:{ key:'paladinHolyLaw', icon:'🌟', name:'神圣骑士法则', desc:'治疗进入道标姿态,震击进入圣击姿态。', assault:{ icon:'🌟', name:'圣击姿态', trigger:/震击|审判|神圣|圣光/, damagePct:0.06, healPct:0.025, state:'holyBrand' }, sustain:{ icon:'✨', name:'道标姿态', trigger:/圣光|道标|黎明|祝福|治疗/, healPct:0.10, companionHealPct:0.055 } },
    prot:{ key:'paladinProtLaw', icon:'🛡️', name:'防骑法则', desc:'盾与审判进入奉献姿态,祝福进入虔诚姿态。', assault:{ icon:'🛡️', name:'奉献姿态', trigger:/审判|复仇者|盾|正义|奉献/, damagePct:0.07, state:'holyBrand', splashPct:0.10 }, sustain:{ icon:'🌟', name:'虔诚姿态', trigger:/祝福|守护|圣盾|炽热/, shieldPct:0.045, healPct:0.02 } },
    ret:{ key:'paladinRetLaw', icon:'⚜️', name:'惩戒法则', desc:'圣能生成进入审判姿态,裁决进入清算姿态。', assault:{ icon:'⚜️', name:'清算姿态', trigger:/裁决|最终|灰烬|愤怒之锤/, damagePct:0.11, state:'judged' }, sustain:{ icon:'⚖️', name:'审判姿态', trigger:/审判|十字军|公正|复仇之怒/, resource:5, forceCritIfState:'judged' } },
  },
  warlock:{
    affliction:{ key:'warlockAffLaw', icon:'💜', name:'痛苦法则', desc:'DOT 进入折磨姿态,收割技能进入灵魂姿态。', assault:{ icon:'💜', name:'折磨姿态', trigger:/痛楚|腐蚀|痛苦|鬼影|缠身/, damagePct:0.09, dotPct:0.07, state:'doomBrand' }, sustain:{ icon:'☠️', name:'灵魂姿态', trigger:/收割|狂涌|腐蚀之种|生命通道/, resource:6, shieldPct:0.015 } },
    demonology:{ key:'warlockDemoLaw', icon:'😈', name:'恶魔法则', desc:'召唤进入统御姿态,内爆进入吞噬姿态。', assault:{ icon:'😈', name:'吞噬姿态', trigger:/内爆|恶魔之箭|吞噬|古尔丹/, damagePct:0.08, summon:'demon', extraHitPct:0.08 }, sustain:{ icon:'👿', name:'统御姿态', trigger:/召唤|恶魔|恐惧猎犬|魔壳/, companionShieldPct:0.035, resource:5 } },
    destruction:{ key:'warlockDestLaw', icon:'🔥', name:'毁灭法则', desc:'火焰技能进入余烬姿态,混乱技能进入裂隙姿态。', assault:{ icon:'🔥', name:'裂隙姿态', trigger:/混乱|裂隙|大灾变|灵魂之火/, damagePct:0.12, splashPct:0.12, state:'fever' }, sustain:{ icon:'🔥', name:'余烬姿态', trigger:/献祭|烧尽|燃烧|火焰之雨/, dotPct:0.06, resource:5 } },
  },
  druid:{
    balance:{ key:'druidBalLaw', icon:'🌗', name:'平衡法则', desc:'日月法术进入蚀变姿态,星界法术进入星穹姿态。', assault:{ icon:'🌗', name:'星穹姿态', trigger:/星涌|星辰|新月|星落|星火/, damagePct:0.10, splashPct:0.10, state:'astralBrand' }, sustain:{ icon:'🌙', name:'蚀变姿态', trigger:/月火|阳炎|愤怒|日炎/, dotPct:0.055, resource:5 } },
    feral:{ key:'druidFeralLaw', icon:'🐾', name:'野性法则', desc:'流血技能进入血爪姿态,撕咬技能进入猎杀姿态。', assault:{ icon:'🐾', name:'猎杀姿态', trigger:/凶猛|撕咬|撕碎|野性狂怒/, damagePct:0.10, extraHitPct:0.10 }, sustain:{ icon:'🩸', name:'血爪姿态', trigger:/斜掠|割裂|流血|横扫/, dotPct:0.06, resource:5 } },
    resto:{ key:'druidRestLaw', icon:'🌿', name:'恢复法则', desc:'治疗进入林地姿态,自然攻击进入荆棘姿态。', assault:{ icon:'🌿', name:'荆棘姿态', trigger:/月火|愤怒|根须|荆棘/, damagePct:0.05, shieldPct:0.018, state:'lifeSeed' }, sustain:{ icon:'🌿', name:'林地姿态', trigger:/回春|绽放|迅捷|百花|宁静|母树/, healPct:0.12, companionHealPct:0.055, shieldPct:0.018 } },
  },
};

function currentSpecCombatRule() {
  if (typeof state === 'undefined' || !state) return null;
  return SPEC_COMBAT_RULES[state.cls]?.[state.specialization] || null;
}

function currentSpecCombatMeter() {
  if (typeof state === 'undefined' || !state) return null;
  const cfg = SPEC_COMBAT_METERS[state.cls]?.[state.specialization];
  if (!cfg) return null;
  const aura = state.skillRuntime?.auras?.[cfg.key];
  const now = Date.now();
  const stacks = aura && (!aura.expire || aura.expire > now) ? (aura.stacks || 0) : 0;
  const max = aura?.max || cfg.max || 5;
  return Object.assign({}, cfg, { stacks, max, pct: max ? Math.min(100, Math.round(stacks / max * 100)) : 0 });
}

function currentSpecTacticalWindow() {
  if (typeof state === 'undefined' || !state) return null;
  const def = SPEC_TACTICAL_WINDOWS[state.cls]?.[state.specialization];
  const meter = SPEC_COMBAT_METERS[state.cls]?.[state.specialization];
  if (!def || !meter) return null;
  return Object.assign({ meterKey:meter.key, meterName:meter.name, meterMax:meter.max || 5 }, def);
}

function currentSpecSkillChain() {
  if (typeof state === 'undefined' || !state) return null;
  return SPEC_SKILL_CHAINS[state.cls]?.[state.specialization] || null;
}

function currentSpecReactionSystem() {
  if (typeof state === 'undefined' || !state) return null;
  return SPEC_REACTION_SYSTEMS[state.cls]?.[state.specialization] || null;
}

function currentSpecProcSystem() {
  if (typeof state === 'undefined' || !state) return null;
  return SPEC_PROC_SYSTEMS[state.cls]?.[state.specialization] || null;
}

function currentSpecCoreSystem() {
  if (typeof state === 'undefined' || !state) return null;
  return SPEC_CORE_SYSTEMS[state.cls]?.[state.specialization] || null;
}

function currentSpecStanceSystem() {
  if (typeof state === 'undefined' || !state) return null;
  return SPEC_STANCE_SYSTEMS[state.cls]?.[state.specialization] || null;
}

if (typeof window !== 'undefined') {
  window.SPEC_COMBAT_RULES = SPEC_COMBAT_RULES;
  window.SPEC_COMBAT_METERS = SPEC_COMBAT_METERS;
  window.SPEC_TACTICAL_WINDOWS = SPEC_TACTICAL_WINDOWS;
  window.SPEC_SKILL_CHAINS = SPEC_SKILL_CHAINS;
  window.SPEC_REACTION_SYSTEMS = SPEC_REACTION_SYSTEMS;
  window.SPEC_PROC_SYSTEMS = SPEC_PROC_SYSTEMS;
  window.SPEC_CORE_SYSTEMS = SPEC_CORE_SYSTEMS;
  window.SPEC_STANCE_SYSTEMS = SPEC_STANCE_SYSTEMS;
  window.currentSpecCombatRule = currentSpecCombatRule;
  window.currentSpecCombatMeter = currentSpecCombatMeter;
  window.currentSpecTacticalWindow = currentSpecTacticalWindow;
  window.currentSpecSkillChain = currentSpecSkillChain;
  window.currentSpecReactionSystem = currentSpecReactionSystem;
  window.currentSpecProcSystem = currentSpecProcSystem;
  window.currentSpecCoreSystem = currentSpecCoreSystem;
  window.currentSpecStanceSystem = currentSpecStanceSystem;
}

const SPEC_STARTER_UNLOCKS = {
  mage:{ fireball:1, frostbolt:1, m_arcaneBlast:1 },
  priest:{ shield:1, heal:1, shadowWord:1 },
  rogue:{ poison:1, backstab:1 },
  hunter:{ summonPet:1, aimed:1, serpentSting:1 },
  shaman:{ healingWave:1, windfury:1, s_stormstrike:1 },
  paladin:{ holyLight:1, crusader:1, divineShield:12 },
  warlock:{ corruption:1, drainLife:1, incinerate:1 },
  druid:{ moonfire:1, bite:1, barkskin:12, rejuvenation:1 },
};

(function applySpecStarterUnlocks() {
  if (typeof CLASSES === 'undefined') return;
  for (const [clsKey, skills] of Object.entries(SPEC_STARTER_UNLOCKS)) {
    const cls = CLASSES[clsKey];
    if (!cls || !cls.skills) continue;
    for (const [skillKey, lvl] of Object.entries(skills)) {
      if (cls.skills[skillKey]) cls.skills[skillKey].unlockLvl = lvl;
    }
  }
})();

function specSkillProfile(clsKey, specKey) {
  const clsProfile = SPEC_SKILL_LOADOUTS[clsKey];
  if (!clsProfile) return null;
  return (specKey && clsProfile[specKey]) || null;
}

function specSkillAllowedSet(clsKey, specKey) {
  const clsProfile = SPEC_SKILL_LOADOUTS[clsKey];
  if (!clsProfile) return null;
  const keys = new Set(clsProfile.core || []);
  const profile = specSkillProfile(clsKey, specKey);
  const pool = profile ? (profile.skills || []) : (clsProfile.novice || []);
  for (const key of pool) keys.add(key);
  return keys;
}

function isSkillAllowedForSpec(clsKey, specKey, skillKey) {
  const set = specSkillAllowedSet(clsKey, specKey);
  return !set || set.has(skillKey);
}

function isSkillAllowedForCurrentSpec(skillKey) {
  if (typeof state === 'undefined' || !state) return true;
  return isSkillAllowedForSpec(state.cls, state.specialization, skillKey);
}

function classSkillEntriesForCurrentSpec(cls) {
  const entries = Object.entries((cls && cls.skills) || {});
  const filtered = (typeof state === 'undefined') ? entries : entries.filter(([key]) => isSkillAllowedForCurrentSpec(key));
  return filtered.sort((a, b) => {
    const sa = a[1] || {}, sb = b[1] || {};
    const la = Number.isFinite(sa.unlockLvl) ? sa.unlockLvl : 9999;
    const lb = Number.isFinite(sb.unlockLvl) ? sb.unlockLvl : 9999;
    if (la !== lb) return la - lb;
    return entries.findIndex(([key]) => key === a[0]) - entries.findIndex(([key]) => key === b[0]);
  });
}

function pruneSelectedSkillsForCurrentSpec() {
  if (typeof state === 'undefined' || !state || !Array.isArray(state.selectedSkills)) return 0;
  const before = state.selectedSkills.length;
  state.selectedSkills = state.selectedSkills.filter(key => state.unlockedSkills?.[key] && isSkillAllowedForCurrentSpec(key));
  return before - state.selectedSkills.length;
}

function syncAllowedSkillUnlocks(opts) {
  if (typeof state === 'undefined' || !state || typeof getCls !== 'function') return 0;
  const cls = getCls();
  if (!cls || !cls.skills) return 0;
  let learned = 0;
  for (const [key, sk] of classSkillEntriesForCurrentSpec(cls)) {
    if (sk.unlockLvl && state.hero.lvl >= sk.unlockLvl && !state.unlockedSkills[key]) {
      state.unlockedSkills[key] = true;
      learned++;
      if (opts?.logNew && typeof log === 'function') log('✨ 学会了 [' + sk.name + ']', 'good');
    }
  }
  pruneSelectedSkillsForCurrentSpec();
  if (learned && typeof markDirty === 'function') markDirty('skills');
  return learned;
}

function currentSpecSkillProfile() {
  if (typeof state === 'undefined' || !state) return null;
  return specSkillProfile(state.cls, state.specialization);
}

function skillPctText(pct) {
  return Math.round((pct || 0) * 100) + '%';
}

function skillSecText(ms) {
  return ((ms || 0) / 1000).toFixed(((ms || 0) % 1000) ? 1 : 0).replace(/\.0$/, '') + '秒';
}

function skillAuraName(key) {
  return (typeof SKILL_AURA_LIBRARY === 'object' && SKILL_AURA_LIBRARY[key] && SKILL_AURA_LIBRARY[key].name) || key;
}

function skillStateName(key) {
  if (key && typeof key === 'object' && key.key) key = key.key;
  if (key === 'dot') return '带持续伤害';
  return (typeof MONSTER_STATE_META === 'object' && MONSTER_STATE_META[key] && MONSTER_STATE_META[key].name) || key;
}

const BUFF_NAME_OVERRIDES = {
  battleShout: '战斗怒吼',
  windfury: '风怒',
  earthShield: '大地之盾',
  kings: '王者祝福',
  bestial: '野兽之怒',
  rapidFire: '急速射击',
  shield: '真言术盾',
  berserk: '狂暴',
  shadowstep: '暗影步',
  bloodlust: '嗜血',
  w_shieldBlock: '盾牌格挡',
  pa_devotion: '虔诚祝福',
  p_grace: '恩典',
  sh_ancestral: '先祖护持',
  d_lifebloom: '生命绽放',
  h_beastBond: '兽群羁绊',
};

function skillBuffName(key, clsKey) {
  if (!key) return '';
  if (BUFF_NAME_OVERRIDES[key]) return BUFF_NAME_OVERRIDES[key];
  const cls = clsKey && typeof CLASSES !== 'undefined' ? CLASSES[clsKey] : null;
  if (cls && cls.skills) {
    for (const sk of Object.values(cls.skills)) {
      if (sk && sk.type === 'buff' && sk.buff === key) return sk.name;
    }
  }
  for (const cls of Object.values(typeof CLASSES === 'undefined' ? {} : CLASSES)) {
    for (const sk of Object.values((cls && cls.skills) || {})) {
      if (sk && sk.type === 'buff' && sk.buff === key) return sk.name;
    }
  }
  return key;
}

function buildBuffEffectParts(buffKey) {
  const fx = buffKey && BUFF_FX[buffKey];
  if (!fx) return [];
  const parts = [];
  if (fx.atkMul) parts.push(`攻击+${Math.round((fx.atkMul - 1) * 100)}%`);
  if (fx.defMul) parts.push(`防御+${Math.round((fx.defMul - 1) * 100)}%`);
  if (fx.spdMul) parts.push(`攻速+${Math.round((fx.spdMul - 1) * 100)}%`);
  if (fx.critAdd) parts.push(`暴击+${fx.critAdd}`);
  if (fx.critdAdd) parts.push(`暴伤+${fx.critdAdd}%`);
  if (fx.leechAdd) parts.push(`吸血+${fx.leechAdd}`);
  if (fx.dr) parts.push(`减伤${Math.round(fx.dr * 100)}%`);
  return parts;
}

function buildSkillDetailParts(clsKey, sk, baseDesc) {
  const fx = sk && sk.fx;
  const parts = [];

  if (sk && sk.type === 'buff' && sk.buff && !/%/.test(baseDesc || '')) {
    parts.push(...buildBuffEffectParts(sk.buff));
  }

  if (!fx) return parts;

  if (fx.applyTargetState) {
    const states = Array.isArray(fx.applyTargetState) ? fx.applyTargetState : [fx.applyTargetState];
    for (const state of states) {
      const key = state && typeof state === 'object' ? state.key : state;
      const dur = state && typeof state === 'object' ? (state.durMs || state.durationMs || fx.stateDurationMs || 10000) : (fx.stateDurationMs || 10000);
      if (key) parts.push(`施加${skillStateName(key)}${skillSecText(dur)}`);
    }
  }
  if (fx.grantAura) parts.push(`叠加${skillAuraName(fx.grantAura.key)}${fx.grantAura.add || 1}层(最多${fx.grantAura.max || 99}层,持续${skillSecText(fx.grantAura.duration || 0)})`);
  if (fx.consumeAura) {
    let how = '消耗';
    if (fx.consumeAura.all) how += `全部${skillAuraName(fx.consumeAura.key)}`;
    else how += `${skillAuraName(fx.consumeAura.key)}${Math.abs(fx.consumeAura.add || 1)}层`;
    parts.push(how);
  }
  if (fx.bonusPerAuraStack) parts.push(`${skillAuraName(fx.bonusPerAuraStack.key)}每层额外+${skillPctText(fx.bonusPerAuraStack.pct)}伤害`);
  if (fx.bonusStates) {
    for (const [stateKey, pct] of Object.entries(fx.bonusStates)) {
      parts.push(`对${skillStateName(stateKey)}目标额外+${skillPctText(pct)}伤害`);
    }
  }
  if (fx.bonusPerDot) parts.push(`目标每有1种持续伤害额外+${skillPctText(fx.bonusPerDot)}伤害`);
  if (fx.bonusVsLowHp) parts.push(`目标低于${skillPctText(fx.executeThreshold || 0.35)}生命时额外+${skillPctText(fx.bonusVsLowHp)}伤害`);
  if (fx.bonusIfBuff) {
    if (fx.bonusIfBuff.key) parts.push(`${skillBuffName(fx.bonusIfBuff.key, clsKey)}期间额外+${skillPctText(fx.bonusIfBuff.pct)}伤害`);
    else for (const [buffKey, pct] of Object.entries(fx.bonusIfBuff)) parts.push(`${skillBuffName(buffKey, clsKey)}期间额外+${skillPctText(pct)}伤害`);
  }
  if (fx.forceCritIfBuff) parts.push(`${skillBuffName(fx.forceCritIfBuff, clsKey)}期间必定暴击`);
  if (fx.consumeDots) parts.push('消耗目标身上的持续伤害');
  if (fx.consumeState) {
    const states = Array.isArray(fx.consumeState) ? fx.consumeState : [fx.consumeState];
    parts.push(`消耗${states.map(skillStateName).join('、')}`);
  }
  if (fx.applyDotKey) parts.push(`附加${fx.dotName || '持续伤害'}(${skillPctText(fx.dotPct)}攻击/秒,持续${skillSecText(fx.dotMs || 5000)})`);
  if (fx.healFromDamagePct) parts.push(`回复造成伤害的${skillPctText(fx.healFromDamagePct)}生命`);
  if (fx.healFromDamagePctIfBuff) parts.push(`${skillBuffName(fx.healFromDamagePctIfBuff.key, clsKey)}期间额外回复${skillPctText(fx.healFromDamagePctIfBuff.pct)}伤害量生命`);
  if (fx.extraHealPct && fx.healBonusIfSelfHpBelow) parts.push(`生命低于${skillPctText(fx.healBonusIfSelfHpBelow)}时额外恢复${skillPctText(fx.extraHealPct)}最大生命`);
  if (fx.shieldFromOverhealPct) parts.push(`过量治疗的${skillPctText(fx.shieldFromOverhealPct)}转为护盾`);
  if (fx.shieldFromHealPct) parts.push(`额外获得相当于治疗量${skillPctText(fx.shieldFromHealPct)}的护盾`);
  if (fx.shieldFromDamagePct) parts.push(`额外获得相当于伤害${skillPctText(fx.shieldFromDamagePct)}的护盾`);
  if (fx.shieldBonusIfBuff) parts.push(`${skillBuffName(fx.shieldBonusIfBuff.key, clsKey)}期间额外获得相当于治疗量${skillPctText(fx.shieldBonusIfBuff.pct)}的护盾`);
  if (fx.extraHitPct) parts.push(`追加1次${skillPctText(fx.extraHitPct)}伤害追击`);
  if (fx.extraHitPctIfBuff) parts.push(`${skillBuffName(fx.extraHitPctIfBuff.key, clsKey)}期间追加1次${skillPctText(fx.extraHitPctIfBuff.pct)}伤害追击`);
  if (fx.splashPct) parts.push(`对附近敌人造成${skillPctText(fx.splashPct)}溅射伤害`);
  if (fx.resourceGain) parts.push(`命中获得${fx.resourceGain}点资源`);
  if (fx.resourceGainOnKill) parts.push(`击杀返还${fx.resourceGainOnKill}点资源`);
  if (fx.companionHealPct) parts.push(`同时治疗随从${skillPctText(fx.companionHealPct)}随从最大生命`);
  if (fx.companionShieldPct) parts.push(`同时给随从${skillPctText(fx.companionShieldPct)}最大生命护盾`);
  if (fx.companionBuff) parts.push(`随从获得${skillBuffName(fx.companionBuff, clsKey)}${skillSecText(fx.companionBuffMs || 8000)}`);
  if (fx.extraHitPctIfSummon) parts.push(`有召唤物/宠物时追加${skillPctText(fx.extraHitPctIfSummon)}伤害追击`);
  if (fx.classMechanic) parts.push(fx.classMechanic);

  return parts;
}

function syncSkillDescriptions() {
  if (typeof CLASSES === 'undefined') return;
  for (const [clsKey, cls] of Object.entries(CLASSES)) {
    if (!cls || !cls.skills) continue;
    for (const sk of Object.values(cls.skills)) {
      if (!sk) continue;
      const base = sk._rawDesc || sk.desc || '';
      sk._rawDesc = base;
      const parts = buildSkillDetailParts(clsKey, sk, base);
      sk._baseDesc = base;
      sk._detailDesc = parts.join('；');
      sk.desc = parts.length ? `${base} · ${parts.join('；')}` : base;
    }
  }
}

syncSkillDescriptions();

const AUTO_DEFENSIVE_BUFFS = new Set(['shield','divine','bark','iceBarrier','earthShield','evasion','s_mitigate','s_barrier','sacredShield','w_shieldBlock','pa_devotion','p_grace','sh_ancestral','d_lifebloom']);

const SKILL_AI_OVERRIDES = {
  warrior: {
    battleShout:{ priorityTag:'buff', useIfBuffMissing:'battleShout', preferOnBoss:true, avoidIfTargetHpBelow:0.25 },
    sunderArmor:{ priorityTag:'setup', applyTargetState:'sunder', useIfTargetMissing:'sunder', avoidIfTargetHpBelow:0.2 },
    mortalStrike:{ priorityTag:'spender', useIfTargetHas:'sunder', preferOnBoss:true },
    execute:{ priorityTag:'execute', useIfTargetHpBelow:0.35, preferOnBoss:true },
    shieldWall:{ priorityTag:'defBuff', useIfSelfHpBelow:0.42 },
    thunderClap:{ priorityTag:'aoe', minEnemies:3 },
    sweepingStrikes:{ priorityTag:'aoe', minEnemies:2, preferOnBoss:true },
    bladestorm:{ priorityTag:'aoe', minEnemies:3, preferOnBoss:true },
    w_recklessness:{ priorityTag:'buff', useIfBuffMissing:'w_reckless', preferOnBoss:true, avoidIfTargetHpBelow:0.25 },
    w_ironwall:{ priorityTag:'defBuff', useIfSelfHpBelow:0.45 },
    w_colossus:{ priorityTag:'spender', applyTargetState:null, useIfTargetMissing:null, useIfChargeKey:'w_sunder', useIfChargeAtLeast:3, preferOnBoss:true },
    w_rampage:{ priorityTag:'spender', useIfChargeKey:'w_rage', useIfChargeAtLeast:3, preferOnBoss:true },
  },
  mage: {
    fireball:{ priorityTag:'dot', applyTargetState:'dot', useIfTargetDotKeyMissing:'skill:fireball', avoidIfTargetHpBelow:0.18 },
    pyroblast:{ priorityTag:'spender', useIfDotCountAtLeast:1, preferOnBoss:true },
    frostbolt:{ priorityTag:'setup', applyTargetState:'slow', useIfTargetMissing:'slow', avoidIfTargetHpBelow:0.18 },
    arcaneExplosion:{ priorityTag:'aoe', minEnemies:3 },
    blizzard:{ priorityTag:'aoe', minEnemies:3, preferOnBoss:true },
    iceBarrier:{ priorityTag:'defBuff', useIfSelfHpBelow:0.48 },
    arcane:{ priorityTag:'builder' },
    m_combustion:{ priorityTag:'buff', useIfBuffMissing:'m_combust', preferOnBoss:true, avoidIfTargetHpBelow:0.25 },
    m_iceBlock:{ priorityTag:'defBuff', useIfSelfHpBelow:0.42 },
    m_meteor:{ priorityTag:'spender', applyTargetState:null, useIfTargetMissing:null, useIfDotCountAtLeast:1, preferOnBoss:true },
    m_arcaneBarrage:{ priorityTag:'spender', useIfChargeKey:'arcaneCharge', useIfChargeAtLeast:2, preferOnBoss:true },
    m_iceLance:{ priorityTag:'spender', applyTargetState:null, useIfTargetMissing:null, useIfChargeKey:'m_frost', useIfChargeAtLeast:2, preferOnBoss:true },
  },
  priest: {
    shield:{ priorityTag:'defBuff', useIfSelfHpBelow:0.78, useIfBuffMissing:'shield' },
    heal:{ priorityTag:'heal', useIfSelfHpBelow:0.68 },
    holyNova:{ priorityTag:'aoe', minEnemies:3, preferOnBoss:true },
    shadowWord:{ priorityTag:'dot', applyTargetState:'dot', useIfTargetDotKeyMissing:'skill:shadowWord', avoidIfTargetHpBelow:0.18 },
    mindBlast:{ priorityTag:'spender', useIfDotCountAtLeast:1, preferOnBoss:true },
    p_pwShield:{ priorityTag:'defBuff', useIfSelfHpBelow:0.48 },
    p_mindBlast:{ priorityTag:'spender', useIfDotCountAtLeast:1, preferOnBoss:true },
    p_voidEruption:{ priorityTag:'spender', useIfChargeKey:'p_insanity', useIfChargeAtLeast:3, preferOnBoss:true },
    p_penance:{ priorityTag:'strike', preferOnBoss:true },
  },
  rogue: {
    sinister:{ priorityTag:'builder' },
    backstab:{ priorityTag:'strike', useIfTargetHas:'slow', preferOnBoss:true },
    poison:{ priorityTag:'dot', applyTargetState:'dot', useIfTargetMissing:'dot', avoidIfTargetHpBelow:0.18 },
    kidneyShot:{ priorityTag:'setup', applyTargetState:'slow', useIfTargetMissing:'slow', avoidIfTargetHpBelow:0.2 },
    evasion:{ priorityTag:'defBuff', useIfSelfHpBelow:0.45 },
    killingSpree:{ priorityTag:'spender', useIfTargetHas:'dot', preferOnBoss:true },
    shadow:{ priorityTag:'buff', useIfBuffMissing:'shadowstep', preferOnBoss:true, avoidIfTargetHpBelow:0.22 },
    r_evasion:{ priorityTag:'defBuff', useIfSelfHpBelow:0.45 },
    r_bladeflurry:{ priorityTag:'buff', useIfBuffMissing:'r_dance', preferOnBoss:true, avoidIfTargetHpBelow:0.25 },
    r_adrenaline:{ priorityTag:'buff', useIfBuffMissing:'s_haste', preferOnBoss:true, avoidIfTargetHpBelow:0.25 },
    r_eviscerate:{ priorityTag:'spender', applyTargetState:null, useIfTargetMissing:null, useIfChargeKey:'r_combo', useIfChargeAtLeast:3, preferOnBoss:true },
    r_envenom:{ priorityTag:'spender', applyTargetState:null, useIfTargetMissing:null, useIfChargeKey:'r_venom', useIfChargeAtLeast:3, preferOnBoss:true },
    r_shadowstrike:{ priorityTag:'spender', useIfChargeKey:'r_combo', useIfChargeAtLeast:3, preferOnBoss:true },
  },
  hunter: {
    arcaneShot:{ priorityTag:'builder' },
    serpentSting:{ priorityTag:'dot', applyTargetState:'dot', useIfTargetDotKeyMissing:'skill:serpentSting', avoidIfTargetHpBelow:0.18 },
    aimed:{ priorityTag:'spender', useIfDotCountAtLeast:1, preferOnBoss:true },
    killShot:{ priorityTag:'execute', useIfTargetHpBelow:0.35, preferOnBoss:true },
    multi:{ priorityTag:'aoe', minEnemies:3 },
    rapidFire:{ priorityTag:'buff', useIfBuffMissing:'rapidFire', preferOnBoss:true, avoidIfTargetHpBelow:0.25 },
    bestialWrath:{ priorityTag:'buff', useIfBuffMissing:'bestial', preferOnBoss:true, avoidIfTargetHpBelow:0.25 },
    h_killCommand:{ priorityTag:'buff', useIfBuffMissing:'h_burst', preferOnBoss:true, avoidIfTargetHpBelow:0.25 },
    h_feignDeath:{ priorityTag:'defBuff', useIfSelfHpBelow:0.45 },
    h_rapidFire:{ priorityTag:'buff', useIfBuffMissing:'s_haste', preferOnBoss:true, avoidIfTargetHpBelow:0.25 },
    h_explosiveShot:{ priorityTag:'spender', applyTargetState:null, useIfTargetMissing:null, useIfTargetDotKeyPresent:'skill:serpentSting', preferOnBoss:true },
    h_coordinatedAssault:{ priorityTag:'spender', useIfChargeKey:'h_frenzy', useIfChargeAtLeast:3, preferOnBoss:true },
    h_chimaera:{ priorityTag:'spender', useIfDotCountAtLeast:1, preferOnBoss:true },
  },
  shaman: {
    earthShield:{ priorityTag:'defBuff', useIfSelfHpBelow:0.72, useIfBuffMissing:'earthShield' },
    healingWave:{ priorityTag:'heal', useIfSelfHpBelow:0.68 },
    flameShock:{ priorityTag:'dot', applyTargetState:'dot', useIfTargetDotKeyMissing:'skill:flameShock', avoidIfTargetHpBelow:0.18 },
    chainLightning:{ priorityTag:'aoe', minEnemies:3 },
    bloodlust:{ priorityTag:'buff', useIfBuffMissing:'bloodlust', preferOnBoss:true, avoidIfTargetHpBelow:0.25 },
    windfury:{ priorityTag:'buff', useIfBuffMissing:'windfury', preferOnBoss:true, avoidIfTargetHpBelow:0.25 },
    s_bloodlust:{ priorityTag:'buff', useIfBuffMissing:'sh_frenzy', preferOnBoss:true, avoidIfTargetHpBelow:0.25 },
    s_earthShield:{ priorityTag:'defBuff', useIfSelfHpBelow:0.48 },
    s_healingTide:{ priorityTag:'heal', useIfSelfHpBelow:0.62, preferOnBoss:true },
    lightning:{ priorityTag:'builder' },
    s_stormstrike:{ priorityTag:'spender', useIfDotCountAtLeast:1, preferOnBoss:true },
    sh_earthShock:{ priorityTag:'spender', useIfChargeKey:'stormCharge', useIfChargeAtLeast:2, preferOnBoss:true },
    sh_lavaLash:{ priorityTag:'spender', useIfChargeKey:'sh_maelstrom', useIfChargeAtLeast:3, preferOnBoss:true },
  },
  paladin: {
    judgement:{ priorityTag:'setup', applyTargetState:[{ key:'judged', durMs:12000 }, { key:'decay', durMs:8000 }], useIfTargetMissing:'decay', avoidIfTargetHpBelow:0.2, preferOnBoss:true },
    holyLight:{ priorityTag:'heal', useIfSelfHpBelow:0.68 },
    divineShield:{ priorityTag:'defBuff', useIfSelfHpBelow:0.42 },
    crusader:{ priorityTag:'spender', useIfTargetHas:'judged', preferOnBoss:true },
    consecration:{ priorityTag:'aoe', minEnemies:3 },
    blessingKings:{ priorityTag:'buff', useIfBuffMissing:'kings', preferOnBoss:true, avoidIfTargetHpBelow:0.25 },
    avengingWrath:{ priorityTag:'buff', useIfBuffMissing:'bestial', preferOnBoss:true, avoidIfTargetHpBelow:0.25 },
    pa_avengingWrath:{ priorityTag:'buff', useIfBuffMissing:'pa_wrath', preferOnBoss:true, avoidIfTargetHpBelow:0.25 },
    pa_guardian:{ priorityTag:'defBuff', useIfSelfHpBelow:0.45 },
    pa_flashLight:{ priorityTag:'heal', useIfSelfHpBelow:0.8, preferOnBoss:true },
    pa_holyWrath:{ priorityTag:'aoe', minEnemies:3, preferOnBoss:true },
    pa_templarVerdict:{ priorityTag:'spender', applyTargetState:null, useIfTargetMissing:null, useIfChargeKey:'pa_holyPower', useIfChargeAtLeast:3, preferOnBoss:true },
    pa_hammerWrath:{ priorityTag:'execute', useIfTargetHpBelow:0.35, preferOnBoss:true },
  },
  warlock: {
    shadowBolt:{ priorityTag:'builder' },
    corruption:{ priorityTag:'dot', applyTargetState:'dot', useIfTargetDotKeyMissing:'skill:corruption', avoidIfTargetHpBelow:0.18 },
    immolate:{ priorityTag:'dot', applyTargetState:'dot', useIfTargetDotKeyMissing:'skill:immolate', avoidIfTargetHpBelow:0.18, preferOnBoss:true },
    chaosBolt:{ priorityTag:'spender', useIfDotCountAtLeast:2, preferOnBoss:true },
    drainLife:{ priorityTag:'heal', useIfSelfHpBelow:0.72, preferOnBoss:true },
    incinerate:{ priorityTag:'strike', useIfDotCountAtLeast:1, preferOnBoss:true },
    fear:{ priorityTag:'strike', avoidIfTargetHpBelow:0.2 },
    wl_demonSkin:{ priorityTag:'defBuff', useIfSelfHpBelow:0.48 },
    wl_darkSoul:{ priorityTag:'buff', useIfBuffMissing:'wl_dark', preferOnBoss:true, avoidIfTargetHpBelow:0.25 },
    wl_lifeTap:{ priorityTag:'buff', useIfBuffMissing:'s_lifesurge', preferOnBoss:true, avoidIfTargetHpBelow:0.25 },
    wl_chaosBolt:{ priorityTag:'spender', applyTargetState:null, useIfTargetMissing:null, useIfDotCountAtLeast:2, preferOnBoss:true },
    unstableAffliction:{ priorityTag:'dot', applyTargetState:'dot', useIfTargetDotKeyMissing:'skill:unstableAffliction', avoidIfTargetHpBelow:0.18 },
    wl_maleficRapture:{ priorityTag:'spender', applyTargetState:null, useIfTargetMissing:null, useIfChargeKey:'wl_shard', useIfChargeAtLeast:3, preferOnBoss:true },
    wl_demonbolt:{ priorityTag:'strike', preferOnBoss:true },
  },
  druid: {
    rejuvenation:{ priorityTag:'heal', useIfSelfHpBelow:0.78 },
    barkskin:{ priorityTag:'defBuff', useIfSelfHpBelow:0.45 },
    moonfire:{ priorityTag:'dot', applyTargetState:'dot', useIfTargetDotKeyMissing:'skill:moonfire', avoidIfTargetHpBelow:0.18 },
    wrath:{ priorityTag:'spender', useIfDotCountAtLeast:1, preferOnBoss:true },
    bite:{ priorityTag:'execute', useIfTargetHpBelow:0.35, preferOnBoss:true },
    swipe:{ priorityTag:'aoe', minEnemies:3 },
    berserk:{ priorityTag:'buff', useIfBuffMissing:'berserk', preferOnBoss:true, avoidIfTargetHpBelow:0.25 },
    d_berserk:{ priorityTag:'buff', useIfBuffMissing:'d_zerk', preferOnBoss:true, avoidIfTargetHpBelow:0.25 },
    d_barkskin:{ priorityTag:'defBuff', useIfSelfHpBelow:0.45 },
    d_rejuv:{ priorityTag:'heal', useIfSelfHpBelow:0.68, preferOnBoss:true },
    d_ferociousBite:{ priorityTag:'execute', useIfTargetHpBelow:0.35, preferOnBoss:true },
    d_starsurge:{ priorityTag:'spender', applyTargetState:null, useIfTargetMissing:null, useIfChargeKey:'d_astral', useIfChargeAtLeast:3, preferOnBoss:true },
    d_primalWrath:{ priorityTag:'spender', useIfChargeKey:'d_combo', useIfChargeAtLeast:3, preferOnBoss:true },
  },
};

function inferSkillAi(clsKey, skillKey, sk) {
  const ai = {};
  const text = `${sk?.name || ''} ${sk?.desc || ''}`;
  if (sk.type === 'heal') {
    ai.priorityTag = 'heal';
    ai.useIfSelfHpBelow = sk.heal >= 0.45 ? 0.5 : sk.heal >= 0.35 ? 0.68 : 0.82;
    ai.preferOnBoss = true;
    return ai;
  }
  if (sk.type === 'buff') {
    if (AUTO_DEFENSIVE_BUFFS.has(sk.buff) || /减伤|防御|护盾/.test(text)) {
      ai.priorityTag = 'defBuff';
      ai.useIfSelfHpBelow = 0.48;
    } else {
      ai.priorityTag = 'buff';
      if (sk.buff) ai.useIfBuffMissing = sk.buff;
      ai.preferOnBoss = true;
      ai.avoidIfTargetHpBelow = 0.25;
    }
    return ai;
  }
  if (sk.dot) {
    ai.priorityTag = 'dot';
    ai.applyTargetState = 'dot';
    ai.useIfTargetMissing = 'dot';
    ai.avoidIfTargetHpBelow = 0.18;
  } else if (sk.debuff === 'sunder' || /破甲/.test(text)) {
    ai.priorityTag = 'setup';
    ai.applyTargetState = 'sunder';
    ai.useIfTargetMissing = 'sunder';
    ai.avoidIfTargetHpBelow = 0.2;
  } else if (sk.slow || /减速|冰冻|缠绕/.test(text)) {
    ai.priorityTag = 'setup';
    ai.applyTargetState = 'slow';
    ai.useIfTargetMissing = 'slow';
    ai.avoidIfTargetHpBelow = 0.2;
  } else if (/斩杀|杀戮射击|暗言术·灭|死亡标记/.test(sk.name || '')) {
    ai.priorityTag = 'execute';
    ai.useIfTargetHpBelow = /杀戮射击/.test(sk.name || '') ? 0.4 : 0.35;
    ai.preferOnBoss = true;
  } else if (/范围|横扫|风暴|暴风雪|新星|多重|飓风|爆炸/.test(text)) {
    ai.priorityTag = 'aoe';
    ai.minEnemies = 3;
    ai.preferOnBoss = true;
  } else if ((sk.mul || 0) >= 6) {
    ai.priorityTag = 'spender';
    ai.preferOnBoss = true;
    ai.avoidIfTargetHpBelow = 0.18;
  } else if ((sk.mul || 0) >= 4) {
    ai.priorityTag = 'strike';
  } else {
    ai.priorityTag = 'builder';
  }
  return ai;
}

function normalizeSkillAi(sk, ai, override) {
  const out = Object.assign({}, ai);
  const hasOverride = (key) => !!(override && Object.prototype.hasOwnProperty.call(override, key));
  const hasExplicitMinEnemies = !!(override && Object.prototype.hasOwnProperty.call(override, 'minEnemies'));
  const isTrueAoeSkill = !!(sk && (sk.aoe || (sk.mul || 0) >= 4));

  if (!isTrueAoeSkill && !hasExplicitMinEnemies) delete out.minEnemies;
  if (out.priorityTag !== 'aoe' && !hasExplicitMinEnemies) delete out.minEnemies;
  if (out.priorityTag === 'aoe' && !isTrueAoeSkill) out.priorityTag = (sk && (sk.mul || 0) >= 6) ? 'spender' : 'strike';

  if (out.useIfTargetDotKeyMissing || out.useIfTargetDotKeyPresent) {
    if (!hasOverride('useIfTargetMissing')) delete out.useIfTargetMissing;
    if (!hasOverride('useIfTargetHas')) delete out.useIfTargetHas;
    if (!hasOverride('applyTargetState')) delete out.applyTargetState;
  }

  if (out.useIfTargetHas) {
    if (!hasOverride('useIfTargetMissing')) delete out.useIfTargetMissing;
    if (!hasOverride('applyTargetState')) delete out.applyTargetState;
  }

  if (out.useIfDotCountAtLeast !== undefined || out.useIfDotCountBelow !== undefined) {
    if (!hasOverride('useIfTargetMissing')) delete out.useIfTargetMissing;
    if (!hasOverride('applyTargetState')) delete out.applyTargetState;
  }

  if ((override && override.priorityTag === 'builder') || out.priorityTag === 'builder') {
    if (!hasOverride('applyTargetState')) delete out.applyTargetState;
    if (!hasOverride('useIfTargetMissing')) delete out.useIfTargetMissing;
    if (!hasOverride('useIfTargetHas')) delete out.useIfTargetHas;
    if (!hasOverride('useIfTargetDotKeyPresent')) delete out.useIfTargetDotKeyPresent;
    if (!hasOverride('useIfTargetDotKeyMissing')) delete out.useIfTargetDotKeyMissing;
    if (!hasOverride('useIfDotCountAtLeast')) delete out.useIfDotCountAtLeast;
    if (!hasOverride('useIfDotCountBelow')) delete out.useIfDotCountBelow;
  }

  return out;
}

(function injectSkillAi() {
  if (typeof CLASSES === 'undefined') return;
  for (const [clsKey, cls] of Object.entries(CLASSES)) {
    if (!cls || !cls.skills) continue;
    const overrides = SKILL_AI_OVERRIDES[clsKey] || {};
    for (const [skillKey, sk] of Object.entries(cls.skills)) {
      const base = inferSkillAi(clsKey, skillKey, sk);
      const override = overrides[skillKey] || {};
      sk.ai = normalizeSkillAi(sk, Object.assign({}, base, sk.ai || {}, override), override);
    }
  }
})();
