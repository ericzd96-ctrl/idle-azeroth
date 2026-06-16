/* =========================================================
   combat.js — 战斗、伤害、技能、怪物、物品、装备
   ========================================================= */

/* ---------- 精通(mastery)被动:按专精映射到一种效果原型,数值随精通点数提升(2026-06-16) ---------- */

/* ---------- Buff 中文名映射(供 UI 显示,覆盖所有来源:玩家技能/随从/硬编码) ---------- */
const BUFF_NAMES = {
  // 玩家技能 + BUFF_FX (效果已减1/3)
  s_burst:       { icon:'💢', name:'爆发',     desc:'攻击+33%·暴伤+20' },
  s_empower:     { icon:'🔥', name:'法术爆发', desc:'暴击+17·暴伤+34' },
  s_frenzy:      { icon:'😡', name:'狂热',     desc:'攻击+20%·攻速+20%' },
  s_mitigate:    { icon:'🧱', name:'减伤',     desc:'受到伤害-34%' },
  s_barrier:     { icon:'🪨', name:'护盾',     desc:'受伤-30%·防御+27%' },
  s_haste:       { icon:'💨', name:'急速',     desc:'攻速+33%' },
  s_lifesurge:   { icon:'🩸', name:'生命洪流', desc:'吸血+20·攻击+13%' },
  s_avatar:      { icon:'⚡', name:'天神下凡', desc:'攻+27%·防+20%·减伤13%' },
  // 硬编码 buff (效果已减1/3)
  shield:        { icon:'🛡️', name:'盾墙',     desc:'防御×1.33' },
  divine:        { icon:'✨', name:'神圣守护', desc:'防御×1.53' },
  bark:          { icon:'🌳', name:'树皮术',   desc:'防御×1.40' },
  iceBarrier:    { icon:'🧊', name:'寒冰屏障', desc:'防御×1.40' },
  earthShield:   { icon:'🪨', name:'大地之盾', desc:'防御×1.33' },
  evasion:       { icon:'💨', name:'闪避',     desc:'防御×1.27' },
  bestial:       { icon:'🐻', name:'野兽狂怒', desc:'攻击×1.27' },
  shadowstep:    { icon:'🌑', name:'暗影步',   desc:'攻击×1.33' },
  battleShout:   { icon:'📯', name:'战斗怒吼', desc:'攻击×1.20' },
  kings:         { icon:'👑', name:'王者祝福', desc:'攻+13%·防+13%' },
  berserk:       { icon:'😡', name:'狂暴',     desc:'攻×1.27·攻速×1.20' },
  windfury:      { icon:'⚡', name:'风怒',     desc:'攻速×1.40' },
  rapidFire:     { icon:'🏹', name:'急速射击', desc:'攻速×1.40' },
  bloodlust:     { icon:'🩸', name:'嗜血',     desc:'攻速×1.47' },
  timeWarp:      { icon:'🌀', name:'时间扭曲', desc:'攻速×1.53' },
  sacredShield:  { icon:'🟡', name:'圣盾',     desc:'防御×1.27·回复+3' },
  seraphim:      { icon:'😇', name:'炽天使',   desc:'攻×1.40·全能+7' },
  demonForm:     { icon:'😈', name:'恶魔形态', desc:'攻×1.33·吸血+10' },
};
const MASTERY_TYPE = {
  dmgAmp:    { per:0.6,  fmt:n=>`造成的伤害 +${(n*0.6).toFixed(1)}%` },
  dotAmp:    { per:1.2,  fmt:n=>`持续伤害(灼烧/中毒/流血)效果 +${(n*1.2).toFixed(0)}%` },
  leechAmp:  { per:0.3,  fmt:n=>`普攻吸血效果 +${(n*0.3*0.5).toFixed(1)}%` },
  dr:        { per:0.25, fmt:n=>`受到的伤害 -${Math.min(30,n*0.25).toFixed(1)}%` },
  healAmp:   { per:0.8,  fmt:n=>`治疗/护盾量 +${(n*0.8).toFixed(0)}%` },
  critdAmp:  { per:1.5,  fmt:n=>`暴击伤害 +${(n*1.5).toFixed(0)}%` },
  bleedOnCrit:{ per:0.5, fmt:n=>`暴击使敌人流血:每秒造成该次伤害的 ${(n*0.5).toFixed(1)}%,持续5秒` },
};
// 专精 → 精通效果(同名 key 的不同职业共享同一原型,如 prot=减伤 / holy=治疗,语义一致)
const MASTERY_SPEC = { arms:'bleedOnCrit', fury:'leechAmp', prot:'dr', arcane:'dmgAmp', fire:'dotAmp', frost:'dmgAmp', discipline:'healAmp', holy:'healAmp', shadow:'dotAmp', assassination:'dotAmp', combat:'dmgAmp', subtlety:'dmgAmp', bm:'dmgAmp', marks:'critdAmp', survival:'dotAmp', element:'dmgAmp', enhancement:'dmgAmp', restoration:'healAmp', ret:'dmgAmp', affliction:'dotAmp', demonology:'leechAmp', destruction:'dmgAmp', balance:'dotAmp', feral:'bleedOnCrit', resto:'healAmp' };
function masterySpecType(){ return MASTERY_SPEC[state.specialization] || null; }
function masteryFor(type){ return masterySpecType()===type ? (state.hero.mastery||0) : 0; }
function masteryDmgMult(){ return 1 + masteryFor('dmgAmp')*MASTERY_TYPE.dmgAmp.per/100; }       // 输出伤害增幅
function masteryTakenMult(){ return 1 - Math.min(30, masteryFor('dr')*MASTERY_TYPE.dr.per)/100; } // 受击减伤(封顶30%)
function masteryDescText(){ const t=masterySpecType(); return t ? MASTERY_TYPE[t].fmt(state.hero.mastery||0) : '未选择专精'; }

/* ---------- 属性重算 ---------- */
function recomputeStats() {
  const c = getCls(); if (!c) return;
  const lvl = state.hero.lvl; const base = c.baseStats;

  // 来源追踪(供 UI 展示各来源贡献明细)
  state._statSources = {};
  let _srcSnap = {};
  const _snapSrc = () => { _srcSnap = {atkPct, hpPct, defPct, spdPct, critdPct, crit:critFlat, leech, vers, mastery, haste, regFlat}; };
  const _saveSrc = (name) => {
    const cur = {atkPct, hpPct, defPct, spdPct, critdPct, crit:critFlat, leech, vers, mastery, haste, regFlat};
    const d = {}; let has = false;
    for (const k of Object.keys(_srcSnap)) {
      const v = +(cur[k] - (_srcSnap[k]||0)).toFixed(1);
      if (Math.abs(v) > 0.005) { d[k] = v; has = true; }
    }
    if (has) state._statSources[name] = d;
  };
  let attrs = { str:0, agi:0, int:0, spi:0, sta:0 };
  for (const k of Object.keys(attrs)) attrs[k] = c.baseAttrs[k] + state.attrs[k];

  let attrPct = { str:0, agi:0, int:0, spi:0, sta:0 };
  let atkPct=0, critdPct=0, hpPct=0, defPct=0, spdPct=0, mpPct=0;
  let critFlat=0, regFlat=0, leech=0, vers=0, mastery=5, haste=0;
  let cdReduction=0, buffDuration=0, extraAtk=0, healBonus=0, dotBonus=0;
  let costReduction=0, executeBonus=0, reflectDmg=0;
  let armorPen=0, dodge=0, stunChance=0;   // 趣味天赋:破甲/闪避/击晕

  _snapSrc();
  for (const [treeKey, tals] of Object.entries(state.talents)) {
    for (const [tKey, rank] of Object.entries(tals)) {
      const tree = c.trees.find(t => t.key === treeKey); if (!tree) continue;
      const t = tree.talents.find(x => x.key === tKey); if (!t || !t.mod) continue;
      for (const [k, v] of Object.entries(t.mod)) {
        const total = v * rank;
        if (k==='atkPct') atkPct+=total; else if (k==='critdPct') critdPct+=total;
        else if (k==='hpPct') hpPct+=total; else if (k==='defPct') defPct+=total;
        else if (k==='spdPct') spdPct+=total; else if (k==='mpPct') mpPct+=total;
        else if (k==='crit') critFlat+=total; else if (k==='regFlat') regFlat+=total;
        else if (k==='strPct') attrPct.str+=total; else if (k==='agiPct') attrPct.agi+=total;
        else if (k==='intPct') attrPct.int+=total; else if (k==='spiPct') attrPct.spi+=total;
        else if (k==='staPct') attrPct.sta+=total;
        else if (k==='leech') leech+=total; else if (k==='vers') vers+=total;
        else if (k==='mastery') mastery+=total; else if (k==='cdReduction') cdReduction+=total;
        else if (k==='buffDuration') buffDuration+=total; else if (k==='extraAtk') extraAtk+=total;
        else if (k==='healBonus') healBonus+=total; else if (k==='dotBonus') dotBonus+=total;
        else if (k==='costReduction') costReduction+=total; else if (k==='executeBonus') executeBonus+=total;
        else if (k==='reflectDmg') reflectDmg+=total;
        else if (k==='armorPen') armorPen+=total; else if (k==='dodge') dodge+=total;
        else if (k==='stunChance') stunChance+=total;
      }
    }
  }
  _saveSrc('天赋');
  // 永久属性加成(成就奖励)— 接入与 talent.mod 同 schema
  _snapSrc();
  if (typeof collectProgressionBonus === 'function') {
    const p = collectProgressionBonus();
    for (const [k, v] of Object.entries(p)) {
      if (!v) continue;
      if (k==='atkPct') atkPct+=v; else if (k==='critdPct') critdPct+=v;
      else if (k==='hpPct') hpPct+=v; else if (k==='defPct') defPct+=v;
      else if (k==='spdPct') spdPct+=v; else if (k==='mpPct') mpPct+=v;
      else if (k==='crit') critFlat+=v; else if (k==='regFlat') regFlat+=v;
      else if (k==='strPct') attrPct.str+=v; else if (k==='agiPct') attrPct.agi+=v;
      else if (k==='intPct') attrPct.int+=v; else if (k==='spiPct') attrPct.spi+=v;
      else if (k==='staPct') attrPct.sta+=v;
      else if (k==='leech') leech+=v; else if (k==='vers') vers+=v;
      else if (k==='mastery') mastery+=v; else if (k==='cdReduction') cdReduction+=v;
      else if (k==='extraAtk') extraAtk+=v; else if (k==='healBonus') healBonus+=v;
      else if (k==='dotBonus') dotBonus+=v; else if (k==='costReduction') costReduction+=v;
      else if (k==='executeBonus') executeBonus+=v; else if (k==='reflectDmg') reflectDmg+=v;
    }
  }
  _saveSrc('成就');
  // 觉醒(光辉值)加成 — 同 schema 但额外有 xpMult/goldMult/dropMult 由 combat 单独读取
  _snapSrc();
  if (typeof collectAscendMod === 'function') {
    const p = collectAscendMod();
    for (const [k, v] of Object.entries(p)) {
      if (!v) continue;
      if (k==='atkPct') atkPct+=v; else if (k==='critdPct') critdPct+=v;
      else if (k==='hpPct') hpPct+=v; else if (k==='defPct') defPct+=v;
      else if (k==='spdPct') spdPct+=v;
      else if (k==='crit') critFlat+=v;
      else if (k==='leech') leech+=v; else if (k==='vers') vers+=v;
      else if (k==='mastery') mastery+=v;
      // xpMult/goldMult/dropMult 在战斗中单独消费
    }
  }
  _saveSrc('觉醒');
  // 生活技能 buff(食物/药水)— 同 schema,xpMult/goldMult/dropMult 由 combat 消费
  _snapSrc();
  if (typeof collectLifeMod === 'function') {
    const p = collectLifeMod();
    for (const [k, v] of Object.entries(p)) {
      if (!v) continue;
      if (k==='atkPct') atkPct+=v;
      else if (k==='hpPct') hpPct+=v;
      else if (k==='defPct') defPct+=v;
      // xpMult/goldMult/dropMult 在 killMonster 消费
    }
  }
  _saveSrc('生活');
  // 神器 — 同 schema,xpMult/goldMult/dropMult 由 combat 消费
  _snapSrc();
  if (typeof collectArtifactMod === 'function') {
    const p = collectArtifactMod();
    for (const [k, v] of Object.entries(p)) {
      if (!v) continue;
      if (k==='atkPct') atkPct+=v;
      else if (k==='hpPct') hpPct+=v;
      else if (k==='defPct') defPct+=v;
      else if (k==='critdPct') critdPct+=v;
      else if (k==='spdPct') spdPct+=v;
      else if (k==='crit') critFlat+=v;
      else if (k==='leech') leech+=v;
      else if (k==='vers') vers+=v;
      else if (k==='mastery') mastery+=v;
    }
  }
  _saveSrc('神器');
  // 坐骑 — 同 schema
  _snapSrc();
  if (typeof collectMountMod === 'function') {
    const p = collectMountMod();
    for (const [k, v] of Object.entries(p)) {
      if (!v) continue;
      if (k==='atkPct') atkPct+=v;
      else if (k==='hpPct') hpPct+=v;
      else if (k==='defPct') defPct+=v;
      else if (k==='critdPct') critdPct+=v;
      else if (k==='spdPct') spdPct+=v;
      else if (k==='crit') critFlat+=v;
      else if (k==='leech') leech+=v;
      else if (k==='vers') vers+=v;
      else if (k==='mastery') mastery+=v;
    }
  }
  _saveSrc('坐骑');
  // 竞技场(PvP 段位 + 荣誉商店)— 同 schema
  _snapSrc();
  if (typeof collectArenaMod === 'function') {
    const p = collectArenaMod();
    for (const [k, v] of Object.entries(p)) {
      if (!v) continue;
      if (k==='atkPct') atkPct+=v;
      else if (k==='hpPct') hpPct+=v;
      else if (k==='defPct') defPct+=v;
      else if (k==='critdPct') critdPct+=v;
      else if (k==='spdPct') spdPct+=v;
      else if (k==='crit') critFlat+=v;
      else if (k==='leech') leech+=v;
      else if (k==='vers') vers+=v;
      else if (k==='mastery') mastery+=v;
    }
  }
  _saveSrc('竞技场');
  // 被动技能(按等级解锁)— 同 schema
  _snapSrc();
  if (typeof collectPassiveMod === 'function') {
    const p = collectPassiveMod();
    for (const [k, v] of Object.entries(p)) {
      if (!v) continue;
      if (k==='atkPct') atkPct+=v;
      else if (k==='hpPct') hpPct+=v;
      else if (k==='defPct') defPct+=v;
      else if (k==='critdPct') critdPct+=v;
      else if (k==='spdPct') spdPct+=v;
      else if (k==='crit') critFlat+=v;
      else if (k==='leech') leech+=v;
      else if (k==='vers') vers+=v;
      else if (k==='mastery') mastery+=v;
    }
  }
  _saveSrc('被动');
  // 随从(专属/定位/收藏/羁绊)— 同 schema(额外含 regFlat)
  _snapSrc();
  if (typeof collectCompanionMod === 'function') {
    const p = collectCompanionMod();
    for (const [k, v] of Object.entries(p)) {
      if (!v) continue;
      if (k==='atkPct') atkPct+=v;
      else if (k==='hpPct') hpPct+=v;
      else if (k==='defPct') defPct+=v;
      else if (k==='critdPct') critdPct+=v;
      else if (k==='spdPct') spdPct+=v;
      else if (k==='crit') critFlat+=v;
      else if (k==='leech') leech+=v;
      else if (k==='vers') vers+=v;
      else if (k==='mastery') mastery+=v;
      else if (k==='regFlat') regFlat+=v;
    }
  }
  _saveSrc('随从');
  for (const k of Object.keys(attrs)) attrs[k] = Math.floor(attrs[k] * (1 + attrPct[k]/100));
  state._attrs = attrs;

  const primary = attrs[c.attackAttr];
  let atk = base.atk + primary * 1.5 + (lvl-1) * 2;
  let equipAtk = 0;   // 装备攻击(不受 atkPct 加成)
  let def = base.def + Math.floor(attrs.sta * 0.3) + (lvl-1) * 1;
  let hpMax = base.hpMax + attrs.sta * 10 + (lvl-1) * 12;
  let mpMax = (c.resKey === 'rage' || c.resKey === 'energy') ? 100 : base.mpMax + attrs.int * 5 + (lvl-1) * 5;
  let crit = base.crit + critFlat;   // 敏捷不再提供暴击(2026-06-16)
  let critd = base.critd + critdPct; let spd = base.spd;
  let reg = base.reg + Math.floor(attrs.spi * 0.2) + regFlat;

  _snapSrc();
  let equipAttrBonus = { str:0, agi:0, int:0, spi:0, sta:0 };
  let gearAttrPct = { str:0, agi:0, int:0, spi:0, sta:0 };  // 仅来自装备(词缀/宝石/附魔)的%
  for (const slotKey of SLOT_ORDER) {
    const it = state.equipped[slotKey]; if (!it) continue;
    // 用 collectItemBonuses 收集"基础+词缀+宝石+附魔"的总加成
    const b = (typeof collectItemBonuses === 'function') ? collectItemBonuses(it) : null;
    if (b) {
      // 直接属性(装备攻/防/血不受百分比加成)
      equipAtk+=b.atk; def+=b.def; hpMax+=b.hp; crit+=b.crit;
      critd+=b.critd; spd+=b.spd; reg+=b.reg;
      leech+=b.leech; vers+=b.vers; mastery+=b.mastery; haste+=b.haste||0; dodge+=b.dodge||0;
      // 5维度属性 (并算上主属性加攻击/耐力加生命,装备主属性也不受百分比加成)
      for (const ak of ['str','agi','int','spi','sta']) {
        equipAttrBonus[ak] += b[ak];
        if (ak === c.attackAttr) equipAtk += b[ak] * 1.5;
        if (ak === 'sta') hpMax += b[ak] * 10;
      }
      // 词缀/附魔/宝石带来的百分比与额外
      atkPct+=b.atkPct; hpPct+=b.hpPct; defPct+=b.defPct;
      spdPct+=b.spdPct; critdPct+=b.critdPct;
      gearAttrPct.str+=b.strPct; gearAttrPct.agi+=b.agiPct; gearAttrPct.int+=b.intPct;
      gearAttrPct.spi+=b.spiPct; gearAttrPct.sta+=b.staPct;
      cdReduction+=b.cdReduction; costReduction+=b.costReduction;
      extraAtk+=b.extraAtk; healBonus+=b.healBonus;
      dotBonus+=b.dotBonus; executeBonus+=b.executeBonus;
      reflectDmg+=b.reflectDmg;
    } else {
      // 回退: 老逻辑(不依赖 enhance.js)
      for (const [k, v] of Object.entries(it.stats)) {
        if (k==='atk') equipAtk+=v; else if (k==='def') def+=v;
        else if (k==='hp') hpMax+=v; else if (k==='crit') crit+=v;
        else if (k==='critd') critd+=v; else if (k==='spd') spd+=v;
        else if (k==='reg') reg+=v;
        else if (['str','agi','int','spi','sta'].includes(k)) {
          equipAttrBonus[k]+=v;
          if (k === c.attackAttr) equipAtk += v * 1.5;
          if (k === 'sta') hpMax += v * 10;
        }
        else if (k==='leech') leech+=v; else if (k==='vers') vers+=v;
        else if (k==='mastery') mastery+=v; else if (k==='haste') haste+=v;
      }
    }
  }
  for (const k of Object.keys(attrs)) attrs[k] += (equipAttrBonus[k] || 0);
  // 装备来源的属性百分比(在已加上装备实数后再乘),并把增量补到 equipAtk(不受atkPct加成)
  for (const k of ['str','agi','int','spi','sta']) {
    if (!gearAttrPct[k]) continue;
    const before = attrs[k];
    const after = Math.floor(before * (1 + gearAttrPct[k]/100));
    const delta = after - before;
    attrs[k] = after;
    if (k === c.attackAttr) equipAtk += delta * 1.5;
    if (k === 'sta') hpMax += delta * 10;
  }
  _saveSrc('装备');
  atk = Math.floor(atk * (1 + atkPct/100)) + equipAtk; hpMax = Math.floor(hpMax * (1 + hpPct/100));
  def = Math.floor(def * (1 + defPct/100));
  // 攻速稀有化:spdPct 的各来源数值已在 spd_tuning.js 加载期统一归一化为 30%(显示=实际),
  // 故此处按面值应用即可,不再隐藏缩放。技能增益(风怒/嗜血等)走下方 state.buffs 独立乘法。
  spd = +(spd * (1 + spdPct/100)).toFixed(2);
  mpMax = Math.floor(mpMax * (1 + mpPct/100));

  const now = Date.now();
  if (state.buffs.shield>now) def=Math.floor(def*1.33);
  if (state.buffs.divine>now) def=Math.floor(def*1.53);
  if (state.buffs.bark>now) def=Math.floor(def*1.40);
  if (state.buffs.iceBarrier>now) def=Math.floor(def*1.40);
  if (state.buffs.earthShield>now) def=Math.floor(def*1.33);
  if (state.buffs.evasion>now) def=Math.floor(def*1.27);
  if (state.buffs.bestial>now) atk=Math.floor(atk*1.27);
  if (state.buffs.shadowstep>now) atk=Math.floor(atk*1.33);
  if (state.buffs.battleShout>now) atk=Math.floor(atk*1.20);
  if (state.buffs.kings>now){atk=Math.floor(atk*1.13);def=Math.floor(def*1.13);}
  if (state.buffs.berserk>now){atk=Math.floor(atk*1.27);spd=+(spd*1.20).toFixed(2);}
  if (state.buffs.windfury>now) spd=+(spd*1.40).toFixed(2);
  if (state.buffs.rapidFire>now) spd=+(spd*1.40).toFixed(2);
  if (state.buffs.bloodlust>now) spd=+(spd*1.47).toFixed(2);
  if (state.buffs.timeWarp>now) spd=+(spd*1.53).toFixed(2);
  if (state.buffs.sacredShield>now){def=Math.floor(def*1.27);reg+=3;}
  if (state.buffs.seraphim>now){atk=Math.floor(atk*1.40);vers+=7;}
  if (state.buffs.demonForm>now){atk=Math.floor(atk*1.33);leech+=10;}
  // 新技能通用增益(skills_ext.js 的 BUFF_FX);dr 在受击时由 buffDamageReductionMult 处理
  if (typeof BUFF_FX==='object') {
    for (const k in BUFF_FX) {
      if (!(state.buffs[k]>now)) continue;
      const fx=BUFF_FX[k];
      if (fx.atkMul) atk=Math.floor(atk*fx.atkMul);
      if (fx.defMul) def=Math.floor(def*fx.defMul);
      if (fx.spdMul) spd=+(spd*fx.spdMul).toFixed(2);
      if (fx.critAdd) critFlat+=fx.critAdd;
      if (fx.critdAdd) critd+=fx.critdAdd;
      if (fx.leechAdd) leech+=fx.leechAdd;
      if (fx.versAdd) vers+=fx.versAdd;
      if (fx.regAdd) reg+=fx.regAdd;
    }
  }
  // 英雄减益(虚弱降攻击 / 冰缚降攻速)
  if (typeof DEBUFF_FX==='object' && state.heroDebuffs) {
    for (const k in state.heroDebuffs) {
      if (!(state.heroDebuffs[k].expire>now)) continue;
      const fx=DEBUFF_FX[k]; if(!fx) continue;
      if (fx.atkMul) atk=Math.floor(atk*fx.atkMul);
      if (fx.spdMul) spd=+(spd*fx.spdMul).toFixed(2);
    }
  }

  // 大秘境词缀:暴风(攻速-) / 无心(治疗-)
  const ms2 = state.mythicState;
  if (ms2 && ms2.affixes && state.mode === 'mythic') {
    for (const af of ms2.affixes) {
      if (af.mod.heroSpd) spd = +(spd * (1 + af.mod.heroSpd)).toFixed(2);
      if (af.mod.healReduction) healBonus = Math.floor(healBonus * (1 - af.mod.healReduction));
    }
  }

  // 精通被动:属性类效果(dotAmp/healAmp/critdAmp/leechAmp)在此并入对应属性;
  // dmgAmp/dr/bleedOnCrit 为战斗时钩子(masteryDmgMult/masteryTakenMult/暴击流血)。
  const _mspec = MASTERY_SPEC[state.specialization];
  if (_mspec==='dotAmp') dotBonus += mastery*MASTERY_TYPE.dotAmp.per;
  else if (_mspec==='healAmp') healBonus += mastery*MASTERY_TYPE.healAmp.per;
  else if (_mspec==='critdAmp') critd += mastery*MASTERY_TYPE.critdAmp.per;
  else if (_mspec==='leechAmp') leech += mastery*MASTERY_TYPE.leechAmp.per;

  // 保存来源汇总(供 UI 展示)— 注意:这些是 buff 前的基础百分比汇总
  state._statSources._total = {atkPct, hpPct, defPct, spdPct, critdPct, crit:critFlat, leech, vers, mastery, haste, regFlat};
  state.hero.atk=atk; state.hero.def=def; state.hero.hpMax=hpMax;
  state.hero.mpMax=Math.max(50,mpMax); state.hero.crit=Math.min(crit,90);
  state.hero.critd=critd; state.hero.spd=Math.min(spd,2.5); state.hero.reg=reg;   // 攻速封顶下调 6→2.5(攻速稀有化)
  state.hero.leech=Math.min(leech,30); state.hero.vers=Math.min(vers,40);   // 吸血/全能封顶,杜绝"秒回满血"和"近乎免伤"
  state.hero.haste=Math.min(Math.max(0,haste),50);   // 极速:影响攻速/读条/技能CD,封顶50%
  state.hero.mastery=Math.max(0,mastery); state.hero.cdReduction=Math.min(cdReduction,40);
  state.hero.buffDuration=Math.min(buffDuration,15); state.hero.extraAtk=Math.min(extraAtk,25);
  state.hero.healBonus=Math.min(healBonus,50); state.hero.dotBonus=Math.min(dotBonus,50);
  state.hero.costReduction=Math.min(costReduction,30); state.hero.executeBonus=Math.min(executeBonus,40);
  state.hero.reflectDmg=Math.min(reflectDmg,20);
  state.hero.armorPen=Math.min(armorPen,40); state.hero.dodge=Math.min(dodge,30); state.hero.stunChance=Math.min(stunChance,15);
  state.hp=Math.min(state.hp,state.hero.hpMax); state.resourceMax=state.hero.mpMax;
  state.resource=Math.min(state.resource,state.resourceMax);
  markDirty('hero','equipment');
}

/* ---------- 怪物 ---------- */
let monUidSeq=1;   // 每只敌人唯一 id(供 UI 点击切目标 / 渲染追踪)
// 野外小怪按名称判定"身份",赋予符合身份的技能(2026-06-16)
function mobKind(name){
  if(/猪|犀|牛|象|蛮|羊|鹿|马|熊|虎|狮|狼|猛犸|科多/.test(name)){return /熊|龟|蟹|甲|盾|岩|石/.test(name)?'tank':'charger';}
  if(/法师|术士|萨满|巫|祭司|先知|咒|灵|鬼|魔导|施法|奥术|元素/.test(name))return 'caster';
  if(/卫兵|守卫|护卫|盾|龟|蟹|甲|岩|石|骑士|战士|督军|领主/.test(name))return 'tank';
  return null;
}
function makeMonster(name,lvl,isBoss,maxRarity){
  const hp=Math.floor((100+lvl*lvl*6.0)*(isBoss?15:1));
  const kind=isBoss?null:mobKind(name);   // boss 走自己的被动,小怪用身份技能
  return {name,isBoss,lvl,hpMax:hp,hp,atk:Math.floor((8+lvl*3.0)*(isBoss?1.8:1)),
    def:Math.floor((3+lvl*1.3)*(isBoss?1.5:1)),baseGold:Math.floor(5+lvl*1.5),
    baseXp:Math.floor(30+lvl*5.0),goldReward:Math.floor((5+lvl*1.5)*(isBoss?18:1)),
    honorReward:isBoss?Math.floor(15+lvl*3):0,dropRate:isBoss?1.0:0.18,
    gemChance:isBoss?1.0:0.015,maxRarity:maxRarity||'uncommon',_uid:monUidSeq++,
    kind, _lastSkill:Date.now()-rng(0,3000),                  // 身份技能冷却
    dmgReduction:kind==='tank'?0.30:0,                        // 坦克:受到伤害-30%
    atkInterval:(isBoss?1400:1700)+rng(-200,200),    // 每只独立攻速(带抖动,避免同步出手)
    _lastAtk:Date.now()-rng(0,1200)};                // 进场即错峰
}
function calcXP(mon){
  const baseXp=mon.baseXp*(mon.isBoss?10:1);
  const lvlDiff=state.hero.lvl-mon.lvl;let mult=1.0;
  if(lvlDiff>=15)mult=0.1;else if(lvlDiff>=10)mult=0.3;else if(lvlDiff>=5)mult=0.6;else if(lvlDiff<=-5)mult=1.5;else if(lvlDiff<=-3)mult=1.3;
  return Math.floor(baseXp*mult);
}
/* 越级收益惩罚:把 calcXP 的等级差思路扩到金币/掉落,碾压远低于自身等级的怪不再划算,
   逼玩家去打对级内容——让大量地图/副本重新有意义。对级(diff<5)无惩罚。 */
function overLevelPenalty(mon){
  const d=state.hero.lvl-(mon?mon.lvl:state.hero.lvl);
  if(d>=15)return 0.1;if(d>=10)return 0.25;if(d>=5)return 0.5;return 1;
}
function spawnMonster(){
  initCompanionHp();state.currentMonsters=[];
  if(state.mode==='travel')return;
  if(state.mode==='dungeon'||state.mode==='mythic')return spawnDungeonMonster();
  if(state.mode==='tower')return spawnTowerMonster();
  if(state.mode==='boss')return spawnZoneBoss();
  const map=getMap();if(!map){state.currentMap=MAPS[0].key;state.currentSubzone=0;return spawnMonster();}
  const sub=map.sub[state.currentSubzone]||map.sub[0];
  // 敌群:野外可同时刷出 1~4 只敌人(怪群越大,单只攻击略降,避免瞬秒,但总收益更高)
  const packRoll=Math.random();
  const count=packRoll<0.07?4:packRoll<0.25?3:packRoll<0.55?2:1;
  const atkDamp=count>=3?0.8:(count===2?0.9:1);
  for(let i=0;i<count;i++){
    const mobName=choice(sub.mobs.split('|'));const lvl=rng(sub.lvl[0],sub.lvl[1]);
    const rareRoll=Math.random();
    const maxR=rareRoll<0.06?'epic':rareRoll<0.20?'rare':'uncommon';   // 2026-06-16 提高小怪爆蓝/紫上限概率(epic 0.02→0.06, rare 0.08→0.20)
    const m=makeMonster(mobName,lvl,false,maxR);
    if(atkDamp!==1)m.atk=Math.max(1,Math.floor(m.atk*atkDamp));
    m.threat=m.atk*(0.6+Math.random()*0.8);   // 初始仇恨(攻击越高越容易被英雄锁定)
    state.currentMonsters.push(m);
  }
}
function spawnZoneBoss(){
  state.currentMonsters=[];const map=getMap();if(!map)return;
  const maxR=map.boss.lvl>=60?'legend':'epic';
  const mon=makeMonster(map.boss.emoji+map.boss.name,map.boss.lvl,true,maxR);
  // 应用地图BOSS被动
  if(map.boss.passive){
    if(map.boss.passive.dodgeChance)mon.dodgeChance=map.boss.passive.dodgeChance;
    if(map.boss.passive.critChance)mon.critChance=map.boss.passive.critChance;
    if(map.boss.passive.dmgReduction)mon.dmgReduction=map.boss.passive.dmgReduction;
    if(map.boss.passive.atkBonus)mon.atk=Math.floor(mon.atk*(1+map.boss.passive.atkBonus));
    if(map.boss.passive.leech)mon.lifeSteal=map.boss.passive.leech;
  }
  state.currentMonsters.push(mon);
}
function spawnDungeonMonster(){
  state.currentMonsters=[];const ds=state.dungeonState||state.mythicState;if(!ds)return;
  const dg=DUNGEONS.find(d=>d.key===ds.key);if(!dg)return;
  const boss=(dg.bosses||[]).find(b=>b.wave===ds.wave);const isBoss=!!boss;
  const power=dg.reqLvl+(isBoss?3:0);
  const scale=ds.scale||1;
  // 小怪名与副本对应:用本副本 BOSS 的 emoji + 角色词(让副本小怪有辨识度)
  const bossEmojis=(dg.bosses||[]).map(b=>b.emoji).filter(Boolean);
  const temoji=bossEmojis.length?choice(bossEmojis):(dg.icon||'👹');
  const name=isBoss?(boss.emoji+boss.name):(temoji+choice(['爪牙','守卫','暴徒','狂徒','奴仆','哨兵','卫士','督军']));
  // 副本小怪大幅强于野外:血量×4 / 攻击×1.6 / 防御×1.6(野外同级只是 ×1.8/×1/×1)
  const isRaid=dg.type==='raid';
  const isFinalBoss=isBoss&&boss===dg.bosses[dg.bosses.length-1];
  const bossMaxRarity=isRaid?(isFinalBoss?'legend':'epic'):(isBoss?'legend':'rare');
  state.currentMonsters.push({name,isBoss,bossName:isBoss?boss.name:null,
    lvl:Math.max(1,Math.floor(power*1.05)),
    hpMax:Math.floor((100+power*power*5.0)*(isBoss?14:4.0)*scale),hp:Math.floor((100+power*power*5.0)*(isBoss?14:4.0)*scale),
    atk:Math.floor((10+power*3.2)*(isBoss?2.0:1.6)*scale),def:Math.floor((3+power*1.5)*(isBoss?1.5:1.6)*scale),
    baseGold:Math.floor(10+power*3),baseXp:Math.floor(35+power*5),
    goldReward:Math.floor((10+power*3)*(isBoss?15:1.5)*scale),honorReward:isBoss?Math.floor(25+power*2.5):2,
    dropRate:isBoss?1.0:0.35,gemChance:isBoss?0.8:0.05,maxRarity:bossMaxRarity,fromDungeon:true,_uid:monUidSeq++,
    _isRaidFinal:isRaid&&isFinalBoss,_isRaid:isRaid,
    atkInterval:(isBoss?1400:1700)+rng(-200,200),_lastAtk:Date.now()-rng(0,1200)});
  // 大秘境词缀:修改怪物属性
  const mon = state.currentMonsters[state.currentMonsters.length-1];
  // 副本/大秘境 BOSS 被动:优先读数据中的passive,否则用默认
  if (isBoss) {
    mon.dodgeChance=0; mon.critChance=0; mon.critMult=2.0; mon.stunChance=0; mon.instantCast=true;
    if (boss.passive) {
      if (boss.passive.dodgeChance) mon.dodgeChance = boss.passive.dodgeChance;
      if (boss.passive.critChance) mon.critChance = boss.passive.critChance;
      if (boss.passive.dmgReduction) mon.dmgReduction = boss.passive.dmgReduction;
      if (boss.passive.atkBonus) mon.atk = Math.floor(mon.atk * (1 + boss.passive.atkBonus));
      if (boss.passive.leech) mon.lifeSteal = boss.passive.leech;
      if (boss.passive.stunChance) mon.stunChance = boss.passive.stunChance;
    } else {
      mon.dodgeChance=0.15; mon.critChance=0.25; mon.stunChance=0.12;
    }
  }
  if (ds.affixes) {
    mon._affixes = ds.affixes;
    mon._arcaneShield = 0;
    for (const af of ds.affixes) {
      const mod = af.mod || {};
      if (mod.trashHp && !isBoss) { mon.hpMax = Math.floor(mon.hpMax * (1+mod.trashHp)); mon.hp = mon.hpMax; }
      if (mod.bossHp && isBoss) { mon.hpMax = Math.floor(mon.hpMax * (1+mod.bossHp)); mon.hp = mon.hpMax; }
      if (mod.bossDmg && isBoss) mon.atk = Math.floor(mon.atk * (1+mod.bossDmg));
    }
  }
}

/* ---------- 伤害 ---------- */
/* 护甲减伤:乘法+递减+封顶75%。护甲常数随"防守方等级"缩放,使低级攻击无法轻易无视高级护甲,
   反过来高级护甲也永远 floor 不到 0(怪在任何装备水平下都还能打疼你)。取代旧的减法 atk-def*0.5。 */
function armorMitig(def,defLvl){const K=50+(defLvl||1)*40;const d=Math.max(0,def||0);return Math.min(0.75,d/(d+K));}
/* 等级差伤害修正:攻方等级高于守方→增伤,低于→减伤。每级±3%,封顶 0.4~1.6 倍。
   这让"20级装备打60级怪"不再可行——越级时你的伤害被压到 0.4 倍、对方伤害放大到 1.6 倍。 */
function lvlDmgMult(atkLvl,defLvl){return Math.max(0.4,Math.min(1.6,1+((atkLvl||1)-(defLvl||1))*0.03));}
function calcDmg(atk,def,crit,critd,forceCrit,defLvl,atkLvl){
  const isCrit=forceCrit||Math.random()*100<(crit||0);
  let base=Math.max(1,atk*(1-armorMitig(def,defLvl)));
  if(atkLvl!==undefined)base*=lvlDmgMult(atkLvl,defLvl);   // 传了攻方等级才启用等级差修正
  base*=0.85+Math.random()*0.3;
  if(isCrit)base*=(critd/100);
  return {dmg:Math.max(1,Math.floor(base)),crit:isCrit};
}
function getPrimaryMonster(){return state.currentMonsters[0];}
function getAliveMonsters(){return state.currentMonsters.filter(m=>m.hp>0);}
/* 破甲(sunder)等护甲削减后的有效防御 */
function monArmor(mon){ if(!mon)return 0; let def=mon.def; if(mon.sunderUntil>Date.now())def=Math.floor(def*0.7); return def; }
/* 英雄视角的目标有效护甲(含"破甲"天赋:无视部分护甲) */
function heroTargetDef(mon){ return Math.floor(monArmor(mon)*(1-(state.hero.armorPen||0)/100)); }

/* ---------- 英雄受到的减益(boss 等施加) ---------- */
const DEBUFF_FX = {
  burn:       { name:'灼烧/中毒', icon:'☠️', dot:true },        // 每秒持续伤害(dps 存在实例里)
  weaken:     { name:'虚弱',     icon:'💔', atkMul:0.85 },      // 攻击-15%
  vulnerable: { name:'易伤',     icon:'🩸', takenMul:1.2 },     // 受到伤害+20%
  chill:      { name:'冰缚',     icon:'🥶', spdMul:0.85 },      // 攻速-15%
};
function applyHeroDebuff(key, durMs, opts){
  if(!DEBUFF_FX[key])return;
  if(!state.heroDebuffs)state.heroDebuffs={};
  const d=state.heroDebuffs[key]||{};
  d.expire=Date.now()+durMs;
  if(opts&&opts.dps!=null)d.dps=opts.dps;
  state.heroDebuffs[key]=d;
  const fx=DEBUFF_FX[key];
  if(fx.atkMul||fx.spdMul)recomputeStats();   // 影响面板属性的立即重算
  markDirty('hero');
}
function heroDebuffTakenMult(){
  if(!state.heroDebuffs)return 1;const now=Date.now();let m=1;
  for(const k in state.heroDebuffs){const d=state.heroDebuffs[k];if(d.expire>now){const fx=DEBUFF_FX[k];if(fx&&fx.takenMul)m*=fx.takenMul;}}
  return m;
}
function dealDmgToAll(atk,def,crit,critd,mul,forceCrit){
  let total=0;
  for(const mon of state.currentMonsters){if(mon.hp<=0)continue;const d=calcDmg(atk*mul,heroTargetDef(mon),crit,critd,forceCrit,mon.lvl,state.hero.lvl);let dd=d.dmg;if(mon.dmgReduction)dd=Math.max(1,Math.floor(dd*(1-mon.dmgReduction)));mon.hp-=dd;total+=dd;trackDmg('hero',dd);}
  return total;
}
/* 仇恨锁定:把仇恨值最高的存活敌人放到 index 0(英雄/随从/单体技能都打 [0] = 当前焦点) */
function focusHighestThreat(){
  const alive=state.currentMonsters.filter(m=>m.hp>0);
  if(alive.length<=1)return;
  let best=alive[0];
  for(const m of alive)if((m.threat||0)>(best.threat||0))best=m;
  const i=state.currentMonsters.indexOf(best);
  if(i>0){state.currentMonsters.splice(i,1);state.currentMonsters.unshift(best);}
}
/* 手动指定攻击目标(点击敌人):把它的仇恨拉到最高,焦点立即切过去 */
function setManualFocus(uid){
  const m=state.currentMonsters.find(x=>x._uid===uid&&x.hp>0);if(!m)return;
  let mx=0;for(const o of state.currentMonsters)if(o.hp>0)mx=Math.max(mx,o.threat||0);
  m.threat=mx+100;
  focusHighestThreat();
}
/* 结算所有死亡敌人(AOE 可能一次放倒多只);世界模式整波清空后才刷新下一波 */
function reapDeadMonsters(){
  let guard=0;
  while(guard++<16){
    const dead=state.currentMonsters.find(m=>m.hp<=0);
    if(!dead)break;
    const i=state.currentMonsters.indexOf(dead);
    if(i!==0){state.currentMonsters.splice(i,1);state.currentMonsters.unshift(dead);} // 满足 onMonsterDeath 的 [0]===mon 守卫
    onMonsterDeath(dead);
    if(state.mode!=='world')break; // 其它模式由 onMonsterDeath 自行刷新(单怪)
  }
}

/* 受击减伤增益(BUFF_FX 里带 dr 的 buff,如减伤技能)→ 返回受伤倍率(<1) */
function buffDamageReductionMult(){
  if(typeof BUFF_FX!=='object'||!state.buffs)return 1;
  const now=Date.now();let m=1;
  for(const k in BUFF_FX){const fx=BUFF_FX[k];if(fx.dr&&state.buffs[k]>now)m*=(1-fx.dr);}
  return m;
}

/* ---------- 战斗主循环 ---------- */
let lastHeroAtk=0,lastMonAtk=0,lastRegen=0,dotTick=0,lastBossSkill=0,bossSkillIdx=0,lastAutoCast=0,burnTick=0;
function tickBattle(now){
  if(state.mode==='travel'){lastHeroAtk=now;lastMonAtk=now;return;}
  reapDeadMonsters();                                   // 先结算上一拍可能死亡的敌人(含 AOE 群杀)
  if(getAliveMonsters().length===0){spawnMonster();lastHeroAtk=now;lastMonAtk=now;return;}
  focusHighestThreat();                                 // 锁定仇恨最高的敌人为焦点([0])
  let mon=state.currentMonsters[0];
  const spdMul=state.battleSpeed||1;                    // 战斗倍速(1x / 2x)
  const regenInterval=1000/spdMul;

  if(now-lastRegen>regenInterval){
    state.hp=Math.min(state.hero.hpMax,state.hp+state.hero.reg);
    const c=getCls();
    if(c.resKey==='rage')state.resource=Math.max(0,state.resource-3);
    else if(c.resKey==='energy')state.resource=Math.min(state.resourceMax,state.resource+10);
    else{const reg=2+Math.floor((state._attrs?.spi||0)*0.3)+state.hero.reg;state.resource=Math.min(state.resourceMax,state.resource+reg);}
    lastRegen=now;
  }
  if(mon.dot&&now>mon.dotEnd)mon.dot=0;
  if(mon.dot&&now-dotTick>1000/spdMul){mon.hp-=mon.dot;dotTick=now;trackDmg('hero',mon.dot);}
  // 英雄身上的灼烧/中毒(boss debuff)持续掉血
  {const bd=state.heroDebuffs&&state.heroDebuffs.burn;
   if(bd&&bd.expire>now&&now-burnTick>1000/spdMul){burnTick=now;const bdmg=Math.max(1,bd.dps||1);state.hp-=bdmg;showFloat($('hero-emoji'),'☠️-'+bdmg,'#a3e635');if(state.hp<=0){onHeroDeath();return;}}}
  // 大秘境词缀:血池治疗
  for (const m of state.currentMonsters) {
    if (m._sanguineHeal > 0 && m._sanguineEnd > now && now - (m._lastSanguineTick || 0) > 1000) {
      m._lastSanguineTick = now;
      const healAmt = Math.min(m._sanguineHeal, Math.floor(m.hpMax * 0.03));
      m.hp = Math.min(m.hpMax, m.hp + healAmt);
      m._sanguineHeal -= healAmt;
    }
  }

  // 大秘境词缀:周期性效果
  const ms = state.mythicState;
  if (ms && ms.affixes && state.mode === 'mythic') {
    for (const af of ms.affixes) {
      const mod = af.mod || {};
      // 火山:每8秒
      if (mod.volcanic && now - (ms.lastVolcanic||0) > 8000) {
        ms.lastVolcanic = now;
        const vdmg = Math.max(1, Math.floor(state.hero.hpMax * 0.08 + rng(0, 50)));
        state.hp -= vdmg;
        showFloat($('hero-emoji'), '🌋-'+vdmg, '#ff7a7a');
      }
      // 折磨:每5秒
      if (mod.afflicted && now - (ms.lastAfflicted||0) > 5000) {
        ms.lastAfflicted = now;
        const admg = Math.max(1, Math.floor(state.hero.hpMax * 0.05));
        state.hp -= admg;
        showFloat($('hero-emoji'), '😈-'+admg, '#c084fc');
      }
      // 奥术:每15秒给BOSS盾
      if (mod.arcane && mon.isBoss && now - (ms.lastArcane||0) > 15000) {
        ms.lastArcane = now;
        mon._arcaneShield = (mon._arcaneShield||0) + Math.floor(mon.hpMax * 0.15);
        showFloat($('mon-emoji'), '🔮盾', '#a78bfa');
      }
    }
  }

  // 玩家攻击(锁定焦点 = 仇恨最高者)
  const spd=state.hero.spd||1;
  const heroInterval=1000/(spd*spdMul*hasteFactor());   // 极速也提升攻击速度
  if((now-lastHeroAtk>heroInterval||now-lastHeroAtk>5000)&&!(state.heroStunUntil>now)){   // 被BOSS击晕时无法攻击

    let ap=state.hero.atk;
    if(state.hero.executeBonus>0&&mon.hp<mon.hpMax*0.3)ap=Math.floor(ap*(1+state.hero.executeBonus/100));
    if(state.hero.vers>0)ap=Math.floor(ap*(1+state.hero.vers/100));
    const zb=(typeof progressionCombatBonus==='function')?progressionCombatBonus(mon.name):{dmgMult:1};
    if(zb.dmgMult!==1)ap=Math.floor(ap*zb.dmgMult);
    ap=Math.floor(ap*masteryDmgMult());   // 精通:伤害增幅(dmgAmp 专精)
    const d=calcDmg(ap,heroTargetDef(mon),state.hero.crit,state.hero.critd,false,mon.lvl,state.hero.lvl);
    let actualDmg = d.dmg;
    const dodged = mon.dodgeChance && Math.random() < mon.dodgeChance;   // BOSS 闪避
    if (dodged) actualDmg = 0;
    if (!dodged && mon._arcaneShield > 0) {
      if (actualDmg <= mon._arcaneShield) { mon._arcaneShield -= actualDmg; actualDmg = 0; }
      else { actualDmg -= mon._arcaneShield; mon._arcaneShield = 0; }
    }
    if(mon.dmgReduction&&actualDmg>0)actualDmg=Math.max(1,Math.floor(actualDmg*(1-mon.dmgReduction)));   // 坦克小怪减伤
    mon.hp-=actualDmg;trackDmg('hero',actualDmg);
    if(typeof progressionOnDamage==='function') progressionOnDamage(actualDmg);
    if(!dodged&&state.hero.extraAtk>0&&Math.random()*100<state.hero.extraAtk){const d2=calcDmg(ap,heroTargetDef(mon),state.hero.crit,state.hero.critd,false,mon.lvl,state.hero.lvl);let dd2=d2.dmg;if(mon.dmgReduction)dd2=Math.max(1,Math.floor(dd2*(1-mon.dmgReduction)));mon.hp-=dd2;trackDmg('hero',dd2);showFloat($('mon-emoji'),'🎯+'+dd2,'#fbbf24');}
    showFloat($('mon-emoji'),dodged?'闪避':('-'+actualDmg),dodged?'#9ca3af':(d.crit?'#fbbf24':'#fff'));
    {const me=$('mon-emoji');if(me){me.classList.add('shake');setTimeout(()=>{const e2=$('mon-emoji');if(e2)e2.classList.remove('shake');},200);}}
    if(!dodged&&typeof passiveOnHit==='function')passiveOnHit(mon,actualDmg,ap);
    if(!dodged&&d.crit&&typeof passiveOnCrit==='function')passiveOnCrit(mon,actualDmg);
    if(!dodged&&d.crit&&masteryFor('bleedOnCrit')>0){const bleed=Math.floor(actualDmg*masteryFor('bleedOnCrit')*MASTERY_TYPE.bleedOnCrit.per/100);if(bleed>0){mon.dot=(mon.dot||0)+bleed;mon.dotEnd=Date.now()+5000;showFloat($('mon-emoji'),'🩸流血','#dc2626');}}   // 精通:暴击流血
    if(!dodged&&state.hero.stunChance&&Math.random()*100<state.hero.stunChance){mon.stunUntil=now+1500;showFloat($('mon-emoji'),'💫击晕','#fde047');}   // 趣味天赋:几率击晕敌人
    if(!dodged&&state.hero.leech>0){const leechHeal=Math.floor(d.dmg*state.hero.leech*0.5/100);if(leechHeal>0){state.hp=Math.min(state.hero.hpMax,state.hp+leechHeal);showFloat($('hero-emoji'),'🩸+'+leechHeal,'#6ee7b7');}}   // 吸血:每点=0.5%实际吸取,有浮动数字可见
    lastHeroAtk=now;
    if(getCls().resKey==='rage')state.resource=Math.min(state.resourceMax,state.resource+(d.crit?12:8));
    // 智能自动施法:GCD 节流避免一次性倾泻;残血治疗可无视GCD;焦点残血优先斩杀;敌群多优先AOE
    if(state.autoSkill&&state.selectedSkills.length>0&&!casting){
      const now2=Date.now();const aliveN=getAliveMonsters().length;
      const hpFrac=state.hp/Math.max(1,state.hero.hpMax);
      const focusLow=mon&&mon.hp>0&&mon.hp<mon.hpMax*0.25;
      const ready=[];
      for(const skKey of state.selectedSkills){
        if(!state.unlockedSkills[skKey])continue;
        if(state.skillCooldowns[skKey]&&state.skillCooldowns[skKey]>now2)continue;
        const sk=getCls().skills[skKey];if(!sk||sk.type==='interrupt')continue;
        let cost=sk.mp;if(state.hero.costReduction>0)cost=Math.max(1,Math.floor(sk.mp*(1-state.hero.costReduction/100)));
        if(state.resource<cost)continue;
        if(sk.type==='heal'&&hpFrac>0.6)continue;                              // 血量充足不浪费治疗
        if(sk.type==='buff'&&state.buffs[sk.buff]&&state.buffs[sk.buff]>now2)continue; // 增益还在,跳过
        ready.push({skKey,sk});
      }
      if(ready.length){
        const pri=s=>{
          if(s.type==='heal')return hpFrac<0.35?6:3;                          // 危急治疗最高优先
          if(s.type==='buff')return 2;
          if(s.mul>=6&&focusLow)return 5;                                      // 焦点残血:大招斩杀
          if(s.mul>=4&&aliveN>1)return 4;                                      // 多敌:AOE
          return 1;
        };
        ready.sort((a,b)=>pri(b.sk)-pri(a.sk));
        const top=ready[0];
        const emergencyHeal=top.sk.type==='heal'&&hpFrac<0.35;
        const GCD=900/spdMul;                                                  // 全局冷却(倍速下同步缩短)
        if(emergencyHeal||now2-lastAutoCast>=GCD){
          startCast(top.skKey,false);
          lastAutoCast=now2;
        }
      }
    }
  }
  if(getAliveMonsters().length===0){reapDeadMonsters();lastHeroAtk=now;lastMonAtk=now;return;}
  if(mon.hp<=0){focusHighestThreat();mon=state.currentMonsters[0];}  // 焦点已死则切换到下一仇恨目标(战利品下一拍 reap 结算)
  if(!mon)return;

  // 怪物攻击(每只敌人独立计时、独立出手,并各自累积仇恨)
  let anyHit=false;
  for(const m of state.currentMonsters){
    if(m.hp<=0)continue;
    if(m.stunUntil&&m.stunUntil>now)continue;   // 被英雄击晕的敌人无法攻击
    let interval=(m.atkInterval||(m.isBoss?1400:1700))/spdMul;
    if(m.slowUntil&&m.slowUntil>now)interval=Math.floor(interval*1.5);
    const last=m._lastAtk||0;
    if(!(now-last>interval||now-last>6000))continue;   // 还没到这只怪的下一次出手
    m._lastAtk=now;
    let matk=m.atk;if(m._affixes&&m._affixes.some(a=>a.mod.raging)&&m.hp<m.hpMax*0.3)matk=Math.floor(matk*1.5);
    // 野外小怪身份技能(每~5秒一次):算伤害加成;英雄专属副作用(减速/日志)延后到确实命中英雄时再施加
    let kindFloat=null,kindColor='#f59e0b',kindChill=false,kindLog=null;
    if(m.kind&&now-(m._lastSkill||0)>5000){m._lastSkill=now;
      if(m.kind==='charger'){matk=Math.floor(matk*2.5);kindFloat='🐗冲锋!';kindLog=['🐗 '+m.name+' 发动冲锋!','bad'];}
      else if(m.kind==='caster'){matk=Math.floor(matk*2.0);kindChill=true;kindFloat='✨法术!';kindColor='#a78bfa';kindLog=['✨ '+m.name+' 施放法术(减速)!','bad'];}
      else if(m.kind==='tank'){const heal=Math.floor(m.hpMax*0.05);m.hp=Math.min(m.hpMax,m.hp+heal);showFloat($('mon-emoji'),'💚+'+heal,'#6ee7b7');}
    }
    m.threat=(m.threat||0)+matk*0.6;
    // —— 仇恨分配:存活随从按定位概率把这次攻击吸引到自己身上(坦克更高)——
    if(companionTargetable()&&Math.random()<compAggroChance()){
      const cst=computeCompanionStats();
      const cd=calcDmg(matk,cst?cst.def:0,(m.critChance?m.critChance*100:5),(m.critMult?m.critMult*100:150),false,state.hero.lvl,m.lvl);
      const tc=Math.max(1,cd.dmg);
      state._compHp=Math.max(0,(state._compHp||0)-tc);
      showFloat($('comp-mini'),(kindFloat?kindFloat+' ':'')+'-'+tc,'#ff9aa0');
      const ce=$('comp-mini');if(ce){ce.classList.add('shake');setTimeout(()=>{const x=$('comp-mini');if(x)x.classList.remove('shake');},200);}
      if(state._compHp<=0)downCompanion(now);
      continue;   // 这只怪打了随从,英雄本拍不挨打、不进怒气
    }
    // —— 命中英雄(原逻辑) ——
    if(state.hero.dodge&&Math.random()*100<state.hero.dodge){showFloat($('hero-emoji'),'闪避','#9ca3af');continue;}   // 英雄"闪避"天赋
    if(kindFloat)showFloat($('hero-emoji'),kindFloat,kindColor);
    if(kindChill&&typeof applyHeroDebuff==='function')applyHeroDebuff('chill',3000);
    if(kindLog)log(kindLog[0],kindLog[1]);
    const d=calcDmg(matk,state.hero.def,(m.critChance?m.critChance*100:5),(m.critMult?m.critMult*100:150),false,state.hero.lvl,m.lvl);let taken=d.dmg;   // BOSS 暴击
    // BOSS 普攻几率击晕英雄(1.5秒无法攻击/施法)
    if(m.stunChance&&Math.random()<m.stunChance){state.heroStunUntil=now+1500;showFloat($('hero-emoji'),'💫晕眩','#fde047');log('💫 你被 '+m.name+' 击晕了!','bad');}
    if(state.hero.vers>0)taken=Math.max(1,Math.floor(taken*(1-state.hero.vers/100)));
    if(typeof passiveDamageTakenMult==='function')taken=Math.max(1,Math.floor(taken*passiveDamageTakenMult()));
    taken=Math.max(1,Math.floor(taken*buffDamageReductionMult()));
    taken=Math.max(1,Math.floor(taken*heroDebuffTakenMult()));   // 易伤等增加受到伤害
    taken=Math.max(1,Math.floor(taken*masteryTakenMult()));      // 精通:减伤(dr 专精)
    state.hp-=taken;
    if(state.hero.reflectDmg>0){const reflect=Math.floor(d.dmg*state.hero.reflectDmg/100);m.hp-=reflect;}
    if(typeof passiveOnTakeDamage==='function')passiveOnTakeDamage(m,taken);
    showFloat($('hero-emoji'),'-'+taken,'#ff7a7a');
    anyHit=true;
  }
  if(anyHit){
    $('hero-emoji').classList.add('shake');setTimeout(()=>$('hero-emoji').classList.remove('shake'),200);
    if(mon.lifeSteal&&totalDmg>0){const heal=Math.floor(totalDmg*mon.lifeSteal);mon.hp=Math.min(mon.hpMax,mon.hp+heal);showFloat($('mon-emoji'),'🩸+'+heal,'#ef4444');}
    lastMonAtk=now;
    if(getCls().resKey==='rage')state.resource=Math.min(state.resourceMax,state.resource+5);
  }
  // BOSS技能(带读条)— 使用技能自身CD, 支持副本/大秘境/地图BOSS
  if(mon.isBoss&&!casting){let bossData=null;
    const dg=DUNGEONS.find(d=>d.key===(state.dungeonState||state.mythicState)?.key);
    if(dg)bossData=(dg.bosses||[]).find(b=>b.name===mon.bossName);
    if(!bossData){const map=MAPS.find(m=>m.key===state.currentMap);if(map?.boss)bossData=map.boss;}
    const rawCd=((bossData?.skills||[])[bossSkillIdx%(bossData?.skills||[]).length])?.cd||10;
    const skillCd=Math.max(3,Math.floor(rawCd*0.6));   // CD加速40%,但最低3秒间隔
    if(bossData?.skills?.length&&now-lastBossSkill>skillCd*1000){const sk=bossData.skills[bossSkillIdx%bossData.skills.length];let castTime=sk.castTime!==undefined?sk.castTime:2;const instant=mon.instantCast&&Math.random()<0.35;if(instant)castTime=0;casting={isBoss:true,bossName:mon.bossName,icon:sk.icon,type:sk.type,heal:sk.heal,mul:sk.mul,alwaysCrit:sk.alwaysCrit,lifeSteal:sk.lifeSteal,dot:sk.dot,slow:sk.slow,startTime:now,duration:castTime*1000};log('💀 '+mon.bossName+(instant?' 瞬发 ':' 开始施放 ')+sk.name+'!'+(instant?'(无法打断)':''),'bad');lastBossSkill=now;bossSkillIdx++;}}
  if(state.hp<=0)onHeroDeath();
}

function onMonsterDeath(mon){
  if(!mon||mon.hp>0)return; // 已经处理过了
  if(state.currentMonsters[0]!==mon)return; // 不是当前怪物,已刷新
  // 大秘境词缀:崩裂/血池
  if (mon._affixes) {
    for (const af of mon._affixes) {
      if (af.mod.bursting) {
        const burstDmg = Math.max(1, Math.floor(state.hp * 0.05));
        state.hp -= burstDmg;
        showFloat($('hero-emoji'), '💥-'+burstDmg, '#ef4444');
      }
      if (af.mod.sanguine) {
        for (const other of state.currentMonsters) {
          if (other !== mon && other.hp > 0) {
            other._sanguineHeal = (other._sanguineHeal || 0) + Math.floor(other.hpMax * 0.03);
            other._sanguineEnd = Date.now() + 3000;
          }
        }
      }
    }
  }
  // 声望/图鉴/最高伤害等加成
  const bonus=(typeof progressionCombatBonus==='function')?progressionCombatBonus(mon.name):{xpMult:1,goldMult:1,dropMult:1,dmgMult:1};
  // 觉醒里程碑的 xpMult/goldMult/dropMult 是百分比加成,这里乘进去
  const ab=(typeof collectAscendMod==='function')?collectAscendMod():{xpMult:0,goldMult:0,dropMult:0};
  bonus.xpMult  *= 1 + (ab.xpMult||0)/100;
  bonus.goldMult*= 1 + (ab.goldMult||0)/100;
  bonus.dropMult*= 1 + (ab.dropMult||0)/100;
  const lb=(typeof collectLifeMod==='function')?collectLifeMod():{xpMult:0,goldMult:0,dropMult:0};
  bonus.xpMult  *= 1 + (lb.xpMult||0)/100;
  bonus.goldMult*= 1 + (lb.goldMult||0)/100;
  bonus.dropMult*= 1 + (lb.dropMult||0)/100;
  const af=(typeof collectArtifactMod==='function')?collectArtifactMod():{xpMult:0,goldMult:0,dropMult:0};
  bonus.xpMult  *= 1 + (af.xpMult||0)/100;
  bonus.goldMult*= 1 + (af.goldMult||0)/100;
  bonus.dropMult*= 1 + (af.dropMult||0)/100;
  const mm=(typeof collectMountMod==='function')?collectMountMod():{xpMult:0,goldMult:0,dropMult:0};
  bonus.xpMult  *= 1 + (mm.xpMult||0)/100;
  bonus.goldMult*= 1 + (mm.goldMult||0)/100;
  bonus.dropMult*= 1 + (mm.dropMult||0)/100;
  const olp=overLevelPenalty(mon);   // 越级惩罚(对级=1)
  let xp=calcXP(mon);xp=Math.floor(xp*bonus.xpMult);
  let goldEarned=Math.floor(mon.goldReward*bonus.goldMult*olp);
  if(xp>0)log('✅ 击败 '+mon.name+',+'+goldEarned+'💰 +'+xp+'XP','good');
  else log('✅ 击败 '+mon.name+',+'+goldEarned+'💰 (灰色:无经验)','info');
  state.gold+=goldEarned;state.honor+=mon.honorReward;
  if(typeof progressionOnGoldGain==='function') progressionOnGoldGain(goldEarned);
  if(typeof eventsOnGoldGain==='function') eventsOnGoldGain(goldEarned);
  if(typeof eventsOnKill==='function') eventsOnKill(mon);
  if(xp>0)gainXP(xp);state.killsTotal+=1;
  if(typeof passiveOnKill==='function')passiveOnKill(mon);
  if(xp>0&&typeof artifactGainAp==='function') artifactGainAp(xp);
  if(Math.random()<mon.gemChance){const gems=mon.isBoss?rng(3,8):1;state.gem+=gems;log('💎 +'+gems+' 钻石','loot');}
  // boss 掉宝石/精华
  if(mon.isBoss&&typeof bossGemDrop==='function'&&state.mode!=='mythic') bossGemDrop(mon.fromDungeon);
  // 普通怪有低概率掉精华
  else if(typeof bossGemDrop==='function'&&Math.random()<0.03){if(typeof ensureMats==='function')ensureMats();state.essence+=1;}
  // 钩子: 图鉴/声望/成就
  if(typeof progressionOnKill==='function') progressionOnKill(mon);
  // 坐骑掉落钩子(副本/大秘境 BOSS)
  if(mon.isBoss&&(state.mode==='dungeon'||state.mode==='mythic')&&typeof mountOnDungeonBossKill==='function') mountOnDungeonBossKill();
  // 掉率受声望加成 (一次性提升), 副本/大秘境BOSS必掉1件
  const adjDrop=(mon.isBoss&&(state.mode==='dungeon'||state.mode==='mythic'))?1:Math.min(1,mon.dropRate*bonus.dropMult*olp);
  if(Math.random()<adjDrop){
    const dKey=mon.fromDungeon?((state.dungeonState||state.mythicState)?.key):null;
    const it=mon._isRaid
      ? rollItemOfRarity('epic',mon.lvl)   // 团本:必紫(橙装走下方额外掉落)
      : rollItem(mon.maxRarity,mon.lvl,dKey,mon.isBoss?mon.bossName:null);
    if((state.mode==='dungeon'||state.mode==='mythic')&&(state.dungeonState||state.mythicState))(state.dungeonState||state.mythicState).loot.push(it);addToInventory(it);if(typeof eventsOnItemGet==='function') eventsOnItemGet(it);if(it.rarity==='legend'&&typeof progressionOnLegendary==='function') progressionOnLegendary();const c=it.rarity==='legend'?'legend':(it.rarity==='epic'?'epic':'loot');log('🎁 掉落 ['+it.rarityName+'] '+it.name,c);
  }
  // 团本最终BOSS额外低概率掉落橙装
  if(mon._isRaidFinal&&Math.random()<0.08){const dKey2=mon.fromDungeon?((state.dungeonState||state.mythicState)?.key):null;const legend=rollItem('legend',mon.lvl,dKey2,mon.bossName);addToInventory(legend);log('🎉 团本最终BOSS额外掉落 ['+legend.rarityName+'] '+legend.name,'legend');if(typeof progressionOnLegendary==='function') progressionOnLegendary();}
  // 世界Boss 击杀
  if(mon.isWorldBoss){if(typeof onWorldBossKill==='function') onWorldBossKill(mon);return;}
  if(state.mode==='dungeon'){const ds=state.dungeonState;const dg=DUNGEONS.find(d=>d.key===ds.key);const lastBoss=(dg.bosses||[])[dg.bosses.length-1];ds.wave+=1;if(lastBoss&&ds.wave>lastBoss.wave){onDungeonClear(dg);return;}spawnDungeonMonster();}
  else if(state.mode==='mythic'){const ms=state.mythicState;const dg=DUNGEONS.find(d=>d.key===ms.key);const lastBoss=(dg.bosses||[])[dg.bosses.length-1];if(mon.isBoss)onMythicBossKill();ms.wave+=1;if(lastBoss&&ms.wave>lastBoss.wave){onMythicClear();return;}spawnDungeonMonster();}
  else if(state.mode==='tower'){if(typeof onTowerMonsterKill==='function') onTowerMonsterKill(mon);}
  else if(state.mode==='boss'){if(mon.isBoss){const map=getMap();log('👑 '+map.boss.name+' 已被击败!','legend');
    if(map.boss.lvl>=60){
      // 60+ BOSS: 必爆紫装 + 15%概率橙装
      const purple=rollItemOfRarity('epic',mon.lvl);addToInventory(purple);if(typeof eventsOnItemGet==='function')eventsOnItemGet(purple);log('🎁 必掉 ['+purple.rarityName+'] '+purple.name,'epic');
      if(Math.random()<0.15){const orange=rollItemOfRarity('legend',mon.lvl);addToInventory(orange);if(typeof eventsOnItemGet==='function')eventsOnItemGet(orange);log('🎉 额外掉落 ['+orange.rarityName+'] '+orange.name,'legend');}
    }else{
      // 60以下: 必爆蓝装 + 15%概率紫装
      const blue=rollItemOfRarity('rare',mon.lvl);addToInventory(blue);if(typeof eventsOnItemGet==='function')eventsOnItemGet(blue);log('🎁 必掉 ['+blue.rarityName+'] '+blue.name,'loot');
      if(Math.random()<0.15){const purple=rollItemOfRarity('epic',mon.lvl);addToInventory(purple);if(typeof eventsOnItemGet==='function')eventsOnItemGet(purple);log('🎉 额外掉落 ['+purple.rarityName+'] '+purple.name,'epic');}
    }
    state.mode='world';markDirty('map');}spawnMonster();}
  else{const subKey=state.currentMap+'-'+state.currentSubzone;state.subzoneKills[subKey]=(state.subzoneKills[subKey]||0)+1;if(state.subzoneKills[subKey]===50&&!state.subzoneCleared[subKey]){state.subzoneCleared[subKey]=true;const map=getMap();const sub=map.sub[state.currentSubzone];state.gold+=sub.lvl[1]*30;log('🌟 ['+sub.name+'] 探索完成! +'+sub.lvl[1]*30+'💰','epic');const it3=rollItem('rare',sub.lvl[1],state.currentMap);addToInventory(it3);if(typeof eventsOnItemGet==='function') eventsOnItemGet(it3);if(typeof eventsOnSubzoneClear==='function') eventsOnSubzoneClear();if(typeof progressionOnSubzoneClear==='function') progressionOnSubzoneClear(state.currentMap,state.currentSubzone);markDirty('map');}
    // 多敌:仅移除这一只,整波清空后才刷新下一波
    const di=state.currentMonsters.indexOf(mon);if(di>=0)state.currentMonsters.splice(di,1);
    if(state.currentMonsters.length===0)spawnMonster();}
  // 注:不再每次击杀都 markDirty('inventory') —— 否则背包每杀一只就整体重建,
  // 导致鼠标悬停装备时按钮闪烁、点击落空。掉落时 addToInventory 已各自 markDirty。
}

function onHeroDeath(){
  log('☠️ 你倒下了…','bad');state._compHp=null;state._compDownUntil=0;   // 复活后随从满血归来
  const loss=Math.floor(state.gold*0.05);state.gold=Math.max(0,state.gold-loss);
  state.hp=state.hero.hpMax;state.resource=state.resourceMax;
  if(state.mode==='dungeon'){showDungeonFail();return;}
  if(state.mode==='mythic'){onMythicFail();return;}
  if(state.mode==='tower'){if(typeof onTowerFail==='function') onTowerFail(); spawnMonster(); return;}
  if(state.mode==='boss'){log('🚪 BOSS 战失败,撤退到主城','bad');state.mode='world';markDirty('map');}
  if(state.mode==='worldboss'){log('💀 世界Boss 战失败! 还可再战(CD不重置)','bad');if(typeof leaveWorldBoss==='function')leaveWorldBoss();else{state.mode='world';state.currentMonsters=[];}markDirty('map','events');return;}
  spawnMonster();
}

function gainXP(amt){
  if(state.hero.lvl>=MAX_LEVEL){state.hero.xp=0;return;}
  state.hero.xp+=amt;
  while(state.hero.lvl<MAX_LEVEL&&state.hero.xp>=xpNeeded(state.hero.lvl)){
    state.hero.xp-=xpNeeded(state.hero.lvl);state.hero.lvl+=1;
    for(const k of['str','agi','int','spi','sta'])state.attrs[k]+=1;
    state.talentPoints+=1;recomputeStats();state.hp=state.hero.hpMax;
    const c=getCls();state.resource=c.resKey==='rage'?0:state.resourceMax;
    checkSkillUnlocks();log('🎉 升到 Lv.'+state.hero.lvl+'! 全属性+1 +1天赋点','good');
    markDirty('hero','shop','talents','skills','map','dungeon');
  }
  if(state.hero.lvl>=MAX_LEVEL)state.hero.xp=0;
}
function xpNeeded(lvl){if(lvl>=MAX_LEVEL)return Infinity;return Math.floor((30+lvl*lvl*5+lvl*10)*(typeof XP_CURVE_MULT==='number'?XP_CURVE_MULT:1));}
function checkSkillUnlocks(){
  const c=getCls();if(!c)return;
  for(const[key,sk]of Object.entries(c.skills)){if(sk.unlockLvl&&state.hero.lvl>=sk.unlockLvl&&!state.unlockedSkills[key]){state.unlockedSkills[key]=true;if(state.selectedSkills.length===0)state.selectedSkills.push(key);log('✨ 学会了 ['+sk.name+']','good');markDirty('skills');}}
  if(typeof passiveCheckUnlocks==='function'){passiveCheckUnlocks();markDirty('skills');}
}

/* ---------- 物品 ---------- */
let itemIdSeq=1;
/* 启动时根据现有装备/背包/dungeonState.loot 校正 id 计数器,避免新生成 id 与旧物品冲突 */
function syncItemIdSeq(){
  let maxId = 0;
  const scan = arr => { if(!arr)return; for(const it of arr) if(it && typeof it.id==='number' && it.id>maxId) maxId=it.id; };
  scan(state.inventory);
  if (state.equipped) for (const k of Object.keys(state.equipped)) scan([state.equipped[k]]);
  if (state.dungeonState && state.dungeonState.loot) scan(state.dungeonState.loot);
  itemIdSeq = maxId + 1;
}
function genName(slotKey,rarity){
  const pool=ITEM_POOLS[slotKey]?.[rarity.key];if(pool&&pool.length>0)return pool[rng(0,pool.length-1)].name;
  const wowAdj={common:['粗糙的','破旧的','简陋的','磨损的'],uncommon:['坚实的','锋利的','迅捷的','闪光的'],rare:['秘银','黑曜石','寒冰','烈焰'],epic:['苍穹','深渊','龙鳞','奥金','暮光'],legend:['萨弗隆','霜之哀伤','灰烬使者','安杜尼苏斯','埃辛诺斯']};
  return choice(wowAdj[rarity.key])+SLOT_INFO[slotKey].label;
}
function getPoolStatBonus(slotKey,rarityKey){const pool=ITEM_POOLS[slotKey]?.[rarityKey];if(pool&&pool.length>0)return pool[rng(0,pool.length-1)].stats||{};return{};}
function rollItem(maxRarity,fromLvl,dungeonKey,bossName){
  const slotKey=choice(SLOT_ORDER);const slot=SLOT_INFO[slotKey];const rarity=pickRarity(maxRarity);
  const ds=state.dungeonState||state.mythicState;
  const power=(fromLvl||state.hero.lvl)+(ds?2:0);
  if(dungeonKey){const loot=DUNGEON_LOOT[dungeonKey];if(loot){let lootPool;if(bossName&&loot.bosses)lootPool=loot.bosses[bossName]||loot.trash||[];else if(ds&&state.currentMonsters[0]&&state.currentMonsters[0].isBoss&&state.currentMonsters[0].bossName&&loot.bosses)lootPool=loot.bosses[state.currentMonsters[0].bossName]||loot.trash||[];else if(ds&&state.currentMonsters[0]&&state.currentMonsters[0].isBoss)lootPool=loot.boss||[];else lootPool=loot.trash||[];   // 杂兵只从杂兵池掉(BOSS专属装备只能由对应BOSS掉,不再从BOSS池偷)
  if(lootPool.length>0){
    // 池内按"品质稀有度"加权挑一件(越稀有越少出),实现"必掉、但爆哪件看各装备爆率"
    let __tw=0;for(const p of lootPool)__tw+=(RARITY.find(r=>r.key===p.rarity)?.weight||1);
    let __r=Math.random()*__tw;let pick=lootPool[lootPool.length-1];
    for(const p of lootPool){__r-=(RARITY.find(r=>r.key===p.rarity)?.weight||1);if(__r<=0){pick=p;break;}}
    const pickRarity=RARITY.find(r=>r.key===pick.rarity)||rarity;const poolItem={id:itemIdSeq++,slot:pick.slot||slotKey,name:pick.name,rarity:pick.rarity,rarityName:pickRarity.name,cls:pickRarity.cls,bcls:pickRarity.bcls,stats:{},sell:0};return finishItem(poolItem,pick.slot||slotKey,pickRarity,power,pick.stats||{});}}}
  const item={id:itemIdSeq++,slot:slotKey,name:genName(slotKey,rarity),rarity:rarity.key,rarityName:rarity.name,cls:rarity.cls,bcls:rarity.bcls,stats:{},sell:0};
  const poolStats=getPoolStatBonus(slotKey,rarity.key);return finishItem(item,slotKey,rarity,power,poolStats);
}
/* 生成一件“指定品质”的随机槽位装备(绕过 pickRarity 的权重),用于必爆掉落 */
function rollItemOfRarity(rarityKey,fromLvl){
  const slotKey=choice(SLOT_ORDER);const rarity=RARITY.find(r=>r.key===rarityKey)||RARITY[0];
  const power=(fromLvl||state.hero.lvl);
  const item={id:itemIdSeq++,slot:slotKey,name:genName(slotKey,rarity),rarity:rarity.key,rarityName:rarity.name,cls:rarity.cls,bcls:rarity.bcls,stats:{},sell:0};
  const poolStats=getPoolStatBonus(slotKey,rarity.key);return finishItem(item,slotKey,rarity,power,poolStats);
}
function finishItem(item,slotKey,rarity,power,extraStats){
  const slot=SLOT_INFO[slotKey];
  const lvlBonus=1+power*0.01; // 等级越高属性越多(2026-06-16 0.02→0.01:压平后期二次膨胀)
  const baseVal={atk:Math.floor((3+power*1.0)*lvlBonus),def:Math.floor((2+power*0.55)*lvlBonus),hp:Math.floor((12+power*5)*lvlBonus),crit:1+power*0.1,critd:6+power*0.6,reg:1+power*0.2,str:Math.floor((1.5+power*0.4)*lvlBonus),agi:Math.floor((1.5+power*0.4)*lvlBonus),int:Math.floor((1.5+power*0.4)*lvlBonus),spi:Math.floor((1+power*0.35)*lvlBonus),sta:Math.floor((1.5+power*0.4)*lvlBonus),leech:0.5+power*0.06,vers:0.5+power*0.06,haste:0.5+power*0.06,dodge:0.5+power*0.06};
  const primary=slot.mainStat;let pv=baseVal[primary]*rarity.mult;
  item.stats[primary]=Math.max(1,Math.floor(pv));
  const bonusCount={common:1,uncommon:2,rare:3,epic:4,legend:5}[rarity.key];
  // 吸血/全能/暴击/暴伤/极速/精通/闪避已从常规副属池移除,改为下方"惊喜副属性"
  const possible=['atk','def','hp','reg','str','agi','int','spi','sta'].filter(k=>k!==primary);
  for(let i=0;i<bonusCount;i++){const k=possible.splice(rng(0,possible.length-1),1)[0];if(!k)break;item.stats[k]=Math.max(1,Math.floor(baseVal[k]*0.7*rarity.mult));}
  // 副属性只能来自下方"惊喜roll",不从命名装/池子的预设 stats 注入
  const SURPRISE_KEYS=['crit','critd','critdPct','leech','vers','haste','mastery','dodge'];
  if(extraStats){for(const[k,v]of Object.entries(extraStats)){if(SURPRISE_KEYS.includes(k))continue;item.stats[k]=(item.stats[k]||0)+Math.max(1,Math.floor(baseVal[k]*0.5*v*rarity.mult));}}
  // ---- 惊喜副属性 ----
  // 仅蓝装(rare)以上才可能出现,各自独立低概率,不占常规副属分配(额外附加),可同时出现也可能都不出现。
  // 数值随品质 蓝/紫/橙:吸血/全能/极速/暴击/精通/闪避 = 1/2/4;暴伤倍率更高 = 3/6/12。
  const SURPRISE_CHANCE=0.15;
  const SURPRISE={leech:{rare:1,epic:2,legend:4},vers:{rare:1,epic:2,legend:4},haste:{rare:1,epic:2,legend:4},mastery:{rare:1,epic:2,legend:4},dodge:{rare:1,epic:2,legend:4},crit:{rare:1,epic:2,legend:3},critd:{rare:3,epic:6,legend:12}};
  for(const sk in SURPRISE){const v=SURPRISE[sk][rarity.key];if(v&&Math.random()<SURPRISE_CHANCE)item.stats[sk]=(item.stats[sk]||0)+v;}
  // 安全帽:暴击/暴伤/极速/闪避上限(防止任何路径溢出)
  if(item.stats.crit>4)item.stats.crit=4;
  if(item.stats.critd>12)item.stats.critd=12;
  if(item.stats.haste>4)item.stats.haste=4;
  if(item.stats.dodge>4)item.stats.dodge=4;
  item.reqLvl=Math.max(1,Math.floor(power*0.9));item.sell=Math.floor(10*rarity.mult*(1+power*0.5));
  if(typeof enhanceItemOnCreate==='function') enhanceItemOnCreate(item,rarity,power);
  return item;
}
function addToInventory(item){
  if(item.mythicUnique){state.inventory.push(item);markDirty('inventory');log('🌟 专属传说已入包: '+item.name+' (背包'+state.inventory.length+'件)','loot');return;}
  if(state.autoSellRarity){const itemIdx=RARITY.findIndex(r=>r.key===item.rarity);const sellIdx=RARITY.findIndex(r=>r.key===state.autoSellRarity);if(itemIdx<=sellIdx){state.gold+=item.sell;return;}}
  if(state.inventory.length>=40){state.gold+=item.sell;log('📦 背包已满,自动出售 '+item.name+' +'+item.sell+'💰','info');return;}
  state.inventory.push(item);markDirty('inventory');
}
function equipItem(itemId){const idx=state.inventory.findIndex(i=>i.id===itemId);if(idx<0)return;const item=state.inventory[idx];if(item.reqLvl&&state.hero.lvl<item.reqLvl){log('需要等级 Lv.'+item.reqLvl,'bad');return;}const prev=state.equipped[item.slot];state.equipped[item.slot]=item;state.inventory.splice(idx,1);if(prev)state.inventory.push(prev);recomputeStats();log('🎽 装备了 '+item.name,'good');markDirty('inventory','equipment','hero');}
function unequipItem(slotKey){const it=state.equipped[slotKey];if(!it)return;if(state.inventory.length>=40){log('背包已满','bad');return;}state.inventory.push(it);delete state.equipped[slotKey];recomputeStats();markDirty('inventory','equipment','hero');}
function sellItem(itemId){const idx=state.inventory.findIndex(i=>i.id===itemId);if(idx<0)return;const item=state.inventory[idx];state.gold+=item.sell;state.inventory.splice(idx,1);markDirty('inventory');}
function sellAllBelow(level){const levelIdx=['common','uncommon','rare','epic','legend'].indexOf(level);let total=0,n=0;state.inventory=state.inventory.filter(i=>{const idx=['common','uncommon','rare','epic','legend'].indexOf(i.rarity);if(idx<=levelIdx){total+=i.sell;n++;return false;}return true;});state.gold+=total;if(n)log('💰 出售 '+n+' 件 +'+total,'info');markDirty('inventory');}

/* ---------- 技能 ---------- */
let casting=null;
/* 切换角色或重置时调用,清理 combat 模块变量,避免下个角色继承上一个的状态 */
function resetCombatState(){
  casting=null;
  lastHeroAtk=0;lastMonAtk=0;lastRegen=0;dotTick=0;lastBossSkill=0;bossSkillIdx=0;burnTick=0;
  if(state){state.heroDebuffs={};state.heroStunUntil=0;}
  if(typeof lastCompAtk==='number')lastCompAtk=0;
  if(typeof lastCompSkill==='number')lastCompSkill=0;
  if(typeof compSkillIdx==='number')compSkillIdx=0;
  if(typeof lastCompRegen==='number')lastCompRegen=0;
  if(state){state._compHp=null;state._compDownUntil=0;}   // 随从血量/阵亡态:下个角色重新满血
  if(typeof resetDmgStats==='function')resetDmgStats();
  compSkillCd={};
  const cb=document.getElementById('cast-bar-wrap');if(cb)cb.style.visibility='hidden';
}
function hasteFactor(){return 1+((state.hero&&state.hero.haste)||0)/100;}        // 极速倍率(>=1):提攻速/读条/CD
function castSpeedMul(){return (state.battleSpeed||1)*hasteFactor();}             // 读条速度&技能CD 提速 = 战斗倍速 × 极速
function castDmgBonus(sk){return 1+((sk&&sk.castTime)||0)*0.3;}                   // 法系补偿:带读条的技能按读条时长加伤(读条=投资,换更高爆发)
function getCastTime(sk){if(sk.type==='interrupt')return 0;if(sk.castTime!==undefined)return sk.castTime;return 0;}
function getSkillCd(sk){let base;if(sk.cd)base=sk.cd;else if(sk.type==='buff')base=40;else if(sk.type==='heal')base=16;else{const mul=sk.mul||1;if(mul>=8)base=35;else if(mul>=6)base=24;else if(mul>=5)base=18;else if(mul>=4)base=13;else if(mul>=3)base=9;else base=7;}if(state.hero.cdReduction>0)base=Math.max(3,Math.floor(base*(1-state.hero.cdReduction/100)));return base;}
function startCast(skillKey,manual){
  const c=getCls();const sk=c.skills[skillKey];if(!sk)return;
  const castTime=getCastTime(sk);if(castTime<=0){castSkill(skillKey,manual);return;}
  const now=Date.now();if(state.skillCooldowns[skillKey]&&state.skillCooldowns[skillKey]>now){if(manual)log(sk.name+' 冷却中','bad');return;}
  let cost=sk.mp;if(state.hero.costReduction>0)cost=Math.max(1,Math.floor(sk.mp*(1-state.hero.costReduction/100)));
  if(state.resource<cost){if(manual)log(c.resource+'不足','bad');return;}
  casting={skillKey,startTime:now,duration:castTime*1000/castSpeedMul(),manual:!!manual};log(sk.icon+' 施放 '+sk.name+'...','info');   // 读条受 倍速×极速 影响
}
function tickCast(now){
  if(!casting)return;
  const elapsed=now-casting.startTime;const pct=Math.min(100,elapsed/casting.duration*100);
  const remaining=Math.max(0,Math.ceil((casting.duration-elapsed)/1000));
  const c=getCls();const sk=c?.skills[casting.skillKey||''];
  $('cast-bar-wrap').style.visibility='visible';
  if(casting.isBoss){$('cast-name').textContent='💀 '+(casting.bossName||'BOSS')+' - '+(casting.icon||'');$('b-cast').style.background='linear-gradient(90deg,#ef4444,#dc2626)';}
  else{$('cast-name').textContent=(sk?.icon||'')+' '+(sk?.name||'施法中');$('b-cast').style.background='linear-gradient(90deg,#fbbf24,#f59e0b)';}
  $('cast-time').textContent=remaining>0?remaining+'s':'';$('b-cast').style.width=pct+'%';
  if(elapsed>=casting.duration){$('cast-bar-wrap').style.visibility='hidden';const wasCasting=casting;casting=null;
    if(wasCasting.isBoss){const mon=state.currentMonsters[0];if(!mon||mon.hp<=0)return;
      if(wasCasting.type==='heal'){const h=Math.floor(mon.hpMax*(wasCasting.heal||0.2));mon.hp=Math.min(mon.hpMax,mon.hp+h);}
      else{
        // 统一伤害公式: calcDmg(BOSS攻击力×倍率, 防御, 暴击, 暴伤, 必暴)
        const mul=wasCasting.mul||2;
        const rawAtk=Math.floor(mon.atk*mul);
        // 仇恨前置:先判断随从是否挡刀
        const hitsCompanion=companionTargetable()&&Math.random()<compAggroChance();
        if(hitsCompanion){
          const cst=computeCompanionStats();
          const d2=calcDmg(rawAtk,cst?cst.def:mon.def,mon.critChance?mon.critChance*100:5,mon.critMult?mon.critMult*100:150,wasCasting.alwaysCrit,state.hero.lvl,mon.lvl);
          const taken=d2.dmg;
          state._compHp=Math.max(0,(state._compHp||0)-taken);
          showFloat($('comp-mini'),'💀'+wasCasting.icon+'-'+taken,'#ff9aa0');
          if(wasCasting.lifeSteal)mon.hp=Math.min(mon.hpMax,mon.hp+Math.floor(taken*wasCasting.lifeSteal));
          log('🛡️ 随从替你承受了 '+wasCasting.icon+'!','info');
          if(state._compHp<=0)downCompanion(Date.now());
        }else{
          const d=calcDmg(rawAtk,state.hero.def,mon.critChance?mon.critChance*100:5,mon.critMult?mon.critMult*100:150,wasCasting.alwaysCrit,state.hero.lvl,mon.lvl);
          let taken=d.dmg;
          if(state.hero.vers>0)taken=Math.max(1,Math.floor(taken*(1-state.hero.vers/100)));
          if(typeof passiveDamageTakenMult==='function')taken=Math.max(1,Math.floor(taken*passiveDamageTakenMult()));
          taken=Math.max(1,Math.floor(taken*buffDamageReductionMult()));
          taken=Math.max(1,Math.floor(taken*heroDebuffTakenMult()));
          taken=Math.max(1,Math.floor(taken*masteryTakenMult()));
          state.hp-=taken;showFloat($('hero-emoji'),'💀'+wasCasting.icon+'-'+taken,'#ff4444');
          if(typeof passiveOnTakeDamage==='function')passiveOnTakeDamage(mon,taken);
          if(wasCasting.lifeSteal)mon.hp=Math.min(mon.hpMax,mon.hp+Math.floor(taken*wasCasting.lifeSteal));
          // 技能特效
          if(wasCasting.dot){applyHeroDebuff('burn',6000,{dps:Math.max(1,Math.floor(taken*0.12))});log('☠️ 你陷入了'+(wasCasting.icon||'')+'持续伤害!','bad');}
          else if(wasCasting.slow){applyHeroDebuff('chill',4000);log('❄️ 你被减速了!','bad');}
          else{applyHeroDebuff('vulnerable',5000);log('🩸 你被打成了易伤(受到伤害+20%,5秒)','bad');}
          if(state.hp<=0)onHeroDeath();}}}
    }else{castSkill(wasCasting.skillKey,wasCasting.manual);}
  }
function castSkill(skillKey,manual){
  const c=getCls();const sk=c.skills[skillKey];if(!sk)return;
  if(!state.unlockedSkills[skillKey]){if(manual)log('技能未解锁','bad');return;}
  if(sk.type==='interrupt'){if(manual)doInterrupt();const cdSec=sk.cd||5;state.skillCooldowns[skillKey]=Date.now()+cdSec*1000/castSpeedMul();return;}
  const now=Date.now();
  if(state.skillCooldowns[skillKey]&&state.skillCooldowns[skillKey]>now){if(manual){const left=Math.ceil((state.skillCooldowns[skillKey]-now)/1000);log(sk.name+' 冷却中('+left+'秒)','bad');}return;}
  let cost=sk.mp;if(state.hero.costReduction>0)cost=Math.max(1,Math.floor(sk.mp*(1-state.hero.costReduction/100)));
  if(sk.consumeRage){cost=Math.min(state.resource,10);}   // 斩杀:至少需10怒,但会消耗全部
  if(state.resource<cost){if(manual)log(c.resource+'不足','bad');return;}
  if(!sk.consumeRage)state.resource-=cost;   // 斩杀在伤害计算时消耗全部怒气
  const cdSec=getSkillCd(sk);state.skillCooldowns[skillKey]=now+cdSec*1000/castSpeedMul();   // CD 受 倍速×极速 影响
  if(sk.type==='dmg'){const mon=state.currentMonsters[0];if(!mon)return;
    // 斩杀:消耗所有怒气,每点怒气+1%伤害
    let rageBonus=1;
    if(sk.consumeRage&&c.resKey==='rage'&&state.resource>0){rageBonus=1+state.resource/100;log('💀 消耗 '+state.resource+' 怒气,伤害 +'+(state.resource)+'%','good');state.resource=0;}
    const isAOE=(sk.mul>=4&&getAliveMonsters().length>1);
    let dmgDone=0;
    const cb=castDmgBonus(sk)*masteryDmgMult()*rageBonus;   // 读条技能的伤害补偿(法系) + 精通伤害增幅 + 怒气加成
    if(isAOE){dmgDone=dealDmgToAll(state.hero.atk*cb,mon.def,state.hero.crit,state.hero.critd,sk.mul,sk.alwaysCrit);log(sk.icon+' '+sk.name+'! AOE '+dmgDone+' 总伤害','good');}
    else if(mon.dodgeChance&&Math.random()<mon.dodgeChance){showFloat($('mon-emoji'),'闪避','#9ca3af');log(sk.icon+' '+sk.name+' 被 '+mon.name+' 闪避!','bad');}
    else{const d=calcDmg(state.hero.atk*sk.mul*cb,heroTargetDef(mon),state.hero.crit,state.hero.critd,sk.alwaysCrit,mon.lvl,state.hero.lvl);let dd=d.dmg;if(mon.dmgReduction)dd=Math.max(1,Math.floor(dd*(1-mon.dmgReduction)));mon.hp-=dd;dmgDone=dd;trackDmg('hero',dd);showFloat($('mon-emoji'),'-'+dd,sk.alwaysCrit?'#fbbf24':'#a335ee');log(sk.icon+' '+sk.name+'! '+dd+' 伤害'+(sk.alwaysCrit?' (必暴)':''),'good');}
    if(sk.lifeSteal){const heal=Math.floor(dmgDone*sk.lifeSteal);state.hp=Math.min(state.hero.hpMax,state.hp+heal);}
    if(sk.dot&&!isAOE){mon.dot=Math.floor(dmgDone*0.15*(1+(state.hero.dotBonus||0)/100));mon.dotEnd=Date.now()+5000;}
    if(sk.slow)mon.slowUntil=Date.now()+4000;
    if(sk.debuff==='sunder'){mon.sunderUntil=Date.now()+15000;}   // 破甲:15秒防御-30%
  }else if(sk.type==='heal'){const healMult=1+(state.hero.healBonus||0)/100;const h=Math.floor(state.hero.hpMax*sk.heal*healMult);state.hp=Math.min(state.hero.hpMax,state.hp+h);showFloat($('hero-emoji'),'+'+h,'#6ee7b7');log(sk.icon+' '+sk.name+'!恢复 '+h+' 生命','good');}
  else if(sk.type==='buff'){const dur=sk.duration+(state.hero.buffDuration||0)*1000;state.buffs[sk.buff]=Date.now()+dur;recomputeStats();log(sk.icon+' '+sk.name+'!','good');}
}
function doInterrupt(){if(!casting){log('没有正在施放的法术','info');return;}if(casting.isBoss){const bossName=casting.bossName||'BOSS';log('🦶 打断了 '+bossName+' 的 '+casting.icon+' 施法!','good');$('cast-bar-wrap').style.visibility='hidden';casting=null;}else{log('只能打断BOSS施法','info');}}

/* ---------- 随从 ---------- */
let lastCompAtk=0,lastCompSkill=0,compSkillIdx=0,lastCompRegen=0;
/* ---------- 伤害统计(战斗日志下面的伤害条) ---------- */
let dmgStats={hero:0,comp:0,start:0,last:0};
function trackDmg(src,amt){amt=Math.floor(amt||0);if(amt<=0)return;const t=Date.now();if(!dmgStats.start)dmgStats.start=t;dmgStats.last=t;dmgStats[src]=(dmgStats[src]||0)+amt;}
function resetDmgStats(){dmgStats={hero:0,comp:0,start:0,last:0};if(typeof markDirty==='function')markDirty('stage');}
let compSkillCd={};   // 随从每个技能的独立冷却就绪时间戳(键=技能下标;_owner 记录当前随从,换随从自动重置)
const COMP_SKILL_DEFAULT_CD=8;   // 随从技能默认CD(秒,技能未写 cd 时)
function companionSkillCdLeft(i){ return Math.max(0, ((compSkillCd&&compSkillCd[i])||0) - Date.now()); }   // 供 UI 显示剩余CD(毫秒)
function getActiveCompanion(){if(state.activeCompanion<0||!state.companions[state.activeCompanion])return null;return state.companions[state.activeCompanion];}
function computeCompanionStats(){const comp=getActiveCompanion();if(!comp)return null;const tpl=COMPANIONS.find(c=>c.key===comp.key);if(!tpl)return null;const q=(typeof compQuality==='function')?compQuality(tpl):{mult:0.8};const qm=q.mult;const sm=1+0.18*((comp.stars||1)-1);/*升星每星+18%,满星≈1.72x*/
  // 定位调整(在参战属性基础上):坦克 防×1.5 攻×0.75;输出 防×0.9 攻×1.1;辅助(治疗)不变
  const roleAtk=tpl.role==='tank'?0.75:tpl.role==='dps'?1.1:1;
  const roleDef=tpl.role==='tank'?1.5:tpl.role==='dps'?0.9:1;
  return{name:tpl.name,emoji:tpl.emoji,role:tpl.role,skills:tpl.skills,atk:Math.floor(state.hero.atk*qm*sm*roleAtk),def:Math.floor(state.hero.def*qm*sm*0.8*roleDef),hpMax:Math.floor(state.hero.hpMax*qm*sm*0.6),crit:Math.floor(state.hero.crit*qm*0.5),critd:state.hero.critd,spd:state.hero.spd*0.7};}
/* 随从给主角的加成:专属(随星级强化)+ 定位 + 收藏 + 羁绊 */
function collectCompanionMod(){
  const out={atkPct:0,hpPct:0,defPct:0,critdPct:0,spdPct:0,crit:0,leech:0,vers:0,mastery:0,regFlat:0};
  if(!state||!state.companions)return out;
  const comp=getActiveCompanion();
  if(comp){const tpl=COMPANIONS.find(c=>c.key===comp.key);
    if(tpl){const starF=1+0.2*((comp.stars||1)-1);
      for(const[k,v]of Object.entries(tpl.bonus||{}))out[k]=(out[k]||0)+v*starF;
      const role=(typeof ROLE_BONUS==='object')&&ROLE_BONUS[tpl.role];
      if(role)for(const[k,v]of Object.entries(role))out[k]=(out[k]||0)+v;}}
  const owned=state.companions.length;out.atkPct+=owned*0.15;out.hpPct+=owned*0.15;   // 收藏被动
  if(typeof COMPANION_BONDS!=='undefined'){const ks=new Set(state.companions.map(c=>c.key));
    for(const b of COMPANION_BONDS){if(b.keys.every(k=>ks.has(k)))for(const[k,v]of Object.entries(b.mod))out[k]=(out[k]||0)+v;}}
  return out;
}
function activeCompanionBonds(){if(typeof COMPANION_BONDS==='undefined'||!state.companions)return[];const ks=new Set(state.companions.map(c=>c.key));return COMPANION_BONDS.filter(b=>b.keys.every(k=>ks.has(k)));}
function initCompanionHp(){
  const st=computeCompanionStats();
  if(!st){state._compHp=0;return;}
  if(state._compDownUntil===undefined||state._compDownUntil===null)state._compDownUntil=0;
  if(state._compHp===undefined||state._compHp===null)state._compHp=st.hpMax;                 // 首次:满血
  else if(!compDowned())state._compHp=Math.min(state._compHp,st.hpMax);                       // 跨波保留(只把超出新上限的钳回)
}
/* 随从是否处于阵亡(倒下计时中) */
function compDowned(){return (state._compDownUntil||0)>Date.now();}
/* 随从当前可否被怪攻击:出战、存活、未阵亡 */
function companionTargetable(){return !!getActiveCompanion()&&(state._compHp||0)>0&&!compDowned();}
/* 按定位的吸引仇恨概率:坦克多、治疗少、输出居中 */
function compAggroChance(){const comp=getActiveCompanion();if(!comp)return 0;const tpl=COMPANIONS.find(c=>c.key===comp.key);const role=tpl&&tpl.role;return role==='tank'?0.45:role==='heal'?0.15:0.20;}
/* 随从倒下:清血、进入15秒复活计时 */
function downCompanion(now){
  state._compHp=0;state._compDownUntil=now+15000;
  const comp=getActiveCompanion();const tpl=comp&&COMPANIONS.find(c=>c.key===comp.key);
  showFloat($('comp-mini'),'💫倒下','#fde047');
  const e=$('comp-mini');if(e){e.classList.add('shake');setTimeout(()=>{const x=$('comp-mini');if(x)x.classList.remove('shake');},200);}
  log('💫 '+(tpl?tpl.emoji+tpl.name:'随从')+' 倒下了!15秒后归来','bad');
}
function tickCompanion(now){const comp=getActiveCompanion();if(!comp)return;const st=computeCompanionStats();if(!st)return;
  // 复活计时:倒地满15秒 → 以 50% 血归来
  if(!compDowned()&&(state._compDownUntil||0)>0){state._compDownUntil=0;state._compHp=Math.floor(st.hpMax*0.5);const tpl=COMPANIONS.find(c=>c.key===comp.key);showFloat($('comp-mini'),'✨归来','#6ee7b7');log('✨ '+(tpl?tpl.emoji+tpl.name:'随从')+' 重新投入战斗!','good');}
  // 缓慢回血:存活且未满,每秒回复 2% 最大生命
  if(!compDowned()&&(state._compHp||0)>0&&state._compHp<st.hpMax&&now-lastCompRegen>1000){lastCompRegen=now;state._compHp=Math.min(st.hpMax,state._compHp+Math.max(1,Math.ceil(st.hpMax*0.02)));}
  if(compDowned())return;   // 阵亡期间不攻击/不施法/不奶
  const mon=state.currentMonsters[0];if(!mon)return;
  if(compSkillCd._owner!==comp.key)compSkillCd={_owner:comp.key};   // 换随从:重置技能冷却
  const interval=1000/(st.spd||0.5);if(now-lastCompAtk>interval||now-lastCompAtk>5000){let cm=state.currentMonsters[0];if(cm&&cm.hp>0){const cd=calcDmg(st.atk,monArmor(cm),st.crit,st.critd,false,cm.lvl,state.hero.lvl);cm.hp-=cd.dmg;trackDmg('comp',cd.dmg);showFloat($('mon-emoji'),st.emoji+'-'+cd.dmg,'#a0d0ff');}lastCompAtk=now;
    // 技能:每个技能按自己的 cd 独立冷却,就绪即放(GCD 2秒,避免一次性全放;优先治疗>buff>伤害)
    if(now-lastCompSkill>2000){
      const ready=[];for(let i=0;i<st.skills.length;i++){if((compSkillCd[i]||0)<=now)ready.push(i);}
      ready.sort((a,b)=>{const pr=s=>s.type==='heal'?2:s.type==='buff'?1:0;return pr(st.skills[b])-pr(st.skills[a]);});
      const i=ready[0];
      if(i!==undefined){const sk=st.skills[i];
        if(sk.type==='dmg'){const sd=calcDmg(st.atk*sk.mul,monArmor(mon),st.crit,st.critd,sk.alwaysCrit,mon.lvl,state.hero.lvl);mon.hp-=sd.dmg;trackDmg('comp',sd.dmg);showFloat($('mon-emoji'),st.emoji+sk.icon+'-'+sd.dmg,'#c0a0ff');if(sk.heal){state.hp=Math.min(state.hero.hpMax,state.hp+Math.floor(state.hero.hpMax*sk.heal));showFloat($('hero-emoji'),'+'+Math.floor(state.hero.hpMax*sk.heal),'#6ee7b7')}}
        else if(sk.type==='heal'){const h=Math.floor(state.hero.hpMax*sk.heal);state.hp=Math.min(state.hero.hpMax,state.hp+h);showFloat($('hero-emoji'),st.emoji+'+'+h,'#6ee7b7');log(st.emoji+' '+sk.name+'! +'+h+' 生命','good');}
        else if(sk.type==='buff'){const dur=(sk.duration||15000)+(state.hero.buffDuration||0)*1000;state.buffs[sk.buff]=Date.now()+dur;recomputeStats();log(st.emoji+' '+sk.name+'!','good');}
        compSkillCd[i]=now+(sk.cd||COMP_SKILL_DEFAULT_CD)*1000;lastCompSkill=now;
      }
    }
  }}
function companionDraw(){
  if((state.compTickets||0)<1)return log('🐾随从券不足,去商店购买','bad');
  state.compTickets-=1;
  // 按"该随从所属品质权重"加权随机抽一个随从(品质=随从固定属性)
  let total=0;const w=COMPANIONS.map(c=>{const x=compQuality(c).weight;total+=x;return x;});
  let r=Math.random()*total;let tpl=COMPANIONS[0];
  for(let i=0;i<COMPANIONS.length;i++){r-=w[i];if(r<=0){tpl=COMPANIONS[i];break;}}
  const q=compQuality(tpl);
  const existing=state.companions.find(c=>c.key===tpl.key);
  if(existing){
    const shards=({white:1,green:2,blue:3,purple:5,orange:8})[q.key]||1;
    state.companionShards[tpl.key]=(state.companionShards[tpl.key]||0)+shards;
    log(`🎰 抽到重复! ${tpl.emoji}${tpl.name}(${q.name})→+${shards}碎片`,'info');
  }else{
    state.companions.push({key:tpl.key,stars:1});
    log(`🎰 获得随从! ${tpl.emoji}${tpl.name}【${q.name}】`,(q.key==='orange'||q.key==='purple')?'legend':'good');
    recomputeStats();
  }
  markDirty('companion','hero');
}
function upgradeCompanion(idx){
  const comp=state.companions[idx];if(!comp)return;
  const tpl=COMPANIONS.find(c=>c.key===comp.key);
  if((comp.stars||1)>=5)return log('已满星','bad');
  const need=(comp.stars||1)*8;const have=state.companionShards[comp.key]||0;
  if(have<need)return log(`碎片不足(${have}/${need})`,'bad');
  state.companionShards[comp.key]-=need;comp.stars=(comp.stars||1)+1;
  log(`⭐ ${tpl?.name} 升到 ${comp.stars} 星!`,'good');
  recomputeStats();markDirty('companion','hero');
}
function getUpgradeCost(comp){
  const stars=comp.stars||1;
  if(stars>=5)return {type:'满星',need:0,have:state.companionShards[comp.key]||0,maxed:true};
  return {type:'升星',need:stars*8,have:state.companionShards[comp.key]||0,maxed:false};
}
