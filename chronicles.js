/* =========================================================
   chronicles.js — 艾泽拉斯编年史
   ----------------------------------------------------------
   现为 7 卷、每卷 6 章的叙事收藏。通过全局进度解锁章节,领取资源与少量永久属性。
   ========================================================= */

const CHRONICLE_VOLUMES = [
  {
    key:'origins', title:'卷一: 冒险者的起点', icon:'📖', color:'#60a5fa',
    chapters:[
      ['first_steps','启程之页','抵达 Lv.10 后,编年史记下第一串足迹。',{type:'level',goal:10},{gold:8000,gem:8}],
      ['field_notes','野外手札','累计击杀 500 名敌人。',{type:'kills',goal:500},{gold:18000,essence:6}],
      ['named_foe','首领墨迹','击败 3 个地图首领。',{type:'mapBoss',goal:3},{gold:26000,honor:260}],
      ['first_dungeon','石门之后','累计通关 3 次副本。',{type:'dungeon',goal:3},{gold:36000,gem:12,tickets:1}],
      ['rising_name','初成名望','领取 8 个成就奖励。',{type:'achievement',goal:8},{gold:48000,gem:18,stat:{goldMult:2}}],
      ['first_volume','起点装订','账号最高等级达到 Lv.30。',{type:'level',goal:30},{gold:70000,gem:24,essence:14,stat:{hpPct:1}}],
    ],
  },
  {
    key:'kingdoms', title:'卷二: 王国与战旗', icon:'🏰', color:'#f59e0b',
    chapters:[
      ['banner_oath','战旗誓词','累计击杀 2500 名敌人。',{type:'kills',goal:2500},{gold:80000,honor:700}],
      ['many_bosses','诸王名册','击败 10 个地图首领。',{type:'mapBoss',goal:10},{gold:105000,gem:38,honor:900}],
      ['dungeon_routes','地城路线图','累计通关 12 次副本。',{type:'dungeon',goal:12},{gold:130000,essence:32,tickets:1}],
      ['stable_mark','马厩印记','收藏 6 只坐骑。',{type:'mount',goal:6},{gold:150000,gem:55,stat:{spdPct:1}}],
      ['reputation_script','声望契文','任意声望达到 10000。',{type:'anyRep',goal:10000},{gold:170000,honor:1600,essence:38}],
      ['kingdom_binding','王国装订','账号最高等级达到 Lv.50。',{type:'level',goal:50},{gold:220000,gem:80,stat:{atkPct:1,hpPct:1}}],
    ],
  },
  {
    key:'outland_north', title:'卷三: 远征与寒锋', icon:'❄️', color:'#38bdf8',
    chapters:[
      ['dark_portal','黑暗之门注记','账号最高等级达到 Lv.60。',{type:'level',goal:60},{gold:180000,gem:65,essence:35}],
      ['expedition_cache','远征补给账','累计通关 20 次副本。',{type:'dungeon',goal:20},{gold:220000,essence:55,tickets:2}],
      ['rare_margins','稀有边注','累计击败 10 次稀有精英。',{type:'rare',goal:10},{gold:240000,gem:90,honor:1800}],
      ['frozen_trials','寒锋试炼','累计击败 5 次世界Boss。',{type:'worldBoss',goal:5},{gold:260000,gem:100,essence:60}],
      ['northrend_repute','北地名望','诺森德声望达到 15000。',{type:'rep',faction:'诺森德',goal:15000},{gold:300000,honor:2600,stat:{defPct:1}}],
      ['frost_binding','寒锋装订','账号最高等级达到 Lv.70。',{type:'level',goal:70},{gold:360000,gem:120,stat:{atkPct:2}}],
    ],
  },
  {
    key:'endgame', title:'卷四: 终局讨伐录', icon:'🌌', color:'#a78bfa',
    chapters:[
      ['apex_hunt','巨物猎章','累计击败 15 次世界Boss。',{type:'worldBoss',goal:15},{gold:320000,gem:120,essence:80}],
      ['legendary_sparks','传说火花','领取 25 个成就奖励。',{type:'achievement',goal:25},{gold:360000,gem:150,honor:3200}],
      ['deep_routes','秘境深路','累计通关 35 次副本。',{type:'dungeon',goal:35},{gold:420000,essence:95,tickets:2}],
      ['stable_codex','百骑残章','收藏 15 只坐骑。',{type:'mount',goal:15},{gold:460000,gem:180,stat:{dropMult:4}}],
      ['boss_constellation','首领星图','击败 25 个地图首领。',{type:'mapBoss',goal:25},{gold:520000,honor:4600,essence:120}],
      ['apex_binding','终局装订','账号最高等级达到 Lv.80。',{type:'level',goal:80},{gold:650000,gem:240,stat:{atkPct:2,hpPct:2,mastery:4}}],
    ],
  },
  {
    key:'dragon_isles', title:'卷五: 龙岛群屿志', icon:'🐲', color:'#22d3ee',
    chapters:[
      ['waking_coast','觉醒海岸页','龙岛声望达到 5000。',{type:'rep',faction:'龙岛',goal:5000},{gold:260000,gem:100,essence:50}],
      ['valdrakken_lines','瓦德拉肯行文','龙岛声望达到 20000。',{type:'rep',faction:'龙岛',goal:20000},{gold:420000,honor:3600,essence:95}],
      ['treasure_rubrics','群岛藏宝批注','发现 25 个龙岛宝藏。',{type:'dragonTreasure',goal:25},{gold:500000,gem:180,stat:{dropMult:5}}],
      ['storm_avatar','风暴化身页','击败 莱萨杰丝·风暴化身。',{type:'worldBossKey',key:'raszageth_storm',goal:1},{gold:620000,gem:220,honor:5200,essence:120}],
      ['isles_full_map','群岛全图','发现 75 个龙岛宝藏。',{type:'dragonTreasure',goal:75},{gold:780000,gem:280,stat:{mastery:8}}],
      ['dragon_binding','龙岛装订','龙岛声望达到 100000。',{type:'rep',faction:'龙岛',goal:100000},{gold:1000000,gem:420,honor:9000,stat:{atkPct:3,hpPct:3,dropMult:8}}],
    ],
  },
  {
    key:'legacy', title:'卷六: 群星遗产', icon:'👑', color:'#facc15',
    chapters:[
      ['class_halls','职业大厅页','完成 10 个职业大厅委托。',{type:'classOrder',goal:10},{gold:420000,gem:160,honor:3600}],
      ['many_orders','多职统筹','完成 25 个职业大厅委托。',{type:'classOrder',goal:25},{gold:650000,gem:240,essence:150,stat:{mastery:6}}],
      ['achievement_archive','功绩总档','领取 45 个成就奖励。',{type:'achievement',goal:45},{gold:780000,gem:300,honor:7000}],
      ['ascended_line','觉醒谱系','觉醒等级达到 10。',{type:'ascend',goal:10},{gold:900000,gem:360,essence:220,stat:{atkPct:3,hpPct:3}}],
      ['collector_legacy','收藏者遗产','收藏 25 只坐骑。',{type:'mount',goal:25},{gold:1100000,gem:460,stat:{dropMult:10,mastery:10}}],
      ['starbound_codex','群星终章','完成 30 个职业大厅委托并领取 60 个成就奖励。',{type:'combined',goal:1,parts:[{type:'classOrder',goal:30},{type:'achievement',goal:60}]},{gold:1600000,gem:700,honor:15000,title:'群星编年官',stat:{atkPct:6,hpPct:6,defPct:4,mastery:16,dropMult:16}}],
    ],
  },
  {
    key:'karesh', title:'卷七: 卡雷什裂界录', icon:'🪐', color:'#67e8f9',
    chapters:[
      ['trust_foothold','裂界落点','卡雷什信托开始把你的行迹写入幸存者档案。',{type:'rep',faction:'卡雷什信托',goal:5000},{gold:580000,gem:210,essence:110}],
      ['waystone_sutures','界碑缝线','界碑网络开始稳定卡雷什的高端循环。',{type:'waystone',goal:12},{gold:680000,honor:4800,essence:140}],
      ['unbound_warrant','无缚缉令','击败雷沙诺尔,才能踏入更深的裂隙航线。',{type:'worldBossKey',key:'reshanor',goal:1},{gold:820000,gem:280,honor:6200,stat:{defPct:2}}],
      ['primeus_index','普莱姆斯索引','把普莱姆斯档案秘库写入你的终局航图。',{type:'dungeonKey',key:'primeus_repository',goal:1},{gold:900000,gem:320,essence:180,stat:{mastery:4}}],
      ['shadowpoint_apex','影点军律','影点总督的猎令,必须由更强的猎手亲手撕碎。',{type:'worldBossKey',key:'shadowpoint_vexis',goal:1},{gold:1100000,gem:360,honor:7600,essence:210,stat:{atkPct:2}}],
      ['sanctum_last_entry','终域末页','完成卡雷什终局的最后一段抄录。',{type:'combined',goal:1,parts:[{type:'worldBossKey',key:'shandorah_astromancer',goal:1},{type:'dungeonKey',key:'voidrazor_sanctum',goal:1},{type:'rep',faction:'卡雷什信托',goal:40000},{type:'waystone',goal:30},{type:'invasion',goal:6}]},{gold:1800000,gem:760,honor:16000,title:'裂界编年官',stat:{atkPct:5,hpPct:5,defPct:3,mastery:14,dropMult:12}}],
    ],
  },
];

const CHRONICLE_CHAPTERS = CHRONICLE_VOLUMES.flatMap(volume => volume.chapters.map((row, idx) => ({
  key: `${volume.key}_${row[0]}`,
  volumeKey: volume.key,
  volumeTitle: volume.title,
  volumeIcon: volume.icon,
  color: volume.color,
  index: idx + 1,
  name: row[1],
  desc: row[2],
  cond: row[3],
  reward: row[4],
})));

function ensureChronicles() {
  if (!account && typeof defaultAccount === 'function') account = defaultAccount();
  if (!account.chronicles) account.chronicles = { claimed:{} };
  if (!account.chronicles.claimed) account.chronicles.claimed = {};
  return account.chronicles;
}

function chronicleWorldBossKeys() {
  if (typeof accountWorldBossKilledKeys === 'function') return accountWorldBossKilledKeys();
  const keys = new Set();
  for (const c of (Array.isArray(characters) ? characters : []).concat(state ? [state] : [])) {
    const wb = c?.worldBoss || {};
    for (const key of Object.keys(wb.lastKill || {})) if (wb.lastKill[key]) keys.add(key);
    for (const key of Object.keys(wb.stageClears || {})) if (wb.stageClears[key]) keys.add(key);
  }
  return keys;
}
function chronicleWorldBossName(key) {
  const wb = (typeof WORLD_BOSSES !== 'undefined' ? WORLD_BOSSES : []).find(x => x.key === key);
  return wb?.name || key;
}
function chronicleDungeonName(key) {
  const dg = (typeof DUNGEONS !== 'undefined' ? DUNGEONS : []).find(x => x.key === key);
  return dg?.name || key;
}

function chronicleMetric(cond) {
  const acc = typeof accEns === 'function' ? accEns() : account;
  if (!cond) return 0;
  if (cond.type === 'level') return typeof accLvl === 'function' ? accLvl() : (state?.hero?.lvl || 1);
  if (cond.type === 'kills') return acc?.killsTotal || 0;
  if (cond.type === 'mapBoss') return Object.values(acc?.bossesKilled || {}).reduce((s, n) => s + (n || 0), 0);
  if (cond.type === 'dungeon') return acc?.dungeonClearsTotal || 0;
  if (cond.type === 'dungeonKey') return typeof accountDungeonClearCount === 'function' ? accountDungeonClearCount(cond.key) : ((acc?.dungeonClearsByKey || {})[cond.key] || 0);
  if (cond.type === 'worldBoss') return typeof accountWorldBossTotalKills === 'function' ? accountWorldBossTotalKills() : 0;
  if (cond.type === 'worldBossKey') return chronicleWorldBossKeys().has(cond.key) ? 1 : 0;
  if (cond.type === 'rare') return typeof accountRareEliteTotalKills === 'function' ? accountRareEliteTotalKills() : 0;
  if (cond.type === 'mount') return typeof accountMountOwnedCount === 'function' ? accountMountOwnedCount() : Object.values(acc?.mounts || {}).filter(m => m?.obtained).length;
  if (cond.type === 'rep') return acc?.reputation?.[cond.faction] || 0;
  if (cond.type === 'anyRep') return Math.max(0, ...Object.values(acc?.reputation || {}).map(n => n || 0));
  if (cond.type === 'dragonTreasure') return Object.keys(acc?.dragonTreasures?.claimed || {}).length;
  if (cond.type === 'classOrder') return Object.keys(acc?.classOrders?.claimed || {}).length;
  if (cond.type === 'achievement') return Object.keys(acc?.achievementsClaimed || {}).length;
  if (cond.type === 'ascend') return acc?.ascendLvl || 0;
  if (cond.type === 'waystone') return typeof ensureWaystoneState === 'function' ? (ensureWaystoneState().totalEarned || 0) : (acc?.waystones?.totalEarned || 0);
  if (cond.type === 'invasion') return typeof invasionCompletedCount === 'function' ? invasionCompletedCount() : (acc?.worldInvasions?.totalClaims || 0);
  if (cond.type === 'combined') return cond.parts.every(p => chronicleMetric(p) >= p.goal) ? 1 : 0;
  return 0;
}

function chronicleCondText(cond) {
  const labels = {
    level:'账号等级', kills:'累计击杀', mapBoss:'地图首领', dungeon:'副本通关',
    worldBoss:'世界Boss', worldBossKey:'指定世界Boss', dungeonKey:'指定副本', rare:'稀有精英', mount:'坐骑收藏',
    anyRep:'最高声望', dragonTreasure:'龙岛宝藏', classOrder:'职业委托',
    achievement:'成就领取', ascend:'觉醒等级', waystone:'界碑碎片', invasion:'入侵压制', combined:'复合目标',
  };
  if (cond?.type === 'rep') return `${cond.faction}声望 ${fmt(cond.goal)}`;
  if (cond?.type === 'worldBossKey') return `击败 ${chronicleWorldBossName(cond.key)}`;
  if (cond?.type === 'dungeonKey') return `通关 ${chronicleDungeonName(cond.key)} ${fmt(cond.goal)} 次`;
  if (cond?.type === 'combined') return cond.parts.map(chronicleCondText).join(' + ');
  return `${labels[cond?.type] || cond?.type}: ${fmt(cond?.goal || 0)}`;
}

function chronicleRewardText(r) {
  const parts = [];
  if (r.gold) parts.push(`${fmt(r.gold)}💰`);
  if (r.gem) parts.push(`${r.gem}💎`);
  if (r.honor) parts.push(`${fmt(r.honor)}🏅`);
  if (r.essence) parts.push(`${r.essence}✨`);
  if (r.tickets) parts.push(`${r.tickets}🎟️`);
  if (r.stat) {
    const stats = Object.entries(r.stat).map(([k, v]) => typeof fmtMod === 'function' ? fmtMod(k, v) : `${k}+${v}`);
    if (stats.length) parts.push(stats.join(' / '));
  }
  if (r.title) parts.push(`称号「${r.title}」`);
  return parts.join(' ');
}

function chronicleClaimedCount(volumeKey) {
  const ch = ensureChronicles();
  return CHRONICLE_CHAPTERS.filter(c => (!volumeKey || c.volumeKey === volumeKey) && ch.claimed[c.key]).length;
}

function chronicleSummary() {
  const ch = ensureChronicles();
  let ready = 0;
  for (const c of CHRONICLE_CHAPTERS) if (!ch.claimed[c.key] && chronicleMetric(c.cond) >= c.cond.goal) ready++;
  return { total:CHRONICLE_CHAPTERS.length, claimed:chronicleClaimedCount(), ready };
}

function grantChronicleReward(r) {
  if (r.gold) state.gold += r.gold;
  if (r.gem) state.gem += r.gem;
  if (r.honor) state.honor += r.honor;
  if (r.essence) state.essence += r.essence;
  if (r.tickets) state.tickets = (state.tickets || 0) + r.tickets;
  if (r.title && typeof unlockTitle === 'function') unlockTitle(r.title);
  if (r.stat) {
    const acc = typeof accEns === 'function' ? accEns() : account;
    acc.permanentStats = acc.permanentStats || {};
    for (const [k, v] of Object.entries(r.stat)) acc.permanentStats[k] = (acc.permanentStats[k] || 0) + v;
    if (typeof recomputeStats === 'function') recomputeStats();
  }
}

function claimChronicleChapter(key) {
  const ch = ensureChronicles();
  const chapter = CHRONICLE_CHAPTERS.find(c => c.key === key);
  if (!chapter) return false;
  if (ch.claimed[key]) { log('该编年史章节已领取', 'info'); return false; }
  if (chronicleMetric(chapter.cond) < chapter.cond.goal) { log('编年史章节尚未解锁', 'bad'); return false; }
  ch.claimed[key] = Date.now();
  grantChronicleReward(chapter.reward);
  log(`📖 编年史补完「${chapter.name}」· ${chronicleRewardText(chapter.reward)}`, 'legend');
  if (typeof progressionCheckAch === 'function') progressionCheckAch();
  markDirty('progression','hero');
  return true;
}

function renderChronicleChapter(chapter) {
  const ch = ensureChronicles();
  const cur = chronicleMetric(chapter.cond);
  const done = cur >= chapter.cond.goal;
  const claimed = !!ch.claimed[chapter.key];
  const pct = Math.min(100, chapter.cond.goal ? cur / chapter.cond.goal * 100 : 0);
  const cls = claimed ? 'claimed' : (done ? 'ready' : '');
  const btn = claimed
    ? '<span class="muted">✓已补完</span>'
    : done
      ? `<button class="gold" data-action="claimchronicle" data-key="${chapter.key}">补完</button>`
      : `<span class="muted" style="font-size:10px">${fmt(Math.min(cur, chapter.cond.goal))}/${fmt(chapter.cond.goal)}</span>`;
  return `<div class="chronicle-card ${cls}" style="border-left-color:${chapter.color}">
    <div class="chronicle-head">
      <span class="chronicle-index">${chapter.index}</span>
      <div><b>${chapter.name}</b><div class="muted" style="font-size:10px">${chapter.desc}</div></div>
    </div>
    <div class="muted" style="font-size:10px;margin-top:5px">${chronicleCondText(chapter.cond)}</div>
    <div class="bar xp" style="height:6px;margin-top:4px"><i style="width:${pct}%"></i></div>
    <div class="chronicle-foot">
      <span class="muted" style="font-size:10px">${chronicleRewardText(chapter.reward)}</span>
      ${btn}
    </div>
  </div>`;
}

function renderChronicleSubtab() {
  const sum = chronicleSummary();
  let html = `<div class="chronicle-hero" style="background-image:linear-gradient(90deg, rgba(8,12,24,.92), rgba(8,12,24,.56)), url('assets/wow/art/karesh-chronicle-banner.png')">
    <div class="chronicle-hero-title">📖 艾泽拉斯编年史</div>
    <div class="chronicle-hero-text">已补完 <b>${sum.claimed}/${sum.total}</b> 章 · 可补完 <b style="color:var(--legend)">${sum.ready}</b> 章 · 卡雷什卷册现已接入界碑碎片、终局入侵与 100+ 远征。</div>
  </div>
  <div class="prog-summary muted">编年史从全游戏进度取材: 等级、击杀、首领、副本、坐骑、声望、龙岛、职业大厅、界碑网络与世界入侵都会写入章节。</div>`;
  for (const volume of CHRONICLE_VOLUMES) {
    const chapters = CHRONICLE_CHAPTERS.filter(c => c.volumeKey === volume.key);
    const claimed = chronicleClaimedCount(volume.key);
    const ready = chapters.filter(c => !ensureChronicles().claimed[c.key] && chronicleMetric(c.cond) >= c.cond.goal).length;
    html += `<div class="chronicle-volume">
      <div class="chronicle-volume-title" style="color:${volume.color}">${volume.icon} ${volume.title} <span class="muted">(${claimed}/${chapters.length}${ready ? ` · 可补完 ${ready}` : ''})</span></div>
      <div class="chronicle-grid">${chapters.map(renderChronicleChapter).join('')}</div>
    </div>`;
  }
  return html;
}

if (typeof globalThis !== 'undefined') {
  globalThis.CHRONICLE_CHAPTERS = CHRONICLE_CHAPTERS;
  globalThis.renderChronicleSubtab = renderChronicleSubtab;
  globalThis.claimChronicleChapter = claimChronicleChapter;
  globalThis.chronicleClaimedCount = chronicleClaimedCount;
}
