/* =========================================================
   paragon.js — 巅峰系统 / Paragon(满级后无限成长,per-char)
   ----------------------------------------------------------
   满级(MAX_LEVEL)后,本会"浪费掉"的经验全部转化为【巅峰经验】→ 无限的
   巅峰等级,每级 +1 巅峰点,投入【巅峰盘】4 大类节点(可无限叠,小幅永久加成)。
   给挂机玩家"永远在变强"的终局体验,填补"满级即停"的空白。
   - 经验路由:combat.js gainXP 在满级分支改为 paragonGainXp(amt)(原本丢弃)
   - 加成:collectParagonMod()→标准 schema,recompute 新增"巅峰"来源块(公会块后)
     + killMonster 的 xp/gold/dropMult 乘区(同公会)
   - 里程碑:特定巅峰等级一次性奖励(钻石/精华/称号)
   存档:state.paragon = { xp, lvl, points, board:{nodeKey:rank}, ms:{lvl:true} }(per-char)
   ========================================================= */

const PARAGON_BOARD = [
  { key:'offense', name:'杀伐', icon:'⚔️', color:'#ef4444', nodes:[
    { key:'o_atk',     name:'力量灌注', icon:'💪', stat:'atkPct',   per:0.5 },
    { key:'o_critd',   name:'致命强化', icon:'💥', stat:'critdPct', per:1.5 },
    { key:'o_crit',    name:'精准打击', icon:'🎯', stat:'crit',     per:0.3 },
    { key:'o_mastery', name:'专精精通', icon:'🌀', stat:'mastery',  per:1 },
  ]},
  { key:'defense', name:'坚韧', icon:'🛡️', color:'#3b82f6', nodes:[
    { key:'d_hp',   name:'生命洪流', icon:'❤️', stat:'hpPct',  per:0.6 },
    { key:'d_def',  name:'铁壁',     icon:'🧱', stat:'defPct', per:0.5 },
    { key:'d_vers', name:'全能',     icon:'✴️', stat:'vers',   per:0.3 },
    { key:'d_leech',name:'鲜血渴求', icon:'🩸', stat:'leech',  per:0.3 },
  ]},
  { key:'utility', name:'增幅', icon:'🔮', color:'#a855f7', nodes:[
    { key:'u_spd',   name:'迅捷',     icon:'💨', stat:'spdPct',      per:0.5 },
    { key:'u_cdr',   name:'冷却缩减', icon:'⏱️', stat:'cdReduction', per:0.3 },
    { key:'u_extra', name:'连击强化', icon:'⚡', stat:'extraAtk',    per:0.3 },
    { key:'u_heal',  name:'治疗强化', icon:'💚', stat:'healBonus',   per:0.5 },
  ]},
  { key:'fortune', name:'富集', icon:'💰', color:'#facc15', nodes:[
    { key:'f_gold', name:'点金术', icon:'💰', stat:'goldMult', per:2 },
    { key:'f_drop', name:'寻宝',   icon:'🎁', stat:'dropMult', per:1.5 },
    { key:'f_xp',   name:'博学',   icon:'📖', stat:'xpMult',   per:1.5 },
    { key:'f_reg',  name:'生生不息', icon:'🌱', stat:'regFlat', per:1 },
  ]},
];

/* 巅峰核心节点 / Keystones:在某一大类累计投入达阈值即自动解锁强力专属加成。
   鼓励"专精一类"而非平铺。mod 键须是 recompute 巅峰块支持的(含特色:executeBonus/
   reflectDmg/armorPen/dodge/dotBonus/costReduction/xpMult/goldMult/dropMult)。 */
const PARAGON_KEYSTONES = {
  offense: [
    { key:'ks_focus',  name:'致命专注', icon:'🎯', req:25, mod:{ crit:5, critdPct:15 },   desc:'专精杀伐 25 点:暴击 +5 · 暴伤 +15%' },
    { key:'ks_reaper', name:'斩杀宗师', icon:'💀', req:75, mod:{ executeBonus:10, atkPct:8 }, desc:'专精杀伐 75 点:斩杀加成 +10 · 攻击 +8%' },
  ],
  defense: [
    { key:'ks_wall',   name:'坚不可摧', icon:'🧱', req:25, mod:{ defPct:8, hpPct:8 },      desc:'专精坚韧 25 点:防御 +8% · 生命 +8%' },
    { key:'ks_thorns', name:'荆棘领域', icon:'🌵', req:75, mod:{ reflectDmg:10, dodge:8 },  desc:'专精坚韧 75 点:反伤 +10 · 闪避 +8' },
  ],
  utility: [
    { key:'ks_haste',  name:'急速领悟', icon:'⚡', req:25, mod:{ cdReduction:8, extraAtk:6 }, desc:'专精增幅 25 点:冷却缩减 +8% · 额外攻击 +6%' },
    { key:'ks_pierce', name:'破甲大师', icon:'🗡️', req:75, mod:{ armorPen:15, spdPct:6 },    desc:'专精增幅 75 点:破甲 +15 · 攻速 +6%' },
  ],
  fortune: [
    { key:'ks_midas',  name:'黄金触感', icon:'🪙', req:25, mod:{ goldMult:20, dropMult:10 },  desc:'专精富集 25 点:金币 +20% · 掉率 +10%' },
    { key:'ks_sage',   name:'贤者之石', icon:'💠', req:75, mod:{ xpMult:25, goldMult:30 },    desc:'专精富集 75 点:经验 +25% · 金币 +30%' },
  ],
};

const PARAGON_MILESTONES = [
  { lvl:10,  reward:{ gem:30 } },
  { lvl:25,  reward:{ gem:60, essence:40 } },
  { lvl:50,  reward:{ gem:120, essence:80 }, title:'巅峰' },
  { lvl:100, reward:{ gem:300, essence:150 }, title:'不朽巅峰' },
  { lvl:200, reward:{ gem:600, essence:300 }, title:'传奇巅峰' },
  { lvl:500, reward:{ gem:2000, essence:800 }, title:'永恒巅峰' },
];

/* 单位含义见 STAT_NAMES;百分比类直接显示 */
const PARAGON_STAT_LABEL = {
  atkPct:'攻击', hpPct:'生命', defPct:'防御', critdPct:'暴伤', crit:'暴击',
  mastery:'精通', vers:'全能', leech:'吸血', spdPct:'攻速', cdReduction:'冷却缩减',
  extraAtk:'额外攻击', healBonus:'治疗', regFlat:'生命回复',
  goldMult:'金币', dropMult:'掉率', xpMult:'经验',
  executeBonus:'斩杀', reflectDmg:'反伤', armorPen:'破甲', dodge:'闪避', dotBonus:'持续伤害', costReduction:'减耗',
};
const PARAGON_PCT_STATS = new Set(['atkPct','hpPct','defPct','critdPct','spdPct','cdReduction','extraAtk','healBonus','goldMult','dropMult','xpMult','dotBonus','costReduction']);
function paragonStatText(stat, val) {
  const name = PARAGON_STAT_LABEL[stat] || stat;
  const v = Math.round(val * 10) / 10;
  return PARAGON_PCT_STATS.has(stat) ? `${name} +${v}%` : `${name} +${v}`;
}

function paragonXpNeeded(plvl) { return Math.floor(15000 * Math.pow(1.03, plvl)); }

function ensureParagonState() {
  if (!state) return null;
  if (!state.paragon || typeof state.paragon !== 'object') state.paragon = { xp:0, lvl:0, points:0, board:{}, ms:{} };
  const p = state.paragon;
  if (typeof p.xp !== 'number') p.xp = 0;
  if (typeof p.lvl !== 'number') p.lvl = 0;
  if (typeof p.points !== 'number') p.points = 0;
  if (!p.board || typeof p.board !== 'object') p.board = {};
  if (!p.ms || typeof p.ms !== 'object') p.ms = {};
  return p;
}

function paragonFindNode(key) {
  for (const cat of PARAGON_BOARD) { const n = cat.nodes.find(x => x.key === key); if (n) return n; }
  return null;
}

/* 满级后由 gainXP 路由进来(原经验被丢弃) */
function paragonGainXp(amt) {
  if (!amt || amt <= 0) return;
  const p = ensureParagonState();
  p.xp += amt;
  let leveled = false;
  while (p.xp >= paragonXpNeeded(p.lvl)) {
    p.xp -= paragonXpNeeded(p.lvl);
    p.lvl += 1;
    p.points += 1;
    leveled = true;
    paragonCheckMilestone(p.lvl);
  }
  if (leveled) { log(`🌟 巅峰等级提升至 ${p.lvl}! 获得巅峰点(+${p.points > 0 ? 1 : 1})`, 'legend'); markDirty('paragon'); }
}

function paragonCheckMilestone(lvl) {
  const p = ensureParagonState();
  for (const m of PARAGON_MILESTONES) {
    if (lvl >= m.lvl && !p.ms[m.lvl]) {
      p.ms[m.lvl] = true;
      const r = m.reward || {};
      if (r.gem) state.gem += r.gem;
      if (r.essence) state.essence += r.essence;
      if (m.title && typeof unlockTitle === 'function') unlockTitle(m.title);
      const parts = [];
      if (r.gem) parts.push(`${r.gem}💎`);
      if (r.essence) parts.push(`${r.essence}🔮`);
      if (m.title) parts.push(`称号「${m.title}」`);
      log(`🏆 巅峰 ${m.lvl} 里程碑达成! ${parts.join(' ')}`, 'legend');
      markDirty('hero');
    }
  }
}

function paragonInvest(nodeKey, amt) {
  const p = ensureParagonState();
  const node = paragonFindNode(nodeKey); if (!node) return;
  amt = Math.max(1, Math.min(+amt || 1, p.points));
  if (amt <= 0) { log('没有可分配的巅峰点', 'bad'); return; }
  p.board[nodeKey] = (p.board[nodeKey] || 0) + amt;
  p.points -= amt;
  if (typeof recomputeStats === 'function') recomputeStats();
  markDirty('paragon', 'hero');
}

function paragonReset() {
  const p = ensureParagonState();
  let spent = 0; for (const k in p.board) spent += p.board[k] || 0;
  if (spent <= 0) { log('没有已分配的巅峰点', 'info'); return; }
  p.board = {};
  p.points += spent;
  if (typeof recomputeStats === 'function') recomputeStats();
  markDirty('paragon', 'hero');
  log(`♻️ 已重置巅峰盘,返还 ${spent} 巅峰点`, 'good');
}

/* 某一大类已投入的总点数(用于 keystone 解锁判定) */
function paragonCategoryPoints(catKey) {
  if (!state || !state.paragon || !state.paragon.board) return 0;
  const cat = PARAGON_BOARD.find(c => c.key === catKey); if (!cat) return 0;
  let sum = 0;
  for (const node of cat.nodes) sum += state.paragon.board[node.key] || 0;
  return sum;
}
/* 已解锁的 keystone 列表 */
function activeParagonKeystones() {
  const out = [];
  for (const cat of PARAGON_BOARD) {
    const pts = paragonCategoryPoints(cat.key);
    for (const ks of (PARAGON_KEYSTONES[cat.key] || [])) if (pts >= ks.req) out.push(ks);
  }
  return out;
}

/* 加成收集:stat 类经 recompute 巅峰块,xp/gold/dropMult 经 killMonster */
function collectParagonMod() {
  const out = { atkPct:0, hpPct:0, defPct:0, critdPct:0, spdPct:0, crit:0, leech:0, vers:0, mastery:0,
    regFlat:0, cdReduction:0, extraAtk:0, healBonus:0, dotBonus:0, costReduction:0,
    executeBonus:0, reflectDmg:0, armorPen:0, dodge:0, stunChance:0, xpMult:0, goldMult:0, dropMult:0 };
  if (!state || !state.paragon || !state.paragon.board) return out;
  for (const cat of PARAGON_BOARD) {
    for (const node of cat.nodes) {
      const rank = state.paragon.board[node.key] || 0;
      if (rank > 0) out[node.stat] = (out[node.stat] || 0) + rank * node.per;
    }
  }
  // 核心节点(keystone)加成
  for (const ks of activeParagonKeystones()) {
    for (const [k, v] of Object.entries(ks.mod || {})) out[k] = (out[k] || 0) + v;
  }
  return out;
}

/* 引导/红点:有未分配巅峰点 */
function paragonHasPoints() { const p = state && state.paragon; return !!(p && (p.points || 0) > 0); }

/* 面板可见时节流刷新经验条(避免每帧/每杀重建) */
let _paragonLivePaint = 0;
function paragonLiveTick() {
  const panel = document.getElementById('tab-paragon');
  if (!panel || !panel.classList.contains('active')) return;
  const now = Date.now();
  if (now - _paragonLivePaint < 1500) return;
  _paragonLivePaint = now;
  if (typeof renderParagon === 'function') renderParagon();
}

/* ---------- 渲染 ---------- */
function renderParagon() {
  const panel = document.getElementById('tab-paragon');
  if (!panel) return;
  const p = ensureParagonState();
  const maxed = state.hero && state.hero.lvl >= ((typeof MAX_LEVEL === 'number') ? MAX_LEVEL : 80);
  const need = paragonXpNeeded(p.lvl);
  const pct = Math.min(100, Math.round(p.xp / need * 100));
  const mod = collectParagonMod();

  let html = `<div style="margin-bottom:8px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
      <div style="font-weight:bold;font-size:15px">🌟 巅峰系统 <span class="muted" style="font-size:11px">(满级后无限成长 · 每角色独立)</span></div>
      <div style="font-size:18px;font-weight:bold;color:var(--legend)">巅峰 ${p.lvl}</div>
    </div>`;
  if (!maxed) {
    html += `<div class="muted" style="font-size:11px;margin-top:4px">达到 <b>Lv.${(typeof MAX_LEVEL === 'number') ? MAX_LEVEL : 80}</b> 满级后,溢出经验将转化为巅峰经验。当前未满级,可先规划加点方向。</div>`;
  }
  html += `<div class="bar xp" style="margin-top:6px"><i style="width:${pct}%"></i><span>巅峰经验 ${fmt(Math.floor(p.xp))} / ${fmt(need)}</span></div>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap">
      <div>可分配巅峰点: <b style="color:${p.points > 0 ? 'var(--accent)' : 'var(--text)'};font-size:15px">${p.points}</b></div>
      <button class="danger" data-action="paragonReset" style="padding:3px 10px;font-size:11px">♻️ 重置(免费)</button>
    </div>
  </div>`;

  html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px">`;
  for (const cat of PARAGON_BOARD) {
    html += `<div class="ascend-box" style="border-color:${cat.color}44">
      <div class="detail-label" style="color:${cat.color}">${cat.icon} ${cat.name}</div>`;
    for (const node of cat.nodes) {
      const rank = p.board[node.key] || 0;
      const cur = rank * node.per;
      html += `<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;padding:4px 0">
        <div style="min-width:0;flex:1">
          <div style="font-size:12px"><b>${node.icon} ${node.name}</b> <span class="muted" style="font-size:10px">Lv.${rank}</span></div>
          <div class="muted" style="font-size:10px">${rank > 0 ? paragonStatText(node.stat, cur) : '每级 ' + paragonStatText(node.stat, node.per)}</div>
        </div>
        <div style="display:flex;gap:3px;flex-shrink:0">
          <button class="${p.points > 0 ? 'success' : ''}" data-action="paragonInvest" data-node="${node.key}" data-amt="1" ${p.points > 0 ? '' : 'disabled'} style="padding:2px 8px;font-size:11px">+1</button>
          <button class="${p.points >= 10 ? 'success' : ''}" data-action="paragonInvest" data-node="${node.key}" data-amt="10" ${p.points >= 10 ? '' : 'disabled'} style="padding:2px 6px;font-size:10px">+10</button>
        </div>
      </div>`;
    }
    // 核心节点(keystone)
    const catPts = paragonCategoryPoints(cat.key);
    for (const ks of (PARAGON_KEYSTONES[cat.key] || [])) {
      const on = catPts >= ks.req;
      html += `<div style="margin-top:4px;padding:5px 6px;border:1px solid ${on ? cat.color : 'var(--border)'};border-radius:8px;background:${on ? cat.color + '1a' : 'transparent'};opacity:${on ? 1 : 0.6}">
        <div style="font-size:11px"><b>${on ? '✨' : '🔒'} ${ks.icon} ${ks.name}</b> <span class="muted" style="font-size:9px">${on ? '已激活' : `${catPts}/${ks.req} 点`}</span></div>
        <div class="muted" style="font-size:9px;line-height:1.4">${ks.desc}</div>
      </div>`;
    }
    html += `</div>`;
  }
  html += `</div>`;

  // 里程碑
  html += `<div class="ascend-box"><div class="detail-label">🏆 巅峰里程碑</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">`;
  for (const m of PARAGON_MILESTONES) {
    const done = !!p.ms[m.lvl];
    const parts = [];
    if (m.reward.gem) parts.push(`${m.reward.gem}💎`);
    if (m.reward.essence) parts.push(`${m.reward.essence}🔮`);
    if (m.title) parts.push(`「${m.title}」`);
    html += `<div style="font-size:10px;padding:4px 8px;border:1px solid ${done ? 'var(--legend)' : 'var(--border)'};border-radius:8px;opacity:${done ? 1 : 0.6}">
      ${done ? '✅' : '🔒'} 巅峰${m.lvl}: ${parts.join(' ')}
    </div>`;
  }
  html += `</div></div>`;

  panel.innerHTML = html;
}
