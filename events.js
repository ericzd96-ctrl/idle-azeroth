/* =========================================================
   events.js — 世界Boss / 日常任务 / 赛季 三合一
   ----------------------------------------------------------
   - 世界Boss: 3只巨型怪物,8h CD,掉橙装碎片+精华
   - 日常: 每日3条随机任务,完成给资源,7连解周宝箱
   - 赛季: 14天一赛季,从战斗中累计积分,段位结算给永久属性+称号
   ========================================================= */

/* ============ 世界Boss ============ */
const WORLD_BOSSES = [
  { key:'deathwing', name:'死亡之翼·灭世者', emoji:'🐲', lvl:85, color:'#dc2626',
    desc:'被腐化的大地守护神,毁灭艾泽拉斯的元凶',
    hpMul:30, atkMul:3.5, defMul:2.5,
    rewards:{ gold:50000, gem:80, honor:2000, essence:25, shards:8 } },
  { key:'ragnaros', name:'拉格纳罗斯·火焰之王', emoji:'🔥', lvl:85, color:'#f97316',
    desc:'熔火之心的元素领主,掌控烈焰之力',
    hpMul:25, atkMul:4, defMul:2,
    rewards:{ gold:40000, gem:60, honor:2000, essence:35, shards:6 } },
  { key:'cthun',     name:'克苏恩·疯狂之眼', emoji:'👁️', lvl:85, color:'#a855f7',
    desc:'希利苏斯沉眠的远古之神,旧日支配者',
    hpMul:35, atkMul:3, defMul:3,
    rewards:{ gold:45000, gem:100, honor:2500, essence:20, shards:10 } },
];
for (const wb of WORLD_BOSSES) {
  const profile = (typeof WORLD_BOSS_SKILLSETS === 'object' && WORLD_BOSS_SKILLSETS[wb.key]) || null;
  if (profile) Object.assign(wb, profile);
}
const WBOSS_CD_HOURS = 8;
const SHARD_EXCHANGE_COST = 50; // 50 碎片 = 1 自选橙装

function ensureEventState() {
  if (!state.worldBoss) state.worldBoss = { lastKill:{}, shards:0, totalKilled:0 };
  if (!state.daily) state.daily = { resetAt:0, tasks:[], weekStreak:0, weeklyClaimedAt:0 };
  if (!state.eventsCounters) state.eventsCounters = { itemsRare:0, sessionGold:0, sessionKills:0, sessionDungeons:0 };
  // 赛季已搬到 account, 用 ensureSeason()
}

function worldBossAvailableAt(key) {
  ensureEventState();
  const last = state.worldBoss.lastKill[key] || 0;
  return last + WBOSS_CD_HOURS * 3600 * 1000;
}
function worldBossReady(key) {
  return Date.now() >= worldBossAvailableAt(key);
}

function challengeWorldBoss(key) {
  ensureEventState();
  if (!worldBossReady(key)) { log('世界BOSS冷却中', 'bad'); return; }
  if (state.mode === 'travel') { log('正在旅行中', 'bad'); return; }
  if (state.mode !== 'world') { log('请先结束当前战斗', 'bad'); return; }
  if (state.hero.lvl < 40) { log('需要等级 Lv.40+', 'bad'); return; }
  const wb = WORLD_BOSSES.find(b => b.key === key); if (!wb) return;
  state.mode = 'worldboss';
  state._currentWBoss = key;
  state.currentMonsters = [];
  state.hp = state.hero.hpMax; state.resource = state.resourceMax;
  // 生成怪物对象
  const baseHp = Math.floor((100 + wb.lvl*wb.lvl*6.0) * wb.hpMul);
  const baseAtk = Math.floor((8 + wb.lvl*3.0) * wb.atkMul);
  state.currentMonsters.push({
    name: wb.emoji + wb.name, isBoss:true, isWorldBoss:true, wbKey:key,
    bossName: wb.name,
    _uid: Date.now() + Math.floor(Math.random()*1000),
    lvl: wb.lvl, hpMax: baseHp, hp: baseHp,
    atk: Math.floor(baseAtk * (1 + (wb.passive?.atkBonus || 0))),
    def: Math.floor((3 + wb.lvl*1.3) * wb.defMul),
    baseGold: wb.rewards.gold/30, baseXp:300,
    goldReward: wb.rewards.gold, honorReward: wb.rewards.honor,
    dropRate:1.0, gemChance:0, maxRarity:'legend',
    _dots:{}, _dotLegacyImported:true, _lastDotTick:0,
    dodgeChance: wb.passive?.dodgeChance || 0.08,
    critChance: wb.passive?.critChance || 0.18,
    dmgReduction: wb.passive?.dmgReduction || 0.2,
    lifeSteal: wb.passive?.leech || 0,
    stunChance: wb.passive?.stunChance || 0,
    instantCast:true,
    _monSkills:[],
    _monSkill:null,
    _monSupportSkills: typeof buildMonsterSupportPool === 'function'
      ? buildMonsterSupportPool(wb.name, null, wb.lvl, true, wb.supportCount || 4)
      : [],
    _supportSkillCooldowns:{},
    _lastSupportSkill:Date.now()-4000
  });
  log(`⚔️ 挑战世界BOSS [${wb.name}]!`, 'epic');
  markDirty('stage','events');
}

function leaveWorldBoss() {
  state.mode = 'world';
  state._currentWBoss = null;
  state.currentMonsters = [];
  spawnMonster();
}

/* 世界Boss击杀回调(由 combat 在 onMonsterDeath 中识别 isWorldBoss 并调用) */
function onWorldBossKill(mon) {
  ensureEventState();
  const key = mon.wbKey;
  const wb = WORLD_BOSSES.find(b=>b.key===key); if (!wb) return;
  state.worldBoss.lastKill[key] = Date.now();
  state.worldBoss.totalKilled = (state.worldBoss.totalKilled||0) + 1;
  if (typeof mountOnWorldBossKill==='function') mountOnWorldBossKill();
  state.worldBoss.shards = (state.worldBoss.shards||0) + wb.rewards.shards;
  state.gem += wb.rewards.gem;
  if (typeof ensureMats==='function') ensureMats();
  state.essence += wb.rewards.essence;
  // 额外掉落 2 件 epic + 0~1 legend
  if (typeof rollItem==='function') {
    for (let i=0;i<2;i++) {
      const ep = rollItem('epic', wb.lvl);
      addToInventory(ep);
      if (typeof eventsOnItemGet==='function') eventsOnItemGet(ep);
    }
    if (Math.random() < 0.5) {
      const lg = rollItem('legend', wb.lvl);
      addToInventory(lg);
      if (typeof eventsOnItemGet==='function') eventsOnItemGet(lg);
      if (typeof progressionOnLegendary==='function') progressionOnLegendary();
    }
  }
  // 赛季积分大奖
  seasonAddPoints(500, '世界Boss');
  log(`🏆 击败 ${wb.name}! +${wb.rewards.shards}橙装碎片 +${wb.rewards.gem}💎 +${wb.rewards.essence}✨`, 'legend');
  leaveWorldBoss();
  markDirty('events','hero','inventory');
}

/* 用碎片换一件橙装(随机槽位) */
function exchangeShards() {
  ensureEventState();
  if ((state.worldBoss.shards||0) < SHARD_EXCHANGE_COST) { log('碎片不足', 'bad'); return; }
  state.worldBoss.shards -= SHARD_EXCHANGE_COST;
  const it = rollItem('legend', state.hero.lvl);
  addToInventory(it);
  if (typeof eventsOnItemGet==='function') eventsOnItemGet(it);
  if (typeof progressionOnLegendary==='function') progressionOnLegendary();
  log(`🎁 用碎片合成 [${it.rarityName}] ${it.name}`, 'legend');
  markDirty('events','inventory');
}

/* ============ 日常任务 ============ */
const DAILY_TEMPLATES = [
  { key:'kill_50',  name:'每日狩猎',  type:'kill',   goalBase:50,  goalScale:5,  reward:{gem:5,honor:200,essence:3} },
  { key:'kill_200', name:'屠杀任务',  type:'kill',   goalBase:200, goalScale:10, reward:{gem:10,honor:500,essence:6} },
  { key:'gold_5k',  name:'淘金日',    type:'gold',   goalBase:5000,goalScale:500,reward:{gem:8,honor:300,essence:4} },
  { key:'dg_1',     name:'副本征服',  type:'dungeon',goalBase:1,   goalScale:0,  reward:{gem:15,honor:400,essence:5} },
  { key:'rare_5',   name:'装备搜寻',  type:'rare',   goalBase:5,   goalScale:0,  reward:{gem:5,honor:200,essence:3} },
  { key:'rare_15',  name:'稀有猎人',  type:'rare',   goalBase:15,  goalScale:0,  reward:{gem:10,honor:400,essence:5} },
  { key:'epic_2',   name:'史诗品质',  type:'epic',   goalBase:2,   goalScale:0,  reward:{gem:20,honor:600,essence:8} },
  { key:'gem_3',    name:'珠宝匠日',  type:'socket', goalBase:3,   goalScale:0,  reward:{gem:10,honor:300,essence:5} },
  { key:'subzone_3',name:'探索者',    type:'subzone',goalBase:3,   goalScale:0,  reward:{gem:8,honor:300,essence:4} },
];

function nextDayResetTs() {
  const d = new Date();
  d.setHours(0,0,0,0);
  return d.getTime() + 24*3600*1000;
}

function dailyReset() {
  ensureEventState();
  // 选 3 条不重复的
  const pool = DAILY_TEMPLATES.slice();
  const picks = [];
  for (let i=0;i<3 && pool.length;i++) {
    const idx = rng(0, pool.length-1);
    picks.push(pool.splice(idx,1)[0]);
  }
  const lvl = state.hero.lvl || 1;
  state.daily.tasks = picks.map(p => ({
    key: p.key, name: p.name, type: p.type,
    goal: p.goalBase + p.goalScale * lvl,
    cur: 0, claimed: false, reward: p.reward,
  }));
  state.daily.resetAt = nextDayResetTs();
  // 检查周流
  const claimedAll = state.daily.tasks.every(t=>t.claimed);
  // weekStreak 在领奖时更新
  log('📅 新的一天,日常已刷新', 'good');
  markDirty('events');
}

function checkDailyRollover() {
  ensureEventState();
  const now = Date.now();
  if (!state.daily.resetAt || now >= state.daily.resetAt) {
    // 若任务有未完成,断 streak
    if (state.daily.tasks && state.daily.tasks.length && !state.daily.tasks.every(t=>t.claimed)) {
      state.daily.weekStreak = 0;
    }
    dailyReset();
  }
}

function dailyProgress(type, amount) {
  ensureEventState();
  // 自动初始化或日切
  if (!state.daily.tasks || state.daily.tasks.length === 0 || !state.daily.resetAt || Date.now() >= state.daily.resetAt) {
    checkDailyRollover();
  }
  if (!state.daily.tasks) return;
  let any = false;
  for (const t of state.daily.tasks) {
    if (t.type !== type || t.claimed) continue;
    if (t.cur < t.goal) {
      t.cur = Math.min(t.goal, t.cur + amount);
      any = true;
      if (t.cur >= t.goal) log(`✅ 日常 [${t.name}] 已完成,可领取`, 'good');
    }
  }
  if (any) markDirty('events');
}

function claimDaily(idx) {
  ensureEventState();
  const t = state.daily.tasks[idx]; if (!t) return;
  if (t.claimed) { log('已领取', 'bad'); return; }
  if (t.cur < t.goal) { log('未完成', 'bad'); return; }
  t.claimed = true;
  const r = t.reward||{};
  if (r.gem) state.gem += r.gem;
  if (r.honor) state.honor += r.honor;
  if (r.essence) { if (typeof ensureMats==='function') ensureMats(); state.essence += r.essence; }
  seasonAddPoints(100, '日常');
  log(`🎁 日常 [${t.name}] 奖励: ${r.gem||0}💎 ${r.honor||0}🏅 ${r.essence||0}✨`, 'good');
  // 全部完成给周大奖一份
  if (state.daily.tasks.every(x=>x.claimed)) {
    state.daily.weekStreak = (state.daily.weekStreak||0) + 1;
    log(`🌟 今日全部完成! 周连击 ${state.daily.weekStreak}/7`, 'epic');
    if (state.daily.weekStreak >= 7 && !state.daily.weeklyClaimedAt) {
      // 提示领周奖
      log('🎉 已连续完成7天,可在事件页领取周宝箱', 'legend');
    }
  }
  markDirty('events','hero');
}

function claimWeeklyChest() {
  ensureEventState();
  if ((state.daily.weekStreak||0) < 7) { log('未达成7连日常', 'bad'); return; }
  state.daily.weekStreak = 0;
  state.daily.weeklyClaimedAt = Date.now();
  state.gem += 100;
  state.honor += 5000;
  if (typeof ensureMats==='function') ensureMats();
  state.essence += 50;
  // 一颗随机T2宝石
  const color = choice(['red','yellow','blue']);
  const gk = color + '_t2';
  if (typeof GEM_TYPES!=='undefined' && GEM_TYPES[gk]) {
    state.gems[gk] = (state.gems[gk]||0) + 1;
    log('🎁 周宝箱: 100💎 5000🏅 50✨ + ['+GEM_TYPES[gk].name+']', 'legend');
  } else {
    log('🎁 周宝箱: 100💎 5000🏅 50✨', 'legend');
  }
  seasonAddPoints(1500, '周宝箱');
  markDirty('events','hero');
}

/* ============ 赛季 ============ */
const SEASON_DAYS = 14;
const SEASON_TIERS = [
  { key:'iron',    name:'青铜',   minPts:0,      icon:'🥉', stat:null },
  { key:'silver',  name:'白银',   minPts:5000,   icon:'🥈', stat:{atkPct:1} },
  { key:'gold',    name:'黄金',   minPts:15000,  icon:'🥇', stat:{atkPct:2,hpPct:1} },
  { key:'platinum',name:'铂金',   minPts:40000,  icon:'💠', stat:{atkPct:2,hpPct:2,crit:1} },
  { key:'diamond', name:'钻石',   minPts:90000,  icon:'💎', stat:{atkPct:3,hpPct:3,crit:1,critdPct:5} },
  { key:'master',  name:'大师',   minPts:200000, icon:'🏆', stat:{atkPct:4,hpPct:4,crit:2,critdPct:10},   title:'赛季大师' },
  { key:'king',    name:'王者',   minPts:500000, icon:'👑', stat:{atkPct:6,hpPct:6,crit:3,critdPct:15,leech:3}, title:'赛季王者' },
];

function getSeasonTier(pts) {
  let best = SEASON_TIERS[0];
  for (const t of SEASON_TIERS) if (pts >= t.minPts) best = t;
  return best;
}
function getSeasonNext(pts) {
  for (const t of SEASON_TIERS) if (pts < t.minPts) return t;
  return null;
}

function ensureSeason() {
  if (!account) account = defaultAccount();
  if (!account.season) account.season = { startAt:0, endAt:0, points:0, history:[], id:1 };
  if (!account.season.history) account.season.history = [];
  const now = Date.now();
  if (!account.season.startAt || !account.season.endAt) {
    account.season.startAt = now;
    account.season.endAt = now + SEASON_DAYS * 86400 * 1000;
    account.season.points = 0;
    account.season.id = (account.season.history.length || 0) + 1;
  }
}

function checkSeasonRollover() {
  ensureSeason();
  const now = Date.now();
  if (now < account.season.endAt) return;
  // 结算
  const tier = getSeasonTier(account.season.points);
  const record = {
    id: account.season.id,
    finalPoints: account.season.points,
    tierKey: tier.key, tierName: tier.name,
    endedAt: now, claimed: false,
  };
  account.season.history.unshift(record);
  log(`🏁 赛季 ${account.season.id} 结束! 段位: ${tier.icon}${tier.name}`, 'legend');
  // 自动发奖:资源给当前角色,永久属性/称号入账号
  state.gem += 50 + SEASON_TIERS.indexOf(tier)*30;
  state.honor += 1000 + SEASON_TIERS.indexOf(tier)*500;
  if (tier.stat) {
    if (!account.permanentStats) account.permanentStats = {};
    for (const [k,v] of Object.entries(tier.stat)) {
      account.permanentStats[k] = (account.permanentStats[k]||0) + v;
    }
  }
  if (tier.title) {
    const seasonTitle = tier.title + ' · S'+account.season.id;
    if (typeof unlockTitle === 'function') unlockTitle(seasonTitle);
    else account.title = seasonTitle;
  }
  // 启新赛季
  account.season.id = (account.season.id||1) + 1;
  account.season.startAt = now;
  account.season.endAt = now + SEASON_DAYS * 86400 * 1000;
  account.season.points = 0;
  if (typeof recomputeStats==='function') recomputeStats();
  markDirty('events','hero');
}

function seasonAddPoints(p, reason) {
  ensureSeason();
  account.season.points = (account.season.points||0) + p;
}

/* ============ 钩子 ============ */
/* 由 combat onMonsterDeath 调用 — 处理 daily/season 计数 */
function eventsOnKill(mon) {
  ensureEventState();
  dailyProgress('kill', 1);
  seasonAddPoints(mon.isBoss ? 20 : 1, 'kill');
}
function eventsOnGoldGain(amount) {
  ensureEventState();
  dailyProgress('gold', amount);
}
function eventsOnDungeonClear() {
  ensureEventState();
  dailyProgress('dungeon', 1);
  seasonAddPoints(200, 'dungeon');
}
function eventsOnItemGet(item) {
  ensureEventState();
  if (!item) return;
  if (item.rarity === 'rare' || item.rarity === 'epic' || item.rarity === 'legend') {
    dailyProgress('rare', 1);
  }
  if (item.rarity === 'epic' || item.rarity === 'legend') {
    dailyProgress('epic', 1);
  }
  seasonAddPoints(item.rarity==='legend'?80 : item.rarity==='epic'?20 : 5, 'item');
}
function eventsOnGem() { dailyProgress('socket', 1); }
function eventsOnSubzoneClear() { dailyProgress('subzone', 1); }

/* ============ 渲染 ============ */
let eventsSubTab = 'wb'; // 'wb' | 'daily' | 'season'

function renderEvents() {
  const root = $('tab-events'); if (!root) return;
  ensureEventState();
  checkDailyRollover();
  checkSeasonRollover();
  const head = `
    <div class="sub-tabs">
      <span class="sub-tab ${eventsSubTab==='wb'?'active':''}" data-sub="wb">🐲 世界Boss</span>
      <span class="sub-tab ${eventsSubTab==='daily'?'active':''}" data-sub="daily">📅 日常</span>
      <span class="sub-tab ${eventsSubTab==='season'?'active':''}" data-sub="season">🏁 赛季</span>
    </div>`;
  let body = '';
  if (eventsSubTab === 'wb') body = renderWorldBossSub();
  else if (eventsSubTab === 'daily') body = renderDailySub();
  else if (eventsSubTab === 'season') body = renderSeasonSub();
  root.innerHTML = head + body;
}

function renderWorldBossSub() {
  let html = `<div class="prog-summary muted">橙装碎片: <b style="color:var(--legend)">${state.worldBoss.shards||0}</b> / ${SHARD_EXCHANGE_COST} · 累计击败 ${state.worldBoss.totalKilled||0} 次
    ${(state.worldBoss.shards||0)>=SHARD_EXCHANGE_COST ? '<button class="gold" data-action="exchangeshards" style="margin-left:8px">合成橙装</button>':''}
  </div>`;
  html += '<div class="wb-list">';
  for (const wb of WORLD_BOSSES) {
    const ready = worldBossReady(wb.key);
    const nextTs = worldBossAvailableAt(wb.key);
    const cd = Math.max(0, Math.ceil((nextTs - Date.now())/1000));
    const rwds = `${wb.rewards.gold}💰 ${wb.rewards.gem}💎 ${wb.rewards.honor}🏅 ${wb.rewards.essence}✨ ${wb.rewards.shards}🧩碎片`;
    html += `<div class="wb-item ${ready?'wb-ready':''}" style="border-left:4px solid ${wb.color}">
      <div class="wb-main">
        <div class="wb-name" style="color:${wb.color}">${wb.emoji} ${wb.name} <span class="muted" style="font-size:10px">Lv.${wb.lvl}</span></div>
        <div class="muted" style="font-size:11px">${wb.desc}</div>
        <div class="muted" style="font-size:10px;margin-top:2px">奖励: ${rwds}</div>
      </div>
      <div class="wb-act">
        ${ready ? `<button class="danger" data-action="challengewb" data-key="${wb.key}">挑战</button>`
                : `<span class="muted" style="font-size:11px">${fmtCd(cd)}</span>`}
      </div>
    </div>`;
  }
  html += '</div>';
  return html;
}

function renderDailySub() {
  const cd = Math.max(0, Math.ceil((state.daily.resetAt - Date.now())/1000));
  let html = `<div class="prog-summary muted">日常重置: <b>${fmtCd(cd)}</b> · 周连击 <b>${state.daily.weekStreak||0}/7</b>
    ${(state.daily.weekStreak||0)>=7 ? '<button class="gold" data-action="claimweekly" style="margin-left:8px">领周宝箱</button>':''}
  </div>`;
  html += '<div class="daily-list">';
  (state.daily.tasks||[]).forEach((t, i) => {
    const pct = Math.min(100, t.cur/t.goal*100);
    const r = t.reward||{};
    const rwdTxt = `${r.gem||0}💎 ${r.honor||0}🏅 ${r.essence||0}✨`;
    const btn = t.claimed
      ? `<span class="muted">✓已领</span>`
      : t.cur >= t.goal
        ? `<button class="gold" data-action="claimdaily" data-idx="${i}">领取</button>`
        : `<span class="muted" style="font-size:10px">${fmt(t.cur)}/${fmt(t.goal)}</span>`;
    html += `<div class="daily-item ${t.claimed?'ach-claimed':(t.cur>=t.goal?'ach-ready':'')}">
      <div class="daily-main">
        <div class="daily-name">${t.name}</div>
        <div class="muted" style="font-size:10px">${rwdTxt}</div>
        <div class="bar xp" style="height:6px;margin-top:2px"><i style="width:${pct}%"></i></div>
      </div>
      <div class="daily-act">${btn}</div>
    </div>`;
  });
  html += '</div>';
  return html;
}

function renderSeasonSub() {
  ensureSeason();
  const s = account.season;
  const t = getSeasonTier(s.points);
  const nxt = getSeasonNext(s.points);
  const remain = Math.max(0, Math.ceil((s.endAt - Date.now())/1000));
  const days = Math.floor(remain/86400), hrs = Math.floor((remain%86400)/3600);
  const pct = nxt ? ((s.points - t.minPts) / (nxt.minPts - t.minPts) * 100) : 100;
  let html = `<div class="prog-summary muted">
    赛季 <b>S${s.id||1}</b> · 剩余 <b>${days}天${hrs}时</b> · 当前段位: <span style="color:var(--gold)">${t.icon} ${t.name}</span> <span class="muted">(账号共享)</span>
  </div>`;
  html += `<div class="season-box">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <span><b>赛季积分</b> <span style="color:var(--gold);font-size:18px">${fmt(s.points)}</span></span>
      <span class="muted">${nxt ? `→ ${nxt.icon}${nxt.name} (${fmt(nxt.minPts)})` : '已封顶'}</span>
    </div>
    <div class="bar xp" style="height:10px;margin:4px 0"><i style="width:${pct}%;background:linear-gradient(90deg,#fbbf24,#f59e0b)"></i></div>
  </div>`;
  html += '<div class="muted" style="font-size:11px;margin:6px 0">所有段位奖励:</div>';
  html += '<div class="tier-list">';
  for (const tier of SEASON_TIERS) {
    const reached = s.points >= tier.minPts;
    const stat = tier.stat ? Object.entries(tier.stat).map(([k,v])=>fmtMod(k, v)).join(' ') : '无';
    html += `<div class="tier-item ${reached?'reached':''}">
      <div>${tier.icon} <b>${tier.name}</b> <span class="muted" style="font-size:10px">${fmt(tier.minPts)}+</span></div>
      <div class="muted" style="font-size:11px">${stat}${tier.title?' · 称号: 「'+tier.title+'」':''}</div>
    </div>`;
  }
  html += '</div>';
  if (s.history && s.history.length) {
    html += '<div class="muted" style="font-size:11px;margin:8px 0 4px">历史赛季:</div>';
    for (const r of s.history.slice(0,5)) {
      const tt = SEASON_TIERS.find(x=>x.key===r.tierKey) || SEASON_TIERS[0];
      html += `<div class="muted" style="font-size:11px;padding:2px 6px;background:var(--panel-2);border-radius:4px;margin-bottom:2px">S${r.id}: ${tt.icon}${r.tierName} · ${fmt(r.finalPoints)}分</div>`;
    }
  }
  return html;
}
