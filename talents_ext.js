/* =========================================================
   talents_ext.js — 给所有专精追加更有“玩法感”的高阶天赋
   ----------------------------------------------------------
   目标:
   1) 尽量少碰 data.js 原始树结构
   2) 用统一 fx 描述触发、联动、斩杀、低血保命、DOT 扩散等效果
   3) 每个专精都补 3 个高层 capstone,让天赋不再只是堆面板
   ========================================================= */

const TALENT_AURA_LIBRARY = {
  arms_breach:          { icon:'⚔️', name:'战场掌控', desc:'攻击+18%·暴伤+20%', duration:6000, mod:{ atkPct:18, critdPct:20 } },
  fury_bloodrush:       { icon:'🩸', name:'鲜血狂潮', desc:'攻速+20%·吸血+8%', duration:5000, mod:{ spdPct:20, leech:8 } },
  fury_laststand:       { icon:'😡', name:'背水狂怒', desc:'攻击+15%·攻速+15%·全能+6%', duration:8000, mod:{ atkPct:15, spdPct:15, vers:6 } },
  prot_wall:            { icon:'🛡️', name:'不屈壁垒', desc:'防御+28%·全能+8%', duration:8000, mod:{ defPct:28, vers:8 } },
  prot_thunder:         { icon:'⚡', name:'震荡护卫', desc:'防御+15%·反伤+8%', duration:6000, mod:{ defPct:15, reflectDmg:8 } },
  arcane_overload:      { icon:'✨', name:'节点过载', desc:'暴击+15%·技能急速+15%', duration:6000, mod:{ crit:15, cdReduction:15 } },
  fire_hotstreak:       { icon:'🔥', name:'热能连锁', desc:'暴伤+25%·持续伤害+20%', duration:6000, mod:{ critdPct:25, dotBonus:20 } },
  frost_icy:            { icon:'❄️', name:'冰脉回响', desc:'攻速+18%·暴击+10%', duration:6000, mod:{ spdPct:18, crit:10 } },
  frost_shell:          { icon:'🧊', name:'冰川护体', desc:'防御+18%·全能+8%', duration:8000, mod:{ defPct:18, vers:8 } },
  discipline_guard:     { icon:'🕊️', name:'苦修意志', desc:'治疗+16%·防御+18%', duration:8000, mod:{ healBonus:16, defPct:18 } },
  holy_prayer:          { icon:'✨', name:'圣光涌动', desc:'治疗+20%·回复+5', duration:7000, mod:{ healBonus:20, regFlat:5 } },
  holy_lastgrace:       { icon:'👼', name:'守护天启', desc:'防御+16%·治疗+14%', duration:8000, mod:{ defPct:16, healBonus:14 } },
  shadow_void:          { icon:'🌑', name:'虚空澎湃', desc:'攻击+18%·暴击+12%', duration:6000, mod:{ atkPct:18, crit:12 } },
  assassination_venom:  { icon:'🐍', name:'暗毒回流', desc:'持续伤害+20%·暴击+12%', duration:6000, mod:{ dotBonus:20, crit:12 } },
  combat_rush:          { icon:'⚔️', name:'乘胜追击', desc:'攻速+20%·额外攻击+8%', duration:7000, mod:{ spdPct:20, extraAtk:8 } },
  combat_blade:         { icon:'🗡️', name:'剑刃压制', desc:'攻击+16%·暴伤+18%', duration:6000, mod:{ atkPct:16, critdPct:18 } },
  subtlety_dance:       { icon:'👤', name:'影舞连闪', desc:'攻击+18%·暴伤+22%', duration:6000, mod:{ atkPct:18, critdPct:22 } },
  bm_pack:              { icon:'🐾', name:'兽群狂奔', desc:'攻击+18%·攻速+18%', duration:7000, mod:{ atkPct:18, spdPct:18 } },
  bm_rampage:           { icon:'🦁', name:'撕咬命令', desc:'攻击+20%·额外攻击+8%', duration:7000, mod:{ atkPct:20, extraAtk:8 } },
  survival_wild:        { icon:'🪤', name:'荒野复原', desc:'吸血+8%·全能+8%·攻速+12%', duration:7000, mod:{ leech:8, vers:8, spdPct:12 } },
  element_storm:        { icon:'⛈️', name:'风暴余震', desc:'攻击+18%·暴击+12%', duration:6000, mod:{ atkPct:18, crit:12 } },
  enhancement_wind:     { icon:'💨', name:'狂岚步伐', desc:'攻速+18%·额外攻击+8%', duration:7000, mod:{ spdPct:18, extraAtk:8 } },
  enhancement_maelstrom:{ icon:'⚡', name:'漩涡涌动', desc:'攻击+16%·暴伤+18%', duration:7000, mod:{ atkPct:16, critdPct:18 } },
  restoration_tidal:    { icon:'🌊', name:'激流施法', desc:'治疗+18%·技能急速+12%', duration:7000, mod:{ healBonus:18, cdReduction:12 } },
  restoration_guard:    { icon:'🌀', name:'先祖庇佑', desc:'防御+20%·治疗+14%', duration:8000, mod:{ defPct:20, healBonus:14 } },
  palholy_dawn:         { icon:'🌅', name:'黎明恩泽', desc:'治疗+20%·全能+8%', duration:8000, mod:{ healBonus:20, vers:8 } },
  palprot_bastion:      { icon:'🛡️', name:'圣佑壁垒', desc:'防御+26%·全能+10%', duration:8000, mod:{ defPct:26, vers:10 } },
  palprot_judgement:    { icon:'⚖️', name:'审判反击', desc:'防御+18%·攻击+14%·反伤+8%', duration:6000, mod:{ defPct:18, atkPct:14, reflectDmg:8 } },
  ret_templar:          { icon:'⚔️', name:'审判连锁', desc:'攻击+20%·暴伤+20%', duration:6000, mod:{ atkPct:20, critdPct:20 } },
  ret_ashes:            { icon:'🔥', name:'复仇圣焰', desc:'攻击+16%·攻速+14%', duration:7000, mod:{ atkPct:16, spdPct:14 } },
  affliction_feast:     { icon:'🧿', name:'病疫盛宴', desc:'持续伤害+20%·吸血+8%', duration:7000, mod:{ dotBonus:20, leech:8 } },
  demonology_guard:     { icon:'😈', name:'恶魔甲壳', desc:'生命+10%·防御+18%·吸血+6%', duration:8000, mod:{ hpPct:10, defPct:18, leech:6 } },
  demonology_feast:     { icon:'👿', name:'邪能狂宴', desc:'攻击+16%·生命+10%·吸血+8%', duration:7000, mod:{ atkPct:16, hpPct:10, leech:8 } },
  demonology_meta:      { icon:'🦴', name:'变形余威', desc:'攻击+18%·防御+16%', duration:7000, mod:{ atkPct:18, defPct:16 } },
  destruction_embers:   { icon:'☄️', name:'烈焰余烬', desc:'攻击+18%·暴伤+24%', duration:6000, mod:{ atkPct:18, critdPct:24 } },
  balance_eclipse:      { icon:'🌙', name:'星火连辉', desc:'攻击+18%·暴击+12%·持续伤害+18%', duration:7000, mod:{ atkPct:18, crit:12, dotBonus:18 } },
  feral_hunt:           { icon:'🐺', name:'嗜血狂猎', desc:'攻击+18%·攻速+18%·吸血+8%', duration:7000, mod:{ atkPct:18, spdPct:18, leech:8 } },
  resto_bloom:          { icon:'🌺', name:'百花复苏', desc:'治疗+20%·回复+5', duration:7000, mod:{ healBonus:20, regFlat:5 } },
  resto_guard:          { icon:'🌿', name:'自然回护', desc:'防御+18%·治疗+16%', duration:8000, mod:{ defPct:18, healBonus:16 } },
};

(function extendTalentTrees() {
  if (typeof CLASSES === 'undefined') return;

  const CAPSTONES = {
    warrior: {
      arms: [
        { name:'处刑连锁', req:46, desc:'击杀敌人后，你的下一次伤害技能必暴，并叠加 2 层破甲印记。', fx:[{ type:'onKill', nextSkillCrit:1, grantCharge:{ key:'w_sunder', add:2, max:5 } }] },
        { name:'破军', req:56, desc:'你对被破甲的目标造成的伤害提高 24%。', fx:{ type:'vsState', state:'sunder', dmgPct:24 } },
        { name:'战场掌控', req:66, desc:'施放破甲攻击后，获得 6 秒【战场掌控】，并立即叠满破甲印记。', fx:[{ type:'afterSkill', skill:'sunderArmor', aura:'arms_breach' },{ type:'afterSkill', skill:'sunderArmor', grantCharge:{ key:'w_sunder', add:5, max:5 } }] },
      ],
      fury: [
        { name:'鲜血狂潮', req:46, desc:'暴击叠加 1 层【暴怒】；并有 35% 几率触发 5 秒【鲜血狂潮】。', fx:[{ type:'onCrit', grantCharge:{ key:'w_rage', add:1, max:5 } },{ type:'onCrit', chance:35, cooldown:5000, aura:'fury_bloodrush' }] },
        { name:'杀戮渴望', req:56, desc:'击杀敌人后，你的下一次伤害技能必暴，并叠加 2 层【暴怒】。', fx:{ type:'onKill', nextSkillCrit:1, grantCharge:{ key:'w_rage', add:2, max:5 } } },
        { name:'背水狂怒', req:66, desc:'生命低于 35% 时，获得 8 秒【背水狂怒】并吸收 12% 最大生命伤害，30秒冷却。', fx:{ type:'lowHp', threshold:0.35, cooldown:30000, aura:'fury_laststand', shieldPct:0.12 } },
      ],
      prot: [
        { name:'不屈壁垒', req:46, desc:'生命低于 40% 时，获得 8 秒【不屈壁垒】并吸收 18% 最大生命伤害，35秒冷却。', fx:{ type:'lowHp', threshold:0.4, cooldown:35000, aura:'prot_wall', shieldPct:0.18 } },
        { name:'重盾反制', req:56, desc:'对首领造成的伤害提高 18%，受到其伤害降低 12%。', fx:{ type:'vsBoss', dmgPct:18, takenPct:12 } },
        { name:'坚盾不破', req:66, desc:'盾墙激活期间，受到伤害额外降低 18%，造成的伤害提高 15%。', fx:[{ type:'whileBuff', buffKey:'shield', takenPct:18 },{ type:'whileBuff', buffKey:'shield', dmgPct:15 }] },
      ],
    },
    mage: {
      arcane: [
        { name:'奥术回流', req:46, desc:'击杀敌人后，重置奥术飞弹冷却，且你的下一次伤害技能必暴。', fx:{ type:'onKill', nextSkillCrit:1, resetSkill:'arcane' } },
        { name:'节点过载', req:56, desc:'施放奥术飞弹后，获得 6 秒【节点过载】。', fx:{ type:'afterSkill', skill:'arcane', aura:'arcane_overload' } },
        { name:'法网收束', req:66, desc:'你对首领造成的伤害提高 20%。', fx:{ type:'vsBoss', dmgPct:20 } },
      ],
      fire: [
        { name:'热能连锁', req:46, desc:'暴击叠加 1 层【炽热】；并有 35% 几率触发 6 秒【热能连锁】。', fx:[{ type:'onCrit', grantCharge:{ key:'m_heat', add:1, max:5 } },{ type:'onCrit', chance:35, cooldown:6000, aura:'fire_hotstreak' }] },
        { name:'余烬蔓延', req:56, desc:'若目标带有持续伤害效果而死亡，会把 60% 的 DOT 蔓延给下一个敌人。', fx:{ type:'onKill', requireDot:true, spreadDotPct:0.6 } },
        { name:'烈焰处决', req:66, desc:'对生命低于 35% 的敌人造成的伤害提高 30%。', fx:{ type:'executeWindow', threshold:0.35, dmgPct:30 } },
      ],
      frost: [
        { name:'寒霜裂片', req:46, desc:'你对被冻结的敌人造成的伤害提高 25%。', fx:{ type:'vsState', state:'frozen', dmgPct:25 } },
        { name:'冰脉回响', req:56, desc:'暴击叠加 1 层【指尖寒冰】；并有 35% 几率触发 6 秒【冰脉回响】。', fx:[{ type:'onCrit', grantCharge:{ key:'m_frost', add:1, max:5 } },{ type:'onCrit', chance:35, cooldown:6000, aura:'frost_icy' }] },
        { name:'冰川护体', req:66, desc:'生命低于 40% 时，获得 8 秒【冰川护体】并吸收 15% 最大生命伤害，30秒冷却。', fx:{ type:'lowHp', threshold:0.4, cooldown:30000, aura:'frost_shell', shieldPct:0.15 } },
      ],
    },
    priest: {
      discipline: [
        { name:'赎罪回响', req:46, desc:'施放惩击或心灵震爆后，恢复 5% 最大生命。', fx:{ type:'afterSkill', skill:['smite','mindBlast'], healPct:0.05 } },
        { name:'灵魂庇护', req:56, desc:'你的过量治疗会转化为 60% 吸收护盾。', fx:{ type:'afterHeal', overhealShieldPct:0.6 } },
        { name:'苦修意志', req:66, desc:'生命低于 35% 时，获得 8 秒【苦修意志】并吸收 10% 最大生命伤害，30秒冷却。', fx:{ type:'lowHp', threshold:0.35, cooldown:30000, aura:'discipline_guard', shieldPct:0.10, healPct:0.08 } },
      ],
      holy: [
        { name:'圣光涌动', req:46, desc:'施放治疗术、恢复或神圣赞美诗后，获得 7 秒【圣光涌动】。', fx:{ type:'afterSkill', skill:['heal','renew','divineHymn'], aura:'holy_prayer' } },
        { name:'永续祷言', req:56, desc:'你的过量治疗会转化为 45% 吸收护盾。', fx:{ type:'afterHeal', overhealShieldPct:0.45 } },
        { name:'守护天启', req:66, desc:'生命低于 35% 时，立刻恢复 15% 生命并获得 8 秒【守护天启】，30秒冷却。', fx:{ type:'lowHp', threshold:0.35, cooldown:30000, healPct:0.15, aura:'holy_lastgrace' } },
      ],
      shadow: [
        { name:'暗影回响', req:46, desc:'暴击叠加 1 层【疯狂】，并额外施加一层基于本次伤害 18% 的持续暗影伤害。', fx:{ type:'onCrit', applyDotPct:0.18, grantCharge:{ key:'p_insanity', add:1, max:6 } } },
        { name:'痛苦蔓延', req:56, desc:'若目标带有持续伤害效果而死亡，会把 50% 的 DOT 蔓延给下一个敌人。', fx:{ type:'onKill', requireDot:true, spreadDotPct:0.5 } },
        { name:'虚空收割', req:66, desc:'对生命低于 35% 的敌人造成的伤害提高 28%。', fx:{ type:'executeWindow', threshold:0.35, dmgPct:28 } },
      ],
    },
    rogue: {
      assassination: [
        { name:'毒液奔涌', req:46, desc:'你对带有持续伤害效果的敌人造成的伤害提高 22%。', fx:{ type:'vsState', state:'dot', dmgPct:22 } },
        { name:'血色收割', req:56, desc:'击杀敌人后，你的下一次伤害技能必暴，并叠加 2 层【毒锋】。', fx:{ type:'onKill', nextSkillCrit:1, grantCharge:{ key:'r_venom', add:2, max:5 } } },
        { name:'暗毒回流', req:66, desc:'暴击叠加 1 层【毒锋】；并有 30% 几率触发 6 秒【暗毒回流】。', fx:[{ type:'onCrit', grantCharge:{ key:'r_venom', add:1, max:5 } },{ type:'onCrit', chance:30, cooldown:6000, aura:'assassination_venom' }] },
      ],
      combat: [
        { name:'乘胜追击', req:46, desc:'击杀敌人后，获得 7 秒【乘胜追击】。', fx:{ type:'onKill', aura:'combat_rush' } },
        { name:'见招拆招', req:56, desc:'暴击叠加 1 点连击；并追加一次 70% 伤害的追击，2秒冷却。', fx:[{ type:'onCrit', grantCharge:{ key:'r_combo', add:1, max:5 } },{ type:'onCrit', cooldown:2000, extraHitMul:0.7, extraHitIcon:'⚔️' }] },
        { name:'剑刃压制', req:66, desc:'施放邪恶打击或背刺后，获得 6 秒【剑刃压制】。', fx:{ type:'afterSkill', skill:['sinister','backstab'], aura:'combat_blade' } },
      ],
      subtlety: [
        { name:'暗影绝息', req:46, desc:'施放影遁后，你的下一次伤害技能必暴。', fx:{ type:'afterSkill', skill:'shadow', nextSkillCrit:1 } },
        { name:'猎杀号令', req:56, desc:'对生命低于 35% 的敌人造成的伤害提高 28%。', fx:{ type:'executeWindow', threshold:0.35, dmgPct:28 } },
        { name:'影舞连闪', req:66, desc:'暴击叠加 1 点连击；并有 35% 几率触发 6 秒【影舞连闪】。', fx:[{ type:'onCrit', grantCharge:{ key:'r_combo', add:1, max:5 } },{ type:'onCrit', chance:35, cooldown:6000, aura:'subtlety_dance' }] },
      ],
    },
    hunter: {
      bm: [
        { name:'兽群狂奔', req:46, desc:'击杀敌人后，获得 7 秒【兽群狂奔】并叠加 2 层【野兽狂怒】。', fx:{ type:'onKill', aura:'bm_pack', grantCharge:{ key:'h_frenzy', add:2, max:5 } } },
        { name:'野兽直觉', req:56, desc:'你对首领造成的伤害提高 22%。', fx:{ type:'vsBoss', dmgPct:22 } },
        { name:'撕咬命令', req:66, desc:'施放狂野怒火后，获得 7 秒【撕咬命令】。', fx:{ type:'afterSkill', skill:'bestialWrath', aura:'bm_rampage' } },
      ],
      marks: [
        { name:'狙击本能', req:46, desc:'你对首领造成的伤害提高 25%。', fx:{ type:'vsBoss', dmgPct:25 } },
        { name:'穿心箭', req:56, desc:'对生命低于 40% 的敌人造成的伤害提高 30%。', fx:{ type:'executeWindow', threshold:0.4, dmgPct:30 } },
        { name:'连珠射击', req:66, desc:'瞄准射击或奥术射击暴击后，追加一次 80% 伤害的补射，2.5秒冷却。', fx:{ type:'onCrit', skill:['aimed','arcaneShot'], cooldown:2500, extraHitMul:0.8, extraHitIcon:'🏹' } },
      ],
      survival: [
        { name:'猎网收束', req:46, desc:'你对被减速的敌人造成的伤害提高 25%。', fx:{ type:'vsState', state:'slow', dmgPct:25 } },
        { name:'荒野复原', req:56, desc:'击杀敌人后，获得 10% 最大生命护盾并进入 7 秒【荒野复原】。', fx:{ type:'onKill', shieldPct:0.10, aura:'survival_wild' } },
        { name:'爆裂陷阱', req:66, desc:'施放多重射击或爆炸射击后，会附加一层基于本次伤害 20% 的持续伤害。', fx:{ type:'afterSkill', skill:['multi','explosiveShot'], applyDotPct:0.2, dotMs:6000 } },
      ],
    },
    shaman: {
      element: [
        { name:'风暴余震', req:46, desc:'暴击叠加 1 层【雷霆充能】；并有 30% 几率触发 6 秒【风暴余震】。', fx:[{ type:'onCrit', grantCharge:{ key:'stormCharge', add:1, max:3 } },{ type:'onCrit', chance:30, cooldown:6000, aura:'element_storm' }] },
        { name:'熔岩奔流', req:56, desc:'施放烈焰震击后，你的下一次伤害技能必暴。', fx:{ type:'afterSkill', skill:'flameShock', nextSkillCrit:1 } },
        { name:'过载终结', req:66, desc:'对生命低于 35% 的敌人造成的伤害提高 30%。', fx:{ type:'executeWindow', threshold:0.35, dmgPct:30 } },
      ],
      enhancement: [
        { name:'漩涡涌动', req:46, desc:'施放风怒武器后，获得 7 秒【漩涡涌动】。', fx:{ type:'afterSkill', skill:'windfury', aura:'enhancement_maelstrom' } },
        { name:'狂岚步伐', req:56, desc:'击杀敌人后，获得 7 秒【狂岚步伐】。', fx:{ type:'onKill', aura:'enhancement_wind' } },
        { name:'双风怒', req:66, desc:'暴击叠加 1 层【漩涡之力】；并追加一次 80% 伤害的风怒打击，2秒冷却。', fx:[{ type:'onCrit', grantCharge:{ key:'sh_maelstrom', add:1, max:5 } },{ type:'onCrit', cooldown:2000, extraHitMul:0.8, extraHitIcon:'💨' }] },
      ],
      restoration: [
        { name:'潮汐回响', req:46, desc:'你的过量治疗会转化为 50% 吸收护盾。', fx:{ type:'afterHeal', overhealShieldPct:0.5 } },
        { name:'先祖庇佑', req:56, desc:'生命低于 35% 时，恢复 8% 生命并获得 8 秒【先祖庇佑】，30秒冷却。', fx:{ type:'lowHp', threshold:0.35, cooldown:30000, healPct:0.08, shieldPct:0.12, aura:'restoration_guard' } },
        { name:'激流施法', req:66, desc:'施放治疗波后，获得 7 秒【激流施法】。', fx:{ type:'afterSkill', skill:'healingWave', aura:'restoration_tidal' } },
      ],
    },
    paladin: {
      holy: [
        { name:'圣光回流', req:46, desc:'你的过量治疗会转化为 60% 吸收护盾。', fx:{ type:'afterHeal', overhealShieldPct:0.6 } },
        { name:'黎明恩泽', req:56, desc:'生命低于 35% 时，恢复 14% 生命并获得 8 秒【黎明恩泽】，30秒冷却。', fx:{ type:'lowHp', threshold:0.35, cooldown:30000, healPct:0.14, aura:'palholy_dawn' } },
        { name:'神恩裁决', req:66, desc:'施放圣光术后，获得 8 秒【黎明恩泽】。', fx:{ type:'afterSkill', skill:['holyLight','flashOfLight'], aura:'palholy_dawn', cooldown:8000 } },
      ],
      prot: [
        { name:'圣佑壁垒', req:46, desc:'生命低于 40% 时，获得 8 秒【圣佑壁垒】并吸收 18% 最大生命伤害，35秒冷却。', fx:{ type:'lowHp', threshold:0.4, cooldown:35000, shieldPct:0.18, aura:'palprot_bastion' } },
        { name:'审判反击', req:56, desc:'施放审判后，获得 6 秒【审判反击】。', fx:{ type:'afterSkill', skill:'judgement', aura:'palprot_judgement' } },
        { name:'炽天威仪', req:66, desc:'对首领造成的伤害提高 20%，受到其伤害降低 12%。', fx:{ type:'vsBoss', dmgPct:20, takenPct:12 } },
      ],
      ret: [
        { name:'审判连锁', req:46, desc:'施放十字军打击后，获得 6 秒【审判连锁】。', fx:{ type:'afterSkill', skill:'crusader', aura:'ret_templar' } },
        { name:'处刑宣判', req:56, desc:'对生命低于 35% 的敌人造成的伤害提高 32%。', fx:{ type:'executeWindow', threshold:0.35, dmgPct:32 } },
        { name:'复仇圣焰', req:66, desc:'击杀敌人后，获得 7 秒【复仇圣焰】并叠加 2 层【圣能】。', fx:{ type:'onKill', aura:'ret_ashes', grantCharge:{ key:'pa_holyPower', add:2, max:5 } } },
      ],
    },
    warlock: {
      affliction: [
        { name:'病疫蔓延', req:46, desc:'若目标带有持续伤害效果而死亡，会把 70% 的 DOT 蔓延给下一个敌人。', fx:{ type:'onKill', requireDot:true, spreadDotPct:0.7 } },
        { name:'灵魂虹吸', req:56, desc:'你对带有持续伤害效果的敌人造成的伤害提高 22%。', fx:{ type:'vsState', state:'dot', dmgPct:22 } },
        { name:'痛苦盛宴', req:66, desc:'暴击叠加 1 层【灵魂碎片】，并额外施加一层基于本次伤害 20% 的持续痛苦。', fx:{ type:'onCrit', applyDotPct:0.2, grantCharge:{ key:'wl_shard', add:1, max:5 } } },
      ],
      demonology: [
        { name:'恶魔甲壳', req:46, desc:'生命低于 40% 时，获得 8 秒【恶魔甲壳】并吸收 16% 最大生命伤害，30秒冷却。', fx:{ type:'lowHp', threshold:0.4, cooldown:30000, shieldPct:0.16, aura:'demonology_guard' } },
        { name:'邪能狂宴', req:56, desc:'击杀敌人后，获得 7 秒【邪能狂宴】。', fx:{ type:'onKill', aura:'demonology_feast' } },
        { name:'变形余威', req:66, desc:'恶魔变身期间，造成的伤害提高 20%、受到伤害降低 12%。', fx:[{ type:'whileBuff', buffKey:'demonForm', dmgPct:20 },{ type:'whileBuff', buffKey:'demonForm', takenPct:12 }] },
      ],
      destruction: [
        { name:'烈焰余烬', req:46, desc:'暴击叠加 1 层【余烬】；并有 35% 几率触发 6 秒【烈焰余烬】。', fx:[{ type:'onCrit', grantCharge:{ key:'wl_ember', add:1, max:5 } },{ type:'onCrit', chance:35, cooldown:6000, aura:'destruction_embers' }] },
        { name:'混沌压境', req:56, desc:'你对首领造成的伤害提高 24%。', fx:{ type:'vsBoss', dmgPct:24 } },
        { name:'末日回响', req:66, desc:'施放混乱之箭后，你的下一次伤害技能必暴，8秒冷却。', fx:{ type:'afterSkill', skill:'chaosBolt', nextSkillCrit:1, cooldown:8000 } },
      ],
    },
    druid: {
      balance: [
        { name:'星火连辉', req:46, desc:'施放月火术或星火术后，获得 7 秒【星火连辉】。', fx:{ type:'afterSkill', skill:['moonfire','starfire'], aura:'balance_eclipse' } },
        { name:'新月收束', req:56, desc:'你对带有持续伤害效果的敌人造成的伤害提高 22%。', fx:{ type:'vsState', state:'dot', dmgPct:22 } },
        { name:'天穹坠星', req:66, desc:'暴击叠加 1 层【星界能量】；并有 35% 几率让你的下一次伤害技能必暴，7秒冷却。', fx:[{ type:'onCrit', grantCharge:{ key:'d_astral', add:1, max:5 } },{ type:'onCrit', chance:35, cooldown:7000, nextSkillCrit:1 }] },
      ],
      feral: [
        { name:'撕裂狩猎', req:46, desc:'你对带有持续伤害效果的敌人造成的伤害提高 25%。', fx:{ type:'vsState', state:'dot', dmgPct:25 } },
        { name:'嗜血狂猎', req:56, desc:'击杀敌人后，获得 7 秒【嗜血狂猎】。', fx:{ type:'onKill', aura:'feral_hunt' } },
        { name:'野性伏击', req:66, desc:'暴击叠加 1 点撕咬连击；并追加一次 80% 伤害的扑击，2秒冷却。', fx:[{ type:'onCrit', grantCharge:{ key:'d_combo', add:1, max:5 } },{ type:'onCrit', cooldown:2000, extraHitMul:0.8, extraHitIcon:'🐾' }] },
      ],
      resto: [
        { name:'森林馈赠', req:46, desc:'你的过量治疗会转化为 50% 吸收护盾。', fx:{ type:'afterHeal', overhealShieldPct:0.5 } },
        { name:'百花复苏', req:56, desc:'施放回春术后，获得 7 秒【百花复苏】。', fx:{ type:'afterSkill', skill:'rejuvenation', aura:'resto_bloom' } },
        { name:'自然回护', req:66, desc:'生命低于 35% 时，恢复 12% 生命并获得 8 秒【自然回护】，30秒冷却。', fx:{ type:'lowHp', threshold:0.35, cooldown:30000, healPct:0.12, aura:'resto_guard' } },
      ],
    },
  };

  for (const [clsKey, classSpecs] of Object.entries(CAPSTONES)) {
    const cls = CLASSES[clsKey];
    if (!cls || !cls.trees) continue;
    for (const [treeKey, talents] of Object.entries(classSpecs)) {
      const tree = cls.trees.find(t => t.key === treeKey);
      if (!tree || tree._flavorExt) continue;
      tree._flavorExt = true;
      talents.forEach((tpl, idx) => {
        tree.talents.push({
          key: `flavor_${clsKey}_${treeKey}_${idx}`,
          name: tpl.name,
          desc: tpl.desc,
          req: tpl.req,
          max: tpl.max || 1,
          mod: tpl.mod ? Object.assign({}, tpl.mod) : undefined,
          fx: tpl.fx ? JSON.parse(JSON.stringify(tpl.fx)) : undefined,
        });
      });
    }
  }

  const AUGMENTS = {
    warrior: {
      arms: [
        { name:'致死打击', extra:'致死打击伤害额外提高 25%。', fx:{ type:'skillAmp', skill:'mortalStrike', dmgPct:25 } },
        { name:'破甲专精', extra:'你对被破甲的目标造成的伤害提高 18%。', fx:{ type:'vsState', state:'sunder', dmgPct:18 } },
      ],
      fury: [
        { name:'嗜血', extra:'嗜血伤害额外提高 22%。', fx:{ type:'skillAmp', skill:'bloodthirst', dmgPct:22 } },
        { name:'血之渴望', extra:'击杀敌人后，你的下一次伤害技能必暴，并叠加 1 层【暴怒】。', fx:{ type:'onKill', nextSkillCrit:1, grantCharge:{ key:'w_rage', add:1, max:5 } } },
      ],
      prot: [
        { name:'盾牌专精', extra:'施放盾墙后，获得 6 秒【震荡护卫】。', fx:{ type:'afterSkill', skill:'shieldWall', aura:'prot_thunder', cooldown:8000 } },
        { name:'炽热防御者', extra:'你受到首领伤害降低 10%。', fx:{ type:'vsBoss', takenPct:10 } },
      ],
    },
    mage: {
      arcane: [
        { name:'暴风雪', extra:'暴风雪伤害额外提高 25%。', fx:{ type:'skillAmp', skill:'blizzard', dmgPct:25 } },
        { name:'奥术回响', extra:'暴击后追加一次 60% 伤害的奥术回响，3秒冷却。', fx:{ type:'onCrit', cooldown:3000, extraHitMul:0.6, extraHitIcon:'✨' } },
      ],
      fire: [
        { name:'火球术', extra:'火球术伤害额外提高 22%。', fx:{ type:'skillAmp', skill:'fireball', dmgPct:22 } },
        { name:'烈焰之心', extra:'你对带有持续伤害效果的敌人造成的伤害提高 20%。', fx:{ type:'vsState', state:'dot', dmgPct:20 } },
      ],
      frost: [
        { name:'寒冰箭', extra:'寒冰箭伤害额外提高 22%。', fx:{ type:'skillAmp', skill:'frostbolt', dmgPct:22 } },
        { name:'深度冻结', extra:'你对被减速的敌人造成的伤害提高 18%。', fx:{ type:'vsState', state:'slow', dmgPct:18 } },
      ],
    },
    priest: {
      discipline: [
        { name:'真言术盾', extra:'施放真言术盾后，获得 8 秒【苦修意志】。', fx:{ type:'afterSkill', skill:'shield', aura:'discipline_guard', cooldown:8000 } },
        { name:'圣光道标', extra:'你的过量治疗会转化为 30% 吸收护盾。', fx:{ type:'afterHeal', overhealShieldPct:0.3 } },
      ],
      holy: [
        { name:'守护之魂', extra:'生命低于 40% 时，恢复 8% 生命并获得【圣光涌动】，35秒冷却。', fx:{ type:'lowHp', threshold:0.4, cooldown:35000, healPct:0.08, aura:'holy_prayer' } },
        { name:'圣疗', extra:'你的过量治疗会转化为 35% 吸收护盾。', fx:{ type:'afterHeal', overhealShieldPct:0.35 } },
      ],
      shadow: [
        { name:'心灵震爆', extra:'心灵震爆伤害额外提高 24%。', fx:{ type:'skillAmp', skill:'mindBlast', dmgPct:24 } },
        { name:'暗影之痛', extra:'你对带有持续伤害效果的敌人造成的伤害提高 20%。', fx:{ type:'vsState', state:'dot', dmgPct:20 } },
      ],
    },
    rogue: {
      assassination: [
        { name:'毒刃', extra:'毒刃伤害额外提高 24%。', fx:{ type:'skillAmp', skill:'poison', dmgPct:24 } },
        { name:'毒药大师', extra:'你对带有持续伤害效果的敌人造成的伤害提高 20%。', fx:{ type:'vsState', state:'dot', dmgPct:20 } },
      ],
      combat: [
        { name:'背刺', extra:'背刺伤害额外提高 24%。', fx:{ type:'skillAmp', skill:'backstab', dmgPct:24 } },
        { name:'致命打击', extra:'暴击后追加一次 70% 伤害的追击，2.5秒冷却。', fx:{ type:'onCrit', cooldown:2500, extraHitMul:0.7, extraHitIcon:'⚔️' } },
      ],
      subtlety: [
        { name:'影遁', extra:'施放影遁后，你的下一次伤害技能必暴。', fx:{ type:'afterSkill', skill:'shadow', nextSkillCrit:1 } },
        { name:'暗影之击', extra:'你对生命低于 35% 的敌人造成的伤害提高 22%。', fx:{ type:'executeWindow', threshold:0.35, dmgPct:22 } },
      ],
    },
    hunter: {
      bm: [
        { name:'狂野怒火', extra:'施放狂野怒火后，获得 7 秒【撕咬命令】。', fx:{ type:'afterSkill', skill:'bestialWrath', aura:'bm_rampage', cooldown:8000 } },
        { name:'凶暴', extra:'暴击后追加一次 70% 伤害的野兽扑击，3秒冷却。', fx:{ type:'onCrit', cooldown:3000, extraHitMul:0.7, extraHitIcon:'🐾' } },
      ],
      marks: [
        { name:'瞄准射击', extra:'瞄准射击伤害额外提高 26%。', fx:{ type:'skillAmp', skill:'aimed', dmgPct:26 } },
        { name:'远距射击', extra:'你对生命低于 40% 的敌人造成的伤害提高 22%。', fx:{ type:'executeWindow', threshold:0.4, dmgPct:22 } },
      ],
      survival: [
        { name:'多重射击', extra:'多重射击伤害额外提高 20%。', fx:{ type:'skillAmp', skill:'multi', dmgPct:20 } },
        { name:'陷阱大师', extra:'你对被减速的敌人造成的伤害提高 18%。', fx:{ type:'vsState', state:'slow', dmgPct:18 } },
      ],
    },
    shaman: {
      element: [
        { name:'闪电链', extra:'闪电链伤害额外提高 24%。', fx:{ type:'skillAmp', skill:'chainLightning', dmgPct:24 } },
        { name:'过载', extra:'暴击后追加一次 65% 伤害的闪电过载，3秒冷却。', fx:{ type:'onCrit', cooldown:3000, extraHitMul:0.65, extraHitIcon:'⚡' } },
      ],
      enhancement: [
        { name:'风怒武器', extra:'施放风怒武器后，获得 7 秒【漩涡涌动】。', fx:{ type:'afterSkill', skill:'windfury', aura:'enhancement_maelstrom', cooldown:8000 } },
        { name:'元素武器', extra:'暴击后追加一次 70% 伤害的元素打击，2.5秒冷却。', fx:{ type:'onCrit', cooldown:2500, extraHitMul:0.7, extraHitIcon:'⚡' } },
      ],
      restoration: [
        { name:'治疗波', extra:'施放治疗波后，获得 7 秒【激流施法】。', fx:{ type:'afterSkill', skill:'healingWave', aura:'restoration_tidal', cooldown:8000 } },
        { name:'大地之盾', extra:'你的过量治疗会转化为 35% 吸收护盾。', fx:{ type:'afterHeal', overhealShieldPct:0.35 } },
      ],
    },
    paladin: {
      holy: [
        { name:'圣光信标', extra:'你的过量治疗会转化为 40% 吸收护盾。', fx:{ type:'afterHeal', overhealShieldPct:0.4 } },
        { name:'风暴之怒', extra:'生命低于 40% 时，恢复 8% 生命并获得【黎明恩泽】，30秒冷却。', fx:{ type:'lowHp', threshold:0.4, cooldown:30000, healPct:0.08, aura:'palholy_dawn' } },
      ],
      prot: [
        { name:'圣盾术', extra:'施放圣盾术后，获得 8 秒【圣佑壁垒】。', fx:{ type:'afterSkill', skill:'divineShield', aura:'palprot_bastion', cooldown:8000 } },
        { name:'炽热防御者', extra:'你受到首领伤害降低 10%。', fx:{ type:'vsBoss', takenPct:10 } },
      ],
      ret: [
        { name:'十字军打击', extra:'十字军打击伤害额外提高 24%。', fx:{ type:'skillAmp', skill:'crusader', dmgPct:24 } },
        { name:'行刑者', extra:'你对生命低于 35% 的敌人造成的伤害提高 22%。', fx:{ type:'executeWindow', threshold:0.35, dmgPct:22 } },
      ],
    },
    warlock: {
      affliction: [
        { name:'腐蚀术', extra:'施放腐蚀术后，获得 7 秒【病疫盛宴】。', fx:{ type:'afterSkill', skill:'corruption', aura:'affliction_feast', cooldown:8000 } },
        { name:'无尽痛苦', extra:'你对带有持续伤害效果的敌人造成的伤害提高 20%。', fx:{ type:'vsState', state:'dot', dmgPct:20 } },
      ],
      demonology: [
        { name:'生命分流', extra:'施放生命分流后，获得 7 秒【变形余威】。', fx:{ type:'afterSkill', skill:'drainLife', aura:'demonology_meta', cooldown:8000 } },
        { name:'灵魂链接', extra:'生命低于 40% 时，获得 8 秒【恶魔甲壳】并吸收 12% 最大生命伤害，30秒冷却。', fx:{ type:'lowHp', threshold:0.4, cooldown:30000, shieldPct:0.12, aura:'demonology_guard' } },
      ],
      destruction: [
        { name:'烧尽', extra:'烧尽伤害额外提高 24%。', fx:{ type:'skillAmp', skill:'incinerate', dmgPct:24 } },
        { name:'混沌', extra:'暴击后，你的下一次伤害技能必暴，7秒冷却。', fx:{ type:'onCrit', cooldown:7000, nextSkillCrit:1 } },
      ],
    },
    druid: {
      balance: [
        { name:'月火术', extra:'月火术伤害额外提高 22%。', fx:{ type:'skillAmp', skill:'moonfire', dmgPct:22 } },
        { name:'自然之力', extra:'你对带有持续伤害效果的敌人造成的伤害提高 18%。', fx:{ type:'vsState', state:'dot', dmgPct:18 } },
      ],
      feral: [
        { name:'凶猛撕咬', extra:'凶猛撕咬伤害额外提高 24%。', fx:{ type:'skillAmp', skill:'bite', dmgPct:24 } },
        { name:'掠食本能', extra:'击杀敌人后，获得 7 秒【嗜血狂猎】。', fx:{ type:'onKill', aura:'feral_hunt' } },
      ],
      resto: [
        { name:'树皮术', extra:'施放树皮术后，获得 8 秒【自然回护】。', fx:{ type:'afterSkill', skill:'barkskin', aura:'resto_guard', cooldown:8000 } },
        { name:'愈合', extra:'你的过量治疗会转化为 35% 吸收护盾。', fx:{ type:'afterHeal', overhealShieldPct:0.35 } },
      ],
    },
  };

  const LOW_AUGMENTS = {
    warrior: {
      arms: [
        { name:'残忍', extra:'暴击时有 18% 几率追加一次 45% 伤害的追击，4秒冷却。', fx:{ type:'onCrit', chance:18, cooldown:4000, extraHitMul:0.45, extraHitIcon:'🪓' } },
        { name:'战术大师', extra:'施放致死打击或斩杀后，回复 8 点资源。', fx:{ type:'afterSkill', skill:['mortalStrike','execute'], resource:8 } },
      ],
      fury: [
        { name:'激怒', extra:'暴击有 22% 几率触发 5 秒【鲜血狂潮】，8秒冷却。', fx:{ type:'onCrit', chance:22, cooldown:8000, aura:'fury_bloodrush' } },
        { name:'怒气爆发', extra:'施放嗜血或斩杀后，回复 10 点资源。', fx:{ type:'afterSkill', skill:['bloodthirst','execute'], resource:10 } },
      ],
      prot: [
        { name:'预判', extra:'你受到首领伤害降低 6%。', fx:{ type:'vsBoss', takenPct:6 } },
        { name:'战意之怒', extra:'生命低于 45% 时，获得 6% 最大生命护盾，35秒冷却。', fx:{ type:'lowHp', threshold:0.45, cooldown:35000, shieldPct:0.06 } },
      ],
    },
    mage: {
      arcane: [
        { name:'奥术心智', extra:'暴击有 20% 几率回复 12 点资源。', fx:{ type:'onCrit', chance:20, resource:12 } },
        { name:'节能施法', extra:'施放奥术飞弹后，回复 8 点资源。', fx:{ type:'afterSkill', skill:'arcane', resource:8 } },
      ],
      fire: [
        { name:'临界点', extra:'暴击有 22% 几率让你的下一次伤害技能必暴，9秒冷却。', fx:{ type:'onCrit', chance:22, cooldown:9000, nextSkillCrit:1 } },
        { name:'火焰冲击', extra:'施放火球术或炎爆术后，回复 10 点资源。', fx:{ type:'afterSkill', skill:['fireball','pyroblast'], resource:10 } },
      ],
      frost: [
        { name:'碎裂', extra:'你对被减速的敌人造成的伤害提高 10%。', fx:{ type:'vsState', state:'slow', dmgPct:10 } },
        { name:'寒冰屏障', extra:'生命低于 45% 时，获得 6% 最大生命护盾，35秒冷却。', fx:{ type:'lowHp', threshold:0.45, cooldown:35000, shieldPct:0.06 } },
      ],
    },
    priest: {
      discipline: [
        { name:'启迪', extra:'施放惩击后，恢复 3% 最大生命。', fx:{ type:'afterSkill', skill:'smite', healPct:0.03 } },
        { name:'意志之力', extra:'生命低于 45% 时，获得 6% 最大生命护盾，35秒冷却。', fx:{ type:'lowHp', threshold:0.45, cooldown:35000, shieldPct:0.06 } },
      ],
      holy: [
        { name:'神恩', extra:'施放治疗术、恢复或神圣赞美诗后，回复 6 点资源。', fx:{ type:'afterSkill', skill:['heal','renew','divineHymn'], resource:6 } },
        { name:'圣洁', extra:'生命低于 45% 时，恢复 5% 最大生命，35秒冷却。', fx:{ type:'lowHp', threshold:0.45, cooldown:35000, healPct:0.05 } },
      ],
      shadow: [
        { name:'黑暗思维', extra:'暴击有 18% 几率回复 10 点资源。', fx:{ type:'onCrit', chance:18, resource:10 } },
        { name:'心灵尖刺', extra:'施放心灵震爆后，回复 8 点资源。', fx:{ type:'afterSkill', skill:'mindBlast', resource:8 } },
      ],
    },
    rogue: {
      assassination: [
        { name:'恶毒', extra:'暴击有 18% 几率让你的下一次伤害技能必暴，9秒冷却。', fx:{ type:'onCrit', chance:18, cooldown:9000, nextSkillCrit:1 } },
        { name:'暗影步', extra:'施放毒刃后，回复 10 点资源。', fx:{ type:'afterSkill', skill:'poison', resource:10 } },
      ],
      combat: [
        { name:'双武器精通', extra:'暴击有 18% 几率追加一次 45% 伤害的补刀，4秒冷却。', fx:{ type:'onCrit', chance:18, cooldown:4000, extraHitMul:0.45, extraHitIcon:'⚔️' } },
        { name:'无尽能量', extra:'施放邪恶打击或背刺后，回复 10 点资源。', fx:{ type:'afterSkill', skill:['sinister','backstab'], resource:10 } },
      ],
      subtlety: [
        { name:'机会', extra:'暴击有 18% 几率让你的下一次伤害技能必暴，9秒冷却。', fx:{ type:'onCrit', chance:18, cooldown:9000, nextSkillCrit:1 } },
        { name:'潜伏', extra:'施放影遁后，回复 10 点资源。', fx:{ type:'afterSkill', skill:'shadow', resource:10 } },
      ],
    },
    hunter: {
      bm: [
        { name:'狂热', extra:'击杀敌人后，叠加 2 层【野兽狂怒】。', fx:{ type:'onKill', grantCharge:{ key:'h_frenzy', add:2, max:5 } } },
        { name:'灵魂兽', extra:'生命低于 45% 时，恢复 5% 最大生命，35秒冷却。', fx:{ type:'lowHp', threshold:0.45, cooldown:35000, healPct:0.05 } },
      ],
      marks: [
        { name:'致命射击', extra:'暴击有 18% 几率让你的下一次伤害技能必暴，9秒冷却。', fx:{ type:'onCrit', chance:18, cooldown:9000, nextSkillCrit:1 } },
        { name:'鹰眼', extra:'施放瞄准射击或奥术射击后，回复 8 点资源。', fx:{ type:'afterSkill', skill:['aimed','arcaneShot'], resource:8 } },
      ],
      survival: [
        { name:'陷阱专家', extra:'你对被减速的敌人造成的伤害提高 10%。', fx:{ type:'vsState', state:'slow', dmgPct:10 } },
        { name:'生存本能', extra:'生命低于 45% 时，获得 6% 最大生命护盾，35秒冷却。', fx:{ type:'lowHp', threshold:0.45, cooldown:35000, shieldPct:0.06 } },
      ],
    },
    shaman: {
      element: [
        { name:'元素之怒', extra:'暴击有 18% 几率回复 10 点资源。', fx:{ type:'onCrit', chance:18, resource:10 } },
        { name:'元素掌握', extra:'施放闪电箭或闪电链后，回复 8 点资源。', fx:{ type:'afterSkill', skill:['lightning','chainLightning'], resource:8 } },
      ],
      enhancement: [
        { name:'怒火', extra:'暴击有 18% 几率追加一次 45% 伤害的风击，4秒冷却。', fx:{ type:'onCrit', chance:18, cooldown:4000, extraHitMul:0.45, extraHitIcon:'💨' } },
        { name:'风暴之力', extra:'击杀敌人后，叠加 2 层【漩涡之力】。', fx:{ type:'onKill', grantCharge:{ key:'sh_maelstrom', add:2, max:5 } } },
      ],
      restoration: [
        { name:'水之护盾', extra:'你的过量治疗会转化为 20% 吸收护盾。', fx:{ type:'afterHeal', overhealShieldPct:0.2 } },
        { name:'先祖活力', extra:'生命低于 45% 时，恢复 5% 最大生命，35秒冷却。', fx:{ type:'lowHp', threshold:0.45, cooldown:35000, healPct:0.05 } },
      ],
    },
    paladin: {
      holy: [
        { name:'光明', extra:'施放圣光术或圣光闪现后，回复 6 点资源。', fx:{ type:'afterSkill', skill:['holyLight','flashOfLight'], resource:6 } },
        { name:'神性', extra:'你的过量治疗会转化为 20% 吸收护盾。', fx:{ type:'afterHeal', overhealShieldPct:0.2 } },
      ],
      prot: [
        { name:'预判', extra:'你受到首领伤害降低 6%。', fx:{ type:'vsBoss', takenPct:6 } },
        { name:'壁垒', extra:'生命低于 45% 时，获得 6% 最大生命护盾，35秒冷却。', fx:{ type:'lowHp', threshold:0.45, cooldown:35000, shieldPct:0.06 } },
      ],
      ret: [
        { name:'复仇', extra:'击杀敌人后，叠加 2 层【圣能】。', fx:{ type:'onKill', grantCharge:{ key:'pa_holyPower', add:2, max:5 } } },
        { name:'圣战', extra:'施放十字军打击后，回复 8 点资源。', fx:{ type:'afterSkill', skill:'crusader', resource:8 } },
      ],
    },
    warlock: {
      affliction: [
        { name:'瘟疫蔓延', extra:'暴击会额外施加一层基于本次伤害 10% 的持续痛苦。', fx:{ type:'onCrit', applyDotPct:0.10 } },
        { name:'灵魂虹吸', extra:'若目标带有持续伤害而死亡，会向下一名敌人蔓延 35% 的 DOT。', fx:{ type:'onKill', requireDot:true, spreadDotPct:0.35 } },
      ],
      demonology: [
        { name:'强化恶魔', extra:'击杀敌人后，获得 7 秒【邪能狂宴】。', fx:{ type:'onKill', aura:'demonology_feast' } },
        { name:'恶魔皮肤', extra:'生命低于 45% 时，获得 6% 最大生命护盾，35秒冷却。', fx:{ type:'lowHp', threshold:0.45, cooldown:35000, shieldPct:0.06 } },
      ],
      destruction: [
        { name:'毁灭专精', extra:'暴击有 18% 几率让你的下一次伤害技能必暴，9秒冷却。', fx:{ type:'onCrit', chance:18, cooldown:9000, nextSkillCrit:1 } },
        { name:'火焰之雨', extra:'施放烧尽后，回复 8 点资源。', fx:{ type:'afterSkill', skill:'incinerate', resource:8 } },
      ],
    },
    druid: {
      balance: [
        { name:'自然之握', extra:'暴击有 18% 几率回复 10 点资源。', fx:{ type:'onCrit', chance:18, resource:10 } },
        { name:'繁星', extra:'施放月火术或愤怒后，回复 8 点资源。', fx:{ type:'afterSkill', skill:['moonfire','wrath'], resource:8 } },
      ],
      feral: [
        { name:'锋利利爪', extra:'暴击有 18% 几率追加一次 45% 伤害的扑击，4秒冷却。', fx:{ type:'onCrit', chance:18, cooldown:4000, extraHitMul:0.45, extraHitIcon:'🐾' } },
        { name:'血爪', extra:'击杀敌人后，获得 7 秒【嗜血狂猎】。', fx:{ type:'onKill', aura:'feral_hunt' } },
      ],
      resto: [
        { name:'萌芽', extra:'施放回春术后，回复 6 点资源。', fx:{ type:'afterSkill', skill:'rejuvenation', resource:6 } },
        { name:'自然之赐', extra:'你的过量治疗会转化为 20% 吸收护盾。', fx:{ type:'afterHeal', overhealShieldPct:0.2 } },
      ],
    },
  };

  function appendFx(talent, fx) {
    if (!talent.fx) talent.fx = fx;
    else if (Array.isArray(talent.fx)) talent.fx.push(fx);
    else talent.fx = [talent.fx, fx];
  }

  function applyAugments(defs, marker) {
    for (const [clsKey, classSpecs] of Object.entries(defs)) {
      const cls = CLASSES[clsKey];
      if (!cls || !cls.trees) continue;
      for (const [treeKey, augments] of Object.entries(classSpecs)) {
        const tree = cls.trees.find(t => t.key === treeKey);
        if (!tree) continue;
        augments.forEach(aug => {
          const talent = tree.talents.find(t => t.name === aug.name && !t[marker]);
          if (!talent) return;
          talent.desc = talent.desc + ' · ' + aug.extra;
          appendFx(talent, JSON.parse(JSON.stringify(aug.fx)));
          talent[marker] = true;
        });
      }
    }
  }

  applyAugments(AUGMENTS, '_augFlavor');
  applyAugments(LOW_AUGMENTS, '_augFlavor2');
})();

(function extendSkillMechanicTalents() {
  if (typeof CLASSES === 'undefined') return;
  const names = {
    arms:'裂痕战术', fury:'血热余波', prot:'壁垒回声',
    arcane:'魔网裂纹', fire:'燃痕精研', frost:'碎冰余响',
    discipline:'赎罪残响', holy:'圣辉余音', shadow:'虚空蔓延',
    assassination:'毒雾收束', combat:'刀锋余响', subtlety:'暗幕裂隙',
    bm:'猎群气味', marks:'弹道残痕', survival:'陷阱余烬',
    element:'元素余震', enhancement:'风怒回痕', restoration:'潮汐残响',
    ret:'裁决回声', affliction:'腐蚀回音', demonology:'军团裂门', destruction:'混乱余烬',
    balance:'星轨残响', feral:'血爪余痕', resto:'林地余芽',
  };
  for (const [clsKey, cls] of Object.entries(CLASSES)) {
    if (!cls || !Array.isArray(cls.trees)) continue;
    for (const tree of cls.trees) {
      if (!tree || tree._skillMechanicTalent) continue;
      tree._skillMechanicTalent = true;
      const tName = names[tree.key] || '技能余波';
      tree.talents.push({
        key: `mechanic_${clsKey}_${tree.key}`,
        name: tName,
        desc: `你的技能余波伤害提高 16%, 状态反应伤害提高 12%, 余波持续时间提高 18%。该天赋专门强化当前技能机制的铺场与收束。`,
        req: 76,
        max: 1,
        fx: { type:'skillMechanic', echoDmgPct:16, reactionDmgPct:12, echoDurationPct:18, reactionDotPct:8, echoDotPct:8 }
      });
    }
  }
})();

(function extendSpecEngineTalents() {
  if (typeof CLASSES === 'undefined') return;
  const names = {
    arms:'处决引擎', fury:'狂怒引擎', prot:'盾墙引擎',
    arcane:'魔网引擎', fire:'燃线引擎', frost:'碎裂引擎',
    discipline:'赎罪引擎', holy:'圣言引擎', shadow:'虚空引擎',
    assassination:'毒爆引擎', combat:'乱舞引擎', subtlety:'影舞引擎',
    bm:'兽群引擎', marks:'狙击引擎', survival:'野火引擎',
    element:'过载引擎', enhancement:'风怒引擎', restoration:'潮汐引擎',
    ret:'裁决引擎', affliction:'痛苦引擎', demonology:'军团引擎', destruction:'混乱引擎',
    balance:'星蚀引擎', feral:'血爪引擎', resto:'林地引擎',
  };
  const supportSpecs = new Set(['discipline','holy','restoration','resto']);
  const guardianSpecs = new Set(['prot']);
  const dotSpecs = new Set(['fire','shadow','assassination','survival','affliction','destruction','balance','feral']);
  for (const [clsKey, cls] of Object.entries(CLASSES)) {
    if (!cls || !Array.isArray(cls.trees)) continue;
    for (const tree of cls.trees) {
      if (!tree || tree._specEngineTalent) continue;
      tree._specEngineTalent = true;
      const support = supportSpecs.has(tree.key) || (clsKey === 'paladin' && tree.key === 'holy');
      const guardian = guardianSpecs.has(tree.key) && (clsKey === 'warrior' || clsKey === 'paladin');
      const dot = dotSpecs.has(tree.key);
      const fx = {
        type:'specEngine',
        coreGainPct:12,
        corePassivePct:10,
        corePayoffPct:support ? 10 : 16,
        chainPayoffPct:14,
        specReactionPct:dot ? 18 : 12,
        procPct:12,
        stancePct:10,
        dotSpreadPct:dot ? 14 : 6,
        supportPct:support || guardian ? 18 : 8,
        resource:2
      };
      tree.talents.push({
        key: `spec_engine_${clsKey}_${tree.key}`,
        name: names[tree.key] || '专精引擎',
        desc: `你的专精核心叠层速度提高 12%, 核心收束、专精连段、状态反应、战斗法则和临场强化效果提高。该天赋会直接强化当前专精的核心循环。`,
        req: 82,
        max: 1,
        fx
      });
    }
  }
})();

(function extendSkillMarkTalents() {
  if (typeof CLASSES === 'undefined') return;
  const names = {
    arms:'裂骨判读', fury:'怒火判读', prot:'盾令判读',
    arcane:'奥纹判读', fire:'燃烬判读', frost:'寒狱判读',
    discipline:'赎罪判读', holy:'圣约判读', shadow:'虚债判读',
    assassination:'毒契判读', combat:'乱舞判读', subtlety:'暗幕判读',
    bm:'猎命判读', marks:'弱点判读', survival:'野火判读',
    element:'雷导判读', enhancement:'风怒判读', restoration:'潮汐判读',
    ret:'裁决判读', affliction:'痛苦判读', demonology:'军团判读', destruction:'混乱判读',
    balance:'星轨判读', feral:'血爪判读', resto:'林地判读',
  };
  const dotSpecs = new Set(['fire','shadow','assassination','survival','affliction','destruction','balance','feral']);
  const supportSpecs = new Set(['discipline','holy','restoration','resto']);
  for (const [clsKey, cls] of Object.entries(CLASSES)) {
    if (!cls || !Array.isArray(cls.trees)) continue;
    for (const tree of cls.trees) {
      if (!tree || tree._skillMarkTalent) continue;
      tree._skillMarkTalent = true;
      const support = supportSpecs.has(tree.key) || (clsKey === 'paladin' && tree.key === 'holy') || (tree.key === 'prot' && (clsKey === 'warrior' || clsKey === 'paladin'));
      const dot = dotSpecs.has(tree.key);
      tree.talents.push({
        key: `skill_mark_${clsKey}_${tree.key}`,
        name: names[tree.key] || '技能判读',
        desc: `技能判词伤害提高 ${support ? 10 : 14}%, 判词持续时间提高 18%, ${support ? '判词治疗和护盾提高 18%' : (dot ? '判词 DOT 与扩散提高 16%' : '判词溅射提高 10%, 收束返还资源 +2')}。`,
        req: 88,
        max: 1,
        fx: {
          type:'skillMark',
          markDmgPct:support ? 10 : 14,
          markDurationPct:18,
          markDotPct:dot ? 16 : 8,
          markSpreadPct:dot ? 16 : 6,
          markSupportPct:support ? 18 : 6,
          markSplashPct:support ? 4 : 10,
          markResource:2
        }
      });
    }
  }
})();

(function extendSkillWeaveTalents() {
  if (typeof CLASSES === 'undefined') return;
  const names = {
    arms:'破阵织法', fury:'怒火织法', prot:'盾阵织法',
    arcane:'魔网织法', fire:'灼冻织法', frost:'冰火织法',
    discipline:'赎罪织法', holy:'合唱织法', shadow:'虚空织法',
    assassination:'毒刃织法', combat:'乱舞织法', subtlety:'影幕织法',
    bm:'兽群织法', marks:'弹道织法', survival:'野火织法',
    element:'导流织法', enhancement:'风怒织法', restoration:'潮汐织法',
    ret:'圣能织法', affliction:'腐蚀织法', demonology:'军团织法', destruction:'裂隙织法',
    balance:'星轨织法', feral:'血爪织法', resto:'林地织法',
  };
  const supportSpecs = new Set(['discipline','holy','restoration','resto']);
  const dotSpecs = new Set(['fire','shadow','assassination','survival','affliction','destruction','balance','feral']);
  for (const [clsKey, cls] of Object.entries(CLASSES)) {
    if (!cls || !Array.isArray(cls.trees)) continue;
    for (const tree of cls.trees) {
      if (!tree || tree._skillWeaveTalent) continue;
      tree._skillWeaveTalent = true;
      const support = supportSpecs.has(tree.key) || (clsKey === 'paladin' && tree.key === 'holy') || (tree.key === 'prot' && (clsKey === 'warrior' || clsKey === 'paladin'));
      const dot = dotSpecs.has(tree.key);
      tree.talents.push({
        key: `skill_weave_${clsKey}_${tree.key}`,
        name: names[tree.key] || '技能织法',
        desc: `不同类型技能交替形成的技能织法更强: ${support ? '治疗和护盾提高 18%' : (dot ? '织法 DOT 提高 18%' : '织法追击伤害提高 16%')}, 织法持续时间提高 16%, 触发时额外返还资源。`,
        req: 94,
        max: 1,
        fx: {
          type:'skillWeave',
          weaveDmgPct:support ? 8 : 16,
          weaveDotPct:dot ? 18 : 8,
          weaveSupportPct:support ? 18 : 6,
          weaveDurationPct:16,
          weaveResource:2
        }
      });
    }
  }
})();

(function extendSkillRhythmTalents() {
  if (typeof CLASSES === 'undefined') return;
  const names = {
    arms:'斩击律动', fury:'狂怒律动', prot:'壁垒律动',
    arcane:'奥能律动', fire:'燃爆律动', frost:'碎冰律动',
    discipline:'赎罪律动', holy:'圣歌律动', shadow:'虚空律动',
    assassination:'毒脉律动', combat:'乱舞律动', subtlety:'暗影律动',
    bm:'兽群律动', marks:'狙击律动', survival:'野火律动',
    element:'雷霆律动', enhancement:'风怒律动', restoration:'潮汐律动',
    holy_paladin:'圣光律动', prot_paladin:'守护律动', ret:'裁决律动',
    affliction:'痛苦律动', demonology:'军团律动', destruction:'毁灭律动',
    balance:'星辰律动', feral:'血爪律动', resto:'萌芽律动',
  };
  const supportSpecs = new Set(['discipline','holy','restoration','resto']);
  const dotSpecs = new Set(['fire','shadow','assassination','survival','affliction','destruction','balance','feral']);
  for (const [clsKey, cls] of Object.entries(CLASSES)) {
    if (!cls || !Array.isArray(cls.trees)) continue;
    for (const tree of cls.trees) {
      if (!tree || tree._skillRhythmTalent) continue;
      tree._skillRhythmTalent = true;
      const keyName = clsKey === 'paladin' && tree.key === 'holy' ? 'holy_paladin' : (clsKey === 'paladin' && tree.key === 'prot' ? 'prot_paladin' : tree.key);
      const support = supportSpecs.has(tree.key) || (clsKey === 'paladin' && tree.key === 'holy') || (tree.key === 'prot' && (clsKey === 'warrior' || clsKey === 'paladin'));
      const dot = dotSpecs.has(tree.key);
      tree.talents.push({
        key: `skill_rhythm_${clsKey}_${tree.key}`,
        name: names[keyName] || '战斗律动',
        desc: `战斗律动终结收束更强: ${support ? '救援/壁垒终结提高 20%' : (dot ? '痛苦终结提高 20%' : '强攻/横扫终结提高 18%')}, 积拍效率提高,触发时返还资源。`,
        req: 100,
        max: 1,
        fx: {
          type:'skillRhythm',
          rhythmDmgPct:support ? 8 : 18,
          rhythmDotPct:dot ? 20 : 8,
          rhythmSupportPct:support ? 20 : 6,
          rhythmChargePct:18,
          rhythmResource:2
        }
      });
    }
  }
})();

(function extendSkillControlTalents() {
  if (typeof CLASSES === 'undefined') return;
  const names = {
    arms:'破势清算', fury:'压阵清算', prot:'盾墙清算',
    arcane:'魔网封锁', fire:'灼链清算', frost:'冰锁清算',
    discipline:'赎罪制衡', holy:'圣光救场', shadow:'恐惧清算',
    assassination:'毒刃封喉', combat:'缴械乱舞', subtlety:'暗幕破绽',
    bm:'兽群压制', marks:'狙击破绽', survival:'陷阱清算',
    element:'雷狱清算', enhancement:'裂地压制', restoration:'潮汐救场',
    holy_paladin:'圣裁清算', prot_paladin:'壁垒压阵', ret:'裁决破势',
    affliction:'痛苦封锁', demonology:'恶魔压阵', destruction:'混乱清算',
    balance:'星界束缚', feral:'血爪压制', resto:'林地救场',
  };
  const supportSpecs = new Set(['discipline','holy','restoration','resto']);
  const controlSpecs = new Set(['frost','subtlety','survival','element','enhancement','prot']);
  for (const [clsKey, cls] of Object.entries(CLASSES)) {
    if (!cls || !Array.isArray(cls.trees)) continue;
    for (const tree of cls.trees) {
      if (!tree || tree._skillControlTalent) continue;
      tree._skillControlTalent = true;
      const keyName = clsKey === 'paladin' && tree.key === 'holy' ? 'holy_paladin' : (clsKey === 'paladin' && tree.key === 'prot' ? 'prot_paladin' : tree.key);
      const support = supportSpecs.has(tree.key) || (clsKey === 'paladin' && tree.key === 'holy') || (tree.key === 'prot' && (clsKey === 'warrior' || clsKey === 'paladin'));
      const control = controlSpecs.has(tree.key) || tree.key === 'marks' || tree.key === 'arms';
      tree.talents.push({
        key: `skill_control_${clsKey}_${tree.key}`,
        name: names[keyName] || '控场清算',
        desc: `控场清算更强: ${support ? '救场护盾和治疗提高 20%' : (control ? '控制压力持续和清算伤害提高' : '清算追击伤害提高 16%')}, 控制压力持续时间提高,清算时返还资源。`,
        req: 106,
        max: 1,
        fx: {
          type:'skillControl',
          controlDmgPct:support ? 8 : (control ? 18 : 16),
          controlSupportPct:support ? 20 : 6,
          controlDurationPct:control ? 22 : 16,
          controlResource:2
        }
      });
    }
  }
})();

(function extendSkillWeaknessTalents() {
  if (typeof CLASSES === 'undefined') return;
  const names = {
    arms:'处刑洞察', fury:'血怒洞察', prot:'盾卫洞察',
    arcane:'魔网洞察', fire:'灼痕洞察', frost:'碎冰洞察',
    discipline:'赎罪洞察', holy:'圣光洞察', shadow:'心灵洞察',
    assassination:'毒创洞察', combat:'破甲洞察', subtlety:'背刺洞察',
    bm:'猎物洞察', marks:'鹰眼洞察', survival:'陷阱洞察',
    element:'元素洞察', enhancement:'风暴洞察', restoration:'潮汐洞察',
    holy_paladin:'圣裁洞察', prot_paladin:'壁垒洞察', ret:'灰烬洞察',
    affliction:'痛苦洞察', demonology:'恶魔洞察', destruction:'混乱洞察',
    balance:'星辰洞察', feral:'血爪洞察', resto:'林地洞察',
  };
  const supportSpecs = new Set(['discipline','holy','restoration','resto']);
  const dotSpecs = new Set(['fire','shadow','assassination','survival','affliction','destruction','balance','feral']);
  const precisionSpecs = new Set(['arms','fury','marks','subtlety','ret','arcane','frost','element']);
  for (const [clsKey, cls] of Object.entries(CLASSES)) {
    if (!cls || !Array.isArray(cls.trees)) continue;
    for (const tree of cls.trees) {
      if (!tree || tree._skillWeaknessTalent) continue;
      tree._skillWeaknessTalent = true;
      const keyName = clsKey === 'paladin' && tree.key === 'holy' ? 'holy_paladin' : (clsKey === 'paladin' && tree.key === 'prot' ? 'prot_paladin' : tree.key);
      const support = supportSpecs.has(tree.key) || (clsKey === 'paladin' && tree.key === 'holy') || (tree.key === 'prot' && (clsKey === 'warrior' || clsKey === 'paladin'));
      const dot = dotSpecs.has(tree.key);
      const precision = precisionSpecs.has(tree.key);
      tree.talents.push({
        key: `skill_weakness_${clsKey}_${tree.key}`,
        name: names[keyName] || '弱点洞察',
        desc: `弱点洞察更强: ${support ? '灵魂弱点治疗和护盾提高 20%' : (dot ? '创口弱点 DOT 提高 20%' : '弱点利用追击提高 18%')}, 揭露效率提高,利用时返还资源。`,
        req: 112,
        max: 1,
        fx: {
          type:'skillWeakness',
          weaknessDmgPct:support ? 8 : (precision ? 20 : 18),
          weaknessDotPct:dot ? 20 : 8,
          weaknessSupportPct:support ? 20 : 6,
          weaknessRevealPct:precision ? 22 : 16,
          weaknessResource:2
        }
      });
    }
  }
})();

(function extendSkillPrepTalents() {
  if (typeof CLASSES === 'undefined') return;
  const names = {
    arms:'战技蓄势', fury:'怒潮蓄势', prot:'盾阵蓄势',
    arcane:'魔网蓄势', fire:'燃烬蓄势', frost:'寒流蓄势',
    discipline:'赎罪蓄势', holy:'圣歌蓄势', shadow:'虚空蓄势',
    assassination:'毒刃蓄势', combat:'乱舞蓄势', subtlety:'暗幕蓄势',
    bm:'兽群蓄势', marks:'狙击蓄势', survival:'野火蓄势',
    element:'雷霆蓄势', enhancement:'风怒蓄势', restoration:'潮汐蓄势',
    holy_paladin:'圣光蓄势', prot_paladin:'壁垒蓄势', ret:'裁决蓄势',
    affliction:'腐蚀蓄势', demonology:'军团蓄势', destruction:'混乱蓄势',
    balance:'星轨蓄势', feral:'血爪蓄势', resto:'林地蓄势',
  };
  const supportSpecs = new Set(['discipline','holy','restoration','resto']);
  const dotSpecs = new Set(['fire','shadow','assassination','survival','affliction','destruction','balance','feral']);
  const burstSpecs = new Set(['arms','fury','arcane','frost','marks','ret','element','destruction']);
  for (const [clsKey, cls] of Object.entries(CLASSES)) {
    if (!cls || !Array.isArray(cls.trees)) continue;
    for (const tree of cls.trees) {
      if (!tree || tree._skillPrepTalent) continue;
      tree._skillPrepTalent = true;
      const keyName = clsKey === 'paladin' && tree.key === 'holy' ? 'holy_paladin' : (clsKey === 'paladin' && tree.key === 'prot' ? 'prot_paladin' : tree.key);
      const support = supportSpecs.has(tree.key) || (clsKey === 'paladin' && tree.key === 'holy') || (tree.key === 'prot' && (clsKey === 'warrior' || clsKey === 'paladin'));
      const dot = dotSpecs.has(tree.key);
      const burst = burstSpecs.has(tree.key);
      tree.talents.push({
        key: `skill_prep_${clsKey}_${tree.key}`,
        name: names[keyName] || '技能蓄势',
        desc: `技能蓄势更强: ${support ? '救援/壁垒收招提高 20%' : (dot ? '腐蚀收招 DOT 提高 20%' : '收招追击提高 18%')}, 蓄势效率提高,收招时返还资源。`,
        req: 118,
        max: 1,
        fx: {
          type:'skillPrep',
          prepDmgPct:support ? 8 : (burst ? 20 : 18),
          prepDotPct:dot ? 20 : 8,
          prepSupportPct:support ? 20 : 6,
          prepGainPct:burst ? 22 : 16,
          prepResource:2
        }
      });
    }
  }
})();

(function extendSkillOverloadTalents() {
  if (typeof CLASSES === 'undefined') return;
  const names = {
    arms:'战吼过载', fury:'狂怒过载', prot:'盾墙导流',
    arcane:'奥能过载', fire:'燃爆过载', frost:'寒冰过载',
    discipline:'赎罪导流', holy:'圣光导流', shadow:'虚空过载',
    assassination:'毒刃过载', combat:'剑刃过载', subtlety:'暗影过载',
    bm:'兽群过载', marks:'弹道过载', survival:'野火过载',
    element:'元素过载', enhancement:'风怒过载', restoration:'潮汐导流',
    holy_paladin:'圣光过载', prot_paladin:'壁垒导流', ret:'裁决过载',
    affliction:'痛苦过载', demonology:'恶魔过载', destruction:'混乱过载',
    balance:'星辰过载', feral:'血爪过载', resto:'林地导流',
  };
  const supportSpecs = new Set(['discipline','holy','restoration','resto']);
  const dotSpecs = new Set(['fire','shadow','assassination','survival','affliction','destruction','balance','feral']);
  const burstSpecs = new Set(['arcane','frost','element','destruction','arms','fury','ret','marks']);
  for (const [clsKey, cls] of Object.entries(CLASSES)) {
    if (!cls || !Array.isArray(cls.trees)) continue;
    for (const tree of cls.trees) {
      if (!tree || tree._skillOverloadTalent) continue;
      tree._skillOverloadTalent = true;
      const keyName = clsKey === 'paladin' && tree.key === 'holy' ? 'holy_paladin' : (clsKey === 'paladin' && tree.key === 'prot' ? 'prot_paladin' : tree.key);
      const support = supportSpecs.has(tree.key) || (clsKey === 'paladin' && tree.key === 'holy') || (tree.key === 'prot' && (clsKey === 'warrior' || clsKey === 'paladin'));
      const dot = dotSpecs.has(tree.key);
      const burst = burstSpecs.has(tree.key);
      tree.talents.push({
        key: `skill_overload_${clsKey}_${tree.key}`,
        name: names[keyName] || '技能过载',
        desc: `技能过载更强: ${support ? '导流治疗和护盾提高 20%' : (dot ? '腐蚀余震 DOT 提高 20%' : '过载余震追击提高 18%')}, 过载积累效率提高,导流时返还资源。`,
        req: 124,
        max: 1,
        fx: {
          type:'skillOverload',
          overloadDmgPct:support ? 8 : (burst ? 20 : 18),
          overloadDotPct:dot ? 20 : 8,
          overloadSupportPct:support ? 20 : 6,
          overloadGainPct:burst ? 22 : 16,
          overloadResource:2
        }
      });
    }
  }
})();

(function extendSkillResourceTalents() {
  if (typeof CLASSES === 'undefined') return;
  const names = {
    arms:'怒流回路', fury:'狂怒回流', prot:'盾卫回流',
    arcane:'魔力回路', fire:'燃烬回流', frost:'寒流回路',
    discipline:'赎罪回路', holy:'圣光回流', shadow:'虚空回流',
    assassination:'毒能回流', combat:'乱舞回流', subtlety:'暗影回流',
    bm:'兽群回流', marks:'弹药回路', survival:'野火回流',
    element:'元素回路', enhancement:'漩涡回流', restoration:'潮汐回路',
    holy_paladin:'圣能回路', prot_paladin:'壁垒回流', ret:'裁决回流',
    affliction:'灵魂回流', demonology:'军团回流', destruction:'余烬回路',
    balance:'星能回路', feral:'血爪回流', resto:'林地回路',
  };
  const supportSpecs = new Set(['discipline','holy','restoration','resto']);
  const dotSpecs = new Set(['fire','shadow','assassination','survival','affliction','destruction','balance','feral']);
  const burstSpecs = new Set(['arcane','frost','element','destruction','arms','fury','ret','marks']);
  for (const [clsKey, cls] of Object.entries(CLASSES)) {
    if (!cls || !Array.isArray(cls.trees)) continue;
    for (const tree of cls.trees) {
      if (!tree || tree._skillResourceTalent) continue;
      tree._skillResourceTalent = true;
      const keyName = clsKey === 'paladin' && tree.key === 'holy' ? 'holy_paladin' : (clsKey === 'paladin' && tree.key === 'prot' ? 'prot_paladin' : tree.key);
      const support = supportSpecs.has(tree.key) || (clsKey === 'paladin' && tree.key === 'holy') || (tree.key === 'prot' && (clsKey === 'warrior' || clsKey === 'paladin'));
      const dot = dotSpecs.has(tree.key);
      const burst = burstSpecs.has(tree.key);
      tree.talents.push({
        key: `skill_resource_${clsKey}_${tree.key}`,
        name: names[keyName] || '资源回路',
        desc: `资源回路更强: ${support ? '支援导流治疗和护盾提高 20%' : (dot ? '腐蚀回路 DOT 提高 20%' : '回路追击提高 18%')}, 回路形成效率提高,导流返还更多资源。`,
        req: 130,
        max: 1,
        fx: {
          type:'skillResource',
          resourceDmgPct:support ? 8 : (burst ? 20 : 18),
          resourceDotPct:dot ? 20 : 8,
          resourceSupportPct:support ? 20 : 6,
          resourceGainPct:burst ? 22 : 16,
          resourceReturn:2
        }
      });
    }
  }
})();

(function extendSkillHarvestTalents() {
  if (typeof CLASSES === 'undefined') return;
  const names = {
    arms:'处决战果', fury:'屠戮战果', prot:'反击战果',
    arcane:'坍缩战果', fire:'燃烬斩获', frost:'碎冰斩获',
    discipline:'赎罪战果', holy:'圣光战果', shadow:'虚空收割',
    assassination:'毒刃收割', combat:'剑舞斩获', subtlety:'暗影斩获',
    bm:'兽群猎获', marks:'精准猎获', survival:'荒野猎获',
    element:'风暴猎获', enhancement:'风怒猎获', restoration:'潮汐战果',
    holy_paladin:'圣光裁决', prot_paladin:'壁垒裁决', ret:'裁决战果',
    affliction:'痛苦收割', demonology:'恶魔战果', destruction:'混乱收割',
    balance:'星界收割', feral:'血爪收割', resto:'林地战果',
  };
  const supportSpecs = new Set(['discipline','holy','restoration','resto']);
  const dotSpecs = new Set(['fire','shadow','assassination','survival','affliction','destruction','balance','feral']);
  const burstSpecs = new Set(['arms','fury','arcane','frost','marks','element','enhancement','ret','destruction','feral']);
  for (const [clsKey, cls] of Object.entries(CLASSES)) {
    if (!cls || !Array.isArray(cls.trees)) continue;
    for (const tree of cls.trees) {
      if (!tree || tree._skillHarvestTalent) continue;
      tree._skillHarvestTalent = true;
      const keyName = clsKey === 'paladin' && tree.key === 'holy' ? 'holy_paladin' : (clsKey === 'paladin' && tree.key === 'prot' ? 'prot_paladin' : tree.key);
      const support = supportSpecs.has(tree.key) || (clsKey === 'paladin' && tree.key === 'holy') || (tree.key === 'prot' && (clsKey === 'warrior' || clsKey === 'paladin'));
      const dot = dotSpecs.has(tree.key);
      const burst = burstSpecs.has(tree.key);
      tree.talents.push({
        key: `skill_harvest_${clsKey}_${tree.key}`,
        name: names[keyName] || '斩获连锁',
        desc: `斩获连锁更强: ${support ? '灵魂战果治疗和护盾提高 20%' : (dot ? '腐蚀战果 DOT 与扩散提高 20%' : '终局追猎追击提高 18%')}, 战果积累效率提高,消耗战果时返还资源。`,
        req: 136,
        max: 1,
        fx: {
          type:'skillHarvest',
          harvestDmgPct:support ? 8 : (burst ? 20 : 18),
          harvestDotPct:dot ? 20 : 8,
          harvestSupportPct:support ? 20 : 6,
          harvestGainPct:burst ? 22 : 16,
          harvestResource:2
        }
      });
    }
  }
})();

(function extendSkillPactTalents() {
  if (typeof CLASSES === 'undefined') return;
  const names = {
    arms:'血战契约', fury:'狂怒血契', prot:'壁垒誓契',
    arcane:'奥能契约', fire:'燃烬契约', frost:'寒霜契约',
    discipline:'赎罪誓契', holy:'圣光誓契', shadow:'虚空契约',
    assassination:'毒刃虚契', combat:'剑刃血契', subtlety:'暗影虚契',
    bm:'兽群役契', marks:'猎命契约', survival:'荒野役契',
    element:'风暴契约', enhancement:'风怒血契', restoration:'潮汐誓契',
    holy_paladin:'圣光誓契', prot_paladin:'守护誓契', ret:'裁决血契',
    affliction:'痛苦虚契', demonology:'军团役契', destruction:'混乱契约',
    balance:'星界契约', feral:'血爪血契', resto:'林地誓契',
  };
  const supportSpecs = new Set(['discipline','holy','restoration','resto']);
  const dotSpecs = new Set(['fire','shadow','assassination','survival','affliction','destruction','balance']);
  const commandSpecs = new Set(['bm','demonology','survival']);
  const burstSpecs = new Set(['arms','fury','arcane','frost','marks','element','enhancement','ret','destruction','feral']);
  for (const [clsKey, cls] of Object.entries(CLASSES)) {
    if (!cls || !Array.isArray(cls.trees)) continue;
    for (const tree of cls.trees) {
      if (!tree || tree._skillPactTalent) continue;
      tree._skillPactTalent = true;
      const keyName = clsKey === 'paladin' && tree.key === 'holy' ? 'holy_paladin' : (clsKey === 'paladin' && tree.key === 'prot' ? 'prot_paladin' : tree.key);
      const support = supportSpecs.has(tree.key) || (clsKey === 'paladin' && tree.key === 'holy') || (tree.key === 'prot' && (clsKey === 'warrior' || clsKey === 'paladin'));
      const dot = dotSpecs.has(tree.key);
      const command = commandSpecs.has(tree.key);
      const burst = burstSpecs.has(tree.key);
      tree.talents.push({
        key: `skill_pact_${clsKey}_${tree.key}`,
        name: names[keyName] || '契约代价',
        desc: `契约代价更强: ${support ? '誓契赎约治疗和护盾提高 20%' : (command ? '役契协同和追击提高 20%' : (dot ? '虚契 DOT 与扩散提高 20%' : '赎约追击提高 18%'))}, 签约层数提高,赎约时返还资源。`,
        req: 142,
        max: 1,
        fx: {
          type:'skillPact',
          pactDmgPct:support ? 8 : (command || burst ? 20 : 18),
          pactDotPct:dot ? 20 : 8,
          pactSupportPct:support ? 20 : 6,
          pactGainPct:burst || command ? 22 : 16,
          pactResource:2
        }
      });
    }
  }
})();
