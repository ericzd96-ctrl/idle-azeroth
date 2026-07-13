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
  // 副属性词缀回归(数值偏低,受 recomputeStats 末尾的吸血/全能/极速封顶约束;暴伤用扁平 critd)
  { key:'precise',   name:'精准的',    mod:'crit',         tierVals:[[1,2],[2,3],[3,5]] },
  { key:'cruel',     name:'残酷的',    mod:'critd',        tierVals:[[3,6],[6,10],[10,16]] },
  { key:'vampiric',  name:'嗜血的',    mod:'leech',        tierVals:[[1,2],[2,4],[4,6]] },
  { key:'versatile', name:'全能的',    mod:'vers',         tierVals:[[1,2],[2,4],[4,6]] },
  { key:'masterful', name:'精通的',    mod:'mastery',      tierVals:[[2,4],[4,7],[7,12]] },
  { key:'hasty',     name:'迅捷的',    mod:'haste',        tierVals:[[1,2],[2,3],[3,5]] },
  { key:'evasive',   name:'灵巧的',    mod:'dodge',        tierVals:[[1,2],[2,3],[3,5]] },
  { key:'vital',     name:'活力的',    mod:'reg',          tierVals:[[2,4],[4,7],[7,12]] },
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
  // 红=进攻
  red_t1:    { name:'粗糙红宝石',  color:'red',    tier:1, stats:{atk:8} },
  red_t2:    { name:'精致红宝石',  color:'red',    tier:2, stats:{atk:18} },
  red_t3:    { name:'华丽红宝石',  color:'red',    tier:3, stats:{atk:36} },
  red_t4:    { name:'璀璨红宝石',  color:'red',    tier:4, stats:{atk:64} },
  crit_t1:   { name:'锋锐玛瑙',    color:'red',    tier:1, stats:{crit:1} },
  crit_t2:   { name:'灼炎玛瑙',    color:'red',    tier:2, stats:{crit:2} },
  crit_t3:   { name:'裂空玛瑙',    color:'red',    tier:3, stats:{crit:3} },
  mast_t1:   { name:'粗糙琥珀',    color:'red',    tier:1, stats:{mastery:2} },
  mast_t2:   { name:'精致琥珀',    color:'red',    tier:2, stats:{mastery:4} },
  mast_t3:   { name:'华丽琥珀',    color:'red',    tier:3, stats:{mastery:7} },
  // 黄=辅助
  yellow_t1: { name:'粗糙黄玉',    color:'yellow', tier:1, stats:{haste:1} },
  yellow_t2: { name:'精致黄玉',    color:'yellow', tier:2, stats:{haste:2} },
  yellow_t3: { name:'华丽黄玉',    color:'yellow', tier:3, stats:{haste:4} },
  yellow_t4: { name:'璀璨黄玉',    color:'yellow', tier:4, stats:{haste:6} },
  vers_t1:   { name:'粗糙黄水晶',  color:'yellow', tier:1, stats:{vers:1} },
  vers_t2:   { name:'精致黄水晶',  color:'yellow', tier:2, stats:{vers:2} },
  vers_t3:   { name:'华丽黄水晶',  color:'yellow', tier:3, stats:{vers:4} },
  dodge_t1:  { name:'流光月长石',  color:'yellow', tier:1, stats:{dodge:1} },
  dodge_t2:  { name:'迅影月长石',  color:'yellow', tier:2, stats:{dodge:2} },
  dodge_t3:  { name:'幻形月长石',  color:'yellow', tier:3, stats:{dodge:3} },
  // 蓝=防御
  blue_t1:   { name:'粗糙蓝宝石',  color:'blue',   tier:1, stats:{hp:40} },
  blue_t2:   { name:'精致蓝宝石',  color:'blue',   tier:2, stats:{hp:90} },
  blue_t3:   { name:'华丽蓝宝石',  color:'blue',   tier:3, stats:{hp:180} },
  blue_t4:   { name:'璀璨蓝宝石',  color:'blue',   tier:4, stats:{hp:320} },
  def_t1:    { name:'粗糙石榴石',  color:'blue',   tier:1, stats:{def:6} },
  def_t2:    { name:'精致石榴石',  color:'blue',   tier:2, stats:{def:14} },
  def_t3:    { name:'华丽石榴石',  color:'blue',   tier:3, stats:{def:28} },
  leech_t1:  { name:'粗糙血玉',    color:'blue',   tier:1, stats:{leech:1} },
  leech_t2:  { name:'精致血玉',    color:'blue',   tier:2, stats:{leech:2} },
  leech_t3:  { name:'华丽血玉',    color:'blue',   tier:3, stats:{leech:4} },
  // 彩虹(任意孔均视为同色,享受同色加成)
  prism_t1:  { name:'微光棱彩石',  color:'prismatic', any:true, tier:1, stats:{atk:5, hp:25} },
  prism_t2:  { name:'璀璨棱彩石',  color:'prismatic', any:true, tier:2, stats:{atk:11, hp:55} },
  prism_t3:  { name:'虚空棱彩石',  color:'prismatic', any:true, tier:3, stats:{atk:22, hp:110} },
};
/* 宝石掉落:基础色权重高,同色副属性较少,极少彩虹 */
const GEM_BASIC_PREFIX = { red:'red', yellow:'yellow', blue:'blue' };
const GEM_SECONDARY_PREFIX = { red:['crit','mast'], yellow:['vers','dodge'], blue:['def','leech'] };
function randomGemDropKey(tier) {
  if (tier <= 3 && Math.random() < 0.05) return 'prism_t' + tier;
  const color = choice(SOCKET_COLORS);
  const prefix = Math.random() < 0.6 ? GEM_BASIC_PREFIX[color] : choice(GEM_SECONDARY_PREFIX[color]);
  const key = prefix + '_t' + Math.min(tier, 3);
  return GEM_TYPES[key] ? key : GEM_BASIC_PREFIX[color] + '_t' + Math.min(tier, 3);
}

/* 同色宝石嵌入获得额外加成倍率 */
const SOCKET_MATCH_BONUS = 0.25;

/* ---------- 附魔 ---------- */
/* 每个槽位有不同的可选附魔。每个附魔有一个加成 */
/* 每个附魔带品质档 q(common/rare/epic),数值与花费随档提升。同槽位只能存在一个附魔。 */
const ENCHANT_POOL = {
  weapon: [
    { key:'wpn_atk',  name:'攻击之力',   q:'common', mod:{atkPct:6},        cost:{gold:500,essence:3} },
    { key:'wpn_spd',  name:'迅捷打击',   q:'common', mod:{spdPct:5},        cost:{gold:500,essence:3} },
    { key:'wpn_hst',  name:'急速',       q:'common', mod:{haste:2},         cost:{gold:500,essence:3} },
    { key:'wpn_pow',  name:'强攻',       q:'rare',   mod:{atkPct:10},       cost:{gold:900,essence:5} },
    { key:'wpn_crit', name:'锋锐',       q:'rare',   mod:{crit:2},          cost:{gold:900,essence:5} },
    { key:'wpn_blood',name:'嗜血',       q:'rare',   mod:{leech:2},         cost:{gold:900,essence:5} },
    { key:'wpn_titan',name:'泰坦杀戮',   q:'epic',   mod:{atkPct:16},       cost:{gold:1600,essence:10} },
  ],
  helmet: [
    { key:'hlm_int',  name:'智慧',       q:'common', mod:{intPct:6},        cost:{gold:300,essence:2} },
    { key:'hlm_sta',  name:'坚毅',       q:'common', mod:{staPct:6},        cost:{gold:300,essence:2} },
    { key:'hlm_vers', name:'全能',       q:'rare',   mod:{vers:2},          cost:{gold:600,essence:4} },
    { key:'hlm_mast', name:'精通',       q:'rare',   mod:{mastery:4},       cost:{gold:600,essence:4} },
    { key:'hlm_sage', name:'贤者之冠',   q:'epic',   mod:{intPct:12},       cost:{gold:1400,essence:9} },
  ],
  shoulder: [
    { key:'sh_atk',   name:'力量',       q:'common', mod:{atkPct:5},        cost:{gold:300,essence:2} },
    { key:'sh_def',   name:'守护',       q:'common', mod:{defPct:6},        cost:{gold:300,essence:2} },
    { key:'sh_leech', name:'吸血',       q:'rare',   mod:{leech:2},         cost:{gold:600,essence:4} },
    { key:'sh_crit',  name:'凶残',       q:'rare',   mod:{crit:2},          cost:{gold:600,essence:4} },
  ],
  armor: [
    { key:'arm_hp',   name:'生命',       q:'common', mod:{hpPct:8},         cost:{gold:400,essence:3} },
    { key:'arm_def',  name:'防御',       q:'common', mod:{defPct:8},        cost:{gold:400,essence:3} },
    { key:'arm_vers', name:'全能',       q:'rare',   mod:{vers:3},          cost:{gold:700,essence:5} },
    { key:'arm_sta',  name:'坚韧',       q:'rare',   mod:{staPct:8},        cost:{gold:700,essence:5} },
    { key:'arm_fort', name:'壁垒',       q:'epic',   mod:{defPct:15},       cost:{gold:1400,essence:9} },
  ],
  gloves: [
    { key:'glv_hst',  name:'急速',       q:'common', mod:{haste:2},         cost:{gold:300,essence:2} },
    { key:'glv_extra',name:'连击',       q:'common', mod:{extraAtk:4},      cost:{gold:500,essence:3} },
    { key:'glv_crit', name:'精准',       q:'rare',   mod:{crit:2},          cost:{gold:600,essence:4} },
    { key:'glv_mast', name:'巧手',       q:'epic',   mod:{mastery:6},       cost:{gold:1400,essence:9} },
  ],
  belt: [
    { key:'blt_sta',  name:'耐力',       q:'common', mod:{staPct:5},        cost:{gold:300,essence:2} },
    { key:'blt_cd',   name:'冷却',       q:'common', mod:{cdReduction:3},   cost:{gold:600,essence:4} },
    { key:'blt_hp',   name:'壮硕',       q:'rare',   mod:{hpPct:8},         cost:{gold:600,essence:4} },
    { key:'blt_leech',name:'吸血',       q:'rare',   mod:{leech:2},         cost:{gold:600,essence:4} },
  ],
  pants: [
    { key:'pnt_hp',   name:'生命',       q:'common', mod:{hpPct:7},         cost:{gold:300,essence:2} },
    { key:'pnt_atk',  name:'力量',       q:'common', mod:{atkPct:5},        cost:{gold:400,essence:3} },
    { key:'pnt_def',  name:'守护',       q:'rare',   mod:{defPct:9},        cost:{gold:700,essence:5} },
    { key:'pnt_sage', name:'奥能',       q:'epic',   mod:{intPct:11},       cost:{gold:1400,essence:9} },
  ],
  boots: [
    { key:'bts_spd',  name:'疾步',       q:'common', mod:{spdPct:5},        cost:{gold:300,essence:2} },
    { key:'bts_vers', name:'全能',       q:'common', mod:{vers:2},          cost:{gold:400,essence:3} },
    { key:'bts_dodge',name:'灵巧',       q:'rare',   mod:{dodge:2},         cost:{gold:600,essence:4} },
    { key:'bts_hst',  name:'疾风',       q:'rare',   mod:{haste:3},         cost:{gold:600,essence:4} },
  ],
  ring: [
    { key:'rng_atk',  name:'威能',       q:'common', mod:{atkPct:5},        cost:{gold:400,essence:3} },
    { key:'rng_hst',  name:'急速',       q:'common', mod:{haste:2},         cost:{gold:400,essence:3} },
    { key:'rng_cost', name:'节能',       q:'common', mod:{costReduction:5}, cost:{gold:500,essence:4} },
    { key:'rng_crit', name:'锐意',       q:'rare',   mod:{crit:2},          cost:{gold:700,essence:5} },
    { key:'rng_vers', name:'全能',       q:'rare',   mod:{vers:3},          cost:{gold:700,essence:5} },
  ],
  trinket: [
    { key:'tkt_pow',  name:'狠毒',       q:'common', mod:{atkPct:6},        cost:{gold:400,essence:3} },
    { key:'tkt_hp',   name:'通才',       q:'common', mod:{hpPct:8},         cost:{gold:600,essence:4} },
    { key:'tkt_vers', name:'全能',       q:'rare',   mod:{vers:3},          cost:{gold:700,essence:5} },
    { key:'tkt_mast', name:'精通',       q:'rare',   mod:{mastery:5},       cost:{gold:700,essence:5} },
    { key:'tkt_cruel',name:'残虐',       q:'epic',   mod:{critd:9},         cost:{gold:1600,essence:10} },
  ],
};
const ENCHANT_Q_CLS = { common:'', rare:'r-rare', epic:'r-epic' };
const ENCHANT_Q_LABEL = { common:'普通', rare:'稀有', epic:'史诗' };

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

/* 每件装备的"可选附魔"是该槽位附魔池里的随机子集(最多4个);重洗会重掷,出现新的附魔选项 */
function rollEnchantOptions(item) {
  const pool = ENCHANT_POOL[item.slot] || [];
  if (!pool.length) { delete item._enchantOptions; return; }
  const keys = pool.map(e => e.key);
  for (let i = keys.length - 1; i > 0; i--) { const j = rng(0, i); [keys[i], keys[j]] = [keys[j], keys[i]]; }
  item._enchantOptions = keys.slice(0, Math.min(keys.length, 4));
}
/* 在装备生成的最后调用,把词缀、宝石孔与可选附魔挂上 */
function enhanceItemOnCreate(item, rarity, power) {
  rollAffixesForItem(item, rarity, power);
  rollSocketsForItem(item, rarity);
  rollEnchantOptions(item);
}

/* ---------- 收集装备的所有 mod ---------- */
/* 把基础 stats / 词缀 / 宝石 / 附魔 / 副本印记 全部归一到 {mod-key: value} 累加 */
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
      const match = (g.any || sk.color === g.color) ? 1 + SOCKET_MATCH_BONUS : 1;
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
  // 5) 副本印记
  if (item.dungeonTrait && item.dungeonTrait.mod) addModEntriesToBonus(out, item.dungeonTrait.mod);
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

function addModEntriesToBonus(out, mod) {
  if (!out || !mod) return out;
  for (const [k, v] of Object.entries(mod)) {
    if (k in out) out[k] += v;
  }
  return out;
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

/* 仅副本印记加成 */
function collectDungeonTraitBonuses(item) {
  const out = _emptyBonusOut();
  if (!item || !item.dungeonTrait || !item.dungeonTrait.mod) return out;
  return addModEntriesToBonus(out, item.dungeonTrait.mod);
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
  if (typeof item.ilvl !== 'number' || item.ilvl <= 0) {   // 老存档装备补算魔兽装等
    if (typeof computeItemLevel === 'function') item.ilvl = computeItemLevel(item);
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

function renderDungeonTraitHtml(item) {
  if (!item?.dungeonTrait?.mod) return '';
  const t = item.dungeonTrait;
  const modText = Object.entries(t.mod || {}).map(([k, v]) => fmtMod(k, v)).join(' · ');
  const type = t.type || '副本印记';
  const tagLabel = (typeof dungeonTraitTagLabel === 'function') ? dungeonTraitTagLabel : (tag => tag);
  const sourceText = t.sourceDungeonName ? `来源: ${t.sourceDungeonName}` : '';
  const matchedTags = (t.matchedTags || []).map(tag => `<span class="dungeon-trait-tag">${tagLabel(tag)}</span>`).join('');
  const sourceTags = !matchedTags && (t.sourceTags || []).length
    ? (t.sourceTags || []).slice(0, 6).map(tag => `<span class="dungeon-trait-tag muted-tag">${tagLabel(tag)}</span>`).join('')
    : '';
  return `
    <div class="detail-section dungeon-trait-section">
      <div class="detail-label">副本印记</div>
      <div class="dungeon-trait-head">
        <span class="dungeon-trait-icon">${t.icon || '✦'}</span>
        <span><b>${t.name || '未知印记'}</b> <span class="muted" style="font-size:11px">[${type}]</span></span>
      </div>
      <div class="dungeon-trait-mod">${modText || '无额外效果'}</div>
      ${(sourceText || matchedTags || sourceTags) ? `<div class="dungeon-trait-source">${sourceText}${t.chance ? ` · 触发率约${t.chance}%` : ''}${matchedTags ? `<div class="dungeon-trait-tags">${matchedTags}</div>` : (sourceTags ? `<div class="dungeon-trait-tags">${sourceTags}</div>` : '')}</div>` : ''}
      ${t.desc ? `<div class="muted" style="font-size:11px;margin-top:4px">${t.desc}</div>` : ''}
    </div>`;
}

function getItemFullRerollCost(item) {
  const rarityFactor = { common:0.8, uncommon:1.1, rare:1.5, epic:2.4, legend:4 }[item?.rarity] || 1.2;
  const rerollCount = item?.fullRerolls || 0;
  const lockedCount = (item?._lockedStats?.length || 0) + (item?._lockedAffixes?.length || 0);
  const lockFactor = Math.min(1 + lockedCount * 0.5, 3.0);
  return {
    gold: Math.max(120, Math.floor((item?.reqLvl || 1) * 18 * rarityFactor * (1 + rerollCount * 0.75) * lockFactor)),
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
  // 重洗会全部重置(基础数值/词缀/宝石孔/附魔);已镶嵌的宝石返还背包,免得直接销毁
  const returnKeys = [];
  if (it.sockets) {
    for (const sk of it.sockets) {
      if (!sk.gem) continue;
      returnKeys.push(sk.gem);
    }
  }
  // ---- 快照锁定数据 ----
  const lockedStatSnap = {};
  if (it._lockedStats) {
    for (const sk of it._lockedStats) {
      if (it.stats && typeof it.stats[sk] === 'number') lockedStatSnap[sk] = it.stats[sk];
    }
  }
  const lockedAffixSnap = [];
  if (it._lockedAffixes && it.affixes) {
    for (const afk of it._lockedAffixes) {
      const af = it.affixes.find(a => a.key === afk);
      if (af) lockedAffixSnap.push({ key: af.key, tier: af.tier, value: af.value, rerolls: af.rerolls || 0 });
    }
  }
  // ---- confirm 提示 ----
  const lockedStatNames = it._lockedStats?.map(k => fmtStatName(k)).join('、') || '';
  const lockedAffixNames = it._lockedAffixes?.map(k => AFFIX_BY_KEY[k]?.name || k).join('、') || '';
  const lockedParts = [];
  if (lockedStatNames) lockedParts.push('属性: ' + lockedStatNames);
  if (lockedAffixNames) lockedParts.push('词缀: ' + lockedAffixNames);
  const lockedHint = lockedParts.length ? '\n🔒 已锁定保留: ' + lockedParts.join(' | ') : '';
  const costText = `${cost.gold}💰${cost.essence ? ` + ${cost.essence}✨` : ''}`;
  if (!confirm(`重洗 [${it.name}]？\n将消耗 ${costText}${lockedHint}\n会重置基础数值、词缀、宝石孔与附魔(全部重新随机)。\n已镶嵌的宝石会返还到背包。`)) return;
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
  const savedLockedStats = it._lockedStats ? [...it._lockedStats] : [];
  const savedLockedAffixes = it._lockedAffixes ? [...it._lockedAffixes] : [];
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
    gearTier: it.gearTier,
    sourceDungeonKey: it.sourceDungeonKey,
    sourceBossName: it.sourceBossName,
    dungeonTrait: it.dungeonTrait ? JSON.parse(JSON.stringify(it.dungeonTrait)) : undefined,
    setKey: it.setKey,
    setName: it.setName,
    setEffects: Array.isArray(it.setEffects) ? JSON.parse(JSON.stringify(it.setEffects)) : it.setEffects,
    setPieces: it.setPieces,
    raidExpansion: it.raidExpansion,
    raidOrder: it.raidOrder,
    raidTier: it.raidTier,
    raidBaseKey: it.raidBaseKey,
    raidBossIndex: it.raidBossIndex,
    raidBossCount: it.raidBossCount,
    raidEpicMode: it.raidEpicMode,
    raidIlvl: it.raidIlvl,
    reqLvlOverride: it.reqLvlOverride,
    reqLvl: it.reqLvl,
    _baseName: it._baseName || it.name,
    _baseExtraStats: JSON.parse(JSON.stringify(extraStats || {})),
    _rollPower: power,
    _rollSlot: it.slot,
    fullRerolls: (it.fullRerolls || 0) + 1,
    _lockedStats: savedLockedStats,
    _lockedAffixes: savedLockedAffixes,
  };
  for (const key of Object.keys(it)) delete it[key];
  Object.assign(it, preserved, { stats:{} });
  delete it.affixes;
  delete it.sockets;
  delete it.enchant;
  finishItem(it, it.slot, rarity, power, extraStats || {});
  // ---- 恢复锁定 ----
  for (const [sk, val] of Object.entries(lockedStatSnap)) { it.stats[sk] = val; }
  if (lockedAffixSnap.length > 0) {
    if (!it.affixes) it.affixes = [];
    for (const lad of lockedAffixSnap) {
      const existingIdx = it.affixes.findIndex(a => a.key === lad.key);
      if (existingIdx >= 0) {
        it.affixes[existingIdx] = { key: lad.key, tier: lad.tier, value: lad.value, rerolls: lad.rerolls };
      } else {
        it.affixes.push({ key: lad.key, tier: lad.tier, value: lad.value, rerolls: lad.rerolls });
      }
    }
  }
  it.fullRerolls = preserved.fullRerolls;
  // 重置附魔:从本次刷新出的"新附魔选项"里随机应用一个(无选项则清空)
  const enchOpts = (it._enchantOptions && it._enchantOptions.length) ? it._enchantOptions : (ENCHANT_POOL[it.slot] || []).map(e => e.key);
  if (enchOpts.length) it.enchant = choice(enchOpts); else delete it.enchant;
  syncItemIdentity(it);
  const returnedText = returns.length ? `，返还宝石 ${returns.join(' / ')}` : '';
  log(`🎲 重洗完成 [${it.name}]（基础/词缀/宝石孔/附魔全部重置）${returnedText}`,'good');
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
  if (it._lockedAffixes && it._lockedAffixes.includes(af.key)) {
    log('🔒 该词缀已被锁定，无法单独重铸（请先解锁或通过整件重洗保留）', 'bad');
    return;
  }
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

/* 转换词缀种类:把某条词缀换成另一种(保留档位,重掷数值);费用随转换次数递增 */
function convertAffix(itemId, affixIdx) {
  ensureMats();
  const found = getItemById(itemId); if (!found) return;
  const it = found.item;
  if (!it.affixes || !it.affixes[affixIdx]) return;
  const af = it.affixes[affixIdx];
  if (it._lockedAffixes && it._lockedAffixes.includes(af.key)) { log('🔒 该词缀已锁定,无法转换', 'bad'); return; }
  const conv = af.converts || 0;
  const gCost = 800 * (1 + conv), eCost = 3 + conv;
  if (state.gold < gCost) { log('💰 金币不足(' + gCost + ')', 'bad'); return; }
  if (state.essence < eCost) { log('✨ 精华不足(' + eCost + ')', 'bad'); return; }
  const used = new Set(it.affixes.map(a => a.key));
  const cands = AFFIX_POOL.filter(a => !used.has(a.key));
  if (cands.length === 0) { log('没有可转换的新词缀', 'bad'); return; }
  state.gold -= gCost; state.essence -= eCost;
  const na = choice(cands);
  const tier = af.tier;
  const [lo, hi] = na.tierVals[tier - 1];
  const oldName = AFFIX_BY_KEY[af.key]?.name || af.key;
  it.affixes[affixIdx] = { key: na.key, tier, value: +(lo + Math.random() * (hi - lo)).toFixed(1), rerolls: 0, converts: conv + 1 };
  log(`🔀 词缀转换 [${oldName}] → [${na.name}]`, 'good');
  if (typeof progressionOnReroll === 'function') progressionOnReroll();
  recomputeStats();
  markDirty('inventory', 'equipment', 'hero');
  renderItemDetail(itemId);
}

/* 词缀升阶:T1→T2→T3,提升档位并在新区间重掷数值 */
function upgradeAffixTier(itemId, affixIdx) {
  ensureMats();
  const found = getItemById(itemId); if (!found) return;
  const it = found.item;
  if (!it.affixes || !it.affixes[affixIdx]) return;
  const af = it.affixes[affixIdx];
  if (af.tier >= 3) { log('该词缀已是最高档(T3)', 'info'); return; }
  const eCost = 4 * af.tier, gCost = 600 * af.tier;
  if (state.essence < eCost) { log('✨ 精华不足(' + eCost + ')', 'bad'); return; }
  if (state.gold < gCost) { log('💰 金币不足(' + gCost + ')', 'bad'); return; }
  state.essence -= eCost; state.gold -= gCost;
  const def = AFFIX_BY_KEY[af.key];
  af.tier++;
  const [lo, hi] = def.tierVals[af.tier - 1];
  af.value = +(lo + Math.random() * (hi - lo)).toFixed(1);
  log(`⬆️ 词缀升阶 [${def.name}] → T${af.tier}`, 'good');
  recomputeStats();
  markDirty('inventory', 'equipment', 'hero');
  renderItemDetail(itemId);
}

/* ---------- 锁定/解锁副属性与词缀 ---------- */
function toggleLockStat(itemId, statKey) {
  const found = getItemById(itemId); if (!found) return;
  const it = found.item;
  const mainStat = SLOT_INFO[it.slot]?.mainStat;
  if (statKey === mainStat) return;
  if (!it._lockedStats) it._lockedStats = [];
  const idx = it._lockedStats.indexOf(statKey);
  if (idx >= 0) it._lockedStats.splice(idx, 1);
  else it._lockedStats.push(statKey);
  renderItemDetail(itemId);
}

function toggleLockAffix(itemId, affixKey) {
  const found = getItemById(itemId); if (!found) return;
  const it = found.item;
  if (!it._lockedAffixes) it._lockedAffixes = [];
  const idx = it._lockedAffixes.indexOf(affixKey);
  if (idx >= 0) it._lockedAffixes.splice(idx, 1);
  else it._lockedAffixes.push(affixKey);
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
    const tier = it.rarity === 'legend' ? (Math.random()<0.3?2:1) : 1;
    const key = randomGemDropKey(tier);
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
    let tier = isFinalBoss ? (Math.random()<0.4?2:1) : 1;
    if (isFinalBoss && Math.random() < 0.08) tier = 4;       // 终BOSS极小概率掉璀璨(t4)
    const key = (tier===4) ? GEM_BASIC_PREFIX[choice(SOCKET_COLORS)]+'_t4' : randomGemDropKey(tier);
    state.gems[key] = (state.gems[key]||0) + 1;
    const g = GEM_TYPES[key];
    if (g) log(`💎 获得 [${g.name}]`, 'epic');
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
      <div class="muted" style="font-size:11px">${SLOT_INFO[it.slot].label} · [${it.rarityName}]${it.epicRaid?' · <span style="color:#22c55e">[史诗团本]</span>':''}${(typeof computeItemLevel==='function')?(' · <span style="color:#fbbf24">装等'+(it.ilvl||computeItemLevel(it))+'</span>'):''}${it.reqLvl?' · Lv.'+it.reqLvl:''}${found.source==='equip'?' · <span style="color:var(--accent)">已装备</span>':''}</div>
    </div>`;
  const setHtml = renderItemSetEffectsHtml(it);
  const dungeonTraitHtml = renderDungeonTraitHtml(it);
  // 基础属性:基础维度(攻击/防御/力量/敏捷/智力/精神/耐力/生命)= 主属性;暴击/暴伤/吸血/全能/精通/极速/闪避/回复 = 随机副属性
  const SECONDARY_STAT_KEYS = ['crit','critd','critdPct','leech','vers','haste','mastery','dodge','reg'];
  const baseStats = Object.entries(it.stats||{}).map(([k,v]) => {
    const isMain = !SECONDARY_STAT_KEYS.includes(k);
    const isLocked = it._lockedStats && it._lockedStats.includes(k);
    const tagHtml = isMain
      ? '<span class="stat-type-tag main">主属性</span>'
      : '<span class="stat-type-tag sec">副属性</span>';
    // 主属性现在也带品质浮动(×0.8~1.2),重洗会重掷,故同样可锁定保留
    const lockHtml = `<button class="lock-btn${isLocked?' locked':''}" data-action="lockstat" data-id="${it.id}" data-sk="${k}" title="${isLocked?'已锁定：重洗时保留':'点击锁定：重洗时保留此属性'}">${isLocked?'🔒':'🔓'}</button>`;
    return `<div class="stat-row">${tagHtml}${lockHtml}${fmtStatName(k)} <b>+${v}${isPercentStat(k)?'%':''}</b></div>`;
  }).join('');
  // 词缀
  let affixHtml = '<div class="muted" style="font-size:11px">无词缀</div>';
  if (it.affixes && it.affixes.length) {
    affixHtml = it.affixes.map((af, i) => {
      const def = AFFIX_BY_KEY[af.key]; if (!def) return '';
      const tierCls = af.tier===3?'r-legend':af.tier===2?'r-epic':'r-rare';
      const cost = 200 * (1 + (af.rerolls||0));
      const convCost = 800 * (1 + (af.converts||0)), convEss = 3 + (af.converts||0);
      const canUp = af.tier < 3, upG = 600 * af.tier, upE = 4 * af.tier;
      const isAffixLocked = it._lockedAffixes && it._lockedAffixes.includes(af.key);
      const affixLockHtml = `<button class="lock-btn${isAffixLocked?' locked':''}" data-action="lockaffix" data-id="${it.id}" data-afk="${af.key}" title="${isAffixLocked?'已锁定：重洗时保留':'点击锁定：重洗时保留此词缀'}">${isAffixLocked?'🔒':'🔓'}</button>`;
      return `<div class="affix-row">
        ${affixLockHtml}
        <span class="${tierCls}">${def.name} <span class="muted" style="font-size:10px">T${af.tier}</span> ${fmtMod(def.mod, af.value)}</span>
        <button data-action="reroll" data-id="${it.id}" data-idx="${i}" title="重铸数值: ${cost}💰 + 1✨ (已重铸${af.rerolls||0}次)"${isAffixLocked?' disabled':''}>♻️${cost}</button>
        <button data-action="upgradeaffix" data-id="${it.id}" data-idx="${i}" title="升阶 T${af.tier}${canUp?'→T'+(af.tier+1):'(已满)'}: ${upG}💰 + ${upE}✨"${(isAffixLocked||!canUp)?' disabled':''}>⬆️</button>
        <button data-action="convertaffix" data-id="${it.id}" data-idx="${i}" title="转换词缀种类(保留档位): ${convCost}💰 + ${convEss}✨"${isAffixLocked?' disabled':''}>🔀</button>
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
        const match = g.any || sk.color === g.color;
        const matchTxt = g.any ? '<span style="color:#c084fc">(彩虹)</span>' : (match ? '<span style="color:var(--accent)">(同色)</span>' : '<span class="muted">(混色)</span>');
        const statTxt = Object.entries(g.stats).map(([k,v])=>{
          const finalV = match ? Math.floor(v*(1+SOCKET_MATCH_BONUS)) : Math.floor(v);
          return fmtMod(k, finalV);
        }).join(' ');
        return `<div class="socket-row">
          <span>${info.icon} ${g.name} ${matchTxt} <span class="muted">${statTxt}</span></span>
          <button data-action="unsocket" data-id="${it.id}" data-idx="${i}" title="拆除: 50💰">🪛</button>
        </div>`;
      } else {
        // 列出可镶嵌的宝石:显示每颗宝石在【该孔】的实际属性(含同色加成)+ 同色/混色/彩虹标记 + 数量,便于直接比较
        const owned = Object.entries(GEM_TYPES).filter(([k,g])=>state.gems&&(state.gems[k]||0)>0);
        owned.sort((a,b)=>{
          const ma=(a[1].any||a[1].color===sk.color)?1:0, mb=(b[1].any||b[1].color===sk.color)?1:0;
          if(ma!==mb) return mb-ma;                 // 同色/彩虹优先
          return (b[1].tier||0)-(a[1].tier||0);      // 再按品阶降序
        });
        const opts = owned.map(([k,g])=>{
          const match = g.any || g.color===sk.color;
          const st = Object.entries(g.stats||{}).map(([sk2,v])=>{
            const fv = match ? Math.floor(v*(1+SOCKET_MATCH_BONUS)) : Math.floor(v);
            return `${fmtStatName(sk2)}+${fv}${isPercentStat(sk2)?'%':''}`;
          }).join(' ');
          const tag = g.any?'彩虹':(match?'同色':'混色');
          return `<option value="${k}">${g.name}｜${st}｜${tag} ×${state.gems[k]}</option>`;
        }).join('');
        return `<div class="socket-row">
          <span>${info.icon} ${info.name}色空孔 <span class="muted" style="font-size:10px">(同色宝石 +${Math.round(SOCKET_MATCH_BONUS*100)}%)</span></span>
          <select data-role="gempick" data-id="${it.id}" data-idx="${i}">
            <option value="">选择宝石...</option>${opts}
          </select>
        </div>`;
      }
    }).join('');
  }
  // 附魔:仅展示这件装备本次随机出的附魔选项(重洗会刷新);老装备无 _enchantOptions 时回退到完整池
  let slotEnchs = ENCHANT_POOL[it.slot] || [];
  if (it._enchantOptions && it._enchantOptions.length) {
    const opt = new Set(it._enchantOptions);
    if (it.enchant) opt.add(it.enchant);   // 当前已附魔的项始终可见
    slotEnchs = slotEnchs.filter(e => opt.has(e.key));
  }
  let enchantHtml = '<div class="muted" style="font-size:11px">该槽位无可用附魔</div>';
  if (slotEnchs.length) {
    const curKey = it.enchant;
    enchantHtml = slotEnchs.map(e => {
      const isCur = e.key === curKey;
      const modTxt = Object.entries(e.mod).map(([k,v])=>fmtMod(k, v)).join(' ');
      const qcls = ENCHANT_Q_CLS[e.q || 'common'];
      const qlbl = ENCHANT_Q_LABEL[e.q || 'common'];
      return `<div class="enchant-row ${isCur?'cur':''}">
        <span><b class="${qcls}">${e.name}</b> <span class="muted" style="font-size:10px">[${qlbl}]</span> <span class="muted">${modTxt}</span></span>
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
    ${dungeonTraitHtml}
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
  if (item.dungeonTrait) parts.push('印');
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
