/* =========================================================
   companion_combo.js — 随从协同技
   ---------------------------------------------------------
   出战随从 + 支援随从组成搭档时, 每隔一段时间自动触发合体技:
   - 指定搭档(如 乌瑟尔+达里安)有专属高倍率协同技
   - 其余任意组合按"角色对"触发通用协同技(坦克/输出/治疗)
   结算完全复用随从伤害/治疗/增益现有通道, 不引入新数值体系。
   ========================================================= */
(function companionCombo() {
  const NAMED_COMBOS = [
    { pair:['uther','darion'],      name:'圣暗协奏', icon:'⚖️', cd:20000, kind:'dmg', mul:5.0, extra:'heal3' },
    { pair:['illidan','maiev'],     name:'千年追猎', icon:'🦉', cd:22000, kind:'dmg', mul:5.4 },
    { pair:['lichking','kelthuzad'],name:'天灾寒疫', icon:'❄️', cd:22000, kind:'dmg', mul:5.0, extra:'dot' },
    { pair:['grommash','garrosh'],  name:'战歌血脉', icon:'🩸', cd:25000, kind:'buff', buff:'berserk', dur:10000 },
    { pair:['fordring','uther'],    name:'白银之手', icon:'✋', cd:24000, kind:'heal', heal:0.12 },
    { pair:['medivh','khadgar'],    name:'守护者共振', icon:'🔮', cd:21000, kind:'dmg', mul:4.8 },
    { pair:['jaina','kael'],        name:'元素共鸣', icon:'🌀', cd:21000, kind:'dmg', mul:4.8 },
    { pair:['ysera','alexstrasza'], name:'龙后姐妹', icon:'🐉', cd:23000, kind:'heal', heal:0.1 },
  ];
  const ROLE_COMBOS = {
    'tank|dps':  { name:'掩护冲击', icon:'🛡️', cd:26000, kind:'dmg', mul:3.6 },
    'dps|tank':  { name:'破阵突袭', icon:'⚔️', cd:26000, kind:'dmg', mul:3.8 },
    'dps|dps':   { name:'双子齐射', icon:'💥', cd:26000, kind:'dmg', mul:4.0 },
    'dps|heal':  { name:'火力掩护', icon:'💉', cd:26000, kind:'dmg', mul:3.2, extra:'heal3' },
    'heal|dps':  { name:'涌泉庇护', icon:'💚', cd:26000, kind:'heal', heal:0.08 },
    'tank|heal': { name:'铁壁圣光', icon:'✨', cd:26000, kind:'heal', heal:0.08 },
    'heal|tank': { name:'涌泉庇护', icon:'💚', cd:26000, kind:'heal', heal:0.08 },
    'tank|tank': { name:'铜墙铁壁', icon:'🧱', cd:26000, kind:'heal', heal:0.06 },
  };
  const _lastFire = {};
  let _lastPairSig = '';

  function comboFor(activeTpl, supportTpl){
    if (!activeTpl || !supportTpl) return null;
    for (const c of NAMED_COMBOS) {
      if ((activeTpl.key === c.pair[0] && supportTpl.key === c.pair[1]) ||
          (activeTpl.key === c.pair[1] && supportTpl.key === c.pair[0])) {
        return Object.assign({ roleKey: null }, c);
      }
    }
    const rk = (activeTpl.role || 'dps') + '|' + (supportTpl.role || 'dps');
    const rc = ROLE_COMBOS[rk];
    return rc ? Object.assign({ roleKey: rk }, rc) : null;
  }

  window.companionComboFor = comboFor;

  window.tickCompanionCombo = function (now) {
    if (typeof document === 'undefined' || document.hidden) return;
    if (!state.companions || !state.companions.length) return;
    const modes = ['world','dungeon','boss','mythic','tower','worldboss','roguelike'];
    if (!modes.includes(state.mode)) return;
    const act = state.companions[state.activeCompanion];
    if (!act) return;
    const supportKey = (state.companionSupport || [])[0];
    if (!supportKey) { _lastPairSig = ''; return; }
    const actTpl = COMPANIONS.find(c => c.key === act.key);
    const supTpl = COMPANIONS.find(c => c.key === supportKey);
    if (!actTpl || !supTpl) return;
    const combo = comboFor(actTpl, supTpl);
    if (!combo) { _lastPairSig = ''; return; }
    // 搭档变化提示
    const pairSig = actTpl.key + '+' + supTpl.key;
    if (pairSig !== _lastPairSig) {
      _lastPairSig = pairSig;
      _lastFire[combo.name] = 0;
      log(`✨ 协同技就绪【${combo.icon}${combo.name}】(${actTpl.name} + ${supTpl.name}), 战斗中周期触发`, 'good');
    }
    // 出战随从倒地时不触发
    if (typeof compDowned === 'function' && compDowned()) return;
    if ((state._compStunUntil || 0) > now) return;
    if (now - (_lastFire[combo.name] || 0) < combo.cd) return;
    const mon = (state.currentMonsters || []).find(m => m && m.hp > 0);
    if (!mon) return;
    _lastFire[combo.name] = now;
    const st = (typeof computeCompanionStats === 'function') ? computeCompanionStats() : null;
    if (!st) return;
    fireCombo(combo, st, mon);
  };

  function fireCombo(combo, st, mon) {
    if (combo.kind === 'dmg') {
      const mul = combo.mul || 3.5;
      let anyCrit = false, anyDealt = 0;
      for (const m of targets(mon)) {
        const cd = calcDmg(Math.floor(st.atk * mul), monArmor(m), st.crit, st.critd, false, m.lvl, state.hero.lvl);
        const dealt = absorbMonsterBarrier(m, cd.dmg, st.emoji).remaining;
        m.hp -= dealt;
        if (dealt > 0) {
          anyCrit = anyCrit || cd.crit;
          anyDealt += dealt;
          trackDmg('comp', dealt, cd.crit, combo.name);
          showMonsterFloat(m, `${combo.icon}${combo.name} -${fmt(dealt)}`, '#fde68a', allySideFloatOpts({ variant: cd.crit ? 'crit' : 'comp', scale: 1.1 }));
          const _te = monsterFloatAnchor(m);
          if (_te && typeof showBasicAttackFx === 'function') showBasicAttackFx($('comp-mini'), _te, { actor: 'companion', crit: cd.crit, scale: 1.1 });
        }
      }
      if (combo.extra === 'heal3') healPair(st, 0.03);
      if (anyDealt > 0 && typeof playSfx === 'function') playSfx(anyCrit ? 'crit' : 'loot');
    } else if (combo.kind === 'heal') {
      healPair(st, combo.heal || 0.08);
    } else if (combo.kind === 'buff') {
      state.buffs = state.buffs || {};
      state.buffs[combo.buff || 'berserk'] = Date.now() + (combo.dur || 10000);
      if (typeof recomputeStats === 'function') recomputeStats();
      showFloat($('hero-emoji'), `${combo.icon}${combo.name}`, '#fbbf24', { variant: 'buff', scale: 1.04 });
      log(`✨ 协同技【${combo.icon}${combo.name}】: ${actName()} 气势如虹!`, 'good');
      if (typeof playSfx === 'function') playSfx('epic');
    }
    function actName(){ const a = state.companions[state.activeCompanion]; const t = a && COMPANIONS.find(c => c.key === a.key); return t ? t.name : '随从'; }
    function targets(primary){ return [primary]; }
  }
  function healPair(st, pct) {
    const hHero = Math.floor((state.hero.hpMax || 1) * pct);
    state.hp = Math.min(state.hero.hpMax || 1, state.hp + hHero);
    const comp = state.companions[state.activeCompanion];
    if (comp && (state._compHp || 0) > 0 && st.hpMax) state._compHp = Math.min(st.hpMax, state._compHp + Math.floor(st.hpMax * pct));
    showFloat($('hero-emoji'), `✨+${fmt(hHero)}`, '#6ee7b7', { variant: 'heal', scale: 1.02 });
    log(`✨ 协同治疗 +${fmt(hHero)}`, 'good');
    if (typeof playSfx === 'function') playSfx('loot');
  }
})();
