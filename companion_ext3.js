/* =========================================================
   companion_ext3.js — 随从图鉴第三批扩编(60 → 80)
   ---------------------------------------------------------
   依赖 COMPANIONS 与 COMPANION_UNIQUE_TRAITS, 结构同 companion_ext2。
   本批 20 位: 白2 绿3 蓝5 紫6 橙4, 坦克5/治疗5/输出10。
   ========================================================= */
(function expandCompanions3() {
  if (typeof COMPANIONS === 'undefined') return;

  const D = (name, icon, desc, mul, extra) => Object.assign({ name, icon, desc, type: 'dmg', mul, cd: 8 }, extra || {});
  const H = (name, icon, heal, cd) => ({ name, icon, desc: `恢复${Math.round(heal * 100)}%生命`, type: 'heal', heal, cd: cd || 14 });
  const B = (name, icon, buff, desc, cd) => ({ name, icon, desc, type: 'buff', buff, duration: 6000, cd: cd || 30 });

  const add3 = [
    // ---------- 白(1技能)----------
    { key: 'peon', name: '苦工', emoji: '🔨', quality: 'white', role: 'tank', desc: '干活第一名, 挨打也是第一名', bonus: { hpPct: 3 }, skills: [D('挥镐', '⛏️', '2倍伤害', 2, { cd: 6 })] },
    { key: 'bat_rider', name: '蝙蝠骑士', emoji: '🦇', quality: 'white', role: 'dps', desc: '巨魔部族的空中斥候', bonus: { spdPct: 3 }, skills: [D('俯冲投掷', '💣', '2.2倍伤害', 2.2, { cd: 5 })] },

    // ---------- 绿(2技能)----------
    { key: 'seed_druid', name: '见习德鲁伊', emoji: '🌱', quality: 'green', role: 'heal', desc: '半神门下的新芽', bonus: { regFlat: 3, hpPct: 2 }, skills: [H('萌芽治愈', '🌿', 0.15, 12), D('月火术', '🌙', '2.5倍伤害', 2.5)] },
    { key: 'troll_axe', name: '巨魔掷斧手', emoji: '🪓', quality: 'green', role: 'dps', desc: '祖阿曼外围的猎手', bonus: { atkPct: 3, crit: 2 }, skills: [D('回旋飞斧', '🪓', '3倍伤害', 3), D('毒斧劈砍', '🧪', '2.5倍伤害', 2.5, { dot: true })] },
    { key: 'defias_blade', name: '迪菲亚刀手', emoji: '🗡️', quality: 'green', role: 'dps', desc: '兄弟会的亡命刀客', bonus: { crit: 3, spdPct: 2 }, skills: [D('连环刀', '🔪', '3倍伤害', 3), B('烟幕', '💨', 'rapidFire', '10秒攻速提升')] },

    // ---------- 蓝(3技能)----------
    { key: 'garona', name: '迦罗娜', emoji: '🌑', quality: 'blue', role: 'dps', desc: '半兽人刺客与影子', bonus: { crit: 4, spdPct: 3 }, skills: [D('暗影突袭', '🗡️', '3.5倍伤害', 3.5), D('剧毒匕首', '🧪', '3倍伤害', 3, { dot: true }), B('隐匿', '👣', 'rapidFire', '10秒攻速提升')] },
    { key: 'tess', name: '泰丝·灰MANE', emoji: '🏇', quality: 'blue', role: 'dps', desc: '库尔提拉斯的游侠', bonus: { atkPct: 3, crit: 3, spdPct: 3 }, skills: [D('精准射击', '🎯', '3.5倍伤害', 3.5), D('散弹齐发', '💥', '3倍伤害', 3), B('游侠直觉', '🍃', 'rapidFire', '10秒攻速提升')] },
    { key: 'nathanos', name: '纳萨诺斯', emoji: '🏹', quality: 'blue', role: 'dps', desc: '被遗忘者的 Champion', bonus: { atkPct: 4, critdPct: 3 }, skills: [D('黑暗射击', '🌑', '3.5倍伤害', 3.5), D('腐蚀之箭', '☣️', '3倍伤害', 3, { dot: true }), B('女王猎犬', '🐕', 'berserk', '10秒攻击提升')] },
    { key: 'draka', name: '德拉卡', emoji: '🌊', quality: 'blue', role: 'heal', desc: '霜狼氏族的萨满之母', bonus: { regFlat: 4, hpPct: 3 }, skills: [H('霜狼疗愈', '❄️', 0.2, 12), B('先祖之盾', '🪶', 'earthShield', '8秒护持'), D('冰霜震击', '⚡', '3倍伤害', 3)] },
    { key: 'dathrohan', name: '大十字军达索汉', emoji: '⚜️', quality: 'blue', role: 'tank', desc: '血色十字军的统帅', bonus: { hpPct: 5, defPct: 4 }, skills: [D('圣令审判', '⚜️', '3.5倍伤害', 3.5), B('十字军壁垒', '🛡️', 'shield', '8秒减伤'), D('惩戒重锤', '🔨', '3倍伤害', 3)] },

    // ---------- 紫(4-5技能)----------
    { key: 'genn', name: '吉恩·灰MANE', emoji: '🐺', quality: 'purple', role: 'tank', desc: '吉尔尼斯的狼人之王', bonus: { hpPct: 6, defPct: 5, atkPct: 3 }, skills: [D('野性撕咬', '🐺', '3.8倍伤害', 3.8, { cd: 8 }), B('狼王咆哮', '📯', 'berserk', '10秒攻击提升', 20), D('疾风扑杀', '💨', '4.2倍伤害', 4.2, { cd: 13 }), H('狩猎回复', '🍖', 0.14, 20)] },
    { key: 'magni', name: '麦格妮·铜须', emoji: '💠', quality: 'purple', role: 'heal', desc: '与世界对话的大使', bonus: { hpPct: 5, regFlat: 5, defPct: 3 }, skills: [H('大地之愈', '💠', 0.2, 12), B('晶化壁垒', '🛡️', 'sacredShield', '8秒晶体护盾', 18), D('大地震击', '⛰️', '3.5倍伤害', 3.5, { cd: 10 }), H('血石回响', '💗', 0.22, 20)] },
    { key: 'cho', name: '游学者周卓', emoji: '📜', quality: 'purple', role: 'dps', desc: '说书人, 也是战场上的智者', bonus: { atkPct: 4, crit: 3, vers: 4 }, skills: [D('轶事冲击', '📖', '3.5倍伤害', 3.5, { cd: 8 }), D('醒酒风', '🍺', '3倍伤害', 3, { slow: true }), B('古老智慧', '🧠', 'kings', '10秒攻防提升', 24), D('历史重演', '⏳', '4.2倍伤害', 4.2, { cd: 15 })] },
    { key: 'garrod', name: '加洛德·影歌', emoji: '🛡️', quality: 'purple', role: 'tank', desc: '暗夜精灵的忠诚统帅', bonus: { hpPct: 6, defPct: 5, vers: 3 }, skills: [D('哨兵反击', '🛡️', '3.6倍伤害', 3.6, { cd: 8 }), B('影歌阵线', '🌑', 'shield', '8秒减伤', 18), D('月刃投掷', '🌙', '4倍伤害', 4, { cd: 13 }), B('统帅号令', '📯', 'battleShout', '10秒攻击提升', 24)] },
    { key: 'rhonin', name: '罗宁', emoji: '📕', quality: 'purple', role: 'dps', desc: '肯瑞托的莽劲大法师', bonus: { atkPct: 5, critdPct: 5, crit: 3 }, skills: [D('烈焰风暴', '🔥', '3.8倍伤害', 3.8, { cd: 8 }), D('奥术乱流', '✨', '4.2倍伤害', 4.2, { cd: 12 }), B('法力过载', '⚡', 'rapidFire', '10秒急速施法', 22), D('巨龙吐息', '🐲', '4.8倍伤害', 4.8, { cd: 16 })] },
    { key: 'whitemane', name: '怀特迈恩', emoji: '🌹', quality: 'purple', role: 'heal', desc: '血色大祭司与复活狂信者', bonus: { hpPct: 5, atkPct: 3, regFlat: 4 }, skills: [H('圣光惩击', '🌹', 0.18, 12), D('审判之炎', '🔥', '3.5倍伤害', 3.5, { cd: 10 }), B('狂信庇护', '⚜️', 'sacredShield', '8秒护盾', 18), H('复活术', '⚡', 0.26, 22)] },

    // ---------- 橙(5技能)----------
    { key: 'archimonde', name: '阿克蒙德', emoji: '😈', quality: 'orange', role: 'dps', desc: '污染者, 军团的执剑人', bonus: { atkPct: 8, critdPct: 9, crit: 4 }, skills: [D('混沌之火', '🔥', '4.5倍灼烧', 4.5, { cd: 9, dot: true }), D('暗影爆裂', '🌑', '5倍伤害', 5, { cd: 12 }), B('军团威压', '😈', 'berserk', '10秒狂暴', 20), D('恐惧践踏', '👣', '5.5倍伤害眩晕', 5.5, { cd: 16, stun: true }), D('末日流星', '☄️', '6倍伤害', 6, { cd: 20 })] },
    { key: 'mannoroth', name: '玛诺洛斯', emoji: '👹', quality: 'orange', role: 'dps', desc: '深渊领主, 血咒的铸造者', bonus: { atkPct: 7, hpPct: 6, leech: 5 }, skills: [D('深渊重击', '🩸', '4.5倍伤害吸血', 4.5, { cd: 9, lifeSteal: 0.25 }), D('地狱火雨', '☄️', '5倍伤害', 5, { cd: 13 }), B('血咒咆哮', '🩸', 'berserk', '10秒狂暴', 20), D('巨矛穿刺', '🔱', '5.5倍伤害', 5.5, { cd: 17 }), B('军团之主', '😈', 'kings', '10秒攻防提升', 24)] },
    { key: 'aegwynn', name: '艾格文', emoji: '🌌', quality: 'orange', role: 'heal', desc: '击败萨格拉斯的前任守护者', bonus: { hpPct: 7, regFlat: 7, crit: 4 }, skills: [H('守护者之愈', '✨', 0.24, 11), D('提瑞斯法新星', '🔮', '4.2倍伤害', 4.2, { cd: 10 }), B('守护者结界', '🛡️', 'sacredShield', '8秒厚重结界', 18), H('岁月回响', '⏳', 0.3, 22), D('禁忌奥术', '🌌', '4.8倍伤害', 4.8, { cd: 15 })] },
    { key: 'anubarak', name: '阿努巴拉克', emoji: '🕷️', quality: 'orange', role: 'tank', desc: '叛变的蜘蛛之王, 天灾雄将', bonus: { hpPct: 8, defPct: 7, hp: 0 }, skills: [D('蛛王重刺', '🕷️', '4倍伤害', 4, { cd: 8 }), B('甲壳硬化', '🛡️', 'sacredShield', '8秒厚重甲壳', 18), D('地穴尖刺', '⛰️', '4.8倍伤害', 4.8, { cd: 13, stun: true }), H('食腐再生', '🪲', 0.14, 20), B('天灾统御', '💀', 'kings', '10秒攻防提升', 24)] },
  ];
  for (const c of add3) if (!COMPANIONS.find(x => x.key === c.key)) COMPANIONS.push(c);

  /* ---------- 专属技 ---------- */
  const sig = (key, s) => { const c = COMPANIONS.find(x => x.key === key); if (c) c.signature = Object.assign({ _signature: true }, s); };
  sig('garona',    { name:'暗影加冕', icon:'🌑', desc:'影中一击, 必定暴击', type:'dmg', mul:4.4, alwaysCrit:true, cd:20 });
  sig('nathanos',  { name:'女王的猎杀令', icon:'🏹', desc:'标记目标, 高倍穿刺射击', type:'dmg', mul:4.4, debuff:'sunder', cd:19 });
  sig('genn',      { name:'灰MANE之怒', icon:'🐺', desc:'狼王形态全力扑杀并回复', type:'dmg', mul:4.6, cd:18 });
  sig('magni',     { name:'艾泽拉斯之心', icon:'💠', desc:'大地之魂疗愈全队并附盾', type:'heal', heal:0.2, healTarget:'smart', shieldPct:0.09, cd:22 });
  sig('cho',       { name:'传说重述', icon:'📜', desc:'把史书里的英雄召唤进现实, 高倍伤害', type:'dmg', mul:4.4, cd:19 });
  sig('garrod',    { name:'影歌守护', icon:'🌑', desc:'月刃结阵护持全队', type:'buff', buff:'sacredShield', duration:8000, buffTarget:'both', shieldPct:0.1, cd:22 });
  sig('rhonin',    { name:'巨龙法则', icon:'🐉', desc:'三段奥术龙息轰炸', type:'dmg', mul:5, cd:19 });
  sig('whitemane', { name:'狂信复活', icon:'⚡', desc:'大规模圣光回复并净化', type:'heal', heal:0.24, healTarget:'smart', cleanse:true, cd:21 });
  sig('archimonde',{ name:'末日降临', icon:'☄️', desc:'撕裂大地的军团邪术', type:'dmg', mul:6.0, cd:19 });
  sig('mannoroth', { name:'深渊血誓', icon:'🩸', desc:'抽取鲜血回复自身, 高倍吸血', type:'dmg', mul:5.2, lifeSteal:0.35, cd:19 });
  sig('aegwynn',   { name:'守护者遗产', icon:'🌌', desc:'提瑞斯法的全部智慧化为治愈洪流', type:'heal', heal:0.26, healTarget:'smart', cleanse:true, cd:22 });
  sig('anubarak',  { name:'地穴领主之威', icon:'🕷️', desc:'甲虫风暴环绕, 厚盾+反伤', type:'buff', buff:'sacredShield', duration:8000, buffTarget:'companion', shieldPct:0.12, cd:22 });

  /* ---------- 独有性质 ---------- */
  const U = (typeof COMPANION_UNIQUE_TRAITS !== 'undefined') ? COMPANION_UNIQUE_TRAITS : null;
  if (U) {
    U.peon =        { name:'任劳任怨', icon:'🔨', tags:['tank','sustain','veteran'], hp:1.06, reg:1.14, desc:'便宜, 但出奇地能扛。' };
    U.bat_rider =   { name:'夜行俯冲', icon:'🦇', tags:['execute','veteran'], spd:1.05, crit:3, desc:'低级速攻位, 抢 先手补刀。' };
    U.seed_druid =  { name:'新芽祈愿', icon:'🌱', tags:['heal','cleanse','veteran'], healPower:1.1, supportPower:1.1, desc:'低级治疗支援, 温和可靠。' };
    U.troll_axe =   { name:'猎手回旋', icon:'🪓', tags:['aoe','dot','veteran'], atk:1.05, specialPower:1.06, desc:'飞斧溅射与毒伤更凶。' };
    U.defias_blade ={ name:'兄弟会旧义', icon:'🗡️', tags:['execute','mark','veteran'], crit:4, cdr:0.94, desc:'开刁与标记更频繁。' };
    U.garona =      { name:'半兽血脉', icon:'🌑', tags:['execute','dot','mark'], crit:5, spd:1.03, cdr:0.94, desc:'刺杀节奏更快, 暴伤更狠。' };
    U.tess =        { name:'灰MANE枪术', icon:'🏇', tags:['aoe','mark','dungeon'], atk:1.04, crit:3, dungeon:1.05, desc:'多目标射击更强, 副本适配好。' };
    U.nathanos =    { name:'女王 Champion', icon:'🏹', tags:['dot','execute','boss'], atk:1.05, critd:6, specialPower:1.08, desc:'对首领的持续压制更强。' };
    U.draka =       { name:'霜狼之魂', icon:'🌊', tags:['heal','sustain','shield'], healPower:1.1, reg:1.12, desc:'治疗与护持更厚实。' };
    U.dathrohan =   { name:'十字军狂热', icon:'⚜️', tags:['tank','shield','cleanse'], def:1.06, shieldPower:1.1, cdr:0.96, desc:'壁垒更硬, 冷却略快。' };
    U.genn =        { name:'狼王追猎', icon:'🐺', tags:['tank','execute','control'], atk:1.04, hp:1.04, specialPower:1.08, desc:'狼形态攻守兼备, 追猎更凶。' };
    U.magni =       { name:'大地代言人', icon:'💠', tags:['heal','shield','sustain'], healPower:1.1, shieldPower:1.1, hp:1.03, desc:'晶化治疗与护盾同时强化。' };
    U.cho =         { name:'醒世名言', icon:'📜', tags:['mark','tempo','aoe'], cdr:0.94, specialPower:1.07, crit:3, desc:'技能冷却更快, 故事更有威力。' };
    U.garrod =      { name:'影歌誓约', icon:'🛡️', tags:['tank','shield','mark'], def:1.06, hp:1.04, shieldPower:1.1, desc:'月刃阵线更坚固。' };
    U.rhonin =      { name:'肯瑞托怒火', icon:'📕', tags:['aoe','dot','caster'], atk:1.05, critd:7, specialPower:1.09, desc:'烈焰与奥术乱流更具毁灭性。' };
    U.whitemane =   { name:'复活狂信', icon:'⚡', tags:['heal','cleanse','tempo'], healPower:1.12, cdr:0.95, crit:3, desc:'治疗冷却更短, 关键时刻更稳。' };
    U.archimonde =  { name:'军团先锋', icon:'😈', tags:['aoe','stun','boss'], atk:1.05, specialPower:1.1, critd:7, desc:'末日级爆发更可怕。' };
    U.mannoroth =   { name:'血咒铸造', icon:'👹', tags:['sustain','dot','boss'], atk:1.04, hp:1.05, leech:4, desc:'吸血续航让战场越打越稳。' };
    U.aegwynn =     { name:'弑神者遗产', icon:'🌌', tags:['heal','shield','boss'], healPower:1.14, cdr:0.95, crit:4, desc:'曾弑杀堕落泰坦的守护者, 关键治疗更可靠。' };
    U.anubarak =    { name:'叛王甲壳', icon:'🕷️', tags:['tank','control','sustain'], def:1.06, hp:1.05, shieldPower:1.08, desc:'地穴领主的甲壳与反伤更硬。' };
  }
})();
