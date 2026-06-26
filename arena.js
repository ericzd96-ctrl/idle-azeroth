/* =========================================================
   arena.js — 竞技场(PvP 段位 + 荣誉商店 + 轻量战术对局)
   ----------------------------------------------------------
   设计目标:
   - 让竞技场不再只是“点一下结算”
   - 引入对手流派 / 场地词缀 / 战术选择 / 对局战报
   - 保持和主战斗解耦,不碰刷怪实时循环
   ========================================================= */

const ARENA_TIERS = [
  { key:'unranked', name:'未定级', icon:'🎗️', min:0,    mod:{}, reward:{} },
  { key:'bronze',   name:'青铜',   icon:'🥉', min:100,  mod:{atkPct:2, hpPct:2}, reward:{ honor:300, seals:2, essence:2 } },
  { key:'silver',   name:'白银',   icon:'🥈', min:300,  mod:{atkPct:4, hpPct:4}, reward:{ honor:600, seals:3, essence:3 } },
  { key:'gold',     name:'黄金',   icon:'🥇', min:600,  mod:{atkPct:6, hpPct:6, crit:2}, reward:{ honor:1000, seals:5, gem:5 } },
  { key:'plat',     name:'铂金',   icon:'💠', min:1000, mod:{atkPct:8, hpPct:8, crit:3, critdPct:5}, reward:{ honor:1600, seals:7, gem:8, essence:5 } },
  { key:'diamond',  name:'钻石',   icon:'💎', min:1500, mod:{atkPct:10, hpPct:10, defPct:5, crit:4, critdPct:8, vers:3}, reward:{ honor:2400, seals:10, gem:12, essence:8 } },
  { key:'master',   name:'大师',   icon:'🏆', min:2100, mod:{atkPct:13, hpPct:13, defPct:8, crit:5, critdPct:10, vers:4}, reward:{ honor:3600, seals:14, gem:18, essence:12 } },
  { key:'glad',     name:'角斗士', icon:'⚔️', min:2700, mod:{atkPct:16, hpPct:16, defPct:10, crit:6, critdPct:14, vers:5, leech:3}, reward:{ honor:5200, seals:20, gem:30, essence:18, tickets:1 } },
];

const ARENA_VENDOR = [
  { key:'wpn',  name:'角斗武器精通', icon:'🗡️', desc:'+1% 攻击 / 级', stat:'atkPct',  per:1, max:20, baseCost:2000 },
  { key:'res',  name:'角斗韧性',     icon:'🛡️', desc:'+1% 生命 / 级', stat:'hpPct',   per:1, max:20, baseCost:2000 },
  { key:'bul',  name:'角斗壁垒',     icon:'🧱', desc:'+2% 防御 / 级', stat:'defPct',  per:2, max:10, baseCost:3000 },
  { key:'let',  name:'角斗致命',     icon:'💥', desc:'+2% 暴伤 / 级', stat:'critdPct',per:2, max:15, baseCost:2500 },
  { key:'ver',  name:'角斗全能',     icon:'✴️', desc:'+1 全能 / 级',  stat:'vers',    per:1, max:10, baseCost:4000 },
];

const ARENA_ARSENAL = [
  { key:'tempo',   name:'竞技节奏', icon:'⏱️', desc:'+2% 技能急速 / 级', stat:'cdReduction', per:2, max:6, baseCost:5 },
  { key:'assault', name:'压制战法', icon:'⚔️', desc:'+2% 额外攻击 / 级', stat:'extraAtk', per:2, max:6, baseCost:6 },
  { key:'siphon',  name:'鲜血虹吸', icon:'🩸', desc:'+1% 吸血 / 级',   stat:'leech', per:1, max:8, baseCost:6 },
  { key:'focus',   name:'冷酷算计', icon:'🎯', desc:'+1 精通 / 级',     stat:'mastery', per:1, max:8, baseCost:5 },
  { key:'reserve', name:'战术节能', icon:'🔋', desc:'+2% 减耗 / 级',   stat:'costReduction', per:2, max:5, baseCost:7 },
];

const ARENA_DAILY_REWARDS = [
  { wins:1, reward:{ honor:120, seals:3, essence:2 } },
  { wins:3, reward:{ honor:240, seals:5, gem:5, essence:4 } },
  { wins:5, reward:{ honor:400, seals:8, gem:10, essence:6, tickets:1 } },
];

const ARENA_DAILY_MATCHES = 15;

const ARENA_RIVALS = [
  { n:'血吼', icon:'👹' }, { n:'夜刃', icon:'🐯' }, { n:'霜语', icon:'🧙' }, { n:'铁拳', icon:'🛡️' },
  { n:'影舞', icon:'🗡️' }, { n:'圣锤', icon:'🔨' }, { n:'毒牙', icon:'🐍' }, { n:'雷怒', icon:'⚡' },
  { n:'寒星', icon:'❄️' }, { n:'血誓', icon:'🩸' }, { n:'灰烬', icon:'🔥' }, { n:'风行', icon:'🏹' },
  { n:'破晓', icon:'🌅' }, { n:'噬魂', icon:'💀' }, { n:'狮心', icon:'🦁' }, { n:'蛮王', icon:'🪓' },
];

const ARENA_ARCHETYPES = [
  {
    key:'berserker',
    name:'狂战猛攻',
    icon:'🪓',
    desc:'前段强压,一旦节奏被断就会明显变弱。',
    threat:'开局爆发很凶',
    signature:'血裂冲锋',
    powerMult:1.04,
    counters:['counter','sustain'],
    punishes:['burst'],
    opener:'对手抢先压上,试图在前两波直接撕开缺口。',
    punishText:'你没稳住开局,被狂战节奏顶了上来。',
    counterText:'你扛住了第一波,狂战的后劲很快开始下滑。',
  },
  {
    key:'guardian',
    name:'铁壁守擂',
    icon:'🛡️',
    desc:'拖节奏、叠防御,越打越难收尾。',
    threat:'后段非常能扛',
    signature:'不动壁垒',
    powerMult:1.06,
    counters:['control','sustain'],
    punishes:['burst'],
    opener:'对手稳守中线,等你自己把伤害打空。',
    punishText:'你太急于交牌,被铁壁对手稳稳接住。',
    counterText:'你没有硬拼,而是持续拆他的防守层数。',
  },
  {
    key:'trickster',
    name:'诡步戏法',
    icon:'🕶️',
    desc:'节奏飘忽,爱打假动作和空档反击。',
    threat:'会惩罚慢热与迟疑',
    signature:'影缝错步',
    powerMult:1.01,
    counters:['control','balanced'],
    punishes:['sustain'],
    opener:'对手不断变线和骗招,想把你拖进失误里。',
    punishText:'你给他的试探空间太多,被牵着节奏走。',
    counterText:'你把节奏锁死,不给戏法型对手游走空间。',
  },
  {
    key:'summoner',
    name:'兽栏调度',
    icon:'🐺',
    desc:'不断拉出召唤物和侧翼压制,拖得越久越麻烦。',
    threat:'场面会越滚越大',
    signature:'兽群压阵',
    powerMult:1.03,
    counters:['burst','control'],
    punishes:['counter'],
    opener:'对手先布场再施压,想靠持续召唤把你淹没。',
    punishText:'你等得太久,他的召唤阵型已经铺开。',
    counterText:'你提前切掉关键点,没让召唤物滚起雪球。',
  },
  {
    key:'sniper',
    name:'猎杀号手',
    icon:'🏹',
    desc:'耐心找破绽,收官爆发极强。',
    threat:'残局斩杀危险',
    signature:'裂甲狙杀',
    powerMult:1.02,
    counters:['counter','burst'],
    punishes:['sustain'],
    opener:'对手先拉开距离,专等你出现防线空洞。',
    punishText:'你拖到残局才交手,正中他的斩杀节奏。',
    counterText:'你没给他舒适收官的机会,中盘就逼他交底牌。',
  },
];

const ARENA_AFFIXES = [
  {
    key:'bloodpit',
    name:'血斗场',
    icon:'🩸',
    desc:'场地伤势难以缓解,开局和反打都更致命。',
    powerMult:1.03,
    boosts:['burst','counter'],
    punishes:['sustain'],
    goodText:'场地加速了你的强攻兑现。',
    badText:'你想拖长战线,却被血斗场不断逼着换血。',
  },
  {
    key:'ironwall',
    name:'铁幕看台',
    icon:'🧱',
    desc:'观众护栏阻断走位,稳守和控场更容易。',
    powerMult:1.04,
    boosts:['sustain','control'],
    punishes:['burst'],
    goodText:'厚重地形让你的站位运营更轻松。',
    badText:'场地太厚,你那波爆发没能彻底穿透。',
  },
  {
    key:'smokescreen',
    name:'迷烟雾幕',
    icon:'🌫️',
    desc:'视野受限,更考验试探与节奏判断。',
    powerMult:1.01,
    boosts:['balanced','control'],
    punishes:['counter'],
    goodText:'你在烟幕里先一步读懂了对手。',
    badText:'你等反打的窗口被烟幕扰乱了。',
  },
  {
    key:'beastcage',
    name:'兽栏开闸',
    icon:'🦴',
    desc:'赛场边缘会不断制造压迫,适合快拆和控场。',
    powerMult:1.03,
    boosts:['burst','control'],
    punishes:['sustain'],
    goodText:'你处理边线压力很快,把兽栏优势抢了过来。',
    badText:'边路越堆越多,你已经来不及清场。',
  },
  {
    key:'duelrush',
    name:'疾斗钟摆',
    icon:'⏳',
    desc:'回合切换很快,抢先手和反击都更值钱。',
    powerMult:1.02,
    boosts:['counter','burst'],
    punishes:['balanced'],
    goodText:'你吃到了快节奏场地的红利。',
    badText:'你还在试探,节奏已经被对手抢走。',
  },
];

const ARENA_TACTICS = [
  {
    key:'balanced',
    name:'均衡试探',
    icon:'⚖️',
    desc:'先摸清对手,再稳定推进。逆风更稳,顺风略保守。',
    rewardMult:0,
    sealsBonus:0,
    lossGuard:0.18,
    crowdOnWin:2,
    crowdOnLose:1,
    planText:'先侦测节奏,再决定何时加速。',
  },
  {
    key:'burst',
    name:'开场爆发',
    icon:'🔥',
    desc:'抢开局、压前段。赢了奖励更高,但被硬接会很亏。',
    rewardMult:0.18,
    sealsBonus:0,
    lossGuard:-0.08,
    crowdOnWin:4,
    crowdOnLose:0,
    planText:'前两波直接上强度,不让对手舒服展开。',
  },
  {
    key:'counter',
    name:'反制截击',
    icon:'🛡️',
    desc:'留后手抓破绽,专打莽和贪。掉分更少,印记更高。',
    rewardMult:0.08,
    sealsBonus:1,
    lossGuard:0.12,
    crowdOnWin:3,
    crowdOnLose:1,
    planText:'等对面先露底牌,再截断关键回合。',
  },
  {
    key:'sustain',
    name:'续战磨场',
    icon:'💚',
    desc:'稳血线、拖中后段。最不怕连败,但爆发收益较低。',
    rewardMult:-0.04,
    sealsBonus:0,
    lossGuard:0.24,
    crowdOnWin:2,
    crowdOnLose:2,
    planText:'把对局拖进中后段,靠稳定性收掉残局。',
  },
  {
    key:'control',
    name:'控场压节奏',
    icon:'🕸️',
    desc:'封走位、拆铺场,很克花活和召唤流。赢了热度涨更快。',
    rewardMult:0.12,
    sealsBonus:1,
    lossGuard:0.04,
    crowdOnWin:5,
    crowdOnLose:0,
    planText:'优先拆对方关键节奏点,把战线控在自己手里。',
  },
];

function clampArenaChance(v) {
  return Math.max(0.05, Math.min(0.95, v));
}

function arenaPct(v) {
  const pct = Math.round(Math.abs(v) * 100);
  return `${v >= 0 ? '+' : '-'}${pct}%`;
}

function arenaSigned(n) {
  return n > 0 ? `+${n}` : `${n}`;
}

function arenaFmtDelta(v) {
  const color = v >= 0 ? '#86efac' : '#fca5a5';
  return `<span style="color:${color}">${arenaPct(v)}</span>`;
}

function arenaGetTactic(key) {
  return ARENA_TACTICS.find(x => x.key === key) || ARENA_TACTICS[0];
}

function arenaGetArchetype(key) {
  return ARENA_ARCHETYPES.find(x => x.key === key) || ARENA_ARCHETYPES[0];
}

function arenaGetAffix(key) {
  return ARENA_AFFIXES.find(x => x.key === key) || ARENA_AFFIXES[0];
}

function arenaIconHtml(icon, size, label, fallback) {
  return (typeof symbolIcon === 'function') ? symbolIcon(icon, size || 16, label || icon || '', fallback || '') : icon;
}

function ensureArenaState() {
  if (!state.arena) {
    state.arena = {
      rating:0, best:0, wins:0, losses:0, streak:0,
      dailyMatches:0, dailyWins:0, dailyResetAt:0,
      vendor:{}, arsenal:{}, seals:0, tierRewards:{}, dailyRewards:{}, opp:null,
      tactic:'balanced', crowd:0, lastReport:null,
    };
  }
  const a = state.arena;
  if (typeof a.rating !== 'number') a.rating = 0;
  if (typeof a.best !== 'number') a.best = a.rating;
  if (typeof a.wins !== 'number') a.wins = 0;
  if (typeof a.losses !== 'number') a.losses = 0;
  if (typeof a.streak !== 'number') a.streak = 0;
  if (typeof a.dailyMatches !== 'number') a.dailyMatches = 0;
  if (typeof a.dailyWins !== 'number') a.dailyWins = 0;
  if (typeof a.dailyResetAt !== 'number') a.dailyResetAt = 0;
  if (!a.vendor) a.vendor = {};
  if (!a.arsenal) a.arsenal = {};
  if (typeof a.seals !== 'number') a.seals = 0;
  if (!a.tierRewards) a.tierRewards = {};
  if (!a.dailyRewards) a.dailyRewards = {};
  if (!a.tactic || !ARENA_TACTICS.some(x => x.key === a.tactic)) a.tactic = 'balanced';
  if (typeof a.crowd !== 'number') a.crowd = 0;
  if (!a.lastReport || typeof a.lastReport !== 'object') a.lastReport = null;
  checkArenaRollover();
  if (!a.opp) arenaRollOpponent();
}

function checkArenaRollover() {
  const a = state.arena; if (!a) return;
  const now = Date.now();
  if (!a.dailyResetAt || now >= a.dailyResetAt) {
    a.dailyMatches = 0;
    a.dailyWins = 0;
    a.dailyRewards = {};
    a.dailyResetAt = (typeof nextDayResetTs === 'function')
      ? nextDayResetTs()
      : (function(){ const d=new Date(); d.setHours(0,0,0,0); return d.getTime()+24*3600*1000; })();
  }
}

function arenaHeroPower() {
  const h = state.hero || {};
  const critMult = 1 + (Math.min(h.crit || 0, 90) / 100) * (((h.critd || 150) - 100) / 100);
  let p = (h.atk || 1) * critMult * (h.spd || 1);
  p += (h.hpMax || 0) * 0.08 + (h.def || 0) * 1.5;
  p *= 1 + (h.vers || 0) / 100 + (h.leech || 0) / 200 + (h.mastery || 0) / 300;
  return Math.max(1, p);
}

function arenaRivalPower(rating) {
  return 0.13 * Math.pow(Math.max(0, rating) + 100, 1.3);
}

function arenaBaseWinChance(heroPow, rivalPow) {
  return clampArenaChance(heroPow / Math.max(1, heroPow + rivalPow));
}

function arenaRollOpponent() {
  if (!state.arena) return;   // 不再调 ensureArenaState(),否则与其 if(!a.opp)→roll 互相无限递归
  const a = state.arena;
  const rival = ARENA_RIVALS[rng(0, ARENA_RIVALS.length - 1)];
  const archetype = ARENA_ARCHETYPES[rng(0, ARENA_ARCHETYPES.length - 1)];
  const affix = ARENA_AFFIXES[rng(0, ARENA_AFFIXES.length - 1)];
  const oppRating = Math.max(0, a.rating + rng(-60, 140));
  const tierPressure = 1 + Math.min(0.12, Math.floor(a.rating / 600) * 0.015);
  const power = arenaRivalPower(oppRating) * archetype.powerMult * affix.powerMult * tierPressure;
  a.opp = {
    name: rival.n,
    icon: rival.icon,
    rating: oppRating,
    power,
    archetypeKey: archetype.key,
    affixKey: affix.key,
  };
}

/* 换对手费用(防止免费无限刷到顺手流派/场地再打) */
function arenaRerollCost() {
  ensureArenaState();
  return 40 + Math.floor((state.arena.rating || 0) / 20);
}
function arenaReroll() {
  ensureArenaState();
  const cost = arenaRerollCost();
  if (state.honor < cost) { log(`荣誉不足,更换对手需 ${cost}🏅`, 'bad'); return; }
  state.honor -= cost;
  arenaRollOpponent();
  log(`🔄 更换对手 · -${cost}🏅`, 'info');
  markDirty('arena', 'hero');
}

function arenaTierFor(rating) {
  let t = ARENA_TIERS[0];
  for (const x of ARENA_TIERS) if (rating >= x.min) t = x;
  return t;
}

function arenaCurrentTier() {
  ensureArenaState();
  return arenaTierFor(state.arena.rating);
}

function arenaRewardText(reward) {
  if (!reward) return '—';
  const parts = [];
  if (reward.honor) parts.push(`${reward.honor}🏅`);
  if (reward.seals) parts.push(`${reward.seals}🪙`);
  if (reward.essence) parts.push(`${reward.essence}✨`);
  if (reward.gem) parts.push(`${reward.gem}💎`);
  if (reward.tickets) parts.push(`${reward.tickets}🎫`);
  return parts.join(' ');
}

function arenaGrantReward(reward) {
  if (!reward) return;
  if (reward.honor) state.honor += reward.honor;
  if (reward.seals) state.arena.seals += reward.seals;
  if (reward.essence) state.essence += reward.essence;
  if (reward.gem) state.gem += reward.gem;
  if (reward.tickets) state.tickets += reward.tickets;
}

function arenaCheckDailyRewards() {
  ensureArenaState();
  const a = state.arena;
  for (const entry of ARENA_DAILY_REWARDS) {
    const key = `w${entry.wins}`;
    if (a.dailyWins >= entry.wins && !a.dailyRewards[key]) {
      a.dailyRewards[key] = true;
      arenaGrantReward(entry.reward);
      log(`🎁 竞技日赏 ${entry.wins}胜: ${arenaRewardText(entry.reward)}`, 'good');
    }
  }
}

function arenaClaimTierReward(tier) {
  ensureArenaState();
  if (!tier || !tier.key || tier.key === 'unranked') return '';
  const a = state.arena;
  if (a.tierRewards[tier.key]) return '';
  a.tierRewards[tier.key] = true;
  arenaGrantReward(tier.reward);
  return arenaRewardText(tier.reward);
}

function arenaSetTactic(key) {
  ensureArenaState();
  if (!ARENA_TACTICS.some(x => x.key === key)) return;
  state.arena.tactic = key;
  markDirty('arena');
}

function arenaEvaluateMatchup(tacticKey, opp, heroPow) {
  const a = state.arena || {};
  const tactic = arenaGetTactic(tacticKey || a.tactic || 'balanced');
  const archetype = arenaGetArchetype(opp?.archetypeKey);
  const affix = arenaGetAffix(opp?.affixKey);
  const baseChance = arenaBaseWinChance(heroPow, opp?.power || 1);
  let finalChance = baseChance;
  const breakdown = [];

  let matchupMod = 0;
  if (archetype.counters.includes(tactic.key)) {
    matchupMod += 0.11;
    breakdown.push({ label:`克制 ${archetype.name}`, delta:0.11, text: archetype.counterText });
  }
  if (archetype.punishes.includes(tactic.key)) {
    matchupMod -= 0.08;
    breakdown.push({ label:`被 ${archetype.name} 针对`, delta:-0.08, text: archetype.punishText });
  }

  let affixMod = 0;
  if (affix.boosts.includes(tactic.key)) {
    affixMod += 0.05;
    breakdown.push({ label:`吃到 ${affix.name} 红利`, delta:0.05, text: affix.goodText });
  }
  if (affix.punishes.includes(tactic.key)) {
    affixMod -= 0.05;
    breakdown.push({ label:`受 ${affix.name} 压制`, delta:-0.05, text: affix.badText });
  }

  let tacticMod = 0;
  if (tactic.key === 'balanced') {
    const floorBoost = baseChance < 0.5 ? Math.min(0.04, 0.5 - baseChance) : 0;
    const ceilingTax = baseChance > 0.58 ? -0.02 : 0;
    tacticMod += floorBoost + ceilingTax;
    if (floorBoost > 0) breakdown.push({ label:'稳住逆风开局', delta:floorBoost, text:'均衡试探帮你把低胜率局拉回一点。' });
    if (ceilingTax < 0) breakdown.push({ label:'保守打法少了点锋芒', delta:ceilingTax, text:'顺风时会稍微牺牲上限,换更稳定的容错。' });
  } else if (tactic.key === 'burst') {
    const delta = heroPow >= (opp?.power || 0) ? 0.03 : -0.02;
    tacticMod += delta;
    breakdown.push({ label:delta >= 0 ? '你更适合抢开局' : '逆风硬爆发有风险', delta, text: delta >= 0 ? '你的面板足够支撑开场压制。' : '这局直接梭前段,失败代价会更大。' });
  } else if (tactic.key === 'counter') {
    const delta = (opp?.power || 0) >= heroPow ? 0.03 : 0.01;
    tacticMod += delta;
    breakdown.push({ label:'反打窗口更清晰', delta, text:'对手越主动,反制截击越容易赚到关键回合。' });
  } else if (tactic.key === 'sustain') {
    const losingStreak = (a.streak || 0) <= -2 ? 0.03 : 0.01;
    tacticMod += losingStreak;
    breakdown.push({ label:'续战打法提高容错', delta:losingStreak, text:'稳血线和拖中后段能帮你止住连败。' });
  } else if (tactic.key === 'control') {
    const gap = Math.abs((opp?.power || 0) - heroPow) / Math.max(1, heroPow + (opp?.power || 0));
    const delta = gap <= 0.15 ? 0.03 : 0.01;
    tacticMod += delta;
    breakdown.push({ label:'控节奏更容易落地', delta, text:'双方强度接近时,控场的细节收益会被放大。' });
  }

  const crowdBonus = Math.min(0.05, Math.max(0, (a.crowd || 0) * 0.0008));
  if (crowdBonus > 0) {
    breakdown.push({ label:'赛场热度加成', delta:crowdBonus, text:'连胜和表现会让观众站到你这边。' });
  }

  const streakBonus = Math.max(-0.03, Math.min(0.04, (a.streak || 0) * 0.008));
  if (streakBonus !== 0) {
    breakdown.push({ label:streakBonus > 0 ? '连胜手感在线' : '连败压力', delta:streakBonus, text: streakBonus > 0 ? '你正处在状态里。' : '连续失利会影响稳定度。' });
  }

  finalChance = clampArenaChance(baseChance + matchupMod + affixMod + tacticMod + crowdBonus + streakBonus);
  const report = [
    `开局: ${tactic.planText}`,
    `对手: ${archetype.opener}`,
    `场地: ${affix.desc}`,
  ];
  const topPositive = breakdown.filter(x => x.delta > 0).sort((x, y) => y.delta - x.delta)[0];
  const topNegative = breakdown.filter(x => x.delta < 0).sort((x, y) => x.delta - y.delta)[0];
  return {
    tactic,
    archetype,
    affix,
    baseChance,
    finalChance,
    breakdown,
    report,
    topPositive,
    topNegative,
  };
}

function arenaTopTactics(opp, heroPow) {
  return ARENA_TACTICS
    .map(t => arenaEvaluateMatchup(t.key, opp, heroPow))
    .sort((a, b) => b.finalChance - a.finalChance);
}

function arenaWinChance() {
  ensureArenaState();
  const heroPow = arenaHeroPower();
  return arenaEvaluateMatchup(state.arena.tactic, state.arena.opp, heroPow).finalChance;
}

function arenaBuildBattleStory(plan, win) {
  const lines = [];
  const tactic = plan.tactic;
  const archetype = plan.archetype;
  const affix = plan.affix;
  lines.push({ tag:'开局', text:`${tactic.icon}${tactic.name}: ${tactic.planText}` });
  if (plan.topPositive) lines.push({ tag:'转折', text: plan.topPositive.text });
  if (plan.topNegative) lines.push({ tag:'风险', text: plan.topNegative.text });
  lines.push({
    tag:'收官',
    text: win
      ? `你顶住了 ${arenaIconHtml(archetype.icon, 14, archetype.name)}${archetype.signature}，在 ${arenaIconHtml(affix.icon, 14, affix.name)}${affix.name} 中把终局拿了下来。`
      : `对手借着 ${arenaIconHtml(archetype.icon, 14, archetype.name)}${archetype.signature} 与 ${arenaIconHtml(affix.icon, 14, affix.name)}${affix.name} 的场地节奏完成反超。`
  });
  return lines;
}

function arenaFight(ranked) {
  ensureArenaState();
  const a = state.arena;
  if (ranked && a.dailyMatches >= ARENA_DAILY_MATCHES) {
    log('⚔️ 今日排位赛次数已用完,明日再战', 'bad');
    return;
  }
  if (!a.opp) arenaRollOpponent();

  const heroPow = arenaHeroPower();
  const opp = a.opp;
  const plan = arenaEvaluateMatchup(a.tactic, opp, heroPow);
  const win = Math.random() < plan.finalChance;
  const oppSnap = {
    icon: opp.icon,
    name: opp.name,
    rating: opp.rating,
    power: opp.power,
    archetypeKey: opp.archetypeKey,
    affixKey: opp.affixKey,
  };

  let ratingDelta = 0;
  let honorGained = 0;
  let sealsGained = 0;
  let tierUpTxt = '';
  let bonusTxt = '';

  if (ranked) {
    a.dailyMatches += 1;
    const swingMul = 1 + Math.max(-0.12, Math.min(0.2, plan.tactic.rewardMult));
    const K = Math.round(24 * swingMul);
    if (win) {
      const delta = Math.max(1, Math.round(K * (1 - plan.finalChance)));
      const before = arenaCurrentTier();
      a.rating += delta;
      a.wins += 1;
      a.streak = Math.max(1, a.streak + 1);
      a.dailyWins += 1;
      if (a.rating > a.best) a.best = a.rating;

      const honor = Math.max(20, Math.round((50 + Math.floor(a.rating / 5) + (a.streak >= 3 ? 30 : 0)) * (1 + plan.tactic.rewardMult + (a.crowd || 0) * 0.003)));
      const seals = Math.max(1, 1 + Math.floor(a.rating / 450) + (a.streak >= 3 ? 1 : 0) + (plan.tactic.sealsBonus || 0));
      state.honor += honor;
      a.seals += seals;
      a.crowd = Math.min(60, a.crowd + 6 + (plan.tactic.crowdOnWin || 0));
      ratingDelta = delta;
      honorGained = honor;
      sealsGained = seals;
      if (typeof questAdvance === 'function') questAdvance('arena', 1);
      if (typeof vaultAdvance === 'function') vaultAdvance('arena', 1);   // 每周宝库·征服

      log(`🏟️ 排位胜利! ${plan.tactic.icon}${plan.tactic.name} 成功压过 ${opp.icon}${opp.name} · 评分+${delta}→${a.rating} · +${honor}🏅 · +${seals}🪙`, 'good');
      const after = arenaTierFor(a.rating);
      if (after.key !== before.key && after.min > before.min) {
        tierUpTxt = `🎖️ 晋级【${after.icon}${after.name}】段位!`;
        if (typeof mountOnArenaTier === 'function') mountOnArenaTier(after.key);   // 段位坐骑
        const rewardTxt = arenaClaimTierReward(after);
        log(`${tierUpTxt}获得新的竞技场被动加成`, 'legend');
        if (rewardTxt) {
          bonusTxt = `晋级奖励: ${rewardTxt}`;
          log(`🎁 ${bonusTxt}`, 'good');
        }
        recomputeStats();
      }
      arenaCheckDailyRewards();
    } else {
      const rawDelta = Math.max(1, Math.round(K * plan.finalChance));
      const guarded = Math.max(1, Math.round(rawDelta * (1 - Math.max(0, plan.tactic.lossGuard || 0))));
      a.rating = Math.max(0, a.rating - guarded);
      a.losses += 1;
      a.streak = Math.min(0, a.streak - 1);
      state.honor += 10;
      a.seals += 1;
      a.crowd = Math.max(0, a.crowd - Math.max(3, 7 - (plan.tactic.crowdOnLose || 0)));
      ratingDelta = -guarded;
      honorGained = 10;
      sealsGained = 1;

      log(`🏟️ 排位失利… ${opp.icon}${opp.name} 顶住了你的 ${plan.tactic.name} · 评分-${guarded}→${a.rating} · +10🏅 · +1🪙`, 'bad');
      const after = arenaTierFor(a.rating);
      const before = arenaTierFor(a.rating + guarded);
      if (after.key !== before.key) recomputeStats();
    }
  } else {
    if (win) {
      a.wins += 1;
      state.honor += 5 + Math.max(0, plan.tactic.sealsBonus || 0);
      a.crowd = Math.min(60, a.crowd + 2 + (plan.tactic.crowdOnWin || 0));
      honorGained = 5 + Math.max(0, plan.tactic.sealsBonus || 0);
      log(`🤺 切磋胜: ${plan.tactic.icon}${plan.tactic.name} 压住了 ${opp.icon}${opp.name} · +${honorGained}🏅`, 'good');
    } else {
      a.losses += 1;
      a.crowd = Math.max(0, a.crowd - 2);
      log(`🤺 切磋负: ${opp.icon}${opp.name} 识破了你的 ${plan.tactic.name}`, 'info');
    }
  }

  const story = arenaBuildBattleStory(plan, win);
  a.lastReport = {
    ranked: !!ranked,
    win: !!win,
    tacticKey: plan.tactic.key,
    oppName: opp.name,
    chance: plan.finalChance,
    story,
  };
  arenaShowResult({
    ranked,
    win,
    heroPow,
    opp: oppSnap,
    ratingDelta,
    ratingAfter: a.rating,
    honorGained,
    sealsGained,
    tierUpTxt,
    bonusTxt,
    plan,
    story,
    crowdAfter: a.crowd,
  });
  arenaRollOpponent();
  markDirty('arena', 'hero');
}

let _arenaAnim = null;
function arenaShowResult(r) {
  const root = $('modal-arena-result'); if (!root) return;
  const modal = root.querySelector('.modal');
  if (modal) modal.style.maxWidth = '460px';
  const c = (typeof getCls === 'function') ? getCls() : null;
  const oppArch = arenaGetArchetype(r.opp.archetypeKey);
  const oppAffix = arenaGetAffix(r.opp.affixKey);

  $('arena-res-hero-emoji').innerHTML = (c && typeof classIcon === 'function')
    ? classIcon(state.cls, 28, c.icon || c.emoji || '⚔️')
    : ((c && c.emoji) || '🧙');
  $('arena-res-hero-name').textContent = state.name || '你';
  $('arena-res-hero-pow').textContent = `战力 ${fmt(r.heroPow)} · 战术 ${r.plan.tactic.name}`;
  $('arena-res-opp-emoji').innerHTML = arenaIconHtml(r.opp.icon, 28, r.opp.name, 'achievement_arena_3v3_9');
  $('arena-res-opp-name').textContent = r.opp.name;
  $('arena-res-opp-pow').textContent = `战力 ${fmt(r.opp.power)} · ${oppArch.name} · ${oppAffix.name}`;

  const title = $('arena-res-title');
  title.textContent = r.ranked ? (r.win ? '🏟️ 排位胜利!' : '🏟️ 排位失利…') : (r.win ? '🤺 切磋获胜' : '🤺 切磋落败');
  title.style.color = r.win ? '#1eff00' : '#ef4444';

  const rewardEl = $('arena-res-reward');
  let html = '';
  if (r.ranked) {
    const sign = r.ratingDelta >= 0 ? '+' : '';
    html += `<div style="display:flex;flex-wrap:wrap;gap:10px 14px;margin-bottom:8px">
      <div>评分 <b style="color:${r.ratingDelta >= 0 ? '#1eff00' : '#ef4444'}">${sign}${r.ratingDelta}</b> → <b>${r.ratingAfter}</b></div>
      <div>荣誉 +${r.honorGained}🏅</div>
      <div>征服印记 +${r.sealsGained || 0}🪙</div>
      <div>热度 ${r.crowdAfter}</div>
    </div>`;
    if (r.tierUpTxt) html += `<div style="color:var(--legend)">${r.tierUpTxt}</div>`;
    if (r.bonusTxt) html += `<div style="color:#fbbf24">${r.bonusTxt}</div>`;
  } else {
    html += `<div style="margin-bottom:8px">${r.honorGained ? `荣誉 +${r.honorGained}🏅` : '<span class="muted">切磋不计评分</span>'} · 热度 ${r.crowdAfter}</div>`;
  }

  html += `<div style="padding:8px;border:1px solid rgba(255,255,255,0.08);border-radius:10px;background:rgba(255,255,255,0.03);margin-top:8px;word-break:break-word">
    <div style="font-weight:bold;margin-bottom:4px">本局解析</div>
    <div class="muted" style="font-size:11px;line-height:1.6">基础胜率 ${Math.round(r.plan.baseChance * 100)}% → 战术后 ${Math.round(r.plan.finalChance * 100)}%</div>
    <div style="display:flex;flex-direction:column;gap:4px;margin-top:6px">`;
  for (const item of r.plan.breakdown) {
    html += `<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
      <span style="flex:1;min-width:0;word-break:break-word">${item.label}</span>
      <span style="white-space:nowrap">${arenaFmtDelta(item.delta)}</span>
    </div>`;
  }
  html += `</div></div>`;

  html += `<div style="padding:8px;border:1px solid rgba(255,255,255,0.08);border-radius:10px;background:rgba(255,255,255,0.03);margin-top:8px;word-break:break-word">
    <div style="font-weight:bold;margin-bottom:4px">对局战报</div>
    <div style="display:flex;flex-direction:column;gap:5px">`;
  for (const line of r.story) {
    html += `<div style="font-size:12px;line-height:1.55"><span style="color:#fbbf24">${line.tag}</span> · ${line.text}</div>`;
  }
  html += `</div></div>`;

  rewardEl.innerHTML = html;
  rewardEl.style.visibility = 'hidden';
  $('arena-res-close').style.visibility = 'hidden';

  const heroBar = $('arena-res-hero-bar');
  const oppBar = $('arena-res-opp-bar');
  const margin = Math.min(1, Math.abs(r.plan.finalChance - 0.5) * 2);
  const winnerRemain = Math.round(24 + margin * 56);
  const heroFinal = r.win ? winnerRemain : 0;
  const oppFinal = r.win ? 0 : winnerRemain;
  heroBar.style.width = '100%';
  oppBar.style.width = '100%';
  root.classList.add('show');

  if (_arenaAnim) clearInterval(_arenaAnim);
  const steps = 18;
  let step = 0;
  _arenaAnim = setInterval(() => {
    step++;
    const t = step / steps;
    heroBar.style.width = Math.max(0, 100 + (heroFinal - 100) * t) + '%';
    oppBar.style.width = Math.max(0, 100 + (oppFinal - 100) * t) + '%';
    if (step >= steps) {
      clearInterval(_arenaAnim);
      _arenaAnim = null;
      rewardEl.style.visibility = 'visible';
      $('arena-res-close').style.visibility = 'visible';
    }
  }, 55);
}

function arenaVendorCost(item, curLvl) {
  return item.baseCost * (curLvl + 1);
}

function arenaArsenalCost(item, curLvl) {
  return item.baseCost * (curLvl + 1);
}

function arenaBuy(key) {
  ensureArenaState();
  const item = ARENA_VENDOR.find(x => x.key === key); if (!item) return;
  const a = state.arena;
  const cur = a.vendor[key] || 0;
  if (cur >= item.max) { log('已达上限', 'bad'); return; }
  const cost = arenaVendorCost(item, cur);
  if (state.honor < cost) { log(`荣誉不足(需 ${cost}🏅)`, 'bad'); return; }
  state.honor -= cost;
  a.vendor[key] = cur + 1;
  log(`🛒 购买【${item.name}】等级${cur + 1} · -${cost}🏅`, 'good');
  recomputeStats();
  markDirty('arena', 'hero');
}

function arenaBuyArsenal(key) {
  ensureArenaState();
  const item = ARENA_ARSENAL.find(x => x.key === key); if (!item) return;
  const a = state.arena;
  const cur = a.arsenal[key] || 0;
  if (cur >= item.max) { log('竞技军械已达上限', 'bad'); return; }
  const cost = arenaArsenalCost(item, cur);
  if (a.seals < cost) { log(`征服印记不足(需 ${cost}🪙)`, 'bad'); return; }
  a.seals -= cost;
  a.arsenal[key] = cur + 1;
  log(`⚒️ 强化【${item.name}】等级${cur + 1} · -${cost}🪙`, 'good');
  recomputeStats();
  markDirty('arena', 'hero');
}

function collectArenaMod() {
  const out = {
    atkPct:0, hpPct:0, defPct:0, spdPct:0, critdPct:0,
    crit:0, leech:0, vers:0, mastery:0, cdReduction:0, extraAtk:0, costReduction:0,
    xpMult:0, goldMult:0, dropMult:0
  };
  if (!state || !state.arena) return out;
  const tier = arenaTierFor(state.arena.rating);
  for (const [k, v] of Object.entries(tier.mod || {})) out[k] = (out[k] || 0) + v;
  for (const item of ARENA_VENDOR) {
    const lv = state.arena.vendor[item.key] || 0;
    if (lv > 0) out[item.stat] = (out[item.stat] || 0) + lv * item.per;
  }
  for (const item of ARENA_ARSENAL) {
    const lv = state.arena.arsenal[item.key] || 0;
    if (lv > 0) out[item.stat] = (out[item.stat] || 0) + lv * item.per;
  }
  return out;
}

function renderArena() {
  const root = $('tab-arena'); if (!root) return;
  ensureArenaState();
  const a = state.arena;
  const tier = arenaTierFor(a.rating);
  const nextTier = ARENA_TIERS.find(t => t.min > a.rating);
  const heroPow = arenaHeroPower();
  const plan = arenaEvaluateMatchup(a.tactic, a.opp, heroPow);
  const tacticRankings = arenaTopTactics(a.opp, heroPow);
  const bestTactic = tacticRankings[0];
  const total = a.wins + a.losses;
  const winRate = total > 0 ? Math.round(a.wins / total * 100) : 0;
  const matchesLeft = ARENA_DAILY_MATCHES - a.dailyMatches;
  const crowdPct = Math.min(100, Math.round((a.crowd || 0) / 60 * 100));
  const opp = a.opp;
  const archetype = arenaGetArchetype(opp.archetypeKey);
  const affix = arenaGetAffix(opp.affixKey);
  const modTxt = Object.entries(tier.mod || {}).map(([k, v]) =>
    (typeof fmtMod === 'function') ? fmtMod(k, v) : `${k}+${v}`).join(' · ') || '无';

  let html = `<div class="ascend-box">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
      <div style="font-weight:bold">🏟️ 竞技场 <span class="muted" style="font-size:11px">(每角色独立)</span></div>
      <div style="font-size:22px">${arenaIconHtml(tier.icon, 22, tier.name, 'achievement_arena_3v3_9')}</div>
    </div>
    <div style="display:flex;align-items:baseline;gap:8px;margin:4px 0;flex-wrap:wrap">
      <span style="font-size:20px;font-weight:bold;color:var(--accent)">${tier.name}</span>
      <span class="muted" style="word-break:break-word">评分 <b style="color:var(--text)">${a.rating}</b> · 最高 ${a.best} · 印记 <b style="color:#fbbf24">${fmt(a.seals)}🪙</b></span>
    </div>`;
  if (nextTier) {
    const span = nextTier.min - tier.min;
    const cur = a.rating - tier.min;
    const pct = span > 0 ? Math.min(100, cur / span * 100) : 0;
    html += `<div class="bar xp" style="margin:4px 0"><i style="width:${pct}%"></i><span>距 ${arenaIconHtml(nextTier.icon, 14, nextTier.name, 'achievement_arena_3v3_9')}${nextTier.name} 还需 ${nextTier.min - a.rating}</span></div>`;
  } else {
    html += `<div class="muted" style="font-size:11px;margin:4px 0">已达最高段位 ⚔️</div>`;
  }
  html += `<div class="muted" style="font-size:10px;margin-top:2px;word-break:break-word">段位被动: ${modTxt}</div>
    <div class="muted" style="font-size:11px;margin-top:4px;word-break:break-word">战绩 ${a.wins}胜 ${a.losses}负 (${winRate}%)${a.streak >= 2 ? ` · 🔥${a.streak}连胜` : (a.streak <= -2 ? ` · 🧊${Math.abs(a.streak)}连败` : '')}</div>
    <div style="margin-top:8px">
      <div style="display:flex;justify-content:space-between;gap:8px;font-size:11px">
        <span>赛场热度</span>
        <span>${a.crowd}/60</span>
      </div>
      <div class="bar hp" style="margin-top:4px"><i style="width:${crowdPct}%;background:linear-gradient(90deg,#f59e0b,#facc15)"></i></div>
      <div class="muted" style="font-size:10px;margin-top:3px;word-break:break-word">热度会小幅提高预估胜率,也会放大奖励收益。</div>
    </div>
  </div>`;

  const wcPct = Math.round(plan.finalChance * 100);
  const basePct = Math.round(plan.baseChance * 100);
  const wcColor = plan.finalChance >= 0.6 ? '#1eff00' : (plan.finalChance >= 0.45 ? '#fbbf24' : '#ef4444');
  html += `<div class="ascend-box">
    <div class="detail-label">⚔️ 当前对手</div>
    <div style="display:flex;align-items:center;gap:10px;margin:4px 0;flex-wrap:wrap">
      <div style="font-size:30px">${arenaIconHtml(opp.icon, 30, opp.name, 'achievement_arena_3v3_9')}</div>
      <div style="flex:1;min-width:180px">
        <div style="font-weight:bold;word-break:break-word">${opp.name}</div>
        <div class="muted" style="font-size:11px;word-break:break-word">评分 ${opp.rating} · ${arenaIconHtml(archetype.icon, 12, archetype.name)} ${archetype.name}</div>
        <div class="muted" style="font-size:10px;word-break:break-word">${arenaIconHtml(affix.icon, 12, affix.name)} ${affix.name} · ${affix.desc}</div>
      </div>
      <div style="text-align:right;min-width:84px">
        <div style="font-size:18px;font-weight:bold;color:${wcColor}">${wcPct}%</div>
        <div class="muted" style="font-size:10px">当前战术胜率</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:6px;margin-top:8px">
      <div style="padding:8px;border:1px solid rgba(255,255,255,0.08);border-radius:10px;background:rgba(255,255,255,0.02)">
        <div class="muted" style="font-size:10px">危险技能</div>
        <div style="font-size:12px;word-break:break-word">${archetype.signature}</div>
      </div>
      <div style="padding:8px;border:1px solid rgba(255,255,255,0.08);border-radius:10px;background:rgba(255,255,255,0.02)">
        <div class="muted" style="font-size:10px">流派特征</div>
        <div style="font-size:12px;word-break:break-word">${archetype.threat}</div>
      </div>
      <div style="padding:8px;border:1px solid rgba(255,255,255,0.08);border-radius:10px;background:rgba(255,255,255,0.02)">
        <div class="muted" style="font-size:10px">推荐战术</div>
        <div style="font-size:12px;word-break:break-word">${bestTactic.tactic.icon} ${bestTactic.tactic.name}</div>
      </div>
    </div>
    <div class="muted" style="font-size:10px;margin-top:8px;word-break:break-word">基础战力胜率 ${basePct}% · 当前战术修正后 ${wcPct}%</div>
  </div>`;

  html += `<div class="ascend-box">
    <div class="detail-label">🧠 竞技战术</div>
    <div class="muted" style="font-size:10px;margin-bottom:8px;word-break:break-word">不再是纯点一下。先看对手流派与场地,再切战术去打克制。</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px">`;
  for (const tacticInfo of tacticRankings) {
    const t = tacticInfo.tactic;
    const selected = t.key === a.tactic;
    const positive = tacticInfo.breakdown.filter(x => x.delta > 0).sort((x, y) => y.delta - x.delta)[0];
    const negative = tacticInfo.breakdown.filter(x => x.delta < 0).sort((x, y) => x.delta - y.delta)[0];
    html += `<button data-action="arenaSetTactic" data-key="${t.key}" style="text-align:left;padding:10px;border-radius:12px;border:1px solid ${selected ? 'rgba(250,204,21,0.55)' : 'rgba(255,255,255,0.08)'};background:${selected ? 'rgba(250,204,21,0.10)' : 'rgba(255,255,255,0.03)'};color:inherit;white-space:normal;word-break:break-word">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
        <div style="font-weight:bold">${t.icon} ${t.name}${t.key === bestTactic.tactic.key ? ' <span style="color:#facc15">推荐</span>' : ''}</div>
        <div style="font-size:16px;color:${tacticInfo.finalChance >= 0.6 ? '#1eff00' : (tacticInfo.finalChance >= 0.45 ? '#fbbf24' : '#ef4444')}">${Math.round(tacticInfo.finalChance * 100)}%</div>
      </div>
      <div class="muted" style="font-size:10px;line-height:1.55;margin-top:4px">${t.desc}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;font-size:10px">
        <span style="padding:2px 6px;border-radius:999px;background:rgba(255,255,255,0.06)">奖励 ${t.rewardMult >= 0 ? '+' : ''}${Math.round(t.rewardMult * 100)}%</span>
        <span style="padding:2px 6px;border-radius:999px;background:rgba(255,255,255,0.06)">掉分保护 ${Math.round((t.lossGuard || 0) * 100)}%</span>
        ${(t.sealsBonus || 0) > 0 ? `<span style="padding:2px 6px;border-radius:999px;background:rgba(255,255,255,0.06)">额外印记 +${t.sealsBonus}</span>` : ''}
      </div>
      ${positive ? `<div style="font-size:10px;color:#86efac;margin-top:6px;line-height:1.45">有利: ${positive.label} ${arenaPct(positive.delta)}</div>` : ''}
      ${negative ? `<div style="font-size:10px;color:#fca5a5;margin-top:3px;line-height:1.45">风险: ${negative.label} ${arenaPct(negative.delta)}</div>` : ''}
    </button>`;
  }
  html += `</div>
    <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
      <button class="gold" data-action="arenaRanked" ${matchesLeft <= 0 ? 'disabled' : ''} style="flex:2;min-width:180px">⚔️ 排位赛 (${matchesLeft}/${ARENA_DAILY_MATCHES})</button>
      <button class="success" data-action="arenaSkirmish" style="flex:1;min-width:120px">🤺 切磋</button>
      <button data-action="arenaReroll" ${state.honor < arenaRerollCost() ? 'disabled' : ''} title="更换对手 (${arenaRerollCost()}🏅)">🔄 ${arenaRerollCost()}🏅</button>
    </div>
    <div class="muted" style="font-size:10px;margin-top:6px;word-break:break-word">当前方案: ${plan.tactic.icon}${plan.tactic.name} · ${plan.report[0]}</div>
    <div class="muted" style="font-size:10px;margin-top:3px;word-break:break-word">你的战力评估: ${fmt(heroPow)}</div>
  </div>`;

  html += `<div class="ascend-box">
    <div class="detail-label">🎯 每日竞技赏</div>`;
  for (const entry of ARENA_DAILY_REWARDS) {
    const claimed = !!a.dailyRewards[`w${entry.wins}`];
    const reached = a.dailyWins >= entry.wins;
    html += `<div class="ascend-milestone ${claimed ? 'reached' : ''}" style="padding:6px;margin-top:4px;opacity:${reached || claimed ? 1 : 0.65}">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap">
        <div style="min-width:0;flex:1">
          <div style="font-weight:bold;word-break:break-word">${entry.wins} 场排位胜利</div>
          <div class="muted" style="font-size:10px;word-break:break-word">${arenaRewardText(entry.reward)}</div>
        </div>
        <div class="muted" style="font-size:10px">${claimed ? '已领取' : `${Math.max(0, entry.wins - a.dailyWins)} 场后解锁`}</div>
      </div>
    </div>`;
  }
  html += `<div class="muted" style="font-size:10px;margin-top:4px">今日排位胜场 ${a.dailyWins} / ${ARENA_DAILY_REWARDS[ARENA_DAILY_REWARDS.length - 1].wins}</div>
  </div>`;

  html += `<div class="ascend-box">
    <div class="detail-label">🛒 荣誉商店 <span class="muted" style="font-size:10px">(当前 ${fmt(state.honor)}🏅)</span></div>`;
  for (const item of ARENA_VENDOR) {
    const lv = a.vendor[item.key] || 0;
    const maxed = lv >= item.max;
    const cost = arenaVendorCost(item, lv);
    const afford = state.honor >= cost;
    html += `<div class="ascend-milestone ${lv > 0 ? 'reached' : ''}" style="padding:6px;margin-top:4px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:180px">
          <div style="font-size:20px">${arenaIconHtml(item.icon, 20, item.name, 'spell_holy_powerinfusion')}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:bold;word-break:break-word">${item.name} <span class="muted" style="font-size:10px">等级${lv}/${item.max}</span></div>
            <div class="muted" style="font-size:10px;word-break:break-word">${item.desc}</div>
          </div>
        </div>
        <button class="${afford && !maxed ? 'gold' : ''}" data-action="arenaBuy" data-key="${item.key}" ${maxed || !afford ? 'disabled' : ''} style="padding:4px 8px;font-size:11px">
          ${maxed ? '已满' : `${fmt(cost)}🏅`}
        </button>
      </div>
    </div>`;
  }
  html += `</div>`;

  html += `<div class="ascend-box">
    <div class="detail-label">⚒️ 征服军械库 <span class="muted" style="font-size:10px">(当前 ${fmt(a.seals)}🪙)</span></div>`;
  for (const item of ARENA_ARSENAL) {
    const lv = a.arsenal[item.key] || 0;
    const maxed = lv >= item.max;
    const cost = arenaArsenalCost(item, lv);
    const afford = a.seals >= cost;
    html += `<div class="ascend-milestone ${lv > 0 ? 'reached' : ''}" style="padding:6px;margin-top:4px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:180px">
          <div style="font-size:20px">${arenaIconHtml(item.icon, 20, item.name, 'achievement_arena_3v3_9')}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:bold;word-break:break-word">${item.name} <span class="muted" style="font-size:10px">等级${lv}/${item.max}</span></div>
            <div class="muted" style="font-size:10px;word-break:break-word">${item.desc}</div>
          </div>
        </div>
        <button class="${afford && !maxed ? 'gold' : ''}" data-action="arenaBuyArsenal" data-key="${item.key}" ${maxed || !afford ? 'disabled' : ''} style="padding:4px 8px;font-size:11px">
          ${maxed ? '已满' : `${fmt(cost)}🪙`}
        </button>
      </div>
    </div>`;
  }
  html += `<div class="muted" style="font-size:10px;margin-top:4px;word-break:break-word">征服印记仅来自排位赛、每日竞技赏与段位首达奖励。</div></div>`;

  html += `<div class="ascend-box"><div class="detail-label">🏅 段位与被动一览</div>`;
  for (const t of ARENA_TIERS) {
    const reached = a.rating >= t.min;
    const isCur = t.key === tier.key;
    const tmod = Object.entries(t.mod || {}).map(([k, v]) => (typeof fmtMod === 'function') ? fmtMod(k, v) : `${k}+${v}`).join(' · ') || '—';
    const rewardTxt = arenaRewardText(t.reward);
    html += `<div style="display:flex;justify-content:space-between;gap:8px;padding:3px 0;opacity:${reached ? 1 : 0.5};${isCur ? 'font-weight:bold' : ''};flex-wrap:wrap">
      <span>${arenaIconHtml(t.icon, 16, t.name, 'achievement_arena_3v3_9')} ${t.name} <span class="muted" style="font-size:10px">${t.min}+</span></span>
      <span class="muted" style="font-size:10px;text-align:right;word-break:break-word">${tmod}${rewardTxt !== '—' ? `<br>首达: ${rewardTxt}` : ''}</span>
    </div>`;
  }
  html += `</div>`;

  root.innerHTML = html;
}
