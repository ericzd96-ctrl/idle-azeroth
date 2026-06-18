/* =========================================================
   enhance.js — 装备深度系统(词缀/宝石孔/附魔/重铸/分解)
   ----------------------------------------------------------
   本文件不依赖其他文件加载顺序之外的副作用,提供:
   - AFFIX_POOL / GEM_TYPES / ENCHANT_POOL 数据
   - rollAffixesForItem / pickSocketCount  装备生成时调用
   - collectItemBonuses(item)              装备总加成(基础+词缀+宝石+附魔)
   - applyItemBonusesToStats(bonuses)      累加到 recomputeStats 的临时变量
   - openItemDetail / 各种操作函数         玩家交互
   ========================================================= */

/* ---------- 词缀池 ---------- */
/* 每条词缀: key, name, mod(key=>perTierValue), tiers定义 */
const AFFIX_POOL = [
  { key:'mighty',    name:'狂战的',    mod:'atkPct',       tierVals:[[2,4],[4,7],[7,12]] },
  // 暴击(precise)/暴伤(cruel)词缀已移除 —— 改为只通过"惊喜副属性"在蓝装以上低概率出现(见 combat.js finishItem)
  { key:'swift',     name:'疾风的',    mod:'spdPct',       tierVals:[[2,4],[4,7],[7,12]] },
  { key:'sturdy',    name:'坚韧的',    mod:'hpPct',        tierVals:[[2,4],[4,8],[8,14]] },
  { key:'fortified', name:'壁垒的',    mod:'defPct',       tierVals:[[2,5],[5,10],[10,16]] },
  // 吸血(vampiric)/全能(versatile)/精通(masterful)词缀已移除 —— 这三项改为只通过"惊喜副属性"在蓝装以上低概率出现(见 combat.js finishItem)
  { key:'quick',     name:'急速的',    mod:'cdReduction',  tierVals:[[1,3],[3,5],[5,8]] },
  { key:'efficient', name:'节能的',    mod:'costReduction',tierVals:[[2,4],[4,7],[7,12]] },
  { key:'piercing',  name:'锐利的',    mod:'extraAtk',     tierVals:[[1,3],[3,5],[5,9]] },
  { key:'venomous',  name:'毒蚀的',    mod:'dotBonus',     tierVals:[[3,6],[6,12],[12,20]] },
  { key:'executioner',name:'处决的',   mod:'executeBonus', tierVals:[[3,6],[6,12],[12,18]] },
  { key:'restorative',name:'救赎的',   mod:'healBonus',    tierVals:[[3,6],[6,12],[12,20]] },
  { key:'thorny',    name:'尖刺的',    mod:'reflectDmg',   tierVals:[[2,4],[4,7],[7,11]] },
  { key:'titanic',   name:'泰坦的',    mod:'strPct',       tierVals:[[2,4],[4,8],[8,14]] },
  { key:'feral',     name:'狂野的',    mod:'agiPct',       tierVals:[[2,4],[4,8],[8,14]] },
  { key:'arcane',    name:'秘法的',    mod:'intPct',       tierVals:[[2,4],[4,8],[8,14]] },
  { key:'spiritual', name:'圣灵的',    mod:'spiPct',       tierVals:[[2,4],[4,8],[8,14]] },
  { key:'enduring',  name:'不朽的',    mod:'staPct',       tierVals:[[2,4],[4,8],[8,14]] },
];

const AFFIX_BY_KEY = AFFIX_POOL.reduce((m,a)=>{m[a.key]=a;return m;},{});

/* 不同品质生成词缀的配置 */
const AFFIX_CONFIG = {
  common:   { tiers:[] },
  uncommon: { tiers:[1] },               // 1 条 T1
  rare:     { tiers:[1,1] },             // 2 条 T1
  epic:     { tiers:[1,2,2] },           // 1 T1 + 2 T2
  legend:   { tiers:[2,2,3] },           // 2 T2 + 1 T3
};

/* ---------- 宝石孔 ---------- */
const SOCKET_COLORS = ['red','yellow','blue'];
const SOCKET_COLOR_INFO = {
  red:    { name:'红', cls:'sock-red',    icon:'🔴' },
  yellow: { name:'黄', cls:'sock-yellow', icon:'🟡' },
  blue:   { name:'蓝', cls:'sock-blue',   icon:'🔵' },
};
/* 不同品质的孔数(随机区间) */
const SOCKET_BY_RARITY = {
  common:   [0,0],
  uncommon: [0,0],
  rare:     [0,1],
  epic:     [1,2],
  legend:   [2,3],
};

/* ---------- 宝石 ---------- */
/* 每种宝石: key, name, color, tier, baseStat(stats), matchBonusPct(同色额外%) */
const GEM_TYPES = {
  red_t1:    { name:'粗糙红宝石',  color:'red',    tier:1, stats:{atk:8} },
  red_t2:    { name:'精致红宝石',  color:'red',    tier:2, stats:{atk:18} },
  red_t3:    { name:'华丽红宝石',  color:'red',    tier:3, stats:{atk:36} },
  yellow_t1: { name:'粗糙黄玉',    color:'yellow', tier:1, stats:{haste:1} },
  yellow_t2: { name:'精致黄玉',    color:'yellow', tier:2, stats:{haste:2} },
  yellow_t3: { name:'华丽黄玉',    color:'yellow', tier:3, stats:{haste:4} },
  blue_t1:   { name:'粗糙蓝宝石',  color:'blue',   tier:1, stats:{hp:40} },
  blue_t2:   { name:'精致蓝宝石',  color:'blue',   tier:2, stats:{hp:90} },
  blue_t3:   { name:'华丽蓝宝石',  color:'blue',   tier:3, stats:{hp:180} },
};

/* 同色宝石嵌入获得额外加成倍率 */
const SOCKET_MATCH_BONUS = 0.25;

/* ---------- 附魔 ---------- */
/* 每个槽位有不同的可选附魔。每个附魔有一个加成 */
const ENCHANT_POOL = {
  weapon: [
    { key:'wpn_atk',  name:'攻击之力',   mod:{atkPct:6},      cost:{gold:500,essence:3} },
    { key:'wpn_hst',  name:'急速',       mod:{haste:2},     cost:{gold:500,essence:3} },
    { key:'wpn_spd',  name:'迅捷打击',   mod:{spdPct:5},      cost:{gold:500,essence:3} },
    { key:'wpn_pow',  name:'强攻',       mod:{atkPct:9},      cost:{gold:800,essence:5} },
  ],
  helmet: [
    { key:'hlm_int',  name:'智慧',       mod:{intPct:6},      cost:{gold:300,essence:2} },
    { key:'hlm_sta',  name:'坚毅',       mod:{staPct:6},      cost:{gold:300,essence:2} },
    { key:'hlm_vers', name:'全能',       mod:{vers:2},     cost:{gold:500,essence:3} },
  ],
  shoulder: [
    { key:'sh_atk',   name:'力量',       mod:{atkPct:5},      cost:{gold:300,essence:2} },
    { key:'sh_leech', name:'吸血',       mod:{leech:2},     cost:{gold:400,essence:3} },
  ],
  armor: [
    { key:'arm_hp',   name:'生命',       mod:{hpPct:8},       cost:{gold:400,essence:3} },
    { key:'arm_def',  name:'防御',       mod:{defPct:8},      cost:{gold:400,essence:3} },
    { key:'arm_sta',  name:'坚韧',       mod:{staPct:6},      cost:{gold:600,essence:4} },
  ],
  gloves: [
    { key:'glv_hst',  name:'急速',       mod:{haste:2},     cost:{gold:300,essence:2} },
    { key:'glv_extra',name:'连击',       mod:{extraAtk:4},    cost:{gold:500,essence:3} },
  ],
  belt: [
    { key:'blt_sta',  name:'耐力',       mod:{staPct:5},      cost:{gold:300,essence:2} },
    { key:'blt_cd',   name:'冷却',       mod:{cdReduction:3}, cost:{gold:600,essence:4} },
  ],
  pants: [
    { key:'pnt_hp',   name:'生命',       mod:{hpPct:7},       cost:{gold:300,essence:2} },
    { key:'pnt_atk',  name:'力量',       mod:{atkPct:5},      cost:{gold:400,essence:3} },
  ],
  boots: [
    { key:'bts_spd',  name:'疾步',       mod:{spdPct:5},      cost:{gold:300,essence:2} },
    { key:'bts_vers', name:'全能',       mod:{vers:2},      cost:{gold:400,essence:3} },
  ],
  ring: [
    { key:'rng_atk',  name:'威能',       mod:{atkPct:5},      cost:{gold:400,essence:3} },
    { key:'rng_hst',  name:'急速',       mod:{haste:2},     cost:{gold:400,essence:3} },
    { key:'rng_cost', name:'节能',       mod:{costReduction:5},cost:{gold:500,essence:4} },
  ],
  trinket: [
    { key:'tkt_pow',  name:'狠毒',       mod:{atkPct:6},      cost:{gold:400,essence:3} },
    { key:'tkt_hp',   name:'通才',       mod:{hpPct:8},       cost:{gold:600,essence:4} },
    { key:'tkt_vers', name:'全能',       mod:{vers:3},     cost:{gold:600,essence:4} },
  ],
};

/* 分解装备产出 */
const DISASSEMBLE_TABLE = {
  common:   { essence:[0,0], gemChance:0 },
  uncommon: { essence:[0,1], gemChance:0 },
  rare:     { essence:[1,2], gemChance:0.02 },
  epic:     { essence:[3,6], gemChance:0.10 },
  legend:   { essence:[8,15],gemChance:0.30 },
};

/* ---------- 词缀生成 ---------- */
function rollAffixesForItem(item, rarity, power) {
  const cfg = AFFIX_CONFIG[rarity.key]; if (!cfg) return;
  if (cfg.tiers.length === 0) return;
  // 不重复地从池子里抽
  const pool = AFFIX_POOL.slice();
  const affixes = [];
  for (const tier of cfg.tiers) {
    if (pool.length === 0) break;
    const idx = rng(0, pool.length-1);
    const ax = pool.splice(idx, 1)[0];
    const [lo, hi] = ax.tierVals[tier-1];
    const v = +(lo + Math.random()*(hi-lo)).toFixed(1);
    affixes.push({ key:ax.key, tier, value:v, rerolls:0 });
  }
  item.affixes = affixes;
}

/* ---------- 宝石孔生成 ---------- */
function rollSocketsForItem(item, rarity) {
  const range = SOCKET_BY_RARITY[rarity.key]; if (!range) return;
  const n = rng(range[0], range[1]);
  if (n <= 0) return;
  item.sockets = [];
  for (let i = 0; i < n; i++) {
    item.sockets.push({ color: choice(SOCKET_COLORS), gem: null });
  }
}

/* 在装备生成的最后调用,把词缀和宝石孔挂上 */
function enhanceItemOnCreate(item, rarity, power) {
  rollAffixesForItem(item, rarity, power);
  rollSocketsForItem(item, rarity);
}

/* ---------- 收集装备的所有 mod ---------- */
/* 把基础 stats / 词缀 / 宝石 / 附魔 全部归一到 {mod-key: value} 累加 */
function collectItemBonuses(item) {
  const out = {
    // 直接属性
    atk:0, def:0, hp:0, crit:0, critd:0, spd:0, reg:0,
    str:0, agi:0, int:0, spi:0, sta:0,
    leech:0, vers:0, mastery:0, haste:0, dodge:0,
    // 百分比与额外
    atkPct:0, hpPct:0, defPct:0, spdPct:0, critdPct:0,
    strPct:0, agiPct:0, intPct:0, spiPct:0, staPct:0,
    cdReduction:0, costReduction:0, extraAtk:0,
    healBonus:0, dotBonus:0, executeBonus:0, reflectDmg:0,
  };
  if (!item) return out;
  // 1) 基础 stats
  if (item.stats) {
    for (const [k, v] of Object.entries(item.stats)) {
      if (k in out) out[k] += v;
    }
  }
  // 2) 词缀
  if (item.affixes) {
    for (const af of item.affixes) {
      const def = AFFIX_BY_KEY[af.key]; if (!def) continue;
      if (def.mod in out) out[def.mod] += af.value;
    }
  }
  // 3) 宝石
  if (item.sockets) {
    for (const sk of item.sockets) {
      if (!sk.gem) continue;
      const g = GEM_TYPES[sk.gem]; if (!g) continue;
      const match = sk.color === g.color ? 1 + SOCKET_MATCH_BONUS : 1;
      for (const [k, v] of Object.entries(g.stats)) {
        if (k in out) out[k] += v * match;
      }
    }
  }
  // 4) 附魔
  if (item.enchant) {
    const slotEnchs = ENCHANT_POOL[item.slot] || [];
    const e = slotEnchs.find(x => x.key === item.enchant);
    if (e) {
      for (const [k, v] of Object.entries(e.mod)) {
        if (k in out) out[k] += v;
      }
    }
  }
  return out;
}

/* ---------- 单项来源加成(供 combat 分源追踪) ---------- */
/* 返回零值模板 */
function _emptyBonusOut() {
  return {
    atk:0, def:0, hp:0, crit:0, critd:0, spd:0, reg:0,
    str:0, agi:0, int:0, spi:0, sta:0,
    leech:0, vers:0, mastery:0, haste:0, dodge:0,
    atkPct:0, hpPct:0, defPct:0, spdPct:0, critdPct:0,
    strPct:0, agiPct:0, intPct:0, spiPct:0, staPct:0,
    cdReduction:0, costReduction:0, extraAtk:0,
    healBonus:0, dotBonus:0, executeBonus:0, reflectDmg:0,
  };
}

/* 仅装备基础属性(不含词缀/宝石/附魔) */
function collectBaseBonuses(item) {
  const out = _emptyBonusOut();
  if (!item || !item.stats) return out;
  for (const [k, v] of Object.entries(item.stats)) {
    if (k in out) out[k] += v;
  }
  return out;
}

/* 仅词缀加成 */
function collectAffixBonuses(item) {
  const out = _emptyBonusOut();
  if (!item || !item.affixes) return out;
  for (const af of item.affixes) {
    const def = AFFIX_BY_KEY[af.key]; if (!def) continue;
    if (def.mod in out) out[def.mod] += af.value;
  }
  return out;
}

/* 仅宝石加成 */
function collectGemBonuses(item) {
  const out = _emptyBonusOut();
  if (!item || !item.sockets) return out;
  for (const sk of item.sockets) {
    if (!sk.gem) continue;
    const g = GEM_TYPES[sk.gem]; if (!g) continue;
    const match = sk.color === g.color ? 1 + SOCKET_MATCH_BONUS : 1;
    for (const [k, v] of Object.entries(g.stats)) {
      if (k in out) out[k] += v * match;
    }
  }
  return out;
}

/* 仅附魔加成 */
function collectEnchantBonuses(item) {
  const out = _emptyBonusOut();
  if (!item || !item.enchant) return out;
  const slotEnchs = ENCHANT_POOL[item.slot] || [];
  const e = slotEnchs.find(x => x.key === item.enchant);
  if (e) {
    for (const [k, v] of Object.entries(e.mod)) {
      if (k in out) out[k] += v;
    }
  }
  return out;
}

/* ---------- 玩家操作 ---------- */
function getItemById(id) {
  for (const it of state.inventory) if (it.id === id) { syncItemIdentity(it); return { item:it, source:'inv' }; }
  for (const k of SLOT_ORDER) { const it = state.equipped[k]; if (it && it.id === id) { syncItemIdentity(it); return { item:it, source:'equip', slot:k }; } }
  return null;
}

function ensureMats() {
  if (typeof state.essence !== 'number') state.essence = 0;
  if (!state.gems) state.gems = {};
}

function estimateItemRollPower(item) {
  if (!item) return Math.max(1, state?.hero?.lvl || 1);
  if (typeof item._rollPower === 'number' && item._rollPower > 0) return item._rollPower;
  const req = Math.max(1, item.reqLvl || state?.hero?.lvl || 1);
  return Math.max(req, Math.ceil(req / 0.9));
}

function itemSlotLabel(itemOrSlot) {
  const slotKey = typeof itemOrSlot === 'string' ? itemOrSlot : itemOrSlot?.slot;
  return SLOT_INFO[slotKey]?.label || slotKey || '未知部位';
}

function normalizeItemNameForSlot(item) {
  if (!item?.name || !item?.slot || !SLOT_INFO[item.slot]) return item?.name || '';
  const targetLabel = SLOT_INFO[item.slot].label;
  const knownLabels = SLOT_ORDER.map(k => SLOT_INFO[k]?.label).filter(Boolean).sort((a, b) => b.length - a.length);
  let name = String(item.name).trim();
  const wrongLabel = knownLabels.find(label => label !== targetLabel && name.includes(label));
  if (wrongLabel) name = name.replace(wrongLabel, targetLabel);
  return name;
}

function syncItemIdentity(item) {
  if (!item || !SLOT_INFO[item.slot]) return item;
  const normalized = normalizeItemNameForSlot(item);
  if (normalized && item.name !== normalized) item.name = normalized;
  if (!item._baseName) item._baseName = item.name;
  if (!item._rollSlot) item._rollSlot = item.slot;
  if (typeof item._rollPower !== 'number' || item._rollPower <= 0) item._rollPower = estimateItemRollPower(item);
  if (typeof item._baseExtraStats === 'undefined') {
    if (typeof resolveItemTemplateStats === 'function') item._baseExtraStats = resolveItemTemplateStats(item);
    else item._baseExtraStats = {};
  }
  return item;
}

function itemSlotBadge(item, compact) {
  if (!item?.slot || !SLOT_INFO[item.slot]) return '';
  const label = compact ? itemSlotLabel(item) : `部位:${itemSlotLabel(item)}`;
  return ` <span class="item-slot-tag">${label}</span>`;
}

function itemDisplayNameHtml(item, opts) {
  if (!item) return '';
  syncItemIdentity(item);
  const options = Object.assign({ slotBadge:true }, opts || {});
  return `${item.name}${options.slotBadge ? itemSlotBadge(item, true) : ''}`;
}

function renderItemSetEffectsHtml(item) {
  if (!item?.setName) return '';
  syncItemIdentity(item);
  let equippedCount = 0;
  if (typeof getEquippedSetCounts === 'function') {
    equippedCount = getEquippedSetCounts()?.[item.setKey]?.count || 0;
  } else {
    equippedCount = Object.values(state.equipped || {}).filter(it => it?.setKey === item.setKey).length;
  }
  const effects = (item.setEffects || []).map(effect => {
    const active = equippedCount >= effect.pieces;
    const desc = Object.entries(effect.mod || {}).map(([k, v]) => fmtMod(k, v)).join(' · ');
    return `<div class="${active ? 'pos' : 'muted'} set-effect-line">${active ? '✓' : '○'} ${effect.pieces}件: ${desc || '无额外效果'}</div>`;
  }).join('');
  return `
    <div class="detail-section">
      <div class="detail-label">🧩 套装效果</div>
      <div style="font-weight:700">${item.setName} <span class="muted" style="font-size:11px">(${equippedCount}/${item.setPieces || 4})</span></div>
      <div class="muted" style="font-size:11px;margin-top:4px">同系列装备凑齐 2 件 / 4 件后会激活以下效果：</div>
      <div style="margin-top:4px">${effects || '<div class="muted" style="font-size:11px">该套装暂未配置额外效果</div>'}</div>
    </div>`;
}

function getItemFullRerollCost(item) {
  const rarityFactor = { common:0.8, uncommon:1.1, rare:1.5, epic:2.4, legend:4 }[item?.rarity] || 1.2;
  const rerollCount = item?.fullRerolls || 0;
  return {
    gold: Math.max(120, Math.floor((item?.reqLvl || 1) * 18 * rarityFactor * (1 + rerollCount * 0.75))),
    essence: Math.max(0, Math.floor(({ common:0, uncommon:0, rare:1, epic:3, legend:6 }[item?.rarity] || 1) * (1 + rerollCount * 0.5))),
  };
}

function rerollItemFully(itemId) {
  ensureMats();
  const found = getItemById(itemId); if (!found) return;
  const it = found.item;
  syncItemIdentity(it);
  const cost = getItemFullRerollCost(it);
  if (state.gold < cost.gold) { log('💰 金币不足(' + cost.gold + ')', 'bad'); return; }
  if (state.essence < cost.essence) { log('💎 魔法精华不足(' + cost.essence + ')', 'bad'); return; }
  const returnKeys = [];
  if (it.sockets) {
    for (const sk of it.sockets) {
      if (!sk.gem) continue;
      returnKeys.push(sk.gem);
    }
  }
  const costText = `${cost.gold}💰${cost.essence ? ` + ${cost.essence}✨` : ''}`;
  if (!confirm(`重洗 [${it.name}]？\n将消耗 ${costText}\n会重掷基础数值、词缀和宝石孔，并清除附魔。\n已镶嵌的宝石会返还到背包。`)) return;
  state.gold -= cost.gold;
  state.essence -= cost.essence;
  const returns = [];
  for (const gemKey of returnKeys) {
    state.gems[gemKey] = (state.gems[gemKey] || 0) + 1;
    returns.push(GEM_TYPES[gemKey]?.name || gemKey);
  }
  const rarity = RARITY.find(r => r.key === it.rarity) || RARITY[0];
  const power = estimateItemRollPower(it);
  const extraStats = typeof resolveItemTemplateStats === 'function' ? resolveItemTemplateStats(it) : (it._baseExtraStats || {});
  const preserved = {
    id: it.id,
    slot: it.slot,
    name: it._baseName || normalizeItemNameForSlot(it) || it.name,
    rarity: it.rarity,
    rarityName: it.rarityName,
    cls: it.cls,
    bcls: it.bcls,
    sell: it.sell,
    epicRaid: !!it.epicRaid,
    setKey: it.setKey,
    setName: it.setName,
    setEffects: Array.isArray(it.setEffects) ? JSON.parse(JSON.stringify(it.setEffects)) : it.setEffects,
    setPieces: it.setPieces,
    reqLvl: it.reqLvl,
    _baseName: it._baseName || it.name,
    _baseExtraStats: JSON.parse(JSON.stringify(extraStats || {})),
    _rollPower: power,
    _rollSlot: it.slot,
    _rollProfileKeys: Array.isArray(it._rollProfileKeys) && it._rollProfileKeys.length ? it._rollProfileKeys.slice() : Object.keys(it.stats || {}),
    fullRerolls: (it.fullRerolls || 0) + 1,
  };
  for (const key of Object.keys(it)) delete it[key];
  Object.assign(it, preserved, { stats:{} });
  delete it.affixes;
  delete it.sockets;
  delete it.enchant;
  finishItem(it, it.slot, rarity, power, extraStats || {});
  it.fullRerolls = preserved.fullRerolls;
  syncItemIdentity(it);
  const returnedText = returns.length ? `，返还宝石 ${returns.join(' / ')}` : '';
  log(`🎲 重洗完成 [${it.name}]${returnedText}`,'good');
  recomputeStats();
  markDirty('inventory','equipment','hero');
  renderItemDetail(itemId);
}

function rerollAffix(itemId, affixIdx) {
  ensureMats();
  const found = getItemById(itemId); if (!found) return;
  const it = found.item;
  if (!it.affixes || !it.affixes[affixIdx]) return;
  const af = it.affixes[affixIdx];
  const cost = 200 * (1 + (af.rerolls||0));
  const essCost = 1;
  if (state.gold < cost) { log('💰 金币不足('+cost+')', 'bad'); return; }
  if (state.essence < essCost) { log('💎 魔法精华不足('+essCost+')', 'bad'); return; }
  state.gold -= cost;
  state.essence -= essCost;
  const def = AFFIX_BY_KEY[af.key];
  const [lo, hi] = def.tierVals[af.tier-1];
  const oldV = af.value;
  af.value = +(lo + Math.random()*(hi-lo)).toFixed(1);
  af.rerolls = (af.rerolls||0) + 1;
  log(`♻️ 重铸 [${def.name}] ${oldV} → ${af.value}`, 'good');
  if (typeof progressionOnReroll === 'function') progressionOnReroll();
  recomputeStats();
  markDirty('inventory','equipment','hero');
  renderItemDetail(itemId);
}

function insertGem(itemId, socketIdx, gemKey) {
  ensureMats();
  const found = getItemById(itemId); if (!found) return;
  const it = found.item;
  if (!it.sockets || !it.sockets[socketIdx]) return;
  if (it.sockets[socketIdx].gem) { log('该孔已有宝石,先拆除', 'bad'); return; }
  if ((state.gems[gemKey]||0) <= 0) { log('该宝石不足', 'bad'); return; }
  state.gems[gemKey]--;
  it.sockets[socketIdx].gem = gemKey;
  log(`💎 镶嵌 [${GEM_TYPES[gemKey].name}]`, 'good');
  if (typeof progressionOnGem === 'function') progressionOnGem();
  if (typeof eventsOnGem === 'function') eventsOnGem();
  recomputeStats();
  markDirty('inventory','equipment','hero');
  renderItemDetail(itemId);
}

function removeGem(itemId, socketIdx) {
  const found = getItemById(itemId); if (!found) return;
  const it = found.item;
  if (!it.sockets || !it.sockets[socketIdx] || !it.sockets[socketIdx].gem) return;
  const cost = 50;
  if (state.gold < cost) { log('💰 拆除需要 '+cost+' 金币', 'bad'); return; }
  state.gold -= cost;
  ensureMats();
  const gk = it.sockets[socketIdx].gem;
  state.gems[gk] = (state.gems[gk]||0) + 1;
  it.sockets[socketIdx].gem = null;
  log(`🪛 拆除 [${GEM_TYPES[gk].name}]`, 'info');
  recomputeStats();
  markDirty('inventory','equipment','hero');
  renderItemDetail(itemId);
}

function applyEnchant(itemId, enchantKey) {
  ensureMats();
  const found = getItemById(itemId); if (!found) return;
  const it = found.item;
  const pool = ENCHANT_POOL[it.slot] || [];
  const e = pool.find(x => x.key === enchantKey); if (!e) return;
  if (it.enchant === enchantKey) { log('已有此附魔', 'bad'); return; }
  if (state.gold < e.cost.gold) { log('💰 金币不足('+e.cost.gold+')', 'bad'); return; }
  if (state.essence < e.cost.essence) { log('💎 精华不足('+e.cost.essence+')', 'bad'); return; }
  state.gold -= e.cost.gold;
  state.essence -= e.cost.essence;
  const oldE = it.enchant;
  it.enchant = enchantKey;
  log(`✨ 附魔 [${e.name}]${oldE?'(替换原附魔)':''}`, 'good');
  if (typeof progressionOnEnchant === 'function') progressionOnEnchant();
  recomputeStats();
  markDirty('inventory','equipment','hero');
  renderItemDetail(itemId);
}

function disassembleItem(itemId) {
  ensureMats();
  const found = getItemById(itemId); if (!found) return;
  if (found.source === 'equip') { log('请先卸下再分解', 'bad'); return; }
  const it = found.item;
  if (!confirm(`分解 [${it.rarityName}] ${it.name} ?获得精华和宝石机会(装备不可恢复)`)) return;
  const tbl = DISASSEMBLE_TABLE[it.rarity] || DISASSEMBLE_TABLE.common;
  const ess = rng(tbl.essence[0], tbl.essence[1]);
  state.essence += ess;
  // 拆下的宝石返还
  let returnedGems = 0;
  if (it.sockets) {
    for (const sk of it.sockets) {
      if (sk.gem) { state.gems[sk.gem] = (state.gems[sk.gem]||0)+1; returnedGems++; }
    }
  }
  let gainedGem = null;
  if (Math.random() < tbl.gemChance) {
    const c = choice(SOCKET_COLORS);
    const tier = it.rarity === 'legend' ? (Math.random()<0.3?2:1) : 1;
    const key = c + '_t' + tier;
    state.gems[key] = (state.gems[key]||0) + 1;
    gainedGem = GEM_TYPES[key];
  }
  // 从背包移除
  const idx = state.inventory.findIndex(x => x.id === itemId);
  if (idx >= 0) state.inventory.splice(idx, 1);
  log(`🔧 分解 [${it.name}] +${ess}精华${gainedGem?' +'+gainedGem.name:''}${returnedGems?' (返还'+returnedGems+'宝石)':''}`, 'good');
  markDirty('inventory');
  closeItemDetail();
}

/* ---------- 宝石/精华来源:在战斗胜利时调用(combat 注入) ---------- */
function bossGemDrop(isFinalBoss) {
  ensureMats();
  if (Math.random() < (isFinalBoss?1.0:0.45)) {
    const c = choice(SOCKET_COLORS);
    const tier = isFinalBoss ? (Math.random()<0.4?2:1) : 1;
    const key = c + '_t' + tier;
    state.gems[key] = (state.gems[key]||0) + 1;
    const g = GEM_TYPES[key];
    log(`💎 获得 [${g.name}]`, 'epic');
  }
  // 副本BOSS也产精华
  if (isFinalBoss) {
    const ess = rng(3, 8);
    state.essence += ess;
    log(`✨ 获得 ${ess} 魔法精华`, 'info');
  }
  markDirty('hero');
}

/* ---------- 详情面板 ---------- */
let currentDetailItemId = null;

function openItemDetail(itemId) {
  currentDetailItemId = itemId;
  $('modal-item-detail').classList.add('show');
  renderItemDetail(itemId);
}

function closeItemDetail() {
  currentDetailItemId = null;
  $('modal-item-detail').classList.remove('show');
}

function renderItemDetail(itemId) {
  const found = getItemById(itemId);
  if (!found) { closeItemDetail(); return; }
  const it = found.item;
  syncItemIdentity(it);
  const el = $('item-detail-body');
  const fullRerollCost = getItemFullRerollCost(it);
  // 头部
  const titleHtml = `
    <div class="detail-head ${it.bcls}">
      <div class="name ${it.cls}" style="font-size:18px">${SLOT_INFO[it.slot].icon} ${itemDisplayNameHtml(it,{slotBadge:true})}</div>
      <div class="muted" style="font-size:11px">${SLOT_INFO[it.slot].label} · [${it.rarityName}]${it.epicRaid?' · <span style="color:#22c55e">[史诗团本]</span>':''}${it.reqLvl?' · Lv.'+it.reqLvl:''}${found.source==='equip'?' · <span style="color:var(--accent)">已装备</span>':''}</div>
    </div>`;
  const setHtml = renderItemSetEffectsHtml(it);
  // 基础属性
  const baseStats = Object.entries(it.stats||{}).map(([k,v])=>`<div class="stat-row">${fmtStatName(k)} <b>+${v}${isPercentStat(k)?'%':''}</b></div>`).join('');
  // 词缀
  let affixHtml = '<div class="muted" style="font-size:11px">无词缀</div>';
  if (it.affixes && it.affixes.length) {
    affixHtml = it.affixes.map((af, i) => {
      const def = AFFIX_BY_KEY[af.key]; if (!def) return '';
      const tierCls = af.tier===3?'r-legend':af.tier===2?'r-epic':'r-rare';
      const cost = 200 * (1 + (af.rerolls||0));
      return `<div class="affix-row">
        <span class="${tierCls}">${def.name} ${fmtMod(def.mod, af.value)}</span>
        <button data-action="reroll" data-id="${it.id}" data-idx="${i}" title="重铸: ${cost}💰 + 1精华 (已重铸${af.rerolls||0}次)">♻️ ${cost}</button>
      </div>`;
    }).join('');
  }
  // 宝石孔
  let socketHtml = '<div class="muted" style="font-size:11px">无插槽</div>';
  if (it.sockets && it.sockets.length) {
    socketHtml = it.sockets.map((sk, i) => {
      const info = SOCKET_COLOR_INFO[sk.color];
      if (sk.gem) {
        const g = GEM_TYPES[sk.gem];
        const match = sk.color === g.color;
        const matchTxt = match ? '<span style="color:var(--accent)">(同色)</span>' : '<span class="muted">(混色)</span>';
        const statTxt = Object.entries(g.stats).map(([k,v])=>{
          const finalV = match ? Math.floor(v*(1+SOCKET_MATCH_BONUS)) : Math.floor(v);
          return fmtMod(k, finalV);
        }).join(' ');
        return `<div class="socket-row">
          <span>${info.icon} ${g.name} ${matchTxt} <span class="muted">${statTxt}</span></span>
          <button data-action="unsocket" data-id="${it.id}" data-idx="${i}" title="拆除: 50💰">🪛</button>
        </div>`;
      } else {
        // 列出可镶嵌的宝石
        const opts = Object.entries(GEM_TYPES).filter(([k,g])=>state.gems&&(state.gems[k]||0)>0)
          .map(([k,g])=>`<option value="${k}">${g.name} (${state.gems[k]})</option>`).join('');
        return `<div class="socket-row">
          <span>${info.icon} ${info.name}色空孔</span>
          <select data-role="gempick" data-id="${it.id}" data-idx="${i}">
            <option value="">选择宝石...</option>${opts}
          </select>
        </div>`;
      }
    }).join('');
  }
  // 附魔
  const slotEnchs = ENCHANT_POOL[it.slot] || [];
  let enchantHtml = '<div class="muted" style="font-size:11px">该槽位无可用附魔</div>';
  if (slotEnchs.length) {
    const curKey = it.enchant;
    enchantHtml = slotEnchs.map(e => {
      const isCur = e.key === curKey;
      const modTxt = Object.entries(e.mod).map(([k,v])=>fmtMod(k, v)).join(' ');
      return `<div class="enchant-row ${isCur?'cur':''}">
        <span><b>${e.name}</b> <span class="muted">${modTxt}</span></span>
        <button data-action="enchant" data-id="${it.id}" data-ekey="${e.key}" ${isCur?'disabled':''}>
          ${isCur?'✓已附':e.cost.gold+'💰 '+e.cost.essence+'✨'}
        </button>
      </div>`;
    }).join('');
  }
  // 材料栏
  ensureMats();
  const matsHtml = `<div class="muted" style="font-size:11px">材料: ✨ <b>${state.essence}</b> 魔法精华</div>`;
  // 动作栏
  const actions = `
    <button data-action="rerollitem" data-id="${it.id}" title="重洗整件装备: ${fullRerollCost.gold}💰${fullRerollCost.essence?` + ${fullRerollCost.essence}精华`:''}">🎲 重洗 ${fullRerollCost.gold}💰${fullRerollCost.essence?` ${fullRerollCost.essence}✨`:''}</button>
    ${found.source==='inv' ? `<button class="primary" data-action="equipfromdetail" data-id="${it.id}">装备</button>` : ''}
    ${found.source==='equip' ? `<button class="danger" data-action="unequipfromdetail" data-id="${it.id}">卸下</button>` : ''}
    ${found.source==='inv' ? `<button class="danger" data-action="disassemble" data-id="${it.id}">🔧 分解</button>` : ''}
    ${found.source==='inv' ? `<button data-action="sellfromdetail" data-id="${it.id}">卖 ${it.sell}💰</button>` : ''}
    <button data-modal-close="modal-item-detail">关闭</button>`;
  el.innerHTML = `
    ${titleHtml}
    <div class="detail-section">
      <div class="detail-label">📊 属性</div>
      <div class="stat-list">${baseStats||'<div class="muted">无</div>'}</div>
    </div>
    ${setHtml}
    <div class="detail-section">
      <div class="detail-label">🔮 词缀</div>
      ${affixHtml}
    </div>
    <div class="detail-section">
      <div class="detail-label">💎 宝石孔</div>
      ${socketHtml}
    </div>
    <div class="detail-section">
      <div class="detail-label">✨ 附魔 ${matsHtml}</div>
      ${enchantHtml}
    </div>
    <div class="muted" style="font-size:11px;line-height:1.5;margin-top:-2px;margin-bottom:8px">重洗会重掷这件装备的基础数值、词缀和宝石孔，并清除附魔，相当于把同一件装备重新掉落一次；已镶嵌宝石会自动返还。</div>
    <div class="detail-actions">${actions}</div>`;
}

/* 给装备/背包tooltip额外信息 (在 render.js 使用) */
function itemEpicRaidBadge(item, compact) {
  if (!item || !item.epicRaid) return '';
  const color = '#22c55e';
  const border = 'rgba(34,197,94,.45)';
  const glow = 'rgba(34,197,94,.18)';
  const label = compact ? '[史诗团本]' : '[史诗团本]';
  return ` <span style="font-size:10px;color:${color};border:1px solid ${border};background:${glow};border-radius:999px;padding:0 6px;white-space:nowrap">${label}</span>`;
}

function itemBonusSummary(item) {
  if (!item) return '';
  syncItemIdentity(item);
  const parts = [];
  if (item.setName) parts.push('🧩');
  if (item.affixes && item.affixes.length) parts.push('🔮'+item.affixes.length);
  if (item.sockets && item.sockets.length) {
    const filled = item.sockets.filter(s=>s.gem).length;
    parts.push('💎'+filled+'/'+item.sockets.length);
  }
  if (item.enchant) parts.push('✨');
  const badge = itemEpicRaidBadge(item, true);
  const partsHtml = parts.length ? ` <span class="muted" style="font-size:10px">${parts.join(' ')}</span>` : '';
  return `${badge}${partsHtml}`;
}
