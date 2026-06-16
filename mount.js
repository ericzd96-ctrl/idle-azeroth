/* =========================================================
   mount.js — 坐骑系统(账号共享收藏)
   ----------------------------------------------------------
   规则:
   - account.mounts = { key: { obtained:true, fav?:bool } } 账号共享
   - state.activeMount = key 当前出战(每角色可选不同)
   - 收藏被动: 每拥有 1 只 +0.5% 金币, +0.5% 掉率, +0.2% 攻击(账号)
   - 当前坐骑: 提供该坐骑定义的 mod
   - 来源: 起始坐骑 / 无尽塔里程碑 / 世界Boss / 觉醒 / 商店
   ========================================================= */

const MOUNTS = [
  // 普通(起始)
  { key:'horse_brown',  name:'棕马',     icon:'🐴', tier:'common',   faction:'alliance', mod:{spdPct:5}, src:'联盟起始坐骑' },
  { key:'wolf_gray',    name:'灰狼',     icon:'🐺', tier:'common',   faction:'horde',    mod:{spdPct:5}, src:'部落起始坐骑' },
  // 优秀
  { key:'raptor',       name:'迅猛龙',   icon:'🦖', tier:'uncommon', mod:{spdPct:8, critdPct:5}, src:'副本BOSS 击杀(2% 概率)' },
  { key:'kodo',         name:'科多兽',   icon:'🦬', tier:'uncommon', mod:{hpPct:8, defPct:3},    src:'世界Boss 击杀(3% 概率)' },
  { key:'sabertooth',   name:'剑齿虎',   icon:'🐯', tier:'uncommon', mod:{atkPct:5, crit:3},     src:'声望崇敬 (任意阵营)' },
  // 精良
  { key:'gryphon',      name:'狮鹫',     icon:'🦅', tier:'rare', mod:{spdPct:12, atkPct:5}, src:'累计击败 100 BOSS' },
  { key:'wyvern',       name:'双足飞龙', icon:'🦇', tier:'rare', mod:{spdPct:12, hpPct:5},  src:'觉醒 5 阶' },
  { key:'mechastrider', name:'机械鸵鸟', icon:'🤖', tier:'rare', mod:{spdPct:10, mastery:5}, src:'塔商店 / 500🪙' },
  // 史诗
  { key:'protoDrake',   name:'原始幼龙', icon:'🐉', tier:'epic', mod:{spdPct:15, hpPct:10, atkPct:5}, src:'无尽塔 第 50 层' },
  { key:'cloudSerpent', name:'青龙',     icon:'🐍', tier:'epic', mod:{spdPct:15, atkPct:10, critdPct:5}, src:'觉醒 10 阶' },
  { key:'shadowHawk',   name:'影月战鹰', icon:'🦉', tier:'epic', mod:{spdPct:15, vers:5, leech:3}, src:'世界Boss 累计 50 次' },
  // 传说
  { key:'invincible',   name:'无敌座驾', icon:'🔥', tier:'legend', mod:{spdPct:20, atkPct:15, hpPct:15, leech:5}, src:'无尽塔 第 100 层' },
  { key:'mimiron',      name:'米米隆头颅',icon:'⚙️', tier:'legend', mod:{spdPct:20, hpPct:20, defPct:10, mastery:10}, src:'觉醒 25 阶' },
  { key:'ashes',        name:'灰烬使者', icon:'🦃', tier:'legend', mod:{spdPct:20, atkPct:15, critdPct:10, dropMult:10}, src:'无尽塔 第 200 层' },
];

const MOUNT_TIER = {
  common:   { name:'普通', cls:'r-common',   color:'#9ca3af' },
  uncommon: { name:'优秀', cls:'r-uncommon', color:'#1eff00' },
  rare:     { name:'精良', cls:'r-rare',     color:'#0070dd' },
  epic:     { name:'史诗', cls:'r-epic',     color:'#a335ee' },
  legend:   { name:'传说', cls:'r-legend',   color:'#ff8000' },
};

/* ---------- 状态 ---------- */
function ensureMountState() {
  if (!account) account = defaultAccount();
  if (!account.mounts) account.mounts = {};
  if (typeof state.activeMount === 'undefined') state.activeMount = null;
}

function mountOwn(key) {
  ensureMountState();
  return !!(account.mounts[key] && account.mounts[key].obtained);
}

function mountGrant(key) {
  ensureMountState();
  const m = MOUNTS.find(x => x.key === key);
  if (!m) return false;
  if (mountOwn(key)) return false;
  account.mounts[key] = { obtained:true };
  log(`🐎 获得新坐骑【${m.name}】(${MOUNT_TIER[m.tier].name})!`, 'legend');
  // 第一只时自动出战
  if (!state.activeMount) state.activeMount = key;
  recomputeStats();
  markDirty('mount', 'hero');
  return true;
}

function mountSetActive(key) {
  ensureMountState();
  if (key && !mountOwn(key)) return;
  state.activeMount = key || null;
  const m = MOUNTS.find(x => x.key === key);
  if (m) log(`🐎 切换坐骑: ${m.icon} ${m.name}`, 'good');
  recomputeStats();
  markDirty('mount', 'hero');
}

/* 起始坐骑发放(角色创建后/进入游戏时调用一次) */
function mountAutoGrantStarter() {
  ensureMountState();
  if (!state.cls || !state.faction) return;
  const starter = MOUNTS.find(m => m.tier === 'common' && m.faction === state.faction);
  if (starter && !mountOwn(starter.key)) {
    mountGrant(starter.key);
  }
}

/* ---------- 钩子: 来源 ---------- */
function mountOnTowerFloorClear(floor) {
  if (floor === 50)  mountGrant('protoDrake');
  if (floor === 100) mountGrant('invincible');
  if (floor === 200) mountGrant('ashes');
}

function mountOnWorldBossKill() {
  ensureMountState();
  const wbKills = (state.worldBoss && state.worldBoss.totalKilled) || 0;
  if (wbKills >= 50) mountGrant('shadowHawk');
  if (Math.random() < 0.03) mountGrant('kodo');
}

function mountOnDungeonBossKill() {
  if (Math.random() < 0.02) mountGrant('raptor');
}

function mountOnAscendLvl(lvl) {
  if (lvl >= 5)  mountGrant('wyvern');
  if (lvl >= 10) mountGrant('cloudSerpent');
  if (lvl >= 25) mountGrant('mimiron');
}

function mountOnBossKillCount(total) {
  if (total >= 100) mountGrant('gryphon');
}

/* 声望:任意一个阵营达到崇敬(15000+)就发剑齿虎 */
function mountCheckReputation() {
  if (!account || !account.reputation) return;
  for (const v of Object.values(account.reputation)) {
    if ((v||0) >= 15000) { mountGrant('sabertooth'); return; }
  }
}

/* ---------- 加成 ---------- */
function collectMountMod() {
  ensureMountState();
  const out = { atkPct:0, hpPct:0, defPct:0, spdPct:0, critdPct:0,
                crit:0, leech:0, vers:0, mastery:0,
                xpMult:0, goldMult:0, dropMult:0 };
  // 当前坐骑
  if (state.activeMount) {
    const m = MOUNTS.find(x => x.key === state.activeMount);
    if (m && mountOwn(m.key)) {
      for (const [k, v] of Object.entries(m.mod||{})) out[k] = (out[k]||0) + v;
    }
  }
  // 收藏被动
  const ownedCount = Object.values(account.mounts||{}).filter(m => m && m.obtained).length;
  if (ownedCount > 0) {
    out.atkPct  += ownedCount * 0.2;
    out.goldMult += ownedCount * 0.5;
    out.dropMult += ownedCount * 0.5;
  }
  return out;
}

/* ---------- 渲染 ---------- */
function renderMounts() {
  ensureMountState();
  const root = $('mount-panel'); if (!root) return;
  const ownedCount = Object.values(account.mounts||{}).filter(m => m && m.obtained).length;
  const total = MOUNTS.length;

  let html = `<div class="ascend-box">
    <div style="font-weight:bold">🐎 坐骑收藏 <span class="muted" style="font-size:11px">(账号共享)</span></div>
    <div class="muted" style="font-size:11px;margin:4px 0">已收集 <b style="color:var(--accent)">${ownedCount}</b>/${total}</div>
    <div class="muted" style="font-size:10px">收藏被动: +${(ownedCount*0.2).toFixed(1)}% 攻击 · +${(ownedCount*0.5).toFixed(1)}% 金币 · +${(ownedCount*0.5).toFixed(1)}% 掉率</div>
  </div>`;

  // 按 tier 分组
  const byTier = {};
  for (const m of MOUNTS) { byTier[m.tier] = byTier[m.tier] || []; byTier[m.tier].push(m); }
  const tierOrder = ['legend','epic','rare','uncommon','common'];

  for (const tier of tierOrder) {
    const list = byTier[tier]; if (!list) continue;
    const ti = MOUNT_TIER[tier];
    html += `<div class="ascend-box" style="border-left:3px solid ${ti.color}">
      <div class="detail-label" style="color:${ti.color}">${ti.name}</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px">`;
    for (const m of list) {
      const owned = mountOwn(m.key);
      const isActive = state.activeMount === m.key;
      const modTxt = Object.entries(m.mod||{}).map(([k,v]) =>
        (typeof fmtMod==='function') ? fmtMod(k,v) : k+'+'+v
      ).join(' ');
      const factionTag = m.faction ? (m.faction==='alliance'?' 🦁':' 🐺') : '';
      html += `<div class="ascend-milestone ${owned?'reached':''}" style="padding:6px;opacity:${owned?1:0.5}">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;align-items:center;gap:6px;flex:1">
            <div style="font-size:24px">${m.icon}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:bold;color:${ti.color}">${m.name}${factionTag}</div>
              <div class="muted" style="font-size:10px;line-height:1.3">${modTxt}</div>
              <div class="muted" style="font-size:9px">来源: ${m.src}</div>
            </div>
          </div>
        </div>
        <div style="margin-top:4px">
          ${owned
            ? (isActive
                ? `<button class="danger" data-action="mountUnset" style="width:100%;padding:3px;font-size:11px">下马</button>`
                : `<button class="success" data-action="mountSet" data-key="${m.key}" style="width:100%;padding:3px;font-size:11px">出战</button>`)
            : `<div class="muted" style="font-size:10px;text-align:center">🔒 未获得</div>`}
        </div>
      </div>`;
    }
    html += '</div></div>';
  }

  root.innerHTML = html;
}
