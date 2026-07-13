/* =========================================================
   data.js — 所有静态数据(职业/地图/副本/装备/商店)
   ========================================================= */

const SAVE_KEY = 'idle_azeroth_save_v4';
const MAX_LEVEL = 80;
const XP_CURVE_MULT = 5.0;   // 升级所需经验倍率(放慢升级,目标满级≈19小时;越大越慢,可调)

const SLOT_ORDER = ['weapon','helmet','shoulder','armor','gloves','belt','pants','boots','ring','trinket'];
const SLOT_INFO = {
  weapon:   { label:'武器', icon:'⚔️', mainStat:'atk' },
  helmet:   { label:'头盔', icon:'⛑️', mainStat:'def' },
  shoulder: { label:'护肩', icon:'🦾', mainStat:'atk' },
  armor:    { label:'胸甲', icon:'🛡️', mainStat:'def' },
  gloves:   { label:'手套', icon:'🧤', mainStat:'crit' },
  belt:     { label:'腰带', icon:'🪢', mainStat:'def' },
  pants:    { label:'腿甲', icon:'👖', mainStat:'hp' },
  boots:    { label:'战靴', icon:'🥾', mainStat:'def' },
  ring:     { label:'戒指', icon:'💍', mainStat:'crit' },
  trinket:  { label:'饰品', icon:'📿', mainStat:'sta' },
};

const STAT_NAMES = {
  // 基础直接属性
  atk:'攻击', def:'防御', hp:'生命', crit:'暴击', critd:'暴伤',
  spd:'攻速', reg:'回复', mp:'法力', hpMax:'生命上限', mpMax:'法力上限',
  // 5 维度属性
  str:'力量', agi:'敏捷', int:'智力', spi:'精神', sta:'耐力',
  // 副属性
  leech:'吸血', vers:'全能', mastery:'精通', haste:'极速', dodge:'闪避',
  // 百分比类(显示时与基础同名,数值带 %)
  atkPct:'攻击', hpPct:'生命', defPct:'防御', spdPct:'攻速',
  critdPct:'暴伤', mpPct:'法力',
  strPct:'力量', agiPct:'敏捷', intPct:'智力', spiPct:'精神', staPct:'耐力',
  // 杂项加成
  cdReduction:'技能急速', costReduction:'节能',
  extraAtk:'额外攻击', healBonus:'治疗加成', dotBonus:'持续伤害',
  executeBonus:'斩杀加成', reflectDmg:'反伤',
  regFlat:'回复', buffDuration:'增益时长',
  // 觉醒倍率
  xpMult:'经验加成', goldMult:'金币加成', dropMult:'装备掉率',
};

/* 哪些 mod 的数值本身代表百分比(展示时自动带 %) */
const PERCENT_STATS = new Set([
  'atkPct','hpPct','defPct','spdPct','critdPct','mpPct',
  'strPct','agiPct','intPct','spiPct','staPct',
  'cdReduction','costReduction','extraAtk',
  'healBonus','dotBonus','executeBonus','reflectDmg',
  'crit','critd','vers','haste','dodge',
  'xpMult','goldMult','dropMult','buffDuration',
]);

function isPercentStat(k) { return PERCENT_STATS.has(k); }
function fmtStatName(k) { return STAT_NAMES[k] || k; }
/* 拼成 "+5% 额外攻击" 或 "+10 力量" */
function fmtMod(k, v) {
  const sign = (typeof v==='number' && v>0) ? '+' : '';
  const suf = isPercentStat(k) ? '%' : '';
  return `${sign}${v}${suf} ${fmtStatName(k)}`;
}

const RARITY = [
  { key:'common',  name:'普通', mult:1.0, weight:40, cls:'r-common',   bcls:'b-common' },
  { key:'uncommon',name:'优秀', mult:1.3, weight:35, cls:'r-uncommon', bcls:'b-uncommon' },
  { key:'rare',    name:'精良', mult:1.7, weight:18, cls:'r-rare',     bcls:'b-rare' },
  { key:'epic',    name:'史诗', mult:2.3, weight:6,  cls:'r-epic',     bcls:'b-epic' },
  { key:'legend',  name:'传说', mult:3.0, weight:1,  cls:'r-legend',   bcls:'b-legend' },
];

/* ---------- 阵营与种族 ---------- */
const FACTIONS = {
  alliance: { name:'联盟', icon:'🦁', color:'#3b82f6', desc:'为荣誉而战' },
  horde:    { name:'部落', icon:'🐺', color:'#ef4444', desc:'鲜血与雷鸣' },
};

const RACES = {
  human:    { name:'人类',   icon:'👨', faction:'alliance', desc:'暴风城的高贵子民',     bonus:{spi:2} },
  dwarf:    { name:'矮人',   icon:'🧔', faction:'alliance', desc:'铁炉堡的坚韧矿工',     bonus:{sta:2} },
  nightelf: { name:'暗夜精灵', icon:'🧝', faction:'alliance', desc:'泰达希尔的森林守护者', bonus:{agi:2} },
  gnome:    { name:'侏儒',   icon:'🧒', faction:'alliance', desc:'诺莫瑞根的机智发明家', bonus:{int:2} },
  draenei:  { name:'德莱尼', icon:'👽', faction:'alliance', desc:'埃索达的圣光降临者',   bonus:{int:1,spi:1} },
  orc:      { name:'兽人',   icon:'👹', faction:'horde',    desc:'奥格瑞玛的无畏勇士',   bonus:{str:2} },
  tauren:   { name:'牛头人', icon:'🐮', faction:'horde',    desc:'雷霆崖的和平守护者',   bonus:{sta:2} },
  undead:   { name:'亡灵',   icon:'💀', faction:'horde',    desc:'幽暗城的被遗忘者',     bonus:{spi:2} },
  troll:    { name:'巨魔',   icon:'🗿', faction:'horde',    desc:'森金村的暗影猎手',     bonus:{agi:2} },
  bloodelf: { name:'血精灵', icon:'🧝‍♂️', faction:'horde',    desc:'银月城的奥术魔导师',   bonus:{int:2} },
};

/* ---------- 9 个职业 ---------- */
const CLASSES = {
  warrior: {
    name:'战士', icon:'⚔️', emoji:'🛡️', color:'#c79c6e',
    desc:'板甲近战,以坚毅之力击溃敌人', primaryAttr:'力量',
    attackAttr:'str', resource:'怒气', resKey:'rage',
    baseAttrs:{str:22, agi:12, int:5, spi:8, sta:18},
    baseStats:{hpMax:80, mpMax:100, atk:8, def:6, crit:5, critd:150, spd:1.0, reg:1},
    skills:{
      interrupt:{name:"拳击",icon:"👊",desc:"打断首领施法，冷却5秒",mp:10,type:"interrupt",cd:5,unlockLvl:1},
      cleave:       {name:'顺劈斩', icon:'🗡️', desc:'造成3倍攻击伤害', mp:20, type:'dmg', mul:3, unlockLvl:1},
      thunderClap:  {name:'雷霆一击', icon:'⚡', desc:'2倍攻击,降低敌人攻速', mp:25, type:'dmg', mul:2, slow:true, unlockLvl:12},
      battleShout:  {name:'战斗怒吼', icon:'📯', desc:'15秒攻击+30%', mp:30, type:'buff', buff:'battleShout', duration:15000, unlockLvl:22},
      mortalStrike: {name:'致死打击', icon:'⚔️', desc:'3倍攻击,必定暴击', mp:32, type:'dmg', mul:3, alwaysCrit:true},
      bloodthirst:  {name:'嗜血', icon:'🩸', desc:'3倍攻击,吸血50%', mp:40, type:'dmg', mul:4, lifeSteal:0.5},
      execute:      {name:'斩杀', icon:'💀', desc:'5倍攻击,消耗所有怒气,每点怒气+1%伤害', mp:0, type:'dmg', mul:5, consumeRage:true, unlockLvl:42},
      sunderArmor:  {name:'破甲攻击', icon:'🔨', desc:'3倍攻击,降低敌人防御15秒', mp:28, type:'dmg', mul:3, debuff:'sunder', unlockLvl:30},
      sweepingStrikes:{name:'横扫攻击',icon:'🌀', desc:'5倍攻击,范围横扫', mp:45, type:'dmg', mul:5, unlockLvl:56},
      bladestorm:   {name:'剑刃风暴', icon:'🌪️', desc:'8倍攻击,毁灭旋风', mp:60, type:'dmg', mul:8, unlockLvl:72},
      shieldWall:   {name:'盾墙', icon:'🛡️', desc:'15秒受到伤害降低33%', mp:50, type:'buff', buff:'shield', duration:15000},
      shatteringThrow:{name:"碎裂投掷",icon:"🪓",desc:"4倍远程攻击,降低防御15秒",mp:35,type:"dmg",mul:4,unlockLvl:50},
      challengingShout:{name:"挑战怒吼",icon:"📯",desc:"10秒受到伤害降低33%,反伤+5%",mp:45,type:"buff",buff:"shield",duration:10000,unlockLvl:66},
    },
    trees:[
      {key:'arms', name:'武器', icon:'⚔️', masteryDesc:'致死打击伤害 +2%/精通', talents:[
        {key:'致命武器_9afo', name:'致命武器', desc:'攻击 +1%/层', max:5, mod:{atkPct:1}},
        {key:'残忍_s8po', name:'残忍', desc:'暴击 +1.5%/层', max:5, mod:{crit:1.5}},
        {key:'战术大师_awyh', name:'战术大师', desc:'技能冷却 +4%/层', max:3, mod:{cdReduction:4}},
        {key:'武器精通_ixxe', name:'武器精通', desc:'额外攻击 +1%/层', max:5, mod:{extraAtk:2}},
        {key:'破甲_9crt', name:'破甲', desc:'攻击 +1%/层 · 斩杀加成 +3%/层', max:3, mod:{atkPct:1,executeBonus:3}},
        {key:'致死打击_gtmg', name:'致死打击', desc:'解锁: 致死打击', max:1, req:10, unlockSkill:'mortalStrike'},
        {key:'处刑者_mq9q', name:'处刑者', desc:'斩杀加成 +5%/层', max:5, req:15, mod:{executeBonus:5}},
        {key:'剑刃风暴_r5y7', name:'剑刃风暴', desc:'攻速 +5%/层 · 暴伤 +6%/层', max:5, req:18, mod:{spdPct:5,critdPct:6}},
        {key:'致命势头_rhev', name:'致命势头', desc:'攻击 +1%/层 · 斩杀加成 +4%/层', max:3, req:22, mod:{atkPct:1,executeBonus:4}},
        {key:'武器宗师_9e33', name:'武器宗师', desc:'暴伤 +8%/层 · 技能冷却 +3%/层', max:5, req:25, mod:{critdPct:8,cdReduction:3}},
        {key:'处决_wz7o', name:'处决', desc:'斩杀加成 +6%/层 · 暴击 +2%/层', max:5, req:28, mod:{executeBonus:6,crit:2}},
        {key:'无尽之怒_kl3i', name:'无尽之怒', desc:'攻击 +2%/层 · 攻速 +4%/层', max:5, req:30, mod:{atkPct:2,spdPct:4}},
        {key:'破甲专精_fqbq', name:'破甲专精', desc:'额外攻击 +2%/层 · 技能冷却 +4%/层', max:3, req:33, mod:{extraAtk:3,cdReduction:4}},
        {key:'致命专注_szok', name:'致命专注', desc:'暴伤 +12%/层 · 精通 +2%/层', max:3, req:36, mod:{critdPct:12,mastery:2}}
      ,
{key:'tal_3cuo6h', name:'千钧之力', desc:'攻击 +2%/层 · 力量 +6%/层', max:5,req:38,mod:{atkPct:2,strPct:6}},{key:'tal_h0awm3', name:'武器大师', desc:'额外攻击 +1%/层 · 技能冷却 +5%/层', max:5,req:42,mod:{extraAtk:5,cdReduction:5}},{key:'tal_yq7lc3', name:'战神', desc:'攻击 +1%/层 · 斩杀加成 +8%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:4,executeBonus:8,mastery:2}}]},
      {key:'fury', name:'狂暴', icon:'🔥', masteryDesc:'嗜血吸血效果 +4%/精通', talents:[
        {key:'激怒_n0b6', name:'激怒', desc:'攻速 +5%/层', max:5, mod:{spdPct:5}},
        {key:'夺命_1b6c', name:'夺命', desc:'暴伤 +8%/层', max:5, mod:{critdPct:8}},
        {key:'血之狂热_nf2d', name:'血之狂热', desc:'攻速 +4%/层', max:3, mod:{spdPct:4}},
        {key:'狂战士_n468', name:'狂战士', desc:'攻击 +1%/层 · 暴击 +1%/层', max:5, mod:{atkPct:1,crit:1}},
        {key:'怒气爆发_3ytl', name:'怒气爆发', desc:'技能冷却 +5%/层', max:3, mod:{cdReduction:5}},
        {key:'嗜血_vq9y', name:'嗜血', desc:'解锁: 嗜血', max:1, req:10, unlockSkill:'bloodthirst'},
        {key:'泰坦之握_k9fr', name:'泰坦之握', desc:'攻击 +2%/层', max:5, req:15, mod:{atkPct:2}},
        {key:'鲁莽_343i', name:'鲁莽', desc:'暴击 +2%/层 · 攻速 +3%/层', max:5, req:18, mod:{crit:2,spdPct:3}},
        {key:'血之渴望_jmmi', name:'血之渴望', desc:'吸血 +3%/层 · 额外攻击 +1%/层', max:3, req:22, mod:{leech:3,extraAtk:2}},
        {key:'狂怒_w0x9', name:'狂怒', desc:'攻击 +1%/层 · 暴伤 +5%/层', max:5, req:25, mod:{atkPct:1,critdPct:5}},
        {key:'斩杀强化_3d7b', name:'斩杀强化', desc:'斩杀加成 +5%/层 · 减耗 +4%/层', max:5, req:28, mod:{executeBonus:5,costReduction:4}},
        {key:'无尽嗜血_2yvj', name:'无尽嗜血', desc:'吸血 +4%/层 · 技能冷却 +3%/层', max:5, req:30, mod:{leech:4,cdReduction:3}},
        {key:'狂暴之力_glx9', name:'狂暴之力', desc:'额外攻击 +1%/层 · 攻速 +5%/层', max:3, req:33, mod:{extraAtk:4,spdPct:5}},
        {key:'狂战士之魂_8my2', name:'狂战士之魂', desc:'攻击 +1%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:3,mastery:2}}
      ,
{key:'tal_b6kj2z', name:'无尽狂怒', desc:'攻速 +8%/层 · 攻击 +1%/层', max:5,req:38,mod:{spdPct:8,atkPct:1}},{key:'tal_maxzem', name:'狂战', desc:'吸血 +5%/层 · 暴击 +3%/层', max:5,req:42,mod:{leech:5,crit:3}},{key:'tal_en9kr4', name:'战神', desc:'攻击 +1%/层 · 额外攻击 +1%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:4,extraAtk:6,mastery:2}}]},
      {key:'prot', name:'防护', icon:'🛡️', masteryDesc:'盾墙减伤效果 +3%/精通', talents:[
        {key:'坚韧_axub', name:'坚韧', desc:'生命 +5%/层', max:5, mod:{hpPct:5}},
        {key:'预判_ndzh', name:'预判', desc:'防御 +5%/层', max:5, mod:{defPct:5}},
        {key:'壁垒_ov99', name:'壁垒', desc:'耐力 +5%/层', max:3, mod:{staPct:5}},
        {key:'圣化之地_lwk5', name:'震荡之地', desc:'反伤 +2%/层', max:5, mod:{reflectDmg:2}},
        {key:'正义之怒_lzx6', name:'战意之怒', desc:'全能 +2%/层', max:3, mod:{vers:2}},
        {key:'圣盾术_slst', name:'盾墙', desc:'解锁: 盾墙', max:1, req:10, unlockSkill:'shieldWall'},
        {key:'炽热防御者_sh4j', name:'炽热防御者', desc:'防御 +8%/层', max:5, req:15, mod:{defPct:8}},
        {key:'守护者_157k', name:'守护者', desc:'耐力 +6%/层 · 全能 +2%/层', max:5, req:18, mod:{staPct:6,vers:2}},
        {key:'圣盾_467q', name:'盾牌专精', desc:'防御 +6%/层 · 反伤 +2%/层', max:3, req:22, mod:{defPct:6,reflectDmg:2}},
        {key:'铁壁_j6ev', name:'铁壁', desc:'防御 +7%/层 · 生命 +3%/层', max:5, req:25, mod:{defPct:7,hpPct:3}},
        {key:'圣光壁垒_3f09', name:'钢铁壁垒', desc:'生命 +6%/层 · 全能 +3%/层', max:5, req:28, mod:{hpPct:6,vers:3}},
        {key:'守护_2cm4', name:'守护', desc:'防御 +8%/层 · 反伤 +3%/层', max:5, req:30, mod:{defPct:8,reflectDmg:3}},
        {key:'防护大师_ccej', name:'防护大师', desc:'技能冷却 +5%/层 · 防御 +5%/层', max:3, req:33, mod:{cdReduction:5,defPct:5}},
        {key:'防护宗师_k7w0', name:'防护宗师', desc:'生命 +10%/层 · 精通 +2%/层', max:3, req:36, mod:{hpPct:10,mastery:2}}
      ,
{key:'tal_pomgzm', name:'铜墙铁壁', desc:'防御 +8%/层 · 生命 +5%/层', max:5,req:38,mod:{defPct:8,hpPct:5}},{key:'tal_7f5oiq', name:'坚不可摧', desc:'耐力 +8%/层 · 反伤 +5%/层', max:5,req:42,mod:{staPct:8,reflectDmg:5}},{key:'tal_ikwcqv', name:'战神', desc:'生命 +12%/层 · 全能 +6%/层 · 精通 +2%/层', max:3,req:45,mod:{hpPct:12,vers:6,mastery:2}},
{key:'tal_b0z1v9', name:'壁垒', desc:'防御 +8%/层 · 生命 +5%/层', max:5,req:38,mod:{defPct:8,hpPct:5}},{key:'tal_tjz4f9', name:'盾牌反震', desc:'反伤 +6%/层 · 耐力 +6%/层', max:5,req:42,mod:{reflectDmg:6,staPct:6}},{key:'tal_05he3a', name:'钢铁守护者', desc:'防御 +12%/层 · 生命 +8%/层 · 精通 +2%/层', max:3,req:45,mod:{defPct:12,hpPct:8,mastery:2}}]},
    ],
  },

  mage: {
    name:'法师', icon:'🧙', emoji:'🧙‍♂️', color:'#69ccf0',
    desc:'布甲法师,元素法术毁灭一切', primaryAttr:'智力',
    attackAttr:'int', resource:'法力', resKey:'mp',
    baseAttrs:{str:5, agi:10, int:22, spi:14, sta:12},
    baseStats:{hpMax:50, mpMax:80, atk:6, def:2, crit:8, critd:150, spd:1.1, reg:1},
    skills:{
      interrupt:{name:"法术反制",icon:"✋",desc:"打断首领施法，冷却5秒",mp:15,type:"interrupt",cd:5,unlockLvl:1},
      arcane:       {name:'奥术飞弹', icon:'✨', desc:'造成3倍攻击伤害', mp:15, type:'dmg', mul:3, unlockLvl:1,castTime:1.5},
      arcaneExplosion:{name:'奥术爆炸', icon:'💥', desc:'3倍攻击范围伤害', mp:30, type:'dmg', mul:3, unlockLvl:14,castTime:0},
      fireball:     {name:'火球术',   icon:'🔥', desc:'3倍攻击,引燃灼烧', mp:25, type:'dmg', mul:3, dot:true, unlockLvl:12,castTime:2.5},
      frostbolt:    {name:'寒冰箭',   icon:'❄️', desc:'3倍攻击,降低敌人攻速', mp:20, type:'dmg', mul:3, slow:true, unlockLvl:6,castTime:2},
      iceBarrier:   {name:'寒冰护体', icon:'🧊', desc:'15秒受到伤害降低40%', mp:40, type:'buff', buff:'iceBarrier', duration:15000, unlockLvl:28,castTime:0},
      pyroblast:    {name:'炎爆术',   icon:'☄️', desc:'7倍攻击,必定暴击', mp:50, type:'dmg', mul:7, alwaysCrit:true, unlockLvl:46,castTime:4},
      blizzard:     {name:'暴风雪',   icon:'🌨️', desc:'3倍攻击,毁灭风暴', mp:55, type:'dmg', mul:5, unlockLvl:12,castTime:2},
      mirrorImage:{name:"镜像",icon:"🪞",desc:"15秒攻击+30%",mp:40,type:"buff",buff:"bestial",duration:15000,unlockLvl:48},
      slow:{name:"减速",icon:"🐌",desc:"3倍伤害,大幅减速",mp:30,type:"dmg",mul:4,slow:true,unlockLvl:62},
      polymorph:    {name:'变形术',   icon:'🐑', desc:'3倍攻击,大幅减速', mp:30, type:'dmg', mul:3, slow:true, unlockLvl:35,castTime:1.5},
      dragonBreath: {name:'龙息术',   icon:'🐲', desc:'6倍火焰伤害', mp:48, type:'dmg', mul:6, dot:true, unlockLvl:58,castTime:0},
      timeWarp:     {name:'时间扭曲', icon:'⏳', desc:'15秒攻速+80%', mp:60, type:'buff', buff:'timeWarp', duration:15000, unlockLvl:76,castTime:0},
    },
    trees:[
      {key:'arcane', name:'奥术', icon:'✨', masteryDesc:'暴风雪伤害 +3%/精通', talents:[
        {key:'奥术专精_y6in', name:'奥术专精', desc:'智力 +5%/层', max:5, mod:{intPct:5}},
        {key:'奥术冥想_h6zk', name:'奥术冥想', desc:'回复 +2%/层', max:5, mod:{regFlat:2}},
        {key:'奥术心智_k520', name:'奥术心智', desc:'暴击 +2%/层', max:3, mod:{crit:2}},
        {key:'奥术强化_2ldc', name:'奥术强化', desc:'攻击 +1%/层', max:5, mod:{atkPct:1}},
        {key:'节能施法_bd03', name:'节能施法', desc:'减耗 +5%/层', max:3, mod:{costReduction:5}},
        {key:'暴风雪_wazr', name:'暴风雪', desc:'解锁: 暴风雪', max:1, req:10, unlockSkill:'blizzard'},
        {key:'奥术涌动_vju1', name:'奥术涌动', desc:'攻击 +2%/层 · 技能冷却 +3%/层', max:5, req:15, mod:{atkPct:2,cdReduction:3}},
        {key:'奥术回响_b8cj', name:'奥术回响', desc:'额外攻击 +1%/层 · 暴伤 +6%/层', max:5, req:18, mod:{extraAtk:2,critdPct:6}},
        {key:'超凡入圣_ki0e', name:'超凡入圣', desc:'智力 +6%/层 · 技能冷却 +4%/层', max:3, req:22, mod:{intPct:6,cdReduction:4}},
        {key:'魔网_xhrf', name:'魔网', desc:'技能冷却 +5%/层 · 攻速 +4%/层', max:5, req:25, mod:{cdReduction:5,spdPct:4}},
        {key:'法力专家_bk0b', name:'法力专家', desc:'减耗 +5%/层 · 攻击 +1%/层', max:5, req:28, mod:{costReduction:5,atkPct:1}},
        {key:'奥术之力_25md', name:'奥术之力', desc:'攻击 +2%/层 · 暴伤 +8%/层', max:5, req:30, mod:{atkPct:2,critdPct:8}},
        {key:'灵风_qnj3', name:'灵风', desc:'攻速 +6%/层 · 减耗 +4%/层', max:3, req:33, mod:{spdPct:6,costReduction:4}},
        {key:'奥术宗师_dh7l', name:'奥术宗师', desc:'攻击 +1%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:3,mastery:2}}
      ,
{key:'tal_vy68we', name:'奥术洪流', desc:'攻击 +2%/层 · 减耗 +5%/层', max:5,req:38,mod:{atkPct:2,costReduction:5}},{key:'tal_uw6vj0', name:'法力风暴', desc:'智力 +8%/层 · 技能冷却 +5%/层', max:5,req:42,mod:{intPct:8,cdReduction:5}},{key:'tal_ytx7oz', name:'大法师', desc:'攻击 +1%/层 · 暴伤 +10%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:4,critdPct:10,mastery:2}}]},
      {key:'fire', name:'火焰', icon:'🔥', masteryDesc:'火球术灼烧伤害 +4%/精通', talents:[
        {key:'引燃_xwmm', name:'引燃', desc:'攻击 +1%/层', max:5, mod:{atkPct:1}},
        {key:'临界点_of9n', name:'临界点', desc:'暴击 +1.5%/层', max:5, mod:{crit:1.5}},
        {key:'灼烧之魂_1cba', name:'灼烧之魂', desc:'暴伤 +8%/层', max:3, mod:{critdPct:8}},
        {key:'烈焰之心_qe0c', name:'烈焰之心', desc:'持续伤害 +5%/层', max:5, mod:{dotBonus:5}},
        {key:'火焰冲击_o93d', name:'火焰冲击', desc:'技能冷却 +4%/层', max:3, mod:{cdReduction:4}},
        {key:'火球术_wshg', name:'火球术', desc:'解锁: 火球术', max:1, req:10, unlockSkill:'fireball'},
        {key:'燃烧_ddyk', name:'燃烧', desc:'攻击 +2%/层', max:5, req:15, mod:{atkPct:2}},
        {key:'永恒烈焰_9e2d', name:'永恒烈焰', desc:'持续伤害 +6%/层 · 暴伤 +5%/层', max:5, req:18, mod:{dotBonus:6,critdPct:5}},
        {key:'凤凰烈焰_h7gd', name:'凤凰烈焰', desc:'暴击 +2%/层 · 技能冷却 +3%/层', max:3, req:22, mod:{crit:2,cdReduction:3}},
        {key:'灼热_4nud', name:'灼热', desc:'攻击 +1%/层 · 吸血 +2%/层', max:5, req:25, mod:{atkPct:1,leech:2}},
        {key:'焦灼_fslr', name:'焦灼', desc:'斩杀加成 +5%/层 · 暴伤 +7%/层', max:5, req:28, mod:{executeBonus:5,critdPct:7}},
        {key:'炎爆_m7ik', name:'炎爆', desc:'攻击 +2%/层 · 暴击 +2%/层', max:5, req:30, mod:{atkPct:2,crit:2}},
        {key:'火焰专精_qi3j', name:'火焰专精', desc:'持续伤害 +8%/层 · 额外攻击 +2%/层', max:3, req:33, mod:{dotBonus:8,extraAtk:3}},
        {key:'烈焰宗师_xjj4', name:'烈焰宗师', desc:'攻击 +1%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:3,mastery:2}}
      ,
{key:'tal_9gb7zz', name:'活体炸弹', desc:'持续伤害 +8%/层 · 暴击 +2%/层', max:5,req:38,mod:{dotBonus:8,crit:2}},{key:'tal_fis9ti', name:'炼狱', desc:'攻击 +2%/层 · 斩杀加成 +5%/层', max:5,req:42,mod:{atkPct:2,executeBonus:5}},{key:'tal_29bm2f', name:'大法师', desc:'攻击 +1%/层 · 暴伤 +10%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:4,critdPct:10,mastery:2}}]},
      {key:'frost', name:'冰霜', icon:'❄️', masteryDesc:'寒冰箭减速效果 +5%/精通', talents:[
        {key:'碎裂_6q4s', name:'碎裂', desc:'暴伤 +10%/层', max:5, mod:{critdPct:10}},
        {key:'冰甲术_ypee', name:'冰甲术', desc:'防御 +5%/层', max:5, mod:{defPct:5}},
        {key:'永冻_o7dg', name:'永冻', desc:'智力 +5%/层', max:3, mod:{intPct:5}},
        {key:'冰霜之触_ui6r', name:'冰霜之触', desc:'攻击 +1%/层 · 攻速 +3%/层', max:5, mod:{atkPct:1,spdPct:3}},
        {key:'寒冰屏障_igiy', name:'寒冰屏障', desc:'全能 +2%/层', max:3, mod:{vers:2}},
        {key:'寒冰箭_bzxf', name:'寒冰箭', desc:'解锁: 寒冰箭', max:1, req:10, unlockSkill:'frostbolt'},
        {key:'深度冻结_ljp1', name:'深度冻结', desc:'暴伤 +10%/层', max:5, req:15, mod:{critdPct:10}},
        {key:'冰川_evvy', name:'冰川', desc:'防御 +4%/层 · 全能 +2%/层', max:5, req:18, mod:{defPct:4,vers:2}},
        {key:'寒冬_nnx5', name:'寒冬', desc:'攻击 +1%/层 · 暴击 +1.5%/层', max:3, req:22, mod:{atkPct:1,crit:1.5}},
        {key:'冰霜之咬_xdgt', name:'冰霜之咬', desc:'技能冷却 +4%/层 · 暴伤 +6%/层', max:5, req:25, mod:{cdReduction:4,critdPct:6}},
        {key:'急冻_d4uy', name:'急冻', desc:'额外攻击 +2%/层 · 攻击 +1%/层', max:5, req:28, mod:{extraAtk:3,atkPct:1}},
        {key:'零度_vil0', name:'零度', desc:'暴击 +2.5%/层 · 减耗 +4%/层', max:5, req:30, mod:{crit:2.5,costReduction:4}},
        {key:'冰封_11lc', name:'冰封', desc:'防御 +6%/层 · 全能 +3%/层', max:3, req:33, mod:{defPct:6,vers:3}},
        {key:'冰霜宗师_kkmw', name:'冰霜宗师', desc:'攻击 +1%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:3,mastery:2}}
      ,
{key:'tal_4sxjog', name:'冰河时代', desc:'防御 +8%/层 · 全能 +4%/层', max:5,req:38,mod:{defPct:8,vers:4}},{key:'tal_4bba7s', name:'绝对零度', desc:'暴伤 +10%/层 · 额外攻击 +1%/层', max:5,req:42,mod:{critdPct:10,extraAtk:4}},{key:'tal_815u80', name:'大法师', desc:'攻击 +1%/层 · 暴击 +3%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:4,crit:3,mastery:2}}]},
    ],
  },

  priest: {
    name:'牧师', icon:'⛪', emoji:'🧝', color:'#ffffff',
    desc:'圣光与暗影的传道者', primaryAttr:'智力',
    attackAttr:'int', resource:'法力', resKey:'mp',
    baseAttrs:{str:6, agi:8, int:20, spi:18, sta:13},
    baseStats:{hpMax:55, mpMax:90, atk:5, def:2, crit:5, critd:150, spd:0.9, reg:2},
    skills:{
      interrupt:{name:"沉默",icon:"🤫",desc:"打断首领施法，冷却5秒",mp:12,type:"interrupt",cd:5,unlockLvl:1},
      smite:      {name:'惩击',     icon:'✝️', desc:'2倍神圣伤害', mp:15, type:'dmg', mul:2, unlockLvl:1,castTime:1.5},
      shadowWord: {name:'暗言术·痛',icon:'🌑', desc:'3倍攻击,持续暗影伤害', mp:20, type:'dmg', mul:3, dot:true, unlockLvl:12,castTime:0},
      shield:     {name:'真言术盾', icon:'🛡️', desc:'15秒受到伤害降低33%', mp:30, type:'buff', buff:'shield', duration:15000,castTime:0},
      heal:       {name:'治疗术',   icon:'💚', desc:'恢复40%生命', mp:35, type:'heal', heal:0.4,castTime:2.5},
      holyNova:   {name:'神圣新星', icon:'✨', desc:'3倍攻击+15%自愈', mp:38, type:'dmg', mul:3, lifeSteal:0.3, unlockLvl:30,castTime:0},
      powerInfusion:{name:'能量灌注',icon:'💉', desc:'15秒攻速+50%', mp:45, type:'buff', buff:'windfury', duration:15000, unlockLvl:42,castTime:0},
      mindBlast:  {name:'心灵震爆', icon:'🌀', desc:'3倍攻击伤害', mp:40, type:'dmg', mul:4,castTime:1.5},
      shackleUndead:{name:"束缚亡灵",icon:"⛓️",desc:"3倍伤害,定身减速",mp:28,type:"dmg",mul:4,slow:true,unlockLvl:44},
      holyFire:{name:"神圣之火",icon:"🔥",desc:"3倍伤害,持续灼烧",mp:38,type:"dmg",mul:5,dot:true,unlockLvl:60},
      renew:        {name:'恢复',     icon:'🌱', desc:'恢复35%生命', mp:30, type:'heal', heal:0.35, unlockLvl:32,castTime:0},
      shadowDeath:  {name:'暗言术·灭',icon:'💀', desc:'7倍暗影伤害', mp:45, type:'dmg', mul:7, unlockLvl:52,castTime:0},
      divineHymn:   {name:'神圣赞美诗',icon:'🎵', desc:'恢复50%生命', mp:60, type:'heal', heal:0.5, unlockLvl:72,castTime:2},
    },
    trees:[
      {key:'discipline', name:'戒律', icon:'🕊️', masteryDesc:'真言术盾吸收量 +4%/精通', talents:[
        {key:'冥想_nwog', name:'冥想', desc:'回复 +2%/层', max:5, mod:{regFlat:2}},
        {key:'心灵强化_zcy9', name:'心灵强化', desc:'智力 +5%/层', max:5, mod:{intPct:5}},
        {key:'心灵之火_jxpm', name:'心灵之火', desc:'防御 +6%/层', max:3, mod:{defPct:6}},
        {key:'意志之力_234q', name:'意志之力', desc:'全能 +3%/层', max:5, mod:{vers:3}},
        {key:'启迪_4qwr', name:'启迪', desc:'技能冷却 +3%/层', max:3, mod:{cdReduction:3}},
        {key:'真言术盾_4ecx', name:'真言术盾', desc:'解锁: 真言术盾', max:1, req:10, unlockSkill:'shield'},
        {key:'救赎_5a4x', name:'救赎', desc:'攻击 +2%/层', max:5, req:15, mod:{atkPct:2}},
        {key:'灵魂之壳_4vdj', name:'灵魂之壳', desc:'防御 +5%/层 · 精神 +3%/层', max:5, req:18, mod:{defPct:5,spiPct:3}},
        {key:'圣光道标_n2yl', name:'圣光道标', desc:'治疗 +7%/层', max:3, req:22, mod:{healBonus:7}},
        {key:'屏障_69ik', name:'屏障', desc:'防御 +6%/层 · 全能 +2%/层', max:5, req:25, mod:{defPct:6,vers:2}},
        {key:'救赎之魂_bl9j', name:'救赎之魂', desc:'治疗 +6%/层 · 回复 +3%/层', max:5, req:28, mod:{healBonus:6,regFlat:3}},
        {key:'意志_qvaw', name:'意志', desc:'生命 +6%/层 · 治疗 +5%/层', max:5, req:30, mod:{hpPct:6,healBonus:5}},
        {key:'戒律之力_31no', name:'戒律之力', desc:'技能冷却 +5%/层 · 攻击 +1%/层', max:3, req:33, mod:{cdReduction:5,atkPct:1}},
        {key:'戒律师宗_0txl', name:'戒律师宗', desc:'治疗 +10%/层 · 精通 +2%/层', max:3, req:36, mod:{healBonus:10,mastery:2}}
      ,
{key:'tal_6ur2ah', name:'圣光庇护', desc:'防御 +8%/层 · 治疗 +5%/层', max:5,req:38,mod:{defPct:8,healBonus:5}},{key:'tal_tgaqq3', name:'天使', desc:'精神 +8%/层 · 治疗 +7%/层', max:5,req:42,mod:{spiPct:8,healBonus:7}},{key:'tal_gtapc7', name:'大祭司', desc:'治疗 +15%/层 · 技能冷却 +5%/层 · 精通 +2%/层', max:3,req:45,mod:{healBonus:15,cdReduction:5,mastery:2}}]},
      {key:'holy', name:'神圣', icon:'✝️', masteryDesc:'治疗术回复量 +5%/精通', talents:[
        {key:'光明_uz4j', name:'光明', desc:'精神 +5%/层', max:5, mod:{spiPct:5}},
        {key:'神性_6o1u', name:'神性', desc:'智力 +5%/层', max:5, mod:{intPct:5}},
        {key:'圣化_n8vy', name:'圣化', desc:'回复 +2%/层', max:3, mod:{regFlat:2}},
        {key:'神恩_3h1q', name:'神恩', desc:'治疗 +5%/层', max:5, mod:{healBonus:5}},
        {key:'圣洁_7zvz', name:'圣洁', desc:'全能 +2%/层', max:3, mod:{vers:2}},
        {key:'圣光术_0ynh', name:'治疗术', desc:'解锁: 治疗术', max:1, req:10, unlockSkill:'heal'},
        {key:'圣光信标_49vd', name:'圣光信标', desc:'生命 +6%/层', max:5, req:15, mod:{hpPct:6}},
        {key:'圣光辐射_uwtw', name:'圣光辐射', desc:'生命 +4%/层 · 治疗 +5%/层', max:5, req:18, mod:{hpPct:4,healBonus:5}},
        {key:'守护之魂_3pgg', name:'守护之魂', desc:'防御 +5%/层 · 治疗 +4%/层', max:3, req:22, mod:{defPct:5,healBonus:4}},
        {key:'圣光_5dw8', name:'圣光', desc:'生命 +6%/层 · 回复 +2%/层', max:5, req:25, mod:{hpPct:6,regFlat:2}},
        {key:'圣疗_1dq5', name:'圣疗', desc:'治疗 +8%/层 · 精神 +3%/层', max:5, req:28, mod:{healBonus:8,spiPct:3}},
        {key:'神圣_2532', name:'神圣', desc:'生命 +7%/层 · 治疗 +5%/层', max:5, req:30, mod:{hpPct:7,healBonus:5}},
        {key:'圣光大师_tci1', name:'圣光大师', desc:'技能冷却 +4%/层 · 治疗 +5%/层', max:3, req:33, mod:{cdReduction:4,healBonus:5}},
        {key:'神圣宗师_33ld', name:'神圣宗师', desc:'治疗 +12%/层 · 精通 +2%/层', max:3, req:36, mod:{healBonus:12,mastery:2}}
      ,
{key:'tal_o3gedr', name:'神圣眷顾', desc:'治疗 +8%/层 · 生命 +5%/层', max:5,req:38,mod:{healBonus:8,hpPct:5}},{key:'tal_1nketb', name:'永恒之光', desc:'精神 +8%/层 · 回复 +3%/层', max:5,req:42,mod:{spiPct:8,regFlat:3}},{key:'tal_06hcy6', name:'大祭司', desc:'治疗 +15%/层 · 全能 +5%/层 · 精通 +2%/层', max:3,req:45,mod:{healBonus:15,vers:5,mastery:2}},
{key:'tal_xwcf0i', name:'圣光洗礼', desc:'治疗 +8%/层 · 精神 +5%/层', max:5,req:38,mod:{healBonus:8,spiPct:5}},{key:'tal_2pupt2', name:'黎明之光', desc:'生命 +8%/层 · 治疗 +7%/层', max:5,req:42,mod:{hpPct:8,healBonus:7}},{key:'tal_whu9yf', name:'圣光化身', desc:'治疗 +15%/层 · 技能冷却 +5%/层 · 精通 +2%/层', max:3,req:45,mod:{healBonus:15,cdReduction:5,mastery:2}}]},
      {key:'shadow', name:'暗影', icon:'🌑', masteryDesc:'心灵震爆伤害 +3%/精通', talents:[
        {key:'暗影成型_dje7', name:'暗影成型', desc:'攻击 +1%/层', max:5, mod:{atkPct:1}},
        {key:'吸血鬼之触_jdbz', name:'吸血鬼之触', desc:'暴伤 +8%/层', max:5, mod:{critdPct:8}},
        {key:'黑暗思维_mlvw', name:'黑暗思维', desc:'暴击 +2%/层', max:3, mod:{crit:2}},
        {key:'暗影之力_kjt8', name:'暗影之力', desc:'持续伤害 +5%/层', max:5, mod:{dotBonus:5}},
        {key:'心灵尖刺_kji8', name:'心灵尖刺', desc:'技能冷却 +4%/层', max:3, mod:{cdReduction:4}},
        {key:'心灵震爆_47e3', name:'心灵震爆', desc:'解锁: 心灵震爆', max:1, req:10, unlockSkill:'mindBlast'},
        {key:'虚空形态_18n3', name:'虚空形态', desc:'攻击 +2%/层', max:5, req:15, mod:{atkPct:2}},
        {key:'暗影魔_ylie', name:'暗影魔', desc:'攻击 +1%/层 · 吸血 +2%/层', max:5, req:18, mod:{atkPct:1,leech:2}},
        {key:'虚空回响_zsfh', name:'虚空回响', desc:'额外攻击 +2%/层 · 暴伤 +5%/层', max:3, req:22, mod:{extraAtk:3,critdPct:5}},
        {key:'疯狂_bowy', name:'疯狂', desc:'攻击 +1%/层 · 攻速 +3%/层', max:5, req:25, mod:{atkPct:1,spdPct:3}},
        {key:'暗影之痛_m7pe', name:'暗影之痛', desc:'持续伤害 +7%/层 · 斩杀加成 +4%/层', max:5, req:28, mod:{dotBonus:7,executeBonus:4}},
        {key:'天启_uank', name:'天启', desc:'攻击 +2%/层 · 暴击 +2%/层', max:5, req:30, mod:{atkPct:2,crit:2}},
        {key:'混沌_uaof', name:'混沌', desc:'技能冷却 +5%/层 · 持续伤害 +5%/层', max:3, req:33, mod:{cdReduction:5,dotBonus:5}},
        {key:'暗影宗师_zywn', name:'暗影宗师', desc:'攻击 +1%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:3,mastery:2}}
      ,
{key:'tal_olt688', name:'暗影幻灵', desc:'持续伤害 +8%/层 · 吸血 +3%/层', max:5,req:38,mod:{dotBonus:8,leech:3}},{key:'tal_wcgwwu', name:'虚空', desc:'攻击 +2%/层 · 暴击 +3%/层', max:5,req:42,mod:{atkPct:2,crit:3}},{key:'tal_bf4hdm', name:'暗影祭司', desc:'攻击 +1%/层 · 斩杀加成 +8%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:4,executeBonus:8,mastery:2}}]},
    ],
  },

  rogue: {
    name:'盗贼', icon:'🗡️', emoji:'🥷', color:'#fff569',
    desc:'皮甲刺客,从阴影中给予致命一击', primaryAttr:'敏捷',
    attackAttr:'agi', resource:'能量', resKey:'energy',
    baseAttrs:{str:12, agi:24, int:6, spi:7, sta:14},
    baseStats:{hpMax:60, mpMax:100, atk:7, def:3, crit:10, critd:160, spd:1.4, reg:2},
    skills:{
      interrupt:{name:"脚踢",icon:"🦶",desc:"打断首领施法，冷却5秒",mp:15,type:"interrupt",cd:5,unlockLvl:1},
      sinister:    {name:'邪恶打击', icon:'🗡️', desc:'造成2倍攻击', mp:20, type:'dmg', mul:2, unlockLvl:1},
      backstab:    {name:'背刺',     icon:'🔪', desc:'3倍攻击伤害', mp:30, type:'dmg', mul:3},
      poison:      {name:'毒刃',     icon:'🐍', desc:'3倍攻击,持续中毒', mp:25, type:'dmg', mul:3, dot:true},
      evasion:     {name:'闪避',     icon:'💨', desc:'15秒受到伤害降低34%', mp:30, type:'buff', buff:'evasion', duration:15000, unlockLvl:18},
      kidneyShot:  {name:'肾击',     icon:'👊', desc:'3倍攻击,降低敌人攻速', mp:32, type:'dmg', mul:4, slow:true, unlockLvl:32},
      killingSpree:{name:'杀戮盛宴', icon:'💀', desc:'7倍攻击,必定暴击', mp:48, type:'dmg', mul:7, alwaysCrit:true, unlockLvl:48},
      shadow:      {name:'影遁',     icon:'👤', desc:'15秒攻击+50%', mp:50, type:'buff', buff:'shadowstep', duration:15000},
      cloakOfShadows:{name:"暗影斗篷",icon:"🌑",desc:"12秒受到伤害降低34%",mp:30,type:"buff",buff:"evasion",duration:12000,unlockLvl:42},
      garrote:{name:"绞喉",icon:"🪢",desc:"3倍伤害,沉默3秒",mp:38,type:"dmg",mul:5,silence:3000,unlockLvl:58},
      throw:        {name:'致命投掷', icon:'🎯', desc:'3倍远程攻击', mp:25, type:'dmg', mul:3, unlockLvl:28},
      rupture:      {name:'割裂',     icon:'🩸', desc:'4倍攻击,持续流血', mp:32, type:'dmg', mul:4, dot:true, unlockLvl:50},
      deathMark:    {name:'死亡标记', icon:'☠️', desc:'8倍必暴终结技', mp:55, type:'dmg', mul:8, alwaysCrit:true, unlockLvl:70},
    },
    trees:[
      {key:'assassination', name:'刺杀', icon:'🐍', masteryDesc:'毒刃持续伤害 +4%/精通', talents:[
        {key:'恶毒_yx0e', name:'恶毒', desc:'暴击 +1.5%/层', max:5, mod:{crit:1.5}},
        {key:'谋杀_m3cw', name:'谋杀', desc:'攻击 +1%/层', max:5, mod:{atkPct:1}},
        {key:'毒药专精_og6n', name:'毒药专精', desc:'暴伤 +8%/层', max:3, mod:{critdPct:8}},
        {key:'致命毒药_rx7b', name:'致命毒药', desc:'持续伤害 +5%/层', max:5, mod:{dotBonus:5}},
        {key:'暗影步_za55', name:'暗影步', desc:'技能冷却 +5%/层', max:3, mod:{cdReduction:5}},
        {key:'毒刃_rg3r', name:'毒刃', desc:'解锁: 毒刃', max:1, req:10, unlockSkill:'poison'},
        {key:'放血_m5bp', name:'放血', desc:'攻击 +2%/层', max:5, req:15, mod:{atkPct:2}},
        {key:'剧毒_v4hv', name:'剧毒', desc:'吸血 +2%/层 · 持续伤害 +4%/层', max:5, req:18, mod:{leech:2,dotBonus:4}},
        {key:'宿敌_68b9', name:'宿敌', desc:'暴伤 +8%/层 · 暴击 +1.5%/层', max:3, req:22, mod:{critdPct:8,crit:1.5}},
        {key:'刺客之道_6wkb', name:'刺客之道', desc:'斩杀加成 +5%/层 · 攻击 +1%/层', max:5, req:25, mod:{executeBonus:5,atkPct:1}},
        {key:'暗杀_42j5', name:'暗杀', desc:'暴伤 +10%/层 · 额外攻击 +1%/层', max:5, req:28, mod:{critdPct:10,extraAtk:2}},
        {key:'死亡标记_bu1r', name:'死亡标记', desc:'攻击 +2%/层 · 暴击 +2%/层', max:5, req:30, mod:{atkPct:2,crit:2}},
        {key:'毒药大师_jgpa', name:'毒药大师', desc:'持续伤害 +8%/层 · 技能冷却 +4%/层', max:3, req:33, mod:{dotBonus:8,cdReduction:4}},
        {key:'刺杀宗师_rwpy', name:'刺杀宗师', desc:'攻击 +1%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:3,mastery:2}}
      ,
{key:'tal_4gq2h5', name:'致命毒液', desc:'持续伤害 +8%/层 · 吸血 +3%/层', max:5,req:38,mod:{dotBonus:8,leech:3}},{key:'tal_er31mp', name:'暗杀大师', desc:'暴伤 +12%/层 · 斩杀加成 +5%/层', max:5,req:42,mod:{critdPct:12,executeBonus:5}},{key:'tal_za0dpi', name:'影舞者', desc:'攻击 +1%/层 · 暴击 +3%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:4,crit:3,mastery:2}}]},
      {key:'combat', name:'战斗', icon:'⚔️', masteryDesc:'背刺伤害 +3%/精通', talents:[
        {key:'双武器精通_uq2m', name:'双武器精通', desc:'攻速 +5%/层', max:5, mod:{spdPct:5}},
        {key:'精准_v1gb', name:'精准', desc:'敏捷 +5%/层', max:5, mod:{agiPct:5}},
        {key:'剑刃乱舞_h7qw', name:'剑刃乱舞', desc:'暴击 +2%/层', max:3, mod:{crit:2}},
        {key:'武器大师_4qz9', name:'武器大师', desc:'额外攻击 +1%/层', max:5, mod:{extraAtk:2}},
        {key:'还击_6dqu', name:'还击', desc:'反伤 +2%/层', max:3, mod:{reflectDmg:2}},
        {key:'背刺_27cb', name:'背刺', desc:'解锁: 背刺', max:1, req:10, unlockSkill:'backstab'},
        {key:'肾上腺素_4krm', name:'肾上腺素', desc:'攻速 +8%/层', max:5, req:15, mod:{spdPct:8}},
        {key:'无尽能量_wmpq', name:'无尽能量', desc:'技能冷却 +4%/层 · 暴击 +1.5%/层', max:5, req:18, mod:{cdReduction:4,crit:1.5}},
        {key:'剑刃冲锋_ln9o', name:'剑刃冲锋', desc:'攻击 +1%/层 · 攻速 +4%/层', max:3, req:22, mod:{atkPct:1,spdPct:4}},
        {key:'战斗狂热_ypmy', name:'战斗狂热', desc:'攻击 +1%/层 · 吸血 +2%/层', max:5, req:25, mod:{atkPct:1,leech:2}},
        {key:'致命打击_nc4p', name:'致命打击', desc:'暴伤 +8%/层 · 额外攻击 +2%/层', max:5, req:28, mod:{critdPct:8,extraAtk:3}},
        {key:'杀戮_0rw8', name:'杀戮', desc:'攻击 +2%/层 · 攻速 +4%/层', max:5, req:30, mod:{atkPct:2,spdPct:4}},
        {key:'战斗精通_qy0g', name:'战斗精通', desc:'技能冷却 +5%/层 · 减耗 +5%/层', max:3, req:33, mod:{cdReduction:5,costReduction:5}},
        {key:'战斗宗师_z8hj', name:'战斗宗师', desc:'攻击 +1%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:3,mastery:2}}
      ,
{key:'tal_8x4uoo', name:'利刃', desc:'额外攻击 +1%/层 · 攻速 +6%/层', max:5,req:38,mod:{extraAtk:5,spdPct:6}},{key:'tal_iki3mc', name:'战斗大师', desc:'攻击 +2%/层 · 暴伤 +8%/层', max:5,req:42,mod:{atkPct:2,critdPct:8}},{key:'tal_h7prev', name:'剑圣', desc:'攻击 +1%/层 · 技能冷却 +6%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:4,cdReduction:6,mastery:2}}]},
      {key:'subtlety', name:'敏锐', icon:'👤', masteryDesc:'影遁攻击加成 +5%/精通', talents:[
        {key:'机会_1w3o', name:'机会', desc:'暴伤 +8%/层', max:5, mod:{critdPct:8}},
        {key:'闪避_273f', name:'闪避', desc:'防御 +5%/层', max:5, mod:{defPct:5}},
        {key:'暗影之舞_8eb9', name:'暗影之舞', desc:'敏捷 +5%/层', max:3, mod:{agiPct:5}},
        {key:'暗影斗篷_pzzm', name:'暗影斗篷', desc:'全能 +3%/层', max:5, mod:{vers:3}},
        {key:'潜伏_bruu', name:'潜伏', desc:'技能冷却 +4%/层', max:3, mod:{cdReduction:4}},
        {key:'影遁_3u1p', name:'影遁', desc:'解锁: 影遁', max:1, req:10, unlockSkill:'shadow'},
        {key:'弱点_ae8r', name:'弱点', desc:'暴伤 +8%/层', max:5, req:15, mod:{critdPct:8}},
        {key:'暗夜之刃_de22', name:'暗夜之刃', desc:'攻击 +1%/层 · 敏捷 +4%/层', max:5, req:18, mod:{atkPct:1,agiPct:4}},
        {key:'深影_31zb', name:'深影', desc:'攻击 +1%/层 · 技能冷却 +3%/层', max:3, req:22, mod:{atkPct:1,cdReduction:3}},
        {key:'暗影步_hu73', name:'暗影步', desc:'攻速 +5%/层 · 额外攻击 +2%/层', max:5, req:25, mod:{spdPct:5,extraAtk:3}},
        {key:'暗影之击_zpfd', name:'暗影之击', desc:'攻击 +2%/层 · 暴伤 +6%/层', max:5, req:28, mod:{atkPct:2,critdPct:6}},
        {key:'黑暗_9tr5', name:'黑暗', desc:'攻击 +1%/层 · 暴击 +2%/层', max:5, req:30, mod:{atkPct:1,crit:2}},
        {key:'暗影大师_szx0', name:'暗影大师', desc:'斩杀加成 +6%/层 · 技能冷却 +4%/层', max:3, req:33, mod:{executeBonus:6,cdReduction:4}},
        {key:'敏锐宗师_r0wm', name:'敏锐宗师', desc:'攻击 +1%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:3,mastery:2}}
      ,
{key:'tal_d22q05', name:'影刃', desc:'攻击 +2%/层 · 斩杀加成 +5%/层', max:5,req:38,mod:{atkPct:2,executeBonus:5}},{key:'tal_sxtqtx', name:'暗杀大师', desc:'额外攻击 +1%/层 · 暴伤 +8%/层', max:5,req:42,mod:{extraAtk:5,critdPct:8}},{key:'tal_u69oap', name:'影舞者', desc:'攻击 +1%/层 · 全能 +6%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:4,vers:6,mastery:2}}]},
    ],
  },

  hunter: {
    name:'猎人', icon:'🏹', emoji:'🧝‍♂️', color:'#abd473',
    desc:'锁甲远程,与野兽伙伴并肩作战', primaryAttr:'敏捷',
    attackAttr:'agi', resource:'法力', resKey:'mp',
    baseAttrs:{str:10, agi:22, int:8, spi:10, sta:15},
    baseStats:{hpMax:65, mpMax:80, atk:7, def:4, crit:8, critd:155, spd:1.2, reg:1},
    skills:{
      interrupt:{name:"反制射击",icon:"🏹",desc:"打断首领施法，冷却5秒",mp:15,type:"interrupt",cd:5,unlockLvl:1},
      arcaneShot:   {name:'奥术射击', icon:'🏹', desc:'2倍攻击', mp:15, type:'dmg', mul:2, unlockLvl:1,castTime:0},
      serpentSting: {name:'毒蛇钉刺', icon:'🐍', desc:'3倍攻击,持续中毒', mp:20, type:'dmg', mul:3, dot:true, unlockLvl:12,castTime:0},
      rapidFire:    {name:'急速射击', icon:'⚡', desc:'15秒攻速+60%', mp:35, type:'buff', buff:'rapidFire', duration:15000, unlockLvl:25,castTime:0},
      summonPet:    {name:'召唤宠物', icon:'🐺', desc:'召唤1只野兽伙伴持续24秒助战', mp:28, type:'summon', summonCount:1, summonCap:1, summonTheme:'beast', summonDuration:24000, summonPower:1.05, unlockLvl:20, castTime:0, cd:18},
      aimed:        {name:'瞄准射击', icon:'🎯', desc:'3倍攻击,必定暴击', mp:35, type:'dmg', mul:4, alwaysCrit:true,castTime:2.5},
      multi:        {name:'多重射击', icon:'🎯', desc:'3倍攻击', mp:30, type:'dmg', mul:3,castTime:0},
      killShot:     {name:'杀戮射击', icon:'💀', desc:'7倍攻击,残血斩杀', mp:42, type:'dmg', mul:7, unlockLvl:45,castTime:0},
      bestialWrath: {name:'狂野怒火', icon:'🦁', desc:'15秒攻击+40%', mp:50, type:'buff', buff:'bestial', duration:15000,castTime:0},
      huntersMark:{name:"猎人印记",icon:"🎯",desc:"15秒降低敌人防御20%",mp:25,type:"dmg",mul:2,unlockLvl:40},
      barrage:{name:"弹幕射击",icon:"💥",desc:"3倍范围伤害",mp:48,type:"dmg",mul:6,unlockLvl:60},
      explosiveShot:{name:'爆炸射击', icon:'💥', desc:'4倍火焰伤害', mp:32, type:'dmg', mul:4, dot:true, unlockLvl:38,castTime:0},
      freezingTrap: {name:'冰冻陷阱', icon:'❄️', desc:'4倍攻击,冰冻减速', mp:25, type:'dmg', mul:4, slow:true, freeze:true, unlockLvl:52,castTime:0},
      stampede:     {name:'万兽奔腾', icon:'🐾', desc:'7倍攻击,兽群践踏', mp:58, type:'dmg', mul:7, unlockLvl:74,castTime:0},
    },
    trees:[
      {key:'bm', name:'兽王', icon:'🦁', masteryDesc:'狂野怒火攻击加成 +5%/精通', talents:[
        {key:'野性精神_kuxe', name:'野性精神', desc:'攻击 +1%/层', max:5, mod:{atkPct:1}},
        {key:'狂热_c9j2', name:'狂热', desc:'攻速 +5%/层', max:5, mod:{spdPct:5}},
        {key:'兽群领袖_6n60', name:'兽群领袖', desc:'生命 +6%/层', max:3, mod:{hpPct:6}},
        {key:'凶暴野兽_vxml', name:'凶暴野兽', desc:'额外攻击 +1%/层', max:5, mod:{extraAtk:2}},
        {key:'灵魂兽_ox4v', name:'灵魂兽', desc:'吸血 +2%/层', max:3, mod:{leech:2}},
        {key:'狂野怒火_jho5', name:'狂野怒火', desc:'解锁: 狂野怒火', max:1, req:10, unlockSkill:'bestialWrath'},
        {key:'兽王_mpa1', name:'兽王', desc:'攻击 +2%/层', max:5, req:15, mod:{atkPct:2}},
        {key:'兽群之力_elhz', name:'兽群之力', desc:'攻速 +6%/层 · 攻击 +2%/层', max:5, req:18, mod:{spdPct:6,atkPct:1}},
        {key:'野性呼唤_z4zm', name:'野性呼唤', desc:'技能冷却 +5%/层 · 攻击 +1%/层', max:3, req:22, mod:{cdReduction:5,atkPct:1}},
        {key:'兽群_ds5h', name:'兽群', desc:'攻击 +1%/层 · 吸血 +2%/层', max:5, req:25, mod:{atkPct:1,leech:2}},
        {key:'凶暴_1761', name:'凶暴', desc:'暴伤 +8%/层 · 额外攻击 +2%/层', max:5, req:28, mod:{critdPct:8,extraAtk:3}},
        {key:'兽王之力_lugl', name:'兽王之力', desc:'攻击 +2%/层 · 暴击 +1.5%/层', max:5, req:30, mod:{atkPct:2,crit:1.5}},
        {key:'野兽大师_e4rr', name:'野兽大师', desc:'技能冷却 +5%/层 · 斩杀加成 +4%/层', max:3, req:33, mod:{cdReduction:5,executeBonus:4}},
        {key:'兽王宗师_l5ob', name:'兽王宗师', desc:'攻击 +1%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:3,mastery:2}}
      ,
{key:'tal_belq97', name:'兽群呼唤', desc:'攻击 +2%/层 · 额外攻击 +1%/层', max:5,req:38,mod:{atkPct:2,extraAtk:4}},{key:'tal_pr5je7', name:'万兽之王', desc:'敏捷 +8%/层 · 暴击 +3%/层', max:5,req:42,mod:{agiPct:8,crit:3}},{key:'tal_s5oa1w', name:'兽王至尊', desc:'攻击 +1%/层 · 吸血 +6%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:4,leech:6,mastery:2}}]},
      {key:'marks', name:'射击', icon:'🎯', masteryDesc:'瞄准射击暴伤 +6%/精通', talents:[
        {key:'致命射击_tspd', name:'致命射击', desc:'暴击 +1.5%/层', max:5, mod:{crit:1.5}},
        {key:'夺命射击_w4jc', name:'夺命射击', desc:'暴伤 +8%/层', max:5, mod:{critdPct:8}},
        {key:'穿透射击_19gc', name:'穿透射击', desc:'攻击 +1%/层', max:3, mod:{atkPct:1}},
        {key:'精确瞄准_69ig', name:'精确瞄准', desc:'额外攻击 +2%/层', max:5, mod:{extraAtk:3}},
        {key:'鹰眼_w2ji', name:'鹰眼', desc:'技能冷却 +4%/层', max:3, mod:{cdReduction:4}},
        {key:'瞄准射击_pdqq', name:'瞄准射击', desc:'解锁: 瞄准射击', max:1, req:10, unlockSkill:'aimed'},
        {key:'正中靶心_qm7b', name:'正中靶心', desc:'暴伤 +8%/层', max:5, req:15, mod:{critdPct:8}},
        {key:'狙击_1tn3', name:'狙击', desc:'攻击 +1%/层 · 暴击 +1.5%/层', max:5, req:18, mod:{atkPct:1,crit:1.5}},
        {key:'专注_79lf', name:'专注', desc:'攻速 +5%/层 · 减耗 +5%/层', max:3, req:22, mod:{spdPct:5,costReduction:5}},
        {key:'精确_63eb', name:'精确', desc:'攻击 +1%/层 · 暴伤 +5%/层', max:5, req:25, mod:{atkPct:1,critdPct:5}},
        {key:'远距射击_6oex', name:'远距射击', desc:'攻击 +2%/层 · 斩杀加成 +4%/层', max:5, req:28, mod:{atkPct:2,executeBonus:4}},
        {key:'神射手_ekaa', name:'神射手', desc:'暴伤 +10%/层 · 技能冷却 +3%/层', max:5, req:30, mod:{critdPct:10,cdReduction:3}},
        {key:'射击大师_ws7s', name:'射击大师', desc:'额外攻击 +1%/层 · 暴击 +2%/层', max:3, req:33, mod:{extraAtk:4,crit:2}},
        {key:'射击宗师_rqg8', name:'射击宗师', desc:'攻击 +1%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:3,mastery:2}}
      ,
{key:'tal_nz9rg3', name:'鹰眼', desc:'攻击 +2%/层 · 暴击 +2%/层', max:5,req:38,mod:{atkPct:2,crit:2}},{key:'tal_lz5es2', name:'神射手', desc:'暴伤 +12%/层 · 斩杀加成 +5%/层', max:5,req:42,mod:{critdPct:12,executeBonus:5}},{key:'tal_h72z0v', name:'箭神', desc:'攻击 +1%/层 · 额外攻击 +1%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:4,extraAtk:6,mastery:2}}]},
      {key:'survival', name:'生存', icon:'🪤', masteryDesc:'多重射击伤害 +3%/精通', talents:[
        {key:'求生专家_elwa', name:'求生专家', desc:'生命 +5%/层', max:5, mod:{hpPct:5}},
        {key:'野蛮_h6at', name:'野蛮', desc:'敏捷 +5%/层', max:5, mod:{agiPct:5}},
        {key:'陷阱专家_fqyo', name:'陷阱专家', desc:'防御 +6%/层', max:3, mod:{defPct:6}},
        {key:'钢陷阱_pwhk', name:'钢陷阱', desc:'全能 +2.5%/层', max:5, mod:{vers:2.5}},
        {key:'生存本能_d5ka', name:'生存本能', desc:'反伤 +2%/层', max:3, mod:{reflectDmg:2}},
        {key:'多重射击_mv08', name:'多重射击', desc:'解锁: 多重射击', max:1, req:10, unlockSkill:'multi'},
        {key:'独狼_40l8', name:'独狼', desc:'攻速 +8%/层', max:5, req:15, mod:{spdPct:8}},
        {key:'野火_a47o', name:'野火', desc:'攻击 +1%/层 · 吸血 +2%/层', max:5, req:18, mod:{atkPct:1,leech:2}},
        {key:'陷阱大师_cmzh', name:'陷阱大师', desc:'全能 +3%/层 · 持续伤害 +4%/层', max:3, req:22, mod:{vers:3,dotBonus:4}},
        {key:'生存专家_0dk2', name:'生存专家', desc:'生命 +5%/层 · 防御 +4%/层', max:5, req:25, mod:{hpPct:5,defPct:4}},
        {key:'猎手_cuzg', name:'猎手', desc:'攻击 +1%/层 · 斩杀加成 +4%/层', max:5, req:28, mod:{atkPct:1,executeBonus:4}},
        {key:'荒野_4uzv', name:'荒野', desc:'生命 +6%/层 · 攻击 +1%/层', max:5, req:30, mod:{hpPct:6,atkPct:1}},
        {key:'生存大师_kg8s', name:'生存大师', desc:'反伤 +4%/层 · 全能 +3%/层', max:3, req:33, mod:{reflectDmg:4,vers:3}},
        {key:'生存宗师_xi9p', name:'生存宗师', desc:'攻击 +1%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:3,mastery:2}}
      ,
{key:'tal_5u8399', name:'荒野求生', desc:'生命 +8%/层 · 全能 +4%/层', max:5,req:38,mod:{hpPct:8,vers:4}},{key:'tal_20kiyb', name:'陷阱之王', desc:'攻击 +2%/层 · 反伤 +4%/层', max:5,req:42,mod:{atkPct:2,reflectDmg:4}},{key:'tal_yhyekb', name:'生存至尊', desc:'攻击 +1%/层 · 防御 +8%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:4,defPct:8,mastery:2}}]},
    ],
  },

  shaman: {
    name:'萨满', icon:'🔱', emoji:'🧙‍♀️', color:'#0070de',
    desc:'锁甲元素使,与天地之力共鸣', primaryAttr:'智力',
    attackAttr:'int', resource:'法力', resKey:'mp',
    baseAttrs:{str:14, agi:12, int:18, spi:14, sta:14},
    baseStats:{hpMax:65, mpMax:85, atk:7, def:4, crit:6, critd:150, spd:1.0, reg:2},
    skills:{
      interrupt:{name:"风剪",icon:"💨",desc:"打断首领施法，冷却5秒",mp:12,type:"interrupt",cd:5,unlockLvl:1},
      lightning:      {name:'闪电箭', icon:'⚡', desc:'3倍攻击', mp:20, type:'dmg', mul:3, unlockLvl:1,castTime:2},
      flameShock:     {name:'烈焰震击',icon:'🔥', desc:'3倍攻击,持续灼烧', mp:22, type:'dmg', mul:3, dot:true, unlockLvl:14,castTime:0},
      earthShield:    {name:'大地之盾',icon:'🪨', desc:'15秒受到伤害降低33%', mp:35, type:'buff', buff:'earthShield', duration:15000, unlockLvl:28,castTime:0},
      chainLightning: {name:'闪电链', icon:'🌩️', desc:'4倍攻击', mp:35, type:'dmg', mul:4,castTime:2},
      healingWave:    {name:'治疗波', icon:'🌊', desc:'恢复35%生命', mp:30, type:'heal', heal:0.35,castTime:2.5},
      bloodlust:      {name:'嗜血',   icon:'🩸', desc:'15秒攻速+70%', mp:55, type:'buff', buff:'bloodlust', duration:15000, unlockLvl:46,castTime:0},
      windfury:       {name:'风怒武器',icon:'💨', desc:'15秒攻速+60%', mp:50, type:'buff', buff:'windfury', duration:15000,castTime:0},
      hex:{name:"妖术",icon:"🐸",desc:"3倍伤害,变形减速",mp:32,type:"dmg",mul:3,slow:true,unlockLvl:42},
      earthquake:{name:"地震术",icon:"🌍",desc:"3倍范围伤害+减速",mp:50,type:"dmg",mul:6,slow:true,unlockLvl:58},
      lavaBurst:    {name:'熔岩爆裂', icon:'🌋', desc:'3倍火焰伤害,必暴', mp:42, type:'dmg', mul:5, alwaysCrit:true, unlockLvl:38,castTime:2},
      spiritLink:   {name:'灵魂链接', icon:'🔗', desc:'恢复30%生命,15秒减伤30%', mp:50, type:'heal', heal:0.3, unlockLvl:54,castTime:0},
      thunderstorm: {name:'雷霆风暴', icon:'⛈️', desc:'7倍自然伤害', mp:58, type:'dmg', mul:7, unlockLvl:73,castTime:2},
    },
    trees:[
      {key:'element', name:'元素', icon:'⚡', masteryDesc:'闪电链伤害 +4%/精通', talents:[
        {key:'元素专精_fgqo', name:'元素专精', desc:'智力 +5%/层', max:5, mod:{intPct:5}},
        {key:'元素之怒_55mh', name:'元素之怒', desc:'暴伤 +8%/层', max:5, mod:{critdPct:8}},
        {key:'回响_4yt4', name:'回响', desc:'攻速 +5%/层', max:3, mod:{spdPct:5}},
        {key:'风暴之眼_tj2t', name:'风暴之眼', desc:'额外攻击 +1%/层', max:5, mod:{extraAtk:2}},
        {key:'元素掌握_5s91', name:'元素掌握', desc:'技能冷却 +4%/层', max:3, mod:{cdReduction:4}},
        {key:'闪电链_f5nb', name:'闪电链', desc:'解锁: 闪电链', max:1, req:10, unlockSkill:'chainLightning'},
        {key:'升腾_tp00', name:'升腾', desc:'攻击 +2%/层', max:5, req:15, mod:{atkPct:2}},
        {key:'风暴守护者_icnc', name:'风暴守护者', desc:'暴击 +1.5%/层 · 技能冷却 +3%/层', max:5, req:18, mod:{crit:1.5,cdReduction:3}},
        {key:'原始之力_14gr', name:'原始之力', desc:'攻击 +1%/层 · 智力 +3%/层', max:3, req:22, mod:{atkPct:1,intPct:3}},
        {key:'过载_64ei', name:'过载', desc:'攻击 +1%/层 · 暴伤 +5%/层', max:5, req:25, mod:{atkPct:1,critdPct:5}},
        {key:'闪电奔涌_4thr', name:'闪电奔涌', desc:'暴击 +2%/层 · 攻速 +4%/层', max:5, req:28, mod:{crit:2,spdPct:4}},
        {key:'元素之力_8obu', name:'元素之力', desc:'攻击 +2%/层 · 额外攻击 +2%/层', max:5, req:30, mod:{atkPct:2,extraAtk:3}},
        {key:'风暴_kx6t', name:'风暴', desc:'技能冷却 +5%/层 · 减耗 +5%/层', max:3, req:33, mod:{cdReduction:5,costReduction:5}},
        {key:'元素宗师_97ag', name:'元素宗师', desc:'攻击 +1%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:3,mastery:2}}
      ,
{key:'tal_mo6x3r', name:'雷霆之怒', desc:'攻击 +2%/层 · 技能冷却 +5%/层', max:5,req:38,mod:{atkPct:2,cdReduction:5}},{key:'tal_z1lero', name:'元素掌控', desc:'暴伤 +12%/层 · 额外攻击 +1%/层', max:5,req:42,mod:{critdPct:12,extraAtk:4}},{key:'tal_2kpfcs', name:'元素领主', desc:'攻击 +1%/层 · 减耗 +8%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:4,costReduction:8,mastery:2}}]},
      {key:'enhancement', name:'增强', icon:'💨', masteryDesc:'风怒武器攻速加成 +6%/精通', talents:[
        {key:'武器专精_wx6r', name:'武器专精', desc:'攻击 +1%/层', max:5, mod:{atkPct:1}},
        {key:'怒火_x06t', name:'怒火', desc:'攻速 +5%/层', max:5, mod:{spdPct:5}},
        {key:'静电_rqij', name:'静电', desc:'暴击 +2%/层', max:3, mod:{crit:2}},
        {key:'毁灭之风_oz70', name:'毁灭之风', desc:'额外攻击 +2%/层', max:5, mod:{extraAtk:3}},
        {key:'风暴之力_6wd5', name:'风暴之力', desc:'技能冷却 +4%/层', max:3, mod:{cdReduction:4}},
        {key:'风怒武器_jjta', name:'风怒武器', desc:'解锁: 风怒武器', max:1, req:10, unlockSkill:'windfury'},
        {key:'漩涡之力_r509', name:'漩涡之力', desc:'攻击 +2%/层', max:5, req:15, mod:{atkPct:2}},
        {key:'风暴之怒_g93o', name:'风暴之怒', desc:'攻速 +5%/层 · 攻击 +2%/层', max:5, req:18, mod:{spdPct:5,atkPct:1}},
        {key:'闪电打击_j65p', name:'闪电打击', desc:'暴击 +2%/层 · 技能冷却 +3%/层', max:3, req:22, mod:{crit:2,cdReduction:3}},
        {key:'元素武器_bm2r', name:'元素武器', desc:'攻击 +1%/层 · 吸血 +2%/层', max:5, req:25, mod:{atkPct:1,leech:2}},
        {key:'风怒_ctkt', name:'风怒', desc:'攻速 +7%/层 · 额外攻击 +1%/层', max:5, req:28, mod:{spdPct:7,extraAtk:2}},
        {key:'漩涡_26cn', name:'漩涡', desc:'攻击 +2%/层 · 暴伤 +5%/层', max:5, req:30, mod:{atkPct:2,critdPct:5}},
        {key:'增强大师_8hsm', name:'增强大师', desc:'技能冷却 +5%/层 · 减耗 +4%/层', max:3, req:33, mod:{cdReduction:5,costReduction:4}},
        {key:'增强宗师_7xq2', name:'增强宗师', desc:'攻击 +1%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:3,mastery:2}}
      ,
{key:'tal_r11ajl', name:'风暴', desc:'攻速 +8%/层 · 额外攻击 +1%/层', max:5,req:38,mod:{spdPct:8,extraAtk:4}},{key:'tal_8s2vb6', name:'狂怒风暴', desc:'攻击 +2%/层 · 暴击 +3%/层', max:5,req:42,mod:{atkPct:2,crit:3}},{key:'tal_hr0iny', name:'风暴领主', desc:'攻击 +1%/层 · 技能冷却 +6%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:4,cdReduction:6,mastery:2}}]},
      {key:'restoration', name:'恢复', icon:'🌊', masteryDesc:'治疗波回复量 +5%/精通', talents:[
        {key:'潮汐专精_iuma', name:'潮汐专精', desc:'精神 +5%/层', max:5, mod:{spiPct:5}},
        {key:'水之护盾_mxli', name:'水之护盾', desc:'防御 +5%/层', max:5, mod:{defPct:5}},
        {key:'激流_kcza', name:'激流', desc:'回复 +2%/层', max:3, mod:{regFlat:2}},
        {key:'先祖活力_a1z4', name:'先祖活力', desc:'治疗 +5%/层', max:5, mod:{healBonus:5}},
        {key:'先祖之魂_mbu5', name:'先祖之魂', desc:'生命 +5%/层', max:3, mod:{hpPct:5}},
        {key:'治疗波_qdyk', name:'治疗波', desc:'解锁: 治疗波', max:1, req:10, unlockSkill:'healingWave'},
        {key:'灵魂链接_6tet', name:'灵魂链接', desc:'生命 +6%/层', max:5, req:15, mod:{hpPct:6}},
        {key:'泉涌_qtm3', name:'泉涌', desc:'精神 +5%/层 · 治疗 +4%/层', max:5, req:18, mod:{spiPct:5,healBonus:4}},
        {key:'治疗之雨_intm', name:'治疗之雨', desc:'回复 +3%/层 · 治疗 +5%/层', max:3, req:22, mod:{regFlat:3,healBonus:5}},
        {key:'大地之盾_86t6', name:'大地之盾', desc:'防御 +5%/层 · 全能 +2%/层', max:5, req:25, mod:{defPct:5,vers:2}},
        {key:'先祖_ee1y', name:'先祖', desc:'治疗 +7%/层 · 生命 +4%/层', max:5, req:28, mod:{healBonus:7,hpPct:4}},
        {key:'潮汐_j3tn', name:'潮汐', desc:'回复 +4%/层 · 治疗 +5%/层', max:5, req:30, mod:{regFlat:4,healBonus:5}},
        {key:'恢复大师_m48a', name:'恢复大师', desc:'技能冷却 +5%/层 · 治疗 +5%/层', max:3, req:33, mod:{cdReduction:5,healBonus:5}},
        {key:'恢复宗师_fqhg', name:'恢复宗师', desc:'治疗 +12%/层 · 精通 +2%/层', max:3, req:36, mod:{healBonus:12,mastery:2}}
      ,
{key:'tal_qw36s6', name:'生命之泉', desc:'治疗 +8%/层 · 回复 +3%/层', max:5,req:38,mod:{healBonus:8,regFlat:3}},{key:'tal_sz1bbs', name:'先祖智慧', desc:'精神 +8%/层 · 治疗 +6%/层', max:5,req:42,mod:{spiPct:8,healBonus:6}},{key:'tal_sy9xob', name:'灵魂行者', desc:'治疗 +15%/层 · 全能 +5%/层 · 精通 +2%/层', max:3,req:45,mod:{healBonus:15,vers:5,mastery:2}}]},
    ],
  },

  paladin: {
    name:'圣骑士', icon:'✨', emoji:'👼', color:'#f58cba',
    desc:'板甲圣战士,圣光的化身', primaryAttr:'力量',
    attackAttr:'str', resource:'法力', resKey:'mp',
    baseAttrs:{str:18, agi:10, int:12, spi:12, sta:16},
    baseStats:{hpMax:75, mpMax:90, atk:7, def:6, crit:5, critd:150, spd:1.0, reg:2},
    skills:{
      interrupt:{name:"责难",icon:"⚖️",desc:"打断首领施法，冷却5秒",mp:15,type:"interrupt",cd:5,unlockLvl:1},
      judgement:    {name:'审判',       icon:'⚖️', desc:'2倍神圣伤害', mp:20, type:'dmg', mul:2, unlockLvl:1,castTime:0},
      consecration: {name:'奉献',       icon:'🔥', desc:'3倍攻击,范围圣光', mp:25, type:'dmg', mul:3, unlockLvl:12,castTime:0},
      holyLight:    {name:'圣光术',     icon:'✨', desc:'恢复40%生命', mp:35, type:'heal', heal:0.4,castTime:2.5},
      crusader:     {name:'十字军打击', icon:'⚔️', desc:'3倍攻击,必定暴击', mp:30, type:'dmg', mul:3, alwaysCrit:true,castTime:0},
      blessingKings:{name:'王者祝福',   icon:'👑', desc:'15秒全属性+20%', mp:45, type:'buff', buff:'kings', duration:15000, unlockLvl:34,castTime:0},
      avengingWrath:{name:'复仇之怒',   icon:'😇', desc:'15秒攻击+50%', mp:50, type:'buff', buff:'bestial', duration:15000, unlockLvl:46,castTime:0},
      divineShield: {name:'圣盾术',     icon:'🛡️', desc:'15秒减伤80%', mp:60, type:'buff', buff:'divine', duration:15000,castTime:0},
      hammerOfRighteous:{name:"正义之锤",icon:"🔨",desc:"3倍远程神圣伤害",mp:30,type:"dmg",mul:4,unlockLvl:44},
      flashOfLight:{name:"圣光闪现",icon:"💫",desc:"恢复25%生命",mp:25,type:"heal",heal:0.25,unlockLvl:55},
      holyWrath:    {name:'神圣愤怒', icon:'😡', desc:'3倍范围神圣伤害', mp:32, type:'dmg', mul:3, unlockLvl:30,castTime:0},
      sacredShield: {name:'圣洁护盾', icon:'💠', desc:'15秒减伤40%,回复+5/秒', mp:45, type:'buff', buff:'sacredShield', duration:15000, unlockLvl:54,castTime:0},
      seraphim:     {name:'炽天使',   icon:'👼', desc:'15秒攻击+60%,全能+10%', mp:65, type:'buff', buff:'seraphim', duration:15000, unlockLvl:76,castTime:0},
    },
    trees:[
      {key:'holy', name:'神圣', icon:'✨', masteryDesc:'圣光术回复量 +5%/精通', talents:[
        {key:'illumination',name:'光明',     desc:'精神 +5%/层', max:5, mod:{spiPct:5}},
        {key:'divinity',    name:'神性',     desc:'智力 +5%/层', max:5, mod:{intPct:5}},
        {key:'sanctified',  name:'圣化',     desc:'回复 +2/层', max:3, mod:{regFlat:2}},
        {key:'hlUnlock',    name:'圣光术',   desc:'解锁: 圣光术', max:1, req:10, unlockSkill:'holyLight'},
        {key:'beacon',      name:'圣光信标', desc:'生命 +8%/层', max:3, req:15, mod:{hpPct:8}},

	        {key:'maelstrom2',name:'风暴之力',desc:'暴击+2%/层', max:3, req:18, mod:{crit:2}},
	        {key:'windfury2',name:'风暴之怒',desc:'攻速+6%/层,攻击+4%/层', max:3, req:22, mod:{spdPct:6,atkPct:1}},
      ]},
      {key:'prot', name:'防护', icon:'🛡️', masteryDesc:'圣盾术减伤效果 +4%/精通', talents:[
        {key:'toughness',    name:'坚韧',     desc:'生命 +5%/层', max:5, mod:{hpPct:5}},
        {key:'anticipation', name:'预判',     desc:'防御 +5%/层', max:5, mod:{defPct:5}},
        {key:'bulwark',      name:'壁垒',     desc:'耐力 +5%/层', max:3, mod:{staPct:5}},
        {key:'dsUnlock',     name:'圣盾术',   desc:'解锁: 圣盾术', max:1, req:10, unlockSkill:'divineShield'},
        {key:'ardent',       name:'炽热防御者',desc:'防御 +10%/层', max:3, req:15, mod:{defPct:10}},

	        {key:'spiritLink2',name:'先祖之魂',desc:'生命+6%/层', max:3, req:18, mod:{hpPct:6}},
	        {key:'healingRain',name:'治疗之雨',desc:'回复+3/层', max:3, req:22, mod:{regFlat:3}},
      ]},
      {key:'ret', name:'惩戒', icon:'⚔️', masteryDesc:'十字军打击伤害 +3%/精通', talents:[
        {key:'复仇_vhng', name:'复仇', desc:'攻击 +1%/层', max:5, mod:{atkPct:1}},
        {key:'圣洁_d4ul', name:'圣洁', desc:'暴伤 +8%/层', max:5, mod:{critdPct:8}},
        {key:'狂热_tq6y', name:'狂热', desc:'攻速 +5%/层', max:3, mod:{spdPct:5}},
        {key:'审判官_x8uo', name:'审判官', desc:'额外攻击 +1%/层', max:5, mod:{extraAtk:2}},
        {key:'圣战_554n', name:'圣战', desc:'技能冷却 +4%/层', max:3, mod:{cdReduction:4}},
        {key:'十字军打击_eeqv', name:'十字军打击', desc:'解锁: 十字军打击', max:1, req:10, unlockSkill:'crusader'},
        {key:'圣殿骑士_erj9', name:'圣殿骑士', desc:'攻击 +2%/层', max:5, req:15, mod:{atkPct:2}},
        {key:'神圣风暴_gg1s', name:'神圣风暴', desc:'攻击 +1%/层 · 攻速 +4%/层', max:5, req:18, mod:{atkPct:1,spdPct:4}},
        {key:'行刑者_49sa', name:'行刑者', desc:'斩杀加成 +5%/层 · 暴击 +1.5%/层', max:3, req:22, mod:{executeBonus:5,crit:1.5}},
        {key:'神圣之力_qr4h', name:'神圣之力', desc:'攻击 +1%/层 · 暴伤 +5%/层', max:5, req:25, mod:{atkPct:1,critdPct:5}},
        {key:'圣光之刃_3unr', name:'圣光之刃', desc:'攻击 +2%/层 · 暴击 +1.5%/层', max:5, req:28, mod:{atkPct:2,crit:1.5}},
        {key:'黎明_g4ek', name:'黎明', desc:'攻击 +1%/层 · 额外攻击 +2%/层', max:5, req:30, mod:{atkPct:1,extraAtk:3}},
        {key:'惩戒大师_psyh', name:'惩戒大师', desc:'技能冷却 +5%/层 · 斩杀加成 +4%/层', max:3, req:33, mod:{cdReduction:5,executeBonus:4}},
        {key:'惩戒宗师_c3xi', name:'惩戒宗师', desc:'攻击 +1%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:3,mastery:2}}
      ,
{key:'tal_v97irx', name:'神圣复仇', desc:'攻击 +2%/层 · 暴伤 +6%/层', max:5,req:38,mod:{atkPct:2,critdPct:6}},{key:'tal_j4xnxx', name:'圣光之怒', desc:'额外攻击 +1%/层 · 斩杀加成 +5%/层', max:5,req:42,mod:{extraAtk:5,executeBonus:5}},{key:'tal_6df7gn', name:'复仇天使', desc:'攻击 +1%/层 · 暴击 +3%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:4,crit:3,mastery:2}}]},
    ],
  },

  warlock: {
    name:'术士', icon:'💀', emoji:'🧛', color:'#9482c9',
    desc:'布甲邪能使,以痛苦为食', primaryAttr:'智力',
    attackAttr:'int', resource:'法力', resKey:'mp',
    baseAttrs:{str:7, agi:9, int:22, spi:14, sta:13},
    baseStats:{hpMax:55, mpMax:90, atk:6, def:2, crit:7, critd:150, spd:1.0, reg:2},
    skills:{
      interrupt:{name:"法术封锁",icon:"🔇",desc:"打断首领施法，冷却5秒",mp:12,type:"interrupt",cd:5,unlockLvl:1},
      shadowBolt: {name:'暗影箭',   icon:'🌑', desc:'3倍攻击', mp:20, type:'dmg', mul:3, unlockLvl:1,castTime:2.5},
      immolate:   {name:'献祭',     icon:'🔥', desc:'3倍攻击,持续灼烧', mp:22, type:'dmg', mul:3, dot:true, unlockLvl:12,castTime:1.5},
      corruption: {name:'腐蚀术',   icon:'🧿', desc:'3倍攻击,持续腐蚀', mp:25, type:'dmg', mul:3, dot:true,castTime:0},
      drainLife:  {name:'生命分流', icon:'🩸', desc:'3倍攻击,吸血80%', mp:40, type:'dmg', mul:4, lifeSteal:0.8,castTime:2},
      fear:       {name:'恐惧',     icon:'👁️', desc:'3倍攻击,降低敌人攻速', mp:28, type:'dmg', mul:3, slow:true, unlockLvl:28,castTime:1.5},
      chaosBolt:  {name:'混乱之箭', icon:'☄️', desc:'8倍攻击,无视防御', mp:55, type:'dmg', mul:8, alwaysCrit:true, unlockLvl:48,castTime:3},
      incinerate: {name:'烧尽',     icon:'🔥', desc:'3倍攻击伤害', mp:50, type:'dmg', mul:5,castTime:2},
      shadowFury:{name:"暗影之怒",icon:"💢",desc:"3倍范围伤害+减速",mp:42,type:"dmg",mul:5,slow:true,unlockLvl:44,weaken:true},
      soulFire:{name:"灵魂之火",icon:"💀",desc:"3倍伤害,必暴",mp:55,type:"dmg",mul:8,alwaysCrit:true,unlockLvl:62},
      unstableAffliction:{name:'痛苦无常',icon:'💜', desc:'3倍攻击,持续痛苦', mp:38, type:'dmg', mul:4, dot:true, unlockLvl:36,castTime:1.5},
      inferno:      {name:'召唤地狱火',icon:'🔥', desc:'召唤1只地狱火持续22秒助战', mp:55, type:'summon', summonCount:1, summonCap:1, summonTheme:'demon', summonDuration:22000, summonPower:1.16, unlockLvl:58, castTime:2.5, cd:26},
      metamorphosis:{name:'恶魔变身', icon:'😈', desc:'20秒攻击+50%,吸血+15%', mp:70, type:'buff', buff:'demonForm', duration:20000, unlockLvl:78,castTime:0},
    },
    trees:[
      {key:'affliction', name:'痛苦', icon:'🧿', masteryDesc:'腐蚀术持续伤害 +5%/精通', talents:[
        {key:'苦痛_rf1z', name:'苦痛', desc:'攻击 +1%/层', max:5, mod:{atkPct:1}},
        {key:'黑暗契约_pfkb', name:'黑暗契约', desc:'智力 +5%/层', max:5, mod:{intPct:5}},
        {key:'瘟疫蔓延_tigp', name:'瘟疫蔓延', desc:'暴击 +1.5%/层', max:3, mod:{crit:1.5}},
        {key:'鬼影缠身_ra3d', name:'鬼影缠身', desc:'持续伤害 +5%/层', max:5, mod:{dotBonus:5}},
        {key:'灵魂虹吸_swlw', name:'灵魂虹吸', desc:'吸血 +2%/层', max:3, mod:{leech:2}},
        {key:'腐蚀术_any9', name:'腐蚀术', desc:'解锁: 腐蚀术', max:1, req:10, unlockSkill:'corruption'},
        {key:'痛苦无常_g3z5', name:'痛苦无常', desc:'攻击 +2%/层', max:5, req:15, mod:{atkPct:2}},
        {key:'无尽痛苦_h7bz', name:'无尽痛苦', desc:'持续伤害 +6%/层 · 技能冷却 +3%/层', max:5, req:18, mod:{dotBonus:6,cdReduction:3}},
        {key:'灵魂交换_czti', name:'灵魂交换', desc:'暴伤 +8%/层 · 智力 +3%/层', max:3, req:22, mod:{critdPct:8,intPct:3}},
        {key:'苦痛_154n', name:'苦痛', desc:'攻击 +1%/层 · 持续伤害 +4%/层', max:5, req:25, mod:{atkPct:1,dotBonus:4}},
        {key:'瘟疫_j23m', name:'瘟疫', desc:'持续伤害 +7%/层 · 斩杀加成 +3%/层', max:5, req:28, mod:{dotBonus:7,executeBonus:3}},
        {key:'诅咒_p59u', name:'诅咒', desc:'攻击 +2%/层 · 暴击 +1.5%/层', max:5, req:30, mod:{atkPct:2,crit:1.5}},
        {key:'痛苦大师_xv69', name:'痛苦大师', desc:'持续伤害 +8%/层 · 吸血 +3%/层', max:3, req:33, mod:{dotBonus:8,leech:3}},
        {key:'痛苦宗师_06z2', name:'痛苦宗师', desc:'攻击 +1%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:3,mastery:2}}
      ,
{key:'tal_10ra21', name:'无尽痛苦', desc:'持续伤害 +8%/层 · 吸血 +4%/层', max:5,req:38,mod:{dotBonus:8,leech:4}},{key:'tal_jix3v7', name:'灵魂凋零', desc:'攻击 +2%/层 · 斩杀加成 +5%/层', max:5,req:42,mod:{atkPct:2,executeBonus:5}},{key:'tal_980cwe', name:'痛苦之王', desc:'攻击 +1%/层 · 持续伤害 +10%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:4,dotBonus:10,mastery:2}}]},
      {key:'demonology', name:'恶魔学识', icon:'😈', masteryDesc:'生命分流吸血效果 +6%/精通', talents:[
        {key:'法力之源_vri6', name:'法力之源', desc:'生命 +4%/层', max:5, mod:{hpPct:4}},
        {key:'恶魔之拥_8xij', name:'恶魔之拥', desc:'生命 +5%/层', max:5, mod:{hpPct:5}},
        {key:'邪甲术_03th', name:'邪甲术', desc:'防御 +6%/层', max:3, mod:{defPct:6}},
        {key:'强化恶魔_lv28', name:'强化恶魔', desc:'攻击 +1%/层', max:5, mod:{atkPct:1}},
        {key:'恶魔皮肤_z5xt', name:'恶魔皮肤', desc:'反伤 +2%/层', max:3, mod:{reflectDmg:2}},
        {key:'生命分流_sdc7', name:'生命分流', desc:'解锁: 生命分流', max:1, req:10, unlockSkill:'drainLife'},
        {key:'恶魔变形_ao5c', name:'恶魔变形', desc:'攻击 +2%/层', max:5, req:15, mod:{atkPct:2}},
        {key:'小鬼成群_85l6', name:'小鬼成群', desc:'攻速 +4%/层 · 攻击 +2%/层', max:5, req:18, mod:{spdPct:4,atkPct:1}},
        {key:'灵魂链接_e01b', name:'灵魂链接', desc:'生命 +5%/层 · 吸血 +2%/层', max:3, req:22, mod:{hpPct:5,leech:2}},
        {key:'邪能领主_ko0x', name:'邪能领主', desc:'攻击 +1%/层 · 全能 +2%/层', max:5, req:25, mod:{atkPct:1,vers:2}},
        {key:'恶魔之力_93ih', name:'恶魔之力', desc:'攻击 +2%/层 · 吸血 +2%/层', max:5, req:28, mod:{atkPct:2,leech:2}},
        {key:'黑暗_da7r', name:'黑暗', desc:'生命 +6%/层 · 攻击 +1%/层', max:5, req:30, mod:{hpPct:6,atkPct:1}},
        {key:'恶魔大师_u7up', name:'恶魔大师', desc:'反伤 +4%/层 · 技能冷却 +3%/层', max:3, req:33, mod:{reflectDmg:4,cdReduction:3}},
        {key:'恶魔宗师_w3lg', name:'恶魔宗师', desc:'攻击 +1%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:3,mastery:2}}
      ,
{key:'tal_ymsi4c', name:'恶魔军团', desc:'攻击 +2%/层 · 攻速 +5%/层', max:5,req:38,mod:{atkPct:2,spdPct:5}},{key:'tal_kt8luu', name:'邪能', desc:'生命 +8%/层 · 反伤 +5%/层', max:5,req:42,mod:{hpPct:8,reflectDmg:5}},{key:'tal_frgmc2', name:'恶魔之王', desc:'攻击 +1%/层 · 吸血 +6%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:4,leech:6,mastery:2}}]},
      {key:'destruction', name:'毁灭', icon:'🔥', masteryDesc:'烧尽伤害 +3%/精通', talents:[
        {key:'毁灭专精_cqof', name:'毁灭专精', desc:'暴击 +1.5%/层', max:5, mod:{crit:1.5}},
        {key:'毁灭_b9eu', name:'毁灭', desc:'暴伤 +8%/层', max:5, mod:{critdPct:8}},
        {key:'爆燃_q33b', name:'爆燃', desc:'攻速 +5%/层', max:3, mod:{spdPct:5}},
        {key:'余烬风暴_6dz6', name:'余烬风暴', desc:'额外攻击 +1%/层', max:5, mod:{extraAtk:2}},
        {key:'火焰之雨_qu0x', name:'火焰之雨', desc:'技能冷却 +4%/层', max:3, mod:{cdReduction:4}},
        {key:'烧尽_9vg7', name:'烧尽', desc:'解锁: 烧尽', max:1, req:10, unlockSkill:'incinerate'},
        {key:'浩劫_t70a', name:'浩劫', desc:'攻击 +2%/层', max:5, req:15, mod:{atkPct:2}},
        {key:'毁灭烈焰_mf6z', name:'毁灭烈焰', desc:'暴伤 +8%/层 · 攻击 +2%/层', max:5, req:18, mod:{critdPct:8,atkPct:1}},
        {key:'大灾变_s7bc', name:'大灾变', desc:'攻击 +1%/层 · 减耗 +5%/层', max:3, req:22, mod:{atkPct:1,costReduction:5}},
        {key:'混沌_35iu', name:'混沌', desc:'暴伤 +8%/层 · 技能冷却 +3%/层', max:5, req:25, mod:{critdPct:8,cdReduction:3}},
        {key:'火雨_vd37', name:'火雨', desc:'攻击 +2%/层 · 额外攻击 +1%/层', max:5, req:28, mod:{atkPct:2,extraAtk:2}},
        {key:'末日_xdn3', name:'末日', desc:'攻击 +1%/层 · 斩杀加成 +5%/层', max:5, req:30, mod:{atkPct:1,executeBonus:5}},
        {key:'毁灭大师_hocz', name:'毁灭大师', desc:'技能冷却 +5%/层 · 暴击 +2%/层', max:3, req:33, mod:{cdReduction:5,crit:2}},
        {key:'毁灭宗师_g5ki', name:'毁灭宗师', desc:'攻击 +1%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:3,mastery:2}}
      ,
{key:'tal_b7fe6p', name:'混沌之雨', desc:'攻击 +2%/层 · 暴伤 +6%/层', max:5,req:38,mod:{atkPct:2,critdPct:6}},{key:'tal_4qj3im', name:'末日降临', desc:'斩杀加成 +8%/层 · 技能冷却 +5%/层', max:5,req:42,mod:{executeBonus:8,cdReduction:5}},{key:'tal_hw275i', name:'毁灭之王', desc:'攻击 +1%/层 · 暴击 +4%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:4,crit:4,mastery:2}}]},
    ],
  },

  druid: {
    name:'德鲁伊', icon:'🐻', emoji:'🐺', color:'#ff7d0a',
    desc:'皮甲变形者,自然的守护者', primaryAttr:'敏捷',
    attackAttr:'agi', resource:'法力', resKey:'mp',
    baseAttrs:{str:14, agi:16, int:14, spi:13, sta:14},
    baseStats:{hpMax:65, mpMax:85, atk:7, def:4, crit:7, critd:150, spd:1.1, reg:2},
    skills:{
      interrupt:{name:"日光术",icon:"☀️",desc:"打断首领施法，冷却5秒",mp:12,type:"interrupt",cd:5,unlockLvl:1},
      wrath:       {name:'愤怒',     icon:'🌿', desc:'2倍自然伤害', mp:15, type:'dmg', mul:2, unlockLvl:1,castTime:1.5},
      swipe:       {name:'横扫',     icon:'🐾', desc:'2倍攻击范围伤害', mp:22, type:'dmg', mul:2, unlockLvl:12,castTime:0},
      rejuvenation:{name:'回春术',   icon:'🍃', desc:'恢复35%生命', mp:28, type:'heal', heal:0.35, unlockLvl:22,castTime:0},
      moonfire:    {name:'月火术',   icon:'🌙', desc:'3倍攻击,持续灼烧', mp:25, type:'dmg', mul:3, dot:true,castTime:0},
      bite:        {name:'凶猛撕咬', icon:'🦷', desc:'3倍攻击,必定暴击', mp:35, type:'dmg', mul:4, alwaysCrit:true,castTime:0},
      berserk:     {name:'狂暴',     icon:'💢', desc:'15秒攻击+40%攻速+30%', mp:50, type:'buff', buff:'berserk', duration:15000, unlockLvl:44,castTime:0},
      barkskin:    {name:'树皮术',   icon:'🪵', desc:'15秒受到伤害降低40%', mp:50, type:'buff', buff:'bark', duration:15000,castTime:0},
      starfire:{name:"星火术",icon:"⭐",desc:"3倍奥术伤害,2.5秒读条",mp:45,type:"dmg",mul:5,castTime:2.5,unlockLvl:40},
      wildGrowth:{name:"野性成长",icon:"🌺",desc:"恢复30%生命",mp:35,type:"heal",heal:0.3,unlockLvl:55},
      entanglingRoots:{name:'纠缠根须',icon:'🌿', desc:'3倍自然伤害,缠绕减速', mp:28, type:'dmg', mul:3, slow:true, unlockLvl:32,castTime:1.5},
      hurricane:    {name:'飓风',     icon:'🌀', desc:'5倍自然范围伤害', mp:48, type:'dmg', mul:5, unlockLvl:56,castTime:2},
      tranquility:  {name:'宁静',     icon:'🌟', desc:'恢复45%生命', mp:58, type:'heal', heal:0.45, unlockLvl:74,castTime:2.5},
    },
    trees:[
      {key:'balance', name:'平衡', icon:'🌙', masteryDesc:'月火术持续伤害 +4%/精通', talents:[
        {key:'月辉_w12f', name:'月辉', desc:'智力 +5%/层', max:5, mod:{intPct:5}},
        {key:'自然之握_0jxw', name:'自然之握', desc:'暴击 +1.5%/层', max:5, mod:{crit:1.5}},
        {key:'日月之蚀_v65a', name:'日月之蚀', desc:'暴伤 +8%/层', max:3, mod:{critdPct:8}},
        {key:'星辰耀斑_pd4e', name:'星辰耀斑', desc:'持续伤害 +5%/层', max:5, mod:{dotBonus:5}},
        {key:'繁星_eh0f', name:'繁星', desc:'技能冷却 +4%/层', max:3, mod:{cdReduction:4}},
        {key:'月火术_25hh', name:'月火术', desc:'解锁: 月火术', max:1, req:10, unlockSkill:'moonfire'},
        {key:'星辰坠落_4ilg', name:'星辰坠落', desc:'攻击 +2%/层', max:5, req:15, mod:{atkPct:2}},
        {key:'月火之雨_jaxm', name:'月火之雨', desc:'攻击 +1%/层 · 智力 +3%/层', max:5, req:18, mod:{atkPct:1,intPct:3}},
        {key:'天体_nrrx', name:'天体', desc:'攻击 +1%/层 · 技能冷却 +3%/层', max:3, req:22, mod:{atkPct:1,cdReduction:3}},
        {key:'自然之力_se1j', name:'自然之力', desc:'持续伤害 +6%/层 · 攻速 +3%/层', max:5, req:25, mod:{dotBonus:6,spdPct:3}},
        {key:'星辰_p1jw', name:'星辰', desc:'攻击 +2%/层 · 暴伤 +5%/层', max:5, req:28, mod:{atkPct:2,critdPct:5}},
        {key:'宇宙_l0zt', name:'宇宙', desc:'攻击 +1%/层 · 暴击 +2%/层', max:5, req:30, mod:{atkPct:1,crit:2}},
        {key:'平衡大师_jz5z', name:'平衡大师', desc:'技能冷却 +5%/层 · 持续伤害 +5%/层', max:3, req:33, mod:{cdReduction:5,dotBonus:5}},
        {key:'平衡宗师_kn9s', name:'平衡宗师', desc:'攻击 +1%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:3,mastery:2}}
      ,
{key:'tal_bji6d5', name:'星辰之怒', desc:'攻击 +2%/层 · 持续伤害 +5%/层', max:5,req:38,mod:{atkPct:2,dotBonus:5}},{key:'tal_n2ivt5', name:'银河', desc:'智力 +8%/层 · 技能冷却 +5%/层', max:5,req:42,mod:{intPct:8,cdReduction:5}},{key:'tal_0ntb43', name:'星界行者', desc:'攻击 +1%/层 · 暴伤 +10%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:4,critdPct:10,mastery:2}}]},
      {key:'feral', name:'野性', icon:'🐺', masteryDesc:'凶猛撕咬伤害 +4%/精通', talents:[
        {key:'掠食者_kl5n', name:'掠食者', desc:'攻击 +1%/层', max:5, mod:{atkPct:1}},
        {key:'锋利利爪_f0ll', name:'锋利利爪', desc:'攻速 +5%/层', max:5, mod:{spdPct:5}},
        {key:'野蛮咆哮_1zls', name:'野蛮咆哮', desc:'敏捷 +5%/层', max:3, mod:{agiPct:5}},
        {key:'血爪_9sso', name:'血爪', desc:'吸血 +2%/层', max:5, mod:{leech:2}},
        {key:'野性之心_gnjw', name:'野性之心', desc:'技能冷却 +4%/层', max:3, mod:{cdReduction:4}},
        {key:'凶猛撕咬_stqc', name:'凶猛撕咬', desc:'解锁: 凶猛撕咬', max:1, req:10, unlockSkill:'bite'},
        {key:'顶级掠食者_j56p', name:'顶级掠食者', desc:'攻击 +2%/层', max:5, req:15, mod:{atkPct:2}},
        {key:'兽群之王_7p9m', name:'兽群之王', desc:'暴击 +2%/层 · 攻速 +3%/层', max:5, req:18, mod:{crit:2,spdPct:3}},
        {key:'野性怒吼_6z8m', name:'野性怒吼', desc:'攻击 +1%/层 · 额外攻击 +2%/层', max:3, req:22, mod:{atkPct:1,extraAtk:3}},
        {key:'掠食本能_ezb2', name:'掠食本能', desc:'攻击 +1%/层 · 吸血 +2%/层', max:5, req:25, mod:{atkPct:1,leech:2}},
        {key:'撕咬_hpp3', name:'撕咬', desc:'攻击 +2%/层 · 斩杀加成 +4%/层', max:5, req:28, mod:{atkPct:2,executeBonus:4}},
        {key:'狂野_vjm0', name:'狂野', desc:'暴伤 +8%/层 · extraAtk +3%/层', max:5, req:30, mod:{critdPct:8,extraAtk:3}},
        {key:'野性大师_035n', name:'野性大师', desc:'技能冷却 +5%/层 · 暴击 +2%/层', max:3, req:33, mod:{cdReduction:5,crit:2}},
        {key:'野性宗师_016z', name:'野性宗师', desc:'攻击 +1%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:3,mastery:2}}
      ,
{key:'tal_dw1ibr', name:'掠食本能', desc:'攻击 +2%/层 · 吸血 +4%/层', max:5,req:38,mod:{atkPct:2,leech:4}},{key:'tal_cx76zw', name:'兽群之王', desc:'攻速 +8%/层 · 暴击 +3%/层', max:5,req:42,mod:{spdPct:8,crit:3}},{key:'tal_n4yxop', name:'荒野之王', desc:'攻击 +1%/层 · 斩杀加成 +8%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:4,executeBonus:8,mastery:2}}]},
      {key:'resto', name:'恢复', icon:'🌿', masteryDesc:'回春术回复量 +5%/精通', talents:[
        {key:'微妙_qnek', name:'微妙', desc:'精神 +5%/层', max:5, mod:{spiPct:5}},
        {key:'自然学家_x0a2', name:'自然学家', desc:'生命 +5%/层', max:5, mod:{hpPct:5}},
        {key:'自然之赐_ycok', name:'自然之赐', desc:'回复 +2%/层', max:3, mod:{regFlat:2}},
        {key:'萌芽_jq1m', name:'萌芽', desc:'治疗 +5%/层', max:5, mod:{healBonus:5}},
        {key:'繁盛_0e50', name:'繁盛', desc:'技能冷却 +3%/层', max:3, mod:{cdReduction:3}},
        {key:'树皮术_jx8a', name:'树皮术', desc:'解锁: 树皮术', max:1, req:10, unlockSkill:'barkskin'},
        {key:'生命之树_bsfg', name:'生命之树', desc:'生命 +6%/层', max:5, req:15, mod:{hpPct:6}},
        {key:'春花_avkt', name:'春花', desc:'精神 +5%/层 · 治疗 +4%/层', max:5, req:18, mod:{spiPct:5,healBonus:4}},
        {key:'生命之力_2aov', name:'生命之力', desc:'生命 +5%/层 · 治疗 +5%/层', max:3, req:22, mod:{hpPct:5,healBonus:5}},
        {key:'自然守护_iaf5', name:'自然守护', desc:'防御 +5%/层 · 全能 +2%/层', max:5, req:25, mod:{defPct:5,vers:2}},
        {key:'愈合_plpk', name:'愈合', desc:'治疗 +7%/层 · 回复 +2%/层', max:5, req:28, mod:{healBonus:7,regFlat:2}},
        {key:'复苏_qv2o', name:'复苏', desc:'生命 +6%/层 · 治疗 +5%/层', max:5, req:30, mod:{hpPct:6,healBonus:5}},
        {key:'恢复大师_u0aa', name:'恢复大师', desc:'技能冷却 +4%/层 · 治疗 +5%/层', max:3, req:33, mod:{cdReduction:4,healBonus:5}},
        {key:'恢复宗师_f473', name:'恢复宗师', desc:'治疗 +12%/层 · 精通 +2%/层', max:3, req:36, mod:{healBonus:12,mastery:2}}
      ,
{key:'tal_dq1zl9', name:'自然之愈', desc:'治疗 +8%/层 · 生命 +5%/层', max:5,req:38,mod:{healBonus:8,hpPct:5}},{key:'tal_gvfwv6', name:'永续', desc:'回复 +5%/层 · 精神 +6%/层', max:5,req:42,mod:{regFlat:5,spiPct:6}},{key:'tal_tsnlze', name:'自然之灵', desc:'治疗 +15%/层 · 技能冷却 +5%/层 · 精通 +2%/层', max:3,req:45,mod:{healBonus:15,cdReduction:5,mastery:2}}]},
    ],
  },
};

// 把误挂在职业对象顶层的技能条目并回 skills 表,避免天赋/自动施法引用到“看得见却用不了”的技能
(function normalizeClassSkills(){
  for (const cls of Object.values(CLASSES || {})) {
    if (!cls || typeof cls !== 'object') continue;
    if (!cls.skills) cls.skills = {};
    for (const [key, value] of Object.entries(cls)) {
      if (key === 'skills' || key === 'trees') continue;
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
      if (!value.name || !value.icon || !value.type) continue;
      if (!cls.skills[key]) cls.skills[key] = value;
    }
  }
})();

/* ---------- 艾泽拉斯地图(20 张真实地图) ---------- */
const MAPS = [
  { key:'elwynn', name:'艾尔文森林', icon:'🌲', faction:'联盟', lvlRange:[1,10],
    desc:'暴风城外的宁静森林,人类家园',
    sub:[
      { name:'北郡修道院',   lvl:[1,4],  mobs:'🐺野狼幼崽|🕷️北郡仇恨蛛|💀北郡食尸鬼|🐗灰背野猪' },
      { name:'闪金镇',       lvl:[5,7],  mobs:'🐺凶猛森林狼|🐗暮色野猪|👤迪菲亚劫匪|🦨被腐化的野兽' },
      { name:'东谷伐木场',   lvl:[8,10], mobs:'🪓迪菲亚拦路贼|🧙迪菲亚法师|🐻东谷棕熊|👤迪菲亚守卫' },
    ],
    boss:{ name:'霍格', emoji:'🐗', lvl:12, desc:'臭名昭著的豺狼人头目',
      passive:{dmgReduction:0.05,
      tricks: [{name:"铁壁",icon:"🛡️",desc:"接下来5秒防御提升50%",defBuff:5},{name:"战斗狂怒",icon:"🔥",desc:"接下来5秒攻击+40%且吸血15%",atkBuff:5,leechBuff:5},{name:"不死之躯",icon:"💀",desc:"接下来5秒防御+50%且吸血20%",defBuff:5,leechBuff:5}] },
      skills:[{name:"猛击",icon:"💥",desc:"2.5倍伤害",type:"dmg",mul:2.5,castTime:1,stun:true}] } },
  { key:'tirisfal', name:'提瑞斯法林地', icon:'⚰️', faction:'部落', lvlRange:[1,10],
    desc:'被遗忘者的家园,瘟疫笼罩的故土',
    sub:[
      { name:'死亡之痕',     lvl:[1,4],  mobs:'🐺枯草狼|🕷️瘟疫蜘蛛|🦅腐肉啄食者|🐀瘟疫鼠' },
      { name:'布瑞尔废墟',   lvl:[5,7],  mobs:'💀斯卡矶卫兵|👻闪光怨灵|🧟黏滑污泥|🦴白骨爬虫' },
      { name:'诅咒之地外围', lvl:[8,10], mobs:'👤斯坦索姆侦察兵|🧙堕落法师|🐺月夜狼|💀亡灵步兵' },
    ],
    boss:{ name:'纳尔图', emoji:'🧟', lvl:12, desc:'被遗忘者的叛徒',
      passive:{critChance:0.15,
      tricks: [{name:"连斩",icon:"🗡️",desc:"下一次攻击造成两次伤害",nextDouble:2},{name:"双刃",icon:"⚔️",desc:"下一次攻击造成双倍伤害",nextDouble:1},{name:"终极防御",icon:"🛡️",desc:"回复20%生命且接下来5秒防御+50%",defBuff:5,healPct:0.2}] },
      skills:[{name:"暗影打击",icon:"🌑",desc:"2.5倍暗影伤害",type:"dmg",mul:2.5,castTime:1}] } },
  { key:'durotar', name:'杜隆塔尔', icon:'🌵', faction:'部落', lvlRange:[1,10],
    desc:'兽人在卡利姆多的红色家园',
    sub:[
      { name:'剃刀岭',     lvl:[1,4],  mobs:'🐗剃刀岭野猪|🦨被腐化的猛犸|💀血色幽灵|🦂沙漠蝎子' },
      { name:'火山之路',   lvl:[5,7],  mobs:'🦂沙鳞双足飞龙|🐊瑟拉摩鳄鱼|🦎沼泽蜥蜴|🪲毒刺' },
      { name:'雷霆崖外围', lvl:[8,10], mobs:'🦣战鹰|🐗剃刀沼泽巨猪|🐺荆棘谷的猎犬|🌪️风暴元素' },
    ],
    boss:{ name:'战丸', emoji:'🦂', lvl:12, desc:'剃刀岭的野兽王',
      passive:{atkBonus:0.15,
      tricks: [{name:"坚韧",icon:"🧱",desc:"接下来8秒防御提升40%",defBuff:8},{name:"狂怒",icon:"💢",desc:"接下来5秒攻击力提升50%",atkBuff:5}] },
      skills:[{name:"野兽冲锋",icon:"🐗",desc:"3倍伤害",type:"dmg",mul:3,castTime:1.5,stun:true}] } },
  { key:'westfall', name:'西部荒野', icon:'🌾', faction:'联盟', lvlRange:[10,20],
    desc:'被迪菲亚兄弟会占据的农场',
    sub:[
      { name:'哨兵岭',       lvl:[10,13], mobs:'👤迪菲亚劫匪|🐔野生土鸡|🐗狂野野猪|🦗田野蝗虫' },
      { name:'月溪村废墟',   lvl:[14,17], mobs:'🤖采石场守护者|🤖钛金机器人|👤迪菲亚刺客|🐮疯狂奶牛' },
      { name:'死亡矿井入口', lvl:[18,20], mobs:'🧙迪菲亚法师|👤迪菲亚仆从|👻矿洞幽灵|💀矿工骷髅' },
    ],
    boss:{ name:'莫斯虎尔的复仇之灵', emoji:'⚓', lvl:22, desc:'湮灭海湾的鬼船船长',
      passive:{dodgeChance:0.15,critChance:0.1,
      tricks: [{name:"战吼",icon:"📯",desc:"接下来8秒攻击力提升30%",atkBuff:8},{name:"坚韧",icon:"🧱",desc:"接下来8秒防御提升40%",defBuff:8},{name:"连斩",icon:"🗡️",desc:"下一次攻击造成两次伤害",nextDouble:2}] },
      skills:[{name:"幽灵炮击",icon:"💣",desc:"3倍伤害",type:"dmg",mul:3,castTime:2},{name:"诅咒",icon:"🧿",desc:"3.5倍暗影伤害",type:"dmg",mul:3.5,slow:true,castTime:2,weaken:true}] } },
  { key:'silverpine', name:'银松森林', icon:'🌲', faction:'部落', lvlRange:[10,20],
    desc:'被狼人诅咒的腐朽森林',
    sub:[
      { name:'影牙城堡边境', lvl:[10,13], mobs:'🐺血色狼人|🐺月夜狼人|🕷️巨型蜘蛛|👻凄凉鬼影' },
      { name:'安伯米尔',     lvl:[14,17], mobs:'🤖法师皇家卫士|🤖灰烬法师|👤安伯米尔特工|🧙法师猎手' },
      { name:'腐烂荒野',     lvl:[18,20], mobs:'💀沼泽魔像|🧟亡灵农奴|👻死亡牧师|🐺夜行狼人' },
    ],
    boss:{ name:'阿鲁高的侍从', emoji:'🧙', lvl:22, desc:'狼人法师的随从',
      passive:{critChance:0.2,
      tricks: [{name:"弱点感知",icon:"👁️",desc:"接下来8秒必定暴击",critBuff:8},{name:"战吼",icon:"📯",desc:"接下来8秒攻击力提升30%",atkBuff:8}] },
      skills:[{name:"暗影箭",icon:"🌑",desc:"3倍暗影伤害",type:"dmg",mul:3,castTime:1.5},{name:"召唤狼人",icon:"🐺",desc:"4倍伤害",type:"dmg",mul:4,castTime:2.5,stun:true}] } },
  { key:'redridge', name:'赤脊山', icon:'⛰️', faction:'联盟', lvlRange:[15,25],
    desc:'通往黑石塔的边境之地',
    sub:[
      { name:'三角路口',     lvl:[15,18], mobs:'🐺黑石血腥猎犬|👹黑石兽人|🐉幼龙|🐗黑石野猪' },
      { name:'燃烧平原边境', lvl:[18,22], mobs:'🐉黑石长老|🐺黑铁狗|👹黑铁狂战士|🔥火焰元素' },
      { name:'黑石塔脚下',   lvl:[22,25], mobs:'🐲黑石龙|🐉燃烧之龙|👹黑铁督军|🔥拉格纳罗斯仆从' },
    ],
    boss:{ name:'山口烈焰', emoji:'🐉', lvl:27, desc:'黑石氏族的火龙',
      passive:{dmgReduction:0.1,
      tricks: [{name:"吸血光环",icon:"🩸",desc:"接下来8秒攻击吸血15%",leechBuff:8},{name:"战吼",icon:"📯",desc:"接下来8秒攻击力提升30%",atkBuff:8},{name:"致命专注",icon:"🎯",desc:"接下来5秒必定暴击",critBuff:5}] },
      skills:[{name:"火焰吐息",icon:"🔥",desc:"3倍火焰伤害+灼烧",type:"dmg",mul:3,dot:true,castTime:2}] } },
  { key:'barrens', name:'贫瘠之地', icon:'🏜️', faction:'部落', lvlRange:[10,25],
    desc:'卡利姆多最辽阔的草原',
    sub:[
      { name:'路口',   lvl:[10,15], mobs:'🦎沙鳞蜥蜴|🐗剃刀沼泽巨猪|🐺贫瘠草原狼|🦂剧毒蝎' },
      { name:'棘齿城', lvl:[15,20], mobs:'🐊草原鳄鱼|🐗长牙公猪|🦒长颈鹿|🪲沙地爬虫' },
      { name:'巨槌石', lvl:[20,25], mobs:'🦏角斗士|🦣战鹰|👹半人马掠夺者|🦂沙脊蝎' },
    ],
    boss:{ name:'沙鳞之翼', emoji:'🦂', lvl:27, desc:'贫瘠之地的传奇巨蝎',
      passive:{dodgeChance:0.1,
      tricks: [{name:"双刃",icon:"⚔️",desc:"下一次攻击造成双倍伤害",nextDouble:1},{name:"闪电反射",icon:"⚡",desc:"接下来5秒攻速+60%且必定暴击",spdBuff:5,critBuff:5},{name:"战斗狂怒",icon:"🔥",desc:"接下来5秒攻击+40%且吸血15%",atkBuff:5,leechBuff:5}] },
      skills:[{name:"毒刺",icon:"🦂",desc:"3倍伤害+中毒",type:"dmg",mul:3,dot:true,castTime:1},{name:"沙暴",icon:"🏜️",desc:"3.5倍范围伤害",type:"dmg",mul:3.5,castTime:2}] } },
  { key:'wetlands', name:'湿地', icon:'🌊', faction:'联盟', lvlRange:[20,30],
    desc:'布满沼泽与龙类的水域',
    sub:[
      { name:'米奈希尔港', lvl:[20,24], mobs:'🐊湿地鳄鱼|🦎沼泽蜥蜴|🐸潮汐巨兽|🦂湿地蝎子' },
      { name:'湿地沼泽',   lvl:[25,30], mobs:'🐲幼龙|🦣巨人|🦖暴龙|🐸沼泽兽' },
    ],
    boss:{ name:'萨格雷·烈焰之心', emoji:'🐲', lvl:32, desc:'湿地的火龙首领',
      passive:{dmgReduction:0.15,critChance:0.15,
      tricks: [{name:"致命连击",icon:"💥",desc:"下一次攻击造成双倍且必定暴击",nextDouble:1,critBuff:5},{name:"终极防御",icon:"🛡️",desc:"回复20%生命且接下来5秒防御+50%",defBuff:5,healPct:0.2}] },
      skills:[{name:"烈焰之息",icon:"🔥",desc:"3.5倍火焰伤害+灼烧",type:"dmg",mul:3.5,dot:true,castTime:2},{name:"火焰风暴",icon:"🌋",desc:"5倍范围伤害",type:"dmg",mul:5,castTime:3}] } },
  { key:'duskwood', name:'暮色森林', icon:'🌑', faction:'中立', lvlRange:[20,30],
    desc:'被诅咒的暗影森林,亡灵游荡之地',
    sub:[
      { name:'暮色镇',   lvl:[20,24], mobs:'🐺暮色狼人|👻飘渺怨灵|🕷️暮色森林蛛|🧛吸血蝙蝠' },
      { name:'暮色边境', lvl:[25,30], mobs:'🧟亡灵僧侣|🧛吸血鬼伯爵|🐺月夜狼|👤暮色刺客' },
    ],
    boss:{ name:'斯特拉霍尔姆勋爵', emoji:'🧛', lvl:32, desc:'暮色森林的吸血鬼贵族',
      passive:{leech:0.15,critChance:0.15,
      tricks: [{name:"闪电反射",icon:"⚡",desc:"接下来5秒攻速+60%且必定暴击",spdBuff:5,critBuff:5},{name:"战斗狂怒",icon:"🔥",desc:"接下来5秒攻击+40%且吸血15%",atkBuff:5,leechBuff:5},{name:"致命连击",icon:"💥",desc:"下一次攻击造成双倍且必定暴击",nextDouble:1,critBuff:5}] },
      skills:[{name:"鲜血吸取",icon:"🩸",desc:"3倍伤害+吸血30%",type:"dmg",mul:3,lifeSteal:0.3,castTime:1.5},{name:"暗影之咬",icon:"🦇",desc:"4倍暗影伤害",type:"dmg",mul:4,castTime:2}] } },
  { key:'thousand', name:'千针石林', icon:'🪐', faction:'中立', lvlRange:[25,35],
    desc:'卡利姆多大陆的尖刺荒漠',
    sub:[
      { name:'镭岩村',   lvl:[25,30], mobs:'🦎沙地暴龙|🐗野猪|🪲爬虫|🦂沙漠蝎' },
      { name:'闪光平原', lvl:[30,35], mobs:'🦖暴龙|🦏石壁巨蟾|🐺草原狼|🦴恐魔' },
    ],
    boss:{ name:'千针石林之沙', emoji:'🦖', lvl:37, desc:'沙漠暴龙之首',
      passive:{atkBonus:0.2,dmgReduction:0.05,
      tricks: [{name:"铁壁",icon:"🛡️",desc:"接下来5秒防御提升50%",defBuff:5},{name:"狂怒",icon:"💢",desc:"接下来5秒攻击力提升50%",atkBuff:5}] },
      skills:[{name:"沙尘吐息",icon:"🏜️",desc:"3.5倍伤害",type:"dmg",mul:3.5,castTime:1.5},{name:"尾扫",icon:"🦖",desc:"4倍伤害",type:"dmg",mul:4,castTime:2,stun:true}] } },
  { key:'stranglethorn', name:'荆棘谷', icon:'🌴', faction:'中立', lvlRange:[30,45],
    desc:'巨魔与丛林兽充斥的热带丛林',
    sub:[
      { name:'北部森林',       lvl:[30,35], mobs:'🐅丛林虎|🦍巨型猩猩|🗿巨魔|🐍巨蟒' },
      { name:'加兹瑞拉海湾',   lvl:[35,40], mobs:'🐊鳄鱼|🐬潜水员|🦈鲨鱼|🐢海龟' },
      { name:'祖尔格拉布外围', lvl:[40,45], mobs:'🐍祖尔金蛇|🐅虎|👤巨魔战士|🐺豹' },
    ],
    boss:{ name:'加兹瑞拉', emoji:'🐍', lvl:47, desc:'荆棘谷的传奇海蛇',
      passive:{dodgeChance:0.15,critChance:0.2,
      passive:{dodgeChance:0.15,critChance:0.2,
      tricks: [{name:"铁壁",icon:"🛡️",desc:"接下来5秒防御提升50%",defBuff:5},{name:"坚韧",icon:"🧱",desc:"接下来8秒防御提升40%",defBuff:8}] },
      skills:[{name:"潮汐波",icon:"🌊",desc:"4倍伤害",type:"dmg",mul:4,castTime:2},{name:"闪电吐息",icon:"⚡",desc:"5倍自然伤害",type:"dmg",mul:5,castTime:3,stun:true}] },
      skills:[{name:"潮汐波",icon:"🌊",desc:"4倍伤害",type:"dmg",mul:4,castTime:2},{name:"闪电吐息",icon:"⚡",desc:"5倍自然伤害",type:"dmg",mul:5,castTime:3,stun:true}] } },
  { key:'searing', name:'灼热峡谷', icon:'🔥', faction:'中立', lvlRange:[40,50],
    desc:'黑铁矮人盘踞的火焰地带',
    sub:[
      { name:'黑石外围',   lvl:[40,45], mobs:'🔥火元素|🐉幼龙|🐺火犬|👹黑铁兽人' },
      { name:'索瑞森营地', lvl:[45,50], mobs:'🤖蒸汽傀儡|🐲熔岩龙|🔥火焰领主|👹黑铁督军' },
    ],
    boss:{ name:'黑石氏族督军', emoji:'👹', lvl:52, desc:'黑石氏族的暴君',
      passive:{atkBonus:0.2,dmgReduction:0.1,
      tricks: [{name:"再生",icon:"💚",desc:"立即回复25%最大生命",healPct:0.25},{name:"铁壁",icon:"🛡️",desc:"接下来5秒防御提升50%",defBuff:5},{name:"坚韧",icon:"🧱",desc:"接下来8秒防御提升40%",defBuff:8}] },
      skills:[{name:"战争践踏",icon:"🦶",desc:"4倍伤害+减速",type:"dmg",mul:4,slow:true,castTime:2,stun:true},{name:"旋风斩",icon:"🌀",desc:"5倍范围伤害",type:"dmg",mul:5,castTime:3,stun:true}] } },
  { key:'burning', name:'燃烧平原', icon:'🌋', faction:'中立', lvlRange:[45,55],
    desc:'通往火源之界的炽热焦土',
    sub:[
      { name:'巨槌山',   lvl:[45,50], mobs:'🔥火元素|🐉幼龙|🐺火犬|🪲熔岩爬虫' },
      { name:'黑石山脉', lvl:[50,55], mobs:'🐲黑龙|🔥火魔|👹黑铁巨魔|🤖傀儡' },
    ],
    boss:{ name:'拉格纳罗斯的仆从', emoji:'🔥', lvl:57, desc:'萨弗隆元素领主的爪牙',
      passive:{critChance:0.25,dmgReduction:0.1,
      tricks: [{name:"坚韧",icon:"🧱",desc:"接下来8秒防御提升40%",defBuff:8},{name:"连斩",icon:"🗡️",desc:"下一次攻击造成两次伤害",nextDouble:2}] },
      skills:[{name:"熔岩爆裂",icon:"🌋",desc:"5倍火焰伤害+灼烧",type:"dmg",mul:5,dot:true,castTime:2},{name:"火焰新星",icon:"💥",desc:"6倍范围伤害",type:"dmg",mul:6,castTime:3.5}] } },
  { key:'ungoro', name:'安戈洛环形山', icon:'🦖', faction:'中立', lvlRange:[48,55],
    desc:'隐藏在火山口中的史前生态',
    sub:[
      { name:'西部裂沟', lvl:[48,52], mobs:'🦖暴龙|🪲水晶爬虫|🌋火山幼龙|💎水晶蜥蜴' },
      { name:'火山口',   lvl:[52,55], mobs:'🔥火元素|🦖恐怖暴龙|🌋熔岩魔|🐉火龙' },
    ],
    boss:{ name:'雷加什·烈日', emoji:'🦖', lvl:57, desc:'史前龙王',
      passive:{atkBonus:0.2,critChance:0.2,
      tricks: [{name:"坚韧",icon:"🧱",desc:"接下来8秒防御提升40%",defBuff:8},{name:"再生",icon:"💚",desc:"立即回复25%最大生命",healPct:0.25}] },
      skills:[{name:"太阳耀斑",icon:"☀️",desc:"5倍火焰伤害",type:"dmg",mul:5,castTime:2},{name:"远古咆哮",icon:"🦖",desc:"6倍范围伤害",type:"dmg",mul:6,castTime:3}] } },
  { key:'silithus', name:'希利苏斯', icon:'🐛', faction:'中立', lvlRange:[55,60],
    desc:'异虫巢穴,克苏恩的影响之地',
    sub:[
      { name:'塞纳里奥要塞', lvl:[55,57], mobs:'🐝异虫|🪲异虫战士|💎水晶守卫|🐛剧毒蠕虫' },
      { name:'希利苏斯之野', lvl:[58,60], mobs:'🐝异虫飞兵|🪲异虫领主|💎水晶领主|🐛巨型蠕虫' },
    ],
    boss:{ name:'鲁卡安', emoji:'👁️', lvl:62, desc:'希利苏斯的禁忌之眼',
      passive:{dodgeChance:0.2,critChance:0.2,stunChance:0.1,
      tricks: [{name:"不死之躯",icon:"💀",desc:"接下来5秒防御+50%且吸血20%",defBuff:5,leechBuff:5},{name:"闪电反射",icon:"⚡",desc:"接下来5秒攻速+60%且必定暴击",spdBuff:5,critBuff:5}] },
      skills:[{name:"暗影凝视",icon:"👁️",desc:"5倍暗影伤害",type:"dmg",mul:5,castTime:2,weaken:true},{name:"精神鞭笞",icon:"🌀",desc:"6倍伤害+减速",type:"dmg",mul:6,slow:true,castTime:3,stun:true},{name:'克苏恩之眼',icon:'👁️',desc:'6倍暗影伤害+恐惧',type:'dmg',mul:6,castTime:3,fear:true}] } },
  { key:'eastern_plague', name:'东瘟疫之地', icon:'☠️', faction:'中立', lvlRange:[55,60],
    desc:'被天灾军团彻底污染的死亡之地',
    sub:[
      { name:'噬骨废墟',     lvl:[55,58], mobs:'🧟瘟疫食尸鬼|💀骨魔|🦴骨爬虫|👻死亡牧师' },
      { name:'斯坦索姆外围', lvl:[58,60], mobs:'🧟瘟疫卫兵|💀亡灵法师|🦴骨龙|👻怨灵' },
    ],
    boss:{ name:'克尔苏加德的密使', emoji:'🦴', lvl:62, desc:'天灾军团特使',
      passive:{critChance:0.2,dmgReduction:0.1,dodgeChance:0.1,
      tricks: [{name:"再生",icon:"💚",desc:"立即回复25%最大生命",healPct:0.25},{name:"不死之躯",icon:"💀",desc:"接下来5秒防御+50%且吸血20%",defBuff:5,leechBuff:5}] },
      skills:[{name:"寒冰箭",icon:"❄️",desc:"5倍冰霜伤害+减速",type:"dmg",mul:5,slow:true,castTime:2},{name:"死亡凋零",icon:"💀",desc:"6倍范围暗影伤害",type:"dmg",mul:6,castTime:3},{name:'冰霜之触',icon:'❄️',desc:'5倍冰霜伤害',type:'dmg',mul:5,castTime:2}] } },
  { key:'hellfire', name:'地狱火半岛', icon:'😈', faction:'外域', lvlRange:[58,63],
    desc:'外域的入口,燃烧军团的前线',
    sub:[
      { name:'地狱火城堡', lvl:[58,61], mobs:'😈邪兽人|🦇魔脊蝙蝠|👹深渊领主|🔥火焰恶魔' },
      { name:'燃烧前线',   lvl:[61,63], mobs:'😈炎魔|👹深渊战士|🛸虚空使者|🔥地狱火' },
    ],
    boss:{ name:'玛瑟里顿', emoji:'😈', lvl:65, desc:'被囚禁的暗影议会成员',
      passive:{atkBonus:0.25,critChance:0.2,dmgReduction:0.1,dodgeChance:0.15,
      tricks: [{name:"致命专注",icon:"🎯",desc:"接下来5秒必定暴击",critBuff:5},{name:"终极防御",icon:"🛡️",desc:"回复20%生命且接下来5秒防御+50%",defBuff:5,healPct:0.2}] },
      skills:[{name:"地狱火",icon:"😈",desc:"6倍火焰伤害+灼烧",type:"dmg",mul:6,dot:true,castTime:2.5},{name:"暗影之怒",icon:"💢",desc:"7倍暗影伤害",type:"dmg",mul:7,castTime:3.5,weaken:true},{name:'深渊咆哮',icon:'👹',desc:'7倍伤害+减速',type:'dmg',mul:7,slow:true,castTime:3}] } },
  { key:'nagrand', name:'纳格兰', icon:'🦬', faction:'外域', lvlRange:[64,68],
    desc:'飘浮岛屿的草原,玛瑟里顿的故乡',
    sub:[
      { name:'元素王座',   lvl:[64,66], mobs:'🦬奥拉基尔|🦣大象|👹食人魔|🌪️元素' },
      { name:'纳格兰平原', lvl:[66,68], mobs:'🦌雄鹿|🐗白野猪|👹食人魔领主|🌪️风元素' },
    ],
    boss:{ name:'邦多', emoji:'👹', lvl:70, desc:'纳格兰食人魔之王',
      passive:{atkBonus:0.2,dmgReduction:0.15,dodgeChance:0.1,stunChance:0.1,
      tricks: [{name:"致命连击",icon:"💥",desc:"下一次攻击造成双倍且必定暴击",nextDouble:1,critBuff:5},{name:"战斗狂怒",icon:"🔥",desc:"接下来5秒攻击+40%且吸血15%",atkBuff:5,leechBuff:5},{name:"复苏",icon:"💚",desc:"立即回复15%最大生命",healPct:0.15}] },
      skills:[{name:"粉碎打击",icon:"🔨",desc:"5倍伤害",type:"dmg",mul:5,castTime:2},{name:"狂暴冲锋",icon:"👹",desc:"6倍伤害",type:"dmg",mul:6,castTime:3,stun:true},{name:'食人魔之锤',icon:'🔨',desc:'7倍伤害',type:'dmg',mul:7,castTime:3},{name:'战争咆哮',icon:'💢',desc:'6倍范围+减速',type:'dmg',mul:6,slow:true,castTime:3}] } },
  { key:'shadowmoon', name:'影月谷', icon:'🌑', faction:'外域', lvlRange:[67,70],
    desc:'伊利丹的黑暗神殿所在',
    sub:[
      { name:'影月村',     lvl:[67,69], mobs:'👹邪兽人战士|🐉魔龙|👤暗影法师|🔥地狱火兽人' },
      { name:'黑暗神殿外', lvl:[69,70], mobs:'😈深渊领主|🐲魔龙|🔥燃烧使者|👹大乌帕雷' },
    ],
    boss:{ name:'伊利丹·怒风', emoji:'😈', lvl:72, desc:'背叛者',
      passive:{dodgeChance:0.25,critChance:0.25,dmgReduction:0.1,atkBonus:0.1,stunChance:0.15,
      tricks: [{name:"复苏",icon:"💚",desc:"立即回复15%最大生命",healPct:0.15},{name:"狂怒",icon:"💢",desc:"接下来5秒攻击力提升50%",atkBuff:5}] },
      skills:[{name:"埃辛诺斯之刃",icon:"🗡️",desc:"7倍伤害",type:"dmg",mul:7,castTime:2},{name:"恶魔变形",icon:"😈",desc:"8倍范围暗影伤害",type:"dmg",mul:8,castTime:4},{name:'眼棱',icon:'👁️',desc:'7倍火焰伤害',type:'dmg',mul:7,castTime:2.5},{name:'法力燃烧',icon:'🔥',desc:'6倍伤害+灼烧',type:'dmg',mul:6,dot:true,castTime:3}] } },
  { key:'borean', name:'北风苔原', icon:'❄️', faction:'诺森德', lvlRange:[68,72],
    desc:'诺森德的西部入口,鲜花与冰雪并存',
    sub:[
      { name:'鞭尾湖',       lvl:[68,70], mobs:'🦣猛犸|🐺霜狼|❄️雪人|🦅冰风之翼' },
      { name:'龙骨荒野边境', lvl:[70,72], mobs:'🐉霜龙|🦴亡灵|❄️冰元素|🦣冰冻猛犸' },
    ],
    boss:{ name:'卡格瓦', emoji:'🐊', lvl:74, desc:'神秘的鳄鱼之神',
      passive:{dodgeChance:0.15,dmgReduction:0.15,critChance:0.1,stunChance:0.1,
      tricks: [{name:"连斩",icon:"🗡️",desc:"下一次攻击造成两次伤害",nextDouble:2},{name:"不死之躯",icon:"💀",desc:"接下来5秒防御+50%且吸血20%",defBuff:5,leechBuff:5},{name:"致命专注",icon:"🎯",desc:"接下来5秒必定暴击",critBuff:5}] },
      skills:[{name:"死亡翻滚",icon:"🐊",desc:"6倍伤害",type:"dmg",mul:6,castTime:2},{name:"鳄鱼之怒",icon:"💢",desc:"7倍伤害+吸血20%",type:"dmg",mul:7,lifeSteal:0.2,castTime:3},{name:'鳄鱼撕咬',icon:'🐊',desc:'8倍伤害',type:'dmg',mul:8,castTime:3},{name:'沼泽陷阱',icon:'🪤',desc:'6倍伤害+减速',type:'dmg',mul:6,slow:true,castTime:3}] } },
  { key:'storm', name:'风暴峭壁', icon:'⚡', faction:'诺森德', lvlRange:[76,80],
    desc:'泰坦遗迹与铁矮人的领地',
    sub:[
      { name:'风暴神殿', lvl:[76,78], mobs:'⚡雷霆巨人|🤖泰坦守护者|❄️冰晶|🦴泰坦遗骸' },
      { name:'雷石峰',   lvl:[78,80], mobs:'⚡雷霆领主|🤖泰坦守护者|❄️风暴元素|🦴铁矮人' },
    ],
    boss:{ name:'索林姆', emoji:'⚡', lvl:82, desc:'雷电之王',
      passive:{critChance:0.3,dmgReduction:0.15,dodgeChance:0.15,stunChance:0.15,atkBonus:0.1,
      tricks: [{name:"疾风",icon:"💨",desc:"接下来5秒攻速提升60%",spdBuff:5},{name:"复苏",icon:"💚",desc:"立即回复15%最大生命",healPct:0.15},{name:"不死之躯",icon:"💀",desc:"接下来5秒防御+50%且吸血20%",defBuff:5,leechBuff:5}] },
      skills:[{name:"雷霆之怒",icon:"⚡",desc:"7倍自然伤害",type:"dmg",mul:7,castTime:2.5,stun:true},{name:"闪电风暴",icon:"🌩️",desc:"8倍范围伤害",type:"dmg",mul:8,castTime:4,stun:true},{name:'雷霆万钧',icon:'⚡',desc:'8倍自然伤害',type:'dmg',mul:8,castTime:3},{name:'风暴之锤',icon:'🔨',desc:'7倍伤害+击晕',type:'dmg',mul:7,castTime:3,stun:true},{name:'雷神之怒',icon:'🌩️',desc:'9倍范围伤害',type:'dmg',mul:9,castTime:4}] } },
  { key:'icecrown', name:'冰冠冰川', icon:'🏰', faction:'诺森德', lvlRange:[78,80],
    desc:'巫妖王的领地,天灾军团总部',
    sub:[
      { name:'冰雾村',     lvl:[78,79], mobs:'🧟天灾士兵|🦴亡灵骑士|❄️冰元素|🐉霜龙' },
      { name:'巫妖王大殿', lvl:[79,80], mobs:'🧟瘟疫食尸鬼|🦴骨爬行者|💀亡灵法师|🐲霜龙' },
    ],
    boss:{ name:'阿尔萨斯·巫妖王', emoji:'☠️', lvl:83, desc:'寒冰之王,游戏终极首领' ,
      passive:{dmgReduction:0.25,critChance:0.3,dodgeChance:0.2,atkBonus:0.2,leech:0.15,
      tricks: [{name:"狂怒",icon:"💢",desc:"接下来5秒攻击力提升50%",atkBuff:5},{name:"双刃",icon:"⚔️",desc:"下一次攻击造成双倍伤害",nextDouble:1}] },
      skills:[{name:"霜之哀伤",icon:"🗡️",desc:"7倍伤害+吸血30%",type:"dmg",mul:7,lifeSteal:0.3,castTime:2},{name:"死亡缠绕",icon:"💀",desc:"8倍暗影伤害",type:"dmg",mul:8,castTime:3},{name:"寒冰风暴",icon:"❄️",desc:"8倍范围+减速",type:"dmg",mul:8,slow:true,castTime:3.5},{name:"亡者大军",icon:"🧟",desc:"9倍伤害",type:"dmg",mul:9,castTime:4,stun:true},{name:"巫妖王之怒",icon:"👑",desc:"10倍范围暗影伤害",type:"dmg",mul:10,castTime:5}] } },
  { key:'lochmodan', name:'洛克莫丹', icon:'🏔️', faction:'联盟', lvlRange:[10,18],
    desc:'丹莫罗之外的雪山湖泊',
    sub:[
      { name:'莫丹湖岸',     lvl:[10,13], mobs:'🐗山地野猪|🐺霜鬃狼|🦅悬崖秃鹫|🐻冰爪熊' },
      { name:'奥加兹哨站',   lvl:[14,18], mobs:'👤黑铁矮人|🐺霜鬃狼人|🪓石腭怪|💀寒冰怨灵' },
    ],
    boss:{ name:'莫格罗什', emoji:'👹', lvl:20, desc:'洛克莫丹的食人魔首领' ,
      passive:{dmgReduction:0.05,
      tricks: [{name:"再生",icon:"💚",desc:"立即回复25%最大生命",healPct:0.25},{name:"吸血光环",icon:"🩸",desc:"接下来8秒攻击吸血15%",leechBuff:8}] },
      skills:[{name:"巨锤打击",icon:"🔨",desc:"2.5倍伤害",type:"dmg",mul:2.5,castTime:1}] } },
  { key:'ashenvale', name:'灰谷', icon:'🌳', faction:'中立', lvlRange:[18,28],
    desc:'暗夜精灵的古老森林,部落与联盟争夺之地',
    sub:[
      { name:'阿斯特兰纳',   lvl:[18,22], mobs:'🐺灰谷猎犬|🕷️森林毒蛛|🐻灰谷熊|🦅角鹰兽' },
      { name:'银翼哨站',     lvl:[22,28], mobs:'👤战歌斥候|🪓魔爪食人魔|🐉精灵龙|🌿腐化树精' },
    ],
    boss:{ name:'萨特领主', emoji:'😈', lvl:30, desc:'盘踞灰谷深处的恶魔萨特' ,
      passive:{dodgeChance:0.1,critChance:0.1,
      tricks: [{name:"吸血光环",icon:"🩸",desc:"接下来8秒攻击吸血15%",leechBuff:8},{name:"弱点感知",icon:"👁️",desc:"接下来8秒必定暴击",critBuff:8}] },
      skills:[{name:"暗影之箭",icon:"🌑",desc:"3倍暗影伤害",type:"dmg",mul:3,castTime:1.5},{name:"腐化之触",icon:"👿",desc:"3.5倍伤害+中毒",type:"dmg",mul:3.5,dot:true,castTime:2}] } },
  { key:'arathi', name:'阿拉希高地', icon:'🏰', faction:'中立', lvlRange:[30,40],
    desc:'激流堡的废墟,古老的阿拉索帝国遗迹',
    sub:[
      { name:'避难谷地',     lvl:[30,35], mobs:'🦅高地狮鹫|👤辛迪加盗贼|🐺高地狼|💀石拳食人魔' },
      { name:'激流堡废墟',   lvl:[35,40], mobs:'👤辛迪加刺客|💀枯颅巨魔|🧟亡灵守军|🐉高地飞龙' },
    ],
    boss:{ name:'托尔贝恩', emoji:'👻', lvl:42, desc:'激流堡的亡灵王子' ,
      passive:{dmgReduction:0.15,atkBonus:0.1,
      tricks: [{name:"弱点感知",icon:"👁️",desc:"接下来8秒必定暴击",critBuff:8},{name:"狂暴之怒",icon:"😡",desc:"接下来5秒攻击+50%且攻速+30%",atkBuff:5,spdBuff:5},{name:"狂怒",icon:"💢",desc:"接下来5秒攻击力提升50%",atkBuff:5}] },
      skills:[{name:"托尔贝恩之锤",icon:"🔨",desc:"3.5倍伤害",type:"dmg",mul:3.5,castTime:2},{name:"雷霆一击",icon:"⚡",desc:"4倍伤害+减速",type:"dmg",mul:4,slow:true,castTime:2.5,stun:true}] } },
  { key:'desolace', name:'凄凉之地', icon:'💀', faction:'中立', lvlRange:[35,45],
    desc:'半人马与燃烧军团肆虐的荒芜之地',
    sub:[
      { name:'尼耶尔哨站',   lvl:[35,40], mobs:'🐎半人马掠夺者|🦂地狱蝎|🪲骸骨爬虫|👹恶魔猎犬' },
      { name:'玛拉顿入口',   lvl:[40,45], mobs:'👹地狱卫士|🐎半人马可汗|🦎石化蜥蜴|🔥火元素' },
    ],
    boss:{ name:'瑟莱德丝公主', emoji:'👹', lvl:47, desc:'玛拉顿的腐化之源' ,
      passive:{dodgeChance:0.1,critChance:0.15,
      tricks: [{name:"疾风",icon:"💨",desc:"接下来5秒攻速提升60%",spdBuff:5},{name:"狂怒",icon:"💢",desc:"接下来5秒攻击力提升50%",atkBuff:5}] },
      skills:[{name:"腐化",icon:"👹",desc:"4倍伤害+中毒",type:"dmg",mul:4,dot:true,castTime:2},{name:"地震",icon:"🌍",desc:"5倍范围伤害",type:"dmg",mul:5,castTime:3,stun:true,slow:true}] } },
  { key:'feralas', name:'菲拉斯', icon:'🌴', faction:'中立', lvlRange:[40,50],
    desc:'羽月要塞所在的远古丛林',
    sub:[
      { name:'羽月要塞',     lvl:[40,45], mobs:'🦍格罗多克猩猩|🐺菲拉斯狼|🦅巨型角鹰兽|🐗铁皮野猪' },
      { name:'埃雷萨拉斯',   lvl:[45,50], mobs:'🧝上层精灵|👻奥术怨灵|🐉噩梦雏龙|🪄奥术魔像' },
    ],
    boss:{ name:'伊兰尼库斯之影', emoji:'🐉', lvl:52, desc:'被腐化的绿龙之影' ,
      passive:{dodgeChance:0.15,critChance:0.15,
      tricks: [{name:"狂怒",icon:"💢",desc:"接下来5秒攻击力提升50%",atkBuff:5},{name:"狂暴之怒",icon:"😡",desc:"接下来5秒攻击+50%且攻速+30%",atkBuff:5,spdBuff:5},{name:"战斗狂怒",icon:"🔥",desc:"接下来5秒攻击+40%且吸血15%",atkBuff:5,leechBuff:5}] },
      skills:[{name:"翡翠梦境",icon:"🐉",desc:"4倍伤害",type:"dmg",mul:4,castTime:2},{name:"梦魇",icon:"👁️",desc:"5倍暗影伤害",type:"dmg",mul:5,castTime:3}] } },
  { key:'tanaris', name:'塔纳利斯', icon:'🏜️', faction:'中立', lvlRange:[44,54],
    desc:'卡利姆多南端的大沙漠,加基森所在',
    sub:[
      { name:'加基森',       lvl:[44,48], mobs:'🦂沙漠掠行蝎|🦎晶化蜥蜴|🐫沙漠强盗|🤖废土机甲' },
      { name:'祖尔法拉克外', lvl:[48,54], mobs:'🗿沙怒巨魔|🦂巨型蝎|🧟复生木乃伊|🐉沙鳞雏龙' },
    ],
    boss:{ name:'加兹瑞拉', emoji:'🐍', lvl:56, desc:'沙怒巨魔信奉的远古多头蛇' ,
      tricks: [{name:"战吼",icon:"📯",desc:"接下来8秒攻击力提升30%",atkBuff:8},{name:"不死之躯",icon:"💀",desc:"接下来5秒防御+50%且吸血20%",defBuff:5,leechBuff:5}] } },
  { key:'zangarmarsh', name:'赞加沼泽', icon:'🍄', faction:'外域', lvlRange:[60,65],
    desc:'外域的巨大蘑菇湿地,孢子人的家园',
    sub:[
      { name:'孢子村',       lvl:[60,63], mobs:'🍄真菌巨人|🦟沼泽毒蚊|🐊沼泽利齿鳄|🌿沼泽行者' },
      { name:'毒蛇湖',       lvl:[63,65], mobs:'🐍盘牙毒蛇|🦟巨型水蝇|👹纳迦战士|🐊沼泽之王' },
    ],
    boss:{ name:'瓦斯琪', emoji:'🐍', lvl:67, desc:'盘牙水库的纳迦女巫' ,
      passive:{dodgeChance:0.2,critChance:0.2,dmgReduction:0.1,
      tricks: [{name:"迅捷",icon:"⚡",desc:"接下来8秒攻速提升40%",spdBuff:8},{name:"坚韧",icon:"🧱",desc:"接下来8秒防御提升40%",defBuff:8},{name:"疾风",icon:"💨",desc:"接下来5秒攻速提升60%",spdBuff:5}] },
      skills:[{name:"闪电箭",icon:"⚡",desc:"5倍自然伤害",type:"dmg",mul:5,castTime:2},{name:"叉状闪电",icon:"🌩️",desc:"6倍范围伤害",type:"dmg",mul:6,castTime:3},{name:"毒蛇之咬",icon:"🐍",desc:"7倍伤害+中毒",type:"dmg",mul:7,dot:true,castTime:3.5}] } },
  { key:'dragonblight', name:'龙骨荒野', icon:'🐉', faction:'诺森德', lvlRange:[72,76],
    desc:'巨龙军团的神圣墓地,诺森德中心',
    sub:[
      { name:'龙眠神殿',     lvl:[72,74], mobs:'🐉雏龙|🦴龙骨傀儡|❄️冰霜之灵|🦅霜翼飞龙' },
      { name:'纳克萨玛斯外', lvl:[74,76], mobs:'🧟天灾巨像|🐉冰霜巨龙|💀亡灵指挥官|❄️冰封战士' },
    ],
    boss:{ name:'辛达苟萨', emoji:'🐉', lvl:78, desc:'冰霜女王,阿尔萨斯的龙骨巨龙' ,
      passive:{dmgReduction:0.2,critChance:0.2,dodgeChance:0.15,atkBonus:0.1,
      tricks: [{name:"狂怒",icon:"💢",desc:"接下来5秒攻击力提升50%",atkBuff:5},{name:"再生",icon:"💚",desc:"立即回复25%最大生命",healPct:0.25},{name:"血之渴望",icon:"🩸",desc:"接下来5秒攻击吸血20%",leechBuff:5}] },
      skills:[{name:"冰霜吐息",icon:"❄️",desc:"6倍冰霜伤害+减速",type:"dmg",mul:6,slow:true,castTime:2},{name:"冰霜之墓",icon:"🧊",desc:"7倍伤害",type:"dmg",mul:7,castTime:3,slow:true},{name:"尾击",icon:"🐉",desc:"8倍范围伤害",type:"dmg",mul:8,castTime:3.5,stun:true},{name:"冰冷之握",icon:"💀",desc:"8倍伤害+减速",type:"dmg",mul:8,slow:true,castTime:4}] } },
  { key:'stonetalon', name:'石爪山脉', icon:'⛰️', faction:'部落', lvlRange:[15,25],
    desc:'贫瘠之地以西的崇山峻岭',
    sub:[
      { name:'烈日石居',     lvl:[15,20], mobs:'🦅风蛇|🐺石爪狼|🕷️洞穴蛛|🦎晶鳞蜥蜴' },
      { name:'石爪峰',       lvl:[20,25], mobs:'👤风险投资公司|🤖伐木机甲|🐉雏龙|🌪️风元素' },
    ],
    boss:{ name:'格雷苏·碎石', emoji:'🐉', lvl:27, desc:'石爪峰顶的龙类之王' ,
      passive:{dmgReduction:0.1,
      tricks: [{name:"终极防御",icon:"🛡️",desc:"回复20%生命且接下来5秒防御+50%",defBuff:5,healPct:0.2},{name:"双刃",icon:"⚔️",desc:"下一次攻击造成双倍伤害",nextDouble:1},{name:"连斩",icon:"🗡️",desc:"下一次攻击造成两次伤害",nextDouble:2}] },
      skills:[{name:"碎石投掷",icon:"🪨",desc:"3倍伤害",type:"dmg",mul:3,castTime:1.5}] } },
  { key:'hillsbrad', name:'希尔斯布莱德丘陵', icon:'🌿', faction:'中立', lvlRange:[20,30],
    desc:'奥特兰克山谷脚下的肥沃丘陵',
    sub:[
      { name:'南海镇',       lvl:[20,25], mobs:'🐻山地熊|🕷️巨型蜘蛛|🦅山地狮鹫|👤辛迪加窃贼' },
      { name:'奥特兰克山脚', lvl:[25,30], mobs:'👹雪怪|🐺霜狼|❄️冰元素|🧟亡灵卫兵' },
    ],
    boss:{ name:'赫洛德', emoji:'⚔️', lvl:32, desc:'血色十字军的狂热勇士' ,
      passive:{atkBonus:0.15,critChance:0.1,
      tricks: [{name:"战吼",icon:"📯",desc:"接下来8秒攻击力提升30%",atkBuff:8},{name:"不死之躯",icon:"💀",desc:"接下来5秒防御+50%且吸血20%",defBuff:5,leechBuff:5}] },
      skills:[{name:"旋风斩",icon:"🌀",desc:"3.5倍范围伤害",type:"dmg",mul:3.5,castTime:2,stun:true},{name:"狂热",icon:"🔥",desc:"3倍伤害+攻速提升",type:"dmg",mul:3,castTime:1.5,spdBuff:true}] } },
  { key:'dustwallow', name:'尘泥沼泽', icon:'🌫️', faction:'中立', lvlRange:[35,45],
    desc:'塞拉摩以南的阴暗沼泽,黑龙巢穴所在',
    sub:[
      { name:'塞拉摩岛',     lvl:[35,40], mobs:'🐊沼泽鳄鱼|🕷️沼泽毒蛛|🐗泥潭野猪|🐉黑龙幼崽' },
      { name:'奥妮克希亚巢穴', lvl:[40,45], mobs:'🐉黑龙卫士|🐲雏龙|🔥龙火元素|👤黑龙人' },
    ],
    boss:{ name:'奥妮克希亚', emoji:'🐲', lvl:47, desc:'黑龙公主,塞拉摩的阴影' ,
      passive:{dmgReduction:0.15,critChance:0.2,
      tricks: [{name:"铁壁",icon:"🛡️",desc:"接下来5秒防御提升50%",defBuff:5},{name:"再生",icon:"💚",desc:"立即回复25%最大生命",healPct:0.25}] },
      skills:[{name:"龙息术",icon:"🔥",desc:"4.5倍火焰伤害",type:"dmg",mul:4.5,castTime:2,dot:true},{name:"扫尾",icon:"🐉",desc:"5倍范围伤害",type:"dmg",mul:5,castTime:3,stun:true}] } },
  { key:'blasted', name:'诅咒之地', icon:'🌑', faction:'中立', lvlRange:[50,60],
    desc:'黑暗之门所在的焦土,恶魔横行',
    sub:[
      { name:'守望堡',       lvl:[50,55], mobs:'😈恶魔猎犬|👹地狱卫士|🦂魔化蝎|🐗魔化野猪' },
      { name:'黑暗之门',     lvl:[55,60], mobs:'👹深渊领主|😈恐惧魔王|🔥地狱火|🐲魔能龙' },
    ],
    boss:{ name:'卡扎克', emoji:'😈', lvl:62, desc:'诅咒之地的末日领主' ,
      passive:{atkBonus:0.2,critChance:0.2,dmgReduction:0.1,
      tricks: [{name:"坚韧",icon:"🧱",desc:"接下来8秒防御提升40%",defBuff:8},{name:"疾风",icon:"💨",desc:"接下来5秒攻速提升60%",spdBuff:5}] },
      skills:[{name:"暗影箭雨",icon:"🌑",desc:"5倍暗影伤害",type:"dmg",mul:5,castTime:2},{name:"卡扎克之握",icon:"👊",desc:"6倍伤害+减速",type:"dmg",mul:6,slow:true,castTime:3},{name:"恶魔之怒",icon:"😈",desc:"7倍范围伤害",type:"dmg",mul:7,castTime:3.5}] } },
  { key:'terokkar', name:'泰罗卡森林', icon:'🦅', faction:'外域', lvlRange:[62,67],
    desc:'外域的森林,奥金顿的遗迹所在',
    sub:[
      { name:'奥蕾莉亚要塞',   lvl:[62,65], mobs:'🦅鸦人|🕷️骨网蜘蛛|🐺魔脊狼|👹邪兽人斥候' },
      { name:'奥金顿废墟',     lvl:[65,67], mobs:'💀奥金顿亡魂|👻暗影议会|🧟复生卫士|🦇虚空蝙蝠' },
    ],
    boss:{ name:'摩摩尔', emoji:'🌪️', lvl:69, desc:'奥金顿地下的音爆之王' ,
      passive:{dmgReduction:0.2,critChance:0.15,dodgeChance:0.1,
      tricks: [{name:"吸血光环",icon:"🩸",desc:"接下来8秒攻击吸血15%",leechBuff:8},{name:"复苏",icon:"💚",desc:"立即回复15%最大生命",healPct:0.15},{name:"双刃",icon:"⚔️",desc:"下一次攻击造成双倍伤害",nextDouble:1}] },
      skills:[{name:"音爆",icon:"💥",desc:"5倍伤害",type:"dmg",mul:5,castTime:2},{name:"共鸣",icon:"🌀",desc:"6倍范围伤害",type:"dmg",mul:6,castTime:3},{name:"摩摩尔之怒",icon:"😡",desc:"7倍伤害+减速",type:"dmg",mul:7,slow:true,castTime:3.5}] } },
  { key:'bladesedge', name:'刀锋山', icon:'🗡️', faction:'外域', lvlRange:[65,70],
    desc:'外域的锋利山峰,戈隆的领地',
    sub:[
      { name:'雷神要塞',     lvl:[65,68], mobs:'👹食人魔战士|🐲晶鳞龙|🦅刃翼鹰|🤖魔能机甲' },
      { name:'格鲁尔的巢穴', lvl:[68,70], mobs:'👹戈隆之子|🐲黑龙|🔥熔岩元素|👹食人魔领主' },
    ],
    boss:{ name:'屠龙者格鲁尔', emoji:'👹', lvl:72, desc:'刀锋山的戈隆之王' ,
      passive:{atkBonus:0.25,critChance:0.2,dmgReduction:0.15,dodgeChance:0.1,
      tricks: [{name:"闪电反射",icon:"⚡",desc:"接下来5秒攻速+60%且必定暴击",spdBuff:5,critBuff:5},{name:"弱点感知",icon:"👁️",desc:"接下来8秒必定暴击",critBuff:8},{name:"狂暴之怒",icon:"😡",desc:"接下来5秒攻击+50%且攻速+30%",atkBuff:5,spdBuff:5}] },
      skills:[{name:"巨力猛击",icon:"👊",desc:"6倍伤害",type:"dmg",mul:6,castTime:2},{name:"碎裂",icon:"💢",desc:"7倍伤害+减速",type:"dmg",mul:7,slow:true,castTime:3},{name:"地陷",icon:"🌍",desc:"7倍范围伤害",type:"dmg",mul:7,castTime:3.5},{name:"屠龙之怒",icon:"🐉",desc:"8倍伤害",type:"dmg",mul:8,castTime:4}] } },
  { key:'netherstorm', name:'虚空风暴', icon:'🌀', faction:'外域', lvlRange:[68,72],
    desc:'外域的虚空能量漩涡,凯尔萨斯的领地',
    sub:[
      { name:'风暴要塞外围', lvl:[68,70], mobs:'🧝血精灵法师|🤖奥术傀儡|🌀虚空元素|🛸以太族' },
      { name:'虚空风暴中心', lvl:[70,72], mobs:'🌀虚空行者|⚡能量元素|🧝日怒血骑士|🤖魔能守卫' },
    ],
    boss:{ name:'凯尔萨斯·逐日者', emoji:'🧝', lvl:74, desc:'风暴要塞的血精灵之王' ,
      passive:{critChance:0.25,dodgeChance:0.15,dmgReduction:0.1,atkBonus:0.15,
      tricks: [{name:"闪电反射",icon:"⚡",desc:"接下来5秒攻速+60%且必定暴击",spdBuff:5,critBuff:5},{name:"连斩",icon:"🗡️",desc:"下一次攻击造成两次伤害",nextDouble:2},{name:"双刃",icon:"⚔️",desc:"下一次攻击造成双倍伤害",nextDouble:1}] },
      skills:[{name:"炎爆术",icon:"☄️",desc:"6倍火焰伤害",type:"dmg",mul:6,castTime:2},{name:"凤凰",icon:"🔥",desc:"7倍范围+灼烧",type:"dmg",mul:7,dot:true,castTime:3},{name:"奥术风暴",icon:"🌀",desc:"7倍奥术伤害",type:"dmg",mul:7,castTime:3},{name:"引力失常",icon:"💫",desc:"8倍伤害",type:"dmg",mul:8,castTime:4}] } },
  { key:'howling', name:'嚎风峡湾', icon:'⛵', faction:'诺森德', lvlRange:[68,73],
    desc:'诺森德东南部,维库人的家园',
    sub:[
      { name:'瓦尔加德',     lvl:[68,71], mobs:'👤维库人战士|🐺霜狼|🐻冰熊|🦅峡湾鹰' },
      { name:'乌特加德城堡', lvl:[71,73], mobs:'👤维库掠夺者|🐉始祖龙|❄️冰霜元素|🧟天灾先锋' },
    ],
    boss:{ name:'掠夺者因格瓦尔', emoji:'👤', lvl:75, desc:'乌特加德的维库之王' ,
      passive:{atkBonus:0.2,critChance:0.2,dmgReduction:0.15,dodgeChance:0.1,
      tricks: [{name:"迅捷",icon:"⚡",desc:"接下来8秒攻速提升40%",spdBuff:8},{name:"连斩",icon:"🗡️",desc:"下一次攻击造成两次伤害",nextDouble:2}] },
      skills:[{name:"黑暗斩击",icon:"🗡️",desc:"6倍伤害",type:"dmg",mul:6,castTime:2,weaken:true},{name:"暗影之怒",icon:"💢",desc:"7倍范围伤害",type:"dmg",mul:7,castTime:3,weaken:true},{name:"掠夺",icon:"👹",desc:"7倍伤害+吸血30%",type:"dmg",mul:7,lifeSteal:0.3,castTime:3},{name:"天灾之握",icon:"💀",desc:"8倍暗影伤害",type:"dmg",mul:8,castTime:4,weaken:true}] } },
  { key:'grizzly', name:'灰熊丘陵', icon:'🐻', faction:'诺森德', lvlRange:[73,77],
    desc:'诺森德的原始森林,熊怪与狼群的领地',
    sub:[
      { name:'灰熊丘陵营地', lvl:[73,75], mobs:'🐻巨熊|🐺森林狼|🦌雄鹿|👤熊怪' },
      { name:'达克萨隆要塞', lvl:[75,77], mobs:'🐻狂暴熊怪|❄️冰原猛犸|🧟天灾巨魔|🐺冰霜座狼' },
    ],
    boss:{ name:'达克萨隆巨熊', emoji:'🐻', lvl:79, desc:'灰熊丘陵的远古巨熊之灵' ,
      passive:{atkBonus:0.25,dmgReduction:0.2,critChance:0.15,dodgeChance:0.1,
      tricks: [{name:"复苏",icon:"💚",desc:"立即回复15%最大生命",healPct:0.15},{name:"不死之躯",icon:"💀",desc:"接下来5秒防御+50%且吸血20%",defBuff:5,leechBuff:5},{name:"狂怒",icon:"💢",desc:"接下来5秒攻击力提升50%",atkBuff:5}] },
      skills:[{name:"熊之怒",icon:"🐻",desc:"6倍伤害",type:"dmg",mul:6,castTime:2},{name:"横扫",icon:"🐾",desc:"7倍范围伤害",type:"dmg",mul:7,castTime:3},{name:"狂暴",icon:"💢",desc:"7倍伤害+吸血20%",type:"dmg",mul:7,lifeSteal:0.2,castTime:3,spdBuff:true},{name:"巨熊之握",icon:"🐻",desc:"8倍伤害+减速",type:"dmg",mul:8,slow:true,castTime:4}] } },
  { key:'sholazar', name:'索拉查盆地', icon:'🌴', faction:'诺森德', lvlRange:[75,78],
    desc:'诺森德的热带奇迹,泰坦生态实验场',
    sub:[
      { name:'奈辛瓦里营地', lvl:[75,77], mobs:'🦖迅猛龙|🦣长毛象|🐅剑齿虎|🦅恐鸟' },
      { name:'造物者平台',   lvl:[77,78], mobs:'🤖泰坦造物|🦖魔暴龙|🪲水晶巨虫|🌿狂野鞭笞者' },
    ],
    boss:{ name:'洛卡纳哈', emoji:'🐅', lvl:80, desc:'索拉查的稀有灵魂兽' ,
      passive:{dodgeChance:0.25,critChance:0.25,dmgReduction:0.15,atkBonus:0.15,stunChance:0.1,
      tricks: [{name:"再生",icon:"💚",desc:"立即回复25%最大生命",healPct:0.25},{name:"疾风",icon:"💨",desc:"接下来5秒攻速提升60%",spdBuff:5},{name:"致命连击",icon:"💥",desc:"下一次攻击造成双倍且必定暴击",nextDouble:1,critBuff:5}] },
      skills:[{name:"灵魂撕裂",icon:"🦁",desc:"6倍伤害",type:"dmg",mul:6,castTime:2},{name:"幽灵步",icon:"👻",desc:"7倍伤害",type:"dmg",mul:7,castTime:2.5},{name:"兽王之怒",icon:"💢",desc:"8倍范围伤害",type:"dmg",mul:8,castTime:3},{name:"洛卡纳哈之灵",icon:"✨",desc:"8倍伤害+吸血25%",type:"dmg",mul:8,lifeSteal:0.25,castTime:3.5},{name:"灵魂风暴",icon:"🌪️",desc:"9倍范围伤害",type:"dmg",mul:9,castTime:4}] } },
  { key:'waking', name:'觉醒海岸', icon:'🐲', faction:'龙岛', lvlRange:[80,82],
    desc:'巨龙群岛的熔火海岸,黑龙遗迹与原始元素在此重新苏醒',
    sub:[
      { name:'黑曜壁垒', lvl:[80,81], mobs:'🐉黑曜幼龙|🔥熔火元素|🪨龙鳞守卫|🦎岩浆蜥蜴' },
      { name:'狂风火山口', lvl:[81,82], mobs:'🌋熔岩喷涌者|🐲原始龙裔|🔥火誓术士|🦴焦骨猎手' },
    ],
    boss:{ name:'黑曜裂翼者', emoji:'🐲', lvl:84, desc:'盘踞在觉醒海岸火山口的黑龙叛徒',
      passive:{atkBonus:0.28,critChance:0.22,dmgReduction:0.18,dodgeChance:0.12,stunChance:0.12,
      tricks:[{name:"熔岩甲壳",icon:"🌋",desc:"回复20%生命且接下来5秒防御提升50%",healPct:0.2,defBuff:5},{name:"龙翼疾风",icon:"🪽",desc:"接下来5秒攻速提升60%",spdBuff:5},{name:"灼热处刑",icon:"🔥",desc:"下一次攻击造成双倍且必定暴击",nextDouble:1,critBuff:5}] },
      skills:[{name:'黑曜龙息',icon:'🐲',desc:'8倍火焰伤害+灼烧',type:'dmg',mul:8,dot:true,castTime:2.6,weaken:true},{name:'熔火扫尾',icon:'🌋',desc:'9倍范围伤害+破甲',type:'dmg',mul:9,aoe:true,sunder:true,castTime:3.4},{name:'裂翼俯冲',icon:'🪽',desc:'9倍伤害+流血',type:'dmg',mul:9,bleed:true,brittle:true,castTime:3.2},{name:'黑龙怒焰',icon:'🔥',desc:'10倍范围暗影烈焰',type:'dmg',mul:10,aoe:true,dot:true,fear:true,castTime:4.2}] } },
  { key:'ohnahran', name:'欧恩哈拉平原', icon:'🌾', faction:'龙岛', lvlRange:[80,84],
    desc:'半人马氏族驰骋的风暴草原,欧恩哈拉的风回荡在猎场之上',
    sub:[
      { name:'马鲁凯营地', lvl:[80,82], mobs:'🏹半人马射手|🐎草原战马|🦅风羽鹰|🌪️风暴灵' },
      { name:'风暴狩猎场', lvl:[82,84], mobs:'⚡雷角兽|🏹诺库德猎手|🌩️风暴召唤者|🦬草原巨兽' },
    ],
    boss:{ name:'风誓可汗阿拉塔', emoji:'🏹', lvl:86, desc:'被风暴誓约腐化的诺库德可汗',
      passive:{atkBonus:0.3,critChance:0.25,dmgReduction:0.17,dodgeChance:0.16,stunChance:0.14,
      tricks:[{name:"疾风",icon:"💨",desc:"接下来5秒攻速提升60%",spdBuff:5},{name:"致命专注",icon:"🎯",desc:"接下来5秒必定暴击",critBuff:5},{name:"战斗狂怒",icon:"🔥",desc:"接下来5秒攻击+40%且吸血15%",atkBuff:5,leechBuff:5}] },
      skills:[{name:'雷矛齐射',icon:'⚡',desc:'8倍自然伤害+沉默',type:'dmg',mul:8,silence:1800,castTime:2.5},{name:'草原合围',icon:'🏹',desc:'9倍范围伤害+流血',type:'dmg',mul:9,aoe:true,bleed:true,castTime:3.3},{name:'风暴践踏',icon:'🌩️',desc:'9倍范围伤害+眩晕',type:'dmg',mul:9,aoe:true,stun:true,castTime:3.6},{name:'可汗终令',icon:'👑',desc:'10倍伤害+恐惧',type:'dmg',mul:10,fear:true,brittle:true,castTime:4.1}] } },
  { key:'azure_span', name:'碧蓝林海', icon:'💠', faction:'龙岛', lvlRange:[80,86],
    desc:'蓝龙军团与海象人共同守护的冰雪林海,魔网裂隙在深处闪烁',
    sub:[
      { name:'伊斯卡拉海湾', lvl:[80,83], mobs:'🐟海象人猎手|❄️冰壳元素|🦭海湾海豹|🧊冻鳞兽' },
      { name:'碧蓝档案馆', lvl:[83,86], mobs:'💠奥术构装体|🐉蓝龙守卫|🌀魔网怨灵|❄️霜脉法师' },
    ],
    boss:{ name:'魔网吞噬者赛洛斯', emoji:'💠', lvl:88, desc:'在碧蓝档案馆吞食失控魔网的奥术巨兽',
      passive:{atkBonus:0.32,critChance:0.24,dmgReduction:0.2,dodgeChance:0.14,leech:0.08,
      tricks:[{name:"奥术护壁",icon:"🔮",desc:"回复20%生命且接下来5秒防御+50%",healPct:0.2,defBuff:5},{name:"法力过载",icon:"💠",desc:"接下来5秒攻击力提升50%",atkBuff:5},{name:"瞬发裂解",icon:"⚡",desc:"下一次攻击造成两次伤害",nextDouble:2}] },
      skills:[{name:'魔网抽离',icon:'💠',desc:'8倍奥术伤害+吸取资源',type:'dmg',mul:8,manaDrain:70,weaken:true,castTime:2.6},{name:'冰蓝坍缩',icon:'🧊',desc:'9倍范围伤害+冻结',type:'dmg',mul:9,aoe:true,freeze:1600,castTime:3.6},{name:'奥能镜像',icon:'🌀',desc:'9倍伤害+镜像错位',type:'dmg',mul:9,mirror:true,silence:1800,castTime:3.5},{name:'档案馆终曲',icon:'🌌',desc:'10倍范围奥术伤害',type:'dmg',mul:10,aoe:true,brittle:true,manaDrain:85,castTime:4.4}] } },
  { key:'thaldraszus', name:'索德拉苏斯', icon:'⏳', faction:'龙岛', lvlRange:[80,88],
    desc:'青铜龙与泰坦设施环绕的时间之都,群星与时流在此交汇',
    sub:[
      { name:'瓦德拉肯高塔', lvl:[80,84], mobs:'🐉龙裔守卫|⏳青铜时卫|✨星界学徒|🔮奥术看守' },
      { name:'时光汇流', lvl:[84,88], mobs:'⏳时空裂隙|🌌星界畸体|🐲永恒龙裔|⚙️泰坦机兵' },
    ],
    boss:{ name:'永恒时誓者克罗诺斯', emoji:'⏳', lvl:90, desc:'试图重写龙岛命运的永恒龙裔指挥官',
      passive:{atkBonus:0.35,critChance:0.28,dmgReduction:0.22,dodgeChance:0.16,leech:0.1,stunChance:0.16,
      tricks:[{name:"时间回卷",icon:"⏳",desc:"立即回复25%最大生命",healPct:0.25},{name:"静止力场",icon:"🛡️",desc:"接下来5秒防御提升50%",defBuff:5},{name:"命运重击",icon:"💥",desc:"下一次攻击造成双倍且必定暴击",nextDouble:1,critBuff:5}] },
      skills:[{name:'时流断裂',icon:'⏳',desc:'9倍奥术伤害+沉默',type:'dmg',mul:9,silence:2000,manaDrain:75,castTime:2.8},{name:'永恒龙息',icon:'🐲',desc:'10倍范围伤害+灼烧',type:'dmg',mul:10,aoe:true,dot:true,weaken:true,castTime:3.8},{name:'命运枷锁',icon:'🔗',desc:'10倍伤害+灵魂链接',type:'dmg',mul:10,soulLink:true,fear:true,castTime:3.6},{name:'群星归零',icon:'🌌',desc:'11倍范围终局伤害',type:'dmg',mul:11,aoe:true,decay2:true,brittle:true,castTime:4.8}] } },
  { key:'dornogal', name:'多恩岛', icon:'🏛️', faction:'卡兹阿加', lvlRange:[88,90],
    desc:'土灵主城与地心裂隙交错的远征前线,地下堡入口在群山下闪烁',
    sub:[
      { name:'多恩诺嘉尔城门', lvl:[88,89], mobs:'🗿土灵守卫|⚒️铸炉学徒|🪨震地构装体|🔮档案看守' },
      { name:'裂隙矿道', lvl:[89,90], mobs:'🕷️蛛魔斥候|🪲暗壳掘地者|🧿虚空低语者|⚙️失控钻机' },
    ],
    boss:{ name:'裂隙执政官哈洛姆', emoji:'🗿', lvl:92, desc:'在多恩岛地下裂隙中苏醒的土灵执政官',
      passive:{atkBonus:0.38,critChance:0.28,dmgReduction:0.24,dodgeChance:0.14,stunChance:0.18,
      tricks:[{name:"岩心回响",icon:"🪨",desc:"回复20%生命并提高防御",healPct:0.2,defBuff:5},{name:"矩阵超载",icon:"⚙️",desc:"接下来5秒攻击力提升50%",atkBuff:5},{name:"裂地处决",icon:"💥",desc:"下一次攻击造成双倍且必定暴击",nextDouble:1,critBuff:5}] },
      skills:[{name:'地心裂击',icon:'🪨',desc:'10倍伤害+破甲',type:'dmg',mul:10,sunder:true,brittle:true,castTime:3.2},{name:'泰坦封锁',icon:'🔒',desc:'10倍范围伤害+沉默',type:'dmg',mul:10,aoe:true,silence:2100,manaDrain:80,castTime:3.8},{name:'裂隙坍塌',icon:'🌀',desc:'11倍范围伤害+眩晕',type:'dmg',mul:11,aoe:true,stun:1800,decay2:true,castTime:4.4}] } },
  { key:'hallowfall', name:'陨圣峪', icon:'✨', faction:'卡兹阿加', lvlRange:[90,92],
    desc:'永燃水晶照亮的地下苍穹,圣焰军团在黑暗浪潮前筑起防线',
    sub:[
      { name:'圣焰修院', lvl:[90,91], mobs:'✝️圣焰侍僧|🛡️阿拉希骑士|🔥信标守卫|🕯️烛光祭司' },
      { name:'暗潮海岸', lvl:[91,92], mobs:'🦑虚空爪牙|🌑暗潮信徒|🦀深渊甲壳兽|👁️低语浮眼' },
    ],
    boss:{ name:'圣焰审判官梅瑞安', emoji:'✝️', lvl:94, desc:'被虚空回声逼至狂热边缘的阿拉希审判官',
      passive:{atkBonus:0.42,critChance:0.3,dmgReduction:0.25,dodgeChance:0.15,leech:0.08,stunChance:0.18,
      tricks:[{name:"圣焰护壁",icon:"🛡️",desc:"回复20%生命且接下来5秒防御+50%",healPct:0.2,defBuff:5},{name:"狂热祷言",icon:"🙏",desc:"接下来5秒攻击+40%且吸血15%",atkBuff:5,leechBuff:5},{name:"审判专注",icon:"🎯",desc:"接下来5秒必定暴击",critBuff:5}] },
      skills:[{name:'圣焰裁决',icon:'🔥',desc:'10倍神圣火焰伤害+灼烧',type:'dmg',mul:10,dot:true,brittle:true,castTime:3.1},{name:'光晕震爆',icon:'✨',desc:'11倍范围伤害+沉默',type:'dmg',mul:11,aoe:true,silence:2200,weaken:true,castTime:4},{name:'信标终判',icon:'☄️',desc:'12倍范围终局伤害',type:'dmg',mul:12,aoe:true,alwaysCrit:true,fear:1800,castTime:4.8}] } },
  { key:'azj_kahet', name:"艾基-卡赫特", icon:'🕸️', faction:'卡兹阿加', lvlRange:[92,95],
    desc:'蛛魔帝国的黑暗王廷,虚空丝线从宫殿深处牵动每一场战斗',
    sub:[
      { name:'纺丝城区', lvl:[92,93], mobs:'🕷️蛛魔纺丝者|🧵织网祭司|🪲暗壳卫士|🌑虚空幼体' },
      { name:'尼鲁巴尔王廷', lvl:[94,95], mobs:'👑王廷禁卫|👁️低语议员|🕸️蛛网巨像|🦑虚空织命者' },
    ],
    boss:{ name:'王廷织命者夏伊洛', emoji:'🕸️', lvl:97, desc:'安苏雷克女王麾下最危险的命运编织者',
      passive:{atkBonus:0.48,critChance:0.32,dmgReduction:0.28,dodgeChance:0.18,leech:0.12,stunChance:0.2,
      tricks:[{name:"命运织网",icon:"🕸️",desc:"接下来5秒防御提升50%且吸血20%",defBuff:5,leechBuff:5},{name:"王廷号令",icon:"👑",desc:"接下来5秒攻击力提升50%",atkBuff:5},{name:"断丝处刑",icon:"🗡️",desc:"下一次攻击造成双倍伤害",nextDouble:1}] },
      skills:[{name:'蛛网绞杀',icon:'🕸️',desc:'11倍伤害+沉默',type:'dmg',mul:11,silence:2300,cripple:true,castTime:3.2},{name:'虚空毒潮',icon:'🌑',desc:'12倍范围伤害+瘟疫',type:'dmg',mul:12,aoe:true,plague:true,dot:true,castTime:4.1},{name:'王廷断命',icon:'👑',desc:'13倍终局伤害+恐惧',type:'dmg',mul:13,alwaysCrit:true,fear:2200,soulLink:true,castTime:5}] } },
  { key:'karesh', name:"卡雷什", icon:'🌌', faction:'卡雷什信托', lvlRange:[95,100],
    art:'assets/wow/art/karesh-map.png',
    desc:'被虚空撕裂的虚灵故乡,塔扎维什与生态圆顶在残破星球上撑起最后防线',
    sub:[
      { name:'塔扎维什帷纱集市', lvl:[95,97], mobs:'🧿虚灵仲裁者|💠相位潜行者|📜契约掮客|🌌虚空裂隙' },
      { name:'阿尔达尼生态圆顶', lvl:[97,100], mobs:'🍃圆顶守护者|🦎吞噬幼体|☣️荒原掠夺者|💎奥术温室' },
    ],
    boss:{ name:'相位猎手瓦兹鲁', emoji:'🧿', lvl:101, desc:'在相位潜航中追猎冒险者的卡雷什通缉犯',
      passive:{atkBonus:0.54,critChance:0.34,dmgReduction:0.3,dodgeChance:0.2,leech:0.14,stunChance:0.22,
      tricks:[{name:"相位潜航",icon:"🌀",desc:"接下来5秒闪避和减伤提高",defBuff:5},{name:"虚灵契约",icon:"📜",desc:"回复22%生命并提升攻击",healPct:0.22,atkBuff:5},{name:"裂隙狩猎",icon:"🎯",desc:"下一次攻击造成双倍且必定暴击",nextDouble:1,critBuff:5}] },
      skills:[{name:'相位切割',icon:'🌀',desc:'12倍伤害+镜像错位',type:'dmg',mul:12,mirror:true,brittle:true,castTime:3.1},{name:'虚空通缉令',icon:'📜',desc:'12.5倍范围伤害+沉默',type:'dmg',mul:12.5,aoe:true,silence:2300,threat:true,castTime:4},{name:'群星吞噬',icon:'🌌',desc:'13.5倍范围终局伤害+恐惧',type:'dmg',mul:13.5,aoe:true,plague:true,fear:2200,alwaysCrit:true,castTime:5}] } },
  { key:'rhovan', name:"生态圆顶:罗凡", icon:'🌿', faction:'卡雷什信托', lvlRange:[99,101],
    art:'assets/wow/art/ecodome-rhovan.png',
    desc:'仍在复苏的巨型生态圆顶里保存着卡雷什最完整的生命样本,也是吞噬者与影卫最想撕碎的地方',
    sub:[
      { name:'罗凡湿地苗圃', lvl:[99,100], mobs:'🌿圆顶园艺师|🦎水化猎群|☣️裂网孢母|💧灌溉构装体' },
      { name:'谱系温室环带', lvl:[100,101], mobs:'🧬生命编织体|🍃样本守护者|👁️虚空孢眼|🪴芽冠巨株' },
    ],
    boss:{ name:'谱系看护者赛弗琳', emoji:'🌿', lvl:103, desc:'负责维持罗凡生命谱系的虚灵看护者,在圆顶失衡后被迫进入战斗态势',
      passive:{atkBonus:0.56,critChance:0.34,dmgReduction:0.31,dodgeChance:0.18,leech:0.12,stunChance:0.2,
      tricks:[{name:"样本回灌",icon:"💧",desc:"回复22%生命并提高减伤",healPct:0.22,defBuff:5},{name:"温室催化",icon:"🌱",desc:"接下来5秒攻击与攻速提升",atkBuff:5,spdBuff:5},{name:"谱系封缚",icon:"🧬",desc:"下一次攻击造成双倍伤害并附带沉默",nextDouble:1,critBuff:5}] },
      skills:[{name:'芽冠穿刺',icon:'🌿',desc:'12.5倍伤害+破甲',type:'dmg',mul:12.5,sunder:true,brittle:true,castTime:3.2},{name:'生态反冲',icon:'🍃',desc:'13倍范围伤害+虚弱',type:'dmg',mul:13,aoe:true,weaken:true,castTime:4},{name:'罗凡共鸣',icon:'🧬',desc:'14倍终局伤害+吸取资源',type:'dmg',mul:14,manaDrain:110,silence:2200,alwaysCrit:true,castTime:5}] } },
  { key:'shadow_point', name:'影点', icon:'🌑', faction:'卡雷什信托', lvlRange:[100,102],
    art:'assets/wow/art/shadow-point.png',
    desc:'Shadow Point 被影卫虚灵改造成锁定裂隙航线的战争平台,所有路口都指向吞界前线',
    sub:[
      { name:'影点外环工事', lvl:[100,101], mobs:'🌑影卫步卒|⚙️界钉技师|🧿相位狙击手|🌀虚空瞭望机' },
      { name:'吞界前线廊桥', lvl:[101,102], mobs:'👁️裂隙占卜者|💀无缚畸体|🌌影界碎喉者|🔮虚空蓄能塔' },
    ],
    boss:{ name:'影点执监阿萨瑞克', emoji:'🌑', lvl:104, desc:'统管 Shadow Point 轨道炮列与裂隙舰队的影卫执监',
      passive:{atkBonus:0.58,critChance:0.35,dmgReduction:0.32,dodgeChance:0.2,leech:0.14,stunChance:0.22,
      tricks:[{name:"影卫换相",icon:"🌀",desc:"接下来5秒闪避与减伤提升",defBuff:5},{name:"界炮蓄压",icon:"⚙️",desc:"接下来5秒攻击与暴击提升",atkBuff:5,critBuff:5},{name:"影点狙杀",icon:"🎯",desc:"下一次攻击造成双倍且必定暴击",nextDouble:1,critBuff:5}] },
      skills:[{name:'裂轨狙击',icon:'🎯',desc:'13倍伤害+破绽',type:'dmg',mul:13,brittle:true,cripple:true,castTime:3.1},{name:'影炮齐鸣',icon:'🌑',desc:'13.5倍范围伤害+沉默',type:'dmg',mul:13.5,aoe:true,silence:2300,castTime:4.1},{name:'虚空航线锁定',icon:'🌌',desc:'14.5倍终局伤害+恐惧',type:'dmg',mul:14.5,aoe:true,mirror:true,fear:2300,alwaysCrit:true,castTime:5}] } },
  { key:'shandorah', name:'沙恩多拉', icon:'🌠', faction:'卡雷什信托', lvlRange:[101,103],
    art:'assets/wow/art/shandorah.png',
    desc:'漂浮于裂岩之上的观星神殿曾为虚灵测绘群星航道,如今则成为影卫议会排演终局仪轨的场所',
    sub:[
      { name:'星相断阶', lvl:[101,102], mobs:'🌠星图记录者|📐测绘侍从|🧿观星誓约者|🔷棱镜浮卫' },
      { name:'群星神殿回廊', lvl:[102,103], mobs:'✨议会预言者|💠星纱司辰|🌌虚空观测体|🪞折光圣像' },
    ],
    boss:{ name:'星潮观测者乌姆瑟斯', emoji:'🌠', lvl:105, desc:'沙恩多拉仪轨的总调度者,尝试用观星阵列为吞界舰队重新定标',
      passive:{atkBonus:0.6,critChance:0.36,dmgReduction:0.33,dodgeChance:0.2,leech:0.14,stunChance:0.22,
      tricks:[{name:"星盘逆转",icon:"🌠",desc:"回复24%生命并提高防御",healPct:0.24,defBuff:5},{name:"仪轨暴涨",icon:"✨",desc:"接下来5秒攻击与攻速提升",atkBuff:5,spdBuff:5},{name:"观测终点",icon:"🔭",desc:"下一次攻击造成双倍伤害并附带沉默",nextDouble:1,critBuff:5}] },
      skills:[{name:'星纱裁切',icon:'✨',desc:'13.5倍伤害+吸取资源',type:'dmg',mul:13.5,manaDrain:115,castTime:3.2},{name:'棱镜谐振',icon:'💠',desc:'14倍范围伤害+镜像错位',type:'dmg',mul:14,aoe:true,mirror:true,silence:2200,castTime:4.2},{name:'群星归航',icon:'🌌',desc:'15倍终局伤害+恐惧与虚弱',type:'dmg',mul:15,aoe:true,fear:2400,weaken:true,alwaysCrit:true,castTime:5.2}] } },
  { key:'primeus', name:'秘境:普莱姆斯', icon:'📚', faction:'卡雷什信托', lvlRange:[102,104],
    art:'assets/wow/art/primeus-repository.png',
    desc:'普莱姆斯残存的档案圣所把虚灵学识、折光枢纽与群星索引全部锁进高墙,如今却同时被影卫和掠夺者夺门而入',
    sub:[
      { name:'抄录者前庭', lvl:[102,103], mobs:'📚圣所抄录者|💠折光馆卫|📐索引校准者|🧿虚空读写体' },
      { name:'群星档案穹厅', lvl:[103,104], mobs:'✨仪轨档案官|🔷镜壁守护者|🌀奥术回响体|📜星图删改师' },
    ],
    boss:{ name:'群星编目者涅普提拉', emoji:'📚', lvl:106, desc:'普莱姆斯最高权限的档案总管,已经把所有闯入者都列入“应被抹除”的灾厄条目',
      passive:{atkBonus:0.62,critChance:0.37,dmgReduction:0.34,dodgeChance:0.2,leech:0.14,stunChance:0.22,
      tricks:[{name:"卷册回卷",icon:"📜",desc:"回复24%生命并提高减伤",healPct:0.24,defBuff:5},{name:"索引超频",icon:"📚",desc:"接下来5秒攻击与暴击提升",atkBuff:5,critBuff:5},{name:"删改裁定",icon:"📐",desc:"下一次攻击造成双倍伤害并沉默目标",nextDouble:1,critBuff:5}] },
      skills:[{name:'折光删页',icon:'📚',desc:'14倍伤害+沉默',type:'dmg',mul:14,silence:2300,brittle:true,castTime:3.2},{name:'群星索引错位',icon:'💠',desc:'14.5倍范围伤害+镜像错位',type:'dmg',mul:14.5,aoe:true,mirror:true,manaDrain:120,castTime:4.2},{name:'归档终审',icon:'🌌',desc:'15.5倍终局伤害+恐惧与灵魂链接',type:'dmg',mul:15.5,aoe:true,fear:2400,soulLink:true,alwaysCrit:true,castTime:5.3}] } },
  { key:'voidrazor', name:'虚无剃刀庇护所', icon:'🪐', faction:'卡雷什信托', lvlRange:[103,105],
    art:'assets/wow/art/voidrazor-sanctum.png',
    desc:'在吞界漩涡边缘苟活的圆顶庇护所不断被虚空剃刀切开天幕,每一道裂口都在向影卫舰队泄露卡雷什最后的生机',
    sub:[
      { name:'剃锋外环圆顶', lvl:[103,104], mobs:'🪐剃锋难民卫兵|☣️虚空雾行者|🔮折光护穹师|🕳️吞界裂壳兽' },
      { name:'漩涡观测壁垒', lvl:[104,105], mobs:'🌌边界观测者|⚙️裂口稳固机|🌫️饥渴回响体|🧿吞界誓约者' },
    ],
    boss:{ name:'庇护所裁断者维什卡', emoji:'🪐', lvl:107, desc:'负责以“剃刀规约”筛选幸存者的庇护所执裁官,把整片圆顶当作实验性的生死筛床',
      passive:{atkBonus:0.64,critChance:0.38,dmgReduction:0.35,dodgeChance:0.2,leech:0.16,stunChance:0.24,
      tricks:[{name:"剃锋换幕",icon:"🪐",desc:"接下来5秒闪避和减伤提高",defBuff:5},{name:"吞界切线",icon:"🌌",desc:"接下来5秒攻击与攻速提升",atkBuff:5,spdBuff:5},{name:"绝域裁落",icon:"⚔️",desc:"下一次攻击造成双倍伤害并附带虚弱",nextDouble:1,critBuff:5}] },
      skills:[{name:'虚刃截面',icon:'🪐',desc:'14.5倍伤害+破甲',type:'dmg',mul:14.5,sunder:true,cripple:true,castTime:3.1},{name:'边界坍缩',icon:'🌫️',desc:'15倍范围伤害+凋零与沉默',type:'dmg',mul:15,aoe:true,decay2:true,silence:2300,castTime:4.2},{name:'吞界终域',icon:'🌌',desc:'16倍终局伤害+恐惧、镜像错位',type:'dmg',mul:16,aoe:true,fear:2500,mirror:true,alwaysCrit:true,castTime:5.4}] } },
  { key:'eversong_midnight', name:'永歌森林:午夜', icon:'🍂', faction:'银月议庭', lvlRange:[104,106],
    art:'assets/wow/art/timewalking-outland-banner.jpg',
    desc:'Midnight 中重塑的奎尔萨拉斯前线,银月城、永歌森林与鬼魂之地在虚空风暴下重新连成一片',
    sub:[
      { name:'银月城谋杀巷', lvl:[104,105], mobs:'🗡️邪能走私者|🧙堕落魔导师|🌑虚空线人|🦅远行者密探' },
      { name:'萨瑟利尔高庭', lvl:[105,106], mobs:'🍷贵族决斗者|✨日怒法师|🛡️血骑士哨兵|👁️虚空窥探者' },
    ],
    boss:{ name:'萨瑟利尔暗宴议会', emoji:'🍷', lvl:108, desc:'借高等精灵社交宴会掩护虚空渗透的银月阴谋议会',
      passive:{atkBonus:0.66,critChance:0.39,dmgReduction:0.36,dodgeChance:0.22,leech:0.16,stunChance:0.24,
      tricks:[{name:"日井护幕",icon:"✨",desc:"回复25%生命并提高减伤",healPct:0.25,defBuff:5},{name:"贵族决斗令",icon:"⚔️",desc:"接下来5秒攻击与暴击提升",atkBuff:5,critBuff:5},{name:"暗宴点名",icon:"🎯",desc:"下一次攻击造成双倍伤害并沉默目标",nextDouble:1,critBuff:5}] },
      skills:[{name:'法力心针',icon:'💠',desc:'15倍伤害+吸取资源',type:'dmg',mul:15,manaDrain:125,brittle:true,castTime:3.2},{name:'虚空风暴来信',icon:'🌑',desc:'15.5倍范围伤害+沉默',type:'dmg',mul:15.5,aoe:true,silence:2400,mirror:true,castTime:4.2},{name:'银月暗幕',icon:'🍷',desc:'16.5倍终局伤害+恐惧与虚弱',type:'dmg',mul:16.5,aoe:true,fear:2500,weaken:true,alwaysCrit:true,castTime:5.4}] } },
  { key:'zulaman_midnight', name:"祖阿曼:午夜", icon:'🐻', faction:'阿曼尼部族', lvlRange:[106,108],
    art:'assets/wow/art/timewalking-cataclysm-banner.jpg',
    desc:'Midnight 中重塑的阿曼尼领地,熊、鹰、山猫与龙鹰洛阿神庙在虚空压力下重新苏醒',
    sub:[
      { name:'纳洛拉克梦境兽穴', lvl:[106,107], mobs:'🐻洛阿试炼者|❄️冬境哨兵|🧿阿曼尼占卜者|🥩贪食囤货者' },
      { name:'迈萨拉献祭洞窟', lvl:[107,108], mobs:'🦅复生巨鹰|💀邪枝魂祭司|🧟亡魂巨魔|🌑死灵图腾' },
    ],
    boss:{ name:'祖尔加拉', emoji:'🐻', lvl:110, desc:'阿曼尼新领袖,在守护部族与抵抗虚空之间被迫发动最严酷的洛阿试炼',
      passive:{atkBonus:0.70,critChance:0.41,dmgReduction:0.38,dodgeChance:0.22,leech:0.18,stunChance:0.26,
      tricks:[{name:"熊神耐力",icon:"🐻",desc:"回复26%生命并提高防御",healPct:0.26,defBuff:5},{name:"鹰神急袭",icon:"🦅",desc:"接下来5秒攻速与暴击提升",spdBuff:5,critBuff:5},{name:"山猫裂爪",icon:"🐾",desc:"下一次攻击造成双倍伤害并附带流血",nextDouble:1,critBuff:5}] },
      skills:[{name:'洛阿战嚎',icon:'🐻',desc:'16倍伤害+眩晕',type:'dmg',mul:16,stun:2400,sunder:true,castTime:3.1},{name:'冬境鹰暴',icon:'❄️',desc:'16.5倍范围伤害+冰缚',type:'dmg',mul:16.5,aoe:true,freeze:2200,weaken:true,castTime:4.2},{name:'阿曼尼终誓',icon:'👑',desc:'17.5倍终局伤害+恐惧与灵魂链接',type:'dmg',mul:17.5,aoe:true,fear:2600,soulLink:true,alwaysCrit:true,castTime:5.5}] } },
  { key:'harandar', name:'哈兰达尔', icon:'🍄', faction:'银月议庭', lvlRange:[108,109],
    art:'assets/wow/art/timewalking-shadowlands-banner.png',
    desc:'Revelations 中开放的孢落前线,生物荧光菌林与虚空孢潮在地底边境互相吞噬',
    sub:[
      { name:'孢落菌林', lvl:[108,109], mobs:'🍄爆裂末日菇|🦎孢壳爬行者|☣️毒孢喷吐者|🌿菌丝守卫' },
      { name:'哈兰达尔裂谷', lvl:[109,109], mobs:'🪨真菌巨人|🧫腐沼孢团|🌑虚空感染体|🧿孢潮先知' },
    ],
    boss:{ name:'腐沼', emoji:'🍄', lvl:111, desc:'孢落单首领团本的真菌巨人,会召唤孢菇、孢团和毒雾压垮战场',
      passive:{atkBonus:0.74,critChance:0.42,dmgReduction:0.40,dodgeChance:0.2,leech:0.18,stunChance:0.26,
      tricks:[{name:"孢潮再生",icon:"🍄",desc:"回复28%生命并提高减伤",healPct:0.28,defBuff:5},{name:"菌丝暴涨",icon:"🌿",desc:"接下来5秒攻击与吸血提升",atkBuff:5,leechBuff:5},{name:"末日菇点名",icon:"🎯",desc:"下一次攻击造成双倍且必定暴击",nextDouble:1,critBuff:5}] },
      skills:[{name:'毒孢爆发',icon:'☣️',desc:'17倍范围伤害+瘟疫',type:'dmg',mul:17,aoe:true,plague:true,dot:true,castTime:3.3},{name:'末日蘑菇',icon:'🍄',desc:'17.5倍伤害+召唤孢群',type:'dmg',mul:17.5,aoe:true,cripple:true,castTime:4.4},{name:'孢落坍塌',icon:'🌌',desc:'18.5倍终局伤害+恐惧与沉默',type:'dmg',mul:18.5,aoe:true,fear:2700,silence:2600,alwaysCrit:true,castTime:5.6}] } },
];

const RARE_ELITE_SKILLSETS = {
  beast: {
    passive:{ atkBonus:0.14, critChance:0.12, dodgeChance:0.08, dmgReduction:0.08 },
    supportCount:1,
    skills:[
      {name:'撕裂扑击', icon:'🐾', desc:'6倍伤害', type:'dmg', mul:6, castTime:1.8, bleed:true, cripple:true},
      {name:'野性震吼', icon:'🦁', desc:'7倍伤害', type:'dmg', mul:7, castTime:2.4, weaken:true, stun:1000},
      {name:'饥饿追猎', icon:'🩸', desc:'7倍伤害并吸血', type:'dmg', mul:7, castTime:2.8, lifeSteal:0.22, frenzy:true}
    ]
  },
  undead: {
    passive:{ atkBonus:0.1, critChance:0.1, dmgReduction:0.12, leech:0.08 },
    supportCount:1,
    skills:[
      {name:'亡者之握', icon:'💀', desc:'6倍暗影伤害', type:'dmg', mul:6, castTime:1.9, weaken:true, decay:true},
      {name:'腐疫爆发', icon:'🦠', desc:'7倍伤害', type:'dmg', mul:7, castTime:2.6, plague:true, dot:true},
      {name:'灵魂榨取', icon:'👻', desc:'7倍暗影伤害', type:'dmg', mul:7, castTime:3, soulDrain:true, fear:1200}
    ]
  },
  bandit: {
    passive:{ atkBonus:0.16, critChance:0.14, dodgeChance:0.1 },
    supportCount:1,
    skills:[
      {name:'伏击开膛', icon:'🗡️', desc:'6倍伤害', type:'dmg', mul:6, castTime:1.5, bleed:true, brittle:true},
      {name:'烟幕突袭', icon:'🌫️', desc:'7倍伤害', type:'dmg', mul:7, castTime:2.2, weaken:true, silence:1200},
      {name:'黑火炸药', icon:'💣', desc:'7倍范围伤害', type:'dmg', mul:7, castTime:2.8, aoe:true, bomb:true}
    ]
  },
  fire: {
    passive:{ atkBonus:0.16, critChance:0.14, dmgReduction:0.08 },
    supportCount:1,
    skills:[
      {name:'烈焰啃噬', icon:'🔥', desc:'6倍火焰伤害', type:'dmg', mul:6, castTime:1.8, dot:true, brittle:true},
      {name:'熔火爆裂', icon:'🌋', desc:'7倍伤害', type:'dmg', mul:7, castTime:2.6, dot:true, silence:1200},
      {name:'余烬喷发', icon:'☄️', desc:'7倍范围伤害', type:'dmg', mul:7, castTime:3, aoe:true, dot:true}
    ]
  },
  dragon: {
    passive:{ atkBonus:0.18, critChance:0.14, dmgReduction:0.12, dodgeChance:0.08 },
    supportCount:1,
    skills:[
      {name:'龙炎吐息', icon:'🐉', desc:'7倍火焰伤害', type:'dmg', mul:7, castTime:2.2, dot:true, weaken:true},
      {name:'裂鳞横扫', icon:'🪽', desc:'7倍范围伤害', type:'dmg', mul:7, castTime:2.8, aoe:true, stun:1200},
      {name:'高空俯冲', icon:'🦴', desc:'8倍伤害', type:'dmg', mul:8, castTime:3.2, bleed:true, brittle:true}
    ]
  },
  poison: {
    passive:{ atkBonus:0.12, critChance:0.1, dodgeChance:0.1, leech:0.05 },
    supportCount:1,
    skills:[
      {name:'剧毒穿刺', icon:'🦂', desc:'6倍伤害', type:'dmg', mul:6, castTime:1.7, dot:true, plague:true},
      {name:'腐液喷溅', icon:'🐍', desc:'7倍伤害', type:'dmg', mul:7, castTime:2.6, cripple:true, decay:true},
      {name:'毒雾弥漫', icon:'☠️', desc:'7倍范围伤害', type:'dmg', mul:7, castTime:3, aoe:true, plague:true}
    ]
  },
  arcane: {
    passive:{ atkBonus:0.12, critChance:0.14, dmgReduction:0.08 },
    supportCount:1,
    skills:[
      {name:'奥能崩裂', icon:'✨', desc:'6倍奥术伤害', type:'dmg', mul:6, castTime:1.9, silence:1400},
      {name:'法力抽离', icon:'🔮', desc:'7倍伤害', type:'dmg', mul:7, castTime:2.5, manaDrain:45, weaken:true},
      {name:'虚空错位', icon:'🌀', desc:'7倍范围伤害', type:'dmg', mul:7, castTime:3, aoe:true, mirror:true}
    ]
  },
  shadow: {
    passive:{ atkBonus:0.14, critChance:0.12, dmgReduction:0.1, dodgeChance:0.08 },
    supportCount:1,
    skills:[
      {name:'暗影穿心', icon:'🌑', desc:'6倍暗影伤害', type:'dmg', mul:6, castTime:1.9, weaken:true, silence:1200},
      {name:'恐惧啃噬', icon:'👻', desc:'7倍伤害', type:'dmg', mul:7, castTime:2.6, fear:1400, soulDrain:true},
      {name:'虚无枷锁', icon:'🔗', desc:'7倍伤害', type:'dmg', mul:7, castTime:3, decay2:true, soulLink:true}
    ]
  },
  demon: {
    passive:{ atkBonus:0.18, critChance:0.14, dmgReduction:0.1, leech:0.08 },
    supportCount:1,
    skills:[
      {name:'邪能重击', icon:'😈', desc:'7倍邪能伤害', type:'dmg', mul:7, castTime:2, weaken:true, brittle:true},
      {name:'末日烙印', icon:'🌑', desc:'7倍暗影伤害', type:'dmg', mul:7, castTime:2.8, dot:true, soulLink:true},
      {name:'深渊践踏', icon:'💥', desc:'8倍范围伤害', type:'dmg', mul:8, castTime:3.2, aoe:true, stun:1200}
    ]
  },
  frost: {
    passive:{ atkBonus:0.12, critChance:0.1, dmgReduction:0.12, dodgeChance:0.08 },
    supportCount:1,
    skills:[
      {name:'寒霜撕咬', icon:'❄️', desc:'6倍冰霜伤害', type:'dmg', mul:6, castTime:1.8, slow:true, freeze:1000},
      {name:'冰墓冲撞', icon:'🧊', desc:'7倍伤害', type:'dmg', mul:7, castTime:2.6, brittle:true, decay:true},
      {name:'凛冬风暴', icon:'🌨️', desc:'7倍范围伤害', type:'dmg', mul:7, castTime:3.1, aoe:true, freeze:1200}
    ]
  },
  nature: {
    passive:{ atkBonus:0.12, critChance:0.1, dmgReduction:0.1, dodgeChance:0.08 },
    supportCount:1,
    skills:[
      {name:'根须缠杀', icon:'🌿', desc:'6倍自然伤害', type:'dmg', mul:6, castTime:1.9, cripple:true, weaken:true},
      {name:'孢群腐化', icon:'🍄', desc:'7倍伤害', type:'dmg', mul:7, castTime:2.7, plague:true, decay:true},
      {name:'荒野震荡', icon:'🌳', desc:'7倍范围伤害', type:'dmg', mul:7, castTime:3.1, aoe:true, stun:1000}
    ]
  },
  storm: {
    passive:{ atkBonus:0.14, critChance:0.12, dmgReduction:0.1, dodgeChance:0.08 },
    supportCount:1,
    skills:[
      {name:'雷殛重拳', icon:'⚡', desc:'6倍自然伤害', type:'dmg', mul:6, castTime:1.8, stun:1100},
      {name:'静电灼流', icon:'🌩️', desc:'7倍伤害', type:'dmg', mul:7, castTime:2.5, manaDrain:40, silence:1200},
      {name:'风暴连锁', icon:'⛈️', desc:'7倍范围伤害', type:'dmg', mul:7, castTime:3.1, aoe:true, weaken:true}
    ]
  },
  brute: {
    passive:{ atkBonus:0.16, critChance:0.1, dmgReduction:0.12 },
    supportCount:1,
    skills:[
      {name:'碎骨重殴', icon:'🔨', desc:'6倍伤害', type:'dmg', mul:6, castTime:1.7, stun:1000, brittle:true},
      {name:'践踏震波', icon:'🌍', desc:'7倍范围伤害', type:'dmg', mul:7, castTime:2.6, aoe:true, weaken:true},
      {name:'处决撕裂', icon:'🪓', desc:'7倍伤害', type:'dmg', mul:7, castTime:2.8, bleed:true, sunder:true}
    ]
  }
};

const MAP_RARE_ELITE_SEEDS = {
  elwynn:{ name:'林地獠牙母狼', emoji:'🐺', theme:'beast', desc:'潜伏在林间的老猎手，只在最安静的时候现身。' },
  tirisfal:{ name:'白骨守夜人', emoji:'💀', theme:'undead', desc:'提瑞斯法墓穴深处走出的古老看守者。' },
  durotar:{ name:'裂尾毒刺', emoji:'🦂', theme:'poison', desc:'在赤红峡谷中猎食已久的巨型沙蝎。' },
  westfall:{ name:'迪菲亚断手', emoji:'🗡️', theme:'bandit', desc:'专门埋伏旅商的迪菲亚老兵。' },
  silverpine:{ name:'月嚎影爪', emoji:'🐺', theme:'undead', desc:'被诅咒得最深的银松狼人。' },
  redridge:{ name:'黑翼余烬', emoji:'🐉', theme:'dragon', desc:'从黑石山边境游荡而来的幼龙头目。' },
  barrens:{ name:'剃刀荒原毒母', emoji:'🦂', theme:'poison', desc:'在贫瘠之地迁徙的剧毒女王。' },
  wetlands:{ name:'雾鳞巡空者', emoji:'🐉', theme:'dragon', desc:'常年盘旋在湿地上空的沼泽飞龙。' },
  duskwood:{ name:'夜幕食魂者', emoji:'👻', theme:'undead', desc:'会在暮色最浓时撕扯灵魂的幽影。' },
  thousand:{ name:'石针践踏者', emoji:'🦖', theme:'brute', desc:'在峡谷间横冲直撞的荒漠巨兽。' },
  stranglethorn:{ name:'血冠丛林之王', emoji:'🐅', theme:'beast', desc:'祖尔格拉布外围最危险的顶级掠食者。' },
  searing:{ name:'焦岩吞火者', emoji:'🔥', theme:'fire', desc:'从灼热地缝中爬出的熔岩吞噬者。' },
  burning:{ name:'黑石灼翼', emoji:'🐉', theme:'fire', desc:'披着灰烬与铁鳞的黑色双足飞龙。' },
  ungoro:{ name:'熔喉暴君', emoji:'🦖', theme:'beast', desc:'安戈洛火山环带里的食物链顶点。' },
  silithus:{ name:'沙语毒皇', emoji:'🦂', theme:'poison', desc:'其拉虫群之外最凶残的沙海杀手。' },
  eastern_plague:{ name:'瘟疫织魂者', emoji:'☠️', theme:'undead', desc:'能将瘟疫和灵魂一起缝合的怪物。' },
  hellfire:{ name:'血炉督战魔', emoji:'😈', theme:'demon', desc:'燃烧军团遗留在半岛的行刑督军。' },
  nagrand:{ name:'裂地重拳', emoji:'🦬', theme:'brute', desc:'纳格兰平原上最暴躁的巨型裂蹄牛王。' },
  shadowmoon:{ name:'暮影吞界者', emoji:'🌑', theme:'demon', desc:'影月谷裂隙中游荡的深渊猎手。' },
  borean:{ name:'霜原啮咬者', emoji:'❄️', theme:'frost', desc:'会在风雪里无声扑杀猎物的冰原怪。' },
  storm:{ name:'泰坦裂雷者', emoji:'⚡', theme:'storm', desc:'风暴峭壁失控的古代造物。' },
  icecrown:{ name:'冰冠缚魂者', emoji:'💀', theme:'frost', desc:'替巫妖王猎杀逃亡灵魂的寒冰执刑者。' },
  lochmodan:{ name:'铁坝破坏者', emoji:'🔨', theme:'brute', desc:'在巨坝附近巡弋的巨型穴居怪。' },
  ashenvale:{ name:'月影古树卫士', emoji:'🌳', theme:'nature', desc:'灰谷最古老的一棵战争古树。' },
  arathi:{ name:'高地掠夺元帅', emoji:'⚔️', theme:'bandit', desc:'集结流亡者与佣兵的高地战犯。' },
  desolace:{ name:'荒芜哀嚎者', emoji:'👻', theme:'shadow', desc:'凄凉之地风暴中反复出现的绝望回声。' },
  feralas:{ name:'深林逐风者', emoji:'🐆', theme:'nature', desc:'菲拉斯夜幕下行动如风的猎豹首领。' },
  tanaris:{ name:'流沙掘墓王', emoji:'🦂', theme:'bandit', desc:'与海盗和沙虫都能做交易的沙海暴君。' },
  zangarmarsh:{ name:'沼泽孢后', emoji:'🍄', theme:'nature', desc:'赞加沼泽里掌控孢子的变异女王。' },
  dragonblight:{ name:'墓寒龙裔', emoji:'🐉', theme:'dragon', desc:'龙眠神殿外围徘徊的失控龙族。' },
  stonetalon:{ name:'峭壁裂爪', emoji:'🐻', theme:'beast', desc:'石爪山脉断崖间最臭名昭著的猎手。' },
  hillsbrad:{ name:'丘陵断粮者', emoji:'🗡️', theme:'bandit', desc:'袭击村庄与商队的希尔斯布莱德匪首。' },
  dustwallow:{ name:'淤泥噬骨兽', emoji:'🐊', theme:'poison', desc:'尘泥沼泽水道里的古老掠食者。' },
  blasted:{ name:'邪痕裂空魔', emoji:'😈', theme:'demon', desc:'黑暗之门余波催生的裂界恶魔。' },
  terokkar:{ name:'虚羽断魂者', emoji:'🦅', theme:'shadow', desc:'在泰罗卡树林里夺走旅人神智的黑羽猛禽。' },
  bladesedge:{ name:'刀塔屠山者', emoji:'🗡️', theme:'brute', desc:'会把敌人连同山脊一并劈开的巨人。' },
  netherstorm:{ name:'星涌扭曲体', emoji:'🌀', theme:'arcane', desc:'由奥术风暴凝聚出的失衡实体。' },
  howling:{ name:'嚎风亡枪手', emoji:'❄️', theme:'frost', desc:'乘着风雪袭来的维库亡魂射手。' },
  grizzly:{ name:'裂掌熊王', emoji:'🐻', theme:'beast', desc:'灰熊丘陵最凶恶的远古巨熊。' },
  sholazar:{ name:'晶刺暴喉兽', emoji:'🦖', theme:'nature', desc:'被泰坦实验残留能量强化的顶级巨兽。' },
  waking:{ name:'熔火黑曜幼龙', emoji:'🐲', theme:'dragon', desc:'从觉醒海岸火山缝隙中苏醒的黑曜幼龙。' },
  ohnahran:{ name:'风誓雷蹄', emoji:'⚡', theme:'storm', desc:'在欧恩哈拉风暴中奔袭的雷蹄巨兽。' },
  azure_span:{ name:'魔网霜鳞', emoji:'💠', theme:'arcane', desc:'被碧蓝魔网改造的霜鳞猎手。' },
  thaldraszus:{ name:'永恒裂时者', emoji:'⏳', theme:'arcane', desc:'在时光汇流中反复出现的永恒龙裔刺客。' },
  dornogal:{ name:'裂隙钻探者格隆', emoji:'⚙️', theme:'brute', desc:'吞吃泰坦矿脉后失控的巨型钻探构装体。' },
  hallowfall:{ name:'暗潮烛噬者', emoji:'🕯️', theme:'shadow', desc:'专门猎杀圣焰守夜人的虚空潜伏者。' },
  azj_kahet:{ name:'王庭断丝者', emoji:'🕸️', theme:'poison', desc:'安苏雷克王廷派出的蛛魔处刑者。' },
  karesh:{ name:'相位通缉犯欧姆拉', emoji:'🧿', theme:'shadow', desc:'被塔扎维什通缉的相位潜航者,只在裂隙折光中现身。' },
  primeus:{ name:'圣所删改体赫鲁赞', emoji:'📚', theme:'arcane', desc:'被普莱姆斯索引系统判定为“必须抹除”的失控档案守卫。' },
  voidrazor:{ name:'虚刃庇护守望者', emoji:'🪐', theme:'shadow', desc:'在虚无剃刀边缘巡猎难民与闯入者的庇护所裁卫。' },
  eversong_midnight:{ name:'暗巷邪能承运人', emoji:'🗡️', theme:'arcane', desc:'在谋杀巷转运非法邪能器物的银月叛徒。' },
  zulaman_midnight:{ name:'失衡洛阿化身', emoji:'🐻', theme:'brute', desc:'在祖阿曼神庙间徘徊的洛阿试炼残影。' },
  harandar:{ name:'孢潮破壳者', emoji:'🍄', theme:'nature', desc:'从哈兰达尔菌林深处挤出的虚空孢潮精英。' }
};

function buildRareElites() {
  return MAPS.map(map => {
    const seed = MAP_RARE_ELITE_SEEDS[map.key] || { name:`${map.name}稀有精英`, emoji:'⭐', theme:'brute', desc:`徘徊于${map.name}的危险目标。` };
    const profile = JSON.parse(JSON.stringify(RARE_ELITE_SKILLSETS[seed.theme] || RARE_ELITE_SKILLSETS.brute));
    const rareEliteCap = Math.max(((typeof MAX_LEVEL === 'number') ? MAX_LEVEL : 80) + 8, (map.lvlRange?.[1] || 1) + 2);
    const lvl = Math.max(map.lvlRange[0] + 1, Math.min(rareEliteCap, map.lvlRange[1] + 2));
    return {
      key:`rare_${map.key}`,
      mapKey:map.key,
      name:seed.name,
      emoji:seed.emoji || '⭐',
      theme:seed.theme || 'brute',
      desc:seed.desc || `徘徊于${map.name}的危险目标。`,
      lvl,
      hpMul:11.8 + Math.min(2.8, lvl * 0.018),
      atkMul:1.62 + Math.min(0.4, lvl * 0.0045),
      defMul:1.26 + Math.min(0.28, lvl * 0.0035),
      spawnChance:lvl >= 100 ? 0.033 : (lvl >= 90 ? 0.03 : 0.025),
      rewards:{
        gold:Math.floor(220 + lvl * 42),
        gem:Math.max(2, Math.floor(lvl / 10)),
        honor:Math.floor(30 + lvl * 4),
        essence:Math.max(1, Math.floor(lvl / 16))
      },
      passive:profile.passive || {},
      supportCount:profile.supportCount || 1,
      skills:profile.skills || []
    };
  });
}

const RARE_ELITES = buildRareElites();

/* ---------- 副本 ---------- */
// bosses: [{name, emoji, wave}], wave 表示在第几波出现(1-based)
// 最终BOSS总是在最后一波
const DUNGEONS = [{
  key: 'ragefire',
  name: '怒焰裂谷',
  icon: '🔥',
  reqLvl: 12,
  waves: 5,
  cd: 600,
  bosses: [{
    name: '邪炉卫士',
    emoji: '👹',
    wave: 2,
    skills: [{
      name: '火焰冲击',
      icon: '🔥',
      desc: '2倍火焰伤害',
      type: 'dmg',
      mul: 2.5,
      cd: 10,
      castTime: 1
    , dot: true, soulLink: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '塔格尔·邪炉',
    emoji: '👹',
    wave: 5,
    skills: [{
      name: '献祭',
      icon: '🔥',
      desc: '3倍伤害+灼烧',
      type: 'dmg',
      mul: 3,
      dot: true,
      cd: 14,
      castTime: 1.5
    },{
      name: '火焰之雨',
      icon: '🌧️',
      desc: '3倍范围',
      type: 'dmg',
      mul: 4,
      cd: 20,
      castTime: 2
    , dot: true, silence: true}],
        passive: {dmgReduction:0.1}
  }],
  desc: '奥格瑞玛地下的火焰洞穴'
},{
  key: 'deadmines',
  name: '死亡矿井',
  icon: '⛏️',
  reqLvl: 14,
  waves: 7,
  cd: 720,
  bosses: [{
    name: '矿工约翰逊',
    emoji: '👷',
    wave: 2,
    skills: [{
      name: '粉碎打击',
      icon: '🔨',
      desc: '2倍伤害',
      type: 'dmg',
      mul: 2.5,
      cd: 10,
      castTime: 1
    , stun: true, revenge: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '斯尼德',
    emoji: '🤖',
    wave: 4,
    skills: [{
      name: '电锯狂舞',
      icon: '🪚',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 3,
      cd: 12,
      castTime: 1
    , stun: true},{
      name: '伐木机撞击',
      icon: '🚜',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 3.5,
      cd: 18,
      castTime: 1.5
    , bomb: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '范克瑞斯',
    emoji: '🦹',
    wave: 7,
    skills: [{
      name: '暗影步',
      icon: '👤',
      desc: '2倍伤害+闪避',
      type: 'dmg',
      mul: 2.5,
      cd: 10,
      castTime: 1
    , weaken: true},{
      name: '烟雾弹',
      icon: '💨',
      desc: '降低命中10秒',
      type: 'dmg',
      mul: 2,
      slow: true,
      cd: 18,
      castTime: 1
    , fear: true}],
        passive: {dmgReduction:0.1}
  }],
  desc: '迪菲亚兄弟会的据点'
},{
  key: 'wailing',
  name: '哀嚎洞穴',
  icon: '🐍',
  reqLvl: 17,
  waves: 7,
  cd: 900,
  bosses: [{
    name: '安娜科德拉',
    emoji: '🐍',
    wave: 2,
    skills: [{
      name: '毒液喷吐',
      icon: '🐍',
      desc: '2倍伤害+中毒',
      type: 'dmg',
      mul: 2.5,
      dot: true,
      cd: 12,
      castTime: 1
    , plague: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '斯卡姆',
    emoji: '🦖',
    wave: 4,
    skills: [{
      name: '雷霆践踏',
      icon: '🦶',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 3.5,
      cd: 14,
      castTime: 1.5
    , stun: true, soulDrain: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '梦魇之王',
    emoji: '👹',
    wave: 7,
    skills: [{
      name: '暗影箭雨',
      icon: '🌑',
      desc: '4倍暗影伤害',
      type: 'dmg',
      mul: 4.5,
      cd: 16,
      castTime: 2
    , weaken: true},{
      name: '恐惧咆哮',
      icon: '👻',
      desc: '3倍伤害+减速',
      type: 'dmg',
      mul: 3,
      slow: true,
      cd: 20,
      castTime: 1.5
    , soulDrain: true}],
        passive: {dmgReduction:0.1}
  }],
  desc: '被腐蚀的德鲁伊洞穴'
},{
  key: 'bfd',
  name: '黑暗深渊',
  icon: '🌊',
  reqLvl: 22,
  waves: 7,
  cd: 960,
  bosses: [{
    name: '深渊守卫',
    emoji: '🐟',
    wave: 2,
    skills: [{
      name: '水流冲击',
      icon: '🌊',
      desc: '2倍伤害',
      type: 'dmg',
      mul: 2.5,
      cd: 10,
      castTime: 1
    , wither: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '格里哈斯特',
    emoji: '🦀',
    wave: 4,
    skills: [{
      name: '蟹钳猛击',
      icon: '🦀',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 3,
      cd: 12,
      castTime: 1
    , stun: true, decay2: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '阿库麦尔',
    emoji: '🐙',
    wave: 7,
    skills: [{
      name: '深渊之怒',
      icon: '🐙',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 4,
      cd: 14,
      castTime: 1.5
    , weaken: true},{
      name: '暗潮',
      icon: '🌊',
      desc: '3倍范围',
      type: 'dmg',
      mul: 3,
      cd: 18,
      castTime: 1.5
    , aoe: true, bleed: true}],
        passive: {dmgReduction:0.1}
  }],
  desc: '佐拉姆海岸下的远古神殿'
},{
  key: 'shadowfang',
  name: '影牙城堡',
  icon: '🐺',
  reqLvl: 24,
  waves: 8,
  cd: 1200,
  bosses: [{
    name: '席瓦莱恩男爵',
    emoji: '🧛',
    wave: 2,
    skills: [{
      name: '鲜血吸取',
      icon: '🩸',
      desc: '3倍伤害+吸血30%',
      type: 'dmg',
      mul: 3,
      lifeSteal: 0.3,
      cd: 12,
      castTime: 1
    , bleed: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '指挥官斯普林瓦尔',
    emoji: '👻',
    wave: 5,
    skills: [{
      name: '亡灵之怒',
      icon: '💀',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 3.5,
      cd: 14,
      castTime: 1.5
    , weaken: true, silence: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '阿鲁高',
    emoji: '🧙',
    wave: 8,
    skills: [{
      name: '暗影诅咒',
      icon: '🧿',
      desc: '4倍伤害',
      type: 'dmg',
      mul: 4.5,
      cd: 16,
      castTime: 2
    , weaken: true},{
      name: '召唤狼人',
      icon: '🐺',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 5,
      cd: 22,
      castTime: 2.5
    , soulLink: true}],
        passive: {dmgReduction:0.1}
  }],
  desc: '狼人贵族的诅咒之地'
},{
  key: 'gnomeregan',
  name: '诺莫瑞根',
  icon: '🤖',
  reqLvl: 28,
  waves: 8,
  cd: 1320,
  bosses: [{
    name: '电刑器6000型',
    emoji: '⚡',
    wave: 2,
    skills: [{
      name: '高压电击',
      icon: '⚡',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 3,
      cd: 12,
      castTime: 1
    , stun: true, plague: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '群体打击者9-60',
    emoji: '🤖',
    wave: 5,
    skills: [{
      name: '群体打击',
      icon: '🤖',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 3.5,
      cd: 14,
      castTime: 1.5
    , stun: true, decay: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '机械师瑟玛普拉格',
    emoji: '🤖',
    wave: 8,
    skills: [{
      name: '电击网',
      icon: '🔌',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 4,
      cd: 16,
      castTime: 1.5
    , stun: true},{
      name: '自爆机器人',
      icon: '💣',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 6,
      cd: 24,
      castTime: 3
    , brittle: true}],
        passive: {dmgReduction:0.1}
  }],
  desc: '被污染的侏儒科技之城'
},{
  key: 'razorfen',
  name: '剃刀沼泽',
  icon: '🐗',
  reqLvl: 30,
  waves: 7,
  cd: 1380,
  bosses: [{
    name: '主宰拉姆塔斯',
    emoji: '🐗',
    wave: 2,
    skills: [{
      name: '野猪冲锋',
      icon: '🐗',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 3,
      cd: 12,
      castTime: 1
    , stun: true, soulLink: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '阿格姆',
    emoji: '🐗',
    wave: 4,
    skills: [{
      name: '荆棘护盾',
      icon: '🌵',
      desc: '2倍伤害+减伤',
      type: 'dmg',
      mul: 2,
      cd: 14,
      castTime: 1
    , spdBuff: true, wither: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '卡尔加·刺肋',
    emoji: '🐗',
    wave: 7,
    skills: [{
      name: '荆棘之刺',
      icon: '🐗',
      desc: '3倍伤害+流血',
      type: 'dmg',
      mul: 4,
      dot: true,
      cd: 16,
      castTime: 1.5
    },{
      name: '野猪之魂',
      icon: '🐗',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 5,
      cd: 22,
      castTime: 2.5
    , revenge: true}],
        passive: {dmgReduction:0.1}
  }],
  desc: '野猪人的荆棘巢穴'
},{
  key: 'scarlet',
  name: '血色修道院',
  icon: '⚔️',
  reqLvl: 35,
  waves: 9,
  cd: 1500,
  bosses: [{
    name: '血色十字军指挥官',
    emoji: '🛡️',
    wave: 2,
    skills: [{
      name: '十字军打击',
      icon: '⚔️',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 3,
      cd: 10,
      castTime: 1
    , stun: true, bleed: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '赫洛德',
    emoji: '⚔️',
    wave: 5,
    skills: [{
      name: '旋风斩',
      icon: '🌀',
      desc: '3倍范围',
      type: 'dmg',
      mul: 4,
      cd: 14,
      castTime: 1.5
    , stun: true, revenge: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '奥法师杜安',
    emoji: '🧙',
    wave: 7,
    skills: [{
      name: '奥术爆炸',
      icon: '💥',
      desc: '3倍奥术伤害',
      type: 'dmg',
      mul: 4,
      cd: 14,
      castTime: 1.5
    , aoe: true, silence: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '莫格莱尼',
    emoji: '💀',
    wave: 9,
    skills: [{
      name: '灰烬使者',
      icon: '✨',
      desc: '3倍神圣伤害',
      type: 'dmg',
      mul: 6,
      cd: 20,
      castTime: 2.5
    },{
      name: '圣光之怒',
      icon: '😡',
      desc: '3倍必暴',
      type: 'dmg',
      mul: 5,
      alwaysCrit: true,
      cd: 26,
      castTime: 2.5
    , weaken: true, plague: true}],
        passive: {dmgReduction:0.1}
  }],
  desc: '狂热的圣光信徒'
},{
  key: 'razorfend',
  name: '剃刀高地',
  icon: '🦴',
  reqLvl: 38,
  waves: 8,
  cd: 1560,
  bosses: [{
    name: '图特卡什',
    emoji: '🕷️',
    wave: 2,
    skills: [{
      name: '蛛网喷射',
      icon: '🕸️',
      desc: '2倍伤害+减速',
      type: 'dmg',
      mul: 2.5,
      slow: true,
      cd: 12,
      castTime: 1
    , decay2: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '火眼莫德雷斯',
    emoji: '🔥',
    wave: 5,
    skills: [{
      name: '火眼',
      icon: '🔥',
      desc: '3倍火焰伤害',
      type: 'dmg',
      mul: 3.5,
      cd: 14,
      castTime: 1.5
    , dot: true, freeze: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '巫妖寒冰之王',
    emoji: '💀',
    wave: 8,
    skills: [{
      name: '寒冰箭',
      icon: '❄️',
      desc: '4倍冰霜伤害',
      type: 'dmg',
      mul: 4.5,
      cd: 16,
      castTime: 2
    , slow: true},{
      name: '冰霜新星',
      icon: '💠',
      desc: '3倍范围+减速',
      type: 'dmg',
      mul: 5,
      slow: true,
      cd: 22,
      castTime: 2.5
    , bomb: true}],
        passive: {dmgReduction:0.1}
  }],
  desc: '野猪人与亡灵的荆棘高地'
},{
  key: 'uldaman',
  name: '奥达曼',
  icon: '🏛️',
  reqLvl: 42,
  waves: 8,
  cd: 1680,
  bosses: [{
    name: '艾隆纳亚',
    emoji: '🗿',
    wave: 2,
    skills: [{
      name: '石化',
      icon: '🗿',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 3,
      cd: 12,
      castTime: 1
    , freeze: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '石窟织石者',
    emoji: '🕷️',
    wave: 5,
    skills: [{
      name: '蜘蛛毒液',
      icon: '🕷️',
      desc: '3倍中毒',
      type: 'dmg',
      mul: 3.5,
      dot: true,
      cd: 14,
      castTime: 1.5
    , wither: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '阿扎达斯',
    emoji: '👑',
    wave: 8,
    skills: [{
      name: '大地之怒',
      icon: '⛰️',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 5,
      cd: 18,
      castTime: 2
    , weaken: true},{
      name: '岩石风暴',
      icon: '🪨',
      desc: '3倍范围',
      type: 'dmg',
      mul: 6,
      cd: 24,
      castTime: 3
    , aoe: true, bleed: true}],
        passive: {dmgReduction:0.1}
  }],
  desc: '泰坦遗迹中的土灵密室'
},{
  key: 'maraudon',
  name: '玛拉顿',
  icon: '🌿',
  reqLvl: 45,
  waves: 8,
  cd: 1740,
  bosses: [{
    name: '诺克赛恩',
    emoji: '🌱',
    wave: 2,
    skills: [{
      name: '自然之怒',
      icon: '🌱',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 3.5,
      cd: 14,
      castTime: 1.5
    , weaken: true, soulDrain: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '工匠吉兹洛克',
    emoji: '🗿',
    wave: 5,
    skills: [{
      name: '地精工程',
      icon: '🔧',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 4,
      cd: 16,
      castTime: 1.5
    , frenzy: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '瑟莱德丝公主',
    emoji: '👹',
    wave: 8,
    skills: [{
      name: '腐化',
      icon: '👹',
      desc: '3倍伤害+中毒',
      type: 'dmg',
      mul: 5,
      dot: true,
      cd: 18,
      castTime: 2
    },{
      name: '地震',
      icon: '🌍',
      desc: '3倍范围',
      type: 'dmg',
      mul: 6,
      cd: 26,
      castTime: 3
    , aoe: true, freeze: true}],
        passive: {dmgReduction:0.1}
  }],
  desc: '半人马与土元素的腐化神殿'
},{
  key: 'zulfarrak',
  name: '祖尔法拉克',
  icon: '🏜️',
  reqLvl: 48,
  waves: 8,
  cd: 1800,
  bosses: [{
    name: '暗影祭司塞瑟斯',
    emoji: '🗿',
    wave: 2,
    skills: [{
      name: '暗影祭祀',
      icon: '🌑',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 3.5,
      cd: 14,
      castTime: 1.5
    , weaken: true, fear: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '乌克兹·沙顶',
    emoji: '🦂',
    wave: 5,
    skills: [{
      name: '沙暴',
      icon: '🏜️',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 4,
      cd: 16,
      castTime: 1.5
    , silence: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '巫医祖穆拉恩',
    emoji: '🗿',
    wave: 8,
    skills: [{
      name: '祖尔法拉克之怒',
      icon: '🗿',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 5,
      cd: 18,
      castTime: 2
    , weaken: true},{
      name: '巫毒诅咒',
      icon: '💀',
      desc: '3倍必暴+流血',
      type: 'dmg',
      mul: 4,
      alwaysCrit: true,
      dot: true,
      cd: 24,
      castTime: 2.5
    , manaDrain: true}],
        passive: {dmgReduction:0.1}
  }],
  desc: '沙怒巨魔的失落之城'
},{
  key: 'sunktemple',
  name: '沉没的神庙',
  icon: '🛕',
  reqLvl: 50,
  waves: 9,
  cd: 1800,
  bosses: [{
    name: '哈卡的化身',
    emoji: '🐍',
    wave: 3,
    skills: [{
      name: '哈卡之影',
      icon: '🐍',
      desc: '3倍暗影伤害',
      type: 'dmg',
      mul: 3.5,
      cd: 14,
      castTime: 1.5
    , weaken: true, bleed: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '德姆塞卡尔',
    emoji: '🐉',
    wave: 6,
    skills: [{
      name: '龙息术',
      icon: '🐉',
      desc: '4倍火焰伤害',
      type: 'dmg',
      mul: 4.5,
      cd: 16,
      castTime: 2
    , dot: true, decay: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '伊兰尼库斯之影',
    emoji: '🐉',
    wave: 9,
    skills: [{
      name: '翡翠梦境',
      icon: '🐉',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 5,
      cd: 18,
      castTime: 2
    },{
      name: '梦魇',
      icon: '👁️',
      desc: '3倍暗影伤害',
      type: 'dmg',
      mul: 7,
      cd: 26,
      castTime: 3
    , weaken: true, decay: true}],
        passive: {dmgReduction:0.1}
  }],
  desc: '悲伤沼泽水下的绿龙神殿'
},{
  key: 'scholomance',
  name: '通灵学院',
  icon: '💀',
  reqLvl: 52,
  waves: 9,
  cd: 1920,
  bosses: [{
    name: '詹迪斯·巴罗夫',
    emoji: '👻',
    wave: 3,
    skills: [{
      name: '灵魂分裂',
      icon: '👻',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 4,
      cd: 14,
      castTime: 1.5
    , wither: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '黑暗院长加丁',
    emoji: '🧙',
    wave: 6,
    skills: [{
      name: '暗影魔法',
      icon: '📖',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 5,
      cd: 18,
      castTime: 2
    , weaken: true, brittle: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '拉斯·弗罗斯特维斯帕',
    emoji: '🧛',
    wave: 9,
    skills: [{
      name: '冰霜之触',
      icon: '❄️',
      desc: '3倍冰霜伤害',
      type: 'dmg',
      mul: 6,
      cd: 20,
      castTime: 2.5
    , slow: true},{
      name: '死灵诅咒',
      icon: '💀',
      desc: '3倍必暴',
      type: 'dmg',
      mul: 5,
      alwaysCrit: true,
      cd: 28,
      castTime: 2.5
    , weaken: true, manaDrain: true}],
        passive: {dmgReduction:0.1}
  }],
  desc: '死灵术士的禁忌学府'
},{
  key: 'brd',
  name: '黑石深渊',
  icon: '⛏️',
  reqLvl: 55,
  waves: 10,
  cd: 2100,
  bosses: [{
    name: '弗诺斯·达克维尔',
    emoji: '💰',
    wave: 3,
    skills: [{
      name: '宝库守卫',
      icon: '💰',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 3.5,
      cd: 14,
      castTime: 1.5
    , freeze: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '贝尔加',
    emoji: '🔥',
    wave: 6,
    skills: [{
      name: '熔岩喷发',
      icon: '🌋',
      desc: '4倍火焰伤害',
      type: 'dmg',
      mul: 4.5,
      cd: 16,
      castTime: 2
    , dot: true, manaDrain: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '弗莱拉斯大使',
    emoji: '👹',
    wave: 8,
    skills: [{
      name: '暗影烈焰',
      icon: '🔥',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 5,
      cd: 18,
      castTime: 2
    , dot: true, freeze: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '达格兰·索瑞森大帝',
    emoji: '👑',
    wave: 10,
    skills: [{
      name: '索瑞森之怒',
      icon: '👑',
      desc: '3倍火焰伤害',
      type: 'dmg',
      mul: 7,
      cd: 22,
      castTime: 3
    , dot: true},{
      name: '熔火之心',
      icon: '🌋',
      desc: '3倍范围',
      type: 'dmg',
      mul: 6,
      cd: 30,
      castTime: 3
    , dot: true, disarm: true}],
        passive: {dmgReduction:0.1}
  }],
  desc: '黑铁矮人的熔火帝国'
},{
  key: 'stratholme',
  name: '斯坦索姆',
  icon: '🏘️',
  reqLvl: 58,
  waves: 10,
  art:'assets/wow/art/timewalking-banner.png',
  cd: 2400,
  bosses: [{
    name: '悲惨的提米',
    emoji: '🧟',
    wave: 3,
    skills: [{
      name: '悲惨嚎叫',
      icon: '😭',
      desc: '3倍伤害+减速',
      type: 'dmg',
      mul: 4,
      slow: true,
      cd: 14,
      castTime: 1.5
    , frenzy: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '炮手威利',
    emoji: '💣',
    wave: 5,
    skills: [{
      name: '火炮轰击',
      icon: '💣',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 5,
      cd: 16,
      castTime: 2
    , dot: true, plague: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '巴纳扎尔',
    emoji: '😈',
    wave: 8,
    skills: [{
      name: '恐惧',
      icon: '😈',
      desc: '3倍暗影伤害',
      type: 'dmg',
      mul: 5,
      cd: 18,
      castTime: 2
    , weaken: true, revenge: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '瑞文戴尔男爵',
    emoji: '🧛',
    wave: 10,
    skills: [{
      name: '死亡之握',
      icon: '💀',
      desc: '3倍暗影伤害',
      type: 'dmg',
      mul: 6,
      cd: 20,
      castTime: 2.5
    , weaken: true},{
      name: '亡灵大军',
      icon: '🧟',
      desc: '3倍范围',
      type: 'dmg',
      mul: 7,
      cd: 30,
      castTime: 3
    , aoe: true, manaDrain: true}],
        passive: {dmgReduction:0.1}
  }],
  desc: '被天灾军团毁灭的人类城市'
},{
  key: 'mc',
  name: '熔火之心',
  icon: '🌋',
  reqLvl: 60,
  waves: 14,
  art:'assets/wow/art/timewalking-banner.png',
    type: "raid",
  cd: 3600,
  bosses: [
        {
          name: "鲁西弗隆",
          emoji: "👹",
          wave: 3,
          skills: [
            {name: "暗影冲击", icon: "🌑", desc: "4倍暗影伤害", type: "dmg", mul: 4, castTime: 2,weaken:true,
          tricks: [{name:"不死之躯",icon:"💀",desc:"接下来5秒防御+50%且吸血20%",defBuff:5,leechBuff:5},{name:"复苏",icon:"💚",desc:"立即回复15%最大生命",healPct:0.15},{name:"终极防御",icon:"🛡️",desc:"回复20%生命且接下来5秒防御+50%",defBuff:5,healPct:0.2}] },
            {name: "末日诅咒", icon: "🧿", desc: "5倍伤害+灼烧", type: "dmg", mul: 5, castTime: 3, dot: true}
          ],
          passive: {critChance: 0.15, dmgReduction: 0.15}
        },
        {
          name: "玛格曼达",
          emoji: "🐶",
          wave: 6,
          skills: [
            {name: "火焰吐息", icon: "🔥", desc: "5倍火焰伤害+灼烧", type: "dmg", mul: 5, castTime: 2, dot: true,
          tricks: [{name:"不死之躯",icon:"💀",desc:"接下来5秒防御+50%且吸血20%",defBuff:5,leechBuff:5},{name:"迅捷",icon:"⚡",desc:"接下来8秒攻速提升40%",spdBuff:8}] },
            {name: "恐惧咆哮", icon: "💢", desc: "4倍范围+减速", type: "dmg", mul: 4, castTime: 3, slow: true, aoe: true}
          ],
          passive: {critChance: 0.1, dmgReduction: 0.1, atkBonus: 0.2}
        },
        {
          name: "基赫纳斯",
          emoji: "🔥",
          wave: 8,
          skills: [
            {name: "火焰之雨", icon: "🌋", desc: "5倍范围火焰伤害", type: "dmg", mul: 5, castTime: 3, aoe: true,
          tricks: [{name:"血之渴望",icon:"🩸",desc:"接下来5秒攻击吸血20%",leechBuff:5},{name:"铁壁",icon:"🛡️",desc:"接下来5秒防御提升50%",defBuff:5}] },
            {name: "熔岩护盾", icon: "🛡️", desc: "4倍伤害+减伤", type: "dmg", mul: 4, castTime: 2,dot:true}
          ],
          passive: {dodgeChance: 0.1, critChance: 0.1, dmgReduction: 0.2}
        },
        {
          name: "加尔",
          emoji: "🪨",
          wave: 11,
          skills: [
            {name: "岩石投掷", icon: "🪨", desc: "5倍伤害", type: "dmg", mul: 5, castTime: 2,stun:true,
          tricks: [{name:"致命专注",icon:"🎯",desc:"接下来5秒必定暴击",critBuff:5},{name:"战吼",icon:"📯",desc:"接下来8秒攻击力提升30%",atkBuff:8},{name:"狂暴之怒",icon:"😡",desc:"接下来5秒攻击+50%且攻速+30%",atkBuff:5,spdBuff:5}] },
            {name: "地震", icon: "🌍", desc: "6倍范围伤害", type: "dmg", mul: 6, castTime: 3, aoe: true},
            {name: "岩浆爆发", icon: "🌋", desc: "7倍伤害+灼烧", type: "dmg", mul: 7, castTime: 3.5, dot: true}
          ],
          passive: {critChance: 0.15, dmgReduction: 0.2, atkBonus: 0.15}
        },
        {
          name: "拉格纳罗斯",
          emoji: "🔥",
          wave: 14,
          skills: [
            {name: "萨弗拉斯之击", icon: "🔨", desc: "7倍火焰伤害", type: "dmg", mul: 7, castTime: 3,dot:true,
          tricks: [{name:"致命连击",icon:"💥",desc:"下一次攻击造成双倍且必定暴击",nextDouble:1,critBuff:5},{name:"战吼",icon:"📯",desc:"接下来8秒攻击力提升30%",atkBuff:8}] },
            {name: "熔岩爆发", icon: "🌋", desc: "8倍范围+灼烧", type: "dmg", mul: 8, castTime: 3.5, dot: true, aoe: true},
            {name: "火焰之子", icon: "🔥", desc: "6倍伤害+召唤", type: "dmg", mul: 6, castTime: 2.5,dot:true},
            {name: "炎魔之怒", icon: "💥", desc: "9倍范围伤害", type: "dmg", mul: 9, castTime: 4, aoe: true}
          ],
          passive: {dodgeChance: 0.15, critChance: 0.25, dmgReduction: 0.25, atkBonus: 0.2}
        }
      ],
  desc: '萨弗隆元素领主的火焰之心'
},{
  key: 'manatombs',
  name: '法力陵墓',
  icon: '⚱️',
  reqLvl: 63,
  waves: 8,
  art:'assets/wow/art/timewalking-outland-banner.jpg',
  cd: 3600,
  bosses: [{
    name: '潘德莫努斯',
    emoji: '🌀',
    wave: 2,
    skills: [{
      name: '虚空冲击',
      icon: '🌀',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 4,
      cd: 14,
      castTime: 1.5
    , manaDrain: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '塔瓦洛克',
    emoji: '🪨',
    wave: 5,
    skills: [{
      name: '岩石猛击',
      icon: '🪨',
      desc: '4倍伤害',
      type: 'dmg',
      mul: 4.5,
      cd: 16,
      castTime: 2
    , stun: true, fear: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '节点亲王沙法尔',
    emoji: '🌀',
    wave: 8,
    skills: [{
      name: '虚空之怒',
      icon: '🌀',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 5,
      cd: 18,
      castTime: 2
    , weaken: true},{
      name: '能量虚空',
      icon: '⚡',
      desc: '3倍必暴',
      type: 'dmg',
      mul: 6,
      alwaysCrit: true,
      cd: 24,
      castTime: 2.5
    , soulLink: true}],
        passive: {dmgReduction:0.1}
  }],
  desc: '奥金顿的虚空能量墓穴'
},{
  key: 'bwl',
  name: '黑翼之巢',
  icon: '🐉',
  reqLvl: 65,
  waves: 12,
  art:'assets/wow/art/timewalking-banner.png',
    type: "raid",
  cd: 4200,
  bosses: [
        {
          name: "狂野的拉佐格尔",
          emoji: "🐉",
          wave: 3,
          skills: [
            {name: "龙息术", icon: "🔥", desc: "5倍火焰伤害", type: "dmg", mul: 5, castTime: 2,dot:true,
          tricks: [{name:"战斗狂怒",icon:"🔥",desc:"接下来5秒攻击+40%且吸血15%",atkBuff:5,leechBuff:5},{name:"不死之躯",icon:"💀",desc:"接下来5秒防御+50%且吸血20%",defBuff:5,leechBuff:5},{name:"终极防御",icon:"🛡️",desc:"回复20%生命且接下来5秒防御+50%",defBuff:5,healPct:0.2}] },
            {name: "扫尾", icon: "🌀", desc: "6倍范围伤害", type: "dmg", mul: 6, castTime: 3, aoe: true}
          ],
          passive: {dodgeChance: 0.2, critChance: 0.15, dmgReduction: 0.1}
        },
        {
          name: "勒什雷尔",
          emoji: "🐲",
          wave: 6,
          skills: [
            {name: "暗影烈焰", icon: "🔥", desc: "6倍暗影火焰伤害", type: "dmg", mul: 6, castTime: 2.5,weaken:true,
          tricks: [{name:"终极防御",icon:"🛡️",desc:"回复20%生命且接下来5秒防御+50%",defBuff:5,healPct:0.2},{name:"弱点感知",icon:"👁️",desc:"接下来8秒必定暴击",critBuff:8}] },
            {name: "龙翼打击", icon: "💢", desc: "5倍范围+减速", type: "dmg", mul: 5, castTime: 3, slow: true, aoe: true}
          ],
          passive: {critChance: 0.1, dmgReduction: 0.2, atkBonus: 0.15}
        },
        {
          name: "克洛玛古斯",
          emoji: "🐲",
          wave: 9,
          skills: [
            {name: "时光扭曲", icon: "🌀", desc: "5倍伤害+减速", type: "dmg", mul: 5, castTime: 2.5, slow: true,
          tricks: [{name:"双刃",icon:"⚔️",desc:"下一次攻击造成双倍伤害",nextDouble:1},{name:"坚韧",icon:"🧱",desc:"接下来8秒防御提升40%",defBuff:8},{name:"再生",icon:"💚",desc:"立即回复25%最大生命",healPct:0.25}] },
            {name: "多种吐息", icon: "🌈", desc: "7倍范围伤害", type: "dmg", mul: 7, castTime: 3.5, aoe: true},
            {name: "龙血之怒", icon: "💢", desc: "8倍伤害", type: "dmg", mul: 8, castTime: 4,dot:true}
          ],
          passive: {dodgeChance: 0.1, critChance: 0.2, dmgReduction: 0.2}
        },
        {
          name: "奈法利安",
          emoji: "🐉",
          wave: 12,
          skills: [
            {name: "暗影烈焰", icon: "🔥", desc: "7倍暗影火焰伤害", type: "dmg", mul: 7, castTime: 3,weaken:true,
          tricks: [{name:"双刃",icon:"⚔️",desc:"下一次攻击造成双倍伤害",nextDouble:1},{name:"连斩",icon:"🗡️",desc:"下一次攻击造成两次伤害",nextDouble:2},{name:"坚韧",icon:"🧱",desc:"接下来8秒防御提升40%",defBuff:8}] },
            {name: "龙族召唤", icon: "🐲", desc: "8倍范围伤害", type: "dmg", mul: 8, castTime: 4, aoe: true},
            {name: "奈法利安之怒", icon: "💢", desc: "9倍伤害+恐惧", type: "dmg", mul: 9, castTime: 4,weaken:true,fear:true},
            {name: "黑龙之息", icon: "🔥", desc: "10倍范围火焰伤害", type: "dmg", mul: 10, castTime: 5, dot: true, aoe: true}
          ],
          passive: {dodgeChance: 0.15, critChance: 0.25, dmgReduction: 0.25, atkBonus: 0.2}
        }
      ],
  desc: '黑龙王子的腐败实验场'
},{
  key: 'steamvault',
  name: '蒸汽地窟',
  icon: '💧',
  reqLvl: 67,
  waves: 9,
  art:'assets/wow/art/timewalking-outland-banner.jpg',
  cd: 4200,
  bosses: [{
    name: '水术师瑟丝比亚',
    emoji: '💧',
    wave: 2,
    skills: [{
      name: '水龙卷',
      icon: '💧',
      desc: '4倍伤害',
      type: 'dmg',
      mul: 4.5,
      cd: 14,
      castTime: 1.5
    , dot: true, soulLink: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '机械师斯蒂里格',
    emoji: '🔧',
    wave: 5,
    skills: [{
      name: '蒸汽爆炸',
      icon: '💨',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 5,
      cd: 16,
      castTime: 2
    , aoe: true, decay2: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '督军卡利瑟里斯',
    emoji: '🐊',
    wave: 9,
    skills: [{
      name: '盘牙之怒',
      icon: '🐊',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 6,
      cd: 20,
      castTime: 2.5
    , weaken: true, soulLink: true}],
        passive: {dmgReduction:0.1}
  }],
  desc: '盘牙水库的蒸汽密室'
},{
  key: 'naxx',
  name: '纳克萨玛斯',
  icon: '☠️',
  reqLvl: 70,
  waves: 15,
  art:'assets/wow/art/timewalking-wrath-banner.jpg',
    type: "raid",
  cd: 5400,
  bosses: [
        {
          name: "阿努布雷坎",
          emoji: "🕷️",
          wave: 3,
          skills: [
            {name: "穿刺", icon: "🗡️", desc: "5倍伤害", type: "dmg", mul: 5, castTime: 2,stun:true,
          tricks: [{name:"连斩",icon:"🗡️",desc:"下一次攻击造成两次伤害",nextDouble:2},{name:"双刃",icon:"⚔️",desc:"下一次攻击造成双倍伤害",nextDouble:1}] },
            {name: "虫群风暴", icon: "🦗", desc: "6倍范围伤害", type: "dmg", mul: 6, castTime: 3, aoe: true}
          ],
          passive: {dodgeChance: 0.2, critChance: 0.15, dmgReduction: 0.1}
        },
        {
          name: "瘟疫使者诺斯",
          emoji: "☠️",
          wave: 6,
          skills: [
            {name: "瘟疫", icon: "🦠", desc: "5倍伤害+灼烧", type: "dmg", mul: 5, castTime: 2.5, dot: true, plague:true,
          tricks: [{name:"狂暴之怒",icon:"😡",desc:"接下来5秒攻击+50%且攻速+30%",atkBuff:5,spdBuff:5},{name:"狂怒",icon:"💢",desc:"接下来5秒攻击力提升50%",atkBuff:5},{name:"弱点感知",icon:"👁️",desc:"接下来8秒必定暴击",critBuff:8}] },
            {name: "亡者诅咒", icon: "💀", desc: "6倍暗影伤害", type: "dmg", mul: 6, castTime: 3,weaken:true}
          ],
          passive: {critChance: 0.2, dmgReduction: 0.1, atkBonus: 0.1}
        },
        {
          name: "肮脏的希尔盖",
          emoji: "🧟",
          wave: 9,
          skills: [
            {name: "疾病之云", icon: "☁️", desc: "6倍范围+灼烧", type: "dmg", mul: 6, castTime: 3, dot: true, aoe: true,
          tricks: [{name:"弱点感知",icon:"👁️",desc:"接下来8秒必定暴击",critBuff:8},{name:"闪电反射",icon:"⚡",desc:"接下来5秒攻速+60%且必定暴击",spdBuff:5,critBuff:5},{name:"战斗狂怒",icon:"🔥",desc:"接下来5秒攻击+40%且吸血15%",atkBuff:5,leechBuff:5}] },
            {name: "天灾之握", icon: "💀", desc: "7倍伤害", type: "dmg", mul: 7, castTime: 3.5,weaken:true},
            {name: "腐烂", icon: "🦠", desc: "6倍伤害+减速", type: "dmg", mul: 6, castTime: 3, slow: true}
          ],
          passive: {critChance: 0.15, dmgReduction: 0.2, atkBonus: 0.15}
        },
        {
          name: "塔迪乌斯",
          emoji: "⚡",
          wave: 12,
          skills: [
            {name: "闪电链", icon: "⚡", desc: "7倍自然伤害", type: "dmg", mul: 7, castTime: 3,stun:true,
          tricks: [{name:"铁壁",icon:"🛡️",desc:"接下来5秒防御提升50%",defBuff:5},{name:"不死之躯",icon:"💀",desc:"接下来5秒防御+50%且吸血20%",defBuff:5,leechBuff:5}] },
            {name: "极性转换", icon: "🔄", desc: "6倍范围伤害", type: "dmg", mul: 6, castTime: 3, aoe: true}
          ],
          passive: {dodgeChance: 0.1, critChance: 0.25, dmgReduction: 0.15}
        },
        {
          name: "克尔苏加德",
          emoji: "💀",
          wave: 15,
          skills: [
            {name: "冰霜冲击", icon: "❄️", desc: "8倍冰霜伤害", type: "dmg", mul: 8, castTime: 3,slow:true,
          tricks: [{name:"再生",icon:"💚",desc:"立即回复25%最大生命",healPct:0.25},{name:"坚韧",icon:"🧱",desc:"接下来8秒防御提升40%",defBuff:8},{name:"致命专注",icon:"🎯",desc:"接下来5秒必定暴击",critBuff:5}] },
            {name: "暗影裂隙", icon: "🌑", desc: "9倍暗影伤害", type: "dmg", mul: 9, castTime: 4,weaken:true},
            {name: "亡者大军", icon: "🧟", desc: "8倍范围伤害", type: "dmg", mul: 8, castTime: 3.5, aoe: true},
            {name: "巫妖之怒", icon: "👑", desc: "10倍伤害+灼烧", type: "dmg", mul: 10, castTime: 5, dot: true}
          ],
          passive: {dodgeChance: 0.2, critChance: 0.3, dmgReduction: 0.3, atkBonus: 0.25}
        }
      ],
  desc: '天灾军团的浮空堡垒'
},{
  key: 'magister',
  name: '魔导师平台',
  icon: '🔮',
  reqLvl: 72,
  waves: 9,
  art:'assets/wow/art/timewalking-outland-banner.jpg',
  cd: 5400,
  bosses: [{
    name: '塞林·火心',
    emoji: '🧝',
    wave: 2,
    skills: [{
      name: '凤凰之火',
      icon: '🔥',
      desc: '3倍火焰伤害',
      type: 'dmg',
      mul: 5,
      cd: 16,
      castTime: 2
    , dot: true, decay2: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '女祭司德莉希亚',
    emoji: '🧝‍♀️',
    wave: 5,
    skills: [{
      name: '暗影治疗',
      icon: '💜',
      desc: '恢复30%HP',
      type: 'heal',
      heal: 0.3,
      cd: 20,
      castTime: 1.5
    , frenzy: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '凯尔萨斯·逐日者',
    emoji: '🧝',
    wave: 9,
    skills: [{
      name: '凤凰',
      icon: '🔥',
      desc: '3倍火焰伤害',
      type: 'dmg',
      mul: 8,
      cd: 22,
      castTime: 3
    , dot: true},{
      name: '炎爆术',
      icon: '☄️',
      desc: '3倍必暴',
      type: 'dmg',
      mul: 10,
      alwaysCrit: true,
      cd: 36,
      castTime: 4
    , dot: true, decay: true}],
        passive: {dmgReduction:0.1}
  }],
  desc: '血精灵王子的最后堡垒'
},{
  key: 'karazhan',
  name: '卡拉赞',
  icon: '🌌',
  reqLvl: 75,
  waves: 14,
  art:'assets/wow/art/timewalking-outland-banner.jpg',
    type: "raid",
  cd: 6000,
  bosses: [
        {
          name: "午夜",
          emoji: "🐴",
          wave: 3,
          skills: [
            {name: "冲锋", icon: "💨", desc: "5倍伤害", type: "dmg", mul: 5, castTime: 2,stun:true,
          tricks: [{name:"吸血光环",icon:"🩸",desc:"接下来8秒攻击吸血15%",leechBuff:8},{name:"复苏",icon:"💚",desc:"立即回复15%最大生命",healPct:0.15},{name:"疾风",icon:"💨",desc:"接下来5秒攻速提升60%",spdBuff:5}] },
            {name: "暗影践踏", icon: "🌑", desc: "6倍范围伤害", type: "dmg", mul: 6, castTime: 3, aoe: true}
          ],
          passive: {dodgeChance: 0.15, critChance: 0.1, atkBonus: 0.2}
        },
        {
          name: "猎手阿图门",
          emoji: "🧟",
          wave: 4,
          skills: [
            {name: "暗影冲锋", icon: "🐴", desc: "5倍伤害+减速", type: "dmg", mul: 5, castTime: 2, slow: true,
          tricks: [{name:"不死之躯",icon:"💀",desc:"接下来5秒防御+50%且吸血20%",defBuff:5,leechBuff:5},{name:"复苏",icon:"💚",desc:"立即回复15%最大生命",healPct:0.15},{name:"致命专注",icon:"🎯",desc:"接下来5秒必定暴击",critBuff:5}] },
            {name: "诅咒", icon: "🧿", desc: "5倍暗影伤害", type: "dmg", mul: 5, castTime: 2.5, weaken: true}
          ],
          passive: {dodgeChance: 0.15, critChance: 0.2, atkBonus: 0.15}
        },
        {
          name: "莫罗斯",
          emoji: "🧟",
          wave: 6,
          skills: [
            {name: "致残打击", icon: "🗡️", desc: "6倍伤害+减速", type: "dmg", mul: 6, castTime: 2.5, slow: true,
          tricks: [{name:"不死之躯",icon:"💀",desc:"接下来5秒防御+50%且吸血20%",defBuff:5,leechBuff:5},{name:"闪电反射",icon:"⚡",desc:"接下来5秒攻速+60%且必定暴击",spdBuff:5,critBuff:5}] },
            {name: "暗杀", icon: "🔪", desc: "7倍必暴伤害", type: "dmg", mul: 7, castTime: 3, alwaysCrit: true,weaken:true}
          ],
          passive: {dodgeChance: 0.15, critChance: 0.25, dmgReduction: 0.1}
        },
        {
          name: "馆长",
          emoji: "🤖",
          wave: 9,
          skills: [
            {name: "奥术弹幕", icon: "🌀", desc: "6倍奥术伤害", type: "dmg", mul: 6, castTime: 2.5,weaken:true,
          tricks: [{name:"双刃",icon:"⚔️",desc:"下一次攻击造成双倍伤害",nextDouble:1},{name:"终极防御",icon:"🛡️",desc:"回复20%生命且接下来5秒防御+50%",defBuff:5,healPct:0.2}] },
            {name: "能量过载", icon: "⚡", desc: "7倍范围伤害", type: "dmg", mul: 7, castTime: 3.5, aoe: true},
            {name: "电弧", icon: "⚡", desc: "6倍伤害+减速", type: "dmg", mul: 6, castTime: 3, slow: true}
          ],
          passive: {dodgeChance: 0.1, critChance: 0.2, dmgReduction: 0.2}
        },
        {
          name: "麦迪文",
          emoji: "🔮",
          wave: 11,
          skills: [
            {name: "奥术弹幕", icon: "🌀", desc: "7倍奥术伤害", type: "dmg", mul: 7, castTime: 3, weaken: true,
          tricks: [{name:"坚韧",icon:"🧱",desc:"接下来8秒防御提升40%",defBuff:8},{name:"双刃",icon:"⚔️",desc:"下一次攻击造成双倍伤害",nextDouble:1}] },
            {name: "火焰之雨", icon: "🔥", desc: "8倍范围+灼烧", type: "dmg", mul: 8, castTime: 4, aoe: true, dot: true},
            {name: "乌鸦形态", icon: "🐦", desc: "6倍伤害+吸血25%", type: "dmg", mul: 6, castTime: 2.5, lifeSteal: 0.25}
          ],
          passive: {critChance: 0.3, dmgReduction: 0.2, dodgeChance: 0.15, atkBonus: 0.15}
        },
        {
          name: "玛克扎尔王子",
          emoji: "😈",
          wave: 12,
          skills: [
            {name: "暗影新星", icon: "💥", desc: "7倍暗影范围", type: "dmg", mul: 7, castTime: 3, aoe: true,
          tricks: [{name:"复苏",icon:"💚",desc:"立即回复15%最大生命",healPct:0.15},{name:"不死之躯",icon:"💀",desc:"接下来5秒防御+50%且吸血20%",defBuff:5,leechBuff:5},{name:"致命专注",icon:"🎯",desc:"接下来5秒必定暴击",critBuff:5}] },
            {name: "地狱火", icon: "🔥", desc: "8倍火焰伤害+灼烧", type: "dmg", mul: 8, castTime: 4, dot: true},
            {name: "恐惧", icon: "👻", desc: "7倍伤害+减速", type: "dmg", mul: 7, castTime: 3, slow: true, fear:true},
            {name: "军团之怒", icon: "😈", desc: "9倍范围伤害", type: "dmg", mul: 9, castTime: 4.5, aoe: true}
          ],
          passive: {dodgeChance: 0.15, critChance: 0.25, dmgReduction: 0.25, atkBonus: 0.2}
        }
      ],
  desc: '最后的守护者之塔'
},{
  key: 'hol',
  name: '闪电大厅',
  icon: '⚡',
  reqLvl: 77,
  waves: 10,
  art:'assets/wow/art/timewalking-wrath-banner.jpg',
  cd: 6000,
  bosses: [{
    name: '比亚格里将军',
    emoji: '⚡',
    wave: 3,
    skills: [{
      name: '闪电打击',
      icon: '⚡',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 5,
      cd: 14,
      castTime: 2
    , stun: true, decay2: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '沃尔坎',
    emoji: '🔥',
    wave: 6,
    skills: [{
      name: '锻造之火',
      icon: '🔥',
      desc: '3倍火焰伤害',
      type: 'dmg',
      mul: 6,
      cd: 18,
      castTime: 2.5
    , dot: true, silence: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '洛肯',
    emoji: '⚡',
    wave: 10,
    skills: [{
      name: '闪电新星',
      icon: '⚡',
      desc: '3倍自然伤害',
      type: 'dmg',
      mul: 8,
      cd: 22,
      castTime: 3
    , stun: true},{
      name: '雷霆万钧',
      icon: '⛈️',
      desc: '3倍范围必暴',
      type: 'dmg',
      mul: 7,
      alwaysCrit: true,
      cd: 32,
      castTime: 3
    , stun: true, manaDrain: true}],
        passive: {dmgReduction:0.1}
  }],
  desc: '奥杜尔的泰坦闪电圣殿'
},{
  key: 'toc',
  name: '冠军的试炼',
  icon: '🏟️',
  reqLvl: 78,
  waves: 10,
  art:'assets/wow/art/timewalking-wrath-banner.jpg',
  cd: 6000,
  bosses: [{
    name: '银色勇士',
    emoji: '🛡️',
    wave: 2,
    skills: [{
      name: '圣光审判',
      icon: '✨',
      desc: '4倍神圣伤害',
      type: 'dmg',
      mul: 4.5,
      cd: 14,
      castTime: 1.5
    , silence: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '黑骑士',
    emoji: '⚫',
    wave: 5,
    skills: [{
      name: '死亡之握',
      icon: '⚫',
      desc: '5.3倍暗影伤害',
      type: 'dmg',
      mul: 5.5,
      cd: 16,
      castTime: 2
    , weaken: true, revenge: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '纯洁者耶德瑞克',
    emoji: '✨',
    wave: 7,
    skills: [{
      name: '圣光之锤',
      icon: '🔨',
      desc: '3倍神圣伤害',
      type: 'dmg',
      mul: 6,
      cd: 18,
      castTime: 2.5
    , stun: true, silence: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '银白十字军冠军',
    emoji: '🏆',
    wave: 10,
    skills: [{
      name: '冠军之击',
      icon: '🏆',
      desc: '3倍伤害',
      type: 'dmg',
      mul: 8,
      cd: 22,
      castTime: 3
    , fear: true}],
        passive: {dmgReduction:0.1}
  }],
  desc: '银白十字军的勇士试炼'
},{
  key: 'sunwell',
  name: '太阳之井',
  icon: '☀️',
  reqLvl: 80,
  waves: 12,
  art:'assets/wow/art/timewalking-outland-banner.jpg',
    type: "raid",
  cd: 7200,
  bosses: [
        {
          name: "卡雷苟斯",
          emoji: "🐉",
          wave: 3,
          skills: [
            {name: "奥术吐息", icon: "🌀", desc: "6倍奥术伤害", type: "dmg", mul: 6, castTime: 2.5,dot:true,
          tricks: [{name:"双刃",icon:"⚔️",desc:"下一次攻击造成双倍伤害",nextDouble:1},{name:"战吼",icon:"📯",desc:"接下来8秒攻击力提升30%",atkBuff:8}] },
            {name: "冰霜之触", icon: "❄️", desc: "7倍冰霜伤害", type: "dmg", mul: 7, castTime: 3,slow:true}
          ],
          passive: {dodgeChance: 0.2, critChance: 0.2}
        },
        {
          name: "布鲁塔卢斯",
          emoji: "😈",
          wave: 6,
          skills: [
            {name: "陨石打击", icon: "☄️", desc: "7倍火焰伤害", type: "dmg", mul: 7, castTime: 3,dot:true,
          tricks: [{name:"迅捷",icon:"⚡",desc:"接下来8秒攻速提升40%",spdBuff:8},{name:"双刃",icon:"⚔️",desc:"下一次攻击造成双倍伤害",nextDouble:1},{name:"终极防御",icon:"🛡️",desc:"回复20%生命且接下来5秒防御+50%",defBuff:5,healPct:0.2}] },
            {name: "燃烧", icon: "🔥", desc: "6倍范围+灼烧", type: "dmg", mul: 6, castTime: 3, dot: true, aoe: true}
          ],
          passive: {critChance: 0.1, dmgReduction: 0.15, atkBonus: 0.25}
        },
        {
          name: "穆鲁",
          emoji: "🌑",
          wave: 9,
          skills: [
            {name: "暗影之怒", icon: "💢", desc: "7倍暗影伤害", type: "dmg", mul: 7, castTime: 3,weaken:true,
          tricks: [{name:"双刃",icon:"⚔️",desc:"下一次攻击造成双倍伤害",nextDouble:1},{name:"疾风",icon:"💨",desc:"接下来5秒攻速提升60%",spdBuff:5}] },
            {name: "负能量", icon: "🖤", desc: "8倍范围伤害", type: "dmg", mul: 8, castTime: 4, aoe: true},
            {name: "熵", icon: "🌀", desc: "7倍伤害+减速", type: "dmg", mul: 7, castTime: 3, slow: true}
          ],
          passive: {dodgeChance: 0.1, critChance: 0.25, dmgReduction: 0.2}
        },
        {
          name: "基尔加丹",
          emoji: "😈",
          wave: 12,
          skills: [
            {name: "欺诈者之触", icon: "👿", desc: "8倍暗影伤害", type: "dmg", mul: 8, castTime: 3,weaken:true,
          tricks: [{name:"致命连击",icon:"💥",desc:"下一次攻击造成双倍且必定暴击",nextDouble:1,critBuff:5},{name:"战斗狂怒",icon:"🔥",desc:"接下来5秒攻击+40%且吸血15%",atkBuff:5,leechBuff:5},{name:"弱点感知",icon:"👁️",desc:"接下来8秒必定暴击",critBuff:8}] },
            {name: "末日火雨", icon: "🌋", desc: "9倍范围火焰伤害", type: "dmg", mul: 9, castTime: 4, dot: true, aoe: true},
            {name: "黑暗", icon: "🌑", desc: "8倍伤害+减速", type: "dmg", mul: 8, castTime: 3.5, slow: true},
            {name: "军团之怒", icon: "😈", desc: "10倍范围伤害", type: "dmg", mul: 10, castTime: 5, aoe: true}
          ],
          passive: {dodgeChance: 0.2, critChance: 0.3, dmgReduction: 0.3, atkBonus: 0.25}
        }
      ],
  desc: '燃烧军团的入侵之门'
},{
  key: 'ulduar',
  name: '奥杜尔',
  icon: '⚙️',
  reqLvl: 80,
  waves: 15,
  art:'assets/wow/art/timewalking-wrath-banner.jpg',
    type: "raid",
  cd: 7200,
  bosses: [
        {
          name: "烈焰巨兽",
          emoji: "🤖",
          wave: 3,
          skills: [
            {name: "火焰喷射", icon: "🔥", desc: "6倍火焰伤害", type: "dmg", mul: 6, castTime: 2.5,dot:true,
          tricks: [{name:"血之渴望",icon:"🩸",desc:"接下来5秒攻击吸血20%",leechBuff:5},{name:"疾风",icon:"💨",desc:"接下来5秒攻速提升60%",spdBuff:5}] },
            {name: "炮击", icon: "💣", desc: "7倍范围伤害", type: "dmg", mul: 7, castTime: 3.5, aoe: true}
          ],
          passive: {dmgReduction: 0.25, atkBonus: 0.15}
        },
        {
          name: "XT-002拆解者",
          emoji: "🤖",
          wave: 6,
          skills: [
            {name: "重力炸弹", icon: "💣", desc: "7倍伤害", type: "dmg", mul: 7, castTime: 3,weaken:true,bomb:true,
          tricks: [{name:"致命专注",icon:"🎯",desc:"接下来5秒必定暴击",critBuff:5},{name:"连斩",icon:"🗡️",desc:"下一次攻击造成两次伤害",nextDouble:2},{name:"迅捷",icon:"⚡",desc:"接下来8秒攻速提升40%",spdBuff:8}] },
            {name: "拆解", icon: "🔧", desc: "6倍范围+减速", type: "dmg", mul: 6, castTime: 3, slow: true, aoe: true}
          ],
          passive: {dodgeChance: 0.1, critChance: 0.2, dmgReduction: 0.2}
        },
        {
          name: "钢铁议会",
          emoji: "⚡",
          wave: 9,
          skills: [
            {name: "闪电链", icon: "⚡", desc: "7倍自然伤害", type: "dmg", mul: 7, castTime: 3,stun:true,
          tricks: [{name:"铁壁",icon:"🛡️",desc:"接下来5秒防御提升50%",defBuff:5},{name:"不死之躯",icon:"💀",desc:"接下来5秒防御+50%且吸血20%",defBuff:5,leechBuff:5}] },
            {name: "过载", icon: "💥", desc: "8倍范围伤害", type: "dmg", mul: 8, castTime: 4, aoe: true}
          ],
          passive: {dodgeChance: 0.15, critChance: 0.25, dmgReduction: 0.15}
        },
        {
          name: "维扎克斯将军",
          emoji: "👹",
          wave: 12,
          skills: [
            {name: "暗影撞击", icon: "🌑", desc: "8倍暗影伤害", type: "dmg", mul: 8, castTime: 3.5,weaken:true,
          tricks: [{name:"双刃",icon:"⚔️",desc:"下一次攻击造成双倍伤害",nextDouble:1},{name:"狂怒",icon:"💢",desc:"接下来5秒攻击力提升50%",atkBuff:5}] },
            {name: "无面者之怒", icon: "💢", desc: "7倍范围伤害", type: "dmg", mul: 7, castTime: 3, aoe: true},
            {name: "虚空", icon: "🌌", desc: "8倍伤害+减速", type: "dmg", mul: 8, castTime: 4, slow: true}
          ],
          passive: {critChance: 0.2, dmgReduction: 0.2, atkBonus: 0.25}
        },
        {
          name: "尤格萨隆",
          emoji: "🐙",
          wave: 15,
          skills: [
            {name: "精神鞭笞", icon: "🌀", desc: "8倍暗影伤害", type: "dmg", mul: 8, castTime: 3,weaken:true,
          tricks: [{name:"战吼",icon:"📯",desc:"接下来8秒攻击力提升30%",atkBuff:8},{name:"不死之躯",icon:"💀",desc:"接下来5秒防御+50%且吸血20%",defBuff:5,leechBuff:5}] },
            {name: "疯狂", icon: "👁️", desc: "9倍范围+灼烧", type: "dmg", mul: 9, castTime: 4, dot: true, aoe: true},
            {name: "千喉之兽", icon: "🐙", desc: "8倍伤害+减速", type: "dmg", mul: 8, castTime: 3.5, slow: true},
            {name: "尤格萨隆之影", icon: "💀", desc: "10倍暗影范围", type: "dmg", mul: 10, castTime: 5, aoe: true}
          ],
          passive: {dodgeChance: 0.2, critChance: 0.3, dmgReduction: 0.3, atkBonus: 0.25}
        }
      ],
  desc: '泰坦造物的禁地'
},{
  key: 'forge',
  name: '灵魂洪炉',
  icon: '👻',
  reqLvl: 80,
  waves: 11,
  cd: 8400,
  bosses: [{
    name: '布隆亚姆',
    emoji: '👻',
    wave: 3,
    skills: [{
      name: '灵魂收割',
      icon: '👻',
      desc: '3倍暗影伤害',
      type: 'dmg',
      mul: 6,
      cd: 18,
      castTime: 2.5
    , weaken: true, soulLink: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '灵魂吞噬者',
    emoji: '💀',
    wave: 6,
    skills: [{
      name: '灵魂吞噬',
      icon: '💀',
      desc: '3倍伤害+吸血50%',
      type: 'dmg',
      mul: 7,
      lifeSteal: 0.5,
      cd: 20,
      castTime: 2.5
    , decay2: true}],
        passive: {dmgReduction:0.1}
  },{
    name: '噬魂者布隆亚姆',
    emoji: '👻',
    wave: 11,
    skills: [{
      name: '灵魂洪炉',
      icon: '👻',
      desc: '3倍暗影伤害',
      type: 'dmg',
      mul: 10,
      cd: 28,
      castTime: 4
    , weaken: true},{
      name: '灵魂风暴',
      icon: '💀',
      desc: '3倍范围必暴',
      type: 'dmg',
      mul: 8,
      alwaysCrit: true,
      cd: 40,
      castTime: 4
    , aoe: true, frenzy: true}],
        passive: {dmgReduction:0.1}
  }],
  desc: '冰冠堡垒的亡灵熔炉'
},{
  key: 'ruby',
  name: '红玉圣殿',
  icon: '💎',
  reqLvl: 80,
  waves: 9,
  art:'assets/wow/art/timewalking-wrath-banner.jpg',
    type: "raid",
  cd: 9000,
  bosses: [
        {
          name: "萨维安娜·怒焰",
          emoji: "🐉",
          wave: 3,
          skills: [
            {name: "火焰之息", icon: "🔥", desc: "6倍火焰伤害+灼烧", type: "dmg", mul: 6, castTime: 2.5, dot: true,
          tricks: [{name:"吸血光环",icon:"🩸",desc:"接下来8秒攻击吸血15%",leechBuff:8},{name:"血之渴望",icon:"🩸",desc:"接下来5秒攻击吸血20%",leechBuff:5}] },
            {name: "龙翼打击", icon: "💢", desc: "7倍范围伤害", type: "dmg", mul: 7, castTime: 3.5, aoe: true}
          ],
          passive: {critChance: 0.2, dmgReduction: 0.2}
        },
        {
          name: "巴尔萨鲁斯",
          emoji: "🐲",
          wave: 6,
          skills: [
            {name: "暗影烈焰", icon: "🔥", desc: "7倍暗影火焰伤害", type: "dmg", mul: 7, castTime: 3,weaken:true,
          tricks: [{name:"连斩",icon:"🗡️",desc:"下一次攻击造成两次伤害",nextDouble:2},{name:"双刃",icon:"⚔️",desc:"下一次攻击造成双倍伤害",nextDouble:1},{name:"吸血光环",icon:"🩸",desc:"接下来8秒攻击吸血15%",leechBuff:8}] },
            {name: "暮光之息", icon: "🌑", desc: "8倍范围伤害", type: "dmg", mul: 8, castTime: 4, aoe: true},
            {name: "暮光屏障", icon: "🛡️", desc: "6倍伤害+减伤", type: "dmg", mul: 6, castTime: 3,spdBuff:true}
          ],
          passive: {critChance: 0.15, dmgReduction: 0.2, atkBonus: 0.25}
        },
        {
          name: "海里昂",
          emoji: "🐉",
          wave: 9,
          skills: [
            {name: "暮光切割", icon: "🌗", desc: "8倍暗影伤害", type: "dmg", mul: 8, castTime: 3,weaken:true,
          tricks: [{name:"吸血光环",icon:"🩸",desc:"接下来8秒攻击吸血15%",leechBuff:8},{name:"疾风",icon:"💨",desc:"接下来5秒攻速提升60%",spdBuff:5},{name:"不死之躯",icon:"💀",desc:"接下来5秒防御+50%且吸血20%",defBuff:5,leechBuff:5}] },
            {name: "虚空之息", icon: "🌌", desc: "9倍范围+灼烧", type: "dmg", mul: 9, castTime: 4, dot: true, aoe: true},
            {name: "暮光毁灭", icon: "💥", desc: "10倍范围伤害", type: "dmg", mul: 10, castTime: 5, aoe: true}
          ],
          passive: {dodgeChance: 0.15, critChance: 0.3, dmgReduction: 0.25, atkBonus: 0.2}
        }
      ],
  desc: '红龙军团的暮光试炼'
},{
  key: 'icc',
  name: '冰冠堡垒',
  icon: '❄️',
  reqLvl: 80,
  waves: 15,
  art:'assets/wow/art/timewalking-wrath-banner.jpg',
    type: "raid",
  cd: 10800,
  bosses: [
        {
          name: "玛洛加尔领主",
          emoji: "💀",
          wave: 3,
          skills: [
            {name: "骨刺", icon: "🦴", desc: "6倍伤害", type: "dmg", mul: 6, castTime: 2.5,weaken:true,
          tricks: [{name:"血之渴望",icon:"🩸",desc:"接下来5秒攻击吸血20%",leechBuff:5},{name:"不死之躯",icon:"💀",desc:"接下来5秒防御+50%且吸血20%",defBuff:5,leechBuff:5}] },
            {name: "白骨风暴", icon: "💀", desc: "7倍范围伤害", type: "dmg", mul: 7, castTime: 3.5, aoe: true}
          ],
          passive: {critChance: 0.2, dmgReduction: 0.2}
        },
        {
          name: "死亡使者萨鲁法尔",
          emoji: "💀",
          wave: 6,
          skills: [
            {name: "鲜血之力", icon: "🩸", desc: "7倍伤害+吸血30%", type: "dmg", mul: 7, castTime: 3, lifeSteal: 0.3,lifeSteal:0.2,
          tricks: [{name:"闪电反射",icon:"⚡",desc:"接下来5秒攻速+60%且必定暴击",spdBuff:5,critBuff:5},{name:"疾风",icon:"💨",desc:"接下来5秒攻速提升60%",spdBuff:5}] },
            {name: "死亡之握", icon: "👊", desc: "6倍伤害+减速", type: "dmg", mul: 6, castTime: 3, slow: true}
          ],
          passive: {critChance: 0.2, dmgReduction: 0.1, atkBonus: 0.25}
        },
        {
          name: "普崔塞德教授",
          emoji: "🧪",
          wave: 9,
          skills: [
            {name: "瘟疫爆发", icon: "🦠", desc: "7倍范围+灼烧", type: "dmg", mul: 7, castTime: 3.5, dot: true, aoe: true, plague:true,
          tricks: [{name:"铁壁",icon:"🛡️",desc:"接下来5秒防御提升50%",defBuff:5},{name:"复苏",icon:"💚",desc:"立即回复15%最大生命",healPct:0.15},{name:"终极防御",icon:"🛡️",desc:"回复20%生命且接下来5秒防御+50%",defBuff:5,healPct:0.2}] },
            {name: "突变", icon: "🧬", desc: "8倍伤害", type: "dmg", mul: 8, castTime: 3,weaken:true}
          ],
          passive: {dodgeChance: 0.1, critChance: 0.25, dmgReduction: 0.2}
        },
        {
          name: "辛达苟萨",
          emoji: "🐉",
          wave: 12,
          skills: [
            {name: "冰霜吐息", icon: "❄️", desc: "8倍冰霜伤害+减速", type: "dmg", mul: 8, castTime: 3, slow: true,
          tricks: [{name:"双刃",icon:"⚔️",desc:"下一次攻击造成双倍伤害",nextDouble:1},{name:"铁壁",icon:"🛡️",desc:"接下来5秒防御提升50%",defBuff:5}] },
            {name: "冰霜之墓", icon: "🧊", desc: "7倍范围伤害", type: "dmg", mul: 7, castTime: 3.5, aoe: true},
            {name: "冰冷之握", icon: "💀", desc: "7倍伤害+减速", type: "dmg", mul: 7, castTime: 3, slow: true}
          ],
          passive: {dodgeChance: 0.2, critChance: 0.2, dmgReduction: 0.25}
        },
        {
          name: "巫妖王",
          emoji: "👑",
          wave: 15,
          skills: [
            {name: "霜之哀伤", icon: "🗡️", desc: "9倍伤害+吸血30%", type: "dmg", mul: 9, castTime: 3, lifeSteal: 0.3,lifeSteal:0.2,
          tricks: [{name:"不死之躯",icon:"💀",desc:"接下来5秒防御+50%且吸血20%",defBuff:5,leechBuff:5},{name:"连斩",icon:"🗡️",desc:"下一次攻击造成两次伤害",nextDouble:2},{name:"战斗狂怒",icon:"🔥",desc:"接下来5秒攻击+40%且吸血15%",atkBuff:5,leechBuff:5}] },
            {name: "亡者大军", icon: "🧟", desc: "10倍范围伤害", type: "dmg", mul: 10, castTime: 4, aoe: true},
            {name: "污染", icon: "☠️", desc: "8倍范围+灼烧", type: "dmg", mul: 8, castTime: 3.5, dot: true, aoe: true},
            {name: "巫妖王之怒", icon: "👑", desc: "12倍范围暗影伤害", type: "dmg", mul: 12, castTime: 6, aoe: true}
          ],
          passive: {dodgeChance: 0.25, critChance: 0.35, dmgReduction: 0.35, atkBonus: 0.3}
        }
      ],
  desc: '巫妖王的最终堡垒'
}];

/* ---------- 装备名称池(按部位×品质) ---------- */
const ITEM_POOLS = {
  weapon: {
    uncommon: [
      { name:'步兵长剑', stats:{atk:1} }, { name:'短柄战斧', stats:{atk:1} },
      { name:'狩猎长矛', stats:{atk:1} }, { name:'卫戍匕首', stats:{atk:1} },
      { name:'符文短杖', stats:{atk:1} }, { name:'曲刃拳匕', stats:{atk:1} },
    ],
    rare: [
      { name:'霜狼之牙', stats:{atk:1} }, { name:'痛击之刃', stats:{atk:1} },
      { name:'克罗之刃', stats:{atk:1} }, { name:'斩魔者', stats:{atk:1} },
      { name:'萨隆邪铁短斧', stats:{atk:1} }, { name:'龙骑士长剑', stats:{atk:1,hp:1} },
      { name:'北风之锤', stats:{atk:1} }, { name:'冰霜镰刀', stats:{atk:1,critd:1} },
    ],
    epic: [
      { name:'埃辛诺斯战刃', stats:{atk:2} }, { name:'雷霆之怒·逐风者', stats:{atk:2} },
      { name:'影之哀伤', stats:{atk:3} }, { name:'瓦兰奈尔·远古王者之锤', stats:{atk:2,hp:2} },
      { name:'萨弗拉斯·炎魔拉格纳罗斯之手', stats:{atk:2,critd:2} }, { name:'索利达尔·群星之怒', stats:{atk:2} },
      { name:'奎尔塞拉', stats:{atk:2,def:2} }, { name:'米奈希尔之力', stats:{atk:2,sta:2} },
    ],
    legend: [
      { name:'霜之哀伤', stats:{atk:4,critd:3} }, { name:'灰烬使者', stats:{atk:4,hp:3} },
      { name:'埃提耶什·守护者的传说之杖', stats:{atk:3,int:3,spi:3} }, { name:'巨龙之怒·泰蕾苟萨的寄魂杖', stats:{atk:3,int:3,critd:3} },
     ,{ name:'萨拉塔斯·黑暗帝国之刃', stats:{atk:4,vers:2,leech:1} } ,{ name:'阿格拉玛的步伐', stats:{atk:4,haste:2,spdPct:3} }]},
  helmet: {
    uncommon: [
      { name:'卫兵头盔', stats:{def:1} }, { name:'皮制兜帽', stats:{def:1} },
      { name:'锁链头环', stats:{def:1} }, { name:'学徒罩帽', stats:{def:1} },
    ],
    rare: [
      { name:'无尽学识之冠', stats:{def:1,int:1} }, { name:'龙鳞头盔', stats:{def:1,sta:1} },
      { name:'死亡骑士面甲', stats:{def:1,str:1} }, { name:'暗影之盔', stats:{def:1,agi:1} },
      { name:'圣光之盔', stats:{def:1,spi:1} }, { name:'铁颚头盔', stats:{def:1,hp:1} },
    ],
    epic: [
      { name:'伊利达雷面甲', stats:{def:2} }, { name:'萨格拉斯的诅咒视界', stats:{def:2,atk:1} },
      { name:'霜火头饰', stats:{def:2,int:2} }, { name:'愤怒之盔', stats:{def:2,str:2} },
      { name:'水晶头冠', stats:{def:2,spi:2} }, { name:'湮灭之盔', stats:{def:2,sta:2} },
    ],
    legend: [
      { name:'巫妖王的王冠', stats:{def:4,hp:3,sta:3} }, { name:'泰坦之盔', stats:{def:4,str:3} },
     ,{ name:'艾露恩的祝福之冠', stats:{def:4,int:3,spi:3} } ,{ name:'死亡之翼的龙盔', stats:{def:4,sta:3,hp:2} }]},
  shoulder: {
    uncommon: [
      { name:'卫戍护肩', stats:{atk:1} }, { name:'旅行者披肩', stats:{atk:1} },
      { name:'铜丝肩甲', stats:{atk:1} }, { name:'轻羽垫肩', stats:{atk:1} },
    ],
    rare: [
      { name:'龙火肩铠', stats:{atk:1} }, { name:'暗影护肩', stats:{atk:1,agi:1} },
      { name:'圣殿骑士肩甲', stats:{atk:1,def:1} }, { name:'奥术师肩垫', stats:{atk:1,int:1} },
      { name:'屠龙者肩铠', stats:{atk:1,hp:1} }, { name:'霜狼肩甲', stats:{atk:1,sta:1} },
    ],
    epic: [
      { name:'污染者肩铠', stats:{atk:2} }, { name:'霜火肩垫', stats:{atk:2,int:2} },
      { name:'无尽怒气肩甲', stats:{atk:2,str:2} }, { name:'黑暗低语肩铠', stats:{atk:2,agi:2} },
      { name:'圣光使者肩甲', stats:{atk:2,spi:2} }, { name:'铁壁肩铠', stats:{atk:2,sta:2} },
    ],
    legend: [
      { name:'天灾领主肩铠', stats:{atk:3,str:2} },
     ,{ name:'炎魔之肩', stats:{atk:3,critd:2,str:2} } ,{ name:'天灾领主肩铠', stats:{def:3,sta:3,hp:2} }]},
  armor: {
    uncommon: [
      { name:'新兵胸甲', stats:{def:1} }, { name:'皮背心', stats:{def:1} },
      { name:'锁子甲', stats:{def:1} }, { name:'粗布长袍', stats:{def:1} },
    ],
    rare: [
      { name:'死灵骑士胸甲', stats:{def:1,str:1} }, { name:'暗夜行者外套', stats:{def:1,agi:1} },
      { name:'奥术师长袍', stats:{def:1,int:1} }, { name:'圣光战铠', stats:{def:1,spi:1} },
      { name:'不屈守护者胸甲', stats:{def:1,sta:1} }, { name:'龙鳞铠甲', stats:{def:1,hp:1} },
    ],
    epic: [
      { name:'虚空之心长袍', stats:{def:2,int:2} }, { name:'血牙胸甲', stats:{def:2,agi:2} },
      { name:'无畏战铠', stats:{def:2,str:2} }, { name:'信仰长袍', stats:{def:2,spi:2} },
      { name:'潮汐之怒胸铠', stats:{def:2,sta:2} }, { name:'凤凰之焰长袍', stats:{def:2} },
    ],
    legend: [
      { name:'冰封王座胸铠', stats:{def:4,hp:3,str:3} }, { name:'守护巨龙胸甲', stats:{def:4,sta:3,spi:3} },
     ,{ name:'艾萨拉女王的鳞甲', stats:{def:4,agi:3,dodge:1} } ,{ name:'守护巨龙的胸铠', stats:{def:4,sta:4,hp:3} }]},
  gloves: {
    uncommon: [
      { name:'士兵手套', stats:{} }, { name:'皮手套', stats:{} },
      { name:'锁链护手', stats:{} }, { name:'咒术裹手', stats:{} },
    ],
    rare: [
      { name:'迅击护手', stats:{agi:1} }, { name:'奥术师手套', stats:{int:1} },
      { name:'勇气护手', stats:{str:1} }, { name:'暗影裹手', stats:{} },
      { name:'圣疗手套', stats:{spi:1} }, { name:'铁拳护手', stats:{sta:1} },
    ],
    epic: [
      { name:'灵风手套', stats:{int:2} }, { name:'血牙手套', stats:{agi:2} },
      { name:'无尽勇气护手', stats:{str:2} }, { name:'暗影烈焰手套', stats:{} },
      { name:'救赎手套', stats:{spi:2} }, { name:'石化护手', stats:{sta:2} },
    ],
    legend: [
      { name:'死亡之握', stats:{agi:2} },
     ,{ name:'死亡之握', stats:{atk:3,str:2,crit:1} } ,{ name:'艾露恩之触', stats:{atk:3,int:2,haste:1} }]},
  belt: {
    uncommon: [
      { name:'布质腰带', stats:{def:1} }, { name:'皮束带', stats:{def:1} },
      { name:'锁链腰带', stats:{def:1} }, { name:'新兵束腰', stats:{def:1} },
    ],
    rare: [
      { name:'龙鳞腰带', stats:{def:1,hp:1} }, { name:'疾风腰环', stats:{def:1,agi:1} },
      { name:'奥术腰索', stats:{def:1,int:1} }, { name:'勇士束腰', stats:{def:1,str:1} },
      { name:'圣光腰带', stats:{def:1,spi:1} }, { name:'要塞腰带', stats:{def:1,sta:1} },
    ],
    epic: [
      { name:'安海尔德之握', stats:{def:2,hp:2} }, { name:'影月腰带', stats:{def:2,agi:2} },
      { name:'风暴腰带', stats:{def:2,int:2} }, { name:'战神束腰', stats:{def:2,str:2} },
      { name:'永恒之光腰带', stats:{def:2,spi:2} }, { name:'不灭束腰', stats:{def:2,sta:2} },
    ],
    legend: [
      { name:'尤格萨隆的触须之握', stats:{def:3,hp:3,sta:3} },
     ,{ name:'缚龙者腰带', stats:{def:3,sta:3,dodge:1} } ,{ name:'时光扭曲腰带', stats:{def:3,haste:2,cdReduction:3} }]},
  pants: {
    uncommon: [
      { name:'布裤', stats:{hp:1} }, { name:'皮短裤', stats:{hp:1} },
      { name:'锁链护腿', stats:{hp:1} }, { name:'新兵腿甲', stats:{hp:1} },
    ],
    rare: [
      { name:'龙鳞护腿', stats:{hp:1,sta:1} }, { name:'暗影长裤', stats:{hp:1,agi:1} },
      { name:'奥术长裤', stats:{hp:1,int:1} }, { name:'勇士腿铠', stats:{hp:1,str:1} },
      { name:'圣疗护腿', stats:{hp:1,spi:1} }, { name:'要塞腿甲', stats:{hp:1,def:1} },
    ],
    epic: [
      { name:'血牙短裤', stats:{hp:2,agi:2} }, { name:'灵风长裤', stats:{hp:2,int:2} },
      { name:'无畏腿铠', stats:{hp:2,str:2} }, { name:'信仰护腿', stats:{hp:2,spi:2} },
      { name:'潮汐之怒腿铠', stats:{hp:2,sta:2} }, { name:'凤凰之羽长裤', stats:{hp:2} },
    ],
    legend: [
      { name:'冰霜巨龙腿甲', stats:{hp:4,sta:3,str:3} },
     ,{ name:'烈焰之痕护腿', stats:{def:3,atk:2,critd:2} } ,{ name:'永冬护腿', stats:{def:3,sta:3,hp:2} }]},
  boots: {
    uncommon: [
      { name:'新兵战靴', stats:{} }, { name:'轻便皮靴', stats:{} },
      { name:'锁甲靴', stats:{} }, { name:'布质便鞋', stats:{} },
    ],
    rare: [
      { name:'迅捷之靴', stats:{agi:1} }, { name:'奥术便鞋', stats:{int:1} },
      { name:'勇士战靴', stats:{str:1} }, { name:'圣光步履', stats:{spi:1} },
      { name:'铁踵战靴', stats:{sta:1} }, { name:'疾行靴', stats:{} },
    ],
    epic: [
      { name:'暗影烈焰之靴', stats:{} }, { name:'踏冰者', stats:{agi:2} },
      { name:'风暴行者', stats:{int:2} }, { name:'凯旋胫甲', stats:{str:2} },
      { name:'光之步履', stats:{spi:2} }, { name:'不毁战靴', stats:{sta:2} },
    ],
    legend: [
      { name:'巫妖王的步履', stats:{agi:2} },
     ,{ name:'风行者之靴', stats:{atk:2,agi:3,spdPct:4} } ,{ name:'泰坦之足', stats:{def:3,sta:3,dodge:1} }]},
  ring: {
    uncommon: [
      { name:'铜戒', stats:{} }, { name:'银戒', stats:{} },
      { name:'骨戒', stats:{} }, { name:'石戒', stats:{} },
    ],
    rare: [
      { name:'龙鳞戒指', stats:{atk:1} }, { name:'暗影之戒', stats:{agi:1} },
      { name:'奥术之环', stats:{int:1} }, { name:'勇士印记', stats:{str:1} },
      { name:'圣光之戒', stats:{spi:1} }, { name:'要塞指环', stats:{sta:1} },
    ],
    epic: [
      { name:'龙王之戒', stats:{atk:2} }, { name:'血牙指环', stats:{agi:2} },
      { name:'奥术能量之戒', stats:{int:2} }, { name:'战神之戒', stats:{str:2} },
      { name:'救赎之戒', stats:{spi:2} }, { name:'不灭指环', stats:{sta:2} },
    ],
    legend: [
      { name:'克尔苏加德的封印', stats:{atk:3,int:3} },
     ,{ name:'至尊五戒', stats:{atk:2,hp:2,vers:1} } ,{ name:'卡德加的智慧之戒', stats:{atk:2,int:2,haste:1} }]},
  trinket: {
    uncommon: [
      { name:'幸运兔脚', stats:{sta:1} }, { name:'士兵勋章', stats:{sta:1} },
      { name:'小护符', stats:{sta:1} }, { name:'占卜石', stats:{sta:1} },
    ],
    rare: [
      { name:'龙鳞护符', stats:{sta:1,hp:1} }, { name:'暗影之石', stats:{sta:1} },
      { name:'奥术水晶', stats:{sta:1,int:1} }, { name:'勇士勋章', stats:{sta:1,str:1} },
      { name:'圣光护符', stats:{sta:1,spi:1} }, { name:'要塞之印', stats:{sta:1,def:1} },
    ],
    epic: [
      { name:'龙牙饰物', stats:{sta:2} }, { name:'暗影之眼', stats:{sta:2,agi:2} },
      { name:'奥术宝珠', stats:{sta:2,int:2} }, { name:'战神徽记', stats:{sta:2,str:2} },
      { name:'救赎之魂', stats:{sta:2,spi:2} }, { name:'不灭之印', stats:{sta:2,hp:2} },
    ],
    legend: [
      { name:'阿尔萨斯的悔恨', stats:{sta:4,hp:3,str:3} },
     ,{ name:'龙魂之匣', stats:{critd:4,atk:2,crit:1} } ,{ name:'不稳定的奥术水晶', stats:{atk:3,vers:2,haste:1} }]}};

/* ---------- 副本专属掉落(每个BOSS有独立掉落) ---------- */
const DUNGEON_LOOT = {
  // 怒焰裂谷
  ragefire: { bosses: {
    '邪炉卫士':   [{name:'邪炉战锤',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'熔岩护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,sta:1}}],
    '塔格尔·邪炉': [{name:'邪炉之心',slot:'trinket',rarity:'epic',stats:{sta:2,str:1}},{name:'怒焰长袍',slot:'armor',rarity:'rare',stats:{def:1,int:1}}]}, trash:[{name:'焦炭手套',slot:'gloves',rarity:'uncommon',stats:{}},
	        {name:'怒焰腰带',slot:'belt',rarity:'uncommon',stats:{def:1}}]},
  // 死亡矿井
  deadmines: { bosses: {
    '矿工约翰逊': [{name:'矿工锄',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'矿工头盔',slot:'helmet',rarity:'rare',stats:{def:1,sta:1}}],
    '斯尼德':     [{name:'电锯',slot:'weapon',rarity:'rare',stats:{atk:1,agi:1}},{name:'伐木工手套',slot:'gloves',rarity:'rare',stats:{str:1}}],
    '范克瑞斯':   [{name:'残酷倒钩',slot:'weapon',rarity:'epic',stats:{atk:2,agi:2}},{name:'迪菲亚面罩',slot:'helmet',rarity:'rare',stats:{def:1,agi:1}},{name:'兄弟会徽记',slot:'ring',rarity:'rare',stats:{agi:1}}]}, trash:[{name:'迪菲亚匕首',slot:'weapon',rarity:'uncommon',stats:{atk:1}},
	        {name:'西部荒野背心',slot:'armor',rarity:'uncommon',stats:{def:1}}]},
  // 哀嚎洞穴
  wailing: { bosses: {
    '安娜科德拉': [{name:'毒蛇之刺',slot:'weapon',rarity:'rare',stats:{atk:1,agi:1}},{name:'蛇皮护腿',slot:'pants',rarity:'rare',stats:{hp:1,agi:1}}],
    '斯卡姆':     [{name:'斯卡姆的壳',slot:'armor',rarity:'rare',stats:{def:1,sta:1}},{name:'龙鳞腰带',slot:'belt',rarity:'rare',stats:{def:1,hp:1}}],
    '梦魇之王':   [{name:'梦魇之杖',slot:'weapon',rarity:'epic',stats:{atk:2,int:2}},{name:'梦魇之戒',slot:'ring',rarity:'rare',stats:{int:1}},{name:'尖牙护腿',slot:'pants',rarity:'rare',stats:{hp:1,agi:1}}]}, trash:[{name:'尖牙皮靴',slot:'boots',rarity:'uncommon',stats:{}},{name:'蛇鳞护手',slot:'gloves',rarity:'uncommon',stats:{}}]},
  // 黑暗深渊
  bfd: { bosses: {
    '深渊守卫':   [{name:'深渊之刃',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'深海腰带',slot:'belt',rarity:'rare',stats:{def:1,sta:1}}],
    '格里哈斯特': [{name:'蟹钳之锤',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'珊瑚手套',slot:'gloves',rarity:'rare',stats:{agi:1}}],
    '阿库麦尔':   [{name:'阿库麦尔之牙',slot:'weapon',rarity:'epic',stats:{atk:2,agi:2}},{name:'深渊头盔',slot:'helmet',rarity:'rare',stats:{def:1,int:1}},{name:'深渊指环',slot:'ring',rarity:'rare',stats:{spi:1}}]}, trash:[{name:'鱼鳞护肩',slot:'shoulder',rarity:'uncommon',stats:{atk:1}},{name:'贝壳腰带',slot:'belt',rarity:'uncommon',stats:{def:1}}]},
  // 影牙城堡
  shadowfang: { bosses: {
    '席瓦莱恩男爵':     [{name:'席瓦莱恩之剑',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'男爵腰带',slot:'belt',rarity:'rare',stats:{def:1,str:1}}],
    '指挥官斯普林瓦尔': [{name:'指挥官之盾',slot:'armor',rarity:'rare',stats:{def:1,sta:1}},{name:'斯普林瓦尔之戒',slot:'ring',rarity:'rare',stats:{def:1}}],
    '阿鲁高':           [{name:'阿鲁高的法杖',slot:'weapon',rarity:'epic',stats:{atk:2,int:2}},{name:'影牙肩甲',slot:'shoulder',rarity:'rare',stats:{atk:1,agi:1}},{name:'狼王之戒',slot:'ring',rarity:'rare',stats:{str:1}}]}, trash:[{name:'狼人皮毛腰带',slot:'belt',rarity:'uncommon',stats:{def:1}},{name:'银松肩垫',slot:'shoulder',rarity:'uncommon',stats:{atk:1}}]},
  // 诺莫瑞根
  gnomeregan: { bosses: {
    '电刑器6000型':     [{name:'电刑器线圈',slot:'ring',rarity:'rare',stats:{int:1}},{name:'避雷护腿',slot:'pants',rarity:'rare',stats:{hp:1,sta:1}}],
    '群体打击者9-60':   [{name:'群体打击者之臂',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'机械手套',slot:'gloves',rarity:'rare',stats:{str:1}}],
    '机械师瑟玛普拉格': [{name:'瑟玛普拉格的机械臂',slot:'weapon',rarity:'epic',stats:{atk:2,str:2}},{name:'侏儒工程头盔',slot:'helmet',rarity:'rare',stats:{def:1,int:1}},{name:'工程师徽记',slot:'trinket',rarity:'rare',stats:{sta:1,int:1}}]}, trash:[{name:'齿轮腰带',slot:'belt',rarity:'uncommon',stats:{def:1}},{name:'焊接口罩',slot:'helmet',rarity:'uncommon',stats:{def:1}}]},
  // 剃刀沼泽
  razorfen: { bosses: {
    '主宰拉姆塔斯': [{name:'拉姆塔斯之角',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'荆棘腰带',slot:'belt',rarity:'rare',stats:{def:1,str:1}}],
    '阿格姆':       [{name:'阿格姆之锤',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'藤蔓手套',slot:'gloves',rarity:'rare',stats:{sta:1}}],
    '卡尔加·刺肋': [{name:'刺肋之斧',slot:'weapon',rarity:'epic',stats:{atk:2,str:2}},{name:'荆棘护胸',slot:'armor',rarity:'rare',stats:{def:1,sta:1}},{name:'野猪之牙',slot:'trinket',rarity:'rare',stats:{sta:1,str:1}}]}, trash:[{name:'棘刺护腿',slot:'pants',rarity:'uncommon',stats:{hp:1}},{name:'野猪皮手套',slot:'gloves',rarity:'uncommon',stats:{}}]},
  // 血色修道院
  scarlet: { bosses: {
    '血色十字军指挥官': [{name:'指挥官之盾',slot:'armor',rarity:'rare',stats:{def:1,sta:1}},{name:'十字军腰带',slot:'belt',rarity:'rare',stats:{def:1,str:1}}],
    '赫洛德':           [{name:'赫洛德的肩甲',slot:'shoulder',rarity:'rare',stats:{atk:1,str:1}},{name:'血色战靴',slot:'boots',rarity:'rare',stats:{str:1}}],
    '奥法师杜安':       [{name:'杜安的法杖',slot:'weapon',rarity:'rare',stats:{atk:1,int:1}},{name:'奥术师手套',slot:'gloves',rarity:'rare',stats:{int:1}}],
    '莫格莱尼':         [{name:'莫格莱尼的力量',slot:'weapon',rarity:'epic',stats:{atk:2,str:2}},{name:'血色十字军战盔',slot:'helmet',rarity:'rare',stats:{def:1,str:1}},{name:'狂热者之戒',slot:'ring',rarity:'rare',stats:{spi:1}}]}, trash:[{name:'血色肩甲',slot:'shoulder',rarity:'uncommon',stats:{atk:1}},{name:'狂热者手套',slot:'gloves',rarity:'uncommon',stats:{}}]},
  // 剃刀高地
  razorfend: { bosses: {
    '图特卡什':       [{name:'蜘蛛牙短剑',slot:'weapon',rarity:'rare',stats:{atk:1,agi:1}},{name:'蛛丝腰带',slot:'belt',rarity:'rare',stats:{def:1,agi:1}}],
    '火眼莫德雷斯':   [{name:'莫德雷斯之眼',slot:'trinket',rarity:'rare',stats:{sta:1,int:1}},{name:'火焰手套',slot:'gloves',rarity:'rare',stats:{int:1}}],
    '巫妖寒冰之王':   [{name:'寒冰之王的节杖',slot:'weapon',rarity:'epic',stats:{atk:2,int:2}},{name:'骨棘胸甲',slot:'armor',rarity:'rare',stats:{def:1,sta:1}},{name:'寒冰之戒',slot:'ring',rarity:'rare',stats:{int:1}}]}, trash:[{name:'白骨护腿',slot:'pants',rarity:'uncommon',stats:{hp:1}},{name:'亡灵手套',slot:'gloves',rarity:'uncommon',stats:{}}]},
  // 奥达曼
  uldaman: { bosses: {
    '艾隆纳亚':   [{name:'艾隆纳亚的石锤',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'石腭腰带',slot:'belt',rarity:'rare',stats:{def:1,sta:1}}],
    '石窟织石者': [{name:'织石者手套',slot:'gloves',rarity:'rare',stats:{int:1}},{name:'遗迹护腿',slot:'pants',rarity:'rare',stats:{hp:1,sta:1}}],
    '阿扎达斯':   [{name:'阿扎达斯之锤',slot:'weapon',rarity:'epic',stats:{atk:2,str:2}},{name:'泰坦石板护胸',slot:'armor',rarity:'rare',stats:{def:1,sta:1}},{name:'土灵之戒',slot:'ring',rarity:'rare',stats:{def:1}}]}, trash:[{name:'土灵腰带',slot:'belt',rarity:'uncommon',stats:{def:1}},{name:'遗迹手套',slot:'gloves',rarity:'uncommon',stats:{}}]},
  // 玛拉顿
  maraudon: { bosses: {
    '诺克赛恩':       [{name:'诺克赛恩之刺',slot:'weapon',rarity:'rare',stats:{atk:1,agi:1}},{name:'藤蔓束腰',slot:'belt',rarity:'rare',stats:{def:1,spi:1}}],
    '工匠吉兹洛克':   [{name:'吉兹洛克之锤',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'石花护手',slot:'gloves',rarity:'rare',stats:{str:1}}],
    '瑟莱德丝公主':   [{name:'瑟莱德丝之拥',slot:'weapon',rarity:'epic',stats:{atk:2,int:2}},{name:'自然守护者胸甲',slot:'armor',rarity:'rare',stats:{def:1,spi:1}},{name:'腐败之戒',slot:'ring',rarity:'rare',stats:{sta:1}}]}, trash:[{name:'石花腰带',slot:'belt',rarity:'uncommon',stats:{def:1}},{name:'丛林手套',slot:'gloves',rarity:'uncommon',stats:{}}]},
  // 祖尔法拉克
  zulfarrak: { bosses: {
    '暗影祭司塞瑟斯': [{name:'塞瑟斯的匕首',slot:'weapon',rarity:'rare',stats:{atk:1}},{name:'沙行护腿',slot:'pants',rarity:'rare',stats:{hp:1,agi:1}}],
    '乌克兹·沙顶':   [{name:'沙顶之锤',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'沙漠腰带',slot:'belt',rarity:'rare',stats:{def:1,sta:1}}],
    '巫医祖穆拉恩':   [{name:'祖穆拉恩的祭祀之刃',slot:'weapon',rarity:'epic',stats:{atk:2}},{name:'沙怒头巾',slot:'helmet',rarity:'rare',stats:{def:1,int:1}},{name:'巨魔护符',slot:'trinket',rarity:'rare',stats:{sta:1}}]}, trash:[{name:'沙怒护肩',slot:'shoulder',rarity:'uncommon',stats:{atk:1}},{name:'巨魔手套',slot:'gloves',rarity:'uncommon',stats:{}}]},
  // 沉没的神庙
  sunktemple: { bosses: {
    '哈卡的化身':       [{name:'哈卡之牙',slot:'weapon',rarity:'rare',stats:{atk:1,agi:1}},{name:'翡翠护腿',slot:'pants',rarity:'rare',stats:{hp:1,spi:1}}],
    '德姆塞卡尔':       [{name:'德姆塞卡尔的龙鳞',slot:'shoulder',rarity:'rare',stats:{atk:1,sta:1}},{name:'龙人腰带',slot:'belt',rarity:'rare',stats:{def:1,hp:1}}],
    '伊兰尼库斯之影':   [{name:'伊兰尼库斯之角',slot:'weapon',rarity:'epic',stats:{atk:2}},{name:'龙鳞肩铠',slot:'shoulder',rarity:'rare',stats:{atk:1,sta:1}},{name:'沉睡者之戒',slot:'ring',rarity:'rare',stats:{spi:1}}]}, trash:[{name:'龙人护肩',slot:'shoulder',rarity:'uncommon',stats:{atk:1}},{name:'翡翠腰带',slot:'belt',rarity:'uncommon',stats:{def:1}}]},
  // 通灵学院
  scholomance: { bosses: {
    '詹迪斯·巴罗夫':         [{name:'巴罗夫家族长剑',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'白骨手套',slot:'gloves',rarity:'rare',stats:{int:1}}],
    '黑暗院长加丁':           [{name:'加丁的黑暗法杖',slot:'weapon',rarity:'rare',stats:{atk:1,int:1}},{name:'黑暗腰带',slot:'belt',rarity:'rare',stats:{def:1,int:1}}],
    '拉斯·弗罗斯特维斯帕':   [{name:'拉斯·弗罗斯特的法杖',slot:'weapon',rarity:'epic',stats:{atk:2,int:2}},{name:'亡灵仪祭头盔',slot:'helmet',rarity:'rare',stats:{def:1,int:1}},{name:'黑暗符文戒指',slot:'ring',rarity:'rare',stats:{int:1}}]}, trash:[{name:'亡灵手套',slot:'gloves',rarity:'uncommon',stats:{}},{name:'白骨腰带',slot:'belt',rarity:'uncommon',stats:{def:1}}]},
  // 黑石深渊
  brd: { bosses: {
    '弗诺斯·达克维尔':       [{name:'达克维尔的宝库钥匙',slot:'ring',rarity:'rare',stats:{sta:1}},{name:'黑铁腰带',slot:'belt',rarity:'rare',stats:{def:1,str:1}}],
    '贝尔加':                 [{name:'贝尔加之锤',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'熔岩护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,sta:1}}],
    '弗莱拉斯大使':           [{name:'大使之杖',slot:'weapon',rarity:'rare',stats:{atk:1,int:1}},{name:'黑铁手套',slot:'gloves',rarity:'rare',stats:{int:1}}],
    '达格兰·索瑞森大帝':     [{name:'索瑞森皇家节杖',slot:'weapon',rarity:'epic',stats:{atk:2,str:2}},{name:'黑铁战盔',slot:'helmet',rarity:'rare',stats:{def:1,sta:1}},{name:'熔火徽记',slot:'trinket',rarity:'rare',stats:{sta:1,def:1}}]}, trash:[{name:'黑铁护手',slot:'gloves',rarity:'uncommon',stats:{}},{name:'暗炉腰带',slot:'belt',rarity:'uncommon',stats:{def:1}}]},
  // 斯坦索姆
  stratholme: { bosses: {
    '悲惨的提米':     [{name:'提米的玩具锤',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'亡灵腰带',slot:'belt',rarity:'rare',stats:{def:1,sta:1}}],
    '炮手威利':       [{name:'威利的炸弹发射器',slot:'weapon',rarity:'rare',stats:{atk:1,agi:1}},{name:'火药护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,agi:1}}],
    '巴纳扎尔':       [{name:'巴纳扎尔的恐惧之刃',slot:'weapon',rarity:'rare',stats:{atk:1}},{name:'恶魔之戒',slot:'ring',rarity:'rare',stats:{atk:1}}],
    '瑞文戴尔男爵':   [{name:'瑞文戴尔之剑',slot:'weapon',rarity:'epic',stats:{atk:2,str:2}},{name:'亡灵领主头盔',slot:'helmet',rarity:'rare',stats:{def:1,sta:1}},{name:'死亡骑士之戒',slot:'ring',rarity:'rare',stats:{str:1}}]}, trash:[{name:'瘟疫手套',slot:'gloves',rarity:'uncommon',stats:{}},{name:'亡灵肩甲',slot:'shoulder',rarity:'uncommon',stats:{atk:1}}]},
  // 熔火之心
  mc: { bosses: {
    '鲁西弗隆':   [{name:'鲁西弗隆的诅咒',slot:'trinket',rarity:'rare',stats:{sta:1}},{name:'火焰手套',slot:'gloves',rarity:'rare',stats:{int:1}}],
    '玛格曼达':   [{name:'玛格曼达的獠牙',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'熔岩护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,sta:1}}],
    '加尔':       [{name:'加尔之石',slot:'trinket',rarity:'rare',stats:{sta:1,def:1}},{name:'熔岩腰带',slot:'belt',rarity:'rare',stats:{def:1,sta:1}}],
    '迦顿男爵':   [{name:'迦顿的火焰之剑',slot:'weapon',rarity:'epic',stats:{atk:2,str:2}},{name:'烈焰行者护腿',slot:'pants',rarity:'rare',stats:{hp:1,sta:1}}],
    '拉格纳罗斯': [{name:'萨弗隆战锤',slot:'weapon',rarity:'legend',stats:{atk:4,str:3}},{name:'火焰之王头盔',slot:'helmet',rarity:'epic',stats:{def:2,sta:2}},{name:'熔岩之环',slot:'ring',rarity:'epic',stats:{int:2}}]}, trash:[{name:'熔岩护手',slot:'gloves',rarity:'rare',stats:{sta:1}},{name:'黑铁战靴',slot:'boots',rarity:'rare',stats:{sta:1}},{name:'炽热腰带',slot:'belt',rarity:'rare',stats:{def:1,str:1}}]},
  // 法力陵墓
  manatombs: { bosses: {
    '潘德莫努斯':       [{name:'潘德莫努斯之刃',slot:'weapon',rarity:'rare',stats:{atk:1,agi:1}},{name:'虚空裹手',slot:'gloves',rarity:'rare',stats:{int:1}}],
    '塔瓦洛克':         [{name:'塔瓦洛克的石拳',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'暗影腰带',slot:'belt',rarity:'rare',stats:{def:1,sta:1}}],
    '节点亲王沙法尔':   [{name:'沙法尔的虚空法杖',slot:'weapon',rarity:'epic',stats:{atk:2,int:2}},{name:'能量灌注戒指',slot:'ring',rarity:'rare',stats:{int:1}},{name:'虚空护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,int:1}}]}, trash:[{name:'奥金顿手套',slot:'gloves',rarity:'uncommon',stats:{}},{name:'虚空腰带',slot:'belt',rarity:'uncommon',stats:{def:1}}]},
  // 黑翼之巢
  bwl: { bosses: {
    '狂野的拉佐格尔':     [{name:'拉佐格尔之爪',slot:'weapon',rarity:'rare',stats:{atk:1,agi:1}},{name:'黑翼护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,agi:1}}],
    '堕落的瓦拉斯塔兹':   [{name:'瓦拉斯塔兹之角',slot:'trinket',rarity:'rare',stats:{sta:1}},{name:'龙人手套',slot:'gloves',rarity:'rare',stats:{}}],
    '克洛玛古斯':         [{name:'克洛玛古斯之牙',slot:'weapon',rarity:'epic',stats:{atk:2,agi:2}},{name:'多彩龙鳞腰带',slot:'belt',rarity:'rare',stats:{def:1,hp:1}}],
    '奈法利安':           [{name:'暗影烈焰法杖',slot:'weapon',rarity:'legend',stats:{atk:4,int:3}},{name:'黑龙王头盔',slot:'helmet',rarity:'epic',stats:{def:2}},{name:'龙牙饰物',slot:'trinket',rarity:'epic',stats:{sta:2}}]}, trash:[{name:'黑龙肩甲',slot:'shoulder',rarity:'rare',stats:{atk:1,sta:1}},{name:'黑翼手套',slot:'gloves',rarity:'rare',stats:{agi:1}},{name:'龙人腰带',slot:'belt',rarity:'rare',stats:{def:1,hp:1}}]},
  // 蒸汽地窟
  steamvault: { bosses: {
    '水术师瑟丝比亚':   [{name:'瑟丝比亚的水晶杖',slot:'weapon',rarity:'rare',stats:{atk:1,int:1}},{name:'盘牙手套',slot:'gloves',rarity:'rare',stats:{int:1}}],
    '机械师斯蒂里格':   [{name:'斯蒂里格的扳手',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'蒸汽腰带',slot:'belt',rarity:'rare',stats:{def:1,str:1}}],
    '督军卡利瑟里斯':   [{name:'卡利瑟里斯的战斗斧',slot:'weapon',rarity:'epic',stats:{atk:2,str:2}},{name:'蒸汽护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,sta:1}},{name:'盘牙徽记',slot:'trinket',rarity:'rare',stats:{sta:1,str:1}}]}, trash:[{name:'沼泽护肩',slot:'shoulder',rarity:'uncommon',stats:{atk:1}},{name:'蒸汽手套',slot:'gloves',rarity:'uncommon',stats:{}}]},
  // 纳克萨玛斯
  naxx: { bosses: {
    '阿努布雷坎': [{name:'阿努布雷坎的蛛牙',slot:'weapon',rarity:'rare',stats:{atk:1,agi:1}},{name:'蛛魔腰带',slot:'belt',rarity:'rare',stats:{def:1,agi:1}}],
    '帕奇维克':   [{name:'帕奇维克的屠刀',slot:'weapon',rarity:'epic',stats:{atk:2,str:2}},{name:'憎恶手套',slot:'gloves',rarity:'rare',stats:{str:1}}],
    '塔迪乌斯':   [{name:'塔迪乌斯的闪电护肩',slot:'shoulder',rarity:'epic',stats:{atk:2}},{name:'电击之戒',slot:'ring',rarity:'rare',stats:{}}],
    '萨菲隆':     [{name:'萨菲隆的冰霜之息',slot:'trinket',rarity:'epic',stats:{sta:2,int:2}},{name:'冰霜巨龙腿甲',slot:'pants',rarity:'rare',stats:{hp:1,sta:1}}],
    '克尔苏加德': [{name:'克尔苏加德的法杖',slot:'weapon',rarity:'legend',stats:{atk:4,int:3}},{name:'霜火头饰',slot:'helmet',rarity:'epic',stats:{def:2,int:2}},{name:'白骨之环',slot:'ring',rarity:'epic',stats:{atk:2}}]}, trash:[{name:'天灾护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,sta:1}},{name:'瘟疫手套',slot:'gloves',rarity:'rare',stats:{int:1}},{name:'亡灵壁垒腰带',slot:'belt',rarity:'rare',stats:{def:1,def:1}}]},
  // 魔导师平台
  magister: { bosses: {
    '塞林·火心':         [{name:'火心之剑',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'血精灵护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,int:1}}],
    '女祭司德莉希亚':     [{name:'德莉希亚的圣光之锤',slot:'weapon',rarity:'rare',stats:{atk:1,spi:1}},{name:'奥术腰带',slot:'belt',rarity:'rare',stats:{def:1,int:1}}],
    '凯尔萨斯·逐日者':   [{name:'凯尔萨斯的凤凰之刃',slot:'weapon',rarity:'legend',stats:{atk:4,int:3}},{name:'日怒肩垫',slot:'shoulder',rarity:'epic',stats:{atk:2,int:2}},{name:'炎刃手套',slot:'gloves',rarity:'epic',stats:{}}]}, trash:[{name:'日怒手套',slot:'gloves',rarity:'rare',stats:{int:1}},{name:'银月腰带',slot:'belt',rarity:'rare',stats:{def:1,int:1}}]},
  // 卡拉赞
  karazhan: { bosses: {
    '猎手阿图门': [{name:'阿图门之剑',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'午夜马鞍',slot:'belt',rarity:'rare',stats:{def:1,agi:1}}],
    '莫罗斯':     [{name:'莫罗斯的幸运怀表',slot:'trinket',rarity:'rare',stats:{sta:1}},{name:'管家手套',slot:'gloves',rarity:'rare',stats:{agi:1}}],
    '馆长':       [{name:'馆长的奥术核心',slot:'trinket',rarity:'epic',stats:{sta:2,int:2}},{name:'奥术护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,int:1}}],
    '麦迪文':     [{name:'麦迪文的法杖',slot:'weapon',rarity:'legend',stats:{atk:4,int:3,spi:3}},{name:'守护者头盔',slot:'helmet',rarity:'epic',stats:{def:2,int:2}},{name:'卡拉赞徽记',slot:'trinket',rarity:'epic',stats:{sta:2,int:2}}]}, trash:[{name:'占星者手套',slot:'gloves',rarity:'rare',stats:{int:1}},{name:'奥术腰带',slot:'belt',rarity:'rare',stats:{def:1,int:1}}]},
  // 闪电大厅
  hol: { bosses: {
    '比亚格里将军': [{name:'比亚格里的战锤',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'风暴护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,sta:1}}],
    '沃尔坎':       [{name:'沃尔坎的熔岩拳套',slot:'gloves',rarity:'rare',stats:{str:1}},{name:'铁矮人护腿',slot:'pants',rarity:'rare',stats:{hp:1,sta:1}}],
    '洛肯':         [{name:'洛肯的闪电之锤',slot:'weapon',rarity:'epic',stats:{atk:3,str:2}},{name:'雷霆头盔',slot:'helmet',rarity:'epic',stats:{def:2,sta:2}},{name:'闪电之戒',slot:'ring',rarity:'rare',stats:{}}]}, trash:[{name:'铁矮人手套',slot:'gloves',rarity:'rare',stats:{str:1}},{name:'风暴腰带',slot:'belt',rarity:'rare',stats:{def:1,sta:1}}]},
  // 冠军的试炼
  toc: { bosses: {
    '银色勇士':           [{name:'银色勇士之剑',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'银白护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,spi:1}}],
    '黑骑士':             [{name:'黑骑士之刃',slot:'weapon',rarity:'rare',stats:{atk:1}},{name:'暗影战靴',slot:'boots',rarity:'rare',stats:{str:1}}],
    '纯洁者耶德瑞克':     [{name:'纯洁者的圣光之锤',slot:'weapon',rarity:'rare',stats:{atk:1,spi:1}},{name:'圣光腰带',slot:'belt',rarity:'rare',stats:{def:1,spi:1}}],
    '银白十字军冠军':     [{name:'冠军的荣耀之剑',slot:'weapon',rarity:'epic',stats:{atk:3}},{name:'银白十字军战盔',slot:'helmet',rarity:'epic',stats:{def:2,str:2}},{name:'冠军徽记',slot:'trinket',rarity:'epic',stats:{sta:2}}]}, trash:[{name:'银白手套',slot:'gloves',rarity:'rare',stats:{spi:1}},{name:'十字军战靴',slot:'boots',rarity:'rare',stats:{str:1}}]},
  // 太阳之井
  sunwell: { bosses: {
    '卡雷苟斯':   [{name:'卡雷苟斯之鳞',slot:'armor',rarity:'rare',stats:{def:1,int:1}},{name:'蓝龙之戒',slot:'ring',rarity:'rare',stats:{int:1}}],
    '布鲁塔卢斯': [{name:'布鲁塔卢斯的断角',slot:'weapon',rarity:'epic',stats:{atk:2,str:2}},{name:'恶魔护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,str:1}}],
    '艾瑞达双子': [{name:'双子之刃',slot:'weapon',rarity:'epic',stats:{atk:2}},{name:'双子之环',slot:'ring',rarity:'rare',stats:{atk:1}}],
    '基尔加丹':   [{name:'索利达尔·群星之怒',slot:'weapon',rarity:'legend',stats:{atk:4,agi:3}},{name:'基尔加丹的冠冕',slot:'helmet',rarity:'epic',stats:{def:2}},{name:'永恒之光胸甲',slot:'armor',rarity:'epic',stats:{def:2,spi:2}}]}, trash:[{name:'日怒肩垫',slot:'shoulder',rarity:'rare',stats:{atk:1,int:1}},{name:'炎刃手套',slot:'gloves',rarity:'rare',stats:{}}]},
  // 奥杜尔
  ulduar: { bosses: {
    '烈焰巨兽': [{name:'烈焰巨兽的活塞',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'泰坦护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,sta:1}}],
    '钢铁议会': [{name:'钢铁议会之锤',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'符文手套',slot:'gloves',rarity:'rare',stats:{int:1}}],
    '芙蕾雅':   [{name:'芙蕾雅的自然法杖',slot:'weapon',rarity:'epic',stats:{atk:2,spi:2}},{name:'自然之环',slot:'ring',rarity:'rare',stats:{spi:1}}],
    '尤格-萨隆':[{name:'瓦兰奈尔·远古王者之锤',slot:'weapon',rarity:'legend',stats:{atk:4,hp:3,spi:3}},{name:'尤格萨隆的触须之盔',slot:'helmet',rarity:'epic',stats:{def:2,sta:2}},{name:'泰坦之戒',slot:'ring',rarity:'epic',stats:{sta:2}}]}, trash:[{name:'钢铁腰带',slot:'belt',rarity:'rare',stats:{def:1,sta:1}},{name:'泰坦手套',slot:'gloves',rarity:'rare',stats:{sta:1}}]},
  // 灵魂洪炉
  forge: { bosses: {
    '布隆亚姆':         [{name:'布隆亚姆的镰刀',slot:'weapon',rarity:'rare',stats:{atk:1,agi:1}},{name:'灵魂护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,int:1}}],
    '灵魂吞噬者':       [{name:'灵魂吞噬者之爪',slot:'gloves',rarity:'rare',stats:{}},{name:'痛苦腰带',slot:'belt',rarity:'rare',stats:{def:1}}],
    '噬魂者布隆亚姆':   [{name:'噬魂者之镰',slot:'weapon',rarity:'legend',stats:{atk:4,agi:3}},{name:'灵魂熔炉头盔',slot:'helmet',rarity:'epic',stats:{def:2,sta:2}},{name:'噬魂之戒',slot:'ring',rarity:'epic',stats:{atk:2}}]}, trash:[{name:'灵魂手套',slot:'gloves',rarity:'rare',stats:{int:1}},{name:'熔炉腰带',slot:'belt',rarity:'rare',stats:{def:1,sta:1}}]},
  // 红玉圣殿
  ruby: { bosses: {
    '巴尔萨鲁斯':         [{name:'巴尔萨鲁斯的龙鳞',slot:'shoulder',rarity:'rare',stats:{atk:1,sta:1}},{name:'红龙护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,hp:1}}],
    '扎里斯利安将军':     [{name:'将军的龙鳞护手',slot:'gloves',rarity:'rare',stats:{str:1}},{name:'暮光腰带',slot:'belt',rarity:'rare',stats:{def:1,sta:1}}],
    '暮光龙·萨维安娜':    [{name:'萨维安娜的龙牙',slot:'weapon',rarity:'epic',stats:{atk:2}},{name:'暮光龙鳞胸甲',slot:'armor',rarity:'rare',stats:{def:1,hp:1}}],
    '海里昂':             [{name:'海里昂的龙鳞法杖',slot:'weapon',rarity:'legend',stats:{atk:4,int:3,spi:3}},{name:'红玉龙鳞头盔',slot:'helmet',rarity:'epic',stats:{def:2,hp:2}},{name:'暮光徽记',slot:'trinket',rarity:'epic',stats:{sta:2}}]}, trash:[{name:'暮光手套',slot:'gloves',rarity:'rare',stats:{int:1}},{name:'红玉腰带',slot:'belt',rarity:'rare',stats:{def:1,hp:1}}]},
  // 冰冠堡垒
  icc: { bosses: {
    '玛洛加尔领主':       [{name:'玛洛加尔的骨刺',slot:'weapon',rarity:'rare',stats:{atk:1}},{name:'白骨腰带',slot:'belt',rarity:'rare',stats:{def:1,str:1}}],
    '死亡使者萨鲁法尔':   [{name:'萨鲁法尔的战斧',slot:'weapon',rarity:'epic',stats:{atk:2,str:2}},{name:'死亡使者肩铠',slot:'shoulder',rarity:'rare',stats:{atk:1,str:1}}],
    '普崔塞德教授':       [{name:'教授的实验瓶',slot:'trinket',rarity:'epic',stats:{sta:2,int:2}},{name:'瘟疫科学家手套',slot:'gloves',rarity:'rare',stats:{int:1}}],
    '鲜血女王兰娜瑟尔':   [{name:'兰娜瑟尔的鲜血之牙',slot:'weapon',rarity:'epic',stats:{atk:2,agi:2}},{name:'鲜血女王之戒',slot:'ring',rarity:'rare',stats:{atk:1}}],
    '辛达苟萨':           [{name:'辛达苟萨的冰霜之息',slot:'trinket',rarity:'epic',stats:{sta:2}},{name:'冰霜巨龙腿甲',slot:'pants',rarity:'epic',stats:{hp:2,str:2}}],
    '巫妖王':             [{name:'影之哀伤',slot:'weapon',rarity:'legend',stats:{atk:5,str:4}},{name:'巫妖王的王冠',slot:'helmet',rarity:'epic',stats:{def:3,str:3}},{name:'阿尔萨斯的悔恨',slot:'trinket',rarity:'epic',stats:{sta:3,str:3}},{name:'冰封王座胸铠',slot:'armor',rarity:'epic',stats:{def:3,sta:3}}]}, trash:[{name:'天灾领主肩铠',slot:'shoulder',rarity:'rare',stats:{atk:1,str:1}},{name:'死亡之握',slot:'gloves',rarity:'rare',stats:{}},{name:'冰霜壁垒腰带',slot:'belt',rarity:'rare',stats:{def:1,sta:1}},{name:'灵魂洪炉战靴',slot:'boots',rarity:'rare',stats:{str:1}}]}};

/* 当前 DUNGEONS 与部分历史 DUNGEON_LOOT boss 名不完全一致。
   掉落按当前战斗 bossName 查找,这里做兼容映射,避免退回杂兵池。 */
const DUNGEON_LOOT_ALIASES = {
  mc: { '基赫纳斯':'迦顿男爵' },
  bwl: { '勒什雷尔':'堕落的瓦拉斯塔兹' },
  naxx: { '瘟疫使者诺斯':'帕奇维克', '肮脏的希尔盖':'帕奇维克', '塔迪乌斯':'塔迪乌斯' },
  karazhan: { '午夜':'猎手阿图门', '玛克扎尔王子':'麦迪文' },
  sunwell: { '穆鲁':'艾瑞达双子' },
  ulduar: { 'XT-002拆解者':'芙蕾雅', '维扎克斯将军':'芙蕾雅', '尤格萨隆':'尤格-萨隆' },
  ruby: { '萨维安娜·怒焰':'暮光龙·萨维安娜' },
};
const DUNGEON_ART_BACKFILL = {
  ragefire:'assets/wow/art/classic-ragefire.jpg',
  deadmines:'assets/wow/art/classic-deadmines.jpg',
  wailing:'assets/wow/art/classic-wailing.jpg',
  bfd:'assets/wow/art/classic-blackfathom-deeps.jpg',
  shadowfang:'assets/wow/art/classic-shadowfang.jpg',
  gnomeregan:'assets/wow/art/classic-gnomeregan.jpg',
  razorfen:'assets/wow/art/classic-razorfen-kraul.jpg',
  scarlet:'assets/wow/art/classic-scarlet.jpg',
  razorfend:'assets/wow/art/classic-razorfen-downs.jpg',
  uldaman:'assets/wow/art/classic-uldaman.jpg',
  maraudon:'assets/wow/art/classic-maraudon.jpg',
  zulfarrak:'assets/wow/art/classic-zulfarrak.jpg',
  sunktemple:'assets/wow/art/classic-sunken-temple.jpg',
  scholomance:'assets/wow/art/classic-scholo.jpg',
  brd:'assets/wow/art/classic-blackrock-depths.jpg',
  stratholme:'assets/wow/art/classic-stratholme.jpg',
  mc:'assets/wow/art/classic-molten-core.jpg',
  bwl:'assets/wow/art/classic-blackwing-lair.jpg',
  diremaul:'assets/wow/art/classic-dire-maul.jpg',
  lbrs:'assets/wow/art/classic-blackrock-spire.jpg',
  ubrs:'assets/wow/art/classic-blackrock-spire.jpg',
  aq40:'assets/wow/art/classic-ahnqiraj-temple.jpg',
  manatombs:'assets/wow/art/tbc-auchindoun.jpg',
  steamvault:'assets/wow/art/tbc-coilfang-reservoir.jpg',
  shattered:'assets/wow/art/tbc-hellfire-citadel.jpg',
  arcatraz:'assets/wow/art/tbc-tempest-keep.jpg',
  magister:'assets/wow/art/tbc-magisters-terrace.jpg',
  karazhan:'assets/wow/art/tbc-karazhan.jpg',
  ssc:'assets/wow/art/tbc-coilfang-reservoir.jpg',
  tk:'assets/wow/art/tbc-tempest-keep.jpg',
  hyjal:'assets/wow/art/tbc-mount-hyjal.jpg',
  bt:'assets/wow/art/tbc-black-temple.jpg',
  sunwell:'assets/wow/art/tbc-sunwell-plateau.jpg',
  culling:'assets/wow/art/wrath-culling-stratholme.jpg',
  pit:'assets/wow/art/wrath-pit-saron.jpg',
  oculus:'assets/wow/art/wrath-oculus.jpg',
  hor:'assets/wow/art/wrath-halls-reflection.jpg',
  nexus:'assets/wow/art/wrath-nexus.jpg',
  gundrak:'assets/wow/art/wrath-gundrak.jpg',
  hol:'assets/wow/art/wrath-halls-lightning.jpg',
  toc:'assets/wow/art/wrath-trial-champion.jpg',
  forge:'assets/wow/art/wrath-forge-souls.jpg',
  naxx:'assets/wow/art/classic-naxxramas.jpg',
  ruby:'assets/wow/art/wrath-ruby-sanctum.jpg',
  icc:'assets/wow/art/wrath-icecrown-citadel.jpg',
  ulduar:'assets/wow/art/wrath-halls-lightning.jpg',
  vortex:'assets/wow/art/cataclysm-vortex-pinnacle.jpg',
  firelands:'assets/wow/art/cataclysm-firelands.jpg',
  dragonsoul:'assets/wow/art/cataclysm-dragon-soul.jpg',
  stormstout:'assets/wow/art/pandaria-stormstout-brewery.jpg',
  shadopan:'assets/wow/art/pandaria-shadopan-monastery.jpg',
  throne:'assets/wow/art/pandaria-throne-thunder.jpg',
  soo:'assets/wow/art/pandaria-siege-orgrimmar.jpg',
  irondocks:'assets/wow/art/draenor-iron-docks.jpg',
  grimrail:'assets/wow/art/draenor-grimrail-depot.jpg',
  everbloom:'assets/wow/art/draenor-everbloom.jpg',
  hfc:'assets/wow/art/draenor-hellfire-citadel.jpg',
  valor:'assets/wow/art/legion-halls-valor.jpg',
  darkheart:'assets/wow/art/legion-darkheart-thicket.jpg',
  court:'assets/wow/art/legion-court-stars.jpg',
  tomb:'assets/wow/art/legion-tomb-sargeras.jpg',
  antorus:'assets/wow/art/legion-antorus.jpg',
  nightmare:'assets/wow/art/legion-emerald-nightmare.jpg',
  nighthold:'assets/wow/art/legion-nighthold.jpg',
  freehold:'assets/wow/art/bfa-freehold.jpg',
  mechagon:'assets/wow/art/bfa-mechagon.jpg',
  boralus:'assets/wow/art/bfa-siege-boralus.jpg',
  ataldazar:'assets/wow/art/bfa-ataldazar.jpg',
  uldir:'assets/wow/art/bfa-uldir.jpg',
  waycrest:'assets/wow/art/bfa-waycrest-manor.jpg',
  kingsrest:'assets/wow/art/bfa-kings-rest.jpg',
  eternalpalace:'assets/wow/art/bfa-eternal-palace.jpg',
  nyalotha:'assets/wow/art/bfa-nyalotha.jpg',
  necrotic:'assets/wow/art/shadowlands-necrotic-wake.jpg',
  nathria:'assets/wow/art/shadowlands-castle-nathria.jpg',
  sethekk:'assets/wow/art/tbc-auchindoun.jpg',
  atonement:'assets/wow/art/shadowlands-castle-nathria.jpg',
  plaguefall:'assets/wow/art/shadowlands-necrotic-wake.jpg',
  mists:'assets/wow/art/shadowlands-necrotic-wake.jpg',
  theater:'assets/wow/art/shadowlands-necrotic-wake.jpg',
  azurevault:'assets/wow/art/wrath-nexus.jpg',
  hallsinfusion:'assets/wow/art/wrath-nexus.jpg',
  brackenhide:'assets/wow/art/classic-wailing.jpg',
  neltharus:'assets/wow/art/aberrus-banner.jpg',
  nokhud:'assets/wow/art/amirdrassil-banner.png',
  rookery:'assets/wow/art/warwithin-rookery.png',
  cinderbrew:'assets/wow/art/warwithin-cinderbrew.png',
  darkflame:'assets/wow/art/warwithin-darkflame.png',
  dawnbreaker:'assets/wow/art/warwithin-dawnbreaker.png',
  arakara:'assets/wow/art/warwithin-arakara.png',
  citythreads:'assets/wow/art/warwithin-citythreads.png',
  stonevault:'assets/wow/art/warwithin-stonevault.png',
  prioryflame:'assets/wow/art/warwithin-prioryflame.png',
  nightfall_sanctum:'assets/wow/art/warwithin-prioryflame.png',
  earthcrawl_mines:'assets/wow/art/warwithin-stonevault.png',
  fungal_folly:'assets/wow/art/warwithin-arakara.png',
  archival_assault:'assets/wow/art/primeus-repository.png',
  aberrus:'assets/wow/art/aberrus-banner.jpg',
  amirdrassil:'assets/wow/art/amirdrassil-banner.png',
  ecodome_aldani:'assets/wow/art/ecodome-rhovan.png',
  oasis_succession:'assets/wow/art/ecodome-rhovan.png',
  tazavesh_streets:'assets/wow/art/tazavesh-banner.png',
  tazavesh_gambit:'assets/wow/art/tazavesh-banner.png',
  overlook_zoshul:'assets/wow/art/shandorah.png',
  ecodome_rhovan:'assets/wow/art/ecodome-rhovan.png',
  shadowpoint_breach:'assets/wow/art/shadow-point.png',
  primeus_repository:'assets/wow/art/primeus-repository.png',
  nerubar:'assets/wow/art/warwithin-nerubar-palace.jpg',
  manaforge_omega:'assets/wow/art/karesh-map.png',
  shandorah_conclave:'assets/wow/art/shandorah.png',
  voidrazor_sanctum:'assets/wow/art/voidrazor-sanctum.png',
  murder_row:'assets/wow/art/tbc-magisters-terrace.jpg',
  silvermoon_voidspire:'assets/wow/art/tbc-magisters-terrace.jpg',
  den_nalorakk:'assets/wow/art/classic-zulfarrak.jpg',
  maisara_caverns:'assets/wow/art/classic-zulfarrak.jpg',
  sporefall:'assets/wow/art/ecodome-rhovan.png',
  curse_ulatek:'assets/wow/art/voidrazor-sanctum.png'
};
function applyDungeonArtBackfill(){
  for (const dg of DUNGEONS) {
    const art = DUNGEON_ART_BACKFILL[dg.key];
    if (art) dg.art = art;
  }
}
function getBaseDungeonBossLoot(dungeonKey, bossName) {
  const loot = DUNGEON_LOOT[dungeonKey];
  if (!loot || !loot.bosses || !bossName) return null;
  const alias = DUNGEON_LOOT_ALIASES[dungeonKey]?.[bossName];
  return loot.bosses[bossName] || (alias ? loot.bosses[alias] : null) || null;
}
function baseDungeonKey(dungeonKey) { return String(dungeonKey || '').replace(/_(epic|heroic|epic5)$/, ''); }
function isEpicRaidKey(dungeonKey) { return /_epic$/.test(String(dungeonKey || '')); }
function getDungeonDef(dungeonKey) { return DUNGEONS.find(d => d.key === dungeonKey) || null; }
const WORLD_BOSS_SKILLSETS = {
  hogger_king: {
    passive:{ dmgReduction:0.19, critChance:0.16, dodgeChance:0.09, atkBonus:0.22, leech:0.06, stunChance:0.08 },
    supportCount:1,
    atkInterval:1360,
    instantCast:false,
    skills:[
      {name:'野蛮扑袭', icon:'🐗', desc:'6.8倍伤害，眩晕0.9秒并虚弱5秒', type:'dmg', mul:6.8, cd:8, castTime:1.6, stun:900, weaken:true},
      {name:'撕喉裂伤', icon:'🩸', desc:'6.4倍伤害，流血8秒并附加易爆6秒', type:'dmg', mul:6.4, cd:9, castTime:2.1, bleed:true, brittle:true},
      {name:'霍格呼号', icon:'📯', desc:'召唤1只豺狼人并在6秒内攻击+25%、攻速+20%', type:'support', cd:14, castTime:2.5, summonCount:1, summonTheme:'beast', atkBuffSecs:6, atkBuffPct:25, spdBuffSecs:6, spdBuffPct:20},
      {name:'断骨重槌', icon:'🔨', desc:'7.8倍伤害，并施加5秒易伤', type:'dmg', mul:7.8, cd:11, castTime:2.8, sunder:true}
    ]
  },
  swamp_tyrant: {
    passive:{ dmgReduction:0.23, critChance:0.18, dodgeChance:0.09, atkBonus:0.2, leech:0.1 },
    supportCount:1,
    atkInterval:1320,
    instantCast:false,
    instantCastChance:0.08,
    skills:[
      {name:'泥沼绞缠', icon:'🪢', desc:'7.8倍自然伤害，残废5秒并衰老8秒', type:'dmg', mul:7.8, cd:8, castTime:2.1, cripple:true, decay:true},
      {name:'暴君撕咬', icon:'🦷', desc:'8.2倍伤害，流血8秒并附加易爆6秒', type:'dmg', mul:8.2, cd:9, castTime:2.5, bleed:true, brittle:true},
      {name:'腐泥喷潮', icon:'🫧', desc:'9.1倍范围伤害，并施加瘟疫与虚弱', type:'dmg', mul:9.1, cd:10, castTime:3.1, aoe:true, plague:true, weaken:true},
      {name:'沼泽蜕皮', icon:'🛡️', desc:'恢复12%生命，获得12%护盾并在6秒内减伤18%', type:'support', cd:15, castTime:2.7, healPct:0.12, shieldPct:0.12, drBuffSecs:6, drBuffPct:0.18}
    ]
  },
  blackrock_overlord: {
    passive:{ dmgReduction:0.26, critChance:0.2, dodgeChance:0.09, atkBonus:0.24, leech:0.06, stunChance:0.1 },
    supportCount:2,
    atkInterval:1280,
    instantCastChance:0.12,
    skills:[
      {name:'黑铁军令', icon:'⚒️', desc:'召唤1名黑铁守卫并在6秒内防御+30%', type:'support', cd:14, castTime:2.2, summonCount:1, summonTheme:'soldier', defBuffSecs:6, defBuffPct:30},
      {name:'熔岩重踏', icon:'🌋', desc:'9倍范围伤害，眩晕1秒并附加易爆6秒', type:'dmg', mul:9, cd:9, castTime:2.5, aoe:true, stun:1000, brittle:true},
      {name:'破城碾碎', icon:'🪨', desc:'9.6倍伤害，并施加沉默1.6秒与易伤5秒', type:'dmg', mul:9.6, cd:8, castTime:2.9, silence:1600, sunder:true},
      {name:'黑石处刑', icon:'⛏️', desc:'10.4倍伤害，流血8秒并虚弱5秒', type:'dmg', mul:10.4, cd:11, castTime:3.4, bleed:true, weaken:true}
    ]
  },
  kazzak_doom: {
    passive:{ dmgReduction:0.29, critChance:0.22, dodgeChance:0.1, atkBonus:0.28, leech:0.09, stunChance:0.1 },
    supportCount:2,
    atkInterval:1240,
    instantCastChance:0.16,
    skills:[
      {name:'末日之痕', icon:'😈', desc:'10倍邪能伤害，虚弱5秒并衰老8秒', type:'dmg', mul:10, cd:8, castTime:2.2, weaken:true, decay:true},
      {name:'灵魂压榨', icon:'💀', desc:'10.4倍暗影伤害，沉默1.8秒并获得8秒吸血强化', type:'dmg', mul:10.4, cd:9, castTime:2.8, soulDrain:true, silence:1800},
      {name:'虚空吞没', icon:'🛸', desc:'恢复10%生命，获得18%护盾并召唤1个虚空爪牙', type:'support', cd:15, castTime:3.1, healPct:0.10, shieldPct:0.18, summonCount:1, summonTheme:'void'},
      {name:'毁灭践踏', icon:'🌋', desc:'11.2倍范围伤害，恐惧1.6秒并附加易爆6秒', type:'dmg', mul:11.2, cd:11, castTime:3.6, aoe:true, fear:1600, brittle:true},
      {name:'军团钩锁', icon:'🔗', desc:'10.8倍伤害，灵魂链接8秒并吸取60点资源', type:'dmg', mul:10.8, cd:10, castTime:3.2, soulLink:true, manaDrain:60, cripple:true}
    ]
  },
  magtheridon_wrath: {
    passive:{ dmgReduction:0.33, critChance:0.24, dodgeChance:0.11, atkBonus:0.32, leech:0.1, stunChance:0.12 },
    supportCount:2,
    atkInterval:1200,
    instantCastChance:0.2,
    skills:[
      {name:'地狱裂拳', icon:'👊', desc:'11.2倍伤害，眩晕1.4秒并附加易爆6秒', type:'dmg', mul:11.2, cd:8, castTime:2.2, stun:1400, brittle:true},
      {name:'囚徒狂怒', icon:'😡', desc:'获得14%护盾，并在8秒内攻击+30%、攻速+25%', type:'support', cd:14, castTime:2.5, shieldPct:0.14, atkBuffSecs:8, atkBuffPct:30, spdBuffSecs:8, spdBuffPct:25},
      {name:'深渊火雨', icon:'🔥', desc:'11.5倍范围火焰伤害，附带灼烧与沉默1.8秒', type:'dmg', mul:11.5, cd:10, castTime:3, aoe:true, dot:true, silence:1800},
      {name:'末日锁链', icon:'⛓️', desc:'11.8倍伤害，残废5秒、恐惧1.6秒并灵魂链接8秒', type:'dmg', mul:11.8, cd:9, castTime:3.4, cripple:true, fear:1600, soulLink:true},
      {name:'深渊震爆', icon:'💥', desc:'12.4倍伤害，虚弱5秒并吸取70点资源', type:'dmg', mul:12.4, cd:11, castTime:3.8, weaken:true, manaDrain:70}
    ]
  },
  sindragosa_shadow: {
    passive:{ dmgReduction:0.37, critChance:0.26, dodgeChance:0.14, atkBonus:0.34, leech:0.08, stunChance:0.14 },
    supportCount:3,
    atkInterval:1160,
    instantCastChance:0.24,
    skills:[
      {name:'寒墓印记', icon:'🛡️', desc:'获得16%护盾，并在8秒内减伤20%', type:'support', cd:14, castTime:2.3, shieldPct:0.16, drBuffSecs:8, drBuffPct:0.20},
      {name:'霜墓龙息', icon:'❄️', desc:'12倍冰霜伤害，冻结1.6秒并衰老8秒', type:'dmg', mul:12, cd:8, castTime:2.4, freeze:1600, decay:true},
      {name:'寒翼横扫', icon:'🪽', desc:'12.3倍范围伤害，附加易爆6秒与虚弱5秒', type:'dmg', mul:12.3, cd:9, castTime:3, aoe:true, brittle:true, weaken:true},
      {name:'灵魂寒渊', icon:'💀', desc:'13倍暗影冰霜伤害，沉默1.8秒并凋零8秒', type:'dmg', mul:13, cd:10, castTime:3.8, silence:1800, soulDrain:true, decay2:true},
      {name:'冰封灵柩', icon:'🧊', desc:'11.8倍伤害，冻结1.2秒并吸取75点资源', type:'dmg', mul:11.8, cd:9, castTime:3.2, freeze:1200, manaDrain:75},
      {name:'凛冬天幕', icon:'🌨️', desc:'13.4倍范围伤害，恐惧1.6秒并再次冻结1.4秒', type:'dmg', mul:13.4, cd:12, castTime:4.2, aoe:true, fear:1600, freeze:1400}
    ]
  },
  deathwing: {
    passive:{ dmgReduction:0.46, critChance:0.32, dodgeChance:0.14, atkBonus:0.38, leech:0.16, stunChance:0.2 },
    supportCount:5,
    skills:[
      {name:'灾变烈焰', icon:'🌋', desc:'15倍火焰伤害', type:'dmg', mul:15, castTime:3.2, dot:true, brittle:true, silence:2400},
      {name:'熔岩撕裂', icon:'🦴', desc:'14倍伤害', type:'dmg', mul:14, castTime:2.8, bleed:true, cripple:true, brittle:true},
      {name:'灭世龙息', icon:'🐲', desc:'16倍范围烈焰伤害', type:'dmg', mul:16, castTime:4.1, aoe:true, dot:true, weaken:true, fear:2000},
      {name:'大地裂变', icon:'🌍', desc:'15倍范围伤害', type:'dmg', mul:15, castTime:3.8, aoe:true, stun:2000, decay2:true},
      {name:'暮光腐化', icon:'🌑', desc:'14倍暗影伤害', type:'dmg', mul:14, castTime:3.3, weaken:true, plague:true, soulLink:true},
      {name:'龙魂终焉', icon:'💥', desc:'17倍范围伤害', type:'dmg', mul:17, castTime:4.8, aoe:true, soulDrain:true, brittle:true, fear:1800}
    ]
  },
  ragnaros: {
    passive:{ dmgReduction:0.4, critChance:0.3, dodgeChance:0.1, atkBonus:0.4, leech:0.1, stunChance:0.16 },
    supportCount:5,
    skills:[
      {name:'萨弗隆之焰', icon:'🔥', desc:'14倍火焰伤害', type:'dmg', mul:14, castTime:2.8, dot:true, brittle:true},
      {name:'熔火新星', icon:'☄️', desc:'15倍范围火焰伤害', type:'dmg', mul:15, castTime:3.6, aoe:true, dot:true, silence:2000},
      {name:'炎魔之手', icon:'🖐️', desc:'13倍伤害', type:'dmg', mul:13, castTime:2.5, stun:1800, dot:true, manaDrain:65},
      {name:'元素湮灭', icon:'🌋', desc:'16倍范围伤害', type:'dmg', mul:16, castTime:4.2, aoe:true, dot:true, decay:true, brittle:true},
      {name:'熔火枷锁', icon:'⛓️', desc:'14倍火焰伤害', type:'dmg', mul:14, castTime:3.2, cripple:true, fear:1600},
      {name:'炎王裁决', icon:'👑', desc:'17倍伤害', type:'dmg', mul:17, castTime:4.6, weaken:true, frenzy:true, silence:1800}
    ]
  },
  cthun: {
    passive:{ dmgReduction:0.48, critChance:0.26, dodgeChance:0.2, atkBonus:0.26, leech:0.08, stunChance:0.14 },
    supportCount:5,
    skills:[
      {name:'眼棱贯穿', icon:'👁️', desc:'13倍暗影伤害', type:'dmg', mul:13, castTime:2.3, silence:2400, weaken:true, manaDrain:70},
      {name:'疯狂凝视', icon:'🌀', desc:'14倍伤害', type:'dmg', mul:14, castTime:3, fear:2200, decay2:true, mirror:true},
      {name:'触须风暴', icon:'🦑', desc:'15倍范围伤害', type:'dmg', mul:15, castTime:3.8, aoe:true, cripple:true, soulLink:true, revenge:true},
      {name:'古神低语', icon:'🔮', desc:'13倍暗影伤害', type:'dmg', mul:13, castTime:2.9, weaken:true, plague:true, soulDrain:true},
      {name:'吞世之眼', icon:'🌌', desc:'15倍暗影伤害', type:'dmg', mul:15, castTime:4.2, manaDrain:80, silence:1800, fear:1600},
      {name:'疯狂孵化', icon:'🪲', desc:'16倍范围伤害', type:'dmg', mul:16, castTime:4.8, aoe:true, plague:true, mirror:true, soulLink:true}
    ]
  },
  yogg_saron: {
    passive:{ dmgReduction:0.5, critChance:0.28, dodgeChance:0.18, atkBonus:0.3, leech:0.1, stunChance:0.15 },
    supportCount:5,
    skills:[
      {name:'疯狂低语', icon:'🧠', desc:'14倍暗影伤害', type:'dmg', mul:14, castTime:2.5, fear:2200, weaken:true, manaDrain:75},
      {name:'梦魇凝视', icon:'👁️', desc:'14.5倍伤害', type:'dmg', mul:14.5, castTime:3.1, silence:2100, mirror:true, decay2:true},
      {name:'千喉回响', icon:'🔊', desc:'15倍范围伤害', type:'dmg', mul:15, castTime:3.7, aoe:true, soulLink:true, plague:true},
      {name:'理智崩塌', icon:'💫', desc:'16倍暗影伤害', type:'dmg', mul:16, castTime:4.2, fear:1800, soulDrain:true, brittle:true},
      {name:'虚空孵化', icon:'🕳️', desc:'召唤2个虚空爪牙并获得护盾', type:'support', cd:18, castTime:3.2, summonCount:2, summonTheme:'void', shieldPct:0.16},
      {name:'无眠梦境', icon:'🌌', desc:'17倍范围伤害', type:'dmg', mul:17, castTime:5, aoe:true, mirror:true, soulLink:true, silence:1800}
    ]
  },
  alakir: {
    passive:{ dmgReduction:0.42, critChance:0.34, dodgeChance:0.22, atkBonus:0.42, leech:0.08, stunChance:0.2 },
    supportCount:4,
    atkInterval:1040,
    instantCastChance:0.18,
    skills:[
      {name:'风暴切割', icon:'🌪️', desc:'14倍自然伤害', type:'dmg', mul:14, castTime:2.1, silence:1800, cripple:true},
      {name:'闪电连锁', icon:'⚡', desc:'15倍范围伤害', type:'dmg', mul:15, castTime:3, aoe:true, stun:1400, manaDrain:70},
      {name:'气旋护壁', icon:'🛡️', desc:'获得护盾，提升攻速并短暂减伤', type:'support', cd:15, castTime:2.4, shieldPct:0.14, spdBuffSecs:8, spdBuffPct:30, drBuffSecs:6, drBuffPct:0.16},
      {name:'雷云崩落', icon:'⛈️', desc:'15.5倍范围伤害', type:'dmg', mul:15.5, castTime:3.8, aoe:true, weaken:true, freeze:1200},
      {name:'风暴囚笼', icon:'🔗', desc:'14.8倍伤害', type:'dmg', mul:14.8, castTime:3.2, cripple:true, silence:2000, brittle:true},
      {name:'天穹处决', icon:'🌩️', desc:'17倍自然伤害', type:'dmg', mul:17, castTime:4.6, stun:1800, frenzy:true, weaken:true}
    ]
  },
  lei_shen: {
    passive:{ dmgReduction:0.49, critChance:0.32, dodgeChance:0.16, atkBonus:0.44, leech:0.1, stunChance:0.22 },
    supportCount:5,
    atkInterval:1120,
    instantCastChance:0.14,
    skills:[
      {name:'静电震击', icon:'⚡', desc:'15倍自然伤害', type:'dmg', mul:15, castTime:2.2, stun:1600, brittle:true},
      {name:'雷霆鞭笞', icon:'🌩️', desc:'15.5倍范围伤害', type:'dmg', mul:15.5, castTime:3.2, aoe:true, silence:1900, weaken:true},
      {name:'超载导管', icon:'🔋', desc:'获得护盾并提升攻击', type:'support', cd:16, castTime:2.7, shieldPct:0.18, atkBuffSecs:8, atkBuffPct:32, drBuffSecs:8, drBuffPct:0.16},
      {name:'处刑雷枪', icon:'🔱', desc:'16倍伤害', type:'dmg', mul:16, castTime:3.6, sunder:true, manaDrain:85, alwaysCrit:true},
      {name:'暴君号令', icon:'👑', desc:'召唤2名魔古守卫', type:'support', cd:20, castTime:3, summonCount:2, summonTheme:'soldier', atkBuffSecs:6, atkBuffPct:24},
      {name:'雷神终裁', icon:'⚡', desc:'18倍范围伤害', type:'dmg', mul:18, castTime:5.1, aoe:true, stun:1800, silence:1800, decay2:true}
    ]
  },
  rukhmar: {
    passive:{ dmgReduction:0.51, critChance:0.3, dodgeChance:0.24, atkBonus:0.4, leech:0.08, stunChance:0.16 },
    supportCount:5,
    atkInterval:1060,
    instantCastChance:0.15,
    skills:[
      {name:'日炎俯冲', icon:'☀️', desc:'15.5倍火焰伤害,附带灼烧与破甲', type:'dmg', mul:15.5, castTime:2.4, dot:true, sunder:true, brittle:true},
      {name:'烈羽风暴', icon:'🪶', desc:'16倍范围伤害,沉默并削弱目标', type:'dmg', mul:16, castTime:3.3, aoe:true, silence:1900, weaken:true},
      {name:'天火升空', icon:'🪽', desc:'获得护盾并提升攻速/减伤', type:'support', cd:17, castTime:2.6, shieldPct:0.18, spdBuffSecs:8, spdBuffPct:30, drBuffSecs:8, drBuffPct:0.14},
      {name:'炽阳尖啸', icon:'🌞', desc:'16.5倍伤害,恐惧并消耗资源', type:'dmg', mul:16.5, castTime:3.5, fear:1800, manaDrain:80, silence:1600},
      {name:'阿兰卡雏鸟', icon:'🦅', desc:'召唤2只太阳雏鸟夹击玩家', type:'support', cd:20, castTime:3, summonCount:2, summonTheme:'beast', atkBuffSecs:7, atkBuffPct:24},
      {name:'炽日终啼', icon:'💥', desc:'18.5倍范围伤害,点燃并震晕全场', type:'dmg', mul:18.5, castTime:5, aoe:true, dot:true, stun:1700, fear:1400, brittle:true}
    ]
  },
  argus_unmaker: {
    passive:{ dmgReduction:0.55, critChance:0.34, dodgeChance:0.18, atkBonus:0.48, leech:0.14, stunChance:0.2 },
    supportCount:6,
    atkInterval:1100,
    instantCastChance:0.16,
    skills:[
      {name:'寂灭镰斩', icon:'🌌', desc:'16倍暗影伤害', type:'dmg', mul:16, castTime:2.7, soulDrain:true, cripple:true, brittle:true},
      {name:'群星熄灭', icon:'✨', desc:'17倍范围伤害', type:'dmg', mul:17, castTime:4, aoe:true, silence:2200, decay2:true},
      {name:'泰坦哀歌', icon:'🔮', desc:'获得护盾、减伤并恢复生命', type:'support', cd:18, castTime:3.2, healPct:0.10, shieldPct:0.22, drBuffSecs:8, drBuffPct:0.22},
      {name:'灵魂终末', icon:'💀', desc:'16.5倍暗影伤害', type:'dmg', mul:16.5, castTime:3.5, fear:2200, soulLink:true, manaDrain:90},
      {name:'湮灭裂隙', icon:'🕳️', desc:'召唤2个虚空爪牙并提升攻击', type:'support', cd:20, castTime:3.4, summonCount:2, summonTheme:'void', atkBuffSecs:7, atkBuffPct:26},
      {name:'万物归零', icon:'💥', desc:'19倍范围伤害', type:'dmg', mul:19, castTime:5.4, aoe:true, soulDrain:true, silence:2200, fear:1800, brittle:true}
    ]
  },
  queen_azshara: {
    passive:{ dmgReduction:0.57, critChance:0.37, dodgeChance:0.22, atkBonus:0.52, leech:0.12, stunChance:0.2 },
    supportCount:6,
    atkInterval:1020,
    instantCastChance:0.17,
    skills:[
      {name:'女王法潮', icon:'🌊', desc:'16.8倍范围奥术潮汐伤害,沉默并吸取资源', type:'dmg', mul:16.8, castTime:2.8, aoe:true, silence:2200, manaDrain:90},
      {name:'深海敕令', icon:'🔱', desc:'17.2倍伤害,虚弱、恐惧并镜像错位', type:'dmg', mul:17.2, castTime:3.3, weaken:true, fear:1900, mirror:true},
      {name:'娜迦禁卫', icon:'🧜', desc:'召唤2名娜迦禁卫并获得护盾', type:'support', cd:18, castTime:2.9, summonCount:2, summonTheme:'soldier', shieldPct:0.22, defBuffSecs:8, defBuffPct:20},
      {name:'潮汐枷锁', icon:'🌀', desc:'17.6倍伤害,冻结并灵魂链接', type:'dmg', mul:17.6, castTime:3.6, freeze:1700, soulLink:true, cripple:true},
      {name:'古神谕令', icon:'👁️', desc:'获得护盾并提升攻击、暴击与攻速', type:'support', cd:19, castTime:3.1, shieldPct:0.18, atkBuffSecs:8, atkBuffPct:30, critBuffSecs:8, critBuffPct:36, spdBuffSecs:8, spdBuffPct:24},
      {name:'永恒王宫坍塌', icon:'🌌', desc:'20.2倍范围伤害,衰亡、恐惧并必定暴击', type:'dmg', mul:20.2, castTime:5.1, aoe:true, decay2:true, fear:2000, silence:2200, alwaysCrit:true, brittle:true}
    ]
  },
  raszageth_storm: {
    passive:{ dmgReduction:0.56, critChance:0.36, dodgeChance:0.2, atkBonus:0.5, leech:0.1, stunChance:0.24 },
    supportCount:6,
    atkInterval:1040,
    instantCastChance:0.18,
    skills:[
      {name:'裂空雷爪', icon:'⚡', desc:'16.5倍自然伤害，眩晕并撕裂防御', type:'dmg', mul:16.5, castTime:2.4, stun:1800, sunder:true, brittle:true},
      {name:'原始飓风', icon:'🌪️', desc:'17倍范围伤害，减速并沉默', type:'dmg', mul:17, castTime:3.6, aoe:true, slow:true, silence:2200, weaken:true},
      {name:'风暴汇聚', icon:'🌩️', desc:'获得护盾，提升攻速并短暂减伤', type:'support', cd:17, castTime:2.8, shieldPct:0.2, spdBuffSecs:8, spdBuffPct:36, drBuffSecs:8, drBuffPct:0.2},
      {name:'雷霆牢笼', icon:'🔗', desc:'16.8倍伤害，吸取资源并灵魂链接', type:'dmg', mul:16.8, castTime:3.4, manaDrain:95, soulLink:true, cripple:true},
      {name:'暴风唤醒', icon:'🪽', desc:'召唤2名风暴元素并提升攻击', type:'support', cd:20, castTime:3.2, summonCount:2, summonTheme:'elemental', atkBuffSecs:7, atkBuffPct:28},
      {name:'化身崩雷', icon:'💥', desc:'19.5倍范围伤害，恐惧、沉默并引发衰亡', type:'dmg', mul:19.5, castTime:5.2, aoe:true, fear:1900, silence:2200, decay2:true, brittle:true}
    ]
  },
  sire_denathrius: {
    passive:{ dmgReduction:0.59, critChance:0.38, dodgeChance:0.22, atkBonus:0.54, leech:0.18, stunChance:0.22 },
    supportCount:7,
    atkInterval:1000,
    instantCastChance:0.18,
    skills:[
      {name:'罪碑突刺', icon:'🗡️', desc:'17.2倍暗影伤害,破甲并虚弱', type:'dmg', mul:17.2, castTime:2.7, sunder:true, weaken:true, brittle:true},
      {name:'深红收割', icon:'🩸', desc:'17.8倍范围伤害,流血并吸取资源', type:'dmg', mul:17.8, castTime:3.4, aoe:true, bleed:true, manaDrain:95},
      {name:'噬渊赐力', icon:'🕳️', desc:'获得护盾并提高攻击、攻速与吸血', type:'support', cd:17, castTime:2.8, shieldPct:0.22, atkBuffSecs:8, atkBuffPct:32, spdBuffSecs:8, spdBuffPct:28, leechBuffSecs:8, leechBuffPct:24},
      {name:'石裔断罪', icon:'🗿', desc:'召唤2尊石裔守卫并强化减伤', type:'support', cd:20, castTime:3.2, summonCount:2, summonTheme:'soldier', drBuffSecs:8, drBuffPct:0.2},
      {name:'赎罪回响', icon:'🔔', desc:'18.4倍伤害,恐惧、沉默并吸魂', type:'dmg', mul:18.4, castTime:3.7, fear:2000, silence:2200, soulDrain:true},
      {name:'深红夜宴', icon:'🍷', desc:'18.9倍范围伤害,衰亡并附加易爆', type:'dmg', mul:18.9, castTime:4.3, aoe:true, decay2:true, brittle:true, weaken:true},
      {name:'主宰终罚', icon:'👑', desc:'20.8倍范围终局伤害,灵魂链接并必定暴击', type:'dmg', mul:20.8, castTime:5.5, aoe:true, soulLink:true, silence:2300, fear:2100, alwaysCrit:true, brittle:true}
    ]
  },
  xal_atath: {
    passive:{ dmgReduction:0.62, critChance:0.38, dodgeChance:0.22, atkBonus:0.56, leech:0.16, stunChance:0.24 },
    supportCount:7,
    atkInterval:1020,
    instantCastChance:0.16,
    skills:[
      {name:'黑血穿刺', icon:'🩸', desc:'18倍暗影伤害，撕裂防御', type:'dmg', mul:18, castTime:2.5, sunder:true, plague:true, brittle:true},
      {name:'虚空丝线', icon:'🕸️', desc:'18.5倍范围伤害，沉默并束缚', type:'dmg', mul:18.5, castTime:3.5, aoe:true, silence:2400, cripple:true, soulLink:true},
      {name:'低语升格', icon:'👁️', desc:'获得护盾，提升攻击/暴击/减伤', type:'support', cd:16, castTime:2.8, shieldPct:0.24, atkBuffSecs:9, atkBuffPct:34, critBuffSecs:9, critBuffPct:38, drBuffSecs:9, drBuffPct:0.22},
      {name:'王宫献祭', icon:'👑', desc:'19倍伤害，吸取资源并恐惧', type:'dmg', mul:19, castTime:3.8, manaDrain:110, fear:2300, soulDrain:true},
      {name:'蛛魔唤令', icon:'🕷️', desc:'召唤3名蛛魔禁卫并提升攻速', type:'support', cd:20, castTime:3.4, summonCount:3, summonTheme:'spider', spdBuffSecs:8, spdBuffPct:32},
      {name:'现实裂口', icon:'🌀', desc:'20倍范围伤害，镜像错位并衰亡', type:'dmg', mul:20, castTime:4.6, aoe:true, mirror:true, decay2:true, silence:2200},
      {name:'虚空终幕', icon:'🌌', desc:'22倍范围终局伤害', type:'dmg', mul:22, castTime:5.8, aoe:true, plague:true, fear:2400, silence:2400, soulLink:true, alwaysCrit:true, brittle:true}
    ]
  },
  reshanor: {
    passive:{ dmgReduction:0.66, critChance:0.4, dodgeChance:0.24, atkBonus:0.6, leech:0.18, stunChance:0.25 },
    supportCount:8,
    atkInterval:980,
    instantCastChance:0.15,
    skills:[
      {name:'解缚冲击', icon:'🌀', desc:'19倍暗影奥术伤害,镜像错位', type:'dmg', mul:19, castTime:2.7, mirror:true, sunder:true, brittle:true},
      {name:'卡雷什裂隙', icon:'🌌', desc:'19.5倍范围伤害,恐惧并沉默', type:'dmg', mul:19.5, castTime:3.8, aoe:true, fear:2300, silence:2400, decay2:true},
      {name:'虚灵猎令', icon:'📜', desc:'获得护盾,提升攻击与减伤', type:'support', cd:16, castTime:2.6, shieldPct:0.26, atkBuffSecs:9, atkBuffPct:36, drBuffSecs:9, drBuffPct:0.24},
      {name:'相位吞没', icon:'💠', desc:'20倍伤害,吸取资源并瘟疫', type:'dmg', mul:20, castTime:3.5, manaDrain:120, plague:true, soulDrain:true},
      {name:'不羁回响', icon:'🧿', desc:'召唤3名相位残影并提高攻速', type:'support', cd:19, castTime:3.2, summonCount:3, summonTheme:'void', spdBuffSecs:8, spdBuffPct:34},
      {name:'星界撕裂', icon:'✨', desc:'21倍范围伤害,虚弱并灵魂链接', type:'dmg', mul:21, castTime:4.8, aoe:true, weaken:true, soulLink:true, silence:2200},
      {name:'无缚终局', icon:'🌌', desc:'23倍范围终局伤害', type:'dmg', mul:23, castTime:6, aoe:true, plague:true, fear:2500, silence:2500, mirror:true, alwaysCrit:true, brittle:true}
    ]
  },
  shadowpoint_vexis: {
    passive:{ dmgReduction:0.69, critChance:0.42, dodgeChance:0.24, atkBonus:0.64, leech:0.18, stunChance:0.26 },
    supportCount:8,
    atkInterval:960,
    instantCastChance:0.16,
    skills:[
      {name:'轨炮切线', icon:'🌑', desc:'20倍暗影伤害,撕裂防御并附加易爆', type:'dmg', mul:20, castTime:2.8, sunder:true, brittle:true},
      {name:'界钉封锁', icon:'⚙️', desc:'20.5倍范围伤害,沉默并残废', type:'dmg', mul:20.5, castTime:3.6, aoe:true, silence:2400, cripple:true},
      {name:'影卫总督令', icon:'📜', desc:'获得护盾并提升攻击/暴击/减伤', type:'support', cd:16, castTime:2.7, shieldPct:0.28, atkBuffSecs:9, atkBuffPct:38, critBuffSecs:9, critBuffPct:40, drBuffSecs:9, drBuffPct:0.24},
      {name:'裂轨狙杀', icon:'🎯', desc:'21倍伤害,必定暴击并恐惧', type:'dmg', mul:21, castTime:3.4, alwaysCrit:true, fear:2200, manaDrain:120},
      {name:'影点誓卫', icon:'🧿', desc:'召唤3名影卫誓卫并提高攻速', type:'support', cd:19, castTime:3.1, summonCount:3, summonTheme:'void', spdBuffSecs:8, spdBuffPct:34},
      {name:'吞界火线', icon:'💥', desc:'22倍范围伤害,镜像错位并衰亡', type:'dmg', mul:22, castTime:4.8, aoe:true, mirror:true, decay2:true, silence:2300},
      {name:'裂隙军律', icon:'🌌', desc:'21.5倍伤害,灵魂链接并吸取资源', type:'dmg', mul:21.5, castTime:4.1, soulLink:true, soulDrain:true, manaDrain:130},
      {name:'影点终炮', icon:'🌑', desc:'24倍范围终局伤害', type:'dmg', mul:24, castTime:6.1, aoe:true, fear:2500, silence:2500, plague:true, alwaysCrit:true, brittle:true}
    ]
  },
  shandorah_astromancer: {
    passive:{ dmgReduction:0.73, critChance:0.44, dodgeChance:0.26, atkBonus:0.68, leech:0.2, stunChance:0.28 },
    supportCount:9,
    atkInterval:940,
    instantCastChance:0.18,
    skills:[
      {name:'星潮裁定', icon:'🌠', desc:'21倍奥术伤害,沉默并虚弱', type:'dmg', mul:21, castTime:2.7, silence:2400, weaken:true},
      {name:'天幕折镜', icon:'🪞', desc:'21.5倍范围伤害,镜像错位并灵魂链接', type:'dmg', mul:21.5, castTime:3.8, aoe:true, mirror:true, soulLink:true},
      {name:'群星对焦', icon:'✨', desc:'获得护盾并提升攻击/攻速/减伤', type:'support', cd:16, castTime:2.6, shieldPct:0.3, atkBuffSecs:9, atkBuffPct:40, spdBuffSecs:9, spdBuffPct:36, drBuffSecs:9, drBuffPct:0.26},
      {name:'零点测距', icon:'🔭', desc:'22倍伤害,吸取资源并附加易爆', type:'dmg', mul:22, castTime:3.5, manaDrain:135, brittle:true, alwaysCrit:true},
      {name:'占相誓从', icon:'🔷', desc:'召唤3名棱镜誓从并提高暴击', type:'support', cd:19, castTime:3.2, summonCount:3, summonTheme:'construct', critBuffSecs:8, critBuffPct:42},
      {name:'群星归航', icon:'🌌', desc:'23倍范围伤害,恐惧并衰亡', type:'dmg', mul:23, castTime:4.9, aoe:true, fear:2400, decay2:true, silence:2400},
      {name:'仪轨封缚', icon:'📐', desc:'22.5倍伤害,残废并凋零', type:'dmg', mul:22.5, castTime:4.2, cripple:true, soulDrain:true, manaDrain:120},
      {name:'终末天象', icon:'🪐', desc:'25倍范围终局伤害', type:'dmg', mul:25, castTime:6.3, aoe:true, mirror:true, fear:2600, silence:2600, alwaysCrit:true, brittle:true}
    ]
  }
};
const RAID_EXTRA_BOSSES = {
  mc: [
    { name:'迦顿男爵', emoji:'🔥', passive:{critChance:0.18,dmgReduction:0.12,atkBonus:0.16},
      skills:[
        {name:'活体炸弹', icon:'💣', desc:'7倍火焰伤害', type:'dmg', mul:7, castTime:3, bomb:true, dot:true, brittle:true},
        {name:'地狱烈焰', icon:'🌋', desc:'8倍范围火焰伤害', type:'dmg', mul:8, castTime:4, aoe:true, dot:true, silence:1600},
      ] }
  ],
  bwl: [
    { name:'堕落的瓦拉斯塔兹', emoji:'🐉', passive:{critChance:0.22,dmgReduction:0.15,atkBonus:0.18},
      skills:[
        {name:'燃烧肾击', icon:'🩸', desc:'8倍伤害', type:'dmg', mul:8, castTime:3, bleed:true, dot:true, brittle:true},
        {name:'红龙吐息', icon:'🔥', desc:'9倍火焰伤害', type:'dmg', mul:9, castTime:3.5, dot:true, weaken:true, silence:1800},
        {name:'生命灼烧', icon:'☠️', desc:'8倍暗影火焰伤害', type:'dmg', mul:8, castTime:3, decay:true, dot:true}
      ] }
  ],
  naxx: [
    { name:'帕奇维克', emoji:'🪓', passive:{critChance:0.18,dmgReduction:0.22,atkBonus:0.24},
      skills:[
        {name:'憎恶重殴', icon:'🪓', desc:'9倍伤害', type:'dmg', mul:9, castTime:2.5, stun:1600, bleed:true, brittle:true},
        {name:'腐臭横扫', icon:'🦠', desc:'8倍范围伤害', type:'dmg', mul:8, castTime:3.5, aoe:true, plague:true, cripple:true},
      ] },
    { name:'萨菲隆', emoji:'🐉', passive:{critChance:0.22,dmgReduction:0.22,dodgeChance:0.12,atkBonus:0.18},
      skills:[
        {name:'冰霜吐息', icon:'❄️', desc:'9倍冰霜伤害', type:'dmg', mul:9, castTime:3.5, slow:true, freeze:1800, decay:true},
        {name:'寒冰爆裂', icon:'🧊', desc:'8倍范围伤害', type:'dmg', mul:8, castTime:4, aoe:true, freeze:1500, brittle:true},
        {name:'死亡严寒', icon:'🥶', desc:'9倍暗影冰霜伤害', type:'dmg', mul:9, castTime:4, weaken:true, decay2:true, manaDrain:50}
      ] }
  ],
  sunwell: [
    { name:'艾瑞达双子', emoji:'👯', passive:{critChance:0.24,dmgReduction:0.18,dodgeChance:0.1,atkBonus:0.18},
      skills:[
        {name:'烈焰共鸣', icon:'🔥', desc:'8倍火焰伤害', type:'dmg', mul:8, castTime:3, dot:true, silence:1800, brittle:true},
        {name:'暗影缠结', icon:'🌑', desc:'8倍暗影伤害', type:'dmg', mul:8, castTime:3, weaken:true, fear:1800, soulLink:true},
        {name:'双子爆裂', icon:'💥', desc:'9倍范围伤害', type:'dmg', mul:9, castTime:4, aoe:true, dot:true, manaDrain:60}
      ] }
  ],
  ulduar: [
    { name:'芙蕾雅', emoji:'🌿', passive:{critChance:0.2,dmgReduction:0.18,dodgeChance:0.12},
      skills:[
        {name:'荆棘缠绕', icon:'🌿', desc:'8倍自然伤害', type:'dmg', mul:8, castTime:3, cripple:true, decay:true},
        {name:'生命凋零', icon:'🍄', desc:'8倍自然伤害', type:'dmg', mul:8, castTime:3.5, plague:true, decay2:true},
        {name:'古树震击', icon:'🌳', desc:'9倍范围伤害', type:'dmg', mul:9, castTime:4, aoe:true, stun:1500, weaken:true}
      ] }
  ],
  ruby: [
    { name:'扎里斯利安将军', emoji:'🐲', passive:{critChance:0.2,dmgReduction:0.18,atkBonus:0.2},
      skills:[
        {name:'暮光战吼', icon:'🌗', desc:'8倍伤害', type:'dmg', mul:8, castTime:3, weaken:true, revenge:true},
        {name:'暮光冲锋', icon:'💨', desc:'9倍伤害', type:'dmg', mul:9, castTime:3.5, stun:1500, bleed:true, brittle:true},
        {name:'龙炎斩', icon:'🔥', desc:'9倍火焰伤害', type:'dmg', mul:9, castTime:3.5, dot:true, silence:1800}
      ] }
  ],
  icc: [
    { name:'鲜血女王兰娜瑟尔', emoji:'🩸', passive:{critChance:0.26,dmgReduction:0.2,dodgeChance:0.12,atkBonus:0.22,leech:0.15},
      skills:[
        {name:'鲜血镜像', icon:'🪞', desc:'9倍暗影伤害', type:'dmg', mul:9, castTime:3, mirror:true, weaken:true, soulLink:true},
        {name:'血色狂宴', icon:'🩸', desc:'10倍范围伤害', type:'dmg', mul:10, castTime:4, aoe:true, bleed:true, frenzy:true},
        {name:'女王之咬', icon:'🧛', desc:'9倍伤害', type:'dmg', mul:9, castTime:3.5, soulDrain:true, fear:1800, bleed:true}
      ] }
  ]
};
const GENERATED_BOSS_SKILLS = {
  fire: [
    {name:'烈焰吐息', icon:'🔥', desc:'7倍火焰伤害', type:'dmg', mul:7, castTime:3, dot:true},
    {name:'熔火爆裂', icon:'🌋', desc:'8倍伤害', type:'dmg', mul:8, castTime:3.5, brittle:true},
    {name:'火雨倾泻', icon:'☄️', desc:'8倍范围伤害', type:'dmg', mul:8, castTime:4, aoe:true, dot:true},
    {name:'灼烧烙印', icon:'🔥', desc:'7倍暗焰伤害', type:'dmg', mul:7, castTime:3, silence:1600}
  ],
  frost: [
    {name:'极寒冲击', icon:'❄️', desc:'7倍冰霜伤害', type:'dmg', mul:7, castTime:3, slow:true},
    {name:'冰墓封印', icon:'🧊', desc:'8倍伤害', type:'dmg', mul:8, castTime:3.5, freeze:1500},
    {name:'霜暴', icon:'🌨️', desc:'8倍范围伤害', type:'dmg', mul:8, castTime:4, aoe:true, slow:true},
    {name:'寒魂凋零', icon:'🥶', desc:'8倍冰霜暗影伤害', type:'dmg', mul:8, castTime:3.5, decay:true}
  ],
  shadow: [
    {name:'暗影收割', icon:'🌑', desc:'7倍暗影伤害', type:'dmg', mul:7, castTime:3, weaken:true},
    {name:'恐惧尖啸', icon:'👻', desc:'7倍伤害', type:'dmg', mul:7, castTime:3, fear:1800},
    {name:'灵魂枷锁', icon:'🔗', desc:'8倍暗影伤害', type:'dmg', mul:8, castTime:3.5, soulLink:true, decay:true},
    {name:'虚空崩解', icon:'🌀', desc:'8倍范围伤害', type:'dmg', mul:8, castTime:4, aoe:true, manaDrain:50}
  ],
  poison: [
    {name:'腐毒撕咬', icon:'🦠', desc:'7倍伤害', type:'dmg', mul:7, castTime:3, dot:true, plague:true},
    {name:'毒针穿刺', icon:'🪡', desc:'7倍伤害', type:'dmg', mul:7, castTime:3, cripple:true, dot:true},
    {name:'腐化喷吐', icon:'🐍', desc:'8倍范围伤害', type:'dmg', mul:8, castTime:4, aoe:true, dot:true, decay:true}
  ],
  storm: [
    {name:'雷霆轰击', icon:'⚡', desc:'7倍自然伤害', type:'dmg', mul:7, castTime:3, stun:1400},
    {name:'静电灼烧', icon:'🌩️', desc:'8倍伤害', type:'dmg', mul:8, castTime:3.5, manaDrain:45, silence:1600},
    {name:'风暴新星', icon:'⛈️', desc:'8倍范围伤害', type:'dmg', mul:8, castTime:4, aoe:true, stun:1200, weaken:true}
  ],
  nature: [
    {name:'根须缠绕', icon:'🌿', desc:'7倍自然伤害', type:'dmg', mul:7, castTime:3, cripple:true},
    {name:'孢子腐蚀', icon:'🍄', desc:'7倍伤害', type:'dmg', mul:7, castTime:3.5, plague:true, decay:true},
    {name:'自然震荡', icon:'🌳', desc:'8倍范围伤害', type:'dmg', mul:8, castTime:4, aoe:true, weaken:true}
  ],
  dragon: [
    {name:'龙炎吐息', icon:'🐉', desc:'8倍火焰伤害', type:'dmg', mul:8, castTime:3, dot:true, weaken:true},
    {name:'巨尾横扫', icon:'🪽', desc:'8倍范围伤害', type:'dmg', mul:8, castTime:3.5, aoe:true, stun:1500},
    {name:'龙爪撕裂', icon:'🩸', desc:'8倍伤害', type:'dmg', mul:8, castTime:3, bleed:true, cripple:true},
    {name:'龙威压制', icon:'👁️', desc:'9倍伤害', type:'dmg', mul:9, castTime:4, fear:1800, brittle:true}
  ],
  arcane: [
    {name:'奥术震爆', icon:'✨', desc:'7倍奥术伤害', type:'dmg', mul:7, castTime:3, silence:1600},
    {name:'法力崩坏', icon:'💧', desc:'7倍伤害', type:'dmg', mul:7, castTime:3.5, manaDrain:50, weaken:true},
    {name:'虚空风暴', icon:'🌀', desc:'8倍范围伤害', type:'dmg', mul:8, castTime:4, aoe:true, mirror:true, silence:2000}
  ],
  brute: [
    {name:'粉碎重殴', icon:'🔨', desc:'7倍伤害', type:'dmg', mul:7, castTime:3, stun:1300, brittle:true},
    {name:'裂骨打击', icon:'🪓', desc:'8倍伤害', type:'dmg', mul:8, castTime:3.5, bleed:true, weaken:true},
    {name:'践踏震击', icon:'🌍', desc:'8倍范围伤害', type:'dmg', mul:8, castTime:4, aoe:true, stun:1000, cripple:true}
  ]
};
const BOSS_SIGNATURE_SKILL_KITS = {
  fire: [
    { suffix:'熔核裁决', icon:'🔥', desc:'火焰伤害并灼烧', mul:7.4, castTime:3.0, dot:true, brittle:true },
    { suffix:'灰烬审判', icon:'🌋', desc:'范围火焰伤害', mul:8.1, castTime:3.6, aoe:true, dot:true },
    { suffix:'烈焰烙印', icon:'☄️', desc:'火焰伤害并沉默', mul:7.8, castTime:3.2, silence:1700, weaken:true },
    { suffix:'焚世回响', icon:'🔥', desc:'高危火焰爆发', mul:8.8, castTime:4.0, aoe:true, alwaysCrit:true },
  ],
  frost: [
    { suffix:'冰墓裁决', icon:'🧊', desc:'冰霜伤害并冻结', mul:7.4, castTime:3.0, freeze:1500 },
    { suffix:'寒潮裂隙', icon:'❄️', desc:'冰霜伤害并减速', mul:7.8, castTime:3.2, slow:true, brittle:true },
    { suffix:'霜魂风暴', icon:'🌨️', desc:'范围冰霜伤害', mul:8.2, castTime:3.8, aoe:true, slow:true },
    { suffix:'凛冬终结', icon:'🥶', desc:'高危冰霜暗影伤害', mul:8.8, castTime:4.0, decay:true, freeze:1200 },
  ],
  shadow: [
    { suffix:'暗影裁决', icon:'🌑', desc:'暗影伤害并虚弱', mul:7.5, castTime:3.0, weaken:true },
    { suffix:'灵魂裂隙', icon:'🔗', desc:'暗影伤害并链接灵魂', mul:8.0, castTime:3.4, soulLink:true, decay:true },
    { suffix:'恐惧回响', icon:'👻', desc:'范围暗影伤害并恐惧', mul:8.1, castTime:3.8, aoe:true, fear:1700 },
    { suffix:'虚无吞噬', icon:'🌀', desc:'高危暗影爆发', mul:8.9, castTime:4.0, manaDrain:55, decay2:true },
  ],
  poison: [
    { suffix:'腐毒裁决', icon:'🦠', desc:'自然伤害并感染', mul:7.4, castTime:3.0, dot:true, plague:true },
    { suffix:'毒脉穿刺', icon:'🪡', desc:'毒性伤害并致残', mul:7.8, castTime:3.2, cripple:true, dot:true },
    { suffix:'腐化喷涌', icon:'🐍', desc:'范围毒性伤害', mul:8.2, castTime:3.8, aoe:true, decay:true, plague:true },
    { suffix:'疫病爆发', icon:'☣️', desc:'高危疫病伤害', mul:8.8, castTime:4.0, plague:true, weaken:true },
  ],
  storm: [
    { suffix:'雷霆裁决', icon:'⚡', desc:'自然伤害并晕眩', mul:7.4, castTime:3.0, stun:1300 },
    { suffix:'静电裂解', icon:'🌩️', desc:'风暴伤害并沉默', mul:7.9, castTime:3.3, silence:1700, manaDrain:45 },
    { suffix:'风暴新星', icon:'⛈️', desc:'范围风暴伤害', mul:8.3, castTime:3.8, aoe:true, weaken:true },
    { suffix:'天雷终局', icon:'⚡', desc:'高危雷霆爆发', mul:8.9, castTime:4.0, stun:1200, alwaysCrit:true },
  ],
  nature: [
    { suffix:'根须裁决', icon:'🌿', desc:'自然伤害并致残', mul:7.3, castTime:3.0, cripple:true },
    { suffix:'孢子爆裂', icon:'🍄', desc:'自然伤害并腐蚀', mul:7.8, castTime:3.3, plague:true, decay:true },
    { suffix:'野性震荡', icon:'🌳', desc:'范围自然伤害', mul:8.2, castTime:3.8, aoe:true, weaken:true },
    { suffix:'生命凋零', icon:'🥀', desc:'高危自然暗影伤害', mul:8.8, castTime:4.0, decay2:true, dot:true },
  ],
  dragon: [
    { suffix:'龙息裁决', icon:'🐉', desc:'龙焰伤害并灼烧', mul:7.8, castTime:3.0, dot:true, weaken:true },
    { suffix:'巨尾碾压', icon:'🪽', desc:'范围物理伤害', mul:8.2, castTime:3.5, aoe:true, stun:1400 },
    { suffix:'龙爪撕裂', icon:'🩸', desc:'物理伤害并流血', mul:8.0, castTime:3.2, bleed:true, cripple:true },
    { suffix:'龙威终结', icon:'👁️', desc:'高危龙威伤害', mul:9.0, castTime:4.0, fear:1800, brittle:true },
  ],
  arcane: [
    { suffix:'奥术裁决', icon:'✨', desc:'奥术伤害并沉默', mul:7.4, castTime:3.0, silence:1600 },
    { suffix:'法力裂解', icon:'💧', desc:'奥术伤害并燃烧法力', mul:7.8, castTime:3.4, manaDrain:55, weaken:true },
    { suffix:'虚空矩阵', icon:'🌀', desc:'范围奥术伤害', mul:8.2, castTime:3.8, aoe:true, mirror:true },
    { suffix:'星界崩塌', icon:'🌌', desc:'高危奥术爆发', mul:8.8, castTime:4.0, silence:2000, brittle:true },
  ],
  brute: [
    { suffix:'裂骨裁决', icon:'🪓', desc:'重击并流血', mul:7.4, castTime:3.0, bleed:true, weaken:true },
    { suffix:'战槌震荡', icon:'🔨', desc:'重击并晕眩', mul:7.9, castTime:3.3, stun:1300, brittle:true },
    { suffix:'践踏冲击', icon:'🌍', desc:'范围物理伤害', mul:8.2, castTime:3.8, aoe:true, cripple:true },
    { suffix:'破甲终结', icon:'💥', desc:'高危破甲伤害', mul:8.8, castTime:4.0, sunder:true, alwaysCrit:true },
  ],
};
const BOSS_CANONICAL_SKILL_NAMES = {
  鲁西弗隆:['鲁西弗隆的诅咒','暗影震击','末日降临','统御之言','暗影冲击','末日诅咒'],
  玛格曼达:['恐慌','熔岩喷溅','狂乱','火焰吐息','熔岩炸弹','熔火护甲'],
  基赫纳斯:['基赫纳斯的诅咒','火焰之雨','暗影箭','熔岩护盾','烈焰冲击','火焰新星'],
  加尔:['反魔法脉冲','大地震颤','岩浆镣铐','岩石投掷','地震','岩浆爆发'],
  迦顿男爵:['活体炸弹','地狱火','法力燃烧','熔岩爆裂','爆燃','烈焰之环'],
  拉格纳罗斯:['萨弗拉斯之击','熔岩爆裂','岩浆喷发','元素火焰','熔岩冲击','火焰之子','炎魔之怒','烈焰喷发'],
  狂野的拉佐格尔:['烈焰吐息','战争践踏','火球术','龙人打击','控制宝珠','扫尾'],
  勒什雷尔:['暗影烈焰','冲击波','致死打击','龙翼打击','狂乱','震荡猛击'],
  克洛玛古斯:['龙血之痛','点燃躯体','时间流逝','冰霜灼烧','腐蚀酸液','多彩吐息'],
  堕落的瓦拉斯塔兹:['燃烧刺激','火焰新星','顺劈斩','烈焰吐息','红龙精华','生命灼烧'],
  奈法利安:['暗影烈焰','龙族召唤','暗影箭雨','恐惧咆哮','群体暗影箭','奈法利安之怒','黑龙之息','暗影烈焰吐息'],
  阿努布雷坎:['穿刺','腐肉虫群','虫群风暴','召唤地穴卫士','地穴甲壳','酸液喷溅'],
  瘟疫使者诺斯:['瘟疫使者的诅咒','闪现','召唤骷髅','瘟疫','亡者诅咒','暗影震击'],
  肮脏的希尔盖:['喷涌','疾病之云','法术干扰','腐烂','天灾之握','瘟疫爆发'],
  塔迪乌斯:['极性转换','闪电链','球状闪电','电荷过载','雷霆震击','能量涌动'],
  帕奇维克:['仇恨打击','狂暴','憎恶重殴','腐臭横扫','碾压','撕裂重击'],
  萨菲隆:['冰霜光环','生命吸取','寒冰箭雨','冰霜吐息','寒冰爆裂','死亡严寒'],
  克尔苏加德:['冰霜冲击','暗影裂隙','寒冰箭','法力爆炸','寒冰皇冠守护者','亡者大军','巫妖之怒','冰霜爆破'],
  午夜:['冲锋','暗影践踏','击倒','马蹄践踏','狂野奔袭','暗影冲击'],
  猎手阿图门:['暗影顺劈','无形诅咒','暗影冲锋','缴械','诅咒','骑乘冲锋'],
  莫罗斯:['锁喉','致盲','凿击','消失','致残打击','暗杀'],
  馆长:['奥术弹幕','唤醒','仇恨箭','能量过载','电弧','奥术爆发'],
  麦迪文:['奥术飞弹','火焰之雨','变形术','乌鸦形态','奥术弹幕','魔爆术'],
  玛克扎尔王子:['暗影新星','地狱火','魔能灌注','暗言术:痛','恐惧','军团之怒','灵魂震击','暗影震荡'],
  卡雷苟斯:['奥术打击','冰霜吐息','狂野魔法','奥术吐息','冰霜之触','法力灌注'],
  布鲁塔卢斯:['流星猛击','燃烧','践踏','顺劈斩','陨石打击','灼热创伤'],
  穆鲁:['负能量','黑暗','暗影脉冲','熵','暗影之怒','虚空哨兵'],
  艾瑞达双子:['暗影之刃','烈焰灼烧','暗影新星','烈焰共鸣','暗影缠结','双子爆裂'],
  基尔加丹:['灵魂鞭笞','火焰之花','军团闪电','末日决战','欺诈者之触','末日火雨','黑暗','千魂之暗'],
  烈焰巨兽:['火焰喷射','导弹弹幕','烈焰喷射器','炮击','焦油','攻城撞击'],
  'XT-002拆解者':['灼热之光','重力炸弹','鼓膜破裂','心脏暴露','拆解','地震践踏'],
  钢铁议会:['闪电链','过载','熔化护甲','符文打击','静电瓦解','风暴之锤'],
  维扎克斯将军:['暗影撞击','灼热烈焰','黑暗涌动','无面者印记','无面者之怒','虚空'],
  芙蕾雅:['日光术','自然之怒','生命束缚','荆棘缠绕','生命凋零','古树震击'],
  '尤格-萨隆':['理智之触','精神鞭笞','疯狂凝视','暗影信标','疯狂','千喉之兽','尤格萨隆之影','疯狂诱导'],
  '暮光龙·萨维安娜':['烈焰吐息','燃烧印记','飞扑','火焰之息','龙翼打击','暮光吐息'],
  巴尔萨鲁斯:['暮光之刃','分裂','暗影烈焰','暮光之息','暮光屏障','暮光切割'],
  扎里斯利安将军:['破甲顺劈','恐吓怒吼','召唤暮光传送门','暮光战吼','暮光冲锋','龙炎斩'],
  海里昂:['暮光切割','流星打击','燃烧印记','灵魂吞噬','虚空之息','暮光毁灭','暮光领域','暮光脉动'],
  玛洛加尔领主:['骨刺坟墓','白骨风暴','冷焰','军刀猛刺','骨刺','白骨旋风'],
  死亡使者萨鲁法尔:['沸血','血魄符文','堕落勇士印记','血兽','鲜血之力','死亡之握'],
  普崔塞德教授:['不稳定的软泥怪','延展黏液','窒息毒气弹','突变瘟疫','瘟疫爆发','突变'],
  辛达苟萨:['冰霜吐息','冰霜信标','冰霜炸弹','寒冰坟墓','冰冷之握','秘法连击'],
  鲜血女王兰娜瑟尔:['鲜血镜像','黑暗堕落契约','暮光血箭','蜂拥之影','血色狂宴','女王之咬'],
  巫妖王:['霜之哀伤','污染','灵魂收割','冷酷严冬','召唤瓦格里','亡者大军','巫妖王之怒','收割灵魂'],
  预言者斯克拉姆:['奥术爆炸','心灵控制','大地震击','闪现','心智震爆','幻象分身'],
  战争守卫沙尔图拉:['旋风斩','击倒','顺劈斩','锋刃狂舞','破甲攻击','狂怒'],
  顽强的范克瑞斯:['召唤虫群','致死伤口','沙尘喷吐','沙尘毒刺','毒性冲锋','虫群吞噬'],
  双子皇帝:['治疗兄弟','暗影箭暴','奥术爆炸','上钩拳','皇权共鸣','其拉斩决'],
  克苏恩:['眼棱','黑暗闪耀','巨眼触须','胃酸','湮灭视线','古神腹鸣','疯狂低语','巨眼凝视'],
  不稳定的海度斯:['水之墓','不稳定之毒','水箭齐射','冰霜震击','净化光环','毒性震击'],
  盲眼者莱欧瑟拉斯:['旋风斩','混乱冲击','内心恶魔','恶魔形态','致命投掷','盲眼怒火'],
  深水领主卡拉瑟雷斯:['灾难之箭','多重射击','治疗波','潮汐涌动','深水之墓','水箭齐射'],
  瓦丝琪:['射击','多重射击','静电充能','叉状闪电','毒性孢子','盘牙召唤','多重射击齐射'],
  空灵机甲:['奥术宝珠','重击','击退','奥术过载','虚空震击','能量喷射'],
  奥:['烈焰打击','火焰羽毛','重生','流星','凤凰烈焰','俯冲'],
  大星术师索兰莉安:['奥术飞弹','星术师之怒','星界传送','奥术爆炸','群星坍缩','虚空星辰'],
  凯尔萨斯·逐日者:['炎爆术','奥术扰乱','烈焰风暴','心灵控制','凤凰重生','引力失效','震爆'],
  '雷基·冬寒':['死亡凋零','冰霜新星','冰箭','寒冰箭雨','凛冬寒风','巫妖之触'],
  安纳塞隆:['腐臭蜂群','催眠','吸血光环','地狱火','腐臭撕咬','恐惧'],
  阿兹加洛:['厄运','顺劈斩','沉默','火焰之雨','军团之怒','末日守卫'],
  阿克蒙德:['空气爆裂','毁灭之火','恐惧','灵魂充能','死亡之指','末日烈焰','军团之握'],
  高阶督军纳因图斯:['穿刺之脊','潮汐之盾','针刺之雨','海潮冲击','破浪斩','深海投掷'],
  灵魂之匣:['灵魂震击','灵魂尖啸','怨恨','欲望之触','痛苦之怒','灵魂消耗'],
  莎赫拉丝主母:['致命吸引','军刀猛刺','沉默尖啸','光束','暗影之拥','魅惑'],
  伊利达雷议会:['奉献','暴风雪','烈焰风暴','治疗之环','审判','毒药瓶'],
  伊利丹·怒风:['剪切','烈焰冲撞','暗影魔','眼棱','恶魔变形','埃辛诺斯之焰','背叛者之怒'],
  贝丝缇拉克:['流星燃烧','烬网喷吐','燃烧酸液','寡妇之吻','熔火蛛网','灰烬毒液'],
  熔岩之王莱奥利斯:['震荡践踏','火山喷发','熔岩流','践踏','熔岩护甲','黑曜猛击'],
  巴尔洛戈斯:['折磨','水晶碎片','地狱火刃','烈焰之刃','倒计时','灭火'],
  炎鹰阿莱索德:['火焰风暴','炽热爪击','烈焰之羽','燃烧之爪','火焰旋风','飞掠'],
  赞达拉守卫贾林:['穿刺长矛','沙尘旋风','野蛮冲锋','赞达拉战吼','长矛投掷','裂伤'],
  风暴祭司莱杉:['闪电风暴','电弧闪电','雷霆震击','静电冲击','风暴图腾','导电水域'],
  三头巨龙米伽拉:['冰霜吐息','烈焰吐息','毒性吐息','狂乱','剧毒撕咬','冰封之头'],
  织雾者吉安娜:['寒冰箭','冰霜之环','寒冰屏障','暴风雪','水元素','深度冻结'],
  雷电之王雷神:['雷霆打击','静电震击','闪电鞭笞','斩首','超载','雷神之怒','导电能量'],
  晨曦荒野之莫戈尔:['腐蚀践踏','黑血爆发','大地裂变','暮光碾压','腐蚀之血','暗影践踏'],
  亡语者:['虚空箭','暗影新星','暮光腐蚀','暮光召唤','暗言术:灭','黑暗祷言'],
  死亡之翼背脊:['熔岩之触','灼热血浆','翻滚','爆裂触须','炽热之握','肌腱撕裂'],
  瓦里奥那与塞拉图斯:['暮光吐息','黑暗昏迷','吞噬魔法','昏天暗地','双龙俯冲','暮光流星'],
  死亡之翼·灭世者:['大灾变','元素箭','源质箭','灼热血浆','大决战','灭世烈焰','死亡之翼之怒','源质灾变'],
  不洁之溢:['腐蚀喷吐','不洁爆发','污染之池','腐化之触','暗影喷涌','恶臭扩散'],
  傲慢之煞:['傲慢爆发','自负','腐蚀牢笼','傲慢之击','膨胀的傲慢','腐化投射'],
  钢铁巨像:['震荡波','迫击炮弹幕','激光灼烧','焦油爆裂','钢铁践踏','爆破冲击'],
  达克沙将军:['战歌','旋风斩','破甲猛击','地狱咆哮之怒','战旗','毁灭打击'],
  克拉希克综合体:['虫群指令','琥珀爆炸','音波共振','剧毒注射','寄生虫','甲壳硬化'],
  加尔鲁什·地狱咆哮:['亵渎','旋风斩','亚煞极之触','钢铁之星','强化腐蚀','地狱咆哮之怒','绝望之握'],
  钢铁掠袭者:['炮火','闪电冲刺','火炮弹幕','燃烧弹','毁灭冲击','空中阶段'],
  寇莫克:['猛击','爆裂符文','邪能喷发','攫取之手','暗影能量','跃击'],
  死眼基洛格:['死亡幻象','撕裂嚎叫','心脏打击','血液飞溅','邪能腐蚀','死亡凝视'],
  邪能领主扎昆:['裂魂','毁灭之种','重砍','邪能水晶','污染之斧','灵魂裂隙'],
  玛诺洛斯:['邪能地狱火','暗影之力','末日印记','凝视','军团召唤','巨刃连击'],
  戈罗斯:['碎裂星辰','地狱火尖刺','熔火护甲','灼烧护甲','燃烧之雨','地狱火冲撞'],
  恶魔审判官:['痛苦折磨','骨锯','暗影箭','折磨爆发','审判凝视','邪能喷射'],
  莎萨拉恩女勋爵:['深渊之拥','鱼叉','水花飞溅','召唤海潮','静电新星','海妖之歌'],
  守护之少女:['净化协议','光明回响','神圣之锤','灌注','护盾爆炸','清算'],
  堕落的萨格拉斯化身:['混乱之刃','破裂现实','暗影之刃','毁灭之触','堕落之触','末日裂隙'],
  加洛希世界破坏者:['屠戮','歼灭','毁灭者','炮击模式','邪能轰炸','世界破坏者'],
  萨格拉斯的地狱犬:['灼热撕咬','暗影撕咬','吞噬领域','熔火之触','阴燃腐蚀','双犬扑击'],
  灵魂猎手伊莫纳:['催眠毒气','脉冲手雷','震荡榴弹','追踪导弹','裂片爆炸','电击陷阱'],
  金加洛斯:['歼灭协议','屠戮者','锻造打击','毁灭者协议','构造体激活','邪能轰击'],
  阿格拉玛:['泰沙拉克之焰','烈焰撕裂','烈焰风暴','灼热风暴','炽热之刃','熔火之击'],
  寂灭者阿古斯:['灵魂炸弹','死亡之雾','天界之赐','宇宙射线','星辰陨落','世界终结','寂灭之镰','万物终结'],
  魔血之触:['腐血爆发','血液腐蚀','感染撕咬','腐化之触','血疫喷吐','沸腾之血'],
  垫脚石:['崩解践踏','岩石碎裂','石化凝视','碎地重击','构造冲击','地震波'],
  禁锢者泽克伏斯:['腐化注入','虚空箭','泰坦火花','眼棱','异种虫群','腐蚀新星'],
  米斯拉克斯:['湮灭之球','精华碎裂','虚空回响','湮灭之沙','黑暗裂隙','虚空冲击'],
  恐惧之臂沃舒:['精神腐蚀','恐惧之握','暗影触须','腐化猛击','心智撕裂','黑暗低语'],
  戈霍恩:['腐化之血','爆发囊肿','恶性生长','腐败浪潮','古神低语','血之盛宴','终极腐化','腐化爆发'],
  尼提兹:['梦魇之茧','腐蚀之网','剧毒喷吐','暗影爆发','蛛网缠绕','梦魇毒液'],
  噩梦巨龙:['腐蚀吐息','梦魇花粉','沉睡之雾','龙息','梦魇印记','腐蚀梦境'],
  乌索克之灵:['压倒性冲击','专注凝视','撕裂血肉','狂怒撕咬','践踏','咆哮'],
  梦魇之龙伊瑟拉:['堕落之梦','翡翠吐息','梦境腐蚀','梦魇绽放','龙息','梦境撕裂'],
  萨维斯:['梦魇之刃','黑化灵魂','腐蚀新星','梦魇大军','腐化之握','恐惧幻象','梦魇之力'],
  蝎钳魔:['破甲钳击','奥术猛击','毒性几丁质','蝎尾扫击','水晶碎片','毒刺'],
  提克迪奥斯:['腐肉瘟疫','吸血光环','暗夜之牙','黏液喷涌','邪能虫群','腐臭之血'],
  占星师埃塔莉丝:['群星坍缩','星界冲击','大爆炸','星座碎片','星辰新星','重力牵引'],
  克罗苏斯:['燃烧践踏','毁灭之球','灼热烙印','邪能光束','烈焰崩塌','破桥猛击'],
  大魔导师艾利桑德:['时光消逝','递归元素','时光炸弹','奥术宝珠','时间停止','时光加速'],
  古尔丹:['邪能风暴','古尔丹之眼','邪能镰刀','灵魂虹吸','虚空降临','湮灭风暴','恶魔变身'],
  黑龙王子拉希奥:['灼热气息','烈焰之翼','裂地尾击','腐化烈焰','黑龙之怒','燃烧护甲'],
  先知斯基特拉:['幻象箭雨','撕裂心智','幻影投射','心灵震爆','暗影冲击','幻象分身'],
  暗影审讯官沙奈什:['心智折磨','虚空仪式','灵魂剥离','暗影鞭笞','痛苦之环','黑暗审讯'],
  沙德拉:['腐化吐息','毒性喷吐','蛛网爆发','暗影吐息','毒云','腐化撕咬'],
  维克希翁:['湮灭之翼','腐化俯冲','暗影烈焰','暮光毁灭','腐蚀吐息','黑暗利爪'],
  恩佐斯:['妄念','痛苦之握','收割思想','虚空凝视','万物归虚','古神低语','终末低语'],
  尖啸之翼:['回声尖啸','刺耳尖啸','声波脉冲','黑暗俯冲','鲜血撕咬','声纳尖啸'],
  猎手阿尔提莫:['猎犬撕咬','罪孽箭','撕裂射击','狩猎标记','猎手之眼','掠食冲锋'],
  噬渴灭世者:['饥渴吞噬','精华虹吸','暴食冲锋','吞噬裂隙','饥渴猛击','能量喷涌'],
  达克文女勋爵:['血池献祭','圣罐爆裂','罪孽箭','血红刺击','心能之雨','血腥冲锋'],
  鲜血议会:['贵族夜宴','黑暗伴舞','血色狂宴','心能喷泉','舞会号令','吸血之咬'],
  主宰者德纳修斯:['罪碑之刃','毁灭痛苦','屠戮镜像','噬渊降临','湮灭之触','雷纳索尔之怒'],
  暗鳞军团:['深海齐射','水箭齐射','尖刺珊瑚','深渊冲击','黑水弹幕','纳迦战吼'],
  飘雾艾尔:['迷雾毒针','剧毒孢子','毒雾','水流喷射','深海之毒','潮汐毒液'],
  深渊指挥官西瓦拉:['寒潮冻结','剧毒标记','冰霜震击','绝对零度','冰毒交织','寒冰长矛'],
  黑暗预言者:['虚空低语','黑暗预言','暗影箭雨','梦魇幻象','虚空裂隙','黑暗启示'],
  深渊领主:['深渊缠绕','水压猛击','深海碾压','潮汐波','暗流冲击','深渊之握'],
  阿兹莎拉女王:['奥术震爆','女王法令','奥术易伤','女王魔咒','深渊洪流','星辰之怒'],
  卡赞:['奥术湮灭','奥术宝珠','魔网爆发','奥术撕裂','法力涌动','虚空回响'],
  焚化者拉什卡尔:['熔火喷涌','烈焰风暴','燃烧之矛','熔岩爆裂','火焰新星','焚化'],
  鲜血法师沙拉嘎:['血肉重塑','鲜血箭','血之新星','猩红仪式','血液虹吸','血肉爆裂'],
  禁锢魔像:['崩解打击','禁锢射线','碎裂护甲','构造践踏','奥术束缚','禁锢冲击'],
  黑龙萨拉塔斯:['暗影烈焰','黑龙吐息','暗影裂隙','腐化利爪','暮光灼烧','黑龙之怒'],
  化身奈萨里奥:['熔岩崩裂','暗影虹吸','湮灭烈焰','裂地猛击','黑龙烈焰','奈萨里奥之怒'],
  古加冯:['远古践踏','尖刺冲锋','巨角猛击','裂地践踏','狂暴践踏','野性冲撞'],
  史矛莱什:['腐化吐息','剧毒之云','酸液喷吐','腐烂撕咬','毒性爆裂','感染毒液'],
  拉莎农:['烈风箭雨','风暴俯冲','电荷吐息','风暴之翼','雷云爆发','迅翼冲锋'],
  织焰巫女:['梦火灼烧','火焰之地','余烬箭','梦火新星','烈焰编织','灼热梦境'],
  暮光化身:['暗影裂解','暮光爆发','虚空撕裂','暮光新星','暗影之握','虚空灌注'],
  炎魔之王弗拉戈斯:['焚梦烈焰','世界树之殇','末日烈焰','熔火之怒','火焰之王的召唤','焚世烈焰'],
};
const BOSS_DEBUFF_KEYS = ['dot','slow','stun','weaken','sunder','silence','disarm','fear','freeze','cripple','decay','wither','manaDrain','bomb','plague','bleed','brittle','soulDrain','soulLink','revenge','frenzy','decay2','mirror'];
function bossDebuffCount(sk){
  return BOSS_DEBUFF_KEYS.reduce((sum, key)=>sum + (sk && sk[key] ? 1 : 0), 0);
}
function inferBossTheme(name, sk){
  const text = `${name||''} ${sk?.name||''} ${sk?.icon||''}`;
  if(/火|焰|熔|炎|爆|拉格纳罗斯|烈焰/.test(text)) return 'fire';
  if(/冰|霜|寒|冻|辛达苟萨|萨菲隆/.test(text)) return 'frost';
  if(/毒|瘟|蝎|蛇|腐|孢/.test(text)) return 'poison';
  if(/雷|电|风暴|索林姆|洛肯/.test(text)) return 'storm';
  if(/龙|吐息|奥妮克希亚|奈法利安|萨维安娜|海里昂/.test(text)) return 'dragon';
  if(/奥术|法力|虚空|麦迪文|凯尔萨斯|馆长|摩摩尔/.test(text)) return 'arcane';
  if(/自然|根须|藤蔓|芙蕾雅|瑟莱德丝|瓦斯琪/.test(text)) return 'nature';
  if(/暗|影|亡|死|魂|暮光|巫妖|克尔苏加德|阿尔萨斯|尤格|克苏恩|卡扎克/.test(text)) return 'shadow';
  return 'brute';
}
/* BOSS 循环里的"读条强化"技:以"强化普通攻击"为主(增伤/攻速/普攻暴击/普攻追击),
   让 BOSS 进入可被打断的"狂暴窗口"时白字真正变痛——而不是一味套盾变肉。各主题风味不同。 */
const BOSS_ROTATION_SUPPORT_SKILLS = {
  fire:   { name:'焚身狂热', icon:'🔥', desc:'8秒内攻击+24%、攻速+18%', type:'support', castTime:2.4, cd:14, atkBuffSecs:8, atkBuffPct:24, spdBuffSecs:8, spdBuffPct:18 },
  frost:  { name:'凛冬杀意', icon:'🧊', desc:'8秒内普攻暴击+28%、攻击+18%', type:'support', castTime:2.4, cd:14, critBuffSecs:8, critBuffPct:28, atkBuffSecs:8, atkBuffPct:18 },
  poison: { name:'狂躁毒液', icon:'🐍', desc:'8秒内攻速+26%,接下来2次普攻追击', type:'support', castTime:2.5, cd:15, spdBuffSecs:8, spdBuffPct:26, nextDouble:2 },
  storm:  { name:'风暴蓄能', icon:'⛈️', desc:'8秒内攻速+24%、普攻暴击+22%', type:'support', castTime:2.3, cd:14, spdBuffSecs:8, spdBuffPct:24, critBuffSecs:8, critBuffPct:22 },
  dragon: { name:'巨龙之怒', icon:'🐉', desc:'8秒内攻击+24%,接下来2次普攻追击', type:'support', castTime:2.6, cd:15, atkBuffSecs:8, atkBuffPct:24, nextDouble:2 },
  arcane: { name:'奥术超载', icon:'🌀', desc:'8秒内攻击+22%、普攻暴击+22%', type:'support', castTime:2.5, cd:15, atkBuffSecs:8, atkBuffPct:22, critBuffSecs:8, critBuffPct:22 },
  nature: { name:'野性爆发', icon:'🌿', desc:'8秒内攻击+22%、攻速+20%', type:'support', castTime:2.6, cd:15, atkBuffSecs:8, atkBuffPct:22, spdBuffSecs:8, spdBuffPct:20 },
  shadow: { name:'嗜血渴望', icon:'🌑', desc:'8秒内攻击+22%、吸血+16%', type:'support', castTime:2.6, cd:15, atkBuffSecs:8, atkBuffPct:22, leechBuffSecs:8, leechBuffPct:16 },
  brute:  { name:'战吼集结', icon:'📯', desc:'召唤1名援军并在8秒内攻击+22%', type:'support', castTime:2.5, cd:15, summonCount:1, summonTheme:'soldier', atkBuffSecs:8, atkBuffPct:22 },
};
function isBossSupportSkill(skill){
  return !!(skill && (skill.type === 'support' || skill.type === 'buff' || skill.type === 'summon' || skill.type === 'heal' ||
    skill.heal || skill.healPct || skill.shieldPct || skill.summonCount || skill.atkBuffSecs || skill.spdBuffSecs ||
    skill.defBuffSecs || skill.drBuffSecs || skill.critBuffSecs || skill.leechBuffSecs || skill.nextDouble));
}
function bossSignatureToken(name){
  const clean = String(name || '首领')
    .replace(/^[^\u4e00-\u9fa5A-Za-z]+/, '')
    .replace(/·.*/, '')
    .replace(/[,，].*/, '')
    .replace(/的化身|之影|之灵|大王|领主|将军|女王|王子|国王|酋长|督军|守卫者|守护者/g, '')
    .trim();
  return (clean || String(name || '首领')).slice(0, 6);
}
function bossCanonicalSkillNames(name){
  const raw = String(name || '');
  if(BOSS_CANONICAL_SKILL_NAMES[raw]) return BOSS_CANONICAL_SKILL_NAMES[raw];
  const clean = raw.replace(/^[^\u4e00-\u9fa5A-Za-z]+/, '').replace(/·.*/, '').trim();
  if(BOSS_CANONICAL_SKILL_NAMES[clean]) return BOSS_CANONICAL_SKILL_NAMES[clean];
  return [];
}
function bossCanonicalSkillName(name, idx, fallback){
  const names = bossCanonicalSkillNames(name);
  if(names.length) return names[idx % names.length];
  return fallback;
}
function bossUnusedCanonicalSkillName(name, usedNames, startIdx, fallback){
  const names = bossCanonicalSkillNames(name);
  const used = usedNames instanceof Set ? usedNames : new Set(usedNames || []);
  for(let i = 0; i < names.length; i++){
    const candidate = names[(startIdx + i) % names.length];
    if(!used.has(candidate)) return candidate;
  }
  return used.has(fallback) ? `${fallback}${Math.max(2, used.size + 1)}` : fallback;
}
function makeBossSignatureSkill(theme, bossName, idx, ctx){
  const kits = BOSS_SIGNATURE_SKILL_KITS[theme] || BOSS_SIGNATURE_SKILL_KITS.brute;
  const kit = kits[idx % kits.length];
  const scale = Math.floor(idx / kits.length);
  const out = Object.assign({}, kit, {
    name: bossCanonicalSkillName(bossName, idx, kit.suffix),
    type: 'dmg',
    mul: +(kit.mul + Math.min(1.2, scale * 0.35) + ((ctx.lvl || 1) >= 70 ? 0.6 : ((ctx.lvl || 1) >= 40 ? 0.3 : 0))).toFixed(1),
  });
  return out;
}
function addBossPassiveTrick(boss, trick){
  if(!boss || !trick) return;
  boss.passive = Object.assign({}, boss.passive || {});
  const list = Array.isArray(boss.passive.tricks) ? boss.passive.tricks.slice() : [];
  const passiveTrick = Object.assign({}, trick, { passiveTrigger:true });
  delete passiveTrick.castTime;
  passiveTrick.cd = passiveTrick.cd || 14;
  if(!list.some(x => x.name === passiveTrick.name)) list.push(passiveTrick);
  boss.passive.tricks = list;
}
function moveBossSupportSkillsToPassive(boss){
  if(!boss || !Array.isArray(boss.skills)) return;
  const kept = [];
  for(const sk of boss.skills){
    if(isBossSupportSkill(sk)) addBossPassiveTrick(boss, sk);
    else kept.push(sk);
  }
  boss.skills = kept;
}
/* 各档位 boss 想要的"辅助读条技"数量(召唤/buff/治疗 的多样性) */
function bossSupportVariety(ctx){
  if(ctx.kind === 'raid') return ctx.final ? 3 : 2;
  if(ctx.kind === 'world') return (ctx.lvl || 1) >= 70 ? 3 : 2;
  if(ctx.kind === 'dungeon') return ctx.final ? 2 : 1;
  if(ctx.kind === 'map') return (ctx.final && (ctx.lvl || 1) >= 50) ? 2 : 1;
  return 1;
}
/* 生成专属的被动辅助技:召唤 / buff / 治疗(挂到 passive.tricks,不占 BOSS 读条技能栏) */
function makeBossPassiveSkill(type, theme, ctx){
  const strong = (ctx.lvl || 1) >= 70 || ctx.final;
  if(type === 'summon') return { name:bossCanonicalSkillName(ctx.name, 5, '召唤援军'), icon:'📯', type:'summon', desc:'被动召唤援军助战', cd:18, summonCount: strong ? 2 : 1, summonTheme:bossSummonThemeFor({ name:ctx.name, skills:[{ name:theme }] }) };
  if(type === 'heal')   return { name:bossCanonicalSkillName(ctx.name, 4, '生命回涌'), icon:'💚', type:'heal', desc:'被动恢复生命', cd:17, healPct: strong ? 0.12 : 0.08 };
  const buffKits = [
    { name:bossCanonicalSkillName(ctx.name, 3, '狂怒'), icon:'💢', type:'buff', desc:'被动强化攻击与攻速', cd:16, atkBuffSecs:8, atkBuffPct: strong ? 28 : 20, spdBuffSecs:8, spdBuffPct: strong ? 18 : 12 },
    { name:bossCanonicalSkillName(ctx.name, 2, '致命专注'), icon:'🎯', type:'buff', desc:'被动提高普攻暴击', cd:16, critBuffSecs:8, critBuffPct: strong ? 35 : 24, atkBuffSecs:8, atkBuffPct: strong ? 16 : 10 },
    { name:bossCanonicalSkillName(ctx.name, 1, '连击姿态'), icon:'⚔️', type:'buff', desc:'被动让普攻追加打击', cd:17, nextDouble: strong ? 3 : 2, spdBuffSecs:6, spdBuffPct: strong ? 14 : 10 },
  ];
  return buffKits[((ctx.lvl || 1) + String(ctx.name || '').length) % buffKits.length];
}
function bossControlScore(skill){
  let score = 0;
  if(skill.stun) score += 2;
  if(skill.silence || skill.disarm) score += 2;
  if(skill.fear || skill.freeze) score += 2;
  if(skill.cripple || skill.weaken || skill.sunder) score += 1;
  if(skill.decay || skill.decay2 || skill.manaDrain) score += 1;
  return score;
}
function bossThreatScore(skill, ctx){
  let score = 0;
  if(isBossSupportSkill(skill)) score += 1;
  if((skill.mul || 0) >= 10) score += 3;
  else if((skill.mul || 0) >= 7) score += 2;
  else if((skill.mul || 0) >= 4) score += 1;
  if(skill.aoe) score += 1;
  if(skill.alwaysCrit) score += 1;
  score += Math.min(3, bossControlScore(skill));
  if(skill.healPct) score += skill.healPct >= 0.12 ? 2 : 1;
  if(skill.shieldPct) score += skill.shieldPct >= 0.14 ? 2 : 1;
  if(skill.summonCount) score += 2;
  if(skill.atkBuffSecs || skill.spdBuffSecs || skill.drBuffSecs || skill.defBuffSecs || skill.critBuffSecs || skill.leechBuffSecs) score += 1;
  if((ctx?.final || ctx?.kind === 'world') && (skill.castTime || 0) >= 3) score += 1;
  return score;
}
function bossThreatTier(skill, ctx){
  const score = bossThreatScore(skill, ctx);
  if(score >= 8) return 'extreme';
  if(score >= 6) return 'high';
  if(score >= 3) return 'medium';
  return 'low';
}
function bossDamageCap(ctx, skill){
  if(!skill || isBossSupportSkill(skill)) return null;
  if(ctx.kind === 'raid') return ctx.final ? 10.5 : 8.8;
  if(ctx.kind === 'world') return (ctx.lvl || 1) >= 80 ? 13.2 : ((ctx.lvl || 1) >= 70 ? 11.8 : ((ctx.lvl || 1) >= 55 ? 10.4 : 8.8));
  if(ctx.kind === 'map') return ctx.final ? 8.8 : 7.6;
  return ctx.final ? 7.9 : 6.9;
}
function ensureBossSkillDebuffs(sk, ctx){
  const skill = Object.assign({}, sk);
  const theme = inferBossTheme(ctx.name, skill);
  let need = ctx.kind === 'raid' ? 2 : 1;
  if(ctx.final) need += 1;
  if(ctx.kind === 'map' && (ctx.lvl||1) >= 60) need = Math.max(need, 2);
  if(skill.aoe || (skill.castTime||0) >= 4 || (skill.mul||0) >= 9) need += (ctx.kind === 'raid' ? 1 : 0);
  need = Math.min(need, ctx.kind === 'raid' ? 4 : 3);
  const pools = {
    fire: [['dot', true], ['brittle', true], ['silence', 1600], ['manaDrain', 40]],
    frost: [['slow', true], ['freeze', 1500], ['decay', true], ['brittle', true]],
    poison: [['dot', true], ['cripple', true], ['plague', true], ['decay', true]],
    storm: [['stun', 1400], ['manaDrain', 45], ['silence', 1800], ['weaken', true]],
    dragon: [['dot', true], ['weaken', true], ['stun', 1200], ['bleed', true]],
    arcane: [['silence', 1800], ['manaDrain', 50], ['mirror', true], ['weaken', true]],
    nature: [['cripple', true], ['decay', true], ['plague', true], ['weaken', true]],
    shadow: [['weaken', true], ['fear', 1800], ['decay2', true], ['soulLink', true], ['soulDrain', true]],
    brute: [['stun', 1200], ['bleed', true], ['brittle', true], ['sunder', true], ['cripple', true]]
  };
  for(const [key, value] of (pools[theme] || pools.brute)){
    if(bossDebuffCount(skill) >= need) break;
    if(skill[key]) continue;
    skill[key] = value;
  }
  if(bossDebuffCount(skill) === 0) skill.weaken = true;
  return skill;
}
function bossMinSkillCount(ctx){
  if(ctx.kind === 'world') return (ctx.lvl || 1) >= 70 ? 6 : 5;
  if(ctx.kind === 'raid') return ctx.final ? 6 : 5;
  if(ctx.kind === 'dungeon') return ctx.final ? 4 : 3;
  return (ctx.lvl||1) >= 70 ? 4 : ((ctx.lvl||1) >= 35 ? 3 : 2);
}
function bossSupportCount(ctx){
  if(ctx.kind === 'world') return (ctx.lvl || 1) >= 80 ? 2 : 1;
  if(ctx.kind === 'raid') return ctx.final ? 2 : 1;
  if(ctx.kind === 'dungeon') return ctx.final ? 1 : 0;
  if((ctx.lvl||1) >= 70) return 1;
  if((ctx.lvl||1) >= 40) return 1;
  return 0;
}
function chooseBossInterruptPolicy(skill, ctx){
  if(isBossSupportSkill(skill)) return 'soft';
  const threat = bossThreatTier(skill, ctx);
  const control = bossControlScore(skill);
  if(threat === 'extreme') return 'hard';
  if(threat === 'high' && ((skill.castTime || 0) >= 2.6 || control >= 2 || skill.aoe)) return 'hard';
  return 'none';
}
function makeBossRotationSupportSkill(theme, ctx){
  const base = BOSS_ROTATION_SUPPORT_SKILLS[theme] || BOSS_ROTATION_SUPPORT_SKILLS.brute;
  const skill = Object.assign({}, base);
  skill.name = bossCanonicalSkillName(ctx.name, 2, skill.name);
  if((ctx.lvl || 1) >= 70){
    if(skill.healPct) skill.healPct = +(skill.healPct + 0.02).toFixed(3);
    if(skill.shieldPct) skill.shieldPct = +(skill.shieldPct + 0.02).toFixed(3);
    if(skill.atkBuffPct) skill.atkBuffPct += 6;
    if(skill.spdBuffPct) skill.spdBuffPct += 6;
    if(skill.defBuffPct) skill.defBuffPct += 6;
    if(skill.critBuffPct) skill.critBuffPct += 6;
    if(skill.leechBuffPct) skill.leechBuffPct += 4;
    if(skill.drBuffPct) skill.drBuffPct = +(skill.drBuffPct + 0.03).toFixed(2);
  } else if((ctx.lvl || 1) >= 40){
    if(skill.healPct) skill.healPct = +(skill.healPct + 0.01).toFixed(3);
    if(skill.shieldPct) skill.shieldPct = +(skill.shieldPct + 0.01).toFixed(3);
    if(skill.atkBuffPct) skill.atkBuffPct += 3;
    if(skill.spdBuffPct) skill.spdBuffPct += 3;
    if(skill.defBuffPct) skill.defBuffPct += 3;
    if(skill.critBuffPct) skill.critBuffPct += 3;
  }
  return skill;
}
function ensureBossPassivePressure(boss, ctx){
  boss.passive = Object.assign({}, boss.passive || {});
  if(ctx.kind === 'world'){
    boss.passive.dmgReduction = Math.max(boss.passive.dmgReduction || 0, (ctx.lvl || 1) >= 80 ? 0.24 : ((ctx.lvl || 1) >= 60 ? 0.18 : 0.14));
    boss.passive.critChance = Math.max(boss.passive.critChance || 0, (ctx.lvl || 1) >= 70 ? 0.18 : 0.12);
    boss.passive.atkBonus = Math.max(boss.passive.atkBonus || 0, (ctx.lvl || 1) >= 70 ? 0.22 : 0.14);
    boss.passive.leech = Math.max(boss.passive.leech || 0, (ctx.lvl || 1) >= 60 ? 0.05 : 0.03);
    boss.instantCastChance = Math.max(boss.instantCastChance || 0, (ctx.lvl || 1) >= 80 ? 0.2 : ((ctx.lvl || 1) >= 70 ? 0.14 : 0.08));
    if(!boss.atkInterval) boss.atkInterval = (ctx.lvl || 1) >= 70 ? 1240 : 1340;
    return;
  }
  if(ctx.kind === 'raid'){
    boss.passive.dmgReduction = Math.max(boss.passive.dmgReduction || 0, ctx.final ? 0.18 : 0.12);
    boss.passive.critChance = Math.max(boss.passive.critChance || 0, ctx.final ? 0.18 : 0.12);
    boss.passive.atkBonus = Math.max(boss.passive.atkBonus || 0, ctx.final ? 0.22 : 0.14);
    boss.passive.leech = Math.max(boss.passive.leech || 0, ctx.final ? 0.05 : 0.03);
    boss.instantCastChance = Math.max(boss.instantCastChance || 0, ctx.final ? 0.12 : 0.06);
    if(!boss.atkInterval) boss.atkInterval = ctx.final ? 1280 : 1360;
    return;
  }
  if(ctx.kind === 'dungeon'){
    boss.passive.dmgReduction = Math.max(boss.passive.dmgReduction || 0, ctx.final ? 0.12 : 0.08);
    boss.passive.critChance = Math.max(boss.passive.critChance || 0, ctx.final ? 0.14 : 0.08);
    boss.passive.atkBonus = Math.max(boss.passive.atkBonus || 0, ctx.final ? 0.16 : 0.1);
    boss.passive.leech = Math.max(boss.passive.leech || 0, ctx.final ? 0.03 : 0.01);
    boss.instantCastChance = Math.max(boss.instantCastChance || 0, ctx.final ? 0.08 : 0.03);
    if(!boss.atkInterval) boss.atkInterval = ctx.final ? 1380 : 1460;
    return;
  }
  boss.passive.dmgReduction = Math.max(boss.passive.dmgReduction || 0, ctx.final ? 0.14 : 0.08);
  boss.passive.critChance = Math.max(boss.passive.critChance || 0, ctx.final ? 0.14 : 0.08);
  boss.passive.atkBonus = Math.max(boss.passive.atkBonus || 0, ctx.final ? 0.16 : 0.1);
  boss.instantCastChance = Math.max(boss.instantCastChance || 0, ctx.final ? 0.08 : 0.03);
  if(!boss.atkInterval) boss.atkInterval = ctx.final ? 1360 : 1440;
}
function normalizeBossSkillProfile(skill, ctx, idx, total){
  const out = ensureBossSkillDebuffs(skill, ctx);
  const cap = bossDamageCap(ctx, out);
  if(cap != null && typeof out.mul === 'number' && out.mul > cap) out.mul = +cap.toFixed(1);
  out.threat = bossThreatTier(out, ctx);
  out.interruptPolicy = chooseBossInterruptPolicy(out, ctx);
  if(isBossSupportSkill(out) && out.threat === 'low') out.threat = 'medium';
  if(out.interruptPolicy === 'hard' && out.threat === 'medium' && ctx.final) out.threat = 'high';
  if(out.interruptPolicy === 'hard' && idx === total - 1 && ctx.final) out.threat = 'extreme';
  return out;
}
function ensureBossRotationMix(boss, ctx){
  const theme = inferBossTheme(ctx.name, boss.skills?.[0] || { name: ctx.name });
  boss.skills = boss.skills || [];
  moveBossSupportSkillsToPassive(boss);
  if((ctx.lvl || 1) >= 18){
    const supportSkill = makeBossRotationSupportSkill(theme, ctx);
    addBossPassiveTrick(boss, supportSkill);
  }
  // 召唤 / buff / 治疗只进入被动技巧池,不再污染读条技能栏。
  if((ctx.lvl || 1) >= 30){
    const variety = bossSupportVariety(ctx);
    const present = () => ({
      summon: (boss.passive?.tricks || []).some(s => s.summonCount || s.type === 'summon'),
      buff:   (boss.passive?.tricks || []).some(s => s.atkBuffSecs || s.spdBuffSecs || s.defBuffSecs || s.drBuffSecs || s.critBuffSecs || s.leechBuffSecs || s.nextDouble),
      heal:   (boss.passive?.tricks || []).some(s => s.type === 'heal' || s.healPct),
    });
    for(const t of ['summon', 'buff', 'heal']){
      if((boss.passive?.tricks || []).filter(isBossSupportSkill).length >= variety) break;
      if(present()[t]) continue;
      addBossPassiveTrick(boss, makeBossPassiveSkill(t, theme, ctx));
    }
  }
  boss.skills = (boss.skills || []).map((sk, idx, arr) => normalizeBossSkillProfile(sk, ctx, idx, arr.length));
  let hardCount = boss.skills.filter(sk => sk.interruptPolicy === 'hard').length;
  if(hardCount === 0){
    let best = -1;
    let bestScore = -1;
    boss.skills.forEach((sk, idx) => {
      if(isBossSupportSkill(sk)) return;
      const score = bossThreatScore(sk, ctx) + (sk.castTime || 0);
      if(score > bestScore){ bestScore = score; best = idx; }
    });
    if(best >= 0){
      boss.skills[best].interruptPolicy = 'hard';
      if(boss.skills[best].threat === 'low') boss.skills[best].threat = 'high';
      else if(boss.skills[best].threat === 'medium') boss.skills[best].threat = ctx.final ? 'extreme' : 'high';
      hardCount = 1;
    }
  }
  const hardLimit = ctx.kind === 'raid' && ctx.final ? 2 : 1;
  let seenHard = 0;
  boss.skills = boss.skills.map(sk => {
    if(sk.interruptPolicy === 'hard'){
      seenHard++;
      if(seenHard > hardLimit) sk.interruptPolicy = sk.threat === 'extreme' ? 'soft' : 'none';
    }
    return sk;
  });
}
function ensureBossSkills(boss, ctx){
  ensureBossPassivePressure(boss, ctx);
  moveBossSupportSkillsToPassive(boss);
  boss.skills = (boss.skills || []).map(sk => ensureBossSkillDebuffs(sk, ctx));
  const theme = inferBossTheme(ctx.name, boss.skills[0] || { name: ctx.name });
  let idx = 0;
  while(boss.skills.length < bossMinSkillCount(ctx) && idx < 16){
    const extra = makeBossSignatureSkill(theme, ctx.name, idx, ctx);
    idx++;
    if(boss.skills.some(sk => sk.name === extra.name)) continue;
    boss.skills.push(ensureBossSkillDebuffs(extra, ctx));
  }
  ensureBossRotationMix(boss, ctx);
  const desiredSupport = bossSupportCount(ctx);
  boss.supportCount = boss.supportCount == null ? desiredSupport : Math.min(boss.supportCount, desiredSupport);
}
function enhanceBossCollection(list, ctxBase){
  for(let i=0;i<list.length;i++){
    const boss = list[i];
    const ctx = Object.assign({}, ctxBase, {
      name: boss.name,
      lvl: boss.lvl || ctxBase.lvl || 1,
      final: ctxBase.final === true || i === ctxBase.finalAt
    });
    ensureBossSkills(boss, ctx);
  }
}
function insertRaidBossBeforeFinal(dg, boss){
  if((dg.bosses || []).some(b => b.name === boss.name)) return;
  const final = dg.bosses[dg.bosses.length - 1];
  const insertAt = Math.max(0, dg.bosses.length - 1);
  dg.bosses.splice(insertAt, 0, boss);
  if(final && dg.bosses[dg.bosses.length - 1] !== final){
    dg.bosses = dg.bosses.filter(Boolean);
  }
}
function dungeonBossWavesInvalid(dg){
  const bosses = dg?.bosses || [];
  if(!bosses.length) return false;
  let prev = 0;
  for(const boss of bosses){
    if(!Number.isFinite(boss.wave) || boss.wave <= prev) return true;
    prev = boss.wave;
  }
  return !Number.isFinite(dg.waves) || dg.waves < prev;
}
function assignDungeonBossWaves(dg){
  const bosses = dg?.bosses || [];
  if(!bosses.length) return;
  const totalWaves = Math.max(Number.isFinite(dg.waves) ? dg.waves : 0, bosses.length + 2);
  if(bosses.length === 1){
    bosses[0].wave = totalWaves;
    dg.waves = totalWaves;
    return;
  }
  let prev = 1;
  const spread = Math.max(1, totalWaves - 2);
  bosses.forEach((boss, idx) => {
    if(idx === bosses.length - 1){
      boss.wave = totalWaves;
      return;
    }
    const target = Math.max(2, Math.round(((idx + 1) * spread) / bosses.length));
    boss.wave = Math.min(totalWaves - 1, Math.max(prev + 1, target));
    prev = boss.wave;
  });
  dg.waves = Math.max(totalWaves, bosses[bosses.length - 1].wave);
}
function normalizeBossContent(){
  for(const map of MAPS){
    if(!map.boss) continue;
    ensureBossSkills(map.boss, { kind:'map', name:map.boss.name, lvl:map.boss.lvl || map.lvlRange?.[1] || 1, final:true });
  }
  for(const dg of DUNGEONS){
    if(dg.type === 'raid'){
      if(dg.key === 'ruby'){
        const rubyBoss = (dg.bosses || []).find(b => b.name === '萨维安娜·怒焰');
        if(rubyBoss) rubyBoss.name = '暮光龙·萨维安娜';
      }
      if(dg.key === 'ulduar'){
        const yogg = (dg.bosses || []).find(b => b.name === '尤格萨隆');
        if(yogg) yogg.name = '尤格-萨隆';
      }
      for(const extra of (RAID_EXTRA_BOSSES[dg.key] || [])){
        insertRaidBossBeforeFinal(dg, JSON.parse(JSON.stringify(extra)));
      }
      enhanceBossCollection(dg.bosses, { kind:'raid', lvl:dg.reqLvl, finalAt:(dg.bosses.length - 1) });
      let wave = 1;
      dg.bosses.forEach((boss, idx) => {
        boss.wave = wave;
        if(idx < dg.bosses.length - 1) wave += (idx % 2 === 0 ? 1 : 2);
      });
      dg.waves = Math.max(dg.bosses[dg.bosses.length - 1]?.wave || dg.bosses.length, dg.bosses.length + 2);
    } else {
      enhanceBossCollection(dg.bosses, { kind:'dungeon', lvl:dg.reqLvl, finalAt:(dg.bosses.length - 1) });
      if(dungeonBossWavesInvalid(dg)) assignDungeonBossWaves(dg);
    }
  }
}
function normalizeWorldBossSkillsets(){
  const meta = {
    hogger_king:{ name:'霍格大王', lvl:30, final:false },
    swamp_tyrant:{ name:'沼泽暴君·格拉姆', lvl:40, final:false },
    blackrock_overlord:{ name:'黑石霸主·达格兰', lvl:50, final:false },
    kazzak_doom:{ name:'末日领主卡扎克', lvl:60, final:false },
    magtheridon_wrath:{ name:'深渊之王玛瑟里顿', lvl:70, final:false },
    sindragosa_shadow:{ name:'辛达苟萨之影', lvl:79, final:false },
    deathwing:{ name:'死亡之翼·灭世者', lvl:85, final:true },
    ragnaros:{ name:'拉格纳罗斯·火焰之王', lvl:85, final:true },
    cthun:{ name:'克苏恩·疯狂之眼', lvl:85, final:true },
    yogg_saron:{ name:'尤格萨隆·千喉之梦', lvl:86, final:true },
    alakir:{ name:'奥拉基尔·风暴王座', lvl:86, final:true },
    lei_shen:{ name:'雷神·雷霆之王', lvl:88, final:true },
    rukhmar:{ name:'鲁克玛', lvl:89, final:true },
    argus_unmaker:{ name:'阿古斯·寂灭者', lvl:90, final:true },
    queen_azshara:{ name:'阿兹莎拉女王', lvl:91, final:true },
    raszageth_storm:{ name:'莱萨杰丝·风暴化身', lvl:92, final:true },
    sire_denathrius:{ name:'主宰者德纳修斯', lvl:93, final:true },
    xal_atath:{ name:'虚空先驱萨拉塔斯', lvl:96, final:true },
    reshanor:{ name:'雷沙诺尔·无缚者', lvl:100, final:true },
    shadowpoint_vexis:{ name:'影点总督维克席斯', lvl:102, final:true },
    shandorah_astromancer:{ name:'群星占相者诺维萨', lvl:104, final:true },
  };
  for(const [key, boss] of Object.entries(WORLD_BOSS_SKILLSETS)){
    const info = meta[key] || { name:key, lvl:60, final:false };
    ensureBossSkills(boss, {
      kind:'world',
      name:info.name,
      lvl:info.lvl,
      final:info.final
    });
  }
}
applyDungeonArtBackfill();
normalizeBossContent();
normalizeWorldBossSkillsets();

function extendDungeonCatalog(){
  const L = (name, slot, rarity, stats) => ({ name, slot, rarity, stats });
  const dmg = (name, icon, mul, extra) => Object.assign({ name, icon, desc:`${mul}倍伤害`, type:'dmg', mul, castTime:2.2 }, extra || {});
  // 阶段技能助手(combat.js 按 hpBelow/hpAbove 在 BOSS 跌破血线时解锁/立即施放):
  // dmgP=阶段爆发伤害(读条→可破绽);buffP=阶段自强化(瞬发);summonP=阶段召唤援军(瞬发)
  const dmgP = (name, icon, mul, hpBelow, extra) => Object.assign({ name, icon, desc:`${mul}倍伤害`, type:'dmg', mul, castTime:2.6, cd:14, hpBelow }, extra || {});
  const buffP = (name, icon, hpBelow, desc, extra) => Object.assign({ name, icon, desc, type:'buff', castTime:0, cd:24, hpBelow }, extra || {});
  const summonP = (name, icon, hpBelow, desc, extra) => Object.assign({ name, icon, desc, type:'summon', castTime:0, cd:26, hpBelow }, extra || {});
  const ensureDungeon = (dg, loot) => {
    const art = DUNGEON_ART_BACKFILL[dg.key];
    if (art) dg.art = art;
    if (!DUNGEONS.some(x => x.key === dg.key)) DUNGEONS.push(dg);
    if (loot && !DUNGEON_LOOT[dg.key]) DUNGEON_LOOT[dg.key] = loot;
  };
  const addBossLoot = (dungeonKey, bossName, items) => {
    const root = DUNGEON_LOOT[dungeonKey];
    if (!root) return;
    if (!root.bosses) root.bosses = {};
    if (!root.bosses[bossName]) root.bosses[bossName] = [];
    const pool = root.bosses[bossName];
    for (const item of items) {
      if (!pool.some(x => x.name === item.name)) pool.push(item);
    }
  };

  const extraDungeons = [
    {
      key:'diremaul', name:'厄运之槌', icon:'🪵', reqLvl:60, waves:10, art:'assets/wow/art/classic-dire-maul.jpg', desc:'食人魔王庭与扭曲秘法交织的古老圣地',
      bosses:[
        { name:'普希林', emoji:'😼', skills:[dmg('魔藤乱舞','🍃',4,{ cripple:true, dot:true })] },
        { name:'伊莫塔尔', emoji:'👾', skills:[dmg('邪能碾压','🟣',5,{ weaken:true, manaDrain:40 })] },
        { name:'托塞德林王子', emoji:'👑', skills:[dmg('王室奥术风暴','✨',6,{ silence:1800, brittle:true }), dmg('傲慢处决','⚔️',7,{ stun:1400, weaken:true })] }
      ]
    },
    {
      key:'lbrs', name:'黑石塔下层', icon:'🐉', reqLvl:61, waves:11, art:'assets/wow/art/classic-blackrock-spire.jpg', desc:'黑石兽人与龙人的炼狱堡垒',
      bosses:[
        { name:'欧莫克大王', emoji:'🪓', skills:[dmg('碎骨践踏','🪓',4.5,{ stun:1200, bleed:true })] },
        { name:'暗影猎手沃什加斯', emoji:'🏹', skills:[dmg('暗影箭雨','🌑',5,{ weaken:true, fear:1500 })] },
        { name:'烟网蛛后', emoji:'🕷️', skills:[dmg('蛛网毒潮','🕸️',5,{ dot:true, cripple:true, plague:true })] },
        { name:'维姆萨拉克', emoji:'🐉', skills:[dmg('龙裔战吼','🐉',6,{ frenzy:true, weaken:true }), dmg('黑石撕裂','🩸',7,{ bleed:true, brittle:true })] }
      ]
    },
    {
      key:'shattered', name:'破碎大厅', icon:'🧱', reqLvl:67, waves:10, art:'assets/wow/art/tbc-hellfire-citadel.jpg', desc:'钢铁部落囚笼中的血腥屠场',
      bosses:[
        { name:'高阶术士奈瑟库斯', emoji:'🧿', skills:[dmg('痛苦灌体','🟣',5,{ dot:true, soulDrain:true })] },
        { name:'血卫士伯鲁恩', emoji:'🛡️', skills:[dmg('碾骨冲锋','🛡️',5,{ stun:1200, sunder:true })] },
        { name:'击碎者克里丹', emoji:'🔥', skills:[dmg('烈焰新星','🔥',6,{ aoe:true, dot:true, silence:1600 }), dmg('军团处刑','😈',7,{ brittle:true, fear:1500 })] }
      ]
    },
    {
      key:'arcatraz', name:'禁魔监狱', icon:'🔒', reqLvl:69, waves:10, art:'assets/wow/art/tbc-tempest-keep.jpg', desc:'纳鲁监狱深处的恶魔实验场',
      bosses:[
        { name:'佐拉多尔米', emoji:'🛰️', skills:[dmg('虚空监禁','🛰️',5,{ silence:1800, manaDrain:45 })] },
        { name:'预言者斯克瑞斯', emoji:'👁️', skills:[dmg('心智撕裂','👁️',5.5,{ fear:1600, mirror:true })] },
        { name:'先知达尔莉丝', emoji:'🔮', skills:[dmg('奥术坍缩','🔮',6,{ aoe:true, silence:1600, weaken:true }), dmg('虚空重组','🌀',7,{ manaDrain:55, brittle:true })] }
      ]
    },
    {
      key:'culling', name:'净化斯坦索姆', icon:'⏳', reqLvl:73, waves:10, art:'assets/wow/art/wrath-culling-stratholme.jpg', desc:'时光之穴中的亡城肃清战',
      bosses:[
        { name:'肉钩', emoji:'🪝', skills:[dmg('勾链撕扯','🪝',5,{ bleed:true, cripple:true })] },
        { name:'塑血者沙尔拉姆', emoji:'🧪', skills:[dmg('瘟疫缝合','🧪',5.5,{ plague:true, decay:true })] },
        { name:'玛尔加尼斯', emoji:'🦇', skills:[dmg('吸血梦魇','🦇',6,{ soulDrain:true, fear:1800 }), dmg('恐惧洪潮','🌑',7,{ aoe:true, weaken:true, manaDrain:45 })] }
      ]
    },
    {
      key:'pit', name:'萨隆矿坑', icon:'⛓️', reqLvl:75, waves:10, art:'assets/wow/art/wrath-pit-saron.jpg', desc:'冰冠脚下以血与矿熔铸的深坑',
      bosses:[
        { name:'熔炉之主加弗斯特', emoji:'🔨', skills:[dmg('萨隆重压','🔨',5.5,{ brittle:true, sunder:true })] },
        { name:'艾克', emoji:'🧟', skills:[dmg('瘟疫喷发','🦠',6,{ plague:true, dot:true, aoe:true })] },
        { name:'天灾领主泰兰努斯', emoji:'🐲', skills:[dmg('霜龙压境','🐲',7,{ slow:true, freeze:1500, weaken:true }), dmg('绝望号令','☠️',7.5,{ fear:1800, decay2:true })] }
      ]
    },
    {
      key:'oculus', name:'魔环', icon:'💫', reqLvl:76, waves:10, art:'assets/wow/art/wrath-oculus.jpg', desc:'魔网裂口上方失控旋转的浮空圣所',
      bosses:[
        { name:'审讯者达拉科', emoji:'💫', skills:[dmg('法网审讯','✨',5.5,{ silence:1800, manaDrain:45 })] },
        { name:'法师领主伊洛姆', emoji:'🧙', skills:[dmg('法能飓风','🌀',6,{ aoe:true, mirror:true, weaken:true })] },
        { name:'魔网守护者埃雷苟斯', emoji:'🐉', skills:[dmg('奥术龙息','🐉',7,{ silence:1800, dot:true }), dmg('湮灭光束','💥',7.5,{ brittle:true, manaDrain:55 })] }
      ]
    },
    {
      key:'hor', name:'映像大厅', icon:'🧊', reqLvl:78, waves:10, art:'assets/wow/art/timewalking-wrath-banner.jpg', desc:'冰封王座回廊中最残酷的追猎战',
      bosses:[
        { name:'法瑞克', emoji:'🛡️', skills:[dmg('绝望打击','🛡️',6,{ weaken:true, fear:1500 })] },
        { name:'玛维恩', emoji:'⚔️', skills:[dmg('冰冷斩击','⚔️',6.2,{ slow:true, brittle:true })] },
        { name:'巫妖王之影', emoji:'👑', skills:[dmg('无尽寒寂','👑',7.5,{ aoe:true, freeze:1500, decay2:true }), dmg('灵魂收割','💀',8,{ soulLink:true, soulDrain:true })] }
      ]
    },
    {
      key:'aq40', name:'安其拉神殿', icon:'🦂', type:'raid', reqLvl:60, waves:12, art:'assets/wow/art/classic-ahnqiraj-temple.jpg', desc:'其拉帝国与古神低语支配的虫巢神殿',
      bosses:[
        { name:'预言者斯克拉姆', emoji:'🔮', skills:[dmg('心智震爆','🔮',7.5,{ mirror:true, silence:1800 })] },
        { name:'战争守卫沙尔图拉', emoji:'🦂', skills:[dmg('锋刃狂舞','🦂',8,{ aoe:true, bleed:true, cripple:true })] },
        { name:'顽强的范克瑞斯', emoji:'🪲', skills:[dmg('沙尘毒刺','🪲',8,{ plague:true, dot:true, brittle:true })] },
        { name:'双子皇帝', emoji:'👑', skills:[dmg('皇权共鸣','👑',8.5,{ aoe:true, silence:1800, manaDrain:55 }), dmg('其拉斩决','⚔️',9,{ sunder:true, fear:1600 })] },
        { name:'克苏恩', emoji:'👁️', skills:[dmg('湮灭视线','👁️',10,{ silence:2200, weaken:true, manaDrain:60 }), dmg('古神腹鸣','🌀',10.5,{ aoe:true, fear:1800, soulLink:true })] }
      ]
    },
    {
      key:'ssc', name:'毒蛇神殿', icon:'🐍', type:'raid', reqLvl:70, waves:11, art:'assets/wow/art/tbc-coilfang-reservoir.jpg', desc:'盘牙水库最深处的女王王庭',
      bosses:[
        { name:'不稳定的海度斯', emoji:'🌊', skills:[dmg('元素相位','🌊',8,{ dot:true, weaken:true })] },
        { name:'盲眼者莱欧瑟拉斯', emoji:'😈', skills:[dmg('恶魔旋刃','😈',8.5,{ aoe:true, frenzy:true, bleed:true })] },
        { name:'深水领主卡拉瑟雷斯', emoji:'🪼', skills:[dmg('潮汐禁锢','🪼',8.5,{ cripple:true, manaDrain:45, silence:1800 })] },
        { name:'瓦丝琪', emoji:'🐍', skills:[dmg('毒液风暴','🐍',9,{ aoe:true, plague:true, dot:true }), dmg('女王缚杀','🪢',9.5,{ silence:1800, weaken:true, brittle:true })] }
      ]
    },
    {
      key:'tk', name:'风暴要塞', icon:'🌌', type:'raid', reqLvl:70, waves:11, art:'assets/wow/art/tbc-tempest-keep.jpg', desc:'虚空风暴中悬浮的奥术王庭',
      bosses:[
        { name:'空灵机甲', emoji:'🤖', skills:[dmg('星界重击','🤖',8,{ brittle:true, stun:1400 })] },
        { name:'奥', emoji:'🌠', skills:[dmg('迁跃冲击','🌠',8.5,{ mirror:true, silence:1800 })] },
        { name:'大星术师索兰莉安', emoji:'🔭', skills:[dmg('群星压顶','🔭',8.5,{ aoe:true, manaDrain:55, weaken:true })] },
        { name:'凯尔萨斯·逐日者', emoji:'☀️', skills:[dmg('凤凰献祭','☀️',9,{ dot:true, aoe:true, brittle:true }), dmg('王子敕令','👑',9.5,{ silence:1800, mirror:true, fear:1600 })] }
      ]
    },
    {
      key:'hyjal', name:'海加尔山之战', icon:'🌲', type:'raid', reqLvl:70, waves:11, art:'assets/wow/art/tbc-mount-hyjal.jpg', desc:'燃烧军团与守护者在世界之树前的终局会战',
      bosses:[
        { name:'雷基·冬寒', emoji:'❄️', skills:[dmg('死寒侵袭','❄️',8,{ slow:true, freeze:1500, decay:true })] },
        { name:'安纳塞隆', emoji:'🦇', skills:[dmg('恐惧魔王之拥','🦇',8.5,{ fear:1800, soulDrain:true, weaken:true })] },
        { name:'阿兹加洛', emoji:'🔥', skills:[dmg('末日之火','🔥',9,{ aoe:true, dot:true, brittle:true })] },
        { name:'阿克蒙德', emoji:'👺', skills:[dmg('军团终焉','👺',10,{ aoe:true, silence:2200, manaDrain:60 }), dmg('灵魂践踏','🌌',10.5,{ fear:1800, decay2:true, soulLink:true })] }
      ]
    },
    {
      key:'bt', name:'黑暗神殿', icon:'🗡️', type:'raid', reqLvl:70, waves:12, art:'assets/wow/art/tbc-black-temple.jpg', desc:'伊利达雷与恶魔残响交织的黑色圣殿',
      bosses:[
        { name:'高阶督军纳因图斯', emoji:'🔱', skills:[dmg('脊骨长矛','🔱',8,{ bleed:true, brittle:true })] },
        { name:'灵魂之匣', emoji:'📦', skills:[dmg('折磨律令','📦',8.5,{ manaDrain:55, decay2:true, weaken:true })] },
        { name:'莎赫拉丝主母', emoji:'🕷️', skills:[dmg('魅影切割','🕷️',8.5,{ cripple:true, silence:1800, dot:true })] },
        { name:'伊利达雷议会', emoji:'⚖️', skills:[dmg('协同裁决','⚖️',9,{ aoe:true, weaken:true, mirror:true }), dmg('黑暗命令','🌑',9.2,{ silence:1800, manaDrain:50 })] },
        { name:'伊利丹·怒风', emoji:'😈', skills:[dmg('阿古斯之焰','😈',10,{ dot:true, aoe:true, brittle:true }), dmg('埃辛诺斯处刑','🗡️',10.5,{ sunder:true, fear:1600, weaken:true })] }
      ]
    },
    {
      key:'ubrs', name:'黑石塔上层', icon:'🔥', reqLvl:63, waves:8, art:'assets/wow/art/classic-blackrock-spire.jpg', desc:'黑石氏族最高处的兽人将军议事厅',
      bosses:[
        { name:'督军沃克', emoji:'🪓', skills:[dmg('狂暴战吼','🪓',5,{ frenzy:true, stun:1200 })] },
        { name:'烈焰使者索拉卡尔', emoji:'🔥', skills:[dmg('烈焰风暴','🔥',5.5,{ aoe:true, dot:true })] },
        { name:'将军勒什雷尔', emoji:'🐲', skills:[dmg('龙人裁决','🐲',6.5,{ brittle:true, weaken:true }), dmg('黑石处刑','🩸',7,{ bleed:true, fear:1400 })] }
      ]
    },
    {
      key:'freehold', name:'自由镇', icon:'🏴‍☠️', reqLvl:72, waves:9, art:'assets/wow/art/timewalking-bfa-banner.jpg', desc:'库尔提拉斯海盗盘踞的无法之港',
      bosses:[
        { name:'断牙海狗', emoji:'🦈', skills:[dmg('鲨鱼狂袭','🦈',6,{ bleed:true, frenzy:true })] },
        { name:'酒桶炸药师', emoji:'🛢️', skills:[dmg('火药桶','💥',6.5,{ aoe:true, stun:1300 })] },
        { name:'船长贾雷德', emoji:'🦜', skills:[dmg('掠夺者乱斗','⚔️',7,{ aoe:true, cripple:true }), dmg('夺命斩','🗡️',7.5,{ weaken:true, bleed:true })] }
      ]
    },
    {
      key:'mechagon', name:'麦卡贡', icon:'⚙️', reqLvl:75, waves:9, art:'assets/wow/art/timewalking-bfa-banner.jpg', desc:'机械侏儒打造的废土发明工坊',
      bosses:[
        { name:'回收机器人', emoji:'🤖', skills:[dmg('废料喷射','⚙️',6.5,{ dot:true, brittle:true })] },
        { name:'爆破专家', emoji:'💣', skills:[dmg('集束炸弹','💣',7,{ aoe:true, stun:1400 })] },
        { name:'机械之王梅卡托克', emoji:'👑', skills:[dmg('过载射线','⚡',7.5,{ silence:1700, weaken:true }), dmg('终极防御矩阵','🛡️',8,{ aoe:true, brittle:true, manaDrain:45 })] }
      ]
    },
    {
      key:'boralus', name:'围攻伯拉勒斯', icon:'⚓', reqLvl:77, waves:10, art:'assets/wow/art/timewalking-bfa-banner.jpg', desc:'库尔提拉斯海军要塞的巷战与码头攻防',
      bosses:[
        { name:'海军统领', emoji:'⚓', skills:[dmg('齐射炮火','💥',7,{ aoe:true, dot:true })] },
        { name:'巡夜指挥官', emoji:'🐕', skills:[dmg('猎犬扑咬','🐕',7.5,{ bleed:true, cripple:true })] },
        { name:'维克雷斯女勋爵', emoji:'🗡️', skills:[dmg('影刃突袭','🗡️',8,{ weaken:true, fear:1500 }), dmg('女巫献祭','🕯️',8.5,{ soulDrain:true, dot:true, brittle:true })] }
      ]
    },
    {
      key:'firelands', name:'火焰之地', icon:'🌋', type:'raid', reqLvl:76, waves:12, art:'assets/wow/art/timewalking-cataclysm-banner.jpg', desc:'炎魔之王麾下烈焰泰坦的炽热领域',
      bosses:[
        { name:'贝丝缇拉克', emoji:'🕷️', skills:[dmg('炽焰蛛网','🕸️',8.5,{ dot:true, cripple:true })] },
        { name:'熔岩之王莱奥利斯', emoji:'🌋', skills:[dmg('火山喷发','🌋',9,{ aoe:true, brittle:true, stun:1400 })] },
        { name:'巴尔洛戈斯', emoji:'🐶', skills:[dmg('烈焰撕咬','🔥',9,{ bleed:true, frenzy:true })] },
        { name:'炎鹰阿莱索德', emoji:'🦅', skills:[dmg('烈日之矛','☀️',9.5,{ aoe:true, silence:1800, dot:true })] },
        { name:'拉格纳罗斯', emoji:'🔥', skills:[dmg('元素崩裂','🌋',10.5,{ aoe:true, dot:true, weaken:true }), dmg('萨弗拉斯之锤','🔨',11,{ sunder:true, fear:1700, brittle:true })] }
      ]
    },
    {
      key:'throne', name:'雷霆王座', icon:'⚡', type:'raid', reqLvl:78, waves:12, art:'assets/wow/art/timewalking-pandaria-banner.jpg', desc:'赞达拉巨魔帝国与雷神残响盘踞的天空堡垒',
      bosses:[
        { name:'赞达拉守卫贾林', emoji:'🦖', skills:[dmg('远古践踏','🦖',9,{ stun:1400, bleed:true })] },
        { name:'风暴祭司莱杉', emoji:'🌩️', skills:[dmg('雷霆链','⚡',9.5,{ aoe:true, silence:1800 })] },
        { name:'三头巨龙米伽拉', emoji:'🐉', skills:[dmg('多头吐息','🐉',9.5,{ dot:true, brittle:true, freeze:1400 })] },
        { name:'织雾者吉安娜', emoji:'🌫️', skills:[dmg('迷雾箭雨','🌫️',10,{ dot:true, weaken:true, fear:1600 })] },
        { name:'雷电之王雷神', emoji:'👑', skills:[dmg('雷霆之力','⚡',11,{ aoe:true, stun:1600, brittle:true }), dmg('帝国终裁','🗡️',11.5,{ sunder:true, fear:1800, soulLink:true })] }
      ]
    },
    {
      key:'dragonsoul', name:'巨龙之魂', icon:'🐲', type:'raid', reqLvl:79, waves:12, art:'assets/wow/art/timewalking-cataclysm-banner.jpg', desc:'对抗灭世者死亡之翼的终局决战',
      bosses:[
        { name:'晨曦荒野之莫戈尔', emoji:'🐢', skills:[dmg('腐蚀践踏','🟣',9,{ aoe:true, weaken:true })] },
        { name:'亡语者', emoji:'💀', skills:[dmg('亡者低语','👻',9.5,{ fear:1700, soulDrain:true })] },
        { name:'死亡之翼背脊', emoji:'🐲', skills:[dmg('熔岩之触','🌋',9.5,{ dot:true, brittle:true })] },
        { name:'瓦里奥那与塞拉图斯', emoji:'⚡', skills:[dmg('风暴撕裂','⚡',10,{ aoe:true, slow:true, silence:1800 })] },
        { name:'死亡之翼·灭世者', emoji:'🐉', skills:[dmg('大决战','🌌',11.5,{ aoe:true, decay2:true, fear:1800 }), dmg('灭世烈焰','🔥',12,{ sunder:true, soulLink:true, brittle:true })] }
      ]
    },
    {
      key:'soo', name:'围攻奥格瑞玛', icon:'🪓', type:'raid', reqLvl:79, waves:13, art:'assets/wow/art/timewalking-pandaria-banner.jpg', desc:'讨伐暴君加尔鲁什·地狱咆哮的部落与联盟联军攻城战',
      bosses:[
        { name:'不洁之溢', emoji:'💧', skills:[dmg('腐化潮涌','🌊',9,{ aoe:true, decay:true })] },
        { name:'傲慢之煞', emoji:'👁️', skills:[dmg('傲慢爆发','👁️',9.5,{ fear:1700, weaken:true })] },
        { name:'钢铁巨像', emoji:'🤖', skills:[dmg('履带碾压','⚙️',9.5,{ stun:1500, sunder:true })] },
        { name:'达克沙将军', emoji:'🏹', skills:[dmg('猎杀号令','🏹',10,{ aoe:true, bleed:true, cripple:true })] },
        { name:'克拉希克综合体', emoji:'🪲', skills:[dmg('琥珀禁锢','🟡',10,{ silence:1900, plague:true, dot:true })] },
        { name:'加尔鲁什·地狱咆哮', emoji:'💀', skills:[dmg('真正的强者','💢',11.5,{ aoe:true, weaken:true, brittle:true }), dmg('钛钢碎击','🔨',12,{ sunder:true, stun:1700, fear:1800 })] }
      ]
    },
    {
      key:'hfc', name:'地狱火堡垒', icon:'😈', type:'raid', reqLvl:79, waves:13, art:'assets/wow/art/timewalking-draenor-banner.jpg', desc:'封堵塔纳安裂隙、阻止燃烧军团重返艾泽拉斯的最终防线',
      bosses:[
        { name:'钢铁掠袭者', emoji:'🤖', skills:[dmg('火炮齐射','💥',9,{ aoe:true, dot:true })] },
        { name:'寇莫克', emoji:'👊', skills:[dmg('邪能重拳','🟢',9.5,{ stun:1500, brittle:true })] },
        { name:'死眼基洛格', emoji:'👁️', skills:[dmg('血肉献祭','🩸',9.5,{ bleed:true, soulDrain:true })] },
        { name:'邪能领主扎昆', emoji:'🔥', skills:[dmg('邪能爆轰','😈',10,{ aoe:true, dot:true, weaken:true })] },
        { name:'玛诺洛斯', emoji:'👹', skills:[dmg('混乱践踏','👹',10.5,{ aoe:true, fear:1800, cripple:true })] },
        { name:'阿克蒙德', emoji:'👺', skills:[dmg('末日降临','🌌',11.5,{ aoe:true, decay2:true, silence:2000 }), dmg('军团之灾','🔥',12,{ sunder:true, soulLink:true, brittle:true })] }
      ]
    },
    {
      key:'tomb', name:'萨格拉斯之墓', icon:'⚰️', type:'raid', reqLvl:79, waves:13, art:'assets/wow/art/timewalking-legion-banner.jpg', desc:'破岛之上、堕落泰坦的陵墓中阻止基尔加丹重开军团传送门',
      bosses:[
        { name:'戈罗斯', emoji:'🌋', skills:[dmg('炽炎喷发','🔥',9.5,{ aoe:true, dot:true, brittle:true })] },
        { name:'恶魔审判官', emoji:'⚖️', skills:[dmg('折磨灵魂','💀',9.5,{ soulDrain:true, fear:1700 })] },
        { name:'莎萨拉恩女勋爵', emoji:'🪼', skills:[dmg('深海毒针','🌊',10,{ plague:true, dot:true, slow:true })] },
        { name:'守护之少女', emoji:'🛡️', skills:[dmg('圣光裁决','✨',10,{ aoe:true, silence:1900, weaken:true })] },
        { name:'堕落的萨格拉斯化身', emoji:'⚔️', skills:[dmg('黑暗审判','🌑',10.5,{ aoe:true, manaDrain:55, brittle:true })] },
        { name:'基尔加丹', emoji:'😈', skills:[dmg('军团烈焰','🔥',11.5,{ aoe:true, dot:true, weaken:true }), dmg('湮灭飞弹','🌠',12.5,{ silence:2000, fear:1800, soulLink:true })] }
      ]
    },
    {
      key:'antorus', name:'安托鲁斯,燃烧的王座', icon:'🌌', type:'raid', reqLvl:79, waves:14, art:'assets/wow/art/timewalking-legion-banner.jpg', desc:'追入阿古斯,在燃烧军团母星的王座上终结萨格拉斯的远征',
      bosses:[
        { name:'加洛希世界破坏者', emoji:'🤖', skills:[dmg('湮灭炮','💥',9.5,{ aoe:true, brittle:true, stun:1500 })] },
        { name:'萨格拉斯的地狱犬', emoji:'🐶', skills:[dmg('双犬撕咬','🟢',10,{ bleed:true, frenzy:true, dot:true })] },
        { name:'灵魂猎手伊莫纳', emoji:'🏹', skills:[dmg('裂魂箭雨','🌑',10,{ aoe:true, soulDrain:true, fear:1600 })] },
        { name:'金加洛斯', emoji:'🔨', skills:[dmg('军团锻锤','🔨',10.5,{ sunder:true, stun:1600, brittle:true })] },
        { name:'阿格拉玛', emoji:'⚔️', skills:[dmg('泰坦炽炎','☀️',11,{ aoe:true, dot:true, weaken:true })] },
        { name:'寂灭者阿古斯', emoji:'🌠', skills:[dmg('星辰陨落','🌌',12,{ aoe:true, decay2:true, silence:2000 }), dmg('世界终结','💫',13,{ sunder:true, soulLink:true, fear:2000 })] }
      ]
    },
    {
      key:'valor', name:'英灵殿', icon:'⚡', reqLvl:70, waves:9, art:'assets/wow/art/timewalking-legion-banner.jpg', desc:'瓦尔基拉守护的天界殿堂,泰坦守护者奥丁的英灵之厅',
      bosses:[
        { name:'海姆达尔', emoji:'⚔️', skills:[dmg('符文斩','⚡',6,{ aoe:true, stun:1300 })] },
        { name:'芬里尔', emoji:'🐺', skills:[dmg('暗影猛扑','🌑',6.5,{ bleed:true, frenzy:true })] },
        { name:'神王斯科瓦尔德', emoji:'🛡️', skills:[dmg('烈焰打击','🔥',7,{ dot:true, weaken:true })] },
        { name:'奥丁', emoji:'👑', skills:[dmg('风暴之矛','⚡',7.5,{ aoe:true, silence:1700 }), dmg('英灵审判','🌩️',8,{ stun:1500, brittle:true })] }
      ]
    },
    {
      key:'darkheart', name:'黑心林地', icon:'🌳', reqLvl:67, waves:9, art:'assets/wow/art/timewalking-legion-banner.jpg', desc:'被梦魇侵蚀的瓦尔莎拉密林,萨维斯的暗影在此盘踞',
      bosses:[
        { name:'大德鲁伊格莱达利斯', emoji:'🐗', skills:[dmg('野性突袭','🐗',5.5,{ bleed:true, cripple:true })] },
        { name:'橡树之心', emoji:'🌳', skills:[dmg('缠绕根须','🌿',6,{ stun:1400, dot:true })] },
        { name:'恐惧编织者诺索斯', emoji:'🦇', skills:[dmg('恐惧之噬','🌑',6.5,{ fear:1600, weaken:true })] },
        { name:'萨维斯的暗影', emoji:'🌑', skills:[dmg('梦魇爆发','💜',7,{ aoe:true, dot:true, mirror:true }), dmg('暗影践踏','👤',7.5,{ silence:1700, brittle:true })] }
      ]
    },
    {
      key:'court', name:'群星庭院', icon:'🌟', reqLvl:73, waves:9, art:'assets/wow/art/timewalking-legion-banner.jpg', desc:'苏拉玛贵族区的隐秘庭院,潜行夺取上层精灵的禁忌情报',
      bosses:[
        { name:'巡逻队长格尔多', emoji:'🛡️', skills:[dmg('警戒突刺','⚔️',6.5,{ sunder:true, stun:1300 })] },
        { name:'烈焰缠绕塔利克丝', emoji:'🔥', skills:[dmg('恶魔烈焰','😈',7,{ aoe:true, dot:true, manaDrain:40 })] },
        { name:'顾问梅兰德鲁斯', emoji:'⚔️', skills:[dmg('影刃乱舞','🗡️',7.5,{ bleed:true, weaken:true }), dmg('镜像突袭','🪞',8,{ mirror:true, brittle:true })] }
      ]
    },
    {
      key:'necrotic', name:'通灵之刺', icon:'💀', reqLvl:76, waves:10, art:'assets/wow/art/timewalking-shadowlands-banner.png', desc:'玛卓克萨斯的腐败造物工坊,缚霜者纳索尔守护的死灵兵工厂',
      bosses:[
        { name:'疫骨', emoji:'☠️', skills:[dmg('腐液喷吐','🟢',7,{ plague:true, dot:true, aoe:true })] },
        { name:'外科医生缝肉', emoji:'🧟', skills:[dmg('缝合钩链','🪝',7.5,{ bleed:true, cripple:true })] },
        { name:'收割者矩阵', emoji:'⚙️', skills:[dmg('收割光束','🔱',7.5,{ aoe:true, brittle:true, stun:1400 })] },
        { name:'缚霜者纳索尔', emoji:'❄️', skills:[dmg('冰霜缚魂','🧊',8,{ freeze:1600, slow:true, weaken:true }), dmg('死灵寒潮','💀',8.5,{ aoe:true, decay2:true, soulDrain:true })] }
      ]
    },
    {
      key:'nexus', name:'魔枢', icon:'💠', reqLvl:68, waves:9, art:'assets/wow/art/wrath-nexus.jpg', desc:'蓝龙军团守护的奥术螺旋,玛里苟斯的力量核心',
      bosses:[
        { name:'冰霜之王托塞德林', emoji:'❄️', skills:[dmg('寒冰尖刺','🧊',6,{ freeze:1500, slow:true })] },
        { name:'阿诺玛鲁斯', emoji:'🌀', skills:[dmg('虚空裂解','🌀',6.5,{ aoe:true, manaDrain:40 })] },
        { name:'凯瑞斯托拉兹', emoji:'🐉', skills:[dmg('奥术龙息','✨',7,{ silence:1700, dot:true }), dmg('魔网坍缩','💠',7.5,{ aoe:true, brittle:true, weaken:true })] }
      ]
    },
    {
      key:'gundrak', name:'古达克', icon:'🐊', reqLvl:71, waves:9, art:'assets/wow/art/wrath-gundrak.jpg', desc:'卓格巴尔巨魔向血神献祭的古老神庙',
      bosses:[
        { name:'斯拉德兰', emoji:'🐍', skills:[dmg('毒蛇缠绕','🐍',6.5,{ plague:true, cripple:true })] },
        { name:'莫拉格', emoji:'🦏', skills:[dmg('犀牛冲撞','🦏',7,{ stun:1500, bleed:true })] },
        { name:'迦勒鲁什', emoji:'🐊', skills:[dmg('血神之怒','🩸',7.5,{ frenzy:true, soulDrain:true }), dmg('远古践踏','🦶',8,{ aoe:true, brittle:true, fear:1500 })] }
      ]
    },
    {
      key:'sethekk', name:'塞泰克大厅', icon:'🦅', reqLvl:69, waves:9, art:'assets/wow/art/timewalking-outland-banner.jpg', desc:'鸦人膜拜乌鸦之神的黑暗大厅',
      bosses:[
        { name:'达克丝塔', emoji:'🪶', skills:[dmg('暗影箭雨','🌑',6,{ aoe:true, weaken:true })] },
        { name:'塞泰克先知', emoji:'🔮', skills:[dmg('预言震爆','🔮',6.5,{ silence:1700, manaDrain:40 })] },
        { name:'鸦人之王伊瑞尔', emoji:'🦅', skills:[dmg('夺魂之啸','👁️',7,{ fear:1700, soulDrain:true }), dmg('乌鸦风暴','🪶',7.5,{ aoe:true, dot:true, brittle:true })] }
      ]
    },
    {
      key:'stormstout', name:'风暴烈酒酿造厂', icon:'🍺', reqLvl:72, waves:9, art:'assets/wow/art/timewalking-pandaria-banner.jpg', desc:'谷地深处的酿造圣地被顽皮酒灵与煞气彻底搅乱,是一场充满滚桶与酒雾的潘达利亚乱斗',
      bosses:[
        { name:'乌克乌克', emoji:'🐒', skills:[dmg('滚桶乱砸','🍺',6.8,{ aoe:true, stun:1400, brittle:true })] },
        { name:'跳跳大王', emoji:'🐰', skills:[dmg('胡萝卜轰炸','🥕',7.1,{ aoe:true, dot:true, weaken:true })] },
        { name:'炎诛', emoji:'🔥', skills:[dmg('烈酒吐息','🔥',7.6,{ dot:true, silence:1700, fear:1400 }), dmg('酿造爆燃','💥',8,{ aoe:true, brittle:true, manaDrain:45 })] }
      ]
    },
    {
      key:'shadopan', name:'影踪禅院', icon:'⚫', reqLvl:74, waves:10, art:'assets/wow/art/timewalking-pandaria-banner.jpg', desc:'影踪派的山巅堡垒被煞气侵蚀,每一处回廊都在考验你对控制、爆发与续航的平衡',
      bosses:[
        { name:'古·穿云', emoji:'🐉', skills:[dmg('穿云重拳','💨',7.2,{ stun:1400, silence:1600 })] },
        { name:'雪流大师', emoji:'❄️', skills:[dmg('寒霜震击','❄️',7.5,{ freeze:1500, slow:true, weaken:true })] },
        { name:'狂之煞', emoji:'👁️', skills:[dmg('绝望波纹','🟣',8,{ aoe:true, fear:1700, decay:true }), dmg('煞能引爆','💢',8.4,{ aoe:true, brittle:true, soulDrain:true })] }
      ]
    },
    {
      key:'irondocks', name:'钢铁码头', icon:'⚓', reqLvl:74, waves:9, art:'assets/wow/art/timewalking-draenor-banner.jpg', desc:'钢铁部落在德拉诺的军械船坞',
      bosses:[
        { name:'尼奥库勒·蒸汽碾', emoji:'⚙️', skills:[dmg('蒸汽碾压','⚙️',7,{ stun:1400, sunder:true })] },
        { name:'格鲁布', emoji:'🐗', skills:[dmg('野兽狂袭','🐗',7.5,{ bleed:true, frenzy:true })] },
        { name:'狼王斯卡乌格', emoji:'🐺', skills:[dmg('钢铁狼群','🐺',8,{ aoe:true, cripple:true }), dmg('炮火覆盖','💥',8.5,{ aoe:true, dot:true, weaken:true })] }
      ]
    },
    {
      key:'ataldazar', name:'阿塔达萨', icon:'🏛️', reqLvl:77, waves:10, art:'assets/wow/art/timewalking-bfa-banner.jpg', desc:'赞达拉黄金金字塔,巨魔诸王长眠的陵墓',
      bosses:[
        { name:'瓦兹拉吉', emoji:'🐆', skills:[dmg('神圣狩猎','🐆',7.5,{ bleed:true, frenzy:true })] },
        { name:'监护者沃尔卡', emoji:'🛡️', skills:[dmg('黄金壁垒','🟡',7.5,{ brittle:true, stun:1400 })] },
        { name:'编织者扎克兰', emoji:'🕸️', skills:[dmg('暗影织网','🕸️',8,{ silence:1700, dot:true })] },
        { name:'达萨拉先王雷扎安', emoji:'👑', skills:[dmg('黄金权杖','👑',8.5,{ aoe:true, weaken:true, manaDrain:45 }), dmg('诸王审判','⚔️',9,{ sunder:true, fear:1700, brittle:true })] }
      ]
    },
    {
      key:'uldir', name:'奥迪尔', icon:'🧬', type:'raid', reqLvl:79, waves:13, art:'assets/wow/art/timewalking-bfa-banner.jpg', desc:'泰坦造物实验室,被腐化之血污染的血肉囚牢',
      bosses:[
        { name:'魔血之触', emoji:'🩸', skills:[dmg('腐血爆发','🩸',9,{ aoe:true, plague:true, dot:true })] },
        { name:'垫脚石', emoji:'🪨', skills:[dmg('崩解践踏','🪨',9.5,{ stun:1500, sunder:true })] },
        { name:'禁锢者泽克伏斯', emoji:'🦠', skills:[dmg('腐化注入','🟢',9.5,{ weaken:true, manaDrain:50, dot:true })] },
        { name:'米斯拉克斯', emoji:'🪲', skills:[dmg('湮灭之沙','🟡',10,{ aoe:true, brittle:true, decay:true })] },
        { name:'恐惧之臂沃舒','emoji':'👁️', skills:[dmg('精神腐蚀','👁️',10.5,{ fear:1800, mirror:true, silence:1800 })] },
        { name:'戈霍恩', emoji:'🫀', skills:[dmg('腐化之血','🩸',11.5,{ aoe:true, plague:true, decay2:true }), dmg('古神低语','🌀',12,{ soulLink:true, fear:1900, weaken:true })] }
      ]
    },
    {
      key:'nightmare', name:'翡翠梦魇', icon:'🌳', type:'raid', reqLvl:79, waves:13, art:'assets/wow/art/timewalking-legion-banner.jpg', desc:'翡翠梦境被梦魇侵蚀,萨维斯散播堕落的腐林',
      bosses:[
        { name:'尼提兹', emoji:'🐛', skills:[dmg('梦魇之茧','🕸️',9,{ cripple:true, dot:true })] },
        { name:'噩梦巨龙', emoji:'🐲', skills:[dmg('腐蚀吐息','🟣',9.5,{ aoe:true, decay:true, weaken:true })] },
        { name:'乌索克之灵', emoji:'🐻', skills:[dmg('狂怒撕咬','🐾',10,{ bleed:true, frenzy:true })] },
        { name:'梦魇之龙伊瑟拉', emoji:'🐉', skills:[dmg('堕落之梦','💤',10.5,{ fear:1800, dot:true, manaDrain:45 })] },
        { name:'萨维斯', emoji:'🌑', skills:[dmg('梦魇大军','🌌',11.5,{ aoe:true, fear:1900, decay2:true }), dmg('腐化之握','🩸',12,{ soulDrain:true, brittle:true, silence:1900 })] }
      ]
    },
    {
      key:'atonement', name:'赎罪大厅', icon:'⛪', reqLvl:73, waves:9, art:'assets/wow/art/timewalking-shadowlands-banner.png', desc:'雷文德斯的哥特式审判殿堂,贪婪者的赎罪之地',
      bosses:[
        { name:'石裔典狱官', emoji:'🗿', skills:[dmg('石化打击','🪨',7,{ stun:1400, brittle:true })] },
        { name:'忏悔者阿德琳娜', emoji:'🕯️', skills:[dmg('罪孽箭雨','🏹',7.5,{ aoe:true, bleed:true })] },
        { name:'高阶领主哈卡', emoji:'⚖️', skills:[dmg('审判之锤','⚖️',8,{ weaken:true, sunder:true }), dmg('赎罪烈焰','🔥',8.5,{ aoe:true, dot:true, fear:1500 })] }
      ]
    },
    {
      key:'plaguefall', name:'凋魂之殇', icon:'☣️', reqLvl:75, waves:10, art:'assets/wow/art/timewalking-shadowlands-banner.png', desc:'玛卓克萨斯的瘟疫泥沼,炼金腐化的死亡兵工厂',
      bosses:[
        { name:'全球大瘟疫', emoji:'🦠', skills:[dmg('瘟疫喷涌','🟢',7.5,{ plague:true, dot:true, aoe:true })] },
        { name:'多曼戈斯', emoji:'🧪', skills:[dmg('腐蚀药剂','🧪',8,{ weaken:true, decay:true })] },
        { name:'瘟疫医师玛拉克斯', emoji:'⚗️', skills:[dmg('剧毒之触','☠️',8,{ dot:true, cripple:true })] },
        { name:'屠夫斯特拉达玛', emoji:'🔪', skills:[dmg('腐烂收割','🔪',8.5,{ bleed:true, fear:1500 }), dmg('瘟疫风暴','☣️',9,{ aoe:true, plague:true, decay2:true })] }
      ]
    },
    {
      key:'mists', name:'彼界', icon:'🍃', reqLvl:71, waves:9, art:'assets/wow/art/timewalking-shadowlands-banner.png', desc:'玉色林地深处的迷雾幻境,森林之灵在此考验来客',
      bosses:[
        { name:'因格拉·玛洛克', emoji:'🌳', skills:[dmg('缠根禁锢','🌿',6.5,{ stun:1400, dot:true })] },
        { name:'迷雾呼唤者', emoji:'🌫️', skills:[dmg('迷雾箭雨','🌫️',7,{ aoe:true, weaken:true, mirror:true })] },
        { name:'特雷德欧瓦', emoji:'🦋', skills:[dmg('孢子大军','🍄',7.5,{ aoe:true, plague:true, dot:true }), dmg('蜕变之噬','🐛',8,{ bleed:true, cripple:true, brittle:true })] }
      ]
    },
    {
      key:'theater', name:'苦痛剧场', icon:'⚔️', reqLvl:73, waves:9, art:'assets/wow/art/timewalking-shadowlands-banner.png', desc:'玛卓克萨斯的角斗竞技场,亡者为荣耀与娱乐而厮杀',
      bosses:[
        { name:'角斗士的挑衅', emoji:'🛡️', skills:[dmg('协同围攻','⚔️',7,{ aoe:true, bleed:true })] },
        { name:'血肉钩刃戈莱什', emoji:'🪝', skills:[dmg('钩链拖拽','🪝',7.5,{ cripple:true, sunder:true })] },
        { name:'库尔塔罗克', emoji:'💀', skills:[dmg('灵魂裂解','👻',8,{ soulDrain:true, fear:1600 })] },
        { name:'不朽者莫德雷萨', emoji:'👑', skills:[dmg('死亡之握','🖤',8.5,{ aoe:true, decay2:true, weaken:true }), dmg('永恒裁决','⚖️',9,{ silence:1800, brittle:true })] }
      ]
    },
    {
      key:'waycrest', name:'维克雷斯庄园', icon:'🏚️', reqLvl:74, waves:10, art:'assets/wow/art/timewalking-bfa-banner.jpg', desc:'德鲁斯特女巫盘踞的腐朽庄园,被诅咒的贵族血脉之地',
      bosses:[
        { name:'噬心三姐妹', emoji:'🕯️', skills:[dmg('诅咒齐唱','🎶',7,{ aoe:true, dot:true, manaDrain:40 })] },
        { name:'灵魂巨像', emoji:'🗿', skills:[dmg('恐惧重击','👊',7.5,{ stun:1500, fear:1500 })] },
        { name:'贪食者拉尔', emoji:'🪱', skills:[dmg('腐烂吞噬','🟢',8,{ plague:true, bleed:true })] },
        { name:'维克雷斯领主夫妇', emoji:'👫', skills:[dmg('德鲁斯特仪式','🌑',8.5,{ aoe:true, soulDrain:true, weaken:true }), dmg('荆棘缠绕','🌿',9,{ cripple:true, dot:true, brittle:true })] }
      ]
    },
    {
      key:'kingsrest', name:'国王之眠', icon:'⚰️', reqLvl:76, waves:10, art:'assets/wow/art/timewalking-bfa-banner.jpg', desc:'赞达拉巨魔历代先王长眠的黄金陵墓,盗墓者惊扰了沉睡的死者',
      bosses:[
        { name:'守墓人迪萨克', emoji:'🗿', skills:[dmg('陵墓践踏','🪨',7.5,{ stun:1400, sunder:true })] },
        { name:'监工艾克泽勒', emoji:'⚙️', skills:[dmg('黄金洪流','🟡',8,{ aoe:true, dot:true })] },
        { name:'达卡莱巨像', emoji:'🥇', skills:[dmg('黄金碾压','🟨',8,{ brittle:true, stun:1500 })] },
        { name:'达卡莱先王', emoji:'👑', skills:[dmg('诸王诅咒','💀',8.5,{ aoe:true, fear:1600, weaken:true }), dmg('黄金审判','⚖️',9,{ silence:1800, soulDrain:true })] }
      ]
    },
    {
      key:'nighthold', name:'暗夜要塞', icon:'🌙', type:'raid', reqLvl:79, waves:13, art:'assets/wow/art/timewalking-legion-banner.jpg', desc:'苏拉玛城核心的奥术堡垒,古尔丹引燃军团传送门的最后据点',
      bosses:[
        { name:'蝎钳魔', emoji:'🦂', skills:[dmg('破甲钳击','🦂',9,{ sunder:true, aoe:true })] },
        { name:'提克迪奥斯', emoji:'🧪', skills:[dmg('黏液喷涌','🟢',9.5,{ dot:true, cripple:true, brittle:true })] },
        { name:'占星师埃塔莉丝', emoji:'🔭', skills:[dmg('群星坍缩','🌌',10,{ aoe:true, manaDrain:55, silence:1800 })] },
        { name:'克罗苏斯', emoji:'🔥', skills:[dmg('燃烧践踏','🌋',10,{ aoe:true, dot:true, weaken:true }), dmgP('烈焰崩塌','🌋',5,0.5,{ aoe:true, dot:true, stun:1500, brittle:true, cd:12 })] },
        { name:'大魔导师艾利桑德', emoji:'⏳', skills:[dmg('时光消逝','✨',10.5,{ slow:true, mirror:true, brittle:true }), buffP('时光加速','⏳',0.5,'加速自身时间流速:攻速大幅提升',{ spdBuffSecs:12, spdBuffPct:45 })] },
        { name:'古尔丹', emoji:'😈', skills:[
          dmg('邪能风暴','🟣',11.5,{ aoe:true, dot:true, fear:1800 }),
          dmg('虚空降临','🌑',12.5,{ soulLink:true, silence:2000, decay2:true }),
          buffP('恶魔变身','👿',0.6,'化身至高恶魔:攻击/攻速/减伤暴涨',{ atkBuffSecs:14, atkBuffPct:45, spdBuffSecs:14, spdBuffPct:30, drBuffSecs:14, drBuffPct:0.25 }),
          summonP('军团传送门','🌀',0.35,'撕开传送门,召唤 2 个恶魔爪牙并护盾护体',{ summonCount:2, summonTheme:'void', shieldPct:0.20 }),
          dmgP('湮灭风暴','💥',6,0.3,{ aoe:true, dot:true, silence:2000, fear:1900, brittle:true, alwaysCrit:true, cd:16 })
        ] }
      ]
    },
    {
      key:'nyalotha', name:'尼奥罗萨,觉醒之城', icon:'🐙', type:'raid', reqLvl:79, waves:14, art:'assets/wow/art/timewalking-bfa-banner.jpg', desc:'恩佐斯的虚空之城自梦魇中浮现,古神低语侵蚀着艾泽拉斯',
      bosses:[
        { name:'黑龙王子拉希奥', emoji:'🐲', skills:[dmg('腐化烈焰','🔥',9.5,{ aoe:true, dot:true })] },
        { name:'先知斯基特拉', emoji:'👁️', skills:[dmg('幻象箭雨','🪞',10,{ mirror:true, fear:1700 })] },
        { name:'暗影审讯官沙奈什', emoji:'🟣', skills:[dmg('心智折磨','👁️',10,{ silence:1900, manaDrain:55 })] },
        { name:'沙德拉', emoji:'🦠', skills:[dmg('腐化吐息','🟢',10.5,{ aoe:true, plague:true, decay:true })] },
        { name:'维克希翁', emoji:'🦂', skills:[dmg('湮灭之翼','🌑',11,{ aoe:true, weaken:true, brittle:true }), dmgP('腐化俯冲','🌑',5,0.5,{ aoe:true, weaken:true, decay:true, fear:1700, cd:12 })] },
        { name:'恩佐斯', emoji:'🐙', skills:[
          dmg('万物归虚','🌌',12,{ aoe:true, decay2:true, fear:1900 }),
          dmg('古神低语','👁️',13,{ soulLink:true, silence:2200, mirror:true }),
          buffP('腐化觉醒','🟣',0.6,'古神之力觉醒:攻击与暴击狂涨',{ atkBuffSecs:14, atkBuffPct:50, critBuffSecs:14, critBuffPct:60 }),
          summonP('虚空降生','🐙',0.35,'召唤 2 个虚空爪牙缠绕你并强化护甲',{ summonCount:2, summonTheme:'void', drBuffSecs:12, drBuffPct:0.22 }),
          dmgP('终末低语','👁️',6.5,0.3,{ aoe:true, decay2:true, fear:2000, mirror:true, manaDrain:60, alwaysCrit:true, cd:16 })
        ] }
      ]
    },
    {
      key:'nathria', name:'纳斯利亚堡', icon:'🦇', type:'raid', reqLvl:79, waves:13, art:'assets/wow/art/timewalking-shadowlands-banner.png', desc:'雷文德斯主宰者德纳修斯的哥特城堡,以噬渊之力供养无尽的灵魂',
      bosses:[
        { name:'尖啸之翼', emoji:'🦇', skills:[dmg('回声尖啸','📢',9.5,{ aoe:true, fear:1600 })] },
        { name:'猎手阿尔提莫', emoji:'🏹', skills:[dmg('猎犬撕咬','🐕',9.5,{ bleed:true, cripple:true })] },
        { name:'噬渴灭世者', emoji:'🩸', skills:[dmg('饥渴吞噬','🟣',10,{ aoe:true, soulDrain:true, dot:true })] },
        { name:'达克文女勋爵', emoji:'🩸', skills:[dmg('血池献祭','🟥',10,{ weaken:true, decay2:true })] },
        { name:'鲜血议会', emoji:'⚖️', skills:[dmg('贵族夜宴','🍷',10.5,{ aoe:true, manaDrain:50, brittle:true }), dmgP('血色狂宴','🍷',5,0.5,{ aoe:true, manaDrain:55, bleed:true, brittle:true, cd:12 })] },
        { name:'主宰者德纳修斯', emoji:'👑', skills:[
          dmg('罪碑之刃','🗡️',12,{ aoe:true, sunder:true, weaken:true }),
          dmg('噬渊降临','🕳️',13,{ soulLink:true, fear:2000, decay2:true }),
          buffP('噬渊之力','🕳️',0.6,'汲取噬渊之力:攻击/攻速/吸血暴涨',{ atkBuffSecs:14, atkBuffPct:35, spdBuffSecs:14, spdBuffPct:40, leechBuffSecs:14, leechBuffPct:35 }),
          summonP('石裔大军','🗿',0.35,'唤醒 2 尊石裔魔守卫并护盾护体',{ summonCount:2, summonTheme:'soldier', shieldPct:0.22 }),
          dmgP('湮灭之触','🩸',6.5,0.3,{ aoe:true, soulDrain:true, soulLink:true, weaken:true, decay2:true, alwaysCrit:true, cd:16 })
        ] }
      ]
    },
    {
      key:'vortex', name:'旋云之巅', icon:'🌪️', reqLvl:72, waves:9, art:'assets/wow/art/timewalking-cataclysm-banner.jpg', desc:'巨石之核上方失控旋转的风暴圣堂,气元素肆虐的浮空回廊',
      bosses:[
        { name:'格鲁达鲁', emoji:'💨', skills:[dmg('飓风之拳','🌬️',6.5,{ aoe:true, stun:1400 })] },
        { name:'大主祭奥兹鲁克', emoji:'🪨', skills:[dmg('坠石轰击','🪨',7,{ brittle:true, sunder:true })] },
        { name:'阿萨德', emoji:'🌪️', skills:[dmg('元素旋风','🌪️',7.5,{ aoe:true, slow:true, silence:1700 }), dmg('风暴撕裂','⚡',8,{ dot:true, weaken:true })] }
      ]
    },
    {
      key:'grimrail', name:'铁路深谷', icon:'🚂', reqLvl:74, waves:9, art:'assets/wow/art/timewalking-draenor-banner.jpg', desc:'钢铁部落穿越霜火岭的军用列车,在高速行进中夺取军械',
      bosses:[
        { name:'工头泽奥格雷尔', emoji:'⚙️', skills:[dmg('蒸汽鞭笞','💨',7,{ dot:true, cripple:true })] },
        { name:'永燃者拉克玛雷', emoji:'🔥', skills:[dmg('烈焰炮塔','🔥',7.5,{ aoe:true, dot:true })] },
        { name:'尼托格', emoji:'🐗', skills:[dmg('钢铁践踏','🦏',8,{ stun:1500, bleed:true }), dmg('军列轰炸','💥',8.5,{ aoe:true, brittle:true, weaken:true })] }
      ]
    },
    {
      key:'everbloom', name:'永茂林地', icon:'🌺', reqLvl:75, waves:10, art:'assets/wow/art/timewalking-draenor-banner.jpg', desc:'失控的德拉诺自然之力涌入塔拉多,藤蔓与元素疯长的温室裂口',
      bosses:[
        { name:'古杉魔藤', emoji:'🌿', skills:[dmg('缠绕荆棘','🌿',7,{ cripple:true, dot:true })] },
        { name:'喷涌元素', emoji:'🌊', skills:[dmg('洪流冲击','🌊',7.5,{ aoe:true, slow:true })] },
        { name:'阴森巨兽', emoji:'🐗', skills:[dmg('野性狂袭','🐾',7.5,{ bleed:true, frenzy:true })] },
        { name:'雅雷昆', emoji:'🌺', skills:[dmg('腐化绽放','💮',8,{ aoe:true, plague:true, dot:true }), dmg('自然之怒','🍃',8.5,{ weaken:true, brittle:true, cripple:true })] }
      ]
    },
    {
      key:'neltharus', name:'奈萨利亚熔炉', icon:'🌋', reqLvl:76, waves:10, art:'assets/wow/art/aberrus-banner.jpg', desc:'黑龙军团守护的熔岩兵工厂,炽热的龙裔锻造着毁灭之器',
      bosses:[
        { name:'熔铸者卡格尼', emoji:'🔨', skills:[dmg('炽炎重锤','🔨',7.5,{ sunder:true, stun:1400 })] },
        { name:'守护者陶提斯', emoji:'🛡️', skills:[dmg('熔岩壁垒','🟠',7.5,{ brittle:true, dot:true })] },
        { name:'盗宝龙裔', emoji:'🐲', skills:[dmg('烈焰俯冲','🔥',8,{ aoe:true, bleed:true })] },
        { name:'焰炉之主玛吉莫斯', emoji:'🌋', skills:[dmg('熔炉爆发','🌋',8.5,{ aoe:true, dot:true, weaken:true }), dmg('黑龙烈焰','🐉',9,{ silence:1800, brittle:true, fear:1600 })] }
      ]
    },
    {
      key:'azurevault', name:'碧蓝魔馆', icon:'💠', reqLvl:78, waves:10, art:'assets/wow/art/aberrus-banner.jpg', desc:'蓝龙军团封存奥术遗产的浮空宝库,魔网回声在大厅中失控共鸣',
      bosses:[
        { name:'莱魔', emoji:'🧿', skills:[dmg('奥术撕裂','💠',8,{ silence:1800, manaDrain:50 })] },
        { name:'青刃构装体', emoji:'🤖', skills:[dmg('法力切割','🔷',8.2,{ brittle:true, stun:1400 })] },
        { name:'泰拉什·灰翼', emoji:'🐉', skills:[dmg('碧蓝龙息','🐉',8.6,{ aoe:true, freeze:1500, weaken:true })] },
        { name:'安布雷斯库', emoji:'🌌', skills:[dmg('魔网坍缩','🌌',9,{ aoe:true, mirror:true, silence:1800 }), dmg('奥能终曲','💥',9.5,{ brittle:true, manaDrain:70, decay2:true })] }
      ]
    },
    {
      key:'nokhud', name:'诺库德阻击战', icon:'🏹', reqLvl:78, waves:10, art:'assets/wow/art/amirdrassil-banner.png', desc:'欧恩哈拉平原上的疾风战场,诺库德氏族以弓骑与风暴压制远征军',
      bosses:[
        { name:'格拉尼斯', emoji:'🦅', skills:[dmg('鹰风俯冲','🦅',8,{ bleed:true, cripple:true })] },
        { name:'风暴召唤者巴拉卡尔', emoji:'🌩️', skills:[dmg('雷矛投掷','⚡',8.4,{ stun:1500, sunder:true })] },
        { name:'诺库德猎群', emoji:'🏹', skills:[dmg('箭雨合围','🏹',8.6,{ aoe:true, bleed:true, weaken:true })] },
        { name:'可汗巴拉卡', emoji:'🐎', skills:[dmg('草原践踏','🐎',9,{ aoe:true, fear:1600, brittle:true }), dmg('风暴可汗令','👑',9.5,{ silence:1800, frenzy:true, manaDrain:55 })] }
      ]
    },
    {
      key:'hallsinfusion', name:'注能大厅', icon:'💧', reqLvl:79, waves:10, art:'assets/wow/art/amirdrassil-banner.png', desc:'泰坦水渠与原始元素交汇的注能核心,每一次脉冲都在撕裂防线',
      bosses:[
        { name:'守望者艾瑞克', emoji:'🛡️', skills:[dmg('水盾猛击','🛡️',8.2,{ sunder:true, slow:true })] },
        { name:'注能吞噬者', emoji:'🫧', skills:[dmg('吞噬喷潮','🫧',8.6,{ aoe:true, plague:true, dot:true })] },
        { name:'泰坦水道枢纽', emoji:'⚙️', skills:[dmg('高压喷射','💧',8.8,{ aoe:true, silence:1700, manaDrain:60 })] },
        { name:'原始海啸', emoji:'🌊', skills:[dmg('灭顶浪潮','🌊',9.4,{ aoe:true, freeze:1600, weaken:true }), dmg('潮汐回卷','🌀',9.8,{ mirror:true, soulLink:true, brittle:true })] }
      ]
    },
    {
      key:'brackenhide', name:'蕨皮山谷', icon:'🦴', reqLvl:79, waves:10, art:'assets/wow/art/amirdrassil-banner.png', desc:'腐臭豺狼人占据的林谷营地,炼金毒雾与瘟疫篝火笼罩山道',
      bosses:[
        { name:'劈爪战团', emoji:'🪓', skills:[dmg('乱斧围猎','🪓',8.2,{ bleed:true, aoe:true })] },
        { name:'腐喉', emoji:'🦴', skills:[dmg('腐臭啃咬','🦴',8.6,{ plague:true, cripple:true })] },
        { name:'臭皮炼金师', emoji:'🧪', skills:[dmg('毒雾爆瓶','🧪',8.8,{ aoe:true, dot:true, silence:1700 })] },
        { name:'蕨皮酋长', emoji:'👹', skills:[dmg('瘟疫战吼','👹',9.4,{ fear:1700, weaken:true, frenzy:true }), dmg('腐化屠戮','☠️',9.8,{ aoe:true, plague:true, brittle:true })] }
      ]
    },
    {
      key:'rookery', name:'驭雷栖巢', icon:'🦅', reqLvl:71, waves:9, art:'assets/wow/art/warwithin-rookery.png', desc:'多恩岛高空中的风暴鸦巢穴重新苏醒,雷翼与虚石回响让这座悬崖堡垒成为地心之战前线的第一道空战考验',
      bosses:[
        { name:'基里奥斯', emoji:'🦅', skills:[dmg('雷翼俯冲','⚡',7,{ aoe:true, slow:true, weaken:true }), dmg('风暴啄裂','🪶',7.4,{ bleed:true, cripple:true })] },
        { name:'风暴卫士戈伦', emoji:'⚡', skills:[dmg('虚痕雷矛','⚡',7.6,{ silence:1700, manaDrain:55 }), dmg('栖巢防线','🛡️',8,{ sunder:true, stun:1500 })] },
        { name:'虚石畸体', emoji:'🪨', skills:[dmg('虚石坠压','🪨',8.2,{ aoe:true, brittle:true, stun:1600 }), dmgP('崩巢回响','🌌',4.8,0.45,{ aoe:true, mirror:true, fear:1700, cd:12 })] }
      ]
    },
    {
      key:'cinderbrew', name:'燧酿酒庄', icon:'🍺', reqLvl:75, waves:10, art:'assets/wow/art/warwithin-cinderbrew.png', desc:'喧闹的燧酿酒庄被蜂群、烈酒与爆燃蜜浆彻底接管,每一条酒窖通道都在逼你同时处理控场与爆发',
      bosses:[
        { name:'酿造大师奥德里尔', emoji:'🍺', skills:[dmg('滚烫麦浆','🍺',7.4,{ dot:true, weaken:true }), dmg('酒桶冲击','🛢️',7.8,{ aoe:true, stun:1400 })] },
        { name:'伊帕', emoji:'🔥', skills:[dmg('烈酿喷焰','🔥',8,{ dot:true, brittle:true, silence:1700 }), dmgP('炽泡翻腾','☄️',4.8,0.48,{ aoe:true, fear:1600, cd:12 })] },
        { name:'本克·嗡鸣', emoji:'🐝', skills:[dmg('蜂潮突刺','🐝',8.2,{ bleed:true, plague:true, cripple:true }), summonP('蜜蜡工蜂','🍯',0.5,'召唤 2 只工蜂并提高攻速',{ summonCount:2, summonTheme:'beast', spdBuffSecs:12, spdBuffPct:24 })] },
        { name:'戈尔迪·底金男爵', emoji:'💰', skills:[dmg('蜜金清算','💰',8.8,{ aoe:true, manaDrain:70, silence:1800 }), dmg('酒庄爆仓','💥',9.2,{ dot:true, fear:1700, brittle:true })] }
      ]
    },
    {
      key:'darkflame', name:'暗焰裂口', icon:'🕯️', reqLvl:76, waves:10, art:'assets/wow/art/warwithin-darkflame.png', desc:'蜡焰与阴影在裂口深处彼此吞噬,越深入越像是在一座会呼吸的地底祭坛里作战',
      bosses:[
        { name:'老蜡须', emoji:'🕯️', skills:[dmg('熔蜡砸击','🕯️',7.8,{ dot:true, sunder:true }), dmg('烛火扑面','🔥',8.1,{ silence:1700, weaken:true })] },
        { name:'布雷兹康', emoji:'🔥', skills:[dmg('暗焰吐息','🔥',8.4,{ aoe:true, dot:true, brittle:true }), dmgP('焚芯坠落','☄️',4.9,0.45,{ aoe:true, fear:1700, cd:12 })] },
        { name:'蜡烛之王', emoji:'👑', skills:[dmg('烛王敕令','👑',8.7,{ silence:1800, manaDrain:65 }), summonP('烛影侍臣','🕯️',0.5,'召唤 2 名烛影侍臣并获得护盾',{ summonCount:2, summonTheme:'construct', shieldPct:0.16 })] },
        { name:'黑暗化身', emoji:'🌑', skills:[dmg('暗焰吞界','🌑',9.3,{ aoe:true, decay2:true, mirror:true }), dmg('裂口终烬','💥',9.8,{ fear:1800, brittle:true, alwaysCrit:true })] }
      ]
    },
    {
      key:'dawnbreaker', name:'破晓号', icon:'🛩️', reqLvl:77, waves:10, art:'assets/wow/art/warwithin-dawnbreaker.png', desc:'这艘阿拉希战舰在陨圣峪上空不断转移战线,甲板、吊桥与蛛魔空降兵把整场战斗压成一场高速突袭',
      bosses:[
        { name:'影冠发言者', emoji:'🌑', skills:[dmg('影丝布道','🌑',8.2,{ silence:1800, weaken:true, manaDrain:65 }), summonP('影冠随从','📣',0.5,'召唤影冠随从并提高暴击',{ summonCount:2, summonTheme:'spider', critBuffSecs:12, critBuffPct:42 })] },
        { name:'阿努布伊卡基', emoji:'🕷️', skills:[dmg('王廷毒刺','🕷️',8.6,{ plague:true, bleed:true, cripple:true }), dmgP('高空扑网','🕸️',5,0.45,{ aoe:true, fear:1700, cd:12 })] },
        { name:'拉夏南', emoji:'🦅', skills:[dmg('空袭毒矢','🦅',9.1,{ aoe:true, plague:true, slow:true }), dmg('破晓折翼','⚡',9.6,{ silence:1900, brittle:true, alwaysCrit:true })] }
      ]
    },
    {
      key:'arakara', name:'阿拉-卡拉,回响之城', icon:'🕸️', reqLvl:78, waves:10, art:'assets/wow/art/warwithin-arakara.png', desc:'回响之城的蛛网巷道遍布旧帝国残响,每一处路口都可能同时涌出孵群、刺客与精神压制',
      bosses:[
        { name:'阿瓦诺克斯', emoji:'🕷️', skills:[dmg('丝巢撕咬','🕷️',8.5,{ bleed:true, lifeSteal:0.2, cripple:true }), summonP('孵群回响','🥚',0.5,'召唤 2 只孵群幼体并获得护盾',{ summonCount:2, summonTheme:'spider', shieldPct:0.16 })] },
        { name:'阿努布泽克特', emoji:'🦂', skills:[dmg('泽克特毒雨','🦂',8.9,{ aoe:true, plague:true, dot:true }), dmg('回响穿刺','🕸️',9.2,{ silence:1900, brittle:true })] },
        { name:'收割者基卡塔尔', emoji:'🕸️', skills:[dmg('收割绞丝','🕸️',9.6,{ aoe:true, soulLink:true, manaDrain:75 }), dmgP('王廷收成','🌌',5.2,0.42,{ aoe:true, mirror:true, fear:1800, cd:12 })] }
      ]
    },
    {
      key:'citythreads', name:'千丝之城', icon:'🧵', reqLvl:80, waves:10, art:'assets/wow/art/warwithin-citythreads.png', desc:'艾基-卡赫特最核心的蛛魔都市把宫廷政治、织丝仪轨和战时封锁压在同一张网里,是一条真正贴着王宫门槛的高压路线',
      bosses:[
        { name:'第五纱网演说家克里克斯维兹克', emoji:'🧿', skills:[dmg('纱网宣令','🧿',9,{ silence:1900, weaken:true, manaDrain:75 }), dmg('会场绞杀','🧵',9.3,{ aoe:true, cripple:true, fear:1700 })] },
        { name:'女王之牙', emoji:'🗡️', skills:[dmg('利刃献礼','🗡️',9.4,{ bleed:true, brittle:true, alwaysCrit:true }), dmgP('暗巢疾袭','🌑',5.1,0.45,{ aoe:true, silence:1900, cd:12 })] },
        { name:'凝结聚合体', emoji:'🧫', skills:[dmg('黑血聚爆','🧫',9.6,{ aoe:true, plague:true, decay2:true }), summonP('凝结血块','🩸',0.5,'召唤 2 个凝结血块并提高减伤',{ summonCount:2, summonTheme:'void', drBuffSecs:12, drBuffPct:0.18 })] },
        { name:'大切接师伊佐', emoji:'⚔️', skills:[dmg('切接终线','⚔️',10,{ silence:2000, sunder:true, brittle:true }), dmg('王宫缝杀','🌌',10.4,{ aoe:true, mirror:true, fear:1800, alwaysCrit:true })] }
      ]
    },
    {
      key:'eternalpalace', name:'阿萨拉的永恒王宫', icon:'🔱', type:'raid', reqLvl:79, waves:13, art:'assets/wow/art/timewalking-bfa-banner.jpg', desc:'纳沙塔尔深海之下,女王阿兹莎拉以古神之力召唤暗影的海妖王庭',
      bosses:[
        { name:'暗鳞军团', emoji:'🐟', skills:[dmg('深海齐射','🌊',9,{ aoe:true, dot:true })] },
        { name:'飘雾艾尔', emoji:'🪼', skills:[dmg('迷雾毒针','🟣',9.5,{ plague:true, cripple:true })] },
        { name:'深渊指挥官西瓦拉', emoji:'❄️', skills:[dmg('寒潮冻结','🧊',10,{ freeze:1600, slow:true, weaken:true }), dmgP('绝对零度','❄️',5,0.5,{ aoe:true, freeze:1700, brittle:true, cd:12 })] },
        { name:'黑暗预言者', emoji:'👁️', skills:[dmg('虚空低语','🌑',10.5,{ silence:1900, fear:1700, mirror:true })] },
        { name:'深渊领主', emoji:'🦑', skills:[dmg('深渊缠绕','🐙',11,{ aoe:true, soulLink:true, manaDrain:55 })] },
        { name:'阿兹莎拉女王', emoji:'👑', skills:[
          dmg('女王魔咒','💫',12,{ aoe:true, mirror:true, silence:2000 }),
          dmg('深渊洪流','🌊',13,{ soulLink:true, decay2:true, fear:1900 }),
          buffP('古神赐福','🐙',0.6,'承接恩佐斯之力:攻击/暴击/攻速暴涨',{ atkBuffSecs:14, atkBuffPct:45, critBuffSecs:14, critBuffPct:55, spdBuffSecs:14, spdBuffPct:25 }),
          summonP('深渊唤潮','🪼',0.35,'召唤 2 个深渊爪牙并护盾护体',{ summonCount:2, summonTheme:'void', shieldPct:0.22 }),
          dmgP('星辰之怒','🌌',6.5,0.3,{ aoe:true, decay2:true, silence:2100, fear:2000, mirror:true, alwaysCrit:true, cd:16 })
        ] }
      ]
    },
    {
      key:'aberrus', name:'厄苏戈尔,暗影熔炉', icon:'🔥', type:'raid', reqLvl:79, waves:13, art:'assets/wow/art/aberrus-banner.jpg', desc:'死亡之翼当年的炼成之所,黑龙萨拉塔斯重启了奈萨里奥的禁忌实验',
      bosses:[
        { name:'卡赞', emoji:'🌀', skills:[dmg('奥术湮灭','✨',9.5,{ aoe:true, manaDrain:55, silence:1800 })] },
        { name:'焚化者拉什卡尔', emoji:'🔥', skills:[dmg('熔火喷涌','🌋',10,{ aoe:true, dot:true, brittle:true }), dmgP('烈焰风暴','🔥',5,0.5,{ aoe:true, dot:true, weaken:true, cd:12 })] },
        { name:'鲜血法师沙拉嘎', emoji:'🩸', skills:[dmg('血肉重塑','💉',10,{ soulDrain:true, plague:true })] },
        { name:'禁锢魔像', emoji:'🤖', skills:[dmg('崩解打击','⚙️',10.5,{ stun:1600, sunder:true })] },
        { name:'黑龙萨拉塔斯', emoji:'🐉', skills:[dmg('暗影烈焰','🌑',11,{ aoe:true, dot:true, fear:1700 })] },
        { name:'化身奈萨里奥', emoji:'🐲', skills:[
          dmg('熔岩崩裂','🌋',12,{ aoe:true, dot:true, sunder:true }),
          dmg('暗影虹吸','🖤',13,{ soulDrain:true, soulLink:true, weaken:true }),
          buffP('熔铸狂怒','🔨',0.6,'熔炉之力灌注全身:攻击/攻速/减伤暴涨',{ atkBuffSecs:14, atkBuffPct:48, spdBuffSecs:14, spdBuffPct:30, drBuffSecs:14, drBuffPct:0.22 }),
          summonP('熔火造物','🤖',0.35,'熔炉中唤出 2 个炽炎造物助战',{ summonCount:2, summonTheme:'elemental', shieldPct:0.20 }),
          dmgP('湮灭烈焰','💥',6.5,0.3,{ aoe:true, dot:true, brittle:true, fear:2000, silence:2000, alwaysCrit:true, cd:16 })
        ] }
      ]
    },
    {
      key:'amirdrassil', name:'阿米德拉希尔,希望之梦', icon:'🌳', type:'raid', reqLvl:79, waves:14, art:'assets/wow/art/amirdrassil-banner.png', desc:'守护新生世界之树,抵御炎魔之王弗拉戈斯将梦境付之一炬的终局会战',
      bosses:[
        { name:'古加冯', emoji:'🐗', skills:[dmg('远古践踏','🦶',9.5,{ aoe:true, stun:1500 })] },
        { name:'史矛莱什', emoji:'🐛', skills:[dmg('腐化吐息','🟣',10,{ plague:true, dot:true, weaken:true })] },
        { name:'拉莎农', emoji:'🦅', skills:[dmg('烈风箭雨','🌬️',10,{ aoe:true, bleed:true }), dmgP('风暴俯冲','⚡',5,0.5,{ aoe:true, slow:true, brittle:true, cd:12 })] },
        { name:'织焰巫女', emoji:'🔥', skills:[dmg('梦火灼烧','🔥',10.5,{ dot:true, silence:1800 })] },
        { name:'暮光化身', emoji:'🌑', skills:[dmg('暗影裂解','🌑',11,{ aoe:true, fear:1800, mirror:true })] },
        { name:'炎魔之王弗拉戈斯', emoji:'🌋', skills:[
          dmg('焚梦烈焰','🔥',12,{ aoe:true, dot:true, brittle:true }),
          dmg('世界树之殇','🌳',13,{ soulLink:true, decay2:true, weaken:true }),
          buffP('炎魔降临','😈',0.6,'炎魔之力全开:攻击/攻速/吸血暴涨',{ atkBuffSecs:14, atkBuffPct:46, spdBuffSecs:14, spdBuffPct:32, leechBuffSecs:14, leechBuffPct:30 }),
          summonP('烈焰子嗣','🔥',0.35,'从烈焰中唤出 2 个炎魔爪牙',{ summonCount:2, summonTheme:'elemental', drBuffSecs:12, drBuffPct:0.2 }),
          dmgP('末日烈焰','☄️',7,0.3,{ aoe:true, dot:true, fear:2100, silence:2100, brittle:true, alwaysCrit:true, cd:16 })
        ] }
      ]
    },
    {
      key:'stonevault', name:'矶石宝库', icon:'🏛️', reqLvl:88, waves:10, art:'assets/wow/art/warwithin-stonevault.png', desc:'多恩岛地底的泰坦宝库,土灵守卫与失控机械共同保护沉睡矩阵',
      bosses:[
        { name:'掌炉者艾里克', emoji:'⚒️', skills:[dmg('熔炉重击','🔨',9.5,{ sunder:true, stun:1600 }), dmgP('熔炉过载','🔥',5.5,0.5,{ aoe:true, dot:true, brittle:true, cd:12 })] },
        { name:'晶化守卫', emoji:'💠', skills:[dmg('晶体切割','🔷',10,{ brittle:true, manaDrain:65 }), buffP('晶壁重组','🛡️',0.55,'晶体壁垒重组:减伤和防御提升',{ defBuffSecs:12, defBuffPct:45, drBuffSecs:12, drBuffPct:0.2 })] },
        { name:'机械议长布洛克', emoji:'⚙️', skills:[dmg('钻机齐射','⚙️',10.5,{ aoe:true, silence:1900 }), dmg('齿轮断裂','💥',11,{ stun:1700, cripple:true, brittle:true })] },
        { name:'虚空矩阵守护者', emoji:'🌀', skills:[
          dmg('矩阵坍缩','🌀',11.5,{ aoe:true, mirror:true, manaDrain:85 }),
          dmg('泰坦重置','⏳',12,{ silence:2200, decay2:true, weaken:true }),
          buffP('守护协议','🛡️',0.6,'启动守护协议:攻击/减伤/暴击提升',{ atkBuffSecs:14, atkBuffPct:42, critBuffSecs:14, critBuffPct:45, drBuffSecs:14, drBuffPct:0.22 }),
          summonP('矩阵卫士','🤖',0.35,'召唤 2 个矩阵卫士并获得护盾',{ summonCount:2, summonTheme:'construct', shieldPct:0.2 }),
          dmgP('虚空归档','🌌',6.8,0.3,{ aoe:true, silence:2300, fear:1900, brittle:true, alwaysCrit:true, cd:16 })
        ] }
      ]
    },
    {
      key:'prioryflame', name:'圣焰隐修院', icon:'✝️', reqLvl:90, waves:10, art:'assets/wow/art/warwithin-prioryflame.png', desc:'陨圣峪的阿拉希圣焰堡垒,光明与狂热在地下苍穹下爆燃',
      bosses:[
        { name:'信标守卫加伦', emoji:'🛡️', skills:[dmg('信标盾击','🛡️',10,{ sunder:true, stun:1600 }), dmg('圣焰回旋','🔥',10.2,{ aoe:true, dot:true })] },
        { name:'烛光修士艾丹', emoji:'🕯️', skills:[dmg('烛焰诅咒','🕯️',10.5,{ dot:true, weaken:true, silence:1800 }), summonP('唤烛仪式','✨',0.55,'召唤圣焰信徒并提高攻速',{ summonCount:1, summonTheme:'soldier', spdBuffSecs:12, spdBuffPct:24 })] },
        { name:'圣焰骑士团', emoji:'⚔️', skills:[dmg('列阵冲锋','⚔️',11,{ aoe:true, bleed:true, cripple:true }), dmgP('殉道爆燃','☄️',5.8,0.45,{ aoe:true, dot:true, fear:1700, cd:12 })] },
        { name:'隐修院长穆普雷', emoji:'✝️', skills:[
          dmg('神圣烈焰','🔥',12,{ dot:true, brittle:true, silence:2000 }),
          dmg('圣光审判','✨',12.5,{ aoe:true, weaken:true, manaDrain:85 }),
          buffP('狂热圣约','🙏',0.6,'圣约狂热:攻击/暴击/吸血提升',{ atkBuffSecs:14, atkBuffPct:44, critBuffSecs:14, critBuffPct:48, leechBuffSecs:14, leechBuffPct:24 }),
          summonP('圣焰援军','📣',0.35,'召唤 2 名圣焰援军',{ summonCount:2, summonTheme:'soldier', shieldPct:0.18 }),
          dmgP('阿拉希终判','☄️',7,0.3,{ aoe:true, dot:true, silence:2300, fear:1900, alwaysCrit:true, cd:16 })
        ] }
      ]
    },
    {
      key:'nightfall_sanctum', name:'夜落圣所地下堡', icon:'🔒', reqLvl:91, waves:6, delve:true, art:'assets/wow/art/warwithin-dungeon-banner.png', desc:'短波次地下堡挑战:潜入陨圣峪暗潮据点,用更少波次换取更密集的首领压迫',
      bosses:[
        { name:'暗潮钥卫', emoji:'🔒', skills:[dmg('暗潮钥击','🗝️',10.5,{ silence:1900, sunder:true }), dmg('黑水喷涌','🌑',11,{ aoe:true, plague:true, dot:true })] },
        { name:'低语宝箱', emoji:'📦', skills:[dmg('贪婪低语','👁️',11.5,{ fear:1800, soulDrain:true, manaDrain:75 }), buffP('宝箱反噬','💜',0.5,'宝箱反噬:攻击与减伤提升',{ atkBuffSecs:12, atkBuffPct:40, drBuffSecs:12, drBuffPct:0.2 })] },
        { name:'夜落看守者', emoji:'🌑', skills:[
          dmg('夜落镰击','🌑',12,{ bleed:true, brittle:true }),
          dmg('虚空封门','🔒',12.5,{ aoe:true, silence:2200, mirror:true }),
          summonP('暗潮伏兵','👥',0.45,'召唤 2 名伏兵并提高暴击',{ summonCount:2, summonTheme:'void', critBuffSecs:12, critBuffPct:45 }),
          dmgP('地下堡崩塌','🌀',7,0.3,{ aoe:true, decay2:true, fear:1900, alwaysCrit:true, cd:15 })
        ] }
      ]
    },
    {
      key:'earthcrawl_mines', name:'地匍矿洞地下堡', icon:'⚒️', reqLvl:89, waves:6, delve:true, art:'assets/wow/art/warwithin-dungeon-banner.png', desc:'多恩岛地下的蛛网矿坑,矿车轨道与蛛魔巢穴交错,适合短线高压挑战',
      bosses:[
        { name:'蛛网矿工队', emoji:'🕷️', skills:[dmg('蛛网矿镐','⚒️',10.2,{ bleed:true, sunder:true }), dmg('毒丝喷溅','🕸️',10.8,{ aoe:true, plague:true, cripple:true })] },
        { name:'工头皮夫克', emoji:'⚙️', skills:[dmg('钻机冲撞','⚙️',11.2,{ stun:1700, brittle:true }), buffP('超载矿灯','💡',0.5,'矿灯超载:攻击与暴击提升',{ atkBuffSecs:12, atkBuffPct:38, critBuffSecs:12, critBuffPct:42 })] },
        { name:'地匍蛛母', emoji:'🕷️', skills:[
          dmg('地匍毒咬','☣️',11.8,{ plague:true, dot:true, brittle:true }),
          dmg('矿洞塌方','🪨',12.2,{ aoe:true, stun:1800, decay2:true }),
          summonP('蛛卵孵化','🥚',0.48,'召唤 2 只蛛魔幼体并获得护盾',{ summonCount:2, summonTheme:'spider', shieldPct:0.18 }),
          dmgP('蛛网封矿','🕸️',6.8,0.32,{ aoe:true, silence:2100, cripple:true, alwaysCrit:true, cd:15 })
        ] }
      ]
    },
    {
      key:'fungal_folly', name:'真菌之愚地下堡', icon:'🍄', reqLvl:90, waves:6, delve:true, art:'assets/wow/art/warwithin-dungeon-banner.png', desc:'充满发光孢子的荒诞地下堡,孢子云会让短波次战斗变得更凶险',
      bosses:[
        { name:'孢子看守', emoji:'🍄', skills:[dmg('孢子鞭笞','🌿',10.4,{ dot:true, weaken:true }), dmg('菌雾爆裂','☣️',11,{ aoe:true, plague:true })] },
        { name:'蘑菇术士维洛', emoji:'🧙', skills:[dmg('菌丝诅咒','💜',11.3,{ silence:1900, manaDrain:70, soulDrain:true }), summonP('唤醒蘑菇人','🍄',0.52,'召唤蘑菇仆从并提高攻速',{ summonCount:2, summonTheme:'plant', spdBuffSecs:12, spdBuffPct:24 })] },
        { name:'菌潮巨怪', emoji:'🧌', skills:[
          dmg('腐殖重拳','👊',12,{ sunder:true, stun:1700 }),
          dmg('孢子潮汐','☣️',12.4,{ aoe:true, plague:true, dot:true }),
          buffP('真菌再生','🌿',0.55,'真菌再生:回复并提高减伤',{ healPct:0.18, drBuffSecs:12, drBuffPct:0.2, defBuffSecs:12, defBuffPct:38 }),
          dmgP('愚者盛放','🍄',6.9,0.32,{ aoe:true, fear:1900, silence:2100, brittle:true, cd:15 })
        ] }
      ]
    },
    {
      key:'archival_assault', name:'档案突袭地下堡', icon:'📜', reqLvl:96, waves:6, delve:true, art:'assets/wow/art/tazavesh-banner.png', desc:'虚灵海盗洗劫蓝龙档案库,相位斗篷会开启额外挑战门与首领房间',
      bosses:[
        { name:'档案劫掠者', emoji:'📜', skills:[dmg('卷宗切割','📜',12.2,{ sunder:true, silence:1900 }), dmg('奥术爆页','💠',12.6,{ aoe:true, manaDrain:85, brittle:true })] },
        { name:'相位门卫欧索', emoji:'🌀', skills:[dmg('相位门击','🌀',13,{ mirror:true, stun:1700 }), buffP('折光护幕','💠',0.55,'折光护幕:闪避/减伤/暴击提升',{ critBuffSecs:12, critBuffPct:46, drBuffSecs:12, drBuffPct:0.22 })] },
        { name:'节点公主凯维扎', emoji:'🧿', skills:[
          dmg('节点处刑','🧿',13.4,{ silence:2200, brittle:true, soulDrain:true }),
          dmg('蓝龙档案过载','💠',13.8,{ aoe:true, manaDrain:100, decay2:true }),
          summonP('虚灵海盗','🏴',0.48,'召唤 2 名虚灵海盗并获得护盾',{ summonCount:2, summonTheme:'void', shieldPct:0.2 }),
          dmgP('相位审判','🌌',7.5,0.3,{ aoe:true, mirror:true, fear:2100, alwaysCrit:true, cd:15 })
        ] }
      ]
    },
    {
      key:'ecodome_aldani', name:"生态圆顶阿尔达尼", icon:'🍃', reqLvl:97, waves:10, art:'assets/wow/art/ecodome-rhovan.png', desc:'卡雷什珍贵生态圆顶被荒原掠夺者占据,吞噬者正在啃食残存生命',
      bosses:[
        { name:'阿尔达尼吞噬者', emoji:'🦎', skills:[dmg('生命啃噬','🩸',13,{ lifeSteal:0.22, plague:true }), dmg('圆顶撕裂','🍃',13.2,{ aoe:true, sunder:true })] },
        { name:'荒原双子', emoji:'⚔️', skills:[dmg('荒原合击','⚔️',13.5,{ bleed:true, cripple:true }), summonP('掠夺帮众','📣',0.5,'召唤荒原帮众并提高攻击',{ summonCount:2, summonTheme:'soldier', atkBuffSecs:12, atkBuffPct:36 })] },
        { name:'生态看护者阿尔达尼', emoji:'🍃', skills:[
          dmg('温室脉冲','🍃',14,{ aoe:true, weaken:true }),
          dmg('奥术授粉','💠',14.3,{ dot:true, manaDrain:95, silence:2100 }),
          buffP('生态复苏','🌿',0.58,'生态复苏:回复并提高防御/减伤',{ healPct:0.2, defBuffSecs:13, defBuffPct:42, drBuffSecs:13, drBuffPct:0.22 }),
          dmgP('圆顶过载','✨',7.8,0.3,{ aoe:true, alwaysCrit:true, brittle:true, fear:2100, cd:16 })
        ] }
      ]
    },
    {
      key:'oasis_succession', name:'绿洲生态圆顶防卫', icon:'🌱', reqLvl:98, waves:8, art:'assets/wow/art/ecodome-rhovan.png', desc:'护送生态样本进入卡雷什绿洲圆顶,吞噬者会优先攻击刚复苏的物种巢穴',
      bosses:[
        { name:'水化幼体群', emoji:'🦎', skills:[dmg('水化啃噬','💧',13.2,{ lifeSteal:0.2, plague:true }), dmg('幼体撕咬','🩸',13.5,{ bleed:true, cripple:true })] },
        { name:'入侵孢母', emoji:'🍄', skills:[dmg('侵蚀孢云','☣️',13.8,{ aoe:true, plague:true, dot:true }), summonP('孢子幼体','🍄',0.5,'召唤 2 个孢子幼体并获得护盾',{ summonCount:2, summonTheme:'plant', shieldPct:0.18 })] },
        { name:'绿洲守望者菲拉', emoji:'🌱', skills:[
          dmg('守望藤鞭','🌿',14.2,{ sunder:true, stun:1700 }),
          dmg('生态反冲','🍃',14.5,{ aoe:true, weaken:true }),
          buffP('绿洲复苏','🌱',0.58,'绿洲复苏:回复并提高防御/减伤',{ healPct:0.22, defBuffSecs:14, defBuffPct:44, drBuffSecs:14, drBuffPct:0.22 }),
          dmgP('生命网爆发','🌿',7.8,0.32,{ aoe:true, alwaysCrit:true, brittle:true, fear:2100, cd:16 })
        ] }
      ]
    },
    {
      key:'tazavesh_streets', name:'塔扎维什:帷纱街巷', icon:'💠', reqLvl:98, waves:10, art:'assets/wow/art/tazavesh-banner.png', desc:'帷纱集市的回归街区,掮灵、虚灵与失控交易契约把每条巷道都变成战场',
      bosses:[
        { name:'佐·帕克斯', emoji:'📦', skills:[dmg('快递碾压','📦',13.2,{ stun:1700, sunder:true }), dmg('市场震荡','💥',13.5,{ aoe:true, brittle:true })] },
        { name:'卖品会', emoji:'🛒', skills:[dmg('竞拍乱斗','🛒',13.8,{ bleed:true, cripple:true }), summonP('竞拍保镖','📣',0.5,'召唤竞拍保镖并提高暴击',{ summonCount:2, summonTheme:'soldier', critBuffSecs:12, critBuffPct:44 })] },
        { name:'麦扎的绿洲', emoji:'🎵', skills:[dmg('音浪爆破','🎵',14,{ aoe:true, silence:2100 }), buffP('绿洲返场','✨',0.55,'绿洲返场:回复并提高攻速',{ healPct:0.18, spdBuffSecs:12, spdBuffPct:28 })] },
        { name:'索·莉亚', emoji:'💎', skills:[
          dmg('超光束切割','💎',14.5,{ mirror:true, brittle:true }),
          dmg('财团扣押','📜',14.8,{ aoe:true, manaDrain:105, silence:2200 }),
          summonP('绿洲安保','🧿',0.45,'召唤 2 名安保并获得护盾',{ summonCount:2, summonTheme:'void', shieldPct:0.2 }),
          dmgP('索财终幕','🌌',7.8,0.3,{ aoe:true, alwaysCrit:true, fear:2200, cd:16 })
        ] }
      ]
    },
    {
      key:'tazavesh_gambit', name:'塔扎维什:索财的宏图', icon:'🧿', reqLvl:99, waves:10, art:'assets/wow/art/tazavesh-banner.png', desc:'索·莉亚的宏图牵动星界航线,海盗、星术师与财团债务追猎者一同登场',
      bosses:[
        { name:'海盗议会', emoji:'🏴', skills:[dmg('财团炮击','💥',13.6,{ aoe:true, bleed:true }), dmg('登船钩索','⚓',13.8,{ stun:1700, cripple:true })] },
        { name:'邮件室混乱体', emoji:'📦', skills:[dmg('错投爆弹','💣',14,{ aoe:true, dot:true }), buffP('超量分拣','⚙️',0.5,'超量分拣:攻击/减伤提升',{ atkBuffSecs:12, atkBuffPct:42, drBuffSecs:12, drBuffPct:0.2 })] },
        { name:'希尔布兰德', emoji:'🤖', skills:[dmg('净化协议','⚙️',14.2,{ silence:2200, sunder:true }), dmg('泰坦安保光束','✨',14.5,{ aoe:true, alwaysCrit:true })] },
        { name:'索·莉亚的宏图', emoji:'🌌', skills:[
          dmg('星界抵押','🌌',15,{ manaDrain:115, soulDrain:true }),
          dmg('市场坍缩','🌀',15.2,{ aoe:true, mirror:true, decay2:true }),
          summonP('债务收割者','💠',0.45,'召唤 3 名债务收割者',{ summonCount:3, summonTheme:'void', shieldPct:0.22 }),
          dmgP('宏图清算','💎',8,0.3,{ aoe:true, silence:2400, fear:2300, alwaysCrit:true, cd:16 })
        ] }
      ]
    },
    {
      key:'overlook_zoshul', name:'佐舒尔瞰台地下堡', icon:'🔭', reqLvl:99, waves:6, delve:true, art:'assets/wow/art/shandorah.png', desc:'佐舒尔高处的相位瞰台被改造成锁定圆顶航线的观测站,是一座短波次高压地下堡',
      bosses:[
        { name:'瞰台测绘师', emoji:'🔭', skills:[dmg('测距切线','📐',13.2,{ silence:2000, brittle:true }), dmg('瞰台坠星','🌠',13.4,{ aoe:true, weaken:true })] },
        { name:'裂隙校准体', emoji:'🌀', skills:[dmg('校准脉冲','🌀',13.7,{ mirror:true, manaDrain:100 }), buffP('相位复位','💠',0.52,'相位复位:减伤与暴击提升',{ critBuffSecs:12, critBuffPct:46, drBuffSecs:12, drBuffPct:0.22 })] },
        { name:'瞰台司辰扎里克', emoji:'✨', skills:[
          dmg('司辰裁定','✨',14.2,{ silence:2200, soulDrain:true }),
          dmg('观测归零','🌌',14.6,{ aoe:true, mirror:true, decay2:true }),
          summonP('折光卫兵','🔷',0.45,'召唤 2 名折光卫兵并获得护盾',{ summonCount:2, summonTheme:'construct', shieldPct:0.2 }),
          dmgP('群星锁定','🌠',7.9,0.3,{ aoe:true, fear:2200, brittle:true, alwaysCrit:true, cd:15 })
        ] }
      ]
    },
    {
      key:'ecodome_rhovan', name:'生态圆顶:罗凡', icon:'🌿', reqLvl:100, waves:10, art:'assets/wow/art/ecodome-rhovan.png', desc:'尚未完全复苏的罗凡圆顶充满失控灌溉与吞噬者巢群,每一条生命谱系都需要守住',
      bosses:[
        { name:'灌溉执机者', emoji:'💧', skills:[dmg('回灌脉冲','💧',13.5,{ weaken:true, manaDrain:95 }), dmg('苗圃冲蚀','🌿',13.8,{ aoe:true, sunder:true })] },
        { name:'吞壤孵母', emoji:'🦎', skills:[dmg('吞壤啃噬','🩸',14,{ lifeSteal:0.24, plague:true }), summonP('孵群破壳','🥚',0.5,'召唤 2 只孵群幼体并获得护盾',{ summonCount:2, summonTheme:'beast', shieldPct:0.18 })] },
        { name:'谱系修补师', emoji:'🧬', skills:[dmg('谱系重写','🧬',14.2,{ silence:2200, mirror:true }), buffP('温室纠偏','🌱',0.55,'温室纠偏:回复并提高防御/减伤',{ healPct:0.2, defBuffSecs:13, defBuffPct:42, drBuffSecs:13, drBuffPct:0.22 })] },
        { name:'芽冠主脑瑞欧萨', emoji:'🌿', skills:[
          dmg('芽冠洪流','🌿',14.8,{ aoe:true, dot:true, brittle:true }),
          dmg('罗凡共振','💠',15.1,{ manaDrain:110, silence:2300 }),
          summonP('样本守卫','🍃',0.45,'召唤 2 名样本守卫并提高攻速',{ summonCount:2, summonTheme:'plant', spdBuffSecs:12, spdBuffPct:26 }),
          dmgP('谱系坍缩','🧬',8.1,0.3,{ aoe:true, fear:2200, weaken:true, alwaysCrit:true, cd:16 })
        ] }
      ]
    },
    {
      key:'shadowpoint_breach', name:'影点突破', icon:'🌑', reqLvl:100, waves:10, art:'assets/wow/art/shadow-point.png', desc:'对 Shadow Point 发动反突击,影卫把裂隙火炮、航线界钉和虚空守军缝成了一整座战场',
      bosses:[
        { name:'界钉炮手', emoji:'⚙️', skills:[dmg('界钉贯体','⚙️',13.7,{ sunder:true, brittle:true }), dmg('火炮回震','💥',14,{ aoe:true, stun:1700 })] },
        { name:'裂航狙击队', emoji:'🎯', skills:[dmg('裂航点射','🎯',14.1,{ alwaysCrit:true, cripple:true }), summonP('瞄准副官','📣',0.5,'召唤 2 名副官并提高暴击',{ summonCount:2, summonTheme:'soldier', critBuffSecs:12, critBuffPct:44 })] },
        { name:'影卫相位校尉', emoji:'🧿', skills:[dmg('相位横切','🌀',14.4,{ mirror:true, silence:2200 }), buffP('影点轮转','🌑',0.55,'影点轮转:攻击/减伤提升',{ atkBuffSecs:12, atkBuffPct:42, drBuffSecs:12, drBuffPct:0.22 })] },
        { name:'影卫指挥官索拉辛', emoji:'🌌', skills:[
          dmg('裂轨处刑','🌌',15,{ aoe:true, decay2:true, brittle:true }),
          dmg('航线封锁','🌑',15.3,{ silence:2400, fear:2200 }),
          summonP('影点誓卫','🧿',0.45,'召唤 3 名影点誓卫并获得护盾',{ summonCount:3, summonTheme:'void', shieldPct:0.22 }),
          dmgP('吞界火线','💥',8.2,0.3,{ aoe:true, mirror:true, alwaysCrit:true, cd:16 })
        ] }
      ]
    },
    {
      key:'primeus_repository', name:'普莱姆斯档案秘库', icon:'📚', reqLvl:102, waves:6, delve:true, art:'assets/wow/art/primeus-repository.png', desc:'普莱姆斯的高阶抄录圣所已进入战时封锁,每一层秘库都在主动改写闯入者的轨迹与记忆',
      bosses:[
        { name:'圣所馆卫', emoji:'📚', skills:[dmg('秘库击退','📚',14.1,{ silence:2200, brittle:true }), dmg('索引回响','💠',14.3,{ aoe:true, manaDrain:115 })] },
        { name:'抄录审判官', emoji:'📐', skills:[dmg('删改裁线','📐',14.5,{ sunder:true, weaken:true }), buffP('卷宗重算','📜',0.54,'卷宗重算:攻击/暴击/减伤提升',{ atkBuffSecs:12, atkBuffPct:44, critBuffSecs:12, critBuffPct:48, drBuffSecs:12, drBuffPct:0.22 })] },
        { name:'群星馆长索·普莱翁', emoji:'✨', skills:[
          dmg('群星归档','✨',15,{ silence:2400, soulDrain:true }),
          dmg('镜壁回灌','💠',15.4,{ aoe:true, mirror:true, manaDrain:120 }),
          summonP('索引馆卫','📚',0.46,'召唤 2 名索引馆卫并获得护盾',{ summonCount:2, summonTheme:'construct', shieldPct:0.22 }),
          dmgP('终卷删定','🌌',8.3,0.3,{ aoe:true, fear:2300, brittle:true, alwaysCrit:true, cd:15 })
        ] }
      ]
    },
    {
      key:'nerubar', name:"尼鲁巴尔王宫", icon:'🕸️', type:'raid', reqLvl:92, waves:14, art:'assets/wow/art/warwithin-nerubar-palace.jpg', desc:'艾基-卡赫特的蛛魔帝国王宫,安苏雷克女王用黑血与虚空丝线编织终局试炼',
      bosses:[
        { name:'乌格拉克斯', emoji:'🪲', skills:[dmg('贪食冲锋','🪲',11,{ bleed:true, cripple:true }), dmgP('暴食震荡','💥',5.8,0.5,{ aoe:true, stun:1700, brittle:true, cd:12 })] },
        { name:'血缚恐魔', emoji:'🩸', skills:[dmg('黑血喷洒','🩸',11.2,{ plague:true, dot:true, weaken:true })] },
        { name:'席克兰', emoji:'🗡️', skills:[dmg('王廷斩线','🗡️',11.5,{ sunder:true, silence:1900 }), dmg('相位处刑','🌀',12,{ mirror:true, brittle:true })] },
        { name:'拉夏南', emoji:'🦅', skills:[dmg('飞翼毒针','🦅',12,{ aoe:true, plague:true, bleed:true }), dmgP('虫群俯冲','🕸️',6,0.45,{ aoe:true, cripple:true, fear:1800, cd:12 })] },
        { name:'节点女亲王', emoji:'👑', skills:[dmg('节点调谐','💠',12.5,{ manaDrain:90, silence:2100 }), dmg('王廷共振','🌌',13,{ aoe:true, mirror:true, decay2:true })] },
        { name:'流丝之庭', emoji:'🕸️', skills:[dmg('流丝缠缚','🕸️',13,{ aoe:true, cripple:true, soulLink:true }), summonP('王庭织工','🕷️',0.5,'召唤王庭织工并获得护盾',{ summonCount:2, summonTheme:'spider', shieldPct:0.22 })] },
        { name:'安苏雷克女王', emoji:'👑', skills:[
          dmg('女王毒令','👑',14,{ plague:true, dot:true, brittle:true }),
          dmg('黑血敕令','🩸',14.5,{ aoe:true, silence:2300, manaDrain:95 }),
          buffP('升格王权','🌌',0.65,'虚空王权升格:攻击/暴击/攻速/减伤提升',{ atkBuffSecs:16, atkBuffPct:52, critBuffSecs:16, critBuffPct:58, spdBuffSecs:16, spdBuffPct:34, drBuffSecs:16, drBuffPct:0.24 }),
          summonP('王宫禁卫','🕷️',0.42,'召唤 3 名蛛魔禁卫并获得护盾',{ summonCount:3, summonTheme:'spider', shieldPct:0.24 }),
          dmgP('尼鲁巴尔终幕','🕸️',8,0.3,{ aoe:true, plague:true, fear:2300, silence:2400, soulLink:true, alwaysCrit:true, cd:16 })
        ] }
      ]
    },
    {
      key:'manaforge_omega', name:'法力熔炉欧米伽', icon:'🌌', type:'raid', reqLvl:100, waves:16, art:'assets/wow/art/karesh-map.png', desc:'卡雷什的巨型宇宙能量设施,影卫虚灵试图在熔炉核心复活诸界吞噬者',
      bosses:[
        { name:'枢纽哨兵', emoji:'💠', skills:[dmg('枢纽切割','💠',13.5,{ sunder:true, brittle:true }), dmgP('哨兵矩阵','⚙️',6.8,0.45,{ aoe:true, silence:2000, cd:12 })] },
        { name:"卢米萨尔", emoji:'🧵', skills:[dmg('星丝缠缚','🧵',13.8,{ cripple:true, soulLink:true }), summonP('织星虫群','🕸️',0.5,'召唤织星虫群并获得护盾',{ summonCount:2, summonTheme:'spider', shieldPct:0.2 })] },
        { name:'缚魂者娜欣德莉', emoji:'👻', skills:[dmg('缚魂尖啸','👻',14,{ fear:2200, soulDrain:true }), dmg('灵魂税契','📜',14.2,{ manaDrain:105, silence:2200 })] },
        { name:'织炉者阿拉兹', emoji:'⚒️', skills:[dmg('熔炉织线','⚒️',14.5,{ dot:true, sunder:true }), buffP('欧米伽炉心','🔥',0.58,'炉心超载:攻击/暴击/减伤提升',{ atkBuffSecs:14, atkBuffPct:48, critBuffSecs:14, critBuffPct:52, drBuffSecs:14, drBuffPct:0.22 })] },
        { name:'噬魂猎手', emoji:'🏹', skills:[dmg('猎魂箭雨','🏹',14.8,{ aoe:true, bleed:true, cripple:true }), dmgP('猎手处决','🎯',7.2,0.38,{ alwaysCrit:true, brittle:true, cd:12 })] },
        { name:'碎裂者弗拉克提勒斯', emoji:'💎', skills:[dmg('晶化粉碎','💎',15,{ stun:1900, brittle:true }), dmg('棱镜坍缩','✨',15.2,{ aoe:true, mirror:true, decay2:true })] },
        { name:'枢纽之王萨哈达尔', emoji:'👑', skills:[dmg('虚灵王令','👑',15.5,{ silence:2300, soulLink:true }), summonP('影卫誓约','🧿',0.52,'召唤影卫誓约者并提高攻速',{ summonCount:3, summonTheme:'void', spdBuffSecs:14, spdBuffPct:34 })] },
        { name:'诸界吞噬者迪门修斯', emoji:'🌌', skills:[
          dmg('吞界引力','🌌',16,{ aoe:true, cripple:true, decay2:true }),
          dmg('虚空星环','🌀',16.5,{ aoe:true, silence:2400, mirror:true }),
          buffP('诸界饥渴','🩸',0.66,'诸界饥渴:攻击/暴击/吸血/减伤提升',{ atkBuffSecs:16, atkBuffPct:56, critBuffSecs:16, critBuffPct:60, leechBuffSecs:16, leechBuffPct:28, drBuffSecs:16, drBuffPct:0.26 }),
          summonP('吞噬裂隙','🌌',0.45,'召唤 3 个吞噬裂隙并获得护盾',{ summonCount:3, summonTheme:'void', shieldPct:0.26 }),
          dmgP('欧米伽终幕','🌌',8.8,0.3,{ aoe:true, plague:true, fear:2500, silence:2500, soulLink:true, mirror:true, alwaysCrit:true, cd:16 })
        ] }
      ]
    },
    {
      key:'shandorah_conclave', name:'沙恩多拉议会', icon:'🌠', type:'raid', reqLvl:101, waves:15, art:'assets/wow/art/shandorah.png', desc:'沙恩多拉观星神殿漂浮于裂岩之上,影卫议会试图以群星仪轨为吞界舰队重新定标',
      bosses:[
        { name:'断阶守誓者', emoji:'🪨', skills:[dmg('断阶震击','🪨',14.2,{ sunder:true, stun:1800 }), dmgP('观星坠片','🌠',7.2,0.45,{ aoe:true, brittle:true, cd:12 })] },
        { name:'棱镜观测者', emoji:'🔷', skills:[dmg('棱镜穿刺','🔷',14.4,{ silence:2200, manaDrain:105 }), dmg('折光错位','🪞',14.8,{ aoe:true, mirror:true })] },
        { name:'仪轨编年官', emoji:'📜', skills:[dmg('仪轨删改','📜',15,{ weaken:true, soulDrain:true }), summonP('星图抄写员','✨',0.5,'召唤 2 名抄写员并获得护盾',{ summonCount:2, summonTheme:'construct', shieldPct:0.2 })] },
        { name:'沙恩多拉双星', emoji:'🌠', skills:[dmg('双星会切','🌠',15.2,{ aoe:true, alwaysCrit:true }), dmgP('星潮对冲','💠',7.4,0.42,{ aoe:true, silence:2300, fear:1900, cd:12 })] },
        { name:'天穹测距者', emoji:'🔭', skills:[dmg('天穹锁定','🔭',15.5,{ cripple:true, brittle:true }), dmg('零点测距','✨',15.7,{ manaDrain:115, silence:2300 })] },
        { name:'虚空航线执笔人', emoji:'🧿', skills:[dmg('航线改写','🧿',16,{ soulLink:true, mirror:true }), summonP('议会校谱者','📣',0.5,'召唤 3 名校谱者并提高攻速',{ summonCount:3, summonTheme:'void', spdBuffSecs:14, spdBuffPct:30 })] },
        { name:'群星议长索·阿兹拉', emoji:'🌌', skills:[
          dmg('议长谕令','🌌',16.4,{ aoe:true, decay2:true, brittle:true }),
          dmg('沙恩多拉归航','🌠',16.8,{ aoe:true, silence:2500, fear:2400 }),
          buffP('观星大仪','✨',0.64,'观星大仪:攻击/暴击/攻速/减伤提升',{ atkBuffSecs:16, atkBuffPct:54, critBuffSecs:16, critBuffPct:58, spdBuffSecs:16, spdBuffPct:34, drBuffSecs:16, drBuffPct:0.24 }),
          summonP('星潮议卫','🔷',0.42,'召唤 3 名星潮议卫并获得护盾',{ summonCount:3, summonTheme:'construct', shieldPct:0.24 }),
          dmgP('终末定标','🪐',9,0.3,{ aoe:true, mirror:true, silence:2500, fear:2500, alwaysCrit:true, cd:16 })
        ] }
      ]
    },
    {
      key:'voidrazor_sanctum', name:'虚无剃刀圣所', icon:'🪐', type:'raid', reqLvl:103, waves:15, art:'assets/wow/art/voidrazor-sanctum.png', desc:'圆顶庇护所最深处的虚无剃刀圣所正在被改造成吞界观察站,每一次边界波动都在把幸存者与敌意一并推向终局',
      bosses:[
        { name:'庇护壁垒机', emoji:'🔷', skills:[dmg('壁垒回冲','🔷',14.6,{ sunder:true, brittle:true }), dmgP('棱幕震荡','💥',7.4,0.42,{ aoe:true, silence:2200, cd:12 })] },
        { name:'虚刃掠食兽', emoji:'🕳️', skills:[dmg('裂口啃噬','🕳️',14.9,{ plague:true, lifeSteal:0.24 }), dmg('剃锋扑杀','🪐',15.1,{ alwaysCrit:true, cripple:true })] },
        { name:'裂幕引航者', emoji:'🌫️', skills:[dmg('边界导偏','🌫️',15.2,{ manaDrain:120, weaken:true }), summonP('引航誓从','📣',0.5,'召唤 2 名引航誓从并提高攻速',{ summonCount:2, summonTheme:'void', spdBuffSecs:12, spdBuffPct:30 })] },
        { name:'圆顶求生议会', emoji:'🛡️', skills:[dmg('庇护反证','🛡️',15.4,{ aoe:true, silence:2300 }), dmgP('绝境共振','✨',7.6,0.4,{ aoe:true, fear:2100, mirror:true, cd:12 })] },
        { name:'吞界剃刀体', emoji:'🌌', skills:[dmg('吞界剖面','🌌',15.8,{ decay2:true, brittle:true }), dmg('虚空剃切','🪐',16.1,{ aoe:true, mirror:true, silence:2400 })] },
        { name:'庇护执裁官萨·维克斯', emoji:'⚖️', skills:[dmg('剃刀宣判','⚖️',16.3,{ soulLink:true, manaDrain:125 }), summonP('执裁影卫','🧿',0.48,'召唤 3 名执裁影卫并获得护盾',{ summonCount:3, summonTheme:'void', shieldPct:0.24 })] },
        { name:'吞界观测主脑阿兹莫垩', emoji:'🌌', skills:[
          dmg('边界剃灭','🌌',16.8,{ aoe:true, decay2:true, brittle:true }),
          dmg('剃锋天幕','🪐',17.2,{ aoe:true, silence:2500, fear:2400, mirror:true }),
          buffP('终域剃算','⚖️',0.64,'终域剃算:攻击/暴击/攻速/减伤提升',{ atkBuffSecs:16, atkBuffPct:56, critBuffSecs:16, critBuffPct:60, spdBuffSecs:16, spdBuffPct:36, drBuffSecs:16, drBuffPct:0.26 }),
          summonP('裂幕观测体','🌫️',0.42,'召唤 3 个裂幕观测体并获得护盾',{ summonCount:3, summonTheme:'void', shieldPct:0.26 }),
          dmgP('吞界终裁','🌌',9.3,0.3,{ aoe:true, mirror:true, silence:2600, fear:2600, alwaysCrit:true, brittle:true, cd:16 })
        ] }
      ]
    },
    {
      key:'murder_row', name:'谋杀巷', icon:'🗡️', reqLvl:104, waves:10, art:'assets/wow/art/timewalking-outland-banner.jpg', desc:'银月城暗巷里的邪能走私行动在虚空风暴出现后急速扩张,魔导师、刃商与恶魔召唤物把整条街变成地下战场',
      bosses:[
        { name:'姬丝蒂娅·法力之心', emoji:'🧙', skills:[dmg('邪能余烬','🔥',15.2,{ dot:true, manaDrain:120 }), dmg('魔导师封口令','🔇',15.5,{ silence:2300, weaken:true })] },
        { name:'扎恩·刃悲', emoji:'🗡️', skills:[dmg('走私刃舞','🗡️',15.8,{ bleed:true, alwaysCrit:true }), summonP('巷口打手','📣',0.48,'召唤 2 名走私打手并提高暴击',{ summonCount:2, summonTheme:'soldier', critBuffSecs:13, critBuffPct:48 })] },
        { name:'毁灭者萨苏克斯', emoji:'😈', skills:[dmg('湮灭践踏','💥',16.1,{ aoe:true, stun:2100, brittle:true }), buffP('恶魔快感','😈',0.58,'恶魔快感:攻击/吸血/减伤提升',{ atkBuffSecs:14, atkBuffPct:50, leechBuffSecs:14, leechBuffPct:24, drBuffSecs:14, drBuffPct:0.24 })] },
        { name:'莉希尔·烬怒', emoji:'🌑', skills:[
          dmg('银月暗售契约','📜',16.5,{ aoe:true, silence:2400, manaDrain:135 }),
          dmg('虚空风暴套现','🌑',16.9,{ aoe:true, mirror:true, decay2:true }),
          summonP('邪能承运队','🌀',0.44,'召唤 3 名邪能承运者并获得护盾',{ summonCount:3, summonTheme:'demon', shieldPct:0.25 }),
          dmgP('烬怒终幕','🔥',9.4,0.3,{ aoe:true, fear:2600, alwaysCrit:true, brittle:true, cd:15 })
        ] }
      ]
    },
    {
      key:'den_nalorakk', name:'纳洛拉克兽穴', icon:'🐻', reqLvl:105, waves:10, art:'assets/wow/art/timewalking-cataclysm-banner.jpg', desc:'阿曼尼试炼深入熊神纳洛拉克的梦境,贪食、寒冬与洛阿怒火会轮流压迫挑战者',
      bosses:[
        { name:'囤货者霍尔蒙格', emoji:'🥩', skills:[dmg('囤积碾压','🥩',15.8,{ stun:2100, sunder:true }), dmg('饥饿税契','💀',16.1,{ manaDrain:125, soulDrain:true })] },
        { name:'冬境哨兵', emoji:'❄️', skills:[dmg('严冬切面','❄️',16.3,{ freeze:2200, slow:true }), dmg('冰封试炼','🧊',16.6,{ aoe:true, brittle:true, weaken:true })] },
        { name:'纳洛拉克', emoji:'🐻', skills:[
          dmg('熊神裂地','🐻',17,{ aoe:true, stun:2300, sunder:true }),
          dmg('洛阿战争梦','🌌',17.3,{ fear:2500, soulLink:true }),
          buffP('战争洛阿祝福','🐾',0.62,'战争洛阿祝福:攻击/暴击/减伤提升',{ atkBuffSecs:15, atkBuffPct:54, critBuffSecs:15, critBuffPct:58, drBuffSecs:15, drBuffPct:0.25 }),
          dmgP('纳洛拉克终判','👑',9.6,0.3,{ aoe:true, alwaysCrit:true, fear:2600, brittle:true, cd:15 })
        ] }
      ]
    },
    {
      key:'maisara_caverns', name:'迈萨拉洞窟', icon:'💀', reqLvl:106, waves:10, art:'assets/wow/art/timewalking-cataclysm-banner.jpg', desc:'邪枝巨魔在迈萨拉丘陵下献祭俘虏,死灵仪式把被盗灵魂灌入巨魔造物深处',
      bosses:[
        { name:'穆罗金与奈克拉克斯', emoji:'🦅', skills:[dmg('追猎镰击','🦅',16.2,{ bleed:true, cripple:true }), summonP('复生巨鹰','🦅',0.48,'召唤复生巨鹰并提高攻速',{ summonCount:2, summonTheme:'beast', spdBuffSecs:13, spdBuffPct:30 })] },
        { name:'沃达扎', emoji:'💀', skills:[dmg('魂能蒸馏','💀',16.6,{ soulDrain:true, manaDrain:130 }), dmg('禁忌死仪','🕯️',16.9,{ aoe:true, decay2:true, silence:2400 })] },
        { name:'拉克图尔', emoji:'🧟', skills:[
          dmg('死魂巨握','🧟',17.4,{ stun:2300, brittle:true }),
          dmg('邪枝魂爆','🌑',17.7,{ aoe:true, fear:2500, decay2:true }),
          buffP('缚魂暴涨','💀',0.6,'缚魂暴涨:攻击/吸血/减伤提升',{ atkBuffSecs:15, atkBuffPct:56, leechBuffSecs:15, leechBuffPct:26, drBuffSecs:15, drBuffPct:0.26 }),
          dmgP('洞窟魂葬','⚰️',9.8,0.3,{ aoe:true, silence:2600, alwaysCrit:true, cd:15 })
        ] }
      ]
    },
    {
      key:'silvermoon_voidspire', name:'银月虚空尖塔', icon:'💠', reqLvl:107, waves:11, art:'assets/wow/art/timewalking-outland-banner.jpg', desc:'虚空风暴在银月城上空撕开尖塔裂隙,魔导师与血骑士必须在街巷、塔桥和日井残响间重新夺回控制权',
      bosses:[
        { name:'日井裂隙守望者', emoji:'✨', skills:[dmg('日井裂辉','✨',16.5,{ aoe:true, silence:2300 }), dmg('奥术回灌','💠',16.8,{ manaDrain:135, mirror:true })] },
        { name:'血骑士断誓者', emoji:'🛡️', skills:[dmg('断誓圣裁','🛡️',17,{ sunder:true, stun:2200 }), buffP('血誓反照','🩸',0.55,'血誓反照:回复并提高防御/减伤',{ healPct:0.24, defBuffSecs:14, defBuffPct:50, drBuffSecs:14, drBuffPct:0.24 })] },
        { name:'远行者虚空猎手', emoji:'🏹', skills:[dmg('虚空标记','🎯',17.2,{ alwaysCrit:true, brittle:true }), summonP('远行者影矢队','🏹',0.45,'召唤 2 名影矢队员并提高暴击',{ summonCount:2, summonTheme:'soldier', critBuffSecs:13, critBuffPct:52 })] },
        { name:'萨拉塔斯的裂隙回声', emoji:'🌑', skills:[
          dmg('黑暗之心回声','🌑',17.8,{ aoe:true, decay2:true, fear:2500 }),
          dmg('虚空风暴覆城','🌌',18.2,{ aoe:true, silence:2600, mirror:true }),
          summonP('裂隙低语体','👁️',0.44,'召唤 3 个低语体并获得护盾',{ summonCount:3, summonTheme:'void', shieldPct:0.27 }),
          dmgP('银月坠夜','🌘',10,0.3,{ aoe:true, alwaysCrit:true, fear:2700, silence:2700, cd:15 })
        ] }
      ]
    },
    {
      key:'sporefall', name:'孢落', icon:'🍄', type:'raid', reqLvl:108, waves:8, art:'assets/wow/art/timewalking-shadowlands-banner.png', desc:'哈兰达尔的单首领团本,真菌巨人腐沼用末日蘑菇、孢潮增援与毒雾把短战斗压成高密度机制考验',
      bosses:[
        { name:'腐沼', emoji:'🍄', skills:[
          dmg('毒孢爆发','☣️',18.5,{ aoe:true, plague:true, dot:true }),
          dmg('末日蘑菇','🍄',19,{ aoe:true, brittle:true, cripple:true }),
          summonP('孢潮暴动','🍄',0.42,'召唤 4 个孢潮爪牙并获得护盾',{ summonCount:4, summonTheme:'plant', shieldPct:0.30 }),
          buffP('真菌巨人再生','🌿',0.62,'真菌巨人再生:回复并提高攻击/减伤',{ healPct:0.30, atkBuffSecs:16, atkBuffPct:60, drBuffSecs:16, drBuffPct:0.28 }),
          dmgP('孢落灭顶','🌌',10.8,0.3,{ aoe:true, plague:true, fear:2800, silence:2800, alwaysCrit:true, cd:14 })
        ] }
      ]
    },
    {
      key:'curse_ulatek', name:"乌拉泰克诅咒", icon:'🌀', type:'raid', reqLvl:109, waves:16, art:'assets/wow/art/timewalking-shadowlands-banner.png', desc:'Midnight 的大型诅咒团本线,虚空、洛阿与银月法阵在盘绕岛深处互相污染,是当前最高强度团队内容',
      bosses:[
        { name:'盘绕岛守门者', emoji:'🌀', skills:[dmg('盘绕门槛','🌀',17.2,{ aoe:true, stun:2300 }), dmgP('门槛坍缩','💥',8.6,0.45,{ aoe:true, brittle:true, cd:12 })] },
        { name:'失语先知玛洛斯', emoji:'👁️', skills:[dmg('无声预言','👁️',17.5,{ silence:2600, manaDrain:140 }), dmg('低语折返','🌑',17.8,{ mirror:true, fear:2300 })] },
        { name:'四神庙残影', emoji:'🐾', skills:[dmg('洛阿残响','🐾',18.1,{ aoe:true, weaken:true }), summonP('残影试炼','📣',0.48,'召唤 3 个洛阿残影并提高攻速',{ summonCount:3, summonTheme:'beast', spdBuffSecs:14, spdBuffPct:34 })] },
        { name:'银月裂法者', emoji:'💠', skills:[dmg('裂法尖刺','💠',18.4,{ manaDrain:145, brittle:true }), buffP('裂法回路','✨',0.56,'裂法回路:攻击/暴击/减伤提升',{ atkBuffSecs:15, atkBuffPct:58, critBuffSecs:15, critBuffPct:60, drBuffSecs:15, drBuffPct:0.27 })] },
        { name:'诅咒载体乌拉泰克', emoji:'🌌', skills:[
          dmg('乌拉泰克咒印','🌌',19,{ aoe:true, decay2:true, silence:2700 }),
          dmg('盘绕岛终咒','🌀',19.5,{ aoe:true, mirror:true, fear:2700 }),
          summonP('诅咒回声','👁️',0.42,'召唤 4 个诅咒回声并获得护盾',{ summonCount:4, summonTheme:'void', shieldPct:0.30 }),
          buffP('终咒升格','🌑',0.62,'终咒升格:攻击/暴击/吸血/减伤提升',{ atkBuffSecs:17, atkBuffPct:64, critBuffSecs:17, critBuffPct:66, leechBuffSecs:17, leechBuffPct:30, drBuffSecs:17, drBuffPct:0.30 }),
          dmgP('午夜终末','🌘',11.2,0.3,{ aoe:true, plague:true, fear:2900, silence:2900, soulLink:true, alwaysCrit:true, cd:14 })
        ] }
      ]
    }
  ];

  const extraLoot = {
    diremaul: { bosses:{
      '普希林':[L('普希林的藤杖','weapon','rare',{atk:1,int:1}),L('魔藤束带','belt','rare',{def:1,spi:1})],
      '伊莫塔尔':[L('恶魔牢笼护手','gloves','rare',{sta:1}),L('邪眼肩饰','shoulder','rare',{atk:1,int:1})],
      '托塞德林王子':[L('王子的裁决','weapon','epic',{atk:3,int:2}),L('戈多克礼仪冠','helmet','epic',{def:2,spi:2}),L('皇庭徽印','trinket','epic',{sta:2,int:2})]
    }, trash:[L('戈多克皮靴','boots','rare',{agi:1}),L('古树缠枝手套','gloves','rare',{spi:1})] },
    lbrs: { bosses:{
      '欧莫克大王':[L('欧莫克碎颅锤','weapon','rare',{atk:1,str:1}),L('黑石骨链腰带','belt','rare',{def:1,sta:1})],
      '暗影猎手沃什加斯':[L('沃什加斯的影刃','weapon','rare',{atk:1,agi:1}),L('暗影猎手护肩','shoulder','rare',{atk:1,agi:1})],
      '烟网蛛后':[L('蛛后毒牙','weapon','rare',{atk:1,agi:1}),L('烟网纺丝护腿','pants','rare',{hp:1,agi:1})],
      '维姆萨拉克':[L('维姆萨拉克龙牙战刃','weapon','epic',{atk:3,str:2}),L('黑石军团头盔','helmet','epic',{def:2,sta:2}),L('龙裔统御徽章','trinket','epic',{sta:2,str:2})]
    }, trash:[L('黑石护手','gloves','rare',{str:1}),L('龙人士兵战靴','boots','rare',{sta:1})] },
    shattered: { bosses:{
      '高阶术士奈瑟库斯':[L('奈瑟库斯的咒火法典','weapon','rare',{atk:1,int:1}),L('军团裹腕','gloves','rare',{int:1})],
      '血卫士伯鲁恩':[L('伯鲁恩的战斧','weapon','rare',{atk:1,str:1}),L('破碎束腰','belt','rare',{def:1,str:1})],
      '击碎者克里丹':[L('克里丹的炎刃','weapon','epic',{atk:3,str:2}),L('破碎堡垒肩铠','shoulder','epic',{atk:2,sta:2}),L('军团将军的印记','ring','epic',{str:2})]
    }, trash:[L('碎手护手','gloves','rare',{str:1}),L('地狱火行军靴','boots','rare',{sta:1})] },
    arcatraz: { bosses:{
      '佐拉多尔米':[L('禁锢者权杖','weapon','rare',{atk:1,int:1}),L('静默之戒','ring','rare',{int:1})],
      '预言者斯克瑞斯':[L('斯克瑞斯占卜头冠','helmet','rare',{def:1,int:1}),L('裂空披腕','gloves','rare',{spi:1})],
      '先知达尔莉丝':[L('达尔莉丝的虚空斩杖','weapon','epic',{atk:3,int:2}),L('禁魔者长袍','armor','epic',{def:2,int:2}),L('奥金顿星图徽记','trinket','epic',{sta:2,int:2})]
    }, trash:[L('虚空囚徒腰带','belt','rare',{def:1,int:1}),L('禁闭肩垫','shoulder','rare',{atk:1,int:1})] },
    culling: { bosses:{
      '肉钩':[L('肉钩的锈刃','weapon','rare',{atk:1,str:1}),L('血肉缝合护手','gloves','rare',{sta:1})],
      '塑血者沙尔拉姆':[L('塑血者护符','trinket','rare',{sta:1,int:1}),L('炼毒腰带','belt','rare',{def:1,spi:1})],
      '玛尔加尼斯':[L('玛尔加尼斯的梦魇之牙','weapon','epic',{atk:3,int:2}),L('净化者兜帽','helmet','epic',{def:2,int:2}),L('时光回溯指环','ring','epic',{spi:2})]
    }, trash:[L('时光旅者战靴','boots','rare',{sta:1}),L('暮城护肩','shoulder','rare',{atk:1})] },
    pit: { bosses:{
      '熔炉之主加弗斯特':[L('萨隆淬火战锤','weapon','rare',{atk:1,str:1}),L('矿坑腰铠','belt','rare',{def:1,sta:1})],
      '艾克':[L('腐液喷吐者','weapon','rare',{atk:1,agi:1}),L('瘟疫研究裹手','gloves','rare',{int:1})],
      '天灾领主泰兰努斯':[L('泰兰努斯的霜刃','weapon','epic',{atk:3,str:2}),L('龙骨胸铠','armor','epic',{def:2,sta:2}),L('寒魂徽记','trinket','epic',{sta:2,str:2})]
    }, trash:[L('萨隆护腿','pants','rare',{hp:1,sta:1}),L('矿坑踏行者','boots','rare',{sta:1})] },
    oculus: { bosses:{
      '审讯者达拉科':[L('审讯光刺','weapon','rare',{atk:1,int:1}),L('法网束腰','belt','rare',{def:1,int:1})],
      '法师领主伊洛姆':[L('伊洛姆的奥能头环','helmet','rare',{def:1,int:1}),L('星术手套','gloves','rare',{int:1})],
      '魔网守护者埃雷苟斯':[L('埃雷苟斯的星界之杖','weapon','epic',{atk:3,int:2}),L('魔网肩垫','shoulder','epic',{atk:2,int:2}),L('蓝龙之环','ring','epic',{int:2,spi:1})]
    }, trash:[L('裂隙护腕','gloves','rare',{int:1}),L('悬空战靴','boots','rare',{int:1})] },
    hor: { bosses:{
      '法瑞克':[L('法瑞克的铁律之锤','weapon','rare',{atk:1,str:1}),L('绝望者护手','gloves','rare',{sta:1})],
      '玛维恩':[L('玛维恩的冰刃','weapon','rare',{atk:1,agi:1}),L('寒魂腰带','belt','rare',{def:1,sta:1})],
      '巫妖王之影':[L('王座影袭','weapon','epic',{atk:3,str:2}),L('绝境头盔','helmet','epic',{def:2,sta:2}),L('映像之戒','ring','epic',{str:2})]
    }, trash:[L('冰封护肩','shoulder','rare',{atk:1,sta:1}),L('王座战靴','boots','rare',{str:1})] },
    aq40: { bosses:{
      '预言者斯克拉姆':[L('斯克拉姆的预知之刃','weapon','rare',{atk:1,int:1}),L('先知指环','ring','rare',{int:1})],
      '战争守卫沙尔图拉':[L('沙尔图拉的旋刃','weapon','epic',{atk:2,agi:2}),L('其拉战争护腿','pants','rare',{hp:1,agi:1})],
      '顽强的范克瑞斯':[L('范克瑞斯毒牙','weapon','epic',{atk:2,agi:2}),L('虫甲腰带','belt','rare',{def:1,sta:1})],
      '双子皇帝':[L('皇帝双生法戒','ring','epic',{int:2,spi:2}),L('其拉王权胸铠','armor','epic',{def:2,sta:2})],
      '克苏恩':[L('克苏恩之眼','trinket','legend',{sta:4,int:3}),L('古神凝视头冠','helmet','legend',{def:4,int:3}),L('触须缠结护腰','belt','legend',{def:3,sta:3}),L('安其拉心智护腕','gloves','epic',{int:2,spi:2})]
    }, trash:[L('其拉守卫肩甲','shoulder','rare',{atk:1,sta:1}),L('甲虫行军靴','boots','rare',{sta:1})] },
    ssc: { bosses:{
      '不稳定的海度斯':[L('海度斯潮核','trinket','epic',{sta:2,spi:2}),L('涨潮护腕','gloves','rare',{int:1})],
      '盲眼者莱欧瑟拉斯':[L('莱欧瑟拉斯的双刃','weapon','epic',{atk:2,agi:2}),L('恶魔猎手护腿','pants','rare',{hp:1,agi:1})],
      '深水领主卡拉瑟雷斯':[L('深水权杖','weapon','epic',{atk:2,int:2}),L('盘牙水裔之环','ring','rare',{spi:1})],
      '瓦丝琪':[L('瓦丝琪的毒蛇脊索','weapon','legend',{atk:4,agi:3}),L('海巫头冠','helmet','legend',{def:4,int:3}),L('盘牙胸鳞','armor','legend',{def:4,sta:3}),L('潮王护符','trinket','epic',{sta:2,int:2})]
    }, trash:[L('盘牙护肩','shoulder','rare',{atk:1,int:1}),L('海潮长靴','boots','rare',{int:1})] },
    tk: { bosses:{
      '空灵机甲':[L('相位碎裂拳套','gloves','epic',{str:2}),L('机甲护腰','belt','rare',{def:1,sta:1})],
      '奥':[L('凤凰之戒','ring','epic',{int:2,spi:2}),L('星翼肩铠','shoulder','rare',{atk:1,int:1})],
      '大星术师索兰莉安':[L('星术法典','weapon','epic',{atk:2,int:2}),L('观星者兜帽','helmet','rare',{def:1,int:1})],
      '凯尔萨斯·逐日者':[L('凤凰王权长袍','armor','legend',{def:4,int:3,spi:2}),L('逐日者王权护肩','shoulder','legend',{atk:3,int:3}),L('烈日踏火长靴','boots','legend',{atk:3,haste:2,spdPct:3}),L('凯尔萨斯日耀徽记','trinket','epic',{sta:2,int:2})]
    }, trash:[L('风暴腰饰','belt','rare',{def:1,int:1}),L('血精灵短靴','boots','rare',{int:1})] },
    hyjal: { bosses:{
      '雷基·冬寒':[L('冬寒冰冠','helmet','epic',{def:2,int:2}),L('寒灾手套','gloves','rare',{int:1})],
      '安纳塞隆':[L('恐惧魔王之爪','weapon','epic',{atk:2,agi:2}),L('末日战靴','boots','rare',{agi:1})],
      '阿兹加洛':[L('深渊肩铠','shoulder','epic',{atk:2,str:2}),L('毁灭束腰','belt','rare',{def:1,str:1})],
      '阿克蒙德':[L('阿克蒙德的邪能之拳','gloves','legend',{atk:3,str:3}),L('世界之树赐福长裤','pants','legend',{hp:4,spi:3}),L('海加尔远古之戒','ring','legend',{atk:3,vers:2}),L('守望者胸甲','armor','epic',{def:2,sta:2})]
    }, trash:[L('海加尔远征护肩','shoulder','rare',{atk:1,sta:1}),L('军团熔铸护手','gloves','rare',{str:1})] },
    bt: { bosses:{
      '高阶督军纳因图斯':[L('脊矛巨刃','weapon','epic',{atk:2,str:2}),L('督军肩铠','shoulder','rare',{atk:1,sta:1})],
      '灵魂之匣':[L('折磨匣印记','trinket','epic',{sta:2,int:2}),L('枯魂长靴','boots','rare',{int:1})],
      '莎赫拉丝主母':[L('主母魅影匕首','weapon','epic',{atk:2,agi:2}),L('黑暗诱惑腰带','belt','rare',{def:1,agi:1})],
      '伊利达雷议会':[L('议会裁决法杖','weapon','epic',{atk:2,int:2}),L('议会典礼胸铠','armor','epic',{def:2,spi:2})],
      '伊利丹·怒风':[L('埃辛诺斯战刃·左','weapon','legend',{atk:4,agi:3}),L('埃辛诺斯战刃·右','weapon','legend',{atk:4,agi:3}),L('背叛者胸甲','armor','legend',{def:4,agi:3}),L('恶魔猎手兜帽','helmet','legend',{def:4,agi:3})]
    }, trash:[L('影月护手','gloves','rare',{agi:1}),L('伊利达雷腰带','belt','rare',{def:1,sta:1})] },
    firelands: { bosses:{
      '贝丝缇拉克':[L('炽焰蛛丝缠腕','gloves','epic',{atk:2,agi:2}),L('蛛网束带','belt','rare',{def:1,agi:1})],
      '熔岩之王莱奥利斯':[L('熔岩之核','trinket','epic',{sta:2,str:2}),L('火山护腿','pants','rare',{hp:1,str:1})],
      '巴尔洛戈斯':[L('烈焰獠牙战刃','weapon','epic',{atk:2,str:2}),L('炎犬护肩','shoulder','rare',{atk:1,sta:1})],
      '炎鹰阿莱索德':[L('烈日羽冠','helmet','epic',{def:2,int:2}),L('炎鹰之戒','ring','rare',{int:1,haste:1})],
      '拉格纳罗斯':[L('萨弗拉斯·炎魔之手','weapon','legend',{atk:4,str:3}),L('烈焰之地胸甲','armor','legend',{def:4,sta:3}),L('炎王踏火战靴','boots','legend',{atk:3,critd:2}),L('熔火之心徽记','trinket','epic',{sta:2,str:2})]
    }, trash:[L('烈焰护手','gloves','rare',{str:1}),L('余烬腰带','belt','rare',{def:1,sta:1})] },
    throne: { bosses:{
      '赞达拉守卫贾林':[L('远古巨颚战斧','weapon','epic',{atk:2,str:2}),L('赞达拉护腕','gloves','rare',{sta:1})],
      '风暴祭司莱杉':[L('雷鸣祭杖','weapon','epic',{atk:2,int:2}),L('风暴祭袍','armor','rare',{def:1,int:1})],
      '三头巨龙米伽拉':[L('三头龙鳞肩甲','shoulder','epic',{atk:2,agi:2}),L('多头之环','ring','rare',{agi:1})],
      '织雾者吉安娜':[L('迷雾织者法典','weapon','epic',{atk:2,int:2}),L('雾隐长靴','boots','rare',{int:1})],
      '雷电之王雷神':[L('雷神之握','gloves','legend',{atk:3,str:3}),L('雷霆王座胸铠','armor','legend',{def:4,sta:3}),L('帝国统御长裤','pants','legend',{hp:4,str:3}),L('雷神之核','trinket','epic',{sta:2,str:2})]
    }, trash:[L('赞达拉护腿','pants','rare',{hp:1,agi:1}),L('风暴长靴','boots','rare',{int:1})] },
    dragonsoul: { bosses:{
      '晨曦荒野之莫戈尔':[L('远古龟壳盾','trinket','epic',{def:2,sta:2}),L('腐蚀护手','gloves','rare',{sta:1})],
      '亡语者':[L('亡魂低语之杖','weapon','epic',{atk:2,int:2}),L('枯萎腰带','belt','rare',{def:1,spi:1})],
      '死亡之翼背脊':[L('熔岩龙鳞护肩','shoulder','epic',{atk:2,str:2}),L('炽甲护腿','pants','rare',{hp:1,str:1})],
      '瓦里奥那与塞拉图斯':[L('风暴双子之戒','ring','epic',{atk:2,haste:2}),L('雷鸣护腕','gloves','rare',{agi:1})],
      '死亡之翼·灭世者':[L('灭世者巨刃','weapon','legend',{atk:5,str:3}),L('死亡之翼龙鳞胸甲','armor','legend',{def:5,sta:4}),L('暮光统御头盔','helmet','legend',{def:4,int:3}),L('灭世徽记','trinket','legend',{sta:3,str:3})]
    }, trash:[L('暮光护肩','shoulder','rare',{atk:1,sta:1}),L('巨龙之魂战靴','boots','rare',{sta:1})] },
    ubrs: { bosses:{
      '督军沃克':[L('督军战斧','weapon','rare',{atk:1,str:1}),L('黑石护肩','shoulder','rare',{atk:1,sta:1})],
      '烈焰使者索拉卡尔':[L('烈焰法杖','weapon','rare',{atk:1,int:1}),L('炎使腰带','belt','rare',{def:1,int:1})],
      '将军勒什雷尔':[L('勒什雷尔的龙牙刃','weapon','epic',{atk:3,str:2}),L('黑石将军胸铠','armor','epic',{def:2,sta:2}),L('龙人统御指环','ring','epic',{str:2})]
    }, trash:[L('黑石战靴','boots','rare',{sta:1}),L('兽人裹手','gloves','rare',{str:1})] },
    freehold: { bosses:{
      '断牙海狗':[L('鲨齿匕首','weapon','rare',{atk:1,agi:1}),L('海狗护腕','gloves','rare',{agi:1})],
      '酒桶炸药师':[L('火药桶投掷器','weapon','rare',{atk:1,agi:1}),L('炸药师腰带','belt','rare',{def:1,sta:1})],
      '船长贾雷德':[L('贾雷德的掠夺者弯刀','weapon','epic',{atk:3,agi:2}),L('海盗船长帽','helmet','epic',{def:2,agi:2}),L('无法之港护符','trinket','epic',{sta:2,agi:2})]
    }, trash:[L('海盗皮靴','boots','rare',{agi:1}),L('自由镇腰带','belt','rare',{def:1,agi:1})] },
    mechagon: { bosses:{
      '回收机器人':[L('废料喷射臂','gloves','rare',{atk:1,int:1}),L('机械护腿','pants','rare',{hp:1,sta:1})],
      '爆破专家':[L('集束炸弹背包','trinket','rare',{sta:1,int:1}),L('防爆腰带','belt','rare',{def:1,sta:1})],
      '机械之王梅卡托克':[L('梅卡托克的过载射线枪','weapon','epic',{atk:3,int:2}),L('机械之王王冠','helmet','epic',{def:2,int:2}),L('麦卡贡能量核心','trinket','epic',{sta:2,int:2})]
    }, trash:[L('机械护手','gloves','rare',{int:1}),L('废土行者战靴','boots','rare',{sta:1})] },
    boralus: { bosses:{
      '海军统领':[L('齐射火炮','weapon','rare',{atk:1,agi:1}),L('海军护肩','shoulder','rare',{atk:1,sta:1})],
      '巡夜指挥官':[L('巡夜者长枪','weapon','rare',{atk:1,str:1}),L('猎犬皮护腿','pants','rare',{hp:1,agi:1})],
      '维克雷斯女勋爵':[L('维克雷斯仪式匕首','weapon','epic',{atk:3,agi:2}),L('女巫会斗篷','armor','epic',{def:2,int:2}),L('暗夜献祭指环','ring','epic',{agi:2})]
    }, trash:[L('要塞守卫腰带','belt','rare',{def:1,sta:1}),L('码头工人护手','gloves','rare',{str:1})] },
    soo: { bosses:{
      '不洁之溢':[L('腐化潮汐护腕','gloves','epic',{def:2,spi:2}),L('净化之滴坠饰','trinket','rare',{sta:1,spi:1})],
      '傲慢之煞':[L('傲慢之眼法杖','weapon','epic',{atk:2,int:2}),L('煞能束腰','belt','rare',{def:1,int:1})],
      '钢铁巨像':[L('履带碾压护肩','shoulder','epic',{atk:2,str:2}),L('钢铁巨像护腿','pants','rare',{hp:1,sta:1})],
      '达克沙将军':[L('达克沙的猎魂弓','weapon','epic',{atk:2,agi:2}),L('追猎者战靴','boots','rare',{agi:1})],
      '克拉希克综合体':[L('琥珀禁锢指环','ring','epic',{int:2,spi:1}),L('螳螂妖护手','gloves','rare',{agi:1})],
      '加尔鲁什·地狱咆哮':[L('歌罗纳的暴君之刃','weapon','legend',{atk:5,str:3}),L('钛钢统御胸铠','armor','legend',{def:5,sta:4}),L('地狱咆哮战盔','helmet','legend',{def:4,str:3}),L('暴君徽记','trinket','epic',{sta:2,str:2})]
    }, trash:[L('奥格瑞玛守卫护肩','shoulder','rare',{atk:1,sta:1}),L('要塞攻城靴','boots','rare',{sta:1})] },
    hfc: { bosses:{
      '钢铁掠袭者':[L('掠袭者火炮','weapon','epic',{atk:2,agi:2}),L('钢铁部落护腿','pants','rare',{hp:1,agi:1})],
      '寇莫克':[L('邪能重拳护手','gloves','epic',{atk:2,str:2}),L('魔能腰带','belt','rare',{def:1,str:1})],
      '死眼基洛格':[L('死眼之矢','weapon','epic',{atk:2,agi:2}),L('血环护腕','gloves','rare',{agi:1})],
      '邪能领主扎昆':[L('扎昆的邪能护符','trinket','epic',{sta:2,int:2}),L('邪能行者战靴','boots','rare',{int:1})],
      '玛诺洛斯':[L('混乱践踏护肩','shoulder','epic',{atk:2,str:2}),L('深渊领主指环','ring','rare',{str:1})],
      '阿克蒙德':[L('阿克蒙德的邪能权杖','weapon','legend',{atk:5,int:3}),L('地狱火堡垒胸铠','armor','legend',{def:5,sta:4}),L('军团审判头盔','helmet','legend',{def:4,int:3}),L('堕落之心徽记','trinket','epic',{sta:2,int:2})]
    }, trash:[L('塔纳安护手','gloves','rare',{str:1}),L('裂隙踏行者','boots','rare',{sta:1})] },
    tomb: { bosses:{
      '戈罗斯':[L('炽炎核心坠饰','trinket','epic',{sta:2,str:2}),L('熔渣护腿','pants','rare',{hp:1,str:1})],
      '恶魔审判官':[L('折魂之杖','weapon','epic',{atk:2,int:2}),L('审判者腰带','belt','rare',{def:1,int:1})],
      '莎萨拉恩女勋爵':[L('深海毒针匕首','weapon','epic',{atk:2,agi:2}),L('鲛人护腕','gloves','rare',{agi:1})],
      '守护之少女':[L('守护圣盾','trinket','epic',{def:2,sta:2}),L('圣光护肩','shoulder','rare',{def:1,spi:1})],
      '堕落的萨格拉斯化身':[L('泰坦黑暗指环','ring','epic',{atk:2,int:1}),L('破碎之黑护腿','pants','rare',{hp:1,int:1})],
      '基尔加丹':[L('欺诈者的湮灭法杖','weapon','legend',{atk:5,int:4}),L('萨格拉斯之墓圣袍','armor','legend',{def:5,int:4}),L('军团领主头冠','helmet','legend',{def:4,int:3}),L('破碎之星徽记','trinket','epic',{sta:2,int:2})]
    }, trash:[L('破碎海岸护肩','shoulder','rare',{atk:1,int:1}),L('陵墓守卫战靴','boots','rare',{int:1})] },
    antorus: { bosses:{
      '加洛希世界破坏者':[L('湮灭炮护手','gloves','epic',{atk:2,str:2}),L('军团机甲护腿','pants','rare',{hp:1,sta:1})],
      '萨格拉斯的地狱犬':[L('地狱犬之牙','weapon','epic',{atk:2,agi:2}),L('邪能犬链腰带','belt','rare',{def:1,agi:1})],
      '灵魂猎手伊莫纳':[L('裂魂长弓','weapon','epic',{atk:2,agi:2}),L('猎魂者护肩','shoulder','rare',{atk:1,agi:1})],
      '金加洛斯':[L('军团锻锤','weapon','epic',{atk:3,str:2}),L('熔铸者护腕','gloves','rare',{str:1})],
      '阿格拉玛':[L('萨格拉斯之盾','trinket','epic',{def:2,sta:2}),L('泰坦守护指环','ring','rare',{str:1,spi:1})],
      '寂灭者阿古斯':[L('湮灭者·世界终结','weapon','legend',{atk:6,str:4}),L('阿古斯星界胸甲','armor','legend',{def:5,sta:4}),L('寂灭头冠','helmet','legend',{def:5,int:4}),L('世界之魂徽记','trinket','legend',{sta:3,str:3})]
    }, trash:[L('军团母星护肩','shoulder','rare',{atk:1,sta:1}),L('燃烧王座战靴','boots','rare',{sta:1})] },
    valor: { bosses:{
      '海姆达尔':[L('符文战斧','weapon','rare',{atk:1,str:1}),L('英灵护肩','shoulder','rare',{atk:1,sta:1})],
      '芬里尔':[L('暗影狼牙匕首','weapon','rare',{atk:1,agi:1}),L('狼鬃护腕','gloves','rare',{agi:1})],
      '神王斯科瓦尔德':[L('神王战盾坠饰','trinket','rare',{def:1,sta:1}),L('烈焰束腰','belt','rare',{def:1,str:1})],
      '奥丁':[L('奥丁的风暴之矛','weapon','epic',{atk:3,agi:2}),L('英灵殿王冠','helmet','epic',{def:2,sta:2}),L('瓦尔基拉之戒','ring','epic',{atk:2,vers:1})]
    }, trash:[L('天界守卫战靴','boots','rare',{sta:1}),L('符文护腿','pants','rare',{hp:1,agi:1})] },
    darkheart: { bosses:{
      '大德鲁伊格莱达利斯':[L('野性之爪','weapon','rare',{atk:1,agi:1}),L('德鲁伊护腿','pants','rare',{hp:1,agi:1})],
      '橡树之心':[L('远古橡木杖','weapon','rare',{atk:1,int:1}),L('林地护腕','gloves','rare',{spi:1})],
      '恐惧编织者诺索斯':[L('恐惧披风','trinket','rare',{sta:1,int:1}),L('梦魇腰带','belt','rare',{def:1,int:1})],
      '萨维斯的暗影':[L('萨维斯的梦魇之刃','weapon','epic',{atk:3,agi:2}),L('暗影梦境兜帽','helmet','epic',{def:2,int:2}),L('扭曲梦魇指环','ring','epic',{int:2,spi:1})]
    }, trash:[L('瓦尔莎拉护肩','shoulder','rare',{atk:1,spi:1}),L('梦境行者战靴','boots','rare',{agi:1})] },
    court: { bosses:{
      '巡逻队长格尔多':[L('警戒长枪','weapon','rare',{atk:1,str:1}),L('守卫腰带','belt','rare',{def:1,sta:1})],
      '烈焰缠绕塔利克丝':[L('恶魔烈焰法杖','weapon','rare',{atk:1,int:1}),L('缠焰护腕','gloves','rare',{int:1})],
      '顾问梅兰德鲁斯':[L('梅兰德鲁斯的镜影双刃','weapon','epic',{atk:3,agi:2}),L('苏拉玛贵族披风','armor','epic',{def:2,int:2}),L('上层精灵徽记','trinket','epic',{sta:2,agi:2})]
    }, trash:[L('庭院卫兵护肩','shoulder','rare',{atk:1,sta:1}),L('夜之子长靴','boots','rare',{int:1})] },
    necrotic: { bosses:{
      '疫骨':[L('腐液喷吐臂铠','gloves','rare',{atk:1,int:1}),L('瘟疫护腿','pants','rare',{hp:1,sta:1})],
      '外科医生缝肉':[L('缝合钩链','weapon','rare',{atk:1,str:1}),L('血肉束腰','belt','rare',{def:1,sta:1})],
      '收割者矩阵':[L('收割能量核心','trinket','rare',{sta:1,int:1}),L('玛卓克萨斯护肩','shoulder','rare',{atk:1,sta:1})],
      '缚霜者纳索尔':[L('纳索尔的冰霜权杖','weapon','epic',{atk:3,int:2}),L('缚霜者头冠','helmet','epic',{def:2,int:2}),L('寒霜死灵之戒','ring','epic',{int:2,sta:1})]
    }, trash:[L('死灵工坊护手','gloves','rare',{int:1}),L('通灵者战靴','boots','rare',{sta:1})] },
    nexus: { bosses:{
      '冰霜之王托塞德林':[L('寒冰尖刺权杖','weapon','rare',{atk:1,int:1}),L('霜缚护腕','gloves','rare',{int:1})],
      '阿诺玛鲁斯':[L('虚空裂解之刃','weapon','rare',{atk:1,agi:1}),L('奥能腰带','belt','rare',{def:1,int:1})],
      '凯瑞斯托拉兹':[L('凯瑞斯托拉兹的奥能法杖','weapon','epic',{atk:3,int:2}),L('蓝龙鳞片头冠','helmet','epic',{def:2,int:2}),L('魔枢能量指环','ring','epic',{int:2,spi:1})]
    }, trash:[L('蓝龙守卫护肩','shoulder','rare',{atk:1,int:1}),L('奥术螺旋战靴','boots','rare',{int:1})] },
    gundrak: { bosses:{
      '斯拉德兰':[L('毒蛇之牙匕首','weapon','rare',{atk:1,agi:1}),L('蛇鳞护腿','pants','rare',{hp:1,agi:1})],
      '莫拉格':[L('犀牛角战锤','weapon','rare',{atk:1,str:1}),L('厚甲腰带','belt','rare',{def:1,sta:1})],
      '迦勒鲁什':[L('血神迦勒鲁什之爪','weapon','epic',{atk:3,str:2}),L('卓格巴尔战盔','helmet','epic',{def:2,sta:2}),L('血神图腾','trinket','epic',{sta:2,str:2})]
    }, trash:[L('古达克护肩','shoulder','rare',{atk:1,sta:1}),L('神庙行者战靴','boots','rare',{agi:1})] },
    sethekk: { bosses:{
      '达克丝塔':[L('暗影之羽长弓','weapon','rare',{atk:1,agi:1}),L('鸦羽护腕','gloves','rare',{agi:1})],
      '塞泰克先知':[L('先知预言之杖','weapon','rare',{atk:1,int:1}),L('占卜腰带','belt','rare',{def:1,int:1})],
      '鸦人之王伊瑞尔':[L('伊瑞尔的夺魂法杖','weapon','epic',{atk:3,int:2}),L('乌鸦之神兜帽','helmet','epic',{def:2,int:2}),L('鸦神羽冠之戒','ring','epic',{agi:2,int:1})]
    }, trash:[L('鸦人护肩','shoulder','rare',{atk:1,agi:1}),L('黑暗大厅长靴','boots','rare',{int:1})] },
    irondocks: { bosses:{
      '尼奥库勒·蒸汽碾':[L('蒸汽碾压拳套','gloves','rare',{atk:1,str:1}),L('机械护腿','pants','rare',{hp:1,sta:1})],
      '格鲁布':[L('野兽獠牙匕首','weapon','rare',{atk:1,agi:1}),L('兽皮腰带','belt','rare',{def:1,agi:1})],
      '狼王斯卡乌格':[L('斯卡乌格的狼牙战斧','weapon','epic',{atk:3,str:2}),L('钢铁码头胸铠','armor','epic',{def:2,sta:2}),L('狼王徽记','trinket','epic',{sta:2,str:2})]
    }, trash:[L('钢铁部落护肩','shoulder','rare',{atk:1,sta:1}),L('船坞工人战靴','boots','rare',{str:1})] },
    ataldazar: { bosses:{
      '瓦兹拉吉':[L('神圣狩猎长矛','weapon','rare',{atk:1,agi:1}),L('猎豹皮护腕','gloves','rare',{agi:1})],
      '监护者沃尔卡':[L('黄金壁垒之盾','trinket','rare',{def:1,sta:1}),L('监护者腰带','belt','rare',{def:1,str:1})],
      '编织者扎克兰':[L('暗影织网法杖','weapon','rare',{atk:1,int:1}),L('蛛丝披风','armor','rare',{def:1,int:1})],
      '达萨拉先王雷扎安':[L('雷扎安的黄金权杖','weapon','epic',{atk:3,int:2}),L('赞达拉王冠','helmet','epic',{def:2,int:2}),L('诸王陵墓指环','ring','epic',{str:2,sta:1})]
    }, trash:[L('赞达拉护肩','shoulder','rare',{atk:1,sta:1}),L('金字塔守卫战靴','boots','rare',{agi:1})] },
    uldir: { bosses:{
      '魔血之触':[L('腐血之爪','gloves','epic',{atk:2,agi:2}),L('血肉护腿','pants','rare',{hp:1,sta:1})],
      '垫脚石':[L('崩解之核','trinket','epic',{def:2,sta:2}),L('泰坦碎石腰带','belt','rare',{def:1,str:1})],
      '禁锢者泽克伏斯':[L('腐化禁锢权杖','weapon','epic',{atk:2,int:2}),L('实验体护肩','shoulder','rare',{atk:1,int:1})],
      '米斯拉克斯':[L('湮灭之沙护手','gloves','epic',{atk:2,str:2}),L('沙王指环','ring','rare',{str:1})],
      '恐惧之臂沃舒':[L('精神腐蚀法典','weapon','epic',{atk:2,int:2}),L('恐惧兜帽','helmet','rare',{def:1,int:1})],
      '戈霍恩':[L('古神腐血之刃','weapon','legend',{atk:5,agi:3}),L('腐化泰坦胸甲','armor','legend',{def:5,sta:4}),L('血肉王座头冠','helmet','legend',{def:4,int:3}),L('戈霍恩之心','trinket','epic',{sta:2,int:2})]
    }, trash:[L('血肉造物护肩','shoulder','rare',{atk:1,sta:1}),L('实验室战靴','boots','rare',{sta:1})] },
    nightmare: { bosses:{
      '尼提兹':[L('梦魇蛛丝缠腕','gloves','epic',{atk:2,agi:2}),L('结茧护腿','pants','rare',{hp:1,agi:1})],
      '噩梦巨龙':[L('腐蚀龙鳞肩甲','shoulder','epic',{atk:2,str:2}),L('堕梦腰带','belt','rare',{def:1,sta:1})],
      '乌索克之灵':[L('乌索克之爪','weapon','epic',{atk:3,agi:2}),L('熊魂护腕','gloves','rare',{agi:1})],
      '梦魇之龙伊瑟拉':[L('堕落梦境法杖','weapon','epic',{atk:2,int:2}),L('翡翠之眠长袍','armor','rare',{def:1,spi:1})],
      '萨维斯':[L('萨维斯的梦魇之镰','weapon','legend',{atk:5,int:3}),L('腐化德鲁伊胸甲','armor','legend',{def:4,spi:4}),L('梦魇统御头冠','helmet','legend',{def:4,int:3}),L('翡翠梦魇之核','trinket','epic',{sta:2,spi:2})]
    }, trash:[L('梦境守护者护肩','shoulder','rare',{atk:1,spi:1}),L('腐林战靴','boots','rare',{agi:1})] },
    atonement: { bosses:{
      '石裔典狱官':[L('石化战锤','weapon','rare',{atk:1,str:1}),L('典狱官护肩','shoulder','rare',{atk:1,sta:1})],
      '忏悔者阿德琳娜':[L('忏悔长弓','weapon','rare',{atk:1,agi:1}),L('赎罪披风','armor','rare',{def:1,int:1})],
      '高阶领主哈卡':[L('哈卡的审判之锤','weapon','epic',{atk:3,str:2}),L('雷文德斯王冠','helmet','epic',{def:2,int:2}),L('赎罪圣徽','trinket','epic',{sta:2,spi:2})]
    }, trash:[L('石裔魔护手','gloves','rare',{str:1}),L('哥特长靴','boots','rare',{sta:1})] },
    plaguefall: { bosses:{
      '全球大瘟疫':[L('瘟疫喷射臂铠','gloves','rare',{atk:1,int:1}),L('腐液护腿','pants','rare',{hp:1,sta:1})],
      '多曼戈斯':[L('腐蚀药剂瓶','trinket','rare',{sta:1,int:1}),L('炼金腰带','belt','rare',{def:1,int:1})],
      '瘟疫医师玛拉克斯':[L('剧毒之针','weapon','rare',{atk:1,agi:1}),L('瘟疫医师面罩','helmet','rare',{def:1,int:1})],
      '屠夫斯特拉达玛':[L('斯特拉达玛的腐烂巨刃','weapon','epic',{atk:3,str:2}),L('屠夫围裙','armor','epic',{def:2,sta:2}),L('玛卓克萨斯瘟疫指环','ring','epic',{agi:2,sta:1})]
    }, trash:[L('泥沼护肩','shoulder','rare',{atk:1,sta:1}),L('瘟疫行者战靴','boots','rare',{sta:1})] },
    mists: { bosses:{
      '因格拉·玛洛克':[L('缠根之杖','weapon','rare',{atk:1,int:1}),L('林地护腕','gloves','rare',{spi:1})],
      '迷雾呼唤者':[L('迷雾披风','trinket','rare',{sta:1,int:1}),L('雾隐腰带','belt','rare',{def:1,int:1})],
      '特雷德欧瓦':[L('蜕变之刺','weapon','epic',{atk:3,agi:2}),L('孢语者兜帽','helmet','epic',{def:2,int:2}),L('幻林之戒','ring','epic',{agi:2,spi:1})]
    }, trash:[L('玉林护肩','shoulder','rare',{atk:1,spi:1}),L('迷雾行者战靴','boots','rare',{agi:1})] },
    theater: { bosses:{
      '角斗士的挑衅':[L('角斗士战斧','weapon','rare',{atk:1,str:1}),L('竞技场护肩','shoulder','rare',{atk:1,sta:1})],
      '血肉钩刃戈莱什':[L('血肉钩刃','weapon','rare',{atk:1,str:1}),L('屠戮腰带','belt','rare',{def:1,sta:1})],
      '库尔塔罗克':[L('灵魂法典','trinket','rare',{sta:1,int:1}),L('裂魂护腕','gloves','rare',{int:1})],
      '不朽者莫德雷萨':[L('莫德雷萨的死亡之镰','weapon','epic',{atk:3,str:2}),L('不朽者胸铠','armor','epic',{def:2,sta:2}),L('永恒裁决指环','ring','epic',{str:2,sta:1})]
    }, trash:[L('竞技场护手','gloves','rare',{str:1}),L('苦痛剧场战靴','boots','rare',{agi:1})] },
    waycrest: { bosses:{
      '噬心三姐妹':[L('女巫诅咒之杖','weapon','rare',{atk:1,int:1}),L('腐心护腕','gloves','rare',{int:1})],
      '灵魂巨像':[L('恐惧巨像之拳','gloves','rare',{atk:1,str:1}),L('石魂腰带','belt','rare',{def:1,sta:1})],
      '贪食者拉尔':[L('腐烂坠饰','trinket','rare',{sta:1,spi:1}),L('蛆虫护腿','pants','rare',{hp:1,sta:1})],
      '维克雷斯领主夫妇':[L('德鲁斯特仪式匕首','weapon','epic',{atk:3,agi:2}),L('诅咒贵族长袍','armor','epic',{def:2,int:2}),L('荆棘缠绕之冠','helmet','epic',{def:2,spi:2})]
    }, trash:[L('庄园守卫护肩','shoulder','rare',{atk:1,sta:1}),L('德鲁斯特战靴','boots','rare',{int:1})] },
    kingsrest: { bosses:{
      '守墓人迪萨克':[L('陵墓守卫战锤','weapon','rare',{atk:1,str:1}),L('守墓人护肩','shoulder','rare',{atk:1,sta:1})],
      '监工艾克泽勒':[L('黄金机关核心','trinket','rare',{sta:1,int:1}),L('鎏金腰带','belt','rare',{def:1,int:1})],
      '达卡莱巨像':[L('黄金碾压护手','gloves','rare',{atk:1,str:1}),L('巨像护腿','pants','rare',{hp:1,sta:1})],
      '达卡莱先王':[L('先王的黄金权杖','weapon','epic',{atk:3,int:2}),L('达卡莱王冠','helmet','epic',{def:2,int:2}),L('诸王陵墓徽记','trinket','epic',{sta:2,str:2})]
    }, trash:[L('赞达拉陵墓护肩','shoulder','rare',{atk:1,sta:1}),L('盗墓者战靴','boots','rare',{agi:1})] },
    nighthold: { bosses:{
      '蝎钳魔':[L('破甲钳刃','weapon','epic',{atk:2,agi:2}),L('甲壳护腿','pants','rare',{hp:1,agi:1})],
      '提克迪奥斯':[L('黏液喷涌护手','gloves','epic',{atk:2,int:2}),L('炼金腰带','belt','rare',{def:1,int:1})],
      '占星师埃塔莉丝':[L('群星观测之杖','weapon','epic',{atk:2,int:2}),L('观星者兜帽','helmet','rare',{def:1,int:1})],
      '克罗苏斯':[L('燃烧践踏护肩','shoulder','epic',{atk:2,str:2}),L('熔火护腕','gloves','rare',{str:1})],
      '大魔导师艾利桑德':[L('时光沙漏坠饰','trinket','epic',{sta:2,int:2}),L('魔导师指环','ring','rare',{int:1,haste:1})],
      '古尔丹':[L('古尔丹的邪能之颅','weapon','legend',{atk:5,int:4}),L('暗夜要塞秘法长袍','armor','legend',{def:5,int:4}),L('邪能编织头冠','helmet','legend',{def:4,int:3}),L('破碎之魂徽记','trinket','epic',{sta:2,int:2})]
    }, trash:[L('夜之子护肩','shoulder','rare',{atk:1,int:1}),L('苏拉玛长靴','boots','rare',{int:1})] },
    nyalotha: { bosses:{
      '黑龙王子拉希奥':[L('黑龙烈焰之刃','weapon','epic',{atk:2,str:2}),L('龙鳞护腿','pants','rare',{hp:1,str:1})],
      '先知斯基特拉':[L('幻象法典','weapon','epic',{atk:2,int:2}),L('虚影护腕','gloves','rare',{int:1})],
      '暗影审讯官沙奈什':[L('心智折磨权杖','weapon','epic',{atk:2,int:2}),L('审讯者束腰','belt','rare',{def:1,int:1})],
      '沙德拉':[L('腐化吐息护肩','shoulder','epic',{atk:2,agi:2}),L('蛛丝护腿','pants','rare',{hp:1,agi:1})],
      '维克希翁':[L('湮灭之翼指环','ring','epic',{atk:2,vers:1}),L('虚空护手','gloves','rare',{agi:1})],
      '恩佐斯':[L('恩佐斯的腐化之触','weapon','legend',{atk:5,agi:4}),L('古神虚空胸甲','armor','legend',{def:5,sta:4}),L('觉醒之城头冠','helmet','legend',{def:4,int:3}),L('恩佐斯之眼','trinket','legend',{sta:3,int:3})]
    }, trash:[L('虚空教徒护肩','shoulder','rare',{atk:1,int:1}),L('腐化之地战靴','boots','rare',{agi:1})] },
    nathria: { bosses:{
      '尖啸之翼':[L('回声尖啸之弓','weapon','epic',{atk:2,agi:2}),L('蝠翼护腕','gloves','rare',{agi:1})],
      '猎手阿尔提莫':[L('猎犬之牙长矛','weapon','epic',{atk:2,agi:2}),L('猎手腰带','belt','rare',{def:1,agi:1})],
      '噬渴灭世者':[L('饥渴吞噬护手','gloves','epic',{atk:2,str:2}),L('渴血护腿','pants','rare',{hp:1,str:1})],
      '达克文女勋爵':[L('血池法典','weapon','epic',{atk:2,int:2}),L('暗脉护肩','shoulder','rare',{atk:1,int:1})],
      '鲜血议会':[L('贵族夜宴之戒','ring','epic',{int:2,spi:1}),L('议会披风','armor','rare',{def:1,int:1})],
      '主宰者德纳修斯':[L('罪碑之刃·夜歌','weapon','legend',{atk:6,str:4}),L('纳斯利亚堡石血胸甲','armor','legend',{def:5,sta:4}),L('主宰者王冠','helmet','legend',{def:4,int:3}),L('噬渊之心徽记','trinket','legend',{sta:3,str:3})]
    }, trash:[L('雷文德斯护肩','shoulder','rare',{atk:1,sta:1}),L('石裔魔战靴','boots','rare',{sta:1})] },
    vortex: { bosses:{
      '格鲁达鲁':[L('飓风之拳护手','gloves','rare',{atk:1,agi:1}),L('气旋腰带','belt','rare',{def:1,agi:1})],
      '大主祭奥兹鲁克':[L('坠石战锤','weapon','rare',{atk:1,str:1}),L('岩心护腿','pants','rare',{hp:1,sta:1})],
      '阿萨德':[L('阿萨德的旋风之杖','weapon','epic',{atk:3,int:2}),L('风暴守护兜帽','helmet','epic',{def:2,int:2}),L('旋云之戒','ring','epic',{agi:2,haste:1})]
    }, trash:[L('气元素护肩','shoulder','rare',{atk:1,int:1}),L('浮空战靴','boots','rare',{agi:1})] },
    grimrail: { bosses:{
      '工头泽奥格雷尔':[L('蒸汽鞭','weapon','rare',{atk:1,agi:1}),L('工头护腕','gloves','rare',{str:1})],
      '永燃者拉克玛雷':[L('烈焰炮塔核心','trinket','rare',{sta:1,int:1}),L('炎使腰带','belt','rare',{def:1,int:1})],
      '尼托格':[L('尼托格的钢铁巨斧','weapon','epic',{atk:3,str:2}),L('军列重甲','armor','epic',{def:2,sta:2}),L('钢铁码头徽记','trinket','epic',{sta:2,str:2})]
    }, trash:[L('钢铁部落护肩','shoulder','rare',{atk:1,sta:1}),L('铁路工战靴','boots','rare',{str:1})] },
    everbloom: { bosses:{
      '古杉魔藤':[L('荆棘缠绕之杖','weapon','rare',{atk:1,int:1}),L('藤蔓护腕','gloves','rare',{spi:1})],
      '喷涌元素':[L('洪流坠饰','trinket','rare',{sta:1,spi:1}),L('潮汐腰带','belt','rare',{def:1,int:1})],
      '阴森巨兽':[L('野性巨爪','weapon','rare',{atk:1,agi:1}),L('兽皮护腿','pants','rare',{hp:1,agi:1})],
      '雅雷昆':[L('雅雷昆的自然之怒','weapon','epic',{atk:3,agi:2}),L('永茂林冠','helmet','epic',{def:2,spi:2}),L('腐化绽放之戒','ring','epic',{agi:2,spi:1})]
    }, trash:[L('永茂护肩','shoulder','rare',{atk:1,spi:1}),L('温室行者战靴','boots','rare',{agi:1})] },
    neltharus: { bosses:{
      '熔铸者卡格尼':[L('炽炎重锤','weapon','rare',{atk:1,str:1}),L('熔铸护手','gloves','rare',{str:1})],
      '守护者陶提斯':[L('熔岩壁垒之盾','trinket','rare',{def:1,sta:1}),L('守护者腰带','belt','rare',{def:1,sta:1})],
      '盗宝龙裔':[L('龙裔烈焰之刃','weapon','rare',{atk:1,agi:1}),L('龙鳞护腿','pants','rare',{hp:1,str:1})],
      '焰炉之主玛吉莫斯':[L('玛吉莫斯的熔炉之锤','weapon','epic',{atk:3,str:2}),L('黑龙熔铸胸铠','armor','epic',{def:2,sta:2}),L('焰炉徽记','trinket','epic',{sta:2,str:2})]
    }, trash:[L('黑龙护肩','shoulder','rare',{atk:1,sta:1}),L('熔渣战靴','boots','rare',{str:1})] },
    azurevault: { bosses:{
      '莱魔':[L('莱魔的魔网短杖','weapon','rare',{atk:1,int:1}),L('碧蓝禁锢护腕','gloves','rare',{int:1})],
      '青刃构装体':[L('青刃矩阵核心','trinket','rare',{sta:1,int:1}),L('魔钢切割护手','gloves','rare',{atk:1,str:1})],
      '泰拉什·灰翼':[L('灰翼龙息法杖','weapon','rare',{atk:1,int:1}),L('碧蓝翼膜披甲','armor','rare',{def:1,int:1})],
      '安布雷斯库':[L('安布雷斯库的魔网之心','trinket','epic',{sta:2,int:2}),L('奥术终曲法袍','armor','epic',{def:2,int:2}),L('碧蓝宝库指环','ring','epic',{int:2,haste:1})]
    }, trash:[L('魔馆守卫护肩','shoulder','rare',{atk:1,int:1}),L('碧蓝长靴','boots','rare',{int:1})] },
    nokhud: { bosses:{
      '格拉尼斯':[L('鹰风猎矛','weapon','rare',{atk:1,agi:1}),L('风羽护腿','pants','rare',{hp:1,agi:1})],
      '风暴召唤者巴拉卡尔':[L('巴拉卡尔雷矛','weapon','rare',{atk:1,str:1}),L('雷鸣护手','gloves','rare',{str:1})],
      '诺库德猎群':[L('诺库德弯弓','weapon','rare',{atk:1,agi:1}),L('草原追猎腰带','belt','rare',{def:1,agi:1})],
      '可汗巴拉卡':[L('可汗的风暴战刃','weapon','epic',{atk:3,agi:2}),L('诺库德可汗头盔','helmet','epic',{def:2,sta:2}),L('欧恩哈拉战徽','trinket','epic',{sta:2,agi:2})]
    }, trash:[L('草原骑手护肩','shoulder','rare',{atk:1,agi:1}),L('诺库德战靴','boots','rare',{agi:1})] },
    hallsinfusion: { bosses:{
      '守望者艾瑞克':[L('守望者水晶盾','trinket','rare',{def:1,sta:1}),L('水渠护手','gloves','rare',{sta:1})],
      '注能吞噬者':[L('吞噬者粘液瓶','trinket','rare',{sta:1,spi:1}),L('注能护腿','pants','rare',{hp:1,sta:1})],
      '泰坦水道枢纽':[L('水道枢纽权杖','weapon','rare',{atk:1,int:1}),L('泰坦阀门腰带','belt','rare',{def:1,int:1})],
      '原始海啸':[L('原始海啸之杖','weapon','epic',{atk:3,int:2}),L('潮汐回卷长袍','armor','epic',{def:2,spi:2}),L('注能核心指环','ring','epic',{int:2,spi:1})]
    }, trash:[L('注能护肩','shoulder','rare',{atk:1,spi:1}),L('水渠行者战靴','boots','rare',{sta:1})] },
    brackenhide: { bosses:{
      '劈爪战团':[L('劈爪战斧','weapon','rare',{atk:1,str:1}),L('染血护肩','shoulder','rare',{atk:1,sta:1})],
      '腐喉':[L('腐喉骨牙','weapon','rare',{atk:1,agi:1}),L('腐皮护腿','pants','rare',{hp:1,agi:1})],
      '臭皮炼金师':[L('毒雾爆瓶','trinket','rare',{sta:1,int:1}),L('炼金污渍手套','gloves','rare',{int:1})],
      '蕨皮酋长':[L('蕨皮酋长的腐化巨斧','weapon','epic',{atk:3,str:2}),L('瘟疫篝火胸甲','armor','epic',{def:2,sta:2}),L('腐臭氏族徽记','trinket','epic',{sta:2,str:2})]
    }, trash:[L('腐木护肩','shoulder','rare',{atk:1,sta:1}),L('蕨皮行军靴','boots','rare',{str:1})] },
    rookery: { bosses:{
      '基里奥斯':[L('风暴鸦翼长矛','weapon','rare',{atk:1,agi:1}),L('雷羽护腕','gloves','rare',{agi:1})],
      '风暴卫士戈伦':[L('戈伦的雷矛','weapon','rare',{atk:1,str:1}),L('栖巢守卫腰带','belt','rare',{def:1,sta:1})],
      '虚石畸体':[L('虚石坠片法杖','weapon','epic',{atk:3,int:2}),L('悬崖栖巢胸甲','armor','epic',{def:2,sta:2}),L('崩巢回响徽记','trinket','epic',{sta:2,int:2})]
    }, trash:[L('栖巢巡行护肩','shoulder','rare',{atk:1,agi:1}),L('风切步履','boots','rare',{agi:1})] },
    cinderbrew: { bosses:{
      '酿造大师奥德里尔':[L('奥德里尔的酿火酒杯','trinket','rare',{sta:1,int:1}),L('滚烫酒保手套','gloves','rare',{int:1})],
      '伊帕':[L('烈酿喷焰杖','weapon','rare',{atk:1,int:1}),L('泡腾腰带','belt','rare',{def:1,int:1})],
      '本克·嗡鸣':[L('嗡鸣蜂刺','weapon','rare',{atk:1,agi:1}),L('工蜂护腿','pants','rare',{hp:1,agi:1})],
      '戈尔迪·底金男爵':[L('底金男爵的蜜币权杖','weapon','epic',{atk:3,int:2}),L('燧酿酒庄礼服','armor','epic',{def:2,int:2}),L('爆燃分红印记','trinket','epic',{sta:2,int:2})]
    }, trash:[L('蜜浆护肩','shoulder','rare',{atk:1,int:1}),L('酒窖奔跑靴','boots','rare',{agi:1})] },
    darkflame: { bosses:{
      '老蜡须':[L('熔蜡短斧','weapon','rare',{atk:1,str:1}),L('蜡须护手','gloves','rare',{sta:1})],
      '布雷兹康':[L('暗焰火苗法杖','weapon','rare',{atk:1,int:1}),L('余烬护腿','pants','rare',{hp:1,int:1})],
      '蜡烛之王':[L('烛王之冠','helmet','rare',{def:1,int:1}),L('王庭烛泪指环','ring','rare',{int:1,spi:1})],
      '黑暗化身':[L('裂口暗焰之刃','weapon','epic',{atk:3,agi:2}),L('暗焰裂口胸甲','armor','epic',{def:2,sta:2}),L('终烬徽记','trinket','epic',{sta:2,agi:2})]
    }, trash:[L('烛影护肩','shoulder','rare',{atk:1,int:1}),L('裂口烬行靴','boots','rare',{sta:1})] },
    dawnbreaker: { bosses:{
      '影冠发言者':[L('影冠低语法典','weapon','rare',{atk:1,int:1}),L('发言者锁环','ring','rare',{int:1,vers:1})],
      '阿努布伊卡基':[L('伊卡基毒牙','weapon','rare',{atk:1,agi:1}),L('空降蛛丝腰带','belt','rare',{def:1,agi:1})],
      '拉夏南':[L('拉夏南的战翼长弓','weapon','epic',{atk:3,agi:2}),L('破晓号甲板胸甲','armor','epic',{def:2,sta:2}),L('陨圣峪风暴徽记','trinket','epic',{sta:2,agi:2})]
    }, trash:[L('影冠突击肩甲','shoulder','rare',{atk:1,agi:1}),L('甲板疾行靴','boots','rare',{agi:1})] },
    arakara: { bosses:{
      '阿瓦诺克斯':[L('阿瓦诺克斯丝牙','weapon','rare',{atk:1,agi:1}),L('孵群甲壳护腕','gloves','rare',{agi:1})],
      '阿努布泽克特':[L('泽克特的毒囊法器','weapon','rare',{atk:1,int:1}),L('回响之城护腿','pants','rare',{hp:1,spi:1})],
      '收割者基卡塔尔':[L('基卡塔尔的收割镰刃','weapon','epic',{atk:3,agi:2}),L('回响之城胸甲','armor','epic',{def:2,sta:2}),L('蛛巢收成徽记','trinket','epic',{sta:2,agi:2})]
    }, trash:[L('回响蛛网护肩','shoulder','rare',{atk:1,agi:1}),L('丝巷潜行靴','boots','rare',{agi:1})] },
    citythreads: { bosses:{
      '第五纱网演说家克里克斯维兹克':[L('纱网演说权杖','weapon','rare',{atk:1,int:1}),L('演说席位指环','ring','rare',{int:1,spi:1})],
      '女王之牙':[L('女王之牙短匕','weapon','rare',{atk:1,agi:1}),L('王廷潜袭护手','gloves','rare',{agi:1})],
      '凝结聚合体':[L('黑血聚核','trinket','rare',{sta:1,int:1}),L('聚合体束腰','belt','rare',{def:1,sta:1})],
      '大切接师伊佐':[L('伊佐的王廷切接刃','weapon','epic',{atk:3,agi:2}),L('千丝之城胸甲','armor','epic',{def:2,sta:2}),L('宫廷缝线徽记','trinket','epic',{sta:2,agi:2})]
    }, trash:[L('纱网护肩','shoulder','rare',{atk:1,int:1}),L('织都步履','boots','rare',{haste:1})] },
    eternalpalace: { bosses:{
      '暗鳞军团':[L('深海齐射之弓','weapon','epic',{atk:2,agi:2}),L('鳞甲护腿','pants','rare',{hp:1,agi:1})],
      '飘雾艾尔':[L('迷雾毒针匕首','weapon','epic',{atk:2,agi:2}),L('水母护腕','gloves','rare',{agi:1})],
      '深渊指挥官西瓦拉':[L('寒潮权杖','weapon','epic',{atk:2,int:2}),L('冰封指挥官腰带','belt','rare',{def:1,int:1})],
      '黑暗预言者':[L('虚空预言兜帽','helmet','epic',{def:2,int:2}),L('低语护肩','shoulder','rare',{atk:1,int:1})],
      '深渊领主':[L('深渊缠绕指环','ring','epic',{atk:2,vers:1}),L('触须护手','gloves','rare',{str:1})],
      '阿兹莎拉女王':[L('阿兹莎拉的海妖权杖','weapon','legend',{atk:5,int:4}),L('永恒王宫圣袍','armor','legend',{def:5,int:4}),L('女王王冠','helmet','legend',{def:4,int:3}),L('深海之心徽记','trinket','legend',{sta:3,int:3})]
    }, trash:[L('纳迦守卫护肩','shoulder','rare',{atk:1,int:1}),L('深海长靴','boots','rare',{agi:1})] },
    aberrus: { bosses:{
      '卡赞':[L('奥术湮灭之杖','weapon','epic',{atk:2,int:2}),L('虚空护腕','gloves','rare',{int:1})],
      '焚化者拉什卡尔':[L('熔火喷涌护肩','shoulder','epic',{atk:2,str:2}),L('炽炎护腿','pants','rare',{hp:1,str:1})],
      '鲜血法师沙拉嘎':[L('血肉重塑法典','weapon','epic',{atk:2,int:2}),L('鲜血腰带','belt','rare',{def:1,int:1})],
      '禁锢魔像':[L('崩解护手','gloves','epic',{atk:2,str:2}),L('魔像核心坠饰','trinket','rare',{sta:1,def:1})],
      '黑龙萨拉塔斯':[L('暗影烈焰指环','ring','epic',{atk:2,int:1}),L('黑龙护肩','shoulder','rare',{atk:1,str:1})],
      '化身奈萨里奥':[L('奈萨里奥的熔铸巨刃','weapon','legend',{atk:6,str:4}),L('暗影熔炉胸甲','armor','legend',{def:5,sta:4}),L('化身龙鳞头冠','helmet','legend',{def:4,int:3}),L('熔炉之心徽记','trinket','legend',{sta:3,str:3})]
    }, trash:[L('熔炉守卫护肩','shoulder','rare',{atk:1,sta:1}),L('厄苏戈尔战靴','boots','rare',{str:1})] },
    amirdrassil: { bosses:{
      '古加冯':[L('远古践踏护手','gloves','epic',{atk:2,str:2}),L('巨兽护腿','pants','rare',{hp:1,sta:1})],
      '史矛莱什':[L('腐化吐息之杖','weapon','epic',{atk:2,int:2}),L('蛀虫护腕','gloves','rare',{agi:1})],
      '拉莎农':[L('烈风长弓','weapon','epic',{atk:2,agi:2}),L('风羽护肩','shoulder','rare',{atk:1,agi:1})],
      '织焰巫女':[L('梦火法典','weapon','epic',{atk:2,int:2}),L('炽焰腰带','belt','rare',{def:1,int:1})],
      '暮光化身':[L('暗影裂解指环','ring','epic',{atk:2,vers:1}),L('暮光护腕','gloves','rare',{int:1})],
      '炎魔之王弗拉戈斯':[L('弗拉戈斯的炎魔之锤','weapon','legend',{atk:6,str:4}),L('希望之梦圣甲','armor','legend',{def:5,spi:4}),L('世界树守护头冠','helmet','legend',{def:4,int:3}),L('梦境之心徽记','trinket','legend',{sta:3,spi:3})]
    }, trash:[L('梦境守护者护肩','shoulder','rare',{atk:1,spi:1}),L('烈焰之地战靴','boots','rare',{agi:1})] },
    stonevault: { bosses:{
      '掌炉者艾里克':[L('掌炉者的炽岩锤','weapon','epic',{atk:3,str:2}),L('炉心护手','gloves','rare',{str:1,sta:1})],
      '晶化守卫':[L('晶化壁垒徽记','trinket','epic',{def:2,sta:2}),L('晶脉护腿','pants','rare',{hp:1,sta:1})],
      '机械议长布洛克':[L('布洛克的齿轮权杖','weapon','epic',{atk:3,int:2}),L('议长矩阵指环','ring','rare',{int:1,haste:1})],
      '虚空矩阵守护者':[L('虚空矩阵长杖','weapon','legend',{atk:5,int:4}),L('泰坦归档胸甲','armor','epic',{def:3,sta:2}),L('裂隙稳定器','trinket','legend',{sta:3,int:3})]
    }, trash:[L('土灵巡逻护肩','shoulder','rare',{atk:1,sta:1}),L('宝库行者战靴','boots','rare',{str:1})] },
    prioryflame: { bosses:{
      '信标守卫加伦':[L('信标守卫战锤','weapon','epic',{atk:3,str:2}),L('圣焰壁垒护肩','shoulder','rare',{def:1,sta:1})],
      '烛光修士艾丹':[L('烛光圣典','weapon','epic',{atk:3,int:2}),L('修士祷言指环','ring','rare',{spi:1,int:1})],
      '圣焰骑士团':[L('阿拉希骑枪','weapon','epic',{atk:3,str:2}),L('殉道者护腿','pants','rare',{hp:1,str:1})],
      '隐修院长穆普雷':[L('穆普雷的圣焰权杖','weapon','legend',{atk:5,int:4}),L('隐修院圣袍','armor','epic',{def:3,spi:2}),L('永燃信标','trinket','legend',{sta:3,spi:3})]
    }, trash:[L('圣焰侍从护手','gloves','rare',{int:1}),L('阿拉希行军靴','boots','rare',{sta:1})] },
    nightfall_sanctum: { bosses:{
      '暗潮钥卫':[L('暗潮钥刃','weapon','epic',{atk:3,agi:2}),L('钥卫锁链腰带','belt','rare',{def:1,agi:1})],
      '低语宝箱':[L('低语宝箱徽记','trinket','epic',{sta:2,int:2}),L('贪婪之戒','ring','rare',{atk:1,vers:1})],
      '夜落看守者':[L('夜落镰刀','weapon','legend',{atk:5,agi:4}),L('地下堡暗影胸甲','armor','epic',{def:3,agi:2}),L('看守者的黑钥','trinket','legend',{sta:3,agi:3})]
    }, trash:[L('夜落护肩','shoulder','rare',{atk:1,agi:1}),L('暗潮潜行靴','boots','rare',{agi:1})] },
    earthcrawl_mines: { bosses:{
      '蛛网矿工队':[L('蛛网矿镐','weapon','epic',{atk:3,str:2}),L('矿工缠网护手','gloves','rare',{atk:1,agi:1})],
      '工头皮夫克':[L('皮夫克的超载灯锤','weapon','epic',{atk:3,str:2}),L('工头齿轮指环','ring','rare',{haste:1,sta:1})],
      '地匍蛛母':[L('蛛母毒牙战刃','weapon','legend',{atk:5,agi:4}),L('地匍甲壳胸甲','armor','epic',{def:3,sta:2}),L('矿洞蛛丝徽记','trinket','legend',{sta:3,agi:3})]
    }, trash:[L('矿洞巡行护肩','shoulder','rare',{atk:1,sta:1}),L('蛛网踏行靴','boots','rare',{agi:1})] },
    fungal_folly: { bosses:{
      '孢子看守':[L('孢子看守长杖','weapon','epic',{atk:3,int:2}),L('菌雾护腿','pants','rare',{hp:1,spi:1})],
      '蘑菇术士维洛':[L('维洛的菌丝法典','weapon','epic',{atk:3,int:2}),L('蘑菇术士指环','ring','rare',{int:1,vers:1})],
      '菌潮巨怪':[L('菌潮巨槌','weapon','legend',{atk:5,str:4}),L('真菌孢子胸甲','armor','epic',{def:3,sta:2}),L('愚者盛放徽记','trinket','legend',{sta:3,int:3})]
    }, trash:[L('孢子行者腰带','belt','rare',{def:1,spi:1}),L('菌丝软靴','boots','rare',{int:1})] },
    archival_assault: { bosses:{
      '档案劫掠者':[L('劫掠者的卷宗刀','weapon','epic',{atk:3,agi:2}),L('被盗档案护腕','gloves','rare',{int:1,haste:1})],
      '相位门卫欧索':[L('欧索的折光权杖','weapon','epic',{atk:3,int:2}),L('相位门卫指环','ring','rare',{sta:1,vers:1})],
      '节点公主凯维扎':[L('凯维扎的节点刃','weapon','legend',{atk:5,agi:4}),L('档案突袭胸甲','armor','epic',{def:3,sta:2}),L('蓝龙档案核心','trinket','legend',{sta:3,int:3})]
    }, trash:[L('虚灵海盗护肩','shoulder','rare',{atk:1,agi:1}),L('折光档案靴','boots','rare',{int:1})] },
    ecodome_aldani: { bosses:{
      '阿尔达尼吞噬者':[L('吞噬者骨镰','weapon','epic',{atk:3,agi:2}),L('圆顶啃噬护手','gloves','epic',{atk:2,sta:2})],
      '荒原双子':[L('荒原双刃','weapon','epic',{atk:3,str:2}),L('掠夺者契约戒','ring','epic',{str:2,vers:1})],
      '生态看护者阿尔达尼':[L('阿尔达尼生命法杖','weapon','legend',{atk:5,int:4}),L('生态看护胸甲','armor','epic',{def:3,spi:2}),L('圆顶复苏徽记','trinket','legend',{sta:3,spi:3})]
    }, trash:[L('生态圆顶护肩','shoulder','rare',{sta:1,spi:1}),L('荒原行者战靴','boots','rare',{agi:1})] },
    oasis_succession: { bosses:{
      '水化幼体群':[L('水化幼体骨镰','weapon','epic',{atk:3,agi:2}),L('幼体甲壳护手','gloves','epic',{atk:2,sta:2})],
      '入侵孢母':[L('孢母菌丝法杖','weapon','epic',{atk:3,int:2}),L('侵蚀孢云指环','ring','epic',{int:2,vers:1})],
      '绿洲守望者菲拉':[L('菲拉的复苏长杖','weapon','legend',{atk:5,spi:4}),L('绿洲守望胸甲','armor','epic',{def:3,spi:2}),L('生命网晶核','trinket','legend',{sta:3,spi:3})]
    }, trash:[L('复苏圆顶腰带','belt','rare',{def:1,spi:1}),L('绿洲巡行靴','boots','rare',{agi:1})] },
    tazavesh_streets: { bosses:{
      '佐·帕克斯':[L('佐帕克斯快递锤','weapon','epic',{atk:3,str:2}),L('分拣员护手','gloves','epic',{haste:2,sta:1})],
      '卖品会':[L('竞拍会切肉刀','weapon','epic',{atk:3,agi:2}),L('成交价码戒','ring','epic',{atk:2,vers:1})],
      '麦扎的绿洲':[L('绿洲返场法杖','weapon','epic',{atk:3,int:2}),L('麦扎的节拍护肩','shoulder','epic',{int:2,haste:1})],
      '索·莉亚':[L('索莉亚的市场星刃','weapon','legend',{atk:5,agi:4}),L('绿洲财团胸甲','armor','epic',{def:3,sta:2}),L('超光束折射器','trinket','legend',{sta:3,int:3})]
    }, trash:[L('帷纱街巷腰带','belt','rare',{def:1,agi:1}),L('掮灵跑腿靴','boots','rare',{haste:1})] },
    tazavesh_gambit: { bosses:{
      '海盗议会':[L('财团海盗弯刀','weapon','epic',{atk:3,agi:2}),L('登船钩索护手','gloves','epic',{atk:2,haste:1})],
      '邮件室混乱体':[L('错投爆弹发射器','weapon','epic',{atk:3,int:2}),L('分拣矩阵指环','ring','epic',{int:2,vers:1})],
      '希尔布兰德':[L('希尔布兰德安保锤','weapon','epic',{atk:3,str:2}),L('泰坦安保胸甲','armor','epic',{def:3,sta:2})],
      '索·莉亚的宏图':[L('索财的星界宏图','weapon','legend',{atk:6,int:4}),L('财团债务王冠','helmet','epic',{def:3,int:2}),L('宏图清算徽记','trinket','legend',{sta:3,int:3})]
    }, trash:[L('索财水手护肩','shoulder','rare',{atk:1,agi:1}),L('星界航线长靴','boots','rare',{haste:1})] },
    overlook_zoshul: { bosses:{
      '瞰台测绘师':[L('测绘师裂距尺','weapon','epic',{atk:3,int:2}),L('瞰台校准护手','gloves','epic',{int:2,haste:1})],
      '裂隙校准体':[L('裂隙校准晶杖','weapon','epic',{atk:3,int:2}),L('折光校准指环','ring','epic',{int:2,vers:1})],
      '瞰台司辰扎里克':[L('扎里克的司辰星镜','weapon','legend',{atk:6,int:4}),L('瞰台观星胸甲','armor','epic',{def:3,sta:2}),L('群星锁定徽记','trinket','legend',{sta:3,int:3})]
    }, trash:[L('测绘巡路肩甲','shoulder','rare',{atk:1,int:1}),L('瞰台踏风长靴','boots','rare',{haste:1})] },
    ecodome_rhovan: { bosses:{
      '灌溉执机者':[L('执机回灌杖','weapon','epic',{atk:3,int:2}),L('灌溉护带','belt','epic',{def:2,spi:1})],
      '吞壤孵母':[L('吞壤啃蚀骨镰','weapon','epic',{atk:3,agi:2}),L('孵群甲壳护腿','pants','epic',{hp:2,sta:2})],
      '谱系修补师':[L('谱系修补法典','weapon','epic',{atk:3,int:2}),L('修补师灵纹戒','ring','epic',{int:2,mastery:1})],
      '芽冠主脑瑞欧萨':[L('瑞欧萨的芽冠脉杖','weapon','legend',{atk:6,spi:4}),L('罗凡谱系胸甲','armor','epic',{def:3,spi:2}),L('生命谱系晶核','trinket','legend',{sta:3,spi:3})]
    }, trash:[L('圆顶苗圃肩垫','shoulder','rare',{atk:1,spi:1}),L('湿地园丁长靴','boots','rare',{int:1})] },
    shadowpoint_breach: { bosses:{
      '界钉炮手':[L('界钉炮手破城枪','weapon','epic',{atk:3,str:2}),L('火炮回震护手','gloves','epic',{str:2,haste:1})],
      '裂航狙击队':[L('裂航狙击弓','weapon','epic',{atk:3,agi:2}),L('锁定者肩甲','shoulder','epic',{atk:2,agi:2})],
      '影卫相位校尉':[L('校尉折相刃','weapon','epic',{atk:3,agi:2}),L('影点校准指环','ring','epic',{agi:2,vers:1})],
      '影卫指挥官索拉辛':[L('索拉辛的裂轨战刃','weapon','legend',{atk:6,agi:4}),L('影点指挥胸甲','armor','epic',{def:3,sta:2}),L('吞界火线棱芯','trinket','legend',{sta:3,agi:3})]
    }, trash:[L('影卫战区束腰','belt','rare',{def:1,agi:1}),L('裂隙壕沟战靴','boots','rare',{haste:1})] },
    primeus_repository: { bosses:{
      '圣所馆卫':[L('馆卫折光槌','weapon','epic',{atk:3,str:2}),L('秘库索引护手','gloves','epic',{int:2,haste:1})],
      '抄录审判官':[L('审判官删改尺','weapon','epic',{atk:3,int:2}),L('删定印戒','ring','epic',{int:2,vers:1})],
      '群星馆长索·普莱翁':[L('普莱翁的群星馆匙','weapon','legend',{atk:6,int:4}),L('档案穹厅胸甲','armor','epic',{def:3,sta:2}),L('终卷抄录晶核','trinket','legend',{sta:3,int:3})]
    }, trash:[L('抄录前庭肩垫','shoulder','rare',{atk:1,int:1}),L('秘库巡路长靴','boots','rare',{haste:1})] },
    nerubar: { bosses:{
      '乌格拉克斯':[L('暴食虫颚战斧','weapon','epic',{atk:3,str:2}),L('王宫甲壳护腿','pants','epic',{hp:2,sta:2})],
      '血缚恐魔':[L('黑血法典','weapon','epic',{atk:3,int:2}),L('血缚指环','ring','epic',{int:2,vers:1})],
      '席克兰':[L('斩丝者双刃','weapon','epic',{atk:3,agi:2}),L('相位行者长靴','boots','epic',{atk:2,haste:1})],
      '拉夏南':[L('拉夏南毒翼弓','weapon','epic',{atk:3,agi:2}),L('虫翼护肩','shoulder','epic',{atk:2,agi:2})],
      '节点女亲王':[L('节点女亲王权杖','weapon','epic',{atk:3,int:2}),L('节点调谐徽记','trinket','epic',{sta:2,int:2})],
      '流丝之庭':[L('流丝庭院护手','gloves','epic',{atk:2,agi:2}),L('织命胸甲','armor','epic',{def:3,sta:2})],
      '安苏雷克女王':[L('安苏雷克的黑血王刃','weapon','legend',{atk:7,agi:5}),L('尼鲁巴尔女王冠冕','helmet','legend',{def:5,int:4}),L('蛛魔帝国胸甲','armor','legend',{def:6,sta:4}),L('黑血王权徽记','trinket','legend',{sta:4,int:4})]
    }, trash:[L('蛛魔禁卫护肩','shoulder','rare',{atk:1,sta:1}),L('王宫织丝长靴','boots','rare',{agi:1})] },
    manaforge_omega: { bosses:{
      '枢纽哨兵':[L('枢纽哨兵战刃','weapon','epic',{atk:3,str:2}),L('哨兵矩阵护腿','pants','epic',{hp:2,sta:2})],
      "卢米萨尔":[L('卢米萨尔星丝杖','weapon','epic',{atk:3,int:2}),L('织星护肩','shoulder','epic',{atk:2,int:2})],
      '缚魂者娜欣德莉':[L('娜欣德莉缚魂法典','weapon','epic',{atk:3,int:2}),L('缚魂指环','ring','epic',{int:2,vers:1})],
      '织炉者阿拉兹':[L('阿拉兹熔炉锤','weapon','epic',{atk:3,str:2}),L('织炉者护手','gloves','epic',{atk:2,haste:1})],
      '噬魂猎手':[L('噬魂猎弓','weapon','epic',{atk:3,agi:2}),L('猎魂战靴','boots','epic',{atk:2,agi:2})],
      '碎裂者弗拉克提勒斯':[L('弗拉克提勒斯晶刃','weapon','epic',{atk:3,agi:2}),L('棱镜胸甲','armor','epic',{def:3,sta:2})],
      '枢纽之王萨哈达尔':[L('萨哈达尔王权权杖','weapon','epic',{atk:4,int:2}),L('枢纽王冠','helmet','epic',{def:3,int:2})],
      '诸界吞噬者迪门修斯':[L('迪门修斯的吞界星刃','weapon','legend',{atk:8,int:5}),L('欧米伽熔炉冠冕','helmet','legend',{def:5,int:5}),L('诸界吞噬胸甲','armor','legend',{def:7,sta:5}),L('无界虚空徽记','trinket','legend',{sta:5,int:5})]
    }, trash:[L('影卫虚灵护肩','shoulder','rare',{atk:1,int:1}),L('欧米伽管道战靴','boots','rare',{haste:1})] },
    shandorah_conclave: { bosses:{
      '断阶守誓者':[L('守誓者碎阶锤','weapon','epic',{atk:4,str:2}),L('断阶肩甲','shoulder','epic',{def:2,sta:2})],
      '棱镜观测者':[L('观测者棱镜杖','weapon','epic',{atk:4,int:2}),L('折光锁环','ring','epic',{int:2,mastery:1})],
      '仪轨编年官':[L('编年仪轨法典','weapon','epic',{atk:4,int:2}),L('仪轨抄录手套','gloves','epic',{int:2,haste:1})],
      '沙恩多拉双星':[L('双星会切之刃','weapon','epic',{atk:4,agi:2}),L('星潮合鸣护腿','pants','epic',{hp:2,agi:2})],
      '天穹测距者':[L('测距者星眼长弓','weapon','epic',{atk:4,agi:2}),L('天穹步履','boots','epic',{atk:2,haste:1})],
      '虚空航线执笔人':[L('航线执笔权杖','weapon','epic',{atk:4,int:2}),L('议会刻线胸甲','armor','epic',{def:3,sta:2})],
      '群星议长索·阿兹拉':[L('索阿兹拉的群星议槌','weapon','legend',{atk:8,int:5}),L('沙恩多拉观星冠冕','helmet','legend',{def:5,int:4}),L('议会定标胸甲','armor','legend',{def:7,sta:5}),L('终末航线徽记','trinket','legend',{sta:5,int:5})]
    }, trash:[L('观星议卫护肩','shoulder','rare',{atk:1,int:1}),L('星相长廊战靴','boots','rare',{haste:1})] },
    voidrazor_sanctum: { bosses:{
      '庇护壁垒机':[L('壁垒棱幕拳套','weapon','epic',{atk:4,str:2}),L('棱幕护肩','shoulder','epic',{def:2,sta:2})],
      '虚刃掠食兽':[L('虚刃掠食弯爪','weapon','epic',{atk:4,agi:2}),L('剃锋甲壳护腿','pants','epic',{hp:2,agi:2})],
      '裂幕引航者':[L('引航者裂幕法典','weapon','epic',{atk:4,int:2}),L('边界删定锁环','ring','epic',{int:2,vers:1})],
      '圆顶求生议会':[L('求生议会壁盾','weapon','epic',{atk:4,str:2}),L('庇护辩证胸甲','armor','epic',{def:3,sta:2})],
      '吞界剃刀体':[L('吞界剃刀巨镰','weapon','epic',{atk:4,agi:2}),L('裂隙剖面长靴','boots','epic',{atk:2,haste:1})],
      '庇护执裁官萨·维克斯':[L('执裁官剃锋权杖','weapon','epic',{atk:4,int:2}),L('庇护宣判冠','helmet','epic',{def:3,int:2})],
      '吞界观测主脑阿兹莫垩':[L('阿兹莫垩的吞界剃刃','weapon','legend',{atk:8,int:5}),L('虚无剃刀冠冕','helmet','legend',{def:5,int:4}),L('圣所终域胸甲','armor','legend',{def:7,sta:5}),L('吞界观测徽记','trinket','legend',{sta:5,int:5})]
    }, trash:[L('庇护所裂幕护肩','shoulder','rare',{atk:1,int:1}),L('虚刃边界战靴','boots','rare',{haste:1})] },
    murder_row: { bosses:{
      '姬丝蒂娅·法力之心':[L('法力之心邪焰杖','weapon','epic',{atk:4,int:2}),L('暗巷魔导师护手','gloves','epic',{int:2,haste:1})],
      '扎恩·刃悲':[L('刃悲走私双刃','weapon','epic',{atk:4,agi:2}),L('巷口账本指环','ring','epic',{agi:2,vers:1})],
      '毁灭者萨苏克斯':[L('萨苏克斯毁灭战锤','weapon','epic',{atk:4,str:2}),L('恶魔承运胸甲','armor','epic',{def:3,sta:2})],
      '莉希尔·烬怒':[L('烬怒的银月暗刃','weapon','legend',{atk:8,int:5}),L('谋杀巷黑账徽记','trinket','legend',{sta:5,int:5})]
    }, trash:[L('邪能走私护肩','shoulder','rare',{atk:1,int:1}),L('暗巷快靴','boots','rare',{haste:1})] },
    den_nalorakk: { bosses:{
      '囤货者霍尔蒙格':[L('囤货者切肉斧','weapon','epic',{atk:4,str:2}),L('贪食者束腰','belt','epic',{def:2,sta:2})],
      '冬境哨兵':[L('冬境冰矛','weapon','epic',{atk:4,int:2}),L('严冬哨兵护腿','pants','epic',{hp:2,sta:2})],
      '纳洛拉克':[L('纳洛拉克战爪','weapon','legend',{atk:8,str:5}),L('熊神梦境胸甲','armor','legend',{def:7,sta:5}),L('洛阿战争徽记','trinket','legend',{sta:5,str:5})]
    }, trash:[L('阿曼尼试炼护肩','shoulder','rare',{atk:1,str:1}),L('兽穴巡猎靴','boots','rare',{agi:1})] },
    maisara_caverns: { bosses:{
      '穆罗金与奈克拉克斯':[L('奈克拉克斯翼刃','weapon','epic',{atk:4,agi:2}),L('追猎者护手','gloves','epic',{atk:2,haste:1})],
      '沃达扎':[L('沃达扎魂瓶法杖','weapon','epic',{atk:4,int:2}),L('死仪锁环','ring','epic',{int:2,vers:1})],
      '拉克图尔':[L('拉克图尔缚魂巨刃','weapon','legend',{atk:8,str:5}),L('迈萨拉魂葬胸甲','armor','legend',{def:7,sta:5}),L('邪枝死魂徽记','trinket','legend',{sta:5,int:5})]
    }, trash:[L('邪枝洞窟腰带','belt','rare',{def:1,int:1}),L('献祭洞窟战靴','boots','rare',{haste:1})] },
    silvermoon_voidspire: { bosses:{
      '日井裂隙守望者':[L('裂辉守望者法杖','weapon','epic',{atk:4,int:2}),L('日井回灌护肩','shoulder','epic',{int:2,mastery:1})],
      '血骑士断誓者':[L('断誓圣裁锤','weapon','epic',{atk:4,str:2}),L('血誓反照胸甲','armor','epic',{def:3,sta:2})],
      '远行者虚空猎手':[L('虚空猎手长弓','weapon','epic',{atk:4,agi:2}),L('远行者裂隙战靴','boots','epic',{atk:2,haste:1})],
      '萨拉塔斯的裂隙回声':[L('裂隙回声暗星刃','weapon','legend',{atk:9,int:5}),L('银月坠夜冠冕','helmet','legend',{def:6,int:5}),L('虚空尖塔徽记','trinket','legend',{sta:5,int:5})]
    }, trash:[L('银月尖塔护手','gloves','rare',{int:1,haste:1}),L('血骑士巡塔靴','boots','rare',{str:1})] },
    sporefall: { bosses:{
      '腐沼':[L('腐沼真菌巨槌','weapon','legend',{atk:9,str:5}),L('孢落菌冠','helmet','legend',{def:6,spi:5}),L('发光孢翼徽记','trinket','legend',{sta:6,spi:5}),L('末日蘑菇护胸','armor','legend',{def:8,sta:6})]
    }, trash:[L('孢潮菌丝护肩','shoulder','epic',{atk:2,spi:2}),L('哈兰达尔孢靴','boots','epic',{haste:2,sta:1})] },
    curse_ulatek: { bosses:{
      '盘绕岛守门者':[L('盘绕门槛巨斧','weapon','epic',{atk:5,str:3}),L('守门者肩甲','shoulder','epic',{def:3,sta:2})],
      '失语先知玛洛斯':[L('失语预言法典','weapon','epic',{atk:5,int:3}),L('低语折返戒','ring','epic',{int:3,vers:2})],
      '四神庙残影':[L('四神庙残影战刃','weapon','epic',{atk:5,agi:3}),L('洛阿残响护腿','pants','epic',{hp:3,agi:2})],
      '银月裂法者':[L('裂法者星杖','weapon','epic',{atk:5,int:3}),L('裂法回路胸甲','armor','epic',{def:4,sta:3})],
      '诅咒载体乌拉泰克':[L('乌拉泰克的午夜终刃','weapon','legend',{atk:10,int:6}),L('终咒升格冠冕','helmet','legend',{def:7,int:6}),L('盘绕岛终末胸甲','armor','legend',{def:9,sta:7}),L('午夜终咒徽记','trinket','legend',{sta:7,int:6})]
    }, trash:[L('盘绕岛巡礼护肩','shoulder','rare',{atk:2,int:1}),L('诅咒回声战靴','boots','rare',{haste:1,vers:1})] }
  };

  for (const dg of extraDungeons) ensureDungeon(dg, extraLoot[dg.key]);

  const raidLegendaryExpansions = {
    mc: { '拉格纳罗斯':[L('炎魔护肩','shoulder','legend',{atk:3,str:3}),L('熔火之心胸甲','armor','legend',{def:4,sta:3}),L('萨弗隆踏火战靴','boots','legend',{atk:3,critd:2})] },
    bwl:{ '奈法利安':[L('黑龙王脊甲','armor','legend',{def:4,sta:3}),L('龙王统御肩铠','shoulder','legend',{atk:3,int:3}),L('奈法利安之握','gloves','legend',{atk:3,crit:2})] },
    naxx:{ '克尔苏加德':[L('霜火披覆胸铠','armor','legend',{def:4,int:3}),L('通灵护腕','gloves','legend',{atk:3,int:3}),L('霜墓步履','boots','legend',{def:3,sta:3})] },
    karazhan:{ '麦迪文':[L('守护者王权肩饰','shoulder','legend',{atk:3,int:3}),L('逆时星环','ring','legend',{atk:3,haste:2}),L('占星者长靴','boots','legend',{def:3,int:3})] },
    sunwell:{ '基尔加丹':[L('欺诈者肩饰','shoulder','legend',{atk:3,int:3}),L('逐日者长裤','pants','legend',{hp:4,int:3}),L('永恒晨星指环','ring','legend',{atk:3,haste:2})] },
    ulduar:{ '尤格-萨隆':[L('远古王者胸甲','armor','legend',{def:4,sta:3}),L('疯狂低语肩垫','shoulder','legend',{atk:3,spi:3}),L('泰坦步履','boots','legend',{def:3,vers:2})] },
    ruby:{ '海里昂':[L('暮光龙鳞肩甲','shoulder','legend',{atk:3,int:3}),L('暮光回响长裤','pants','legend',{hp:4,int:3}),L('暮影护手','gloves','legend',{atk:3,haste:2})] },
    icc:{ '巫妖王':[L('巫妖王的巨龙肩铠','shoulder','legend',{atk:3,str:3}),L('王座束腰','belt','legend',{def:4,sta:3}),L('冰封王座战靴','boots','legend',{atk:3,critd:2})] },
    aq40:{ '克苏恩':[L('古神心室胸铠','armor','legend',{def:4,sta:3}),L('其拉王庭长裤','pants','legend',{hp:4,int:3}),L('疯狂之环','ring','legend',{atk:3,vers:2})] },
    ssc:{ '瓦丝琪':[L('海妖王庭肩饰','shoulder','legend',{atk:3,int:3}),L('盘牙皇女长靴','boots','legend',{atk:3,haste:2}),L('蛇鳞禁卫护手','gloves','legend',{def:3,sta:3})] },
    tk:{ '凯尔萨斯·逐日者':[L('日怒余烬腰带','belt','legend',{def:4,int:3}),L('王权凤凰之戒','ring','legend',{atk:3,critd:2}),L('王座长裤','pants','legend',{hp:4,int:3})] },
    hyjal:{ '阿克蒙德':[L('末日使者腰铠','belt','legend',{def:4,sta:3}),L('世界树之冠','helmet','legend',{def:4,spi:3}),L('混沌践踏战靴','boots','legend',{atk:3,critd:2})] },
    bt:{ '伊利丹·怒风':[L('背叛者之握','gloves','legend',{atk:3,agi:3}),L('黑暗神殿之戒','ring','legend',{atk:3,haste:2}),L('恶魔长裤','pants','legend',{hp:4,agi:3})] }
  };
  for (const [dungeonKey, bosses] of Object.entries(raidLegendaryExpansions)) {
    for (const [bossName, items] of Object.entries(bosses)) addBossLoot(dungeonKey, bossName, items);
  }

  DUNGEON_LOOT_ALIASES.karazhan = Object.assign({}, DUNGEON_LOOT_ALIASES.karazhan, { '玛克扎尔王子':'麦迪文' });
  DUNGEON_LOOT_ALIASES.aq40 = Object.assign({}, DUNGEON_LOOT_ALIASES.aq40, { '双子皇帝':'双子皇帝' });
  DUNGEON_LOOT_ALIASES.bt = Object.assign({}, DUNGEON_LOOT_ALIASES.bt, { '伊利达雷议会':'伊利达雷议会' });
  applyDungeonArtBackfill();
  normalizeBossContent();
}
extendDungeonCatalog();

const EPIC_RAID_SET_THEME = {
  mc:{ tier:'T1', name:'熔火之心', short:'熔火' },
  bwl:{ tier:'T2', name:'黑翼之巢', short:'黑翼' },
  aq40:{ tier:'T2.5', name:'安其拉神殿', short:'其拉' },
  naxx:{ tier:'T3', name:'纳克萨玛斯', short:'天灾' },
  karazhan:{ tier:'T4', name:'卡拉赞', short:'守护者' },
  ssc:{ tier:'T5', name:'毒蛇神殿', short:'盘牙' },
  tk:{ tier:'T5', name:'风暴要塞', short:'风暴' },
  hyjal:{ tier:'T6', name:'海加尔山', short:'海加尔' },
  bt:{ tier:'T6', name:'黑暗神殿', short:'黑暗' },
  sunwell:{ tier:'T6.5', name:'太阳之井', short:'日灼' },
  ulduar:{ tier:'T8', name:'奥杜尔', short:'泰坦' },
  ruby:{ tier:'T10.5', name:'红玉圣殿', short:'暮光' },
  icc:{ tier:'T10', name:'冰冠堡垒', short:'冰冠' },
  firelands:{ tier:'T12', name:'火焰之地', short:'烈焰' },
  throne:{ tier:'T15', name:'雷霆王座', short:'雷神' },
  dragonsoul:{ tier:'T13', name:'巨龙之魂', short:'灭世' },
  soo:{ tier:'T16', name:'围攻奥格瑞玛', short:'决战' },
  hfc:{ tier:'T18', name:'地狱火堡垒', short:'地狱火' },
  tomb:{ tier:'T20', name:'萨格拉斯之墓', short:'圣墓' },
  antorus:{ tier:'T21', name:'安托鲁斯', short:'阿古斯' },
  nightmare:{ tier:'T19', name:'翡翠梦魇', short:'梦魇' },
  uldir:{ tier:'T23', name:'奥迪尔', short:'血肉' },
  nighthold:{ tier:'T19', name:'暗夜要塞', short:'夜之子' },
  nyalotha:{ tier:'T25', name:'尼奥罗萨', short:'恩佐斯' },
  nathria:{ tier:'T26', name:'纳斯利亚堡', short:'德纳修斯' },
  eternalpalace:{ tier:'T24', name:'永恒王宫', short:'阿萨拉' },
  aberrus:{ tier:'T29', name:'厄苏戈尔', short:'熔铸' },
  amirdrassil:{ tier:'T31', name:'阿米德拉希尔', short:'梦境' },
  nerubar:{ tier:'T32', name:'尼鲁巴尔王宫', short:'蛛魔' },
  manaforge_omega:{ tier:'T33', name:'法力熔炉欧米伽', short:'欧米伽' },
  shandorah_conclave:{ tier:'T34', name:'沙恩多拉议会', short:'沙恩多拉' },
  voidrazor_sanctum:{ tier:'T35', name:'虚无剃刀圣所', short:'虚刃' },
  sporefall:{ tier:'T36', name:'孢落', short:'孢落' },
  curse_ulatek:{ tier:'T37', name:'乌拉泰克诅咒', short:'终咒' },
};
const RAID_PROGRESSION = {
  mc:{ order:1, expansion:'经典旧世', epicIlvl:320 },
  bwl:{ order:2, expansion:'经典旧世', epicIlvl:328 },
  aq40:{ order:3, expansion:'经典旧世', epicIlvl:336 },
  naxx:{ order:4, expansion:'经典旧世', epicIlvl:344 },
  karazhan:{ order:5, expansion:'燃烧的远征', epicIlvl:352 },
  ssc:{ order:6, expansion:'燃烧的远征', epicIlvl:360 },
  tk:{ order:7, expansion:'燃烧的远征', epicIlvl:368 },
  hyjal:{ order:8, expansion:'燃烧的远征', epicIlvl:376 },
  bt:{ order:9, expansion:'燃烧的远征', epicIlvl:384 },
  sunwell:{ order:10, expansion:'燃烧的远征', epicIlvl:392 },
  ulduar:{ order:11, expansion:'巫妖王之怒', epicIlvl:400 },
  icc:{ order:12, expansion:'巫妖王之怒', epicIlvl:408 },
  ruby:{ order:13, expansion:'巫妖王之怒', epicIlvl:416 },
  firelands:{ order:14, expansion:'大地的裂变', epicIlvl:424 },
  dragonsoul:{ order:15, expansion:'大地的裂变', epicIlvl:432 },
  throne:{ order:16, expansion:'熊猫人之谜', epicIlvl:440 },
  soo:{ order:17, expansion:'熊猫人之谜', epicIlvl:448 },
  hfc:{ order:18, expansion:'德拉诺之王', epicIlvl:456 },
  nightmare:{ order:19, expansion:'军团再临', epicIlvl:464 },
  nighthold:{ order:20, expansion:'军团再临', epicIlvl:472 },
  tomb:{ order:21, expansion:'军团再临', epicIlvl:480 },
  antorus:{ order:22, expansion:'军团再临', epicIlvl:488 },
  uldir:{ order:23, expansion:'争霸艾泽拉斯', epicIlvl:496 },
  eternalpalace:{ order:24, expansion:'争霸艾泽拉斯', epicIlvl:504 },
  nyalotha:{ order:25, expansion:'争霸艾泽拉斯', epicIlvl:512 },
  nathria:{ order:26, expansion:'暗影国度', epicIlvl:520 },
  aberrus:{ order:27, expansion:'巨龙时代', epicIlvl:528 },
  amirdrassil:{ order:28, expansion:'巨龙时代', epicIlvl:536 },
  nerubar:{ order:29, expansion:'地心之战', epicIlvl:544 },
  manaforge_omega:{ order:30, expansion:'地心之战', epicIlvl:552 },
  shandorah_conclave:{ order:31, expansion:'地心之战', epicIlvl:560 },
  voidrazor_sanctum:{ order:32, expansion:'地心之战', epicIlvl:568 },
  sporefall:{ order:33, expansion:'午夜', epicIlvl:576 },
  curse_ulatek:{ order:34, expansion:'午夜', epicIlvl:584 },
};
const RAID_NORMAL_ILVL_BASE = 118;
const RAID_NORMAL_ILVL_STEP = 6;
const RAID_EPIC_ILVL_BASE = 320;
const RAID_EPIC_ILVL_STEP = 8;
const RAID_NORMAL_POWER_BASE = 67;
const RAID_NORMAL_POWER_STEP = 1.8;
const RAID_EPIC_POWER_BASE = 82;
const RAID_EPIC_POWER_STEP = 2.15;
function raidNormalIlvlForOrder(order) {
  return Math.round(RAID_NORMAL_ILVL_BASE + Math.max(0, (order || 1) - 1) * RAID_NORMAL_ILVL_STEP);
}
function raidEpicIlvlForOrder(order) {
  return Math.round(RAID_EPIC_ILVL_BASE + Math.max(0, (order || 1) - 1) * RAID_EPIC_ILVL_STEP);
}
function raidNormalPowerForOrder(order) {
  return Math.round(RAID_NORMAL_POWER_BASE + Math.max(0, (order || 1) - 1) * RAID_NORMAL_POWER_STEP);
}
function raidEpicPowerForOrder(order) {
  return Math.round(RAID_EPIC_POWER_BASE + Math.max(0, (order || 1) - 1) * RAID_EPIC_POWER_STEP);
}
const EPIC_RAID_SET_LABELS = {
  mc:{
    warrior:'力量', mage:'奥术师', priest:'预言', rogue:'夜幕杀手', hunter:'巨人追猎者',
    shaman:'大地之怒', paladin:'秩序之源', warlock:'恶魔之心', druid:'塞纳里奥',
  },
  bwl:{
    warrior:'愤怒', mage:'灵风', priest:'卓越', rogue:'血牙', hunter:'巨龙追猎者',
    shaman:'无尽风暴', paladin:'审判', warlock:'复仇', druid:'怒风',
  },
  aq40:{
    warrior:'征服者', mage:'神秘', priest:'神谕者', rogue:'死亡执行者', hunter:'攻击者',
    shaman:'风暴召唤者', paladin:'复仇者', warlock:'厄运召唤者', druid:'起源',
  },
  naxx:{
    warrior:'无畏', mage:'霜火', priest:'信仰', rogue:'骨镰', hunter:'地穴追猎者',
    shaman:'碎地者', paladin:'救赎', warlock:'瘟疫之心', druid:'梦游者',
  },
  karazhan:{
    warrior:'战神', mage:'奥尔多', priest:'化身', rogue:'虚空刀锋', hunter:'恶魔追猎者',
    shaman:'飓风', paladin:'秩序', warlock:'虚空之心', druid:'玛洛恩',
  },
  ssc:{
    warrior:'毁灭者', mage:'风暴', priest:'神使', rogue:'死亡阴影', hunter:'裂隙追猎者',
    shaman:'灾变', paladin:'晶铸', warlock:'腐蚀者', druid:'诺达希尔',
  },
  tk:{
    warrior:'毁灭者', mage:'风暴', priest:'神使', rogue:'死亡阴影', hunter:'裂隙追猎者',
    shaman:'灾变', paladin:'晶铸', warlock:'腐蚀者', druid:'诺达希尔',
  },
  hyjal:{
    warrior:'冲锋', mage:'霜火', priest:'赦免', rogue:'杀戮者', hunter:'戈隆追猎者',
    shaman:'天击', paladin:'光明使者', warlock:'凶星', druid:'雷霆之心',
  },
  bt:{
    warrior:'冲锋', mage:'霜火', priest:'赦免', rogue:'杀戮者', hunter:'戈隆追猎者',
    shaman:'天击', paladin:'光明使者', warlock:'凶星', druid:'雷霆之心',
  },
  sunwell:{
    warrior:'冲锋圣装', mage:'霜火圣装', priest:'赦免圣装', rogue:'杀戮者圣装', hunter:'戈隆追猎者圣装',
    shaman:'天击圣装', paladin:'光明使者圣装', warlock:'凶星圣装', druid:'雷霆之心圣装',
  },
  ulduar:{
    warrior:'破城者', mage:'肯瑞托', priest:'圣灵', rogue:'恐怖之刃', hunter:'天灾追猎者',
    shaman:'世界击碎者', paladin:'庇护', warlock:'死亡使者', druid:'夜歌',
  },
  ruby:{
    warrior:'伊米亚之王', mage:'鲜血法师', priest:'赤红侍僧', rogue:'影刃', hunter:'安卡哈血猎手',
    shaman:'霜巫', paladin:'光誓', warlock:'黑暗教团', druid:'树纹',
  },
  icc:{
    warrior:'伊米亚之王', mage:'鲜血法师', priest:'赤红侍僧', rogue:'影刃', hunter:'安卡哈血猎手',
    shaman:'霜巫', paladin:'光誓', warlock:'黑暗教团', druid:'树纹',
  },
  firelands:{
    warrior:'熔岩之王', mage:'烈焰领主', priest:'净焰', rogue:'暗影凤凰', hunter:'烈焰行者',
    shaman:'火山', paladin:'焚化', warlock:'灾祸蛛', druid:'黑曜林冠',
  },
  throne:{
    warrior:'末代魔古', mage:'燃烧卷轴', priest:'驱魔', rogue:'九尾', hunter:'不眠守望',
    shaman:'巫医', paladin:'凯旋之翼', warlock:'无面裹尸', druid:'鬼魅森林',
  },
  dragonsoul:{
    warrior:'巨像龙甲', mage:'时光领主', priest:'弥光', rogue:'黑牙', hunter:'追龙者',
    shaman:'灵行者', paladin:'光辉荣耀', warlock:'触角梦魇', druid:'深邃大地',
  },
  soo:{
    warrior:'史前掠夺者', mage:'时空法师', priest:'圣光仪典', rogue:'倒钩刺客', hunter:'吞噬之喉',
    shaman:'天界谐律', paladin:'独眼恐魔', warlock:'千狱', druid:'永恒之花',
  },
  hfc:{
    warrior:'钢铁巨像', mage:'恶魔预言', priest:'净化神谕', rogue:'暗影行者', hunter:'恶魔追猎者',
    shaman:'熔火先知', paladin:'破碎圣印', warlock:'魔誓', druid:'血环德鲁伊',
  },
  tomb:{
    warrior:'萨格雷战铠', mage:'守望之眼', priest:'救赎神官', rogue:'恶魔之刃', hunter:'群星追猎者',
    shaman:'元素守望', paladin:'圣堂卫士', warlock:'噬魂者', druid:'丛林守护',
  },
  antorus:{
    warrior:'阿古斯征服者', mage:'星界法师', priest:'圣裁化身', rogue:'虚空之刃', hunter:'泰坦追猎者',
    shaman:'风暴先知', paladin:'破晓圣骑', warlock:'湮灭使者', druid:'世界之心',
  },
  nightmare:{
    warrior:'枯萎斗士', mage:'梦魇咒法', priest:'腐梦祭司', rogue:'梦魇毒牙', hunter:'梦魇游猎',
    shaman:'梦魇图腾', paladin:'翡翠圣骑', warlock:'梦魇邪术', druid:'梦魇守护',
  },
  uldir:{
    warrior:'腐化斗士', mage:'血法师', priest:'血肉祭司', rogue:'毒刃', hunter:'瘟疫追猎者',
    shaman:'腐血先知', paladin:'净化圣骑', warlock:'邪疫术士', druid:'腐化德鲁伊',
  },
  nighthold:{
    warrior:'神王战铠', mage:'秘法师', priest:'虔诚神官', rogue:'夜影杀手', hunter:'追星游猎',
    shaman:'风暴祈唤', paladin:'圣光誓约', warlock:'邪能编织', druid:'群星守护',
  },
  nyalotha:{
    warrior:'湮灭斗士', mage:'虚空奥术', priest:'疯狂低语', rogue:'触须之刃', hunter:'渊巢追猎',
    shaman:'深渊先知', paladin:'破灭圣契', warlock:'古神之声', druid:'噩梦缠藤',
  },
  nathria:{
    warrior:'血誓战铠', mage:'罪法师', priest:'赎罪神官', rogue:'夜噬', hunter:'血猎游侠',
    shaman:'石血先知', paladin:'石裔誓约', warlock:'石血契约', druid:'枯叶守护',
  },
  eternalpalace:{
    warrior:'深渊战铠', mage:'潮汐法师', priest:'海歌神官', rogue:'暗鳞杀手', hunter:'渊海游猎',
    shaman:'怒涛先知', paladin:'珊瑚誓约', warlock:'深渊契约', druid:'海林守护',
  },
  aberrus:{
    warrior:'熔铸战铠', mage:'炎术师', priest:'灰烬神官', rogue:'熔影杀手', hunter:'熔火游猎',
    shaman:'熔岩先知', paladin:'炽炉誓约', warlock:'邪炎契约', druid:'焦林守护',
  },
  amirdrassil:{
    warrior:'梦境战铠', mage:'织梦师', priest:'翡翠神官', rogue:'梦影杀手', hunter:'林梦游猎',
    shaman:'梦潮先知', paladin:'生命誓约', warlock:'梦魇契约', druid:'世界树守护',
  },
};
const EPIC_RAID_SET_SLOT_ROTATION = ['pants','helmet','shoulder','gloves','armor','boots','belt','ring','trinket','weapon'];
const EPIC_RAID_OFFPIECE_ROTATION = ['ring','boots','belt','trinket','shoulder','gloves','armor','pants','helmet','weapon'];
const EPIC_RAID_LEGEND_SLOT_ROTATION = ['pants','helmet','shoulder','gloves','armor','boots','belt','ring','trinket','weapon'];

function lootRarityRank(key) {
  const idx = RARITY.findIndex(r => r.key === key);
  return idx < 0 ? 0 : idx;
}
function filterLootByRarity(pool, rarityKey, exactRarity) {
  if (!Array.isArray(pool) || !pool.length || !rarityKey) return Array.isArray(pool) ? pool.slice() : [];
  const rank = lootRarityRank(rarityKey);
  return pool.filter(it => exactRarity ? it.rarity === rarityKey : lootRarityRank(it.rarity) <= rank);
}
function cloneLootItem(item) {
  return Object.assign({}, item, { stats: Object.assign({}, item?.stats || {}) });
}
function currentLootClassKey(clsKey) {
  if (clsKey && CLASSES[clsKey]) return clsKey;
  if (typeof state !== 'undefined' && state?.cls && CLASSES[state.cls]) return state.cls;
  return 'warrior';
}
function raidTheme(baseKey) {
  return EPIC_RAID_SET_THEME[baseKey] || { tier:'T?', name:baseKey, short:baseKey };
}
function raidProgression(baseKey) {
  const key = (typeof baseDungeonKey === 'function') ? baseDungeonKey(baseKey) : String(baseKey || '').replace(/_epic$/, '');
  const raw = RAID_PROGRESSION[key];
  const theme = raidTheme(key);
  if (!raw) {
    return {
      key,
      order: 0,
      expansion: '未知资料片',
      tier: theme.tier,
      normalIlvl: 140,
      epicIlvl: 160,
      normalPowerLvl: 60,
      epicPowerLvl: 80,
    };
  }
  const epicIlvl = raw.epicIlvlOverride || raw.epicIlvl || raidEpicIlvlForOrder(raw.order);
  const normalIlvl = raw.normalIlvl || raidNormalIlvlForOrder(raw.order);
  return {
    key,
    order: raw.order,
    expansion: raw.expansion,
    tier: theme.tier,
    normalIlvl,
    epicIlvl,
    normalPowerLvl: raw.normalPowerLvl || raidNormalPowerForOrder(raw.order),
    epicPowerLvl: raw.epicPowerLvl || raidEpicPowerForOrder(raw.order),
  };
}
function epicRaidKey(baseKey) { return `${baseKey}_epic`; }
function isEpicRaidDungeon(dungeonKey) {
  const dg = getDungeonDef(dungeonKey);
  return !!(dg && dg.epicRaid);
}
function epicRaidPrimaryAttr(clsKey) {
  return CLASSES[clsKey]?.attackAttr || 'str';
}
function epicRaidSupportAttr(clsKey) {
  if (['mage','priest','shaman','warlock'].includes(clsKey)) return 'spi';
  if (clsKey === 'druid') return 'spi';
  return 'sta';
}
function epicRaidSetLabel(baseKey, clsKey) {
  // 显式套装名优先;无配置时回退到「团本简称·职业名」,绝不暴露 T?/Txx 这类内部档位代号
  if (EPIC_RAID_SET_LABELS[baseKey]?.[clsKey]) return EPIC_RAID_SET_LABELS[baseKey][clsKey];
  const short = raidTheme(baseKey).short;
  const clsName = (typeof CLASSES !== 'undefined' && CLASSES[clsKey]?.name) || '';
  return `${short}${clsName ? '·' + clsName : ''}`;
}
function findRaidReferenceItem(baseKey, bossName, slotKey, rarityKey) {
  const bossPool = (getBaseDungeonBossLoot(baseKey, bossName) || []).map(cloneLootItem);
  const raidBosses = Object.values(DUNGEON_LOOT[baseKey]?.bosses || {}).flat().map(cloneLootItem);
  const search = (pool, exactSlot, exactRarity) => pool.find(it => (!exactSlot || it.slot === slotKey) && (!exactRarity || it.rarity === rarityKey));
  return search(bossPool, true, true)
    || search(bossPool, true, false)
    || search(bossPool, false, true)
    || search(raidBosses, true, true)
    || search(raidBosses, true, false)
    || search(raidBosses, false, true)
    || bossPool[0]
    || raidBosses[0]
    || null;
}
function raidBossIndexInfo(baseKey, bossName, bossIndex, bossCount) {
  const dg = getDungeonDef(baseKey);
  const bosses = dg?.bosses || [];
  const idx = Number.isFinite(bossIndex) ? bossIndex : Math.max(0, bosses.findIndex(b => b.name === bossName));
  const count = Number.isFinite(bossCount) && bossCount > 0 ? bossCount : Math.max(1, bosses.length);
  return { bossIndex: Math.max(0, idx), bossCount: count };
}
function raidDropIlvl(baseKey, rarityKey, epicMode, bossIndex, bossCount) {
  const prog = raidProgression(baseKey);
  const base = epicMode ? prog.epicIlvl : prog.normalIlvl;
  const ratio = bossCount <= 1 ? 1 : Math.max(0, Math.min(1, bossIndex / (bossCount - 1)));
  const bossBump = Math.round(ratio * 4);
  const rarityBump = ({ common:-18, uncommon:-14, rare:-8, epic:0, legend:8 })[rarityKey || 'epic'] || 0;
  return Math.max(1, Math.round(base + bossBump + rarityBump));
}
function raidDropPowerFromIlvl(ilvl) {
  return Math.max(1, Math.round(ilvl / 3));
}
function applyRaidLootProgression(item, baseKey, bossName, epicMode, bossIndex, bossCount) {
  if (!item) return item;
  const info = raidBossIndexInfo(baseKey, bossName, bossIndex, bossCount);
  const prog = raidProgression(baseKey);
  const ilvl = raidDropIlvl(baseKey, item.rarity, epicMode, info.bossIndex, info.bossCount);
  item.raidExpansion = prog.expansion;
  item.raidOrder = prog.order;
  item.raidTier = prog.tier;
  item.raidBaseKey = baseKey;
  item.raidBossIndex = info.bossIndex;
  item.raidBossCount = info.bossCount;
  item.raidEpicMode = !!epicMode;
  item.raidIlvl = ilvl;
  item.rollPower = raidDropPowerFromIlvl(ilvl);
  const dg = getDungeonDef(epicMode ? epicRaidKey(baseKey) : baseKey) || getDungeonDef(baseKey);
  item.reqLvlOverride = Math.max(1, Math.min(80, dg?.reqLvl || (epicMode ? 80 : 60)));
  return item;
}
function applyRaidProgressionToDungeon(dg) {
  if (!dg || dg.type !== 'raid') return dg;
  const baseKey = dg.baseKey || ((typeof baseDungeonKey === 'function') ? baseDungeonKey(dg.key) : dg.key);
  const prog = raidProgression(baseKey);
  const epicMode = !!dg.epicRaid;
  dg.raidExpansion = prog.expansion;
  dg.raidOrder = prog.order;
  dg.raidTier = prog.tier;
  dg.raidIlvl = epicMode ? prog.epicIlvl : prog.normalIlvl;
  dg.powerLvl = epicMode ? prog.epicPowerLvl : Math.max(dg.reqLvl || 1, prog.normalPowerLvl);
  dg.sortPower = prog.order * 10 + (epicMode ? 1 : 0);
  return dg;
}
function applyRaidProgressionCatalog() {
  for (const dg of DUNGEONS) applyRaidProgressionToDungeon(dg);
}
function makeEpicRaidSetName(baseKey, clsKey, slotKey) {
  return `${epicRaidSetLabel(baseKey, clsKey)}${SLOT_INFO[slotKey]?.label || slotKey}`;
}
function makeEpicRaidOffpieceName(baseKey, bossName, slotKey) {
  const ref = findRaidReferenceItem(baseKey, bossName, slotKey, 'epic') || findRaidReferenceItem(baseKey, bossName, slotKey, 'rare');
  return ref?.name || (bossName + (SLOT_INFO[slotKey]?.label || slotKey));
}
function makeEpicRaidLegendName(baseKey, bossName, slotKey) {
  const ref = findRaidReferenceItem(baseKey, bossName, slotKey, 'legend')
    || findRaidReferenceItem(baseKey, bossName, slotKey, 'epic')
    || findRaidReferenceItem(baseKey, bossName, slotKey, 'rare');
  return ref?.name || (bossName + (SLOT_INFO[slotKey]?.label || slotKey));
}
function makeNormalRaidLegendWeaponName(baseKey, bossName) {
  const ref = findRaidReferenceItem(baseKey, bossName, 'weapon', 'legend');
  return ref?.name || `${bossName}的传说武器`;
}
function makeEpicRaidSetStats(slotKey, clsKey, bossIndex) {
  const primary = epicRaidPrimaryAttr(clsKey);
  const support = epicRaidSupportAttr(clsKey);
  const core = {
    weapon:{ atk:5, [primary]:4, sta:3 },
    helmet:{ def:5, [primary]:3, sta:3 },
    shoulder:{ atk:4, [primary]:3, sta:2 },
    armor:{ def:6, [primary]:4, sta:4 },
    gloves:{ atk:4, [primary]:3, sta:2 },
    belt:{ def:4, [primary]:3, sta:2 },
    pants:{ hp:5, [primary]:4, sta:4 },
    boots:{ def:4, [primary]:3, sta:3 },
    ring:{ atk:3, [primary]:4, sta:2 },
    trinket:{ hp:4, [primary]:4, sta:3 },
  }[slotKey] || { atk:4, [primary]:3, sta:2 };
  const stats = Object.assign({}, core);
  if (support !== 'sta' && !stats[support]) stats[support] = 2 + (bossIndex % 2);
  else stats.sta = (stats.sta || 0) + 1;
  return stats;
}
function makeEpicRaidOffpieceStats(slotKey, clsKey, bossIndex) {
  const primary = epicRaidPrimaryAttr(clsKey);
  const support = epicRaidSupportAttr(clsKey);
  const core = {
    ring:{ [primary]:4, sta:2, atk:2 },
    boots:{ def:4, [primary]:3, sta:2 },
    belt:{ def:4, [primary]:3, sta:2 },
    trinket:{ hp:4, [primary]:4, sta:2 },
    shoulder:{ atk:4, [primary]:3, sta:2 },
    gloves:{ atk:4, [primary]:3, sta:2 },
    armor:{ def:5, [primary]:3, sta:3 },
    pants:{ hp:4, [primary]:3, sta:3 },
    helmet:{ def:4, [primary]:3, sta:3 },
    weapon:{ atk:5, [primary]:4, sta:2 },
  }[slotKey] || { atk:4, [primary]:3, sta:2 };
  const stats = Object.assign({}, core);
  if (support !== 'sta' && bossIndex % 2 === 0) stats[support] = Math.max(stats[support] || 0, 2);
  return stats;
}
function makeEpicRaidLegendStats(slotKey, clsKey, bossIndex, bossCount) {
  const primary = epicRaidPrimaryAttr(clsKey);
  const support = epicRaidSupportAttr(clsKey);
  const scale = 1 + Math.min(0.4, bossIndex / Math.max(1, bossCount - 1) * 0.4);
  const base = {
    weapon:{ atk:8, [primary]:6, sta:4 },
    helmet:{ def:7, [primary]:5, sta:4 },
    shoulder:{ atk:6, [primary]:5, sta:4 },
    armor:{ def:8, [primary]:6, sta:5 },
    gloves:{ atk:6, [primary]:5, sta:4 },
    belt:{ def:6, [primary]:5, sta:4 },
    pants:{ hp:7, [primary]:6, sta:5 },
    boots:{ def:6, [primary]:5, sta:4 },
    ring:{ atk:5, [primary]:6, sta:4 },
    trinket:{ hp:6, [primary]:6, sta:4 },
  }[slotKey] || { atk:6, [primary]:5, sta:4 };
  const stats = {};
  for (const [k, v] of Object.entries(base)) stats[k] = Math.max(1, Math.floor(v * scale));
  if (support !== 'sta') stats[support] = Math.max(stats[support] || 0, 3 + Math.floor(scale));
  return stats;
}
function epicRaidLegendChance(bossIndex, bossCount) {
  const ratio = bossCount <= 1 ? 1 : (bossIndex / (bossCount - 1));
  return +(0.01 + ratio * 0.03).toFixed(3);
}
function makeEpicRaidSetItem(baseKey, bossName, bossIndex, clsKey) {
  const slotKey = EPIC_RAID_SET_SLOT_ROTATION[bossIndex % EPIC_RAID_SET_SLOT_ROTATION.length];
  return applyRaidLootProgression({
    name: makeEpicRaidSetName(baseKey, clsKey, slotKey),
    slot: slotKey,
    rarity: 'epic',
    epicRaid: true,
    setKey: `${baseKey}:${clsKey}`,
    setName: epicRaidSetLabel(baseKey, clsKey),
    dropWeight: 52,
    stats: makeEpicRaidSetStats(slotKey, clsKey, bossIndex),
  }, baseKey, bossName, true, bossIndex);
}
function makeEpicRaidOffpiece(baseKey, bossName, bossIndex, clsKey) {
  const slotKey = EPIC_RAID_OFFPIECE_ROTATION[bossIndex % EPIC_RAID_OFFPIECE_ROTATION.length];
  return applyRaidLootProgression({
    name: makeEpicRaidOffpieceName(baseKey, bossName, slotKey),
    slot: slotKey,
    rarity: 'epic',
    epicRaid: true,
    dropWeight: 38,
    stats: makeEpicRaidOffpieceStats(slotKey, clsKey, bossIndex),
  }, baseKey, bossName, true, bossIndex);
}
function makeEpicRaidLegendItem(baseKey, bossName, bossIndex, bossCount, clsKey) {
  const slotKey = EPIC_RAID_LEGEND_SLOT_ROTATION[bossIndex % EPIC_RAID_LEGEND_SLOT_ROTATION.length];
  return applyRaidLootProgression({
    name: makeEpicRaidLegendName(baseKey, bossName, slotKey),
    slot: slotKey,
    rarity: 'legend',
    epicRaid: true,
    dropChance: epicRaidLegendChance(bossIndex, bossCount),
    dropWeight: 1,
    stats: makeEpicRaidLegendStats(slotKey, clsKey, bossIndex, bossCount),
  }, baseKey, bossName, true, bossIndex, bossCount);
}
function makeNormalRaidFinalWeapon(baseKey, bossName, clsKey) {
  const primary = epicRaidPrimaryAttr(clsKey);
  return {
    name: makeNormalRaidLegendWeaponName(baseKey, bossName),
    slot: 'weapon',
    rarity: 'legend',
    dropChance: 0.06,
    dropWeight: 1,
    stats: { atk:7, [primary]:5, sta:3 },
  };
}
function getEpicRaidBossLoot(dungeonKey, bossName, clsKey, options) {
  const baseKey = baseDungeonKey(dungeonKey);
  const dg = getDungeonDef(dungeonKey) || getDungeonDef(baseKey);
  if (!dg || !bossName) return [];
  const bosses = dg.bosses || [];
  const bossIndex = Math.max(0, bosses.findIndex(b => b.name === bossName));
  const classKey = currentLootClassKey(clsKey);
  const pool = [
    makeEpicRaidSetItem(baseKey, bossName, bossIndex, classKey),
    makeEpicRaidOffpiece(baseKey, bossName, bossIndex, classKey),
    makeEpicRaidLegendItem(baseKey, bossName, bossIndex, bosses.length, classKey),
  ];
  return filterLootByRarity(pool, options?.rarityKey, options?.exactRarity);
}
function getNormalRaidBossLoot(dungeonKey, bossName, clsKey, options) {
  const baseKey = baseDungeonKey(dungeonKey);
  const dg = getDungeonDef(baseKey);
  if (!dg || !bossName) return [];
  const raw = (getBaseDungeonBossLoot(baseKey, bossName) || []).map(cloneLootItem);
  const finalBossName = dg.bosses?.[dg.bosses.length - 1]?.name;
  const isFinal = bossName === finalBossName;
  const bossIndex = Math.max(0, (dg.bosses || []).findIndex(b => b.name === bossName));
  const bossCount = Math.max(1, (dg.bosses || []).length);
  let pool = raw.filter(it => it.rarity !== 'legend');
  if (isFinal) {
    let legendWeapons = raw.filter(it => it.rarity === 'legend' && it.slot === 'weapon');
    if (!legendWeapons.length) legendWeapons = [makeNormalRaidFinalWeapon(baseKey, bossName, clsKey)];
    legendWeapons = legendWeapons.map(it => Object.assign(cloneLootItem(it), { lowChanceLegend:true, dropChance: it.dropChance || 0.06 }));
    legendWeapons = legendWeapons.map(it => applyRaidLootProgression(it, baseKey, bossName, false, bossIndex, bossCount));
    if (options?.rarityKey === 'legend') return filterLootByRarity(legendWeapons, options.rarityKey, options.exactRarity);
    if (!options?.rarityKey) pool = pool.concat(legendWeapons);
  }
  pool = pool.map(it => applyRaidLootProgression(it, baseKey, bossName, false, bossIndex, bossCount));
  return filterLootByRarity(pool, options?.rarityKey, options?.exactRarity);
}
function getDungeonTrashLoot(dungeonKey, clsKey, options) {
  const baseKey = baseDungeonKey(dungeonKey);
  const loot = DUNGEON_LOOT[baseKey] || DUNGEON_LOOT[dungeonKey];
  const pool = (loot?.trash || []).map(cloneLootItem);
  const dg = getDungeonDef(baseKey);
  const progressed = dg?.type === 'raid'
    ? pool.map(it => applyRaidLootProgression(it, baseKey, null, isEpicRaidDungeon(dungeonKey), 0, Math.max(1, (dg.bosses || []).length)))
    : pool;
  return filterLootByRarity(progressed, options?.rarityKey, options?.exactRarity);
}
function getDungeonBossLoot(dungeonKey, bossName, clsKey, options) {
  if (isEpicRaidDungeon(dungeonKey) || isEpicRaidKey(dungeonKey)) {
    return getEpicRaidBossLoot(dungeonKey, bossName, clsKey, options);
  }
  const dg = getDungeonDef(baseDungeonKey(dungeonKey));
  if (dg?.type === 'raid') return getNormalRaidBossLoot(dungeonKey, bossName, clsKey, options);
  const basePool = (getBaseDungeonBossLoot(baseDungeonKey(dungeonKey), bossName) || []).map(cloneLootItem);
  return filterLootByRarity(basePool, options?.rarityKey, options?.exactRarity);
}
/* ===== 模块级 BOSS 技能构造助手(供老团本阶段技注入 + 英雄/史诗副本加技能复用) ===== */
function mkDmgSkill(name, icon, mul, castTime, extra){ return Object.assign({ name, icon, desc:`${mul}倍伤害`, type:'dmg', mul, castTime:castTime||2.2, cd:10 }, extra || {}); }
function mkBuffSkill(name, icon, desc, extra){ return Object.assign({ name, icon, desc, type:'buff', castTime:0, cd:22 }, extra || {}); }
function mkSummonSkill(name, icon, desc, extra){ return Object.assign({ name, icon, desc, type:'summon', castTime:0, cd:24 }, extra || {}); }
/* 按 BOSS 主题推断召唤物阵营(复用 inferBossTheme) */
function bossSummonThemeFor(boss){
  const t = (typeof inferBossTheme === 'function') ? inferBossTheme(boss.name, (boss.skills && boss.skills[0]) || { name:boss.name }) : 'brute';
  return ({ shadow:'void', arcane:'void', fire:'elemental', frost:'elemental', storm:'elemental', nature:'beast', poison:'beast', dragon:'soldier', brute:'soldier' })[t] || 'soldier';
}
/* 给"尾王"追加一套三阶段技能(60%变身→35%召援→30%终极),已存在阶段技则跳过 */
function addFinalBossPhaseKit(fb, opts){
  opts = opts || {};
  if(!fb || !Array.isArray(fb.skills)) return;
  if(fb.skills.some(s => typeof s.hpBelow === 'number')) return;   // 已有阶段技(新团本/已注入)→跳过
  const minMul = opts.minMul || 5;
  const maxMul = Math.max(minMul, ...fb.skills.map(s => s.mul || 0));
  const ultMul = Math.max(minMul, +(maxMul * (opts.ultScale || 0.5)).toFixed(1));
  const st = bossSummonThemeFor(fb);
  const used = new Set((fb.skills || []).map(s => s.name));
  const buffName = bossUnusedCanonicalSkillName(fb.name, used, 3, '狂暴形态'); used.add(buffName);
  const summonName = bossUnusedCanonicalSkillName(fb.name, used, 5, '召唤援军'); used.add(summonName);
  const ultName = bossUnusedCanonicalSkillName(fb.name, used, 6, '终极爆发');
  addBossPassiveTrick(fb, mkBuffSkill(buffName, '😤', '阶段被动:攻击/攻速/减伤大幅提升', { hpBelow:0.6, atkBuffSecs:14, atkBuffPct:opts.atkPct||42, spdBuffSecs:14, spdBuffPct:opts.spdPct||28, drBuffSecs:14, drBuffPct:opts.drPct||0.22, cd:24 }));
  addBossPassiveTrick(fb, mkSummonSkill(summonName, '📣', '阶段被动:召唤爪牙助战并护盾护体', { hpBelow:0.35, summonCount:opts.summonCount||2, summonTheme:st, shieldPct:opts.shieldPct||0.2, cd:26 }));
  fb.skills.push(mkDmgSkill(ultName, '💥', ultMul, 2.6, { hpBelow:0.3, aoe:true, dot:true, fear:1900, brittle:true, alwaysCrit:true, cd:16 }));
}
/* 给所有"老团本"尾王注入阶段技(在 createEpicRaidCatalog 之前调用,使史诗团版同步继承) */
function injectOldRaidPhaseKits(){
  for(const dg of DUNGEONS){
    if(dg.type !== 'raid' || dg.epicRaid) continue;
    const bosses = dg.bosses || [];
    if(!bosses.length) continue;
    addFinalBossPhaseKit(bosses[bosses.length - 1], { ultScale:0.5, summonCount:2 });
  }
}
injectOldRaidPhaseKits();
applyRaidProgressionCatalog();

function createEpicRaidCatalog() {
  const baseRaids = DUNGEONS.filter(d => d.type === 'raid' && !d.epicRaid);
  for (const base of baseRaids) {
    const key = epicRaidKey(base.key);
    if (DUNGEONS.some(d => d.key === key)) continue;
    const prog = raidProgression(base.key);
    const clone = JSON.parse(JSON.stringify(base));
    clone.key = key;
    clone.baseKey = base.key;
    clone.name = `${base.name}·史诗`;
    clone.desc = `${prog.expansion} · 史诗团本 · 推荐装等 ${prog.epicIlvl} · ${base.name} 的极限难度版本`;
    clone.reqLvl = 80;
    clone.raidExpansion = prog.expansion;
    clone.raidOrder = prog.order;
    clone.raidTier = prog.tier;
    clone.raidIlvl = prog.epicIlvl;
    clone.powerLvl = prog.epicPowerLvl;
    clone.sortPower = prog.order * 10 + 1;
    clone.cd = Math.max(base.cd || 0, 1500);
    clone.epicRaid = true;
    clone.bosses = (clone.bosses || []).map((boss, idx, arr) => {
      const final = idx === arr.length - 1;
      const rankScale = Math.max(0, prog.order - 1);
      boss.raidExpansion = prog.expansion;
      boss.raidOrder = prog.order;
      boss.supportCount = Math.max(boss.supportCount || 0, final ? Math.min(6, 3 + Math.floor(prog.order / 8)) : Math.min(4, 1 + Math.floor(prog.order / 10)));
      boss.passive = Object.assign({}, boss.passive || {}, {
        dmgReduction: Math.max(boss.passive?.dmgReduction || 0, Math.min(final ? 0.38 : 0.30, (final ? 0.20 : 0.13) + rankScale * 0.006)),
        critChance: Math.max(boss.passive?.critChance || 0, Math.min(final ? 0.36 : 0.28, (final ? 0.20 : 0.12) + rankScale * 0.006)),
        atkBonus: Math.max(boss.passive?.atkBonus || 0, Math.min(final ? 0.46 : 0.34, (final ? 0.24 : 0.14) + rankScale * 0.008)),
      });
      boss.skills = (boss.skills || []).map(sk => {
        const out = Object.assign({}, sk);
        if (typeof out.mul === 'number') out.mul = +(out.mul + (final ? 1.8 : 1.0) + prog.order * 0.08).toFixed(1);
        if (typeof out.castTime === 'number') out.castTime = +(out.castTime + Math.min(0.4, 0.1 + prog.order * 0.01)).toFixed(1);
        return out;
      });
      moveBossSupportSkillsToPassive(boss);
      return boss;
    });
    enhanceBossCollection(clone.bosses, { kind:'raid', lvl:clone.powerLvl, finalAt:(clone.bosses.length - 1) });
    DUNGEONS.push(clone);
  }
}
createEpicRaidCatalog();

/* 英雄级 5 人副本:仿史诗团本,给较高级 5 人本(reqLvl>=HEROIC_MIN_REQ)自动生成 80 级
   高难度版(<key>_heroic)。掉落复用基础本(baseDungeonKey 已剥离 _heroic)但按 80 级 power 缩放。 */
const HEROIC_MIN_REQ = 60;
/* 英雄本等级按基础本梯队:基础 60~70 → 70 级,71~80 → 80 级(不再统一 80) */
function heroicTierLevel(baseReqLvl) { return (baseReqLvl || 0) >= 71 ? 80 : 70; }
function createHeroicDungeonCatalog() {
  const bases = DUNGEONS.filter(d => d.type !== 'raid' && !d.epicRaid && !d.heroic && (d.reqLvl || 0) >= HEROIC_MIN_REQ);
  for (const base of bases) {
    const key = `${base.key}_heroic`;
    if (DUNGEONS.some(d => d.key === key)) continue;
    const tierLvl = heroicTierLevel(base.reqLvl);
    const clone = JSON.parse(JSON.stringify(base));
    clone.key = key;
    clone.baseKey = base.key;
    clone.name = `${base.name}·英雄`;
    clone.desc = `${tierLvl}级英雄5人本 · ${base.name} 的高难度版本`;
    clone.reqLvl = tierLvl;
    clone.cd = Math.max(base.cd || 0, 1200);
    clone.heroic = true;
    clone.bosses = (clone.bosses || []).map((boss, idx, arr) => {
      const isFinal = idx === arr.length - 1;
      boss.passive = Object.assign({}, boss.passive || {}, {
        dmgReduction: Math.max(boss.passive?.dmgReduction || 0, isFinal ? 0.20 : 0.13),
        critChance: Math.max(boss.passive?.critChance || 0, isFinal ? 0.22 : 0.14),
        atkBonus: Math.max(boss.passive?.atkBonus || 0, isFinal ? 0.24 : 0.14),
      });
      boss.skills = (boss.skills || []).map(sk => {
        const out = Object.assign({}, sk);
        if (typeof out.mul === 'number') out.mul = +(out.mul + (isFinal ? 1.8 : 1.0)).toFixed(1);
        return out;
      });
      // 英雄难度:每个 BOSS 多 1 个技能(群体爆发),与普通本区分;尾王额外获得 1 个阶段终结技(<40%血)
      const _mm = Math.max(4, ...boss.skills.map(s => s.mul || 0));
      boss.skills.push(mkDmgSkill('狂怒重击', '💢', +(_mm * 0.7).toFixed(1), 2.2, { aoe:true, dot:true, weaken:true, cd:11 }));
      if (isFinal) boss.skills.push(mkDmgSkill('绝命一击', '💥', +(_mm * 0.85).toFixed(1), 2.6, { hpBelow:0.4, aoe:true, brittle:true, fear:1500, alwaysCrit:true, cd:14 }));
      return boss;
    });
    enhanceBossCollection(clone.bosses, { kind:'dungeon', lvl:clone.reqLvl, finalAt:(clone.bosses.length - 1) });
    DUNGEONS.push(clone);
  }
}
createHeroicDungeonCatalog();

/* 史诗5人本(Mythic 难度):给 reqLvl>=EPIC5_MIN_REQ 的基础 5 人本自动生成 80 级史诗版
   (<key>_epic5)。难度/掉落梯队介于英雄(tier1)与团本(tier2)之间(gearTier=4,×1.16)。
   掉落复用基础本(baseDungeonKey 已剥离 _epic5),装备名带「·史诗」后缀(finishItem)。 */
const EPIC5_MIN_REQ = 60;
function createEpic5DungeonCatalog() {
  const bases = DUNGEONS.filter(d => d.type !== 'raid' && !d.epicRaid && !d.heroic && !d.epic5 && (d.reqLvl || 0) >= EPIC5_MIN_REQ);
  for (const base of bases) {
    const key = `${base.key}_epic5`;
    if (DUNGEONS.some(d => d.key === key)) continue;
    const tierLvl = (typeof heroicTierLevel === 'function') ? heroicTierLevel(base.reqLvl) : ((base.reqLvl || 0) >= 71 ? 80 : 70);
    const clone = JSON.parse(JSON.stringify(base));
    clone.key = key;
    clone.baseKey = base.key;
    clone.name = `${base.name}·史诗`;
    clone.desc = `${tierLvl}级史诗5人本 · ${base.name} 的极限难度版本(最强5人内容)`;
    clone.reqLvl = tierLvl;
    clone.cd = Math.max(base.cd || 0, 1500);
    clone.epic5 = true;
    clone.bosses = (clone.bosses || []).map((boss, idx, arr) => {
      const isFinal = idx === arr.length - 1;
      boss.passive = Object.assign({}, boss.passive || {}, {
        dmgReduction: Math.max(boss.passive?.dmgReduction || 0, isFinal ? 0.24 : 0.16),
        critChance: Math.max(boss.passive?.critChance || 0, isFinal ? 0.26 : 0.16),
        atkBonus: Math.max(boss.passive?.atkBonus || 0, isFinal ? 0.28 : 0.16),
      });
      boss.skills = (boss.skills || []).map(sk => {
        const out = Object.assign({}, sk);
        if (typeof out.mul === 'number') out.mul = +(out.mul + (isFinal ? 2.4 : 1.6)).toFixed(1);
        return out;
      });
      // 史诗5人难度:每个 BOSS 多 2 个技能(群体爆发 + 控制压制),比英雄更密集;尾王获得完整三阶段套件
      const _mm = Math.max(4, ...boss.skills.map(s => s.mul || 0));
      const _st = bossSummonThemeFor(boss);
      boss.skills.push(mkDmgSkill('狂怒重击', '💢', +(_mm * 0.7).toFixed(1), 2.2, { aoe:true, dot:true, weaken:true, cd:11 }));
      boss.skills.push(mkDmgSkill('湮灭压制', '🌀', +(_mm * 0.6).toFixed(1), 2.4, { silence:1800, stun:1300, cripple:true, cd:12 }));
      if (isFinal) {
        const _used = new Set((boss.skills || []).map(s => s.name));
        const _buffName = bossUnusedCanonicalSkillName(boss.name, _used, 3, '狂暴形态'); _used.add(_buffName);
        const _summonName = bossUnusedCanonicalSkillName(boss.name, _used, 5, '召唤援军'); _used.add(_summonName);
        const _ultName = bossUnusedCanonicalSkillName(boss.name, _used, 6, '终极爆发');
        addBossPassiveTrick(boss, mkBuffSkill(_buffName, '😤', '阶段被动:攻击/攻速/减伤提升', { hpBelow:0.6, atkBuffSecs:12, atkBuffPct:35, spdBuffSecs:12, spdBuffPct:24, drBuffSecs:12, drBuffPct:0.2, cd:22 }));
        addBossPassiveTrick(boss, mkSummonSkill(_summonName, '📣', '阶段被动:召唤爪牙助战并护盾护体', { hpBelow:0.35, summonCount:2, summonTheme:_st, shieldPct:0.16, cd:24 }));
        boss.skills.push(mkDmgSkill(_ultName, '💥', +(_mm * 0.8).toFixed(1), 2.6, { hpBelow:0.3, aoe:true, dot:true, fear:1700, brittle:true, alwaysCrit:true, cd:14 }));
      }
      moveBossSupportSkillsToPassive(boss);
      return boss;
    });
    enhanceBossCollection(clone.bosses, { kind:'dungeon', lvl:clone.reqLvl, finalAt:(clone.bosses.length - 1) });
    DUNGEONS.push(clone);
  }
}
createEpic5DungeonCatalog();
function generatedBossSkillNameNeedsRepair(name){
  return /·|熔核裁决|灰烬审判|暗影裁决|灵魂裂隙|裂骨裁决|战槌震荡|践踏冲击|腐毒裁决|毒脉穿刺|破甲终结|终极爆发/.test(String(name || ''));
}
function bossFallbackLoreSkillName(theme, idx){
  const pool = {
    fire:['烈焰风暴','熔岩喷发','火焰冲击','灼热之焰'],
    frost:['寒冰箭雨','冰霜冲击','冰霜新星','极寒之触'],
    shadow:['暗影箭雨','精神鞭笞','暗影裂隙','虚空冲击'],
    poison:['毒性喷吐','腐蚀之血','疫病爆发','剧毒新星'],
    storm:['闪电链','雷霆震击','静电冲击','风暴新星'],
    nature:['荆棘缠绕','自然之怒','生命凋零','孢子爆裂'],
    dragon:['烈焰吐息','扫尾','龙翼打击','龙爪撕裂'],
    arcane:['奥术弹幕','奥术爆炸','法力燃烧','虚空震击'],
    brute:['碾压','顺劈斩','震荡猛击','破甲攻击'],
  }[theme] || ['碾压','顺劈斩','震荡猛击','破甲攻击'];
  return pool[idx % pool.length];
}
function repairGeneratedBossSkillNames(){
  for(const dg of DUNGEONS){
    for(const boss of (dg.bosses || [])){
      const theme = inferBossTheme(boss.name, (boss.skills || [])[0] || { name:boss.name });
      const used = new Set();
      for(const sk of (boss.skills || [])){
        if(!sk) continue;
        if(generatedBossSkillNameNeedsRepair(sk.name)){
          sk.name = bossUnusedCanonicalSkillName(boss.name, used, used.size, bossFallbackLoreSkillName(theme, used.size));
        }
        used.add(sk.name);
      }
      for(const sk of (boss.passive?.tricks || [])){
        if(!sk) continue;
        if(generatedBossSkillNameNeedsRepair(sk.name) || used.has(sk.name)){
          sk.name = bossUnusedCanonicalSkillName(boss.name, used, used.size, bossFallbackLoreSkillName(theme, used.size));
        }
        used.add(sk.name);
      }
    }
  }
}
repairGeneratedBossSkillNames();
/* 部分技能改为 DoT(持续伤害)类:把已经是"灼烧/瘟疫/流血"主题的、非最强、非阶段技的伤害技,
   改成 dotSkill(combat 里不一次出伤,摊成持续灼烧)。每个 BOSS 最多转 1 个,保证仍有爆发技,
   且只转"原本就该是 DoT"的技能 → 体感:威胁分散、有治疗/吸血反应空间,而不是一发尖峰。 */
function convertSomeBossSkillsToDot(){
  for(const dg of DUNGEONS){
    for(const boss of (dg.bosses || [])){
      const dmgSkills = (boss.skills || []).filter(s => s && s.type !== 'heal' && s.type !== 'buff' && s.type !== 'support' && s.type !== 'summon' && typeof s.mul === 'number' && s.mul > 0);
      if(dmgSkills.length < 2) continue;   // 至少保留一个爆发技
      const maxMul = Math.max(...dmgSkills.map(s => s.mul));
      const cand = dmgSkills.find(s => (s.dot || s.plague || s.bleed) && !s.dotSkill && typeof s.hpBelow !== 'number' && s.mul < maxMul);
      if(cand){
        cand.dotSkill = true;
        cand.dotSecs = cand.dotSecs || 6;
        cand.castTime = Math.max(cand.castTime || 0, 1.6);
        cand.desc = `持续 ${cand.dotSecs} 秒灼烧`;
      }
    }
  }
}
convertSomeBossSkillsToDot();
/* 修复:部分副本(diremaul/lbrs/aq40等)缺失 cd 字段,导致 onDungeonClear 写入 NaN→永远无CD可无限刷。
   归一化:给任何无有效 cd 的副本按 type/reqLvl 补一个与邻居对齐的冷却。 */
for (const d of DUNGEONS) {
  if (!(d.cd > 0)) d.cd = Math.min(d.type === 'raid' ? 5400 : 2400, Math.max(600, Math.round((d.reqLvl || 12) * 40)));
}
/* ========== COMPANIONS(2026-06-15 大修)==========
   品质=按背景设定固定(不可升级),当前统一为 5主动 + 1专属
   mult=战力系数(越稀有越强),weight=抽卡权重,starsMax=可升星上限 */
const COMPANION_QUALITY=[
  {key:"white", name:"普通", cls:"r-common",   mult:0.65, skills:1, weight:46, lore:"无名之辈 / 杂兵"},
  {key:"green", name:"优秀", cls:"r-uncommon", mult:0.95, skills:2, weight:30, lore:"小有名气"},
  {key:"blue",  name:"精良", cls:"r-rare",     mult:1.35, skills:3, weight:16, lore:"中流砥柱"},
  {key:"purple",name:"史诗", cls:"r-epic",     mult:1.9,  skills:4, weight:6.5, lore:"一方霸主"},
  {key:"orange",name:"传说", cls:"r-legend",   mult:2.8,  skills:5, weight:1.5, lore:"传奇人物"},
];
/* 定位加成(出战随从额外给主角的属性,体现坦克/辅助/输出差异)
   2026-06-27 重做:坦克=纯防御扛压、辅助(原治疗)=加速增伤+轻续航(供毕业DPS提速过本)、输出=纯输出 */
const ROLE_BONUS={
  tank:{defPct:15, hpPct:12, vers:3},
  heal:{atkPct:5, mastery:6, regFlat:4},
  dps:{atkPct:6, crit:3}};
/* 羁绊:集齐 keys 中全部随从即激活,给主角额外加成 */
const COMPANION_BONDS=[
  // ---- 双人羁绊(拥有 2 名即激活)----
  {name:"守护者之力", keys:["medivh","jaina"],            mod:{atkPct:1},          desc:"麦迪文 + 吉安娜"},
  {name:"燃烧军团",   keys:["kiljaeden","azshara"],       mod:{atkPct:1,critdPct:8},desc:"基尔加丹 + 艾萨拉"},
  {name:"天灾降临",   keys:["lichking","kelthuzad"],      mod:{atkPct:1,leech:6},  desc:"巫妖王 + 克尔苏加德"},
  {name:"怒风兄弟",   keys:["illidan","malfurion"],       mod:{atkPct:1,hpPct:5},  desc:"伊利丹 + 玛法里奥"},
  {name:"乌瑞恩王室", keys:["varian","anduin"],           mod:{hpPct:6,atkPct:1},  desc:"瓦里安 + 安度因"},
  {name:"大酋长之路", keys:["thrall","saurfang"],         mod:{atkPct:1,vers:4},   desc:"萨尔 + 萨鲁法尔"},
  {name:"白银之手",   keys:["fordring","maraad"],         mod:{hpPct:6,defPct:4},  desc:"提里奥 + 玛拉达尔"},
  {name:"地狱咆哮",   keys:["grommash","garrosh"],        mod:{atkPct:2,critdPct:6},desc:"格罗玛什 + 加尔鲁什(父子)"},
  {name:"守望与背叛", keys:["illidan","maiev"],           mod:{atkPct:1,crit:4},   desc:"伊利丹 + 玛维"},
  {name:"半神之林",   keys:["cenarius","malfurion"],      mod:{hpPct:5,regFlat:5}, desc:"塞纳留斯 + 玛法里奥"},
  {name:"生命圣约",   keys:["alexstrasza","velen"],       mod:{hpPct:5,regFlat:5}, desc:"阿莱克丝塔萨 + 维伦"},
  {name:"灰烬王座",   keys:["bolvar","lichking"],         mod:{hpPct:6,leech:4},   desc:"伯瓦尔 + 巫妖王"},
  {name:"部落之握",   keys:["cairne","thrall"],           mod:{hpPct:5,defPct:3},  desc:"凯恩 + 萨尔"},
  {name:"暗影游侠",   keys:["sylvanas","voljin"],         mod:{crit:3,leech:4},    desc:"希尔瓦娜斯 + 沃金"},
  {name:"哨兵之誓",   keys:["tyrande","maiev"],           mod:{atkPct:1,crit:3},   desc:"泰兰德 + 玛维"},
  {name:"灰舌叛逃",   keys:["akama","maiev"],             mod:{atkPct:2,defPct:2}, desc:"阿卡玛 + 玛维"},
  // ---- 三人羁绊(拥有 3 名即激活,奖励更厚 —— 收藏向终极目标)----
  {name:"天灾军团",   keys:["arthas","kelthuzad","lichking"],  mod:{atkPct:3,leech:6},     desc:"阿尔萨斯 + 克尔苏加德 + 巫妖王"},
  {name:"圣光教廷",   keys:["anduin","maraad","velen"],        mod:{hpPct:6,regFlat:6},    desc:"安度因 + 玛拉达尔 + 维伦"},
  {name:"部落战帅",   keys:["thrall","saurfang","garrosh"],    mod:{atkPct:3,vers:4},      desc:"萨尔 + 萨鲁法尔 + 加尔鲁什"},
  {name:"守护者议会", keys:["medivh","khadgar","jaina"],       mod:{atkPct:3,crit:4},      desc:"麦迪文 + 卡德加 + 吉安娜"},
  {name:"背叛者同盟", keys:["illidan","kael","azshara"],       mod:{atkPct:3,critdPct:8},  desc:"伊利丹 + 凯尔萨斯 + 艾萨拉"},
  {name:"自然守望",   keys:["malfurion","cenarius","tyrande"], mod:{hpPct:6,vers:4},       desc:"玛法里奥 + 塞纳留斯 + 泰兰德"},
];
function compQuality(tpl){ return COMPANION_QUALITY.find(q=>q.key===(tpl&&tpl.quality)) || COMPANION_QUALITY[0]; }
const COMPANIONS=[{key:"fordring",name:"提里奥·弗丁",emoji:"👴",role:"tank",desc:"白银之手大领主",skills:[{name:"圣光审判",icon:"⚖️",desc:"2倍伤害,回复5%HP",type:"dmg",mul:2,heal:0.05,cd:10},{name:"圣盾守护",icon:"🛡️",desc:"8秒减伤40%",type:"buff",buff:"shield",cd:22},{name:"灰烬觉醒",icon:"✨",desc:"3倍伤害",type:"dmg",mul:4,cd:20},{name:"圣疗术",icon:"💚",desc:"恢复25%HP",type:"heal",heal:0.25,cd:30}]},{key:"varian",name:"瓦里安·乌瑞恩",emoji:"👑",role:"tank",desc:"暴风城国王",skills:[{name:"冲锋",icon:"💨",desc:"2倍伤害",type:"dmg",mul:2,cd:6},{name:"破甲",icon:"🔨",desc:"3倍伤害降防",type:"dmg",mul:3,cd:12},{name:"剑刃风暴",icon:"🌀",desc:"3倍伤害",type:"dmg",mul:5,cd:25},{name:"怒吼",icon:"📯",desc:"10秒攻击+15%",type:"buff",buff:"battleShout",cd:30}]},{key:"thrall",name:"萨尔",emoji:"👊",role:"tank",desc:"部落大酋长",skills:[{name:"闪电箭",icon:"⚡",desc:"2倍伤害",type:"dmg",mul:2,cd:6},{name:"大地之盾",icon:"🪨",desc:"8秒防御+40%",type:"buff",buff:"earthShield",cd:20},{name:"雷霆风暴",icon:"⛈️",desc:"3倍伤害",type:"dmg",mul:4,cd:18},{name:"治疗波",icon:"🌊",desc:"恢复20%HP",type:"heal",heal:0.2,cd:25}]},{key:"illidan",name:"伊利丹·怒风",emoji:"😈",role:"dps",desc:"背叛者",skills:[{name:"恶魔之咬",icon:"🦷",desc:"3倍伤害",type:"dmg",mul:3,cd:8},{name:"眼棱",icon:"👁️",desc:"3倍必暴",type:"dmg",mul:3,alwaysCrit:true,cd:16},{name:"恶魔变形",icon:"😈",desc:"10秒攻击+30%",type:"buff",buff:"bestial",cd:28},{name:"混沌打击",icon:"💥",desc:"3倍伤害",type:"dmg",mul:5,cd:24}]},{key:"arthas",name:"阿尔萨斯",emoji:"⚔️",role:"dps",desc:"洛丹伦王子",skills:[{name:"死亡缠绕",icon:"💀",desc:"3倍伤害吸血20%",type:"dmg",mul:3,lifeSteal:0.2,cd:10},{name:"凛风冲击",icon:"❄️",desc:"3倍伤害",type:"dmg",mul:3,cd:14},{name:"亡者大军",icon:"🧟",desc:"3倍伤害",type:"dmg",mul:5,cd:22,stun:true},{name:"巫妖之怒",icon:"☠️",desc:"10秒攻速+40%",type:"buff",buff:"rapidFire",cd:30}]},{key:"jaina",name:"吉安娜",emoji:"🧙‍♀️",role:"dps",desc:"肯瑞托大法师",skills:[{name:"寒冰箭",icon:"❄️",desc:"2倍伤害减速",type:"dmg",mul:2,cd:7,slow:true},{name:"冰霜新星",icon:"💠",desc:"3倍伤害",type:"dmg",mul:3,cd:15,slow:true},{name:"暴风雪",icon:"🌨️",desc:"3倍伤害",type:"dmg",mul:4,cd:20},{name:"奥术智慧",icon:"📖",desc:"10秒攻击+20%",type:"buff",buff:"battleShout",cd:28}]},{key:"sylvanas",name:"希尔瓦娜斯",emoji:"🏹",role:"dps",desc:"黑暗游侠",skills:[{name:"暗影箭",icon:"🏹",desc:"2倍伤害",type:"dmg",mul:2,cd:7},{name:"毒蛇射击",icon:"🐍",desc:"3倍中毒",type:"dmg",mul:3,dot:true,cd:12},{name:"黑暗之怒",icon:"🌑",desc:"3倍伤害",type:"dmg",mul:4,cd:18},{name:"亡灵意志",icon:"💀",desc:"10秒吸血+10%",type:"buff",buff:"shadowstep",cd:26}]},{key:"anduin",name:"安度因·乌瑞恩",emoji:"✝️",role:"heal",desc:"暴风城王子",skills:[{name:"惩击",icon:"✨",desc:"2倍伤害",type:"dmg",mul:2,cd:6},{name:"治疗术",icon:"💚",desc:"恢复30%HP",type:"heal",heal:0.3,cd:14},{name:"真言术盾",icon:"🛡️",desc:"8秒防御+30%",type:"buff",buff:"shield",cd:20},{name:"神圣赞美诗",icon:"🎵",desc:"恢复40%HP",type:"heal",heal:0.4,cd:28}]},{key:"tyrande",name:"泰兰德·语风",emoji:"🌙",role:"heal",desc:"月之女祭司",skills:[{name:"月火术",icon:"🌙",desc:"2倍伤害",type:"dmg",mul:2,cd:8},{name:"治疗之触",icon:"🌿",desc:"恢复25%HP",type:"heal",heal:0.25,cd:12},{name:"星陨术",icon:"🌟",desc:"3倍伤害",type:"dmg",mul:3,cd:18},{name:"宁静",icon:"🍃",desc:"恢复35%HP",type:"heal",heal:0.35,cd:26}]},{key:"malfurion",name:"玛法里奥·怒风",emoji:"🍂",role:"heal",desc:"大德鲁伊",skills:[{name:"愤怒",icon:"🌿",desc:"2倍伤害",type:"dmg",mul:2,cd:6},{name:"回春术",icon:"🌱",desc:"恢复20%HP",type:"heal",heal:0.2,cd:10},{name:"树皮术",icon:"🪵",desc:"8秒防御+35%",type:"buff",buff:"bark",cd:18},{name:"自然之力",icon:"🌳",desc:"恢复35%HP",type:"heal",heal:0.35,cd:24}]}];
