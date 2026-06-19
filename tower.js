/* =========================================================
   tower.js — 无尽塔(Endless Tower)
   ----------------------------------------------------------
   规则:
   - 单角色挑战,从指定层开始,每杀完一只怪进入下一层
   - 每 5 层精英、每 10 层 BOSS、每 25 层为里程碑(一次性奖励)
   - 怪物按 1.10^(floor-1) 缩放,等级 = max(英雄等级, floor)
   - 失败/撤离:保留装备和已得塔币,下次从 highest+1 或选择层重开
   - 塔币 🪙:塔商店货币,用于换宝石、精华、券、AP、坐骑
   - 每周一 0 点 weeklyHighest 重置,根据本周最高额外发塔币
   ========================================================= */

/* ---------- 配置 ---------- */
const TOWER_FLOOR_SCALE = 1.10;          // 每层属性放大
const TOWER_BOSS_EVERY = 10;             // 每 10 层 BOSS
const TOWER_ELITE_EVERY = 5;             // 每 5 层精英

const TOWER_MILESTONES = {
  10:  { name:'初窥门径',  coin:30,   gold:500,   gem:5,   item:null,   title:null },
  25:  { name:'稳步攀登',  coin:80,   gold:2000,  gem:15,  item:'rare', title:null },
  50:  { name:'凌云之志',  coin:250,  gold:8000,  gem:40,  item:'epic', title:null },
  100: { name:'登峰造极',  coin:800,  gold:30000, gem:100, item:'legend',title:'登塔者' },
  150: { name:'破界而立',  coin:2000, gold:80000, gem:200, item:'legend',title:'破界者' },
  200: { name:'无尽攀登',  coin:5000, gold:200000,gem:500, item:'legend',title:'无尽攀登者' },
};

const TOWER_SHOP = [
  { key:'gempack',   name:'5颗随机宝石',   icon:'💎', cost:30,  desc:'随机色 T1 宝石 ×5' },
  { key:'essence',   name:'魔法精华 ×20',  icon:'✨', cost:25,  desc:'附魔/重铸材料' },
  { key:'ticket',    name:'通用券 ×1',     icon:'🎫', cost:50,  desc:'用于大秘境/BOSS' },
  { key:'compticket',name:'随从券 ×1',     icon:'🐾', cost:40,  desc:'用于随从抽卡' },
  { key:'gold',      name:'金币包',        icon:'💰', cost:30,  desc:'+ 等级*200 金币' },
  { key:'gemt2',     name:'T2 宝石 ×1',    icon:'💠', cost:120, desc:'随机色 T2 宝石' },
  { key:'gemt3',     name:'T3 宝石 ×1',    icon:'🔷', cost:400, desc:'随机色 T3 宝石(顶级)' },
  { key:'epicItem',  name:'史诗装备 ×1',   icon:'🟣', cost:300, desc:'按当前等级生成' },
  { key:'legendBox', name:'传说装备宝箱',  icon:'🟧', cost:1500,desc:'按当前等级生成 1 件传说' },
];

/* 周排行奖励(基于本周最高层) */
const TOWER_WEEKLY_TIERS = [
  { min:1,   name:'石阶',  coin:0   },
  { min:10,  name:'青铜',  coin:50  },
  { min:25,  name:'白银',  coin:150 },
  { min:50,  name:'黄金',  coin:400 },
  { min:80,  name:'铂金',  coin:1000},
  { min:120, name:'钻石',  coin:2500},
  { min:180, name:'王者',  coin:6000},
];

/* ---------- 工具 ---------- */
function ensureTowerState() {
  if (!state.tower) state.tower = { highest:0, weeklyHighest:0, weeklyResetAt:0, milestonesClaimed:{}, totalRuns:0 };
  if (typeof state.towerCoin !== 'number') state.towerCoin = 0;
  if (typeof state.towerStartFloor !== 'number') state.towerStartFloor = 1;
  if (!state.tower.milestonesClaimed) state.tower.milestonesClaimed = {};
}

function towerWeeklyResetAt(now) {
  // 下一个周一 00:00
  const d = new Date(now);
  const day = d.getDay(); // 0=Sun
  const daysUntilMon = (8 - day) % 7 || 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + daysUntilMon);
  return d.getTime();
}

function checkTowerWeeklyRollover() {
  ensureTowerState();
  const now = Date.now();
  if (!state.tower.weeklyResetAt) {
    state.tower.weeklyResetAt = towerWeeklyResetAt(now);
    return;
  }
  if (now < state.tower.weeklyResetAt) return;
  // 结算
  const wh = state.tower.weeklyHighest || 0;
  if (wh > 0) {
    const tier = [...TOWER_WEEKLY_TIERS].reverse().find(t => wh >= t.min);
    if (tier && tier.coin > 0) {
      state.towerCoin += tier.coin;
      log(`🏆 上周无尽塔结算: ${tier.name}段 (最高 ${wh} 层) +${tier.coin}🪙`, 'legend');
    }
  }
  state.tower.weeklyHighest = 0;
  state.tower.weeklyResetAt = towerWeeklyResetAt(now);
}

function getTowerWeeklyTier(wh) {
  return [...TOWER_WEEKLY_TIERS].reverse().find(t => (wh||0) >= t.min) || TOWER_WEEKLY_TIERS[0];
}

/* 怪物属性: floor 决定 scale + 类型 */
function towerMonsterType(floor) {
  if (floor % TOWER_BOSS_EVERY === 0) return 'boss';
  if (floor % TOWER_ELITE_EVERY === 0) return 'elite';
  return 'normal';
}

function spawnTowerMonster() {
  state.currentMonsters = [];
  const ts = state.towerState; if (!ts) return;
  const floor = ts.floor;
  const type = towerMonsterType(floor);
  const scale = Math.pow(TOWER_FLOOR_SCALE, floor - 1);
  const lvl = Math.max(state.hero.lvl, Math.min(80, floor + 10));
  const isBoss = type === 'boss';
  const isElite = type === 'elite';
  const namePool = isBoss
    ? ['👹层主','🐉古龙','💀骷髅领主','🦂万年蝎王','🐲炎魔','👺虚空巨像','🦅死神之鸦']
    : isElite
      ? ['🗡️精英战士','🧟亡灵卫队','⚔️恶魔斗士','🛡️守关者','🏹精英射手']
      : ['👹掠夺者','🦴亡灵','💀使徒','🧟卫兵','🐺野兽','👻幽魂','🐍蛇人'];
  const name = `第${floor}层·` + choice(namePool);
  const hpMul = isBoss ? 20 : (isElite ? 4 : 1.5);
  const atkMul = isBoss ? 2.4 : (isElite ? 1.5 : 1);
  const defMul = isBoss ? 1.8 : (isElite ? 1.3 : 1);

  state.currentMonsters.push({
    name, isBoss,
    lvl,
    hpMax: Math.floor((100 + lvl*lvl*8.0) * hpMul * scale),
    hp:    Math.floor((100 + lvl*lvl*8.0) * hpMul * scale),
    atk:   Math.floor((10 + lvl*3.0) * atkMul * scale),
    def:   Math.floor((3 + lvl*1.4) * defMul * scale),
    baseGold: Math.floor(10 + lvl*3),
    baseXp:   Math.floor(35 + lvl*5),
    goldReward: Math.floor((20 + lvl*4 + floor*15) * (isBoss?10:(isElite?2.5:1))),
    honorReward: isBoss ? Math.floor(30+lvl*2) : (isElite?5:1),
    dropRate: isBoss ? 1.0 : (isElite ? 0.6 : 0.25),
    gemChance: isBoss ? 1.0 : (isElite ? 0.15 : 0.03),
    maxRarity: isBoss ? 'legend' : (isElite ? 'epic' : 'rare'),
    fromTower: true,
    _towerFloor: floor,
    _towerType: type,
  });
}

/* ---------- 进入/撤离 ---------- */
function enterTower() {
  ensureTowerState();
  if (state.mode === 'travel') { log('正在旅行中', 'bad'); return; }
  if (state.mode !== 'world') { log('请先结束当前战斗', 'bad'); return; }
  const startFloor = Math.max(1, Math.min(state.towerStartFloor || 1, (state.tower.highest || 0) + 1));
  state.towerStartFloor = startFloor;
  state.mode = 'tower';
  state.towerState = { floor: startFloor, startFloor, loot: [], coinThisRun: 0 };
  state.tower.totalRuns = (state.tower.totalRuns || 0) + 1;
  state.hp = state.hero.hpMax;
  state.resource = state.resourceMax;
  spawnTowerMonster();
  log(`⛰️ 进入无尽塔,起始第 ${startFloor} 层`, 'legend');
  markDirty('dungeon', 'stage', 'hero');
}

function leaveTower() {
  const ts = state.towerState;
  if (ts) {
    const ranTo = ts.floor;
    log(`⛰️ 离开无尽塔(到达第 ${ranTo} 层,本次 +${ts.coinThisRun||0}🪙)`, 'info');
  }
  state.mode = 'world';
  state.towerState = null;
  spawnMonster();
  markDirty('dungeon', 'stage');
}

/* ---------- 击杀塔怪物 ---------- */
function onTowerMonsterKill(mon) {
  const ts = state.towerState; if (!ts) return;
  const floor = ts.floor;
  const type = towerMonsterType(floor);

  // 塔币奖励
  const baseCoin = type === 'boss' ? (5 + Math.floor(floor/10)) :
                   type === 'elite' ? (2 + Math.floor(floor/20)) :
                   (1 + Math.floor(floor/15));
  state.towerCoin += baseCoin;
  ts.coinThisRun = (ts.coinThisRun||0) + baseCoin;

  // 突破最高纪录
  if (floor > (state.tower.highest||0)) state.tower.highest = floor;
  if (floor > (state.tower.weeklyHighest||0)) state.tower.weeklyHighest = floor;

  // 坐骑里程碑
  if (typeof mountOnTowerFloorClear === 'function') mountOnTowerFloorClear(floor);

  // 里程碑
  const ms = TOWER_MILESTONES[floor];
  if (ms && !state.tower.milestonesClaimed[floor]) {
    state.tower.milestonesClaimed[floor] = true;
    state.towerCoin += ms.coin;
    state.gold += ms.gold;
    state.gem += ms.gem;
    let extra = `🏆 第 ${floor} 层里程碑【${ms.name}】+${ms.coin}🪙 +${fmt(ms.gold)}💰 +${ms.gem}💎`;
    if (ms.item) {
      const it = rollItem(ms.item, Math.max(state.hero.lvl, floor), null);
      if (it) { addToInventory(it); extra += ` 🎁[${it.rarityName}]${it.name}`; }
    }
    if (ms.title) {
      if (!account) account = defaultAccount();
      if (typeof unlockTitle === 'function') unlockTitle(ms.title);
      else account.title = ms.title;
      extra += ` 称号「${ms.title}」`;
    }
    log(extra, 'legend');
  }

  // 进入下一层
  ts.floor = floor + 1;
  spawnTowerMonster();
  markDirty('dungeon');
}

/* ---------- 失败 ---------- */
function onTowerFail() {
  const ts = state.towerState;
  if (!ts) return;
  const reached = ts.floor;
  log(`💀 倒在无尽塔第 ${reached} 层(本次 +${ts.coinThisRun||0}🪙)`, 'bad');
  state.mode = 'world';
  state.towerState = null;
  markDirty('dungeon');
}

/* ---------- 商店购买 ---------- */
function towerBuy(key) {
  ensureTowerState();
  const item = TOWER_SHOP.find(s => s.key === key);
  if (!item) return;
  if (state.towerCoin < item.cost) { log('🪙 塔币不足', 'bad'); return; }
  // 应用效果
  if (key === 'gempack') {
    if (typeof SOCKET_COLORS === 'undefined') { log('宝石数据未加载', 'bad'); return; }
    for (let i = 0; i < 5; i++) {
      const gk = choice(SOCKET_COLORS) + '_t1';
      state.gems[gk] = (state.gems[gk] || 0) + 1;
    }
    log('💎 获得 5 颗随机 T1 宝石', 'good');
  } else if (key === 'essence') {
    state.essence = (state.essence||0) + 20;
    log('✨ +20 精华', 'good');
  } else if (key === 'ticket') {
    state.tickets = (state.tickets||0) + 1;
    log('🎫 +1 通用券', 'good');
  } else if (key === 'compticket') {
    state.compTickets = (state.compTickets||0) + 1;
    log('🐾 +1 随从券', 'good');
  } else if (key === 'gold') {
    const g = Math.max(200, state.hero.lvl * 200);
    state.gold += g;
    log(`💰 +${fmt(g)} 金币`, 'good');
  } else if (key === 'gemt2' || key === 'gemt3') {
    if (typeof SOCKET_COLORS === 'undefined') { log('宝石数据未加载', 'bad'); return; }
    const tier = key === 'gemt2' ? 2 : 3;
    const gk = choice(SOCKET_COLORS) + '_t' + tier;
    state.gems[gk] = (state.gems[gk] || 0) + 1;
    log(`💎 获得 T${tier} 宝石(${gk})`, 'epic');
  } else if (key === 'epicItem') {
    const it = rollItem('epic', state.hero.lvl, null);
    if (it) { addToInventory(it); log(`🎁 [${it.rarityName}] ${it.name}`, 'epic'); }
  } else if (key === 'legendBox') {
    const it = rollItem('legend', state.hero.lvl, null);
    if (it) { addToInventory(it); log(`🎁 [${it.rarityName}] ${it.name}`, 'legend'); }
  }
  state.towerCoin -= item.cost;
  markDirty('dungeon');
}

/* ---------- 调整起始层 ---------- */
function towerSetStartFloor(delta) {
  ensureTowerState();
  const max = (state.tower.highest || 0) + 1;
  state.towerStartFloor = Math.max(1, Math.min(max, (state.towerStartFloor || 1) + delta));
  markDirty('dungeon');
}

/* ---------- 渲染 ---------- */
let towerSubTab = 'tower'; // 'tower' | 'shop'

function renderTowerPanel() {
  ensureTowerState();
  checkTowerWeeklyRollover();
  const root = $('tower-panel'); if (!root) return;
  const t = state.tower;
  const inTower = state.mode === 'tower';
  const ts = state.towerState;
  const start = state.towerStartFloor || 1;
  const maxStart = (t.highest || 0) + 1;
  const weeklyTier = getTowerWeeklyTier(t.weeklyHighest);
  const nextTier = TOWER_WEEKLY_TIERS.find(x => x.min > (t.weeklyHighest||0));

  // 头部信息
  let html = `<div class="ascend-box">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:14px;font-weight:bold">⛰️ 最高 ${t.highest||0} 层 · 🪙 <b>${state.towerCoin||0}</b></div>
        <div class="muted" style="font-size:10px;margin-top:2px">本周最高 ${t.weeklyHighest||0} 层 · 段位 ${weeklyTier.name}${nextTier?` (下一档: ${nextTier.min}层)`:''}</div>
      </div>
      <div class="muted" style="font-size:10px;text-align:right">
        累计挑战 ${t.totalRuns||0} 次<br>
        ${(t.weeklyResetAt && t.weeklyResetAt > Date.now()) ? '周重置: '+fmtCd(Math.ceil((t.weeklyResetAt-Date.now())/1000)) : '即将结算'}
      </div>
    </div>
  </div>`;

  // 子页切换
  html += `<div class="sub-tabs" style="margin:6px 0">
    <span class="sub-tab ${towerSubTab==='tower'?'active':''}" data-towersub="tower">⛰️ 挑战</span>
    <span class="sub-tab ${towerSubTab==='shop'?'active':''}" data-towersub="shop">🛒 塔商店</span>
    <span class="sub-tab ${towerSubTab==='reward'?'active':''}" data-towersub="reward">🏆 里程碑</span>
  </div>`;

  if (towerSubTab === 'tower') {
    if (inTower && ts) {
      const type = towerMonsterType(ts.floor);
      const typeLabel = type === 'boss' ? '👑 BOSS' : type === 'elite' ? '🗡️ 精英' : '🪖 普通';
      const scale = Math.pow(TOWER_FLOOR_SCALE, ts.floor-1);
      html += `<div class="ascend-box" style="border:1px solid var(--legend)">
        <div style="color:var(--legend);font-weight:bold">⛰️ 挑战中 · 第 ${ts.floor} 层 ${typeLabel}</div>
        <div class="muted" style="font-size:11px;margin:4px 0">起始: 第${ts.startFloor}层 · 怪物强度 ×${scale.toFixed(2)} · 本次塔币 +${ts.coinThisRun||0}🪙</div>
        <button class="danger" data-action="leaveTower" style="width:100%;padding:8px">🚪 撤离无尽塔</button>
      </div>`;
    } else {
      html += `<div class="ascend-box">
        <div class="detail-label">挑战起始层</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin:6px 0">
          <button data-action="towerFloorDown" ${start<=1?'disabled':''} style="padding:4px 10px;font-size:14px">-</button>
          <b style="font-size:16px;min-width:60px;text-align:center">第${start}层</b>
          <button data-action="towerFloorUp" ${start>=maxStart?'disabled':''} style="padding:4px 10px;font-size:14px">+</button>
        </div>
        <div class="muted" style="font-size:11px;margin-bottom:6px;text-align:center">
          强度 ×${Math.pow(TOWER_FLOOR_SCALE, start-1).toFixed(2)} · 可选 1 ~ ${maxStart}
        </div>
        <button class="legend" data-action="enterTower" style="width:100%;padding:10px;font-weight:bold">⛰️ 进入无尽塔</button>
        <div class="muted" style="font-size:10px;margin-top:6px;line-height:1.5">
          • 每层 1 只怪,强度按 1.1× 累积<br>
          • 每 5 层精英,每 10 层 BOSS<br>
          • 死亡或撤离,塔币和最高层保留<br>
          • 通关奖励包含塔币、金币、装备
        </div>
      </div>`;
    }
  } else if (towerSubTab === 'shop') {
    html += `<div class="ascend-box">
      <div class="detail-label">塔商店 · 当前 🪙 ${state.towerCoin||0}</div>`;
    for (const item of TOWER_SHOP) {
      const can = (state.towerCoin||0) >= item.cost;
      const towerItemIconHtml = (typeof symbolIcon === 'function') ? symbolIcon(item.icon, 16, item.name, 'spell_holy_powerinfusion') : item.icon;
      html += `<div class="ascend-milestone ${can?'reached':''}" style="padding:6px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <b>${towerItemIconHtml} ${item.name}</b>
            <div class="muted" style="font-size:10px">${item.desc}</div>
          </div>
          <button class="${can?'gold':''}" data-action="towerBuy" data-key="${item.key}" ${can?'':'disabled'} style="padding:4px 10px">
            🪙 ${item.cost}
          </button>
        </div>
      </div>`;
    }
    html += '</div>';
  } else if (towerSubTab === 'reward') {
    html += `<div class="ascend-box">
      <div class="detail-label">里程碑奖励(一次性)</div>`;
    for (const [floor, r] of Object.entries(TOWER_MILESTONES)) {
      const f = parseInt(floor);
      const claimed = state.tower.milestonesClaimed && state.tower.milestonesClaimed[f];
      const reached = (state.tower.highest||0) >= f;
      const itemLabel = r.item ? ({rare:'🔵精良',epic:'🟣史诗',legend:'🟧传说'}[r.item]||'装备') : '';
      html += `<div class="ascend-milestone ${claimed?'reached':''}">
        <div><b>第 ${f} 层 · ${r.name}</b> ${claimed?'<span class="r-legend">✓</span>':reached?'<span class="r-epic">已到达</span>':'<span class="muted">🔒</span>'}</div>
        <div class="muted" style="font-size:10px">🪙+${r.coin} · 💰+${fmt(r.gold)} · 💎+${r.gem}${itemLabel?' · '+itemLabel+'×1':''}${r.title?' · 称号「'+r.title+'」':''}</div>
      </div>`;
    }
    html += '</div>';

    // 周排行段位
    html += `<div class="ascend-box">
      <div class="detail-label">周排行段位(周一 0 点结算)</div>`;
    for (const tier of TOWER_WEEKLY_TIERS) {
      const cur = (state.tower.weeklyHighest||0) >= tier.min;
      html += `<div class="ascend-milestone ${cur?'reached':''}">
        <div><b>${tier.name}</b> ${cur?'<span class="r-legend">达成</span>':'<span class="muted">🔒</span>'} <span class="muted" style="float:right">≥${tier.min}层</span></div>
        <div class="muted" style="font-size:10px">结算 +${tier.coin}🪙</div>
      </div>`;
    }
    html += '</div>';
  }

  root.innerHTML = html;
}
