/* =========================================================
   life.js — 生活技能(采矿/钓鱼/草药 + 制作)
   ----------------------------------------------------------
   规则:
   - 3 个独立技能,各自 lvl(上限 60),xp
   - 任意时刻只能选 1 个为"当前进行",每 30 秒静默产出 1 件素材 + xp
   - 离线时按时长批量结算(应用启动时调用 lifeOfflineCatchup)
   - 不影响战斗循环,完全独立后台
   - 制作:用素材合成 buff 道具或强化券
   ========================================================= */

const LIFE_TICK_MS = 30000;        // 每 30 秒产出一次
const LIFE_MAX_LVL = 60;
const LIFE_MAX_OFFLINE_TICKS = 240; // 离线最多累计 2 小时(240 * 30s)

const LIFE_SKILLS = {
  mining: {
    name:'采矿', icon:'⛏️', color:'#9ca3af',
    tiers:[
      { matKey:'copper',   matName:'铜矿石',   matIcon:'🟤', minLvl:0,  weight:1 },
      { matKey:'iron',     matName:'铁矿石',   matIcon:'⚫', minLvl:15, weight:1 },
      { matKey:'mithril',  matName:'秘银矿',   matIcon:'⚪', minLvl:30, weight:0.6 },
      { matKey:'thorium',  matName:'瑟银矿',   matIcon:'🟦', minLvl:45, weight:0.3 },
    ],
  },
  fishing: {
    name:'钓鱼', icon:'🎣', color:'#60a5fa',
    tiers:[
      { matKey:'minnow', matName:'米诺鱼',  matIcon:'🐟', minLvl:0,  weight:1 },
      { matKey:'salmon', matName:'三文鱼',  matIcon:'🐠', minLvl:15, weight:1 },
      { matKey:'tuna',   matName:'金枪鱼',  matIcon:'🐡', minLvl:30, weight:0.6 },
      { matKey:'shark',  matName:'鲨鱼',    matIcon:'🦈', minLvl:45, weight:0.3 },
    ],
  },
  herb: {
    name:'草药', icon:'🌿', color:'#22c55e',
    tiers:[
      { matKey:'silverleaf', matName:'银叶草', matIcon:'🍃', minLvl:0,  weight:1 },
      { matKey:'peacebloom', matName:'宁神花', matIcon:'🌸', minLvl:15, weight:1 },
      { matKey:'sungrass',   matName:'阳光草', matIcon:'🌻', minLvl:30, weight:0.6 },
      { matKey:'mageroyal',  matName:'魔皇草', matIcon:'🌺', minLvl:45, weight:0.3 },
    ],
  },
};

/* 制作配方 */
const LIFE_RECIPES = [
  // 采矿:把矿物炼成精华(给装备体系输送材料)
  { key:'refineCopper', name:'熔炼铜矿', icon:'🔥', desc:'熔炼铜矿换取 8 ✨精华',
    cost:{ copper:5 }, minLvl:{mining:5}, action:'essence', value:8 },
  { key:'refineIron', name:'熔炼铁矿', icon:'🔥', desc:'熔炼铁矿换取 25 ✨精华',
    cost:{ iron:5 }, minLvl:{mining:20}, action:'essence', value:25 },
  { key:'refineMithril', name:'秘银精炼', icon:'⚜️', desc:'秘银换取 80 ✨精华',
    cost:{ mithril:3 }, minLvl:{mining:35}, action:'essence', value:80 },
  { key:'refineThorium', name:'瑟银淬炼', icon:'🌟', desc:'瑟银换取 250 ✨精华',
    cost:{ thorium:2 }, minLvl:{mining:50}, action:'essence', value:250 },
  // 钓鱼 + 草药: 食物 buff
  { key:'xpFeast', name:'智者炖鱼', icon:'🍲', desc:'10 分钟内 +20% 经验获取',
    cost:{ salmon:2, peacebloom:2 }, minLvl:{fishing:15, herb:15}, action:'buff', buffKey:'lifeXpFeast', buffDur:600000, buffMod:{xpMult:20} },
  { key:'mightFeast', name:'力量盛宴', icon:'🍖', desc:'10 分钟内 +15% 攻击',
    cost:{ tuna:1, sungrass:2 }, minLvl:{fishing:30, herb:30}, action:'buff', buffKey:'lifeMightFeast', buffDur:600000, buffMod:{atkPct:15} },
  { key:'fortuneFeast', name:'幸运盛宴', icon:'🥗', desc:'10 分钟内 +25% 金币/掉率',
    cost:{ shark:1, mageroyal:2 }, minLvl:{fishing:45, herb:45}, action:'buff', buffKey:'lifeFortuneFeast', buffDur:600000, buffMod:{goldMult:25, dropMult:25} },
];

const LIFE_SKILL_PITCH = {
  mining: '矿石可直接熔炼成精华，是装备成长的稳定补给线。',
  fishing: '鱼类是盛宴主料，负责把后台产出转成战斗收益。',
  herb: '草药决定盛宴档位，越高阶的增益越依赖草药等级。',
};

const LIFE_TOOL_MAX_RANK = 5;
const LIFE_ORDER_REFRESH_MS = 15 * 60 * 1000;

const LIFE_TOOL_DATA = {
  mining: {
    name:'矿镐工坊',
    icon:'⚒️',
    effect:'熔炼收益',
    effectPerRank:15,
    extra:'采矿时额外收成概率',
  },
  fishing: {
    name:'渔具工坊',
    icon:'🪝',
    effect:'盛宴时长',
    effectPerRank:12,
    extra:'钓鱼时额外收成概率',
  },
  herb: {
    name:'药篓工坊',
    icon:'🧺',
    effect:'盛宴强度',
    effectPerRank:8,
    extra:'采药时额外收成概率',
  },
};

/* ---------- 状态 ---------- */
function ensureLifeState() {
  if (!state.life) state.life = { mining:{lvl:0,xp:0}, fishing:{lvl:0,xp:0}, herb:{lvl:0,xp:0}, mats:{}, tools:{ mining:0, fishing:0, herb:0 }, orders:{ nextRefreshAt:0, slots:[] } };
  for (const k of Object.keys(LIFE_SKILLS)) if (!state.life[k]) state.life[k] = {lvl:0, xp:0};
  if (!state.life.mats) state.life.mats = {};
  if (!state.life.tools) state.life.tools = { mining:0, fishing:0, herb:0 };
  for (const k of Object.keys(LIFE_SKILLS)) if (typeof state.life.tools[k] !== 'number') state.life.tools[k] = 0;
  if (!state.life.orders) state.life.orders = { nextRefreshAt:0, slots:[] };
  if (!Array.isArray(state.life.orders.slots)) state.life.orders.slots = [];
  if (typeof state.life.orders.nextRefreshAt !== 'number') state.life.orders.nextRefreshAt = 0;
  if (typeof state.lifeAction === 'undefined') state.lifeAction = null;
  if (!state.lifeBuffs) state.lifeBuffs = {};
}

function lifeXpNeeded(lvl) {
  return 20 + lvl * lvl * 4;
}

function lifeAddXp(skillKey, xp) {
  const s = state.life[skillKey];
  if (!s || s.lvl >= LIFE_MAX_LVL) return;
  s.xp += xp;
  while (s.lvl < LIFE_MAX_LVL && s.xp >= lifeXpNeeded(s.lvl)) {
    s.xp -= lifeXpNeeded(s.lvl);
    s.lvl += 1;
    const sk = LIFE_SKILLS[skillKey];
    log(`${sk.icon} ${sk.name} 升到 Lv.${s.lvl}!`, 'good');
  }
}

/* 随机一个素材 key(根据当前等级) */
function lifePickMat(skillKey) {
  const lvl = state.life[skillKey].lvl;
  const tiers = LIFE_SKILLS[skillKey].tiers.filter(t => lvl >= t.minLvl);
  if (tiers.length === 0) return null;
  const totalW = tiers.reduce((s,t)=>s+t.weight, 0);
  let r = Math.random() * totalW;
  for (const t of tiers) { r -= t.weight; if (r <= 0) return t; }
  return tiers[0];
}

/* ---------- 控制 ---------- */
function startLifeAction(skillKey) {
  ensureLifeState();
  if (!LIFE_SKILLS[skillKey]) return;
  state.lifeAction = { type: skillKey, startedAt: Date.now(), lastYieldAt: Date.now() };
  log(`${LIFE_SKILLS[skillKey].icon} 开始${LIFE_SKILLS[skillKey].name}`, 'info');
  markDirty('life');
}

function stopLifeAction() {
  if (state.lifeAction) {
    const sk = LIFE_SKILLS[state.lifeAction.type];
    log(`${sk.icon} 停止${sk.name}`, 'info');
  }
  state.lifeAction = null;
  markDirty('life');
}

/* ---------- 主循环 tick ---------- */
function tickLife(now) {
  ensureLifeState();
  lifeEnsureOrders();
  // buff 过期清理(每次循环统一处理)
  let buffExpired = false;
  for (const k of Object.keys(state.lifeBuffs)) {
    if (state.lifeBuffs[k] && state.lifeBuffs[k] <= now) {
      const recipe = LIFE_RECIPES.find(x => x.buffKey === k);
      delete state.lifeBuffs[k];
      buffExpired = true;
      log(`${recipe ? recipe.icon + ' ' + recipe.name : k} buff 已过期`, 'info');
    }
  }
  if (buffExpired) {
    recomputeStats();
    markDirty('life', 'hero');
  }
  // 自动采集:没有进行中的动作时,自动选等级最高的采集技能
  if (!state.lifeAction) {
    let bestKey = null, bestLvl = -1;
    for (const [key, sk] of Object.entries(LIFE_SKILLS)) {
      const s = state.life[key];
      if (s.lvl > bestLvl) { bestLvl = s.lvl; bestKey = key; }
    }
    if (bestKey) startLifeAction(bestKey);
    return;
  }
  const la = state.lifeAction;
  if (now - la.lastYieldAt < LIFE_TICK_MS) return;
  const ticks = Math.floor((now - la.lastYieldAt) / LIFE_TICK_MS);
  la.lastYieldAt += ticks * LIFE_TICK_MS;
  lifeYieldTicks(la.type, ticks);
  markDirty('life');
}

function lifeYieldTicks(skillKey, ticks) {
  if (!LIFE_SKILLS[skillKey]) return;
  const s = state.life[skillKey];
  let yieldCount = 0;
  const yieldsByMat = {};
  for (let i = 0; i < ticks; i++) {
    const tier = lifePickMat(skillKey);
    if (!tier) continue;
    // 数量: 1 + 等级/30 (向下取整,即 lvl30 给 2 个, lvl60 给 3 个)
    let qty = 1 + Math.floor(s.lvl / 30);
    if (Math.random() < lifeToolGatherBonusChance(skillKey)) qty += 1;
    state.life.mats[tier.matKey] = (state.life.mats[tier.matKey] || 0) + qty;
    yieldsByMat[tier.matName] = (yieldsByMat[tier.matName] || 0) + qty;
    yieldCount += qty;
    // xp(高等级慢一些)
    const xp = s.lvl < 20 ? 3 : (s.lvl < 40 ? 2 : 1);
    lifeAddXp(skillKey, xp);
  }
  if (yieldCount > 0) {
    const desc = Object.entries(yieldsByMat).map(([n,q]) => `${n}×${q}`).join(' ');
    const sk = LIFE_SKILLS[skillKey];
    log(`${sk.icon} ${sk.name}: ${desc}`, 'loot');
  }
}

/* 离线累计:启动时调一次 */
function lifeOfflineCatchup() {
  ensureLifeState();
  if (!state.lifeAction) return;
  const now = Date.now();
  const elapsed = now - state.lifeAction.lastYieldAt;
  if (elapsed < LIFE_TICK_MS) return;
  let ticks = Math.floor(elapsed / LIFE_TICK_MS);
  ticks = Math.min(ticks, LIFE_MAX_OFFLINE_TICKS);
  state.lifeAction.lastYieldAt = now;
  lifeYieldTicks(state.lifeAction.type, ticks);
  const sk = LIFE_SKILLS[state.lifeAction.type];
  log(`📦 离线${sk.name}结算: ${ticks} 次(最多 ${LIFE_MAX_OFFLINE_TICKS} 次)`, 'good');
}

/* ---------- 制作 ---------- */
function lifeCanCraft(recipe) {
  // 等级
  if (recipe.minLvl) {
    for (const [k, v] of Object.entries(recipe.minLvl)) {
      if ((state.life[k]?.lvl || 0) < v) return { ok:false, why:`需要 ${LIFE_SKILLS[k].name} Lv.${v}` };
    }
  }
  // 材料
  for (const [k, v] of Object.entries(recipe.cost||{})) {
    if (k === 'essence') {
      if ((state.essence||0) < v) return { ok:false, why:`需要 ${v} ✨精华` };
    } else {
      if ((state.life.mats[k] || 0) < v) return { ok:false, why:`材料不足` };
    }
  }
  return { ok:true };
}

function lifeCraft(recipeKey) {
  const recipe = LIFE_RECIPES.find(r => r.key === recipeKey);
  if (!recipe) return;
  const can = lifeCanCraft(recipe);
  if (!can.ok) { log(can.why, 'bad'); return; }
  // 扣材料
  for (const [k, v] of Object.entries(recipe.cost||{})) {
    if (k === 'essence') state.essence -= v;
    else state.life.mats[k] -= v;
  }
  // 应用效果
  if (recipe.action === 'essence') {
    const reward = lifeRecipeValue(recipe);
    state.essence = (state.essence || 0) + reward;
    log(`✨ 熔炼 ${recipe.name},+${reward} 精华`, 'epic');
  } else if (recipe.action === 'buff') {
    const dur = lifeRecipeDuration(recipe);
    state.lifeBuffs[recipe.buffKey] = Date.now() + dur;
    recomputeStats();
    log(`${recipe.icon} 享用 ${recipe.name},${Math.max(1, Math.round(dur/60000))} 分钟 buff!`, 'epic');
  }
  markDirty('life', 'hero');
}

/* 收集 buff 加成,被 recomputeStats 调用 */
function collectLifeMod() {
  ensureLifeState();
  const now = Date.now();
  const out = { atkPct:0, hpPct:0, defPct:0, xpMult:0, goldMult:0, dropMult:0 };
  const powerMult = lifeBuffPowerMult();
  for (const recipe of LIFE_RECIPES) {
    if (recipe.action !== 'buff') continue;
    if ((state.lifeBuffs[recipe.buffKey]||0) > now) {
      for (const [k, v] of Object.entries(recipe.buffMod||{})) out[k] = (out[k]||0) + +(v * powerMult).toFixed(1);
    }
  }
  return out;
}

function lifeTotalSkillLevel() {
  ensureLifeState();
  return Object.keys(LIFE_SKILLS).reduce((sum, key) => sum + (state.life[key]?.lvl || 0), 0);
}

function lifeTotalMaterials() {
  ensureLifeState();
  return Object.values(state.life.mats || {}).reduce((sum, qty) => sum + (qty || 0), 0);
}

function lifeYieldPerTick(lvl) {
  return 1 + Math.floor((lvl || 0) / 30);
}

function lifeToolRank(skillKey) {
  ensureLifeState();
  return state.life.tools?.[skillKey] || 0;
}

function lifeToolGatherBonusChance(skillKey) {
  return lifeToolRank(skillKey) * 0.06;
}

function lifeRecipeValue(recipe) {
  if (recipe.action !== 'essence') return recipe.value || 0;
  return Math.round((recipe.value || 0) * (1 + lifeToolRank('mining') * 0.15));
}

function lifeRecipeDuration(recipe) {
  if (recipe.action !== 'buff') return recipe.buffDur || 0;
  return Math.round((recipe.buffDur || 0) * (1 + lifeToolRank('fishing') * 0.12));
}

function lifeBuffPowerMult() {
  return 1 + lifeToolRank('herb') * 0.08;
}

function lifeToolLevelReq(nextRank) {
  return [0, 8, 18, 30, 42, 55][nextRank] || 0;
}

function lifeToolCost(skillKey, nextRank) {
  const skill = LIFE_SKILLS[skillKey];
  const tierIndex = Math.min(skill.tiers.length - 1, Math.floor((nextRank - 1) * skill.tiers.length / LIFE_TOOL_MAX_RANK));
  const tier = skill.tiers[tierIndex];
  return {
    matKey: tier.matKey,
    matName: tier.matName,
    matIcon: tier.matIcon,
    qty: 8 + nextRank * 4 + tierIndex * 2,
    essence: 20 + nextRank * 25,
    reqLvl: lifeToolLevelReq(nextRank),
  };
}

function lifeCanUpgradeTool(skillKey) {
  ensureLifeState();
  const rank = lifeToolRank(skillKey);
  if (rank >= LIFE_TOOL_MAX_RANK) return { ok:false, why:'已满级' };
  const nextRank = rank + 1;
  const cost = lifeToolCost(skillKey, nextRank);
  if ((state.life[skillKey]?.lvl || 0) < cost.reqLvl) return { ok:false, why:`需要 ${LIFE_SKILLS[skillKey].name} Lv.${cost.reqLvl}` };
  if ((state.life.mats[cost.matKey] || 0) < cost.qty) return { ok:false, why:`需要 ${cost.matIcon}${cost.matName}×${cost.qty}` };
  if ((state.essence || 0) < cost.essence) return { ok:false, why:`需要 ✨精华×${cost.essence}` };
  return { ok:true, cost, nextRank };
}

function lifeUpgradeTool(skillKey) {
  const can = lifeCanUpgradeTool(skillKey);
  if (!can.ok) { log(can.why, 'bad'); return; }
  state.life.mats[can.cost.matKey] -= can.cost.qty;
  state.essence -= can.cost.essence;
  state.life.tools[skillKey] = can.nextRank;
  recomputeStats();
  log(`${LIFE_TOOL_DATA[skillKey].icon} ${LIFE_TOOL_DATA[skillKey].name} 升到 Lv.${can.nextRank}!`, 'epic');
  markDirty('life', 'hero');
}

function lifeMatMeta(matKey) {
  return Object.values(LIFE_SKILLS).flatMap(s => s.tiers).find(t => t.matKey === matKey) || { matKey, matName:matKey, matIcon:'?' };
}

function lifeUnlockedTiers(skillKey) {
  const lvl = state.life[skillKey]?.lvl || 0;
  return LIFE_SKILLS[skillKey].tiers.filter(t => lvl >= t.minLvl);
}

function lifeCreateOrderId() {
  return `lo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function lifeGenerateSingleOrder(skillKey, difficulty) {
  const unlocked = lifeUnlockedTiers(skillKey);
  const tier = unlocked[Math.min(unlocked.length - 1, Math.max(0, difficulty - 1))] || LIFE_SKILLS[skillKey].tiers[0];
  const tierIndex = LIFE_SKILLS[skillKey].tiers.findIndex(t => t.matKey === tier.matKey);
  const qty = 4 + difficulty * 2 + tierIndex * 2;
  const totalLevel = lifeTotalSkillLevel();
  const reward = {};
  let title = '';
  let desc = '';
  if (skillKey === 'mining') {
    title = '熔炉补给';
    desc = '交付矿石，直接换取精华。';
    reward.essence = qty * (6 + tierIndex * 7) + totalLevel;
  } else if (skillKey === 'fishing') {
    title = '渔获收购';
    desc = '交付鲜鱼，换取金币和少量荣誉。';
    reward.gold = qty * (45 + tierIndex * 35) + totalLevel * 10;
    reward.honor = Math.max(0, difficulty - 1) * 3 + tierIndex + 1;
  } else {
    title = '药剂采购';
    desc = '交付草药，换取金币并补一小笔精华。';
    reward.gold = qty * (50 + tierIndex * 38) + totalLevel * 9;
    reward.essence = 8 + difficulty * 5 + tierIndex * 4;
  }
  return {
    id: lifeCreateOrderId(),
    completed: false,
    difficulty,
    theme: skillKey,
    icon: skillKey === 'mining' ? '⚒️' : (skillKey === 'fishing' ? '🛶' : '🧪'),
    title,
    desc,
    request: { [tier.matKey]: qty },
    reward,
  };
}

function lifeGenerateBanquetOrder(difficulty) {
  const fishTiers = lifeUnlockedTiers('fishing');
  const herbTiers = lifeUnlockedTiers('herb');
  const fish = fishTiers[Math.max(0, Math.min(fishTiers.length - 1, difficulty - 1))] || LIFE_SKILLS.fishing.tiers[0];
  const herb = herbTiers[Math.max(0, Math.min(herbTiers.length - 1, difficulty - 1))] || LIFE_SKILLS.herb.tiers[0];
  const qty = 2 + difficulty;
  return {
    id: lifeCreateOrderId(),
    completed: false,
    difficulty,
    theme: 'fishing',
    icon: '🍽️',
    title: '前线盛宴',
    desc: '把鱼和草药打包送往营地，换战场资源。',
    request: { [fish.matKey]: qty, [herb.matKey]: qty },
    reward: {
      honor: 6 + difficulty * 4 + Math.floor(lifeTotalSkillLevel() / 20),
      gold: 260 + difficulty * 140 + lifeTotalSkillLevel() * 6,
    },
  };
}

function lifeGenerateExpeditionOrder(difficulty) {
  const miningTiers = lifeUnlockedTiers('mining');
  const fishingTiers = lifeUnlockedTiers('fishing');
  const herbTiers = lifeUnlockedTiers('herb');
  const mining = miningTiers[miningTiers.length - 1] || LIFE_SKILLS.mining.tiers[0];
  const fishing = fishingTiers[fishingTiers.length - 1] || LIFE_SKILLS.fishing.tiers[0];
  const herb = herbTiers[herbTiers.length - 1] || LIFE_SKILLS.herb.tiers[0];
  const qty = 1 + difficulty;
  const totalLevel = lifeTotalSkillLevel();
  return {
    id: lifeCreateOrderId(),
    completed: false,
    difficulty,
    theme: 'herb',
    icon: '📦',
    title: '远征补给',
    desc: '交一套高阶素材，换一份更扎实的综合奖励。',
    request: { [mining.matKey]: qty, [fishing.matKey]: qty, [herb.matKey]: qty },
    reward: {
      gem: totalLevel >= 90 ? 2 : 1,
      essence: 40 + totalLevel * 2,
      honor: 8 + difficulty * 4,
    },
  };
}

function lifeGenerateOrderForSlot(slotIndex) {
  const byLvl = Object.keys(LIFE_SKILLS).sort((a, b) => (state.life[b]?.lvl || 0) - (state.life[a]?.lvl || 0));
  if (slotIndex === 0) return lifeGenerateSingleOrder(byLvl[0], 1);
  if (slotIndex === 1) {
    if ((state.life.fishing?.lvl || 0) >= 15 && (state.life.herb?.lvl || 0) >= 15) return lifeGenerateBanquetOrder(2);
    return lifeGenerateSingleOrder(byLvl[1] || byLvl[0], 2);
  }
  if (lifeTotalSkillLevel() >= 45) return lifeGenerateExpeditionOrder(3);
  return lifeGenerateSingleOrder(byLvl[2] || byLvl[0], 3);
}

function lifeGenerateOrders() {
  return [0, 1, 2].map(i => lifeGenerateOrderForSlot(i));
}

function lifeEnsureOrders(force = false) {
  ensureLifeState();
  const now = Date.now();
  if (!force && state.life.orders.slots.length && state.life.orders.nextRefreshAt > now) return;
  state.life.orders.slots = lifeGenerateOrders();
  state.life.orders.nextRefreshAt = now + LIFE_ORDER_REFRESH_MS;
}

function lifeRefreshOrders() {
  ensureLifeState();
  const now = Date.now();
  const free = !state.life.orders.slots.length || now >= state.life.orders.nextRefreshAt;
  const cost = 30;
  if (!free && (state.essence || 0) < cost) {
    log(`需要 ${cost} ✨精华换单`, 'bad');
    return;
  }
  if (!free) state.essence -= cost;
  lifeEnsureOrders(true);
  log(free ? '📋 专业委托已刷新' : `📋 消耗 ${cost} 精华刷新委托`, 'good');
  markDirty('life', 'hero');
}

function lifeCanFulfillOrder(order) {
  if (!order || order.completed) return false;
  for (const [matKey, qty] of Object.entries(order.request || {})) {
    if ((state.life.mats[matKey] || 0) < qty) return false;
  }
  return true;
}

function lifeRewardParts(reward) {
  const labels = {
    gold:'🪙金币',
    essence:'✨精华',
    honor:'⚔️荣誉',
    gem:'💎宝石',
    tickets:'🎫通用券',
  };
  return Object.entries(reward || {}).map(([key, value]) => `${labels[key] || key}+${fmt(value)}`);
}

function lifeApplyReward(reward) {
  for (const [key, value] of Object.entries(reward || {})) state[key] = (state[key] || 0) + value;
}

function lifeCompleteOrder(orderId) {
  lifeEnsureOrders();
  const idx = state.life.orders.slots.findIndex(x => x.id === orderId);
  if (idx < 0) return;
  const order = state.life.orders.slots[idx];
  if (order.completed) {
    log('这张委托已经完成，等待下次刷新', 'info');
    return;
  }
  if (!lifeCanFulfillOrder(order)) {
    log('委托材料不足', 'bad');
    return;
  }
  for (const [matKey, qty] of Object.entries(order.request || {})) state.life.mats[matKey] -= qty;
  lifeApplyReward(order.reward);
  state.life.orders.slots[idx] = Object.assign({}, order, { completed:true, completedAt: Date.now() });
  log(`${order.icon} 完成 ${order.title}: ${lifeRewardParts(order.reward).join(' · ')}`, 'good');
  markDirty('life', 'hero');
}

function lifeCraftableRecipes() {
  ensureLifeState();
  return LIFE_RECIPES.filter(recipe => lifeCanCraft(recipe).ok);
}

function lifeActiveBuffEntries(now = Date.now()) {
  ensureLifeState();
  return LIFE_RECIPES
    .filter(recipe => recipe.action === 'buff' && (state.lifeBuffs[recipe.buffKey] || 0) > now)
    .map(recipe => ({
      recipe,
      leftSec: Math.ceil(((state.lifeBuffs[recipe.buffKey] || 0) - now) / 1000),
    }));
}

function lifeEssencePotential() {
  ensureLifeState();
  let total = 0;
  for (const recipe of LIFE_RECIPES) {
    if (recipe.action !== 'essence') continue;
    const [matKey, need] = Object.entries(recipe.cost || {})[0] || [];
    if (!matKey || !need) continue;
    const have = state.life.mats[matKey] || 0;
    total += Math.floor(have / need) * lifeRecipeValue(recipe);
  }
  return total;
}

function lifeSkillOverview(key) {
  const sk = LIFE_SKILLS[key];
  const s = state.life[key];
  const unlocked = sk.tiers.filter(t => s.lvl >= t.minLvl);
  const next = sk.tiers.find(t => s.lvl < t.minLvl) || null;
  const qtyPerTick = lifeYieldPerTick(s.lvl);
  return {
    skill: sk,
    state: s,
    unlocked,
    next,
    qtyPerTick,
    qtyPerMin: qtyPerTick * (60000 / LIFE_TICK_MS),
  };
}

function lifeReadyOrderCount() {
  lifeEnsureOrders();
  return state.life.orders.slots.filter(order => !order.completed && lifeCanFulfillOrder(order)).length;
}

function lifeOrderRefreshLeft(now = Date.now()) {
  lifeEnsureOrders();
  return Math.max(0, Math.ceil((state.life.orders.nextRefreshAt - now) / 1000));
}

function updateLifeTabState() {
  ensureLifeState();
  const tab = document.querySelector('.tab-life');
  const badge = $('life-tab-badge');
  if (!tab || !badge) return;
  const activeBuffs = lifeActiveBuffEntries().length;
  const readyOrders = lifeReadyOrderCount();
  const craftable = lifeCraftableRecipes().length;
  let badgeText = '';
  if (activeBuffs > 0) badgeText = `增益${activeBuffs}`;
  else if (readyOrders > 0) badgeText = `委托${Math.min(readyOrders, 9)}`;
  else if (craftable > 0) badgeText = `可做${Math.min(craftable, 9)}`;
  tab.classList.toggle('life-ready', activeBuffs > 0 || readyOrders > 0 || craftable > 0);
  tab.classList.toggle('life-buffing', activeBuffs > 0);
  tab.title = activeBuffs > 0
    ? `专业（${activeBuffs} 个增益生效中）`
    : (readyOrders > 0 ? `专业（${readyOrders} 个委托可交付）` : (craftable > 0 ? `专业（${craftable} 项可制作）` : '专业'));
  badge.hidden = !badgeText;
  badge.textContent = badgeText;
}

/* ---------- 渲染 ---------- */
let lifeSubTab = 'gather'; // 'gather' | 'craft' | 'order' | 'bag'

function lifeRequestHtml(cost) {
  return Object.entries(cost || {}).map(([matKey, qty]) => {
    const meta = lifeMatMeta(matKey);
    const have = state.life.mats[matKey] || 0;
    return `<span class="life-token ${have >= qty ? 'ok' : ''}">${meta.matIcon}${meta.matName} ${have}/${qty}</span>`;
  }).join('');
}

function lifeRewardHtml(reward) {
  const icons = { gold:'🪙', essence:'✨', honor:'⚔️', gem:'💎', tickets:'🎫' };
  const labels = { gold:'金币', essence:'精华', honor:'荣誉', gem:'宝石', tickets:'券' };
  return Object.entries(reward || {}).map(([key, value]) => `<span class="life-token reward">${icons[key] || '🎁'}${labels[key] || key}+${fmt(value)}</span>`).join('');
}

function renderLifeGatherTab(la, currentSkill, nextYieldSec) {
  let html = '';
  if (la && currentSkill) {
    html += `<div class="life-focus-banner" style="border-color:${currentSkill.color}">
      <div class="life-focus-title" style="color:${currentSkill.color}">${profIcon(la.type, 18, currentSkill.icon)} 当前挂机: ${currentSkill.name}</div>
      <div class="life-focus-text">下一次产出 ${nextYieldSec}s · 工坊等级越高，额外收成触发越频繁。</div>
    </div>`;
  }
  html += '<div class="life-skill-grid">';
  for (const [key, sk] of Object.entries(LIFE_SKILLS)) {
    const info = lifeSkillOverview(key);
    const s = info.state;
    const cur = s.xp, need = lifeXpNeeded(s.lvl);
    const pct = s.lvl >= LIFE_MAX_LVL ? 100 : Math.floor(cur * 100 / need);
    const isActive = la && la.type === key;
    const nextTxt = info.next ? `下一档 Lv.${info.next.minLvl} · ${info.next.matIcon}${info.next.matName}` : '所有档位已解锁';
    const stock = info.unlocked.reduce((sum, t) => sum + (state.life.mats[t.matKey] || 0), 0);
    html += `<div class="life-skill-card${isActive ? ' active' : ''}" style="--life-accent:${sk.color}" data-action="lifeSwitch" data-key="${key}">
      <div class="life-skill-top">
        <div>
          <b>${profIcon(key, 18, sk.icon)} ${sk.name}</b>
          <div class="life-skill-meta">Lv.${s.lvl} · ${isActive ? '当前采集中' : '点击切换'}</div>
        </div>
        <span class="life-rank-badge">工坊 ${lifeToolRank(key)}</span>
      </div>
      <div class="bar xp" style="margin:6px 0 4px"><i style="width:${pct}%"></i><span>${s.lvl>=LIFE_MAX_LVL?'MAX':`${cur}/${need}`}</span></div>
      <div class="life-row"><span>基础产量</span><b>${info.qtyPerTick} / 次</b></div>
      <div class="life-row"><span>库存</span><b>${stock}</b></div>
      <div class="life-row"><span>额外收成</span><b>${Math.round(lifeToolGatherBonusChance(key) * 100)}%</b></div>
      <div class="life-inline-note">${nextTxt}</div>
    </div>`;
  }
  html += '</div>';

  html += `<div class="ascend-box">
    <div class="detail-label">专业工坊</div>
    <div class="life-workshop-grid">`;
  for (const [key, tool] of Object.entries(LIFE_TOOL_DATA)) {
    const rank = lifeToolRank(key);
    const can = lifeCanUpgradeTool(key);
    const nextRank = Math.min(LIFE_TOOL_MAX_RANK, rank + 1);
    const cost = rank < LIFE_TOOL_MAX_RANK ? lifeToolCost(key, nextRank) : null;
    html += `<div class="life-upgrade-card">
      <div class="life-skill-top">
        <div>
          <b>${tool.icon} ${tool.name}</b>
          <div class="life-skill-meta">Lv.${rank}/${LIFE_TOOL_MAX_RANK}</div>
        </div>
        <span class="life-rank-badge">${tool.effect}+${rank * tool.effectPerRank}%</span>
      </div>
      <div class="life-row"><span>${tool.extra}</span><b>${Math.round(lifeToolGatherBonusChance(key) * 100)}%</b></div>
      ${cost ? `<div class="life-inline-note">下一级需要 ${cost.matIcon}${cost.matName}×${cost.qty} · ✨${cost.essence} · ${LIFE_SKILLS[key].name} Lv.${cost.reqLvl}</div>` : `<div class="life-inline-note">已达到当前版本满级</div>`}
      <button class="${can.ok ? 'gold' : ''}" data-action="lifeUpgradeTool" data-key="${key}" ${can.ok ? '' : 'disabled'}>升级工坊</button>
    </div>`;
  }
  html += `</div></div>`;
  return html;
}

function renderLifeCraftTab(activeBuffs) {
  let html = '';
  if (activeBuffs.length > 0) {
    html += `<div class="ascend-box"><div class="detail-label">生效中的盛宴</div>
      <div class="life-token-row">${activeBuffs.map(x=>`<span class="life-token reward">${x.recipe.icon}${x.recipe.name} ${fmtCd(x.leftSec)}</span>`).join('')}</div>
    </div>`;
  }
  const recipeGroups = [
    { title:'✨ 熔炼台', items:LIFE_RECIPES.filter(x => x.action === 'essence') },
    { title:'🍽️ 盛宴台', items:LIFE_RECIPES.filter(x => x.action === 'buff') },
  ];
  for (const group of recipeGroups) {
    html += `<div class="ascend-box"><div class="detail-label">${group.title}</div>`;
    for (const recipe of group.items) {
      const can = lifeCanCraft(recipe);
      const output = recipe.action === 'essence'
        ? `产出 ${lifeRecipeValue(recipe)} ✨精华`
        : `持续 ${Math.max(1, Math.round(lifeRecipeDuration(recipe)/60000))} 分钟 · 强度 x${lifeBuffPowerMult().toFixed(2)}`;
      const lvlTxt = recipe.minLvl ? Object.entries(recipe.minLvl).map(([k,v]) => `${LIFE_SKILLS[k].name}Lv.${v}`).join(' / ') : '无等级要求';
      html += `<div class="life-recipe-card${can.ok ? ' ready' : ''}">
        <div class="life-skill-top">
          <div>
            <b>${recipe.icon} ${recipe.name}</b>
            <div class="life-skill-meta">${recipe.desc}</div>
          </div>
          <button class="${can.ok ? 'gold' : ''}" data-action="lifeCraft" data-key="${recipe.key}" ${can.ok ? '' : 'disabled'}>制作</button>
        </div>
        <div class="life-row"><span>${lvlTxt}</span><b>${output}</b></div>
        <div class="life-token-row">${lifeRequestHtml(recipe.cost)}</div>
      </div>`;
    }
    html += '</div>';
  }
  return html;
}

function renderLifeOrderTab(now) {
  lifeEnsureOrders();
  const ready = lifeReadyOrderCount();
  const left = lifeOrderRefreshLeft(now);
  let html = `<div class="ascend-box">
    <div class="life-skill-top">
      <div>
        <b>📋 专业委托</b>
        <div class="life-skill-meta">${ready > 0 ? `${ready} 个委托可立即交付` : '把仓库材料换成金币、精华、荣誉和宝石'}</div>
      </div>
      <button data-action="lifeOrderRefresh">${left > 0 ? '换单 30精华' : '免费刷新'}</button>
    </div>
    <div class="life-inline-note">${left > 0 ? `自动刷新倒计时 ${fmtCd(left)}` : '委托已可免费刷新'}</div>
  </div>`;
  html += '<div class="life-order-grid">';
  state.life.orders.slots.forEach(order => {
    const can = lifeCanFulfillOrder(order);
    const done = !!order.completed;
    const theme = LIFE_SKILLS[order.theme]?.color || 'var(--accent)';
    html += `<div class="life-order-card${can ? ' ready' : ''}${done ? ' done' : ''}" style="--life-accent:${theme}">
      <div class="life-skill-top">
        <div>
          <b>${order.icon} ${order.title}</b>
          <div class="life-skill-meta">${done ? '本轮已交付，等待刷新补单' : order.desc}</div>
        </div>
        <span class="life-rank-badge">${done ? '已完成' : `T${order.difficulty}`}</span>
      </div>
      <div class="life-token-row">${lifeRequestHtml(order.request)}</div>
      <div class="life-token-row">${lifeRewardHtml(order.reward)}</div>
      <button class="${can ? 'gold' : ''}" data-action="lifeOrderClaim" data-id="${order.id}" ${can ? '' : 'disabled'}>${done ? '等待刷新' : (can ? '交付委托' : '材料不足')}</button>
    </div>`;
  });
  html += '</div>';
  return html;
}

function renderLifeBagTab() {
  let html = `<div class="ascend-box"><div class="detail-label">材料仓库</div><div class="life-bag-groups">`;
  for (const [skKey, sk] of Object.entries(LIFE_SKILLS)) {
    html += `<div class="life-bag-group">
      <div class="life-bag-head" style="color:${sk.color}">${profIcon(skKey, 16, sk.icon)} ${sk.name}</div>
      <div class="life-bag-grid">`;
    for (const t of sk.tiers) {
      const have = state.life.mats[t.matKey] || 0;
      html += `<div class="life-mat-chip${have > 0 ? ' stocked' : ''}">
        <span>${t.matIcon}${t.matName}</span>
        <b>${fmt(have)}</b>
      </div>`;
    }
    html += `</div></div>`;
  }
  html += '</div></div>';
  return html;
}

function renderLife() {
  ensureLifeState();
  lifeEnsureOrders();
  const root = $('tab-life'); if (!root) return;
  const la = state.lifeAction;
  const now = Date.now();
  const activeBuffs = lifeActiveBuffEntries(now);
  const currentSkill = la ? LIFE_SKILLS[la.type] : null;
  const nextYieldSec = la ? Math.max(0, Math.ceil((la.lastYieldAt + LIFE_TICK_MS - now) / 1000)) : 0;
  const readyOrders = lifeReadyOrderCount();
  let html = '';

  updateLifeTabState();

  html += `<div class="life-dashboard">
    <div class="life-stat-strip">
      <div class="life-stat-card">
        <span>当前挂机</span>
        <b>${la && currentSkill ? currentSkill.name : '待命'}</b>
        <small>${la ? `${nextYieldSec}s 后产出` : '进入后自动开始'}</small>
      </div>
      <div class="life-stat-card">
        <span>仓库材料</span>
        <b>${fmt(lifeTotalMaterials())}</b>
        <small>三系素材总量</small>
      </div>
      <div class="life-stat-card">
        <span>可炼精华</span>
        <b>${fmt(lifeEssencePotential())}</b>
        <small>按当前配方即时转化</small>
      </div>
      <div class="life-stat-card">
        <span>待交委托</span>
        <b>${readyOrders}</b>
        <small>${activeBuffs.length} 个增益生效中</small>
      </div>
    </div>
    <div class="life-activity-bar">
      <span class="life-token">${profIcon('mining', 15, '⛏️')} 熔炼受矿镐工坊加成</span>
      <span class="life-token">${profIcon('fishing', 15, '🎣')} 盛宴时长受渔具工坊加成</span>
      <span class="life-token">${profIcon('herb', 15, '🌿')} 盛宴强度受药篓工坊加成</span>
      <span class="life-token reward">📋 委托每 15 分钟自动刷新</span>
    </div>
  </div>`;

  html += `<div class="sub-tabs" style="margin-bottom:6px">
    <span class="sub-tab ${lifeSubTab==='gather'?'active':''}" data-lifesub="gather">🛠️ 采集</span>
    <span class="sub-tab ${lifeSubTab==='craft'?'active':''}" data-lifesub="craft">⚒️ 制作</span>
    <span class="sub-tab ${lifeSubTab==='order'?'active':''}" data-lifesub="order">📋 委托</span>
    <span class="sub-tab ${lifeSubTab==='bag'?'active':''}" data-lifesub="bag">📦 仓库</span>
  </div>`;

  if (lifeSubTab === 'gather') html += renderLifeGatherTab(la, currentSkill, nextYieldSec);
  else if (lifeSubTab === 'craft') html += renderLifeCraftTab(activeBuffs);
  else if (lifeSubTab === 'order') html += renderLifeOrderTab(now);
  else if (lifeSubTab === 'bag') html += renderLifeBagTab();

  root.innerHTML = html;
}
