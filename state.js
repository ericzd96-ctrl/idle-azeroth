/* =========================================================
   state.js — 状态、存档、dirty 标记系统
   ========================================================= */

const defaultState = () => ({
  name: '',
  faction: '',
  race: '',
  cls: null,
  hero: { lvl:1, xp:0 },
  attrs: { str:0, agi:0, int:0, spi:0, sta:0 },
  talentPoints: 0,
  talents: {},
  freeRespecUsed: false,   // 首次洗点免费
  unlockedSkills: {},
  selectedSkills: [],
  specialization: null,   // 选择的专精树key
  loadouts: [],           // 配装预设 [{name,spec,talents,skills,equipped:{slot:id}}]
  autoSkill: true,
  autoSkillConfig: { damage:true, burst:true, buff:true, interrupt:false },
  skillCooldowns: {},
  passivesSeen: {},        // 被动技能已弹过解锁提示的 key(避免重复刷日志)
  dungeonAnnounceLvl: 0,   // 已对"新副本开放"提示到的等级(0=未初始化,首检静默对齐当前等级防回填刷屏)
  paragon: { xp:0, lvl:0, points:0, board:{}, ms:{} },   // 巅峰系统(满级后无限成长,per-char)
  resource: 0,
  resourceMax: 100,
  hp: 50,
  buffs: {},
  talentAuras: {},         // 天赋触发出来的临时增益 { auraKey: expireTs }
  talentState: { cds:{}, flags:{}, shield:0 }, // 天赋运行时状态(冷却/标记/护盾)
  heroDebuffs: {},         // 敌人/boss 施加在英雄身上的减益 {key:{expire,dps?}}
  currentMap: 'elwynn',
  currentSubzone: 0,
  subzoneKills: {},
  subzoneCleared: {},
  worldFieldOps: { active:{}, completed:{} },
  worldRenown: { maps:{} },
  bossCd: {},
  killsTotal: 0,
  gold: 0,
  gem: 5,
  honor: 0,
  inventory: [],
  invCap: 60,              // 背包容量(可花金币扩展)
  equipped: {},
  autoSellRarity: null,
  companions: [],          // [{key,quality,stars,shards,awakened,awakenRank,familiarity}]
  companionWishlist: [],   // 账号共享:随从收藏目标 key[]
  activeCompanion: -1,     // 当前出战随从索引, -1=无
  companionSupport: [],     // 当前角色:支援随从 key[],不直接普攻,但会低频触发支援专属
  companionTactic: 'balanced', // 当前角色:出战随从战术指令
  companionShards: {},     // {key: count} 碎片
  compUniversalShards: {white:0,green:0,blue:0,purple:0,orange:0}, // 品质通用碎片
  companionMissions: { active:[], totalCompleted:0, history:[] }, // 随从派遣任务
  mode: 'world',
  battleSpeed: 1,          // 战斗倍速(1x / 2x)
  travel: null,
  worldSearch: null,
  worldCombatPause: null,
  dungeonState: null,
  dungeonCd: {},
  dungeonFirstClear: {},   // 每角色:已首通的副本 key(首通一次性奖励用)
  dungeonBounty: { resetAt:0, targets:[], claimed:{} },
  dungeonContractLevel: 0,
  bossCd: {},
  startTime: Date.now(),
  lastTick: Date.now(),
  currentMonsters: [],
  // ---- 装备深度 ----
  essence: 0,           // 魔法精华(附魔/重铸/拆宝石的材料)
  gems: {},             // {gemKey: count} 库存
  // ---- 成就/图鉴/声望 ----
  bestiary: {},         // {mobName: killCount}
  reputation: {},       // {factionName: amount}
  bossesKilled: {},     // {mapKey: count}
  dungeonClearsTotal: 0,
  maxDmg: 0,            // 单次最大伤害
  lifetimeGold: 0,
  gemsInserted: 0,
  enchantsApplied: 0,
  rerollsDone: 0,
  achievementsClaimed: {},
  achievementsCompleted: {},
  permanentStats: {},   // 成就/赛季给的永久属性
  title: '',
  // ---- 世界Boss/日常/赛季 ----
  worldBoss: { lastKill:{}, shards:0, totalKilled:0, stageClears:{}, rareKills:{} },
  daily: { resetAt:0, tasks:[], weekStreak:0, weeklyClaimedAt:0 },
  season: { startAt:0, endAt:0, points:0, history:[], id:1 },
  // ---- 觉醒 ----
  ascendLvl: 0,
  ascendCount: 0,
  ascendMilestones: {},
  tickets: 10,
  compTickets: 5,
  mythicLevel: 1,
  mythicSelectLevel: 1,
  mythicState: null,
  pendingMythicAscend: 0,
  mythicTiersClaimed: {},
  mythicPendingUnique: {},
  // ---- 无尽塔 ----
  tower: { highest:0, weeklyHighest:0, weeklyResetAt:0, milestonesClaimed:{}, totalRuns:0 },
  towerState: null,         // 进行中: { floor, startFloor, loot:[], coinThisRun:0 }
  towerStartFloor: 1,       // 玩家选择从哪一层开始(下次进入)
  towerCoin: 0,             // 🪙 塔币
  // ---- 幻象挑战(Roguelike) ----
  roguelikeState: null,     // 进行中: { floor, abilityChoices:[], chosenAbilities:[], coinThisRun:0 }
  roguelike: { highest:0, totalRuns:0, milestonesClaimed:{}, weeklyHighest:0, weeklyResetAt:0 },
  roguelikeCoin: 0,         // 🤖 幻象币
  // ---- 生活技能 ----
  life: { mining:{lvl:0,xp:0}, fishing:{lvl:0,xp:0}, herb:{lvl:0,xp:0}, mats:{}, tools:{ mining:0, fishing:0, herb:0 }, orders:{ nextRefreshAt:0, slots:[] } },
  lifeAction: null,         // { type, startedAt, lastYieldAt }
  lifeBuffs: {},            // { buffKey: expireTs }
  // ---- 神器 ----
  // 旧版(per-char 单神器)保留作迁移源
  artifact: { lvl:0, ap:0, traits:{}, milestonesSeen:{} },
  // 新版: 每专精一把独立神器 { [spec]: { ap, lvl, traits:{}, capstone:null, infRank:0, relics:[] } }
  artifacts: {},
  // ---- 坐骑 ----
  activeMount: null,
  // ---- 竞技场(PvP)----
  arena: { rating:0, best:0, wins:0, losses:0, streak:0, dailyMatches:0, dailyWins:0, dailyResetAt:0, vendor:{}, arsenal:{}, seals:0, tierRewards:{}, dailyRewards:{}, opp:null, tactic:'balanced', crowd:0, lastReport:null },
});

let state;
let characters = [];
let activeCharIndex = 0;
let account;  // 所有角色共享的账号级数据(成就/图鉴/声望/光辉值/赛季)

/* 账号级默认数据 */
/* 账号共享的"公共资源"字段(2026-06-15):货币/材料/票券/随从图鉴。
   这些字段在每个角色 state 上是转发到 account 的访问器(installSharedAccessors),
   所有现有 state.gold / state.companions 等读写都透明命中共享池。activeCompanion 仍按角色。 */
const SHARED_FIELDS = ['gold','gem','honor','essence','tickets','compTickets','towerCoin','roguelikeCoin','gems','companions','companionWishlist','companionShards','compUniversalShards','companionMissions','life'];

function defaultAccount() {
  return {
    // ---- 公共资源(账号共享) ----
    gold: 0, gem: 5, honor: 0, essence: 0,
    tickets: 10, compTickets: 5, towerCoin: 0, roguelikeCoin: 0,
    gems: {},                 // 宝石库存 {gemKey:count}
    companions: [],           // 随从图鉴 [{key,stars}]
    companionWishlist: [],    // 随从收藏目标 key[]
    companionShards: {},      // 随从碎片 {key:count}
    compUniversalShards: {white:0,green:0,blue:0,purple:0,orange:0}, // 品质通用碎片
    companionMissions: { active:[], totalCompleted:0, history:[] }, // 账号共享随从派遣
    life: { mining:{lvl:0,xp:0}, fishing:{lvl:0,xp:0}, herb:{lvl:0,xp:0}, mats:{}, tools:{ mining:0, fishing:0, herb:0 }, orders:{ nextRefreshAt:0, slots:[] } },  // 采集/生活技能(账号共享,老存档不迁移=清零)
    _sharedMigrated: false,   // 公共资源是否已从老角色聚合(防重复)
    _companionSharedMigrated: false, // 新增随从共享字段是否已从角色聚合
    // 坐骑(账号共享收藏)
    mounts: {},
    // 成就(账号共享)
    achievementsClaimed: {},
    achievementsCompleted: {},
    unlockedTitles: [],
    title: '',
    permanentStats: {},     // 成就奖励的永久属性
    // 成就追踪用的累计计数器
    killsTotal: 0,
    maxDmg: 0,
    lifetimeGold: 0,
    gemsInserted: 0,
    enchantsApplied: 0,
    rerollsDone: 0,
    dungeonClearsTotal: 0,
    dungeonClearsByKey: {},
    bossesKilled: {},       // {mapKey: count} 累计所有角色击败的地图Boss
    subzonesCleared: {},    // {map-sub: true} 所有角色合并的探索进度
    legendariesEverFound: 0,// 拾取过的橙装总数(任何角色)
    // 图鉴(账号合并)
    bestiary: {},           // {mobName: killCount}
    // 声望(账号合并)
    reputation: {},         // {factionName: amount}
    repCaches: {},          // {factionName: 已领崇拜后宝箱数}
    dungeonMastery: { tracks:{}, totalXp:0 },
    zoneBounties: { claimed:{} }, // 区域悬赏一次性补给 {claimed:{mapKey:true}}
    dragonTreasures: { claimed:{} }, // 龙岛宝藏收藏 {claimed:{treasureKey:timestamp}}
    classOrders: { claimed:{} }, // 职业大厅委托 {claimed:{classMissionKey:timestamp}}
    chronicles: { claimed:{} }, // 艾泽拉斯编年史 {claimed:{chapterKey:timestamp}}
    worldInvasions: { progress:{}, claimed:{}, totalClaims:0 }, // 世界入侵轮换
    kareshExpedition: { weekId:0, missions:[], claimed:{}, seals:0, totalClaims:0, totalSeals:0, cacheClaims:0, metaClaimed:false, history:[] }, // 卡雷什终局远征周常
    timewalking: { weekId:0, eraKey:'classic', missions:[], claimed:{}, badges:0, totalBadges:0, totalClaims:0, cacheClaims:0, metaClaimed:false, metaClaims:0, history:[], research:{}, bought:{}, erasMastered:{}, maxThreat:0, distortions:[], selected:{}, distortionClears:0 }, // 时光漫游周轮换
    stronghold: { buildings:{}, totalUpgrades:0 }, // 要塞建设(账号共享):建筑等级与长期经营目标
    astrology: { stardust:0, unlocked:{}, lastObserve:0, totalObserved:0 }, // 占星命盘:星尘与点亮节点
    // 光辉值(账号共享)
    ascendLvl: 0,
    ascendCount: 0,
    ascendMilestones: {},
    // 赛季(账号共享)
    season: { startAt:0, endAt:0, points:0, history:[], id:1 },
    // 神器遗物背包(账号共享,未镶嵌的遗物;已镶嵌的存于各专精 state.artifacts[spec].relics)
    relics: [],
    // 放置小号军团/远征(账号共享):非当前角色被动产出金币/精华/钻石,惰性按时间结算
    expedition: { level: 0, lastClaim: 0, acc: { gold: 0, essence: 0, gem: 0 } },
    // 公会/社团(账号共享):每日捐献→贡献点→公会科技永久加成
    guild: { level: 1, xp: 0, contrib: 0, tech: {}, donatedDay: 0, donatedKeys: [] },
    // 轮换黑市(账号共享):每日刷新商品,每件每天限购一次
    market: { day: -1, bought: [], routes: { invested:{} } },
    // 每日/每周任务板(账号共享):自动刷新目标 → 完成领奖
    quests: { day: -1, week: -1, daily: [], weekly: [], dailyBonusClaimed: false, weeklyBonusClaimed: false },
    // 每周宝库(账号共享):积累 endgame 活跃度 → 周结算锁入 → 挑 1 件领取
    vault: { week: -1, prog: { dungeon:0, mythic:0, arena:0 }, reward: null },
    // 幻象神龛(账号共享):幻象币买的常驻强化,仅幻象 run 内生效
    roguelikeShrine: {},
  };
}

function mergeAccount(saved) {
  if (!saved) return defaultAccount();
  const d = defaultAccount();
  const mo = (def, sav) => Object.assign({}, def, sav || {});
  return Object.assign(d, saved, {
    achievementsClaimed: saved.achievementsClaimed || {},
    achievementsCompleted: saved.achievementsCompleted || {},
    unlockedTitles: Array.isArray(saved.unlockedTitles) ? saved.unlockedTitles : [],
    permanentStats: saved.permanentStats || {},
    bossesKilled: saved.bossesKilled || {},
    dungeonClearsByKey: saved.dungeonClearsByKey || {},
    subzonesCleared: saved.subzonesCleared || {},
    bestiary: saved.bestiary || {},
    reputation: saved.reputation || {},
    repCaches: saved.repCaches || {},
    dungeonMastery: saved.dungeonMastery ? Object.assign({}, d.dungeonMastery, saved.dungeonMastery, {
      tracks: saved.dungeonMastery.tracks || {},
    }) : d.dungeonMastery,
    zoneBounties: saved.zoneBounties ? Object.assign({}, d.zoneBounties, saved.zoneBounties, {
      claimed: saved.zoneBounties.claimed || {},
    }) : d.zoneBounties,
    dragonTreasures: saved.dragonTreasures ? Object.assign({}, d.dragonTreasures, saved.dragonTreasures, {
      claimed: saved.dragonTreasures.claimed || {},
    }) : d.dragonTreasures,
    classOrders: saved.classOrders ? Object.assign({}, d.classOrders, saved.classOrders, {
      claimed: saved.classOrders.claimed || {},
    }) : d.classOrders,
    chronicles: saved.chronicles ? Object.assign({}, d.chronicles, saved.chronicles, {
      claimed: saved.chronicles.claimed || {},
    }) : d.chronicles,
    worldInvasions: saved.worldInvasions ? Object.assign({}, d.worldInvasions, saved.worldInvasions, {
      progress: saved.worldInvasions.progress || {},
      claimed: saved.worldInvasions.claimed || {},
    }) : d.worldInvasions,
    kareshExpedition: saved.kareshExpedition ? Object.assign({}, d.kareshExpedition, saved.kareshExpedition, {
      missions: Array.isArray(saved.kareshExpedition.missions) ? saved.kareshExpedition.missions : [],
      claimed: saved.kareshExpedition.claimed || {},
      history: Array.isArray(saved.kareshExpedition.history) ? saved.kareshExpedition.history : [],
    }) : d.kareshExpedition,
    timewalking: saved.timewalking ? Object.assign({}, d.timewalking, saved.timewalking, {
      missions: Array.isArray(saved.timewalking.missions) ? saved.timewalking.missions : [],
      claimed: saved.timewalking.claimed || {},
      history: Array.isArray(saved.timewalking.history) ? saved.timewalking.history : [],
      research: saved.timewalking.research || {},
      bought: saved.timewalking.bought || {},
      erasMastered: saved.timewalking.erasMastered || {},
      distortions: Array.isArray(saved.timewalking.distortions) ? saved.timewalking.distortions : [],
      selected: saved.timewalking.selected || {},
    }) : d.timewalking,
    stronghold: saved.stronghold ? Object.assign({}, d.stronghold, saved.stronghold, {
      buildings: saved.stronghold.buildings || {},
    }) : d.stronghold,
    astrology: saved.astrology ? Object.assign({}, d.astrology, saved.astrology, {
      unlocked: saved.astrology.unlocked || {},
    }) : d.astrology,
    ascendMilestones: saved.ascendMilestones || {},
    season: mo(d.season, saved.season),
    expedition: saved.expedition ? Object.assign({}, d.expedition, saved.expedition, {
      acc: Object.assign({}, d.expedition.acc, saved.expedition.acc || {}),
    }) : d.expedition,
    guild: saved.guild ? Object.assign({}, d.guild, saved.guild, {
      tech: saved.guild.tech || {},
      donatedKeys: Array.isArray(saved.guild.donatedKeys) ? saved.guild.donatedKeys : [],
    }) : d.guild,
    market: saved.market ? Object.assign({}, d.market, saved.market, {
      bought: Array.isArray(saved.market.bought) ? saved.market.bought : [],
      routes: saved.market.routes ? Object.assign({}, d.market.routes, saved.market.routes, {
        invested: saved.market.routes.invested || {},
      }) : d.market.routes,
    }) : d.market,
    quests: saved.quests ? Object.assign({}, d.quests, saved.quests, {
      daily: Array.isArray(saved.quests.daily) ? saved.quests.daily : [],
      weekly: Array.isArray(saved.quests.weekly) ? saved.quests.weekly : [],
    }) : d.quests,
    vault: saved.vault ? Object.assign({}, d.vault, saved.vault, {
      prog: Object.assign({}, d.vault.prog, saved.vault.prog || {}),
    }) : d.vault,
    roguelikeShrine: saved.roguelikeShrine && typeof saved.roguelikeShrine === 'object' ? saved.roguelikeShrine : {},
    mounts: saved.mounts || {},
    relics: Array.isArray(saved.relics) ? saved.relics : [],
    // 公共资源:数值类靠 Object.assign(d,saved) 已带过来;对象/数组做空值保护
    gems: saved.gems || {},
    companions: saved.companions || [],
    companionWishlist: Array.isArray(saved.companionWishlist) ? saved.companionWishlist : [],
    companionShards: saved.companionShards || {},
    compUniversalShards: Object.assign({}, d.compUniversalShards, saved.compUniversalShards || {}),
    companionMissions: saved.companionMissions ? Object.assign({}, d.companionMissions, saved.companionMissions, {
      active: Array.isArray(saved.companionMissions.active) ? saved.companionMissions.active : [],
      history: Array.isArray(saved.companionMissions.history) ? saved.companionMissions.history : [],
    }) : d.companionMissions,
    life: saved.life ? Object.assign({}, d.life, saved.life, {
      mats: saved.life.mats || {},
      tools: Object.assign({}, d.life.tools, saved.life.tools || {}),
      orders: Object.assign({}, d.life.orders, saved.life.orders || {}, { slots: saved.life.orders?.slots || [] }),
    }) : d.life,
  });
}

/* 把"公共资源"从各角色的旧值聚合进 account(仅首次:account._sharedMigrated 为 false 时)。
   老存档里这些字段是按角色存的,这里:数值相加、库存/碎片按 key 相加、随从取并集(星级取大)。 */
function ensureSharedFields(acc, chars) {
  if (acc && !acc._companionSharedMigrated) {
    const base = Object.assign({}, defaultAccount().compUniversalShards, acc.compUniversalShards || {});
    if (chars && chars.length) {
      for (const c of chars) {
        const m = c.compUniversalShards || {};
        for (const kk in m) base[kk] = (base[kk] || 0) + m[kk];
      }
    }
    acc.compUniversalShards = base;
    acc.companionMissions = acc.companionMissions && typeof acc.companionMissions === 'object'
      ? Object.assign({ active:[], totalCompleted:0, history:[] }, acc.companionMissions, {
          active: Array.isArray(acc.companionMissions.active) ? acc.companionMissions.active : [],
          history: Array.isArray(acc.companionMissions.history) ? acc.companionMissions.history : [],
        })
      : { active:[], totalCompleted:0, history:[] };
    const wish = new Set(Array.isArray(acc.companionWishlist) ? acc.companionWishlist : []);
    if (chars && chars.length) {
      for (const c of chars) for (const key of (Array.isArray(c.companionWishlist) ? c.companionWishlist : [])) wish.add(key);
    }
    acc.companionWishlist = Array.from(wish);
    acc._companionSharedMigrated = true;
  }
  if (acc._sharedMigrated) return;
  if (chars && chars.length) {
    const sum = k => chars.reduce((s, c) => s + (typeof c[k] === 'number' ? c[k] : 0), 0);
    acc.gold = sum('gold'); acc.gem = sum('gem'); acc.honor = sum('honor');
    acc.essence = sum('essence'); acc.tickets = sum('tickets');
    acc.compTickets = sum('compTickets'); acc.towerCoin = sum('towerCoin'); acc.roguelikeCoin = sum('roguelikeCoin');
    const sumObj = k => { const o = {}; for (const c of chars) { const m = c[k] || {}; for (const kk in m) o[kk] = (o[kk] || 0) + m[kk]; } return o; };
    acc.gems = sumObj('gems'); acc.companionShards = sumObj('companionShards'); acc.compUniversalShards = Object.assign({}, defaultAccount().compUniversalShards, sumObj('compUniversalShards'));
    const cm = {}; for (const c of chars) for (const comp of (c.companions || [])) { const e = cm[comp.key]; if (!e || (comp.stars || 1) > (e.stars || 1)) cm[comp.key] = { key: comp.key, stars: comp.stars || 1 }; }
    acc.companions = Object.values(cm);
  }
  acc._sharedMigrated = true;
}

/* 老存档装备校正:把已有装备实例的副属性(暴击/暴伤/吸血/全能/极速)钳到"惊喜上限",
   使旧装备也符合"副属性只能少量惊喜出现"的规则(改 finishItem 前生成的装备会带高暴击)。幂等。 */
function clampItemSecondary(it) {
  if (!it || !it.stats) return;
  const c1 = { common:0, uncommon:0, rare:1, epic:2, legend:4 }[it.rarity] || 0;   // 暴击/吸血/全能/极速
  const cD = { common:0, uncommon:0, rare:3, epic:6, legend:12 }[it.rarity] || 0;  // 暴伤
  for (const k of ['crit','leech','vers','haste']) { if (it.stats[k] !== undefined) { if (c1 <= 0) delete it.stats[k]; else it.stats[k] = Math.min(it.stats[k], c1); } }
  if (it.stats.critd !== undefined) { if (cD <= 0) delete it.stats.critd; else it.stats.critd = Math.min(it.stats.critd, cD); }
  if (it.stats.critdPct !== undefined) delete it.stats.critdPct;   // 装备 critdPct 本就是死属性,清掉
}
function migrateCharItems(c) {
  if (!c) return;
  (c.inventory || []).forEach(clampItemSecondary);
  if (c.equipped) for (const k in c.equipped) clampItemSecondary(c.equipped[k]);
}

/* 在角色 state 上装"转发到 account"的访问器(非枚举,故不会被 JSON.stringify 重复写进角色存档) */
function installSharedAccessors(st) {
  if (!st) return;
  for (const k of SHARED_FIELDS) {
    Object.defineProperty(st, k, {
      configurable: true, enumerable: false,
      get() { return account ? account[k] : undefined; },
      set(v) { if (account) account[k] = v; },
    });
  }
}

/* 从老版本(数据散落在每个角色上)迁移到 account */
function migrateAccountFromCharacters(chars) {
  const acc = defaultAccount();
  if (!chars || chars.length === 0) return acc;
  const sum = (k) => chars.reduce((s,c)=>s+(c[k]||0), 0);
  const max = (k) => chars.reduce((s,c)=>Math.max(s,c[k]||0), 0);
  const unionObj = (k, mode='or') => {
    const out = {};
    for (const c of chars) {
      const o = c[k] || {};
      for (const [kk, vv] of Object.entries(o)) {
        if (mode === 'sum')        out[kk] = (out[kk]||0) + vv;
        else if (mode === 'max')   out[kk] = Math.max(out[kk]||0, vv);
        else                       out[kk] = out[kk] || vv;  // or
      }
    }
    return out;
  };
  acc.killsTotal         = sum('killsTotal');
  acc.maxDmg             = max('maxDmg');
  acc.lifetimeGold       = sum('lifetimeGold');
  acc.gemsInserted       = sum('gemsInserted');
  acc.enchantsApplied    = sum('enchantsApplied');
  acc.rerollsDone        = sum('rerollsDone');
  acc.dungeonClearsTotal = sum('dungeonClearsTotal');
  acc.bossesKilled       = unionObj('bossesKilled', 'sum');
  acc.bestiary           = unionObj('bestiary', 'sum');
  acc.reputation         = unionObj('reputation', 'sum');
  acc.achievementsClaimed   = unionObj('achievementsClaimed', 'or');
  acc.achievementsCompleted = unionObj('achievementsCompleted', 'or');
  // 永久属性: 同 key 取较大值(都来自同一份成就池)
  acc.permanentStats     = unionObj('permanentStats', 'max');
  // 光辉值: 取最大,觉醒次数取所有角色和
  acc.ascendLvl   = max('ascendLvl');
  acc.ascendCount = sum('ascendCount');
  acc.ascendMilestones = unionObj('ascendMilestones', 'or');
  // 子区合并: 收集所有 subzoneCleared 的 true key
  for (const c of chars) {
    if (c.subzoneCleared) for (const k of Object.keys(c.subzoneCleared)) if (c.subzoneCleared[k]) acc.subzonesCleared[k] = true;
  }
  // 赛季: 取活跃的(进行中或最高积分)
  let bestSeason = null;
  for (const c of chars) {
    if (c.season && c.season.points >= 0) {
      if (!bestSeason || (c.season.points||0) > (bestSeason.points||0)) bestSeason = c.season;
    }
  }
  if (bestSeason) acc.season = mergeAccount({season: bestSeason}).season;
  // 称号:取首个非空
  for (const c of chars) if (c.title) { acc.title = c.title; acc.unlockedTitles = [c.title]; break; }
  // 迁移后清掉每个角色上已搬到 account 的字段,避免重复计算
  for (const c of chars) {
    c.permanentStats = {};
    c.achievementsClaimed = {};
    c.achievementsCompleted = {};
    c.bestiary = {};
    c.reputation = {};
    c.bossesKilled = {};
    c.maxDmg = 0;
    c.lifetimeGold = 0;
    c.gemsInserted = 0;
    c.enchantsApplied = 0;
    c.rerollsDone = 0;
    c.dungeonClearsTotal = 0;
    c.ascendLvl = 0;
    c.ascendCount = 0;
    c.ascendMilestones = {};
    c.title = '';
    // season 也搬走,但保留 daily 和 worldBoss 在角色上
    if (c.season) delete c.season;
  }
  return acc;
}

function mergeState(saved) {
  const d = defaultState();
  // 合并嵌套对象的辅助:浅合并 default 和 saved,保证新增子字段不会丢
  const mo = (def, sav) => Object.assign({}, def, sav || {});
  return Object.assign(d, saved, {
    hero: Object.assign(d.hero, saved.hero || {}),
    attrs: Object.assign(d.attrs, saved.attrs || {}),
    talents: saved.talents || {},
    invCap: Math.max(60, saved.invCap || 0),   // 老存档无此字段→提升到60(基础格子加大)
    loadouts: Array.isArray(saved.loadouts) ? saved.loadouts : [],
    unlockedSkills: saved.unlockedSkills || {},
    autoSkillConfig: Object.assign({}, d.autoSkillConfig, saved.autoSkillConfig || {}),
    passivesSeen: saved.passivesSeen || {},
    dungeonAnnounceLvl: typeof saved.dungeonAnnounceLvl === 'number' ? saved.dungeonAnnounceLvl : 0,
    paragon: saved.paragon ? Object.assign({ xp:0, lvl:0, points:0, board:{}, ms:{} }, saved.paragon, {
      board: saved.paragon.board || {}, ms: saved.paragon.ms || {},
    }) : { xp:0, lvl:0, points:0, board:{}, ms:{} },
    freeRespecUsed: !!saved.freeRespecUsed,
    buffs: saved.buffs || {},
    talentAuras: saved.talentAuras || {},
    talentState: saved.talentState ? Object.assign({}, d.talentState, saved.talentState, {
      cds: saved.talentState.cds || {},
      flags: saved.talentState.flags || {},
      shield: typeof saved.talentState.shield === 'number' ? saved.talentState.shield : 0,
    }) : d.talentState,
    heroDebuffs: saved.heroDebuffs || {},
    dungeonCd: saved.dungeonCd || {},
    dungeonFirstClear: saved.dungeonFirstClear || {},
    dungeonBounty: mo(d.dungeonBounty, saved.dungeonBounty),
    dungeonContractLevel: Math.max(0, Math.min(3, Math.floor(saved.dungeonContractLevel || 0))),
    bossCd: saved.bossCd || {},
    bossCd: saved.bossCd || {},
    subzoneKills: saved.subzoneKills || {},
    subzoneCleared: saved.subzoneCleared || {},
    worldFieldOps: saved.worldFieldOps ? Object.assign({ active:{}, completed:{} }, saved.worldFieldOps, {
      active: saved.worldFieldOps.active || {},
      completed: saved.worldFieldOps.completed || {},
    }) : { active:{}, completed:{} },
    worldRenown: saved.worldRenown ? Object.assign({ maps:{} }, saved.worldRenown, {
      maps: saved.worldRenown.maps || {},
    }) : { maps:{} },
    travel: null,
    worldSearch: null,
    worldCombatPause: null,
    currentMonsters: saved.currentMon ? [saved.currentMon] : (saved.currentMonsters || []),
    // 装备深度
    gems: saved.gems || {},
    essence: typeof saved.essence === 'number' ? saved.essence : 0,
    // 成就/图鉴/声望:嵌套对象用浅合并,保证子字段缺失时也安全
    bestiary: saved.bestiary || {},
    reputation: saved.reputation || {},
    bossesKilled: saved.bossesKilled || {},
    achievementsClaimed: saved.achievementsClaimed || {},
    achievementsCompleted: saved.achievementsCompleted || {},
    permanentStats: saved.permanentStats || {},
    // 世界Boss/日常/赛季:对每个嵌套字段做浅合并,确保新版本加字段时不丢
    worldBoss: mo(d.worldBoss, saved.worldBoss),
    daily:     mo(d.daily,     saved.daily),
    season:    mo(d.season,    saved.season),
    // 觉醒
    ascendMilestones: saved.ascendMilestones || {},
    // 大秘境
    mythicSelectLevel: typeof saved.mythicSelectLevel === 'number' ? saved.mythicSelectLevel : (saved.mythicLevel || 1),
    mythicTiersClaimed: saved.mythicTiersClaimed || {},
    mythicPendingUnique: saved.mythicPendingUnique || {},
    // 无尽塔
    tower: mo(d.tower, saved.tower),
    towerState: null,
    towerCoin: typeof saved.towerCoin === 'number' ? saved.towerCoin : 0,
    towerStartFloor: typeof saved.towerStartFloor === 'number' ? saved.towerStartFloor : 1,
    // 幻象挑战
    roguelikeState: null,
    roguelike: mo(d.roguelike, saved.roguelike),
    roguelikeCoin: typeof saved.roguelikeCoin === 'number' ? saved.roguelikeCoin : 0,
    // 生活技能
    life: saved.life ? Object.assign({}, d.life, saved.life, { mats: saved.life.mats || {} }) : d.life,
    lifeAction: saved.lifeAction || null,
    lifeBuffs: saved.lifeBuffs || {},
    // 神器(旧版迁移源)
    artifact: saved.artifact ? Object.assign({}, d.artifact, saved.artifact, { traits: saved.artifact.traits||{}, milestonesSeen: saved.artifact.milestonesSeen||{} }) : d.artifact,
    // 神器(新版 per-spec)
    artifacts: (saved.artifacts && typeof saved.artifacts === 'object') ? saved.artifacts : {},
    // 坐骑
    activeMount: saved.activeMount || null,
    // 竞技场:浅合并并保护嵌套对象,opp 不持久化跨版本(重新生成)
    arena: saved.arena ? Object.assign({}, d.arena, saved.arena, { vendor: saved.arena.vendor || {} }) : d.arena,
    // 战斗倍速
    battleSpeed: [1, 2, 4, 8].includes(saved.battleSpeed) ? saved.battleSpeed : 1,
  });
}

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      characters = [];
      activeCharIndex = 0;
      account = defaultAccount();
      ensureSharedFields(account, []);
      const s = defaultState(); installSharedAccessors(s); return s;
    }
    const data = JSON.parse(raw);
    // 迁移旧版单角色存档
    if (!data.characters) {
      const migrated = mergeState(data);
      migrated.name = migrated.cls ? (CLASSES[migrated.cls]?.name || '冒险者') : '';
      characters = [migrated];
      activeCharIndex = 0;
      account = migrateAccountFromCharacters(characters);
      ensureSharedFields(account, characters);
      characters.forEach(installSharedAccessors);
      characters.forEach(migrateCharItems);   // 旧装备副属性钳到惊喜上限
      return migrated;
    }
    characters = data.characters.map(c => mergeState(c));
    activeCharIndex = data.activeIndex || 0;
    // account 加载: 优先取已存在的 account 字段;旧存档(无 account)从角色聚合
    if (data.account) account = mergeAccount(data.account);
    else account = migrateAccountFromCharacters(characters);
    ensureSharedFields(account, characters);   // 公共资源首次聚合(幂等)
    characters.forEach(installSharedAccessors);
    if (characters.length === 0) {
      activeCharIndex = 0;
      const s = defaultState(); installSharedAccessors(s); return s;
    }
    if (activeCharIndex >= characters.length) activeCharIndex = 0;
    return characters[activeCharIndex];
  } catch (e) {
    console.error('loadState failed:', e);
    characters = [];
    activeCharIndex = 0;
    account = defaultAccount();
    ensureSharedFields(account, []);
    const s = defaultState(); installSharedAccessors(s); return s;
  }
}

let suppressSave = false;   // 重新开始时置 true,阻止 beforeunload/自动存档把已清的存档写回
function saveState() {
  if (suppressSave) return;
  if (!state) return;
  state.lastTick = Date.now();
  if (state.cls && activeCharIndex < characters.length) {
    characters[activeCharIndex] = state;
  }
  if (!account) account = defaultAccount();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ characters, activeIndex: activeCharIndex, account }));
  } catch (e) { console.error('saveState failed:', e); }
}

function getCharacterList() {
  return characters.map((c, i) => ({
    index: i,
    name: c.name || '未命名',
    faction: c.faction,
    race: c.race,
    cls: c.cls,
    lvl: c.hero?.lvl || 1,
    gold: c.gold || 0,
    title: (account && account.title) || '',
    active: i === activeCharIndex,
  }));
}

function switchCharacter(index) {
  if (index === activeCharIndex) return false;
  if (index < 0 || index >= characters.length) return false;
  saveState();
  state = characters[index];
  activeCharIndex = index;
  state.travel = null;
  state.currentMonsters = [];
  // 任何中间态切换时都回到 world,避免 dungeonState/_currentWBoss 不一致
  if (state.mode !== 'world') state.mode = 'world';
  state.dungeonState = null;
  state.mythicState = null;
  state.towerState = null;
  state._currentWBoss = null;
  // 关掉可能残留的模态框 + 装备详情上下文
  document.querySelectorAll('.modal-bg.show').forEach(m => m.classList.remove('show'));
  if (typeof currentDetailItemId !== 'undefined') currentDetailItemId = null;
  if (typeof resetCombatState === 'function') resetCombatState();
  return true;
}

function createNewCharacter(name, faction, race, cls) {
  const c = defaultState();
  installSharedAccessors(c);   // 公共资源(金币/钻石/随从等)接入账号共享池
  c.name = name;
  c.faction = faction;
  c.race = race;
  c.cls = cls;
  const cl = CLASSES[cls];
  c.hp = cl.baseStats.hpMax;
  c.resourceMax = cl.baseStats.mpMax;
  c.resource = cl.resKey === 'rage' ? 0 : cl.baseStats.mpMax;
  const raceData = RACES[race];
  if (raceData?.bonus) {
    for (const [k, v] of Object.entries(raceData.bonus)) {
      c.attrs[k] = (c.attrs[k] || 0) + v;
    }
  }
  // 根据阵营设置初始地图
  c.currentMap = faction === 'horde' ? 'durotar' : 'elwynn';
  c.currentSubzone = 0;
  characters.push(c);
  activeCharIndex = characters.length - 1;
  state = c;
  saveState();
  return c;
}

function deleteCharacter(index) {
  if (characters.length <= 1) return false;
  if (index < 0 || index >= characters.length) return false;
  characters.splice(index, 1);
  if (activeCharIndex >= characters.length) activeCharIndex = characters.length - 1;
  if (index <= activeCharIndex) activeCharIndex = Math.max(0, activeCharIndex - 1);
  state = characters[activeCharIndex];
  state.travel = null;
  state.currentMonsters = [];
  if (state.mode === 'travel') state.mode = 'world';
  saveState();
  return true;
}

function getCls() { return CLASSES[state.cls]; }
function getMap(key) { return MAPS.find(m => m.key === (key || state.currentMap)); }

/* ---------- dirty 标记系统 ----------
   解决"按钮点不下去"的根因: 不再每 200ms 全量 innerHTML 重建,
   而是只在状态真正变化时重建对应面板 */
const dirty = new Set(['all']);

function markDirty(...sections) {
  for (const s of sections) dirty.add(s);
}
function isDirty(s) { return dirty.has('all') || dirty.has(s); }
function clearDirty(s) { dirty.delete(s); }
function clearAllDirty() { dirty.clear(); }

/* ---------- 小工具 ---------- */
const $ = id => document.getElementById(id);
const rng = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const choice = arr => arr[Math.floor(Math.random() * arr.length)];

function fmt(n) {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1e9) return (n/1e9).toFixed(2)+'B';
  if (n >= 1e6) return (n/1e6).toFixed(2)+'M';
  if (n >= 1e4) return (n/1e3).toFixed(1)+'K';
  return Math.floor(n).toString();
}

function fmtCd(seconds) {
  if (seconds <= 0) return '可挑战';
  const h = Math.floor(seconds/3600), m = Math.floor((seconds%3600)/60), s = seconds%60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function setBar(el, pct, text) {
  pct = Number.isFinite(pct) ? pct : 0;
  const pctText = Math.max(0, Math.min(100, pct)) + '%';
  if (el.dataset.w !== pctText) {
    el.dataset.w = pctText;
    el.style.width = pctText;
  }
  if (text && el.nextElementSibling && el.nextElementSibling.textContent !== text) {
    el.nextElementSibling.textContent = text;
  }
}

let _lastLogTs = 0;
let _lastFloatTs = 0;
let _activeFloatCount = 0;
let _activeImpactSlamCount = 0;
let _activeStatusSigilCount = 0;
let _impactSeq = 0;
let _lastImpactHaloTs = 0;
let _lastImpactSlamTs = 0;
let _lastStatusSigilTs = 0;

function isMobilePerfMode() {
  return typeof window !== 'undefined' && window.innerWidth <= 920;
}

function inHeavyCombatMode() {
  const mode = state && state.mode;
  return mode === 'boss' || mode === 'dungeon' || mode === 'mythic' || mode === 'worldboss' || mode === 'tower' || mode === 'roguelike';
}

function isImportantLog(text) {
  return /击败|掉落|通关|失败|升级|升到|世界BOSS|世界Boss|史诗团本|获得随从|通用券|进入 \[|挑战 |探索完成|重新投入战斗|倒下|已完成|周宝箱|专属传说/.test(text || '');
}

function inferFloatVariant(text, opts) {
  if (opts?.variant) return opts.variant;
  const s = String(text || '');
  if (/神器|✦/.test(s)) return 'artifact';
  if (/闪避|格挡|免疫/.test(s)) return 'avoid';
  if (/眩晕|沉默|缴械|恐惧|冻结|残废|破甲|易伤|审判|破绽|净化|击晕|减速/.test(s)) return 'status';
  if (/护盾|🛡️|🔮盾|盾/.test(s)) return /-/.test(s) ? 'shield-break' : 'shield';
  if (/^\+/.test(s) || /💚|\+.*生命|治疗|回血|回响治疗/.test(s)) return 'heal';
  if (/必暴|暴击|斩杀|重创/.test(s)) return 'crit';
  if (/☠️|流血|中毒|灼烧|dot|DOT/i.test(s)) return 'dot';
  if (/💀|释放了|高危|危险/.test(s)) return 'boss';
  if (/✨|专属技|随从/.test(s)) return 'comp';
  return 'hit';
}

function pulseCombatEl(targetEl, kind, duration) {
  if (!targetEl) return;
  const cls = `impact-${kind || 'hit'}`;
  const token = `impact-${++_impactSeq}`;
  targetEl.dataset.lastImpact = token;
  targetEl.classList.remove('impact-hit','impact-crit','impact-heal','impact-shield','impact-danger','impact-bosscast','impact-comp','impact-artifact');
  void targetEl.offsetWidth;
  targetEl.classList.add(cls);
  showCombatImpactHalo(targetEl, kind, duration);
  setTimeout(() => {
    if (targetEl.dataset.lastImpact === token) targetEl.classList.remove(cls);
  }, duration || 280);
}

function showCombatImpactHalo(targetEl, kind, duration) {
  const stage = $('stage');
  const layer = $('float-layer') || stage;
  if (!stage || !layer || !targetEl) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  const safeKind = String(kind || 'hit').replace(/[^a-z0-9_-]/gi, '') || 'hit';
  const important = /crit|danger|boss|heal|shield|artifact/i.test(safeKind);
  const now = Date.now();
  if (now - _lastImpactHaloTs < (important ? 45 : 95)) return;
  _lastImpactHaloTs = now;
  const rect = targetEl.getBoundingClientRect();
  const sRect = stage.getBoundingClientRect();
  if (!rect.width || !rect.height || !sRect.width || !sRect.height) return;
  const size = Math.round(Math.max(30, Math.min(92, Math.max(rect.width, rect.height) + (important ? 22 : 14))));
  const el = document.createElement('div');
  el.className = `impact-halo impact-halo-${safeKind}`;
  el.style.left = (rect.left - sRect.left + rect.width / 2 - size / 2) + 'px';
  el.style.top = (rect.top - sRect.top + rect.height / 2 - size / 2) + 'px';
  el.style.width = size + 'px';
  el.style.height = size + 'px';
  el.style.setProperty('--impact-halo-duration', Math.max(220, duration || 300) + 'ms');
  layer.appendChild(el);
  setTimeout(() => el.remove(), Math.max(260, duration || 300) + 120);
}

function floatVariantNeedsSlam(variant, text, opts) {
  if (opts?.slam === false) return false;
  if (opts?.slam) return true;
  const s = String(text || '');
  if (variant === 'hit') return /-\d/.test(s);
  if (variant === 'crit' || variant === 'boss' || variant === 'comp' || variant === 'dot') return /-\d|爆|反噬|追击|蔓延/.test(s) || !!opts?.important;
  if (variant === 'heal') return /\+\d|治疗|回血/.test(s);
  if (variant === 'shield' || variant === 'shield-break') return /\d|盾|护/.test(s);
  if (variant === 'artifact') return /-\d|爆|反噬|追击/.test(s) || !!opts?.important;
  return false;
}

function statusSigilKind(text, variant) {
  const s = String(text || '');
  if (/净化|驱散|解除/.test(s)) return 'cleanse';
  if (/闪避|格挡|免疫/.test(s) || variant === 'avoid') return 'avoid';
  if (/眩晕|击晕|晕眩|💫/.test(s)) return 'stun';
  if (/沉默|🔇/.test(s)) return 'silence';
  if (/冻结|冰冻|🧊/.test(s)) return 'freeze';
  if (/恐惧|👻/.test(s)) return 'fear';
  if (/缴械|残废|减速|破甲|易伤|审判|破绽|虚弱|标记/.test(s)) return 'vulnerable';
  if (variant === 'status' || variant === 'control') return 'control';
  return '';
}

function showCombatStatusSigil(targetEl, text, variant, opts) {
  if (opts?.statusFx === false) return;
  const kind = statusSigilKind(text, variant);
  if (!kind || !targetEl) return;
  const stage = $('stage');
  const layer = $('float-layer') || stage;
  if (!stage || !layer) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  const mobile = isMobilePerfMode();
  const important = /stun|silence|freeze|fear|cleanse/i.test(kind) || !!opts?.important;
  const now = Date.now();
  if (!opts?.force && now - _lastStatusSigilTs < (important ? 70 : 150)) return;
  if (mobile && _activeStatusSigilCount >= (important ? 6 : 3)) return;
  _lastStatusSigilTs = now;
  const rect = targetEl.getBoundingClientRect();
  const sRect = stage.getBoundingClientRect();
  if (!rect.width || !rect.height || !sRect.width || !sRect.height) return;
  const size = Math.round(Math.max(30, Math.min(84, Math.max(rect.width, rect.height) + (important ? 30 : 18))));
  const el = document.createElement('div');
  el.className = `status-sigil status-sigil-${kind}`;
  el.style.left = (rect.left - sRect.left + rect.width / 2 - size / 2) + 'px';
  el.style.top = (rect.top - sRect.top + rect.height / 2 - size / 2) + 'px';
  el.style.width = size + 'px';
  el.style.height = size + 'px';
  const mark = document.createElement('span');
  mark.textContent = kind === 'cleanse' ? '净' : kind === 'avoid' ? '闪' : kind === 'stun' ? '晕' : kind === 'silence' ? '默' : kind === 'freeze' ? '冰' : kind === 'fear' ? '惧' : '弱';
  el.appendChild(mark);
  layer.appendChild(el);
  _activeStatusSigilCount++;
  setTimeout(() => {
    el.remove();
    _activeStatusSigilCount = Math.max(0, _activeStatusSigilCount - 1);
  }, important ? 780 : 620);
}

function showCombatHitSlam(targetEl, kind, opts) {
  const stage = $('stage');
  const layer = $('float-layer') || stage;
  if (!stage || !layer || !targetEl) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  const safeKind = String(kind || 'hit').replace(/[^a-z0-9_-]/gi, '') || 'hit';
  const important = !!opts?.important || /crit|danger|boss|heal|shield|artifact|fire|frost|arcane|nature|shadow|holy/i.test(safeKind);
  const mobile = isMobilePerfMode();
  const now = Date.now();
  if (!opts?.force && now - _lastImpactSlamTs < (important ? 32 : 75)) return;
  if (mobile && _activeImpactSlamCount >= (important ? 10 : 5)) return;
  _lastImpactSlamTs = now;
  const slamSeq = ++_impactSeq;
  const rect = targetEl.getBoundingClientRect();
  const sRect = stage.getBoundingClientRect();
  if (!rect.width || !rect.height || !sRect.width || !sRect.height) return;
  const base = Math.max(rect.width, rect.height);
  const width = Math.round(Math.max(34, Math.min(118, base * (important ? 1.55 : 1.25) * (opts?.scale || 1))));
  const height = Math.round(Math.max(10, Math.min(28, base * (important ? .32 : .24))));
  const el = document.createElement('div');
  const school = opts?.school ? String(opts.school).replace(/[^a-z0-9_-]/gi, '') : '';
  el.className = `impact-slam impact-slam-${safeKind}${school ? ` school-${school}` : ''}`;
  el.style.left = (rect.left - sRect.left + rect.width / 2 - width / 2) + 'px';
  el.style.top = (rect.top - sRect.top + rect.height / 2 - height / 2) + 'px';
  el.style.width = width + 'px';
  el.style.height = height + 'px';
  el.style.setProperty('--impact-slam-duration', Math.max(240, opts?.duration || (important ? 460 : 360)) + 'ms');
  el.style.setProperty('--impact-slam-angle', ((opts?.angle ?? ((slamSeq % 2 ? -8 : 8) + (slamSeq % 3) * 3))) + 'deg');
  layer.appendChild(el);
  _activeImpactSlamCount++;
  setTimeout(() => {
    el.remove();
    _activeImpactSlamCount = Math.max(0, _activeImpactSlamCount - 1);
  }, Math.max(280, opts?.duration || (important ? 460 : 360)) + 80);
}

function log(text, cls) {
  const logEl = $('log');
  if (!logEl) return;
  const now = Date.now();
  if (isMobilePerfMode() && inHeavyCombatMode() && !isImportantLog(text)) {
    const gap = 220;
    if (now - _lastLogTs < gap) return;
  }
  _lastLogTs = now;
  const el = document.createElement('div');
  el.className = 'l-' + (cls || 'info');
  const t = new Date(now);
  const ts = String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0')+':'+String(t.getSeconds()).padStart(2,'0');
  el.textContent = ts + ' ' + text;
  logEl.appendChild(el);
  const maxLogs = isMobilePerfMode() ? 70 : 120;
  while (logEl.children.length > maxLogs) logEl.firstChild.remove();
  if (!isMobilePerfMode() || !inHeavyCombatMode() || logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 80) {
    logEl.scrollTop = logEl.scrollHeight;
  }
}

function pickRarity(maxRarity) {
  const maxIdx = RARITY.findIndex(r => r.key === (maxRarity || 'legend'));
  let total = 0;
  for (let i = 0; i <= maxIdx; i++) total += RARITY[i].weight;
  let r = Math.random() * total;
  for (let i = 0; i <= maxIdx; i++) { r -= RARITY[i].weight; if (r <= 0) return RARITY[i]; }
  return RARITY[0];
}

function showFloat(targetEl, text, color, opts) {
  const stage = $('stage');
  const floatLayer = $('float-layer') || stage;
  if (!stage || !floatLayer || !targetEl) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  const mobile = isMobilePerfMode();
  const now = Date.now();
  const variant = inferFloatVariant(text, opts);
  const important = !!opts?.important
    || /晕|眩|沉默|缴械|恐惧|冻结|净化|归来|倒下|闪避|必暴|护盾|盾|召来|召唤|升级|掉落/.test(text || '')
    || ['crit','boss','heal','shield','shield-break','status','dot','artifact'].includes(variant);
  if (mobile) {
    const gap = important ? 45 : 120;
    if (!important && now - _lastFloatTs < gap) return;
    if (!important && _activeFloatCount >= 8) return;
    if (important && _activeFloatCount >= 16) return;
  }
  _lastFloatTs = now;
  const rect = targetEl.getBoundingClientRect();
  const sRect = stage.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = `float-dmg ${variant}`;
  el.style.color = color;
  el.textContent = text;
  const laneRight = opts?.lane === 'ally-right';
  const xOffset = (opts?.x || 0) + (laneRight ? 60 : 0);
  const yOffset = opts?.y || 0;
  el.style.left = (rect.left - sRect.left + rect.width/2 - 10 + xOffset) + 'px';
  el.style.top = (rect.top - sRect.top + yOffset) + 'px';
  if (opts?.scale) el.style.setProperty('--float-scale', String(opts.scale));
  if (opts?.dx != null) el.style.setProperty('--float-dx', opts.dx + 'px');
  else if (laneRight) el.style.setProperty('--float-dx', '28px');
  if (opts?.dy) el.style.setProperty('--float-dy', opts.dy + 'px');
  if (opts?.duration) el.style.setProperty('--float-duration', opts.duration + 'ms');
  floatLayer.appendChild(el);
  if (floatVariantNeedsSlam(variant, text, opts)) {
    showCombatHitSlam(targetEl, variant === 'boss' ? 'danger' : variant, {
      important,
      duration: mobile ? 360 : 420,
      scale: opts?.scale || 1
    });
  }
  if (variant === 'status' || variant === 'control' || variant === 'avoid') {
    showCombatStatusSigil(targetEl, text, variant, { important, scale: opts?.scale || 1 });
  }
  _activeFloatCount++;
  setTimeout(() => {
    el.remove();
    _activeFloatCount = Math.max(0, _activeFloatCount - 1);
  }, opts?.duration || (mobile ? 650 : 1000));
}

function closeModal(id) { $(id).classList.remove('show'); }

setInterval(saveState, 5000);
