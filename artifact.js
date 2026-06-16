/* =========================================================
   artifact.js — 神器系统(按职业 1 把)
   ----------------------------------------------------------
   规则:
   - Lv.10 解锁神器
   - 神器 AP 从杀怪获得(战斗 XP 的 30%)
   - 每升 1 级给 1 个神器天赋点(自动消耗 AP 累积)
   - 12 个天赋节点 × 每个 3 阶 = 共 36 点(满级 36 = 全部满阶)
   - 3 个里程碑(Lv.10/25/45)给永久强化
   - 重置: 100 钻石(返还所有点数)
   ========================================================= */

const ARTIFACT_UNLOCK_LVL = 10;
const ARTIFACT_MAX_LVL = 36;

/* 职业 → 神器名 */
const ARTIFACTS = {
  warrior: { name:'霸者之刃 · 灰烬使者', icon:'🗡️', color:'#c79c6e' },
  mage:    { name:'风暴之眼',           icon:'🪄', color:'#69ccf0' },
  priest:  { name:'伊格诺斯的低语',     icon:'📿', color:'#ffffff' },
  rogue:   { name:'断魂双匕',           icon:'🗡️', color:'#fff569' },
  hunter:  { name:'索利达尔的命运之弓', icon:'🏹', color:'#abd473' },
  shaman:  { name:'氏族之斧 · 朵姆',    icon:'🪓', color:'#0070de' },
  paladin:  { name:'灰白之刃 · 银色之手',icon:'⚒️', color:'#f58cba' },
  warlock: { name:'恐惧斯卡萨克思',     icon:'📕', color:'#9482c9' },
  druid:   { name:'菲奥纳娜',           icon:'🌿', color:'#ff7d0a' },
};

/* 神器天赋节点(共 12,3 树 × 4)*/
const ARTIFACT_TRAITS = [
  // 攻势
  { key:'edgeOfWar',    tree:'offense', name:'战意之刃',  desc:'攻击 +2%/阶',  mod:{atkPct:2},          maxRank:3 },
  { key:'lethalStrike', tree:'offense', name:'致命强袭',  desc:'精通 +5%/阶',  mod:{mastery:5},         maxRank:3, prereq:'edgeOfWar' },
  { key:'frenzy',       tree:'offense', name:'狂怒涌动',  desc:'攻速 +3%/阶',  mod:{spdPct:3},          maxRank:3, prereq:'lethalStrike' },
  { key:'wrathSurge',   tree:'offense', name:'怒火奔流',  desc:'攻击 +3%/阶',  mod:{atkPct:3},          maxRank:3, prereq:'frenzy' },
  // 守护
  { key:'ironBody',     tree:'defense', name:'铁躯',      desc:'生命 +3%/阶',  mod:{hpPct:3},           maxRank:3 },
  { key:'guardingAura', tree:'defense', name:'护体光环',  desc:'防御 +4%/阶',  mod:{defPct:4},          maxRank:3, prereq:'ironBody' },
  { key:'absorption',   tree:'defense', name:'吸魂之握',  desc:'生命 +3%/阶',  mod:{hpPct:3},           maxRank:3, prereq:'guardingAura' },
  { key:'lastStand',    tree:'defense', name:'背水一战',  desc:'防御 +3%/阶',  mod:{defPct:3},          maxRank:3, prereq:'absorption' },
  // 通晓
  { key:'insight',      tree:'mastery', name:'洞察奥义',  desc:'经验 +5%/阶',  mod:{xpMult:5},          maxRank:3 },
  { key:'wealth',       tree:'mastery', name:'敛财',      desc:'金币 +5%/阶',  mod:{goldMult:5},        maxRank:3, prereq:'insight' },
  { key:'fortune',      tree:'mastery', name:'幸运',      desc:'掉率 +5%/阶',  mod:{dropMult:5},        maxRank:3, prereq:'wealth' },
  { key:'masteryFlow',  tree:'mastery', name:'精通融汇',  desc:'精通 +5/阶',   mod:{mastery:5},         maxRank:3, prereq:'fortune' },
];

const ARTIFACT_TREES = {
  offense: { name:'攻势', icon:'⚔️', color:'#ef4444' },
  defense: { name:'守护', icon:'🛡️', color:'#3b82f6' },
  mastery: { name:'通晓', icon:'🌟', color:'#fbbf24' },
};

/* 里程碑 — 神器自身的觉醒(独立于光辉值) */
const ARTIFACT_MILESTONES = [
  { lvl:10, name:'觉醒', desc:'+5% 全部基础属性',        mod:{atkPct:5, hpPct:5, defPct:5} },
  { lvl:25, name:'共鸣', desc:'+8% 攻击/生命', mod:{atkPct:8, hpPct:8} },
  { lvl:45, name:'神格', desc:'+15% 全属性, +10 精通',   mod:{atkPct:15, hpPct:15, defPct:15, mastery:10} },
];

/* ---------- 工具 ---------- */
function ensureArtifactState() {
  if (!state.artifact) state.artifact = { lvl:0, ap:0, traits:{}, milestonesSeen:{} };
  if (!state.artifact.traits) state.artifact.traits = {};
  if (!state.artifact.milestonesSeen) state.artifact.milestonesSeen = {};
}

function artifactApNeeded(lvl) {
  if (lvl >= ARTIFACT_MAX_LVL) return Infinity;
  // 100, 250, 480, 800, ... 不太陡
  return Math.floor(100 + Math.pow(lvl, 1.8) * 50);
}

function artifactSpentPoints() {
  ensureArtifactState();
  let n = 0;
  for (const r of Object.values(state.artifact.traits||{})) n += r;
  return n;
}

function artifactPointsFree() {
  ensureArtifactState();
  return Math.max(0, (state.artifact.lvl||0) - artifactSpentPoints());
}

function artifactUnlocked() {
  if (!state.cls || !state.hero) return false;
  // 一旦解锁就永久解锁(覚醒后不重新锁定)
  if (state.artifact && (state.artifact.lvl||0) > 0) return true;
  return state.hero.lvl >= ARTIFACT_UNLOCK_LVL;
}

function artifactPrereqMet(trait) {
  if (!trait.prereq) return true;
  const r = state.artifact.traits[trait.prereq] || 0;
  return r >= 1; // 前置至少 1 阶
}

/* 杀怪给 AP — 在 combat.js 的 onMonsterDeath 末尾调用 */
function artifactGainAp(xpReward) {
  ensureArtifactState();
  if (!artifactUnlocked()) return;
  if (state.artifact.lvl >= ARTIFACT_MAX_LVL) return;
  const gain = Math.max(1, Math.floor(xpReward * 0.3));
  state.artifact.ap += gain;
  // 升级
  let leveled = false;
  while (state.artifact.lvl < ARTIFACT_MAX_LVL && state.artifact.ap >= artifactApNeeded(state.artifact.lvl)) {
    state.artifact.ap -= artifactApNeeded(state.artifact.lvl);
    state.artifact.lvl += 1;
    leveled = true;
    const art = ARTIFACTS[state.cls];
    log(`${art?art.icon:'🗡️'} 神器升到 Lv.${state.artifact.lvl}! +1 神器天赋点`, 'epic');
    const ms = ARTIFACT_MILESTONES.find(m => m.lvl === state.artifact.lvl);
    if (ms && !state.artifact.milestonesSeen[state.artifact.lvl]) {
      state.artifact.milestonesSeen[state.artifact.lvl] = true;
      log(`✨ 神器里程碑【${ms.name}】解锁: ${ms.desc}`, 'legend');
    }
  }
  if (leveled) {
    recomputeStats();
    markDirty('artifact', 'hero');
  }
}

/* ---------- 加点 / 重置 ---------- */
function artifactBuyTrait(key) {
  ensureArtifactState();
  const t = ARTIFACT_TRAITS.find(x => x.key === key);
  if (!t) return;
  const cur = state.artifact.traits[key] || 0;
  if (cur >= t.maxRank) { log('已满阶', 'bad'); return; }
  if (!artifactPrereqMet(t)) { log('前置未解锁', 'bad'); return; }
  if (artifactPointsFree() <= 0) { log('神器点数不足', 'bad'); return; }
  state.artifact.traits[key] = cur + 1;
  log(`✦ 神器天赋: ${t.name} → ${cur+1}/${t.maxRank}`, 'good');
  recomputeStats();
  markDirty('artifact', 'hero');
}

function artifactReset() {
  ensureArtifactState();
  const cost = 100;
  if (state.gem < cost) { log(`💎 重置神器需要 ${cost} 钻石`, 'bad'); return; }
  if (!confirm(`确定重置神器天赋?消耗 ${cost} 💎,所有 ${artifactSpentPoints()} 点返还。`)) return;
  state.gem -= cost;
  state.artifact.traits = {};
  log(`♻️ 神器天赋已重置,返还 ${state.artifact.lvl} 点`, 'good');
  recomputeStats();
  markDirty('artifact', 'hero');
}

/* ---------- 收集加成 (供 recomputeStats 调用) ---------- */
function collectArtifactMod() {
  ensureArtifactState();
  const out = { atkPct:0, hpPct:0, defPct:0, critdPct:0, spdPct:0,
                crit:0, leech:0, vers:0, mastery:0,
                xpMult:0, goldMult:0, dropMult:0 };
  if (!artifactUnlocked()) return out;
  // 天赋
  for (const t of ARTIFACT_TRAITS) {
    const rank = state.artifact.traits[t.key] || 0;
    if (rank <= 0) continue;
    for (const [k, v] of Object.entries(t.mod||{})) out[k] = (out[k]||0) + v * rank;
  }
  // 里程碑(必须实际达成)
  for (const ms of ARTIFACT_MILESTONES) {
    if ((state.artifact.lvl||0) >= ms.lvl) {
      for (const [k, v] of Object.entries(ms.mod||{})) out[k] = (out[k]||0) + v;
    }
  }
  return out;
}

/* ---------- 渲染 ---------- */
function renderArtifact() {
  ensureArtifactState();
  const root = $('tab-artifact'); if (!root) return;
  if (!state.cls) { root.innerHTML = '<div class="muted">先创建角色</div>'; return; }
  if (!artifactUnlocked()) {
    root.innerHTML = `<div class="ascend-box">
      <div style="font-size:14px;font-weight:bold;text-align:center;margin:20px 0">🗡️ 神器尚未觉醒</div>
      <div class="muted" style="text-align:center">需达到 Lv.${ARTIFACT_UNLOCK_LVL} 才能开启专属神器</div>
    </div>`;
    return;
  }
  const art = ARTIFACTS[state.cls] || { name:'神器', icon:'🗡️', color:'#888' };
  const a = state.artifact;
  const cur = a.ap, need = artifactApNeeded(a.lvl);
  const pct = a.lvl >= ARTIFACT_MAX_LVL ? 100 : Math.floor(cur*100/need);
  const free = artifactPointsFree();
  const spent = artifactSpentPoints();

  let html = `<div class="ascend-box" style="border:1px solid ${art.color}">
    <div style="display:flex;align-items:center;gap:8px">
      <div style="font-size:30px">${art.icon}</div>
      <div style="flex:1">
        <div style="font-weight:bold;color:${art.color}">${art.name}</div>
        <div class="muted" style="font-size:11px">神器 Lv.${a.lvl}/${ARTIFACT_MAX_LVL} · 可用 <b style="color:var(--accent)">${free}</b> 点 · 已加 ${spent}</div>
      </div>
    </div>
    <div class="bar xp" style="margin:6px 0"><i style="width:${pct}%;background:${art.color}"></i><span>${a.lvl>=ARTIFACT_MAX_LVL?'MAX':`${cur}/${need} AP`}</span></div>
    <div class="muted" style="font-size:10px">⚡ 每杀敌获得 30% XP 作为 AP · <button class="danger" data-action="artifactReset" style="float:right;padding:2px 8px;font-size:11px">重置 100💎</button></div>
  </div>`;

  // 3 树展开
  for (const [tKey, tree] of Object.entries(ARTIFACT_TREES)) {
    const traits = ARTIFACT_TRAITS.filter(t => t.tree === tKey);
    html += `<div class="ascend-box" style="border-left:3px solid ${tree.color}">
      <div class="detail-label" style="color:${tree.color}">${tree.icon} ${tree.name}</div>`;
    for (const t of traits) {
      const rank = a.traits[t.key] || 0;
      const prereqOk = artifactPrereqMet(t);
      const canBuy = prereqOk && rank < t.maxRank && free > 0;
      const lockHint = !prereqOk ? `<span class="muted" style="font-size:10px">🔒 需 [${ARTIFACT_TRAITS.find(x=>x.key===t.prereq)?.name||'-'}]</span>` : '';
      // 已加的属性
      const curMod = Object.entries(t.mod||{}).map(([k,v]) => `${k}+${v*rank}${['atkPct','hpPct','defPct','critdPct','spdPct','leech','vers','xpMult','goldMult','dropMult'].includes(k)?'%':''}`).join(' ');
      html += `<div class="ascend-milestone ${rank>0?'reached':''}" style="padding:6px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
          <div>
            <div><b>${t.name}</b> <span class="muted" style="font-size:10px">${rank}/${t.maxRank}</span> ${lockHint}</div>
            <div class="muted" style="font-size:10px">${t.desc}${rank>0?' · 当前: '+curMod:''}</div>
          </div>
          <button class="${canBuy?'success':''}" data-action="artifactBuy" data-key="${t.key}" ${canBuy?'':'disabled'} style="padding:4px 10px">+</button>
        </div>
      </div>`;
    }
    html += '</div>';
  }

  // 里程碑
  html += `<div class="ascend-box"><div class="detail-label">里程碑</div>`;
  for (const ms of ARTIFACT_MILESTONES) {
    const reached = (a.lvl||0) >= ms.lvl;
    const modTxt = Object.entries(ms.mod||{}).map(([k,v]) => fmtMod ? fmtMod(k,v) : k+'+'+v).join(' ');
    html += `<div class="ascend-milestone ${reached?'reached':''}">
      <div><b>Lv.${ms.lvl} ${ms.name}</b> ${reached?'<span class="r-legend">✓</span>':'<span class="muted">🔒</span>'}</div>
      <div class="muted" style="font-size:10px">${modTxt||ms.desc}</div>
    </div>`;
  }
  html += '</div>';

  root.innerHTML = html;
}
