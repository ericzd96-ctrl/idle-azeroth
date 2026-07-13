/* waystones.js - K'aresh Waystone Network meta progression */
const WAYSTONE_KARESH_KEYS = new Set([
  'archival_assault', 'ecodome_aldani', 'oasis_succession', 'tazavesh_streets', 'tazavesh_gambit',
  'overlook_zoshul', 'ecodome_rhovan', 'shadowpoint_breach', 'primeus_repository',
  'manaforge_omega', 'shandorah_conclave', 'voidrazor_sanctum'
]);

const WAYSTONE_NODES = [
  { key:'bounty', icon:'📜', cost:4, name:'悬赏碑文', desc:'每日副本悬赏额外追加 1 个目标,并把当日悬赏奖励提高 12%。' },
  { key:'delve', icon:'🗝️', cost:5, name:'地下堡寻径', desc:'丰裕地下堡每日额外出现 1 个候选,让卡雷什地下堡轮换更密集。' },
  { key:'echo', icon:'🌌', cost:6, name:'回响棱镜', desc:'释放世界之魂记忆后返还 1 个辉光回响,加快高端循环。' },
  { key:'phase', icon:'🧿', cost:7, name:'相位系留', desc:'每次完成相位通缉令额外返还 8 点相位稳定度。' },
  { key:'ecology', icon:'🌱', cost:7, name:'生态管路', desc:'生态圆顶防卫额外获得 6 样本,并补充 10 点周常进度。' },
  { key:'resonance', icon:'🪨', cost:10, name:'谐振节点', desc:'终局进度上限 +2,方便继续推进 100+ 的卡雷什地图与副本。' },
];

function ensureWaystoneState() {
  if (typeof account === 'undefined' || !account) return { fragments:0, unlocked:{}, totalEarned:0 };
  if (!account.waystones) account.waystones = {};
  const ws = account.waystones;
  if (typeof ws.fragments !== 'number') ws.fragments = 0;
  if (!ws.unlocked || typeof ws.unlocked !== 'object') ws.unlocked = {};
  if (typeof ws.totalEarned !== 'number') ws.totalEarned = 0;
  if (!ws.history || typeof ws.history !== 'object') ws.history = {};
  return ws;
}

function waystoneNodeActive(key) {
  return !!ensureWaystoneState().unlocked?.[key];
}

function waystoneProgressBonus() {
  return waystoneNodeActive('resonance') ? 2 : 0;
}

function waystoneRewardMult() {
  return waystoneNodeActive('bounty') ? 1.12 : 1;
}

function baseWaystoneKey(key) {
  return (typeof baseDungeonKey === 'function') ? baseDungeonKey(key) : String(key || '');
}

function isWaystoneDungeon(dgOrKey) {
  const key = typeof dgOrKey === 'string' ? dgOrKey : dgOrKey?.key;
  return WAYSTONE_KARESH_KEYS.has(baseWaystoneKey(key));
}

function waystoneFragmentRewardForDungeon(dg) {
  if (!dg || !isWaystoneDungeon(dg)) return 0;
  if (dg.epicRaid) return 5;
  if (dg.type === 'raid') return 4;
  if (dg.epic5) return 3;
  if (dg.heroic) return 2;
  if (dg.delve) return 1;
  return 2;
}

function grantWaystoneFragmentsRaw(gain, sourceKey, logText) {
  const amount = Math.max(0, Math.floor(Number(gain) || 0));
  if (!amount) return 0;
  const ws = ensureWaystoneState();
  ws.fragments += amount;
  ws.totalEarned += amount;
  const key = `${Math.floor(Date.now() / 86400000)}:${sourceKey || 'misc'}:${Object.keys(ws.history || {}).length}`;
  ws.history[key] = (ws.history[key] || 0) + amount;
  if (typeof log === 'function' && logText) log(`${logText} 界碑碎片 +${amount}`, 'legend');
  if (typeof markDirty === 'function') markDirty('events', 'dungeon', 'hero');
  return amount;
}

function grantWaystoneFragments(dg) {
  const gain = waystoneFragmentRewardForDungeon(dg);
  if (!gain) return 0;
  const label = (typeof dungeonIcon === 'function') ? dungeonIcon(dg.key, dg.name, 16, dg.icon || '🪨') : (dg.icon || '🪨');
  return grantWaystoneFragmentsRaw(gain, dg.key, `${label} 界碑网络记录了本次通关,`);
}

function waystoneExtraBountyTarget(resetAt, excludeKeys) {
  const lvl = (typeof playerProgressLevel === 'function') ? playerProgressLevel() : (state?.hero?.lvl || 1);
  const used = new Set(excludeKeys || []);
  const pool = (typeof DUNGEONS !== 'undefined' ? DUNGEONS : [])
    .filter(dg => dg && lvl >= (dg.reqLvl || 1) && !used.has(dg.key))
    .sort((a, b) => ((b.powerLvl || b.reqLvl || 0) - (a.powerLvl || a.reqLvl || 0)));
  const dg = pool.find(x => isWaystoneDungeon(x)) || pool[0];
  if (!dg) return null;
  const reward = Object.assign({}, (typeof dungeonBountyRewardFor === 'function') ? dungeonBountyRewardFor(dg) : {});
  const mult = waystoneRewardMult();
  for (const key of ['gold', 'gem', 'honor', 'essence']) reward[key] = Math.floor((reward[key] || 0) * mult);
  return {
    id: `${resetAt}:${dg.key}:waystone`,
    key: dg.key,
    name: dg.name,
    themeKey: 'waystone',
    themeName: '界碑网络',
    icon: '🪨',
    desc: '界碑网络优先标记裂隙战区,追加一份高价值日常悬赏。',
    tier: (typeof dungeonBountyTier === 'function') ? dungeonBountyTier(dg) : 1,
    reward,
    waystoneBoosted: true,
  };
}

function renderWaystonePanel() {
  const el = $('waystone-panel');
  if (!el) return;
  const ws = ensureWaystoneState();
  const icon = (typeof uiIcon === 'function') ? uiIcon('waystone', 'sm', '界碑网络') : '🪨';
  const active = WAYSTONE_NODES.filter(n => waystoneNodeActive(n.key)).length;
  const cards = WAYSTONE_NODES.map(node => {
    const unlocked = waystoneNodeActive(node.key);
    const can = !unlocked && (ws.fragments || 0) >= node.cost;
    return `<div class="waystone-node ${unlocked ? 'active' : ''}">
      <div class="waystone-node-head"><b>${node.icon} ${node.name}</b><span class="pill">${unlocked ? '已激活' : `${node.cost} 碎片`}</span></div>
      <div class="muted">${node.desc}</div>
      <button class="${can ? 'gold' : ''}" data-action="waystoneunlock" data-key="${node.key}" ${can ? '' : 'disabled'}>${unlocked ? '已激活' : '调谐界碑'}</button>
    </div>`;
  }).join('');
  el.innerHTML = `<div class="waystone-panel">
    <div class="waystone-title">
      <span>${icon} 界碑网络</span>
      <span class="muted">已激活 ${active}/${WAYSTONE_NODES.length} · 终局加成 ${waystoneProgressBonus()}</span>
    </div>
    <div class="waystone-hero" style="background-image:linear-gradient(180deg, rgba(14,18,28,.2), rgba(14,18,28,.82)), url('assets/wow/art/karesh-map.png')">
      <div class="waystone-hero-main">
        <div><b>界碑碎片</b> <span class="pill">${ws.fragments || 0}</span></div>
        <div class="muted">卡雷什终局副本会持续为界碑网络供能,已累计收集 ${ws.totalEarned || 0} 个碎片。</div>
      </div>
    </div>
    <div class="waystone-note">界碑网络主要提供终局玩法的节奏与便利强化,不会直接平推怪物数值;其中「谐振节点」会额外抬升终局进度上限,帮助接上 100+ 内容。</div>
    <div class="waystone-grid">${cards}</div>
  </div>`;
}

function unlockWaystoneNode(key) {
  const node = WAYSTONE_NODES.find(x => x.key === key);
  if (!node) return false;
  const ws = ensureWaystoneState();
  if (ws.unlocked[node.key]) return false;
  if ((ws.fragments || 0) < node.cost) {
    if (typeof log === 'function') log(`界碑碎片不足,需要 ${node.cost}`, 'bad');
    return false;
  }
  ws.fragments -= node.cost;
  ws.unlocked[node.key] = true;
  if (typeof log === 'function') log(`🪨 已调谐界碑节点 [${node.name}]`, 'legend');
  if (typeof markDirty === 'function') markDirty('dungeon', 'hero');
  if (typeof saveState === 'function') saveState();
  return true;
}

(function installWaystoneHooks() {
  globalThis.ensureWaystoneState = ensureWaystoneState;
  globalThis.waystoneNodeActive = waystoneNodeActive;
  globalThis.waystoneProgressBonus = waystoneProgressBonus;
  globalThis.grantWaystoneFragmentsRaw = grantWaystoneFragmentsRaw;
  globalThis.renderWaystonePanel = renderWaystonePanel;

  const oldClear = globalThis.onDungeonClear;
  if (typeof oldClear === 'function' && !oldClear._waystoneWrapped) {
    function wrappedOnDungeonClear(dg) {
      oldClear.apply(this, arguments);
      grantWaystoneFragments(dg);
    }
    wrappedOnDungeonClear._waystoneWrapped = true;
    globalThis.onDungeonClear = wrappedOnDungeonClear;
  }

  const oldEnsureBounty = globalThis.ensureDungeonBounties;
  if (typeof oldEnsureBounty === 'function' && !oldEnsureBounty._waystoneWrapped) {
    function wrappedEnsureDungeonBounties(force) {
      const bounty = oldEnsureBounty.apply(this, arguments);
      if (!waystoneNodeActive('bounty') || !bounty?.targets?.length) return bounty;
      if (bounty._waystoneAugmentedFor === bounty.resetAt) return bounty;
      bounty._waystoneAugmentedFor = bounty.resetAt;
      const mult = waystoneRewardMult();
      for (const target of bounty.targets) {
        if (target.waystoneBoosted || !target.reward) continue;
        for (const key of ['gold', 'gem', 'honor', 'essence']) target.reward[key] = Math.floor((target.reward[key] || 0) * mult);
        target.waystoneBoosted = true;
      }
      const extra = waystoneExtraBountyTarget(bounty.resetAt, bounty.targets.map(t => t.key));
      if (extra) bounty.targets.push(extra);
      return bounty;
    }
    wrappedEnsureDungeonBounties._waystoneWrapped = true;
    globalThis.ensureDungeonBounties = wrappedEnsureDungeonBounties;
  }

  const oldTodayDelves = globalThis.todayBountifulDelveKeys;
  if (typeof oldTodayDelves === 'function' && !oldTodayDelves._waystoneWrapped) {
    function wrappedTodayBountifulDelveKeys(now) {
      if (!waystoneNodeActive('delve')) return oldTodayDelves.apply(this, arguments);
      const day = (typeof delveDay === 'function') ? delveDay(now) : Math.floor((now || Date.now()) / 86400000);
      const delves = (typeof DUNGEONS !== 'undefined' ? DUNGEONS : []).filter(d => d.delve && d.key === delveBaseKey(d.key));
      const shuffled = delves
        .map((dg, i) => ({ dg, score: delveHash((day + 157) * 1103515245 + i * 7919 + String(dg.key).length * 97) }))
        .sort((a, b) => a.score - b.score)
        .map(x => x.dg.key);
      return shuffled.slice(0, Math.min(DELVE_DAILY_BOUNTIFUL_COUNT + 1, shuffled.length));
    }
    wrappedTodayBountifulDelveKeys._waystoneWrapped = true;
    globalThis.todayBountifulDelveKeys = wrappedTodayBountifulDelveKeys;
  }

  const oldRunWorldsoul = globalThis.runWorldsoulMemory;
  if (typeof oldRunWorldsoul === 'function' && !oldRunWorldsoul._waystoneWrapped) {
    function wrappedRunWorldsoulMemory(cost) {
      const before = ensureWorldsoulState().echoes || 0;
      const item = oldRunWorldsoul.apply(this, arguments);
      if (item === false) return item;
      if (waystoneNodeActive('echo')) {
        const ws = ensureWorldsoulState();
        ws.echoes += 1;
        if (typeof log === 'function') log(`🪨 回响棱镜返还辉光回响 +1 (${before}→${ws.echoes})`, 'good');
        if (typeof markDirty === 'function') markDirty('events');
      }
      return item;
    }
    wrappedRunWorldsoulMemory._waystoneWrapped = true;
    globalThis.runWorldsoulMemory = wrappedRunWorldsoulMemory;
  }

  const oldPhaseRun = globalThis.phaseRunWarrant;
  if (typeof oldPhaseRun === 'function' && !oldPhaseRun._waystoneWrapped) {
    function wrappedPhaseRunWarrant(key) {
      const ok = oldPhaseRun.apply(this, arguments);
      if (!ok || !waystoneNodeActive('phase')) return ok;
      const p = ensurePhaseDivingState();
      const maxStable = 100 + Math.max(0, (p.wrapsRank || 1) - 1) * 8;
      p.stability = Math.min(maxStable, (p.stability || 0) + 8);
      if (typeof log === 'function') log('🪨 相位系留返还稳定度 +8', 'good');
      if (typeof markDirty === 'function') markDirty('events');
      return ok;
    }
    wrappedPhaseRunWarrant._waystoneWrapped = true;
    globalThis.phaseRunWarrant = wrappedPhaseRunWarrant;
  }

  const oldEcoDefend = globalThis.ecoDefendDome;
  if (typeof oldEcoDefend === 'function' && !oldEcoDefend._waystoneWrapped) {
    function wrappedEcoDefendDome() {
      oldEcoDefend.apply(this, arguments);
      if (!waystoneNodeActive('ecology')) return;
      const eco = ensureEcoState();
      eco.samples += 6;
      eco.weekly = Math.min(ECO_WEEKLY_GOAL, (eco.weekly || 0) + 10);
      if (typeof log === 'function') log('🪨 生态管路额外输送:样本+6,周常+10', 'good');
      if (typeof markDirty === 'function') markDirty('events');
    }
    wrappedEcoDefendDome._waystoneWrapped = true;
    globalThis.ecoDefendDome = wrappedEcoDefendDome;
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest && e.target.closest('button[data-action="waystoneunlock"]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    unlockWaystoneNode(btn.dataset.key);
    if (typeof renderDungeon === 'function') renderDungeon();
  }, true);
})();
