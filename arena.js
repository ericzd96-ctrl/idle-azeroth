/* =========================================================
   arena.js — 竞技场(PvP 段位 + 荣誉商店)
   ----------------------------------------------------------
   设计目标:为原本只进不出的 🏅荣誉 提供消耗出口,并新增一条
   "越强越能往上爬"的段位成长线。
   规则:
   - 每角色独立: state.arena = { rating, best, wins, losses, streak,
       dailyMatches, dailyResetAt, vendor:{key:lvl}, opp }
   - 排位赛: 每天 15 场(跨天重置)。胜负由战力对比即时模拟(ELO 式),
     不进入实时战斗模式,因此不触碰 spawnMonster/onHeroDeath 等钩子。
   - 对手战力随段位绝对增长(rivalPower 单调递增),角色越强 → 平衡点
     段位越高,自然形成软上限并随其它系统变强而抬升。
   - 段位被动: 达到某段位即获得该段位的固定属性加成 collectArenaMod()。
   - 荣誉商店: 用 🏅 购买可叠加的 PvP 强化(永久,per-char),作为荣誉主消耗。
   ========================================================= */

const ARENA_TIERS = [
  { key:'unranked', name:'未定级', icon:'🎗️', min:0,    mod:{} },
  { key:'bronze',   name:'青铜',   icon:'🥉', min:100,  mod:{atkPct:2, hpPct:2} },
  { key:'silver',   name:'白银',   icon:'🥈', min:300,  mod:{atkPct:4, hpPct:4} },
  { key:'gold',     name:'黄金',   icon:'🥇', min:600,  mod:{atkPct:6, hpPct:6, crit:2} },
  { key:'plat',     name:'铂金',   icon:'💠', min:1000, mod:{atkPct:8, hpPct:8, crit:3, critdPct:5} },
  { key:'diamond',  name:'钻石',   icon:'💎', min:1500, mod:{atkPct:10, hpPct:10, defPct:5, crit:4, critdPct:8, vers:3} },
  { key:'master',   name:'大师',   icon:'🏆', min:2100, mod:{atkPct:13, hpPct:13, defPct:8, crit:5, critdPct:10, vers:4} },
  { key:'glad',     name:'角斗士', icon:'⚔️', min:2700, mod:{atkPct:16, hpPct:16, defPct:10, crit:6, critdPct:14, vers:5, leech:3} },
];

/* 荣誉商店: 可叠加的 PvP 强化(per-char 永久) */
const ARENA_VENDOR = [
  { key:'wpn',  name:'PvP 武器精通', icon:'🗡️', desc:'+1% 攻击 / 级', stat:'atkPct',  per:1, max:20, baseCost:2000 },
  { key:'res',  name:'PvP 韧性',     icon:'🛡️', desc:'+1% 生命 / 级', stat:'hpPct',   per:1, max:20, baseCost:2000 },
  { key:'bul',  name:'PvP 壁垒',     icon:'🧱', desc:'+2% 防御 / 级', stat:'defPct',  per:2, max:10, baseCost:3000 },
  { key:'let',  name:'PvP 致命',     icon:'💥', desc:'+2% 暴伤 / 级', stat:'critdPct',per:2, max:15, baseCost:2500 },
  { key:'ver',  name:'PvP 全能',     icon:'✴️', desc:'+1 全能 / 级',  stat:'vers',    per:1, max:10, baseCost:4000 },
];
const ARENA_DAILY_MATCHES = 15;

/* 对手姓名风味池 */
const ARENA_RIVALS = [
  {n:'血吼',icon:'👹'},{n:'夜刃',icon:'🐯'},{n:'霜语',icon:'🧙'},{n:'铁拳',icon:'🛡️'},
  {n:'影舞',icon:'🗡️'},{n:'圣锤',icon:'🔨'},{n:'毒牙',icon:'🐍'},{n:'雷怒',icon:'⚡'},
  {n:'寒星',icon:'❄️'},{n:'血誓',icon:'🩸'},{n:'灰烬',icon:'🔥'},{n:'风行',icon:'🏹'},
  {n:'破晓',icon:'🌅'},{n:'噬魂',icon:'💀'},{n:'狮心',icon:'🦁'},{n:'蛮王',icon:'🪓'},
];

/* ---------- 状态 ---------- */
function ensureArenaState() {
  if (!state.arena) {
    state.arena = { rating:0, best:0, wins:0, losses:0, streak:0,
                    dailyMatches:0, dailyResetAt:0, vendor:{}, opp:null };
  }
  const a = state.arena;
  if (typeof a.rating !== 'number') a.rating = 0;
  if (typeof a.best !== 'number') a.best = a.rating;
  if (typeof a.wins !== 'number') a.wins = 0;
  if (typeof a.losses !== 'number') a.losses = 0;
  if (typeof a.streak !== 'number') a.streak = 0;
  if (typeof a.dailyMatches !== 'number') a.dailyMatches = 0;
  if (typeof a.dailyResetAt !== 'number') a.dailyResetAt = 0;
  if (!a.vendor) a.vendor = {};
  checkArenaRollover();
  if (!a.opp) arenaRollOpponent();
}

function checkArenaRollover() {
  const a = state.arena; if (!a) return;
  const now = Date.now();
  if (!a.dailyResetAt || now >= a.dailyResetAt) {
    a.dailyMatches = 0;
    a.dailyResetAt = (typeof nextDayResetTs === 'function')
      ? nextDayResetTs()
      : (function(){ const d=new Date(); d.setHours(0,0,0,0); return d.getTime()+24*3600*1000; })();
  }
}

/* ---------- 战力 / 对手 ---------- */
function arenaHeroPower() {
  const h = state.hero || {};
  const critMult = 1 + (Math.min(h.crit||0,90)/100) * (((h.critd||150)-100)/100);
  let p = (h.atk||1) * critMult * (h.spd||1);
  p += (h.hpMax||0) * 0.08 + (h.def||0) * 1.5;
  p *= 1 + (h.vers||0)/100 + (h.leech||0)/200 + (h.mastery||0)/300;
  return Math.max(1, p);
}

/* 对手绝对战力随段位单调增长(平衡点 ≈ 角色战力对应段位) */
function arenaRivalPower(rating) {
  return 0.13 * Math.pow(Math.max(0, rating) + 100, 1.3);
}

function arenaRollOpponent() {
  const a = state.arena;
  const r = ARENA_RIVALS[rng(0, ARENA_RIVALS.length-1)];
  const oppRating = Math.max(0, a.rating + rng(-40, 120));
  a.opp = { name:r.n, icon:r.icon, rating:oppRating, power:arenaRivalPower(oppRating) };
}

function arenaWinChance() {
  const a = state.arena; if (!a || !a.opp) return 0.5;
  const hp = arenaHeroPower();
  return Math.max(0.05, Math.min(0.95, hp / (hp + a.opp.power)));
}

function arenaTierFor(rating) {
  let t = ARENA_TIERS[0];
  for (const x of ARENA_TIERS) if (rating >= x.min) t = x;
  return t;
}
function arenaCurrentTier() { ensureArenaState(); return arenaTierFor(state.arena.rating); }

/* ---------- 比赛 ---------- */
function arenaFight(ranked) {
  ensureArenaState();
  const a = state.arena;
  if (ranked && a.dailyMatches >= ARENA_DAILY_MATCHES) {
    log('⚔️ 今日排位赛次数已用完,明日再战', 'bad');
    return;
  }
  const opp = a.opp;
  const wc = arenaWinChance();
  const win = Math.random() < wc;
  const heroPow = arenaHeroPower();
  const oppSnap = { icon: opp.icon, name: opp.name, rating: opp.rating, power: opp.power };
  let ratingDelta = 0, honorGained = 0, tierUpTxt = '';

  if (ranked) {
    a.dailyMatches += 1;
    const K = 24;
    if (win) {
      const delta = Math.max(1, Math.round(K * (1 - wc)));
      const before = arenaCurrentTier();
      a.rating += delta;
      a.wins += 1; a.streak = Math.max(1, a.streak + 1);
      if (a.rating > a.best) a.best = a.rating;
      const honor = 50 + Math.floor(a.rating / 5) + (a.streak >= 3 ? 30 : 0);
      state.honor += honor;
      ratingDelta = delta; honorGained = honor;
      log(`🏟️ 排位胜利!击败 ${opp.icon}${opp.name}(评分${opp.rating}) 评分+${delta}→${a.rating} · +${honor}🏅`, 'good');
      const after = arenaTierFor(a.rating);
      if (after.key !== before.key && after.min > before.min) {
        tierUpTxt = `🎖️ 晋级【${after.icon}${after.name}】段位!`;
        log(`${tierUpTxt}获得新的 PvP 被动加成`, 'legend');
        recomputeStats();
      }
    } else {
      const delta = Math.max(1, Math.round(K * wc));
      a.rating = Math.max(0, a.rating - delta);
      a.losses += 1; a.streak = Math.min(0, a.streak - 1);
      state.honor += 10;
      ratingDelta = -delta; honorGained = 10;
      log(`🏟️ 排位失利…不敌 ${opp.icon}${opp.name}(评分${opp.rating}) 评分-${delta}→${a.rating} · +10🏅`, 'bad');
      const after = arenaTierFor(a.rating);
      const before = arenaTierFor(a.rating + delta);
      if (after.key !== before.key) recomputeStats();
    }
  } else {
    // 切磋:不计评分,微量荣誉
    if (win) { a.wins += 1; state.honor += 5; honorGained = 5; log(`🤺 切磋胜:战胜 ${opp.icon}${opp.name} · +5🏅`, 'good'); }
    else     { a.losses += 1; log(`🤺 切磋负:惜败 ${opp.icon}${opp.name}`, 'info'); }
  }

  arenaShowResult({ ranked, win, heroPow, opp: oppSnap, ratingDelta, ratingAfter: a.rating, honorGained, tierUpTxt });
  arenaRollOpponent();
  markDirty('arena', 'hero');
}

/* ---------- 结果弹窗(轻量战斗演出) ---------- */
let _arenaAnim = null;
function arenaShowResult(r) {
  const root = $('modal-arena-result'); if (!root) return;
  const c = (typeof getCls === 'function') ? getCls() : null;
  $('arena-res-hero-emoji').textContent = (c && c.emoji) || '🧙';
  $('arena-res-hero-name').textContent = state.name || '你';
  $('arena-res-hero-pow').textContent = '战力 ' + fmt(r.heroPow);
  $('arena-res-opp-emoji').textContent = r.opp.icon;
  $('arena-res-opp-name').textContent = r.opp.name;
  $('arena-res-opp-pow').textContent = '战力 ' + fmt(r.opp.power) + ' · 评分' + r.opp.rating;

  const title = $('arena-res-title');
  title.textContent = r.ranked ? (r.win ? '🏟️ 排位胜利!' : '🏟️ 排位失利…') : (r.win ? '🤺 切磋获胜' : '🤺 切磋落败');
  title.style.color = r.win ? '#1eff00' : '#ef4444';

  const rewardEl = $('arena-res-reward');
  let html = '';
  if (r.ranked) {
    const sign = r.ratingDelta >= 0 ? '+' : '';
    html += `<div>评分 <b style="color:${r.ratingDelta >= 0 ? '#1eff00' : '#ef4444'}">${sign}${r.ratingDelta}</b> → <b>${r.ratingAfter}</b></div>`;
    html += `<div>荣誉 +${r.honorGained}🏅</div>`;
    if (r.tierUpTxt) html += `<div style="color:var(--legend)">${r.tierUpTxt}</div>`;
  } else {
    html = r.honorGained ? `<div>荣誉 +${r.honorGained}🏅</div>` : `<div class="muted">切磋不计评分</div>`;
  }
  rewardEl.innerHTML = html;
  rewardEl.style.visibility = 'hidden';
  $('arena-res-close').style.visibility = 'hidden';

  // 血条演出:胜者残血由战力差决定,败者归零
  const heroBar = $('arena-res-hero-bar'), oppBar = $('arena-res-opp-bar');
  const margin = Math.min(1, Math.abs(r.heroPow - r.opp.power) / (r.heroPow + r.opp.power));
  const winnerRemain = Math.round(20 + margin * 60);   // 20~80
  const heroFinal = r.win ? winnerRemain : 0;
  const oppFinal = r.win ? 0 : winnerRemain;
  heroBar.style.width = '100%'; oppBar.style.width = '100%';
  root.classList.add('show');

  if (_arenaAnim) clearInterval(_arenaAnim);
  const steps = 18; let step = 0;
  _arenaAnim = setInterval(() => {
    step++;
    const t = step / steps;
    heroBar.style.width = Math.max(0, 100 + (heroFinal - 100) * t) + '%';
    oppBar.style.width = Math.max(0, 100 + (oppFinal - 100) * t) + '%';
    if (step >= steps) {
      clearInterval(_arenaAnim); _arenaAnim = null;
      rewardEl.style.visibility = 'visible';
      $('arena-res-close').style.visibility = 'visible';
    }
  }, 55);
}

/* ---------- 荣誉商店 ---------- */
function arenaVendorCost(item, curLvl) {
  return item.baseCost * (curLvl + 1);
}
function arenaBuy(key) {
  ensureArenaState();
  const item = ARENA_VENDOR.find(x => x.key === key); if (!item) return;
  const a = state.arena;
  const cur = a.vendor[key] || 0;
  if (cur >= item.max) { log('已达上限', 'bad'); return; }
  const cost = arenaVendorCost(item, cur);
  if (state.honor < cost) { log(`荣誉不足(需 ${cost}🏅)`, 'bad'); return; }
  state.honor -= cost;
  a.vendor[key] = cur + 1;
  log(`🛒 购买【${item.name}】Lv.${cur+1} · -${cost}🏅`, 'good');
  recomputeStats();
  markDirty('arena', 'hero');
}

/* ---------- 加成(接入 combat.recomputeStats) ---------- */
function collectArenaMod() {
  const out = { atkPct:0, hpPct:0, defPct:0, spdPct:0, critdPct:0,
                crit:0, leech:0, vers:0, mastery:0,
                xpMult:0, goldMult:0, dropMult:0 };
  if (!state || !state.arena) return out;
  // 段位被动
  const tier = arenaTierFor(state.arena.rating);
  for (const [k, v] of Object.entries(tier.mod || {})) out[k] = (out[k]||0) + v;
  // 荣誉商店强化
  for (const item of ARENA_VENDOR) {
    const lv = state.arena.vendor[item.key] || 0;
    if (lv > 0) out[item.stat] = (out[item.stat]||0) + lv * item.per;
  }
  return out;
}

/* ---------- 渲染 ---------- */
function renderArena() {
  const root = $('tab-arena'); if (!root) return;
  ensureArenaState();
  const a = state.arena;
  const tier = arenaTierFor(a.rating);
  const nextTier = ARENA_TIERS.find(t => t.min > a.rating);
  const wc = arenaWinChance();
  const total = a.wins + a.losses;
  const winRate = total > 0 ? Math.round(a.wins / total * 100) : 0;
  const matchesLeft = ARENA_DAILY_MATCHES - a.dailyMatches;

  const modTxt = Object.entries(tier.mod || {}).map(([k,v]) =>
    (typeof fmtMod==='function') ? fmtMod(k,v) : k+'+'+v).join(' · ') || '无';

  let html = `<div class="ascend-box">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div style="font-weight:bold">🏟️ 竞技场 <span class="muted" style="font-size:11px">(每角色独立)</span></div>
      <div style="font-size:22px">${tier.icon}</div>
    </div>
    <div style="display:flex;align-items:baseline;gap:8px;margin:4px 0">
      <span style="font-size:20px;font-weight:bold;color:var(--accent)">${tier.name}</span>
      <span class="muted">评分 <b style="color:var(--text)">${a.rating}</b> · 最高 ${a.best}</span>
    </div>`;
  if (nextTier) {
    const span = nextTier.min - tier.min;
    const cur = a.rating - tier.min;
    const pct = span > 0 ? Math.min(100, cur / span * 100) : 0;
    html += `<div class="bar xp" style="margin:4px 0"><i style="width:${pct}%"></i><span>距 ${nextTier.icon}${nextTier.name} 还需 ${nextTier.min - a.rating}</span></div>`;
  } else {
    html += `<div class="muted" style="font-size:11px;margin:4px 0">已达最高段位 ⚔️</div>`;
  }
  html += `<div class="muted" style="font-size:10px;margin-top:2px">段位被动: ${modTxt}</div>
    <div class="muted" style="font-size:11px;margin-top:4px">战绩 ${a.wins}胜 ${a.losses}负 (${winRate}%)${a.streak>=2?` · 🔥${a.streak}连胜`:''}</div>
  </div>`;

  // 对手
  const opp = a.opp;
  const wcPct = Math.round(wc * 100);
  const wcColor = wc >= 0.6 ? '#1eff00' : (wc >= 0.4 ? '#fbbf24' : '#ef4444');
  html += `<div class="ascend-box">
    <div class="detail-label">⚔️ 当前对手</div>
    <div style="display:flex;align-items:center;gap:10px;margin:4px 0">
      <div style="font-size:30px">${opp.icon}</div>
      <div style="flex:1">
        <div style="font-weight:bold">${opp.name}</div>
        <div class="muted" style="font-size:11px">评分 ${opp.rating}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:18px;font-weight:bold;color:${wcColor}">${wcPct}%</div>
        <div class="muted" style="font-size:10px">预估胜率</div>
      </div>
    </div>
    <div style="display:flex;gap:6px;margin-top:6px">
      <button class="gold" data-action="arenaRanked" ${matchesLeft<=0?'disabled':''} style="flex:2">⚔️ 排位赛 (${matchesLeft}/${ARENA_DAILY_MATCHES})</button>
      <button class="success" data-action="arenaSkirmish" style="flex:1">🤺 切磋</button>
      <button data-action="arenaReroll" title="更换对手">🔄</button>
    </div>
    <div class="muted" style="font-size:10px;margin-top:3px">你的战力评估: ${fmt(arenaHeroPower())}</div>
  </div>`;

  // 荣誉商店
  html += `<div class="ascend-box">
    <div class="detail-label">🛒 荣誉商店 <span class="muted" style="font-size:10px">(当前 ${fmt(state.honor)}🏅)</span></div>`;
  for (const item of ARENA_VENDOR) {
    const lv = a.vendor[item.key] || 0;
    const maxed = lv >= item.max;
    const cost = arenaVendorCost(item, lv);
    const afford = state.honor >= cost;
    html += `<div class="ascend-milestone ${lv>0?'reached':''}" style="padding:6px;margin-top:4px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
        <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0">
          <div style="font-size:20px">${item.icon}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:bold">${item.name} <span class="muted" style="font-size:10px">Lv.${lv}/${item.max}</span></div>
            <div class="muted" style="font-size:10px">${item.desc}</div>
          </div>
        </div>
        <button class="${afford&&!maxed?'gold':''}" data-action="arenaBuy" data-key="${item.key}" ${maxed||!afford?'disabled':''} style="white-space:nowrap;padding:4px 8px;font-size:11px">
          ${maxed ? '已满' : `${fmt(cost)}🏅`}
        </button>
      </div>
    </div>`;
  }
  html += `</div>`;

  // 段位表
  html += `<div class="ascend-box"><div class="detail-label">🏅 段位与被动一览</div>`;
  for (const t of ARENA_TIERS) {
    const reached = a.rating >= t.min;
    const isCur = t.key === tier.key;
    const tmod = Object.entries(t.mod||{}).map(([k,v]) => (typeof fmtMod==='function')?fmtMod(k,v):k+'+'+v).join(' · ') || '—';
    html += `<div style="display:flex;justify-content:space-between;gap:8px;padding:3px 0;opacity:${reached?1:0.5};${isCur?'font-weight:bold':''}">
      <span style="white-space:nowrap">${t.icon} ${t.name} <span class="muted" style="font-size:10px">${t.min}+</span></span>
      <span class="muted" style="font-size:10px;text-align:right">${tmod}</span>
    </div>`;
  }
  html += `</div>`;

  root.innerHTML = html;
}
