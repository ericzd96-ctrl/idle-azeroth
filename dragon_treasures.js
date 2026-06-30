/* =========================================================
   dragon_treasures.js — 龙岛宝藏收藏
   ----------------------------------------------------------
   100 个账号共享宝藏:4 个龙岛区域 x 25 个长期目标。
   ========================================================= */

const DRAGON_TREASURE_MAPS = [
  { key:'waking', name:'觉醒海岸', icon:'🐲', rank:1 },
  { key:'ohnahran', name:'欧恩哈拉平原', icon:'🌾', rank:2 },
  { key:'azure_span', name:'碧蓝林海', icon:'💠', rank:3 },
  { key:'thaldraszus', name:'索德拉苏斯', icon:'⏳', rank:4 },
];

const DRAGON_TREASURE_STEPS = [
  { icon:'🧭', name:'初临航标', type:'level', goal:80, reward:{gold:18000, gem:8, essence:4} },
  { icon:'🗺️', name:'远眺测绘图', type:'level', goal:81, reward:{gold:21000, gem:9, honor:120} },
  { icon:'🪨', name:'隐岩补给匣', type:'level', goal:82, reward:{gold:24000, gem:10, essence:5} },
  { icon:'📜', name:'探险队札记', type:'level', goal:83, reward:{gold:27000, gem:11, honor:180} },
  { icon:'🔭', name:'群岛观测仪', type:'level', goal:84, reward:{gold:30000, gem:12, essence:6} },
  { icon:'🐲', name:'龙鳞密封包', type:'rep', goal:2000, reward:{gold:34000, gem:13, rep:120} },
  { icon:'🛡️', name:'守护者徽记', type:'rep', goal:4000, reward:{gold:38000, gem:14, honor:260, rep:140} },
  { icon:'💎', name:'泰坦碎晶', type:'rep', goal:6000, reward:{gold:42000, gem:16, essence:8, rep:160} },
  { icon:'🪙', name:'瓦德拉肯钱箱', type:'rep', goal:8000, reward:{gold:52000, gem:18, honor:360, rep:180} },
  { icon:'🔑', name:'守誓者钥匣', type:'rep', goal:10000, reward:{gold:62000, gem:20, essence:10, rep:220} },
  { icon:'⚔️', name:'区域首领战利品 I', type:'mapBoss', goal:1, reward:{gold:76000, gem:22, honor:520} },
  { icon:'🧱', name:'区域首领战利品 II', type:'mapBoss', goal:2, reward:{gold:86000, gem:24, essence:12} },
  { icon:'🔥', name:'区域首领战利品 III', type:'mapBoss', goal:3, reward:{gold:98000, gem:26, honor:680} },
  { icon:'🌌', name:'区域首领战利品 IV', type:'mapBoss', goal:4, reward:{gold:112000, gem:28, essence:14} },
  { icon:'👑', name:'区域首领秘藏', type:'mapBoss', goal:5, reward:{gold:140000, gem:32, honor:900, essence:16} },
  { icon:'🎯', name:'稀有猎名牌 I', type:'rare', goal:5, reward:{gold:88000, gem:24, honor:620} },
  { icon:'🧿', name:'稀有猎名牌 II', type:'rare', goal:10, reward:{gold:102000, gem:28, essence:14} },
  { icon:'📯', name:'稀有猎名牌 III', type:'rare', goal:15, reward:{gold:118000, gem:32, honor:820} },
  { icon:'⭐', name:'稀有猎名册残页', type:'rare', goal:20, reward:{gold:136000, gem:36, essence:18} },
  { icon:'🏆', name:'稀有猎名册终页', type:'rare', goal:25, reward:{gold:160000, gem:42, honor:1100, essence:22} },
  { icon:'🏰', name:'群岛副本物资 I', type:'dungeon', goal:5, reward:{gold:120000, gem:34, tickets:1} },
  { icon:'🌀', name:'群岛副本物资 II', type:'dungeon', goal:10, reward:{gold:145000, gem:40, essence:24} },
  { icon:'💠', name:'群岛副本物资 III', type:'dungeon', goal:15, reward:{gold:170000, gem:48, honor:1300} },
  { icon:'🌩️', name:'风暴讨伐储物箱', type:'worldBoss', goal:8, reward:{gold:220000, gem:60, essence:35, shards:2} },
  { icon:'💥', name:'化身秘藏', type:'raszageth', goal:1, reward:{gold:320000, gem:90, honor:2200, essence:55, shards:4} },
];

const DRAGON_TREASURES = DRAGON_TREASURE_MAPS.flatMap(map => DRAGON_TREASURE_STEPS.map((step, idx) => ({
  key: `dragon_treasure_${map.key}_${idx + 1}`,
  mapKey: map.key,
  mapName: map.name,
  mapIcon: map.icon,
  rank: map.rank,
  idx: idx + 1,
  icon: step.icon,
  name: `${map.name}·${step.name}`,
  type: step.type,
  goal: step.goal,
  reward: dragonTreasureScaleReward(step.reward, map.rank, idx + 1),
})));

function dragonTreasureScaleReward(reward, rank, idx) {
  const out = Object.assign({}, reward);
  const mul = 1 + rank * 0.08 + Math.floor((idx - 1) / 5) * 0.06;
  for (const k of ['gold','honor']) if (out[k]) out[k] = Math.round(out[k] * mul);
  for (const k of ['gem','essence','rep']) if (out[k]) out[k] = Math.round(out[k] * (1 + rank * 0.04));
  return out;
}

function ensureDragonTreasures() {
  if (!account && typeof defaultAccount === 'function') account = defaultAccount();
  if (!account.dragonTreasures) account.dragonTreasures = { claimed:{} };
  if (!account.dragonTreasures.claimed) account.dragonTreasures.claimed = {};
  return account.dragonTreasures;
}

function dragonTreasureWorldBossKeys() {
  if (typeof accountWorldBossKilledKeys === 'function') return accountWorldBossKilledKeys();
  const keys = new Set();
  const list = Array.isArray(characters) ? characters : [];
  for (const c of list.concat(state ? [state] : [])) {
    const wb = c?.worldBoss || {};
    for (const key of Object.keys(wb.lastKill || {})) if (wb.lastKill[key]) keys.add(key);
    for (const key of Object.keys(wb.stageClears || {})) if (wb.stageClears[key]) keys.add(key);
  }
  return keys;
}

function dragonTreasureProgress(t) {
  const acc = typeof accEns === 'function' ? accEns() : account;
  if (t.type === 'level') return typeof accLvl === 'function' ? accLvl() : (state?.hero?.lvl || 1);
  if (t.type === 'rep') return acc?.reputation?.['龙岛'] || 0;
  if (t.type === 'mapBoss') return acc?.bossesKilled?.[t.mapKey] || 0;
  if (t.type === 'rare') return typeof accountRareEliteTotalKills === 'function' ? accountRareEliteTotalKills() : 0;
  if (t.type === 'dungeon') return acc?.dungeonClearsTotal || 0;
  if (t.type === 'worldBoss') return typeof accountWorldBossTotalKills === 'function' ? accountWorldBossTotalKills() : 0;
  if (t.type === 'raszageth') return dragonTreasureWorldBossKeys().has('raszageth_storm') ? 1 : 0;
  return 0;
}

function dragonTreasureReqText(t) {
  if (t.type === 'level') return `账号最高等级 Lv.${t.goal}`;
  if (t.type === 'rep') return `龙岛声望 ${fmt(t.goal)}`;
  if (t.type === 'mapBoss') return `${t.mapName} 地图首领 ${t.goal} 次`;
  if (t.type === 'rare') return `稀有精英累计 ${t.goal} 次`;
  if (t.type === 'dungeon') return `副本通关累计 ${t.goal} 次`;
  if (t.type === 'worldBoss') return `世界Boss 累计 ${t.goal} 次`;
  if (t.type === 'raszageth') return `击败 莱萨杰丝·风暴化身`;
  return '未知线索';
}

function dragonTreasureRewardText(r) {
  const parts = [];
  if (r.gold) parts.push(`${fmt(r.gold)}💰`);
  if (r.gem) parts.push(`${r.gem}💎`);
  if (r.honor) parts.push(`${fmt(r.honor)}🏅`);
  if (r.essence) parts.push(`${r.essence}✨`);
  if (r.rep) parts.push(`${r.rep}🐲声望`);
  if (r.tickets) parts.push(`${r.tickets}🎟️`);
  if (r.shards) parts.push(`${r.shards}🧩`);
  return parts.join(' ');
}

function dragonTreasureClaimedCount() {
  const dt = ensureDragonTreasures();
  return DRAGON_TREASURES.filter(t => dt.claimed[t.key]).length;
}

function dragonTreasureSummary() {
  const dt = ensureDragonTreasures();
  let ready = 0;
  for (const t of DRAGON_TREASURES) {
    if (!dt.claimed[t.key] && dragonTreasureProgress(t) >= t.goal) ready++;
  }
  return { total:DRAGON_TREASURES.length, claimed:dragonTreasureClaimedCount(), ready };
}

function grantDragonTreasureReward(r) {
  if (!state) return;
  if (r.gold) state.gold += r.gold;
  if (r.gem) state.gem += r.gem;
  if (r.honor) state.honor += r.honor;
  if (r.essence) state.essence += r.essence;
  if (r.tickets) state.tickets = (state.tickets || 0) + r.tickets;
  if (r.shards) {
    if (!state.worldBoss) state.worldBoss = { lastKill:{}, shards:0, totalKilled:0, stageClears:{}, rareKills:{} };
    state.worldBoss.shards = (state.worldBoss.shards || 0) + r.shards;
  }
  if (r.rep) {
    const acc = typeof accEns === 'function' ? accEns() : account;
    acc.reputation = acc.reputation || {};
    acc.reputation['龙岛'] = (acc.reputation['龙岛'] || 0) + r.rep;
    if (typeof mountCheckReputation === 'function') mountCheckReputation();
  }
}

function claimDragonTreasure(key) {
  const dt = ensureDragonTreasures();
  const t = DRAGON_TREASURES.find(x => x.key === key);
  if (!t) return false;
  if (dt.claimed[t.key]) { log('龙岛宝藏已领取', 'info'); return false; }
  if (dragonTreasureProgress(t) < t.goal) { log('龙岛宝藏线索尚未完成', 'bad'); return false; }
  dt.claimed[t.key] = Date.now();
  grantDragonTreasureReward(t.reward);
  log(`🧭 发现龙岛宝藏「${t.name}」· ${dragonTreasureRewardText(t.reward)}`, 'legend');
  if (typeof progressionCheckAch === 'function') progressionCheckAch();
  markDirty('events','progression','hero');
  return true;
}

function claimAllDragonTreasures() {
  let count = 0;
  for (const t of DRAGON_TREASURES) {
    const dt = ensureDragonTreasures();
    if (!dt.claimed[t.key] && dragonTreasureProgress(t) >= t.goal) {
      dt.claimed[t.key] = Date.now();
      grantDragonTreasureReward(t.reward);
      count++;
    }
  }
  if (!count) { log('暂无可领取的龙岛宝藏', 'info'); return false; }
  log(`🧭 一次发现 ${count} 个龙岛宝藏`, 'legend');
  if (typeof progressionCheckAch === 'function') progressionCheckAch();
  markDirty('events','progression','hero');
  return true;
}

function renderDragonTreasureCard(t) {
  const dt = ensureDragonTreasures();
  const cur = dragonTreasureProgress(t);
  const done = cur >= t.goal;
  const claimed = !!dt.claimed[t.key];
  const pct = Math.min(100, t.goal ? cur / t.goal * 100 : 0);
  const cls = claimed ? 'claimed' : (done ? 'ready' : '');
  const btn = claimed
    ? '<span class="muted">✓已发现</span>'
    : done
      ? `<button class="gold" data-action="claimdragontreasure" data-key="${t.key}">发现</button>`
      : `<span class="muted" style="font-size:10px">${fmt(Math.min(cur, t.goal))}/${fmt(t.goal)}</span>`;
  return `<div class="dragon-treasure-card ${cls}">
    <div class="dragon-treasure-head">
      <span class="dragon-treasure-icon">${t.icon}</span>
      <b>${t.name}</b>
    </div>
    <div class="muted" style="font-size:10px">${dragonTreasureReqText(t)}</div>
    <div class="bar xp" style="height:6px;margin-top:4px"><i style="width:${pct}%"></i></div>
    <div class="dragon-treasure-foot">
      <span class="muted" style="font-size:10px">${dragonTreasureRewardText(t.reward)}</span>
      ${btn}
    </div>
  </div>`;
}

function renderDragonTreasureSub() {
  const sum = dragonTreasureSummary();
  let html = `<div class="prog-summary muted">龙岛宝藏: <b>${sum.claimed}/${sum.total}</b> · 可发现 <b style="color:var(--legend)">${sum.ready}</b>
    ${sum.ready ? `<button class="gold" data-action="claimalldragontreasures" style="margin-left:8px">一键发现 ${sum.ready}</button>` : ''}
    <div style="font-size:10px;margin-top:3px">4 个龙岛区域各 25 个宝藏,共 100 个。目标来自等级、声望、区域首领、稀有精英、副本与终局世界Boss。</div>
  </div>`;
  for (const map of DRAGON_TREASURE_MAPS) {
    const list = DRAGON_TREASURES.filter(t => t.mapKey === map.key);
    const claimed = list.filter(t => ensureDragonTreasures().claimed[t.key]).length;
    const ready = list.filter(t => !ensureDragonTreasures().claimed[t.key] && dragonTreasureProgress(t) >= t.goal).length;
    html += `<div class="dragon-treasure-section">
      <div class="dragon-treasure-section-title">${map.icon} ${map.name} <span class="muted">(${claimed}/${list.length}${ready ? ` · 可发现 ${ready}` : ''})</span></div>
      <div class="dragon-treasure-grid">${list.map(renderDragonTreasureCard).join('')}</div>
    </div>`;
  }
  return html;
}

if (typeof globalThis !== 'undefined') {
  globalThis.DRAGON_TREASURES = DRAGON_TREASURES;
  globalThis.renderDragonTreasureSub = renderDragonTreasureSub;
  globalThis.claimDragonTreasure = claimDragonTreasure;
  globalThis.claimAllDragonTreasures = claimAllDragonTreasures;
  globalThis.dragonTreasureClaimedCount = dragonTreasureClaimedCount;
}
