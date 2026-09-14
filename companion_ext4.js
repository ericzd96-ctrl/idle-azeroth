/* =========================================================
   companion_ext4.js — 随从图鉴第四批扩编(80 → 100)
   ---------------------------------------------------------
   依赖 COMPANIONS 与 COMPANION_UNIQUE_TRAITS, 结构同前两批。
   本批 20 位: 白2 绿4 蓝5 紫5 橙4, 坦克5/治疗5/输出10。
   ========================================================= */
(function expandCompanions4() {
  if (typeof COMPANIONS === 'undefined') return;

  const D = (name, icon, desc, mul, extra) => Object.assign({ name, icon, desc, type: 'dmg', mul, cd: 8 }, extra || {});
  const H = (name, icon, heal, cd) => ({ name, icon, desc: `恢复${Math.round(heal * 100)}%生命`, type: 'heal', heal, cd: cd || 14 });
  const B = (name, icon, buff, desc, cd) => ({ name, icon, desc, type: 'buff', buff, duration: 6000, cd: cd || 30 });

  const add4 = [
    // ---------- 白(1技能)----------
    { key: 'militia', name: '民兵', emoji: '🔨', quality: 'white', role: 'tank', desc: '放下锄头拿起木盾', bonus: { hpPct: 3, defPct: 1 }, skills: [D('木盾猛击', '🛡️', '2倍伤害', 2, { cd: 6 })] },
    { key: 'imp', name: '小鬼', emoji: '👺', quality: 'white', role: 'dps', desc: '术士召唤的话痨火苗', bonus: { crit: 2 }, skills: [D('火焰箭', '🔥', '2.2倍伤害', 2.2, { cd: 5 })] },

    // ---------- 绿(2技能)----------
    { key: 'wolf_stalker', name: '狼群猎手', emoji: '🐺', quality: 'green', role: 'dps', desc: '与狼群心意相通', bonus: { atkPct: 3, crit: 2 }, skills: [D('协同撕咬', '🐺', '3倍伤害', 3), D('猎手标记', '🎯', '2.5倍伤害', 2.5)] },
    { key: 'ancient_sapling', name: '新生古树', emoji: '🌳', quality: 'green', role: 'tank', desc: '刚醒来的小小古树', bonus: { hpPct: 4, defPct: 2 }, skills: [D('树根抽击', '🌿', '2.8倍伤害', 2.8), B('生根固守', '🌳', 'bark', '8秒减伤')] },
    { key: 'herbalist', name: '草药学徒', emoji: '🌸', quality: 'green', role: 'heal', desc: '背着一筐止血草', bonus: { regFlat: 3 }, skills: [H('止血草敷贴', '🌿', 0.14, 12), D('荆棘鞭', '🌵', '2.5倍伤害', 2.5)] },
    { key: 'wisp', name: '精灵之火', emoji: '💫', quality: 'green', role: 'heal', desc: '卡利姆多的小光点', bonus: { regFlat: 3, spdPct: 2 }, skills: [H('微光滋养', '💫', 0.13, 11), B('萤火屏障', '✨', 'shield', '8秒轻盾')] },

    // ---------- 蓝(3技能)----------
    { key: 'stormpike_guard', name: '雷矛卫兵', emoji: '⛰️', quality: 'blue', role: 'tank', desc: '奥特兰克的矮人劲旅', bonus: { hpPct: 5, defPct: 4 }, skills: [D('雷矛冲锋', '⚡', '3.5倍伤害', 3.5), B('雷矛列阵', '🛡️', 'shield', '8秒减伤'), D('山崩锤', '🔨', '3倍伤害', 3)] },
    { key: 'frostwolf_wolf', name: '霜狼战狼', emoji: '❄️', quality: 'blue', role: 'dps', desc: '杜隆坦的忠诚伙伴', bonus: { atkPct: 4, spdPct: 3 }, skills: [D('霜牙撕咬', '🦷', '3.5倍伤害', 3.5), D('寒嚎', '❄️', '3倍伤害减速', 3, { slow: true }), B('狼群围猎', '🐺', 'berserk', '10秒攻击提升')] },
    { key: 'si7_agent', name: 'SI:7特工', emoji: '🕴️', quality: 'blue', role: 'dps', desc: '暴风城情报局的利刃', bonus: { crit: 4, spdPct: 3 }, skills: [D('暗杀标记', '🎯', '3.5倍伤害', 3.5), D('速刃连击', '🗡️', '3倍伤害', 3), B('情报撤离', '💨', 'rapidFire', '10秒攻速提升')] },
    { key: 'kirin_tor_battlemage', name: '肯瑞托魔战士', emoji: '🎩', quality: 'blue', role: 'dps', desc: '达拉然的法术前排', bonus: { atkPct: 3, critdPct: 4 }, skills: [D('法刃斩', '⚔️', '3.5倍伤害', 3.5), D('奥术齐射', '✨', '3倍伤害', 3), B('魔甲术', '🔮', 'earthShield', '8秒防御提升')] },
    { key: 'moonwell_priestess', name: '月亮井祭司', emoji: '🌕', quality: 'blue', role: 'heal', desc: '守护月井的暗夜姐妹', bonus: { regFlat: 4, hpPct: 3 }, skills: [H('月井之水', '🌕', 0.19, 12), B('艾露恩庇佑', '🌙', 'sacredShield', '8秒庇护'), D('月刃术', '🌙', '3倍伤害', 3)] },

    // ---------- 紫(4-5技能)----------
    { key: 'nazgrim', name: '纳兹戈林将军', emoji: '🎖️', quality: 'purple', role: 'tank', desc: '至死不退的库卡隆督军', bonus: { hpPct: 6, defPct: 6, atkPct: 3 }, skills: [D('督军斩', '🪓', '3.8倍伤害', 3.8, { cd: 8 }), B('背水列阵', '🛡️', 'shield', '8秒减伤', 18), D('战争铁锤', '🔨', '4.2倍伤害', 4.2, { cd: 13 }), B('荣耀不死', '💀', 'kings', '8秒攻防提升', 25)] },
    { key: 'malganis', name: '玛尔加尼斯', emoji: '🦇', quality: 'purple', role: 'dps', desc: '诅咒教派的恐惧魔王', bonus: { atkPct: 5, leech: 4, critdPct: 4 }, skills: [D('睡眠诅咒', '😴', '3.8倍伤害', 3.8, { cd: 8 }), D('虚空穿心', '🕳️', '4.2倍伤害', 4.2, { cd: 12 }), B('吸血光环', '🩸', 'shadowstep', '10秒吸血再生', 22), D('恐惧咆哮', '🦇', '4.6倍伤害', 4.6, { cd: 16 })] },
    { key: 'lillian_voss', name: '莉莉安·沃斯', emoji: '🔮', quality: 'purple', role: 'dps', desc: '挣脱宿命的被遗忘者刺客', bonus: { atkPct: 5, crit: 5, spdPct: 4 }, skills: [D('影缚突袭', '🔮', '3.8倍伤害', 3.8, { cd: 8 }), D('宿命双刺', '🗡️', '4.2倍伤害', 4.2, { cd: 12 }), B('挣脱束缚', '⛓️', 'rapidFire', '10秒攻速提升', 22), D('亡者之怒', '💀', '4.8倍伤害', 4.8, { cd: 16 })] },
    { key: 'nozdormu', name: '诺兹多姆', emoji: '⏳', quality: 'purple', role: 'dps', desc: '时光之王的永恒之砂', bonus: { atkPct: 4, crit: 4, cdr: 3 }, skills: [D('时沙迸射', '⏳', '3.8倍伤害', 3.8, { cd: 8 }), D('时间减速', '⌛', '3.5倍伤害减速', 3.5, { cd: 12, slow: true }), B('时光回溯', '⏮️', 'rapidFire', '10秒加速', 22), D('永恒之 Sands', '🏜️', '4.5倍伤害', 4.5, { cd: 16 })] },
    { key: 'faol', name: '大主教法奥', emoji: '⛪', quality: 'purple', role: 'heal', desc: '圣光教会的创立者', bonus: { hpPct: 5, regFlat: 5, heal: 3 }, skills: [H('圣言术: 庇', '🕊️', 0.2, 12), B('信仰壁垒', '⛪', 'sacredShield', '8秒庇护', 18), D('圣光怒火', '✨', '3.5倍伤害', 3.5, { cd: 10 }), H('创教祷言', '📜', 0.24, 20)] },

    // ---------- 橙(5技能)----------
    { key: 'freya', name: '芙蕾雅', emoji: '🌿', quality: 'orange', role: 'heal', desc: '孕育艾泽拉斯生命的造物者', bonus: { hpPct: 8, regFlat: 8, heal: 4 }, skills: [H('生命之潮', '🌿', 0.24, 10), D('自然怒火', '🌳', '4.2倍伤害', 4.2, { cd: 10 }), B('孕育结界', '🌸', 'sacredShield', '8秒生命护罩', 18), H('万物苏生', '🌱', 0.36, 24), B('造物赐福', '🌟', 'kings', '10秒全队强化', 24)] },
    { key: 'raden', name: '莱登', emoji: '⚡', quality: 'orange', role: 'dps', desc: '藏于雷霆之下的泰坦守望者', bonus: { atkPct: 8, crit: 5, vers: 4 }, skills: [D('雷霆贯体', '⚡', '4.5倍伤害', 4.5, { cd: 9 }), D('静电力场', '🌩️', '5倍伤害', 5, { cd: 13 }), B(' titan 威仪', '👁️', 'kings', '10秒攻防提升', 22), D('万雷天引', '⛈️', '5.5倍伤害眩晕', 5.5, { cd: 17, stun: true }), H('生命电涌', '💗', 0.12, 20)] },
    { key: 'malygos', name: '玛里苟斯', emoji: '🔷', quality: 'orange', role: 'dps', desc: '魔法之王, 奥术的主宰', bonus: { atkPct: 8, crit: 5, critdPct: 8 }, skills: [D('奥术轰击', '🔷', '4.5倍伤害', 4.5, { cd: 9 }), D('魔法虹吸', '🌀', '5倍伤害', 5, { cd: 13 }), B('法力屏障', '🔷', 'shield', '8秒奥术护盾', 18), D('秘法风暴', '🌪️', '5.5倍伤害', 5.5, { cd: 17 }), B('魔网主宰', '👁️', 'battleShout', '10秒攻击提升', 24)] },
    { key: 'neptulon', name: '耐普图龙', emoji: '🌊', quality: 'orange', role: 'tank', desc: '潮汐之王, 深渊的水君', bonus: { hpPct: 9, defPct: 7, hp: 0 }, skills: [D('潮汐重锤', '🌊', '4.2倍伤害', 4.2, { cd: 8 }), B('深渊护罩', '💧', 'sacredShield', '8秒水幕护罩', 18), D('惊涛骇浪', '🌊', '5倍伤害', 5, { cd: 13 }), H('深渊回涌', '🌀', 0.14, 20), B('水域统御', '👑', 'kings', '10秒攻防提升', 24)] },
  ];
  for (const c of add4) if (!COMPANIONS.find(x => x.key === c.key)) COMPANIONS.push(c);

  /* ---------- 专属技 ---------- */
  const sig = (key, s) => { const c = COMPANIONS.find(x => x.key === key); if (c) c.signature = Object.assign({ _signature: true }, s); };
  sig('nazgrim',   { name:'至死方休', icon:'🎖️', desc:'督军的最后军令: 厚盾+反击姿态', type:'buff', buff:'sacredShield', duration:8000, buffTarget:'both', shieldPct:0.11, cd:23 });
  sig('malganis',  { name:'恐惧瘟疫', icon:'🦇', desc:'恐惧魔王汲取生命, 高倍吸血', type:'dmg', mul:5, lifeSteal:0.3, cd:19 });
  sig('lillian_voss',{ name:'挣脱宿命', icon:'⛓️', desc:'爆发的自由意志, 必定暴击', type:'dmg', mul:4.6, alwaysCrit:true, cd:19 });
  sig('nozdormu',  { name:'永恒之龙', icon:'⏳', desc:'时光倒流轰击, 无视护甲', type:'dmg', mul:4.8, cd:19 });
  sig('faol',      { name:'创教圣言', icon:'⛪', desc:'圣光教义医者仁心, 大量回复+净化', type:'heal', heal:0.26, healTarget:'smart', cleanse:true, cd:22 });
  sig('freya',     { name:'造物之春', icon:'🌸', desc:'生命之潮涌遍全队, 回复+厚盾', type:'heal', heal:0.26, healTarget:'smart', shieldPct:0.1, cd:22 });
  sig('raden',     { name:'泰坦雷霆', icon:'⚡', desc:'贮存的泰坦之力一次性释放', type:'dmg', mul:5.8, cd:19 });
  sig('malygos',   { name:'魔网撕裂', icon:'🌀', desc:'撕开魔网, 奥术洪流倾泻', type:'dmg', mul:5.8, cd:19 });
  sig('neptulon',  { name:'深渊怒潮', icon:'🌊', desc:'大海之力加身, 厚盾+全队强化', type:'buff', buff:'kings', duration:9000, buffTarget:'both', shieldPct:0.09, cd:23 });

  /* ---------- 独有性质 ---------- */
  const U = (typeof COMPANION_UNIQUE_TRAITS !== 'undefined') ? COMPANION_UNIQUE_TRAITS : null;
  if (U) {
    U.militia =     { name:'民兵团操典', icon:'🔨', tags:['tank','shield','veteran'], hp:1.05, def:1.05, desc:'便宜扎实的低级坦克。' };
    U.imp =         { name:'火焰絮叨', icon:'👺', tags:['mark','caster','veteran'], crit:4, cdr:0.94, desc:'话痨火苗的施法节奏更快。' };
    U.wolf_stalker ={ name:'群狼战术', icon:'🐺', tags:['mark','execute','veteran'], atk:1.05, crit:3, desc:'撕咬与标记更连贯。' };
    U.ancient_sapling = { name:'新芽硬壳', icon:'🌳', tags:['tank','sustain','veteran'], hp:1.06, reg:1.12, desc:'小树也会长大。' };
    U.herbalist =   { name:'百草笔记', icon:'🌸', tags:['heal','cleanse','veteran'], healPower:1.1, supportPower:1.1, desc:'草药支援更齐全。' };
    U.wisp =        { name:'艾露恩微光', icon:'💫', tags:['heal','shield','veteran'], healPower:1.1, spd:1.04, desc:'轻盾与滋养更频繁。' };
    U.stormpike_guard = { name:'雷矛战纪', icon:'⛰️', tags:['tank','control','sunder'], def:1.06, specialPower:1.06, desc:'奥特兰克的老兵更硬朗。' };
    U.frostwolf_wolf = { name:'霜狼直觉', icon:'❄️', tags:['execute','sustain','summon'], atk:1.05, spd:1.04, crit:3, desc:'战狼的獠牙更快更冷。' };
    U.si7_agent =   { name:'情报优先', icon:'🕴️', tags:['mark','execute','tempo'], crit:5, cdr:0.93, desc:'SI:7的刺杀节奏冠绝低阶。' };
    U.kirin_tor_battlemage = { name:'法阵操典', icon:'🎩', tags:['mark','aoe','caster'], atk:1.04, critd:5, specialPower:1.06, desc:'法刃与齐射更具穿透力。' };
    U.moonwell_priestess = { name:'月井祝福', icon:'🌕', tags:['heal','cleanse','shield'], healPower:1.1, shieldPower:1.08, desc:'月井之水更充盈。' };
    U.nazgrim =     { name:'将军遗令', icon:'🎖️', tags:['tank','shield','boss'], def:1.06, hp:1.05, shieldPower:1.1, desc:'首领战誓死不退。' };
    U.malganis =    { name:'恐惧凝视', icon:'🦇', tags:['dot','sustain','control'], atk:1.04, leech:4, cdr:0.95, desc:'恐惧与吸血的循环更密。' };
    U.lillian_voss ={ name:'自由意志', icon:'🔮', tags:['execute','tempo','mark'], crit:5, cdr:0.93, desc:'挣脱宿命的刺客出手更果断。' };
    U.nozdormu =    { name:'时之沙漏', icon:'⏳', tags:['tempo','control','aoe'], cdr:0.92, specialPower:1.08, spd:1.04, desc:'时光之王的技能循环最密。' };
    U.faol =        { name:'创教圣恩', icon:'⛪', tags:['heal','cleanse','shield'], healPower:1.12, shieldPower:1.08, desc:'圣光教会的治疗根基深厚。' };
    U.freya =       { name:'造物者仁心', icon:'🌿', tags:['heal','sustain','shield'], healPower:1.14, reg:1.12, hp:1.04, desc:'造物者的生命之潮最是丰沛。' };
    U.raden =       { name:'沉眠雷霆', icon:'⚡', tags:['aoe','stun','boss'], atk:1.05, specialPower:1.1, crit:4, desc:'雷霆蓄力后的爆发更惊人。' };
    U.malygos =     { name:'法网恢恢', icon:'🔷', tags:['aoe','dot','caster'], atk:1.05, crit:4, critd:7, specialPower:1.1, desc:'奥术洪流下一切护甲都是笑话。' };
    U.neptulon =    { name:'潮汐王座', icon:'🌊', tags:['tank','sustain','shield'], hp:1.05, def:1.06, shieldPower:1.1, reg:1.1, desc:'深渊的水幕几乎不可撼动。' };
  }
})();
