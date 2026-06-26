/* =========================================================
   dailyhub.js — 今日事务总览(只读聚合器,主屏 QoL)
   ----------------------------------------------------------
   痛点:任务/竞技/公会/黑市/远征 等系统各自每日刷新,玩家要逐个点 tab
        才知道"今天还有啥没做",容易漏、也焦虑。导航红点只说"哪个 tab 有事",
        没有一眼看全的清单。
   方案:把这些每日可做的事聚合成一行带状态的小药丸,渲染进地图页(主屏)
        #daily-hub,点击直达对应 tab。纯读现有状态,不持久化、不改数值。
   状态:'avail'(有事可做,高亮) / 'done'(✓ 已完成,绿) / 'progress'(进行中,灰)
   ========================================================= */

function collectDailyTasks() {
  const out = [];

  // 任务板
  if (typeof ensureQuestState === 'function') {
    const q = ensureQuestState();
    if (q) {
      const claimable = (typeof questHasClaimable === 'function') && questHasClaimable();
      const total = q.daily.length;
      const claimed = q.daily.filter(it => it.claimed).length;
      out.push({
        icon: '📋', name: '任务', tab: 'quests',
        status: claimable ? 'avail' : (total > 0 && claimed >= total ? 'done' : 'progress'),
        detail: claimable ? '可领奖' : `日常 ${claimed}/${total}`,
      });
    }
  }

  // 竞技场排位
  if (typeof ensureArenaState === 'function' && typeof ARENA_DAILY_MATCHES === 'number') {
    ensureArenaState();
    const left = ARENA_DAILY_MATCHES - (state.arena.dailyMatches || 0);
    out.push({
      icon: '🏟️', name: '竞技', tab: 'arena',
      status: left <= 0 ? 'done' : 'avail',
      detail: left <= 0 ? '已打满' : `剩 ${left} 场`,
    });
  }

  // 公会捐献
  if (typeof ensureGuildState === 'function' && typeof GUILD_DONATIONS !== 'undefined' && typeof account !== 'undefined' && account) {
    if (typeof guildRefreshDaily === 'function') guildRefreshDaily();
    const g = ensureGuildState();
    if (g) {
      const remaining = GUILD_DONATIONS.filter(d => !g.donatedKeys.includes(d.key));
      const affordable = remaining.some(d => Object.entries(d.cost).every(([r, a]) => (account[r] || 0) >= a));
      out.push({
        icon: '🏰', name: '公会', tab: 'guild',
        status: remaining.length === 0 ? 'done' : (affordable ? 'avail' : 'progress'),
        detail: remaining.length === 0 ? '今日已捐' : (affordable ? '可捐献' : '货币不足'),
      });
    }
  }

  // 轮换黑市
  if (typeof getMarketDeals === 'function' && typeof ensureMarketState === 'function') {
    const m = ensureMarketState();
    if (m) {
      const deals = getMarketDeals();
      const buyable = deals.filter(d => !m.bought.includes(d.key) && (typeof marketCanAfford === 'function') && marketCanAfford(d)).length;
      const unbought = deals.filter(d => !m.bought.includes(d.key)).length;
      out.push({
        icon: '🛒', name: '黑市', tab: 'market',
        status: buyable > 0 ? 'avail' : (unbought === 0 ? 'done' : 'progress'),
        detail: buyable > 0 ? `${buyable} 件可买` : (unbought === 0 ? '已扫空' : '货币不足'),
      });
    }
  }

  // 事件日常
  if (typeof ensureEventState === 'function') {
    ensureEventState();
    if (typeof checkDailyRollover === 'function') checkDailyRollover();
    const tasks = (state.daily && Array.isArray(state.daily.tasks)) ? state.daily.tasks : [];
    if (tasks.length) {
      const claimable = tasks.some(t => !t.claimed && t.cur >= t.goal);
      const claimed = tasks.filter(t => t.claimed).length;
      out.push({
        icon: '🎯', name: '日常', tab: 'events',
        status: claimable ? 'avail' : (claimed >= tasks.length ? 'done' : 'progress'),
        detail: claimable ? '可领奖' : `${claimed}/${tasks.length}`,
      });
    }
  }

  // 远征储备
  if (typeof expeditionStorageFull === 'function') {
    const full = expeditionStorageFull();
    out.push({
      icon: '🚩', name: '远征', tab: 'expedition',
      status: full ? 'avail' : 'progress',
      detail: full ? '储备满可领' : '产出中',
    });
  }

  // 生活订单
  if (typeof lifeReadyOrderCount === 'function' && state.life && state.life.orders) {
    const ready = lifeReadyOrderCount();
    const incomplete = (state.life.orders.slots || []).filter(o => !o.completed).length;
    out.push({
      icon: '🛠️', name: '生活', tab: 'life',
      status: incomplete === 0 ? 'done' : (ready > 0 ? 'avail' : 'progress'),
      detail: incomplete === 0 ? '已交付' : (ready > 0 ? `${ready} 单可交` : '材料不足'),
    });
  }

  return out;
}

function renderDailyHub() {
  const el = document.getElementById('daily-hub');
  if (!el || !state || !state.cls) return;
  const tasks = collectDailyTasks();
  if (!tasks.length) { el.innerHTML = ''; return; }

  const availCount = tasks.filter(t => t.status === 'avail').length;
  const COLOR = { avail: 'var(--accent)', done: '#22c55e', progress: 'var(--border)' };
  const TXT   = { avail: 'var(--accent)', done: '#86efac', progress: 'var(--muted)' };
  const MARK  = { avail: '●', done: '✓', progress: '…' };

  const pills = tasks.map(t => {
    const bd = COLOR[t.status], fg = TXT[t.status];
    return `<div data-goto="${t.tab}" title="前往 ${t.name}" style="display:flex;align-items:center;gap:5px;padding:3px 9px;border:1px solid ${bd};border-radius:999px;cursor:pointer;font-size:11px;white-space:nowrap;${t.status === 'avail' ? 'background:rgba(59,130,246,.10)' : ''}">
      <span style="font-size:13px">${t.icon}</span>
      <span style="color:${fg};font-weight:${t.status === 'avail' ? 'bold' : 'normal'}">${t.name}</span>
      <span style="color:${fg};opacity:.85">${MARK[t.status]} ${t.detail}</span>
    </div>`;
  }).join('');

  el.innerHTML = `<div style="border:1px solid var(--border);border-radius:10px;padding:7px 8px;margin-bottom:8px;background:rgba(255,255,255,.02)">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap">
      <span style="font-size:12px;font-weight:bold">📅 今日事务</span>
      <span class="muted" style="font-size:10px">${availCount > 0 ? `${availCount} 项可做` : '已全部清空 🎉'}</span>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">${pills}</div>
  </div>`;
}
