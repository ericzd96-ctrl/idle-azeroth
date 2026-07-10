/* karesh_expedition.js - K'aresh Endgame Expedition Board */
const KARESH_EXPEDITION_BANNER = 'assets/wow/art/karesh-expedition-banner.png';
const KARESH_EXPEDITION_WEEKLY_GOAL = 5;
const KARESH_EXPEDITION_CACHE_COST = 10;
const KARESH_EXPEDITION_DELVES = ['archival_assault', 'overlook_zoshul', 'primeus_repository'];
const KARESH_EXPEDITION_STRIKES = ['ecodome_aldani', 'oasis_succession', 'ecodome_rhovan', 'shadowpoint_breach'];
const KARESH_EXPEDITION_RAIDS = ['manaforge_omega', 'shandorah_conclave', 'voidrazor_sanctum'];
const KARESH_EXPEDITION_WORLD_BOSSES = ['reshanor', 'shadowpoint_vexis', 'shandorah_astromancer'];
const KARESH_EXPEDITION_ACTIVITY_MAPS = new Set(['karesh', 'rhovan', 'shadow_point', 'shandorah', 'primeus', 'voidrazor']);
const KARESH_EXPEDITION_DUNGEONS = new Set([
  ...KARESH_EXPEDITION_DELVES,
  ...KARESH_EXPEDITION_STRIKES,
  ...KARESH_EXPEDITION_RAIDS,
]);

function kareshExpeditionWeekId(now) {
  return Math.floor((now || Date.now()) / (86400000 * 7));
}

function kareshExpeditionHash(seed) {
  let s = (seed >>> 0) || 1;
  s ^= s << 13;
  s ^= s >>> 17;
  s ^= s << 5;
  return (s >>> 0) / 4294967296;
}

function kareshExpeditionPick(list, seed, salt) {
  if (!Array.isArray(list) || !list.length) return null;
  const idx = Math.floor(kareshExpeditionHash(seed * 1664525 + salt * 1013904223) * list.length);
  return list[Math.max(0, Math.min(list.length - 1, idx))];
}

function kareshExpeditionDungeonName(key) {
  const dg = (typeof DUNGEONS !== 'undefined' ? DUNGEONS : []).find(x => x.key === key);
  return dg?.name || key;
}

function kareshExpeditionWorldBossName(key) {
  const wb = (typeof WORLD_BOSSES !== 'undefined' ? WORLD_BOSSES : []).find(x => x.key === key);
  return wb?.name || key;
}

function kareshExpeditionFinalBossName(key) {
  const dg = (typeof DUNGEONS !== 'undefined' ? DUNGEONS : []).find(x => x.key === key);
  const bosses = dg?.bosses || [];
  return bosses.length ? bosses[bosses.length - 1].name : null;
}

function kareshExpeditionLootContextKey(targetKey) {
  const map = {
    reshanor:'manaforge_omega',
    shadowpoint_vexis:'shadowpoint_breach',
    shandorah_astromancer:'shandorah_conclave',
  };
  return map[targetKey] || targetKey || 'voidrazor_sanctum';
}

function createKareshExpeditionMissions(weekId) {
  const seed = (weekId || kareshExpeditionWeekId()) + 17;
  const delveKey = kareshExpeditionPick(KARESH_EXPEDITION_DELVES, seed, 1);
  const strikeKey = kareshExpeditionPick(KARESH_EXPEDITION_STRIKES, seed, 2);
  const raidKey = kareshExpeditionPick(KARESH_EXPEDITION_RAIDS, seed, 3);
  const wbKey = kareshExpeditionPick(KARESH_EXPEDITION_WORLD_BOSSES, seed, 4);
  return [
    {
      id:'delve_route',
      type:'dungeon',
      icon:'🗝️',
      name:'地下堡折返线',
      desc:`连跑 ${kareshExpeditionDungeonName(delveKey)} 两次,清掉裂隙补给点。`,
      key:delveKey,
      goal:2,
      reward:{ gold:180000, gem:32, essence:28, waystoneFragments:3, seals:2 },
    },
    {
      id:'strike_route',
      type:'dungeon',
      icon:'⚔️',
      name:'圆顶突击线',
      desc:`推进 ${kareshExpeditionDungeonName(strikeKey)},压住幸存圆顶外沿的敌潮。`,
      key:strikeKey,
      goal:1,
      reward:{ gold:260000, gem:46, honor:1800, essence:40, waystoneFragments:4, seals:3 },
    },
    {
      id:'raid_route',
      type:'dungeon',
      icon:'🏰',
      name:'终局攻城线',
      desc:`打穿 ${kareshExpeditionDungeonName(raidKey)},让舰队与观测站短暂失明。`,
      key:raidKey,
      goal:1,
      reward:{ gold:420000, gem:72, honor:3200, essence:66, apexMarks:10, waystoneFragments:4, seals:4 },
    },
    {
      id:'apex_route',
      type:'worldBoss',
      icon:'🐲',
      name:'顶峰猎令线',
      desc:`击败 ${kareshExpeditionWorldBossName(wbKey)},截断本周最危险的裂界节点。`,
      key:wbKey,
      goal:1,
      reward:{ gold:380000, gem:60, honor:3000, essence:56, apexMarks:18, seals:3 },
    },
    {
      id:'survey_route',
      type:'activity',
      icon:'🚩',
      name:'裂界扫荡线',
      desc:'完成任意卡雷什终局活动 6 次: 副本、稀有精英或世界Boss都计入。',
      goal:6,
      reward:{ gold:320000, gem:52, honor:2200, essence:52, apexMarks:8, waystoneFragments:2, seals:3 },
    },
  ];
}

function ensureKareshExpedition() {
  if (typeof account === 'undefined' || !account) {
    return { weekId:kareshExpeditionWeekId(), missions:createKareshExpeditionMissions(kareshExpeditionWeekId()), claimed:{}, seals:0, totalClaims:0, totalSeals:0, cacheClaims:0, metaClaimed:false, history:[] };
  }
  if (!account.kareshExpedition) account.kareshExpedition = {};
  const ex = account.kareshExpedition;
  if (typeof ex.weekId !== 'number') ex.weekId = kareshExpeditionWeekId();
  if (!Array.isArray(ex.missions)) ex.missions = [];
  if (!ex.claimed || typeof ex.claimed !== 'object') ex.claimed = {};
  if (typeof ex.seals !== 'number') ex.seals = 0;
  if (typeof ex.totalClaims !== 'number') ex.totalClaims = 0;
  if (typeof ex.totalSeals !== 'number') ex.totalSeals = 0;
  if (typeof ex.cacheClaims !== 'number') ex.cacheClaims = 0;
  if (typeof ex.metaClaimed !== 'boolean') ex.metaClaimed = false;
  if (!Array.isArray(ex.history)) ex.history = [];
  const week = kareshExpeditionWeekId();
  if (ex.weekId !== week || !ex.missions.length) {
    ex.history.unshift({
      weekId: ex.weekId,
      completed: Object.keys(ex.claimed || {}).length,
      seals: ex.seals || 0,
      totalClaims: ex.totalClaims || 0,
    });
    ex.history = ex.history.slice(0, 5);
    ex.weekId = week;
    ex.missions = createKareshExpeditionMissions(week);
    ex.claimed = {};
    ex.metaClaimed = false;
  }
  for (const mission of ex.missions) {
    if (typeof mission.progress !== 'number') mission.progress = 0;
  }
  return ex;
}

function isKareshExpeditionDungeon(dgOrKey) {
  const key = typeof dgOrKey === 'string'
    ? ((typeof baseDungeonKey === 'function') ? baseDungeonKey(dgOrKey) : String(dgOrKey || ''))
    : ((typeof baseDungeonKey === 'function') ? baseDungeonKey(dgOrKey?.key) : String(dgOrKey?.key || ''));
  return KARESH_EXPEDITION_DUNGEONS.has(key);
}

function kareshExpeditionThreatLevel() {
  const ex = ensureKareshExpedition();
  const completed = Object.keys(ex.claimed || {}).length + (ex.metaClaimed ? 2 : 0);
  return Math.max(0, Math.min(14, completed * 2 + Math.floor((ex.cacheClaims || 0) / 2)));
}

function kareshExpeditionTargetedDungeonKeys() {
  return new Set(ensureKareshExpedition().missions.filter(m => m.type === 'dungeon' && m.key).map(m => m.key));
}

function kareshExpeditionTargetedWorldBossKeys() {
  return new Set(ensureKareshExpedition().missions.filter(m => m.type === 'worldBoss' && m.key).map(m => m.key));
}

function kareshExpeditionEnemyAffixFor(dg) {
  if (!dg) return null;
  const key = (typeof baseDungeonKey === 'function') ? baseDungeonKey(dg.key) : dg.key;
  if (!isKareshExpeditionDungeon(key)) return null;
  const threat = kareshExpeditionThreatLevel();
  if (threat <= 0) return null;
  const focused = kareshExpeditionTargetedDungeonKeys().has(key);
  const focus = focused ? 1.3 : 1;
  return {
    key:'kareshExpeditionThreat',
    name: focused ? '裂界围剿' : '远征戒严',
    icon:'🚩',
    desc:`终局远征将敌军主力引向 ${kareshExpeditionDungeonName(key)}: 小怪生命+${Math.round(threat * 3 * focus)}%,首领生命+${Math.round(threat * 5 * focus)}%,伤害+${Math.round(threat * 3 * focus)}%。`,
    mod:{
      trashHp: threat * 0.03 * focus,
      bossHp: threat * 0.05 * focus,
      bossDmg: threat * 0.03 * focus,
      trashDef: threat * 0.018 * focus,
      bossDef: threat * 0.014 * focus,
      addPatrol: threat >= 4,
    }
  };
}

function kareshExpeditionRewardText(r) {
  const parts = [];
  if (r.gold) parts.push(`${fmt(r.gold)}💰`);
  if (r.gem) parts.push(`${r.gem}💎`);
  if (r.honor) parts.push(`${fmt(r.honor)}🏅`);
  if (r.essence) parts.push(`${r.essence}✨`);
  if (r.apexMarks) parts.push(`${r.apexMarks}✦`);
  if (r.waystoneFragments) parts.push(`${r.waystoneFragments}🪨`);
  if (r.seals) parts.push(`${r.seals}🚩`);
  if (r.title) parts.push(`称号「${r.title}」`);
  return parts.join(' ');
}

function grantKareshExpeditionReward(r, targetKey, bossName, options) {
  if (!r) return null;
  const ex = ensureKareshExpedition();
  if (r.gold) state.gold += r.gold;
  if (r.gem) state.gem += r.gem;
  if (r.honor) state.honor += r.honor;
  if (r.essence) state.essence = (state.essence || 0) + r.essence;
  if (r.apexMarks) {
    if (typeof ensureEventState === 'function') ensureEventState();
    if (!state.worldBoss) state.worldBoss = { lastKill:{}, shards:0, totalKilled:0, stageClears:{}, rareKills:{}, apexMarks:0 };
    state.worldBoss.apexMarks = (state.worldBoss.apexMarks || 0) + r.apexMarks;
  }
  if (r.waystoneFragments && typeof grantWaystoneFragmentsRaw === 'function') {
    grantWaystoneFragmentsRaw(r.waystoneFragments, 'karesh_expedition');
  }
  if (r.seals) {
    ex.seals += r.seals;
    ex.totalSeals += r.seals;
  }
  if (r.title && typeof unlockTitle === 'function') unlockTitle(r.title);
  const awardItem = !options?.noItem;
  let item = null;
  if (awardItem && typeof rollItem === 'function') {
    const lootKey = kareshExpeditionLootContextKey(targetKey);
    const dg = (typeof DUNGEONS !== 'undefined' ? DUNGEONS : []).find(x => x.key === lootKey);
    const power = dg ? ((dg.powerLvl || dg.reqLvl || 100) + 2) : 104;
    const maxRarity = options?.legendary ? 'legend' : (dg?.type === 'raid' ? 'legend' : 'epic');
    const minRarity = dg?.type === 'raid' ? 'epic' : 'rare';
    item = rollItem(maxRarity, power, lootKey, bossName || kareshExpeditionFinalBossName(lootKey), { minRarity });
    if (item) {
      addToInventory(item);
      if (typeof eventsOnItemGet === 'function') eventsOnItemGet(item);
      if (item.rarity === 'legend' && typeof progressionOnLegendary === 'function') progressionOnLegendary();
    }
  }
  if (typeof markDirty === 'function') markDirty('events', 'hero', 'inventory', 'dungeon');
  return item;
}

function kareshExpeditionAdvanceMission(id, amount) {
  if (!amount) return false;
  const ex = ensureKareshExpedition();
  const mission = ex.missions.find(m => m.id === id);
  if (!mission || ex.claimed[id]) return false;
  const before = mission.progress || 0;
  mission.progress = Math.min(mission.goal || 1, before + amount);
  return mission.progress !== before;
}

function kareshExpeditionAddActivity(kind, payload) {
  const ex = ensureKareshExpedition();
  let changed = false;
  for (const mission of ex.missions) {
    if (ex.claimed[mission.id]) continue;
    if (mission.type === 'dungeon' && kind === 'dungeon') {
      if (mission.key === payload?.dungeonKey) changed = kareshExpeditionAdvanceMission(mission.id, 1) || changed;
    } else if (mission.type === 'worldBoss' && kind === 'worldBoss') {
      if (mission.key === payload?.worldBossKey) changed = kareshExpeditionAdvanceMission(mission.id, 1) || changed;
    } else if (mission.type === 'activity') {
      changed = kareshExpeditionAdvanceMission(mission.id, payload?.activityGain || 1) || changed;
    }
  }
  if (changed && typeof markDirty === 'function') markDirty('events');
}

function kareshExpeditionClaimMission(id) {
  const ex = ensureKareshExpedition();
  const mission = ex.missions.find(m => m.id === id);
  if (!mission) return false;
  if (ex.claimed[id]) { log('该远征路线奖励已领取', 'info'); return false; }
  if ((mission.progress || 0) < (mission.goal || 1)) { log('远征进度尚未完成', 'bad'); return false; }
  ex.claimed[id] = Date.now();
  ex.totalClaims = (ex.totalClaims || 0) + 1;
  const bossName = mission.type === 'worldBoss' ? kareshExpeditionWorldBossName(mission.key) : kareshExpeditionFinalBossName(mission.key);
  const item = grantKareshExpeditionReward(mission.reward, mission.key, bossName);
  const itemText = item ? ` · ${item.name}` : '';
  log(`🚩 领取远征路线「${mission.name}」· ${kareshExpeditionRewardText(mission.reward)}${itemText}`, 'legend');
  return true;
}

function kareshExpeditionClaimMeta() {
  const ex = ensureKareshExpedition();
  if (ex.metaClaimed) { log('本周终局远征总奖励已领取', 'info'); return false; }
  const allDone = ex.missions.every(m => (m.progress || 0) >= (m.goal || 1));
  if (!allDone) { log('仍有远征路线未完成', 'bad'); return false; }
  ex.metaClaimed = true;
  const reward = { gold:650000, gem:120, honor:6000, essence:120, apexMarks:18, waystoneFragments:5, seals:2, title:'卡雷什远征队长' };
  const item = grantKareshExpeditionReward(reward, 'voidrazor_sanctum', '吞界观测主脑阿兹莫垩', { legendary:true });
  log(`🌌 领取终局远征总奖励 · ${kareshExpeditionRewardText(reward)}${item ? ` · ${item.name}` : ''}`, 'legend');
  return true;
}

function exchangeKareshExpeditionCache() {
  const ex = ensureKareshExpedition();
  if ((ex.seals || 0) < KARESH_EXPEDITION_CACHE_COST) {
    log(`裂界远征印记不足,需要 ${KARESH_EXPEDITION_CACHE_COST}`, 'bad');
    return false;
  }
  ex.seals -= KARESH_EXPEDITION_CACHE_COST;
  ex.cacheClaims = (ex.cacheClaims || 0) + 1;
  const raidMissions = ex.missions.filter(m => m.type === 'dungeon' && KARESH_EXPEDITION_RAIDS.includes(m.key));
  const bestTarget = raidMissions[0]?.key || ex.missions.find(m => m.key)?.key || 'voidrazor_sanctum';
  const reward = { gold:300000, gem:42, honor:2400, essence:60, apexMarks:10, waystoneFragments:3 };
  const item = grantKareshExpeditionReward(reward, bestTarget, kareshExpeditionFinalBossName(bestTarget), { legendary:Math.random() < 0.2 });
  log(`📦 打开裂界远征补给箱 · ${kareshExpeditionRewardText(reward)}${item ? ` · ${item.name}` : ''}`, 'legend');
  return true;
}

function renderKareshExpeditionSub() {
  const ex = ensureKareshExpedition();
  const left = Math.max(0, Math.ceil((((ex.weekId || kareshExpeditionWeekId()) + 1) * 86400000 * 7 - Date.now()) / 1000));
  const threat = kareshExpeditionThreatLevel();
  const claimed = Object.keys(ex.claimed || {}).length;
  const ready = ex.missions.filter(m => !ex.claimed[m.id] && (m.progress || 0) >= (m.goal || 1)).length;
  const allDone = ex.missions.every(m => (m.progress || 0) >= (m.goal || 1));
  const cards = ex.missions.map(m => {
    const claimedMission = !!ex.claimed[m.id];
    const done = (m.progress || 0) >= (m.goal || 1);
    const pct = Math.min(100, ((m.progress || 0) / (m.goal || 1)) * 100);
    const btn = claimedMission
      ? '<span class="muted">✓已领取</span>'
      : done
        ? `<button class="gold" data-action="claimkareshexpedition" data-id="${m.id}">领取</button>`
        : `<span class="muted" style="font-size:10px">${fmt(m.progress || 0)}/${fmt(m.goal || 1)}</span>`;
    return `<div class="karesh-expedition-card ${claimedMission ? 'claimed' : (done ? 'ready' : '')}">
      <div class="karesh-expedition-head">
        <span class="karesh-expedition-icon">${m.icon}</span>
        <div><b>${m.name}</b><div class="muted" style="font-size:10px">${m.desc}</div></div>
      </div>
      <div class="bar xp" style="height:7px;margin-top:6px"><i style="width:${pct}%"></i></div>
      <div class="muted" style="font-size:10px;margin-top:5px">${kareshExpeditionRewardText(m.reward)}</div>
      <div class="karesh-expedition-foot">${btn}</div>
    </div>`;
  }).join('');
  const hist = (ex.history || []).slice(0, 3).map(h => `<div class="muted">周 ${h.weekId}: 完成 ${h.completed || 0} 条 · 印记 ${h.seals || 0}</div>`).join('');
  return `<div class="karesh-expedition-panel">
    <div class="karesh-expedition-hero" style="background-image:linear-gradient(90deg, rgba(8,12,24,.92), rgba(8,12,24,.56)), url('${KARESH_EXPEDITION_BANNER}')">
      <div class="karesh-expedition-title">🚩 卡雷什终局远征</div>
      <div class="karesh-expedition-text">周重置 ${fmtCd(left)} · 已领取 <b>${claimed}/${KARESH_EXPEDITION_WEEKLY_GOAL}</b> 条路线 · 可领取 <b style="color:var(--legend)">${ready}</b> 条 · 裂界威胁 <b>${threat}</b></div>
    </div>
    <div class="karesh-expedition-wallet">
      <span>裂界远征印记 <b>${ex.seals || 0}</b></span>
      <span>累计路线 <b>${ex.totalClaims || 0}</b></span>
      <span>累计印记 <b>${ex.totalSeals || 0}</b></span>
      <span>补给箱 <b>${ex.cacheClaims || 0}</b></span>
    </div>
    <div class="karesh-expedition-note">本周被点名的地下堡/副本/团本/世界Boss会额外变强,用于抵消远征印记、界碑碎片和星痕带来的成长。大秘境与普通/英雄/史诗变体都能计入对应路线。</div>
    <div class="karesh-expedition-grid">${cards}</div>
    <div class="karesh-expedition-actions">
      <button class="${allDone && !ex.metaClaimed ? 'gold' : ''}" data-action="claimkareshexpeditionmeta" ${allDone && !ex.metaClaimed ? '' : 'disabled'}>${ex.metaClaimed ? '总奖励已领' : '领取周终总奖励'}</button>
      <button class="${(ex.seals || 0) >= KARESH_EXPEDITION_CACHE_COST ? 'gold' : ''}" data-action="exchangekareshexpedition" ${(ex.seals || 0) >= KARESH_EXPEDITION_CACHE_COST ? '' : 'disabled'}>补给箱 ${KARESH_EXPEDITION_CACHE_COST} 印记</button>
    </div>
    ${hist ? `<div class="karesh-expedition-history">${hist}</div>` : ''}
  </div>`;
}

(function installKareshExpeditionHooks() {
  globalThis.renderKareshExpeditionSub = renderKareshExpeditionSub;
  globalThis.ensureKareshExpedition = ensureKareshExpedition;
  globalThis.isKareshExpeditionDungeon = isKareshExpeditionDungeon;

  const oldEnter = globalThis.enterDungeon;
  if (typeof oldEnter === 'function' && !oldEnter._kareshExpeditionWrapped) {
    function wrappedEnterDungeon(key) {
      oldEnter.apply(this, arguments);
      const ds = state?.dungeonState;
      const dg = (typeof DUNGEONS !== 'undefined' ? DUNGEONS : []).find(d => d.key === key);
      const affix = kareshExpeditionEnemyAffixFor(dg);
      if (ds && affix && Array.isArray(ds.affixes) && !ds.affixes.some(a => a?.key === affix.key)) {
        ds.affixes.push(affix);
        if (typeof log === 'function') log(`🚩 终局远征让 ${dg.name} 进入戒严状态`, 'bad');
      }
    }
    wrappedEnterDungeon._kareshExpeditionWrapped = true;
    globalThis.enterDungeon = wrappedEnterDungeon;
  }

  const oldEnterMythic = globalThis.enterMythic;
  if (typeof oldEnterMythic === 'function' && !oldEnterMythic._kareshExpeditionWrapped) {
    function wrappedEnterMythic() {
      oldEnterMythic.apply(this, arguments);
      const ms = state?.mythicState;
      const dg = (typeof DUNGEONS !== 'undefined' ? DUNGEONS : []).find(d => d.key === ms?.key);
      const affix = kareshExpeditionEnemyAffixFor(dg);
      if (ms && affix && Array.isArray(ms.affixes) && !ms.affixes.some(a => a?.key === affix.key)) {
        ms.affixes.push(affix);
        if (typeof log === 'function') log(`🚩 终局远征同步强化了大秘境 [${dg.name}]`, 'bad');
      }
    }
    wrappedEnterMythic._kareshExpeditionWrapped = true;
    globalThis.enterMythic = wrappedEnterMythic;
  }

  const oldDungeonClear = globalThis.onDungeonClear;
  if (typeof oldDungeonClear === 'function' && !oldDungeonClear._kareshExpeditionWrapped) {
    function wrappedOnDungeonClear(dg) {
      oldDungeonClear.apply(this, arguments);
      const key = (typeof baseDungeonKey === 'function') ? baseDungeonKey(dg?.key) : dg?.key;
      if (!key || !isKareshExpeditionDungeon(key)) return;
      kareshExpeditionAddActivity('dungeon', { dungeonKey:key, activityGain:dg?.type === 'raid' ? 2 : 1 });
    }
    wrappedOnDungeonClear._kareshExpeditionWrapped = true;
    globalThis.onDungeonClear = wrappedOnDungeonClear;
  }

  const oldMythicClear = globalThis.onMythicClear;
  if (typeof oldMythicClear === 'function' && !oldMythicClear._kareshExpeditionWrapped) {
    function wrappedOnMythicClear() {
      const key = state?.mythicState?.key;
      oldMythicClear.apply(this, arguments);
      const baseKey = (typeof baseDungeonKey === 'function') ? baseDungeonKey(key) : key;
      if (!baseKey || !isKareshExpeditionDungeon(baseKey)) return;
      kareshExpeditionAddActivity('dungeon', { dungeonKey:baseKey, activityGain:2 });
    }
    wrappedOnMythicClear._kareshExpeditionWrapped = true;
    globalThis.onMythicClear = wrappedOnMythicClear;
  }

  const oldWorldBossKill = globalThis.onWorldBossKill;
  if (typeof oldWorldBossKill === 'function' && !oldWorldBossKill._kareshExpeditionWrapped) {
    function wrappedOnWorldBossKill(mon) {
      oldWorldBossKill.apply(this, arguments);
      const key = mon?.wbKey || mon?.key;
      if (!KARESH_EXPEDITION_WORLD_BOSSES.includes(key)) return;
      kareshExpeditionAddActivity('worldBoss', { worldBossKey:key, activityGain:2 });
    }
    wrappedOnWorldBossKill._kareshExpeditionWrapped = true;
    globalThis.onWorldBossKill = wrappedOnWorldBossKill;
  }

  const oldRareKill = globalThis.onRareEliteKill;
  if (typeof oldRareKill === 'function' && !oldRareKill._kareshExpeditionWrapped) {
    function wrappedOnRareEliteKill(mon) {
      oldRareKill.apply(this, arguments);
      let mapKey = mon?.mapKey || '';
      if (!mapKey && mon?.rareKey && typeof RARE_ELITES !== 'undefined') {
        const rare = RARE_ELITES.find(r => r.key === mon.rareKey);
        mapKey = rare?.mapKey || '';
      }
      if (!KARESH_EXPEDITION_ACTIVITY_MAPS.has(mapKey)) return;
      kareshExpeditionAddActivity('rare', { activityGain:1 });
    }
    wrappedOnRareEliteKill._kareshExpeditionWrapped = true;
    globalThis.onRareEliteKill = wrappedOnRareEliteKill;
  }

  const oldBuildWb = globalThis.buildWorldBossMonsterData;
  if (typeof oldBuildWb === 'function' && !oldBuildWb._kareshExpeditionWrapped) {
    function wrappedBuildWorldBossMonsterData(wb) {
      const mon = oldBuildWb.apply(this, arguments);
      if (!KARESH_EXPEDITION_WORLD_BOSSES.includes(wb?.key)) return mon;
      const threat = kareshExpeditionThreatLevel();
      if (threat <= 0) return mon;
      const focused = kareshExpeditionTargetedWorldBossKeys().has(wb.key);
      const focus = focused ? 1.3 : 1;
      mon.hpMax = Math.floor(mon.hpMax * (1 + threat * 0.05 * focus));
      mon.hp = mon.hpMax;
      mon.atk = Math.floor(mon.atk * (1 + threat * 0.03 * focus));
      mon.def = Math.floor(mon.def * (1 + threat * 0.02 * focus));
      mon.dmgReduction = Math.min(0.84, (mon.dmgReduction || 0) + threat * 0.004 * focus);
      return mon;
    }
    wrappedBuildWorldBossMonsterData._kareshExpeditionWrapped = true;
    globalThis.buildWorldBossMonsterData = wrappedBuildWorldBossMonsterData;
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest && e.target.closest('button[data-action^="claimkareshexpedition"],button[data-action="exchangekareshexpedition"],button[data-action="claimkareshexpeditionmeta"]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (btn.dataset.action === 'claimkareshexpedition') kareshExpeditionClaimMission(btn.dataset.id);
    else if (btn.dataset.action === 'claimkareshexpeditionmeta') kareshExpeditionClaimMeta();
    else if (btn.dataset.action === 'exchangekareshexpedition') exchangeKareshExpeditionCache();
    if (typeof renderEvents === 'function') renderEvents();
  }, true);
})();
