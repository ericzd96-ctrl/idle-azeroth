/* =========================================================
   quests.js — 每日/每周任务板(账号共享,目标感+领奖闭环)
   ----------------------------------------------------------
   - 每日 3 个、每周 3 个任务,按"天/周种子"确定性洗出(同周期稳定、跨期重洗)
   - 目标复用现有事件:野怪击杀/地图首领/副本通关/竞技场胜/镶嵌宝石/赚金币
   - 进度由各中央钩子调 questAdvance(type, amt) 累计(即使不看面板也照常推进)
   - 完成可领奖(金币/荣誉/精华/钻石/通用券),全清再给一份额外赏
   存档:account.quests = { day, week, daily:[{key,prog,claimed}], weekly:[...],
                           dailyBonusClaimed, weeklyBonusClaimed }
   只存 key/prog/claimed,任务定义(名称/目标/奖励)从 POOL 按 key 派生(不序列化函数)。
   ========================================================= */

const QUEST_DAILY_COUNT = 3;
const QUEST_WEEKLY_COUNT = 3;

/* 每日任务池(具体目标 + 固定奖励;每天按种子取 3 个不同 key) */
const QUEST_DAILY_POOL = [
  { key:'d_kill1', type:'kill',    icon:'⚔️', goal:150,   label:n=>`击杀 ${n} 只野怪`,       reward:{ gold:8000,  honor:120 } },
  { key:'d_kill2', type:'kill',    icon:'🗡️', goal:320,   label:n=>`击杀 ${n} 只野怪`,       reward:{ gold:16000, essence:8 } },
  { key:'d_boss',  type:'boss',    icon:'👹', goal:3,     label:n=>`击败 ${n} 个地图首领`,   reward:{ honor:300,  gem:6 } },
  { key:'d_dgn',   type:'dungeon', icon:'🏰', goal:2,     label:n=>`通关 ${n} 个副本`,       reward:{ essence:12, gem:8 } },
  { key:'d_arena', type:'arena',   icon:'🏟️', goal:3,     label:n=>`竞技场排位胜利 ${n} 场`, reward:{ honor:400,  gem:5 } },
  { key:'d_gem',   type:'gem',     icon:'💎', goal:2,     label:n=>`镶嵌 ${n} 颗宝石`,       reward:{ gold:10000, essence:6 } },
  { key:'d_gold',  type:'gold',    icon:'💰', goal:60000, label:n=>`赚取 ${fmt(n)} 金币`,    reward:{ gem:6,      honor:150 } },
];
const QUEST_DAILY_BONUS = { gold:30000, gem:12, essence:10 };

/* 每周任务池(更大目标、更厚奖励) */
const QUEST_WEEKLY_POOL = [
  { key:'w_kill',  type:'kill',    icon:'⚔️', goal:2500, label:n=>`本周累计击杀 ${fmt(n)} 只野怪`, reward:{ gold:120000, gem:40, essence:30 } },
  { key:'w_boss',  type:'boss',    icon:'👹', goal:25,   label:n=>`本周击败 ${n} 个地图首领`,      reward:{ honor:2500, gem:50 } },
  { key:'w_dgn',   type:'dungeon', icon:'🏰', goal:12,   label:n=>`本周通关 ${n} 个副本`,          reward:{ essence:80, gem:60, tickets:3 } },
  { key:'w_arena', type:'arena',   icon:'🏟️', goal:15,   label:n=>`本周竞技场胜利 ${n} 场`,        reward:{ honor:3000, gem:50 } },
  { key:'w_gem',   type:'gem',     icon:'💎', goal:20,   label:n=>`本周镶嵌 ${n} 颗宝石`,          reward:{ gold:150000, essence:40 } },
];
const QUEST_WEEKLY_BONUS = { gold:300000, gem:80, essence:60, tickets:2 };

function questDayIndex() { return Math.floor(Date.now() / 86400000); }
function questWeekIndex() { return Math.floor(Date.now() / 86400000 / 7); }

/* 确定性 PRNG(同周期稳定洗牌) */
function questRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function questPick(pool, count, seed) {
  const a = pool.slice();
  const rnd = questRng(seed);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, count).map(def => ({ key: def.key, prog: 0, claimed: false }));
}

function ensureQuestState() {
  if (typeof account === 'undefined' || !account) return null;
  if (!account.quests || typeof account.quests !== 'object') {
    account.quests = { day: -1, week: -1, daily: [], weekly: [], dailyBonusClaimed: false, weeklyBonusClaimed: false };
  }
  const q = account.quests;
  if (typeof q.day !== 'number') q.day = -1;
  if (typeof q.week !== 'number') q.week = -1;
  if (!Array.isArray(q.daily)) q.daily = [];
  if (!Array.isArray(q.weekly)) q.weekly = [];
  const today = questDayIndex(), thisWeek = questWeekIndex();
  if (q.day !== today) {
    q.day = today;
    q.daily = questPick(QUEST_DAILY_POOL, QUEST_DAILY_COUNT, (today * 2654435761) >>> 0);
    q.dailyBonusClaimed = false;
  }
  if (q.week !== thisWeek) {
    q.week = thisWeek;
    q.weekly = questPick(QUEST_WEEKLY_POOL, QUEST_WEEKLY_COUNT, (thisWeek * 40503 + 17) >>> 0);
    q.weeklyBonusClaimed = false;
  }
  return q;
}

function questDef(item, isWeekly) {
  const pool = isWeekly ? QUEST_WEEKLY_POOL : QUEST_DAILY_POOL;
  return pool.find(d => d.key === item.key) || null;
}

/* 进度推进 — 由各中央事件钩子调用(combat/progression/arena)
   注意:每次击杀都会调到,故这里"不要" markDirty('quests')——否则任务面板开着时
   会每帧重建 DOM 导致领取按钮闪烁/点击落空(同背包闪烁坑)。面板靠 questLiveTick
   (节流~1.2s,仅可见时)刷新进度条;导航红点靠 updateNavBadges 独立轮询。 */
function questAdvance(type, amt) {
  if (amt === undefined) amt = 1;
  const q = ensureQuestState(); if (!q) return;
  for (const [list, pool] of [[q.daily, QUEST_DAILY_POOL], [q.weekly, QUEST_WEEKLY_POOL]]) {
    for (const item of list) {
      const def = pool.find(d => d.key === item.key);
      if (!def || def.type !== type || item.claimed) continue;
      if (item.prog < def.goal) item.prog = Math.min(def.goal, item.prog + amt);
    }
  }
}

/* 任务面板可见时,节流重渲染让进度条滚动(仿 expeditionLiveTick,避免每帧重建) */
let _questLivePaint = 0;
function questLiveTick() {
  const panel = document.getElementById('tab-quests');
  if (!panel || !panel.classList.contains('active')) return;
  const now = Date.now();
  if (now - _questLivePaint < 1200) return;
  _questLivePaint = now;
  if (typeof renderQuests === 'function') renderQuests();
}

function questRewardText(r) {
  if (!r) return '—';
  const parts = [];
  if (r.gold) parts.push(`${fmt(r.gold)}💰`);
  if (r.honor) parts.push(`${r.honor}🎖️`);
  if (r.essence) parts.push(`${r.essence}🔮`);
  if (r.gem) parts.push(`${r.gem}💎`);
  if (r.tickets) parts.push(`${r.tickets}🎫`);
  return parts.join(' ');
}

function questGrant(r) {
  if (!r) return;
  if (r.gold) state.gold += r.gold;
  if (r.honor) state.honor += r.honor;
  if (r.essence) state.essence += r.essence;
  if (r.gem) state.gem += r.gem;
  if (r.tickets) state.tickets += r.tickets;
}

function claimQuest(key) {
  const q = ensureQuestState(); if (!q) return;
  for (const [list, isWeekly] of [[q.daily, false], [q.weekly, true]]) {
    const item = list.find(x => x.key === key); if (!item) continue;
    const def = questDef(item, isWeekly); if (!def) return;
    if (item.claimed) { log('该任务已领取', 'info'); return; }
    if (item.prog < def.goal) { log('任务尚未完成', 'bad'); return; }
    item.claimed = true;
    questGrant(def.reward);
    log(`📋 ${isWeekly ? '周常' : '日常'}任务完成「${def.label(def.goal)}」· ${questRewardText(def.reward)}`, 'epic');
    questCheckBonus(q);
    markDirty('quests', 'hero');
    if (typeof renderQuests === 'function') renderQuests();
    if (typeof saveState === 'function') saveState();
    return;
  }
}

/* 全清额外赏 */
function questCheckBonus(q) {
  if (!q.dailyBonusClaimed && q.daily.length && q.daily.every(it => it.claimed)) {
    q.dailyBonusClaimed = true;
    questGrant(QUEST_DAILY_BONUS);
    log(`🎁 今日日常全清! 额外奖励 ${questRewardText(QUEST_DAILY_BONUS)}`, 'legend');
  }
  if (!q.weeklyBonusClaimed && q.weekly.length && q.weekly.every(it => it.claimed)) {
    q.weeklyBonusClaimed = true;
    questGrant(QUEST_WEEKLY_BONUS);
    log(`🎁 本周周常全清! 额外奖励 ${questRewardText(QUEST_WEEKLY_BONUS)}`, 'legend');
  }
}

/* 导航红点:有可领取的任务 */
function questHasClaimable() {
  const q = ensureQuestState(); if (!q) return false;
  for (const [list, isWeekly] of [[q.daily, false], [q.weekly, true]]) {
    for (const item of list) {
      const def = questDef(item, isWeekly);
      if (def && !item.claimed && item.prog >= def.goal) return true;
    }
  }
  return false;
}

/* ---------- 渲染 ---------- */
function questCardHtml(item, isWeekly) {
  const def = questDef(item, isWeekly); if (!def) return '';
  const done = item.prog >= def.goal;
  const pct = Math.min(100, Math.round(item.prog / def.goal * 100));
  const barColor = item.claimed ? '#22c55e' : (done ? '#facc15' : 'linear-gradient(90deg,#3b82f6,#60a5fa)');
  return `<div style="padding:8px;border:1px solid var(--border);border-radius:10px;margin-bottom:6px;${item.claimed ? 'opacity:.55' : ''}">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
      <div style="font-size:13px;font-weight:bold;min-width:0;flex:1;word-break:break-word">${def.icon} ${def.label(def.goal)}</div>
      <button class="${!item.claimed && done ? 'gold' : ''}" data-action="claimQuest" data-key="${item.key}" ${item.claimed || !done ? 'disabled' : ''} style="padding:4px 10px;font-size:11px">
        ${item.claimed ? '✅已领' : (done ? '领取' : '进行中')}
      </button>
    </div>
    <div class="bar xp" style="margin-top:6px"><i style="width:${pct}%;background:${barColor}"></i><span>${fmt(Math.min(item.prog, def.goal))} / ${fmt(def.goal)}</span></div>
    <div class="muted" style="font-size:10px;margin-top:4px;word-break:break-word">奖励:${questRewardText(def.reward)}</div>
  </div>`;
}

function questResetText(targetIdx, isWeekly) {
  // 距下次刷新(UTC 天/周边界)的粗略小时数
  const ms = isWeekly
    ? ((questWeekIndex() + 1) * 7 * 86400000) - Date.now()
    : ((questDayIndex() + 1) * 86400000) - Date.now();
  const h = Math.max(0, Math.floor(ms / 3600000));
  const m = Math.max(0, Math.floor((ms % 3600000) / 60000));
  return h >= 1 ? `${h} 小时后刷新` : `${m} 分钟后刷新`;
}

function renderQuests() {
  const panel = document.getElementById('tab-quests');
  if (!panel) return;
  const q = ensureQuestState();
  if (!q) { panel.innerHTML = '<div class="muted">读取中…</div>'; return; }

  const dailyDone = q.daily.filter(it => it.claimed).length;
  const weeklyDone = q.weekly.filter(it => it.claimed).length;

  let html = `<div style="margin-bottom:8px">
    <div style="font-weight:bold;font-size:15px">📋 任务板</div>
    <div class="muted" style="font-size:11px;margin-top:2px">每日 / 每周自动刷新一批目标,完成靠正常游玩自动累计。全清额外加赏。</div>
  </div>`;

  html += `<div class="ascend-box">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
      <div class="detail-label" style="margin:0">🗓️ 每日任务 <span class="muted" style="font-size:10px">(${dailyDone}/${q.daily.length})</span></div>
      <div class="muted" style="font-size:10px">${questResetText(q.day, false)}</div>
    </div>
    <div style="margin-top:6px">${q.daily.map(it => questCardHtml(it, false)).join('')}</div>
    <div class="ascend-milestone ${q.dailyBonusClaimed ? 'reached' : ''}" style="padding:6px;margin-top:2px;${q.dailyBonusClaimed ? '' : 'opacity:.75'}">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
        <div style="font-weight:bold;font-size:12px">🎁 全清额外赏</div>
        <div class="muted" style="font-size:10px;word-break:break-word">${questRewardText(QUEST_DAILY_BONUS)} · ${q.dailyBonusClaimed ? '已发放' : '清空全部日常自动发放'}</div>
      </div>
    </div>
  </div>`;

  html += `<div class="ascend-box">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
      <div class="detail-label" style="margin:0">📆 每周任务 <span class="muted" style="font-size:10px">(${weeklyDone}/${q.weekly.length})</span></div>
      <div class="muted" style="font-size:10px">${questResetText(q.week, true)}</div>
    </div>
    <div style="margin-top:6px">${q.weekly.map(it => questCardHtml(it, true)).join('')}</div>
    <div class="ascend-milestone ${q.weeklyBonusClaimed ? 'reached' : ''}" style="padding:6px;margin-top:2px;${q.weeklyBonusClaimed ? '' : 'opacity:.75'}">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
        <div style="font-weight:bold;font-size:12px">🎁 周常全清额外赏</div>
        <div class="muted" style="font-size:10px;word-break:break-word">${questRewardText(QUEST_WEEKLY_BONUS)} · ${q.weeklyBonusClaimed ? '已发放' : '清空全部周常自动发放'}</div>
      </div>
    </div>
  </div>`;

  panel.innerHTML = html;
}
