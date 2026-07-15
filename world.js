/* =========================================================
   world.js — 地图切换、副本、BOSS、商店、天赋、属性、离线收益
   ========================================================= */

/* ---------- 地图导航 ---------- */
function calcTravelTime(fromMapKey, toMapKey) {
  if (fromMapKey === toMapKey) return 0;
  const from = MAPS.find(m => m.key === fromMapKey);
  const to = MAPS.find(m => m.key === toMapKey);
  if (!from || !to) return 0;
  const fromMid = (from.lvlRange[0] + from.lvlRange[1]) / 2;
  const toMid = (to.lvlRange[0] + to.lvlRange[1]) / 2;
  const diff = Math.abs(toMid - fromMid);
  return Math.max(2, Math.min(25, Math.floor(diff * 0.35)));
}

function averageEquippedItemLevel() {
  const items = Object.values(state?.equipped || {}).filter(Boolean);
  if (!items.length) return 0;
  const total = items.reduce((sum, it) => {
    const lv = (typeof itemLevelOf === 'function') ? itemLevelOf(it)
      : ((typeof computeItemLevel === 'function') ? computeItemLevel(it) : (it.ilvl || 0));
    return sum + (lv || 0);
  }, 0);
  return total / items.length;
}

function waystoneProgressLevelBonus() {
  return (typeof globalThis.waystoneProgressBonus === 'function')
    ? Math.max(0, globalThis.waystoneProgressBonus())
    : 0;
}

function playerProgressLevel() {
  const heroLvl = Math.max(1, state?.hero?.lvl || 1);
  if (heroLvl < MAX_LEVEL) return heroLvl;
  const paragon = Math.max(0, state?.paragon?.lvl || 0);
  const ascend = Math.max(0, account?.ascendLvl || state?.ascendLvl || 0);
  const avgIlvl = averageEquippedItemLevel();
  const ilvlBonus = Math.max(0, Math.min(8, Math.floor((avgIlvl - 220) / 35)));
  const extra = Math.min(22, Math.floor(paragon / 6) + Math.floor(ascend / 2) + ilvlBonus + waystoneProgressLevelBonus());
  return heroLvl + extra;
}

function contentReqMet(req) {
  return playerProgressLevel() >= Math.max(1, Math.floor(req || 1));
}

function contentReqLabel(req) {
  const n = Math.max(1, Math.floor(req || 1));
  return n > MAX_LEVEL ? `终局${n}` : `等级${n}`;
}

function dungeonRecommendedItemLevel(dg) {
  if (!dg) return 0;
  const power = (typeof dg.powerLvl === 'number' && dg.powerLvl > 0) ? dg.powerLvl : (dg.reqLvl || 1);
  if (dg.epicRaid) {
    const ilvl = (typeof dg.raidIlvl === 'number' && dg.raidIlvl > 0) ? dg.raidIlvl : 320;
    return Math.max(285, Math.round(ilvl - 35));
  }
  if (dg.epic5) return Math.max(240, Math.round(power * 3 + 28));
  if (dg.heroic) return Math.max(205, Math.round(power * 3 + 8));
  if (dg.type === 'raid' && typeof dg.raidIlvl === 'number') return Math.max(1, Math.round(dg.raidIlvl - 8));
  return 0;
}

function dungeonRequiredItemLevel(dg) {
  return dg?.epicRaid ? dungeonRecommendedItemLevel(dg) : 0;
}

function dungeonAccessInfo(dg) {
  if (!dg) return { ok:false, reason:'未找到副本', short:'未找到副本' };
  const req = Math.max(1, Math.floor(dg.reqLvl || 1));
  const progress = playerProgressLevel();
  if (progress < req) {
    return {
      ok:false,
      reason:`需要${contentReqLabel(req)}，当前进度${Math.floor(progress)}`,
      short:'进度不足',
    };
  }
  const reqIlvl = dungeonRequiredItemLevel(dg);
  if (reqIlvl > 0) {
    const avg = Math.floor(averageEquippedItemLevel());
    if (avg < reqIlvl) {
      return {
        ok:false,
        reason:`史诗团本阶梯需要平均装等 ${reqIlvl}+，当前 ${avg || 0}`,
        short:`装等不足 ${avg || 0}/${reqIlvl}`,
      };
    }
  }
  return { ok:true, reason:'', short:'' };
}

function contentRangeLabel(min, max) {
  const lo = Math.max(1, Math.floor(min || 1));
  const hi = Math.max(lo, Math.floor(max || lo));
  return hi > MAX_LEVEL ? `终局${lo}-${hi}` : `等级${lo}-${hi}`;
}

const WORLD_ZONE_THREAT_RULES = [
  { key:'defias_ambush', icon:'🗡️', name:'伏击路障', tags:['迪菲亚','盗','刺客','劫匪','路口','哨兵','西部荒野','银月','暗巷'], meta:'野外战术', desc:'敌人会用路障和夹击压缩你的行动空间。周期造成物理伤害并可能缴械,首领和稀有精英获得额外闪避。', mod:{ hp:0.11, atk:0.07, def:0.04, dodge:0.04, tickMs:15500, dmgPct:0.030, debuff:'disarm', debuffMs:1800 } },
  { key:'plague_miasma', icon:'☠️', name:'瘟疫弥雾', tags:['亡灵','瘟疫','提瑞斯法','腐','怨灵','食尸鬼','白骨','诅咒','凋零'], meta:'持续腐蚀', desc:'瘟疫会持续侵蚀生命与回复节奏。周期施加毒性持续伤害,并让敌人获得吸血。', mod:{ hp:0.14, atk:0.05, leech:0.035, tickMs:12500, dmgPct:0.018, burnDpsPct:0.010, burnMs:5200, debuff:'decay', debuffMs:4200 } },
  { key:'beast_hunt', icon:'🐾', name:'兽群围猎', tags:['野兽','狼','熊','虎','豹','野猪','鳄','蝎','迅猛龙','暴龙','荆棘谷','贫瘠','杜隆塔尔'], meta:'兽群压力', desc:'野兽会在血腥气味中越战越快。周期提高敌方攻速,低血量时额外获得暴击。', mod:{ hp:0.10, atk:0.09, crit:0.035, spd:0.06, tickMs:14000, hastePct:0.20, debuff:'cripple', debuffMs:3600 } },
  { key:'elemental_surge', icon:'🌋', name:'元素暴涌', tags:['火','熔岩','元素','灼热','燃烧','黑石','峡谷','平原','风暴','沙暴','潮汐','闪电'], meta:'环境爆发', desc:'元素能量会周期爆发。造成高额环境伤害,并给敌人套上元素护盾。', mod:{ hp:0.12, atk:0.10, def:0.05, tickMs:17500, dmgPct:0.042, shieldPct:0.045, burnDpsPct:0.006, burnMs:4200 } },
  { key:'shadow_curse', icon:'🌑', name:'暗影诅咒', tags:['暮色','暗影','影','鬼','吸血','狼人','虚空','邪能','恶魔','卡雷什','影点','沙恩多拉'], meta:'暗影压迫', desc:'暗影会干扰施法和战斗节奏。周期造成暗影伤害,并可能沉默或虚弱玩家。', mod:{ hp:0.13, atk:0.08, dr:0.025, tickMs:16000, dmgPct:0.034, debuff:'silence', debuffMs:1800, altDebuff:'weaken', altDebuffMs:4400 } },
  { key:'arcane_lockdown', icon:'🔮', name:'奥术封锁', tags:['法师','奥术','魔法','法力','秘库','普莱姆斯','圆顶','法力熔炉','蓝龙','守望者'], meta:'资源压制', desc:'奥术封锁会抽干资源并重组敌方护盾。周期扣除资源,同时给敌人护盾与防御。', mod:{ hp:0.10, atk:0.06, def:0.09, tickMs:15000, drainPct:0.16, shieldPct:0.055, debuff:'chill', debuffMs:3600 } },
  { key:'titan_overwatch', icon:'🛡️', name:'泰坦监控', tags:['泰坦','守护者','傀儡','机械','机器人','奥杜尔','风暴峭壁','机甲','看守'], meta:'高护甲', desc:'古代装置会修正敌方防御矩阵。敌人更硬,周期治疗并获得减伤。', mod:{ hp:0.16, atk:0.04, def:0.12, dr:0.035, tickMs:18000, healPct:0.035, shieldPct:0.035 } },
  { key:'fungal_bloom', icon:'🍄', name:'孢子繁盛', tags:['孢','蘑菇','沼泽','自然','德鲁伊','植物','哈兰达尔','湿地','赞加'], meta:'增殖', desc:'孢子会在战斗中繁殖。周期治疗敌人并施加衰老,首领可能呼叫孢群援军。', mod:{ hp:0.15, atk:0.04, leech:0.025, tickMs:16500, healPct:0.045, debuff:'decay', debuffMs:4200, summonTheme:'spore' } },
  { key:'void_rupture', icon:'🪐', name:'虚空裂隙', tags:['虚空','虚无','裂隙','吞界','虚刃','卡雷什','影卫','暗影界','终域'], meta:'终局异常', desc:'虚空裂隙会吞噬节奏并制造高压窗口。周期造成虚空伤害、资源流失和易伤。', mod:{ hp:0.18, atk:0.12, def:0.06, dr:0.025, tickMs:14500, dmgPct:0.040, drainPct:0.10, debuff:'vulnerable', debuffMs:3800 } },
  { key:'warband_rally', icon:'📯', name:'战团集结', tags:['兽人','巨魔','督军','半人马','黑铁','血色','守卫','战士','军团','舰队'], meta:'群体增援', desc:'敌方战团会共享战吼。周期提高敌方攻击,首领和稀有精英更容易召来援军。', mod:{ hp:0.12, atk:0.11, def:0.04, tickMs:17000, hastePct:0.14, summonTheme:'warband', summonBossOnly:true } }
];

const WORLD_RARE_MUTATIONS = [
  { key:'mirrorhide', icon:'🪞', name:'镜鳞外皮', tags:['arcane','shadow','brute'], desc:'受到爆发后会短暂获得护盾。稀有精英生命和减伤提高。', mod:{ hp:0.18, def:0.08, dr:0.035, shieldPct:0.050 } },
  { key:'blood_scent', icon:'🩸', name:'嗜血追猎', tags:['beast','brute','nature'], desc:'血量越低越凶。攻击、暴击和吸血提高,周期施加残废。', mod:{ atk:0.12, crit:0.055, leech:0.045, debuff:'cripple', debuffMs:3600 } },
  { key:'phase_step', icon:'💫', name:'相位步', tags:['arcane','shadow'], desc:'会闪避关键攻击并扰乱施法。闪避提高,周期沉默或冰缚。', mod:{ hp:0.10, dodge:0.055, spd:0.08, debuff:'silence', debuffMs:1600 } },
  { key:'bone_tithe', icon:'🦴', name:'白骨贡赋', tags:['undead','shadow','brute'], desc:'战斗越久越硬。防御、生命提高,周期造成凋零压力。', mod:{ hp:0.16, def:0.12, dr:0.025, debuff:'decay2', debuffMs:3000 } },
  { key:'storm_core', icon:'⚡', name:'风暴核心', tags:['elemental','arcane'], desc:'体内元素核心会反复爆发。攻击提高,周期伤害更高并抽取资源。', mod:{ atk:0.14, def:0.05, drainPct:0.10, dmgPct:0.030 } },
  { key:'spore_crown', icon:'🍄', name:'孢冠再生', tags:['nature','beast'], desc:'孢冠让稀有精英不断自我修复。生命、吸血提高,周期治疗。', mod:{ hp:0.20, leech:0.035, healPct:0.045 } },
  { key:'commander_mark', icon:'🎯', name:'指挥官标记', tags:['brute','arcane'], desc:'会锁定你的弱点。攻击和暴击提高,周期施加易伤。', mod:{ atk:0.10, crit:0.045, debuff:'vulnerable', debuffMs:3600 } },
  { key:'void_seed', icon:'🧿', name:'虚空种子', tags:['shadow','arcane','nature'], desc:'体内虚空种子不断开裂。全属性提高,周期虚弱并造成虚空伤害。', mod:{ hp:0.14, atk:0.10, def:0.06, dr:0.020, dmgPct:0.025, debuff:'weaken', debuffMs:4200 } }
];

const WORLD_FIELD_OPERATION_RULES = [
  { key:'break_blockade', icon:'🛡️', name:'突破封锁线', tags:['守卫','军团','黑铁','兽人','迪菲亚','血色','舰队'], meta:'据点突破', desc:'敌人在此地架起封锁线。击杀野外敌人可摧毁路障,完成后会引出据点指挥官。', commander:'封锁线督军', reward:'金币、荣誉与一件区域装备', mod:{ hp:0.18, atk:0.11, def:0.10, shieldPct:0.06 } },
  { key:'seal_rupture', icon:'🪐', name:'封印裂隙', tags:['虚空','裂隙','暗影','邪能','卡雷什','虚刃','影点','暮色'], meta:'裂隙封印', desc:'空间裂隙正在吞噬附近生物。击杀被污染的敌人可稳定裂隙,完成后会出现裂隙看守。', commander:'裂隙看守', reward:'精华、钻石与高品质装备', mod:{ hp:0.20, atk:0.13, dr:0.04, drainPct:0.08 } },
  { key:'purge_plague', icon:'☠️', name:'净化瘟疫源', tags:['瘟疫','亡灵','腐','凋零','怨灵','食尸鬼','白骨'], meta:'净化事件', desc:'瘟疫源正在扩散。击杀感染敌人可削弱瘟疫,完成后会唤出疫源宿主。', commander:'疫源宿主', reward:'精华、金币与区域装备', mod:{ hp:0.22, atk:0.08, leech:0.05, burnDpsPct:0.012 } },
  { key:'hunt_alpha', icon:'🐾', name:'追猎兽群首领', tags:['野兽','狼','熊','虎','豹','野猪','鳄','蝎','暴龙','迅猛龙'], meta:'狩猎事件', desc:'兽群正在围猎旅行者。击杀野兽会逼近兽群首领,完成后可挑战阿尔法猎手。', commander:'阿尔法猎手', reward:'金币、荣誉与暴击向装备', mod:{ hp:0.16, atk:0.14, crit:0.06, hastePct:0.18 } },
  { key:'drain_arcane', icon:'🔮', name:'关闭奥术枢纽', tags:['法师','奥术','法力','秘库','圆顶','守望者','机器人','机械'], meta:'枢纽事件', desc:'奥术枢纽正在给敌人供能。击杀守卫可过载枢纽,完成后会出现枢纽监管者。', commander:'枢纽监管者', reward:'钻石、精华与法术装备', mod:{ hp:0.17, atk:0.09, def:0.14, shieldPct:0.08, drainPct:0.12 } },
  { key:'quell_elements', icon:'🌋', name:'平息元素暴动', tags:['火','元素','熔岩','风暴','沙暴','潮汐','闪电','灼热','燃烧'], meta:'元素事件', desc:'元素暴动正在撕裂地形。击杀元素化敌人可削弱风暴,完成后会出现暴动核心。', commander:'暴动核心', reward:'金币、精华与元素装备', mod:{ hp:0.18, atk:0.15, shieldPct:0.05, dmgPct:0.030 } },
  { key:'burn_sporebed', icon:'🍄', name:'焚毁孢床', tags:['孢','蘑菇','自然','沼泽','植物','德鲁伊','湿地','哈兰达尔'], meta:'孢群事件', desc:'失控孢床正在复制敌人。击杀孢化生物可焚毁菌丝,完成后会出现孢床母体。', commander:'孢床母体', reward:'精华、金币与恢复装备', mod:{ hp:0.24, def:0.08, leech:0.04, healPct:0.055 } },
  { key:'ambush_ring', icon:'🎯', name:'清剿伏击圈', tags:['盗','刺客','劫匪','巨魔','半人马','暗巷','路口','哨兵'], meta:'伏击事件', desc:'伏击圈正在收紧。击杀巡逻敌人可暴露伏击首领,完成后会出现伏击队长。', commander:'伏击队长', reward:'金币、荣誉与敏捷装备', mod:{ hp:0.14, atk:0.15, dodge:0.06, crit:0.04 } }
];

function worldZoneThreatText(map, sub) {
  const boss = map?.boss || {};
  const pieces = [
    map?.key, map?.name, map?.desc, map?.faction,
    sub?.name, sub?.mobs,
    boss.name, boss.desc, boss.emoji,
    ...((boss.skills || []).map(s => `${s.name || ''} ${s.desc || ''} ${s.icon || ''}`))
  ];
  return pieces.filter(Boolean).join(' ');
}

function worldThreatHash(s) {
  let h = 2166136261;
  const text = String(s || '');
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function ensureWorldFieldOps() {
  if (!state.worldFieldOps || typeof state.worldFieldOps !== 'object') state.worldFieldOps = { active:{}, completed:{} };
  if (!state.worldFieldOps.active || typeof state.worldFieldOps.active !== 'object') state.worldFieldOps.active = {};
  if (!state.worldFieldOps.completed || typeof state.worldFieldOps.completed !== 'object') state.worldFieldOps.completed = {};
  return state.worldFieldOps;
}

function ensureWorldRenown() {
  if (!state.worldRenown || typeof state.worldRenown !== 'object') state.worldRenown = { maps:{} };
  if (!state.worldRenown.maps || typeof state.worldRenown.maps !== 'object') state.worldRenown.maps = {};
  return state.worldRenown;
}

function worldRenownState(mapKey) {
  const wr = ensureWorldRenown();
  const key = mapKey || state.currentMap || 'elwynn';
  if (!wr.maps[key]) wr.maps[key] = { xp:0, rank:0, alert:0, fieldClears:0, bossKills:0 };
  const entry = wr.maps[key];
  entry.xp = Math.max(0, Math.floor(entry.xp || 0));
  entry.rank = Math.max(entry.rank || 0, worldRenownRankForXp(entry.xp));
  entry.alert = Math.max(0, Math.floor(entry.alert || 0));
  entry.fieldClears = Math.max(0, Math.floor(entry.fieldClears || 0));
  entry.bossKills = Math.max(0, Math.floor(entry.bossKills || 0));
  return entry;
}

function worldRenownRankNeed(rank) {
  const r = Math.max(0, Math.floor(rank || 0));
  return 55 + r * 28 + Math.floor(r * r * 2.5);
}

function worldRenownRankForXp(xp) {
  let left = Math.max(0, Math.floor(xp || 0));
  let rank = 0;
  while (rank < 15 && left >= worldRenownRankNeed(rank)) {
    left -= worldRenownRankNeed(rank);
    rank += 1;
  }
  return rank;
}

function worldRenownRankProgress(xp) {
  let left = Math.max(0, Math.floor(xp || 0));
  let rank = 0;
  while (rank < 15 && left >= worldRenownRankNeed(rank)) {
    left -= worldRenownRankNeed(rank);
    rank += 1;
  }
  return { rank, cur:left, need:rank >= 15 ? 0 : worldRenownRankNeed(rank) };
}

function worldRenownAlertLevel(mapKey) {
  const renown = worldRenownState(mapKey);
  const rankAlert = Math.floor((renown.rank || 0) * 0.72);
  const heatAlert = Math.floor((renown.alert || 0) / 35);
  return Math.max(0, Math.min(14, rankAlert + heatAlert));
}

function worldRenownBonuses(mapKey) {
  const renown = worldRenownState(mapKey);
  const rank = renown.rank || 0;
  return {
    rank,
    alert:worldRenownAlertLevel(mapKey),
    goldMult:1 + Math.min(0.36, rank * 0.022),
    dropMult:1 + Math.min(0.16, rank * 0.010),
    fieldBonus:Math.floor(rank / 4),
    commanderRewardMult:1 + Math.min(0.30, rank * 0.018)
  };
}

function grantWorldRenown(mapKey, amount, reason, opts) {
  const map = (typeof MAPS !== 'undefined') ? MAPS.find(m => m.key === mapKey) : null;
  const renown = worldRenownState(mapKey);
  const before = renown.rank || 0;
  const gain = Math.max(0, Math.floor(amount || 0));
  if (gain <= 0) return renown;
  renown.xp += gain;
  renown.rank = worldRenownRankForXp(renown.xp);
  const alertGain = Math.max(0, Math.floor(opts?.alert == null ? Math.max(1, gain / 8) : opts.alert));
  renown.alert = Math.min(9999, (renown.alert || 0) + alertGain);
  if (opts?.fieldClear) renown.fieldClears = (renown.fieldClears || 0) + 1;
  if (opts?.bossKill) renown.bossKills = (renown.bossKills || 0) + 1;
  if (renown.rank > before) {
    log(`🏕️ ${map?.name || '区域'} 声望提升至 ${renown.rank}: 补给更丰厚,敌方警戒也随之升高`, 'legend');
  } else if (opts?.verbose) {
    log(`🏕️ ${map?.name || '区域'} 声望 +${gain}${reason ? ` (${reason})` : ''}`, 'good');
  }
  markDirty('map', 'hero');
  return renown;
}

function worldRenownTip(mapKey) {
  const map = (typeof MAPS !== 'undefined') ? MAPS.find(m => m.key === mapKey) : null;
  const renown = worldRenownState(mapKey);
  const prog = worldRenownRankProgress(renown.xp || 0);
  const bonus = worldRenownBonuses(mapKey);
  const nextText = prog.need ? `${prog.cur}/${prog.need}` : '已满';
  return {
    name:`${map?.name || '区域'}声望 ${bonus.rank}`,
    icon:'🏕️',
    meta:`警戒 ${bonus.alert}`,
    desc:`清理野外、完成据点和击败地图首领会提高当地声望。当前进度 ${nextText};金币 ×${bonus.goldMult.toFixed(2)},掉率 ×${bonus.dropMult.toFixed(2)},据点推进 +${bonus.fieldBonus}。敌人同步获得警戒强化。`
  };
}

function worldFieldOpKey(map, subIdx) {
  return `${map?.key || state.currentMap}-${Math.max(0, subIdx == null ? (state.currentSubzone || 0) : subIdx)}`;
}

function worldFieldOperationScore(rule, map, sub) {
  const text = worldZoneThreatText(map, sub);
  let score = 0;
  for (const tag of (rule.tags || [])) if (text.includes(tag)) score += 10;
  score += worldThreatHash(`${map?.key || ''}:${sub?.name || ''}:${rule.key}:field`) % 8;
  return score;
}

function selectWorldFieldOperationRule(map, sub) {
  return WORLD_FIELD_OPERATION_RULES
    .map(rule => ({ rule, score:worldFieldOperationScore(rule, map, sub) }))
    .sort((a, b) => b.score - a.score)[0]?.rule || WORLD_FIELD_OPERATION_RULES[0];
}

function worldFieldOperationGoal(map, sub) {
  const high = sub?.lvl?.[1] || map?.lvlRange?.[1] || 1;
  return Math.max(8, Math.min(18, 8 + Math.floor(high / 14)));
}

function getWorldFieldOperation(map, subIdx, opts) {
  if (!map && typeof getMap === 'function') map = getMap();
  if (!map) return null;
  const idx = Math.max(0, subIdx == null ? (state?.currentSubzone || 0) : subIdx);
  const sub = map.sub?.[idx] || map.sub?.[0];
  if (!sub) return null;
  const ops = ensureWorldFieldOps();
  const key = worldFieldOpKey(map, idx);
  const completed = ops.completed[key];
  if (completed && !opts?.includeCompleted) return Object.assign({ key, completed:true }, completed);
  if (!ops.active[key] && !completed && opts?.previewOnly) {
    const rule = selectWorldFieldOperationRule(map, sub);
    return Object.assign({}, rule, {
      key,
      rule,
      mapKey:map.key,
      subIdx:idx,
      subName:sub.name,
      progress:0,
      goal:worldFieldOperationGoal(map, sub),
      commanderPending:false,
      commanderKilled:false,
      preview:true,
      completed:false
    });
  }
  if (!ops.active[key] && !completed) {
    const rule = selectWorldFieldOperationRule(map, sub);
    ops.active[key] = {
      key,
      ruleKey:rule.key,
      mapKey:map.key,
      subIdx:idx,
      progress:0,
      goal:worldFieldOperationGoal(map, sub),
      commanderPending:false,
      commanderKilled:false,
      startedAt:Date.now()
    };
  }
  const active = ops.active[key];
  const rule = WORLD_FIELD_OPERATION_RULES.find(r => r.key === active?.ruleKey) || selectWorldFieldOperationRule(map, sub);
  if (!active) return completed ? Object.assign({ key, completed:true }, completed) : null;
  return Object.assign({}, rule, active, { rule, subName:sub.name, completed:false });
}

function worldFieldOperationFailLeftMs(op, now) {
  if (!op?.failedAt) return 0;
  return Math.max(0, 90000 - ((now || Date.now()) - op.failedAt));
}

function worldFieldOperationProgressText(op) {
  if (!op) return '';
  if (op.completed) return '已完成';
  const failLeft = worldFieldOperationFailLeftMs(op);
  if (failLeft > 0) {
    const sec = Math.ceil(failLeft / 1000);
    return `挑战失败 · ${sec}秒后可重新推进 ${Math.min(op.progress || 0, op.goal || 1)}/${op.goal || 1}`;
  }
  if (op.commanderPending) return '指挥官现身';
  return `${Math.min(op.progress || 0, op.goal || 1)}/${op.goal || 1}`;
}

function worldFieldOperationTip(map, subIdx, opts) {
  const op = getWorldFieldOperation(map, subIdx, { includeCompleted:true, previewOnly:!!opts?.previewOnly });
  if (!op) return null;
  const failLeft = worldFieldOperationFailLeftMs(op);
  const failText = failLeft > 0
    ? `上次首领挑战失败,首领已撤退;${Math.ceil(failLeft / 1000)}秒后继续击杀野外敌人,补回进度即可再次引出。`
    : '';
  return {
    name:op.name || '野外据点',
    icon:op.icon || '🗺️',
    desc:`${op.desc || '完成野外事件可引出据点指挥官。'} 进度: ${worldFieldOperationProgressText(op)}。${failText ? `${failText} ` : ''}奖励: ${op.reward || '区域补给'}。`,
    meta:op.completed ? '已完成' : (failLeft > 0 ? '失败冷却' : (op.commanderPending ? '首领现身' : op.meta || '野外事件')),
    tone:op.completed ? 'done' : (failLeft > 0 ? 'failed' : (op.commanderPending ? 'ready' : 'active')),
    failLeftMs:failLeft
  };
}

function recordWorldFieldOperationKill(mon) {
  if (state.mode !== 'world' || mon?.isBoss || mon?._summoned) return null;
  const map = typeof getMap === 'function' ? getMap() : null;
  if (!map) return null;
  const threatBonus = mon?._zoneThreats?.length ? 1 : 0;
  grantWorldRenown(map.key, 1 + threatBonus, '野外击杀', { alert:1 });
  const op = getWorldFieldOperation(map, state.currentSubzone);
  if (!op || op.completed || op.commanderPending) return op;
  const active = ensureWorldFieldOps().active[op.key];
  if (!active) return op;
  const renownBonus = worldRenownBonuses(map.key).fieldBonus || 0;
  active.progress = Math.min(active.goal, (active.progress || 0) + 1 + threatBonus + renownBonus);
  if (active.progress >= active.goal) {
    active.commanderPending = true;
    log(`${op.icon || '🗺️'} 野外据点「${op.name}」已推进完成,据点指挥官即将现身!`, 'epic');
  }
  markDirty('map', 'stage');
  return getWorldFieldOperation(map, state.currentSubzone);
}

function worldFieldCommanderName(op, map, sub) {
  return `${op.icon || '🗺️'}${sub?.name || map?.name || '据点'}·${op.commander || '据点指挥官'}`;
}

function shouldSpawnWorldFieldCommander(map, subIdx) {
  const op = getWorldFieldOperation(map, subIdx);
  return !!(op && !op.completed && op.commanderPending && !op.commanderKilled);
}

function failWorldFieldCommanderEncounter(mon) {
  const ops = ensureWorldFieldOps();
  const fallbackMap = typeof getMap === 'function' ? getMap() : null;
  const fallbackKey = fallbackMap ? worldFieldOpKey(fallbackMap, state.currentSubzone) : null;
  const key = mon?._fieldOperationKey || fallbackKey;
  const active = key ? ops.active[key] : null;
  if (!active) return null;
  const goal = Math.max(1, active.goal || 1);
  const rule = WORLD_FIELD_OPERATION_RULES.find(r => r.key === active.ruleKey);
  const map = typeof MAPS !== 'undefined' ? MAPS.find(m => m.key === (active.mapKey || state.currentMap)) : fallbackMap;
  active.commanderPending = false;
  active.commanderKilled = false;
  active.failedAt = Date.now();
  active.failCount = (active.failCount || 0) + 1;
  active.progress = Math.max(0, Math.min(goal - 1, Math.floor(goal * 0.72)));
  markDirty('map', 'stage');
  return {
    key,
    active,
    rule,
    map,
    name:mon?.bossName || rule?.commander || rule?.name || '据点指挥官'
  };
}

function onWorldFieldCommanderKill(mon) {
  const ops = ensureWorldFieldOps();
  const key = mon?._fieldOperationKey;
  const active = key ? ops.active[key] : null;
  const map = typeof MAPS !== 'undefined' ? MAPS.find(m => m.key === (active?.mapKey || state.currentMap)) : null;
  if (!active || !map) {
    spawnMonster();
    return;
  }
  const sub = map.sub?.[active.subIdx] || map.sub?.[0];
  const op = getWorldFieldOperation(map, active.subIdx, { includeCompleted:true });
  const high = sub?.lvl?.[1] || map.lvlRange?.[1] || mon?.lvl || 1;
  const renownBonus = worldRenownBonuses(map.key);
  const rewardMult = renownBonus.commanderRewardMult || 1;
  const gold = Math.floor((high * 95 + (op.goal || 10) * 35) * rewardMult);
  const honor = Math.floor((25 + high * 2.4) * rewardMult);
  const essence = Math.max(1, Math.floor(high / 18));
  const gems = high >= 55 ? Math.max(1, Math.floor(high / 28)) : 0;
  state.gold += gold;
  state.honor += honor;
  if (typeof ensureMats === 'function') ensureMats();
  state.essence += essence;
  if (gems) state.gem += gems;
  const rarity = high >= 70 ? 'epic' : (high >= 35 ? 'rare' : 'uncommon');
  const item = rollItem(rarity, high, map.key);
  addToInventory(item);
  if (typeof eventsOnItemGet === 'function') eventsOnItemGet(item);
  ops.completed[key] = {
    ruleKey:active.ruleKey,
    completedAt:Date.now(),
    progress:active.goal,
    goal:active.goal,
    rewardGold:gold
  };
  delete ops.active[key];
  grantWorldRenown(map.key, 45 + high, '据点完成', { fieldClear:true, alert:Math.max(4, Math.floor(high / 12)) });
  log(`${op.icon || '🗺️'} 完成野外据点「${op.name}」: +${gold}💰 +${honor}荣誉 +${essence}精华${gems ? ` +${gems}💎` : ''} · ${item.name}`, 'legend');
  if (typeof progressionOnGoldGain === 'function') progressionOnGoldGain(gold);
  state.currentMonsters = [];
  spawnMonster();
  markDirty('map', 'hero', 'inventory', 'stage');
}

function worldZoneThreatScore(rule, map, sub) {
  const text = worldZoneThreatText(map, sub);
  let score = 0;
  for (const tag of (rule.tags || [])) {
    if (text.includes(tag)) score += 12;
  }
  const high = map?.lvlRange?.[1] || sub?.lvl?.[1] || 1;
  if (rule.key === 'void_rupture' && high >= 70) score += 4;
  if (rule.key === 'titan_overwatch' && high >= 55) score += 2;
  score += (worldThreatHash(`${map?.key || ''}:${sub?.name || ''}:${rule.key}`) % 7);
  return score;
}

function worldZoneThreatPressure(map, sub, opts) {
  const high = map?.lvlRange?.[1] || sub?.lvl?.[1] || 1;
  const level = Math.max(1, high);
  const curve = 1 + Math.max(0, level - 20) * 0.006 + Math.max(0, level - 60) * 0.008 + Math.max(0, level - 90) * 0.006;
  const boss = opts?.boss ? 0.45 : 0;
  const rare = opts?.rare ? 0.65 : 0;
  const pack = opts?.packSize > 2 ? 0.10 : 0;
  return Math.max(0.85, Math.min(2.35, curve + boss + rare + pack));
}

function getWorldZoneThreats(map, sub, opts) {
  if (!map && typeof getMap === 'function') map = getMap();
  if (!map) return [];
  if (!sub) sub = map.sub?.[state?.currentSubzone || 0] || map.sub?.[0] || null;
  const high = map.lvlRange?.[1] || sub?.lvl?.[1] || 1;
  const count = Math.max(1, Math.min(3, opts?.count || (opts?.rare ? 2 : (opts?.boss || high >= 70 ? 2 : 1))));
  return WORLD_ZONE_THREAT_RULES
    .map(rule => ({ rule, score:worldZoneThreatScore(rule, map, sub) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(entry => {
      const pressure = worldZoneThreatPressure(map, sub, opts);
      return {
        ...entry.rule,
        pressure,
        meta:entry.rule.meta || '区域威胁',
        desc:entry.rule.desc || '该区域正在影响野外战斗。',
        mod:{ ...(entry.rule.mod || {}) }
      };
    });
}

function getRareEliteMutations(rare, map) {
  if (!rare) return [];
  map = map || (typeof MAPS !== 'undefined' ? MAPS.find(m => m.key === rare.mapKey) : null);
  const text = `${rare.theme || ''} ${rare.name || ''} ${rare.desc || ''} ${worldZoneThreatText(map, map?.sub?.[0])}`;
  const high = rare.lvl || map?.lvlRange?.[1] || 1;
  const count = high >= 75 ? 3 : 2;
  return WORLD_RARE_MUTATIONS
    .map(rule => {
      let score = 0;
      for (const tag of (rule.tags || [])) if (text.includes(tag)) score += 10;
      score += worldThreatHash(`${rare.key || rare.name}:${rule.key}`) % 9;
      return { rule, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(entry => ({ ...entry.rule, meta:'稀有异变', mod:{ ...(entry.rule.mod || {}) } }));
}

function switchSubzone(mapKey, subIdx) {
  const map = MAPS.find(m => m.key === mapKey);
  if (!map) return;
  if (state.mode === 'dungeon') {
    if (!confirm('离开当前战斗?')) return;
    state.mode = 'world';
    state.dungeonState = null;
  }
  if (state.mode === 'mythic') {
    if (!confirm('离开大秘境?')) return;
    state.mode = 'world';
    state.mythicState = null;
  }
  if (state.mode === 'tower') {
    if (!confirm('撤离无尽塔?')) return;
    if (typeof leaveTower === 'function') leaveTower();
  }
  if (state.mode === 'roguelike') {
    if (!confirm('撤离幻象挑战? 幻象币会保留')) return;
    if (typeof leaveRoguelike === 'function') leaveRoguelike();
    else { state.mode = 'world'; state.towerState = null; }
  }
  if (state.mode === 'boss') {
    if (!confirm('撤离首领战?')) return;
    state.mode = 'world';
  }
  if (state.mode === 'travel') {
    log('正在旅行中...', 'bad');
    return;
  }

  // 同地图切子区域: 瞬间到达
  if (mapKey === state.currentMap) {
    state.currentSubzone = subIdx;
    state.currentMonsters = [];
    state.worldCombatPause = null;
    if (typeof resetDmgStats === 'function') resetDmgStats();
    spawnMonster();
    const sub = map.sub[subIdx];
    log(`📍 移动到 ${map.icon} ${map.name} · ${sub.name}`, 'info');
    markDirty('map', 'stage');
    return;
  }

  // 跨地图: 需要跑路
  const travelTime = calcTravelTime(state.currentMap, mapKey);
  state.mode = 'travel';
  state.travel = {
    mapKey,
    subIdx,
    startTime: Date.now(),
    duration: travelTime * 1000,
  };
  state.currentMonsters = [];
  const sub = map.sub[subIdx];
  log(`🐴 前往 ${map.icon} ${map.name} · ${sub.name} (${travelTime}秒)`, 'info');
  $('modal-travel').classList.add('show');
  markDirty('map', 'stage');
}

function tickTravel(now) {
  if (state.mode !== 'travel' || !state.travel) return;
  const t = state.travel;
  const elapsed = now - t.startTime;
  const pct = Math.min(100, elapsed / t.duration * 100);
  const remaining = Math.max(0, Math.ceil((t.duration - elapsed) / 1000));

  setBar($('b-travel'), pct, `${remaining}秒`);
  $('travel-text').textContent = `从 ${(getMap()||{}).name||'?'} 前往 ${(MAPS.find(m=>m.key===t.mapKey)||{}).name||'?'}`;

  if (elapsed >= t.duration) {
    $('modal-travel').classList.remove('show');
    state.mode = 'world';
    state.currentMap = t.mapKey;
    state.currentSubzone = t.subIdx;
    state.travel = null;
    state.worldCombatPause = null;
    if (typeof resetDmgStats === 'function') resetDmgStats();
    spawnMonster();
    const map = MAPS.find(m => m.key === t.mapKey);
    const sub = map.sub[t.subIdx];
    log(`📍 抵达 ${map.icon} ${map.name} · ${sub.name}`, 'good');
    markDirty('map', 'stage');
  }
}

/* BOSS挑战CD(秒):按地图BOSS等级线性,封顶1小时(Lv80=3600s) */
function bossCdSec(map) { return Math.min(3600, Math.round((map.boss.lvl || 1) * 45)); }

function challengeBoss(mapKey) {
  const map = MAPS.find(m => m.key === mapKey);
  if (!map) return;
  const accessReq = Math.max(1, (map.boss.lvl || 1) - 5);
  if (!contentReqMet(accessReq)) { log(`进度不足 (需 ${contentReqLabel(accessReq)}+)`, 'bad'); return; }
  if (state.mode === 'travel') { log('正在旅行中', 'bad'); return; }
  if (state.mode !== 'world') { log('请先结束当前战斗', 'bad'); return; }
  const cdEnd = state.bossCd[mapKey] || 0;
  const onCd = cdEnd > Date.now();
  if (onCd && state.tickets < 1) { log('首领挑战冷却中，通用券不足无法跳过', 'bad'); return; }
  if (onCd) { state.tickets -= 1; log(`⚔️ 挑战 ${map.boss.emoji}${map.boss.name}! (消耗1通用券跳过冷却)`, 'epic'); }
  else { log(`⚔️ 挑战 ${map.boss.emoji}${map.boss.name}! (免费)`, 'epic'); }
  state.bossCd[mapKey] = Date.now() + bossCdSec(map) * 1000;   // 挑战即进入CD(无论胜负)
  state.currentMap = mapKey;
  state.mode = 'boss';
  state.currentMonsters = [];
  state.hp = state.hero.hpMax;
  state.resource = state.resourceMax;
  if (typeof resetDmgStats === 'function') resetDmgStats();
  if (typeof resetCombatState === 'function') resetCombatState();
  if (typeof clearAllBuffs === 'function') clearAllBuffs();
  spawnZoneBoss();
  markDirty('map', 'stage');
}

/* ---------- 副本 ---------- */
function enterDungeon(key) {
  const dg = DUNGEONS.find(d => d.key === key);
  const access = dungeonAccessInfo(dg);
  if (!access.ok) { log(access.reason || `需要${contentReqLabel(dg?.reqLvl || 1)}`, 'bad'); return; }
  if (state.mode === 'travel') { log('正在旅行中', 'bad'); return; }
  if (state.mode === 'dungeon') { log('已在副本中', 'bad'); return; }
  const cdEnd = state.dungeonCd[key] || 0;
  const onCd = cdEnd > Date.now();
  if (onCd && state.tickets < 1) { log('通用券不足,去商店购买', 'bad'); return; }
  if (onCd) {
    state.tickets -= 1;
    log(`🚪 进入 [${dg.name}] (消耗1通用券跳过冷却)`, 'epic');
  } else {
    log(`🚪 进入 [${dg.name}] (免费)`, 'epic');
  }
  state.mode = 'dungeon';
  const contractLevel = (typeof dungeonContractLevel === 'function') ? dungeonContractLevel() : 0;
  const contract = (typeof dungeonContractInfo === 'function') ? dungeonContractInfo(contractLevel) : null;
  const themeAffixes = (typeof getDungeonThemeAffixes === 'function') ? getDungeonThemeAffixes(dg) : [];
  const baseAffixes = getDungeonAffixes(dg);
  const trials = (typeof getDungeonContractTrials === 'function') ? getDungeonContractTrials(dg, contractLevel) : [];
  const environments = (typeof getDungeonEnvironments === 'function') ? getDungeonEnvironments(dg, contractLevel) : [];
  const cataclysms = (typeof getDungeonCataclysms === 'function') ? getDungeonCataclysms(dg, contractLevel) : [];
  const edicts = (typeof getDungeonTacticalEdicts === 'function') ? getDungeonTacticalEdicts(dg, contractLevel) : [];
  const combatRooms = (typeof getDungeonCombatRooms === 'function') ? getDungeonCombatRooms(dg, contractLevel) : [];
  const timer = (typeof createDungeonTimer === 'function') ? createDungeonTimer(dg, contractLevel) : null;
  state.dungeonState = { key, wave: 1, loot: [], affixes: themeAffixes.concat(baseAffixes, trials), themeAffixes, trials, environments, cataclysms, edicts, combatRooms, timer, contractLevel, contract, alertLevel: 0, maxAlert: 0 };
  if (contractLevel > 0 && contract) log(`${contract.icon || '📜'} 已启用 ${contract.name}: ${contract.desc}`, 'legend');
  if (themeAffixes.length) log(`🧭 副本主题: ${themeAffixes.map(a => `${a.icon || '🧭'}${a.name}`).join(' · ')}`, 'bad');
  if (trials.length) log(`🔥 契约试炼: ${trials.map(t => `${t.icon || '🔥'}${t.name}`).join(' · ')}`, 'legend');
  if (environments.length) log(`🧭 副本环境: ${environments.map(e => `${e.icon || '🧭'}${e.name}`).join(' · ')}`, 'bad');
  if (cataclysms.length) log(`🌪️ 环境灾变: ${cataclysms.map(e => `${e.icon || '🌪️'}${e.name}`).join(' · ')}`, 'bad');
  if (edicts.length) log(`📜 战术禁令: ${edicts.map(e => `${e.icon || '📜'}${e.name}`).join(' · ')}`, 'bad');
  if (combatRooms.length) log(`🎲 战斗房间: ${combatRooms.map(r => `${r.icon || '🎲'}${r.name}`).join(' · ')}`, 'bad');
  if (timer) log(`⏳ 限时挑战: ${timer.label} 内通关奖励+${Math.round((timer.rewardMult - 1) * 100)}%,超时后每15秒叠加压迫`, 'legend');
  // 进入副本:全量刷新所有技能CD(英雄/天赋/神器/随从)+清理身上的 buff/debuff/护盾(含随从护盾与随从buff/debuff)
  if (typeof resetCombatState === 'function') resetCombatState();
  else if (typeof clearAllBuffs === 'function') clearAllBuffs();
  if (typeof recomputeStats === 'function') recomputeStats();   // 清增益后重算面板,再回满血
  if (typeof initCompanionHp === 'function') initCompanionHp();  // 随从满血进本(spawnDungeonMonster 不会初始化,resetCombatState 已置空_compHp)
  state.hp = state.hero.hpMax;
  state.resource = state.resourceMax;
  if (typeof resetDmgStats === 'function') resetDmgStats();
  spawnDungeonMonster();
  markDirty('dungeon', 'stage', 'hero');
}

function leaveDungeon() {
  state.mode = 'world';
  state.dungeonState = null;
  spawnMonster();
  markDirty('dungeon', 'stage');
}

const DUNGEON_CONTRACTS = [
  { level:0, name:'稳扎稳打', icon:'📘', desc:'标准副本难度与奖励。', hp:1, atk:1, def:1, reward:1, chest:0 },
  { level:1, name:'危险契约', icon:'📕', desc:'怪物生命+18%,攻击+10%,防御+6%;通关奖励+18%。', hp:1.18, atk:1.10, def:1.06, reward:1.18, chest:1 },
  { level:2, name:'残酷契约', icon:'📙', desc:'怪物生命+42%,攻击+24%,防御+14%;通关奖励+42%。', hp:1.42, atk:1.24, def:1.14, reward:1.42, chest:2 },
  { level:3, name:'噩梦契约', icon:'📓', desc:'怪物生命+78%,攻击+42%,防御+24%;通关奖励+80%。', hp:1.78, atk:1.42, def:1.24, reward:1.80, chest:3 },
];

function dungeonContractLevel() {
  return Math.max(0, Math.min(3, Math.floor(state.dungeonContractLevel || 0)));
}

function dungeonContractInfo(level) {
  return DUNGEON_CONTRACTS[Math.max(0, Math.min(3, Math.floor(level || 0)))] || DUNGEON_CONTRACTS[0];
}

const DUNGEON_ENVIRONMENTS = [
  { key:'trapHall', name:'机关回廊', icon:'🪤', desc:'战斗中每11秒触发陷阱,造成最大生命6%伤害。', mod:{trapTickMs:11000, trapDamagePct:0.06} },
  { key:'poisonMiasma', name:'腐毒雾气', icon:'☣️', desc:'治疗效果降低18%,并周期性施加毒性持续伤害。', mod:{healReduction:0.18, poisonTickMs:9000, poisonDpsPct:0.018, poisonMs:4200} },
  { key:'manaFlux', name:'魔力紊乱', icon:'💧', desc:'攻击速度降低6%,并周期性燃烧12%最大资源。', mod:{heroSpd:-0.06, drainTickMs:10000, resourceDrainPct:0.12} },
  { key:'collapsingVault', name:'塌陷穹顶', icon:'🪨', desc:'战斗中每14秒落石,造成伤害并短暂打断行动。', mod:{ceilingTickMs:14000, ceilingDamagePct:0.07, stunMs:700} },
  { key:'wardedSanctum', name:'守护圣所', icon:'🔷', desc:'敌人每16秒获得小型吸收盾。', mod:{shieldTickMs:16000, monsterShieldPct:0.055} },
  { key:'dreadFog', name:'恐惧黑雾', icon:'🌫️', desc:'受到伤害提高10%,并周期性陷入虚弱。', mod:{vulnerableTaken:true, weakenTickMs:13000, weakenMs:5000} },
];

const DUNGEON_THEME_AFFIX_POOL = {
  fire: { key:'theme_fire', name:'熔火压迫', icon:'🔥', desc:'火焰、熔炉或邪能主题副本的常驻压力:敌人攻击提高,并周期性触发火山伤害。', mod:{trashDmg:0.06, bossDmg:0.08, volcanic:true}, themeAffix:true },
  forge: { key:'theme_forge', name:'铸炉装甲', icon:'🔩', desc:'锻造、黑石或泰坦工坊主题副本的常驻压力:敌人防御提高,小怪更硬。', mod:{trashDef:0.09, bossDef:0.07, trashHp:0.05}, themeAffix:true },
  dragon: { key:'theme_dragon', name:'龙息余烬', icon:'🐲', desc:'龙类主题副本的常驻压力:首领生命和攻击提高,终局阶段更危险。', mod:{bossHp:0.08, bossDmg:0.08, executePulsePct:0.018, executeBelow:0.36}, themeAffix:true },
  storm: { key:'theme_storm', name:'风暴导流', icon:'⚡', desc:'风暴、雷霆或高空主题副本的常驻压力:敌人节奏更快,并周期性链击资源。', mod:{trashDmg:0.04, bossDmg:0.05, drainTickMs:15000, resourceDrainPct:0.08}, themeAffix:true },
  speed: { key:'theme_speed', name:'急袭路线', icon:'👟', desc:'快节奏、海盗或突袭主题副本的常驻压力:非首领攻势提高,有更高伏击压力。', mod:{trashDmg:0.07, ambushChance:0.24}, themeAffix:true },
  arcane: { key:'theme_arcane', name:'奥能回路', icon:'🔷', desc:'奥术、魔网或法师主题副本的常驻压力:首领会获得奥术吸收盾,并压缩资源窗口。', mod:{arcane:true, resourceDrainPct:0.05, drainTickMs:13000}, themeAffix:true },
  time: { key:'theme_time', name:'时序错位', icon:'⏳', desc:'时光或秩序主题副本的常驻压力:敌人攻势更稳定,战斗拖长后资源压力更明显。', mod:{bossDmg:0.05, trashDef:0.04, resourceDrainPct:0.04, drainTickMs:12500}, themeAffix:true },
  titan: { key:'theme_titan', name:'泰坦矩阵', icon:'🔷', desc:'泰坦设施主题副本的常驻压力:敌人护盾与防御提高,需要更稳定的破盾能力。', mod:{bossDef:0.08, trashDef:0.08, monsterShieldPct:0.026, shieldTickMs:17500}, themeAffix:true },
  mech: { key:'theme_mech', name:'机械加固', icon:'⚙️', desc:'机械主题副本的常驻压力:敌人防御提高,并周期性获得小型护盾。', mod:{trashDef:0.10, bossDef:0.06, monsterShieldPct:0.022, shieldTickMs:16000}, themeAffix:true },
  void: { key:'theme_void', name:'虚空低语', icon:'🌌', desc:'虚空或古神主题副本的常驻压力:玩家受到伤害提高,并周期性陷入虚弱。', mod:{takenMult:0.045, weakenTickMs:14000, weakenMs:4200}, themeAffix:true },
  shadow: { key:'theme_shadow', name:'暗影侵蚀', icon:'🌑', desc:'暗影、梦魇或诅咒主题副本的常驻压力:治疗受限,并会受到持续折磨。', mod:{healReduction:0.08, afflicted:true, poisonTickMs:11000, poisonDpsPct:0.004, poisonMs:3600}, themeAffix:true },
  undead: { key:'theme_undead', name:'亡者缠斗', icon:'💀', desc:'亡灵或天灾主题副本的常驻压力:敌人生命提高,战斗拖长会放大治疗压力。', mod:{trashHp:0.08, bossHp:0.06, healReduction:0.06}, themeAffix:true },
  blood: { key:'theme_blood', name:'鲜血税契', icon:'🩸', desc:'鲜血或吸血主题副本的常驻压力:敌方低血量更危险,首领获得额外续航。', mod:{raging:true, bossHp:0.05, bossDmg:0.04}, themeAffix:true },
  plague: { key:'theme_plague', name:'瘟疫炼池', icon:'☣️', desc:'瘟疫、孢子或炼金腐化主题副本的常驻压力:治疗受限,并周期性叠加毒雾持续伤害。', mod:{healReduction:0.10, poisonTickMs:8500, poisonDpsPct:0.014, poisonMs:4400, trashHp:0.04}, themeAffix:true },
  nature: { key:'theme_nature', name:'野性再生', icon:'🌿', desc:'自然、野兽或梦境主题副本的常驻压力:敌人生命提高,并更难被快速清场。', mod:{trashHp:0.08, bossHp:0.05, trashDef:0.04}, themeAffix:true },
  heal: { key:'theme_heal', name:'生命回响', icon:'💚', desc:'生命或圣泉主题副本的常驻压力:首领更厚,小怪防御提高。', mod:{bossHp:0.08, trashDef:0.05}, themeAffix:true },
  naga: { key:'theme_naga', name:'潮汐围困', icon:'🌊', desc:'娜迦、海潮或深水主题副本的常驻压力:玩家攻速降低,敌人更擅长拖慢战斗。', mod:{heroSpd:-0.045, trashDef:0.05, bossDef:0.04}, themeAffix:true },
  water: { key:'theme_water', name:'深水压力', icon:'🌊', desc:'水域主题副本的常驻压力:行动节奏受限,资源消耗更紧。', mod:{heroSpd:-0.04, resourceDrainPct:0.04, drainTickMs:13500}, themeAffix:true },
  pirate: { key:'theme_pirate', name:'海盗伏击', icon:'🏴‍☠️', desc:'海盗或港口主题副本的常驻压力:伏击频率提高,但通关结算也会因词缀获得更高金币收益。', mod:{trashDmg:0.05, ambushChance:0.30, bonusGoldPct:0.10}, themeAffix:true },
  beast: { key:'theme_beast', name:'兽群奔袭', icon:'🐾', desc:'野兽或虫群主题副本的常驻压力:非首领生命和攻击提高,清怪压力更明显。', mod:{trashHp:0.08, trashDmg:0.06}, themeAffix:true },
  spider: { key:'theme_spider', name:'蛛魔织网', icon:'🕸️', desc:'蛛魔、虫巢或织网主题副本的常驻压力:小怪生命提高,伏击概率提高,并周期性用毒网压低治疗窗口。', mod:{trashHp:0.07, ambushChance:0.16, poisonTickMs:10000, poisonDpsPct:0.010, poisonMs:4200, healReduction:0.05}, themeAffix:true },
  troll: { key:'theme_troll', name:'巫毒战鼓', icon:'🪬', desc:'巨魔、洛阿或赞达拉主题副本的常驻压力:敌人低血暴怒,小怪攻势提高,首领斩杀阶段会发动巫毒脉冲。', mod:{trashDmg:0.055, raging:true, executePulsePct:0.014, executeBelow:0.38}, themeAffix:true },
  holy: { key:'theme_holy', name:'圣光审判', icon:'✨', desc:'圣光、修道院或骑士主题副本的常驻压力:敌人防御提高,并周期性获得小型护盾。', mod:{bossDef:0.08, trashDef:0.06, monsterShieldPct:0.018, shieldTickMs:18000}, themeAffix:true },
  fortress: { key:'theme_fortress', name:'要塞戒备', icon:'🛡️', desc:'城堡、要塞或王庭主题副本的常驻压力:守卫生命和防御提高。', mod:{trashHp:0.06, trashDef:0.08, bossDef:0.05}, themeAffix:true },
  martial: { key:'theme_martial', name:'军势压阵', icon:'⚔️', desc:'军团、兽人或攻城主题副本的常驻压力:小怪攻击提高,并可能出现额外增援。', mod:{trashDmg:0.06, edictAddChance:0.08}, themeAffix:true },
  orc: { key:'theme_orc', name:'战歌冲锋', icon:'🪓', desc:'兽人战争主题副本的常驻压力:敌人攻势提高,低血量时更危险。', mod:{trashDmg:0.06, bossDmg:0.05, raging:true}, themeAffix:true },
  ethereal: { key:'theme_ethereal', name:'相位税契', icon:'🧿', desc:'虚灵、掮灵、生态圆顶或卡雷什主题副本的常驻压力:周期性燃烧资源并给敌人相位护盾,通关金币略高。', mod:{drainTickMs:9500, resourceDrainPct:0.09, shieldTickMs:17000, monsterShieldPct:0.024, bonusGoldPct:0.08}, themeAffix:true },
  delve: { key:'theme_delve', name:'地下堡短线', icon:'🔦', desc:'地下堡或短波次路线的常驻压力:开场推进更快,小怪波次有更高伏击概率,奖励金币略高。', mod:{trashDmg:0.05, trashHaste:0.08, ambushChance:0.18, bonusGoldPct:0.06}, themeAffix:true },
  raid: { key:'theme_raid', name:'团队压轴', icon:'👑', desc:'团队副本的常驻压力:首领生命和防御提高,奖励随额外词缀同步提高。', mod:{bossHp:0.07, bossDef:0.05}, themeAffix:true },
  mythic: { key:'theme_mythic', name:'秘境节奏', icon:'💠', desc:'史诗五人本的常驻压力:敌人攻势更紧,小怪波次更危险。', mod:{trashDmg:0.06, bossDmg:0.04, trashHp:0.04}, themeAffix:true },
};

function getDungeonThemeAffixes(dg) {
  if (!dg) return [];
  const tags = (typeof dungeonTraitTagsForDungeon === 'function') ? dungeonTraitTagsForDungeon(dg.key) : [];
  const priority = ['spider','troll','ethereal','plague','void','shadow','fire','dragon','titan','mech','storm','arcane','time','undead','blood','nature','naga','pirate','beast','holy','fortress','martial','orc','water','heal','delve','speed'];
  const forcedTag = tags.includes('pirate') ? 'pirate'
    : tags.includes('spider') ? 'spider'
    : tags.includes('troll') ? 'troll'
    : tags.includes('ethereal') ? 'ethereal'
    : tags.includes('plague') ? 'plague'
    : tags.includes('delve') ? 'delve'
    : tags.includes('holy') ? 'holy'
    : (tags.includes('nature') && tags.includes('dragon')) ? 'dragon'
    : null;
  const pickedTag = forcedTag || priority.find(tag => tags.includes(tag)) || (dg.epic5 ? 'mythic' : (dg.type === 'raid' ? 'raid' : null));
  const def = pickedTag ? DUNGEON_THEME_AFFIX_POOL[pickedTag] : null;
  if (!def) return [];
  const affix = { ...def, mod:{ ...(def.mod || {}) }, themeTag:pickedTag, tags };
  affix.meta = dungeonAffixMeta(affix);
  return [affix];
}

function dungeonAffixMeta(affix) {
  const mod = affix?.mod || {};
  const parts = [];
  if (mod.trashHp) parts.push(`小怪生命+${Math.round(mod.trashHp * 100)}%`);
  if (mod.trashDmg) parts.push(`小怪伤害+${Math.round(mod.trashDmg * 100)}%`);
  if (mod.trashDef) parts.push(`小怪防御+${Math.round(mod.trashDef * 100)}%`);
  if (mod.bossHp) parts.push(`首领生命+${Math.round(mod.bossHp * 100)}%`);
  if (mod.bossDmg) parts.push(`首领伤害+${Math.round(mod.bossDmg * 100)}%`);
  if (mod.bossDef) parts.push(`首领防御+${Math.round(mod.bossDef * 100)}%`);
  if (mod.heroSpd) parts.push(`玩家攻速${Math.round(mod.heroSpd * 100)}%`);
  if (mod.healReduction) parts.push(`治疗-${Math.round(mod.healReduction * 100)}%`);
  if (mod.takenMult) parts.push(`承伤+${Math.round(mod.takenMult * 100)}%`);
  if (mod.ambushChance || mod.edictAddChance) parts.push('可能增援');
  if (mod.poisonTickMs) parts.push('周期毒雾');
  if (mod.trapTickMs) parts.push('周期陷阱');
  if (mod.ceilingTickMs) parts.push('周期坠落');
  if (mod.drainTickMs) parts.push('资源压力');
  if (mod.shieldTickMs || mod.arcane) parts.push('敌方护盾');
  if (mod.raging) parts.push('低血暴怒');
  if (mod.executePulsePct) parts.push('斩杀脉冲');
  if (mod.volcanic) parts.push('火山伤害');
  if (mod.afflicted) parts.push('折磨伤害');
  if (mod.bonusGoldPct) parts.push(`金币+${Math.round(mod.bonusGoldPct * 100)}%`);
  return parts.slice(0, 4).join(' · ') || '常驻战斗规则';
}

function getDungeonEnvironments(dg, contractLevel) {
  const level = Math.max(0, Math.min(3, Math.floor(contractLevel || 0)));
  if (!dg || level <= 0) return [];
  const count = level >= 3 ? 2 : 1;
  const day = Math.floor(Date.now() / 86400000);
  let seed = ((dg.reqLvl || 1) * 313 + level * 1291 + (day % 100000) * 577) % 2147483647;
  const key = dg.key || '';
  for (let i = 0; i < key.length; i++) seed = (seed * 43 + key.charCodeAt(i)) % 2147483647;
  seed = seed || 1;
  const pool = DUNGEON_ENVIRONMENTS.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length)).map(e => ({ ...e, dungeonEnvironment:true }));
}

const DUNGEON_CATACLYSMS = [
  { key:'moltenFront', name:'熔火前线', icon:'🌋', tags:['fire','forge','dragon','orc'], cdMs:18500, desc:'周期爆发熔火脉冲,造成伤害和灼烧;火焰/熔炉主题敌人更厚。', mod:{ dmgPct:0.052, burnDpsPct:0.012, burnMs:5200, trashHp:0.035, bossDmg:0.030 } },
  { key:'voidCollapse', name:'虚空坍缩', icon:'🌌', tags:['void','oldgod','shadow','ethereal'], cdMs:20500, desc:'虚空周期压缩战场,施加易伤/虚弱并为敌人套相位护盾。', mod:{ dmgPct:0.040, debuff:'vulnerable', debuffMs:5200, shieldPct:0.030, bossHp:0.035 } },
  { key:'stormLattice', name:'风暴矩阵', icon:'⚡', tags:['storm','air','titan','mech'], cdMs:17000, desc:'雷霆链击玩家并燃烧资源;机械/泰坦敌人攻势更快。', mod:{ dmgPct:0.043, drainPct:0.13, silenceMs:1100, trashDmg:0.035, bossDmg:0.025 } },
  { key:'necroticWake', name:'死寒复苏', icon:'💀', tags:['undead','plague','shadow','blood'], cdMs:22000, desc:'死寒压低治疗并周期召来亡者残片;亡灵主题首领生命更高。', mod:{ dmgPct:0.035, debuff:'decay2', debuffMs:5600, summonTheme:'undead', summonHpPct:0.13, bossHp:0.045, trashHp:0.030 } },
  { key:'tidalLock', name:'深潮封锁', icon:'🌊', tags:['water','naga','nature'], cdMs:19000, desc:'潮汐封锁降低攻速并制造寒意护盾,适合拖慢爆发节奏。', mod:{ dmgPct:0.038, debuff:'chill', debuffMs:6200, shieldPct:0.022, trashDef:0.035, bossDef:0.030 } },
  { key:'royalSiege', name:'王庭攻城', icon:'🏹', tags:['fortress','martial','noble','pirate'], cdMs:18000, desc:'箭雨与号令轮流压场,小怪获得攻城协同,首领周期护盾。', mod:{ dmgPct:0.042, shieldPct:0.025, trashDmg:0.040, bossDef:0.025 } },
  { key:'wildBloom', name:'野性疯长', icon:'🌿', tags:['nature','beast','spider','heal'], cdMs:21000, desc:'野性藤蔓持续滋生,治疗敌人并束缚玩家节奏。', mod:{ healPct:0.026, debuff:'root', debuffMs:1700, trashHp:0.045, bossHp:0.030 } },
  { key:'timeFracture', name:'时序裂口', icon:'⏳', tags:['time','arcane','ethereal','mythic'], cdMs:20000, desc:'时间线周期错位,加速敌人并压缩玩家资源窗口。', mod:{ dmgPct:0.034, drainPct:0.11, hastePct:0.18, trashDmg:0.030, bossDmg:0.030 } },
];

function dungeonCataclysmScore(def, tags, text) {
  let score = 0;
  for (const tag of def.tags || []) if (tags.includes(tag)) score += tag === 'mythic' ? 2 : 5;
  if (def.key === 'timeFracture' && tags.includes('time')) score += 4;
  if (def.key === 'moltenFront' && /火|炎|熔|龙|黑石|凤凰/.test(text)) score += 4;
  if (def.key === 'voidCollapse' && /虚空|古神|低语|暗影|梦魇|镜/.test(text)) score += 4;
  if (def.key === 'stormLattice' && /雷|风暴|泰坦|机械|奥丁|电/.test(text)) score += 4;
  if (def.key === 'necroticWake' && /亡|天灾|巫妖|瘟疫|血|墓|骨/.test(text)) score += 4;
  if (def.key === 'tidalLock' && /潮|海|水|娜迦|深渊/.test(text)) score += 4;
  if (def.key === 'royalSiege' && /王|城|要塞|军|港|海盗|攻城/.test(text)) score += 4;
  if (def.key === 'wildBloom' && /兽|蛛|自然|梦境|生命|森林/.test(text)) score += 4;
  return score;
}

function getDungeonCataclysms(dg, contractLevel, opts) {
  if (!dg) return [];
  const mythicLevel = Math.max(0, opts?.mythicLevel || 0);
  const level = Math.max(0, Math.floor(contractLevel || 0));
  if (level <= 0 && mythicLevel <= 0) return [];
  const tags = (typeof dungeonTraitTagsForDungeon === 'function') ? dungeonTraitTagsForDungeon(dg.key) : [];
  if (dg.epic5 && !tags.includes('mythic')) tags.push('mythic');
  const affixes = Array.isArray(opts?.affixes) ? opts.affixes : (typeof getDungeonThemeAffixes === 'function' ? getDungeonThemeAffixes(dg) : []);
  for (const af of affixes) for (const tag of (af.tags || [])) if (!tags.includes(tag)) tags.push(tag);
  const text = [
    dg.name || '', dg.key || '', ...(dg.bosses || []).flatMap(b => [b.name || '', b.emoji || '', ...((b.skills || []).map(s => `${s.name || ''} ${s.desc || ''}`))]),
    ...affixes.map(a => `${a.name || ''} ${a.desc || ''}`)
  ].join(' ');
  const count = mythicLevel >= 15 ? 3 : mythicLevel >= 7 ? 2 : level >= 3 ? 2 : 1;
  const pressure = Math.min(2.6, 1 + level * 0.10 + mythicLevel * 0.045);
  const scored = DUNGEON_CATACLYSMS
    .map(def => ({ def, score:dungeonCataclysmScore(def, tags, text) }))
    .sort((a, b) => b.score - a.score || a.def.key.localeCompare(b.def.key));
  const picked = scored.filter(x => x.score > 0).concat(scored.filter(x => x.score <= 0)).slice(0, Math.min(count, DUNGEON_CATACLYSMS.length));
  return picked.map((x, i) => ({
    ...x.def,
    cataclysm:true,
    pressure:+(pressure + i * 0.08).toFixed(2),
    meta:`灾变×${(pressure + i * 0.08).toFixed(2)}`,
    mod:{ ...(x.def.mod || {}) }
  }));
}

const DUNGEON_COMBAT_ROOMS = [
  { key:'ambushPoint', name:'伏击岔路', icon:'🗡️', tags:['pirate','martial','speed','beast','spider'], desc:'小怪波次有概率额外出现伏击者,开场数秒敌人攻速提高。', mod:{ambushChance:0.45, openerHasteMs:6500, openerHastePct:0.22} },
  { key:'relicCache', name:'失控圣物库', icon:'🔮', tags:['arcane','titan','mech','noble'], desc:'战斗中会出现限时圣物;击破可获得资源和必暴,放任则强化敌人。', mod:{relicTickMs:22000, relicDurationMs:9500} },
  { key:'flameJets', name:'烈焰喷口', icon:'🔥', tags:['fire','forge','dragon'], desc:'地面周期喷火造成伤害,若已被灼烧则额外延长灼烧。', mod:{flameTickMs:10500, flameDamagePct:0.045, burnDpsPct:0.011, burnMs:3800} },
  { key:'bloodAltar', name:'鲜血祭坛', icon:'🩸', tags:['blood','undead','troll','ritual','shadow'], desc:'首领战会出现祭坛;祭坛存活时会周期治疗敌人。', mod:{altarBoss:true, altarTickMs:16000, altarDurationMs:18000, altarHealPct:0.045} },
  { key:'stormConduit', name:'风暴导管', icon:'⚡', tags:['storm','air','titan','mech'], desc:'导管会周期链击玩家;资源较高时额外沉默并燃烧资源。', mod:{stormTickMs:13500, stormDamagePct:0.04, drainPct:0.14, silenceMs:1200} },
  { key:'cursedTreasure', name:'诅咒宝箱', icon:'🎁', tags:['pirate','noble','ethereal','troll'], desc:'部分波次出现宝箱守卫;击败可获得额外金币,但守卫会保护其他敌人。', mod:{treasureEvery:3, guardShieldPct:0.04, bonusGoldPct:0.18} },
  { key:'frostLocks', name:'寒霜锁链', icon:'🧊', tags:['undead','water','naga','fortress'], desc:'周期施加冰缚;玩家被冰缚时敌人获得小护盾。', mod:{frostTickMs:16500, chillMs:5200, shieldPct:0.028} },
  { key:'shadowMaze', name:'暗影迷宫', icon:'🪞', tags:['shadow','void','oldgod','arcane'], desc:'迷宫周期召出幻影,并让玩家短暂易伤或恐惧。', mod:{mazeTickMs:21000, illusionDurationMs:12000, vulnerableMs:4200, fearMs:900} },
  { key:'siegeGallery', name:'攻城长廊', icon:'🏹', tags:['martial','orc','fortress','noble'], desc:'箭雨周期落下,并在小怪波次派出攻城射手。', mod:{arrowTickMs:12000, arrowDamagePct:0.038, shooterChance:0.35} },
  { key:'unstablePortal', name:'不稳定传送门', icon:'🌀', tags:['void','arcane','ethereal','time'], desc:'传送门会把额外敌人拉进战场,也会随机扰动首领施法节奏。', mod:{portalTickMs:24000, portalDurationMs:10000, bossCastJitter:true} },
  { key:'defiasFoundry', name:'迪菲亚铸造间', icon:'⚙️', tags:['pirate','martial','mech','speed'], routeBias:0.25, desc:'矿道工坊会派出攻城射手和宝箱守卫,击败守卫可获得额外金币。', mod:{shooterChance:0.45, treasureEvery:3, guardShieldPct:0.035, bonusGoldPct:0.16} },
  { key:'scarletReliquary', name:'血色圣物厅', icon:'✨', tags:['holy','fortress','noble'], routeBias:0.25, desc:'修道院圣物会在首领战生成祭坛;祭坛存活时周期治疗敌人。', mod:{altarBoss:true, altarTickMs:15000, altarDurationMs:17000, altarHealPct:0.04} },
  { key:'blackrockForge', name:'黑石熔炉线', icon:'🌋', tags:['fire','forge','orc','martial'], routeBias:0.25, desc:'熔炉喷口会周期灼烧玩家,黑铁军械还会派出攻城射手。', mod:{flameTickMs:9800, flameDamagePct:0.046, burnDpsPct:0.012, burnMs:4200, shooterChance:0.28} },
  { key:'trollArena', name:'巨魔竞技台', icon:'🪬', tags:['troll','blood','martial','beast','nature','shadow'], routeBias:0.25, desc:'竞技台开场会提高敌人攻速,并可能派出伏击斗士。', mod:{ambushChance:0.36, openerHasteMs:7600, openerHastePct:0.24, treasureEvery:4, bonusGoldPct:0.12} },
  { key:'necromancyClass', name:'通灵讲堂', icon:'💀', tags:['undead','shadow','blood','plague'], routeBias:0.25, desc:'通灵讲堂会召出迷宫幻影,首领房间还可能立起鲜血祭坛。', mod:{mazeTickMs:20500, illusionDurationMs:12500, vulnerableMs:4600, fearMs:1000, altarBoss:true, altarTickMs:18000, altarHealPct:0.036} },
  { key:'titanRelay', name:'泰坦继电厅', icon:'🔷', tags:['titan','mech','arcane','storm'], routeBias:0.25, desc:'泰坦回路会刷出失控圣物,并用风暴导管周期链击玩家资源。', mod:{relicTickMs:21000, relicDurationMs:9500, stormTickMs:14500, stormDamagePct:0.035, drainPct:0.10, silenceMs:900} },
  { key:'nagaFloodgate', name:'娜迦水闸', icon:'🌊', tags:['naga','water'], routeBias:0.25, desc:'水闸周期施加冰缚并燃烧资源,拖慢战斗节奏。', mod:{frostTickMs:15000, chillMs:5600, shieldPct:0.024, stormTickMs:17000, stormDamagePct:0.028, drainPct:0.09, silenceMs:800} },
  { key:'webbedNest', name:'蛛网巢室', icon:'🕸️', tags:['spider','poison','beast'], routeBias:0.25, desc:'蛛网巢室更容易触发伏击,并在暗影迷宫中制造幻影干扰。', mod:{ambushChance:0.34, openerHasteMs:6200, openerHastePct:0.18, mazeTickMs:23500, illusionDurationMs:10000, vulnerableMs:3600} },
];

const DUNGEON_MECHANIC_CODEX = [
  { key:'interrupt', name:'打断优先', icon:'🔇', desc:'首领存在高价值读条时的处理要求。优先打断沉默、资源燃烧、召唤或范围压制技能,通常比单纯抢伤害更能降低翻车率。' },
  { key:'adds', name:'转火清场', icon:'👥', desc:'首领会召唤援军、机制目标或献祭单位。先清场可以阻止额外读条、护盾、治疗和持续伤害滚雪球。' },
  { key:'defensive', name:'减伤覆盖', icon:'🛡️', desc:'首领有范围爆发、控制链、必暴或高倍率攻击。把减伤、治疗、护盾留给这些窗口,比平均开技能更稳。' },
  { key:'resource', name:'资源管理', icon:'💧', desc:'首领会沉默、燃烧资源或压缩施法窗口。不要把爆发资源全交在点名之前,必要时保留打断和恢复手段。' },
  { key:'purge', name:'破盾压制', icon:'🔷', desc:'首领会获得护盾、治疗或防御强化。爆发期优先压过护盾,拖太久会让后续机制和低血量阶段更危险。' },
  { key:'execute', name:'稳健收尾', icon:'⏱️', desc:'首领低血量后会进入更危险的尾段。保留防御、打断或斩杀爆发,避免最后 30% 被处刑、恐惧或沉默带走。' },
  { key:'clean', name:'治疗清理', icon:'💚', desc:'首领会叠加流血、疾病、腐蚀或其他持续伤害。需要稳定续航和治疗覆盖,不能只看单次爆发伤害。' },
  { key:'bossChallenge', name:'Boss挑战', icon:'🏆', desc:'首领详情里的额外目标。完成后会记录挑战进度,并在通关结算中提高荣誉、精华、金币或额外掉落机会。' },
  { key:'addControl', name:'控场清理', icon:'👥', desc:'击杀首领机制召唤出的援军。它检验你能不能优先处理场面压力,通常出现在会召唤、虫群、军团、血肉或议会主题首领。' },
  { key:'swiftKill', name:'速战速决', icon:'⏱️', desc:'在指定秒数内击败首领。默认窗口为 55 秒,越适合爆发、斩杀和打断循环的角色越容易完成。' },
  { key:'healthyFinish', name:'稳健收尾', icon:'❤️', desc:'击败首领时自身生命不低于指定比例。默认要求 35% 生命,鼓励带减伤、治疗、吸血或护盾来处理尾王终局压力。' },
  { key:'timePulse', name:'时序脉冲', icon:'⏳', desc:'限时挑战超时后的惩罚脉冲。每 15 秒叠加一次压迫,提高后续伤害压力,防止高层契约被拖成无风险磨血。' },
  { key:'timeEdict', name:'时序禁令', icon:'📜', desc:'契约副本抽取的战术禁令。禁令会提高怪物生命、攻击、防御、资源压力、治疗压力或增援概率,并同步提高通关奖励。' },
  { key:'timeMark', name:'时序点名', icon:'🎯', desc:'高压时间线上的定向机制。常见表现为沉默、资源燃烧、易伤、处刑或召唤目标,需要优先打断、转火或用防御技能覆盖。' },
  { key:'alert', name:'契约警戒', icon:'🚨', desc:'契约副本每清一波和击败首领都会提高警戒。警戒越高,后续敌人越强,也更容易出现戒备队长。' },
  { key:'combatRoom', name:'战斗房间', icon:'🎲', desc:'副本路线中的房间规则。每个副本会轮换伏击、圣物库、祭坛、传送门等房间,让同一副本每天有不同处理重点。' },
  { key:'themeAffix', name:'主题压力', icon:'🧭', desc:'每座副本按地图、Boss和资料片主题固定获得的战斗规则。它会提高对应怪物压力,并参与通关奖励修正。' },
  { key:'dungeonTrait', name:'副本印记', icon:'💎', desc:'精良以上副本装备有概率携带的主题词条。高难度来源概率更高,并会优先匹配该副本的地图、怪物和掉落标签。' },
  { key:'firstClear', name:'首通战利品', icon:'🎁', desc:'首次通关副本时的保底奖励。会从尾王掉落池生成一件史诗装备,继承副本来源、装等梯队和副本印记倾向。' },
];

function dungeonMechanicCodex() {
  return DUNGEON_MECHANIC_CODEX.map(x => ({ ...x, dungeonCodex:true }));
}

const DUNGEON_TIME_MARK_TYPES = [
  { key:'resource', name:'资源点名', icon:'💧', fallbackIcon:'spell_shadow_manaburn', desc:'禁令周期性点名玩家并燃烧资源,会压缩自动施法、爆发和治疗窗口。', match:mod => !!mod.drainTickMs },
  { key:'healing', name:'腐蚀点名', icon:'💀', fallbackIcon:'ability_creature_disease_02', desc:'禁令周期性施加腐蚀或毒性持续伤害,通常需要治疗、护盾或更快击杀来覆盖。', match:mod => !!mod.poisonTickMs },
  { key:'mobility', name:'塌方点名', icon:'🪨', fallbackIcon:'spell_nature_earthquake', desc:'禁令周期性制造塌方落石,直接造成生命压力并惩罚拖长战斗。', match:mod => !!mod.ceilingTickMs },
  { key:'pressure', name:'虚弱点名', icon:'🌫️', fallbackIcon:'spell_shadow_mindrot', desc:'禁令周期性让玩家虚弱,在后续承伤窗口里更容易被首领或小怪击穿。', match:mod => !!mod.weakenTickMs },
  { key:'execution', name:'处刑点名', icon:'⏱️', fallbackIcon:'ability_rogue_eviscerate', desc:'首领低血量后周期性触发处刑压力,要求更稳的收尾、防御覆盖或爆发斩杀。', match:mod => !!mod.executePulsePct },
];

function dungeonTimeMarkTypes(edicts) {
  const picked = [];
  const seen = new Set();
  for (const edict of Array.isArray(edicts) ? edicts : []) {
    const mod = edict?.mod || {};
    for (const type of DUNGEON_TIME_MARK_TYPES) {
      if (!seen.has(type.key) && type.match(mod)) {
        picked.push({ ...type, source:edict.name || '战术禁令', timeMark:true });
        seen.add(type.key);
      }
    }
  }
  return picked;
}

function dungeonTimeMarkSummary(edicts, count) {
  const types = dungeonTimeMarkTypes(edicts);
  if (!types.length && !count) return null;
  const codex = dungeonCodexEntry('timeMark') || { name:'时序点名', icon:'🎯', desc:'高压时间线上的定向机制。' };
  const typeText = types.length ? types.map(t => t.name).join(' / ') : '战斗中触发的定向压力';
  return {
    ...codex,
    desc:`${codex.desc || '高压时间线上的定向机制。'} 本次契约包含: ${typeText}。`,
    meta:count ? `${count}次触发` : `${types.length}类`,
    types,
    timeMarkSummary:true,
  };
}

function getDungeonCombatRooms(dg, contractLevel) {
  if (!dg) return [];
  const level = Math.max(0, Math.min(3, Math.floor(contractLevel || 0)));
  const count = level >= 3 ? 3 : (level >= 1 ? 2 : 1);
  const routeTags = (typeof dungeonTraitTagsForDungeon === 'function') ? dungeonTraitTagsForDungeon(dg.key) : [];
  const day = Math.floor(Date.now() / 86400000);
  let seed = ((dg.reqLvl || 1) * 811 + (dg.waves || 1) * 193 + level * 997 + (day % 100000) * 389) % 2147483647;
  const key = dg.key || '';
  for (let i = 0; i < key.length; i++) seed = (seed * 47 + key.charCodeAt(i)) % 2147483647;
  seed = seed || 1;
  const score = room => (room.tags || []).filter(tag => routeTags.includes(tag)).length + (room.routeBias || 0);
  const withRoll = room => {
    seed = (seed * 16807) % 2147483647;
    return { room, score:score(room), roll:seed };
  };
  const preferredEntries = routeTags.length ? DUNGEON_COMBAT_ROOMS.filter(room => score(room) > 0).map(withRoll) : [];
  const preferredKeys = new Set(preferredEntries.map(entry => entry.room.key));
  const genericEntries = DUNGEON_COMBAT_ROOMS.filter(room => !preferredKeys.has(room.key)).map(withRoll);
  const entries = preferredEntries.length ? preferredEntries.concat(genericEntries) : DUNGEON_COMBAT_ROOMS.map(withRoll);
  entries.sort((a, b) => (b.score - a.score) || (a.roll - b.roll));
  return entries.slice(0, Math.min(count, entries.length)).map(({ room:r }) => {
    const matchedTags = (r.tags || []).filter(tag => routeTags.includes(tag));
    return { ...r, matchedTags, routeMatched:matchedTags.length > 0, dungeonCombatRoom:true };
  });
}

const DUNGEON_TACTICAL_EDICTS = (() => {
  const groups = [
    { key:'assault', name:'进攻铁律', icon:'⚔️', mods:i=>({ trashDmg:0.05+i*0.004, bossDmg:0.035+i*0.004 }), variants:['锋刃齐鸣','血线推进','破阵冲锋','无休追击','侧翼合围','狂攻号角','压迫火力','猛击节奏','残酷轮换','终末突袭'] },
    { key:'bulwark', name:'壁垒铁律', icon:'🛡️', mods:i=>({ trashDef:0.08+i*0.004, bossDef:0.06+i*0.004 }), variants:['重甲封门','盾墙常驻','铁壁驻防','坚守阵线','护卫轮班','钉刺甲胄','城墙姿态','硬化甲片','堡垒协议','不屈防线'] },
    { key:'vitality', name:'生命铁律', icon:'🫀', mods:i=>({ trashHp:0.09+i*0.005, bossHp:0.055+i*0.005 }), variants:['厚血军令','血肉增幅','生命税契','强壮守备','不死执念','坚韧骨架','鲜血储备','再生纪律','巨兽化生','耐久演算'] },
    { key:'resource', name:'资源禁令', icon:'💧', mods:i=>({ resourceDrainPct:0.06+i*0.004, drainTickMs:12000-Math.min(3500,i*280) }), variants:['法力漏斗','怒气征税','能量封存','灵泉枯竭','蓝焰回收','施法抽税','奥能逆流','专注瓦解','余烬克扣','源质蒸发'] },
    { key:'healing', name:'治疗禁令', icon:'💀', mods:i=>({ healReduction:0.09+i*0.006, poisonDpsPct:0.009+i*0.001, poisonTickMs:12500-Math.min(3000,i*250) }), variants:['腐毒注入','止血封印','黑血污染','创口诅咒','疫雾漫灌','圣泉枯萎','愈合反噬','生命压价','伤口撕裂','败血律令'] },
    { key:'mobility', name:'机动禁令', icon:'🪨', mods:i=>({ heroSpd:-(0.035+i*0.003), ceilingDamagePct:0.035+i*0.002, ceilingTickMs:15000-Math.min(3200,i*260) }), variants:['沉重地面','锁足碎石','塌方预案','泥沼封路','迟滞力场','狭路压迫','碎阶坠落','重力偏转','铁靴诅咒','断桥行军'] },
    { key:'shield', name:'护盾禁令', icon:'🔷', mods:i=>({ monsterShieldPct:0.025+i*0.003, shieldTickMs:16500-Math.min(3500,i*300) }), variants:['护符轮值','晶壁轮转','蓝盾巡礼','奥术屏障','法阵加固','护盾税契','结界回响','屏障重启','棱镜守卫','壁障灌注'] },
    { key:'reinforce', name:'增援禁令', icon:'🚩', mods:i=>({ edictAddChance:0.10+i*0.01, trashDmg:0.03+i*0.002 }), variants:['哨兵补位','副官巡场','后备队列','战旗召集','伏兵暗号','守门换防','精锐点名','号角响应','执法队列','铁卫加派'] },
    { key:'pressure', name:'压迫禁令', icon:'🌫️', mods:i=>({ takenMult:0.04+i*0.004, weakenTickMs:14500-Math.min(3000,i*250), weakenMs:3500+i*180 }), variants:['恐惧税契','低语审判','心智重压','胆怯扩散','暗雾判令','意志压迫','噩兆回声','绝望队列','黑幕临场','精神勒令'] },
    { key:'execution', name:'处刑禁令', icon:'⏱️', mods:i=>({ bossDmg:0.04+i*0.004, executePulsePct:0.035+i*0.002, executeBelow:0.38 }), variants:['斩杀窗口','终局倒计','残血清算','处刑铃声','灭口协议','断魂号令','收割时刻','终幕压力','濒死追猎','最后审判'] },
  ];
  return groups.flatMap((group, gi) => group.variants.map((variant, vi) => ({
    key:`edict_${group.key}_${vi + 1}`,
    name:`${group.name}·${variant}`,
    icon:group.icon,
    desc:tacticalEdictDesc(group.key, group.name, variant, vi),
    mod:group.mods(vi),
    score:gi * 10 + vi + 1,
    tacticalEdict:true,
  })));
})();

function tacticalEdictDesc(groupKey, groupName, variant, i) {
  const n = i + 1;
  const map = {
    assault:`敌方攻势提高,小怪与首领造成更高伤害。强度 ${n}/10。`,
    bulwark:`敌方防御提高,更难被快速击穿。强度 ${n}/10。`,
    vitality:`敌方生命提高,拉长战斗并放大后续机制压力。强度 ${n}/10。`,
    resource:`周期性燃烧资源,压缩自动施法和爆发窗口。强度 ${n}/10。`,
    healing:`治疗效果降低,并周期性施加毒性持续伤害。强度 ${n}/10。`,
    mobility:`攻击速度降低,并周期性遭遇塌方落石。强度 ${n}/10。`,
    shield:`敌方周期性获得小型护盾,拖慢击杀节奏。强度 ${n}/10。`,
    reinforce:`小怪波次可能出现禁令执法者增援。强度 ${n}/10。`,
    pressure:`受到伤害提高,并周期性陷入虚弱。强度 ${n}/10。`,
    execution:`首领伤害提高,低血量阶段周期性施加处刑压力。强度 ${n}/10。`,
  };
  return map[groupKey] || `${groupName}·${variant}:额外副本规则。`;
}

function getDungeonTacticalEdictCount(contractLevel) {
  const level = Math.max(0, Math.min(3, Math.floor(contractLevel || 0)));
  return level <= 0 ? 0 : (level === 1 ? 2 : (level === 2 ? 3 : 5));
}

function getDungeonTacticalEdicts(dg, contractLevel) {
  const count = getDungeonTacticalEdictCount(contractLevel);
  if (!dg || count <= 0) return [];
  const day = Math.floor(Date.now() / 86400000);
  let seed = ((dg.reqLvl || 1) * 419 + count * 1297 + (day % 100000) * 911) % 2147483647;
  const key = dg.key || '';
  for (let i = 0; i < key.length; i++) seed = (seed * 47 + key.charCodeAt(i)) % 2147483647;
  seed = seed || 1;
  const grouped = {};
  for (const edict of DUNGEON_TACTICAL_EDICTS) {
    const group = edict.key.split('_')[1] || edict.key;
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(edict);
  }
  const groupKeys = Object.keys(grouped);
  for (let i = groupKeys.length - 1; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    [groupKeys[i], groupKeys[j]] = [groupKeys[j], groupKeys[i]];
  }
  const picked = [];
  for (const groupKey of groupKeys) {
    seed = (seed * 16807) % 2147483647;
    const pool = grouped[groupKey];
    picked.push(pool[seed % pool.length]);
    if (picked.length >= count) break;
  }
  return picked.map(e => ({ ...e, mod:{ ...(e.mod || {}) } }));
}

function createDungeonTimer(dg, contractLevel) {
  const level = Math.max(0, Math.min(3, Math.floor(contractLevel || 0)));
  if (!dg || level <= 0) return null;
  const waves = Math.max(1, dg.waves || ((dg.bosses || []).slice(-1)[0]?.wave || 6));
  const perWave = level === 1 ? 38 : (level === 2 ? 34 : 30);
  const raidMult = dg.type === 'raid' ? 1.35 : 1;
  const epicMult = dg.epicRaid ? 1.18 : 1;
  const seconds = Math.max(90, Math.floor((waves * perWave + (dg.reqLvl || 1) * 0.75) * raidMult * epicMult));
  return {
    startedAt: Date.now(),
    limitMs: seconds * 1000,
    rewardMult: 1 + level * 0.06,
    overtimeStacks: 0,
    overtimePulses: 0,
    expired: false,
    onTime: false,
    label: fmtDungeonTimer(seconds),
  };
}

function fmtDungeonTimer(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function dungeonTimerRemaining(ds, now) {
  if (!ds?.timer) return 0;
  return Math.max(0, Math.ceil((ds.timer.startedAt + ds.timer.limitMs - (now || Date.now())) / 1000));
}

function dungeonTimerStatus(ds, now) {
  if (!ds?.timer) return null;
  const remaining = dungeonTimerRemaining(ds, now);
  return {
    remaining,
    text: remaining > 0 ? fmtDungeonTimer(remaining) : `超时+${ds.timer.overtimeStacks || 0}`,
    expired: remaining <= 0 || !!ds.timer.expired,
    rewardMult: ds.timer.rewardMult || 1,
  };
}

const DUNGEON_MULTI_BOSS_MEMBERS = {
  '双子皇帝': [
    { name:'维克尼拉斯大帝', icon:'⚔️', role:'近战皇帝', hp:0.72, atk:0.88, def:1.10 },
    { name:'维克洛尔大帝', icon:'🔮', role:'法术皇帝', hp:0.68, atk:0.82, def:0.92 },
  ],
  '钢铁议会': [
    { name:'断钢者', icon:'⚡', role:'主攻', hp:0.58, atk:0.92, def:1.08 },
    { name:'符文大师莫尔基姆', icon:'🔨', role:'符文防御', hp:0.50, atk:0.72, def:1.16 },
    { name:'唤雷者布隆迪尔', icon:'🌩️', role:'风暴施法', hp:0.46, atk:0.80, def:0.92 },
  ],
  '伊利达雷议会': [
    { name:'击碎者加西奥斯', icon:'🛡️', role:'防护骑士', hp:0.42, atk:0.72, def:1.18 },
    { name:'玛兰德女士', icon:'✨', role:'治疗祭司', hp:0.38, atk:0.58, def:0.96 },
    { name:'高阶灵术师塞勒沃尔', icon:'🔥', role:'法术输出', hp:0.36, atk:0.82, def:0.88 },
    { name:'维尔莱斯·深影', icon:'🗡️', role:'潜行刺客', hp:0.34, atk:0.86, def:0.86 },
  ],
  '鲜血议会': [
    { name:'凯雷塞斯王子', icon:'🧛', role:'暗影王子', hp:0.48, atk:0.76, def:0.98 },
    { name:'塔达拉姆王子', icon:'🔥', role:'火焰王子', hp:0.48, atk:0.82, def:0.94 },
    { name:'瓦拉纳王子', icon:'🍷', role:'鲜血王子', hp:0.52, atk:0.78, def:1.04 },
  ],
  '瓦里奥那与塞拉图斯': [
    { name:'瓦里奥那', icon:'🐲', role:'暮光飞龙', hp:0.76, atk:0.84, def:1.00 },
    { name:'塞拉图斯', icon:'⚡', role:'风暴飞龙', hp:0.72, atk:0.88, def:0.96 },
  ],
  '克拉希克综合体': [
    { name:'虫群卫士希赛克', icon:'🪲', role:'虫群号令', hp:0.40, atk:0.74, def:0.98 },
    { name:'毒心者里卡尔', icon:'☣️', role:'毒性注射', hp:0.38, atk:0.80, def:0.90 },
    { name:'琥珀塑形者科尔凡', icon:'🟡', role:'琥珀护甲', hp:0.44, atk:0.66, def:1.14 },
  ],
  '维克雷斯领主夫妇': [
    { name:'维克雷斯勋爵', icon:'🗡️', role:'德鲁斯特领主', hp:0.74, atk:0.86, def:1.02 },
    { name:'维克雷斯夫人', icon:'🕯️', role:'女巫夫人', hp:0.70, atk:0.82, def:0.94 },
  ],
  '诺库德猎群': [
    { name:'提拉', icon:'🏹', role:'弓骑猎手', hp:0.54, atk:0.86, def:0.92 },
    { name:'马鲁克', icon:'🐎', role:'战矛骑手', hp:0.58, atk:0.82, def:1.08 },
  ],
};

function getDungeonBossCouncilMembers(bossData) {
  if (!bossData || !bossData.name) return [];
  if (DUNGEON_MULTI_BOSS_MEMBERS[bossData.name]) return DUNGEON_MULTI_BOSS_MEMBERS[bossData.name];
  const name = bossData.name || '';
  if (/议会|综合体|猎群/.test(name)) {
    return [
      { name:`${name}·前锋`, icon:bossData.emoji || '⚔️', role:'前锋', hp:0.54, atk:0.84, def:1.02 },
      { name:`${name}·秘术师`, icon:'🔮', role:'秘术', hp:0.46, atk:0.78, def:0.92 },
      { name:`${name}·守卫`, icon:'🛡️', role:'守卫', hp:0.50, atk:0.70, def:1.14 },
    ];
  }
  if (/夫妇|双子|与/.test(name)) {
    const parts = name.includes('与') ? name.split('与').filter(Boolean) : [];
    return [
      { name:parts[0] || `${name}·一`, icon:bossData.emoji || '⚔️', role:'双首领', hp:0.74, atk:0.84, def:1.02 },
      { name:parts[1] || `${name}·二`, icon:'🔮', role:'双首领', hp:0.70, atk:0.84, def:0.98 },
    ];
  }
  return [];
}

const DUNGEON_CONTRACT_TRIALS = [
  { key:'trialPatrol', name:'铁卫巡逻', desc:'非首领战有概率加入一名巡逻增援;小怪攻击+12%。', icon:'🚨', mod:{addPatrol:true, trashDmg:0.12} },
  { key:'trialBulwark', name:'重甲戒严', desc:'小怪防御+18%;首领防御+12%。', icon:'🛡️', mod:{trashDef:0.18, bossDef:0.12} },
  { key:'trialExecution', name:'处决号令', desc:'首领攻击+18%;战斗40秒后首领进入狂暴,额外攻击+35%。', icon:'⏱️', mod:{bossDmg:0.18, bossEnrage:true} },
  { key:'trialSpellbind', name:'咒缚首领', desc:'首领生命+18%,并周期性获得奥术吸收盾。', icon:'🔮', mod:{bossHp:0.18, arcane:true} },
  { key:'trialAshfall', name:'爆裂余烬', desc:'战斗中周期性受到火山伤害;击败怪物后触发崩裂。', icon:'🌋', mod:{volcanic:true, bursting:true} },
  { key:'trialWither', name:'衰败领域', desc:'你的治疗效果降低25%,并周期性承受暗影折磨。', icon:'💀', mod:{healReduction:0.25, afflicted:true} },
  { key:'trialBloodTax', name:'血税追猎', desc:'非首领怪物生命+22%,低生命时更容易暴怒。', icon:'🩸', mod:{trashHp:0.22, raging:true} },
  { key:'trialGale', name:'乱流禁区', desc:'你的攻击速度-10%,首领攻击+10%。', icon:'💨', mod:{heroSpd:-0.10, bossDmg:0.10} },
];

function getDungeonContractTrials(dg, contractLevel) {
  const level = Math.max(0, Math.min(3, Math.floor(contractLevel || 0)));
  if (!dg || level <= 0) return [];
  const count = Math.min(level, DUNGEON_CONTRACT_TRIALS.length);
  const day = Math.floor(Date.now() / 86400000);
  let seed = ((dg.reqLvl || 1) * 193 + level * 1543 + (day % 100000) * 787) % 2147483647;
  const key = dg.key || '';
  for (let i = 0; i < key.length; i++) seed = (seed * 37 + key.charCodeAt(i)) % 2147483647;
  seed = seed || 1;
  const pool = DUNGEON_CONTRACT_TRIALS.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count).map(t => ({ ...t, contractTrial:true }));
}

const DUNGEON_BOSS_PHASE_EVENTS = [
  { key:'phaseShield', name:'壁垒重构', icon:'🛡️', desc:'获得最大生命12%的护盾,并提高防御10秒。', mod:{shieldPct:0.12, defBuffSecs:10, defBuffPct:28} },
  { key:'phaseFrenzy', name:'血怒爆发', icon:'💢', desc:'提高攻击与攻速12秒。', mod:{atkBuffSecs:12, atkBuffPct:34, spdBuffSecs:12, spdBuffPct:24} },
  { key:'phaseGuard', name:'亲卫入场', icon:'🚩', desc:'召唤1名援军,并获得少量护盾。', mod:{summonCount:1, summonTheme:'soldier', shieldPct:0.06} },
  { key:'phaseDecay', name:'腐蚀领域', icon:'🌑', desc:'对你造成一次压迫伤害,并施加凋零。', mod:{phaseDamagePct:0.055, heroDebuff:'decay2', heroDebuffMs:6500} },
  { key:'phaseExecution', name:'处刑宣告', icon:'⚔️', desc:'使你短暂易伤,首领获得暴击强化。', mod:{heroDebuff:'vulnerable', heroDebuffMs:7000, critBuffSecs:10, critBuffPct:45} },
  { key:'phaseLeech', name:'暗血虹吸', icon:'🩸', desc:'首领短时间获得吸血,并燃烧你的资源。', mod:{leechBuffSecs:10, leechBuffPct:24, manaDrainPct:0.18} },
];

function getDungeonBossPhases(dg, bossName, contractLevel) {
  const level = Math.max(0, Math.min(3, Math.floor(contractLevel || 0)));
  if (!dg || !bossName || level <= 0) return [];
  const thresholdsByLevel = {
    1: [0.45],
    2: [0.65, 0.30],
    3: [0.75, 0.45, 0.18],
  };
  const thresholds = thresholdsByLevel[level] || [];
  if (!thresholds.length) return [];
  const day = Math.floor(Date.now() / 86400000);
  let seed = ((dg.reqLvl || 1) * 251 + level * 991 + (day % 100000) * 433) % 2147483647;
  const source = `${dg.key || ''}:${bossName}`;
  for (let i = 0; i < source.length; i++) seed = (seed * 41 + source.charCodeAt(i)) % 2147483647;
  seed = seed || 1;
  const pool = DUNGEON_BOSS_PHASE_EVENTS.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return thresholds.map((threshold, i) => {
    const event = pool[i % pool.length];
    return { ...event, threshold, phaseKey:`${event.key}:${Math.round(threshold * 100)}` };
  });
}

function setDungeonContractLevel(level) {
  if (state.mode !== 'world') { log('请先结束当前战斗再调整副本契约', 'bad'); return; }
  state.dungeonContractLevel = Math.max(0, Math.min(3, Math.floor(Number(level) || 0)));
  const info = dungeonContractInfo(state.dungeonContractLevel);
  log(`${info.icon} 副本契约调整为 [${info.name}]`, state.dungeonContractLevel ? 'legend' : 'info');
  markDirty('dungeon');
}

function dungeonContractRewardMult(ds) {
  const lvl = Math.max(0, Math.min(3, Math.floor(ds?.contractLevel || 0)));
  const edictBonus = Array.isArray(ds?.edicts) ? ds.edicts.length * 0.04 : 0;
  const timerBonus = ds?.timer?.onTime ? (ds.timer.rewardMult || 1) : 1;
  return (dungeonContractInfo(lvl).reward || 1) * (1 + edictBonus) * timerBonus;
}

function dungeonAlertInfo(ds) {
  const contractLevel = Math.max(0, Math.min(3, Math.floor(ds?.contractLevel || 0)));
  const level = Math.max(0, Math.floor(ds?.alertLevel || 0));
  if (!contractLevel || !level) {
    return { level, hp:1, atk:1, def:1, haste:1, eliteChance:0, reward:1, label:'平静' };
  }
  const pressure = level * contractLevel;
  return {
    level,
    hp: 1 + Math.min(0.42, pressure * 0.018),
    atk: 1 + Math.min(0.55, pressure * 0.025),
    def: 1 + Math.min(0.30, pressure * 0.014),
    haste: 1 + Math.min(0.22, pressure * 0.010),
    eliteChance: Math.min(0.42, 0.05 + level * 0.025 + contractLevel * 0.045),
    reward: 1 + Math.min(0.30, pressure * 0.010),
    label: level >= 9 ? '封锁' : level >= 6 ? '戒严' : level >= 3 ? '警戒' : '搜寻',
  };
}

function advanceDungeonAlert(ds, defeatedBoss) {
  if (!ds || state.mode !== 'dungeon') return null;
  const contractLevel = Math.max(0, Math.min(3, Math.floor(ds.contractLevel || 0)));
  if (!contractLevel) return null;
  const gain = defeatedBoss ? 2 : 1;
  ds.alertLevel = Math.min(12, Math.max(0, Math.floor(ds.alertLevel || 0)) + gain);
  ds.maxAlert = Math.max(ds.maxAlert || 0, ds.alertLevel);
  const info = dungeonAlertInfo(ds);
  if (ds.alertLevel === gain || ds.alertLevel % 3 === 0 || defeatedBoss) {
    log(`🚨 副本警戒提升至 ${info.level} (${info.label}): 敌人生命/攻击/防御/速度提高,并可能派出精英守卫`, 'bad');
  }
  return info;
}

function grantDungeonContractChest(dg, ds) {
  const lvl = Math.max(0, Math.min(3, Math.floor(ds?.contractLevel || 0)));
  if (lvl <= 0) return '';
  const info = dungeonContractInfo(lvl);
  const tier = typeof dungeonBountyTier === 'function' ? dungeonBountyTier(dg) : 1;
  const gold = Math.floor((dg.reqLvl || 1) * (35 + lvl * 22) * (1 + tier * 0.12));
  const gem = Math.max(2, lvl * 3 + Math.floor((dg.reqLvl || 1) / 12));
  const essence = Math.max(2, lvl * 2 + Math.floor((dg.reqLvl || 1) / 22));
  state.gold += gold;
  state.gem += gem;
  if (typeof ensureMats === 'function') ensureMats();
  state.essence = (state.essence || 0) + essence;

  const itemLines = [];
  const lastBoss = (dg.bosses || [])[Math.max(0, (dg.bosses || []).length - 1)];
  const itemCount = lvl >= 3 ? 2 : 1;
  for (let i = 0; i < itemCount; i++) {
    const maxRarity = lvl >= 3 && tier >= 4 ? 'legend' : 'epic';
    const minRarity = lvl >= 2 ? 'epic' : 'rare';
    const power = ((typeof dg.powerLvl === 'number' && dg.powerLvl > 0) ? dg.powerLvl : dg.reqLvl) + lvl * 2;
    const it = typeof rollItem === 'function' ? rollItem(maxRarity, power, dg.key, lastBoss ? lastBoss.name : null, { minRarity }) : null;
    if (!it) continue;
    if (lvl >= 2) it.contractForged = true;
    addToInventory(it);
    if (ds?.loot) ds.loot.push(it);
    if (typeof eventsOnItemGet === 'function') eventsOnItemGet(it);
    if (it.rarity === 'legend' && typeof progressionOnLegendary === 'function') progressionOnLegendary();
    itemLines.push(`<div>🎁 契约装备 <span class="${it.cls}">${it.name}${typeof itemEpicRaidBadge==='function'?itemEpicRaidBadge(it,true):''}</span></div>`);
  }

  return `
    <div class="dungeon-contract-clear">
      <div style="font-weight:700">${info.icon} 契约宝箱: ${info.name}</div>
      <div>💰 金币 +${gold} · 💎 钻石 +${gem} · ✨ 精华 +${essence}</div>
      ${itemLines.join('')}
    </div>`;
}

const DUNGEON_BOUNTY_THEMES = [
  {key:'wanted', name:'悬赏首领', icon:'🎯', desc:'击败最终首领后领取额外战利品。'},
  {key:'purge', name:'清剿令', icon:'⚔️', desc:'本日目标副本,通关会追加军需奖励。'},
  {key:'archive', name:'秘藏线索', icon:'📜', desc:'副本深处发现秘藏线索,尾王会掉额外装备。'},
  {key:'expedition', name:'远征委托', icon:'🧭', desc:'远征队正在征集这座副本的通关记录。'},
  {key:'requisition', name:'军需征调', icon:'🏅', desc:'通关后获得金币、荣誉与强化材料。'},
  {key:'riftmark', name:'裂隙追踪', icon:'🌀', desc:'今天这座副本的魔力异常活跃。'},
];

function dungeonBountyResetAt(now) {
  const d = new Date(now || Date.now());
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

function dungeonBountyTier(dg) {
  if (!dg) return 1;
  if (dg.epicRaid) return 5;
  if (dg.type === 'raid') return 4;
  if (dg.epic5) return 3;
  if (dg.heroic) return 2;
  return 1;
}

function dungeonBountyRewardFor(dg) {
  const tier = dungeonBountyTier(dg);
  const lvl = Math.max(1, dg?.reqLvl || 1);
  return {
    gold: Math.floor(lvl * (70 + tier * 35)),
    gem: Math.max(3, Math.floor(lvl / 8) + tier * 4),
    honor: Math.floor(lvl * (6 + tier * 4)),
    essence: Math.max(2, Math.floor(lvl / 18) + tier * 2),
    minRarity: tier >= 2 ? 'epic' : 'rare',
    maxRarity: tier >= 4 ? 'legend' : 'epic',
  };
}

function ensureDungeonBounties(force) {
  if (!state.dungeonBounty) state.dungeonBounty = { resetAt:0, targets:[], claimed:{} };
  const now = Date.now();
  const valid = !force && state.dungeonBounty.resetAt > now && Array.isArray(state.dungeonBounty.targets);
  if (valid && state.dungeonBounty.targets.length) return state.dungeonBounty;

  const resetAt = dungeonBountyResetAt(now);
  const lvl = (typeof playerProgressLevel === 'function') ? playerProgressLevel() : (state.hero?.lvl || 1);
  const all = (typeof DUNGEONS !== 'undefined' ? DUNGEONS : [])
    .filter(dg => dg && lvl >= (dg.reqLvl || 1))
    .sort((a, b) => (b.reqLvl || 0) - (a.reqLvl || 0));
  if (!all.length) {
    state.dungeonBounty = { resetAt, targets:[], claimed:{} };
    return state.dungeonBounty;
  }
  const used = new Set();
  const picks = [];
  const addPick = list => {
    const pool = list.filter(dg => !used.has(dg.key));
    if (!pool.length) return;
    const near = pool.slice(0, Math.min(8, pool.length));
    const dg = near[rng(0, near.length - 1)];
    used.add(dg.key);
    picks.push(dg);
  };

  addPick(all.filter(dg => dg.type !== 'raid' && !dg.heroic && !dg.epic5 && !dg.epicRaid));
  addPick(all.filter(dg => dg.heroic || dg.epic5));
  addPick(all.filter(dg => dg.type === 'raid' && !dg.epicRaid));
  addPick(all.filter(dg => dg.epicRaid));
  while (picks.length < 4 && picks.length < all.length) addPick(all);

  const targets = picks.slice(0, 4).map((dg, idx) => {
    const theme = DUNGEON_BOUNTY_THEMES[(idx + rng(0, DUNGEON_BOUNTY_THEMES.length - 1)) % DUNGEON_BOUNTY_THEMES.length];
    return {
      id: `${resetAt}:${dg.key}`,
      key: dg.key,
      name: dg.name,
      themeKey: theme.key,
      themeName: theme.name,
      icon: theme.icon,
      desc: theme.desc,
      tier: dungeonBountyTier(dg),
      reward: dungeonBountyRewardFor(dg),
    };
  });

  state.dungeonBounty = { resetAt, targets, claimed:{} };
  return state.dungeonBounty;
}

function dungeonBountyTargetFor(dungeonKey) {
  const bounty = ensureDungeonBounties(false);
  if (!bounty || !Array.isArray(bounty.targets)) return null;
  const t = bounty.targets.find(x => x.key === dungeonKey);
  if (!t) return null;
  return Object.assign({ claimed: !!bounty.claimed?.[t.id] }, t);
}

function dungeonBountyRewardText(target) {
  if (!target?.reward) return '';
  const r = target.reward;
  return `💰${r.gold} · 💎${r.gem} · 🏅${r.honor} · ✨${r.essence} · 额外${r.minRarity === 'epic' ? '紫装' : '蓝装'}+`;
}

function dungeonCodexEntry(key) {
  return DUNGEON_MECHANIC_CODEX.find(x => x.key === key);
}

function dungeonClearTipFallbackText(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function dungeonClearInlineTip(item, options) {
  if (typeof inlineTipSpanHtml === 'function') return inlineTipSpanHtml(item, options);
  const cfg = options || {};
  const name = item?.name || cfg.name || '机制';
  const icon = item?.icon || cfg.icon || '⚙️';
  const meta = cfg.meta || item?.meta || '';
  return `<span class="${cfg.className || 'dungeon-inline-tip'}">${dungeonClearTipFallbackText(icon)} ${dungeonClearTipFallbackText(name)}${cfg.metaVisible && meta ? ` · ${dungeonClearTipFallbackText(meta)}` : ''}</span>`;
}

function dungeonClearMetricTip(name, icon, desc, meta, fallbackIcon, color) {
  return dungeonClearInlineTip({ name, icon, desc, meta }, {
    fallbackIcon: fallbackIcon || 'achievement_boss_illidan',
    color: color || '#fde68a',
    metaVisible: !!meta,
  });
}

function dungeonClearCodexTip(key, meta) {
  const entry = dungeonCodexEntry(key) || {};
  return dungeonClearInlineTip({ ...entry, meta }, {
    fallbackIcon: 'inv_misc_book_11',
    color: '#fde68a',
    metaVisible: !!meta,
  });
}

function dungeonBossChallengeMeta(seal) {
  if (!seal) return '';
  const count = `${seal.completed || 0}/${seal.started || 0}`;
  if (seal.key === 'swiftKill' || seal.seconds) return `${count} · ${seal.seconds || 55}秒内击杀`;
  if (seal.key === 'healthyFinish' || seal.hpPct) return `${count} · 收尾生命≥${Math.round((seal.hpPct || 0.35) * 100)}%`;
  if (seal.target) return `${count} · 目标${seal.target}次`;
  return count;
}

function dungeonBossChallengeSealTip(seal) {
  return dungeonClearInlineTip({
    name: seal?.name || 'Boss挑战',
    icon: seal?.icon || '🏆',
    desc: seal?.desc || '首领额外挑战目标。完成后会在通关结算中追加荣誉、金币、钻石或其他奖励。',
    meta: dungeonBossChallengeMeta(seal),
  }, {
    fallbackIcon: 'achievement_bg_killxenemies_generalsroom',
    color: (seal?.completed || 0) > 0 ? '#fde68a' : '#cbd5e1',
    metaVisible: true,
  });
}

function dungeonBountyClearTip(target, rewardText) {
  return dungeonClearInlineTip({
    name: target?.themeName || '副本悬赏',
    icon: target?.icon || '🎯',
    desc: target?.desc || '今日指定副本的额外目标。通关后会追加货币、精华与保底品质装备奖励。',
    meta: rewardText || (target ? dungeonBountyRewardText(target) : ''),
  }, {
    fallbackIcon: 'achievement_bg_kill_flag_carrier',
    color: '#f6c453',
    metaVisible: true,
  });
}

function grantDungeonBountyReward(dg, opts) {
  const target = dungeonBountyTargetFor(dg?.key);
  if (!target || target.claimed) return '';
  if (!state.dungeonBounty.claimed) state.dungeonBounty.claimed = {};
  state.dungeonBounty.claimed[target.id] = true;

  const mythicLevel = Math.max(0, opts?.mythicLevel || 0);
  const mult = mythicLevel ? (1 + Math.min(25, mythicLevel) * 0.04) : 1;
  const r = target.reward || dungeonBountyRewardFor(dg);
  const gold = Math.floor(r.gold * mult);
  const gem = Math.floor(r.gem * (mythicLevel ? 1.15 : 1));
  const honor = Math.floor(r.honor * mult);
  const essence = Math.floor(r.essence * (mythicLevel ? 1.25 : 1));
  state.gold += gold;
  state.gem += gem;
  state.honor += honor;
  if (typeof ensureMats === 'function') ensureMats();
  state.essence = (state.essence || 0) + essence;

  let itemHtml = '';
  const lastBoss = (dg.bosses || [])[Math.max(0, (dg.bosses || []).length - 1)];
  if (typeof rollItem === 'function') {
    const power = ((typeof dg.powerLvl === 'number' && dg.powerLvl > 0) ? dg.powerLvl : dg.reqLvl) + (mythicLevel ? 4 : 2);
    const it = rollItem(r.maxRarity || 'epic', power, dg.key, lastBoss ? lastBoss.name : null, { minRarity:r.minRarity || 'rare' });
    if (it) {
      addToInventory(it);
      if (opts?.loot) opts.loot.push(it);
      if (typeof eventsOnItemGet === 'function') eventsOnItemGet(it);
      if (it.rarity === 'legend' && typeof progressionOnLegendary === 'function') progressionOnLegendary();
      itemHtml = `<div>🎁 额外装备 <span class="${it.cls}">${it.name}${typeof itemEpicRaidBadge==='function'?itemEpicRaidBadge(it,true):''}</span></div>`;
    }
  }

  log(`${target.icon || '🎯'} 完成副本悬赏 [${target.name}]! 💰+${gold} 💎+${gem} ✨+${essence}`, 'legend');
  markDirty('dungeon', 'inventory', 'hero');
  const rewardText = `💰${gold} · 💎${gem} · 🏅${honor} · ✨${essence}`;
  return `
    <div class="dungeon-bounty-clear">
      <div style="font-weight:700">副本悬赏完成: ${dungeonBountyClearTip(target, rewardText)}</div>
      <div>💰 金币 +${gold} · 💎 钻石 +${gem} · 🏅 荣誉 +${honor} · ✨ 精华 +${essence}</div>
      ${itemHtml}
    </div>`;
}

function dungeonRewardPower(dg, bonus) {
  if (!dg) return 1;
  const base = (typeof dg.powerLvl === 'number' && dg.powerLvl > 0) ? dg.powerLvl : (dg.reqLvl || 1);
  return base + (bonus || 0);
}

function grantDungeonFirstClearItem(dg, lastBoss, rarityKey, bonusPower) {
  if (!dg || typeof rollItem !== 'function') return null;
  const bossName = lastBoss ? lastBoss.name : null;
  const power = dungeonRewardPower(dg, bonusPower || 2);
  const item = rollItem(rarityKey || 'epic', power, dg.key, bossName, { minRarity:rarityKey || 'epic' });
  if (!item) return null;
  item.firstClearReward = true;
  addToInventory(item);
  if (typeof eventsOnItemGet === 'function') eventsOnItemGet(item);
  if (item.rarity === 'legend' && typeof progressionOnLegendary === 'function') progressionOnLegendary();
  return item;
}

function onDungeonClear(dg) {
  const dungeonStateSnapshot = state.dungeonState || {};
  if (dungeonStateSnapshot.timer) {
    dungeonStateSnapshot.timer.clearedAt = Date.now();
    dungeonStateSnapshot.timer.onTime = dungeonTimerRemaining(dungeonStateSnapshot, dungeonStateSnapshot.timer.clearedAt) > 0 && !dungeonStateSnapshot.timer.expired;
  }
  const masteryHtml = (typeof progressionOnDungeonClear === 'function') ? (progressionOnDungeonClear(dg.key, { contractLevel:dungeonStateSnapshot.contractLevel || 0 }) || '') : '';
  if (typeof eventsOnDungeonClear === 'function') eventsOnDungeonClear();
  if (typeof relicOnDungeonClear === 'function') relicOnDungeonClear(dg);   // 神器遗物掉落
  if (typeof vaultAdvance === 'function') vaultAdvance('dungeon', 1);       // 每周宝库·探险
  state.dungeonCd[dg.key] = Date.now() + dg.cd * 1000;
  const lastBoss = (dg.bosses||[])[dg.bosses.length-1];
  const finalBossName = lastBoss ? lastBoss.name : '最终首领';

  // 词缀加成:越多词缀通关奖励越高(呼应"越难越值")
  const affixes = (dungeonStateSnapshot && dungeonStateSnapshot.affixes) || [];
  const contractMult = dungeonContractRewardMult(dungeonStateSnapshot);
  const themeGoldMult = 1 + affixes.reduce((sum, a) => sum + (a?.mod?.bonusGoldPct || 0), 0);
  const affixMult = (1 + affixes.length * 0.15) * contractMult * themeGoldMult;

  // 额外通关奖励(小幅上调 + 词缀加成)
  const bonusGold = Math.floor(dg.reqLvl * 60 * affixMult);
  const bonusGem = Math.floor((rng(5, 15) + Math.floor(dg.reqLvl/5)) * affixMult);
  const bonusHonor = Math.floor(dg.reqLvl * 12 * affixMult);
  state.gold += bonusGold;
  state.gem += bonusGem;
  state.honor += bonusHonor;

  // 首通奖励(每角色每本一次性):保底高品装 + 钻石/精华,作为进度目标与收益提升
  if (!state.dungeonFirstClear) state.dungeonFirstClear = {};
  const firstClear = !state.dungeonFirstClear[dg.key];
  let firstClearHtml = '';
  if (firstClear) {
    state.dungeonFirstClear[dg.key] = true;
    const fcGem = 20 + dg.reqLvl;
    const fcEssence = Math.max(3, Math.floor(dg.reqLvl / 6));
    // 首通保底装备改为真实副本来源:优先从尾王掉落池生成,继承副本装等、套装、来源梯队与副本印记倾向。
    const fcItem = grantDungeonFirstClearItem(dg, lastBoss, 'epic', 2);
    let fcLegend = null;
    if ((dg.type === 'raid' || dg.reqLvl >= 70) && Math.random() < 0.12) {
      fcLegend = grantDungeonFirstClearItem(dg, lastBoss, 'legend', 4);
    }
    state.gem += fcGem;
    if (typeof ensureMats === 'function') ensureMats();
    state.essence = (state.essence || 0) + fcEssence;
    firstClearHtml = `
      <div style="margin-top:10px;padding:8px;border:1px solid #f6c453;border-radius:6px;background:rgba(246,196,83,0.08)">
        <div style="color:#f6c453;font-weight:bold">🎉 首次通关奖励</div>
        ${fcItem ? `<div style="font-size:12px">　保底副本紫装 <span class="${fcItem.cls}">${fcItem.name}${typeof itemEpicRaidBadge==='function'?itemEpicRaidBadge(fcItem,true):''}</span>${typeof computeItemLevel==='function'?` · 装等${computeItemLevel(fcItem)}`:''}</div>` : ''}
        ${fcLegend ? `<div style="font-size:12px">　🎉 幸运副本橙装 <span class="${fcLegend.cls}">${fcLegend.name}${typeof itemEpicRaidBadge==='function'?itemEpicRaidBadge(fcLegend,true):''}</span>${typeof computeItemLevel==='function'?` · 装等${computeItemLevel(fcLegend)}`:''}</div>` : ''}
        <div style="font-size:12px">　💎 钻石 +${fcGem} · ✨ 精华 +${fcEssence}</div>
      </div>`;
    log(`🎉 首次通关 ${dg.name}! 获得首通奖励`, 'legend');
  }

  // 全程掉落:每个BOSS击杀时已各掉 1 件其专属池装备(combat.js 里 dungeon BOSS 必掉),这里不再额外补掉落
  const allLoot = (dungeonStateSnapshot?.loot || []).slice();
  // 去重(id重复的去掉)
  const seen = new Set();
  const uniqueLoot = allLoot.filter(it => { const k = it.id; if (seen.has(k)) return false; seen.add(k); return true; });

  const lootHtml = uniqueLoot.length > 0
    ? uniqueLoot.map(it => `<div style="font-size:11px">　<span class="${it.cls}">${it.name}${typeof itemEpicRaidBadge==='function'?itemEpicRaidBadge(it,true):''}</span></div>`).join('')
    : '<div class="muted">　无</div>';

  const affixHtml = affixes.length
    ? `<div class="muted" style="font-size:12px">本次词缀: ${affixes.map(a => dungeonClearInlineTip(a, { fallbackIcon:'spell_holy_powerinfusion', color:'#67e8f9' })).join(' · ')}</div>`
    : '';
  const affixHitHtml = dungeonStateSnapshot?.affixHits
    ? `<div class="muted" style="font-size:12px">${dungeonClearMetricTip('词缀触发', '🧭', '主题压力与副本词缀在本次战斗中实际触发的次数,例如毒雾、护盾、陷阱、资源燃烧或斩杀脉冲。', `${dungeonStateSnapshot.affixHits || 0}次`, 'spell_arcane_starfire', '#67e8f9')} 触发</div>`
    : '';
  const cataclysmHtml = dungeonStateSnapshot?.cataclysms?.length
    ? `<div class="muted" style="font-size:12px">${dungeonClearMetricTip('环境灾变', '🌪️', '副本环境周期性爆发的高压机制,会造成伤害、资源压力、护盾、召唤或治疗。', `${dungeonStateSnapshot.cataclysmHits || 0}次`, 'spell_nature_earthquake', '#fb7185')}: ${dungeonStateSnapshot.cataclysms.map(c => dungeonClearInlineTip(c, { fallbackIcon:'spell_nature_earthquake', color:'#fb7185' })).join(' · ')}</div>`
    : '';
  const contractInfo = dungeonContractInfo(dungeonStateSnapshot?.contractLevel || 0);
  const timerStatus = dungeonStateSnapshot?.timer ? dungeonTimerStatus(dungeonStateSnapshot, dungeonStateSnapshot.timer.clearedAt || Date.now()) : null;
  const timerTip = timerStatus
    ? (timerStatus.expired
      ? dungeonClearCodexTip('timePulse', dungeonStateSnapshot.timer.overtimeStacks ? `${dungeonStateSnapshot.timer.overtimeStacks}层` : '')
      : dungeonClearMetricTip('限时挑战', '⏳', '在限定时间内通关可获得额外奖励;超时后会进入时序脉冲。', timerStatus.text || '', 'inv_misc_pocketwatch_01', '#fde68a'))
    : '';
  const timerHtml = timerStatus
    ? `<div class="muted" style="font-size:12px">${timerTip}: ${dungeonStateSnapshot.timer.onTime ? `达成 · 奖励 ×${(dungeonStateSnapshot.timer.rewardMult || 1).toFixed(2)}` : `超时 · 压迫 ${dungeonStateSnapshot.timer.overtimeStacks || 0}层 · 脉冲 ${dungeonStateSnapshot.timer.overtimePulses || 0}次`}</div>`
    : '';
  const bossMechanicHtml = dungeonStateSnapshot?.bossMechanicsTriggered && !(dungeonStateSnapshot?.contractLevel > 0)
    ? `<div class="muted" style="font-size:12px">${dungeonClearMetricTip('Boss专属机制', '🎭', '首领自带的额外机制,可能包含特殊读条、召唤、区域压力或阶段变化。', `${dungeonStateSnapshot.bossMechanicsTriggered || 0}次`, 'spell_shadow_shadowfury', '#f0abfc')} 触发</div>`
    : '';
  const bossDirectorHtml = dungeonStateSnapshot?.bossDirectorEvents && !(dungeonStateSnapshot?.contractLevel > 0)
    ? `<div class="muted" style="font-size:12px">${dungeonClearMetricTip('Boss流程机制', '🎬', '战斗导演事件,会按节奏插入额外压力,例如点名、召唤、范围压制或爆发窗口。', `${dungeonStateSnapshot.bossDirectorEvents || 0}次`, 'achievement_boss_illidan', '#93c5fd')} 触发</div>`
    : '';
  const bossTacticHtml = dungeonStateSnapshot?.bossTacticEvents && !(dungeonStateSnapshot?.contractLevel > 0)
    ? `<div class="muted" style="font-size:12px">${dungeonClearMetricTip('Boss战术', '🎭', '首领战术事件,通常需要打断、转火、击破目标或用防御覆盖。', `${dungeonStateSnapshot.bossTacticEvents || 0}次`, 'ability_warrior_battleshout', '#fca5a5')} 触发${dungeonStateSnapshot.bossTacticObjectivesBroken ? ` · 战术目标击破 ${dungeonStateSnapshot.bossTacticObjectivesBroken}` : ''}</div>`
    : '';
  const bossWeakpointHtml = dungeonStateSnapshot?.bossWeakpointEvents && !(dungeonStateSnapshot?.contractLevel > 0)
    ? `<div class="muted" style="font-size:12px">${dungeonClearMetricTip('Boss弱点', '💠', '弱点出现后及时击破可制造首领破绽,并记录额外战斗表现。', `${dungeonStateSnapshot.bossWeakpointsBroken || 0}/${dungeonStateSnapshot.bossWeakpointsSpawned || 0}`, 'inv_misc_gem_diamond_02', '#fde68a')} 出现 ${dungeonStateSnapshot.bossWeakpointsSpawned || 0} 次</div>`
    : '';
  const bossChallengeHtml = dungeonStateSnapshot?.bossChallengesStarted && !(dungeonStateSnapshot?.contractLevel > 0)
    ? `<div class="muted" style="font-size:12px">${dungeonClearCodexTip('bossChallenge', `${dungeonStateSnapshot.bossChallengesCompleted || 0}/${dungeonStateSnapshot.bossChallengesStarted || 0}`)} 完成${dungeonStateSnapshot.bossChallengeBonusGold ? ` · 奖励 +${dungeonStateSnapshot.bossChallengeBonusGold}金币` : ''}${dungeonStateSnapshot.bossChallengeBonusGems ? ` · +${dungeonStateSnapshot.bossChallengeBonusGems}钻石` : ''}${dungeonStateSnapshot.bossChallengeSeals ? `<div style="margin-top:4px">${Object.values(dungeonStateSnapshot.bossChallengeSeals).map(dungeonBossChallengeSealTip).join(' · ')}</div>` : ''}</div>`
    : '';
  const bossGrandHtml = dungeonStateSnapshot?.bossGrandMechanicsAssigned && !(dungeonStateSnapshot?.contractLevel > 0)
    ? `<div class="muted" style="font-size:12px">${dungeonClearMetricTip('扩展Boss机制库', '🌌', '大规模首领机制池。每次副本会分配若干项并在战斗中记录实际触发。', `${dungeonStateSnapshot.bossGrandMechanicsTriggered || 0}/${dungeonStateSnapshot.bossGrandMechanicsAssigned || 0}`, 'spell_arcane_arcanetorrent', '#67e8f9')}: 200项</div>`
    : '';
  const roomHtml = dungeonStateSnapshot?.combatRooms?.length
    ? `<div class="muted" style="font-size:12px">${dungeonClearCodexTip('combatRoom', `${dungeonStateSnapshot.roomEvents || 0}次`)}: ${dungeonStateSnapshot.combatRooms.map(r => dungeonClearInlineTip(r, { fallbackIcon:'inv_misc_dice_02', color:'#f9a8d4' })).join(' · ')} · 击破目标 ${dungeonStateSnapshot.roomObjectivesBroken || 0}${dungeonStateSnapshot.roomBonusGold ? ` · 额外金币 +${dungeonStateSnapshot.roomBonusGold}` : ''}</div>`
    : '';
  const timeMarkClearSummary = dungeonTimeMarkSummary(dungeonStateSnapshot?.edicts, dungeonStateSnapshot?.timeMarks || 0);
  const timeMarkClearTip = timeMarkClearSummary
    ? dungeonClearInlineTip(timeMarkClearSummary, {
        fallbackIcon:'achievement_bg_kill_flag_carrier',
        color:'#fca5a5',
        metaVisible:true,
      })
    : '';
  const contractSummaryTags = dungeonStateSnapshot?.contractLevel > 0
    ? [
        dungeonClearMetricTip(`契约:${contractInfo.name}`, contractInfo.icon, contractInfo.desc || '副本契约会提高怪物强度并同步提高通关奖励。', `奖励 ×${contractMult.toFixed(2)}`, 'inv_scroll_03', '#f6c453'),
        dungeonClearCodexTip('alert', `最高 ${dungeonStateSnapshot.maxAlert || dungeonStateSnapshot.alertLevel || 0}`),
        dungeonClearMetricTip('首领阶段', '⚔️', 'Boss 血量跌破指定阈值后触发的阶段事件。', `${dungeonStateSnapshot.bossPhasesTriggered || 0}次`, 'ability_warrior_savageblow', '#fca5a5'),
        dungeonClearMetricTip('Boss机制', '🎭', '首领自带的额外机制触发次数。', `${dungeonStateSnapshot.bossMechanicsTriggered || 0}次`, 'spell_shadow_shadowfury', '#f0abfc'),
        dungeonClearMetricTip('流程机制', '🎬', '战斗导演按节奏插入的额外压力。', `${dungeonStateSnapshot.bossDirectorEvents || 0}次`, 'achievement_boss_illidan', '#93c5fd'),
        dungeonClearMetricTip('Boss战术', '🎭', '需要打断、转火、击破目标或防御覆盖的首领战术。', `${dungeonStateSnapshot.bossTacticEvents || 0}次`, 'ability_warrior_battleshout', '#fca5a5'),
        dungeonClearMetricTip('扩展机制', '🌌', '扩展Boss机制库在本次副本中的实际触发。', `${dungeonStateSnapshot.bossGrandMechanicsTriggered || 0}次`, 'spell_arcane_arcanetorrent', '#67e8f9'),
        dungeonClearMetricTip('弱点击破', '💠', '击破首领弱点的次数。', `${dungeonStateSnapshot.bossWeakpointsBroken || 0}/${dungeonStateSnapshot.bossWeakpointsSpawned || 0}`, 'inv_misc_gem_diamond_02', '#fde68a'),
        dungeonStateSnapshot.bossChallengeSeals
          ? Object.values(dungeonStateSnapshot.bossChallengeSeals).map(dungeonBossChallengeSealTip).join(' · ')
          : dungeonClearCodexTip('bossChallenge', `${dungeonStateSnapshot.bossChallengesCompleted || 0}/${dungeonStateSnapshot.bossChallengesStarted || 0}`),
        dungeonClearCodexTip('combatRoom', `${dungeonStateSnapshot.roomEvents || 0}次`),
        dungeonClearMetricTip('环境触发', '🧭', '契约环境危害在本次副本中的触发次数。', `${dungeonStateSnapshot.environmentHits || 0}次`, 'spell_frost_arcticwinds', '#67e8f9'),
        dungeonClearMetricTip('灾变触发', '🌪️', '环境灾变在本次副本中的爆发次数。', `${dungeonStateSnapshot.cataclysmHits || 0}次`, 'spell_nature_earthquake', '#fb7185'),
        dungeonClearCodexTip('timeEdict', `${dungeonStateSnapshot.edictHits || 0}次`),
        timeMarkClearTip,
        dungeonClearMetricTip('禁令增援', '👥', '战术禁令额外召唤或派出的增援数量。', `${dungeonStateSnapshot.edictAdds || 0}`, 'achievement_bg_killxenemies_generalsroom', '#fcd34d'),
      ].filter(Boolean).join(' · ')
    : '';
  const contractHtml = dungeonStateSnapshot?.contractLevel > 0
    ? `<div class="muted dungeon-clear-mechanics">${contractSummaryTags}</div>`
    : '';
  const contractChestHtml = grantDungeonContractChest(dg, dungeonStateSnapshot);
  const bountyHtml = grantDungeonBountyReward(dg, { loot:uniqueLoot });
  $('dungeon-clear-text').innerHTML = `
    <div style="font-size:18px;margin:8px 0">🏆 ${dg.name} 通关!</div>
    <div class="muted">击败了 ${finalBossName} 等 ${(dg.bosses||[]).length} 名首领</div>
    ${affixHtml}
    ${affixHitHtml}
    ${cataclysmHtml}
    ${contractHtml}
    ${timerHtml}
    ${bossMechanicHtml}
    ${bossDirectorHtml}
    ${bossTacticHtml}
    ${bossWeakpointHtml}
    ${bossChallengeHtml}
    ${bossGrandHtml}
    ${roomHtml}
    <div style="margin:10px 0;text-align:left;font-size:13px">
      <div>💰 金币 +${bonusGold}</div>
      <div>💎 钻石 +${bonusGem}</div>
      <div>🏅 荣誉 +${bonusHonor}</div>
      <div style="margin-top:6px">🎁 本次副本掉落 (${uniqueLoot.length}件):</div>
      ${lootHtml}
    </div>
    ${firstClearHtml}
    ${masteryHtml}
    ${contractChestHtml}
    ${bountyHtml}
  `;
  if (typeof bindInlineTipElements === 'function') bindInlineTipElements($('dungeon-clear-text'));
  $('modal-dungeon-clear').classList.add('show');
  log(`🏆 通关 ${dg.name}! 获得 ${uniqueLoot.length} 件装备`, 'legend');
  leaveDungeon();
}

function showDungeonFail() {
  const ds = state.dungeonState;
  if (!ds) return;
  const dg = DUNGEONS.find(d => d.key === ds.key);
  if (!dg) return;
  const allLoot = ds.loot || [];
  const lootHtml = allLoot.length > 0
    ? allLoot.map(it => `<div style="font-size:11px">　<span class="${it.cls}">${it.name}${typeof itemEpicRaidBadge==='function'?itemEpicRaidBadge(it,true):''}</span></div>`).join('')
    : '<div class="muted">　无</div>';
  $('dungeon-fail-text').innerHTML = `
    <div style="font-size:18px;margin:8px 0">💀 ${dg.name} 挑战失败</div>
    <div class="muted">击败了 ${allLoot.length > 0 ? '部分' : '0名'}首领，已获得:</div>
    <div style="margin:10px 0;text-align:left;font-size:13px">
      ${lootHtml}
    </div>
    <div class="muted" style="margin-top:8px">已获取的装备保留, 返回主城修整后再战!</div>
  `;
  $('modal-dungeon-fail').classList.add('show');
  // 失败也计算CD,防止无限刷前几波BOSS
  if (!state.dungeonCd) state.dungeonCd = {};
  state.dungeonCd[dg.key] = Date.now() + (dg.cd || 600) * 1000;
  log(`💀 副本失败，保留了 ${allLoot.length} 件装备 (冷却已启动)`, 'bad');
  leaveDungeon();
}

/* ---------- 天赋 ---------- */
function buyTalent(treeKey, talentKey) {
  const c = getCls();
  // 专精锁定: 必须先选专精, 且只能点所选专精树
  if (!state.specialization) { log('请先在天赋面板选择一个专精', 'bad'); return; }
  if (treeKey !== state.specialization) { log('只能为当前专精树加点,切换专精可重新分配', 'bad'); return; }
  const tree = c.trees.find(t => t.key === treeKey);
  const t = tree.talents.find(x => x.key === talentKey);
  if (state.talentPoints <= 0) { log('天赋点不足', 'bad'); return; }
  if (!state.talents[treeKey]) state.talents[treeKey] = {};
  const cur = state.talents[treeKey][talentKey] || 0;
  if (cur >= t.max) return;
  if (t.req) {
    const sumInTree = Object.values(state.talents[treeKey]).reduce((a,b)=>a+b, 0);
    if (sumInTree < t.req) { log(`需要在此天赋树投入 ${t.req} 点`, 'bad'); return; }
  }
  state.talents[treeKey][talentKey] = cur + 1;
  state.talentPoints -= 1;
  if (t.unlockSkill && state.talents[treeKey][talentKey] === t.max) {
    state.unlockedSkills[t.unlockSkill] = true;
    log(`✨ 解锁技能 [${c.skills[t.unlockSkill].name}]`, 'good');
    markDirty('skills');
  }
  recomputeStats();
  markDirty('talents', 'hero');
}

function resetTalents() {
  const free = !state.freeRespecUsed;
  if (!free && state.gem < 50) { log('钻石不足', 'bad'); return; }
  if (!confirm(free ? '首次洗点免费,确定重置所有天赋?' : '花费 50💎 重置所有天赋?')) return;
  if (free) state.freeRespecUsed = true; else state.gem -= 50;
  let refunded = 0;
  const c = getCls();
  for (const [treeKey, tals] of Object.entries(state.talents)) {
    for (const [tKey, rank] of Object.entries(tals)) {
      refunded += rank;
      const tree = c.trees.find(t => t.key === treeKey);
      const t = tree.talents.find(x => x.key === tKey);
      if (t && t.unlockSkill) {
        const sk = c.skills[t.unlockSkill];
        if (!sk.unlockLvl) {
          delete state.unlockedSkills[t.unlockSkill];
          state.selectedSkills = state.selectedSkills.filter(s => s !== t.unlockSkill);
        }
      }
    }
  }
  state.talents = {};
  state.talentPoints += refunded;
  recomputeStats();
  markDirty('talents', 'skills', 'hero');
  log(`♻️ 重置天赋,返还 ${refunded} 点`, 'good');
}

/* ---------- 离线收益 ---------- */
function applyOfflineProgress() {
  if (!state.cls) return;
  const now = Date.now();
  // 先完成旅行
  if (state.mode === 'travel' && state.travel) {
    const travelElapsed = now - state.travel.startTime;
    if (travelElapsed >= state.travel.duration) {
      state.mode = 'world';
      state.currentMap = state.travel.mapKey;
      state.currentSubzone = state.travel.subIdx;
      state.travel = null;
    }
  }
  if (state.mode === 'travel') return;
  // 副本/BOSS/世界BOSS 模式不结算离线野外收益(且重置回 world 防止卡死)
  if (state.mode === 'dungeon' || state.mode === 'boss' || state.mode === 'worldboss' || state.mode === 'mythic' || state.mode === 'tower' || state.mode === 'roguelike') {
    state.mode = 'world';
    state.dungeonState = null;
    state.mythicState = null;
    state.towerState = null;
    state._currentWBoss = null;
    state.currentMonsters = [];
  }
  let dt = Math.floor((now - (state.lastTick || now)) / 1000);
  if (dt < 30) return;
  dt = Math.min(dt, 8 * 3600);

  const map = getMap(); if (!map) return;
  const sub = map.sub[state.currentSubzone] || map.sub[0];
  const avgLvl = (sub.lvl[0] + sub.lvl[1]) / 2;
  const monHpAvg = Math.max(10, 100 + avgLvl*avgLvl*6.0);
  const dps = state.hero.atk * state.hero.spd * (1 + state.hero.crit/100 * (state.hero.critd/100 - 1));
  const ttk = Math.max(0.6, monHpAvg / Math.max(1, dps));
  const kills = Math.floor(dt / ttk * 0.7);
  const goldPerKill = Math.floor(3 + avgLvl*1.0);
  const baseXpPerKill = Math.floor(18 + avgLvl*3.0);
  const lvlDiff = state.hero.lvl - avgLvl;
  let xpMult = 1.0;
  if (lvlDiff >= 10) xpMult = 0;
  else if (lvlDiff >= 7) xpMult = 0.2;
  else if (lvlDiff >= 4) xpMult = 0.5;
  const xpPerKill = Math.floor(baseXpPerKill * xpMult);
  const gold = kills * goldPerKill;
  const xp = kills * xpPerKill;
  const drops = Math.floor(kills * 0.18);

  state.gold += gold;
  if (typeof progressionOnGoldGain === 'function') progressionOnGoldGain(gold);
  if (xp > 0) gainXP(xp);
  if (typeof progressionCheckAch === 'function') progressionCheckAch();
  let dropList = [];
  for (let i=0; i<Math.min(drops, 8); i++) {
    const it = rollItem('uncommon', Math.floor(avgLvl));
    if (state.inventory.length < (typeof invCap === 'function' ? invCap() : 60)) { state.inventory.push(it); dropList.push(it); }
    else state.gold += it.sell;
  }
  showOfflineModal(dt, kills, gold, xp, dropList);
}

function showOfflineModal(dt, kills, gold, xp, drops) {
  const h = Math.floor(dt/3600), m = Math.floor((dt%3600)/60), s = dt%60;
  $('offline-text').textContent = `离开了 ${h>0?h+'小时':''}${m}分${s}秒`;
  // 远征军团离线产出(惰性结算后读储备池)
  let expLine = '';
  if (typeof expeditionAdvance === 'function') {
    expeditionAdvance(Date.now());
    const e = account && account.expedition;
    if (e && e.acc) {
      const eg = Math.floor(e.acc.gold || 0), ee = Math.floor(e.acc.essence || 0), em = Math.floor(e.acc.gem || 0);
      if (eg + ee + em > 0) {
        expLine = `<div style="margin-top:8px;border-top:1px dashed var(--border);padding-top:6px">🚩 远征军团已攒下 <b>${fmt(eg)}</b>💰 <b>${ee}</b>🔮 <b>${em}</b>💎 <span class="muted" style="font-size:11px">(到远征页领取)</span></div>`;
      }
    }
  }
  $('offline-loot').innerHTML = `
    <div>⚔️ 击杀 <b>${kills}</b> 只</div>
    <div>💰 +${gold} 金币</div>
    <div>✨ +${xp} 经验</div>
    <div>🎁 ${drops.length} 件装备</div>
    ${drops.slice(0,5).map(it => `<div style="font-size:11px">　<span class="${it.cls}">${it.name}${typeof itemEpicRaidBadge==='function'?itemEpicRaidBadge(it,true):''}</span></div>`).join('')}
    ${expLine}
  `;
  $('modal-offline').classList.add('show');
}

function showLevelUp() {
  const c = getCls();
  $('levelup-text').innerHTML = `
    <div style="font-size:32px">等级${state.hero.lvl}</div>
    <div class="muted" style="margin-top:6px">+5 属性点 · +1 天赋点</div>
    <div class="muted">职业: ${c.name}</div>
  `;
  $('modal-levelup').classList.add('show');
  log(`🎉 升到 等级${state.hero.lvl}!`, 'good');
}

/* ---------- 大秘境 ---------- */
function getLv80Dungeons() {
  return DUNGEONS.filter(d => d.reqLvl >= 80 && !d.epicRaid);
}

/* 大秘境专属传说装备(仅层数奖励获得) */
const MYTHIC_UNIQUE_ITEMS = [
  { name:'秘境征服者之冠', slot:'helmet',  stats:{atkPct:80,hpPct:60,vers:20,crit:10,strPct:15,agiPct:15} },
  { name:'层数突破者之刃', slot:'weapon',  stats:{atkPct:120,critdPct:80,crit:15,spdPct:25,extraAtk:15} },
  { name:'不朽者的壁垒',   slot:'armor',   stats:{defPct:80,hpPct:80,reflectDmg:25,staPct:40,regFlat:20} },
  { name:'光辉追猎者护符', slot:'shoulder',stats:{atkPct:60,spdPct:40,leech:20,mastery:25,critdPct:40} },
  { name:'深渊征服者指环', slot:'ring',    stats:{atkPct:50,critdPct:50,mastery:30,leech:15,vers:15} },
  { name:'秘境行者斗篷',   slot:'belt',    stats:{hpPct:60,defPct:60,vers:20,spdPct:20,strPct:10,agiPct:10} },
  { name:'永恒光辉之握',   slot:'gloves',  stats:{defPct:50,hpPct:50,staPct:40,reflectDmg:15,crit:10} },
  { name:'层数主宰战靴',   slot:'boots',   stats:{spdPct:50,agiPct:40,vers:15,mastery:15,hpPct:30} },
  { name:'秘境圣物',       slot:'trinket', stats:{atkPct:60,critdPct:60,mastery:25,leech:15,extraAtk:10} },
  { name:'大秘之证',       slot:'pants',   stats:{hpPct:60,defPct:50,vers:20,spdPct:15,regFlat:15} },
];

function makeMythicUnique(power) {
  const tpl = choice(MYTHIC_UNIQUE_ITEMS);
  const rarity = RARITY.find(r => r.key === 'legend');
  const id = itemIdSeq++;
  const scale = 1 + power * 0.05;
  const item = {
    id, slot: tpl.slot, name: tpl.name, rarity: 'legend', rarityName: '传说',
    cls: rarity.cls, bcls: rarity.bcls, stats: {}, sell: 5000, mythicUnique: true
  };
  for (const [k, v] of Object.entries(tpl.stats)) {
    item.stats[k] = Math.floor(v * scale);
  }
  // 必定3个T3词缀(最高级,不重复)
  const affixPool = [...AFFIX_POOL];
  item.affixes = [];
  for (let i = 0; i < 3 && affixPool.length > 0; i++) {
    const idx = rng(0, affixPool.length - 1);
    const ax = affixPool.splice(idx, 1)[0];
    const [lo, hi] = ax.tierVals[2];
    item.affixes.push({ key: ax.key, tier: 3, value: +(lo + Math.random()*(hi-lo)).toFixed(1), rerolls: 0 });
  }
  // 必定3个宝石孔
  item.sockets = [];
  for (let i = 0; i < 3; i++) {
    item.sockets.push({ color: choice(SOCKET_COLORS), gem: null });
  }
  return item;
}

/* 大秘境词缀 */
const MYTHIC_AFFIXES = [
  { key:'fortified',  name:'强韧',     desc:'非首领怪物生命+40%',               icon:'🛡️', mod:{trashHp:0.4} },
  { key:'tyrannical', name:'残暴',     desc:'首领生命+30% 伤害+25%',           icon:'👹', mod:{bossHp:0.3, bossDmg:0.25} },
  { key:'bursting',   name:'崩裂',     desc:'击败怪物后对你造成当前生命5%伤害',    icon:'💥', mod:{bursting:true} },
  { key:'sanguine',   name:'血池',     desc:'怪物死亡留下血池,每秒治疗其他怪物3%HP', icon:'🩸', mod:{sanguine:true} },
  { key:'raging',     name:'暴怒',     desc:'怪物HP低于30%时伤害+50%',           icon:'😡', mod:{raging:true} },
  { key:'heArtless',  name:'无心',     desc:'你的治疗效果降低50%',               icon:'💔', mod:{healReduction:0.5} },
  { key:'arcane',     name:'奥术',     desc:'首领每15秒获得一个吸收盾(15%生命)',   icon:'🔮', mod:{arcane:true} },
  { key:'volcanic',   name:'火山',     desc:'战斗中每8秒受到一次火山伤害',         icon:'🌋', mod:{volcanic:true} },
  { key:'ragingWinds',name:'暴风',     desc:'你的攻击速度-15%',                 icon:'💨', mod:{heroSpd:-0.15} },
  { key:'afflicted',  name:'折磨',     desc:'战斗中每5秒受到5%最大HP暗影伤害',     icon:'😈', mod:{afflicted:true} },
];

function getMythicAffixCount(level) {
  if (level <= 1) return 1;
  if (level <= 3) return 2;
  if (level <= 6) return 3;
  if (level <= 10) return 4;
  return Math.min(5, 2 + Math.floor(level / 3));
}

function getMythicAffixes(level) {
  const count = getMythicAffixCount(level);
  const pool = [...MYTHIC_AFFIXES];
  let seed = level * 127 + 31;
  for (let i = pool.length - 1; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

/* 普通副本词缀:按 dungeon key 确定性挑选(每本稳定可识别,不每次随机)。
   低档过滤掉纯惩罚、无对抗手段的词缀;数量随等级/类型递增。复用 MYTHIC_AFFIXES 池与执行机制。 */
function getDungeonAffixes(dg) {
  if (!dg || typeof MYTHIC_AFFIXES === 'undefined') return [];
  const reqLvl = dg.reqLvl || 12;
  const count = reqLvl < 35 ? 1 : (dg.type === 'raid' || reqLvl >= 70) ? 3 : 2;
  let pool = MYTHIC_AFFIXES.slice();
  if (reqLvl < 50) pool = pool.filter(a => !['heArtless', 'ragingWinds'].includes(a.key));
  // 种子 = 当天 + 副本key:每本副本词缀按天刷新(同一天稳定,跨天重洗,避免老是那几个)
  const day = Math.floor(Date.now() / 86400000);
  let seed = (reqLvl * 97 + 13 + (day % 100000) * 1009) % 2147483647;
  const k = dg.key || '';
  for (let i = 0; i < k.length; i++) seed = (seed * 31 + k.charCodeAt(i)) % 2147483647;
  seed = seed || 1;
  for (let i = pool.length - 1; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

/* 大秘境层数阶梯奖励 */
const MYTHIC_TIER_REWARDS = {
  5:  { name:'初窥门径', desc:'大秘境专属传说装备×1',              mod:{uniqueLegend:1} },
  10: { name:'秘境行者', desc:'钻石+50 · 精华+30',                mod:{gem:50, essence:30} },
  15: { name:'大师试炼', desc:'专属传说×2 · 大秘境光辉+1',          mod:{uniqueLegend:2, extraAscend:1} },
  20: { name:'传奇征服', desc:'钻石+100 · 大秘境光辉+2',           mod:{gem:100, extraAscend:2} },
  25: { name:'不朽神话', desc:'专属传说×3 · 大秘境光辉+3',          mod:{uniqueLegend:3, extraAscend:3} },
  30: { name:'诸界毁灭', desc:'钻石+200 · 精华+100 · 大秘境光辉+5', mod:{gem:200, essence:100, extraAscend:5} },
};

/* 层数选择 */
function setMythicSelectLevel(lvl) {
  state.mythicSelectLevel = Math.max(1, Math.min(lvl, state.mythicLevel || 1));
  markDirty('ascend');
}
function changeMythicSelectLevel(delta) {
  setMythicSelectLevel((state.mythicSelectLevel || 1) + delta);
}

function resetMythicTiers() {
  if (!confirm('确定重置大秘境层数奖励领取记录? 重置后重新挑战对应层数即可再次领取。')) return;
  state.mythicTiersClaimed = {};
  state.mythicPendingUnique = {};
  log('🔄 大秘境层数奖励记录已重置', 'info');
  markDirty('ascend');
}

function claimMythicUnique(level) {
  state.mythicPendingUnique = state.mythicPendingUnique || {};
  const count = state.mythicPendingUnique[level] || 0;
  if (count <= 0) { log('没有待领取的专属传说', 'bad'); return; }
  if (state.hero.lvl < 80) { log('需要达到80级才能使用专属传说', 'bad'); return; }
  const power = 85; // lv80+5
  let claimed = 0;
  for (let i = 0; i < count; i++) {
    const uit = makeMythicUnique(power);
    if (uit) {
      addToInventory(uit);
      log(`🌟 领取大秘境专属传说: ${uit.name}`, 'legend');
      if (typeof eventsOnItemGet === 'function') eventsOnItemGet(uit);
      if (typeof progressionOnLegendary === 'function') progressionOnLegendary();
      claimed++;
    }
  }
  state.mythicPendingUnique[level] = 0;
  if (claimed > 0) {
    log(`🎁 成功领取 ${claimed} 件大秘境专属传说!`, 'loot');
    markDirty('inventory', 'ascend');
  }
}

function showAffixTip(e, name, desc) {
  const tip = $('compare-tip');
  tip.querySelector('.compare-head').innerHTML = `<b>${name}</b>`;
  tip.querySelector('.compare-body').innerHTML = desc;
  tip.style.display = 'block';
  positionTip(tip, e);
}
function hideAffixTip() {
  if (typeof _tipPinned !== 'undefined' && _tipPinned) return;
  $('compare-tip').style.display = 'none';
}

function enterMythic() {
  if (state.hero.lvl < 80) { log('需要达到80级才能进入大秘境', 'bad'); return; }
  if (state.mode === 'travel') { log('正在旅行中', 'bad'); return; }
  if (state.mode !== 'world') { log('请先结束当前战斗', 'bad'); return; }
  if (state.tickets < 1) { log('通用券不足', 'bad'); return; }
  const pool = getLv80Dungeons();
  if (pool.length === 0) { log('没有80级副本', 'bad'); return; }
  state.tickets -= 1;
  const dg = pool[rng(0, pool.length - 1)];
  const selLvl = state.mythicSelectLevel || 1;
  const scale = Math.pow(1.2, selLvl);
  const affixes = getMythicAffixes(selLvl);
  const cataclysms = (typeof getDungeonCataclysms === 'function') ? getDungeonCataclysms(dg, 3, { mythicLevel: selLvl, affixes }) : [];
  state.mode = 'mythic';
  state.mythicState = { key: dg.key, wave: 1, loot: [], scale, level: selLvl, affixes, cataclysms,
    lastVolcanic: 0, lastAfflicted: 0, lastArcane: 0 };
  state.hp = state.hero.hpMax;
  state.resource = state.resourceMax;
  if (typeof resetDmgStats === 'function') resetDmgStats();
  if (typeof clearAllBuffs === 'function') clearAllBuffs();
  spawnDungeonMonster();
  const affixStr = affixes.map(a => a.icon + a.name).join(' ');
  const cataclysmStr = cataclysms.length ? ` 灾变: ${cataclysms.map(c => c.icon + c.name).join(' ')}` : '';
  log(`🌟 进入大秘境 +${selLvl} [${dg.name}] (×${scale.toFixed(1)}) 词缀: ${affixStr}`, 'legend');
  if(cataclysmStr) log(`🌪️ 大秘境环境${cataclysmStr}`, 'bad');
  markDirty('ascend', 'stage');
}

function leaveMythic() {
  state.mode = 'world';
  state.mythicState = null;
  spawnMonster();
  markDirty('ascend', 'stage');
}

function onMythicBossKill() {
  const ms = state.mythicState;
  if (!ms) return;
  const dg = DUNGEONS.find(d => d.key === ms.key);
  if (!dg) return;
  const mythicLvl = ms.level || state.mythicLevel || 1;
  const bossList = dg.bosses || [];
  const currentBoss = bossList.find(b => b.wave === ms.wave);
  const bossIdx = bossList.findIndex(b => b.wave === ms.wave);
  const isLastBoss = bossIdx === bossList.length - 1;

  // 精华
  const essence = rng(2 + mythicLvl, 5 + mythicLvl * 2);
  if (typeof ensureMats === 'function') ensureMats();
  state.essence += essence;

  // 宝石
  const gemTier = mythicLvl >= 15 ? 3 : mythicLvl >= 8 ? 2 : 1;
  const gemKey = choice(SOCKET_COLORS) + '_t' + gemTier;
  state.gems[gemKey] = (state.gems[gemKey] || 0) + 1;

  // 装备(尾王保底传说)
  const bossRarity = isLastBoss ? 'legend' : (bossIdx >= Math.floor(bossList.length / 2) ? 'epic' : 'rare');
  const power = ((typeof dg.powerLvl === 'number' && dg.powerLvl > 0) ? dg.powerLvl : dg.reqLvl) + 3;
  const it = rollItem(bossRarity, power, dg.key, currentBoss ? currentBoss.name : null);
  if (it) {
    ms.loot.push(it);
    addToInventory(it);
    if (typeof eventsOnItemGet === 'function') eventsOnItemGet(it);
    if (it.rarity === 'legend' && typeof progressionOnLegendary === 'function') progressionOnLegendary();
  }

  // 金币
  const gold = dg.reqLvl * (20 + mythicLvl * 5);
  state.gold += gold;
  if (typeof progressionOnGoldGain === 'function') progressionOnGoldGain(gold);

  const bossName = currentBoss ? currentBoss.emoji + currentBoss.name : '首领';
  log(`👑 击败 ${bossName}! ✨+${essence} 💎+1 💰+${gold}`, 'legend');
}

function onMythicClear() {
  const ms = state.mythicState;
  if (!ms) return;
  const dg = DUNGEONS.find(d => d.key === ms.key);
  if (!dg) return;
  const clearedLevel = ms.level || state.mythicLevel || 1;
  if (typeof questAdvance === 'function') questAdvance('mythic', 1);
  if (typeof vaultAdvance === 'function') vaultAdvance('mythic', 1);   // 每周宝库·险境
  if (typeof relicOnMythicClear === 'function') relicOnMythicClear(clearedLevel);
  if (typeof mountOnMythicClear === 'function') mountOnMythicClear(clearedLevel);   // 大秘境坐骑
  const masteryHtml = (typeof progressionOnDungeonMasteryClear === 'function')
    ? (progressionOnDungeonMasteryClear(dg.key, { mythicLevel:clearedLevel }) || '')
    : '';
  state.pendingMythicAscend = (state.pendingMythicAscend || 0) + 1;
  let pending = state.pendingMythicAscend;

  // 阶梯奖励
  let tierHtml = '';
  const tierReward = MYTHIC_TIER_REWARDS[clearedLevel];
  if (tierReward && !state.mythicTiersClaimed[clearedLevel]) {
    const r = tierReward;
    if (r.gem) state.gem += r.gem;
    if (r.essence) { if (typeof ensureMats === 'function') ensureMats(); state.essence += r.essence; }
    if (r.extraAscend) { state.pendingMythicAscend += r.extraAscend; pending = state.pendingMythicAscend; }
    if (r.uniqueLegend) {
      state.mythicPendingUnique = state.mythicPendingUnique || {};
      state.mythicPendingUnique[clearedLevel] = (state.mythicPendingUnique[clearedLevel] || 0) + r.uniqueLegend;
    }
    state.mythicTiersClaimed[clearedLevel] = true;
    tierHtml = `<div style="margin-top:8px;padding:8px;background:rgba(251,191,36,0.12);border:1px solid var(--gold);border-radius:6px">
      <div style="color:var(--gold);font-weight:bold">🏆 层数奖励: ${r.name}</div>
      <div style="font-size:12px">${r.desc}${r.uniqueLegend ? ' · <b style="color:var(--accent)">请在面板手动领取专属传说</b>' : ''}</div></div>`;
    log(`🏆 大秘境层数奖励: ${r.name}! ${r.desc}`, 'legend');
  }

  // 仅在通关层数 >= 最高纪录时推进
  if (clearedLevel >= (state.mythicLevel || 1)) {
    state.mythicLevel = clearedLevel + 1;
    state.mythicSelectLevel = state.mythicLevel;
  }

  const allLoot = ms.loot || [];
  const seen = new Set();
  const uniqueLoot = allLoot.filter(it => { const k = it.id; if (seen.has(k)) return false; seen.add(k); return true; });
  const lootHtml = uniqueLoot.length > 0
    ? uniqueLoot.map(it => `<div style="font-size:11px">　<span class="${it.cls}">${it.name}${typeof itemEpicRaidBadge==='function'?itemEpicRaidBadge(it,true):''}${it.mythicUnique?' 🌟':''}</span></div>`).join('')
    : '<div class="muted">　无</div>';
  const cataclysmHtml = ms.cataclysms?.length
    ? `<div class="muted" style="font-size:12px">${dungeonClearMetricTip('环境灾变', '🌪️', '大秘境环境周期性爆发的高压机制,会造成伤害、资源压力、护盾、召唤或治疗。', `${ms.cataclysmHits || 0}次`, 'spell_nature_earthquake', '#fb7185')}: ${ms.cataclysms.map(c => dungeonClearInlineTip(c, { fallbackIcon:'spell_nature_earthquake', color:'#fb7185' })).join(' · ')}</div>`
    : '';

  const gemReward = rng(10, 25);
  const bountyHtml = grantDungeonBountyReward(dg, { mythicLevel:clearedLevel, loot:uniqueLoot });
  $('dungeon-clear-text').innerHTML = `
    <div style="font-size:18px;margin:8px 0">🌟 大秘境 +${clearedLevel} 通关!</div>
    <div class="muted">随机副本: ${dg.name} · 怪物属性 ×${ms.scale.toFixed(1)}</div>
    ${cataclysmHtml}
    <div style="margin:10px 0;text-align:left;font-size:13px">
      <div>🌟 大秘境光辉 +1 (觉醒时获得, 当前累积: ${pending})</div>
      <div>💰 金币 +${dg.reqLvl*80}</div>
      <div>💎 钻石 +${gemReward}</div>
      ${tierHtml}
      <div style="margin-top:6px">🎁 掉落 (${uniqueLoot.length}件):</div>
      ${lootHtml}
      ${masteryHtml}
      ${bountyHtml}
    </div>
  `;
  state.gold += dg.reqLvl * 80;
  state.gem += gemReward;
  if (typeof bindInlineTipElements === 'function') bindInlineTipElements($('dungeon-clear-text'));
  $('modal-dungeon-clear').classList.add('show');
  log(`🌟 大秘境 +${clearedLevel} 通关! 光辉+1 (累积: ${pending})`, 'legend');
  state.mode = 'world';
  state.mythicState = null;
  markDirty('ascend');
  spawnMonster();
}

function onMythicFail() {
  const ms = state.mythicState;
  if (!ms) return;
  const failLevel = ms.level || state.mythicLevel || 1;
  const allLoot = ms.loot || [];
  const lootHtml = allLoot.length > 0
    ? allLoot.map(it => `<div style="font-size:11px">　<span class="${it.cls}">${it.name}${typeof itemEpicRaidBadge==='function'?itemEpicRaidBadge(it,true):''}</span></div>`).join('')
    : '<div class="muted">　无</div>';
  $('dungeon-fail-text').innerHTML = `
    <div style="font-size:18px;margin:8px 0">💀 大秘境 +${failLevel} 失败</div>
    <div style="margin:10px 0;text-align:left;font-size:13px">
      <div class="muted">已获得装备保留, 可重新挑战</div>
      ${lootHtml}
    </div>
  `;
  $('modal-dungeon-fail').classList.add('show');
  log(`💀 大秘境 +${failLevel} 失败, 保留了 ${allLoot.length} 件装备`, 'bad');
  state.mode = 'world';
  state.mythicState = null;
  markDirty('ascend');
}
