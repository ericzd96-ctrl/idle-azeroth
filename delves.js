/* delves.js - daily Delves and Bountiful Coffers */
const DELVE_KEY_SHARDS_PER_KEY = 100;
const DELVE_DAILY_BOUNTIFUL_COUNT = 4;
const DELVE_BOUNTIFUL_AFFIX = {
  key: 'bountifulDelve',
  name: '丰裕地下堡',
  icon: '🗝️',
  desc: '丰裕宝匣吸引额外守卫:小怪生命+18%,首领生命+28%且伤害+18%,并可能出现巡逻。',
  mod: { trashHp: 0.18, bossHp: 0.28, bossDmg: 0.18, addPatrol: true }
};

function ensureDelveState() {
  if (typeof account === 'undefined' || !account) return { keys: 0, shards: 0, claimed: {}, bestTier: {} };
  if (!account.delves) account.delves = {};
  const d = account.delves;
  if (typeof d.keys !== 'number') d.keys = 0;
  if (typeof d.shards !== 'number') d.shards = 0;
  if (!d.claimed || typeof d.claimed !== 'object') d.claimed = {};
  if (!d.bestTier || typeof d.bestTier !== 'object') d.bestTier = {};
  return d;
}

function delveDay(now) {
  return Math.floor((now || Date.now()) / 86400000);
}

function delveResetAt(now) {
  return (delveDay(now) + 1) * 86400000;
}

function delveBaseKey(key) {
  return (typeof baseDungeonKey === 'function')
    ? baseDungeonKey(key)
    : String(key || '').replace(/_(epic|heroic|epic5)$/, '');
}

function getBaseDelveDef(key) {
  const baseKey = delveBaseKey(typeof key === 'string' ? key : key?.key);
  return (typeof DUNGEONS !== 'undefined' ? DUNGEONS : []).find(d => d.key === baseKey) || null;
}

function isDelveDungeon(dgOrKey) {
  const dg = getBaseDelveDef(dgOrKey);
  return !!dg?.delve;
}

function delveHash(seed) {
  let x = seed >>> 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return x >>> 0;
}

function todayBountifulDelveKeys(now) {
  const day = delveDay(now);
  const delves = (typeof DUNGEONS !== 'undefined' ? DUNGEONS : []).filter(d => d.delve && d.key === delveBaseKey(d.key));
  const shuffled = delves
    .map((dg, i) => ({ dg, score: delveHash((day + 157) * 1103515245 + i * 7919 + String(dg.key).length * 97) }))
    .sort((a, b) => a.score - b.score)
    .map(x => x.dg.key);
  return shuffled.slice(0, Math.min(DELVE_DAILY_BOUNTIFUL_COUNT, shuffled.length));
}

function delveClaimKey(baseKey, now) {
  return `${delveDay(now)}:${baseKey}`;
}

function delveRunTier(dgOrKey) {
  const dg = typeof dgOrKey === 'string'
    ? ((typeof DUNGEONS !== 'undefined' ? DUNGEONS : []).find(d => d.key === dgOrKey) || getBaseDelveDef(dgOrKey))
    : dgOrKey;
  const base = getBaseDelveDef(dg);
  const req = (dg && dg.reqLvl) || (base && base.reqLvl) || 80;
  let tier = Math.floor((req - 82) / 2) + 5;
  if (dg?.heroic) tier += 1;
  if (dg?.epic5) tier += 2;
  if (dg?.epicRaid) tier += 2;
  return Math.max(1, Math.min(11, tier));
}

function delveBountifulInfo(dgOrKey, now) {
  const base = getBaseDelveDef(dgOrKey);
  if (!base) return null;
  const d = ensureDelveState();
  const baseKey = base.key;
  const active = todayBountifulDelveKeys(now).includes(baseKey);
  const claimId = delveClaimKey(baseKey, now);
  const claimed = !!d.claimed[claimId];
  return {
    baseKey,
    baseName: base.name,
    active,
    claimed,
    claimId,
    resetAt: delveResetAt(now),
    tier: delveRunTier(dgOrKey)
  };
}

function delveBountifulAffixFor(dg) {
  const info = delveBountifulInfo(dg);
  if (!info || !info.active || info.claimed) return null;
  return { ...DELVE_BOUNTIFUL_AFFIX };
}

function grantDelveShards(amount) {
  const d = ensureDelveState();
  d.shards += Math.max(0, Math.floor(amount || 0));
  let made = 0;
  while (d.shards >= DELVE_KEY_SHARDS_PER_KEY) {
    d.shards -= DELVE_KEY_SHARDS_PER_KEY;
    d.keys += 1;
    made += 1;
  }
  if (made && typeof log === 'function') log(`🗝️ 钥匙碎片合成为修复钥匙 +${made}`, 'legend');
  return made;
}

function grantDelveRewardItem(dg, tier, consumedKey) {
  if (typeof rollItem !== 'function' && typeof rollItemOfRarity !== 'function') return null;
  const lastBoss = (dg.bosses || [])[Math.max(0, (dg.bosses || []).length - 1)];
  const rarity = consumedKey && tier >= 10 && Math.random() < 0.22 ? 'legend' : 'epic';
  const item = typeof rollItem === 'function'
    ? rollItem(rarity, (dg.reqLvl || 80) + tier, delveBaseKey(dg.key), lastBoss ? lastBoss.name : null, { minRarity: consumedKey ? 'epic' : 'rare' })
    : rollItemOfRarity(rarity, (dg.reqLvl || 80) + tier);
  if (!item) return null;
  if (typeof addToInventory === 'function') addToInventory(item);
  else if (state?.inventory) state.inventory.push(item);
  if (typeof eventsOnItemGet === 'function') eventsOnItemGet(item);
  if (item.rarity === 'legend' && typeof progressionOnLegendary === 'function') progressionOnLegendary();
  return item;
}

function grantDelveClearReward(dg, ds) {
  const info = delveBountifulInfo(dg);
  if (!info) return '';
  const d = ensureDelveState();
  const tier = Math.max(info.tier || 1, delveRunTier(dg));
  d.bestTier[info.baseKey] = Math.max(d.bestTier[info.baseKey] || 0, tier);
  const baseShards = 18 + tier * 4;
  const bonusShards = info.active && !info.claimed ? 35 + tier * 3 : 0;
  const madeKeys = grantDelveShards(baseShards + bonusShards);
  let consumedKey = false;
  let cofferState = '';
  let item = null;
  let gold = Math.floor((dg.reqLvl || 80) * (info.active ? 44 : 22) * (1 + tier * 0.04));
  let gem = Math.max(2, Math.floor(tier / 2));
  let essence = Math.max(3, tier + (info.active ? 6 : 0));

  if (info.active && !info.claimed) {
    d.claimed[info.claimId] = true;
    if (d.keys > 0) {
      d.keys -= 1;
      consumedKey = true;
      cofferState = '丰裕宝匣已开启';
      item = grantDelveRewardItem(dg, tier, true);
      if (typeof worldsoulOnBountifulCoffer === 'function') worldsoulOnBountifulCoffer(dg, tier);
    } else {
      cofferState = '丰裕宝匣已发现,但缺少修复钥匙';
      gold = Math.floor(gold * 0.55);
    }
  } else if (info.claimed) {
    cofferState = '今日丰裕宝匣已领取';
  } else {
    cofferState = '普通地下堡奖励';
  }

  state.gold += gold;
  state.gem += gem;
  if (typeof ensureMats === 'function') ensureMats();
  state.essence = (state.essence || 0) + essence;

  if (typeof log === 'function') {
    log(`🗝️ 地下堡结算: 碎片+${baseShards + bonusShards} 金币+${gold} 钻石+${gem} 精华+${essence}`, consumedKey ? 'legend' : 'good');
  }
  if (typeof markDirty === 'function') markDirty('hero', 'inventory', 'dungeon');
  const itemHtml = item ? `<div>🎁 宝匣装备 <span class="${item.cls}">${item.name}${typeof itemEpicRaidBadge === 'function' ? itemEpicRaidBadge(item, true) : ''}</span></div>` : '';
  const keyHtml = madeKeys ? `<div>🗝️ 新合成修复钥匙 +${madeKeys}</div>` : '';
  return `
    <div class="delve-clear">
      <div style="font-weight:700">${consumedKey ? '🗝️' : '📦'} ${cofferState} · 第 ${tier} 层</div>
      <div>钥匙碎片 +${baseShards + bonusShards} · 💰 金币 +${gold} · 💎 钻石 +${gem} · ✨ 精华 +${essence}</div>
      ${keyHtml}
      ${itemHtml}
    </div>`;
}

function renderDelvePanel() {
  const el = $('delve-panel');
  if (!el) return;
  const delves = (typeof DUNGEONS !== 'undefined' ? DUNGEONS : []).filter(d => d.delve && d.key === delveBaseKey(d.key));
  if (!delves.length) {
    el.innerHTML = '';
    return;
  }
  const d = ensureDelveState();
  const keys = todayBountifulDelveKeys();
  const leftMs = Math.max(0, delveResetAt() - Date.now());
  const rows = keys.map(key => {
    const dg = delves.find(x => x.key === key);
    const info = delveBountifulInfo(key);
    const done = !!info?.claimed;
    const tier = delveRunTier(dg);
    const icon = typeof dungeonIcon === 'function' ? dungeonIcon(key, dg?.name, 16, dg?.icon || '🗝️') : (dg?.icon || '🗝️');
    return `<div class="delve-mini ${done ? 'done' : ''}">
      <div><b>${icon} ${dg?.name || key}</b> <span class="muted">第 ${tier} 层</span>${done ? ' <span class="pos">已开箱</span>' : ''}</div>
      <div class="muted">丰裕宝匣 · 需修复钥匙 · 敌人获得丰裕守卫强化</div>
    </div>`;
  }).join('');
  const keyIcon = typeof symbolIconHtml === 'function' ? symbolIconHtml('🗝️', 15, '修复钥匙', 'inv_10_blacksmithing_consumable_key_color1') : '🗝️';
  el.innerHTML = `
    <div class="delve-panel">
      <div class="delve-title">
        <span>${keyIcon} 丰裕地下堡</span>
        <span class="muted">刷新 ${fmtCd(Math.ceil(leftMs / 1000))}</span>
      </div>
      <div class="delve-wallet">
        <span>修复钥匙 <b>${d.keys}</b></span>
        <span>钥匙碎片 <b>${d.shards}/${DELVE_KEY_SHARDS_PER_KEY}</b></span>
        <span>今日目标 <b>${keys.length}</b></span>
      </div>
      <div class="delve-grid">${rows}</div>
    </div>`;
}

function renderDelveCardLine(dg) {
  const info = delveBountifulInfo(dg);
  if (!info) return '';
  const active = info.active && !info.claimed;
  if (!active && !info.claimed) return '';
  const label = info.claimed ? '今日丰裕已完成' : `今日丰裕 · 第 ${info.tier} 层 · 宝匣需修复钥匙`;
  return `<div class="delve-card-line ${info.claimed ? 'done' : ''}">🗝️ ${label}</div>`;
}

(function installDelveHooks() {
  const oldEnter = globalThis.enterDungeon;
  if (typeof oldEnter === 'function' && !oldEnter._delveWrapped) {
    function wrappedEnterDungeon(key) {
      oldEnter.apply(this, arguments);
      const ds = state?.dungeonState;
      const dg = (typeof DUNGEONS !== 'undefined' ? DUNGEONS : []).find(d => d.key === key);
      if (!ds || !dg || !isDelveDungeon(dg)) return;
      const info = delveBountifulInfo(dg);
      ds.delveRun = info;
      const affix = delveBountifulAffixFor(dg);
      if (affix && Array.isArray(ds.affixes) && !ds.affixes.some(a => a?.key === affix.key)) {
        ds.affixes.push(affix);
        if (typeof log === 'function') log(`🗝️ ${dg.name} 出现丰裕宝匣:守卫生命与首领伤害提高`, 'legend');
      }
    }
    wrappedEnterDungeon._delveWrapped = true;
    globalThis.enterDungeon = wrappedEnterDungeon;
  }

  const oldClear = globalThis.onDungeonClear;
  if (typeof oldClear === 'function' && !oldClear._delveWrapped) {
    function wrappedOnDungeonClear(dg) {
      const ds = state?.dungeonState;
      const delveHtml = isDelveDungeon(dg) ? grantDelveClearReward(dg, ds) : '';
      oldClear.apply(this, arguments);
      if (delveHtml) {
        const el = $('dungeon-clear-text');
        if (el) el.innerHTML += delveHtml;
      }
    }
    wrappedOnDungeonClear._delveWrapped = true;
    globalThis.onDungeonClear = wrappedOnDungeonClear;
  }
})();
