/* =========================================================
   market.js — 轮换黑市(账号共享,统一货币消耗出口)
   ----------------------------------------------------------
   - 每天按"天数种子"洗出固定 N 个商品(同日稳定、跨天重洗)
   - 用盈余货币(荣誉/精华/塔币/幻象币/随从券/公会贡献)换装备/宝石/资源
   - 每个商品每天可买一次
   ========================================================= */

const MARKET_DEAL_COUNT = 6;

const MARKET_TEMPLATES = [
  { key:'honor_epic',     icon:'🛡️', name:'荣誉军需 · 史诗装备',   cost:{ honor:600 },         reward:{ type:'item', rarity:'epic' } },
  { key:'honor_legend',   icon:'⚔️', name:'荣誉珍藏 · 传说装备',   cost:{ honor:2200 },        reward:{ type:'item', rarity:'legend' } },
  { key:'honor_gem',      icon:'💎', name:'荣誉补给 · 宝石×2',     cost:{ honor:1200 },        reward:{ type:'gem', n:2 } },
  { key:'tower_gem',      icon:'💎', name:'登塔奖励 · 随机宝石',   cost:{ towerCoin:150 },     reward:{ type:'gem', n:1 } },
  { key:'tower_ess',      icon:'🔮', name:'登塔补给 · 魔法精华×40',cost:{ towerCoin:200 },     reward:{ type:'resource', res:'essence', n:40 } },
  { key:'tower_epic',     icon:'🪙', name:'登塔兑换 · 史诗装备',   cost:{ towerCoin:260 },     reward:{ type:'item', rarity:'epic' } },
  { key:'rogue_epic',     icon:'🃏', name:'幻象兑换 · 史诗装备',   cost:{ roguelikeCoin:120 }, reward:{ type:'item', rarity:'epic' } },
  { key:'rogue_legend',   icon:'🎴', name:'幻象珍藏 · 传说装备',   cost:{ roguelikeCoin:520 }, reward:{ type:'item', rarity:'legend' } },
  { key:'rogue_ticket',   icon:'🎫', name:'幻象补给 · 通用券×5',   cost:{ roguelikeCoin:90 },  reward:{ type:'resource', res:'tickets', n:5 } },
  { key:'ess_gold',       icon:'💰', name:'精华换金 · 大额金币',   cost:{ essence:20 },        reward:{ type:'resource', res:'gold', n:60000 } },
  { key:'comp_ticket',    icon:'🎟️', name:'黑市暗格 · 随从券×3',   cost:{ honor:900 },         reward:{ type:'resource', res:'compTickets', n:3 } },
  { key:'contrib_gem',    icon:'💠', name:'公会补给 · 宝石×2',     cost:{ contrib:400 },       reward:{ type:'gem', n:2 } },
  { key:'contrib_legend', icon:'🏰', name:'公会军备 · 传说装备',   cost:{ contrib:1200 },      reward:{ type:'item', rarity:'legend' } },
];

const MARKET_CUR_NAME = { honor:'荣誉', essence:'精华', towerCoin:'塔币', roguelikeCoin:'幻象币', compTickets:'随从券', tickets:'通用券', gold:'金币', gem:'钻石', contrib:'公会贡献' };
const MARKET_CUR_ICON = { honor:'🎖️', essence:'🔮', towerCoin:'🪙', roguelikeCoin:'🤖', compTickets:'🎟️', tickets:'🎫', gold:'💰', gem:'💎', contrib:'🏅' };

function ensureMarketState() {
  if (typeof account === 'undefined' || !account) return null;
  if (!account.market || typeof account.market !== 'object') account.market = { day: -1, bought: [] };
  const m = account.market;
  if (typeof m.day !== 'number') m.day = -1;
  if (!Array.isArray(m.bought)) m.bought = [];
  const today = marketDayIndex();
  if (m.day !== today) { m.day = today; m.bought = []; }
  return m;
}

function marketDayIndex() { return Math.floor(Date.now() / 86400000); }

/* 确定性 PRNG(同日稳定洗牌) */
function marketRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function marketShuffled(seed) {
  const a = MARKET_TEMPLATES.slice();
  const rnd = marketRng(seed);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function getMarketDeals() { return marketShuffled(marketDayIndex() * 2654435761 >>> 0).slice(0, MARKET_DEAL_COUNT); }

function marketCurBalance(cur) {
  if (cur === 'contrib') return (account && account.guild) ? (account.guild.contrib || 0) : 0;
  return account[cur] || 0;
}
function marketCurSpend(cur, amt) {
  if (cur === 'contrib') { if (typeof ensureGuildState === 'function') ensureGuildState(); account.guild.contrib = (account.guild.contrib || 0) - amt; }
  else account[cur] = (account[cur] || 0) - amt;
}
function marketCanAfford(t) { return Object.entries(t.cost).every(([cur, amt]) => marketCurBalance(cur) >= amt); }

function grantMarketReward(r) {
  if (r.type === 'item') {
    const it = (typeof rollItemOfRarity === 'function') ? rollItemOfRarity(r.rarity, state.hero.lvl) : null;
    // 直接入包(不走 addToInventory 的满包自动出售,避免花钱买的装备被秒卖)
    if (it) { if (typeof syncItemIdentity === 'function') syncItemIdentity(it); state.inventory.push(it); markDirty('inventory'); log('🎁 获得 ' + it.name, 'good'); }
  } else if (r.type === 'gem') {
    const keys = (typeof GEM_TYPES === 'object') ? Object.keys(GEM_TYPES) : [];
    if (keys.length) { for (let i = 0; i < (r.n || 1); i++) { const gk = keys[Math.floor(Math.random() * keys.length)]; state.gems[gk] = (state.gems[gk] || 0) + 1; } log('💎 获得 ' + (r.n || 1) + ' 颗随机宝石', 'good'); }
  } else if (r.type === 'resource') {
    account[r.res] = (account[r.res] || 0) + r.n;
    log('获得 ' + r.n + (MARKET_CUR_ICON[r.res] || ''), 'good');
  }
}

function buyMarketDeal(key) {
  const m = ensureMarketState(); if (!m) return;
  if (m.bought.includes(key)) { log('🛒 今天已经买过这件商品了', 'info'); return; }
  if (!getMarketDeals().some(d => d.key === key)) return;   // 不在今日轮换中
  const t = MARKET_TEMPLATES.find(x => x.key === key); if (!t) return;
  for (const [cur, amt] of Object.entries(t.cost)) {
    if (marketCurBalance(cur) < amt) { log('🛒 ' + (MARKET_CUR_NAME[cur] || cur) + '不足(需 ' + amt + ')', 'bad'); return; }
  }
  for (const [cur, amt] of Object.entries(t.cost)) marketCurSpend(cur, amt);
  grantMarketReward(t.reward);
  m.bought.push(key);
  log('🛒 黑市购入「' + t.name + '」', 'epic');
  markDirty('market', 'hero', 'inventory');
  if (typeof renderMarket === 'function') renderMarket();
  if (typeof saveState === 'function') saveState();
}

/* 今日是否有买得起且未购买的商品(导航红点用) */
function marketHasAffordableDeal() {
  const m = ensureMarketState(); if (!m) return false;
  return getMarketDeals().some(d => !m.bought.includes(d.key) && marketCanAfford(d));
}

/* ---------- 渲染 ---------- */
function rewardText(r) {
  if (r.type === 'item') return (r.rarity === 'legend' ? '传说' : r.rarity === 'epic' ? '史诗' : r.rarity) + '装备(当前等级)';
  if (r.type === 'gem') return (r.n || 1) + ' 颗随机宝石';
  if (r.type === 'resource') return r.n + ' ' + (MARKET_CUR_NAME[r.res] || r.res) + (MARKET_CUR_ICON[r.res] || '');
  return '';
}

function renderMarket() {
  const panel = document.getElementById('tab-market');
  if (!panel) return;
  const m = ensureMarketState();
  const deals = getMarketDeals();

  const rows = deals.map(t => {
    const bought = m.bought.includes(t.key);
    const afford = marketCanAfford(t);
    const costTxt = Object.entries(t.cost).map(([cur, amt]) => `${fmt(amt)}${MARKET_CUR_ICON[cur] || ''}`).join(' + ');
    return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px${bought ? ';opacity:.5' : ''}">
      <div style="font-size:12px">
        <div style="font-weight:bold">${t.icon} ${t.name}</div>
        <div class="muted" style="font-size:11px">获得:${rewardText(t.reward)} · 花费 ${costTxt}</div>
      </div>
      <button class="${afford && !bought ? 'primary' : ''}" data-action="marketBuy" data-key="${t.key}" ${bought || !afford ? 'disabled' : ''}>${bought ? '✅已购' : afford ? '购买' : '不足'}</button>
    </div>`;
  }).join('');

  panel.innerHTML = `
    <div style="margin-bottom:8px">
      <div style="font-weight:bold;font-size:15px">🛒 轮换黑市</div>
      <div class="muted" style="font-size:11px;margin-top:2px">每日刷新一批商品,用攒下的荣誉/精华/塔币/幻象币/公会贡献换装备、宝石与资源。每件每天限购一次。</div>
    </div>
    <div class="muted" style="font-size:11px;margin-bottom:8px">你的货币:🎖️${fmt(account.honor || 0)} 🔮${fmt(account.essence || 0)} 🪙${fmt(account.towerCoin || 0)} 🤖${fmt(account.roguelikeCoin || 0)} 🎟️${fmt(account.compTickets || 0)} 🏅${fmt((account.guild && account.guild.contrib) || 0)}</div>
    ${rows}
  `;
}
