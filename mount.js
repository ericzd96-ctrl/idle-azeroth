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
  { key:'raptor',       name:'迅猛龙',   icon:'🦖', tier:'uncommon', mod:{spdPct:8, critdPct:5}, src:'副本首领击杀(2% 概率)' },
  { key:'kodo',         name:'科多兽',   icon:'🦬', tier:'uncommon', mod:{hpPct:8, defPct:3},    src:'世界首领击杀(3% 概率)' },
  { key:'sabertooth',   name:'剑齿虎',   icon:'🐯', tier:'uncommon', mod:{atkPct:5, crit:3},     src:'声望崇敬 (任意阵营)' },
  // 精良
  { key:'gryphon',      name:'狮鹫',     icon:'🦅', tier:'rare', mod:{spdPct:12, atkPct:5}, src:'累计击败 100 名首领' },
  { key:'wyvern',       name:'双足飞龙', icon:'🦇', tier:'rare', mod:{spdPct:12, hpPct:5},  src:'觉醒 5 阶' },
  { key:'mechastrider', name:'机械鸵鸟', icon:'🤖', tier:'rare', mod:{spdPct:10, mastery:5}, src:'塔商店 / 500🪙' },
  // 史诗
  { key:'protoDrake',   name:'原始幼龙', icon:'🐉', tier:'epic', mod:{spdPct:15, hpPct:10, atkPct:5}, src:'无尽塔 第 50 层' },
  { key:'cloudSerpent', name:'青龙',     icon:'🐍', tier:'epic', mod:{spdPct:15, atkPct:10, critdPct:5}, src:'觉醒 10 阶' },
  { key:'shadowHawk',   name:'影月战鹰', icon:'🦉', tier:'epic', mod:{spdPct:15, vers:5, leech:3}, src:'世界首领累计 50 次' },
  // 传说
  { key:'invincible',   name:'无敌座驾', icon:'🔥', tier:'legend', mod:{spdPct:20, atkPct:15, hpPct:15, leech:5}, src:'无尽塔 第 100 层' },
  { key:'mimiron',      name:'米米隆头颅',icon:'⚙️', tier:'legend', mod:{spdPct:20, hpPct:20, defPct:10, mastery:10}, src:'觉醒 25 阶' },
  { key:'ashes',        name:'灰烬使者', icon:'🦃', tier:'legend', mod:{spdPct:20, atkPct:15, critdPct:10, dropMult:10}, src:'无尽塔 第 200 层' },
  { key:'twilight_drake_wb', name:'暮光灭世幼龙', icon:'🐲', tier:'legend', mod:{spdPct:20, atkPct:14, hpPct:12, mastery:8}, src:'世界Boss: 死亡之翼·灭世者(极低概率)' },
  { key:'sulfuras_firehawk', name:'萨弗隆火鹰', icon:'🔥', tier:'legend', mod:{spdPct:20, atkPct:15, critdPct:10, mastery:6}, src:'世界Boss: 拉格纳罗斯·火焰之王(极低概率)' },
  { key:'qiraji_mindscarab', name:'其拉心智甲虫', icon:'🪲', tier:'legend', mod:{spdPct:18, hpPct:14, vers:6, mastery:9}, src:'世界Boss: 克苏恩·疯狂之眼(极低概率)' },
  { key:'yogg_dreambeast', name:'千喉梦魇兽', icon:'🧠', tier:'legend', mod:{spdPct:19, atkPct:10, hpPct:10, leech:5, mastery:9}, src:'世界Boss: 尤格萨隆·千喉之梦(极低概率)' },
  { key:'alakir_stormdrake', name:'风暴王座幼龙', icon:'🌪️', tier:'legend', mod:{spdPct:22, atkPct:10, haste:7, mastery:8}, src:'世界Boss: 奥拉基尔·风暴王座(极低概率)' },
  { key:'leishen_thundercloud', name:'雷霆帝王云端翔龙', icon:'⚡', tier:'legend', mod:{spdPct:21, atkPct:15, crit:4, mastery:10}, src:'世界Boss: 雷神·雷霆之王(极低概率)' },
  { key:'argus_starbinder', name:'群星寂灭者', icon:'🌌', tier:'legend', mod:{spdPct:22, atkPct:16, hpPct:16, defPct:8, mastery:12}, src:'世界Boss: 阿古斯·寂灭者(极低概率)' },
  { key:'raszageth_stormwing', name:'莱萨杰丝风暴之翼', icon:'🌩️', tier:'legend', mod:{spdPct:23, atkPct:17, hpPct:12, haste:8, mastery:12}, src:'世界Boss: 莱萨杰丝·风暴化身(极低概率)' },
  { key:'shadowpoint_skyrazor', name:'影点裂轨天刃', icon:'🌑', tier:'legend', mod:{spdPct:23, atkPct:18, hpPct:12, vers:8, mastery:12}, src:'世界Boss: 影点总督维克席斯(极低概率)' },
  { key:'shandorah_starweave', name:'沙恩多拉星纱翔兽', icon:'🌠', tier:'legend', mod:{spdPct:24, atkPct:18, hpPct:14, haste:8, mastery:14}, src:'世界Boss: 群星占相者诺维萨(极低概率)' },
  // 新增:接入 endgame 系统(大秘境/竞技场/巅峰)—— mod 只用 atk/hp/def/spd/mastery(crit/critd/leech/vers 会被 spd_tuning 从 MOUNTS 剥离)
  { key:'warbear',      name:'板甲战熊',   icon:'🐻', tier:'rare',   mod:{spdPct:12, hpPct:8, defPct:5},            src:'竞技场 大师段位' },
  { key:'felRaptor',    name:'魔誓迅猛龙', icon:'😈', tier:'epic',   mod:{spdPct:15, atkPct:10, mastery:6},          src:'大秘境 +8 通关' },
  { key:'paragonHawk',  name:'巅峰之翼',   icon:'🌟', tier:'epic',   mod:{spdPct:15, atkPct:8, mastery:8},           src:'巅峰等级 50' },
  { key:'gladiatorDrake',name:'角斗士之龙',icon:'🐲', tier:'legend', mod:{spdPct:20, atkPct:12, hpPct:12, defPct:8}, src:'竞技场 角斗士段位' },
  { key:'voidPhoenix',  name:'虚空凤凰',   icon:'🦅', tier:'legend', mod:{spdPct:20, atkPct:14, hpPct:10, mastery:8},src:'大秘境 +15 通关' },
  { key:'eternalDragon',name:'永恒巨龙',   icon:'🐉', tier:'legend', mod:{spdPct:20, atkPct:15, hpPct:15, mastery:10},src:'巅峰等级 150' },
];

const WORLD_BOSS_MOUNT_DROPS = {
  deathwing:{ key:'twilight_drake_wb', chance:0.012 },
  ragnaros:{ key:'sulfuras_firehawk', chance:0.012 },
  cthun:{ key:'qiraji_mindscarab', chance:0.012 },
  yogg_saron:{ key:'yogg_dreambeast', chance:0.011 },
  alakir:{ key:'alakir_stormdrake', chance:0.011 },
  lei_shen:{ key:'leishen_thundercloud', chance:0.010 },
  argus_unmaker:{ key:'argus_starbinder', chance:0.008 },
  raszageth_storm:{ key:'raszageth_stormwing', chance:0.008 },
  shadowpoint_vexis:{ key:'shadowpoint_skyrazor', chance:0.007 },
  shandorah_astromancer:{ key:'shandorah_starweave', chance:0.007 },
};
if (typeof globalThis !== 'undefined') {
  globalThis.MOUNTS = MOUNTS;
  globalThis.WORLD_BOSS_MOUNT_DROPS = WORLD_BOSS_MOUNT_DROPS;
}

/* 坐骑收藏里程碑(拥有 N 只自动激活;mod 在 collectMountMod 直接加,不被 spd_tuning 剥离,
   故可用 critdPct 等;避免 spdPct(里程碑不在 walk 容器,不会被归一化)) */
const MOUNT_MILESTONES = [
  { n:5,  mod:{ atkPct:3, hpPct:3 } },
  { n:10, mod:{ atkPct:5, hpPct:5, critdPct:8 } },
  { n:15, mod:{ atkPct:8, hpPct:8, critdPct:12, goldMult:10 } },
  { n:18, mod:{ atkPct:12, hpPct:12, critdPct:15, dropMult:15 }, title:'坐骑大师' },
  { n:30, mod:{ atkPct:16, hpPct:16, critdPct:20, dropMult:20 }, title:'珍兽收藏家' },
  { n:50, mod:{ atkPct:22, hpPct:22, defPct:8, mastery:12, dropMult:30 }, title:'百骑统御者' },
  { n:75, mod:{ atkPct:30, hpPct:30, defPct:12, mastery:20, dropMult:45 }, title:'群星驭者' },
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
  if (typeof mountCheckMilestoneTitle === 'function') mountCheckMilestoneTitle();
  if (typeof progressionCheckAch === 'function') progressionCheckAch();
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

function mountOnWorldBossKill(wbKey) {
  ensureMountState();
  const wbKills = (state.worldBoss && state.worldBoss.totalKilled) || 0;
  if (wbKills >= 50) mountGrant('shadowHawk');
  if (Math.random() < 0.03) mountGrant('kodo');
  const bossDrop = WORLD_BOSS_MOUNT_DROPS[wbKey];
  if (bossDrop && Math.random() < bossDrop.chance) mountGrant(bossDrop.key);
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
  // 收藏被动(线性)
  const ownedCount = Object.values(account.mounts||{}).filter(m => m && m.obtained).length;
  if (ownedCount > 0) {
    out.atkPct  += ownedCount * 0.2;
    out.goldMult += ownedCount * 0.5;
    out.dropMult += ownedCount * 0.5;
  }
  // 收藏里程碑(达标自动激活)
  for (const ms of MOUNT_MILESTONES) {
    if (ownedCount >= ms.n) for (const [k, v] of Object.entries(ms.mod||{})) out[k] = (out[k]||0) + v;
  }
  return out;
}

function mountOwnedCount() {
  ensureMountState();
  return Object.values(account.mounts||{}).filter(m => m && m.obtained).length;
}
/* 里程碑称号(达标一次性解锁;在 mountGrant 后调) */
function mountCheckMilestoneTitle() {
  const n = mountOwnedCount();
  for (const ms of MOUNT_MILESTONES) {
    if (ms.title && n >= ms.n && typeof unlockTitle === 'function' && account.unlockedTitles && !account.unlockedTitles.includes(ms.title)) {
      unlockTitle(ms.title);
      log(`🏆 坐骑收藏里程碑:解锁称号「${ms.title}」!`, 'legend');
    }
  }
}

/* ---------- endgame 来源钩子 ---------- */
function mountOnMythicClear(level) {
  if ((level||0) >= 8)  mountGrant('felRaptor');
  if ((level||0) >= 15) mountGrant('voidPhoenix');
}
function mountOnArenaTier(tierKey) {
  if (tierKey === 'master') mountGrant('warbear');
  if (tierKey === 'glad')   mountGrant('gladiatorDrake');
}
function mountOnParagonLevel(lvl) {
  if ((lvl||0) >= 50)  mountGrant('paragonHawk');
  if ((lvl||0) >= 150) mountGrant('eternalDragon');
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
    <div class="muted" style="font-size:10px">收藏被动: +${(ownedCount*0.2).toFixed(1)}% 攻击 · +${(ownedCount*0.5).toFixed(1)}% 金币 · +${(ownedCount*0.5).toFixed(1)}% 掉率</div>`;
  // 收藏里程碑
  html += `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:6px">`;
  for (const ms of MOUNT_MILESTONES) {
    const on = ownedCount >= ms.n;
    const modTxt = Object.entries(ms.mod||{}).map(([k,v]) => (typeof fmtMod==='function')?fmtMod(k,v):k+'+'+v).join(' ');
    html += `<div style="font-size:9px;padding:3px 7px;border:1px solid ${on?'var(--accent)':'var(--border)'};border-radius:8px;opacity:${on?1:0.5}" title="${modTxt}${ms.title?' · 称号「'+ms.title+'」':''}">
      ${on?'✅':'🔒'} ${ms.n}只: ${modTxt}${ms.title?' 👑':''}
    </div>`;
  }
  html += `</div></div>`;

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
