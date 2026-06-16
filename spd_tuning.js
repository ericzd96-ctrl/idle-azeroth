/* =========================================================
   spd_tuning.js — 攻速稀有化:源数值归一化(2026-06-15 平衡性重构)
   ----------------------------------------------------------
   背景:攻速曾遍布天赋/装备词缀/宝石/神器/觉醒/坐骑/随从,堆叠后战斗节奏失衡。
   做法:把以上所有"被动来源"的 spdPct/spd 加成统一降到 30%,并同步改写 tooltip 文案,
        做到"显示=实际"(WYSIWYG)。本文件在所有数据文件之后、render/main 之前加载,
        在加载期就地修改各数据容器(每次刷新都是新数据,跑一次即可,WeakSet 防重复)。
   不受影响:技能增益(风怒/嗜血/急速射击/时光倒流/狂暴等)走 state.buffs / BUFF_FX 的
        独立乘法(spdMul),不是 spdPct,故保持满值——攻速主要靠技能爆发期获得。
   配套:combat.js recomputeStats 里的全局 spdPct 缩放已改回 1(不再隐藏缩放),
        攻速硬上限保持 2.5。
   ========================================================= */
(function () {
  const SCALE = 0.3;
  const f = n => Math.round(n * SCALE * 10) / 10;   // 1 位小数,显示与数值一致
  // 改写 desc 里的攻速数字:支持 "攻速 +N%"(数字在后) 与 "+N% 攻速"(数字在前)
  function fixDesc(s) {
    if (typeof s !== 'string') return s;
    s = s.replace(/(攻速\s*\+\s*)(\d+(?:\.\d+)?)/g, (m, p, n) => p + f(+n));
    s = s.replace(/(\+\s*)(\d+(?:\.\d+)?)(\s*%\s*攻速)/g, (m, p, n, suf) => p + f(+n) + suf);
    return s;
  }
  const seen = new WeakSet();
  // 通用递归:任何带 mod.spdPct / bonus.spdPct 的节点都缩放,并修正同级 desc
  function walk(o) {
    if (!o || typeof o !== 'object' || seen.has(o)) return;
    seen.add(o);
    if (Array.isArray(o)) { o.forEach(walk); return; }
    let touched = false;
    if (o.mod && typeof o.mod === 'object' && typeof o.mod.spdPct === 'number') { o.mod.spdPct = f(o.mod.spdPct); touched = true; }
    if (o.bonus && typeof o.bonus === 'object' && typeof o.bonus.spdPct === 'number') { o.bonus.spdPct = f(o.bonus.spdPct); touched = true; }
    if (o.stats && typeof o.stats === 'object' && typeof o.stats.spdPct === 'number') { o.stats.spdPct = f(o.stats.spdPct); touched = true; }  // 命名装备(如大秘境传说)
    if (touched && typeof o.desc === 'string') o.desc = fixDesc(o.desc);
    for (const k in o) { const v = o[k]; if (v && typeof v === 'object') walk(v); }
  }

  try {
    // 天赋(含 talents_ext 注入的)、坐骑、觉醒、神器、随从(含 companion_ext 注入的 bonus)、宝石
    if (typeof CLASSES === 'object') walk(CLASSES);
    if (typeof MOUNTS !== 'undefined') walk(MOUNTS);
    if (typeof ASCEND_MILESTONES !== 'undefined') walk(ASCEND_MILESTONES);
    if (typeof ARTIFACT_TRAITS !== 'undefined') walk(ARTIFACT_TRAITS);
    if (typeof ARTIFACT_TREES !== 'undefined') walk(ARTIFACT_TREES);
    if (typeof GEM_TYPES === 'object') walk(GEM_TYPES);
    if (typeof COMPANIONS !== 'undefined') walk(COMPANIONS);
    if (typeof MYTHIC_UNIQUE_ITEMS !== 'undefined') walk(MYTHIC_UNIQUE_ITEMS);

    // 装备词缀 swift 用的是 tierVals 区间(非 mod 结构),单独取整缩放(最小 1)
    if (typeof AFFIX_POOL !== 'undefined') {
      const sw = AFFIX_POOL.find(a => a && a.mod === 'spdPct');
      if (sw && Array.isArray(sw.tierVals) && !sw._spdTuned) {
        sw.tierVals = sw.tierVals.map(([a, b]) => [Math.max(1, Math.round(a * SCALE)), Math.max(1, Math.round(b * SCALE))]);
        sw._spdTuned = true;
      }
    }
  } catch (e) { console.error('spd_tuning error:', e); }
})();

/* =========================================================
   技能描述同步:读条伤害补偿(2026-06-15)
   ----------------------------------------------------------
   castSkill 给带读条的伤害技能按 castDmgBonus(sk)=1+castTime*0.3 加伤(法系补偿),
   故把技能 desc 里的"基础倍率 N倍"改写为"实际倍率",做到显示=实际。
   只改 desc 不改 sk.mul —— 因为 getSkillCd 用 mul 算CD,改 mul 会误伤冷却。
   只处理 type==='dmg' 且 castTime>0 的技能(瞬发技能倍率不变,无需改)。
   仅精确替换 desc 中等于 mul 的"N倍"(负向后顾避免 13倍 被当成 3倍),不匹配则跳过。
   ========================================================= */
(function () {
  try {
    if (typeof CLASSES !== 'object' || typeof castDmgBonus !== 'function') return;
    const trim = v => { const r = Math.round(v * 10) / 10; return Number.isInteger(r) ? String(r) : r.toFixed(1); };
    for (const ck in CLASSES) {
      const c = CLASSES[ck]; if (!c || !c.skills) continue;
      for (const key in c.skills) {
        const sk = c.skills[key];
        if (!sk || sk.type !== 'dmg' || typeof sk.mul !== 'number' || !sk.castTime) continue;
        if (typeof sk.desc !== 'string') continue;
        const eff = sk.mul * castDmgBonus(sk);
        const mulStr = String(sk.mul).replace('.', '\\.');
        const re = new RegExp('(?<![\\d.])' + mulStr + '倍');
        if (re.test(sk.desc)) sk.desc = sk.desc.replace(re, trim(eff) + '倍');
      }
    }
  } catch (e) { console.error('skill desc tuning error:', e); }
})();

/* =========================================================
   BOSS技能描述同步:倍率 → 最大生命百分比(2026-06-15)
   ----------------------------------------------------------
   BOSS 伤害技能已改为按英雄"最大生命百分比"结算(combat.js tickCast:hpMax*min(0.45,0.06*mul)),
   不再是"N倍攻击"。故把 DUNGEONS 里 BOSS 技能 desc 的"N倍"改写为"X%最大生命"(X=min(45,6*mul)),
   与实际结算一致。仅精确替换等于 mul 的"N倍"。
   ========================================================= */
(function () {
  try {
    if (typeof DUNGEONS === 'undefined') return;
    const pct = mul => Math.min(45, Math.round(6 * mul));
    for (const dg of DUNGEONS) for (const b of (dg.bosses || [])) for (const sk of (b.skills || [])) {
      if (typeof sk.mul !== 'number' || typeof sk.desc !== 'string') continue;
      const mulStr = String(sk.mul).replace('.', '\\.');
      const re = new RegExp('(?<![\\d.])' + mulStr + '倍');
      if (re.test(sk.desc)) sk.desc = sk.desc.replace(re, pct(sk.mul) + '%最大生命');
    }
  } catch (e) { console.error('boss desc tuning error:', e); }
})();

/* =========================================================
   副属性收口(2026-06-16):暴击/暴伤/吸血/全能/极速
   ----------------------------------------------------------
   设计:这5个副属性主要靠"装备惊喜"获得(见 combat.js finishItem)。
   - 天赋(CLASSES):保留少量 暴击/暴伤 —— crit/critd/critdPct ×0.35;吸血/全能/极速 完全移除。
   - 其它来源(坐骑/随从/成就 + 神器/觉醒兜底):5个副属性全部移除(精通mastery保留)。
   宝石/附魔已在 enhance.js 直接改成精通/主属性;装备(含大秘传说装)不在此处理,惊喜照常。
   同时改写/删除 desc 里对应的"暴击/暴伤/吸血/全能/极速 +N%"文案,做到显示=实际。
   TALENT_CRIT_SCALE 可调。
   ========================================================= */
(function () {
  const TALENT_CRIT_SCALE = 0.35;     // 天赋保留的暴击/暴伤比例(其余靠装备惊喜)
  const sc = (n, s) => Math.round(n * s * 10) / 10;
  const ALL5 = ['crit', 'critd', 'critdPct', 'leech', 'vers', 'haste'];
  const LABEL = { 暴击: 'crit', 暴伤: 'critd', 吸血: 'leech', 全能: 'vers', 极速: 'haste' };
  // 删除 desc 中提到指定标签的子句(按 · / , / ， 切分,丢弃含标签的段,重接)
  function dropClauses(desc, labels) {
    const parts = desc.split(/\s*·\s*|，|,/);
    const kept = parts.map(p => p.trim()).filter(p => p && !labels.some(l => p.includes(l)));
    return kept.join(' · ');
  }
  // 天赋模式:暴击/暴伤数字 ×scale;吸血/全能/极速 子句删除
  function fixTalentDesc(desc) {
    if (typeof desc !== 'string') return desc;
    desc = desc.replace(/(暴击\s*\+\s*)(\d+(?:\.\d+)?)/g, (m, p, n) => p + sc(+n, TALENT_CRIT_SCALE));
    desc = desc.replace(/(暴伤\s*\+\s*)(\d+(?:\.\d+)?)/g, (m, p, n) => p + sc(+n, TALENT_CRIT_SCALE));
    return dropClauses(desc, ['吸血', '全能', '极速']);
  }
  function modObj(o, mode) {   // 处理一个 mod/bonus/stat 对象,返回是否改动
    if (!o || typeof o !== 'object') return false;
    let t = false;
    if (mode === 'talent') {
      for (const k of ['crit', 'critd', 'critdPct']) if (typeof o[k] === 'number') { o[k] = sc(o[k], TALENT_CRIT_SCALE); t = true; }
      for (const k of ['leech', 'vers', 'haste']) if (k in o) { delete o[k]; t = true; }
    } else {
      for (const k of ALL5) if (k in o) { delete o[k]; t = true; }
    }
    return t;
  }
  function makeWalk(mode) {
    const seen = new WeakSet();
    return function walk(o) {
      if (!o || typeof o !== 'object' || seen.has(o)) return;
      seen.add(o);
      if (Array.isArray(o)) { o.forEach(walk); return; }
      let t = false;
      if (o.mod && typeof o.mod === 'object') t = modObj(o.mod, mode) || t;
      if (o.bonus && typeof o.bonus === 'object') t = modObj(o.bonus, mode) || t;
      if (o.stat && typeof o.stat === 'object') t = modObj(o.stat, mode) || t;
      if (o.stats && typeof o.stats === 'object') t = modObj(o.stats, mode) || t;   // 命名装备(大秘传说装)用 stats
      if (t && typeof o.desc === 'string') o.desc = (mode === 'talent') ? fixTalentDesc(o.desc) : dropClauses(o.desc, Object.keys(LABEL));
      for (const k in o) { if (k === 'mod' || k === 'bonus' || k === 'stat' || k === 'stats') continue; const v = o[k]; if (v && typeof v === 'object') walk(v); }
    };
  }
  try {
    if (typeof CLASSES === 'object') makeWalk('talent')(CLASSES);   // 天赋:保留少量暴击/暴伤,移除吸血/全能/极速
    const removeWalk = makeWalk('remove');
    if (typeof MOUNTS !== 'undefined') removeWalk(MOUNTS);
    if (typeof COMPANIONS !== 'undefined') removeWalk(COMPANIONS);
    if (typeof ACHIEVEMENTS !== 'undefined') removeWalk(ACHIEVEMENTS);     // 成就奖励 reward.stat
    if (typeof ASCEND_MILESTONES !== 'undefined') removeWalk(ASCEND_MILESTONES);   // 兜底(已手改)
    if (typeof ARTIFACT_TRAITS !== 'undefined') removeWalk(ARTIFACT_TRAITS);       // 兜底(已手改)
    if (typeof ARTIFACT_MILESTONES !== 'undefined') removeWalk(ARTIFACT_MILESTONES);
    if (typeof MYTHIC_UNIQUE_ITEMS !== 'undefined') removeWalk(MYTHIC_UNIQUE_ITEMS);   // 大秘传说装也不预设副属性,统一靠惊喜roll(限定装备暴击)
  } catch (e) { console.error('secondary-attr tuning error:', e); }
})();
