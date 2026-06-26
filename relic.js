/* =========================================================
   relic.js — 神器遗物 / 镶嵌系统(神器第二阶段)
   ----------------------------------------------------------
   - 账号共享背包 account.relics(未镶嵌); 已镶嵌存于 state.artifacts[spec].relics
   - 遗物槽随神器等级解锁: Lv.5 / 15 / 30 → 1 / 2 / 3 槽
   - 三种遗物(对应三类效果):
       神符 rune  → 给当前投入最多的神器特性 +阶(可突破 3 阶上限)
       印记 sigil → 强化神器招牌技能(伤害% / 冷却-%)
       神像 idol  → 赋予一个神器被动效果(proc, 走 collectArtifactFx)
   - 每个遗物附带一组属性加成(按稀有度缩放)
   - 获取: 打本掉落 + 商店购买(钻石); 背包可分解返还精华
   ========================================================= */

const RELIC_RARITY = {
  rare:   { name:'稀有', color:'#3b82f6', mult:1.0, stats:2 },
  epic:   { name:'史诗', color:'#a335ee', mult:1.7, stats:2 },
  legend: { name:'传说', color:'#ff8000', mult:2.6, stats:3 },
};
const RELIC_KIND_INFO = {
  rune:  { name:'神符', icon:'🔱', tag:'特性' },
  sigil: { name:'印记', icon:'📜', tag:'招牌' },
  idol:  { name:'神像', icon:'🗿', tag:'被动' },
};
const RELIC_STAT_POOL = ['atkPct','hpPct','defPct','critdPct','crit','mastery','haste'];
const RELIC_STAT_BASE = { atkPct:3, hpPct:4, defPct:3, critdPct:6, crit:2, mastery:3, haste:2 };
const RELIC_SHOP_PRICE = { rare:150, epic:400, legend:1000 };
const RELIC_SALVAGE_ESS = { rare:20, epic:50, legend:120 };

let _relicIdSeq = 1;
function relicPick(a){ return a[Math.floor(Math.random() * a.length)]; }
function nextRelicId(){ return 'rl' + (_relicIdSeq++) + '_' + Math.floor(Math.random() * 99999); }

function rollRelicIdolFx(rarity){
  const m = (RELIC_RARITY[rarity] || RELIC_RARITY.rare).mult;
  const opts = [
    { type:'onKill', nextSkillCrit:1, shieldPct:Math.round(4*m)/100 },
    { type:'onCrit', extraHitMul:Math.round(25*m)/100, extraHitIcon:'✦', cooldown:2500 },
    { type:'vsBoss', dmgPct:Math.round(8*m) },
    { type:'lowHp', threshold:0.4, shieldPct:Math.round(8*m)/100, cooldown:25000 },
    { type:'executeWindow', threshold:0.35, dmgPct:Math.round(12*m) },
    // 扩充被动(均为 combat 已支持的安全 fx 类型)
    { type:'vsState', state:'dot', dmgPct:Math.round(15*m) },
    { type:'vsState', state:'slow', dmgPct:Math.round(15*m) },
    { type:'lowHp', threshold:0.4, healPct:Math.round(7*m)/100, cooldown:25000 },
    { type:'onKill', shieldPct:Math.round(6*m)/100 },
  ];
  return relicPick(opts);
}

function makeRelic(kind, rarity){
  rarity = RELIC_RARITY[rarity] ? rarity : 'rare';
  kind = RELIC_KIND_INFO[kind] ? kind : relicPick(['rune','sigil','idol']);
  const R = RELIC_RARITY[rarity];
  const mod = {};
  const pool = RELIC_STAT_POOL.slice();
  for(let i = 0; i < R.stats && pool.length; i++){
    const k = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    mod[k] = (mod[k] || 0) + Math.max(1, Math.round(RELIC_STAT_BASE[k] * R.mult));
  }
  const r = { id: nextRelicId(), kind, rarity, mod };
  if(kind === 'rune'){
    r.bonusRank = rarity === 'legend' ? 2 : 1;
  } else if(kind === 'sigil'){
    r.skillDmgPct = Math.round(12 * R.mult);
    r.skillCdPct = Math.min(30, Math.round(6 * R.mult));
  } else {
    r.fx = rollRelicIdolFx(rarity);
  }
  return r;
}

function relicIcon(r){ return (RELIC_KIND_INFO[r.kind] || {}).icon || '🗿'; }
function relicDisplayName(r){
  const R = RELIC_RARITY[r.rarity] || RELIC_RARITY.rare;
  const K = RELIC_KIND_INFO[r.kind] || { name:'遗物' };
  return `${R.name}${K.name}`;
}
function relicFxText(fx){
  if(!fx) return '';
  switch(fx.type){
    case 'onKill': {
      const parts = [];
      if(fx.shieldPct) parts.push(`击杀后获得 ${Math.round((fx.shieldPct||0)*100)}% 最大生命护盾`);
      if(fx.nextSkillCrit) parts.push('下一次伤害技能必暴');
      if(fx.resetSkill) parts.push('重置关键技能冷却');
      if(fx.spreadDotPct) parts.push(`蔓延 ${Math.round((fx.spreadDotPct||0)*100)}% 的持续伤害`);
      return parts.join(' · ') || '击杀后触发强化';
    }
    case 'onCrit': return `暴击追加 ${Math.round((fx.extraHitMul||0)*100)}% 伤害`;
    case 'vsBoss': return `对首领伤害 +${fx.dmgPct}%`;
    case 'lowHp': {
      const parts = [];
      if(fx.healPct) parts.push(`恢复 ${Math.round((fx.healPct||0)*100)}% 生命`);
      if(fx.shieldPct) parts.push(`获得 ${Math.round((fx.shieldPct||0)*100)}% 最大生命护盾`);
      return `危急时${parts.join('并')}`;
    }
    case 'vsState': {
      const sn = { dot:'灼烧/持续伤害', slow:'减速', stun:'眩晕' }[fx.state] || fx.state;
      return `对带有[${sn}]的目标伤害 +${fx.dmgPct}%`;
    }
    case 'executeWindow': return `对残血(<${Math.round((fx.threshold||0.35)*100)}%)目标伤害 +${fx.dmgPct}%`;
    default: return '神秘效果';
  }
}
function relicEffectText(r){
  const parts = [];
  const modTxt = Object.entries(r.mod || {}).map(([k, v]) => (typeof fmtMod === 'function') ? fmtMod(k, v) : `${k}+${v}`).join(' · ');
  if(modTxt) parts.push(modTxt);
  if(r.kind === 'rune') parts.push(`最高神器特性 +${r.bonusRank} 阶(突破上限)`);
  else if(r.kind === 'sigil') parts.push(`招牌技伤害 +${r.skillDmgPct}%` + (r.skillCdPct ? ` · 冷却 -${r.skillCdPct}%` : ''));
  else if(r.kind === 'idol' && r.fx) parts.push(`被动: ${relicFxText(r.fx)}`);
  return parts.join(' · ');
}

// ---- 槽位 ----
function relicSlotCount(b){
  const lvl = (b && b.lvl) || 0;
  let n = 0;
  if(lvl >= 5) n = 1;
  if(lvl >= 15) n = 2;
  if(lvl >= 30) n = 3;
  return n;
}
function ensureRelicSlots(b){
  if(!b) return;
  if(!Array.isArray(b.relics)) b.relics = [];
  const n = relicSlotCount(b);
  while(b.relics.length < n) b.relics.push(null);
}
function socketedRelics(spec){
  spec = spec || (typeof activeArtifactSpec === 'function' ? activeArtifactSpec() : null);
  const b = spec && (typeof artifactBucket === 'function') && artifactBucket(spec);
  if(!b || !Array.isArray(b.relics)) return [];
  const n = relicSlotCount(b);
  return b.relics.slice(0, n).filter(Boolean);
}

// ---- 效果收集(供 artifact.js / combat.js 调用) ----
function collectRelicMod(){
  const out = {};
  for(const r of socketedRelics()){
    for(const [k, v] of Object.entries(r.mod || {})) out[k] = (out[k] || 0) + v;
  }
  return out;
}
function collectRelicFx(){
  const out = [];
  for(const r of socketedRelics()){
    if(!r.fx) continue;
    out.push(Object.assign({ key:'relic_' + r.id, artifactKey:'relic_' + r.id, artifactName:relicDisplayName(r), source:'artifact', relic:true }, r.fx));
  }
  return out;
}
function artifactRelicSkillBoost(){
  let dmgPct = 0, cdPct = 0;
  for(const r of socketedRelics()){ dmgPct += r.skillDmgPct || 0; cdPct += r.skillCdPct || 0; }
  return { dmgPct, cdPct: Math.min(50, cdPct) };
}
// 神符: 给当前投入最多的次要节点 +阶(突破上限)
function relicTopNodeBonus(spec){
  spec = spec || (typeof activeArtifactSpec === 'function' ? activeArtifactSpec() : null);
  const b = spec && (typeof artifactBucket === 'function') && artifactBucket(spec);
  if(!b) return null;
  let bonus = 0;
  for(const r of socketedRelics(spec)){ if(r.kind === 'rune') bonus += r.bonusRank || 0; }
  if(bonus <= 0) return null;
  let topKey = null, topRank = 0;
  for(const [k, rk] of Object.entries(b.traits || {})){
    if(/_entry$/.test(k)) continue;   // 跳过入门(招牌技)节点 — 它无属性/fx, +阶无意义
    if(rk > topRank){ topRank = rk; topKey = k; }
  }
  if(!topKey) return null;
  return { nodeKey: topKey, bonus };
}

// ---- 背包操作 ----
function relicBag(){ if(!Array.isArray(account.relics)) account.relics = []; return account.relics; }
function relicBagRemove(id){
  const bag = relicBag();
  const i = bag.findIndex(r => r && r.id === id);
  return i < 0 ? null : bag.splice(i, 1)[0];
}
function relicSocket(id){
  const spec = (typeof activeArtifactSpec === 'function') ? activeArtifactSpec() : null;
  if(!spec){ log('请先选择专精', 'bad'); return; }
  const b = artifactBucket(spec); ensureRelicSlots(b);
  const slots = relicSlotCount(b);
  if(slots <= 0){ log('神器等级不足, 尚无遗物槽', 'bad'); return; }
  let free = -1;
  for(let i = 0; i < slots; i++){ if(!b.relics[i]){ free = i; break; } }
  if(free < 0){ log('没有空闲遗物槽(可先拆下)', 'bad'); return; }
  const r = relicBagRemove(id); if(!r) return;
  b.relics[free] = r;
  log(`🗿 镶嵌遗物: ${relicDisplayName(r)}`, 'good');
  recomputeStats(); markDirty('artifact', 'hero');
}
function relicUnsocket(slot){
  const spec = (typeof activeArtifactSpec === 'function') ? activeArtifactSpec() : null;
  const b = spec && artifactBucket(spec);
  slot = +slot;
  const r = b && Array.isArray(b.relics) && b.relics[slot];
  if(!r) return;
  b.relics[slot] = null;
  relicBag().push(r);
  log(`🗿 拆下遗物: ${relicDisplayName(r)}`, 'info');
  recomputeStats(); markDirty('artifact', 'hero');
}
function relicBuy(rarity){
  const price = RELIC_SHOP_PRICE[rarity]; if(!price) return;
  if((state.gem || 0) < price){ log(`💎 钻石不足, 需要 ${price}`, 'bad'); return; }
  state.gem -= price;
  const r = makeRelic(null, rarity);
  relicBag().push(r);
  log(`🛒 购得 ${relicDisplayName(r)} — ${relicEffectText(r)}`, 'epic');
  markDirty('artifact', 'hero');
}
function relicSalvage(id){
  const r = relicBagRemove(id); if(!r) return;
  const ess = RELIC_SALVAGE_ESS[r.rarity] || 20;
  state.essence = (state.essence || 0) + ess;
  log(`♻️ 分解 ${relicDisplayName(r)}, 返还 ${ess} 精华`, 'good');
  markDirty('artifact', 'hero');
}

// ---- 掉落 ----
function relicTryDrop(rarity, src){
  rarity = RELIC_RARITY[rarity] ? rarity : 'rare';
  const r = makeRelic(null, rarity);
  relicBag().push(r);
  log(`🗿 ${src || '战斗'}掉落遗物: ${relicDisplayName(r)} (${RELIC_RARITY[rarity].name}) — 前往神器面板镶嵌`, 'legend');
  markDirty('artifact');
  return r;
}
function relicOnDungeonClear(dg){
  const lvl = (dg && (dg.reqLvl || dg.lvl)) || 40;
  if(Math.random() < 0.18){
    let rarity = 'rare';
    const roll = Math.random();
    if(lvl >= 70 && roll < 0.15) rarity = 'legend';
    else if(roll < 0.4) rarity = 'epic';
    relicTryDrop(rarity, '副本');
  }
}
// 大秘境通关:保底史诗,高层有传说;层数越高掉率越高
function relicOnMythicClear(level){
  level = level || 1;
  const chance = Math.min(0.55, 0.22 + level * 0.02);
  if(Math.random() < chance){
    let rarity = 'epic';
    const roll = Math.random();
    if(level >= 12 && roll < 0.40) rarity = 'legend';
    else if(level >= 6 && roll < 0.22) rarity = 'legend';
    relicTryDrop(rarity, `大秘境+${level}`);
  }
}
// 无尽塔:仅在刷新最高层时掉(奖励推塔,不奖励反复刷低层),层数越高越好
function relicOnTowerFloor(floor){
  floor = floor || 1;
  const chance = Math.min(0.6, 0.12 + floor * 0.006);
  if(Math.random() < chance){
    let rarity = 'rare';
    const roll = Math.random();
    if(floor >= 60 && roll < 0.25) rarity = 'legend';
    else if(floor >= 25 && roll < 0.45) rarity = 'epic';
    else if(roll < 0.22) rarity = 'epic';
    relicTryDrop(rarity, `无尽塔 ${floor} 层`);
  }
}

// ---- 渲染(返回 HTML, 由 renderArtifact 拼接) ----
function renderRelicSection(spec, b){
  const slots = relicSlotCount(b);
  if(slots <= 0){
    return `<div class="ascend-box"><div class="detail-label">🗿 遗物镶嵌</div><div class="muted" style="font-size:10px">神器达到 <b>Lv.5</b> 解锁第一个遗物槽(Lv.15 / 30 再开 2 个)。当前神器 Lv.${(b && b.lvl) || 0}</div></div>`;
  }
  ensureRelicSlots(b);
  let html = `<div class="ascend-box"><div class="detail-label">🗿 遗物镶嵌 <span class="muted" style="font-weight:normal">(${slots} 槽)</span></div>`;
  html += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">`;
  for(let i = 0; i < slots; i++){
    const r = b.relics[i];
    if(r){
      const R = RELIC_RARITY[r.rarity] || RELIC_RARITY.rare;
      html += `<div style="flex:1;min-width:130px;border:1px solid ${R.color};border-radius:6px;padding:4px 6px">
        <div style="font-size:11px;color:${R.color}"><b>${relicIcon(r)} ${relicDisplayName(r)}</b></div>
        <div class="muted" style="font-size:9px;line-height:1.4">${relicEffectText(r)}</div>
        <button class="danger" data-action="relicUnsocket" data-slot="${i}" style="padding:1px 7px;font-size:10px;margin-top:3px">拆下</button>
      </div>`;
    } else {
      html += `<div style="flex:1;min-width:130px;border:1px dashed #555;border-radius:6px;padding:10px 6px;text-align:center;color:var(--muted);font-size:10px">空槽 ${i + 1}</div>`;
    }
  }
  html += `</div>`;
  html += `<div class="muted" style="font-size:10px;margin-bottom:5px">🛒 遗物商店(随机):
    <button data-action="relicBuy" data-rarity="rare" style="padding:1px 7px;font-size:10px">稀有 ${RELIC_SHOP_PRICE.rare}💎</button>
    <button data-action="relicBuy" data-rarity="epic" style="padding:1px 7px;font-size:10px">史诗 ${RELIC_SHOP_PRICE.epic}💎</button>
    <button data-action="relicBuy" data-rarity="legend" style="padding:1px 7px;font-size:10px">传说 ${RELIC_SHOP_PRICE.legend}💎</button></div>`;
  const bag = relicBag();
  html += `<div class="detail-label" style="font-size:11px">遗物背包 (${bag.length})</div>`;
  if(!bag.length){
    html += `<div class="muted" style="font-size:10px">暂无未镶嵌遗物 — 副本通关 / 大秘境 / 无尽塔刷新最高层掉落,或在上方商店购买</div>`;
  } else {
    const hasFree = b.relics.slice(0, slots).some(x => !x);
    html += `<div style="display:flex;flex-direction:column;gap:3px;max-height:220px;overflow:auto">`;
    for(const r of bag){
      const R = RELIC_RARITY[r.rarity] || RELIC_RARITY.rare;
      html += `<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;border-left:3px solid ${R.color};padding:3px 6px">
        <div style="min-width:0">
          <div style="font-size:11px;color:${R.color}"><b>${relicIcon(r)} ${relicDisplayName(r)}</b></div>
          <div class="muted" style="font-size:9px;line-height:1.4">${relicEffectText(r)}</div>
        </div>
        <div style="display:flex;gap:3px;flex-shrink:0">
          <button class="${hasFree ? 'success' : ''}" data-action="relicSocket" data-id="${r.id}" ${hasFree ? '' : 'disabled'} style="padding:1px 8px;font-size:10px">镶嵌</button>
          <button class="danger" data-action="relicSalvage" data-id="${r.id}" style="padding:1px 7px;font-size:10px" title="分解返还精华">分解</button>
        </div>
      </div>`;
    }
    html += `</div>`;
  }
  html += `</div>`;
  return html;
}
