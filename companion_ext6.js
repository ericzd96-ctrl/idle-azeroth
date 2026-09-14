/* =========================================================
   companion_ext6.js — 随从技能机制多样化
   --------------------------------------------------------
   现状: 大量技能是"纯X倍伤害", 缺乏机制差异。
   本文件按技能名对全部随从的技能打机制补丁(在 midgame_ext
   归一化之后加载), 只使用现有执行器支持的字段:
   灼烧(dotPct/dotMs) 减速(slow/slowMs) 眩晕(stun/stunMs)
   溅射(splashPct) 吸血(lifeSteal) 必暴(alwaysCrit)
   斩杀(executeBonus/Threshold) 破甲(debuff:'sunder')
   标记(stateKey:'marked'+bonusVsState) 对首领(bonusVsBoss)
   反哺治疗(heal/healTarget) —— 不引入新执行器。
   ========================================================= */
(function upgradeCompanionSkills() {
  if (typeof COMPANIONS === 'undefined') return;

  const PATCHES = {
    /* ---- 通用填充技能(全员受益) ---- */
    '致命打击': { stun: true, stunMs: 700, desc: '3倍伤害并短暂震慑目标' },
    '神圣震击': { splashPct: 0.3, desc: '3倍神圣伤害波及周围, 并小幅治疗主角' },

    /* ---- 第一批扩编(ext2) ---- */
    '跃击':     { stun: true, stunMs: 600, slow: true, desc: '2.2倍伤害扑倒目标, 短暂减速' },
    '手雷投掷': { splashPct: 0.45, desc: '3倍伤害, 手雷爆炸波及周围敌人' },
    '惩击':     { heal: 0.05, healTarget: 'hero', desc: '2.5倍神圣伤害, 并治疗主角5%生命' },
    '湮灭':     { lifeSteal: 0.15, desc: '3.5倍伤害, 吸取生命' },
    '冰链':     { slowMs: 3000, desc: '3倍冰霜伤害, 显著减速' },
    '督军打击': { debuff: 'sunder', desc: '3.5倍伤害并破甲, 为团队铺伤' },
    '正义锤击': { stun: true, stunMs: 700, desc: '3.5倍伤害并短暂震慑' },
    '游侠标记': { stateKey: 'marked', stateMs: 8000, bonusVsState: 0.2, desc: '3.5倍伤害并标记目标8秒, 全队对其伤害+20%' },
    '穿云一箭': { executeBonus: 0.3, executeThreshold: 0.3, desc: '5倍伤害, 对30%血以下目标极强' },
    '考古炸药': { splashPct: 0.5, desc: '3.5倍伤害, 炸药波及周围' },
    '圣物震击': { debuff: 'sunder', desc: '4.5倍伤害并破甲' },
    '黑锋斩':   { lifeSteal: 0.18, desc: '3.5倍伤害, 吸取生命' },
    '凋零缠绕': { dotPct: 0.12, dotMs: 6000, desc: '4倍伤害, 附加6秒凋零' },
    '星火术':   { splashPct: 0.4, desc: '3.5倍星光伤害, 波及周围' },
    '月火灼烧': { dotPct: 0.14, dotMs: 8000, desc: '4倍伤害, 8秒月火灼烧' },
    '霜狼撕咬': { slow: true, desc: '4.2倍伤害并减速' },
    '部族斩杀': { executeBonus: 0.35, executeThreshold: 0.4, desc: '6倍伤害, 对40%血以下目标极强' },
    '大灾变':   { splashPct: 0.55, desc: '5倍灼烧, 熔岩波及全场' },
    '裂地俯冲': { stun: true, stunMs: 900, desc: '5倍伤害并震地眩晕' },

    /* ---- 第二批扩编(ext3) ---- */
    '俯冲投掷': { splashPct: 0.35, desc: '2.2倍伤害, 空中投掷波及周围' },
    '月火术':   { dotPct: 0.1, dotMs: 6000, desc: '2.5倍伤害, 6秒月火灼烧' },
    '回旋飞斧': { splashPct: 0.4, desc: '3倍伤害, 飞斧回旋波及周围' },
    '连环刀':   { executeBonus: 0.25, executeThreshold: 0.35, desc: '3倍伤害, 对残血目标更强' },
    '暗影突袭': { alwaysCrit: true, desc: '3.5倍伤害, 必定暴击' },
    '剧毒匕首': { dotPct: 0.12, dotMs: 7000, desc: '3倍伤害, 7秒剧毒' },
    '精准射击': { bonusVsBoss: 0.2, desc: '3.5倍伤害, 对首领额外+20%' },
    '散弹齐发': { splashPct: 0.5, desc: '3倍伤害, 散弹波及周围' },
    '黑暗射击': { lifeSteal: 0.12, desc: '3.5倍伤害, 吸取生命' },
    '冰霜震击': { slow: true, slowMs: 3000, desc: '3倍冰霜伤害并减速' },
    '圣令审判': { heal: 0.06, healTarget: 'hero', desc: '3.5倍伤害, 并治疗主角6%' },
    '野性撕咬': { lifeSteal: 0.12, desc: '3.8倍伤害, 吸取生命' },
    '疾风扑杀': { stun: true, stunMs: 800, desc: '4.2倍伤害并短暂眩晕' },
    '大地震击': { stun: true, stunMs: 700, desc: '3.5倍伤害并震慑' },
    '轶事冲击': { stateKey: 'marked', stateMs: 8000, bonusVsState: 0.18, desc: '3.5倍伤害并标记8秒, 后续伤害+18%' },
    '历史重演': { splashPct: 0.45, desc: '4.2倍伤害, 史诗场面波及周围' },
    '月刃投掷': { splashPct: 0.4, desc: '4倍伤害, 月刃波及周围' },
    '烈焰风暴': { splashPct: 0.55, dotPct: 0.1, dotMs: 6000, desc: '3.8倍伤害, 火焰风暴波及并灼烧' },
    '巨龙吐息': { slow: true, desc: '4.8倍龙息伤害并减速' },
    '审判之炎': { dotPct: 0.1, dotMs: 6000, desc: '3.5倍伤害, 6秒圣炎灼烧' },
    '暗影爆裂': { splashPct: 0.5, desc: '5倍伤害, 暗影波及周围' },
    '末日流星': { stun: true, stunMs: 1000, desc: '5.5倍伤害, 流星坠地眩晕' },
    '地狱火雨': { splashPct: 0.55, desc: '5倍伤害, 火雨覆盖全场' },
    '巨矛穿刺': { debuff: 'sunder', desc: '5.5倍伤害并破甲' },
    '提瑞斯法新星': { splashPct: 0.45, desc: '4.2倍伤害, 新星波及周围' },
    '禁忌奥术': { lifeSteal: 0.12, desc: '4.8倍伤害, 吸取生命' },
    '蛛王重刺': { debuff: 'sunder', desc: '4倍伤害并破甲' },
    '地穴尖刺': { slowMs: 2500, desc: '4.8倍伤害, 尖刺减速' },

    /* ---- 第三批扩编(ext4) ---- */
    '火焰箭':   { dotPct: 0.08, dotMs: 5000, desc: '2.2倍伤害, 5秒小火灼烧' },
    '协同撕咬': { executeBonus: 0.22, executeThreshold: 0.4, desc: '3倍伤害, 狼群围猎残血目标' },
    '猎手标记': { stateKey: 'marked', stateMs: 8000, bonusVsState: 0.15, desc: '2.5倍伤害并标记8秒, 后续伤害+15%' },
    '荆棘鞭':   { slow: true, desc: '2.5倍伤害, 荆棘缠腿减速' },
    '雷矛冲锋': { stun: true, stunMs: 700, desc: '3.5倍伤害并短暂眩晕' },
    '霜牙撕咬': { lifeSteal: 0.1, desc: '3.5倍伤害, 吸取生命' },
    '暗杀标记': { alwaysCrit: true, desc: '3.5倍伤害, 必定暴击' },
    '法刃斩':   { splashPct: 0.35, desc: '3.5倍伤害, 法刃波及周围' },
    '月刃术':   { slow: true, desc: '3倍伤害并减速' },
    '督军斩':   { debuff: 'sunder', desc: '3.8倍伤害并破甲' },
    '战争铁锤': { stun: true, stunMs: 800, desc: '4.2倍伤害并短暂眩晕' },
    '睡眠诅咒': { slow: true, slowMs: 3000, desc: '3.8倍伤害, 诅咒使目标迟缓' },
    '宿命双刺': { executeBonus: 0.3, executeThreshold: 0.4, desc: '4.2倍伤害, 对残血目标极强' },
    '时沙迸射': { splashPct: 0.4, desc: '3.8倍伤害, 时沙波及周围' },
    '圣光怒火': { heal: 0.06, healTarget: 'hero', desc: '3.5倍伤害, 并治疗主角6%' },
    '自然怒火': { splashPct: 0.4, desc: '4.2倍伤害, 自然之怒波及周围' },
    '雷霆贯体': { stun: true, stunMs: 700, desc: '4.5倍伤害并短暂震慑' },
    '静电力场': { splashPct: 0.4, slow: true, desc: '5倍伤害, 电场波及并减速' },
    '奥术轰击': { splashPct: 0.4, desc: '4.5倍伤害, 轰击波及周围' },
    '秘法风暴': { splashPct: 0.5, slow: true, desc: '5.5倍伤害, 风暴波及并减速' },
    '潮汐重锤': { stun: true, stunMs: 800, desc: '4.2倍伤害并短暂眩晕' },
    '惊涛骇浪': { splashPct: 0.5, slow: true, desc: '5倍伤害, 巨浪波及并减速' },

    /* ---- 老随从的普通技能顺带升级 ---- */
    '愤怒':     { dotPct: 0.1, dotMs: 6000, desc: '2倍伤害, 6秒自然灼烧' },
    '星陨术':   { splashPct: 0.45, desc: '3倍伤害, 星辰波及周围' },
    '毒蛇射击': { dotPct: 0.14, dotMs: 8000, desc: '3倍伤害, 8秒毒液侵蚀' },
    '寒冰箭':   { slowMs: 3000, desc: '2.4倍伤害, 显著减速' },
    '冰霜新星': { stun: true, stunMs: 700, desc: '3.6倍伤害并短暂冻结' },
    '闪电箭':   { splashPct: 0.3, desc: '2.6倍伤害, 闪电跳跃波及' },
    '雷霆风暴': { stun: true, stunMs: 800, desc: '4.5倍伤害并震慑' },
    '冲锋':     { stun: true, stunMs: 800, desc: '2.8倍伤害并短暂眩晕' },
    '剑刃风暴': { splashPct: 0.5, desc: '5.5倍伤害, 剑刃风暴波及周围' },
    '眼棱':     { splashPct: 0.45, desc: '4.2倍必暴, 眼棱波及周围' },
    '死亡缠绕': { lifeSteal: 0.28, desc: '3.4倍伤害, 大量吸取生命' },
    '凛风冲击': { slowMs: 3000, desc: '3.4倍伤害, 显著减速' },
  };

  let patched = 0;
  for (const c of COMPANIONS) {
    if (!Array.isArray(c.skills)) continue;
    for (const sk of c.skills) {
      const p = sk && PATCHES[sk.name];
      if (!p) continue;
      const { desc, ...fields } = p;
      Object.assign(sk, fields);
      if (desc) sk.desc = desc;
      patched++;
    }
  }
  if (typeof log === 'function') {
    // 静默加载, 不刷日志
  }
})();
