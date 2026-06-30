/* =========================================================
   world_invasions.js — 世界入侵
   ----------------------------------------------------------
   每 3 天轮换 3 条入侵前线。击杀、通关副本、稀有精英和世界Boss会推进
   当前前线进度,完成后领取本期战利品。
   ========================================================= */

const WORLD_INVASION_CYCLE_DAYS = 3;
const WORLD_INVASION_FRONTS = [
  { key:'scourge', icon:'☠️', name:'天灾余烬', color:'#94a3b8', desc:'冰冷亡者在旧战场重新集结。', goal:620, tags:['kill','dungeon'], reward:{gold:120000, honor:900, essence:35} },
  { key:'legion', icon:'😈', name:'军团裂隙', color:'#22c55e', desc:'邪能裂隙撕开天空,召来燃烧军团残部。', goal:760, tags:['kill','rare','worldBoss'], reward:{gold:160000, gem:55, essence:48} },
  { key:'twilight', icon:'👁️', name:'暮光低语', color:'#a855f7', desc:'暮光信徒在低语中寻找新的献祭目标。', goal:700, tags:['kill','rare'], reward:{gold:150000, honor:1400, essence:42} },
  { key:'elemental', icon:'🌋', name:'元素暴走', color:'#f97316', desc:'火焰、风暴与大地在失衡中冲击各地。', goal:680, tags:['kill','dungeon'], reward:{gold:145000, gem:45, essence:50} },
  { key:'pirate', icon:'⚓', name:'海盗封锁', color:'#38bdf8', desc:'海盗舰队拦截航道,劫掠补给与宝石。', goal:540, tags:['kill','dungeon'], reward:{gold:210000, tickets:1, honor:700} },
  { key:'black_dragon', icon:'🐲', name:'黑龙密令', color:'#ef4444', desc:'黑龙信使正在回收危险的古代誓约。', goal:820, tags:['rare','worldBoss'], reward:{gold:220000, gem:75, essence:70} },
  { key:'primalist', icon:'🌩️', name:'原始风暴', color:'#22d3ee', desc:'原始主义者召来风暴,试图重塑群岛秩序。', goal:900, tags:['kill','rare','worldBoss'], reward:{gold:260000, gem:90, honor:1800} },
  { key:'infinite', icon:'⏳', name:'永恒扰流', color:'#facc15', desc:'永恒龙裔扰乱时间线,让旧敌重新现身。', goal:780, tags:['dungeon','worldBoss'], reward:{gold:240000, essence:90, tickets:2} },
  { key:'mogu', icon:'⚡', name:'魔古雷令', color:'#eab308', desc:'雷霆遗民寻找重铸帝国的古代命令。', goal:650, tags:['kill','dungeon'], reward:{gold:175000, honor:1600, essence:45} },
  { key:'nightmare', icon:'🌑', name:'梦魇蔓延', color:'#84cc16', desc:'翡翠梦魇的残根在林地深处继续扩散。', goal:720, tags:['kill','rare'], reward:{gold:190000, gem:65, essence:58} },
  { key:'void', icon:'🕳️', name:'虚空回声', color:'#6366f1', desc:'虚空回声在群星边缘寻找薄弱的现实。', goal:860, tags:['rare','worldBoss'], reward:{gold:280000, gem:100, essence:85} },
  { key:'qiraji', icon:'🪲', name:'其拉虫潮', color:'#c084fc', desc:'沉睡虫群沿旧日隧道再次涌动。', goal:600, tags:['kill','rare'], reward:{gold:155000, honor:1200, essence:44} },
];

const INVASION_PROGRESS_GAIN = { kill:1, dungeon:120, rare:180, worldBoss:500 };

function invasionCycleIndex(now = Date.now()) {
  return Math.floor(now / (WORLD_INVASION_CYCLE_DAYS * 86400000));
}
function invasionCycleKey(now = Date.now()) {
  return String(invasionCycleIndex(now));
}
function invasionCycleEndsAt(now = Date.now()) {
  return (invasionCycleIndex(now) + 1) * WORLD_INVASION_CYCLE_DAYS * 86400000;
}
function invasionRng(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function activeInvasionFronts(now = Date.now()) {
  const arr = WORLD_INVASION_FRONTS.slice();
  const rnd = invasionRng(invasionCycleIndex(now) * 1103515245 + 97);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, 3);
}

function ensureWorldInvasions() {
  if (!account && typeof defaultAccount === 'function') account = defaultAccount();
  if (!account.worldInvasions) account.worldInvasions = { progress:{}, claimed:{}, totalClaims:0 };
  const wi = account.worldInvasions;
  if (!wi.progress) wi.progress = {};
  if (!wi.claimed) wi.claimed = {};
  if (typeof wi.totalClaims !== 'number') wi.totalClaims = 0;
  const cycle = invasionCycleKey();
  if (!wi.progress[cycle]) wi.progress[cycle] = {};
  return wi;
}

function invasionClaimKey(frontKey, cycle = invasionCycleKey()) {
  return `${cycle}:${frontKey}`;
}
function invasionProgress(front) {
  const wi = ensureWorldInvasions();
  return wi.progress[invasionCycleKey()]?.[front.key] || 0;
}
function invasionCompletedCount() {
  const wi = ensureWorldInvasions();
  return wi.totalClaims || 0;
}
function invasionRewardText(r) {
  const parts = [];
  if (r.gold) parts.push(`${fmt(r.gold)}💰`);
  if (r.gem) parts.push(`${r.gem}💎`);
  if (r.honor) parts.push(`${fmt(r.honor)}🏅`);
  if (r.essence) parts.push(`${r.essence}✨`);
  if (r.tickets) parts.push(`${r.tickets}🎫`);
  return parts.join(' ');
}
function invasionSourceText(front) {
  const labels = { kill:'击杀', dungeon:'副本', rare:'稀有', worldBoss:'世界Boss' };
  return front.tags.map(t => labels[t] || t).join(' / ');
}
function invasionAddProgress(type, amount) {
  const gain = amount || INVASION_PROGRESS_GAIN[type] || 0;
  if (!gain) return;
  const wi = ensureWorldInvasions();
  const cycle = invasionCycleKey();
  const active = activeInvasionFronts();
  let changed = false;
  for (const front of active) {
    if (!front.tags.includes(type)) continue;
    if (wi.claimed[invasionClaimKey(front.key, cycle)]) continue;
    const cur = wi.progress[cycle][front.key] || 0;
    if (cur >= front.goal) continue;
    wi.progress[cycle][front.key] = Math.min(front.goal, cur + gain);
    changed = true;
  }
  if (changed && typeof markDirty === 'function') markDirty('events');
}
function grantInvasionReward(r) {
  if (r.gold) state.gold += r.gold;
  if (r.gem) state.gem += r.gem;
  if (r.honor) state.honor += r.honor;
  if (r.essence) state.essence += r.essence;
  if (r.tickets) state.tickets = (state.tickets || 0) + r.tickets;
}
function claimWorldInvasion(frontKey) {
  const wi = ensureWorldInvasions();
  const cycle = invasionCycleKey();
  const front = activeInvasionFronts().find(f => f.key === frontKey);
  if (!front) { log('该入侵前线本期未开放', 'bad'); return false; }
  const ckey = invasionClaimKey(front.key, cycle);
  if (wi.claimed[ckey]) { log('本期入侵奖励已领取', 'info'); return false; }
  if (invasionProgress(front) < front.goal) { log('入侵压制进度不足', 'bad'); return false; }
  wi.claimed[ckey] = Date.now();
  wi.totalClaims = (wi.totalClaims || 0) + 1;
  grantInvasionReward(front.reward);
  log(`🛡️ 压制世界入侵「${front.name}」· ${invasionRewardText(front.reward)}`, 'legend');
  if (typeof progressionCheckAch === 'function') progressionCheckAch();
  markDirty('events','progression','hero');
  return true;
}

function renderWorldInvasionSub() {
  const wi = ensureWorldInvasions();
  const cycle = invasionCycleKey();
  const cd = Math.max(0, Math.ceil((invasionCycleEndsAt() - Date.now()) / 1000));
  const active = activeInvasionFronts();
  let html = `<div class="prog-summary muted">世界入侵轮换: <b>${fmtCd(cd)}</b> 后换线 · 已压制 <b>${wi.totalClaims || 0}</b> 条前线
    <div style="font-size:10px;margin-top:3px">击杀、副本、稀有精英和世界Boss会自动推进当前开放的入侵前线。</div>
  </div><div class="invasion-grid">`;
  for (const front of active) {
    const cur = invasionProgress(front);
    const done = cur >= front.goal;
    const claimed = !!wi.claimed[invasionClaimKey(front.key, cycle)];
    const pct = Math.min(100, cur / front.goal * 100);
    const btn = claimed
      ? '<span class="muted">✓已领取</span>'
      : done
        ? `<button class="gold" data-action="claiminvasion" data-key="${front.key}">领取战利品</button>`
        : `<span class="muted" style="font-size:10px">${fmt(cur)}/${fmt(front.goal)}</span>`;
    html += `<div class="invasion-card ${claimed ? 'claimed' : (done ? 'ready' : '')}" style="border-left-color:${front.color}">
      <div class="invasion-head">
        <span class="invasion-icon">${front.icon}</span>
        <div><b style="color:${front.color}">${front.name}</b><div class="muted" style="font-size:10px">${front.desc}</div></div>
      </div>
      <div class="muted" style="font-size:10px;margin-top:5px">贡献来源: ${invasionSourceText(front)}</div>
      <div class="bar xp" style="height:7px;margin-top:4px"><i style="width:${pct}%"></i></div>
      <div class="invasion-foot">
        <span class="muted" style="font-size:10px">${invasionRewardText(front.reward)}</span>
        ${btn}
      </div>
    </div>`;
  }
  html += '</div>';
  return html;
}

(function installWorldInvasionHooks(){
  const oldKill = globalThis.eventsOnKill;
  if (typeof oldKill === 'function' && !oldKill.__invasionWrapped) {
    const wrapped = function(mon) {
      const out = oldKill.apply(this, arguments);
      invasionAddProgress('kill', INVASION_PROGRESS_GAIN.kill);
      return out;
    };
    wrapped.__invasionWrapped = true;
    globalThis.eventsOnKill = wrapped;
  }
  const oldDungeon = globalThis.eventsOnDungeonClear;
  if (typeof oldDungeon === 'function' && !oldDungeon.__invasionWrapped) {
    const wrapped = function() {
      const out = oldDungeon.apply(this, arguments);
      invasionAddProgress('dungeon', INVASION_PROGRESS_GAIN.dungeon);
      return out;
    };
    wrapped.__invasionWrapped = true;
    globalThis.eventsOnDungeonClear = wrapped;
  }
  const oldRare = globalThis.onRareEliteKill;
  if (typeof oldRare === 'function' && !oldRare.__invasionWrapped) {
    const wrapped = function(mon) {
      const out = oldRare.apply(this, arguments);
      invasionAddProgress('rare', INVASION_PROGRESS_GAIN.rare);
      return out;
    };
    wrapped.__invasionWrapped = true;
    globalThis.onRareEliteKill = wrapped;
  }
  const oldWb = globalThis.onWorldBossKill;
  if (typeof oldWb === 'function' && !oldWb.__invasionWrapped) {
    const wrapped = function(mon) {
      const out = oldWb.apply(this, arguments);
      invasionAddProgress('worldBoss', INVASION_PROGRESS_GAIN.worldBoss);
      return out;
    };
    wrapped.__invasionWrapped = true;
    globalThis.onWorldBossKill = wrapped;
  }
})();

if (typeof globalThis !== 'undefined') {
  globalThis.WORLD_INVASION_FRONTS = WORLD_INVASION_FRONTS;
  globalThis.renderWorldInvasionSub = renderWorldInvasionSub;
  globalThis.claimWorldInvasion = claimWorldInvasion;
  globalThis.invasionCompletedCount = invasionCompletedCount;
}
