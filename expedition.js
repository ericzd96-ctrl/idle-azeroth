/* =========================================================
   expedition.js — 放置小号军团 / 远征(账号共享)
   ----------------------------------------------------------
   - 非当前出战的角色组成"远征军团",离线/在线都被动产出账号资源
   - 产出 = 金币 / 精华 / 钻石,按各成员等级累加,惰性按时间结算
   - 远征补给等级(account.expedition.level)可花金币升级,全局 +20%/级
   - 储备上限 = EXPEDITION_CAP_HOURS 小时产量(超过停产,需领取)
   ========================================================= */

const EXPEDITION_CAP_HOURS = 12;     // 离线/储备上限(小时)

function ensureExpeditionState() {
  if (typeof account === 'undefined' || !account) return null;
  if (!account.expedition || typeof account.expedition !== 'object') {
    account.expedition = { level: 0, lastClaim: 0, acc: { gold: 0, essence: 0, gem: 0 } };
  }
  const e = account.expedition;
  if (typeof e.level !== 'number') e.level = 0;
  if (typeof e.lastClaim !== 'number') e.lastClaim = 0;
  if (!e.acc || typeof e.acc !== 'object') e.acc = { gold: 0, essence: 0, gem: 0 };
  for (const k of ['gold', 'essence', 'gem']) if (typeof e.acc[k] !== 'number') e.acc[k] = 0;
  return e;
}

/* 远征成员 = 所有非当前出战且已建好的角色 */
function expeditionMembers() {
  if (typeof characters === 'undefined' || !Array.isArray(characters)) return [];
  const activeIdx = (typeof activeCharIndex === 'number') ? activeCharIndex : -1;
  return characters.filter((c, i) => i !== activeIdx && c && c.cls);
}

/* 单个成员每小时产出 */
function expeditionMemberRate(c) {
  const lvl = Math.max(1, c?.hero?.lvl || 1);
  return {
    gold: Math.pow(lvl, 1.55) * 3.5 + 30,
    essence: lvl / 35,
    gem: lvl / 130,
  };
}

/* 军团合计每小时产出(含补给等级加成) */
function expeditionRatePerHour() {
  let gold = 0, essence = 0, gem = 0;
  for (const c of expeditionMembers()) {
    const r = expeditionMemberRate(c);
    gold += r.gold; essence += r.essence; gem += r.gem;
  }
  const mult = 1 + (account?.expedition?.level || 0) * 0.2;
  return { gold: gold * mult, essence: essence * mult, gem: gem * mult };
}

/* 惰性结算:把上次结算到现在的产出(按 CAP 截断)累进储备池 */
function expeditionAdvance(now) {
  const e = ensureExpeditionState();
  if (!e) return;
  now = now || Date.now();
  if (!e.lastClaim) { e.lastClaim = now; return; }       // 首次:仅设基线,不追溯
  let dtH = (now - e.lastClaim) / 3600000;
  e.lastClaim = now;
  if (dtH <= 0) return;
  dtH = Math.min(dtH, EXPEDITION_CAP_HOURS);
  const r = expeditionRatePerHour();
  const cap = EXPEDITION_CAP_HOURS;
  e.acc.gold = Math.min((e.acc.gold || 0) + r.gold * dtH, r.gold * cap);
  e.acc.essence = Math.min((e.acc.essence || 0) + r.essence * dtH, r.essence * cap);
  e.acc.gem = Math.min((e.acc.gem || 0) + r.gem * dtH, r.gem * cap);
}

/* 储备是否已满(用于 UI 提示) */
function expeditionStorageFull() {
  const e = ensureExpeditionState(); if (!e) return false;
  const r = expeditionRatePerHour();
  if (r.gold <= 0) return false;
  return (e.acc.gold || 0) >= r.gold * EXPEDITION_CAP_HOURS - 1;
}

function expeditionUpgradeCost() {
  const lv = account?.expedition?.level || 0;
  return Math.floor(8000 * Math.pow(1.7, lv));
}

function claimExpedition() {
  expeditionAdvance(Date.now());
  const e = ensureExpeditionState(); if (!e) return;
  const g = Math.floor(e.acc.gold || 0), es = Math.floor(e.acc.essence || 0), gm = Math.floor(e.acc.gem || 0);
  if (g + es + gm <= 0) { log('🚩 远征军团暂无可领取的产出', 'info'); return; }
  e.acc.gold -= g; e.acc.essence -= es; e.acc.gem -= gm;
  account.gold = (account.gold || 0) + g;
  account.essence = (account.essence || 0) + es;
  account.gem = (account.gem || 0) + gm;
  if (typeof progressionOnGoldGain === 'function' && g > 0) progressionOnGoldGain(g);
  log(`🚩 远征军团带回:+${g}💰 +${es}🔮 +${gm}💎`, 'good');
  markDirty('expedition', 'hero', 'shop');
  if (typeof renderExpedition === 'function') renderExpedition();
  if (typeof saveState === 'function') saveState();
}

function upgradeExpedition() {
  const e = ensureExpeditionState(); if (!e) return;
  expeditionAdvance(Date.now());   // 升级前先按旧倍率结算,避免倍率穿越
  const cost = expeditionUpgradeCost();
  if ((account.gold || 0) < cost) { log('💰 金币不足,升级远征补给需要 ' + fmt(cost) + ' 金币', 'bad'); return; }
  account.gold = (account.gold || 0) - cost;
  e.level = (e.level || 0) + 1;
  log('🚩 远征补给升级至 Lv.' + e.level + '(全员产出 +20%)', 'good');
  markDirty('expedition', 'hero');
  if (typeof renderExpedition === 'function') renderExpedition();
  if (typeof saveState === 'function') saveState();
}

/* ---------- 渲染 ---------- */
function renderExpedition() {
  const panel = document.getElementById('tab-expedition');
  if (!panel) return;
  expeditionAdvance(Date.now());
  const e = ensureExpeditionState();
  const members = expeditionMembers();
  const rate = expeditionRatePerHour();
  const lv = e.level || 0;
  const cost = expeditionUpgradeCost();
  const full = expeditionStorageFull();

  const clsName = (c) => (typeof CLASSES !== 'undefined' && CLASSES[c.cls]) ? CLASSES[c.cls].name : c.cls;

  let memberRows;
  if (members.length === 0) {
    memberRows = `<div class="muted" style="padding:10px;text-align:center;font-size:12px">
      还没有可派遣的小号。<b>创建更多角色</b>后,非出战的角色会自动加入远征军团,离线也持续产出账号资源。</div>`;
  } else {
    memberRows = members.map(c => {
      const r = expeditionMemberRate(c);
      const m = 1 + lv * 0.2;
      return `<div class="exp-member" style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px">
        <div><b>${c.name || '无名'}</b> <span class="muted" style="font-size:11px">${clsName(c)} · Lv.${c.hero?.lvl || 1}</span></div>
        <div style="font-size:11px;text-align:right">+${fmt(r.gold * m)}💰 · +${(r.essence * m).toFixed(2)}🔮 · +${(r.gem * m).toFixed(2)}💎 <span class="muted">/小时</span></div>
      </div>`;
    }).join('');
  }

  panel.innerHTML = `
    <div style="margin-bottom:8px">
      <div style="font-weight:bold;font-size:15px">🚩 远征军团</div>
      <div class="muted" style="font-size:11px;margin-top:2px">非出战角色离线持续产出账号资源(金币/精华/钻石)。储备上限 ${EXPEDITION_CAP_HOURS} 小时,满了会停产,记得回来领取。</div>
    </div>

    <div style="border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:10px;background:var(--panel-2)">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
        <span>当前储备${full ? ' <span style="color:#f59e0b">(已满!)</span>' : ''}</span>
        <span class="muted">合计 +${fmt(rate.gold)}💰 +${rate.essence.toFixed(2)}🔮 +${rate.gem.toFixed(2)}💎 /小时</span>
      </div>
      <div style="display:flex;gap:10px;font-size:15px;font-weight:bold;margin-bottom:8px">
        <span>${fmt(e.acc.gold || 0)}💰</span>
        <span>${Math.floor(e.acc.essence || 0)}🔮</span>
        <span>${Math.floor(e.acc.gem || 0)}💎</span>
      </div>
      <button class="primary" data-action="expClaim" style="width:100%">领取远征产出</button>
    </div>

    <div style="border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:13px;font-weight:bold">远征补给 Lv.${lv}</div>
          <div class="muted" style="font-size:11px">每级全员产出 +20%(当前 +${lv * 20}%)</div>
        </div>
        <button data-action="expUpgrade">升级 · ${fmt(cost)}💰</button>
      </div>
    </div>

    <div style="font-size:12px;font-weight:bold;margin-bottom:6px">派遣中的成员(${members.length})</div>
    ${memberRows}
  `;
}
