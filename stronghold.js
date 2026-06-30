/* =========================================================
   stronghold.js - 账号共享要塞建设
   ========================================================= */

const STRONGHOLD_MAX_LEVEL = 5;
const STRONGHOLD_BUILDINGS = [
  { key:'command_hall', icon:'🏰', name:'指挥大厅', role:'统筹远征行动', base:{gold:18000, essence:12, honor:120}, mod:{xpMult:2, mastery:1}, title:'要塞统帅',
    req5:{ label:'领取 5 个职业大厅委托', cur:()=>strongholdCountClaimed('classOrders'), goal:5 } },
  { key:'barracks', icon:'⚔️', name:'军营', role:'训练常备作战队伍', base:{gold:16000, essence:10, honor:180}, mod:{atkPct:1, hpPct:1}, title:'军团训练官',
    req5:{ label:'累计击败 10000 个敌人', cur:()=>accStronghold().killsTotal||0, goal:10000 } },
  { key:'forge', icon:'🔥', name:'战争熔炉', role:'强化武器与护甲工艺', base:{gold:22000, essence:18, honor:90}, mod:{atkPct:1, defPct:1}, title:'战争铸匠',
    req5:{ label:'完成 50 次宝石/附魔/重铸', cur:()=>((accStronghold().gemsInserted||0)+(accStronghold().enchantsApplied||0)+(accStronghold().rerollsDone||0)), goal:50 } },
  { key:'mage_tower', icon:'🔮', name:'法师塔', role:'研究奥术与资源回路', base:{gold:24000, essence:24, honor:60}, mod:{mastery:3, mpPct:1}, title:'高塔研究员',
    req5:{ label:'抄录 12 篇编年史', cur:()=>strongholdCountClaimed('chronicles'), goal:12 } },
  { key:'infirmary', icon:'➕', name:'战地医馆', role:'提升持续作战和恢复能力', base:{gold:15000, essence:16, honor:80}, mod:{hpPct:2, regFlat:2}, title:'战地医官',
    req5:{ label:'通关 30 次副本', cur:()=>accStronghold().dungeonClearsTotal||0, goal:30 } },
  { key:'treasury', icon:'💰', name:'金库', role:'整理税收、仓储与采购', base:{gold:26000, essence:8, honor:60}, mod:{goldMult:3, costReduction:1}, title:'王城财务官',
    req5:{ label:'投资 4 条贸易航线', cur:()=>strongholdTradeRoutes(), goal:4 } },
  { key:'scouting_post', icon:'🧭', name:'侦察哨站', role:'标记宝藏、稀有目标和前线情报', base:{gold:20000, essence:14, honor:140}, mod:{dropMult:2, crit:1}, title:'远眺哨兵',
    req5:{ label:'寻获 25 个龙岛宝藏', cur:()=>strongholdCountClaimed('dragonTreasures'), goal:25 } },
  { key:'workshop', icon:'⚙️', name:'工程工坊', role:'改良技能装置和战斗节奏', base:{gold:21000, essence:20, honor:80}, mod:{haste:1, cdReduction:1}, title:'首席工程师',
    req5:{ label:'累计获得 500000 金币', cur:()=>accStronghold().lifetimeGold||0, goal:500000 } },
  { key:'harbor', icon:'⚓', name:'远洋码头', role:'开辟远洋补给和贸易转运', base:{gold:30000, essence:16, honor:120}, mod:{goldMult:2, dropMult:1}, title:'远洋督运官',
    req5:{ label:'投资 8 条贸易航线', cur:()=>strongholdTradeRoutes(), goal:8 } },
  { key:'observatory', icon:'✨', name:'观星台', role:'预测入侵、首领和资源潮汐', base:{gold:28000, essence:26, honor:100}, mod:{mastery:2, xpMult:1, dropMult:1}, title:'群星观测者',
    req5:{ label:'完成 5 次世界入侵', cur:()=>strongholdInvasions(), goal:5 } },
];

function accStronghold() {
  if (!account) account = defaultAccount();
  if (!account.stronghold) account.stronghold = { buildings:{}, totalUpgrades:0 };
  if (!account.stronghold.buildings) account.stronghold.buildings = {};
  if (!account.permanentStats) account.permanentStats = {};
  return account;
}

function ensureStronghold() {
  const acc = accStronghold();
  if (typeof acc.stronghold.totalUpgrades !== 'number') acc.stronghold.totalUpgrades = strongholdTotalUpgrades();
  return acc.stronghold;
}
function strongholdBuilding(key) { return STRONGHOLD_BUILDINGS.find(b => b.key === key); }
function strongholdBuildingLevel(key) { return ensureStronghold().buildings[key] || 0; }
function strongholdTotalUpgrades() {
  const sh = account?.stronghold;
  if (!sh?.buildings) return 0;
  return Object.values(sh.buildings).reduce((sum, lvl) => sum + (lvl || 0), 0);
}

function strongholdCountClaimed(field) {
  return Object.keys(accStronghold()[field]?.claimed || {}).length;
}
function strongholdTradeRoutes() {
  return Object.keys(accStronghold().market?.routes?.invested || {}).length;
}
function strongholdInvasions() {
  const inv = accStronghold().worldInvasions || {};
  return inv.totalClaims || Object.keys(inv.claimed || {}).length;
}
function strongholdWorldBossKills() {
  const wb = accStronghold().worldBoss || {};
  if (typeof wb.totalKilled === 'number') return wb.totalKilled;
  return Object.values(wb.lastKill || {}).filter(Boolean).length;
}

function strongholdCost(building, nextLevel) {
  const scale = Math.pow(nextLevel, 2);
  const late = Math.max(0, nextLevel - 3);
  return {
    gold: Math.round(building.base.gold * scale * (1 + nextLevel * 0.22)),
    essence: Math.round(building.base.essence * nextLevel * (1 + nextLevel * 0.18)),
    honor: Math.round(building.base.honor * nextLevel * (1 + nextLevel * 0.12)),
    gem: late ? late * 20 : 0,
  };
}

function strongholdLevelReq(nextLevel) {
  const base = [
    { label:'账号最高等级达到 10', cur:()=>accLvl(), goal:10 },
    { label:'账号最高等级达到 25', cur:()=>accLvl(), goal:25 },
    { label:'通关 5 次副本', cur:()=>accStronghold().dungeonClearsTotal||0, goal:5 },
    { label:'击败 5 次世界首领', cur:()=>strongholdWorldBossKills(), goal:5 },
  ];
  return base[nextLevel - 1] || null;
}
function strongholdRequirements(building, nextLevel) {
  if (nextLevel > STRONGHOLD_MAX_LEVEL) return [];
  const reqs = [];
  const base = strongholdLevelReq(nextLevel);
  if (base) reqs.push(base);
  if (nextLevel === STRONGHOLD_MAX_LEVEL && building.req5) reqs.push(building.req5);
  return reqs;
}
function strongholdReqMet(reqs) { return reqs.every(r => (r.cur() || 0) >= r.goal); }
function strongholdCanAfford(cost) {
  return (state.gold || 0) >= cost.gold
    && (state.essence || 0) >= cost.essence
    && (state.honor || 0) >= cost.honor
    && (state.gem || 0) >= cost.gem;
}
function strongholdCostText(cost) {
  const parts = [`${fmt(cost.gold)}💰`, `${cost.essence}✨`, `${cost.honor}🏅`];
  if (cost.gem) parts.push(`${cost.gem}💎`);
  return parts.join(' ');
}
function strongholdModText(mod, level = 1) {
  return Object.entries(mod || {})
    .map(([k, v]) => typeof fmtMod === 'function' ? fmtMod(k, v * level) : `${k}+${v * level}`)
    .join(' · ') || '无';
}
function strongholdSpend(cost) {
  state.gold -= cost.gold;
  state.essence -= cost.essence;
  state.honor -= cost.honor;
  if (cost.gem) state.gem -= cost.gem;
}
function strongholdApplyMod(mod) {
  const acc = accStronghold();
  for (const [k, v] of Object.entries(mod || {})) {
    acc.permanentStats[k] = (acc.permanentStats[k] || 0) + v;
  }
}

function upgradeStrongholdBuilding(key) {
  const building = strongholdBuilding(key);
  if (!building) return false;
  const sh = ensureStronghold();
  const level = strongholdBuildingLevel(key);
  if (level >= STRONGHOLD_MAX_LEVEL) { log('这座建筑已满级', 'bad'); return false; }
  const nextLevel = level + 1;
  const reqs = strongholdRequirements(building, nextLevel);
  if (!strongholdReqMet(reqs)) { log('要塞建设条件未满足', 'bad'); return false; }
  const cost = strongholdCost(building, nextLevel);
  if (!strongholdCanAfford(cost)) { log('资源不足，无法升级要塞建筑', 'bad'); return false; }

  strongholdSpend(cost);
  sh.buildings[key] = nextLevel;
  sh.totalUpgrades = strongholdTotalUpgrades();
  strongholdApplyMod(building.mod);
  if (nextLevel >= STRONGHOLD_MAX_LEVEL && typeof unlockTitle === 'function') unlockTitle(building.title);
  if (typeof recomputeStats === 'function') recomputeStats();
  if (typeof progressionCheckAch === 'function') progressionCheckAch();
  if (typeof renderStronghold === 'function') renderStronghold();
  if (typeof renderHeader === 'function') renderHeader();
  if (typeof markDirty === 'function') markDirty('hero', 'progression', 'stronghold');
  if (typeof saveState === 'function') saveState();
  log(`🏰 ${building.name} 升到 ${nextLevel} 级，获得 ${strongholdModText(building.mod)}`, 'legend');
  return true;
}

function renderStronghold() {
  const root = $('tab-stronghold');
  if (!root) return;
  const acc = accStronghold();
  const sh = ensureStronghold();
  sh.totalUpgrades = strongholdTotalUpgrades();
  const total = STRONGHOLD_BUILDINGS.length * STRONGHOLD_MAX_LEVEL;
  const maxed = STRONGHOLD_BUILDINGS.filter(b => strongholdBuildingLevel(b.key) >= STRONGHOLD_MAX_LEVEL).length;
  const strongKeys = new Set(STRONGHOLD_BUILDINGS.flatMap(b => Object.keys(b.mod || {})));
  const statText = Object.entries(acc.permanentStats || {})
    .filter(([k]) => strongKeys.has(k))
    .map(([k, v]) => typeof fmtMod === 'function' ? fmtMod(k, v) : `${k}+${v}`)
    .slice(0, 8)
    .join(' · ') || '暂无要塞加成';

  let html = `
    <div class="stronghold-head">
      <div>
        <div class="stronghold-title">🏰 要塞建设</div>
        <div class="muted">账号共享建筑成长 · 已升级 <b>${sh.totalUpgrades}</b> / ${total} · 满级建筑 <b>${maxed}</b> / ${STRONGHOLD_BUILDINGS.length}</div>
      </div>
      <div class="stronghold-res">${fmt(state.gold||0)}💰 ${state.essence||0}✨ ${state.honor||0}🏅 ${state.gem||0}💎</div>
    </div>
    <div class="stronghold-bonus">${statText}</div>
    <div class="stronghold-grid">
  `;

  for (const b of STRONGHOLD_BUILDINGS) {
    const level = strongholdBuildingLevel(b.key);
    const nextLevel = level + 1;
    const maxedOut = level >= STRONGHOLD_MAX_LEVEL;
    const reqs = strongholdRequirements(b, nextLevel);
    const reqOk = maxedOut || strongholdReqMet(reqs);
    const cost = maxedOut ? null : strongholdCost(b, nextLevel);
    const afford = maxedOut || strongholdCanAfford(cost);
    const btnDisabled = maxedOut || !reqOk || !afford;
    const reqHtml = maxedOut
      ? `<span class="good">已满级 · 称号 ${b.title}</span>`
      : reqs.map(r => {
          const cur = r.cur() || 0;
          const ok = cur >= r.goal;
          return `<span class="${ok?'good':'bad'}">${r.label}: ${fmt(Math.min(cur, r.goal))}/${fmt(r.goal)}</span>`;
        }).join('');
    html += `
      <div class="stronghold-card ${maxedOut?'is-max':''}">
        <div class="stronghold-card-top">
          <div class="stronghold-icon">${b.icon}</div>
          <div>
            <div class="stronghold-name">${b.name}</div>
            <div class="muted">${b.role}</div>
          </div>
          <div class="stronghold-level">Lv.${level}/${STRONGHOLD_MAX_LEVEL}</div>
        </div>
        <div class="stronghold-bar"><span style="width:${(level / STRONGHOLD_MAX_LEVEL) * 100}%"></span></div>
        <div class="stronghold-effect">
          <div>当前: <b>${level ? strongholdModText(b.mod, level) : '尚未建成'}</b></div>
          ${maxedOut ? '' : `<div>下级: <b>${strongholdModText(b.mod, nextLevel)}</b></div>`}
        </div>
        <div class="stronghold-req">${reqHtml}</div>
        <button class="primary" data-action="strongholdUpgrade" data-key="${b.key}" ${btnDisabled?'disabled':''}>
          ${maxedOut ? '已满级' : `升级到 ${nextLevel} 级 · ${strongholdCostText(cost)}`}
        </button>
      </div>
    `;
  }
  html += '</div>';
  root.innerHTML = html;
}

globalThis.STRONGHOLD_BUILDINGS = STRONGHOLD_BUILDINGS;
globalThis.strongholdTotalUpgrades = strongholdTotalUpgrades;
globalThis.renderStronghold = renderStronghold;
globalThis.upgradeStrongholdBuilding = upgradeStrongholdBuilding;
