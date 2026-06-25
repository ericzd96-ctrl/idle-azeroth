/* =========================================================
   nextgoal.js — 目标引导 / Next Goal(只读规则引擎)
   ----------------------------------------------------------
   读当前状态,动态给出最相关的几条"下一步该做什么"建议。
   每条规则返回 {prio,icon,text,tab?};按优先级取前 N 条渲染。
   渲染进 #next-goal(地图页顶部),点击可跳转对应标签页。
   ========================================================= */

/* 背包里是否存在某部位比当前更优的装备(轻量启发式:稀有度更高或空槽) */
function nextGoalHasUpgrade() {
  if (!state || !Array.isArray(state.inventory)) return false;
  const rOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legend: 4 };
  for (const it of state.inventory) {
    if (!it || !SLOT_INFO[it.slot]) continue;
    if (it.reqLvl && state.hero.lvl < it.reqLvl) continue;
    const cur = state.equipped[it.slot];
    if (!cur) return true;                                   // 空槽可补
    if ((rOrder[it.rarity] || 0) > (rOrder[cur.rarity] || 0)) return true; // 更高品质
  }
  return false;
}

function collectNextGoals() {
  const goals = [];
  const lvl = state.hero.lvl || 1;
  const maxLvl = (typeof MAX_LEVEL === 'number') ? MAX_LEVEL : 80;

  // 未分配天赋点
  if ((state.talentPoints || 0) > 0)
    goals.push({ prio: 90, icon: '🌟', text: `有 ${state.talentPoints} 点天赋点未分配,去强化角色`, tab: 'talent' });

  // 未选专精
  if (!state.specialization && lvl >= 10)
    goals.push({ prio: 95, icon: '🌀', text: '还没选择专精,选一个激活专属天赋与机制', tab: 'talent' });

  // 背包有可升级装备
  if (nextGoalHasUpgrade())
    goals.push({ prio: 80, icon: '⚡', text: '背包里有更强的装备,去「一键穿最优」', tab: 'inv' });

  // 首次免费洗点未用
  if (!state.freeRespecUsed && Object.keys(state.talents || {}).length > 0)
    goals.push({ prio: 40, icon: '♻️', text: '你还有一次免费洗点机会', tab: 'talent' });

  // 配装方案为空
  if (Array.isArray(state.loadouts) && state.loadouts.length === 0 && lvl >= 20)
    goals.push({ prio: 35, icon: '⚙️', text: '保存一套配装方案,日后一键切流派', tab: 'talent' });

  // 远征储备满
  if (typeof expeditionStorageFull === 'function' && expeditionStorageFull())
    goals.push({ prio: 70, icon: '🚩', text: '远征军团储备已满,去领取产出', tab: 'expedition' });
  else if (typeof expeditionMembers === 'function' && expeditionMembers().length === 0 && (typeof characters !== 'undefined') && characters.length < 2)
    goals.push({ prio: 20, icon: '🚩', text: '多创建一个角色,组建远征军团离线产出', tab: null });

  // 公会今日可捐
  if (typeof ensureGuildState === 'function' && typeof GUILD_DONATIONS !== 'undefined' && typeof account !== 'undefined' && account) {
    if (typeof guildRefreshDaily === 'function') guildRefreshDaily();
    const g = ensureGuildState();
    if (g && GUILD_DONATIONS.some(d => !g.donatedKeys.includes(d.key) && Object.entries(d.cost).every(([r, a]) => (account[r] || 0) >= a)))
      goals.push({ prio: 55, icon: '🏰', text: '公会今日还能捐献,攒贡献点换永久加成', tab: 'guild' });
  }

  // 黑市有可买
  if (typeof marketHasAffordableDeal === 'function' && marketHasAffordableDeal())
    goals.push({ prio: 50, icon: '🛒', text: '黑市有买得起的商品,消化盈余货币', tab: 'market' });

  // 可觉醒
  if (lvl >= ((typeof ASCEND_LEVEL_REQ === 'number') ? ASCEND_LEVEL_REQ : 80)) {
    const cost = (typeof ascendCost === 'function' && typeof account !== 'undefined') ? ascendCost(account.ascendCount || 0) : Infinity;
    if ((state.gold || 0) >= cost)
      goals.push({ prio: 85, icon: '✨', text: '已满级且金币充足,可以觉醒提升光辉值', tab: 'ascend' });
    else
      goals.push({ prio: 30, icon: '💰', text: `攒金币准备觉醒(需 ${fmt(cost)}💰)`, tab: 'ascend' });
  }

  // 升级(兜底,未满级)
  if (lvl < maxLvl)
    goals.push({ prio: 25, icon: '⚔️', text: `继续刷怪升级(Lv.${lvl}/${maxLvl}),解锁更多内容`, tab: 'map' });

  goals.sort((a, b) => b.prio - a.prio);
  return goals;
}

function renderNextGoals() {
  const el = document.getElementById('next-goal');
  if (!el || !state || !state.cls) return;
  const goals = collectNextGoals().slice(0, 4);
  if (goals.length === 0) { el.innerHTML = ''; return; }
  const rows = goals.map(g =>
    `<div data-goto="${g.tab || ''}" style="display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:6px;${g.tab ? 'cursor:pointer;' : ''}font-size:12px">
      <span style="font-size:14px">${g.icon}</span><span>${g.text}</span>${g.tab ? '<span style="margin-left:auto;color:var(--muted);font-size:11px">前往 ›</span>' : ''}
    </div>`).join('');
  el.innerHTML = `<div style="border:1px solid var(--accent);border-radius:10px;padding:8px;margin-bottom:8px;background:rgba(59,130,246,.08)">
    <div style="font-size:12px;font-weight:bold;margin-bottom:4px">🧭 接下来做什么</div>
    ${rows}
  </div>`;
}
