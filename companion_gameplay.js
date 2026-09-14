/* =========================================================
   companion_gameplay.js — 随从玩法扩展
   ---------------------------------------------------------
   1) 好感度: 出战/支援随从随击杀积累好感, 5级, 每级随从属性+2%,
      Lv3「信赖之约」/ Lv5「羁绊大成」触发随从个人传记
   2) 上阵共鸣: 羁绊组合全员上阵(出战+支援)时, 羁绊加成额外+50%
      (计入 collectCompanionMod, 见 combat.js)
   3) 羁绊激活剧情: 羁绊首次激活时播放双人小剧场
   ========================================================= */
(function companionGameplay() {

  /* ---------- 好感度 ---------- */
  const AFF_THRESHOLDS = [0, 60, 180, 450, 1000];   // Lv1..Lv5 累计点数
  window.companionAffinityLevel = function (comp) {
    const p = Math.max(0, (comp && comp.aff) || 0);
    let lv = 1;
    for (let i = 1; i < AFF_THRESHOLDS.length; i++) if (p >= AFF_THRESHOLDS[i]) lv = i + 1;
    return lv;
  };
  window.companionAffinityPoints = function (comp) { return Math.max(0, (comp && comp.aff) || 0); };
  window.companionAffinityNextAt = function (lv) { return AFF_THRESHOLDS[Math.min(AFF_THRESHOLDS.length - 1, lv)] || AFF_THRESHOLDS[AFF_THRESHOLDS.length - 1]; };

  window.companionAffinityGain = function (amount) {
    if (!amount || !state.companions || !state.companions.length) return;
    const targets = new Set();
    const act = state.companions[state.activeCompanion];
    if (act) targets.add(act);
    for (const k of (state.companionSupport || [])) {
      const c = state.companions.find(x => x.key === k);
      if (c) targets.add(c);
    }
    for (const c of targets) {
      const before = companionAffinityLevel(c);
      c.aff = (c.aff || 0) + amount;
      const after = companionAffinityLevel(c);
      if (after > before) {
        const tpl = COMPANIONS.find(x => x.key === c.key);
        log(`❤️ ${tpl ? tpl.name : c.key} 好感度升至 Lv.${after}${after >= 5 ? ' —— 羁绊大成!' : after >= 3 ? ' —— 信赖之约!' : ''}`, 'good');
        if (typeof playSfx === 'function') playSfx(after >= 3 ? 'legend' : 'loot');
        if (after === 3 || after === 5) queueCompanionStory(c, after);
        if (typeof markDirty === 'function') markDirty('companion', 'hero');
      }
    }
  };

  /* ---------- 随从个人传记 ---------- */
  const AFF_STORIES_UNIQUE = {
    uther:     { t3: [{ icon:'🔱', who:'乌瑟尔', text:'你让我想起当年那位执拗的学徒。圣光不弃信念之人——也不弃你。' }], t5: [{ icon:'🔱', who:'乌瑟尔', text:'若有一天我倒下了, 白银之手的旗帜, 由你来举。' }] },
    deathwing: { t3: [{ icon:'🌋', who:'死亡之翼', text:'凡人, 你的胆量取悦了我。大地的裂痕, 允许你同行。' }], t5: [{ icon:'🌋', who:'死亡之翼', text:'记住这一天——我允许一个凡人, 直呼我的真名。' }] },
    ysera:     { t3: [{ icon:'💤', who:'伊瑟拉', text:'你的梦是翠绿色的……很少见。大多数人的梦里只有恐惧。' }], t5: [{ icon:'💤', who:'伊瑟拉', text:'梦境会记得你。哪怕百年之后, 绿龙的翅膀仍会为你遮雨。' }] },
    durotan:   { t3: [{ icon:'🐺', who:'杜隆坦', text:'霜狼只认两样东西: 战友的背, 和兄弟的血。你都证明了自己的。' }], t5: [{ icon:'🐺', who:'杜隆坦', text:'酋长之位可以易主, 霜狼的誓言不会。你, 是我杜隆坦的兄弟。' }] },
    alleria:   { t3: [{ icon:'🎯', who:'奥蕾莉亚', text:'一千次瞄准里, 你只失误了一次。比我的游侠们强。' }], t5: [{ icon:'🎯', who:'奥蕾莉亚', text:'风行者从不轻易许诺。但你的箭, 我挡。' }] },
    fordring:  { t3: [{ icon:'⚖️', who:'提里奥', text:'圣光从不问出身。你的作为, 已经是你的勋章。' }], t5: [{ icon:'⚖️', who:'提里奥', text:'我的圣疗为你而备——不是职责, 是心意。' }] },
    lichking:  { t3: [{ icon:'❄️', who:'巫妖王', text:'有趣……你的意志没有被冰霜压弯。这份顽强, 值得留存。' }], t5: [{ icon:'❄️', who:'巫妖王', text:'为了你, 我愿让霜之哀伤迟疑一瞬。仅此一瞬。' }] },
    sylvanas:  { t3: [{ icon:'🏹', who:'希尔瓦娜斯', text:'被遗忘者不相信任何活人。你是个例外, 别让我后悔。' }], t5: [{ icon:'🏹', who:'希尔瓦娜斯', text:'黑暗之门也拆不散的, 除了我的仇恨, 现在还有你。' }] },
    grommash:  { t3: [{ icon:'🪓', who:'格罗玛什', text:'吼得好! 战歌氏族就缺你这样的疯子!', }], t5: [{ icon:'🪓', who:'格罗玛什', text:'时机成熟之时, 我愿与你并肩冲锋——那时机, 马上就到!' }] },
    illidan:   { t3: [{ icon:'😈', who:'伊利丹', text:'你背叛了自己的怯懦。这一点, 我认可。' }], t5: [{ icon:'😈', who:'伊利丹', text:'我已孤身百年。你的陪伴……并非不可忍受。' }] },
  };
  function companionStoryScript(comp, lv) {
    const tpl = COMPANIONS.find(x => x.key === comp.key) || { name: comp.key, emoji: '🐾', role: 'dps' };
    const uniq = AFF_STORIES_UNIQUE[comp.key];
    const title = lv >= 5 ? '羁绊大成' : '信赖之约';
    const steps = [{ icon: tpl.emoji || '🐾', who: tpl.name, text: (uniq ? (lv >= 5 ? uniq.t5[0].text : uniq.t3[0].text) : roleStoryLine(tpl, lv)), scene: `${tpl.name} · ${title}` }];
    steps.push({ icon:'❤️', who:'羁绊', text: lv >= 5
      ? `${tpl.name}与你之间的信任已无可动摇, 参战属性永久+10%。`
      : `${tpl.name}开始真正信赖你, 参战属性永久+6%。` });
    return { steps, lastLabel: '铭记于心 ▸' };
  }
  function roleStoryLine(tpl, lv){
    const byRole = {
      tank: lv >= 5
        ? `这面盾牌曾护住你的背无数次。以后也一样——只要我还站着。`
        : `站在我身后的感觉如何? 习惯它, 因为我哪儿也不去。`,
      heal: lv >= 5
        ? `你的伤口我都记得——每一次, 我都不会再让它们裂开。`
        : `治疗之手只为信任之人伸出。你的名字在我心里。`,
      dps: lv >= 5
        ? `我砍过的敌人排起来能绕暴风城三圈。但并肩作战的感觉, 你给的最多。`
        : `你的指挥越来越像个老练的猎手了。跟得上我的节奏。`,
    };
    return byRole[tpl.role] || byRole.dps;
  }
  window.queueCompanionStory = function (comp, lv) {
    const key = comp.key + ':' + lv;
    if (!state._compStorySeen || typeof state._compStorySeen !== 'object') state._compStorySeen = {};
    if (state._compStorySeen[key]) return;
    state._compStorySeen[key] = true;
    setTimeout(() => showStoryModal(companionStoryScript(comp, lv)), 900);
  };

  /* ---------- 羁绊激活剧情 ---------- */
  const BOND_STORIES_UNIQUE = {
    '地狱咆哮':  [{ icon:'🩸', who:'格罗玛什', text:'加尔鲁什! 我的儿子! 看看谁与我们并肩!' }, { icon:'🩸', who:'加尔鲁什', text:'父亲……这次, 不会再让荣耀蒙尘。' }],
    '天灾军团':  [{ icon:'💀', who:'克尔苏加德', text:'阿尔萨斯大人, 天灾三杰已就位。' }, { icon:'❄️', who:'巫妖王', text:'那么, 让这个世界感受真正的寒冬。' }],
    '守护者议会': [{ icon:'🔮', who:'麦迪文', text:'卡德加, 吉安娜——守护者的名号, 由我们三人续写。' }],
    '白银之手':  [{ icon:'⚖️', who:'提里奥', text:'以乌瑟尔之名——白银之手的誓言, 永不褪色。' }],
    '守望与背叛': [{ icon:'🦉', who:'玛维', text:'一万年的追猎, 今天居然是并肩作战。伊利丹, 别让我失望。' }],
    '生命圣约':  [{ icon:'🌺', who:'阿莱克丝塔萨', text:'生命的红与圣光的金, 今日同辉。' }],
  };
  let _lastActiveBonds = '';
  window.checkNewBondStories = function () {
    if (typeof activeCompanionBonds !== 'function' || !state.companions || !state.companions.length) return;
    const active = activeCompanionBonds();
    const sig = active.map(b => b.name).sort().join('|');
    if (sig === _lastActiveBonds) return;
    const prev = new Set((_lastActiveBonds || '').split('|').filter(Boolean));
    _lastActiveBonds = sig;
    if (!state._bondStorySeen || typeof state._bondStorySeen !== 'object') state._bondStorySeen = {};
    for (const b of active) {
      if (prev.has(b.name)) continue;
      if (state._bondStorySeen[b.name]) continue;
      state._bondStorySeen[b.name] = true;
      const members = (b.keys || []).map(k => COMPANIONS.find(c => c.key === k)).filter(Boolean);
      if (!members.length) continue;
      const uniq = BOND_STORIES_UNIQUE[b.name];
      const steps = uniq ? uniq.slice() : [
        { icon: members[0].emoji, who: members[0].name, text: `${members.length > 1 ? members[1].name + '——' : ''}「${b.name}」的共鸣在我们之间苏醒了。` },
      ];
      steps.push({ icon:'⚜️', who:'羁绊', text: `「${b.name}」${b.desc || ''} 共鸣已计入你的力量。` });
      setTimeout(() => showStoryModal({ steps, lastLabel: '共鸣 ▸' }), 900);
      break;   // 同帧只播一段, 其余留待后续检查
    }
  };
  window.tickCompanionGameplay = function () {
    if (typeof document === 'undefined' || document.hidden) return;
    const now = Date.now();
    if (tickCompanionGameplay._next && now < tickCompanionGameplay._next) return;
    tickCompanionGameplay._next = now + 4000;
    try { checkNewBondStories(); } catch(e) {}
  };
})();
