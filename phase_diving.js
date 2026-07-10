/* phase_diving.js - K'aresh Phase Diving, Warrants, and Reshii Wraps */
const PHASE_WEEKLY_GOAL = 100;
const PHASE_MAX_WRAP_RANK = 5;
const PHASE_WRAP_STRAND_COST = 3;
const PHASE_DIVING_WARRANTS = [
  { key:'omra', name:'相位通缉令:欧姆拉', icon:'🧿', boss:'相位通缉犯欧姆拉', reqRank:1, cost:22, progress:35, pressure:2, rewards:{ coin:2, strands:1, gold:90000, gem:22, essence:18 } },
  { key:'devourer', name:'相位通缉令:无缚吞噬者', icon:'🌌', boss:'无缚吞噬者艾克索', reqRank:2, cost:28, progress:45, pressure:3, rewards:{ coin:3, strands:1, gold:125000, gem:30, essence:24 } },
  { key:'collector', name:'相位通缉令:财团收藏家', icon:'💠', boss:'财团收藏家维拉兹', reqRank:3, cost:34, progress:55, pressure:4, rewards:{ coin:4, strands:2, gold:170000, gem:42, essence:34 } },
  { key:'horror', name:'相位通缉令:解缚恐魔', icon:'👁️', boss:'解缚恐魔鲁姆萨', reqRank:4, cost:42, progress:70, pressure:5, rewards:{ coin:5, strands:2, gold:230000, gem:58, essence:46 } },
  { key:'zoshul', name:'相位通缉令:瞰台司辰', icon:'🔭', boss:'瞰台司辰扎里克', reqRank:3, cost:36, progress:58, pressure:4, rewards:{ coin:4, strands:2, gold:182000, gem:45, essence:36 } },
  { key:'azra', name:'相位通缉令:群星议长', icon:'🌠', boss:'群星议长索·阿兹拉', reqRank:5, cost:48, progress:82, pressure:6, rewards:{ coin:6, strands:3, gold:280000, gem:70, essence:56 } },
];

function phaseWeekId(now) {
  return Math.floor((now || Date.now()) / (86400000 * 7));
}

function ensurePhaseDivingState() {
  if (typeof account === 'undefined' || !account) return { wrapsRank: 1, strands: 0, coins: 0, stability: 100, weekly: 0, weekId: phaseWeekId(), completed: {}, instability: 0, history: [] };
  if (!account.phaseDiving) account.phaseDiving = {};
  const p = account.phaseDiving;
  if (typeof p.wrapsRank !== 'number') p.wrapsRank = 1;
  if (typeof p.strands !== 'number') p.strands = 0;
  if (typeof p.coins !== 'number') p.coins = 0;
  if (typeof p.stability !== 'number') p.stability = 100;
  if (typeof p.weekly !== 'number') p.weekly = 0;
  if (typeof p.weekId !== 'number') p.weekId = phaseWeekId();
  if (!p.completed || typeof p.completed !== 'object') p.completed = {};
  if (typeof p.instability !== 'number') p.instability = 0;
  if (!Array.isArray(p.history)) p.history = [];
  if (p.weekId !== phaseWeekId()) {
    p.history.unshift({ weekId:p.weekId, weekly:p.weekly || 0, rank:p.wrapsRank || 1, instability:p.instability || 0 });
    p.history = p.history.slice(0, 5);
    p.weekId = phaseWeekId();
    p.stability = 100 + Math.max(0, (p.wrapsRank || 1) - 1) * 8;
    p.weekly = 0;
    p.completed = {};
    p.weeklyClaimed = false;
    p.instability = Math.floor((p.instability || 0) * 0.55);
  }
  p.wrapsRank = Math.max(1, Math.min(PHASE_MAX_WRAP_RANK, p.wrapsRank));
  return p;
}

function phaseWrapBonus() {
  const rank = ensurePhaseDivingState().wrapsRank || 1;
  return {
    atkPct: rank * 2,
    hpPct: rank * 2,
    defPct: rank * 1.5,
    mastery: Math.max(0, rank - 1) * 1.2,
    haste: Math.max(0, rank - 1) * 0.8
  };
}

function phaseInstabilityLevel() {
  const p = ensurePhaseDivingState();
  return Math.max(0, Math.min(14, Math.floor((p.instability || 0) / 3) + Math.max(0, (p.wrapsRank || 1) - 1)));
}

function phaseDivingEnemyAffixFor(dg) {
  if (!dg) return null;
  const key = (typeof baseDungeonKey === 'function') ? baseDungeonKey(dg.key) : dg.key;
  const affected = ['archival_assault', 'ecodome_aldani', 'tazavesh_streets', 'tazavesh_gambit', 'overlook_zoshul', 'shadowpoint_breach', 'manaforge_omega', 'shandorah_conclave'].includes(key);
  if (!affected) return null;
  const lvl = phaseInstabilityLevel();
  if (lvl <= 0) return null;
  return {
    key: 'phaseInstability',
    name: '相位不稳定',
    icon: '🧿',
    desc: `Reshii Wraps 与相位潜航引发不稳定:小怪生命+${lvl * 4}%,首领生命+${lvl * 6}% 伤害+${Math.round(lvl * 3.5)}%。`,
    mod: { trashHp: lvl * 0.04, bossHp: lvl * 0.06, bossDmg: lvl * 0.035, addPatrol: lvl >= 3 }
  };
}

function phaseGrantRewards(r, label) {
  const p = ensurePhaseDivingState();
  state.gold += r.gold || 0;
  state.gem += r.gem || 0;
  if (typeof ensureMats === 'function') ensureMats();
  state.essence = (state.essence || 0) + (r.essence || 0);
  p.coins += r.coin || 0;
  p.strands += r.strands || 0;
  if (typeof rollItem === 'function' && label) {
    const item = rollItem('epic', 100 + (p.wrapsRank || 1), 'tazavesh_gambit', label, { minRarity:'epic' });
    if (item) {
      if (typeof addToInventory === 'function') addToInventory(item);
      else if (state.inventory) state.inventory.push(item);
      if (typeof eventsOnItemGet === 'function') eventsOnItemGet(item);
    }
  }
}

function phaseScout() {
  const p = ensurePhaseDivingState();
  const cost = 12;
  if (p.stability < cost) {
    if (typeof log === 'function') log('相位稳定度不足,等待周重置或减少通缉令追猎。', 'bad');
    return false;
  }
  p.stability -= cost;
  p.weekly = Math.min(PHASE_WEEKLY_GOAL, (p.weekly || 0) + 18);
  p.instability = Math.min(50, (p.instability || 0) + 1);
  phaseGrantRewards({ coin:1, gold:42000, gem:8, essence:8 }, '相位宝珠');
  if (typeof log === 'function') log('🧿 完成一次相位潜航:周常进度+18,相位不稳定+1', 'good');
  if (typeof saveState === 'function') saveState();
  if (typeof markDirty === 'function') markDirty('events', 'hero', 'inventory');
  return true;
}

function phaseRunWarrant(key) {
  const p = ensurePhaseDivingState();
  const w = PHASE_DIVING_WARRANTS.find(x => x.key === key);
  if (!w) return false;
  if ((p.wrapsRank || 1) < w.reqRank) {
    if (typeof log === 'function') log(`Reshii Wraps 需要 Rank ${w.reqRank}`, 'bad');
    return false;
  }
  if (p.completed[w.key]) {
    if (typeof log === 'function') log('本周已完成该通缉令', 'info');
    return false;
  }
  if (p.stability < w.cost) {
    if (typeof log === 'function') log('相位稳定度不足,无法继续追猎', 'bad');
    return false;
  }
  p.stability -= w.cost;
  p.weekly = Math.min(PHASE_WEEKLY_GOAL, (p.weekly || 0) + w.progress);
  p.instability = Math.min(60, (p.instability || 0) + w.pressure);
  p.completed[w.key] = true;
  phaseGrantRewards(w.rewards || {}, w.boss);
  if (typeof log === 'function') log(`${w.icon} 完成 ${w.name}: Ethereal Strands +${w.rewards.strands || 0}, Untethered Coin +${w.rewards.coin || 0}`, 'legend');
  if (typeof saveState === 'function') saveState();
  if (typeof markDirty === 'function') markDirty('events', 'hero', 'inventory', 'dungeon');
  return true;
}

function phaseClaimWeekly() {
  const p = ensurePhaseDivingState();
  if ((p.weekly || 0) < PHASE_WEEKLY_GOAL || p.weeklyClaimed) return false;
  p.weeklyClaimed = true;
  phaseGrantRewards({ coin:7, strands:1, gold:160000, gem:35, essence:30 }, '相位周常宝箱');
  if (typeof log === 'function') log('🌌 完成周常「More Than Just a Phase」: Untethered Coin +7, Ethereal Strands +1', 'legend');
  if (typeof saveState === 'function') saveState();
  if (typeof markDirty === 'function') markDirty('events', 'hero', 'inventory');
  return true;
}

function phaseUpgradeWraps() {
  const p = ensurePhaseDivingState();
  if ((p.wrapsRank || 1) >= PHASE_MAX_WRAP_RANK) return false;
  if ((p.strands || 0) < PHASE_WRAP_STRAND_COST) {
    if (typeof log === 'function') log(`Ethereal Strands 不足,升级需要 ${PHASE_WRAP_STRAND_COST}`, 'bad');
    return false;
  }
  p.strands -= PHASE_WRAP_STRAND_COST;
  p.wrapsRank += 1;
  p.instability = Math.min(60, (p.instability || 0) + 2);
  if (typeof recomputeStats === 'function') recomputeStats();
  if (typeof log === 'function') log(`🧣 Reshii Wraps 升至 Rank ${p.wrapsRank},角色属性提升,相位不稳定+2`, 'legend');
  if (typeof saveState === 'function') saveState();
  if (typeof markDirty === 'function') markDirty('events', 'hero', 'dungeon');
  return true;
}

function renderPhaseDivingSub() {
  const p = ensurePhaseDivingState();
  const rank = p.wrapsRank || 1;
  const instability = phaseInstabilityLevel();
  const weeklyPct = Math.min(100, Math.floor((p.weekly || 0) / PHASE_WEEKLY_GOAL * 100));
  const stabilityMax = 100 + Math.max(0, rank - 1) * 8;
  const stabilityPct = Math.max(0, Math.min(100, Math.floor((p.stability || 0) / stabilityMax * 100)));
  const phaseIcon = typeof symbolIconHtml === 'function' ? symbolIconHtml('inv_11_0_etherealraid_communicator_color1', 16, 'Reshii Wraps') : '🧿';
  const bonus = phaseWrapBonus();
  const canUpgrade = rank < PHASE_MAX_WRAP_RANK && (p.strands || 0) >= PHASE_WRAP_STRAND_COST;
  const warrantHtml = PHASE_DIVING_WARRANTS.map(w => {
    const done = !!p.completed[w.key];
    const locked = rank < w.reqRank;
    const can = !done && !locked && (p.stability || 0) >= w.cost;
    return `<div class="phase-warrant ${done ? 'done' : ''} ${locked ? 'locked' : ''}">
      <div class="phase-warrant-head"><b>${w.icon} ${w.name}</b><span class="pill">Rank ${w.reqRank}</span></div>
      <div class="muted">目标: ${w.boss}</div>
      <div class="phase-sync">同步强度: 不稳定+${w.pressure} · 稳定度-${w.cost} · 周常+${w.progress}</div>
      <div class="muted">奖励: ${w.rewards.coin} Untethered Coin · ${w.rewards.strands} Ethereal Strands · ${w.rewards.gem}💎</div>
      <button class="${can ? 'gold' : ''}" data-action="phasewarrant" data-key="${w.key}" ${can ? '' : 'disabled'}>${done ? '已完成' : locked ? '斗篷等级不足' : '追猎'}</button>
    </div>`;
  }).join('');
  return `<div class="phase-panel">
    <div class="phase-title">
      <span>${phaseIcon} 相位潜航</span>
      <span class="muted">Reshii Wraps Rank ${rank}/${PHASE_MAX_WRAP_RANK}</span>
    </div>
    <div class="phase-wallet">
      <span>Untethered Coin <b>${p.coins || 0}</b></span>
      <span>Ethereal Strands <b>${p.strands || 0}</b></span>
      <span>相位不稳定 <b>${instability}</b></span>
    </div>
    <div class="phase-bars">
      <div><div class="phase-bar-label"><span>相位稳定度</span><span>${p.stability || 0}/${stabilityMax}</span></div><div class="bar xp phase-stability"><i style="width:${stabilityPct}%"></i></div></div>
      <div><div class="phase-bar-label"><span>周常进度</span><span>${p.weekly || 0}/${PHASE_WEEKLY_GOAL}</span></div><div class="bar xp phase-weekly"><i style="width:${weeklyPct}%"></i></div></div>
    </div>
    <div class="phase-note">斗篷属性: 攻击+${bonus.atkPct}% · 生命+${bonus.hpPct}% · 防御+${bonus.defPct}% · 精通+${bonus.mastery.toFixed(1)}。不稳定会强化卡雷什副本与雷沙诺尔。</div>
    <div class="phase-actions">
      <button data-action="phasescout" class="${(p.stability || 0) >= 12 ? 'primary' : ''}" ${(p.stability || 0) >= 12 ? '' : 'disabled'}>相位巡游</button>
      <button data-action="phaseweekly" class="${(p.weekly || 0) >= PHASE_WEEKLY_GOAL && !p.weeklyClaimed ? 'gold' : ''}" ${(p.weekly || 0) >= PHASE_WEEKLY_GOAL && !p.weeklyClaimed ? '' : 'disabled'}>${p.weeklyClaimed ? '周常已领' : '领取周常'}</button>
      <button data-action="phaseupgrade" class="${canUpgrade ? 'gold' : ''}" ${canUpgrade ? '' : 'disabled'}>${rank >= PHASE_MAX_WRAP_RANK ? '斗篷已满' : `升级斗篷 ${PHASE_WRAP_STRAND_COST}材料`}</button>
    </div>
    <div class="phase-grid">${warrantHtml}</div>
  </div>`;
}

(function installPhaseDivingHooks() {
  const oldBonus = globalThis.collectProgressionBonus;
  if (typeof oldBonus === 'function' && !oldBonus._phaseWrapped) {
    function wrappedCollectProgressionBonus() {
      const out = Object.assign({}, oldBonus.apply(this, arguments) || {});
      const b = phaseWrapBonus();
      for (const [k, v] of Object.entries(b)) out[k] = (out[k] || 0) + v;
      return out;
    }
    wrappedCollectProgressionBonus._phaseWrapped = true;
    globalThis.collectProgressionBonus = wrappedCollectProgressionBonus;
  }

  const oldEnter = globalThis.enterDungeon;
  if (typeof oldEnter === 'function' && !oldEnter._phaseWrapped) {
    function wrappedEnterDungeon(key) {
      oldEnter.apply(this, arguments);
      const ds = state?.dungeonState;
      const dg = (typeof DUNGEONS !== 'undefined' ? DUNGEONS : []).find(d => d.key === key);
      const affix = phaseDivingEnemyAffixFor(dg);
      if (ds && affix && Array.isArray(ds.affixes) && !ds.affixes.some(a => a?.key === affix.key)) {
        ds.affixes.push(affix);
        if (typeof log === 'function') log(`🧿 相位不稳定强化了 ${dg.name}`, 'bad');
      }
    }
    wrappedEnterDungeon._phaseWrapped = true;
    globalThis.enterDungeon = wrappedEnterDungeon;
  }

  const oldBuildWb = globalThis.buildWorldBossMonsterData;
  if (typeof oldBuildWb === 'function' && !oldBuildWb._phaseWrapped) {
    function wrappedBuildWorldBossMonsterData(wb) {
      const mon = oldBuildWb.apply(this, arguments);
      if (wb?.key === 'reshanor') {
        const lvl = phaseInstabilityLevel();
        if (lvl > 0) {
          mon.hpMax = Math.floor(mon.hpMax * (1 + lvl * 0.06));
          mon.hp = mon.hpMax;
          mon.atk = Math.floor(mon.atk * (1 + lvl * 0.04));
          mon.dmgReduction = Math.min(0.82, (mon.dmgReduction || 0) + lvl * 0.01);
        }
      }
      return mon;
    }
    wrappedBuildWorldBossMonsterData._phaseWrapped = true;
    globalThis.buildWorldBossMonsterData = wrappedBuildWorldBossMonsterData;
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest && e.target.closest('button[data-action^="phase"]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (btn.dataset.action === 'phasescout') phaseScout();
    else if (btn.dataset.action === 'phasewarrant') phaseRunWarrant(btn.dataset.key);
    else if (btn.dataset.action === 'phaseweekly') phaseClaimWeekly();
    else if (btn.dataset.action === 'phaseupgrade') phaseUpgradeWraps();
    if (typeof renderEvents === 'function') renderEvents();
  }, true);
})();
