/* =========================================================
   guild.js — 公会/社团(单机伪公会,账号共享)
   ----------------------------------------------------------
   - 每日捐献(消耗金币/精华)→ 公会贡献点 + 公会经验
   - 公会经验升级 → 解锁 NPC 成员(被动加成)
   - 公会科技树:花贡献点研究 → 账号级永久属性加成
   - collectGuildMod() 接入 combat.js recomputeStats / killMonster
   ========================================================= */

const GUILD_MAX_LEVEL = 25;

/* 公会科技(每级一份 mod,collectGuildMod 按已研究等级累加) */
const GUILD_TECHS = [
  { key:'might',    name:'军备库',   icon:'⚔️', max:5, mod:{ atkPct:2 },           desc:'攻击力' },
  { key:'bulwark',  name:'锻甲坊',   icon:'🛡️', max:5, mod:{ hpPct:2, defPct:2 },  desc:'生命与防御' },
  { key:'fortune',  name:'金库',     icon:'💰', max:5, mod:{ goldMult:5 },         desc:'金币获取' },
  { key:'scholar',  name:'藏书阁',   icon:'📚', max:5, mod:{ xpMult:5 },           desc:'经验获取' },
  { key:'treasure', name:'寻宝指南', icon:'🎁', max:5, mod:{ dropMult:5 },         desc:'装备掉率' },
  { key:'precision',name:'演武场',   icon:'🎯', max:5, mod:{ crit:1 },             desc:'暴击' },
  { key:'runes',    name:'符文台',   icon:'🔮', max:5, mod:{ mastery:2 },          desc:'精通' },
  { key:'swift',    name:'驯兽栏',   icon:'💨', max:3, mod:{ spdPct:3 },           desc:'攻速' },
];

/* NPC 成员:公会等级到达即加入,提供小幅被动 */
const GUILD_MEMBERS = [
  { lvl:1,  name:'巡逻兵 马库斯',   icon:'🗡️', mod:{ atkPct:1 } },
  { lvl:2,  name:'铁匠 高尔',       icon:'🔨', mod:{ defPct:1 } },
  { lvl:3,  name:'商人 莉娜',       icon:'💰', mod:{ goldMult:2 } },
  { lvl:5,  name:'大法师 安东尼达斯',icon:'🧙', mod:{ mastery:2 } },
  { lvl:7,  name:'游侠 维蕾萨',     icon:'🏹', mod:{ crit:1 } },
  { lvl:10, name:'大主教 本尼迪塔斯',icon:'⛪', mod:{ hpPct:2 } },
  { lvl:13, name:'大法师 卡德加',   icon:'✨', mod:{ xpMult:3 } },
  { lvl:16, name:'先知 萨尔',       icon:'⚡', mod:{ atkPct:2, hpPct:2 } },
  { lvl:20, name:'圣光使者 乌瑟尔', icon:'🌟', mod:{ atkPct:3, defPct:3 } },
  { lvl:25, name:'大酋长',          icon:'👑', mod:{ atkPct:4, hpPct:4, goldMult:5 } },
];

/* 每日捐献(每项每天可做一次)*/
const GUILD_DONATIONS = [
  { key:'gold_s', name:'小额捐金', icon:'💰', cost:{ gold:3000 },  contrib:12, xp:18 },
  { key:'gold_l', name:'巨额捐金', icon:'💰', cost:{ gold:15000 }, contrib:60, xp:80 },
  { key:'ess',    name:'精华奉献', icon:'🔮', cost:{ essence:6 },  contrib:50, xp:70 },
];

function ensureGuildState() {
  if (typeof account === 'undefined' || !account) return null;
  if (!account.guild || typeof account.guild !== 'object') {
    account.guild = { level:1, xp:0, contrib:0, tech:{}, donatedDay:0, donatedKeys:[] };
  }
  const g = account.guild;
  if (typeof g.level !== 'number' || g.level < 1) g.level = 1;
  if (typeof g.xp !== 'number') g.xp = 0;
  if (typeof g.contrib !== 'number') g.contrib = 0;
  if (!g.tech || typeof g.tech !== 'object') g.tech = {};
  if (typeof g.donatedDay !== 'number') g.donatedDay = 0;
  if (!Array.isArray(g.donatedKeys)) g.donatedKeys = [];
  return g;
}

function guildDayIndex() { return Math.floor(Date.now() / 86400000); }

/* 跨天重置每日捐献 */
function guildRefreshDaily() {
  const g = ensureGuildState(); if (!g) return;
  const today = guildDayIndex();
  if (g.donatedDay !== today) { g.donatedDay = today; g.donatedKeys = []; }
}

function guildXpNeeded(lvl) { return Math.floor(100 * Math.pow(1.35, lvl - 1)); }

function addGuildXp(n) {
  const g = ensureGuildState(); if (!g || n <= 0) return;
  g.xp += n;
  while (g.level < GUILD_MAX_LEVEL && g.xp >= guildXpNeeded(g.level)) {
    g.xp -= guildXpNeeded(g.level);
    g.level++;
    const joined = GUILD_MEMBERS.find(m => m.lvl === g.level);
    log('🏰 公会升至 Lv.' + g.level + (joined ? `,${joined.icon}${joined.name} 加入了公会!` : ''), 'epic');
  }
  if (g.level >= GUILD_MAX_LEVEL) g.xp = 0;
}

function guildUnlockedMembers() {
  const g = ensureGuildState(); if (!g) return [];
  return GUILD_MEMBERS.filter(m => g.level >= m.lvl);
}

/* 公会加成 = 科技(按研究等级)+ 已解锁成员被动 */
function collectGuildMod() {
  const out = { atkPct:0, hpPct:0, defPct:0, critdPct:0, spdPct:0, crit:0, leech:0, vers:0, mastery:0, xpMult:0, goldMult:0, dropMult:0 };
  const g = (typeof account !== 'undefined' && account) ? account.guild : null;
  if (!g) return out;
  if (g.tech) for (const t of GUILD_TECHS) {
    const r = g.tech[t.key] || 0; if (!r) continue;
    for (const [k, v] of Object.entries(t.mod)) if (k in out) out[k] += v * r;
  }
  if (typeof guildUnlockedMembers === 'function') for (const m of guildUnlockedMembers()) {
    if (m.mod) for (const [k, v] of Object.entries(m.mod)) if (k in out) out[k] += v;
  }
  return out;
}

function guildTechCost(t, rank) { return Math.floor(30 + rank * 28 + (t.key === 'fortune' || t.key === 'scholar' || t.key === 'treasure' ? 12 : 0)); }

function researchGuildTech(key) {
  const g = ensureGuildState(); if (!g) return;
  const t = GUILD_TECHS.find(x => x.key === key); if (!t) return;
  const r = g.tech[key] || 0;
  if (r >= t.max) { log('该科技已满级', 'info'); return; }
  const cost = guildTechCost(t, r);
  if ((g.contrib || 0) < cost) { log('🏰 贡献点不足,需要 ' + cost, 'bad'); return; }
  g.contrib -= cost;
  g.tech[key] = r + 1;
  log(`🏰 研究 ${t.icon}${t.name} 至 Lv.${r + 1}`, 'good');
  if (typeof recomputeStats === 'function') recomputeStats();
  markDirty('guild', 'hero');
  if (typeof renderGuild === 'function') renderGuild();
  if (typeof saveState === 'function') saveState();
}

function donateGuild(key) {
  guildRefreshDaily();
  const g = ensureGuildState(); if (!g) return;
  const d = GUILD_DONATIONS.find(x => x.key === key); if (!d) return;
  if (g.donatedKeys.includes(key)) { log('🏰 今天已经进行过这项捐献了', 'info'); return; }
  // 检查并扣除消耗
  for (const [res, amt] of Object.entries(d.cost)) {
    if ((account[res] || 0) < amt) { log('资源不足,无法捐献(' + (res === 'gold' ? '金币' : res === 'essence' ? '精华' : res) + ')', 'bad'); return; }
  }
  for (const [res, amt] of Object.entries(d.cost)) account[res] = (account[res] || 0) - amt;
  g.contrib = (g.contrib || 0) + d.contrib;
  addGuildXp(d.xp);
  g.donatedKeys.push(key);
  log(`🏰 ${d.icon}${d.name}:+${d.contrib} 贡献点,公会经验 +${d.xp}`, 'good');
  markDirty('guild', 'hero');
  if (typeof renderGuild === 'function') renderGuild();
  if (typeof saveState === 'function') saveState();
}

/* ---------- 渲染 ---------- */
function renderGuild() {
  const panel = document.getElementById('tab-guild');
  if (!panel) return;
  guildRefreshDaily();
  const g = ensureGuildState();
  const need = g.level >= GUILD_MAX_LEVEL ? 0 : guildXpNeeded(g.level);
  const xpPct = need ? Math.min(100, g.xp / need * 100) : 100;
  const members = guildUnlockedMembers();
  const mod = collectGuildMod();

  const modSummary = Object.entries(mod).filter(([, v]) => v)
    .map(([k, v]) => `${guildStatLabel(k)} +${v}${guildStatPercent(k) ? '%' : ''}`).join(' · ') || '暂无';

  const donateRows = GUILD_DONATIONS.map(d => {
    const done = g.donatedKeys.includes(d.key);
    const costTxt = Object.entries(d.cost).map(([r, a]) => `${fmt(a)}${r === 'gold' ? '💰' : r === 'essence' ? '🔮' : r}`).join('+');
    return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px">
      <div style="font-size:12px"><b>${d.icon}${d.name}</b> <span class="muted">花 ${costTxt} → +${d.contrib}贡献 +${d.xp}经验</span></div>
      <button data-action="guildDonate" data-key="${d.key}" ${done ? 'disabled' : ''}>${done ? '✅今日已捐' : '捐献'}</button>
    </div>`;
  }).join('');

  const techRows = GUILD_TECHS.map(t => {
    const r = g.tech[t.key] || 0;
    const maxed = r >= t.max;
    const cost = maxed ? 0 : guildTechCost(t, r);
    const canBuy = !maxed && (g.contrib || 0) >= cost;
    return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px">
      <div style="font-size:12px"><b>${t.icon}${t.name}</b> <span class="muted">${t.desc} +${guildTechPerRank(t)}/级 · ${r}/${t.max}</span></div>
      <button data-action="guildResearch" data-key="${t.key}" ${maxed || !canBuy ? 'disabled' : ''}>${maxed ? '已满级' : `研究 · ${cost}🏅`}</button>
    </div>`;
  }).join('');

  const memberChips = GUILD_MEMBERS.map(m => {
    const on = g.level >= m.lvl;
    return `<span style="display:inline-block;font-size:11px;padding:3px 6px;margin:2px;border-radius:6px;border:1px solid var(--border);${on ? '' : 'opacity:.4'}" title="${Object.entries(m.mod).map(([k, v]) => guildStatLabel(k) + ' +' + v + (guildStatPercent(k) ? '%' : '')).join(' ')}">${m.icon}${m.name}${on ? '' : `(Lv.${m.lvl})`}</span>`;
  }).join('');

  panel.innerHTML = `
    <div style="margin-bottom:8px">
      <div style="font-weight:bold;font-size:15px">🏰 公会 · Lv.${g.level}${g.level >= GUILD_MAX_LEVEL ? '(满级)' : ''}</div>
      <div class="muted" style="font-size:11px;margin-top:2px">每日捐献攒贡献点 → 研究公会科技 → 全账号永久加成。升级解锁 NPC 成员。</div>
    </div>

    <div style="border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:10px;background:var(--panel-2)">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
        <span>公会经验</span><span class="muted">${g.level >= GUILD_MAX_LEVEL ? 'MAX' : fmt(g.xp) + ' / ' + fmt(need)}</span>
      </div>
      <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden;margin-bottom:8px"><div style="height:100%;width:${xpPct}%;background:var(--accent)"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:bold">
        <span>🏅 贡献点:${fmt(g.contrib || 0)}</span>
      </div>
      <div class="muted" style="font-size:11px;margin-top:4px">当前公会总加成:${modSummary}</div>
    </div>

    <div style="font-size:12px;font-weight:bold;margin-bottom:6px">📅 每日捐献</div>
    ${donateRows}

    <div style="font-size:12px;font-weight:bold;margin:10px 0 6px">🔬 公会科技</div>
    ${techRows}

    <div style="font-size:12px;font-weight:bold;margin:10px 0 6px">👥 成员(${members.length}/${GUILD_MEMBERS.length})</div>
    <div>${memberChips}</div>
  `;
}

function guildTechPerRank(t) {
  return Object.entries(t.mod).map(([k, v]) => `${guildStatLabel(k)} ${v}${guildStatPercent(k) ? '%' : ''}`).join('/');
}
function guildStatPercent(k) {
  return ['atkPct', 'hpPct', 'defPct', 'critdPct', 'spdPct', 'xpMult', 'goldMult', 'dropMult'].includes(k);
}
function guildStatLabel(k) {
  const map = { atkPct:'攻击', hpPct:'生命', defPct:'防御', critdPct:'暴伤', spdPct:'攻速', crit:'暴击', leech:'吸血', vers:'全能', mastery:'精通', xpMult:'经验', goldMult:'金币', dropMult:'掉率' };
  return map[k] || k;
}
