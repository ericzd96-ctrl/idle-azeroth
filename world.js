/* =========================================================
   world.js — 地图切换、副本、BOSS、商店、天赋、属性、离线收益
   ========================================================= */

/* ---------- 地图导航 ---------- */
function calcTravelTime(fromMapKey, toMapKey) {
  if (fromMapKey === toMapKey) return 0;
  const from = MAPS.find(m => m.key === fromMapKey);
  const to = MAPS.find(m => m.key === toMapKey);
  if (!from || !to) return 0;
  const fromMid = (from.lvlRange[0] + from.lvlRange[1]) / 2;
  const toMid = (to.lvlRange[0] + to.lvlRange[1]) / 2;
  const diff = Math.abs(toMid - fromMid);
  return Math.max(2, Math.min(25, Math.floor(diff * 0.35)));
}

function switchSubzone(mapKey, subIdx) {
  const map = MAPS.find(m => m.key === mapKey);
  if (!map) return;
  if (state.mode === 'dungeon') {
    if (!confirm('离开当前战斗?')) return;
    state.mode = 'world';
    state.dungeonState = null;
  }
  if (state.mode === 'mythic') {
    if (!confirm('离开大秘境?')) return;
    state.mode = 'world';
    state.mythicState = null;
  }
  if (state.mode === 'tower') {
    if (!confirm('撤离无尽塔?')) return;
    if (typeof leaveTower === 'function') leaveTower();
  }
  if (state.mode === 'roguelike') {
    if (!confirm('撤离幻象挑战? 幻象币会保留')) return;
    if (typeof leaveRoguelike === 'function') leaveRoguelike();
    else { state.mode = 'world'; state.towerState = null; }
  }
  if (state.mode === 'boss') {
    if (!confirm('撤离首领战?')) return;
    state.mode = 'world';
  }
  if (state.mode === 'travel') {
    log('正在旅行中...', 'bad');
    return;
  }

  // 同地图切子区域: 瞬间到达
  if (mapKey === state.currentMap) {
    state.currentSubzone = subIdx;
    state.currentMonsters = [];
    if (typeof resetDmgStats === 'function') resetDmgStats();
    spawnMonster();
    const sub = map.sub[subIdx];
    log(`📍 移动到 ${map.icon} ${map.name} · ${sub.name}`, 'info');
    markDirty('map', 'stage');
    return;
  }

  // 跨地图: 需要跑路
  const travelTime = calcTravelTime(state.currentMap, mapKey);
  state.mode = 'travel';
  state.travel = {
    mapKey,
    subIdx,
    startTime: Date.now(),
    duration: travelTime * 1000,
  };
  state.currentMonsters = [];
  const sub = map.sub[subIdx];
  log(`🐴 前往 ${map.icon} ${map.name} · ${sub.name} (${travelTime}秒)`, 'info');
  $('modal-travel').classList.add('show');
  markDirty('map', 'stage');
}

function tickTravel(now) {
  if (state.mode !== 'travel' || !state.travel) return;
  const t = state.travel;
  const elapsed = now - t.startTime;
  const pct = Math.min(100, elapsed / t.duration * 100);
  const remaining = Math.max(0, Math.ceil((t.duration - elapsed) / 1000));

  setBar($('b-travel'), pct, `${remaining}秒`);
  $('travel-text').textContent = `从 ${(getMap()||{}).name||'?'} 前往 ${(MAPS.find(m=>m.key===t.mapKey)||{}).name||'?'}`;

  if (elapsed >= t.duration) {
    $('modal-travel').classList.remove('show');
    state.mode = 'world';
    state.currentMap = t.mapKey;
    state.currentSubzone = t.subIdx;
    state.travel = null;
    if (typeof resetDmgStats === 'function') resetDmgStats();
    spawnMonster();
    const map = MAPS.find(m => m.key === t.mapKey);
    const sub = map.sub[t.subIdx];
    log(`📍 抵达 ${map.icon} ${map.name} · ${sub.name}`, 'good');
    markDirty('map', 'stage');
  }
}

/* BOSS挑战CD(秒):按地图BOSS等级线性,封顶1小时(Lv80=3600s) */
function bossCdSec(map) { return Math.min(3600, Math.round((map.boss.lvl || 1) * 45)); }

function challengeBoss(mapKey) {
  const map = MAPS.find(m => m.key === mapKey);
  if (!map) return;
  if (state.hero.lvl < map.boss.lvl - 5) { log(`等级不足 (需 等级${map.boss.lvl-5}+)`, 'bad'); return; }
  if (state.mode === 'travel') { log('正在旅行中', 'bad'); return; }
  if (state.mode !== 'world') { log('请先结束当前战斗', 'bad'); return; }
  const cdEnd = state.bossCd[mapKey] || 0;
  const onCd = cdEnd > Date.now();
  if (onCd && state.tickets < 1) { log('首领挑战冷却中，通用券不足无法跳过', 'bad'); return; }
  if (onCd) { state.tickets -= 1; log(`⚔️ 挑战 ${map.boss.emoji}${map.boss.name}! (消耗1通用券跳过冷却)`, 'epic'); }
  else { log(`⚔️ 挑战 ${map.boss.emoji}${map.boss.name}! (免费)`, 'epic'); }
  state.bossCd[mapKey] = Date.now() + bossCdSec(map) * 1000;   // 挑战即进入CD(无论胜负)
  state.currentMap = mapKey;
  state.mode = 'boss';
  state.currentMonsters = [];
  state.hp = state.hero.hpMax;
  state.resource = state.resourceMax;
  if (typeof resetDmgStats === 'function') resetDmgStats();
  if (typeof clearAllBuffs === 'function') clearAllBuffs();
  spawnZoneBoss();
  markDirty('map', 'stage');
}

/* ---------- 副本 ---------- */
function enterDungeon(key) {
  const dg = DUNGEONS.find(d => d.key === key);
  if (state.hero.lvl < dg.reqLvl) { log(`需要等级 ${dg.reqLvl}`, 'bad'); return; }
  if (state.mode === 'travel') { log('正在旅行中', 'bad'); return; }
  if (state.mode === 'dungeon') { log('已在副本中', 'bad'); return; }
  const cdEnd = state.dungeonCd[key] || 0;
  const onCd = cdEnd > Date.now();
  if (onCd && state.tickets < 1) { log('通用券不足,去商店购买', 'bad'); return; }
  if (onCd) {
    state.tickets -= 1;
    log(`🚪 进入 [${dg.name}] (消耗1通用券跳过冷却)`, 'epic');
  } else {
    log(`🚪 进入 [${dg.name}] (免费)`, 'epic');
  }
  state.mode = 'dungeon';
  const contractLevel = (typeof dungeonContractLevel === 'function') ? dungeonContractLevel() : 0;
  const contract = (typeof dungeonContractInfo === 'function') ? dungeonContractInfo(contractLevel) : null;
  const baseAffixes = getDungeonAffixes(dg);
  const trials = (typeof getDungeonContractTrials === 'function') ? getDungeonContractTrials(dg, contractLevel) : [];
  const environments = (typeof getDungeonEnvironments === 'function') ? getDungeonEnvironments(dg, contractLevel) : [];
  state.dungeonState = { key, wave: 1, loot: [], affixes: baseAffixes.concat(trials), trials, environments, contractLevel, contract, alertLevel: 0, maxAlert: 0 };
  if (contractLevel > 0 && contract) log(`${contract.icon || '📜'} 已启用 ${contract.name}: ${contract.desc}`, 'legend');
  if (trials.length) log(`🔥 契约试炼: ${trials.map(t => `${t.icon || '🔥'}${t.name}`).join(' · ')}`, 'legend');
  if (environments.length) log(`🧭 副本环境: ${environments.map(e => `${e.icon || '🧭'}${e.name}`).join(' · ')}`, 'bad');
  // 进入副本:全量刷新所有技能CD(英雄/天赋/神器/随从)+清理身上的 buff/debuff/护盾(含随从护盾与随从buff/debuff)
  if (typeof resetCombatState === 'function') resetCombatState();
  else if (typeof clearAllBuffs === 'function') clearAllBuffs();
  if (typeof recomputeStats === 'function') recomputeStats();   // 清增益后重算面板,再回满血
  if (typeof initCompanionHp === 'function') initCompanionHp();  // 随从满血进本(spawnDungeonMonster 不会初始化,resetCombatState 已置空_compHp)
  state.hp = state.hero.hpMax;
  state.resource = state.resourceMax;
  if (typeof resetDmgStats === 'function') resetDmgStats();
  spawnDungeonMonster();
  markDirty('dungeon', 'stage', 'hero');
}

function leaveDungeon() {
  state.mode = 'world';
  state.dungeonState = null;
  spawnMonster();
  markDirty('dungeon', 'stage');
}

const DUNGEON_CONTRACTS = [
  { level:0, name:'稳扎稳打', icon:'📘', desc:'标准副本难度与奖励。', hp:1, atk:1, def:1, reward:1, chest:0 },
  { level:1, name:'危险契约', icon:'📕', desc:'怪物生命+18%,攻击+10%,防御+6%;通关奖励+18%。', hp:1.18, atk:1.10, def:1.06, reward:1.18, chest:1 },
  { level:2, name:'残酷契约', icon:'📙', desc:'怪物生命+42%,攻击+24%,防御+14%;通关奖励+42%。', hp:1.42, atk:1.24, def:1.14, reward:1.42, chest:2 },
  { level:3, name:'噩梦契约', icon:'📓', desc:'怪物生命+78%,攻击+42%,防御+24%;通关奖励+80%。', hp:1.78, atk:1.42, def:1.24, reward:1.80, chest:3 },
];

function dungeonContractLevel() {
  return Math.max(0, Math.min(3, Math.floor(state.dungeonContractLevel || 0)));
}

function dungeonContractInfo(level) {
  return DUNGEON_CONTRACTS[Math.max(0, Math.min(3, Math.floor(level || 0)))] || DUNGEON_CONTRACTS[0];
}

const DUNGEON_ENVIRONMENTS = [
  { key:'trapHall', name:'机关回廊', icon:'🪤', desc:'战斗中每11秒触发陷阱,造成最大生命6%伤害。', mod:{trapTickMs:11000, trapDamagePct:0.06} },
  { key:'poisonMiasma', name:'腐毒雾气', icon:'☣️', desc:'治疗效果降低18%,并周期性施加毒性持续伤害。', mod:{healReduction:0.18, poisonTickMs:9000, poisonDpsPct:0.018, poisonMs:4200} },
  { key:'manaFlux', name:'魔力紊乱', icon:'💧', desc:'攻击速度降低6%,并周期性燃烧12%最大资源。', mod:{heroSpd:-0.06, drainTickMs:10000, resourceDrainPct:0.12} },
  { key:'collapsingVault', name:'塌陷穹顶', icon:'🪨', desc:'战斗中每14秒落石,造成伤害并短暂打断行动。', mod:{ceilingTickMs:14000, ceilingDamagePct:0.07, stunMs:700} },
  { key:'wardedSanctum', name:'守护圣所', icon:'🔷', desc:'敌人每16秒获得小型吸收盾。', mod:{shieldTickMs:16000, monsterShieldPct:0.055} },
  { key:'dreadFog', name:'恐惧黑雾', icon:'🌫️', desc:'受到伤害提高10%,并周期性陷入虚弱。', mod:{vulnerableTaken:true, weakenTickMs:13000, weakenMs:5000} },
];

function getDungeonEnvironments(dg, contractLevel) {
  const level = Math.max(0, Math.min(3, Math.floor(contractLevel || 0)));
  if (!dg || level <= 0) return [];
  const count = level >= 3 ? 2 : 1;
  const day = Math.floor(Date.now() / 86400000);
  let seed = ((dg.reqLvl || 1) * 313 + level * 1291 + (day % 100000) * 577) % 2147483647;
  const key = dg.key || '';
  for (let i = 0; i < key.length; i++) seed = (seed * 43 + key.charCodeAt(i)) % 2147483647;
  seed = seed || 1;
  const pool = DUNGEON_ENVIRONMENTS.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length)).map(e => ({ ...e, dungeonEnvironment:true }));
}

const DUNGEON_CONTRACT_TRIALS = [
  { key:'trialPatrol', name:'铁卫巡逻', desc:'非首领战有概率加入一名巡逻增援;小怪攻击+12%。', icon:'🚨', mod:{addPatrol:true, trashDmg:0.12} },
  { key:'trialBulwark', name:'重甲戒严', desc:'小怪防御+18%;首领防御+12%。', icon:'🛡️', mod:{trashDef:0.18, bossDef:0.12} },
  { key:'trialExecution', name:'处决号令', desc:'首领攻击+18%;战斗40秒后首领进入狂暴,额外攻击+35%。', icon:'⏱️', mod:{bossDmg:0.18, bossEnrage:true} },
  { key:'trialSpellbind', name:'咒缚首领', desc:'首领生命+18%,并周期性获得奥术吸收盾。', icon:'🔮', mod:{bossHp:0.18, arcane:true} },
  { key:'trialAshfall', name:'爆裂余烬', desc:'战斗中周期性受到火山伤害;击败怪物后触发崩裂。', icon:'🌋', mod:{volcanic:true, bursting:true} },
  { key:'trialWither', name:'衰败领域', desc:'你的治疗效果降低25%,并周期性承受暗影折磨。', icon:'💀', mod:{healReduction:0.25, afflicted:true} },
  { key:'trialBloodTax', name:'血税追猎', desc:'非首领怪物生命+22%,低生命时更容易暴怒。', icon:'🩸', mod:{trashHp:0.22, raging:true} },
  { key:'trialGale', name:'乱流禁区', desc:'你的攻击速度-10%,首领攻击+10%。', icon:'💨', mod:{heroSpd:-0.10, bossDmg:0.10} },
];

function getDungeonContractTrials(dg, contractLevel) {
  const level = Math.max(0, Math.min(3, Math.floor(contractLevel || 0)));
  if (!dg || level <= 0) return [];
  const count = Math.min(level, DUNGEON_CONTRACT_TRIALS.length);
  const day = Math.floor(Date.now() / 86400000);
  let seed = ((dg.reqLvl || 1) * 193 + level * 1543 + (day % 100000) * 787) % 2147483647;
  const key = dg.key || '';
  for (let i = 0; i < key.length; i++) seed = (seed * 37 + key.charCodeAt(i)) % 2147483647;
  seed = seed || 1;
  const pool = DUNGEON_CONTRACT_TRIALS.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count).map(t => ({ ...t, contractTrial:true }));
}

const DUNGEON_BOSS_PHASE_EVENTS = [
  { key:'phaseShield', name:'壁垒重构', icon:'🛡️', desc:'获得最大生命12%的护盾,并提高防御10秒。', mod:{shieldPct:0.12, defBuffSecs:10, defBuffPct:28} },
  { key:'phaseFrenzy', name:'血怒爆发', icon:'💢', desc:'提高攻击与攻速12秒。', mod:{atkBuffSecs:12, atkBuffPct:34, spdBuffSecs:12, spdBuffPct:24} },
  { key:'phaseGuard', name:'亲卫入场', icon:'🚩', desc:'召唤1名援军,并获得少量护盾。', mod:{summonCount:1, summonTheme:'soldier', shieldPct:0.06} },
  { key:'phaseDecay', name:'腐蚀领域', icon:'🌑', desc:'对你造成一次压迫伤害,并施加凋零。', mod:{phaseDamagePct:0.055, heroDebuff:'decay2', heroDebuffMs:6500} },
  { key:'phaseExecution', name:'处刑宣告', icon:'⚔️', desc:'使你短暂易伤,首领获得暴击强化。', mod:{heroDebuff:'vulnerable', heroDebuffMs:7000, critBuffSecs:10, critBuffPct:45} },
  { key:'phaseLeech', name:'暗血虹吸', icon:'🩸', desc:'首领短时间获得吸血,并燃烧你的资源。', mod:{leechBuffSecs:10, leechBuffPct:24, manaDrainPct:0.18} },
];

function getDungeonBossPhases(dg, bossName, contractLevel) {
  const level = Math.max(0, Math.min(3, Math.floor(contractLevel || 0)));
  if (!dg || !bossName || level <= 0) return [];
  const thresholdsByLevel = {
    1: [0.45],
    2: [0.65, 0.30],
    3: [0.75, 0.45, 0.18],
  };
  const thresholds = thresholdsByLevel[level] || [];
  if (!thresholds.length) return [];
  const day = Math.floor(Date.now() / 86400000);
  let seed = ((dg.reqLvl || 1) * 251 + level * 991 + (day % 100000) * 433) % 2147483647;
  const source = `${dg.key || ''}:${bossName}`;
  for (let i = 0; i < source.length; i++) seed = (seed * 41 + source.charCodeAt(i)) % 2147483647;
  seed = seed || 1;
  const pool = DUNGEON_BOSS_PHASE_EVENTS.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return thresholds.map((threshold, i) => {
    const event = pool[i % pool.length];
    return { ...event, threshold, phaseKey:`${event.key}:${Math.round(threshold * 100)}` };
  });
}

function setDungeonContractLevel(level) {
  if (state.mode !== 'world') { log('请先结束当前战斗再调整副本契约', 'bad'); return; }
  state.dungeonContractLevel = Math.max(0, Math.min(3, Math.floor(Number(level) || 0)));
  const info = dungeonContractInfo(state.dungeonContractLevel);
  log(`${info.icon} 副本契约调整为 [${info.name}]`, state.dungeonContractLevel ? 'legend' : 'info');
  markDirty('dungeon');
}

function dungeonContractRewardMult(ds) {
  const lvl = Math.max(0, Math.min(3, Math.floor(ds?.contractLevel || 0)));
  return dungeonContractInfo(lvl).reward || 1;
}

function dungeonAlertInfo(ds) {
  const contractLevel = Math.max(0, Math.min(3, Math.floor(ds?.contractLevel || 0)));
  const level = Math.max(0, Math.floor(ds?.alertLevel || 0));
  if (!contractLevel || !level) {
    return { level, hp:1, atk:1, def:1, haste:1, eliteChance:0, reward:1, label:'平静' };
  }
  const pressure = level * contractLevel;
  return {
    level,
    hp: 1 + Math.min(0.42, pressure * 0.018),
    atk: 1 + Math.min(0.55, pressure * 0.025),
    def: 1 + Math.min(0.30, pressure * 0.014),
    haste: 1 + Math.min(0.22, pressure * 0.010),
    eliteChance: Math.min(0.42, 0.05 + level * 0.025 + contractLevel * 0.045),
    reward: 1 + Math.min(0.30, pressure * 0.010),
    label: level >= 9 ? '封锁' : level >= 6 ? '戒严' : level >= 3 ? '警戒' : '搜寻',
  };
}

function advanceDungeonAlert(ds, defeatedBoss) {
  if (!ds || state.mode !== 'dungeon') return null;
  const contractLevel = Math.max(0, Math.min(3, Math.floor(ds.contractLevel || 0)));
  if (!contractLevel) return null;
  const gain = defeatedBoss ? 2 : 1;
  ds.alertLevel = Math.min(12, Math.max(0, Math.floor(ds.alertLevel || 0)) + gain);
  ds.maxAlert = Math.max(ds.maxAlert || 0, ds.alertLevel);
  const info = dungeonAlertInfo(ds);
  if (ds.alertLevel === gain || ds.alertLevel % 3 === 0 || defeatedBoss) {
    log(`🚨 副本警戒提升至 ${info.level} (${info.label}): 敌人生命/攻击/防御/速度提高,并可能派出精英守卫`, 'bad');
  }
  return info;
}

function grantDungeonContractChest(dg, ds) {
  const lvl = Math.max(0, Math.min(3, Math.floor(ds?.contractLevel || 0)));
  if (lvl <= 0) return '';
  const info = dungeonContractInfo(lvl);
  const tier = typeof dungeonBountyTier === 'function' ? dungeonBountyTier(dg) : 1;
  const gold = Math.floor((dg.reqLvl || 1) * (35 + lvl * 22) * (1 + tier * 0.12));
  const gem = Math.max(2, lvl * 3 + Math.floor((dg.reqLvl || 1) / 12));
  const essence = Math.max(2, lvl * 2 + Math.floor((dg.reqLvl || 1) / 22));
  state.gold += gold;
  state.gem += gem;
  if (typeof ensureMats === 'function') ensureMats();
  state.essence = (state.essence || 0) + essence;

  const itemLines = [];
  const lastBoss = (dg.bosses || [])[Math.max(0, (dg.bosses || []).length - 1)];
  const itemCount = lvl >= 3 ? 2 : 1;
  for (let i = 0; i < itemCount; i++) {
    const maxRarity = lvl >= 3 && tier >= 4 ? 'legend' : 'epic';
    const minRarity = lvl >= 2 ? 'epic' : 'rare';
    const power = ((typeof dg.powerLvl === 'number' && dg.powerLvl > 0) ? dg.powerLvl : dg.reqLvl) + lvl * 2;
    const it = typeof rollItem === 'function' ? rollItem(maxRarity, power, dg.key, lastBoss ? lastBoss.name : null, { minRarity }) : null;
    if (!it) continue;
    if (lvl >= 2) it.contractForged = true;
    addToInventory(it);
    if (ds?.loot) ds.loot.push(it);
    if (typeof eventsOnItemGet === 'function') eventsOnItemGet(it);
    if (it.rarity === 'legend' && typeof progressionOnLegendary === 'function') progressionOnLegendary();
    itemLines.push(`<div>🎁 契约装备 <span class="${it.cls}">${it.name}${typeof itemEpicRaidBadge==='function'?itemEpicRaidBadge(it,true):''}</span></div>`);
  }

  return `
    <div class="dungeon-contract-clear">
      <div style="font-weight:700">${info.icon} 契约宝箱: ${info.name}</div>
      <div>💰 金币 +${gold} · 💎 钻石 +${gem} · ✨ 精华 +${essence}</div>
      ${itemLines.join('')}
    </div>`;
}

const DUNGEON_BOUNTY_THEMES = [
  {key:'wanted', name:'悬赏首领', icon:'🎯', desc:'击败最终首领后领取额外战利品。'},
  {key:'purge', name:'清剿令', icon:'⚔️', desc:'本日目标副本,通关会追加军需奖励。'},
  {key:'archive', name:'秘藏线索', icon:'📜', desc:'副本深处发现秘藏线索,尾王会掉额外装备。'},
  {key:'expedition', name:'远征委托', icon:'🧭', desc:'远征队正在征集这座副本的通关记录。'},
  {key:'requisition', name:'军需征调', icon:'🏅', desc:'通关后获得金币、荣誉与强化材料。'},
  {key:'riftmark', name:'裂隙追踪', icon:'🌀', desc:'今天这座副本的魔力异常活跃。'},
];

function dungeonBountyResetAt(now) {
  const d = new Date(now || Date.now());
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

function dungeonBountyTier(dg) {
  if (!dg) return 1;
  if (dg.epicRaid) return 5;
  if (dg.type === 'raid') return 4;
  if (dg.epic5) return 3;
  if (dg.heroic) return 2;
  return 1;
}

function dungeonBountyRewardFor(dg) {
  const tier = dungeonBountyTier(dg);
  const lvl = Math.max(1, dg?.reqLvl || 1);
  return {
    gold: Math.floor(lvl * (70 + tier * 35)),
    gem: Math.max(3, Math.floor(lvl / 8) + tier * 4),
    honor: Math.floor(lvl * (6 + tier * 4)),
    essence: Math.max(2, Math.floor(lvl / 18) + tier * 2),
    minRarity: tier >= 2 ? 'epic' : 'rare',
    maxRarity: tier >= 4 ? 'legend' : 'epic',
  };
}

function ensureDungeonBounties(force) {
  if (!state.dungeonBounty) state.dungeonBounty = { resetAt:0, targets:[], claimed:{} };
  const now = Date.now();
  const valid = !force && state.dungeonBounty.resetAt > now && Array.isArray(state.dungeonBounty.targets);
  if (valid && state.dungeonBounty.targets.length) return state.dungeonBounty;

  const resetAt = dungeonBountyResetAt(now);
  const lvl = state.hero?.lvl || 1;
  const all = (typeof DUNGEONS !== 'undefined' ? DUNGEONS : [])
    .filter(dg => dg && lvl >= (dg.reqLvl || 1))
    .sort((a, b) => (b.reqLvl || 0) - (a.reqLvl || 0));
  if (!all.length) {
    state.dungeonBounty = { resetAt, targets:[], claimed:{} };
    return state.dungeonBounty;
  }
  const used = new Set();
  const picks = [];
  const addPick = list => {
    const pool = list.filter(dg => !used.has(dg.key));
    if (!pool.length) return;
    const near = pool.slice(0, Math.min(8, pool.length));
    const dg = near[rng(0, near.length - 1)];
    used.add(dg.key);
    picks.push(dg);
  };

  addPick(all.filter(dg => dg.type !== 'raid' && !dg.heroic && !dg.epic5 && !dg.epicRaid));
  addPick(all.filter(dg => dg.heroic || dg.epic5));
  addPick(all.filter(dg => dg.type === 'raid' && !dg.epicRaid));
  addPick(all.filter(dg => dg.epicRaid));
  while (picks.length < 4 && picks.length < all.length) addPick(all);

  const targets = picks.slice(0, 4).map((dg, idx) => {
    const theme = DUNGEON_BOUNTY_THEMES[(idx + rng(0, DUNGEON_BOUNTY_THEMES.length - 1)) % DUNGEON_BOUNTY_THEMES.length];
    return {
      id: `${resetAt}:${dg.key}`,
      key: dg.key,
      name: dg.name,
      themeKey: theme.key,
      themeName: theme.name,
      icon: theme.icon,
      desc: theme.desc,
      tier: dungeonBountyTier(dg),
      reward: dungeonBountyRewardFor(dg),
    };
  });

  state.dungeonBounty = { resetAt, targets, claimed:{} };
  return state.dungeonBounty;
}

function dungeonBountyTargetFor(dungeonKey) {
  const bounty = ensureDungeonBounties(false);
  if (!bounty || !Array.isArray(bounty.targets)) return null;
  const t = bounty.targets.find(x => x.key === dungeonKey);
  if (!t) return null;
  return Object.assign({ claimed: !!bounty.claimed?.[t.id] }, t);
}

function dungeonBountyRewardText(target) {
  if (!target?.reward) return '';
  const r = target.reward;
  return `💰${r.gold} · 💎${r.gem} · 🏅${r.honor} · ✨${r.essence} · 额外${r.minRarity === 'epic' ? '紫装' : '蓝装'}+`;
}

function grantDungeonBountyReward(dg, opts) {
  const target = dungeonBountyTargetFor(dg?.key);
  if (!target || target.claimed) return '';
  if (!state.dungeonBounty.claimed) state.dungeonBounty.claimed = {};
  state.dungeonBounty.claimed[target.id] = true;

  const mythicLevel = Math.max(0, opts?.mythicLevel || 0);
  const mult = mythicLevel ? (1 + Math.min(25, mythicLevel) * 0.04) : 1;
  const r = target.reward || dungeonBountyRewardFor(dg);
  const gold = Math.floor(r.gold * mult);
  const gem = Math.floor(r.gem * (mythicLevel ? 1.15 : 1));
  const honor = Math.floor(r.honor * mult);
  const essence = Math.floor(r.essence * (mythicLevel ? 1.25 : 1));
  state.gold += gold;
  state.gem += gem;
  state.honor += honor;
  if (typeof ensureMats === 'function') ensureMats();
  state.essence = (state.essence || 0) + essence;

  let itemHtml = '';
  const lastBoss = (dg.bosses || [])[Math.max(0, (dg.bosses || []).length - 1)];
  if (typeof rollItem === 'function') {
    const power = ((typeof dg.powerLvl === 'number' && dg.powerLvl > 0) ? dg.powerLvl : dg.reqLvl) + (mythicLevel ? 4 : 2);
    const it = rollItem(r.maxRarity || 'epic', power, dg.key, lastBoss ? lastBoss.name : null, { minRarity:r.minRarity || 'rare' });
    if (it) {
      addToInventory(it);
      if (opts?.loot) opts.loot.push(it);
      if (typeof eventsOnItemGet === 'function') eventsOnItemGet(it);
      if (it.rarity === 'legend' && typeof progressionOnLegendary === 'function') progressionOnLegendary();
      itemHtml = `<div>🎁 额外装备 <span class="${it.cls}">${it.name}${typeof itemEpicRaidBadge==='function'?itemEpicRaidBadge(it,true):''}</span></div>`;
    }
  }

  log(`${target.icon || '🎯'} 完成副本悬赏 [${target.name}]! 💰+${gold} 💎+${gem} ✨+${essence}`, 'legend');
  markDirty('dungeon', 'inventory', 'hero');
  return `
    <div class="dungeon-bounty-clear">
      <div style="font-weight:700">${target.icon || '🎯'} 副本悬赏完成: ${target.themeName || '悬赏'}</div>
      <div>💰 金币 +${gold} · 💎 钻石 +${gem} · 🏅 荣誉 +${honor} · ✨ 精华 +${essence}</div>
      ${itemHtml}
    </div>`;
}

function onDungeonClear(dg) {
  const dungeonStateSnapshot = state.dungeonState || {};
  const masteryHtml = (typeof progressionOnDungeonClear === 'function') ? (progressionOnDungeonClear(dg.key, { contractLevel:dungeonStateSnapshot.contractLevel || 0 }) || '') : '';
  if (typeof eventsOnDungeonClear === 'function') eventsOnDungeonClear();
  if (typeof relicOnDungeonClear === 'function') relicOnDungeonClear(dg);   // 神器遗物掉落
  if (typeof vaultAdvance === 'function') vaultAdvance('dungeon', 1);       // 每周宝库·探险
  state.dungeonCd[dg.key] = Date.now() + dg.cd * 1000;
  const lastBoss = (dg.bosses||[])[dg.bosses.length-1];
  const finalBossName = lastBoss ? lastBoss.name : '最终首领';

  // 词缀加成:越多词缀通关奖励越高(呼应"越难越值")
  const affixes = (dungeonStateSnapshot && dungeonStateSnapshot.affixes) || [];
  const contractMult = dungeonContractRewardMult(dungeonStateSnapshot);
  const affixMult = (1 + affixes.length * 0.15) * contractMult;

  // 额外通关奖励(小幅上调 + 词缀加成)
  const bonusGold = Math.floor(dg.reqLvl * 60 * affixMult);
  const bonusGem = Math.floor((rng(5, 15) + Math.floor(dg.reqLvl/5)) * affixMult);
  const bonusHonor = Math.floor(dg.reqLvl * 12 * affixMult);
  state.gold += bonusGold;
  state.gem += bonusGem;
  state.honor += bonusHonor;

  // 首通奖励(每角色每本一次性):保底高品装 + 钻石/精华,作为进度目标与收益提升
  if (!state.dungeonFirstClear) state.dungeonFirstClear = {};
  const firstClear = !state.dungeonFirstClear[dg.key];
  let firstClearHtml = '';
  if (firstClear) {
    state.dungeonFirstClear[dg.key] = true;
    const fcGem = 20 + dg.reqLvl;
    const fcEssence = Math.max(3, Math.floor(dg.reqLvl / 6));
    let fcItem = null, fcLegend = null;
    if (typeof rollItemOfRarity === 'function') {
      // 首通保底紫装(橙装很稀有,不保底);团本/80级首通有小概率额外掉橙
      fcItem = rollItemOfRarity('epic', dg.reqLvl);
      addToInventory(fcItem); if (typeof eventsOnItemGet === 'function') eventsOnItemGet(fcItem);
      if ((dg.type === 'raid' || dg.reqLvl >= 70) && Math.random() < 0.12) {
        fcLegend = rollItemOfRarity('legend', dg.reqLvl);
        addToInventory(fcLegend); if (typeof eventsOnItemGet === 'function') eventsOnItemGet(fcLegend);
        if (typeof progressionOnLegendary === 'function') progressionOnLegendary();
      }
    }
    state.gem += fcGem;
    if (typeof ensureMats === 'function') ensureMats();
    state.essence = (state.essence || 0) + fcEssence;
    firstClearHtml = `
      <div style="margin-top:10px;padding:8px;border:1px solid #f6c453;border-radius:6px;background:rgba(246,196,83,0.08)">
        <div style="color:#f6c453;font-weight:bold">🎉 首次通关奖励</div>
        ${fcItem ? `<div style="font-size:12px">　保底紫装 <span class="${fcItem.cls}">${fcItem.name}</span></div>` : ''}
        ${fcLegend ? `<div style="font-size:12px">　🎉 幸运橙装 <span class="${fcLegend.cls}">${fcLegend.name}</span></div>` : ''}
        <div style="font-size:12px">　💎 钻石 +${fcGem} · ✨ 精华 +${fcEssence}</div>
      </div>`;
    log(`🎉 首次通关 ${dg.name}! 获得首通奖励`, 'legend');
  }

  // 全程掉落:每个BOSS击杀时已各掉 1 件其专属池装备(combat.js 里 dungeon BOSS 必掉),这里不再额外补掉落
  const allLoot = (dungeonStateSnapshot?.loot || []).slice();
  // 去重(id重复的去掉)
  const seen = new Set();
  const uniqueLoot = allLoot.filter(it => { const k = it.id; if (seen.has(k)) return false; seen.add(k); return true; });

  const lootHtml = uniqueLoot.length > 0
    ? uniqueLoot.map(it => `<div style="font-size:11px">　<span class="${it.cls}">${it.name}${typeof itemEpicRaidBadge==='function'?itemEpicRaidBadge(it,true):''}</span></div>`).join('')
    : '<div class="muted">　无</div>';

  const affixHtml = affixes.length
    ? `<div class="muted" style="font-size:12px">本次词缀: ${affixes.map(a => (a.icon||'') + a.name).join(' · ')}</div>`
    : '';
  const contractInfo = dungeonContractInfo(dungeonStateSnapshot?.contractLevel || 0);
  const contractHtml = dungeonStateSnapshot?.contractLevel > 0
    ? `<div class="muted" style="font-size:12px">${contractInfo.icon} 契约: ${contractInfo.name} · 通关奖励 ×${contractInfo.reward.toFixed(2)} · 最高警戒 ${dungeonStateSnapshot.maxAlert || dungeonStateSnapshot.alertLevel || 0} · 首领阶段 ${dungeonStateSnapshot.bossPhasesTriggered || 0} · 环境触发 ${dungeonStateSnapshot.environmentHits || 0}</div>`
    : '';
  const contractChestHtml = grantDungeonContractChest(dg, dungeonStateSnapshot);
  const bountyHtml = grantDungeonBountyReward(dg, { loot:uniqueLoot });
  $('dungeon-clear-text').innerHTML = `
    <div style="font-size:18px;margin:8px 0">🏆 ${dg.name} 通关!</div>
    <div class="muted">击败了 ${finalBossName} 等 ${(dg.bosses||[]).length} 名首领</div>
    ${affixHtml}
    ${contractHtml}
    <div style="margin:10px 0;text-align:left;font-size:13px">
      <div>💰 金币 +${bonusGold}</div>
      <div>💎 钻石 +${bonusGem}</div>
      <div>🏅 荣誉 +${bonusHonor}</div>
      <div style="margin-top:6px">🎁 本次副本掉落 (${uniqueLoot.length}件):</div>
      ${lootHtml}
    </div>
    ${firstClearHtml}
    ${masteryHtml}
    ${contractChestHtml}
    ${bountyHtml}
  `;
  $('modal-dungeon-clear').classList.add('show');
  log(`🏆 通关 ${dg.name}! 获得 ${uniqueLoot.length} 件装备`, 'legend');
  leaveDungeon();
}

function showDungeonFail() {
  const ds = state.dungeonState;
  if (!ds) return;
  const dg = DUNGEONS.find(d => d.key === ds.key);
  if (!dg) return;
  const allLoot = ds.loot || [];
  const lootHtml = allLoot.length > 0
    ? allLoot.map(it => `<div style="font-size:11px">　<span class="${it.cls}">${it.name}${typeof itemEpicRaidBadge==='function'?itemEpicRaidBadge(it,true):''}</span></div>`).join('')
    : '<div class="muted">　无</div>';
  $('dungeon-fail-text').innerHTML = `
    <div style="font-size:18px;margin:8px 0">💀 ${dg.name} 挑战失败</div>
    <div class="muted">击败了 ${allLoot.length > 0 ? '部分' : '0名'}首领，已获得:</div>
    <div style="margin:10px 0;text-align:left;font-size:13px">
      ${lootHtml}
    </div>
    <div class="muted" style="margin-top:8px">已获取的装备保留, 返回主城修整后再战!</div>
  `;
  $('modal-dungeon-fail').classList.add('show');
  // 失败也计算CD,防止无限刷前几波BOSS
  if (!state.dungeonCd) state.dungeonCd = {};
  state.dungeonCd[dg.key] = Date.now() + (dg.cd || 600) * 1000;
  log(`💀 副本失败，保留了 ${allLoot.length} 件装备 (冷却已启动)`, 'bad');
  leaveDungeon();
}

/* ---------- 天赋 ---------- */
function buyTalent(treeKey, talentKey) {
  const c = getCls();
  // 专精锁定: 必须先选专精, 且只能点所选专精树
  if (!state.specialization) { log('请先在天赋面板选择一个专精', 'bad'); return; }
  if (treeKey !== state.specialization) { log('只能为当前专精树加点,切换专精可重新分配', 'bad'); return; }
  const tree = c.trees.find(t => t.key === treeKey);
  const t = tree.talents.find(x => x.key === talentKey);
  if (state.talentPoints <= 0) { log('天赋点不足', 'bad'); return; }
  if (!state.talents[treeKey]) state.talents[treeKey] = {};
  const cur = state.talents[treeKey][talentKey] || 0;
  if (cur >= t.max) return;
  if (t.req) {
    const sumInTree = Object.values(state.talents[treeKey]).reduce((a,b)=>a+b, 0);
    if (sumInTree < t.req) { log(`需要在此天赋树投入 ${t.req} 点`, 'bad'); return; }
  }
  state.talents[treeKey][talentKey] = cur + 1;
  state.talentPoints -= 1;
  if (t.unlockSkill && state.talents[treeKey][talentKey] === t.max) {
    state.unlockedSkills[t.unlockSkill] = true;
    log(`✨ 解锁技能 [${c.skills[t.unlockSkill].name}]`, 'good');
    markDirty('skills');
  }
  recomputeStats();
  markDirty('talents', 'hero');
}

function resetTalents() {
  const free = !state.freeRespecUsed;
  if (!free && state.gem < 50) { log('钻石不足', 'bad'); return; }
  if (!confirm(free ? '首次洗点免费,确定重置所有天赋?' : '花费 50💎 重置所有天赋?')) return;
  if (free) state.freeRespecUsed = true; else state.gem -= 50;
  let refunded = 0;
  const c = getCls();
  for (const [treeKey, tals] of Object.entries(state.talents)) {
    for (const [tKey, rank] of Object.entries(tals)) {
      refunded += rank;
      const tree = c.trees.find(t => t.key === treeKey);
      const t = tree.talents.find(x => x.key === tKey);
      if (t && t.unlockSkill) {
        const sk = c.skills[t.unlockSkill];
        if (!sk.unlockLvl) {
          delete state.unlockedSkills[t.unlockSkill];
          state.selectedSkills = state.selectedSkills.filter(s => s !== t.unlockSkill);
        }
      }
    }
  }
  state.talents = {};
  state.talentPoints += refunded;
  recomputeStats();
  markDirty('talents', 'skills', 'hero');
  log(`♻️ 重置天赋,返还 ${refunded} 点`, 'good');
}

/* ---------- 离线收益 ---------- */
function applyOfflineProgress() {
  if (!state.cls) return;
  const now = Date.now();
  // 先完成旅行
  if (state.mode === 'travel' && state.travel) {
    const travelElapsed = now - state.travel.startTime;
    if (travelElapsed >= state.travel.duration) {
      state.mode = 'world';
      state.currentMap = state.travel.mapKey;
      state.currentSubzone = state.travel.subIdx;
      state.travel = null;
    }
  }
  if (state.mode === 'travel') return;
  // 副本/BOSS/世界BOSS 模式不结算离线野外收益(且重置回 world 防止卡死)
  if (state.mode === 'dungeon' || state.mode === 'boss' || state.mode === 'worldboss' || state.mode === 'mythic' || state.mode === 'tower' || state.mode === 'roguelike') {
    state.mode = 'world';
    state.dungeonState = null;
    state.mythicState = null;
    state.towerState = null;
    state._currentWBoss = null;
    state.currentMonsters = [];
  }
  let dt = Math.floor((now - (state.lastTick || now)) / 1000);
  if (dt < 30) return;
  dt = Math.min(dt, 8 * 3600);

  const map = getMap(); if (!map) return;
  const sub = map.sub[state.currentSubzone] || map.sub[0];
  const avgLvl = (sub.lvl[0] + sub.lvl[1]) / 2;
  const monHpAvg = Math.max(10, 100 + avgLvl*avgLvl*6.0);
  const dps = state.hero.atk * state.hero.spd * (1 + state.hero.crit/100 * (state.hero.critd/100 - 1));
  const ttk = Math.max(0.6, monHpAvg / Math.max(1, dps));
  const kills = Math.floor(dt / ttk * 0.7);
  const goldPerKill = Math.floor(3 + avgLvl*1.0);
  const baseXpPerKill = Math.floor(18 + avgLvl*3.0);
  const lvlDiff = state.hero.lvl - avgLvl;
  let xpMult = 1.0;
  if (lvlDiff >= 10) xpMult = 0;
  else if (lvlDiff >= 7) xpMult = 0.2;
  else if (lvlDiff >= 4) xpMult = 0.5;
  const xpPerKill = Math.floor(baseXpPerKill * xpMult);
  const gold = kills * goldPerKill;
  const xp = kills * xpPerKill;
  const drops = Math.floor(kills * 0.18);

  state.gold += gold;
  if (typeof progressionOnGoldGain === 'function') progressionOnGoldGain(gold);
  if (xp > 0) gainXP(xp);
  if (typeof progressionCheckAch === 'function') progressionCheckAch();
  let dropList = [];
  for (let i=0; i<Math.min(drops, 8); i++) {
    const it = rollItem('uncommon', Math.floor(avgLvl));
    if (state.inventory.length < (typeof invCap === 'function' ? invCap() : 60)) { state.inventory.push(it); dropList.push(it); }
    else state.gold += it.sell;
  }
  showOfflineModal(dt, kills, gold, xp, dropList);
}

function showOfflineModal(dt, kills, gold, xp, drops) {
  const h = Math.floor(dt/3600), m = Math.floor((dt%3600)/60), s = dt%60;
  $('offline-text').textContent = `离开了 ${h>0?h+'小时':''}${m}分${s}秒`;
  // 远征军团离线产出(惰性结算后读储备池)
  let expLine = '';
  if (typeof expeditionAdvance === 'function') {
    expeditionAdvance(Date.now());
    const e = account && account.expedition;
    if (e && e.acc) {
      const eg = Math.floor(e.acc.gold || 0), ee = Math.floor(e.acc.essence || 0), em = Math.floor(e.acc.gem || 0);
      if (eg + ee + em > 0) {
        expLine = `<div style="margin-top:8px;border-top:1px dashed var(--border);padding-top:6px">🚩 远征军团已攒下 <b>${fmt(eg)}</b>💰 <b>${ee}</b>🔮 <b>${em}</b>💎 <span class="muted" style="font-size:11px">(到远征页领取)</span></div>`;
      }
    }
  }
  $('offline-loot').innerHTML = `
    <div>⚔️ 击杀 <b>${kills}</b> 只</div>
    <div>💰 +${gold} 金币</div>
    <div>✨ +${xp} 经验</div>
    <div>🎁 ${drops.length} 件装备</div>
    ${drops.slice(0,5).map(it => `<div style="font-size:11px">　<span class="${it.cls}">${it.name}${typeof itemEpicRaidBadge==='function'?itemEpicRaidBadge(it,true):''}</span></div>`).join('')}
    ${expLine}
  `;
  $('modal-offline').classList.add('show');
}

function showLevelUp() {
  const c = getCls();
  $('levelup-text').innerHTML = `
    <div style="font-size:32px">等级${state.hero.lvl}</div>
    <div class="muted" style="margin-top:6px">+5 属性点 · +1 天赋点</div>
    <div class="muted">职业: ${c.name}</div>
  `;
  $('modal-levelup').classList.add('show');
  log(`🎉 升到 等级${state.hero.lvl}!`, 'good');
}

/* ---------- 大秘境 ---------- */
function getLv80Dungeons() {
  return DUNGEONS.filter(d => d.reqLvl >= 80 && !d.epicRaid);
}

/* 大秘境专属传说装备(仅层数奖励获得) */
const MYTHIC_UNIQUE_ITEMS = [
  { name:'秘境征服者之冠', slot:'helmet',  stats:{atkPct:80,hpPct:60,vers:20,crit:10,strPct:15,agiPct:15} },
  { name:'层数突破者之刃', slot:'weapon',  stats:{atkPct:120,critdPct:80,crit:15,spdPct:25,extraAtk:15} },
  { name:'不朽者的壁垒',   slot:'armor',   stats:{defPct:80,hpPct:80,reflectDmg:25,staPct:40,regFlat:20} },
  { name:'光辉追猎者护符', slot:'shoulder',stats:{atkPct:60,spdPct:40,leech:20,mastery:25,critdPct:40} },
  { name:'深渊征服者指环', slot:'ring',    stats:{atkPct:50,critdPct:50,mastery:30,leech:15,vers:15} },
  { name:'秘境行者斗篷',   slot:'belt',    stats:{hpPct:60,defPct:60,vers:20,spdPct:20,strPct:10,agiPct:10} },
  { name:'永恒光辉之握',   slot:'gloves',  stats:{defPct:50,hpPct:50,staPct:40,reflectDmg:15,crit:10} },
  { name:'层数主宰战靴',   slot:'boots',   stats:{spdPct:50,agiPct:40,vers:15,mastery:15,hpPct:30} },
  { name:'秘境圣物',       slot:'trinket', stats:{atkPct:60,critdPct:60,mastery:25,leech:15,extraAtk:10} },
  { name:'大秘之证',       slot:'pants',   stats:{hpPct:60,defPct:50,vers:20,spdPct:15,regFlat:15} },
];

function makeMythicUnique(power) {
  const tpl = choice(MYTHIC_UNIQUE_ITEMS);
  const rarity = RARITY.find(r => r.key === 'legend');
  const id = itemIdSeq++;
  const scale = 1 + power * 0.05;
  const item = {
    id, slot: tpl.slot, name: tpl.name, rarity: 'legend', rarityName: '传说',
    cls: rarity.cls, bcls: rarity.bcls, stats: {}, sell: 5000, mythicUnique: true
  };
  for (const [k, v] of Object.entries(tpl.stats)) {
    item.stats[k] = Math.floor(v * scale);
  }
  // 必定3个T3词缀(最高级,不重复)
  const affixPool = [...AFFIX_POOL];
  item.affixes = [];
  for (let i = 0; i < 3 && affixPool.length > 0; i++) {
    const idx = rng(0, affixPool.length - 1);
    const ax = affixPool.splice(idx, 1)[0];
    const [lo, hi] = ax.tierVals[2];
    item.affixes.push({ key: ax.key, tier: 3, value: +(lo + Math.random()*(hi-lo)).toFixed(1), rerolls: 0 });
  }
  // 必定3个宝石孔
  item.sockets = [];
  for (let i = 0; i < 3; i++) {
    item.sockets.push({ color: choice(SOCKET_COLORS), gem: null });
  }
  return item;
}

/* 大秘境词缀 */
const MYTHIC_AFFIXES = [
  { key:'fortified',  name:'强韧',     desc:'非首领怪物生命+40%',               icon:'🛡️', mod:{trashHp:0.4} },
  { key:'tyrannical', name:'残暴',     desc:'首领生命+30% 伤害+25%',           icon:'👹', mod:{bossHp:0.3, bossDmg:0.25} },
  { key:'bursting',   name:'崩裂',     desc:'击败怪物后对你造成当前生命5%伤害',    icon:'💥', mod:{bursting:true} },
  { key:'sanguine',   name:'血池',     desc:'怪物死亡留下血池,每秒治疗其他怪物3%HP', icon:'🩸', mod:{sanguine:true} },
  { key:'raging',     name:'暴怒',     desc:'怪物HP低于30%时伤害+50%',           icon:'😡', mod:{raging:true} },
  { key:'heArtless',  name:'无心',     desc:'你的治疗效果降低50%',               icon:'💔', mod:{healReduction:0.5} },
  { key:'arcane',     name:'奥术',     desc:'首领每15秒获得一个吸收盾(15%生命)',   icon:'🔮', mod:{arcane:true} },
  { key:'volcanic',   name:'火山',     desc:'战斗中每8秒受到一次火山伤害',         icon:'🌋', mod:{volcanic:true} },
  { key:'ragingWinds',name:'暴风',     desc:'你的攻击速度-15%',                 icon:'💨', mod:{heroSpd:-0.15} },
  { key:'afflicted',  name:'折磨',     desc:'战斗中每5秒受到5%最大HP暗影伤害',     icon:'😈', mod:{afflicted:true} },
];

function getMythicAffixCount(level) {
  if (level <= 1) return 1;
  if (level <= 3) return 2;
  if (level <= 6) return 3;
  if (level <= 10) return 4;
  return Math.min(5, 2 + Math.floor(level / 3));
}

function getMythicAffixes(level) {
  const count = getMythicAffixCount(level);
  const pool = [...MYTHIC_AFFIXES];
  let seed = level * 127 + 31;
  for (let i = pool.length - 1; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

/* 普通副本词缀:按 dungeon key 确定性挑选(每本稳定可识别,不每次随机)。
   低档过滤掉纯惩罚、无对抗手段的词缀;数量随等级/类型递增。复用 MYTHIC_AFFIXES 池与执行机制。 */
function getDungeonAffixes(dg) {
  if (!dg || typeof MYTHIC_AFFIXES === 'undefined') return [];
  const reqLvl = dg.reqLvl || 12;
  const count = reqLvl < 35 ? 1 : (dg.type === 'raid' || reqLvl >= 70) ? 3 : 2;
  let pool = MYTHIC_AFFIXES.slice();
  if (reqLvl < 50) pool = pool.filter(a => !['heArtless', 'ragingWinds'].includes(a.key));
  // 种子 = 当天 + 副本key:每本副本词缀按天刷新(同一天稳定,跨天重洗,避免老是那几个)
  const day = Math.floor(Date.now() / 86400000);
  let seed = (reqLvl * 97 + 13 + (day % 100000) * 1009) % 2147483647;
  const k = dg.key || '';
  for (let i = 0; i < k.length; i++) seed = (seed * 31 + k.charCodeAt(i)) % 2147483647;
  seed = seed || 1;
  for (let i = pool.length - 1; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

/* 大秘境层数阶梯奖励 */
const MYTHIC_TIER_REWARDS = {
  5:  { name:'初窥门径', desc:'大秘境专属传说装备×1',              mod:{uniqueLegend:1} },
  10: { name:'秘境行者', desc:'钻石+50 · 精华+30',                mod:{gem:50, essence:30} },
  15: { name:'大师试炼', desc:'专属传说×2 · 大秘境光辉+1',          mod:{uniqueLegend:2, extraAscend:1} },
  20: { name:'传奇征服', desc:'钻石+100 · 大秘境光辉+2',           mod:{gem:100, extraAscend:2} },
  25: { name:'不朽神话', desc:'专属传说×3 · 大秘境光辉+3',          mod:{uniqueLegend:3, extraAscend:3} },
  30: { name:'诸界毁灭', desc:'钻石+200 · 精华+100 · 大秘境光辉+5', mod:{gem:200, essence:100, extraAscend:5} },
};

/* 层数选择 */
function setMythicSelectLevel(lvl) {
  state.mythicSelectLevel = Math.max(1, Math.min(lvl, state.mythicLevel || 1));
  markDirty('ascend');
}
function changeMythicSelectLevel(delta) {
  setMythicSelectLevel((state.mythicSelectLevel || 1) + delta);
}

function resetMythicTiers() {
  if (!confirm('确定重置大秘境层数奖励领取记录? 重置后重新挑战对应层数即可再次领取。')) return;
  state.mythicTiersClaimed = {};
  state.mythicPendingUnique = {};
  log('🔄 大秘境层数奖励记录已重置', 'info');
  markDirty('ascend');
}

function claimMythicUnique(level) {
  state.mythicPendingUnique = state.mythicPendingUnique || {};
  const count = state.mythicPendingUnique[level] || 0;
  if (count <= 0) { log('没有待领取的专属传说', 'bad'); return; }
  if (state.hero.lvl < 80) { log('需要达到80级才能使用专属传说', 'bad'); return; }
  const power = 85; // lv80+5
  let claimed = 0;
  for (let i = 0; i < count; i++) {
    const uit = makeMythicUnique(power);
    if (uit) {
      addToInventory(uit);
      log(`🌟 领取大秘境专属传说: ${uit.name}`, 'legend');
      if (typeof eventsOnItemGet === 'function') eventsOnItemGet(uit);
      if (typeof progressionOnLegendary === 'function') progressionOnLegendary();
      claimed++;
    }
  }
  state.mythicPendingUnique[level] = 0;
  if (claimed > 0) {
    log(`🎁 成功领取 ${claimed} 件大秘境专属传说!`, 'loot');
    markDirty('inventory', 'ascend');
  }
}

function showAffixTip(e, name, desc) {
  const tip = $('compare-tip');
  tip.querySelector('.compare-head').innerHTML = `<b>${name}</b>`;
  tip.querySelector('.compare-body').innerHTML = desc;
  tip.style.display = 'block';
  positionTip(tip, e);
}
function hideAffixTip() {
  if (typeof _tipPinned !== 'undefined' && _tipPinned) return;
  $('compare-tip').style.display = 'none';
}

function enterMythic() {
  if (state.hero.lvl < 80) { log('需要达到80级才能进入大秘境', 'bad'); return; }
  if (state.mode === 'travel') { log('正在旅行中', 'bad'); return; }
  if (state.mode !== 'world') { log('请先结束当前战斗', 'bad'); return; }
  if (state.tickets < 1) { log('通用券不足', 'bad'); return; }
  const pool = getLv80Dungeons();
  if (pool.length === 0) { log('没有80级副本', 'bad'); return; }
  state.tickets -= 1;
  const dg = pool[rng(0, pool.length - 1)];
  const selLvl = state.mythicSelectLevel || 1;
  const scale = Math.pow(1.2, selLvl);
  const affixes = getMythicAffixes(selLvl);
  state.mode = 'mythic';
  state.mythicState = { key: dg.key, wave: 1, loot: [], scale, level: selLvl, affixes,
    lastVolcanic: 0, lastAfflicted: 0, lastArcane: 0 };
  state.hp = state.hero.hpMax;
  state.resource = state.resourceMax;
  if (typeof resetDmgStats === 'function') resetDmgStats();
  if (typeof clearAllBuffs === 'function') clearAllBuffs();
  spawnDungeonMonster();
  const affixStr = affixes.map(a => a.icon + a.name).join(' ');
  log(`🌟 进入大秘境 +${selLvl} [${dg.name}] (×${scale.toFixed(1)}) 词缀: ${affixStr}`, 'legend');
  markDirty('ascend', 'stage');
}

function leaveMythic() {
  state.mode = 'world';
  state.mythicState = null;
  spawnMonster();
  markDirty('ascend', 'stage');
}

function onMythicBossKill() {
  const ms = state.mythicState;
  if (!ms) return;
  const dg = DUNGEONS.find(d => d.key === ms.key);
  if (!dg) return;
  const mythicLvl = ms.level || state.mythicLevel || 1;
  const bossList = dg.bosses || [];
  const currentBoss = bossList.find(b => b.wave === ms.wave);
  const bossIdx = bossList.findIndex(b => b.wave === ms.wave);
  const isLastBoss = bossIdx === bossList.length - 1;

  // 精华
  const essence = rng(2 + mythicLvl, 5 + mythicLvl * 2);
  if (typeof ensureMats === 'function') ensureMats();
  state.essence += essence;

  // 宝石
  const gemTier = mythicLvl >= 15 ? 3 : mythicLvl >= 8 ? 2 : 1;
  const gemKey = choice(SOCKET_COLORS) + '_t' + gemTier;
  state.gems[gemKey] = (state.gems[gemKey] || 0) + 1;

  // 装备(尾王保底传说)
  const bossRarity = isLastBoss ? 'legend' : (bossIdx >= Math.floor(bossList.length / 2) ? 'epic' : 'rare');
  const power = ((typeof dg.powerLvl === 'number' && dg.powerLvl > 0) ? dg.powerLvl : dg.reqLvl) + 3;
  const it = rollItem(bossRarity, power, dg.key, currentBoss ? currentBoss.name : null);
  if (it) {
    ms.loot.push(it);
    addToInventory(it);
    if (typeof eventsOnItemGet === 'function') eventsOnItemGet(it);
    if (it.rarity === 'legend' && typeof progressionOnLegendary === 'function') progressionOnLegendary();
  }

  // 金币
  const gold = dg.reqLvl * (20 + mythicLvl * 5);
  state.gold += gold;
  if (typeof progressionOnGoldGain === 'function') progressionOnGoldGain(gold);

  const bossName = currentBoss ? currentBoss.emoji + currentBoss.name : '首领';
  log(`👑 击败 ${bossName}! ✨+${essence} 💎+1 💰+${gold}`, 'legend');
}

function onMythicClear() {
  const ms = state.mythicState;
  if (!ms) return;
  const dg = DUNGEONS.find(d => d.key === ms.key);
  if (!dg) return;
  const clearedLevel = ms.level || state.mythicLevel || 1;
  if (typeof questAdvance === 'function') questAdvance('mythic', 1);
  if (typeof vaultAdvance === 'function') vaultAdvance('mythic', 1);   // 每周宝库·险境
  if (typeof relicOnMythicClear === 'function') relicOnMythicClear(clearedLevel);
  if (typeof mountOnMythicClear === 'function') mountOnMythicClear(clearedLevel);   // 大秘境坐骑
  const masteryHtml = (typeof progressionOnDungeonMasteryClear === 'function')
    ? (progressionOnDungeonMasteryClear(dg.key, { mythicLevel:clearedLevel }) || '')
    : '';
  state.pendingMythicAscend = (state.pendingMythicAscend || 0) + 1;
  let pending = state.pendingMythicAscend;

  // 阶梯奖励
  let tierHtml = '';
  const tierReward = MYTHIC_TIER_REWARDS[clearedLevel];
  if (tierReward && !state.mythicTiersClaimed[clearedLevel]) {
    const r = tierReward;
    if (r.gem) state.gem += r.gem;
    if (r.essence) { if (typeof ensureMats === 'function') ensureMats(); state.essence += r.essence; }
    if (r.extraAscend) { state.pendingMythicAscend += r.extraAscend; pending = state.pendingMythicAscend; }
    if (r.uniqueLegend) {
      state.mythicPendingUnique = state.mythicPendingUnique || {};
      state.mythicPendingUnique[clearedLevel] = (state.mythicPendingUnique[clearedLevel] || 0) + r.uniqueLegend;
    }
    state.mythicTiersClaimed[clearedLevel] = true;
    tierHtml = `<div style="margin-top:8px;padding:8px;background:rgba(251,191,36,0.12);border:1px solid var(--gold);border-radius:6px">
      <div style="color:var(--gold);font-weight:bold">🏆 层数奖励: ${r.name}</div>
      <div style="font-size:12px">${r.desc}${r.uniqueLegend ? ' · <b style="color:var(--accent)">请在面板手动领取专属传说</b>' : ''}</div></div>`;
    log(`🏆 大秘境层数奖励: ${r.name}! ${r.desc}`, 'legend');
  }

  // 仅在通关层数 >= 最高纪录时推进
  if (clearedLevel >= (state.mythicLevel || 1)) {
    state.mythicLevel = clearedLevel + 1;
    state.mythicSelectLevel = state.mythicLevel;
  }

  const allLoot = ms.loot || [];
  const seen = new Set();
  const uniqueLoot = allLoot.filter(it => { const k = it.id; if (seen.has(k)) return false; seen.add(k); return true; });
  const lootHtml = uniqueLoot.length > 0
    ? uniqueLoot.map(it => `<div style="font-size:11px">　<span class="${it.cls}">${it.name}${typeof itemEpicRaidBadge==='function'?itemEpicRaidBadge(it,true):''}${it.mythicUnique?' 🌟':''}</span></div>`).join('')
    : '<div class="muted">　无</div>';

  const gemReward = rng(10, 25);
  const bountyHtml = grantDungeonBountyReward(dg, { mythicLevel:clearedLevel, loot:uniqueLoot });
  $('dungeon-clear-text').innerHTML = `
    <div style="font-size:18px;margin:8px 0">🌟 大秘境 +${clearedLevel} 通关!</div>
    <div class="muted">随机副本: ${dg.name} · 怪物属性 ×${ms.scale.toFixed(1)}</div>
    <div style="margin:10px 0;text-align:left;font-size:13px">
      <div>🌟 大秘境光辉 +1 (觉醒时获得, 当前累积: ${pending})</div>
      <div>💰 金币 +${dg.reqLvl*80}</div>
      <div>💎 钻石 +${gemReward}</div>
      ${tierHtml}
      <div style="margin-top:6px">🎁 掉落 (${uniqueLoot.length}件):</div>
      ${lootHtml}
      ${masteryHtml}
      ${bountyHtml}
    </div>
  `;
  state.gold += dg.reqLvl * 80;
  state.gem += gemReward;
  $('modal-dungeon-clear').classList.add('show');
  log(`🌟 大秘境 +${clearedLevel} 通关! 光辉+1 (累积: ${pending})`, 'legend');
  state.mode = 'world';
  state.mythicState = null;
  markDirty('ascend');
  spawnMonster();
}

function onMythicFail() {
  const ms = state.mythicState;
  if (!ms) return;
  const failLevel = ms.level || state.mythicLevel || 1;
  const allLoot = ms.loot || [];
  const lootHtml = allLoot.length > 0
    ? allLoot.map(it => `<div style="font-size:11px">　<span class="${it.cls}">${it.name}${typeof itemEpicRaidBadge==='function'?itemEpicRaidBadge(it,true):''}</span></div>`).join('')
    : '<div class="muted">　无</div>';
  $('dungeon-fail-text').innerHTML = `
    <div style="font-size:18px;margin:8px 0">💀 大秘境 +${failLevel} 失败</div>
    <div style="margin:10px 0;text-align:left;font-size:13px">
      <div class="muted">已获得装备保留, 可重新挑战</div>
      ${lootHtml}
    </div>
  `;
  $('modal-dungeon-fail').classList.add('show');
  log(`💀 大秘境 +${failLevel} 失败, 保留了 ${allLoot.length} 件装备`, 'bad');
  state.mode = 'world';
  state.mythicState = null;
  markDirty('ascend');
}
