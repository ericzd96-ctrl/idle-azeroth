/* timewalking.js - Weekly Timewalking campaigns for classic expansions */
const TIMEWALKING_BANNER = 'assets/wow/art/timewalking-banner.png';
const TIMEWALKING_ATLAS_BANNER = 'assets/wow/art/timewalking-atlas-banner.jpg';
const TIMEWALKING_CACHE_COST = 18;
const TIMEWALKING_MISSION_COUNT = 5;
const TIMEWALKING_DISTORTION_OFFER_COUNT = 4;
const TIMEWALKING_DISTORTION_ACTIVE_LIMIT = 3;
const TIMEWALKING_RESEARCH = [
  { key:'bronze_attunement', icon:'⏳', name:'青铜调谐', baseCost:8, max:5, gain:{ atkPct:1, hpPct:1 }, desc:'稳定旧时代战斗节奏,每级永久提高攻击与生命。' },
  { key:'paradox_weave', icon:'🧵', name:'悖论织线', baseCost:10, max:5, gain:{ defPct:1, mastery:1 }, desc:'修补破碎时间线的纤维,每级永久提高防御与精通。' },
  { key:'chronicle_gilding', icon:'📚', name:'编年史镀金', baseCost:12, max:4, gain:{ goldMult:2, dropMult:2 }, desc:'把旧时代战利品重新登记入册,每级永久提高金币与掉率。' },
];
const TIMEWALKING_COLLECTIONS = [
  { key:'bronze_time_drake', type:'mount', cost:20, icon:'🐉', name:'青铜时序幼龙', rewardKey:'bronze_time_drake', desc:'诺兹多姆麾下用于接送时光行者的青铜飞龙。' },
  { key:'raven_lord_redux', type:'mount', cost:34, icon:'🦅', name:'时序乌鸦之王', rewardKey:'raven_lord_redux', desc:'从不同时间线拼接回来的奥金顿黑翼坐骑。' },
  { key:'infinite_timereaver', type:'mount', cost:48, icon:'🕰️', name:'无尽时空掠夺者', rewardKey:'infinite_timereaver', desc:'永恒龙军团丢失在裂隙中的时空坐骑。' },
  { key:'timewalker_title', type:'title', cost:18, icon:'📜', name:'称号: 时序旅者', rewardKey:'时序旅者', desc:'证明你能在多个时代之间来回作战。' },
  { key:'chronicle_keeper_title', type:'title', cost:36, icon:'👑', name:'称号: 时光修补师', rewardKey:'时光修补师', desc:'只有真正修补过旧年代裂口的旅者才配拥有。' },
];
const TIMEWALKING_DISTORTIONS = [
  { key:'volcanic', icon:'🌋', name:'熔火断层', desc:'脚下会喷发火山裂隙,旧时代战场被重新撕开。', mod:{ volcanic:true, trashHp:0.08, bossHp:0.10, bossDmg:0.05, worldBossHp:0.10, worldBossAtk:0.05 }, reward:{ goldPct:0.08, essencePct:0.08, badgesFlat:1 } },
  { key:'arcane', icon:'🔮', name:'奥能回旋', desc:'首领会周期性获得奥术护盾,远古法阵反复重启。', mod:{ arcane:true, bossHp:0.08, bossDef:0.12, worldBossHp:0.06, worldBossDef:0.10, worldBossDr:0.02 }, reward:{ honorPct:0.10, gemPct:0.08, lootPower:1 } },
  { key:'afflicted', icon:'😈', name:'苦楚回响', desc:'时序苦痛会持续侵蚀冒险者,拖长旧本作战节奏。', mod:{ afflicted:true, trashDmg:0.10, bossDmg:0.06, worldBossAtk:0.08 }, reward:{ essencePct:0.10, badgesFlat:1 } },
  { key:'sanguine', icon:'🩸', name:'鲜血洪流', desc:'倒下的敌人会将周围同伴重新浸入鲜血回响。', mod:{ sanguine:true, trashHp:0.10, trashDef:0.10, bossHp:0.05, worldBossHp:0.06, worldBossDef:0.06 }, reward:{ goldPct:0.10, dropPct:0.08 } },
  { key:'tyranny', icon:'👑', name:'永恒暴君', desc:'旧时代首领会在鏖战后狂暴,强迫你用更高节奏处理战斗。', mod:{ bossEnrage:true, bossHp:0.16, bossDmg:0.10, bossDef:0.08, worldBossHp:0.14, worldBossAtk:0.08, worldBossDr:0.03 }, reward:{ badgesFlat:1, lootPower:1, legendaryChance:0.03 } },
  { key:'raging', icon:'💢', name:'暴怒纪元', desc:'残血敌人进入暴怒,让小怪与精英波次更危险。', mod:{ raging:true, trashHp:0.08, trashDmg:0.14, worldBossAtk:0.06 }, reward:{ honorPct:0.08, dropPct:0.06, badgesFlat:1 } },
];

const TIMEWALKING_ERAS = [
  {
    key:'classic',
    name:'经典旧世时光漫游',
    short:'经典旧世',
    icon:'🕰️',
    color:'#f59e0b',
    desc:'黑石山、厄运之槌与安其拉的旧日军令再次回响。',
    dungeons:['diremaul', 'lbrs', 'ubrs'],
    raids:['aq40'],
    worldBoss:'kazzak_doom',
    lootFallback:'aq40',
  },
  {
    key:'outland',
    name:'燃烧的远征时光漫游',
    short:'外域',
    icon:'💠',
    color:'#a855f7',
    desc:'外域裂隙重新张开,沙塔斯与黑暗神殿的旧账被翻出。',
    dungeons:['shattered', 'arcatraz'],
    raids:['karazhan', 'bt', 'sunwell'],
    worldBoss:'magtheridon_wrath',
    lootFallback:'karazhan',
  },
  {
    key:'northrend',
    name:'巫妖王之怒时光漫游',
    short:'诺森德',
    icon:'❄️',
    color:'#38bdf8',
    desc:'寒锋年代的旧战场再次开放,冰冠的压力也被一并带回现世。',
    dungeons:['culling', 'pit', 'oculus', 'hor'],
    raids:['naxx', 'ulduar', 'ruby', 'icc'],
    worldBoss:'sindragosa_shadow',
    lootFallback:'icc',
  },
  {
    key:'cataclysm',
    name:'大地的裂变时光漫游',
    short:'大灾变',
    icon:'🌋',
    color:'#fb7185',
    desc:'暮光之锤与元素失控重返现世,旋云之巅到巨龙之魂再次被青铜龙军团点亮。',
    dungeons:['vortex'],
    raids:['firelands', 'dragonsoul'],
    worldBoss:'deathwing',
    lootFallback:'dragonsoul',
  },
  {
    key:'legion',
    name:'军团再临时光漫游',
    short:'军团再临',
    icon:'🟢',
    color:'#84cc16',
    desc:'破碎群岛的旧伤被重新翻开,英灵殿、苏拉玛与安托鲁斯的战线同步苏醒。',
    dungeons:['darkheart', 'valor', 'court'],
    raids:['nighthold', 'tomb', 'antorus'],
    worldBoss:'argus_unmaker',
    lootFallback:'antorus',
  },
  {
    key:'dragonflight',
    name:'巨龙时代时光漫游',
    short:'巨龙时代',
    icon:'🐉',
    color:'#22d3ee',
    desc:'龙岛的原始风暴也被纳入时序航线,地下城、团本与风暴化身会一并获得旧日标定。',
    dungeons:['neltharus', 'azurevault', 'nokhud', 'hallsinfusion', 'brackenhide'],
    raids:['aberrus', 'amirdrassil'],
    worldBoss:'raszageth_storm',
    lootFallback:'amirdrassil',
  },
];

function timewalkingWeekId(now) {
  return Math.floor((now || Date.now()) / (86400000 * 7));
}

function timewalkingHash(seed) {
  let s = (seed >>> 0) || 1;
  s ^= s << 13;
  s ^= s >>> 17;
  s ^= s << 5;
  return (s >>> 0) / 4294967296;
}

function activeTimewalkingEra(weekId) {
  const week = typeof weekId === 'number' ? weekId : timewalkingWeekId();
  return TIMEWALKING_ERAS[Math.abs(week) % TIMEWALKING_ERAS.length] || TIMEWALKING_ERAS[0];
}

function timewalkingPick(list, seed, salt) {
  if (!Array.isArray(list) || !list.length) return null;
  const idx = Math.floor(timewalkingHash(seed * 1103515245 + salt * 12345) * list.length);
  return list[Math.max(0, Math.min(list.length - 1, idx))];
}

function timewalkingDungeonName(key) {
  const dg = (typeof DUNGEONS !== 'undefined' ? DUNGEONS : []).find(x => x.key === key);
  return dg?.name || key;
}

function timewalkingWorldBossName(key) {
  const wb = (typeof WORLD_BOSSES !== 'undefined' ? WORLD_BOSSES : []).find(x => x.key === key);
  return wb?.name || key;
}

function timewalkingDungeonFinalBoss(key) {
  const dg = (typeof DUNGEONS !== 'undefined' ? DUNGEONS : []).find(x => x.key === key);
  const bosses = dg?.bosses || [];
  return bosses.length ? bosses[bosses.length - 1].name : null;
}

function timewalkingLootContextKey(targetKey, era) {
  const map = {
    kazzak_doom:'aq40',
    magtheridon_wrath:'karazhan',
    sindragosa_shadow:'icc',
  };
  return map[targetKey] || targetKey || era?.lootFallback || 'aq40';
}

function timewalkingBrokerActive() {
  return !!account?.market?.routes?.invested?.timewalking_broker;
}

function createTimewalkingMissions(weekId) {
  const week = typeof weekId === 'number' ? weekId : timewalkingWeekId();
  const era = activeTimewalkingEra(week);
  const featuredDungeon = timewalkingPick(era.dungeons, week + 37, 1) || era.dungeons[0];
  const featuredRaid = timewalkingPick(era.raids, week + 73, 2) || era.raids[0];
  return {
    eraKey: era.key,
    missions: [
      {
        id:'route_any',
        type:'dungeonAny',
        icon:'🧭',
        name:'时光远征线',
        desc:`完成 ${era.short} 地下城 4 次,把旧时代的补给路线重新踩通。`,
        goal:4,
        keys:era.dungeons.slice(),
        reward:{ gold:180000, gem:24, honor:1200, essence:24, badges:4 },
      },
      {
        id:'route_featured',
        type:'dungeonKey',
        icon:'⏳',
        name:'焦点地下城',
        desc:`集中清理 ${timewalkingDungeonName(featuredDungeon)} 两次。`,
        goal:2,
        key:featuredDungeon,
        reward:{ gold:220000, gem:30, honor:1500, essence:30, badges:5 },
      },
      {
        id:'route_challenge',
        type:'challenge',
        icon:'⚔️',
        name:'时光挑战线',
        desc:'完成 3 次高难度旧时代挑战: 英雄/史诗5人本、团本与大秘境都计入。',
        goal:3,
        keys:era.dungeons.concat(era.raids),
        reward:{ gold:260000, gem:36, honor:1800, essence:36, badges:6 },
      },
      {
        id:'route_raid',
        type:'raidKey',
        icon:'🏰',
        name:'时光团本线',
        desc:`打穿 ${timewalkingDungeonName(featuredRaid)},把旧时代的团本压迫重新扛住。`,
        goal:1,
        key:featuredRaid,
        reward:{ gold:340000, gem:48, honor:2400, essence:50, badges:7 },
      },
      {
        id:'route_worldboss',
        type:'worldBoss',
        icon:'🐲',
        name:'时光世界Boss线',
        desc:`击败 ${timewalkingWorldBossName(era.worldBoss)},终结本周最危险的时序回响。`,
        goal:1,
        key:era.worldBoss,
        reward:{ gold:300000, gem:42, honor:2200, essence:42, badges:6 },
      },
    ],
  };
}

function createTimewalkingDistortions(weekId) {
  const week = typeof weekId === 'number' ? weekId : timewalkingWeekId();
  const pool = TIMEWALKING_DISTORTIONS.slice();
  const out = [];
  const max = Math.min(TIMEWALKING_DISTORTION_OFFER_COUNT, pool.length);
  for (let i = 0; i < max; i++) {
    const roll = timewalkingHash(week * 4099 + i * 131 + 23);
    const idx = Math.floor(roll * pool.length);
    out.push(pool.splice(Math.max(0, Math.min(pool.length - 1, idx)), 1)[0].key);
  }
  return out;
}

function ensureTimewalkingState() {
  if (typeof account === 'undefined' || !account) {
    const week = timewalkingWeekId();
    const setup = createTimewalkingMissions(week);
    return { weekId:week, eraKey:setup.eraKey, missions:setup.missions, claimed:{}, badges:0, totalBadges:0, totalClaims:0, cacheClaims:0, metaClaimed:false, metaClaims:0, history:[], research:{}, bought:{}, erasMastered:{}, maxThreat:0, distortions:createTimewalkingDistortions(week), selected:{}, distortionClears:0 };
  }
  if (!account.timewalking) account.timewalking = {};
  const tw = account.timewalking;
  if (typeof tw.weekId !== 'number') tw.weekId = timewalkingWeekId();
  if (typeof tw.eraKey !== 'string') tw.eraKey = activeTimewalkingEra(tw.weekId).key;
  if (!Array.isArray(tw.missions)) tw.missions = [];
  if (!tw.claimed || typeof tw.claimed !== 'object') tw.claimed = {};
  if (typeof tw.badges !== 'number') tw.badges = 0;
  if (typeof tw.totalBadges !== 'number') tw.totalBadges = 0;
  if (typeof tw.totalClaims !== 'number') tw.totalClaims = 0;
  if (typeof tw.cacheClaims !== 'number') tw.cacheClaims = 0;
  if (typeof tw.metaClaimed !== 'boolean') tw.metaClaimed = false;
  if (typeof tw.metaClaims !== 'number') tw.metaClaims = 0;
  if (!Array.isArray(tw.history)) tw.history = [];
  if (!tw.research || typeof tw.research !== 'object') tw.research = {};
  if (!tw.bought || typeof tw.bought !== 'object') tw.bought = {};
  if (!tw.erasMastered || typeof tw.erasMastered !== 'object') tw.erasMastered = {};
  if (typeof tw.maxThreat !== 'number') tw.maxThreat = 0;
  if (!Array.isArray(tw.distortions)) tw.distortions = [];
  if (!tw.selected || typeof tw.selected !== 'object') tw.selected = {};
  if (typeof tw.distortionClears !== 'number') tw.distortionClears = 0;
  const week = timewalkingWeekId();
  if (tw.weekId !== week || !tw.missions.length) {
    tw.history.unshift({
      weekId:tw.weekId,
      eraKey:tw.eraKey,
      completed:Object.keys(tw.claimed || {}).length,
      badges:tw.badges || 0,
      caches:tw.cacheClaims || 0,
      mastered:!!tw.metaClaimed,
    });
    tw.history = tw.history.slice(0, 6);
    const setup = createTimewalkingMissions(week);
    tw.weekId = week;
    tw.eraKey = setup.eraKey;
    tw.missions = setup.missions;
    tw.claimed = {};
    tw.metaClaimed = false;
    tw.distortions = createTimewalkingDistortions(week);
    tw.selected = {};
  }
  if (!tw.distortions.length) tw.distortions = createTimewalkingDistortions(tw.weekId);
  for (const mission of tw.missions) {
    if (typeof mission.progress !== 'number') mission.progress = 0;
  }
  return tw;
}

function timewalkingEra() {
  const tw = ensureTimewalkingState();
  return TIMEWALKING_ERAS.find(x => x.key === tw.eraKey) || activeTimewalkingEra(tw.weekId);
}

function isTimewalkingDungeon(dgOrKey) {
  const era = timewalkingEra();
  const key = typeof dgOrKey === 'string'
    ? ((typeof baseDungeonKey === 'function') ? baseDungeonKey(dgOrKey) : String(dgOrKey || ''))
    : ((typeof baseDungeonKey === 'function') ? baseDungeonKey(dgOrKey?.key) : String(dgOrKey?.key || ''));
  return era.dungeons.includes(key) || era.raids.includes(key);
}

function timewalkingThreatLevel() {
  const tw = ensureTimewalkingState();
  const completed = Object.keys(tw.claimed || {}).length + (tw.metaClaimed ? 2 : 0);
  const research = timewalkingResearchTotal();
  const bought = timewalkingCollectionCount();
  const meta = timewalkingMetaClaimCount();
  const eras = timewalkingEraMasteryCount();
  return Math.max(0, Math.min(20, completed * 2 + Math.floor((tw.cacheClaims || 0) * 1.5) + research + bought + meta + eras));
}

function timewalkingFeaturedKeys() {
  const tw = ensureTimewalkingState();
  const set = new Set();
  for (const mission of tw.missions) if (mission.key) set.add(mission.key);
  return set;
}

function timewalkingRewardText(r) {
  const parts = [];
  if (r.gold) parts.push(`${fmt(r.gold)}💰`);
  if (r.gem) parts.push(`${r.gem}💎`);
  if (r.honor) parts.push(`${fmt(r.honor)}🏅`);
  if (r.essence) parts.push(`${r.essence}✨`);
  if (r.badges) parts.push(`${r.badges}🪙`);
  if (r.title) parts.push(`称号「${r.title}」`);
  return parts.join(' ');
}

function timewalkingResearchCost(def, lvl) {
  return def.baseCost * (lvl + 1);
}

function timewalkingResearchLevel(key) {
  return ensureTimewalkingState().research?.[key] || 0;
}

function timewalkingDistortionDef(key) {
  return TIMEWALKING_DISTORTIONS.find(x => x.key === key) || null;
}

function timewalkingOfferedDistortions() {
  return ensureTimewalkingState().distortions.map(timewalkingDistortionDef).filter(Boolean);
}

function timewalkingActiveDistortions() {
  const tw = ensureTimewalkingState();
  return timewalkingOfferedDistortions().filter(def => !!tw.selected?.[def.key]);
}

function timewalkingActiveDistortionCount() {
  return timewalkingActiveDistortions().length;
}

function timewalkingDistortionRewardProfile() {
  const out = { goldPct:0, gemPct:0, honorPct:0, essencePct:0, badgesFlat:0, lootPower:0, legendaryChance:0, dropPct:0 };
  for (const def of timewalkingActiveDistortions()) {
    const reward = def.reward || {};
    for (const key of Object.keys(out)) out[key] += reward[key] || 0;
  }
  return out;
}

function timewalkingDistortionRewardText(reward) {
  const parts = [];
  if (reward.badgesFlat) parts.push(`+${reward.badgesFlat}🪙`);
  if (reward.goldPct) parts.push(`金币+${Math.round(reward.goldPct * 100)}%`);
  if (reward.gemPct) parts.push(`宝石+${Math.round(reward.gemPct * 100)}%`);
  if (reward.honorPct) parts.push(`荣誉+${Math.round(reward.honorPct * 100)}%`);
  if (reward.essencePct) parts.push(`精华+${Math.round(reward.essencePct * 100)}%`);
  if (reward.lootPower) parts.push(`掉落装等+${reward.lootPower}`);
  if (reward.dropPct) parts.push(`额外掉落+${Math.round(reward.dropPct * 100)}%`);
  if (reward.legendaryChance) parts.push(`橙装机率+${Math.round(reward.legendaryChance * 100)}%`);
  return parts.join(' · ');
}

function timewalkingDistortionDangerText(def) {
  const mod = def?.mod || {};
  const parts = [];
  if (mod.volcanic) parts.push('每8秒火山喷发');
  if (mod.arcane) parts.push('首领周期护盾');
  if (mod.afflicted) parts.push('每5秒苦痛侵蚀');
  if (mod.sanguine) parts.push('敌人倒地后治疗同伴');
  if (mod.bossEnrage) parts.push('首领40秒后狂暴');
  if (mod.raging) parts.push('残血敌人暴怒');
  if (mod.trashHp) parts.push(`小怪生命+${Math.round(mod.trashHp * 100)}%`);
  if (mod.trashDmg) parts.push(`小怪伤害+${Math.round(mod.trashDmg * 100)}%`);
  if (mod.bossHp) parts.push(`首领生命+${Math.round(mod.bossHp * 100)}%`);
  if (mod.bossDmg) parts.push(`首领伤害+${Math.round(mod.bossDmg * 100)}%`);
  if (mod.worldBossHp) parts.push(`世界Boss生命+${Math.round(mod.worldBossHp * 100)}%`);
  if (mod.worldBossAtk) parts.push(`世界Boss伤害+${Math.round(mod.worldBossAtk * 100)}%`);
  return parts.join(' · ');
}

function timewalkingToggleDistortion(key) {
  const tw = ensureTimewalkingState();
  const def = timewalkingDistortionDef(key);
  if (!def || !tw.distortions.includes(key)) return false;
  if (tw.selected[key]) {
    delete tw.selected[key];
    if (typeof markDirty === 'function') markDirty('events');
    log(`🕰️ 关闭时序扭曲「${def.name}」`, 'info');
    return true;
  }
  if (timewalkingActiveDistortionCount() >= TIMEWALKING_DISTORTION_ACTIVE_LIMIT) {
    log(`最多只能同时启用 ${TIMEWALKING_DISTORTION_ACTIVE_LIMIT} 条时序扭曲`, 'bad');
    return false;
  }
  tw.selected[key] = Date.now();
  if (typeof markDirty === 'function') markDirty('events');
  log(`⛓️ 启用时序扭曲「${def.name}」`, 'legend');
  return true;
}

function timewalkingResearchTotal() {
  return Object.values(ensureTimewalkingState().research || {}).reduce((sum, n) => sum + (n || 0), 0);
}

function timewalkingCollectionCount() {
  return Object.keys(ensureTimewalkingState().bought || {}).length;
}

function timewalkingMetaClaimCount() {
  return ensureTimewalkingState().metaClaims || 0;
}

function timewalkingEraMasteryCount() {
  const eras = ensureTimewalkingState().erasMastered || {};
  return Object.keys(eras).filter(key => (eras[key] || 0) > 0).length;
}

function timewalkingRecordThreat() {
  const tw = ensureTimewalkingState();
  tw.maxThreat = Math.max(tw.maxThreat || 0, timewalkingThreatLevel());
}

function timewalkingRecordDistortionClear() {
  const tw = ensureTimewalkingState();
  if (timewalkingActiveDistortionCount() <= 0) return;
  tw.distortionClears = (tw.distortionClears || 0) + 1;
  if (typeof progressionCheckAch === 'function') progressionCheckAch();
}

function timewalkingBuyResearch(key) {
  const tw = ensureTimewalkingState();
  const def = TIMEWALKING_RESEARCH.find(x => x.key === key);
  if (!def) return false;
  const cur = timewalkingResearchLevel(key);
  if (cur >= def.max) { log('该时序研究已满级', 'info'); return false; }
  const cost = timewalkingResearchCost(def, cur);
  if ((tw.badges || 0) < cost) { log(`时光徽记不足,需要 ${cost}`, 'bad'); return false; }
  tw.badges -= cost;
  tw.research[key] = cur + 1;
  const acc = (typeof accEns === 'function') ? accEns() : account;
  acc.permanentStats = acc.permanentStats || {};
  for (const [stat, gain] of Object.entries(def.gain || {})) acc.permanentStats[stat] = (acc.permanentStats[stat] || 0) + gain;
  if (typeof recomputeStats === 'function') recomputeStats();
  timewalkingRecordThreat();
  if (typeof progressionCheckAch === 'function') progressionCheckAch();
  if (typeof markDirty === 'function') markDirty('events', 'hero', 'progression');
  log(`🧪 完成时序研究「${def.name}」Lv.${cur + 1} · -${cost}时光徽记`, 'legend');
  return true;
}

function timewalkingCollectionOwned(key) {
  return !!ensureTimewalkingState().bought?.[key];
}

function timewalkingBuyCollection(key) {
  const tw = ensureTimewalkingState();
  const def = TIMEWALKING_COLLECTIONS.find(x => x.key === key);
  if (!def) return false;
  if (timewalkingCollectionOwned(key)) { log('该时光收藏已获得', 'info'); return false; }
  if ((tw.badges || 0) < def.cost) { log(`时光徽记不足,需要 ${def.cost}`, 'bad'); return false; }
  tw.badges -= def.cost;
  tw.bought[key] = Date.now();
  if (def.type === 'mount' && typeof mountGrant === 'function') mountGrant(def.rewardKey);
  if (def.type === 'title' && typeof unlockTitle === 'function') unlockTitle(def.rewardKey, false);
  timewalkingRecordThreat();
  if (typeof progressionCheckAch === 'function') progressionCheckAch();
  if (typeof markDirty === 'function') markDirty('events', 'hero', 'progression', 'mount');
  log(`🛒 购入时光收藏「${def.name}」 · -${def.cost}时光徽记`, 'legend');
  return true;
}

function timewalkingEnemyAffixFor(dg) {
  if (!dg) return null;
  const era = timewalkingEra();
  const key = (typeof baseDungeonKey === 'function') ? baseDungeonKey(dg.key) : dg.key;
  if (!era.dungeons.includes(key) && !era.raids.includes(key)) return null;
  const threat = timewalkingThreatLevel();
  if (threat <= 0) return null;
  const focused = timewalkingFeaturedKeys().has(key);
  const focus = focused ? 1.25 : 1;
  return {
    key:'timewalkingPressure',
    name: focused ? '时序扭结' : '时光回响',
    icon:'🕰️',
    desc:`${era.short} 内容被时光漫游重新标定: 小怪生命+${Math.round(threat * 3 * focus)}%,首领生命+${Math.round(threat * 5 * focus)}%,伤害+${Math.round(threat * 3 * focus)}%。`,
    mod:{
      trashHp: threat * 0.03 * focus,
      bossHp: threat * 0.05 * focus,
      bossDmg: threat * 0.03 * focus,
      trashDef: threat * 0.015 * focus,
      bossDef: threat * 0.012 * focus,
      addPatrol: threat >= 4,
    }
  };
}

function timewalkingDungeonDistortionAffixes(dg) {
  const era = timewalkingEra();
  const key = (typeof baseDungeonKey === 'function') ? baseDungeonKey(dg?.key) : dg?.key;
  if (!key || (!era.dungeons.includes(key) && !era.raids.includes(key))) return [];
  return timewalkingActiveDistortions().map(def => ({
    key:`timewalking_${def.key}`,
    name:def.name,
    icon:def.icon,
    desc:def.desc,
    mod:Object.assign({}, def.mod || {}),
  }));
}

function grantTimewalkingReward(r, targetKey, bossName, options) {
  if (!r) return null;
  const tw = ensureTimewalkingState();
  const broker = timewalkingBrokerActive();
  const distortion = timewalkingDistortionRewardProfile();
  const badgeGain = Math.max(0, Math.floor(((r.badges || 0) + (distortion.badgesFlat || 0)) * (broker ? 1.2 : 1)));
  if (r.gold) state.gold += Math.floor((broker ? 1.1 : 1) * r.gold * (1 + (distortion.goldPct || 0)));
  if (r.gem) state.gem += Math.ceil((broker ? 1.1 : 1) * r.gem * (1 + (distortion.gemPct || 0)));
  if (r.honor) state.honor += Math.floor((broker ? 1.08 : 1) * r.honor * (1 + (distortion.honorPct || 0)));
  if (r.essence) state.essence = (state.essence || 0) + Math.floor((broker ? 1.1 : 1) * r.essence * (1 + (distortion.essencePct || 0)));
  if (badgeGain) {
    tw.badges += badgeGain;
    tw.totalBadges += badgeGain;
  }
  if (r.title && typeof unlockTitle === 'function') unlockTitle(r.title);
  let item = null;
  if (!options?.noItem && typeof rollItem === 'function') {
    const era = timewalkingEra();
    const lootKey = timewalkingLootContextKey(targetKey, era);
    const dg = (typeof DUNGEONS !== 'undefined' ? DUNGEONS : []).find(x => x.key === lootKey);
    const power = dg ? ((dg.powerLvl || dg.reqLvl || 75) + (broker ? 2 : 0) + (distortion.lootPower || 0)) : 80;
    const canLegend = !!options?.legendary || ((distortion.legendaryChance || 0) > 0 && Math.random() < distortion.legendaryChance);
    const maxRarity = canLegend ? 'legend' : (dg?.type === 'raid' ? 'legend' : 'epic');
    const minRarity = dg?.type === 'raid' ? 'epic' : 'rare';
    item = rollItem(maxRarity, power, lootKey, bossName || timewalkingDungeonFinalBoss(lootKey), { minRarity });
    if (item) {
      addToInventory(item);
      if (typeof eventsOnItemGet === 'function') eventsOnItemGet(item);
      if (item.rarity === 'legend' && typeof progressionOnLegendary === 'function') progressionOnLegendary();
    }
    if ((broker || (distortion.dropPct || 0) > 0) && typeof rollItem === 'function' && Math.random() < Math.min(0.55, (broker ? 0.25 : 0) + (distortion.dropPct || 0))) {
      const extra = rollItem('epic', Math.max(70, power - 1), lootKey, bossName || timewalkingDungeonFinalBoss(lootKey), { minRarity:'rare' });
      if (extra) {
        addToInventory(extra);
        if (typeof eventsOnItemGet === 'function') eventsOnItemGet(extra);
      }
    }
  }
  if (typeof markDirty === 'function') markDirty('events', 'hero', 'inventory');
  return item;
}

function timewalkingAdvanceMission(id, gain) {
  if (!gain) return false;
  const tw = ensureTimewalkingState();
  const mission = tw.missions.find(m => m.id === id);
  if (!mission || tw.claimed[id]) return false;
  const before = mission.progress || 0;
  mission.progress = Math.min(mission.goal || 1, before + gain);
  return mission.progress !== before;
}

function timewalkingAddDungeonProgress(payload) {
  const tw = ensureTimewalkingState();
  const baseKey = payload?.baseKey;
  if (!baseKey || !isTimewalkingDungeon(baseKey)) return;
  let changed = false;
  for (const mission of tw.missions) {
    if (tw.claimed[mission.id]) continue;
    if (mission.type === 'dungeonAny' && mission.keys?.includes(baseKey)) {
      changed = timewalkingAdvanceMission(mission.id, 1) || changed;
    } else if (mission.type === 'dungeonKey' && mission.key === baseKey) {
      changed = timewalkingAdvanceMission(mission.id, 1) || changed;
    } else if (mission.type === 'raidKey' && mission.key === baseKey) {
      changed = timewalkingAdvanceMission(mission.id, 1) || changed;
    } else if (mission.type === 'challenge' && mission.keys?.includes(baseKey)) {
      const gain = payload.challengeGain || 0;
      if (gain > 0) changed = timewalkingAdvanceMission(mission.id, gain) || changed;
    }
  }
  if (changed && typeof markDirty === 'function') markDirty('events');
}

function timewalkingOnWorldBossKill(key) {
  const tw = ensureTimewalkingState();
  for (const mission of tw.missions) {
    if (tw.claimed[mission.id]) continue;
    if (mission.type === 'worldBoss' && mission.key === key) {
      timewalkingAdvanceMission(mission.id, 1);
      if (typeof markDirty === 'function') markDirty('events');
      break;
    }
  }
}

function claimTimewalkingMission(id) {
  const tw = ensureTimewalkingState();
  const mission = tw.missions.find(m => m.id === id);
  if (!mission) return false;
  if (tw.claimed[id]) { log('该时光漫游路线奖励已领取', 'info'); return false; }
  if ((mission.progress || 0) < (mission.goal || 1)) { log('时光漫游路线尚未完成', 'bad'); return false; }
  tw.claimed[id] = Date.now();
  tw.totalClaims = (tw.totalClaims || 0) + 1;
  const bossName = mission.type === 'worldBoss' ? timewalkingWorldBossName(mission.key) : timewalkingDungeonFinalBoss(mission.key);
  const item = grantTimewalkingReward(mission.reward, mission.key, bossName);
  timewalkingRecordThreat();
  if (typeof progressionCheckAch === 'function') progressionCheckAch();
  if (typeof markDirty === 'function') markDirty('events', 'hero', 'inventory', 'progression');
  log(`🕰️ 领取时光漫游路线「${mission.name}」· ${timewalkingRewardText(mission.reward)}${item ? ` · ${item.name}` : ''}`, 'legend');
  return true;
}

function claimTimewalkingMeta() {
  const tw = ensureTimewalkingState();
  if (tw.metaClaimed) { log('本周时光漫游总奖励已领取', 'info'); return false; }
  const allDone = tw.missions.every(m => (m.progress || 0) >= (m.goal || 1));
  if (!allDone) { log('仍有时光漫游路线未完成', 'bad'); return false; }
  tw.metaClaimed = true;
  const era = timewalkingEra();
  tw.metaClaims = (tw.metaClaims || 0) + 1;
  tw.erasMastered[era.key] = (tw.erasMastered[era.key] || 0) + 1;
  const raidMission = tw.missions.find(m => m.type === 'raidKey');
  const reward = { gold:520000, gem:90, honor:4200, essence:88, badges:10, title:'时序战团老兵' };
  const item = grantTimewalkingReward(reward, raidMission?.key || era.lootFallback, timewalkingDungeonFinalBoss(raidMission?.key || era.lootFallback), { legendary:true });
  timewalkingRecordThreat();
  if (typeof progressionCheckAch === 'function') progressionCheckAch();
  if (typeof markDirty === 'function') markDirty('events', 'hero', 'inventory', 'progression');
  log(`🌠 领取时光漫游总奖励 · ${timewalkingRewardText(reward)}${item ? ` · ${item.name}` : ''}`, 'legend');
  return true;
}

function exchangeTimewalkingCache() {
  const tw = ensureTimewalkingState();
  if ((tw.badges || 0) < TIMEWALKING_CACHE_COST) {
    log(`时光徽记不足,需要 ${TIMEWALKING_CACHE_COST}`, 'bad');
    return false;
  }
  tw.badges -= TIMEWALKING_CACHE_COST;
  tw.cacheClaims = (tw.cacheClaims || 0) + 1;
  const era = timewalkingEra();
  const targetKey = tw.missions.find(m => m.type === 'raidKey')?.key || era.lootFallback;
  const reward = { gold:240000, gem:36, honor:1800, essence:46, badges:0 };
  const item = grantTimewalkingReward(reward, targetKey, timewalkingDungeonFinalBoss(targetKey), { legendary:Math.random() < (timewalkingBrokerActive() ? 0.28 : 0.16) });
  timewalkingRecordThreat();
  if (typeof progressionCheckAch === 'function') progressionCheckAch();
  if (typeof markDirty === 'function') markDirty('events', 'hero', 'inventory', 'progression');
  log(`📦 打开时光漫游宝箱 · ${timewalkingRewardText(reward)}${item ? ` · ${item.name}` : ''}`, 'legend');
  return true;
}

function renderTimewalkingSub() {
  const tw = ensureTimewalkingState();
  const era = timewalkingEra();
  const left = Math.max(0, Math.ceil((((tw.weekId || timewalkingWeekId()) + 1) * 86400000 * 7 - Date.now()) / 1000));
  const threat = timewalkingThreatLevel();
  const claimed = Object.keys(tw.claimed || {}).length;
  const ready = tw.missions.filter(m => !tw.claimed[m.id] && (m.progress || 0) >= (m.goal || 1)).length;
  const allDone = tw.missions.every(m => (m.progress || 0) >= (m.goal || 1));
  const broker = timewalkingBrokerActive();
  const researchTotal = timewalkingResearchTotal();
  const collectionTotal = timewalkingCollectionCount();
  const metaTotal = timewalkingMetaClaimCount();
  const eraMastered = timewalkingEraMasteryCount();
  const activeDistortions = timewalkingActiveDistortions();
  const activeDistortionCount = activeDistortions.length;
  const activeDistortionKeys = new Set(activeDistortions.map(def => def.key));
  const distortionProfile = timewalkingDistortionRewardProfile();
  const researchCards = TIMEWALKING_RESEARCH.map(def => {
    const cur = timewalkingResearchLevel(def.key);
    const maxed = cur >= def.max;
    const cost = timewalkingResearchCost(def, cur);
    const can = !maxed && (tw.badges || 0) >= cost;
    const gainText = Object.entries(def.gain || {}).map(([stat, val]) => typeof fmtMod === 'function' ? fmtMod(stat, val) : `${stat}+${val}`).join(' · ');
    return `<div class="timewalking-store-card ${maxed ? 'claimed' : (can ? 'ready' : '')}">
      <div class="timewalking-head">
        <span class="timewalking-icon">${def.icon}</span>
        <div><b>${def.name}</b><div class="muted" style="font-size:10px">${def.desc}</div></div>
      </div>
      <div class="muted" style="font-size:10px;margin-top:6px">当前 ${cur}/${def.max} · 每级 ${gainText}</div>
      <div class="timewalking-foot">
        <span class="muted" style="font-size:10px">${maxed ? '已满级' : `${cost}🪙`}</span>
        <button class="${can ? 'gold' : ''}" data-action="buytimewalkingresearch" data-key="${def.key}" ${can ? '' : 'disabled'}>${maxed ? '已满' : '研究'}</button>
      </div>
    </div>`;
  }).join('');
  const collectionCards = TIMEWALKING_COLLECTIONS.map(def => {
    const owned = timewalkingCollectionOwned(def.key);
    const can = !owned && (tw.badges || 0) >= def.cost;
    return `<div class="timewalking-store-card ${owned ? 'claimed' : (can ? 'ready' : '')}">
      <div class="timewalking-head">
        <span class="timewalking-icon">${def.icon}</span>
        <div><b>${def.name}</b><div class="muted" style="font-size:10px">${def.desc}</div></div>
      </div>
      <div class="timewalking-foot">
        <span class="muted" style="font-size:10px">${owned ? '已收集' : `${def.cost}🪙`}</span>
        <button class="${can ? 'gold' : ''}" data-action="buytimewalkingcollection" data-key="${def.key}" ${can ? '' : 'disabled'}>${owned ? '已获得' : '兑换'}</button>
      </div>
    </div>`;
  }).join('');
  const atlasCards = TIMEWALKING_ERAS.map(def => {
    const active = def.key === era.key;
    const mastered = tw.erasMastered?.[def.key] || 0;
    const cls = active ? 'ready' : (mastered ? 'claimed' : '');
    const tag = active ? '本周轮值' : (mastered ? `已精通 ${mastered} 次` : '未精通');
    return `<div class="timewalking-store-card ${cls}">
      <div class="timewalking-head">
        <span class="timewalking-icon">${def.icon}</span>
        <div><b>${def.name}</b><div class="muted" style="font-size:10px">${def.desc}</div></div>
      </div>
      <div class="muted" style="font-size:10px;margin-top:6px">${def.dungeons.map(timewalkingDungeonName).join(' · ')}</div>
      <div class="muted" style="font-size:10px;margin-top:3px">团本 ${def.raids.map(timewalkingDungeonName).join(' · ')} · 世界Boss ${timewalkingWorldBossName(def.worldBoss)}</div>
      <div class="timewalking-foot">
        <span class="muted" style="font-size:10px">${tag}</span>
        <span class="muted" style="font-size:10px;color:${def.color}">${def.short}</span>
      </div>
    </div>`;
  }).join('');
  const distortionCards = timewalkingOfferedDistortions().map(def => {
    const active = activeDistortionKeys.has(def.key);
    const capped = !active && activeDistortionCount >= TIMEWALKING_DISTORTION_ACTIVE_LIMIT;
    const cls = active ? 'active' : (capped ? '' : 'ready');
    return `<div class="timewalking-store-card ${cls}">
      <div class="timewalking-head">
        <span class="timewalking-icon">${def.icon}</span>
        <div><b>${def.name}</b><div class="muted" style="font-size:10px">${def.desc}</div></div>
      </div>
      <div class="muted" style="font-size:10px;margin-top:6px">敌方强化: ${timewalkingDistortionDangerText(def)}</div>
      <div class="muted" style="font-size:10px;margin-top:3px">${timewalkingDistortionRewardText(def.reward || {})}</div>
      <div class="timewalking-foot">
        <span class="muted" style="font-size:10px">${active ? '已启用' : (capped ? '已达上限' : '可启用')}</span>
        <button class="${active || !capped ? 'gold' : ''}" data-action="toggletimewalkingdistortion" data-key="${def.key}" ${active || !capped ? '' : 'disabled'}>${active ? '停用' : '启用'}</button>
      </div>
    </div>`;
  }).join('');
  const cards = tw.missions.map(m => {
    const done = (m.progress || 0) >= (m.goal || 1);
    const claimedMission = !!tw.claimed[m.id];
    const pct = Math.min(100, ((m.progress || 0) / (m.goal || 1)) * 100);
    const btn = claimedMission
      ? '<span class="muted">✓已领取</span>'
      : done
        ? `<button class="gold" data-action="claimtimewalking" data-id="${m.id}">领取</button>`
        : `<span class="muted" style="font-size:10px">${fmt(m.progress || 0)}/${fmt(m.goal || 1)}</span>`;
    return `<div class="timewalking-card ${claimedMission ? 'claimed' : (done ? 'ready' : '')}" style="border-left-color:${era.color}">
      <div class="timewalking-head">
        <span class="timewalking-icon">${m.icon}</span>
        <div><b>${m.name}</b><div class="muted" style="font-size:10px">${m.desc}</div></div>
      </div>
      <div class="bar xp" style="height:7px;margin-top:6px"><i style="width:${pct}%"></i></div>
      <div class="muted" style="font-size:10px;margin-top:5px">${timewalkingRewardText(m.reward)}</div>
      <div class="timewalking-foot">${btn}</div>
    </div>`;
  }).join('');
  const hist = (tw.history || []).slice(0, 3).map(h => `<div class="muted">周 ${h.weekId}: ${h.eraKey || 'unknown'} · 完成 ${h.completed || 0} 条 · 徽记 ${h.badges || 0}</div>`).join('');
  return `<div class="timewalking-panel">
    <div class="timewalking-hero" style="background-image:linear-gradient(90deg, rgba(8,12,24,.92), rgba(8,12,24,.56)), url('${TIMEWALKING_BANNER}')">
      <div class="timewalking-title">${era.icon} ${era.name}</div>
      <div class="timewalking-text">周重置 ${fmtCd(left)} · 已领取 <b>${claimed}/${TIMEWALKING_MISSION_COUNT}</b> 条路线 · 可领取 <b style="color:var(--legend)">${ready}</b> 条 · 时序压力 <b>${threat}</b>${broker ? ' · 掮客加成已启用' : ''}</div>
    </div>
    <div class="timewalking-wallet">
      <span>时光徽记 <b>${tw.badges || 0}</b></span>
      <span>累计路线 <b>${tw.totalClaims || 0}</b></span>
      <span>累计徽记 <b>${tw.totalBadges || 0}</b></span>
      <span>宝箱 <b>${tw.cacheClaims || 0}</b></span>
      <span>周终总奖励 <b>${metaTotal}</b></span>
      <span>精通时代 <b>${eraMastered}</b></span>
      <span>扭曲通关 <b>${tw.distortionClears || 0}</b></span>
    </div>
    <div class="timewalking-note">${era.desc} 本周地下城: ${era.dungeons.map(timewalkingDungeonName).join(' · ')} · 团本池: ${era.raids.map(timewalkingDungeonName).join(' · ')}。被轮值点名的旧时代内容会同步变强,避免高等级角色直接平推。</div>
    <div class="timewalking-grid">${cards}</div>
    <div class="timewalking-actions">
      <button class="${allDone && !tw.metaClaimed ? 'gold' : ''}" data-action="claimtimewalkingmeta" ${allDone && !tw.metaClaimed ? '' : 'disabled'}>${tw.metaClaimed ? '总奖励已领' : '领取周终总奖励'}</button>
      <button class="${(tw.badges || 0) >= TIMEWALKING_CACHE_COST ? 'gold' : ''}" data-action="exchangetimewalking" ${(tw.badges || 0) >= TIMEWALKING_CACHE_COST ? '' : 'disabled'}>时光宝箱 ${TIMEWALKING_CACHE_COST} 徽记</button>
    </div>
    <div class="timewalking-store-title">⛓️ 时序扭曲</div>
    <div class="timewalking-note">每周提供 ${TIMEWALKING_DISTORTION_OFFER_COUNT} 条时序扭曲,最多可同时启用 <b>${TIMEWALKING_DISTORTION_ACTIVE_LIMIT}</b> 条。当前启用 <b>${activeDistortionCount}</b> 条,会直接强化地下城、团本与本周世界Boss,并带来额外奖励 ${timewalkingDistortionRewardText(distortionProfile) || '无'}。</div>
    <div class="timewalking-grid">${distortionCards}</div>
    <div class="timewalking-hero" style="margin-top:14px;background-image:linear-gradient(90deg, rgba(8,12,24,.92), rgba(8,12,24,.48)), url('${TIMEWALKING_ATLAS_BANNER}')">
      <div class="timewalking-title">🗺️ 时序图谱</div>
      <div class="timewalking-text">已解锁研究 <b>${researchTotal}</b> 层 · 已收集 <b>${collectionTotal}</b> 件时光收藏 · 最高时序压力 <b>${tw.maxThreat || threat}</b>。你每把一条旧时代航线推到精通,对应地下城、团本与世界Boss都会继续变强。</div>
    </div>
    <div class="timewalking-store-title">🗺️ 时序图谱</div>
    <div class="timewalking-grid">${atlasCards}</div>
    <div class="timewalking-store-title">🧪 时序研究</div>
    <div class="timewalking-grid">${researchCards}</div>
    <div class="timewalking-store-title">🛒 时光商人</div>
    <div class="timewalking-grid">${collectionCards}</div>
    ${hist ? `<div class="timewalking-history">${hist}</div>` : ''}
  </div>`;
}

(function installTimewalkingHooks() {
  globalThis.renderTimewalkingSub = renderTimewalkingSub;
  globalThis.ensureTimewalkingState = ensureTimewalkingState;
  globalThis.isTimewalkingDungeon = isTimewalkingDungeon;

  const oldEnter = globalThis.enterDungeon;
  if (typeof oldEnter === 'function' && !oldEnter._timewalkingWrapped) {
    function wrappedEnterDungeon(key) {
      oldEnter.apply(this, arguments);
      const ds = state?.dungeonState;
      const dg = (typeof DUNGEONS !== 'undefined' ? DUNGEONS : []).find(d => d.key === key);
      const affixes = [timewalkingEnemyAffixFor(dg), ...timewalkingDungeonDistortionAffixes(dg)].filter(Boolean);
      if (ds && Array.isArray(ds.affixes) && affixes.length) {
        for (const affix of affixes) if (!ds.affixes.some(a => a?.key === affix.key)) ds.affixes.push(affix);
        if (typeof log === 'function') log(`🕰️ 时光漫游重新标定了 ${dg.name}${timewalkingActiveDistortionCount() ? ' · 扭曲已介入' : ''}`, 'bad');
      }
    }
    wrappedEnterDungeon._timewalkingWrapped = true;
    globalThis.enterDungeon = wrappedEnterDungeon;
  }

  const oldEnterMythic = globalThis.enterMythic;
  if (typeof oldEnterMythic === 'function' && !oldEnterMythic._timewalkingWrapped) {
    function wrappedEnterMythic() {
      oldEnterMythic.apply(this, arguments);
      const ms = state?.mythicState;
      const dg = (typeof DUNGEONS !== 'undefined' ? DUNGEONS : []).find(d => d.key === ms?.key);
      const affixes = [timewalkingEnemyAffixFor(dg), ...timewalkingDungeonDistortionAffixes(dg)].filter(Boolean);
      if (ms && Array.isArray(ms.affixes) && affixes.length) {
        for (const affix of affixes) if (!ms.affixes.some(a => a?.key === affix.key)) ms.affixes.push(affix);
        if (typeof log === 'function') log(`🕰️ 时光漫游同步强化了大秘境 [${dg.name}]${timewalkingActiveDistortionCount() ? ' · 扭曲已介入' : ''}`, 'bad');
      }
    }
    wrappedEnterMythic._timewalkingWrapped = true;
    globalThis.enterMythic = wrappedEnterMythic;
  }

  const oldDungeonClear = globalThis.onDungeonClear;
  if (typeof oldDungeonClear === 'function' && !oldDungeonClear._timewalkingWrapped) {
    function wrappedOnDungeonClear(dg) {
      oldDungeonClear.apply(this, arguments);
      const baseKey = (typeof baseDungeonKey === 'function') ? baseDungeonKey(dg?.key) : dg?.key;
      if (!baseKey || !isTimewalkingDungeon(baseKey)) return;
      let challengeGain = 0;
      if (dg?.heroic || dg?.epic5) challengeGain = 1;
      if (dg?.type === 'raid') challengeGain = 1;
      timewalkingRecordDistortionClear();
      timewalkingAddDungeonProgress({ baseKey, challengeGain });
    }
    wrappedOnDungeonClear._timewalkingWrapped = true;
    globalThis.onDungeonClear = wrappedOnDungeonClear;
  }

  const oldMythicClear = globalThis.onMythicClear;
  if (typeof oldMythicClear === 'function' && !oldMythicClear._timewalkingWrapped) {
    function wrappedOnMythicClear() {
      const key = state?.mythicState?.key;
      oldMythicClear.apply(this, arguments);
      const baseKey = (typeof baseDungeonKey === 'function') ? baseDungeonKey(key) : key;
      if (!baseKey || !isTimewalkingDungeon(baseKey)) return;
      timewalkingRecordDistortionClear();
      timewalkingAddDungeonProgress({ baseKey, challengeGain:2 });
    }
    wrappedOnMythicClear._timewalkingWrapped = true;
    globalThis.onMythicClear = wrappedOnMythicClear;
  }

  const oldWorldBossKill = globalThis.onWorldBossKill;
  if (typeof oldWorldBossKill === 'function' && !oldWorldBossKill._timewalkingWrapped) {
    function wrappedOnWorldBossKill(mon) {
      oldWorldBossKill.apply(this, arguments);
      const key = mon?.wbKey || mon?.key;
      const era = timewalkingEra();
      if (key && key === era.worldBoss) timewalkingRecordDistortionClear();
      if (key) timewalkingOnWorldBossKill(key);
    }
    wrappedOnWorldBossKill._timewalkingWrapped = true;
    globalThis.onWorldBossKill = wrappedOnWorldBossKill;
  }

  const oldBuildWb = globalThis.buildWorldBossMonsterData;
  if (typeof oldBuildWb === 'function' && !oldBuildWb._timewalkingWrapped) {
    function wrappedBuildWorldBossMonsterData(wb) {
      const mon = oldBuildWb.apply(this, arguments);
      const era = timewalkingEra();
      if (wb?.key !== era.worldBoss) return mon;
      const threat = timewalkingThreatLevel();
      if (threat <= 0) return mon;
      const focused = timewalkingFeaturedKeys().has(wb.key);
      const focus = focused ? 1.25 : 1;
      mon.hpMax = Math.floor(mon.hpMax * (1 + threat * 0.06 * focus));
      mon.hp = mon.hpMax;
      mon.atk = Math.floor(mon.atk * (1 + threat * 0.04 * focus));
      mon.def = Math.floor(mon.def * (1 + threat * 0.025 * focus));
      mon.dmgReduction = Math.min(0.82, (mon.dmgReduction || 0) + threat * 0.004 * focus);
      for (const def of timewalkingActiveDistortions()) {
        const mod = def.mod || {};
        if (mod.worldBossHp) {
          mon.hpMax = Math.floor(mon.hpMax * (1 + mod.worldBossHp));
          mon.hp = mon.hpMax;
        }
        if (mod.worldBossAtk) mon.atk = Math.floor(mon.atk * (1 + mod.worldBossAtk));
        if (mod.worldBossDef) mon.def = Math.floor(mon.def * (1 + mod.worldBossDef));
        if (mod.worldBossDr) mon.dmgReduction = Math.min(0.88, (mon.dmgReduction || 0) + mod.worldBossDr);
      }
      return mon;
    }
    wrappedBuildWorldBossMonsterData._timewalkingWrapped = true;
    globalThis.buildWorldBossMonsterData = wrappedBuildWorldBossMonsterData;
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest && e.target.closest('button[data-action^="claimtimewalking"],button[data-action="exchangetimewalking"],button[data-action="buytimewalkingresearch"],button[data-action="buytimewalkingcollection"],button[data-action="toggletimewalkingdistortion"]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (btn.dataset.action === 'claimtimewalking') claimTimewalkingMission(btn.dataset.id);
    else if (btn.dataset.action === 'claimtimewalkingmeta') claimTimewalkingMeta();
    else if (btn.dataset.action === 'exchangetimewalking') exchangeTimewalkingCache();
    else if (btn.dataset.action === 'buytimewalkingresearch') timewalkingBuyResearch(btn.dataset.key);
    else if (btn.dataset.action === 'buytimewalkingcollection') timewalkingBuyCollection(btn.dataset.key);
    else if (btn.dataset.action === 'toggletimewalkingdistortion') timewalkingToggleDistortion(btn.dataset.key);
    if (typeof renderEvents === 'function') renderEvents();
  }, true);
})();
