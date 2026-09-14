/* =========================================================
   talents_ext3.js — 天赋系统重做: 经典魔兽式三列七层
   --------------------------------------------------------
   取代旧的 35 节点/自动分支/黑话描述体系。新结构:
   - 每专精一棵树, 7层 × 3列 = 21个天赋
   - 逐层解锁: 需要在本树投入 5/10/15/20/25/30/35 点
   - 天赋效果一句话说清: 属性流 / 单技能强化 / 职业签名机制 / 核心资源融合 / 终极天赋
   - 第七层的终极天赋保留原树的"天赋解锁技能"(如压制/处刑连锁)
   兼容现有引擎字段(t.mod / t.fx / t.unlockSkill / t.req / t.max)。
   ========================================================= */
(function rebuildTalentTrees() {
  if (typeof CLASSES === 'undefined' || typeof SPEC_CORE_SYSTEMS === 'undefined') return;

  /* 职业签名: 用哪个状态体系作为机制天赋的主题 */
  const CLASS_IDENTITY = {
    warrior:  { state:'sunder',   label:'破甲',        stats:['atkPct','hpPct'] },
    mage:     { state:'unstable', label:'不稳定',      stats:['crit','atkPct'] },
    priest:   { state:'voidTorn', label:'虚空裂口',    stats:['atkPct','healBonus'] },
    rogue:    { state:'venomBloom', label:'毒花',      stats:['crit','spdPct'] },
    hunter:   { state:'marked',   label:'猎人印记',    stats:['atkPct','crit'] },
    shaman:   { state:'unstable', label:'元素失衡',    stats:['crit','atkPct'] },
    paladin:  { state:'judged',   label:'审判',        stats:['hpPct','atkPct'] },
    warlock:  { state:'doomBrand', label:'末日契印',   stats:['dotBonus','atkPct'] },
    druid:    { state:'trauma',   label:'创伤',        stats:['atkPct','hpPct'] },
  };

  const amp = (skillKey, skillName, pct, max) => ({ name: skillName + ' 强化', icon: '⭐', max: max || 5,
    desc: `「${skillName}」伤害 +${pct}%/层`, _origDesc: `「${skillName}」伤害 +${pct}%/层`,
    fx: { type: 'skillAmp', skill: skillKey, dmgPct: pct }, _origFx: { type: 'skillAmp', skill: skillKey, dmgPct: pct } });
  const stat = (name, icon, mod, max) => { const d = statDesc(mod); return { name, icon, max: max || 5, desc: d, mod, _origDesc: d, _origMod: Object.assign({}, mod) }; };
  function statDesc(mod) {
    const M = { atkPct:'攻击', crit:'暴击', hpPct:'生命', spdPct:'攻速', defPct:'防御', vers:'全能', leech:'吸血', mastery:'精通', cdReduction:'技能冷却', dotBonus:'持续伤害', healBonus:'治疗', armorPen:'护甲穿透', extraAtk:'额外攻击' };
    const parts = [];
    for (const k in mod) if (M[k]) parts.push(`${M[k]} +${mod[k]}%/层`);
    return parts.join('，') || '强化自身';
  }
  const mech = (name, icon, state, stateLabel, pct, max) => ({
    name, icon, max: max || 3,
    desc: `对[${stateLabel}]状态的目标伤害 +${pct}%/层`, _origDesc: `对[${stateLabel}]状态的目标伤害 +${pct}%/层`,
    fx: { type: 'vsState', state, dmgPct: pct }, _origFx: { type: 'vsState', state, dmgPct: pct }
  });
  const fusion = (coreName, auraKey, pct) => ({
    name: coreName + ' 共鸣', icon: '🌀', max: 3,
    desc: `你的核心资源「${coreName}」每层使伤害 +${pct}%/层`, _origDesc: `你的核心资源「${coreName}」每层使伤害 +${pct}%/层`,
    fx: { type: 'auraStackAmp', auraKey: auraKey, dmgPctPerStack: pct }, _origFx: { type: 'auraStackAmp', auraKey: auraKey, dmgPctPerStack: pct }
  });
  const vsBoss = (name, icon, pct) => ({ name, icon, max: 3, desc: `对首领伤害 +${pct}%/层`, _origDesc: `对首领伤害 +${pct}%/层`, fx: { type: 'vsBoss', dmgPct: pct }, _origFx: { type: 'vsBoss', dmgPct: pct } });

  for (const clsKey in CLASSES) {
    const cls = CLASSES[clsKey];
    const cores = SPEC_CORE_SYSTEMS[clsKey] || {};
    const identity = CLASS_IDENTITY[clsKey] || { state:'sunder', label:'破甲', stats:['atkPct','hpPct'] };
    const allDmg = Object.entries(cls.skills).filter(([k, s]) => s.type === 'dmg');
    const newTrees = [];

    for (const oldTree of (cls.trees || [])) {
      const core = cores[oldTree.key] || {};
      const genRe = core.generator || null;
      const spendRe = core.spender || null;
      const builders = genRe ? allDmg.filter(([k, s]) => genRe.test(s.name)).slice(0, 4) : [];
      const spenders = spendRe ? allDmg.filter(([k, s]) => spendRe.test(s.name)).slice(0, 4) : [];
      const pool = builders.concat(spenders).filter(([k, s]) => (s.unlockLvl || 0) <= 70);
      const capUnlocks = (oldTree.talents || []).filter(t => t.unlockSkill);

      /* 技能选择: 优先本专精签名技能, 不够用从全班池子补 */
      const pick = (i, fallbackName) => {
        const e = pool[i % Math.max(1, pool.length)];
        if (e) return e;
        const fb = allDmg.find(([k, s]) => s.name === fallbackName) || allDmg[i % Math.max(1, allDmg.length)];
        return fb || null;
      };
      const s0 = pick(0), s1 = pick(1), s2 = pick(2), s3 = pick(3), s4 = pick(4);
      const idState = core.payoff && core.payoff.state ? (Array.isArray(core.payoff.state) ? core.payoff.state[0] : core.payoff.state) : identity.state;
      const idLabel = identity.label;

      /* 经典7层结构: 每层3个天赋 */
      const talents = [
        /* 第1层 (0点): 入门属性 + 首要技能强化 */
        stat('残暴', '💪', { atkPct: 2 }, 5),
        s0 ? amp(s0[0], s0[1].name, 6, 5) : stat('坚韧', '❤️', { hpPct: 3 }, 5),
        stat('坚甲', '🛡️', { hpPct: 2, defPct: 1 }, 5),
        /* 第2层 (5点) */
        stat('致命', '🎯', { crit: 1 }, 5),
        s1 ? amp(s1[0], s1[1].name, 6, 5) : stat('迅捷', '💨', { spdPct: 1 }, 5),
        mech('战术精通', '🎺', idState, idLabel, 6, 3),
        /* 第3层 (10点) */
        s2 ? amp(s2[0], s2[1].name, 7, 5) : stat('残暴', '💪', { atkPct: 2 }, 5),
        mech('弱点洞察', '🔎', idState, idLabel, 8, 3),
        stat('吸血之刃', '🩸', { leech: 1 }, 5),
        /* 第4层 (15点) */
        s3 ? amp(s3[0], s3[1].name, 7, 5) : stat('再生', '💚', { regFlat: 2 }, 5),
        stat('急速咒文', '⚡', { cdReduction: 2 }, 3),
        fusion(core.name || '核心资源', core.key || '', 2),
        /* 第5层 (20点) */
        s4 ? amp(s4[0], s4[1].name, 8, 5) : stat('残暴', '💪', { atkPct: 2 }, 5),
        vsBoss('屠魔者', '👹', 5),
        stat('持久战意', '🔥', { vers: 1 }, 5),
        /* 第6层 (25点) */
        mech(idLabel + '大师', '💥', idState, idLabel, 10, 3),
        stat('毁灭之力', '☄️', { atkPct: 2, critdPct: 4 }, 5),
        s0 ? amp(s0[0], s0[1].name, 10, 3) : stat('坚甲', '🛡️', { hpPct: 3 }, 5),
        /* 第7层 (30点): 终极 */
        capUnlocks[0] ? { name: (cls.skills[capUnlocks[0].unlockSkill] || {}).name ? '解锁: ' + cls.skills[capUnlocks[0].unlockSkill].name : '终极解锁', icon: '🔓', max: 1, desc: '解锁强力技能: ' + ((cls.skills[capUnlocks[0].unlockSkill] || {}).desc || '').slice(0, 30), unlockSkill: capUnlocks[0].unlockSkill } : vsBoss('传奇猎手', '👑', 8),
        fusion(core.name || '核心资源', core.key || '', 4),
        stat('战争之王', '👑', { atkPct: 3, hpPct: 3 }, 5),
      ];
      /* 唯一key + 逐层解锁门槛: 第N层需要在本树投入 (N-1)*5 点 */
      talents.forEach(function(t, i){
        if (!t.key) t.key = 'tt_' + clsKey + '_' + oldTree.key + '_' + i;
        t.req = Math.floor(i / 3) * 5;
      });
      /* 第7层如果有第二个解锁技能, 替换最后一个属性天赋 */
      if (capUnlocks[1]) {
        const sk = cls.skills[capUnlocks[1].unlockSkill];
        talents[talents.length - 1] = { name: '解锁: ' + (sk ? sk.name : capUnlocks[1].unlockSkill), icon: '🔓', max: 1, desc: '解锁强力技能: ' + ((sk || {}).desc || '').slice(0, 30), unlockSkill: capUnlocks[1].unlockSkill };
      }

      newTrees.push({ key: oldTree.key, name: oldTree.name, icon: oldTree.icon, masteryDesc: oldTree.masteryDesc, talents });
    }
    if (newTrees.length) cls.trees = newTrees;
  }

  /* 自愈: 加载期间某些后期脚本会把新建天赋的 desc/mod 清空,
     DOMContentLoaded 后恢复(所有脚本此时都已执行完毕) */
  function healTalentFields() {
    let healed = 0;
    for (const clsKey in CLASSES) {
      const cls = CLASSES[clsKey];
      for (const tree of (cls.trees || [])) {
        for (const t of (tree.talents || [])) {
          if (!t || !t._origDesc) continue;
          if (typeof t.desc !== 'string' || !t.desc.trim()) { t.desc = t._origDesc; healed++; }
          if ((!t.mod || !Object.keys(t.mod).length) && t._origMod && Object.keys(t._origMod).length) { t.mod = Object.assign({}, t._origMod); healed++; }
          if ((!t.fx || !Object.keys(t.fx).length) && t._origFx && Object.keys(t._origFx).length) { t.fx = Object.assign({}, t._origFx); healed++; }
        }
      }
    }
    if (healed && typeof log === 'function') {
      try { log('🛠️ 已修复 ' + healed + ' 处天赋数据', 'info'); } catch(e) {}
    }
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', healTalentFields);
    else healTalentFields();
  }
})();
