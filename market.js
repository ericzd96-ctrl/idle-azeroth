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

const TRADE_ROUTES = [
  { key:'stormwind_supply', icon:'🦁', name:'暴风城补给线', desc:'把基础物资送往艾尔文与西部荒野。', req:{type:'level',goal:10}, cost:{gold:12000}, reward:{gold:28000, honor:180} },
  { key:'orgrimmar_foundry', icon:'🐺', name:'奥格瑞玛铸炉线', desc:'为前线运送矿锭、皮革与战鼓。', req:{type:'kills',goal:800}, cost:{gold:28000}, reward:{gold:62000, essence:8} },
  { key:'booty_bay_exchange', icon:'⚓', name:'藏宝海湾转口', desc:'在海盗、商人和冒险者之间低买高卖。', req:{type:'gold',goal:100000}, cost:{gold:60000}, reward:{gem:24, tickets:1, stat:{goldMult:2}} },
  { key:'ironforge_arms', icon:'⛏️', name:'铁炉堡军械契约', desc:'向矮人军械库订购稳定的远征装备。', req:{type:'mapBoss',goal:5}, cost:{gold:90000,honor:500}, reward:{gold:140000, essence:22, stat:{defPct:1}} },
  { key:'darnassus_seed', icon:'🌙', name:'达纳苏斯月井货栈', desc:'以月井祝福保存草药、布匹与古老种籽。', req:{type:'dungeon',goal:8}, cost:{gold:130000,essence:18}, reward:{gem:45, honor:900, stat:{hpPct:1}} },
  { key:'undercity_apothecary', icon:'☠️', name:'幽暗城药剂暗线', desc:'采购危险但高价值的药剂与炼金材料。', req:{type:'rare',goal:8}, cost:{gold:180000,honor:1000}, reward:{gold:260000, essence:55, stat:{dropMult:3}} },
  { key:'shattrath_caravan', icon:'💠', name:'沙塔斯跨界商队', desc:'让外域水晶和艾泽拉斯军需互通。', req:{type:'rep',faction:'外域',goal:12000}, cost:{gold:260000,essence:70}, reward:{gem:90, tickets:2, stat:{mastery:4}} },
  { key:'dalaran_auction', icon:'🔮', name:'达拉然拍卖专线', desc:'为法师与冒险者撮合高阶附魔、宝石和秘卷。', req:{type:'rep',faction:'诺森德',goal:15000}, cost:{gold:360000,gem:80}, reward:{gold:520000, essence:120, stat:{goldMult:4}} },
  { key:'argent_tournament', icon:'🏟️', name:'银色锦标赛赞助', desc:'赞助冠军骑士换取军需、名望和稀有订单。', req:{type:'worldBoss',goal:12}, cost:{gold:520000,honor:2600}, reward:{gold:760000, gem:140, stat:{atkPct:2,hpPct:2}} },
  { key:'valdrakken_exchange', icon:'🐲', name:'瓦德拉肯龙鳞汇兑', desc:'用群岛物资建立稳定的龙岛汇兑渠道。', req:{type:'rep',faction:'龙岛',goal:25000}, cost:{gold:720000,essence:160}, reward:{gem:220,honor:4200,stat:{dropMult:6,mastery:6}} },
  { key:'timewalking_broker', icon:'⏳', name:'时光漫游掮客', desc:'把不同时代的旧物、徽记和古董带回市场。', req:{type:'chronicle',goal:18}, cost:{gold:1000000,gem:180}, reward:{gold:1400000,essence:260,stat:{goldMult:6,dropMult:6}} },
  { key:'starbound_silkroad', icon:'🌌', name:'群星丝路合约', desc:'连接群星边境、龙岛与职业大厅的终局商路。', req:{type:'combined',goal:1,parts:[{type:'classOrder',goal:25},{type:'dragonTreasure',goal:75},{type:'worldBoss',goal:30}]}, cost:{gold:1600000,gem:300,essence:300}, reward:{gold:2400000,gem:420,honor:12000,title:'群星贸易亲王',stat:{goldMult:10,dropMult:10,mastery:12}} },
];

function ensureMarketState() {
  if (typeof account === 'undefined' || !account) return null;
  if (!account.market || typeof account.market !== 'object') account.market = { day: -1, bought: [] };
  const m = account.market;
  if (typeof m.day !== 'number') m.day = -1;
  if (!Array.isArray(m.bought)) m.bought = [];
  if (!m.routes) m.routes = { invested:{} };
  if (!m.routes.invested) m.routes.invested = {};
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

function tradeRouteMetric(req) {
  const acc = account || {};
  if (req.type === 'level') return typeof accLvl === 'function' ? accLvl() : (state?.hero?.lvl || 1);
  if (req.type === 'kills') return acc.killsTotal || 0;
  if (req.type === 'gold') return acc.gold || 0;
  if (req.type === 'mapBoss') return Object.values(acc.bossesKilled || {}).reduce((s, n) => s + (n || 0), 0);
  if (req.type === 'dungeon') return acc.dungeonClearsTotal || 0;
  if (req.type === 'rare') return typeof accountRareEliteTotalKills === 'function' ? accountRareEliteTotalKills() : 0;
  if (req.type === 'worldBoss') return typeof accountWorldBossTotalKills === 'function' ? accountWorldBossTotalKills() : 0;
  if (req.type === 'rep') return acc.reputation?.[req.faction] || 0;
  if (req.type === 'dragonTreasure') return Object.keys(acc.dragonTreasures?.claimed || {}).length;
  if (req.type === 'classOrder') return Object.keys(acc.classOrders?.claimed || {}).length;
  if (req.type === 'chronicle') return Object.keys(acc.chronicles?.claimed || {}).length;
  if (req.type === 'combined') return req.parts.every(p => tradeRouteMetric(p) >= p.goal) ? 1 : 0;
  return 0;
}
function tradeRouteReqText(req) {
  if (req.type === 'level') return `账号等级 ${req.goal}`;
  if (req.type === 'kills') return `累计击杀 ${fmt(req.goal)}`;
  if (req.type === 'gold') return `持有金币 ${fmt(req.goal)}`;
  if (req.type === 'mapBoss') return `地图首领 ${req.goal} 次`;
  if (req.type === 'dungeon') return `副本通关 ${req.goal} 次`;
  if (req.type === 'rare') return `稀有精英 ${req.goal} 次`;
  if (req.type === 'worldBoss') return `世界Boss ${req.goal} 次`;
  if (req.type === 'rep') return `${req.faction}声望 ${fmt(req.goal)}`;
  if (req.type === 'dragonTreasure') return `龙岛宝藏 ${req.goal}`;
  if (req.type === 'classOrder') return `职业委托 ${req.goal}`;
  if (req.type === 'chronicle') return `编年史章节 ${req.goal}`;
  if (req.type === 'combined') return req.parts.map(tradeRouteReqText).join(' + ');
  return '';
}
function tradeRewardText(r) {
  const parts = [];
  if (r.gold) parts.push(`${fmt(r.gold)}💰`);
  if (r.gem) parts.push(`${r.gem}💎`);
  if (r.honor) parts.push(`${fmt(r.honor)}🎖️`);
  if (r.essence) parts.push(`${r.essence}🔮`);
  if (r.tickets) parts.push(`${r.tickets}🎫`);
  if (r.stat) parts.push(Object.entries(r.stat).map(([k, v]) => typeof fmtMod === 'function' ? fmtMod(k, v) : `${k}+${v}`).join(' / '));
  if (r.title) parts.push(`称号「${r.title}」`);
  return parts.join(' ');
}
function tradeRouteInvestedCount() {
  const m = ensureMarketState();
  return TRADE_ROUTES.filter(r => m?.routes?.invested?.[r.key]).length;
}
function grantTradeRouteReward(r) {
  if (r.gold) account.gold = (account.gold || 0) + r.gold;
  if (r.gem) account.gem = (account.gem || 0) + r.gem;
  if (r.honor) account.honor = (account.honor || 0) + r.honor;
  if (r.essence) account.essence = (account.essence || 0) + r.essence;
  if (r.tickets) account.tickets = (account.tickets || 0) + r.tickets;
  if (r.title && typeof unlockTitle === 'function') unlockTitle(r.title);
  if (r.stat) {
    account.permanentStats = account.permanentStats || {};
    for (const [k, v] of Object.entries(r.stat)) account.permanentStats[k] = (account.permanentStats[k] || 0) + v;
    if (typeof recomputeStats === 'function') recomputeStats();
  }
}
function investTradeRoute(key) {
  const m = ensureMarketState(); if (!m) return;
  const route = TRADE_ROUTES.find(r => r.key === key); if (!route) return;
  if (m.routes.invested[key]) { log('🧾 这条贸易航线已经签过合约', 'info'); return; }
  if (tradeRouteMetric(route.req) < route.req.goal) { log('🧾 贸易航线条件尚未满足', 'bad'); return; }
  for (const [cur, amt] of Object.entries(route.cost)) {
    if (marketCurBalance(cur) < amt) { log('🧾 ' + (MARKET_CUR_NAME[cur] || cur) + '不足(需 ' + fmt(amt) + ')', 'bad'); return; }
  }
  for (const [cur, amt] of Object.entries(route.cost)) marketCurSpend(cur, amt);
  m.routes.invested[key] = Date.now();
  grantTradeRouteReward(route.reward);
  log('🧾 签下贸易航线「' + route.name + '」· ' + tradeRewardText(route.reward), 'legend');
  if (typeof progressionCheckAch === 'function') progressionCheckAch();
  markDirty('market', 'progression', 'hero');
  if (typeof renderMarket === 'function') renderMarket();
  if (typeof saveState === 'function') saveState();
}

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

function renderTradeRoutes() {
  const m = ensureMarketState();
  const rows = TRADE_ROUTES.map(route => {
    const invested = !!m.routes.invested[route.key];
    const unlocked = tradeRouteMetric(route.req) >= route.req.goal;
    const afford = marketCanAfford(route);
    const costTxt = Object.entries(route.cost).map(([cur, amt]) => `${fmt(amt)}${MARKET_CUR_ICON[cur] || ''}`).join(' + ');
    const pct = Math.min(100, route.req.goal ? tradeRouteMetric(route.req) / route.req.goal * 100 : 0);
    return `<div class="trade-route-card ${invested ? 'invested' : (unlocked && afford ? 'ready' : '')}">
      <div class="trade-route-head">
        <span class="trade-route-icon">${route.icon}</span>
        <div><b>${route.name}</b><div class="muted" style="font-size:10px">${route.desc}</div></div>
      </div>
      <div class="muted" style="font-size:10px;margin-top:5px">${tradeRouteReqText(route.req)}</div>
      <div class="bar xp" style="height:6px;margin-top:4px"><i style="width:${pct}%"></i></div>
      <div class="trade-route-foot">
        <span class="muted" style="font-size:10px">投 ${costTxt} · 回 ${tradeRewardText(route.reward)}</span>
        <button class="${unlocked && afford && !invested ? 'gold' : ''}" data-action="tradeInvest" data-key="${route.key}" ${invested || !unlocked || !afford ? 'disabled' : ''}>${invested ? '✅已签' : unlocked ? (afford ? '签约' : '资金不足') : '未解锁'}</button>
      </div>
    </div>`;
  }).join('');
  return `<div class="trade-route-box">
    <div class="trade-route-title">🧾 贸易航线 <span class="muted">${tradeRouteInvestedCount()}/${TRADE_ROUTES.length}</span></div>
    <div class="muted" style="font-size:11px;margin:2px 0 8px">一次性经济合约:满足条件后投入金币/资源,换取补给、永久经济加成与称号。</div>
    <div class="trade-route-grid">${rows}</div>
  </div>`;
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
    ${renderTradeRoutes()}
  `;
}

if (typeof globalThis !== 'undefined') {
  globalThis.TRADE_ROUTES = TRADE_ROUTES;
  globalThis.investTradeRoute = investTradeRoute;
  globalThis.tradeRouteInvestedCount = tradeRouteInvestedCount;
}
