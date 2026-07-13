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
