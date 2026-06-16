/* =========================================================
   talents_ext.js — 给每个专精树追加 10 个进阶天赋
   ----------------------------------------------------------
   背景:80 级约得 79 天赋点,而单棵专精树原容量 ~70,约 10 点浪费。
   这里在加载时(data.js 之后)给每棵树按"攻/守"定位各追加 10 个高 req
   天赋,既吃掉浪费的点,又因总容量>可用点数而产生 build 取舍。
   其中包含原先挪出去的"纯属性被动"(武器大师/致命精准/钢铁之躯/吸血/全能),
   现在改为由天赋点点出。所有 mod 都用 recomputeStats 已支持的 schema。
   ========================================================= */
(function extendTalentTrees() {
  if (typeof CLASSES === 'undefined') return;
  const REQ = [46, 48, 50, 53, 56, 60, 63, 66, 70, 72];

  // 攻击向进阶池(含挪来的:武器大师/致命精准/渴血/全能/精通)
  const OFFENSE = [
    { name:'武器大师', desc:'攻击 +1%/层',            max:5, mod:{atkPct:1} },
    { name:'致命精准', desc:'暴击 +2%/层 · 暴伤 +6%/层', max:5, mod:{crit:2, critdPct:6} },
    { name:'疾风步',   desc:'攻速 +5%/层',            max:5, mod:{spdPct:5} },
    { name:'连击',     desc:'攻击有 3%/层 几率额外攻击一次', max:5, mod:{extraAtk:3} },
    { name:'破甲',     desc:'攻击无视目标 4%/层 护甲',  max:5, mod:{armorPen:4} },
    { name:'狂暴',     desc:'攻击 +2%/层 · 攻速 +3%/层', max:3, mod:{atkPct:2, spdPct:3} },
    { name:'处决精通', desc:'斩杀加成 +6%/层',         max:3, mod:{executeBonus:6} },
    { name:'震慑打击', desc:'攻击有 1%/层 几率击晕敌人1.5秒', max:3, mod:{stunChance:1} },
    { name:'精通·攻', desc:'精通 +2%/层',            max:3, mod:{mastery:2} },
    { name:'战争领主', desc:'攻击 +1%/层 · 暴伤 +10%/层 · 精通 +2%/层', max:3, mod:{atkPct:4, critdPct:10, mastery:3} },
  ];
  // 防御向进阶池(含挪来的:钢铁之躯/全能宗师/精通)
  const DEFENSE = [
    { name:'钢铁之躯', desc:'生命 +6%/层',            max:5, mod:{hpPct:6} },
    { name:'铜墙铁壁', desc:'防御 +6%/层 · 生命 +4%/层', max:5, mod:{defPct:6, hpPct:4} },
    { name:'壁垒',     desc:'耐力 +6%/层',            max:5, mod:{staPct:6} },
    { name:'荆棘护甲', desc:'反伤 +4%/层',            max:5, mod:{reflectDmg:4} },
    { name:'闪避',     desc:'有 2%/层 几率闪避敌人攻击', max:5, mod:{dodge:2} },
    { name:'守护',     desc:'防御 +8%/层',            max:3, mod:{defPct:8} },
    { name:'韧性',     desc:'生命 +5%/层 · 全能 +2%/层', max:3, mod:{hpPct:5, vers:2} },
    { name:'节能',     desc:'技能减耗 +4%/层',         max:3, mod:{costReduction:4} },
    { name:'精通·守', desc:'精通 +2%/层 · 防御 +4%/层', max:3, mod:{mastery:2, defPct:4} },
    { name:'不灭壁垒', desc:'生命 +12%/层 · 防御 +10%/层 · 精通 +2%/层', max:3, mod:{hpPct:12, defPct:10, mastery:3} },
  ];

  function treeRole(tree) {
    let off = 0, def = 0;
    for (const t of tree.talents) {
      const m = t.mod || {};
      for (const k in m) {
        const v = m[k];
        if (['hpPct','defPct','staPct','reflectDmg'].includes(k)) def += v;
        else if (['atkPct','crit','critdPct','spdPct','extraAtk','executeBonus','strPct','agiPct','intPct'].includes(k)) off += v;
      }
    }
    return def > off ? 'def' : 'off';
  }

  for (const clsKey in CLASSES) {
    const cls = CLASSES[clsKey];
    if (!cls.trees) continue;
    for (const tree of cls.trees) {
      if (tree._ext10) continue;      // 幂等:只追加一次
      tree._ext10 = true;
      const pool = treeRole(tree) === 'def' ? DEFENSE : OFFENSE;
      const added = pool.map((tpl, i) => {
        const node = {
          key: `ext_${clsKey}_${tree.key}_${i}`,
          name: tpl.name, desc: tpl.desc, max: tpl.max,
          req: REQ[i], mod: Object.assign({}, tpl.mod),
        };
        tree.talents.push(node);
        return node;
      });
      // 保证该树总容量 ≥ 82,使 80 级(~79 点)无论哪个职业都不浪费天赋点,且略有取舍
      let cap = tree.talents.reduce((s, t) => s + (t.max || 0), 0);
      let gi = 0;
      while (cap < 82 && gi < 1000) {
        const node = added[gi % added.length];
        if (node.max < 10) { node.max++; cap++; }
        gi++;
      }
    }
  }
})();
