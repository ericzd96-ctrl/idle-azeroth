/* =========================================================
   roguelike.js — 幻象挑战(Roguelike Dungeon)
   ----------------------------------------------------------
   规则:
   - 每次进入从零开始,不继承外部装备/属性/随从
   - 每层战斗后从3个随机能力中选择1个(5档稀有度)
   - 每3层精英、每5层Boss、30层终焉之主
   - 怪物按 1.12^(floor-1) 缩放
   - 死亡/撤离:保留幻象币,返回世界
   - 幻象币 🤖: 里程碑奖励 + 通关奖励
   ========================================================= */

/* ---------- 配置 ---------- */
const ROGUELIKE_FLOOR_SCALE = 1.12;
const ROGUELIKE_BOSS_EVERY = 5;
const ROGUELIKE_ELITE_EVERY = 3;
const ROGUELIKE_MAX_FLOORS = 30;

const ROGUELIKE_RARITY_WEIGHTS = { common:50, uncommon:30, rare:15, epic:4, legend:1 };
const ROGUELIKE_RARITY_COLORS = { common:'#9ca3af', uncommon:'#6ee7b7', rare:'#3b82f6', epic:'#a855f7', legend:'#f59e0b' };

const ROGUELIKE_MILESTONES = {
  5:  { name:'初入幻象', coin:20,  gold:500,  gem:3,  item:null, title:null },
  10: { name:'幻象行者', coin:60,  gold:2000, gem:10, item:'rare',title:'幻象行者' },
  15: { name:'幻象勇者', coin:150, gold:5000, gem:20, item:'epic',title:null },
  20: { name:'幻象大师', coin:350, gold:12000,gem:50, item:'legend',title:'幻象大师' },
  25: { name:'幻象破界', coin:800, gold:25000,gem:100,item:'legend',title:'破界者' },
  30: { name:'幻象征服', coin:2000,gold:50000,gem:200,item:'legend',title:'幻象征服者' },
};

/* ---------- 能力池 (60个) ---------- */
const ROGUELIKE_ABILITIES = {
  // ---- Common (20) ----
  c_atk:    { key:'c_atk',    name:'攻击强化', icon:'⚔️', rarity:'common', desc:'攻击力+12%',       mod:{ atkPct:12 } },
  c_hp:     { key:'c_hp',     name:'生命强化', icon:'❤️', rarity:'common', desc:'最大生命+18%',      mod:{ hpPct:18 } },
  c_def:    { key:'c_def',    name:'防御强化', icon:'🛡️', rarity:'common', desc:'防御+18%',          mod:{ defPct:18 } },
  c_spd:    { key:'c_spd',    name:'急速强化', icon:'💨', rarity:'common', desc:'攻击速度+10%',      mod:{ spdPct:10 } },
  c_crit:   { key:'c_crit',   name:'精准',     icon:'🎯', rarity:'common', desc:'暴击率+4',          mod:{ crit:4 } },
  c_critd:  { key:'c_critd',  name:'致命',     icon:'💥', rarity:'common', desc:'暴击伤害+15%',      mod:{ critdPct:15 } },
  c_regen:  { key:'c_regen',  name:'再生',     icon:'💚', rarity:'common', desc:'生命回复+4',         mod:{ regFlat:4 } },
  c_leech:  { key:'c_leech',  name:'嗜血',     icon:'🩸', rarity:'common', desc:'吸血+3',            mod:{ leech:3 } },
  c_mastery:{ key:'c_mastery',name:'专注',     icon:'📖', rarity:'common', desc:'精通+4',            mod:{ mastery:4 } },
  c_vers:   { key:'c_vers',   name:'均衡',     icon:'🌟', rarity:'common', desc:'全能+4',            mod:{ vers:4 } },
  c_haste:  { key:'c_haste',  name:'急流',     icon:'💫', rarity:'common', desc:'急速率+5',           mod:{ haste:5 } },
  c_atk2:   { key:'c_atk2',   name:'蛮力',     icon:'💪', rarity:'common', desc:'攻击力+15%',       mod:{ atkPct:15 } },
  c_hp2:    { key:'c_hp2',    name:'坚韧',     icon:'🩵', rarity:'common', desc:'最大生命+22%',      mod:{ hpPct:22 } },
  c_def2:   { key:'c_def2',   name:'铁壁',     icon:'🧱', rarity:'common', desc:'防御+22%',          mod:{ defPct:22 } },
  c_spd2:   { key:'c_spd2',   name:'疾风',     icon:'🌀', rarity:'common', desc:'攻击速度+14%',      mod:{ spdPct:14 } },
  c_crit2:  { key:'c_crit2',  name:'鹰眼',     icon:'👁️', rarity:'common', desc:'暴击率+6',          mod:{ crit:6 } },
  c_dot:    { key:'c_dot',    name:'腐蚀',     icon:'☠️', rarity:'common', desc:'持续伤害+15%',      mod:{ dotBonus:15 } },
  c_heal:   { key:'c_heal',   name:'治愈',     icon:'💊', rarity:'common', desc:'治疗加成+12%',      mod:{ healBonus:12 } },
  c_exec:   { key:'c_exec',   name:'追击',     icon:'🏃', rarity:'common', desc:'斩杀伤害+10%',      mod:{ executeBonus:10 } },
  c_cd:     { key:'c_cd',     name:'迅捷',     icon:'⚡', rarity:'common', desc:'技能冷却-5%',        mod:{ cdReduction:5 } },
  // ---- Uncommon (18) ----
  u_atkdef:   { key:'u_atkdef',  name:'攻守兼备',icon:'⚔️🛡️',rarity:'uncommon',desc:'攻击+12%·防御+12%',mod:{ atkPct:12, defPct:12 } },
  u_hpatk:    { key:'u_hpatk',   name:'血怒',    icon:'❤️⚔️',rarity:'uncommon',desc:'生命+15%·攻击+10%',mod:{ hpPct:15, atkPct:10 } },
  u_spdcrit:  { key:'u_spdcrit', name:'迅击',    icon:'💨🎯',rarity:'uncommon',desc:'攻速+8%·暴击+5',   mod:{ spdPct:8, crit:5 } },
  u_critdExec:{ key:'u_critdExec',name:'追命',    icon:'💥🏃',rarity:'uncommon',desc:'暴伤+18%·斩杀+12%',mod:{ critdPct:18, executeBonus:12 } },
  u_leechAtk: { key:'u_leechAtk',name:'吸血之刃',icon:'🩸⚔️',rarity:'uncommon',desc:'吸血+5·攻击+8%',   mod:{ leech:5, atkPct:8 } },
  u_dotHeal:  { key:'u_dotHeal', name:'疫病医师',icon:'☠️💊',rarity:'uncommon',desc:'持续伤害+18%·治疗+15%',mod:{ dotBonus:18, healBonus:15 } },
  u_extraAtk: { key:'u_extraAtk',name:'追击者',  icon:'👊',  rarity:'uncommon',desc:'额外攻击率+8',     mod:{ extraAtk:8 } },
  u_burst:    { key:'u_burst',   name:'战吼',    icon:'📯',  rarity:'uncommon',desc:'进入战斗时获得爆发(攻击+33%·暴伤+20)6秒',type:'battleBuff',buff:'s_burst',duration:6000 },
  u_frenzy:   { key:'u_frenzy',  name:'狂怒',    icon:'😡',  rarity:'uncommon',desc:'进入战斗时获得狂热(攻击+20%·攻速+20%)6秒',type:'battleBuff',buff:'s_frenzy',duration:6000 },
  u_mitigate: { key:'u_mitigate',name:'铁壁',    icon:'🧱',  rarity:'uncommon',desc:'进入战斗时获得减伤(-34%)5秒',type:'battleBuff',buff:'s_mitigate',duration:5000 },
  u_haste:    { key:'u_haste',   name:'疾风步',  icon:'💨',  rarity:'uncommon',desc:'进入战斗时获得急速(攻速+33%)8秒',type:'battleBuff',buff:'s_haste',duration:8000 },
  u_barrier:  { key:'u_barrier', name:'护体',    icon:'🪨',  rarity:'uncommon',desc:'进入战斗时获得护盾(减伤30%·防+27%)5秒',type:'battleBuff',buff:'s_barrier',duration:5000 },
  u_lifesurge:{ key:'u_lifesurge',name:'生命洪流',icon:'🩸', rarity:'uncommon',desc:'进入战斗时获得生命洪流(吸血+20·攻+13%)8秒',type:'battleBuff',buff:'s_lifesurge',duration:8000 },
  u_double:   { key:'u_double',  name:'连斩',    icon:'⚔️⚔️',rarity:'uncommon',desc:'额外攻击率+12',     mod:{ extraAtk:12 } },
  u_versAll:  { key:'u_versAll', name:'多面手',  icon:'🌟',  rarity:'uncommon',desc:'全能+7',            mod:{ vers:7 } },
  u_mastery2: { key:'u_mastery2',name:'博学者',  icon:'📖',  rarity:'uncommon',desc:'精通+8',            mod:{ mastery:8 } },
  u_regen2:   { key:'u_regen2',  name:'恢复',    icon:'💚💚',rarity:'uncommon',desc:'生命回复+7',         mod:{ regFlat:7 } },
  u_reflect:  { key:'u_reflect', name:'荆棘',    icon:'🌵',  rarity:'uncommon',desc:'反伤+8',            mod:{ reflectDmg:8 } },
  // ---- Rare (14) ----
  r_leechAtk2:  { key:'r_leechAtk2', name:'生命虹吸', icon:'🩸',  rarity:'rare',desc:'吸血+8·攻击+15%',  mod:{ leech:8, atkPct:15 } },
  r_critAll:    { key:'r_critAll',   name:'致命节奏', icon:'💥🎯',rarity:'rare',desc:'暴击+8·暴伤+25%',  mod:{ crit:8, critdPct:25 } },
  r_hasteCd:    { key:'r_hasteCd',   name:'过载',     icon:'⚡',  rarity:'rare',desc:'急速率+10·冷却-12%',mod:{ haste:10, cdReduction:12 } },
  r_triple:     { key:'r_triple',    name:'三位一体', icon:'⚔️🛡️💨',rarity:'rare',desc:'攻+10%·防+10%·速+8%',mod:{ atkPct:10, defPct:10, spdPct:8 } },
  r_versAll2:   { key:'r_versAll2',  name:'完美均衡', icon:'🌟',  rarity:'rare',desc:'全能+9·攻+8%·防+8%',mod:{ vers:9, atkPct:8, defPct:8 } },
  r_dotMaster:  { key:'r_dotMaster', name:'疫病专精', icon:'☣️',  rarity:'rare',desc:'持续伤害+28%·暴击+7', mod:{ dotBonus:28, crit:7 } },
  r_healMaster: { key:'r_healMaster',name:'圣光眷顾', icon:'✨',  rarity:'rare',desc:'治疗+25%·回复+8',   mod:{ healBonus:25, regFlat:8 } },
  r_execMaster: { key:'r_execMaster',name:'死神之镰', icon:'☠️',  rarity:'rare',desc:'斩杀伤害+22%·攻+8%',mod:{ executeBonus:22, atkPct:8 } },
  r_stun:       { key:'r_stun',      name:'锤击',     icon:'🔨',  rarity:'rare',desc:'攻击有8%几率击晕敌人2秒',mod:{ stunChance:8 } },
  r_armorPen:   { key:'r_armorPen',  name:'破甲',     icon:'🗡️',  rarity:'rare',desc:'护甲穿透+15',         mod:{ armorPen:15 } },
  r_avatar:     { key:'r_avatar',    name:'天神下凡', icon:'⚡',  rarity:'rare',desc:'进入战斗时获得天神下凡(攻+27%·防+20%·减伤13%)8秒',type:'battleBuff',buff:'s_avatar',duration:8000 },
  r_empower:    { key:'r_empower',   name:'法术爆发', icon:'🔥',  rarity:'rare',desc:'进入战斗时获得法术爆发(暴击+17·暴伤+34)8秒',type:'battleBuff',buff:'s_empower',duration:8000 },
  r_dodge:      { key:'r_dodge',     name:'闪避',     icon:'💨',  rarity:'rare',desc:'闪避率+10',           mod:{ dodge:10 } },
  r_execCd:     { key:'r_execCd',    name:'杀戮本能', icon:'💀',  rarity:'rare',desc:'斩杀+18%·冷却-10%',  mod:{ executeBonus:18, cdReduction:10 } },
  // ---- Epic (8) ----
  e_quad:      { key:'e_quad',     name:'四象归一',  icon:'⚔️🛡️💨💥',rarity:'epic',desc:'攻+15%·防+15%·速+10%·暴伤+20%',mod:{ atkPct:15, defPct:15, spdPct:10, critdPct:20 } },
  e_masteryAll:{ key:'e_masteryAll',name:'宗师',      icon:'📖',  rarity:'epic',desc:'精通+12·攻+12%·全能+6',mod:{ mastery:12, atkPct:12, vers:6 } },
  e_healFlow:  { key:'e_healFlow',  name:'治愈洪流',  icon:'💚',  rarity:'epic',desc:'治疗+30%·回复+10·生命+18%',mod:{ healBonus:30, regFlat:10, hpPct:18 } },
  e_explosive: { key:'e_explosive', name:'爆裂打击',  icon:'💣',  rarity:'epic',desc:'暴击+10·暴伤+35%·斩杀+15%',mod:{ crit:10, critdPct:35, executeBonus:15 } },
  e_immortal:  { key:'e_immortal',  name:'不朽',      icon:'👼',  rarity:'epic',desc:'生命+25%·防御+20%·回复+10',mod:{ hpPct:25, defPct:20, regFlat:10 } },
  e_tempest:   { key:'e_tempest',   name:'风暴之眼',  icon:'⛈️',  rarity:'epic',desc:'攻速+18%·额外攻击+12·暴伤+25%',mod:{ spdPct:18, extraAtk:12, critdPct:25 } },
  e_void:      { key:'e_void',      name:'虚空精华',  icon:'🌌',  rarity:'epic',desc:'攻+12%·吸血+8·精通+10·持续伤害+20%',mod:{ atkPct:12, leech:8, mastery:10, dotBonus:20 } },
  e_drain:     { key:'e_drain',     name:'灵魂榨取',  icon:'🧛',  rarity:'epic',desc:'吸血+10·攻击+18%·反伤+12',mod:{ leech:10, atkPct:18, reflectDmg:12 } },
  // ---- Legend (4) ----
  l_godSlayer: { key:'l_godSlayer',name:'弑神者',    icon:'💀',  rarity:'legend',desc:'攻击+25%·暴击+12·暴伤+30%·斩杀+25%',mod:{ atkPct:25, crit:12, critdPct:30, executeBonus:25 } },
  l_immortal:  { key:'l_immortal',  name:'不朽之盾',  icon:'👼',  rarity:'legend',desc:'生命+30%·防御+25%·回复+12·减伤15%',mod:{ hpPct:30, defPct:25, regFlat:12 },dr:0.15 },
  l_tempest:   { key:'l_tempest',   name:'诸神黄昏',  icon:'⛈️',  rarity:'legend',desc:'攻速+25%·额外攻击+15·暴伤+30%·攻+15%',mod:{ spdPct:25, extraAtk:15, critdPct:30, atkPct:15 } },
  l_voidEss:   { key:'l_voidEss',   name:'创世之力',  icon:'🌌',  rarity:'legend',desc:'攻+20%·精通+15·吸血+10·全伤+20%·治愈+20%',mod:{ atkPct:20, mastery:15, leech:10, dotBonus:20, healBonus:20 } },
};

/* ---------- 工具 ---------- */
function ensureRoguelikeState() {
  if (!state.roguelike) state.roguelike = { highest:0, totalRuns:0, milestonesClaimed:{}, weeklyHighest:0, weeklyResetAt:0 };
  if (typeof state.roguelikeCoin !== 'number') state.roguelikeCoin = 0;
  if (!state.roguelike.milestonesClaimed) state.roguelike.milestonesClaimed = {};
}

function roguelikeWeeklyResetAt(now) {
  const d = new Date(now);
  const daysUntilMon = (8 - d.getDay()) % 7 || 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + daysUntilMon);
  return d.getTime();
}

function weightedRandomPick(pool, floor) {
  // 按稀有度权重 + 楼层加成(高层提高rare+权重)
  const floorBonus = Math.min(30, Math.floor(floor * 0.4));
  const weights = {};
  for (const a of pool) {
    let w = ROGUELIKE_RARITY_WEIGHTS[a.rarity] || 10;
    if (a.rarity === 'rare') w += floorBonus;
    if (a.rarity === 'epic') w += floorBonus * 2;
    if (a.rarity === 'legend') w += floorBonus * 3;
    weights[a.key] = w;
  }
  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  let roll = Math.random() * total;
  for (const a of pool) {
    roll -= weights[a.key];
    if (roll <= 0) return a;
  }
  return pool[pool.length - 1];
}

/* ---------- 属性收集(供 recomputeStats 调用) ---------- */
function collectRoguelikeMod() {
  const out = { atkPct:0, hpPct:0, defPct:0, spdPct:0, critdPct:0, crit:0, regFlat:0, leech:0, vers:0, mastery:0, haste:0, cdReduction:0, extraAtk:0, healBonus:0, dotBonus:0, costReduction:0, executeBonus:0, reflectDmg:0, stunChance:0, armorPen:0, dodge:0 };
  const rs = state.roguelikeState;
  if (!rs || !rs.chosenAbilities) return out;
  for (const ability of rs.chosenAbilities) {
    if (ability.mod) {
      for (const [k, v] of Object.entries(ability.mod)) {
        out[k] = (out[k] || 0) + v;
      }
    }
  }
  return out;
}

/* ---------- 进入/退出 ---------- */
function enterRoguelike() {
  ensureRoguelikeState();
  if (state.mode === 'travel') { log('正在旅行中', 'bad'); return; }
  if (state.mode !== 'world') { log('请先结束当前战斗', 'bad'); return; }
  state.mode = 'roguelike';
  state.roguelikeState = {
    floor: 1,
    abilityChoices: [],
    chosenAbilities: [],
    coinThisRun: 0,
  };
  state.roguelike.totalRuns = (state.roguelike.totalRuns || 0) + 1;
  // 存档外部属性
  state._roguelikeSaved = {
    hero: Object.assign({}, state.hero),
    attrs: Object.assign({}, state.attrs),
    buffs: Object.assign({}, state.buffs),
    talentAuras: Object.assign({}, state.talentAuras),
    equipped: Object.assign({}, state.equipped),
  };
  // 重置为基准属性
  resetRoguelikeStats();
  spawnRoguelikeMonster();
  log('🌌 进入幻象挑战，从零开始！', 'legend');
  markDirty('dungeon', 'stage', 'hero');
}

function leaveRoguelike() {
  const rs = state.roguelikeState;
  if (rs) {
    log(`🌌 离开幻象挑战(第 ${rs.floor} 层, +${rs.coinThisRun||0}🤖幻象币)`, 'info');
  }
  restoreRoguelikeStats();
  state.mode = 'world';
  state.roguelikeState = null;
  spawnMonster();
  markDirty('dungeon', 'stage', 'hero');
}

function resetRoguelikeStats() {
  const c = typeof getCls === 'function' ? getCls() : null;
  const base = c && c.baseStats ? c.baseStats : { atk:20, def:8, hpMax:200, spd:0.75, mpMax:100 };
  state.hero = Object.assign({}, state.hero, {
    atk: base.atk || 20, def: base.def || 8,
    hpMax: base.hpMax || 200, spd: base.spd || 0.75,
    mpMax: base.mpMax || 100, crit: 5, critd: 50,
    reg: 1, leech: 0, vers: 0, mastery: 0, haste: 0,
  });
  state.hp = state.hero.hpMax;
  state.resource = state.resourceMax;
  if (typeof clearAllBuffs === 'function') clearAllBuffs();
  state.buffs = {};
}

function restoreRoguelikeStats() {
  const saved = state._roguelikeSaved;
  if (!saved) return;
  state.hero = Object.assign(state.hero, saved.hero);
  state.attrs = Object.assign(state.attrs || {}, saved.attrs);
  state.buffs = Object.assign({}, saved.buffs);
  state.talentAuras = Object.assign({}, saved.talentAuras);
  state.equipped = Object.assign({}, saved.equipped);
  state._roguelikeSaved = null;
  if (typeof recomputeStats === 'function') recomputeStats();
}

/* ---------- 怪物生成 ---------- */
function spawnRoguelikeMonster() {
  const rs = state.roguelikeState; if (!rs) return;
  const floor = rs.floor;
  const isBoss = floor % ROGUELIKE_BOSS_EVERY === 0;
  const isElite = !isBoss && floor % ROGUELIKE_ELITE_EVERY === 0;
  const isFinal = floor >= ROGUELIKE_MAX_FLOORS;

  const scale = Math.pow(ROGUELIKE_FLOOR_SCALE, floor - 1);
  const lvl = Math.max(state.hero.lvl || 1, Math.min(80, floor * 2 + 10));

  const hpMul = isFinal ? 30 : (isBoss ? 18 : (isElite ? 5 : 1.8));
  const atkMul = isFinal ? 3.0 : (isBoss ? 2.2 : (isElite ? 1.5 : 1.0));
  const defMul = isFinal ? 2.0 : (isBoss ? 1.6 : (isElite ? 1.3 : 1.0));

  const prefix = isFinal ? '👑终焉之主' : (isBoss ? (['👹','🐉','💀'])[floor%3] : (isElite ? (['🗡️','🧟','⚔️'])[floor%3] : (['👹','🦴','🐺','👻'])[floor%4]));
  const typeTag = isFinal ? '·最终考验' : (isBoss ? '·Boss' : (isElite ? '·精英' : ''));
  const name = `${prefix} 幻象·${floor}层${typeTag}`;

  state.currentMonsters = [{
    name, isBoss: isBoss || isFinal, isFinal,
    lvl,
    hpMax: Math.floor((100 + lvl * lvl * 8.0) * hpMul * scale),
    hp:    Math.floor((100 + lvl * lvl * 8.0) * hpMul * scale),
    atk:   Math.floor((10 + lvl * 3.0) * atkMul * scale),
    def:   Math.floor((3 + lvl * 1.4) * defMul * scale),
    fromRoguelike: true,
    _roguelikeFloor: floor,
  }];
}

/* ---------- 击杀/失败/通关 ---------- */
function onRoguelikeMonsterKill(mon) {
  const rs = state.roguelikeState; if (!rs) return;
  const floor = rs.floor;

  // 幻象币奖励
  const coinGain = Math.floor(5 + floor * 1.5);
  state.roguelikeCoin = (state.roguelikeCoin || 0) + coinGain;
  rs.coinThisRun = (rs.coinThisRun || 0) + coinGain;

  // 更新最高记录
  if (floor > (state.roguelike.highest || 0)) state.roguelike.highest = floor;
  if (floor > (state.roguelike.weeklyHighest || 0)) state.roguelike.weeklyHighest = floor;

  // 里程碑检查
  checkRoguelikeMilestone(floor);

  // 终焉之主被击败
  if (floor >= ROGUELIKE_MAX_FLOORS) {
    roguelikeComplete();
    return;
  }

  // 在下一层之前先抛选择
  rollRoguelikeChoices();
  markDirty('dungeon', 'stage');
}

function onRoguelikeFail() {
  const rs = state.roguelikeState;
  if (!rs) return;
  const reached = rs.floor;
  log(`💀 幻象挑战失败，到达第 ${reached} 层 (+${rs.coinThisRun||0}🤖幻象币)`, 'bad');
  state.mode = 'world';
  state.roguelikeState = null;
  restoreRoguelikeStats();
  markDirty('dungeon', 'stage', 'hero');
}

function roguelikeComplete() {
  const rs = state.roguelikeState;
  if (!rs) return;
  log(`🌌🏆 完成幻象挑战！到达第 ${rs.floor} 层 (+${rs.coinThisRun||0}🤖幻象币)！`, 'legend');
  // 通关额外奖励
  state.roguelikeCoin = (state.roguelikeCoin || 0) + 1000;
  state.gold = (state.gold || 0) + 20000;
  state.gem = (state.gem || 0) + 50;
  state.mode = 'world';
  state.roguelikeState = null;
  restoreRoguelikeStats();
  spawnMonster();
  markDirty('dungeon', 'stage', 'hero');
}

/* ---------- 能力选择 ---------- */
function rollRoguelikeChoices() {
  const rs = state.roguelikeState; if (!rs) return;
  const floor = rs.floor;
  const pool = Object.values(ROGUELIKE_ABILITIES);
  // 排除已选中的能力
  const chosenKeys = new Set((rs.chosenAbilities || []).map(a => a.key));
  const available = pool.filter(a => !chosenKeys.has(a.key));
  if (available.length < 3) {
    // 能力不够3个时直接进下一层
    rs.floor++; spawnRoguelikeMonster(); return;
  }

  const choices = [];
  const copy = [...available];
  for (let i = 0; i < 3; i++) {
    const pick = weightedRandomPick(copy, floor);
    choices.push(pick);
    const idx = copy.indexOf(pick);
    if (idx >= 0) copy.splice(idx, 1);
  }

  rs.abilityChoices = choices;
  // 暂停战斗,展示选择弹窗
  showRoguelikeChoiceModal(choices);
}

function roguelikeSelectAbility(index) {
  const rs = state.roguelikeState;
  if (!rs || !rs.abilityChoices || rs.abilityChoices.length === 0) return;

  const chosen = rs.abilityChoices[index];
  if (!chosen) return;

  rs.chosenAbilities.push(chosen);
  rs.abilityChoices = [];
  hideRoguelikeChoiceModal();

  // 应用战斗buff型能力
  if (chosen.type === 'battleBuff' && chosen.buff) {
    state.buffs = state.buffs || {};
    state.buffs[chosen.buff] = Date.now() + (chosen.duration || 6000);
  }

  log(`✨ 获得能力: ${chosen.icon} ${chosen.name} — ${chosen.desc}`, 'legend');
  if (typeof recomputeStats === 'function') recomputeStats();
  markDirty('hero');

  // 进入下一层
  rs.floor++;
  spawnRoguelikeMonster();
  markDirty('dungeon', 'stage');
}

/* ---------- 里程碑 ---------- */
function checkRoguelikeMilestone(floor) {
  const ms = ROGUELIKE_MILESTONES[floor];
  if (!ms) return;
  if (state.roguelike.milestonesClaimed[floor]) return;
  state.roguelike.milestonesClaimed[floor] = true;
  state.roguelikeCoin = (state.roguelikeCoin || 0) + (ms.coin || 0);
  state.gold = (state.gold || 0) + (ms.gold || 0);
  state.gem = (state.gem || 0) + (ms.gem || 0);
  log(`🏆 幻象里程碑: ${ms.name}! +${ms.coin}🤖 +${ms.gold}💰 +${ms.gem}💎`, 'legend');
  if (ms.title && typeof grantTitle === 'function') grantTitle(ms.title);
  if (ms.item && typeof rollItem === 'function') {
    const item = rollItem(ms.item);
    if (item && typeof addToInventory === 'function') addToInventory(item);
  }
}

/* ---------- 选择弹窗 ---------- */
function showRoguelikeChoiceModal(choices) {
  const modal = document.getElementById('roguelike-choice-modal');
  if (!modal) return;
  const floor = (state.roguelikeState && state.roguelikeState.floor) || 1;
  let html = `<div class="modal-content" style="max-width:600px;background:var(--panel-1);border:2px solid var(--legend);border-radius:12px;padding:16px">
    <h3 style="text-align:center;margin:0 0 12px">✨ 选择能力 (进入第 ${floor+1} 层)</h3>
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">`;
  for (let i = 0; i < choices.length; i++) {
    const a = choices[i];
    const color = ROGUELIKE_RARITY_COLORS[a.rarity] || '#fff';
    const modText = a.mod ? Object.entries(a.mod).map(([k, v]) => {
      const labels = { atkPct:'攻', hpPct:'命', defPct:'防', spdPct:'速', critdPct:'暴伤', crit:'暴击', regFlat:'回复', leech:'吸血', vers:'全能', mastery:'精通', haste:'急速率', cdReduction:'冷却', extraAtk:'额外攻', healBonus:'治疗', dotBonus:'Dot', executeBonus:'斩杀', reflectDmg:'反伤', stunChance:'击晕', armorPen:'破甲', dodge:'闪避' };
      return (labels[k]||k)+'+'+v+(k==='crit'||k==='leech'||k==='vers'||k==='mastery'||k==='haste'||k==='extraAtk'||k==='regFlat'||k==='stunChance'||k==='armorPen'||k==='dodge'?'':(k==='critdPct'||k==='spdPct'?'%':'%'));
    }).join(' · ') : '';
    const buffText = a.type === 'battleBuff' ? '⚡进入战斗触发' : '';
    html += `<div class="roguelike-card" data-choice="${i}" style="flex:1;min-width:150px;max-width:190px;border:2px solid ${color};border-radius:10px;padding:10px;cursor:pointer;background:var(--panel-2);transition:transform 0.15s"
      onmouseenter="this.style.transform='scale(1.03)'" onmouseleave="this.style.transform='scale(1)'">
      <div style="font-size:32px;text-align:center">${a.icon}</div>
      <div style="font-weight:bold;text-align:center;color:${color};font-size:13px">${a.name}</div>
      <div style="text-align:center;font-size:10px;color:${color}">[${a.rarity}] ${buffText}</div>
      <div class="muted" style="font-size:10px;margin-top:4px;text-align:center;line-height:1.3">${a.desc}</div>
      ${modText ? `<div style="font-size:10px;margin-top:4px;text-align:center;color:var(--accent-2)">${modText}</div>` : ''}
    </div>`;
  }
  html += `</div></div>`;
  modal.innerHTML = html;
  modal.classList.add('show');
  modal.style.display = 'flex';
}

function hideRoguelikeChoiceModal() {
  const modal = document.getElementById('roguelike-choice-modal');
  if (!modal) return;
  modal.classList.remove('show');
  modal.style.display = 'none';
}

/* ---------- UI 面板 ---------- */
let roguelikeSubTab = 'roguelike'; // 'roguelike' | 'milestone'

function renderRoguelikePanel() {
  ensureRoguelikeState();
  const root = document.getElementById('roguelike-panel');
  if (!root) return;
  const inRun = state.mode === 'roguelike';
  const rs = state.roguelikeState;

  let html = `<div class="ascend-box">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-weight:bold">🌌 幻象挑战 · 🤖 <b>${state.roguelikeCoin||0}</b></div>
        <div class="muted" style="font-size:10px">最高 ${state.roguelike.highest||0} 层 · ${state.roguelike.totalRuns||0} 次挑战</div>
      </div>
    </div>
  </div>`;

  html += `<div class="sub-tabs">
    <span class="sub-tab ${roguelikeSubTab==='roguelike'?'active':''}" data-roguesub="roguelike">🌌 挑战</span>
    <span class="sub-tab ${roguelikeSubTab==='milestone'?'active':''}" data-roguesub="milestone">🏆 里程碑</span>
  </div>`;

  if (roguelikeSubTab === 'roguelike') {
    if (inRun && rs) {
      const abilities = (rs.chosenAbilities || []);
      html += `<div class="ascend-box" style="border:1px solid var(--legend)">
        <div>🌌 挑战中 · 第 <b>${rs.floor}</b> 层</div>
        <div style="font-size:11px;margin:4px 0">已选能力: <b>${abilities.length}</b> 个 · 本次币 +${rs.coinThisRun||0}🤖</div>
        <div class="muted" style="font-size:10px;margin:4px 0;max-height:60px;overflow-y:auto">${abilities.map(a=>a.icon+a.name).join(' · ') || '无'}</div>
        <button class="danger" data-action="leaveRoguelike" style="width:100%;padding:8px;margin-top:8px">🚪 放弃挑战</button>
      </div>`;
    } else {
      html += `<div class="ascend-box">
        <div class="detail-label">幻象挑战规则</div>
        <div class="muted" style="font-size:10px;line-height:1.5;margin-bottom:8px">
          • 每次进入从零开始，不继承外部装备和属性<br>
          • 每层战斗后从3个随机能力中选择1个(5档稀有度)<br>
          • 每3层精英、每5层Boss、30层终焉之主<br>
          • 死亡或通关后保留幻象币和里程碑奖励<br>
          • 难度系数: 1.12^(层数-1)
        </div>
        <button class="legend" data-action="enterRoguelike" style="width:100%;padding:10px">🌌 进入幻象挑战</button>
      </div>`;
    }
  } else if (roguelikeSubTab === 'milestone') {
    html += `<div class="ascend-box"><div style="font-weight:bold;margin-bottom:8px">🏆 里程碑奖励</div>`;
    for (const [floor, ms] of Object.entries(ROGUELIKE_MILESTONES)) {
      const claimed = !!(state.roguelike.milestonesClaimed && state.roguelike.milestonesClaimed[floor]);
      const reached = (state.roguelike.highest || 0) >= parseInt(floor);
      const icon = claimed ? '✅' : (reached ? '🔓' : '🔒');
      html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:11px;${claimed?'opacity:0.6':''}">
        <span>${icon} 第${floor}层 · ${ms.name}</span>
        <span class="muted">${ms.coin}🤖 ${ms.gold}💰 ${ms.gem}💎 ${ms.item||''} ${ms.title||''}</span>
      </div>`;
    }
    html += `</div>`;
  }

  root.innerHTML = html;
}

/* ---------- 周重置 ---------- */
function checkRoguelikeWeeklyRollover() {
  ensureRoguelikeState();
  const now = Date.now();
  if (!state.roguelike.weeklyResetAt) {
    state.roguelike.weeklyResetAt = roguelikeWeeklyResetAt(now);
    return;
  }
  if (now < state.roguelike.weeklyResetAt) return;
  const wh = state.roguelike.weeklyHighest || 0;
  if (wh > 0) {
    const tiers = [
      { min:1, name:'石阶', coin:0 }, { min:5, name:'青铜', coin:30 },
      { min:10, name:'白银', coin:100 }, { min:15, name:'黄金', coin:250 },
      { min:20, name:'铂金', coin:600 }, { min:25, name:'钻石', coin:1500 },
      { min:30, name:'王者', coin:4000 },
    ];
    const tier = [...tiers].reverse().find(t => wh >= t.min);
    if (tier && tier.coin > 0) {
      state.roguelikeCoin += tier.coin;
      log(`🏆 上周幻象结算: ${tier.name}段 (最高 ${wh} 层) +${tier.coin}🤖`, 'legend');
    }
  }
  state.roguelike.weeklyHighest = 0;
  state.roguelike.weeklyResetAt = roguelikeWeeklyResetAt(now);
}
