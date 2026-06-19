/* =========================================================
   companion_ext.js — 随从大修(data.js 之后加载)
   - 给原有 10 个"一方霸主"随从打上 紫色品质 + 专属加成
   - 扩充阵容并强化身份感
   - 当前版本统一走: 5 个主动技能 + 1 个专属技
   - 品质 / 星级 / 额外倍率 负责拉开随从强弱
   ========================================================= */
(function extendCompanions() {
  if (typeof COMPANIONS === 'undefined') return;

  // 原有随从 → 紫色"一方霸主"+ 专属加成(技能已是4个)
  const purple = {
    fordring:  { role:'tank', bonus:{hpPct:8, defPct:5} },
    varian:    { bonus:{atkPct:5, hpPct:5} },
    thrall:    { bonus:{atkPct:5, vers:4} },
    illidan:   { bonus:{atkPct:6, critdPct:6} },
    arthas:    { bonus:{atkPct:5, leech:5} },
    jaina:     { bonus:{atkPct:5, crit:4} },
    sylvanas:  { bonus:{atkPct:5, crit:5} },
    anduin:    { bonus:{hpPct:8, regFlat:6} },
    tyrande:   { bonus:{hpPct:6, vers:5} },
    malfurion: { bonus:{hpPct:7, regFlat:5} },
  };
  for (const c of COMPANIONS) {
    const p = purple[c.key];
    if (p) { c.quality = 'purple'; if (p.role) c.role = p.role; c.bonus = p.bonus; }
  }

  const D = (name, icon, desc, mul, extra) => Object.assign({ name, icon, desc, type:'dmg', mul, cd:8 }, extra || {});
  const H = (name, icon, heal, cd) => ({ name, icon, desc:`恢复${Math.round(heal*100)}%生命`, type:'heal', heal, cd:cd||14 });
  const B = (name, icon, buff, desc, cd) => ({ name, icon, desc, type:'buff', buff, duration:6000, cd:cd||30 });

  const add = [
    // ---------- 白(杂兵,1技能)----------
    { key:'sw_guard',  name:'暴风城卫兵', emoji:'💂', quality:'white', role:'tank', desc:'城门口站岗的卫兵', bonus:{hpPct:3},  skills:[D('盾击','🛡️','2倍伤害',2,{cd:6})] },
    { key:'horde_grunt',name:'部落步兵', emoji:'🪓', quality:'white', role:'dps',  desc:'奥格瑞玛的新兵',   bonus:{atkPct:2}, skills:[D('劈砍','⚔️','2倍伤害',2,{cd:6})] },
    { key:'apprentice',name:'见习法师',  emoji:'🧑‍🎓', quality:'white', role:'dps', desc:'达拉然的学徒',     bonus:{crit:2},   skills:[D('火花','🔥','2倍伤害',2,{cd:6})] },
    { key:'acolyte',   name:'侍僧',      emoji:'🕯️', quality:'white', role:'heal', desc:'修道院的侍僧',     bonus:{regFlat:2},skills:[H('微光术','✨',0.1,10)] },
    { key:'scout',     name:'哨兵',      emoji:'🏹', quality:'white', role:'dps',  desc:'边境的斥候',       bonus:{spdPct:3}, skills:[D('快速射击','🎯','2倍伤害',2,{cd:5})] },

    // ---------- 绿(小有名气,2技能)----------
    { key:'guard_cap', name:'卫兵队长',  emoji:'🪖', quality:'green', role:'tank', desc:'暴风城卫戍队长', bonus:{hpPct:5,defPct:2}, skills:[B('盾墙','🛡️','shield','8秒减伤'),D('重盾击','💥','3倍伤害',3)] },
    { key:'al_ranger', name:'联盟游侠',  emoji:'🏹', quality:'green', role:'dps',  desc:'闻名一隅的神射手', bonus:{atkPct:3,crit:2}, skills:[D('瞄准射击','🎯','3倍伤害',3),D('多重射击','🏹','2.5倍范围',2.5)] },
    { key:'field_medic',name:'战地医师', emoji:'⛑️', quality:'green', role:'heal', desc:'前线的救死扶伤者', bonus:{regFlat:3,hpPct:2}, skills:[H('急救','💉',0.15,12),B('鼓舞','📯','battleShout','10秒攻击提升')] },
    { key:'shaman_app',name:'萨满学徒',  emoji:'⚡', quality:'green', role:'dps',  desc:'初通元素的萨满',   bonus:{atkPct:3}, skills:[D('闪电箭','⚡','2.5倍伤害',2.5),B('大地之盾','🪨','earthShield','8秒防御提升')] },
    { key:'berserker', name:'狂战士',    emoji:'😡', quality:'green', role:'dps',  desc:'嗜血的蛮族战士',   bonus:{atkPct:3}, skills:[B('鲁莽','💢','berserk','10秒攻击攻速'),D('顺劈','🌀','3倍伤害',3)] },

    // ---------- 蓝(中流砥柱,3技能)----------
    { key:'saurfang', name:'萨鲁法尔大王', emoji:'🪓', iconName:'classicon_warrior', quality:'blue', role:'dps', desc:'部落的荣耀老兵', bonus:{atkPct:4,critdPct:5}, skills:[D('致死劈砍','⚔️','3倍伤害',3),D('压制','💥','4倍伤害',4),B('战吼','📯','berserk','攻击攻速提升')] },
    { key:'muradin',  name:'穆拉丁·铜须', emoji:'🔨', quality:'blue', role:'tank', desc:'铁炉堡的山丘之王', bonus:{defPct:7,hpPct:5}, skills:[D('雷霆一击','⚡','3倍伤害',3),B('盾墙','🛡️','shield','减伤'),D('强力一击','💢','4倍伤害',4)] },
    { key:'maraad',   name:'大主教玛拉达尔', emoji:'🌟', quality:'blue', role:'heal', desc:'德莱尼的圣光使者', bonus:{hpPct:5,regFlat:4}, skills:[H('圣光术','✨',0.2,12),B('圣盾','🟡','sacredShield','防御回复'),D('圣光审判','⚖️','3倍伤害',3)] },
    { key:'rexxar',   name:'雷克萨', emoji:'🐗', quality:'blue', role:'dps', desc:'孤胆兽王', bonus:{atkPct:3,crit:3}, skills:[D('瞄准射击','🎯','3倍伤害',3),B('野兽狂怒','🐻','bestial','攻击提升'),D('爆裂射击','💥','4倍伤害',4)] },
    { key:'valeera',  name:'瓦蕾拉', emoji:'🗡️', quality:'blue', role:'dps', desc:'血精灵潜行者', bonus:{crit:4,spdPct:4}, skills:[D('背刺','🔪','3倍必暴',3,{alwaysCrit:true}),D('影袭','🌑','3倍伤害',3),B('疾跑','💨','rapidFire','攻速提升')] },
    { key:'kael',     name:'凯尔萨斯·逐日者', emoji:'☀️', quality:'blue', role:'dps', desc:'血精灵的太阳之王', bonus:{atkPct:4,crit:3}, skills:[D('火焰冲击','🔥','3倍灼烧',3,{dot:true}),D('烈焰风暴','🌋','4倍伤害',4),D('法力梭镖','🔷','3倍伤害',3)] },

    // ---------- 橙(传奇,5技能)----------
    { key:'medivh',   name:'麦迪文', emoji:'🔮', quality:'orange', role:'dps', desc:'最后的守护者', bonus:{atkPct:8,crit:5,critdPct:8}, skills:[D('奥术冲击','🔮','4倍伤害',4),D('火焰冲击','🔥','5倍灼烧',5,{dot:true}),B('守护者之力','✨','kings','攻防提升'),D('变形术','🐑','4倍伤害',4),B('奥术强能','🌀','bestial','攻击提升')] },
    { key:'azshara',  name:'艾萨拉', emoji:'👑', quality:'orange', role:'dps', desc:'纳迦女王', bonus:{atkPct:8,critdPct:10}, skills:[D('魔力风暴','🌀','4倍伤害',4),D('蛊惑','💫','5倍伤害',5),B('海妖之歌','🎵','battleShout','攻击提升'),D('奥术爆发','💥','5倍伤害',5),B('女王降临','👑','berserk','攻击攻速')] },
    { key:'ragnaros', name:'拉格纳罗斯', emoji:'🔥', quality:'orange', role:'dps', desc:'炎魔之王', bonus:{atkPct:9,critdPct:8}, skills:[D('熔岩爆裂','🌋','5倍灼烧',5,{dot:true}),D('烈焰冲击','🔥','4倍伤害',4),D('火焰新星','☄️','6倍伤害',6),B('元素之怒','⚡','windfury','攻速提升'),D('火焰之子','🔥','5倍伤害',5)] },
    { key:'kelthuzad',name:'克尔苏加德', emoji:'☠️', quality:'orange', role:'dps', desc:'天灾的巫妖', bonus:{atkPct:7,leech:6}, skills:[D('冰霜之球','❄️','4倍伤害',4),D('死亡凋零','💀','5倍灼烧',5,{dot:true}),B('寒冰屏障','🧊','shield','减伤'),D('亡者复生','🧟','5倍伤害',5),B('巫妖之触','👻','shadowstep','攻击提升')] },
    { key:'lichking', name:'巫妖王', emoji:'❄️', quality:'orange', role:'tank', desc:'冰封王座之主', bonus:{atkPct:7,hpPct:10,leech:5}, skills:[D('霜之哀伤','🗡️','5倍吸血',5,{lifeSteal:0.3}),D('死亡缠绕','💀','4倍伤害',4),D('复活瘟疫','🦠','5倍灼烧',5,{dot:true}),B('不羁亡魂','👑','kings','攻防提升'),B('冰封王座','🛡️','sacredShield','防御回复')] },
    { key:'kiljaeden',name:'基尔加丹', emoji:'😈', quality:'orange', role:'dps', desc:'欺诈者', bonus:{atkPct:8,critdPct:10,leech:5}, skills:[D('毁灭','💥','6倍伤害',6),D('黑暗之球','🟣','5倍灼烧',5,{dot:true}),D('痛苦','🔥','5倍伤害',5),B('燃烧军团','😈','berserk','攻击攻速'),D('虚空崩裂','🌌','6倍伤害',6)] },
  ];
  for (const c of add) if (!COMPANIONS.find(x => x.key === c.key)) COMPANIONS.push(c);
  const reinforcements = [
    { key:'garrosh', name:'加尔鲁什·地狱咆哮', emoji:'🩸', quality:'purple', role:'tank', desc:'钢铁部落的暴怒战帅', bonus:{hpPct:7,defPct:6,atkPct:3}, skills:[D('铁星猛砸','🪓','3.5倍伤害',3.5,{cd:8}),B('钢铁壁垒','🛡️','shield','8秒减伤',18),D('血吼裂地','🩸','4.5倍伤害',4.5,{cd:14}),H('战帅续战','❤️',0.16,22)] },
    { key:'cairne', name:'凯恩·血蹄', emoji:'🐂', quality:'blue', role:'tank', desc:'雷霆崖的高山酋长', bonus:{hpPct:6,defPct:5}, skills:[D('战争践踏','🦬','3倍伤害',3,{cd:9}),B('先祖护佑','🪶','earthShield','8秒防御提升',18),H('大地母亲之赐','🌾',0.18,20)] },
    { key:'bolvar', name:'伯瓦尔·弗塔根', emoji:'👑', quality:'purple', role:'tank', desc:'烈焰王座的灰烬守望者', bonus:{hpPct:7,defPct:5,vers:4}, skills:[D('炽焰审判','🔥','3倍伤害',3,{cd:8}),B('灰烬壁垒','🛡️','sacredShield','8秒神圣庇护',18),H('王者坚忍','💛',0.16,22),B('暴风城号令','📯','kings','8秒攻防提升',26)] },
    { key:'chen', name:'陈·风暴烈酒', emoji:'🍺', quality:'blue', role:'tank', desc:'四处游历的熊猫酒仙', bonus:{hpPct:5,defPct:4,regFlat:3}, skills:[D('醉拳','🍺','3倍伤害',3,{cd:8}),B('活血酒','🫙','bark','8秒减伤与回复',18),H('酒雾调息','🌫️',0.16,20)] },
    { key:'rehgar', name:'雷加·大地怒嚎', emoji:'⚡', quality:'purple', role:'heal', desc:'角斗场中走出的风暴萨满', bonus:{hpPct:5,regFlat:5,vers:4}, skills:[H('治疗链','🌊',0.18,12),B('英勇','⚡','windfury','10秒攻速提升',24),B('大地之盾','🪨','earthShield','8秒护持',18),D('闪电链','⛓️','3.5倍伤害',3.5,{cd:10})] },
    { key:'velen', name:'先知维伦', emoji:'🌟', quality:'orange', role:'heal', desc:'德莱尼的先知与圣光引路人', bonus:{hpPct:8,regFlat:7,spi:3}, skills:[H('纳鲁赐福','🌟',0.24,12),B('圣光共鸣','✨','kings','10秒全队强化',22),B('群体屏障','🛡️','sacredShield','8秒防护',18),H('命运回溯','⏮️',0.32,24),D('神圣新星','💫','3.8倍伤害',3.8,{cd:11})] },
    { key:'liadrin', name:'莉亚德琳', emoji:'🌞', quality:'purple', role:'heal', desc:'血骑士的炽热领袖', bonus:{hpPct:5,atkPct:3,regFlat:4}, skills:[D('公正圣印','⚖️','3倍伤害',3,{cd:8}),B('圣佑术','🟡','shield','8秒护盾',18),H('圣光灌注','🌞',0.18,14),B('银月战旗','🚩','battleShout','10秒攻击提升',24)] },
    { key:'alexstrasza', name:'阿莱克丝塔萨', emoji:'🐉', quality:'orange', role:'heal', desc:'生命缚誓者与红龙女王', bonus:{hpPct:8,regFlat:8,spi:4}, skills:[H('生命脉冲','💗',0.22,10),D('红龙烈焰','🔥','4倍伤害',4,{cd:10}),B('龙眠庇护','🛡️','sacredShield','8秒厚重护盾',18),H('生命绽放','🌺',0.34,24),B('赐生龙息','🌈','kings','10秒全队强化',24)] },
    { key:'cenarius', name:'塞纳留斯', emoji:'🌲', quality:'orange', role:'heal', desc:'半神森林之王', bonus:{hpPct:8,regFlat:6,vers:4}, skills:[D('根须缠绕','🌿','3.5倍伤害',3.5,{cd:9}),B('树皮庇护','🌳','bark','8秒减伤回复',18),H('自然绽放','🍃',0.22,12),B('野性赐福','🦌','kings','10秒攻防提升',24),D('星群坠落','🌠','4.8倍伤害',4.8,{cd:16})] },
    { key:'khadgar', name:'卡德加', emoji:'📚', quality:'purple', role:'dps', desc:'艾泽拉斯的首席守护法师', bonus:{atkPct:5,crit:4,intPct:4}, skills:[D('奥术弹幕','✨','3.5倍伤害',3.5,{cd:8}),D('时间裂隙','⏳','4倍伤害',4,{cd:12}),B('时间扭曲','⌛','rapidFire','10秒加速',24),B('奥术智慧','📘','battleShout','10秒法能增幅',24)] },
    { key:'maiev', name:'玛维·影歌', emoji:'🦉', quality:'purple', role:'dps', desc:'守望者领袖与黑暗追猎者', bonus:{atkPct:5,crit:5,spdPct:5}, skills:[D('影袭飞轮','🪃','3.5倍伤害',3.5,{cd:8}),D('复仇突刺','🔪','4倍伤害',4,{cd:12}),B('守望者追猎','👁️','rapidFire','10秒迅捷猎杀',22),D('禁锢匕雨','🌑','4.5倍伤害',4.5,{cd:16})] },
    { key:'grommash', name:'格罗玛什·地狱咆哮', emoji:'🪓', quality:'orange', role:'dps', desc:'战歌氏族永不停息的怒潮', bonus:{atkPct:8,crit:5,critdPct:8}, skills:[D('血吼横扫','🪓','4.2倍伤害',4.2,{cd:8}),B('玛诺洛斯之血','🩸','berserk','10秒狂暴',20),D('地狱咆哮','😡','5倍伤害',5,{cd:14}),D('斩首','💀','6倍伤害',6,{cd:18}),H('狂战愈合','❤️',0.12,20)] },
    { key:'voljin', name:'沃金', emoji:'🗿', quality:'blue', role:'dps', desc:'暗影猎手与部落之眼', bonus:{atkPct:4,crit:3,vers:3}, skills:[D('暗影猎箭','🏹','3倍伤害',3,{cd:8}),D('巫毒咒杀','🕯️','3.5倍伤害',3.5,{cd:11,dot:true}),B('巨魔再生','🧿','shadowstep','10秒吸血再生',20)] },
    { key:'akama', name:'阿卡玛', emoji:'🗡️', quality:'blue', role:'dps', desc:'破碎者的沉默利刃', bonus:{atkPct:4,spdPct:4,crit:3}, skills:[D('影刃突袭','🗡️','3倍伤害',3,{cd:8}),D('灰舌连斩','🌑','3.8倍伤害',3.8,{cd:12}),B('破碎潜行','💨','rapidFire','10秒迅捷',22)] }
  ];
  for (const c of reinforcements) if (!COMPANIONS.find(x => x.key === c.key)) COMPANIONS.push(c);

  const byKey = key => COMPANIONS.find(c => c.key === key);
  const setComp = (key, patch) => { const c = byKey(key); if (c) Object.assign(c, patch); };
  const setSkill = (key, name, patch) => {
    const c = byKey(key); if (!c) return;
    const sk = (c.skills || []).find(s => s.name === name);
    if (sk) Object.assign(sk, patch);
  };
  const setSig = (key, sig) => { const c = byKey(key); if (c) c.signature = sig; };

  // ---------- 原始十传奇随从：强化身份感 ----------
  setComp('fordring',  { hpMul:1.12, defMul:1.18, atkMul:1.04, aggroBonus:0.08 });
  setSkill('fordring','圣光审判',{ mul:3, heal:0.08, debuff:'sunder', cd:9 });
  setSkill('fordring','圣盾守护',{ buff:'divine', duration:9000, buffTarget:'companion', cd:20 });
  setSkill('fordring','灰烬觉醒',{ mul:5, alwaysCrit:true, cd:18 });
  setSkill('fordring','圣疗术',{ heal:0.22, healTarget:'smart', cd:26 });

  setComp('varian',    { hpMul:1.08, defMul:1.12, atkMul:1.08, aggroBonus:0.05 });
  setSkill('varian','冲锋',{ mul:2.8, stun:true, cd:7 });
  setSkill('varian','破甲',{ mul:3.2, debuff:'sunder', cd:10 });
  setSkill('varian','剑刃风暴',{ mul:5.5, slow:true, cd:22 });
  setSkill('varian','怒吼',{ buff:'battleShout', duration:10000, buffTarget:'hero', cd:26 });

  setComp('thrall',    { hpMul:1.06, defMul:1.10, atkMul:1.05, aggroBonus:0.04 });
  setSkill('thrall','闪电箭',{ mul:2.6, cd:6 });
  setSkill('thrall','大地之盾',{ buff:'earthShield', duration:9000, buffTarget:'hero', cd:18 });
  setSkill('thrall','雷霆风暴',{ mul:4.5, slow:true, stun:true, cd:16 });
  setSkill('thrall','治疗波',{ heal:0.24, healTarget:'smart', cd:22 });

  setComp('illidan',   { atkMul:1.12, spdMul:1.08, critMul:1.08 });
  setSkill('illidan','恶魔之咬',{ mul:3.6, cd:7 });
  setSkill('illidan','眼棱',{ mul:4.2, alwaysCrit:true, cd:14 });
  setSkill('illidan','恶魔变形',{ buff:'berserk', duration:10000, buffTarget:'companion', cd:24 });
  setSkill('illidan','混沌打击',{ mul:6.2, cd:20 });

  setComp('arthas',    { hpMul:1.08, defMul:1.04, atkMul:1.06 });
  setSkill('arthas','死亡缠绕',{ mul:3.4, lifeSteal:0.28, cd:9 });
  setSkill('arthas','凛风冲击',{ mul:3.4, slow:true, cd:12 });
  setSkill('arthas','亡者大军',{ mul:5.6, stun:true, dot:true, cd:20 });
  setSkill('arthas','巫妖之怒',{ buff:'rapidFire', duration:10000, buffTarget:'companion', cd:26 });

  setComp('jaina',     { atkMul:1.06, critMul:1.12, spdMul:1.04 });
  setSkill('jaina','寒冰箭',{ mul:2.4, slow:true, cd:6 });
  setSkill('jaina','冰霜新星',{ mul:3.6, slow:true, stun:true, cd:13 });
  setSkill('jaina','暴风雪',{ mul:4.8, dot:true, slow:true, cd:18 });
  setSkill('jaina','奥术智慧',{ buff:'battleShout', duration:10000, buffTarget:'hero', cd:24 });

  setComp('sylvanas',  { atkMul:1.08, critMul:1.14, spdMul:1.06 });
  setSkill('sylvanas','暗影箭',{ mul:2.8, cd:6 });
  setSkill('sylvanas','毒蛇射击',{ mul:3.4, dot:true, cd:10 });
  setSkill('sylvanas','黑暗之怒',{ mul:4.6, slow:true, cd:16 });
  setSkill('sylvanas','亡灵意志',{ buff:'shadowstep', duration:10000, buffTarget:'companion', cd:22 });

  setComp('anduin',    { hpMul:1.10, defMul:1.04, atkMul:0.98, spdMul:1.02 });
  setSkill('anduin','惩击',{ mul:2.4, heal:0.08, healTarget:'hero', cd:6 });
  setSkill('anduin','治疗术',{ heal:0.36, healTarget:'hero', cd:12 });
  setSkill('anduin','真言术盾',{ buff:'shield', duration:9000, buffTarget:'hero', cd:18 });
  setSkill('anduin','神圣赞美诗',{ heal:0.48, healTarget:'hero', cd:24 });

  setComp('tyrande',   { atkMul:1.04, spdMul:1.08, critMul:1.06 });
  setSkill('tyrande','月火术',{ mul:2.6, dot:true, cd:7 });
  setSkill('tyrande','治疗之触',{ heal:0.28, healTarget:'hero', cd:11 });
  setSkill('tyrande','星陨术',{ mul:4.2, alwaysCrit:true, cd:16 });
  setSkill('tyrande','宁静',{ heal:0.40, healTarget:'hero', cd:22 });

  setComp('malfurion', { hpMul:1.08, defMul:1.06, atkMul:1.00 });
  setSkill('malfurion','愤怒',{ mul:2.5, cd:6 });
  setSkill('malfurion','回春术',{ heal:0.24, healTarget:'smart', cd:9 });
  setSkill('malfurion','树皮术',{ buff:'bark', duration:9000, buffTarget:'hero', cd:16 });
  setSkill('malfurion','自然之力',{ heal:0.38, healTarget:'hero', cd:21 });

  // ---------- 新增蓝/橙随从补技能语义 ----------
  setSkill('muradin','雷霆一击',{ slow:true });
  setSkill('maraad','圣光术',{ healTarget:'hero' });
  setSkill('maraad','圣盾',{ buffTarget:'hero', duration:8000 });
  setSkill('rexxar','爆裂射击',{ dot:true });
  setSkill('valeera','背刺',{ alwaysCrit:true });
  setSkill('kael','火焰冲击',{ dot:true });
  setSkill('medivh','守护者之力',{ buffTarget:'hero', duration:10000 });
  setSkill('azshara','海妖之歌',{ buffTarget:'hero', duration:10000 });
  setSkill('ragnaros','元素之怒',{ buffTarget:'companion', duration:10000 });
  setSkill('kelthuzad','寒冰屏障',{ buffTarget:'companion', duration:9000 });
  setSkill('lichking','不羁亡魂',{ buffTarget:'hero', duration:10000 });
  setSkill('lichking','冰封王座',{ buffTarget:'companion', duration:9000 });
  setSkill('kiljaeden','燃烧军团',{ buffTarget:'companion', duration:10000 });

  // ---------- 每个随从 1 个专属签名技 ----------
  setSig('sw_guard',    { mode:'passive', name:'坚守防线', icon:'🧱', desc:'普通攻击附带短暂破甲,并为自身叠加少量护盾', sunder:true, sunderMs:9000, shieldPctComp:0.03, defMul:1.06 });
  setSig('horde_grunt', { type:'dmg', name:'血吼猛冲', icon:'🪓', desc:'猛冲斩击,击晕目标并对残血敌人额外增伤', mul:2.8, stun:true, stunMs:1200, executeBonus:0.25, executeThreshold:0.35, cd:16 });
  setSig('apprentice',  { mode:'passive', name:'奥术余烬', icon:'✨', desc:'攻击附带奥术灼痕,持续灼烧并留下奥术印记', dotPct:0.08, dotMs:6000, stateKey:'arcaneMark', stateMs:7000 });
  setSig('acolyte',     { type:'heal', name:'虔诚祷言', icon:'🙏', desc:'同时抚慰战友并净化减益,附带护盾', heal:0.12, healTarget:'smart', shieldPct:0.08, cleanse:true, cd:18 });
  setSig('scout',       { mode:'passive', name:'弱点观察', icon:'👁️', desc:'攻击对Boss更痛,并擅长收割残血目标', bonusVsBoss:0.15, executeBonus:0.30, executeThreshold:0.40 });

  setSig('guard_cap',   { type:'buff', name:'列阵坚守', icon:'🪖', desc:'全队列阵,提升攻防并为双方施加护盾', buff:'kings', buffTarget:'both', duration:8000, shieldPct:0.08, cd:22 });
  setSig('al_ranger',   { mode:'passive', name:'穿林箭', icon:'🍃', desc:'攻击更擅长追击减速目标,并带少量溅射', bonusVsBoss:0.08, splashPct:0.18, executeBonus:0.18, executeThreshold:0.35 });
  setSig('field_medic', { type:'heal', name:'战地复苏', icon:'🩹', desc:'为双方快速包扎并净化减益', heal:0.14, healTarget:'both', shieldPct:0.06, cleanse:true, cd:20 });
  setSig('shaman_app',  { type:'dmg', name:'闪电链', icon:'⛓️', desc:'链状闪电轰击并感电周围敌人', mul:2.4, aoePct:0.40, slow:true, slowMs:3000, stateKey:'shocked', stateMs:8000, cd:16 });
  setSig('berserker',   { mode:'passive', name:'越战越勇', icon:'🩸', desc:'攻击时汲取少量生命,并对残血目标更凶狠', healPctComp:0.04, executeBonus:0.20, executeThreshold:0.35, atkMul:1.05 });

  setSig('saurfang',    { mode:'passive', name:'鲜血印记', icon:'🩸', desc:'攻击附带流血,并持续回复自身生命', dotPct:0.10, dotMs:7000, healPctComp:0.03 });
  setSig('muradin',     { type:'dmg', name:'山丘之力', icon:'⛰️', desc:'重锤坠地,击晕敌人并为自己加固护盾', mul:4.6, stun:true, stunMs:1800, shieldPctComp:0.06, cd:18 });
  setSig('maraad',      { mode:'passive', name:'纳鲁之光', icon:'🌟', desc:'每次攻击都会给主角带来微弱治疗与护盾', healPctHero:0.03, shieldPctHero:0.03 });
  setSig('rexxar',      { type:'dmg', name:'米莎突袭', icon:'🐻', desc:'米莎猛扑,击晕目标并带小范围冲撞', mul:4.2, stun:true, stunMs:1500, splashPct:0.25, cd:20 });
  setSig('valeera',     { mode:'passive', name:'无影毒刃', icon:'☠️', desc:'攻击附带毒伤并留下更深的刺客标记', dotPct:0.10, dotMs:7000, stateKey:'marked', stateMs:9000 });
  setSig('kael',        { type:'buff', name:'凤凰降临', icon:'🦜', desc:'唤来凤凰之力,强化双方并小幅回复生命', buff:'bestial', buffTarget:'both', duration:9000, healPct:0.04, shieldPct:0.06, cd:22 });

  setSig('medivh',      { mode:'passive', name:'守护者密令', icon:'📜', desc:'对Boss造成额外伤害,并持续为主角补护盾', bonusVsBoss:0.18, shieldPctHero:0.04 });
  setSig('azshara',     { mode:'passive', name:'女王威仪', icon:'👑', desc:'攻击会撕裂心智,并强化自身输出', stateKey:'charmed', stateMs:7000, atkMul:1.06 });
  setSig('ragnaros',    { type:'dmg', name:'萨弗拉斯之槌', icon:'🔨', desc:'炎魔之槌轰击全场,附带强烈灼烧与击晕', mul:6.4, aoePct:0.55, dotPct:0.20, dotMs:8000, stun:true, stunMs:1200, cd:24 });
  setSig('kelthuzad',   { mode:'passive', name:'霜墓契约', icon:'⚰️', desc:'攻击附带寒霜侵蚀,并为自身积累冰甲', dotPct:0.12, slow:true, slowMs:4000, shieldPctComp:0.04 });
  setSig('lichking',    { mode:'passive', name:'天灾君临', icon:'👑', desc:'Boss战中更加凶悍,并持续强化自身生存', bonusVsBoss:0.15, hpMul:1.06, shieldPctComp:0.05, healPctComp:0.03 });
  setSig('kiljaeden',   { type:'dmg', name:'欺诈者诡计', icon:'🌌', desc:'虚空爆裂卷过战场,对痛苦印记者额外增伤', mul:5.8, aoePct:0.45, stateKey:'torment', stateMs:9000, bonusVsDot:0.35, cd:24 });

  setSig('fordring',    { type:'buff', name:'提尔之手', icon:'✋', desc:'圣光庇护全队,大幅净化并施加厚护盾', buff:'sacredShield', buffTarget:'both', duration:8000, shieldPct:0.12, cleanse:true, cd:24 });
  setSig('varian',      { mode:'passive', name:'王者决意', icon:'🦁', desc:'愈战愈勇,对Boss和残血目标都更有压迫感', atkMul:1.05, defMul:1.05, bonusVsBoss:0.10, executeBonus:0.20, executeThreshold:0.35 });
  setSig('thrall',      { type:'dmg', name:'毁灭之锤', icon:'🔨', desc:'毁灭之锤砸落,眩晕目标并为主角补护盾', mul:4.8, stun:true, stunMs:1400, aoePct:0.25, shieldPctHero:0.05, cd:20 });
  setSig('illidan',     { mode:'passive', name:'背叛者之怒', icon:'🪽', desc:'攻势更凌厉,尤其擅长斩杀Boss', spdMul:1.06, bonusVsBoss:0.15, executeBonus:0.25, executeThreshold:0.35 });
  setSig('arthas',      { type:'dmg', name:'冰封命令', icon:'🧊', desc:'寒霜命令侵袭目标,冻结并附加更深瘟疫', mul:4.8, slow:true, slowMs:5000, stun:true, stunMs:1200, stateKey:'blighted', stateMs:9000, cd:20 });
  setSig('jaina',       { mode:'passive', name:'冰冷智慧', icon:'📘', desc:'寒冰魔法留下更久印记,并让攻击附带减速', critAdd:4, slow:true, slowMs:2500, stateKey:'frozenMark', stateMs:8000 });
  setSig('sylvanas',    { type:'dmg', name:'女妖尖啸', icon:'👻', desc:'女妖尖啸撕裂灵魂,标记并震慑周围敌人', mul:4.2, aoePct:0.35, stun:true, stunMs:1100, stateKey:'hunted', stateMs:9000, cd:20 });
  setSig('anduin',      { mode:'passive', name:'圣光回响', icon:'✨', desc:'每次攻击都会为主角回响圣光,补血并加盾', healPctHero:0.03, shieldPctHero:0.03 });
  setSig('tyrande',     { type:'dmg', name:'艾露恩之怒', icon:'🌕', desc:'月神之怒精准坠落,高爆发并回护主角', mul:4.5, alwaysCrit:true, bonusVsDot:0.30, healPctHero:0.05, cd:20 });
  setSig('malfurion',   { mode:'passive', name:'梦境滋养', icon:'🌌', desc:'自然梦境不断滋养队伍,并强化自身回复', regMul:1.12, healPctHero:0.02, shieldPctHero:0.03 });
  setSig('garrosh',     { type:'buff', name:'钢铁意志', icon:'🛡️', desc:'加尔鲁什举旗怒吼,为自己施加厚盾并强化主角输出', buff:'shield', buffTarget:'companion', duration:9000, shieldPctComp:0.12, healPctComp:0.06, cd:22 });
  setSig('cairne',      { mode:'passive', name:'先祖丰饶', icon:'🌄', desc:'沉稳守望持续为队伍恢复,并让自己更厚重', hpMul:1.08, healPctHero:0.02, healPctComp:0.03, shieldPctComp:0.04 });
  setSig('bolvar',      { type:'buff', name:'王城余烬', icon:'🔥', desc:'伯瓦尔燃起灰烬圣焰,为全队加盾并净化减益', buff:'sacredShield', buffTarget:'both', duration:8000, shieldPct:0.10, cleanse:true, cd:22 });
  setSig('chen',        { type:'heal', name:'不息酒泉', icon:'🍶', desc:'豪饮之后回春,同时为主角与自己补血护盾', heal:0.12, healTarget:'both', shieldPct:0.06, cd:18 });
  setSig('rehgar',      { mode:'passive', name:'野性灵魂', icon:'🐺', desc:'法术会留下感电印记,并不断强化主角攻速', stateKey:'shocked', stateMs:8000, shieldPctHero:0.03, spdMul:1.05 });
  setSig('velen',       { type:'heal', name:'纳鲁圣约', icon:'🌠', desc:'强力圣疗同时为双方加盾并驱散减益', heal:0.20, healTarget:'both', shieldPct:0.10, cleanse:true, cd:20 });
  setSig('liadrin',     { mode:'passive', name:'血骑士军势', icon:'🌞', desc:'持续鼓舞主角输出,并在攻击时回响圣光', atkMul:1.04, healPctHero:0.03, shieldPctHero:0.03 });
  setSig('alexstrasza', { type:'heal', name:'生命缚誓', icon:'🐉', desc:'龙眠之息笼罩战场,重治疗并强化全队', heal:0.22, healTarget:'both', shieldPct:0.10, buff:'kings', buffTarget:'both', duration:9000, cd:22 });
  setSig('cenarius',    { mode:'passive', name:'林地苏醒', icon:'🌲', desc:'根须与月辉不断滋养队伍,并让敌人更易受伤', healPctHero:0.02, healPctComp:0.03, stateKey:'rooted', stateMs:8000 });
  setSig('khadgar',     { type:'buff', name:'守护者时序', icon:'⌛', desc:'扭转时流,强化双方攻速并让敌人进入奥术破绽', buff:'rapidFire', buffTarget:'both', duration:9000, stateKey:'arcaneMark', stateMs:9000, cd:20 });
  setSig('maiev',       { mode:'passive', name:'守望绝罚', icon:'🦉', desc:'对被标记目标更凶狠,并在Boss战中持续追猎', bonusVsState:0.40, bonusVsBoss:0.12, stateKey:'hunted', stateMs:9000 });
  setSig('grommash',    { mode:'passive', name:'战歌狂潮', icon:'🩸', desc:'越战越凶,对残血和Boss都更暴烈,并持续吸血', bonusVsBoss:0.12, executeBonus:0.28, executeThreshold:0.35, healPctComp:0.04 });
  setSig('voljin',      { type:'dmg', name:'洛阿之眼', icon:'🪶', desc:'暗影猎神谕标记敌人,造成持续伤害并削弱其意志', mul:4.2, stateKey:'hunted', stateMs:9000, dotPct:0.14, dotMs:7000, weaken:true, cd:20 });
  setSig('akama',       { mode:'passive', name:'灰舌伏击', icon:'🌑', desc:'攻击附带暗影斩痕,对被标记者追加更高伤害', dotPct:0.10, dotMs:7000, stateKey:'marked', stateMs:8000, bonusVsBoss:0.10 });

  // ---------- 让随从技能真正有“技能感” ----------
  setSkill('sw_guard','盾击',{ stun:true, stunMs:1200, debuff:'sunder', sunderMs:10000, desc:'2倍伤害并击晕1.2秒,附带短暂破甲' });
  setSkill('horde_grunt','劈砍',{ dotPct:0.10, dotMs:5000, desc:'2倍伤害并造成流血' });
  setSkill('apprentice','火花',{ dotPct:0.14, dotMs:6000, desc:'2倍伤害并点燃目标' });
  setSkill('acolyte','微光术',{ healTarget:'smart', shieldPct:0.06, cleanse:true, desc:'恢复10%生命并施加小护盾,净化1个减益' });
  setSkill('scout','快速射击',{ executeBonus:0.35, executeThreshold:0.40, desc:'2倍伤害,对40%以下目标额外提高35%' });

  setSkill('guard_cap','盾墙',{ buffTarget:'companion', duration:8000, shieldPct:0.12, desc:'8秒减伤并获得12%生命值护盾' });
  setSkill('guard_cap','重盾击',{ stun:true, stunMs:1500, debuff:'sunder', sunderMs:15000, desc:'3倍伤害,击晕并施加破甲' });
  setSkill('al_ranger','瞄准射击',{ bonusVsSlow:0.35, desc:'3倍伤害,对减速目标额外提高35%' });
  setSkill('al_ranger','多重射击',{ aoePct:0.45, desc:'2.5倍伤害并溅射45%到其他敌人' });
  setSkill('field_medic','急救',{ healTarget:'smart', cleanse:true, desc:'恢复15%生命并净化1个减益' });
  setSkill('field_medic','鼓舞',{ buffTarget:'hero', duration:10000, shieldPct:0.08, healPct:0.06, desc:'10秒攻击提升,并立即回复6%生命与8%护盾' });
  setSkill('shaman_app','闪电箭',{ slow:true, slowMs:3000, desc:'2.5倍伤害并减速3秒' });
  setSkill('shaman_app','大地之盾',{ buffTarget:'hero', duration:8000, shieldPct:0.10, healPct:0.05, desc:'8秒防御提升,并给予10%护盾与少量治疗' });
  setSkill('berserker','鲁莽',{ buffTarget:'companion', duration:10000, healPct:0.04, desc:'10秒攻击攻速提升,并立即回复少量生命' });
  setSkill('berserker','顺劈',{ splashPct:0.45, executeBonus:0.25, executeThreshold:0.35, desc:'3倍伤害并溅射45%,对残血目标更狠' });

  setSkill('saurfang','致死劈砍',{ dotPct:0.14, dotMs:7000, desc:'3倍伤害并造成流血' });
  setSkill('saurfang','压制',{ bonusVsSunder:0.45, stun:true, stunMs:1200, desc:'4倍伤害,对破甲目标额外提高45%并短暂击晕' });
  setSkill('saurfang','战吼',{ buffTarget:'both', duration:9000, shieldPct:0.06, desc:'提升双方输出并施加小护盾' });
  setSkill('muradin','雷霆一击',{ slow:true, slowMs:5000, aoePct:0.45, desc:'3倍伤害并减速,对其余敌人造成45%溅射' });
  setSkill('muradin','强力一击',{ stun:true, stunMs:1600, debuff:'sunder', desc:'4倍伤害并击晕,附带破甲' });
  setSkill('maraad','圣光术',{ healTarget:'smart', cleanse:true, desc:'恢复20%生命并净化1个减益' });
  setSkill('maraad','圣盾',{ buffTarget:'hero', duration:8000, shieldPct:0.12, desc:'8秒防御回复提升并获得12%护盾' });
  setSkill('maraad','圣光审判',{ debuff:'sunder', heal:0.08, bonusVsSunder:0.25, desc:'3倍伤害并施加破甲,同时回复生命' });
  setSkill('rexxar','瞄准射击',{ bonusVsDot:0.35, desc:'3倍伤害,对流血/持续伤害目标额外提高35%' });
  setSkill('rexxar','野兽狂怒',{ buffTarget:'both', duration:10000, desc:'提升双方攻击,强化收割节奏' });
  setSkill('rexxar','爆裂射击',{ dotPct:0.14, aoePct:0.35, desc:'4倍伤害并爆裂灼烧,溅射35%' });
  setSkill('valeera','背刺',{ alwaysCrit:true, bonusVsState:'marked', bonusStatePct:0.45, desc:'必暴背刺,对影袭标记目标额外提高45%' });
  setSkill('valeera','影袭',{ stateKey:'marked', stateMs:8000, slow:true, slowMs:2500, desc:'3倍伤害并标记目标8秒' });
  setSkill('valeera','疾跑',{ buffTarget:'companion', duration:8000, cleanse:true, desc:'8秒攻速提升并净化自身1个减益' });
  setSkill('kael','火焰冲击',{ dotPct:0.18, dotMs:7000, desc:'3倍伤害并附加较强灼烧' });
  setSkill('kael','烈焰风暴',{ aoePct:0.55, bonusVsDot:0.25, desc:'4倍伤害并溅射55%,对着火目标额外提高25%' });
  setSkill('kael','法力梭镖',{ bonusVsDot:0.35, desc:'3倍伤害,对持续伤害目标额外提高35%' });

  setSkill('fordring','圣光审判',{ bonusVsSunder:0.25, desc:'3倍伤害并施加破甲,对破甲目标额外更痛' });
  setSkill('fordring','圣盾守护',{ shieldPct:0.10, desc:'9秒神圣守护并获得10%生命值护盾' });
  setSkill('fordring','灰烬觉醒',{ executeBonus:0.45, executeThreshold:0.35, splashPct:0.20, desc:'高额必暴,对残血目标额外提高45%,并有小幅溅射' });
  setSkill('fordring','圣疗术',{ healTarget:'smart', cleanse:true, shieldPct:0.08, desc:'强力治疗并净化1个减益,附带护盾' });

  setSkill('varian','冲锋',{ stateKey:'opened', stateMs:7000, desc:'冲锋击晕,并使目标进入破绽状态' });
  setSkill('varian','破甲',{ sunderMs:18000, bonusVsState:'opened', bonusStatePct:0.25, desc:'重击并施加长时间破甲,对破绽目标更强' });
  setSkill('varian','剑刃风暴',{ splashPct:0.55, desc:'旋风斩并溅射55%到其他敌人' });
  setSkill('varian','怒吼',{ buffTarget:'both', duration:10000, shieldPct:0.06, desc:'鼓舞全队输出,双方获得小护盾' });

  setSkill('thrall','闪电箭',{ bonusVsSlow:0.25, desc:'2.6倍伤害,对减速目标额外提高25%' });
  setSkill('thrall','大地之盾',{ shieldPct:0.10, healPct:0.05, desc:'给予大地之盾,并立刻回复5%生命与10%护盾' });
  setSkill('thrall','雷霆风暴',{ aoePct:0.40, stateKey:'shocked', stateMs:8000, desc:'雷霆轰击并溅射40%,附带感电' });
  setSkill('thrall','治疗波',{ cleanse:true, desc:'治疗并净化1个减益' });

  setSkill('illidan','恶魔之咬',{ stateKey:'opened', stateMs:8000, desc:'撕开目标防线,制造8秒破绽' });
  setSkill('illidan','眼棱',{ bonusVsState:'opened', bonusStatePct:0.40, splashPct:0.30, desc:'高额爆发,对破绽目标额外提高40%,并带30%溅射' });
  setSkill('illidan','恶魔变形',{ shieldPct:0.08, desc:'恶魔变形强化自身并立刻获得护盾' });
  setSkill('illidan','混沌打击',{ bonusVsState:'opened', bonusStatePct:0.55, buffAmp:{key:'berserk',pct:0.25}, desc:'对破绽目标极强,变身中伤害再提高25%' });

  setSkill('arthas','死亡缠绕',{ bonusVsSlow:0.25, desc:'吸血打击,对减速目标额外提高25%' });
  setSkill('arthas','凛风冲击',{ slowMs:5000, stateKey:'chilled', stateMs:8000, desc:'寒冰重击并减速5秒' });
  setSkill('arthas','亡者大军',{ aoePct:0.45, dotPct:0.12, desc:'召来亡者冲击,并造成持续伤害与45%溅射' });
  setSkill('arthas','巫妖之怒',{ buffTarget:'both', duration:10000, shieldPct:0.06, desc:'全队攻速提升,并给予小护盾' });

  setSkill('jaina','寒冰箭',{ stateKey:'frozenMark', stateMs:8000, desc:'寒冰箭减速并留下冰寒印记' });
  setSkill('jaina','冰霜新星',{ aoePct:0.35, stunMs:1800, desc:'冻结爆发,溅射35%并短暂定身/击晕' });
  setSkill('jaina','暴风雪',{ aoePct:0.55, dotPct:0.10, bonusVsSlow:0.25, desc:'持续风雪覆盖,并对减速目标更痛' });
  setSkill('jaina','奥术智慧',{ buffTarget:'hero', duration:10000, shieldPct:0.06, desc:'强化主角输出并附带小护盾' });

  setSkill('sylvanas','暗影箭',{ stateKey:'hunted', stateMs:9000, desc:'暗影箭标记猎物9秒' });
  setSkill('sylvanas','毒蛇射击',{ dotPct:0.18, dotMs:8000, desc:'毒箭造成持续剧毒' });
  setSkill('sylvanas','黑暗之怒',{ bonusVsDot:0.45, splashPct:0.30, desc:'对中毒/流血目标额外提高45%,并带30%溅射' });
  setSkill('sylvanas','亡灵意志',{ cleanse:true, desc:'强化自身并净化1个减益' });

  setSkill('anduin','惩击',{ heal:0.08, shieldPct:0.04, desc:'惩击敌人并为主角补一点血和护盾' });
  setSkill('anduin','治疗术',{ cleanse:true, desc:'恢复30%生命并净化1个减益' });
  setSkill('garrosh','铁星猛砸',{ sunder:true, stun:true, stunMs:1300, desc:'3.5倍伤害并击晕,附带破甲' });
  setSkill('garrosh','钢铁壁垒',{ buffTarget:'companion', duration:9000, shieldPct:0.12, desc:'9秒减伤并获得12%生命护盾' });
  setSkill('garrosh','血吼裂地',{ splashPct:0.40, executeBonus:0.25, executeThreshold:0.35, desc:'4.5倍伤害并溅射40%,对残血目标额外提高25%' });
  setSkill('garrosh','战帅续战',{ healTarget:'companion', shieldPct:0.06, desc:'恢复16%生命并施加小护盾' });
  setSkill('cairne','战争践踏',{ stun:true, stunMs:1600, aoePct:0.40, desc:'3倍伤害并击晕,溅射40%' });
  setSkill('cairne','先祖护佑',{ buffTarget:'companion', duration:9000, shieldPct:0.10, healPct:0.05, desc:'9秒防御提升,并获得护盾与少量回复' });
  setSkill('cairne','大地母亲之赐',{ healTarget:'both', cleanse:true, desc:'同时恢复双方生命并净化1个减益' });
  setSkill('bolvar','炽焰审判',{ dotPct:0.12, dotMs:7000, desc:'3倍伤害并附加圣焰灼烧' });
  setSkill('bolvar','灰烬壁垒',{ buffTarget:'companion', duration:9000, shieldPct:0.14, desc:'9秒厚盾庇护,更适合坦克承压' });
  setSkill('bolvar','王者坚忍',{ healTarget:'companion', shieldPct:0.08, cleanse:true, desc:'恢复生命并净化自身减益,附带护盾' });
  setSkill('bolvar','暴风城号令',{ buffTarget:'both', duration:10000, shieldPct:0.06, desc:'10秒全队攻防提升并获得小护盾' });
  setSkill('chen','醉拳',{ weaken:true, desc:'3倍伤害并扰乱敌人攻势' });
  setSkill('chen','活血酒',{ buffTarget:'companion', duration:9000, healPct:0.06, desc:'9秒减伤回复,并立刻恢复少量生命' });
  setSkill('chen','酒雾调息',{ healTarget:'smart', cleanse:true, desc:'恢复生命并净化1个减益' });
  setSkill('rehgar','治疗链',{ healTarget:'both', shieldPct:0.04, desc:'治疗会弹跳到双方,并附带小护盾' });
  setSkill('rehgar','英勇',{ buffTarget:'both', duration:10000, desc:'10秒双方攻速全面提升' });
  setSkill('rehgar','大地之盾',{ buffTarget:'hero', duration:9000, shieldPct:0.10, healPct:0.05, desc:'主角获得大地之盾与即时回复' });
  setSkill('rehgar','闪电链',{ aoePct:0.45, slow:true, slowMs:3000, desc:'链状闪电造成45%溅射并减速' });
  setSkill('velen','纳鲁赐福',{ healTarget:'smart', cleanse:true, shieldPct:0.08, desc:'强力治疗并净化减益,附带护盾' });
  setSkill('velen','圣光共鸣',{ buffTarget:'both', duration:10000, healPct:0.05, desc:'10秒提升双方攻防并立刻回复生命' });
  setSkill('velen','群体屏障',{ buffTarget:'both', duration:8000, shieldPct:0.12, desc:'双方同时获得厚重屏障' });
  setSkill('velen','命运回溯',{ healTarget:'both', cleanse:true, shieldPct:0.08, desc:'同时大幅恢复双方生命并净化减益' });
  setSkill('velen','神圣新星',{ aoePct:0.30, heal:0.06, healTarget:'hero', desc:'对敌溅射并顺带抚慰主角' });
  setSkill('liadrin','公正圣印',{ bonusVsState:'judged', bonusStatePct:0.35, stateKey:'judged', stateMs:8000, desc:'3倍伤害并标记目标,后续技能更痛' });
  setSkill('liadrin','圣佑术',{ buffTarget:'hero', duration:8000, shieldPct:0.10, desc:'主角获得圣佑与护盾' });
  setSkill('liadrin','圣光灌注',{ healTarget:'smart', shieldPct:0.05, desc:'恢复生命并附带小护盾' });
  setSkill('liadrin','银月战旗',{ buffTarget:'both', duration:10000, desc:'战旗鼓舞双方输出' });
  setSkill('alexstrasza','生命脉冲',{ healTarget:'both', shieldPct:0.05, desc:'生命脉冲同时照拂双方' });
  setSkill('alexstrasza','红龙烈焰',{ dotPct:0.16, dotMs:7000, aoePct:0.30, desc:'龙焰灼烧并带30%溅射' });
  setSkill('alexstrasza','龙眠庇护',{ buffTarget:'both', duration:9000, shieldPct:0.12, desc:'双方获得厚重龙眠护盾' });
  setSkill('alexstrasza','生命绽放',{ healTarget:'both', cleanse:true, desc:'大幅恢复双方生命并净化减益' });
  setSkill('alexstrasza','赐生龙息',{ buffTarget:'both', duration:10000, healPct:0.06, desc:'全队强化并伴随生命气息回复' });
  setSkill('cenarius','根须缠绕',{ cripple:true, stateKey:'rooted', stateMs:8000, desc:'根须缠绕敌人并留下8秒束缚' });
  setSkill('cenarius','树皮庇护',{ buffTarget:'both', duration:9000, shieldPct:0.08, desc:'全队减伤并得到自然护盾' });
  setSkill('cenarius','自然绽放',{ healTarget:'both', shieldPct:0.04, desc:'自然能量同时治疗双方' });
  setSkill('cenarius','野性赐福',{ buffTarget:'both', duration:10000, desc:'野性赐福强化双方攻防' });
  setSkill('cenarius','星群坠落',{ aoePct:0.45, bonusVsState:'rooted', bonusStatePct:0.30, desc:'星群轰炸并对束缚目标额外提高30%' });
  setSkill('khadgar','奥术弹幕',{ stateKey:'arcaneMark', stateMs:8000, desc:'奥术弹幕留下8秒奥术印记' });
  setSkill('khadgar','时间裂隙',{ bonusVsState:'arcaneMark', bonusStatePct:0.40, silence:true, silenceMs:1800, desc:'对奥术印记目标额外提高40%,并附带沉默' });
  setSkill('khadgar','时间扭曲',{ buffTarget:'both', duration:10000, desc:'双方一同进入时流加速' });
  setSkill('khadgar','奥术智慧',{ buffTarget:'hero', duration:10000, shieldPct:0.05, desc:'更偏向提升主角施法节奏,附带小护盾' });
  setSkill('maiev','影袭飞轮',{ stateKey:'hunted', stateMs:9000, desc:'飞轮命中后留下守望者追猎印记' });
  setSkill('maiev','复仇突刺',{ bonusVsState:'hunted', bonusStatePct:0.45, alwaysCrit:true, desc:'对追猎目标额外提高45%并稳定爆发' });
  setSkill('maiev','守望者追猎',{ buffTarget:'companion', duration:10000, cleanse:true, desc:'提高自身追猎效率并净化减益' });
  setSkill('maiev','禁锢匕雨',{ aoePct:0.40, cripple:true, desc:'匕雨横扫并使敌人残废' });
  setSkill('grommash','血吼横扫',{ splashPct:0.45, desc:'横扫溅射45%伤害' });
  setSkill('grommash','玛诺洛斯之血',{ buffTarget:'companion', duration:10000, healPct:0.05, desc:'狂暴强化自身并回复少量生命' });
  setSkill('grommash','地狱咆哮',{ alwaysCrit:true, bonusVsBoss:0.20, desc:'更适合在Boss战中打出高爆发' });
  setSkill('grommash','斩首',{ executeBonus:0.45, executeThreshold:0.35, desc:'对残血目标额外提高45%' });
  setSkill('grommash','狂战愈合',{ healTarget:'companion', desc:'硬扛之后快速回一口血' });
  setSkill('voljin','暗影猎箭',{ stateKey:'hunted', stateMs:9000, desc:'暗影猎箭标记目标9秒' });
  setSkill('voljin','巫毒咒杀',{ dotPct:0.14, dotMs:7000, bonusVsState:'hunted', bonusStatePct:0.30, desc:'持续咒伤,对标记目标额外提高30%' });
  setSkill('voljin','巨魔再生',{ buffTarget:'companion', duration:10000, healPct:0.06, desc:'强化再生与续航' });
  setSkill('akama','影刃突袭',{ stateKey:'marked', stateMs:8000, desc:'影刃突袭留下8秒破绽' });
  setSkill('akama','灰舌连斩',{ bonusVsState:'marked', bonusStatePct:0.35, splashPct:0.25, desc:'对破绽目标更痛,并带25%溅射' });
  setSkill('akama','破碎潜行',{ buffTarget:'companion', duration:10000, cleanse:true, desc:'进入更灵动的潜行节奏并净化减益' });
  setSkill('anduin','真言术盾',{ shieldPct:0.14, desc:'施加真言术盾并获得14%生命值护盾' });
  setSkill('anduin','神圣赞美诗',{ shieldPct:0.08, cleanse:true, desc:'大治疗并追加护盾,同时净化减益' });

  setSkill('tyrande','月火术',{ dotPct:0.12, dotMs:7000, desc:'月火持续灼烧目标' });
  setSkill('tyrande','治疗之触',{ healTarget:'smart', shieldPct:0.05, desc:'治疗并补上小护盾' });
  setSkill('tyrande','星陨术',{ aoePct:0.50, bonusVsDot:0.30, desc:'星辰坠落,并对持续伤害目标额外提高30%' });
  setSkill('tyrande','宁静',{ healTarget:'smart', cleanse:true, shieldPct:0.06, desc:'强力治疗,净化减益并附带护盾' });

  setSkill('malfurion','愤怒',{ stateKey:'rooted', stateMs:7000, desc:'自然之怒压制目标,形成7秒纠缠印记' });
  setSkill('malfurion','回春术',{ healTarget:'smart', shieldPct:0.05, desc:'持续治疗感更强,并补上小护盾' });
  setSkill('malfurion','树皮术',{ shieldPct:0.10, cleanse:true, desc:'树皮守护并给予10%护盾,净化减益' });
  setSkill('malfurion','自然之力',{ healTarget:'smart', healPct:0.06, desc:'大治疗并追加一次自然回涌' });

  setSkill('medivh','奥术冲击',{ stateKey:'arcaneMark', stateMs:9000, desc:'奥术冲击施加9秒奥术印记' });
  setSkill('medivh','火焰冲击',{ dotPct:0.18, dotMs:8000, desc:'烈焰持续焚烧目标' });
  setSkill('medivh','守护者之力',{ buffTarget:'both', duration:10000, shieldPct:0.08, desc:'守护者庇护双方并施加护盾' });
  setSkill('medivh','变形术',{ stun:true, stunMs:2200, bonusVsState:'arcaneMark', bonusStatePct:0.30, desc:'控制目标并对奥术印记者更强' });
  setSkill('medivh','奥术强能',{ buffTarget:'companion', healPct:0.05, desc:'大幅强化自身并回复少量生命' });

  setSkill('azshara','魔力风暴',{ aoePct:0.40, slow:true, slowMs:4000, desc:'魔力风暴席卷周围并减速' });
  setSkill('azshara','蛊惑',{ stun:true, stunMs:1400, stateKey:'charmed', stateMs:8000, desc:'短暂魅惑并留下8秒心智裂痕' });
  setSkill('azshara','海妖之歌',{ buffTarget:'both', duration:10000, shieldPct:0.06, desc:'海妖之歌激励双方并附带护盾' });
  setSkill('azshara','奥术爆发',{ bonusVsState:'charmed', bonusStatePct:0.45, splashPct:0.40, desc:'对心智裂痕目标额外提高45%,并有40%溅射' });
  setSkill('azshara','女王降临',{ buffTarget:'both', duration:10000, healPct:0.05, desc:'女王降临强化全队并回复少量生命' });

  setSkill('ragnaros','熔岩爆裂',{ dotPct:0.20, dotMs:8000, desc:'熔岩爆裂造成高额灼烧' });
  setSkill('ragnaros','烈焰冲击',{ bonusVsDot:0.25, splashPct:0.30, desc:'对着火目标更痛,并带小范围爆裂' });
  setSkill('ragnaros','火焰新星',{ aoePct:0.60, dotPct:0.10, desc:'火焰新星席卷战场,溅射60%并点燃目标' });
  setSkill('ragnaros','元素之怒',{ shieldPct:0.05, desc:'元素风怒强化自身并附带小护盾' });
  setSkill('ragnaros','火焰之子',{ bonusVsDot:0.35, splashPct:0.50, desc:'对着火目标额外提高35%,并带50%溅射' });

  setSkill('kelthuzad','冰霜之球',{ slow:true, slowMs:5000, stateKey:'chilled', stateMs:8000, desc:'寒冰之球减速并冻结气息' });
  setSkill('kelthuzad','死亡凋零',{ aoePct:0.45, dotPct:0.16, desc:'死亡凋零覆盖战场并溅射45%' });
  setSkill('kelthuzad','寒冰屏障',{ shieldPct:0.18, cleanse:true, desc:'寒冰屏障给予厚护盾并净化减益' });
  setSkill('kelthuzad','亡者复生',{ bonusVsDot:0.45, splashPct:0.35, desc:'对持续伤害目标额外提高45%,并带35%溅射' });
  setSkill('kelthuzad','巫妖之触',{ shieldPct:0.06, desc:'巫妖之触强化自身并附带护盾' });

  setSkill('lichking','霜之哀伤',{ bonusVsDot:0.25, desc:'高额吸血打击,对被瘟疫缠身的目标更强' });
  setSkill('lichking','死亡缠绕',{ splashPct:0.30, slow:true, slowMs:3500, desc:'死亡缠绕扩散暗影并减速' });
  setSkill('lichking','复活瘟疫',{ dotPct:0.18, dotMs:8000, stateKey:'blighted', stateMs:8000, desc:'瘟疫缠身并持续侵蚀目标' });
  setSkill('lichking','不羁亡魂',{ buffTarget:'both', duration:10000, shieldPct:0.08, desc:'亡魂之力加持双方,附带护盾' });
  setSkill('lichking','冰封王座',{ shieldPct:0.18, cleanse:true, desc:'冰封王座庇护自身,获得厚护盾并净化减益' });

  setSkill('kiljaeden','毁灭',{ bonusVsBoss:0.20, bonusVsDot:0.30, desc:'大毁灭对Boss和持续伤害目标更痛' });
  setSkill('kiljaeden','黑暗之球',{ dotPct:0.18, slow:true, slowMs:3500, desc:'黑暗之球持续侵蚀并减速' });
  setSkill('kiljaeden','痛苦',{ stateKey:'torment', stateMs:9000, desc:'施加9秒痛苦印记' });
  setSkill('kiljaeden','燃烧军团',{ buffTarget:'both', duration:10000, shieldPct:0.08, desc:'燃烧军团之力强化双方并附带护盾' });
  setSkill('kiljaeden','虚空崩裂',{ aoePct:0.60, bonusVsState:'torment', bonusStatePct:0.45, desc:'虚空崩裂席卷战场,对痛苦印记目标额外提高45%' });
})();
