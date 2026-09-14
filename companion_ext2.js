/* =========================================================
   companion_ext2.js — 随从图鉴第二批扩编(46 → 60)
   ---------------------------------------------------------
   依赖: COMPANIONS(companion_ext.js)与 COMPANION_UNIQUE_TRAITS(combat.js)
   结构与 companion_ext.js 完全一致: 品质决定技能数(白1/绿2/蓝3/紫4/橙5),
   bonus 决定参战倍率, purple+ 配专属技(signature), 全员配独有性质。
   --------------------------------------------------------- */
(function expandCompanions2() {
  if (typeof COMPANIONS === 'undefined') return;

  const D = (name, icon, desc, mul, extra) => Object.assign({ name, icon, desc, type: 'dmg', mul, cd: 8 }, extra || {});
  const H = (name, icon, heal, cd) => ({ name, icon, desc: `恢复${Math.round(heal * 100)}%生命`, type: 'heal', heal, cd: cd || 14 });
  const B = (name, icon, buff, desc, cd) => ({ name, icon, desc, type: 'buff', buff, duration: 6000, cd: cd || 30 });

  const add2 = [
    // ---------- 白(1技能)----------
    { key: 'worg_rider', name: '狼骑兵', emoji: '🐺', quality: 'white', role: 'dps', desc: '北门哨站的狼骑斥候', bonus: { spdPct: 3, atkPct: 2 }, skills: [D('跃击', '💨', '2.2倍伤害', 2.2, { cd: 5 })] },

    // ---------- 绿(2技能)----------
    { key: 'gnome_eng', name: '侏儒工程兵', emoji: '🔧', quality: 'green', role: 'dps', desc: '诺莫瑞根的拆解专家', bonus: { crit: 3, atkPct: 2 }, skills: [D('手雷投掷', '💣', '3倍伤害', 3), B('火箭靴', '🥾', 'rapidFire', '10秒攻速提升')] },
    { key: 'scarlet_chap', name: '血色随军牧师', emoji: '📖', quality: 'green', role: 'heal', desc: '修道院的战地祷士', bonus: { regFlat: 3, hpPct: 2 }, skills: [H('圣言术', '🕊️', 0.16, 12), D('惩击', '✨', '2.5倍伤害', 2.5)] },

    // ---------- 蓝(3技能)----------
    { key: 'thassarian', name: '塔萨安', emoji: '⚔️', quality: 'blue', role: 'dps', desc: '天灾战争的死亡骑士', bonus: { atkPct: 4, critdPct: 4 }, skills: [D('湮灭', '🌑', '3.5倍伤害', 3.5), D('冰链', '❄️', '3倍伤害减速', 3, { slow: true }), B('符文刃舞', '🗡️', 'rapidFire', '10秒攻速提升')] },
    { key: 'earthen_ring', name: '大地之环长老', emoji: '🪨', quality: 'blue', role: 'heal', desc: '修复世界裂痕的萨满', bonus: { regFlat: 4, hpPct: 4 }, skills: [H('治疗之涌', '🌊', 0.2, 12), B('先祖护持', '🪶', 'earthShield', '8秒护持'), D('熔岩爆裂', '🌋', '3倍伤害', 3)] },
    { key: 'kor_kron', name: '库卡隆军官', emoji: '🪖', quality: 'blue', role: 'tank', desc: '部落的精锐督军', bonus: { hpPct: 5, defPct: 5 }, skills: [D('督军打击', '🪓', '3.5倍伤害', 3.5), B('库卡隆壁垒', '🛡️', 'shield', '8秒减伤'), D('战争冲锋', '💢', '3倍伤害眩晕', 3, { stun: true })] },

    // ---------- 紫(4-5技能)----------
    { key: 'uther', name: '乌瑟尔·光明使者', emoji: '🔱', quality: 'purple', role: 'tank', desc: '白银之手的创始人', bonus: { hpPct: 6, defPct: 6, regFlat: 4 }, skills: [D('正义锤击', '⚖️', '3.5倍伤害', 3.5, { cd: 8 }), B('圣盾术', '🟡', 'sacredShield', '8秒神圣庇护', 18), H('圣光闪现', '💖', 0.18, 14), B('十字军号令', '📯', 'kings', '8秒攻防提升', 26)] },
    { key: 'alleria', name: '奥蕾莉亚·风行者', emoji: '🎯', quality: 'purple', role: 'dps', desc: '游侠传奇与远征先锋', bonus: { atkPct: 5, crit: 5, spdPct: 4 }, skills: [D('游侠标记', '👁️', '3.5倍伤害', 3.5, { cd: 8 }), D('多重穿刺', '🏹', '4倍伤害', 4, { cd: 12 }), B('风行聚焦', '🍃', 'rapidFire', '10秒攻速提升', 22), D('穿云一箭', '💫', '5倍伤害', 5, { cd: 16 })] },
    { key: 'brann', name: '布莱恩·铜须', emoji: '🗺️', quality: 'purple', role: 'dps', desc: '为探险而生的大考古家', bonus: { atkPct: 4, crit: 4, vers: 4 }, skills: [D('考古炸药', '💣', '3.5倍伤害', 3.5, { cd: 8 }), D('古神知识', '📘', '4倍伤害', 4, { cd: 12 }), B('战术召集', '📣', 'battleShout', '10秒全队强化', 22), D ('圣物震击', '🔮', '4.5倍伤害', 4.5, { cd: 16 })] },
    { key: 'darion', name: '达里安·莫格莱尼', emoji: '🖤', quality: 'purple', role: 'tank', desc: '黑锋骑士团大领主', bonus: { hpPct: 6, defPct: 6, leech: 4 }, skills: [D('黑锋斩', '🗡️', '3.5倍伤害', 3.5, { cd: 8 }), B('反魔法护壳', '🛡️', 'shield', '8秒减伤', 18), D('凋零缠绕', '💀', '4倍伤害', 4, { cd: 13 }), B('黑锋号令', '📯', 'kings', '8秒攻防提升', 26)] },
    { key: 'hamuul', name: '哈缪尔·符文图腾', emoji: '🐂', quality: 'purple', role: 'heal', desc: '首位牛头人德鲁伊', bonus: { hpPct: 5, regFlat: 5, vers: 3 }, skills: [H('生命之种', '🌱', 0.2, 12), B('荆棘护体', '🌵', 'bark', '8秒减伤', 18), D('星火术', '🌟', '3.5倍伤害', 3.5, { cd: 10 }), H('自然疗愈', '🍃', 0.24, 20)] },

    // ---------- 橙(5技能)----------
    { key: 'ysera', name: '伊瑟拉', emoji: '💚', quality: 'orange', role: 'heal', desc: '梦境之王与绿龙女王', bonus: { hpPct: 8, regFlat: 8, spi: 4 }, skills: [H('梦境吐息', '💤', 0.24, 10), D('月火灼烧', '🌙', '4倍伤害', 4, { cd: 10 }), B('翡翠屏障', '🛡️', 'sacredShield', '8秒厚护盾', 18), H ('绿龙之梦', '🌳', 0.36, 24), B('梦境赐福', '🍀', 'kings', '10秒全队强化', 24)] },
    { key: 'durotan', name: '杜隆坦', emoji: '🐺', quality: 'orange', role: 'dps', desc: '霜狼氏族的重情之主', bonus: { atkPct: 7, hpPct: 5, leech: 4 }, skills: [D('霜狼撕咬', '🐺', '4.2倍伤害', 4.2, { cd: 8 }), B('霜狼之魂', '❄️', 'berserk', '10秒狂暴', 20), D('战狼冲撞', '💥', '5倍伤害眩晕', 5, { cd: 14, stun: true }), D('部族斩杀', '🪓', '6倍伤害', 6, { cd: 18 }), H('氏族坚韧', '❤️', 0.14, 20)] },
    { key: 'deathwing', name: '死亡之翼', emoji: '🌋', quality: 'orange', role: 'dps', desc: '大地守护者的堕落形态', bonus: { atkPct: 9, critdPct: 9, crit: 4 }, skills: [D('大灾变', '🌋', '5倍灼烧', 5, { cd: 10, dot: true }), D ('熔岩护甲', '🔥', '4.5倍伤害', 4.5, { cd: 9 }), B('大地之怒', '⚡', 'windfury', '10秒攻速提升', 22), D('裂地俯冲', '☄️', '6倍伤害', 6, { cd: 18 }), B('灭世威压', '👑', 'kings', '10秒攻防提升', 24)] },
  ];
  for (const c of add2) if (!COMPANIONS.find(x => x.key === c.key)) COMPANIONS.push(c);

  /* ---------- 专属技 ---------- */
  const sig = (key, s) => { const c = COMPANIONS.find(x => x.key === key); if (c) c.signature = Object.assign({ _signature: true }, s); };
  sig('uther',     { name:'圣光庇护', icon:'✋', desc:'圣光庇护全队并施加厚护盾', type:'buff', buff:'sacredShield', buffTarget:'both', duration:8000, shieldPct:0.12, cleanse:true, cd:24 });
  sig('alleria',   { name:'风行者的猎风', icon:'🏹', desc:'箭雨覆盖全场, 高倍率群射', type:'dmg', mul:4.6, desc2:'aoe', cd:19 });
  sig('brann',     { name:'探险家的底牌', icon:'🗺️', desc:'召唤考古支援轰炸, 兼顾破甲', type:'dmg', mul:4.2, debuff:'sunder', cd:18 });
  sig('darion',    { name:'黑锋之门', icon:'🖤', desc:'汲取黑暗力量护持全队并反伤', type:'buff', buff:'divine', duration:8000, buffTarget:'both', shieldPct:0.1, cd:22 });
  sig('hamuul',    { name:'自然之潮', icon:'🌿', desc:'生命之潮涌向全队, 净化并回复', type:'heal', heal:0.22, healTarget:'smart', cleanse:true, cd:20 });
  sig('ysera',     { name:'翡翠梦境', icon:'💤', desc:'梦境之力涌入, 大量回复与厚盾', type:'heal', heal:0.26, healTarget:'smart', shieldPct:0.1, cd:22 });
  sig('durotan',   { name:'霜狼盟约', icon:'❄️', desc:'唤出霜狼之魂协同撕咬', type:'dmg', mul:5.2, cd:18 });
  sig('deathwing', { name:'灭世烈焰', icon:'🔥', desc:'大地的怒火焚尽一切, 高倍灼烧', type:'dmg', mul:6.2, dot:true, cd:20 });
  sig('thassarian', { name:'符文强化', icon:'🩸', desc:'符文之力灌注, 攻速与吸血齐升', type:'buff', buff:'shadowstep', duration:8000, buffTarget:'companion', cd:20 });
  sig('kor_kron',  { name:'库卡隆战旗', icon:'🚩', desc:'战旗立起, 稳固防线并反击', type:'buff', buff:'shield', duration:8000, buffTarget:'both', shieldPct:0.08, cd:22 });

  /* ---------- 独有性质 ---------- */
  const U = (typeof COMPANION_UNIQUE_TRAITS !== 'undefined') ? COMPANION_UNIQUE_TRAITS : null;
  if (U) {
    U.worg_rider =  { name:'狼骑急行', icon:'🐺', tags:['execute','veteran'], spd:1.05, atk:1.05, crit:3, desc:'低级斩杀位, 越战越快。' };
    U.gnome_eng =   { name:'工程彩蛋', icon:'💣', tags:['aoe','mark','veteran'], crit:4, cdr:0.94, specialPower:1.07, desc:'手雷与标记频率更高, 多目标更亮。' };
    U.scarlet_chap ={ name:' fervent祷文', icon:'📖', tags:['heal','cleanse','veteran'], healPower:1.12, supportPower:1.1, desc:'低级净化治疗支援, 高压图好用。' };
    U.thassarian =  { name:'双符文共鸣', icon:'❄️', tags:['dot','control','sustain'], atk:1.04, specialPower:1.08, cdr:0.95, desc:'冰链与凋零的节奏更密。' };
    U.earthen_ring ={ name:'大地脉络', icon:'🪨', tags:['heal','sustain','shield'], healPower:1.1, reg:1.12, desc:'护持与治疗更厚实。' };
    U.kor_kron =    { name:'督军威仪', icon:'🪖', tags:['tank','sunder','control'], def:1.06, hp:1.03, specialPower:1.07, desc:'承压时反制更有威胁。' };
    U.uther =       { name:'光明使者誓约', icon:'⚖️', tags:['tank','shield','cleanse','boss'], def:1.06, hp:1.05, shieldPower:1.12, cdr:0.95, desc:'首领战和护盾专属更厚, 净化更稳。' };
    U.alleria =     { name:'远征者之眼', icon:'🎯', tags:['mark','aoe','boss'], atk:1.05, crit:4, dungeon:1.05, desc:'标记与首领战收益更高。' };
    U.brann =       { name:'铜须家的运气', icon:'🗺️', tags:['mark','summon','aoe'], crit:4, specialPower:1.08, cdr:0.94, desc:'支援轰炸更频繁, 多目标更稳。' };
    U.darion =      { name:'灰烬使团', icon:'🖤', tags:['tank','shield','sustain'], def:1.06, hp:1.04, leech:4, shieldPower:1.1, desc:'黑锋的生存与反噬更可靠。' };
    U.hamuul =      { name:'两界智慧', icon:'🌙', tags:['heal','cleanse','sustain'], healPower:1.12, reg:1.1, supportPower:1.08, desc:'治疗与净化支援更强。' };
    U.ysera =       { name:'梦境低语', icon:'💤', tags:['heal','shield','sustain'], healPower:1.16, hp:1.05, shieldPower:1.1, desc:'治疗专属厚盾更强, 长战更稳。' };
    U.durotan =     { name:'霜狼重情', icon:'🐺', tags:['execute','sustain','boss'], atk:1.05, hp:1.04, leech:4, desc:'斩杀与首领续航更强。' };
    U.deathwing =   { name:'灭世审判', icon:'🌋', tags:['aoe','dot','stun'], atk:1.06, specialPower:1.12, critd:8, desc:'灼烧与清场爆发更凶。' };
  }
})();
