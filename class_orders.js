/* =========================================================
   class_orders.js — 职业大厅委托
   ----------------------------------------------------------
   9 个职业各 5 条委托,账号共享领取状态,当前职业领取对应大厅奖励。
   ========================================================= */

const CLASS_ORDER_THEMES = {
  warrior: { hall:'英勇殿堂', icon:'⚔️', color:'#c79c6e', title:'英勇统帅', words:['战旗归位','破阵演武','盾墙誓令','巨物讨伐','英灵终试'] },
  mage:    { hall:'提瑞斯秘室', icon:'🧙', color:'#69ccf0', title:'大法师顾问', words:['奥术校准','镜像演算','法环巡检','魔网讨伐','守护者终试'] },
  priest:  { hall:'圣光圣所', icon:'✨', color:'#f0ebe0', title:'圣所司祭', words:['烛火誓约','祷文抄录','庇护巡礼','暗影净化','圣光终试'] },
  rogue:   { hall:'暗影密会', icon:'🗡️', color:'#fff569', title:'密会首席', words:['密令传递','毒刃校准','暗巷清算','首领刺探','无声终试'] },
  hunter:  { hall:'神射营地', icon:'🏹', color:'#abd473', title:'神射统领', words:['鹰眼测距','兽群巡猎','陷阱布设','巨兽追踪','荒野终试'] },
  shaman:  { hall:'元素议庭', icon:'🌩️', color:'#0070de', title:'元素议长', words:['图腾归位','风暴占卜','大地调律','元素讨伐','升腾终试'] },
  paladin: { hall:'银色圣堂', icon:'🔨', color:'#f58cba', title:'圣堂统帅', words:['圣契誓约','审判操演','壁垒巡礼','邪影净化','圣光终试'] },
  warlock: { hall:'黑镰议会', icon:'😈', color:'#9482c9', title:'黑镰顾问', words:['契约封蜡','灵魂称量','魔典校阅','恶魔讨伐','黑镰终试'] },
  druid:   { hall:'梦境林地', icon:'🌿', color:'#ff7d0a', title:'林地守望者', words:['种籽唤醒','星痕巡礼','兽形演武','梦魇净化','林地终试'] },
};

const CLASS_ORDER_MISSION_TEMPLATES = [
  { key:'oath', icon:'📜', goalText:'当前角色达到 Lv.20', reqs:[{type:'charLevel', goal:20}], reward:{gold:18000, gem:12, essence:6} },
  { key:'field', icon:'⚔️', goalText:'账号累计击杀 1200', reqs:[{type:'kills', goal:1200}], reward:{gold:52000, honor:700, essence:12} },
  { key:'arsenal', icon:'🏰', goalText:'账号累计通关副本 8 次', reqs:[{type:'dungeon', goal:8}], reward:{gold:90000, gem:35, tickets:1, stat:{atkPct:1,hpPct:1}} },
  { key:'hunt', icon:'🐲', goalText:'账号累计击败世界Boss 10 次', reqs:[{type:'worldBoss', goal:10}], reward:{gold:180000, gem:80, honor:1800, essence:35, stat:{mastery:4}} },
  { key:'final', icon:'👑', goalText:'当前角色 Lv.80 且副本通关 25 次', reqs:[{type:'charLevel', goal:80}, {type:'dungeon', goal:25}], reward:{gold:360000, gem:160, honor:3600, essence:70, stat:{atkPct:3,hpPct:3,defPct:2,mastery:8}} },
];

function ensureClassOrders() {
  if (!account && typeof defaultAccount === 'function') account = defaultAccount();
  if (!account.classOrders) account.classOrders = { claimed:{} };
  if (!account.classOrders.claimed) account.classOrders.claimed = {};
  return account.classOrders;
}

function classOrderCurrentClass() {
  return state?.cls || '';
}

function classOrderMetric(type) {
  const acc = typeof accEns === 'function' ? accEns() : account;
  if (type === 'charLevel') return state?.hero?.lvl || 1;
  if (type === 'kills') return acc?.killsTotal || 0;
  if (type === 'dungeon') return acc?.dungeonClearsTotal || 0;
  if (type === 'worldBoss') return typeof accountWorldBossTotalKills === 'function' ? accountWorldBossTotalKills() : 0;
  if (type === 'rare') return typeof accountRareEliteTotalKills === 'function' ? accountRareEliteTotalKills() : 0;
  return 0;
}

function classOrderReqLabel(req) {
  const labels = {
    charLevel:'角色等级',
    kills:'累计击杀',
    dungeon:'副本通关',
    worldBoss:'世界Boss',
    rare:'稀有精英',
  };
  return labels[req.type] || req.type;
}

function classOrderReqsDone(reqs) {
  return reqs.every(req => classOrderMetric(req.type) >= req.goal);
}

function classOrderMissionKey(clsKey, tplKey) {
  return `${clsKey}_${tplKey}`;
}

function classOrderMissionsFor(clsKey) {
  const theme = CLASS_ORDER_THEMES[clsKey];
  if (!theme) return [];
  const clsName = (typeof CLASSES !== 'undefined' && CLASSES[clsKey]?.name) || clsKey;
  return CLASS_ORDER_MISSION_TEMPLATES.map((tpl, idx) => {
    const finalReward = Object.assign({}, tpl.reward);
    if (tpl.key === 'final') finalReward.title = theme.title;
    return {
      key: classOrderMissionKey(clsKey, tpl.key),
      clsKey,
      clsName,
      hall: theme.hall,
      icon: tpl.icon,
      color: theme.color,
      name: `${theme.words[idx]} · ${clsName}`,
      goalText: tpl.goalText,
      reqs: tpl.reqs,
      reward: finalReward,
    };
  });
}

function classOrderAllMissions() {
  return Object.keys(CLASS_ORDER_THEMES).flatMap(classOrderMissionsFor);
}

function classOrderClaimedCount(clsKey) {
  const co = ensureClassOrders();
  return classOrderAllMissions().filter(m => (!clsKey || m.clsKey === clsKey) && co.claimed[m.key]).length;
}

function classOrderRewardText(r) {
  const parts = [];
  if (r.gold) parts.push(`${fmt(r.gold)}💰`);
  if (r.gem) parts.push(`${r.gem}💎`);
  if (r.honor) parts.push(`${fmt(r.honor)}🏅`);
  if (r.essence) parts.push(`${r.essence}✨`);
  if (r.tickets) parts.push(`${r.tickets}🎟️`);
  if (r.stat) {
    const stats = Object.entries(r.stat).map(([k, v]) => typeof fmtMod === 'function' ? fmtMod(k, v) : `${k}+${v}`);
    if (stats.length) parts.push(stats.join(' / '));
  }
  if (r.title) parts.push(`称号「${r.title}」`);
  return parts.join(' ');
}

function classOrderGrantReward(r) {
  if (r.gold) state.gold += r.gold;
  if (r.gem) state.gem += r.gem;
  if (r.honor) state.honor += r.honor;
  if (r.essence) state.essence += r.essence;
  if (r.tickets) state.tickets = (state.tickets || 0) + r.tickets;
  if (r.title && typeof unlockTitle === 'function') unlockTitle(r.title);
  if (r.stat) {
    const acc = typeof accEns === 'function' ? accEns() : account;
    acc.permanentStats = acc.permanentStats || {};
    for (const [k, v] of Object.entries(r.stat)) acc.permanentStats[k] = (acc.permanentStats[k] || 0) + v;
    if (typeof recomputeStats === 'function') recomputeStats();
  }
}

function claimClassOrderMission(key) {
  const co = ensureClassOrders();
  const mission = classOrderAllMissions().find(m => m.key === key);
  if (!mission) return false;
  if (classOrderCurrentClass() !== mission.clsKey) { log('需要切换到对应职业才能领取职业大厅委托', 'bad'); return false; }
  if (co.claimed[key]) { log('该职业大厅委托已领取', 'info'); return false; }
  if (!classOrderReqsDone(mission.reqs)) { log('职业大厅委托尚未完成', 'bad'); return false; }
  co.claimed[key] = Date.now();
  classOrderGrantReward(mission.reward);
  log(`🏛️ 完成职业大厅委托「${mission.name}」· ${classOrderRewardText(mission.reward)}`, 'legend');
  if (typeof progressionCheckAch === 'function') progressionCheckAch();
  markDirty('progression','hero');
  return true;
}

function renderClassOrderMission(mission) {
  const co = ensureClassOrders();
  const claimed = !!co.claimed[mission.key];
  const done = classOrderReqsDone(mission.reqs);
  const activeClass = classOrderCurrentClass() === mission.clsKey;
  const cls = claimed ? 'claimed' : (done && activeClass ? 'ready' : '');
  const reqHtml = mission.reqs.map(req => {
    const cur = classOrderMetric(req.type);
    const ok = cur >= req.goal;
    const pct = Math.min(100, req.goal ? cur / req.goal * 100 : 0);
    return `<div class="class-order-req ${ok ? 'done' : ''}">
      <div><span>${ok ? '✓' : '•'} ${classOrderReqLabel(req)}</span><b>${fmt(Math.min(cur, req.goal))}/${fmt(req.goal)}</b></div>
      <div class="bar xp" style="height:5px"><i style="width:${pct}%"></i></div>
    </div>`;
  }).join('');
  const btn = claimed
    ? '<span class="muted">✓已完成</span>'
    : done && activeClass
      ? `<button class="gold" data-action="claimclassorder" data-key="${mission.key}">领取委托</button>`
      : `<span class="muted" style="font-size:10px">${activeClass ? '进行中' : '需当前职业'}</span>`;
  return `<div class="class-order-card ${cls}" style="border-left-color:${mission.color}">
    <div class="class-order-head">
      <span class="class-order-icon">${mission.icon}</span>
      <div><b>${mission.name}</b><div class="muted" style="font-size:10px">${mission.goalText}</div></div>
    </div>
    ${reqHtml}
    <div class="class-order-foot">
      <span class="muted" style="font-size:10px">${classOrderRewardText(mission.reward)}</span>
      ${btn}
    </div>
  </div>`;
}

function renderClassOrderSubtab() {
  ensureClassOrders();
  const clsKey = classOrderCurrentClass();
  if (!clsKey || !CLASS_ORDER_THEMES[clsKey]) return '<div class="prog-summary muted">创建角色后开放职业大厅。</div>';
  const theme = CLASS_ORDER_THEMES[clsKey];
  const missions = classOrderMissionsFor(clsKey);
  const claimed = classOrderClaimedCount(clsKey);
  const totalClaimed = classOrderClaimedCount();
  const ready = missions.filter(m => !ensureClassOrders().claimed[m.key] && classOrderReqsDone(m.reqs)).length;
  const clsName = (typeof CLASSES !== 'undefined' && CLASSES[clsKey]?.name) || clsKey;
  return `<div class="prog-summary muted">
      ${theme.icon} <b style="color:${theme.color}">${theme.hall}</b> · 当前职业 ${clsName} · 委托 <b>${claimed}/${missions.length}</b> · 全账号 <b>${totalClaimed}/${classOrderAllMissions().length}</b> · 可领取 <b style="color:var(--legend)">${ready}</b>
      <div style="font-size:10px;margin-top:3px">每个职业 5 条委托,切换到对应职业后可领取。奖励含资源、永久属性与职业称号。</div>
    </div>
    <div class="class-order-grid">${missions.map(renderClassOrderMission).join('')}</div>`;
}

if (typeof globalThis !== 'undefined') {
  globalThis.renderClassOrderSubtab = renderClassOrderSubtab;
  globalThis.claimClassOrderMission = claimClassOrderMission;
  globalThis.classOrderClaimedCount = classOrderClaimedCount;
  globalThis.CLASS_ORDER_THEMES = CLASS_ORDER_THEMES;
}
