/* =========================================================
   story.js — 剧情演出与区域内容
   ---------------------------------------------------------
   1) 对话弹窗: 打字机文本 + 分步推进 + 轻选择(只影响奖励, 不做分支)
   2) 主线演出: 每幕开场/收官对话(由战役数据生成), 区域首领初见独白
   3) 区域内容: 每张地图一个地标互动 + 全子区探索完成后的区域事件链
   全部一次性触发, 不重复打扰; 奖励走现有资源系统。
   ========================================================= */

/* ---------- 对话弹窗组件 ---------- */
let _storyModalEl = null;
function isStoryModalOpen(){ return !!_storyModalEl && _storyModalEl.isConnected; }
function closeStoryModal(){
  if (_storyModalEl) { try { _storyModalEl.remove(); } catch(e){} _storyModalEl = null; }
}
function showStoryModal(script, onDone){
  if (typeof document === 'undefined') { if (onDone) onDone(0); return; }
  closeStoryModal();
  const steps = script.steps || [];
  let idx = 0, typing = null, finished = false;
  const el = document.createElement('div');
  el.className = 'modal-bg show story-modal-bg';
  el.innerHTML = `
    <div class="modal story-modal">
      <div class="story-scene"></div>
      <div class="story-box">
        <div class="story-who"><span class="story-ava"></span><b></b></div>
        <div class="story-text"></div>
        <div class="story-choices"></div>
        <button class="story-next">继续 ▸</button>
      </div>
    </div>`;
  document.body.appendChild(el);
  _storyModalEl = el;
  const textEl = el.querySelector('.story-text');
  const whoEl = el.querySelector('.story-who');
  const nextBtn = el.querySelector('.story-next');
  const sceneEl = el.querySelector('.story-scene');
  function renderStep(){
    const s = steps[idx];
    if (!s) return;
    whoEl.innerHTML = `<span class="story-ava">${s.icon || '📖'}</span><b>${s.who || ''}</b>`;
    sceneEl.innerHTML = s.scene ? `<div class="story-scene-text">${s.scene}</div>` : '';
    const full = s.text || '';
    let i = 0;
    textEl.textContent = '';
    if (typing) clearInterval(typing);
    typing = setInterval(() => {
      i += 2;
      textEl.textContent = full.slice(0, i);
      if (i >= full.length) { clearInterval(typing); typing = null; }
    }, 24);
    textEl.onclick = () => { if (typing) { clearInterval(typing); typing = null; textEl.textContent = full; } };
    const isLast = idx >= steps.length - 1;
    if (isLast && script.choices && script.choices.length){
      nextBtn.style.display = 'none';
      const cEl = el.querySelector('.story-choices');
      cEl.innerHTML = script.choices.map((c, ci) => `<button data-sc="${ci}">${c.label}</button>`).join('');
      cEl.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
        if (finished) return;
        finished = true;
        const ci = parseInt(b.dataset.sc);
        closeStoryModal();
        if (typeof playSfx === 'function') playSfx('loot');
        if (script.onChoice) script.onChoice(ci);
        if (onDone) onDone(ci);
      }));
    } else {
      nextBtn.style.display = '';
      nextBtn.textContent = isLast ? (script.lastLabel || '出发 ▸') : '继续 ▸';
    }
    if (typeof playSfx === 'function' && idx > 0) playSfx('event');
  }
  nextBtn.addEventListener('click', () => {
    const s = steps[idx];
    if (typing){ if(s){ textEl.textContent = s.text || ''; } if(typing){clearInterval(typing); typing = null;} return; }
    if (idx < steps.length - 1){ idx++; renderStep(); }
    else {
      if (finished) return;
      finished = true;
      closeStoryModal();
      if (script.onChoice) script.onChoice(-1);
      if (onDone) onDone(-1);
    }
  });
  if (typeof playSfx === 'function') playSfx('event');
  renderStep();
}

/* ---------- 主线幕间演出 ---------- */
function storyActOpeningScript(act){
  const lines = [];
  const flavor = {
    act1: ['边境的烽火台已经三天没有点灯。', '征召令贴满了每一根路灯柱。'],
    act2: ['补给线的钟声在夜里断掉了。', '信使的马鞍上还留着黑色的箭孔。'],
    act3: ['东部的风里开始有灰的味道。', '旧王国的废墟在雾里发着不祥的光。'],
    act4: ['黑暗之门的绿光撕开了天幕。', '远征军在门的另一侧竖起了第一面旗。'],
    act5: ['北境的雪埋到了膝盖。', '冰霜巨龙的影子掠过军营上空。'],
  };
  const fl = flavor[act.key] || [act.brief];
  lines.push({ icon:'📖', who:'旁白', text: fl[0] });
  if (fl[1]) lines.push({ icon:'📖', who:'旁白', text: fl[1] });
  lines.push({ icon:'📖', who:'旁白', text: act.brief });
  lines.push({ icon:'🎖️', who:'军需官', text: `${act.numeral}「${act.title}」的任务交给你了。完成六个阶段的指令, 幕后主使就会现形。`, scene:'军需官把一枚磨旧的徽章按进你手心' });
  lines.push({ icon:'⚔️', who:'你', text: '留给我的人, 也留给我一句战场上见。' });
  return { steps: lines, lastLabel: '接下任务 ▸' };
}
function storyActFinaleScript(act){
  return {
    steps: [
      { icon:'📖', who:'旁白', text: act.completeText || '这一幕的威胁尘埃落定。' },
      { icon:'🎖️', who:'军需官', text: `干得漂亮, 冒险者。${act.numeral}的报酬已经备好: ${act.reward.title ? '称号「' + act.reward.title + '」' : ''}以及一笔可观的补给。` },
      { icon:'⚔️', who:'你', text: '下一场战斗在哪里?' },
    ],
    lastLabel: '领取犒赏 ▸',
  };
}
/* Boss初见独白: 标志性首领专属台词, 其余用通用模板 */
const BOSS_TAUNTS = {
  tirisfal: { line:'活人……新鲜又愚蠢的活人。纳尔图欢迎你加入沉默的大多数。', flavor:'纳尔图抬起腐烂的手臂, 指甲缝里全是墓土。' },
  westfall: { line:'嘿嘿嘿……我的船员们饿了很久, 你的货和你的命都很合胃口。', flavor:'莫斯虎尔的复仇之灵从桅杆阴影里渗出, 铁锚拖在地上。' },
  silverpine: { line:'主人的实验缺一具活体样本, 而你正好送上门来。', flavor:'阿鲁高的侍从抖开法袍, 影子先一步扑了过来。' },
  redridge: { line:'吼————! 矿是我的, 山是我的, 你也是我的! ', flavor:'山口烈焰的喉管里滚出两团火苗。' },
  barrens: { line:'滋——你的味道不错, 脆皮的两足兽。', flavor:'沙鳞之翼的尾针在沙地上划出警告的直线。' },
  wetlands: { line:'凡人, 这片湿地埋葬过比你强大百倍的名字。', flavor:'萨格雷·烈焰之心的鳞片间渗出熔岩色的光。' },
  duskwood: { line:'又是一个迷路的灵魂……夜色会替我守住你的秘密。', flavor:'斯特拉霍尔姆勋爵展开蝙蝠皮的披风, 露出獠牙。' },
  thousand: { line:'千年了, 踩上我石林的冒险者, 没有一个走下吊桥。', flavor:'千针石林之沙抖落了一身的沙尘。' },
  stranglethorn: { line:'嘶嘶——丛林之王的名号, 不接受冒险者的挑战。', flavor:'加兹瑞拉盘起身子, 尾尖指向你的喉咙。' },
  searing: { line:'黑石的战鼓已经敲响, 你连尸体的位置都排不上。', flavor:'黑石氏族督军的战锤在地上砸出火星。' },
  burning: { line:'愚者! 拉格纳罗斯大人的意志, 岂容凡血玷污!', flavor:'拉格纳罗斯的仆从周身的空气开始扭曲。' },
  ungoro: { line:'吼! 环形山的食物链顶端, 今天不进新名字。', flavor:'雷加什·烈日撞断了一棵碗口粗的树。' },
  silithus: { line:'其拉虫群亿万双眼睛在看。献上你的恐惧吧。', flavor:'鲁卡安的复眼同时转向了你。' },
  eastern_plague: { line:'克尔苏加德大人早已算到了你的每一步。包括这一步。', flavor:'克尔苏加德的密使展开了瘟疫纹章的信。' },
  hellfire: { line:'凡人的军队在深渊领主面前, 只配做燃料。', flavor:'玛瑟里顿的铁链哗啦作响, 熔岩从蹄下渗出。' },
  nagrand: { line:'邦多饿了。邦多想吃掉你的坐骑, 再吃掉你。', flavor:'邦多抡起石锤, 砸平了一块浮岩。' },
  shadowmoon: { line:'你们毫无抉择的权利。在这里, 众人皆服于我。', flavor:'伊利丹·怒风的双刃燃起绿焰。' },
  borean: { line:'咔哧咔哧……冰层下的猎物, 总是跑不掉的。', flavor:'卡格瓦的下颚滴着冰水。' },
  storm: { line:'凡人! 竟敢直视风暴的容颜! 我, 索林姆, 判你死刑!', flavor:'风暴峭壁的天空随他的怒吼劈下一道闪电。' },
  icecrown: { line:'这一切……都是计划之中。你的终结, 也将服务于巫妖王。', flavor:'阿尔萨斯·巫妖王缓缓举起霜之哀伤。' },
  lochmodan: { line:'莫格罗什的地盘, 石头都比你的脑袋硬!', flavor:'莫格罗什举起比人还高的碎石锤。' },
  ashenvale: { line:'暗夜精灵的月亮井, 也救不了堕入暗影的你。', flavor:'萨特领主的尾巴在身后愉悦地摇摆。' },
  arathi: { line:'托尔贝恩的斧头已经几百年没尝过活人的血了。', flavor:'托尔贝恩的亡魂从断墙后显形。' },
  desolace: { line:'凡间的勇士, 你的骸骨会成为我新的收藏。', flavor:'瑟莱德丝公主的石化裙裾摩擦出刺响。' },
  feralas: { line:'绿龙的荣耀不容侵犯, 变节者更不例外。', flavor:'伊兰尼库斯之影从翡翠色的雾里浮现。' },
  tanaris: { line:'嘶……沙子里又埋进一个不知死活的名字。', flavor:'加兹瑞拉的尾部扫塌了半面沙墙。' },
  zangarmarsh: { line:'纳迦的荣耀, 不容蘑菇沼泽里的臭虫置喙。', flavor:'瓦斯琪的蛇尾在水面划出优雅的弧线。' },
  dragonblight: { line:'蓝龙的寒冰曾封存巨龙的英灵, 也会封存你。', flavor:'辛达苟萨的吐息让空气结出了冰花。' },
  stonetalon: { line:'咕——石爪的暴风, 会把你的骨头吹成粉末。', flavor:'格雷苏·碎石的双翼掀起一阵毒风。' },
  hillsbrad: { line:'为洛丹米尔而战! 嚣张的冒险者, 放马过来!', flavor:'赫洛德把战旗插进冻土, 双手各握一柄重剑。' },
  dustwallow: { line:'嘶吼, 燃烧, 毁灭——黑龙公主的问候一向如此。', flavor:'奥妮克希亚的瞳孔缩成一条竖线。' },
  blasted: { line:'我的领域不容侵犯, 凡人。深渊在欢迎你。', flavor:'卡扎克的巨翼展开, 遮住了诅咒之地的天空。' },
  terokkar: { line:'声音……你的声音将加入我的永恒静默。', flavor:'摩摩尔周围的空间开始震颤。' },
  bladesedge: { line:'格鲁尔打过屠龙的仗! 你, 连开胃菜都算不上!', flavor:'屠龙者格鲁尔的背刺投下整片阴影。' },
  netherstorm: { line:'逐日者的魔法, 你连仰望的资格都没有。', flavor:'凯尔萨斯·逐日者指尖浮起三枚炽热的法球。' },
  howling: { line:'因格瓦尔的战吼, 将从峡湾传到英灵殿!', flavor:'掠夺者因格瓦尔的战斧劈进船舷。' },
  grizzly: { line:'(震耳欲聋的咆哮)', flavor:'达克萨隆巨熊的獠牙上挂着前一位挑战者的盾牌。' },
  sholazar: { line:'嘶哈——旅游业到此为止, 猎物。', flavor:'洛卡纳哈的条纹隐入丛林, 只剩双眼。' },
  waking: { line:'龙蚀的潮汐将吞没你们所有人的骄傲。', flavor:'黑曜裂翼者俯冲而下, 翼膜遮天。' },
  ohnahran: { line:'风誓者的箭, 从不落空。让我看看你的奔跑。', flavor:'风誓可汗阿拉塔在马背上搭弓, 箭尖对着你的眉心。' },
  azure_span: { line:'碧蓝林海的魔网, 将织进你的梦境与醒来。', flavor:'魔网吞噬者赛洛斯的触须在符文间游动。' },
  thaldraszus: { line:'时间站在我这边, 冒险者。你已经输了无数次了。', flavor:'永恒时誓者克罗诺斯倒转了怀表。' },
  dornogal: { line:'卡兹阿加的磐石记得每一个莽撞者的名字。', flavor:'裂隙执政官哈洛姆的石躯上浮现出古老的税铭。' },
  hallowfall: { line:'圣焰会审判你的每一步僭越。', flavor:'圣焰审判官梅瑞安的权杖燃起白金色的火。' },
  shadow_point: { line:'织网者夏伊洛, 为虚空编织你的命运。', flavor:'王廷织命者夏伊洛的八足在网线上敲出节拍。' },
  shandorah: { line:'你的未来已被编目: 词条, 失败, 无人纪念。', flavor:'相位猎手瓦兹鲁的星环缓缓对准了你。' },
  primeus: { line:'谱系不容断章。而你, 连注脚都不配成为。', flavor:'谱系看护者赛弗琳的藤蔓上开满了静默的花。' },
  voidrazor: { line:'实体是幻觉, 痛苦是真实。欢迎来到剃刀。', flavor:'影点执监阿萨瑞克的剪影在虚空中重影。' },
  eversong_midnight: { line:'午夜的魔网将摄走你的心智, 愚钝的凡人。', flavor:'星潮观测者乌姆瑟斯的镜片后没有瞳孔。' },
  harandar: { line:'群星之下, 一切挑战都已被记录、被归档、被遗忘。', flavor:'群星编目者涅普提拉翻开了一册新页。' },
};
function storyBossScript(map){
  const b = map.boss || {};
  const steps = [];
  const t = BOSS_TAUNTS[map.key];
  if (t && t.line){
    steps.push({ icon: b.emoji || '👹', who: b.name, text: t.line, scene: `${map.name} · 首领巢穴` });
    steps.push({ icon: b.emoji || '👹', who: b.name, text: t.flavor || `${b.name}锁定了你。` });
  } else {
    steps.push({ icon: b.emoji || '👹', who: b.name, text: `${b.desc || '强敌'}—— ${b.name}转过头, 锁定了你。`, scene: `${map.name} · 首领巢穴` });
  }
  steps.push({ icon:'⚔️', who:'你', text: '话不多说。手底下见。' });
  return { steps, lastLabel: '迎战 ▸' };
}
/* ---------- 副本最终Boss初见台词(与招牌机制联动教学) ---------- */
const DUNGEON_BOSS_INTROS = {
  ragefire:    { line:'又一个来送燃料的！怒焰裂谷的火，从来不嫌人油多！', flavor:'塔格尔拍打胸口的熔火护甲，火星四溅。' },
  deadmines:   { line:'迪菲亚的账，就该用冒险者的血来平！', flavor:'范克瑞斯抛着硬币，另一只手摸向背后的火铳。' },
  wailing:     { line:'睡吧……翡翠的梦是甜的，我的梦是荆棘做的。', flavor:'梦魇之王的獠牙滴着琥珀色的毒涎。' },
  bfd:         { line:'陆地上的虫子也敢闯深渊？这里就是你的坟墓。', flavor:'阿库麦尔的触手从黑水里缓缓升起。' },
  shadowfang:  { line:'月神的看守？哈！影牙城堡里只有狼人和我的意志。', flavor:'阿鲁高抬起法杖，四周的狼嚎由远及近。' },
  gnomeregan:  { line:'警报：未授权生物进入。启动——全部清除程序！', flavor:'瑟玛普拉格的机械臂展开成三把电锯。' },
  razorfen:    { line:'亡灵走狗别想踏进刺肋氏族的洞穴！', flavor:'卡尔加·刺肋的骨刺披风哗哗作响。' },
  scarlet:     { line:'不洁者！圣光会净化你的肉体与灵魂！', flavor:'莫格莱尼举起燃着白焰的巨剑。' },
  razorfend:   { line:'冰冷才是永恒。加入冰的静止吧。', flavor:'寒冰之王的眼窝里结出新的冰棱。' },
  uldaman:     { line:'检测到入侵者。重申：图书馆，已闭馆。', flavor:'阿扎达斯石质的关节发出轰鸣。' },
  maraudon:    { line:'父王的石头花园，不接受游客。', flavor:'瑟莱德丝公主的水晶裙裾折射出致命的光。' },
  zulfarrak:   { line:'哈卡的声音在沙里说话——他说，收下你的头颅。', flavor:'祖穆拉恩的骨杖敲响了血祭的鼓点。' },
  sunktemple:  { line:'翡翠之影……你的梦，也是我的饲料。', flavor:'伊兰尼库斯之影在沉水的神殿里若隐若现。' },
  scholomance: { line:'通灵学院的课程表上，下一节是解剖课。教材已备好——就是你。', flavor:'维斯帕教授的骨杖敲了敲实验台。' },
  brd:         { line:'黑铁王座之下，万物皆可熔铸。包括你的傲慢。', flavor:'达格兰坐上炎炉王座，岩浆漫过台阶。' },
  stratholme:  { line:'钟声为亡者而鸣。现在，轮到你了。', flavor:'瑞文戴尔男爵的怨灵之剑渗出蓝雾。' },
  manatombs:   { line:'我的法力实验，需要一具充满潜能的躯体。谢了。', flavor:'沙法尔周身浮起切割空间的法力刃。' },
  steamvault:  { line:'蒸汽是督军的呼吸，水压是督军的拥抱。感受吧。', flavor:'卡利瑟里斯的机械鳃盖喷出高压水汽。' },
  magister:    { line:'你们这是自寻死路。', flavor:'凯尔萨斯轻描淡写地抬手，三枚法球同时点燃。' },
  hol:         { line:'我，曾是泰坦的看守。你，不过是尘埃里的误差。', flavor:'洛肯的巨掌上电弧汇聚成链。' },
  toc:         { line:'竞技场见真章！亮出武器，冠军之路不容退缩！', flavor:'银白十字军的号角响彻看台。' },
  forge:       { line:'灵魂……你们的灵魂闻起来像刚出炉的面包。', flavor:'布隆亚姆的魂炉张开了通风口。' },
  icc:         { line:'你的历史到此为止。让我为你的词条……画上句号。', flavor:'索·维尔的编年史书页无风自动。' },
};
function dungeonBossIntroScript(dg){
  const boss = (dg.bosses && dg.bosses[dg.bosses.length-1]) || { name:'首领', emoji:'👹' };
  const steps = [];
  const t = DUNGEON_BOSS_INTROS[dg.key];
  if (t){
    steps.push({ icon: boss.emoji, who: boss.name, text: t.line, scene: `${dg.name} · 最终层` });
    steps.push({ icon: boss.emoji, who: boss.name, text: t.flavor });
  } else {
    steps.push({ icon: boss.emoji, who: boss.name, text: `${boss.name}挡在副本最深处, 锁定了你。`, scene: `${dg.name} · 最终层` });
  }
  const mechMeta = (typeof BOSS_SIG_MECH_META !== 'undefined' && typeof dungeonSigMechKey === 'function') ? BOSS_SIG_MECH_META[dungeonSigMechKey(dg.key)] : null;
  if (mechMeta) steps.push({ icon: mechMeta.icon, who:'⚠️ 招牌机制', text: `【${mechMeta.name}】${mechMeta.desc}` });
  steps.push({ icon:'⚔️', who:'你', text: '来吧。' });
  return { steps, lastLabel: '开战 ▸' };
}
function ensureStorySeen(){
  if (!state._storySeenActs || typeof state._storySeenActs !== 'object') state._storySeenActs = {};
  return state._storySeenActs;
}
function queueStoryActOpening(actKey){
  const acts = (typeof campaignActs === 'function') ? campaignActs(state && state.faction) : [];
  const act = acts.find(a => a.key === actKey);
  if (!act) return;
  const seen = ensureStorySeen();
  if (seen['open:' + actKey]) return;
  seen['open:' + actKey] = true;
  if (actKey === 'act1') showStoryModal(storyActOpeningScript(act));
  else setTimeout(() => showStoryModal(storyActOpeningScript(act)), 1200);
}
function queueStoryActFinaleThenNext(actKey){
  const acts = (typeof campaignActs === 'function') ? campaignActs(state && state.faction) : [];
  const act = acts.find(a => a.key === actKey);
  if (!act) return;
  const seen = ensureStorySeen();
  seen['fin:' + actKey] = true;
  const idx = acts.findIndex(a => a.key === actKey);
  const next = acts[idx + 1];
  showStoryModal(storyActFinaleScript(act), () => {
    if (next) queueStoryActOpening(next.key);
  });
}

/* ---------- 区域地标与事件链 ---------- */
const ZONE_LANDMARKS = {
  elwynn:  { icon:'🌳', name:'迷雾古橡', text:'你在森林深处找到一棵缠满祈福布条的古橡树。树洞里藏着前人留下的补给。' },
  tirisfal:{ icon:'⚰️', name:'无碑之冢', text:'一片没有墓碑的坟场, 每一座土堆下都曾是一个名字。你默哀片刻, 拾起了一些遗物。' },
  durotar: { icon:'🌵', name:'先祖之岩', text:'红色的巨岩上刻满兽人先祖的姓名。按传统, 你留下了一份供品, 取走了一袋干粮。' },
  westfall:{ icon:'🌾', name:'断风的磨坊', text:'废弃磨坊的齿轮间卡着一只迪菲亚的钱箱。你的撬棍恰好派上用场。' },
  duskwood:{ icon:'🌑', name:'守夜人营地', text:'守夜人的篝火还剩一点余烬。你添了把柴, 从他们藏物资的树洞里取走了一份给养。' },
  hillsbrad:{ icon:'🏔️', name:'南海岸灯塔', text:'灯塔的油早已燃尽, 但望镜还亮着。你用它确认了安全的路线, 顺走了守望者的应急金。' },
  arathi:  { icon:'⚔️', name:'落锤纪念碑', text:'巨石上满是大战的凿痕。石缝里嵌着历年旅人祈愿用的硬币。' },
  searing: { icon:'🌋', name:'焦痕巨人', text:'一具化为焦岩的巨人残骸, 胸口的凹坑积满了火晶。' },
  eastern_plague:{ icon:'☣️', name:'静默教堂', text:'瘟疫之地上唯一没有葬礼的教堂。圣水盆里的水意外地清澈。' },
  hellfire:{ icon:'🟩', name:'断焰堡垒', text:'半熔的兽人战旗下埋着远征军早期的补给箱, 封条完好。' },
  shadowmoon:{ icon:'🌑', name:'亡语祭坛', text:'祭坛上的黑水晶在低语。你没有听, 只是取走了供奉的宝珠。' },
  silverpine:{ icon:'🧪', name:'瘟炼工坊', text:'被遗忘者遗弃的炼金工坊, 坩埚里还剩半瓶稳定的药剂。你按标签收好了它。' },
  redridge:{ icon:'⛏️', name:'断桥矿镇', text:'赤脊山的吊桥断了半边, 桥墩下卡着矿工们撤退时来不及带走的工钱箱。' },
  barrens:{ icon:'🏜️', name:'半人马图腾柱', text:'斑驳的图腾柱上挂满风干的护符。你取下最旧的几枚, 把新布条系了上去。' },
  wetlands:{ icon:'🐉', name:'沉龙浅滩', text:'退潮后的湿地上露出一具巨龙的肋骨, 骨缝里卡着历年商队丢落的货物。' },
  thousand:{ icon:'🪐', name:'断缆吊桥', text:'千针石林的老吊桥在风里吱呀作响。桥头的滑轮组里嵌着几枚松脱的金环。' },
  stranglethorn:{ icon:'🏴‍☠️', name:'血帆藏宝点', text:'血帆海盗的藏宝标记画在一棵倒榕树上。X字下面的铁盒比想象中沉。' },
  burning:{ icon:'🔥', name:'熔脉裂隙', text:'大地裂开一道透着橙光的缝。裂缝边缘冷却的熔壳里凝着火界的结晶。' },
  ungoro:{ icon:'💠', name:'水晶绿洲', text:'环形山的蒸汽湖边长满了发光的水晶。最大的一株根部裹着沉积的晶粉。' },
  silithus:{ icon:'🐛', name:'其拉外墙残垣', text:'甲虫之墙的残垣下散落着其拉人的甲壳碎片, 某些碎片泛着金属光泽。' },
  nagrand:{ icon:'🪐', name:'悬浮岩阶', text:'纳格兰的浮空岩群离水面只有一步。最高那块的凹槽里积着历年飞鸟留下的亮东西。' },
  borean:{ icon:'🐋', name:'海象人渔栅', text:'海象人的渔栅挂着冻结的收获。栅桩上刻着感谢丰饶的符文, 旁边挂着一袋贝壳币。' },
  storm:{ icon:'⚡', name:'风暴残柱', text:'风暴神殿的断柱仍在放电。柱座下压着开拓者留下的雷镀怀表。' },
  icecrown:{ icon:'⚔️', name:'寒冰墓穴', text:'冰层里封着一位银色铠甲的骑士, 手里的符文剑仍在低鸣。你取走了他腰间的徽记。' },
  lochmodan:{ icon:'🏔️', name:'石坝闸房', text:'矮人的石坝闸房里, 老绞盘的储物格塞满了历代闸主的私藏。' },
  ashenvale:{ icon:'🌙', name:'残月井', text:'半枯的月亮井仍泛着银光。井底沉着暗夜精灵留下的银币与一枚哨箭。' },
  desolace:{ icon:'💀', name:'玛格拉石环', text:'石环中央的祭台刻着肯瑞托的旧印。抽开祭台暗格, 里面是一册受潮的账本和钱袋。' },
  feralas:{ icon:'🏛️', name:'精灵断柱林', text:'上等精灵的废墟柱林间, 藤蔓掩着一座仍未上锁的供品龛。' },
  tanaris:{ icon:'⏳', name:'时之漏斗', text:'时光洞穴外, 一只青铜沙漏立在风沙里, 漏斗下积着细碎的金砂。' },
  zangarmarsh:{ icon:'🍄', name:'巨伞菇冠', text:'你爬上最大的伞菇菌冠, 菌褶间藏着孢子人晾晒的荧光珠串。' },
  dragonblight:{ icon:'🐉', name:'龙骨冢', text:'龙骨荒野中央, 巨龙的骸骨堆成山丘。龙颅的眼窝里, 商队塞满了祈福的金器。' },
  stonetalon:{ icon:'🌬️', name:'风蚀巢穴', text:'石爪峰的背风面藏着一处鹰身人巢穴, 巢里的亮东西比想象中值钱。' },
  dustwallow:{ icon:'🌫️', name:'沉没神庙檐角', text:'沼泽退水处露出神庙的檐角。檐兽的铜像嘴里含着一颗潮胀的宝珠。' },
  blasted:{ icon:'🌑', name:'黑门瞭望台', text:'黑暗之门的绿光在瞭望台上一览无余。台面散落着历代戍卫留下的护符。' },
  terokkar:{ icon:'🦴', name:'奥金顿外墙', text:'漂浮的骸骨在外墙边缓缓打转。墙缝里的避难袋属于一位没能回来的考古学家。' },
  bladesedge:{ icon:'🗡️', name:'戈隆骨场', text:'刀锋山的戈隆把猎物骨架堆成界碑。最新一堆里插着半把完好的符文匕首。' },
  netherstorm:{ icon:'🌀', name:'法力熔管阀室', text:'虚空风暴的法力管道在此分流。阀室里散落着虚灵检修工遗忘的精金零件。' },
  howling:{ icon:'⛵', name:'维库沉船', text:'嚎风峡湾的浅滩卡着一艘维库长船。船长室的铁箱被冰封得完好无损。' },
  grizzly:{ icon:'🐻', name:'符文图腾林', text:'达克萨隆的符文图腾在雾里发着幽光。图腾脚下摆着维库人献祭的银器。' },
  sholazar:{ icon:'💎', name:'蛇纹晶柱', text:'盆地深处的晶柱上盘着蛇纹。你敲下几块晶簇时, 头顶的猴群发出抗议的尖叫。' },
  waking:{ icon:'🐲', name:'龙蚀祭坛', text:'觉醒海岸的祭坛被龙蚀晶体半掩。晶体缝隙里凝着高价值的龙血琥珀。' },
  ohnahran:{ icon:'🏹', name:'风誓图腾群', text:'平原上的风誓图腾随风长鸣。图腾基座下, 游牧民埋着谢恩的供品。' },
  azure_span:{ icon:'💠', name:'魔网林荫', text:'碧蓝林海的魔网在树冠间流淌。一处节点残骸里卡着前人采集的奥术髓。' },
  thaldraszus:{ icon:'⏳', name:'时光溢流点', text:'时光之路在此溢出几枚旧币——它们来自尚未发生的年代。你决定不去细想。' },
  dornogal:{ icon:'🗿', name:'石匠工坊', text:'多恩岛的石匠工坊夜未闭户。工作台上整齐码着边角料和一小袋工钱。' },
  hallowfall:{ icon:'✨', name:'圣焰地脉', text:'陨圣峪的地脉裂口涌着稳定的圣焰。焰边的磐石匣里封存着朝圣者的供物。' },
  shadow_point:{ icon:'🕸️', name:'织网哨站', text:'影点的虚空蛛网在哨站废墟间反着紫光。网上挂着未坠的货囊。' },
  shandorah:{ icon:'🌠', name:'星界书梯', text:'沙恩多拉的露天书梯通向星空。梯级暗格里夹着借书未还者留下的押金。' },
  primeus:{ icon:'🌿', name:'谱系苗圃', text:'谱系看护者的苗圃里, 每株植物都挂着族谱木牌。你只取走了成熟落地的荚果。' },
  voidrazor:{ icon:'🌑', name:'剃刀裂隙', text:'虚无剃刀的裂隙边缘, 被吸走实体的物件偶尔会掉回来。你接住了一枚。' },
  eversong_midnight:{ icon:'💠', name:'午夜魔网柱', text:'午夜的永歌森林里, 魔网柱的嗡鸣像摇篮曲。柱座的凹槽里躺着充能的水晶。' },
  harandar:{ icon:'📚', name:'星图穹顶', text:'哈兰达尔的穹顶投影着陌生星座。投影台边缘散落着标定用的星金钉。' },
  azj_kahet:{ icon:'🕸️', name:'蛛丝市集暗巷', text:'艾基-卡赫特的市集暗巷里, 织网者囤积的货箱堆到天花板。最底层的铁箱没人认领。' },
  karesh:{ icon:'🌌', name:'卡雷什星港残环', text:'卡雷什星港的残环仍在缓慢旋转。泊位登记处的抽屉里压着一沓未兑的星港币。' },
  rhovan:{ icon:'🌿', name:'罗凡雨心', text:'生态圆顶的罗凡雨心终年滴翠。树心凹处, 圆顶工程师藏了私人的应急金。' },
  zulaman_midnight:{ icon:'🐻', name:'血祭祭坛', text:'午夜祖阿曼的血祭祭坛上, 石碗里的陈年供品早已风干成宝。' },
};
function zoneLandmarkData(m){
  if (ZONE_LANDMARKS[m.key]) return ZONE_LANDMARKS[m.key];
  return { icon: m.icon || '📍', name: m.name + '的隐秘角落', text: `你在${m.name}的僻静处发现了一处前人留下的藏物点。` };
}
function zoneLandmarkDone(key){ return !!(state._landmarkDone && state._landmarkDone[key]); }
function zoneChainDone(key){ return !!(state._chainDone && state._chainDone[key]); }
function zoneAllCleared(m){
  return m.sub.every((s, i) => state.subzoneCleared && state.subzoneCleared[`${m.key}-${i}`]);
}
function zoneLandmarkReward(m){
  const lvl = Math.max(1, (m.lvlRange && m.lvlRange[1]) || (state.hero && state.hero.lvl) || 1);
  const gold = 120 + lvl * 40;
  const gem = 2;
  state.gold += gold; if (typeof progressionOnGoldGain === 'function') progressionOnGoldGain(gold);
  state.gem += gem;
  log(`📍 地标发现: ${zoneLandmarkData(m).name} · +${fmt(gold)}💰 +${gem}💎`, 'loot');
  if (typeof playSfx === 'function') playSfx('loot');
  if (typeof saveState === 'function') saveState();
}
function runZoneLandmark(m){
  if (zoneLandmarkDone(m.key)) return;
  if (!state._landmarkDone) state._landmarkDone = {};
  const d = zoneLandmarkData(m);
  showStoryModal({
    steps: [
      { icon: d.icon, who:'地标', text: d.text, scene: `${m.name} · ${d.name}` },
      { icon:'🎒', who:'你', text: '不错的收获。把位置记在地图上, 下次再来。' },
    ],
    lastLabel: '收下 ▸',
  }, () => {
    state._landmarkDone[m.key] = true;
    zoneLandmarkReward(m);
    if (typeof markDirty === 'function') markDirty('map');
  });
}
function runZoneChain(m){
  if (zoneChainDone(m.key)) return;
  if (!state._chainDone) state._chainDone = {};
  const b = m.boss || { name:'首领', emoji:'👹' };
  showStoryModal({
    steps: [
      { icon:'📜', who:'区域公告', text: `${m.name}全域的威胁已被清剿。卫戍官向每一位贡献者致谢。`, scene: `${m.name} · 卫戍营地` },
      { icon:'🎖️', who:'卫戍官', text: `${b.name}倒了, ${m.sub.length}个区域的哨站重新点起了灯火。这是你应得的。` },
      { icon:'🗡️', who:'你', text: '替我把它钉在公告栏上。下一站是哪里?' },
    ],
    choices: [
      { label:'领取补给 (金币+宝石)' },
      { label:'只要荣誉 (额外称号)' },
    ],
    onChoice(ci){
      const lvl = Math.max(1, (m.lvlRange && m.lvlRange[1]) || (state.hero && state.hero.lvl) || 1);
      if (ci === 0){
        const gold = 400 + lvl * 120;
        state.gold += gold; if (typeof progressionOnGoldGain === 'function') progressionOnGoldGain(gold);
        state.gem += 8;
        log(`📜 ${m.name}事件链完成 · +${fmt(gold)}💰 +8💎`, 'legend');
      } else {
        state.gem += 4;
        if (!Array.isArray(account.unlockedTitles)) account.unlockedTitles = [];
        const title = `${m.name}解放者`;
        if (!account.unlockedTitles.includes(title)) account.unlockedTitles.push(title);
        log(`📜 ${m.name}事件链完成 · 获得称号「${title}」 +4💎`, 'legend');
      }
      if (typeof playSfx === 'function') playSfx('victory');
      if (typeof saveState === 'function') saveState();
    },
    lastLabel: '完成 ▸',
  }, () => {
    state._chainDone[m.key] = true;
    if (typeof markDirty === 'function') markDirty('map');
  });
}
