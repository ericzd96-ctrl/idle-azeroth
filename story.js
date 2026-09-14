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
  const horde = typeof state !== 'undefined' && state.faction === 'horde';
  const openings = {
    act1: [
      { icon:'📖', who:'旁白', text:horde ? '试炼谷的信号鼓停了，森金村和剃刀岭也没等到换岗的人。' : '北郡的烽火台连续三夜没有点灯，东谷送来的木料车也不见了。', scene:horde ? '杜隆塔尔 · 失联的哨线' : '艾尔文森林 · 失联的哨线' },
      { icon:'✉️', who:'幸存信使', text:horde ? '兽群冲散了我们。烟里有人搬着祭料箱，箱盖烙着火刃的印。' : '豺狼人堵住了路；我还看见迪菲亚的货车趁乱从旁边经过。' },
      { icon:'🎖️', who:'军需官', text:horde ? '先把沿途哨火点起来，再查清祭料被送往何处。' : '先救回巡逻队，再追那批货车。别把两股威胁误当成同一伙人。' },
      { icon:'⚔️', who:'你', text:'把最后一个失联哨站的位置给我。' },
    ],
    act2: [
      { icon:'📖', who:'旁白', text:'一只空马鞍被送进营地，马蹄上还结着远路的泥。', scene:'东部道路 · 失踪的信使' },
      { icon:'✉️', who:'传令兵', text:'这已经是第三名没能送达的人。最后一封信只写到“阿拉希”，后半页被撕走了。' },
      { icon:'🎖️', who:'军需官', text:'先查断路，再追收件人。修道院附近的封锁，或许能解释那些消失的信。' },
      { icon:'⚔️', who:'你', text:'我会把信和人一起带回来。' },
    ],
    act3: [
      { icon:'📖', who:'旁白', text:'两份战报同时抵达：灼热峡谷有封印石失窃，东部疫线则在请求撤离。', scene:'东部战线 · 两份求援' },
      { icon:'🎖️', who:'军需官', text:'先核对奥达曼的古代铭文，再把能用的拓印送往避难点。两处危机不一定出自同一只手。' },
      { icon:'✉️', who:'疫区信使', text:'静默教堂还亮着灯。只要城外的路能通，里面的人就有机会出来。' },
      { icon:'⚔️', who:'你', text:'先保住那条撤离路。' },
    ],
    act4: [
      { icon:'📖', who:'旁白', text:'黑暗之门另一侧的回信晚了七天。最后一批车队停在地狱火半岛的路口。', scene:'黑暗之门 · 外域求援' },
      { icon:'🎖️', who:'远征军斥候', text:'前线需要补给。影月谷的巡逻线也在收紧，黑暗神殿的路不会自己打开。' },
      { icon:'🎖️', who:'军需官', text:'这是一场新的战事。先让车队安全通过，再和斥候会合。' },
      { icon:'⚔️', who:'你', text:'给我一张标着失联路口的地图。' },
    ],
    act5: [
      { icon:'📖', who:'旁白', text:'来自北境的船靠岸时，甲板上只有一盏信号灯还亮着。', scene:'北境航线 · 最后一封战报' },
      { icon:'✉️', who:'北境信使', text:'龙骨荒野的路被亡灵车队占住。守军正在等下一批补给，也在等能带他们向冰冠推进的人。' },
      { icon:'🎖️', who:'军需官', text:'从北风苔原登陆，找出能让攻城队通过的路。最后一战不能让他们孤军前进。' },
      { icon:'⚔️', who:'你', text:'先点亮海岸的信号火。' },
    ],
  };
  return { steps: openings[act.key] || [{ icon:'📖', who:'旁白', text:act.brief }], lastLabel:'接下任务 ▸' };
}
function storyActFinaleScript(act){
  const endings = {
    act1:{ who:'值守士兵', icon:'🛡️', text:'今夜轮到我们守灯。你带回的失踪名单，终于能一笔一笔划去。', reply:'把新来的求援信给我。' },
    act2:{ who:'获救信使', icon:'✉️', text:'我会亲手把信送到下一座哨站。疫线的求援，别让它也等三天。', reply:'东部的人还在等路通。' },
    act3:{ who:'避难者', icon:'🕯️', text:'城外的车还在，我们能走。请把留在里面的人名也带出去。', reply:'名单我会送到他们家里。' },
    act4:{ who:'远征军斥候', icon:'🎖️', text:'神殿外的伤员已经归队。下一封从北境寄来的信，我替你留在军帐里。', reply:'北境还有人等着回信。' },
    act5:{ who:'北境守军', icon:'🛡️', text:'信号火没有熄。我们会在这里把路重新修好。', reply:'先把阵亡者的名字送回家。' },
  };
  const ending = endings[act.key] || { who:'幸存者', icon:'🕯️', text:'道路重新通行了。', reply:'我们继续前进。' };
  return {
    steps: [
      { icon:'📖', who:'旁白', text: act.completeText || '这一幕的威胁尘埃落定。' },
      { icon:ending.icon, who:ending.who, text:ending.text },
      { icon:'🎖️', who:'军需官', text: `${act.numeral}的战报与补给已备好。${act.reward.title ? '你的新称号是「' + act.reward.title + '」。' : ''}` },
      { icon:'⚔️', who:'你', text:ending.reply },
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
  shadowmoon: { line:'神殿外墙由我把守。你们休想踏进统帅的领地。', flavor:'伊利达雷守门官抽出魔刃，身后的巡逻队封住退路。' },
  borean: { line:'咔哧咔哧……冰层下的猎物, 总是跑不掉的。', flavor:'卡格瓦的下颚滴着冰水。' },
  storm: { line:'凡人! 竟敢直视风暴的容颜! 我, 索林姆, 判你死刑!', flavor:'风暴峭壁的天空随他的怒吼劈下一道闪电。' },
  icecrown: { line:'封锁线还在，我就不会让你的攻城队靠近王座。', flavor:'天灾攻城统领挥动符文战刃，亡灵从外墙下列队而出。' },
  lochmodan: { line:'莫格罗什的地盘, 石头都比你的脑袋硬!', flavor:'莫格罗什举起比人还高的碎石锤。' },
  ashenvale: { line:'暗夜精灵的月亮井, 也救不了堕入暗影的你。', flavor:'萨特领主的尾巴在身后愉悦地摇摆。' },
  arathi: { line:'托尔贝恩的斧头已经几百年没尝过活人的血了。', flavor:'托尔贝恩的亡魂从断墙后显形。' },
  desolace: { line:'凡间的勇士, 你的骸骨会成为我新的收藏。', flavor:'瑟莱德丝公主的石化裙裾摩擦出刺响。' },
  feralas: { line:'绿龙的荣耀不容侵犯, 变节者更不例外。', flavor:'伊兰尼库斯之影从翡翠色的雾里浮现。' },
  tanaris: { line:'嘶……沙子里又埋进一个不知死活的名字。', flavor:'加兹瑞拉的尾部扫塌了半面沙墙。' },
  zangarmarsh: { line:'纳迦的荣耀, 不容蘑菇沼泽里的臭虫置喙。', flavor:'瓦斯琪的蛇尾在水面划出优雅的弧线。' },
  dragonblight: { line:'这条北上的路，活人一步也过不去。', flavor:'霜骨龙将掠过龙骨冢，吐息把旧路冻成白色。' },
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
  icc:         { line:'你们一路走到这里，终究也只是我的新兵。', flavor:'巫妖王举起霜之哀伤，冰封王座前的风雪骤然静止。' },
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
  elwynn:  { icon:'🌳', name:'迷雾古橡', text:'古橡上的求救布条记着三座哨站的失联日期。树洞里留有巡逻队的应急箱，泥地上的新车辙却绕开了霍格的巢穴。', followUp:'先把布条送回北郡，再追那道车辙。' },
  tirisfal:{ icon:'⚰️', name:'无碑之冢', text:'无名坟旁立着一盏仍有油的灯，灯罩内侧刻有叛逃者的集合时辰。守墓人留下了给巡路者的急救包。', followUp:'记下集合时辰，把灯留给守墓人。' },
  durotar: { icon:'🌵', name:'先祖之岩', text:'先祖之岩背面的哨兵留言被烟熏黑了：试炼谷的祭料车向剃刀岭驶去，车轮烙着火刃印记。岩缝里还压着备用水袋。', followUp:'把水袋带给失联的哨兵，沿车辙继续找。' },
  westfall:{ icon:'🌾', name:'断风的磨坊', text:'废弃磨坊的齿轮间卡着一只迪菲亚的钱箱。你的撬棍恰好派上用场。' },
  duskwood:{ icon:'🌑', name:'守夜人营地', text:'篝火已经熄了，值夜人的哨灯却被人摆成指向北路的一行。压在灯下的信袋写着“阿拉希”，营地还留有应急给养。', followUp:'把信袋交回守夜人，先查这条北路。' },
  hillsbrad:{ icon:'🏔️', name:'南海岸灯塔', text:'灯塔的油被搬空，望镜下卡着失踪信使的半页路线图。图上的终点被圈在阿拉希；储物柜里还有未用完的灯油与给养。', followUp:'补亮灯塔，把路线图送给下一班信使。' },
  arathi:  { icon:'⚔️', name:'落锤纪念碑', text:'纪念碑后的旧信箱没有上锁。里面的密令封蜡印着修道院纹章，收件人一栏被刻意刮掉，信箱底部仍留有路费。', followUp:'封好证物，沿寄信人的路继续查。' },
  searing: { icon:'🌋', name:'焦痕巨人', text:'焦岩残骸下压着烧去一角的货单：“封印石，奥达曼出土”。看守货单的矿工留下了一袋冷却火晶。', followUp:'带上货单，去奥达曼核对铭文。' },
  eastern_plague:{ icon:'☣️', name:'静默教堂', text:'教堂里的净水盆旁摆着尚未用完的药布。地窖传来敲门声，几名幸存者正等一条通往斯坦索姆城外的撤离路。', followUp:'把给养分给他们，我去找能通车的路。' },
  hellfire:{ icon:'🟩', name:'断焰堡垒', text:'半熔的旗帜下压着远征军旧路标。路标背面写着两处失联补给站的名字，旁边的箱子还存着一批未发出的水袋。', followUp:'把路标立回去，让后来的车队看见。' },
  shadowmoon:{ icon:'🌑', name:'亡语祭坛', text:'黑水晶的低语掩住了远处巡逻的脚步。斥候在祭坛背面刻下黑暗神殿外墙的换岗时辰，并留了补给。', followUp:'只记时辰，不碰水晶。' },
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
  borean:{ icon:'🐋', name:'海象人渔栅', text:'海象人的渔栅旁立着一根被风雪磨白的航标。栅桩上有给新来船队的浅滩警告，渔人还备好了交换补给。', followUp:'把浅滩标在地图上，别让下一艘船搁浅。' },
  storm:{ icon:'⚡', name:'风暴残柱', text:'断柱仍在放电，柱座下压着开拓者的哨图和备用雷镀怀表。哨图用红线标出了通往冰冠的避雪路。', followUp:'先抄下路线，再把哨图交给攻城队。' },
  icecrown:{ icon:'⚔️', name:'寒冰墓穴', text:'冰层封着一名银甲守军，他的盾背上刻有一条未被亡灵封死的山口。附近的补给匣仍可打开，姓名牌则留在盾上。', followUp:'先记住他的名字，再把路带给活着的人。' },
  lochmodan:{ icon:'🏔️', name:'石坝闸房', text:'矮人的石坝闸房里, 老绞盘的储物格塞满了历代闸主的私藏。' },
  ashenvale:{ icon:'🌙', name:'残月井', text:'半枯的月亮井仍泛着银光。井底沉着暗夜精灵留下的银币与一枚哨箭。' },
  desolace:{ icon:'💀', name:'玛格拉石环', text:'石环中央的祭台刻着肯瑞托的旧印。抽开祭台暗格, 里面是一册受潮的账本和钱袋。' },
  feralas:{ icon:'🏛️', name:'精灵断柱林', text:'上等精灵的废墟柱林间, 藤蔓掩着一座仍未上锁的供品龛。' },
  tanaris:{ icon:'⏳', name:'时之漏斗', text:'时光洞穴外, 一只青铜沙漏立在风沙里, 漏斗下积着细碎的金砂。' },
  zangarmarsh:{ icon:'🍄', name:'巨伞菇冠', text:'你爬上最大的伞菇菌冠, 菌褶间藏着孢子人晾晒的荧光珠串。' },
  dragonblight:{ icon:'🐉', name:'龙骨冢', text:'龙骨冢的雪地上，亡灵车辙从巨龙遗骸之间穿过。守望者在龙颅旁留下了给巡路队的火油和一张北行示意图。', followUp:'把火油送去哨站，北行路线已经有了。' },
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
const ZONE_CHAIN_EVENTS = {
  elwynn:{ who:'巡逻队长', opening:'北郡、闪金镇与东谷的哨火同时亮了起来。迪菲亚货车在林边丢下一本沾泥的账簿。', report:'霍格的袭击与货车并非一伙，却让我们无暇搜车。账簿的最后一页写着“死亡矿井”。', response:'把账簿送回哨站，我去清理挡路的豺狼人。' },
  durotar:{ who:'剃刀岭斥候', opening:'试炼谷、森金村和剃刀岭的信号鼓重新响起。巡路队从荒地捡回一只烙有火刃印记的祭料箱。', report:'兽群堵住路口，教徒便趁乱搬箱子。最近的车辙停在怒焰裂谷入口。', response:'先让斥候安全通过，再去看那座裂谷。' },
  tirisfal:{ who:'布瑞尔守墓人', opening:'三处墓园哨线恢复联络，一盏写着集合时辰的旧灯被送回布瑞尔。', report:'叛逃者没能再截住信使，仍有人在壁垒附近接应他们。', response:'把名字写入记录，让下一班守卫认得出他们。' },
  duskwood:{ who:'守夜人', opening:'最后一盏哨灯重新点亮，失踪信使的信袋在暮色镇北路被找到了。', report:'袋中只剩半张路图，所有被刮去的地名都指向阿拉希。', response:'把路图拓下来，下一站去阿拉希。' },
  hillsbrad:{ who:'灯塔守望者', opening:'南海岸的灯塔恢复照明，三辆失踪的补给车终于在山路旁被找到。', report:'车厢里没有货，只有写着“阿拉希收件人”的运单。', response:'护送信使出山，我去找那位收件人。' },
  arathi:{ who:'路口信使', opening:'阿拉希各路口重新通行，被截下的信件从旧堡地窖里搬了出来。', report:'信件封蜡来自血色修道院。名单上有仍未回家的信使。', response:'先抄下名单，再按换岗时间进入修道院。' },
  searing:{ who:'矿工', opening:'灼热峡谷的矿道重新开通，一车封印石的空木箱被推到营地。', report:'装箱货单写着奥达曼。我们不知道石头能做什么，但能认出箱上的矿工记号。', response:'带上货单，去古库核对石头的来历。' },
  eastern_plague:{ who:'静默教堂守护者', opening:'疫区三处巡路点传回信号，教堂地窖的门终于敢从里面打开。', report:'幸存者还在等撤离。斯坦索姆城外的路被密使堵住，车队过不去。', response:'药布先留给他们，我去打通城外的路。' },
  hellfire:{ who:'远征军车队长', opening:'地狱火半岛的失联补给站重新互通信号，车队排在路口等命令。', report:'封锁线还在前方。只要路口守军退下，水袋和药箱就能运到影月谷。', response:'让车队待命，我先去处理封锁线。' },
  shadowmoon:{ who:'远征军斥候', opening:'影月谷的巡逻路线已画在地图上，黑暗神殿外墙的换岗时辰也有了记录。', report:'神殿前仍有守军。路一旦打通，伤员与补给便能一同抵达城墙下。', response:'把地图交给攻城队，我去清理前路。' },
  borean:{ who:'登陆队水手', opening:'北风苔原的海岸信号火依次亮起，后续船队在雾里看见了靠岸处。', report:'补给能上岸了。沿龙骨荒野北行的旧路，还需要有人先去探。', response:'把浅滩图留给船长，我走在车队前面。' },
  dragonblight:{ who:'巡路守望者', opening:'龙骨荒野的旧路不再失联，雪地里终于能分清守军与亡灵车队的痕迹。', report:'亡灵向冰冠北去；穿过风暴峭壁的山路或许能绕开它们的主力。', response:'把车辙标给守军，我去试那条山路。' },
  storm:{ who:'开拓者', opening:'风暴峭壁的残柱下，哨图被摊在干燥的石台上。', report:'避雪路已经标好。攻城队还需要有人先夺下冰冠堡垒外的路口。', response:'让攻城队照图行军，我先去路口。' },
  icecrown:{ who:'北境守军', opening:'冰冠外的最后几处哨线恢复联络，攻城信号传到了后方。', report:'堡垒仍在前方。我们等你夺下外侧封锁线，就能把补给与伤员一起送上来。', response:'把信号火守住，我去打开那道门。' },
};
function zoneChainScript(m){
  const event = ZONE_CHAIN_EVENTS[m.key];
  if (event) return {
    steps:[
      { icon:'📖', who:'旁白', text:event.opening, scene:`${m.name} · 巡路营地` },
      { icon:'🎖️', who:event.who, text:event.report },
      { icon:'⚔️', who:'你', text:event.response },
    ],
  };
  const localBosses = typeof state !== 'undefined' ? state.bossesKilled : null;
  const accountBosses = typeof account !== 'undefined' ? account.bossesKilled : null;
  const bossDefeated = !!((localBosses?.[m.key] || 0) + (accountBosses?.[m.key] || 0));
  return { steps:[
    { icon:'📖', who:'旁白', text:`${m.name}的${m.sub.length}处巡路点重新通行。营地正在核对失踪者与补给的记录。`, scene:`${m.name} · 巡路营地` },
    { icon:'🎖️', who:'卫戍官', text:bossDefeated ? '区域首领已被击退；仍需有人守住重新打开的道路。' : '巡路点虽已清理，区域首领仍在前方。我们需要有人继续守住道路。' },
    { icon:'⚔️', who:'你', text:'把这份战报留在营地，下一班巡路队会用得上。' },
  ] };
}
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
      { icon:'🎒', who:'你', text: d.followUp || '把地点记在地图上，收好能带走的物资。' },
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
  const scene = zoneChainScript(m);
  showStoryModal({
    steps: scene.steps,
    choices: [
      { label:'领取补给（金币+宝石）' },
      { label:'留下姓名（称号+宝石）' },
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
        const title = `${m.name}守望者`;
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
