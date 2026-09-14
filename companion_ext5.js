/* =========================================================
   companion_ext5.js — 新随从技能层补全
   ---------------------------------------------------------
   背景: 传说技能/角色套件/品质战技都在 companion_ext.js 加载期
   应用, 只覆盖当时的46位; 之后扩编的34位被"战术补强"通用技能
   填满(总数9不变), 但缺少有辨识度的技能层。
   本文件在所有扩编之后加载, 补齐:
   1) 11位新橙色随从的传说技能(手写, 与背景呼应)
   2) 全体缺失的角色套件(_roleKit, 与老随从同表)
   3) 全体缺失的品质战技(_qualitySkill, 每人1个, 按定位)
   补层后裁掉多余的战术补强技能, 技能总数保持 ≤9。
   ========================================================= */
(function completeCompanionSkillLayers() {
  if (typeof COMPANIONS === 'undefined') return;

  /* ---------- 1. 新橙随从传说技能 ---------- */
  const NEW_LEGENDARY = {
    deathwing:  { name:'大地的裂变', icon:'🌋', type:'dmg', mul:6.6, dotPct:0.26, dotMs:10000, splashPct:0.70, cd:30, desc:'撕裂大地板块, 熔岩喷发灼烧全场敌人' },
    archimonde: { name:'军团之怒', icon:'😈', type:'dmg', mul:6.2, splashPct:0.60, stun:true, stunMs:1200, cd:30, desc:'邪能风暴撕裂天空, 震慑周围敌人' },
    mannoroth:  { name:'深渊血海', icon:'🩸', type:'dmg', mul:5.6, lifeSteal:0.35, dotPct:0.22, dotMs:10000, cd:30, desc:'血咒化作血海, 大量吸取生命并灼烧' },
    aegwynn:    { name:'提瑞斯法之怒', icon:'🌌', type:'dmg', mul:5.4, heal:0.12, splashPct:0.50, cd:30, desc:'守护者的全部奥术倾泻, 并反哺自身生命' },
    malygos:    { name:'魔网崩解', icon:'🌀', type:'dmg', mul:6.0, splashPct:0.60, slow:true, cd:30, desc:'撕开魔网, 奥术洪流减速并毁灭一切' },
    raden:      { name:'泰坦天罚', icon:'⚡', type:'dmg', mul:5.8, splashPct:0.55, stun:true, stunMs:1200, cd:30, desc:'沉睡的泰坦雷霆齐落, 震晕敌人' },
    neptulon:   { name:'潮汐王座之怒', icon:'🌊', type:'dmg', mul:5.6, splashPct:0.60, slow:true, cd:30, desc:'深渊怒潮席卷战场, 冲刷并减速敌人' },
    ysera:      { name:'翡翠梦花开', icon:'🌳', type:'heal', heal:0.32, healTarget:'smart', shieldPct:0.14, cleanse:true, cd:34, desc:'梦境之花盛放, 大量治疗并附厚盾净化' },
    freya:      { name:'蓓蕾绽放', icon:'🌸', type:'heal', heal:0.34, healTarget:'smart', shieldPct:0.16, cleanse:true, cd:34, desc:'造物者的生命之花盛开, 治疗净化一切' },
    durotan:    { name:'霜狼先祖合击', icon:'🐺', type:'dmg', mul:5.8, slow:true, lifeSteal:0.25, cd:28, desc:'霜狼先祖之魂并肩撕咬, 吸血并减速' },
    anubarak:   { name:'蛛王之茧', icon:'🕷️', type:'summon', summonCount:2, summonCap:4, summonTheme:'undead', summonDuration:30000, summonPower:1.08, shieldPct:0.12, cd:30, desc:'召来地穴甲虫军团, 并以蛛茧厚茧护体' },
  };

  /* ---------- 2. 角色套件表(与 companion_ext.js 同步) ---------- */
  const ROLE_KIT = {
    tank: [
      { name:'铁壁结界', icon:'🛡️', type:'buff', buff:'sacredShield', buffTarget:'companion', duration:8000, cd:16, desc:'8秒大幅提升自身防御与回复(纯坦克减伤)' },
      { name:'坚韧自愈', icon:'❤️‍🩹', type:'heal', heal:0.18, healTarget:'companion', cd:15, desc:'立即恢复自身18%生命(纯坦克自疗)' },
    ],
    heal: [
      { name:'迅捷祝福', icon:'💨', type:'buff', buff:'rapidFire', buffTarget:'hero', duration:9000, cd:18, desc:'9秒为主角大幅提升攻速(辅助加速)' },
      { name:'锐意号令', icon:'⚔️', type:'buff', buff:'battleShout', buffTarget:'hero', duration:10000, cd:20, desc:'10秒为主角提升攻击(辅助增伤)' },
    ],
    dps: [
      { name:'嗜血狂热', icon:'💢', type:'buff', buff:'berserk', buffTarget:'companion', duration:9000, cd:16, desc:'9秒大幅提升自身攻击与攻速(纯输出)' },
    ],
  };

  /* ---------- 3. 品质战技(每人1个, 按定位) ---------- */
  const QUALITY_SKILL_BY_ROLE = {
    dps:  { name:'压制连击', icon:'⚔️', type:'dmg', mul:4.0, bonusVsBoss:0.20, cd:10, desc:'品质战技: 4倍伤害, 对首领额外+20%' },
    tank: { name:'壁垒姿态', icon:'🛡️', type:'buff', buff:'sacredShield', buffTarget:'companion', duration:8000, cd:16, desc:'品质战技: 8秒大幅减伤' },
    heal: { name:'圣光涌泉', icon:'💧', type:'heal', heal:0.20, healTarget:'smart', cd:14, desc:'品质战技: 智能治疗最需要的目标' },
  };

  /* ---------- 应用 ---------- */
  for (const c of COMPANIONS) {
    if (!Array.isArray(c.skills)) c.skills = [];
    const q = c.quality || 'white';

    // 传说技能(仅橙)
    const legend = (q === 'orange') ? NEW_LEGENDARY[c.key] : null;
    if (legend && !c.skills.some(s => s.name === legend.name)) {
      c.skills.push(Object.assign({ _legendSkill: true }, legend));
    }

    // 角色套件
    const kit = ROLE_KIT[c.role];
    if (kit) {
      for (const ks of kit) {
        const dup = c.skills.some(s =>
          (ks.buff && s.buff === ks.buff) ||
          (ks.type === 'heal' && s.type === 'heal' && (s.healTarget || '') !== 'hero')
        );
        if (!dup) c.skills.push(Object.assign({ _roleKit: true }, ks));
      }
    }

    // 品质战技
    if (!c.skills.some(s => s._qualitySkill)) {
      const qs = QUALITY_SKILL_BY_ROLE[c.role];
      if (qs) c.skills.push(Object.assign({ _qualitySkill: true }, qs));
    }

    // 技能数均衡: 裁掉多余战术补强, 总数 ≤9
    const MAX_SKILLS = 9;
    let coverage = c.skills.filter(s => s._coverageSkill);
    if (c.skills.length > MAX_SKILLS && coverage.length > 1) {
      const removeN = Math.min(coverage.length - 1, c.skills.length - MAX_SKILLS);
      const removeSet = new Set(coverage.slice(0, removeN));
      c.skills = c.skills.filter(s => !removeSet.has(s));
    }
  }
})();
