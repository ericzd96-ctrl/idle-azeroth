(function () {
  const BASE = 'https://wow.zamimg.com/images/wow/icons/large/';
  const UI_ICON = {
    battle:'ability_warrior_savageblow',
    hero:'achievement_level_10',
    hero2:'achievement_level_10',
    map:'inv_misc_map_01',
    inventory:'inv_misc_bag_08',
    guide:'inv_misc_book_09',
    talent:'spell_nature_starfall',
    companion:'ability_hunter_pet_wolf',
    dungeon:'achievement_dungeon_naxxramas',
    arena:'achievement_arena_2v2_7',
    artifact:'inv_sword_39',
    profession:'trade_engineering',
    progression:'achievement_bg_kill_flag_carrier',
    events:'achievement_general_stayclassy',
    ascend:'spell_holy_divineillumination',
    location:'ability_tracking',
    gold:'inv_misc_coin_02',
    gem:'inv_misc_gem_diamond_02',
    ticket:'inv_misc_ticket_tarot_portal_01',
    honor:'achievement_pvp_a_16',
    towercoin:'inv_misc_coin_18',
    essence:'spell_arcane_arcanepotency',
    clock:'inv_misc_pocketwatch_01',
    stats:'inv_misc_book_11',
    kills:'achievement_bg_kill_flag_carrier',
    mount:'ability_mount_ridinghorse',
    heal:'spell_holy_heal',
    draw:'inv_misc_coin_01',
    raid:'achievement_boss_lichking',
    save:'inv_misc_note_01',
    export:'inv_scroll_03',
    import:'inv_scroll_05',
    reset:'spell_magic_lesserinvisibilty',
    travel:'ability_mount_gryphon_01',
    faction:'achievement_guildperk_everybodysfriend',
    class:'spell_holy_magicalsentry',
    name:'inv_inscription_inkblack01',
    party:'achievement_reputation_08',
    offline:'spell_nature_sleep',
    levelup:'achievement_level_80',
    fail:'ability_creature_cursed_04',
    clear:'achievement_dungeon_naxxramas'
  };

  const SLOT_ICON = {
    weapon:'inv_sword_27',
    helmet:'inv_helmet_03',
    shoulder:'inv_shoulder_29',
    armor:'inv_chest_plate04',
    gloves:'inv_gauntlets_04',
    belt:'inv_belt_27',
    pants:'inv_pants_plate_17',
    boots:'inv_boots_plate_04',
    ring:'inv_jewelry_ring_62',
    trinket:'inv_jewelry_talisman_11'
  };

  const DUNGEON_ICON = {
    mc:'spell_fire_fire', bwl:'inv_misc_head_dragon_black', naxx:'achievement_boss_kelthuzad_01',
    karazhan:'spell_shadow_summonfelhunter', sunwell:'spell_shadow_summonfelhunter',
    ulduar:'achievement_boss_yoggsaron_01', ruby:'achievement_boss_sartharion_01', icc:'achievement_boss_lichking',
    aq40:'achievement_boss_cthun', ssc:'achievement_boss_ladyvashj', tk:'spell_arcane_portalshattrath',
    hyjal:'spell_shadow_summonfelhunter', bt:'achievement_boss_illidan',
    diremaul:'inv_misc_head_orc_01', lbrs:'inv_misc_head_dragon_black', shattered:'inv_sword_48',
    arcatraz:'spell_arcane_portaldarnassus', culling:'inv_misc_head_undead_01', pit:'inv_ore_saronite_01',
    oculus:'spell_arcane_portalshattrath', hor:'achievement_boss_lichking'
  };

  const SYMBOL_ICON = {
    '🎓':'achievement_level_10',
    '🎖️':'achievement_general',
    '🥈':'achievement_arena_2v2_7',
    '🥇':'achievement_arena_5v5_7',
    '🏆':'achievement_general_stayclassy',
    '👑':'achievement_boss_lichking',
    '🗡️':'ability_rogue_eviscerate',
    '⚔️':'ability_warrior_savageblow',
    '💀':'spell_shadow_raisedead',
    '☠️':'achievement_bg_kill_flag_carrier',
    '⚙️':'trade_engineering',
    '💥':'spell_fire_selfdestruct',
    '💢':'ability_warrior_decisivestrike',
    '⚡':'spell_nature_lightning',
    '🌩️':'spell_shaman_thunderstorm',
    '💫':'spell_frost_stun',
    '💚':'spell_holy_heal',
    '📯':'ability_warrior_battleshout',
    '🪨':'spell_nature_skinofearth',
    '🔮':'spell_holy_powerwordshield',
    '👁️':'ability_hunter_mastermarksman',
    '👥':'spell_shadow_summonvoidwalker',
    '🔇':'spell_shadow_impphaseshift',
    '🦿':'ability_warrior_disarm',
    '💧':'spell_arcane_blast',
    '🧛':'spell_shadow_lifedrain02',
    '🎯':'ability_hunter_focusedaim',
    '🤯':'spell_shadow_unholyfrenzy',
    '🌑':'spell_shadow_deathanddecay',
    '🪞':'spell_arcane_mirrorimage',
    '🥀':'spell_shadow_deathanddecay',
    '💔':'spell_shadow_cripple',
    '🥶':'spell_frost_chainsofice',
    '💰':'inv_misc_coin_02',
    '💎':'inv_misc_gem_diamond_02',
    '🔥':'spell_fire_fire',
    '🌟':'spell_holy_divineillumination',
    '🗺️':'inv_misc_map_01',
    '🌍':'achievement_worldevent_brewmaster',
    '🌎':'inv_misc_map_01',
    '🐉':'inv_misc_head_dragon_01',
    '🏰':'achievement_dungeon_naxxramas',
    '🏯':'achievement_dungeon_naxxramas',
    '💍':'inv_jewelry_ring_62',
    '💠':'inv_misc_gem_variety_01',
    '✨':'spell_holy_powerinfusion',
    '🪄':'inv_staff_13',
    '♻️':'spell_magic_lesserinvisibilty',
    '🔁':'ability_rogue_sprint',
    '📖':'inv_misc_book_09',
    '⚖️':'achievement_reputation_08',
    '🦁':'achievement_guildperk_everybodysfriend',
    '🐺':'ability_hunter_pet_wolf',
    '🌿':'spell_nature_naturetouchgrow',
    '😈':'spell_shadow_summonfelhunter',
    '❄️':'spell_frost_frostbolt02',
    '👨':'achievement_character_human_male',
    '🧔':'achievement_character_dwarf_male',
    '🧝':'achievement_character_nightelf_male',
    '🧒':'achievement_character_gnome_male',
    '👽':'achievement_character_draenei_male',
    '👹':'achievement_character_orc_male',
    '🐮':'achievement_character_tauren_male',
    '🗿':'achievement_character_troll_male',
    '🧝‍♂️':'achievement_character_bloodelf_male'
  };

  const FACTION_ICON = {
    alliance:'achievement_guildperk_everybodysfriend',
    horde:'ability_hunter_pet_wolf'
  };

  const RACE_ICON = {
    human:'achievement_character_human_male',
    dwarf:'achievement_character_dwarf_male',
    nightelf:'achievement_character_nightelf_male',
    gnome:'achievement_character_gnome_male',
    draenei:'achievement_character_draenei_male',
    orc:'achievement_character_orc_male',
    tauren:'achievement_character_tauren_male',
    undead:'achievement_character_undead_male',
    troll:'achievement_character_troll_male',
    bloodelf:'achievement_character_bloodelf_male'
  };

  const ENTITY_EXACT = {
    '死亡之翼':'ability_deathwing_bloodcorruption_death',
    '拉格纳罗斯':'spell_fire_fire',
    '克苏恩':'achievement_boss_cthun',
    '巫妖王':'achievement_boss_lichking',
    '尤格-萨隆':'achievement_boss_yoggsaron_01',
    '伊利丹·怒风':'achievement_boss_illidan',
    '阿克蒙德':'spell_shadow_summonfelhunter',
    '凯尔萨斯·逐日者':'spell_arcane_portalshattrath',
    '奈法利安':'inv_misc_head_dragon_black',
    '克尔苏加德':'achievement_boss_kelthuzad_01',
    '基尔加丹':'spell_shadow_summonfelhunter',
    '拉格纳罗斯随从':'spell_fire_volcano',
    '瓦丝琪':'achievement_boss_ladyvashj',
    '玛克扎尔王子':'spell_shadow_summonfelhunter',
    '海里昂':'achievement_boss_sartharion_01',
    '霍格':'ability_hunter_pet_boar',
    '麦迪文':'spell_arcane_portalstormwind',
    '阿尔萨斯':'achievement_boss_lichking',
    '吉安娜':'spell_frost_frostbolt02',
    '希尔瓦娜斯':'ability_hunter_focusedaim',
    '安度因·乌瑞恩':'spell_holy_holybolt',
    '泰兰德·语风':'spell_nature_starfall',
    '玛法里奥·怒风':'spell_nature_healingtouch',
    '提里奥·弗丁':'spell_holy_holybolt',
    '瓦里安·乌瑞恩':'ability_warrior_savageblow',
    '萨尔':'spell_nature_lightning',
    '伊利丹':'achievement_boss_illidan'
  };

  const SKILL_EXACT = {
    '火球术':'spell_fire_flamebolt',
    '拳击':'inv_gauntlets_04',
    '碎裂投掷':'ability_warrior_shatteringthrow',
    '法术反制':'spell_frost_iceshock',
    '镜像':'spell_magic_lesserinvisibilty',
    '能量灌注':'spell_holy_powerinfusion',
    '暗言术·灭':'spell_shadow_deathcoil',
    '脚踢':'ability_kick',
    '肾击':'ability_rogue_kidneyshot',
    '杀戮盛宴':'ability_rogue_murderspree',
    '影遁':'ability_vanish',
    '绞喉':'ability_rogue_garrote',
    '致命投掷':'inv_throwingknife_04',
    '万兽奔腾':'ability_hunter_beastcall',
    '风剪':'spell_frost_iceshock',
    '妖术':'spell_shaman_hex',
    '地震术':'spell_nature_earthquake',
    '责难':'spell_holy_rebuke',
    '正义之锤':'ability_paladin_hammeroftherighteous',
    '法术封锁':'spell_shadow_mindrot',
    '恶魔变身':'spell_shadow_demonform',
    '日光术':'spell_nature_starfall',
    '野性成长':'spell_nature_rejuvenation',
    '飓风':'spell_nature_cyclone',
    '寒冰箭':'spell_frost_frostbolt02',
    '奥术飞弹':'spell_arcane_starfire',
    '炎爆术':'spell_fire_fireball02',
    '暴风雪':'spell_frost_icestorm',
    '审判':'spell_holy_righteousfury',
    '十字军打击':'spell_holy_crusaderstrike',
    '神圣风暴':'ability_paladin_divinestorm',
    '奉献':'spell_holy_innerfire',
    '暗言术·痛':'spell_shadow_shadowwordpain',
    '心灵震爆':'spell_shadow_unholyfrenzy',
    '斩杀':'ability_warrior_decisivestrike',
    '破甲攻击':'ability_warrior_sunder',
    '致死打击':'ability_warrior_savageblow',
    '嗜血':'spell_nature_bloodlust',
    '风暴打击':'spell_shaman_improvedstormstrike',
    '混乱之箭':'ability_warlock_chaosbolt',
    '烧尽':'spell_fire_burnout',
    '腐蚀术':'spell_shadow_abominationexplosion',
    '献祭':'spell_fire_immolation',
    '月火术':'spell_nature_starfall',
    '凶猛撕咬':'ability_druid_ferociousbite',
    '回春术':'spell_nature_rejuvenation',
    '治疗术':'spell_holy_flashheal',
    '圣光术':'spell_holy_holybolt',
    '真言术·盾':'spell_holy_powerwordshield',
    '闪电箭':'spell_nature_lightning',
    '治疗链':'spell_nature_healingwavegreater',
    '龙息术':'inv_misc_head_dragon_01',
    '杀戮射击':'ability_hunter_focusedaim',
    '瞄准射击':'ability_hunter_focusedaim',
    '毒液喷吐':'ability_creature_poison_05',
    '背刺':'ability_backstab',
    '影袭':'ability_rogue_ambush',
    '切割':'ability_rogue_slicedice',
    '大地之盾':'spell_nature_skinofearth',
    '宁静':'spell_nature_tranquility',
    '树皮术':'spell_nature_stoneclawtotem',
    '减速':'spell_frost_frostbolt02',
    '破甲':'ability_warrior_sunder',
    '审判':'spell_holy_righteousfury',
    '冻结':'spell_frost_frostnova',
    '破绽':'ability_rogue_findweakness',
    '恐惧':'spell_shadow_possession',
    '护体屏障':'spell_holy_powerwordshield',
    '盾墙':'ability_warrior_shieldwall',
    '神圣守护':'spell_holy_guardianspirit',
    '寒冰屏障':'spell_ice_lament',
    '闪避':'spell_shadow_shadowward',
    '野兽狂怒':'ability_druid_challangingroar',
    '暗影步':'ability_rogue_shadowstep',
    '战斗怒吼':'ability_warrior_battleshout',
    '王者祝福':'spell_magic_greaterblessingofkings',
    '狂暴':'spell_nature_bloodlust',
    '风怒':'spell_nature_cyclone',
    '急速射击':'ability_hunter_rapidkilling',
    '嗜血':'spell_nature_bloodlust',
    '时间扭曲':'ability_mage_timewarp',
    '圣盾':'spell_holy_blessingofprotection',
    '炽天使':'ability_paladin_blessedhands',
    '恶魔形态':'spell_shadow_demonform',
    '爆发':'ability_warrior_deathwish',
    '法术爆发':'spell_fire_volcano',
    '狂热':'spell_shadow_unholyfrenzy',
    '减伤':'spell_holy_aspiration',
    '护盾':'spell_holy_powerwordshield',
    '急速':'ability_rogue_sprint',
    '生命洪流':'spell_shadow_lifedrain02',
    '天神下凡':'spell_paladin_divinepurpose',
    '灼烧/中毒':'ability_rogue_dualweild',
    '虚弱':'spell_shadow_cripple',
    '易伤':'ability_backstab',
    '冰缚':'spell_frost_chainsofice',
    '沉默':'spell_shadow_impphaseshift',
    '缴械':'ability_warrior_disarm',
    '残废':'ability_rogue_trip',
    '衰老':'spell_shadow_cripple',
    '凋零':'spell_shadow_deathanddecay',
    '易爆':'spell_fire_selfdestruct',
    '灵魂链接':'spell_shadow_soulleech_3',
    '中毒':'ability_creature_poison_05',
    '点燃':'spell_fire_incinerate',
    '烈焰震击':'spell_fire_flameshock',
    '毒蛇钉刺':'ability_hunter_quickshot',
    '致命毒药':'ability_rogue_dualweild',
    '流血':'ability_ghoulfrenzy',
    '低吼':'ability_racial_bearform',
    '硬皮':'spell_nature_stoneclawtotem',
    '喘息':'spell_nature_healingtouch',
    '亡者护佑':'spell_shadow_raisedead',
    '邪咒回涌':'spell_shadow_unholyfrenzy',
    '元素涌现':'spell_shaman_improvedstormstrike',
    '奥术护壁':'spell_arcane_arcaneresilience',
    '自愈':'spell_holy_heal',
    '狂乱':'ability_druid_challangingroar',
    '召唤援军':'spell_shadow_summonvoidwalker',
    '呼唤同伴':'ability_hunter_beastcall',
    '战吼':'ability_warrior_battleshout',
    '石肤':'spell_nature_stoneclawtotem',
    '铁壁':'ability_warrior_defensivestance',
    '弱点洞察':'ability_hunter_mastermarksman',
    '生命绽放':'spell_nature_lifebloom',
    '暗影修补':'spell_shadow_lifedrain',
    '亡灵再起':'spell_shadow_animatedead',
    '虚空裂隙':'spell_arcane_portalorgrimmar',
    '呼唤守卫':'spell_shadow_summonfelguard',
    '召集守卫':'spell_shadow_summonfelguard',
    '护体屏障':'spell_holy_powerwordshield',
    '法力护盾':'spell_shadow_detectlesserinvisibility',
    '复苏':'spell_holy_sealofwisdom',
    '终极防御':'ability_warrior_defensivestance',
    '不死之躯':'spell_shadow_raisedead',
    '连斩':'ability_warrior_punishingblow',
    '双刃':'ability_dualwield',
    '致命专注':'ability_hunter_mastermarksman',
    '疾风':'spell_nature_invisibilty',
    '假死':'spell_shadow_impphaseshift',
    '疾跑':'ability_rogue_sprint',
    '变形术':'spell_arcane_blast',
    '流星':'spell_fire_fireball02',
    '地震':'spell_nature_lightning',
    '惩击':'spell_holy_holybolt',
    '愤怒':'spell_nature_starfall',
    '英勇':'spell_nature_bloodlust',
    '女妖尖啸':'spell_shadow_possession',
    '海妖之歌':'spell_shadow_possession',
    '骨刺':'spell_shadow_raisedead',
    '灰烬觉醒':'spell_fire_volcano',
    '艾露恩之怒':'spell_nature_starfall',
    '毁灭之锤':'spell_nature_lightning',
    '王者决意':'ability_warrior_savageblow',
    '提尔之手':'spell_holy_holybolt',
    '背叛者之怒':'spell_shadow_summonfelhunter',
    '冰封命令':'spell_frost_frostbolt02',
    '冰冷智慧':'spell_frost_frostbolt02',
    '圣光回响':'spell_holy_holybolt',
    '梦境滋养':'spell_nature_healingtouch',
    '钢铁意志':'ability_warrior_defensivestance',
    '纳鲁之光':'spell_holy_holybolt',
    '纳鲁圣约':'spell_holy_holybolt',
    '天灾君临':'spell_shadow_raisedead',
    '女王威仪':'spell_shadow_possession',
    '凤凰降临':'spell_fire_volcano',
    '微光术':'spell_holy_heal',
    '急救':'spell_holy_heal',
    '命运回溯':'spell_holy_heal',
    '王者坚忍':'spell_holy_heal',
    '不息酒泉':'spell_holy_heal',
    '大地母亲之赐':'spell_nature_healingtouch',
    '虔诚祷言':'spell_holy_heal',
    '林地苏醒':'spell_nature_starfall',
    '先祖丰饶':'spell_nature_healingtouch',
    '坚守防线':'ability_warrior_defensivestance',
    '列阵坚守':'ability_warrior_defensivestance',
    '山丘之力':'ability_warrior_defensivestance',
    '守望绝罚':'ability_rogue_shadowstep',
    '欺诈者诡计':'spell_shadow_summonfelhunter',
    '战歌狂潮':'spell_nature_bloodlust',
    '洛阿之眼':'spell_shadow_possession',
    '王城余烬':'spell_fire_volcano',
    '酒雾调息':'spell_holy_heal',
    '铁星猛砸':'ability_warrior_savageblow',
    '银月战旗':'ability_warrior_battleshout',
    '恶魔变形':'spell_shadow_demonform',
    '恶魔皮肤':'spell_holy_powerwordshield',
    '恶魔之咬':'spell_shadow_summonfelhunter',
    '眼棱':'spell_shadow_summonfelhunter',
    '压制':'ability_warrior_decisivestrike',
    '撕裂':'ability_ghoulfrenzy',
    '重击':'ability_warrior_savageblow',
    '穿刺':'ability_rogue_eviscerate',
    '强力一击':'ability_warrior_decisivestrike',
    '复仇之怒':'spell_holy_holybolt',
    '杀戮命令':'ability_hunter_focusedaim',
    '岩刺突袭':'spell_nature_lightning',
    '凛风冲击':'spell_frost_frostbolt02',
    '影刃突袭':'ability_rogue_ambush',
    '复仇突刺':'ability_rogue_ambush',
    '影袭飞轮':'ability_rogue_ambush',
    '巨魔再生':'spell_holy_heal'
    ,'剑刃乱舞':'ability_rogue_slicedice'
    ,'圣佑术':'spell_holy_blessingofprotection'
    ,'毁灭':'spell_fire_fireball02'
    ,'蛊惑':'spell_shadow_possession'
    ,'醉拳':'ability_druid_challangingroar'
    ,'鲁莽':'ability_warrior_deathwish'
    ,'星群坠落':'spell_nature_starfall'
    ,'星陨术':'spell_nature_starfall'
    ,'破碎潜行':'ability_rogue_shadowstep'
    ,'不羁亡魂':'spell_shadow_animatedead'
    ,'亡者复生':'spell_shadow_animatedead'
    ,'亡者大军':'spell_shadow_animatedead'
    ,'先祖护佑':'spell_nature_healingtouch'
    ,'战帅续战':'spell_holy_heal'
    ,'米莎突袭':'ability_hunter_beastcall'
    ,'越战越勇':'ability_warrior_deathwish'
    ,'地狱咆哮':'ability_warrior_deathwish'
    ,'冲锋':'ability_warrior_charge'
    ,'旋风斩':'ability_whirlwind'
    ,'横扫打击':'ability_warrior_cleave'
    ,'猛击':'ability_warrior_decisivestrike'
    ,'盾击':'ability_warrior_shieldbash'
    ,'断筋':'spell_frost_chainsofice'
    ,'凿骨打击':'ability_warrior_punishingblow'
    ,'雷霆一击':'ability_thunderclap'
    ,'冰枪穿刺':'spell_frost_frostblast'
    ,'寒冰新星':'spell_frost_frostnova'
    ,'冰霜之握':'spell_frost_chainsofice'
    ,'暗影箭':'spell_shadow_shadowbolt'
    ,'暗影打击':'spell_shadow_shadowbolt'
    ,'法力灼烧':'spell_shadow_manaburn'
    ,'灵魂尖啸':'spell_shadow_deathscream'
    ,'灵魂虹吸':'spell_shadow_lifedrain02'
    ,'灵魂锁链':'spell_shadow_soulleech_3'
    ,'虚空震击':'spell_arcane_blast'
    ,'毒刃':'ability_rogue_dualweild'
    ,'毒牙撕咬':'ability_hunter_pet_boar'
    ,'麻痹毒针':'ability_creature_poison_05'
    ,'腐毒感染':'ability_creature_poison_05'
    ,'孢子侵染':'spell_nature_stranglevines'
    ,'藤蔓缠绕':'spell_nature_stranglevines'
    ,'枯萎诅咒':'spell_shadow_deathanddecay'
    ,'凋零之触':'spell_shadow_deathanddecay'
    ,'灼热之触':'spell_fire_burnout'
    ,'烈焰冲击':'spell_fire_flameshock'
    ,'熔岩爆裂':'spell_shaman_lavaburst'
    ,'连环闪电':'spell_nature_chainlightning'
    ,'静电震爆':'spell_nature_lightningoverload'
    ,'尾击横扫':'ability_druid_swipe'
    ,'龙翼震击':'inv_misc_head_dragon_01'
    ,'复苏结界':'spell_holy_powerwordshield'
    ,'钢铁壁垒':'ability_warrior_shieldwall'
    ,'狂怒回复':'ability_warrior_focusedrage'
    ,'燃烧':'spell_fire_sealoffire'
    ,'奥术强化':'spell_nature_lightning'
    ,'暗影形态':'spell_shadow_shadowform'
    ,'神圣新星':'spell_holy_holynova'
    ,'冲动':'spell_shadow_shadowworddominate'
    ,'爆炸射击':'ability_hunter_explosiveshot'
    ,'治疗之泉':'spell_nature_healingwavegreater'
    ,'守护者':'spell_holy_ardentdefender'
    ,'圣光闪现':'spell_holy_flashheal'
    ,'黑暗灵魂':'spell_shadow_skull'
    ,'生命通道':'spell_shadow_lifedrain'
    ,'奥术充能':'spell_arcane_blast'
    ,'雷霆充能':'spell_nature_lightningoverload'
  };

  const SKILL_PATTERNS = [
    [/火|焰|燃|熔|炎|烈焰|龙息|灼/i, 'spell_fire_fireball02'],
    [/冰|霜|寒|雪|冻/i, 'spell_frost_frostbolt02'],
    [/奥术|法能|法力|虚空|星界|秘法/i, 'spell_arcane_blast'],
    [/暗影|灵魂|痛苦|死亡|恐惧|凋零|瘟疫|诅咒|黑暗/i, 'spell_shadow_shadowwordpain'],
    [/雷|电|风暴|闪电|风怒/i, 'spell_nature_lightning'],
    [/治疗|回春|圣疗|恢复|生命|治愈|宁静|赐福/i, 'spell_nature_healingtouch'],
    [/盾|护壁|屏障|庇护|守护|护体/i, 'spell_holy_powerwordshield'],
    [/审判|圣印|神圣|圣光/i, 'spell_holy_holybolt'],
    [/背刺|影袭|伏击|割裂|毒刃|切割|猎杀/i, 'ability_rogue_ambush'],
    [/斩|打击|横扫|劈|冲锋|践踏|碎骨|重殴|猛击/i, 'ability_warrior_savageblow'],
    [/箭|射击|猎|瞄准|钉刺/i, 'ability_hunter_focusedaim'],
    [/根须|树皮|自然|藤蔓|孢子|古树/i, 'spell_nature_starfall'],
    [/龙|吐息/i, 'inv_misc_head_dragon_01'],
    [/毒|蛇|蝎|蛛|瘴|腐蚀/i, 'ability_creature_poison_05'],
    [/血|吸血|鲜血|流血/i, 'spell_shadow_lifedrain02'],
    [/吼|号令|鼓舞/i, 'ability_warrior_battleshout'],
    [/护甲|铁壁|石肤|硬皮|壁垒|防御/i, 'ability_warrior_defensivestance'],
    [/愈合|自愈|回复|绽放/i, 'spell_holy_heal'],
    [/召唤|援军|同伴|守卫|亡者再起/i, 'spell_shadow_summonvoidwalker'],
    [/时间|扭曲|疾风|迅捷|冲动|急速/i, 'ability_rogue_sprint'],
    [/沉默|禁锢/i, 'spell_shadow_impphaseshift'],
    [/缴械|断筋|残废/i, 'ability_warrior_disarm'],
    [/爆裂|爆炸|易爆|自爆/i, 'spell_fire_selfdestruct'],
    [/观察|洞察|专注|标记|审视/i, 'ability_hunter_mastermarksman'],
    [/亡灵|白骨|巫妖|尸|复苏/i, 'spell_shadow_raisedead'],
    [/元素|涌现/i, 'spell_shaman_improvedstormstrike'],
    [/王者|王城|战歌|军势|号角|号令|意志|决意|威仪|降临|君临/i, 'ability_warrior_battleshout'],
    [/纳鲁|圣约|祷言|回响|回溯|微光|急救|酒泉|坚忍|母亲之赐/i, 'spell_holy_heal'],
    [/梦境|滋养|丰饶|林地|苏醒|艾露恩/i, 'spell_nature_starfall'],
    [/尖啸|海妖|诡计|背叛者|洛阿/i, 'spell_shadow_possession'],
    [/余烬|灰烬|凤凰|萨弗拉斯|熔岩/i, 'spell_fire_volcano']
  ];

  const ENTITY_PATTERNS = [
    [/龙|雏龙|飞龙|巨龙/i, 'inv_misc_head_dragon_01'],
    [/巫妖|亡灵|骷髅|天灾|克尔苏加德|阿尔萨斯/i, 'spell_shadow_raisedead'],
    [/火焰|炎魔|熔火|拉格纳罗斯/i, 'spell_fire_fire'],
    [/冰|霜|寒|巫妖王/i, 'spell_frost_frostbolt02'],
    [/蜘蛛|蛛|蝎|蛇|毒/i, 'ability_creature_poison_05'],
    [/古神|眼|克苏恩|虚空/i, 'spell_shadow_charm'],
    [/恶魔|军团|基尔加丹|阿克蒙德|伊利丹/i, 'spell_shadow_summonfelhunter'],
    [/森林|古树|德鲁伊|塞纳留斯/i, 'spell_nature_starfall'],
    [/法师|奥术|守护者|监狱/i, 'spell_arcane_blast'],
    [/野猪|狼|熊|兽|霍格/i, 'ability_hunter_pet_boar'],
    [/骑士|圣光|提里奥|安度因|伯瓦尔/i, 'spell_holy_holybolt'],
    [/战士|步兵|督军|加尔鲁什|瓦里安|格罗玛什/i, 'ability_warrior_savageblow']
  ];

  function normalizeSize(size) {
    if (typeof size === 'number') return size;
    if (size === 'xs') return 14;
    if (size === 'sm') return 16;
    if (size === 'lg') return 22;
    return 18;
  }

  function wowIconName(name) {
    return name ? BASE + name + '.jpg' : '';
  }

  function imgHtml(src, size, alt, fallback, cls) {
    const px = normalizeSize(size);
    return `<span class="${cls || 'ui-icon wow-ico'}" style="width:${px}px;height:${px}px" title="${alt || ''}">
      <img src="${src}" alt="${alt || ''}" loading="lazy"
        onerror="this.parentNode.replaceWith(document.createTextNode(this.dataset.fb||''))"
        data-fb="${(fallback || '').replace(/"/g, '&quot;')}">
    </span>`;
  }

  function resolveByPattern(name, exactMap, patterns, fallbackName) {
    if (!name) return fallbackName || '';
    if (exactMap && exactMap[name]) return exactMap[name];
    const raw = String(name);
    for (const [re, icon] of (patterns || [])) {
      if (re.test(raw)) return icon;
    }
    return fallbackName || '';
  }

  window.uiIcon = function (name, size, label) {
    const iconName = UI_ICON[name] || UI_ICON.battle;
    return imgHtml(wowIconName(iconName), size, label || name || '', '', 'ui-icon wow-ico');
  };

  window.slotIcon = function (slot, size, fallback) {
    const iconName = SLOT_ICON[slot];
    if (!iconName) return fallback || '';
    return imgHtml(wowIconName(iconName), size, slot, fallback || '', 'wow-inline-icon');
  };

  window.skillIcon = function (skillName, size, fallback) {
    const iconName = resolveByPattern(skillName, SKILL_EXACT, SKILL_PATTERNS, 'inv_misc_questionmark');
    return imgHtml(wowIconName(iconName), size, skillName, fallback || '', 'wow-inline-icon');
  };

  window.entityIcon = function (entityName, size, fallback) {
    const iconName = resolveByPattern(entityName, ENTITY_EXACT, ENTITY_PATTERNS, 'inv_misc_head_dragon_01');
    return imgHtml(wowIconName(iconName), size, entityName, fallback || '', 'wow-inline-icon');
  };

  window.dungeonIcon = function (key, name, size, fallback) {
    const iconName = DUNGEON_ICON[key] || resolveByPattern(name, ENTITY_EXACT, ENTITY_PATTERNS, 'achievement_dungeon_naxxramas');
    return imgHtml(wowIconName(iconName), size, name || key, fallback || '', 'wow-inline-icon');
  };

  window.symbolIcon = function (symbol, size, label, fallback) {
    const iconName = SYMBOL_ICON[symbol];
    if (!iconName) return fallback || symbol || '';
    return imgHtml(wowIconName(iconName), size, label || symbol || '', fallback || symbol || '', 'wow-inline-icon');
  };

  window.statusIcon = function (name, symbol, size, fallback) {
    const viaSkill = name ? window.skillIcon(name, size, '') : '';
    if (viaSkill && !viaSkill.includes('inv_misc_questionmark')) return viaSkill;
    if (symbol && window.symbolIcon) {
      const viaSymbol = window.symbolIcon(symbol, size, name || symbol, '');
      if (viaSymbol && viaSymbol !== (symbol || '')) return viaSymbol;
    }
    return fallback || symbol || name || '';
  };

  window.factionIcon = function (key, size, fallback) {
    const iconName = FACTION_ICON[key];
    if (!iconName) return fallback || '';
    return imgHtml(wowIconName(iconName), size, key, fallback || '', 'wow-inline-icon');
  };

  window.raceIcon = function (key, size, fallback) {
    const iconName = RACE_ICON[key];
    if (!iconName) return fallback || '';
    return imgHtml(wowIconName(iconName), size, key, fallback || '', 'wow-inline-icon');
  };

  window.hydrateUiIcons = function (root) {
    const scope = root || document;
    scope.querySelectorAll('[data-ui-icon]').forEach(el => {
      const name = el.getAttribute('data-ui-icon');
      const size = el.getAttribute('data-ui-size') || 'md';
      const label = el.getAttribute('data-ui-label') || '';
      el.innerHTML = window.uiIcon(name, size, label);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.hydrateUiIcons());
  } else {
    window.hydrateUiIcons();
  }
})();
