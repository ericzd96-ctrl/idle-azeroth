/* =========================================================
   loadout.js — 配装预设(Build Loadouts,每角色)
   ----------------------------------------------------------
   一套方案 = 专精 + 天赋投点 + 技能栏顺序 + 穿戴装备(按 id)
   - 保存:快照当前 build
   - 应用:静默重置天赋→套用方案天赋(校验天赋点预算)、换技能栏、换装
   - 存于 state.loadouts(per-char),随存档持久化
   ========================================================= */

const MAX_LOADOUTS = 4;

function ensureLoadouts() {
  if (!state) return [];
  if (!Array.isArray(state.loadouts)) state.loadouts = [];
  return state.loadouts;
}

function loadoutEscape(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function loadoutSpecName(spec) {
  if (!spec) return '无专精';
  const c = (typeof getCls === 'function') ? getCls() : null;
  const t = c && c.trees ? c.trees.find(x => x.key === spec) : null;
  return t ? t.name : spec;
}

/* 当前总天赋点 = 未花 + 已投 */
function loadoutTotalTalentPoints() {
  let spent = 0;
  for (const tals of Object.values(state.talents || {})) for (const r of Object.values(tals)) spent += r;
  return (state.talentPoints || 0) + spent;
}

function snapshotLoadout(name) {
  const equipped = {};
  for (const slot of SLOT_ORDER) equipped[slot] = (state.equipped[slot] && state.equipped[slot].id != null) ? state.equipped[slot].id : null;
  return {
    name: name || ('方案 ' + ((state.loadouts ? state.loadouts.length : 0) + 1)),
    spec: state.specialization,
    talents: JSON.parse(JSON.stringify(state.talents || {})),
    skills: (state.selectedSkills || []).slice(),
    equipped,
  };
}

function saveLoadout(idx, name) {
  const list = ensureLoadouts();
  if (typeof idx === 'number' && list[idx]) {
    const snap = snapshotLoadout(name || list[idx].name);
    list[idx] = snap;
    log('💾 已用当前配装覆盖方案「' + snap.name + '」', 'good');
  } else {
    if (list.length >= MAX_LOADOUTS) { log('配装方案已满(' + MAX_LOADOUTS + '个),请覆盖现有方案', 'bad'); return; }
    const snap = snapshotLoadout(name);
    list.push(snap);
    log('💾 已保存配装方案「' + snap.name + '」', 'good');
  }
  markDirty('loadout');
  if (typeof saveState === 'function') saveState();
}

function deleteLoadout(idx) {
  const list = ensureLoadouts();
  if (!list[idx]) return;
  const n = list[idx].name;
  list.splice(idx, 1);
  log('🗑️ 删除配装方案「' + n + '」', 'info');
  markDirty('loadout');
  if (typeof saveState === 'function') saveState();
}

function renameLoadout(idx) {
  const list = ensureLoadouts();
  if (!list[idx]) return;
  const n = prompt('配装方案名称:', list[idx].name);
  if (n == null) return;
  list[idx].name = n.trim() || list[idx].name;
  markDirty('loadout');
  if (typeof saveState === 'function') saveState();
}

/* 套用方案的天赋(校验天赋点预算;不足则跳过天赋部分) */
function applyTalentsFromLoadout(lo) {
  let need = 0;
  for (const tals of Object.values(lo.talents || {})) for (const r of Object.values(tals)) need += r;
  const total = loadoutTotalTalentPoints();
  if (need > total) {
    log('⚠️ 当前天赋点不足以应用该方案的天赋(' + need + '>' + total + '),已跳过天赋(可能因觉醒重置了等级)', 'bad');
    return false;
  }
  const c = getCls();
  // 静默重置:清空现有天赋 + 移除天赋解锁的技能
  for (const [treeKey, tals] of Object.entries(state.talents || {})) {
    const tree = c.trees.find(t => t.key === treeKey);
    for (const tKey of Object.keys(tals)) {
      const t = tree && tree.talents.find(x => x.key === tKey);
      if (t && t.unlockSkill) {
        const sk = c.skills[t.unlockSkill];
        if (sk && !sk.unlockLvl) {
          delete state.unlockedSkills[t.unlockSkill];
          state.selectedSkills = (state.selectedSkills || []).filter(s => s !== t.unlockSkill);
        }
      }
    }
  }
  state.specialization = lo.spec;
  state.talents = JSON.parse(JSON.stringify(lo.talents || {}));
  state.talentPoints = total - need;
  if (typeof syncAllowedSkillUnlocks === 'function') syncAllowedSkillUnlocks();
  // 重新授予满级天赋解锁的技能
  for (const [treeKey, tals] of Object.entries(state.talents)) {
    const tree = c.trees.find(t => t.key === treeKey);
    if (!tree) continue;
    for (const [tKey, rank] of Object.entries(tals)) {
      const t = tree.talents.find(x => x.key === tKey);
      if (t && t.unlockSkill && rank >= t.max) state.unlockedSkills[t.unlockSkill] = true;
    }
  }
  return true;
}

/* 套用方案的装备:有则换上,缺失/超等级则保留当前槽位 */
function applyEquipFromLoadout(lo) {
  const byId = new Map();
  for (const it of state.inventory) byId.set(it.id, it);
  for (const it of Object.values(state.equipped)) if (it) byId.set(it.id, it);

  const newEq = Object.assign({}, state.equipped);
  for (const slot of SLOT_ORDER) {
    if (!lo.equipped || !(slot in lo.equipped)) continue;
    const id = lo.equipped[slot];
    if (id == null) { delete newEq[slot]; continue; }       // 方案此槽为空
    const it = byId.get(id);
    if (it && it.slot === slot && (!it.reqLvl || state.hero.lvl >= it.reqLvl)) newEq[slot] = it;
    // 缺失或等级不足 → 保留当前槽位
  }

  const equippedIds = new Set(Object.values(newEq).filter(Boolean).map(it => it.id));
  const all = [...state.inventory];
  for (const it of Object.values(state.equipped)) if (it) all.push(it);
  const seen = new Set();
  state.inventory = all.filter(it => {
    if (equippedIds.has(it.id) || seen.has(it.id)) return false;
    seen.add(it.id); return true;
  });
  state.equipped = {};
  for (const [s, it] of Object.entries(newEq)) if (it) state.equipped[s] = it;
}

function applyLoadout(idx) {
  const list = ensureLoadouts();
  const lo = list[idx];
  if (!lo) return;
  applyTalentsFromLoadout(lo);
  state.selectedSkills = (lo.skills || []).filter(k => state.unlockedSkills[k] && (typeof isSkillAllowedForCurrentSpec !== 'function' || isSkillAllowedForCurrentSpec(k))).slice(0, 8);
  if (typeof pruneSelectedSkillsForCurrentSpec === 'function') pruneSelectedSkillsForCurrentSpec();
  applyEquipFromLoadout(lo);
  if (typeof recomputeStats === 'function') recomputeStats();
  log('🎽 已应用配装方案「' + lo.name + '」', 'epic');
  markDirty('loadout', 'talents', 'skills', 'hero', 'inventory', 'equipment');
  if (typeof saveState === 'function') saveState();
}

/* ---------- 渲染 ---------- */
function renderLoadouts() {
  const el = document.getElementById('loadout-bar');
  if (!el) return;
  const list = ensureLoadouts();
  let html = '<div style="font-size:12px;font-weight:bold;margin-bottom:5px">⚙️ 配装方案 <span class="muted" style="font-weight:normal;font-size:10px">天赋+技能栏+装备 一键切换</span></div>';
  html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">';
  list.forEach((lo, i) => {
    const pieces = lo.equipped ? Object.values(lo.equipped).filter(x => x != null).length : 0;
    html += `<div style="border:1px solid var(--border);border-radius:8px;padding:6px 8px;min-width:130px">
      <div style="font-size:12px;font-weight:bold;margin-bottom:3px">${loadoutEscape(lo.name)}</div>
      <div class="muted" style="font-size:10px;margin-bottom:5px">${loadoutEscape(loadoutSpecName(lo.spec))} · ${(lo.skills || []).length}技 · ${pieces}件装备</div>
      <div style="display:flex;gap:3px;flex-wrap:wrap">
        <button class="primary" data-action="loApply" data-idx="${i}" style="font-size:11px;padding:2px 7px">应用</button>
        <button data-action="loSave" data-idx="${i}" style="font-size:11px;padding:2px 6px" title="用当前配装覆盖此方案">覆盖</button>
        <button data-action="loRename" data-idx="${i}" style="font-size:11px;padding:2px 5px" title="重命名">✏️</button>
        <button class="danger" data-action="loDelete" data-idx="${i}" style="font-size:11px;padding:2px 5px" title="删除">🗑️</button>
      </div>
    </div>`;
  });
  if (list.length < MAX_LOADOUTS) {
    html += `<button data-action="loNew" style="border:1px dashed var(--border);border-radius:8px;min-width:96px;font-size:12px;cursor:pointer">+ 保存当前配装</button>`;
  }
  html += '</div>';
  el.innerHTML = html;
}
