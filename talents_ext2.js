/* =========================================================
   talents_ext2.js — 天赋系统: 循环融合 + 圣骑士树补全
   --------------------------------------------------------
   1) 输出循环融合: 每棵专精树的前4个纯属性天赋获得
      【循环融合】fx —— 专精核心资源(斩杀校准/燃点链/疯狂…)
      每层使伤害额外提升(按天赋层数缩放)。
      点满一个天赋 = 核心资源5层时伤害+6%, 直接强化输出循环。
   2) 圣骑士圣光/防护树补全: 与其他职业对齐(35节点/80+点),
      新节点全部是循环融合节点。
   依赖: SPEC_CORE_SYSTEMS(skills_ext.js), 在其后加载。
   ========================================================= */
(function talentRotationFusion() {
  if (typeof CLASSES === 'undefined' || typeof SPEC_CORE_SYSTEMS === 'undefined') return;

  const FUSION_PER_RANK = 1.2;   // 每天赋层: 核心资源每层伤害+1.2%

  for (const clsKey in CLASSES) {
    const cls = CLASSES[clsKey];
    const specCores = SPEC_CORE_SYSTEMS[clsKey] || {};
    for (const tree of (cls.trees || [])) {
      const core = specCores[tree.key];
      const coreKey = core ? core.key : null;
      const coreName = core ? core.name : null;
      if (!coreKey) continue;
      let fused = 0;
      for (const t of (tree.talents || [])) {
        if (fused >= 4) break;
        if (t.fx) continue;                    // 已有循环联动的不重复
        if (!t.mod) continue;                  // 只融合纯属性节点
        t.fx = { type: 'auraStackAmp', auraKey: coreKey, dmgPctPerStack: FUSION_PER_RANK };
        t.desc = (t.desc || '') + ' · 循环融合: 你的专精核心资源每层使伤害+1.2%，天赋每升1级再+1.2%。';
        fused++;
      }
    }
  }

  /* ---------- 圣骑士树补全 ---------- */
  const pal = CLASSES.paladin;
  if (!pal) return;
  const appendNodes = (treeKey, nodes) => {
    const tree = (pal.trees || []).find(t => t.key === treeKey);
    if (!tree || !Array.isArray(tree.talents)) return;
    const names = new Set(tree.talents.map(t => t.name));
    for (const n of nodes) {
      if (names.has(n.name)) continue;
      tree.talents.push(n);
      names.add(n.name);
    }
  };
  const mkNode = (coreLabel) => (name, icon, desc, req, auraKey, pct, max) => (
    { name, icon, desc: desc + ' · 循环融合: 专精核心资源每层使伤害+' + pct + '%，天赋每升1级再+' + pct + '%。', max: max || 1, req,
      fx: { type: 'auraStackAmp', auraKey: auraKey, dmgPctPerStack: pct } }
  );
  const nodeH = mkNode('道标折射');
  const nodeP = mkNode('奉献矩阵');
  appendNodes('holy', [
    nodeH('圣光连锁', '🔗', '圣光术式相互连锁', 18, null, 1.2),
    nodeH('道标校准', '🎯', '道标折射校准审判角度', 20, null, 1.3),
    nodeH('神恩灌注', '🌟', '神圣能量灌注输出循环', 24, null, 1.4, 3),
    nodeH('圣辉回响', '🔊', '圣辉在目标间回响', 28, null, 1.2),
    nodeH('曙光审判', '🌅', '曙光之下的审判更加致命', 32, null, 1.4),
    nodeH('圣能奔涌', '⚡', '圣能奔涌强化循环', 36, null, 1.5, 3),
    nodeH('神圣震波', '💥', '震波随道标层数增强', 40, null, 1.3),
    nodeH('圣约牢固', '📜', '圣约使道标折射更稳定', 44, null, 1.2),
    nodeH('曙光过载', '🔆', '曙光过载, 循环伤害陡增', 46, null, 1.6),
    nodeH('圣辉回路', '🔄', '圣辉回流强化循环', 48, null, 1.3, 3),
    nodeH('神恩战果', '🏆', '神恩加冕战果', 50, null, 1.4),
    nodeH('圣契铭刻', '📖', '铭刻圣契, 永久强化道标折射', 52, null, 1.5),
  ]);
  appendNodes('prot', [
    nodeP('堡垒连锁', '🔗', '壁垒压力相互连锁, 每层提升伤害', 18, null, 1.2),
    nodeP('盾墙校准', '🎯', '盾墙姿态校准奉献矩阵', 20, null, 1.3),
    nodeP('奉献灌注', '🕯️', '奉献矩阵灌注输出循环', 24, null, 1.4, 3),
    nodeP('反震回响', '💢', '反震在敌人间回响', 28, null, 1.2),
    nodeP('清算审判', '⚖️', '清算之审判更加致命', 32, null, 1.4),
    nodeP('圣能壁垒', '🛡️', '圣能壁垒强化循环', 36, null, 1.5, 3),
    nodeP('震荡制裁', '💥', '制裁震波随矩阵层数增强', 40, null, 1.3),
    nodeP('誓约坚守', '📜', '誓约使奉献矩阵更稳定', 44, null, 1.2),
    nodeP('堡垒过载', '🏰', '堡垒过载, 循环伤害陡增', 46, null, 1.6),
    nodeP('圣辉回廊', '🔄', '圣辉回廊强化循环', 48, null, 1.3, 3),
    nodeP('守护战果', '🏆', '守护者的战果', 50, null, 1.4),
    nodeP('磐石符文', '🗿', '铭刻磐石符文, 永久强化奉献矩阵', 52, null, 1.5),
  ]);
})();


/* ---------- 天赋描述白话化 ----------
   12条支线天赋的描述是模板填空生成的黑话("收招伤害/签约速度/回路形成")。
   从 fx 字段反向生成玩家能看懂的白话: 每个支线强化专精引擎的一个阶段。 */
(function plainTalentDescriptions() {
  if (typeof CLASSES === 'undefined') return;
  const PHASE = {
    skillPrep:    '铺垫技能(攒层技)',
    skillOverload:'引爆技能(满层收束技)',
    skillResource:'资源引燃',
    skillHarvest: '收割阶段(击杀收益)',
    skillPact:    '契约爆发',
    skillField:   '压场领域',
    skillRune:    '符文终结',
    skillRhythm:  '节奏循环',
    skillWeave:   '交替施法(不同类型技能连放)',
    skillControl: '控制连锁',
    skillWeakness:'弱点打击',
    skillCharge:  '蓄力技能',
  };
  for (const clsKey in CLASSES) {
    const cls = CLASSES[clsKey];
    for (const tree of (cls.trees || [])) {
      for (const t of (tree.talents || [])) {
        const fx = t.fx;
        if (fx && fx.type && PHASE[fx.type]) {
          /* 从 fx 字段生成白话 */
          const parts = [];
          for (const k in fx) {
            const v = fx[k];
            if (k === 'type' || typeof v !== 'number') continue;
            if (/DmgPct$/.test(k)) parts.push('该阶段伤害+' + v + '%');
            else if (/DotPct$/.test(k)) parts.push('持续伤害+' + v + '%');
            else if (/GainPct$/.test(k) || /ChargePct$/.test(k)) parts.push('核心资源攒层速度+' + v + '%');
            else if (/Resource$/.test(k) || /Return$/.test(k)) parts.push('引爆时返还' + v + '点资源');
            else if (/SupportPct$/.test(k)) parts.push('随从支援效果+' + v + '%');
            else if (/DurationPct$/.test(k)) parts.push('持续时间+' + v + '%');
          }
          if (parts.length) { t.desc = '强化循环的[' + PHASE[fx.type] + ']: ' + parts.join('，') + '。'; continue; }
        }
        /* 其余黑话词替换 */
        if (t.desc) {
          t.desc = t.desc
            .replace(/核心收束/g, '满层引爆')
            .replace(/收束/g, '引爆')
            .replace(/铺场速度/g, '群攻触发')
            .replace(/签约速度|回路形成|蓄势速度|铭刻速度|积拍速度/g, '攒层速度')
            .replace(/余波伤害|余震伤害/g, '追加伤害');
        }
      }
    }
  }
})();
