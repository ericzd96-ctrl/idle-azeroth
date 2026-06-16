/* =========================================================
   ascend.js — 觉醒/转生系统(终局循环)
   ----------------------------------------------------------
   规则:
   - Lv.80 满级可觉醒
   - 觉醒消耗大量金币(随次数指数递增),重置:
     * 角色等级回到 1, XP 清零
     * 5 维度属性点重置(只保留种族基础)
     * 天赋点清零, 天赋树清空(但专精选择保留)
   - 保留:
     * 装备(背包+穿戴)、宝石/精华
     * 成就达成/领取状态、永久属性
     * 图鉴击杀数、声望
     * 称号、赛季积分
   - 每次觉醒永久获得 1 点【光辉值】:
     * 每点 +1% 全属性 (str/agi/int/spi/sta 同时 +1%)
     * 每点 +1% 全维度伤害与生命
   - 每 5 点解锁一个里程碑词条
   ========================================================= */

const ASCEND_LEVEL_REQ = 80;

/* 觉醒消耗金币: base * 1.5^n */
function ascendCost(n) {
  return Math.floor(500000 * Math.pow(1.5, n));
}

/* 觉醒里程碑(每5/10级解锁一个特殊永久增益) */
const ASCEND_MILESTONES = [
  { lvl:1,  name:'初登仙途',  desc:'+1% 全属性 (基础)',              mod:{atkPct:1,hpPct:1,defPct:1} },
  { lvl:5,  name:'光辉乍现',  desc:'+10% 经验/金币加成',             mod:{xpMult:10, goldMult:10} },
  { lvl:10, name:'神性觉醒',  desc:'+10% 装备掉率, +5 精通',         mod:{dropMult:10, mastery:5} },
  { lvl:15, name:'圣光加持',  desc:'+20% 攻速, +5 精通',             mod:{spdPct:20, mastery:5} },
  { lvl:20, name:'神域之门',  desc:'+15% 攻击, +15% 生命',           mod:{atkPct:15, hpPct:15} },
  { lvl:25, name:'万象归一',  desc:'+15% 攻击, +15% 生命, +10 精通', mod:{atkPct:15,hpPct:15,mastery:10} },
  { lvl:30, name:'神格降世',  desc:'+30% 攻击/生命/防御',             mod:{atkPct:30,hpPct:30,defPct:30} },
  { lvl:40, name:'万古不朽',  desc:'触发觉醒大师专属称号',           title:'觉醒大师', mod:{atkPct:20,hpPct:20,defPct:20} },
  { lvl:50, name:'诸神黄昏',  desc:'终极称号 + 50% 全面提升',         title:'诸神黄昏', mod:{atkPct:50,hpPct:50,defPct:30,mastery:20} },
];

function ensureAscendState() {
  if (!account) account = defaultAccount();
  if (typeof account.ascendLvl !== 'number') account.ascendLvl = 0;
  if (typeof account.ascendCount !== 'number') account.ascendCount = 0;
  if (!account.ascendMilestones) account.ascendMilestones = {};
}

/* 光辉值带来的全局百分比(读 account) */
function ascendBonus() {
  ensureAscendState();
  const l = account.ascendLvl || 0;
  // 基础: 每点 +1% atk/hp/def
  const out = {
    atkPct: l * 1, hpPct: l * 1, defPct: l * 1,
    critdPct: 0, spdPct: 0, crit: 0, leech: 0, vers: 0, mastery: 0,
    xpMult: 0, goldMult: 0, dropMult: 0,
  };
  // 已解锁的里程碑叠加
  for (const m of ASCEND_MILESTONES) {
    if (l >= m.lvl) {
      for (const [k, v] of Object.entries(m.mod||{})) {
        out[k] = (out[k]||0) + v;
      }
    }
  }
  return out;
}

/* 执行觉醒 */
function doAscend() {
  ensureAscendState();
  if ((state.hero.lvl||0) < ASCEND_LEVEL_REQ) { log(`需要 Lv.${ASCEND_LEVEL_REQ} 才能觉醒`, 'bad'); return; }
  const cost = ascendCost(account.ascendCount||0);
  if (state.gold < cost) { log(`需要 ${fmt(cost)} 金币 (当前: ${fmt(state.gold)})`, 'bad'); return; }
  const mythicBonus = state.pendingMythicAscend || 0;
  const totalGain = 1 + mythicBonus;
  if (!confirm(`确定觉醒?
消耗: ${fmt(cost)} 💰
你将重置等级、属性点、天赋点和天赋树,
但保留装备、宝石、成就、声望、专精、称号。
基础光辉 +1${mythicBonus > 0 ? ` · 大秘境光辉 +${mythicBonus}` : ''} · 合计: +${totalGain} (${account.ascendLvl}→${account.ascendLvl+totalGain})`)) return;

  state.gold -= cost;
  account.ascendCount = (account.ascendCount||0) + 1;
  account.ascendLvl = (account.ascendLvl||0) + 1 + mythicBonus;
  if (mythicBonus > 0) log(`🌟 大秘境光辉 +${mythicBonus}! (累积结算)`, 'legend');
  state.pendingMythicAscend = 0;
  state.mythicSelectLevel = 1;

  // 重置进度
  state.hero.lvl = 1;
  state.hero.xp = 0;
  // 5 维度属性点重置
  state.attrs = { str:0, agi:0, int:0, spi:0, sta:0 };
  // 重新应用种族 bonus
  const r = (typeof RACES!=='undefined') ? RACES[state.race] : null;
  if (r && r.bonus) for (const [k, v] of Object.entries(r.bonus)) state.attrs[k] = (state.attrs[k]||0) + v;
  // 天赋点+树清空
  state.talentPoints = 0;
  state.talents = {};
  // 不解锁的技能要重新锁,选中栏过滤掉失效技能
  state.unlockedSkills = {};
  if (typeof checkSkillUnlocks === 'function') checkSkillUnlocks();
  state.selectedSkills = (state.selectedSkills||[]).filter(k => state.unlockedSkills[k]);
  state.skillCooldowns = {};
  // 解锁的里程碑提示(称号给账号)
  const milestone = ASCEND_MILESTONES.find(m => m.lvl === account.ascendLvl);
  if (milestone) {
    log(`🌟 觉醒达成 ${account.ascendLvl} 阶 - ${milestone.name}: ${milestone.desc}`, 'legend');
    if (milestone.title) {
      if (typeof unlockTitle === 'function') unlockTitle(milestone.title);
      else account.title = milestone.title;
    }
    account.ascendMilestones[account.ascendLvl] = true;
  } else {
    log(`🌟 觉醒 ${account.ascendLvl} 阶 (+1% 全属性)`, 'legend');
  }
  // 坐骑里程碑(觉醒级)
  if (typeof mountOnAscendLvl==='function') mountOnAscendLvl(account.ascendLvl);
  // 重算装备/觉醒/永久属性
  if (typeof recomputeStats==='function') recomputeStats();
  // 恢复满血满资源(此时 hpMax 已含装备/觉醒加成)
  state.hp = state.hero.hpMax;
  state.resource = state.resourceMax;
  if (typeof spawnMonster==='function') {
    state.mode='world';
    state.currentMap = state.faction==='horde'?'durotar':'elwynn';
    state.currentSubzone = 0;
    state.currentMonsters = [];
    spawnMonster();
  }
  markDirty('all');
  saveState();
}

/* 渲染 */
function renderAscend() {
  ensureAscendState();
  const root = $('tab-ascend'); if (!root) return;
  const l = account.ascendLvl || 0;
  const canAscend = (state.hero.lvl||0) >= ASCEND_LEVEL_REQ;
  const cost = ascendCost(account.ascendCount||0);
  const enoughGold = state.gold >= cost;

  const ml = state.mythicLevel || 1;
  const selLvl = state.mythicSelectLevel || 1;
  const pending = state.pendingMythicAscend || 0;
  const inMythic = state.mode === 'mythic';
  const atLv80 = state.hero.lvl >= 80;
  const canMythic = state.mode === 'world' && state.tickets >= 1 && atLv80;
  let html = `<div class="ascend-head">
    <div class="ascend-num">🌟 光辉值 <b>${l}</b> <span class="muted" style="font-size:11px">(账号共享)</span></div>
    <div class="muted" style="font-size:11px">已觉醒 ${account.ascendCount||0} 次${pending > 0 ? ` · 大秘境累积光辉 +${pending} (觉醒时获得)` : ''}</div>
  </div>`;

  // 大秘境入口
  const selScale = Math.pow(1.2, selLvl);
  const selAffixes = typeof getMythicAffixes === 'function' ? getMythicAffixes(selLvl) : [];
  const affixPreview = selAffixes.map(a =>
    `<span class="pill" style="background:rgba(239,68,68,0.12);color:#f87171;margin:1px;font-size:10px;cursor:help"
      onmouseenter="showAffixTip(event,'${a.icon} ${a.name}','${a.desc}')"
      onmouseleave="hideAffixTip()">${a.icon} ${a.name}</span>`
  ).join(' ');

  html += `<div class="ascend-box" style="border:1px solid var(--legend)">
    <div class="detail-label">🌟 大秘境 (最高纪录 +${ml})</div>`;
  if (!atLv80) {
    html += `<div class="muted" style="color:#f87171">需达到 Lv.80 才能进入大秘境</div>`;
  } else if (inMythic) {
    const ms = state.mythicState;
    const dg = ms ? DUNGEONS.find(d => d.key === ms.key) : null;
    html += `<div style="color:var(--legend);margin-bottom:4px">⚔️ 挑战中: ${dg ? dg.name : '??'} · 第${ms ? ms.wave : '?'}波 · +${ms ? ms.level : '?'}层</div>
      <button class="danger" onclick="leaveMythic()" style="width:100%;padding:8px">🚪 撤离大秘境</button>`;
  } else {
    html += `<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin:6px 0">
      <button data-action="mythicLevelDown" ${selLvl<=1?'disabled':''} style="padding:4px 10px;font-size:14px">-</button>
      <b style="font-size:16px;min-width:40px;text-align:center">+${selLvl}</b>
      <button data-action="mythicLevelUp" ${selLvl>=ml?'disabled':''} style="padding:4px 10px;font-size:14px">+</button>
    </div>
    <div class="muted" style="font-size:11px;margin-bottom:4px">怪物属性 ×${selScale.toFixed(1)} · 消耗1通用券</div>
    ${affixPreview ? `<div style="margin-bottom:6px;line-height:1.8">${affixPreview}</div>` : ''}
    <button class="legend" data-action="mythic" ${canMythic ? '' : 'disabled'} style="width:100%;padding:10px;font-weight:bold">
      🌟 进入大秘境 +${selLvl} (🎫1)
    </button>`;
  }
  html += '</div>';

  // 大秘境层数奖励阶梯
  if (typeof MYTHIC_TIER_REWARDS !== 'undefined') {
    const hasClaimed = state.mythicTiersClaimed && Object.keys(state.mythicTiersClaimed).length > 0;
    html += `<div class="ascend-box"><div class="detail-label">🏆 大秘境层数奖励
      ${hasClaimed ? `<button data-action="resetMythicTiers" style="float:right;font-size:10px;padding:2px 6px">重置领取记录</button>` : ''}
    </div>`;
    const tierEntries = Object.entries(MYTHIC_TIER_REWARDS).sort((a,b) => parseInt(a[0]) - parseInt(b[0]));
    for (const [lvl, reward] of tierEntries) {
      const lvlNum = parseInt(lvl);
      const claimed = state.mythicTiersClaimed && state.mythicTiersClaimed[lvlNum];
      const reached = (state.mythicLevel || 1) > lvlNum;
      // 兜底: 已领取但没有待领记录且该层有专属传说 → 自动补上
      if (claimed && reward.mod.uniqueLegend && !(state.mythicPendingUnique && state.mythicPendingUnique[lvlNum])) {
        if (!state.mythicPendingUnique) state.mythicPendingUnique = {};
        state.mythicPendingUnique[lvlNum] = reward.mod.uniqueLegend;
      }
      const pendingCount = (state.mythicPendingUnique && state.mythicPendingUnique[lvlNum]) || 0;
      const claimBtn = pendingCount > 0
        ? ` <button data-action="claimMythicUnique" data-level="${lvlNum}" style="padding:2px 8px;font-size:11px;background:var(--legend);color:#000;font-weight:bold">领取专属传说 ×${pendingCount}</button>`
        : '';
      html += `<div class="ascend-milestone ${claimed ? 'reached' : ''}">
        <div><b>层数 ${lvlNum} ${reward.name}</b> ${claimed ? '<span class="r-legend">✓</span>' : reached ? '<span class="r-epic">可挑战</span>' : '<span class="muted">🔒</span>'}${claimBtn}</div>
        <div class="muted" style="font-size:10px">${reward.desc}</div>
      </div>`;
    }
    html += '</div>';
  }

  // 大秘境专属传说预览
  if (typeof MYTHIC_UNIQUE_ITEMS !== 'undefined') {
    html += `<div class="ascend-box"><div class="detail-label">🌟 专属传说装备 (仅层数奖励获得)</div>
      <div class="muted" style="font-size:10px;margin-bottom:4px">以下装备仅能通过大秘境层数奖励获取,不会从其他地方掉落</div>`;
    for (const uit of MYTHIC_UNIQUE_ITEMS) {
      const statsStr = Object.entries(uit.stats).map(([k,v]) => fmtStatName(k)+'+'+v+(isPercentStat(k)?'%':'')).join(' ');
      html += `<div style="font-size:11px;padding:3px 0;border-bottom:1px dashed var(--border)">
        <span class="r-legend">${uit.name}</span>
        <span class="muted" style="font-size:10px"> ${SLOT_INFO[uit.slot]?.icon||''} ${SLOT_INFO[uit.slot]?.label||uit.slot}</span>
        <span class="muted" style="font-size:10px"> ${statsStr}</span>
      </div>`;
    }
    html += '</div>';
  }

  // 当前总加成
  const b = ascendBonus();
  const bonusLines = [];
  if (b.atkPct) bonusLines.push(`+${b.atkPct}% 攻击`);
  if (b.hpPct) bonusLines.push(`+${b.hpPct}% 生命`);
  if (b.defPct) bonusLines.push(`+${b.defPct}% 防御`);
  if (b.critdPct) bonusLines.push(`+${b.critdPct}% 暴伤`);
  if (b.spdPct) bonusLines.push(`+${b.spdPct}% 攻速`);
  if (b.crit) bonusLines.push(`+${b.crit}% 暴击`);
  if (b.leech) bonusLines.push(`+${b.leech}% 吸血`);
  if (b.vers) bonusLines.push(`+${b.vers}% 全能`);
  if (b.mastery) bonusLines.push(`+${b.mastery} 精通`);
  if (b.xpMult) bonusLines.push(`+${b.xpMult}% 经验`);
  if (b.goldMult) bonusLines.push(`+${b.goldMult}% 金币`);
  if (b.dropMult) bonusLines.push(`+${b.dropMult}% 装备掉率`);
  html += `<div class="ascend-box">
    <div class="detail-label">当前光辉加成</div>
    <div style="font-size:11px;line-height:1.7">${bonusLines.length?bonusLines.map(x=>`<span class="pill" style="background:rgba(251,191,36,0.15);color:var(--gold);margin:1px">${x}</span>`).join(''):'<span class="muted">尚未觉醒</span>'}</div>
  </div>`;

  // 觉醒按钮
  html += `<div class="ascend-box">
    <div class="detail-label">下一次觉醒</div>
    <div style="font-size:11px;color:var(--muted);margin-bottom:6px">
      ${canAscend ? `需要 <b style="color:${enoughGold?'var(--accent)':'#f87171'}">${fmt(cost)}</b> 💰` : `需要达到 Lv.${ASCEND_LEVEL_REQ} (当前 Lv.${state.hero.lvl})`}
    </div>
    <button class="${canAscend&&enoughGold?'legend':'muted'}" data-action="ascend" ${canAscend&&enoughGold?'':'disabled'} style="width:100%;padding:10px;font-weight:bold">
      🌟 觉醒 (+1 光辉值)
    </button>
    <div class="muted" style="font-size:10px;margin-top:6px">将重置: 等级 / 属性点 / 天赋 ; 保留: 装备 / 宝石 / 成就 / 声望 / 专精 / 称号</div>
  </div>`;

  // 里程碑
  html += `<div class="ascend-box"><div class="detail-label">里程碑解锁</div>`;
  for (const m of ASCEND_MILESTONES) {
    const reached = l >= m.lvl;
    const modTxt = Object.entries(m.mod||{}).map(([k,v])=>fmtMod(k, v)).join(' ');
    html += `<div class="ascend-milestone ${reached?'reached':''}">
      <div><b>Lv.${m.lvl} ${m.name}</b> ${reached?'<span class="r-legend">✓</span>':'<span class="muted">🔒</span>'}</div>
      <div class="muted" style="font-size:10px">${modTxt}${m.title?' · 称号「'+m.title+'」':''}</div>
    </div>`;
  }
  html += '</div>';

  root.innerHTML = html;
}

/* 接入 recomputeStats — 通过把ascend mod合并到talents-like累加 */
function collectAscendMod() {
  return ascendBonus();
}
