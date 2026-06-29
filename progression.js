/* =========================================================
   progression.js — 成就 / 图鉴 / 声望 三合一系统(账号共享)
   ----------------------------------------------------------
   - 所有计数器/解锁状态都存在 account 上,跨角色共享
   - 成就条件用 `accLvl()` 取所有角色最高等级
   - 资源奖励(金币/钻石/荣誉)仍发到当前角色 state
   - 永久属性奖励累加到 account.permanentStats,所有角色共用
   ========================================================= */

/* 跨角色最高等级 */
function accLvl() {
  if (!characters || characters.length === 0) return state?.hero?.lvl || 1;
  return characters.reduce((m,c)=>Math.max(m, c.hero?.lvl||1), state?.hero?.lvl||1);
}
function accEns() { if (!account) account = defaultAccount(); return account; }
function accountCharacterStates() {
  const list = [];
  const seen = new Set();
  const add = c => {
    if (!c || seen.has(c)) return;
    seen.add(c);
    list.push(c);
  };
  const activeIdx = typeof activeCharIndex === 'number' ? activeCharIndex : -1;
  if (Array.isArray(characters)) characters.forEach((c, i) => { if (i !== activeIdx) add(c); });
  add(state);
  return list;
}
function accountWorldBossTotalKills() {
  return accountCharacterStates().reduce((sum, c) => sum + ((c.worldBoss && c.worldBoss.totalKilled) || 0), 0);
}
function accountWorldBossKilledKeys() {
  const keys = new Set();
  for (const c of accountCharacterStates()) {
    const wb = c.worldBoss || {};
    for (const key of Object.keys(wb.lastKill || {})) if (wb.lastKill[key]) keys.add(key);
    for (const key of Object.keys(wb.stageClears || {})) if (wb.stageClears[key]) keys.add(key);
  }
  return keys;
}
function accountRareEliteTotalKills() {
  let total = 0;
  for (const c of accountCharacterStates()) {
    for (const n of Object.values(c.worldBoss?.rareKills || {})) total += n || 0;
  }
  return total;
}
function accountRareEliteUniqueKills() {
  const keys = new Set();
  for (const c of accountCharacterStates()) {
    for (const [key, n] of Object.entries(c.worldBoss?.rareKills || {})) if ((n || 0) > 0) keys.add(key);
  }
  return keys.size;
}
function accountMountOwnedCount() {
  const acc = accEns();
  return Object.values(acc.mounts || {}).filter(m => m && m.obtained).length;
}
function accountWorldBossMountCount() {
  const fallbackKeys = ['twilight_drake_wb','sulfuras_firehawk','qiraji_mindscarab','yogg_dreambeast','alakir_stormdrake','leishen_thundercloud','argus_starbinder'];
  const drops = (typeof globalThis !== 'undefined' && globalThis.WORLD_BOSS_MOUNT_DROPS) || null;
  const keys = drops ? Object.values(drops).map(d => d.key) : fallbackKeys;
  const acc = accEns();
  return keys.filter(key => acc.mounts?.[key]?.obtained).length;
}
const APEX_WORLD_BOSS_KEYS = ['deathwing','ragnaros','cthun','yogg_saron','alakir','lei_shen','argus_unmaker'];

function ensureUnlockedTitles() {
  const acc = accEns();
  if (!Array.isArray(acc.unlockedTitles)) acc.unlockedTitles = [];
  const seen = new Set(acc.unlockedTitles.filter(Boolean));
  const add = (title) => {
    if (!title || seen.has(title)) return;
    seen.add(title);
    acc.unlockedTitles.push(title);
  };

  add(acc.title);
  for (const a of ACHIEVEMENTS) {
    if (a.reward?.title && acc.achievementsClaimed?.[a.key]) add(a.reward.title);
  }
  if (typeof ASCEND_MILESTONES !== 'undefined') {
    for (const ms of ASCEND_MILESTONES) {
      if (ms.title && (acc.ascendMilestones?.[ms.lvl] || (acc.ascendLvl || 0) >= ms.lvl)) add(ms.title);
    }
  }
  if (typeof SEASON_TIERS !== 'undefined') {
    for (const r of (acc.season?.history || [])) {
      const tier = SEASON_TIERS.find(x => x.key === r.tierKey);
      if (tier?.title && r.seasonId) add(`${tier.title} · S${r.seasonId}`);
    }
  }
  if (typeof TOWER_MILESTONES !== 'undefined') {
    let highest = state?.tower?.highest || 0;
    if (characters?.length) {
      for (const c of characters) highest = Math.max(highest, c.tower?.highest || 0);
    }
    for (const [floor, ms] of Object.entries(TOWER_MILESTONES)) {
      if (ms.title && highest >= parseInt(floor, 10)) add(ms.title);
    }
  }
  return acc.unlockedTitles;
}

function unlockTitle(title, autoEquip=true) {
  if (!title) return;
  ensureUnlockedTitles();
  const acc = accEns();
  if (!acc.unlockedTitles.includes(title)) acc.unlockedTitles.push(title);
  if (autoEquip) acc.title = title;
}

function setActiveTitle(title) {
  const acc = accEns();
  const titles = ensureUnlockedTitles();
  if (title && !titles.includes(title)) return false;
  acc.title = title || '';
  markDirty('progression', 'hero');
  return true;
}

function titleSourceMap() {
  const acc = accEns();
  const map = {};
  const add = (title, source) => {
    if (!title || !source || map[title]) return;
    map[title] = source;
  };

  for (const a of ACHIEVEMENTS) {
    if (a.reward?.title && acc.achievementsClaimed?.[a.key]) add(a.reward.title, `成就 · ${a.name}`);
  }
  if (typeof ASCEND_MILESTONES !== 'undefined') {
    for (const ms of ASCEND_MILESTONES) {
      if (ms.title && (acc.ascendMilestones?.[ms.lvl] || (acc.ascendLvl || 0) >= ms.lvl)) add(ms.title, `觉醒 · ${ms.name}`);
    }
  }
  if (typeof SEASON_TIERS !== 'undefined') {
    for (const r of (acc.season?.history || [])) {
      const tier = SEASON_TIERS.find(x => x.key === r.tierKey);
      if (tier?.title && r.seasonId) add(`${tier.title} · S${r.seasonId}`, `赛季 · ${tier.name} S${r.seasonId}`);
    }
  }
  if (typeof TOWER_MILESTONES !== 'undefined') {
    let highest = state?.tower?.highest || 0;
    if (characters?.length) {
      for (const c of characters) highest = Math.max(highest, c.tower?.highest || 0);
    }
    for (const [floor, ms] of Object.entries(TOWER_MILESTONES)) {
      if (ms.title && highest >= parseInt(floor, 10)) add(ms.title, `无尽塔 · ${floor}层 ${ms.name}`);
    }
  }
  return map;
}

/* ============ 成就定义 ============ */
/* 每条: {key,name,desc,cat,cond(state)=>{cur,goal}, reward:{gold,gem,honor,title,stat}} */
/* 成就条件 cond(): 返回 {cur, goal}, 全部从 account/characters 读 */
const ACHIEVEMENTS = [
  // 进阶 (跨角色最高等级)
  { key:'lv10',  name:'初出茅庐',  cat:'进阶', icon:'🎓',
    cond:()=>({cur:accLvl(),goal:10}), reward:{gold:500,gem:5} },
  { key:'lv20',  name:'见习冒险者', cat:'进阶', icon:'🎓',
    cond:()=>({cur:accLvl(),goal:20}), reward:{gold:1500,gem:10,stat:{atkPct:1}} },
  { key:'lv30',  name:'青铜级英雄', cat:'进阶', icon:'🎖️',
    cond:()=>({cur:accLvl(),goal:30}), reward:{gold:5000,gem:15,stat:{hpPct:2}} },
  { key:'lv40',  name:'白银级英雄', cat:'进阶', icon:'🥈',
    cond:()=>({cur:accLvl(),goal:40}), reward:{gold:12000,gem:25,stat:{crit:1}} },
  { key:'lv50',  name:'黄金级英雄', cat:'进阶', icon:'🥇',
    cond:()=>({cur:accLvl(),goal:50}), reward:{gold:30000,gem:40,stat:{atkPct:2}} },
  { key:'lv60',  name:'传奇英雄',   cat:'进阶', icon:'🏆',
    cond:()=>({cur:accLvl(),goal:60}), reward:{gold:80000,gem:60,stat:{critdPct:5}} },
  { key:'lv70',  name:'外域征服者', cat:'进阶', icon:'🏆',
    cond:()=>({cur:accLvl(),goal:70}), reward:{gold:200000,gem:90,stat:{atkPct:3,hpPct:3}} },
  { key:'lv80',  name:'至尊英雄',   cat:'进阶', icon:'👑',
    cond:()=>({cur:accLvl(),goal:80}), reward:{gold:1000000,gem:200,honor:5000,title:'巫妖王终结者',stat:{atkPct:5,hpPct:5,critdPct:10}} },

  // 击杀 (账号合并)
  { key:'kill100',  name:'屠夫学徒',  cat:'击杀', icon:'🗡️',
    cond:()=>({cur:accEns().killsTotal||0,goal:100}), reward:{gold:300,gem:3} },
  { key:'kill1k',   name:'熟练杀手',  cat:'击杀', icon:'⚔️',
    cond:()=>({cur:accEns().killsTotal||0,goal:1000}), reward:{gold:1500,gem:10,stat:{atkPct:1}} },
  { key:'kill10k',  name:'万军斩首',  cat:'击杀', icon:'💀',
    cond:()=>({cur:accEns().killsTotal||0,goal:10000}), reward:{gold:10000,gem:30,stat:{atkPct:2}} },
  { key:'kill50k',  name:'破军者',    cat:'击杀', icon:'☠️',
    cond:()=>({cur:accEns().killsTotal||0,goal:50000}), reward:{gold:80000,gem:80,stat:{atkPct:3,crit:1}} },
  { key:'kill200k', name:'战争机器',  cat:'击杀', icon:'⚙️',
    cond:()=>({cur:accEns().killsTotal||0,goal:200000}), reward:{gold:500000,gem:200,title:'万人敌',stat:{atkPct:5,critdPct:10}} },

  // 致命一击 (账号最高)
  { key:'maxd1k',   name:'重拳出击',  cat:'致命', icon:'💥',
    cond:()=>({cur:accEns().maxDmg||0,goal:1000}), reward:{gold:500,gem:3} },
  { key:'maxd10k',  name:'毁灭打击',  cat:'致命', icon:'💢',
    cond:()=>({cur:accEns().maxDmg||0,goal:10000}), reward:{gold:3000,gem:15,stat:{critdPct:5}} },
  { key:'maxd100k', name:'秒杀大师',  cat:'致命', icon:'⚡',
    cond:()=>({cur:accEns().maxDmg||0,goal:100000}), reward:{gold:30000,gem:50,stat:{critdPct:10}} },
  { key:'maxd1m',   name:'神之愤怒',  cat:'致命', icon:'🌩️',
    cond:()=>({cur:accEns().maxDmg||0,goal:1000000}), reward:{gold:300000,gem:150,title:'神罚使者',stat:{atkPct:5,critdPct:15}} },

  // 财富 (账号累计)
  { key:'gold10k',  name:'小有积蓄',  cat:'财富', icon:'💰',
    cond:()=>({cur:accEns().lifetimeGold||0,goal:10000}), reward:{gem:5} },
  { key:'gold100k', name:'富商',      cat:'财富', icon:'💰',
    cond:()=>({cur:accEns().lifetimeGold||0,goal:100000}), reward:{gem:20,stat:{costReduction:2}} },
  { key:'gold1m',   name:'富甲一方',  cat:'财富', icon:'💎',
    cond:()=>({cur:accEns().lifetimeGold||0,goal:1000000}), reward:{gem:80,title:'金币王',stat:{costReduction:5}} },

  // 收集传说 (账号累计拾取)
  { key:'leg1',  name:'初尝传说', cat:'收集', icon:'🔥',
    cond:()=>({cur:accEns().legendariesEverFound||0,goal:1}), reward:{gold:1000,gem:10} },
  { key:'leg5',  name:'橙装收藏家', cat:'收集', icon:'🔥',
    cond:()=>({cur:accEns().legendariesEverFound||0,goal:5}), reward:{gold:5000,gem:30,stat:{atkPct:2}} },
  { key:'leg15', name:'传说大师', cat:'收集', icon:'⭐',
    cond:()=>({cur:accEns().legendariesEverFound||0,goal:15}), reward:{gold:30000,gem:80,stat:{atkPct:3,hpPct:3}} },
  { key:'leg30', name:'万古不朽', cat:'收集', icon:'🌟',
    cond:()=>({cur:accEns().legendariesEverFound||0,goal:30}), reward:{gold:200000,gem:200,title:'橙装猎人',stat:{atkPct:5,hpPct:5,critdPct:10}} },

  // 探索 (跨角色合并的子区集合)
  { key:'exp5',  name:'初步探索',   cat:'探索', icon:'🗺️',
    cond:()=>({cur:Object.keys(accEns().subzonesCleared).length,goal:5}), reward:{gold:1000,gem:5} },
  { key:'exp15', name:'四海为家',   cat:'探索', icon:'🌍',
    cond:()=>({cur:Object.keys(accEns().subzonesCleared).length,goal:15}), reward:{gold:8000,gem:20,stat:{hpPct:2}} },
  { key:'exp40', name:'艾泽拉斯漫游者', cat:'探索', icon:'🌎',
    cond:()=>({cur:Object.keys(accEns().subzonesCleared).length,goal:40}), reward:{gold:50000,gem:60,title:'漫游者',stat:{atkPct:2,hpPct:2}} },

  // 征服(地图boss跨角色合并)
  { key:'boss5',  name:'屠龙初尝',  cat:'征服', icon:'🐉',
    cond:()=>({cur:Object.keys(accEns().bossesKilled).length,goal:5}), reward:{gold:3000,gem:15,stat:{executeBonus:3}} },
  { key:'boss15', name:'征服者',    cat:'征服', icon:'⚔️',
    cond:()=>({cur:Object.keys(accEns().bossesKilled).length,goal:15}), reward:{gold:20000,gem:60,stat:{executeBonus:5,atkPct:2}} },
  { key:'boss30', name:'诸王之王',  cat:'征服', icon:'👑',
    cond:()=>({cur:Object.keys(accEns().bossesKilled).length,goal:30}), reward:{gold:100000,gem:200,title:'万王之王',stat:{atkPct:5,critdPct:10}} },

  // 副本
  { key:'dg5',  name:'副本新手',  cat:'副本', icon:'🏰',
    cond:()=>({cur:accEns().dungeonClearsTotal||0,goal:5}), reward:{gold:3000,gem:15,stat:{leech:2}} },
  { key:'dg15', name:'副本老手',  cat:'副本', icon:'🏰',
    cond:()=>({cur:accEns().dungeonClearsTotal||0,goal:15}), reward:{gold:15000,gem:50,stat:{leech:3,atkPct:2}} },
  { key:'dg30', name:'副本宗师',  cat:'副本', icon:'🏯',
    cond:()=>({cur:accEns().dungeonClearsTotal||0,goal:30}), reward:{gold:80000,gem:150,title:'秘境征服者',stat:{leech:5,atkPct:3,hpPct:3}} },

  // 世界首领/稀有精英
  { key:'wb10', name:'巨物猎手', cat:'世界首领', icon:'🐲',
    cond:()=>({cur:accountWorldBossTotalKills(),goal:10}), reward:{gold:50000,gem:80,honor:800,stat:{hpPct:2}} },
  { key:'wb50', name:'灭世者试炼', cat:'世界首领', icon:'🌋',
    cond:()=>({cur:accountWorldBossTotalKills(),goal:50}), reward:{gold:180000,gem:180,honor:2400,stat:{atkPct:3,hpPct:3}} },
  { key:'wb150', name:'终局讨伐军', cat:'世界首领', icon:'🌌',
    cond:()=>({cur:accountWorldBossTotalKills(),goal:150}), reward:{gold:600000,gem:420,honor:7000,title:'终局讨伐军',stat:{atkPct:5,hpPct:5,mastery:8}} },
  { key:'wb_apex7', name:'群星巡礼', cat:'世界首领', icon:'✨',
    cond:()=>({cur:APEX_WORLD_BOSS_KEYS.filter(k => accountWorldBossKilledKeys().has(k)).length,goal:APEX_WORLD_BOSS_KEYS.length}), reward:{gold:900000,gem:520,honor:9000,title:'群星巡礼者',stat:{atkPct:6,hpPct:6,defPct:4,mastery:10}} },
  { key:'rare20', name:'稀有追踪者', cat:'世界首领', icon:'🎯',
    cond:()=>({cur:accountRareEliteTotalKills(),goal:20}), reward:{gold:90000,gem:120,honor:1200,stat:{dropMult:5}} },
  { key:'rare10u', name:'精英猎名册', cat:'世界首领', icon:'📜',
    cond:()=>({cur:accountRareEliteUniqueKills(),goal:10}), reward:{gold:220000,gem:220,honor:2800,title:'精英猎名册',stat:{atkPct:3,critdPct:8,dropMult:8}} },

  // 坐骑收藏
  { key:'mount10', name:'缰绳收藏', cat:'坐骑', icon:'🐎',
    cond:()=>({cur:accountMountOwnedCount(),goal:10}), reward:{gold:40000,gem:80,stat:{goldMult:5}} },
  { key:'mount30', name:'珍兽马厩', cat:'坐骑', icon:'🏇',
    cond:()=>({cur:accountMountOwnedCount(),goal:30}), reward:{gold:180000,gem:200,title:'珍兽马厩主',stat:{atkPct:3,hpPct:3,dropMult:8}} },
  { key:'mount50', name:'百骑陈列馆', cat:'坐骑', icon:'👑',
    cond:()=>({cur:accountMountOwnedCount(),goal:50}), reward:{gold:520000,gem:420,title:'百骑陈列馆主',stat:{atkPct:5,hpPct:5,mastery:8,dropMult:12}} },
  { key:'wbmount3', name:'灭世缰绳', cat:'坐骑', icon:'🌠',
    cond:()=>({cur:accountWorldBossMountCount(),goal:3}), reward:{gold:260000,gem:260,honor:3200,stat:{dropMult:10,mastery:6}} },
  { key:'wbmount7', name:'群星坐骑收藏家', cat:'坐骑', icon:'🌌',
    cond:()=>({cur:accountWorldBossMountCount(),goal:7}), reward:{gold:1000000,gem:800,honor:12000,title:'群星驭者',stat:{atkPct:8,hpPct:8,mastery:15,dropMult:20}} },

  // 精炼/装备打造
  { key:'gem10',  name:'珠宝学徒',   cat:'精炼', icon:'💎',
    cond:()=>({cur:accEns().gemsInserted||0,goal:10}), reward:{gold:1000,gem:5} },
  { key:'gem50',  name:'珠宝大师',   cat:'精炼', icon:'💍',
    cond:()=>({cur:accEns().gemsInserted||0,goal:50}), reward:{gold:5000,gem:20,stat:{mastery:5}} },
  { key:'gem200', name:'宝石宗师',   cat:'精炼', icon:'💠',
    cond:()=>({cur:accEns().gemsInserted||0,goal:200}), reward:{gold:30000,gem:80,stat:{mastery:10,critdPct:5}} },
  { key:'ench5',  name:'附魔初学',   cat:'精炼', icon:'✨',
    cond:()=>({cur:accEns().enchantsApplied||0,goal:5}), reward:{gold:800,gem:5} },
  { key:'ench20', name:'附魔大师',   cat:'精炼', icon:'🪄',
    cond:()=>({cur:accEns().enchantsApplied||0,goal:20}), reward:{gold:8000,gem:25,stat:{vers:2}} },
  { key:'reroll20',name:'重铸学徒',  cat:'精炼', icon:'♻️',
    cond:()=>({cur:accEns().rerollsDone||0,goal:20}), reward:{gold:2000,gem:10} },
  { key:'reroll100',name:'重铸大师', cat:'精炼', icon:'🔁',
    cond:()=>({cur:accEns().rerollsDone||0,goal:100}), reward:{gold:20000,gem:50,stat:{cdReduction:2}} },
];

/* ============ 图鉴 ============ */
/* state.bestiary = { "🐺野狼幼崽": count, ... } */
/* 每个怪物分三档,达到给该怪物的 dmg/xp 永久百分比加成 */
const BESTIARY_TIERS = [
  { count:100,    label:'熟悉',   dmgBonus:1, xpBonus:1 },
  { count:1000,   label:'精通',   dmgBonus:3, xpBonus:2 },
  { count:10000,  label:'宿敌',   dmgBonus:6, xpBonus:4 },
];
function getBestiaryTier(killCount) {
  let best = null;
  for (const t of BESTIARY_TIERS) if (killCount >= t.count) best = t;
  return best;
}
function bestiaryBonusFor(mobName) {
  const c = (accEns().bestiary||{})[mobName] || 0;
  const t = getBestiaryTier(c);
  return t ? { dmgPct:t.dmgBonus, xpPct:t.xpBonus } : { dmgPct:0, xpPct:0 };
}

/* ============ 声望 ============ */
/* 5 大势力: 联盟/部落/中立/外域/诺森德, 与 MAPS[i].faction 对应 */
const REPUTATION_FACTIONS = {
  '联盟':   { icon:'🦁', color:'#3b82f6' },
  '部落':   { icon:'🐺', color:'#ef4444' },
  '中立':   { icon:'🌿', color:'#10b981' },
  '外域':   { icon:'😈', color:'#a855f7' },
  '诺森德': { icon:'❄️', color:'#06b6d4' },
};
const REPUTATION_TIERS = [
  { rep:0,      name:'冷漠',   xpPct:0,  goldPct:0, dropPct:0, dmgPct:0 },
  { rep:1000,   name:'中立',   xpPct:3,  goldPct:0, dropPct:0, dmgPct:0 },
  { rep:5000,   name:'友善',   xpPct:5,  goldPct:5, dropPct:0, dmgPct:0 },
  { rep:15000,  name:'尊敬',   xpPct:8,  goldPct:8, dropPct:5, dmgPct:0 },
  { rep:40000,  name:'崇敬',   xpPct:10, goldPct:10,dropPct:10,dmgPct:5 },
  { rep:100000, name:'崇拜',   xpPct:15, goldPct:15,dropPct:15,dmgPct:10 },
];
function getRepTier(rep) {
  let best = REPUTATION_TIERS[0];
  for (const t of REPUTATION_TIERS) if (rep >= t.rep) best = t;
  return best;
}
function getRepNext(rep) {
  for (const t of REPUTATION_TIERS) if (rep < t.rep) return t;
  return null;
}

/* 崇拜(满阶)后无限"声望宝箱":每超出 REP_CACHE_STEP 声望可领 1 个资源宝箱 */
const REP_CACHE_STEP = 50000;
const REP_CACHE_REWARD = { gold:50000, essence:20, honor:200, gem:15 };
function repExaltedRep() { return REPUTATION_TIERS[REPUTATION_TIERS.length - 1].rep; }
function repCachesEarned(rep) { const ex = repExaltedRep(); return rep >= ex ? Math.floor((rep - ex) / REP_CACHE_STEP) : 0; }
function repCachesAvailable(fac) {
  const acc = accEns();
  const rep = acc.reputation[fac] || 0;
  const claimed = (acc.repCaches && acc.repCaches[fac]) || 0;
  return Math.max(0, repCachesEarned(rep) - claimed);
}
function claimRepCache(fac) {
  const acc = accEns();
  if (!acc.repCaches) acc.repCaches = {};
  const avail = repCachesAvailable(fac);
  if (avail <= 0) { log('暂无可领声望宝箱', 'bad'); return false; }
  acc.repCaches[fac] = (acc.repCaches[fac] || 0) + avail;
  const r = REP_CACHE_REWARD;
  state.gold += r.gold * avail; state.essence += r.essence * avail;
  state.honor += r.honor * avail; state.gem += r.gem * avail;
  log(`🎁 ${fac} 崇拜宝箱 ×${avail}: +${fmt(r.gold * avail)}💰 +${r.essence * avail}✨ +${r.honor * avail}🏅 +${r.gem * avail}💎`, 'legend');
  markDirty('progression', 'hero');
  return true;
}

/* 获取当前地图所在势力的加成 */
function progressionZoneMultiplier() {
  const map = (typeof getMap==='function') ? getMap() : null;
  if (!map) return { xpPct:0, goldPct:0, dropPct:0, dmgPct:0 };
  const fac = map.faction;
  const rep = (accEns().reputation||{})[fac] || 0;
  const t = getRepTier(rep);
  return { xpPct:t.xpPct, goldPct:t.goldPct, dropPct:t.dropPct, dmgPct:t.dmgPct };
}

/* ============ 永久属性加成(成就奖励 + 赛季奖励,全部在 account) ============ */
function collectProgressionBonus() {
  return (accEns()||{}).permanentStats || {};
}

/* ============ 钩子 ============ */
/* ensureProgState 兼容旧调用方,内部确保 account 已就绪 */
function ensureProgState() { accEns(); }

/* 怪死了 — 所有计数走 account */
function progressionOnKill(mon) {
  const acc = accEns();
  acc.killsTotal = (acc.killsTotal||0) + 1;
  // 图鉴
  if (mon && mon.name) acc.bestiary[mon.name] = (acc.bestiary[mon.name]||0) + 1;
  // 声望(地图主世界&boss)
  const map = (typeof getMap==='function') ? getMap() : null;
  if (map && mon) {
    const fac = map.faction;
    const gain = mon.isBoss ? 50 : 1;
    acc.reputation[fac] = (acc.reputation[fac]||0) + gain;
  }
  // 地图首领统计
  if (mon && mon.isBoss && state.mode === 'boss') {
    const k = state.currentMap;
    acc.bossesKilled[k] = (acc.bossesKilled[k]||0) + 1;
    if (typeof questAdvance === 'function') questAdvance('boss', 1);
  }
  if (typeof questAdvance === 'function') questAdvance('kill', 1);
  progressionCheckAch();
}

function progressionOnDamage(amount) {
  const acc = accEns();
  if (amount > (acc.maxDmg||0)) { acc.maxDmg = amount; progressionCheckAch(); }
}

function progressionOnGoldGain(amount) {
  const acc = accEns();
  const before = acc.lifetimeGold || 0;
  acc.lifetimeGold = before + amount;
  if (typeof questAdvance === 'function' && amount > 0) questAdvance('gold', amount);
  // 跨过 1000 边界时检测一次
  if (Math.floor(acc.lifetimeGold/1000) !== Math.floor(before/1000)) progressionCheckAch();
}

function progressionOnDungeonClear(dgKey) {
  const acc = accEns();
  acc.dungeonClearsTotal = (acc.dungeonClearsTotal||0) + 1;
  if (typeof questAdvance === 'function') questAdvance('dungeon', 1);
  const dg = (typeof DUNGEONS!=='undefined') ? DUNGEONS.find(d=>d.key===dgKey) : null;
  const fac = dg ? (dg.faction || '中立') : '中立';
  acc.reputation[fac] = (acc.reputation[fac]||0) + 200;
  progressionCheckAch();
}

function progressionOnGem() {
  const acc = accEns();
  acc.gemsInserted = (acc.gemsInserted||0) + 1;
  if (typeof questAdvance === 'function') questAdvance('gem', 1);
  progressionCheckAch();
}
function progressionOnEnchant() {
  const acc = accEns();
  acc.enchantsApplied = (acc.enchantsApplied||0) + 1;
  if (typeof questAdvance === 'function') questAdvance('enhance', 1);
  progressionCheckAch();
}
function progressionOnReroll() {
  const acc = accEns();
  acc.rerollsDone = (acc.rerollsDone||0) + 1;
  if (typeof questAdvance === 'function') questAdvance('enhance', 1);
  progressionCheckAch();
}

/* 子区清完 — 由 combat.js 调用 */
function progressionOnSubzoneClear(mapKey, subIdx) {
  const acc = accEns();
  acc.subzonesCleared[mapKey + '-' + subIdx] = true;
  progressionCheckAch();
}

/* 拾取/掉到橙装 — 由 combat.js 在 eventsOnItemGet 同位置调用 */
function progressionOnLegendary() {
  const acc = accEns();
  acc.legendariesEverFound = (acc.legendariesEverFound||0) + 1;
  progressionCheckAch();
}

/* 检测成就 */
function progressionCheckAch() {
  const acc = accEns();
  let newCount = 0;
  for (const a of ACHIEVEMENTS) {
    if (acc.achievementsCompleted[a.key]) continue;
    const r = a.cond();
    if (r.cur >= r.goal) {
      acc.achievementsCompleted[a.key] = true;
      newCount++;
      log(`🏆 成就达成: [${a.name}] (可领奖)`, 'epic');
    }
  }
  if (newCount > 0) markDirty('progression');
}

/* 领奖 — 资源给当前角色,永久属性/称号给账号 */
function claimAchievement(key) {
  const acc = accEns();
  const a = ACHIEVEMENTS.find(x=>x.key===key); if (!a) return;
  if (!acc.achievementsCompleted[a.key]) { log('未达成', 'bad'); return; }
  if (acc.achievementsClaimed[a.key]) { log('已领过', 'bad'); return; }
  acc.achievementsClaimed[a.key] = true;
  const r = a.reward || {};
  if (r.gold) state.gold += r.gold;
  if (r.gem)  state.gem  += r.gem;
  if (r.honor)state.honor+= r.honor;
  if (r.title) unlockTitle(r.title);
  if (r.stat) {
    for (const [k, v] of Object.entries(r.stat)) {
      acc.permanentStats[k] = (acc.permanentStats[k]||0) + v;
    }
  }
  const parts = [];
  if (r.gold) parts.push(r.gold+'💰');
  if (r.gem)  parts.push(r.gem+'💎');
  if (r.honor)parts.push(r.honor+'🏅');
  if (r.title)parts.push('称号「'+r.title+'」');
  if (r.stat) parts.push('+永久属性');
  log(`🎁 领取 [${a.name}] 奖励: ${parts.join(' ')}`, 'legend');
  if (typeof recomputeStats==='function') recomputeStats();
  markDirty('progression','hero');
}

/* ============ 渲染 ============ */
let progSubTab = 'ach'; // 'ach' | 'bes' | 'rep'

function renderProgression() {
  accEns();
  const root = $('tab-progression'); if (!root) return;
  const achTabIcon = (typeof symbolIcon === 'function') ? symbolIcon('🏆', 16, '成就', '🏆') : '🏆';
  const besTabIcon = (typeof symbolIcon === 'function') ? symbolIcon('📖', 16, '图鉴', '📖') : '📖';
  const repTabIcon = (typeof symbolIcon === 'function') ? symbolIcon('⚖️', 16, '声望', '⚖️') : '⚖️';
  // 子页签头
  const head = `
    <div class="sub-tabs">
      <span class="sub-tab ${progSubTab==='ach'?'active':''}" data-sub="ach">${achTabIcon} 成就</span>
      <span class="sub-tab ${progSubTab==='bes'?'active':''}" data-sub="bes">${besTabIcon} 图鉴</span>
      <span class="sub-tab ${progSubTab==='rep'?'active':''}" data-sub="rep">${repTabIcon} 声望</span>
    </div>`;
  let body = '';
  if (progSubTab === 'ach') body = renderAchSubtab();
  else if (progSubTab === 'bes') body = renderBesSubtab();
  else if (progSubTab === 'rep') body = renderRepSubtab();
  root.innerHTML = head + body;
}

function renderAchSubtab() {
  const acc = accEns();
  const titles = ensureUnlockedTitles();
  const sourceMap = titleSourceMap();
  // 按分类分组
  const groups = {};
  for (const a of ACHIEVEMENTS) (groups[a.cat]=groups[a.cat]||[]).push(a);
  const claimedCount = Object.keys(acc.achievementsClaimed).length;
  const totalCount = ACHIEVEMENTS.length;
  const curTitle = acc.title || state.title || '';
  let html = `<div class="prog-summary muted">已领取 <b>${claimedCount}</b> / ${totalCount} ${curTitle?' · 当前称号: <span style="color:var(--gold)">'+curTitle+'</span>':''}</div>`;
  if (titles.length) {
    const crownIcon = (typeof symbolIcon === 'function') ? symbolIcon('👑', 16, '称号收藏', '👑') : '👑';
    html += `<div class="ascend-box" style="margin-bottom:8px">
      <div class="row" style="align-items:center;gap:6px;flex-wrap:wrap">
        <b>${crownIcon} 称号收藏</b>
        <span class="muted" style="font-size:11px">已拥有 ${titles.length} 个</span>
        <span style="flex:1"></span>
        <button data-action="cleartitle" ${curTitle?'':'disabled'}>隐藏称号</button>
      </div>
      <div class="muted" style="font-size:11px;margin:4px 0 6px">${curTitle ? `当前佩戴: <span style="color:var(--gold)">${curTitle}</span>` : '当前未佩戴称号'}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px">
        ${titles.map(title => `<div style="border:1px solid ${title===curTitle?'var(--gold)':'var(--border)'};border-radius:8px;padding:6px;background:${title===curTitle?'rgba(251,191,36,0.08)':'var(--panel-2)'}">
          <div style="font-weight:bold;color:${title===curTitle?'var(--gold)':'var(--text)'}">${title===curTitle?'✓ ':''}${title}</div>
          <div class="muted" style="font-size:10px;margin:3px 0 6px">${sourceMap[title] || '未知来源'}</div>
          <button data-action="equiptitle" data-title="${title.replace(/"/g,'&quot;')}" class="${title===curTitle?'gold':'primary'}" style="width:100%;font-size:11px">${title===curTitle?'已佩戴':'佩戴'}</button>
        </div>`).join('')}
      </div>
    </div>`;
  }
  for (const [cat, list] of Object.entries(groups)) {
    html += `<div class="ach-group"><div class="ach-cat">${cat}</div>`;
    for (const a of list) {
      const r = a.cond();
      const pct = Math.min(100, r.cur/r.goal*100);
      const completed = !!acc.achievementsCompleted[a.key];
      const claimed = !!acc.achievementsClaimed[a.key];
      const rwd = [];
      if (a.reward.gold) rwd.push(a.reward.gold+'💰');
      if (a.reward.gem) rwd.push(a.reward.gem+'💎');
      if (a.reward.honor) rwd.push(a.reward.honor+'🏅');
      if (a.reward.title) rwd.push('「'+a.reward.title+'」');
      if (a.reward.stat) {
        const sb = Object.entries(a.reward.stat).map(([k,v])=>fmtMod(k, v)).join(' ');
        rwd.push(sb);
      }
      const cls = claimed?'ach-claimed':(completed?'ach-ready':'');
      const btn = claimed
        ? `<span class="muted" style="font-size:10px">✓已领</span>`
        : completed
          ? `<button class="gold" data-action="claimach" data-key="${a.key}">领取</button>`
          : `<span class="muted" style="font-size:10px">${fmt(r.cur)}/${fmt(r.goal)}</span>`;
      const achIconHtml = (typeof symbolIcon === 'function') ? symbolIcon(a.icon || '🏆', 22, a.name, a.icon || '🏆') : (a.icon || '🏆');
      html += `<div class="ach-item ${cls}">
        <div class="ach-icon">${achIconHtml}</div>
        <div class="ach-main">
          <div class="ach-name">${a.name}</div>
          <div class="ach-rwd muted">${rwd.join(' · ')}</div>
          <div class="bar xp" style="height:6px;margin-top:2px"><i style="width:${pct}%"></i></div>
        </div>
        <div class="ach-act">${btn}</div>
      </div>`;
    }
    html += '</div>';
  }
  return html;
}

function renderBesSubtab() {
  const acc = accEns();
  const entries = Object.entries(acc.bestiary).sort((a,b)=>b[1]-a[1]);
  if (entries.length === 0) return '<div class="muted" style="padding:8px;text-align:center">先杀些怪物再来看吧!</div>';
  const totalKills = entries.reduce((s,[,n])=>s+n,0);
  let html = `<div class="prog-summary muted">共记录 <b>${entries.length}</b> 种怪物 · 累计击杀 <b>${fmt(totalKills)}</b> (所有角色合并)</div>`;
  html += '<div class="bes-list">';
  for (const [name, n] of entries) {
    const t = getBestiaryTier(n);
    const next = BESTIARY_TIERS.find(x=>n<x.count);
    const tierTxt = t ? `<span class="r-${t.dmgBonus>=6?'epic':(t.dmgBonus>=3?'rare':'uncommon')}">${t.label} +${t.dmgBonus}%伤害 +${t.xpBonus}%经验</span>` : '<span class="muted">未熟悉</span>';
    const nextTxt = next ? `<span class="muted">下阶 ${fmt(next.count)}</span>` : `<span class="r-legend">极致</span>`;
    html += `<div class="bes-item">
      <div class="bes-name">${name}</div>
      <div class="bes-info"><b>${fmt(n)}</b> 次击杀 · ${tierTxt} · ${nextTxt}</div>
    </div>`;
  }
  html += '</div>';
  return html;
}

function renderRepSubtab() {
  const acc = accEns();
  const cur = (typeof getMap==='function')?getMap():null;
  const curFac = cur ? cur.faction : null;
  let html = '';
  if (curFac) {
    const rep = acc.reputation[curFac]||0;
    const t = getRepTier(rep);
    const curIcon = (typeof symbolIcon === 'function') ? symbolIcon(REPUTATION_FACTIONS[curFac]?.icon || '', 16, curFac, REPUTATION_FACTIONS[curFac]?.icon || '') : (REPUTATION_FACTIONS[curFac]?.icon || '');
    html += `<div class="prog-summary muted">当前地图势力: <b>${curIcon} ${curFac}</b> · 阶级 <span style="color:var(--gold)">${t.name}</span> · 加成: +${t.xpPct}%XP +${t.goldPct}%金币 +${t.dropPct}%掉率 +${t.dmgPct}%伤害 (所有角色合并)</div>`;
  }
  html += '<div class="rep-list">';
  for (const [fac, info] of Object.entries(REPUTATION_FACTIONS)) {
    const rep = acc.reputation[fac]||0;
    const t = getRepTier(rep);
    const nxt = getRepNext(rep);
    const pct = nxt ? ((rep - t.rep) / (nxt.rep - t.rep) * 100) : 100;
    const nxtTxt = nxt ? `→ ${nxt.name} (${fmt(rep)}/${fmt(nxt.rep)})` : '已满阶';
    const isCurrent = fac === curFac;
    const facIconHtml = (typeof symbolIcon === 'function') ? symbolIcon(info.icon || '', 16, fac, info.icon || '') : (info.icon || '');
    html += `<div class="rep-item ${isCurrent?'cur':''}">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="color:${info.color};font-weight:bold">${facIconHtml} ${fac}</span>
        <span style="color:var(--gold);font-size:11px">${t.name} ${nxtTxt}</span>
      </div>
      <div class="bar xp" style="height:7px;margin:3px 0"><i style="width:${pct}%;background:${info.color}"></i></div>
      <div class="muted" style="font-size:11px">+${t.xpPct}%XP · +${t.goldPct}%金 · +${t.dropPct}%掉率 · +${t.dmgPct}%伤害</div>
      ${rep >= repExaltedRep() ? (() => {
        const avail = repCachesAvailable(fac);
        const toNext = REP_CACHE_STEP - ((rep - repExaltedRep()) % REP_CACHE_STEP);
        return `<div style="font-size:10px;margin-top:3px">🎁 崇拜宝箱: ${avail > 0
          ? `<button class="gold" data-action="claimrepcache" data-fac="${fac}" style="padding:1px 8px;font-size:10px">领取 ×${avail}</button>`
          : `<span class="muted">再攒 ${fmt(toNext)} 声望开下一个</span>`}</div>`;
      })() : ''}
    </div>`;
  }
  html += '</div>';
  return html;
}

/* ============ 把图鉴/声望/永久属性接入战斗 ============ */
/* 返回 (xpMult, goldMult, dropMult, dmgMult) for current mob */
function progressionCombatBonus(mobName) {
  const z = progressionZoneMultiplier();
  const b = bestiaryBonusFor(mobName||'');
  return {
    xpMult:  1 + (z.xpPct + b.xpPct) / 100,
    goldMult:1 + (z.goldPct) / 100,
    dropMult:1 + (z.dropPct) / 100,
    dmgMult: 1 + (z.dmgPct + b.dmgPct) / 100,
  };
}
