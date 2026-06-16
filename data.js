/* =========================================================
   data.js — 所有静态数据(职业/地图/副本/装备/商店)
   ========================================================= */

const SAVE_KEY = 'idle_azeroth_save_v4';
const MAX_LEVEL = 80;
const XP_CURVE_MULT = 3.2;   // 升级所需经验倍率(放慢升级,目标满级≈12小时;越大越慢,可调)

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
  leech:'吸血', vers:'全能', mastery:'精通', haste:'极速',
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
  'crit','critd','leech','vers','haste',
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
      interrupt:{name:"拳击",icon:"👊",desc:"打断BOSS施法,5秒CD",mp:10,type:"interrupt",cd:5,unlockLvl:1},
      cleave:       {name:'顺劈斩', icon:'🗡️', desc:'造成3倍攻击伤害', mp:20, type:'dmg', mul:3, unlockLvl:1},
      thunderClap:  {name:'雷霆一击', icon:'⚡', desc:'2.5倍攻击,降低敌人攻速', mp:25, type:'dmg', mul:2.5, slow:true, unlockLvl:12},
      battleShout:  {name:'战斗怒吼', icon:'📯', desc:'15秒攻击+30%', mp:30, type:'buff', buff:'battleShout', duration:15000, unlockLvl:22},
      mortalStrike: {name:'致死打击', icon:'⚔️', desc:'4倍攻击,必定暴击', mp:32, type:'dmg', mul:4, alwaysCrit:true},
      bloodthirst:  {name:'嗜血', icon:'🩸', desc:'5倍攻击,吸血50%', mp:40, type:'dmg', mul:5, lifeSteal:0.5},
      execute:      {name:'斩杀', icon:'💀', desc:'8倍攻击,残血终结', mp:35, type:'dmg', mul:8, unlockLvl:42},
      sunderArmor:  {name:'破甲攻击', icon:'🔨', desc:'3倍攻击,降低敌人防御15秒', mp:28, type:'dmg', mul:3, debuff:'sunder', unlockLvl:30},
      sweepingStrikes:{name:'横扫攻击',icon:'🌀', desc:'5倍攻击,范围横扫', mp:45, type:'dmg', mul:5, unlockLvl:56},
      bladestorm:   {name:'剑刃风暴', icon:'🌪️', desc:'8倍攻击,毁灭旋风', mp:60, type:'dmg', mul:8, unlockLvl:72},
      shieldWall:   {name:'盾墙', icon:'🛡️', desc:'15秒减伤50%', mp:50, type:'buff', buff:'shield', duration:15000},
    },
      shatteringThrow:{name:"碎裂投掷",icon:"🪓",desc:"4倍远程攻击,降低防御15秒",mp:35,type:"dmg",mul:4,unlockLvl:50},
      challengingShout:{name:"挑战怒吼",icon:"📯",desc:"10秒防御+30%,反伤+5%",mp:45,type:"buff",buff:"shield",duration:10000,unlockLvl:66},

      sunderArmor:  {name:'破甲攻击', icon:'🔨', desc:'3倍攻击,降低防御15秒', mp:28, type:'dmg', mul:3, unlockLvl:28},
      sweepingStrikes:{name:'横扫攻击',icon:'🌀', desc:'5倍攻击,范围伤害', mp:45, type:'dmg', mul:5, unlockLvl:56},
      bladestormUlt: {name:'剑刃风暴', icon:'🌪️', desc:'8倍攻击,毁灭旋风', mp:65, type:'dmg', mul:8, unlockLvl:74},
    trees:[
      {key:'arms', name:'武器', icon:'⚔️', masteryDesc:'致死打击伤害 +2%/精通', talents:[
        {key:'致命武器_9afo', name:'致命武器', desc:'攻击 +2%/层', max:5, mod:{atkPct:2}},
        {key:'残忍_s8po', name:'残忍', desc:'暴击 +1.5%/层', max:5, mod:{crit:1.5}},
        {key:'战术大师_awyh', name:'战术大师', desc:'技能CD +4%/层', max:3, mod:{cdReduction:4}},
        {key:'武器精通_ixxe', name:'武器精通', desc:'额外攻击 +2%/层', max:5, mod:{extraAtk:2}},
        {key:'破甲_9crt', name:'破甲', desc:'攻击 +2%/层 · 斩杀加成 +3%/层', max:3, mod:{atkPct:2,executeBonus:3}},
        {key:'致死打击_gtmg', name:'致死打击', desc:'解锁: 致死打击', max:1, req:10, unlockSkill:'mortalStrike'},
        {key:'处刑者_mq9q', name:'处刑者', desc:'斩杀加成 +5%/层', max:5, req:15, mod:{executeBonus:5}},
        {key:'剑刃风暴_r5y7', name:'剑刃风暴', desc:'攻速 +5%/层 · 暴伤 +6%/层', max:5, req:18, mod:{spdPct:5,critdPct:6}},
        {key:'致命势头_rhev', name:'致命势头', desc:'攻击 +2%/层 · 斩杀加成 +4%/层', max:3, req:22, mod:{atkPct:2,executeBonus:4}},
        {key:'武器宗师_9e33', name:'武器宗师', desc:'暴伤 +8%/层 · 技能CD +3%/层', max:5, req:25, mod:{critdPct:8,cdReduction:3}},
        {key:'处决_wz7o', name:'处决', desc:'斩杀加成 +6%/层 · 暴击 +2%/层', max:5, req:28, mod:{executeBonus:6,crit:2}},
        {key:'无尽之怒_kl3i', name:'无尽之怒', desc:'攻击 +3%/层 · 攻速 +4%/层', max:5, req:30, mod:{atkPct:3,spdPct:4}},
        {key:'破甲专精_fqbq', name:'破甲专精', desc:'额外攻击 +3%/层 · 技能CD +4%/层', max:3, req:33, mod:{extraAtk:3,cdReduction:4}},
        {key:'致命专注_szok', name:'致命专注', desc:'暴伤 +12%/层 · 精通 +2%/层', max:3, req:36, mod:{critdPct:12,mastery:2}}
      ,
{key:'tal_3cuo6h', name:'千钧之力', desc:'攻击 +3%/层 · 力量 +6%/层', max:5,req:38,mod:{atkPct:3,strPct:6}},{key:'tal_h0awm3', name:'武器大师', desc:'额外攻击 +2%/层 · 技能CD +5%/层', max:5,req:42,mod:{extraAtk:5,cdReduction:5}},{key:'tal_yq7lc3', name:'战神', desc:'攻击 +2%/层 · 斩杀加成 +8%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:5,executeBonus:8,mastery:2}}]},
      {key:'fury', name:'狂暴', icon:'🔥', masteryDesc:'嗜血吸血效果 +4%/精通', talents:[
        {key:'激怒_n0b6', name:'激怒', desc:'攻速 +5%/层', max:5, mod:{spdPct:5}},
        {key:'夺命_1b6c', name:'夺命', desc:'暴伤 +8%/层', max:5, mod:{critdPct:8}},
        {key:'血之狂热_nf2d', name:'血之狂热', desc:'吸血 +2%/层', max:3, mod:{leech:2}},
        {key:'狂战士_n468', name:'狂战士', desc:'攻击 +2%/层 · 暴击 +1%/层', max:5, mod:{atkPct:2,crit:1}},
        {key:'怒气爆发_3ytl', name:'怒气爆发', desc:'技能CD +5%/层', max:3, mod:{cdReduction:5}},
        {key:'嗜血_vq9y', name:'嗜血', desc:'解锁: 嗜血', max:1, req:10, unlockSkill:'bloodthirst'},
        {key:'泰坦之握_k9fr', name:'泰坦之握', desc:'攻击 +3%/层', max:5, req:15, mod:{atkPct:3}},
        {key:'鲁莽_343i', name:'鲁莽', desc:'暴击 +2%/层 · 攻速 +3%/层', max:5, req:18, mod:{crit:2,spdPct:3}},
        {key:'血之渴望_jmmi', name:'血之渴望', desc:'吸血 +3%/层 · 额外攻击 +2%/层', max:3, req:22, mod:{leech:3,extraAtk:2}},
        {key:'狂怒_w0x9', name:'狂怒', desc:'攻击 +2%/层 · 暴伤 +5%/层', max:5, req:25, mod:{atkPct:2,critdPct:5}},
        {key:'斩杀强化_3d7b', name:'斩杀强化', desc:'斩杀加成 +5%/层 · 减耗 +4%/层', max:5, req:28, mod:{executeBonus:5,costReduction:4}},
        {key:'无尽嗜血_2yvj', name:'无尽嗜血', desc:'吸血 +4%/层 · 技能CD +3%/层', max:5, req:30, mod:{leech:4,cdReduction:3}},
        {key:'狂暴之力_glx9', name:'狂暴之力', desc:'额外攻击 +2%/层 · 攻速 +5%/层', max:3, req:33, mod:{extraAtk:4,spdPct:5}},
        {key:'狂战士之魂_8my2', name:'狂战士之魂', desc:'攻击 +2%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:4,mastery:2}}
      ,
{key:'tal_b6kj2z', name:'无尽狂怒', desc:'攻速 +8%/层 · 攻击 +2%/层', max:5,req:38,mod:{spdPct:8,atkPct:2}},{key:'tal_maxzem', name:'狂战', desc:'吸血 +5%/层 · 暴击 +3%/层', max:5,req:42,mod:{leech:5,crit:3}},{key:'tal_en9kr4', name:'战神', desc:'攻击 +2%/层 · 额外攻击 +2%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:5,extraAtk:6,mastery:2}}]},
      {key:'prot', name:'防护', icon:'🛡️', masteryDesc:'盾墙减伤效果 +3%/精通', talents:[
        {key:'坚韧_axub', name:'坚韧', desc:'生命 +5%/层', max:5, mod:{hpPct:5}},
        {key:'预判_ndzh', name:'预判', desc:'防御 +5%/层', max:5, mod:{defPct:5}},
        {key:'壁垒_ov99', name:'壁垒', desc:'耐力 +5%/层', max:3, mod:{staPct:5}},
        {key:'圣化之地_lwk5', name:'圣化之地', desc:'反伤 +2%/层', max:5, mod:{reflectDmg:2}},
        {key:'正义之怒_lzx6', name:'正义之怒', desc:'全能 +2%/层', max:3, mod:{vers:2}},
        {key:'圣盾术_slst', name:'圣盾术', desc:'解锁: 圣盾术', max:1, req:10, unlockSkill:'divineShield'},
        {key:'炽热防御者_sh4j', name:'炽热防御者', desc:'防御 +8%/层', max:5, req:15, mod:{defPct:8}},
        {key:'守护者_157k', name:'守护者', desc:'耐力 +6%/层 · 全能 +2%/层', max:5, req:18, mod:{staPct:6,vers:2}},
        {key:'圣盾_467q', name:'圣盾', desc:'防御 +6%/层 · 反伤 +2%/层', max:3, req:22, mod:{defPct:6,reflectDmg:2}},
        {key:'铁壁_j6ev', name:'铁壁', desc:'防御 +7%/层 · 生命 +3%/层', max:5, req:25, mod:{defPct:7,hpPct:3}},
        {key:'圣光壁垒_3f09', name:'圣光壁垒', desc:'生命 +6%/层 · 全能 +3%/层', max:5, req:28, mod:{hpPct:6,vers:3}},
        {key:'守护_2cm4', name:'守护', desc:'防御 +8%/层 · 反伤 +3%/层', max:5, req:30, mod:{defPct:8,reflectDmg:3}},
        {key:'防护大师_ccej', name:'防护大师', desc:'技能CD +5%/层 · 防御 +5%/层', max:3, req:33, mod:{cdReduction:5,defPct:5}},
        {key:'防护宗师_k7w0', name:'防护宗师', desc:'生命 +10%/层 · 精通 +2%/层', max:3, req:36, mod:{hpPct:10,mastery:2}}
      ,
{key:'tal_pomgzm', name:'铜墙铁壁', desc:'防御 +8%/层 · 生命 +5%/层', max:5,req:38,mod:{defPct:8,hpPct:5}},{key:'tal_7f5oiq', name:'坚不可摧', desc:'耐力 +8%/层 · 反伤 +5%/层', max:5,req:42,mod:{staPct:8,reflectDmg:5}},{key:'tal_ikwcqv', name:'战神', desc:'生命 +12%/层 · 全能 +6%/层 · 精通 +2%/层', max:3,req:45,mod:{hpPct:12,vers:6,mastery:2}},
{key:'tal_b0z1v9', name:'壁垒', desc:'防御 +8%/层 · 生命 +5%/层', max:5,req:38,mod:{defPct:8,hpPct:5}},{key:'tal_tjz4f9', name:'审判之盾', desc:'反伤 +6%/层 · 耐力 +6%/层', max:5,req:42,mod:{reflectDmg:6,staPct:6}},{key:'tal_05he3a', name:'守护天使', desc:'防御 +12%/层 · 生命 +8%/层 · 精通 +2%/层', max:3,req:45,mod:{defPct:12,hpPct:8,mastery:2}}]},
    ],
  },

  mage: {
    name:'法师', icon:'🧙', emoji:'🧙‍♂️', color:'#69ccf0',
    desc:'布甲法师,元素法术毁灭一切', primaryAttr:'智力',
    attackAttr:'int', resource:'法力', resKey:'mp',
    baseAttrs:{str:5, agi:10, int:22, spi:14, sta:12},
    baseStats:{hpMax:50, mpMax:80, atk:6, def:2, crit:8, critd:150, spd:1.1, reg:1},
    skills:{
      interrupt:{name:"法术反制",icon:"✋",desc:"打断BOSS施法,5秒CD",mp:15,type:"interrupt",cd:5,unlockLvl:1},
      arcane:       {name:'奥术飞弹', icon:'✨', desc:'造成3倍攻击伤害', mp:15, type:'dmg', mul:3, unlockLvl:1,castTime:1.5},
      arcaneExplosion:{name:'奥术爆炸', icon:'💥', desc:'3倍攻击范围伤害', mp:30, type:'dmg', mul:3, unlockLvl:14,castTime:0},
      fireball:     {name:'火球术',   icon:'🔥', desc:'4倍攻击,引燃灼烧', mp:25, type:'dmg', mul:4, dot:true,castTime:2.5},
      frostbolt:    {name:'寒冰箭',   icon:'❄️', desc:'3.5倍攻击,降低敌人攻速', mp:20, type:'dmg', mul:3.5, slow:true,castTime:2},
      iceBarrier:   {name:'寒冰护体', icon:'🧊', desc:'15秒防御+60%', mp:40, type:'buff', buff:'iceBarrier', duration:15000, unlockLvl:28,castTime:0},
      pyroblast:    {name:'炎爆术',   icon:'☄️', desc:'7倍攻击,必定暴击', mp:50, type:'dmg', mul:7, alwaysCrit:true, unlockLvl:46,castTime:4},
      blizzard:     {name:'暴风雪',   icon:'🌨️', desc:'6倍攻击,毁灭风暴', mp:55, type:'dmg', mul:6,castTime:2},
    },
      mirrorImage:{name:"镜像",icon:"🪞",desc:"15秒攻击+30%",mp:40,type:"buff",buff:"bestial",duration:15000,unlockLvl:48},
      slow:{name:"减速",icon:"🐌",desc:"4倍伤害,大幅减速",mp:30,type:"dmg",mul:4,slow:true,unlockLvl:62},

      polymorph:    {name:'变形术',   icon:'🐑', desc:'4倍攻击,大幅减速', mp:30, type:'dmg', mul:4, slow:true, unlockLvl:35,castTime:1.5},
      dragonBreath: {name:'龙息术',   icon:'🐲', desc:'6倍火焰伤害', mp:48, type:'dmg', mul:6, dot:true, unlockLvl:58,castTime:0},
      timeWarp:     {name:'时间扭曲', icon:'⏳', desc:'15秒攻速+80%', mp:60, type:'buff', buff:'timeWarp', duration:15000, unlockLvl:76,castTime:0},
    trees:[
      {key:'arcane', name:'奥术', icon:'✨', masteryDesc:'暴风雪伤害 +3%/精通', talents:[
        {key:'奥术专精_y6in', name:'奥术专精', desc:'智力 +5%/层', max:5, mod:{intPct:5}},
        {key:'奥术冥想_h6zk', name:'奥术冥想', desc:'回复 +2%/层', max:5, mod:{regFlat:2}},
        {key:'奥术心智_k520', name:'奥术心智', desc:'暴击 +2%/层', max:3, mod:{crit:2}},
        {key:'奥术强化_2ldc', name:'奥术强化', desc:'攻击 +2%/层', max:5, mod:{atkPct:2}},
        {key:'节能施法_bd03', name:'节能施法', desc:'减耗 +5%/层', max:3, mod:{costReduction:5}},
        {key:'暴风雪_wazr', name:'暴风雪', desc:'解锁: 暴风雪', max:1, req:10, unlockSkill:'blizzard'},
        {key:'奥术涌动_vju1', name:'奥术涌动', desc:'攻击 +3%/层 · 技能CD +3%/层', max:5, req:15, mod:{atkPct:3,cdReduction:3}},
        {key:'奥术回响_b8cj', name:'奥术回响', desc:'额外攻击 +2%/层 · 暴伤 +6%/层', max:5, req:18, mod:{extraAtk:2,critdPct:6}},
        {key:'超凡入圣_ki0e', name:'超凡入圣', desc:'智力 +6%/层 · 技能CD +4%/层', max:3, req:22, mod:{intPct:6,cdReduction:4}},
        {key:'魔网_xhrf', name:'魔网', desc:'技能CD +5%/层 · 攻速 +4%/层', max:5, req:25, mod:{cdReduction:5,spdPct:4}},
        {key:'法力专家_bk0b', name:'法力专家', desc:'减耗 +5%/层 · 攻击 +2%/层', max:5, req:28, mod:{costReduction:5,atkPct:2}},
        {key:'奥术之力_25md', name:'奥术之力', desc:'攻击 +3%/层 · 暴伤 +8%/层', max:5, req:30, mod:{atkPct:3,critdPct:8}},
        {key:'灵风_qnj3', name:'灵风', desc:'攻速 +6%/层 · 减耗 +4%/层', max:3, req:33, mod:{spdPct:6,costReduction:4}},
        {key:'奥术宗师_dh7l', name:'奥术宗师', desc:'攻击 +2%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:4,mastery:2}}
      ,
{key:'tal_vy68we', name:'奥术洪流', desc:'攻击 +3%/层 · 减耗 +5%/层', max:5,req:38,mod:{atkPct:3,costReduction:5}},{key:'tal_uw6vj0', name:'法力风暴', desc:'智力 +8%/层 · 技能CD +5%/层', max:5,req:42,mod:{intPct:8,cdReduction:5}},{key:'tal_ytx7oz', name:'大法师', desc:'攻击 +2%/层 · 暴伤 +10%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:5,critdPct:10,mastery:2}}]},
      {key:'fire', name:'火焰', icon:'🔥', masteryDesc:'火球术灼烧伤害 +4%/精通', talents:[
        {key:'引燃_xwmm', name:'引燃', desc:'攻击 +2%/层', max:5, mod:{atkPct:2}},
        {key:'临界点_of9n', name:'临界点', desc:'暴击 +1.5%/层', max:5, mod:{crit:1.5}},
        {key:'灼烧之魂_1cba', name:'灼烧之魂', desc:'暴伤 +8%/层', max:3, mod:{critdPct:8}},
        {key:'烈焰之心_qe0c', name:'烈焰之心', desc:'持续伤害 +5%/层', max:5, mod:{dotBonus:5}},
        {key:'火焰冲击_o93d', name:'火焰冲击', desc:'技能CD +4%/层', max:3, mod:{cdReduction:4}},
        {key:'火球术_wshg', name:'火球术', desc:'解锁: 火球术', max:1, req:10, unlockSkill:'fireball'},
        {key:'燃烧_ddyk', name:'燃烧', desc:'攻击 +3%/层', max:5, req:15, mod:{atkPct:3}},
        {key:'永恒烈焰_9e2d', name:'永恒烈焰', desc:'持续伤害 +6%/层 · 暴伤 +5%/层', max:5, req:18, mod:{dotBonus:6,critdPct:5}},
        {key:'凤凰烈焰_h7gd', name:'凤凰烈焰', desc:'暴击 +2%/层 · 技能CD +3%/层', max:3, req:22, mod:{crit:2,cdReduction:3}},
        {key:'灼热_4nud', name:'灼热', desc:'攻击 +2%/层 · 吸血 +2%/层', max:5, req:25, mod:{atkPct:2,leech:2}},
        {key:'焦灼_fslr', name:'焦灼', desc:'斩杀加成 +5%/层 · 暴伤 +7%/层', max:5, req:28, mod:{executeBonus:5,critdPct:7}},
        {key:'炎爆_m7ik', name:'炎爆', desc:'攻击 +3%/层 · 暴击 +2%/层', max:5, req:30, mod:{atkPct:3,crit:2}},
        {key:'火焰专精_qi3j', name:'火焰专精', desc:'持续伤害 +8%/层 · 额外攻击 +3%/层', max:3, req:33, mod:{dotBonus:8,extraAtk:3}},
        {key:'烈焰宗师_xjj4', name:'烈焰宗师', desc:'攻击 +2%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:4,mastery:2}}
      ,
{key:'tal_9gb7zz', name:'活体炸弹', desc:'持续伤害 +8%/层 · 暴击 +2%/层', max:5,req:38,mod:{dotBonus:8,crit:2}},{key:'tal_fis9ti', name:'炼狱', desc:'攻击 +3%/层 · 斩杀加成 +5%/层', max:5,req:42,mod:{atkPct:3,executeBonus:5}},{key:'tal_29bm2f', name:'大法师', desc:'攻击 +2%/层 · 暴伤 +10%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:5,critdPct:10,mastery:2}}]},
      {key:'frost', name:'冰霜', icon:'❄️', masteryDesc:'寒冰箭减速效果 +5%/精通', talents:[
        {key:'碎裂_6q4s', name:'碎裂', desc:'暴伤 +10%/层', max:5, mod:{critdPct:10}},
        {key:'冰甲术_ypee', name:'冰甲术', desc:'防御 +5%/层', max:5, mod:{defPct:5}},
        {key:'永冻_o7dg', name:'永冻', desc:'智力 +5%/层', max:3, mod:{intPct:5}},
        {key:'冰霜之触_ui6r', name:'冰霜之触', desc:'攻击 +2%/层 · 攻速 +3%/层', max:5, mod:{atkPct:2,spdPct:3}},
        {key:'寒冰屏障_igiy', name:'寒冰屏障', desc:'全能 +2%/层', max:3, mod:{vers:2}},
        {key:'寒冰箭_bzxf', name:'寒冰箭', desc:'解锁: 寒冰箭', max:1, req:10, unlockSkill:'frostbolt'},
        {key:'深度冻结_ljp1', name:'深度冻结', desc:'暴伤 +10%/层', max:5, req:15, mod:{critdPct:10}},
        {key:'冰川_evvy', name:'冰川', desc:'防御 +4%/层 · 全能 +2%/层', max:5, req:18, mod:{defPct:4,vers:2}},
        {key:'寒冬_nnx5', name:'寒冬', desc:'攻击 +2%/层 · 暴击 +1.5%/层', max:3, req:22, mod:{atkPct:2,crit:1.5}},
        {key:'冰霜之咬_xdgt', name:'冰霜之咬', desc:'技能CD +4%/层 · 暴伤 +6%/层', max:5, req:25, mod:{cdReduction:4,critdPct:6}},
        {key:'急冻_d4uy', name:'急冻', desc:'额外攻击 +3%/层 · 攻击 +2%/层', max:5, req:28, mod:{extraAtk:3,atkPct:2}},
        {key:'零度_vil0', name:'零度', desc:'暴击 +2.5%/层 · 减耗 +4%/层', max:5, req:30, mod:{crit:2.5,costReduction:4}},
        {key:'冰封_11lc', name:'冰封', desc:'防御 +6%/层 · 全能 +3%/层', max:3, req:33, mod:{defPct:6,vers:3}},
        {key:'冰霜宗师_kkmw', name:'冰霜宗师', desc:'攻击 +2%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:4,mastery:2}}
      ,
{key:'tal_4sxjog', name:'冰河时代', desc:'防御 +8%/层 · 全能 +4%/层', max:5,req:38,mod:{defPct:8,vers:4}},{key:'tal_4bba7s', name:'绝对零度', desc:'暴伤 +10%/层 · 额外攻击 +2%/层', max:5,req:42,mod:{critdPct:10,extraAtk:4}},{key:'tal_815u80', name:'大法师', desc:'攻击 +2%/层 · 暴击 +3%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:5,crit:3,mastery:2}}]},
    ],
  },

  priest: {
    name:'牧师', icon:'⛪', emoji:'🧝', color:'#ffffff',
    desc:'圣光与暗影的传道者', primaryAttr:'智力',
    attackAttr:'int', resource:'法力', resKey:'mp',
    baseAttrs:{str:6, agi:8, int:20, spi:18, sta:13},
    baseStats:{hpMax:55, mpMax:90, atk:5, def:2, crit:5, critd:150, spd:0.9, reg:2},
    skills:{
      interrupt:{name:"沉默",icon:"🤫",desc:"打断BOSS施法,5秒CD",mp:12,type:"interrupt",cd:5,unlockLvl:1},
      smite:      {name:'惩击',     icon:'✝️', desc:'2.5倍神圣伤害', mp:15, type:'dmg', mul:2.5, unlockLvl:1,castTime:1.5},
      shadowWord: {name:'暗言术·痛',icon:'🌑', desc:'3倍攻击,持续暗影伤害', mp:20, type:'dmg', mul:3, dot:true, unlockLvl:12,castTime:0},
      shield:     {name:'真言术盾', icon:'🛡️', desc:'15秒防御+50%', mp:30, type:'buff', buff:'shield', duration:15000,castTime:0},
      heal:       {name:'治疗术',   icon:'💚', desc:'恢复40%生命', mp:35, type:'heal', heal:0.4,castTime:2.5},
      holyNova:   {name:'神圣新星', icon:'✨', desc:'3倍攻击+15%自愈', mp:38, type:'dmg', mul:3, lifeSteal:0.3, unlockLvl:30,castTime:0},
      powerInfusion:{name:'能量灌注',icon:'💉', desc:'15秒攻速+50%', mp:45, type:'buff', buff:'windfury', duration:15000, unlockLvl:42,castTime:0},
      mindBlast:  {name:'心灵震爆', icon:'🌀', desc:'5倍攻击伤害', mp:40, type:'dmg', mul:5,castTime:1.5},
    },
      shackleUndead:{name:"束缚亡灵",icon:"⛓️",desc:"4倍伤害,定身减速",mp:28,type:"dmg",mul:4,slow:true,unlockLvl:44},
      holyFire:{name:"神圣之火",icon:"🔥",desc:"5倍伤害,持续灼烧",mp:38,type:"dmg",mul:5,dot:true,unlockLvl:60},

      renew:        {name:'恢复',     icon:'🌱', desc:'恢复35%生命', mp:30, type:'heal', heal:0.35, unlockLvl:32,castTime:0},
      shadowDeath:  {name:'暗言术·灭',icon:'💀', desc:'7倍暗影伤害', mp:45, type:'dmg', mul:7, unlockLvl:52,castTime:0},
      divineHymn:   {name:'神圣赞美诗',icon:'🎵', desc:'恢复50%生命', mp:60, type:'heal', heal:0.5, unlockLvl:72,castTime:2},
    trees:[
      {key:'discipline', name:'戒律', icon:'🕊️', masteryDesc:'真言术盾吸收量 +4%/精通', talents:[
        {key:'冥想_nwog', name:'冥想', desc:'回复 +2%/层', max:5, mod:{regFlat:2}},
        {key:'心灵强化_zcy9', name:'心灵强化', desc:'智力 +5%/层', max:5, mod:{intPct:5}},
        {key:'心灵之火_jxpm', name:'心灵之火', desc:'防御 +6%/层', max:3, mod:{defPct:6}},
        {key:'意志之力_234q', name:'意志之力', desc:'全能 +3%/层', max:5, mod:{vers:3}},
        {key:'启迪_4qwr', name:'启迪', desc:'技能CD +3%/层', max:3, mod:{cdReduction:3}},
        {key:'真言术盾_4ecx', name:'真言术盾', desc:'解锁: 真言术盾', max:1, req:10, unlockSkill:'shield'},
        {key:'救赎_5a4x', name:'救赎', desc:'攻击 +3%/层', max:5, req:15, mod:{atkPct:3}},
        {key:'灵魂之壳_4vdj', name:'灵魂之壳', desc:'防御 +5%/层 · 精神 +3%/层', max:5, req:18, mod:{defPct:5,spiPct:3}},
        {key:'圣光道标_n2yl', name:'圣光道标', desc:'治疗 +7%/层', max:3, req:22, mod:{healBonus:7}},
        {key:'屏障_69ik', name:'屏障', desc:'防御 +6%/层 · 全能 +2%/层', max:5, req:25, mod:{defPct:6,vers:2}},
        {key:'救赎之魂_bl9j', name:'救赎之魂', desc:'治疗 +6%/层 · 回复 +3%/层', max:5, req:28, mod:{healBonus:6,regFlat:3}},
        {key:'意志_qvaw', name:'意志', desc:'生命 +6%/层 · 治疗 +5%/层', max:5, req:30, mod:{hpPct:6,healBonus:5}},
        {key:'戒律之力_31no', name:'戒律之力', desc:'技能CD +5%/层 · 攻击 +2%/层', max:3, req:33, mod:{cdReduction:5,atkPct:2}},
        {key:'戒律师宗_0txl', name:'戒律师宗', desc:'治疗 +10%/层 · 精通 +2%/层', max:3, req:36, mod:{healBonus:10,mastery:2}}
      ,
{key:'tal_6ur2ah', name:'圣光庇护', desc:'防御 +8%/层 · 治疗 +5%/层', max:5,req:38,mod:{defPct:8,healBonus:5}},{key:'tal_tgaqq3', name:'天使', desc:'精神 +8%/层 · 治疗 +7%/层', max:5,req:42,mod:{spiPct:8,healBonus:7}},{key:'tal_gtapc7', name:'大祭司', desc:'治疗 +15%/层 · 技能CD +5%/层 · 精通 +2%/层', max:3,req:45,mod:{healBonus:15,cdReduction:5,mastery:2}}]},
      {key:'holy', name:'神圣', icon:'✝️', masteryDesc:'治疗术回复量 +5%/精通', talents:[
        {key:'光明_uz4j', name:'光明', desc:'精神 +5%/层', max:5, mod:{spiPct:5}},
        {key:'神性_6o1u', name:'神性', desc:'智力 +5%/层', max:5, mod:{intPct:5}},
        {key:'圣化_n8vy', name:'圣化', desc:'回复 +2%/层', max:3, mod:{regFlat:2}},
        {key:'神恩_3h1q', name:'神恩', desc:'治疗 +5%/层', max:5, mod:{healBonus:5}},
        {key:'圣洁_7zvz', name:'圣洁', desc:'全能 +2%/层', max:3, mod:{vers:2}},
        {key:'圣光术_0ynh', name:'圣光术', desc:'解锁: 圣光术', max:1, req:10, unlockSkill:'holyLight'},
        {key:'圣光信标_49vd', name:'圣光信标', desc:'生命 +6%/层', max:5, req:15, mod:{hpPct:6}},
        {key:'圣光辐射_uwtw', name:'圣光辐射', desc:'生命 +4%/层 · 治疗 +5%/层', max:5, req:18, mod:{hpPct:4,healBonus:5}},
        {key:'守护之魂_3pgg', name:'守护之魂', desc:'防御 +5%/层 · 治疗 +4%/层', max:3, req:22, mod:{defPct:5,healBonus:4}},
        {key:'圣光_5dw8', name:'圣光', desc:'生命 +6%/层 · 回复 +2%/层', max:5, req:25, mod:{hpPct:6,regFlat:2}},
        {key:'圣疗_1dq5', name:'圣疗', desc:'治疗 +8%/层 · 精神 +3%/层', max:5, req:28, mod:{healBonus:8,spiPct:3}},
        {key:'神圣_2532', name:'神圣', desc:'生命 +7%/层 · 治疗 +5%/层', max:5, req:30, mod:{hpPct:7,healBonus:5}},
        {key:'圣光大师_tci1', name:'圣光大师', desc:'技能CD +4%/层 · 治疗 +5%/层', max:3, req:33, mod:{cdReduction:4,healBonus:5}},
        {key:'神圣宗师_33ld', name:'神圣宗师', desc:'治疗 +12%/层 · 精通 +2%/层', max:3, req:36, mod:{healBonus:12,mastery:2}}
      ,
{key:'tal_o3gedr', name:'神圣眷顾', desc:'治疗 +8%/层 · 生命 +5%/层', max:5,req:38,mod:{healBonus:8,hpPct:5}},{key:'tal_1nketb', name:'永恒之光', desc:'精神 +8%/层 · 回复 +3%/层', max:5,req:42,mod:{spiPct:8,regFlat:3}},{key:'tal_06hcy6', name:'大祭司', desc:'治疗 +15%/层 · 全能 +5%/层 · 精通 +2%/层', max:3,req:45,mod:{healBonus:15,vers:5,mastery:2}},
{key:'tal_xwcf0i', name:'圣光洗礼', desc:'治疗 +8%/层 · 精神 +5%/层', max:5,req:38,mod:{healBonus:8,spiPct:5}},{key:'tal_2pupt2', name:'黎明之光', desc:'生命 +8%/层 · 治疗 +7%/层', max:5,req:42,mod:{hpPct:8,healBonus:7}},{key:'tal_whu9yf', name:'圣光化身', desc:'治疗 +15%/层 · 技能CD +5%/层 · 精通 +2%/层', max:3,req:45,mod:{healBonus:15,cdReduction:5,mastery:2}}]},
      {key:'shadow', name:'暗影', icon:'🌑', masteryDesc:'心灵震爆伤害 +3%/精通', talents:[
        {key:'暗影成型_dje7', name:'暗影成型', desc:'攻击 +2%/层', max:5, mod:{atkPct:2}},
        {key:'吸血鬼之触_jdbz', name:'吸血鬼之触', desc:'暴伤 +8%/层', max:5, mod:{critdPct:8}},
        {key:'黑暗思维_mlvw', name:'黑暗思维', desc:'暴击 +2%/层', max:3, mod:{crit:2}},
        {key:'暗影之力_kjt8', name:'暗影之力', desc:'持续伤害 +5%/层', max:5, mod:{dotBonus:5}},
        {key:'心灵尖刺_kji8', name:'心灵尖刺', desc:'技能CD +4%/层', max:3, mod:{cdReduction:4}},
        {key:'心灵震爆_47e3', name:'心灵震爆', desc:'解锁: 心灵震爆', max:1, req:10, unlockSkill:'mindBlast'},
        {key:'虚空形态_18n3', name:'虚空形态', desc:'攻击 +3%/层', max:5, req:15, mod:{atkPct:3}},
        {key:'暗影魔_ylie', name:'暗影魔', desc:'攻击 +2%/层 · 吸血 +2%/层', max:5, req:18, mod:{atkPct:2,leech:2}},
        {key:'虚空回响_zsfh', name:'虚空回响', desc:'额外攻击 +3%/层 · 暴伤 +5%/层', max:3, req:22, mod:{extraAtk:3,critdPct:5}},
        {key:'疯狂_bowy', name:'疯狂', desc:'攻击 +2%/层 · 攻速 +3%/层', max:5, req:25, mod:{atkPct:2,spdPct:3}},
        {key:'暗影之痛_m7pe', name:'暗影之痛', desc:'持续伤害 +7%/层 · 斩杀加成 +4%/层', max:5, req:28, mod:{dotBonus:7,executeBonus:4}},
        {key:'天启_uank', name:'天启', desc:'攻击 +3%/层 · 暴击 +2%/层', max:5, req:30, mod:{atkPct:3,crit:2}},
        {key:'混沌_uaof', name:'混沌', desc:'技能CD +5%/层 · 持续伤害 +5%/层', max:3, req:33, mod:{cdReduction:5,dotBonus:5}},
        {key:'暗影宗师_zywn', name:'暗影宗师', desc:'攻击 +2%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:4,mastery:2}}
      ,
{key:'tal_olt688', name:'暗影幻灵', desc:'持续伤害 +8%/层 · 吸血 +3%/层', max:5,req:38,mod:{dotBonus:8,leech:3}},{key:'tal_wcgwwu', name:'虚空', desc:'攻击 +3%/层 · 暴击 +3%/层', max:5,req:42,mod:{atkPct:3,crit:3}},{key:'tal_bf4hdm', name:'暗影祭司', desc:'攻击 +2%/层 · 斩杀加成 +8%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:5,executeBonus:8,mastery:2}}]},
    ],
  },

  rogue: {
    name:'盗贼', icon:'🗡️', emoji:'🥷', color:'#fff569',
    desc:'皮甲刺客,从阴影中给予致命一击', primaryAttr:'敏捷',
    attackAttr:'agi', resource:'能量', resKey:'energy',
    baseAttrs:{str:12, agi:24, int:6, spi:7, sta:14},
    baseStats:{hpMax:60, mpMax:100, atk:7, def:3, crit:10, critd:160, spd:1.4, reg:2},
    skills:{
      interrupt:{name:"脚踢",icon:"🦶",desc:"打断BOSS施法,5秒CD",mp:15,type:"interrupt",cd:5,unlockLvl:1},
      sinister:    {name:'邪恶打击', icon:'🗡️', desc:'造成2.5倍攻击', mp:20, type:'dmg', mul:2.5, unlockLvl:1},
      backstab:    {name:'背刺',     icon:'🔪', desc:'4倍攻击伤害', mp:30, type:'dmg', mul:4},
      poison:      {name:'毒刃',     icon:'🐍', desc:'3倍攻击,持续中毒', mp:25, type:'dmg', mul:3, dot:true},
      evasion:     {name:'闪避',     icon:'💨', desc:'15秒防御+40%', mp:30, type:'buff', buff:'evasion', duration:15000, unlockLvl:18},
      kidneyShot:  {name:'肾击',     icon:'👊', desc:'5倍攻击,降低敌人攻速', mp:32, type:'dmg', mul:5, slow:true, unlockLvl:32},
      killingSpree:{name:'杀戮盛宴', icon:'💀', desc:'7倍攻击,必定暴击', mp:48, type:'dmg', mul:7, alwaysCrit:true, unlockLvl:48},
      shadow:      {name:'影遁',     icon:'👤', desc:'15秒攻击+50%', mp:50, type:'buff', buff:'shadowstep', duration:15000},
    },
      cloakOfShadows:{name:"暗影斗篷",icon:"🌑",desc:"12秒防御+30%",mp:30,type:"buff",buff:"evasion",duration:12000,unlockLvl:42},
      garrote:{name:"绞喉",icon:"🪢",desc:"5倍伤害,沉默3秒",mp:38,type:"dmg",mul:5,unlockLvl:58},

      throw:        {name:'致命投掷', icon:'🎯', desc:'4倍远程攻击', mp:25, type:'dmg', mul:4, unlockLvl:28},
      rupture:      {name:'割裂',     icon:'🩸', desc:'4倍攻击,持续流血', mp:32, type:'dmg', mul:4, dot:true, unlockLvl:50},
      deathMark:    {name:'死亡标记', icon:'☠️', desc:'8倍必暴终结技', mp:55, type:'dmg', mul:8, alwaysCrit:true, unlockLvl:70},
    trees:[
      {key:'assassination', name:'刺杀', icon:'🐍', masteryDesc:'毒刃持续伤害 +4%/精通', talents:[
        {key:'恶毒_yx0e', name:'恶毒', desc:'暴击 +1.5%/层', max:5, mod:{crit:1.5}},
        {key:'谋杀_m3cw', name:'谋杀', desc:'攻击 +2%/层', max:5, mod:{atkPct:2}},
        {key:'毒药专精_og6n', name:'毒药专精', desc:'暴伤 +8%/层', max:3, mod:{critdPct:8}},
        {key:'致命毒药_rx7b', name:'致命毒药', desc:'持续伤害 +5%/层', max:5, mod:{dotBonus:5}},
        {key:'暗影步_za55', name:'暗影步', desc:'技能CD +5%/层', max:3, mod:{cdReduction:5}},
        {key:'毒刃_rg3r', name:'毒刃', desc:'解锁: 毒刃', max:1, req:10, unlockSkill:'poison'},
        {key:'放血_m5bp', name:'放血', desc:'攻击 +3%/层', max:5, req:15, mod:{atkPct:3}},
        {key:'剧毒_v4hv', name:'剧毒', desc:'吸血 +2%/层 · 持续伤害 +4%/层', max:5, req:18, mod:{leech:2,dotBonus:4}},
        {key:'宿敌_68b9', name:'宿敌', desc:'暴伤 +8%/层 · 暴击 +1.5%/层', max:3, req:22, mod:{critdPct:8,crit:1.5}},
        {key:'刺客之道_6wkb', name:'刺客之道', desc:'斩杀加成 +5%/层 · 攻击 +2%/层', max:5, req:25, mod:{executeBonus:5,atkPct:2}},
        {key:'暗杀_42j5', name:'暗杀', desc:'暴伤 +10%/层 · 额外攻击 +2%/层', max:5, req:28, mod:{critdPct:10,extraAtk:2}},
        {key:'死亡标记_bu1r', name:'死亡标记', desc:'攻击 +3%/层 · 暴击 +2%/层', max:5, req:30, mod:{atkPct:3,crit:2}},
        {key:'毒药大师_jgpa', name:'毒药大师', desc:'持续伤害 +8%/层 · 技能CD +4%/层', max:3, req:33, mod:{dotBonus:8,cdReduction:4}},
        {key:'刺杀宗师_rwpy', name:'刺杀宗师', desc:'攻击 +2%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:4,mastery:2}}
      ,
{key:'tal_4gq2h5', name:'致命毒液', desc:'持续伤害 +8%/层 · 吸血 +3%/层', max:5,req:38,mod:{dotBonus:8,leech:3}},{key:'tal_er31mp', name:'暗杀大师', desc:'暴伤 +12%/层 · 斩杀加成 +5%/层', max:5,req:42,mod:{critdPct:12,executeBonus:5}},{key:'tal_za0dpi', name:'影舞者', desc:'攻击 +2%/层 · 暴击 +3%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:5,crit:3,mastery:2}}]},
      {key:'combat', name:'战斗', icon:'⚔️', masteryDesc:'背刺伤害 +3%/精通', talents:[
        {key:'双武器精通_uq2m', name:'双武器精通', desc:'攻速 +5%/层', max:5, mod:{spdPct:5}},
        {key:'精准_v1gb', name:'精准', desc:'敏捷 +5%/层', max:5, mod:{agiPct:5}},
        {key:'剑刃乱舞_h7qw', name:'剑刃乱舞', desc:'暴击 +2%/层', max:3, mod:{crit:2}},
        {key:'武器大师_4qz9', name:'武器大师', desc:'额外攻击 +2%/层', max:5, mod:{extraAtk:2}},
        {key:'还击_6dqu', name:'还击', desc:'反伤 +2%/层', max:3, mod:{reflectDmg:2}},
        {key:'背刺_27cb', name:'背刺', desc:'解锁: 背刺', max:1, req:10, unlockSkill:'backstab'},
        {key:'肾上腺素_4krm', name:'肾上腺素', desc:'攻速 +8%/层', max:5, req:15, mod:{spdPct:8}},
        {key:'无尽能量_wmpq', name:'无尽能量', desc:'技能CD +4%/层 · 暴击 +1.5%/层', max:5, req:18, mod:{cdReduction:4,crit:1.5}},
        {key:'剑刃冲锋_ln9o', name:'剑刃冲锋', desc:'攻击 +2%/层 · 攻速 +4%/层', max:3, req:22, mod:{atkPct:2,spdPct:4}},
        {key:'战斗狂热_ypmy', name:'战斗狂热', desc:'攻击 +2%/层 · 吸血 +2%/层', max:5, req:25, mod:{atkPct:2,leech:2}},
        {key:'致命打击_nc4p', name:'致命打击', desc:'暴伤 +8%/层 · 额外攻击 +3%/层', max:5, req:28, mod:{critdPct:8,extraAtk:3}},
        {key:'杀戮_0rw8', name:'杀戮', desc:'攻击 +3%/层 · 攻速 +4%/层', max:5, req:30, mod:{atkPct:3,spdPct:4}},
        {key:'战斗精通_qy0g', name:'战斗精通', desc:'技能CD +5%/层 · 减耗 +5%/层', max:3, req:33, mod:{cdReduction:5,costReduction:5}},
        {key:'战斗宗师_z8hj', name:'战斗宗师', desc:'攻击 +2%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:4,mastery:2}}
      ,
{key:'tal_8x4uoo', name:'利刃', desc:'额外攻击 +2%/层 · 攻速 +6%/层', max:5,req:38,mod:{extraAtk:5,spdPct:6}},{key:'tal_iki3mc', name:'战斗大师', desc:'攻击 +3%/层 · 暴伤 +8%/层', max:5,req:42,mod:{atkPct:3,critdPct:8}},{key:'tal_h7prev', name:'剑圣', desc:'攻击 +2%/层 · 技能CD +6%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:5,cdReduction:6,mastery:2}}]},
      {key:'subtlety', name:'敏锐', icon:'👤', masteryDesc:'影遁攻击加成 +5%/精通', talents:[
        {key:'机会_1w3o', name:'机会', desc:'暴伤 +8%/层', max:5, mod:{critdPct:8}},
        {key:'闪避_273f', name:'闪避', desc:'防御 +5%/层', max:5, mod:{defPct:5}},
        {key:'暗影之舞_8eb9', name:'暗影之舞', desc:'敏捷 +5%/层', max:3, mod:{agiPct:5}},
        {key:'暗影斗篷_pzzm', name:'暗影斗篷', desc:'全能 +3%/层', max:5, mod:{vers:3}},
        {key:'潜伏_bruu', name:'潜伏', desc:'技能CD +4%/层', max:3, mod:{cdReduction:4}},
        {key:'影遁_3u1p', name:'影遁', desc:'解锁: 影遁', max:1, req:10, unlockSkill:'shadow'},
        {key:'弱点_ae8r', name:'弱点', desc:'暴伤 +8%/层', max:5, req:15, mod:{critdPct:8}},
        {key:'暗夜之刃_de22', name:'暗夜之刃', desc:'攻击 +2%/层 · 敏捷 +4%/层', max:5, req:18, mod:{atkPct:2,agiPct:4}},
        {key:'深影_31zb', name:'深影', desc:'攻击 +2%/层 · 技能CD +3%/层', max:3, req:22, mod:{atkPct:2,cdReduction:3}},
        {key:'暗影步_hu73', name:'暗影步', desc:'攻速 +5%/层 · 额外攻击 +3%/层', max:5, req:25, mod:{spdPct:5,extraAtk:3}},
        {key:'暗影之击_zpfd', name:'暗影之击', desc:'攻击 +3%/层 · 暴伤 +6%/层', max:5, req:28, mod:{atkPct:3,critdPct:6}},
        {key:'黑暗_9tr5', name:'黑暗', desc:'攻击 +2%/层 · 暴击 +2%/层', max:5, req:30, mod:{atkPct:2,crit:2}},
        {key:'暗影大师_szx0', name:'暗影大师', desc:'斩杀加成 +6%/层 · 技能CD +4%/层', max:3, req:33, mod:{executeBonus:6,cdReduction:4}},
        {key:'敏锐宗师_r0wm', name:'敏锐宗师', desc:'攻击 +2%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:4,mastery:2}}
      ,
{key:'tal_d22q05', name:'影刃', desc:'攻击 +3%/层 · 斩杀加成 +5%/层', max:5,req:38,mod:{atkPct:3,executeBonus:5}},{key:'tal_sxtqtx', name:'暗杀大师', desc:'额外攻击 +2%/层 · 暴伤 +8%/层', max:5,req:42,mod:{extraAtk:5,critdPct:8}},{key:'tal_u69oap', name:'影舞者', desc:'攻击 +2%/层 · 全能 +6%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:5,vers:6,mastery:2}}]},
    ],
  },

  hunter: {
    name:'猎人', icon:'🏹', emoji:'🧝‍♂️', color:'#abd473',
    desc:'锁甲远程,与野兽伙伴并肩作战', primaryAttr:'敏捷',
    attackAttr:'agi', resource:'法力', resKey:'mp',
    baseAttrs:{str:10, agi:22, int:8, spi:10, sta:15},
    baseStats:{hpMax:65, mpMax:80, atk:7, def:4, crit:8, critd:155, spd:1.2, reg:1},
    skills:{
      interrupt:{name:"反制射击",icon:"🏹",desc:"打断BOSS施法,5秒CD",mp:15,type:"interrupt",cd:5,unlockLvl:1},
      arcaneShot:   {name:'奥术射击', icon:'🏹', desc:'2.5倍攻击', mp:15, type:'dmg', mul:2.5, unlockLvl:1,castTime:0},
      serpentSting: {name:'毒蛇钉刺', icon:'🐍', desc:'3倍攻击,持续中毒', mp:20, type:'dmg', mul:3, dot:true, unlockLvl:12,castTime:0},
      rapidFire:    {name:'急速射击', icon:'⚡', desc:'15秒攻速+60%', mp:35, type:'buff', buff:'rapidFire', duration:15000, unlockLvl:25,castTime:0},
      aimed:        {name:'瞄准射击', icon:'🎯', desc:'5倍攻击,必定暴击', mp:35, type:'dmg', mul:5, alwaysCrit:true,castTime:2.5},
      multi:        {name:'多重射击', icon:'🎯', desc:'4倍攻击', mp:30, type:'dmg', mul:4,castTime:0},
      killShot:     {name:'杀戮射击', icon:'💀', desc:'7倍攻击,残血斩杀', mp:42, type:'dmg', mul:7, unlockLvl:45,castTime:0},
      bestialWrath: {name:'狂野怒火', icon:'🦁', desc:'15秒攻击+40%', mp:50, type:'buff', buff:'bestial', duration:15000,castTime:0},
    },
      huntersMark:{name:"猎人印记",icon:"🎯",desc:"15秒降低敌人防御20%",mp:25,type:"dmg",mul:2,unlockLvl:40},
      barrage:{name:"弹幕射击",icon:"💥",desc:"6倍范围伤害",mp:48,type:"dmg",mul:6,unlockLvl:60},

      explosiveShot:{name:'爆炸射击', icon:'💥', desc:'4.5倍火焰伤害', mp:32, type:'dmg', mul:4.5, dot:true, unlockLvl:38,castTime:0},
      freezingTrap: {name:'冰冻陷阱', icon:'❄️', desc:'3倍攻击,冰冻减速', mp:25, type:'dmg', mul:3, slow:true, unlockLvl:52,castTime:0},
      stampede:     {name:'万兽奔腾', icon:'🐾', desc:'7倍攻击,兽群践踏', mp:58, type:'dmg', mul:7, unlockLvl:74,castTime:0},
    trees:[
      {key:'bm', name:'兽王', icon:'🦁', masteryDesc:'狂野怒火攻击加成 +5%/精通', talents:[
        {key:'野性精神_kuxe', name:'野性精神', desc:'攻击 +2%/层', max:5, mod:{atkPct:2}},
        {key:'狂热_c9j2', name:'狂热', desc:'攻速 +5%/层', max:5, mod:{spdPct:5}},
        {key:'兽群领袖_6n60', name:'兽群领袖', desc:'生命 +6%/层', max:3, mod:{hpPct:6}},
        {key:'凶暴野兽_vxml', name:'凶暴野兽', desc:'额外攻击 +2%/层', max:5, mod:{extraAtk:2}},
        {key:'灵魂兽_ox4v', name:'灵魂兽', desc:'吸血 +2%/层', max:3, mod:{leech:2}},
        {key:'狂野怒火_jho5', name:'狂野怒火', desc:'解锁: 狂野怒火', max:1, req:10, unlockSkill:'bestialWrath'},
        {key:'兽王_mpa1', name:'兽王', desc:'攻击 +3%/层', max:5, req:15, mod:{atkPct:3}},
        {key:'兽群之力_elhz', name:'兽群之力', desc:'攻速 +6%/层 · 攻击 +3%/层', max:5, req:18, mod:{spdPct:6,atkPct:1}},
        {key:'野性呼唤_z4zm', name:'野性呼唤', desc:'技能CD +5%/层 · 攻击 +2%/层', max:3, req:22, mod:{cdReduction:5,atkPct:2}},
        {key:'兽群_ds5h', name:'兽群', desc:'攻击 +2%/层 · 吸血 +2%/层', max:5, req:25, mod:{atkPct:2,leech:2}},
        {key:'凶暴_1761', name:'凶暴', desc:'暴伤 +8%/层 · 额外攻击 +3%/层', max:5, req:28, mod:{critdPct:8,extraAtk:3}},
        {key:'兽王之力_lugl', name:'兽王之力', desc:'攻击 +3%/层 · 暴击 +1.5%/层', max:5, req:30, mod:{atkPct:3,crit:1.5}},
        {key:'野兽大师_e4rr', name:'野兽大师', desc:'技能CD +5%/层 · 斩杀加成 +4%/层', max:3, req:33, mod:{cdReduction:5,executeBonus:4}},
        {key:'兽王宗师_l5ob', name:'兽王宗师', desc:'攻击 +2%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:4,mastery:2}}
      ,
{key:'tal_belq97', name:'兽群呼唤', desc:'攻击 +3%/层 · 额外攻击 +2%/层', max:5,req:38,mod:{atkPct:3,extraAtk:4}},{key:'tal_pr5je7', name:'万兽之王', desc:'敏捷 +8%/层 · 暴击 +3%/层', max:5,req:42,mod:{agiPct:8,crit:3}},{key:'tal_s5oa1w', name:'兽王至尊', desc:'攻击 +2%/层 · 吸血 +6%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:5,leech:6,mastery:2}}]},
      {key:'marks', name:'射击', icon:'🎯', masteryDesc:'瞄准射击暴伤 +6%/精通', talents:[
        {key:'致命射击_tspd', name:'致命射击', desc:'暴击 +1.5%/层', max:5, mod:{crit:1.5}},
        {key:'夺命射击_w4jc', name:'夺命射击', desc:'暴伤 +8%/层', max:5, mod:{critdPct:8}},
        {key:'穿透射击_19gc', name:'穿透射击', desc:'攻击 +2%/层', max:3, mod:{atkPct:2}},
        {key:'精确瞄准_69ig', name:'精确瞄准', desc:'额外攻击 +3%/层', max:5, mod:{extraAtk:3}},
        {key:'鹰眼_w2ji', name:'鹰眼', desc:'技能CD +4%/层', max:3, mod:{cdReduction:4}},
        {key:'瞄准射击_pdqq', name:'瞄准射击', desc:'解锁: 瞄准射击', max:1, req:10, unlockSkill:'aimed'},
        {key:'正中靶心_qm7b', name:'正中靶心', desc:'暴伤 +8%/层', max:5, req:15, mod:{critdPct:8}},
        {key:'狙击_1tn3', name:'狙击', desc:'攻击 +2%/层 · 暴击 +1.5%/层', max:5, req:18, mod:{atkPct:2,crit:1.5}},
        {key:'专注_79lf', name:'专注', desc:'攻速 +5%/层 · 减耗 +5%/层', max:3, req:22, mod:{spdPct:5,costReduction:5}},
        {key:'精确_63eb', name:'精确', desc:'攻击 +2%/层 · 暴伤 +5%/层', max:5, req:25, mod:{atkPct:2,critdPct:5}},
        {key:'远距射击_6oex', name:'远距射击', desc:'攻击 +3%/层 · 斩杀加成 +4%/层', max:5, req:28, mod:{atkPct:3,executeBonus:4}},
        {key:'神射手_ekaa', name:'神射手', desc:'暴伤 +10%/层 · 技能CD +3%/层', max:5, req:30, mod:{critdPct:10,cdReduction:3}},
        {key:'射击大师_ws7s', name:'射击大师', desc:'额外攻击 +2%/层 · 暴击 +2%/层', max:3, req:33, mod:{extraAtk:4,crit:2}},
        {key:'射击宗师_rqg8', name:'射击宗师', desc:'攻击 +2%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:4,mastery:2}}
      ,
{key:'tal_nz9rg3', name:'鹰眼', desc:'攻击 +3%/层 · 暴击 +2%/层', max:5,req:38,mod:{atkPct:3,crit:2}},{key:'tal_lz5es2', name:'神射手', desc:'暴伤 +12%/层 · 斩杀加成 +5%/层', max:5,req:42,mod:{critdPct:12,executeBonus:5}},{key:'tal_h72z0v', name:'箭神', desc:'攻击 +2%/层 · 额外攻击 +2%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:5,extraAtk:6,mastery:2}}]},
      {key:'survival', name:'生存', icon:'🪤', masteryDesc:'多重射击伤害 +3%/精通', talents:[
        {key:'求生专家_elwa', name:'求生专家', desc:'生命 +5%/层', max:5, mod:{hpPct:5}},
        {key:'野蛮_h6at', name:'野蛮', desc:'敏捷 +5%/层', max:5, mod:{agiPct:5}},
        {key:'陷阱专家_fqyo', name:'陷阱专家', desc:'防御 +6%/层', max:3, mod:{defPct:6}},
        {key:'钢陷阱_pwhk', name:'钢陷阱', desc:'全能 +2.5%/层', max:5, mod:{vers:2.5}},
        {key:'生存本能_d5ka', name:'生存本能', desc:'反伤 +2%/层', max:3, mod:{reflectDmg:2}},
        {key:'多重射击_mv08', name:'多重射击', desc:'解锁: 多重射击', max:1, req:10, unlockSkill:'multi'},
        {key:'独狼_40l8', name:'独狼', desc:'攻速 +8%/层', max:5, req:15, mod:{spdPct:8}},
        {key:'野火_a47o', name:'野火', desc:'攻击 +2%/层 · 吸血 +2%/层', max:5, req:18, mod:{atkPct:2,leech:2}},
        {key:'陷阱大师_cmzh', name:'陷阱大师', desc:'全能 +3%/层 · 持续伤害 +4%/层', max:3, req:22, mod:{vers:3,dotBonus:4}},
        {key:'生存专家_0dk2', name:'生存专家', desc:'生命 +5%/层 · 防御 +4%/层', max:5, req:25, mod:{hpPct:5,defPct:4}},
        {key:'猎手_cuzg', name:'猎手', desc:'攻击 +2%/层 · 斩杀加成 +4%/层', max:5, req:28, mod:{atkPct:2,executeBonus:4}},
        {key:'荒野_4uzv', name:'荒野', desc:'生命 +6%/层 · 攻击 +2%/层', max:5, req:30, mod:{hpPct:6,atkPct:2}},
        {key:'生存大师_kg8s', name:'生存大师', desc:'反伤 +4%/层 · 全能 +3%/层', max:3, req:33, mod:{reflectDmg:4,vers:3}},
        {key:'生存宗师_xi9p', name:'生存宗师', desc:'攻击 +2%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:4,mastery:2}}
      ,
{key:'tal_5u8399', name:'荒野求生', desc:'生命 +8%/层 · 全能 +4%/层', max:5,req:38,mod:{hpPct:8,vers:4}},{key:'tal_20kiyb', name:'陷阱之王', desc:'攻击 +3%/层 · 反伤 +4%/层', max:5,req:42,mod:{atkPct:3,reflectDmg:4}},{key:'tal_yhyekb', name:'生存至尊', desc:'攻击 +2%/层 · 防御 +8%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:5,defPct:8,mastery:2}}]},
    ],
  },

  shaman: {
    name:'萨满', icon:'🔱', emoji:'🧙‍♀️', color:'#0070de',
    desc:'锁甲元素使,与天地之力共鸣', primaryAttr:'智力',
    attackAttr:'int', resource:'法力', resKey:'mp',
    baseAttrs:{str:14, agi:12, int:18, spi:14, sta:14},
    baseStats:{hpMax:65, mpMax:85, atk:7, def:4, crit:6, critd:150, spd:1.0, reg:2},
    skills:{
      interrupt:{name:"风剪",icon:"💨",desc:"打断BOSS施法,5秒CD",mp:12,type:"interrupt",cd:5,unlockLvl:1},
      lightning:      {name:'闪电箭', icon:'⚡', desc:'3倍攻击', mp:20, type:'dmg', mul:3, unlockLvl:1,castTime:2},
      flameShock:     {name:'烈焰震击',icon:'🔥', desc:'3倍攻击,持续灼烧', mp:22, type:'dmg', mul:3, dot:true, unlockLvl:14,castTime:0},
      earthShield:    {name:'大地之盾',icon:'🪨', desc:'15秒防御+50%', mp:35, type:'buff', buff:'earthShield', duration:15000, unlockLvl:28,castTime:0},
      chainLightning: {name:'闪电链', icon:'🌩️', desc:'4.5倍攻击', mp:35, type:'dmg', mul:4.5,castTime:2},
      healingWave:    {name:'治疗波', icon:'🌊', desc:'恢复35%生命', mp:30, type:'heal', heal:0.35,castTime:2.5},
      bloodlust:      {name:'嗜血',   icon:'🩸', desc:'15秒攻速+70%', mp:55, type:'buff', buff:'bloodlust', duration:15000, unlockLvl:46,castTime:0},
      windfury:       {name:'风怒武器',icon:'💨', desc:'15秒攻速+60%', mp:50, type:'buff', buff:'windfury', duration:15000,castTime:0},
    },
      hex:{name:"妖术",icon:"🐸",desc:"4倍伤害,变形减速",mp:32,type:"dmg",mul:4,slow:true,unlockLvl:42},
      earthquake:{name:"地震术",icon:"🌍",desc:"6倍范围伤害+减速",mp:50,type:"dmg",mul:6,slow:true,unlockLvl:58},

      lavaBurst:    {name:'熔岩爆裂', icon:'🌋', desc:'6倍火焰伤害,必暴', mp:42, type:'dmg', mul:6, alwaysCrit:true, unlockLvl:38,castTime:2},
      spiritLink:   {name:'灵魂链接', icon:'🔗', desc:'恢复30%生命,15秒减伤30%', mp:50, type:'heal', heal:0.3, unlockLvl:54,castTime:0},
      thunderstorm: {name:'雷霆风暴', icon:'⛈️', desc:'7倍自然伤害', mp:58, type:'dmg', mul:7, unlockLvl:73,castTime:2},
    trees:[
      {key:'element', name:'元素', icon:'⚡', masteryDesc:'闪电链伤害 +4%/精通', talents:[
        {key:'元素专精_fgqo', name:'元素专精', desc:'智力 +5%/层', max:5, mod:{intPct:5}},
        {key:'元素之怒_55mh', name:'元素之怒', desc:'暴伤 +8%/层', max:5, mod:{critdPct:8}},
        {key:'回响_4yt4', name:'回响', desc:'攻速 +5%/层', max:3, mod:{spdPct:5}},
        {key:'风暴之眼_tj2t', name:'风暴之眼', desc:'额外攻击 +2%/层', max:5, mod:{extraAtk:2}},
        {key:'元素掌握_5s91', name:'元素掌握', desc:'技能CD +4%/层', max:3, mod:{cdReduction:4}},
        {key:'闪电链_f5nb', name:'闪电链', desc:'解锁: 闪电链', max:1, req:10, unlockSkill:'chainLightning'},
        {key:'升腾_tp00', name:'升腾', desc:'攻击 +3%/层', max:5, req:15, mod:{atkPct:3}},
        {key:'风暴守护者_icnc', name:'风暴守护者', desc:'暴击 +1.5%/层 · 技能CD +3%/层', max:5, req:18, mod:{crit:1.5,cdReduction:3}},
        {key:'原始之力_14gr', name:'原始之力', desc:'攻击 +2%/层 · 智力 +3%/层', max:3, req:22, mod:{atkPct:2,intPct:3}},
        {key:'过载_64ei', name:'过载', desc:'攻击 +2%/层 · 暴伤 +5%/层', max:5, req:25, mod:{atkPct:2,critdPct:5}},
        {key:'闪电奔涌_4thr', name:'闪电奔涌', desc:'暴击 +2%/层 · 攻速 +4%/层', max:5, req:28, mod:{crit:2,spdPct:4}},
        {key:'元素之力_8obu', name:'元素之力', desc:'攻击 +3%/层 · 额外攻击 +3%/层', max:5, req:30, mod:{atkPct:3,extraAtk:3}},
        {key:'风暴_kx6t', name:'风暴', desc:'技能CD +5%/层 · 减耗 +5%/层', max:3, req:33, mod:{cdReduction:5,costReduction:5}},
        {key:'元素宗师_97ag', name:'元素宗师', desc:'攻击 +2%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:4,mastery:2}}
      ,
{key:'tal_mo6x3r', name:'雷霆之怒', desc:'攻击 +3%/层 · 技能CD +5%/层', max:5,req:38,mod:{atkPct:3,cdReduction:5}},{key:'tal_z1lero', name:'元素掌控', desc:'暴伤 +12%/层 · 额外攻击 +2%/层', max:5,req:42,mod:{critdPct:12,extraAtk:4}},{key:'tal_2kpfcs', name:'元素领主', desc:'攻击 +2%/层 · 减耗 +8%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:5,costReduction:8,mastery:2}}]},
      {key:'enhancement', name:'增强', icon:'💨', masteryDesc:'风怒武器攻速加成 +6%/精通', talents:[
        {key:'武器专精_wx6r', name:'武器专精', desc:'攻击 +2%/层', max:5, mod:{atkPct:2}},
        {key:'怒火_x06t', name:'怒火', desc:'攻速 +5%/层', max:5, mod:{spdPct:5}},
        {key:'静电_rqij', name:'静电', desc:'暴击 +2%/层', max:3, mod:{crit:2}},
        {key:'毁灭之风_oz70', name:'毁灭之风', desc:'额外攻击 +3%/层', max:5, mod:{extraAtk:3}},
        {key:'风暴之力_6wd5', name:'风暴之力', desc:'技能CD +4%/层', max:3, mod:{cdReduction:4}},
        {key:'风怒武器_jjta', name:'风怒武器', desc:'解锁: 风怒武器', max:1, req:10, unlockSkill:'windfury'},
        {key:'漩涡之力_r509', name:'漩涡之力', desc:'攻击 +3%/层', max:5, req:15, mod:{atkPct:3}},
        {key:'风暴之怒_g93o', name:'风暴之怒', desc:'攻速 +5%/层 · 攻击 +3%/层', max:5, req:18, mod:{spdPct:5,atkPct:1}},
        {key:'闪电打击_j65p', name:'闪电打击', desc:'暴击 +2%/层 · 技能CD +3%/层', max:3, req:22, mod:{crit:2,cdReduction:3}},
        {key:'元素武器_bm2r', name:'元素武器', desc:'攻击 +2%/层 · 吸血 +2%/层', max:5, req:25, mod:{atkPct:2,leech:2}},
        {key:'风怒_ctkt', name:'风怒', desc:'攻速 +7%/层 · 额外攻击 +2%/层', max:5, req:28, mod:{spdPct:7,extraAtk:2}},
        {key:'漩涡_26cn', name:'漩涡', desc:'攻击 +3%/层 · 暴伤 +5%/层', max:5, req:30, mod:{atkPct:3,critdPct:5}},
        {key:'增强大师_8hsm', name:'增强大师', desc:'技能CD +5%/层 · 减耗 +4%/层', max:3, req:33, mod:{cdReduction:5,costReduction:4}},
        {key:'增强宗师_7xq2', name:'增强宗师', desc:'攻击 +2%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:4,mastery:2}}
      ,
{key:'tal_r11ajl', name:'风暴', desc:'攻速 +8%/层 · 额外攻击 +2%/层', max:5,req:38,mod:{spdPct:8,extraAtk:4}},{key:'tal_8s2vb6', name:'狂怒风暴', desc:'攻击 +3%/层 · 暴击 +3%/层', max:5,req:42,mod:{atkPct:3,crit:3}},{key:'tal_hr0iny', name:'风暴领主', desc:'攻击 +2%/层 · 技能CD +6%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:5,cdReduction:6,mastery:2}}]},
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
        {key:'恢复大师_m48a', name:'恢复大师', desc:'技能CD +5%/层 · 治疗 +5%/层', max:3, req:33, mod:{cdReduction:5,healBonus:5}},
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
      interrupt:{name:"责难",icon:"⚖️",desc:"打断BOSS施法,5秒CD",mp:15,type:"interrupt",cd:5,unlockLvl:1},
      judgement:    {name:'审判',       icon:'⚖️', desc:'2.5倍神圣伤害', mp:20, type:'dmg', mul:2.5, unlockLvl:1,castTime:0},
      consecration: {name:'奉献',       icon:'🔥', desc:'3倍攻击,范围圣光', mp:25, type:'dmg', mul:3, unlockLvl:12,castTime:0},
      holyLight:    {name:'圣光术',     icon:'✨', desc:'恢复40%生命', mp:35, type:'heal', heal:0.4,castTime:2.5},
      crusader:     {name:'十字军打击', icon:'⚔️', desc:'4倍攻击,必定暴击', mp:30, type:'dmg', mul:4, alwaysCrit:true,castTime:0},
      blessingKings:{name:'王者祝福',   icon:'👑', desc:'15秒全属性+20%', mp:45, type:'buff', buff:'kings', duration:15000, unlockLvl:34,castTime:0},
      avengingWrath:{name:'复仇之怒',   icon:'😇', desc:'15秒攻击+50%', mp:50, type:'buff', buff:'bestial', duration:15000, unlockLvl:46,castTime:0},
      divineShield: {name:'圣盾术',     icon:'🛡️', desc:'15秒减伤80%', mp:60, type:'buff', buff:'divine', duration:15000,castTime:0},
    },
      hammerOfRighteous:{name:"正义之锤",icon:"🔨",desc:"4倍远程神圣伤害",mp:30,type:"dmg",mul:4,unlockLvl:44},
      flashOfLight:{name:"圣光闪现",icon:"💫",desc:"恢复25%生命",mp:25,type:"heal",heal:0.25,unlockLvl:55},

      holyWrath:    {name:'神圣愤怒', icon:'😡', desc:'4倍范围神圣伤害', mp:32, type:'dmg', mul:4, unlockLvl:30,castTime:0},
      sacredShield: {name:'圣洁护盾', icon:'💠', desc:'15秒减伤40%,回复+5/秒', mp:45, type:'buff', buff:'sacredShield', duration:15000, unlockLvl:54,castTime:0},
      seraphim:     {name:'炽天使',   icon:'👼', desc:'15秒攻击+60%,全能+10%', mp:65, type:'buff', buff:'seraphim', duration:15000, unlockLvl:76,castTime:0},
    trees:[
      {key:'holy', name:'神圣', icon:'✨', masteryDesc:'圣光术回复量 +5%/精通', talents:[
        {key:'illumination',name:'光明',     desc:'精神 +5%/层', max:5, mod:{spiPct:5}},
        {key:'divinity',    name:'神性',     desc:'智力 +5%/层', max:5, mod:{intPct:5}},
        {key:'sanctified',  name:'圣化',     desc:'回复 +2/层', max:3, mod:{regFlat:2}},
        {key:'hlUnlock',    name:'圣光术',   desc:'解锁: 圣光术', max:1, req:10, unlockSkill:'holyLight'},
        {key:'beacon',      name:'圣光信标', desc:'生命 +8%/层', max:3, req:15, mod:{hpPct:8}},

	        {key:'maelstrom2',name:'风暴之力',desc:'暴击+2%/层', max:3, req:18, mod:{crit:2}},
	        {key:'windfury2',name:'风暴之怒',desc:'攻速+6%/层,攻击+4%/层', max:3, req:22, mod:{spdPct:6,atkPct:2}},
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
        {key:'复仇_vhng', name:'复仇', desc:'攻击 +2%/层', max:5, mod:{atkPct:2}},
        {key:'圣洁_d4ul', name:'圣洁', desc:'暴伤 +8%/层', max:5, mod:{critdPct:8}},
        {key:'狂热_tq6y', name:'狂热', desc:'攻速 +5%/层', max:3, mod:{spdPct:5}},
        {key:'审判官_x8uo', name:'审判官', desc:'额外攻击 +2%/层', max:5, mod:{extraAtk:2}},
        {key:'圣战_554n', name:'圣战', desc:'技能CD +4%/层', max:3, mod:{cdReduction:4}},
        {key:'十字军打击_eeqv', name:'十字军打击', desc:'解锁: 十字军打击', max:1, req:10, unlockSkill:'crusader'},
        {key:'圣殿骑士_erj9', name:'圣殿骑士', desc:'攻击 +3%/层', max:5, req:15, mod:{atkPct:3}},
        {key:'神圣风暴_gg1s', name:'神圣风暴', desc:'攻击 +2%/层 · 攻速 +4%/层', max:5, req:18, mod:{atkPct:2,spdPct:4}},
        {key:'行刑者_49sa', name:'行刑者', desc:'斩杀加成 +5%/层 · 暴击 +1.5%/层', max:3, req:22, mod:{executeBonus:5,crit:1.5}},
        {key:'神圣之力_qr4h', name:'神圣之力', desc:'攻击 +2%/层 · 暴伤 +5%/层', max:5, req:25, mod:{atkPct:2,critdPct:5}},
        {key:'圣光之刃_3unr', name:'圣光之刃', desc:'攻击 +3%/层 · 暴击 +1.5%/层', max:5, req:28, mod:{atkPct:3,crit:1.5}},
        {key:'黎明_g4ek', name:'黎明', desc:'攻击 +2%/层 · 额外攻击 +3%/层', max:5, req:30, mod:{atkPct:2,extraAtk:3}},
        {key:'惩戒大师_psyh', name:'惩戒大师', desc:'技能CD +5%/层 · 斩杀加成 +4%/层', max:3, req:33, mod:{cdReduction:5,executeBonus:4}},
        {key:'惩戒宗师_c3xi', name:'惩戒宗师', desc:'攻击 +2%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:4,mastery:2}}
      ,
{key:'tal_v97irx', name:'神圣复仇', desc:'攻击 +3%/层 · 暴伤 +6%/层', max:5,req:38,mod:{atkPct:3,critdPct:6}},{key:'tal_j4xnxx', name:'圣光之怒', desc:'额外攻击 +2%/层 · 斩杀加成 +5%/层', max:5,req:42,mod:{extraAtk:5,executeBonus:5}},{key:'tal_6df7gn', name:'复仇天使', desc:'攻击 +2%/层 · 暴击 +3%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:5,crit:3,mastery:2}}]},
    ],
  },

  warlock: {
    name:'术士', icon:'💀', emoji:'🧛', color:'#9482c9',
    desc:'布甲邪能使,以痛苦为食', primaryAttr:'智力',
    attackAttr:'int', resource:'法力', resKey:'mp',
    baseAttrs:{str:7, agi:9, int:22, spi:14, sta:13},
    baseStats:{hpMax:55, mpMax:90, atk:6, def:2, crit:7, critd:150, spd:1.0, reg:2},
    skills:{
      interrupt:{name:"法术封锁",icon:"🔇",desc:"打断BOSS施法,5秒CD",mp:12,type:"interrupt",cd:5,unlockLvl:1},
      shadowBolt: {name:'暗影箭',   icon:'🌑', desc:'3倍攻击', mp:20, type:'dmg', mul:3, unlockLvl:1,castTime:2.5},
      immolate:   {name:'献祭',     icon:'🔥', desc:'3倍攻击,持续灼烧', mp:22, type:'dmg', mul:3, dot:true, unlockLvl:12,castTime:1.5},
      corruption: {name:'腐蚀术',   icon:'🧿', desc:'4倍攻击,持续腐蚀', mp:25, type:'dmg', mul:4, dot:true,castTime:0},
      drainLife:  {name:'生命分流', icon:'🩸', desc:'5倍攻击,吸血80%', mp:40, type:'dmg', mul:5, lifeSteal:0.8,castTime:2},
      fear:       {name:'恐惧',     icon:'👁️', desc:'4倍攻击,降低敌人攻速', mp:28, type:'dmg', mul:4, slow:true, unlockLvl:28,castTime:1.5},
      chaosBolt:  {name:'混乱之箭', icon:'☄️', desc:'8倍攻击,无视防御', mp:55, type:'dmg', mul:8, alwaysCrit:true, unlockLvl:48,castTime:3},
      incinerate: {name:'烧尽',     icon:'🔥', desc:'6倍攻击伤害', mp:50, type:'dmg', mul:6,castTime:2},
    },
      shadowFury:{name:"暗影之怒",icon:"💢",desc:"5倍范围伤害+减速",mp:42,type:"dmg",mul:5,slow:true,unlockLvl:44},
      soulFire:{name:"灵魂之火",icon:"💀",desc:"8倍伤害,必暴",mp:55,type:"dmg",mul:8,alwaysCrit:true,unlockLvl:62},

      unstableAffliction:{name:'痛苦无常',icon:'💜', desc:'5倍攻击,持续痛苦', mp:38, type:'dmg', mul:5, dot:true, unlockLvl:36,castTime:1.5},
      inferno:      {name:'召唤地狱火',icon:'🔥', desc:'7倍范围火焰伤害', mp:55, type:'dmg', mul:7, unlockLvl:58,castTime:2.5},
      metamorphosis:{name:'恶魔变身', icon:'😈', desc:'20秒攻击+50%,吸血+15%', mp:70, type:'buff', buff:'demonForm', duration:20000, unlockLvl:78,castTime:0},
    trees:[
      {key:'affliction', name:'痛苦', icon:'🧿', masteryDesc:'腐蚀术持续伤害 +5%/精通', talents:[
        {key:'苦痛_rf1z', name:'苦痛', desc:'攻击 +2%/层', max:5, mod:{atkPct:2}},
        {key:'黑暗契约_pfkb', name:'黑暗契约', desc:'智力 +5%/层', max:5, mod:{intPct:5}},
        {key:'瘟疫蔓延_tigp', name:'瘟疫蔓延', desc:'暴击 +1.5%/层', max:3, mod:{crit:1.5}},
        {key:'鬼影缠身_ra3d', name:'鬼影缠身', desc:'持续伤害 +5%/层', max:5, mod:{dotBonus:5}},
        {key:'灵魂虹吸_swlw', name:'灵魂虹吸', desc:'吸血 +2%/层', max:3, mod:{leech:2}},
        {key:'腐蚀术_any9', name:'腐蚀术', desc:'解锁: 腐蚀术', max:1, req:10, unlockSkill:'corruption'},
        {key:'痛苦无常_g3z5', name:'痛苦无常', desc:'攻击 +3%/层', max:5, req:15, mod:{atkPct:3}},
        {key:'无尽痛苦_h7bz', name:'无尽痛苦', desc:'持续伤害 +6%/层 · 技能CD +3%/层', max:5, req:18, mod:{dotBonus:6,cdReduction:3}},
        {key:'灵魂交换_czti', name:'灵魂交换', desc:'暴伤 +8%/层 · 智力 +3%/层', max:3, req:22, mod:{critdPct:8,intPct:3}},
        {key:'苦痛_154n', name:'苦痛', desc:'攻击 +2%/层 · 持续伤害 +4%/层', max:5, req:25, mod:{atkPct:2,dotBonus:4}},
        {key:'瘟疫_j23m', name:'瘟疫', desc:'持续伤害 +7%/层 · 斩杀加成 +3%/层', max:5, req:28, mod:{dotBonus:7,executeBonus:3}},
        {key:'诅咒_p59u', name:'诅咒', desc:'攻击 +3%/层 · 暴击 +1.5%/层', max:5, req:30, mod:{atkPct:3,crit:1.5}},
        {key:'痛苦大师_xv69', name:'痛苦大师', desc:'持续伤害 +8%/层 · 吸血 +3%/层', max:3, req:33, mod:{dotBonus:8,leech:3}},
        {key:'痛苦宗师_06z2', name:'痛苦宗师', desc:'攻击 +2%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:4,mastery:2}}
      ,
{key:'tal_10ra21', name:'无尽痛苦', desc:'持续伤害 +8%/层 · 吸血 +4%/层', max:5,req:38,mod:{dotBonus:8,leech:4}},{key:'tal_jix3v7', name:'灵魂凋零', desc:'攻击 +3%/层 · 斩杀加成 +5%/层', max:5,req:42,mod:{atkPct:3,executeBonus:5}},{key:'tal_980cwe', name:'痛苦之王', desc:'攻击 +2%/层 · 持续伤害 +10%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:5,dotBonus:10,mastery:2}}]},
      {key:'demonology', name:'恶魔学识', icon:'😈', masteryDesc:'生命分流吸血效果 +6%/精通', talents:[
        {key:'法力之源_vri6', name:'法力之源', desc:'生命 +4%/层', max:5, mod:{hpPct:4}},
        {key:'恶魔之拥_8xij', name:'恶魔之拥', desc:'生命 +5%/层', max:5, mod:{hpPct:5}},
        {key:'邪甲术_03th', name:'邪甲术', desc:'防御 +6%/层', max:3, mod:{defPct:6}},
        {key:'强化恶魔_lv28', name:'强化恶魔', desc:'攻击 +2%/层', max:5, mod:{atkPct:2}},
        {key:'恶魔皮肤_z5xt', name:'恶魔皮肤', desc:'反伤 +2%/层', max:3, mod:{reflectDmg:2}},
        {key:'生命分流_sdc7', name:'生命分流', desc:'解锁: 生命分流', max:1, req:10, unlockSkill:'drainLife'},
        {key:'恶魔变形_ao5c', name:'恶魔变形', desc:'攻击 +3%/层', max:5, req:15, mod:{atkPct:3}},
        {key:'小鬼成群_85l6', name:'小鬼成群', desc:'攻速 +4%/层 · 攻击 +3%/层', max:5, req:18, mod:{spdPct:4,atkPct:1}},
        {key:'灵魂链接_e01b', name:'灵魂链接', desc:'生命 +5%/层 · 吸血 +2%/层', max:3, req:22, mod:{hpPct:5,leech:2}},
        {key:'邪能领主_ko0x', name:'邪能领主', desc:'攻击 +2%/层 · 全能 +2%/层', max:5, req:25, mod:{atkPct:2,vers:2}},
        {key:'恶魔之力_93ih', name:'恶魔之力', desc:'攻击 +3%/层 · 吸血 +2%/层', max:5, req:28, mod:{atkPct:3,leech:2}},
        {key:'黑暗_da7r', name:'黑暗', desc:'生命 +6%/层 · 攻击 +2%/层', max:5, req:30, mod:{hpPct:6,atkPct:2}},
        {key:'恶魔大师_u7up', name:'恶魔大师', desc:'反伤 +4%/层 · 技能CD +3%/层', max:3, req:33, mod:{reflectDmg:4,cdReduction:3}},
        {key:'恶魔宗师_w3lg', name:'恶魔宗师', desc:'攻击 +2%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:4,mastery:2}}
      ,
{key:'tal_ymsi4c', name:'恶魔军团', desc:'攻击 +3%/层 · 攻速 +5%/层', max:5,req:38,mod:{atkPct:3,spdPct:5}},{key:'tal_kt8luu', name:'邪能', desc:'生命 +8%/层 · 反伤 +5%/层', max:5,req:42,mod:{hpPct:8,reflectDmg:5}},{key:'tal_frgmc2', name:'恶魔之王', desc:'攻击 +2%/层 · 吸血 +6%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:5,leech:6,mastery:2}}]},
      {key:'destruction', name:'毁灭', icon:'🔥', masteryDesc:'烧尽伤害 +3%/精通', talents:[
        {key:'毁灭专精_cqof', name:'毁灭专精', desc:'暴击 +1.5%/层', max:5, mod:{crit:1.5}},
        {key:'毁灭_b9eu', name:'毁灭', desc:'暴伤 +8%/层', max:5, mod:{critdPct:8}},
        {key:'爆燃_q33b', name:'爆燃', desc:'攻速 +5%/层', max:3, mod:{spdPct:5}},
        {key:'余烬风暴_6dz6', name:'余烬风暴', desc:'额外攻击 +2%/层', max:5, mod:{extraAtk:2}},
        {key:'火焰之雨_qu0x', name:'火焰之雨', desc:'技能CD +4%/层', max:3, mod:{cdReduction:4}},
        {key:'烧尽_9vg7', name:'烧尽', desc:'解锁: 烧尽', max:1, req:10, unlockSkill:'incinerate'},
        {key:'浩劫_t70a', name:'浩劫', desc:'攻击 +3%/层', max:5, req:15, mod:{atkPct:3}},
        {key:'毁灭烈焰_mf6z', name:'毁灭烈焰', desc:'暴伤 +8%/层 · 攻击 +3%/层', max:5, req:18, mod:{critdPct:8,atkPct:1}},
        {key:'大灾变_s7bc', name:'大灾变', desc:'攻击 +2%/层 · 减耗 +5%/层', max:3, req:22, mod:{atkPct:2,costReduction:5}},
        {key:'混沌_35iu', name:'混沌', desc:'暴伤 +8%/层 · 技能CD +3%/层', max:5, req:25, mod:{critdPct:8,cdReduction:3}},
        {key:'火雨_vd37', name:'火雨', desc:'攻击 +3%/层 · 额外攻击 +2%/层', max:5, req:28, mod:{atkPct:3,extraAtk:2}},
        {key:'末日_xdn3', name:'末日', desc:'攻击 +2%/层 · 斩杀加成 +5%/层', max:5, req:30, mod:{atkPct:2,executeBonus:5}},
        {key:'毁灭大师_hocz', name:'毁灭大师', desc:'技能CD +5%/层 · 暴击 +2%/层', max:3, req:33, mod:{cdReduction:5,crit:2}},
        {key:'毁灭宗师_g5ki', name:'毁灭宗师', desc:'攻击 +2%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:4,mastery:2}}
      ,
{key:'tal_b7fe6p', name:'混沌之雨', desc:'攻击 +3%/层 · 暴伤 +6%/层', max:5,req:38,mod:{atkPct:3,critdPct:6}},{key:'tal_4qj3im', name:'末日降临', desc:'斩杀加成 +8%/层 · 技能CD +5%/层', max:5,req:42,mod:{executeBonus:8,cdReduction:5}},{key:'tal_hw275i', name:'毁灭之王', desc:'攻击 +2%/层 · 暴击 +4%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:5,crit:4,mastery:2}}]},
    ],
  },

  druid: {
    name:'德鲁伊', icon:'🐻', emoji:'🐺', color:'#ff7d0a',
    desc:'皮甲变形者,自然的守护者', primaryAttr:'敏捷',
    attackAttr:'agi', resource:'法力', resKey:'mp',
    baseAttrs:{str:14, agi:16, int:14, spi:13, sta:14},
    baseStats:{hpMax:65, mpMax:85, atk:7, def:4, crit:7, critd:150, spd:1.1, reg:2},
    skills:{
      interrupt:{name:"日光术",icon:"☀️",desc:"打断BOSS施法,5秒CD",mp:12,type:"interrupt",cd:5,unlockLvl:1},
      wrath:       {name:'愤怒',     icon:'🌿', desc:'2.5倍自然伤害', mp:15, type:'dmg', mul:2.5, unlockLvl:1,castTime:1.5},
      swipe:       {name:'横扫',     icon:'🐾', desc:'2.5倍攻击范围伤害', mp:22, type:'dmg', mul:2.5, unlockLvl:12,castTime:0},
      rejuvenation:{name:'回春术',   icon:'🍃', desc:'恢复35%生命', mp:28, type:'heal', heal:0.35, unlockLvl:22,castTime:0},
      moonfire:    {name:'月火术',   icon:'🌙', desc:'4倍攻击,持续灼烧', mp:25, type:'dmg', mul:4, dot:true,castTime:0},
      bite:        {name:'凶猛撕咬', icon:'🦷', desc:'5倍攻击,必定暴击', mp:35, type:'dmg', mul:5, alwaysCrit:true,castTime:0},
      berserk:     {name:'狂暴',     icon:'💢', desc:'15秒攻击+40%攻速+30%', mp:50, type:'buff', buff:'berserk', duration:15000, unlockLvl:44,castTime:0},
      barkskin:    {name:'树皮术',   icon:'🪵', desc:'15秒减伤60%', mp:50, type:'buff', buff:'bark', duration:15000,castTime:0},
    },
      starfire:{name:"星火术",icon:"⭐",desc:"6倍奥术伤害,2.5秒读条",mp:45,type:"dmg",mul:6,castTime:2.5,unlockLvl:40},
      wildGrowth:{name:"野性成长",icon:"🌺",desc:"恢复30%生命",mp:35,type:"heal",heal:0.3,unlockLvl:55},

      entanglingRoots:{name:'纠缠根须',icon:'🌿', desc:'3倍自然伤害,缠绕减速', mp:28, type:'dmg', mul:3, slow:true, unlockLvl:32,castTime:1.5},
      hurricane:    {name:'飓风',     icon:'🌀', desc:'5倍自然范围伤害', mp:48, type:'dmg', mul:5, unlockLvl:56,castTime:2},
      tranquility:  {name:'宁静',     icon:'🌟', desc:'恢复45%生命', mp:58, type:'heal', heal:0.45, unlockLvl:74,castTime:2.5},
    trees:[
      {key:'balance', name:'平衡', icon:'🌙', masteryDesc:'月火术持续伤害 +4%/精通', talents:[
        {key:'月辉_w12f', name:'月辉', desc:'智力 +5%/层', max:5, mod:{intPct:5}},
        {key:'自然之握_0jxw', name:'自然之握', desc:'暴击 +1.5%/层', max:5, mod:{crit:1.5}},
        {key:'日月之蚀_v65a', name:'日月之蚀', desc:'暴伤 +8%/层', max:3, mod:{critdPct:8}},
        {key:'星辰耀斑_pd4e', name:'星辰耀斑', desc:'持续伤害 +5%/层', max:5, mod:{dotBonus:5}},
        {key:'繁星_eh0f', name:'繁星', desc:'技能CD +4%/层', max:3, mod:{cdReduction:4}},
        {key:'月火术_25hh', name:'月火术', desc:'解锁: 月火术', max:1, req:10, unlockSkill:'moonfire'},
        {key:'星辰坠落_4ilg', name:'星辰坠落', desc:'攻击 +3%/层', max:5, req:15, mod:{atkPct:3}},
        {key:'月火之雨_jaxm', name:'月火之雨', desc:'攻击 +2%/层 · 智力 +3%/层', max:5, req:18, mod:{atkPct:2,intPct:3}},
        {key:'天体_nrrx', name:'天体', desc:'攻击 +2%/层 · 技能CD +3%/层', max:3, req:22, mod:{atkPct:2,cdReduction:3}},
        {key:'自然之力_se1j', name:'自然之力', desc:'持续伤害 +6%/层 · 攻速 +3%/层', max:5, req:25, mod:{dotBonus:6,spdPct:3}},
        {key:'星辰_p1jw', name:'星辰', desc:'攻击 +3%/层 · 暴伤 +5%/层', max:5, req:28, mod:{atkPct:3,critdPct:5}},
        {key:'宇宙_l0zt', name:'宇宙', desc:'攻击 +2%/层 · 暴击 +2%/层', max:5, req:30, mod:{atkPct:2,crit:2}},
        {key:'平衡大师_jz5z', name:'平衡大师', desc:'技能CD +5%/层 · 持续伤害 +5%/层', max:3, req:33, mod:{cdReduction:5,dotBonus:5}},
        {key:'平衡宗师_kn9s', name:'平衡宗师', desc:'攻击 +2%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:4,mastery:2}}
      ,
{key:'tal_bji6d5', name:'星辰之怒', desc:'攻击 +3%/层 · 持续伤害 +5%/层', max:5,req:38,mod:{atkPct:3,dotBonus:5}},{key:'tal_n2ivt5', name:'银河', desc:'智力 +8%/层 · 技能CD +5%/层', max:5,req:42,mod:{intPct:8,cdReduction:5}},{key:'tal_0ntb43', name:'星界行者', desc:'攻击 +2%/层 · 暴伤 +10%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:5,critdPct:10,mastery:2}}]},
      {key:'feral', name:'野性', icon:'🐺', masteryDesc:'凶猛撕咬伤害 +4%/精通', talents:[
        {key:'掠食者_kl5n', name:'掠食者', desc:'攻击 +2%/层', max:5, mod:{atkPct:2}},
        {key:'锋利利爪_f0ll', name:'锋利利爪', desc:'攻速 +5%/层', max:5, mod:{spdPct:5}},
        {key:'野蛮咆哮_1zls', name:'野蛮咆哮', desc:'敏捷 +5%/层', max:3, mod:{agiPct:5}},
        {key:'血爪_9sso', name:'血爪', desc:'吸血 +2%/层', max:5, mod:{leech:2}},
        {key:'野性之心_gnjw', name:'野性之心', desc:'技能CD +4%/层', max:3, mod:{cdReduction:4}},
        {key:'凶猛撕咬_stqc', name:'凶猛撕咬', desc:'解锁: 凶猛撕咬', max:1, req:10, unlockSkill:'bite'},
        {key:'顶级掠食者_j56p', name:'顶级掠食者', desc:'攻击 +3%/层', max:5, req:15, mod:{atkPct:3}},
        {key:'兽群之王_7p9m', name:'兽群之王', desc:'暴击 +2%/层 · 攻速 +3%/层', max:5, req:18, mod:{crit:2,spdPct:3}},
        {key:'野性怒吼_6z8m', name:'野性怒吼', desc:'攻击 +2%/层 · 额外攻击 +3%/层', max:3, req:22, mod:{atkPct:2,extraAtk:3}},
        {key:'掠食本能_ezb2', name:'掠食本能', desc:'攻击 +2%/层 · 吸血 +2%/层', max:5, req:25, mod:{atkPct:2,leech:2}},
        {key:'撕咬_hpp3', name:'撕咬', desc:'攻击 +3%/层 · 斩杀加成 +4%/层', max:5, req:28, mod:{atkPct:3,executeBonus:4}},
        {key:'狂野_vjm0', name:'狂野', desc:'暴伤 +8%/层 · extraAtk +3%/层', max:5, req:30, mod:{critdPct:8,extraAtk:3}},
        {key:'野性大师_035n', name:'野性大师', desc:'技能CD +5%/层 · 暴击 +2%/层', max:3, req:33, mod:{cdReduction:5,crit:2}},
        {key:'野性宗师_016z', name:'野性宗师', desc:'攻击 +2%/层 · 精通 +2%/层', max:3, req:36, mod:{atkPct:4,mastery:2}}
      ,
{key:'tal_dw1ibr', name:'掠食本能', desc:'攻击 +3%/层 · 吸血 +4%/层', max:5,req:38,mod:{atkPct:3,leech:4}},{key:'tal_cx76zw', name:'兽群之王', desc:'攻速 +8%/层 · 暴击 +3%/层', max:5,req:42,mod:{spdPct:8,crit:3}},{key:'tal_n4yxop', name:'荒野之王', desc:'攻击 +2%/层 · 斩杀加成 +8%/层 · 精通 +2%/层', max:3,req:45,mod:{atkPct:5,executeBonus:8,mastery:2}}]},
      {key:'resto', name:'恢复', icon:'🌿', masteryDesc:'回春术回复量 +5%/精通', talents:[
        {key:'微妙_qnek', name:'微妙', desc:'精神 +5%/层', max:5, mod:{spiPct:5}},
        {key:'自然学家_x0a2', name:'自然学家', desc:'生命 +5%/层', max:5, mod:{hpPct:5}},
        {key:'自然之赐_ycok', name:'自然之赐', desc:'回复 +2%/层', max:3, mod:{regFlat:2}},
        {key:'萌芽_jq1m', name:'萌芽', desc:'治疗 +5%/层', max:5, mod:{healBonus:5}},
        {key:'繁盛_0e50', name:'繁盛', desc:'技能CD +3%/层', max:3, mod:{cdReduction:3}},
        {key:'树皮术_jx8a', name:'树皮术', desc:'解锁: 树皮术', max:1, req:10, unlockSkill:'barkskin'},
        {key:'生命之树_bsfg', name:'生命之树', desc:'生命 +6%/层', max:5, req:15, mod:{hpPct:6}},
        {key:'春花_avkt', name:'春花', desc:'精神 +5%/层 · 治疗 +4%/层', max:5, req:18, mod:{spiPct:5,healBonus:4}},
        {key:'生命之力_2aov', name:'生命之力', desc:'生命 +5%/层 · 治疗 +5%/层', max:3, req:22, mod:{hpPct:5,healBonus:5}},
        {key:'自然守护_iaf5', name:'自然守护', desc:'防御 +5%/层 · 全能 +2%/层', max:5, req:25, mod:{defPct:5,vers:2}},
        {key:'愈合_plpk', name:'愈合', desc:'治疗 +7%/层 · 回复 +2%/层', max:5, req:28, mod:{healBonus:7,regFlat:2}},
        {key:'复苏_qv2o', name:'复苏', desc:'生命 +6%/层 · 治疗 +5%/层', max:5, req:30, mod:{hpPct:6,healBonus:5}},
        {key:'恢复大师_u0aa', name:'恢复大师', desc:'技能CD +4%/层 · 治疗 +5%/层', max:3, req:33, mod:{cdReduction:4,healBonus:5}},
        {key:'恢复宗师_f473', name:'恢复宗师', desc:'治疗 +12%/层 · 精通 +2%/层', max:3, req:36, mod:{healBonus:12,mastery:2}}
      ,
{key:'tal_dq1zl9', name:'自然之愈', desc:'治疗 +8%/层 · 生命 +5%/层', max:5,req:38,mod:{healBonus:8,hpPct:5}},{key:'tal_gvfwv6', name:'永续', desc:'回复 +5%/层 · 精神 +6%/层', max:5,req:42,mod:{regFlat:5,spiPct:6}},{key:'tal_tsnlze', name:'自然之灵', desc:'治疗 +15%/层 · 技能CD +5%/层 · 精通 +2%/层', max:3,req:45,mod:{healBonus:15,cdReduction:5,mastery:2}}]},
    ],
  },
};

/* ---------- 艾泽拉斯地图(20 张真实地图) ---------- */
const MAPS = [
  { key:'elwynn', name:'艾尔文森林', icon:'🌲', faction:'联盟', lvlRange:[1,10],
    desc:'暴风城外的宁静森林,人类家园',
    sub:[
      { name:'北郡修道院',   lvl:[1,4],  mobs:'🐺野狼幼崽|🕷️北郡仇恨蛛|💀北郡食尸鬼|🐗灰背野猪' },
      { name:'闪金镇',       lvl:[5,7],  mobs:'🐺凶猛森林狼|🐗暮色野猪|👤迪菲亚劫匪|🦨被腐化的野兽' },
      { name:'东谷伐木场',   lvl:[8,10], mobs:'🪓迪菲亚拦路贼|🧙迪菲亚法师|🐻东谷棕熊|👤迪菲亚守卫' },
    ],
    boss:{ name:'霍格', emoji:'🐗', lvl:12, desc:'臭名昭著的豺狼人头目' } },
  { key:'tirisfal', name:'提瑞斯法林地', icon:'⚰️', faction:'部落', lvlRange:[1,10],
    desc:'被遗忘者的家园,瘟疫笼罩的故土',
    sub:[
      { name:'死亡之痕',     lvl:[1,4],  mobs:'🐺枯草狼|🕷️瘟疫蜘蛛|🦅腐肉啄食者|🐀瘟疫鼠' },
      { name:'布瑞尔废墟',   lvl:[5,7],  mobs:'💀斯卡矶卫兵|👻闪光怨灵|🧟黏滑污泥|🦴白骨爬虫' },
      { name:'诅咒之地外围', lvl:[8,10], mobs:'👤斯坦索姆侦察兵|🧙堕落法师|🐺月夜狼|💀亡灵步兵' },
    ],
    boss:{ name:'纳尔图', emoji:'🧟', lvl:12, desc:'被遗忘者的叛徒' } },
  { key:'durotar', name:'杜隆塔尔', icon:'🌵', faction:'部落', lvlRange:[1,10],
    desc:'兽人在卡利姆多的红色家园',
    sub:[
      { name:'剃刀岭',     lvl:[1,4],  mobs:'🐗剃刀岭野猪|🦨被腐化的猛犸|💀血色幽灵|🦂沙漠蝎子' },
      { name:'火山之路',   lvl:[5,7],  mobs:'🦂沙鳞双足飞龙|🐊瑟拉摩鳄鱼|🦎沼泽蜥蜴|🪲毒刺' },
      { name:'雷霆崖外围', lvl:[8,10], mobs:'🦣战鹰|🐗剃刀沼泽巨猪|🐺荆棘谷的猎犬|🌪️风暴元素' },
    ],
    boss:{ name:'战丸', emoji:'🦂', lvl:12, desc:'剃刀岭的野兽王' } },
  { key:'westfall', name:'西部荒野', icon:'🌾', faction:'联盟', lvlRange:[10,20],
    desc:'被迪菲亚兄弟会占据的农场',
    sub:[
      { name:'哨兵岭',       lvl:[10,13], mobs:'👤迪菲亚劫匪|🐔野生土鸡|🐗狂野野猪|🦗田野蝗虫' },
      { name:'月溪村废墟',   lvl:[14,17], mobs:'🤖采石场守护者|🤖钛金机器人|👤迪菲亚刺客|🐮疯狂奶牛' },
      { name:'死亡矿井入口', lvl:[18,20], mobs:'🧙迪菲亚法师|👤迪菲亚仆从|👻矿洞幽灵|💀矿工骷髅' },
    ],
    boss:{ name:'莫斯虎尔的复仇之灵', emoji:'⚓', lvl:22, desc:'湮灭海湾的鬼船船长' } },
  { key:'silverpine', name:'银松森林', icon:'🌲', faction:'部落', lvlRange:[10,20],
    desc:'被狼人诅咒的腐朽森林',
    sub:[
      { name:'影牙城堡边境', lvl:[10,13], mobs:'🐺血色狼人|🐺月夜狼人|🕷️巨型蜘蛛|👻凄凉鬼影' },
      { name:'安伯米尔',     lvl:[14,17], mobs:'🤖法师皇家卫士|🤖灰烬法师|👤安伯米尔特工|🧙法师猎手' },
      { name:'腐烂荒野',     lvl:[18,20], mobs:'💀沼泽魔像|🧟亡灵农奴|👻死亡牧师|🐺夜行狼人' },
    ],
    boss:{ name:'阿鲁高的侍从', emoji:'🧙', lvl:22, desc:'狼人法师的随从' } },
  { key:'redridge', name:'赤脊山', icon:'⛰️', faction:'联盟', lvlRange:[15,25],
    desc:'通往黑石塔的边境之地',
    sub:[
      { name:'三角路口',     lvl:[15,18], mobs:'🐺黑石血腥猎犬|👹黑石兽人|🐉幼龙|🐗黑石野猪' },
      { name:'燃烧平原边境', lvl:[18,22], mobs:'🐉黑石长老|🐺黑铁狗|👹黑铁狂战士|🔥火焰元素' },
      { name:'黑石塔脚下',   lvl:[22,25], mobs:'🐲黑石龙|🐉燃烧之龙|👹黑铁督军|🔥拉格纳罗斯仆从' },
    ],
    boss:{ name:'山口烈焰', emoji:'🐉', lvl:27, desc:'黑石氏族的火龙' } },
  { key:'barrens', name:'贫瘠之地', icon:'🏜️', faction:'部落', lvlRange:[10,25],
    desc:'卡利姆多最辽阔的草原',
    sub:[
      { name:'路口',   lvl:[10,15], mobs:'🦎沙鳞蜥蜴|🐗剃刀沼泽巨猪|🐺贫瘠草原狼|🦂剧毒蝎' },
      { name:'棘齿城', lvl:[15,20], mobs:'🐊草原鳄鱼|🐗长牙公猪|🦒长颈鹿|🪲沙地爬虫' },
      { name:'巨槌石', lvl:[20,25], mobs:'🦏角斗士|🦣战鹰|👹半人马掠夺者|🦂沙脊蝎' },
    ],
    boss:{ name:'沙鳞之翼', emoji:'🦂', lvl:27, desc:'贫瘠之地的传奇巨蝎' } },
  { key:'wetlands', name:'湿地', icon:'🌊', faction:'联盟', lvlRange:[20,30],
    desc:'布满沼泽与龙类的水域',
    sub:[
      { name:'米奈希尔港', lvl:[20,24], mobs:'🐊湿地鳄鱼|🦎沼泽蜥蜴|🐸潮汐巨兽|🦂湿地蝎子' },
      { name:'湿地沼泽',   lvl:[25,30], mobs:'🐲幼龙|🦣巨人|🦖暴龙|🐸沼泽兽' },
    ],
    boss:{ name:'萨格雷·烈焰之心', emoji:'🐲', lvl:32, desc:'湿地的火龙首领' } },
  { key:'duskwood', name:'暮色森林', icon:'🌑', faction:'中立', lvlRange:[20,30],
    desc:'被诅咒的暗影森林,亡灵游荡之地',
    sub:[
      { name:'暮色镇',   lvl:[20,24], mobs:'🐺暮色狼人|👻飘渺怨灵|🕷️暮色森林蛛|🧛吸血蝙蝠' },
      { name:'暮色边境', lvl:[25,30], mobs:'🧟亡灵僧侣|🧛吸血鬼伯爵|🐺月夜狼|👤暮色刺客' },
    ],
    boss:{ name:'斯特拉霍尔姆勋爵', emoji:'🧛', lvl:32, desc:'暮色森林的吸血鬼贵族' } },
  { key:'thousand', name:'千针石林', icon:'🪐', faction:'中立', lvlRange:[25,35],
    desc:'卡利姆多大陆的尖刺荒漠',
    sub:[
      { name:'镭岩村',   lvl:[25,30], mobs:'🦎沙地暴龙|🐗野猪|🪲爬虫|🦂沙漠蝎' },
      { name:'闪光平原', lvl:[30,35], mobs:'🦖暴龙|🦏石壁巨蟾|🐺草原狼|🦴恐魔' },
    ],
    boss:{ name:'千针石林之沙', emoji:'🦖', lvl:37, desc:'沙漠暴龙之首' } },
  { key:'stranglethorn', name:'荆棘谷', icon:'🌴', faction:'中立', lvlRange:[30,45],
    desc:'巨魔与丛林兽充斥的热带丛林',
    sub:[
      { name:'北部森林',       lvl:[30,35], mobs:'🐅丛林虎|🦍巨型猩猩|🗿巨魔|🐍巨蟒' },
      { name:'加兹瑞拉海湾',   lvl:[35,40], mobs:'🐊鳄鱼|🐬潜水员|🦈鲨鱼|🐢海龟' },
      { name:'祖尔格拉布外围', lvl:[40,45], mobs:'🐍祖尔金蛇|🐅虎|👤巨魔战士|🐺豹' },
    ],
    boss:{ name:'加兹瑞拉', emoji:'🐍', lvl:47, desc:'荆棘谷的传奇海蛇' } },
  { key:'searing', name:'灼热峡谷', icon:'🔥', faction:'中立', lvlRange:[40,50],
    desc:'黑铁矮人盘踞的火焰地带',
    sub:[
      { name:'黑石外围',   lvl:[40,45], mobs:'🔥火元素|🐉幼龙|🐺火犬|👹黑铁兽人' },
      { name:'索瑞森营地', lvl:[45,50], mobs:'🤖蒸汽傀儡|🐲熔岩龙|🔥火焰领主|👹黑铁督军' },
    ],
    boss:{ name:'黑石氏族督军', emoji:'👹', lvl:52, desc:'黑石氏族的暴君' } },
  { key:'burning', name:'燃烧平原', icon:'🌋', faction:'中立', lvlRange:[45,55],
    desc:'通往火源之界的炽热焦土',
    sub:[
      { name:'巨槌山',   lvl:[45,50], mobs:'🔥火元素|🐉幼龙|🐺火犬|🪲熔岩爬虫' },
      { name:'黑石山脉', lvl:[50,55], mobs:'🐲黑龙|🔥火魔|👹黑铁巨魔|🤖傀儡' },
    ],
    boss:{ name:'拉格纳罗斯的仆从', emoji:'🔥', lvl:57, desc:'萨弗隆元素领主的爪牙' } },
  { key:'ungoro', name:'安戈洛环形山', icon:'🦖', faction:'中立', lvlRange:[48,55],
    desc:'隐藏在火山口中的史前生态',
    sub:[
      { name:'西部裂沟', lvl:[48,52], mobs:'🦖暴龙|🪲水晶爬虫|🌋火山幼龙|💎水晶蜥蜴' },
      { name:'火山口',   lvl:[52,55], mobs:'🔥火元素|🦖恐怖暴龙|🌋熔岩魔|🐉火龙' },
    ],
    boss:{ name:'雷加什·烈日', emoji:'🦖', lvl:57, desc:'史前龙王' } },
  { key:'silithus', name:'希利苏斯', icon:'🐛', faction:'中立', lvlRange:[55,60],
    desc:'异虫巢穴,克苏恩的影响之地',
    sub:[
      { name:'塞纳里奥要塞', lvl:[55,57], mobs:'🐝异虫|🪲异虫战士|💎水晶守卫|🐛剧毒蠕虫' },
      { name:'希利苏斯之野', lvl:[58,60], mobs:'🐝异虫飞兵|🪲异虫领主|💎水晶领主|🐛巨型蠕虫' },
    ],
    boss:{ name:'鲁卡安', emoji:'👁️', lvl:62, desc:'希利苏斯的禁忌之眼' } },
  { key:'eastern_plague', name:'东瘟疫之地', icon:'☠️', faction:'中立', lvlRange:[55,60],
    desc:'被天灾军团彻底污染的死亡之地',
    sub:[
      { name:'噬骨废墟',     lvl:[55,58], mobs:'🧟瘟疫食尸鬼|💀骨魔|🦴骨爬虫|👻死亡牧师' },
      { name:'斯坦索姆外围', lvl:[58,60], mobs:'🧟瘟疫卫兵|💀亡灵法师|🦴骨龙|👻怨灵' },
    ],
    boss:{ name:'克尔苏加德的密使', emoji:'🦴', lvl:62, desc:'天灾军团特使' } },
  { key:'hellfire', name:'地狱火半岛', icon:'😈', faction:'外域', lvlRange:[58,63],
    desc:'外域的入口,燃烧军团的前线',
    sub:[
      { name:'地狱火城堡', lvl:[58,61], mobs:'😈邪兽人|🦇魔脊蝙蝠|👹深渊领主|🔥火焰恶魔' },
      { name:'燃烧前线',   lvl:[61,63], mobs:'😈炎魔|👹深渊战士|🛸虚空使者|🔥地狱火' },
    ],
    boss:{ name:'玛瑟里顿', emoji:'😈', lvl:65, desc:'被囚禁的暗影议会成员' } },
  { key:'nagrand', name:'纳格兰', icon:'🦬', faction:'外域', lvlRange:[64,68],
    desc:'飘浮岛屿的草原,玛瑟里顿的故乡',
    sub:[
      { name:'元素王座',   lvl:[64,66], mobs:'🦬奥拉基尔|🦣大象|👹食人魔|🌪️元素' },
      { name:'纳格兰平原', lvl:[66,68], mobs:'🦌雄鹿|🐗白野猪|👹食人魔领主|🌪️风元素' },
    ],
    boss:{ name:'邦多', emoji:'👹', lvl:70, desc:'纳格兰食人魔之王' } },
  { key:'shadowmoon', name:'影月谷', icon:'🌑', faction:'外域', lvlRange:[67,70],
    desc:'伊利丹的黑暗神殿所在',
    sub:[
      { name:'影月村',     lvl:[67,69], mobs:'👹邪兽人战士|🐉魔龙|👤暗影法师|🔥地狱火兽人' },
      { name:'黑暗神殿外', lvl:[69,70], mobs:'😈深渊领主|🐲魔龙|🔥燃烧使者|👹大乌帕雷' },
    ],
    boss:{ name:'伊利丹·怒风', emoji:'😈', lvl:72, desc:'背叛者' } },
  { key:'borean', name:'北风苔原', icon:'❄️', faction:'诺森德', lvlRange:[68,72],
    desc:'诺森德的西部入口,鲜花与冰雪并存',
    sub:[
      { name:'鞭尾湖',       lvl:[68,70], mobs:'🦣猛犸|🐺霜狼|❄️雪人|🦅冰风之翼' },
      { name:'龙骨荒野边境', lvl:[70,72], mobs:'🐉霜龙|🦴亡灵|❄️冰元素|🦣冰冻猛犸' },
    ],
    boss:{ name:'卡格瓦', emoji:'🐊', lvl:74, desc:'神秘的鳄鱼之神' } },
  { key:'storm', name:'风暴峭壁', icon:'⚡', faction:'诺森德', lvlRange:[76,80],
    desc:'泰坦遗迹与铁矮人的领地',
    sub:[
      { name:'风暴神殿', lvl:[76,78], mobs:'⚡雷霆巨人|🤖泰坦守护者|❄️冰晶|🦴泰坦遗骸' },
      { name:'雷石峰',   lvl:[78,80], mobs:'⚡雷霆领主|🤖泰坦守护者|❄️风暴元素|🦴铁矮人' },
    ],
    boss:{ name:'索林姆', emoji:'⚡', lvl:82, desc:'雷电之王' } },
  { key:'icecrown', name:'冰冠冰川', icon:'🏰', faction:'诺森德', lvlRange:[78,80],
    desc:'巫妖王的领地,天灾军团总部',
    sub:[
      { name:'冰雾村',     lvl:[78,79], mobs:'🧟天灾士兵|🦴亡灵骑士|❄️冰元素|🐉霜龙' },
      { name:'巫妖王大殿', lvl:[79,80], mobs:'🧟瘟疫食尸鬼|🦴骨爬行者|💀亡灵法师|🐲霜龙' },
    ],
    boss:{ name:'阿尔萨斯·巫妖王', emoji:'☠️', lvl:83, desc:'寒冰之王,游戏终极BOSS' } },
  { key:'lochmodan', name:'洛克莫丹', icon:'🏔️', faction:'联盟', lvlRange:[10,18],
    desc:'丹莫罗之外的雪山湖泊',
    sub:[
      { name:'莫丹湖岸',     lvl:[10,13], mobs:'🐗山地野猪|🐺霜鬃狼|🦅悬崖秃鹫|🐻冰爪熊' },
      { name:'奥加兹哨站',   lvl:[14,18], mobs:'👤黑铁矮人|🐺霜鬃狼人|🪓石腭怪|💀寒冰怨灵' },
    ],
    boss:{ name:'莫格罗什', emoji:'👹', lvl:20, desc:'洛克莫丹的食人魔首领' } },
  { key:'ashenvale', name:'灰谷', icon:'🌳', faction:'中立', lvlRange:[18,28],
    desc:'暗夜精灵的古老森林,部落与联盟争夺之地',
    sub:[
      { name:'阿斯特兰纳',   lvl:[18,22], mobs:'🐺灰谷猎犬|🕷️森林毒蛛|🐻灰谷熊|🦅角鹰兽' },
      { name:'银翼哨站',     lvl:[22,28], mobs:'👤战歌斥候|🪓魔爪食人魔|🐉精灵龙|🌿腐化树精' },
    ],
    boss:{ name:'萨特领主', emoji:'😈', lvl:30, desc:'盘踞灰谷深处的恶魔萨特' } },
  { key:'arathi', name:'阿拉希高地', icon:'🏰', faction:'中立', lvlRange:[30,40],
    desc:'激流堡的废墟,古老的阿拉索帝国遗迹',
    sub:[
      { name:'避难谷地',     lvl:[30,35], mobs:'🦅高地狮鹫|👤辛迪加盗贼|🐺高地狼|💀石拳食人魔' },
      { name:'激流堡废墟',   lvl:[35,40], mobs:'👤辛迪加刺客|💀枯颅巨魔|🧟亡灵守军|🐉高地飞龙' },
    ],
    boss:{ name:'托尔贝恩', emoji:'👻', lvl:42, desc:'激流堡的亡灵王子' } },
  { key:'desolace', name:'凄凉之地', icon:'💀', faction:'中立', lvlRange:[35,45],
    desc:'半人马与燃烧军团肆虐的荒芜之地',
    sub:[
      { name:'尼耶尔哨站',   lvl:[35,40], mobs:'🐎半人马掠夺者|🦂地狱蝎|🪲骸骨爬虫|👹恶魔猎犬' },
      { name:'玛拉顿入口',   lvl:[40,45], mobs:'👹地狱卫士|🐎半人马可汗|🦎石化蜥蜴|🔥火元素' },
    ],
    boss:{ name:'瑟莱德丝公主', emoji:'👹', lvl:47, desc:'玛拉顿的腐化之源' } },
  { key:'feralas', name:'菲拉斯', icon:'🌴', faction:'中立', lvlRange:[40,50],
    desc:'羽月要塞所在的远古丛林',
    sub:[
      { name:'羽月要塞',     lvl:[40,45], mobs:'🦍格罗多克猩猩|🐺菲拉斯狼|🦅巨型角鹰兽|🐗铁皮野猪' },
      { name:'埃雷萨拉斯',   lvl:[45,50], mobs:'🧝上层精灵|👻奥术怨灵|🐉噩梦雏龙|🪄奥术魔像' },
    ],
    boss:{ name:'伊兰尼库斯之影', emoji:'🐉', lvl:52, desc:'被腐化的绿龙之影' } },
  { key:'tanaris', name:'塔纳利斯', icon:'🏜️', faction:'中立', lvlRange:[44,54],
    desc:'卡利姆多南端的大沙漠,加基森所在',
    sub:[
      { name:'加基森',       lvl:[44,48], mobs:'🦂沙漠掠行蝎|🦎晶化蜥蜴|🐫沙漠强盗|🤖废土机甲' },
      { name:'祖尔法拉克外', lvl:[48,54], mobs:'🗿沙怒巨魔|🦂巨型蝎|🧟复生木乃伊|🐉沙鳞雏龙' },
    ],
    boss:{ name:'加兹瑞拉', emoji:'🐍', lvl:56, desc:'沙怒巨魔信奉的远古多头蛇' } },
  { key:'zangarmarsh', name:'赞加沼泽', icon:'🍄', faction:'外域', lvlRange:[60,65],
    desc:'外域的巨大蘑菇湿地,孢子人的家园',
    sub:[
      { name:'孢子村',       lvl:[60,63], mobs:'🍄真菌巨人|🦟沼泽毒蚊|🐊沼泽利齿鳄|🌿沼泽行者' },
      { name:'毒蛇湖',       lvl:[63,65], mobs:'🐍盘牙毒蛇|🦟巨型水蝇|👹纳迦战士|🐊沼泽之王' },
    ],
    boss:{ name:'瓦斯琪', emoji:'🐍', lvl:67, desc:'盘牙水库的纳迦女巫' } },
  { key:'dragonblight', name:'龙骨荒野', icon:'🐉', faction:'诺森德', lvlRange:[72,76],
    desc:'巨龙军团的神圣墓地,诺森德中心',
    sub:[
      { name:'龙眠神殿',     lvl:[72,74], mobs:'🐉雏龙|🦴龙骨傀儡|❄️冰霜之灵|🦅霜翼飞龙' },
      { name:'纳克萨玛斯外', lvl:[74,76], mobs:'🧟天灾巨像|🐉冰霜巨龙|💀亡灵指挥官|❄️冰封战士' },
    ],
    boss:{ name:'辛达苟萨', emoji:'🐉', lvl:78, desc:'冰霜女王,阿尔萨斯的龙骨巨龙' } },
  { key:'stonetalon', name:'石爪山脉', icon:'⛰️', faction:'部落', lvlRange:[15,25],
    desc:'贫瘠之地以西的崇山峻岭',
    sub:[
      { name:'烈日石居',     lvl:[15,20], mobs:'🦅风蛇|🐺石爪狼|🕷️洞穴蛛|🦎晶鳞蜥蜴' },
      { name:'石爪峰',       lvl:[20,25], mobs:'👤风险投资公司|🤖伐木机甲|🐉雏龙|🌪️风元素' },
    ],
    boss:{ name:'格雷苏·碎石', emoji:'🐉', lvl:27, desc:'石爪峰顶的龙类之王' } },
  { key:'hillsbrad', name:'希尔斯布莱德丘陵', icon:'🌿', faction:'中立', lvlRange:[20,30],
    desc:'奥特兰克山谷脚下的肥沃丘陵',
    sub:[
      { name:'南海镇',       lvl:[20,25], mobs:'🐻山地熊|🕷️巨型蜘蛛|🦅山地狮鹫|👤辛迪加窃贼' },
      { name:'奥特兰克山脚', lvl:[25,30], mobs:'👹雪怪|🐺霜狼|❄️冰元素|🧟亡灵卫兵' },
    ],
    boss:{ name:'赫洛德', emoji:'⚔️', lvl:32, desc:'血色十字军的狂热勇士' } },
  { key:'dustwallow', name:'尘泥沼泽', icon:'🌫️', faction:'中立', lvlRange:[35,45],
    desc:'塞拉摩以南的阴暗沼泽,黑龙巢穴所在',
    sub:[
      { name:'塞拉摩岛',     lvl:[35,40], mobs:'🐊沼泽鳄鱼|🕷️沼泽毒蛛|🐗泥潭野猪|🐉黑龙幼崽' },
      { name:'奥妮克希亚巢穴', lvl:[40,45], mobs:'🐉黑龙卫士|🐲雏龙|🔥龙火元素|👤黑龙人' },
    ],
    boss:{ name:'奥妮克希亚', emoji:'🐲', lvl:47, desc:'黑龙公主,塞拉摩的阴影' } },
  { key:'blasted', name:'诅咒之地', icon:'🌑', faction:'中立', lvlRange:[50,60],
    desc:'黑暗之门所在的焦土,恶魔横行',
    sub:[
      { name:'守望堡',       lvl:[50,55], mobs:'😈恶魔猎犬|👹地狱卫士|🦂魔化蝎|🐗魔化野猪' },
      { name:'黑暗之门',     lvl:[55,60], mobs:'👹深渊领主|😈恐惧魔王|🔥地狱火|🐲魔能龙' },
    ],
    boss:{ name:'卡扎克', emoji:'😈', lvl:62, desc:'诅咒之地的末日领主' } },
  { key:'terokkar', name:'泰罗卡森林', icon:'🦅', faction:'外域', lvlRange:[62,67],
    desc:'外域的森林,奥金顿的遗迹所在',
    sub:[
      { name:'奥蕾莉亚要塞',   lvl:[62,65], mobs:'🦅鸦人|🕷️骨网蜘蛛|🐺魔脊狼|👹邪兽人斥候' },
      { name:'奥金顿废墟',     lvl:[65,67], mobs:'💀奥金顿亡魂|👻暗影议会|🧟复生卫士|🦇虚空蝙蝠' },
    ],
    boss:{ name:'摩摩尔', emoji:'🌪️', lvl:69, desc:'奥金顿地下的音爆之王' } },
  { key:'bladesedge', name:'刀锋山', icon:'🗡️', faction:'外域', lvlRange:[65,70],
    desc:'外域的锋利山峰,戈隆的领地',
    sub:[
      { name:'雷神要塞',     lvl:[65,68], mobs:'👹食人魔战士|🐲晶鳞龙|🦅刃翼鹰|🤖魔能机甲' },
      { name:'格鲁尔的巢穴', lvl:[68,70], mobs:'👹戈隆之子|🐲黑龙|🔥熔岩元素|👹食人魔领主' },
    ],
    boss:{ name:'屠龙者格鲁尔', emoji:'👹', lvl:72, desc:'刀锋山的戈隆之王' } },
  { key:'netherstorm', name:'虚空风暴', icon:'🌀', faction:'外域', lvlRange:[68,72],
    desc:'外域的虚空能量漩涡,凯尔萨斯的领地',
    sub:[
      { name:'风暴要塞外围', lvl:[68,70], mobs:'🧝血精灵法师|🤖奥术傀儡|🌀虚空元素|🛸以太族' },
      { name:'虚空风暴中心', lvl:[70,72], mobs:'🌀虚空行者|⚡能量元素|🧝日怒血骑士|🤖魔能守卫' },
    ],
    boss:{ name:'凯尔萨斯·逐日者', emoji:'🧝', lvl:74, desc:'风暴要塞的血精灵之王' } },
  { key:'howling', name:'嚎风峡湾', icon:'⛵', faction:'诺森德', lvlRange:[68,73],
    desc:'诺森德东南部,维库人的家园',
    sub:[
      { name:'瓦尔加德',     lvl:[68,71], mobs:'👤维库人战士|🐺霜狼|🐻冰熊|🦅峡湾鹰' },
      { name:'乌特加德城堡', lvl:[71,73], mobs:'👤维库掠夺者|🐉始祖龙|❄️冰霜元素|🧟天灾先锋' },
    ],
    boss:{ name:'掠夺者因格瓦尔', emoji:'👤', lvl:75, desc:'乌特加德的维库之王' } },
  { key:'grizzly', name:'灰熊丘陵', icon:'🐻', faction:'诺森德', lvlRange:[73,77],
    desc:'诺森德的原始森林,熊怪与狼群的领地',
    sub:[
      { name:'灰熊丘陵营地', lvl:[73,75], mobs:'🐻巨熊|🐺森林狼|🦌雄鹿|👤熊怪' },
      { name:'达克萨隆要塞', lvl:[75,77], mobs:'🐻狂暴熊怪|❄️冰原猛犸|🧟天灾巨魔|🐺冰霜座狼' },
    ],
    boss:{ name:'达克萨隆巨熊', emoji:'🐻', lvl:79, desc:'灰熊丘陵的远古巨熊之灵' } },
  { key:'sholazar', name:'索拉查盆地', icon:'🌴', faction:'诺森德', lvlRange:[75,78],
    desc:'诺森德的热带奇迹,泰坦生态实验场',
    sub:[
      { name:'奈辛瓦里营地', lvl:[75,77], mobs:'🦖迅猛龙|🦣长毛象|🐅剑齿虎|🦅恐鸟' },
      { name:'造物者平台',   lvl:[77,78], mobs:'🤖泰坦造物|🦖魔暴龙|🪲水晶巨虫|🌿狂野鞭笞者' },
    ],
    boss:{ name:'洛卡纳哈', emoji:'🐅', lvl:80, desc:'索拉查的稀有灵魂兽' } },
];

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
      desc: '2.5倍火焰伤害',
      type: 'dmg',
      mul: 2.5,
      cd: 10,
      castTime: 1
    }]
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
      desc: '4倍AOE',
      type: 'dmg',
      mul: 4,
      cd: 20,
      castTime: 2
    }]
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
      desc: '2.5倍伤害',
      type: 'dmg',
      mul: 2.5,
      cd: 10,
      castTime: 1
    }]
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
    },{
      name: '伐木机撞击',
      icon: '🚜',
      desc: '3.5倍伤害',
      type: 'dmg',
      mul: 3.5,
      cd: 18,
      castTime: 1.5
    }]
  },{
    name: '范克瑞斯',
    emoji: '🦹',
    wave: 7,
    skills: [{
      name: '暗影步',
      icon: '👤',
      desc: '2.5倍伤害+闪避',
      type: 'dmg',
      mul: 2.5,
      cd: 10,
      castTime: 1
    },{
      name: '烟雾弹',
      icon: '💨',
      desc: '降低命中10秒',
      type: 'dmg',
      mul: 2,
      slow: true,
      cd: 18,
      castTime: 1
    }]
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
      desc: '2.5倍伤害+中毒',
      type: 'dmg',
      mul: 2.5,
      dot: true,
      cd: 12,
      castTime: 1
    }]
  },{
    name: '斯卡姆',
    emoji: '🦖',
    wave: 4,
    skills: [{
      name: '雷霆践踏',
      icon: '🦶',
      desc: '3.5倍伤害',
      type: 'dmg',
      mul: 3.5,
      cd: 14,
      castTime: 1.5
    }]
  },{
    name: '梦魇之王',
    emoji: '👹',
    wave: 7,
    skills: [{
      name: '暗影箭雨',
      icon: '🌑',
      desc: '4.5倍暗影伤害',
      type: 'dmg',
      mul: 4.5,
      cd: 16,
      castTime: 2
    },{
      name: '恐惧咆哮',
      icon: '👻',
      desc: '3倍伤害+减速',
      type: 'dmg',
      mul: 3,
      slow: true,
      cd: 20,
      castTime: 1.5
    }]
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
      desc: '2.5倍伤害',
      type: 'dmg',
      mul: 2.5,
      cd: 10,
      castTime: 1
    }]
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
    }]
  },{
    name: '阿库麦尔',
    emoji: '🐙',
    wave: 7,
    skills: [{
      name: '深渊之怒',
      icon: '🐙',
      desc: '4倍伤害',
      type: 'dmg',
      mul: 4,
      cd: 14,
      castTime: 1.5
    },{
      name: '暗潮',
      icon: '🌊',
      desc: '3倍AOE',
      type: 'dmg',
      mul: 3,
      cd: 18,
      castTime: 1.5
    }]
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
    }]
  },{
    name: '指挥官斯普林瓦尔',
    emoji: '👻',
    wave: 5,
    skills: [{
      name: '亡灵之怒',
      icon: '💀',
      desc: '3.5倍伤害',
      type: 'dmg',
      mul: 3.5,
      cd: 14,
      castTime: 1.5
    }]
  },{
    name: '阿鲁高',
    emoji: '🧙',
    wave: 8,
    skills: [{
      name: '暗影诅咒',
      icon: '🧿',
      desc: '4.5倍伤害',
      type: 'dmg',
      mul: 4.5,
      cd: 16,
      castTime: 2
    },{
      name: '召唤狼人',
      icon: '🐺',
      desc: '5倍伤害',
      type: 'dmg',
      mul: 5,
      cd: 22,
      castTime: 2.5
    }]
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
    }]
  },{
    name: '群体打击者9-60',
    emoji: '🤖',
    wave: 5,
    skills: [{
      name: '群体打击',
      icon: '🤖',
      desc: '3.5倍伤害',
      type: 'dmg',
      mul: 3.5,
      cd: 14,
      castTime: 1.5
    }]
  },{
    name: '机械师瑟玛普拉格',
    emoji: '🤖',
    wave: 8,
    skills: [{
      name: '电击网',
      icon: '🔌',
      desc: '4倍伤害',
      type: 'dmg',
      mul: 4,
      cd: 16,
      castTime: 1.5
    },{
      name: '自爆机器人',
      icon: '💣',
      desc: '6倍伤害',
      type: 'dmg',
      mul: 6,
      cd: 24,
      castTime: 3
    }]
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
    }]
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
    }]
  },{
    name: '卡尔加·刺肋',
    emoji: '🐗',
    wave: 7,
    skills: [{
      name: '荆棘之刺',
      icon: '🐗',
      desc: '4倍伤害+流血',
      type: 'dmg',
      mul: 4,
      dot: true,
      cd: 16,
      castTime: 1.5
    },{
      name: '野猪之魂',
      icon: '🐗',
      desc: '5倍伤害',
      type: 'dmg',
      mul: 5,
      cd: 22,
      castTime: 2.5
    }]
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
    }]
  },{
    name: '赫洛德',
    emoji: '⚔️',
    wave: 5,
    skills: [{
      name: '旋风斩',
      icon: '🌀',
      desc: '4倍AOE',
      type: 'dmg',
      mul: 4,
      cd: 14,
      castTime: 1.5
    }]
  },{
    name: '奥法师杜安',
    emoji: '🧙',
    wave: 7,
    skills: [{
      name: '奥术爆炸',
      icon: '💥',
      desc: '4倍奥术伤害',
      type: 'dmg',
      mul: 4,
      cd: 14,
      castTime: 1.5
    }]
  },{
    name: '莫格莱尼',
    emoji: '💀',
    wave: 9,
    skills: [{
      name: '灰烬使者',
      icon: '✨',
      desc: '6倍神圣伤害',
      type: 'dmg',
      mul: 6,
      cd: 20,
      castTime: 2.5
    },{
      name: '圣光之怒',
      icon: '😡',
      desc: '5倍必暴',
      type: 'dmg',
      mul: 5,
      alwaysCrit: true,
      cd: 26,
      castTime: 2.5
    }]
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
      desc: '2.5倍伤害+减速',
      type: 'dmg',
      mul: 2.5,
      slow: true,
      cd: 12,
      castTime: 1
    }]
  },{
    name: '火眼莫德雷斯',
    emoji: '🔥',
    wave: 5,
    skills: [{
      name: '火眼',
      icon: '🔥',
      desc: '3.5倍火焰伤害',
      type: 'dmg',
      mul: 3.5,
      cd: 14,
      castTime: 1.5
    }]
  },{
    name: '巫妖寒冰之王',
    emoji: '💀',
    wave: 8,
    skills: [{
      name: '寒冰箭',
      icon: '❄️',
      desc: '4.5倍冰霜伤害',
      type: 'dmg',
      mul: 4.5,
      cd: 16,
      castTime: 2
    },{
      name: '冰霜新星',
      icon: '💠',
      desc: '5倍AOE+减速',
      type: 'dmg',
      mul: 5,
      slow: true,
      cd: 22,
      castTime: 2.5
    }]
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
    }]
  },{
    name: '石窟织石者',
    emoji: '🕷️',
    wave: 5,
    skills: [{
      name: '蜘蛛毒液',
      icon: '🕷️',
      desc: '3.5倍中毒',
      type: 'dmg',
      mul: 3.5,
      dot: true,
      cd: 14,
      castTime: 1.5
    }]
  },{
    name: '阿扎达斯',
    emoji: '👑',
    wave: 8,
    skills: [{
      name: '大地之怒',
      icon: '⛰️',
      desc: '5倍伤害',
      type: 'dmg',
      mul: 5,
      cd: 18,
      castTime: 2
    },{
      name: '岩石风暴',
      icon: '🪨',
      desc: '6倍AOE',
      type: 'dmg',
      mul: 6,
      cd: 24,
      castTime: 3
    }]
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
      desc: '3.5倍伤害',
      type: 'dmg',
      mul: 3.5,
      cd: 14,
      castTime: 1.5
    }]
  },{
    name: '工匠吉兹洛克',
    emoji: '🗿',
    wave: 5,
    skills: [{
      name: '地精工程',
      icon: '🔧',
      desc: '4倍伤害',
      type: 'dmg',
      mul: 4,
      cd: 16,
      castTime: 1.5
    }]
  },{
    name: '瑟莱德丝公主',
    emoji: '👹',
    wave: 8,
    skills: [{
      name: '腐化',
      icon: '👹',
      desc: '5倍伤害+中毒',
      type: 'dmg',
      mul: 5,
      dot: true,
      cd: 18,
      castTime: 2
    },{
      name: '地震',
      icon: '🌍',
      desc: '6倍AOE',
      type: 'dmg',
      mul: 6,
      cd: 26,
      castTime: 3
    }]
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
      desc: '3.5倍伤害',
      type: 'dmg',
      mul: 3.5,
      cd: 14,
      castTime: 1.5
    }]
  },{
    name: '乌克兹·沙顶',
    emoji: '🦂',
    wave: 5,
    skills: [{
      name: '沙暴',
      icon: '🏜️',
      desc: '4倍伤害',
      type: 'dmg',
      mul: 4,
      cd: 16,
      castTime: 1.5
    }]
  },{
    name: '巫医祖穆拉恩',
    emoji: '🗿',
    wave: 8,
    skills: [{
      name: '祖尔法拉克之怒',
      icon: '🗿',
      desc: '5倍伤害',
      type: 'dmg',
      mul: 5,
      cd: 18,
      castTime: 2
    },{
      name: '巫毒诅咒',
      icon: '💀',
      desc: '4倍必暴+流血',
      type: 'dmg',
      mul: 4,
      alwaysCrit: true,
      dot: true,
      cd: 24,
      castTime: 2.5
    }]
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
      desc: '3.5倍暗影伤害',
      type: 'dmg',
      mul: 3.5,
      cd: 14,
      castTime: 1.5
    }]
  },{
    name: '德姆塞卡尔',
    emoji: '🐉',
    wave: 6,
    skills: [{
      name: '龙息术',
      icon: '🐉',
      desc: '4.5倍火焰伤害',
      type: 'dmg',
      mul: 4.5,
      cd: 16,
      castTime: 2
    }]
  },{
    name: '伊兰尼库斯之影',
    emoji: '🐉',
    wave: 9,
    skills: [{
      name: '翡翠梦境',
      icon: '🐉',
      desc: '5倍伤害',
      type: 'dmg',
      mul: 5,
      cd: 18,
      castTime: 2
    },{
      name: '梦魇',
      icon: '👁️',
      desc: '7倍暗影伤害',
      type: 'dmg',
      mul: 7,
      cd: 26,
      castTime: 3
    }]
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
      desc: '4倍伤害',
      type: 'dmg',
      mul: 4,
      cd: 14,
      castTime: 1.5
    }]
  },{
    name: '黑暗院长加丁',
    emoji: '🧙',
    wave: 6,
    skills: [{
      name: '暗影魔法',
      icon: '📖',
      desc: '5倍伤害',
      type: 'dmg',
      mul: 5,
      cd: 18,
      castTime: 2
    }]
  },{
    name: '拉斯·弗罗斯特维斯帕',
    emoji: '🧛',
    wave: 9,
    skills: [{
      name: '冰霜之触',
      icon: '❄️',
      desc: '6倍冰霜伤害',
      type: 'dmg',
      mul: 6,
      cd: 20,
      castTime: 2.5
    },{
      name: '死灵诅咒',
      icon: '💀',
      desc: '5倍必暴',
      type: 'dmg',
      mul: 5,
      alwaysCrit: true,
      cd: 28,
      castTime: 2.5
    }]
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
      desc: '3.5倍伤害',
      type: 'dmg',
      mul: 3.5,
      cd: 14,
      castTime: 1.5
    }]
  },{
    name: '贝尔加',
    emoji: '🔥',
    wave: 6,
    skills: [{
      name: '熔岩喷发',
      icon: '🌋',
      desc: '4.5倍火焰伤害',
      type: 'dmg',
      mul: 4.5,
      cd: 16,
      castTime: 2
    }]
  },{
    name: '弗莱拉斯大使',
    emoji: '👹',
    wave: 8,
    skills: [{
      name: '暗影烈焰',
      icon: '🔥',
      desc: '5倍伤害',
      type: 'dmg',
      mul: 5,
      cd: 18,
      castTime: 2
    }]
  },{
    name: '达格兰·索瑞森大帝',
    emoji: '👑',
    wave: 10,
    skills: [{
      name: '索瑞森之怒',
      icon: '👑',
      desc: '7倍火焰伤害',
      type: 'dmg',
      mul: 7,
      cd: 22,
      castTime: 3
    },{
      name: '熔火之心',
      icon: '🌋',
      desc: '6倍AOE',
      type: 'dmg',
      mul: 6,
      cd: 30,
      castTime: 3
    }]
  }],
  desc: '黑铁矮人的熔火帝国'
},{
  key: 'stratholme',
  name: '斯坦索姆',
  icon: '🏘️',
  reqLvl: 58,
  waves: 10,
  cd: 2400,
  bosses: [{
    name: '悲惨的提米',
    emoji: '🧟',
    wave: 3,
    skills: [{
      name: '悲惨嚎叫',
      icon: '😭',
      desc: '4倍伤害+减速',
      type: 'dmg',
      mul: 4,
      slow: true,
      cd: 14,
      castTime: 1.5
    }]
  },{
    name: '炮手威利',
    emoji: '💣',
    wave: 5,
    skills: [{
      name: '火炮轰击',
      icon: '💣',
      desc: '5倍伤害',
      type: 'dmg',
      mul: 5,
      cd: 16,
      castTime: 2
    }]
  },{
    name: '巴纳扎尔',
    emoji: '😈',
    wave: 8,
    skills: [{
      name: '恐惧',
      icon: '😈',
      desc: '5倍暗影伤害',
      type: 'dmg',
      mul: 5,
      cd: 18,
      castTime: 2
    }]
  },{
    name: '瑞文戴尔男爵',
    emoji: '🧛',
    wave: 10,
    skills: [{
      name: '死亡之握',
      icon: '💀',
      desc: '6倍暗影伤害',
      type: 'dmg',
      mul: 6,
      cd: 20,
      castTime: 2.5
    },{
      name: '亡灵大军',
      icon: '🧟',
      desc: '7倍AOE',
      type: 'dmg',
      mul: 7,
      cd: 30,
      castTime: 3
    }]
  }],
  desc: '被天灾军团毁灭的人类城市'
},{
  key: 'mc',
  name: '熔火之心',
  icon: '🌋',
  reqLvl: 60,
  waves: 10,
  cd: 3600,
  bosses: [{
    name: '鲁西弗隆',
    emoji: '😈',
    wave: 3,
    skills: [{
      name: '末日诅咒',
      icon: '😈',
      desc: '4倍伤害',
      type: 'dmg',
      mul: 4,
      cd: 14,
      castTime: 1.5
    }]
  },{
    name: '玛格曼达',
    emoji: '🐶',
    wave: 5,
    skills: [{
      name: '火焰吐息',
      icon: '🔥',
      desc: '5倍火焰伤害',
      type: 'dmg',
      mul: 5,
      cd: 16,
      castTime: 2
    }]
  },{
    name: '加尔',
    emoji: '🪨',
    wave: 7,
    skills: [{
      name: '岩石粉碎',
      icon: '🪨',
      desc: '4.5倍伤害',
      type: 'dmg',
      mul: 4.5,
      cd: 16,
      castTime: 2
    }]
  },{
    name: '迦顿男爵',
    emoji: '🔥',
    wave: 8,
    skills: [{
      name: '地狱火',
      icon: '🔥',
      desc: '6倍火焰伤害',
      type: 'dmg',
      mul: 6,
      cd: 20,
      castTime: 2.5
    }]
  },{
    name: '拉格纳罗斯',
    emoji: '🔥',
    wave: 10,
    skills: [{
      name: '萨弗隆之怒',
      icon: '🌋',
      desc: '8倍火焰伤害',
      type: 'dmg',
      mul: 8,
      cd: 24,
      castTime: 3
    },{
      name: '熔岩喷涌',
      icon: '🔥',
      desc: '7倍AOE必暴',
      type: 'dmg',
      mul: 7,
      alwaysCrit: true,
      cd: 36,
      castTime: 4
    }]
  }],
  desc: '萨弗隆元素领主的火焰之心'
},{
  key: 'manatombs',
  name: '法力陵墓',
  icon: '⚱️',
  reqLvl: 63,
  waves: 8,
  cd: 3600,
  bosses: [{
    name: '潘德莫努斯',
    emoji: '🌀',
    wave: 2,
    skills: [{
      name: '虚空冲击',
      icon: '🌀',
      desc: '4倍伤害',
      type: 'dmg',
      mul: 4,
      cd: 14,
      castTime: 1.5
    }]
  },{
    name: '塔瓦洛克',
    emoji: '🪨',
    wave: 5,
    skills: [{
      name: '岩石猛击',
      icon: '🪨',
      desc: '4.5倍伤害',
      type: 'dmg',
      mul: 4.5,
      cd: 16,
      castTime: 2
    }]
  },{
    name: '节点亲王沙法尔',
    emoji: '🌀',
    wave: 8,
    skills: [{
      name: '虚空之怒',
      icon: '🌀',
      desc: '5倍伤害',
      type: 'dmg',
      mul: 5,
      cd: 18,
      castTime: 2
    },{
      name: '能量虚空',
      icon: '⚡',
      desc: '6倍必暴',
      type: 'dmg',
      mul: 6,
      alwaysCrit: true,
      cd: 24,
      castTime: 2.5
    }]
  }],
  desc: '奥金顿的虚空能量墓穴'
},{
  key: 'bwl',
  name: '黑翼之巢',
  icon: '🐉',
  reqLvl: 65,
  waves: 10,
  cd: 4200,
  bosses: [{
    name: '狂野的拉佐格尔',
    emoji: '🐉',
    wave: 3,
    skills: [{
      name: '龙翼打击',
      icon: '🐉',
      desc: '5倍伤害',
      type: 'dmg',
      mul: 5,
      cd: 16,
      castTime: 2
    }]
  },{
    name: '堕落的瓦拉斯塔兹',
    emoji: '🐲',
    wave: 5,
    skills: [{
      name: '暗影烈焰',
      icon: '🔥',
      desc: '6倍火焰伤害',
      type: 'dmg',
      mul: 6,
      cd: 18,
      castTime: 2.5
    }]
  },{
    name: '克洛玛古斯',
    emoji: '🐕',
    wave: 7,
    skills: [{
      name: '时光扭曲',
      icon: '⏳',
      desc: '5倍伤害+减速',
      type: 'dmg',
      mul: 5,
      slow: true,
      cd: 16,
      castTime: 2
    }]
  },{
    name: '奈法利安',
    emoji: '🐉',
    wave: 10,
    skills: [{
      name: '暗影烈焰',
      icon: '🐉',
      desc: '8倍火焰伤害',
      type: 'dmg',
      mul: 8,
      cd: 22,
      castTime: 3
    },{
      name: '龙族之怒',
      icon: '🐲',
      desc: '7倍AOE必暴',
      type: 'dmg',
      mul: 7,
      alwaysCrit: true,
      cd: 34,
      castTime: 4
    }]
  }],
  desc: '黑龙王子的腐败实验场'
},{
  key: 'steamvault',
  name: '蒸汽地窟',
  icon: '💧',
  reqLvl: 67,
  waves: 9,
  cd: 4200,
  bosses: [{
    name: '水术师瑟丝比亚',
    emoji: '💧',
    wave: 2,
    skills: [{
      name: '水龙卷',
      icon: '💧',
      desc: '4.5倍伤害',
      type: 'dmg',
      mul: 4.5,
      cd: 14,
      castTime: 1.5
    }]
  },{
    name: '机械师斯蒂里格',
    emoji: '🔧',
    wave: 5,
    skills: [{
      name: '蒸汽爆炸',
      icon: '💨',
      desc: '5倍伤害',
      type: 'dmg',
      mul: 5,
      cd: 16,
      castTime: 2
    }]
  },{
    name: '督军卡利瑟里斯',
    emoji: '🐊',
    wave: 9,
    skills: [{
      name: '盘牙之怒',
      icon: '🐊',
      desc: '6倍伤害',
      type: 'dmg',
      mul: 6,
      cd: 20,
      castTime: 2.5
    }]
  }],
  desc: '盘牙水库的蒸汽密室'
},{
  key: 'naxx',
  name: '纳克萨玛斯',
  icon: '☠️',
  reqLvl: 70,
  waves: 12,
  cd: 5400,
  bosses: [{
    name: '阿努布雷坎',
    emoji: '🕷️',
    wave: 3,
    skills: [{
      name: '虫群风暴',
      icon: '🕷️',
      desc: '5倍伤害',
      type: 'dmg',
      mul: 5,
      cd: 16,
      castTime: 2
    }]
  },{
    name: '帕奇维克',
    emoji: '🧟',
    wave: 5,
    skills: [{
      name: '憎恶打击',
      icon: '🧟',
      desc: '6倍伤害+吸血',
      type: 'dmg',
      mul: 6,
      lifeSteal: 0.3,
      cd: 18,
      castTime: 2.5
    }]
  },{
    name: '塔迪乌斯',
    emoji: '⚡',
    wave: 8,
    skills: [{
      name: '闪电链',
      icon: '⚡',
      desc: '6倍自然伤害',
      type: 'dmg',
      mul: 6,
      cd: 18,
      castTime: 2.5
    }]
  },{
    name: '萨菲隆',
    emoji: '🐉',
    wave: 10,
    skills: [{
      name: '冰霜吐息',
      icon: '❄️',
      desc: '7倍冰霜伤害',
      type: 'dmg',
      mul: 7,
      cd: 22,
      castTime: 3
    },{
      name: '冰霜光环',
      icon: '🧊',
      desc: '6倍AOE',
      type: 'dmg',
      mul: 6,
      cd: 28,
      castTime: 3
    }]
  },{
    name: '克尔苏加德',
    emoji: '☠️',
    wave: 12,
    skills: [{
      name: '暗影裂隙',
      icon: '☠️',
      desc: '8倍暗影伤害',
      type: 'dmg',
      mul: 8,
      cd: 24,
      castTime: 3
    },{
      name: '冰霜陨石',
      icon: '❄️',
      desc: '9倍AOE必暴',
      type: 'dmg',
      mul: 9,
      alwaysCrit: true,
      cd: 40,
      castTime: 4
    }]
  }],
  desc: '天灾军团的浮空堡垒'
},{
  key: 'magister',
  name: '魔导师平台',
  icon: '🔮',
  reqLvl: 72,
  waves: 9,
  cd: 5400,
  bosses: [{
    name: '塞林·火心',
    emoji: '🧝',
    wave: 2,
    skills: [{
      name: '凤凰之火',
      icon: '🔥',
      desc: '5倍火焰伤害',
      type: 'dmg',
      mul: 5,
      cd: 16,
      castTime: 2
    }]
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
    }]
  },{
    name: '凯尔萨斯·逐日者',
    emoji: '🧝',
    wave: 9,
    skills: [{
      name: '凤凰',
      icon: '🔥',
      desc: '8倍火焰伤害',
      type: 'dmg',
      mul: 8,
      cd: 22,
      castTime: 3
    },{
      name: '炎爆术',
      icon: '☄️',
      desc: '10倍必暴',
      type: 'dmg',
      mul: 10,
      alwaysCrit: true,
      cd: 36,
      castTime: 4
    }]
  }],
  desc: '血精灵王子的最后堡垒'
},{
  key: 'karazhan',
  name: '卡拉赞',
  icon: '🌌',
  reqLvl: 75,
  waves: 10,
  cd: 6000,
  bosses: [{
    name: '猎手阿图门',
    emoji: '🐴',
    wave: 2,
    skills: [{
      name: '暗影冲锋',
      icon: '🐴',
      desc: '5倍伤害',
      type: 'dmg',
      mul: 5,
      cd: 16,
      castTime: 2
    }]
  },{
    name: '莫罗斯',
    emoji: '👤',
    wave: 5,
    skills: [{
      name: '暗杀',
      icon: '🗡️',
      desc: '5倍伤害+流血',
      type: 'dmg',
      mul: 5,
      dot: true,
      cd: 16,
      castTime: 2
    }]
  },{
    name: '馆长',
    emoji: '🤖',
    wave: 7,
    skills: [{
      name: '奥术充能',
      icon: '⚡',
      desc: '6倍奥术伤害',
      type: 'dmg',
      mul: 6,
      cd: 20,
      castTime: 2.5
    }]
  },{
    name: '麦迪文',
    emoji: '🔮',
    wave: 10,
    skills: [{
      name: '奥术风暴',
      icon: '🔮',
      desc: '8倍奥术伤害',
      type: 'dmg',
      mul: 8,
      cd: 24,
      castTime: 3
    }]
  }],
  desc: '最后的守护者之塔'
},{
  key: 'hol',
  name: '闪电大厅',
  icon: '⚡',
  reqLvl: 77,
  waves: 10,
  cd: 6000,
  bosses: [{
    name: '比亚格里将军',
    emoji: '⚡',
    wave: 3,
    skills: [{
      name: '闪电打击',
      icon: '⚡',
      desc: '5倍伤害',
      type: 'dmg',
      mul: 5,
      cd: 14,
      castTime: 2
    }]
  },{
    name: '沃尔坎',
    emoji: '🔥',
    wave: 6,
    skills: [{
      name: '锻造之火',
      icon: '🔥',
      desc: '6倍火焰伤害',
      type: 'dmg',
      mul: 6,
      cd: 18,
      castTime: 2.5
    }]
  },{
    name: '洛肯',
    emoji: '⚡',
    wave: 10,
    skills: [{
      name: '闪电新星',
      icon: '⚡',
      desc: '8倍自然伤害',
      type: 'dmg',
      mul: 8,
      cd: 22,
      castTime: 3
    },{
      name: '雷霆万钧',
      icon: '⛈️',
      desc: '7倍AOE必暴',
      type: 'dmg',
      mul: 7,
      alwaysCrit: true,
      cd: 32,
      castTime: 3
    }]
  }],
  desc: '奥杜尔的泰坦闪电圣殿'
},{
  key: 'toc',
  name: '冠军的试炼',
  icon: '🏟️',
  reqLvl: 78,
  waves: 10,
  cd: 6000,
  bosses: [{
    name: '银色勇士',
    emoji: '🛡️',
    wave: 2,
    skills: [{
      name: '圣光审判',
      icon: '✨',
      desc: '4.5倍神圣伤害',
      type: 'dmg',
      mul: 4.5,
      cd: 14,
      castTime: 1.5
    }]
  },{
    name: '黑骑士',
    emoji: '⚫',
    wave: 5,
    skills: [{
      name: '死亡之握',
      icon: '⚫',
      desc: '5.5倍暗影伤害',
      type: 'dmg',
      mul: 5.5,
      cd: 16,
      castTime: 2
    }]
  },{
    name: '纯洁者耶德瑞克',
    emoji: '✨',
    wave: 7,
    skills: [{
      name: '圣光之锤',
      icon: '🔨',
      desc: '6倍神圣伤害',
      type: 'dmg',
      mul: 6,
      cd: 18,
      castTime: 2.5
    }]
  },{
    name: '银白十字军冠军',
    emoji: '🏆',
    wave: 10,
    skills: [{
      name: '冠军之击',
      icon: '🏆',
      desc: '8倍伤害',
      type: 'dmg',
      mul: 8,
      cd: 22,
      castTime: 3
    }]
  }],
  desc: '银白十字军的勇士试炼'
},{
  key: 'sunwell',
  name: '太阳之井',
  icon: '☀️',
  reqLvl: 80,
  waves: 11,
  cd: 7200,
  bosses: [{
    name: '卡雷苟斯',
    emoji: '🐉',
    wave: 3,
    skills: [{
      name: '奥术吐息',
      icon: '🐉',
      desc: '5.5倍奥术伤害',
      type: 'dmg',
      mul: 5.5,
      cd: 16,
      castTime: 2
    }]
  },{
    name: '布鲁塔卢斯',
    emoji: '😈',
    wave: 5,
    skills: [{
      name: '流星',
      icon: '☄️',
      desc: '7倍火焰伤害',
      type: 'dmg',
      mul: 7,
      cd: 20,
      castTime: 2.5
    }]
  },{
    name: '艾瑞达双子',
    emoji: '👯',
    wave: 8,
    skills: [{
      name: '暗影之怒',
      icon: '😈',
      desc: '7倍暗影伤害',
      type: 'dmg',
      mul: 7,
      cd: 20,
      castTime: 2.5
    }]
  },{
    name: '基尔加丹',
    emoji: '😈',
    wave: 11,
    skills: [{
      name: '千魂之暗',
      icon: '😈',
      desc: '10倍暗影伤害',
      type: 'dmg',
      mul: 10,
      cd: 26,
      castTime: 4
    },{
      name: '末日决战',
      icon: '💀',
      desc: '12倍AOE必暴',
      type: 'dmg',
      mul: 12,
      alwaysCrit: true,
      cd: 44,
      castTime: 5
    }]
  }],
  desc: '燃烧军团的入侵之门'
},{
  key: 'ulduar',
  name: '奥杜尔',
  icon: '⚙️',
  reqLvl: 80,
  waves: 11,
  cd: 7200,
  bosses: [{
    name: '烈焰巨兽',
    emoji: '🚂',
    wave: 3,
    skills: [{
      name: '火焰喷射',
      icon: '🚂',
      desc: '6倍火焰伤害',
      type: 'dmg',
      mul: 6,
      cd: 18,
      castTime: 2.5
    }]
  },{
    name: '钢铁议会',
    emoji: '⚙️',
    wave: 5,
    skills: [{
      name: '过载',
      icon: '⚙️',
      desc: '7倍伤害',
      type: 'dmg',
      mul: 7,
      cd: 20,
      castTime: 2.5
    }]
  },{
    name: '芙蕾雅',
    emoji: '🌿',
    wave: 8,
    skills: [{
      name: '生命绽放',
      icon: '🌿',
      desc: '恢复25%HP',
      type: 'heal',
      heal: 0.25,
      cd: 18,
      castTime: 1.5
    }]
  },{
    name: '尤格-萨隆',
    emoji: '👁️',
    wave: 11
  }],
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
      desc: '6倍暗影伤害',
      type: 'dmg',
      mul: 6,
      cd: 18,
      castTime: 2.5
    }]
  },{
    name: '灵魂吞噬者',
    emoji: '💀',
    wave: 6,
    skills: [{
      name: '灵魂吞噬',
      icon: '💀',
      desc: '7倍伤害+吸血50%',
      type: 'dmg',
      mul: 7,
      lifeSteal: 0.5,
      cd: 20,
      castTime: 2.5
    }]
  },{
    name: '噬魂者布隆亚姆',
    emoji: '👻',
    wave: 11,
    skills: [{
      name: '灵魂洪炉',
      icon: '👻',
      desc: '10倍暗影伤害',
      type: 'dmg',
      mul: 10,
      cd: 28,
      castTime: 4
    },{
      name: '灵魂风暴',
      icon: '💀',
      desc: '8倍AOE必暴',
      type: 'dmg',
      mul: 8,
      alwaysCrit: true,
      cd: 40,
      castTime: 4
    }]
  }],
  desc: '冰冠堡垒的亡灵熔炉'
},{
  key: 'ruby',
  name: '红玉圣殿',
  icon: '💎',
  reqLvl: 80,
  waves: 12,
  cd: 9000,
  bosses: [{
    name: '巴尔萨鲁斯',
    emoji: '🐉',
    wave: 3,
    skills: [{
      name: '黄昏之火',
      icon: '🐉',
      desc: '6倍火焰伤害',
      type: 'dmg',
      mul: 6,
      cd: 18,
      castTime: 2.5
    }]
  },{
    name: '扎里斯利安将军',
    emoji: '🐉',
    wave: 6,
    skills: [{
      name: '暗影之息',
      icon: '🐉',
      desc: '7倍暗影伤害',
      type: 'dmg',
      mul: 7,
      cd: 20,
      castTime: 2.5
    }]
  },{
    name: '暮光龙·萨维安娜',
    emoji: '🐉',
    wave: 9,
    skills: [{
      name: '暮光烈焰',
      icon: '🐉',
      desc: '8倍火焰伤害',
      type: 'dmg',
      mul: 8,
      cd: 24,
      castTime: 3
    },{
      name: '暮光治愈',
      icon: '💜',
      desc: '恢复25%HP',
      type: 'heal',
      heal: 0.25,
      cd: 22,
      castTime: 1.5
    }]
  },{
    name: '海里昂',
    emoji: '🐉',
    wave: 12,
    skills: [{
      name: '暮光切割',
      icon: '🐉',
      desc: '10倍伤害',
      type: 'dmg',
      mul: 10,
      cd: 28,
      castTime: 4
    },{
      name: '红玉之火',
      icon: '💎',
      desc: '9倍必暴',
      type: 'dmg',
      mul: 9,
      alwaysCrit: true,
      cd: 42,
      castTime: 4
    }]
  }],
  desc: '红龙军团的暮光试炼'
},{
  key: 'icc',
  name: '冰冠堡垒',
  icon: '❄️',
  reqLvl: 80,
  waves: 14,
  cd: 10800,
  bosses: [{
    name: '玛洛加尔领主',
    emoji: '🦴',
    wave: 3,
    skills: [{
      name: '骨刺',
      icon: '🦴',
      desc: '6倍伤害',
      type: 'dmg',
      mul: 6,
      cd: 18,
      castTime: 2.5
    }]
  },{
    name: '死亡使者萨鲁法尔',
    emoji: '💀',
    wave: 5,
    skills: [{
      name: '死亡使者之怒',
      icon: '💀',
      desc: '7倍暗影伤害',
      type: 'dmg',
      mul: 7,
      cd: 20,
      castTime: 2.5
    }]
  },{
    name: '普崔塞德教授',
    skills: [{
      name: '毒气弹',
      icon: '🧪',
      desc: '7倍伤害+中毒',
      type: 'dmg',
      mul: 7,
      dot: true,
      cd: 20
    }],
    emoji: '🧪',
    wave: 7
  },{
    name: '鲜血女王兰娜瑟尔',
    skills: [{
      name: '鲜血之咬',
      icon: '🧛‍♀️',
      desc: '8倍伤害+吸血50%',
      type: 'dmg',
      mul: 8,
      lifeSteal: 0.5,
      cd: 22
    }],
    emoji: '🧛‍♀️',
    wave: 9
  },{
    name: '辛达苟萨',
    emoji: '🐉',
    wave: 11,
    skills: [{
      name: '冰霜吐息',
      icon: '❄️',
      desc: '10倍冰霜伤害',
      type: 'dmg',
      mul: 10,
      cd: 26,
      castTime: 4
    },{
      name: '冰墓',
      icon: '❄️',
      desc: '8倍AOE必暴',
      type: 'dmg',
      mul: 8,
      alwaysCrit: true,
      cd: 38,
      castTime: 4
    }]
  },{
    name: '巫妖王',
    emoji: '☠️',
    wave: 14,
    skills: [{
      name: '霜之哀伤',
      icon: '☠️',
      desc: '12倍暗影冰霜',
      type: 'dmg',
      mul: 12,
      cd: 30,
      castTime: 5
    },{
      name: '亡者大军',
      icon: '🧟',
      desc: '10倍AOE必暴',
      type: 'dmg',
      mul: 10,
      alwaysCrit: true,
      cd: 48,
      castTime: 5
    }]
  }],
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
      { name:'霜狼之牙', stats:{atk:1} }, { name:'痛击之刃', stats:{atk:1,crit:1} },
      { name:'克罗之刃', stats:{atk:1} }, { name:'斩魔者', stats:{atk:1,crit:1} },
      { name:'萨隆邪铁短斧', stats:{atk:1} }, { name:'龙骑士长剑', stats:{atk:1,hp:1} },
      { name:'北风之锤', stats:{atk:1} }, { name:'冰霜镰刀', stats:{atk:1,critd:1} },
    ],
    epic: [
      { name:'埃辛诺斯战刃', stats:{atk:2,crit:2} }, { name:'雷霆之怒·逐风者', stats:{atk:2,crit:1} },
      { name:'影之哀伤', stats:{atk:3} }, { name:'瓦兰奈尔·远古王者之锤', stats:{atk:2,hp:2} },
      { name:'萨弗拉斯·炎魔拉格纳罗斯之手', stats:{atk:2,critd:2} }, { name:'索利达尔·群星之怒', stats:{atk:2,crit:2} },
      { name:'奎尔塞拉', stats:{atk:2,def:2} }, { name:'米奈希尔之力', stats:{atk:2,sta:2} },
    ],
    legend: [
      { name:'霜之哀伤', stats:{atk:4,crit:3,critd:3} }, { name:'灰烬使者', stats:{atk:4,hp:3,crit:3} },
      { name:'埃提耶什·守护者的传说之杖', stats:{atk:3,int:3,spi:3} }, { name:'巨龙之怒·泰蕾苟萨的寄魂杖', stats:{atk:3,int:3,critd:3} },
    ],
  },
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
      { name:'伊利达雷面甲', stats:{def:2,crit:2} }, { name:'萨格拉斯的诅咒视界', stats:{def:2,atk:1} },
      { name:'霜火头饰', stats:{def:2,int:2} }, { name:'愤怒之盔', stats:{def:2,str:2} },
      { name:'水晶头冠', stats:{def:2,spi:2} }, { name:'湮灭之盔', stats:{def:2,sta:2} },
    ],
    legend: [
      { name:'巫妖王的王冠', stats:{def:4,hp:3,sta:3} }, { name:'泰坦之盔', stats:{def:4,str:3,crit:2} },
    ],
  },
  shoulder: {
    uncommon: [
      { name:'卫戍护肩', stats:{atk:1} }, { name:'旅行者披肩', stats:{atk:1} },
      { name:'铜丝肩甲', stats:{atk:1} }, { name:'轻羽垫肩', stats:{atk:1} },
    ],
    rare: [
      { name:'龙火肩铠', stats:{atk:1,crit:1} }, { name:'暗影护肩', stats:{atk:1,agi:1} },
      { name:'圣殿骑士肩甲', stats:{atk:1,def:1} }, { name:'奥术师肩垫', stats:{atk:1,int:1} },
      { name:'屠龙者肩铠', stats:{atk:1,hp:1} }, { name:'霜狼肩甲', stats:{atk:1,sta:1} },
    ],
    epic: [
      { name:'污染者肩铠', stats:{atk:2,crit:2} }, { name:'霜火肩垫', stats:{atk:2,int:2} },
      { name:'无尽怒气肩甲', stats:{atk:2,str:2} }, { name:'黑暗低语肩铠', stats:{atk:2,agi:2} },
      { name:'圣光使者肩甲', stats:{atk:2,spi:2} }, { name:'铁壁肩铠', stats:{atk:2,sta:2} },
    ],
    legend: [
      { name:'天灾领主肩铠', stats:{atk:3,crit:3,str:2} },
    ],
  },
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
      { name:'潮汐之怒胸铠', stats:{def:2,sta:2} }, { name:'凤凰之焰长袍', stats:{def:2,crit:2} },
    ],
    legend: [
      { name:'冰封王座胸铠', stats:{def:4,hp:3,str:3} }, { name:'守护巨龙胸甲', stats:{def:4,sta:3,spi:3} },
    ],
  },
  gloves: {
    uncommon: [
      { name:'士兵手套', stats:{crit:1} }, { name:'皮手套', stats:{crit:1} },
      { name:'锁链护手', stats:{crit:1} }, { name:'咒术裹手', stats:{crit:1} },
    ],
    rare: [
      { name:'迅击护手', stats:{crit:1,agi:1} }, { name:'奥术师手套', stats:{crit:1,int:1} },
      { name:'勇气护手', stats:{crit:1,str:1} }, { name:'暗影裹手', stats:{crit:1,crit:1} },
      { name:'圣疗手套', stats:{crit:1,spi:1} }, { name:'铁拳护手', stats:{crit:1,sta:1} },
    ],
    epic: [
      { name:'灵风手套', stats:{crit:1,int:2} }, { name:'血牙手套', stats:{crit:1,agi:2} },
      { name:'无尽勇气护手', stats:{crit:1,str:2} }, { name:'暗影烈焰手套', stats:{crit:1,crit:2} },
      { name:'救赎手套', stats:{crit:1,spi:2} }, { name:'石化护手', stats:{crit:1,sta:2} },
    ],
    legend: [
      { name:'死亡之握', stats:{crit:1,crit:3,agi:2} },
    ],
  },
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
    ],
  },
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
      { name:'潮汐之怒腿铠', stats:{hp:2,sta:2} }, { name:'凤凰之羽长裤', stats:{hp:2,crit:2} },
    ],
    legend: [
      { name:'冰霜巨龙腿甲', stats:{hp:4,sta:3,str:3} },
    ],
  },
  boots: {
    uncommon: [
      { name:'新兵战靴', stats:{crit:1} }, { name:'轻便皮靴', stats:{crit:1} },
      { name:'锁甲靴', stats:{crit:1} }, { name:'布质便鞋', stats:{crit:1} },
    ],
    rare: [
      { name:'迅捷之靴', stats:{crit:1,agi:1} }, { name:'奥术便鞋', stats:{crit:1,int:1} },
      { name:'勇士战靴', stats:{crit:1,str:1} }, { name:'圣光步履', stats:{crit:1,spi:1} },
      { name:'铁踵战靴', stats:{crit:1,sta:1} }, { name:'疾行靴', stats:{crit:1,crit:1} },
    ],
    epic: [
      { name:'暗影烈焰之靴', stats:{crit:1,crit:2} }, { name:'踏冰者', stats:{crit:1,agi:2} },
      { name:'风暴行者', stats:{crit:1,int:2} }, { name:'凯旋胫甲', stats:{crit:1,str:2} },
      { name:'光之步履', stats:{crit:1,spi:2} }, { name:'不毁战靴', stats:{crit:1,sta:2} },
    ],
    legend: [
      { name:'巫妖王的步履', stats:{crit:1,crit:3,agi:2} },
    ],
  },
  ring: {
    uncommon: [
      { name:'铜戒', stats:{crit:1} }, { name:'银戒', stats:{crit:1} },
      { name:'骨戒', stats:{crit:1} }, { name:'石戒', stats:{crit:1} },
    ],
    rare: [
      { name:'龙鳞戒指', stats:{crit:1,atk:1} }, { name:'暗影之戒', stats:{crit:1,agi:1} },
      { name:'奥术之环', stats:{crit:1,int:1} }, { name:'勇士印记', stats:{crit:1,str:1} },
      { name:'圣光之戒', stats:{crit:1,spi:1} }, { name:'要塞指环', stats:{crit:1,sta:1} },
    ],
    epic: [
      { name:'龙王之戒', stats:{crit:2,atk:2} }, { name:'血牙指环', stats:{crit:2,agi:2} },
      { name:'奥术能量之戒', stats:{crit:2,int:2} }, { name:'战神之戒', stats:{crit:2,str:2} },
      { name:'救赎之戒', stats:{crit:2,spi:2} }, { name:'不灭指环', stats:{crit:2,sta:2} },
    ],
    legend: [
      { name:'克尔苏加德的封印', stats:{crit:4,atk:3,int:3} },
    ],
  },
  trinket: {
    uncommon: [
      { name:'幸运兔脚', stats:{sta:1} }, { name:'士兵勋章', stats:{sta:1} },
      { name:'小护符', stats:{sta:1} }, { name:'占卜石', stats:{sta:1} },
    ],
    rare: [
      { name:'龙鳞护符', stats:{sta:1,hp:1} }, { name:'暗影之石', stats:{sta:1,crit:1} },
      { name:'奥术水晶', stats:{sta:1,int:1} }, { name:'勇士勋章', stats:{sta:1,str:1} },
      { name:'圣光护符', stats:{sta:1,spi:1} }, { name:'要塞之印', stats:{sta:1,def:1} },
    ],
    epic: [
      { name:'龙牙饰物', stats:{sta:2,crit:2} }, { name:'暗影之眼', stats:{sta:2,agi:2} },
      { name:'奥术宝珠', stats:{sta:2,int:2} }, { name:'战神徽记', stats:{sta:2,str:2} },
      { name:'救赎之魂', stats:{sta:2,spi:2} }, { name:'不灭之印', stats:{sta:2,hp:2} },
    ],
    legend: [
      { name:'阿尔萨斯的悔恨', stats:{sta:4,hp:3,str:3} },
    ],
  },
};

/* ---------- 副本专属掉落(每个BOSS有独立掉落) ---------- */
const DUNGEON_LOOT = {
  // 怒焰裂谷
  ragefire: { bosses: {
    '邪炉卫士':   [{name:'邪炉战锤',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'熔岩护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,sta:1}}],
    '塔格尔·邪炉': [{name:'邪炉之心',slot:'trinket',rarity:'epic',stats:{sta:2,str:1}},{name:'怒焰长袍',slot:'armor',rarity:'rare',stats:{def:1,int:1}}],
  }, trash:[{name:'焦炭手套',slot:'gloves',rarity:'uncommon',stats:{crit:1}},
	        {name:'怒焰腰带',slot:'belt',rarity:'uncommon',stats:{def:1}}]},
  // 死亡矿井
  deadmines: { bosses: {
    '矿工约翰逊': [{name:'矿工锄',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'矿工头盔',slot:'helmet',rarity:'rare',stats:{def:1,sta:1}}],
    '斯尼德':     [{name:'电锯',slot:'weapon',rarity:'rare',stats:{atk:1,agi:1}},{name:'伐木工手套',slot:'gloves',rarity:'rare',stats:{crit:1,str:1}}],
    '范克瑞斯':   [{name:'残酷倒钩',slot:'weapon',rarity:'epic',stats:{atk:2,agi:2}},{name:'迪菲亚面罩',slot:'helmet',rarity:'rare',stats:{def:1,agi:1}},{name:'兄弟会徽记',slot:'ring',rarity:'rare',stats:{crit:1,agi:1}}],
  }, trash:[{name:'迪菲亚匕首',slot:'weapon',rarity:'uncommon',stats:{atk:1}},
	        {name:'西部荒野背心',slot:'armor',rarity:'uncommon',stats:{def:1}}]},
  // 哀嚎洞穴
  wailing: { bosses: {
    '安娜科德拉': [{name:'毒蛇之刺',slot:'weapon',rarity:'rare',stats:{atk:1,agi:1}},{name:'蛇皮护腿',slot:'pants',rarity:'rare',stats:{hp:1,agi:1}}],
    '斯卡姆':     [{name:'斯卡姆的壳',slot:'armor',rarity:'rare',stats:{def:1,sta:1}},{name:'龙鳞腰带',slot:'belt',rarity:'rare',stats:{def:1,hp:1}}],
    '梦魇之王':   [{name:'梦魇之杖',slot:'weapon',rarity:'epic',stats:{atk:2,int:2}},{name:'梦魇之戒',slot:'ring',rarity:'rare',stats:{crit:1,int:1}},{name:'尖牙护腿',slot:'pants',rarity:'rare',stats:{hp:1,agi:1}}],
  }, trash:[{name:'尖牙皮靴',slot:'boots',rarity:'uncommon',stats:{crit:1}},{name:'蛇鳞护手',slot:'gloves',rarity:'uncommon',stats:{crit:1}}]},
  // 黑暗深渊
  bfd: { bosses: {
    '深渊守卫':   [{name:'深渊之刃',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'深海腰带',slot:'belt',rarity:'rare',stats:{def:1,sta:1}}],
    '格里哈斯特': [{name:'蟹钳之锤',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'珊瑚手套',slot:'gloves',rarity:'rare',stats:{crit:1,agi:1}}],
    '阿库麦尔':   [{name:'阿库麦尔之牙',slot:'weapon',rarity:'epic',stats:{atk:2,agi:2}},{name:'深渊头盔',slot:'helmet',rarity:'rare',stats:{def:1,int:1}},{name:'深渊指环',slot:'ring',rarity:'rare',stats:{crit:1,spi:1}}],
  }, trash:[{name:'鱼鳞护肩',slot:'shoulder',rarity:'uncommon',stats:{atk:1}},{name:'贝壳腰带',slot:'belt',rarity:'uncommon',stats:{def:1}}]},
  // 影牙城堡
  shadowfang: { bosses: {
    '席瓦莱恩男爵':     [{name:'席瓦莱恩之剑',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'男爵腰带',slot:'belt',rarity:'rare',stats:{def:1,str:1}}],
    '指挥官斯普林瓦尔': [{name:'指挥官之盾',slot:'armor',rarity:'rare',stats:{def:1,sta:1}},{name:'斯普林瓦尔之戒',slot:'ring',rarity:'rare',stats:{crit:1,def:1}}],
    '阿鲁高':           [{name:'阿鲁高的法杖',slot:'weapon',rarity:'epic',stats:{atk:2,int:2}},{name:'影牙肩甲',slot:'shoulder',rarity:'rare',stats:{atk:1,agi:1}},{name:'狼王之戒',slot:'ring',rarity:'rare',stats:{crit:1,str:1}}],
  }, trash:[{name:'狼人皮毛腰带',slot:'belt',rarity:'uncommon',stats:{def:1}},{name:'银松肩垫',slot:'shoulder',rarity:'uncommon',stats:{atk:1}}]},
  // 诺莫瑞根
  gnomeregan: { bosses: {
    '电刑器6000型':     [{name:'电刑器线圈',slot:'ring',rarity:'rare',stats:{crit:1,int:1}},{name:'避雷护腿',slot:'pants',rarity:'rare',stats:{hp:1,sta:1}}],
    '群体打击者9-60':   [{name:'群体打击者之臂',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'机械手套',slot:'gloves',rarity:'rare',stats:{crit:1,str:1}}],
    '机械师瑟玛普拉格': [{name:'瑟玛普拉格的机械臂',slot:'weapon',rarity:'epic',stats:{atk:2,str:2}},{name:'侏儒工程头盔',slot:'helmet',rarity:'rare',stats:{def:1,int:1}},{name:'工程师徽记',slot:'trinket',rarity:'rare',stats:{sta:1,int:1}}],
  }, trash:[{name:'齿轮腰带',slot:'belt',rarity:'uncommon',stats:{def:1}},{name:'焊接口罩',slot:'helmet',rarity:'uncommon',stats:{def:1}}]},
  // 剃刀沼泽
  razorfen: { bosses: {
    '主宰拉姆塔斯': [{name:'拉姆塔斯之角',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'荆棘腰带',slot:'belt',rarity:'rare',stats:{def:1,str:1}}],
    '阿格姆':       [{name:'阿格姆之锤',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'藤蔓手套',slot:'gloves',rarity:'rare',stats:{crit:1,sta:1}}],
    '卡尔加·刺肋': [{name:'刺肋之斧',slot:'weapon',rarity:'epic',stats:{atk:2,str:2}},{name:'荆棘护胸',slot:'armor',rarity:'rare',stats:{def:1,sta:1}},{name:'野猪之牙',slot:'trinket',rarity:'rare',stats:{sta:1,str:1}}],
  }, trash:[{name:'棘刺护腿',slot:'pants',rarity:'uncommon',stats:{hp:1}},{name:'野猪皮手套',slot:'gloves',rarity:'uncommon',stats:{crit:1}}]},
  // 血色修道院
  scarlet: { bosses: {
    '血色十字军指挥官': [{name:'指挥官之盾',slot:'armor',rarity:'rare',stats:{def:1,sta:1}},{name:'十字军腰带',slot:'belt',rarity:'rare',stats:{def:1,str:1}}],
    '赫洛德':           [{name:'赫洛德的肩甲',slot:'shoulder',rarity:'rare',stats:{atk:1,str:1}},{name:'血色战靴',slot:'boots',rarity:'rare',stats:{crit:1,str:1}}],
    '奥法师杜安':       [{name:'杜安的法杖',slot:'weapon',rarity:'rare',stats:{atk:1,int:1}},{name:'奥术师手套',slot:'gloves',rarity:'rare',stats:{crit:1,int:1}}],
    '莫格莱尼':         [{name:'莫格莱尼的力量',slot:'weapon',rarity:'epic',stats:{atk:2,str:2}},{name:'血色十字军战盔',slot:'helmet',rarity:'rare',stats:{def:1,str:1}},{name:'狂热者之戒',slot:'ring',rarity:'rare',stats:{crit:1,spi:1}}],
  }, trash:[{name:'血色肩甲',slot:'shoulder',rarity:'uncommon',stats:{atk:1}},{name:'狂热者手套',slot:'gloves',rarity:'uncommon',stats:{crit:1}}]},
  // 剃刀高地
  razorfend: { bosses: {
    '图特卡什':       [{name:'蜘蛛牙短剑',slot:'weapon',rarity:'rare',stats:{atk:1,agi:1}},{name:'蛛丝腰带',slot:'belt',rarity:'rare',stats:{def:1,agi:1}}],
    '火眼莫德雷斯':   [{name:'莫德雷斯之眼',slot:'trinket',rarity:'rare',stats:{sta:1,int:1}},{name:'火焰手套',slot:'gloves',rarity:'rare',stats:{crit:1,int:1}}],
    '巫妖寒冰之王':   [{name:'寒冰之王的节杖',slot:'weapon',rarity:'epic',stats:{atk:2,int:2}},{name:'骨棘胸甲',slot:'armor',rarity:'rare',stats:{def:1,sta:1}},{name:'寒冰之戒',slot:'ring',rarity:'rare',stats:{crit:1,int:1}}],
  }, trash:[{name:'白骨护腿',slot:'pants',rarity:'uncommon',stats:{hp:1}},{name:'亡灵手套',slot:'gloves',rarity:'uncommon',stats:{crit:1}}]},
  // 奥达曼
  uldaman: { bosses: {
    '艾隆纳亚':   [{name:'艾隆纳亚的石锤',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'石腭腰带',slot:'belt',rarity:'rare',stats:{def:1,sta:1}}],
    '石窟织石者': [{name:'织石者手套',slot:'gloves',rarity:'rare',stats:{crit:1,int:1}},{name:'遗迹护腿',slot:'pants',rarity:'rare',stats:{hp:1,sta:1}}],
    '阿扎达斯':   [{name:'阿扎达斯之锤',slot:'weapon',rarity:'epic',stats:{atk:2,str:2}},{name:'泰坦石板护胸',slot:'armor',rarity:'rare',stats:{def:1,sta:1}},{name:'土灵之戒',slot:'ring',rarity:'rare',stats:{crit:1,def:1}}],
  }, trash:[{name:'土灵腰带',slot:'belt',rarity:'uncommon',stats:{def:1}},{name:'遗迹手套',slot:'gloves',rarity:'uncommon',stats:{crit:1}}]},
  // 玛拉顿
  maraudon: { bosses: {
    '诺克赛恩':       [{name:'诺克赛恩之刺',slot:'weapon',rarity:'rare',stats:{atk:1,agi:1}},{name:'藤蔓束腰',slot:'belt',rarity:'rare',stats:{def:1,spi:1}}],
    '工匠吉兹洛克':   [{name:'吉兹洛克之锤',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'石花护手',slot:'gloves',rarity:'rare',stats:{crit:1,str:1}}],
    '瑟莱德丝公主':   [{name:'瑟莱德丝之拥',slot:'weapon',rarity:'epic',stats:{atk:2,int:2}},{name:'自然守护者胸甲',slot:'armor',rarity:'rare',stats:{def:1,spi:1}},{name:'腐败之戒',slot:'ring',rarity:'rare',stats:{crit:1,sta:1}}],
  }, trash:[{name:'石花腰带',slot:'belt',rarity:'uncommon',stats:{def:1}},{name:'丛林手套',slot:'gloves',rarity:'uncommon',stats:{crit:1}}]},
  // 祖尔法拉克
  zulfarrak: { bosses: {
    '暗影祭司塞瑟斯': [{name:'塞瑟斯的匕首',slot:'weapon',rarity:'rare',stats:{atk:1,crit:1}},{name:'沙行护腿',slot:'pants',rarity:'rare',stats:{hp:1,agi:1}}],
    '乌克兹·沙顶':   [{name:'沙顶之锤',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'沙漠腰带',slot:'belt',rarity:'rare',stats:{def:1,sta:1}}],
    '巫医祖穆拉恩':   [{name:'祖穆拉恩的祭祀之刃',slot:'weapon',rarity:'epic',stats:{atk:2,crit:2}},{name:'沙怒头巾',slot:'helmet',rarity:'rare',stats:{def:1,int:1}},{name:'巨魔护符',slot:'trinket',rarity:'rare',stats:{sta:1,crit:1}}],
  }, trash:[{name:'沙怒护肩',slot:'shoulder',rarity:'uncommon',stats:{atk:1}},{name:'巨魔手套',slot:'gloves',rarity:'uncommon',stats:{crit:1}}]},
  // 沉没的神庙
  sunktemple: { bosses: {
    '哈卡的化身':       [{name:'哈卡之牙',slot:'weapon',rarity:'rare',stats:{atk:1,agi:1}},{name:'翡翠护腿',slot:'pants',rarity:'rare',stats:{hp:1,spi:1}}],
    '德姆塞卡尔':       [{name:'德姆塞卡尔的龙鳞',slot:'shoulder',rarity:'rare',stats:{atk:1,sta:1}},{name:'龙人腰带',slot:'belt',rarity:'rare',stats:{def:1,hp:1}}],
    '伊兰尼库斯之影':   [{name:'伊兰尼库斯之角',slot:'weapon',rarity:'epic',stats:{atk:2,crit:2}},{name:'龙鳞肩铠',slot:'shoulder',rarity:'rare',stats:{atk:1,sta:1}},{name:'沉睡者之戒',slot:'ring',rarity:'rare',stats:{crit:1,spi:1}}],
  }, trash:[{name:'龙人护肩',slot:'shoulder',rarity:'uncommon',stats:{atk:1}},{name:'翡翠腰带',slot:'belt',rarity:'uncommon',stats:{def:1}}]},
  // 通灵学院
  scholomance: { bosses: {
    '詹迪斯·巴罗夫':         [{name:'巴罗夫家族长剑',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'白骨手套',slot:'gloves',rarity:'rare',stats:{crit:1,int:1}}],
    '黑暗院长加丁':           [{name:'加丁的黑暗法杖',slot:'weapon',rarity:'rare',stats:{atk:1,int:1}},{name:'黑暗腰带',slot:'belt',rarity:'rare',stats:{def:1,int:1}}],
    '拉斯·弗罗斯特维斯帕':   [{name:'拉斯·弗罗斯特的法杖',slot:'weapon',rarity:'epic',stats:{atk:2,int:2}},{name:'亡灵仪祭头盔',slot:'helmet',rarity:'rare',stats:{def:1,int:1}},{name:'黑暗符文戒指',slot:'ring',rarity:'rare',stats:{crit:1,int:1}}],
  }, trash:[{name:'亡灵手套',slot:'gloves',rarity:'uncommon',stats:{crit:1}},{name:'白骨腰带',slot:'belt',rarity:'uncommon',stats:{def:1}}]},
  // 黑石深渊
  brd: { bosses: {
    '弗诺斯·达克维尔':       [{name:'达克维尔的宝库钥匙',slot:'ring',rarity:'rare',stats:{crit:1,sta:1}},{name:'黑铁腰带',slot:'belt',rarity:'rare',stats:{def:1,str:1}}],
    '贝尔加':                 [{name:'贝尔加之锤',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'熔岩护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,sta:1}}],
    '弗莱拉斯大使':           [{name:'大使之杖',slot:'weapon',rarity:'rare',stats:{atk:1,int:1}},{name:'黑铁手套',slot:'gloves',rarity:'rare',stats:{crit:1,int:1}}],
    '达格兰·索瑞森大帝':     [{name:'索瑞森皇家节杖',slot:'weapon',rarity:'epic',stats:{atk:2,str:2}},{name:'黑铁战盔',slot:'helmet',rarity:'rare',stats:{def:1,sta:1}},{name:'熔火徽记',slot:'trinket',rarity:'rare',stats:{sta:1,def:1}}],
  }, trash:[{name:'黑铁护手',slot:'gloves',rarity:'uncommon',stats:{crit:1}},{name:'暗炉腰带',slot:'belt',rarity:'uncommon',stats:{def:1}}]},
  // 斯坦索姆
  stratholme: { bosses: {
    '悲惨的提米':     [{name:'提米的玩具锤',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'亡灵腰带',slot:'belt',rarity:'rare',stats:{def:1,sta:1}}],
    '炮手威利':       [{name:'威利的炸弹发射器',slot:'weapon',rarity:'rare',stats:{atk:1,agi:1}},{name:'火药护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,agi:1}}],
    '巴纳扎尔':       [{name:'巴纳扎尔的恐惧之刃',slot:'weapon',rarity:'rare',stats:{atk:1,crit:1}},{name:'恶魔之戒',slot:'ring',rarity:'rare',stats:{crit:1,atk:1}}],
    '瑞文戴尔男爵':   [{name:'瑞文戴尔之剑',slot:'weapon',rarity:'epic',stats:{atk:2,str:2}},{name:'亡灵领主头盔',slot:'helmet',rarity:'rare',stats:{def:1,sta:1}},{name:'死亡骑士之戒',slot:'ring',rarity:'rare',stats:{crit:1,str:1}}],
  }, trash:[{name:'瘟疫手套',slot:'gloves',rarity:'uncommon',stats:{crit:1}},{name:'亡灵肩甲',slot:'shoulder',rarity:'uncommon',stats:{atk:1}}]},
  // 熔火之心
  mc: { bosses: {
    '鲁西弗隆':   [{name:'鲁西弗隆的诅咒',slot:'trinket',rarity:'rare',stats:{sta:1,crit:1}},{name:'火焰手套',slot:'gloves',rarity:'rare',stats:{crit:1,int:1}}],
    '玛格曼达':   [{name:'玛格曼达的獠牙',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'熔岩护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,sta:1}}],
    '加尔':       [{name:'加尔之石',slot:'trinket',rarity:'rare',stats:{sta:1,def:1}},{name:'熔岩腰带',slot:'belt',rarity:'rare',stats:{def:1,sta:1}}],
    '迦顿男爵':   [{name:'迦顿的火焰之剑',slot:'weapon',rarity:'epic',stats:{atk:2,str:2}},{name:'烈焰行者护腿',slot:'pants',rarity:'rare',stats:{hp:1,sta:1}}],
    '拉格纳罗斯': [{name:'萨弗隆战锤',slot:'weapon',rarity:'legend',stats:{atk:4,crit:3,str:3}},{name:'火焰之王头盔',slot:'helmet',rarity:'epic',stats:{def:2,sta:2}},{name:'熔岩之环',slot:'ring',rarity:'epic',stats:{crit:2,int:2}}],
  }, trash:[{name:'熔岩护手',slot:'gloves',rarity:'rare',stats:{crit:1,sta:1}},{name:'黑铁战靴',slot:'boots',rarity:'rare',stats:{crit:1,sta:1}},{name:'炽热腰带',slot:'belt',rarity:'rare',stats:{def:1,str:1}}]},
  // 法力陵墓
  manatombs: { bosses: {
    '潘德莫努斯':       [{name:'潘德莫努斯之刃',slot:'weapon',rarity:'rare',stats:{atk:1,agi:1}},{name:'虚空裹手',slot:'gloves',rarity:'rare',stats:{crit:1,int:1}}],
    '塔瓦洛克':         [{name:'塔瓦洛克的石拳',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'暗影腰带',slot:'belt',rarity:'rare',stats:{def:1,sta:1}}],
    '节点亲王沙法尔':   [{name:'沙法尔的虚空法杖',slot:'weapon',rarity:'epic',stats:{atk:2,int:2}},{name:'能量灌注戒指',slot:'ring',rarity:'rare',stats:{crit:1,int:1}},{name:'虚空护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,int:1}}],
  }, trash:[{name:'奥金顿手套',slot:'gloves',rarity:'uncommon',stats:{crit:1}},{name:'虚空腰带',slot:'belt',rarity:'uncommon',stats:{def:1}}]},
  // 黑翼之巢
  bwl: { bosses: {
    '狂野的拉佐格尔':     [{name:'拉佐格尔之爪',slot:'weapon',rarity:'rare',stats:{atk:1,agi:1}},{name:'黑翼护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,agi:1}}],
    '堕落的瓦拉斯塔兹':   [{name:'瓦拉斯塔兹之角',slot:'trinket',rarity:'rare',stats:{sta:1,crit:1}},{name:'龙人手套',slot:'gloves',rarity:'rare',stats:{crit:1,crit:1}}],
    '克洛玛古斯':         [{name:'克洛玛古斯之牙',slot:'weapon',rarity:'epic',stats:{atk:2,agi:2}},{name:'多彩龙鳞腰带',slot:'belt',rarity:'rare',stats:{def:1,hp:1}}],
    '奈法利安':           [{name:'暗影烈焰法杖',slot:'weapon',rarity:'legend',stats:{atk:4,crit:3,int:3}},{name:'黑龙王头盔',slot:'helmet',rarity:'epic',stats:{def:2,crit:2}},{name:'龙牙饰物',slot:'trinket',rarity:'epic',stats:{sta:2,crit:2}}],
  }, trash:[{name:'黑龙肩甲',slot:'shoulder',rarity:'rare',stats:{atk:1,sta:1}},{name:'黑翼手套',slot:'gloves',rarity:'rare',stats:{crit:1,agi:1}},{name:'龙人腰带',slot:'belt',rarity:'rare',stats:{def:1,hp:1}}]},
  // 蒸汽地窟
  steamvault: { bosses: {
    '水术师瑟丝比亚':   [{name:'瑟丝比亚的水晶杖',slot:'weapon',rarity:'rare',stats:{atk:1,int:1}},{name:'盘牙手套',slot:'gloves',rarity:'rare',stats:{crit:1,int:1}}],
    '机械师斯蒂里格':   [{name:'斯蒂里格的扳手',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'蒸汽腰带',slot:'belt',rarity:'rare',stats:{def:1,str:1}}],
    '督军卡利瑟里斯':   [{name:'卡利瑟里斯的战斗斧',slot:'weapon',rarity:'epic',stats:{atk:2,str:2}},{name:'蒸汽护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,sta:1}},{name:'盘牙徽记',slot:'trinket',rarity:'rare',stats:{sta:1,str:1}}],
  }, trash:[{name:'沼泽护肩',slot:'shoulder',rarity:'uncommon',stats:{atk:1}},{name:'蒸汽手套',slot:'gloves',rarity:'uncommon',stats:{crit:1}}]},
  // 纳克萨玛斯
  naxx: { bosses: {
    '阿努布雷坎': [{name:'阿努布雷坎的蛛牙',slot:'weapon',rarity:'rare',stats:{atk:1,agi:1}},{name:'蛛魔腰带',slot:'belt',rarity:'rare',stats:{def:1,agi:1}}],
    '帕奇维克':   [{name:'帕奇维克的屠刀',slot:'weapon',rarity:'epic',stats:{atk:2,str:2}},{name:'憎恶手套',slot:'gloves',rarity:'rare',stats:{crit:1,str:1}}],
    '塔迪乌斯':   [{name:'塔迪乌斯的闪电护肩',slot:'shoulder',rarity:'epic',stats:{atk:2,crit:1}},{name:'电击之戒',slot:'ring',rarity:'rare',stats:{crit:1,crit:1}}],
    '萨菲隆':     [{name:'萨菲隆的冰霜之息',slot:'trinket',rarity:'epic',stats:{sta:2,int:2}},{name:'冰霜巨龙腿甲',slot:'pants',rarity:'rare',stats:{hp:1,sta:1}}],
    '克尔苏加德': [{name:'克尔苏加德的法杖',slot:'weapon',rarity:'legend',stats:{atk:4,crit:3,int:3}},{name:'霜火头饰',slot:'helmet',rarity:'epic',stats:{def:2,int:2}},{name:'白骨之环',slot:'ring',rarity:'epic',stats:{crit:2,atk:2}}],
  }, trash:[{name:'天灾护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,sta:1}},{name:'瘟疫手套',slot:'gloves',rarity:'rare',stats:{crit:1,int:1}},{name:'亡灵壁垒腰带',slot:'belt',rarity:'rare',stats:{def:1,def:1}}]},
  // 魔导师平台
  magister: { bosses: {
    '塞林·火心':         [{name:'火心之剑',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'血精灵护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,int:1}}],
    '女祭司德莉希亚':     [{name:'德莉希亚的圣光之锤',slot:'weapon',rarity:'rare',stats:{atk:1,spi:1}},{name:'奥术腰带',slot:'belt',rarity:'rare',stats:{def:1,int:1}}],
    '凯尔萨斯·逐日者':   [{name:'凯尔萨斯的凤凰之刃',slot:'weapon',rarity:'legend',stats:{atk:4,int:3,crit:3}},{name:'日怒肩垫',slot:'shoulder',rarity:'epic',stats:{atk:2,int:2}},{name:'炎刃手套',slot:'gloves',rarity:'epic',stats:{crit:1,crit:2}}],
  }, trash:[{name:'日怒手套',slot:'gloves',rarity:'rare',stats:{crit:1,int:1}},{name:'银月腰带',slot:'belt',rarity:'rare',stats:{def:1,int:1}}]},
  // 卡拉赞
  karazhan: { bosses: {
    '猎手阿图门': [{name:'阿图门之剑',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'午夜马鞍',slot:'belt',rarity:'rare',stats:{def:1,agi:1}}],
    '莫罗斯':     [{name:'莫罗斯的幸运怀表',slot:'trinket',rarity:'rare',stats:{sta:1,crit:1}},{name:'管家手套',slot:'gloves',rarity:'rare',stats:{crit:1,agi:1}}],
    '馆长':       [{name:'馆长的奥术核心',slot:'trinket',rarity:'epic',stats:{sta:2,int:2}},{name:'奥术护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,int:1}}],
    '麦迪文':     [{name:'麦迪文的法杖',slot:'weapon',rarity:'legend',stats:{atk:4,int:3,spi:3}},{name:'守护者头盔',slot:'helmet',rarity:'epic',stats:{def:2,int:2}},{name:'卡拉赞徽记',slot:'trinket',rarity:'epic',stats:{sta:2,int:2}}],
  }, trash:[{name:'占星者手套',slot:'gloves',rarity:'rare',stats:{crit:1,int:1}},{name:'奥术腰带',slot:'belt',rarity:'rare',stats:{def:1,int:1}}]},
  // 闪电大厅
  hol: { bosses: {
    '比亚格里将军': [{name:'比亚格里的战锤',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'风暴护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,sta:1}}],
    '沃尔坎':       [{name:'沃尔坎的熔岩拳套',slot:'gloves',rarity:'rare',stats:{crit:1,str:1}},{name:'铁矮人护腿',slot:'pants',rarity:'rare',stats:{hp:1,sta:1}}],
    '洛肯':         [{name:'洛肯的闪电之锤',slot:'weapon',rarity:'epic',stats:{atk:3,str:2}},{name:'雷霆头盔',slot:'helmet',rarity:'epic',stats:{def:2,sta:2}},{name:'闪电之戒',slot:'ring',rarity:'rare',stats:{crit:1,crit:1}}],
  }, trash:[{name:'铁矮人手套',slot:'gloves',rarity:'rare',stats:{crit:1,str:1}},{name:'风暴腰带',slot:'belt',rarity:'rare',stats:{def:1,sta:1}}]},
  // 冠军的试炼
  toc: { bosses: {
    '银色勇士':           [{name:'银色勇士之剑',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'银白护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,spi:1}}],
    '黑骑士':             [{name:'黑骑士之刃',slot:'weapon',rarity:'rare',stats:{atk:1,crit:1}},{name:'暗影战靴',slot:'boots',rarity:'rare',stats:{crit:1,str:1}}],
    '纯洁者耶德瑞克':     [{name:'纯洁者的圣光之锤',slot:'weapon',rarity:'rare',stats:{atk:1,spi:1}},{name:'圣光腰带',slot:'belt',rarity:'rare',stats:{def:1,spi:1}}],
    '银白十字军冠军':     [{name:'冠军的荣耀之剑',slot:'weapon',rarity:'epic',stats:{atk:3,crit:3}},{name:'银白十字军战盔',slot:'helmet',rarity:'epic',stats:{def:2,str:2}},{name:'冠军徽记',slot:'trinket',rarity:'epic',stats:{sta:2,crit:2}}],
  }, trash:[{name:'银白手套',slot:'gloves',rarity:'rare',stats:{crit:1,spi:1}},{name:'十字军战靴',slot:'boots',rarity:'rare',stats:{crit:1,str:1}}]},
  // 太阳之井
  sunwell: { bosses: {
    '卡雷苟斯':   [{name:'卡雷苟斯之鳞',slot:'armor',rarity:'rare',stats:{def:1,int:1}},{name:'蓝龙之戒',slot:'ring',rarity:'rare',stats:{crit:1,int:1}}],
    '布鲁塔卢斯': [{name:'布鲁塔卢斯的断角',slot:'weapon',rarity:'epic',stats:{atk:2,str:2}},{name:'恶魔护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,str:1}}],
    '艾瑞达双子': [{name:'双子之刃',slot:'weapon',rarity:'epic',stats:{atk:2,crit:2}},{name:'双子之环',slot:'ring',rarity:'rare',stats:{crit:1,atk:1}}],
    '基尔加丹':   [{name:'索利达尔·群星之怒',slot:'weapon',rarity:'legend',stats:{atk:4,crit:4,agi:3}},{name:'基尔加丹的冠冕',slot:'helmet',rarity:'epic',stats:{def:2,crit:2}},{name:'永恒之光胸甲',slot:'armor',rarity:'epic',stats:{def:2,spi:2}}],
  }, trash:[{name:'日怒肩垫',slot:'shoulder',rarity:'rare',stats:{atk:1,int:1}},{name:'炎刃手套',slot:'gloves',rarity:'rare',stats:{crit:1,crit:1}}]},
  // 奥杜尔
  ulduar: { bosses: {
    '烈焰巨兽': [{name:'烈焰巨兽的活塞',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'泰坦护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,sta:1}}],
    '钢铁议会': [{name:'钢铁议会之锤',slot:'weapon',rarity:'rare',stats:{atk:1,str:1}},{name:'符文手套',slot:'gloves',rarity:'rare',stats:{crit:1,int:1}}],
    '芙蕾雅':   [{name:'芙蕾雅的自然法杖',slot:'weapon',rarity:'epic',stats:{atk:2,spi:2}},{name:'自然之环',slot:'ring',rarity:'rare',stats:{crit:1,spi:1}}],
    '尤格-萨隆':[{name:'瓦兰奈尔·远古王者之锤',slot:'weapon',rarity:'legend',stats:{atk:4,hp:3,spi:3}},{name:'尤格萨隆的触须之盔',slot:'helmet',rarity:'epic',stats:{def:2,sta:2}},{name:'泰坦之戒',slot:'ring',rarity:'epic',stats:{crit:2,sta:2}}],
  }, trash:[{name:'钢铁腰带',slot:'belt',rarity:'rare',stats:{def:1,sta:1}},{name:'泰坦手套',slot:'gloves',rarity:'rare',stats:{crit:1,sta:1}}]},
  // 灵魂洪炉
  forge: { bosses: {
    '布隆亚姆':         [{name:'布隆亚姆的镰刀',slot:'weapon',rarity:'rare',stats:{atk:1,agi:1}},{name:'灵魂护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,int:1}}],
    '灵魂吞噬者':       [{name:'灵魂吞噬者之爪',slot:'gloves',rarity:'rare',stats:{crit:1,crit:1}},{name:'痛苦腰带',slot:'belt',rarity:'rare',stats:{def:1,crit:1}}],
    '噬魂者布隆亚姆':   [{name:'噬魂者之镰',slot:'weapon',rarity:'legend',stats:{atk:4,crit:3,agi:3}},{name:'灵魂熔炉头盔',slot:'helmet',rarity:'epic',stats:{def:2,sta:2}},{name:'噬魂之戒',slot:'ring',rarity:'epic',stats:{crit:2,atk:2}}],
  }, trash:[{name:'灵魂手套',slot:'gloves',rarity:'rare',stats:{crit:1,int:1}},{name:'熔炉腰带',slot:'belt',rarity:'rare',stats:{def:1,sta:1}}]},
  // 红玉圣殿
  ruby: { bosses: {
    '巴尔萨鲁斯':         [{name:'巴尔萨鲁斯的龙鳞',slot:'shoulder',rarity:'rare',stats:{atk:1,sta:1}},{name:'红龙护肩',slot:'shoulder',rarity:'rare',stats:{atk:1,hp:1}}],
    '扎里斯利安将军':     [{name:'将军的龙鳞护手',slot:'gloves',rarity:'rare',stats:{crit:1,str:1}},{name:'暮光腰带',slot:'belt',rarity:'rare',stats:{def:1,sta:1}}],
    '暮光龙·萨维安娜':    [{name:'萨维安娜的龙牙',slot:'weapon',rarity:'epic',stats:{atk:2,crit:2}},{name:'暮光龙鳞胸甲',slot:'armor',rarity:'rare',stats:{def:1,hp:1}}],
    '海里昂':             [{name:'海里昂的龙鳞法杖',slot:'weapon',rarity:'legend',stats:{atk:4,int:3,spi:3}},{name:'红玉龙鳞头盔',slot:'helmet',rarity:'epic',stats:{def:2,hp:2}},{name:'暮光徽记',slot:'trinket',rarity:'epic',stats:{sta:2,crit:2}}],
  }, trash:[{name:'暮光手套',slot:'gloves',rarity:'rare',stats:{crit:1,int:1}},{name:'红玉腰带',slot:'belt',rarity:'rare',stats:{def:1,hp:1}}]},
  // 冰冠堡垒
  icc: { bosses: {
    '玛洛加尔领主':       [{name:'玛洛加尔的骨刺',slot:'weapon',rarity:'rare',stats:{atk:1,crit:1}},{name:'白骨腰带',slot:'belt',rarity:'rare',stats:{def:1,str:1}}],
    '死亡使者萨鲁法尔':   [{name:'萨鲁法尔的战斧',slot:'weapon',rarity:'epic',stats:{atk:2,str:2}},{name:'死亡使者肩铠',slot:'shoulder',rarity:'rare',stats:{atk:1,str:1}}],
    '普崔塞德教授':       [{name:'教授的实验瓶',slot:'trinket',rarity:'epic',stats:{sta:2,int:2}},{name:'瘟疫科学家手套',slot:'gloves',rarity:'rare',stats:{crit:1,int:1}}],
    '鲜血女王兰娜瑟尔':   [{name:'兰娜瑟尔的鲜血之牙',slot:'weapon',rarity:'epic',stats:{atk:2,agi:2}},{name:'鲜血女王之戒',slot:'ring',rarity:'rare',stats:{crit:1,atk:1}}],
    '辛达苟萨':           [{name:'辛达苟萨的冰霜之息',slot:'trinket',rarity:'epic',stats:{sta:2,crit:2}},{name:'冰霜巨龙腿甲',slot:'pants',rarity:'epic',stats:{hp:2,str:2}}],
    '巫妖王':             [{name:'影之哀伤',slot:'weapon',rarity:'legend',stats:{atk:5,crit:4,str:4}},{name:'巫妖王的王冠',slot:'helmet',rarity:'epic',stats:{def:3,str:3}},{name:'阿尔萨斯的悔恨',slot:'trinket',rarity:'epic',stats:{sta:3,str:3}},{name:'冰封王座胸铠',slot:'armor',rarity:'epic',stats:{def:3,sta:3}}],
  }, trash:[{name:'天灾领主肩铠',slot:'shoulder',rarity:'rare',stats:{atk:1,str:1}},{name:'死亡之握',slot:'gloves',rarity:'rare',stats:{crit:1,crit:1}},{name:'冰霜壁垒腰带',slot:'belt',rarity:'rare',stats:{def:1,sta:1}},{name:'灵魂洪炉战靴',slot:'boots',rarity:'rare',stats:{crit:1,str:1}}]},
};
/* ========== COMPANIONS(2026-06-15 大修)==========
   品质=按背景设定固定(不可升级),技能数=品质等级(白1→橙5)
   mult=战力系数(越稀有越强),weight=抽卡权重,starsMax=可升星上限 */
const COMPANION_QUALITY=[
  {key:"white", name:"普通", cls:"r-common",   mult:0.65, skills:1, weight:46, lore:"无名之辈 / 杂兵"},
  {key:"green", name:"优秀", cls:"r-uncommon", mult:0.95, skills:2, weight:30, lore:"小有名气"},
  {key:"blue",  name:"精良", cls:"r-rare",     mult:1.35, skills:3, weight:16, lore:"中流砥柱"},
  {key:"purple",name:"史诗", cls:"r-epic",     mult:1.9,  skills:4, weight:6.5, lore:"一方霸主"},
  {key:"orange",name:"传说", cls:"r-legend",   mult:2.8,  skills:5, weight:1.5, lore:"传奇人物"},
];
/* 定位加成(出战随从额外给主角的属性,体现坦克/治疗/输出差异) */
const ROLE_BONUS={
  tank:{defPct:12, hpPct:10},
  heal:{regFlat:8, hpPct:6, vers:3},
  dps:{atkPct:4, crit:3},
};
/* 羁绊:集齐 keys 中全部随从即激活,给主角额外加成 */
const COMPANION_BONDS=[
  {name:"守护者之力", keys:["medivh","jaina"],            mod:{atkPct:3,crit:4},   desc:"麦迪文 + 吉安娜"},
  {name:"燃烧军团",   keys:["kiljaeden","azshara"],       mod:{atkPct:3,critdPct:8},desc:"基尔加丹 + 艾萨拉"},
  {name:"天灾降临",   keys:["lichking","kelthuzad"],      mod:{atkPct:2,leech:6},  desc:"巫妖王 + 克尔苏加德"},
  {name:"怒风兄弟",   keys:["illidan","malfurion"],       mod:{atkPct:2,hpPct:5},  desc:"伊利丹 + 玛法里奥"},
  {name:"乌瑞恩王室", keys:["varian","anduin"],           mod:{hpPct:6,atkPct:2},  desc:"瓦里安 + 安度因"},
  {name:"大酋长之路", keys:["thrall","saurfang"],         mod:{atkPct:2,vers:4},   desc:"萨尔 + 萨鲁法尔"},
  {name:"白银之手",   keys:["fordring","maraad"],         mod:{hpPct:6,defPct:4},  desc:"提里奥 + 玛拉达尔"},
];
function compQuality(tpl){ return COMPANION_QUALITY.find(q=>q.key===(tpl&&tpl.quality)) || COMPANION_QUALITY[0]; }
const COMPANIONS=[{key:"fordring",name:"提里奥·弗丁",emoji:"👴",role:"tank",desc:"白银之手大领主",skills:[{name:"圣光审判",icon:"⚖️",desc:"2.5倍伤害,回复5%HP",type:"dmg",mul:2.5,heal:0.05,cd:10},{name:"圣盾守护",icon:"🛡️",desc:"8秒减伤40%",type:"buff",buff:"shield",cd:22},{name:"灰烬觉醒",icon:"✨",desc:"5倍伤害",type:"dmg",mul:5,cd:20},{name:"圣疗术",icon:"💚",desc:"恢复25%HP",type:"heal",heal:0.25,cd:30}]},{key:"varian",name:"瓦里安·乌瑞恩",emoji:"👑",role:"tank",desc:"暴风城国王",skills:[{name:"冲锋",icon:"💨",desc:"2倍伤害",type:"dmg",mul:2,cd:6},{name:"破甲",icon:"🔨",desc:"3倍伤害降防",type:"dmg",mul:3,cd:12},{name:"剑刃风暴",icon:"🌀",desc:"6倍伤害",type:"dmg",mul:6,cd:25},{name:"怒吼",icon:"📯",desc:"10秒攻击+15%",type:"buff",buff:"battleShout",cd:30}]},{key:"thrall",name:"萨尔",emoji:"👊",role:"tank",desc:"部落大酋长",skills:[{name:"闪电箭",icon:"⚡",desc:"2倍伤害",type:"dmg",mul:2,cd:6},{name:"大地之盾",icon:"🪨",desc:"8秒防御+40%",type:"buff",buff:"earthShield",cd:20},{name:"雷霆风暴",icon:"⛈️",desc:"5倍伤害",type:"dmg",mul:5,cd:18},{name:"治疗波",icon:"🌊",desc:"恢复20%HP",type:"heal",heal:0.2,cd:25}]},{key:"illidan",name:"伊利丹·怒风",emoji:"😈",role:"dps",desc:"背叛者",skills:[{name:"恶魔之咬",icon:"🦷",desc:"3倍伤害",type:"dmg",mul:3,cd:8},{name:"眼棱",icon:"👁️",desc:"4倍必暴",type:"dmg",mul:4,alwaysCrit:true,cd:16},{name:"恶魔变形",icon:"😈",desc:"10秒攻击+30%",type:"buff",buff:"bestial",cd:28},{name:"混沌打击",icon:"💥",desc:"6倍伤害",type:"dmg",mul:6,cd:24}]},{key:"arthas",name:"阿尔萨斯",emoji:"⚔️",role:"dps",desc:"洛丹伦王子",skills:[{name:"死亡缠绕",icon:"💀",desc:"3倍伤害吸血20%",type:"dmg",mul:3,lifeSteal:0.2,cd:10},{name:"凛风冲击",icon:"❄️",desc:"4倍伤害",type:"dmg",mul:4,cd:14},{name:"亡者大军",icon:"🧟",desc:"6倍伤害",type:"dmg",mul:6,cd:22},{name:"巫妖之怒",icon:"☠️",desc:"10秒攻速+40%",type:"buff",buff:"rapidFire",cd:30}]},{key:"jaina",name:"吉安娜",emoji:"🧙‍♀️",role:"dps",desc:"肯瑞托大法师",skills:[{name:"寒冰箭",icon:"❄️",desc:"2.5倍伤害减速",type:"dmg",mul:2.5,cd:7},{name:"冰霜新星",icon:"💠",desc:"4倍伤害",type:"dmg",mul:4,cd:15},{name:"暴风雪",icon:"🌨️",desc:"5倍伤害",type:"dmg",mul:5,cd:20},{name:"奥术智慧",icon:"📖",desc:"10秒攻击+20%",type:"buff",buff:"battleShout",cd:28}]},{key:"sylvanas",name:"希尔瓦娜斯",emoji:"🏹",role:"dps",desc:"黑暗游侠",skills:[{name:"暗影箭",icon:"🏹",desc:"2.5倍伤害",type:"dmg",mul:2.5,cd:7},{name:"毒蛇射击",icon:"🐍",desc:"3倍中毒",type:"dmg",mul:3,dot:true,cd:12},{name:"黑暗之怒",icon:"🌑",desc:"5倍伤害",type:"dmg",mul:5,cd:18},{name:"亡灵意志",icon:"💀",desc:"10秒吸血+10%",type:"buff",buff:"shadowstep",cd:26}]},{key:"anduin",name:"安度因·乌瑞恩",emoji:"✝️",role:"heal",desc:"暴风城王子",skills:[{name:"惩击",icon:"✨",desc:"2倍伤害",type:"dmg",mul:2,cd:6},{name:"治疗术",icon:"💚",desc:"恢复30%HP",type:"heal",heal:0.3,cd:14},{name:"真言术盾",icon:"🛡️",desc:"8秒防御+30%",type:"buff",buff:"shield",cd:20},{name:"神圣赞美诗",icon:"🎵",desc:"恢复40%HP",type:"heal",heal:0.4,cd:28}]},{key:"tyrande",name:"泰兰德·语风",emoji:"🌙",role:"heal",desc:"月之女祭司",skills:[{name:"月火术",icon:"🌙",desc:"2.5倍伤害",type:"dmg",mul:2.5,cd:8},{name:"治疗之触",icon:"🌿",desc:"恢复25%HP",type:"heal",heal:0.25,cd:12},{name:"星陨术",icon:"🌟",desc:"4倍伤害",type:"dmg",mul:4,cd:18},{name:"宁静",icon:"🍃",desc:"恢复35%HP",type:"heal",heal:0.35,cd:26}]},{key:"malfurion",name:"玛法里奥·怒风",emoji:"🍂",role:"heal",desc:"大德鲁伊",skills:[{name:"愤怒",icon:"🌿",desc:"2倍伤害",type:"dmg",mul:2,cd:6},{name:"回春术",icon:"🌱",desc:"恢复20%HP",type:"heal",heal:0.2,cd:10},{name:"树皮术",icon:"🪵",desc:"8秒防御+35%",type:"buff",buff:"bark",cd:18},{name:"自然之力",icon:"🌳",desc:"恢复35%HP",type:"heal",heal:0.35,cd:24}]}];


