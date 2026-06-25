/* =========================================================
   leaderboard.js — 天梯/排行榜(只读,无新存档字段)
   ----------------------------------------------------------
   - 读现有最佳:无尽塔 state.tower.highest / 竞技场 state.arena.best /
     幻象 state.roguelike.highest(取账号下所有角色最大值)
   - 与一组固定的 NPC 对手同榜排名,给横向比较与刷分动力
   ========================================================= */

const LEADERBOARD_NPCS = {
  tower: [
    { n:'霜狼酋长·格罗玛什', s:9 }, { n:'大地之环·内拉里', s:17 }, { n:'夜歌森林·萨维斯', s:26 },
    { n:'灰烬使者·拉文凯斯', s:35 }, { n:'银月游侠·瑟雷迪斯', s:46 }, { n:'燃烧军团·阿克蒙德', s:60 },
    { n:'青铜龙王·诺兹多姆', s:76 }, { n:'翡翠梦境·伊瑟拉', s:97 }, { n:'灭世者·死亡之翼', s:130 },
  ],
  arena: [
    { n:'剑圣·萨穆罗', s:240 }, { n:'血法师·凯尔萨斯', s:450 }, { n:'狂战士·克罗玛古斯', s:680 },
    { n:'影舞者·玛维', s:920 }, { n:'圣骑士·提里奥', s:1180 }, { n:'大法师·吉安娜', s:1480 },
    { n:'死亡骑士·达里安', s:1820 }, { n:'恶魔猎手·伊利丹', s:2250 }, { n:'天命斗士·阿尔萨斯', s:2700 },
  ],
  roguelike: [
    { n:'幻象学徒·米莉安', s:7 }, { n:'幻象游侠·拉娜', s:12 }, { n:'幻象斗士·托加', s:16 },
    { n:'幻象法师·瓦内萨', s:20 }, { n:'幻象领主·扎库尔', s:24 }, { n:'幻象君王·奥拉基尔', s:27 },
    { n:'幻象征服者·克苏恩', s:29 }, { n:'幻象终结者·尤格', s:30 },
  ],
};

const LEADERBOARD_BOARDS = [
  { kind:'tower',     title:'⛰️ 无尽塔 · 最高层数',  unit:'层',  field:'tower',     prop:'highest', icon:'🪙' },
  { kind:'arena',     title:'⚔️ 竞技场 · 段位评分',  unit:'分',  field:'arena',     prop:'best',    icon:'🏆' },
  { kind:'roguelike', title:'🃏 幻象挑战 · 最深层数', unit:'层', field:'roguelike', prop:'highest', icon:'🤖' },
];

/* 账号下所有角色在该榜的最佳值 */
function lbAccountBest(board) {
  const cs = (typeof characters !== 'undefined' && Array.isArray(characters)) ? characters : [];
  let best = 0;
  for (const c of cs) {
    const sub = c && c[board.field];
    const v = sub ? (sub[board.prop] || 0) : 0;
    if (v > best) best = v;
  }
  // 当前 state 已在 characters 内,这里再兜底一次
  const cur = state && state[board.field] ? (state[board.field][board.prop] || 0) : 0;
  return Math.max(best, cur);
}

function lbMedal(rank) { return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '#' + rank; }

function renderLeaderboardBoard(board) {
  const best = lbAccountBest(board);
  const npcs = LEADERBOARD_NPCS[board.kind] || [];
  const entries = npcs.map(x => ({ name: x.n, score: x.s, me: false }));
  entries.push({ name: '你 · ' + (state.name || '冒险者'), score: best, me: true });
  entries.sort((a, b) => b.score - a.score || (a.me ? 1 : 0) - (b.me ? 1 : 0));
  const myRank = entries.findIndex(e => e.me) + 1;

  const rows = entries.map((e, i) => {
    const rank = i + 1;
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;border-radius:6px;margin-bottom:3px;${e.me ? 'background:rgba(59,130,246,.18);border:1px solid var(--accent)' : ''}">
      <div style="font-size:12px;${e.me ? 'font-weight:bold' : ''}"><span style="display:inline-block;min-width:30px;color:var(--muted)">${lbMedal(rank)}</span> ${e.me ? '⭐ ' : ''}${e.name}</div>
      <div style="font-size:12px;font-weight:bold">${fmt(e.score)} ${board.unit}</div>
    </div>`;
  }).join('');

  return `<div style="border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <div style="font-weight:bold;font-size:13px">${board.title}</div>
      <div class="muted" style="font-size:11px">我的排名 <b style="color:var(--accent)">#${myRank}</b> · 最佳 ${fmt(best)}${board.unit}</div>
    </div>
    ${rows}
  </div>`;
}

function renderLeaderboard() {
  const panel = document.getElementById('tab-leaderboard');
  if (!panel) return;
  let html = `<div style="margin-bottom:8px">
    <div style="font-weight:bold;font-size:15px">🏆 天梯排行榜</div>
    <div class="muted" style="font-size:11px;margin-top:2px">你的账号最佳成绩(所有角色取最高)与传奇对手同台竞技,刷新纪录就能超越他们。</div>
  </div>`;
  for (const board of LEADERBOARD_BOARDS) html += renderLeaderboardBoard(board);
  panel.innerHTML = html;
}
