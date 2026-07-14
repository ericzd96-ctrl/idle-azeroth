/* =========================================================
   astrology.js - 占星命盘 / 星座点亮
   ========================================================= */

const ASTROLOGY_OBSERVE_CAP_MS = 12 * 60 * 60 * 1000;
const ASTROLOGY_CONSTELLATIONS = [
  { key:'aegis', icon:'🛡️', name:'守护星座', theme:'承受伤害与持续恢复', reqLvl:10, nodes:[
    { name:'盾心', mod:{hpPct:2} }, { name:'石环', mod:{defPct:2} },
    { name:'生息', mod:{regFlat:3} }, { name:'坚壁', mod:{hpPct:2,defPct:1} },
    { name:'铁幕', mod:{vers:1} }, { name:'复苏', mod:{hpPct:3,regFlat:4} },
    { name:'堡垒', mod:{defPct:3,reflectDmg:2} }, { name:'不坠星辉', mod:{hpPct:5,defPct:4,vers:2} },
  ] },
  { key:'blade', icon:'⚔️', name:'战刃星座', theme:'攻击、暴击与斩杀', reqLvl:18, nodes:[
    { name:'锋芒', mod:{atkPct:2} }, { name:'锐眼', mod:{crit:1} },
    { name:'裂甲', mod:{armorPen:2} }, { name:'回旋', mod:{atkPct:2,critdPct:4} },
    { name:'破势', mod:{executeBonus:3} }, { name:'鸣刃', mod:{atkPct:3,crit:1} },
    { name:'终击', mod:{critdPct:8,executeBonus:4} }, { name:'赤星裁断', mod:{atkPct:6,crit:2,critdPct:10} },
  ] },
  { key:'spring', icon:'💠', name:'星泉星座', theme:'经验、金币与掉落', reqLvl:25, nodes:[
    { name:'微光', mod:{xpMult:3} }, { name:'金潮', mod:{goldMult:3} },
    { name:'寻迹', mod:{dropMult:3} }, { name:'盈月', mod:{xpMult:4,goldMult:2} },
    { name:'星尘袋', mod:{dropMult:4} }, { name:'远照', mod:{xpMult:5} },
    { name:'丰饶', mod:{goldMult:5,dropMult:3} }, { name:'群星馈赠', mod:{xpMult:8,goldMult:8,dropMult:8} },
  ] },
  { key:'arcane', icon:'🔮', name:'秘仪星座', theme:'精通、极速与技能循环', reqLvl:35, nodes:[
    { name:'符点', mod:{mastery:3} }, { name:'流速', mod:{haste:1} },
    { name:'冷辉', mod:{cdReduction:1} }, { name:'星桥', mod:{mastery:4,mpPct:2} },
    { name:'回响', mod:{buffDuration:2} }, { name:'法核', mod:{mastery:5,haste:1} },
    { name:'静默环', mod:{cdReduction:2,vers:1} }, { name:'奥术天顶', mod:{mastery:10,haste:2,cdReduction:2} },
  ] },
  { key:'voyage', icon:'🧭', name:'远征星座', theme:'探索、机动与生存手感', reqLvl:45, nodes:[
    { name:'旅步', mod:{spdPct:1} }, { name:'野火', mod:{dotBonus:3} },
    { name:'疾影', mod:{dodge:1} }, { name:'营火', mod:{hpPct:2,leech:1} },
    { name:'路标', mod:{xpMult:2,dropMult:2} }, { name:'疾行', mod:{spdPct:2,haste:1} },
    { name:'猎径', mod:{crit:1,leech:2} }, { name:'远星航图', mod:{spdPct:4,hpPct:3,dropMult:5} },
  ] },
  { key:'fate', icon:'✨', name:'命运星座', theme:'全局效率与终局收益', reqLvl:55, nodes:[
    { name:'细线', mod:{costReduction:1} }, { name:'回纹', mod:{goldMult:4} },
    { name:'幸光', mod:{dropMult:4} }, { name:'定数', mod:{atkPct:2,hpPct:2} },
    { name:'逆转', mod:{dodge:1,reflectDmg:3} }, { name:'命轮', mod:{xpMult:4,goldMult:4} },
    { name:'星裁', mod:{executeBonus:5,critdPct:8} }, { name:'天命织机', mod:{atkPct:5,hpPct:5,xpMult:6,goldMult:6,dropMult:6} },
  ] },
];

function accAstrology() {
  if (!account) account = defaultAccount();
  if (!account.astrology) account.astrology = { stardust:0, unlocked:{}, lastObserve:0, totalObserved:0 };
  if (!account.astrology.unlocked) account.astrology.unlocked = {};
  if (typeof account.astrology.stardust !== 'number') account.astrology.stardust = 0;
  if (typeof account.astrology.totalObserved !== 'number') account.astrology.totalObserved = 0;
  return account.astrology;
}

function astrologyNodeKey(cKey, idx) { return `${cKey}:${idx}`; }
function astrologyNodeUnlocked(cKey, idx) { return !!accAstrology().unlocked[astrologyNodeKey(cKey, idx)]; }
function astrologyUnlockedCount() { return Object.keys(accAstrology().unlocked || {}).length; }
function astrologyTotalNodes() { return ASTROLOGY_CONSTELLATIONS.reduce((sum, c) => sum + c.nodes.length, 0); }
function astrologyFind(cKey) { return ASTROLOGY_CONSTELLATIONS.find(c => c.key === cKey); }
function astrologyLevelReq(constellation, idx) { return constellation.reqLvl + idx * 3; }
function astrologyNodeCost(constellation, idx) {
  return Math.round(80 + constellation.reqLvl * 6 + Math.pow(idx + 1, 2) * 42);
}
function astrologyObserveRate() {
  const lvl = (typeof accLvl === 'function') ? accLvl() : (state?.hero?.lvl || 1);
  const achievements = account ? Object.keys(account.achievementsClaimed || {}).length : 0;
  const stronghold = (typeof strongholdTotalUpgrades === 'function') ? strongholdTotalUpgrades() : 0;
  return 18 + Math.floor(lvl / 2) + Math.floor(achievements / 4) + Math.floor(stronghold / 5);
}
function astrologyObserveAvailable() {
  const ast = accAstrology();
  const now = Date.now();
  const last = ast.lastObserve || 0;
  if (!last) return astrologyObserveRate();
  const elapsed = Math.min(ASTROLOGY_OBSERVE_CAP_MS, Math.max(0, now - last));
  return Math.floor((elapsed / (60 * 60 * 1000)) * astrologyObserveRate());
}

function claimAstrologyStardust() {
  const ast = accAstrology();
  const amount = astrologyObserveAvailable();
  if (amount <= 0) { log('星象仍在汇聚，稍后再观测', 'bad'); return 0; }
  ast.stardust += amount;
  ast.totalObserved += amount;
  ast.lastObserve = Date.now();
  if (typeof progressionCheckAch === 'function') progressionCheckAch();
  if (typeof renderAstrology === 'function') renderAstrology();
  if (typeof markDirty === 'function') markDirty('astrology', 'progression');
  if (typeof saveState === 'function') saveState();
  log(`✨ 观测星空获得 ${amount} 星尘`, 'legend');
  return amount;
}

function astrologyCanUnlock(constellation, idx) {
  const ast = accAstrology();
  if (!constellation || !constellation.nodes[idx]) return { ok:false, reason:'节点不存在' };
  if (astrologyNodeUnlocked(constellation.key, idx)) return { ok:false, reason:'已点亮' };
  const lvlReq = astrologyLevelReq(constellation, idx);
  const lvl = (typeof accLvl === 'function') ? accLvl() : (state?.hero?.lvl || 1);
  if (lvl < lvlReq) return { ok:false, reason:`需要账号等级 ${lvlReq}` };
  if (idx > 0 && !astrologyNodeUnlocked(constellation.key, idx - 1)) return { ok:false, reason:'需要先点亮前一颗星' };
  const cost = astrologyNodeCost(constellation, idx);
  if (ast.stardust < cost) return { ok:false, reason:`需要 ${cost} 星尘` };
  return { ok:true, cost };
}

function unlockAstrologyNode(cKey, idxRaw) {
  const idx = parseInt(idxRaw, 10);
  const constellation = astrologyFind(cKey);
  const check = astrologyCanUnlock(constellation, idx);
  if (!check.ok) { log(check.reason, 'bad'); return false; }
  const ast = accAstrology();
  const node = constellation.nodes[idx];
  ast.stardust -= check.cost;
  ast.unlocked[astrologyNodeKey(cKey, idx)] = Date.now();
  if (typeof recomputeStats === 'function') recomputeStats();
  if (typeof progressionCheckAch === 'function') progressionCheckAch();
  if (typeof renderAstrology === 'function') renderAstrology();
  if (typeof renderHeader === 'function') renderHeader();
  if (typeof markDirty === 'function') markDirty('hero', 'progression', 'astrology');
  if (typeof saveState === 'function') saveState();
  log(`✨ 点亮 ${constellation.name} · ${node.name}: ${astrologyModText(node.mod)}`, 'legend');
  return true;
}

function collectAstrologyMod() {
  const mod = {};
  const ast = accAstrology();
  for (const c of ASTROLOGY_CONSTELLATIONS) {
    c.nodes.forEach((node, idx) => {
      if (!ast.unlocked[astrologyNodeKey(c.key, idx)]) return;
      for (const [k, v] of Object.entries(node.mod || {})) mod[k] = (mod[k] || 0) + v;
    });
  }
  return mod;
}

function astrologyModText(mod) {
  return Object.entries(mod || {})
    .map(([k, v]) => typeof fmtMod === 'function' ? fmtMod(k, v) : `${k}+${v}`)
    .join(' · ') || '无';
}

function renderAstrology() {
  const root = $('tab-astrology');
  if (!root) return;
  const ast = accAstrology();
  const total = astrologyTotalNodes();
  const unlocked = astrologyUnlockedCount();
  const rate = astrologyObserveRate();
  const available = astrologyObserveAvailable();
  const activeText = astrologyModText(collectAstrologyMod());
  let html = `
    <div class="astro-head">
      <div>
        <div class="astro-title">✨ 占星命盘</div>
        <div class="muted">点亮星座节点 · 已点亮 <b>${unlocked}</b> / ${total} · 星尘 <b>${Math.floor(ast.stardust)}</b></div>
      </div>
      <button class="primary" data-action="astroObserve">观测 +${available} 星尘</button>
    </div>
    <div class="astro-summary">
      <span><b>星尘</b>${rate}/小时 · 最多累计 12 小时</span>
      <span><b>当前加成</b>${activeText || '暂无'}</span>
    </div>
    <div class="astro-board">
  `;
  for (const c of ASTROLOGY_CONSTELLATIONS) {
    const cUnlocked = c.nodes.filter((_, idx) => astrologyNodeUnlocked(c.key, idx)).length;
    html += `
      <div class="astro-constellation">
        <div class="astro-constellation-head">
          <div><b>${c.icon} ${c.name}</b><div class="muted">${c.theme}</div></div>
          <span>${cUnlocked}/${c.nodes.length}</span>
        </div>
        <div class="astro-node-row">
    `;
    c.nodes.forEach((node, idx) => {
      const isOn = astrologyNodeUnlocked(c.key, idx);
      const cost = astrologyNodeCost(c, idx);
      const lvlReq = astrologyLevelReq(c, idx);
      const check = astrologyCanUnlock(c, idx);
      html += `
        <button class="astro-node ${isOn?'is-on':''}" data-action="astroUnlock" data-constellation="${c.key}" data-idx="${idx}" ${(!check.ok && !isOn)?'disabled':''} title="${node.name} · ${astrologyModText(node.mod)}">
          <span class="astro-node-index">${idx + 1}</span>
          <div class="astro-node-main">
            <b>${node.name}</b>
            <small>${astrologyModText(node.mod)}</small>
            <em>${isOn ? '已点亮' : `${cost} 星尘 · Lv.${lvlReq}`}</em>
          </div>
        </button>
      `;
    });
    html += `
        </div>
      </div>
    `;
  }
  html += '</div>';
  root.innerHTML = html;
}

globalThis.ASTROLOGY_CONSTELLATIONS = ASTROLOGY_CONSTELLATIONS;
globalThis.collectAstrologyMod = collectAstrologyMod;
globalThis.astrologyUnlockedCount = astrologyUnlockedCount;
globalThis.renderAstrology = renderAstrology;
globalThis.claimAstrologyStardust = claimAstrologyStardust;
globalThis.unlockAstrologyNode = unlockAstrologyNode;
