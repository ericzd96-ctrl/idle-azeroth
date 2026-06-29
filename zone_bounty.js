/* =========================================================
   zone_bounty.js — 区域悬赏 / Zone Bounty
   ----------------------------------------------------------
   读取现有探索、地图首领、图鉴计数，为每张地图提供一次性区域补给。
   不新增战斗结算钩子，避免和任务板/成就重复写进度。
   ========================================================= */

const ZONE_BOUNTY_BASE_HUNT = 120;

function ensureZoneBountyState() {
  if (typeof account === 'undefined' || !account) return null;
  if (!account.zoneBounties || typeof account.zoneBounties !== 'object') account.zoneBounties = { claimed:{} };
  if (!account.zoneBounties.claimed || typeof account.zoneBounties.claimed !== 'object') account.zoneBounties.claimed = {};
  return account.zoneBounties;
}

function zoneBountyMobNames(map) {
  const names = new Set();
  for (const sub of (map?.sub || [])) {
    String(sub.mobs || '').split('|').forEach(raw => {
      const name = raw.trim();
      if (name) names.add(name);
    });
  }
  return Array.from(names);
}

function zoneBountyHuntGoal(map) {
  return ZONE_BOUNTY_BASE_HUNT + Math.max(0, (map?.sub?.length || 0) - 1) * 30;
}

function zoneBountyReward(map) {
  const high = map?.lvlRange?.[1] || 1;
  const tier = Math.max(1, Math.ceil(high / 10));
  const reward = {
    gold: high * 1200,
    gem: 6 + tier * 2,
    essence: 4 + tier * 2,
  };
  if (high >= 50) reward.tickets = 1;
  return reward;
}

function zoneBountyRewardText(reward) {
  const parts = [];
  if (reward.gold) parts.push(`${fmt(reward.gold)}金币`);
  if (reward.gem) parts.push(`${reward.gem}钻石`);
  if (reward.essence) parts.push(`${reward.essence}精华`);
  if (reward.tickets) parts.push(`${reward.tickets}通用券`);
  return parts.join(' · ');
}

function zoneBountyProgress(map) {
  const acc = (typeof accEns === 'function') ? accEns() : account;
  const zb = ensureZoneBountyState();
  if (!map || !acc || !zb) return null;

  const subTotal = map.sub?.length || 0;
  let subDone = 0;
  for (let i = 0; i < subTotal; i++) {
    const key = `${map.key}-${i}`;
    if (acc.subzonesCleared?.[key] || state?.subzoneCleared?.[key]) subDone++;
  }

  const bossKills = acc.bossesKilled?.[map.key] || state?.bossesKilled?.[map.key] || 0;
  const mobNames = zoneBountyMobNames(map);
  const huntKills = mobNames.reduce((sum, name) => sum + (acc.bestiary?.[name] || 0), 0);
  const huntGoal = zoneBountyHuntGoal(map);
  const claimed = !!zb.claimed[map.key];
  const ready = !claimed && subDone >= subTotal && bossKills > 0 && huntKills >= huntGoal;

  return {
    subDone,
    subTotal,
    bossDone: bossKills > 0,
    bossKills,
    huntKills,
    huntGoal,
    claimed,
    ready,
    reward: zoneBountyReward(map),
  };
}

function zoneBountyHasClaimable() {
  if (typeof MAPS === 'undefined') return false;
  return MAPS.some(map => zoneBountyProgress(map)?.ready);
}

function zoneBountyClaimableMaps() {
  if (typeof MAPS === 'undefined') return [];
  return MAPS.filter(map => zoneBountyProgress(map)?.ready);
}

function zoneBountySummary() {
  if (typeof MAPS === 'undefined') return { total:0, claimed:0, ready:0, active:null };
  let claimed = 0;
  let ready = 0;
  let active = null;
  for (const map of MAPS) {
    const prog = zoneBountyProgress(map);
    if (!prog) continue;
    if (prog.claimed) claimed++;
    if (prog.ready) ready++;
    if (map.key === state?.currentMap) active = { map, prog };
  }
  return { total:MAPS.length, claimed, ready, active };
}

function claimZoneBounty(mapKey) {
  const map = (typeof MAPS !== 'undefined') ? MAPS.find(m => m.key === mapKey) : null;
  const prog = zoneBountyProgress(map);
  const zb = ensureZoneBountyState();
  if (!map || !prog || !zb) return;
  if (prog.claimed) { log('区域悬赏已领取', 'info'); return; }
  if (!prog.ready) { log('区域悬赏尚未完成', 'bad'); return; }

  const r = grantZoneBounty(map, prog);
  log(`🗺️ 完成区域悬赏「${map.name}」· ${zoneBountyRewardText(r)}`, 'legend');
  markDirty('map', 'hero', 'progression');
  if (typeof renderMap === 'function') renderMap();
  if (typeof renderNextGoals === 'function') renderNextGoals();
  if (typeof renderZoneBountyHub === 'function') renderZoneBountyHub();
  if (typeof saveState === 'function') saveState();
}

function grantZoneBounty(map, prog) {
  const r = prog.reward;
  if (r.gold) state.gold += r.gold;
  if (r.gem) state.gem += r.gem;
  if (r.essence) state.essence += r.essence;
  if (r.tickets) state.tickets += r.tickets;
  ensureZoneBountyState().claimed[map.key] = true;
  return r;
}

function mergeZoneBountyReward(total, reward) {
  for (const [key, value] of Object.entries(reward || {})) total[key] = (total[key] || 0) + value;
  return total;
}

function claimAllZoneBounties() {
  const maps = zoneBountyClaimableMaps();
  if (!maps.length) { log('暂无可领取的区域悬赏', 'info'); return; }
  const total = {};
  for (const map of maps) {
    const prog = zoneBountyProgress(map);
    if (!prog?.ready) continue;
    mergeZoneBountyReward(total, grantZoneBounty(map, prog));
  }
  log(`🗺️ 一键领取 ${maps.length} 个区域悬赏 · ${zoneBountyRewardText(total)}`, 'legend');
  markDirty('map', 'hero', 'progression');
  if (typeof renderMap === 'function') renderMap();
  if (typeof renderNextGoals === 'function') renderNextGoals();
  if (typeof renderZoneBountyHub === 'function') renderZoneBountyHub();
  if (typeof saveState === 'function') saveState();
}

function zoneBountyStepHtml(done, label, cur, goal) {
  const pct = goal > 0 ? Math.min(100, Math.floor(cur / goal * 100)) : 100;
  return `<div class="zone-bounty-step ${done ? 'done' : ''}">
    <div class="zone-bounty-step-head"><span>${done ? '✓' : '•'} ${label}</span><b>${fmt(Math.min(cur, goal))}/${fmt(goal)}</b></div>
    <div class="bar xp"><i style="width:${pct}%"></i></div>
  </div>`;
}

function renderZoneBountyHub() {
  const el = document.getElementById('zone-bounty-hub');
  if (!el || !state || !state.cls) return;
  const sum = zoneBountySummary();
  if (!sum.total) { el.innerHTML = ''; return; }
  const active = sum.active;
  const activeText = active
    ? `${active.map.name}: 子区 ${active.prog.subDone}/${active.prog.subTotal} · 首领 ${active.prog.bossDone ? '已击败' : '未击败'} · 猎杀 ${fmt(Math.min(active.prog.huntKills, active.prog.huntGoal))}/${fmt(active.prog.huntGoal)}`
    : '选择地图后显示当前区域进度';
  el.innerHTML = `<div class="zone-bounty-hub ${sum.ready > 0 ? 'ready' : ''}">
    <div class="zone-bounty-hub-main">
      <div>
        <div class="zone-bounty-hub-title">🗺️ 区域悬赏总览</div>
        <div class="muted">${activeText}</div>
      </div>
      <div class="zone-bounty-hub-stats">
        <span><b>${sum.claimed}</b> 已领</span>
        <span><b>${sum.ready}</b> 可领</span>
        <span><b>${sum.total}</b> 总数</span>
      </div>
    </div>
    ${sum.ready > 0 ? `<button class="gold" data-action="claimallzonebounties">一键领取 ${sum.ready} 个悬赏</button>` : ''}
  </div>`;
}

function renderZoneBounty(map) {
  const prog = zoneBountyProgress(map);
  if (!prog) return '';
  const reward = zoneBountyRewardText(prog.reward);
  const titleState = prog.claimed ? '已领取' : (prog.ready ? '可领取' : '进行中');
  const titleCls = prog.claimed ? 'claimed' : (prog.ready ? 'ready' : '');
  return `<div class="zone-bounty ${titleCls}">
    <div class="zone-bounty-title">
      <span>🗺️ 区域悬赏 <b>${titleState}</b></span>
      <span class="muted">${reward}</span>
    </div>
    ${zoneBountyStepHtml(prog.subDone >= prog.subTotal, '完成子区域', prog.subDone, prog.subTotal)}
    ${zoneBountyStepHtml(prog.bossDone, '击败地图首领', Math.min(prog.bossKills, 1), 1)}
    ${zoneBountyStepHtml(prog.huntKills >= prog.huntGoal, '区域猎杀', prog.huntKills, prog.huntGoal)}
    <button class="gold" data-action="claimzonebounty" data-map="${map.key}" ${prog.ready ? '' : 'disabled'}>${prog.claimed ? '已领取' : '领取区域补给'}</button>
  </div>`;
}
