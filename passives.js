/* =========================================================
   passives.js — 被动技能(随等级自动解锁,无需上技能栏)
   ----------------------------------------------------------
   设计:
   - 是否激活完全由等级派生(state.hero.lvl >= p.lvl),不需要存档字段
     (只用 state.passivesSeen 记录"已弹过解锁提示",避免重复刷日志)
   - 两类:
       1) mod 型:返回标准 schema,经 collectPassiveMod() 接入 combat.recomputeStats()
       2) proc 型:由 combat.js 在 击杀/命中/暴击/受击 等钩子里回调
   - 风味优先,且与「多敌战斗 / 暴击流 / 吸血流」联动
   ========================================================= */

/* 注:原先的「纯属性」被动(武器大师/钢铁之躯/致命精准/吸血鬼之触/全能宗师)
   已挪进各专精天赋树(见 talents_ext.js),由天赋点点出。此处只保留有机制的"特色"被动。 */
const PASSIVES = [
  { key:'bloodthirst',   name:'猎杀直觉',   icon:'🩸',  lvl:8,  proc:'onKillMomentum', val:1, desc:'击杀敌人后，你的下一次伤害技能必暴' },
  { key:'arcaneFlow',    name:'奥术洪流',   icon:'🔵',  lvl:12, proc:'onCritResource', val:10, desc:'每次暴击回复 10 点资源' },
  { key:'chainLightning',name:'连锁闪电',   icon:'⚡',  lvl:16, proc:'onHitChain', chance:0.15, frac:0.6, desc:'普攻 15% 几率弹射,对另一名敌人造成 60% 伤害' },
  { key:'lastStand',     name:'不灭意志',   icon:'❤️‍🔥', lvl:24, proc:'lowHpDR', threshold:0.3, dr:0.4, desc:'生命低于 30% 时,受到伤害降低 40%' },
  { key:'thorns',        name:'荆棘壁垒',   icon:'🌵',  lvl:32, proc:'reflect', frac:0.2,  desc:'将受到伤害的 20% 反弹给攻击者' },
  { key:'executioner',   name:'处决者',     icon:'☠️',  lvl:40, proc:'execute', threshold:0.2, bonus:0.5, desc:'攻击生命低于 20% 的敌人时,额外造成 50% 伤害' },
];

function passiveActive(p) { return !!(state && state.hero && state.hero.lvl >= p.lvl); }
function _passive(key) { const p = PASSIVES.find(x => x.key === key); return (p && passiveActive(p)) ? p : null; }

/* ---------- mod 型加成(接入 recomputeStats) ---------- */
function collectPassiveMod() {
  const out = { atkPct:0, hpPct:0, defPct:0, critdPct:0, spdPct:0, crit:0, leech:0, vers:0, mastery:0 };
  if (!state || !state.hero) return out;
  for (const p of PASSIVES) {
    if (p.mod && passiveActive(p)) for (const [k, v] of Object.entries(p.mod)) out[k] = (out[k] || 0) + v;
  }
  return out;
}

/* ---------- proc 型钩子(由 combat.js 调用) ---------- */
function passiveOnKill(mon) {
  const p = _passive('bloodthirst');
  if (p) {
    if (typeof grantNextSkillCrit === 'function') grantNextSkillCrit(p.val || 1);
    showFloat($('hero-emoji'), '🩸暴', '#fda4af');
  }
}
function passiveOnCrit(mon, dmg) {
  const p = _passive('arcaneFlow');
  if (p) state.resource = Math.min(state.resourceMax, state.resource + p.val);
}
function passiveOnHit(mon, dmg, ap) {
  // 连锁闪电:弹射到另一名存活敌人(与多敌战斗联动)
  const cl = _passive('chainLightning');
  if (cl && Math.random() < cl.chance) {
    const others = (typeof getAliveMonsters === 'function' ? getAliveMonsters() : state.currentMonsters.filter(m=>m.hp>0)).filter(m => m !== mon);
    if (others.length) {
      const t = others[Math.floor(Math.random() * others.length)];
      const cd = calcDmg((ap || state.hero.atk) * cl.frac, (typeof monArmor==='function'?monArmor(t):t.def), state.hero.crit, state.hero.critd, false, t.lvl, state.hero.lvl);
      t.hp -= cd.dmg; t.threat = (t.threat || 0) + cd.dmg * 0.3;
      if (typeof trackDmg === 'function') trackDmg('hero', cd.dmg);
      showFloat($('mon-emoji'), '⚡-' + cd.dmg, '#7dd3fc');
    }
  }
  // 处决者:残血目标额外伤害
  const ex = _passive('executioner');
  if (ex && mon.hp > 0 && mon.hp < mon.hpMax * ex.threshold) {
    const bonus = Math.floor(dmg * ex.bonus);
    if (bonus > 0) { mon.hp -= bonus; if (typeof trackDmg === 'function') trackDmg('hero', bonus); showFloat($('mon-emoji'), '☠️-' + bonus, '#f87171'); }
  }
}
/* 受击减伤倍率(<1 表示减伤);combat 在结算 taken 时乘上 */
function passiveDamageTakenMult() {
  const p = _passive('lastStand');
  if (p && state.hp < state.hero.hpMax * p.threshold) return 1 - p.dr;
  return 1;
}
/* 荆棘:把受到伤害的一部分反弹给攻击者 */
function passiveOnTakeDamage(attacker, taken) {
  const p = _passive('thorns');
  if (p && attacker && attacker.hp > 0) { const r = Math.floor(taken * p.frac); if (r > 0) attacker.hp -= r; }
}

/* ---------- 解锁提示 ---------- */
function passiveCheckUnlocks() {
  if (!state) return;
  if (!state.passivesSeen) state.passivesSeen = {};
  const firstRun = state._passivesInit !== true;   // 首次(加载存档)只静默标记,避免一次性刷屏
  for (const p of PASSIVES) {
    if (passiveActive(p) && !state.passivesSeen[p.key]) {
      state.passivesSeen[p.key] = true;
      if (!firstRun && typeof log === 'function') log(`🌟 解锁被动【${p.name}】: ${p.desc}`, 'legend');
    }
  }
  state._passivesInit = true;
}

/* ---------- 渲染(技能页底部) ---------- */
function renderPassives() {
  const root = $('passive-list'); if (!root) return;
  const lvl = (state.hero && state.hero.lvl) || 1;
  const unlocked = PASSIVES.filter(passiveActive).length;
  let html = `<div class="muted" style="margin:10px 0 6px;border-top:1px solid var(--border);padding-top:8px">
    🌟 被动技能 <span style="color:var(--accent)">${unlocked}</span>/${PASSIVES.length} <span style="font-size:10px">(随等级自动解锁,常驻生效)</span></div>`;
  for (const p of PASSIVES) {
    const on = passiveActive(p);
    html += `<div class="skill-row" style="display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:8px;margin-bottom:4px;background:var(--panel-2);opacity:${on?1:0.5}">
      <div style="font-size:22px">${p.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:bold;font-size:12px">${p.name}
          ${on ? '<span style="color:#1eff00;font-size:10px">● 已激活</span>' : `<span class="muted" style="font-size:10px">🔒 Lv.${p.lvl} 解锁</span>`}</div>
        <div class="muted" style="font-size:10px;line-height:1.3">${p.desc}</div>
      </div>
    </div>`;
  }
  root.innerHTML = html;
}
