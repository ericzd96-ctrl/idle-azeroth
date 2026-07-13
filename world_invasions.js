/* =========================================================
   world_invasions.js — 世界入侵
   ----------------------------------------------------------
   每 3 天轮换 3 条入侵前线。击杀、通关副本、稀有精英和世界Boss会推进
   当前前线进度,完成后领取本期战利品。
   ========================================================= */

const WORLD_INVASION_CYCLE_DAYS = 3;
const INVASION_KARESH_BANNER = 'assets/wow/art/karesh-invasion-banner.png';
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
  { key:'karesh_devourer', icon:'🧿', name:'吞界裂潮', color:'#38bdf8', desc:'吞界裂潮撕开卡雷什荒原,幸存圆顶正被成片拖入虚无。', goal:980, tags:['kill','dungeon','rare'], reward:{gold:420000, essence:140, waystoneFragments:4}, mapKeys:['karesh','rhovan'], dungeonKeys:['archival_assault','ecodome_aldani','oasis_succession','ecodome_rhovan'], rareMapKeys:['karesh','rhovan'], art:'assets/wow/art/karesh-map.png', focus:'卡雷什荒原 / 罗凡圆顶', contextBonus:{ kill:1, dungeon:90, rare:120 } },
  { key:'shadowguard_fleet', icon:'🌑', name:'影卫舰列', color:'#8b5cf6', desc:'影卫舰队在影点与沙恩多拉间重建相位封锁,猎令直指一切援军。', goal:1160, tags:['kill','dungeon','worldBoss'], reward:{gold:520000, honor:4800, apexMarks:20}, mapKeys:['shadow_point','shandorah'], dungeonKeys:['shadowpoint_breach','overlook_zoshul','manaforge_omega','shandorah_conclave'], worldBossKeys:['shadowpoint_vexis','shandorah_astromancer'], art:'assets/wow/art/shadow-point.png', focus:'影点 / 沙恩多拉 / 法力熔炉航线', contextBonus:{ kill:1, dungeon:110, worldBoss:260 } },
  { key:'primeus_redaction', icon:'📚', name:'普莱姆斯删改令', color:'#67e8f9', desc:'抄录圣所把闯入者与幸存者一并标记为“待删改对象”,秘库正在主动清场。', goal:1040, tags:['kill','dungeon','rare'], reward:{gold:560000, gem:160, essence:160, waystoneFragments:5}, mapKeys:['primeus'], dungeonKeys:['primeus_repository'], rareMapKeys:['primeus'], art:'assets/wow/art/primeus-repository.png', focus:'秘境:普莱姆斯 / 档案秘库', contextBonus:{ kill:2, dungeon:180, rare:180 } },
  { key:'voidrazor_breach', icon:'🪐', name:'虚刃裂幕', color:'#f472b6', desc:'虚无剃刀庇护所的边界正在崩落,每一道裂幕都在把吞界观测体送往前线。', goal:1240, tags:['dungeon','rare','worldBoss'], reward:{gold:640000, essence:220, apexMarks:28, waystoneFragments:6}, mapKeys:['voidrazor'], dungeonKeys:['voidrazor_sanctum'], rareMapKeys:['voidrazor'], worldBossKeys:['shandorah_astromancer'], art:'assets/wow/art/voidrazor-sanctum.png', focus:'虚无剃刀庇护所 / 终域裂幕', contextBonus:{ dungeon:220, rare:200, worldBoss:320 } },
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
  if (r.apexMarks) parts.push(`${r.apexMarks}✦`);
  if (r.waystoneFragments) parts.push(`${r.waystoneFragments}🪨`);
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
function invasionBaseDungeonKey(key) {
  return (typeof baseDungeonKey === 'function') ? baseDungeonKey(key) : String(key || '');
}
function invasionFrontMatchesContext(front, ctx) {
  if (!front || !ctx) return false;
  const dungeonKey = ctx.dungeonKey ? invasionBaseDungeonKey(ctx.dungeonKey) : '';
  if (dungeonKey && Array.isArray(front.dungeonKeys) && front.dungeonKeys.includes(dungeonKey)) return true;
  if (ctx.worldBossKey && Array.isArray(front.worldBossKeys) && front.worldBossKeys.includes(ctx.worldBossKey)) return true;
  if (ctx.rareKey && Array.isArray(front.rareKeys) && front.rareKeys.includes(ctx.rareKey)) return true;
  if (ctx.mapKey) {
    if (Array.isArray(front.mapKeys) && front.mapKeys.includes(ctx.mapKey)) return true;
    if (Array.isArray(front.rareMapKeys) && front.rareMapKeys.includes(ctx.mapKey)) return true;
  }
  return false;
}
function invasionAddContextualProgress(type, ctx) {
  const wi = ensureWorldInvasions();
  const cycle = invasionCycleKey();
  const active = activeInvasionFronts();
  let changed = false;
  for (const front of active) {
    if (!front.tags.includes(type) || !invasionFrontMatchesContext(front, ctx)) continue;
    if (wi.claimed[invasionClaimKey(front.key, cycle)]) continue;
    const cur = wi.progress[cycle][front.key] || 0;
    if (cur >= front.goal) continue;
    const bonus = Math.max(0, Math.floor(front.contextBonus?.[type] || 0));
    if (!bonus) continue;
    wi.progress[cycle][front.key] = Math.min(front.goal, cur + bonus);
    changed = true;
  }
  if (changed && typeof markDirty === 'function') markDirty('events');
}
function invasionRareMapKey(mon) {
  if (mon?.mapKey) return mon.mapKey;
  const rare = (typeof RARE_ELITES !== 'undefined' ? RARE_ELITES : []).find(r => r.key === mon?.rareKey || r.name === mon?.bossName);
  return rare?.mapKey || '';
}
function grantInvasionReward(r) {
  if (r.gold) state.gold += r.gold;
  if (r.gem) state.gem += r.gem;
  if (r.honor) state.honor += r.honor;
  if (r.essence) state.essence += r.essence;
  if (r.tickets) state.tickets = (state.tickets || 0) + r.tickets;
  if (r.apexMarks) {
    if (typeof ensureEventState === 'function') ensureEventState();
    if (!state.worldBoss) state.worldBoss = { lastKill:{}, shards:0, totalKilled:0, stageClears:{}, rareKills:{}, apexMarks:0 };
    state.worldBoss.apexMarks = (state.worldBoss.apexMarks || 0) + r.apexMarks;
  }
  if (r.waystoneFragments && typeof grantWaystoneFragmentsRaw === 'function') {
    grantWaystoneFragmentsRaw(r.waystoneFragments, 'world_invasion');
  }
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
  let html = `<div class="invasion-hero" style="background-image:linear-gradient(90deg, rgba(8,12,24,.92), rgba(8,12,24,.56)), url('${INVASION_KARESH_BANNER}')">
    <div class="invasion-hero-title">🛡️ 世界入侵前线</div>
    <div class="invasion-hero-text">世界入侵轮换: <b>${fmtCd(cd)}</b> 后换线 · 已压制 <b>${wi.totalClaims || 0}</b> 条前线 · 卡雷什前线现可额外产出 <b>界碑碎片</b> 与 <b>星痕</b>。</div>
  </div>
  <div class="prog-summary muted">击杀、副本、稀有精英和世界Boss会自动推进当前开放的入侵前线; 若目标正好属于卡雷什、影点、普莱姆斯或虚无剃刀战区,会获得额外进度。</div>
  <div class="invasion-grid">`;
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
    const cardStyle = front.art
      ? `border-left-color:${front.color};background-image:linear-gradient(180deg, rgba(9,12,22,.18), rgba(9,12,22,.92)), url('${front.art}');background-size:cover;background-position:center;`
      : `border-left-color:${front.color}`;
    html += `<div class="invasion-card ${claimed ? 'claimed' : (done ? 'ready' : '')} ${front.art ? 'art' : ''}" style="${cardStyle}">
      <div class="invasion-head">
        <span class="invasion-icon">${front.icon}</span>
        <div><b style="color:${front.color}">${front.name}</b><div class="muted" style="font-size:10px">${front.desc}</div></div>
      </div>
      <div class="muted" style="font-size:10px;margin-top:5px">贡献来源: ${invasionSourceText(front)}</div>
      ${front.focus ? `<div class="invasion-focus">${front.focus}</div>` : ''}
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
      invasionAddContextualProgress('kill', { mapKey: state?.travel?.mapKey || '' });
      return out;
    };
    wrapped.__invasionWrapped = true;
    globalThis.eventsOnKill = wrapped;
  }
  const oldDungeon = globalThis.eventsOnDungeonClear;
  if (typeof oldDungeon === 'function' && !oldDungeon.__invasionWrapped) {
    const wrapped = function() {
      const ds = state?.dungeonState || state?.mythicState;
      const dungeonKey = invasionBaseDungeonKey(ds?.key);
      const out = oldDungeon.apply(this, arguments);
      invasionAddProgress('dungeon', INVASION_PROGRESS_GAIN.dungeon);
      invasionAddContextualProgress('dungeon', { dungeonKey });
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
      invasionAddContextualProgress('rare', { rareKey: mon?.rareKey, mapKey: invasionRareMapKey(mon) });
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
      invasionAddContextualProgress('worldBoss', { worldBossKey: mon?.wbKey || mon?.key || '' });
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
