/* =========================================================
   vault.js — 每周宝库 / Great Vault(账号共享,周常 endgame 取舍)
   ----------------------------------------------------------
   设计:把"本周做了多少 endgame 活动"沉淀成奖励槽,每周结算时从已解锁的
        多个高价值奖励里【只能选 1 件】—— 量变(刷活跃)→ 质变(传说级取舍)。
   三条赛道,各 3 档阈值(达到即解锁 1 个奖励槽):
     🏰 探险  = 普通副本通关          [2 / 5 / 10]
     🌀 险境  = 大秘境完成 + 无尽塔刷新最高层  [1 / 3 / 6]
     ⚔️ 征服  = 竞技场排位胜利        [3 / 7 / 12]
   进度每周重置;周结算时把上周进度"锁入"成可领宝库(reward),玩家挑 1 件领取。
   宽容:已锁入但未领的宝库不会被新周覆盖(领取后下次周结算才再生成)→ 永不丢已得宝库。
   存档:account.vault = { week, prog:{dungeon,mythic,arena}, reward:{week,slots:[...],claimed,chosen} }
   slots 只存奖励"描述符"(不存具体物品),领取时按当前角色等级即时生成 → 无等级陈旧。
   ========================================================= */

const VAULT_TRACKS = [
  { key:'dungeon', name:'探险', icon:'🏰', unit:'副本',     thresholds:[2, 5, 10] },
  { key:'mythic',  name:'险境', icon:'🌀', unit:'大秘境/塔层', thresholds:[1, 3, 6] },
  { key:'arena',   name:'征服', icon:'⚔️', unit:'排位胜',   thresholds:[3, 7, 12] },
];

function vaultWeekIndex() { return Math.floor(Date.now() / 86400000 / 7); }

function ensureVaultState() {
  if (typeof account === 'undefined' || !account) return null;
  if (!account.vault || typeof account.vault !== 'object') {
    account.vault = { week: vaultWeekIndex(), prog: { dungeon:0, mythic:0, arena:0 }, reward: null };
  }
  const v = account.vault;
  if (typeof v.week !== 'number') v.week = vaultWeekIndex();
  if (!v.prog || typeof v.prog !== 'object') v.prog = { dungeon:0, mythic:0, arena:0 };
  for (const t of VAULT_TRACKS) if (typeof v.prog[t.key] !== 'number') v.prog[t.key] = 0;
  const thisWeek = vaultWeekIndex();
  if (v.week !== thisWeek) {
    // 周结算:仅在没有"未领宝库"时才把上周进度锁入(避免覆盖未领的宝库 → 永不丢已得)
    if (!v.reward || v.reward.claimed) {
      const slots = buildVaultSlots(v.prog);
      if (slots.length) {
        v.reward = { week: v.week, slots, claimed: false, chosen: -1 };
        if (typeof log === 'function') log(`🎁 上周宝库已就绪:${slots.length} 个奖励槽待你挑选 1 件!`, 'legend');
      }
    }
    v.prog = { dungeon:0, mythic:0, arena:0 };
    v.week = thisWeek;
  }
  return v;
}

/* 进度推进 — 由 endgame 事件中央点调用 */
function vaultAdvance(track, n) {
  const v = ensureVaultState(); if (!v) return;
  if (!(track in v.prog)) return;
  v.prog[track] = (v.prog[track] || 0) + (n || 1);
  markDirty('vault');
}

/* 本周已解锁槽数(按阈值) */
function vaultUnlockedSlots(prog) {
  let n = 0;
  for (const tr of VAULT_TRACKS) {
    const p = (prog || {})[tr.key] || 0;
    for (const th of tr.thresholds) if (p >= th) n++;
  }
  return n;
}

/* 锁入:为每个达标阈值生成 1 个奖励槽(描述符在此固定,具体物品领取时再生成) */
function buildVaultSlots(prog) {
  const slots = [];
  for (const tr of VAULT_TRACKS) {
    const p = (prog || {})[tr.key] || 0;
    tr.thresholds.forEach((th, i) => {
      if (p >= th) slots.push(Object.assign({ track: tr.key, tier: i + 1 }, rollVaultReward(i + 1)));
    });
  }
  return slots;
}

function rollVaultReward(tier) {
  const r = Math.random();
  if (tier >= 3) {
    if (r < 0.40) return { kind:'gear', rarity:'legend' };
    if (r < 0.70) return { kind:'relic', rarity:'legend' };
    if (r < 0.85) return { kind:'res', res:'gem', amount:60 };
    return { kind:'res', res:'compTickets', amount:3 };
  } else if (tier === 2) {
    if (r < 0.40) return { kind:'gear', rarity:'legend' };
    if (r < 0.65) return { kind:'relic', rarity:'epic' };
    if (r < 0.85) return { kind:'res', res:'gem', amount:35 };
    return { kind:'res', res:'essence', amount:60 };
  }
  if (r < 0.45) return { kind:'gear', rarity:'epic' };
  if (r < 0.70) return { kind:'relic', rarity:'epic' };
  if (r < 0.85) return { kind:'res', res:'gem', amount:20 };
  return { kind:'res', res:'essence', amount:35 };
}

const VAULT_RES_ICON = { gem:'💎', essence:'🔮', compTickets:'🎟️', gold:'💰', honor:'🎖️' };
function vaultSlotText(slot) {
  if (!slot) return '';
  if (slot.kind === 'gear') return `${slot.rarity === 'legend' ? '传说' : '史诗'}装备(当前等级)`;
  if (slot.kind === 'relic') return `${slot.rarity === 'legend' ? '传说' : '史诗'}神器遗物`;
  if (slot.kind === 'res') return `${slot.amount}${VAULT_RES_ICON[slot.res] || ''}`;
  return '神秘奖励';
}
function vaultSlotIcon(slot) {
  if (!slot) return '🎁';
  if (slot.kind === 'gear') return '⚔️';
  if (slot.kind === 'relic') return '🗿';
  return VAULT_RES_ICON[slot.res] || '🎁';
}

function grantVaultSlot(slot) {
  if (slot.kind === 'gear') {
    const it = (typeof rollItemOfRarity === 'function') ? rollItemOfRarity(slot.rarity, state.hero.lvl) : null;
    if (it) {
      if (typeof syncItemIdentity === 'function') syncItemIdentity(it);
      state.inventory.push(it);
      markDirty('inventory');
      log(`🎁 宝库:获得 ${it.name}`, 'legend');
    }
  } else if (slot.kind === 'relic') {
    if (typeof makeRelic === 'function' && typeof relicBag === 'function') {
      const rl = makeRelic(null, slot.rarity);
      relicBag().push(rl);
      markDirty('artifact');
      log(`🎁 宝库:获得 ${(typeof relicDisplayName === 'function') ? relicDisplayName(rl) : '遗物'}`, 'legend');
    }
  } else if (slot.kind === 'res') {
    state[slot.res] = (state[slot.res] || 0) + slot.amount;
    log(`🎁 宝库:获得 ${slot.amount}${VAULT_RES_ICON[slot.res] || ''}`, 'legend');
  }
}

function claimVault(idx) {
  const v = ensureVaultState(); if (!v) return;
  const reward = v.reward;
  if (!reward || reward.claimed || !Array.isArray(reward.slots)) { log('当前没有可领取的宝库', 'info'); return; }
  idx = +idx;
  const slot = reward.slots[idx];
  if (!slot) return;
  grantVaultSlot(slot);
  reward.claimed = true;
  reward.chosen = idx;
  markDirty('vault', 'hero');
  if (typeof renderVault === 'function') renderVault();
  if (typeof saveState === 'function') saveState();
}

/* 有未领宝库(红点/引导用) */
function vaultHasReward() {
  const v = ensureVaultState(); if (!v) return false;
  return !!(v.reward && !v.reward.claimed && Array.isArray(v.reward.slots) && v.reward.slots.length);
}

/* ---------- 渲染 ---------- */
function vaultTrackRowHtml(v, tr) {
  const p = v.prog[tr.key] || 0;
  const maxTh = tr.thresholds[tr.thresholds.length - 1];
  const pct = Math.min(100, Math.round(p / maxTh * 100));
  const pips = tr.thresholds.map(th => {
    const on = p >= th;
    return `<div style="flex:1;text-align:center">
      <div style="font-size:15px;filter:${on ? 'none' : 'grayscale(1) opacity(.4)'}">${on ? '🎁' : '🔒'}</div>
      <div class="muted" style="font-size:9px">${th} ${tr.unit}</div>
    </div>`;
  }).join('');
  return `<div style="padding:8px;border:1px solid var(--border);border-radius:10px;margin-bottom:6px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12px;margin-bottom:5px">
      <b>${tr.icon} ${tr.name}</b>
      <span class="muted" style="font-size:10px">本周 ${p}/${maxTh} ${tr.unit}</span>
    </div>
    <div class="bar xp" style="margin-bottom:6px"><i style="width:${pct}%"></i></div>
    <div style="display:flex;gap:4px">${pips}</div>
  </div>`;
}

function renderVault() {
  const panel = document.getElementById('tab-vault');
  if (!panel) return;
  const v = ensureVaultState();
  if (!v) { panel.innerHTML = '<div class="muted">读取中…</div>'; return; }

  const unlocked = vaultUnlockedSlots(v.prog);
  let html = `<div style="margin-bottom:8px">
    <div style="font-weight:bold;font-size:15px">🎁 每周宝库</div>
    <div class="muted" style="font-size:11px;margin-top:2px">本周积累 endgame 活跃度解锁奖励槽,下周结算时从中<b>挑选 1 件</b>领取。本周进度跨周重置。</div>
  </div>`;

  // 可领宝库(上周锁入)
  if (vaultHasReward()) {
    html += `<div class="ascend-box" style="border-color:var(--legend)">
      <div class="detail-label" style="color:var(--legend)">✨ 宝库已就绪 — 挑选 1 件领取</div>
      <div class="muted" style="font-size:10px;margin-bottom:6px">只能选择其中 <b>1 个</b>奖励,选定后本期宝库关闭。</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px">`;
    v.reward.slots.forEach((slot, i) => {
      const trk = VAULT_TRACKS.find(t => t.key === slot.track);
      html += `<button data-action="claimVault" data-idx="${i}" style="text-align:left;padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.03);color:inherit;white-space:normal">
        <div style="font-size:22px">${vaultSlotIcon(slot)}</div>
        <div style="font-weight:bold;font-size:12px;margin-top:2px">${vaultSlotText(slot)}</div>
        <div class="muted" style="font-size:10px;margin-top:2px">${trk ? trk.icon + trk.name : ''} · 第 ${slot.tier} 档</div>
      </button>`;
    });
    html += `</div></div>`;
  } else if (v.reward && v.reward.claimed && v.reward.chosen >= 0) {
    const slot = v.reward.slots[v.reward.chosen];
    html += `<div class="ascend-box"><div class="muted" style="font-size:11px">本期宝库已领取:<b>${vaultSlotIcon(slot)} ${vaultSlotText(slot)}</b> — 继续积累本周进度,下周再开。</div></div>`;
  }

  // 本周进度
  html += `<div class="ascend-box">
    <div class="detail-label">📈 本周进度 <span class="muted" style="font-weight:normal">(已解锁 ${unlocked} 个奖励槽)</span></div>`;
  for (const tr of VAULT_TRACKS) html += vaultTrackRowHtml(v, tr);
  html += `<div class="muted" style="font-size:10px;margin-top:2px">险境槽:大秘境完成与无尽塔刷新最高层都计入。下周一(UTC)结算锁入。</div>
  </div>`;

  panel.innerHTML = html;
}
