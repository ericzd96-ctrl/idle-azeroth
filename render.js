/* =========================================================
   render.js — 选择性渲染(只重建脏面板),修复按钮点不响应
   ----------------------------------------------------------
   核心思路:
   1) 动作触发 markDirty('xxx'),loop 中只重建该面板
   2) 战斗血条/数字直接更新 textContent / style.width,不重建 DOM
   3) BOSS/副本 冷却 通过查找已有元素直接更新文本,不整列表重建
   ========================================================= */

/* ---------- 每帧轻量更新(不重建 DOM) ---------- */
let attrTips = {};

/* ---------- 触屏 Tooltip 固定/取消 ---------- */
let _tipPinned = false;
let _tipPinnedOwner = null;

function tooltipTapMode() {
  if (typeof window === 'undefined') return false;
  if (typeof isMobileLayout === 'function' && isMobileLayout()) return true;
  try {
    return !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  } catch (_) {
    return window.innerWidth <= 920;
  }
}

function tooltipHoverEnabled() {
  return !tooltipTapMode();
}

function classSkillEntriesSorted(cls) {
  const entries = Object.entries((cls && cls.skills) || {});
  if (typeof classSkillEntriesForCurrentSpec === 'function') return classSkillEntriesForCurrentSpec(cls);
  const order = new Map(entries.map(([key], idx) => [key, idx]));
  return entries.sort((a, b) => {
    const sa = a[1] || {}, sb = b[1] || {};
    const la = Number.isFinite(sa.unlockLvl) ? sa.unlockLvl : 9999;
    const lb = Number.isFinite(sb.unlockLvl) ? sb.unlockLvl : 9999;
    if (la !== lb) return la - lb;
    return (order.get(a[0]) || 0) - (order.get(b[0]) || 0);
  });
}

function hpWithShieldText(hp, hpMax, shield) {
  const base = `${fmt(Math.max(0, hp))}/${fmt(hpMax)}`;
  return shield > 0 ? `${base} +${fmt(shield)}盾` : base;
}

function unpinTip() {
  _tipPinned = false;
  _tipPinnedOwner = null;
  const tip = document.getElementById('compare-tip');
  if (tip) {
    tip.style.display = 'none';
    tip.classList.remove('mobile-tip');
    tip.style.bottom = '';
    delete tip.dataset.mobileOpened;
  }
}

function addTouchPin(el, showFn) {
  el.addEventListener('click', e => {
    if (e.target && e.target.closest && e.target.closest('button,select,input,textarea,a,label,[data-action],[data-modal-close]')) {
      return;
    }
    e.stopPropagation();
    if (_tipPinned && _tipPinnedOwner === el) {
      unpinTip();
    } else {
      if (_tipPinned) unpinTip();
      showFn(e);
      _tipPinned = true;
      _tipPinnedOwner = el;
    }
  });
}

function buildInlineTipHeadHtml(name, icon, fallbackIcon, desc, color, meta) {
  const safeName = tipAttrText(name || '机制');
  const safeDesc = tipAttrText(desc || '暂无机制说明');
  const safeMeta = tipAttrText(meta || '');
  const safeColor = tipAttrText(color || '#f8fafc');
  const iconHtml = symbolIconHtml(icon || '⚙️', 14, safeName, fallbackIcon || 'achievement_boss_illidan');
  return `<div style="font-size:12px;font-weight:700;color:${safeColor}">${iconHtml} ${safeName}${safeMeta ? ` <span style="font-size:10px;color:#cbd5e1">${safeMeta}</span>` : ''}</div><div class="muted" style="margin-top:4px;line-height:1.55">${safeDesc}</div>`;
}

function bindInlineTipElements(root) {
  const scope = root && root.querySelectorAll ? root : document;
  scope.querySelectorAll('[data-inline-tip-name]').forEach(el => {
    if (el.dataset.inlineTipBound === '1') return;
    el.dataset.inlineTipBound = '1';
    const showTip = e => {
      const tip = $('compare-tip');
      if (!tip) return;
      tip.querySelector('.compare-head').innerHTML = buildInlineTipHeadHtml(
        el.dataset.inlineTipName,
        el.dataset.inlineTipIcon,
        el.dataset.inlineTipFallback,
        el.dataset.inlineTipDesc,
        el.dataset.inlineTipColor,
        el.dataset.inlineTipMeta
      );
      tip.querySelector('.compare-body').innerHTML = '';
      tip.style.display = 'block';
      positionTip(tip, e);
    };
    el.addEventListener('mouseenter', e => { if (!tooltipHoverEnabled()) return; showTip(e); });
    el.addEventListener('mouseleave', () => { if (!tooltipHoverEnabled()) return; if (!_tipPinned) $('compare-tip').style.display = 'none'; });
    el.addEventListener('mousemove', e => { if (!tooltipHoverEnabled()) return; positionTip($('compare-tip'), e); });
    addTouchPin(el, showTip);
  });
}

function setupAttrHover() {
  document.querySelectorAll('.attr-cell').forEach(cell => {
    const showFn = e => {
      const vEl = cell.querySelector('.v');
      const key = vEl ? vEl.id.replace('a-','') : null;
      const html = attrTips[key];
      if (!html) return;
      const tip = $('compare-tip');
      tip.querySelector('.compare-head').innerHTML = html;
      tip.querySelector('.compare-body').innerHTML = '';
      tip.style.display = 'block';
      positionTip(tip, e);
    };
    cell.addEventListener('mouseenter', e => { if (!tooltipHoverEnabled()) return; showFn(e); });
    cell.addEventListener('mouseleave', () => { if (!tooltipHoverEnabled()) return; if (!_tipPinned) { $('compare-tip').style.display = 'none'; } });
    cell.addEventListener('mousemove', e => { if (!tooltipHoverEnabled()) return; positionTip($('compare-tip'), e); });
    addTouchPin(cell, showFn);
  });
}
/* 竖排敌人列表:仅在敌群构成/焦点变化时重建 DOM(避免每帧重建破坏 hover/点击),
   每帧只更新血条宽度与数字。焦点行带 legacy id(mon-emoji/mon-name/b-mhp/t-mhp)供 showFloat 锚定。 */
let _monListSig = '';
let skillDragging = false;   // 技能栏拖拽排序进行中(由 main.js 设置),期间不重建技能栏
let _hNameLastSig = '';       // 英雄名签名, 避免每帧 innerHTML
let _lastZoneSig = '';        // 关卡信息签名, 避免每帧 innerHTML
let _buffBarStruct = '';     // 增益条结构签名(不含倒计时),变化才重建 DOM
let _lastMonListPaint = 0;
let _lastBuffBarPaint = 0;
let _lastDmgMeterPaint = 0;
let _invFilterSlot = 'all';   // 背包部位筛选
let _invFilterRarity = 'all'; // 背包品质筛选
let _dmSampleTotal = 0, _dmSampleTs = 0;   // 峰值秒伤采样基线
let _dmDpsTrendValue = 0, _dmDpsTrendTs = 0, _dmDpsTrendDir = 'stable', _dmDpsTrendPct = 0;
let _dmRecentSkillSig = '';
let _navBadgePaint = 0, _expLivePaint = 0; // 导航红点 / 远征实时刷新节流
const _headerResourceLast = {};
function setHeaderResourceText(id, key, value) {
  const el = $(id);
  if (!el) return;
  const next = Math.floor(value || 0);
  const prev = _headerResourceLast[key];
  el.textContent = fmt(next);
  if (prev === undefined) {
    _headerResourceLast[key] = next;
    return;
  }
  if (prev === next) return;
  _headerResourceLast[key] = next;
  const host = el.closest('.head-stats > span, .head-stats .pill') || el.parentElement;
  if (!host) return;
  const gain = next > prev;
  const cls = gain ? 'currency-gain' : 'currency-spend';
  host.classList.remove('currency-gain', 'currency-spend');
  void host.offsetWidth;
  host.classList.add(cls);
  const delta = document.createElement('em');
  delta.className = 'currency-delta ' + (gain ? 'gain' : 'spend');
  delta.textContent = (gain ? '+' : '') + fmt(next - prev);
  host.appendChild(delta);
  setTimeout(() => {
    host.classList.remove(cls);
    delta.remove();
  }, 920);
}
function dmgMeterTrendMeta(dps, total) {
  const now = Date.now();
  if (!total || dps <= 0) {
    _dmDpsTrendValue = 0;
    _dmDpsTrendTs = 0;
    _dmDpsTrendDir = 'stable';
    _dmDpsTrendPct = 0;
    return { dir:'stable', icon:'', label:'', title:'暂无伤害数据' };
  }
  if (!_dmDpsTrendTs || !_dmDpsTrendValue) {
    _dmDpsTrendValue = dps;
    _dmDpsTrendTs = now;
    return { dir:'stable', icon:'→', label:'稳定', title:'正在建立秒伤趋势' };
  }
  if (now - _dmDpsTrendTs >= 1200) {
    const prev = Math.max(1, _dmDpsTrendValue);
    const pct = (dps - prev) / prev;
    _dmDpsTrendDir = pct > 0.08 ? 'up' : (pct < -0.08 ? 'down' : 'stable');
    _dmDpsTrendPct = Math.round(Math.abs(pct) * 100);
    _dmDpsTrendValue = dps;
    _dmDpsTrendTs = now;
  }
  if (_dmDpsTrendDir === 'up') return { dir:'up', icon:'▲', label:`+${_dmDpsTrendPct}%`, title:`秒伤上升 ${_dmDpsTrendPct}%` };
  if (_dmDpsTrendDir === 'down') return { dir:'down', icon:'▼', label:`-${_dmDpsTrendPct}%`, title:`秒伤下降 ${_dmDpsTrendPct}%` };
  return { dir:'stable', icon:'→', label:'稳定', title:'秒伤基本稳定' };
}
function updateDmgRecentSkills() {
  const el = $('dm-recent-skills');
  if (!el) return;
  const list = (typeof combatRecentSkillCasts === 'function') ? combatRecentSkillCasts() : [];
  const sig = list.map(x => `${x.actor}:${x.school}:${x.icon}:${x.name}:${x.ts}`).join('|');
  if (sig === _dmRecentSkillSig) return;
  _dmRecentSkillSig = sig;
  el.replaceChildren();
  if (!list.length) {
    el.className = 'dm-recent-skills idle';
    const empty = document.createElement('span');
    empty.textContent = '最近技能 -';
    el.appendChild(empty);
    return;
  }
  el.className = 'dm-recent-skills';
  const label = document.createElement('span');
  label.className = 'dm-recent-label';
  label.textContent = '最近';
  el.appendChild(label);
  const actorName = { hero:'主角', companion:'随从', boss:'首领' };
  for (const item of list) {
    const chip = document.createElement('span');
    const actor = String(item.actor || 'hero').replace(/[^a-z0-9_-]/gi, '') || 'hero';
    const school = String(item.school || 'physical').replace(/[^a-z0-9_-]/gi, '') || 'physical';
    chip.className = `dm-recent-chip actor-${actor} school-${school}`;
    chip.title = `${actorName[actor] || '技能'}释放 ${item.icon || ''}${item.name || ''}`;
    chip.textContent = `${actorName[actor] || '技能'} ${(item.icon || '')}${item.name || ''}`;
    el.appendChild(chip);
  }
}
function updateCombatReactionAdvice() {
  const el = $('dm-reaction');
  if (!el) return;
  const now = Date.now();
  const ui = (typeof bossCastUiState === 'function') ? bossCastUiState(now) : null;
  let cls = 'idle';
  let text = '稳定输出';
  let title = '当前没有需要立即处理的战斗事件。';
  if (ui) {
    const remain = Math.max(0, Math.ceil((ui.remainMs || 0) / 1000));
    const castName = `${ui.cast?.icon || ''}${ui.cast?.name || '施法'}`;
    if (ui.canInterrupt) {
      if (ui.ready) {
        cls = ui.urgent ? 'danger' : 'warn';
        text = `${ui.urgent ? '立刻打断' : '可打断'} · ${castName} · ${remain}秒`;
        title = ui.action || '点击打断技能处理这次读条。';
      } else if (ui.urgent) {
        cls = 'danger';
        text = `打断未就绪 · 减伤/治疗 · ${remain}秒`;
        title = ui.action || '高危读条无法立刻打断,优先用保命技能覆盖。';
      } else {
        cls = 'warn';
        text = `等打断/准备硬吃 · ${remain}秒`;
        title = ui.action || '普通读条,可等待打断或准备承受。';
      }
    } else {
      cls = ui.responseReady ? 'warn' : 'danger';
      text = `${ui.responseReady ? '开保命' : '不可断'} · ${castName} · ${remain}秒`;
      title = ui.action || '这次读条不可打断,用治疗、护盾或减伤覆盖。';
    }
  } else {
    const hMax = Math.max(1, state?.hero?.hpMax || 1);
    const hpPct = Math.max(0, state?.hp || 0) / hMax;
    const compStats = (typeof computeCompanionStats === 'function') ? computeCompanionStats() : null;
    const compAlive = !!compStats && state?._compHp != null && !(typeof compDowned === 'function' && compDowned());
    const compPct = compAlive ? Math.max(0, state._compHp || 0) / Math.max(1, compStats.hpMax || 1) : 1;
    if (hpPct < 0.32) {
      cls = 'danger';
      text = '先保命 · 治疗/减伤';
      title = '主角生命较低,先用治疗、护盾或减伤技能稳定血线。';
    } else if (compAlive && compPct < 0.34) {
      cls = 'danger';
      text = '随从告急 · 治疗/护卫';
      title = '随从生命较低,治疗或切换护卫节奏能避免倒地。';
    } else if (hpPct < 0.58) {
      cls = 'warn';
      text = '血线偏低 · 留保命';
      title = '主角血线偏低,保留治疗或防御技能应对下一次读条。';
    } else if (compAlive && compPct < 0.58) {
      cls = 'warn';
      text = '随从吃紧 · 留治疗';
      title = '随从承压,留意治疗随从或护盾类技能。';
    }
  }
  el.className = `dm-reaction ${cls}`;
  el.title = title;
  if (el.textContent !== text) el.textContent = text;
}
function updateDmgLastHit() {
  const el = $('dm-last-hit');
  if (!el) return;
  const ds = (typeof dmgStats !== 'undefined') ? dmgStats : null;
  if (!ds || (!ds.lastTakenAt && !ds.lastCompTakenAt)) {
    el.className = 'dm-last-hit idle';
    el.textContent = '-';
    el.removeAttribute('title');
    return;
  }
  const heroAt = ds.lastTakenAt || 0;
  const compAt = ds.lastCompTakenAt || 0;
  const target = compAt > heroAt ? '随从' : '主角';
  const amount = target === '随从' ? (ds.lastCompTakenAmount || 0) : (ds.lastTakenAmount || 0);
  const at = target === '随从' ? compAt : heroAt;
  const source = target === '随从' ? (ds.lastCompTakenSource || '敌人') : (ds.lastTakenSource || '敌人');
  const skill = target === '随从' ? (ds.lastCompTakenSkill || '') : (ds.lastTakenSkill || '');
  const boss = target === '随从' ? !!ds.lastCompTakenBoss : !!ds.lastTakenBoss;
  const now = Date.now();
  const ago = at ? Math.max(0, Math.floor((now - at) / 1000)) : 0;
  const maxHp = target === '随从'
    ? Math.max(1, ((typeof computeCompanionStats === 'function') ? computeCompanionStats()?.hpMax : 1) || 1)
    : Math.max(1, state?.hero?.hpMax || 1);
  const pct = amount / maxHp;
  let cls = boss || pct >= 0.16 ? 'danger' : (pct >= 0.07 ? 'warn' : 'idle');
  const sourceText = [source, skill].filter(Boolean).join(' · ');
  const agoText = ago < 60 ? `${ago}秒前` : `${Math.floor(ago / 60)}分钟前`;
  const text = `${target} -${fmt(amount)} · ${sourceText || '未知来源'}`;
  el.className = `dm-last-hit ${cls}`;
  el.textContent = text;
  el.title = `最近承伤: ${target} 在${agoText}受到 ${fmt(amount)} 点伤害。来源: ${sourceText || '未知来源'}。${boss ? '首领技能或首领攻击。' : ''}`;
}
function updateDmgLastHeal() {
  const el = $('dm-last-heal');
  if (!el) return;
  const ds = (typeof dmgStats !== 'undefined') ? dmgStats : null;
  if (!ds || (!ds.lastHeroHealAt && !ds.lastCompHealAt)) {
    el.className = 'dm-last-heal idle';
    el.textContent = '-';
    el.removeAttribute('title');
    return;
  }
  const heroAt = ds.lastHeroHealAt || 0;
  const compAt = ds.lastCompHealAt || 0;
  const source = compAt > heroAt ? '随从' : '主角';
  const amount = source === '随从' ? (ds.lastCompHealAmount || 0) : (ds.lastHeroHealAmount || 0);
  const at = source === '随从' ? compAt : heroAt;
  const skill = source === '随从' ? (ds.lastCompHealSkill || '') : (ds.lastHeroHealSkill || '');
  const ago = at ? Math.max(0, Math.floor((Date.now() - at) / 1000)) : 0;
  const agoText = ago < 60 ? `${ago}秒前` : `${Math.floor(ago / 60)}分钟前`;
  const targetText = source === '随从' ? '随从支援' : '主角治疗';
  const text = `${targetText} +${fmt(amount)}${skill ? ' · ' + skill : ''}`;
  el.className = `dm-last-heal ${source === '随从' ? 'companion' : 'hero'}`;
  el.textContent = text;
  el.title = `最近治疗: ${targetText} 在${agoText}恢复 ${fmt(amount)} 点生命。${skill ? '来源: ' + skill + '。' : ''}`;
}
function updateDmgLastShield() {
  const el = $('dm-last-shield');
  if (!el) return;
  const ds = (typeof dmgStats !== 'undefined') ? dmgStats : null;
  if (!ds || (!ds.lastHeroShieldAt && !ds.lastCompShieldAt)) {
    el.className = 'dm-last-shield idle';
    el.textContent = '-';
    el.removeAttribute('title');
    return;
  }
  const heroAt = ds.lastHeroShieldAt || 0;
  const compAt = ds.lastCompShieldAt || 0;
  const source = compAt > heroAt ? '随从' : '主角';
  const amount = source === '随从' ? (ds.lastCompShieldAmount || 0) : (ds.lastHeroShieldAmount || 0);
  const at = source === '随从' ? compAt : heroAt;
  const skill = source === '随从' ? (ds.lastCompShieldSkill || '') : (ds.lastHeroShieldSkill || '');
  const ago = at ? Math.max(0, Math.floor((Date.now() - at) / 1000)) : 0;
  const agoText = ago < 60 ? `${ago}秒前` : `${Math.floor(ago / 60)}分钟前`;
  const label = source === '随从' ? '随从护盾' : '主角护盾';
  const text = `${label} +${fmt(amount)}${skill ? ' · ' + skill : ''}`;
  el.className = `dm-last-shield ${source === '随从' ? 'companion' : 'hero'}`;
  el.textContent = text;
  el.title = `最近护盾: ${label} 在${agoText}获得 ${fmt(amount)} 点护盾。${skill ? '来源: ' + skill + '。' : ''}`;
}
function topDamageSkillEntry() {
  const ds = (typeof dmgStats !== 'undefined') ? dmgStats : null;
  if (!ds) return null;
  let best = null;
  const scan = (map, who) => {
    Object.entries(map || {}).forEach(([name, amount]) => {
      const value = Math.floor(amount || 0);
      if (value <= 0) return;
      if (!best || value > best.amount) best = { who, name, amount: value };
    });
  };
  scan(ds.heroSkills, '主角');
  scan(ds.compSkills, '随从');
  return best;
}
function updateDmgTopSkill(total) {
  const el = $('dm-top-skill');
  if (!el) return;
  const best = topDamageSkillEntry();
  if (!best) {
    el.className = 'dm-top-skill idle';
    el.textContent = '-';
    el.removeAttribute('title');
    return;
  }
  const pct = total > 0 ? Math.round(best.amount / total * 100) : 0;
  el.className = `dm-top-skill ${best.who === '随从' ? 'companion' : 'hero'}`;
  el.textContent = `${best.who} ${best.name} · ${fmt(best.amount)} · ${pct}%`;
  el.title = `本轮最高伤害来源: ${best.who}的${best.name}, 累计 ${fmt(best.amount)}, 占总伤害 ${pct}%。`;
}
function updateDmgBossCastReadout() {
  const row = $('dm-boss-cast-row');
  const el = $('dm-boss-cast');
  if (!row || !el) return;
  const cast = (typeof bossCasting !== 'undefined') ? bossCasting : null;
  if (!cast) {
    row.style.display = 'none';
    el.className = 'dm-boss-cast idle';
    el.textContent = '-';
    el.removeAttribute('title');
    return;
  }
  const now = Date.now();
  const elapsed = Math.max(0, now - (cast.startTime || now));
  const duration = Math.max(1, cast.duration || 1);
  const remainMs = Math.max(0, duration - elapsed);
  const remain = (remainMs / 1000).toFixed(1);
  const pct = Math.min(100, Math.max(0, elapsed / duration * 100));
  const threatMeta = (typeof bossCastThreatMeta === 'function') ? bossCastThreatMeta(cast) : { label: '危险' };
  const interruptText = (typeof bossInterruptTag === 'function') ? bossInterruptTag(cast) : (cast.interruptPolicy === 'none' ? '不可断' : '可断');
  const isDamage = (typeof cast.mul === 'number' && cast.mul > 0) && cast.type !== 'heal' && cast.type !== 'buff' && !cast.summonCount;
  const target = cast._targetDesc || (isDamage ? (cast.aoe ? '全体' : '你') : '自身');
  const finalWindow = pct >= 70 || remainMs <= 1000;
  const mustKick = cast.interruptPolicy === 'hard' || (!!cast._empowered && cast.interruptPolicy !== 'none');
  let cls = 'idle';
  let action = '观察';
  if (cast.interruptPolicy === 'none') {
    cls = finalWindow ? 'warn' : 'locked';
    action = isDamage ? '开减伤' : '留意';
  } else if (mustKick || cast.threat === 'high' || cast.threat === 'extreme') {
    cls = finalWindow ? 'danger final' : 'danger';
    action = finalWindow ? '立刻打断' : '准备打断';
  } else if (cast.interruptPolicy === 'soft' || cast.threat === 'medium') {
    cls = finalWindow ? 'warn final' : 'warn';
    action = finalWindow ? '现在打断' : '可打断';
  } else {
    cls = finalWindow ? 'warn' : 'idle';
    action = finalWindow ? '看情况断' : '观察';
  }
  const icon = cast.icon || '✨';
  const name = cast.name || '施法';
  row.style.display = '';
  el.className = `dm-boss-cast ${cls}`;
  el.textContent = `${action} · ${icon}${name} · 对${target} · ${remain}s`;
  el.title = `首领读条: ${cast.bossName || 'BOSS'} 的 ${name}。目标: ${target}。威胁: ${threatMeta.label}。打断: ${interruptText}。剩余 ${remain} 秒。`;
}

/* 导航栏红点:远征储备满 / 公会今日有可做的捐献 */
function updateNavBadges() {
  const now = Date.now();
  if (now - _navBadgePaint < 1500) return;
  _navBadgePaint = now;
  const expTab = document.querySelector('.tab[data-tab="expedition"]');
  if (expTab) {
    const full = (typeof expeditionStorageFull === 'function') && expeditionStorageFull();
    expTab.classList.toggle('has-badge', !!full);
  }
  const guildTab = document.querySelector('.tab[data-tab="guild"]');
  if (guildTab && typeof ensureGuildState === 'function' && typeof account !== 'undefined' && account) {
    if (typeof guildRefreshDaily === 'function') guildRefreshDaily();
    const g = ensureGuildState();
    let avail = false;
    if (g && typeof GUILD_DONATIONS !== 'undefined') {
      avail = GUILD_DONATIONS.some(d => !g.donatedKeys.includes(d.key) &&
        Object.entries(d.cost).every(([r, a]) => (account[r] || 0) >= a));
    }
    guildTab.classList.toggle('has-badge', avail);
  }
  const marketTab = document.querySelector('.tab[data-tab="market"]');
  if (marketTab) {
    marketTab.classList.toggle('has-badge', (typeof marketHasAffordableDeal === 'function') && marketHasAffordableDeal());
  }
  const questsTab = document.querySelector('.tab[data-tab="quests"]');
  if (questsTab) {
    questsTab.classList.toggle('has-badge', (typeof questHasClaimable === 'function') && questHasClaimable());
  }
  const mapTab = document.querySelector('.tab[data-tab="map"]');
  if (mapTab) {
    mapTab.classList.toggle('has-badge', (typeof zoneBountyHasClaimable === 'function') && zoneBountyHasClaimable());
  }
  const vaultTab = document.querySelector('.tab[data-tab="vault"]');
  if (vaultTab) {
    // vaultHasReward 内部 ensureVaultState 会处理周结算锁入(即使没开宝库页也能按时结算)
    vaultTab.classList.toggle('has-badge', (typeof vaultHasReward === 'function') && vaultHasReward());
  }
  const paragonTab = document.querySelector('.tab[data-tab="paragon"]');
  if (paragonTab) {
    paragonTab.classList.toggle('has-badge', (typeof paragonHasPoints === 'function') && paragonHasPoints());
  }
  // 目标引导 / 今日事务:地图页可见时一并刷新
  const mapPanel = document.getElementById('tab-map');
  if (mapPanel && mapPanel.classList.contains('active')) {
    if (typeof renderNextGoals === 'function') renderNextGoals();
    if (typeof renderDailyHub === 'function') renderDailyHub();
    if (typeof renderZoneBountyHub === 'function') renderZoneBountyHub();
  }
}

/* 远征面板可见时,每 ~2s 重渲染让储备数字滚动 */
function expeditionLiveTick() {
  const panel = document.getElementById('tab-expedition');
  if (!panel || !panel.classList.contains('active')) return;
  const now = Date.now();
  if (now - _expLivePaint < 2000) return;
  _expLivePaint = now;
  if (typeof renderExpedition === 'function') renderExpedition();
}
let _lastNonFocusMonPaint = 0;
let _compMiniHeadSig = '';
let _allySummonSig = '';
/* 当前职业的 buff 元信息(key→{icon,name,desc,dr}),从技能定义构建 */
function buffMetaForClass() {
  const c = getCls(); const map = {};
  if (c) for (const [, sk] of classSkillEntriesSorted(c)) {
    if (sk.type === 'buff' && sk.buff) map[sk.buff] = { icon: sk.icon, name: sk.name, desc: sk.desc || '', dr: !!(typeof BUFF_FX==='object' && BUFF_FX[sk.buff] && BUFF_FX[sk.buff].dr) };
  }
  return map;
}
const MAIN_MONSTER_STATE_KEYS = new Set([
  'decay', 'decay2', 'judged', 'frozen', 'exposed', 'terror', 'marked', 'rooted'
]);
const INTERNAL_MONSTER_STATE_KEYS = new Set([
  'trauma', 'fever', 'brittle', 'unstable', 'penanceMark', 'voidTorn', 'venomBloom',
  'huntWound', 'stormBrand', 'holyBrand', 'doomBrand', 'astralBrand', 'lifeSeed'
]);
const INTERNAL_MONSTER_DOT_PREFIXES = [
  'elementReaction:', 'skillEcho:', 'skillMark:', 'skillWeave:', 'skillRhythm:',
  'skillControl:', 'skillWeakness:', 'skillPrep:', 'skillOverload:', 'skillResource:',
  'skillHarvest:', 'skillPact:', 'skillField:', 'skillCharge:', 'skillRune:',
  'specStance:', 'specCore:', 'specProc:', 'specReaction:', 'specTactic:'
];
const INTERNAL_MONSTER_DOT_SOURCES = new Set([
  'skillReaction', 'skillEcho', 'skillMark', 'skillWeave', 'skillRhythm', 'skillControl',
  'skillWeakness', 'skillPrep', 'skillOverload', 'skillResource', 'skillHarvest',
  'skillPact', 'skillField', 'skillCharge', 'skillRune', 'specStance', 'specCore',
  'specProc', 'specReaction'
]);
function isMainMonsterStateKey(stateKey) {
  if (!stateKey || stateKey === 'sunder') return false;
  if (INTERNAL_MONSTER_STATE_KEYS.has(stateKey)) return false;
  return MAIN_MONSTER_STATE_KEYS.has(stateKey);
}
function isMainMonsterDot(dot) {
  if (!dot) return false;
  const key = String(dot.key || '');
  const source = String(dot.source || '');
  if (INTERNAL_MONSTER_DOT_PREFIXES.some(prefix => key.startsWith(prefix))) return false;
  if (INTERNAL_MONSTER_DOT_SOURCES.has(source)) return false;
  return true;
}
function mainMonsterDots(mon, now) {
  if (typeof getMonsterDots !== 'function') return [];
  return getMonsterDots(mon, now).filter(isMainMonsterDot);
}
/* 焦点敌人当前的减益(debuff)列表 */
function focusDebuffs(now) {
  const mon = state.currentMonsters && state.currentMonsters[0];
  if (!mon || mon.hp <= 0) return [];
  const out = [];
  if (mon.slowUntil > now)   out.push({ icon: '❄️', name: '减速',   desc: '攻击速度降低约33%', left: Math.ceil((mon.slowUntil - now) / 1000) });
  if (typeof getMonsterDots === 'function') {
    for (const dot of mainMonsterDots(mon, now)) {
      out.push({
        icon: dot.icon || '🔥',
        name: dot.name || '持续伤害',
        desc: `每秒受到 ${fmt(dot.dps || 0)} 持续伤害`,
        left: Math.ceil(((dot.expire || now) - now) / 1000)
      });
    }
  } else if (mon.dot > 0 && mon.dotEnd > now) out.push({ icon: '🔥', name: '灼烧/中毒', desc: `每秒受到 ${fmt(mon.dot)} 持续伤害`, left: Math.ceil((mon.dotEnd - now) / 1000) });
  if (mon.sunderUntil > now) out.push({ icon: '🩸', name: '易伤',   desc: mon.isBoss ? '受到伤害提高 25%' : '受到伤害提高 18%', left: Math.ceil((mon.sunderUntil - now) / 1000) });
  if (typeof MONSTER_STATE_META === 'object' && mon._skillStates) {
    for (const [stateKey, expire] of Object.entries(mon._skillStates)) {
      if (!(expire > now)) continue;
      if (!isMainMonsterStateKey(stateKey)) continue;
      const meta = MONSTER_STATE_META[stateKey] || { icon:'✨', name:stateKey, desc:'目标处于特殊状态' };
      out.push({
        icon: meta.icon || '✨',
        name: meta.name || stateKey,
        desc: meta.desc || '目标处于特殊状态',
        left: Math.ceil((expire - now) / 1000)
      });
    }
  }
  return out;
}
function focusBuffs(now) {
  const mon = state.currentMonsters && state.currentMonsters[0];
  if (!mon || mon.hp <= 0) return [];
  const merged = new Map();
  const pushBuff = (entry) => {
    const key = `${entry.base || entry.name}|${entry.icon || ''}`;
    const prev = merged.get(key);
    if (!prev) {
      merged.set(key, Object.assign({}, entry));
      return;
    }
    prev.left = Math.max(prev.left || 0, entry.left || 0);
    prev.stacks = (prev.stacks || 0) + (entry.stacks || 0);
    if (entry.desc && prev.desc && prev.desc !== entry.desc) prev.desc += ` · ${entry.desc}`;
    else if (entry.desc && !prev.desc) prev.desc = entry.desc;
    if ((prev.icon || '') === '' && entry.icon) prev.icon = entry.icon;
  };
  if (mon._trickAuras) {
    const auraMap = mon._trickAuras;
    const activeKeys = [];
    if (mon._trickAtkBuff > now) activeKeys.push('atk');
    if ((mon._trickSpdBuff > now) || (mon.spdBuffUntil > now)) activeKeys.push('spd');
    if (mon._trickDefBuff > now) activeKeys.push('def');
    if (mon._monsterDrBuffUntil > now) activeKeys.push('dr');
    if (mon._trickLeech > now) activeKeys.push('leech');
    if (mon._trickCrit > now) activeKeys.push('crit');
    if ((mon._nextAtkDouble || 0) > 0) activeKeys.push('nextDouble');
    for (const key of Object.keys(auraMap)) {
      const aura = auraMap[key];
      if (!aura) continue;
      const shouldKeep =
        key === 'shield' ? (mon._arcaneShield > 0) :
        key === 'nextDouble' ? ((mon._nextAtkDouble || 0) > 0) :
        key === 'specAdapt' ? !!mon._specAdaptTier :
        key === 'specPressure' ? ((aura.expire || 0) > now) :
        key === 'cataclysmScaling' ? !!mon._cataclysms?.length :
        key.startsWith('cataclysmActive:') ? ((aura.expire || 0) > now) :
        key === 'zoneThreatScaling' ? !!mon._zoneThreats?.length :
        key === 'rareMutation' ? !!mon._rareMutations?.length :
        key === 'fieldCommander' ? !!mon._fieldCommander :
        key === 'worldRenownAlert' ? !!mon._worldRenownAlert :
        key === 'worldRenownAlertPulse' ? ((aura.expire || 0) > now) :
        key.startsWith('zoneThreatActive:') ? ((aura.expire || 0) > now) :
        activeKeys.includes(key);
      if (!shouldKeep) {
        delete auraMap[key];
        continue;
      }
      const stacks = key === 'nextDouble' ? (mon._nextAtkDouble || aura.stacks || 0) : (aura.stacks || 0);
      const expire = key === 'spd' && mon.spdBuffUntil > now ? mon.spdBuffUntil : (aura.expire || 0);
      const left = expire > now ? Math.ceil((expire - now) / 1000) : 0;
      const suffix = stacks > 1 ? ` · ${stacks}层` : '';
      pushBuff({
        icon: aura.icon || '⚡',
        name: (aura.name || key) + suffix,
        base: (aura.name || key),
        stacks: stacks > 1 ? stacks : 0,
        desc: aura.desc || '敌人获得了特殊技巧强化',
        left
      });
    }
  }
  if (mon._arcaneShield > 0 && !(mon._trickAuras && mon._trickAuras.shield)) {
    pushBuff({ icon:'🔮', name:'护体屏障', base:'护体屏障', desc:`吸收 ${fmt(mon._arcaneShield)} 点任意伤害(单次最多75%)`, left:0 });
  }
  return Array.from(merged.values()).map(entry => {
    const stacks = entry.stacks > 1 ? ` · ${entry.stacks}层` : '';
    return Object.assign({}, entry, { name: (entry.base || entry.name) + stacks, stacks: entry.stacks || 0 });
  });
}
function statusIconHtml(name, symbol, size) {
  if (typeof statusIcon === 'function') return statusIcon(name, symbol, size || 16, symbol || name || '');
  return symbol || name || '';
}
function symbolIconHtml(symbol, size, label, fallback) {
  if (typeof symbolIcon === 'function') return symbolIcon(symbol, size || 16, label || symbol || '', fallback || '');
  return symbol || fallback || label || '';
}
function skillVisualFallback(sk) {
  return (sk && (sk.iconName || sk.icon)) || 'spell_holy_powerinfusion';
}
function companionIconHtml(tpl, size) {
  if (!tpl) return '';
  const fallback = tpl.iconName || tpl.emoji || 'ability_hunter_pet_wolf';
  if (typeof entityIcon === 'function') return entityIcon(tpl.name, size || 18, fallback);
  return tpl.emoji || '';
}
// 神器招牌技能 — 战斗界面独立的图标 + 冷却条(每帧更新CD, 仅签名变化时重建DOM)
let _artiSkillSig = '';
function renderArtifactSkillBar(now) {
  const el = $('artifact-skill-bar'); if (!el) return;
  const rank = (typeof artifactSkillRank === 'function') ? artifactSkillRank() : 0;
  if (rank <= 0) { if (el.style.display !== 'none') { el.style.display = 'none'; el.innerHTML = ''; _artiSkillSig = ''; } return; }
  const spec = (typeof activeArtifactSpec === 'function') ? activeArtifactSpec() : null;
  const def = (typeof artifactSkillDef === 'function') ? artifactSkillDef(state.cls, spec) : null;
  if (!def || !def.mul) { if (el.style.display !== 'none') { el.style.display = 'none'; el.innerHTML = ''; _artiSkillSig = ''; } return; }
  const id = (typeof artifactIdentity === 'function') ? artifactIdentity(state.cls, spec) : { color: '#c79c6e' };
  const sig = `${state.cls}:${spec}:${def.name}:${rank}`;
  if (sig !== _artiSkillSig) {
    _artiSkillSig = sig;
    el.style.display = 'flex';
    const iconHtml = (typeof symbolIcon === 'function') ? symbolIcon(def.icon, 16, def.name) : def.icon;
    const tip = `${def.name}｜${(typeof artifactSkillDescText === 'function') ? artifactSkillDescText(def) : ''}`.replace(/"/g, '&quot;');
    el.innerHTML = `<div class="arti-skill-chip" title="${tip}" style="display:flex;align-items:center;gap:6px;padding:3px 10px;background:var(--panel-2);border:1px solid ${id.color};border-radius:14px">
      <span style="font-size:15px;line-height:1">${iconHtml}</span>
      <span style="display:flex;flex-direction:column;line-height:1.2">
        <b style="font-size:11px;color:${id.color}">神器·${def.name} <span style="opacity:.55;font-weight:normal">${rank}/3</span></b>
        <span style="display:flex;align-items:center;gap:5px">
          <span style="width:56px;height:5px;background:rgba(255,255,255,.12);border-radius:3px;overflow:hidden"><i class="arti-cd-fill" style="display:block;height:100%;width:0%;background:${id.color};transition:width .12s linear"></i></span>
          <span class="arti-cd-txt" style="font-size:10px;min-width:30px"></span>
        </span>
      </span>
    </div>`;
  }
  // 每帧更新冷却
  const readyAt = state.artifactSkillCd || 0;
  const remain = Math.max(0, readyAt - now);
  const spdMul = (typeof castSpeedMul === 'function') ? castSpeedMul() : (state.battleSpeed || 1);
  const fullMs = (def.cd || 20) * 1000 / Math.max(0.1, spdMul);
  const fill = el.querySelector('.arti-cd-fill');
  const txt = el.querySelector('.arti-cd-txt');
  const chip = el.querySelector('.arti-skill-chip');
  if (remain <= 0) {
    if (fill) fill.style.width = '100%';
    if (txt) { txt.textContent = '就绪'; txt.style.color = '#34d399'; }
    if (chip) chip.style.boxShadow = `0 0 7px ${id.color}`;
  } else {
    const frac = Math.max(0, Math.min(1, 1 - remain / fullMs));
    if (fill) fill.style.width = (frac * 100).toFixed(0) + '%';
    if (txt) { txt.textContent = (remain / 1000).toFixed(1) + 's'; txt.style.color = 'var(--muted)'; }
    if (chip) chip.style.boxShadow = 'none';
  }
}
function renderBuffBar() {
  const bar = $('buff-bar'); if (!bar) return;
  const now = Date.now();
  const meta = buffMetaForClass();
  const hiddenSkillAuras = new Set([
    'skill_reaction','skill_echo','skill_weave','skill_rhythm','skill_control','skill_weakness',
    'skill_prep','skill_overload','skill_resource','skill_harvest','skill_pact','skill_field',
    'skill_charge','skill_rune','spec_flow','spec_core','spec_proc','spec_stance','spec_tactic'
  ]);
  // 英雄增益
  const buffs = [];
  for (const k in (state.buffs || {})) {
    const exp = state.buffs[k];
    if (!(exp > now)) continue;
    const m = meta[k] || (typeof BUFF_NAMES!=='undefined' && BUFF_NAMES[k]) || { icon: '✨', name: k, desc: '', dr: false };
    buffs.push({ kind: m.dr ? 'dr' : 'buff', icon: m.icon, name: m.name, desc: m.desc, left: Math.ceil((exp - now) / 1000) });
  }
  if (typeof TALENT_AURA_LIBRARY === 'object' && state.talentAuras) {
    for (const k in state.talentAuras) {
      const exp = state.talentAuras[k];
      if (!(exp > now)) continue;
      const m = TALENT_AURA_LIBRARY[k];
      if (!m) continue;
      buffs.push({ kind: 'buff', icon: m.icon || '✨', name: m.name || k, desc: m.desc || '', left: Math.ceil((exp - now) / 1000) });
    }
  }
  if (typeof SKILL_AURA_LIBRARY === 'object' && state.skillRuntime && state.skillRuntime.auras) {
    for (const [k, aura] of Object.entries(state.skillRuntime.auras)) {
      if (!aura) continue;
      if (hiddenSkillAuras.has(k)) continue;
      const m = SKILL_AURA_LIBRARY[k] || (k === 'spec_tactic' ? aura : null);
      if (!m) continue;
      const left = aura.expire ? Math.ceil((aura.expire - now) / 1000) : 0;
      if (aura.expire && aura.expire <= now) continue;
      const stacks = aura.stacks > 1 ? ` · ${aura.stacks}层` : '';
      buffs.push({ kind: 'buff', icon: aura.icon || m.icon || '✨', name: (aura.name || m.name || k) + stacks, base: (aura.name || m.name || k), stacks: aura.stacks > 1 ? aura.stacks : 0, desc: aura.desc || m.desc || '', left });
    }
  }
  buffs.sort((a, b) => a.left - b.left);
  // 吸收护盾(天赋/神器),显示当前可吸收量而非倒计时
  const shieldAmt = Math.floor(Math.max(0, state?.talentState?.shield || 0));
  if (shieldAmt > 0) {
    buffs.unshift({ kind: 'dr', icon: '🛡️', name: '吸收护盾', base: '吸收护盾', desc: '抵消即将受到的伤害', valText: fmt(shieldAmt), left: 0 });
  }
  const enemyBuffs = focusBuffs(now).map(b => ({ kind: 'enemy-buff', icon: b.icon, name: '敌·' + b.name, base: '敌·' + (b.base || b.name), stacks: b.stacks || 0, desc: b.desc, left: b.left }));
  const debuffs = focusDebuffs(now).map(d => ({ kind: 'debuff', icon: d.icon, name: '敌·' + d.name, desc: d.desc, left: d.left }));
  const heroDe = [];
  if (typeof DEBUFF_FX === 'object' && state.heroDebuffs) {
    for (const k in state.heroDebuffs) {
      const d = state.heroDebuffs[k]; if (!(d.expire > now)) continue;
      const fx = DEBUFF_FX[k] || { name: k, icon: '☠️' };
      let desc = fx.name;
      if (k === 'burn') desc = `每秒受到 ${fmt(d.dps || 1)} 持续伤害`;
      else if (fx.desc) desc = fx.desc;
      else if (fx.atkMul) desc = `攻击降低 ${Math.round((1 - fx.atkMul) * 100)}%`;
      else if (fx.spdMul) desc = `攻速降低 ${Math.round((1 - fx.spdMul) * 100)}%`;
      else if (fx.takenMul) desc = `受到伤害 +${Math.round((fx.takenMul - 1) * 100)}%`;
      else if (fx.healMul || fx.regMul) desc = fx.name;
      heroDe.push({ kind: 'self-de', icon: fx.icon, name: '你·' + fx.name, desc, left: Math.ceil((d.expire - now) / 1000) });
    }
  }
  if (state.heroStunUntil > now && !(state.heroDebuffs?.fear?.expire > now) && !(state.heroDebuffs?.freeze?.expire > now)) heroDe.push({ kind:'self-de', icon:'💫', name:'你·眩晕', desc:'无法攻击与施法', left:Math.ceil((state.heroStunUntil-now)/1000) });
  if (state.heroSilenceUntil > now) heroDe.push({ kind:'self-de', icon:'🔇', name:'你·沉默', desc:'无法施放技能', left:Math.ceil((state.heroSilenceUntil-now)/1000) });
  if (state.heroDisarmUntil > now) heroDe.push({ kind:'self-de', icon:'⚔️❌', name:'你·缴械', desc:'无法普通攻击', left:Math.ceil((state.heroDisarmUntil-now)/1000) });
  const selfStates = buffs.concat(heroDe);
  const specMeter = (typeof currentSpecCombatMeter === 'function') ? currentSpecCombatMeter() : null;
  if (specMeter) {
    const tactic = (typeof currentSpecTacticalWindow === 'function') ? currentSpecTacticalWindow() : null;
    const chain = (typeof currentSpecSkillChain === 'function') ? currentSpecSkillChain() : null;
    const reaction = (typeof currentSpecReactionSystem === 'function') ? currentSpecReactionSystem() : null;
    const proc = (typeof currentSpecProcSystem === 'function') ? currentSpecProcSystem() : null;
    const core = (typeof currentSpecCoreSystem === 'function') ? currentSpecCoreSystem() : null;
    const stance = (typeof currentSpecStanceSystem === 'function') ? currentSpecStanceSystem() : null;
    const chainDesc = chain ? ` · 连段: ${chain.name},按顺序放技能可获得奖励` : '';
    const reactionDesc = reaction ? ` · 状态反应: ${reaction.name},打对应状态会追加效果` : '';
    const procDesc = proc ? ` · 临场强化: ${proc.name},下一次合适技能会变强` : '';
    const coreDesc = core ? ` · 核心: ${core.name},满层后用指定技能收束` : '';
    const stanceDesc = stance ? ` · 法则: ${stance.name},短时间改变技能效果` : '';
    const engineText = (typeof specEngineDescText === 'function') ? specEngineDescText() : '';
    const engineDesc = engineText ? ` · 精通强化: ${engineText}` : '';
    const universalDesc = ' · 技能细节看技能按钮说明。';
    selfStates.unshift({
      kind: 'spec-meter',
      icon: specMeter.icon || '✦',
      name: specMeter.name,
      base: '专精机制:' + specMeter.key,
      desc: (specMeter.hint || '') + ` · 当前 ${specMeter.stacks || 0}/${specMeter.max || 0}` + (tactic ? ` · 战术窗口: ${tactic.name},短时间强化对应玩法` : '') + chainDesc + reactionDesc + procDesc + coreDesc + stanceDesc + engineDesc + universalDesc,
      valText: `${specMeter.stacks || 0}/${specMeter.max || 0}`,
      stacks: specMeter.stacks || 0,
      left: 0
    });
  }
  const enemyStates = enemyBuffs.concat(debuffs);

  if (!bar.querySelector('.buff-side.self')) {
    bar.innerHTML = '<div class="buff-side self"><div class="buff-side-title">你</div><div class="buff-side-list"></div></div><div class="buff-side enemy"><div class="buff-side-title">敌</div><div class="buff-side-list"></div></div>';
  }
  diffBuffSide(bar.querySelector('.buff-side.self .buff-side-list'), selfStates, '暂无状态');
  diffBuffSide(bar.querySelector('.buff-side.enemy .buff-side-list'), enemyStates, '暂无状态');
  updateBuffChipTexts(bar.querySelector('.buff-side.self .buff-side-list'), selfStates);
  updateBuffChipTexts(bar.querySelector('.buff-side.enemy .buff-side-list'), enemyStates);
}

/* 差分更新一个 buff-side-list: 按 key 增删 chip, 不重建已有 chip */
function diffBuffSide(listEl, items, emptyText) {
  const existing = new Map();
  listEl.querySelectorAll('.buff-chip').forEach(chip => { existing.set(chip.dataset.key, chip); });
  const desiredKeys = new Set();
  const fragment = document.createDocumentFragment();

  for (const b of items) {
    const key = b.kind + '|' + (b.base || b.name || '');
    if (desiredKeys.has(key)) continue; // 跳过重复key, 防止创建重复chip
    desiredKeys.add(key);
    let chip = existing.get(key);
    if (chip) {
      // 已有 chip 保留(移到 fragment 保持顺序)
      fragment.appendChild(chip);
      existing.delete(key);
    } else {
      // 新建 chip
      chip = document.createElement('div');
      chip.className = 'buff-chip ' + b.kind;
      chip.dataset.key = key;
      const tip = `${b.name}${b.desc ? ' · ' + b.desc : ''}${b.left > 0 ? ' · 剩余' + b.left + '秒' : ''}`;
      chip.dataset.tip = tip.replace(/"/g, '&quot;');
      const icDiv = document.createElement('div'); icDiv.className = 'b-ic';
      icDiv.innerHTML = statusIconHtml(b.name?.replace(/^敌·|^你·/, ''), b.icon, 16);
      chip.appendChild(icDiv);
      const tDiv = document.createElement('div'); tDiv.className = 'b-t';
      tDiv.textContent = b.valText != null ? b.valText : (b.left > 0 ? b.left + 's' : '∞');
      chip.appendChild(tDiv);
      const sDiv = document.createElement('div'); sDiv.className = 'b-s';
      sDiv.textContent = b.stacks > 1 ? b.stacks + '层' : '';
      chip.appendChild(sDiv);
      fragment.appendChild(chip);
    }
  }
  // 移除不再需要的 chip
  existing.forEach(chip => chip.remove());
  // 插入排序后的 chip
  listEl.appendChild(fragment);

  // 空状态文本
  let emptyEl = listEl.querySelector('.buff-empty');
  if (items.length === 0) {
    if (!emptyEl) { emptyEl = document.createElement('div'); emptyEl.className = 'buff-empty'; listEl.appendChild(emptyEl); }
    emptyEl.textContent = emptyText;
  } else if (emptyEl) {
    emptyEl.remove();
  }
}

/* 每帧增量更新: 倒计时 + 层数 + tooltip */
function updateBuffChipTexts(bar, allItems) {
  if (!bar) return;
  const chips = Array.from(bar.querySelectorAll('.buff-chip'));
  const allT = bar.querySelectorAll('.buff-chip .b-t');
  const allS = bar.querySelectorAll('.buff-chip .b-s');
  for (let i = 0; i < Math.min(allT.length, allItems.length); i++) {
    const txt = allItems[i].valText != null ? allItems[i].valText : (allItems[i].left > 0 ? allItems[i].left + 's' : '∞');
    if (allT[i].textContent !== txt) allT[i].textContent = txt;
  }
  for (let i = 0; i < Math.min(allS.length, allItems.length); i++) {
    const stxt = allItems[i].stacks > 1 ? allItems[i].stacks + '层' : '';
    if (allS[i].textContent !== stxt) allS[i].textContent = stxt;
  }
  // 同步更新 data-tip(只在内容变化时)
  for (let i = 0; i < Math.min(chips.length, allItems.length); i++) {
    const b = allItems[i];
    const tip = `${b.name}${b.desc ? ' · ' + b.desc : ''}${b.left > 0 ? ' · 剩余' + b.left + '秒' : ''}`.replace(/"/g, '&quot;');
    if (chips[i].dataset.tip !== tip) chips[i].dataset.tip = tip;
  }
}
function bossDisplayHealMult() {
  return (typeof BOSS_SKILL_HEAL_MULT === 'number' && BOSS_SKILL_HEAL_MULT > 0) ? BOSS_SKILL_HEAL_MULT : 1;
}
function scaledBossHealPortion(v) {
  return (v || 0) * bossDisplayHealMult();
}
function scaledBossDesc(desc, s) {
  let text = desc || '';
  const pick = (raw) => compPct(scaledBossHealPortion(raw));
  if (s?.healPct) {
    const pct = pick(s.healPct);
    text = text.replace(/(恢复|回复|立即回复)(\d+(?:\.\d+)?)%/u, (_, lead) => `${lead}${pct}%`);
  }
  if (s?.type === 'heal' && s?.heal) {
    const pct = pick(s.heal);
    text = text.replace(/(恢复|回复|立即回复)(\d+(?:\.\d+)?)%/u, (_, lead) => `${lead}${pct}%`);
  }
  return text;
}
function effectDurationText(value, fallbackMs) {
  const raw = (value === true || value == null) ? fallbackMs : value;
  const ms = raw > 100 ? raw : raw * 1000;
  const sec = Math.max(0, ms / 1000);
  return `${Number.isInteger(sec) ? sec.toFixed(0) : sec.toFixed(1)}秒`;
}
function effectTags(s, opts) {
  const cfg = opts || {};
  if (!s) return [];
  const heal = cfg.bossScaledHeal ? scaledBossHealPortion(s.heal || 0) : (s.heal || 0);
  const healPct = cfg.bossScaledHeal ? scaledBossHealPortion(s.healPct || 0) : (s.healPct || 0);
  const t = [];
  if (s.aoe) t.push(`${statusIconHtml('易爆', '💥', 13)}范围伤害`);
  if (s.stun) t.push(`${statusIconHtml('眩晕', '💫', 13)}眩晕${effectDurationText(s.stun, s.stunMs || 2000)}`);
  if (s.slow) t.push(`${statusIconHtml('减速', '❄️', 13)}减速${effectDurationText(s.slowMs || true, 5000)}`);
  if (s.dot || s.dotSkill) t.push(`${statusIconHtml('灼烧/中毒', '☠️', 13)}持续伤害${effectDurationText(s.dotSecs || s.dotMs || true, (s.dotSecs || 6) * 1000)}`);
  if (s.weaken) t.push(`${statusIconHtml('虚弱', '💔', 13)}削弱${effectDurationText(s.weakenMs || true, 5000)}`);
  if (s.sunder) t.push(`${statusIconHtml('易伤', '🩸', 13)}易伤${effectDurationText(s.sunderMs || true, 5000)}`);
  if (s.spdBuff) t.push(`${statusIconHtml('急速', '⚡', 13)}自加速${effectDurationText(s.spdBuffSecs || true, 8000)}`);
  if (heal) t.push(`${statusIconHtml('治疗', '💚', 13)}恢复${Math.round(heal*100)}%生命`);
  if (healPct) t.push(`${statusIconHtml('治疗', '💚', 13)}恢复${Math.round(healPct*100)}%生命`);
  if (s.atkBuffSecs) t.push(`${statusIconHtml('战斗怒吼', '📯', 13)}攻击提高${Math.round(s.atkBuffPct||30)}% · ${effectDurationText(s.atkBuffSecs, 8000)}`);
  if (s.defBuffSecs) t.push(`${statusIconHtml('护盾', '🪨', 13)}防御提高${Math.round(s.defBuffPct||35)}% · ${effectDurationText(s.defBuffSecs, 8000)}`);
  if (s.drBuffSecs) t.push(`${statusIconHtml('减伤', '🛡️', 13)}减伤提高${Math.round((s.drBuffPct||0.25)*100)}% · ${effectDurationText(s.drBuffSecs, 8000)}`);
  if (s.shieldPct) t.push(`${statusIconHtml('护体屏障', '🔮', 13)}护盾${Math.round((s.shieldPct||0)*100)}%生命`);
  if (s.critBuffSecs) t.push(`${statusIconHtml('致命专注', '👁️', 13)}暴击提高${Math.round(s.critBuffPct||35)}% · ${effectDurationText(s.critBuffSecs, 6000)}`);
  if (s.leechBuffSecs) t.push(`${statusIconHtml('生命洪流', '🩸', 13)}吸血${Math.round(s.leechBuffPct||18)}% · ${effectDurationText(s.leechBuffSecs, 8000)}`);
  if (s.summonCount) t.push(`${statusIconHtml('召唤援军', '👥', 13)}召唤${s.summonCount}个援军`);
  if (s.lifeSteal) t.push(`${statusIconHtml('生命洪流', '🩸', 13)}吸血${Math.round(s.lifeSteal*100)}%`);
  if (s.silence) t.push(`${statusIconHtml('沉默', '🔇', 13)}沉默${effectDurationText(s.silence, 1800)}`);
  if (s.disarm) t.push(`${statusIconHtml('缴械', '⚔️', 13)}缴械${effectDurationText(s.disarm, 1800)}`);
  if (s.fear) t.push(`${statusIconHtml('恐惧', '👻', 13)}恐惧${effectDurationText(s.fear, 1800)}`);
  if (s.freeze) t.push(`${statusIconHtml('冻结', '🧊', 13)}冰冻${effectDurationText(s.freeze, 1600)}`);
  if (s.cripple) t.push(`${statusIconHtml('残废', '🦿', 13)}残废`);
  if (s.decay) t.push(`${statusIconHtml('衰老', '👴', 13)}衰老`);
  if (s.wither) t.push(`${statusIconHtml('凋零', '🥀', 13)}生命枯萎`);
  if (s.manaDrain) t.push(`${statusIconHtml('奥术护壁', '💧', 13)}资源流失${typeof s.manaDrain === 'number' ? ` ${s.manaDrain}` : ''}`);
  if (s.bomb) t.push(`${statusIconHtml('易爆', '💣', 13)}自爆印记`);
  if (s.plague) t.push(`${statusIconHtml('凋零', '🦠', 13)}暗影瘟疫`);
  if (s.bleed) t.push(`${statusIconHtml('流血', '🩸', 13)}流血`);
  if (s.brittle) t.push(`${statusIconHtml('易爆', '💥', 13)}易爆`);
  if (s.soulDrain) t.push(`${statusIconHtml('灵魂链接', '🧛', 13)}精力榨取`);
  if (s.soulLink) t.push(`${statusIconHtml('灵魂链接', '🔗', 13)}灵魂链接`);
  if (s.revenge) t.push(`${statusIconHtml('复仇标记', '🎯', 13)}复仇标记`);
  if (s.frenzy) t.push(`${statusIconHtml('狂乱', '🤯', 13)}狂乱`);
  if (s.decay2) t.push(`${statusIconHtml('凋零', '🌑', 13)}凋零`);
  if (s.mirror) t.push(`${statusIconHtml('奥术护壁', '🪞', 13)}镜像`);
  return t;
}
function bossSkillBreakdownHtml(s, cfg) {
  if (!s) return '';
  const rows = [];
  if (typeof s.mul === 'number' && s.mul > 0 && s.type !== 'heal' && s.type !== 'buff' && s.type !== 'support') {
    rows.push(`${s.aoe ? '范围' : '单体'}伤害 ×${Number(s.mul).toFixed(s.mul % 1 ? 1 : 0)}`);
  }
  if (s.type === 'heal' || s.heal || s.healPct) rows.push('治疗/恢复技能');
  if (s.type === 'buff' || s.type === 'support') rows.push('首领强化技能');
  if (s.summonCount) rows.push(`召唤 ${s.summonCount} 个${s.summonTheme ? ` ${s.summonTheme}` : ''}援军`);
  if (typeof s.hpBelow === 'number') rows.push(`血量低于 ${Math.round(s.hpBelow * 100)}% 后启用`);
  if (typeof s.hpAbove === 'number') rows.push(`血量高于 ${Math.round(s.hpAbove * 100)}% 时启用`);
  if (typeof s.cd === 'number') rows.push(`冷却 ${s.cd}秒`);
  if (cfg?.showCast !== false) rows.push((s.castTime || 0) > 0 ? `读条 ${(s.castTime || 0).toFixed(1)}秒` : '瞬发');
  if (s.interruptPolicy === 'hard') rows.push('优先打断:可避免高危效果');
  else if (s.interruptPolicy === 'soft') rows.push('可打断:降低压力或减少余波');
  else if (s.interruptPolicy === 'none') rows.push('不可打断:用防御/治疗覆盖');
  if (!rows.length) return '';
  return `<div class="boss-skill-breakdown">${rows.map(tipAttrText).join(' · ')}</div>`;
}
function bossSkillLineHtml(s, opts) {
  const cfg = opts || {};
  const iconSize = cfg.iconSize || 16;
  const tagColor = cfg.tagColor || '#fbbf24';
  const threatPalette = {
    low:'#fde68a',
    medium:'#fdba74',
    high:'#fca5a5',
    extreme:'#fecaca',
  };
  const leadColor = cfg.leadColor || threatPalette[s?.threat] || 'var(--text)';
  const skillIconHtml = (typeof skillIcon === 'function') ? skillIcon(s.name, iconSize, s.icon) : (s.icon || '✨');
  const tags = effectTags(s, { bossScaledHeal:true });
  const infoTags = [];
  if (s?.threat === 'extreme') infoTags.push('<span style="color:#fecaca">致命</span>');
  else if (s?.threat === 'high') infoTags.push('<span style="color:#fca5a5">高危</span>');
  else if (s?.threat === 'medium') infoTags.push('<span style="color:#fdba74">危险</span>');
  else if (s?.threat === 'low') infoTags.push('<span style="color:#fde68a">压制</span>');
  if (s?.interruptPolicy === 'hard') infoTags.push('<span style="color:#fca5a5">必断</span>');
  else if (s?.interruptPolicy === 'soft') infoTags.push('<span style="color:#c4b5fd">断后削弱</span>');
  else if (s?.interruptPolicy === 'none') infoTags.push('<span style="color:#93c5fd">不可断</span>');
  const title = `${skillIconHtml} ${s.name}${infoTags.length ? ` <span style="font-size:10px">${infoTags.join(' · ')}</span>` : ''}`;
  const castText = cfg.showCast === false ? '' : ` · ${(s.castTime || 0)}秒读条`;
  const desc = scaledBossDesc(s.desc || ((s.mul || 1) + '倍伤害'), s);
  const tagHtml = tags.length
    ? `<div style="margin-top:2px;color:${tagColor};font-size:10px;line-height:1.45;word-break:break-word">${tags.join(' · ')}</div>`
    : '';
  const breakdownHtml = bossSkillBreakdownHtml(s, cfg);
  return `<div style="margin:3px 0 6px;padding-bottom:5px;border-bottom:1px dashed rgba(148,163,184,.18)">
    <div style="color:${leadColor};line-height:1.5;word-break:break-word">${title}</div>
    <div style="font-size:10px;color:var(--muted);line-height:1.45;word-break:break-word">${desc}${castText}</div>
    ${breakdownHtml}
    ${tagHtml}
  </div>`;
}
function fmtPctValue(v, digits) {
  return `${Number(v || 0).toFixed(digits == null ? 1 : digits)}%`;
}
function heroUnitTipHtml() {
  const cls = getCls();
  const hero = state.hero || {};
  const shield = Math.max(0, state?.talentState?.shield || 0);
  const activeSets = (typeof getActiveSetBonuses === 'function' ? getActiveSetBonuses() : [])
    .filter(x => x && x.active)
    .map(x => {
      const effect = Object.entries(x.mod || {}).map(([k, v]) => fmtMod(k, v)).join(' · ');
      return `✓ ${x.name} ${x.pieces}件: ${effect}`;
    });
  const activeSetHtml = activeSets.length
    ? `<div style="margin-top:4px;color:#86efac">套装: ${activeSets.join('<br>')}</div>`
    : `<div class="muted" style="margin-top:4px">当前没有已激活套装效果</div>`;
  return `<b>${state.name || '冒险者'}${cls ? ` · ${cls.name}` : ''}</b>
    <div>生命 ${hpWithShieldText(state.hp || 0, hero.hpMax || 0, shield)} · 资源 ${fmt(state.resource || 0)}/${fmt(state.resourceMax || 0)}</div>
    <div>攻击 ${fmt(hero.atk || 0)} · 防御 ${fmt(hero.def || 0)} · 攻速 ${(hero.spd || 0).toFixed(2)}/秒</div>
    <div>暴击 ${fmtPctValue(hero.crit || 0, 1)} · 暴伤 ${fmtPctValue(hero.critd || 0, 0)} · 吸血 ${fmtPctValue(hero.leech || 0, 1)}</div>
    <div>全能 ${fmtPctValue(hero.vers || 0, 1)} · 极速 ${fmtPctValue(hero.haste || 0, 1)} · 精通 ${fmt(hero.mastery || 0)}</div>
    ${activeSetHtml}`;
}
function monsterUnitTipHtml(mon, bossData) {
  if (!mon) return '<b>敌人</b>';
  const now = Date.now();
  const shield = Math.max(0, mon._arcaneShield || 0);
  const atk = typeof monsterAttackValue === 'function' ? monsterAttackValue(mon, now) : (mon.atk || 0);
  const def = typeof monArmor === 'function' ? monArmor(mon) : (mon.def || 0);
  const crit = typeof monsterCritRate === 'function' ? monsterCritRate(mon, now) : (mon.critChance ? mon.critChance * 100 : 5);
  const dr = typeof monsterDamageReduction === 'function' ? monsterDamageReduction(mon, now) : (mon.dmgReduction || 0);
  const leech = typeof monsterLeechRate === 'function' ? monsterLeechRate(mon, now) : (mon.lifeSteal || 0);
  const spdMul = typeof monsterSpeedMult === 'function' ? monsterSpeedMult(mon, now) : 1;
  const battleSpd = state.battleSpeed || 1;
  const interval = ((mon.atkInterval || (mon.isBoss ? 1400 : 1700)) / battleSpd / Math.max(0.01, spdMul));
  const aps = Math.max(0.1, 1000 / Math.max(1, interval));
  const sourceLine = mon._summoned ? `<div class="muted">由 ${mon._summonerName || '敌人'} 召唤</div>` : '';
  const passiveTags = [];
  if (bossData?.passive?.dodgeChance) passiveTags.push(`闪避 ${fmtPctValue((bossData.passive.dodgeChance || 0) * 100, 0)}`);
  if (bossData?.passive?.critChance) passiveTags.push(`暴击 ${fmtPctValue((bossData.passive.critChance || 0) * 100, 0)}`);
  if (bossData?.passive?.atkBonus) passiveTags.push(`攻击 ${fmtPctValue((bossData.passive.atkBonus || 0) * 100, 0)}`);
  if (bossData?.passive?.dmgReduction) passiveTags.push(`减伤 ${fmtPctValue((bossData.passive.dmgReduction || 0) * 100, 0)}`);
  const passiveHtml = passiveTags.length ? `<div class="muted">被动: ${passiveTags.join(' · ')}</div>` : '';
  return `<b>${mon.name} · 等级${mon.lvl}</b>
    ${sourceLine}
    <div>生命 ${hpWithShieldText(mon.hp || 0, mon.hpMax || 0, shield)}</div>
    <div>攻击 ${fmt(atk)} · 防御 ${fmt(def)} · 攻速 ${aps.toFixed(2)}/秒</div>
    <div>暴击 ${fmtPctValue(crit, 0)} · 减伤 ${fmtPctValue(dr * 100, 0)} · 吸血 ${fmtPctValue(leech * 100, 0)}</div>
    ${passiveHtml}`;
}
function tipAttrText(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function inlineTipSpanHtml(item, options) {
  const cfg = options || {};
  const name = item?.name || cfg.name || '机制';
  const icon = item?.icon || cfg.icon || '⚙️';
  const desc = item?.desc || cfg.desc || '暂无机制说明';
  const meta = cfg.meta || item?.meta || '';
  const fallbackIcon = cfg.fallbackIcon || 'achievement_boss_illidan';
  const color = cfg.color || '#f8fafc';
  const iconHtml = symbolIconHtml(icon, cfg.iconSize || 12, name, fallbackIcon);
  return `<span class="${cfg.className || 'dungeon-inline-tip'}" style="cursor:help" data-inline-tip-name="${tipAttrText(name)}" data-inline-tip-icon="${tipAttrText(icon)}" data-inline-tip-desc="${tipAttrText(desc)}" data-inline-tip-meta="${tipAttrText(meta)}" data-inline-tip-color="${tipAttrText(color)}" data-inline-tip-fallback="${tipAttrText(fallbackIcon)}">${iconHtml} ${tipAttrText(name)}${cfg.metaVisible && meta ? ` · ${tipAttrText(meta)}` : ''}</span>`;
}
function monsterMechanicSectionHtml(title, color, list, fallbackIcon, mapper) {
  if (!Array.isArray(list) || !list.length) return '';
  const lines = list.map(item => {
    const view = typeof mapper === 'function' ? mapper(item) : item;
    if (!view) return '';
    const safeName = tipAttrText(view.name);
    const safeMeta = tipAttrText(view.meta);
    const safeDesc = tipAttrText(view.desc);
    const iconHtml = symbolIconHtml(view.icon, 14, safeName, fallbackIcon);
    const extra = safeMeta ? ` <span style="font-size:10px;color:#cbd5e1">${safeMeta}</span>` : '';
    const desc = safeDesc ? `<div style="font-size:10px;color:var(--muted);line-height:1.45;word-break:break-word">${safeDesc}</div>` : '';
    return `<div style="margin:3px 0 6px">${iconHtml} ${safeName}${extra}${desc}</div>`;
  }).filter(Boolean).join('');
  if (!lines) return '';
  return `<div style="margin-top:4px;color:${color}">${tipAttrText(title)}:</div>${lines}`;
}

function worldZoneThreatTagsHtml(map, sub, opts) {
  if (typeof getWorldZoneThreats !== 'function' || !map) return '';
  const threats = getWorldZoneThreats(map, sub, opts || {});
  if (!threats.length) return '';
  return `<span class="stage-mechanic-tags">${threats.map(t => inlineTipSpanHtml({
    name:t.name || '区域威胁',
    icon:t.icon || '🧭',
    desc:t.desc || '该区域正在影响野外战斗。',
    meta:t.meta || '区域威胁'
  }, { fallbackIcon:'achievement_zone_outland_01', color:'#fb7185', meta:t.meta, metaVisible:!!t.meta })).join('')}</span>`;
}

function worldFieldOperationTagHtml(map, subIdx, opts) {
  if (typeof worldFieldOperationTip !== 'function') return '';
  const tip = worldFieldOperationTip(map, subIdx, opts || {});
  if (!tip) return '';
  return inlineTipSpanHtml(tip, {
    fallbackIcon:'achievement_zone_kalimdor_01',
    color:tip.tone === 'done' ? '#86efac' : (tip.tone === 'failed' ? '#fb7185' : (tip.tone === 'ready' ? '#fbbf24' : '#67e8f9')),
    meta:tip.meta,
    metaVisible:!!opts?.metaVisible
  });
}

function worldRenownTagHtml(map, opts) {
  if (!map || typeof worldRenownTip !== 'function') return '';
  const tip = worldRenownTip(map.key);
  if (!tip) return '';
  return inlineTipSpanHtml(tip, {
    fallbackIcon:'achievement_reputation_argentchampion',
    color:'#86efac',
    meta:tip.meta,
    metaVisible:!!opts?.metaVisible
  });
}
function dungeonProgressMechanicTags(ds, contract, alert, timerStatus) {
  if (!ds) return '';
  const tags = [];
  if (contract) {
    tags.push(inlineTipSpanHtml({
      name:`契约:${contract.name}`,
      icon:contract.icon || '📜',
      desc:contract.desc || '当前副本契约',
      meta:`生命×${Number(contract.hp || 1).toFixed(2)} 攻击×${Number(contract.atk || 1).toFixed(2)} 防御×${Number(contract.def || 1).toFixed(2)}`
    }, { fallbackIcon:'inv_scroll_03', color:'#f6c453' }));
  }
  if (alert && alert.level > 0) {
    tags.push(inlineTipSpanHtml({
      name:`警戒 ${alert.level}`,
      icon:'🚨',
      desc:'契约副本每清一波和击败首领都会提高警戒。警戒越高,后续敌人越强,也更容易出现戒备队长。',
      meta:alert.label || ''
    }, { fallbackIcon:'achievement_bg_returnxflags_def_wsg', color:'#fb7185' }));
  }
  if (timerStatus) {
    tags.push(inlineTipSpanHtml({
      name:timerStatus.expired ? '时序脉冲' : '限时挑战',
      icon:'⏳',
      desc:timerStatus.expired ? '限时挑战超时后,每15秒叠加一次压迫脉冲,提高后续敌人压力。' : '在限定时间内通关可获得额外奖励;超时后会进入时序脉冲。',
      meta:timerStatus.text || ''
    }, { fallbackIcon:'inv_misc_pocketwatch_01', color:timerStatus.expired ? '#fb7185' : '#67e8f9' }));
  }
  const timeMarkSummary = (typeof dungeonTimeMarkSummary === 'function') ? dungeonTimeMarkSummary(ds.edicts, ds.timeMarks || 0) : null;
  if (timeMarkSummary) {
    tags.push(inlineTipSpanHtml(timeMarkSummary, {
      fallbackIcon:'achievement_bg_kill_flag_carrier',
      color:'#fca5a5',
      meta:timeMarkSummary.meta,
      metaVisible:true
    }));
  }
  const themeAffixes = Array.isArray(ds.themeAffixes) ? ds.themeAffixes : [];
  for (const affix of themeAffixes.slice(0, 2)) {
    tags.push(inlineTipSpanHtml({
      name:affix.name || '主题压力',
      icon:affix.icon || '🧭',
      desc:affix.desc || '该副本按主题固定生效的战斗规则。',
      meta:(typeof dungeonAffixMeta === 'function') ? dungeonAffixMeta(affix) : '主题'
    }, { fallbackIcon:'spell_arcane_starfire', color:'#67e8f9' }));
  }
  const rooms = Array.isArray(ds.combatRooms) ? ds.combatRooms : [];
  for (const room of rooms.slice(0, 3)) {
    const matchedTags = (room.matchedTags || []).map(dungeonTraitTagLabel).join('/');
    tags.push(inlineTipSpanHtml({
      name:room.name || '战斗房间',
      icon:room.icon || '🎲',
      desc:`${room.desc || '额外战斗房间规则'}${matchedTags ? ` 路线匹配: ${matchedTags}` : ''}`,
      meta:room.routeMatched ? '路线匹配' : '房间'
    }, { fallbackIcon:'inv_misc_dice_02', color:'#f9a8d4' }));
  }
  const cataclysms = Array.isArray(ds.cataclysms) ? ds.cataclysms : [];
  for (const cat of cataclysms.slice(0, 3)) {
    tags.push(inlineTipSpanHtml({
      name:cat.name || '环境灾变',
      icon:cat.icon || '🌪️',
      desc:cat.desc || '副本环境周期性爆发,并强化本次敌人强度。',
      meta:cat.meta || '灾变'
    }, { fallbackIcon:'spell_nature_earthquake', color:'#fb7185', meta:cat.meta, metaVisible:!!cat.meta }));
  }
  const edicts = Array.isArray(ds.edicts) ? ds.edicts : [];
  for (const edict of edicts.slice(0, 4)) {
    tags.push(inlineTipSpanHtml({
      name:edict.name || '时序禁令',
      icon:edict.icon || '📜',
      desc:edict.desc || '额外副本禁令',
      meta:'禁令'
    }, { fallbackIcon:'inv_scroll_03', color:'#fde68a' }));
  }
  if (edicts.length > 4) {
    tags.push(inlineTipSpanHtml({
      name:`禁令库 +${edicts.length - 4}`,
      icon:'📜',
      desc:'本次契约还有更多禁令正在生效。打开副本详情可查看完整列表。',
      meta:`共${edicts.length}条`
    }, { fallbackIcon:'inv_scroll_03', color:'#fde68a' }));
  }
  return tags.length ? `<span class="stage-mechanic-tags">${tags.join('')}</span>` : '';
}
function monsterEncounterDetailHtml(mon, bossData) {
  if (!mon) return '';
  let html = '';
  const seenAffix = new Set();
  const affixes = (mon._affixes || []).filter(af => af && af.key && !seenAffix.has(af.key) && seenAffix.add(af.key));
  if (affixes.length) {
    html += monsterMechanicSectionHtml('当前词缀', '#67e8f9', affixes, 'spell_holy_powerinfusion', af => ({
      icon:af.icon || '⚙️',
      name:af.name || '词缀',
      desc:af.desc || '额外战斗修正'
    }));
  }
  if (mon._bossWeakpoint) {
    html += monsterMechanicSectionHtml('当前机制目标', '#fde68a', [{
      icon:'💠',
      name:mon._bossWeakpointName || 'Boss弱点',
      desc:'击破后会让首领露出破绽、奖励资源，并让你的下一次关键输出更容易打穿。'
    }], 'inv_misc_gem_diamond_02');
  }
  if (mon._directorAdd) {
    html += monsterMechanicSectionHtml('导演机制', '#f9a8d4', [{
      icon:'🎬',
      name:mon._directorReason || '战斗导演增援',
      desc:'这是首领额外导演机制召来的单位，不尽快处理会持续抬高战斗压力。'
    }], 'achievement_boss_illidan');
  }
  const cataclysms = Array.isArray(mon._cataclysms) ? mon._cataclysms : [];
  if (cataclysms.length) {
    html += monsterMechanicSectionHtml('环境灾变', '#fb7185', cataclysms, 'spell_nature_earthquake', cat => ({
      icon:cat.icon || '🌪️',
      name:cat.name || '环境灾变',
      meta:cat.meta || '',
      desc:cat.desc || '副本环境周期性爆发,并强化本次敌人强度。'
    }));
  }
  const zoneThreats = Array.isArray(mon._zoneThreats) ? mon._zoneThreats : [];
  if (zoneThreats.length) {
    html += monsterMechanicSectionHtml('区域威胁', '#fb7185', zoneThreats, 'achievement_zone_outland_01', threat => ({
      icon:threat.icon || '🧭',
      name:threat.name || '区域威胁',
      meta:threat.meta || '',
      desc:`${threat.desc || '野外环境正在影响战斗。'} ${mon._zoneThreatDesc || ''}`.trim()
    }));
  }
  const rareMutations = Array.isArray(mon._rareMutations) ? mon._rareMutations : [];
  if (rareMutations.length) {
    html += monsterMechanicSectionHtml('稀有异变', '#fbbf24', rareMutations, 'achievement_boss_illidan', mut => ({
      icon:mut.icon || '⭐',
      name:mut.name || '稀有异变',
      meta:mut.meta || '',
      desc:`${mut.desc || '稀有精英获得额外专属性质。'} ${mon._rareMutationDesc || ''}`.trim()
    }));
  }
  if (mon._fieldCommander && mon._fieldOperation) {
    html += monsterMechanicSectionHtml('野外据点', '#67e8f9', [mon._fieldOperation], 'achievement_zone_kalimdor_01', op => ({
      icon:op.icon || '🗺️',
      name:op.name || '野外据点',
      meta:'据点指挥官',
      desc:`${op.desc || '击败据点指挥官可完成本区域的野外事件。'} ${mon._fieldOperationDesc || ''}`.trim()
    }));
  }
  if (mon._worldRenownAlert) {
    html += monsterMechanicSectionHtml('区域警戒', '#86efac', [mon._worldRenownAlert], 'achievement_reputation_argentchampion', alert => ({
      icon:'🏕️',
      name:`区域警戒 ${alert.alert || 0}`,
      meta:`声望 ${alert.rank || 0}`,
      desc:alert.desc || '你在当地的声望越高,补给越丰厚,敌人也越警戒。'
    }));
  }
  if (state.mode === 'worldboss' && bossData?.key) {
    html += worldBossEncounterDetailHtml(bossData, mon);
    return html;
  }
  if (!bossData || (state.mode !== 'dungeon' && state.mode !== 'mythic')) return html;
  const challengeList = mon._bossChallenges?.length
    ? mon._bossChallenges
    : ((typeof getDungeonBossChallengeSeals === 'function') ? getDungeonBossChallengeSeals(bossData) : []);
  if (challengeList.length) {
    html += monsterMechanicSectionHtml('Boss挑战', '#fde68a', challengeList, 'achievement_bg_killxenemies_generalsroom', ch => ({
      icon:ch.icon,
      name:ch.name,
      meta:[(typeof ch.target === 'number' && ch.target > 1) ? `${Math.min(ch.progress || 0, ch.target)}/${ch.target}` : '', (typeof bossChallengeMetaText === 'function') ? bossChallengeMetaText(ch) : '', (ch.completed || ch.failed) ? (ch.completed ? '已完成' : '失败') : ''].filter(Boolean).join(' · '),
      desc:ch.desc || '额外挑战目标'
    }));
  }
  const tacticList = (typeof getDungeonBossTactics === 'function') ? getDungeonBossTactics(bossData) : [];
  if (tacticList.length) html += monsterMechanicSectionHtml('战术机制', '#fca5a5', tacticList, 'ability_warrior_battleshout');
  const weakpointList = (typeof getDungeonBossWeakpoints === 'function') ? getDungeonBossWeakpoints(bossData) : [];
  if (weakpointList.length) html += monsterMechanicSectionHtml('弱点窗口', '#fde68a', weakpointList, 'inv_misc_gem_diamond_02', wp => ({
    icon:wp.icon,
    name:wp.name,
    meta:typeof wp.threshold === 'number' ? `${Math.round(wp.threshold * 100)}%触发` : '',
    desc:wp.desc || '血线机制弱点'
  }));
  const spectacleList = (typeof getDungeonBossSpectacleMechanics === 'function') ? getDungeonBossSpectacleMechanics(bossData) : [];
  if (spectacleList.length) html += monsterMechanicSectionHtml('额外戏剧机制', '#f0abfc', spectacleList, 'spell_shadow_shadowfury');
  const directorList = (typeof getDungeonBossDirectorEvents === 'function') ? getDungeonBossDirectorEvents(bossData) : [];
  if (directorList.length) html += monsterMechanicSectionHtml('导演事件', '#93c5fd', directorList, 'achievement_boss_illidan');
  const grandList = (typeof getDungeonBossGrandMechanics === 'function') ? getDungeonBossGrandMechanics(bossData, 6) : [];
  if (grandList.length) html += monsterMechanicSectionHtml('终局词条', '#67e8f9', grandList, 'spell_arcane_arcanetorrent');
  const councilList = (typeof getDungeonBossCouncilMembers === 'function') ? getDungeonBossCouncilMembers(bossData) : [];
  if (councilList.length > 1) {
    html += monsterMechanicSectionHtml('议会成员', '#fcd34d', councilList, 'achievement_boss_illidan', member => ({
      icon:member.icon || '👥',
      name:member.name,
      meta:member.role || '',
      desc:member.role ? `该成员负责 ${member.role}。` : '多目标首领成员'
    }));
  }
  return html;
}
function worldBossPreviewEncounter(wb) {
  if (!wb || typeof isApexWorldBoss !== 'function' || !isApexWorldBoss(wb)) return null;
  const active = state.worldBoss?.activeEncounter;
  if (active?.key === wb.key) return active;
  if (typeof worldBossContractLevel !== 'function' || typeof worldBossContractInfo !== 'function') return null;
  const level = worldBossContractLevel();
  if (!(level > 0)) return null;
  return {
    key:wb.key,
    contractLevel:level,
    contract:worldBossContractInfo(level),
    assaults:(typeof getWorldBossAssaults === 'function') ? getWorldBossAssaults(wb, level) : [],
    phases:(typeof getWorldBossPhaseEvents === 'function') ? getWorldBossPhaseEvents(wb, level) : [],
    pressure:0,
    maxPressure:0,
    preview:true
  };
}
function worldBossEncounterDetailHtml(wb, mon) {
  const encounter = worldBossPreviewEncounter(wb);
  if (!encounter?.contractLevel || !encounter.contract) return '';
  let html = '';
  const rewardMult = (typeof worldBossEncounterRewardMult === 'function')
    ? worldBossEncounterRewardMult(encounter, false).toFixed(2)
    : Number(encounter.contract.reward || 1).toFixed(2);
  html += monsterMechanicSectionHtml('顶峰猎令', '#fde68a', [{
    icon:encounter.contract.icon || '📘',
    name:encounter.contract.name || '常规猎杀',
    meta:`奖励 ×${rewardMult}`,
    desc:`${encounter.contract.desc || '世界Boss契约'} 生命 ×${Number(encounter.contract.hp || 1).toFixed(2)} · 攻击 ×${Number(encounter.contract.atk || 1).toFixed(2)} · 防御 ×${Number(encounter.contract.def || 1).toFixed(2)}。`
  }], 'inv_scroll_03');
  if (encounter.assaults?.length) {
    html += monsterMechanicSectionHtml('天幕戒律', '#67e8f9', encounter.assaults, 'spell_arcane_blink', assault => ({
      icon:assault.icon,
      name:assault.name,
      meta:'周期生效',
      desc:assault.desc || '世界Boss附加规则'
    }));
  }
  if (encounter.phases?.length) {
    html += monsterMechanicSectionHtml('阶段变化', '#f9a8d4', encounter.phases, 'achievement_boss_illidan', phase => ({
      icon:phase.icon,
      name:phase.name,
      meta:`${Math.round((phase.threshold || 0) * 100)}%血线`,
      desc:phase.desc || '进入血量阶段后触发'
    }));
  }
  if (!encounter.preview) {
    html += monsterMechanicSectionHtml('战场压迫', '#fb7185', [{
      icon:'🔥',
      name:'终局压迫',
      meta:`当前 ${encounter.pressure || 0} · 最高 ${encounter.maxPressure || 0}`,
      desc:'顶峰世界Boss会随着时间提高攻击、防御与护盾,并周期性压低你的血线与节奏。'
    }], 'spell_fire_volcano');
  }
  if (mon?._wbRewardMult && mon._wbRewardMult > 1) {
    html += monsterMechanicSectionHtml('结算倍率', '#86efac', [{
      icon:'💠',
      name:'当前结算加成',
      meta:`×${Number(mon._wbRewardMult || 1).toFixed(2)}`,
      desc:'会放大金币、荣誉和部分终局奖励,高猎令与更高压迫层数都会抬升这条线。'
    }], 'inv_misc_gem_crystal_02');
  }
  return html;
}
function attachMonsterHover(el, mon) {
  if (!el || !mon) return;
  const bossData = lookupMonsterBossData(mon);
  const hasMobSkills = !!(mon._monSkills?.length || mon._monSkill || mon._monSupportSkills?.length);
  const extraHtml = monsterEncounterDetailHtml(mon, bossData);
  if (!bossData && !hasMobSkills && !extraHtml) return;
  const showTip = function(e) {
    let html = monsterUnitTipHtml(mon, bossData);
    if (bossData?.skills) {
      html += '<div style=\"margin-top:3px;color:#fbbf24\">技能:</div>';
      bossData.skills.forEach(s => {
        html += bossSkillLineHtml(s, { iconSize:16, tagColor:'#fbbf24' });
      });
    } else if (mon._monSkills?.length || mon._monSkill) {
      const skills = mon._monSkills?.length ? mon._monSkills : [mon._monSkill];
      html += '<div style=\"margin-top:3px;color:#fbbf24\">敌方技能:</div>';
      skills.forEach(s => {
        html += bossSkillLineHtml(s, { iconSize:16, tagColor:'#fbbf24' });
      });
    }
    if (mon._monSupportSkills && mon._monSupportSkills.length) {
      html += '<div style=\"margin-top:3px;color:#93c5fd\">支援技能包:</div>';
      mon._monSupportSkills.forEach(s => {
        html += bossSkillLineHtml(s, { iconSize:16, tagColor:'#93c5fd', showCast:false });
      });
    }
    if (bossData?.passive) {
      html += '<div style="margin-top:3px;color:#6ee7b7">被动:</div>';
      const p = bossData.passive;
      if (p.dodgeChance) html += '<div>💨 闪避 +'+(p.dodgeChance*100)+'%</div>';
      if (p.critChance) html += '<div>💥 暴击 +'+(p.critChance*100)+'%</div>';
      if (p.dmgReduction) html += '<div>🛡️ 减伤 +'+(p.dmgReduction*100)+'%</div>';
      if (p.atkBonus) html += '<div>⚔️ 攻击 +'+(p.atkBonus*100)+'%</div>';
      if (p.leech) html += '<div>🩸 吸血 +'+(p.leech*100)+'%</div>';
      if (p.tricks?.length) {
        html += '<div style="margin-top:3px;color:#93c5fd">被动触发:</div>';
        p.tricks.forEach(s => {
          html += bossSkillLineHtml(s, { iconSize:16, tagColor:'#93c5fd', showCast:false });
        });
      }
    }
    html += extraHtml;
    const tip = $('compare-tip');
    tip.querySelector('.compare-head').innerHTML = html;
    tip.querySelector('.compare-body').innerHTML = '';
    tip.style.display = 'block';
    positionTip(tip, e);
  };
  el.style.cursor = 'help';
  el.onmouseenter = e => { if (!tooltipHoverEnabled()) return; showTip(e); };
  el.onmouseleave = () => { if (!tooltipHoverEnabled()) return; if (!_tipPinned) hideLootTip(); };
  el.onmousemove = e => { if (!tooltipHoverEnabled()) return; positionTip($('compare-tip'), e); };
  addTouchPin(el, showTip);
}
function allySummonThemeName(theme) {
  const map = {
    beast:'野兽召唤',
    undead:'亡灵召唤',
    demon:'恶魔召唤',
    phoenix:'凤凰召唤',
    nature:'自然召唤',
    fire:'火焰召唤',
    void:'虚空召唤',
    soldier:'守卫召唤',
    generic:'通用召唤'
  };
  return map[theme] || '召唤单位';
}
function allySummonEffectTexts(skill) {
  if (!skill) return [];
  const lines = [];
  if ((skill.mul || 0) > 0) lines.push(`伤害倍率 ${Number(skill.mul || 1).toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1')}倍`);
  if (skill.dotPct > 0) lines.push(`每秒造成 ${compPct(skill.dotPct)}% 本次伤害，持续 ${compSecs(skill.dotMs || 6000)} 秒`);
  if (skill.slow) lines.push(`减速 ${compSecs(skill.slowMs || 4000)} 秒`);
  if (skill.stun) lines.push(`击晕 ${compSecs(skill.stunMs || 1200)} 秒`);
  if (skill.sunder) lines.push(`易伤 ${compSecs(skill.sunderMs || 12000)} 秒`);
  if (skill.stateKey) lines.push(`施加 ${compStateName(skill.stateKey)} ${compSecs(skill.stateMs || 7000)} 秒`);
  if (skill.splashPct > 0) lines.push(`溅射 ${compPct(skill.splashPct)}% 伤害`);
  if (skill.bonusVsBoss) lines.push(`对首领额外 +${compPct(skill.bonusVsBoss)}% 伤害`);
  if (skill.bonusVsDot) lines.push(`对持续伤害目标额外 +${compPct(skill.bonusVsDot)}% 伤害`);
  if (skill.bonusVsSlow) lines.push(`对减速目标额外 +${compPct(skill.bonusVsSlow)}% 伤害`);
  if (skill.bonusVsState) lines.push(`对${compStateName(skill.bonusVsState)}目标额外 +${compPct(skill.bonusStatePct || 0.3)}% 伤害`);
  if (skill.executeBonus) lines.push(`对 ${compPct(skill.executeThreshold || 0.35)}% 以下目标额外 +${compPct(skill.executeBonus)}% 伤害`);
  if (skill.healSelfPct > 0) lines.push(`回复自身 ${compPct(skill.healSelfPct)}% 最大生命`);
  return lines;
}
function allySummonPassiveTexts(unit) {
  if (!unit) return [];
  const lines = [];
  if (unit.damageTakenMult && unit.damageTakenMult < 1) lines.push(`承受伤害降低 ${compPct(1 - unit.damageTakenMult)}%`);
  if (unit.leechPct > 0) lines.push(`攻击回复 ${compPct(unit.leechPct)}% 造成伤害`);
  if (unit.splashPct > 0) lines.push(`普攻溅射 ${compPct(unit.splashPct)}% 伤害`);
  if (unit.bonusVsBoss) lines.push(`对首领额外 +${compPct(unit.bonusVsBoss)}% 伤害`);
  if (unit.bonusVsDot) lines.push(`对持续伤害目标额外 +${compPct(unit.bonusVsDot)}% 伤害`);
  if (unit.bonusVsSlow) lines.push(`对减速目标额外 +${compPct(unit.bonusVsSlow)}% 伤害`);
  if (unit.bonusVsState) lines.push(`对${compStateName(unit.bonusVsState)}目标额外 +${compPct(unit.bonusStatePct || 0.3)}% 伤害`);
  if (unit.executeBonus) lines.push(`对 ${compPct(unit.executeThreshold || 0.35)}% 以下目标额外 +${compPct(unit.executeBonus)}% 伤害`);
  if (unit.retaliatePct > 0) lines.push(`受击反击 ${compPct(unit.retaliatePct)}% 本次伤害`);
  if (unit.reviveOnce) lines.push(`首次倒下时复苏 ${compPct(unit.revivePct || 0.35)}% 最大生命`);
  if (unit.frenzyThreshold > 0) {
    const frenzy = [];
    if (unit.frenzyAtkBonus > 0) frenzy.push(`伤害 +${compPct(unit.frenzyAtkBonus)}%`);
    if ((unit.frenzySpdMul || 1) > 1) frenzy.push(`攻速 +${compPct((unit.frenzySpdMul || 1) - 1)}%`);
    lines.push(`生命低于 ${compPct(unit.frenzyThreshold)}% 时狂暴${frenzy.length ? `（${frenzy.join(' · ')}）` : ''}`);
  }
  return lines;
}
function allySummonSkillLineHtml(skill, opts) {
  if (!skill) return '';
  const cfg = opts || {};
  const iconHtml = (typeof skillIcon === 'function') ? skillIcon(skill.name, cfg.iconSize || 15, skill.icon || '✨') : (skill.icon || '✨');
  const readyText = cfg.readyText ? ` <span style="font-size:10px;color:${cfg.readyColor || '#cbd5f5'}">${cfg.readyText}</span>` : '';
  const desc = `${Number(skill.mul || 1).toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1')}倍伤害`;
  const effectLines = allySummonEffectTexts(skill);
  const detailHtml = effectLines.length
    ? `<div style="margin-top:2px;color:${cfg.tagColor || '#c4b5fd'};font-size:10px;line-height:1.45;word-break:break-word">${effectLines.join(' · ')}</div>`
    : '';
  return `<div style="margin:3px 0 6px;padding-bottom:5px;border-bottom:1px dashed rgba(148,163,184,.18)">
    <div style="color:${cfg.leadColor || 'var(--text)'};line-height:1.5;word-break:break-word">${iconHtml} ${skill.name}${readyText}</div>
    <div style="font-size:10px;color:var(--muted);line-height:1.45;word-break:break-word">${skill.desc || desc}</div>
    ${detailHtml}
  </div>`;
}
function allySummonUnitTipHtml(unit) {
  if (!unit) return '<b>召唤物</b>';
  const now = Date.now();
  const iconHtml = (typeof entityIcon === 'function') ? entityIcon(unit.baseName || unit.name, 18, unit.icon || '🐾') : (unit.icon || '🐾');
  const remainSecs = Math.max(0, Math.ceil(((unit.expireAt || now) - now) / 1000));
  const activeSkills = Array.isArray(unit._skills) && unit._skills.length
    ? unit._skills
    : [{
        name:unit._skillName || '协同猛袭',
        icon:unit._skillIcon || unit.icon || '✨',
        mul:unit._skillMul || 1.75,
        desc:`主动技能 · 冷却 ${compSecs(unit._skillCdMs || 7800)} 秒`,
        dotPct:unit._skillDotPct || 0,
        dotMs:unit._skillDotMs || 7000,
        slow:!!unit._skillSlow,
        slowMs:unit._skillSlowMs || 4000,
        stun:!!unit._skillStun,
        stunMs:unit._skillStunMs || 1200,
        sunder:!!unit._skillSunder,
        sunderMs:unit._skillSunderMs || 12000,
        stateKey:unit._skillStateKey || '',
        stateMs:unit._skillStateMs || 7000,
        splashPct:unit._skillSplashPct || 0,
        healSelfPct:unit._skillHealSelfPct || 0,
        readyAt:unit._skillReadyAt || 0
      }];
  const basicSkill = {
    name:'普攻特性',
    icon:unit.icon || '🐾',
    mul:1,
    desc:`普通攻击 · 攻速 ${(unit.spd || 1).toFixed(2)}/秒`,
    dotPct:unit.dotPct || 0,
    dotMs:unit.dotMs || 5000,
    slow:!!unit.slow,
    slowMs:unit.slowMs || 3000
  };
  const basicEffects = (basicSkill.dotPct > 0 || basicSkill.slow) ? allySummonSkillLineHtml(basicSkill, {
    leadColor:'#93c5fd',
    tagColor:'#93c5fd',
    readyText:'常驻'
  }) : '';
  const activeEffects = activeSkills.map(skill => {
    const skillCdSecs = Math.max(0, Math.ceil(((skill.readyAt || 0) - now) / 1000));
    return allySummonSkillLineHtml(skill, {
      leadColor:'#f9a8d4',
      tagColor:'#d8b4fe',
      readyText:skillCdSecs > 0 ? `冷却 ${skillCdSecs}s` : '技能就绪',
      readyColor:skillCdSecs > 0 ? '#fbbf24' : '#86efac'
    });
  }).join('');
  const passiveTexts = allySummonPassiveTexts(unit);
  const passiveHtml = passiveTexts.length
    ? passiveTexts.map(line => `<div class="muted" style="margin:3px 0 0;line-height:1.45;word-break:break-word">${line}</div>`).join('')
    : '<div class="muted" style="margin:3px 0 0">暂无额外被动特性</div>';
  const growthLine = unit._skillUnlockText
    ? `<div class="muted" style="margin-top:3px">${unit._skillUnlockText}</div>`
    : '';
  return `<b>${iconHtml} ${unit.baseName || unit.name} · 等级${unit.lvl || 1}</b>
    <div>${allySummonThemeName(unit._theme)} · ${unit._ownerType === 'companion' ? '随从召唤' : '主角召唤'}</div>
    <div class="muted">由 ${unit._ownerName || '我方'} 的 ${unit._ownerSkill || '召唤技能'} 呼出 · 剩余 ${remainSecs} 秒</div>
    <div>生命 ${hpWithShieldText(unit.hp || 0, unit.hpMax || 0, 0)}</div>
    <div>攻击 ${fmt(unit.atk || 0)} · 防御 ${fmt(unit.def || 0)} · 攻速 ${(unit.spd || 1).toFixed(2)}/秒</div>
    <div>暴击 ${fmtPctValue(unit.crit || 0, 0)} · 暴伤 ${fmtPctValue(unit.critd || 0, 0)} · 承伤权重 ${fmtPctValue((unit.aggro || 0) * 100, 0)}</div>
    <div style="margin-top:4px;color:#93c5fd">战斗特性:</div>
    ${basicEffects || '<div class="muted" style="margin:3px 0 6px">普攻无额外附加效果</div>'}
    ${passiveHtml}
    <div style="margin-top:4px;color:#f9a8d4">召唤技能:</div>
    ${activeEffects}${growthLine}`;
}
function worldBossTipHtml(wb) {
  if (!wb) return '<b>世界首领</b>';
  const mon = (typeof buildWorldBossMonsterData === 'function') ? buildWorldBossMonsterData(wb) : null;
  let html = monsterUnitTipHtml(mon, wb);
  if (wb.nightmareTraits?.length) {
    html += '<div style="margin-top:4px;color:#fb7185">噩梦特性:</div>';
    wb.nightmareTraits.forEach(t => {
      html += `<div style="font-size:11px;line-height:1.45;margin-top:2px">${t.icon || '🌌'} <b>${tipAttrText(t.name || '噩梦特性')}</b> <span class="muted">${tipAttrText(t.desc || '')}</span></div>`;
    });
  }
  if (wb.skills?.length) {
    html += '<div style="margin-top:4px;color:#fbbf24">技能:</div>';
    wb.skills.forEach(s => { html += bossSkillLineHtml(s, { iconSize:15, tagColor:'#fbbf24' }); });
  }
  html += worldBossEncounterDetailHtml(wb, mon);
  return html;
}
function bindWorldBossTip(el, builder) {
  if (!el || typeof builder !== 'function') return;
  const showTip = e => {
    const tip = $('compare-tip');
    const data = builder();
    if (!tip || !data) return;
    tip.querySelector('.compare-head').innerHTML = data.head || '';
    tip.querySelector('.compare-body').innerHTML = data.body || '';
    tip.style.display = 'block';
    positionTip(tip, e);
  };
  el.onmouseenter = e => { if (!tooltipHoverEnabled()) return; showTip(e); };
  el.onmouseleave = () => { if (!tooltipHoverEnabled()) return; if (!_tipPinned) hideLootTip(); };
  el.onmousemove = e => { if (!tooltipHoverEnabled()) return; positionTip($('compare-tip'), e); };
  addTouchPin(el, showTip);
}
function rareEliteTipHtml(rare) {
  if (!rare) return '<b>稀有精英</b>';
  const mon = (typeof buildRareEliteMonsterData === 'function') ? buildRareEliteMonsterData(rare) : null;
  let html = monsterUnitTipHtml(mon, rare);
  if (rare.skills?.length) {
    html += '<div style="margin-top:4px;color:#fbbf24">技能:</div>';
    rare.skills.forEach(s => { html += bossSkillLineHtml(s, { iconSize:15, tagColor:'#fbbf24' }); });
  }
  if (mon) html += monsterEncounterDetailHtml(mon, rare);
  return html;
}
function bindWorldBossTooltips(root) {
  if (!root) return;
  root.querySelectorAll('.wb-name-tip[data-wb-key]').forEach(el => {
    const wb = (typeof getWorldBossDef === 'function') ? getWorldBossDef(el.dataset.wbKey) : null;
    if (!wb) return;
    const showTip = e => {
      const tip = $('compare-tip');
      tip.querySelector('.compare-head').innerHTML = worldBossTipHtml(wb);
      tip.querySelector('.compare-body').innerHTML = '';
      tip.style.display = 'block';
      positionTip(tip, e);
    };
    el.onmouseenter = e => { if (!tooltipHoverEnabled()) return; showTip(e); };
    el.onmouseleave = () => { if (!tooltipHoverEnabled()) return; if (!_tipPinned) $('compare-tip').style.display = 'none'; };
    el.onmousemove = e => { if (!tooltipHoverEnabled()) return; positionTip($('compare-tip'), e); };
    addTouchPin(el, showTip);
  });
  root.querySelectorAll('.wb-contract-tip[data-contract-level]').forEach(el => {
    bindWorldBossTip(el, () => {
      const level = Math.max(0, Math.floor(Number(el.dataset.contractLevel) || 0));
      const wb = (typeof getWorldBossDef === 'function' && el.dataset.wbKey) ? getWorldBossDef(el.dataset.wbKey) : null;
      const contract = (typeof worldBossContractInfo === 'function') ? worldBossContractInfo(level) : null;
      if (!contract) return null;
      const assaults = (wb && typeof getWorldBossAssaults === 'function') ? getWorldBossAssaults(wb, level) : [];
      const phases = (wb && typeof getWorldBossPhaseEvents === 'function') ? getWorldBossPhaseEvents(wb, level) : [];
      return {
        head:`<b>${contract.icon || '📘'} ${tipAttrText(contract.name || '顶峰猎令')}</b><div class="muted" style="margin-top:4px;line-height:1.5">${tipAttrText(contract.desc || '世界Boss契约')}</div>`,
        body:`<div style="font-size:11px;line-height:1.55"><div>生命 ×${Number(contract.hp || 1).toFixed(2)} · 攻击 ×${Number(contract.atk || 1).toFixed(2)} · 防御 ×${Number(contract.def || 1).toFixed(2)} · 奖励 ×${Number(contract.reward || 1).toFixed(2)}</div><div style="margin-top:4px">天幕戒律 ${assaults.length} 条 · 阶段变化 ${phases.length} 条</div><div style="margin-top:6px" class="muted">猎令会直接提高终局世界Boss的压迫节奏,因此星痕、猎箱和坐骑成长不会把战斗难度甩开。</div></div>`
      };
    });
  });
  root.querySelectorAll('.wb-assault-tip[data-wb-key][data-wb-assault-key]').forEach(el => {
    bindWorldBossTip(el, () => {
      const wb = (typeof getWorldBossDef === 'function') ? getWorldBossDef(el.dataset.wbKey) : null;
      const level = Math.max(0, Math.floor(Number(el.dataset.contractLevel) || 0));
      const assault = (wb && typeof getWorldBossAssaults === 'function')
        ? getWorldBossAssaults(wb, level).find(x => x.key === el.dataset.wbAssaultKey)
        : null;
      if (!assault) return null;
      return {
        head:`<b>${assault.icon || '🌌'} ${tipAttrText(assault.name || '天幕戒律')}</b>`,
        body:`<div style="font-size:11px;line-height:1.55">${tipAttrText(assault.desc || '世界Boss附加戒律')}<div style="margin-top:6px" class="muted">该戒律会在战斗中周期生效,直接改变资源、护盾、持续伤害或收尾压迫。</div></div>`
      };
    });
  });
  root.querySelectorAll('.wb-phase-tip[data-wb-key][data-wb-phase-key]').forEach(el => {
    bindWorldBossTip(el, () => {
      const wb = (typeof getWorldBossDef === 'function') ? getWorldBossDef(el.dataset.wbKey) : null;
      const level = Math.max(0, Math.floor(Number(el.dataset.contractLevel) || 0));
      const phase = (wb && typeof getWorldBossPhaseEvents === 'function')
        ? getWorldBossPhaseEvents(wb, level).find(x => x.phaseKey === el.dataset.wbPhaseKey)
        : null;
      if (!phase) return null;
      return {
        head:`<b>${phase.icon || '⚔️'} ${tipAttrText(phase.name || '阶段变化')}</b><div class="muted" style="margin-top:4px">${Math.round((phase.threshold || 0) * 100)}% 血线触发</div>`,
        body:`<div style="font-size:11px;line-height:1.55">${tipAttrText(phase.desc || '世界Boss血量阶段机制')}<div style="margin-top:6px" class="muted">进入该血线后会立刻触发,并把这场顶峰战推向更高压迫段。</div></div>`
      };
    });
  });
}
function lookupMonsterBossData(mon) {
  if (!mon) return null;
  if (mon.isRareElite && typeof RARE_ELITES !== 'undefined') {
    return RARE_ELITES.find(b => b.key === mon.rareKey) || null;
  }
  if (state.mode === 'boss') {
    const map = getMap();
    return map?.boss || null;
  }
  if (state.mode === 'worldboss') {
    if (typeof WORLD_BOSSES !== 'undefined') return WORLD_BOSSES.find(b => b.key === mon.wbKey) || null;
    return null;
  }
  if (state.mode === 'dungeon' || state.mode === 'mythic') {
    const dg = DUNGEONS.find(d=>d.key===(state.dungeonState||state.mythicState)?.key);
    if (dg) return (dg.bosses||[]).find(b=>b.name===mon.bossName);
  }
  return null;
}
function bindUnitTip(el, htmlBuilder) {
  if (!el || typeof htmlBuilder !== 'function') return;
  const showTip = e => {
    const tip = $('compare-tip');
    if (!tip) return;
    tip.querySelector('.compare-head').innerHTML = htmlBuilder() || '';
    tip.querySelector('.compare-body').innerHTML = '';
    tip.style.display = 'block';
    positionTip(tip, e);
  };
  el.onmouseenter = e => { if (!tooltipHoverEnabled()) return; showTip(e); };
  el.onmouseleave = () => { if (!tooltipHoverEnabled()) return; if (!_tipPinned) hideLootTip(); };
  el.onmousemove = e => { if (!tooltipHoverEnabled()) return; positionTip($('compare-tip'), e); };
  addTouchPin(el, showTip);
}
function attachFocusBossHover(focus) {
  const emojiEl = $('mon-emoji'); if (!emojiEl) return;
  if (!focus) return;
  attachMonsterHover(emojiEl, focus);
}
function renderMonList() {
  const wrap = $('mon-list'); if (!wrap) return;
  const all = state.currentMonsters || [];
  const now = Date.now();
  const searching = state.mode === 'world' && state.worldSearch && (state.worldSearch.until || 0) > now && all.length === 0;
  const paused = state.mode === 'world' && state.worldCombatPause && all.length === 0;
  const searchRemain = searching ? Math.max(1, Math.ceil(((state.worldSearch.until || 0) - now) / 1000)) : 0;
  const searchPct = searching ? Math.max(0, Math.min(100, ((now - (state.worldSearch.start || now)) / Math.max(1, state.worldSearch.duration || ((state.worldSearch.until || now) - (state.worldSearch.start || now)))) * 100)) : 0;
  const pauseRemainMs = paused ? Math.max(0, (state.worldCombatPause.until || now) - now) : 0;
  const pauseRemain = paused ? Math.ceil(pauseRemainMs / 1000) : 0;
  const pauseDuration = paused ? Math.max(1, (state.worldCombatPause.until || now) - (state.worldCombatPause.at || now)) : 1;
  const pausePct = paused ? Math.max(0, Math.min(100, ((now - (state.worldCombatPause.at || now)) / pauseDuration) * 100)) : 0;
  const displayName = (raw) => {
    const s = String(raw || '');
    if (!s) return '敌人';
    const arr = Array.from(s);
    if (arr.length > 1 && /[^\u4e00-\u9fa5A-Za-z0-9]/.test(arr[0])) return arr.slice(1).join('') || s;
    return s;
  };

  // 始终渲染至少4个槽位, 超出则全部显示(召唤物), 死敌保留槽位不删除
  const SLOTS = 4;
  const slotCount = Math.max(SLOTS, all.length);
  const slots = [];
  for (let i = 0; i < slotCount; i++) slots.push(i < all.length ? all[i] : null);

  // focus 优先第一个活着的怪物
  const focus = all.find(m => m.hp > 0) || all[0] || null;

  // 签名: 槽位内容(含空槽)
  const sig = (searching ? `S${searchRemain}|` : '') + (paused ? `P${state.worldCombatPause.reason || ''}:${pauseRemain}|` : '') + slots.map((m, i) => m ? m._uid + (m === focus ? 'F' : '') + (m.hp > 0 ? 'A' : 'D') : 'E' + i).join('|');
  if (sig !== _monListSig) {
    _monListSig = sig;
    wrap.innerHTML = slots.map((m, i) => {
      if (!m) {
        if (searching && i === 0) {
          return `<div class="mon-row mon-placeholder" data-slot="${i}">
            <div class="m-emoji">🔎</div>
            <div class="m-mid"><div class="m-name">寻找目标<span class="m-lvl">${searchRemain}秒</span></div><div class="bar hp"><i style="width:${searchPct}%"></i><span>${state.worldSearch.text || '正在寻找下一批敌人'}</span></div></div>
          </div>`;
        }
        if (paused && i === 0) {
          const pauseName = state.worldCombatPause.name || '据点指挥官';
          const pauseText = pauseRemainMs > 0
            ? `挑战失败,首领已撤退。${pauseRemain}秒后恢复野外推进。`
            : (state.worldCombatPause.text || '挑战冷却结束,正在重新寻找敌人。');
          const pauseLevel = pauseRemainMs > 0 ? `失败冷却 ${pauseRemain}秒` : '恢复中';
          return `<div class="mon-row mon-placeholder" data-slot="${i}">
            <div class="m-emoji">💀</div>
            <div class="m-mid"><div class="m-name">${pauseName}<span class="m-lvl">${pauseLevel}</span></div><div class="bar hp"><i style="width:${pausePct}%"></i><span>${pauseText}</span></div></div>
          </div>`;
        }
        return `<div class="mon-row mon-placeholder" data-slot="${i}">
          <div class="m-emoji">—</div>
          <div class="m-mid"><div class="m-name">—</div><div class="bar hp"><i style="width:0%"></i><span>—</span></div></div>
        </div>`;
      }
      const isFocus = m === focus;
      const isDead = m.hp <= 0;
      const seg = Array.from(m.name);
      const emoji = seg[0], nm = displayName(m.name);
      const monIconHtml = (typeof entityIcon === 'function') ? entityIcon(nm, 28, emoji) : emoji;
      const summonLine = m._summoned
        ? `<div class="m-sub">由 ${displayName(m._summonerName || '敌人')} 召唤</div>`
        : '';
      const summonCls = m._summoned ? ` summoned${m._summonerIsBoss ? ' boss-add' : ''}` : '';
      return `<div class="mon-row${isFocus?' focus':''}${isDead?' dead':''}${summonCls}" data-uid="${m._uid}">
        <div class="m-emoji"${isFocus?' id="mon-emoji"':''}>${monIconHtml}</div>
        <div class="m-mid">
          <div class="m-name"${isFocus?' id="mon-name"':''}>${nm}<span class="m-lvl">等级${m.lvl}</span><span class="m-debuffs"></span></div>
          ${summonLine}
          <div class="m-target"></div>
          <div class="bar hp"><i${isFocus?' id="b-mhp"':''}></i><span${isFocus?' id="t-mhp"':''}></span></div>
        </div>
      </div>`;
    }).join('');
    wrap.querySelectorAll('.mon-row').forEach(row => {
      row.onmouseenter = null;
      row.onmouseleave = null;
      row.onmousemove = null;
      row.style.cursor = '';
      const nameEl = row.querySelector('.m-name');
      if (nameEl) {
        nameEl.onmouseenter = null;
        nameEl.onmouseleave = null;
        nameEl.onmousemove = null;
        nameEl.style.cursor = '';
      }
    });
    if (focus) attachFocusBossHover(focus);
    wrap.querySelectorAll('.mon-row[data-uid]').forEach(row => {
      const mon = all.find(m => m && String(m._uid) === String(row.dataset.uid));
      if (!mon) return;
      attachMonsterHover(row.querySelector('.m-emoji'), mon);
      attachMonsterHover(row.querySelector('.m-name'), mon);
    });
  }

  // 每帧更新血条 + 存活状态 + 减益(仅真实怪物槽位)
  const skipNonFocus = isMobileLayout() && (now - _lastNonFocusMonPaint < 220);
  for (const m of all) {
    const row = wrap.querySelector(`[data-uid="${m._uid}"]`); if (!row) continue;
    const isFocusRow = m === focus;
    if (!isFocusRow && skipNonFocus) continue;
    const isDead = m.hp <= 0;
    row.classList.toggle('dead', isDead);

    const fill = row.querySelector('.bar > i'); const txt = row.querySelector('.bar > span');
    if (fill) {
      const width = isDead ? '0%' : Math.max(0, m.hp / m.hpMax * 100) + '%';
      if (fill.dataset.w !== width) {
        fill.dataset.w = width;
        fill.style.width = width;
      }
    }
    if (txt) {
      const hpText = isDead ? '已击败' : hpWithShieldText(m.hp, m.hpMax, Math.max(0, m._arcaneShield || 0));
      if (txt.textContent !== hpText) txt.textContent = hpText;
    }
    const targetEl = row.querySelector('.m-target');
    if(targetEl){
      const recentTarget = (m._lastTargetAt || 0) > now - 3500;
      const targetKind = recentTarget ? (m._lastTargetKind || 'hero') : '';
      row.title = isDead ? '已击败' : (isFocusRow ? '当前攻击目标;点击其他敌人可切换集火' : '点击切换为攻击目标');
      const wildText = m._wildHpMult ? `野外耐久 ×${Number(m._wildHpMult || 1).toFixed(2)}` : '';
      const challengeText = m._companionChallengeName ? `${m._companionChallengeName} ${m._companionChallengeRank || ''}` : '';
      const focusText = isFocusRow && !isDead ? '当前目标' : '';
      const idleText = [focusText, challengeText, wildText].filter(Boolean).join(' · ');
      const targetIcon = targetKind === 'companion' ? '🛡️' : targetKind === 'summon' ? '✦' : '🎯';
      const targetName = m._lastTargetName || (targetKind === 'companion' ? '随从' : targetKind === 'summon' ? '召唤物' : '主角');
      const targetText = recentTarget ? `${isFocusRow ? '⚔️ 集火 · ' : ''}${targetIcon} 盯 ${targetName}` : idleText;
      row.classList.toggle('target-hero', recentTarget && targetKind === 'hero');
      row.classList.toggle('target-companion', recentTarget && targetKind === 'companion');
      row.classList.toggle('target-summon', recentTarget && targetKind === 'summon');
      targetEl.classList.toggle('has-target', recentTarget);
      targetEl.classList.toggle('is-hero', recentTarget && targetKind === 'hero');
      targetEl.classList.toggle('is-companion', recentTarget && targetKind === 'companion');
      targetEl.classList.toggle('is-summon', recentTarget && targetKind === 'summon');
      if(targetEl.textContent !== targetText) targetEl.textContent = targetText;
    }

    const de = row.querySelector('.m-debuffs');
    if (!de) continue;
    if (isDead) {
      if (de.dataset.s !== '') { de.innerHTML = ''; de.dataset.s = ''; }
      continue;
    }
    let s = '';
    if (m.slowUntil > now)   s += `<span title="减速:攻速降低">${statusIconHtml('减速', '❄️', 13)}</span>`;
    if (typeof getMonsterDots === 'function') {
      const dots = mainMonsterDots(m, now);
      if (dots.length) {
        const total = dots.reduce((sum, dot) => sum + (dot.dps || 0), 0);
        const names = dots.map(dot => `${dot.icon || '🔥'}${dot.name || '持续伤害'}:${fmt(dot.dps || 0)}/秒`).join(' · ');
        s += `<span title="${names}">${statusIconHtml(dots[0]?.name || '持续伤害', dots[0]?.icon || '🔥', 13)}${dots.length > 1 ? '×' + dots.length : ''}:${fmt(total)}</span>`;
      }
    } else if (m.dot > 0 && m.dotEnd > now) s += `<span title="灼烧/中毒:每秒 ${fmt(m.dot)} 伤害">${statusIconHtml('灼烧/中毒', '🔥', 13)}</span>`;
    if (m.sunderUntil > now) s += `<span title="${m.isBoss ? '易伤:受到伤害提高25%' : '易伤:受到伤害提高18%'}">${statusIconHtml('易伤', '🩸', 13)}</span>`;
    if (m._arcaneShield > 0) s += `<span title="法力护盾:吸收 ${fmt(m._arcaneShield)} 点任意伤害(单次最多75%)">${statusIconHtml('法力护盾', '🔮', 13)}</span>`;
    if (de.dataset.s !== s) { de.innerHTML = s; de.dataset.s = s; }
  }
  if (!skipNonFocus) _lastNonFocusMonPaint = now;
}
function renderAllySummonBar(now){
  const wrap = $('ally-summons'); if(!wrap) return;
  const listEl = $('ally-summon-list');
  const titleEl = $('ally-summon-title');
  const summons = (typeof livingAllySummons === 'function') ? livingAllySummons(now) : [];
  if(!summons.length){
    wrap.style.display = 'none';
    if(listEl) listEl.innerHTML = '';
    if(titleEl) titleEl.textContent = '';
    _allySummonSig = '';
    return;
  }
  wrap.style.display = '';
  if(titleEl) titleEl.textContent = `我方召唤物 ${summons.length}`;
  const sig = summons.map(unit => `${unit._uid}:${unit.baseName}:${unit._ownerName}:${unit.hp > 0 ? 'A' : 'D'}`).join('|');
  if(sig !== _allySummonSig && listEl){
    _allySummonSig = sig;
    listEl.innerHTML = summons.map(unit => {
      const iconHtml = (typeof entityIcon === 'function') ? entityIcon(unit.baseName || unit.name, 18, unit.icon || '🐾') : (unit.icon || '🐾');
      return `<div class="ally-summon-card" data-ally-summon-uid="${unit._uid}">
        <div class="ally-summon-name">${iconHtml}<span>${unit.baseName || unit.name}</span></div>
        <div class="ally-summon-sub">来自 ${unit._ownerName || '我方'} · ${unit._ownerType === 'companion' ? '随从召唤' : '主角召唤'}</div>
        <div class="ally-summon-meta">攻击 ${fmt(unit.atk)} · 防御 ${fmt(unit.def)} · 攻速 ${(unit.spd || 1).toFixed(2)}/秒</div>
        <div class="ally-summon-skill"></div>
        <div class="bar hp"><i></i><span></span></div>
      </div>`;
    }).join('');
    for(const unit of summons){
      const card = listEl.querySelector(`[data-ally-summon-uid="${unit._uid}"]`);
      if(!card) continue;
      bindUnitTip(card, () => allySummonUnitTipHtml(unit));
    }
  }
  if(!listEl) return;
  for(const unit of summons){
    const card = listEl.querySelector(`[data-ally-summon-uid="${unit._uid}"]`);
    if(!card) continue;
    const fill = card.querySelector('.bar > i');
    const txt = card.querySelector('.bar > span');
    const skillEl = card.querySelector('.ally-summon-skill');
    if(fill) fill.style.width = `${Math.max(0, unit.hp / Math.max(1, unit.hpMax) * 100)}%`;
    if(txt) txt.textContent = `${hpWithShieldText(unit.hp, unit.hpMax, 0)} · ${Math.max(0, Math.ceil(((unit.expireAt || now) - now) / 1000))}秒`;
    if(skillEl){
      const skills = Array.isArray(unit._skills) && unit._skills.length ? unit._skills : null;
      const soonest = skills ? skills.reduce((best, skill) => ((skill.readyAt || 0) < (best.readyAt || 0) ? skill : best), skills[0]) : null;
      const nextSkill = soonest || (skills && skills[0]) || null;
      const cdLeft = Math.max(0, Math.ceil((((nextSkill && nextSkill.readyAt) || unit._skillReadyAt || 0) - now) / 1000));
      skillEl.textContent = `下一个释放 ${(nextSkill && nextSkill.icon) || unit._skillIcon || '✨'} ${(nextSkill && nextSkill.name) || unit._skillName || '协同猛袭'} - ${cdLeft}秒`;
    }
  }
}
/* ---------- 伤害统计(战斗日志下方) ---------- */
function updateDmgMeter() {
  const heroDmg = (typeof dmgStats !== 'undefined') ? (dmgStats.hero || 0) : 0;
  const compDmg = (typeof dmgStats !== 'undefined') ? (dmgStats.comp || 0) : 0;
  const total = heroDmg + compDmg;
  const heroHeal = (typeof dmgStats !== 'undefined') ? (dmgStats.heroHeal || 0) : 0;
  const compHeal = (typeof dmgStats !== 'undefined') ? (dmgStats.compHeal || 0) : 0;
  const healTotal = heroHeal + compHeal;
  const elapsed = (typeof dmgStats !== 'undefined' && dmgStats.start)
    ? Math.max(0.001, ((dmgStats.last || dmgStats.start) - dmgStats.start) / 1000)
    : 0.001;
  const dps = Math.round(total / elapsed);

  // 峰值秒伤:按面板刷新间隔采样瞬时秒伤,取历史最大(峰值随 dmgStats 一起重置)
  if (typeof dmgStats !== 'undefined') {
    const nowTs = Date.now();
    if (total < _dmSampleTotal) { _dmSampleTotal = total; _dmSampleTs = nowTs; } // 统计被重置→基线归零
    else if (_dmSampleTs && nowTs > _dmSampleTs) {
      const dt = (nowTs - _dmSampleTs) / 1000;
      if (dt >= 0.15) {
        const inst = (total - _dmSampleTotal) / dt;
        if (inst > (dmgStats.peakDps || 0)) dmgStats.peakDps = inst;
        _dmSampleTotal = total; _dmSampleTs = nowTs;
      }
    } else { _dmSampleTotal = total; _dmSampleTs = nowTs; }
  }

  // 秒伤 文本
  const dpsEl = $('dm-dps');
  if (dpsEl) {
    const trend = dmgMeterTrendMeta(dps, total);
    dpsEl.className = 'dm-dps trend-' + trend.dir;
    dpsEl.textContent = trend.icon ? `秒伤 ${fmt(dps)} ${trend.icon}${trend.label ? ' ' + trend.label : ''}` : '秒伤 ' + fmt(dps);
    dpsEl.title = `当前秒伤 ${fmt(dps)}。${trend.title}`;
  }
  updateDmgRecentSkills();
  updateCombatReactionAdvice();
  updateDmgBossCastReadout();

  // 英雄条
  const heroBar = $('dm-hero-bar');
  const heroVal = $('dm-hero-val');
  if (heroBar && total > 0) heroBar.style.width = (heroDmg / total * 100) + '%';
  else if (heroBar) heroBar.style.width = '0%';
  if (heroVal) heroVal.textContent = fmt(heroDmg);

  // 随从条
  const compBar = $('dm-comp-bar');
  const compVal = $('dm-comp-val');
  if (compBar && total > 0) compBar.style.width = (compDmg / total * 100) + '%';
  else if (compBar) compBar.style.width = '0%';
  if (compVal) compVal.textContent = fmt(compDmg);

  // 总计 + 时间
  const totalEl = $('dm-total');

  // 最高伤害
  const maxEl = $('dm-max-hit');
  if (maxEl) {
    const hm = (typeof dmgStats !== 'undefined') ? (dmgStats.heroMax || 0) : 0;
    const cm = (typeof dmgStats !== 'undefined') ? (dmgStats.compMax || 0) : 0;
    if (hm || cm) {
      const top = Math.max(hm, cm);
      const who = hm >= cm ? '主角' : '随从';
      maxEl.textContent = `${who} ${fmt(top)}`;
      maxEl.title = `主角最高一击 ${fmt(hm)}。随从最高一击 ${fmt(cm)}。`;
    } else {
      maxEl.textContent = '-';
      maxEl.removeAttribute('title');
    }
  }
  updateDmgTopSkill(total);
  const healEl = $('dm-heal-total');
  if (healEl) {
    if (heroHeal || compHeal) {
      const hps = Math.round(healTotal / elapsed);
      healEl.textContent = `${fmt(healTotal)}(${fmt(hps)}/秒)`;
      healEl.title = `主角治疗 ${fmt(heroHeal)}。随从治疗 ${fmt(compHeal)}。`;
    } else {
      healEl.textContent = '-';
      healEl.removeAttribute('title');
    }
  }
  const maxHealEl = $('dm-max-heal');
  if (maxHealEl) {
    const hm = (typeof dmgStats !== 'undefined') ? (dmgStats.heroHealMax || 0) : 0;
    const cm = (typeof dmgStats !== 'undefined') ? (dmgStats.compHealMax || 0) : 0;
    if (hm || cm) {
      const top = Math.max(hm, cm);
      const who = hm >= cm ? '主角' : '随从';
      maxHealEl.textContent = `${who} ${fmt(top)}`;
      maxHealEl.title = `主角最高治疗 ${fmt(hm)}。随从最高治疗 ${fmt(cm)}。`;
    } else {
      maxHealEl.textContent = '-';
      maxHealEl.removeAttribute('title');
    }
  }
  updateDmgLastHeal();
  updateDmgLastShield();
  const shieldTotalEl = $('dm-shield-total');
  if (shieldTotalEl) {
    const heroShield = (typeof dmgStats !== 'undefined') ? (dmgStats.heroShield || 0) : 0;
    const compShield = (typeof dmgStats !== 'undefined') ? (dmgStats.compShield || 0) : 0;
    const shieldTotal = heroShield + compShield;
    if (shieldTotal > 0) {
      const sps = Math.round(shieldTotal / elapsed);
      shieldTotalEl.className = 'dm-shield-total active';
      shieldTotalEl.textContent = `${fmt(shieldTotal)}(${fmt(sps)}/秒)`;
      shieldTotalEl.title = `主角护盾 ${fmt(heroShield)}。随从护盾 ${fmt(compShield)}。`;
    } else {
      shieldTotalEl.className = 'dm-shield-total';
      shieldTotalEl.textContent = '-';
      shieldTotalEl.removeAttribute('title');
    }
  }

  // 暴击率
  const critEl = $('dm-crit-rate');
  if (critEl) {
    const hc = (typeof dmgStats !== 'undefined') ? (dmgStats.heroCrits || 0) : 0;
    const cc = (typeof dmgStats !== 'undefined') ? (dmgStats.compCrits || 0) : 0;
    const hh = (typeof dmgStats !== 'undefined') ? (dmgStats.heroHits || 0) : 0;
    const ch = (typeof dmgStats !== 'undefined') ? (dmgStats.compHits || 0) : 0;
    const hRate = hh > 0 ? Math.round(hc / hh * 100) : 0;
    const cRate = ch > 0 ? Math.round(cc / ch * 100) : 0;
    const hits = hh + ch;
    const crits = hc + cc;
    if (hits) {
      const rate = Math.round(crits / hits * 100);
      critEl.textContent = `总体 ${rate}%`;
      critEl.title = `主角暴击 ${hc}/${hh} (${hRate}%)。随从暴击 ${cc}/${ch} (${cRate}%)。`;
    } else {
      critEl.textContent = '-';
      critEl.removeAttribute('title');
    }
  }

  // 击杀数
  const killsEl = $('dm-kills');
  if (killsEl) {
    const k = (typeof dmgStats !== 'undefined') ? (dmgStats.kills || 0) : 0;
    killsEl.textContent = String(k);
  }
  const streakEl = $('dm-streak');
  if (streakEl) {
    const streak = (typeof killStreak === 'number') ? killStreak : 0;
    const fast = (typeof dmgStats !== 'undefined') ? (dmgStats.killFast || 0) : 0;
    const slow = (typeof dmgStats !== 'undefined') ? (dmgStats.killSlow || 0) : 0;
    const lastKillAt = (typeof dmgStats !== 'undefined') ? (dmgStats.killTs || 0) : 0;
    const ago = lastKillAt ? Math.max(0, (Date.now() - lastKillAt) / 1000) : 0;
    const cls = streak >= 20 ? 'legend' : streak >= 10 ? 'hot' : streak >= 5 ? 'warm' : streak > 0 ? 'active' : 'idle';
    const text = streak > 0
      ? `${streak}连 · 最近${ago.toFixed(1)}s`
      : '-';
    streakEl.className = `dm-streak ${cls}`;
    streakEl.textContent = text;
    if (streak > 0) {
      streakEl.title = `当前连杀 ${streak}。最快击杀 ${fast ? fast.toFixed(1) + ' 秒' : '暂无'},最慢间隔 ${slow ? slow.toFixed(1) + ' 秒' : '暂无'}。死亡或重置统计会清空连杀。`;
    } else {
      streakEl.removeAttribute('title');
    }
  }

  // 峰值秒伤
  const peakEl = $('dm-peak-dps');
  if (peakEl) {
    const pk = (typeof dmgStats !== 'undefined') ? Math.round(dmgStats.peakDps || 0) : 0;
    if (pk) {
      peakEl.textContent = fmt(pk);
      peakEl.title = `峰值秒伤 ${fmt(pk)}。当前秒伤 ${fmt(dps)}。统计时间 ${Math.floor(elapsed)} 秒。`;
    } else {
      peakEl.textContent = '-';
      peakEl.removeAttribute('title');
    }
  }

  // 承受伤害(总 · 每秒 · 最高一次)
  const takenEl = $('dm-taken');
  const tk = (typeof dmgStats !== 'undefined') ? (dmgStats.taken || 0) : 0;
  const tkMax = (typeof dmgStats !== 'undefined') ? (dmgStats.takenMax || 0) : 0;
  const compTk = (typeof dmgStats !== 'undefined') ? (dmgStats.compTaken || 0) : 0;
  const compTkMax = (typeof dmgStats !== 'undefined') ? (dmgStats.compTakenMax || 0) : 0;
  const dtps = tk ? Math.round(tk / elapsed) : 0;
  const compDtps = compTk ? Math.round(compTk / elapsed) : 0;
  if (takenEl) {
    if (tk || compTk) {
      const compText = compTk ? ` · 🐾${fmt(compTk)}(${fmt(compDtps)}/秒)` : '';
      takenEl.textContent = `🦸${fmt(tk)}(${fmt(dtps)}/秒)${compText}`;
      takenEl.title = `主角承伤 ${fmt(tk)}, 每秒 ${fmt(dtps)}, 最高一击 ${fmt(tkMax)}。随从承伤 ${fmt(compTk)}, 每秒 ${fmt(compDtps)}, 最高一击 ${fmt(compTkMax)}。`;
    } else {
      takenEl.textContent = '-';
      takenEl.removeAttribute('title');
    }
  }
  updateDmgLastHit();

  // 战斗压力:把承伤、治疗和血量换成可读状态,帮助判断卡关原因
  const pressureEl = $('dm-pressure');
  if (pressureEl) {
    const hMax = Math.max(1, state?.hero?.hpMax || 1);
    const hpNow = Math.max(0, state?.hp || 0);
    const compStats = (typeof computeCompanionStats === 'function') ? computeCompanionStats() : null;
    const compMax = Math.max(1, compStats?.hpMax || 1);
    const compHpKnown = state?._compHp != null;
    const compHp = Math.max(0, state?._compHp || 0);
    const compAlive = !!compStats && compHpKnown && !(typeof compDowned === 'function' && compDowned());
    const healPerSec = healTotal > 0 ? Math.round(healTotal / elapsed) : 0;
    const netPerSec = Math.max(0, dtps - healPerSec);
    const compHealPerSec = compHeal > 0 ? Math.round(compHeal / elapsed) : 0;
    const compNetPerSec = Math.max(0, compDtps - compHealPerSec);
    const takenPct = dtps / hMax;
    const netPct = netPerSec / hMax;
    const compNetPct = compNetPerSec / compMax;
    const compHpPct = compAlive ? compHp / compMax : 1;
    let cls = 'safe', label = '安全', hint = tk ? '承伤很低' : '暂无压力';
    if (compAlive && (compHpPct < 0.30 || compNetPct > 0.055)) {
      cls = 'danger'; label = '护卫告急'; hint = compHpPct < 0.30 ? '随从濒危' : '随从承压';
    } else if (compAlive && (compHpPct < 0.55 || compNetPct > 0.030)) {
      cls = 'warn'; label = '护卫吃紧'; hint = compHpPct < 0.55 ? '随从低血' : '随从承压';
    } else if (tk) {
      if (netPerSec <= 0 && hpNow > hMax * 0.55) {
        cls = 'safe'; label = '稳定'; hint = '治疗覆盖';
      } else if (netPct <= 0.015 && takenPct <= 0.045) {
        cls = 'ok'; label = '可控'; hint = '压力可控';
      } else if (netPct <= 0.04 && hpNow > hMax * 0.35) {
        cls = 'warn'; label = '吃紧'; hint = '需要减伤';
      } else {
        cls = 'danger'; label = '危险'; hint = '容易暴毙';
      }
    }
    const surviveText = netPerSec > 0 ? `可撑 ${Math.max(1, Math.min(120, Math.floor(hpNow / netPerSec)))}秒${hpNow / netPerSec > 120 ? '+' : ''}` : '净压力0';
    const compShort = compAlive && (compTk || compHpPct < 0.95) ? ` · 随${fmt(compNetPerSec)}/秒` : '';
    const text = `${label} · 主${fmt(netPerSec)}/秒${compShort} · ${surviveText}`;
    const detail = `压力判断: ${hint}。主角承伤 ${fmt(dtps)}/秒,治疗 ${fmt(healPerSec)}/秒,净压力 ${fmt(netPerSec)}/秒。${compAlive ? `随从承伤 ${fmt(compDtps)}/秒,治疗 ${fmt(compHealPerSec)}/秒,净压力 ${fmt(compNetPerSec)}/秒。` : ''}`;
    pressureEl.className = `dm-pressure ${cls}`;
    pressureEl.title = detail;
    if (pressureEl.textContent !== text) pressureEl.textContent = text;
  }

  // 上次死亡回放:保留在面板中,避免日志滚动后丢失失败原因
  const deathRow = $('dm-death-row');
  const deathEl = $('dm-death-recap');
  if (deathRow && deathEl) {
    const recap = state?.lastDeathRecap;
    if (recap?.at) {
      deathRow.style.display = '';
      const agoSec = Math.max(0, Math.floor((Date.now() - recap.at) / 1000));
      const ago = agoSec < 60 ? `${agoSec}秒前` : `${Math.floor(agoSec / 60)}分钟前`;
      const lastHit = fmt(recap.lastHit || 0);
      const source = recap.source || '未知来源';
      const text = `${recap.cause || '战败'} · ${ago} · 最后一击 ${lastHit}`;
      const detail = recap.detail || `${text} · 来自 ${source}。建议: ${recap.advice || '调整技能和随从后再战。'}`;
      deathEl.className = `dm-death-recap ${recap.tone || 'warn'}`;
      deathEl.title = detail;
      if (deathEl.textContent !== text) deathEl.textContent = text;
    } else {
      deathRow.style.display = 'none';
      deathEl.textContent = '-';
      deathEl.removeAttribute('title');
    }
  }

  // 击杀耗时(平均 · 最快)
  const ttkEl = $('dm-ttk');
  if (ttkEl) {
    const k = (typeof dmgStats !== 'undefined') ? (dmgStats.kills || 0) : 0;
    const fast = (typeof dmgStats !== 'undefined') ? (dmgStats.killFast || 0) : 0;
    if (k >= 1 && elapsed > 0.2) {
      const avg = elapsed / k;
      ttkEl.textContent = `均${avg.toFixed(1)}s` + (fast ? ` · 快${fast.toFixed(1)}s` : '');
      ttkEl.title = `已统计 ${k} 次击杀,总战斗时间 ${Math.floor(elapsed)} 秒。平均击杀耗时 ${avg.toFixed(1)} 秒${fast ? `,最快 ${fast.toFixed(1)} 秒` : ''}。`;
    } else {
      ttkEl.textContent = '-';
      ttkEl.removeAttribute('title');
    }
  }

  function syncMeterBreakdownRows(container, rows, valueKey, accentColor, fallbackIcon, title) {
    if (!container) return;
    let titleEl = container.querySelector('.meter-breakdown-title');
    if (!titleEl) {
      titleEl = document.createElement('div');
      titleEl.className = 'meter-breakdown-title';
      container.insertBefore(titleEl, container.firstChild);
    }
    const titleText = title ? `${title} · 前${Math.min(5, rows.length || 0)}` : '';
    if (titleEl.textContent !== titleText) titleEl.textContent = titleText;
    const desiredKeys = rows.map(r => `${r.src}|${r.name}`);
    const existing = new Map(Array.from(container.querySelectorAll('[data-meter-key]')).map(el => [el.dataset.meterKey, el]));
    const fragment = document.createDocumentFragment();
    for (const row of rows) {
      const key = `${row.src}|${row.name}`;
      let el = existing.get(key);
      if (!el) {
        el = document.createElement('div');
        el.dataset.meterKey = key;
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.gap = '4px';
        el.style.fontSize = '10px';
        el.style.marginBottom = '2px';
        const iconHtml = (typeof skillIcon === 'function') ? skillIcon(row.name, 13, fallbackIcon) : '';
        el.innerHTML = `
          <span class="meter-src" style="width:14px;flex-shrink:0"></span>
          <span class="meter-icon" style="width:14px;flex-shrink:0">${iconHtml}</span>
          <span class="meter-name" style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></span>
          <span class="meter-val" style="width:52px;text-align:right;flex-shrink:0;font-variant-numeric:tabular-nums"></span>
          <span style="width:36px;flex-shrink:0;background:var(--panel);height:6px;border-radius:3px;overflow:hidden"><i class="meter-bar" style="display:block;height:100%;width:0%;border-radius:3px"></i></span>`;
      }
      fragment.appendChild(el);
      existing.delete(key);
    }
    existing.forEach(el => el.remove());
    container.appendChild(fragment);
    if (!rows.length) {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'block';
    const maxVal = rows[0]?.[valueKey] || 0;
    rows.forEach((row, index) => {
      const key = `${row.src}|${row.name}`;
      const el = Array.from(container.querySelectorAll('[data-meter-key]')).find(node => node.dataset.meterKey === key) || container.querySelectorAll('[data-meter-key]')[index];
      if (!el || el.dataset.meterKey !== key) return;
      const pct = maxVal > 0 ? Math.round((row[valueKey] || 0) / maxVal * 100) : 0;
      const srcEl = el.querySelector('.meter-src');
      const nameEl = el.querySelector('.meter-name');
      const valEl = el.querySelector('.meter-val');
      const barEl = el.querySelector('.meter-bar');
      if (srcEl && srcEl.textContent !== row.src) srcEl.textContent = row.src;
      if (nameEl && nameEl.textContent !== row.name) nameEl.textContent = row.name;
      const valText = fmt(row[valueKey] || 0);
      if (valEl) {
        if (valEl.textContent !== valText) valEl.textContent = valText;
        if (accentColor && valEl.style.color !== accentColor) valEl.style.color = accentColor;
      }
      if (barEl) {
        const width = `${pct}%`;
        if (barEl.style.width !== width) barEl.style.width = width;
        const primary = accentColor || '#6366f1';
        const secondary = accentColor === '#6ee7b7' ? '#a7f3d0' : '#a78bfa';
        const bg = `linear-gradient(90deg,${primary},${secondary})`;
        if (barEl.style.background !== bg) barEl.style.background = bg;
      }
    });
  }

  let damageBreakdownCount = 0;
  let healBreakdownCount = 0;
  let takenBreakdownCount = 0;

  // 技能伤害分解(结构稳定,仅更新数值/进度,避免图标闪烁)
  const sdEl = $('dm-skills-breakdown');
  if (sdEl) {
    const hs = (typeof dmgStats !== 'undefined' && dmgStats.heroSkills) ? dmgStats.heroSkills : {};
    const cs = (typeof dmgStats !== 'undefined' && dmgStats.compSkills) ? dmgStats.compSkills : {};
    const allSkills = [];
    for (const [name, dmg] of Object.entries(hs)) allSkills.push({ name, dmg, src: '🦸' });
    for (const [name, dmg] of Object.entries(cs)) allSkills.push({ name, dmg, src: '🐾' });
    allSkills.sort((a, b) => b.dmg - a.dmg);
    const top = allSkills.slice(0, 5);
    damageBreakdownCount = top.length;
    syncMeterBreakdownRows(sdEl, top, 'dmg', '', 'spell_holy_powerinfusion', '伤害来源');
  }
  const shEl = $('dm-heal-breakdown');
  if (shEl) {
    const hs = (typeof dmgStats !== 'undefined' && dmgStats.heroHealSkills) ? dmgStats.heroHealSkills : {};
    const cs = (typeof dmgStats !== 'undefined' && dmgStats.compHealSkills) ? dmgStats.compHealSkills : {};
    const allSkills = [];
    for (const [name, heal] of Object.entries(hs)) allSkills.push({ name, heal, src: '🦸' });
    for (const [name, heal] of Object.entries(cs)) allSkills.push({ name, heal, src: '🐾' });
    allSkills.sort((a, b) => b.heal - a.heal);
    const top = allSkills.slice(0, 5);
    healBreakdownCount = top.length;
    syncMeterBreakdownRows(shEl, top, 'heal', '#6ee7b7', 'spell_holy_heal', '治疗来源');
  }
  const stEl = $('dm-taken-breakdown');
  if (stEl) {
    const hs = (typeof dmgStats !== 'undefined' && dmgStats.takenSources) ? dmgStats.takenSources : {};
    const cs = (typeof dmgStats !== 'undefined' && dmgStats.compTakenSources) ? dmgStats.compTakenSources : {};
    const allSources = [];
    for (const [name, taken] of Object.entries(hs)) allSources.push({ name, taken, src: '🦸' });
    for (const [name, taken] of Object.entries(cs)) allSources.push({ name, taken, src: '🐾' });
    allSources.sort((a, b) => b.taken - a.taken);
    const top = allSources.slice(0, 5);
    takenBreakdownCount = top.length;
    syncMeterBreakdownRows(stEl, top, 'taken', '#fb7185', 'ability_warrior_decisivestrike', '承伤来源');
  }
  const detailSummary = $('dm-detail-summary');
  if (detailSummary) {
    const parts = [];
    if (damageBreakdownCount) parts.push(`伤害${damageBreakdownCount}`);
    if (healBreakdownCount) parts.push(`治疗${healBreakdownCount}`);
    if (takenBreakdownCount) parts.push(`承伤${takenBreakdownCount}`);
    const text = parts.length ? `来源明细 · ${parts.join(' / ')}` : '来源明细 · 暂无';
    if (detailSummary.textContent !== text) detailSummary.textContent = text;
  }
  if (totalEl) {
    const kills = (typeof dmgStats !== 'undefined') ? (dmgStats.kills || 0) : 0;
    const seconds = Math.floor(elapsed);
    const text = `总${fmt(total)} · ${seconds}s · 击杀${kills}`;
    totalEl.textContent = text;
    totalEl.title = `总伤害 ${fmt(total)}。总治疗 ${fmt(healTotal)}。统计时间 ${seconds} 秒。`;
  }
}

function updateBattleVisuals() {
  if (!state.cls) return;
  const c = getCls();
  const h = state.hero;
  const now = Date.now();

  // 残血暗角:生命 <25% 时给战斗区加红色脉冲暗角
  const _st = $('stage');
  if (_st) {
    const _ratio = (h && h.hpMax > 0) ? state.hp / h.hpMax : 1;
    _st.classList.toggle('low-hp', _ratio > 0 && _ratio < 0.25);
  }

  // 头部 stats(签名缓存, 避免每帧 innerHTML)
  const race = RACES[state.race];
  const cls = getCls();
  const accountTitle = (typeof account!=='undefined' && account?.title) || '';
  const curTitle = accountTitle || state.title || '';
  const progLvl = (typeof playerProgressLevel === 'function') ? playerProgressLevel() : state.hero.lvl;
  const hNameSig = `${state.name}|${curTitle}|${state.cls}|${state.hero.lvl}|${progLvl}`;
  if (_hNameLastSig !== hNameSig) {
    _hNameLastSig = hNameSig;
    const titleHtml = curTitle ? `<span class="pill" style="background:var(--gold);color:#000;font-weight:bold" title="成就称号">${curTitle}</span> ` : '';
    const heroChip = (typeof uiIcon === 'function') ? uiIcon('hero', 'xs', '角色') : (race?.icon || '👤');
    const progHtml = progLvl > state.hero.lvl ? `<span class="pill" style="background:rgba(125,211,252,.18);color:#7dd3fc">终局${progLvl}</span>` : '';
    $('h-name').innerHTML = `${heroChip} <b>${state.name||'冒险者'}</b> ${titleHtml}<span class="pill">${classIcon(state.cls, 16, cls?.icon||'')} 等级${state.hero.lvl}</span>${progHtml}`;
  }
  $('h-name').title = '点击切换角色';
  setHeaderResourceText('h-gold', 'gold', state.gold);
  setHeaderResourceText('h-gem', 'gem', state.gem);
  setHeaderResourceText('h-tickets', 'tickets', state.tickets || 0);
  setHeaderResourceText('h-comp-tickets', 'compTickets', state.compTickets || 0);
  setHeaderResourceText('h-honor', 'honor', state.honor);
  setHeaderResourceText('h-towercoin', 'towerCoin', state.towerCoin || 0);
  setHeaderResourceText('h-essence', 'essence', state.essence || 0);
  if ($('btn-speed')) {
    const bs = state.battleSpeed || 1;
    const lbl = `⏩ ${bs}倍`;
    const title = `战斗倍速 ${bs}倍: 同步加速普攻、读条、技能冷却和找怪节奏。`;
    if ($('btn-speed').textContent !== lbl) $('btn-speed').textContent = lbl;
    if ($('btn-speed').title !== title) $('btn-speed').title = title;
    $('btn-speed').classList.toggle('gold', bs > 1);
  }

  // XP / HP / 资源条
  setBar($('b-xp'), h.lvl >= MAX_LEVEL ? 100 : h.xp / xpNeeded(h.lvl) * 100,
    h.lvl >= MAX_LEVEL ? '已满' : `${fmt(h.xp)}/${fmt(xpNeeded(h.lvl))}`);
  const heroShield = Math.max(0, state?.talentState?.shield || 0);
  setBar($('b-hp'), state.hp/h.hpMax*100, hpWithShieldText(state.hp, h.hpMax, heroShield));
  setBar($('b-hp2'), state.hp/h.hpMax*100, hpWithShieldText(state.hp, h.hpMax, heroShield));
  setBar($('b-mp'), state.resource/state.resourceMax*100,
    `${c.resource} ${fmt(state.resource)}/${fmt(state.resourceMax)}`);

  // 怪物信息(竖排敌人列表)
  const monPaintGap = isMobileLayout() ? 120 : 80;
  if (now - _lastMonListPaint >= monPaintGap || isDirty('stage')) {
    renderMonList();
    _lastMonListPaint = now;
  }

  // 等级、英雄表情
  $('s-lvl').textContent = h.lvl;
  $('hero-lvl-tag').textContent = h.lvl;
  // 战斗头像:用当前专精图标,未选专精回退职业 emoji(每帧调用,故按签名缓存,避免重建 <img> 闪烁)
  const heEl = $('hero-emoji');
  const avKey = state.specialization ? (state.cls + ':' + state.specialization) : ('emoji:' + state.cls);
  if (heEl.dataset.av !== avKey) {
    heEl.dataset.av = avKey;
    heEl.innerHTML = state.specialization
      ? specIcon(state.cls, state.specialization, 56, c.icon)
      : classIcon(state.cls, 56, c.icon);
  }

  // 关卡信息(签名缓存, 避免每帧重建 DOM)
  const zoneSig = (() => {
    const base = `${state.mode}|${state.currentMap}|${state.currentSubzone}`;
    if (state.mode === 'world') {
      const sk = `${state.currentMap}-${state.currentSubzone}`;
      const searchLeft = state.worldSearch?.until ? Math.max(0, Math.ceil((state.worldSearch.until - Date.now()) / 1000)) : 0;
      const map = (typeof getMap === 'function') ? getMap() : null;
      const op = (map && typeof getWorldFieldOperation === 'function') ? getWorldFieldOperation(map, state.currentSubzone, { includeCompleted:true }) : null;
      const fieldFailLeft = (op && typeof worldFieldOperationFailLeftMs === 'function') ? Math.ceil(worldFieldOperationFailLeftMs(op) / 1000) : 0;
      return base + `|${state.subzoneKills[sk]||0}|${state.subzoneCleared[sk]||''}|search:${searchLeft}|fieldFail:${fieldFailLeft}`;
    }
    if (state.mode === 'dungeon') {
      const ds = state.dungeonState || {};
      const roomSig = (ds.combatRooms || []).map(r => r.key).join(',');
      const edictSig = (ds.edicts || []).map(e => e.key).join(',');
      const timerSig = ds.timer ? `${ds.timer.expired ? 1 : 0}:${ds.timer.overtimeStacks || 0}:${ds.timer.overtimePulses || 0}` : '';
      return base + `|${ds.wave}|${ds.key}|${ds.alertLevel || 0}|${roomSig}|${edictSig}|${timerSig}`;
    }
    if (state.mode === 'mythic') return base + `|${state.mythicState?.wave}|${state.mythicState?.key}|${state.mythicState?.level}`;
    if (state.mode === 'tower') return base + `|${state.towerState?.floor}|${state.towerState?.coinThisRun}`;
    if (state.mode === 'boss') return base;
    if (state.mode === 'travel') return base + `|${state.travel?.mapKey}`;
    return base;
  })();
  if (_lastZoneSig !== zoneSig) {
    _lastZoneSig = zoneSig;
  if (state.mode === 'travel') {
    const t = state.travel;
    const map = MAPS.find(m => m.key === (t && t.mapKey));
    const travelIconHtml = (typeof uiIcon === 'function') ? uiIcon('travel', 'sm', '旅行') : '🐴';
    const mapIconHtml = map ? symbolIconHtml(map.icon, 16, map.name, 'inv_misc_map_01') : '';
    $('h-zone').innerHTML = `${travelIconHtml} 旅行中...`;
    $('zone-name').innerHTML = `${travelIconHtml} 前往 ${map ? `${mapIconHtml} ${map.name}` : '...'}`;
    $('progress-text').innerHTML = `<b>正在骑马赶路...</b>`;
  } else if (state.mode === 'world') {
    const map = getMap();
    const sub = map.sub[state.currentSubzone];
    const mapIconHtml = symbolIconHtml(map.icon, 16, map.name, 'inv_misc_map_01');
    if (!sub) { $('h-zone').innerHTML = `${mapIconHtml} ${map.name}`; $('zone-name').innerHTML = `${mapIconHtml} ${map.name}`; $('progress-text').innerHTML = ''; }
    else {
      const subKey = `${state.currentMap}-${state.currentSubzone}`;
      const subKills = state.subzoneKills[subKey] || 0;
      const cleared = state.subzoneCleared[subKey];
      const threatTags = worldZoneThreatTagsHtml(map, sub);
      const fieldOpTag = worldFieldOperationTagHtml(map, state.currentSubzone, { metaVisible:true });
      const renownTag = worldRenownTagHtml(map, { metaVisible:true });
      const searchLeft = state.worldSearch?.until ? Math.max(0, Math.ceil((state.worldSearch.until - Date.now()) / 1000)) : 0;
      const searchTag = searchLeft > 0 ? ` · 🔎 寻找目标 <b>${searchLeft}</b>秒` : '';
      $('h-zone').innerHTML = `${mapIconHtml} ${map.name} · ${sub.name}`;
      $('zone-name').innerHTML = `${mapIconHtml} ${map.name} · ${sub.name} (等级${sub.lvl[0]}-${sub.lvl[1]})`;
      $('progress-text').innerHTML = `探索进度 <b>${Math.min(subKills,50)}</b> / 50 ${cleared?'✅':''}${searchTag}${renownTag ? ` · ${renownTag}` : ''}${fieldOpTag ? ` · ${fieldOpTag}` : ''}${threatTags ? ` · ${threatTags}` : ''}`;
      bindInlineTipElements($('progress-text'));
    }
  } else if (state.mode === 'boss') {
    const map = getMap();
    const mapIconHtml = symbolIconHtml(map.icon, 16, map.name, 'inv_misc_map_01');
    const bossBattleIconHtml = statusIconHtml('首领战', '⚔️', 16);
    const threatTags = worldZoneThreatTagsHtml(map, map.sub?.[state.currentSubzone] || map.sub?.[0], { boss:true, count:2 });
    $('h-zone').innerHTML = `${mapIconHtml} ${map.name} · ${bossBattleIconHtml}首领战`;
    $('zone-name').innerHTML = `${bossBattleIconHtml} ${mapIconHtml} ${map.name} · 首领战`;
    $('progress-text').innerHTML = `<b>${map.boss.name}</b>${threatTags ? ` · ${threatTags}` : ''}`;
    bindInlineTipElements($('progress-text'));
  } else if (state.mode === 'dungeon') {
    const dg = DUNGEONS.find(d => d.key === state.dungeonState.key);
    if (!dg) return;
    const bossList = dg.bosses || [];
    const killedBosses = bossList.filter(b => b.wave < state.dungeonState.wave).length;
    const curBoss = bossList.find(b => b.wave === state.dungeonState.wave);
    const isRaid = dg.type === 'raid';
    const typeTag = isRaid ? '<span style=\"color:#fbbf24\">[团本]</span>' : '<span style=\"color:#6ee7b7\">[5人本]</span>';
    const dungeonIconHtml = (typeof dungeonIcon === 'function') ? dungeonIcon(dg.key, dg.name, 16, dg.icon) : dg.icon;
    const contract = (state.dungeonState.contractLevel > 0 && typeof dungeonContractInfo === 'function') ? dungeonContractInfo(state.dungeonState.contractLevel) : null;
    const alert = (typeof dungeonAlertInfo === 'function') ? dungeonAlertInfo(state.dungeonState) : null;
    const timerStatus = (typeof dungeonTimerStatus === 'function') ? dungeonTimerStatus(state.dungeonState) : null;
    const mechanicTags = dungeonProgressMechanicTags(state.dungeonState, contract, alert, timerStatus);
    const councilMembers = curBoss && typeof getDungeonBossCouncilMembers === 'function' ? getDungeonBossCouncilMembers(curBoss) : [];
    const liveCouncil = councilMembers.length > 1 ? (state.currentMonsters || []).filter(m => m && m.hp > 0 && m._councilGroupName === curBoss.name).length : 0;
    const councilTag = liveCouncil ? ` · <span style="color:#fcd34d">👥${liveCouncil}/${councilMembers.length}</span>` : '';
    $('h-zone').innerHTML = `${dungeonIconHtml} ${dg.name}`;
    $('zone-name').innerHTML = `${dungeonIconHtml} ${dg.name} ${typeTag}${contractTag}`;
    let bossExtra = '';
    if (curBoss?.passive) {
      const p = curBoss.passive;
      const tags = [];
      if (p.dodgeChance) tags.push(`${statusIconHtml('闪避', '💨', 12)}闪避+${p.dodgeChance*100}%`);
      if (p.critChance) tags.push(`${statusIconHtml('暴击', '💥', 12)}暴击+${p.critChance*100}%`);
      if (p.dmgReduction) tags.push(`${statusIconHtml('减伤', '🛡️', 12)}减伤+${p.dmgReduction*100}%`);
      if (p.atkBonus) tags.push(`${statusIconHtml('攻击', '⚔️', 12)}攻击+${p.atkBonus*100}%`);
      if (tags.length) bossExtra += ' <span style=\"font-size:10px;color:#6ee7b7\">'+tags.join(' ')+'</span>';
    }
    const bossTag = curBoss ? ` ⚔️<b style=\"color:var(--legend)\">${curBoss.name}</b>${bossExtra}` : '';
    $('progress-text').innerHTML = `波次 ${state.dungeonState.wave}/${dg.waves} · 首领 ${killedBosses}/${bossList.length}${bossTag}${councilTag}${mechanicTags ? ` · ${mechanicTags}` : ''}`;
    bindInlineTipElements($('progress-text'));
  } else if (state.mode === 'mythic') {
    const ms = state.mythicState;
    const dg = DUNGEONS.find(d => d.key === ms.key);
    if (!dg) return;
    const bossList = dg.bosses || [];
    const killedBosses = bossList.filter(b => b.wave < ms.wave).length;
    const curBoss = bossList.find(b => b.wave === ms.wave);
    let bossExtra = '';
    if (curBoss?.passive) {
      const p = curBoss.passive;
      const tags = [];
      if (p.dodgeChance) tags.push(`${statusIconHtml('闪避', '💨', 12)}闪避+${p.dodgeChance*100}%`);
      if (p.critChance) tags.push(`${statusIconHtml('暴击', '💥', 12)}暴击+${p.critChance*100}%`);
      if (p.dmgReduction) tags.push(`${statusIconHtml('减伤', '🛡️', 12)}减伤+${p.dmgReduction*100}%`);
      if (p.atkBonus) tags.push(`${statusIconHtml('攻击', '⚔️', 12)}攻击+${p.atkBonus*100}%`);
      if (tags.length) bossExtra += ' <span style=\"font-size:10px;color:#6ee7b7\">'+tags.join(' ')+'</span>';
    }
    const bossTag = curBoss ? ` ⚔️<b style="color:var(--legend)">${curBoss.name}</b>${bossExtra}` : '';
    const affixStr = (ms.affixes && ms.affixes.length > 0)
      ? ' '+ms.affixes.map(a => `<span style="background:rgba(239,68,68,0.12);color:#f87171;padding:0 4px;border-radius:3px;font-size:10px;margin:0 1px;cursor:help"
        onmouseenter="showAffixTip(event,'${a.name}','${a.desc}')"
        onmouseleave="hideAffixTip()">${symbolIconHtml(a.icon, 12, a.name, 'spell_holy_powerinfusion')}</span>`).join('')
      : '';
    const mythicIconHtml = (typeof uiIcon === 'function') ? uiIcon('ascend', 'sm', '大秘境') : '🌟';
    $('h-zone').innerHTML = `${mythicIconHtml} 大秘境 +${ms.level||state.mythicLevel}`;
    $('zone-name').innerHTML = `${mythicIconHtml} 大秘境 +${ms.level||state.mythicLevel} · ${dg.name}${affixStr}`;
    $('progress-text').innerHTML = `波次 ${ms.wave}/${dg.waves} · 首领 ${killedBosses}/${bossList.length}${bossTag}`;
  } else if (state.mode === 'tower') {
    const ts = state.towerState;
    if (ts) {
      const type = (typeof towerMonsterType === 'function') ? towerMonsterType(ts.floor) : 'normal';
      const typeTag = type==='boss'?` ${symbolIconHtml('👑', 14, '首领', 'achievement_boss_lichking')}首领`:type==='elite'?` ${symbolIconHtml('🗡️', 14, '精英', 'ability_rogue_eviscerate')}精英`:'';
      const towerIconHtml = symbolIconHtml('⛰️', 16, '无尽塔', 'achievement_dungeon_naxxramas');
      $('h-zone').innerHTML = `${towerIconHtml} 无尽塔 · 第${ts.floor}层`;
      $('zone-name').innerHTML = `${towerIconHtml} 无尽塔 · 第${ts.floor}层${typeTag}`;
      $('progress-text').innerHTML = `本次 +${ts.coinThisRun||0}🪙 · 最高 ${state.tower?.highest||0} 层`;
    }
    }
  }

  // 随从显示(arena下方)
  const comp=getActiveCompanion();
  if(comp&&state.mode!=='travel'){
    const tpl=COMPANIONS.find(c=>c.key===comp.key);
    const q=(typeof compQuality==='function')?compQuality(tpl):{name:'',mult:1};
    const st=computeCompanionStats();if(!st)return;
    const compHp=state._compHp??st.hpMax;
    const compDown=(state._compDownUntil||0)>Date.now();
    const reviveLeft=compDown?Math.ceil(((state._compDownUntil)-Date.now())/1000):0;
    $('comp-mini').style.display='';
    $('comp-mini').style.opacity=compDown?'0.5':'1';
    const statusTag=compDown?` · <span style="color:#fde047">💫倒下 ${reviveLeft}秒</span>`:'';
    const sigBadge = tpl?.signature ? ` · <span style="color:#fcd34d">${(typeof skillIcon === 'function') ? skillIcon(tpl.signature.name, 14, tpl.signature.icon||'✨') : (tpl.signature.icon||'✨')}专属</span>` : '';
    const compIconHtml = companionIconHtml(tpl, 18);
    const compMiniName = $('comp-mini-name');
    const headSig = [
      tpl?.key || comp.key,
      q.cls || '',
      q.name || '',
      comp.stars || 1,
      fmt(st.atk),
      fmt(st.def),
      compDown ? `down:${reviveLeft}` : 'up',
      !!tpl?.signature
    ].join('|');
    if (_compMiniHeadSig !== headSig && compMiniName) {
      _compMiniHeadSig = headSig;
      compMiniName.innerHTML=`${compIconHtml} ${tpl?.name} · <span class="${q.cls||''}">${q.name}</span> ${'⭐'.repeat(comp.stars||1)}${sigBadge} · 攻${fmt(st.atk)} 防${fmt(st.def)}${statusTag}`;
    }
    setBar($('b-comp-hp'),Math.max(0,compHp)/st.hpMax*100,compDown?`倒下 ${reviveLeft}秒`:hpWithShieldText(compHp, st.hpMax, Math.max(0, state._compBarrier || 0)));
    const intentEl = $('comp-intent-line');
    if(intentEl){
      const it = (typeof companionIntentUiState === 'function') ? companionIntentUiState(now) : null;
      const txt = it ? `${it.icon} ${it.label} · ${it.desc}` : '';
      intentEl.style.display = txt ? '' : 'none';
      if(intentEl.textContent !== txt) intentEl.textContent = txt;
    }
    const coordinateEl = $('comp-coordinate-line');
    if(coordinateEl){
      const co = (typeof companionCoordinateUiState === 'function') ? companionCoordinateUiState(now) : null;
      if(co){
        const leftTxt = co.ready ? '就绪' : Math.ceil(co.leftMs / 1000) + '秒';
        const pct = co.ready ? 100 : Math.max(0, Math.min(100, Math.round((1 - co.leftMs / Math.max(1, co.cdMs || 1)) * 100)));
        coordinateEl.classList.toggle('ready', !!co.ready);
        coordinateEl.classList.toggle('pulse', !!((state._compCoordinateLastAt || 0) > now - 1800));
        const coordinateSig = [co.name, leftTxt, pct, co.ready ? 1 : 0].join('|');
        if(coordinateEl._sig !== coordinateSig){
          coordinateEl._sig = coordinateSig;
          coordinateEl.innerHTML = `<span>${co.icon} ${tipAttrText(co.name)}</span><b>${leftTxt}</b><i style="width:${pct}%"></i>`;
        }
      }else coordinateEl.innerHTML = '';
    }
    const reactionEl = $('comp-reaction-line');
    if(reactionEl){
      const rx = (typeof companionReactionUiState === 'function') ? companionReactionUiState(now) : null;
      if(rx){
        const leftTxt = rx.ready ? '就绪' : Math.ceil(rx.leftMs / 1000) + '秒';
        const pct = rx.ready ? 100 : Math.max(0, Math.min(100, Math.round((1 - rx.leftMs / Math.max(1, rx.cdMs || 1)) * 100)));
        reactionEl.classList.toggle('ready', !!rx.ready);
        reactionEl.classList.toggle('pulse', !!rx.recent);
        const reactionSig = [rx.name, rx.icon, leftTxt, pct, rx.ready ? 1 : 0, rx.recent ? 1 : 0].join('|');
        if(reactionEl._sig !== reactionSig){
          reactionEl._sig = reactionSig;
          reactionEl.innerHTML = `<span>${rx.icon} ${tipAttrText(rx.name)}</span><b>${leftTxt}</b><i style="width:${pct}%"></i>`;
        }
      }else reactionEl.innerHTML = '';
    }
    const resonanceEl = $('comp-resonance-line');
    if(resonanceEl){
      const rs = (typeof companionResonanceUiState === 'function') ? companionResonanceUiState(now) : null;
      resonanceEl.style.display = rs ? '' : 'none';
      if(rs){
        const leftTxt = rs.ready ? '就绪' : Math.ceil(rs.leftMs / 1000) + '秒';
        const pct = rs.ready ? 100 : Math.max(0, Math.min(100, Math.round((1 - rs.leftMs / Math.max(1, rs.cdMs || 1)) * 100)));
        resonanceEl.classList.toggle('ready', !!rs.ready);
        resonanceEl.classList.toggle('pulse', !!rs.recent);
        const resonanceSig = [rs.name, rs.rank, leftTxt, pct, rs.ready ? 1 : 0, rs.recent ? 1 : 0].join('|');
        if(resonanceEl._sig !== resonanceSig){
          resonanceEl._sig = resonanceSig;
          resonanceEl.innerHTML = `<span>${rs.icon} ${tipAttrText(rs.name)} ${rs.rank}</span><b>${leftTxt}</b><i style="width:${pct}%"></i>`;
        }
      }else resonanceEl.innerHTML = '';
    }
    // 随从技能 冷却 展示:仅在随从/技能数变化时重建(避免每帧churn打断 title 悬浮),每帧只刷新剩余CD
    const csEl=$('comp-skills');
    if(csEl){
      const sig=comp.key+':'+((st.skills&&st.skills.length)||0);
      if(csEl._sig!==sig){
        csEl._sig=sig;
        const passiveSig = tpl?.signature?.mode==='passive'
          ? `<span class="comp-cd-passive" data-tip="${companionSkillTipHtml(Object.assign({_signature:true}, tpl.signature)).replace(/"/g,'&quot;')}" style="font-size:13px;cursor:help;color:#fcd34d">${(typeof skillIcon === 'function') ? skillIcon(tpl.signature.name, 16, tpl.signature.icon||'✨') : (tpl.signature.icon||'✨')}</span>`
          : '';
        csEl.innerHTML=passiveSig+((st.skills)||[]).map((s,i)=>{
          const tip=companionSkillTipHtml(s).replace(/"/g,'&quot;');
          const color = s._signature ? 'color:#fcd34d;' : '';
          const skillIconHtml = (typeof skillIcon === 'function') ? skillIcon(s.name, 16, s.icon) : s.icon;
          return `<span class="comp-cd-skill" data-i="${i}" data-tip="${tip}" style="font-size:13px;cursor:help;${color}">${skillIconHtml}<sub class="cs-cd" style="font-size:9px;color:#fbbf24"></sub></span>`;
        }).join('');
      }
      // 用自定义 #compare-tip 而非原生 title:原生 title 的悬浮计时会被每帧 CD/透明度更新打断,导致"偶尔不显示"
      if(!csEl._tipBound){
        csEl._tipBound=true;
        const showTip=e=>{const sp=e.target.closest('.comp-cd-skill,.comp-cd-passive');if(!sp)return;const tip=$('compare-tip');if(!tip)return;tip.querySelector('.compare-head').innerHTML=sp.dataset.tip||'';tip.querySelector('.compare-body').innerHTML='';tip.style.display='block';positionTip(tip,e);};
        csEl.addEventListener('mouseover',e=>{if(!tooltipHoverEnabled())return;showTip(e);});
        csEl.addEventListener('mousemove',e=>{if(!tooltipHoverEnabled())return;if(e.target.closest('.comp-cd-skill,.comp-cd-passive'))positionTip($('compare-tip'),e);});
        csEl.addEventListener('mouseleave',()=>{if(!tooltipHoverEnabled())return;if(!_tipPinned){const tip=$('compare-tip');if(tip)tip.style.display='none';}});
        csEl.addEventListener('click', e => {
          const sp = e.target.closest('.comp-cd-skill,.comp-cd-passive');
          if (!sp) return;
          e.stopPropagation();
          if (_tipPinned && _tipPinnedOwner === sp) { unpinTip(); }
          else { if (_tipPinned) unpinTip(); showTip(e); _tipPinned = true; _tipPinnedOwner = sp; }
        });
      }
      // 每帧只在值变化时写 DOM(避免无谓 churn)
      csEl.querySelectorAll('.comp-cd-skill').forEach(span=>{
        const i=+span.dataset.i;const left=(typeof companionSkillCdLeft==='function')?companionSkillCdLeft(i):0;
        const op=left>0?'0.45':'1';if(span.style.opacity!==op)span.style.opacity=op;
        const sub=span.querySelector('.cs-cd');if(sub){const txt=left>0?Math.ceil(left/1000)+'秒':'';if(sub.textContent!==txt)sub.textContent=txt;}
      });
    }
    const showCompDetail = function(e){
      const nowTs = now;
      const compBuffs = [];
      if (state._compBuffs) {
        for (const [k, expire] of Object.entries(state._compBuffs)) {
          if (!(expire > nowTs)) continue;
          const fx = (typeof BUFF_FX === 'object' && BUFF_FX[k]) ? BUFF_FX[k] : null;
          compBuffs.push((fx?.icon || '✨') + (fx?.name || k) + ' ' + Math.ceil((expire - nowTs) / 1000) + '秒');
        }
      }
      const compDebuffs = [];
      if (typeof DEBUFF_FX === 'object' && state._compDebuffs) {
        for (const k in state._compDebuffs) {
          const d = state._compDebuffs[k];
          if (!(d.expire > nowTs)) continue;
          const fx = DEBUFF_FX[k]; if (!fx) continue;
          compDebuffs.push((fx.icon || '☠️') + fx.name + ' ' + Math.ceil((d.expire - nowTs) / 1000) + '秒');
        }
      }
      const compBarrier = state._compBarrier || 0;
      const sig = tpl?.signature;
      const intent = (typeof companionIntentUiState === 'function') ? companionIntentUiState(nowTs) : null;
      const coordinate = (typeof companionCoordinateUiState === 'function') ? companionCoordinateUiState(nowTs) : null;
      const special = (typeof companionCombatSpecialUiState === 'function') ? companionCombatSpecialUiState(nowTs) : null;
      const reaction = (typeof companionReactionUiState === 'function') ? companionReactionUiState(nowTs) : null;
      const resonance = (typeof companionResonanceUiState === 'function') ? companionResonanceUiState(nowTs) : null;
      const compIconHtml = companionIconHtml(tpl, 18);
      const html=`<b>${compIconHtml} ${tpl?.name}</b><div>${q.name} ${'⭐'.repeat(comp.stars||1)} · ${tpl?.role==='tank'?'🛡️坦克':tpl?.role==='heal'?'💚辅助':'⚔️输出'}</div>
        <div>攻击${fmt(st.atk)} 防御${fmt(st.def)} 生命${fmt(st.hpMax)} 攻速${st.spd?.toFixed(2)}/秒</div>
        <div class="muted">参战强度已按品质、星级与定位折算</div>
        <div class="muted">定位:${tpl?.role==='tank'?'🛡️纯坦克 扛压吸仇恨/减伤结界/自疗':tpl?.role==='dps'?'⚔️纯输出 自带攻击攻速狂热/技能爆发':'💚辅助 加速+增伤+续航(助毕业DPS提速过本)'}</div>
        ${intent?`<div style="color:#bae6fd">当前意图: ${intent.icon} ${intent.label} · ${tipAttrText(intent.desc)}</div>`:''}
        ${coordinate?`<div style="color:#7dd3fc">协同追击: ${coordinate.ready?'就绪':'冷却 '+Math.ceil(coordinate.leftMs/1000)+'秒'}</div><div class="muted">${tipAttrText(coordinate.desc)}</div>`:''}
        ${special?`<div style="color:#fcd34d">专属战斗: ${special.icon || '🌟'} ${special.name} · ${special.ready?'就绪':'冷却 '+Math.ceil(special.leftMs/1000)+'秒'}</div>${companionCombatSpecialTipHtml(tpl, comp, { state:special })}`:''}
        ${reaction?`<div style="color:#fcd34d">战友反应: ${reaction.icon} ${reaction.name} · ${reaction.ready?'就绪':'冷却 '+Math.ceil(reaction.leftMs/1000)+'秒'}</div><div class="muted">${reaction.desc}</div>`:''}
        ${resonance?`<div style="color:#fcd34d">羁绊共鸣: ${resonance.icon} ${resonance.name} ${resonance.rank} · ${resonance.ready?'就绪':'冷却 '+Math.ceil(resonance.leftMs/1000)+'秒'}</div><div class="muted">${tipAttrText(resonance.desc)} 来源:${tipAttrText(resonance.bondNames)}</div>`:''}
        ${sig?`<div style="color:#fcd34d">专属技: ${(typeof skillIcon === 'function') ? skillIcon(sig.name, 14, sig.icon||'✨') : (sig.icon||'✨')} ${sig.name} · ${sig.desc||''}${sig.mode==='passive'?' (被动)':''}</div>`:''}
        ${compBarrier>0?`<div style="color:#93c5fd">护盾: ${fmt(compBarrier)}</div>`:''}
        ${compBuffs.length?`<div>增益: ${compBuffs.join(' · ')}</div>`:''}
        ${compDebuffs.length?`<div style="color:#fca5a5">减益: ${compDebuffs.join(' · ')}</div>`:''}`;
      const tip=$('compare-tip');tip.querySelector('.compare-head').innerHTML=html;tip.querySelector('.compare-body').innerHTML='';
      tip.style.display='block';positionTip(tip,e);
    };
    const compMini = $('comp-mini');
    compMiniName.onmouseenter = e => { if (!tooltipHoverEnabled()) return; showCompDetail(e); };
    compMiniName.onmouseleave = () => { if (!tooltipHoverEnabled()) return; if (!_tipPinned) $('compare-tip').style.display = 'none'; };
    compMiniName.onmousemove = e => { if (!tooltipHoverEnabled()) return; positionTip($('compare-tip'), e); };
    addTouchPin(compMiniName, showCompDetail);
    if (compMini) {
      compMini.onmouseenter = e => { if (!tooltipHoverEnabled()) return; showCompDetail(e); };
      compMini.onmouseleave = () => { if (!tooltipHoverEnabled()) return; if (!_tipPinned) $('compare-tip').style.display = 'none'; };
      compMini.onmousemove = e => { if (!tooltipHoverEnabled()) return; positionTip($('compare-tip'), e); };
      addTouchPin(compMini, showCompDetail);
    }
  }else{
    $('comp-mini').style.display='none';
    _compMiniHeadSig = '';
  }
  renderAllySummonBar(now);

  // 技能栏(只在dirty时重建, 否则只更新CD;拖拽排序进行中不重建以免打断)
  updateBossIntentLine(now);
  if ((!$('skill-bar')?.children?.length || isDirty('skills')) && !skillDragging) renderSkillBar();
  else updateSkillBarCd();

  // 增益图标条
  const buffPaintGap = isMobileLayout() ? 220 : 140;
  if (now - _lastBuffBarPaint >= buffPaintGap || isDirty('stage') || isDirty('hero') || isDirty('companion')) {
    renderBuffBar();
    _lastBuffBarPaint = now;
  }

  // 神器招牌技能冷却(每帧更新)
  renderArtifactSkillBar(now);

  // stage 样式 / 离开按钮显隐
  const stage = $('stage');
  if (state.mode === 'world' || state.mode === 'travel') {
    stage.classList.remove('dungeon');
    $('btn-leave').style.display = 'none';
  } else {
    stage.classList.add('dungeon');
    const leaveMeta = {
      dungeon: ['离开副本', '离开当前副本: 进度丢失,保留已获得战利品和副本冷却。'],
      mythic: ['离开大秘境', '离开当前大秘境: 进度丢失,已获得装备保留。'],
      boss: ['撤离首领', '撤离地图首领战: 返回野外,下次需要重新开始挑战。'],
      worldboss: ['撤离世界Boss', '撤离世界Boss战: CD不重置,之后可以重新挑战。'],
      tower: ['撤离无尽塔', '撤离无尽塔: 本次进度结束,塔币和最高层保留。'],
      roguelike: ['放弃幻象', '放弃幻象挑战: 已获得幻象币保留,返回世界。'],
    }[state.mode] || ['离开战斗', '离开当前特殊战斗并返回世界。'];
    const leaveBtn = $('btn-leave');
    leaveBtn.style.display = '';
    const leaveText = `🚪 ${leaveMeta[0]}`;
    if (leaveBtn.textContent.trim() !== leaveText) leaveBtn.textContent = leaveText;
    if (leaveBtn.title !== leaveMeta[1]) leaveBtn.title = leaveMeta[1];
  }

  // 伤害统计(每帧就地刷新)
  const meterPaintGap = isMobileLayout() ? 260 : 180;
  if (now - _lastDmgMeterPaint >= meterPaintGap || isDirty('stage')) {
    updateDmgMeter();
    _lastDmgMeterPaint = now;
  }
}

/* ---------- 各面板的完整重建函数 ---------- */
function renderHero() {
  const c = getCls(); if (!c) return;
  const h = state.hero;

  $('class-label').innerHTML = `${classIcon(state.cls, 18, c.icon)} ${c.name}`;
  $('class-label').style.background = c.color;
  $('class-label').style.color = '#000';

  // 资源条颜色
  const wrap = $('b-mp-wrap');
  wrap.classList.remove('mp','rage','energy');
  if (c.resKey === 'rage') wrap.classList.add('rage');
  else if (c.resKey === 'energy') wrap.classList.add('energy');
  else wrap.classList.add('mp');

  // 属性
  const a = state._attrs || c.baseAttrs;
  const isPrimary = c.attackAttr;
  const atkFromPrimary = Math.floor((a[isPrimary]||0) * 1.5);
  attrTips = {
    str: `<b>力量 ${fmt(a.str)}</b><div>攻击力 +${isPrimary==='str'?atkFromPrimary:0}</div><div class="muted">战士/圣骑士主属性</div>`,
    agi: `<b>敏捷 ${fmt(a.agi)}</b><div>攻击力 +${isPrimary==='agi'?atkFromPrimary:0}</div><div class="muted">盗贼/猎人/德鲁伊主属性</div>`,
    int: `<b>智力 ${fmt(a.int)}</b><div>法力上限 +${(a.int||0)*5}</div><div>攻击力 +${isPrimary==='int'?atkFromPrimary:0}</div><div class="muted">法师/牧师/萨满/术士主属性</div>`,
    spi: `<b>精神 ${fmt(a.spi)}</b><div>生命回复 +${Math.floor((a.spi||0)*0.2)}/秒</div><div>法力回复 +${Math.floor((a.spi||0)*0.3)}/秒</div>`,
    sta: `<b>耐力 ${fmt(a.sta)}</b><div>生命上限 +${(a.sta||0)*10}</div><div>防御 +${Math.floor((a.sta||0)*0.3)}</div>`,
  };
  $('a-str').textContent = fmt(a.str);
  $('a-agi').textContent = fmt(a.agi);
  $('a-int').textContent = fmt(a.int);
  $('a-spi').textContent = fmt(a.spi);
  $('a-sta').textContent = fmt(a.sta);
  // 战斗属性
  $('s-atk').textContent = fmt(h.atk);
  $('s-def').textContent = fmt(h.def);
  $('s-crit').textContent = h.crit.toFixed(1)+'%';
  $('s-critd').textContent = h.critd.toFixed(0)+'%';
  $('s-spd').textContent = h.spd.toFixed(2)+'/秒';
  $('s-reg').textContent = fmt(h.reg)+'/秒';

  // 平均装备等级(魔兽装等):已穿戴部位装等的平均值
  if ($('s-ilvl')) {
    let sum = 0, n = 0;
    for (const k of SLOT_ORDER) {
      const it = state.equipped[k];
      if (it) { const lv = itemLevelOf(it); if (lv > 0) { sum += lv; n++; } }
    }
    $('s-ilvl').textContent = n ? Math.round(sum / n) : 0;
  }

  $('talent-points').textContent = state.talentPoints;

  // 副属性
  $('s-leech').textContent = ((state.hero.leech||0)*0.5).toFixed(1)+'%';   // 每点吸血=0.5%实际吸血
  $('s-vers').textContent = (state.hero.vers||0).toFixed(1)+'%';
  if ($('s-haste')) $('s-haste').textContent = (state.hero.haste||0).toFixed(1)+'%';
  $('s-mastery').textContent = fmt(state.hero.mastery||0);
  // 副属性来源明细(全能/精通,单位一致);hover 数值查看
  { const bv = statSourceBreakdown('vers'); $('s-vers').title = bv ? '全能加成来源:\n' + bv : ''; if ($('s-vers')) $('s-vers').style.cursor = bv ? 'help' : 'default'; }
  { const bm = statSourceBreakdown('mastery', false); $('s-mastery').title = bm ? '精通加成来源:\n' + bm : ''; $('s-mastery').style.cursor = bm ? 'help' : 'default'; }
  if ($('s-dodge')) $('s-dodge').textContent = (state.hero.dodge||0).toFixed(1)+'%';

  // 精通效果
  const specTree = state.specialization ? c.trees.find(t=>t.key===state.specialization) : null;
  $('mastery-desc').textContent = (typeof masteryDescText==='function') ? masteryDescText() : (specTree ? specTree.masteryDesc||'' : '未选择专精');

  // 额外加成(来源汇总)
  const srcs = state._statSources;
  const total = srcs && srcs._total;
  const bonusKeys = [
    {key:'atkPct', label:'攻击', fmt:v => '+' + v.toFixed(1) + '%'},
    {key:'hpPct',  label:'生命', fmt:v => '+' + v.toFixed(1) + '%'},
    {key:'defPct', label:'防御', fmt:v => '+' + v.toFixed(1) + '%'},
    {key:'spdPct', label:'攻速', fmt:v => '+' + v.toFixed(1) + '%'},
    {key:'critdPct', label:'暴伤', fmt:v => '+' + v.toFixed(0) + '%'},
  ];
  const bonusEl = $('bonus-row');
  if (bonusEl && total) {
    const parts = bonusKeys.map(b => {
      const v = total[b.key] || 0;
      const bd = statSourceBreakdown(b.key);
      const tip = bd ? ` title="${b.label}加成来源:&#10;${bd}"` : '';
      return `<span class="bonus-chip${v>0?' has':''}"${tip} style="cursor:${bd?'help':'default'}">${b.label} ${b.fmt(v)}</span>`;
    });
    bonusEl.innerHTML = parts.join('');
  } else if (bonusEl) {
    bonusEl.innerHTML = '<span class="muted" style="font-size:10px">暂无额外加成(装备/天赋/随从等可提供)</span>';
  }
  const setPanel = $('set-panel');
  if (setPanel) {
    const gate = (typeof currentXpGate === 'function') ? currentXpGate() : null;
    const gateHtml = gate
      ? `<div class="stage-gate-note"><b>阶段试炼:</b> 已卡在 等级${gate.level}，击败 <b>${gate.name}</b> 后继续获得经验</div>`
      : '';
    const setHtml = (typeof renderSetPanelHtml === 'function')
      ? renderSetPanelHtml()
      : '<div class="muted" style="font-size:11px">未装备套装部件</div>';
    setPanel.innerHTML = gateHtml + setHtml;
  }
  bindUnitTip($('hero-emoji'), heroUnitTipHtml);
}

/* 某加成的"按来源拆分"明细字符串(读 state._statSources,降序);供属性面板 tooltip。
   pct=true 加 % 后缀(攻击/生命/全能等),false 为扁平值(精通) */
function statSourceBreakdown(key, pct) {
  if (pct === undefined) pct = true;
  const srcs = state._statSources;
  if (!srcs) return '';
  const rows = [];
  for (const [name, d] of Object.entries(srcs)) {
    if (name === '_total' || !d) continue;
    const v = d[key] || 0;
    if (v) rows.push({ name, v });
  }
  if (!rows.length) return '';
  rows.sort((a, b) => b.v - a.v);
  return rows.map(r => `${r.name} ${r.v > 0 ? '+' : ''}${(+r.v).toFixed(1)}${pct ? '%' : ''}`).join('\n');
}

/* 魔兽装等(物品等级)展示文案,如 "装等208";与佩戴需求"等级X"区分 */
function itemLevelOf(it) {
  if (!it) return 0;
  if (typeof it.ilvl === 'number' && it.ilvl > 0) return it.ilvl;
  return (typeof computeItemLevel === 'function') ? computeItemLevel(it) : 0;
}
function itemLevelText(it) {
  const lv = itemLevelOf(it);
  return lv > 0 ? `<span style="color:#fbbf24">装等${lv}</span>` : '';
}

function renderEquipment() {
  const eg = $('equip-grid');
  eg.innerHTML = '';
  for (const k of SLOT_ORDER) {
    const it = state.equipped[k];
    const slotIconHtml = (typeof slotIcon === 'function') ? slotIcon(k, 16, SLOT_INFO[k].icon) : SLOT_INFO[k].icon;
    const div = document.createElement('div');
    div.className = 'slot' + (it ? ' '+it.bcls : '');
    div.dataset.slot = k;
    if (it) {
      if (typeof syncItemIdentity === 'function') syncItemIdentity(it);
      const stats = Object.entries(it.stats).map(([sk,v])=>fmtMod(sk, v)).join(' ');
      const extras = (typeof itemBonusSummary==='function') ? itemBonusSummary(it) : '';
      const itemNameHtml = (typeof itemDisplayNameHtml === 'function') ? itemDisplayNameHtml(it,{slotBadge:true}) : it.name;
      div.innerHTML = `<div class="label">${slotIconHtml} ${SLOT_INFO[k].label}</div>
        <div class="name ${it.cls}">${itemNameHtml}${extras}</div>
        <div class="stats">${itemLevelText(it)}${it.reqLvl?' · 等级'+it.reqLvl:''} · ${stats}</div>`;
      div.title = '点击查看详情/卸下';
    } else {
      div.innerHTML = `<div class="label">${slotIconHtml} ${SLOT_INFO[k].label}</div>
        <div class="muted" style="font-size:11px">空</div>`;
    }
    eg.appendChild(div);
  }
}

function renderInventory() {
  // 清理槽位无效的物品
  state.inventory = state.inventory.filter(it => SLOT_INFO[it.slot]);
  const cap = (typeof invCap === 'function') ? invCap() : 60;
  const cntEl = $('inv-count');
  cntEl.textContent = state.inventory.length;
  cntEl.style.color = state.inventory.length >= cap ? '#ef4444' : (state.inventory.length >= cap * 0.9 ? '#f59e0b' : '');
  const capEl = $('inv-cap'); if (capEl) capEl.textContent = cap;
  const expBtn = $('btn-expand-inv');
  if (expBtn && typeof invExpandCost === 'function') {
    const atMax = (typeof INV_CAP_MAX !== 'undefined') && cap >= INV_CAP_MAX;
    expBtn.textContent = atMax ? '🎒 已满级' : '🎒 扩容 ' + fmt(invExpandCost()) + '💰';
    expBtn.disabled = atMax;
  }

  // 按品质→等级排序: 传说>史诗>精良>优秀>普通, 同品质高等级优先
  const rarityOrder = ['legend','epic','rare','uncommon','common'];
  state.inventory.sort((a,b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity) || itemLevelOf(b) - itemLevelOf(a) || (b.reqLvl||0) - (a.reqLvl||0));

  // 高亮自动售卖按钮
  const asVal = state.autoSellRarity || 'off';
  ['off','common','uncommon','rare'].forEach(k => {
    const btn = document.getElementById('btn-as-' + k);
    if (btn) {
      btn.classList.toggle('active', asVal === k);
      if (asVal === k) { btn.style.background = 'var(--accent)'; btn.style.color = '#000'; btn.style.fontWeight = 'bold'; }
      else { btn.style.background = ''; btn.style.color = ''; btn.style.fontWeight = ''; }
    }
  });

  // 部位筛选下拉:首次构建选项 + 同步当前值
  const fsel = document.getElementById('inv-filter-slot');
  if (fsel) {
    if (!fsel.options.length) {
      const slots = (typeof SLOT_ORDER !== 'undefined') ? SLOT_ORDER : Object.keys(SLOT_INFO);
      fsel.innerHTML = '<option value="all">全部</option>' +
        slots.map(k => `<option value="${k}">${SLOT_INFO[k] ? SLOT_INFO[k].label : k}</option>`).join('');
    }
    if (fsel.value !== (_invFilterSlot || 'all')) fsel.value = _invFilterSlot || 'all';
  }

  // 品质筛选下拉
  const rsel = document.getElementById('inv-filter-rarity');
  if (rsel) {
    if (!rsel.options.length) {
      const rs = [['all', '全部'], ['legend', '传说'], ['epic', '史诗'], ['rare', '精良'], ['uncommon', '优秀'], ['common', '普通']];
      rsel.innerHTML = rs.map(([k, label]) => `<option value="${k}">${label}</option>`).join('');
    }
    if (rsel.value !== (_invFilterRarity || 'all')) rsel.value = _invFilterRarity || 'all';
  }

  const il = $('inv-list');
  il.innerHTML = '';
  const tip = $('compare-tip');

  let shown = 0;
  for (const it of state.inventory) {
    if (!SLOT_INFO[it.slot]) continue; // 跳过槽位无效的物品
    if (_invFilterSlot && _invFilterSlot !== 'all' && it.slot !== _invFilterSlot) continue;
    if (_invFilterRarity && _invFilterRarity !== 'all' && it.rarity !== _invFilterRarity) continue;
    shown++;
    if (typeof syncItemIdentity === 'function') syncItemIdentity(it);
    const equipped = state.equipped[it.slot];
    const _mainSet = (it._mainStats && it._mainStats.length) ? it._mainStats : [it._mainStat || (SLOT_INFO[it.slot] && SLOT_INFO[it.slot].mainStat)];
    const stats = Object.entries(it.stats).map(([k,v])=> _mainSet.includes(k) ? `<b style="color:#fde68a">${fmtMod(k, v)}</b>` : fmtMod(k, v)).join(' ');
    const row = document.createElement('div');
    row.className = 'inv-item ' + it.bcls + (it.locked ? ' locked' : '');
    row.dataset.id = it.id;
    const extras = (typeof itemBonusSummary==='function') ? itemBonusSummary(it) : '';
    const slotIconHtml = (typeof slotIcon === 'function') ? slotIcon(it.slot, 16, SLOT_INFO[it.slot].icon) : SLOT_INFO[it.slot].icon;
    const itemNameHtml = (typeof itemDisplayNameHtml === 'function') ? itemDisplayNameHtml(it,{slotBadge:true}) : it.name;
    row.innerHTML = `
      <div class="info">
        <div class="name ${it.cls}">${it.locked?'🔒 ':''}${slotIconHtml} ${itemNameHtml}${extras}</div>
        <div class="stats">${SLOT_INFO[it.slot].label} · ${itemLevelText(it)}${it.reqLvl?" · 等级"+it.reqLvl:""} · ${stats}</div>
      </div>
      <div class="btns">
        <button data-action="lock" data-id="${it.id}" title="${it.locked?'已锁定(点击解锁)':'锁定(防止出售)'}">${it.locked?'🔒':'🔓'}</button>
        <button data-action="detail" data-id="${it.id}" title="详情/词缀/宝石/附魔">🔍</button>
        <button class="primary" data-action="equip" data-id="${it.id}">装备</button>
        <button data-action="sell" data-id="${it.id}"${it.locked?' disabled title="已锁定"':''}>${it.sell}💰</button>
      </div>`;

    const showCompare = e => {
      const diff = calcCompare(it, equipped);
      const newNameHtml = (typeof itemDisplayNameHtml === 'function') ? itemDisplayNameHtml(it,{slotBadge:true}) : it.name;
      const oldNameHtml = equipped ? ((typeof itemDisplayNameHtml === 'function') ? itemDisplayNameHtml(equipped,{slotBadge:true}) : equipped.name) : '';
      tip.querySelector('.compare-head').innerHTML = `
        <div>${slotIconHtml} ${SLOT_INFO[it.slot].label} 对比</div>
        <div class="name ${it.cls}" style="font-size:11px">🆕 ${newNameHtml}</div>
        ${equipped ? `<div class="name ${equipped.cls}" style="font-size:11px">📌 ${oldNameHtml}</div>` : '<div class="muted" style="font-size:11px">📌 当前栏位为空</div>'}
      `;
      tip.querySelector('.compare-body').innerHTML = diff;
      tip.style.display = 'block';
      positionTip(tip, e);
    };
    row.addEventListener('mouseenter', e => { if (!tooltipHoverEnabled()) return; showCompare(e); });
    row.addEventListener('mouseleave', () => { if (!tooltipHoverEnabled()) return; if (!_tipPinned) tip.style.display = 'none'; });
    row.addEventListener('mousemove', e => { if (!tooltipHoverEnabled()) return; positionTip(tip, e); });
    addTouchPin(row, showCompare);

    il.appendChild(row);
  }
  if (shown === 0) {
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.style.cssText = 'padding:12px;text-align:center;font-size:12px';
    empty.textContent = state.inventory.length ? '没有符合筛选条件的装备(可切换筛选)' : '背包是空的';
    il.appendChild(empty);
  }
}

function calcCompare(newItem, oldItem) {
  const suf = (k) => isPercentStat(k) ? '%' : '';
  if (!oldItem) {
    let html = '<div class="muted" style="margin-bottom:4px">当前栏位为空,推荐装备</div>';
    for (const [k, v] of Object.entries(newItem.stats)) {
      html += `<div class="compare-up">${fmtStatName(k)}: +${v}${suf(k)}</div>`;
    }
    return html;
  }
  const allKeys = new Set([...Object.keys(newItem.stats), ...Object.keys(oldItem.stats)]);
  let html = '';
  for (const k of allKeys) {
    const nv = newItem.stats[k] || 0;
    const ov = oldItem.stats[k] || 0;
    const diff = nv - ov;
    const label = fmtStatName(k);
    const sf = suf(k);
    if (diff > 0) {
      html += `<div class="compare-up">${label} +${diff}${sf}</div>`;
    } else if (diff < 0) {
      html += `<div class="compare-down">${label} ${diff}${sf}</div>`;
    } else {
      html += `<div class="compare-same">${label} =</div>`;
    }
  }
  if (!html) html = '<div class="muted">无可比属性</div>';
  return html;
}

function scaleLootStats(stats, rarityKey, power) {
  const rarity = RARITY.find(r=>r.key===rarityKey);
  const mult = rarity ? rarity.mult : 1;
  const baseVal = {
    atk:2+power*0.8, def:1+power*0.5, hp:8+power*4, crit:1+power*0.05,
    critd:5+power*0.4, reg:1+power*0.1, str:1+power*0.4, agi:1+power*0.4,
    int:1+power*0.4, spi:1+power*0.3, sta:1+power*0.4,
    leech:0.5+power*0.04, vers:0.5+power*0.04, mastery:1+power*0.08,
  };
  const result = {};
  for (const [k, v] of Object.entries(stats)) {
    const bv = baseVal[k] || 1;
    result[k] = Math.max(1, Math.floor(bv * 0.3 * v * mult));
  }
  return result;
}

function showLootTip(e, items, title) {
  const tip = $('compare-tip');
  let html = `<div style="font-weight:bold;margin-bottom:4px">${title||'掉落预览'}</div>`;
  if (!items || items.length === 0) {
    html += '<div class="muted">无专属掉落</div>';
  } else {
    for (const it of items) {
      const r = RARITY.find(r=>r.key===it.rarity);
      const epicBadge = (typeof itemEpicRaidBadge === 'function') ? itemEpicRaidBadge(it, true) : '';
      if (typeof syncItemIdentity === 'function') syncItemIdentity(it);
      const itemNameHtml = (typeof itemDisplayNameHtml === 'function') ? itemDisplayNameHtml(it,{slotBadge:true}) : it.name;
      const ilvlTxt = itemLevelOf(it) > 0 ? itemLevelText(it) + ' · ' : '';
      html += `<div class="${r?.cls||''}" style="font-size:11px;margin:1px 0">${itemNameHtml}${epicBadge} <span style="opacity:.6">${it.slot&&SLOT_INFO[it.slot]?SLOT_INFO[it.slot].label+' · ':''}${ilvlTxt}${(it.stats?Object.entries(it.stats).map(([k,v])=>fmtMod(k, v)).join(' '):'')}</span></div>`;
    }
  }
  tip.querySelector('.compare-head').innerHTML = html;
  tip.querySelector('.compare-body').innerHTML = '';
  tip.style.display = 'block';
  positionTip(tip, e);
}
function hideLootTip() { if (!_tipPinned) $('compare-tip').style.display = 'none'; }

function positionTip(tip, e) {
  const mobile = typeof isMobileLayout === 'function' ? isMobileLayout() : (typeof window !== 'undefined' && window.innerWidth <= 768);
  if (mobile) {
    tip.classList.add('mobile-tip');
    tip.style.left = '8px';
    tip.style.top = 'auto';
    tip.style.bottom = `calc(8px + env(safe-area-inset-bottom, 0px))`;
    if (!tip.dataset.mobileOpened) {
      tip.scrollTop = 0;
      tip.dataset.mobileOpened = '1';
    }
    return;
  }
  tip.classList.remove('mobile-tip');
  tip.style.bottom = '';
  delete tip.dataset.mobileOpened;
  let x = e.clientX + 16;
  let y = e.clientY - 10;
  const tipW = tip.offsetWidth || 290;
  if (x + tipW + 10 > window.innerWidth) {
    x = Math.max(8, e.clientX - tipW - 16);
  }
  if (y + tip.offsetHeight > window.innerHeight) {
    y = window.innerHeight - tip.offsetHeight - 10;
  }
  if (y < 8) y = 8;
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
}

function renderShop() {
  const c = getCls();
  const primary = c ? c.attackAttr : 'str';
  const primaryName = fmtStatName(primary);
  const ticketPrice = 50000;
  const bulkPrice = 425000;
  const compTicketPrice = 100000;
  const compBulkPrice = 850000;
  $('shop-list').innerHTML = `
    <div style="margin-bottom:12px;padding:10px;background:var(--panel-2);border-radius:8px;border:1px solid var(--gold)">
      <div style="font-weight:bold;margin-bottom:4px">🎫 通用券商店</div>
      <div class="muted" style="margin-bottom:4px">地图首领和副本首次免费，冷却中可用通用券立即再战</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
        <button class="gold" data-action="buyticket" data-type="normal" data-amount="1" data-price="${ticketPrice}" ${state.gold < ticketPrice ? 'disabled' : ''}>
          🎫×1 — ${ticketPrice}💰
        </button>
        <button class="gold" data-action="buyticket" data-type="normal" data-amount="10" data-price="${bulkPrice}" ${state.gold < bulkPrice ? 'disabled' : ''}>
          🎫×10 — ${bulkPrice}💰 (85折)
        </button>
      </div>
      <div style="font-weight:bold;margin-bottom:4px">🐾 随从券商店</div>
      <div class="muted" style="margin-bottom:4px">抽取随从需要消耗随从券</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="gold" data-action="buyticket" data-type="comp" data-amount="1" data-price="${compTicketPrice}" ${state.gold < compTicketPrice ? 'disabled' : ''}>
          🐾×1 — ${compTicketPrice}💰
        </button>
        <button class="gold" data-action="buyticket" data-type="comp" data-amount="10" data-price="${compBulkPrice}" ${state.gold < compBulkPrice ? 'disabled' : ''}>
          🐾×10 — ${compBulkPrice}💰 (85折)
        </button>
      </div>
    </div>
    <div class="muted" style="margin-bottom:8px">📊 升级时全属性自动+1 · 装备和天赋为主要成长途径</div>
    <div class="shop-item"><b>💪 力量</b>
      <div class="muted">每点: 攻击力 +${primary==='str'?'1.5':'0'} · ${primary==='str'?'<span style="color:var(--accent)">当前职业主属性</span>':'战士/圣骑士主属性'}</div>
    </div>
    <div class="shop-item"><b>🏃 敏捷</b>
      <div class="muted">每点: 暴击率 +0.05% · 攻击力 +${primary==='agi'?'1.5':'0'}${primary==='agi'?' <span style="color:var(--accent)">（主属性）</span>':''}<br>盗贼/猎人/德鲁伊主属性</div>
    </div>
    <div class="shop-item"><b>📚 智力</b>
      <div class="muted">每点: 法力上限 +5 · 攻击力 +${primary==='int'?'1.5':'0'}${primary==='int'?' <span style="color:var(--accent)">（主属性）</span>':''}<br>法师/牧师/萨满/术士主属性</div>
    </div>
    <div class="shop-item"><b>🕯️ 精神</b>
      <div class="muted">每点: 生命回复 +0.2/秒 · 法力回复 +0.3/秒<br>影响战斗中资源续航</div>
    </div>
    <div class="shop-item"><b>❤️ 耐力</b>
      <div class="muted">每点: 生命上限 +10 · 防御 +0.3<br>全职业通用生存属性</div>
    </div>
    <div class="muted" style="margin-top:8px">🎯 <b>当前主属性: ${primaryName}</b> — 每点主属性提供 1.5 攻击力</div>
    ${renderSourceTable()}
  `;
}

/* ---------- 属性来源明细表(成长指南) ---------- */
function renderSourceTable() {
  const srcs = state._statSources;
  if (!srcs) return '<div class="muted" style="margin-top:12px">暂无来源数据</div>';
  const sourceOrder = ['天赋','成就','觉醒','生活','神器','坐骑','竞技场','被动','随从','装备','词缀','宝石','附魔','副本印记','套装'];
  const statCols = [
    {key:'atkPct', label:'攻击%', fmt:v => '+' + v.toFixed(1) + '%'},
    {key:'hpPct',  label:'生命%', fmt:v => '+' + v.toFixed(1) + '%'},
    {key:'defPct', label:'防御%', fmt:v => '+' + v.toFixed(1) + '%'},
    {key:'spdPct', label:'攻速%', fmt:v => '+' + v.toFixed(1) + '%'},
    {key:'critdPct', label:'暴伤%', fmt:v => '+' + v.toFixed(0) + '%'},
    {key:'crit', label:'暴击', fmt:v => '+' + v.toFixed(1)},
    {key:'leech', label:'吸血', fmt:v => '+' + v.toFixed(1)},
    {key:'vers', label:'全能', fmt:v => '+' + v.toFixed(1)},
    {key:'mastery', label:'精通', fmt:v => '+' + v.toFixed(1)},
    {key:'haste', label:'极速', fmt:v => '+' + v.toFixed(1)},
    {key:'regFlat', label:'回复', fmt:v => '+' + v.toFixed(0)},
    {key:'extraAtk', label:'额外攻击', fmt:v => '+' + v.toFixed(1) + '%'},
  ];
  // 收集哪些列有数据
  const activeCols = statCols.filter(col => {
    for (const src of sourceOrder) if (srcs[src] && (srcs[src][col.key] || 0) !== 0) return true;
    return (srcs._total && (srcs._total[col.key] || 0) !== 0);
  });
  if (activeCols.length === 0) return '';
  let html = `<details class="src-panel"><summary class="src-panel-title">📊 属性来源明细 <span class="muted">(共${activeCols.length}项, 点击展开)</span></summary>`;
  html += '<div class="src-scroll"><table class="src-table"><thead><tr><th>来源</th>';
  for (const col of activeCols) html += `<th>${col.label}</th>`;
  html += '</tr></thead><tbody>';
  for (const srcName of sourceOrder) {
    const d = srcs[srcName];
    if (!d) continue;
    // 检查是否有任何有效值
    let hasVal = false;
    for (const col of activeCols) { if ((d[col.key] || 0) !== 0) { hasVal = true; break; } }
    if (!hasVal) continue;
    html += `<tr><td class="src-name">${srcName}</td>`;
    for (const col of activeCols) {
      const v = d[col.key] || 0;
      html += `<td class="${v>0?'pos':v<0?'neg':''}">${v!==0?col.fmt(v):'—'}</td>`;
    }
    html += '</tr>';
  }
  // 合计行
  const total = srcs._total;
  if (total) {
    html += '<tr class="src-total"><td>合计</td>';
    for (const col of activeCols) {
      const v = total[col.key] || 0;
      html += `<td class="${v>0?'pos':v<0?'neg':''}">${v!==0?col.fmt(v):'—'}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table></div></details>';
  return html;
}

function renderSkills() {
  const c = getCls(); if (!c) return;
  if (typeof syncAllowedSkillUnlocks === 'function') syncAllowedSkillUnlocks();
  if (typeof pruneSelectedSkillsForCurrentSpec === 'function') pruneSelectedSkillsForCurrentSpec();
  const skl = $('skill-list');
  skl.innerHTML = `<div class="muted" style="margin-bottom:6px;font-size:11px">手动技能栏 <b style="color:var(--accent)">${state.selectedSkills.length}</b>/8 · 自动施法按上方分类使用已解锁技能 · 打断/控制会优先纯打断,瞬发控制兜底</div>`;
  const mech = (typeof CLASS_COMBAT_MECHANICS === 'object') ? CLASS_COMBAT_MECHANICS[state.cls] : null;
  if (mech) {
    const mechDiv = document.createElement('div');
    mechDiv.className = 'skill-item';
    mechDiv.style.borderColor = 'rgba(251,191,36,.55)';
    mechDiv.innerHTML = `
      <div class="row"><b style="color:#fde68a">${mech.icon || '✦'} 职业机制: ${mech.name}</b><span class="pill">核心玩法</span></div>
      <div class="muted" style="font-size:11px;line-height:1.45">${mech.desc}</div>`;
    skl.appendChild(mechDiv);
  }
  const specProfile = (typeof currentSpecSkillProfile === 'function') ? currentSpecSkillProfile() : null;
  if (specProfile) {
    const specDiv = document.createElement('div');
    specDiv.className = 'skill-item';
    specDiv.style.borderColor = 'rgba(96,165,250,.55)';
    specDiv.innerHTML = `
      <div class="row"><b style="color:#bfdbfe">${specProfile.icon || '🎯'} 当前专精: ${specProfile.name}</b><span class="pill">专精技能池</span></div>
      <div class="muted" style="font-size:11px;line-height:1.45">${specProfile.desc}</div>`;
    skl.appendChild(specDiv);
    const rule = (typeof currentSpecCombatRule === 'function') ? currentSpecCombatRule() : null;
    if (rule) {
      const meter = (typeof currentSpecCombatMeter === 'function') ? currentSpecCombatMeter() : null;
      const tactic = (typeof currentSpecTacticalWindow === 'function') ? currentSpecTacticalWindow() : null;
      const meterHtml = meter ? `
        <div class="bar xp" style="height:14px;margin:7px 0 4px"><i style="width:${meter.pct || 0}%;background:linear-gradient(90deg,#f472b6,#facc15)"></i><span>${meter.icon || '✦'} ${meter.name}: ${meter.stacks || 0}/${meter.max || 0}</span></div>
        <div class="muted" style="font-size:10px;line-height:1.35">${meter.hint || ''} · 高等级怪物、首领和副本敌人会获得“专精适应”,在你接近满层爆发时触发反制护盾/急速。</div>` : '';
      const tacticHtml = tactic ? `<div class="muted" style="font-size:10px;line-height:1.45;margin-top:5px;color:#fde68a">${tactic.icon || '✦'} 战术窗口: ${tactic.name} · ${tactic.desc}</div>` : '';
      const ruleDiv = document.createElement('div');
      ruleDiv.className = 'skill-item';
      ruleDiv.style.borderColor = 'rgba(244,114,182,.55)';
      ruleDiv.innerHTML = `
        <div class="row"><b style="color:#fbcfe8">${rule.icon || '✦'} 专精特色: ${rule.name}</b><span class="pill">实战规则</span></div>
        <div class="muted" style="font-size:11px;line-height:1.45">${rule.desc}</div>
        ${meterHtml}${tacticHtml}`;
      skl.appendChild(ruleDiv);
    }
  } else {
    const hintDiv = document.createElement('div');
    hintDiv.className = 'skill-item';
    hintDiv.style.borderColor = 'rgba(148,163,184,.35)';
    hintDiv.innerHTML = `<div class="muted" style="font-size:11px;line-height:1.45">未选择专精时只显示少量入门技能。选择专精后,技能页会切换为该专精独有技能池。</div>`;
    skl.appendChild(hintDiv);
  }
  for (const [skKey, sk] of classSkillEntriesSorted(c)) {
    const unlocked = !!state.unlockedSkills[skKey];
    const isSel = state.selectedSkills.includes(skKey);
    const cdSec = getSkillCd(sk);
    const div = document.createElement('div');
    div.className = 'skill-item';
    div.style.borderColor = isSel ? 'var(--accent)' : '';
    const lockInfo = sk.unlockLvl ? `(等级${sk.unlockLvl})` : '(天赋解锁)';
    const baseDesc = sk._baseDesc || sk.desc || '';
    const detailDesc = sk._detailDesc || '';
    const skillIconHtml = (typeof skillIcon === 'function') ? skillIcon(sk.name, 18, skillVisualFallback(sk)) : sk.icon;
    const castLabel = sk.castTime > 0 ? `${sk.castTime}秒读条` : '瞬发';
    const autoTags = skillAutoRoleTagsHtml(skKey, sk);
    div.innerHTML = `
      <div class="row">
        <b style="color:${unlocked?'inherit':'var(--muted)'}">${skillIconHtml} ${sk.name}</b>
        <span class="pill">${unlocked?'已解锁':lockInfo}</span>
      </div>
      <div class="muted">${baseDesc}</div>
      ${autoTags}
      ${detailDesc ? `<div class="muted" style="margin-top:4px;color:#cbd5e1;font-size:11px;line-height:1.45">联动: ${detailDesc}</div>` : ''}
      <div class="row">
        <span class="muted">${c.resource} ${sk.mp} · 冷却 ${cdSec}秒 · ${castLabel}</span>
        ${unlocked ? `<button class="${isSel?'success':''}" data-action="selectskill" data-key="${skKey}">${isSel?'取消':'选用'}</button>` : ''}
      </div>`;
    skl.appendChild(div);
  }
}

function skillAutoRoleTagsHtml(skillKey, sk) {
  if (!sk) return '';
  const tags = [];
  const kind = (typeof autoSkillKind === 'function') ? autoSkillKind(skillKey, sk) : (sk.type === 'interrupt' ? 'interrupt' : 'damage');
  const kindMap = {
    damage:['伤害', 'dmg'],
    burst:['爆发', 'burst'],
    buff:['Buff/治疗/减伤', 'buff'],
    interrupt:['打断/控制', 'interrupt']
  };
  const km = kindMap[kind] || kindMap.damage;
  tags.push({ text:`自动:${km[0]}`, cls:km[1] });
  const castTime = (typeof getCastTime === 'function') ? getCastTime(sk) : (sk.castTime || 0);
  if (sk.type === 'interrupt') tags.push({ text:'应急打断', cls:'interrupt' });
  else if (sk.interruptCast && castTime <= 0) tags.push({ text:'应急控制打断', cls:'interrupt' });
  else if (sk.interruptCast) tags.push({ text:'读条控制:命中可断', cls:'control' });
  if (typeof bossCastResponseKind === 'function') {
    const response = bossCastResponseKind(skillKey, sk);
    if (response === 'heal') tags.push({ text:'读条保命:治疗', cls:'heal' });
    else if (response === 'defensive') tags.push({ text:'读条保命:减伤', cls:'defensive' });
  }
  if (!tags.length) return '';
  return `<div class="skill-role-tags">${tags.map(t => `<span class="skill-role-tag ${t.cls}">${tipAttrText(t.text)}</span>`).join('')}</div>`;
}

function getTalentRow(t, idx) {
  if (typeof t.req === 'number' && t.req > 0) {
    for (let i = TALENT_ROW_REQ.length - 1; i >= 0; i--) {
      if (t.req >= TALENT_ROW_REQ[i]) return i;
    }
  }
  if (idx >= 4) return 2;
  if (idx >= 2) return 1;
  return 0;
}
const TALENT_ROW_REQ = [0, 5, 10, 15, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56];

function bossCastResponseKind(skillKey, sk) {
  if (!sk) return '';
  if (sk.type === 'heal' || sk.heal || sk.healPct) return 'heal';
  if (typeof isDefensiveSkill === 'function' && isDefensiveSkill(skillKey, sk)) return 'defensive';
  const text = `${sk.name || ''} ${sk.desc || ''} ${sk.buff || ''}`;
  if (/治疗|恢复|圣疗|愈合|链疗|宁静|生命/.test(text)) return 'heal';
  if (/减伤|护盾|盾|屏障|壁垒|防御|格挡|闪避|圣盾|守护|树皮|冰箱|庇护/.test(text)) return 'defensive';
  return '';
}

function bossCastUsableSkillState(entry, now) {
  if (!entry?.sk) return { left:Infinity, cost:0, ready:false };
  const left = Math.max(0, (state.skillCooldowns?.[entry.key] || 0) - now);
  let cost = Math.max(0, entry.sk.mp || 0);
  if (state.hero?.costReduction > 0) cost = Math.max(1, Math.floor(cost * (1 - state.hero.costReduction / 100)));
  return { left, cost, ready:left <= 0 && (state.resource || 0) >= cost };
}

function bossCastBestSkill(entries, now) {
  let ready = null, soonestLeft = Infinity;
  for (const x of entries) {
    const use = bossCastUsableSkillState(x, now);
    if (use.left < soonestLeft) soonestLeft = use.left;
    if (use.ready && !ready) ready = x;
  }
  return { ready, soonestLeft };
}

function bossCastUiState(now) {
  if (typeof bossCasting === 'undefined' || !bossCasting) return null;
  const duration = Math.max(1, bossCasting.duration || 1);
  const elapsed = Math.max(0, now - (bossCasting.startTime || now));
  const remainMs = Math.max(0, duration - elapsed);
  const finalWindow = elapsed / duration >= 0.70 || remainMs <= 1000;
  const threatMeta = (typeof bossCastThreatMeta === 'function') ? bossCastThreatMeta(bossCasting) : { label:'危险', text:'#fecaca' };
  const interruptText = (typeof bossInterruptTag === 'function') ? bossInterruptTag(bossCasting) : '可断';
  const canInterrupt = bossCasting.interruptPolicy !== 'none';
  const urgent = canInterrupt && (bossCasting.interruptPolicy === 'hard' || bossCasting._empowered || bossCasting.threat === 'high' || bossCasting.threat === 'extreme');
  const c = getCls();
  const selected = Array.isArray(state.selectedSkills) ? state.selectedSkills : [];
  const entries = selected.map(key => ({ key, sk:c?.skills?.[key] })).filter(x => x.sk);
  const interruptSkills = entries.filter(x => x.sk.type === 'interrupt' || x.sk.interruptCast);
  const responseSkills = entries
    .map(x => Object.assign({}, x, { kind:bossCastResponseKind(x.key, x.sk) }))
    .filter(x => x.kind);
  const manualInterrupt = bossCastBestSkill(interruptSkills, now);
  const manualResponse = bossCastBestSkill(responseSkills, now);
  const autoEntries = (state.autoSkill && typeof autoCastSkillEntries === 'function') ? autoCastSkillEntries(c) : [];
  const autoInterruptSkills = (canInterrupt && state.autoSkill && typeof autoSkillKindEnabled === 'function' && autoSkillKindEnabled('interrupt'))
    ? autoEntries
      .map(([key, sk], order) => ({ key, sk, order, auto:true, candidate:(typeof autoInterruptCandidateRank === 'function') ? autoInterruptCandidateRank(key, sk, order) : null }))
      .filter(x => x.candidate)
      .sort((a, b) => a.candidate.priority - b.candidate.priority || (a.sk.cd || 0) - (b.sk.cd || 0) || a.order - b.order)
    : [];
  const autoResponseSkills = state.autoSkill
    ? autoEntries
      .map(([key, sk]) => Object.assign({ key, sk, auto:true }, { kind:bossCastResponseKind(key, sk) }))
      .filter(x => x.kind && (typeof autoSkillAllowed !== 'function' || autoSkillAllowed(x.key, x.sk)))
    : [];
  const autoInterrupt = bossCastBestSkill(autoInterruptSkills, now);
  const autoResponse = bossCastBestSkill(autoResponseSkills, now);
  const ready = manualInterrupt.ready || autoInterrupt.ready;
  const responseReady = manualResponse.ready || autoResponse.ready;
  const soonestLeft = Math.min(manualInterrupt.soonestLeft, autoInterrupt.soonestLeft);
  const responseSoonestLeft = Math.min(manualResponse.soonestLeft, autoResponse.soonestLeft);
  const interruptCount = interruptSkills.length + autoInterruptSkills.length;
  const responseCount = responseSkills.length + autoResponseSkills.length;
  const responseText = responseReady
    ? `${responseReady.auto ? '自动' : ''}${responseReady.kind === 'heal' ? '治疗' : '减伤'}: ${responseReady.sk.name}`
    : responseCount
      ? (responseSoonestLeft <= 0 ? '保命技能缺资源' : `保命技能还差 ${Math.ceil(responseSoonestLeft / 1000)}秒`)
      : '保留资源,准备硬吃';
  const action = !canInterrupt
    ? `不可打断,${responseText}`
    : ready
      ? `${ready.auto ? '自动' : ''}${urgent ? '立刻打断' : '可打断'}: ${ready.sk.name}`
      : interruptCount
        ? (urgent ? `打断未就绪,${responseText}` : (soonestLeft <= 0 ? '打断缺资源' : `打断未就绪,还差 ${Math.ceil(soonestLeft / 1000)}秒`))
        : `没有可用打断,${responseText}`;
  return { cast:bossCasting, duration, elapsed, remainMs, finalWindow, threatMeta, interruptText, canInterrupt, urgent, ready, responseReady, interruptCount, action };
}

function bossCastSkillPrompt(skillKey, sk, now, cdMs) {
  const ui = bossCastUiState(now);
  if (!ui || !sk) return null;
  const cost = Math.max(0, sk.mp || 0);
  const ready = (cdMs || 0) <= 0 && (state.resource || 0) >= cost;
  if (ui.canInterrupt && (sk.type === 'interrupt' || sk.interruptCast)) {
    const hard = ui.urgent || ui.cast?.interruptPolicy === 'hard';
    const label = ready ? (hard ? '必断' : '可断') : (cdMs > 0 ? `${Math.ceil(cdMs / 1000)}秒` : '缺资源');
    const cls = ready ? (hard ? 'interrupt-hot' : 'interrupt-soft') : 'interrupt-wait';
    const action = ready
      ? (hard ? '现在点击:打断读条并制造破绽窗口' : '现在点击:打断或削弱这次读条')
      : (cdMs > 0 ? `暂时不能用:还差 ${Math.ceil(cdMs / 1000)}秒` : '暂时不能用:资源不足');
    const tip = `${ui.cast.icon || ''}${ui.cast.name || '施法'} · ${ui.threatMeta.label} · ${ui.interruptText} · ${action}`;
    return { label, cls, tip, final:ui.finalWindow, urgent:hard, timerPct:Math.max(0, Math.min(100, ui.remainMs / Math.max(1, ui.duration) * 100)) };
  }
  const kind = bossCastResponseKind(skillKey, sk);
  const needsBackup = !ui.canInterrupt || !ui.ready || ui.urgent;
  if (!kind || !needsBackup || (!ui.urgent && ui.canInterrupt && ui.interruptCount > 0)) return null;
  const label = ready ? (kind === 'heal' ? '治疗' : '减伤') : (cdMs > 0 ? `${Math.ceil(cdMs / 1000)}秒` : '缺资源');
  const cls = ready ? (kind === 'heal' ? 'heal-hot' : 'defensive-hot') : 'defensive-wait';
  const action = ready
    ? (kind === 'heal' ? '现在点击:用治疗覆盖这次读条' : '现在点击:用减伤/护盾覆盖这次读条')
    : (cdMs > 0 ? `暂时不能用:还差 ${Math.ceil(cdMs / 1000)}秒` : '暂时不能用:资源不足');
  const tip = `${ui.cast.icon || ''}${ui.cast.name || '施法'} · ${ui.threatMeta.label} · ${ui.interruptText} · ${action}`;
  return { label, cls, tip, final:ui.finalWindow, urgent:ui.urgent, timerPct:Math.max(0, Math.min(100, ui.remainMs / Math.max(1, ui.duration) * 100)) };
}

function updateBossIntentLine(now) {
  const el = $('boss-intent-line');
  if (!el) return;
  const ui = bossCastUiState(now);
  if (!ui) {
    el.style.display = 'none';
    el.textContent = '';
    el.removeAttribute('title');
    return;
  }
  const readyToStop = !!ui.ready;
  el.classList.toggle('urgent', ui.canInterrupt && ui.urgent && readyToStop);
  el.classList.toggle('wait', ui.canInterrupt && ui.urgent && !readyToStop);
  el.classList.toggle('soft', ui.canInterrupt && !ui.urgent);
  el.classList.toggle('none', !ui.canInterrupt);
  el.style.display = '';
  const cast = ui.cast;
  const remain = (ui.remainMs / 1000).toFixed(1);
  const castName = `${cast.icon || '💀'} ${cast.name || '施法'}`;
  const html = `<span class="intent-token cast">${castName}</span><span class="intent-token threat">${ui.threatMeta.label}</span><span class="intent-token rule">${ui.interruptText}</span><span class="intent-token time">${remain}s</span><span class="intent-action">${ui.action}</span>`;
  el.title = `${cast.name || '施法'}: ${ui.action}`;
  if (el.innerHTML !== html) el.innerHTML = html;
}

function renderTalents() {
  const c = getCls(); if (!c) return;
  if (typeof renderLoadouts === 'function') renderLoadouts();
  $('talent-points').textContent = state.talentPoints;
  const rb = $('btn-reset-talents'); if (rb) rb.textContent = state.freeRespecUsed ? '洗点 50💎' : '洗点 (首次免费)';
  const tl = $('talent-list');
  tl.innerHTML = '';

  // 专精选择横幅
  const specBar = document.createElement('div');
  specBar.style.cssText = 'display:flex;gap:4px;margin-bottom:8px';
  for (const tree of c.trees) {
    const isSpec = state.specialization === tree.key;
    const btn = document.createElement('button');
    btn.className = isSpec ? 'epic' : '';
    btn.style.cssText = `flex:1;padding:8px 4px;font-size:13px;${isSpec?'font-weight:bold':''}`;
    btn.innerHTML = `${specIcon(state.cls, tree.key, 18, tree.icon)} ${tree.name}`;
    btn.addEventListener('click', () => {
      if (state.specialization === tree.key) return; // 不能取消,只能切换
      state.specialization = tree.key;
      if (typeof syncAllowedSkillUnlocks === 'function') syncAllowedSkillUnlocks({ logNew:true });
      if (typeof pruneSelectedSkillsForCurrentSpec === 'function') pruneSelectedSkillsForCurrentSpec();
      recomputeStats();
      markDirty('talents', 'skills', 'stage', 'hero');
    });
    specBar.appendChild(btn);
  }
  tl.appendChild(specBar);

  if (state.specialization) {
    const specTree = c.trees.find(t=>t.key===state.specialization);
    tl.appendChild(Object.assign(document.createElement('div'), {
      className: 'muted',
      style: 'text-align:center;margin-bottom:8px;font-size:11px',
      innerHTML: `🎯 精通(${state.hero.mastery||0}): ${(typeof masteryDescText==='function')?masteryDescText():(specTree?.masteryDesc||'')}`
    }));
  }

  // 渲染三棵树
  for (const tree of c.trees) {
    const isActive = tree.key === state.specialization;
    if (state.specialization && !isActive) continue;   // 已选专精:仅显示该专精的天赋树
    const sumInTree = Object.values(state.talents[tree.key] || {}).reduce((a,b)=>a+b, 0);
    const treeDiv = document.createElement('div');
    treeDiv.className = 'wow-tree' + (isActive ? ' active' : ' locked');

    // 树头
    const head = document.createElement('div');
    head.className = 'wow-tree-head';
    head.innerHTML = `<b>${specIcon(state.cls, tree.key, 18, tree.icon)} ${tree.name}</b><span class="pill">${sumInTree}</span>`;
    treeDiv.appendChild(head);

    if (!isActive && !state.specialization) {
      // 未选专精: 提示
      const hint = document.createElement('div');
      hint.className = 'muted';
      hint.style.cssText = 'text-align:center;padding:8px;font-size:11px';
      hint.textContent = '请先选择专精';
      treeDiv.appendChild(hint);
    } else if (!isActive) {
      // 其他专精: 灰色显示
      const locked = document.createElement('div');
      locked.className = 'muted';
      locked.style.cssText = 'text-align:center;padding:6px;font-size:11px';
      locked.textContent = '已选择其他专精';
      treeDiv.appendChild(locked);
    }

    // 按行分组渲染天赋
    const talentsByRow = {};
    for (let i = 0; i < tree.talents.length; i++) {
      const t = tree.talents[i];
      const row = getTalentRow(t, i);
      if (!talentsByRow[row]) talentsByRow[row] = [];
      talentsByRow[row].push({...t, idx: i});
    }

    const maxRow = Math.max(...Object.keys(talentsByRow).map(Number));
    for (let row = 0; row <= maxRow; row++) {
      const rowTalents = talentsByRow[row] || [];
      if (rowTalents.length === 0) continue;   // 跳过无天赋的空行(某些树有 req 断档,否则只渲染"需X点"标签=空内容)
      const rowDiv = document.createElement('div');
      rowDiv.className = 'wow-row';
      rowDiv.dataset.row = row;

      // 行标签
      const rowLabel = document.createElement('div');
      rowLabel.className = 'wow-row-label';
      rowLabel.textContent = `需${TALENT_ROW_REQ[row] || 0}点`;
      rowDiv.appendChild(rowLabel);

      const nodes = document.createElement('div');
      nodes.className = 'wow-nodes';

      for (const t of rowTalents) {
        const cur = isActive ? ((state.talents[tree.key]||{})[t.key] || 0) : 0;
        const maxed = cur >= t.max;
        const reqMet = isActive && (!t.req || sumInTree >= t.req);
        const canBuy = isActive && !maxed && reqMet && state.talentPoints > 0;
        const reqBadge = (!reqMet && isActive && t.req) ? `<span class="ranks">需${t.req}点</span>` : '';
        const node = document.createElement('div');
        node.className = 'wow-node' +
          (maxed ? ' maxed' : '') +
          (canBuy ? ' can-buy' : '') +
          (!isActive ? ' inactive' : '') +
          (!reqMet && isActive ? ' locked' : '');

        node.innerHTML = `
          <div class="wow-node-icon">${t.name[0]}</div>
          <div class="wow-node-info">
            <div class="wow-node-name">${t.name} <span class="ranks">${cur}/${t.max}</span>${reqBadge}</div>
            <div class="wow-node-desc">${t.desc}</div>
          </div>`;

        if (canBuy) {
          node.style.cursor = 'pointer';
          node.addEventListener('click', () => buyTalent(tree.key, t.key));
        }
        nodes.appendChild(node);
      }
      rowDiv.appendChild(nodes);
      treeDiv.appendChild(rowDiv);
    }
    tl.appendChild(treeDiv);
  }
}

function renderSkillBar() {
  const bar = $('skill-bar');
  if (!bar) return;
  const c = getCls(); if (!c) return;
  if (typeof pruneSelectedSkillsForCurrentSpec === 'function') pruneSelectedSkillsForCurrentSpec();
  const now = Date.now();

  if (state.selectedSkills.length === 0) {
    bar.innerHTML = '<div class="muted" style="font-size:11px;text-align:center;padding:4px">未设置手动技能栏(自动施法仍会使用全部已解锁技能)</div>';
    return;
  }

  bar.innerHTML = state.selectedSkills.map(key => {
    const sk = c.skills[key];
    if (!sk) return '';
    const cdEnd = state.skillCooldowns[key] || 0;
    const cdMs = Math.max(0, cdEnd - now);
    const onCd = cdMs > 0;
    let useCost = Math.max(0, sk.mp || 0);
    if(state.hero?.costReduction > 0) useCost = Math.max(1, Math.floor(useCost * (1 - state.hero.costReduction / 100)));
    if(sk.consumeRage && c.resKey === 'rage') useCost = Math.min(Math.max(10, useCost), Math.max(10, state.resource || 0));
    const hasMp = (state.resource || 0) >= useCost;
    const cdTotalMs = Math.max(1, Math.round((getSkillCd(sk) * 1000) / ((typeof castSpeedMul === 'function') ? castSpeedMul() : 1)));
    const cdAngle = onCd ? Math.round((1 - Math.min(1, cdMs / cdTotalMs)) * 360) : 360;
    const useStateClass = onCd ? '' : (hasMp ? 'action-ready' : 'resource-starved');
    const bossPrompt = bossCastSkillPrompt(key, sk, now, cdMs);
    const proc = (typeof currentSpecProcSystem === 'function') ? currentSpecProcSystem() : null;
    const activeProc = proc && state.skillRuntime && state.skillRuntime.specProc && state.skillRuntime.specProc.key === proc.key && (!state.skillRuntime.specProc.expire || state.skillRuntime.specProc.expire > now);
    const procText = `${key} ${sk.name || ''} ${sk.desc || ''} ${sk.type || ''}`;
    if (proc && proc.spender && (proc.spender.global || proc.spender.sticky)) proc.spender.lastIndex = 0;
    const procMatch = !!(activeProc && proc && proc.spender && proc.spender.test(procText));
    const core = (typeof currentSpecCoreSystem === 'function') ? currentSpecCoreSystem() : null;
    const coreAura = state.skillRuntime && state.skillRuntime.auras && state.skillRuntime.auras.spec_core;
    const coreReady = !!(core && coreAura && coreAura.stacks >= (core.threshold || core.max || 6));
    if (core && core.spender && (core.spender.global || core.spender.sticky)) core.spender.lastIndex = 0;
    const coreMatch = !!(coreReady && core && core.spender && core.spender.test(procText));
    const baseDesc = sk._baseDesc || sk.desc || '';
    const detailDesc = sk._detailDesc ? `\n联动: ${sk._detailDesc}` : '';
    const procDesc = procMatch ? `\n临场强化: ${proc.name} · ${proc.desc}` : '';
    const coreDesc = coreMatch ? `\n专精核心: ${core.name} 已满层,释放该技能会收束: ${core.desc}` : '';
    const engineText = (typeof specEngineDescText === 'function') ? specEngineDescText() : '';
    const engineDesc = engineText ? `\n专精引擎强化: ${engineText}` : '';
    const elementTip = (typeof skillElementReactionTip === 'function') ? skillElementReactionTip(key, sk) : '';
    const elementDesc = elementTip ? `\n状态反应: ${elementTip}` : '';
    const echoTip = (typeof skillEchoTip === 'function') ? skillEchoTip(key, sk) : '';
    const echoDesc = echoTip ? `\n技能余波: ${echoTip}` : '';
    const markTip = (typeof skillMarkTip === 'function') ? skillMarkTip(key, sk) : '';
    const markDesc = markTip ? `\n技能判词: ${markTip}` : '';
    const weaveTip = (typeof skillWeaveTip === 'function') ? skillWeaveTip(key, sk) : '';
    const weaveDesc = weaveTip ? `\n技能织法: ${weaveTip}` : '';
    const rhythmTip = (typeof skillRhythmTip === 'function') ? skillRhythmTip(key, sk) : '';
    const rhythmDesc = rhythmTip ? `\n战斗律动: ${rhythmTip}` : '';
    const controlTip = (typeof skillControlTip === 'function') ? skillControlTip(key, sk) : '';
    const controlDesc = controlTip ? `\n控场清算: ${controlTip}` : '';
    const weaknessTip = (typeof skillWeaknessTip === 'function') ? skillWeaknessTip(key, sk) : '';
    const weaknessDesc = weaknessTip ? `\n弱点洞察: ${weaknessTip}` : '';
    const prepTip = (typeof skillPrepTip === 'function') ? skillPrepTip(key, sk) : '';
    const prepDesc = prepTip ? `\n技能蓄势: ${prepTip}` : '';
    const overloadTip = (typeof skillOverloadTip === 'function') ? skillOverloadTip(key, sk) : '';
    const overloadDesc = overloadTip ? `\n技能过载: ${overloadTip}` : '';
    const resourceTip = (typeof skillResourceTip === 'function') ? skillResourceTip(key, sk) : '';
    const resourceDesc = resourceTip ? `\n资源回路: ${resourceTip}` : '';
    const harvestTip = (typeof skillHarvestTip === 'function') ? skillHarvestTip(key, sk) : '';
    const harvestDesc = harvestTip ? `\n斩获连锁: ${harvestTip}` : '';
    const pactTip = (typeof skillPactTip === 'function') ? skillPactTip(key, sk) : '';
    const pactDesc = pactTip ? `\n契约代价: ${pactTip}` : '';
    const fieldTip = (typeof skillFieldTip === 'function') ? skillFieldTip(key, sk) : '';
    const fieldDesc = fieldTip ? `\n战场领域: ${fieldTip}` : '';
    const chargeTip = (typeof skillChargeTip === 'function') ? skillChargeTip(key, sk) : '';
    const chargeDesc = chargeTip ? `\n技能充能: ${chargeTip}` : '';
    const runeTip = (typeof skillRuneTip === 'function') ? skillRuneTip(key, sk) : '';
    const runeDesc = runeTip ? `\n符文铭刻: ${runeTip}` : '';
    const baseTip = `${sk.name} · ${baseDesc}${detailDesc}${procDesc}${coreDesc}${engineDesc}${elementDesc}${echoDesc}${markDesc}${weaveDesc}${rhythmDesc}${controlDesc}${weaknessDesc}${prepDesc}${overloadDesc}${resourceDesc}${harvestDesc}${pactDesc}${fieldDesc}${chargeDesc}${runeDesc}\n${c.resource} ${sk.mp} · 冷却 ${getSkillCd(sk)}秒`;
    const tip = `${baseTip}${bossPrompt ? `\nBoss读条: ${bossPrompt.tip}` : ''}`.replace(/"/g, '&quot;');
    const baseTipAttr = baseTip.replace(/"/g, '&quot;');
    const skillIconHtml = (typeof skillIcon === 'function') ? skillIcon(sk.name, 18, sk.icon) : sk.icon;
    const bossPromptClass = bossPrompt ? `boss-cast-prompt ${bossPrompt.cls || ''} ${bossPrompt.final ? 'boss-cast-final' : ''}` : '';
    return `<button class="skill-btn ${onCd?'on-cd':''} ${useStateClass} ${bossPromptClass}" data-skill="${key}" data-cd-active="${onCd?'1':'0'}" data-resource-ready="${hasMp?'1':'0'}" data-cd-total="${cdTotalMs}" draggable="true" title="${tip}" data-base-title="${baseTipAttr}"
      style="--cd-angle:${cdAngle}deg;${bossPrompt ? `--boss-cast-pct:${Math.round(bossPrompt.timerPct || 0)}%;` : ''}${coreMatch&&!onCd?'border-color:#38bdf8;box-shadow:0 0 0 1px rgba(56,189,248,.50),0 0 14px rgba(56,189,248,.18)':(procMatch&&!onCd?'border-color:#facc15;box-shadow:0 0 0 1px rgba(250,204,21,.45)':(!onCd&&hasMp?'border-color:var(--accent)':''))}">
      <span>${skillIconHtml} ${sk.name}</span>
      <span class="mp-cost">${coreMatch?'✹ ':(procMatch?'✦ ':'')}${sk.mp}${c.resKey==='rage'?'怒':c.resKey==='energy'?'能':'蓝'}</span>
      ${onCd?`<div class="cd-overlay" style="--cd-angle:${cdAngle}deg">${(cdMs/1000).toFixed(1)}秒</div>`:''}
      ${bossPrompt ? `<span class="sk-alert">${bossPrompt.label}</span>` : ''}
      ${bossPrompt ? '<span class="boss-cast-timer"></span>' : ''}
    </button>`;
  }).join('');
}

function updateSkillBarCd() {
  const bar = $('skill-bar'); if (!bar) return;
  const now = Date.now();
  const c = getCls();
  bar.querySelectorAll('.skill-btn').forEach(btn => {
    const key = btn.dataset.skill;
    if (!key) return;
    const sk = c?.skills?.[key];
    const cdEnd = state.skillCooldowns[key] || 0;
    const cdMs = Math.max(0, cdEnd - now);
    const cdTotalMs = Math.max(1, Number(btn.dataset.cdTotal) || (sk ? Math.round((getSkillCd(sk) * 1000) / ((typeof castSpeedMul === 'function') ? castSpeedMul() : 1)) : 1000));
    const cdAngle = cdMs > 0 ? Math.round((1 - Math.min(1, cdMs / cdTotalMs)) * 360) : 360;
    btn.style.setProperty('--cd-angle', cdAngle + 'deg');
    const cdTxt = (cdMs / 1000).toFixed(1) + '秒';
    const overlay = btn.querySelector('.cd-overlay');
    const wasOnCd = btn.dataset.cdActive === '1' || btn.classList.contains('on-cd');
    let useCost = Math.max(0, sk?.mp || 0);
    if(state.hero?.costReduction > 0) useCost = Math.max(1, Math.floor(useCost * (1 - state.hero.costReduction / 100)));
    if(sk?.consumeRage && c?.resKey === 'rage') useCost = Math.min(Math.max(10, useCost), Math.max(10, state.resource || 0));
    const hasResource = (state.resource || 0) >= useCost;
    const wasResourceReady = btn.dataset.resourceReady === '1';
    btn.dataset.resourceReady = hasResource ? '1' : '0';
    if (cdMs > 0) {
      btn.dataset.cdActive = '1';
      btn.classList.add('on-cd');
      btn.classList.remove('action-ready', 'resource-starved');
      if (overlay) {
        overlay.textContent = cdTxt;
        overlay.style.setProperty('--cd-angle', cdAngle + 'deg');
      }
      else { const d=document.createElement('div');d.className='cd-overlay';d.textContent=cdTxt;d.style.setProperty('--cd-angle', cdAngle + 'deg');btn.appendChild(d); }
    } else {
      btn.dataset.cdActive = '0';
      btn.classList.remove('on-cd');
      btn.classList.toggle('action-ready', hasResource);
      btn.classList.toggle('resource-starved', !hasResource);
      if (overlay) overlay.remove();
      if (wasOnCd) {
        btn.classList.remove('skill-ready-flash');
        void btn.offsetWidth;
        btn.classList.add('skill-ready-flash');
        setTimeout(() => btn.classList.remove('skill-ready-flash'), 820);
      }
      if (hasResource && !wasResourceReady && !wasOnCd) {
        btn.classList.remove('skill-resource-flash');
        void btn.offsetWidth;
        btn.classList.add('skill-resource-flash');
        setTimeout(() => btn.classList.remove('skill-resource-flash'), 760);
      }
    }
    const prompt = sk ? bossCastSkillPrompt(key, sk, now, cdMs) : null;
    btn.classList.toggle('interrupt-hot', prompt?.cls === 'interrupt-hot');
    btn.classList.toggle('interrupt-soft', prompt?.cls === 'interrupt-soft');
    btn.classList.toggle('interrupt-wait', prompt?.cls === 'interrupt-wait');
    btn.classList.toggle('defensive-hot', prompt?.cls === 'defensive-hot');
    btn.classList.toggle('heal-hot', prompt?.cls === 'heal-hot');
    btn.classList.toggle('defensive-wait', prompt?.cls === 'defensive-wait');
    btn.classList.toggle('boss-cast-prompt', !!prompt);
    btn.classList.toggle('boss-cast-final', !!prompt?.final);
    btn.style.setProperty('--boss-cast-pct', prompt ? `${Math.round(prompt.timerPct || 0)}%` : '0%');
    let badge = btn.querySelector('.sk-alert');
    if(prompt){
      if(!badge){
        badge = document.createElement('span');
        badge.className = 'sk-alert';
        btn.appendChild(badge);
      }
      if(badge.textContent !== prompt.label) badge.textContent = prompt.label;
    }else if(badge){
      badge.remove();
    }
    let timer = btn.querySelector('.boss-cast-timer');
    if(prompt){
      if(!timer){
        timer = document.createElement('span');
        timer.className = 'boss-cast-timer';
        btn.appendChild(timer);
      }
    }else if(timer){
      timer.remove();
    }
    const baseTitle = btn.dataset.baseTitle || btn.title || '';
    const nextTitle = prompt ? `${baseTitle}\nBoss读条: ${prompt.tip}` : baseTitle;
    if(btn.title !== nextTitle) btn.title = nextTitle;
  });
}

function renderMap() {
  if (typeof renderZoneBountyHub === 'function') renderZoneBountyHub();
  const mapCur = getMap();
  if (mapCur) {
    const subCur = mapCur.sub[state.currentSubzone];
    const mapCurIconHtml = symbolIconHtml(mapCur.icon, 16, mapCur.name, 'inv_misc_map_01');
    if (subCur) $('cur-location').innerHTML = `${mapCurIconHtml} ${mapCur.name} · ${subCur.name} (${typeof contentRangeLabel === 'function' ? contentRangeLabel(subCur.lvl[0], subCur.lvl[1]) : `等级${subCur.lvl[0]}-${subCur.lvl[1]}`})`;
    else $('cur-location').innerHTML = `${mapCurIconHtml} ${mapCur.name}`;
  }
  const ml = $('map-list');
  ml.innerHTML = '';
  const sortedMaps = [...MAPS].sort((a, b) => {
    const aMid = (a.lvlRange[0] + a.lvlRange[1]) / 2;
    const bMid = (b.lvlRange[0] + b.lvlRange[1]) / 2;
    const hl = (typeof playerProgressLevel === 'function') ? playerProgressLevel() : state.hero.lvl;
    const aFit = hl >= a.lvlRange[0] && hl <= a.lvlRange[1];
    const bFit = hl >= b.lvlRange[0] && hl <= b.lvlRange[1];
    if (aFit !== bFit) return aFit ? -1 : 1;
    return Math.abs(hl - aMid) - Math.abs(hl - bMid);
  });
  for (const m of sortedMaps) {
    const isCurrent = m.key === state.currentMap;
    const progressLvl = (typeof playerProgressLevel === 'function') ? playerProgressLevel() : state.hero.lvl;
    const tooHigh = progressLvl < m.lvlRange[0] - 3;
    const div = document.createElement('div');
    div.className = 'map-item' + (isCurrent ? ' current' : '') + (tooHigh ? ' warn' : '');
    div.dataset.mapKey = m.key;
    const bossPanelIcon = (typeof entityIcon === 'function') ? entityIcon(m.boss.name, 18, m.boss.emoji) : m.boss.emoji;
    const mapIconHtml = symbolIconHtml(m.icon, 18, m.name, 'inv_misc_map_01');
    const mapArt = m.art ? `<div class="map-art-banner" style="background-image:linear-gradient(180deg, rgba(11,15,25,.14), rgba(11,15,25,.72)), url('${m.art}')"></div>` : '';
    const mapThreatTags = worldZoneThreatTagsHtml(m, m.sub?.[0], { count:(m.lvlRange?.[1] || 1) >= 70 ? 2 : 1 });
    const mapFieldOpTag = worldFieldOperationTagHtml(m, 0, { metaVisible:true, previewOnly:!(m.key === state.currentMap && state.currentSubzone === 0) });
    const renownTag = worldRenownTagHtml(m, { metaVisible:true });
    let html = `
      <div class="map-head">
        <span class="mname">${mapIconHtml} ${m.name}</span>
        <span><span class="map-faction faction-${m.faction}">${m.faction}</span> <span class="pill">${typeof contentRangeLabel === 'function' ? contentRangeLabel(m.lvlRange[0], m.lvlRange[1]) : `等级${m.lvlRange[0]}-${m.lvlRange[1]}`}</span></span>
      </div>
      ${mapArt}
      <div class="map-desc">${m.desc}${tooHigh?' · ⚠️ 当前终局进度偏低,请谨慎推进':''}</div>
      ${renownTag ? `<div class="muted" style="font-size:11px;margin:4px 0 6px">区域声望 ${renownTag}</div>` : ''}
      ${mapFieldOpTag ? `<div class="muted" style="font-size:11px;margin:4px 0 6px">野外据点 ${mapFieldOpTag}</div>` : ''}
      ${mapThreatTags ? `<div class="muted" style="font-size:11px;margin:4px 0 6px">区域威胁 ${mapThreatTags}</div>` : ''}
      <div class="sub-list">`;
    m.sub.forEach((s, idx) => {
      const subKey = `${m.key}-${idx}`;
      const active = isCurrent && state.currentSubzone === idx && state.mode === 'world';
      const cleared = state.subzoneCleared[subKey];
      const opTag = worldFieldOperationTagHtml(m, idx, { previewOnly:!(m.key === state.currentMap && state.currentSubzone === idx) });
      html += `<button class="sub-btn ${active?'active':''}" data-action="subzone" data-map="${m.key}" data-sub="${idx}">
        ${cleared?'<span class="sub-cleared">✅ </span>':''}${s.name}${opTag ? ` · ${opTag}` : ''}
        <span class="sub-lvl">${typeof contentRangeLabel === 'function' ? contentRangeLabel(s.lvl[0], s.lvl[1]) : `等级${s.lvl[0]}-${s.lvl[1]}`}</span>
      </button>`;
    });
    html += `</div>`;
    const bCdEnd = state.bossCd[m.key] || 0;
    const bCdLeft = Math.max(0, Math.ceil((bCdEnd - Date.now()) / 1000));
    const bOnCd = bCdLeft > 0;
    const bReq = Math.max(1, (m.boss.lvl || 1) - 5);
    const bLvlOk = typeof contentReqMet === 'function' ? contentReqMet(bReq) : state.hero.lvl >= bReq;
    const bCanFree = bLvlOk && !bOnCd && state.mode === 'world';
    const bCanTicket = bLvlOk && bOnCd && state.tickets >= 1 && state.mode === 'world';
    const canBoss = bCanFree || bCanTicket;
    const bossText = !bLvlOk ? '进度不足'
      : (!bOnCd ? '挑战(免费)'
      : (bCanTicket ? `🎫挑战 (冷却 ${fmtCd(bCdLeft)})` : `冷却 ${fmtCd(bCdLeft)}`));
    html += `
      <div class="boss-row">
        <div class="boss-info">
          <div><span class="bname boss-name-tip" data-bosskey="${m.key}">${bossPanelIcon} ${m.boss.name}</span> <span class="pill">${typeof contentReqLabel === 'function' ? contentReqLabel(m.boss.lvl) : `等级${m.boss.lvl}`}</span></div>
          <div class="muted">${m.boss.desc}</div>
        </div>
        <button class="boss-btn ${canBoss?'epic':''}" data-action="boss" data-map="${m.key}" ${canBoss?'':'disabled'}>${bossText}</button>
      </div>`;
    const rare = (typeof getRareEliteForMap === 'function') ? getRareEliteForMap(m.key) : null;
    if (rare) {
      const rareIconHtml = (typeof entityIcon === 'function') ? entityIcon(rare.name, 16, rare.emoji || '⭐') : (rare.emoji || '⭐');
      const rareSeen = state._currentRareElite === rare.key;
      html += `
        <div class="boss-row" style="margin-top:6px;border-top:1px dashed rgba(148,163,184,.18);padding-top:6px">
          <div class="boss-info">
            <div><span class="bname rare-name-tip" data-rarekey="${rare.key}" style="cursor:help">${rareIconHtml} ${rare.name}</span> <span class="pill">等级${rare.lvl}</span></div>
            <div class="muted">${rare.desc}</div>
          </div>
          <div class="muted" style="font-size:11px;text-align:right">${rareSeen ? '已现身' : `野外约 ${Math.round((rare.spawnChance || 0.025) * 1000) / 10}% 遭遇`}</div>
        </div>`;
    }
    if (typeof renderZoneBounty === 'function') html += renderZoneBounty(m);
    div.innerHTML = html;
    bindInlineTipElements(div);
    // BOSS名字hover显示技能/被动
    const nameEl = div.querySelector('.boss-name-tip');
    if (nameEl && m.boss.skills) {
      nameEl.style.cursor = 'help';
      const showBossTip = e => {
        let tip = '<b>'+bossPanelIcon+' '+m.boss.name+' '+(typeof contentReqLabel === 'function' ? contentReqLabel(m.boss.lvl) : ('等级'+m.boss.lvl))+'</b>';
        if (m.boss.skills) {
          tip += '<div style=\"margin-top:3px;color:#fbbf24\">技能:</div>';
          m.boss.skills.forEach(s => {
            tip += bossSkillLineHtml(s, { iconSize:16, tagColor:'#fbbf24' });
          });
        }
        if (m.boss.passive) {
          tip += '<div style="margin-top:3px;color:#6ee7b7">被动:</div>';
          const p = m.boss.passive;
          if (p.dodgeChance) tip += '<div>💨 闪避 +'+(p.dodgeChance*100)+'%</div>';
          if (p.critChance) tip += '<div>💥 暴击 +'+(p.critChance*100)+'%</div>';
          if (p.dmgReduction) tip += '<div>🛡️ 减伤 +'+(p.dmgReduction*100)+'%</div>';
          if (p.atkBonus) tip += '<div>⚔️ 攻击 +'+(p.atkBonus*100)+'%</div>';
          if (p.leech) tip += '<div>🩸 吸血 +'+(p.leech*100)+'%</div>';
        }
        const bossThreats = typeof getWorldZoneThreats === 'function' ? getWorldZoneThreats(m, m.sub?.[0], { boss:true, count:2 }) : [];
        if (bossThreats.length) {
          tip += monsterMechanicSectionHtml('区域威胁', '#fb7185', bossThreats, 'achievement_zone_outland_01', t => ({
            icon:t.icon || '🧭',
            name:t.name || '区域威胁',
            meta:t.meta || '',
            desc:t.desc || '该区域正在强化地图首领。'
          }));
        }
        const tipEl = $('compare-tip');
        tipEl.querySelector('.compare-head').innerHTML = tip;
        tipEl.querySelector('.compare-body').innerHTML = '';
        tipEl.style.display = 'block';
        positionTip(tipEl, e);
      };
      nameEl.addEventListener('mouseenter', e => { if (!tooltipHoverEnabled()) return; showBossTip(e); });
      nameEl.addEventListener('mouseleave', () => { if (!tooltipHoverEnabled()) return; if (!_tipPinned) $('compare-tip').style.display = 'none'; });
      nameEl.addEventListener('mousemove', e => { if (!tooltipHoverEnabled()) return; positionTip($('compare-tip'), e); });
      addTouchPin(nameEl, showBossTip);
    }
    // BOSS按钮hover掉落预览
    const bossBtn = div.querySelector('.boss-btn');
    if (bossBtn) {
      const showBossLoot = e => {
        const isHighBoss=m.boss.lvl>=60;
        const bossDrops = [
          {name:'💰 金币 ×'+(m.boss.lvl*30),rarity:'common',stats:{}},
          {name:'✨ 经验 ×'+(m.boss.lvl*15),rarity:'common',stats:{}},
          isHighBoss
            ? {name:'🎁 必掉 等级'+m.boss.lvl+' 紫装 ×1',rarity:'epic',stats:{}}
            : {name:'🎁 必掉 等级'+m.boss.lvl+' 蓝装 ×1',rarity:'rare',stats:{}},
          isHighBoss
            ? {name:'🎉 15% 额外掉落 橙装 ×1',rarity:'legend',stats:{}}
            : {name:'🎉 15% 额外掉落 紫装 ×1',rarity:'epic',stats:{}},
          {name:'💎 钻石 ×3~8',rarity:'rare',stats:{}},
          {name:'📊 首次免费 · 冷却最高1小时 · 冷却中🎫跳过',rarity:'legend',stats:{}},
        ];
        showLootTip(e, bossDrops, `${bossPanelIcon} ${m.boss.name} 掉落`);
      };
      bossBtn.addEventListener('mouseenter', e => { if (!tooltipHoverEnabled()) return; showBossLoot(e); });
      bossBtn.addEventListener('mousemove', e => { if (!tooltipHoverEnabled()) return; positionTip($('compare-tip'), e); });
      addTouchPin(bossBtn, showBossLoot);
    }
    const rareNameEl = div.querySelector('.rare-name-tip');
    if (rareNameEl && rare) {
      const showRareTip = e => {
        const tipEl = $('compare-tip');
        tipEl.querySelector('.compare-head').innerHTML = rareEliteTipHtml(rare);
        tipEl.querySelector('.compare-body').innerHTML = '';
        tipEl.style.display = 'block';
        positionTip(tipEl, e);
      };
      rareNameEl.addEventListener('mouseenter', e => { if (!tooltipHoverEnabled()) return; showRareTip(e); });
      rareNameEl.addEventListener('mouseleave', () => { if (!tooltipHoverEnabled()) return; if (!_tipPinned) $('compare-tip').style.display = 'none'; });
      rareNameEl.addEventListener('mousemove', e => { if (!tooltipHoverEnabled()) return; positionTip($('compare-tip'), e); });
      addTouchPin(rareNameEl, showRareTip);
    }
    ml.appendChild(div);
  }
}

function roleTag(role){ return role==='tank'?'🛡️坦克':role==='heal'?'💚辅助':'⚔️输出'; }
function compPct(v){
  const n = (v || 0) * 100;
  return (Math.round(n * 10) / 10).toFixed(n % 1 ? 1 : 0).replace(/\.0$/,'');
}
function compSecs(ms){
  const s = (ms || 0) / 1000;
  return (Math.round(s * 10) / 10).toFixed(s % 1 ? 1 : 0).replace(/\.0$/,'');
}
function compBuffName(buff){
  if (!buff) return '';
  const fallback = {
    shield:'盾墙', divine:'神圣守护', bark:'树皮术', iceBarrier:'寒冰屏障', earthShield:'大地之盾',
    bestial:'野兽狂怒', shadowstep:'暗影步', battleShout:'战斗怒吼', kings:'王者祝福',
    berserk:'狂暴', windfury:'风怒', rapidFire:'急速射击', timeWarp:'时间扭曲',
    sacredShield:'圣盾'
  };
  if (typeof BUFF_LABELS === 'object' && BUFF_LABELS[buff]?.name) return BUFF_LABELS[buff].name;
  if (typeof BUFF_NAMES === 'object' && BUFF_NAMES[buff]?.name) return BUFF_NAMES[buff].name;
  if (typeof BUFF_FX === 'object' && BUFF_FX[buff]?.name) return BUFF_FX[buff].name;
  return fallback[buff] || buff;
}
function compBuffDesc(buff){
  if (!buff) return '';
  const fallback = {
    shield:'受到伤害降低33%', divine:'受到伤害降低45%', bark:'受到伤害降低40%', iceBarrier:'受到伤害降低40%',
    earthShield:'受到伤害降低33%', bestial:'攻击提高27%', shadowstep:'攻击提高33%',
    battleShout:'攻击提高20%', kings:'攻击和防御提高13%', berserk:'攻击提高27%,攻速提高20%',
    windfury:'攻速提高40%', rapidFire:'攻速提高40%', timeWarp:'攻速提高53%',
    sacredShield:'防御提高27%,每秒回复提高'
  };
  if (typeof BUFF_LABELS === 'object' && BUFF_LABELS[buff]?.desc) return BUFF_LABELS[buff].desc;
  if (typeof BUFF_NAMES === 'object' && BUFF_NAMES[buff]?.desc) return BUFF_NAMES[buff].desc;
  if (typeof BUFF_FX === 'object' && BUFF_FX[buff]?.desc) return BUFF_FX[buff].desc;
  return fallback[buff] || '';
}
function compStateName(stateKey){
  const map = {
    marked:'破绽标记', opened:'破绽', shocked:'感电', chilled:'寒霜侵袭', frozenMark:'冰寒印记',
    hunted:'猎物印记', rooted:'纠缠印记', arcaneMark:'奥术印记', charmed:'心智裂痕',
    blighted:'瘟疫缠身', torment:'痛苦印记'
  };
  return map[stateKey] || stateKey || '';
}
function compHealScale(v){
  const scale = (typeof COMPANION_HEAL_SCALE === 'number') ? COMPANION_HEAL_SCALE : 1;
  return v * scale;
}
function companionSkillTipHtml(sk){
  if (!sk) return '';
  const skillIconHtml = (typeof skillIcon === 'function') ? skillIcon(sk.name, 18, sk.icon || '✨') : (sk.icon || '✨');
  const lines = [];
  if (sk.type === 'dmg' && sk.mul) { const effMul = sk.mul * ((typeof COMPANION_SKILL_DMG_BONUS === 'number') ? COMPANION_SKILL_DMG_BONUS : 1); lines.push(`${effMul.toFixed(1).replace(/\.0$/,'')}倍伤害`); }
  if (sk.summonCount) lines.push(`召唤 ${sk.summonCount} 个单位助战`);
  if (sk.summonCap) lines.push(`同类召唤物最多保留 ${sk.summonCap} 个`);
  if (sk.summonPower) lines.push(`召唤物强度为随从属性的 ${compPct(sk.summonPower)}%`);
  if (sk.summonDuration) lines.push(`召唤物持续 ${compSecs(sk.summonDuration)}秒`);
  if (sk.alwaysCrit) lines.push('本次必定暴击');
  if (sk.dot || sk.dotPct) lines.push(`每秒造成本次伤害的${compPct(sk.dotPct || 0.12)}%，持续${compSecs(sk.dotMs || 6000)}秒`);
  if (sk.slow) lines.push(`减速 ${compSecs(sk.slowMs || 4000)}秒`);
  if (sk.stun) lines.push(`击晕 ${compSecs(sk.stunMs || 1500)}秒`);
  if (sk.interruptCast) lines.push('命中时可顺带打断读条');
  if (sk.debuff === 'sunder' || /破甲|易伤/.test(sk.name || '')) lines.push(`易伤 ${compSecs(sk.sunderMs || 15000)}秒（普通目标受到伤害+18%，Boss+25%）`);
  if (sk.stateKey) lines.push(`施加 ${compStateName(sk.stateKey)} ${compSecs(sk.stateMs || 9000)}秒`);
  if (sk.splashPct) lines.push(`对其他敌人溅射 ${compPct(sk.splashPct)}% 伤害`);
  if (sk.aoePct) lines.push(`额外波及其他敌人 ${compPct(sk.aoePct)}% 伤害`);
  if (sk.heroAtkPct) lines.push(`额外计入主角攻击的 ${compPct(sk.heroAtkPct)}%`);
  if (sk.extraHitPct) lines.push(`命中后追加 ${compPct(sk.extraHitPct)}% 追击伤害`);
  if (sk.executeBonus) lines.push(`对 ${compPct(sk.executeThreshold || 0.35)}% 以下目标额外 +${compPct(sk.executeBonus)}% 伤害`);
  if (sk.bonusVsBoss) lines.push(`对首领额外 +${compPct(sk.bonusVsBoss)}% 伤害`);
  if (sk.bonusVsDot) lines.push(`对持续伤害目标额外 +${compPct(sk.bonusVsDot)}% 伤害`);
  if (sk.bonusVsSlow) lines.push(`对减速目标额外 +${compPct(sk.bonusVsSlow)}% 伤害`);
  if (sk.bonusVsSunder) lines.push(`对易伤目标额外 +${compPct(sk.bonusVsSunder)}% 伤害`);
  if (sk.bonusVsState) lines.push(`对${compStateName(sk.bonusVsState)}目标额外 +${compPct(sk.bonusStatePct || 0.3)}% 伤害`);
  if (sk.buffAmp?.key) lines.push(`自身处于${compBuffName(sk.buffAmp.key)}时额外 +${compPct(sk.buffAmp.pct || 0)}% 伤害`);
  if (sk.heal) lines.push(`额外回复 ${compPct(compHealScale(sk.heal))}% 最大生命`);
  if (sk.healPct) lines.push(`立即回复 ${compPct(sk.healPct)}% 最大生命`);
  if (sk.shieldPct) lines.push(`施加 ${compPct(sk.shieldPct)}% 最大生命护盾`);
  if (sk.healPctHero) lines.push(`为主角回复 ${compPct(sk.healPctHero)}% 最大生命`);
  if (sk.healPctComp) lines.push(`为随从回复 ${compPct(sk.healPctComp)}% 最大生命`);
  if (sk.shieldPctHero) lines.push(`为主角施加 ${compPct(sk.shieldPctHero)}% 最大生命护盾`);
  if (sk.shieldPctComp) lines.push(`为随从施加 ${compPct(sk.shieldPctComp)}% 最大生命护盾`);
  if (sk.cleanse) lines.push('净化 1 个减益效果');
  if (sk.lifeSteal) lines.push(`按伤害回复 ${compPct(sk.lifeSteal)}% 生命`);
  if (sk.buff) {
    const desc = compBuffDesc(sk.buff);
    lines.push(`${compBuffName(sk.buff)}${desc ? `：${desc}` : ''}`);
  }
  if (sk.duration) lines.push(`持续 ${compSecs(sk.duration)}秒`);
  if (sk.buffTarget === 'hero') lines.push('效果目标：主角');
  else if (sk.buffTarget === 'companion') lines.push('效果目标：随从');
  else if (sk.buffTarget === 'both') lines.push('效果目标：主角和随从');
  else if (sk.healTarget === 'hero') lines.push('治疗目标：主角');
  else if (sk.healTarget === 'companion') lines.push('治疗目标：随从');
  else if (sk.healTarget === 'both') lines.push('治疗目标：主角和随从');
  else if (sk.healTarget === 'smart') lines.push('治疗目标：自动选择血量更危险的一方');
  const mode = sk._awakenSkill ? '觉醒专属技' : sk._signature ? (sk.mode === 'passive' ? '专属被动' : '专属主动') : sk._legendSkill ? '传说技能' : sk._qualitySkill ? '品质战技' : sk._extraSkill ? '特色技能' : sk._coverageSkill ? '战术补强技能' : (sk.type === 'summon' ? '召唤技能' : sk.type === 'buff' ? '辅助技能' : sk.type === 'heal' ? '治疗技能' : '伤害技能');
  const cdSec = (typeof companionEffectiveSkillCdSec === 'function') ? companionEffectiveSkillCdSec(sk) : (sk.cd || 8);
  const cdText = sk.mode === 'passive' ? mode : `${mode} · 冷却 ${String(cdSec).replace(/\.0$/,'')}秒`;
  return `<b>${skillIconHtml} ${sk.name}</b><div>${sk.desc || ''}</div>${lines.map(x=>`<div class="muted">${x}</div>`).join('')}<div class="muted">${cdText}</div>`;
}
function companionCombatSpecialTypeText(spec, tpl){
  const type = spec?.type || '';
  const map = {
    guard: {
      trigger:'主角生命低于 74%；支援位低于 66%；首领战；或启用守护战术时触发。',
      effect:'进入约 6 秒护卫窗口，为主角施加约 5% 最大生命护盾；出战随从额外获得约 8% 最大生命护盾；当前目标易伤 9 秒。'
    },
    barrier: {
      trigger:'主角生命低于 82%；主角带有可净化减益；或首领战时触发。',
      effect:'为主角施加约 7% 最大生命护盾，出战随从获得约 6% 最大生命护盾，并尝试净化 1 个主角减益；部分随从还会附加易伤。'
    },
    rescue: {
      trigger:`主角生命低于 ${tpl?.key === 'anduin' ? '34%' : '54%'}，或主角带有可净化减益时触发。`,
      effect:'立即治疗主角并补护盾，净化 1 个减益。安度因、维伦、阿莱克丝塔萨等救场型随从拥有更高治疗比例。'
    },
    cleanse: {
      trigger:'主角带有可净化减益，或生命低于 76% 时触发。',
      effect:'治疗主角、净化 1 个减益；带召唤标签的随从会额外召唤单位牵制目标。'
    },
    heal: {
      trigger:'主角生命低于 68%，主角受到连续伤害，或首领战进入高压阶段时触发。',
      effect:'立即治疗主角并附带短护盾；治疗型随从会按自身品质、星级和独有性质提高救场量。'
    },
    buff: {
      trigger:'首领战、目标低血，或主角/随从缺少该专属增益时触发。',
      effect:'给主角或出战随从施加短时战斗增益，通常提高攻击、急速、减伤或协同追击效率。'
    },
    dmg: {
      trigger:'首领战、目标低血，或目标已有标记/控制/持续伤害时触发。',
      effect:'造成一次高额专属追击伤害；会吃随从星级、品质、独有性质、老兵特性和支援位倍率。'
    },
    execute: {
      trigger:'目标生命低于 35%；首领战；目标已有控制/持续伤害/标记时触发。',
      effect:'追加斩杀伤害。低血目标会强制暴击并提高伤害上限；部分随从会短暂击晕或进入狂热。'
    },
    mark: {
      trigger:'首领战、目标低血，或目标尚未带有该随从标记时触发。',
      effect:'施加专属标记 9 秒并易伤 9 秒，造成一次追击伤害；带持续伤害标签时会附加 DoT。'
    },
    control: {
      trigger:'首领战，或目标未被减速/击晕时触发。',
      effect:'造成控制追击伤害，减速 5 秒，并短暂击晕目标；带易伤或持续伤害标签时附加对应效果。'
    },
    aoe: {
      trigger:'多目标战斗或首领战时触发。',
      effect:'对当前目标造成范围压制伤害，并按本次伤害溅射其他敌人；通常附加持续伤害，部分技能短暂击晕。'
    },
    dot: {
      trigger:'首领战、目标低血，或目标身上持续伤害不足 2 个时触发。',
      effect:'造成一次追击并附加 8 秒持续伤害，同时减速目标；部分随从会给自身补护盾。'
    },
    summon: {
      trigger:'多目标战斗、首领战，或目标低血时触发。',
      effect:'召唤 1 个单位助战，出战时最多可保留 2 个同类召唤；支援位最多保留 1 个，并附带减速牵制。'
    },
    tempo: {
      trigger:'首领战、协同追击还在较长冷却，或目标低血时触发。',
      effect:'压缩协同追击冷却，为主角补护盾，减速目标并造成一次节奏追击伤害。'
    }
  };
  return map[type] || { trigger:'首领战或目标低血时触发。', effect:'触发该随从的专属战斗效果。' };
}
function companionCombatSpecialTipHtml(tpl, comp, opts){
  const spec = (typeof companionCombatSpecial === 'function') ? companionCombatSpecial(tpl?.key) : null;
  if (!spec) return '';
  const typeText = companionCombatSpecialTypeText(spec, tpl);
  const cdMs = (typeof companionSpecialCooldownMs === 'function' && comp) ? companionSpecialCooldownMs(tpl, comp, !!opts?.support) : (spec.cd || 30000);
  const baseCd = Math.round((spec.cd || 30000) / 1000);
  const effCd = Math.round(cdMs / 1000);
  const supportPower = (typeof COMPANION_SUPPORT_POWER === 'number') ? COMPANION_SUPPORT_POWER : 0.42;
  const veteran = (typeof companionVeteranInfo === 'function' && comp) ? companionVeteranInfo(tpl, comp) : null;
  const unique = (typeof companionUniqueTrait === 'function') ? companionUniqueTrait(tpl) : null;
  const tags = (spec.tags || []).map(tag => companionDungeonTagLabel(tag)).join(' / ');
  const state = opts?.state ? `<div style="margin-top:4px;color:#fcd34d">当前状态: ${opts.state.ready ? '就绪' : `冷却 ${Math.ceil((opts.state.leftMs || 0) / 1000)} 秒`}</div>` : '';
  const scaling = [
    `基础冷却 ${baseCd} 秒${comp ? ` · 当前冷却约 ${effCd} 秒` : ''}`,
    `支援位强度约为出战的 ${Math.round(supportPower * 100)}%,且支援冷却更长`,
    '护盾/治疗/伤害会继续受到战术、独有性质、老兵特性和支援位倍率影响'
  ];
  if (veteran) scaling.push(`${veteran.icon || '🎖️'} ${veteran.name}: ${veteran.desc}`);
  if (unique) scaling.push(`${unique.icon || '✦'} ${unique.name}: ${unique.desc}`);
  return `<b>${spec.icon || '🌟'} ${tipAttrText(spec.name || '专属战斗')}</b>
    <div>${tipAttrText(spec.desc || '')}</div>
    <div style="margin-top:5px;color:#fde68a">触发条件</div>
    <div class="muted">${tipAttrText(typeText.trigger)}</div>
    <div style="margin-top:5px;color:#93c5fd">实际效果</div>
    <div class="muted">${tipAttrText(typeText.effect)}</div>
    <div style="margin-top:5px;color:#c4b5fd">规则</div>
    ${scaling.map(x => `<div class="muted">${tipAttrText(x)}</div>`).join('')}
    ${tags ? `<div class="muted">定位标签: ${tipAttrText(tags)}</div>` : ''}
    ${state}`;
}
function companionCombatSpecialLineHtml(tpl, comp, opts){
  const spec = (typeof companionCombatSpecial === 'function') ? companionCombatSpecial(tpl?.key) : null;
  if (!spec) return '';
  const tip = companionTipAttr(companionCombatSpecialTipHtml(tpl, comp, opts));
  const extra = opts?.extra ? ` · ${tipAttrText(opts.extra)}` : '';
  return `<div class="${opts?.className || 'muted'} comp-tip" data-tip="${tip}" style="${opts?.style || 'font-size:10px;color:#fde68a'}">专属战斗: ${spec.icon || '🌟'} ${tipAttrText(spec.name)}${extra}</div>`;
}
/* 随从技能 → 可悬浮小图标(指向看描述) */
function compSkillChips(tpl, comp){
  const skills = ((tpl&&tpl.skills)||[]).slice();
  if (tpl?.signature) skills.push(Object.assign({_signature:true}, tpl.signature));
  const awakenSkill = (typeof companionAwakenSkill === 'function') ? companionAwakenSkill(tpl, comp) : null;
  if (awakenSkill) skills.push(awakenSkill);
  return skills.map(s=>{
    const tip = companionTipAttr(companionSkillTipHtml(s));
    const skillIconHtml = (typeof skillIcon === 'function') ? skillIcon(s.name, 16, s.icon) : s.icon;
    return `<span class="comp-skill${s._signature?' sig':''}${s._extraSkill?' extra':''}${s._coverageSkill?' coverage':''}${s._qualitySkill?' quality':''}${s._legendSkill?' legend':''}${s._awakenSkill?' awaken':''}" data-tip="${tip}">${skillIconHtml}<span class="cs-name">${s.name}</span></span>`;
  }).join('');
}
const COMPANION_FILTER_DEFAULTS = { ownership:'all', target:'all', quality:'all', role:'all', trait:'all', bond:'all', query:'', sort:'quality' };
let companionFilters = Object.assign({}, COMPANION_FILTER_DEFAULTS);
let companionDetailKey = '';
let companionSheetTab = 'roster';
const COMPANION_SHEET_TABS = [
  { key:'roster', label:'名册', icon:'🐾' },
  { key:'draw', label:'抽取', icon:'🎟️' },
  { key:'combat', label:'作战', icon:'⚔️' },
  { key:'bond', label:'羁绊', icon:'⚜️' },
  { key:'mission', label:'派遣', icon:'🗺️' },
];
const COMPANION_SORT_OPTIONS = [
  { value:'quality', label:'品质' },
  { value:'stars', label:'星级' },
  { value:'upgrade', label:'可升星' },
  { value:'role', label:'定位' },
  { value:'name', label:'名称' },
];
const COMPANION_QUALITY_ORDER = { orange:0, purple:1, blue:2, green:3, white:4 };
const COMPANION_ROLE_ORDER = { tank:0, heal:1, dps:2 };
const COMPANION_ROLE_META = {
  tank: { label:'坦克', desc:'偏防御与承伤，定位加成会给主角提供生命、防御或全能类生存收益。' },
  heal: { label:'辅助', desc:'偏治疗、护盾、增益与续航，定位加成通常提高循环稳定性或持续作战能力。' },
  dps: { label:'输出', desc:'偏直接伤害、爆发和处决，定位加成主要提高攻击、暴击或伤害效率。' },
};
const COMPANION_TRAIT_META = {
  summon: { label:'召唤', tone:'summon', desc:'拥有召唤物或召唤类技能，适合拉长战斗、填补输出窗口。' },
  heal: { label:'治疗', tone:'heal', desc:'拥有回复生命的技能，能救主角、救随从，或自动选择更危险的目标。' },
  support: { label:'辅助', tone:'support', desc:'拥有护盾、增益或净化效果，用来稳定节奏、抵消减益和提高爆发窗口。' },
  control: { label:'控制', tone:'control', desc:'拥有减速、击晕、易伤、状态标记等控场效果，可延缓敌人或制造增伤条件。' },
};
function companionSkillPool(tpl, comp){
  const skills = ((tpl&&tpl.skills)||[]).slice();
  if (tpl?.signature) skills.push(Object.assign({_signature:true}, tpl.signature));
  const awakenSkill = (typeof companionAwakenSkill === 'function') ? companionAwakenSkill(tpl, comp) : null;
  if (awakenSkill) skills.push(awakenSkill);
  return skills.filter(Boolean);
}
function companionSkillEffectTags(sk){
  if (!sk) return [];
  const tags = [];
  const add = (label, tip) => tags.push({ label, tip });
  if (sk.type === 'summon' || sk.summonCount) add('召唤', '制造额外助战单位，适合补输出窗口和拉长战斗。');
  if (sk.type === 'dmg' || sk.mul || sk.alwaysCrit || sk.executeBonus || sk.bonusVsBoss) add('伤害', '直接造成伤害；倍率、暴击、处决和首领增伤会写在技能说明中。');
  if (sk.dot || sk.dotPct) add('持续伤害', '给目标挂持续伤害，后续每秒造成额外伤害。');
  if (sk.stun || sk.slow || sk.interruptCast || sk.silence || sk.cripple || sk.weaken || sk.sunder || sk.debuff === 'sunder' || sk.stateKey) add('控制', '减速、击晕、打断读条或状态标记等效果，可拖慢敌人或制造后续增伤条件。');
  if (sk.type === 'heal' || sk.heal || sk.healPct || sk.healPctHero || sk.healPctComp) add('治疗', '回复主角、随从或自动选择更危险的一方。');
  if (sk.type === 'buff' || sk.buff || sk.shieldPct || sk.shieldPctHero || sk.shieldPctComp || sk.cleanse) add('辅助', '提供护盾、增益或净化，偏向稳定节奏与爆发窗口。');
  if (sk.mode === 'passive') add('被动', '无需主动释放，满足条件后按规则持续生效。');
  if (sk._signature) add('专属', '该随从独有技能，会随详情和悬浮说明一起展示。');
  return tags;
}
function companionSkillEffectTagsHtml(sk){
  const tags = companionSkillEffectTags(sk);
  if (!tags.length) return '';
  return `<div class="comp-detail-effect-tags">${tags.map(tag => `<span class="comp-effect-tag comp-tip" data-tip="${companionTipAttr(`<b>${tag.label}</b><br>${tag.tip}`)}">${tag.label}</span>`).join('')}</div>`;
}
function companionTraitFlags(tpl){
  const flags = { summon:false, heal:false, support:false, control:false };
  for (const sk of companionSkillPool(tpl)) {
    if (sk.type === 'summon' || sk.summonCount) flags.summon = true;
    if (sk.type === 'heal' || sk.heal || sk.healPct || sk.healPctHero || sk.healPctComp) flags.heal = true;
    if (sk.type === 'buff' || sk.buff || sk.shieldPct || sk.shieldPctHero || sk.shieldPctComp || sk.cleanse) flags.support = true;
    if (sk.stun || sk.slow || sk.interruptCast || sk.silence || sk.cripple || sk.weaken || sk.sunder || sk.debuff === 'sunder' || sk.stateKey) flags.control = true;
  }
  return flags;
}
function companionRoleLabel(role){
  return COMPANION_ROLE_META[role]?.label || '输出';
}
function companionSortLabel(value){
  return COMPANION_SORT_OPTIONS.find(opt => opt.value === value)?.label || '品质';
}
function companionEntryName(entry){
  return entry?.tpl?.name || entry?.tpl?.key || '';
}
function companionNameCompare(a, b){
  return companionEntryName(a).localeCompare(companionEntryName(b), 'zh-Hans-CN');
}
function companionQualityCompare(a, b){
  const aq = COMPANION_QUALITY_ORDER[a?.quality || compQuality(a?.tpl).key] ?? 99;
  const bq = COMPANION_QUALITY_ORDER[b?.quality || compQuality(b?.tpl).key] ?? 99;
  return (aq - bq) || (((b?.owned?.stars) || 0) - ((a?.owned?.stars) || 0)) || companionNameCompare(a, b);
}
function companionUpgradeScore(entry){
  if (!entry?.isOwned || !entry.owned) return -1;
  const cost = getUpgradeCost(entry.owned);
  if (cost.maxed) return -0.5;
  const progress = cost.need ? Math.min(1, cost.have / cost.need) : 0;
  return (cost.have >= cost.need ? 2 : 0) + progress;
}
function companionEntryCompare(a, b, sortValue){
  const sort = sortValue || companionFilters.sort || 'quality';
  if (sort === 'name') return companionNameCompare(a, b) || companionQualityCompare(a, b);
  if (sort === 'stars') {
    return (((b?.owned?.stars) || 0) - ((a?.owned?.stars) || 0)) || companionQualityCompare(a, b);
  }
  if (sort === 'upgrade') {
    return (companionUpgradeScore(b) - companionUpgradeScore(a)) || companionQualityCompare(a, b);
  }
  if (sort === 'role') {
    return ((COMPANION_ROLE_ORDER[a?.tpl?.role] ?? 9) - (COMPANION_ROLE_ORDER[b?.tpl?.role] ?? 9)) || companionQualityCompare(a, b);
  }
  return companionQualityCompare(a, b);
}
function companionTipAttr(html){
  return tipAttrText(html);
}
function companionRoleTipHtml(role){
  const meta = COMPANION_ROLE_META[role] || COMPANION_ROLE_META.dps;
  const bonus = Object.entries((typeof ROLE_BONUS === 'object' && ROLE_BONUS[role]) || {}).map(([k, v]) => (typeof fmtMod === 'function') ? fmtMod(k, v) : `${k}+${v}`).join(' ');
  return `<b>定位：${tipAttrText(meta.label)}</b><br>${tipAttrText(meta.desc)}${bonus ? `<br><span class="muted">出战定位加成：${tipAttrText(bonus)}</span>` : ''}`;
}
function companionTraitTipHtml(key){
  const meta = COMPANION_TRAIT_META[key];
  if (!meta) return '';
  return `<b>特性：${tipAttrText(meta.label)}</b><br>${tipAttrText(meta.desc)}`;
}
function companionQualityTipHtml(q){
  if (!q) return '';
  const skillText = q.skills ? `${q.skills} 个基础主动技能` : '随从技能数量随模板决定';
  const req = (typeof companionQualityUnlockLevel === 'function') ? companionQualityUnlockLevel(q.key) : 1;
  const unlockText = req > 1 ? `${req}级后可出战/支援` : '1级即可出战/支援';
  return `<b>品质：${tipAttrText(q.name)}</b><br>决定随从基础倍率、抽取权重和同品质通用碎片池。<br><span class="muted">${tipAttrText(skillText)} · 抽取权重 ${q.weight ?? '-'} · ${tipAttrText(unlockText)}</span>`;
}
function companionUseGateInfo(tpl){
  return (typeof companionUseGate === 'function') ? companionUseGate(tpl) : { allowed:true, reqLevel:1, qName:compQuality(tpl).name, text:'' };
}
function companionUseLockNoteHtml(tpl){
  const gate = companionUseGateInfo(tpl);
  return gate.allowed ? '' : `<div class="comp-use-lock-note">🔒 ${tipAttrText(gate.text)}</div>`;
}
function companionUseTitle(tpl){
  const gate = companionUseGateInfo(tpl);
  return gate.allowed ? '出战' : gate.text;
}
function companionBadge(label, tone, tip){
  const tipAttr = tip ? ` data-tip="${companionTipAttr(tip)}"` : '';
  return `<span class="comp-badge comp-tip is-${tone}"${tipAttr}>${label}</span>`;
}
function companionMetaBadges(tpl){
  if (!tpl) return '';
  const q = compQuality(tpl);
  const traits = companionTraitFlags(tpl);
  const unique = (typeof companionUniqueTrait === 'function') ? companionUniqueTrait(tpl) : null;
  const badges = [
    companionBadge(q.name, `quality-${q.key}`, companionQualityTipHtml(q)),
    companionBadge(companionRoleLabel(tpl.role), tpl.role || 'dps', companionRoleTipHtml(tpl.role)),
  ];
  const gate = companionUseGateInfo(tpl);
  if (!gate.allowed) badges.push(companionBadge(`${gate.reqLevel}级解锁`, 'locked', `<b>等级封印</b><br>${tipAttrText(gate.text)}`));
  if (unique) badges.push(companionBadge(unique.name, 'unique', `<b>${tipAttrText(unique.icon || '✦')} ${tipAttrText(unique.name)}</b><br>${tipAttrText(unique.desc || '')}${typeof companionUniqueTraitSummary === 'function' ? `<br><span class="muted">${tipAttrText(companionUniqueTraitSummary(tpl) || '')}</span>` : ''}`));
  for (const [key, meta] of Object.entries(COMPANION_TRAIT_META)) {
    if (traits[key]) badges.push(companionBadge(meta.label, meta.tone, companionTraitTipHtml(key)));
  }
  return `<div class="comp-card-tags">${badges.join('')}</div>`;
}
function companionQualityBattleTarget(tpl){
  const q = compQuality(tpl);
  const dps = { white:40, green:60, blue:80, purple:100, orange:140 };
  const support = { white:22, green:32, blue:44, purple:58, orange:78 };
  const tank = { white:26, green:38, blue:52, purple:68, orange:92 };
  const table = tpl?.role === 'dps' ? dps : tpl?.role === 'tank' ? tank : support;
  return table[q.key] || 40;
}
function companionQualitySkillCount(tpl){
  return (tpl?.skills || []).filter(sk => sk && sk._qualitySkill).length;
}
function companionCombatSummaryHtml(tpl, comp, options){
  if(!tpl) return '';
  const q = compQuality(tpl);
  const target = companionQualityBattleTarget(tpl);
  const qSkills = companionQualitySkillCount(tpl);
  const totalSkills = (typeof companionSkillPool === 'function') ? companionSkillPool(tpl, comp).length : ((tpl.skills || []).length + (tpl.signature ? 1 : 0));
  const awakened = comp && typeof companionIsAwakened === 'function' && companionIsAwakened(comp);
  let atkText = '';
  if(comp && typeof computeCompanionTemplateStats === 'function' && state?.hero?.atk){
    const st = computeCompanionTemplateStats(comp, tpl, { ignoreDungeon:true });
    if(st) atkText = ` · 当前攻击 ${Math.round((st.atk / Math.max(1, state.hero.atk || 1)) * 100)}%`;
  }
  const roleText = tpl.role === 'dps' ? '输出目标' : tpl.role === 'tank' ? '坦克输出参考' : '辅助输出参考';
  const compact = options?.compact;
  return `<div class="comp-combat-summary ${awakened ? 'awakened' : ''}">
    <span><b>${roleText}</b>${target}%${atkText}</span>
    <span>${q.name}战技 +${qSkills} · 技能 ${totalSkills}</span>
    <span>${awakened ? '觉醒已生效' : '5星可觉醒跃迁'}</span>
    ${compact ? '' : `<em>${tpl.role === 'dps' ? '输出随从按品质常驻压过主角,觉醒后进入主战力档位。' : '非输出定位也会通过护盾、治疗、控制和战技补足价值。'}</em>`}
  </div>`;
}
function buildCompanionEntries(){
  const ownedMap = new Map();
  const wished = new Set(companionWishlistKeys());
  const activeComp = (typeof getActiveCompanion === 'function') ? getActiveCompanion() : null;
  (state.companions || []).forEach((comp, idx) => ownedMap.set(comp.key, { comp, idx }));
  return (COMPANIONS || []).map(tpl => {
    const owned = ownedMap.get(tpl.key);
    return {
      tpl,
      owned: owned?.comp || null,
      idx: owned?.idx ?? -1,
      isOwned: !!owned,
      isActive: !!owned && !!activeComp && activeComp.key === tpl.key && owned.idx === state.activeCompanion,
      isWished: wished.has(tpl.key),
      quality: compQuality(tpl).key,
      traits: companionTraitFlags(tpl),
    };
  });
}
function companionWishlistKeys(){
  if (!Array.isArray(state.companionWishlist)) state.companionWishlist = [];
  const valid = new Set((COMPANIONS || []).map(tpl => tpl.key));
  state.companionWishlist = Array.from(new Set(state.companionWishlist.filter(key => valid.has(key))));
  return state.companionWishlist;
}
function companionIsWishlisted(key){
  return companionWishlistKeys().includes(key);
}
function companionWishlistMarkDirty(){
  if (typeof markDirty === 'function') markDirty('companion');
  if (typeof saveState === 'function') saveState();
}
function companionToggleWishlist(key){
  if (!key || !(COMPANIONS || []).some(tpl => tpl.key === key)) return;
  const list = companionWishlistKeys();
  if (list.includes(key)) state.companionWishlist = list.filter(item => item !== key);
  else state.companionWishlist = list.concat(key);
  companionWishlistMarkDirty();
  renderCompanion();
}
function companionClearWishlist(){
  state.companionWishlist = [];
  if (companionFilters.target === 'wished') companionFilters.target = 'all';
  companionWishlistMarkDirty();
  renderCompanion();
}
function companionBondId(bond) {
  if (typeof COMPANION_BONDS === 'undefined') return 'all';
  const idx = COMPANION_BONDS.indexOf(bond);
  return idx >= 0 ? String(idx) : 'all';
}
function companionBondById(id) {
  if (typeof COMPANION_BONDS === 'undefined' || id === 'all') return null;
  const idx = parseInt(id, 10);
  return Number.isFinite(idx) ? COMPANION_BONDS[idx] || null : null;
}
function companionBondMissingKeys(bond, entries) {
  if (!bond) return [];
  const ownedKeys = new Set((entries || buildCompanionEntries()).filter(entry => entry.isOwned).map(entry => entry.tpl.key));
  return bond.keys.filter(key => !ownedKeys.has(key));
}
function companionSearchText(entry) {
  const tpl = entry?.tpl;
  if (!tpl) return '';
  const q = compQuality(tpl);
  const traits = companionTraitFlags(tpl);
  const traitText = Object.entries(COMPANION_TRAIT_META).filter(([key]) => traits[key]).map(([, meta]) => meta.label).join(' ');
  const skills = companionSkillPool(tpl).map(sk => `${sk.name || ''} ${sk.desc || ''}`).join(' ');
  const bonds = (typeof COMPANION_BONDS !== 'undefined' ? COMPANION_BONDS : []).filter(bond => bond.keys.includes(tpl.key)).map(bond => `${bond.name} ${bond.desc || ''}`).join(' ');
  const targetText = entry?.isWished ? '收藏目标 愿望单 追踪目标' : '';
  return `${tpl.name || ''} ${tpl.key || ''} ${tpl.desc || ''} ${q.name || ''} ${companionRoleLabel(tpl.role)} ${traitText} ${skills} ${bonds} ${targetText}`.toLowerCase();
}
function companionMatchesFilters(entry, filters){
  if (filters.ownership === 'owned' && !entry.isOwned) return false;
  if (filters.ownership === 'missing' && entry.isOwned) return false;
  if (filters.target === 'wished' && !entry.isWished) return false;
  if (filters.quality !== 'all' && entry.quality !== filters.quality) return false;
  if (filters.role !== 'all' && entry.tpl.role !== filters.role) return false;
  if (filters.trait !== 'all' && !entry.traits[filters.trait]) return false;
  const query = String(filters.query || '').trim().toLowerCase();
  if (query && !companionSearchText(entry).includes(query)) return false;
  if (filters.bond !== 'all') {
    const bond = companionBondById(filters.bond);
    if (!bond) return false;
    const missing = companionBondMissingKeys(bond);
    const targetKeys = missing.length ? missing : bond.keys;
    if (!targetKeys.includes(entry.tpl.key)) return false;
  }
  return true;
}
function companionFilterCount(entries, group, value){
  const next = Object.assign({}, companionFilters, { [group]: value });
  return entries.filter(entry => companionMatchesFilters(entry, next)).length;
}
function companionFilterRow(entries, group, label, options){
  const chips = options.map(opt => {
    const count = companionFilterCount(entries, group, opt.value);
    const active = companionFilters[group] === opt.value;
    return `<button class="comp-filter-chip${active?' active':''}" data-action="compfilter" data-group="${group}" data-value="${opt.value}">${opt.label}<span>${count}</span></button>`;
  }).join('');
  return `<div class="comp-filter-row"><span class="comp-filter-label">${label}</span><div class="comp-filter-chips">${chips}</div></div>`;
}
function companionFilterSummaryText(){
  const labels = [];
  if (companionFilters.ownership === 'owned') labels.push('已拥有');
  else if (companionFilters.ownership === 'missing') labels.push('未获得');
  if (companionFilters.target === 'wished') labels.push('收藏目标');
  if (companionFilters.quality !== 'all') labels.push({ white:'白色', green:'绿色', blue:'蓝色', purple:'紫色', orange:'橙色' }[companionFilters.quality] || companionFilters.quality);
  if (companionFilters.role !== 'all') labels.push(companionRoleLabel(companionFilters.role));
  if (companionFilters.trait !== 'all') labels.push(COMPANION_TRAIT_META[companionFilters.trait]?.label || companionFilters.trait);
  const bond = companionBondById(companionFilters.bond);
  if (bond) labels.push(`羁绊:${bond.name}`);
  if (companionFilters.query) labels.push(`搜索:${companionFilters.query}`);
  if (companionFilters.sort !== COMPANION_FILTER_DEFAULTS.sort) labels.push(`排序:${companionSortLabel(companionFilters.sort)}`);
  return labels.length ? labels.join(' / ') : '全部随从';
}
function companionSortRow(){
  const chips = COMPANION_SORT_OPTIONS.map(opt => {
    const active = companionFilters.sort === opt.value;
    return `<button class="comp-filter-chip comp-sort-chip${active?' active':''}" data-action="compsort" data-value="${opt.value}">${opt.label}</button>`;
  }).join('');
  return `<div class="comp-filter-row comp-sort-row"><span class="comp-filter-label">排序</span><div class="comp-filter-chips">${chips}</div></div>`;
}
function companionFilterPanelHtml(entries){
  const trackedBond = companionBondById(companionFilters.bond);
  const trackedMissing = trackedBond ? companionBondMissingKeys(trackedBond, entries) : [];
  const trackedNames = trackedMissing.map(key => COMPANIONS.find(c => c.key === key)?.name || key).join('、');
  const searchValue = tipAttrText(companionFilters.query || '');
  return `<div class="comp-filter-panel">
    <div class="comp-filter-head">
      <div>
        <div style="font-weight:700">分类标签</div>
        <div class="comp-filter-summary">当前筛选: ${companionFilterSummaryText()}</div>
      </div>
      <button class="comp-filter-reset" data-action="compresetfilter">重置筛选</button>
    </div>
    ${trackedBond ? `<div class="comp-filter-bond">
      <div><b>⚜️ 正在追踪: ${tipAttrText(trackedBond.name)}</b><span>${trackedMissing.length ? `缺 ${trackedMissing.length} 名` : '已完成'}</span></div>
      <div class="muted">${trackedMissing.length ? `缺口: ${tipAttrText(trackedNames)}` : '这条羁绊已激活,列表改为显示全部成员。'}</div>
      <button data-action="clearcompbond">取消追踪</button>
    </div>` : ''}
    <div class="comp-search-row">
      <input id="companion-search" data-action="compsearch" value="${searchValue}" placeholder="搜索随从、技能、羁绊…" autocomplete="off">
      ${companionFilters.query ? '<button data-action="clearcompsearch">清空</button>' : ''}
    </div>
    ${companionFilterRow(entries, 'ownership', '收集', [
      { value:'all', label:'全部' },
      { value:'owned', label:'已拥有' },
      { value:'missing', label:'未获得' },
    ])}
    ${companionFilterRow(entries, 'target', '目标', [
      { value:'all', label:'全部' },
      { value:'wished', label:'收藏目标' },
    ])}
    ${companionFilterRow(entries, 'quality', '品质', [
      { value:'all', label:'全部' },
      { value:'orange', label:'橙' },
      { value:'purple', label:'紫' },
      { value:'blue', label:'蓝' },
      { value:'green', label:'绿' },
      { value:'white', label:'白' },
    ])}
    ${companionFilterRow(entries, 'role', '定位', [
      { value:'all', label:'全部' },
      { value:'tank', label:'坦克' },
      { value:'heal', label:'辅助' },
      { value:'dps', label:'输出' },
    ])}
    ${companionFilterRow(entries, 'trait', '特性', [
      { value:'all', label:'全部' },
      { value:'summon', label:'召唤' },
      { value:'heal', label:'治疗' },
      { value:'support', label:'辅助' },
      { value:'control', label:'控制' },
    ])}
    ${companionSortRow()}
  </div>`;
}
function companionGlossaryPanelHtml(){
  const roleCards = Object.entries(COMPANION_ROLE_META).map(([key, meta]) => {
    const tip = companionRoleTipHtml(key);
    return `<span class="comp-glossary-chip comp-tip role-${key}" data-tip="${companionTipAttr(tip)}">${meta.label}</span>`;
  }).join('');
  const traitCards = Object.entries(COMPANION_TRAIT_META).map(([key, meta]) =>
    `<span class="comp-glossary-chip comp-tip trait-${key}" data-tip="${companionTipAttr(companionTraitTipHtml(key))}">${meta.label}</span>`
  ).join('');
  return `<div class="comp-glossary-panel">
    <div class="comp-glossary-head">
      <b>随从术语速查</b>
      <span>悬浮或点按标签查看效果</span>
    </div>
    <div class="comp-glossary-row"><span>定位</span><div>${roleCards}</div></div>
    <div class="comp-glossary-row"><span>特性</span><div>${traitCards}</div></div>
    <div class="comp-glossary-note">详情面板会把技能拆成伤害、控制、治疗、辅助等效果标签；升星只提高随从成长与专属加成，不改变这里的规则文字。</div>
  </div>`;
}
function companionWishlistPanelHtml(entries){
  const list = companionWishlistKeys();
  const entryMap = new Map((entries || buildCompanionEntries()).map(entry => [entry.tpl.key, entry]));
  const wishlistEntries = list.map(key => entryMap.get(key)).filter(Boolean);
  const ready = wishlistEntries.filter(entry => entry.isOwned && (() => {
    const cost = getUpgradeCost(entry.owned);
    return !cost.maxed && cost.have >= cost.need;
  })()).length;
  const cards = list.slice(0, 8).map(key => {
    const entry = entryMap.get(key);
    const tpl = entry?.tpl || COMPANIONS.find(c => c.key === key);
    if (!tpl) return '';
    const q = compQuality(tpl);
    const plan = companionWishlistPlan(entry, entries);
    return `<div class="comp-wishlist-chip ${plan.tone}">
      <div class="comp-wishlist-main">
        ${companionIconHtml(tpl, 14)} <b class="${q.cls}">${tipAttrText(tpl.name)}</b><em>${tipAttrText(plan.status)}</em>
      </div>
      <div class="comp-wishlist-progress"><i style="width:${plan.pct}%"></i></div>
      <div class="comp-wishlist-note">${tipAttrText(plan.note)}</div>
      <div class="comp-wishlist-note">${tipAttrText(plan.bondText)}</div>
      <div class="comp-wishlist-actions">
        <button data-action="compdetail" data-key="${tpl.key}">查看</button>
        <button data-action="compwish" data-key="${tpl.key}">×</button>
      </div>
    </div>`;
  }).join('');
  const missing = list.filter(key => !entryMap.get(key)?.isOwned).length;
  const owned = list.length - missing;
  const overflow = list.length > 8 ? `<span class="comp-wishlist-more">+${list.length - 8}</span>` : '';
  return `<div class="comp-wishlist-panel">
    <div class="comp-wishlist-head">
      <div><b>收藏目标</b><span>${list.length ? `${list.length} 个目标 · ${owned} 已拥有 · ${missing} 未获得 · ${ready} 可升星` : '用于追踪想抽取或想培养的随从'}</span></div>
      ${list.length ? '<button data-action="compclearwish">清空目标</button>' : ''}
    </div>
    ${list.length ? `<div class="comp-wishlist-list">${cards}${overflow}</div>` : '<div class="muted">在随从卡片或详情里点“加入目标”，再用筛选里的“收藏目标”查看。</div>'}
  </div>`;
}
function companionWishlistBondText(tpl, entries){
  if (!tpl || typeof COMPANION_BONDS === 'undefined') return '暂无相关羁绊';
  const bonds = COMPANION_BONDS.filter(bond => bond.keys.includes(tpl.key));
  if (!bonds.length) return '暂无相关羁绊';
  const active = bonds.filter(bond => companionBondMissingKeys(bond, entries).length === 0).length;
  const nearest = bonds
    .map(bond => ({ bond, missing: companionBondMissingKeys(bond, entries) }))
    .filter(item => item.missing.length)
    .sort((a, b) => a.missing.length - b.missing.length)[0];
  if (!nearest) return `羁绊 ${active}/${bonds.length} 已激活`;
  const names = nearest.missing.slice(0, 2).map(key => COMPANIONS.find(c => c.key === key)?.name || key).join('、');
  return `羁绊 ${active}/${bonds.length} · 最近缺 ${names}${nearest.missing.length > 2 ? ` 等${nearest.missing.length}名` : ''}`;
}
function companionWishlistPlan(entry, entries){
  const tpl = entry?.tpl;
  if (!tpl) return { tone:'missing', pct:0, status:'目标异常', note:'该目标已不在随从表中', bondText:'暂无相关羁绊' };
  const q = compQuality(tpl);
  const bondText = companionWishlistBondText(tpl, entries);
  if (!entry.isOwned) {
    const shards = (state.companionShards && state.companionShards[tpl.key]) || 0;
    const note = shards ? `未获得 · 已有同名碎片 ${shards}，继续抽取${q.name}池` : `未获得 · 继续抽取${q.name}池`;
    return { tone:'missing', pct:shards ? 18 : 8, status:'未获得', note, bondText };
  }
  const cost = getUpgradeCost(entry.owned);
  if (cost.maxed) return { tone:'done', pct:100, status:`${entry.owned.stars || 5}星满星`, note:'培养完成，可保留为出战或派遣核心', bondText };
  const pct = Math.max(8, Math.min(100, Math.round((cost.have / Math.max(1, cost.need)) * 100)));
  if (cost.have >= cost.need) return { tone:'ready', pct, status:`${entry.owned.stars || 1}星可升`, note:`可升星 · ${cost.have}/${cost.need} 碎片已备齐`, bondText };
  return { tone:'owned', pct, status:`${entry.owned.stars || 1}星培养中`, note:`还差 ${cost.need - cost.have} 碎片 · 当前 ${cost.have}/${cost.need}`, bondText };
}
function companionDrawGuideHtml(entries) {
  if (typeof COMPANION_QUALITY === 'undefined') return '';
  const ownedMap = new Map((state.companions || []).map(comp => [comp.key, comp]));
  const dupShard = { white:1, green:2, blue:3, purple:5, orange:8 };
  const qRows = COMPANION_QUALITY.map(q => {
    const ofQ = (COMPANIONS || []).filter(tpl => compQuality(tpl).key === q.key);
    const owned = ofQ.filter(tpl => ownedMap.has(tpl.key)).length;
    const full = ofQ.length && ofQ.every(tpl => {
      const comp = ownedMap.get(tpl.key);
      return comp && (comp.stars || 1) >= 5;
    });
    const univ = state.compUniversalShards?.[q.key] || 0;
    return `<div class="comp-draw-q ${full ? 'closed' : ''}">
      <span class="${q.cls}">${q.name}</span>
      <b>${owned}/${ofQ.length}</b>
      <em>${full ? '已跳过' : `权重${q.weight}`}</em>
      <small>重复+${dupShard[q.key] || 1} · 通用${univ}</small>
    </div>`;
  }).join('');
  const nextCosts = (state.companions || []).filter(comp => (comp.stars || 1) < 5).map(comp => (comp.stars || 1) * 8);
  const minCost = nextCosts.length ? Math.min(...nextCosts) : 0;
  return `<div class="comp-draw-guide">
    <div class="comp-draw-guide-head">
      <div><b>🎲 抽取与碎片规则</b><div class="muted" style="font-size:10px">每次消耗1张随从券；重复随从会转为同品质通用碎片。</div></div>
      <span>${state.compTickets || 0} 张券</span>
    </div>
    <div class="comp-draw-qgrid">${qRows}</div>
    <div class="comp-draw-rules">
      <span>升星先消耗专属碎片,不足再消耗同品质通用碎片。</span>
      <span>${minCost ? `当前最低升星门槛: ${minCost}碎片` : '已拥有随从均满星'}</span>
      <span>某品质全员5星后,该品质会自动移出抽取奖池。</span>
    </div>
  </div>`;
}
function companionAdvisorScore(entry, wantedRole) {
  if (!entry?.isOwned || !entry.tpl || !entry.owned) return 0;
  const q = compQuality(entry.tpl);
  const qScore = ({ white:8, green:16, blue:28, purple:42, orange:58 })[q.key] || 8;
  const stars = Math.max(1, entry.owned.stars || 1);
  const traits = entry.traits || companionTraitFlags(entry.tpl);
  let score = qScore + stars * 12 + Math.min(22, ((entry.tpl.skills || []).length + (entry.tpl.signature ? 1 : 0)) * 4);
  if (entry.tpl.role === wantedRole) score += 26;
  if (wantedRole === 'tank' && (traits.support || traits.control)) score += 8;
  if (wantedRole === 'heal' && (traits.heal || traits.support)) score += 10;
  if (wantedRole === 'dps' && (traits.control || traits.summon)) score += 8;
  if (entry.isActive) score += 4;
  return score;
}
function companionAdvisorReason(entry, wantedRole) {
  const q = compQuality(entry.tpl);
  const traits = entry.traits || companionTraitFlags(entry.tpl);
  const bits = [`${q.name}${entry.owned?.stars || 1}星`];
  if (entry.tpl.role === wantedRole) bits.push('定位匹配');
  if (traits.summon) bits.push('召唤');
  if (traits.heal) bits.push('治疗');
  if (traits.support) bits.push('辅助');
  if (traits.control) bits.push('控制');
  return bits.slice(0, 4).join(' · ');
}
function companionEstimatedBattleStats(entry) {
  if (!entry?.tpl) return null;
  const tpl = entry.tpl;
  const stars = Math.max(1, entry.owned?.stars || 1);
  const q = compQuality(tpl);
  const qm = (typeof COMPANION_COMBAT_QUALITY === 'object' && COMPANION_COMBAT_QUALITY[q.key]) || Math.max(0.55, q.mult || 1);
  const sm = 1 + ((typeof COMPANION_STAR_GROWTH === 'number' ? COMPANION_STAR_GROWTH : 0.15) * (stars - 1));
  const role = (typeof COMPANION_ROLE_PROFILE === 'object' && COMPANION_ROLE_PROFILE[tpl.role]) || { atk:0.8, def:0.9, hp:0.58, spd:0.74, reg:0.5, critd:0.85 };
  const tactic = typeof companionTacticMeta === 'function' ? companionTacticMeta() : { atk:1, def:1, hp:1, spd:1, heal:1 };
  const hero = state.hero || {};
  const stats = {
    atk: Math.floor((hero.atk || 1) * qm * sm * role.atk * (tpl.atkMul || 1) * (tactic.atk || 1)),
    def: Math.floor((hero.def || 1) * qm * sm * 0.72 * role.def * (tpl.defMul || 1) * (tactic.def || 1)),
    hpMax: Math.floor((hero.hpMax || 1) * qm * sm * role.hp * (tpl.hpMul || 1) * (tactic.hp || 1)),
    crit: Math.floor((hero.crit || 0) * qm * 0.40 * (tpl.critMul || 1)),
    critd: Math.floor((hero.critd || 150) * role.critd * (tpl.critdMul || 1)),
    spd: +(Math.max(0.35, (hero.spd || 1) * role.spd * (tpl.spdMul || 1) * (tactic.spd || 1))).toFixed(2),
    reg: Math.max(1, Math.floor((hero.reg || 0) * role.reg * (tpl.regMul || 1) * (tactic.heal || 1))),
  };
  if (typeof applyCompanionSignatureStats === 'function') applyCompanionSignatureStats(stats, tpl);
  return stats;
}
function companionCoverageLabels(tpl) {
  const labels = new Set();
  for (const sk of companionSkillPool(tpl)) for (const tag of companionSkillEffectTags(sk)) labels.add(tag.label);
  return labels;
}
function companionBattleScore(entry) {
  if (!entry?.tpl) return 0;
  const st = companionEstimatedBattleStats(entry);
  if (!st) return 0;
  const hero = state.hero || {};
  const traits = entry.traits || companionTraitFlags(entry.tpl);
  const q = compQuality(entry.tpl);
  const stars = Math.max(1, entry.owned?.stars || 1);
  const skillLabels = companionCoverageLabels(entry.tpl);
  const offense = (st.atk / Math.max(1, hero.atk || 1)) * 34 + Math.min(10, st.spd * 3) + Math.min(12, skillLabels.has('伤害') ? 8 : 0) + (skillLabels.has('持续伤害') ? 4 : 0);
  const survival = (st.hpMax / Math.max(1, hero.hpMax || 1)) * 18 + (st.def / Math.max(1, hero.def || 1)) * 16;
  const utility = (traits.control ? 9 : 0) + (traits.heal ? 9 : 0) + (traits.support ? 7 : 0) + (traits.summon ? 7 : 0);
  const quality = ({white:0, green:4, blue:8, purple:13, orange:18})[q.key] || 0;
  return Math.max(1, Math.round(offense + survival + utility + quality + stars * 5));
}
function companionScoreRank(score) {
  return score >= 115 ? 'S' : score >= 92 ? 'A' : score >= 72 ? 'B' : score >= 52 ? 'C' : 'D';
}
function companionTacticPanelHtml() {
  if (typeof COMPANION_TACTICS !== 'object') return '';
  const key = typeof companionTacticKey === 'function' ? companionTacticKey() : (state.companionTactic || 'balanced');
  const buttons = Object.entries(COMPANION_TACTICS).map(([id, meta]) => {
    const active = key === id;
    const parts = [];
    if (meta.atk && meta.atk !== 1) parts.push(`攻击 ${Math.round((meta.atk - 1) * 100)}%`);
    if (meta.def && meta.def !== 1) parts.push(`防御 ${Math.round((meta.def - 1) * 100)}%`);
    if (meta.hp && meta.hp !== 1) parts.push(`生命 ${Math.round((meta.hp - 1) * 100)}%`);
    if (meta.heal && meta.heal !== 1) parts.push(`治疗 ${Math.round((meta.heal - 1) * 100)}%`);
    const reactionDesc = (typeof companionReactionDesc === 'function') ? companionReactionDesc(id) : '';
    const tip = `<b>${meta.icon} ${tipAttrText(meta.label)}</b><br>${tipAttrText(meta.desc)}${parts.length ? `<br><span class="muted">${tipAttrText(parts.join(' · '))}</span>` : ''}${reactionDesc ? `<br><span class="muted">战友反应: ${tipAttrText(meta.reaction || '战友反应')} · ${tipAttrText(reactionDesc)} · 冷却45秒</span>` : ''}`;
    return `<button class="comp-tactic-btn comp-tip ${active ? 'active' : ''}" data-action="comptactic" data-value="${id}" data-tip="${companionTipAttr(tip)}">${meta.icon} ${meta.label}</button>`;
  }).join('');
  const activeMeta = typeof companionTacticMeta === 'function' ? companionTacticMeta(key) : COMPANION_TACTICS[key];
  return `<div class="comp-tactic-panel">
    <div class="comp-tactic-head">
      <div><b>⚔️ 战术指令</b><span>当前: ${activeMeta.icon} ${activeMeta.label}</span></div>
      <span>${tipAttrText(activeMeta.desc)} · 战友反应: ${tipAttrText(activeMeta.reaction || '战友反应')} / 45秒</span>
    </div>
    <div class="comp-tactic-list">${buttons}</div>
  </div>`;
}
function companionPowerPanelHtml(entries) {
  const owned = entries.filter(entry => entry.isOwned);
  if (!owned.length) {
    return `<div class="comp-power-panel">
      <div class="comp-power-head"><div><b>⚔️ 随从战力与技能覆盖</b><span>抽到随从后解锁强度评估</span></div></div>
      <div class="muted">这里会按当前角色属性、随从品质、星级、定位和技能类型估算作战价值。</div>
    </div>`;
  }
  const scored = owned.map(entry => ({ entry, score: companionBattleScore(entry), stats: companionEstimatedBattleStats(entry) })).sort((a, b) => b.score - a.score);
  const activeKey = getActiveCompanion()?.key;
  const active = scored.find(item => item.entry.tpl.key === activeKey) || scored[0];
  const topCards = scored.slice(0, 3).map(item => {
    const tpl = item.entry.tpl;
    const q = compQuality(tpl);
    const rank = companionScoreRank(item.score);
    return `<div class="comp-power-card ${tpl.key === activeKey ? 'active' : ''}">
      <div class="comp-power-card-head"><b>${companionIconHtml(tpl, 18)} ${tipAttrText(tpl.name)}</b><span>${rank} · ${item.score}</span></div>
      <div class="muted">${q.name}${item.entry.owned?.stars || 1}星 · ${roleTag(tpl.role)} · ${companionAdvisorReason(item.entry, tpl.role)}</div>
      <div class="comp-power-bars">
        <span style="--v:${Math.min(100, Math.round((item.stats.atk / Math.max(1, state.hero?.atk || 1)) * 100))}%">攻<i></i></span>
        <span style="--v:${Math.min(100, Math.round((item.stats.hpMax / Math.max(1, state.hero?.hpMax || 1)) * 100))}%">生<i></i></span>
        <span style="--v:${Math.min(100, Math.round((item.stats.def / Math.max(1, state.hero?.def || 1)) * 100))}%">防<i></i></span>
      </div>
    </div>`;
  }).join('');
  const wanted = ['伤害','控制','治疗','辅助','召唤','持续伤害'];
  const coverage = new Map(wanted.map(label => [label, 0]));
  for (const entry of owned) for (const label of companionCoverageLabels(entry.tpl)) if (coverage.has(label)) coverage.set(label, coverage.get(label) + 1);
  const coverageHtml = wanted.map(label => {
    const count = coverage.get(label) || 0;
    return `<span class="comp-coverage-chip ${count ? 'covered' : 'missing'}">${label}<b>${count}</b></span>`;
  }).join('');
  const gaps = wanted.filter(label => !(coverage.get(label) || 0));
  const candidates = gaps.slice(0, 2).map(label => {
    const candidate = entries.filter(entry => !entry.isOwned && companionCoverageLabels(entry.tpl).has(label)).sort((a, b) => companionBattleScore(b) - companionBattleScore(a))[0];
    return candidate ? `${label}: ${candidate.tpl.name}` : `${label}: 暂无候选`;
  }).join(' · ');
  const activeStats = active?.stats;
  const activeText = activeStats
    ? `当前出战基准: 攻${fmt(activeStats.atk)} 防${fmt(activeStats.def)} 血${fmt(activeStats.hpMax)} · 评分${active.score}`
    : '尚未出战,已按最高评分随从预估。';
  return `<div class="comp-power-panel">
    <div class="comp-power-head">
      <div><b>⚔️ 随从战力与技能覆盖</b><span>${activeText}</span></div>
      <span>${owned.length}/${COMPANIONS.length} 名册</span>
    </div>
    <div class="comp-power-grid">${topCards}</div>
    <div class="comp-coverage-row">
      <span>技能覆盖</span>
      <div>${coverageHtml}</div>
    </div>
    <div class="comp-power-note">${gaps.length ? `缺口建议: ${tipAttrText(candidates || '继续扩充收藏')}` : '覆盖完整: 已拥有伤害、控制、治疗、辅助、召唤和持续伤害来源。'}</div>
  </div>`;
}
function companionUpgradePreviewHtml(tpl, comp, options) {
  if (!tpl || !comp) return '';
  const cfg = options || {};
  const stars = Math.max(1, comp.stars || 1);
  const cost = getUpgradeCost(comp);
  const q = compQuality(tpl);
  const canUp = !cost.maxed && cost.have >= cost.need;
  const pct = cost.maxed ? 100 : Math.max(6, Math.min(100, Math.round((cost.have / Math.max(1, cost.need)) * 100)));
  const starGrowth = typeof COMPANION_STAR_GROWTH === 'number' ? Math.round(COMPANION_STAR_GROWTH * 100) : 15;
  const ownBonusPreview = Object.entries(tpl.bonus || {}).slice(0, 3).map(([k, v]) => {
    const cur = +(v * (1 + 0.2 * (stars - 1))).toFixed(1);
    const next = +(v * (1 + 0.2 * stars)).toFixed(1);
    const label = typeof fmtStatName === 'function' ? fmtStatName(k) : k;
    return `${label} ${cur}→${next}`;
  }).join(' · ');
  const traits = companionTraitFlags(tpl);
  const capstone = stars === 4
    ? (traits.summon ? '5星:召唤技能槽+1' : '5星:派遣碎片更容易+1')
    : '';
  const note = cost.maxed
    ? '已满星:出战与派遣均按最高星级计算'
    : `下一星:参战属性约+${starGrowth}%${ownBonusPreview ? ` · 专属 ${ownBonusPreview}` : ''}${capstone ? ` · ${capstone}` : ''}`;
  return `<div class="comp-upgrade-preview ${canUp ? 'ready' : ''}">
    <div class="comp-upgrade-head">
      <b>${cost.maxed ? '⭐ 培养完成' : `⭐ 培养预览 ${stars}→${stars + 1}`}</b>
      <span>${cost.maxed ? '满星' : `${cost.have}/${cost.need}`}</span>
    </div>
    <div class="comp-upgrade-bar"><i style="width:${pct}%"></i></div>
    <div class="comp-upgrade-note">${tipAttrText(note)}</div>
    ${cfg.compact ? '' : `<div class="comp-upgrade-meta"><span class="${q.cls}">${q.name}</span> · ${roleTag(tpl.role)} · ${canUp ? '可以升星' : '继续收集碎片'}</div>`}
  </div>`;
}
function companionAwakenPreviewHtml(tpl, comp, options) {
  if (!tpl || !comp || typeof getCompanionAwakenCost !== 'function') return '';
  const cfg = options || {};
  const cost = getCompanionAwakenCost(comp, tpl);
  if (!cost) return '';
  const active = cost.awakened;
  if (cfg.compact && cost.locked && !active) return '';
  const pct = active ? 100 : cost.locked ? 0 : Math.max(5, Math.min(100, Math.round((cost.haveShards / Math.max(1, cost.needShards)) * 100)));
  const skill = (typeof companionAwakenSkillDef === 'function') ? companionAwakenSkillDef(tpl) : null;
  const costText = (typeof companionAwakenCostText === 'function') ? companionAwakenCostText(cost) : '';
  const note = active
    ? `已解锁${skill?.name ? `「${skill.name}」` : '觉醒专属技'} · 随从属性+${Math.round(cost.statPct * 100)}% · 熟悉度${comp.familiarity || 100}`
    : cost.locked
      ? '5星后可觉醒:消耗同品质通用碎片和大量资源,解锁觉醒专属技。'
      : `觉醒消耗: ${costText} · 解锁${skill?.name ? `「${skill.name}」` : '觉醒专属技'}`;
  return `<div class="comp-awaken-preview ${active ? 'active' : cost.ready ? 'ready' : cost.locked ? 'locked' : ''}">
    <div class="comp-awaken-head">
      <b>${active ? '🌟 已觉醒' : cost.locked ? '🌟 觉醒未开放' : '🌟 觉醒'}</b>
      <span>${active ? '已觉醒' : cost.locked ? `${comp.stars || 1}/5星` : `${cost.haveShards}/${cost.needShards}`}</span>
    </div>
    <div class="comp-awaken-bar"><i style="width:${pct}%"></i></div>
    <div class="comp-awaken-note">${tipAttrText(note)}</div>
    ${cfg.compact ? '' : companionAwakenSkillHtml(tpl, comp, false)}
  </div>`;
}
function companionBondModText(bond) {
  return Object.entries(bond?.mod || {}).map(([k, v]) => (typeof fmtMod === 'function') ? fmtMod(k, v) : `${k}+${v}`).join(' ');
}
function companionBondTipHtml(bond, entries) {
  if (!bond) return '';
  const entryMap = new Map((entries || buildCompanionEntries()).map(entry => [entry.tpl.key, entry]));
  const missing = companionBondMissingKeys(bond, entries);
  const memberText = bond.keys.map(key => {
    const entry = entryMap.get(key);
    const tpl = entry?.tpl || COMPANIONS.find(c => c.key === key);
    return `${entry?.isOwned ? '✅' : '□'} ${tpl?.name || key}`;
  }).join('<br>');
  const stateText = missing.length ? `还缺 ${missing.length} 名: ${missing.map(key => COMPANIONS.find(c => c.key === key)?.name || key).join('、')}` : '已激活:属性已计入角色面板';
  return `<b>${tipAttrText(bond.name)}</b><br>${tipAttrText(companionBondModText(bond) || bond.desc || '')}<br>${tipAttrText(stateText)}<br>${memberText}`;
}
function companionBondChipsHtml(tpl, entries) {
  if (!tpl || typeof COMPANION_BONDS === 'undefined' || !COMPANION_BONDS.length) return '';
  const bonds = COMPANION_BONDS.filter(bond => bond.keys.includes(tpl.key));
  if (!bonds.length) return '';
  const chips = bonds.slice(0, 4).map(bond => {
    const bondId = companionBondId(bond);
    const missing = companionBondMissingKeys(bond, entries);
    const active = missing.length === 0;
    const tracked = companionFilters.bond === bondId;
    const tip = companionBondTipHtml(bond, entries).replace(/"/g, '&quot;');
    const state = active ? '已激活' : `缺${missing.length}`;
    return `<span class="comp-bond-chip ${active ? 'active' : 'locked'} ${tracked ? 'tracked' : ''}" data-tip="${tip}">⚜️ ${tipAttrText(bond.name)} <b>${state}</b></span>`;
  });
  if (bonds.length > chips.length) chips.push(`<span class="comp-bond-chip more">+${bonds.length - chips.length}</span>`);
  return `<div class="comp-card-bonds">${chips.join('')}</div>`;
}
function companionDetailSkillListHtml(tpl, comp) {
  const skills = companionSkillPool(tpl, comp);
  if (!skills.length) return '<div class="muted">暂无随从技能</div>';
  return `<div class="comp-detail-skill-grid">${skills.map(sk => `<div class="comp-detail-skill${sk._signature ? ' sig' : ''}${sk._legendSkill ? ' legend' : ''}${sk._extraSkill ? ' extra' : ''}${sk._coverageSkill ? ' coverage' : ''}${sk._qualitySkill ? ' quality' : ''}${sk._awakenSkill ? ' awaken' : ''}">${companionSkillTipHtml(sk)}${companionSkillEffectTagsHtml(sk)}</div>`).join('')}</div>`;
}
function companionLegendSkill(tpl) {
  return (tpl?.skills || []).find(sk => sk && sk._legendSkill) || null;
}
function companionLegendSkillHtml(tpl, compact) {
  const sk = companionLegendSkill(tpl);
  if (!sk) return '';
  const tip = companionTipAttr(companionSkillTipHtml(sk));
  const icon = (typeof skillIcon === 'function') ? skillIcon(sk.name, compact ? 15 : 17, sk.icon || '🌟') : (sk.icon || '🌟');
  if (compact) return `<div class="comp-legend-skill-line comp-tip" data-tip="${tip}">橙色传说技能: ${icon} <b>${tipAttrText(sk.name)}</b></div>`;
  return `<div class="comp-legend-skill-note comp-tip" data-tip="${tip}">
    <b>橙色传说技能</b><span>${icon} ${tipAttrText(sk.name)}</span>
    <div>${tipAttrText(sk.desc || '')}</div>
  </div>`;
}
function companionAwakenSkillHtml(tpl, comp, compact) {
  if (!tpl || !comp || typeof companionAwakenSkillDef !== 'function') return '';
  const active = typeof companionIsAwakened === 'function' && companionIsAwakened(comp);
  const sk = companionAwakenSkillDef(tpl);
  if (!sk) return '';
  const tip = companionTipAttr(companionSkillTipHtml(sk));
  const icon = (typeof skillIcon === 'function') ? skillIcon(sk.name, compact ? 15 : 17, sk.icon || '🌟') : (sk.icon || '🌟');
  if (compact) {
    return `<div class="comp-awaken-skill-line comp-tip ${active ? 'active' : 'locked'}" data-tip="${tip}">${active ? '已觉醒' : '5星可觉醒'}: ${icon} <b>${tipAttrText(sk.name)}</b></div>`;
  }
  const cost = (typeof getCompanionAwakenCost === 'function') ? getCompanionAwakenCost(comp, tpl) : null;
  const costText = (typeof companionAwakenCostText === 'function') ? companionAwakenCostText(cost) : '';
  return `<div class="comp-awaken-skill-note comp-tip ${active ? 'active' : 'locked'}" data-tip="${tip}">
    <b>${active ? '觉醒专属技已解锁' : '觉醒专属技预览'}</b><span>${icon} ${tipAttrText(sk.name)}</span>
    <div>${tipAttrText(sk.desc || '')}</div>
    ${active ? `<small>熟悉度 ${comp.familiarity || 100} · 觉醒属性 +${Math.round((cost?.statPct || 0.1) * 100)}%</small>` : `<small>${(comp.stars || 1) >= 5 ? tipAttrText(costText) : '升到5星后可消耗同品质通用碎片和资源觉醒。'}</small>`}
  </div>`;
}
function companionDetailBondsHtml(tpl, entries) {
  if (!tpl || typeof COMPANION_BONDS === 'undefined') return '';
  const bonds = COMPANION_BONDS.filter(bond => bond.keys.includes(tpl.key));
  if (!bonds.length) return '<div class="muted">暂无羁绊组合</div>';
  return bonds.map(bond => {
    const bondId = companionBondId(bond);
    const missing = companionBondMissingKeys(bond, entries);
    const active = missing.length === 0;
    const missingText = missing.length ? `缺口: ${missing.map(key => COMPANIONS.find(c => c.key === key)?.name || key).join('、')}` : '已激活:属性已计入角色面板';
    const memberText = bond.keys.map(key => {
      const member = COMPANIONS.find(c => c.key === key);
      const owned = (entries || []).some(entry => entry.tpl.key === key && entry.isOwned);
      return `${owned ? '✅' : '□'} ${member?.name || key}`;
    }).join(' · ');
    return `<div class="comp-detail-bond ${active ? 'active' : 'locked'}">
      <div class="comp-detail-bond-head">
        <b>⚜️ ${tipAttrText(bond.name)}</b>
        <button data-action="trackcompbond" data-bond="${bondId}">${companionFilters.bond === bondId ? '取消追踪' : '追踪'}</button>
      </div>
      <div>${tipAttrText(companionBondModText(bond) || bond.desc || '')}</div>
      <div class="muted">${tipAttrText(memberText)}</div>
      <div class="muted">${tipAttrText(missingText)}</div>
    </div>`;
  }).join('');
}
function companionDetailPanelHtml(entries) {
  if (!companionDetailKey) return '';
  const entry = (entries || buildCompanionEntries()).find(item => item.tpl.key === companionDetailKey);
  if (!entry) return '';
  const { tpl, owned } = entry;
  const q = compQuality(tpl);
  const stars = owned?.stars || 0;
  const awakened = entry.isOwned && typeof companionIsAwakened === 'function' && companionIsAwakened(owned);
  const starText = entry.isOwned ? `${'⭐'.repeat(stars || 1)} ${stars || 1}星${awakened ? ' · 已觉醒' : ''}` : '未获得';
  const traits = companionTraitFlags(tpl);
  const traitText = Object.entries(COMPANION_TRAIT_META).filter(([key]) => traits[key]).map(([, meta]) => meta.label).join(' / ') || '常规';
  const roleBonus = Object.entries((typeof ROLE_BONUS === 'object' && ROLE_BONUS[tpl.role]) || {}).map(([k, v]) => (typeof fmtMod === 'function') ? fmtMod(k, v) : `${k}+${v}`).join(' ');
  const starF = entry.isOwned ? 1 + 0.2 * ((stars || 1) - 1) : 1;
  const ownBonus = Object.entries(tpl.bonus || {}).map(([k, v]) => (typeof fmtMod === 'function') ? fmtMod(k, +(v * starF).toFixed(1)) : `${k}+${v}`).join(' ');
  const status = entry.isActive ? '出战中' : entry.isOwned ? '已拥有' : `${q.name}池未获得`;
  const combatSpecialDesc = (typeof companionCombatSpecialDesc === 'function') ? companionCombatSpecialDesc(tpl.key) : '';
  const combatSpecial = (typeof companionCombatSpecial === 'function') ? companionCombatSpecial(tpl.key) : null;
  const uniqueTrait = (typeof companionUniqueTrait === 'function') ? companionUniqueTrait(tpl) : null;
  const uniqueSummary = (typeof companionUniqueTraitSummary === 'function') ? companionUniqueTraitSummary(tpl) : '';
  const veteran = (typeof companionVeteranInfo === 'function' && owned) ? companionVeteranInfo(tpl, owned) : null;
  const supportActive = (typeof companionSupportIsSlotted === 'function') ? companionSupportIsSlotted(tpl.key) : false;
  const useGate = companionUseGateInfo(tpl);
  const useDisabled = useGate.allowed ? '' : 'disabled';
  const useTitle = tipAttrText(companionUseTitle(tpl));
  const resonanceInfo = (typeof companionResonanceInfo === 'function') ? companionResonanceInfo(tpl) : null;
  const cost = entry.isOwned ? getUpgradeCost(owned) : null;
  const canUp = cost && !cost.maxed && cost.have >= cost.need;
  const awakenCost = entry.isOwned && typeof getCompanionAwakenCost === 'function' ? getCompanionAwakenCost(owned, tpl) : null;
  const awakenButton = entry.isOwned
    ? `<button class="comp-awaken-btn ${awakenCost?.ready ? 'ready' : ''}" data-action="awakencomp" data-idx="${entry.idx}" ${(awakenCost?.ready && !awakenCost?.awakened) ? '' : 'disabled'}>${awakenCost?.awakened ? '已觉醒 🌟' : '觉醒'}</button>`
    : '';
  const wishButton = `<button data-action="compwish" data-key="${tpl.key}">${entry.isWished ? '取消目标' : '加入目标'}</button>`;
  const supportButton = entry.isOwned && !entry.isActive
    ? `<button class="${supportActive ? 'gold' : ''}" data-action="compsupport" data-key="${tpl.key}" ${(!supportActive && !useGate.allowed) ? 'disabled' : ''} title="${useTitle}">${supportActive ? '取消支援' : '设为支援'}</button>`
    : '';
  const actionHtml = entry.isOwned
    ? `<div class="comp-detail-actions">
        ${entry.isActive ? '<button class="danger" data-action="unequipcomp">休息</button>' : `<button class="primary" data-action="usecomp" data-idx="${entry.idx}" ${useDisabled} title="${useTitle}">出战</button>`}
        ${supportButton}
        <button class="gold" data-action="upgradecomp" data-idx="${entry.idx}" ${canUp ? '' : 'disabled'}>${cost.maxed ? '满星 ⭐5' : `升星 ${stars || 1}/5`}</button>
        ${awakenButton}
        ${wishButton}
        ${companionUseLockNoteHtml(tpl)}
      </div>`
    : `<div class="comp-detail-actions">${wishButton}<span class="muted">抽取到该随从后可出战、派遣，并参与对应羁绊。</span></div>`;
  return `<div class="comp-detail-panel">
    <div class="comp-detail-head">
      <div>
        <div class="comp-detail-title">${companionIconHtml(tpl, 22)} <b>${tipAttrText(tpl.name)}</b><span class="${q.cls}">${q.name}</span>${entry.isWished ? '<span class="comp-wish-badge">收藏目标</span>' : ''}</div>
        <div class="muted">${status} · ${starText} · ${roleTag(tpl.role)} · ${traitText}</div>
      </div>
      <button class="comp-detail-close" data-action="compclosedetail">关闭</button>
    </div>
    <div class="comp-detail-lore">${tipAttrText(tpl.desc || '')}</div>
    ${companionCombatSummaryHtml(tpl, owned, { compact:false })}
    <div class="comp-detail-grid">
      <div class="comp-detail-block">
        <div class="comp-detail-block-title">参战加成</div>
        <div class="muted">专属: ${tipAttrText(ownBonus || '无')}</div>
        <div class="muted">定位: ${tipAttrText(roleBonus || '无')}</div>
        ${entry.isOwned ? companionUpgradePreviewHtml(tpl, owned) : `<div class="comp-upgrade-preview"><div class="comp-upgrade-head"><b>⭐ 培养预览</b><span>${q.name}</span></div><div class="comp-upgrade-note">获得后可用同名碎片与${q.name}通用碎片升星。</div></div>`}
        ${entry.isOwned ? companionAwakenPreviewHtml(tpl, owned, { compact:true }) : ''}
        ${actionHtml}
      </div>
      <div class="comp-detail-block">
        <div class="comp-detail-block-title">技能说明</div>
        ${uniqueTrait ? `<div class="comp-unique-note">${uniqueTrait.icon || '✦'} 独有性质: ${tipAttrText(uniqueTrait.name)} · ${tipAttrText(uniqueTrait.desc || '')}${uniqueSummary ? `<br><span>${tipAttrText(uniqueSummary)}</span>` : ''}</div>` : ''}
        ${companionLegendSkillHtml(tpl, false)}
        ${entry.isOwned ? companionAwakenSkillHtml(tpl, owned, false) : ''}
        ${combatSpecialDesc ? companionCombatSpecialLineHtml(tpl, owned, { className:'comp-combat-special-note', style:'', extra:combatSpecial?.tags?.length ? `定位标签 ${combatSpecial.tags.map(companionDungeonTagLabel).join(' / ')}` : '' }) : ''}
        ${veteran ? `<div class="comp-veteran-note">${veteran.icon} ${veteran.name}: ${tipAttrText(veteran.desc)}</div>` : ''}
        ${companionDetailSkillListHtml(tpl, owned)}
      </div>
    </div>
    <div class="comp-detail-block">
      <div class="comp-detail-block-title">相关羁绊</div>
      ${resonanceInfo?.rank ? `<div class="comp-resonance-note">⚜️ 出战共鸣 ${resonanceInfo.rank}: ${tipAttrText(resonanceInfo.name)} · ${tipAttrText(resonanceInfo.desc)}<br><span>${tipAttrText(resonanceInfo.bondNames)}</span></div>` : `<div class="comp-resonance-note muted">⚜️ 出战共鸣: 激活包含该随从的羁绊后解锁战斗连携。</div>`}
      <div class="comp-detail-bond-list">${companionDetailBondsHtml(tpl, entries)}</div>
    </div>
  </div>`;
}
function companionCardTrackClass(tpl) {
  if (!tpl) return '';
  let cls = companionIsWishlisted(tpl.key) ? ' comp-card-wished' : '';
  if (companionFilters.bond === 'all') return cls;
  const bond = companionBondById(companionFilters.bond);
  return cls + (bond?.keys.includes(tpl.key) ? ' comp-card-tracked' : '');
}
function companionBondMemberTipHtml(tpl, entry) {
  if (!tpl) return '';
  const q = compQuality(tpl);
  const traits = companionTraitFlags(tpl);
  const traitText = Object.entries(COMPANION_TRAIT_META).filter(([key]) => traits[key]).map(([, meta]) => meta.label).join(' / ') || '常规';
  const stateText = entry?.isOwned ? `已拥有 ${entry.owned?.stars || 1}星` : `未获得 · ${q.name}池`;
  return `<b>${tipAttrText(tpl.name)}</b><br>${q.name} · ${companionRoleLabel(tpl.role)} · ${traitText}<br>${stateText}<br>${tipAttrText(tpl.desc || '')}`;
}
function companionBondRoadmapHtml(entries) {
  if (typeof COMPANION_BONDS === 'undefined' || !COMPANION_BONDS.length) return '';
  const entryMap = new Map((entries || []).map(entry => [entry.tpl.key, entry]));
  const activeCnt = COMPANION_BONDS.filter(bond => bond.keys.every(key => entryMap.get(key)?.isOwned)).length;
  const cards = COMPANION_BONDS.map(bond => {
    const bondId = companionBondId(bond);
    const members = bond.keys.map(key => {
      const entry = entryMap.get(key);
      const tpl = entry?.tpl || COMPANIONS.find(c => c.key === key);
      return { key, entry, tpl, owned:!!entry?.isOwned };
    });
    const ownedCnt = members.filter(m => m.owned).length;
    const pct = Math.max(6, Math.round((ownedCnt / Math.max(1, members.length)) * 100));
    const active = ownedCnt >= members.length;
    const missing = members.filter(m => !m.owned);
    const nextTarget = missing[0]?.tpl;
    const memberHtml = members.map(m => {
      const tip = companionBondMemberTipHtml(m.tpl, m.entry).replace(/"/g, '&quot;');
      const icon = m.tpl ? companionIconHtml(m.tpl, 22) : '🐾';
      return `<span class="comp-bond-member ${m.owned ? 'owned' : 'missing'}" data-tip="${tip}" title="${m.tpl ? tipAttrText(m.tpl.name) : m.key}">${icon}</span>`;
    }).join('');
    const route = active
      ? '全员入队,属性已计入角色面板'
      : `下一目标: ${tipAttrText(nextTarget?.name || missing.map(m => m.key).join('、'))} · ${nextTarget ? `${compQuality(nextTarget).name}/${companionRoleLabel(nextTarget.role)}` : '继续抽取'}`;
    const tracked = companionFilters.bond === bondId;
    const actionText = active ? '查看成员' : tracked ? '追踪中' : '追踪缺口';
    return `<div class="comp-bond-card ${active ? 'active' : ''}" style="--bond-pct:${pct}%">
      <div class="comp-bond-card-head">
        <b>${active ? '✅' : '🔒'} ${tipAttrText(bond.name)}</b>
        <span>${ownedCnt}/${members.length} · ${active ? '已激活' : `差 ${missing.length} 名`}</span>
      </div>
      <div class="comp-bond-members">${memberHtml}</div>
      <div class="comp-bond-progress"><i></i></div>
      <div class="comp-bond-effect">${tipAttrText(companionBondModText(bond) || bond.desc || '')}</div>
      <div class="comp-bond-route">${tipAttrText(route)}</div>
      <div class="comp-bond-actions">
        <button class="${tracked ? 'gold' : 'primary'}" data-action="trackcompbond" data-bond="${bondId}">${actionText}</button>
      </div>
    </div>`;
  }).join('');
  return `<div class="comp-bond-roadmap">
    <div class="comp-bond-roadmap-head">
      <div><b>⚜️ 羁绊路线图</b><div class="muted" style="font-size:10px">集齐成员后立即生效,属性会进入角色面板。</div></div>
      <span>${activeCnt}/${COMPANION_BONDS.length} 激活</span>
    </div>
    <div class="comp-bond-grid">${cards}</div>
  </div>`;
}
function companionSupportPanelHtml(entries) {
  const maxSlots = (typeof companionSupportMaxSlots === 'function') ? companionSupportMaxSlots() : 2;
  const supportEntries = (typeof companionSupportEntries === 'function') ? companionSupportEntries() : [];
  const used = new Set(supportEntries.map(e => e.key));
  const activeKey = getActiveCompanion()?.key;
  const candidates = (entries || []).filter(e => e.isOwned && e.tpl.key !== activeKey && !used.has(e.tpl.key) && companionUseGateInfo(e.tpl).allowed).slice().sort((a, b) => {
    const av = (typeof companionVeteranInfo === 'function') ? companionVeteranInfo(a.tpl, a.owned) : null;
    const bv = (typeof companionVeteranInfo === 'function') ? companionVeteranInfo(b.tpl, b.owned) : null;
    const aq = compQuality(a.tpl), bq = compQuality(b.tpl);
    return (bv ? 1 : 0) - (av ? 1 : 0) || ((a.tpl.quality === 'white' || a.tpl.quality === 'green') ? -1 : 0) - ((b.tpl.quality === 'white' || b.tpl.quality === 'green') ? -1 : 0) || companionQualityCompare(a, b);
  }).slice(0, 8);
  const slotCards = Array.from({ length:maxSlots }, (_, i) => {
    const entry = supportEntries[i];
    if (!entry) return `<div class="comp-support-slot empty"><b>支援位 ${i + 1}</b><span>空</span></div>`;
    const q = compQuality(entry.tpl);
    const spec = (typeof companionCombatSpecial === 'function') ? companionCombatSpecial(entry.tpl.key) : null;
    const unique = (typeof companionUniqueTrait === 'function') ? companionUniqueTrait(entry.tpl) : null;
    const veteran = (typeof companionVeteranInfo === 'function') ? companionVeteranInfo(entry.tpl, entry.comp) : null;
    return `<div class="comp-support-slot filled">
      <div class="comp-support-head"><b>${companionIconHtml(entry.tpl, 18)} ${tipAttrText(entry.tpl.name)}</b><span class="${q.cls}">${q.name}</span></div>
      ${unique ? `<div class="muted">${unique.icon || '✦'} ${tipAttrText(unique.name)} · ${(entry.comp.stars || 1)}星${veteran ? ` · ${veteran.icon}${veteran.name}` : ''}</div>` : `<div class="muted">${(entry.comp.stars || 1)}星${veteran ? ` · ${veteran.icon}${veteran.name}` : ''}</div>`}
      ${spec ? companionCombatSpecialLineHtml(entry.tpl, entry.comp, { support:true, className:'muted', extra:'支援位触发' }) : ''}
      <button data-action="compsupport" data-key="${entry.tpl.key}">移出支援</button>
    </div>`;
  }).join('');
  const candidateHtml = candidates.map(entry => {
    const q = compQuality(entry.tpl);
    const spec = (typeof companionCombatSpecial === 'function') ? companionCombatSpecial(entry.tpl.key) : null;
    const unique = (typeof companionUniqueTrait === 'function') ? companionUniqueTrait(entry.tpl) : null;
    const veteran = (typeof companionVeteranInfo === 'function') ? companionVeteranInfo(entry.tpl, entry.owned) : null;
    const candidateTip = spec ? companionTipAttr(companionCombatSpecialTipHtml(entry.tpl, entry.owned, { support:true })) : '';
    return `<button class="comp-support-candidate${spec ? ' comp-tip' : ''}" ${spec ? `data-tip="${candidateTip}"` : ''} data-action="compsupport" data-key="${entry.tpl.key}">
      ${companionIconHtml(entry.tpl, 16)}<span>${tipAttrText(entry.tpl.name)}</span><b class="${q.cls}">${q.name}</b><em>${spec?.icon || unique?.icon || '🌟'}${tipAttrText(spec?.name || unique?.name || '专属')}</em>${veteran ? `<i>${veteran.icon}</i>` : ''}
    </button>`;
  }).join('');
  return `<div class="comp-support-panel">
    <div class="comp-support-title">
      <div><b>🛡️ 支援随从</b><div class="muted">支援位不普攻,但会以较低强度触发专属战斗机制；${typeof companionUseRuleText === 'function' ? companionUseRuleText() : '高品质随从随等级解锁。'}</div></div>
      <span>${supportEntries.length}/${maxSlots}</span>
    </div>
    <div class="comp-support-slots">${slotCards}</div>
    ${candidateHtml ? `<div class="comp-support-candidates">${candidateHtml}</div>` : '<div class="muted" style="font-size:10px">暂无可加入支援位的空闲随从。</div>'}
  </div>`;
}
function companionAdvisorPanelHtml(entries) {
  const owned = entries.filter(e => e.isOwned);
  if (!owned.length) {
    return `<div class="comp-advisor-panel">
      <div class="comp-advisor-title"><b>🧭 随从作战顾问</b><span>先抽取随从解锁推荐</span></div>
      <div class="muted" style="font-size:10px">获得随从后,这里会按出战定位、升星进度和羁绊缺口给出培养建议。</div>
    </div>`;
  }
  const busy = typeof companionMissionBusyKeys === 'function' ? companionMissionBusyKeys() : new Set();
  const usableOwned = owned.filter(entry => companionUseGateInfo(entry.tpl).allowed);
  const roleCards = ['tank','dps','heal'].map(role => {
    const best = usableOwned.slice().sort((a,b) => companionAdvisorScore(b, role) - companionAdvisorScore(a, role))[0];
    if (!best) return '';
    const tpl = best.tpl;
    const q = compQuality(tpl);
    const score = companionAdvisorScore(best, role);
    const compIconHtml = companionIconHtml(tpl, 18);
    const busyText = busy.has(tpl.key) ? '<span class="comp-advisor-warn">派遣中</span>' : '';
    const action = best.isActive
      ? '<span class="comp-advisor-state">出战中</span>'
      : `<button class="primary" data-action="usecomp" data-idx="${best.idx}" ${busy.has(tpl.key) ? 'disabled' : ''}>出战</button>`;
    return `<div class="comp-advisor-card">
      <div class="comp-advisor-card-head"><b>${roleTag(role)}</b><span>${Math.round(score)}分</span></div>
      <div class="comp-advisor-main">${compIconHtml}<div><b>${tipAttrText(tpl.name)}</b><div class="muted">${companionAdvisorReason(best, role)} ${busyText}</div></div></div>
      <div class="comp-advisor-actions">${action}</div>
    </div>`;
  }).join('');
  const upgradeCards = owned.map(entry => {
    const cost = getUpgradeCost(entry.owned);
    const q = compQuality(entry.tpl);
    const ratio = cost.maxed ? 0 : cost.have / Math.max(1, cost.need);
    return { entry, cost, q, ratio, score:(ratio * 100) + ({orange:24,purple:18,blue:12,green:6,white:2}[q.key] || 0) };
  }).filter(x => !x.cost.maxed).sort((a,b) => b.score - a.score).slice(0, 3).map(x => {
    const compIconHtml = companionIconHtml(x.entry.tpl, 16);
    const pct = Math.max(6, Math.min(100, Math.round(x.ratio * 100)));
    return `<div class="comp-advisor-upgrade">
      <div>${compIconHtml} <b>${tipAttrText(x.entry.tpl.name)}</b> <span class="${x.q.cls}">${x.q.name}</span></div>
      <div class="comp-advisor-progress"><i style="width:${pct}%"></i></div>
      <div class="muted">${x.cost.have}/${x.cost.need} 碎片 · ${x.entry.owned.stars || 1}→${(x.entry.owned.stars || 1) + 1}星 · ${companionAdvisorReason(x.entry, x.entry.tpl.role)}</div>
    </div>`;
  }).join('');
  const ownedMap = new Map(owned.map(e => [e.tpl.key, e]));
  const bondCards = (typeof COMPANION_BONDS !== 'undefined' ? COMPANION_BONDS : []).map(bond => {
    const missing = bond.keys.filter(k => !ownedMap.has(k));
    const ownedCnt = bond.keys.length - missing.length;
    return { bond, missing, ownedCnt };
  }).filter(x => x.missing.length > 0 && x.ownedCnt > 0).sort((a,b) => a.missing.length - b.missing.length || b.ownedCnt - a.ownedCnt).slice(0, 4).map(x => {
    const missingNames = x.missing.map(k => COMPANIONS.find(c => c.key === k)?.name || k).join('、');
    const modTxt = companionBondModText(x.bond);
    return `<div class="comp-advisor-bond">
      <div><b>🔒 ${tipAttrText(x.bond.name)}</b> <span>${x.ownedCnt}/${x.bond.keys.length}</span></div>
      <div class="muted">缺: ${tipAttrText(missingNames)} · ${tipAttrText(modTxt)}</div>
    </div>`;
  }).join('');
  return `<div class="comp-advisor-panel">
    <div class="comp-advisor-title">
      <div><b>🧭 随从作战顾问</b><div class="muted" style="font-size:10px">按当前收藏、星级、定位、特性和派遣占用给出建议。</div></div>
      <span>${owned.length}/${COMPANIONS.length} 已收集</span>
    </div>
    <div class="comp-advisor-grid">${roleCards}</div>
    <div class="comp-advisor-subgrid">
      <div class="comp-advisor-section"><b>⭐ 升星优先</b>${upgradeCards || '<div class="muted" style="font-size:10px">已拥有随从都已满星。</div>'}</div>
      <div class="comp-advisor-section"><b>⚜️ 羁绊追踪</b>${bondCards || '<div class="muted" style="font-size:10px">暂无接近完成的羁绊。</div>'}</div>
    </div>
  </div>`;
}
function companionMissionTimeText(ms){
  if (ms <= 0) return '可领取';
  return fmtCd(Math.ceil(ms / 1000));
}
function companionMissionScoreTipHtml(tpl, comp, mission, score, rewardText) {
  if (!tpl || !comp || !mission) return '';
  const q = compQuality(tpl);
  const stars = Math.max(1, comp.stars || 1);
  const traits = companionTraitFlags(tpl);
  const qScore = ({white:4, green:10, blue:18, purple:28, orange:40})[q.key] || 4;
  const roleScore = tpl.role === mission.role ? 18 : 0;
  const traitScore = traits[mission.trait] ? 14 : 0;
  const skillCount = (tpl.skills || []).length + (tpl.signature ? 1 : 0);
  const skillScore = Math.min(16, skillCount * 3);
  const total = Math.round(score || (typeof companionMissionScore === 'function' ? companionMissionScore(tpl, comp, mission) : 0));
  const traitLabel = COMPANION_TRAIT_META[mission.trait]?.label || mission.trait;
  const rows = [
    `基础指挥桌 +28`,
    `品质 ${q.name} +${qScore}`,
    `星级 ${stars}星 +${stars * 7}`,
    `定位 ${companionRoleLabel(tpl.role)}${roleScore ? ` 匹配 +${roleScore}` : ` / 需要${companionRoleLabel(mission.role)} +0`}`,
    `特性 ${traitLabel}${traitScore ? ` 匹配 +${traitScore}` : ' 未命中 +0'}`,
    `技能槽 ${skillCount}个 +${skillScore}`,
  ].map(x => tipAttrText(x)).join('<br>');
  const result = total >= 75 ? '高完成度:奖励预览按大成功估算' : '普通完成度:仍可完成,但额外奖励较少';
  return `<b>${tipAttrText(tpl.name)} · ${tipAttrText(mission.name)}</b><br>${rows}<br><b>完成度 ${total}%</b><br>${tipAttrText(result)}${rewardText ? `<br>预览: ${tipAttrText(rewardText)}` : ''}`;
}
function companionMissionRewardPreviewHtml(mission) {
  const r = mission?.reward || {};
  const bits = [];
  if (r.gold) bits.push({ icon:'🪙', text:`金币 ${r.gold}+等级`, tone:'gold' });
  if (r.essence) bits.push({ icon:'✨', text:`精华 ${r.essence}+等级`, tone:'essence' });
  if (r.honor) bits.push({ icon:'⚔️', text:`荣誉 ${r.honor}+等级`, tone:'honor' });
  if (r.shards) bits.push({ icon:'🧩', text:`通用碎片×${r.shards}+`, tone:'shard' });
  if (r.ticketChance) bits.push({ icon:'🎟️', text:`随从券 ${Math.round(r.ticketChance * 100)}%+`, tone:'ticket' });
  if (!bits.length) return '';
  const tip = `<b>${tipAttrText(mission.name)}奖励</b><br>${bits.map(b => tipAttrText(`${b.icon} ${b.text}`)).join('<br>')}<br>${tipAttrText('品质、完成度和星级会放大奖励；大成功与5星随从会提高碎片收益。')}`.replace(/"/g, '&quot;');
  return `<div class="comp-mission-reward-preview" data-tip="${tip}">
    ${bits.map(b => `<span class="is-${b.tone}">${b.icon} ${tipAttrText(b.text)}</span>`).join('')}
  </div>`;
}
function companionMissionRosterHtml(activeRuns, slots) {
  const comps = (state.companions || []).map(comp => {
    const tpl = COMPANIONS.find(t => t.key === comp.key);
    return tpl ? { comp, tpl } : null;
  }).filter(Boolean);
  const activeKey = getActiveCompanion()?.key;
  const busyMap = new Map((activeRuns || []).map(run => [run.compKey, run]));
  const free = comps.filter(entry => entry.comp.key !== activeKey && !busyMap.has(entry.comp.key));
  const owned = comps.length;
  const nextNeed = slots >= 4 ? null : Math.max(2, slots * 8);
  const nextText = nextNeed ? `下一栏位: ${owned}/${nextNeed} 随从` : '派遣栏位已满级';
  const chips = comps.slice().sort((a, b) => {
    const stateScore = entry => entry.comp.key === activeKey ? 2 : busyMap.has(entry.comp.key) ? 1 : 0;
    return stateScore(a) - stateScore(b) || (compQuality(b.tpl).mult - compQuality(a.tpl).mult) || ((b.comp.stars || 1) - (a.comp.stars || 1));
  }).slice(0, 10).map(entry => {
    const q = compQuality(entry.tpl);
    const busy = busyMap.get(entry.comp.key);
    const stateLabel = entry.comp.key === activeKey ? '出战' : busy ? '执行中' : '空闲';
    const stateCls = entry.comp.key === activeKey ? 'active' : busy ? 'busy' : 'free';
    const mission = busy ? companionMissionType(busy.key) : null;
    const reason = entry.comp.key === activeKey
      ? '出战随从不能派遣'
      : busy
        ? `正在执行「${mission?.name || '派遣任务'}」`
        : '可执行派遣任务';
    const tip = `<b>${tipAttrText(entry.tpl.name)}</b><br>${q.name} · ${entry.comp.stars || 1}星 · ${companionRoleLabel(entry.tpl.role)}<br>${tipAttrText(reason)}`.replace(/"/g, '&quot;');
    return `<span class="comp-mission-roster-chip ${stateCls}" data-tip="${tip}">${companionIconHtml(entry.tpl, 16)} ${tipAttrText(entry.tpl.name)}<b>${stateLabel}</b></span>`;
  }).join('');
  const hidden = Math.max(0, comps.length - 10);
  return `<div class="comp-mission-roster">
    <div class="comp-mission-roster-head">
      <b>🧾 派遣名册</b>
      <span>空闲 ${free.length}/${owned} · ${nextText}</span>
    </div>
    <div class="comp-mission-roster-chips">${chips}${hidden ? `<span class="comp-mission-roster-chip more">+${hidden}</span>` : ''}</div>
  </div>`;
}
function companionMissionPanelHtml(entries){
  if (typeof COMPANION_MISSION_TYPES === 'undefined' || typeof ensureCompanionMissionState !== 'function') return '';
  const ms = ensureCompanionMissionState();
  const slots = typeof companionMissionSlots === 'function' ? companionMissionSlots() : 1;
  const active = Array.isArray(ms.active) ? ms.active : [];
  const now = Date.now();
  const readyCount = active.filter(run => (run.endAt || 0) <= now).length;
  const available = typeof companionMissionAvailableEntries === 'function' ? companionMissionAvailableEntries() : [];
  const activeCards = active.map(run => {
    const mission = typeof companionMissionType === 'function' ? companionMissionType(run.key) : null;
    const entry = typeof companionMissionCompEntry === 'function' ? companionMissionCompEntry(run.compKey) : null;
    const tpl = entry?.tpl;
    const remain = Math.max(0, (run.endAt || 0) - now);
    const total = Math.max(1, (run.endAt || 0) - (run.startAt || now));
    const progress = Math.max(4, Math.min(100, Math.round(((total - remain) / total) * 100)));
    const q = tpl ? compQuality(tpl) : null;
    const claim = remain <= 0;
    const compIconHtml = tpl ? companionIconHtml(tpl, 18) : '🐾';
    const score = Math.round(run.score || 0);
    const scoreTip = tpl && mission ? companionMissionScoreTipHtml(tpl, entry.comp, mission, score).replace(/"/g, '&quot;') : '';
    return `<div class="comp-mission-active-card ${claim ? 'ready' : ''}">
      <div class="comp-mission-card-head">
        <b>${mission?.icon || '📜'} ${tipAttrText(mission?.name || '派遣任务')}</b>
        <span>${claim ? '完成' : companionMissionTimeText(remain)}</span>
      </div>
      <div class="muted" style="font-size:10px">${compIconHtml} ${tipAttrText(tpl?.name || run.compKey)}${q ? ` · <span class="${q.cls}">${q.name}</span>` : ''} · <span class="comp-mission-score" data-tip="${scoreTip}">完成度 ${score}%</span></div>
      <div class="comp-mission-bar"><i style="width:${progress}%"></i></div>
      <button class="gold" data-action="claimcompmission" data-id="${tipAttrText(run.id)}" ${claim ? '' : 'disabled'}>${claim ? '领取战报' : '执行中'}</button>
    </div>`;
  }).join('');
  const missionCards = COMPANION_MISSION_TYPES.map(mission => {
    const ranked = available.map(entry => ({
      entry,
      score: typeof companionMissionScore === 'function' ? companionMissionScore(entry.tpl, entry.comp, mission) : 50,
    })).sort((a,b)=>b.score-a.score).slice(0, 3);
    const best = ranked[0];
    const bestAction = best ? (() => {
      const q = compQuality(best.entry.tpl);
      const preview = typeof companionMissionReward === 'function' ? companionMissionReward(mission, best.entry.tpl, best.entry.comp, best.score, best.score >= 75) : {};
      const reward = typeof companionMissionRewardText === 'function' ? companionMissionRewardText(preview, q.name) : '';
      const scoreTip = companionMissionScoreTipHtml(best.entry.tpl, best.entry.comp, mission, best.score, reward).replace(/"/g, '&quot;');
      const compIconHtml = companionIconHtml(best.entry.tpl, 18);
      return `<button class="comp-mission-best" data-action="startcompmission" data-mission="${mission.key}" data-comp="${best.entry.comp.key}" data-tip="${scoreTip}" ${active.length >= slots ? 'disabled' : ''}>
        <span>${compIconHtml} 最佳派遣: ${tipAttrText(best.entry.tpl.name)}</span><b>${Math.round(best.score)}%</b>
      </button>`;
    })() : `<button class="comp-mission-best" disabled><span>没有空闲随从</span><b>--</b></button>`;
    const candidateButtons = ranked.length ? ranked.map(({entry, score}) => {
      const q = compQuality(entry.tpl);
      const preview = typeof companionMissionReward === 'function' ? companionMissionReward(mission, entry.tpl, entry.comp, score, score >= 75) : {};
      const reward = typeof companionMissionRewardText === 'function' ? companionMissionRewardText(preview, q.name) : '';
      const compIconHtml = companionIconHtml(entry.tpl, 16);
      const scoreTip = companionMissionScoreTipHtml(entry.tpl, entry.comp, mission, score, reward).replace(/"/g, '&quot;');
      return `<button class="comp-mission-send" data-action="startcompmission" data-mission="${mission.key}" data-comp="${entry.comp.key}" data-tip="${scoreTip}" title="${tipAttrText(reward)}" ${active.length >= slots ? 'disabled' : ''}>
        ${compIconHtml}<span>${tipAttrText(entry.tpl.name)}</span><b>${Math.round(score)}%</b>
      </button>`;
    }).join('') : '<div class="muted" style="font-size:10px">没有空闲随从。出战随从和执行任务中的随从不能派遣。</div>';
    const matchText = `${companionRoleLabel(mission.role)} / ${COMPANION_TRAIT_META[mission.trait]?.label || mission.trait}`;
    return `<div class="comp-mission-card">
      <div class="comp-mission-card-head">
        <b>${mission.icon} ${mission.name}</b>
        <span>${mission.minutes}分钟</span>
      </div>
      <div class="muted" style="font-size:10px;line-height:1.45">${mission.desc}</div>
      <div class="comp-mission-match">推荐: ${tipAttrText(matchText)}</div>
      ${companionMissionRewardPreviewHtml(mission)}
      ${bestAction}
      <div class="comp-mission-candidates">${candidateButtons}</div>
    </div>`;
  }).join('');
  const lastReports = (ms.history || []).slice(0, 4).map(h => {
    const reward = typeof companionMissionRewardText === 'function' ? companionMissionRewardText(h.reward || {}, h.quality) : '';
    const scoreText = h.score ? `${Math.round(h.score)}%` : '--';
    const qCls = h.qualityKey ? `r-${h.qualityKey === 'orange' ? 'legend' : h.qualityKey === 'purple' ? 'epic' : h.qualityKey === 'blue' ? 'rare' : h.qualityKey === 'green' ? 'uncommon' : 'common'}` : '';
    return `<div class="comp-mission-report ${h.success ? 'success' : ''}">
      <div class="comp-mission-report-head">
        <b>${h.success ? '✅ 大成功' : '📜 完成'} · ${tipAttrText(h.name || '派遣')}</b>
        <span>${scoreText}</span>
      </div>
      <div class="comp-mission-report-meta">
        ${tipAttrText(h.comp || '随从')}${h.quality ? ` · <span class="${qCls}">${tipAttrText(h.quality)}</span>` : ''}${h.stars ? ` · ${h.stars}星` : ''}${h.durationMin ? ` · ${h.durationMin}分钟` : ''}
      </div>
      <div class="comp-mission-report-reward">${tipAttrText(reward || '少量资源')}</div>
    </div>`;
  }).join('');
  return `<div class="comp-mission-panel">
    <div class="comp-mission-title">
      <div>
        <b>🗺️ 随从派遣</b>
        <div class="muted" style="font-size:10px">空闲随从可执行离线任务；品质、星级、定位和特性匹配会提高完成度与奖励。</div>
      </div>
      <div class="comp-mission-title-actions">
        <span>${active.length}/${slots} 栏位 · 已完成 ${ms.totalCompleted || 0}</span>
        ${readyCount ? `<button class="gold" data-action="claimallcompmissions">领取全部×${readyCount}</button>` : ''}
      </div>
    </div>
    ${activeCards ? `<div class="comp-mission-active-grid">${activeCards}</div>` : ''}
    ${companionMissionRosterHtml(active, slots)}
    <div class="comp-mission-grid">${missionCards}</div>
    ${lastReports ? `<div class="comp-mission-history"><div class="comp-mission-history-title">最近战报</div>${lastReports}</div>` : ''}
  </div>`;
}
function companionSetFilter(group, value){
  if (!Object.prototype.hasOwnProperty.call(companionFilters, group)) return;
  if (group === 'sort') {
    companionSetSort(value);
    return;
  }
  companionFilters[group] = companionFilters[group] === value ? 'all' : value;
  renderCompanion();
}
function companionSetSort(value){
  if (!COMPANION_SORT_OPTIONS.some(opt => opt.value === value)) return;
  companionFilters.sort = value;
  renderCompanion();
}
function companionShowDetail(key){
  companionDetailKey = key || '';
  companionSheetTab = 'roster';
  renderCompanion();
}
function companionCloseDetail(){
  companionDetailKey = '';
  renderCompanion();
}
function companionTrackBond(id){
  const nextId = companionFilters.bond === id ? 'all' : id;
  companionFilters.bond = nextId;
  const bond = companionBondById(nextId);
  if (bond) {
    const missing = companionBondMissingKeys(bond);
    companionFilters.ownership = missing.length ? 'missing' : 'all';
    companionFilters.quality = 'all';
    companionFilters.role = 'all';
    companionFilters.trait = 'all';
  }
  renderCompanion();
}
function companionClearBondTrack(){
  companionFilters.bond = 'all';
  renderCompanion();
}
function companionSetSearch(value){
  companionFilters.query = String(value || '').trim();
  renderCompanion();
  const input = $('companion-search');
  if (input) {
    input.focus();
    const end = input.value.length;
    if (typeof input.setSelectionRange === 'function') input.setSelectionRange(end, end);
  }
}
function companionClearSearch(){
  companionFilters.query = '';
  renderCompanion();
}
function companionResetFilters(){
  companionFilters = Object.assign({}, COMPANION_FILTER_DEFAULTS);
  renderCompanion();
}
function companionSetSheetTab(tab){
  if (!COMPANION_SHEET_TABS.some(t => t.key === tab)) return;
  companionSheetTab = tab;
  renderCompanion();
}
function companionSheetTabsHtml(entries){
  const owned = (state.companions || []).length;
  const support = Array.isArray(state.companionSupport) ? state.companionSupport.length : 0;
  const bondCount = (typeof activeCompanionBonds === 'function') ? activeCompanionBonds().length : 0;
  const missionReady = state.companionMissions?.active
    ? state.companionMissions.active.filter(m => (m.endAt || 0) <= Date.now()).length
    : 0;
  const badge = {
    roster: `${owned}/${COMPANIONS.length}`,
    draw: state.compTickets || 0,
    combat: support ? `${support}/2` : '',
    bond: bondCount || '',
    mission: missionReady || '',
  };
  const buttons = COMPANION_SHEET_TABS.map(tab => {
    const active = companionSheetTab === tab.key;
    const b = badge[tab.key];
    return `<button class="comp-sheet-tab ${active ? 'active' : ''}" data-action="compsheettab" data-value="${tab.key}">${tab.icon} ${tab.label}${b !== '' ? `<span>${b}</span>` : ''}</button>`;
  }).join('');
  return `<div class="comp-sheet-tabs">${buttons}</div>`;
}
function companionPanelRenderSig(){
  const compList = (state.companions || []).map(c => `${c.key}:${c.stars||1}:${c.awakened?1:0}:${c.awakenRank||0}:${c.familiarity||0}`).sort().join('|');
  const shards = state.compUniversalShards
    ? Object.entries(state.compUniversalShards).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>`${k}:${v||0}`).join('|')
    : '';
  const active = `${state.activeCompanion}|${getActiveCompanion()?.key || ''}`;
  const support = Array.isArray(state.companionSupport) ? state.companionSupport.join('|') : '';
  const bonds = (typeof activeCompanionBonds==='function' ? activeCompanionBonds() : []).map(b=>b.name).join('|');
  const filters = `${Object.values(companionFilters).join('|')}#${companionDetailKey || ''}`;
  const wishlist = companionWishlistKeys().join('|');
  const tactic = typeof companionTacticKey === 'function' ? companionTacticKey() : (state.companionTactic || 'balanced');
  const skillSig = (typeof COMPANIONS !== 'undefined' ? COMPANIONS : [])
    .map(c => `${c.key}:${(c.skills || []).length}:${(c.skills || []).filter(s => s._legendSkill).map(s => s.name).join(',')}:${(c.skills || []).filter(s => s._extraSkill).length}:${c.signature?.name || ''}`)
    .join('|');
  const missions = state.companionMissions?.active
    ? state.companionMissions.active.map(m => `${m.id}:${m.endAt}:${m.compKey}`).join('|') + `#${state.companionMissions.totalCompleted || 0}#${Math.floor(Date.now()/30000)}`
    : '';
  return [state.cls||'', state.hero?.lvl||0, state.compTickets||0, active, support, compList, shards, bonds, filters, wishlist, tactic, skillSig, missions, companionSheetTab].join('||');
}
function renderCompanion() {
  $('gem-cost').textContent = '(消耗1🐾随从券 · 技能含定位招牌技+专属技，品质/星级决定强度)';
  const cl = $('companion-list');
  if (!cl) return;
  if (typeof ensureCompanionUseEligibility === 'function') ensureCompanionUseEligibility();
  else if (typeof ensureCompanionSupportState === 'function') ensureCompanionSupportState();
  const renderSig = companionPanelRenderSig();
  if (cl.dataset.renderSig === renderSig && cl.dataset.rendered === '1') return;
  const owned = state.companions.length;
  const entries = buildCompanionEntries();
  const filteredEntries = entries.filter(entry => companionMatchesFilters(entry, companionFilters));
  let html = '';

  // ---- 收藏 / 羁绊概览 ----
  if(!state.compUniversalShards) state.compUniversalShards = {white:0,green:0,blue:0,purple:0,orange:0};
  const univ = state.compUniversalShards;
  const qLabel = {white:'白',green:'绿',blue:'蓝',purple:'紫',orange:'橙'};
  const uniStr = ['white','green','blue','purple','orange'].map(k => univ[k] ? `${qLabel[k]}通用×${univ[k]}` : '').filter(Boolean).join(' ');
  html += `<div class="ascend-box">
    <div style="font-weight:bold">🐾 随从收藏 <span class="muted" style="font-size:11px">${owned}/${COMPANIONS.length}</span></div>
    <div class="muted" style="font-size:10px;margin-top:2px">收藏被动: 每随从 +0.05%攻击 / +0.08%生命 (当前 +${Math.min(owned*0.05,1.2).toFixed(2)}% / +${Math.min(owned*0.08,1.8).toFixed(2)}%)</div>
    <div class="muted" style="font-size:10px;margin-top:2px;color:#fde68a">🔒 战斗使用: ${tipAttrText(typeof companionUseRuleText === 'function' ? companionUseRuleText() : '高品质随从随等级解锁。')}</div>
    ${uniStr ? `<div class="muted" style="font-size:10px;margin-top:2px;color:#fbbf24">🔧 通用碎片: ${uniStr}</div>` : ''}`;
  // 已满星品质提示
  const ownedM = {}; for(const c of state.companions) ownedM[c.key] = c;
  const fullQ = ['white','green','blue','purple','orange'].filter(qk => {
    const ofQ = COMPANIONS.filter(t => compQuality(t).key === qk);
    return ofQ.length && ofQ.every(t => { const c = ownedM[t.key]; return c && (c.stars||1) >= 5 && (typeof companionIsAwakened !== 'function' || companionIsAwakened(c)); });
  });
  if(fullQ.length) html += `<div class="muted" style="font-size:10px;margin-top:2px;color:var(--accent)">✅ 已完成品质: ${fullQ.map(k=>qLabel[k]).join(' ')} (全员5星且觉醒,不再抽到)</div>`;
  html += `</div>`;

  html += companionSheetTabsHtml(entries);
  if (companionSheetTab === 'draw') {
    html += `<div class="comp-sheet-pane">${companionDrawGuideHtml(entries)}${companionWishlistPanelHtml(entries)}${companionGlossaryPanelHtml()}</div>`;
    cl.innerHTML = html;
    cl.dataset.renderSig = renderSig;
    cl.dataset.rendered = '1';
    return;
  }
  if (companionSheetTab === 'combat') {
    html += `<div class="comp-sheet-pane">${companionSupportPanelHtml(entries)}${companionTacticPanelHtml()}${companionPowerPanelHtml(entries)}</div>`;
    cl.innerHTML = html;
    cl.dataset.renderSig = renderSig;
    cl.dataset.rendered = '1';
    return;
  }
  if (companionSheetTab === 'bond') {
    html += `<div class="comp-sheet-pane">${companionBondRoadmapHtml(entries)}${companionAdvisorPanelHtml(entries)}</div>`;
    cl.innerHTML = html;
    cl.dataset.renderSig = renderSig;
    cl.dataset.rendered = '1';
    return;
  }
  if (companionSheetTab === 'mission') {
    html += `<div class="comp-sheet-pane">${companionMissionPanelHtml(entries)}</div>`;
    cl.innerHTML = html;
    cl.dataset.renderSig = renderSig;
    cl.dataset.rendered = '1';
    return;
  }

  html += companionFilterPanelHtml(entries);
  html += companionDetailPanelHtml(entries);

  // ---- 出战随从 ----
  const act = getActiveCompanion();
  if (act) {
    const tpl = COMPANIONS.find(c=>c.key===act.key);
    const q = compQuality(tpl);
    const st = computeCompanionStats();
    const role = (typeof ROLE_BONUS==='object'&&ROLE_BONUS[tpl?.role])||{};
    const starF = 1+0.2*((act.stars||1)-1);
    const ownTxt = Object.entries(tpl?.bonus||{}).map(([k,v])=>(typeof fmtMod==='function')?fmtMod(k,+(v*starF).toFixed(1)):k+'+'+v).join(' ');
    const roleTxt = Object.entries(role).map(([k,v])=>(typeof fmtMod==='function')?fmtMod(k,v):k+'+'+v).join(' ');
    const compIconHtml = companionIconHtml(tpl, 18);
    const spec = (typeof companionCombatSpecial === 'function') ? companionCombatSpecial(tpl.key) : null;
    const unique = (typeof companionUniqueTrait === 'function') ? companionUniqueTrait(tpl) : null;
    const uniqueSummary = (typeof companionUniqueTraitSummary === 'function') ? companionUniqueTraitSummary(tpl) : '';
    const fit = (typeof companionDungeonFitInfo === 'function') ? companionDungeonFitInfo(tpl, (typeof companionCurrentDungeon === 'function' ? companionCurrentDungeon() : null)) : null;
    html += `<div class="shop-item${companionCardTrackClass(tpl)}" style="border-color:var(--${q.cls==='r-legend'?'legend':q.cls==='r-epic'?'epic':'border'})">
      <div class="row"><b>${compIconHtml} ${tpl?.name}</b><span class="pill" style="background:var(--accent);color:#000">出战中</span></div>
      <div class="muted"><span class="${q.cls}">${q.name}</span> · ${'⭐'.repeat(act.stars||1)} · ${roleTag(tpl?.role)} · ${(tpl?.skills?.length||0)}主动${tpl?.signature?'+1专属':''} · 新增品质战技 +${companionQualitySkillCount(tpl)}</div>
      ${companionMetaBadges(tpl)}
      ${companionCombatSummaryHtml(tpl, act, { compact:true })}
      ${companionBondChipsHtml(tpl, entries)}
      <div class="muted" style="font-size:10px">参战属性: 攻${fmt(st?.atk||0)} 防${fmt(st?.def||0)} 血${fmt(st?.hpMax||0)}</div>
      <div class="muted" style="font-size:10px;color:#6ee7b7">专属加成: ${ownTxt||'无'}</div>
      <div class="muted" style="font-size:10px;color:#93c5fd">定位加成: ${roleTxt||'无'}</div>
      ${unique ? `<div class="muted" style="font-size:10px;color:#bae6fd">独有性质: ${unique.icon || '✦'} ${unique.name}${uniqueSummary ? ` · ${uniqueSummary}` : ''}</div>` : ''}
      ${tpl?.signature?`<div class="muted" style="font-size:10px;color:#fcd34d">专属技: ${(typeof skillIcon === 'function') ? skillIcon(tpl.signature.name, 14, tpl.signature.icon||'✨') : (tpl.signature.icon||'✨')} ${tpl.signature.name}${tpl.signature.mode==='passive'?' [被动]':''}</div>`:''}
      ${companionLegendSkillHtml(tpl, true)}
      ${companionAwakenSkillHtml(tpl, act, true)}
      ${spec ? companionCombatSpecialLineHtml(tpl, act, { extra:fit?.score ? `当前副本匹配 ${fit.label}` : '' }) : ''}
      ${companionUpgradePreviewHtml(tpl, act, { compact:true })}
      ${companionAwakenPreviewHtml(tpl, act, { compact:true })}
      <div class="comp-skills">${compSkillChips(tpl, act)}</div>
      <div class="comp-card-actions">
        <button data-action="compdetail" data-key="${tpl.key}">详情</button>
        <button data-action="compwish" data-key="${tpl.key}">${companionIsWishlisted(tpl.key) ? '取消目标' : '加入目标'}</button>
        ${(() => { const ac = typeof getCompanionAwakenCost === 'function' ? getCompanionAwakenCost(act, tpl) : null; return ac ? `<button class="comp-awaken-btn ${ac.ready ? 'ready' : ''}" data-action="awakencomp" data-idx="${state.activeCompanion}" ${(ac.ready && !ac.awakened) ? '' : 'disabled'}>${ac.awakened ? '已觉醒' : '觉醒'}</button>` : ''; })()}
        <button class="danger" data-action="unequipcomp">休息</button>
      </div>
    </div>`;
  }

  // ---- 已拥有随从 ----
  const ownedList = filteredEntries.filter(entry => entry.isOwned);
  ownedList.sort(companionEntryCompare);
  if (ownedList.some(entry => !entry.isActive)) {
    html += `<div class="detail-label" style="margin-top:6px">🐾 已拥有 (${ownedList.filter(entry => !entry.isActive).length})</div>`;
  }
  for (const entry of ownedList) {
    const { owned:c, idx:i, tpl } = entry;
    if (act && i===state.activeCompanion) continue;
    const q = compQuality(tpl);
    const cost = getUpgradeCost(c);
    const canUp = !cost.maxed && cost.have>=cost.need;
    const compIconHtml = companionIconHtml(tpl, 18);
    const supportActive = (typeof companionSupportIsSlotted === 'function') ? companionSupportIsSlotted(tpl.key) : false;
    const spec = (typeof companionCombatSpecial === 'function') ? companionCombatSpecial(tpl.key) : null;
    const unique = (typeof companionUniqueTrait === 'function') ? companionUniqueTrait(tpl) : null;
    const uniqueSummary = (typeof companionUniqueTraitSummary === 'function') ? companionUniqueTraitSummary(tpl) : '';
    const veteran = (typeof companionVeteranInfo === 'function') ? companionVeteranInfo(tpl, c) : null;
    const useGate = companionUseGateInfo(tpl);
    const useTitle = tipAttrText(companionUseTitle(tpl));
    html += `<div class="shop-item${companionCardTrackClass(tpl)}">
      <div class="row"><b>${compIconHtml} ${tpl.name}</b><span class="${q.cls}">${q.name} · ${(tpl.skills?.length||0)}主动${tpl.signature?'+1专属':''} · 品质战技+${companionQualitySkillCount(tpl)}</span></div>
      <div class="muted" style="font-size:10px">${'⭐'.repeat(c.stars||1)} · ${roleTag(tpl.role)} · ${tpl.desc}</div>
      ${companionMetaBadges(tpl)}
      ${companionCombatSummaryHtml(tpl, c, { compact:true })}
      ${companionBondChipsHtml(tpl, entries)}
      ${unique ? `<div class="muted" style="font-size:10px;color:#bae6fd">独有性质: ${unique.icon || '✦'} ${unique.name}${uniqueSummary ? ` · ${uniqueSummary}` : ''}</div>` : ''}
      ${tpl.signature?`<div class="muted" style="font-size:10px;color:#fcd34d">专属技: ${(typeof skillIcon === 'function') ? skillIcon(tpl.signature.name, 14, tpl.signature.icon||'✨') : (tpl.signature.icon||'✨')} ${tpl.signature.name}${tpl.signature.mode==='passive'?' [被动]':''}</div>`:''}
      ${companionLegendSkillHtml(tpl, true)}
      ${companionAwakenSkillHtml(tpl, c, true)}
      ${spec ? companionCombatSpecialLineHtml(tpl, c, { extra:veteran ? `${veteran.icon}${veteran.name}` : '' }) : ''}
      ${companionUpgradePreviewHtml(tpl, c)}
      ${companionAwakenPreviewHtml(tpl, c, { compact:true })}
      ${companionUseLockNoteHtml(tpl)}
      <div class="comp-skills">${compSkillChips(tpl, c)}</div>
      <div class="row">
        <span class="muted" style="font-size:10px">可用碎片 ${cost.have}${cost.maxed?'':' / 升星需'+cost.need}${(state.compUniversalShards[q.key]||0)>0?' (含通用×'+state.compUniversalShards[q.key]+')':''}</span>
        <div style="display:flex;flex-wrap:wrap;gap:3px">
          <button data-action="compdetail" data-key="${tpl.key}">详情</button>
          <button data-action="compwish" data-key="${tpl.key}">${entry.isWished ? '取消目标' : '加入目标'}</button>
          <button class="${supportActive ? 'gold' : ''}" data-action="compsupport" data-key="${tpl.key}" ${(!supportActive && !useGate.allowed) ? 'disabled' : ''} title="${useTitle}">${supportActive ? '取消支援' : '支援'}</button>
          <button class="primary" data-action="usecomp" data-idx="${i}" ${useGate.allowed ? '' : 'disabled'} title="${useTitle}">出战</button>
          <button class="gold" data-action="upgradecomp" data-idx="${i}" ${canUp?'':'disabled'}>${cost.maxed?'满星 ⭐5':'升星 '+(c.stars||1)+'/5'}</button>
          ${(() => { const ac = typeof getCompanionAwakenCost === 'function' ? getCompanionAwakenCost(c, tpl) : null; return ac ? `<button class="comp-awaken-btn ${ac.ready ? 'ready' : ''}" data-action="awakencomp" data-idx="${i}" ${(ac.ready && !ac.awakened) ? '' : 'disabled'}>${ac.awakened ? '已觉醒' : '觉醒'}</button>` : ''; })()}
        </div>
      </div>
    </div>`;
  }

  // ---- 图鉴:未获得(灰色)----
  const missingEntries = filteredEntries.filter(entry => !entry.isOwned).sort(companionEntryCompare);
  const missing = missingEntries.map(entry => entry.tpl);
  if (missing.length) {
    html += `<div class="detail-label" style="margin-top:6px">📖 未获得 (${missing.length})</div>
      <div class="comp-missing-grid">`;
    for (const t of missing) {
      const q = compQuality(t);
      const compIconHtml = companionIconHtml(t, 16);
      html += `<div class="comp-missing-card${companionCardTrackClass(t)}" title="${t.name} · ${q.name} · ${roleTag(t.role)} · ${t.desc}">
        <div><b>${compIconHtml} <span class="${q.cls}">${t.name}</span></b></div>
        ${companionMetaBadges(t)}
        ${companionBondChipsHtml(t, entries)}
        ${companionLegendSkillHtml(t, true)}
        <div class="muted" style="font-size:10px">${t.desc}</div>
        <button class="comp-missing-detail" data-action="compdetail" data-key="${t.key}">详情</button>
        <button class="comp-missing-detail" data-action="compwish" data-key="${t.key}">${companionIsWishlisted(t.key) ? '取消目标' : '加入目标'}</button>
      </div>`;
    }
    html += `</div>`;
  }

  if (owned > 0 && !filteredEntries.length) {
    html += '<div class="muted" style="text-align:center;padding:14px">当前标签下没有符合条件的随从</div>';
  }
  if (owned===0 && missing.length===COMPANIONS.length) {
    html += '<div class="muted" style="text-align:center;padding:14px">还没有随从,点击「抽随从」获取!</div>';
  }
  cl.innerHTML = html;
  cl.dataset.renderSig = renderSig;
  cl.dataset.rendered = '1';
}

let dgFilter = 'all'; // 'all' | '5man' | 'raid'
let dungeonSheetTab = 'list';
const DUNGEON_SHEET_TABS = [
  { key:'list', label:'列表', icon:'🏰' },
  { key:'bounty', label:'悬赏', icon:'🎯' },
  { key:'contract', label:'契约', icon:'📜' },
  { key:'waystone', label:'界碑', icon:'🧭' },
  { key:'mastery', label:'精通', icon:'🏅' },
];
function dungeonSheetTabsHtml(){
  const bounty = (typeof ensureDungeonBounties === 'function') ? ensureDungeonBounties(false) : null;
  const bountyReady = bounty?.targets?.filter(t => bounty.claimed?.[t.id]).length || '';
  const contract = (typeof dungeonContractLevel === 'function' && dungeonContractLevel() > 0) ? dungeonContractLevel() : '';
  const badge = { bounty:bountyReady, contract, list:'', waystone:'', mastery:'' };
  return `<div class="dungeon-sheet-tabs">${DUNGEON_SHEET_TABS.map(tab => `<button class="dungeon-sheet-tab ${dungeonSheetTab === tab.key ? 'active' : ''}" data-action="dungeonsheet" data-value="${tab.key}">${tab.icon} ${tab.label}${badge[tab.key] !== '' ? `<span>${badge[tab.key]}</span>` : ''}</button>`).join('')}</div>`;
}
function dungeonSetSheetTab(key){
  if (!DUNGEON_SHEET_TABS.some(tab => tab.key === key)) key = 'list';
  dungeonSheetTab = key;
  renderDungeon();
}
function renderDungeonSheetTabs(){
  const el = $('dungeon-sheet-tabs');
  if (el) el.innerHTML = dungeonSheetTabsHtml();
  for (const tab of DUNGEON_SHEET_TABS) {
    const panel = $(`dungeon-sheet-${tab.key}`);
    if (panel) panel.style.display = dungeonSheetTab === tab.key ? '' : 'none';
  }
}
function dungeonBountyTipHtml(target, options) {
  if (!target) return '';
  const cfg = options || {};
  const reward = (typeof dungeonBountyRewardText === 'function') ? dungeonBountyRewardText(target) : '';
  const meta = cfg.meta || reward || (target.tier ? `T${target.tier}` : '');
  return inlineTipSpanHtml({
    name: target.themeName || target.name || '副本悬赏',
    icon: target.icon || '🎯',
    desc: target.desc || '今日指定副本的额外目标。通关后会追加货币、精华与保底品质装备奖励。',
    meta,
  }, {
    fallbackIcon: 'achievement_bg_kill_flag_carrier',
    color: '#f6c453',
    metaVisible: cfg.metaVisible !== false,
  });
}
function dungeonBountyRewardTipHtml(target, rewardText, options) {
  const cfg = options || {};
  return inlineTipSpanHtml({
    name: cfg.name || '悬赏奖励',
    icon: cfg.icon || '🎁',
    desc: '完成今日目标副本后追加发放。蓝装+代表至少稀有装备;紫装+代表至少史诗装备,高阶副本仍有机会向上掉落。',
    meta: rewardText || ((typeof dungeonBountyRewardText === 'function') ? dungeonBountyRewardText(target) : ''),
  }, {
    fallbackIcon: 'inv_misc_bag_08',
    color: '#93c5fd',
    metaVisible: true,
  });
}
const DUNGEON_ATLAS_OVERRIDES = {
  ragefire:{ era:'Classic', location:'奥格瑞玛 · 裂影峡谷', route:'熔岩洞穴', theme:'火焰 / 恶魔', source:'怒焰裂谷原始副本线' },
  deadmines:{ era:'Classic', location:'西部荒野 · 月溪镇', route:'矿道到战船', theme:'迪菲亚 / 工程', source:'死亡矿井副本线' },
  wailing:{ era:'Classic', location:'贫瘠之地 · 哀嚎裂口', route:'梦魇洞窟', theme:'毒蛇 / 梦魇', source:'哀嚎洞穴副本线' },
  bfd:{ era:'Classic', location:'灰谷 · 佐拉姆海岸', route:'水下神殿', theme:'娜迦 / 古神低语', source:'黑暗深渊副本线' },
  shadowfang:{ era:'Classic', location:'银松森林 · 影牙城堡', route:'城堡回廊', theme:'狼人 / 亡灵', source:'影牙城堡副本线' },
  gnomeregan:{ era:'Classic', location:'丹莫罗 · 诺莫瑞根', route:'机械城深层', theme:'机械 / 辐射', source:'诺莫瑞根副本线' },
  razorfen:{ era:'Classic', location:'南贫瘠之地 · 剃刀沼泽', route:'荆棘巢穴', theme:'野猪人 / 荆棘', source:'剃刀沼泽副本线' },
  scarlet:{ era:'Classic', location:'提瑞斯法林地 · 血色修道院', route:'修道院四翼', theme:'圣光狂热', source:'血色修道院副本线' },
  razorfend:{ era:'Classic', location:'南贫瘠之地 · 剃刀高地', route:'亡灵荆棘高地', theme:'野猪人 / 天灾', source:'剃刀高地副本线' },
  uldaman:{ era:'Classic', location:'荒芜之地 · 奥达曼', route:'泰坦遗迹', theme:'土灵 / 泰坦', source:'奥达曼副本线' },
  maraudon:{ era:'Classic', location:'凄凉之地 · 玛拉顿', route:'双翼洞穴', theme:'自然 / 元素', source:'玛拉顿副本线' },
  zulfarrak:{ era:'Classic', location:'塔纳利斯 · 祖尔法拉克', route:'沙漠神庙', theme:'巨魔 / 沙怒', source:'祖尔法拉克副本线' },
  sunktemple:{ era:'Classic', location:'悲伤沼泽 · 阿塔哈卡神庙', route:'沉没神庙环层', theme:'巨魔 / 绿龙梦魇', source:'沉没的神庙副本线' },
  scholomance:{ era:'Classic', location:'西瘟疫之地 · 通灵学院', route:'亡灵学院', theme:'亡灵 / 诅咒', source:'通灵学院副本线' },
  brd:{ era:'Classic', location:'黑石山 · 黑铁城', route:'巨型迷宫', theme:'黑铁 / 熔火', source:'黑石深渊副本地图' },
  stratholme:{ era:'Classic', location:'东瘟疫之地 · 斯坦索姆', route:'亡城巷战', theme:'天灾 / 恐惧魔王', source:'斯坦索姆副本线' },
  mc:{ era:'Classic', location:'黑石山 · 熔火之心', route:'熔岩洞窟团本', theme:'火元素 / 熔核', source:'熔火之心团队副本' },
  diremaul:{ era:'Classic', location:'菲拉斯 · 厄运之槌', route:'三翼古城', theme:'食人魔 / 上层精灵 / 恶魔', source:'厄运之槌副本线' },
  lbrs:{ era:'Classic', location:'黑石山 · 黑石塔下层', route:'兽人与蛛巢下层', theme:'黑石兽人 / 龙人', source:'黑石塔下层副本线' },
  aq40:{ era:'Classic', location:'希利苏斯 · 安其拉神殿', route:'虫巢神殿团本', theme:'其拉虫群 / 古神', source:'安其拉神殿团队副本' },
  ubrs:{ era:'Classic', location:'黑石山 · 黑石塔上层', route:'将军议事厅', theme:'黑石氏族 / 黑龙军团', source:'黑石塔上层副本线' },
  bwl:{ era:'Classic', location:'黑石山 · 黑翼之巢', route:'龙人实验巢', theme:'黑龙军团 / 彩色龙', source:'黑翼之巢团队副本' },
  naxx:{ era:'Classic', location:'东瘟疫之地上空 · 纳克萨玛斯', route:'四区浮空城', theme:'天灾 / 通灵', source:'纳克萨玛斯团队副本' },
  karazhan:{ era:'The Burning Crusade', location:'逆风小径 · 麦迪文高塔', route:'高塔舞台', theme:'奥术 / 魅影', source:'卡拉赞团队副本' },
  manatombs:{ era:'The Burning Crusade', location:'泰罗卡森林 · 奥金顿', route:'虚灵陵墓', theme:'虚灵 / 法力虹吸', source:'法力陵墓副本线' },
  shattered:{ era:'The Burning Crusade', location:'地狱火半岛 · 地狱火堡垒', route:'兽人军营长廊', theme:'邪兽人 / 军团', source:'破碎大厅副本线' },
  steamvault:{ era:'The Burning Crusade', location:'赞加沼泽 · 盘牙水库', route:'蒸汽泵站', theme:'娜迦 / 水元素', source:'蒸汽地窟副本线' },
  arcatraz:{ era:'The Burning Crusade', location:'虚空风暴 · 风暴要塞', route:'纳鲁监狱', theme:'恶魔 / 虚空囚犯', source:'禁魔监狱副本线' },
  magister:{ era:'The Burning Crusade', location:'奎尔丹纳斯岛 · 魔导师平台', route:'日怒平台', theme:'血精灵 / 太阳井余烬', source:'魔导师平台副本线' },
  ssc:{ era:'The Burning Crusade', location:'赞加沼泽 · 盘牙水库', route:'水下王庭', theme:'娜迦 / 潮汐', source:'毒蛇神殿团队副本' },
  tk:{ era:'The Burning Crusade', location:'虚空风暴 · 风暴要塞', route:'浮空船坞', theme:'血精灵 / 奥术', source:'风暴要塞团队副本' },
  hyjal:{ era:'The Burning Crusade', location:'时光之穴 · 海加尔山', route:'世界之树防线', theme:'燃烧军团 / 时间战役', source:'海加尔山之战团队副本' },
  bt:{ era:'The Burning Crusade', location:'影月谷 · 黑暗神殿', route:'神殿阶层', theme:'伊利达雷 / 恶魔', source:'黑暗神殿团队副本' },
  sunwell:{ era:'The Burning Crusade', location:'奎尔丹纳斯岛 · 太阳之井高地', route:'高地平台团本', theme:'燃烧军团 / 太阳井', source:'太阳之井高地团队副本' },
  nexus:{ era:'Wrath of the Lich King', location:'北风苔原 · 考达拉', route:'奥术螺旋', theme:'蓝龙军团 / 魔网', source:'魔枢副本线' },
  gundrak:{ era:'Wrath of the Lich King', location:'祖达克 · 古达克', route:'巨魔神庙', theme:'达卡莱巨魔 / 血神', source:'古达克副本线' },
  culling:{ era:'Wrath of the Lich King', location:'时光之穴 · 斯坦索姆', route:'限时肃清', theme:'青铜龙 / 亡灵', source:'净化斯坦索姆副本线' },
  pit:{ era:'Wrath of the Lich King', location:'冰冠冰川 · 冰封大厅', route:'萨隆矿坑追击', theme:'天灾 / 萨隆邪铁', source:'萨隆矿坑副本线' },
  oculus:{ era:'Wrath of the Lich King', location:'北风苔原 · 考达拉', route:'龙骑浮空环', theme:'蓝龙军团 / 魔网飞行', source:'魔环副本线' },
  hor:{ era:'Wrath of the Lich King', location:'冰冠冰川 · 冰封大厅', route:'追逃走廊', theme:'霜之哀伤 / 天灾', source:'映像大厅副本线' },
  hol:{ era:'Wrath of the Lich King', location:'风暴峭壁 · 奥杜尔', route:'泰坦闪电大厅', theme:'泰坦造物 / 闪电', source:'闪电大厅副本线' },
  toc:{ era:'Wrath of the Lich King', location:'冰冠冰川 · 银色比武场', route:'竞技试炼场', theme:'银色北伐军 / 亡灵突袭', source:'冠军的试炼副本线' },
  forge:{ era:'Wrath of the Lich King', location:'冰冠冰川 · 冰封大厅', route:'灵魂熔炉前线', theme:'天灾 / 灵魂熔炉', source:'灵魂洪炉副本线' },
  ruby:{ era:'Wrath of the Lich King', location:'龙骨荒野 · 龙眠神殿下层', route:'红玉圣殿团本', theme:'红龙军团 / 暮光龙', source:'红玉圣殿团队副本' },
  icc:{ era:'Wrath of the Lich King', location:'冰冠冰川 · 冰冠堡垒', route:'多翼团本', theme:'天灾 / 冰霜', source:'冰冠堡垒团队副本' },
  vortex:{ era:'Cataclysm', location:'奥丹姆 · 天墙入口', route:'浮空风暴长廊', theme:'气元素 / 风暴', source:'旋云之巅副本线' },
  firelands:{ era:'Cataclysm', location:'海加尔山 · 火焰之地传送门', route:'火源团本', theme:'火元素 / 熔岩', source:'火焰之地团队副本' },
  dragonsoul:{ era:'Cataclysm', location:'塔纳利斯 · 时光之穴', route:'龙眠神殿到大漩涡', theme:'死亡之翼 / 暮光龙', source:'巨龙之魂团队副本' },
  stormstout:{ era:'Mists of Pandaria', location:'四风谷 · 风暴烈酒酿造厂', route:'酒窖乱斗', theme:'酒灵 / 煞气', source:'风暴烈酒酿造厂副本线' },
  shadopan:{ era:'Mists of Pandaria', location:'昆莱山 · 影踪禅院', route:'山巅禅院推进', theme:'影踪派 / 煞', source:'影踪禅院副本线' },
  throne:{ era:'Mists of Pandaria', location:'雷神岛 · 雷霆王座', route:'王座团本', theme:'魔古 / 赞达拉 / 雷电', source:'雷霆王座团队副本' },
  soo:{ era:'Mists of Pandaria', location:'锦绣谷与杜隆塔尔 · 奥格瑞玛', route:'攻城多区团本', theme:'库卡隆 / 煞能', source:'围攻奥格瑞玛团队副本' },
  irondocks:{ era:'Warlords of Draenor', location:'戈尔隆德 · 钢铁码头', route:'船坞军械线', theme:'钢铁部落 / 兽栏', source:'钢铁码头副本线' },
  grimrail:{ era:'Warlords of Draenor', location:'戈尔隆德 · 铁路深谷', route:'高速军列', theme:'钢铁部落 / 火炮', source:'铁路深谷副本线' },
  everbloom:{ era:'Warlords of Draenor', location:'戈尔隆德 · 永茂林地', route:'植物温室裂口', theme:'波塔尼 / 自然失控', source:'永茂林地副本线' },
  hfc:{ era:'Warlords of Draenor', location:'塔纳安丛林 · 地狱火堡垒', route:'军团堡垒团本', theme:'钢铁部落 / 燃烧军团', source:'地狱火堡垒团队副本' },
  valor:{ era:'Legion', location:'风暴峡湾 · 英灵殿', route:'英灵试炼厅', theme:'泰坦守护者 / 瓦尔基拉', source:'英灵殿副本线' },
  darkheart:{ era:'Legion', location:'瓦尔莎拉 · 黑心林地', route:'梦魇森林', theme:'翡翠梦魇 / 腐化自然', source:'黑心林地副本线' },
  court:{ era:'Legion', location:'苏拉玛 · 群星庭院', route:'贵族区潜入', theme:'夜之子 / 军团内应', source:'群星庭院副本线' },
  tomb:{ era:'Legion', location:'破碎海滩 · 萨格拉斯之墓', route:'陵墓团本', theme:'军团 / 泰坦遗迹', source:'萨格拉斯之墓团队副本' },
  antorus:{ era:'Legion', location:'阿古斯 · 安托兰废土', route:'燃烧王座团本', theme:'燃烧军团 / 泰坦', source:'安托鲁斯团队副本' },
  nightmare:{ era:'Legion', location:'瓦尔莎拉 · 翡翠梦魇', route:'腐化梦境团本', theme:'梦魇 / 腐林', source:'翡翠梦魇团队副本' },
  nighthold:{ era:'Legion', location:'苏拉玛 · 暗夜要塞', route:'夜井王宫团本', theme:'夜之子 / 奥术 / 军团', source:'暗夜要塞团队副本' },
  freehold:{ era:'Battle for Azeroth', location:'提拉加德海峡 · 自由镇', route:'海盗港乱斗', theme:'铁潮海盗 / 酒馆斗殴', source:'自由镇副本线' },
  mechagon:{ era:'Battle for Azeroth', location:'麦卡贡岛 · 麦卡贡行动', route:'机械城大型副本', theme:'机械侏儒 / 发明工坊', source:'麦卡贡行动副本线' },
  boralus:{ era:'Battle for Azeroth', location:'提拉加德海峡 · 伯拉勒斯', route:'港口巷战', theme:'艾什凡水兵 / 火炮', source:'围攻伯拉勒斯副本线' },
  ataldazar:{ era:'Battle for Azeroth', location:'祖达萨 · 阿塔达萨', route:'黄金金字塔', theme:'赞达拉 / 诸王陵墓', source:'阿塔达萨副本线' },
  uldir:{ era:'Battle for Azeroth', location:'纳兹米尔 · 奥迪尔', route:'泰坦隔离设施团本', theme:'戈霍恩 / 腐血实验', source:'奥迪尔团队副本' },
  waycrest:{ era:'Battle for Azeroth', location:'德鲁斯瓦 · 维克雷斯庄园', route:'诅咒庄园', theme:'德鲁斯特 / 女巫', source:'维克雷斯庄园副本线' },
  kingsrest:{ era:'Battle for Azeroth', location:'祖达萨 · 国王之眠', route:'赞达拉王陵', theme:'历代先王 / 黄金守卫', source:'国王之眠副本线' },
  eternalpalace:{ era:'Battle for Azeroth', location:'纳沙塔尔 · 永恒王宫', route:'深海王宫团本', theme:'娜迦 / 恩佐斯', source:'阿萨拉的永恒王宫团队副本' },
  nyalotha:{ era:'Battle for Azeroth', location:'奥丹姆或锦绣谷 · 黑暗帝国幻境', route:'古神梦境团本', theme:'恩佐斯 / 黑暗帝国', source:'尼奥罗萨团队副本' },
  necrotic:{ era:'Shadowlands', location:'晋升堡垒 · 通灵战潮', route:'浮空死灵兵工厂', theme:'玛卓克萨斯 / 通灵构造体', source:'通灵战潮副本线' },
  nathria:{ era:'Shadowlands', location:'雷文德斯 · 纳斯利亚堡', route:'哥特城堡团本', theme:'温西尔 / 噬渊灵魂', source:'纳斯利亚堡团队副本' },
};
function dungeonEraGuess(dg) {
  if (dg.raidExpansion) return dg.raidExpansion;
  const lvl = dg.reqLvl || 1;
  if (lvl >= 96) return 'Midnight / K\'aresh';
  if (lvl >= 88) return 'The War Within';
  if (lvl >= 80) return 'Dragonflight+';
  if (lvl >= 76) return 'Wrath / Cataclysm';
  if (lvl >= 70) return 'Burning Crusade+';
  return 'Classic';
}
function dungeonAtlasInfo(dg) {
  if (!dg) return null;
  const baseKey = (typeof baseDungeonKey === 'function') ? baseDungeonKey(dg.key) : dg.key;
  const override = DUNGEON_ATLAS_OVERRIDES[baseKey] || {};
  const bosses = dg.bosses || [];
  const finalBoss = bosses[bosses.length - 1]?.name || '最终首领';
  const mode = dg.delve ? '地下堡' : (dg.type === 'raid' ? '团队副本' : '5人地下城');
  return {
    era: override.era || dungeonEraGuess(dg),
    location: override.location || (dg.raidExpansion ? `${dg.raidExpansion} 战役` : '艾泽拉斯副本入口'),
    route: override.route || (dg.delve ? '短线高压' : (dg.type === 'raid' ? '多首领推进' : '线性清剿')),
    theme: override.theme || (dg.type === 'raid' ? '团队首领战' : '小队战斗路线'),
    source: override.source || '副本手册记录',
    mode,
    finalBoss,
  };
}
function dungeonAtlasTipHtml(label, value, icon, desc, fallbackIcon, color) {
  return inlineTipSpanHtml({
    name: label,
    icon,
    desc,
    meta: value,
  }, {
    fallbackIcon,
    color,
    metaVisible: true,
    className: 'dungeon-atlas-tip dungeon-inline-tip',
  });
}
function dungeonPowerText(dg) {
  if (!dg) return '';
  const power = (typeof dg.powerLvl === 'number' && dg.powerLvl > 0) ? dg.powerLvl : (dg.reqLvl || 1);
  return `战斗强度 ${Math.round(power)}`;
}
function dungeonEstimatedDropPower(dg) {
  if (!dg) return 1;
  const power = (typeof dg.powerLvl === 'number' && dg.powerLvl > 0) ? dg.powerLvl : (dg.reqLvl || 1);
  const spawnLvl = Math.max(1, Math.floor(power * 1.05));
  return Math.max(1, spawnLvl + 2);
}
function dungeonEstimatedItemLevel(dg, rarityKey) {
  if (!dg || typeof computeItemLevel !== 'function') return 0;
  const gearTier = (typeof gearTierForDungeon === 'function') ? gearTierForDungeon(dg.key) : (dg.epic5 ? 4 : (dg.heroic ? 1 : 0));
  return computeItemLevel({
    rarity: rarityKey || 'epic',
    gearTier,
    epicRaid: !!dg.epicRaid,
    _rollPower: dungeonEstimatedDropPower(dg),
  });
}
function dungeonLootIlvlText(dg) {
  if (!dg) return '';
  if (dg.type !== 'raid') {
    const minRarity = (dg.heroic || dg.epic5) ? 'epic' : 'rare';
    const min = dungeonEstimatedItemLevel(dg, minRarity);
    const max = dungeonEstimatedItemLevel(dg, 'legend');
    if (!min || !max) return '';
    return `${dg.epic5 ? '史诗5人' : (dg.heroic ? '英雄首领' : '首领')}掉落装等 ${min}-${max}`;
  }
  if (typeof raidDropIlvl !== 'function') return '';
  const baseKey = (typeof baseDungeonKey === 'function') ? baseDungeonKey(dg.key) : (dg.baseKey || dg.key);
  const bossCount = Math.max(1, (dg.bosses || []).length);
  const epicMode = !!dg.epicRaid;
  const minRarity = epicMode ? 'epic' : 'rare';
  const min = raidDropIlvl(baseKey, minRarity, epicMode, 0, bossCount);
  const max = raidDropIlvl(baseKey, 'legend', epicMode, Math.max(0, bossCount - 1), bossCount);
  return `掉落装等 ${min}-${max}`;
}
function dungeonProgressionPillsHtml(dg) {
  const power = dungeonPowerText(dg);
  const loot = dungeonLootIlvlText(dg);
  const recIlvl = (typeof dungeonRecommendedItemLevel === 'function') ? dungeonRecommendedItemLevel(dg) : 0;
  const reqIlvl = (typeof dungeonRequiredItemLevel === 'function') ? dungeonRequiredItemLevel(dg) : 0;
  const ilvlPill = reqIlvl > 0
    ? `<div class="pill" style="color:#f6c453">准入装等 ${reqIlvl}</div>`
    : (recIlvl > 0 ? `<div class="pill">推荐装等 ${recIlvl}</div>` : '');
  return `${power ? `<div class="pill">${power}</div>` : ''}${loot ? `<div class="pill">${loot}</div>` : ''}${ilvlPill}`;
}
function dungeonRaidProgressionHtml(dg, compact) {
  if (!dg || dg.type !== 'raid' || typeof raidProgression !== 'function') return '';
  const baseKey = (typeof baseDungeonKey === 'function') ? baseDungeonKey(dg.key) : (dg.baseKey || dg.key);
  const prog = raidProgression(baseKey);
  const trackTip = inlineTipSpanHtml({
    name:'团本阶梯',
    icon:'📈',
    desc:'团本按资料片与推出顺序形成线性强度阶梯；即使入口等级相同，越靠后的团本怪物强度与掉落装等也会继续提升。',
    meta:`第${prog.order || '?'}阶 · ${prog.tier || 'T?'}`
  }, {
    fallbackIcon:'achievement_dungeon_ulduar_raildriver',
    color:'#f6c453',
    metaVisible:true,
    className:'dungeon-raid-tip dungeon-inline-tip'
  });
  const powerTip = inlineTipSpanHtml({
    name:'推荐战力',
    icon:'⚔️',
    desc:'用于实际怪物等级、首领压力和战斗缩放；史诗团本和后期资料片会明显高于入口等级。',
    meta:dungeonPowerText(dg)
  }, {
    fallbackIcon:'ability_warrior_savageblow',
    color:'#fca5a5',
    metaVisible:true,
    className:'dungeon-raid-tip dungeon-inline-tip'
  });
  const lootTip = inlineTipSpanHtml({
    name:'掉落阶梯',
    icon:'🎁',
    desc:'首领掉落会按团本顺序、首领位置和品质计算装等；尾王与传说品质会更高。',
    meta:dungeonLootIlvlText(dg) || '常规团本掉落'
  }, {
    fallbackIcon:'inv_misc_gem_topaz_02',
    color:'#fde68a',
    metaVisible:true,
    className:'dungeon-raid-tip dungeon-inline-tip'
  });
  const modeTip = inlineTipSpanHtml({
    name:dg.epicRaid ? '史诗重制' : '普通进度',
    icon:dg.epicRaid ? '🔥' : '📜',
    desc:dg.epicRaid ? '史诗团本会按基础团本等级和团本进度阶梯提升战斗强度，并使用史诗套装、散件和全首领低概率传说掉落。' : '普通团本保留资料片进度节奏，关底首领有低概率传说武器。',
    meta:prog.expansion || '团本'
  }, {
    fallbackIcon:dg.epicRaid ? 'spell_fire_selfdestruct' : 'inv_misc_book_11',
    color:dg.epicRaid ? '#fb7185' : '#c4b5fd',
    metaVisible:true,
    className:'dungeon-raid-tip dungeon-inline-tip'
  });
  if (compact) return `<div class="dungeon-raid-track compact">${trackTip}${powerTip}${lootTip}</div>`;
  return `<div class="dungeon-raid-track">
    <div class="dungeon-raid-track-head"><b>团本进度阶梯</b><span>${tipAttrText(prog.expansion || '')}</span></div>
    <div class="dungeon-raid-track-grid">${modeTip}${trackTip}${powerTip}${lootTip}</div>
  </div>`;
}
const DUNGEON_SHARED_ART_KEYS = new Set([
  'ulduar','sethekk','atonement','plaguefall','mists','theater',
  'azurevault','hallsinfusion','brackenhide','neltharus','nokhud',
  'ecodome_aldani','oasis_succession','tazavesh_streets','tazavesh_gambit',
  'overlook_zoshul','manaforge_omega'
]);
function dungeonArtInfo(dg) {
  if (!dg?.art) return null;
  const baseKey = (typeof baseDungeonKey === 'function') ? baseDungeonKey(dg.key) : dg.key;
  const backfill = (typeof DUNGEON_ART_BACKFILL !== 'undefined') ? DUNGEON_ART_BACKFILL[baseKey] : '';
  const art = String(dg.art || '');
  const isBackfilled = !!backfill && art === backfill;
  const generic = /timewalking-|warwithin-dungeon-banner|dungeon-banner/i.test(art);
  const shared = /ecodome-rhovan|tazavesh-banner|karesh-map|shadow-point|shandorah|primeus-repository|voidrazor-sanctum|aberrus-banner|amirdrassil-banner/i.test(art);
  if (DUNGEON_SHARED_ART_KEYS.has(baseKey)) {
    return { label:'区域图', cls:'shared', icon:'🌐', desc:'使用同区域、同战役或同副本群的共享图片，优先保证视觉主题贴近该副本。' };
  }
  if (isBackfilled && !generic) {
    return { label:'副本图', cls:'specific', icon:'🗺️', desc:'使用本地 WoW 风格副本/入口/区域图片。克隆难度会继承基础副本图片。' };
  }
  if (shared) {
    return { label:'区域图', cls:'shared', icon:'🌐', desc:'使用同区域或同战役的共享图片，优先保证视觉主题贴近该副本。' };
  }
  if (generic) {
    return { label:'横幅图', cls:'generic', icon:'📜', desc:'当前仍使用资料片或时空漫游横幅，后续可继续替换为更精确的原版副本图。' };
  }
  return { label:'副本图', cls:'specific', icon:'🗺️', desc:'副本列表与详情页使用这张图片作为地图视觉。' };
}
function dungeonArtBadgeHtml(dg) {
  const info = dungeonArtInfo(dg);
  if (!info) return '';
  const tip = inlineTipSpanHtml({
    name:info.label,
    icon:info.icon,
    desc:info.desc,
    meta:dg.art || '',
  }, {
    fallbackIcon:'inv_misc_map_01',
    color:info.cls === 'generic' ? '#c4b5fd' : (info.cls === 'shared' ? '#67e8f9' : '#f6c453'),
    metaVisible:false,
    className:'dungeon-art-tip dungeon-inline-tip',
  });
  return `<div class="dungeon-art-badge ${info.cls}">${tip}</div>`;
}
function dungeonTraitTagLabel(tag) {
  return ({
    fire:'火焰', dragon:'巨龙', forge:'铸造', void:'虚空', shadow:'暗影', precision:'精准',
    storm:'风暴', speed:'机动', air:'天空', fortress:'壁垒', holy:'圣光', tank:'坚守',
    nature:'自然', beast:'野兽', blood:'鲜血', undead:'亡灵', naga:'娜迦', arcane:'奥术',
    titan:'泰坦', mech:'机械', time:'时序', ritual:'仪式', dot:'持续', execute:'斩杀',
    heal:'治疗', water:'水域', caster:'施法', burst:'爆发', giant:'巨型', pirate:'海盗',
    noble:'王庭', raid:'团本', oldgod:'古神', elf:'精灵', agility:'敏捷', troll:'巨魔',
    spider:'蛛魔', poison:'毒性', ethereal:'虚灵', delve:'地下堡', mythic:'秘境',
    plague:'瘟疫', martial:'武备', orc:'兽人'
  })[tag] || tag;
}
function dungeonRoomRouteTagHtml(room) {
  const matched = (room?.matchedTags || []).map(dungeonTraitTagLabel);
  if (!room?.routeMatched || !matched.length) return '';
  return `<span class="dungeon-room-route-tag">路线匹配:${matched.join('/')}</span>`;
}
function dungeonTraitChanceText(preview) {
  const c = preview?.chance || {};
  const pct = v => typeof v === 'number' ? `${Math.round(v * 100)}%` : '?';
  return `蓝${pct(c.rare)} / 紫${pct(c.epic)} / 橙${pct(c.legend)}`;
}
function dungeonTraitPreviewHtml(dg) {
  if (!dg || typeof dungeonTraitPreviewForDungeon !== 'function') return '';
  const preview = dungeonTraitPreviewForDungeon(dg.key, 5);
  if (!preview?.traits?.length) return '';
  const tagChips = (preview.tags || []).slice(0, 8).map(tag => `<span class="dungeon-trait-tag">${dungeonTraitTagLabel(tag)}</span>`).join('');
  const chanceTip = inlineTipSpanHtml({
    name:preview.tierName || '副本印记',
    icon:'🎲',
    desc:'精良以上副本装备有概率获得副本印记。高难度来源概率更高;触发后会优先从本副本主题标签匹配的印记中抽取。',
    meta:dungeonTraitChanceText(preview),
  }, {
    fallbackIcon:'inv_misc_dice_02',
    color:'#f6c453',
    metaVisible:true,
  });
  const chips = preview.traits.map(t => inlineTipSpanHtml({
    name: t.name,
    icon: t.icon || '✦',
    desc: `${t.desc || '该副本更容易掉落的装备印记。'}${t.tags?.length ? ` 匹配标签: ${t.tags.map(dungeonTraitTagLabel).join('、')}` : ''}`,
    meta: preview.tierName || '倾向印记',
  }, {
    fallbackIcon:'inv_misc_gem_diamond_02',
    color:'#fde68a',
    metaVisible:true,
  })).join('');
  return `<div class="dungeon-mechanic-codex">
    <b>💎 掉落倾向</b>
    <div class="muted" style="font-size:11px;margin:3px 0 6px">${chanceTip} · 触发后优先抽取这些主题印记；少量掉落仍可能出现通用印记。</div>
    ${tagChips ? `<div class="dungeon-trait-tags">${tagChips}</div>` : ''}
    <div class="dungeon-mechanic-codex-grid">${chips}</div>
  </div>`;
}
function dungeonThemeAffixHtml(dg, compact) {
  if (!dg || typeof getDungeonThemeAffixes !== 'function') return '';
  const affixes = getDungeonThemeAffixes(dg);
  if (!affixes.length) return '';
  const chips = affixes.map(a => inlineTipSpanHtml({
    name:a.name || '主题压力',
    icon:a.icon || '🧭',
    desc:a.desc || '该副本按主题固定生效的战斗规则。',
    meta:(typeof dungeonAffixMeta === 'function') ? dungeonAffixMeta(a) : '主题压力',
  }, {
    fallbackIcon:'spell_arcane_starfire',
    color:'#67e8f9',
    metaVisible:!compact,
  })).join(' · ');
  if (compact) return `<div class="dungeon-theme-line">🧭 主题: ${chips}</div>`;
  return `<div class="dungeon-mechanic-codex">
    <b>🧭 主题压力</b>
    <div class="muted" style="font-size:11px;margin:3px 0 6px">每座副本会按地图/Boss/资料片主题固定获得一条常驻战斗规则；它会提高对应怪物压力，并计入通关词缀奖励。</div>
    <div class="dungeon-mechanic-codex-grid">${chips}</div>
  </div>`;
}
function dungeonCompanionRecommendationHtml(dg, compact) {
  if (!dg || typeof companionDungeonNeedTags !== 'function' || typeof companionDungeonFitInfo !== 'function') return '';
  const needs = companionDungeonNeedTags(dg);
  const ownedEntries = (state.companions || []).map(comp => {
    const tpl = COMPANIONS.find(c => c.key === comp.key);
    if (!tpl) return null;
    const fit = companionDungeonFitInfo(tpl, dg);
    const q = compQuality(tpl);
    const veteran = (typeof companionVeteranInfo === 'function') ? companionVeteranInfo(tpl, comp) : null;
    return { comp, tpl, fit, q, veteran, score:fit.score * 100 + (veteran ? 18 : 0) + (comp.stars || 1) * 3 + ({white:14,green:12,blue:8,purple:4,orange:0}[q.key] || 0) };
  }).filter(x => x && x.fit.score > 0).sort((a,b) => b.score - a.score).slice(0, compact ? 3 : 5);
  const needText = needs.map(tag => `<span>${companionDungeonTagLabel(tag)}</span>`).join('');
  const recText = ownedEntries.map(entry => {
    const spec = (typeof companionCombatSpecial === 'function') ? companionCombatSpecial(entry.tpl.key) : null;
    const unique = (typeof companionUniqueTrait === 'function') ? companionUniqueTrait(entry.tpl) : null;
    const specTip = spec ? `<br>${companionCombatSpecialTipHtml(entry.tpl, entry.comp)}` : '';
    const tip = `<b>${tipAttrText(entry.tpl.name)}</b><br>${entry.q.name} · ${entry.comp.stars || 1}星 · ${tipAttrText(spec?.name || '专属战斗')}${specTip}<br>${unique ? `${tipAttrText(unique.icon || '✦')} ${tipAttrText(unique.name)}: ${tipAttrText(unique.desc || '')}<br>` : ''}匹配: ${tipAttrText(entry.fit.matched.map(companionDungeonTagLabel).join(' / '))}${entry.veteran ? `<br>${tipAttrText(entry.veteran.desc)}` : ''}`.replace(/"/g, '&quot;');
    return `<span class="dungeon-comp-rec" data-tip="${tip}">${companionIconHtml(entry.tpl, compact ? 14 : 16)} ${tipAttrText(entry.tpl.name)}<b>${entry.fit.matched.map(companionDungeonTagLabel).join('/')}</b></span>`;
  }).join('');
  if (compact) {
    return `<div class="dungeon-companion-line">🐾 推荐随从: ${recText || '<span class="muted">暂无已拥有匹配随从</span>'}<em>${needText}</em></div>`;
  }
  return `<div class="dungeon-companion-panel">
    <div class="dungeon-companion-head"><b>🐾 随从推荐</b><span>${needText}</span></div>
    <div class="muted" style="font-size:11px;margin:3px 0 6px">推荐按副本主题压力匹配专属战斗标签；低品质满星随从会因为老兵特性更适合作为机制支援位。</div>
    <div class="dungeon-companion-grid">${recText || '<span class="muted">暂无已拥有匹配随从，可以用支援位补机制短板。</span>'}</div>
  </div>`;
}
function bossChallengeMetaText(challenge) {
  if (!challenge) return '';
  if (challenge.key === 'swiftKill' || challenge.seconds) return `${challenge.seconds || 55}秒内击杀`;
  if (challenge.key === 'healthyFinish' || challenge.hpPct) return `收尾生命≥${Math.round((challenge.hpPct || 0.35) * 100)}%`;
  if (challenge.target) return `${challenge.target}次`;
  return '挑战目标';
}
function dungeonFirstClearPreviewHtml(dg) {
  if (!dg) return '';
  const cleared = !!(state.dungeonFirstClear && state.dungeonFirstClear[dg.key]);
  const lastBoss = (dg.bosses || [])[(dg.bosses || []).length - 1];
  const source = lastBoss ? `${lastBoss.name} 掉落池` : '最终首领掉落池';
  const rewardTip = inlineTipSpanHtml({
    name: cleared ? '首通战利品已领取' : '首通战利品',
    icon: cleared ? '✅' : '🎁',
    desc: '首次通关该副本会获得一件来自本副本尾王掉落池的保底史诗装备。装备会继承副本来源、装等梯队、套装/团本字段和副本印记倾向。',
    meta: source,
  }, {
    fallbackIcon:'inv_misc_gem_topaz_02',
    color:'#f6c453',
    metaVisible:true,
  });
  const legendTip = (dg.type === 'raid' || dg.reqLvl >= 70) ? inlineTipSpanHtml({
    name:'幸运副本橙装',
    icon:'🌟',
    desc:'团本或高等级副本首通有小概率额外获得一件副本来源传说装备；若尾王没有专属橙装池，会回退为带该副本来源和梯队的传说装备。',
    meta:'小概率',
  }, {
    fallbackIcon:'inv_sword_39',
    color:'#fb923c',
    metaVisible:true,
  }) : '';
  return `<div class="dungeon-first-clear-preview ${cleared ? 'done' : ''}">
    <b>${cleared ? '✅ 首通已完成' : '🎁 首通战利品'}</b>
    <div class="muted" style="font-size:11px;margin-top:4px">${rewardTip}${legendTip ? ` · ${legendTip}` : ''}</div>
  </div>`;
}
function dungeonAtlasHtml(dg, compact) {
  const atlas = dungeonAtlasInfo(dg);
  if (!atlas) return '';
  const locationTip = dungeonAtlasTipHtml('入口区域', atlas.location, '🗺️', '副本在魔兽世界中的入口或叙事归属。', 'inv_misc_map_01', '#93c5fd');
  const routeTip = dungeonAtlasTipHtml('路线结构', atlas.route, '🚩', '副本路线的战斗节奏:线性、迷宫、多翼、短线或追逃。', 'achievement_bg_returnxflags_def_wsg', '#f6c453');
  const finalTip = dungeonAtlasTipHtml('关底首领', atlas.finalBoss, '👑', '本副本最后一名首领,通关结算与高价值掉落通常围绕这里。', 'achievement_boss_lichking', '#fbbf24');
  if (compact) {
    return `<div class="dungeon-atlas-strip compact">${locationTip}${routeTip}${finalTip}</div>`;
  }
  const eraTip = dungeonAtlasTipHtml('时代来源', atlas.era, '📜', '副本归属的资料片或内容阶段。', 'inv_misc_book_11', '#c4b5fd');
  const modeTip = dungeonAtlasTipHtml('挑战类型', atlas.mode, '⚔️', '该内容使用的队伍规模与战斗结构。', 'ability_warrior_savageblow', '#fca5a5');
  const themeTip = dungeonAtlasTipHtml('主题压力', atlas.theme, '🔮', '本副本最常见的怪物主题、机制风味或环境压力。', 'spell_arcane_starfire', '#67e8f9');
  return `<div class="dungeon-atlas-panel">
    <div class="dungeon-atlas-head"><b>副本手册</b><span>${tipAttrText(atlas.source)}</span></div>
    <div class="dungeon-atlas-strip">${eraTip}${modeTip}${locationTip}${routeTip}${themeTip}${finalTip}</div>
  </div>`;
}
function dungeonRouteBriefHtml(dg, selectedContract) {
  if (!dg) return '';
  const contractLevel = Math.max(0, Math.floor(selectedContract?.level || 0));
  const atlas = dungeonAtlasInfo(dg);
  const tags = (typeof dungeonTraitTagsForDungeon === 'function') ? dungeonTraitTagsForDungeon(dg.key) : [];
  const themeAffixes = (typeof getDungeonThemeAffixes === 'function') ? getDungeonThemeAffixes(dg) : [];
  const rooms = (typeof getDungeonCombatRooms === 'function') ? getDungeonCombatRooms(dg, contractLevel) : [];
  const edicts = contractLevel > 0 && typeof getDungeonTacticalEdicts === 'function' ? getDungeonTacticalEdicts(dg, contractLevel) : [];
  const environments = contractLevel > 0 && typeof getDungeonEnvironments === 'function' ? getDungeonEnvironments(dg, contractLevel) : [];
  const cataclysms = contractLevel > 0 && typeof getDungeonCataclysms === 'function' ? getDungeonCataclysms(dg, contractLevel) : [];
  const trials = contractLevel > 0 && typeof getDungeonContractTrials === 'function' ? getDungeonContractTrials(dg, contractLevel) : [];
  const timer = contractLevel > 0 && typeof createDungeonTimer === 'function' ? createDungeonTimer(dg, contractLevel) : null;
  const timeMarkSummary = contractLevel > 0 && typeof dungeonTimeMarkSummary === 'function' ? dungeonTimeMarkSummary(edicts, 0) : null;
  const traitPreview = (typeof dungeonTraitPreviewForDungeon === 'function') ? dungeonTraitPreviewForDungeon(dg.key, 3) : null;
  const lastBoss = (dg.bosses || [])[(dg.bosses || []).length - 1];
  const challengePreview = lastBoss && typeof getDungeonBossChallengeSeals === 'function' ? getDungeonBossChallengeSeals(lastBoss).slice(0, 3) : [];
  const tagChips = tags.slice(0, 7).map(tag => `<span class="dungeon-trait-tag">${dungeonTraitTagLabel(tag)}</span>`).join('');
  const routeTip = inlineTipSpanHtml({
    name:'路线定位',
    icon:'🚩',
    desc:'根据副本地图、首领主题和掉落标签汇总出的今日处理重点。它不会改变数值,只把分散在手册、词缀和契约里的信息聚合到入口处。',
    meta:atlas?.route || '副本路线',
  }, { fallbackIcon:'achievement_bg_returnxflags_def_wsg', color:'#f6c453', metaVisible:true });
  const pressureItems = []
    .concat(themeAffixes.slice(0, 1).map(a => ({ item:a, fallback:'spell_arcane_starfire', color:'#67e8f9', meta:(typeof dungeonAffixMeta === 'function') ? dungeonAffixMeta(a) : '主题压力' })))
    .concat(rooms.slice(0, 2).map(r => ({ item:r, fallback:'inv_misc_dice_02', color:'#f9a8d4', meta:r.routeMatched ? '路线匹配' : '房间' })))
    .concat(environments.slice(0, 1).map(e => ({ item:e, fallback:'spell_frost_arcticwinds', color:'#67e8f9', meta:'环境' })))
    .concat(cataclysms.slice(0, 1).map(c => ({ item:c, fallback:'spell_nature_earthquake', color:'#fb7185', meta:c.meta || '灾变' })))
    .concat(edicts.slice(0, 2).map(e => ({ item:e, fallback:'inv_scroll_03', color:'#fde68a', meta:'禁令' })))
    .concat(timeMarkSummary ? [{ item:timeMarkSummary, fallback:'achievement_bg_kill_flag_carrier', color:'#fca5a5', meta:timeMarkSummary.meta }] : [])
    .concat(trials.slice(0, 1).map(t => ({ item:t, fallback:'ability_warrior_battleshout', color:'#fb7185', meta:'试炼' })));
  if (timer) pressureItems.push({ item:{ name:'限时挑战', icon:'⏳', desc:'在限定时间内通关可获得额外奖励;超时后进入时序脉冲。' }, fallback:'inv_misc_pocketwatch_01', color:'#fde68a', meta:timer.label });
  const pressureHtml = pressureItems.length ? pressureItems.slice(0, 7).map(x => inlineTipSpanHtml(x.item, {
    fallbackIcon:x.fallback,
    color:x.color,
    meta:x.meta,
    metaVisible:true,
  })).join('') : '<span class="muted">标准路线,无额外契约压力</span>';
  const challengeHtml = challengePreview.length ? challengePreview.map(ch => inlineTipSpanHtml({
    ...ch,
    meta:bossChallengeMetaText(ch),
  }, {
    fallbackIcon:'achievement_bg_killxenemies_generalsroom',
    color:'#fde68a',
    metaVisible:true,
  })).join('') : inlineTipSpanHtml({
    name:lastBoss?.name || '最终首领',
    icon:lastBoss?.emoji || '👑',
    desc:'关底首领决定通关与高价值掉落。打开首领条目可查看完整技能、挑战、弱点和扩展机制。',
    meta:'关底',
  }, { fallbackIcon:'achievement_boss_lichking', color:'#fbbf24', metaVisible:true });
  const traitHtml = traitPreview?.traits?.length ? traitPreview.traits.slice(0, 3).map(t => inlineTipSpanHtml({
    name:t.name,
    icon:t.icon || '✦',
    desc:t.desc || '该副本更容易掉落的装备印记。',
    meta:traitPreview.tierName || '掉落倾向',
  }, { fallbackIcon:'inv_misc_gem_diamond_02', color:'#fde68a', metaVisible:true })).join('') : '<span class="muted">常规副本掉落</span>';
  const contractText = selectedContract?.level ? `${selectedContract.icon || '📜'} ${selectedContract.name}` : '📘 标准路线';
  const rewardMeta = [dungeonLootIlvlText(dg), traitPreview ? dungeonTraitChanceText(traitPreview) : ''].filter(Boolean).join(' · ');
  return `<div class="dungeon-route-brief">
    <div class="dungeon-route-brief-head">
      <b>🧭 今日路线</b>
      <span>${tipAttrText(contractText)}</span>
    </div>
    <div class="dungeon-route-brief-grid">
      <div class="dungeon-route-brief-cell">
        <span>定位</span>
        <div>${routeTip}</div>
        ${tagChips ? `<div class="dungeon-route-tags">${tagChips}</div>` : ''}
      </div>
      <div class="dungeon-route-brief-cell">
        <span>压力</span>
        <div class="dungeon-route-token-row">${pressureHtml}</div>
      </div>
      <div class="dungeon-route-brief-cell">
        <span>首领处理</span>
        <div class="dungeon-route-token-row">${challengeHtml}</div>
      </div>
      <div class="dungeon-route-brief-cell">
        <span>战利品重点</span>
        <div class="dungeon-route-token-row">${traitHtml}</div>
        ${rewardMeta ? `<small>${tipAttrText(rewardMeta)}</small>` : ''}
      </div>
    </div>
  </div>`;
}
function renderDungeonBountyPanel() {
  const el = $('dungeon-bounty-panel');
  if (!el) return;
  const bounty = (typeof ensureDungeonBounties === 'function') ? ensureDungeonBounties(false) : null;
  if (!bounty || !Array.isArray(bounty.targets) || !bounty.targets.length) {
    el.innerHTML = '';
    return;
  }
  const leftMs = Math.max(0, (bounty.resetAt || 0) - Date.now());
  const items = bounty.targets.map(t => {
    const done = !!bounty.claimed?.[t.id];
    const dg = DUNGEONS.find(x => x.key === t.key);
    const type = dg?.epicRaid ? '史诗团本' : dg?.epic5 ? '史诗5人' : dg?.heroic ? '英雄' : dg?.type === 'raid' ? '团本' : '5人本';
    const reward = (typeof dungeonBountyRewardText === 'function') ? dungeonBountyRewardText(t) : '';
    const bountyTip = dungeonBountyTipHtml(t, { metaVisible: false });
    const rewardTip = dungeonBountyRewardTipHtml(t, reward);
    return `<div class="dungeon-bounty-mini ${done ? 'done' : ''}">
      <div><b>${t.icon || '🎯'} ${t.name}</b> <span class="muted">[${type}]</span>${done ? ' <span class="pos">已完成</span>' : ''}</div>
      <div class="muted">${bountyTip} · ${rewardTip}</div>
    </div>`;
  }).join('');
  el.innerHTML = `
    <div class="dungeon-bounty-panel">
      <div class="dungeon-bounty-title">
        <span>🎯 今日副本悬赏</span>
        <span class="muted">刷新 ${fmtCd(Math.ceil(leftMs / 1000))}</span>
      </div>
      <div class="dungeon-bounty-grid">${items}</div>
    </div>`;
  bindInlineTipElements(el);
}

function renderDungeonContractPanel() {
  const el = $('dungeon-contract-panel');
  if (!el) return;
  if (typeof DUNGEON_CONTRACTS === 'undefined' || typeof dungeonContractLevel !== 'function') {
    el.innerHTML = '';
    return;
  }
  const cur = dungeonContractLevel();
  const disabled = state.mode !== 'world';
  const buttons = DUNGEON_CONTRACTS.map(c => `
    <button data-action="setdungeoncontract" data-level="${c.level}" class="${cur === c.level ? 'active' : ''}" ${disabled ? 'disabled' : ''} title="${c.desc}">
      ${c.icon} ${c.name}
    </button>`).join('');
  const info = typeof dungeonContractInfo === 'function' ? dungeonContractInfo(cur) : DUNGEON_CONTRACTS[0];
  el.innerHTML = `
    <div class="dungeon-contract-panel">
      <div class="dungeon-contract-title">
        <span>📜 副本契约</span>
        <span class="muted">${info.desc}</span>
      </div>
      <div class="dungeon-contract-buttons">${buttons}</div>
    </div>`;
}

function dungeonBossPreviewSkills(boss) {
  const skills = Array.isArray(boss?.skills) ? boss.skills.slice() : [];
  if (Array.isArray(boss?.passive?.tricks)) skills.push(...boss.passive.tricks);
  if (typeof getDungeonBossDirectorSkills === 'function') skills.push(...getDungeonBossDirectorSkills(boss));
  return skills.filter(Boolean);
}

function dungeonBossHandlingTags(boss) {
  const skills = dungeonBossPreviewSkills(boss);
  const has = predicate => skills.some(predicate);
  const maxMul = skills.reduce((m, s) => Math.max(m, typeof s.mul === 'number' ? s.mul : 0), 0);
  const tags = [];
  const push = (key, name, icon, desc, meta, fallbackIcon, color) => {
    if (tags.some(t => t.key === key)) return;
    tags.push({ key, name, icon, desc, meta, fallbackIcon, color });
  };
  if (has(s => s.interruptPolicy === 'hard' || s.interruptPolicy === 'soft' || ((s.castTime || 0) > 0 && (s.silence || s.stun || s.manaDrain || s.summonCount || s.aoe)))) {
    push('interrupt', '打断优先', '🔇', '该首领存在高价值读条。优先打断沉默、资源燃烧、召唤或范围压制技能,可以显著降低战斗压力。', '读条', 'ability_kick', '#fca5a5');
  }
  if (has(s => s.summonCount || s.type === 'summon')) {
    push('adds', '转火清场', '👥', '该首领会召唤援军或机制目标。及时转火可减少额外读条、护盾、献祭或持续伤害压力。', '增援', 'ability_warrior_battleshout', '#f9a8d4');
  }
  if (has(s => s.aoe || s.alwaysCrit || s.fear || s.freeze || s.stun) || maxMul >= 10) {
    push('defensive', '减伤覆盖', '🛡️', '该首领有范围爆发、控制链或高倍率攻击。把减伤、治疗、护盾留给这些窗口会更稳。', '爆发', 'ability_warrior_shieldwall', '#93c5fd');
  }
  if (has(s => s.manaDrain || s.silence || s.soulDrain || s.soulLink)) {
    push('resource', '资源管理', '💧', '该首领会压缩资源或施法窗口。避免把核心技能全交在沉默/资源燃烧前,必要时保留爆发资源。', '资源', 'spell_shadow_manaburn', '#67e8f9');
  }
  if (has(s => s.shieldPct || s.healPct || s.heal || s.drBuffSecs || s.defBuffSecs)) {
    push('purge', '破盾压制', '🔷', '该首领会获得护盾、治疗或防御强化。爆发期优先压过护盾,拖太久会放大后续机制。', '护盾', 'spell_holy_powerwordshield', '#c4b5fd');
  }
  if (has(s => s.hpBelow || s.alwaysCrit || /处刑|斩杀|终幕|终裁|绝命/.test(s.name || ''))) {
    push('execute', '稳健收尾', '⏱️', '低血量阶段可能变得更危险。保留防御、打断或斩杀爆发,避免尾王残血翻车。', '尾段', 'inv_misc_pocketwatch_01', '#fde68a');
  }
  if (has(s => s.dot || s.dotSkill || s.plague || s.bleed || s.decay || s.decay2 || s.wither)) {
    push('clean', '治疗清理', '💚', '该首领会叠加持续伤害或治疗压力。需要稳定续航,不要只看单次爆发伤害。', '持续伤害', 'spell_holy_heal', '#86efac');
  }
  return tags;
}

function dungeonBossHandlingTagsHtml(boss, options) {
  const cfg = options || {};
  const tags = dungeonBossHandlingTags(boss).slice(0, cfg.limit || 5);
  if (!tags.length) return '';
  return `<div class="${cfg.className || 'dungeon-boss-handle-tags'}">${tags.map(t => inlineTipSpanHtml({
    name:t.name,
    icon:t.icon,
    desc:t.desc,
    meta:t.meta,
  }, {
    fallbackIcon:t.fallbackIcon,
    color:t.color,
    metaVisible:!!t.meta,
  })).join('')}</div>`;
}

function dungeonRoutePrepChecklistHtml(dg) {
  const bosses = Array.isArray(dg?.bosses) ? dg.bosses : [];
  if (!bosses.length) return '';
  const aggregate = new Map();
  for (const boss of bosses) {
    for (const tag of dungeonBossHandlingTags(boss)) {
      const entry = aggregate.get(tag.key) || { ...tag, count:0, bosses:[] };
      entry.count += 1;
      if (boss?.name) entry.bosses.push(boss.name);
      aggregate.set(tag.key, entry);
    }
  }
  const priority = ['interrupt', 'adds', 'defensive', 'resource', 'purge', 'execute', 'clean'];
  const entries = priority.map(key => aggregate.get(key)).filter(Boolean);
  if (!entries.length) return '';
  const maxCount = Math.max(1, ...entries.map(e => e.count));
  const cards = entries.map(e => {
    const percent = Math.max(12, Math.round((e.count / maxCount) * 100));
    const bossText = e.bosses.slice(0, 4).join('、') + (e.bosses.length > 4 ? ` 等 ${e.bosses.length} 名` : '');
    const tip = inlineTipSpanHtml({
      name:e.name,
      icon:e.icon,
      desc:`${e.desc} 本副本中关联首领: ${bossText || '暂无'}。`,
      meta:`${e.count}/${bosses.length}`,
    }, {
      fallbackIcon:e.fallbackIcon,
      color:e.color,
      metaVisible:true,
    });
    return `<div class="dungeon-route-prep-card">
      <div class="dungeon-route-prep-label">${tip}</div>
      <div class="dungeon-route-prep-bar"><i style="width:${percent}%"></i></div>
      <div class="dungeon-route-prep-note">${tipAttrText(bossText || '标准路线')}</div>
    </div>`;
  }).join('');
  return `<div class="dungeon-route-prep">
    <div class="dungeon-route-prep-head">
      <b>路线准备清单</b>
      <span>${entries.length} 类处理重点 · ${bosses.length} 名首领</span>
    </div>
    <div class="dungeon-route-prep-grid">${cards}</div>
  </div>`;
}

function dungeonHandlingCodexHtml(dg, selectedContract) {
  if (typeof dungeonMechanicCodex !== 'function') return '';
  const codex = dungeonMechanicCodex();
  if (!codex.length) return '';
  const byKey = Object.fromEntries(codex.map(entry => [entry.key, entry]));
  const bosses = Array.isArray(dg?.bosses) ? dg.bosses : [];
  const handlingCounts = new Map();
  for (const boss of bosses) {
    for (const tag of dungeonBossHandlingTags(boss)) {
      handlingCounts.set(tag.key, (handlingCounts.get(tag.key) || 0) + 1);
    }
  }
  const contractLevel = Math.max(0, Math.floor(selectedContract?.level || 0));
  const themeAffixes = (typeof getDungeonThemeAffixes === 'function') ? getDungeonThemeAffixes(dg) : [];
  const rooms = (typeof getDungeonCombatRooms === 'function') ? getDungeonCombatRooms(dg, contractLevel) : [];
  const edicts = contractLevel > 0 && typeof getDungeonTacticalEdicts === 'function' ? getDungeonTacticalEdicts(dg, contractLevel) : [];
  const timer = contractLevel > 0 && typeof createDungeonTimer === 'function' ? createDungeonTimer(dg, contractLevel) : null;
  const timeMarks = contractLevel > 0 && typeof dungeonTimeMarkSummary === 'function' ? dungeonTimeMarkSummary(edicts, 0) : null;
  const fallbackIcons = {
    interrupt:'ability_kick', adds:'ability_warrior_battleshout', defensive:'ability_warrior_shieldwall',
    resource:'spell_shadow_manaburn', purge:'spell_holy_powerwordshield', execute:'inv_misc_pocketwatch_01',
    clean:'spell_holy_heal', bossChallenge:'achievement_general', addControl:'ability_warrior_battleshout',
    swiftKill:'inv_misc_pocketwatch_01', healthyFinish:'spell_holy_heal', timePulse:'inv_misc_pocketwatch_01',
    timeEdict:'inv_scroll_03', timeMark:'achievement_bg_kill_flag_carrier', alert:'achievement_bg_returnxflags_def_wsg',
    combatRoom:'inv_misc_dice_02', themeAffix:'spell_arcane_starfire', dungeonTrait:'inv_misc_gem_diamond_02',
    firstClear:'inv_misc_gem_topaz_02',
  };
  const colors = {
    interrupt:'#fca5a5', adds:'#f9a8d4', defensive:'#93c5fd', resource:'#67e8f9',
    purge:'#c4b5fd', execute:'#fde68a', clean:'#86efac', bossChallenge:'#f6c453',
    addControl:'#f9a8d4', swiftKill:'#fde68a', healthyFinish:'#86efac', timePulse:'#fb7185',
    timeEdict:'#fcd34d', timeMark:'#fca5a5', alert:'#fb7185', combatRoom:'#f9a8d4',
    themeAffix:'#67e8f9', dungeonTrait:'#fde68a', firstClear:'#f6c453',
  };
  const metaFor = key => {
    if (handlingCounts.has(key)) return `${handlingCounts.get(key)}/${Math.max(1, bosses.length)}名首领`;
    if (key === 'themeAffix') return themeAffixes.length ? `${themeAffixes.length}条主题` : '常驻规则';
    if (key === 'combatRoom') return rooms.length ? `${rooms.length}个房间` : '路线规则';
    if (key === 'timeEdict') return edicts.length ? `${edicts.length}条禁令` : '契约开启';
    if (key === 'timePulse') return timer ? timer.label : '超时触发';
    if (key === 'timeMark') return timeMarks?.meta || '点名压力';
    if (key === 'alert') return contractLevel > 0 ? `${selectedContract?.name || '契约'}生效` : '契约开启';
    return '说明';
  };
  const isActive = key => handlingCounts.has(key)
    || (key === 'themeAffix' && themeAffixes.length)
    || (key === 'combatRoom' && rooms.length)
    || (key === 'timeEdict' && edicts.length)
    || (key === 'timePulse' && !!timer)
    || (key === 'timeMark' && !!timeMarks)
    || (key === 'alert' && contractLevel > 0);
  const cell = key => {
    const entry = byKey[key];
    if (!entry) return '';
    const desc = entry.desc || '副本机制说明。';
    const tip = inlineTipSpanHtml({
      ...entry,
      desc,
      meta:metaFor(key),
    }, {
      fallbackIcon:fallbackIcons[key] || 'inv_misc_book_11',
      color:colors[key] || '#fde68a',
      metaVisible:true,
    });
    return `<div class="dungeon-handbook-entry ${isActive(key) ? 'active' : ''}">
      <div class="dungeon-handbook-entry-title">${tip}</div>
      <div class="dungeon-handbook-entry-desc">${tipAttrText(desc)}</div>
    </div>`;
  };
  const groups = [
    { title:'首领处理', note:'这些标签来自当前副本所有 Boss 技能,命中越多代表越需要准备对应解法。', keys:['interrupt','adds','defensive','resource','purge','execute','clean'] },
    { title:'挑战目标', note:'首领详情中的挑战目标会影响通关结算奖励和长期完成记录。', keys:['bossChallenge','addControl','swiftKill','healthyFinish'] },
    { title:'契约时间线', note:'契约、禁令、房间和限时挑战会让同一个副本每天出现不同节奏。', keys:['timePulse','timeEdict','timeMark','alert','combatRoom','themeAffix'] },
    { title:'奖励规则', note:'副本装备会同时受首通、掉落池、装等阶梯和副本印记影响。', keys:['dungeonTrait','firstClear'] },
  ];
  const sections = groups.map(group => {
    const cells = group.keys.map(cell).filter(Boolean).join('');
    if (!cells) return '';
    return `<div class="dungeon-handbook-section">
      <div class="dungeon-handbook-section-head"><b>${tipAttrText(group.title)}</b><span>${tipAttrText(group.note)}</span></div>
      <div class="dungeon-handbook-grid">${cells}</div>
    </div>`;
  }).filter(Boolean).join('');
  if (!sections) return '';
  return `<div class="dungeon-handbook">
    <div class="dungeon-handbook-head">
      <b>📘 副本处理手册</b>
      <span>点亮的条目表示当前副本或契约正在命中</span>
    </div>
    ${sections}
  </div>`;
}

function dungeonBossRosterHtml(dg, selectedContract) {
  const bosses = Array.isArray(dg?.bosses) ? dg.bosses : [];
  if (!bosses.length) return '';
  const contractLevel = Math.max(0, Math.floor(selectedContract?.level || 0));
  const lastBossName = bosses[bosses.length - 1]?.name;
  const cards = bosses.map(boss => {
    const bossName = boss.name || '未知首领';
    const isFinal = bossName === lastBossName;
    const icon = (typeof entityIcon === 'function') ? entityIcon(bossName, 34, boss.emoji || '👹') : (boss.emoji || '👹');
    const items = (typeof getDungeonBossLoot === 'function') ? getDungeonBossLoot(dg.key, bossName, state.cls) : [];
    const phaseCount = contractLevel > 0 && typeof getDungeonBossPhases === 'function' ? getDungeonBossPhases(dg, bossName, contractLevel).length : 0;
    const councilCount = typeof getDungeonBossCouncilMembers === 'function' ? Math.max(0, getDungeonBossCouncilMembers(boss).length - 1) : 0;
    const spectacleCount = typeof getDungeonBossSpectacleMechanics === 'function' ? getDungeonBossSpectacleMechanics(boss).length : 0;
    const directorEventCount = typeof getDungeonBossDirectorEvents === 'function' ? getDungeonBossDirectorEvents(boss).length : 0;
    const tacticCount = typeof getDungeonBossTactics === 'function' ? getDungeonBossTactics(boss).length : 0;
    const weakpointCount = typeof getDungeonBossWeakpoints === 'function' ? getDungeonBossWeakpoints(boss).length : 0;
    const challengeCount = typeof getDungeonBossChallengeSeals === 'function' ? getDungeonBossChallengeSeals(boss).length : 0;
    const grandCount = typeof getDungeonBossGrandMechanics === 'function' ? getDungeonBossGrandMechanics(boss, 6).length : 0;
    const directorSkillCount = typeof getDungeonBossDirectorSkills === 'function' ? getDungeonBossDirectorSkills(boss).length : 0;
    const passiveCount = Array.isArray(boss.passive?.tricks) ? boss.passive.tricks.length : 0;
    const skillCount = (boss.skills || []).length + directorSkillCount + passiveCount;
    const mechanicCount = phaseCount + councilCount + spectacleCount + directorEventCount + tacticCount + weakpointCount + challengeCount + grandCount;
    const hasLegend = items.some(it => it.rarity === 'legend' || it.lowChanceLegend);
    const previewNames = [];
    if (phaseCount) previewNames.push('阶段');
    if (tacticCount) previewNames.push('战术');
    if (weakpointCount) previewNames.push('弱点');
    if (challengeCount) previewNames.push('挑战');
    if (grandCount) previewNames.push('扩展机制');
    const handlingTags = dungeonBossHandlingTagsHtml(boss, { limit:3, className:'dungeon-boss-roster-handles' });
    const mechanicTip = inlineTipSpanHtml({
      name:'机制概览',
      icon:'📖',
      desc:`${bossName} 的副本手册摘要。技能 ${skillCount} 项,额外机制 ${mechanicCount} 项${previewNames.length ? `,包含 ${previewNames.join('、')}` : ''}。向下滚动可查看完整读条、挑战、弱点和掉落。`,
      meta:mechanicCount ? `${mechanicCount}项` : '标准',
    }, {
      fallbackIcon:'inv_misc_book_11',
      color:mechanicCount ? '#f6c453' : '#93c5fd',
      metaVisible:true,
    });
    const lootTip = inlineTipSpanHtml({
      name:'掉落预览',
      icon:'🎁',
      desc:items.length ? `该首领可预览 ${items.length} 件掉落。详情卡片中会显示掉率、典型属性和史诗团本标记。` : '该首领暂无专属掉落预览。',
      meta:items.length ? `${items.length}件${hasLegend ? ' · 含橙装' : ''}` : '无',
    }, {
      fallbackIcon:hasLegend ? 'inv_misc_gem_topaz_02' : 'inv_crate_04',
      color:hasLegend ? '#f59e0b' : '#c4b5fd',
      metaVisible:true,
    });
    return `<div class="dungeon-boss-roster-card ${isFinal ? 'final' : ''}">
      <div class="dungeon-boss-roster-icon">${icon}</div>
      <div class="dungeon-boss-roster-main">
        <div class="dungeon-boss-roster-name">${tipAttrText(bossName)}${isFinal ? '<span>尾王</span>' : ''}</div>
        <div class="dungeon-boss-roster-meta">波次 ${boss.wave || '?'} · 技能 ${skillCount} · 机制 ${mechanicCount}</div>
        ${handlingTags}
        <div class="dungeon-boss-roster-tags">${mechanicTip}${lootTip}</div>
      </div>
    </div>`;
  }).join('');
  return `<div class="dungeon-boss-roster">
    <div class="dungeon-boss-roster-head">
      <b>首领目录</b>
      <span>${bosses.length} 名首领 · 最终: ${tipAttrText(lastBossName || '未知')}</span>
    </div>
    <div class="dungeon-boss-roster-grid">${cards}</div>
  </div>`;
}

function buildDungeonInfoHtml(dg) {
  if (!dg) return '<div class="muted">未找到副本信息</div>';
  const power = ((typeof dg.powerLvl === 'number' && dg.powerLvl > 0) ? dg.powerLvl : dg.reqLvl) + 5;
  const isRaid = dg.type === 'raid';
  const isEpicRaid = !!dg.epicRaid;
  const dgAffixes = (typeof getDungeonAffixes === 'function') ? getDungeonAffixes(dg) : [];
  const lastBossName = (dg.bosses || [])[(dg.bosses || []).length - 1]?.name;
  const dungeonIconHtml = (typeof dungeonIcon === 'function') ? dungeonIcon(dg.key, dg.name, 18, dg.icon) : dg.icon;
  const progressionPills = dungeonProgressionPillsHtml(dg);
  const lootIlvlText = dungeonLootIlvlText(dg);
  const powerText = dungeonPowerText(dg);
  const recIlvl = (typeof dungeonRecommendedItemLevel === 'function') ? dungeonRecommendedItemLevel(dg) : 0;
  const reqIlvl = (typeof dungeonRequiredItemLevel === 'function') ? dungeonRequiredItemLevel(dg) : 0;
  const avgIlvl = (typeof averageEquippedItemLevel === 'function') ? Math.floor(averageEquippedItemLevel()) : 0;
  const selectedContract = (typeof dungeonContractLevel === 'function' && typeof dungeonContractInfo === 'function') ? dungeonContractInfo(dungeonContractLevel()) : null;
  const ilvlGateTip = recIlvl > 0 ? inlineTipSpanHtml({
    name:reqIlvl > 0 ? '史诗团本准入装等' : '推荐平均装等',
    icon:'🎚️',
    desc:reqIlvl > 0
      ? '史诗团本按资料片顺序设置平均装等门槛。旧团本史诗重制不会只看 Lv.80，而会要求先通过前序副本提升装备。'
      : '推荐平均装等用于提示该副本的装备准备程度；普通、英雄和史诗5人本不会因为该推荐值被硬性拦截。',
    meta:`需要 ${reqIlvl || recIlvl}+${avgIlvl ? ` · 当前 ${avgIlvl}` : ''}`,
  }, {
    fallbackIcon:'inv_misc_gem_topaz_02',
    color:reqIlvl > 0 && avgIlvl < reqIlvl ? '#fb7185' : '#f6c453',
    metaVisible:true,
    className:'dungeon-raid-tip dungeon-inline-tip',
  }) : '';
  const setTierInfo = (!isEpicRaid && typeof setBandForDungeon === 'function' && typeof setLabelForClass === 'function' && typeof setTierIndex === 'function')
    ? (function getSetInfo() {
        const band = setBandForDungeon(dg);
        if (!band) return null;
        return {
          bandName: band.name,
          setName: setLabelForClass(state.cls, Math.max(0, setTierIndex(dg))),
        };
      })()
    : null;
  let html = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <div style="font-weight:700;font-size:16px">${dungeonIconHtml} ${dg.name}</div>
      <div class="pill">${typeof contentReqLabel === 'function' ? contentReqLabel(dg.reqLvl) : `等级${dg.reqLvl}`}</div>
      ${dg.raidExpansion ? `<div class="pill">${dg.raidExpansion}</div>` : ''}
      ${progressionPills}
    </div>
    ${dg.art ? `<div class="dungeon-info-art" style="background-image:linear-gradient(180deg, rgba(11,15,25,.12), rgba(11,15,25,.78)), url('${dg.art}')">${dungeonArtBadgeHtml(dg)}</div>` : ''}
    ${dungeonAtlasHtml(dg, false)}
    ${dungeonRaidProgressionHtml(dg, false)}
    <div class="muted" style="margin-bottom:10px;line-height:1.6">
      ${isEpicRaid?'<span style="color:#fb7185">[史诗团本]</span> ':(isRaid?'<span style="color:#fbbf24">[团本]</span> ':'<span style="color:#6ee7b7">[5人本]</span> ')}
      ${dg.desc}<br>
      推荐波次: ${dg.waves || '?'} · 首领数量: ${(dg.bosses || []).length}${powerText ? ` · ${powerText}` : ''}${lootIlvlText ? ` · ${lootIlvlText}` : ''} · 精良以上装备有概率携带副本印记
      ${ilvlGateTip ? `<br>${ilvlGateTip}` : ''}
      ${dg.type==='raid'?(isEpicRaid?' · 掉落: 史诗级紫装 / 全部首领超低概率橙装':' · 掉落: 常规团本装备 / 关底低概率橙武'):''}
    </div>`;
  html += dungeonRouteBriefHtml(dg, selectedContract);
  html += dungeonHandlingCodexHtml(dg, selectedContract);
  html += dungeonThemeAffixHtml(dg, false);
  html += dungeonCompanionRecommendationHtml(dg, false);
  html += dungeonTraitPreviewHtml(dg);
  html += dungeonFirstClearPreviewHtml(dg);
  if (dgAffixes.length) {
    html += `<div style="margin-bottom:10px;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:rgba(255,255,255,.03)">
      <div style="font-weight:700;font-size:13px;margin-bottom:6px">本期词缀</div>
      <div style="display:flex;flex-direction:column;gap:6px">` +
      dgAffixes.map(a => `
        <div style="font-size:11px;line-height:1.55">
          <div style="color:#fbbf24">${symbolIconHtml(a.icon, 14, a.name, 'spell_holy_powerinfusion')} ${a.name}</div>
          <div class="muted">${a.desc || '特殊规则'}</div>
        </div>`).join('') +
      `</div>
    </div>`;
  }
  if (setTierInfo) {
    html += `<div class="dungeon-set-track"><b>当前职业套装目标:</b> ${setTierInfo.setName} · ${setTierInfo.bandName}阶段（2件/4件激活特效）</div>`;
  }
  const roomPreview = (typeof getDungeonCombatRooms === 'function') ? getDungeonCombatRooms(dg, selectedContract?.level || 0) : [];
  const mechanicCodex = (typeof dungeonMechanicCodex === 'function') ? dungeonMechanicCodex() : [];
  if (mechanicCodex.length) {
    html += `<div class="dungeon-mechanic-codex">
      <b>📖 机制说明</b>
      <div class="dungeon-mechanic-codex-grid">
        ${mechanicCodex.map(m => inlineTipSpanHtml(m, { fallbackIcon:'inv_misc_book_11', color:'#fde68a' })).join('')}
      </div>
    </div>`;
  }
  if (roomPreview.length) {
    html += `<div class="dungeon-room-info">
      <b>🎲 战斗房间</b>
      <div style="display:flex;flex-direction:column;gap:5px;margin-top:5px">
        ${roomPreview.map(r => `<div><span style="color:#f9a8d4">${symbolIconHtml(r.icon, 14, r.name, 'inv_misc_dice_02')} ${r.name}</span>${dungeonRoomRouteTagHtml(r)}<div class="muted">${r.desc || '额外遭遇规则'}</div></div>`).join('')}
      </div>
    </div>`;
  }
  if (selectedContract && selectedContract.level > 0) {
    const trialPreview = (typeof getDungeonContractTrials === 'function') ? getDungeonContractTrials(dg, selectedContract.level) : [];
    const environmentPreview = (typeof getDungeonEnvironments === 'function') ? getDungeonEnvironments(dg, selectedContract.level) : [];
    const cataclysmPreview = (typeof getDungeonCataclysms === 'function') ? getDungeonCataclysms(dg, selectedContract.level) : [];
    const edictPreview = (typeof getDungeonTacticalEdicts === 'function') ? getDungeonTacticalEdicts(dg, selectedContract.level) : [];
    const timerPreview = (typeof createDungeonTimer === 'function') ? createDungeonTimer(dg, selectedContract.level) : null;
    const timeMarkPreview = (typeof dungeonTimeMarkSummary === 'function') ? dungeonTimeMarkSummary(edictPreview, 0) : null;
    const alertLabelTip = inlineTipSpanHtml({ name:'警戒', icon:'🚨', desc:'契约副本每清一波 +1 级，击败首领 +2 级；警戒越高，后续敌人越强，也更容易出现戒备队长。' }, { fallbackIcon:'achievement_bg_returnxflags_def_wsg', color:'#fb7185' });
    const edictLabelTip = inlineTipSpanHtml({ name:'战术禁令库', icon:'📜', desc:'每次契约会从禁令库随机抽取额外限制；禁令会提高战斗压力，并小幅提高通关奖励。', meta:`当前抽取 ${edictPreview.length} 条` }, { fallbackIcon:'inv_scroll_03', color:'#fcd34d' });
    const timerLabelTip = timerPreview ? inlineTipSpanHtml({ name:'限时挑战', icon:'⏳', desc:'在限定时间内通关可获得额外奖励；超时后每 15 秒叠加一次压迫。', meta:timerPreview.label }, { fallbackIcon:'inv_misc_pocketwatch_01', color:'#fde68a' }) : '';
    const timeMarkLabelTip = timeMarkPreview ? inlineTipSpanHtml(timeMarkPreview, { fallbackIcon:'achievement_bg_kill_flag_carrier', color:'#fca5a5', meta:timeMarkPreview.meta, metaVisible:true }) : '';
    html += `<div class="dungeon-contract-info">
      <b>${selectedContract.icon} 当前契约: ${selectedContract.name}</b>
      <div class="muted">${selectedContract.desc}</div>
      <div>怪物生命 ×${selectedContract.hp.toFixed(2)} · 攻击 ×${selectedContract.atk.toFixed(2)} · 防御 ×${selectedContract.def.toFixed(2)} · 通关奖励 ×${selectedContract.reward.toFixed(2)}</div>
      <div class="dungeon-alert-rule">${alertLabelTip}: 契约副本每清一波+1级,击败首领+2级;高警戒会强化后续敌人并派出戒备队长。</div>
      <div class="dungeon-edict-rule">${edictLabelTip}: 100条,当前契约抽取 ${edictPreview.length} 条;禁令会提高难度并小幅提高通关奖励。</div>
      ${timeMarkPreview ? `<div class="dungeon-edict-rule">${timeMarkLabelTip}: ${timeMarkPreview.types.map(t => t.name).join(' · ')}</div>` : ''}
      ${timerPreview ? `<div class="dungeon-timer-rule">${timerLabelTip}: ${timerPreview.label} 内通关奖励 ×${timerPreview.rewardMult.toFixed(2)},超时后每15秒叠加压迫。</div>` : ''}
    </div>`;
    if (timeMarkPreview?.types?.length) {
      html += `<div class="dungeon-edict-info">
        <b>🎯 时序点名</b>
        <div style="display:flex;flex-direction:column;gap:5px;margin-top:5px">
          ${timeMarkPreview.types.map(t => `<div><span style="color:#fca5a5">${symbolIconHtml(t.icon, 14, t.name, t.fallbackIcon || 'achievement_bg_kill_flag_carrier')} ${t.name}</span><div class="muted">${t.desc}${t.source ? ` 来源: ${tipAttrText(t.source)}` : ''}</div></div>`).join('')}
        </div>
      </div>`;
    }
    if (edictPreview.length) {
      html += `<div class="dungeon-edict-info">
        <b>📜 战术禁令</b>
        <div style="display:flex;flex-direction:column;gap:5px;margin-top:5px">
          ${edictPreview.map(e => `<div><span style="color:#fcd34d">${symbolIconHtml(e.icon, 14, e.name, 'inv_scroll_03')} ${e.name}</span><div class="muted">${e.desc || '额外战斗限制'}</div></div>`).join('')}
        </div>
      </div>`;
    }
    if (environmentPreview.length) {
      html += `<div class="dungeon-environment-info">
        <b>🧭 副本环境</b>
        <div style="display:flex;flex-direction:column;gap:5px;margin-top:5px">
          ${environmentPreview.map(e => `<div><span style="color:#67e8f9">${symbolIconHtml(e.icon, 14, e.name, 'spell_frost_arcticwinds')} ${e.name}</span><div class="muted">${e.desc || '环境危害'}</div></div>`).join('')}
        </div>
      </div>`;
    }
    if (cataclysmPreview.length) {
      html += `<div class="dungeon-environment-info">
        <b>🌪️ 环境灾变</b>
        <div style="display:flex;flex-direction:column;gap:5px;margin-top:5px">
          ${cataclysmPreview.map(e => `<div><span style="color:#fb7185">${symbolIconHtml(e.icon, 14, e.name, 'spell_nature_earthquake')} ${e.name}</span><span class="muted"> ${e.meta || ''}</span><div class="muted">${e.desc || '灾变危害'}</div></div>`).join('')}
        </div>
      </div>`;
    }
    if (trialPreview.length) {
      html += `<div class="dungeon-trial-info">
        <b>🔥 契约试炼</b>
        <div style="display:flex;flex-direction:column;gap:5px;margin-top:5px">
          ${trialPreview.map(t => `<div><span style="color:#fb7185">${symbolIconHtml(t.icon, 14, t.name, 'ability_warrior_battleshout')} ${t.name}</span><div class="muted">${t.desc || '额外副本机制'}</div></div>`).join('')}
        </div>
      </div>`;
    }
  }
  const bountyTarget = (typeof dungeonBountyTargetFor === 'function') ? dungeonBountyTargetFor(dg.key) : null;
  if (bountyTarget) {
    const rewardText = (typeof dungeonBountyRewardText === 'function') ? dungeonBountyRewardText(bountyTarget) : '';
    html += `<div class="dungeon-bounty-info ${bountyTarget.claimed ? 'done' : ''}">
      <b>今日悬赏: ${dungeonBountyTipHtml(bountyTarget, { metaVisible:true })}</b>
      <div class="muted">${bountyTarget.desc || ''}</div>
      <div>${dungeonBountyRewardTipHtml(bountyTarget, rewardText)}${bountyTarget.claimed ? ' · 已完成' : ''}</div>
    </div>`;
  }
  html += dungeonRoutePrepChecklistHtml(dg);
  html += dungeonBossRosterHtml(dg, selectedContract);
  for (const bossData of (dg.bosses || [])) {
    const bossName = bossData.name;
    const items = (typeof getDungeonBossLoot === 'function') ? getDungeonBossLoot(dg.key, bossName, state.cls) : [];
    const isFinal = bossName === lastBossName;
    const bossIconHtml = (typeof entityIcon === 'function') ? entityIcon(bossName, 38, bossData.emoji || '👹') : (bossData.emoji || '👹');
    const bossIconInfo = (typeof entityIconInfo === 'function') ? entityIconInfo(bossName, bossData.emoji || '👹') : null;
    const bossPortraitTip = bossIconInfo ? inlineTipSpanHtml({
      name:bossIconInfo.label || 'Boss头像',
      icon:'🖼️',
      desc:bossIconInfo.source === 'exact'
        ? '该首领已接入专属 WoW 图标映射，副本手册和战斗提示会优先使用这张头像。'
        : (bossIconInfo.source === 'theme' ? '该首领使用符合怪物类型或资料片主题的 WoW 图标，后续可继续替换为更精确头像。' : '该首领暂时使用表情或通用主题回退头像。'),
      meta:bossIconInfo.iconName || ''
    }, {
      fallbackIcon:'inv_misc_head_undead_01',
      color:bossIconInfo.source === 'exact' ? '#f6c453' : '#93c5fd',
      metaVisible:false,
      className:'dungeon-boss-portrait-tip dungeon-inline-tip'
    }) : '';
    const bossHandlingTags = dungeonBossHandlingTagsHtml(bossData, { limit:6 });
    const dropLabel = isEpicRaid
      ? `(必掉史诗紫装${isFinal ? '×2' : ''}${items.some(it => it.rarity === 'legend') ? ' · 含超低概率橙装' : ''})`
      : (isRaid ? (isFinal ? '(常规团本装备 · 低概率橙武)' : '(常规团本装备)') : '(必掉1件)');
    const phasePreview = (selectedContract && selectedContract.level > 0 && typeof getDungeonBossPhases === 'function')
      ? getDungeonBossPhases(dg, bossName, selectedContract.level)
      : [];
    const councilPreview = (typeof getDungeonBossCouncilMembers === 'function') ? getDungeonBossCouncilMembers(bossData) : [];
    const spectaclePreview = (typeof getDungeonBossSpectacleMechanics === 'function') ? getDungeonBossSpectacleMechanics(bossData) : [];
    const directorSkillPreview = (typeof getDungeonBossDirectorSkills === 'function') ? getDungeonBossDirectorSkills(bossData) : [];
    const directorEventPreview = (typeof getDungeonBossDirectorEvents === 'function') ? getDungeonBossDirectorEvents(bossData) : [];
    const tacticPreview = (typeof getDungeonBossTactics === 'function') ? getDungeonBossTactics(bossData) : [];
    const weakpointPreview = (typeof getDungeonBossWeakpoints === 'function') ? getDungeonBossWeakpoints(bossData) : [];
    const challengePreview = (typeof getDungeonBossChallengeSeals === 'function') ? getDungeonBossChallengeSeals(bossData) : [];
    const grandPreview = (typeof getDungeonBossGrandMechanics === 'function') ? getDungeonBossGrandMechanics(bossData, 6) : [];
    html += `
      <div class="dungeon-boss-card">
        <div class="dungeon-boss-head">
          <div class="dungeon-boss-avatar-wrap">
            <div class="dungeon-boss-avatar">${bossIconHtml}</div>
            ${bossPortraitTip ? `<div class="dungeon-boss-portrait-tag">${bossPortraitTip}</div>` : ''}
          </div>
          <div class="dungeon-boss-title">
            <div>${bossName} ${isFinal ? '<span class="pill boss-final-pill">尾王</span>' : ''}</div>
            <div class="muted">波次 ${bossData.wave || '?'} · ${dropLabel}</div>
          </div>
        </div>`;
    if (bossHandlingTags) html += bossHandlingTags;
    if (councilPreview.length > 1) {
      html += `<div class="dungeon-council-preview">
        ${councilPreview.map(m => inlineTipSpanHtml({ name:m.name, icon:m.icon || bossData.emoji || '👹', desc:m.role ? `该成员负责 ${m.role}。` : '多目标首领成员。', meta:m.role || '' }, { fallbackIcon:'achievement_boss_illidan', color:'#fcd34d', metaVisible:true })).join('')}
      </div>`;
    }
    if (phasePreview.length) {
      html += `<div class="dungeon-boss-phase-preview">
        ${phasePreview.map(p => inlineTipSpanHtml({ name:p.name, icon:p.icon, desc:p.desc || '血线阶段事件会在首领跌到对应阈值时触发。', meta:`${Math.round((p.threshold || 0) * 100)}%触发` }, { fallbackIcon:'ability_warrior_battleshout', color:'#fb7185', metaVisible:true })).join('')}
      </div>`;
    }
    if (spectaclePreview.length) {
      html += `<div class="dungeon-boss-spectacle-preview">
        ${spectaclePreview.map(m => inlineTipSpanHtml(m, { fallbackIcon:'spell_shadow_shadowfury', color:'#f0abfc' })).join('')}
      </div>`;
    }
    if (directorEventPreview.length) {
      html += `<div class="dungeon-boss-director-preview">
        ${directorEventPreview.map(m => inlineTipSpanHtml(m, { fallbackIcon:'achievement_boss_illidan', color:'#93c5fd' })).join('')}
      </div>`;
    }
    if (tacticPreview.length) {
      html += `<div class="dungeon-boss-tactic-preview">
        ${tacticPreview.map(m => inlineTipSpanHtml(m, { fallbackIcon:'ability_warrior_battleshout', color:'#fca5a5' })).join('')}
      </div>`;
    }
    if (weakpointPreview.length) {
      html += `<div class="dungeon-boss-weakpoint-preview">
        ${weakpointPreview.map(m => inlineTipSpanHtml({ name:m.name, icon:m.icon, desc:m.desc || '击破弱点会制造首领破绽。', meta:typeof m.threshold === 'number' ? `${Math.round(m.threshold * 100)}%触发` : '' }, { fallbackIcon:'inv_misc_gem_diamond_02', color:'#fde68a', metaVisible:true })).join('')}
      </div>`;
    }
    if (challengePreview.length) {
      html += `<div class="dungeon-boss-challenge-preview">
        ${challengePreview.map(m => inlineTipSpanHtml({ ...m, meta:bossChallengeMetaText(m) }, { fallbackIcon:'achievement_bg_killxenemies_generalsroom', color:'#fde68a', metaVisible:true })).join('')}
      </div>`;
      html += `<div style="display:flex;flex-direction:column;gap:4px;margin:6px 0 8px 8px">
        ${challengePreview.map(m => `<div style="font-size:11px;line-height:1.5"><span style="color:#fde68a">${symbolIconHtml(m.icon, 13, m.name, 'achievement_bg_killxenemies_generalsroom')} ${m.name}</span><span class="muted"> (${bossChallengeMetaText(m)}) - ${m.desc || 'Boss 挑战目标'}</span></div>`).join('')}
      </div>`;
    }
    if (grandPreview.length) {
      html += `<div class="dungeon-boss-grand-preview">
        ${grandPreview.map(m => inlineTipSpanHtml(m, { fallbackIcon:'spell_arcane_arcanetorrent', color:m.color || '#67e8f9' })).join('')}
      </div>`;
      html += `<div style="display:flex;flex-direction:column;gap:4px;margin:6px 0 8px 8px">
        ${grandPreview.map(m => `<div style="font-size:11px;line-height:1.5"><span style="color:${m.color || '#67e8f9'}">${symbolIconHtml(m.icon, 13, m.name, 'spell_arcane_arcanetorrent')} ${m.name}</span><span class="muted"> - ${m.desc || '额外首领机制'}</span></div>`).join('')}
      </div>`;
    }
    if (directorSkillPreview.length) {
      html += `<div style="margin:0 0 8px 8px">
        <div style="font-size:11px;color:#f0abfc;margin-bottom:3px">额外机制读条:</div>
        ${directorSkillPreview.slice(0, 3).map(s => bossSkillLineHtml(s, { iconSize: 15, tagColor: '#f0abfc' })).join('')}
      </div>`;
    }
    if (bossData?.skills?.length) {
      html += `<div style="margin:0 0 8px 8px">`;
      bossData.skills.forEach(s => {
        html += bossSkillLineHtml(s, { iconSize: 15, tagColor: '#fbbf24' });
      });
      html += `</div>`;
    }
    if (bossData?.passive?.tricks?.length) {
      html += `<div style="margin:0 0 8px 8px">`;
      html += `<div style="font-size:11px;color:#93c5fd;margin-bottom:3px">被动触发:</div>`;
      bossData.passive.tricks.forEach(s => {
        html += bossSkillLineHtml(s, { iconSize: 15, tagColor: '#93c5fd', showCast:false });
      });
      html += `</div>`;
    }
    if (items?.length) {
      const previewPool = items.filter(it => !it.lowChanceLegend);
      const tw = Math.max(1, previewPool.reduce((sum, it) => sum + ((it.dropWeight) || (RARITY.find(r => r.key === it.rarity)?.weight || 1)), 0));
      html += `<div style="display:flex;flex-direction:column;gap:4px">`;
      const _previewTier = (typeof gearTierForDungeon === 'function') ? gearTierForDungeon(dg.key) : (isEpicRaid ? 3 : 0);
      for (const it of items) {
        const r = RARITY.find(x => x.key === it.rarity);
        // 用真实掉落公式(finishItem,跳过随机浮动/惊喜)生成"典型属性",保证预览=实际(不再用过时的 scaleLootStats)
        let statsText;
        if (typeof finishItem === 'function' && r) {
          const _previewPower = (typeof it.rollPower === 'number' && it.rollPower > 0) ? it.rollPower : power;
          const _pi = finishItem({ slot:it.slot, name:it.name, rarity:it.rarity, epicRaid:it.epicRaid, gearTier:_previewTier, raidIlvl:it.raidIlvl, raidExpansion:it.raidExpansion, raidOrder:it.raidOrder, raidTier:it.raidTier, reqLvlOverride:it.reqLvlOverride }, it.slot, r, _previewPower, it.stats || {}, { noRandom:true });
          statsText = Object.entries(_pi.stats || {}).map(([k, v]) => fmtMod(k, v)).join(' ') + ' <span style="opacity:.5">(±20%浮动)</span>';
        } else {
          statsText = Object.entries(scaleLootStats(it.stats || {}, it.rarity, power)).map(([k, v]) => fmtMod(k, v)).join(' ');
        }
        const itemRate = it.dropChance
          ? `${Math.round(it.dropChance * 100)}%`
          : `${Math.round((((it.dropWeight) || (RARITY.find(r2 => r2.key === it.rarity)?.weight || 1)) / tw) * 100)}%`;
        const epicBadge = (typeof itemEpicRaidBadge === 'function') ? itemEpicRaidBadge(it, true) : '';
        html += `<div class="${r?.cls || ''}" style="font-size:11px;line-height:1.5">${it.name}${epicBadge} <span style="opacity:.8">${itemRate}</span><br><span style="opacity:.55">${statsText}</span></div>`;
      }
      html += `</div>`;
    } else {
      html += `<div class="muted" style="font-size:11px">暂无可预览掉落</div>`;
    }
    html += `</div>`;
  }
  const trashPool = (typeof getDungeonTrashLoot === 'function')
    ? getDungeonTrashLoot(dg.key, state.cls)
    : ((DUNGEON_LOOT[dg.key] || DUNGEON_LOOT[(typeof baseDungeonKey === 'function' ? baseDungeonKey(dg.key) : dg.key)] || {}).trash || []);
  if (trashPool?.length) {
    html += `<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08);color:var(--muted);font-size:11px;line-height:1.6">
      杂兵掉落 (35%掉率): ${trashPool.map(it => it.name).join('、')}
    </div>`;
  }
  return html;
}

function openDungeonInfo(dungeonKey) {
  const dg = DUNGEONS.find(x => x.key === dungeonKey);
  const modal = $('modal-dungeon-info');
  const body = $('dungeon-info-content');
  if (!dg || !modal || !body) return;
  body.innerHTML = buildDungeonInfoHtml(dg);
  bindInlineTipElements(body);
  modal.classList.add('show');
}

function renderDungeon() {
  const dl = $('dungeon-list');
  const epicDl = $('epic-dungeon-list');
  const heroicDl = $('heroic-dungeon-list');
  const epic5Dl = $('epic5-dungeon-list');
  if (dl) dl.innerHTML = '';
  if (epicDl) epicDl.innerHTML = '';
  if (heroicDl) heroicDl.innerHTML = '';
  if (epic5Dl) epic5Dl.innerHTML = '';
  renderDungeonSheetTabs();
  renderDungeonBountyPanel();
  renderDungeonContractPanel();
  if (typeof renderWaystonePanel === 'function') renderWaystonePanel();
  if (typeof renderDelvePanel === 'function') renderDelvePanel();
  if (typeof renderDungeonMasteryPanel === 'function') renderDungeonMasteryPanel();
  // 更新按钮状态
  const btn5 = $('btn-dg-5man'), btnR = $('btn-dg-raid');
  if (btn5) { btn5.classList.toggle('active', dgFilter === 'all' || dgFilter === '5man'); }
  if (btnR) { btnR.classList.toggle('active', dgFilter === 'all' || dgFilter === 'raid'); }
  const _now = Date.now();
  const sortedDungeons = [...DUNGEONS].sort((a, b) => {
    // CD 中的副本统一排到列表最下方(可立即挑战的优先展示)
    const aCd = (state.dungeonCd && state.dungeonCd[a.key] || 0) > _now;
    const bCd = (state.dungeonCd && state.dungeonCd[b.key] || 0) > _now;
    if (aCd !== bCd) return aCd ? 1 : -1;
    const hl = (typeof playerProgressLevel === 'function') ? playerProgressLevel() : state.hero.lvl;
    const aBase = (typeof baseDungeonKey === 'function') ? baseDungeonKey(a.key) : a.key;
    const bBase = (typeof baseDungeonKey === 'function') ? baseDungeonKey(b.key) : b.key;
    if (aBase === bBase && !!a.epicRaid !== !!b.epicRaid) return a.epicRaid ? 1 : -1;
    const aDist = hl >= a.reqLvl ? hl - a.reqLvl : (a.reqLvl - hl) * 2;
    const bDist = hl >= b.reqLvl ? hl - b.reqLvl : (b.reqLvl - hl) * 2;
    if (aDist !== bDist) return aDist - bDist;
    if ((a.type === 'raid' || b.type === 'raid') && (a.raidOrder || 0) !== (b.raidOrder || 0)) return (a.raidOrder || 0) - (b.raidOrder || 0);
    return (a.powerLvl || a.reqLvl || 0) - (b.powerLvl || b.reqLvl || 0);
  });
  const normalDungeons = sortedDungeons.filter(dg => {
    if (dg.epicRaid || dg.heroic || dg.epic5) return false;   // 英雄/史诗5人本归入专属页
    if (dgFilter === '5man') return dg.type !== 'raid';
    if (dgFilter === 'raid') return dg.type === 'raid';
    return true;
  });
  const epicDungeons = sortedDungeons.filter(dg => !!dg.epicRaid);
  const heroicDungeons = sortedDungeons.filter(dg => !!dg.heroic);
  const epic5Dungeons = sortedDungeons.filter(dg => !!dg.epic5);
  const renderDungeonCard = (dg, target) => {
    if (!target) return;
    const cdEnd = state.dungeonCd[dg.key] || 0;
    const cdLeft = Math.max(0, Math.ceil((cdEnd - Date.now()) / 1000));
    const onCd = cdLeft > 0;
    const access = (typeof dungeonAccessInfo === 'function') ? dungeonAccessInfo(dg) : { ok:(state.hero.lvl >= dg.reqLvl), short:'进度不足' };
    const lvlOk = access.ok;
    const canFree = lvlOk && !onCd && state.mode === 'world';
    const canTicket = lvlOk && onCd && state.tickets >= 1 && state.mode === 'world';
    const canEnter = canFree || canTicket;
    const isEpicRaid = !!dg.epicRaid;
    const setTierInfo = (!isEpicRaid && typeof setBandForDungeon === 'function' && typeof setLabelForClass === 'function' && typeof setTierIndex === 'function')
      ? (function getSetInfo() {
          const band = setBandForDungeon(dg);
          if (!band) return null;
          return {
            setName: setLabelForClass(state.cls, Math.max(0, setTierIndex(dg))),
            bandName: band.name,
          };
        })()
      : null;
    const statusText = !lvlOk ? (access.short || '进度不足')
      : onCd ? `<span style="color:#fb923c">⏳冷却 ${fmtCd(cdLeft)}</span>${canTicket ? ' · 🎫跳过' : ''}`
      : '<span style="color:#6ee7b7">✅可挑战(免费)</span>';
    const btnText = canFree ? '免费进入' : (canTicket ? '🎫进入' : '进入');
    const bountyTarget = (typeof dungeonBountyTargetFor === 'function') ? dungeonBountyTargetFor(dg.key) : null;
    const bountyActive = bountyTarget && !bountyTarget.claimed;
    const bountyBadge = bountyActive ? `<span class="pill dungeon-bounty-pill">${bountyTarget.icon || '🎯'}悬赏</span>` : '';
    const bountyLine = bountyTarget ? `<div class="dungeon-bounty-line ${bountyTarget.claimed ? 'done' : ''}">${dungeonBountyTipHtml(bountyTarget, { metaVisible:true })}${bountyTarget.claimed ? ' · 已完成' : ''}</div>` : '';
    const delveLine = (typeof renderDelveCardLine === 'function') ? renderDelveCardLine(dg) : '';
    const div = document.createElement('div');
    div.className = 'dungeon-item' + (onCd ? ' on-cd' : '') + (bountyActive ? ' bounty-target' : '');
    if (onCd) div.style.opacity = '0.6';   // CD中副本变暗,凸显可立即挑战的副本
    div.dataset.dungeonKey = dg.key;
    const dungeonIconHtml = (typeof dungeonIcon === 'function') ? dungeonIcon(dg.key, dg.name, 18, dg.icon) : dg.icon;
    const selectedContractLevel = (typeof dungeonContractLevel === 'function') ? dungeonContractLevel() : 0;
    const contractPill = selectedContractLevel > 0 && typeof dungeonContractInfo === 'function'
      ? `<span class="pill dungeon-contract-compact">${dungeonContractInfo(selectedContractLevel).icon || '📜'}契约${selectedContractLevel}</span>`
      : '';
    const firstClearBadge = (!state.dungeonFirstClear || !state.dungeonFirstClear[dg.key]) ? '<span class="pill" style="background:rgba(246,196,83,.18);color:#f6c453">🎁首通</span>' : '';
    const artBanner = dg.art ? `<div class="dungeon-art-banner" style="background-image:linear-gradient(180deg, rgba(11,15,25,.16), rgba(11,15,25,.78)), url('${dg.art}')">${dungeonArtBadgeHtml(dg)}</div>` : '';
    // 必刷专属坐骑提示(读 DUNGEON_MOUNT_DROPS,按基础本key)
    let chaseLine = '';
    if (typeof DUNGEON_MOUNT_DROPS !== 'undefined' && typeof MOUNTS !== 'undefined') {
      const _bk = (typeof baseDungeonKey === 'function') ? baseDungeonKey(dg.key) : dg.key;
      const _md = DUNGEON_MOUNT_DROPS[_bk];
      if (_md) {
        const _mt = MOUNTS.find(m => m.key === _md.key);
        if (_mt) {
          const _owned = (typeof account !== 'undefined' && account.mounts && account.mounts[_md.key]);
          chaseLine = `<div class="muted" style="font-size:11px;color:#f6c453">🐎 专属坐骑: ${_mt.icon || ''}${_mt.name}${_owned ? '<span style="color:#6ee7b7"> ✓已收集</span>' : '(极低概率,英雄/史诗本掉率更高)'}</div>`;
        }
      }
    }
    const typeLabel = isEpicRaid ? '<span style="color:#fb7185">[史诗团本]</span> '
      : dg.epic5 ? '<span style="color:#c084fc">[史诗5人本]</span> '
      : dg.heroic ? '<span style="color:#f6c453">[英雄5人本]</span> '
      : dg.delve ? '<span style="color:#67e8f9">[地下堡]</span> '
      : dg.type === 'raid' ? '<span style="color:#fbbf24">[团本]</span> '
      : '<span style="color:#6ee7b7">[5人本]</span> ';
    const powerText = dungeonPowerText(dg);
    const lootIlvlText = dungeonLootIlvlText(dg);
    const dungeonProgressLine = dg.type !== 'raid' && (powerText || lootIlvlText)
      ? `<div class="muted" style="font-size:11px;color:#f6c453">🎚️ ${[powerText, lootIlvlText].filter(Boolean).join(' · ')}</div>`
      : '';
    const recIlvl = (typeof dungeonRecommendedItemLevel === 'function') ? dungeonRecommendedItemLevel(dg) : 0;
    const reqIlvl = (typeof dungeonRequiredItemLevel === 'function') ? dungeonRequiredItemLevel(dg) : 0;
    const avgIlvl = (typeof averageEquippedItemLevel === 'function') ? Math.floor(averageEquippedItemLevel()) : 0;
    const ilvlLine = recIlvl > 0
      ? `<div class="muted" style="font-size:11px;color:${reqIlvl > 0 && avgIlvl < reqIlvl ? '#fb7185' : '#f6c453'}">🎚️ ${reqIlvl > 0 ? '史诗团本准入' : '推荐装备'}: 平均装等 ${reqIlvl || recIlvl}+${avgIlvl ? ` · 当前 ${avgIlvl}` : ''}</div>`
      : '';
    const raidProgressLine = dg.type === 'raid' && (dg.raidExpansion || dg.raidIlvl || powerText || lootIlvlText)
      ? ` · ${[dg.raidExpansion, powerText, lootIlvlText].filter(Boolean).join(' · ')}`
      : '';
    div.innerHTML = `
      <div class="row">
        <span><span class="icon">${dungeonIconHtml}</span> <b>${dg.name}</b></span>
        <span>${bountyBadge}${firstClearBadge}<span class="pill">${typeof contentReqLabel === 'function' ? contentReqLabel(dg.reqLvl) : `等级${dg.reqLvl}`}</span></span>
      </div>
      ${artBanner}
      <div class="muted">${typeLabel}${dg.desc}${raidProgressLine}</div>
      <div class="dungeon-card-brief">
        <span>${(dg.bosses||[]).length}名首领</span>
        <span>最终: ${((dg.bosses||[])[dg.bosses.length-1]||{}).name||'??'}</span>
        ${lootIlvlText ? `<span>${tipAttrText(lootIlvlText)}</span>` : ''}
        ${contractPill}
      </div>
      ${bountyLine}
      ${delveLine}
      ${chaseLine}
      ${dungeonProgressLine}
      ${ilvlLine}
      ${setTierInfo ? `<div class="dungeon-set-track compact">当前职业套装: ${setTierInfo.setName} · ${setTierInfo.bandName}</div>` : ''}
      <div class="row">
        <span class="cd-display">${statusText}</span>
        <div style="display:flex;gap:6px;align-items:center">
          <button style="padding:4px 8px;font-size:11px" data-action="dungeoninfo" data-key="${dg.key}">详情</button>
          <button class="enter-btn ${canEnter?'epic':''}" data-action="enterdungeon" data-key="${dg.key}" ${canEnter?'':'disabled'}>${btnText}</button>
        </div>
      </div>`;
    bindInlineTipElements(div);
    target.appendChild(div);
  };
  for (const dg of normalDungeons) renderDungeonCard(dg, dl);
  for (const dg of epicDungeons) renderDungeonCard(dg, epicDl);
  for (const dg of heroicDungeons) renderDungeonCard(dg, heroicDl);
  for (const dg of epic5Dungeons) renderDungeonCard(dg, epic5Dl);
  if (heroicDl && !heroicDungeons.length) {
    heroicDl.innerHTML = '<div class="muted" style="text-align:center;padding:12px">暂无英雄副本(达到对应等级后开放)</div>';
  }
  if (epic5Dl && !epic5Dungeons.length) {
    epic5Dl.innerHTML = '<div class="muted" style="text-align:center;padding:12px">暂无史诗5人本(达到对应等级后开放)</div>';
  }
  if (dl && !normalDungeons.length) {
    dl.innerHTML = '<div class="muted" style="text-align:center;padding:12px">当前筛选下暂无普通副本</div>';
  }
  if (epicDl && !epicDungeons.length) {
    epicDl.innerHTML = '<div class="muted" style="text-align:center;padding:12px">暂无史诗团本</div>';
  }
}

/* ---------- 按钮状态就地更新(不重建 DOM) ---------- */
function updateCdDisplays() {
  document.querySelectorAll('.map-item').forEach(el => {
    const key = el.dataset.mapKey;
    const m = MAPS.find(x => x.key === key);
    const btn = el.querySelector('.boss-btn');
    if (!m || !btn) return;
    const bCdLeft = Math.max(0, Math.ceil(((state.bossCd[key] || 0) - Date.now()) / 1000));
    const bOnCd = bCdLeft > 0;
    const bReq = Math.max(1, (m.boss.lvl || 1) - 5);
    const bLvlOk = typeof contentReqMet === 'function' ? contentReqMet(bReq) : state.hero.lvl >= bReq;
    const bCanFree = bLvlOk && !bOnCd && state.mode === 'world';
    const bCanTicket = bLvlOk && bOnCd && state.tickets >= 1 && state.mode === 'world';
    const canBoss = bCanFree || bCanTicket;
    const newText = !bLvlOk ? '进度不足'
      : (!bOnCd ? '挑战(免费)'
      : (bCanTicket ? `🎫挑战 (冷却 ${fmtCd(bCdLeft)})` : `冷却 ${fmtCd(bCdLeft)}`));
    if (btn.textContent !== newText) btn.textContent = newText;
    btn.disabled = !canBoss;
    btn.classList.toggle('epic', canBoss);
  });
  document.querySelectorAll('.dungeon-item').forEach(el => {
    const key = el.dataset.dungeonKey;
    const dg = DUNGEONS.find(d => d.key === key);
    const btn = el.querySelector('.enter-btn');
    const cdSpan = el.querySelector('.cd-display');
    if (!dg || !btn) return;
    const cdEnd = state.dungeonCd[key] || 0;
    const cdLeft = Math.max(0, Math.ceil((cdEnd - Date.now()) / 1000));
    const onCd = cdLeft > 0;
    const access = (typeof dungeonAccessInfo === 'function') ? dungeonAccessInfo(dg) : { ok:(state.hero.lvl >= dg.reqLvl), short:'进度不足' };
    const lvlOk = access.ok;
    const canFree = lvlOk && !onCd && state.mode === 'world';
    const canTicket = lvlOk && onCd && state.tickets >= 1 && state.mode === 'world';
    const canEnter = canFree || canTicket;
    const statusText = !lvlOk ? (access.short || '进度不足')
      : onCd ? `<span style="color:#fb923c">⏳冷却 ${fmtCd(cdLeft)}</span>${canTicket ? ' · 🎫跳过' : ''}`
      : '<span style="color:#6ee7b7">✅可挑战(免费)</span>';
    const btnText = canFree ? '免费进入' : (canTicket ? '🎫进入' : '进入');
    if (cdSpan && cdSpan.innerHTML !== statusText) cdSpan.innerHTML = statusText;
    if (btn.textContent !== btnText) btn.textContent = btnText;
    btn.disabled = !canEnter;
    btn.classList.toggle('epic', canEnter);
    // CD状态变化时同步变暗/恢复(CD结束立即恢复高亮,无需整列重建)
    const dim = onCd ? '0.6' : '';
    if (el.style.opacity !== dim) el.style.opacity = dim;
    el.classList.toggle('on-cd', onCd);
  });
}

/* ---------- dirty 分发 ---------- */
function processDirty() {
  if (isDirty('all')) {
    renderHero(); renderEquipment(); renderInventory();
    renderShop(); renderSkills(); renderTalents();
    if (typeof renderPassives==='function') renderPassives();
    renderMap(); renderDungeon(); renderCompanion();
    if (typeof renderProgression==='function') renderProgression();
    if (typeof renderEvents==='function') renderEvents();
    if (typeof renderAscend==='function') renderAscend();
    if (typeof renderTowerPanel==='function') renderTowerPanel();
    if (typeof renderRoguelikePanel==='function') renderRoguelikePanel();
    if (typeof renderLife==='function') renderLife();
    if (typeof renderArtifact==='function') renderArtifact();
    if (typeof renderMounts==='function') renderMounts();
    if (typeof renderArena==='function') renderArena();
    clearAllDirty();
    return;
  }
  if (isDirty('hero'))      { renderHero();      clearDirty('hero'); }
  if (isDirty('equipment')) { renderEquipment(); clearDirty('equipment'); }
  if (isDirty('inventory')) { renderInventory(); clearDirty('inventory'); }
  if (isDirty('shop'))      { renderShop();      clearDirty('shop'); }
  if (isDirty('skills'))    { renderSkills(); if (typeof renderPassives==='function') renderPassives(); clearDirty('skills'); }
  if (isDirty('talents'))   { renderTalents();   clearDirty('talents'); }
  if (isDirty('loadout')&&typeof renderLoadouts==='function') { renderLoadouts(); clearDirty('loadout'); }
  if (isDirty('map'))       { renderMap();       clearDirty('map'); }
  if (isDirty('dungeon'))   { renderDungeon();   if (typeof renderTowerPanel==='function') renderTowerPanel(); clearDirty('dungeon'); }
  if (isDirty('companion')) { renderCompanion(); clearDirty('companion'); }
  if (isDirty('progression')&&typeof renderProgression==='function') { renderProgression(); clearDirty('progression'); }
  if (isDirty('events')&&typeof renderEvents==='function') { renderEvents(); clearDirty('events'); }
  if (isDirty('ascend')&&typeof renderAscend==='function') { renderAscend(); clearDirty('ascend'); }
  if (isDirty('life')&&typeof renderLife==='function') { renderLife(); clearDirty('life'); }
  if (isDirty('artifact')&&typeof renderArtifact==='function') { renderArtifact(); clearDirty('artifact'); }
  if (isDirty('mount')&&typeof renderMounts==='function') { renderMounts(); clearDirty('mount'); }
  if (isDirty('arena')&&typeof renderArena==='function') { renderArena(); clearDirty('arena'); }
  updateNavBadges();
  expeditionLiveTick();
  if (typeof questLiveTick === 'function') questLiveTick();
  if (typeof paragonLiveTick === 'function') paragonLiveTick();
  if (typeof lifeBuffTick === 'function') lifeBuffTick();
  if (isDirty('expedition')&&typeof renderExpedition==='function') { renderExpedition(); clearDirty('expedition'); }
  if (isDirty('guild')&&typeof renderGuild==='function') { renderGuild(); clearDirty('guild'); }
  if (isDirty('market')&&typeof renderMarket==='function') { renderMarket(); clearDirty('market'); }
  if (isDirty('quests')&&typeof renderQuests==='function') { renderQuests(); clearDirty('quests'); }
  if (isDirty('vault')&&typeof renderVault==='function') { renderVault(); clearDirty('vault'); }
  if (isDirty('paragon')&&typeof renderParagon==='function') { renderParagon(); clearDirty('paragon'); }
  if (isDirty('stage'))     { clearDirty('stage'); /* stage 信息已在 updateBattleVisuals 处理 */ }
}

/* 全局点击关闭已固定的 tooltip(触屏场景) */
document.addEventListener('click', e => {
  if (!_tipPinned || !_tipPinnedOwner) return;
  const tip = document.getElementById('compare-tip');
  if (tip && tip.contains(e.target)) return;
  if (!_tipPinnedOwner.contains(e.target)) {
    unpinTip();
  }
});
