/* =========================================================
   companion_ext.js — 随从大修(data.js 之后加载)
   - 给原有 10 个"一方霸主"随从打上 紫色品质 + 专属加成
   - 扩充阵容:白(杂兵,1技能)/绿(2)/蓝(中流砥柱,3)/橙(传奇,5)
   - 品质=固定(按背景),技能数=品质等级
   ========================================================= */
(function extendCompanions() {
  if (typeof COMPANIONS === 'undefined') return;

  // 原有随从 → 紫色"一方霸主"+ 专属加成(技能已是4个)
  const purple = {
    fordring:  { role:'tank', bonus:{hpPct:8, defPct:5} },
    varian:    { bonus:{atkPct:8, hpPct:5} },
    thrall:    { bonus:{atkPct:7, vers:4} },
    illidan:   { bonus:{atkPct:9, critdPct:6} },
    arthas:    { bonus:{atkPct:8, leech:5} },
    jaina:     { bonus:{atkPct:8, crit:4} },
    sylvanas:  { bonus:{atkPct:7, crit:5} },
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
  const B = (name, icon, buff, desc, cd) => ({ name, icon, desc, type:'buff', buff, duration:12000, cd:cd||22 });

  const add = [
    // ---------- 白(杂兵,1技能)----------
    { key:'sw_guard',  name:'暴风城卫兵', emoji:'💂', quality:'white', role:'tank', desc:'城门口站岗的卫兵', bonus:{hpPct:3},  skills:[D('盾击','🛡️','2倍伤害',2,{cd:6})] },
    { key:'horde_grunt',name:'部落步兵', emoji:'🪓', quality:'white', role:'dps',  desc:'奥格瑞玛的新兵',   bonus:{atkPct:3}, skills:[D('劈砍','⚔️','2倍伤害',2,{cd:6})] },
    { key:'apprentice',name:'见习法师',  emoji:'🧑‍🎓', quality:'white', role:'dps', desc:'达拉然的学徒',     bonus:{crit:2},   skills:[D('火花','🔥','2倍伤害',2,{cd:6})] },
    { key:'acolyte',   name:'侍僧',      emoji:'🕯️', quality:'white', role:'heal', desc:'修道院的侍僧',     bonus:{regFlat:2},skills:[H('微光术','✨',0.1,10)] },
    { key:'scout',     name:'哨兵',      emoji:'🏹', quality:'white', role:'dps',  desc:'边境的斥候',       bonus:{spdPct:3}, skills:[D('快速射击','🎯','2倍伤害',2,{cd:5})] },

    // ---------- 绿(小有名气,2技能)----------
    { key:'guard_cap', name:'卫兵队长',  emoji:'🪖', quality:'green', role:'tank', desc:'暴风城卫戍队长', bonus:{hpPct:5,defPct:2}, skills:[B('盾墙','🛡️','shield','8秒减伤'),D('重盾击','💥','3倍伤害',3)] },
    { key:'al_ranger', name:'联盟游侠',  emoji:'🏹', quality:'green', role:'dps',  desc:'闻名一隅的神射手', bonus:{atkPct:4,crit:2}, skills:[D('瞄准射击','🎯','3倍伤害',3),D('多重射击','🏹','2.5倍范围',2.5)] },
    { key:'field_medic',name:'战地医师', emoji:'⛑️', quality:'green', role:'heal', desc:'前线的救死扶伤者', bonus:{regFlat:3,hpPct:2}, skills:[H('急救','💉',0.15,12),B('鼓舞','📯','battleShout','10秒攻击提升')] },
    { key:'shaman_app',name:'萨满学徒',  emoji:'⚡', quality:'green', role:'dps',  desc:'初通元素的萨满',   bonus:{atkPct:4}, skills:[D('闪电箭','⚡','2.5倍伤害',2.5),B('大地之盾','🪨','earthShield','8秒防御提升')] },
    { key:'berserker', name:'狂战士',    emoji:'😡', quality:'green', role:'dps',  desc:'嗜血的蛮族战士',   bonus:{atkPct:5}, skills:[B('鲁莽','💢','berserk','10秒攻击攻速'),D('顺劈','🌀','3倍伤害',3)] },

    // ---------- 蓝(中流砥柱,3技能)----------
    { key:'saurfang', name:'萨鲁法尔大王', emoji:'🪓', quality:'blue', role:'dps', desc:'部落的荣耀老兵', bonus:{atkPct:6,critdPct:5}, skills:[D('致死劈砍','⚔️','3倍伤害',3),D('压制','💥','4倍伤害',4),B('战吼','📯','berserk','攻击攻速提升')] },
    { key:'muradin',  name:'穆拉丁·铜须', emoji:'🔨', quality:'blue', role:'tank', desc:'铁炉堡的山丘之王', bonus:{defPct:7,hpPct:5}, skills:[D('雷霆一击','⚡','3倍伤害',3),B('盾墙','🛡️','shield','减伤'),D('强力一击','💢','4倍伤害',4)] },
    { key:'maraad',   name:'大主教玛拉达尔', emoji:'🌟', quality:'blue', role:'heal', desc:'德莱尼的圣光使者', bonus:{hpPct:5,regFlat:4}, skills:[H('圣光术','✨',0.2,12),B('圣盾','🟡','sacredShield','防御回复'),D('圣光审判','⚖️','3倍伤害',3)] },
    { key:'rexxar',   name:'雷克萨', emoji:'🐗', quality:'blue', role:'dps', desc:'孤胆兽王', bonus:{atkPct:5,crit:3}, skills:[D('瞄准射击','🎯','3倍伤害',3),B('野兽狂怒','🐻','bestial','攻击提升'),D('爆裂射击','💥','4倍伤害',4)] },
    { key:'valeera',  name:'瓦蕾拉', emoji:'🗡️', quality:'blue', role:'dps', desc:'血精灵潜行者', bonus:{crit:4,spdPct:4}, skills:[D('背刺','🔪','3倍必暴',3,{alwaysCrit:true}),D('影袭','🌑','3倍伤害',3),B('疾跑','💨','rapidFire','攻速提升')] },
    { key:'kael',     name:'凯尔萨斯·逐日者', emoji:'☀️', quality:'blue', role:'dps', desc:'血精灵的太阳之王', bonus:{atkPct:6,crit:3}, skills:[D('火焰冲击','🔥','3倍灼烧',3,{dot:true}),D('烈焰风暴','🌋','4倍伤害',4),D('法力梭镖','🔷','3倍伤害',3)] },

    // ---------- 橙(传奇,5技能)----------
    { key:'medivh',   name:'麦迪文', emoji:'🔮', quality:'orange', role:'dps', desc:'最后的守护者', bonus:{atkPct:12,crit:5,critdPct:8}, skills:[D('奥术冲击','🔮','4倍伤害',4),D('火焰冲击','🔥','5倍灼烧',5,{dot:true}),B('守护者之力','✨','kings','攻防提升'),D('变形术','🐑','4倍伤害',4),B('奥术强能','🌀','bestial','攻击提升')] },
    { key:'azshara',  name:'艾萨拉', emoji:'👑', quality:'orange', role:'dps', desc:'纳迦女王', bonus:{atkPct:12,critdPct:10}, skills:[D('魔力风暴','🌀','4倍伤害',4),D('蛊惑','💫','5倍伤害',5),B('海妖之歌','🎵','battleShout','攻击提升'),D('奥术爆发','💥','5倍伤害',5),B('女王降临','👑','berserk','攻击攻速')] },
    { key:'ragnaros', name:'拉格纳罗斯', emoji:'🔥', quality:'orange', role:'dps', desc:'炎魔之王', bonus:{atkPct:14,critdPct:8}, skills:[D('熔岩爆裂','🌋','5倍灼烧',5,{dot:true}),D('烈焰冲击','🔥','4倍伤害',4),D('火焰新星','☄️','6倍伤害',6),B('元素之怒','⚡','windfury','攻速提升'),D('火焰之子','🔥','5倍伤害',5)] },
    { key:'kelthuzad',name:'克尔苏加德', emoji:'☠️', quality:'orange', role:'dps', desc:'天灾的巫妖', bonus:{atkPct:11,leech:6}, skills:[D('冰霜之球','❄️','4倍伤害',4),D('死亡凋零','💀','5倍灼烧',5,{dot:true}),B('寒冰屏障','🧊','shield','减伤'),D('亡者复生','🧟','5倍伤害',5),B('巫妖之触','👻','shadowstep','攻击提升')] },
    { key:'lichking', name:'巫妖王', emoji:'❄️', quality:'orange', role:'tank', desc:'冰封王座之主', bonus:{atkPct:10,hpPct:10,leech:5}, skills:[D('霜之哀伤','🗡️','5倍吸血',5,{lifeSteal:0.3}),D('死亡缠绕','💀','4倍伤害',4),D('复活瘟疫','🦠','5倍灼烧',5,{dot:true}),B('不羁亡魂','👑','kings','攻防提升'),B('冰封王座','🛡️','sacredShield','防御回复')] },
    { key:'kiljaeden',name:'基尔加丹', emoji:'😈', quality:'orange', role:'dps', desc:'欺诈者', bonus:{atkPct:13,critdPct:10,leech:5}, skills:[D('毁灭','💥','6倍伤害',6),D('黑暗之球','🟣','5倍灼烧',5,{dot:true}),D('痛苦','🔥','5倍伤害',5),B('燃烧军团','😈','berserk','攻击攻速'),D('虚空崩裂','🌌','6倍伤害',6)] },
  ];
  for (const c of add) if (!COMPANIONS.find(x => x.key === c.key)) COMPANIONS.push(c);
})();
