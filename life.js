/* =========================================================
   life.js — 生活技能(采矿/钓鱼/草药 + 制作)
   ----------------------------------------------------------
   规则:
   - 3 个独立技能,各自 lvl(上限 60),xp
   - 任意时刻只能选 1 个为"当前进行",每 30 秒静默产出 1 件素材 + xp
   - 离线时按时长批量结算(应用启动时调用 lifeOfflineCatchup)
   - 不影响战斗循环,完全独立后台
   - 制作:用素材合成 buff 道具或强化券
   ========================================================= */

const LIFE_TICK_MS = 30000;        // 每 30 秒产出一次
const LIFE_MAX_LVL = 60;
const LIFE_MAX_OFFLINE_TICKS = 240; // 离线最多累计 2 小时(240 * 30s)

const LIFE_SKILLS = {
  mining: {
    name:'采矿', icon:'⛏️', color:'#9ca3af',
    tiers:[
      { matKey:'copper',   matName:'铜矿石',   matIcon:'🟤', minLvl:0,  weight:1 },
      { matKey:'iron',     matName:'铁矿石',   matIcon:'⚫', minLvl:15, weight:1 },
      { matKey:'mithril',  matName:'秘银矿',   matIcon:'⚪', minLvl:30, weight:0.6 },
      { matKey:'thorium',  matName:'瑟银矿',   matIcon:'🟦', minLvl:45, weight:0.3 },
    ],
  },
  fishing: {
    name:'钓鱼', icon:'🎣', color:'#60a5fa',
    tiers:[
      { matKey:'minnow', matName:'米诺鱼',  matIcon:'🐟', minLvl:0,  weight:1 },
      { matKey:'salmon', matName:'三文鱼',  matIcon:'🐠', minLvl:15, weight:1 },
      { matKey:'tuna',   matName:'金枪鱼',  matIcon:'🐡', minLvl:30, weight:0.6 },
      { matKey:'shark',  matName:'鲨鱼',    matIcon:'🦈', minLvl:45, weight:0.3 },
    ],
  },
  herb: {
    name:'草药', icon:'🌿', color:'#22c55e',
    tiers:[
      { matKey:'silverleaf', matName:'银叶草', matIcon:'🍃', minLvl:0,  weight:1 },
      { matKey:'peacebloom', matName:'宁神花', matIcon:'🌸', minLvl:15, weight:1 },
      { matKey:'sungrass',   matName:'阳光草', matIcon:'🌻', minLvl:30, weight:0.6 },
      { matKey:'mageroyal',  matName:'魔皇草', matIcon:'🌺', minLvl:45, weight:0.3 },
    ],
  },
};

/* 制作配方 */
const LIFE_RECIPES = [
  // 采矿:把矿物炼成精华(给装备体系输送材料)
  { key:'refineCopper', name:'熔炼铜矿', icon:'🔥', desc:'熔炼铜矿换取 8 ✨精华',
    cost:{ copper:5 }, minLvl:{mining:5}, action:'essence', value:8 },
  { key:'refineIron', name:'熔炼铁矿', icon:'🔥', desc:'熔炼铁矿换取 25 ✨精华',
    cost:{ iron:5 }, minLvl:{mining:20}, action:'essence', value:25 },
  { key:'refineMithril', name:'秘银精炼', icon:'⚜️', desc:'秘银换取 80 ✨精华',
    cost:{ mithril:3 }, minLvl:{mining:35}, action:'essence', value:80 },
  { key:'refineThorium', name:'瑟银淬炼', icon:'🌟', desc:'瑟银换取 250 ✨精华',
    cost:{ thorium:2 }, minLvl:{mining:50}, action:'essence', value:250 },
  // 钓鱼 + 草药: 食物 buff
  { key:'xpFeast', name:'智者炖鱼', icon:'🍲', desc:'10 分钟内 +20% 经验获取',
    cost:{ salmon:2, peacebloom:2 }, minLvl:{fishing:15, herb:15}, action:'buff', buffKey:'lifeXpFeast', buffDur:600000, buffMod:{xpMult:20} },
  { key:'mightFeast', name:'力量盛宴', icon:'🍖', desc:'10 分钟内 +15% 攻击',
    cost:{ tuna:1, sungrass:2 }, minLvl:{fishing:30, herb:30}, action:'buff', buffKey:'lifeMightFeast', buffDur:600000, buffMod:{atkPct:15} },
  { key:'fortuneFeast', name:'幸运盛宴', icon:'🥗', desc:'10 分钟内 +25% 金币/掉率',
    cost:{ shark:1, mageroyal:2 }, minLvl:{fishing:45, herb:45}, action:'buff', buffKey:'lifeFortuneFeast', buffDur:600000, buffMod:{goldMult:25, dropMult:25} },
];

/* ---------- 状态 ---------- */
function ensureLifeState() {
  if (!state.life) state.life = { mining:{lvl:0,xp:0}, fishing:{lvl:0,xp:0}, herb:{lvl:0,xp:0}, mats:{} };
  for (const k of Object.keys(LIFE_SKILLS)) if (!state.life[k]) state.life[k] = {lvl:0, xp:0};
  if (!state.life.mats) state.life.mats = {};
  if (typeof state.lifeAction === 'undefined') state.lifeAction = null;
  if (!state.lifeBuffs) state.lifeBuffs = {};
}

function lifeXpNeeded(lvl) {
  return 20 + lvl * lvl * 4;
}

function lifeAddXp(skillKey, xp) {
  const s = state.life[skillKey];
  if (!s || s.lvl >= LIFE_MAX_LVL) return;
  s.xp += xp;
  while (s.lvl < LIFE_MAX_LVL && s.xp >= lifeXpNeeded(s.lvl)) {
    s.xp -= lifeXpNeeded(s.lvl);
    s.lvl += 1;
    const sk = LIFE_SKILLS[skillKey];
    log(`${sk.icon} ${sk.name} 升到 Lv.${s.lvl}!`, 'good');
  }
}

/* 随机一个素材 key(根据当前等级) */
function lifePickMat(skillKey) {
  const lvl = state.life[skillKey].lvl;
  const tiers = LIFE_SKILLS[skillKey].tiers.filter(t => lvl >= t.minLvl);
  if (tiers.length === 0) return null;
  const totalW = tiers.reduce((s,t)=>s+t.weight, 0);
  let r = Math.random() * totalW;
  for (const t of tiers) { r -= t.weight; if (r <= 0) return t; }
  return tiers[0];
}

/* ---------- 控制 ---------- */
function startLifeAction(skillKey) {
  ensureLifeState();
  if (!LIFE_SKILLS[skillKey]) return;
  state.lifeAction = { type: skillKey, startedAt: Date.now(), lastYieldAt: Date.now() };
  log(`${LIFE_SKILLS[skillKey].icon} 开始${LIFE_SKILLS[skillKey].name}`, 'info');
  markDirty('life');
}

function stopLifeAction() {
  if (state.lifeAction) {
    const sk = LIFE_SKILLS[state.lifeAction.type];
    log(`${sk.icon} 停止${sk.name}`, 'info');
  }
  state.lifeAction = null;
  markDirty('life');
}

/* ---------- 主循环 tick ---------- */
function tickLife(now) {
  ensureLifeState();
  // buff 过期清理(每次循环统一处理)
  for (const k of Object.keys(state.lifeBuffs)) {
    if (state.lifeBuffs[k] && state.lifeBuffs[k] <= now) {
      delete state.lifeBuffs[k];
      log(`${k} buff 已过期`, 'info');
    }
  }
  if (!state.lifeAction) return;
  const la = state.lifeAction;
  if (now - la.lastYieldAt < LIFE_TICK_MS) return;
  const ticks = Math.floor((now - la.lastYieldAt) / LIFE_TICK_MS);
  la.lastYieldAt += ticks * LIFE_TICK_MS;
  lifeYieldTicks(la.type, ticks);
  markDirty('life');
}

function lifeYieldTicks(skillKey, ticks) {
  if (!LIFE_SKILLS[skillKey]) return;
  const s = state.life[skillKey];
  let yieldCount = 0;
  const yieldsByMat = {};
  for (let i = 0; i < ticks; i++) {
    const tier = lifePickMat(skillKey);
    if (!tier) continue;
    // 数量: 1 + 等级/30 (向下取整,即 lvl30 给 2 个, lvl60 给 3 个)
    const qty = 1 + Math.floor(s.lvl / 30);
    state.life.mats[tier.matKey] = (state.life.mats[tier.matKey] || 0) + qty;
    yieldsByMat[tier.matName] = (yieldsByMat[tier.matName] || 0) + qty;
    yieldCount += qty;
    // xp(高等级慢一些)
    const xp = s.lvl < 20 ? 3 : (s.lvl < 40 ? 2 : 1);
    lifeAddXp(skillKey, xp);
  }
  if (yieldCount > 0) {
    const desc = Object.entries(yieldsByMat).map(([n,q]) => `${n}×${q}`).join(' ');
    const sk = LIFE_SKILLS[skillKey];
    log(`${sk.icon} ${sk.name}: ${desc}`, 'loot');
  }
}

/* 离线累计:启动时调一次 */
function lifeOfflineCatchup() {
  ensureLifeState();
  if (!state.lifeAction) return;
  const now = Date.now();
  const elapsed = now - state.lifeAction.lastYieldAt;
  if (elapsed < LIFE_TICK_MS) return;
  let ticks = Math.floor(elapsed / LIFE_TICK_MS);
  ticks = Math.min(ticks, LIFE_MAX_OFFLINE_TICKS);
  state.lifeAction.lastYieldAt = now;
  lifeYieldTicks(state.lifeAction.type, ticks);
  const sk = LIFE_SKILLS[state.lifeAction.type];
  log(`📦 离线${sk.name}结算: ${ticks} 次(最多 ${LIFE_MAX_OFFLINE_TICKS} 次)`, 'good');
}

/* ---------- 制作 ---------- */
function lifeCanCraft(recipe) {
  // 等级
  if (recipe.minLvl) {
    for (const [k, v] of Object.entries(recipe.minLvl)) {
      if ((state.life[k]?.lvl || 0) < v) return { ok:false, why:`需要 ${LIFE_SKILLS[k].name} Lv.${v}` };
    }
  }
  // 材料
  for (const [k, v] of Object.entries(recipe.cost||{})) {
    if (k === 'essence') {
      if ((state.essence||0) < v) return { ok:false, why:`需要 ${v} ✨精华` };
    } else {
      if ((state.life.mats[k] || 0) < v) return { ok:false, why:`材料不足` };
    }
  }
  return { ok:true };
}

function lifeCraft(recipeKey) {
  const recipe = LIFE_RECIPES.find(r => r.key === recipeKey);
  if (!recipe) return;
  const can = lifeCanCraft(recipe);
  if (!can.ok) { log(can.why, 'bad'); return; }
  // 扣材料
  for (const [k, v] of Object.entries(recipe.cost||{})) {
    if (k === 'essence') state.essence -= v;
    else state.life.mats[k] -= v;
  }
  // 应用效果
  if (recipe.action === 'essence') {
    state.essence = (state.essence || 0) + recipe.value;
    log(`✨ 熔炼 ${recipe.name},+${recipe.value} 精华`, 'epic');
  } else if (recipe.action === 'buff') {
    state.lifeBuffs[recipe.buffKey] = Date.now() + recipe.buffDur;
    recomputeStats();
    log(`${recipe.icon} 享用 ${recipe.name},${Math.floor(recipe.buffDur/60000)} 分钟 buff!`, 'epic');
  }
  markDirty('life', 'hero');
}

/* 收集 buff 加成,被 recomputeStats 调用 */
function collectLifeMod() {
  ensureLifeState();
  const now = Date.now();
  const out = { atkPct:0, hpPct:0, defPct:0, xpMult:0, goldMult:0, dropMult:0 };
  for (const recipe of LIFE_RECIPES) {
    if (recipe.action !== 'buff') continue;
    if ((state.lifeBuffs[recipe.buffKey]||0) > now) {
      for (const [k, v] of Object.entries(recipe.buffMod||{})) out[k] = (out[k]||0) + v;
    }
  }
  return out;
}

/* ---------- 渲染 ---------- */
let lifeSubTab = 'gather'; // 'gather' | 'craft'

function renderLife() {
  ensureLifeState();
  const root = $('tab-life'); if (!root) return;
  const la = state.lifeAction;
  const now = Date.now();
  let html = '';

  html += `<div class="sub-tabs" style="margin-bottom:6px">
    <span class="sub-tab ${lifeSubTab==='gather'?'active':''}" data-lifesub="gather">🛠️ 采集</span>
    <span class="sub-tab ${lifeSubTab==='craft'?'active':''}" data-lifesub="craft">⚒️ 制作</span>
    <span class="sub-tab ${lifeSubTab==='bag'?'active':''}" data-lifesub="bag">📦 仓库</span>
  </div>`;

  if (lifeSubTab === 'gather') {
    if (la) {
      const sk = LIFE_SKILLS[la.type];
      const nextIn = Math.max(0, Math.ceil((la.lastYieldAt + LIFE_TICK_MS - now) / 1000));
      html += `<div class="ascend-box" style="border:1px solid ${sk.color}">
        <div style="color:${sk.color};font-weight:bold;font-size:13px">${profIcon(la.type, 18, sk.icon)} 进行中: ${sk.name}</div>
        <div class="muted" style="font-size:11px;margin:4px 0">下一次产出: ${nextIn}s</div>
        <button class="danger" data-action="lifeStop" style="width:100%;padding:6px">停止</button>
      </div>`;
    }
    for (const [key, sk] of Object.entries(LIFE_SKILLS)) {
      const s = state.life[key];
      const cur = s.xp, need = lifeXpNeeded(s.lvl);
      const pct = s.lvl >= LIFE_MAX_LVL ? 100 : Math.floor(cur*100/need);
      const isActive = la && la.type === key;
      // 解锁素材预览
      const unlocked = sk.tiers.filter(t => s.lvl >= t.minLvl);
      const next = sk.tiers.find(t => s.lvl < t.minLvl);
      const unlockedTxt = unlocked.map(t => `${t.matIcon}${t.matName}`).join(' ');
      const nextTxt = next ? ` · 下一档 Lv.${next.minLvl}: ${next.matIcon}${next.matName}` : '';
      html += `<div class="ascend-box" style="border-left:3px solid ${sk.color}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <b>${profIcon(key, 18, sk.icon)} ${sk.name} <span class="muted" style="font-size:11px">Lv.${s.lvl}</span></b>
          ${isActive
            ? `<span class="pill" style="background:${sk.color};color:#000">进行中</span>`
            : `<button class="${la?'':'success'}" data-action="lifeStart" data-key="${key}" ${la?'disabled':''} style="padding:4px 10px">开始</button>`}
        </div>
        <div class="bar xp" style="margin:2px 0"><i style="width:${pct}%"></i><span>${s.lvl>=LIFE_MAX_LVL?'MAX':`${cur}/${need}`}</span></div>
        <div class="muted" style="font-size:10px;margin-top:2px">已解锁: ${unlockedTxt}${nextTxt}</div>
      </div>`;
    }
    html += `<div class="muted" style="font-size:10px;margin-top:6px;line-height:1.5">
      ⏱ 每 30 秒产出一次 · 离线最多累计 ${LIFE_MAX_OFFLINE_TICKS*LIFE_TICK_MS/3600000} 小时<br>
      🆙 等级 30/60 时产量 +1 · 同时只能进行 1 种技能
    </div>`;
  } else if (lifeSubTab === 'craft') {
    // 当前 buff 状态
    const activeBuffs = [];
    for (const recipe of LIFE_RECIPES) {
      if (recipe.action === 'buff' && (state.lifeBuffs[recipe.buffKey]||0) > now) {
        const left = Math.ceil((state.lifeBuffs[recipe.buffKey]-now)/1000);
        activeBuffs.push(`${recipe.icon}${recipe.name} ${fmtCd(left)}`);
      }
    }
    if (activeBuffs.length > 0) {
      html += `<div class="ascend-box"><div class="detail-label">激活效果</div>
        <div style="font-size:11px;line-height:1.7">${activeBuffs.map(x=>`<span class="pill" style="background:rgba(34,197,94,0.18);color:#86efac;margin:1px">${x}</span>`).join('')}</div>
      </div>`;
    }
    for (const recipe of LIFE_RECIPES) {
      const can = lifeCanCraft(recipe);
      const costTxt = Object.entries(recipe.cost).map(([k,v]) => {
        if (k === 'essence') return `✨×${v}(剩${state.essence||0})`;
        const tier = Object.values(LIFE_SKILLS).flatMap(s=>s.tiers).find(t=>t.matKey===k);
        const have = state.life.mats[k] || 0;
        return `${tier?tier.matIcon:'?'}${tier?tier.matName:k}×${v}(剩${have})`;
      }).join(' · ');
      const lvlTxt = recipe.minLvl ? Object.entries(recipe.minLvl).map(([k,v]) => `${LIFE_SKILLS[k].icon}${LIFE_SKILLS[k].name}Lv.${v}`).join('+') : '';
      html += `<div class="ascend-milestone ${can.ok?'reached':''}">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <b>${recipe.icon} ${recipe.name}</b>
            <div class="muted" style="font-size:10px">${recipe.desc}</div>
            <div class="muted" style="font-size:10px">${lvlTxt?'需要 '+lvlTxt+' · ':''}${costTxt}</div>
          </div>
          <button class="${can.ok?'gold':''}" data-action="lifeCraft" data-key="${recipe.key}" ${can.ok?'':'disabled'} style="padding:4px 10px">制作</button>
        </div>
      </div>`;
    }
  } else if (lifeSubTab === 'bag') {
    html += `<div class="ascend-box"><div class="detail-label">材料仓库</div>`;
    const allTiers = Object.values(LIFE_SKILLS).flatMap(s => s.tiers);
    const grouped = {};
    for (const tier of allTiers) {
      const sk = Object.entries(LIFE_SKILLS).find(([,s]) => s.tiers.includes(tier))[0];
      grouped[sk] = grouped[sk] || [];
      grouped[sk].push(tier);
    }
    for (const [skKey, tiers] of Object.entries(grouped)) {
      const sk = LIFE_SKILLS[skKey];
      html += `<div style="margin-bottom:6px"><b style="color:${sk.color}">${sk.icon} ${sk.name}</b><div style="font-size:11px;line-height:1.7">`;
      for (const t of tiers) {
        const have = state.life.mats[t.matKey] || 0;
        html += `<span class="pill" style="background:var(--panel-2);margin:1px;opacity:${have>0?1:0.4}">${t.matIcon}${t.matName} ×${have}</span>`;
      }
      html += `</div></div>`;
    }
    html += '</div>';
  }

  root.innerHTML = html;
}
