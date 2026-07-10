/* worldsoul.js - Radiant Echoes and Worldsoul Memory weekly campaign */
const WORLDSOUL_MEMORY_TIERS = [
  { cost: 1, name: '微光记忆', icon: '✨', rewardMult: 1, pressure: 1, desc: '低风险记忆,用于稳定获取钥匙碎片与精华。' },
  { cost: 5, name: '多重回响', icon: '💠', rewardMult: 5.4, pressure: 3, desc: '投入更多 Radiant Echo,奖励显著提升,卡雷什副本压迫同步上升。' },
  { cost: 10, name: '辐耀失序', icon: '🌌', rewardMult: 11.5, pressure: 6, desc: '最高强度记忆,一次性奖励最强,但会引来更重的裂隙压迫。' }
];

function worldsoulWeekId(now) {
  return Math.floor((now || Date.now()) / (86400000 * 7));
}

function worldsoulResetAt(now) {
  return (worldsoulWeekId(now) + 1) * 86400000 * 7;
}

function ensureWorldsoulState() {
  if (typeof account === 'undefined' || !account) return { echoes: 0, pressure: 0, weekId: worldsoulWeekId(), runs: 0, best: 0, claimed: {}, history: [] };
  if (!account.worldsoul) account.worldsoul = {};
  const ws = account.worldsoul;
  if (typeof ws.echoes !== 'number') ws.echoes = 0;
  if (typeof ws.pressure !== 'number') ws.pressure = 0;
  if (typeof ws.weekId !== 'number') ws.weekId = worldsoulWeekId();
  if (typeof ws.runs !== 'number') ws.runs = 0;
  if (typeof ws.best !== 'number') ws.best = 0;
  if (!ws.claimed || typeof ws.claimed !== 'object') ws.claimed = {};
  if (!Array.isArray(ws.history)) ws.history = [];
  if (ws.weekId !== worldsoulWeekId()) {
    ws.history.unshift({ weekId: ws.weekId, runs: ws.runs || 0, best: ws.best || 0, pressure: ws.pressure || 0 });
    ws.history = ws.history.slice(0, 5);
    ws.weekId = worldsoulWeekId();
    ws.runs = 0;
    ws.best = 0;
    ws.claimed = {};
    ws.pressure = Math.floor((ws.pressure || 0) * 0.55);
  }
  return ws;
}

function worldsoulOnBountifulCoffer(dg, tier) {
  const ws = ensureWorldsoulState();
  const gained = Math.max(1, tier >= 10 ? 2 : 1);
  ws.echoes += gained;
  if (typeof log === 'function') log(`✨ 丰裕宝匣析出 Radiant Echo +${gained}`, 'legend');
  if (typeof markDirty === 'function') markDirty('events', 'dungeon');
}

function worldsoulTierByCost(cost) {
  return WORLDSOUL_MEMORY_TIERS.find(t => t.cost === Number(cost)) || WORLDSOUL_MEMORY_TIERS[0];
}

function worldsoulPressureLevel() {
  const ws = ensureWorldsoulState();
  return Math.max(0, Math.min(12, Math.floor((ws.pressure || 0) / 2)));
}

function worldsoulEnemyAffixFor(dg) {
  if (!dg) return null;
  const key = (typeof baseDungeonKey === 'function') ? baseDungeonKey(dg.key) : dg.key;
  const affected = ['archival_assault', 'ecodome_aldani', 'manaforge_omega'].includes(key);
  if (!affected) return null;
  const lvl = worldsoulPressureLevel();
  if (lvl <= 0) return null;
  return {
    key: 'worldsoulPressure',
    name: '裂隙压迫',
    icon: '🌌',
    desc: `世界之魂记忆回响强化卡雷什敌人:小怪生命+${lvl * 5}%,首领生命+${lvl * 7}% 伤害+${lvl * 4}%。`,
    mod: { trashHp: lvl * 0.05, bossHp: lvl * 0.07, bossDmg: lvl * 0.04, addPatrol: lvl >= 4 }
  };
}

function runWorldsoulMemory(cost) {
  const tier = worldsoulTierByCost(cost);
  const ws = ensureWorldsoulState();
  if ((ws.echoes || 0) < tier.cost) {
    if (typeof log === 'function') log(`Radiant Echo 不足,需要 ${tier.cost}`, 'bad');
    return false;
  }
  ws.echoes -= tier.cost;
  ws.runs += 1;
  ws.best = Math.max(ws.best || 0, tier.cost);
  ws.pressure = Math.min(30, (ws.pressure || 0) + tier.pressure);
  const gold = Math.floor(42000 * tier.rewardMult);
  const gem = Math.floor(18 * tier.rewardMult);
  const essence = Math.floor(12 * tier.rewardMult);
  const shards = Math.floor(40 * tier.rewardMult);
  state.gold += gold;
  state.gem += gem;
  if (typeof ensureMats === 'function') ensureMats();
  state.essence = (state.essence || 0) + essence;
  if (typeof grantDelveShards === 'function') grantDelveShards(shards);
  let item = null;
  if (typeof rollItem === 'function') {
    const rarity = tier.cost >= 10 && Math.random() < 0.25 ? 'legend' : 'epic';
    item = rollItem(rarity, 100 + tier.cost, 'manaforge_omega', '诸界吞噬者迪门修斯', { minRarity: 'epic' });
    if (item) {
      if (typeof addToInventory === 'function') addToInventory(item);
      else if (state.inventory) state.inventory.push(item);
      if (typeof eventsOnItemGet === 'function') eventsOnItemGet(item);
      if (item.rarity === 'legend' && typeof progressionOnLegendary === 'function') progressionOnLegendary();
    }
  }
  if (typeof log === 'function') log(`🌌 完成世界之魂记忆[${tier.name}] 金币+${gold} 钻石+${gem} 精华+${essence} 钥匙碎片+${shards}`, 'legend');
  if (typeof markDirty === 'function') markDirty('events', 'hero', 'inventory', 'dungeon');
  if (typeof saveState === 'function') saveState();
  return item;
}

function renderWorldsoulSub() {
  const ws = ensureWorldsoulState();
  const left = Math.max(0, Math.ceil((worldsoulResetAt() - Date.now()) / 1000));
  const pressure = worldsoulPressureLevel();
  const echoIcon = typeof symbolIconHtml === 'function' ? symbolIconHtml('inv_11_0_etherealraid_communicator_color1', 16, 'Radiant Echo') : '✨';
  const tierCards = WORLDSOUL_MEMORY_TIERS.map(t => {
    const can = (ws.echoes || 0) >= t.cost;
    const hp = 18 + t.pressure * 5 + pressure * 5;
    const dmg = 12 + t.pressure * 4 + pressure * 4;
    return `<div class="worldsoul-card ${can ? 'ready' : ''}">
      <div class="worldsoul-card-head"><b>${t.icon} ${t.name}</b><span class="pill">${t.cost} Echo</span></div>
      <div class="muted">${t.desc}</div>
      <div class="worldsoul-pressure">敌方同步: 记忆敌人生命+${hp}% · 伤害+${dmg}%</div>
      <button class="${can ? 'gold' : ''}" data-action="worldsoulrun" data-cost="${t.cost}" ${can ? '' : 'disabled'}>释放回响</button>
    </div>`;
  }).join('');
  const hist = (ws.history || []).slice(0, 3).map(h => `<div class="muted">周 ${h.weekId}: ${h.runs || 0} 次 · 最高 ${h.best || 0} Echo · 压迫 ${h.pressure || 0}</div>`).join('');
  return `<div class="worldsoul-panel">
    <div class="worldsoul-title">
      <span>${echoIcon} 世界之魂记忆</span>
      <span class="muted">周重置 ${fmtCd(left)}</span>
    </div>
    <div class="worldsoul-wallet">
      <span>Radiant Echo <b>${ws.echoes || 0}</b></span>
      <span>本周记忆 <b>${ws.runs || 0}</b></span>
      <span>裂隙压迫 <b>${pressure}</b></span>
    </div>
    <div class="worldsoul-note">丰裕地下堡开启宝匣可获得 Radiant Echo。压迫会强化档案突袭、生态圆顶与法力熔炉中的敌人,用来抵消记忆奖励带来的成长。</div>
    <div class="worldsoul-grid">${tierCards}</div>
    ${hist ? `<div class="worldsoul-history">${hist}</div>` : ''}
  </div>`;
}

(function installWorldsoulHooks() {
  const oldEnter = globalThis.enterDungeon;
  if (typeof oldEnter === 'function' && !oldEnter._worldsoulWrapped) {
    function wrappedEnterDungeon(key) {
      oldEnter.apply(this, arguments);
      const ds = state?.dungeonState;
      const dg = (typeof DUNGEONS !== 'undefined' ? DUNGEONS : []).find(d => d.key === key);
      const affix = worldsoulEnemyAffixFor(dg);
      if (ds && affix && Array.isArray(ds.affixes) && !ds.affixes.some(a => a?.key === affix.key)) {
        ds.affixes.push(affix);
        if (typeof log === 'function') log(`🌌 世界之魂裂隙压迫强化了 ${dg.name}`, 'bad');
      }
    }
    wrappedEnterDungeon._worldsoulWrapped = true;
    globalThis.enterDungeon = wrappedEnterDungeon;
  }

  const oldRenderEvents = globalThis.renderEvents;
  if (typeof oldRenderEvents === 'function' && !oldRenderEvents._worldsoulWrapped) {
    function wrappedRenderEvents() {
      const root = $('tab-events'); if (!root) return;
      ensureEventState();
      checkDailyRollover();
      checkSeasonRollover();
      const head = `
        <div class="sub-tabs">
          <span class="sub-tab ${eventsSubTab==='wb'?'active':''}" data-sub="wb">🐲 世界Boss</span>
          <span class="sub-tab ${eventsSubTab==='bounty'?'active':''}" data-sub="bounty">🎯 悬赏</span>
          <span class="sub-tab ${eventsSubTab==='invasion'?'active':''}" data-sub="invasion">🛡️ 入侵</span>
          <span class="sub-tab ${eventsSubTab==='dragonTreasure'?'active':''}" data-sub="dragonTreasure">🧭 龙岛宝藏</span>
          <span class="sub-tab ${eventsSubTab==='worldsoul'?'active':''}" data-sub="worldsoul">🌌 世界之魂</span>
          ${typeof renderPhaseDivingSub === 'function' ? `<span class="sub-tab ${eventsSubTab==='phaseDiving'?'active':''}" data-sub="phaseDiving">🧿 相位潜航</span>` : ''}
          <span class="sub-tab ${eventsSubTab==='daily'?'active':''}" data-sub="daily">📅 日常</span>
          <span class="sub-tab ${eventsSubTab==='season'?'active':''}" data-sub="season">🏁 赛季</span>
        </div>`;
      let body = '';
      if (eventsSubTab === 'wb') body = renderWorldBossSub();
      else if (eventsSubTab === 'bounty') body = typeof renderBountySub === 'function' ? renderBountySub() : '<div class="prog-summary muted">悬赏载入中...</div>';
      else if (eventsSubTab === 'invasion') body = typeof renderWorldInvasionSub === 'function' ? renderWorldInvasionSub() : '<div class="prog-summary muted">世界入侵载入中...</div>';
      else if (eventsSubTab === 'dragonTreasure') body = typeof renderDragonTreasureSub === 'function' ? renderDragonTreasureSub() : '<div class="prog-summary muted">龙岛宝藏载入中...</div>';
      else if (eventsSubTab === 'worldsoul') body = renderWorldsoulSub();
      else if (eventsSubTab === 'phaseDiving' && typeof renderPhaseDivingSub === 'function') body = renderPhaseDivingSub();
      else if (eventsSubTab === 'daily') body = renderDailySub();
      else body = renderSeasonSub();
      root.innerHTML = head + body;
      if (eventsSubTab === 'wb' && typeof bindWorldBossTooltips === 'function') bindWorldBossTooltips(root);
    }
    wrappedRenderEvents._worldsoulWrapped = true;
    globalThis.renderEvents = wrappedRenderEvents;
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest && e.target.closest('button[data-action^="worldsoul"]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (btn.dataset.action === 'worldsoulrun') runWorldsoulMemory(parseInt(btn.dataset.cost, 10));
    if (typeof renderEvents === 'function') renderEvents();
  }, true);
})();
