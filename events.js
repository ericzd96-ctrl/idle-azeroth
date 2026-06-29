/* =========================================================
   events.js — 世界Boss / 日常任务 / 赛季 三合一
   ----------------------------------------------------------
   - 世界Boss: 阶段守关 + 终局巨型怪物,8h CD,掉橙装碎片+精华
   - 日常: 每日3条随机任务,完成给资源,7连解周宝箱
   - 赛季: 14天一赛季,从战斗中累计积分,段位结算给永久属性+称号
   ========================================================= */

/* ============ 世界Boss / 阶段守关 / 稀有精英 ============ */
const WORLD_BOSSES = [
  { key:'hogger_king', name:'霍格大王', emoji:'🐗', lvl:30, gateLevel:30, minLvl:30, cdHours:0, color:'#b45309',
    desc:'艾尔文与西部荒野交界传说中的豺狼人之王，专门终结轻敌的新兵。',
    hpMul:17, atkMul:2.65, defMul:1.82, rewards:{ gold:1600, gem:8, honor:120, essence:3 } },
  { key:'swamp_tyrant', name:'沼泽暴君·格拉姆', emoji:'🐊', lvl:40, gateLevel:40, minLvl:40, cdHours:0, color:'#15803d',
    desc:'盘踞湿地深沼的远古巨鳄，会把节奏拖入漫长而窒息的泥潭。',
    hpMul:19.5, atkMul:3.02, defMul:2.12, rewards:{ gold:3400, gem:10, honor:180, essence:4 } },
  { key:'blackrock_overlord', name:'黑石霸主·达格兰', emoji:'⛰️', lvl:50, gateLevel:50, minLvl:50, cdHours:0, color:'#b91c1c',
    desc:'黑石山外围的残暴军阀，开始检验装备、减伤与续航是否真正成型。',
    hpMul:22.5, atkMul:3.3, defMul:2.34, rewards:{ gold:6800, gem:12, honor:280, essence:6 } },
  { key:'kazzak_doom', name:'末日领主卡扎克', emoji:'😈', lvl:60, gateLevel:60, minLvl:60, cdHours:0, color:'#dc2626',
    desc:'诅咒之地裂隙中的末日使者，会把中期的数值短板全部放大。',
    hpMul:26, atkMul:3.68, defMul:2.58, rewards:{ gold:12000, gem:16, honor:420, essence:7 } },
  { key:'magtheridon_wrath', name:'深渊之王玛瑟里顿', emoji:'⛓️', lvl:70, gateLevel:70, minLvl:70, cdHours:0, color:'#f97316',
    desc:'被封印的深渊领主余怒未散，专治“普通团本勉强毕业”的冒险者。',
    hpMul:30.5, atkMul:4.08, defMul:2.92, rewards:{ gold:24000, gem:22, honor:700, essence:10 } },
  { key:'sindragosa_shadow', name:'辛达苟萨之影', emoji:'❄️', lvl:79, gateLevel:79, minLvl:79, cdHours:0, color:'#38bdf8',
    desc:'冰冠的霜魂守门者，只有真正成型的角色才能跨过最后一关。',
    hpMul:35.5, atkMul:4.42, defMul:3.28, rewards:{ gold:42000, gem:30, honor:1200, essence:16 } },
  { key:'deathwing', name:'死亡之翼·灭世者', emoji:'🐲', lvl:85, minLvl:80, color:'#dc2626',
    desc:'被腐化的大地守护神，真正的终局世界Boss之一。',
    hpMul:42, atkMul:5.4, defMul:3.8, cdHours:8,
    rewards:{ gold:90000, gem:150, honor:4200, essence:45, shards:10 } },
  { key:'ragnaros', name:'拉格纳罗斯·火焰之王', emoji:'🔥', lvl:85, minLvl:80, color:'#f97316',
    desc:'熔火之心最深处的炎王，普攻和技能都不会再像挠痒痒。',
    hpMul:38, atkMul:5.8, defMul:3.4, cdHours:8,
    rewards:{ gold:82000, gem:130, honor:4000, essence:50, shards:8 } },
  { key:'cthun', name:'克苏恩·疯狂之眼', emoji:'👁️', lvl:85, minLvl:80, color:'#a855f7',
    desc:'希利苏斯旧神低语的本体，拖得越久越容易被机制碾碎。',
    hpMul:46, atkMul:5.1, defMul:4.1, cdHours:8,
    rewards:{ gold:86000, gem:160, honor:4600, essence:40, shards:12 } },
  { key:'yogg_saron', name:'尤格萨隆·千喉之梦', emoji:'🧠', lvl:86, minLvl:80, color:'#8b5cf6',
    desc:'奥杜尔深处的梦魇低语，会用恐惧、镜像与灵魂链接拖垮队伍。',
    hpMul:49, atkMul:5.35, defMul:4.25, cdHours:8,
    rewards:{ gold:94000, gem:170, honor:5000, essence:48, shards:12 } },
  { key:'alakir', name:'奥拉基尔·风暴王座', emoji:'🌪️', lvl:86, minLvl:80, color:'#06b6d4',
    desc:'元素位面的风暴君王，攻速极快，擅长打断与连锁压制。',
    hpMul:44, atkMul:5.75, defMul:3.85, cdHours:8,
    rewards:{ gold:98000, gem:175, honor:5200, essence:50, shards:13 } },
  { key:'lei_shen', name:'雷神·雷霆之王', emoji:'⚡', lvl:88, minLvl:80, color:'#eab308',
    desc:'魔古帝国的暴君归来，闪电、沉默与处刑会连续考验爆发窗口。',
    hpMul:52, atkMul:5.9, defMul:4.4, cdHours:8,
    rewards:{ gold:112000, gem:195, honor:5900, essence:58, shards:15 } },
  { key:'argus_unmaker', name:'阿古斯·寂灭者', emoji:'🌌', lvl:90, minLvl:80, color:'#6366f1',
    desc:'群星尽头的终极试炼，拥有极高耐久与多段压制机制。',
    hpMul:61, atkMul:6.25, defMul:4.95, cdHours:8,
    rewards:{ gold:150000, gem:260, honor:8200, essence:82, shards:22 } },
];
for (const wb of WORLD_BOSSES) {
  const profile = (typeof WORLD_BOSS_SKILLSETS === 'object' && WORLD_BOSS_SKILLSETS[wb.key]) || null;
  if (profile) Object.assign(wb, profile);
}
const WBOSS_CD_HOURS = 8;
const SHARD_EXCHANGE_COST = 50; // 50 碎片 = 1 自选橙装

/* 世界Boss 累计击杀里程碑(per-char,达标一次性奖励) */
const WBOSS_KILL_MILESTONES = [
  { n:5,   reward:{ gem:20,  essence:15 } },
  { n:15,  reward:{ gem:50,  essence:40,  shards:5 } },
  { n:30,  reward:{ gem:120, essence:80,  shards:10 }, title:'屠龙者' },
  { n:60,  reward:{ gem:300, essence:150, shards:20 }, title:'世界Boss征服者' },
  { n:100, reward:{ gem:600, essence:300, shards:30 } },
  { n:150, reward:{ gem:900, essence:450, shards:45 }, title:'终局讨伐者' },
  { n:250, reward:{ gem:1600, essence:800, shards:80 }, title:'群星征服者' },
];
function worldBossCheckKillMilestone() {
  if (!state.worldBoss.killMs) state.worldBoss.killMs = {};
  const total = state.worldBoss.totalKilled || 0;
  for (const m of WBOSS_KILL_MILESTONES) {
    if (total >= m.n && !state.worldBoss.killMs[m.n]) {
      state.worldBoss.killMs[m.n] = true;
      const r = m.reward || {};
      if (r.gem) state.gem += r.gem;
      if (r.essence) state.essence += r.essence;
      if (r.shards) state.worldBoss.shards = (state.worldBoss.shards || 0) + r.shards;
      if (m.title && typeof unlockTitle === 'function') unlockTitle(m.title);
      const parts = [];
      if (r.gem) parts.push(r.gem + '💎'); if (r.essence) parts.push(r.essence + '✨');
      if (r.shards) parts.push(r.shards + '🧩'); if (m.title) parts.push(`称号「${m.title}」`);
      log(`🏆 世界Boss 累计击杀 ${m.n} 次里程碑! ${parts.join(' ')}`, 'legend');
    }
  }
}

function ensureEventState() {
  if (!state.worldBoss) state.worldBoss = { lastKill:{}, shards:0, totalKilled:0, stageClears:{}, rareKills:{} };
  if (!state.worldBoss.lastKill) state.worldBoss.lastKill = {};
  if (!state.worldBoss.stageClears) state.worldBoss.stageClears = {};
  if (!state.worldBoss.rareKills) state.worldBoss.rareKills = {};
  if (typeof state.worldBoss.shards !== 'number') state.worldBoss.shards = 0;
  if (typeof state.worldBoss.totalKilled !== 'number') state.worldBoss.totalKilled = 0;
  if (!state.daily) state.daily = { resetAt:0, tasks:[], weekStreak:0, weeklyClaimedAt:0 };
  if (!state.eventsCounters) state.eventsCounters = { itemsRare:0, sessionGold:0, sessionKills:0, sessionDungeons:0 };
  // 赛季已搬到 account, 用 ensureSeason()
}

function getWorldBossDef(key) {
  return WORLD_BOSSES.find(b => b.key === key) || null;
}
function isStageWorldBoss(wb) {
  return !!(wb && wb.gateLevel);
}
function isApexWorldBoss(wb) {
  return !!(wb && !wb.gateLevel);
}
function trialWorldBosses() {
  return WORLD_BOSSES.filter(isStageWorldBoss).sort((a, b) => a.gateLevel - b.gateLevel);
}
function worldBossCooldownMs(wb) {
  const hours = Math.max(0, wb?.cdHours == null ? WBOSS_CD_HOURS : wb.cdHours);
  return Math.floor(hours * 3600 * 1000);
}
function worldBossMinLevel(wb) {
  return wb?.minLvl || Math.max(1, (wb?.lvl || 1) - 5);
}
function worldBossStageCleared(wb) {
  ensureEventState();
  return !!(wb && isStageWorldBoss(wb) && state.worldBoss.stageClears[wb.key]);
}
function currentXpGate() {
  ensureEventState();
  for (const wb of trialWorldBosses()) {
    if (state.hero.lvl >= wb.gateLevel && !worldBossStageCleared(wb)) {
      return { key: wb.key, level: wb.gateLevel, name: wb.name, boss: wb };
    }
  }
  return null;
}

// 世界Boss强度系数(可调):血量是耐久战核心,大幅上调;攻击小幅上调增加威胁
const WORLD_BOSS_HP_BUFF = 2.5;
const WORLD_BOSS_ATK_BUFF = 1.15;
function buildWorldBossMonsterData(wb) {
  const boss = wb || {};
  const baseHp = Math.floor((100 + boss.lvl * boss.lvl * 6.0) * (boss.hpMul || 1) * WORLD_BOSS_HP_BUFF);
  const baseAtk = Math.floor((8 + boss.lvl * 3.0) * (boss.atkMul || 1) * WORLD_BOSS_ATK_BUFF);
  return {
    name: boss.emoji + boss.name,
    bossName: boss.name,
    isBoss: true,
    isWorldBoss: true,
    wbKey: boss.key,
    _uid: Date.now() + Math.floor(Math.random() * 1000),
    lvl: boss.lvl,
    hpMax: baseHp,
    hp: baseHp,
    atk: Math.floor(baseAtk * (1 + (boss.passive?.atkBonus || 0))),
    def: Math.floor((3 + boss.lvl * 1.3) * (boss.defMul || 1)),
    baseGold: Math.max(1, Math.floor((boss.rewards?.gold || 1) / 30)),
    baseXp: isStageWorldBoss(boss) ? Math.max(180, boss.lvl * 16) : 300,
    goldReward: boss.rewards?.gold || 0,
    honorReward: boss.rewards?.honor || 0,
    dropRate: isApexWorldBoss(boss) ? 1.0 : 0.9,
    gemChance: 0,
    maxRarity: isApexWorldBoss(boss) ? 'legend' : (boss.lvl >= 50 ? 'epic' : 'rare'),
    _dots: {},
    _dotLegacyImported: true,
    _lastDotTick: 0,
    dodgeChance: boss.passive?.dodgeChance || 0.08,
    critChance: boss.passive?.critChance || 0.18,
    dmgReduction: boss.passive?.dmgReduction || 0.2,
    lifeSteal: boss.passive?.leech || 0,
    stunChance: boss.passive?.stunChance || 0,
    instantCast: boss.instantCast !== undefined ? !!boss.instantCast : true,
    instantCastChance: typeof boss.instantCastChance === 'number' ? boss.instantCastChance : undefined,
    atkInterval: boss.atkInterval || (isApexWorldBoss(boss) ? 1125 : boss.lvl >= 70 ? 1225 : 1325),
    _monSkills: [],
    _monSkill: null,
    _monSupportSkills: typeof buildMonsterSupportPool === 'function'
      ? buildMonsterSupportPool(boss.name, null, boss.lvl, true, boss.supportCount || 4)
      : [],
    _supportSkillCooldowns: {},
    _lastSupportSkill: Date.now() - 4000,
    _lastTrick: 0,
    _nextTrickAt: Date.now() + (isApexWorldBoss(boss) ? 6500 : 7800)
  };
}

function getRareEliteForMap(mapKey) {
  return (typeof RARE_ELITES !== 'undefined' ? RARE_ELITES.find(r => r.mapKey === mapKey) : null) || null;
}
function buildRareEliteMonsterData(rare) {
  const baseHp = Math.floor((100 + rare.lvl * rare.lvl * 7.5) * (rare.hpMul || 1));
  const baseAtk = Math.floor((10 + rare.lvl * 3.2) * (rare.atkMul || 1));
  return {
    name: rare.emoji + rare.name,
    bossName: rare.name,
    isBoss: true,
    isRareElite: true,
    rareKey: rare.key,
    _uid: Date.now() + Math.floor(Math.random() * 1000),
    lvl: rare.lvl,
    hpMax: baseHp,
    hp: baseHp,
    atk: Math.floor(baseAtk * (1 + (rare.passive?.atkBonus || 0))),
    def: Math.floor((3 + rare.lvl * 1.5) * (rare.defMul || 1)),
    baseGold: Math.max(1, Math.floor((rare.rewards?.gold || 1) / 24)),
    baseXp: Math.max(90, rare.lvl * 8),
    goldReward: rare.rewards?.gold || 0,
    honorReward: rare.rewards?.honor || 0,
    dropRate: 0.45,
    gemChance: 0,
    maxRarity: rare.lvl >= 55 ? 'epic' : 'rare',
    _dots: {},
    _dotLegacyImported: true,
    _lastDotTick: 0,
    dodgeChance: rare.passive?.dodgeChance || 0.06,
    critChance: rare.passive?.critChance || 0.12,
    dmgReduction: rare.passive?.dmgReduction || 0.08,
    lifeSteal: rare.passive?.leech || 0,
    stunChance: rare.passive?.stunChance || 0,
    instantCast: rare.lvl >= 60,
    atkInterval: rare.atkInterval || (rare.lvl >= 60 ? 1300 : 1425),
    _monSkills: [],
    _monSkill: null,
    _monSupportSkills: typeof buildMonsterSupportPool === 'function'
      ? buildMonsterSupportPool(rare.name, null, rare.lvl, true, rare.supportCount || 1)
      : [],
    _supportSkillCooldowns: {},
    _lastSupportSkill: Date.now() - 3500,
    _lastTrick: 0,
    _nextTrickAt: Date.now() + 9000
  };
}

function maybeSpawnRareEliteEncounter(map) {
  if (!map || typeof RARE_ELITES === 'undefined') return false;
  if (state.mode !== 'world') return false;
  const rare = getRareEliteForMap(map.key);
  if (!rare) return false;
  if (Math.random() >= (rare.spawnChance || 0.025)) return false;
  state._currentRareElite = rare.key;
  state.currentMonsters = [buildRareEliteMonsterData(rare)];
  log(`⭐ 遭遇稀有精英 [${rare.name}]！`, 'epic');
  if (typeof markDirty === 'function') markDirty('map', 'stage', 'events');
  return true;
}

function leaveRareEliteEncounter() {
  state._currentRareElite = null;
  state.currentMonsters = [];
  if (state.mode !== 'world') state.mode = 'world';
  spawnMonster();
  markDirty('map', 'events', 'stage');
}

function worldBossAvailableAt(key) {
  ensureEventState();
  const wb = getWorldBossDef(key);
  if (!wb) return 0;
  const last = state.worldBoss.lastKill[key] || 0;
  return last + worldBossCooldownMs(wb);
}
function worldBossReady(key) {
  return Date.now() >= worldBossAvailableAt(key);
}

function challengeWorldBoss(key) {
  ensureEventState();
  const wb = getWorldBossDef(key); if (!wb) return;
  if (!worldBossReady(key)) { log('世界BOSS冷却中', 'bad'); return; }
  if (state.mode === 'travel') { log('正在旅行中', 'bad'); return; }
  if (state.mode !== 'world') { log('请先结束当前战斗', 'bad'); return; }
  const minLvl = worldBossMinLevel(wb);
  if (state.hero.lvl < minLvl) { log(`需要等级 Lv.${minLvl}+`, 'bad'); return; }
  state.mode = 'worldboss';
  state._currentWBoss = key;
  state._currentRareElite = null;
  state.currentMonsters = [];
  state.hp = state.hero.hpMax; state.resource = state.resourceMax;
  if (typeof resetDmgStats === 'function') resetDmgStats();
  if (typeof clearAllBuffs === 'function') clearAllBuffs();
  state.currentMonsters.push(buildWorldBossMonsterData(wb));
  log(`⚔️ 挑战世界BOSS [${wb.name}]!`, isApexWorldBoss(wb) ? 'legend' : 'epic');
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
  const wb = getWorldBossDef(key); if (!wb) return;
  state.worldBoss.lastKill[key] = Date.now();
  state.worldBoss.totalKilled = (state.worldBoss.totalKilled||0) + 1;
  worldBossCheckKillMilestone();
  if (typeof mountOnWorldBossKill==='function') mountOnWorldBossKill(key);
  state.gem += wb.rewards?.gem || 0;
  if (typeof ensureMats==='function') ensureMats();
  state.essence += wb.rewards?.essence || 0;

  if (isStageWorldBoss(wb)) {
    const firstClear = !worldBossStageCleared(wb);
    state.worldBoss.stageClears[wb.key] = true;
    const mainRarity = wb.lvl >= 50 ? 'epic' : 'rare';
    const mainItem = rollItem(mainRarity, wb.lvl);
    addToInventory(mainItem);
    if (typeof eventsOnItemGet==='function') eventsOnItemGet(mainItem);
    if (firstClear) {
      const bonusItem = rollItem('epic', wb.lvl + 1);
      addToInventory(bonusItem);
      if (typeof eventsOnItemGet==='function') eventsOnItemGet(bonusItem);
      log(`🏁 击败阶段守关Boss ${wb.name}，Lv.${wb.gateLevel} 经验封锁已解除！`, 'legend');
    } else {
      if (wb.lvl >= 60) {
        const bonusItem = rollItem('epic', wb.lvl);
        addToInventory(bonusItem);
        if (typeof eventsOnItemGet==='function') eventsOnItemGet(bonusItem);
      }
      log(`🏆 再次击败 ${wb.name}! +${wb.rewards?.gem || 0}💎 +${wb.rewards?.essence || 0}✨`, 'epic');
    }
    seasonAddPoints(180 + wb.lvl * 3, '阶段世界Boss');
    if (typeof gainXP === 'function') gainXP(0);
  } else {
    state.worldBoss.shards = (state.worldBoss.shards||0) + (wb.rewards?.shards || 0);
    for (let i = 0; i < 2; i++) {
      const ep = rollItem('epic', wb.lvl);
      addToInventory(ep);
      if (typeof eventsOnItemGet==='function') eventsOnItemGet(ep);
    }
    if (Math.random() < 0.35) {
      const lg = rollItem('legend', wb.lvl);
      addToInventory(lg);
      if (typeof eventsOnItemGet==='function') eventsOnItemGet(lg);
      if (typeof progressionOnLegendary==='function') progressionOnLegendary();
    }
    seasonAddPoints(500, '世界Boss');
    log(`🏆 击败 ${wb.name}! +${wb.rewards.shards || 0}橙装碎片 +${wb.rewards.gem || 0}💎 +${wb.rewards.essence || 0}✨`, 'legend');
  }

  leaveWorldBoss();
  markDirty('events','hero','inventory','map');
}

function onRareEliteKill(mon) {
  ensureEventState();
  const rare = typeof RARE_ELITES !== 'undefined' ? RARE_ELITES.find(r => r.key === mon.rareKey) : null;
  if (!rare) {
    state._currentRareElite = null;
    spawnMonster();
    return;
  }
  state._currentRareElite = null;
  state.worldBoss.rareKills[rare.key] = (state.worldBoss.rareKills[rare.key] || 0) + 1;
  state.gem += rare.rewards?.gem || 0;
  if (typeof ensureMats === 'function') ensureMats();
  state.essence += rare.rewards?.essence || 0;
  const item = rollItem(rare.lvl >= 55 ? 'epic' : 'rare', rare.lvl, rare.mapKey);
  addToInventory(item);
  if (typeof eventsOnItemGet === 'function') eventsOnItemGet(item);
  if (rare.lvl >= 60 && Math.random() < 0.12) {
    const bonus = rollItem('epic', rare.lvl + 1, rare.mapKey);
    addToInventory(bonus);
    if (typeof eventsOnItemGet === 'function') eventsOnItemGet(bonus);
  }
  seasonAddPoints(80 + rare.lvl * 2, '稀有精英');
  log(`⭐ 击败稀有精英 ${rare.name}! +${rare.rewards.gem || 0}💎 +${rare.rewards.essence || 0}✨`, 'epic');
  spawnMonster();
  markDirty('events', 'inventory', 'hero', 'map');
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
  if (eventsSubTab === 'wb' && typeof bindWorldBossTooltips === 'function') bindWorldBossTooltips(root);
}

function renderWorldBossSub() {
  const gate = currentXpGate();
  const gateHtml = gate
    ? `<div class="stage-gate-note" style="margin-bottom:8px"><b>当前卡级:</b> Lv.${gate.level} · 击败 <b>${gate.name}</b> 后继续获得经验</div>`
    : '';
  const _wbTotal = state.worldBoss.totalKilled||0;
  const _wbNext = WBOSS_KILL_MILESTONES.find(m => _wbTotal < m.n);
  let html = `<div class="prog-summary muted">${gateHtml}橙装碎片: <b style="color:var(--legend)">${state.worldBoss.shards||0}</b> / ${SHARD_EXCHANGE_COST} · 累计击败 ${_wbTotal} 次
    ${(state.worldBoss.shards||0)>=SHARD_EXCHANGE_COST ? '<button class="gold" data-action="exchangeshards" style="margin-left:8px">合成橙装</button>' : ''}
    <div style="font-size:10px;margin-top:3px">🏆 击杀里程碑: ${WBOSS_KILL_MILESTONES.map(m=>`<span style="opacity:${_wbTotal>=m.n?1:0.5}">${_wbTotal>=m.n?'✅':'🔒'}${m.n}${m.title?'👑':''}</span>`).join(' · ')}${_wbNext?` · 下一档还需 ${_wbNext.n-_wbTotal} 次`:' · 全部达成'}</div>
  </div>`;
  const renderRewardLine = wb => {
    const parts = [];
    if (wb.rewards?.gold) parts.push(`${wb.rewards.gold}💰`);
    if (wb.rewards?.gem) parts.push(`${wb.rewards.gem}💎`);
    if (wb.rewards?.honor) parts.push(`${wb.rewards.honor}🏅`);
    if (wb.rewards?.essence) parts.push(`${wb.rewards.essence}✨`);
    if (wb.rewards?.shards) parts.push(`${wb.rewards.shards}🧩碎片`);
    const bossDrops = (typeof globalThis !== 'undefined' && globalThis.WORLD_BOSS_MOUNT_DROPS) || (typeof WORLD_BOSS_MOUNT_DROPS !== 'undefined' ? WORLD_BOSS_MOUNT_DROPS : null);
    const mounts = (typeof globalThis !== 'undefined' && globalThis.MOUNTS) || (typeof MOUNTS !== 'undefined' ? MOUNTS : null);
    if (bossDrops && mounts) {
      const drop = bossDrops[wb.key];
      const mount = drop ? mounts.find(m => m.key === drop.key) : null;
      if (mount) parts.push(`${mount.icon}${mount.name}(${(drop.chance * 100).toFixed(1)}%)`);
    }
    return parts.join(' ');
  };

  html += `<div class="wb-list">`;
  for (const wb of trialWorldBosses()) {
    const cleared = worldBossStageCleared(wb);
    const ready = worldBossReady(wb.key);
    const statusText = state.hero.lvl < worldBossMinLevel(wb)
      ? `需 Lv.${worldBossMinLevel(wb)}`
      : cleared
        ? '已突破'
        : (gate?.key === wb.key ? '正在卡级' : '可挑战');
    html += `<div class="wb-item ${ready && !cleared ? 'wb-ready' : ''}" style="border-left:4px solid ${wb.color}">
      <div class="wb-main">
        <div class="wb-name wb-name-tip" data-wb-key="${wb.key}" style="color:${wb.color};cursor:help">${wb.emoji} ${wb.name} <span class="muted" style="font-size:10px">Lv.${wb.lvl}</span></div>
        <div class="muted" style="font-size:11px">${wb.desc}</div>
        <div class="muted" style="font-size:10px;margin-top:2px">奖励: ${renderRewardLine(wb)}</div>
      </div>
      <div class="wb-act">
        <div class="muted" style="font-size:10px;margin-bottom:4px">${statusText}</div>
        <button class="${cleared ? 'primary' : 'danger'}" data-action="challengewb" data-key="${wb.key}" ${state.hero.lvl < worldBossMinLevel(wb) ? 'disabled' : ''}>${cleared ? '再战' : '挑战'}</button>
      </div>
    </div>`;
  }
  html += '</div>';
  html += `<div class="muted" style="margin:10px 0 4px;font-size:11px">终局世界Boss</div><div class="wb-list">`;
  for (const wb of WORLD_BOSSES.filter(isApexWorldBoss)) {
    const ready = worldBossReady(wb.key);
    const nextTs = worldBossAvailableAt(wb.key);
    const cd = Math.max(0, Math.ceil((nextTs - Date.now())/1000));
    html += `<div class="wb-item ${ready?'wb-ready':''}" style="border-left:4px solid ${wb.color}">
      <div class="wb-main">
        <div class="wb-name wb-name-tip" data-wb-key="${wb.key}" style="color:${wb.color};cursor:help">${wb.emoji} ${wb.name} <span class="muted" style="font-size:10px">Lv.${wb.lvl}</span></div>
        <div class="muted" style="font-size:11px">${wb.desc}</div>
        <div class="muted" style="font-size:10px;margin-top:2px">奖励: ${renderRewardLine(wb)}</div>
      </div>
      <div class="wb-act">
        ${ready ? `<button class="danger" data-action="challengewb" data-key="${wb.key}" ${state.hero.lvl < worldBossMinLevel(wb) ? 'disabled' : ''}>挑战</button>`
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
