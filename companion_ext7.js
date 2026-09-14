/* =========================================================
   companion_ext7.js — 新技能机制分配
   --------------------------------------------------------
   配合 combat.js 新增的执行器字段:
   hits(多段连击, 后续段55%) / armorPen(护甲穿透, 上限60%)
   interrupt(打断Boss读条) / silence+silenceMs(沉默, 阻止施法与技巧)
   selfDamagePct(施法自伤, 高风险高回报)
   按技能名全局应用, 同步更新描述。
   ========================================================= */
(function applyNewSkillMechanics() {
  if (typeof COMPANIONS === 'undefined') return;

  const PATCHES = {
    /* ---- 打断系: 坦克/圣骑士能在Boss读条时自动打断 ---- */
    '正义锤击': { interrupt: true, desc: '3.5倍伤害并短暂震慑; Boss读条时自动打断' },
    '战争冲锋': { interrupt: true, stun: true, stunMs: 700, desc: '3倍伤害眩晕, 并打断Boss读条' },
    '圣令审判': { interrupt: true, heal: 0.06, healTarget: 'hero', desc: '3.5倍伤害打断读条, 并治疗主角' },
    '督军斩':   { debuff: 'sunder', interrupt: true, desc: '3.8倍伤害破甲, Boss读条时自动打断' },
    '哨兵反击': { interrupt: true, desc: '3.6倍伤害, 可打断Boss读条' },
    '木盾猛击': { interrupt: true, desc: '2倍伤害, 民兵也会喊"打断施法!' },
    '蛛王重刺': { debuff: 'sunder', interrupt: true, desc: '4倍伤害破甲, 可打断Boss读条' },
    '炽焰审判': { interrupt: true, desc: '3倍伤害, 可打断Boss读条' },

    /* ---- 沉默系: 法系控制, 阻止Boss施法与技巧 ---- */
    '秘法风暴': { splashPct: 0.5, slow: true, silence: true, silenceMs: 5000, desc: '5.5倍伤害波及并减速, 沉默5秒' },
    '轶事冲击': { stateKey: 'marked', stateMs: 8000, bonusVsState: 0.18, silence: true, silenceMs: 4000, desc: '3.5倍伤害标记8秒, 并沉默4秒' },
    '睡眠诅咒': { slow: true, slowMs: 3000, silence: true, silenceMs: 4000, desc: '3.8倍伤害, 诅咒沉默4秒' },
    '冰霜新星': { slow: true, stun: true, stunMs: 700, silence: true, silenceMs: 3000, desc: '3.6倍伤害冻结并沉默3秒' },
    '冰霜之球': { silence: true, silenceMs: 4000, desc: '4倍伤害, 冰封施法能力4秒' },
    '审判之炎': { dotPct: 0.1, dotMs: 6000, silence: true, silenceMs: 3000, desc: '3.5倍伤害, 圣炎灼烧并沉默3秒' },
    '月刃术':   { slow: true, silence: true, silenceMs: 3000, desc: '3倍伤害, 月刃沉默3秒' },
    '烈焰风暴': { splashPct: 0.55, dotPct: 0.1, dotMs: 6000, silence: true, silenceMs: 3000, desc: '3.8倍伤害波及灼烧, 沉默3秒' },
    '提瑞斯法新星': { splashPct: 0.45, silence: true, silenceMs: 3000, desc: '4.2倍伤害, 新星沉默3秒' },

    /* ---- 多段连击系: 刺客连击 ---- */
    '暗影突袭': { alwaysCrit: true, hits: 2, desc: '3.5倍必暴, 连击两段' },
    '宿命双刺': { executeBonus: 0.3, executeThreshold: 0.4, hits: 3, desc: '4.2倍伤害三连刺, 对残血极强' },
    '背刺':     { alwaysCrit: true, hits: 2, desc: '3倍必暴, 双匕连刺' },
    '暗杀标记': { alwaysCrit: true, hits: 2, desc: '3.5倍必暴双击' },
    '连环刀':   { executeBonus: 0.25, executeThreshold: 0.35, hits: 3, desc: '3倍伤害三连刀, 对残血更强' },
    '灰舌连斩': { hits: 3, desc: '3.8倍伤害三连斩' },
    '协同撕咬': { executeBonus: 0.22, executeThreshold: 0.4, hits: 2, desc: '3倍伤害, 狼群两段围猎' },
    '湮灭':     { lifeSteal: 0.15, hits: 2, desc: '3.5倍伤害两段, 吸取生命' },

    /* ---- 护甲穿透系: 重击无视护甲 ---- */
    '大地的裂变': { armorPen: 0.35, splashPct: 0.55, dotPct: 0.26, dotMs: 10000, desc: '6.6倍伤害无视35%护甲, 熔岩灼烧全场' },
    '熔火审判':   { armorPen: 0.3, splashPct: 0.65, stun: true, stunMs: 1000, dotPct: 0.24, dotMs: 10000, desc: '6倍伤害无视30%护甲, 灼烧并震慑' },
    '军团之怒':   { armorPen: 0.3, splashPct: 0.6, stun: true, stunMs: 1200, desc: '6.2倍伤害无视30%护甲并震慑' },
    '斩首':       { armorPen: 0.3, desc: '6倍伤害, 无视30%护甲的处刑' },
    '圣物震击':   { debuff: 'sunder', armorPen: 0.25, desc: '4.5倍伤害破甲并穿透25%护甲' },
    '末日流星':   { stun: true, stunMs: 1000, armorPen: 0.25, desc: '5.5倍伤害眩晕, 无视25%护甲' },

    /* ---- 自伤系: 狂战士的双刃剑 ---- */
    '血吼横扫': { selfDamagePct: 0.03, desc: '4.2倍伤害, 以自身3%生命为祭' },
    '野性撕咬': { lifeSteal: 0.12, selfDamagePct: 0.025, desc: '3.8倍伤害吸血, 但撕咬时自损' },
    '混沌打击': { selfDamagePct: 0.03, desc: '6.2倍伤害, 恶魔之力反噬自身' },
    '深渊重击': { lifeSteal: 0.25, selfDamagePct: 0.03, desc: '4.5倍伤害吸血, 深渊之力侵蚀肉体' },
    '鲁莽':     { desc: '10秒攻击攻速提升, 狂战不顾防御', selfDamagePct: 0.02 },
  };

  let n = 0;
  for (const c of COMPANIONS) {
    if (!Array.isArray(c.skills)) continue;
    for (const sk of c.skills) {
      const p = sk && PATCHES[sk.name];
      if (!p) continue;
      const { desc, ...fields } = p;
      Object.assign(sk, fields);
      if (desc) sk.desc = desc;
      n++;
    }
  }
})();
