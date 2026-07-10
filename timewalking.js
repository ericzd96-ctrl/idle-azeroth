/* timewalking.js - Weekly Timewalking campaigns for classic expansions */
const TIMEWALKING_BANNER = 'assets/wow/art/timewalking-banner.png';
const TIMEWALKING_CACHE_COST = 18;
const TIMEWALKING_MISSION_COUNT = 5;

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

function ensureTimewalkingState() {
  if (typeof account === 'undefined' || !account) {
    const week = timewalkingWeekId();
    const setup = createTimewalkingMissions(week);
    return { weekId:week, eraKey:setup.eraKey, missions:setup.missions, claimed:{}, badges:0, totalBadges:0, totalClaims:0, cacheClaims:0, metaClaimed:false, history:[] };
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
  if (!Array.isArray(tw.history)) tw.history = [];
  const week = timewalkingWeekId();
  if (tw.weekId !== week || !tw.missions.length) {
    tw.history.unshift({
      weekId:tw.weekId,
      eraKey:tw.eraKey,
      completed:Object.keys(tw.claimed || {}).length,
      badges:tw.badges || 0,
      caches:tw.cacheClaims || 0,
    });
    tw.history = tw.history.slice(0, 6);
    const setup = createTimewalkingMissions(week);
    tw.weekId = week;
    tw.eraKey = setup.eraKey;
    tw.missions = setup.missions;
    tw.claimed = {};
    tw.metaClaimed = false;
  }
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
  return Math.max(0, Math.min(12, completed * 2 + Math.floor((tw.cacheClaims || 0) * 1.5)));
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

function grantTimewalkingReward(r, targetKey, bossName, options) {
  if (!r) return null;
  const tw = ensureTimewalkingState();
  const broker = timewalkingBrokerActive();
  const badgeGain = Math.max(0, Math.floor((r.badges || 0) * (broker ? 1.2 : 1)));
  if (r.gold) state.gold += broker ? Math.floor(r.gold * 1.1) : r.gold;
  if (r.gem) state.gem += broker ? Math.ceil(r.gem * 1.1) : r.gem;
  if (r.honor) state.honor += broker ? Math.floor(r.honor * 1.08) : r.honor;
  if (r.essence) state.essence = (state.essence || 0) + (broker ? Math.floor(r.essence * 1.1) : r.essence);
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
    const power = dg ? ((dg.powerLvl || dg.reqLvl || 75) + (broker ? 2 : 0)) : 80;
    const maxRarity = options?.legendary ? 'legend' : (dg?.type === 'raid' ? 'legend' : 'epic');
    const minRarity = dg?.type === 'raid' ? 'epic' : 'rare';
    item = rollItem(maxRarity, power, lootKey, bossName || timewalkingDungeonFinalBoss(lootKey), { minRarity });
    if (item) {
      addToInventory(item);
      if (typeof eventsOnItemGet === 'function') eventsOnItemGet(item);
      if (item.rarity === 'legend' && typeof progressionOnLegendary === 'function') progressionOnLegendary();
    }
    if (broker && typeof rollItem === 'function' && Math.random() < 0.25) {
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
  const raidMission = tw.missions.find(m => m.type === 'raidKey');
  const reward = { gold:520000, gem:90, honor:4200, essence:88, badges:10, title:'时序战团老兵' };
  const item = grantTimewalkingReward(reward, raidMission?.key || era.lootFallback, timewalkingDungeonFinalBoss(raidMission?.key || era.lootFallback), { legendary:true });
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
    </div>
    <div class="timewalking-note">${era.desc} 本周地下城: ${era.dungeons.map(timewalkingDungeonName).join(' · ')} · 团本池: ${era.raids.map(timewalkingDungeonName).join(' · ')}。被轮值点名的旧时代内容会同步变强,避免高等级角色直接平推。</div>
    <div class="timewalking-grid">${cards}</div>
    <div class="timewalking-actions">
      <button class="${allDone && !tw.metaClaimed ? 'gold' : ''}" data-action="claimtimewalkingmeta" ${allDone && !tw.metaClaimed ? '' : 'disabled'}>${tw.metaClaimed ? '总奖励已领' : '领取周终总奖励'}</button>
      <button class="${(tw.badges || 0) >= TIMEWALKING_CACHE_COST ? 'gold' : ''}" data-action="exchangetimewalking" ${(tw.badges || 0) >= TIMEWALKING_CACHE_COST ? '' : 'disabled'}>时光宝箱 ${TIMEWALKING_CACHE_COST} 徽记</button>
    </div>
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
      const affix = timewalkingEnemyAffixFor(dg);
      if (ds && affix && Array.isArray(ds.affixes) && !ds.affixes.some(a => a?.key === affix.key)) {
        ds.affixes.push(affix);
        if (typeof log === 'function') log(`🕰️ 时光漫游重新标定了 ${dg.name}`, 'bad');
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
      const affix = timewalkingEnemyAffixFor(dg);
      if (ms && affix && Array.isArray(ms.affixes) && !ms.affixes.some(a => a?.key === affix.key)) {
        ms.affixes.push(affix);
        if (typeof log === 'function') log(`🕰️ 时光漫游同步强化了大秘境 [${dg.name}]`, 'bad');
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
      return mon;
    }
    wrappedBuildWorldBossMonsterData._timewalkingWrapped = true;
    globalThis.buildWorldBossMonsterData = wrappedBuildWorldBossMonsterData;
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest && e.target.closest('button[data-action^="claimtimewalking"],button[data-action="exchangetimewalking"]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (btn.dataset.action === 'claimtimewalking') claimTimewalkingMission(btn.dataset.id);
    else if (btn.dataset.action === 'claimtimewalkingmeta') claimTimewalkingMeta();
    else if (btn.dataset.action === 'exchangetimewalking') exchangeTimewalkingCache();
    if (typeof renderEvents === 'function') renderEvents();
  }, true);
})();
