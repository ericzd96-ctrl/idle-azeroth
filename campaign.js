/* =========================================================
   campaign.js — 五幕主线战役
   ---------------------------------------------------------
   主线复用账号已有的探索、地图首领和副本首通记录。
   老存档可以补认进度；章节奖励每个账号只领取一次。
   ========================================================= */

const CAMPAIGN_VERSION = 1;

function campaignRoute(faction) {
  const horde = faction === 'horde';
  return {
    startMap: horde ? 'durotar' : 'elwynn',
    startDungeon: horde ? 'ragefire' : 'deadmines',
    secondMap: horde ? 'hillsbrad' : 'duskwood',
  };
}

function campaignActs(faction) {
  const route = campaignRoute(faction);
  return [
    {
      key:'act1', numeral:'第一幕', title:'家园告急', level:'1–20', color:'#d5a94e',
      brief:'边境哨站接连失联。沿着袭击留下的痕迹追查，在敌方据点里结束这场威胁。',
      completeText:'边境恢复了往日的灯火，而缴获的命令指向更远的失联道路。',
      reward:{ gold:20000, gem:12, essence:8, itemLevel:14, dungeon:route.startDungeon, title:'边境守望者' },
      stages:[
        { key:'oath', name:'接受征召', icon:'✦', text:'响应边境求援，踏上第一次巡查。', condition:{type:'always'} },
        { key:'arms', name:'整备出发', icon:'⚒', text:'穿上一件战利品，完成最基本的行装。', condition:{type:'equipped',count:1}, action:{type:'tab',tab:'inv'}, hint:'普通敌人的掉落就足以完成整备。' },
        { key:'scout', name:'发现踪迹', icon:'⌁', text:'清理出生区域的第一处据点，寻找袭击者留下的线索。', condition:{type:'subzoneAny',keys:['elwynn-0','durotar-0']}, action:{type:'map',map:route.startMap,sub:0}, hint:'留在当前区域战斗，进度条满后即完成探索。' },
        { key:'frontier', name:'平定边境', icon:'◆', text:'走遍家园附近的三个区域，切断袭击者的退路。', condition:{type:'mapAnyAll',keys:['elwynn','durotar']}, action:{type:'mapNext',map:route.startMap}, hint:'依次完成地图中的三个子区域。' },
        { key:'chieftain', name:'击败头目', icon:'♜', text:'挑战边境首领，夺取敌方据点的位置。', condition:{type:'bossAny',keys:['elwynn','durotar']}, action:{type:'boss',map:route.startMap}, hint:'首领会施放危险技能；留意读条并准备打断或减伤。' },
        { key:'stronghold', name:'攻入据点', icon:'⬢', text:`进入${route.startDungeon === 'ragefire' ? '怒焰裂谷' : '死亡矿井'}，击败幕后的指挥者。`, condition:{type:'dungeonAny',keys:['ragefire','deadmines']}, action:{type:'dungeon',key:route.startDungeon}, hint:'这是第一幕的最终战。检查天赋与装备后再进入。' },
      ],
    },
    {
      key:'act2', numeral:'第二幕', title:'失联的道路', level:'20–40', color:'#67e8f9',
      brief:'新的命令来自一条断绝的补给线。穿过受侵蚀的土地，重建通向王国腹地的道路。',
      completeText:'补给线重新贯通，遗留的文书却证明灾厄正从东部扩散。',
      reward:{ gold:85000, gem:24, essence:18, itemLevel:35, dungeon:'scarlet', title:'王国信使' },
      stages:[
        { key:'orders', name:'远方来信', icon:'✉', text:'成长到足以离开家园，接下新的远征命令。', condition:{type:'level',level:20}, action:{type:'tab',tab:'map'}, hint:'继续完成适合当前等级的区域与副本。' },
        { key:'lostroad', name:'穿越失联地', icon:'⌁', text:`调查${route.secondMap === 'hillsbrad' ? '希尔斯布莱德丘陵' : '暮色森林'}的全部区域。`, condition:{type:'mapAnyAll',keys:['duskwood','hillsbrad']}, action:{type:'mapNext',map:route.secondMap}, hint:'这里的敌人会更频繁地使用持续伤害。' },
        { key:'roadboss', name:'夺回路标', icon:'♜', text:'击败占据交通线的区域首领。', condition:{type:'bossAny',keys:['duskwood','hillsbrad']}, action:{type:'boss',map:route.secondMap}, hint:'若承伤过高，尝试防御型天赋或治疗随从。' },
        { key:'highlands', name:'追踪密令', icon:'◇', text:'完成阿拉希高地的调查，找到敌方往来的密令。', condition:{type:'mapAll',key:'arathi'}, action:{type:'mapNext',map:'arathi'}, hint:'这是一条主线必经路线，其他同级地图仍可自由探索。' },
        { key:'courier', name:'截断联络', icon:'♞', text:'击败阿拉希高地首领，切断敌军联络。', condition:{type:'boss',key:'arathi'}, action:{type:'boss',map:'arathi'}, hint:'观察首领技能说明，再决定技能和随从配置。' },
        { key:'monastery', name:'攻破修道院', icon:'⬢', text:'进入血色修道院，结束失联道路上的最后阻碍。', condition:{type:'dungeon',key:'scarlet'}, action:{type:'dungeon',key:'scarlet'}, hint:'章末副本会综合检验生存与输出。' },
      ],
    },
    {
      key:'act3', numeral:'第三幕', title:'灾厄源头', level:'40–60', color:'#f87171',
      brief:'污染沿着旧王国的废墟扩散。深入灼热山地与瘟疫之地，找出灾厄真正的源头。',
      completeText:'瘟疫之城的钟声停息，黑暗之门后的力量成为下一处战场。',
      reward:{ gold:220000, gem:42, essence:34, itemLevel:58, dungeon:'stratholme', title:'灾厄破除者' },
      stages:[
        { key:'ashcall', name:'灰烬召令', icon:'✉', text:'达到40级，接受东部战线的紧急召令。', condition:{type:'level',level:40}, action:{type:'tab',tab:'map'}, hint:'主线之外的挑战可以提供额外装备，但不强制完成。' },
        { key:'searing', name:'穿越灼地', icon:'⌁', text:'完成灼热峡谷的调查，追踪污染物资。', condition:{type:'mapAll',key:'searing'}, action:{type:'mapNext',map:'searing'}, hint:'火焰与持续伤害会成为主要压力。' },
        { key:'vault', name:'开启古库', icon:'⬡', text:'通关奥达曼，取得封存灾厄的古代记录。', condition:{type:'dungeon',key:'uldaman'}, action:{type:'dungeon',key:'uldaman'}, hint:'副本首通会提供一件保底装备。' },
        { key:'plague', name:'进入疫区', icon:'◇', text:'完成东瘟疫之地的调查，确定仪式位置。', condition:{type:'mapAll',key:'eastern_plague'}, action:{type:'mapNext',map:'eastern_plague'}, hint:'准备稳定恢复手段，避免被多轮消耗拖垮。' },
        { key:'plaguelord', name:'斩断仪式', icon:'♜', text:'击败东瘟疫之地首领，打开通往城内的道路。', condition:{type:'boss',key:'eastern_plague'}, action:{type:'boss',map:'eastern_plague'}, hint:'保留爆发资源，在首领破绽期集中输出。' },
        { key:'stratholme', name:'净化疫城', icon:'⬢', text:'通关斯坦索姆，为这场灾厄写下结局。', condition:{type:'dungeon',key:'stratholme'}, action:{type:'dungeon',key:'stratholme'}, hint:'第三幕最终战，建议先处理所有未分配天赋。' },
      ],
    },
    {
      key:'act4', numeral:'第四幕', title:'跨界远征', level:'58–70', color:'#a78bfa',
      brief:'跨过黑暗之门，在陌生世界建立立足点。敌人的真正统帅正在神殿中等待。',
      completeText:'远征军的战旗插上神殿高处，寒风带来的求援随即抵达。',
      reward:{ gold:420000, gem:70, essence:58, itemLevel:70, dungeon:'bt', title:'裂界远征者' },
      stages:[
        { key:'portal', name:'穿越黑门', icon:'✦', text:'达到58级，加入跨界远征。', condition:{type:'level',level:58}, action:{type:'tab',tab:'map'}, hint:'外域战线会逐步要求更完整的装备组合。' },
        { key:'foothold', name:'建立前线', icon:'⌁', text:'完成地狱火半岛的全部调查。', condition:{type:'mapAll',key:'hellfire'}, action:{type:'mapNext',map:'hellfire'}, hint:'先建立稳定的前线，再继续深入。' },
        { key:'breaker', name:'粉碎封锁', icon:'♜', text:'击败地狱火半岛首领，确保补给通行。', condition:{type:'boss',key:'hellfire'}, action:{type:'boss',map:'hellfire'}, hint:'查看首领技能，针对最危险的机制配置防御。' },
        { key:'shadowmoon', name:'潜入影月', icon:'◇', text:'完成影月谷调查，找到敌方统帅的神殿。', condition:{type:'mapAll',key:'shadowmoon'}, action:{type:'mapNext',map:'shadowmoon'}, hint:'神器和随从在这一幕开始承担更明确的构筑作用。' },
        { key:'gatekeeper', name:'打开神殿', icon:'♞', text:'击败影月谷首领，打开神殿入口。', condition:{type:'boss',key:'shadowmoon'}, action:{type:'boss',map:'shadowmoon'}, hint:'若卡关，优先改善当前流派需要的装备，而非只看品质。' },
        { key:'blacktemple', name:'终结统帅', icon:'⬢', text:'通关黑暗神殿，结束跨界远征。', condition:{type:'dungeon',key:'bt'}, action:{type:'dungeon',key:'bt'}, hint:'第四幕最终战包含多个阶段，准备一套完整策略。' },
      ],
    },
    {
      key:'act5', numeral:'第五幕', title:'寒地决战', level:'68–80', color:'#93c5fd',
      brief:'北境的防线正在崩溃。沿龙骨荒野向冰冠推进，完成这趟旅程最后的讨伐。',
      completeText:'冰冠的风雪渐渐平息。你的旅程已经完成，世界上的挑战仍在等待。',
      reward:{ gold:800000, gem:120, essence:100, itemLevel:80, dungeon:'icc', title:'北境凯旋者' },
      stages:[
        { key:'northcall', name:'北境求援', icon:'✉', text:'达到68级，回应北境守军的求援。', condition:{type:'level',level:68}, action:{type:'tab',tab:'map'}, hint:'北境是主线最后一段长途推进。' },
        { key:'borean', name:'登陆北境', icon:'⌁', text:'完成北风苔原的调查，建立登陆点。', condition:{type:'mapAll',key:'borean'}, action:{type:'mapNext',map:'borean'}, hint:'保持装备更新，避免越级进入后续区域。' },
        { key:'dragonblight', name:'穿越龙骨', icon:'◇', text:'完成龙骨荒野调查，追踪敌军主力。', condition:{type:'mapAll',key:'dragonblight'}, action:{type:'mapNext',map:'dragonblight'}, hint:'留意不同首领对打断与生存的要求。' },
        { key:'storm', name:'取得钥印', icon:'⬡', text:'完成风暴峭壁调查，取得进入冰冠的钥印。', condition:{type:'mapAll',key:'storm'}, action:{type:'mapNext',map:'storm'}, hint:'调整构筑应对长时间战斗。' },
        { key:'icegate', name:'攻破冰门', icon:'♜', text:'击败冰冠冰川首领，打开最终堡垒。', condition:{type:'boss',key:'icecrown'}, action:{type:'boss',map:'icecrown'}, hint:'这是最终副本前的准备度检查。' },
        { key:'crown', name:'完成讨伐', icon:'⬢', text:'通关冰冠堡垒，完成五幕主线。', condition:{type:'dungeon',key:'icc'}, action:{type:'dungeon',key:'icc'}, hint:'最终战会检验整段旅途中形成的构筑。' },
      ],
    },
  ];
}

function ensureCampaignState() {
  if (typeof account === 'undefined' || !account) return null;
  if (!account.campaign || typeof account.campaign !== 'object') account.campaign = {};
  const campaign = account.campaign;
  campaign.version = CAMPAIGN_VERSION;
  if (!campaign.claimedActs || typeof campaign.claimedActs !== 'object') campaign.claimedActs = {};
  if (!campaign.claimedAt || typeof campaign.claimedAt !== 'object') campaign.claimedAt = {};
  return campaign;
}

function campaignAccountLevel() {
  const current = Math.max(1, Number(state?.hero?.lvl) || 1);
  if (typeof characters === 'undefined' || !Array.isArray(characters)) return current;
  return characters.reduce((best, char) => Math.max(best, Number(char?.hero?.lvl) || 1), current);
}

function campaignContext() {
  const mapSizes = {};
  if (typeof MAPS !== 'undefined') for (const map of MAPS) mapSizes[map.key] = (map.sub || []).length;
  return {
    level: campaignAccountLevel(),
    equipped: Object.values(state?.equipped || {}).filter(Boolean).length,
    subzones: Object.assign({}, state?.subzoneCleared || {}, account?.subzonesCleared || {}),
    bosses: Object.assign({}, state?.bossesKilled || {}, account?.bossesKilled || {}),
    dungeons: Object.assign({}, state?.dungeonFirstClear || {}, account?.dungeonClearsByKey || {}),
    mapSizes,
  };
}

function campaignMapDone(key, ctx) {
  const total = ctx.mapSizes[key] || 0;
  if (!total) return false;
  for (let index = 0; index < total; index++) if (!ctx.subzones[`${key}-${index}`]) return false;
  return true;
}

function campaignConditionDone(condition, ctx) {
  const c = condition || { type:'always' };
  if (c.type === 'always') return true;
  if (c.type === 'level') return ctx.level >= c.level;
  if (c.type === 'equipped') return ctx.equipped >= (c.count || 1);
  if (c.type === 'subzoneAny') return (c.keys || []).some(key => !!ctx.subzones[key]);
  if (c.type === 'mapAll') return campaignMapDone(c.key, ctx);
  if (c.type === 'mapAnyAll') return (c.keys || []).some(key => campaignMapDone(key, ctx));
  if (c.type === 'boss') return (ctx.bosses[c.key] || 0) > 0;
  if (c.type === 'bossAny') return (c.keys || []).some(key => (ctx.bosses[key] || 0) > 0);
  if (c.type === 'dungeon') return (ctx.dungeons[c.key] || 0) > 0;
  if (c.type === 'dungeonAny') return (c.keys || []).some(key => (ctx.dungeons[key] || 0) > 0);
  return false;
}

function campaignStageStates(act, ctx) {
  const raw = act.stages.map(stage => campaignConditionDone(stage.condition, ctx));
  let furthest = -1;
  raw.forEach((done, index) => { if (done) furthest = index; });
  return raw.map((done, index) => done || index <= furthest);
}

function campaignCurrentAct() {
  const campaign = ensureCampaignState();
  const acts = campaignActs(state?.faction);
  if (!campaign) return { acts, index:0, act:acts[0], complete:false };
  const index = acts.findIndex(act => !campaign.claimedActs[act.key]);
  if (index < 0) return { acts, index:acts.length - 1, act:acts[acts.length - 1], complete:true };
  return { acts, index, act:acts[index], complete:false };
}

function campaignRewardText(reward) {
  return `${typeof fmt === 'function' ? fmt(reward.gold) : reward.gold}金币　${reward.gem}钻石　${reward.essence}精华　1件史诗战利品　称号「${reward.title}」`;
}

function campaignClaimAct(key) {
  const campaign = ensureCampaignState();
  const acts = campaignActs(state?.faction);
  const index = acts.findIndex(act => act.key === key);
  const act = acts[index];
  if (!campaign || !act || campaign.claimedActs[key]) return false;
  if (index > 0 && !campaign.claimedActs[acts[index - 1].key]) {
    log('请先完成上一幕主线结算', 'bad');
    return false;
  }
  const states = campaignStageStates(act, campaignContext());
  if (!states.every(Boolean)) {
    log('本幕主线尚未完成', 'bad');
    return false;
  }
  campaign.claimedActs[key] = true;
  campaign.claimedAt[key] = Date.now();
  state.gold += act.reward.gold;
  state.gem += act.reward.gem;
  state.essence += act.reward.essence;
  if (!Array.isArray(account.unlockedTitles)) account.unlockedTitles = [];
  if (!account.unlockedTitles.includes(act.reward.title)) account.unlockedTitles.push(act.reward.title);
  const dungeon = typeof DUNGEONS !== 'undefined' ? DUNGEONS.find(d => d.key === act.reward.dungeon) : null;
  const finalBoss = dungeon?.bosses?.[dungeon.bosses.length - 1];
  const item = typeof rollItem === 'function'
    ? rollItem('epic', act.reward.itemLevel, dungeon?.key, finalBoss?.name, { minRarity:'epic' })
    : null;
  if (item && typeof addToInventory === 'function') addToInventory(item);
  log(`📜 ${act.numeral}「${act.title}」完成 · 获得 ${campaignRewardText(act.reward)}`, 'legend');
  if (typeof queueStoryActFinaleThenNext === 'function') queueStoryActFinaleThenNext(key);
  if (typeof saveState === 'function') saveState();
  if (typeof markDirty === 'function') markDirty('hero', 'inventory', 'map', 'progression');
  _campaignRenderSignature = '';
  renderCampaign();
  return true;
}

function campaignEscape(text) {
  return String(text == null ? '' : text).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function campaignPrepItems(stage, ctx) {
  const list = [];
  if (stage?.condition?.type === 'level' && ctx.level < stage.condition.level)
    list.push({ state:'warn', text:`还需提升至 ${stage.condition.level} 级` });
  if ((state?.talentPoints || 0) > 0)
    list.push({ state:'ready', text:`有 ${state.talentPoints} 点天赋可分配`, tab:'talent' });
  if (typeof nextGoalHasUpgrade === 'function' && nextGoalHasUpgrade())
    list.push({ state:'ready', text:'行囊中有可用的装备升级', tab:'inv' });
  if (!list.length) list.push({ state:'ok', text:'当前准备足以继续推进' });
  return list.slice(0, 3);
}

function campaignActionLabel(stage) {
  const type = stage?.action?.type;
  if (type === 'tab') return stage.action.tab === 'inv' ? '查看行囊' : '继续冒险';
  if (type === 'map' || type === 'mapNext') return '前往目标区域';
  if (type === 'boss') return '查看首领';
  if (type === 'dungeon') return '查看章末副本';
  return '继续冒险';
}

let _campaignRenderSignature = '';

function renderCampaign() {
  if (typeof queueStoryActOpening === 'function' && state && state.cls && !document.querySelector('.modal-bg.show')) {
    try {
      const _acts = campaignActs(state.faction);
      const _cur = _acts.find(a => !campaign.claimedActs[a.key]);
      if (_cur && !campaign.claimedActs[_cur.key]) queueStoryActOpening(_cur.key);
    } catch(e){}
  }
  const root = document.getElementById('campaign-root');
  if (!root || !state || !state.cls) return;
  const campaign = ensureCampaignState();
  const current = campaignCurrentAct();
  const ctx = campaignContext();
  const act = current.act;
  const states = campaignStageStates(act, ctx);
  const doneCount = states.filter(Boolean).length;
  const readyToClaim = !current.complete && states.every(Boolean);
  const currentStageIndex = states.findIndex(done => !done);
  const currentStage = currentStageIndex >= 0 ? act.stages[currentStageIndex] : null;
  const signature = [current.complete, current.index, doneCount, currentStage?.key || 'complete', state.talentPoints || 0,
    typeof nextGoalHasUpgrade === 'function' && nextGoalHasUpgrade(), Object.keys(campaign.claimedActs).join(',')].join('|');
  if (signature === _campaignRenderSignature) return;
  _campaignRenderSignature = signature;

  const actRail = current.acts.map((entry, index) => {
    const claimed = !!campaign.claimedActs[entry.key];
    const active = !current.complete && index === current.index;
    return `<li class="${claimed ? 'done' : active ? 'active' : ''}" style="--act-color:${entry.color}">
      <span>${claimed ? '✓' : index + 1}</span><div><b>${entry.title}</b><small>${entry.level}</small></div>
    </li>`;
  }).join('');

  if (current.complete) {
    root.innerHTML = `<section class="campaign-board campaign-finished">
      <div class="campaign-kicker">五幕主线已完成</div>
      <div class="campaign-finished-copy"><span class="campaign-seal">♛</span><div><h2>北境凯旋</h2><p>${campaignEscape(act.completeText)}</p></div></div>
      <ol class="campaign-act-rail">${actRail}</ol>
      <div class="campaign-finished-foot">主线记录已写入账号。你可以继续探索支线、挑战秘境，或踏上觉醒后的新旅程。</div>
    </section>`;
    return;
  }

  const stageRail = act.stages.map((stage, index) => {
    const done = states[index];
    const active = index === currentStageIndex;
    return `<li class="${done ? 'done' : active ? 'active' : ''}"><span>${done ? '✓' : stage.icon}</span><b>${campaignEscape(stage.name)}</b></li>`;
  }).join('');
  const prep = campaignPrepItems(currentStage, ctx).map(item =>
    `<${item.tab ? 'button' : 'div'} ${item.tab ? `type="button" data-campaign-action="tab" data-tab="${item.tab}"` : ''} class="campaign-prep-item ${item.state}"><i></i><span>${campaignEscape(item.text)}</span></${item.tab ? 'button' : 'div'}>`
  ).join('');
  const mainTitle = readyToClaim ? '本幕任务已完成' : currentStage.name;
  const mainText = readyToClaim ? act.completeText : currentStage.text;
  const hint = readyToClaim ? '完成结算后，下一幕主线将自动接续。' : currentStage.hint;
  const action = readyToClaim
    ? `<button type="button" class="campaign-primary" data-campaign-action="claim" data-act="${act.key}">完成本幕并领取奖励</button>`
    : `<button type="button" class="campaign-primary" data-campaign-action="stage">${campaignActionLabel(currentStage)}</button>`;

  root.innerHTML = `<section class="campaign-board" style="--campaign-color:${act.color}">
    <header class="campaign-header">
      <div><div class="campaign-kicker">${act.numeral} · ${act.level}级主线</div><h2>${campaignEscape(act.title)}</h2><p>${campaignEscape(act.brief)}</p></div>
      <div class="campaign-progress-number"><strong>${doneCount}</strong><span>/ ${act.stages.length}</span></div>
    </header>
    <ol class="campaign-stage-rail" aria-label="本幕进度">${stageRail}</ol>
    <div class="campaign-body">
      <article class="campaign-order ${readyToClaim ? 'is-complete' : ''}">
        <div class="campaign-order-label">${readyToClaim ? '战报' : '当前命令'}</div>
        <h3>${campaignEscape(mainTitle)}</h3>
        <p>${campaignEscape(mainText)}</p>
        <div class="campaign-hint">${campaignEscape(hint)}</div>
        ${readyToClaim ? `<div class="campaign-reward"><b>章节奖励</b><span>${campaignEscape(campaignRewardText(act.reward))}</span></div>` : ''}
        ${action}
      </article>
      <aside class="campaign-sidebar">
        <div class="campaign-sidebar-block"><h3>战前准备</h3>${prep}</div>
        <div class="campaign-sidebar-block campaign-route"><h3>战役路线</h3><ol class="campaign-act-rail">${actRail}</ol></div>
      </aside>
    </div>
  </section>`;
}

function campaignGotoTab(tabName) {
  const tab = document.querySelector(`.tab[data-tab="${tabName}"]`);
  if (!tab || tab.hidden) return false;
  const alreadyVisible = tab.classList.contains('active') &&
    (typeof isMobileLayout !== 'function' || !isMobileLayout() || document.body.classList.contains('mobile-panel-open'));
  if (alreadyVisible) return true;
  tab.click();
  return true;
}

function campaignFocusElement(selector) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const target = document.querySelector(selector);
    if (!target) return;
    target.classList.add('campaign-focus');
    target.scrollIntoView({ behavior:'smooth', block:'center' });
    window.setTimeout(() => target.classList.remove('campaign-focus'), 1800);
  }));
}

function campaignRunStageAction(stage) {
  const action = stage?.action;
  if (!action) return;
  if (action.type === 'tab') { campaignGotoTab(action.tab); return; }
  if (action.type === 'dungeon') {
    campaignGotoTab('dungeon');
    if (typeof renderDungeon === 'function') renderDungeon();
    campaignFocusElement(`[data-dungeon-key="${action.key}"]`);
    return;
  }
  if (['map','mapNext','boss'].includes(action.type)) {
    const map = typeof MAPS !== 'undefined' ? MAPS.find(entry => entry.key === action.map) : null;
    let sub = Number.isInteger(action.sub) ? action.sub : 0;
    if (map && action.type === 'mapNext') {
      const ctx = campaignContext();
      const next = map.sub.findIndex((entry, index) => !ctx.subzones[`${map.key}-${index}`]);
      sub = next >= 0 ? next : Math.max(0, map.sub.length - 1);
    } else if (map && action.type === 'boss') {
      sub = Math.max(0, map.sub.length - 1);
    }
    if (state.mode === 'world' && typeof switchSubzone === 'function') switchSubzone(action.map, sub);
    campaignGotoTab('map');
    if (typeof renderMap === 'function') renderMap();
    campaignFocusElement(`[data-map-key="${action.map}"]`);
  }
}

function setupCampaign() {
  const root = document.getElementById('campaign-root');
  if (!root || root.dataset.campaignBound) return;
  root.dataset.campaignBound = '1';
  root.addEventListener('click', event => {
    const button = event.target.closest('[data-campaign-action]');
    if (!button) return;
    const action = button.dataset.campaignAction;
    if (action === 'tab') { campaignGotoTab(button.dataset.tab); return; }
    if (action === 'claim') { campaignClaimAct(button.dataset.act); return; }
    if (action === 'stage') {
      const current = campaignCurrentAct();
      const states = campaignStageStates(current.act, campaignContext());
      const index = states.findIndex(done => !done);
      if (index >= 0) campaignRunStageAction(current.act.stages[index]);
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CAMPAIGN_VERSION, campaignRoute, campaignActs, campaignConditionDone, campaignStageStates };
}
