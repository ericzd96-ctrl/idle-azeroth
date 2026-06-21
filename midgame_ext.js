(function extendMidgameContent() {
  if (typeof globalThis === 'undefined' || typeof DUNGEONS === 'undefined') return;

  const SET_SLOTS = ['helmet', 'shoulder', 'armor', 'gloves'];
  const SET_STAGE_BANDS = [
    { key:'vanguard', min:20, max:34, name:'先锋', power:0 },
    { key:'warpath', min:35, max:49, name:'征战', power:1 },
    { key:'dominion', min:50, max:64, name:'统御', power:2 },
    { key:'paragon', min:65, max:79, name:'巅峰', power:3 },
  ];
  const SET_CLASS_LABELS = {
    warrior:['前锋战铠','军团战铠','督军战铠','不朽战铠'],
    mage:['奥术法衣','星纹法衣','织焰法衣','天穹法衣'],
    priest:['圣谕祭服','信念祭服','赦罪祭服','晨辉祭服'],
    rogue:['夜刃皮甲','影袭皮甲','毒幕皮甲','幽影皮甲'],
    hunter:['追猎锁甲','鹰眼锁甲','兽王锁甲','裂风锁甲'],
    shaman:['图腾战铠','风怒战铠','地脉战铠','先祖战铠'],
    paladin:['银手铠甲','审判铠甲','圣佑铠甲','日耀铠甲'],
    warlock:['魂火法衣','咒怨法衣','末日法衣','虚渊法衣'],
    druid:['林歌法衣','荒野法衣','月歌法衣','梦痕法衣'],
  };
  const SET_SLOT_LABELS = {
    helmet:'头冠',
    shoulder:'肩铠',
    armor:'胸甲',
    gloves:'护手',
  };
  const SET_EFFECTS = {
    warrior:[
      { pieces:2, mod:{ atkPct:4, defPct:4 } },
      { pieces:4, mod:{ executeBonus:10, extraAtk:4 } },
    ],
    mage:[
      { pieces:2, mod:{ critdPct:12, mastery:3 } },
      { pieces:4, mod:{ dotBonus:16, cdReduction:6 } },
    ],
    priest:[
      { pieces:2, mod:{ healBonus:14, hpPct:5 } },
      { pieces:4, mod:{ defPct:6, regFlat:4, vers:3 } },
    ],
    rogue:[
      { pieces:2, mod:{ crit:4, spdPct:6 } },
      { pieces:4, mod:{ executeBonus:12, critdPct:14 } },
    ],
    hunter:[
      { pieces:2, mod:{ atkPct:5, crit:3 } },
      { pieces:4, mod:{ spdPct:8, extraAtk:5 } },
    ],
    shaman:[
      { pieces:2, mod:{ vers:4, mastery:3 } },
      { pieces:4, mod:{ healBonus:10, dotBonus:10, cdReduction:4 } },
    ],
    paladin:[
      { pieces:2, mod:{ atkPct:4, defPct:5 } },
      { pieces:4, mod:{ healBonus:10, vers:4, reflectDmg:4 } },
    ],
    warlock:[
      { pieces:2, mod:{ dotBonus:16, critdPct:10 } },
      { pieces:4, mod:{ leech:5, cdReduction:5, atkPct:4 } },
    ],
    druid:[
      { pieces:2, mod:{ hpPct:5, spdPct:5 } },
      { pieces:4, mod:{ healBonus:10, dotBonus:10, vers:3 } },
    ],
  };
  // 套装触发效果(统御tier2和巅峰tier3的2件/4件proc)
  const SET_TRIGGERS = {
    warrior: {
      2: { // 统御
        4: [
          { type:'onCrit', chance:15, cooldown:8000, auraKey:'warrior_dominion_fury' },
          { type:'onKill', cooldown:12000, nextSkillCrit:1, shieldPct:0.10 },
        ]
      },
      3: { // 巅峰
        2: [
          { type:'onHit', chance:10, cooldown:5000, extraDmgPct:0.50 },
        ],
        4: [
          { type:'afterSkill', skill:'w_colossus', nextCrit:1, cooldown:15000 },
          { type:'lowHp', threshold:0.35, cooldown:25000, auraKey:'warrior_paragon_fortitude' },
        ]
      }
    },
    mage: {
      2: {
        4: [
          { type:'onCrit', chance:18, cooldown:8000, auraKey:'mage_dominion_ignite' },
          { type:'onKill', cooldown:12000, nextSkillCrit:1, auraKey:'mage_paragon_haste' },
        ]
      },
      3: {
        2: [
          { type:'afterSkill', skill:'m_meteor', cooldown:15000, auraKey:'mage_paragon_haste' },
        ],
        4: [
          { type:'onCrit', dmgBonusPct:25, threshold:0.35 },
          { type:'lowHp', threshold:0.35, cooldown:25000, auraKey:'mage_paragon_iceblock' },
        ]
      }
    },
    priest: {
      2: {
        4: [
          { type:'afterHeal', overhealShieldPct:0.25, cooldown:10000 },
          { type:'onCrit', chance:15, cooldown:10000, auraKey:'priest_dominion_holy' },
        ]
      },
      3: {
        2: [
          { type:'onHit', chance:12, cooldown:8000, healPct:0.03 },
        ],
        4: [
          { type:'lowHp', threshold:0.30, cooldown:25000, healPct:0.20, auraKey:'priest_paragon_guard' },
          { type:'afterSkill', skill:'p_mindBlast', resource:20, cooldown:12000 },
        ]
      }
    },
    rogue: {
      2: {
        4: [
          { type:'onCrit', chance:18, cooldown:7000, auraKey:'rogue_dominion_dance' },
          { type:'onCrit', dmgBonusPct:20, threshold:0.30 },
        ]
      },
      3: {
        2: [
          { type:'onHit', chance:12, cooldown:6000, dotPct:0.15, dotMs:5000 },
        ],
        4: [
          { type:'onKill', cooldown:15000, resetSkill:'r_vanish', resetPct:1 },
          { type:'afterSkill', skill:'r_coldBlood', nextCrit:1, cooldown:12000 },
        ]
      }
    },
    hunter: {
      2: {
        4: [
          { type:'onCrit', chance:15, cooldown:8000, auraKey:'hunter_dominion_pack' },
          { type:'onKill', cooldown:10000, extraDmgPct:0.30 },
        ]
      },
      3: {
        2: [
          { type:'onHit', chance:12, cooldown:5000, resource:10, extraAtkBonus:true },
        ],
        4: [
          { type:'onCrit', dmgBonusPct:15 },
          { type:'onCrit', chance:10, cooldown:12000, auraKey:'hunter_paragon_snipe' },
        ]
      }
    },
    shaman: {
      2: {
        4: [
          { type:'onCrit', chance:15, cooldown:8000, auraKey:'shaman_dominion_maelstrom' },
          { type:'afterSkill', skill:'sh_stormStrike', chainDmgPct:0.40, cooldown:10000 },
        ]
      },
      3: {
        2: [
          { type:'onHit', chance:10, cooldown:5000, extraHitPct:0.60 },
        ],
        4: [
          { type:'lowHp', threshold:0.35, cooldown:25000, auraKey:'shaman_paragon_ancestral' },
          { type:'onCrit', chance:12, cooldown:15000, healPct:0.05 },
        ]
      }
    },
    paladin: {
      2: {
        4: [
          { type:'onCrit', chance:15, cooldown:8000, auraKey:'paladin_dominion_retribution' },
          { type:'lowHp', threshold:0.35, cooldown:30000, shieldPct:0.15 },
        ]
      },
      3: {
        2: [
          { type:'onHit', chance:10, cooldown:6000, holyDmgPct:0.40 },
        ],
        4: [
          { type:'onKill', cooldown:15000, auraKey:'paladin_paragon_wings' },
          { type:'afterHeal', overhealShieldPct:0.20, cooldown:12000 },
        ]
      }
    },
    warlock: {
      2: {
        4: [
          { type:'onCrit', chance:18, cooldown:8000, auraKey:'warlock_dominion_darkSoul' },
          { type:'onKill', cooldown:10000, nextSkillCrit:1, auraKey:'warlock_paragon_demonArmor' },
        ]
      },
      3: {
        2: [
          { type:'onCrit', chance:15, dotBonusPct:0.40 },
        ],
        4: [
          { type:'lowHp', threshold:0.35, cooldown:25000, auraKey:'warlock_paragon_demonArmor' },
          { type:'afterSkill', skill:'wl_chaosBolt', dotBonusDmgPct:0.30, cooldown:12000 },
        ]
      }
    },
    druid: {
      2: {
        4: [
          { type:'onCrit', chance:15, cooldown:8000, auraKey:'druid_dominion_eclipse' },
          { type:'onCrit', chance:12, cooldown:20000, healPct:0.04 },
        ]
      },
      3: {
        2: [
          { type:'onHit', chance:12, cooldown:6000, dotPct:0.12, dotMs:6000 },
        ],
        4: [
          { type:'lowHp', threshold:0.35, cooldown:25000, auraKey:'druid_paragon_bearform' },
          { type:'onKill', cooldown:12000, nextSkillCrit:1, auraKey:'druid_paragon_bearform' },
        ]
      }
    },
  };
  // 套装触发产生的临时光环
  const SET_AURAS = {
    warrior_dominion_fury:      { icon:'⚔️', name:'战场主宰', desc:'攻击+20%·暴伤+25%', duration:6000, mod:{ atkPct:20, critdPct:25 } },
    warrior_paragon_fortitude:  { icon:'🛡️', name:'不灭战魂', desc:'减伤30%·防御+25%', duration:8000, mod:{ defPct:25 }, dr:0.30 },
    mage_dominion_ignite:       { icon:'🔥', name:'烈焰蔓延', desc:'攻击+18%·持续伤害+30%', duration:6000, mod:{ atkPct:18, dotBonus:30 } },
    mage_paragon_haste:         { icon:'💨', name:'奥术急流', desc:'攻速+25%·技能冷却-20%', duration:6000, mod:{ spdPct:25, cdReduction:20 } },
    mage_paragon_iceblock:      { icon:'🧊', name:'冰霜壁垒', desc:'减伤30%·防御+22%', duration:8000, mod:{ defPct:22 }, dr:0.30 },
    priest_dominion_holy:       { icon:'✨', name:'圣光回响', desc:'治疗+25%·全能+10', duration:6000, mod:{ healBonus:25, vers:10 } },
    priest_paragon_guard:       { icon:'🛡️', name:'神圣庇佑', desc:'防御+20%·回复+8', duration:8000, mod:{ defPct:20, regFlat:8 } },
    rogue_dominion_dance:       { icon:'🔪', name:'剑刃狂舞', desc:'攻击+18%·暴击+12', duration:6000, mod:{ atkPct:18, crit:12 } },
    hunter_dominion_pack:       { icon:'🐾', name:'群狼狂潮', desc:'攻击+20%·攻速+18%', duration:6000, mod:{ atkPct:20, spdPct:18 } },
    hunter_paragon_snipe:       { icon:'🎯', name:'狙击姿态', desc:'攻击+25%·暴伤+30%', duration:5000, mod:{ atkPct:25, critdPct:30 } },
    shaman_dominion_maelstrom:  { icon:'🌀', name:'漩涡奔涌', desc:'攻击+18%·暴击+12', duration:6000, mod:{ atkPct:18, crit:12 } },
    shaman_paragon_ancestral:   { icon:'👻', name:'先祖守护', desc:'防御+22%·回复+6', duration:8000, mod:{ defPct:22, regFlat:6 } },
    paladin_dominion_retribution:{ icon:'⚖️', name:'制裁烈焰', desc:'攻击+22%·暴伤+24%', duration:6000, mod:{ atkPct:22, critdPct:24 } },
    paladin_paragon_wings:      { icon:'😇', name:'复仇之翼', desc:'攻击+25%·暴击+15·全能+8', duration:6000, mod:{ atkPct:25, crit:15, vers:8 } },
    warlock_dominion_darkSoul:  { icon:'👁️', name:'黑暗灵魂', desc:'暴击+20·暴伤+38', duration:6000, mod:{ crit:20, critdPct:38 } },
    warlock_paragon_demonArmor: { icon:'😈', name:'恶魔甲壳', desc:'防御+25%·吸血+10', duration:8000, mod:{ defPct:25, leech:10 } },
    druid_dominion_eclipse:     { icon:'🌙', name:'星火连辉', desc:'攻击+18%·暴击+12%·Dot+18%', duration:6000, mod:{ atkPct:18, crit:12, dotBonus:18 } },
    druid_paragon_bearform:     { icon:'🐻', name:'巨熊形态', desc:'防御+30%·生命+20%', duration:8000, mod:{ defPct:30, hpPct:20 } },
  };
  function getSetTierIndexFromKey(setKey) {
    if (!setKey || typeof setKey !== 'string') return 0;
    for (const band of SET_STAGE_BANDS) { if (setKey.includes(':'+band.key+':')) return band.power; }
    return 0;
  }
  function getSetClassKeyFromKey(setKey) {
    if (!setKey || typeof setKey !== 'string') return '';
    for (const clsKey of Object.keys(SET_EFFECTS)) { if (setKey.includes(':'+clsKey)) return clsKey; }
    return '';
  }
  // 收集已激活套装的触发效果
  globalThis.collectSetTriggers = function collectSetTriggers() {
    const counts = getEquippedSetCounts();
    const triggers = [];
    for (const [setKey, info] of Object.entries(counts)) {
      const tierIdx = getSetTierIndexFromKey(setKey);
      if (tierIdx < 2) continue; // 仅统御和巅峰
      const clsKey = getSetClassKeyFromKey(setKey);
      const classTriggers = SET_TRIGGERS[clsKey];
      if (!classTriggers) continue;
      const tierTriggers = classTriggers[tierIdx];
      if (!tierTriggers) continue;
      for (const [piecesKey, triggerList] of Object.entries(tierTriggers)) {
        const needPieces = parseInt(piecesKey);
        if (isNaN(needPieces)) continue;
        if (info.count >= needPieces) {
          for (const trigger of triggerList) {
            triggers.push(Object.assign({ _source:'set', _setKey:setKey, _setName:info.name || '' }, trigger));
          }
        }
      }
    }
    return triggers;
  };
  // 应用套装触发的光环
  globalThis.applySetAura = function applySetAura(key) {
    const aura = SET_AURAS[key];
    if (!aura) return;
    if (!state.talentAuras) state.talentAuras = {};
    state.talentAuras[key] = Date.now() + (aura.duration || 6000);
    log(`🛡️ 套装触发: ${aura.icon}${aura.name}`, 'epic');
    if (typeof recomputeStats === 'function') recomputeStats();
    if (typeof markDirty === 'function') markDirty('hero');
  };

  const REP_LINES = {
    '联盟': [
      { rep:1000, reward:{ gold:2000, gem:5 }, label:'军需补给' },
      { rep:5000, reward:{ tickets:1, essence:6 }, label:'前线军令' },
      { rep:15000, reward:{ compTickets:1, gem:15 }, label:'荣耀嘉奖' },
      { rep:40000, reward:{ mount:'sabertooth' }, label:'骑兵通行' },
    ],
    '部落': [
      { rep:1000, reward:{ gold:2000, honor:150 }, label:'战团补给' },
      { rep:5000, reward:{ tickets:1, essence:6 }, label:'酋长号令' },
      { rep:15000, reward:{ compTickets:1, gem:15 }, label:'氏族凯歌' },
      { rep:40000, reward:{ mount:'kodo' }, label:'战兽赐名' },
    ],
    '中立': [
      { rep:1000, reward:{ gold:1800, gem:4 }, label:'自由商路' },
      { rep:5000, reward:{ essence:8, honor:200 }, label:'行会担保' },
      { rep:15000, reward:{ tickets:1, compTickets:1 }, label:'中立密约' },
      { rep:40000, reward:{ gem:25, essence:18 }, label:'大商会授勋' },
    ],
    '外域': [
      { rep:1000, reward:{ gold:2400, essence:4 }, label:'裂隙勘探' },
      { rep:5000, reward:{ gem:8, honor:250 }, label:'要塞补给' },
      { rep:15000, reward:{ compTickets:1, essence:10 }, label:'远征委任' },
      { rep:40000, reward:{ mount:'shadowHawk' }, label:'虚空飞骑' },
    ],
    '诺森德': [
      { rep:1000, reward:{ gold:2600, essence:4 }, label:'前哨军械' },
      { rep:5000, reward:{ gem:10, honor:260 }, label:'北境军报' },
      { rep:15000, reward:{ tickets:1, compTickets:1 }, label:'寒锋授印' },
      { rep:40000, reward:{ mount:'protoDrake' }, label:'龙眠军衔' },
    ],
  };

  const RARE_ELITES = [
    { key:'riverpaw_howl', name:'河爪头目·咆爪', mapKey:'elwynn', emoji:'🐺', lvl:18, desc:'擅长呼朋引伴的河爪头目。', hpMul:4.5, atkMul:1.8, defMul:1.3, rewards:{ gold:1200, gem:1, honor:20, essence:1 }, mountKey:'horse_chestnut' },
    { key:'duskfang_alpha', name:'夜牙之王', mapKey:'duskwood', emoji:'🐺', lvl:32, desc:'暮色森林边缘最危险的巨狼。', hpMul:5.8, atkMul:2.1, defMul:1.4, rewards:{ gold:2800, gem:2, honor:40, essence:2 }, mountKey:'wolf_black' },
    { key:'ironbark_ancient', name:'铁根古树', mapKey:'ashenvale', emoji:'🌲', lvl:42, desc:'会用根须缠绕猎物的远古树人。', hpMul:6.2, atkMul:2.2, defMul:1.6, rewards:{ gold:4200, gem:3, honor:65, essence:2 }, mountKey:'stag_emerald' },
    { key:'sandstalker', name:'沙行者女王', mapKey:'tanaris', emoji:'🦂', lvl:52, desc:'徘徊在塔纳利斯风沙中的巨型毒蝎。', hpMul:7.0, atkMul:2.4, defMul:1.6, rewards:{ gold:6500, gem:4, honor:90, essence:3 }, mountKey:'strider_sand' },
    { key:'blackrock_devastator', name:'黑石毁灭者', mapKey:'burningsteppes', emoji:'🦖', lvl:61, desc:'披着黑铁护甲的熔岩巨兽。', hpMul:8.4, atkMul:2.8, defMul:1.9, rewards:{ gold:9000, gem:5, honor:140, essence:4 }, mountKey:'drake_ember' },
    { key:'frostmaw', name:'霜喉巨熊', mapKey:'stormpeaks', emoji:'🐻', lvl:74, desc:'盘踞在雪峰之上的冰霜巨熊。', hpMul:9.2, atkMul:3.0, defMul:2.0, rewards:{ gold:12000, gem:7, honor:200, essence:5 }, mountKey:'bear_frost' },
  ];

  const BOUNTY_REWARDS = {
    easy:{ gold:2800, gem:2, honor:40, essence:2 },
    mid:{ gold:5200, gem:4, honor:80, essence:3 },
    hard:{ gold:8600, gem:6, honor:140, essence:5, compTickets:1 },
  };
  const DUNGEON_MOUNT_DROPS = {
    stratholme:{ key:'deathcharger', chance:0.012 },
    karazhan:{ key:'midnight_steed', chance:0.009 },
    oculus:{ key:'azure_drake', chance:0.01 },
    icc:{ key:'ice_bone_raptor', chance:0.006 },
  };

  const EXTRA_MOUNTS = [
    { key:'horse_chestnut', name:'栗色军马', icon:'🐴', tier:'uncommon', faction:'alliance', mod:{ spdPct:7, hpPct:3 }, src:'稀有精英: 河爪头目·咆爪（极低概率）' },
    { key:'wolf_black', name:'黑鬃战狼', icon:'🐺', tier:'uncommon', faction:'horde', mod:{ spdPct:8, atkPct:3 }, src:'稀有精英: 夜牙之王（极低概率）' },
    { key:'stag_emerald', name:'翠角夜鹿', icon:'🦌', tier:'rare', mod:{ spdPct:10, vers:4 }, src:'稀有精英: 铁根古树（极低概率）' },
    { key:'strider_sand', name:'流沙陆行鸟', icon:'🦤', tier:'rare', mod:{ spdPct:10, crit:3, haste:3 }, src:'稀有精英: 沙行者女王（极低概率）' },
    { key:'drake_ember', name:'余烬幼龙', icon:'🐉', tier:'epic', mod:{ spdPct:14, atkPct:6, critdPct:5 }, src:'稀有精英: 黑石毁灭者（极低概率）' },
    { key:'bear_frost', name:'霜鬃战熊', icon:'🐻', tier:'epic', mod:{ spdPct:12, hpPct:10, defPct:5 }, src:'稀有精英: 霜喉巨熊（极低概率）' },
    { key:'deathcharger', name:'死亡军马', icon:'🐴', tier:'epic', mod:{ spdPct:15, atkPct:5, leech:3 }, src:'斯坦索姆尾王低概率掉落' },
    { key:'midnight_steed', name:'午夜梦魇战马', icon:'🐎', tier:'epic', mod:{ spdPct:16, critdPct:6, vers:4 }, src:'卡拉赞低概率掉落' },
    { key:'azure_drake', name:'碧蓝幼龙', icon:'🐉', tier:'epic', mod:{ spdPct:16, mastery:8, atkPct:4 }, src:'魔环低概率掉落' },
    { key:'ice_bone_raptor', name:'冰骨迅猛龙', icon:'🦖', tier:'legend', mod:{ spdPct:18, atkPct:8, hpPct:8, crit:5 }, src:'冰冠堡垒低概率掉落' },
  ];

  function ensureMidgameState() {
    if (typeof account === 'undefined' || !account) return;
    if (!account.repLineClaims) account.repLineClaims = {};
    if (!state.bounties) state.bounties = { resetAt:0, tasks:[] };
    if (!state.rareEliteKills) state.rareEliteKills = {};
  }

  function setBandForDungeon(dg) {
    if (!dg || dg.epicRaid || dg.reqLvl < 20) return null;
    return SET_STAGE_BANDS.find(b => dg.reqLvl >= b.min && dg.reqLvl <= b.max) || null;
  }
  function setTierIndex(dg) {
    const band = setBandForDungeon(dg);
    return band ? SET_STAGE_BANDS.findIndex(b => b.key === band.key) : -1;
  }
  function setLabelForClass(clsKey, tierIndex) {
    const labels = SET_CLASS_LABELS[clsKey] || SET_CLASS_LABELS.warrior;
    return labels[Math.max(0, Math.min(labels.length - 1, tierIndex))];
  }
  function dungeonSetKey(dungeonKey, clsKey) {
    const baseKey = typeof baseDungeonKey === 'function' ? baseDungeonKey(dungeonKey) : dungeonKey;
    return `set:${baseKey}:${clsKey}`;
  }
  function makeDungeonSetEffects(dg, clsKey) {
    const tierIndex = Math.max(0, setTierIndex(dg));
    const scale = (dg?.epicRaid ? 6 : dg?.type === 'raid' ? 4 : tierIndex * 2);
    const base = SET_EFFECTS[clsKey] || SET_EFFECTS.warrior;
    return base.map(entry => {
      const out = { pieces: entry.pieces, mod:{} };
      for (const [k, v] of Object.entries(entry.mod || {})) out.mod[k] = v + (entry.pieces === 4 ? scale : Math.floor(scale / 2));
      return out;
    });
  }
  function makeDungeonSetItem(dg, bossName, clsKey) {
    const bosses = dg.bosses || [];
    const bossIndex = Math.max(0, bosses.findIndex(b => b.name === bossName));
    const tierIndex = Math.max(0, setTierIndex(dg));
    const slot = SET_SLOTS[bossIndex % SET_SLOTS.length];
    const setName = setLabelForClass(clsKey, tierIndex);
    return {
      name:`${setName}${SET_SLOT_LABELS[slot] || SLOT_INFO[slot]?.label || slot}`,
      slot,
      rarity: dg.type === 'raid' ? 'epic' : (tierIndex >= 2 ? 'epic' : 'rare'),
      dropWeight: dg.type === 'raid' ? 26 : 20,
      setKey:dungeonSetKey(dg.key, clsKey),
      setName,
      setPieces:SET_SLOTS.length,
      setEffects:makeDungeonSetEffects(dg, clsKey),
      stats:(function buildSetStats() {
        const primary = CLASSES[clsKey]?.attackAttr || 'str';
        const support = ['mage','priest','warlock','shaman'].includes(clsKey) ? 'spi' : (clsKey === 'rogue' || clsKey === 'hunter' ? 'agi' : 'sta');
        const stats = {
          helmet:{ def:2, [primary]:2, sta:2 },
          shoulder:{ atk:2, [primary]:2, sta:1 },
          armor:{ def:3, [primary]:2, sta:2 },
          gloves:{ atk:2, [primary]:2, sta:1 },
        }[slot] || { atk:2, [primary]:2, sta:1 };
        if (support !== primary) stats[support] = (stats[support] || 0) + 1;
        return stats;
      })(),
    };
  }

  function getEquippedSetCounts() {
    const counts = {};
    for (const slot of SLOT_ORDER) {
      const it = state?.equipped?.[slot];
      if (!it?.setKey) continue;
      if (!counts[it.setKey]) counts[it.setKey] = { count:0, name:it.setName || it.setKey, effects:it.setEffects || [], pieces:it.setPieces || 0, items:[] };
      counts[it.setKey].count += 1;
      counts[it.setKey].items.push(it.name);
      if ((!counts[it.setKey].effects || !counts[it.setKey].effects.length) && it.setEffects) counts[it.setKey].effects = it.setEffects;
      if (!counts[it.setKey].pieces && it.setPieces) counts[it.setKey].pieces = it.setPieces;
    }
    return counts;
  }
  function getActiveSetBonuses() {
    const counts = getEquippedSetCounts();
    const active = [];
    for (const [setKey, info] of Object.entries(counts)) {
      for (const effect of info.effects || []) {
        const on = info.count >= effect.pieces;
        active.push({
          setKey,
          setName:info.name,
          pieces:effect.pieces,
          active:on,
          count:info.count,
          mod:Object.assign({}, effect.mod || {}),
          desc:Object.entries(effect.mod || {}).map(([k, v]) => fmtMod(k, v)).join(' · '),
        });
      }
    }
    return active;
  }
  function collectSetBonusMod() {
    const out = { atkPct:0, hpPct:0, defPct:0, spdPct:0, critdPct:0, crit:0, regFlat:0, leech:0, vers:0, mastery:0, haste:0, cdReduction:0, extraAtk:0, healBonus:0, dotBonus:0, costReduction:0, executeBonus:0, reflectDmg:0 };
    for (const bonus of getActiveSetBonuses()) {
      if (!bonus.active) continue;
      for (const [k, v] of Object.entries(bonus.mod || {})) out[k] = (out[k] || 0) + v;
    }
    return out;
  }
  function renderSetPanelHtml() {
    const counts = getEquippedSetCounts();
    const entries = Object.values(counts);
    if (!entries.length) return '<div class="muted" style="font-size:11px">未装备套装部件</div><div class="muted" style="font-size:10px;margin-top:4px">套装在 2 件 / 4 件时会激活额外特效，中期副本和后期团本都能围绕它做成长路线。</div>';
    const totalMod = collectSetBonusMod();
    const summary = Object.entries(totalMod)
      .filter(([, v]) => !!v)
      .map(([k, v]) => fmtMod(k, v))
      .join(' · ');
    return entries.map(info => {
      const effects = (info.effects || []).map(effect => {
        const on = info.count >= effect.pieces;
        const desc = Object.entries(effect.mod || {}).map(([k, v]) => fmtMod(k, v)).join(' · ');
        return `<div class="${on?'pos':'muted'}" style="font-size:10px;margin-top:2px">${on?'✓':'○'} ${effect.pieces}件: ${desc}</div>`;
      }).join('');
      const itemLines = (info.items || []).map(name => `<span class="pill" style="font-size:10px">${name}</span>`).join(' ');
      return `<div style="border:1px solid var(--border);border-radius:8px;padding:6px;background:var(--panel-2);margin-top:4px">
        <div style="font-weight:700">${info.name} <span class="muted" style="font-size:10px">(${info.count}/${info.pieces || 4})</span></div>
        <div class="muted" style="font-size:10px;margin-top:3px;line-height:1.5">已装备: ${itemLines || '—'}</div>
        ${effects}
      </div>`;
    }).join('') + (summary ? `<div style="margin-top:6px;padding:6px 8px;border:1px solid rgba(74,222,128,.22);border-radius:8px;background:rgba(34,197,94,.08);font-size:10px;line-height:1.5"><b style="color:#86efac">当前生效总览</b><div class="muted" style="margin-top:2px">${summary}</div></div>` : '');
  }

  function repLineKey(fac, repReq) { return `${fac}:${repReq}`; }
  function claimReputationLine(fac, repReq) {
    ensureMidgameState();
    const rep = (account.reputation?.[fac] || 0);
    const line = (REP_LINES[fac] || []).find(x => x.rep === repReq);
    if (!line) { log('未找到声望奖励', 'bad'); return false; }
    if (rep < repReq) { log('声望不足', 'bad'); return false; }
    const key = repLineKey(fac, repReq);
    if (account.repLineClaims[key]) { log('该声望奖励已领取', 'bad'); return false; }
    account.repLineClaims[key] = true;
    const r = line.reward || {};
    if (r.gold) state.gold += r.gold;
    if (r.gem) state.gem += r.gem;
    if (r.honor) state.honor += r.honor;
    if (r.essence) state.essence += r.essence;
    if (r.tickets) state.tickets += r.tickets;
    if (r.compTickets) state.compTickets += r.compTickets;
    if (r.mount && typeof mountGrant === 'function') mountGrant(r.mount);
    log(`🎖️ 领取 ${fac} 声望线奖励: ${line.label}`,'legend');
    if (typeof recomputeStats === 'function') recomputeStats();
    if (typeof markDirty === 'function') markDirty('progression','hero','inventory');
    return true;
  }
  function renderRepLineRewardsHtml(fac, rep) {
    const lines = REP_LINES[fac] || [];
    if (!lines.length) return '';
    return `<div style="margin-top:6px;display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:4px">${
      lines.map(line => {
        const key = repLineKey(fac, line.rep);
        const done = !!account.repLineClaims?.[key];
        const ready = rep >= line.rep && !done;
        const rewards = [];
        if (line.reward.gold) rewards.push(`${line.reward.gold}💰`);
        if (line.reward.gem) rewards.push(`${line.reward.gem}💎`);
        if (line.reward.honor) rewards.push(`${line.reward.honor}🏅`);
        if (line.reward.essence) rewards.push(`${line.reward.essence}✨`);
        if (line.reward.tickets) rewards.push(`${line.reward.tickets}🎫`);
        if (line.reward.compTickets) rewards.push(`${line.reward.compTickets}🐾`);
        if (line.reward.mount) {
          const mm = (typeof MOUNTS !== 'undefined') ? MOUNTS.find(x => x.key === line.reward.mount) : null;
          rewards.push(mm ? mm.name : '坐骑');
        }
        return `<div style="border:1px solid ${ready?'var(--accent)':'var(--border)'};border-radius:8px;padding:6px;background:${done?'rgba(34,197,94,.08)':'var(--panel-2)'}">
          <div style="font-size:11px;font-weight:700">${line.label}</div>
          <div class="muted" style="font-size:10px">${line.rep} 声望</div>
          <div class="muted" style="font-size:10px;line-height:1.45;margin:4px 0">${rewards.join(' · ')}</div>
          ${done ? '<span class="muted" style="font-size:10px">✓ 已领取</span>' : (ready ? `<button class="gold" data-action="claimrepline" data-fac="${fac}" data-rep="${line.rep}" style="width:100%;font-size:11px">领取</button>` : `<span class="muted" style="font-size:10px">未达成</span>`)}
        </div>`;
      }).join('')
    }</div>`;
  }

  function stageBossGateInfo() {
    if (typeof currentXpGate === 'function') return currentXpGate();
    return null;
  }

  function ensureBounties() {
    ensureMidgameState();
    const now = Date.now();
    if (state.bounties.resetAt && now < state.bounties.resetAt && state.bounties.tasks?.length) return;
    const pool = RARE_ELITES.filter(x => x.lvl <= Math.max(30, state.hero.lvl + 10));
    const picked = [];
    const copy = pool.slice();
    while (copy.length && picked.length < 3) {
      const idx = Math.floor(Math.random() * copy.length);
      picked.push(copy.splice(idx, 1)[0]);
    }
    state.bounties.tasks = picked.map((elite, idx) => ({
      key:`${elite.key}:${now}`,
      rareKey:elite.key,
      name:`悬赏：击败 ${elite.name}`,
      goal:1,
      cur:0,
      claimed:false,
      reward:idx === 0 ? BOUNTY_REWARDS.easy : (idx === 1 ? BOUNTY_REWARDS.mid : BOUNTY_REWARDS.hard),
    }));
    const d = new Date();
    d.setHours(0,0,0,0);
    state.bounties.resetAt = d.getTime() + 24 * 3600 * 1000;
  }
  function claimBounty(idx) {
    ensureBounties();
    const t = state.bounties.tasks?.[idx];
    if (!t) return false;
    if (t.claimed || t.cur < t.goal) return false;
    t.claimed = true;
    const r = t.reward || {};
    if (r.gold) state.gold += r.gold;
    if (r.gem) state.gem += r.gem;
    if (r.honor) state.honor += r.honor;
    if (r.essence) state.essence += r.essence;
    if (r.compTickets) state.compTickets += r.compTickets;
    log(`📜 完成悬赏: ${t.name}`,'good');
    if (typeof markDirty === 'function') markDirty('events','hero');
    return true;
  }
  function onRareEliteBountyKill(key) {
    ensureBounties();
    for (const task of state.bounties.tasks || []) {
      if (task.rareKey !== key || task.claimed) continue;
      task.cur = task.goal;
      log(`✅ 悬赏完成: ${task.name}`,'good');
    }
    if (typeof markDirty === 'function') markDirty('events');
  }

  function buildRareEliteMonster(def) {
    const hpBase = Math.floor((100 + def.lvl * def.lvl * 6.5) * def.hpMul);
    const atkBase = Math.floor((9 + def.lvl * 3.0) * def.atkMul);
    return {
      name:`${def.emoji}${def.name}`,
      bossName:def.name,
      rareKey:def.key,
      isBoss:true,
      isRareElite:true,
      lvl:def.lvl,
      hpMax:hpBase,
      hp:hpBase,
      atk:atkBase,
      def:Math.floor((3 + def.lvl * 1.2) * def.defMul),
      baseGold:def.rewards.gold / 20,
      baseXp:Math.floor(def.lvl * 8),
      goldReward:def.rewards.gold,
      honorReward:def.rewards.honor,
      dropRate:1,
      gemChance:0.25,
      maxRarity:def.lvl >= 60 ? 'epic' : 'rare',
      _uid:Date.now() + Math.floor(Math.random() * 1000),
      _dots:{},
      _dotLegacyImported:true,
      _lastDotTick:0,
      instantCast:true,
      _monSupportSkills:typeof buildMonsterSupportPool === 'function'
        ? buildMonsterSupportPool(def.name, null, def.lvl, true, 1)
        : [],
      _supportSkillCooldowns:{},
      _lastSupportSkill:Date.now() - 3000,
      _nextTrickAt:Date.now() + 9000,
      _lastTrick:0,
      skills:def.skills || [],
    };
  }

  function challengeRareElite(key) {
    ensureBounties();
    const def = RARE_ELITES.find(x => x.key === key);
    if (!def) return;
    if (state.mode === 'travel') { log('正在旅行中', 'bad'); return; }
    if (state.mode !== 'world') { log('请先结束当前战斗', 'bad'); return; }
    if (state.hero.lvl < Math.max(1, def.lvl - 4)) { log(`需要等级 Lv.${Math.max(1, def.lvl - 4)}+`, 'bad'); return; }
    state.mode = 'worldboss';
    state._currentRareElite = key;
    state.currentMonsters = [buildRareEliteMonster(def)];
    state.hp = state.hero.hpMax;
    state.resource = state.resourceMax;
    if (typeof resetDmgStats === 'function') resetDmgStats();
    if (typeof clearAllBuffs === 'function') clearAllBuffs();
    log(`🎯 发现稀有精英 [${def.name}]！`, 'epic');
    if (typeof markDirty === 'function') markDirty('events','stage');
  }
  function leaveRareEliteEncounter() {
    state.mode = 'world';
    state._currentRareElite = null;
    state.currentMonsters = [];
    if (typeof spawnMonster === 'function') spawnMonster();
  }
  function onRareEliteKill(mon) {
    const def = RARE_ELITES.find(x => x.key === mon.rareKey);
    if (!def) { leaveRareEliteEncounter(); return; }
    state.essence += def.rewards.essence || 0;
    state.gem += def.rewards.gem || 0;
    onRareEliteBountyKill(def.key);
    if (typeof midgameMountRollOnKill === 'function') midgameMountRollOnKill(mon);
    log(`🏹 击败稀有精英 ${def.name}！ +${def.rewards.gold}💰 +${def.rewards.gem || 0}💎 +${def.rewards.essence || 0}✨`, 'legend');
    leaveRareEliteEncounter();
    if (typeof markDirty === 'function') markDirty('events','hero','inventory');
  }

  function midgameMountRollOnKill(mon) {
    if (typeof mountGrant !== 'function') return;
    if (mon?.fromDungeon && mon.isBoss) {
      const dKey = (state.dungeonState || state.mythicState)?.key;
      const mountDrop = DUNGEON_MOUNT_DROPS[(typeof baseDungeonKey === 'function' ? baseDungeonKey(dKey) : dKey)];
      if (mountDrop && Math.random() < mountDrop.chance) mountGrant(mountDrop.key);
      return;
    }
    if (mon?.isRareElite) {
      const elite = RARE_ELITES.find(x => x.key === mon.rareKey);
      if (elite?.mountKey && Math.random() < 0.025) mountGrant(elite.mountKey);
      return;
    }
    if (state.mode === 'world' && !mon?.isBoss) {
      const mapPools = {
        elwynn:'horse_chestnut',
        duskwood:'wolf_black',
        ashenvale:'stag_emerald',
        tanaris:'strider_sand',
        burningsteppes:'drake_ember',
        stormpeaks:'bear_frost',
      };
      const mountKey = mapPools[state.currentMap];
      if (mountKey && Math.random() < 0.0006) mountGrant(mountKey);
    }
  }

  function normalizeCompanionLoadouts() {
    const genericByRole = {
      tank: [
        { name:'坚守', icon:'🛡️', desc:'8秒减伤并获得护盾', type:'buff', buff:'shield', buffTarget:'companion', shieldPct:0.10, duration:8000, cd:18 },
        { name:'反震猛击', icon:'🔨', desc:'3倍伤害并破甲', type:'dmg', mul:3, debuff:'sunder', sunderMs:12000, cd:10 },
        { name:'战地恢复', icon:'❤️', desc:'恢复16%生命', type:'heal', heal:0.16, healTarget:'companion', cd:18 },
        { name:'震地怒喝', icon:'📯', desc:'4倍伤害并减速', type:'dmg', mul:4, slow:true, slowMs:3500, cd:14 },
      ],
      heal: [
        { name:'治愈之光', icon:'✨', desc:'恢复18%生命', type:'heal', heal:0.18, healTarget:'smart', cleanse:true, cd:12 },
        { name:'神圣壁垒', icon:'🛡️', desc:'施加10%护盾', type:'buff', buff:'sacredShield', buffTarget:'hero', shieldPct:0.10, duration:8000, cd:16 },
        { name:'鼓舞祷言', icon:'🕊️', desc:'强化双方输出并少量回复', type:'buff', buff:'kings', buffTarget:'both', healPct:0.04, duration:9000, cd:20 },
        { name:'神圣震击', icon:'💫', desc:'3倍伤害并小幅治疗', type:'dmg', mul:3, heal:0.08, healTarget:'hero', cd:10 },
      ],
      dps: [
        { name:'致命打击', icon:'⚔️', desc:'3倍伤害', type:'dmg', mul:3, cd:8 },
        { name:'裂伤', icon:'🩸', desc:'3倍伤害并流血', type:'dmg', mul:3, dotPct:0.10, dotMs:6000, cd:10 },
        { name:'猎杀本能', icon:'💢', desc:'10秒提升攻速与攻击', type:'buff', buff:'rapidFire', buffTarget:'companion', duration:10000, cd:20 },
        { name:'终结追击', icon:'☠️', desc:'4倍伤害,对残血目标更强', type:'dmg', mul:4, executeBonus:0.25, executeThreshold:0.35, cd:14 },
      ],
    };
    const qualitySkillAmp = { white:0.92, green:0.98, blue:1.05, purple:1.12, orange:1.2 };
    const defaultSig = {
      tank:{ mode:'passive', name:'守护本能', icon:'🛡️', desc:'持续强化自身生存并为主角补少量护盾', hpMul:1.04, defMul:1.04, shieldPctHero:0.02 },
      heal:{ mode:'passive', name:'援护回响', icon:'✨', desc:'持续为主角与随从提供微弱治疗', healPctHero:0.02, healPctComp:0.02 },
      dps:{ mode:'passive', name:'猎杀本色', icon:'⚔️', desc:'对Boss额外造成伤害并强化收割', bonusVsBoss:0.10, executeBonus:0.16, executeThreshold:0.35 },
    };
    for (const tpl of COMPANIONS) {
      tpl.skills = Array.isArray(tpl.skills) ? tpl.skills.slice(0, 5) : [];
      const pool = (genericByRole[tpl.role] || genericByRole.dps).map(x => Object.assign({}, x));
      const names = new Set(tpl.skills.map(x => x.name));
      while (tpl.skills.length < 5 && pool.length) {
        const pick = pool.shift();
        if (names.has(pick.name)) continue;
        names.add(pick.name);
        tpl.skills.push(pick);
      }
      if (!tpl.signature) tpl.signature = Object.assign({}, defaultSig[tpl.role] || defaultSig.dps);
      const amp = qualitySkillAmp[tpl.quality] || 1;
      tpl.skills = tpl.skills.map(sk => {
        const out = Object.assign({}, sk);
        if (typeof out.mul === 'number') out.mul = +(out.mul * amp).toFixed(1);
        if (typeof out.heal === 'number') out.heal = +(out.heal * Math.min(1.12, amp)).toFixed(3);
        if (typeof out.healPct === 'number') out.healPct = +(out.healPct * Math.min(1.12, amp)).toFixed(3);
        if (typeof out.dotPct === 'number') out.dotPct = +(out.dotPct * amp).toFixed(3);
        if (typeof out.shieldPct === 'number') out.shieldPct = +(out.shieldPct * Math.min(1.12, amp)).toFixed(3);
        return out;
      });
    }
  }

  function renderBountySub() {
    ensureBounties();
    const cd = Math.max(0, Math.ceil((state.bounties.resetAt - Date.now()) / 1000));
    const availableElites = RARE_ELITES.filter(x => x.lvl <= state.hero.lvl + 8);
    let html = `<div class="prog-summary muted">悬赏与稀有精英每日刷新 · 剩余 <b>${typeof fmtCd === 'function' ? fmtCd(cd) : cd + 's'}</b></div>`;
    html += '<div class="daily-list">';
    for (const [idx, task] of (state.bounties.tasks || []).entries()) {
      const elite = RARE_ELITES.find(x => x.key === task.rareKey);
      const btn = task.claimed
        ? '<span class="muted">✓已领</span>'
        : task.cur >= task.goal
          ? `<button class="gold" data-action="claimbounty" data-idx="${idx}">领取</button>`
          : `<button class="danger" data-action="challengerare" data-key="${task.rareKey}">挑战目标</button>`;
      const rw = task.reward || {};
      html += `<div class="daily-item ${task.claimed?'ach-claimed':(task.cur>=task.goal?'ach-ready':'')}">
        <div class="daily-main">
          <div class="daily-name">${elite?.emoji || '🎯'} ${task.name}</div>
          <div class="muted" style="font-size:10px">${elite?.desc || ''}</div>
          <div class="muted" style="font-size:10px">${rw.gold||0}💰 ${rw.gem||0}💎 ${rw.honor||0}🏅 ${rw.essence||0}✨ ${rw.compTickets||0}🐾</div>
        </div>
        <div class="daily-act">${btn}</div>
      </div>`;
    }
    html += '</div><div class="detail-label" style="margin-top:8px">稀有精英</div><div class="wb-list">';
    for (const elite of availableElites) {
      const mountTxt = elite.mountKey ? ((MOUNTS.find(x => x.key === elite.mountKey)?.name) || '坐骑') : '';
      html += `<div class="wb-item" style="border-left:4px solid rgba(168,85,247,.7)">
        <div class="wb-main">
          <div class="wb-name">${elite.emoji} ${elite.name} <span class="muted" style="font-size:10px">Lv.${elite.lvl}</span></div>
          <div class="muted" style="font-size:11px">${elite.desc}</div>
          <div class="muted" style="font-size:10px;margin-top:2px">奖励: ${elite.rewards.gold}💰 ${elite.rewards.gem}💎 ${elite.rewards.essence}✨${mountTxt?` · 极低概率坐骑:${mountTxt}`:''}</div>
        </div>
        <div class="wb-act"><button class="danger" data-action="challengerare" data-key="${elite.key}">挑战</button></div>
      </div>`;
    }
    html += '</div>';
    return html;
  }

  function installMountContent() {
    if (typeof MOUNTS === 'undefined') return;
    for (const mount of EXTRA_MOUNTS) {
      if (!MOUNTS.find(x => x.key === mount.key)) MOUNTS.push(mount);
    }
  }

  const _baseGetDungeonBossLoot = globalThis.getDungeonBossLoot;
  globalThis.getDungeonBossLoot = function(dungeonKey, bossName, clsKey, options) {
    const pool = ((typeof _baseGetDungeonBossLoot === 'function' ? _baseGetDungeonBossLoot(dungeonKey, bossName, clsKey, options) : []) || []).map(it => Object.assign({}, it));
    const dg = (typeof getDungeonDef === 'function') ? getDungeonDef(typeof baseDungeonKey === 'function' ? baseDungeonKey(dungeonKey) : dungeonKey) : null;
    if (!dg || !bossName) return pool;
    const classKey = currentLootClassKey(clsKey);
    for (const it of pool) {
      if (it.setKey && !it.setEffects) {
        it.setPieces = it.setPieces || SET_SLOTS.length;
        it.setEffects = makeDungeonSetEffects(dg, classKey);
      }
    }
    if (dg.epicRaid) return pool;
    const band = setBandForDungeon(dg);
    if (!band) return pool;
    const setItem = makeDungeonSetItem(dg, bossName, classKey);
    const rarityKey = options?.rarityKey;
    if (rarityKey && typeof lootRarityRank === 'function' && lootRarityRank(setItem.rarity) > lootRarityRank(rarityKey) && !options?.exactRarity) return pool;
    if (rarityKey && options?.exactRarity && setItem.rarity !== rarityKey) return pool;
    return pool.concat([setItem]);
  };

  const _recomputeStats = globalThis.recomputeStats;
  globalThis.recomputeStats = function() {
    _recomputeStats();
    if (!state?.hero) return;
    // 套装属性加成
    const mod = collectSetBonusMod();
    // 幻象挑战能力加成
    let rlMod = {};
    if (typeof globalThis.collectRoguelikeMod === 'function') {
      rlMod = globalThis.collectRoguelikeMod();
    }
    // 合并
    const allMod = {};
    for (const [k, v] of Object.entries(mod)) allMod[k] = (allMod[k] || 0) + v;
    for (const [k, v] of Object.entries(rlMod)) allMod[k] = (allMod[k] || 0) + v;
    const src = {};
    const applyPct = (field, pct, srcKey) => {
      if (!pct) return;
      state.hero[field] = Math.max(1, Math.floor(state.hero[field] * (1 + pct / 100)));
      src[srcKey || `${field}Pct`] = pct;
    };
    applyPct('atk', allMod.atkPct || 0, 'atkPct');
    applyPct('def', allMod.defPct || 0, 'defPct');
    applyPct('hpMax', allMod.hpPct || 0, 'hpPct');
    if (allMod.spdPct) { state.hero.spd = Math.min(2.5, +(state.hero.spd * (1 + allMod.spdPct / 100)).toFixed(2)); src.spdPct = allMod.spdPct; }
    if (allMod.crit) { state.hero.crit = Math.min(90, state.hero.crit + allMod.crit); src.crit = allMod.crit; }
    if (allMod.critdPct) { state.hero.critd += allMod.critdPct; src.critdPct = allMod.critdPct; }
    if (allMod.regFlat) { state.hero.reg += allMod.regFlat; src.regFlat = allMod.regFlat; }
    if (allMod.leech) { state.hero.leech = Math.min(30, state.hero.leech + allMod.leech); src.leech = allMod.leech; }
    if (allMod.vers) { state.hero.vers = Math.min(40, state.hero.vers + allMod.vers); src.vers = allMod.vers; }
    if (allMod.mastery) { state.hero.mastery += allMod.mastery; src.mastery = allMod.mastery; }
    if (allMod.haste) { state.hero.haste = Math.min(50, (state.hero.haste || 0) + allMod.haste); src.haste = allMod.haste; }
    if (allMod.cdReduction) { state.hero.cdReduction = Math.min(40, (state.hero.cdReduction || 0) + allMod.cdReduction); src.cdReduction = allMod.cdReduction; }
    if (allMod.extraAtk) { state.hero.extraAtk = Math.min(25, (state.hero.extraAtk || 0) + allMod.extraAtk); src.extraAtk = allMod.extraAtk; }
    if (allMod.healBonus) { state.hero.healBonus = Math.min(50, (state.hero.healBonus || 0) + allMod.healBonus); src.healBonus = allMod.healBonus; }
    if (allMod.dotBonus) { state.hero.dotBonus = Math.min(50, (state.hero.dotBonus || 0) + allMod.dotBonus); src.dotBonus = allMod.dotBonus; }
    if (allMod.costReduction) { state.hero.costReduction = Math.min(30, (state.hero.costReduction || 0) + allMod.costReduction); src.costReduction = allMod.costReduction; }
    if (allMod.executeBonus) { state.hero.executeBonus = Math.min(40, (state.hero.executeBonus || 0) + allMod.executeBonus); src.executeBonus = allMod.executeBonus; }
    if (allMod.reflectDmg) { state.hero.reflectDmg = (state.hero.reflectDmg || 0) + allMod.reflectDmg; src.reflectDmg = allMod.reflectDmg; }
    state.hp = Math.min(state.hp, state.hero.hpMax);
    state.resourceMax = state.hero.mpMax;
    state.resource = Math.min(state.resource, state.resourceMax);
    // 存储套装触发效果供战斗钩子使用
    if (typeof globalThis.collectSetTriggers === 'function') {
      state._setFx = collectSetTriggers();
    }
    // 来源标注
    if (!state._statSources) state._statSources = {};
    if (Object.keys(src).length) state._statSources['套装+幻象'] = src;
    if (!state._statSources._total) state._statSources._total = {};
    for (const [k, v] of Object.entries(src)) state._statSources._total[k] = (state._statSources._total[k] || 0) + v;
  };

  const _ensureEventState = globalThis.ensureEventState;
  globalThis.ensureEventState = function() {
    _ensureEventState();
    ensureBounties();
  };
  const _onWorldBossKill = globalThis.onWorldBossKill;
  globalThis.onWorldBossKill = function(mon) {
    ensureMidgameState();
    const out = _onWorldBossKill(mon);
    if (typeof markDirty === 'function') markDirty('events','hero');
    return out;
  };

  const _renderEvents = globalThis.renderEvents;
  globalThis.renderEvents = function() {
    const root = $('tab-events'); if (!root) return;
    ensureEventState();
    checkDailyRollover();
    checkSeasonRollover();
    const head = `
      <div class="sub-tabs">
        <span class="sub-tab ${eventsSubTab==='wb'?'active':''}" data-sub="wb">🐲 世界Boss</span>
        <span class="sub-tab ${eventsSubTab==='bounty'?'active':''}" data-sub="bounty">🎯 悬赏</span>
        <span class="sub-tab ${eventsSubTab==='daily'?'active':''}" data-sub="daily">📅 日常</span>
        <span class="sub-tab ${eventsSubTab==='season'?'active':''}" data-sub="season">🏁 赛季</span>
      </div>`;
    let body = '';
    if (eventsSubTab === 'wb') body = renderWorldBossSub();
    else if (eventsSubTab === 'bounty') body = renderBountySub();
    else if (eventsSubTab === 'daily') body = renderDailySub();
    else body = renderSeasonSub();
    root.innerHTML = head + body;
    if (eventsSubTab === 'wb' && typeof bindWorldBossTooltips === 'function') bindWorldBossTooltips(root);
  };

  const _renderRepSubtab = globalThis.renderRepSubtab;
  globalThis.renderRepSubtab = function() {
    ensureMidgameState();
    const base = _renderRepSubtab();
    let html = `<div class="ascend-box" style="margin-top:8px">
      <div style="font-weight:bold">📜 声望奖励线</div>
      <div class="muted" style="font-size:11px;margin:3px 0 6px">每个阵营都有一条阶段奖励线,中期刷图时也会有更明确的推进目标。</div>`;
    for (const fac of Object.keys(REP_LINES)) {
      const rep = account.reputation?.[fac] || 0;
      html += `<div style="margin-top:6px">
        <div style="font-weight:700">${fac} · 当前 ${rep}</div>
        ${renderRepLineRewardsHtml(fac, rep)}
      </div>`;
    }
    html += '</div>';
    return base + html;
  };

  installMountContent();
  normalizeCompanionLoadouts();

  globalThis.getEquippedSetCounts = getEquippedSetCounts;
  globalThis.getActiveSetBonuses = getActiveSetBonuses;
  globalThis.collectSetBonusMod = collectSetBonusMod;
  globalThis.setBandForDungeon = setBandForDungeon;
  globalThis.setTierIndex = setTierIndex;
  globalThis.setLabelForClass = setLabelForClass;
  globalThis.RARE_ELITES = RARE_ELITES;
  globalThis.renderSetPanelHtml = renderSetPanelHtml;
  globalThis.claimReputationLine = claimReputationLine;
  globalThis.challengeRareElite = challengeRareElite;
  globalThis.claimBounty = claimBounty;
  globalThis.onRareEliteKill = onRareEliteKill;
  globalThis.leaveRareEliteEncounter = leaveRareEliteEncounter;
  globalThis.midgameMountRollOnKill = midgameMountRollOnKill;
})();
