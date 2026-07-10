/* karesh_ecology.js - Eco-Dome Succession and Devourer Pressure */
const ECO_WEEKLY_GOAL = 100;
const ECO_SPECIES = [
  { key:'bees', name:'斯托颂蜜蜂', icon:'🐝', cost:18, stability:12, pressure:1, reward:{ samples:4, gold:52000, gem:8, essence:8 }, bonus:{ haste:0.4 } },
  { key:'thorntails', name:'影月刺尾蛇', icon:'🐍', cost:22, stability:15, pressure:2, reward:{ samples:5, gold:68000, gem:10, essence:10 }, bonus:{ atkPct:0.8 } },
  { key:'rays', name:'欧恩哈拉风鳐', icon:'🦅', cost:26, stability:18, pressure:2, reward:{ samples:6, gold:86000, gem:12, essence:12 }, bonus:{ spdPct:0.6 } },
  { key:'hydrobites', name:'水化幼体', icon:'🦎', cost:30, stability:22, pressure:3, reward:{ samples:7, gold:108000, gem:15, essence:15 }, bonus:{ hpPct:1.0 } },
];

function ecoWeekId(now) {
  return Math.floor((now || Date.now()) / (86400000 * 7));
}

function ensureEcoState() {
  if (typeof account === 'undefined' || !account) return { samples:0, stability:0, pressure:0, weekly:0, weekId:ecoWeekId(), species:{}, history:[] };
  if (!account.kareshEcology) account.kareshEcology = {};
  const eco = account.kareshEcology;
  if (typeof eco.samples !== 'number') eco.samples = 0;
  if (typeof eco.stability !== 'number') eco.stability = 0;
  if (typeof eco.pressure !== 'number') eco.pressure = 0;
  if (typeof eco.weekly !== 'number') eco.weekly = 0;
  if (typeof eco.weekId !== 'number') eco.weekId = ecoWeekId();
  if (!eco.species || typeof eco.species !== 'object') eco.species = {};
  if (!Array.isArray(eco.history)) eco.history = [];
  if (eco.weekId !== ecoWeekId()) {
    eco.history.unshift({ weekId:eco.weekId, weekly:eco.weekly || 0, stability:eco.stability || 0, pressure:eco.pressure || 0 });
    eco.history = eco.history.slice(0, 5);
    eco.weekId = ecoWeekId();
    eco.weekly = 0;
    eco.weeklyClaimed = false;
    eco.pressure = Math.floor((eco.pressure || 0) * 0.6);
  }
  return eco;
}

function ecoSpeciesRank(key) {
  return ensureEcoState().species[key] || 0;
}

function ecoRank() {
  const eco = ensureEcoState();
  return Object.values(eco.species || {}).reduce((sum, v) => sum + (v || 0), 0);
}

function ecoBonus() {
  const out = {};
  for (const sp of ECO_SPECIES) {
    const rank = ecoSpeciesRank(sp.key);
    if (!rank) continue;
    for (const [k, v] of Object.entries(sp.bonus || {})) out[k] = (out[k] || 0) + v * rank;
  }
  const total = ecoRank();
  if (total >= 4) out.mastery = (out.mastery || 0) + 1.5;
  if (total >= 8) out.vers = (out.vers || 0) + 1.2;
  return out;
}

function ecoPressureLevel() {
  const eco = ensureEcoState();
  return Math.max(0, Math.min(14, Math.floor((eco.pressure || 0) / 3) + Math.floor(ecoRank() / 2)));
}

function ecoEnemyAffixFor(dg) {
  if (!dg) return null;
  const key = (typeof baseDungeonKey === 'function') ? baseDungeonKey(dg.key) : dg.key;
  const affected = ['ecodome_aldani', 'oasis_succession', 'archival_assault', 'manaforge_omega'].includes(key);
  if (!affected) return null;
  const lvl = ecoPressureLevel();
  if (lvl <= 0) return null;
  return {
    key: 'devourerPressure',
    name: '吞噬压力',
    icon: '🦎',
    desc: `生态演替吸引吞噬者:小怪生命+${lvl * 5}%,首领生命+${lvl * 6}% 伤害+${lvl * 3}%。`,
    mod: { trashHp:lvl * 0.05, bossHp:lvl * 0.06, bossDmg:lvl * 0.03, addPatrol:lvl >= 3 }
  };
}

function ecoApplyReward(r, label) {
  const eco = ensureEcoState();
  eco.samples += r.samples || 0;
  state.gold += r.gold || 0;
  state.gem += r.gem || 0;
  if (typeof ensureMats === 'function') ensureMats();
  state.essence = (state.essence || 0) + (r.essence || 0);
  if (typeof rollItem === 'function' && label) {
    const it = rollItem('epic', 100, 'oasis_succession', label, { minRarity:'epic' });
    if (it) {
      if (typeof addToInventory === 'function') addToInventory(it);
      else if (state.inventory) state.inventory.push(it);
      if (typeof eventsOnItemGet === 'function') eventsOnItemGet(it);
    }
  }
}

function ecoCollectSamples() {
  const eco = ensureEcoState();
  eco.samples += 12;
  eco.weekly = Math.min(ECO_WEEKLY_GOAL, (eco.weekly || 0) + 16);
  eco.pressure = Math.min(60, (eco.pressure || 0) + 1);
  ecoApplyReward({ gold:38000, gem:6, essence:7 }, '生态样本箱');
  if (typeof log === 'function') log('🌱 收集生态样本:样本+12,周常+16,吞噬压力+1', 'good');
  if (typeof markDirty === 'function') markDirty('events', 'hero', 'inventory');
  if (typeof saveState === 'function') saveState();
}

function ecoReleaseSpecies(key) {
  const sp = ECO_SPECIES.find(x => x.key === key);
  if (!sp) return false;
  const eco = ensureEcoState();
  if ((eco.samples || 0) < sp.cost) {
    if (typeof log === 'function') log(`生态样本不足,需要 ${sp.cost}`, 'bad');
    return false;
  }
  eco.samples -= sp.cost;
  eco.species[sp.key] = (eco.species[sp.key] || 0) + 1;
  eco.stability += sp.stability;
  eco.weekly = Math.min(ECO_WEEKLY_GOAL, (eco.weekly || 0) + 24);
  eco.pressure = Math.min(60, (eco.pressure || 0) + sp.pressure);
  ecoApplyReward(sp.reward || {}, sp.name);
  if (typeof recomputeStats === 'function') recomputeStats();
  if (typeof log === 'function') log(`${sp.icon} 放归 ${sp.name}:生态稳定+${sp.stability},吞噬压力+${sp.pressure}`, 'legend');
  if (typeof markDirty === 'function') markDirty('events', 'hero', 'inventory', 'dungeon');
  if (typeof saveState === 'function') saveState();
  return true;
}

function ecoDefendDome() {
  const eco = ensureEcoState();
  const pressure = Math.max(1, ecoPressureLevel());
  eco.pressure = Math.max(0, (eco.pressure || 0) - 4);
  eco.stability += 10 + pressure;
  eco.weekly = Math.min(ECO_WEEKLY_GOAL, (eco.weekly || 0) + 32);
  ecoApplyReward({ samples:8, gold:88000 + pressure * 7000, gem:12 + pressure, essence:14 + pressure }, '吞噬者防卫战');
  if (typeof log === 'function') log(`🛡️ 完成生态圆顶防卫:吞噬压力-4,生态稳定+${10 + pressure}`, 'legend');
  if (typeof markDirty === 'function') markDirty('events', 'hero', 'inventory');
  if (typeof saveState === 'function') saveState();
}

function ecoClaimWeekly() {
  const eco = ensureEcoState();
  if ((eco.weekly || 0) < ECO_WEEKLY_GOAL || eco.weeklyClaimed) return false;
  eco.weeklyClaimed = true;
  eco.samples += 25;
  eco.stability += 25;
  ecoApplyReward({ gold:180000, gem:36, essence:32 }, '生态演替周常宝箱');
  if (typeof log === 'function') log('🌱 完成生态演替周常:样本+25,生态稳定+25', 'legend');
  if (typeof markDirty === 'function') markDirty('events', 'hero', 'inventory');
  if (typeof saveState === 'function') saveState();
  return true;
}

function renderKareshEcologySub() {
  const eco = ensureEcoState();
  const rank = ecoRank();
  const pressure = ecoPressureLevel();
  const weeklyPct = Math.min(100, Math.floor((eco.weekly || 0) / ECO_WEEKLY_GOAL * 100));
  const stabilityPct = Math.max(0, Math.min(100, Math.floor((eco.stability || 0) / Math.max(100, 80 + rank * 15) * 100)));
  const icon = typeof symbolIconHtml === 'function' ? symbolIconHtml('🌱', 16, '生态演替', 'spell_nature_naturetouchgrow') : '🌱';
  const bonus = ecoBonus();
  const speciesHtml = ECO_SPECIES.map(sp => {
    const r = ecoSpeciesRank(sp.key);
    const can = (eco.samples || 0) >= sp.cost;
    return `<div class="eco-species ${r ? 'active' : ''}">
      <div class="eco-species-head"><b>${sp.icon} ${sp.name}</b><span class="pill">Rank ${r}</span></div>
      <div class="muted">放归成本 ${sp.cost} 样本 · 稳定+${sp.stability} · 压力+${sp.pressure}</div>
      <div class="eco-sync">属性成长: ${Object.entries(sp.bonus || {}).map(([k,v]) => `${k}+${v}`).join(' · ')}</div>
      <button class="${can ? 'gold' : ''}" data-action="ecorelease" data-key="${sp.key}" ${can ? '' : 'disabled'}>放归</button>
    </div>`;
  }).join('');
  return `<div class="eco-panel">
    <div class="eco-title">
      <span>${icon} 生态演替</span>
      <span class="muted">演替等级 ${rank} · 吞噬压力 ${pressure}</span>
    </div>
    <div class="eco-wallet">
      <span>生态样本 <b>${eco.samples || 0}</b></span>
      <span>生态稳定 <b>${eco.stability || 0}</b></span>
      <span>吞噬压力 <b>${eco.pressure || 0}</b></span>
    </div>
    <div class="eco-bars">
      <div><div class="eco-bar-label"><span>生态稳定</span><span>${stabilityPct}%</span></div><div class="bar xp eco-stability"><i style="width:${stabilityPct}%"></i></div></div>
      <div><div class="eco-bar-label"><span>周常进度</span><span>${eco.weekly || 0}/${ECO_WEEKLY_GOAL}</span></div><div class="bar xp eco-weekly"><i style="width:${weeklyPct}%"></i></div></div>
    </div>
    <div class="eco-note">账号加成: 攻击+${(bonus.atkPct || 0).toFixed(1)}% · 生命+${(bonus.hpPct || 0).toFixed(1)}% · 急速+${(bonus.haste || 0).toFixed(1)} · 精通+${(bonus.mastery || 0).toFixed(1)}。演替越高,生态圆顶与法力熔炉敌人会随吞噬压力增强。</div>
    <div class="eco-actions">
      <button data-action="ecocollect" class="primary">采集样本</button>
      <button data-action="ecodefend" class="${pressure > 0 ? 'danger' : ''}">防卫圆顶</button>
      <button data-action="ecoweekly" class="${(eco.weekly || 0) >= ECO_WEEKLY_GOAL && !eco.weeklyClaimed ? 'gold' : ''}" ${(eco.weekly || 0) >= ECO_WEEKLY_GOAL && !eco.weeklyClaimed ? '' : 'disabled'}>${eco.weeklyClaimed ? '周常已领' : '领取周常'}</button>
    </div>
    <div class="eco-grid">${speciesHtml}</div>
  </div>`;
}

(function installKareshEcologyHooks() {
  const oldBonus = globalThis.collectProgressionBonus;
  if (typeof oldBonus === 'function' && !oldBonus._ecoWrapped) {
    function wrappedCollectProgressionBonus() {
      const out = Object.assign({}, oldBonus.apply(this, arguments) || {});
      const b = ecoBonus();
      for (const [k, v] of Object.entries(b)) out[k] = (out[k] || 0) + v;
      return out;
    }
    wrappedCollectProgressionBonus._ecoWrapped = true;
    globalThis.collectProgressionBonus = wrappedCollectProgressionBonus;
  }

  const oldEnter = globalThis.enterDungeon;
  if (typeof oldEnter === 'function' && !oldEnter._ecoWrapped) {
    function wrappedEnterDungeon(key) {
      oldEnter.apply(this, arguments);
      const ds = state?.dungeonState;
      const dg = (typeof DUNGEONS !== 'undefined' ? DUNGEONS : []).find(d => d.key === key);
      const affix = ecoEnemyAffixFor(dg);
      if (ds && affix && Array.isArray(ds.affixes) && !ds.affixes.some(a => a?.key === affix.key)) {
        ds.affixes.push(affix);
        if (typeof log === 'function') log(`🦎 吞噬压力强化了 ${dg.name}`, 'bad');
      }
    }
    wrappedEnterDungeon._ecoWrapped = true;
    globalThis.enterDungeon = wrappedEnterDungeon;
  }

  const oldBuildWb = globalThis.buildWorldBossMonsterData;
  if (typeof oldBuildWb === 'function' && !oldBuildWb._ecoWrapped) {
    function wrappedBuildWorldBossMonsterData(wb) {
      const mon = oldBuildWb.apply(this, arguments);
      if (wb?.key === 'reshanor') {
        const lvl = ecoPressureLevel();
        if (lvl > 0) {
          mon.hpMax = Math.floor(mon.hpMax * (1 + lvl * 0.04));
          mon.hp = mon.hpMax;
          mon.atk = Math.floor(mon.atk * (1 + lvl * 0.03));
        }
      }
      return mon;
    }
    wrappedBuildWorldBossMonsterData._ecoWrapped = true;
    globalThis.buildWorldBossMonsterData = wrappedBuildWorldBossMonsterData;
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest && e.target.closest('button[data-action^="eco"]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (btn.dataset.action === 'ecocollect') ecoCollectSamples();
    else if (btn.dataset.action === 'ecorelease') ecoReleaseSpecies(btn.dataset.key);
    else if (btn.dataset.action === 'ecodefend') ecoDefendDome();
    else if (btn.dataset.action === 'ecoweekly') ecoClaimWeekly();
    if (typeof renderEvents === 'function') renderEvents();
  }, true);
})();
