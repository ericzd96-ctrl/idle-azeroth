/* =========================================================
   render.js — 选择性渲染(只重建脏面板),修复按钮点不响应
   ----------------------------------------------------------
   核心思路:
   1) 动作触发 markDirty('xxx'),loop 中只重建该面板
   2) 战斗血条/数字直接更新 textContent / style.width,不重建 DOM
   3) BOSS/副本 CD 通过查找已有元素直接更新文本,不整列表重建
   ========================================================= */

/* ---------- 每帧轻量更新(不重建 DOM) ---------- */
let attrTips = {};

/* ---------- 触屏 Tooltip 固定/取消 ---------- */
let _tipPinned = false;
let _tipPinnedOwner = null;

function unpinTip() {
  _tipPinned = false;
  _tipPinnedOwner = null;
  const tip = document.getElementById('compare-tip');
  if (tip) tip.style.display = 'none';
}

function addTouchPin(el, showFn) {
  el.addEventListener('click', e => {
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
    cell.addEventListener('mouseenter', showFn);
    cell.addEventListener('mouseleave', () => { if (!_tipPinned) { $('compare-tip').style.display = 'none'; } });
    cell.addEventListener('mousemove', e => positionTip($('compare-tip'), e));
    addTouchPin(cell, showFn);
  });
}
/* 竖排敌人列表:仅在敌群构成/焦点变化时重建 DOM(避免每帧重建破坏 hover/点击),
   每帧只更新血条宽度与数字。焦点行带 legacy id(mon-emoji/mon-name/b-mhp/t-mhp)供 showFloat 锚定。 */
let _monListSig = '';
let skillDragging = false;   // 技能栏拖拽排序进行中(由 main.js 设置),期间不重建技能栏
let _buffBarSig = '';        // 增益条内容签名,变化才重绘
/* 当前职业的 buff 元信息(key→{icon,name,desc,dr}),从技能定义构建 */
function buffMetaForClass() {
  const c = getCls(); const map = {};
  if (c) for (const sk of Object.values(c.skills)) {
    if (sk.type === 'buff' && sk.buff) map[sk.buff] = { icon: sk.icon, name: sk.name, desc: sk.desc || '', dr: !!(typeof BUFF_FX==='object' && BUFF_FX[sk.buff] && BUFF_FX[sk.buff].dr) };
  }
  return map;
}
/* 焦点敌人当前的减益(debuff)列表 */
function focusDebuffs(now) {
  const mon = state.currentMonsters && state.currentMonsters[0];
  if (!mon || mon.hp <= 0) return [];
  const out = [];
  if (mon.slowUntil > now)   out.push({ icon: '❄️', name: '减速',   desc: '攻击速度降低约33%', left: Math.ceil((mon.slowUntil - now) / 1000) });
  if (typeof getMonsterDots === 'function') {
    for (const dot of getMonsterDots(mon, now)) {
      out.push({
        icon: dot.icon || '🔥',
        name: dot.name || '持续伤害',
        desc: `每秒受到 ${fmt(dot.dps || 0)} 持续伤害`,
        left: Math.ceil(((dot.expire || now) - now) / 1000)
      });
    }
  } else if (mon.dot > 0 && mon.dotEnd > now) out.push({ icon: '🔥', name: '灼烧/中毒', desc: `每秒受到 ${fmt(mon.dot)} 持续伤害`, left: Math.ceil((mon.dotEnd - now) / 1000) });
  if (mon.sunderUntil > now) out.push({ icon: '🔨', name: '破甲',   desc: '防御降低 30%', left: Math.ceil((mon.sunderUntil - now) / 1000) });
  if (typeof MONSTER_STATE_META === 'object' && mon._skillStates) {
    for (const [stateKey, expire] of Object.entries(mon._skillStates)) {
      if (!(expire > now)) continue;
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
  const out = [];
  if (mon._trickAuras) {
    for (const [key, aura] of Object.entries(mon._trickAuras)) {
      if (!aura) continue;
      const stacks = key === 'nextDouble' ? (mon._nextAtkDouble || aura.stacks || 0) : (aura.stacks || 0);
      const timed = aura.expire > now;
      const stackActive = key === 'nextDouble' && stacks > 0;
      if (!timed && !stackActive) continue;
      const left = timed ? Math.ceil((aura.expire - now) / 1000) : 0;
      const suffix = stacks > 1 ? ` · ${stacks}层` : '';
      out.push({
        icon: aura.icon || '⚡',
        name: (aura.name || key) + suffix,
        desc: aura.desc || '敌人获得了特殊技巧强化',
        left
      });
    }
  }
  if (mon._arcaneShield > 0 && !(mon._trickAuras && mon._trickAuras.shield)) {
    out.push({ icon:'🔮', name:'护体屏障', desc:`吸收 ${fmt(mon._arcaneShield)} 点伤害`, left:0 });
  }
  return out;
}
function renderBuffBar() {
  const bar = $('buff-bar'); if (!bar) return;
  const now = Date.now();
  const meta = buffMetaForClass();
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
      const m = SKILL_AURA_LIBRARY[k];
      if (!m) continue;
      const left = aura.expire ? Math.ceil((aura.expire - now) / 1000) : 0;
      if (aura.expire && aura.expire <= now) continue;
      const stacks = aura.stacks > 1 ? ` · ${aura.stacks}层` : '';
      buffs.push({ kind: 'buff', icon: m.icon || '✨', name: (m.name || k) + stacks, desc: m.desc || '', left });
    }
  }
  buffs.sort((a, b) => a.left - b.left);
  const enemyBuffs = focusBuffs(now).map(b => ({ kind: 'enemy-buff', icon: b.icon, name: '敌·' + b.name, desc: b.desc, left: b.left }));
  // 焦点敌人减益
  const debuffs = focusDebuffs(now).map(d => ({ kind: 'debuff', icon: d.icon, name: '敌·' + d.name, desc: d.desc, left: d.left }));
  // 英雄身上的减益(boss 等施加)
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
  const all = buffs.concat(heroDe, enemyBuffs, debuffs);
  const sig = all.map(b => b.kind + b.icon + b.left).join('|');
  if (sig === _buffBarSig) return;   // 内容(含倒计时)没变就不重绘
  _buffBarSig = sig;
  bar.innerHTML = all.map(b => {
    const tip = `${b.name}${b.desc ? ' · ' + b.desc : ''}${b.left > 0 ? ' · 剩余' + b.left + '秒' : ''}`;
    return `<div class="buff-chip ${b.kind}" data-tip="${tip.replace(/"/g, '&quot;')}"><div class="b-ic">${b.icon}</div><div class="b-t">${b.left > 0 ? b.left + 's' : '∞'}</div></div>`;
  }).join('');
}
function effectTags(s) {
  const t = [];
  if (s.aoe) t.push('💥AOE');
  if (s.stun) t.push(s.stun===true?'💫眩晕2秒':'💫眩晕'+(s.stun/1000)+'秒');
  if (s.slow) t.push('❄️减速5秒');
  if (s.dot) t.push('☠️灼烧6秒');
  if (s.weaken) t.push('💔削弱5秒');
  if (s.sunder) t.push('🩸易伤5秒');
  if (s.spdBuff) t.push('⚡自加速8秒');
  if (s.heal) t.push(`💚恢复${Math.round((s.heal||0)*100)}%生命`);
  if (s.healPct) t.push(`💚恢复${Math.round((s.healPct||0)*100)}%生命`);
  if (s.atkBuffSecs) t.push(`📯攻击提高${Math.round(s.atkBuffPct||30)}%`);
  if (s.defBuffSecs) t.push(`🪨防御提高${Math.round(s.defBuffPct||35)}%`);
  if (s.drBuffSecs) t.push(`🛡️减伤提高${Math.round((s.drBuffPct||0.25)*100)}%`);
  if (s.shieldPct) t.push(`🔮护盾${Math.round((s.shieldPct||0)*100)}%生命`);
  if (s.critBuffSecs) t.push(`👁️暴击提高${Math.round(s.critBuffPct||35)}%`);
  if (s.leechBuffSecs) t.push(`🩸吸血${Math.round(s.leechBuffPct||18)}%`);
  if (s.summonCount) t.push(`👥召唤${s.summonCount}个援军`);
  if (s.lifeSteal) t.push('🩸吸血'+Math.round(s.lifeSteal*100)+'%');
  if (s.silence) t.push('🔇沉默');
  if (s.disarm) t.push('⚔️❌缴械');
  if (s.fear) t.push('👻恐惧');
  if (s.freeze) t.push('🧊冰冻');
  if (s.cripple) t.push('🦿残废');
  if (s.decay) t.push('👴衰老');
  if (s.wither) t.push('🥀生命枯萎');
  if (s.manaDrain) t.push('💧魔力流失');
  if (s.bomb) t.push('💣自爆印记');
  if (s.plague) t.push('🦠暗影瘟疫');
  if (s.bleed) t.push('🩸流血');
  if (s.brittle) t.push('💥易爆');
  if (s.soulDrain) t.push('🧛精力榨取');
  if (s.soulLink) t.push('🔗灵魂链接');
  if (s.revenge) t.push('🎯复仇标记');
  if (s.frenzy) t.push('🤯狂乱');
  if (s.decay2) t.push('🌑凋零');
  if (s.mirror) t.push('🪞镜像');
  return t;
}
function attachFocusBossHover(focus) {
  const emojiEl = $('mon-emoji'); if (!emojiEl) return;
  if (!focus) return;

  // 获取BOSS数据(地图/副本/大秘境)
  let bossData = null;
  if (state.mode === 'boss') {
    const map = getMap();
    if (map?.boss) bossData = map.boss;
  } else if (state.mode === 'worldboss') {
    if (typeof WORLD_BOSSES !== 'undefined') bossData = WORLD_BOSSES.find(b => b.key === focus.wbKey) || null;
  } else if (state.mode === 'dungeon' || state.mode === 'mythic') {
    const dg = DUNGEONS.find(d=>d.key===(state.dungeonState||state.mythicState)?.key);
    if (dg) bossData = (dg.bosses||[]).find(b=>b.name===focus.bossName);
  }

  const hasMobSkills = !!(focus._monSkills?.length || focus._monSkill || focus._monSupportSkills?.length);
  if (!bossData && !hasMobSkills) return;
  emojiEl.style.cursor = 'help';
  const showFocusTip = function(e) {
    let html = '<b>'+focus.name+' Lv.'+focus.lvl+'</b>';
    if (bossData?.skills) {
      html += '<div style=\"margin-top:3px;color:#fbbf24\">技能:</div>';
      bossData.skills.forEach(s => {
        const tags = effectTags(s);
        html += '<div>'+s.icon+' '+s.name+' — '+s.desc+' ('+(s.castTime||0)+'s读条)'+(tags.length?' <span style=\"color:#fbbf24;font-size:10px\">'+tags.join(' ')+'</span>':'')+'</div>';
      });
    } else if (focus._monSkills?.length || focus._monSkill) {
      const skills = focus._monSkills?.length ? focus._monSkills : [focus._monSkill];
      html += '<div style=\"margin-top:3px;color:#fbbf24\">敌方技能:</div>';
      skills.forEach(s => {
        const tags = effectTags(s);
        html += '<div>'+s.icon+' '+s.name+' — '+(s.desc||((s.mul||1)+'倍伤害'))+(tags.length?' <span style=\"color:#fbbf24;font-size:10px\">'+tags.join(' ')+'</span>':'')+'</div>';
      });
    }
    if (focus._monSupportSkills && focus._monSupportSkills.length) {
      html += '<div style=\"margin-top:3px;color:#93c5fd\">支援技能包:</div>';
      focus._monSupportSkills.forEach(s => {
        const tags = effectTags(s);
        html += '<div>'+s.icon+' '+s.name+' — '+(s.desc||'支援技能')+(tags.length?' <span style=\"color:#93c5fd;font-size:10px\">'+tags.join(' ')+'</span>':'')+'</div>';
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
    }
    const tip = $('compare-tip');
    tip.querySelector('.compare-head').innerHTML = html;
    tip.querySelector('.compare-body').innerHTML = '';
    tip.style.display = 'block';
    positionTip(tip, e);
  };
  emojiEl.onmouseenter = showFocusTip;
  emojiEl.onmouseleave = () => { if (!_tipPinned) hideLootTip(); };
  emojiEl.onmousemove = (e) => positionTip($('compare-tip'), e);
  addTouchPin(emojiEl, showFocusTip);
}
function renderMonList() {
  const wrap = $('mon-list'); if (!wrap) return;
  const alive = state.currentMonsters.filter(m => m.hp > 0);
  if (alive.length === 0) { if (_monListSig !== '') { wrap.innerHTML = ''; _monListSig = ''; } return; }
  const focus = state.currentMonsters[0];
  const sig = alive.map(m => m._uid + (m === focus ? 'F' : '')).join('|');
  if (sig !== _monListSig) {
    _monListSig = sig;
    wrap.innerHTML = alive.map(m => {
      const isFocus = m === focus;
      const seg = Array.from(m.name);
      const emoji = seg[0], nm = seg.slice(1).join('') || '敌人';
      return `<div class="mon-row${isFocus?' focus':''}" data-uid="${m._uid}">
        <div class="m-emoji"${isFocus?' id="mon-emoji"':''}>${emoji}</div>
        <div class="m-mid">
          <div class="m-name"${isFocus?' id="mon-name"':''}>${nm}<span class="m-lvl">Lv.${m.lvl}</span><span class="m-debuffs"></span></div>
          <div class="bar hp"><i${isFocus?' id="b-mhp"':''}></i><span${isFocus?' id="t-mhp"':''}></span></div>
        </div>
      </div>`;
    }).join('');
    attachFocusBossHover(focus);
  }
  // 每帧更新血条 + 减益小图标(按 uid 定位行)
  const now = Date.now();
  for (const m of alive) {
    const row = wrap.querySelector(`[data-uid="${m._uid}"]`); if (!row) continue;
    const fill = row.querySelector('.bar > i'); const txt = row.querySelector('.bar > span');
    if (fill) fill.style.width = Math.max(0, m.hp / m.hpMax * 100) + '%';
    if (txt) txt.textContent = `${fmt(Math.max(0, m.hp))}/${fmt(m.hpMax)}`;
    const de = row.querySelector('.m-debuffs');
    if (de) {
      let s = '';
      if (m.slowUntil > now)   s += `<span title="减速:攻速降低">❄️</span>`;
      if (typeof getMonsterDots === 'function') {
        const dots = getMonsterDots(m, now);
        if (dots.length) {
          const total = dots.reduce((sum, dot) => sum + (dot.dps || 0), 0);
          const names = dots.map(dot => `${dot.icon || '🔥'}${dot.name || '持续伤害'}:${fmt(dot.dps || 0)}/秒`).join(' · ');
          s += `<span title="${names}">🔥${dots.length > 1 ? 'x' + dots.length : ''}:${fmt(total)}</span>`;
        }
      } else if (m.dot > 0 && m.dotEnd > now) s += `<span title="灼烧/中毒:每秒 ${fmt(m.dot)} 伤害">🔥</span>`;
      if (m.sunderUntil > now) s += `<span title="破甲:防御降低30%">🔨</span>`;
      if (m._arcaneShield > 0) s += `<span title="法力护盾:吸收 ${fmt(m._arcaneShield)} 伤害">🔮</span>`;
      if (de.dataset.s !== s) { de.innerHTML = s; de.dataset.s = s; }
    }
  }
}
/* ---------- 伤害统计(战斗日志下方) ---------- */
function updateDmgMeter() {
  const heroDmg = (typeof dmgStats !== 'undefined') ? (dmgStats.hero || 0) : 0;
  const compDmg = (typeof dmgStats !== 'undefined') ? (dmgStats.comp || 0) : 0;
  const total = heroDmg + compDmg;
  const elapsed = (typeof dmgStats !== 'undefined' && dmgStats.start)
    ? Math.max(0.001, ((dmgStats.last || dmgStats.start) - dmgStats.start) / 1000)
    : 0.001;
  const dps = Math.round(total / elapsed);

  // DPS 文本
  const dpsEl = $('dm-dps');
  if (dpsEl) dpsEl.textContent = 'DPS ' + fmt(dps);

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
  if (totalEl) totalEl.textContent = '总计 ' + fmt(total) + ' · ' + Math.floor(elapsed) + 's';
}

function updateBattleVisuals() {
  if (!state.cls) return;
  const c = getCls();
  const h = state.hero;

  // 头部 stats(便宜的文本更新)
  const race = RACES[state.race];
  const cls = getCls();
  const accountTitle = (typeof account!=='undefined' && account?.title) || '';
  const curTitle = accountTitle || state.title || '';
  const titleHtml = curTitle ? `<span class="pill" style="background:var(--gold);color:#000;font-weight:bold" title="成就称号">${curTitle}</span> ` : '';
  $('h-name').innerHTML = `${race?.icon||'👤'} <b>${state.name||'冒险者'}</b> ${titleHtml}<span class="pill">${classIcon(state.cls, 16, cls?.icon||'')} Lv.${state.hero.lvl}</span>`;
  $('h-name').title = '点击切换角色';
  $('h-gold').textContent = fmt(state.gold);
  $('h-gem').textContent = fmt(state.gem);
  $('h-tickets').textContent = fmt(state.tickets || 0);
  $('h-comp-tickets').textContent = fmt(state.compTickets || 0);
  $('h-honor').textContent = fmt(state.honor);
  if ($('h-towercoin')) $('h-towercoin').textContent = fmt(state.towerCoin || 0);
  if ($('h-essence')) $('h-essence').textContent = fmt(state.essence || 0);
  if ($('btn-speed')) { const bs = state.battleSpeed || 1; const lbl = `⏩ ${bs}x`; if ($('btn-speed').textContent !== lbl) { $('btn-speed').textContent = lbl; $('btn-speed').classList.toggle('gold', bs > 1); } }

  // XP / HP / 资源条
  setBar($('b-xp'), h.lvl >= MAX_LEVEL ? 100 : h.xp / xpNeeded(h.lvl) * 100,
    h.lvl >= MAX_LEVEL ? 'MAX' : `${fmt(h.xp)}/${fmt(xpNeeded(h.lvl))}`);
  setBar($('b-hp'), state.hp/h.hpMax*100, `${fmt(state.hp)}/${fmt(h.hpMax)}`);
  setBar($('b-hp2'), state.hp/h.hpMax*100, `${fmt(state.hp)}/${fmt(h.hpMax)}`);
  setBar($('b-mp'), state.resource/state.resourceMax*100,
    `${c.resource} ${fmt(state.resource)}/${fmt(state.resourceMax)}`);

  // 怪物信息(竖排敌人列表)
  renderMonList();

  // 等级、英雄表情
  $('s-lvl').textContent = h.lvl;
  $('hero-lvl-tag').textContent = h.lvl;
  // 战斗头像:用当前专精图标,未选专精回退职业 emoji(每帧调用,故按签名缓存,避免重建 <img> 闪烁)
  const heEl = $('hero-emoji');
  const avKey = state.specialization ? (state.cls + ':' + state.specialization) : ('emoji:' + state.cls);
  if (heEl.dataset.av !== avKey) {
    heEl.dataset.av = avKey;
    heEl.innerHTML = state.specialization ? specIcon(state.cls, state.specialization, 56, c.emoji) : c.emoji;
  }

  // 关卡信息
  if (state.mode === 'travel') {
    const t = state.travel;
    const map = MAPS.find(m => m.key === (t && t.mapKey));
    $('h-zone').textContent = `🐴 旅行中...`;
    $('zone-name').textContent = `🐴 前往 ${map ? map.icon + ' ' + map.name : '...'}`;
    $('progress-text').innerHTML = `<b>正在骑马赶路...</b>`;
  } else if (state.mode === 'world') {
    const map = getMap();
    const sub = map.sub[state.currentSubzone];
    if (!sub) { $('h-zone').textContent = `${map.icon} ${map.name}`; $('zone-name').textContent = `${map.icon} ${map.name}`; $('progress-text').innerHTML = ''; }
    else {
      const subKey = `${state.currentMap}-${state.currentSubzone}`;
      const subKills = state.subzoneKills[subKey] || 0;
      const cleared = state.subzoneCleared[subKey];
      $('h-zone').textContent = `${map.icon} ${map.name} · ${sub.name}`;
      $('zone-name').textContent = `${map.icon} ${map.name} · ${sub.name} (Lv ${sub.lvl[0]}-${sub.lvl[1]})`;
      $('progress-text').innerHTML = `探索进度 <b>${Math.min(subKills,50)}</b> / 50 ${cleared?'✅':''}`;
    }
  } else if (state.mode === 'boss') {
    const map = getMap();
    $('h-zone').textContent = `${map.icon} ${map.name} · ⚔️BOSS战`;
    $('zone-name').textContent = `⚔️ ${map.icon} ${map.name} · BOSS战`;
    $('progress-text').innerHTML = `<b>${map.boss.name}</b>`;
  } else if (state.mode === 'dungeon') {
    const dg = DUNGEONS.find(d => d.key === state.dungeonState.key);
    if (!dg) return;
    const bossList = dg.bosses || [];
    const killedBosses = bossList.filter(b => b.wave < state.dungeonState.wave).length;
    const curBoss = bossList.find(b => b.wave === state.dungeonState.wave);
    const isRaid = dg.type === 'raid';
    const typeTag = isRaid ? '<span style=\"color:#fbbf24\">[团本]</span>' : '<span style=\"color:#6ee7b7\">[5人本]</span>';
    $('h-zone').textContent = `${dg.icon} ${dg.name}`;
    $('zone-name').innerHTML = `${dg.icon} ${dg.name} ${typeTag}`;
    let bossExtra = '';
    if (curBoss?.passive) {
      const p = curBoss.passive;
      const tags = [];
      if (p.dodgeChance) tags.push('💨闪避+'+(p.dodgeChance*100)+'%');
      if (p.critChance) tags.push('💥暴击+'+(p.critChance*100)+'%');
      if (p.dmgReduction) tags.push('🛡️减伤+'+(p.dmgReduction*100)+'%');
      if (p.atkBonus) tags.push('⚔️攻击+'+(p.atkBonus*100)+'%');
      if (tags.length) bossExtra += ' <span style=\"font-size:10px;color:#6ee7b7\">'+tags.join(' ')+'</span>';
    }
    const bossTag = curBoss ? ` ⚔️<b style=\"color:var(--legend)\">${curBoss.name}</b>${bossExtra}` : '';
    $('progress-text').innerHTML = `波次 ${state.dungeonState.wave}/${dg.waves} · BOSS ${killedBosses}/${bossList.length}${bossTag}`;
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
      if (p.dodgeChance) tags.push('💨闪避+'+(p.dodgeChance*100)+'%');
      if (p.critChance) tags.push('💥暴击+'+(p.critChance*100)+'%');
      if (p.dmgReduction) tags.push('🛡️减伤+'+(p.dmgReduction*100)+'%');
      if (p.atkBonus) tags.push('⚔️攻击+'+(p.atkBonus*100)+'%');
      if (tags.length) bossExtra += ' <span style=\"font-size:10px;color:#6ee7b7\">'+tags.join(' ')+'</span>';
    }
    const bossTag = curBoss ? ` ⚔️<b style="color:var(--legend)">${curBoss.name}</b>${bossExtra}` : '';
    const affixStr = (ms.affixes && ms.affixes.length > 0)
      ? ' '+ms.affixes.map(a => `<span style="background:rgba(239,68,68,0.12);color:#f87171;padding:0 4px;border-radius:3px;font-size:10px;margin:0 1px;cursor:help"
        onmouseenter="showAffixTip(event,'${a.icon} ${a.name}','${a.desc}')"
        onmouseleave="hideAffixTip()">${a.icon}</span>`).join('')
      : '';
    $('h-zone').textContent = `🌟 大秘境 +${ms.level||state.mythicLevel}`;
    $('zone-name').innerHTML = `🌟 大秘境 +${ms.level||state.mythicLevel} · ${dg.name}${affixStr}`;
    $('progress-text').innerHTML = `波次 ${ms.wave}/${dg.waves} · BOSS ${killedBosses}/${bossList.length}${bossTag}`;
  } else if (state.mode === 'tower') {
    const ts = state.towerState;
    if (ts) {
      const type = (typeof towerMonsterType === 'function') ? towerMonsterType(ts.floor) : 'normal';
      const typeTag = type==='boss'?' 👑BOSS':type==='elite'?' 🗡️精英':'';
      $('h-zone').textContent = `⛰️ 无尽塔 · 第${ts.floor}层`;
      $('zone-name').textContent = `⛰️ 无尽塔 · 第${ts.floor}层${typeTag}`;
      $('progress-text').innerHTML = `本次 +${ts.coinThisRun||0}🪙 · 最高 ${state.tower?.highest||0} 层`;
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
    const statusTag=compDown?` · <span style="color:#fde047">💫倒下 ${reviveLeft}s</span>`:'';
    const sigBadge = tpl?.signature ? ` · <span style="color:#fcd34d">${tpl.signature.icon||'✨'}专属</span>` : '';
    $('comp-mini-name').innerHTML=`${tpl?.emoji||'🐾'} ${tpl?.name} · <span class="${q.cls||''}">${q.name}</span> ${'⭐'.repeat(comp.stars||1)}${sigBadge} · 攻${fmt(st.atk)} 防${fmt(st.def)}${statusTag}`;
    setBar($('b-comp-hp'),Math.max(0,compHp)/st.hpMax*100,compDown?`倒下 ${reviveLeft}s`:`${fmt(Math.max(0,compHp))}/${fmt(st.hpMax)}`);
    // 随从技能 CD 展示:仅在随从/技能数变化时重建(避免每帧churn打断 title 悬浮),每帧只刷新剩余CD
    const csEl=$('comp-skills');
    if(csEl){
      const sig=comp.key+':'+((st.skills&&st.skills.length)||0);
      if(csEl._sig!==sig){
        csEl._sig=sig;
        const passiveSig = tpl?.signature?.mode==='passive'
          ? `<span class="comp-cd-passive" data-tip="${companionSkillTipHtml(Object.assign({_signature:true}, tpl.signature)).replace(/"/g,'&quot;')}" style="font-size:13px;cursor:help;color:#fcd34d">${tpl.signature.icon||'✨'}</span>`
          : '';
        csEl.innerHTML=passiveSig+((st.skills)||[]).map((s,i)=>{
          const tip=companionSkillTipHtml(s).replace(/"/g,'&quot;');
          const color = s._signature ? 'color:#fcd34d;' : '';
          return `<span class="comp-cd-skill" data-i="${i}" data-tip="${tip}" style="font-size:13px;cursor:help;${color}">${s.icon}<sub class="cs-cd" style="font-size:9px;color:#fbbf24"></sub></span>`;
        }).join('');
      }
      // 用自定义 #compare-tip 而非原生 title:原生 title 的悬浮计时会被每帧 CD/透明度更新打断,导致"偶尔不显示"
      if(!csEl._tipBound){
        csEl._tipBound=true;
        const showTip=e=>{const sp=e.target.closest('.comp-cd-skill,.comp-cd-passive');if(!sp)return;const tip=$('compare-tip');if(!tip)return;tip.querySelector('.compare-head').innerHTML=sp.dataset.tip||'';tip.querySelector('.compare-body').innerHTML='';tip.style.display='block';positionTip(tip,e);};
        csEl.addEventListener('mouseover',showTip);
        csEl.addEventListener('mousemove',e=>{if(e.target.closest('.comp-cd-skill,.comp-cd-passive'))positionTip($('compare-tip'),e);});
        csEl.addEventListener('mouseleave',()=>{if(!_tipPinned){const tip=$('compare-tip');if(tip)tip.style.display='none';}});
        csEl.addEventListener('click', e => {
          const sp = e.target.closest('.comp-cd-skill,.comp-cd-passive');
          if (!sp) return;
          if (_tipPinned && _tipPinnedOwner === sp) { unpinTip(); }
          else { if (_tipPinned) unpinTip(); showTip(e); _tipPinned = true; _tipPinnedOwner = sp; }
        });
      }
      // 每帧只在值变化时写 DOM(避免无谓 churn)
      csEl.querySelectorAll('.comp-cd-skill').forEach(span=>{
        const i=+span.dataset.i;const left=(typeof companionSkillCdLeft==='function')?companionSkillCdLeft(i):0;
        const op=left>0?'0.45':'1';if(span.style.opacity!==op)span.style.opacity=op;
        const sub=span.querySelector('.cs-cd');if(sub){const txt=left>0?Math.ceil(left/1000)+'s':'';if(sub.textContent!==txt)sub.textContent=txt;}
      });
    }
    const compMiniName = $('comp-mini-name');
    const showCompDetail = function(e){
      const nowTs = Date.now();
      const compBuffs = [];
      if (state._compBuffs) {
        for (const [k, expire] of Object.entries(state._compBuffs)) {
          if (!(expire > nowTs)) continue;
          const fx = (typeof BUFF_FX === 'object' && BUFF_FX[k]) ? BUFF_FX[k] : null;
          compBuffs.push((fx?.icon || '✨') + (fx?.name || k) + ' ' + Math.ceil((expire - nowTs) / 1000) + 's');
        }
      }
      const compDebuffs = [];
      if (typeof DEBUFF_FX === 'object' && state._compDebuffs) {
        for (const k in state._compDebuffs) {
          const d = state._compDebuffs[k];
          if (!(d.expire > nowTs)) continue;
          const fx = DEBUFF_FX[k]; if (!fx) continue;
          compDebuffs.push((fx.icon || '☠️') + fx.name + ' ' + Math.ceil((d.expire - nowTs) / 1000) + 's');
        }
      }
      const compBarrier = state._compBarrier || 0;
      const sig = tpl?.signature;
      const html=`<b>${tpl?.emoji} ${tpl?.name}</b><div>${q.name} ${'⭐'.repeat(comp.stars||1)} · ${tpl?.role==='tank'?'🛡️坦克':tpl?.role==='heal'?'💚治疗':'⚔️输出'}</div>
        <div>攻击${fmt(st.atk)} 防御${fmt(st.def)} 生命${fmt(st.hpMax)} 攻速${st.spd?.toFixed(2)}/s</div>
        <div class="muted">参战强度已按品质、星级与定位折算</div>
        <div class="muted">定位:${tpl?.role==='tank'?'🛡️坦克 负责扛压/控场':tpl?.role==='dps'?'⚔️输出 均衡承伤/技能爆发':'💚辅助 更强续航/净化/护持'}</div>
        ${sig?`<div style="color:#fcd34d">专属技: ${sig.icon||'✨'} ${sig.name} · ${sig.desc||''}${sig.mode==='passive'?' (被动)':''}</div>`:''}
        ${compBarrier>0?`<div style="color:#93c5fd">护盾: ${fmt(compBarrier)}</div>`:''}
        ${compBuffs.length?`<div>增益: ${compBuffs.join(' · ')}</div>`:''}
        ${compDebuffs.length?`<div style="color:#fca5a5">减益: ${compDebuffs.join(' · ')}</div>`:''}`;
      const tip=$('compare-tip');tip.querySelector('.compare-head').innerHTML=html;tip.querySelector('.compare-body').innerHTML='';
      tip.style.display='block';positionTip(tip,e);
    };
    compMiniName.onmouseenter = showCompDetail;
    compMiniName.onmouseleave = () => { if (!_tipPinned) $('compare-tip').style.display = 'none'; };
    compMiniName.onmousemove = e => positionTip($('compare-tip'), e);
    addTouchPin(compMiniName, showCompDetail);
  }else{
    $('comp-mini').style.display='none';
  }

  // 技能栏(只在dirty时重建, 否则只更新CD;拖拽排序进行中不重建以免打断)
  if ((isDirty('stage') || isDirty('skills')) && !skillDragging) renderSkillBar();
  else updateSkillBarCd();

  // 增益图标条
  renderBuffBar();

  // stage 样式 / 离开按钮显隐
  const stage = $('stage');
  if (state.mode === 'world' || state.mode === 'travel') {
    stage.classList.remove('dungeon');
    $('btn-leave').style.display = 'none';
  } else {
    stage.classList.add('dungeon');
    $('btn-leave').style.display = '';
  }

  // 伤害统计(每帧就地刷新)
  updateDmgMeter();
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
  $('s-spd').textContent = h.spd.toFixed(2)+'/s';
  $('s-reg').textContent = fmt(h.reg)+'/s';

  $('talent-points').textContent = state.talentPoints;

  // 副属性
  $('s-leech').textContent = ((state.hero.leech||0)*0.5).toFixed(1)+'%';   // 每点吸血=0.5%实际吸血
  $('s-vers').textContent = (state.hero.vers||0).toFixed(1)+'%';
  if ($('s-haste')) $('s-haste').textContent = (state.hero.haste||0).toFixed(1)+'%';
  $('s-mastery').textContent = fmt(state.hero.mastery||0);
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
      return `<span class="bonus-chip${v>0?' has':''}">${b.label} ${b.fmt(v)}</span>`;
    });
    bonusEl.innerHTML = parts.join('');
  } else if (bonusEl) {
    bonusEl.innerHTML = '<span class="muted" style="font-size:10px">暂无额外加成(装备/天赋/随从等可提供)</span>';
  }
}

function renderEquipment() {
  const eg = $('equip-grid');
  eg.innerHTML = '';
  for (const k of SLOT_ORDER) {
    const it = state.equipped[k];
    const div = document.createElement('div');
    div.className = 'slot' + (it ? ' '+it.bcls : '');
    div.dataset.slot = k;
    if (it) {
      const stats = Object.entries(it.stats).map(([sk,v])=>fmtMod(sk, v)).join(' ');
      const extras = (typeof itemBonusSummary==='function') ? itemBonusSummary(it) : '';
      div.innerHTML = `<div class="label">${SLOT_INFO[k].icon} ${SLOT_INFO[k].label}</div>
        <div class="name ${it.cls}">${it.name}${extras}</div>
        <div class="stats">${stats}${it.reqLvl?' · Lv.'+it.reqLvl:''}</div>`;
      div.title = '点击查看详情/卸下';
    } else {
      div.innerHTML = `<div class="label">${SLOT_INFO[k].icon} ${SLOT_INFO[k].label}</div>
        <div class="muted" style="font-size:11px">空</div>`;
    }
    eg.appendChild(div);
  }
}

function renderInventory() {
  // 清理槽位无效的物品
  state.inventory = state.inventory.filter(it => SLOT_INFO[it.slot]);
  $('inv-count').textContent = state.inventory.length;

  // 按品质→等级排序: 传说>史诗>精良>优秀>普通, 同品质高等级优先
  const rarityOrder = ['legend','epic','rare','uncommon','common'];
  state.inventory.sort((a,b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity) || (b.reqLvl||0) - (a.reqLvl||0));

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

  const il = $('inv-list');
  il.innerHTML = '';
  const tip = $('compare-tip');

  for (const it of state.inventory) {
    if (!SLOT_INFO[it.slot]) continue; // 跳过槽位无效的物品
    const equipped = state.equipped[it.slot];
    const stats = Object.entries(it.stats).map(([k,v])=>fmtMod(k, v)).join(' ');
    const row = document.createElement('div');
    row.className = 'inv-item ' + it.bcls;
    row.dataset.id = it.id;
    const extras = (typeof itemBonusSummary==='function') ? itemBonusSummary(it) : '';
    row.innerHTML = `
      <div class="info">
        <div class="name ${it.cls}">${SLOT_INFO[it.slot].icon} ${it.name}${extras}</div>
        <div class="stats">${stats}${it.reqLvl?" · Lv."+it.reqLvl:""}</div>
      </div>
      <div class="btns">
        <button data-action="detail" data-id="${it.id}" title="详情/词缀/宝石/附魔">🔍</button>
        <button class="primary" data-action="equip" data-id="${it.id}">装备</button>
        <button data-action="sell" data-id="${it.id}">${it.sell}💰</button>
      </div>`;

    const showCompare = e => {
      const diff = calcCompare(it, equipped);
      tip.querySelector('.compare-head').innerHTML = `
        <div>${SLOT_INFO[it.slot].icon} ${SLOT_INFO[it.slot].label} 对比</div>
        <div class="name ${it.cls}" style="font-size:11px">🆕 ${it.name}</div>
        ${equipped ? `<div class="name ${equipped.cls}" style="font-size:11px">📌 ${equipped.name}</div>` : '<div class="muted" style="font-size:11px">📌 当前栏位为空</div>'}
      `;
      tip.querySelector('.compare-body').innerHTML = diff;
      tip.style.display = 'block';
      positionTip(tip, e);
    };
    row.addEventListener('mouseenter', showCompare);
    row.addEventListener('mouseleave', () => { if (!_tipPinned) tip.style.display = 'none'; });
    row.addEventListener('mousemove', e => positionTip(tip, e));
    addTouchPin(row, showCompare);

    il.appendChild(row);
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
      html += `<div class="${r?.cls||''}" style="font-size:11px;margin:1px 0">${r?.name?.[0]||'?'} ${it.name} <span style="opacity:.6">${(it.stats?Object.entries(it.stats).map(([k,v])=>fmtMod(k, v)).join(' '):'')}</span></div>`;
    }
  }
  tip.querySelector('.compare-head').innerHTML = html;
  tip.querySelector('.compare-body').innerHTML = '';
  tip.style.display = 'block';
  positionTip(tip, e);
}
function hideLootTip() { if (!_tipPinned) $('compare-tip').style.display = 'none'; }

function positionTip(tip, e) {
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
      <div class="muted" style="margin-bottom:4px">地图BOSS和副本首次免费,冷却中用通用券跳过CD立即再战</div>
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
    <div class="shop-item"><b>💪 力量 (STR)</b>
      <div class="muted">每点: 攻击力 +${primary==='str'?'1.5':'0'} · ${primary==='str'?'<span style="color:var(--accent)">当前职业主属性</span>':'战士/圣骑士主属性'}</div>
    </div>
    <div class="shop-item"><b>🏃 敏捷 (AGI)</b>
      <div class="muted">每点: 暴击率 +0.05% · 攻击力 +${primary==='agi'?'1.5':'0'}${primary==='agi'?' <span style="color:var(--accent)">(主属性)</span>':''}<br>盗贼/猎人/德鲁伊主属性</div>
    </div>
    <div class="shop-item"><b>📚 智力 (INT)</b>
      <div class="muted">每点: 法力上限 +5 · 攻击力 +${primary==='int'?'1.5':'0'}${primary==='int'?' <span style="color:var(--accent)">(主属性)</span>':''}<br>法师/牧师/萨满/术士主属性</div>
    </div>
    <div class="shop-item"><b>🕯️ 精神 (SPI)</b>
      <div class="muted">每点: 生命回复 +0.2/秒 · 法力回复 +0.3/秒<br>影响战斗中资源续航</div>
    </div>
    <div class="shop-item"><b>❤️ 耐力 (STA)</b>
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
  const sourceOrder = ['天赋','成就','觉醒','生活','神器','坐骑','竞技场','被动','随从','装备','词缀','宝石','附魔'];
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
  let html = '<div style="margin-top:12px;border-top:1px solid var(--border);padding-top:8px"><div style="font-weight:bold;margin-bottom:6px">📊 属性来源明细</div>';
  html += '<div style="overflow-x:auto"><table class="src-table"><thead><tr><th>来源</th>';
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
  html += '</tbody></table></div></div>';
  return html;
}

function renderSkills() {
  const c = getCls(); if (!c) return;
  const skl = $('skill-list');
  skl.innerHTML = `<div class="muted" style="margin-bottom:6px;font-size:11px">技能栏 <b style="color:var(--accent)">${state.selectedSkills.length}</b>/8 · 点「选用」放入,满 8 个会顶替最早的</div>`;
  for (const [skKey, sk] of Object.entries(c.skills)) {
    const unlocked = !!state.unlockedSkills[skKey];
    const isSel = state.selectedSkills.includes(skKey);
    const cdSec = getSkillCd(sk);
    const div = document.createElement('div');
    div.className = 'skill-item';
    div.style.borderColor = isSel ? 'var(--accent)' : '';
    const lockInfo = sk.unlockLvl ? `(Lv.${sk.unlockLvl})` : '(天赋解锁)';
    const baseDesc = sk._baseDesc || sk.desc || '';
    const detailDesc = sk._detailDesc || '';
    div.innerHTML = `
      <div class="row">
        <b style="color:${unlocked?'inherit':'var(--muted)'}">${sk.icon} ${sk.name}</b>
        <span class="pill">${unlocked?'已解锁':lockInfo}</span>
      </div>
      <div class="muted">${baseDesc}</div>
      ${detailDesc ? `<div class="muted" style="margin-top:4px;color:#cbd5e1;font-size:11px;line-height:1.45">联动: ${detailDesc}</div>` : ''}
      <div class="row">
        <span class="muted">${c.resource} ${sk.mp} · CD ${cdSec}秒</span>
        ${unlocked ? `<button class="${isSel?'success':''}" data-action="selectskill" data-key="${skKey}">${isSel?'取消':'选用'}</button>` : ''}
      </div>`;
    skl.appendChild(div);
  }
}

function getTalentRow(t, idx) {
  if (t.req >= 66) return 10;
  if (t.req >= 56) return 9;
  if (t.req >= 46) return 8;
  if (t.req >= 30) return 7;
  if (t.req >= 28) return 6;
  if (t.req >= 25) return 5;
  if (t.req >= 22) return 5;
  if (t.req >= 20) return 4;
  if (t.req >= 18) return 4;
  if (t.req >= 15) return 3;
  if (t.req >= 10) return 2;
  if (idx >= 4) return 2;
  if (idx >= 2) return 1;
  return 0;
}
const ROW_REQ = [0, 5, 10, 15, 20, 25, 28, 30, 46, 56, 66];

function renderTalents() {
  const c = getCls(); if (!c) return;
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
      recomputeStats();
      markDirty('talents', 'hero');
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
      rowLabel.textContent = `需${ROW_REQ[row]}点`;
      rowDiv.appendChild(rowLabel);

      const nodes = document.createElement('div');
      nodes.className = 'wow-nodes';

      for (const t of rowTalents) {
        const cur = isActive ? ((state.talents[tree.key]||{})[t.key] || 0) : 0;
        const maxed = cur >= t.max;
        const reqMet = isActive && (!t.req || sumInTree >= t.req);
        const canBuy = isActive && !maxed && reqMet && state.talentPoints > 0;
        const node = document.createElement('div');
        node.className = 'wow-node' +
          (maxed ? ' maxed' : '') +
          (canBuy ? ' can-buy' : '') +
          (!isActive ? ' inactive' : '') +
          (!reqMet && isActive ? ' locked' : '');

        node.innerHTML = `
          <div class="wow-node-icon">${t.name[0]}</div>
          <div class="wow-node-info">
            <div class="wow-node-name">${t.name} <span class="ranks">${cur}/${t.max}</span></div>
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
  const now = Date.now();

  if (state.selectedSkills.length === 0) {
    bar.innerHTML = '<div class="muted" style="font-size:11px;text-align:center;padding:4px">未选择技能(在技能面板点选)</div>';
    return;
  }

  bar.innerHTML = state.selectedSkills.map(key => {
    const sk = c.skills[key];
    if (!sk) return '';
    const cdEnd = state.skillCooldowns[key] || 0;
    const cdLeft = Math.max(0, Math.ceil((cdEnd - now) / 1000));
    const onCd = cdLeft > 0;
    const hasMp = state.resource >= sk.mp;
    const baseDesc = sk._baseDesc || sk.desc || '';
    const detailDesc = sk._detailDesc ? `\n联动: ${sk._detailDesc}` : '';
    const tip = `${sk.name} · ${baseDesc}${detailDesc}\n${c.resource} ${sk.mp} · CD ${getSkillCd(sk)}秒`.replace(/"/g, '&quot;');
    return `<button class="skill-btn ${onCd?'on-cd':''}" data-skill="${key}" draggable="true" title="${tip}"
      style="${!onCd&&hasMp?'border-color:var(--accent)':''}">
      <span>${sk.icon} ${sk.name}</span>
      <span class="mp-cost">${sk.mp}${c.resKey==='rage'?'怒':c.resKey==='energy'?'能':'蓝'}</span>
      ${onCd?`<div class="cd-overlay">${cdLeft}s</div>`:''}
    </button>`;
  }).join('');
}

function updateSkillBarCd() {
  const bar = $('skill-bar'); if (!bar) return;
  const now = Date.now();
  bar.querySelectorAll('.skill-btn').forEach(btn => {
    const key = btn.dataset.skill;
    if (!key) return;
    const cdEnd = state.skillCooldowns[key] || 0;
    const cdLeft = Math.max(0, Math.ceil((cdEnd - now) / 1000));
    const overlay = btn.querySelector('.cd-overlay');
    if (cdLeft > 0) {
      btn.classList.add('on-cd');
      if (overlay) overlay.textContent = cdLeft + 's';
      else { const d=document.createElement('div');d.className='cd-overlay';d.textContent=cdLeft+'s';btn.appendChild(d); }
    } else {
      btn.classList.remove('on-cd');
      if (overlay) overlay.remove();
    }
  });
}

function renderMap() {
  const mapCur = getMap();
  if (mapCur) {
    const subCur = mapCur.sub[state.currentSubzone];
    if (subCur) $('cur-location').textContent = `${mapCur.icon} ${mapCur.name} · ${subCur.name} (Lv ${subCur.lvl[0]}-${subCur.lvl[1]})`;
    else $('cur-location').textContent = `${mapCur.icon} ${mapCur.name}`;
  }
  const ml = $('map-list');
  ml.innerHTML = '';
  const sortedMaps = [...MAPS].sort((a, b) => {
    const aMid = (a.lvlRange[0] + a.lvlRange[1]) / 2;
    const bMid = (b.lvlRange[0] + b.lvlRange[1]) / 2;
    const hl = state.hero.lvl;
    const aFit = hl >= a.lvlRange[0] && hl <= a.lvlRange[1];
    const bFit = hl >= b.lvlRange[0] && hl <= b.lvlRange[1];
    if (aFit !== bFit) return aFit ? -1 : 1;
    return Math.abs(hl - aMid) - Math.abs(hl - bMid);
  });
  for (const m of sortedMaps) {
    const isCurrent = m.key === state.currentMap;
    const tooHigh = state.hero.lvl < m.lvlRange[0] - 3;
    const div = document.createElement('div');
    div.className = 'map-item' + (isCurrent ? ' current' : '') + (tooHigh ? ' warn' : '');
    div.dataset.mapKey = m.key;
    let html = `
      <div class="map-head">
        <span class="mname">${m.icon} ${m.name}</span>
        <span><span class="map-faction faction-${m.faction}">${m.faction}</span> <span class="pill">Lv ${m.lvlRange[0]}-${m.lvlRange[1]}</span></span>
      </div>
      <div class="map-desc">${m.desc}${tooHigh?' · ⚠️ 等级过低,小心怪物':''}</div>
      <div class="sub-list">`;
    m.sub.forEach((s, idx) => {
      const subKey = `${m.key}-${idx}`;
      const active = isCurrent && state.currentSubzone === idx && state.mode === 'world';
      const cleared = state.subzoneCleared[subKey];
      html += `<button class="sub-btn ${active?'active':''}" data-action="subzone" data-map="${m.key}" data-sub="${idx}">
        ${cleared?'<span class="sub-cleared">✅ </span>':''}${s.name}
        <span class="sub-lvl">Lv ${s.lvl[0]}-${s.lvl[1]}</span>
      </button>`;
    });
    html += `</div>`;
    const bCdEnd = state.bossCd[m.key] || 0;
    const bCdLeft = Math.max(0, Math.ceil((bCdEnd - Date.now()) / 1000));
    const bOnCd = bCdLeft > 0;
    const bLvlOk = state.hero.lvl >= m.boss.lvl - 5;
    const bCanFree = bLvlOk && !bOnCd && state.mode === 'world';
    const bCanTicket = bLvlOk && bOnCd && state.tickets >= 1 && state.mode === 'world';
    const canBoss = bCanFree || bCanTicket;
    const bossText = !bLvlOk ? '等级不足'
      : (!bOnCd ? '挑战(免费)'
      : (bCanTicket ? `🎫挑战 (CD ${fmtCd(bCdLeft)})` : `CD ${fmtCd(bCdLeft)}`));
    html += `
      <div class="boss-row">
        <div class="boss-info">
          <div><span class="bname boss-name-tip" data-bosskey="${m.key}">⚔️ ${m.boss.emoji} ${m.boss.name}</span> <span class="pill">Lv ${m.boss.lvl}</span></div>
          <div class="muted">${m.boss.desc}</div>
        </div>
        <button class="boss-btn ${canBoss?'epic':''}" data-action="boss" data-map="${m.key}" ${canBoss?'':'disabled'}>${bossText}</button>
      </div>`;
    div.innerHTML = html;
    // BOSS名字hover显示技能/被动
    const nameEl = div.querySelector('.boss-name-tip');
    if (nameEl && m.boss.skills) {
      nameEl.style.cursor = 'help';
      const showBossTip = e => {
        let tip = '<b>'+m.boss.emoji+' '+m.boss.name+' Lv.'+m.boss.lvl+'</b>';
        if (m.boss.skills) {
          tip += '<div style=\"margin-top:3px;color:#fbbf24\">技能:</div>';
          m.boss.skills.forEach(s => {
            const tags = effectTags(s);
            tip += '<div>'+s.icon+' '+s.name+' — '+s.desc+' ('+(s.castTime||0)+'s读条)'+(tags.length?' <span style=\"color:#fbbf24;font-size:10px\">'+tags.join(' ')+'</span>':'')+'</div>';
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
        const tipEl = $('compare-tip');
        tipEl.querySelector('.compare-head').innerHTML = tip;
        tipEl.querySelector('.compare-body').innerHTML = '';
        tipEl.style.display = 'block';
        positionTip(tipEl, e);
      };
      nameEl.addEventListener('mouseenter', showBossTip);
      nameEl.addEventListener('mouseleave', () => { if (!_tipPinned) $('compare-tip').style.display = 'none'; });
      nameEl.addEventListener('mousemove', e => positionTip($('compare-tip'), e));
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
            ? {name:'🎁 必掉 Lv.'+m.boss.lvl+' 紫装 ×1',rarity:'epic',stats:{}}
            : {name:'🎁 必掉 Lv.'+m.boss.lvl+' 蓝装 ×1',rarity:'rare',stats:{}},
          isHighBoss
            ? {name:'🎉 15% 额外掉落 橙装 ×1',rarity:'legend',stats:{}}
            : {name:'🎉 15% 额外掉落 紫装 ×1',rarity:'epic',stats:{}},
          {name:'💎 钻石 ×3~8',rarity:'rare',stats:{}},
          {name:'📊 首次免费 · CD最高1小时 · CD中🎫跳过',rarity:'legend',stats:{}},
        ];
        showLootTip(e, bossDrops, `⚔️ ${m.boss.emoji} ${m.boss.name} 掉落`);
      };
      bossBtn.addEventListener('mouseenter', showBossLoot);
      bossBtn.addEventListener('mousemove', e => positionTip($('compare-tip'), e));
      addTouchPin(bossBtn, showBossLoot);
    }
    ml.appendChild(div);
  }
}

function roleTag(role){ return role==='tank'?'🛡️坦克':role==='heal'?'💚治疗':'⚔️输出'; }
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
  if (typeof BUFF_LABELS === 'object' && BUFF_LABELS[buff]?.name) return BUFF_LABELS[buff].name;
  if (typeof BUFF_FX === 'object' && BUFF_FX[buff]?.name) return BUFF_FX[buff].name;
  return buff;
}
function compBuffDesc(buff){
  if (!buff) return '';
  if (typeof BUFF_LABELS === 'object' && BUFF_LABELS[buff]?.desc) return BUFF_LABELS[buff].desc;
  if (typeof BUFF_FX === 'object' && BUFF_FX[buff]?.desc) return BUFF_FX[buff].desc;
  return '';
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
  const lines = [];
  if (sk.type === 'dmg' && sk.mul) lines.push(`${sk.mul}倍伤害`);
  if (sk.alwaysCrit) lines.push('本次必定暴击');
  if (sk.dot || sk.dotPct) lines.push(`每秒造成本次伤害的${compPct(sk.dotPct || 0.12)}%，持续${compSecs(sk.dotMs || 6000)}秒`);
  if (sk.slow) lines.push(`减速 ${compSecs(sk.slowMs || 4000)}秒`);
  if (sk.stun) lines.push(`击晕 ${compSecs(sk.stunMs || 1500)}秒`);
  if (sk.debuff === 'sunder' || /破甲/.test(sk.name || '')) lines.push(`破甲 ${compSecs(sk.sunderMs || 15000)}秒（目标防御降低30%）`);
  if (sk.stateKey) lines.push(`施加 ${compStateName(sk.stateKey)} ${compSecs(sk.stateMs || 9000)}秒`);
  if (sk.splashPct) lines.push(`对其他敌人溅射 ${compPct(sk.splashPct)}% 伤害`);
  if (sk.aoePct) lines.push(`额外波及其他敌人 ${compPct(sk.aoePct)}% 伤害`);
  if (sk.executeBonus) lines.push(`对 ${compPct(sk.executeThreshold || 0.35)}% 以下目标额外 +${compPct(sk.executeBonus)}% 伤害`);
  if (sk.bonusVsBoss) lines.push(`对Boss额外 +${compPct(sk.bonusVsBoss)}% 伤害`);
  if (sk.bonusVsDot) lines.push(`对持续伤害目标额外 +${compPct(sk.bonusVsDot)}% 伤害`);
  if (sk.bonusVsSlow) lines.push(`对减速目标额外 +${compPct(sk.bonusVsSlow)}% 伤害`);
  if (sk.bonusVsSunder) lines.push(`对破甲目标额外 +${compPct(sk.bonusVsSunder)}% 伤害`);
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
  const mode = sk._signature ? (sk.mode === 'passive' ? '专属被动' : '专属主动') : (sk.type === 'buff' ? '辅助技能' : sk.type === 'heal' ? '治疗技能' : '伤害技能');
  const cdText = sk.mode === 'passive' ? mode : `${mode} · 冷却 ${sk.cd || 8}秒`;
  return `<b>${sk.icon || '✨'} ${sk.name}</b><div>${sk.desc || ''}</div>${lines.map(x=>`<div class="muted">${x}</div>`).join('')}<div class="muted">${cdText}</div>`;
}
/* 随从技能 → 可悬浮小图标(指向看描述) */
function compSkillChips(tpl){
  const skills = ((tpl&&tpl.skills)||[]).slice();
  if (tpl?.signature) skills.push(Object.assign({_signature:true}, tpl.signature));
  return skills.map(s=>{
    const tip = companionSkillTipHtml(s).replace(/"/g,'&quot;');
    return `<span class="comp-skill${s._signature?' sig':''}" data-tip="${tip}">${s.icon}<span class="cs-name">${s.name}</span></span>`;
  }).join('');
}
function renderCompanion() {
  $('gem-cost').textContent = '(消耗1🐾随从券,稀有度越高越罕见)';
  const cl = $('companion-list');
  const owned = state.companions.length;
  const bonds = (typeof activeCompanionBonds==='function') ? activeCompanionBonds() : [];
  let html = '';

  // ---- 收藏 / 羁绊概览 ----
  html += `<div class="ascend-box">
    <div style="font-weight:bold">🐾 随从收藏 <span class="muted" style="font-size:11px">${owned}/${COMPANIONS.length}</span></div>
    <div class="muted" style="font-size:10px;margin-top:2px">收藏被动: 每随从 +0.05%攻击 / +0.08%生命 (当前 +${Math.min(owned*0.05,1.2).toFixed(2)}% / +${Math.min(owned*0.08,1.8).toFixed(2)}%)</div>`;
  if (typeof COMPANION_BONDS!=='undefined' && COMPANION_BONDS.length) {
    html += `<div class="detail-label" style="margin-top:6px">⚜️ 羁绊</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:2px">`;
    for (const b of COMPANION_BONDS) {
      const on = bonds.includes(b);
      const modTxt = Object.entries(b.mod).map(([k,v])=>(typeof fmtMod==='function')?fmtMod(k,v):k+'+'+v).join(' ');
      html += `<div class="muted" style="font-size:10px;opacity:${on?1:0.45}" title="${b.desc}">${on?'✅':'🔒'} ${b.name}: ${modTxt}</div>`;
    }
    html += `</div>`;
  }
  html += `</div>`;

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
    html += `<div class="shop-item" style="border-color:var(--${q.cls==='r-legend'?'legend':q.cls==='r-epic'?'epic':'border'})">
      <div class="row"><b>${tpl?.emoji} ${tpl?.name}</b><span class="pill" style="background:var(--accent);color:#000">出战中</span></div>
      <div class="muted"><span class="${q.cls}">${q.name}</span> · ${'⭐'.repeat(act.stars||1)} · ${roleTag(tpl?.role)}</div>
      <div class="muted" style="font-size:10px">参战属性: 攻${fmt(st?.atk||0)} 防${fmt(st?.def||0)} 血${fmt(st?.hpMax||0)}</div>
      <div class="muted" style="font-size:10px;color:#6ee7b7">专属加成: ${ownTxt||'无'}</div>
      <div class="muted" style="font-size:10px;color:#93c5fd">定位加成: ${roleTxt||'无'}</div>
      ${tpl?.signature?`<div class="muted" style="font-size:10px;color:#fcd34d">专属技: ${tpl.signature.icon||'✨'} ${tpl.signature.name}${tpl.signature.mode==='passive'?' [被动]':''}</div>`:''}
      <div class="comp-skills">${compSkillChips(tpl)}</div>
      <button class="danger" data-action="unequipcomp" style="margin-top:4px">休息</button>
    </div>`;
  }

  // ---- 已拥有随从(按品质降序)----
  const qOrder = {orange:0,purple:1,blue:2,green:3,white:4};
  const ownedList = state.companions.map((c,i)=>({c,i,tpl:COMPANIONS.find(t=>t.key===c.key)})).filter(x=>x.tpl);
  ownedList.sort((a,b)=>(qOrder[compQuality(a.tpl).key]-qOrder[compQuality(b.tpl).key])||((b.c.stars||1)-(a.c.stars||1)));
  for (const {c,i,tpl} of ownedList) {
    if (act && i===state.activeCompanion) continue;
    const q = compQuality(tpl);
    const cost = getUpgradeCost(c);
    const canUp = !cost.maxed && cost.have>=cost.need;
    const skillCount = (tpl.skills?.length||0) + (tpl.signature && tpl.signature.mode !== 'passive' ? 1 : 0);
    html += `<div class="shop-item">
      <div class="row"><b>${tpl.emoji} ${tpl.name}</b><span class="${q.cls}">${q.name}·${skillCount}技</span></div>
      <div class="muted" style="font-size:10px">${'⭐'.repeat(c.stars||1)} · ${roleTag(tpl.role)} · ${tpl.desc}</div>
      ${tpl.signature?`<div class="muted" style="font-size:10px;color:#fcd34d">专属技: ${tpl.signature.icon||'✨'} ${tpl.signature.name}${tpl.signature.mode==='passive'?' [被动]':''}</div>`:''}
      <div class="comp-skills">${compSkillChips(tpl)}</div>
      <div class="row">
        <span class="muted" style="font-size:10px">碎片 ${cost.have}${cost.maxed?'':' / 升星需'+cost.need}</span>
        <div style="display:flex;gap:3px">
          <button class="primary" data-action="usecomp" data-idx="${i}">出战</button>
          <button class="gold" data-action="upgradecomp" data-idx="${i}" ${canUp?'':'disabled'}>${cost.maxed?'满星 ⭐5':'升星 '+(c.stars||1)+'/5'}</button>
        </div>
      </div>
    </div>`;
  }

  // ---- 图鉴:未获得(灰色)----
  const ownedKeys = new Set(state.companions.map(c=>c.key));
  const missing = COMPANIONS.filter(t=>!ownedKeys.has(t.key));
  if (missing.length) {
    missing.sort((a,b)=>qOrder[compQuality(a).key]-qOrder[compQuality(b).key]);
    html += `<div class="detail-label" style="margin-top:6px">📖 未获得 (${missing.length})</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px">`;
    for (const t of missing) {
      const q = compQuality(t);
      html += `<div title="${t.name} · ${q.name} · ${roleTag(t.role)} · ${t.desc}" style="opacity:.55;border:1px solid var(--border);border-left:3px solid var(--${q.cls==='r-legend'?'legend':q.cls==='r-epic'?'epic':'border'});border-radius:6px;padding:3px 5px;font-size:11px">
        ${t.emoji} <span class="${q.cls}">${t.name}</span></div>`;
    }
    html += `</div>`;
  }

  if (owned===0 && missing.length===COMPANIONS.length) {
    html += '<div class="muted" style="text-align:center;padding:14px">还没有随从,点击「抽随从」获取!</div>';
  }
  cl.innerHTML = html;
}

let dgFilter = 'all'; // 'all' | '5man' | 'raid'
function renderDungeon() {
  const dl = $('dungeon-list');
  dl.innerHTML = '';
  // 更新按钮状态
  const btn5 = $('btn-dg-5man'), btnR = $('btn-dg-raid');
  if (btn5) { btn5.classList.toggle('active', dgFilter === 'all' || dgFilter === '5man'); }
  if (btnR) { btnR.classList.toggle('active', dgFilter === 'all' || dgFilter === 'raid'); }
  const sortedDungeons = [...DUNGEONS].sort((a, b) => {
    const hl = state.hero.lvl;
    const aDist = hl >= a.reqLvl ? hl - a.reqLvl : (a.reqLvl - hl) * 2;
    const bDist = hl >= b.reqLvl ? hl - b.reqLvl : (b.reqLvl - hl) * 2;
    return aDist - bDist;
  }).filter(dg => {
    if (dgFilter === '5man') return dg.type !== 'raid';
    if (dgFilter === 'raid') return dg.type === 'raid';
    return true;
  });
  for (const dg of sortedDungeons) {
    const cdEnd = state.dungeonCd[dg.key] || 0;
    const cdLeft = Math.max(0, Math.ceil((cdEnd - Date.now()) / 1000));
    const onCd = cdLeft > 0;
    const lvlOk = state.hero.lvl >= dg.reqLvl;
    const canFree = lvlOk && !onCd && state.mode === 'world';
    const canTicket = lvlOk && onCd && state.tickets >= 1 && state.mode === 'world';
    const canEnter = canFree || canTicket;
    const statusText = !lvlOk ? '等级不足'
      : onCd ? `CD ${fmtCd(cdLeft)}${canTicket ? ' · 🎫跳过' : ''}`
      : '可挑战(免费)';
    const btnText = canFree ? '免费进入' : (canTicket ? '🎫进入' : '进入');
    const div = document.createElement('div');
    div.className = 'dungeon-item';
    div.dataset.dungeonKey = dg.key;
    div.innerHTML = `
      <div class="row">
        <span><span class="icon">${dg.icon}</span> <b>${dg.name}</b></span>
        <span class="pill">Lv.${dg.reqLvl}</span>
      </div>
      <div class="muted">${dg.type==='raid'?'<span style=\"color:#fbbf24\">[团本]</span> ':'<span style=\"color:#6ee7b7\">[5人本]</span> '}${dg.desc} · ${(dg.bosses||[]).length}个BOSS · 最终: ${((dg.bosses||[])[dg.bosses.length-1]||{}).name||'??'}${dg.type==='raid'?' · 掉落:紫装/最终橙':''}</div>
      <div class="row">
        <span class="cd-display">${statusText}</span>
        <button class="enter-btn ${canEnter?'epic':''}" data-action="enterdungeon" data-key="${dg.key}" ${canEnter?'':'disabled'}>${btnText}</button>
      </div>`;
    // 副本hover掉落预览 - 按BOSS分组展示
    const showDungeonLoot = e => {
      const loot = DUNGEON_LOOT[dg.key];
      const power = dg.reqLvl + 5;
      const isRaid = dg.type === 'raid';
      const lastBossName = (dg.bosses||[])[(dg.bosses||[]).length-1]?.name;
      let html = `<div style=\"font-weight:bold;margin-bottom:4px\">${dg.icon} ${dg.name} (${(dg.bosses||[]).length}BOSS)${isRaid?' <span style=\"color:#a335ee\">[紫装]</span>':''}</div>`;
      if (loot?.bosses) {
        for (const bossData of (dg.bosses||[])) {
          const bossName = bossData.name;
          const items = (typeof getDungeonBossLoot === 'function')
            ? getDungeonBossLoot(dg.key, bossName)
            : loot.bosses[bossName];
          if (!items?.length) continue;
          const isFinal = bossName === lastBossName;
          const skillInfo=bossData?.skills?bossData.skills.map(s=>{
            const t=effectTags(s);
            return s.icon+s.name+(t.length?'['+t.join('')+']':'')+'('+s.desc+','+(s.castTime||0)+'s)';
          }).join(' · '):'';
          const dropLabel = isRaid ? (isFinal ? '(必紫+8%橙)' : '(必紫)') : '(必掉1件)';
          html += `<div style=\"margin-top:4px;color:var(--legend);font-size:11px\">👑 ${bossName} ${dropLabel}${skillInfo?' · '+skillInfo:''}</div>`;
          const tw = items.reduce((s,it)=>s+(RARITY.find(r=>r.key===it.rarity)?.weight||1),0);
          for (const it of items) {
            let displayRarity = it.rarity;
            if (isRaid && (displayRarity === 'common' || displayRarity === 'uncommon')) displayRarity = 'rare';
            if (isRaid && displayRarity === 'rare') displayRarity = 'epic';
            const r = RARITY.find(r=>r.key===displayRarity);
            const itemRate = Math.round((RARITY.find(r2=>r2.key===it.rarity)?.weight||1)/tw*100);
            const scaledStats = scaleLootStats(it.stats||{}, displayRarity, power);
            const statsText = Object.entries(scaledStats).map(([k,v])=>fmtMod(k, v)).join(' ');
            html += `<div class=\"${r?.cls||''}\" style=\"font-size:10px;margin:0 0 0 8px\">${r?.name?.[0]||'?'} ${it.name} ${itemRate}% <span style=\"opacity:.5\">${statsText}</span></div>`;
          }
        }
      }
      if (loot?.trash?.length) {
        html += `<div style=\"margin-top:4px;color:var(--muted);font-size:10px\">杂兵掉落 (35%掉率): ${loot.trash.map(it=>it.name).join(', ')}</div>`;
      }
      if (!loot) {
        html += '<div class=\"muted\">' + (isRaid ? '团本紫装掉落池' : '通用掉落池') + '</div>';
      }
      const tip = $('compare-tip');
      tip.querySelector('.compare-head').innerHTML = html;
      tip.querySelector('.compare-body').innerHTML = '';
      tip.style.display = 'block';
      positionTip(tip, e);
    };
    div.addEventListener('mouseenter', showDungeonLoot);
    div.addEventListener('mouseleave', () => { if (!_tipPinned) $('compare-tip').style.display = 'none'; });
    div.addEventListener('mousemove', e => positionTip($('compare-tip'), e));
    addTouchPin(div, showDungeonLoot);
    dl.appendChild(div);
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
    const bLvlOk = state.hero.lvl >= m.boss.lvl - 5;
    const bCanFree = bLvlOk && !bOnCd && state.mode === 'world';
    const bCanTicket = bLvlOk && bOnCd && state.tickets >= 1 && state.mode === 'world';
    const canBoss = bCanFree || bCanTicket;
    const newText = !bLvlOk ? '等级不足'
      : (!bOnCd ? '挑战(免费)'
      : (bCanTicket ? `🎫挑战 (CD ${fmtCd(bCdLeft)})` : `CD ${fmtCd(bCdLeft)}`));
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
    const lvlOk = state.hero.lvl >= dg.reqLvl;
    const canFree = lvlOk && !onCd && state.mode === 'world';
    const canTicket = lvlOk && onCd && state.tickets >= 1 && state.mode === 'world';
    const canEnter = canFree || canTicket;
    const statusText = !lvlOk ? '等级不足'
      : onCd ? `CD ${fmtCd(cdLeft)}${canTicket ? ' · 🎫跳过' : ''}`
      : '可挑战(免费)';
    const btnText = canFree ? '免费进入' : (canTicket ? '🎫进入' : '进入');
    if (cdSpan && cdSpan.textContent !== statusText) cdSpan.textContent = statusText;
    if (btn.textContent !== btnText) btn.textContent = btnText;
    btn.disabled = !canEnter;
    btn.classList.toggle('epic', canEnter);
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
  if (isDirty('stage'))     { clearDirty('stage'); /* stage 信息已在 updateBattleVisuals 处理 */ }
}

/* 全局点击关闭已固定的 tooltip(触屏场景) */
document.addEventListener('click', e => {
  if (!_tipPinned || !_tipPinnedOwner) return;
  if (!_tipPinnedOwner.contains(e.target)) {
    unpinTip();
  }
});
