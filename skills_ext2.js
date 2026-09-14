/* =========================================================
   skills_ext2.js — 职业差异化: 基础/专精技能机制补全
   --------------------------------------------------------
   现状: 9职业共84个伤害技能是"纯X倍伤害", 职业之间没有机制身份。
   本文件给每个职业的裸技能注入职业签名机制(只用现有执行器字段):
     战士 = 破甲 + 眩晕压制
     法师 = 元素状态附着(不稳定/冻结/易碎) → 引爆元素反应
     牧师 = 暗影持续伤害 + 赎罪印记(转护盾)
     盗贼 = 必暴 + 毒药 + 流血
     猎人 = 猎人印记/猎伤标记 + 范围射击
     萨满 = 减速 + 震击 + 不稳定
     圣骑士 = 审判圣印 + 范围清算
     术士 = 多重暗影/邪能DOT + 吸血
     德鲁伊 = 自然持续伤害 + 缠绕减速 + 范围
   只补没有 fx/机制的裸技能; 已有 fx 联动的技能(巨人之击等)不动。
   ========================================================= */
(function classIdentitySkills() {
  if (typeof CLASSES === 'undefined') return;

  /* 职业签名机制补丁: { classKey: { skillName: patch } } */
  const P = {
    warrior: {
      '破甲攻击': { debuff:'sunder', desc:'3倍攻击, 降低敌人防御15秒并叠加破甲印记' },
      '碎裂投掷': { debuff:'sunder', desc:'4倍远程攻击, 降低防御15秒' },
      '盾牌猛击': { stun:true, stunMs:800, desc:'伤害并短暂震慑目标' },
      '盾牌冲锋': { stun:true, stunMs:900, slow:true, desc:'冲锋撞击, 眩晕并减速' },
      '碎颅打击': { stun:true, stunMs:1000, desc:'重锤碎颅, 较长眩晕' },
      '复仇':     { aoe:true, desc:'复仇反击, 波及周围敌人' },
      '压制':     { alwaysCrit:true, desc:'对失衡目标的压制, 必定暴击' },
      '怒击':     { lifeSteal:0.1, desc:'狂怒一击, 吸取生命' },
    },
    mage: {
      '奥术飞弹':   { fx:{ applyTargetState:'unstable', stateDurationMs:9000 }, desc:'奥术飞弹使目标能量失衡, 可被奥术技能引爆' },
      '奥术弹幕':   { aoe:true, fx:{ applyTargetState:'unstable', stateDurationMs:9000 }, desc:'弹幕打击全体并使目标失衡' },
      '冰枪术':     { slow:true, fx:{ applyTargetState:'brittle', stateDurationMs:8000 }, desc:'冰枪冻脆目标, 减速并标记易碎' },
      '奥术冲击':   { slow:true, fx:{ applyTargetState:'unstable', stateDurationMs:9000 }, desc:'奥术冲击减速并使目标失衡' },
      '大法师之触': { slow:true, fx:{ applyTargetState:'unstable', stateDurationMs:10000 }, desc:'接触即失衡, 减速并标记' },
      '奥术涌动':   { slow:true, desc:'奥术涌动减速目标' },
      '冰风暴':     { aoe:true, slow:true, fx:{ applyTargetState:'frozen', stateDurationMs:7000 }, desc:'冰风暴冻结全体并减速' },
    },
    priest: {
      '惩击':     { fx:{ applyTargetState:'penanceMark', stateDurationMs:10000 }, desc:'神圣惩击留下赎罪印记, 后续伤害转护盾' },
      '心灵震爆': { fx:{ applyTargetState:'penanceMark', stateDurationMs:10000 }, desc:'震爆心灵并留下赎罪印记, 叠加疯狂' },
      '暗言术·灭': { alwaysCrit:true, desc:'暗影处决, 对重创目标必定暴击' },
      '虚空爆发': { fx:{ applyTargetState:'voidTorn', stateDurationMs:9000 }, desc:'虚空裂口在目标身上撕开, 暗影技能会扩散' },
      '惩罚':     { dot:true, fx:{ dotName:'暗影噬咬', dotIcon:'🌑', dotPct:0.15, dotMs:6000 }, desc:'3倍伤害, 6秒暗影噬咬' },
      '教派分歧': { slow:true, desc:'信仰分歧动摇目标, 减速' },
      '精神鞭笞': { dot:true, fx:{ dotName:'精神鞭笞', dotIcon:'🌑', dotPct:0.14, dotMs:7000 }, desc:'7倍持续鞭笞, 7秒暗影折磨' },
    },
    rogue: {
      '邪恶打击': { dot:true, fx:{ dotName:'邪恶毒素', dotIcon:'🐍', dotPct:0.1, dotMs:5000 }, desc:'打击并涂毒, 5秒毒素侵蚀' },
      '背刺':     { alwaysCrit:true, desc:'从背后刺入, 必定暴击' },
      '绞喉':     { dot:true, fx:{ dotName:'绞喉流血', dotIcon:'🩸', dotPct:0.16, dotMs:8000 }, desc:'锁喉不放, 8秒流血' },
      '致命投掷': { slow:true, desc:'投掷利刃减速目标' },
      '奉毒':     { dot:true, fx:{ dotName:'致命毒药', dotIcon:'🐍', dotPct:0.15, dotMs:7000 }, desc:'7倍淬毒伤害, 7秒毒药侵蚀' },
      '暗袭':     { alwaysCrit:true, desc:'暗影中的袭击, 必定暴击' },
      '毁伤':     { alwaysCrit:true, desc:'双匕毁伤, 必定暴击' },
      '剑刃冲刺': { aoe:true, slow:true, desc:'剑刃冲刺穿透并减速周围敌人' },
      '君王之灾': { aoe:true, dot:true, fx:{ dotName:'君王之毒', dotIcon:'☠️', dotPct:0.14, dotMs:8000 }, desc:'范围灾祸, 8秒毒素蔓延' },
      '幽暗之刃': { dot:true, fx:{ dotName:'幽暗侵蚀', dotIcon:'🌑', dotPct:0.12, dotMs:6000 }, desc:'幽暗之刃侵蚀, 6秒暗影伤害' },
    },
    hunter: {
      '猎人印记': { fx:{ applyTargetState:'marked', stateDurationMs:12000 }, desc:'标记目标12秒, 精准射击对其造成额外伤害' },
      '奥术射击': { fx:{ applyTargetState:'unstable', stateDurationMs:9000 }, desc:'奥术箭矢使目标能量失衡' },
      '杀戮射击': { alwaysCrit:true, desc:'终结一击, 必定暴击' },
      '弹幕射击': { aoe:true, desc:'弹幕覆盖, 打击全体敌人' },
      '万兽奔腾': { aoe:true, desc:'召唤兽群践踏全体敌人' },
      '协同猛攻': { aoe:true, desc:'与宠物协同猛攻全体敌人' },
      '奇美拉射击': { slow:true, dot:true, fx:{ dotName:'奇美拉毒炎', dotIcon:'🐲', dotPct:0.12, dotMs:7000 }, desc:'双重元素伤害, 减速并灼烧' },
      '倒刺射击': { dot:true, fx:{ dotName:'倒刺撕裂', dotIcon:'🩸', dotPct:0.13, dotMs:7000 }, desc:'倒刺箭矢, 7秒流血' },
      '精确射击': { fx:{ applyTargetState:'huntWound', stateDurationMs:10000 }, desc:'精确打击撕开猎伤, 后续射击更致命' },
      '猫鼬撕咬': { alwaysCrit:true, desc:'雷霆般的反咬, 必定暴击' },
    },
    shaman: {
      '闪电箭':   { slow:true, desc:'闪电麻痹, 减速目标' },
      '雷霆风暴': { stun:true, stunMs:900, aoe:true, desc:'雷霆震慑全体敌人' },
      '风暴打击': { alwaysCrit:true, desc:'风暴之力灌注, 必定暴击' },
      '大地震击': { slow:true, desc:'大地裂震, 减速目标' },
      '熔岩猛击': { dot:true, fx:{ dotName:'熔岩灼烧', dotIcon:'🌋', dotPct:0.13, dotMs:7000 }, desc:'7倍伤害, 7秒熔岩灼烧' },
      '元素冲击': { aoe:true, fx:{ applyTargetState:'unstable', stateDurationMs:9000 }, desc:'四元素冲击全体并使目标失衡' },
    },
    paladin: {
      '审判':     { fx:{ applyTargetState:'judged', stateDurationMs:12000 }, desc:'审判目标12秒, 裁决与神圣风暴对其增伤' },
      '正义之锤': { aoe:true, desc:'重锤震荡, 波及周围敌人' },
      '神圣愤怒': { aoe:true, dot:true, fx:{ dotName:'圣焰灼烧', dotIcon:'🔥', dotPct:0.12, dotMs:7000 }, desc:'神圣之怒灼烧全体' },
      '圣殿裁决': { alwaysCrit:true, desc:'圣殿的最终裁决, 必定暴击' },
      '愤怒之锤': { dot:true, fx:{ dotName:'圣焰烙印', dotIcon:'🔥', dotPct:0.12, dotMs:7000 }, desc:'掷出愤怒之锤, 7秒圣焰灼烧' },
      '正义盾击': { stun:true, stunMs:800, desc:'盾击震慑目标' },
      '公正之剑': { slow:true, desc:'公正之剑减速目标' },
      '最终清算': { aoe:true, alwaysCrit:true, desc:'最终清算全体, 必定暴击' },
    },
    warlock: {
      '暗影箭':   { dot:true, fx:{ dotName:'暗影侵蚀', dotIcon:'🌑', dotPct:0.15, dotMs:7000 }, desc:'7倍暗影伤害, 7秒侵蚀' },
      '烧尽':     { dot:true, fx:{ dotName:'烈焰吞噬', dotIcon:'🔥', dotPct:0.14, dotMs:7000 }, desc:'烈焰吞噬目标, 7秒灼烧' },
      '邪能狂涌': { aoe:true, desc:'邪能洪流倾泻全体敌人' },
      '恶魔之箭': { lifeSteal:0.15, desc:'恶魔之箭, 吸取生命' },
      '古尔丹之手': { aoe:true, dot:true, fx:{ dotName:'古尔丹之咒', dotIcon:'💜', dotPct:0.13, dotMs:7000 }, desc:'范围邪术, 7秒诅咒灼烧' },
      '燃烧':     { dot:true, fx:{ dotName:'邪能燃烧', dotIcon:'🔥', dotPct:0.16, dotMs:8000 }, desc:'8倍邪能燃烧, 8秒灼烧' },
    },
    druid: {
      '愤怒':     { dot:true, fx:{ dotName:'自然之怒', dotIcon:'🌿', dotPct:0.12, dotMs:6000 }, desc:'自然之怒, 6秒自然侵蚀' },
      '星火术':   { aoe:true, desc:'星火坠落, 波及周围敌人' },
      '飓风':     { aoe:true, slow:true, desc:'飓风席卷全体并减速' },
      '新月强击': { aoe:true, desc:'新月之力打击全体' },
      '星涌术':   { alwaysCrit:true, desc:'星涌贯顶, 必定暴击' },
      '撕碎':     { dot:true, fx:{ dotName:'撕裂创伤', dotIcon:'🩸', dotPct:0.15, dotMs:7000 }, desc:'爪爪撕碎, 7秒流血创伤' },
    },
  };

  let n = 0;
  for (const classKey in P) {
    const cls = CLASSES[classKey];
    if (!cls || !cls.skills) continue;
    for (const skillName in P[classKey]) {
      const sk = Object.values(cls.skills).find(x => x && x.name === skillName);
      if (!sk || sk.type !== 'dmg') continue;
      /* 只补裸技能: 已有 fx 联动或其他机制的跳过 */
      if (sk.fx && (sk.fx.applyTargetState || sk.fx.consumeAura || sk.fx.grantAura || sk.fx.applyDotKey)) continue;
      if (sk.dot || sk.slow || sk.stun || sk.lifeSteal || sk.alwaysCrit || sk.debuff === 'sunder' || sk.stateKey) continue;
      const patch = P[classKey][skillName];
      const { desc, ...fields } = patch;
      Object.assign(sk, fields);
      if (desc) sk.desc = desc;
      n++;
    }
  }

  /* 重新生成技能描述与联动说明(技能按钮/技能页的透明化文本) */
  if (typeof syncSkillDescriptions === 'function') syncSkillDescriptions();
})();
