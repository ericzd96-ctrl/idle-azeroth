/* =========================================================
   events.js — 世界Boss / 日常任务 / 赛季 三合一
   ----------------------------------------------------------
   - 世界Boss: 阶段守关 + 终局巨型怪物,8h CD,掉橙装碎片+精华
   - 日常: 每日3条随机任务,完成给资源,7连解周宝箱
   - 赛季: 14天一赛季,从战斗中累计积分,段位结算给永久属性+称号
   ========================================================= */

/* ============ 世界Boss / 阶段守关 / 稀有精英 ============ */
const WORLD_BOSSES = [
  { key:'hogger_king', name:'霍格大王', emoji:'🐗', lvl:30, gateLevel:30, minLvl:30, cdHours:0, color:'#b45309',
    desc:'艾尔文与西部荒野交界传说中的豺狼人之王，专门终结轻敌的新兵。',
    hpMul:17, atkMul:2.65, defMul:1.82, rewards:{ gold:1600, gem:8, honor:120, essence:3 } },
  { key:'swamp_tyrant', name:'沼泽暴君·格拉姆', emoji:'🐊', lvl:40, gateLevel:40, minLvl:40, cdHours:0, color:'#15803d',
    desc:'盘踞湿地深沼的远古巨鳄，会把节奏拖入漫长而窒息的泥潭。',
    hpMul:19.5, atkMul:3.02, defMul:2.12, rewards:{ gold:3400, gem:10, honor:180, essence:4 } },
  { key:'blackrock_overlord', name:'黑石霸主·达格兰', emoji:'⛰️', lvl:50, gateLevel:50, minLvl:50, cdHours:0, color:'#b91c1c',
    desc:'黑石山外围的残暴军阀，开始检验装备、减伤与续航是否真正成型。',
    hpMul:22.5, atkMul:3.3, defMul:2.34, rewards:{ gold:6800, gem:12, honor:280, essence:6 } },
  { key:'kazzak_doom', name:'末日领主卡扎克', emoji:'😈', lvl:60, gateLevel:60, minLvl:60, cdHours:0, color:'#dc2626',
    desc:'诅咒之地裂隙中的末日使者，会把中期的数值短板全部放大。',
    hpMul:26, atkMul:3.68, defMul:2.58, rewards:{ gold:12000, gem:16, honor:420, essence:7 } },
  { key:'magtheridon_wrath', name:'深渊之王玛瑟里顿', emoji:'⛓️', lvl:70, gateLevel:70, minLvl:70, cdHours:0, color:'#f97316',
    desc:'被封印的深渊领主余怒未散，专治“普通团本勉强毕业”的冒险者。',
    hpMul:30.5, atkMul:4.08, defMul:2.92, rewards:{ gold:24000, gem:22, honor:700, essence:10 } },
  { key:'sindragosa_shadow', name:'辛达苟萨之影', emoji:'❄️', lvl:79, gateLevel:79, minLvl:79, cdHours:0, color:'#38bdf8',
    desc:'冰冠的霜魂守门者，只有真正成型的角色才能跨过最后一关。',
    hpMul:35.5, atkMul:4.42, defMul:3.28, rewards:{ gold:42000, gem:30, honor:1200, essence:16 } },
  { key:'deathwing', name:'死亡之翼·灭世者', emoji:'🐲', lvl:85, minLvl:80, color:'#dc2626',
    desc:'被腐化的大地守护神，真正的终局世界Boss之一。',
    hpMul:42, atkMul:5.4, defMul:3.8, cdHours:8,
    rewards:{ gold:90000, gem:150, honor:4200, essence:45, shards:10 } },
  { key:'ragnaros', name:'拉格纳罗斯·火焰之王', emoji:'🔥', lvl:85, minLvl:80, color:'#f97316',
    desc:'熔火之心最深处的炎王，普攻和技能都不会再像挠痒痒。',
    hpMul:38, atkMul:5.8, defMul:3.4, cdHours:8,
    rewards:{ gold:82000, gem:130, honor:4000, essence:50, shards:8 } },
  { key:'cthun', name:'克苏恩·疯狂之眼', emoji:'👁️', lvl:85, minLvl:80, color:'#a855f7',
    desc:'希利苏斯旧神低语的本体，拖得越久越容易被机制碾碎。',
    hpMul:46, atkMul:5.1, defMul:4.1, cdHours:8,
    rewards:{ gold:86000, gem:160, honor:4600, essence:40, shards:12 } },
  { key:'yogg_saron', name:'尤格萨隆·千喉之梦', emoji:'🧠', lvl:86, minLvl:80, color:'#8b5cf6',
    desc:'奥杜尔深处的梦魇低语，会用恐惧、镜像与灵魂链接拖垮队伍。',
    hpMul:49, atkMul:5.35, defMul:4.25, cdHours:8,
    rewards:{ gold:94000, gem:170, honor:5000, essence:48, shards:12 } },
  { key:'alakir', name:'奥拉基尔·风暴王座', emoji:'🌪️', lvl:86, minLvl:80, color:'#06b6d4',
    desc:'元素位面的风暴君王，攻速极快，擅长打断与连锁压制。',
    hpMul:44, atkMul:5.75, defMul:3.85, cdHours:8,
    rewards:{ gold:98000, gem:175, honor:5200, essence:50, shards:13 } },
  { key:'lei_shen', name:'雷神·雷霆之王', emoji:'⚡', lvl:88, minLvl:80, color:'#eab308',
    desc:'魔古帝国的暴君归来，闪电、沉默与处刑会连续考验爆发窗口。',
    hpMul:52, atkMul:5.9, defMul:4.4, cdHours:8,
    rewards:{ gold:112000, gem:195, honor:5900, essence:58, shards:15 } },
  { key:'rukhmar', name:'鲁克玛', emoji:'🦅', lvl:89, minLvl:80, color:'#fb923c',
    desc:'阿兰卡峰林天幕下的炽阳巨鸟会用日炎羽流与俯冲重压撕碎阵线,是德拉诺时序线真正该出现的空中王者。',
    hpMul:56, atkMul:6.05, defMul:4.7, cdHours:8,
    rewards:{ gold:128000, gem:220, honor:6400, essence:66, shards:18 } },
  { key:'argus_unmaker', name:'阿古斯·寂灭者', emoji:'🌌', lvl:90, minLvl:80, color:'#6366f1',
    desc:'群星尽头的终极试炼，拥有极高耐久与多段压制机制。',
    hpMul:61, atkMul:6.25, defMul:4.95, cdHours:8,
    rewards:{ gold:150000, gem:260, honor:8200, essence:82, shards:22 } },
  { key:'queen_azshara', name:'阿兹莎拉女王', emoji:'🔱', lvl:91, minLvl:80, color:'#0ea5e9',
    desc:'纳沙塔尔最深处的女王会把潮汐、古神低语与娜迦军势一并压到世界战场,专门惩罚只会站桩输出的终局队伍。',
    hpMul:64, atkMul:6.4, defMul:5.02, cdHours:8,
    rewards:{ gold:162000, gem:278, honor:8600, essence:88, shards:24 } },
  { key:'raszageth_storm', name:'莱萨杰丝·风暴化身', emoji:'🌩️', lvl:92, minLvl:80, color:'#22d3ee',
    desc:'从龙岛风暴中再度醒来的原始化身，用雷霆与飓风撕开守护者的阵线。',
    hpMul:66, atkMul:6.55, defMul:5.1, cdHours:8,
    rewards:{ gold:170000, gem:290, honor:9000, essence:92, shards:25 } },
  { key:'sire_denathrius', name:'主宰者德纳修斯', emoji:'🩸', lvl:93, minLvl:80, color:'#be123c',
    desc:'纳斯利亚堡的主宰者会把罪碑、夜宴与石裔军势直接搬进野外,让终局角色也得认真处理每个读条窗口。',
    hpMul:71, atkMul:6.82, defMul:5.42, cdHours:8,
    rewards:{ gold:188000, gem:318, honor:9800, essence:102, shards:28 } },
  { key:'xal_atath', name:'虚空先驱萨拉塔斯', emoji:'🕸️', lvl:96, minLvl:80, color:'#7c3aed',
    desc:'黑血与虚空丝线背后的低语者,会把蛛魔王宫的终局压迫带到世界战场。',
    hpMul:78, atkMul:7.15, defMul:5.85, cdHours:8,
    rewards:{ gold:230000, gem:360, honor:11200, essence:125, shards:32 } },
  { key:'reshanor', name:'雷沙诺尔·无缚者', emoji:'🧿', lvl:100, minLvl:82, color:'#38bdf8',
    desc:'卡雷什相位风暴中的新世界Boss,不羁能量会把终局角色的续航与打断窗口一起压到极限。',
    hpMul:88, atkMul:7.85, defMul:6.25, cdHours:8,
    rewards:{ gold:280000, gem:420, honor:12800, essence:150, shards:40 } },
  { key:'shadowpoint_vexis', name:'影点总督维克席斯', emoji:'🌑', lvl:102, minLvl:90, color:'#8b5cf6',
    desc:'Shadow Point 的裂隙总督把轨道炮列和影卫誓约都搬上了世界战场,专门拦截试图深入卡雷什的终局队伍。',
    hpMul:95, atkMul:8.2, defMul:6.65, cdHours:8,
    rewards:{ gold:330000, gem:480, honor:14200, essence:172, shards:46 } },
  { key:'shandorah_astromancer', name:'群星占相者诺维萨', emoji:'🌠', lvl:104, minLvl:94, color:'#60a5fa',
    desc:'沙恩多拉最高阶的占星师能把整片裂空天幕压缩成武器,是卡雷什终局事件线新的硬门槛。',
    hpMul:104, atkMul:8.55, defMul:7.05, cdHours:8,
    rewards:{ gold:390000, gem:560, honor:15800, essence:195, shards:54 } },
];
for (const wb of WORLD_BOSSES) {
  const profile = (typeof WORLD_BOSS_SKILLSETS === 'object' && WORLD_BOSS_SKILLSETS[wb.key]) || null;
  if (profile) Object.assign(wb, profile);
}
const WBOSS_CD_HOURS = 8;
const SHARD_EXCHANGE_COST = 50; // 50 碎片 = 1 自选橙装
const APEX_MARK_EXCHANGE_COST = 120;
const WORLD_BOSS_CONTRACTS = [
  { level:0, name:'常规猎杀', icon:'📘', desc:'标准终局世界Boss现在也会带基础噩梦戒律、三段血线和战斗压迫。', hp:1, atk:1, def:1, reward:1, marks:0 },
  { level:1, name:'裂隙猎令', icon:'📕', desc:'世界Boss生命+36%、攻击+24%、防御+14%;噩梦戒律与阶段进一步加密,奖励+28%。', hp:1.36, atk:1.24, def:1.14, reward:1.28, marks:12 },
  { level:2, name:'群星军律', icon:'📙', desc:'世界Boss生命+78%、攻击+48%、防御+28%;追加更多噩梦戒律、阶段与压迫,奖励+62%。', hp:1.78, atk:1.48, def:1.28, reward:1.62, marks:22 },
  { level:3, name:'吞界悬令', icon:'📓', desc:'世界Boss生命+135%、攻击+76%、防御+46%;五条戒律、多段血线与极速压迫,奖励+115%。', hp:2.35, atk:1.76, def:1.46, reward:2.15, marks:36 },
];
const WORLD_BOSS_ASSAULTS = [
  { key:'riftDrain', name:'裂隙抽离', icon:'🌀', desc:'每11秒燃烧 14% 最大资源。', mod:{ drainTickMs:11000, resourceDrainPct:0.14 } },
  { key:'starfall', name:'碎星雨幕', icon:'🌠', desc:'每13秒落下坠星,造成最大生命 6% 伤害并短暂震荡。', mod:{ ceilingTickMs:13000, ceilingDamagePct:0.06, stunMs:650 } },
  { key:'voidMiasma', name:'虚空瘴雾', icon:'☣️', desc:'每10.5秒施加侵蚀,持续造成伤害。', mod:{ poisonTickMs:10500, poisonDpsPct:0.017, poisonMs:4200 } },
  { key:'wardPulse', name:'棱界护壁', icon:'🔷', desc:'世界Boss每15秒获得护盾。', mod:{ shieldTickMs:15000, monsterShieldPct:0.05 } },
  { key:'dreadEdict', name:'惧意军律', icon:'🌫️', desc:'每12秒施加虚弱。', mod:{ weakenTickMs:12000, weakenMs:5000 } },
  { key:'execution', name:'终局清算', icon:'⚔️', desc:'Boss 在 35% 生命以下时会周期性施加处刑脉冲。', mod:{ executePulsePct:0.045, executeBelow:0.35 } },
  { key:'nightmareSunder', name:'噩梦破甲', icon:'🩸', desc:'每14秒撕开防线,造成最大生命 5.5% 伤害并施加易伤。', mod:{ ceilingTickMs:14000, ceilingDamagePct:0.055, heroDebuff:'vulnerable', heroDebuffMs:5200 } },
  { key:'commandLock', name:'统御封锁', icon:'🔒', desc:'每16秒短暂沉默并抽取资源,打断治疗与爆发节奏。', mod:{ silenceTickMs:16000, silenceMs:1300, drainTickMs:16000, resourceDrainPct:0.10 } },
];
const WORLD_BOSS_PHASE_EVENTS = [
  { key:'phaseShield', name:'壁垒重构', icon:'🛡️', desc:'获得最大生命 10% 护盾并提高防御。', mod:{ shieldPct:0.10, defBuffSecs:10, defBuffPct:26 } },
  { key:'phaseFrenzy', name:'狂怒升格', icon:'💢', desc:'提高攻击与攻速 12 秒。', mod:{ atkBuffSecs:12, atkBuffPct:32, spdBuffSecs:12, spdBuffPct:22 } },
  { key:'phaseGuard', name:'裂隙亲卫', icon:'🚩', desc:'召唤 1 名援军并获得少量护盾。', mod:{ summonCount:1, summonTheme:'soldier', shieldPct:0.05 } },
  { key:'phaseDecay', name:'坍缩领域', icon:'🌑', desc:'对玩家造成一次压迫伤害并施加凋零。', mod:{ phaseDamagePct:0.05, heroDebuff:'decay2', heroDebuffMs:6500 } },
  { key:'phaseExecution', name:'终幕宣告', icon:'⚔️', desc:'使玩家短暂易伤,并强化 Boss 暴击。', mod:{ heroDebuff:'vulnerable', heroDebuffMs:7000, critBuffSecs:10, critBuffPct:42 } },
  { key:'phaseLeech', name:'暗血虹吸', icon:'🩸', desc:'Boss 获得吸血,并燃烧玩家资源。', mod:{ leechBuffSecs:10, leechBuffPct:22, manaDrainPct:0.16 } },
  { key:'phaseDoomGuard', name:'噩梦亲卫', icon:'👁️', desc:'召唤 2 名援军,并获得护盾与减伤。', mod:{ summonCount:2, summonTheme:'void', shieldPct:0.08, drBuffSecs:9, drBuffPct:0.24 } },
  { key:'phaseWorldbreak', name:'灭团压境', icon:'💥', desc:'造成高额压迫伤害,并短暂削弱玩家输出。', mod:{ phaseDamagePct:0.075, heroDebuff:'weaken', heroDebuffMs:7200 } },
];

/* 世界Boss 累计击杀里程碑(per-char,达标一次性奖励) */
const WBOSS_KILL_MILESTONES = [
  { n:5,   reward:{ gem:20,  essence:15 } },
  { n:15,  reward:{ gem:50,  essence:40,  shards:5 } },
  { n:30,  reward:{ gem:120, essence:80,  shards:10 }, title:'屠龙者' },
  { n:60,  reward:{ gem:300, essence:150, shards:20 }, title:'世界Boss征服者' },
  { n:100, reward:{ gem:600, essence:300, shards:30 } },
  { n:150, reward:{ gem:900, essence:450, shards:45 }, title:'终局讨伐者' },
  { n:250, reward:{ gem:1600, essence:800, shards:80 }, title:'群星征服者' },
];
function worldBossCheckKillMilestone() {
  if (!state.worldBoss.killMs) state.worldBoss.killMs = {};
  const total = state.worldBoss.totalKilled || 0;
  for (const m of WBOSS_KILL_MILESTONES) {
    if (total >= m.n && !state.worldBoss.killMs[m.n]) {
      state.worldBoss.killMs[m.n] = true;
      const r = m.reward || {};
      if (r.gem) state.gem += r.gem;
      if (r.essence) state.essence += r.essence;
      if (r.shards) state.worldBoss.shards = (state.worldBoss.shards || 0) + r.shards;
      if (m.title && typeof unlockTitle === 'function') unlockTitle(m.title);
      const parts = [];
      if (r.gem) parts.push(r.gem + '💎'); if (r.essence) parts.push(r.essence + '✨');
      if (r.shards) parts.push(r.shards + '🧩'); if (m.title) parts.push(`称号「${m.title}」`);
      log(`🏆 世界Boss 累计击杀 ${m.n} 次里程碑! ${parts.join(' ')}`, 'legend');
    }
  }
}

function ensureEventState() {
  if (!state.worldBoss) state.worldBoss = { lastKill:{}, shards:0, totalKilled:0, stageClears:{}, rareKills:{} };
  if (!state.worldBoss.lastKill) state.worldBoss.lastKill = {};
  if (!state.worldBoss.stageClears) state.worldBoss.stageClears = {};
  if (!state.worldBoss.rareKills) state.worldBoss.rareKills = {};
  if (typeof state.worldBoss.shards !== 'number') state.worldBoss.shards = 0;
  if (typeof state.worldBoss.totalKilled !== 'number') state.worldBoss.totalKilled = 0;
  if (typeof state.worldBoss.contractLevel !== 'number') state.worldBoss.contractLevel = 0;
  if (typeof state.worldBoss.apexMarks !== 'number') state.worldBoss.apexMarks = 0;
  if (!state.worldBoss.activeEncounter) state.worldBoss.activeEncounter = null;
  if (!state.daily) state.daily = { resetAt:0, tasks:[], weekStreak:0, weeklyClaimedAt:0 };
  if (!state.eventsCounters) state.eventsCounters = { itemsRare:0, sessionGold:0, sessionKills:0, sessionDungeons:0 };
  // 赛季已搬到 account, 用 ensureSeason()
}

function getWorldBossDef(key) {
  return WORLD_BOSSES.find(b => b.key === key) || null;
}
function isStageWorldBoss(wb) {
  return !!(wb && wb.gateLevel);
}
function isApexWorldBoss(wb) {
  return !!(wb && !wb.gateLevel);
}
function trialWorldBosses() {
  return WORLD_BOSSES.filter(isStageWorldBoss).sort((a, b) => a.gateLevel - b.gateLevel);
}
function worldBossCooldownMs(wb) {
  const hours = Math.max(0, wb?.cdHours == null ? WBOSS_CD_HOURS : wb.cdHours);
  return Math.floor(hours * 3600 * 1000);
}
function worldBossMinLevel(wb) {
  return wb?.minLvl || Math.max(1, (wb?.lvl || 1) - 5);
}
function worldBossAccessLevel() {
  return (typeof playerProgressLevel === 'function') ? playerProgressLevel() : (state.hero.lvl || 1);
}
function worldBossMeetsReq(wb) {
  return worldBossAccessLevel() >= worldBossMinLevel(wb);
}
function worldBossReqLabel(wb) {
  if (typeof contentReqLabel === 'function') return contentReqLabel(worldBossMinLevel(wb));
  return `Lv.${worldBossMinLevel(wb)}`;
}
function worldBossContractLevel() {
  ensureEventState();
  return Math.max(0, Math.min(3, Math.floor(state.worldBoss.contractLevel || 0)));
}
function worldBossContractInfo(level) {
  return WORLD_BOSS_CONTRACTS[Math.max(0, Math.min(3, Math.floor(level || 0)))] || WORLD_BOSS_CONTRACTS[0];
}
function setWorldBossContractLevel(level) {
  ensureEventState();
  if (state.mode !== 'world') { log('请先结束当前战斗再调整世界Boss猎令', 'bad'); return; }
  state.worldBoss.contractLevel = Math.max(0, Math.min(3, Math.floor(Number(level) || 0)));
  const info = worldBossContractInfo(state.worldBoss.contractLevel);
  log(`${info.icon} 世界Boss猎令调整为 [${info.name}]`, state.worldBoss.contractLevel ? 'legend' : 'info');
  markDirty('events');
}
function getWorldBossAssaults(wb, contractLevel) {
  const level = Math.max(0, Math.min(3, Math.floor(contractLevel || 0)));
  if (!wb || !isApexWorldBoss(wb)) return [];
  const count = Math.min(WORLD_BOSS_ASSAULTS.length, 2 + level);
  const day = Math.floor(Date.now() / 86400000);
  let seed = ((wb.lvl || 1) * 613 + level * 1231 + (day % 100000) * 421) % 2147483647;
  const source = wb.key || '';
  for (let i = 0; i < source.length; i++) seed = (seed * 43 + source.charCodeAt(i)) % 2147483647;
  seed = seed || 1;
  const pool = WORLD_BOSS_ASSAULTS.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count).map(a => ({ ...a, mod:{ ...(a.mod || {}) } }));
}
function getWorldBossPhaseEvents(wb, contractLevel) {
  const level = Math.max(0, Math.min(3, Math.floor(contractLevel || 0)));
  if (!wb || !isApexWorldBoss(wb)) return [];
  const thresholdsByLevel = {
    0: [0.76, 0.48, 0.20],
    1: [0.82, 0.56, 0.28],
    2: [0.88, 0.68, 0.42, 0.18],
    3: [0.90, 0.74, 0.56, 0.34, 0.14],
  };
  const thresholds = thresholdsByLevel[level] || [];
  const day = Math.floor(Date.now() / 86400000);
  let seed = ((wb.lvl || 1) * 251 + level * 991 + (day % 100000) * 433) % 2147483647;
  const source = `${wb.key || ''}:${wb.name || ''}`;
  for (let i = 0; i < source.length; i++) seed = (seed * 41 + source.charCodeAt(i)) % 2147483647;
  seed = seed || 1;
  const pool = WORLD_BOSS_PHASE_EVENTS.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return thresholds.map((threshold, i) => {
    const event = pool[i % pool.length];
    return { ...event, threshold, phaseKey:`wb:${wb.key}:${event.key}:${Math.round(threshold * 100)}` };
  });
}
function createWorldBossEncounter(wb) {
  if (!wb || !isApexWorldBoss(wb)) return null;
  const contractLevel = worldBossContractLevel();
  const contract = worldBossContractInfo(contractLevel);
  const assaults = getWorldBossAssaults(wb, contractLevel);
  const phases = getWorldBossPhaseEvents(wb, contractLevel);
  return {
    key: wb.key,
    contractLevel,
    nightmareLevel: 1 + contractLevel,
    contract,
    assaults,
    phases,
    pressure: 0,
    maxPressure: 0,
    assaultHits: 0,
    bossPhasesTriggered: 0,
    lastPressureAt: Date.now(),
    startAt: Date.now(),
  };
}
function worldBossEncounterRewardMult(encounter, includePressure=true) {
  if (!encounter || !encounter.contractLevel) return 1;
  const assaultBonus = (encounter.assaults?.length || 0) * 0.04;
  const pressureBonus = includePressure ? Math.min(0.24, (encounter.maxPressure || encounter.pressure || 0) * 0.02) : 0;
  return (encounter.contract?.reward || 1) * (1 + assaultBonus + pressureBonus);
}
function worldBossEncounterMarkGain(wb, encounter) {
  if (!wb || !encounter || !encounter.contractLevel) return 0;
  const base = encounter.contract?.marks || 0;
  const lvlBonus = Math.max(0, Math.floor(((wb.lvl || 80) - 80) / 2));
  const assaultBonus = (encounter.assaults?.length || 0) * 4;
  const pressureBonus = Math.max(0, encounter.maxPressure || 0);
  return Math.max(8, base + lvlBonus + assaultBonus + pressureBonus);
}
function worldBossStageCleared(wb) {
  ensureEventState();
  return !!(wb && isStageWorldBoss(wb) && state.worldBoss.stageClears[wb.key]);
}
function currentXpGate() {
  ensureEventState();
  for (const wb of trialWorldBosses()) {
    if (state.hero.lvl >= wb.gateLevel && !worldBossStageCleared(wb)) {
      return { key: wb.key, level: wb.gateLevel, name: wb.name, boss: wb };
    }
  }
  return null;
}

// 世界Boss强度系数:守关Boss轻度增强;终局Boss必须高于同级史诗团本尾王。
const WORLD_BOSS_STAGE_HP_BUFF = 2.55;
const WORLD_BOSS_STAGE_ATK_BUFF = 1.20;
const WORLD_BOSS_STAGE_DEF_BUFF = 1.08;
const WORLD_BOSS_APEX_HP_BUFF = 10.2;
const WORLD_BOSS_APEX_ATK_BUFF = 5.9;
const WORLD_BOSS_APEX_DEF_BUFF = 2.35;
function buildWorldBossMonsterData(wb) {
  const boss = wb || {};
  const encounter = state.worldBoss?.activeEncounter && state.worldBoss.activeEncounter.key === boss.key
    ? state.worldBoss.activeEncounter
    : null;
  const contract = encounter?.contract || worldBossContractInfo(0);
  const rewardMult = worldBossEncounterRewardMult(encounter, false);
  const apex = isApexWorldBoss(boss);
  const hpBuff = apex ? WORLD_BOSS_APEX_HP_BUFF : WORLD_BOSS_STAGE_HP_BUFF;
  const atkBuff = apex ? WORLD_BOSS_APEX_ATK_BUFF : WORLD_BOSS_STAGE_ATK_BUFF;
  const defBuff = apex ? WORLD_BOSS_APEX_DEF_BUFF : WORLD_BOSS_STAGE_DEF_BUFF;
  const levelCurve = apex ? (1 + Math.max(0, (boss.lvl || 80) - 80) * 0.018) : (1 + Math.max(0, (boss.lvl || 30) - 30) * 0.006);
  const hpBase = apex ? (100 + boss.lvl * boss.lvl * 8.8) : (100 + boss.lvl * boss.lvl * 6.0);
  const atkBase = apex ? (12 + boss.lvl * 3.7 + Math.pow(boss.lvl || 1, 1.16) * 1.35) : (8 + boss.lvl * 3.0);
  const defBase = apex ? (4 + boss.lvl * 1.7) : (3 + boss.lvl * 1.3);
  const baseHp = Math.floor(hpBase * (boss.hpMul || 1) * hpBuff * levelCurve * (contract.hp || 1));
  const baseAtk = Math.floor(atkBase * (boss.atkMul || 1) * atkBuff * (apex ? levelCurve : 1) * (contract.atk || 1));
  const def = Math.floor(defBase * (boss.defMul || 1) * defBuff * (contract.def || 1));
  const supportCount = (boss.supportCount || 4) + (encounter?.contractLevel || 0);
  return {
    name: boss.emoji + boss.name,
    bossName: boss.name,
    isBoss: true,
    isWorldBoss: true,
    wbKey: boss.key,
    _uid: Date.now() + Math.floor(Math.random() * 1000),
    lvl: boss.lvl,
    hpMax: baseHp,
    hp: baseHp,
    atk: Math.floor(baseAtk * (1 + (boss.passive?.atkBonus || 0))),
    def,
    baseGold: Math.max(1, Math.floor((boss.rewards?.gold || 1) / 30) * rewardMult),
    baseXp: isStageWorldBoss(boss) ? Math.max(180, boss.lvl * 16) : 300,
    goldReward: Math.floor((boss.rewards?.gold || 0) * rewardMult),
    honorReward: Math.floor((boss.rewards?.honor || 0) * rewardMult),
    dropRate: isApexWorldBoss(boss) ? 1.0 : 0.9,
    gemChance: 0,
    maxRarity: isApexWorldBoss(boss) ? 'legend' : (boss.lvl >= 50 ? 'epic' : 'rare'),
    _dots: {},
    _dotLegacyImported: true,
    _lastDotTick: 0,
    dodgeChance: boss.passive?.dodgeChance || (apex ? 0.14 : 0.08),
    critChance: boss.passive?.critChance || (apex ? 0.30 : 0.18),
    dmgReduction: boss.passive?.dmgReduction || (apex ? 0.42 : 0.2),
    lifeSteal: boss.passive?.leech || 0,
    stunChance: boss.passive?.stunChance || 0,
    instantCast: boss.instantCast !== undefined ? !!boss.instantCast : true,
    instantCastChance: typeof boss.instantCastChance === 'number' ? boss.instantCastChance : undefined,
    atkInterval: Math.max(apex ? 680 : 860, (boss.atkInterval || (apex ? 980 : boss.lvl >= 70 ? 1225 : 1325)) - (encounter?.nightmareLevel || encounter?.contractLevel || 0) * 45),
    _monSkills: [],
    _monSkill: null,
    _monSupportSkills: typeof buildMonsterSupportPool === 'function'
      ? buildMonsterSupportPool(boss.name, null, boss.lvl, true, supportCount)
      : [],
    _supportSkillCooldowns: {},
    _lastSupportSkill: Date.now() - 4000,
    _lastTrick: 0,
    _nextTrickAt: Date.now() + (apex ? 4200 : 7800),
    _wbContractLevel: encounter?.contractLevel || 0,
    _wbRewardMult: rewardMult,
  };
}

function getRareEliteForMap(mapKey) {
  return (typeof RARE_ELITES !== 'undefined' ? RARE_ELITES.find(r => r.mapKey === mapKey) : null) || null;
}
function buildRareEliteMonsterData(rare) {
  const baseHp = Math.floor((100 + rare.lvl * rare.lvl * 7.5) * (rare.hpMul || 1));
  const baseAtk = Math.floor((10 + rare.lvl * 3.2) * (rare.atkMul || 1));
  const mon = {
    name: rare.emoji + rare.name,
    bossName: rare.name,
    isBoss: true,
    isRareElite: true,
    rareKey: rare.key,
    _uid: Date.now() + Math.floor(Math.random() * 1000),
    lvl: rare.lvl,
    hpMax: baseHp,
    hp: baseHp,
    atk: Math.floor(baseAtk * (1 + (rare.passive?.atkBonus || 0))),
    def: Math.floor((3 + rare.lvl * 1.5) * (rare.defMul || 1)),
    baseGold: Math.max(1, Math.floor((rare.rewards?.gold || 1) / 24)),
    baseXp: Math.max(90, rare.lvl * 8),
    goldReward: rare.rewards?.gold || 0,
    honorReward: rare.rewards?.honor || 0,
    dropRate: 0.45,
    gemChance: 0,
    maxRarity: rare.lvl >= 55 ? 'epic' : 'rare',
    _dots: {},
    _dotLegacyImported: true,
    _lastDotTick: 0,
    dodgeChance: rare.passive?.dodgeChance || 0.06,
    critChance: rare.passive?.critChance || 0.12,
    dmgReduction: rare.passive?.dmgReduction || 0.08,
    lifeSteal: rare.passive?.leech || 0,
    stunChance: rare.passive?.stunChance || 0,
    instantCast: rare.lvl >= 60,
    atkInterval: rare.atkInterval || (rare.lvl >= 60 ? 1300 : 1425),
    _monSkills: [],
    _monSkill: null,
    _monSupportSkills: typeof buildMonsterSupportPool === 'function'
      ? buildMonsterSupportPool(rare.name, null, rare.lvl, true, rare.supportCount || 1)
      : [],
    _supportSkillCooldowns: {},
    _lastSupportSkill: Date.now() - 3500,
    _lastTrick: 0,
    _nextTrickAt: Date.now() + 9000
  };
  const map = typeof MAPS !== 'undefined' ? MAPS.find(m => m.key === rare.mapKey) : null;
  if (typeof applyWorldZoneThreatScalingToMonster === 'function') {
    applyWorldZoneThreatScalingToMonster(mon, map, map?.sub?.[state?.currentSubzone || 0] || map?.sub?.[0], { rare:true, boss:true, count:2 });
  }
  if (typeof applyRareEliteMutationScaling === 'function') {
    applyRareEliteMutationScaling(mon, rare, map);
  }
  return mon;
}

function maybeSpawnRareEliteEncounter(map) {
  if (!map || typeof RARE_ELITES === 'undefined') return false;
  if (state.mode !== 'world') return false;
  const rare = getRareEliteForMap(map.key);
  if (!rare) return false;
  if (Math.random() >= (rare.spawnChance || 0.025)) return false;
  state._currentRareElite = rare.key;
  state.currentMonsters = [buildRareEliteMonsterData(rare)];
  log(`⭐ 遭遇稀有精英 [${rare.name}]！`, 'epic');
  if (typeof markDirty === 'function') markDirty('map', 'stage', 'events');
  return true;
}

function leaveRareEliteEncounter() {
  state._currentRareElite = null;
  state.currentMonsters = [];
  if (state.mode !== 'world') state.mode = 'world';
  spawnMonster();
  markDirty('map', 'events', 'stage');
}

function worldBossAvailableAt(key) {
  ensureEventState();
  const wb = getWorldBossDef(key);
  if (!wb) return 0;
  const last = state.worldBoss.lastKill[key] || 0;
  return last + worldBossCooldownMs(wb);
}
function worldBossReady(key) {
  return Date.now() >= worldBossAvailableAt(key);
}

function challengeWorldBoss(key) {
  ensureEventState();
  const wb = getWorldBossDef(key); if (!wb) return;
  if (!worldBossReady(key)) { log('世界BOSS冷却中', 'bad'); return; }
  if (state.mode === 'travel') { log('正在旅行中', 'bad'); return; }
  if (state.mode !== 'world') { log('请先结束当前战斗', 'bad'); return; }
  if (!worldBossMeetsReq(wb)) { log(`进度不足,需要 ${worldBossReqLabel(wb)}+`, 'bad'); return; }
  state.worldBoss.activeEncounter = createWorldBossEncounter(wb);
  state.mode = 'worldboss';
  state._currentWBoss = key;
  state._currentRareElite = null;
  state.currentMonsters = [];
  state.hp = state.hero.hpMax; state.resource = state.resourceMax;
  if (typeof resetDmgStats === 'function') resetDmgStats();
  if (typeof clearAllBuffs === 'function') clearAllBuffs();
  state.currentMonsters.push(buildWorldBossMonsterData(wb));
  log(`⚔️ 挑战世界BOSS [${wb.name}]!`, isApexWorldBoss(wb) ? 'legend' : 'epic');
  if (state.worldBoss.activeEncounter) {
    const enc = state.worldBoss.activeEncounter;
    log(`${enc.contract.icon} 已启用 ${enc.contract.name}: 怪物生命 ×${enc.contract.hp.toFixed(2)} · 攻击 ×${enc.contract.atk.toFixed(2)} · 防御 ×${enc.contract.def.toFixed(2)}`, 'legend');
    if (enc.assaults?.length) log(`🌌 天幕戒律: ${enc.assaults.map(a => `${a.icon}${a.name}`).join(' · ')}`, 'bad');
  }
  markDirty('stage','events');
}

function leaveWorldBoss() {
  state.mode = 'world';
  state._currentWBoss = null;
  if (state.worldBoss) state.worldBoss.activeEncounter = null;
  state.currentMonsters = [];
  spawnMonster();
}

/* 世界Boss击杀回调(由 combat 在 onMonsterDeath 中识别 isWorldBoss 并调用) */
function onWorldBossKill(mon) {
  ensureEventState();
  const key = mon.wbKey;
  const wb = getWorldBossDef(key); if (!wb) return;
  const encounter = state.worldBoss.activeEncounter && state.worldBoss.activeEncounter.key === key
    ? state.worldBoss.activeEncounter
    : null;
  const rewardMult = worldBossEncounterRewardMult(encounter);
  const bonusGem = encounter ? Math.max(0, Math.floor((wb.rewards?.gem || 0) * (rewardMult - 1))) : 0;
  const bonusEssence = encounter ? Math.max(0, Math.floor((wb.rewards?.essence || 0) * (rewardMult - 1))) : 0;
  const bonusShards = encounter ? Math.max(0, Math.floor((wb.rewards?.shards || 0) * (rewardMult - 1))) : 0;
  const bonusMarks = worldBossEncounterMarkGain(wb, encounter);
  state.worldBoss.lastKill[key] = Date.now();
  state.worldBoss.totalKilled = (state.worldBoss.totalKilled||0) + 1;
  worldBossCheckKillMilestone();
  if (typeof mountOnWorldBossKill==='function') mountOnWorldBossKill(key);
  state.gem += (wb.rewards?.gem || 0) + bonusGem;
  if (typeof ensureMats==='function') ensureMats();
  state.essence += (wb.rewards?.essence || 0) + bonusEssence;
  if (bonusMarks) state.worldBoss.apexMarks = (state.worldBoss.apexMarks || 0) + bonusMarks;

  if (isStageWorldBoss(wb)) {
    const firstClear = !worldBossStageCleared(wb);
    state.worldBoss.stageClears[wb.key] = true;
    const mainRarity = wb.lvl >= 50 ? 'epic' : 'rare';
    const mainItem = rollItem(mainRarity, wb.lvl);
    addToInventory(mainItem);
    if (typeof eventsOnItemGet==='function') eventsOnItemGet(mainItem);
    if (firstClear) {
      const bonusItem = rollItem('epic', wb.lvl + 1);
      addToInventory(bonusItem);
      if (typeof eventsOnItemGet==='function') eventsOnItemGet(bonusItem);
      log(`🏁 击败阶段守关Boss ${wb.name}，Lv.${wb.gateLevel} 经验封锁已解除！`, 'legend');
    } else {
      if (wb.lvl >= 60) {
        const bonusItem = rollItem('epic', wb.lvl);
        addToInventory(bonusItem);
        if (typeof eventsOnItemGet==='function') eventsOnItemGet(bonusItem);
      }
      log(`🏆 再次击败 ${wb.name}! +${wb.rewards?.gem || 0}💎 +${wb.rewards?.essence || 0}✨`, 'epic');
    }
    seasonAddPoints(180 + wb.lvl * 3, '阶段世界Boss');
    if (typeof gainXP === 'function') gainXP(0);
  } else {
    state.worldBoss.shards = (state.worldBoss.shards||0) + (wb.rewards?.shards || 0) + bonusShards;
    for (let i = 0; i < 2; i++) {
      const ep = rollItem('epic', wb.lvl);
      addToInventory(ep);
      if (typeof eventsOnItemGet==='function') eventsOnItemGet(ep);
    }
    if (Math.random() < 0.35) {
      const lg = rollItem('legend', wb.lvl);
      addToInventory(lg);
      if (typeof eventsOnItemGet==='function') eventsOnItemGet(lg);
      if (typeof progressionOnLegendary==='function') progressionOnLegendary();
    }
    if (encounter && Math.random() < Math.min(0.72, 0.10 + encounter.contractLevel * 0.14)) {
      const bonusLegend = rollItem('legend', wb.lvl + encounter.contractLevel);
      addToInventory(bonusLegend);
      if (typeof eventsOnItemGet==='function') eventsOnItemGet(bonusLegend);
      if (typeof progressionOnLegendary==='function') progressionOnLegendary();
      log(`🌌 猎令战利品: 额外获得 [${bonusLegend.rarityName}] ${bonusLegend.name}`, 'legend');
    }
    seasonAddPoints(500, '世界Boss');
    const encounterText = encounter
      ? ` · ${encounter.contract.icon}${encounter.contract.name} · 奖励 ×${rewardMult.toFixed(2)} · 星痕 +${bonusMarks} · 戒律触发 ${encounter.assaultHits || 0} · 阶段 ${encounter.bossPhasesTriggered || 0} · 压迫 ${encounter.maxPressure || 0}`
      : '';
    log(`🏆 击败 ${wb.name}! +${(wb.rewards.shards || 0) + bonusShards}橙装碎片 +${(wb.rewards.gem || 0) + bonusGem}💎 +${(wb.rewards.essence || 0) + bonusEssence}✨${encounterText}`, 'legend');
  }

  leaveWorldBoss();
  if (typeof progressionCheckAch === 'function') progressionCheckAch();
  markDirty('events','hero','inventory','map');
}

function onRareEliteKill(mon) {
  ensureEventState();
  const rare = typeof RARE_ELITES !== 'undefined' ? RARE_ELITES.find(r => r.key === mon.rareKey) : null;
  if (!rare) {
    state._currentRareElite = null;
    spawnMonster();
    return;
  }
  state._currentRareElite = null;
  state.worldBoss.rareKills[rare.key] = (state.worldBoss.rareKills[rare.key] || 0) + 1;
  state.gem += rare.rewards?.gem || 0;
  if (typeof ensureMats === 'function') ensureMats();
  state.essence += rare.rewards?.essence || 0;
  const item = rollItem(rare.lvl >= 55 ? 'epic' : 'rare', rare.lvl, rare.mapKey);
  addToInventory(item);
  if (typeof eventsOnItemGet === 'function') eventsOnItemGet(item);
  if (rare.lvl >= 60 && Math.random() < 0.12) {
    const bonus = rollItem('epic', rare.lvl + 1, rare.mapKey);
    addToInventory(bonus);
    if (typeof eventsOnItemGet === 'function') eventsOnItemGet(bonus);
  }
  seasonAddPoints(80 + rare.lvl * 2, '稀有精英');
  log(`⭐ 击败稀有精英 ${rare.name}! +${rare.rewards.gem || 0}💎 +${rare.rewards.essence || 0}✨`, 'epic');
  spawnMonster();
  if (typeof progressionCheckAch === 'function') progressionCheckAch();
  markDirty('events', 'inventory', 'hero', 'map');
}

/* 用碎片换一件橙装(随机槽位) */
function exchangeShards() {
  ensureEventState();
  if ((state.worldBoss.shards||0) < SHARD_EXCHANGE_COST) { log('碎片不足', 'bad'); return; }
  state.worldBoss.shards -= SHARD_EXCHANGE_COST;
  const it = rollItem('legend', state.hero.lvl);
  addToInventory(it);
  if (typeof eventsOnItemGet==='function') eventsOnItemGet(it);
  if (typeof progressionOnLegendary==='function') progressionOnLegendary();
  log(`🎁 用碎片合成 [${it.rarityName}] ${it.name}`, 'legend');
  markDirty('events','inventory');
}
function exchangeApexMarks() {
  ensureEventState();
  if ((state.worldBoss.apexMarks || 0) < APEX_MARK_EXCHANGE_COST) { log('星痕不足', 'bad'); return; }
  state.worldBoss.apexMarks -= APEX_MARK_EXCHANGE_COST;
  const progLvl = (typeof playerProgressLevel === 'function') ? playerProgressLevel() : (state.hero.lvl || 1);
  const lootLvl = Math.max(90, progLvl);
  const legend = rollItem('legend', lootLvl);
  addToInventory(legend);
  if (typeof eventsOnItemGet === 'function') eventsOnItemGet(legend);
  if (typeof progressionOnLegendary === 'function') progressionOnLegendary();
  state.gem += 140;
  state.essence += 55;
  state.worldBoss.shards = (state.worldBoss.shards || 0) + 18;
  log(`🌌 铸造顶峰猎箱: 获得 [${legend.rarityName}] ${legend.name} · +140💎 +55✨ +18🧩`, 'legend');
  markDirty('events', 'inventory', 'hero');
}

/* ============ 日常任务 ============ */
const DAILY_TEMPLATES = [
  { key:'kill_50',  name:'每日狩猎',  type:'kill',   goalBase:50,  goalScale:5,  reward:{gem:5,honor:200,essence:3} },
  { key:'kill_200', name:'屠杀任务',  type:'kill',   goalBase:200, goalScale:10, reward:{gem:10,honor:500,essence:6} },
  { key:'gold_5k',  name:'淘金日',    type:'gold',   goalBase:5000,goalScale:500,reward:{gem:8,honor:300,essence:4} },
  { key:'dg_1',     name:'副本征服',  type:'dungeon',goalBase:1,   goalScale:0,  reward:{gem:15,honor:400,essence:5} },
  { key:'rare_5',   name:'装备搜寻',  type:'rare',   goalBase:5,   goalScale:0,  reward:{gem:5,honor:200,essence:3} },
  { key:'rare_15',  name:'稀有猎人',  type:'rare',   goalBase:15,  goalScale:0,  reward:{gem:10,honor:400,essence:5} },
  { key:'epic_2',   name:'史诗品质',  type:'epic',   goalBase:2,   goalScale:0,  reward:{gem:20,honor:600,essence:8} },
  { key:'gem_3',    name:'珠宝匠日',  type:'socket', goalBase:3,   goalScale:0,  reward:{gem:10,honor:300,essence:5} },
  { key:'subzone_3',name:'探索者',    type:'subzone',goalBase:3,   goalScale:0,  reward:{gem:8,honor:300,essence:4} },
];

function nextDayResetTs() {
  const d = new Date();
  d.setHours(0,0,0,0);
  return d.getTime() + 24*3600*1000;
}

function dailyReset() {
  ensureEventState();
  // 选 3 条不重复的
  const pool = DAILY_TEMPLATES.slice();
  const picks = [];
  for (let i=0;i<3 && pool.length;i++) {
    const idx = rng(0, pool.length-1);
    picks.push(pool.splice(idx,1)[0]);
  }
  const lvl = state.hero.lvl || 1;
  state.daily.tasks = picks.map(p => ({
    key: p.key, name: p.name, type: p.type,
    goal: p.goalBase + p.goalScale * lvl,
    cur: 0, claimed: false, reward: p.reward,
  }));
  state.daily.resetAt = nextDayResetTs();
  // 检查周流
  const claimedAll = state.daily.tasks.every(t=>t.claimed);
  // weekStreak 在领奖时更新
  log('📅 新的一天,日常已刷新', 'good');
  markDirty('events');
}

function checkDailyRollover() {
  ensureEventState();
  const now = Date.now();
  if (!state.daily.resetAt || now >= state.daily.resetAt) {
    // 若任务有未完成,断 streak
    if (state.daily.tasks && state.daily.tasks.length && !state.daily.tasks.every(t=>t.claimed)) {
      state.daily.weekStreak = 0;
    }
    dailyReset();
  }
}

function dailyProgress(type, amount) {
  ensureEventState();
  // 自动初始化或日切
  if (!state.daily.tasks || state.daily.tasks.length === 0 || !state.daily.resetAt || Date.now() >= state.daily.resetAt) {
    checkDailyRollover();
  }
  if (!state.daily.tasks) return;
  let any = false;
  for (const t of state.daily.tasks) {
    if (t.type !== type || t.claimed) continue;
    if (t.cur < t.goal) {
      t.cur = Math.min(t.goal, t.cur + amount);
      any = true;
      if (t.cur >= t.goal) log(`✅ 日常 [${t.name}] 已完成,可领取`, 'good');
    }
  }
  if (any) markDirty('events');
}

function claimDaily(idx) {
  ensureEventState();
  const t = state.daily.tasks[idx]; if (!t) return;
  if (t.claimed) { log('已领取', 'bad'); return; }
  if (t.cur < t.goal) { log('未完成', 'bad'); return; }
  t.claimed = true;
  const r = t.reward||{};
  if (r.gem) state.gem += r.gem;
  if (r.honor) state.honor += r.honor;
  if (r.essence) { if (typeof ensureMats==='function') ensureMats(); state.essence += r.essence; }
  seasonAddPoints(100, '日常');
  log(`🎁 日常 [${t.name}] 奖励: ${r.gem||0}💎 ${r.honor||0}🏅 ${r.essence||0}✨`, 'good');
  // 全部完成给周大奖一份
  if (state.daily.tasks.every(x=>x.claimed)) {
    state.daily.weekStreak = (state.daily.weekStreak||0) + 1;
    log(`🌟 今日全部完成! 周连击 ${state.daily.weekStreak}/7`, 'epic');
    if (state.daily.weekStreak >= 7 && !state.daily.weeklyClaimedAt) {
      // 提示领周奖
      log('🎉 已连续完成7天,可在事件页领取周宝箱', 'legend');
    }
  }
  markDirty('events','hero');
}

function claimWeeklyChest() {
  ensureEventState();
  if ((state.daily.weekStreak||0) < 7) { log('未达成7连日常', 'bad'); return; }
  state.daily.weekStreak = 0;
  state.daily.weeklyClaimedAt = Date.now();
  state.gem += 100;
  state.honor += 5000;
  if (typeof ensureMats==='function') ensureMats();
  state.essence += 50;
  // 一颗随机T2宝石
  const color = choice(['red','yellow','blue']);
  const gk = color + '_t2';
  if (typeof GEM_TYPES!=='undefined' && GEM_TYPES[gk]) {
    state.gems[gk] = (state.gems[gk]||0) + 1;
    log('🎁 周宝箱: 100💎 5000🏅 50✨ + ['+GEM_TYPES[gk].name+']', 'legend');
  } else {
    log('🎁 周宝箱: 100💎 5000🏅 50✨', 'legend');
  }
  seasonAddPoints(1500, '周宝箱');
  markDirty('events','hero');
}

/* ============ 赛季 ============ */
const SEASON_DAYS = 14;
const SEASON_TIERS = [
  { key:'iron',    name:'青铜',   minPts:0,      icon:'🥉', stat:null },
  { key:'silver',  name:'白银',   minPts:5000,   icon:'🥈', stat:{atkPct:1} },
  { key:'gold',    name:'黄金',   minPts:15000,  icon:'🥇', stat:{atkPct:2,hpPct:1} },
  { key:'platinum',name:'铂金',   minPts:40000,  icon:'💠', stat:{atkPct:2,hpPct:2,crit:1} },
  { key:'diamond', name:'钻石',   minPts:90000,  icon:'💎', stat:{atkPct:3,hpPct:3,crit:1,critdPct:5} },
  { key:'master',  name:'大师',   minPts:200000, icon:'🏆', stat:{atkPct:4,hpPct:4,crit:2,critdPct:10},   title:'赛季大师' },
  { key:'king',    name:'王者',   minPts:500000, icon:'👑', stat:{atkPct:6,hpPct:6,crit:3,critdPct:15,leech:3}, title:'赛季王者' },
];

function getSeasonTier(pts) {
  let best = SEASON_TIERS[0];
  for (const t of SEASON_TIERS) if (pts >= t.minPts) best = t;
  return best;
}
function getSeasonNext(pts) {
  for (const t of SEASON_TIERS) if (pts < t.minPts) return t;
  return null;
}

function ensureSeason() {
  if (!account) account = defaultAccount();
  if (!account.season) account.season = { startAt:0, endAt:0, points:0, history:[], id:1 };
  if (!account.season.history) account.season.history = [];
  const now = Date.now();
  if (!account.season.startAt || !account.season.endAt) {
    account.season.startAt = now;
    account.season.endAt = now + SEASON_DAYS * 86400 * 1000;
    account.season.points = 0;
    account.season.id = (account.season.history.length || 0) + 1;
  }
}

function checkSeasonRollover() {
  ensureSeason();
  const now = Date.now();
  if (now < account.season.endAt) return;
  // 结算
  const tier = getSeasonTier(account.season.points);
  const record = {
    id: account.season.id,
    finalPoints: account.season.points,
    tierKey: tier.key, tierName: tier.name,
    endedAt: now, claimed: false,
  };
  account.season.history.unshift(record);
  log(`🏁 赛季 ${account.season.id} 结束! 段位: ${tier.icon}${tier.name}`, 'legend');
  // 自动发奖:资源给当前角色,永久属性/称号入账号
  state.gem += 50 + SEASON_TIERS.indexOf(tier)*30;
  state.honor += 1000 + SEASON_TIERS.indexOf(tier)*500;
  if (tier.stat) {
    if (!account.permanentStats) account.permanentStats = {};
    for (const [k,v] of Object.entries(tier.stat)) {
      account.permanentStats[k] = (account.permanentStats[k]||0) + v;
    }
  }
  if (tier.title) {
    const seasonTitle = tier.title + ' · S'+account.season.id;
    if (typeof unlockTitle === 'function') unlockTitle(seasonTitle);
    else account.title = seasonTitle;
  }
  // 启新赛季
  account.season.id = (account.season.id||1) + 1;
  account.season.startAt = now;
  account.season.endAt = now + SEASON_DAYS * 86400 * 1000;
  account.season.points = 0;
  if (typeof recomputeStats==='function') recomputeStats();
  markDirty('events','hero');
}

function seasonAddPoints(p, reason) {
  ensureSeason();
  account.season.points = (account.season.points||0) + p;
}

/* ============ 钩子 ============ */
/* 由 combat onMonsterDeath 调用 — 处理 daily/season 计数 */
function eventsOnKill(mon) {
  ensureEventState();
  dailyProgress('kill', 1);
  seasonAddPoints(mon.isBoss ? 20 : 1, 'kill');
}
function eventsOnGoldGain(amount) {
  ensureEventState();
  dailyProgress('gold', amount);
}
function eventsOnDungeonClear() {
  ensureEventState();
  dailyProgress('dungeon', 1);
  seasonAddPoints(200, 'dungeon');
}
function eventsOnItemGet(item) {
  ensureEventState();
  if (!item) return;
  if (item.rarity === 'rare' || item.rarity === 'epic' || item.rarity === 'legend') {
    dailyProgress('rare', 1);
  }
  if (item.rarity === 'epic' || item.rarity === 'legend') {
    dailyProgress('epic', 1);
  }
  seasonAddPoints(item.rarity==='legend'?80 : item.rarity==='epic'?20 : 5, 'item');
}
function eventsOnGem() { dailyProgress('socket', 1); }
function eventsOnSubzoneClear() { dailyProgress('subzone', 1); }

/* ============ 渲染 ============ */
let eventsSubTab = 'wb'; // 'wb' | 'daily' | 'season'

function renderEvents() {
  const root = $('tab-events'); if (!root) return;
  ensureEventState();
  checkDailyRollover();
  checkSeasonRollover();
  const head = `
    <div class="sub-tabs">
      <span class="sub-tab ${eventsSubTab==='wb'?'active':''}" data-sub="wb">🐲 世界Boss</span>
      <span class="sub-tab ${eventsSubTab==='daily'?'active':''}" data-sub="daily">📅 日常</span>
      <span class="sub-tab ${eventsSubTab==='season'?'active':''}" data-sub="season">🏁 赛季</span>
    </div>`;
  let body = '';
  if (eventsSubTab === 'wb') body = renderWorldBossSub();
  else if (eventsSubTab === 'daily') body = renderDailySub();
  else if (eventsSubTab === 'season') body = renderSeasonSub();
  root.innerHTML = head + body;
  if (eventsSubTab === 'wb' && typeof bindWorldBossTooltips === 'function') bindWorldBossTooltips(root);
}

function renderWorldBossSub() {
  const gate = currentXpGate();
  const gateHtml = gate
    ? `<div class="stage-gate-note" style="margin-bottom:8px"><b>当前卡级:</b> Lv.${gate.level} · 击败 <b>${gate.name}</b> 后继续获得经验</div>`
    : '';
  const _wbTotal = state.worldBoss.totalKilled||0;
  const _wbNext = WBOSS_KILL_MILESTONES.find(m => _wbTotal < m.n);
  const contract = worldBossContractInfo(worldBossContractLevel());
  const contractButtons = WORLD_BOSS_CONTRACTS.map(c => `
    <button data-action="setwbosscontract" data-level="${c.level}" data-contract-level="${c.level}" class="wb-contract-tip ${contract.level === c.level ? 'active' : ''}" title="${c.desc}">
      ${c.icon} ${c.name}
    </button>`).join('');
  let html = `<div class="prog-summary muted">${gateHtml}橙装碎片: <b style="color:var(--legend)">${state.worldBoss.shards||0}</b> / ${SHARD_EXCHANGE_COST} · 累计击败 ${_wbTotal} 次
    ${(state.worldBoss.shards||0)>=SHARD_EXCHANGE_COST ? '<button class="gold" data-action="exchangeshards" style="margin-left:8px">合成橙装</button>' : ''}
    · 星痕 <b style="color:#67e8f9">${state.worldBoss.apexMarks||0}</b> / ${APEX_MARK_EXCHANGE_COST}
    ${(state.worldBoss.apexMarks||0)>=APEX_MARK_EXCHANGE_COST ? '<button class="gold" data-action="exchangeapexmarks" style="margin-left:8px">铸造猎箱</button>' : ''}
    <div style="font-size:10px;margin-top:3px">🏆 击杀里程碑: ${WBOSS_KILL_MILESTONES.map(m=>`<span style="opacity:${_wbTotal>=m.n?1:0.5}">${_wbTotal>=m.n?'✅':'🔒'}${m.n}${m.title?'👑':''}</span>`).join(' · ')}${_wbNext?` · 下一档还需 ${_wbNext.n-_wbTotal} 次`:' · 全部达成'}</div>
  </div>`;
  html += `<div class="worldboss-contract-panel">
    <div class="worldboss-contract-title">
      <span>🌌 顶峰猎令</span>
      <span class="muted">${contract.desc}</span>
    </div>
    <div class="worldboss-contract-hero" style="background-image:linear-gradient(180deg, rgba(10,14,24,.18), rgba(10,14,24,.84)), url('assets/wow/art/karesh-apex-hunt.png')">
      <div class="worldboss-contract-hero-main">
        <div style="font-weight:700;font-size:14px">${contract.icon} 当前猎令: ${contract.name}</div>
        <div class="muted">怪物生命 ×${contract.hp.toFixed(2)} · 攻击 ×${contract.atk.toFixed(2)} · 防御 ×${contract.def.toFixed(2)} · 基础奖励 ×${contract.reward.toFixed(2)}</div>
        <div class="muted" style="margin-top:4px">顶峰世界Boss会在高猎令下获得更多天幕戒律、阶段变化与战斗压迫;额外奖励会折算成星痕与猎箱。</div>
      </div>
    </div>
    <div class="worldboss-contract-buttons">${contractButtons}</div>
    <div class="dungeon-contract-info">契约奖励会在顶峰世界Boss结算时追加生效,并按实际战斗中的压迫层数继续上浮。推荐在雷沙诺尔之后逐步提高,以便和新坐骑、终局装备成长保持难度匹配。</div>
  </div>`;
  const renderRewardLine = wb => {
    const parts = [];
    if (wb.rewards?.gold) parts.push(`${wb.rewards.gold}💰`);
    if (wb.rewards?.gem) parts.push(`${wb.rewards.gem}💎`);
    if (wb.rewards?.honor) parts.push(`${wb.rewards.honor}🏅`);
    if (wb.rewards?.essence) parts.push(`${wb.rewards.essence}✨`);
    if (wb.rewards?.shards) parts.push(`${wb.rewards.shards}🧩碎片`);
    const bossDrops = (typeof globalThis !== 'undefined' && globalThis.WORLD_BOSS_MOUNT_DROPS) || (typeof WORLD_BOSS_MOUNT_DROPS !== 'undefined' ? WORLD_BOSS_MOUNT_DROPS : null);
    const mounts = (typeof globalThis !== 'undefined' && globalThis.MOUNTS) || (typeof MOUNTS !== 'undefined' ? MOUNTS : null);
    if (bossDrops && mounts) {
      const drop = bossDrops[wb.key];
      const mount = drop ? mounts.find(m => m.key === drop.key) : null;
      if (mount) parts.push(`${mount.icon}${mount.name}(${(drop.chance * 100).toFixed(1)}%)`);
    }
    return parts.join(' ');
  };
  const renderNightmareLine = wb => {
    if (!isApexWorldBoss(wb)) return '';
    const level = contract.level || 0;
    const assaults = getWorldBossAssaults(wb, level);
    const phases = getWorldBossPhaseEvents(wb, level);
    const skillCount = (wb.skills || []).length;
    const passiveCount = (wb.passive?.tricks || []).length;
    const traitText = (wb.nightmareTraits || []).slice(0, 3).map(t => `${t.icon || '🌌'}${t.name}`).join(' · ');
    return `<div class="muted wb-contract-tip" data-wb-key="${wb.key}" data-contract-level="${level}" style="font-size:10px;margin-top:3px">💀 噩梦挑战 · 强度高于同级史诗团本尾王 · 戒律 ${assaults.length} · 阶段 ${phases.length} · 技能 ${skillCount} · 被动 ${passiveCount}${traitText ? ` · ${traitText}` : ''}</div>
      <div class="muted" style="font-size:10px;margin-top:3px">戒律: ${assaults.map(a => `<span class="wb-assault-tip" data-wb-key="${wb.key}" data-contract-level="${level}" data-wb-assault-key="${a.key}" style="cursor:help">${a.icon}${a.name}</span>`).join(' · ')} · 阶段 ${phases.map(p => `<span class="wb-phase-tip" data-wb-key="${wb.key}" data-contract-level="${level}" data-wb-phase-key="${p.phaseKey}" style="cursor:help">${Math.round(p.threshold * 100)}%${p.icon || '⚔️'}</span>`).join(' · ') || '0'}</div>`;
  };

  html += `<div class="wb-list">`;
  for (const wb of trialWorldBosses()) {
    const cleared = worldBossStageCleared(wb);
    const ready = worldBossReady(wb.key);
    const statusText = !worldBossMeetsReq(wb)
      ? `需 ${worldBossReqLabel(wb)}`
      : cleared
        ? '已突破'
        : (gate?.key === wb.key ? '正在卡级' : '可挑战');
    html += `<div class="wb-item ${ready && !cleared ? 'wb-ready' : ''}" style="border-left:4px solid ${wb.color}">
      <div class="wb-main">
        <div class="wb-name wb-name-tip" data-wb-key="${wb.key}" style="color:${wb.color};cursor:help">${wb.emoji} ${wb.name} <span class="muted" style="font-size:10px">Lv.${wb.lvl}</span></div>
        <div class="muted" style="font-size:11px">${wb.desc}</div>
        <div class="muted" style="font-size:10px;margin-top:2px">奖励: ${renderRewardLine(wb)}</div>
      </div>
      <div class="wb-act">
        <div class="muted" style="font-size:10px;margin-bottom:4px">${statusText}</div>
        <button class="${cleared ? 'primary' : 'danger'}" data-action="challengewb" data-key="${wb.key}" ${!worldBossMeetsReq(wb) ? 'disabled' : ''}>${cleared ? '再战' : '挑战'}</button>
      </div>
    </div>`;
  }
  html += '</div>';
  html += `<div class="muted" style="margin:10px 0 4px;font-size:11px">终局世界Boss</div><div class="wb-list">`;
  for (const wb of WORLD_BOSSES.filter(isApexWorldBoss)) {
    const ready = worldBossReady(wb.key);
    const nextTs = worldBossAvailableAt(wb.key);
    const cd = Math.max(0, Math.ceil((nextTs - Date.now())/1000));
    const accessText = worldBossMeetsReq(wb) ? `推荐 ${worldBossReqLabel(wb)}` : `需 ${worldBossReqLabel(wb)}`;
    const assaults = getWorldBossAssaults(wb, contract.level);
    const phases = getWorldBossPhaseEvents(wb, contract.level);
    const contractLine = contract.level > 0
      ? `<div class="muted wb-contract-tip" data-wb-key="${wb.key}" data-contract-level="${contract.level}" style="font-size:10px;margin-top:3px">${contract.icon}${contract.name} · 奖励 ×${worldBossEncounterRewardMult({ contractLevel:contract.level, contract, assaults, maxPressure:0 }, false).toFixed(2)} · 戒律: ${assaults.map(a => `<span class="wb-assault-tip" data-wb-key="${wb.key}" data-contract-level="${contract.level}" data-wb-assault-key="${a.key}" style="cursor:help">${a.icon}${a.name}</span>`).join(' · ')} · 阶段 ${phases.map(p => `<span class="wb-phase-tip" data-wb-key="${wb.key}" data-contract-level="${contract.level}" data-wb-phase-key="${p.phaseKey}" style="cursor:help">${Math.round(p.threshold * 100)}%${p.icon || '⚔️'}</span>`).join(' · ') || '0'}</div>`
      : '';
    html += `<div class="wb-item ${ready?'wb-ready':''}" style="border-left:4px solid ${wb.color}">
      <div class="wb-main">
        <div class="wb-name wb-name-tip" data-wb-key="${wb.key}" style="color:${wb.color};cursor:help">${wb.emoji} ${wb.name} <span class="muted" style="font-size:10px">Lv.${wb.lvl}</span></div>
        <div class="muted" style="font-size:11px">${wb.desc}</div>
        <div class="muted" style="font-size:10px;margin-top:2px">${accessText} · 奖励: ${renderRewardLine(wb)}</div>
        ${renderNightmareLine(wb)}
        ${contractLine}
      </div>
      <div class="wb-act">
        ${ready ? `<button class="danger" data-action="challengewb" data-key="${wb.key}" ${!worldBossMeetsReq(wb) ? 'disabled' : ''}>挑战</button>`
                : `<span class="muted" style="font-size:11px">${fmtCd(cd)}</span>`}
      </div>
    </div>`;
  }
  html += '</div>';
  return html;
}

function renderDailySub() {
  const cd = Math.max(0, Math.ceil((state.daily.resetAt - Date.now())/1000));
  let html = `<div class="prog-summary muted">日常重置: <b>${fmtCd(cd)}</b> · 周连击 <b>${state.daily.weekStreak||0}/7</b>
    ${(state.daily.weekStreak||0)>=7 ? '<button class="gold" data-action="claimweekly" style="margin-left:8px">领周宝箱</button>':''}
  </div>`;
  html += '<div class="daily-list">';
  (state.daily.tasks||[]).forEach((t, i) => {
    const pct = Math.min(100, t.cur/t.goal*100);
    const r = t.reward||{};
    const rwdTxt = `${r.gem||0}💎 ${r.honor||0}🏅 ${r.essence||0}✨`;
    const btn = t.claimed
      ? `<span class="muted">✓已领</span>`
      : t.cur >= t.goal
        ? `<button class="gold" data-action="claimdaily" data-idx="${i}">领取</button>`
        : `<span class="muted" style="font-size:10px">${fmt(t.cur)}/${fmt(t.goal)}</span>`;
    html += `<div class="daily-item ${t.claimed?'ach-claimed':(t.cur>=t.goal?'ach-ready':'')}">
      <div class="daily-main">
        <div class="daily-name">${t.name}</div>
        <div class="muted" style="font-size:10px">${rwdTxt}</div>
        <div class="bar xp" style="height:6px;margin-top:2px"><i style="width:${pct}%"></i></div>
      </div>
      <div class="daily-act">${btn}</div>
    </div>`;
  });
  html += '</div>';
  return html;
}

function renderSeasonSub() {
  ensureSeason();
  const s = account.season;
  const t = getSeasonTier(s.points);
  const nxt = getSeasonNext(s.points);
  const remain = Math.max(0, Math.ceil((s.endAt - Date.now())/1000));
  const days = Math.floor(remain/86400), hrs = Math.floor((remain%86400)/3600);
  const pct = nxt ? ((s.points - t.minPts) / (nxt.minPts - t.minPts) * 100) : 100;
  let html = `<div class="prog-summary muted">
    赛季 <b>S${s.id||1}</b> · 剩余 <b>${days}天${hrs}时</b> · 当前段位: <span style="color:var(--gold)">${t.icon} ${t.name}</span> <span class="muted">(账号共享)</span>
  </div>`;
  html += `<div class="season-box">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <span><b>赛季积分</b> <span style="color:var(--gold);font-size:18px">${fmt(s.points)}</span></span>
      <span class="muted">${nxt ? `→ ${nxt.icon}${nxt.name} (${fmt(nxt.minPts)})` : '已封顶'}</span>
    </div>
    <div class="bar xp" style="height:10px;margin:4px 0"><i style="width:${pct}%;background:linear-gradient(90deg,#fbbf24,#f59e0b)"></i></div>
  </div>`;
  html += '<div class="muted" style="font-size:11px;margin:6px 0">所有段位奖励:</div>';
  html += '<div class="tier-list">';
  for (const tier of SEASON_TIERS) {
    const reached = s.points >= tier.minPts;
    const stat = tier.stat ? Object.entries(tier.stat).map(([k,v])=>fmtMod(k, v)).join(' ') : '无';
    html += `<div class="tier-item ${reached?'reached':''}">
      <div>${tier.icon} <b>${tier.name}</b> <span class="muted" style="font-size:10px">${fmt(tier.minPts)}+</span></div>
      <div class="muted" style="font-size:11px">${stat}${tier.title?' · 称号: 「'+tier.title+'」':''}</div>
    </div>`;
  }
  html += '</div>';
  if (s.history && s.history.length) {
    html += '<div class="muted" style="font-size:11px;margin:8px 0 4px">历史赛季:</div>';
    for (const r of s.history.slice(0,5)) {
      const tt = SEASON_TIERS.find(x=>x.key===r.tierKey) || SEASON_TIERS[0];
      html += `<div class="muted" style="font-size:11px;padding:2px 6px;background:var(--panel-2);border-radius:4px;margin-bottom:2px">S${r.id}: ${tt.icon}${r.tierName} · ${fmt(r.finalPoints)}分</div>`;
    }
  }
  return html;
}
