(function () {
  const BASE = 'assets/wow/ui/';       // 本地路径(优先)
  const CDN_BASE = 'https://wow.zamimg.com/images/wow/icons/large/';   // CDN 兜底
  const warmedUrls = new Set();
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
    waystone:'inv_misc_stonetablet_02',
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
    ragefire:'spell_fire_fire', deadmines:'inv_misc_enggizmos_21', wailing:'ability_creature_poison_05',
    bfd:'spell_shadow_charm', shadowfang:'spell_shadow_possession', gnomeregan:'trade_engineering',
    razorfen:'ability_hunter_pet_boar', scarlet:'spell_holy_holybolt', razorfend:'ability_creature_disease_02',
    uldaman:'inv_misc_stonetablet_02', maraudon:'spell_nature_stranglevines', zulfarrak:'ability_hunter_pet_crocolisk',
    sunktemple:'inv_misc_head_dragon_01', scholomance:'spell_shadow_raisedead', brd:'spell_fire_volcano',
    mc:'spell_fire_fire', bwl:'inv_misc_head_dragon_black', naxx:'achievement_boss_kelthuzad_01',
    karazhan:'spell_shadow_summonfelhunter', sunwell:'spell_shadow_summonfelhunter',
    ulduar:'achievement_boss_yoggsaron_01', ruby:'achievement_boss_sartharion_01', icc:'achievement_boss_lichking',
    aq40:'achievement_boss_cthun', ssc:'achievement_boss_ladyvashj', tk:'spell_arcane_portalshattrath',
    hyjal:'spell_shadow_summonfelhunter', bt:'achievement_boss_illidan',
    stratholme:'inv_misc_head_undead_01', manatombs:'spell_arcane_portalshattrath',
    steamvault:'spell_frost_summonwaterelemental', magister:'spell_arcane_blast',
    hol:'spell_nature_lightningoverload', toc:'achievement_reputation_08', forge:'spell_shadow_soulgem',
    diremaul:'inv_misc_head_orc_01', lbrs:'inv_misc_head_dragon_black', shattered:'inv_sword_48',
    arcatraz:'spell_arcane_portaldarnassus', culling:'inv_misc_head_undead_01', pit:'inv_ore_saronite_01',
    oculus:'spell_arcane_portalshattrath', hor:'achievement_boss_lichking',
    nexus:'spell_arcane_portalshattrath', gundrak:'ability_hunter_pet_crocolisk', sethekk:'ability_hunter_pet_vulture',
    vortex:'spell_shaman_thunderstorm',
    ubrs:'inv_misc_head_dragon_black',
    firelands:'spell_fire_volcano', dragonsoul:'ability_deathwing_bloodcorruption_death',
    throne:'spell_nature_lightningoverload', soo:'classicon_warrior', hfc:'spell_shadow_summonfelhunter',
    tomb:'spell_shadow_summonfelhunter', antorus:'spell_arcane_portalshattrath',
    valor:'spell_holy_divineillumination', darkheart:'spell_shadow_charm', court:'spell_arcane_starfire',
    necrotic:'spell_shadow_raisedead',
    stormstout:'achievement_worldevent_brewmaster', shadopan:'ability_stealth',
    irondocks:'inv_misc_hook_01', grimrail:'inv_misc_enggizmos_21', everbloom:'spell_nature_stranglevines',
    ataldazar:'achievement_character_troll_male', uldir:'ability_creature_disease_02',
    atonement:'spell_holy_holybolt', plaguefall:'ability_creature_disease_02',
    mists:'spell_nature_stranglevines', theater:'ability_warrior_savageblow',
    waycrest:'spell_shadow_possession', kingsrest:'achievement_character_troll_male',
    freehold:'inv_misc_hook_01', mechagon:'trade_engineering', boralus:'inv_misc_spyglass_03',
    nightmare:'spell_shadow_charm', nighthold:'spell_arcane_starfire',
    nyalotha:'spell_shadow_charm', nathria:'spell_shadow_possession', eternalpalace:'achievement_boss_ladyvashj',
    neltharus:'spell_fire_volcano', azurevault:'spell_arcane_blast', nokhud:'ability_hunter_focusedaim',
    hallsinfusion:'spell_frost_summonwaterelemental', brackenhide:'ability_creature_disease_02',
    aberrus:'inv_misc_head_dragon_black', amirdrassil:'spell_nature_starfall',
    rookery:'spell_shaman_thunderstorm', cinderbrew:'achievement_worldevent_brewmaster',
    darkflame:'spell_fire_fire', dawnbreaker:'ability_mount_gryphon_01',
    arakara:'spell_nature_stranglevines', citythreads:'spell_shadow_possession',
    stonevault:'inv_misc_stonetablet_02', prioryflame:'spell_holy_divineillumination',
    nightfall_sanctum:'spell_shadow_charm', earthcrawl_mines:'ability_creature_poison_05',
    fungal_folly:'ui-ej-boss-fungariangiant', archival_assault:'inv_misc_book_11',
    primeus_repository:'inv_misc_book_11',
    ecodome_aldani:'spell_nature_stranglevines', oasis_succession:'inv_misc_herb_felweed',
    tazavesh_streets:'inv_11_0_etherealraid_communicator_color1',
    tazavesh_gambit:'spell_arcane_portalshattrath', nerubar:'ability_creature_poison_05',
    manaforge_omega:'inv_11_0_etherealraid_communicator_color1',
    overlook_zoshul:'inv_misc_spyglass_03',
    ecodome_rhovan:'spell_nature_naturetouchgrow',
    shadowpoint_breach:'spell_shadow_soulgem',
    shandorah_conclave:'spell_arcane_starfire',
    voidrazor_sanctum:'spell_shadow_soulgem',
    eversong_midnight:'spell_arcane_portalstormwind',
    zulaman_midnight:'ability_hunter_pet_bear',
    harandar:'ui-ej-boss-fungariangiant',
    murder_row:'ability_rogue_eviscerate',
    den_nalorakk:'ability_hunter_pet_bear',
    maisara_caverns:'spell_shadow_raisedead',
    silvermoon_voidspire:'spell_arcane_blast',
    sporefall:'ui-ej-boss-fungariangiant',
    curse_ulatek:'spell_shadow_shadowworddominate'
  };

  const SYMBOL_ICON = {
    '🎓':'achievement_level_10',
    '🎖️':'achievement_general',
    '🎗️':'achievement_general',
    '🥉':'achievement_arena_2v2_1',
    '🥈':'achievement_arena_2v2_7',
    '🥇':'achievement_arena_5v5_7',
    '🏆':'achievement_general_stayclassy',
    '🏟️':'achievement_arena_3v3_9',
    '🎫':'inv_misc_ticket_tarot_portal_01',
    '🗝️':'inv_10_blacksmithing_consumable_key_color1',
    '📜':'inv_misc_map_01',
    '📚':'inv_misc_book_11',
    '👑':'achievement_boss_lichking',
    '🗡️':'ability_rogue_eviscerate',
    '⚔️':'ability_warrior_savageblow',
    '⚔️❌':'ability_warrior_disarm',
    '⚒️':'spell_holy_holysmite',
    '✋':'spell_holy_sealofprotection',
    '✝️':'spell_holy_holybolt',
    '💀':'spell_shadow_raisedead',
    '☠️':'achievement_bg_kill_flag_carrier',
    '☣️':'ability_creature_disease_02',
    '⚙️':'trade_engineering',
    '💥':'spell_fire_selfdestruct',
    '💢':'ability_warrior_decisivestrike',
    '⚡':'spell_nature_lightning',
    '🌩️':'spell_shaman_thunderstorm',
    '⛈️':'spell_shaman_thunderstorm',
    '💫':'spell_frost_stun',
    '💚':'spell_holy_heal',
    '📯':'ability_warrior_battleshout',
    '🎵':'spell_holy_holynova',
    '📣':'ability_hunter_beastcall',
    '🚩':'achievement_bg_returnxflags_def_wsg',
    '🪨':'spell_nature_skinofearth',
    '🪵':'ability_druid_barkskin',
    '🔮':'spell_holy_powerwordshield',
    '👁️':'ability_hunter_mastermarksman',
    '👥':'spell_shadow_summonvoidwalker',
    '🔇':'spell_shadow_impphaseshift',
    '🛡️':'ability_warrior_shieldwall',
    '🧱':'spell_holy_devotionaura',
    '💨':'ability_rogue_sprint',
    '🩸':'spell_shadow_lifedrain02',
    '🧿':'spell_shadow_unholyfrenzy',
    '🧣':'inv_11_0_etherealraid_communicator_color1',
    '🌪️':'spell_nature_cyclone',
    '☄️':'spell_fire_meteorstorm',
    '🦿':'ability_warrior_disarm',
    '💧':'spell_arcane_blast',
    '🧛':'spell_shadow_lifedrain02',
    '🎯':'ability_hunter_focusedaim',
    '🛒':'inv_misc_coin_01',
    '🔔':'inv_misc_bell_01',
    '🤯':'spell_shadow_unholyfrenzy',
    '🌑':'spell_shadow_deathanddecay',
    '🪐':'spell_arcane_starfire',
    '🪞':'spell_arcane_mirrorimage',
    '🥀':'spell_shadow_deathanddecay',
    '💔':'spell_shadow_cripple',
    '❤️':'spell_holy_heal',
    '❤️‍🔥':'ability_warrior_focusedrage',
    '🥶':'spell_frost_chainsofice',
    '💰':'inv_misc_coin_02',
    '💎':'inv_misc_gem_diamond_02',
    '💍':'inv_jewelry_ring_62',
    '💠':'inv_misc_gem_variety_01',
    '🔷':'inv_misc_gem_sapphire_02',
    '🔴':'inv_misc_gem_bloodstone_02',
    '🔵':'inv_misc_gem_crystal_02',
    '🟡':'inv_misc_gem_topaz_02',
    '🟣':'inv_misc_gem_amethyst_02',
    '🟧':'inv_misc_gem_ebondraenite_02',
    '🟨':'inv_misc_gem_topaz_02',
    '🟪':'inv_misc_gem_amethyst_02',
    '🔥':'spell_fire_fire',
    '🌋':'spell_fire_volcano',
    '🌟':'spell_holy_divineillumination',
    '⭐':'spell_holy_divineillumination',
    '🗺️':'inv_misc_map_01',
    '🌍':'achievement_worldevent_brewmaster',
    '🌎':'inv_misc_map_01',
    '🌄':'inv_misc_map_01',
    '🌅':'achievement_zone_sholazar_01',
    '🌈':'spell_nature_starfall',
    '🌊':'spell_frost_summonwaterelemental',
    '🌌':'spell_arcane_portalshattrath',
    '🌕':'spell_nature_starfall',
    '🌗':'spell_nature_starfall',
    '🌙':'spell_nature_starfall',
    '🌠':'spell_arcane_starfire',
    '🌧️':'spell_nature_cyclone',
    '🌨️':'spell_frost_icestorm',
    '🌪️':'spell_nature_cyclone',
    '🌫️':'spell_shadow_charm',
    '☀️':'spell_fire_fireball02',
    '☁️':'spell_nature_cyclone',
    '🌞':'spell_fire_fire',
    '🌱':'inv_misc_herb_felweed',
    '🌿':'spell_nature_rejuvenation',
    '🌲':'spell_nature_starfall',
    '🌳':'spell_nature_starfall',
    '🌴':'spell_nature_starfall',
    '🌵':'spell_nature_thorns',
    '🌺':'spell_nature_naturetouchgrow',
    '🌾':'spell_nature_naturetouchgrow',
    '🐉':'inv_misc_head_dragon_01',
    '🐲':'inv_misc_head_dragon_black',
    '🐺':'ability_hunter_pet_wolf',
    '🐻':'ability_druid_catform',
    '🐗':'ability_hunter_pet_boar',
    '🐍':'ability_creature_poison_05',
    '🐊':'ability_hunter_pet_crocolisk',
    '🐙':'inv_misc_monstertentacle_01',
    '🐟':'inv_misc_fish_18',
    '🦀':'ability_hunter_pet_crab',
    '🦂':'ability_creature_poison_06',
    '🕷️':'ability_ghoulfrenzy',
    '🕸️':'spell_nature_stranglevines',
    '🐦':'ability_hunter_pet_vulture',
    '🦅':'ability_hunter_pet_windserpent',
    '🦇':'spell_shadow_possession',
    '🧜':'spell_frost_summonwaterelemental',
    '🐴':'ability_mount_ridinghorse',
    '🐅':'ability_druid_dash',
    '🐾':'ability_hunter_beastcall',
    '🦴':'spell_shadow_raisedead',
    '🦠':'ability_creature_disease_02',
    '🧪':'inv_potion_155',
    '🪝':'inv_misc_hook_01',
    '🪓':'inv_axe_01',
    '🔨':'inv_hammer_04',
    '🏹':'ability_hunter_focusedaim',
    '🔱':'spell_nature_lightning',
    '🛡️':'ability_warrior_shieldwall',
    '🧱':'spell_holy_devotionaura',
    '🪄':'inv_staff_13',
    '📕':'inv_misc_book_09',
    '📖':'inv_misc_book_09',
    '📘':'inv_misc_book_11',
    '📚':'inv_misc_book_11',
    '📿':'inv_jewelry_talisman_08',
    '⛪':'spell_holy_holybolt',
    '🏰':'achievement_dungeon_naxxramas',
    '🏯':'achievement_dungeon_naxxramas',
    '🏛️':'achievement_dungeon_ulduar_raildriver',
    '🏘️':'inv_misc_map_01',
    '🏜️':'achievement_zone_silithus_01',
    '🏔️':'achievement_zone_stonetalon_01',
    '⛰️':'achievement_zone_stonetalon_01',
    '⛵':'ability_mount_gryphon_01',
    '⚓':'inv_misc_enggizmos_21',
    '⌛':'inv_misc_pocketwatch_01',
    '⏳':'inv_misc_pocketwatch_01',
    '🔧':'trade_engineering',
    '🔌':'trade_engineering',
    '🔒':'inv_misc_key_14',
    '🔗':'spell_shadow_soulleech_3',
    '🔄':'spell_magic_lesserinvisibilty',
    '🔁':'ability_rogue_sprint',
    '♻️':'spell_magic_lesserinvisibilty',
    '📦':'inv_crate_04',
    '🔭':'inv_misc_spyglass_03',
    '📐':'inv_misc_stonetablet_02',
    '🧬':'spell_arcane_prismaticcloak',
    '🪐':'spell_arcane_starfire',
    '🛰️':'spell_arcane_portalshattrath',
    '⚫':'spell_shadow_shadowwordpain',
    '💜':'spell_shadow_lifedrain',
    '💉':'inv_potion_51',
    '💣':'spell_fire_selfdestruct',
    '💧':'spell_arcane_blast',
    '🧊':'spell_frost_frostnova',
    '☄️':'spell_fire_meteorstorm',
    '🌀':'spell_nature_cyclone',
    '👻':'spell_shadow_possession',
    '👁️':'spell_shadow_charm',
    '👤':'ability_rogue_shadowstep',
    '👥':'spell_shadow_summonvoidwalker',
    '👊':'ability_warrior_punishingblow',
    '👹':'achievement_character_orc_male',
    '👺':'spell_shadow_summonfelhunter',
    '👼':'spell_holy_guardianspirit',
    '🤖':'trade_engineering',
    '😈':'spell_shadow_summonfelhunter',
    '😡':'ability_racial_bloodrage',
    '😭':'spell_shadow_deathscream',
    '🙏':'spell_holy_heal',
    '🚂':'trade_engineering',
    '🚜':'trade_engineering',
    '🍃':'spell_nature_stranglevines',
    '🍂':'spell_nature_rejuvenation',
    '🌿':'spell_nature_naturetouchgrow',
    '🍄':'ability_creature_disease_02',
    '🍖':'inv_misc_food_15',
    '🍲':'inv_misc_food_64',
    '🍶':'inv_drink_13',
    '🍷':'inv_drink_04',
    '🍺':'inv_drink_05',
    '🏰':'achievement_dungeon_naxxramas',
    '✨':'spell_holy_powerinfusion',
    '⚖️':'achievement_reputation_08',
    '🦁':'achievement_guildperk_everybodysfriend',
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
    '死亡之翼·灭世者':'ability_deathwing_bloodcorruption_death',
    '拉格纳罗斯':'spell_fire_fire',
    '拉格纳罗斯·火焰之王':'spell_fire_fire',
    '克苏恩':'achievement_boss_cthun',
    '克苏恩·疯狂之眼':'achievement_boss_cthun',
    '巫妖王':'achievement_boss_lichking',
    '尤格-萨隆':'achievement_boss_yoggsaron_01',
    '尤格萨隆·千喉之梦':'achievement_boss_yoggsaron_01',
    '伊利丹·怒风':'achievement_boss_illidan',
    '阿克蒙德':'spell_shadow_summonfelhunter',
    '凯尔萨斯·逐日者':'spell_arcane_portalshattrath',
    '奥妮克希亚':'inv_misc_head_dragon_black',
    '奈法利安':'inv_misc_head_dragon_black',
    '克尔苏加德':'achievement_boss_kelthuzad_01',
    '基尔加丹':'spell_shadow_summonfelhunter',
    '拉格纳罗斯随从':'spell_fire_volcano',
    '邪炉卫士':'spell_fire_fire',
    '塔格尔·邪炉':'spell_fire_burnout',
    '矿工约翰逊':'inv_hammer_04',
    '斯尼德':'trade_engineering',
    '范克瑞斯':'ability_rogue_shadowstep',
    '安娜科德拉':'ability_creature_poison_05',
    '斯卡姆':'spell_nature_lightning',
    '梦魇之王':'spell_shadow_charm',
    '深渊守卫':'spell_frost_summonwaterelemental',
    '格里哈斯特':'ability_hunter_pet_crab',
    '阿库麦尔':'inv_misc_monstertentacle_01',
    '席瓦莱恩男爵':'spell_shadow_lifedrain',
    '指挥官斯普林瓦尔':'ability_warrior_shieldwall',
    '阿鲁高':'spell_shadow_summonvoidwalker',
    '格鲁比斯':'ability_creature_disease_02',
    '电刑器6000型':'spell_nature_lightningoverload',
    '群体打击者9-60':'trade_engineering',
    '机械师瑟玛普拉格':'trade_engineering',
    '麦克尼尔·瑟玛普拉格':'trade_engineering',
    '亨利·斯特恩':'inv_potion_155',
    '血法师萨尔诺斯':'spell_fire_flamebolt',
    '血色十字军指挥官':'ability_warrior_shieldwall',
    '奥法师杜安':'spell_arcane_blast',
    '赫洛德':'ability_warrior_cleave',
    '大检察官怀特迈恩':'spell_holy_flashheal',
    '莫格莱尼':'spell_holy_crusaderstrike',
    '主宰拉姆塔斯':'ability_hunter_pet_boar',
    '阿格姆':'spell_nature_thorns',
    '卡尔加·刺肋':'ability_hunter_pet_boar',
    '图特卡什':'ability_creature_poison_05',
    '火眼莫德雷斯':'spell_fire_flamebolt',
    '巫妖寒冰之王':'spell_frost_freezingbreath',
    '艾隆纳亚':'spell_nature_skinofearth',
    '石窟织石者':'ability_creature_poison_05',
    '阿扎达斯':'inv_misc_stonetablet_02',
    '诺克赛恩':'spell_nature_stranglevines',
    '工匠吉兹洛克':'trade_engineering',
    '瑟莱德丝公主':'spell_nature_earthquake',
    '暗影祭司塞瑟斯':'spell_shadow_shadowwordpain',
    '乌克兹·沙顶':'ability_hunter_pet_scorpid',
    '巫医祖穆拉恩':'spell_shadow_raisedead',
    '哈卡的化身':'spell_shadow_charm',
    '德姆塞卡尔':'inv_misc_head_dragon_01',
    '伊兰尼库斯之影':'inv_misc_head_dragon_green',
    '詹迪斯·巴罗夫':'spell_arcane_mirrorimage',
    '黑暗院长加丁':'spell_shadow_shadowbolt',
    '拉斯·弗罗斯特维斯帕':'spell_frost_freezingbreath',
    '悲惨的提米':'spell_shadow_raisedead',
    '炮手威利':'inv_misc_enggizmos_21',
    '巴纳扎尔':'spell_shadow_summonfelhunter',
    '瑞文戴尔男爵':'spell_shadow_raisedead',
    '弗诺斯·达克维尔':'inv_misc_key_14',
    '贝尔加':'spell_fire_volcano',
    '弗莱拉斯大使':'spell_shadow_summonfelguard',
    '达格兰·索瑞森大帝':'ability_warrior_savageblow',
    '鲁西弗隆':'spell_shadow_shadowwordpain',
    '玛格曼达':'spell_fire_fire',
    '基赫纳斯':'spell_fire_fireball02',
    '加尔':'spell_nature_skinofearth',
    '狂野的拉佐格尔':'inv_misc_head_dragon_black',
    '勒什雷尔':'inv_misc_head_dragon_black',
    '克洛玛古斯':'inv_misc_head_dragon_black',
    '普希林':'spell_nature_stranglevines',
    '伊莫塔尔':'spell_shadow_summonfelhunter',
    '托塞德林王子':'spell_arcane_blast',
    '欧莫克大王':'ability_warrior_cleave',
    '暗影猎手沃什加斯':'ability_hunter_focusedaim',
    '烟网蛛后':'ability_creature_poison_05',
    '维姆萨拉克':'inv_misc_head_dragon_black',
    '预言者斯克拉姆':'spell_shadow_shadowworddominate',
    '战争守卫沙尔图拉':'ability_warrior_savageblow',
    '顽强的范克瑞斯':'ability_creature_poison_05',
    '双子皇帝':'spell_shadow_summonvoidwalker',
    '督军沃克':'ability_warrior_battleshout',
    '烈焰使者索拉卡尔':'spell_fire_fireball02',
    '将军勒什雷尔':'inv_misc_head_dragon_black',
    '阿努布雷坎':'ability_creature_poison_05',
    '瘟疫使者诺斯':'ability_creature_disease_02',
    '塔迪乌斯':'spell_nature_lightningoverload',
    '潘德莫努斯':'spell_shadow_soulgem',
    '塔瓦洛克':'spell_nature_skinofearth',
    '节点亲王沙法尔':'spell_arcane_portalshattrath',
    '高阶术士奈瑟库斯':'spell_shadow_shadowbolt',
    '血卫士伯鲁恩':'ability_warrior_shieldwall',
    '击碎者克里丹':'spell_fire_fireball02',
    '佐拉多尔米':'spell_arcane_blast',
    '预言者斯克瑞斯':'spell_shadow_shadowworddominate',
    '先知达尔莉丝':'spell_arcane_starfire',
    '水术师瑟丝比亚':'spell_frost_summonwaterelemental',
    '机械师斯蒂里格':'trade_engineering',
    '督军卡利瑟里斯':'ability_hunter_pet_crocolisk',
    '不稳定的海度斯':'spell_frost_summonwaterelemental',
    '盲眼者莱欧瑟拉斯':'spell_shadow_summonfelhunter',
    '深水领主卡拉瑟雷斯':'spell_frost_summonwaterelemental',
    '空灵机甲':'trade_engineering',
    '奥':'spell_fire_burnout',
    '大星术师索兰莉安':'spell_arcane_starfire',
    '雷基·冬寒':'spell_frost_freezingbreath',
    '安纳塞隆':'spell_shadow_summonfelhunter',
    '阿兹加洛':'spell_fire_volcano',
    '高阶督军纳因图斯':'inv_weapon_shortblade_62',
    '苏普雷姆斯':'spell_fire_volcano',
    '阿卡玛之影':'spell_shadow_shadowworddominate',
    '塔隆·血魔':'spell_shadow_deathcoil',
    '古尔图格·血沸':'spell_shadow_lifedrain',
    '灵魂之匣':'spell_shadow_soulgem',
    '莎赫拉丝主母':'spell_shadow_summonfelhunter',
    '伊利达雷议会':'spell_shadow_summonfelhunter',
    '堕落的瓦拉斯塔兹':'inv_misc_head_dragon_01',
    '肮脏的希尔盖':'ability_creature_disease_02',
    '塞林·火心':'spell_fire_burnout',
    '女祭司德莉希亚':'spell_holy_flashheal',
    '玛洛加尔领主':'spell_shadow_raisedead',
    '亡语者女士':'spell_shadow_shadowwordpain',
    '炮舰战':'inv_misc_enggizmos_21',
    '死亡使者萨鲁法尔':'ability_warrior_savageblow',
    '烂肠':'ability_creature_disease_02',
    '腐面':'ability_creature_disease_02',
    '普崔塞德教授':'ability_creature_disease_02',
    '鲜血女王兰娜瑟尔':'spell_shadow_lifedrain',
    '踏梦者瓦莉瑟瑞娅':'spell_nature_healingtouch',
    '辛达苟萨':'spell_frost_freezingbreath',
    '烈焰巨兽':'trade_engineering',
    '锋鳞':'inv_misc_head_dragon_01',
    '掌炉者伊格尼斯':'spell_fire_volcano',
    'XT-002拆解者':'trade_engineering',
    '欧尔莉亚':'spell_holy_powerwordshield',
    '霍迪尔':'spell_frost_frostbolt02',
    '托里姆':'spell_nature_lightningoverload',
    '弗蕾亚':'spell_nature_lifebloom',
    '米米尔隆':'trade_engineering',
    '钢铁议会':'spell_nature_lightningoverload',
    '维扎克斯将军':'spell_shadow_charm',
    '布隆亚姆':'spell_shadow_soulleech_3',
    '灵魂吞噬者':'spell_shadow_soulgem',
    '噬魂者布隆亚姆':'spell_shadow_soulleech_3',
    '肉钩':'inv_misc_hook_01',
    '塑血者沙尔拉姆':'ability_creature_disease_02',
    '玛尔加尼斯':'spell_shadow_summonfelhunter',
    '熔炉之主加弗斯特':'inv_hammer_04',
    '艾克':'ability_creature_disease_02',
    '天灾领主泰兰努斯':'inv_ore_saronite_01',
    '审讯者达拉科':'spell_arcane_blast',
    '法师领主伊洛姆':'spell_arcane_starfire',
    '魔网守护者埃雷苟斯':'inv_misc_head_dragon_blue',
    '冰霜之王托塞德林':'spell_frost_freezingbreath',
    '阿诺玛鲁斯':'spell_arcane_blast',
    '凯瑞斯托拉兹':'inv_misc_head_dragon_blue',
    '斯拉德兰':'ability_hunter_pet_crocolisk',
    '莫拉格':'ability_hunter_pet_rhino',
    '迦勒鲁什':'ability_hunter_pet_crocolisk',
    '暮光龙·萨维安娜':'achievement_boss_sartharion_01',
    '瓦丝琪':'achievement_boss_ladyvashj',
    '瓦斯琪':'achievement_boss_ladyvashj',
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
    '伊利丹':'achievement_boss_illidan',
    '奥丁':'spell_holy_divineillumination',
    '麦迪文':'spell_arcane_portalstormwind',
    '馆长':'spell_arcane_portalshattrath',
    '莫罗斯':'ability_rogue_slicedice',
    '贞节圣女':'spell_holy_holybolt',
    '歌剧院':'spell_arcane_starfire',
    '特雷斯坦·邪蹄':'spell_shadow_summonfelhunter',
    '埃兰之影':'spell_arcane_blast',
    '虚空幽龙':'spell_arcane_prismaticcloak',
    '国际象棋':'inv_misc_gem_diamond_02',
    '玛克扎尔王子':'spell_shadow_summonfelhunter',
    '卡雷苟斯':'inv_misc_head_dragon_01',
    '布鲁塔卢斯':'spell_fire_volcano',
    '菲米丝':'ability_creature_disease_02',
    '艾瑞达双子':'spell_shadow_summonfelhunter',
    '穆鲁':'spell_shadow_charm',
    '萨维斯':'spell_shadow_charm',
    '芬里尔':'ability_hunter_pet_wolf',
    '神王斯科瓦尔德':'ability_warrior_shieldwall',
    '阿萨德':'spell_nature_lightningoverload',
    '乌克乌克':'ability_hunter_pet_boar',
    '炎诛':'spell_fire_burnout',
    '雪流大师':'spell_frost_frostbolt02',
    '狂之煞':'spell_shadow_charm',
    '雷电之王雷神':'spell_nature_lightningoverload',
    '雷神':'spell_nature_lightningoverload',
    '伊墨苏斯':'spell_frost_summonwaterelemental',
    '堕落的守护者':'spell_shadow_charm',
    '诺鲁什':'spell_holy_powerwordshield',
    '傲之煞':'spell_shadow_charm',
    '迦拉卡斯':'ability_hunter_pet_vulture',
    '钢铁战蝎':'trade_engineering',
    '库卡隆黑暗萨满':'spell_nature_bloodlust',
    '纳兹戈林将军':'ability_warrior_battleshout',
    '马尔考罗克':'ability_warrior_savageblow',
    '潘达利亚战利品':'inv_misc_crate_04',
    '嗜血的索克':'ability_hunter_pet_rhino',
    '攻城匠师黑索':'trade_engineering',
    '卡拉克西英杰':'ability_creature_poison_05',
    '加尔鲁什·地狱咆哮':'ability_warrior_savageblow',
    '尼奥库勒·蒸汽碾':'trade_engineering',
    '狼王斯卡乌格':'ability_hunter_pet_wolf',
    '尼托格':'trade_engineering',
    '雅雷昆':'spell_nature_lifebloom',
    '寇莫克':'spell_shadow_demonform',
    '死眼基洛格':'spell_shadow_charm',
    '邪能领主扎昆':'spell_shadow_summonfelguard',
    '玛诺洛斯':'spell_shadow_summonfelguard',
    '堕落的萨格拉斯化身':'spell_shadow_demonform',
    '寂灭者阿古斯':'spell_arcane_starfire',
    '巡逻队长格尔多':'ability_warrior_shieldwall',
    '顾问梅兰德鲁斯':'ability_rogue_slicedice',
    '萨维斯的暗影':'spell_shadow_charm',
    '船长贾雷德':'ability_rogue_slicedice',
    '机械之王梅卡托克':'trade_engineering',
    '维克雷斯女勋爵':'spell_shadow_deathcoil',
    '达萨拉先王雷扎安':'spell_holy_righteousfury',
    '戈霍恩':'ability_creature_disease_02',
    '噬心三姐妹':'spell_shadow_charm',
    '维克雷斯领主夫妇':'spell_nature_stranglevines',
    '达卡莱先王':'spell_shadow_raisedead',
    '大魔导师艾利桑德':'inv_misc_pocketwatch_01',
    '古尔丹':'spell_shadow_summonfelguard',
    '恩佐斯':'spell_shadow_charm',
    '阿兹莎拉女王':'achievement_boss_ladyvashj',
    '缚霜者纳索尔':'spell_frost_freezingbreath',
    '主宰者德纳修斯':'spell_shadow_lifedrain',
    '阿古斯·寂灭者':'spell_shadow_summonfelhunter',
    '莱萨杰丝·风暴化身':'spell_nature_lightningoverload',
    '化身奈萨里奥':'inv_misc_head_dragon_black',
    '炎魔之王弗拉戈斯':'spell_fire_volcano',
    '雷神·雷霆之王':'spell_nature_lightningoverload',
    '鲁克玛':'ability_hunter_pet_vulture',
    '奥拉基尔·风暴王座':'spell_shaman_thunderstorm',
    '辛达苟萨之影':'spell_frost_freezingbreath',
    '辛达苟萨':'spell_frost_freezingbreath',
    '虚空先驱萨拉塔斯':'spell_shadow_possession',
    '雷沙诺尔·无缚者':'inv_11_0_etherealraid_communicator_color1',
    '影点总督维克席斯':'spell_shadow_shadowform',
    '群星占相者诺维萨':'spell_arcane_starfire',
    '沼泽暴君·格拉姆':'ability_hunter_pet_crocolisk',
    '霍格大王':'ability_hunter_pet_boar',
    '黑石霸主·达格兰':'ability_warrior_savageblow',
    '末日领主卡扎克':'spell_shadow_summonfelhunter',
    '深渊之王玛瑟里顿':'spell_shadow_summonfelhunter',
    '瑞文戴尔男爵':'achievement_boss_lichking',
    '巴纳扎尔':'spell_shadow_summonfelhunter',
    '黑骑士':'spell_shadow_raisedead',
    '纯洁者耶德瑞克':'spell_holy_holybolt',
    '银白十字军冠军':'achievement_general_stayclassy',
    '狂野的拉佐格尔':'inv_misc_head_dragon_black',
    '勒什雷尔':'spell_fire_fire',
    '克洛玛古斯':'inv_misc_head_dragon_black',
    '鲁西弗隆':'spell_shadow_summonfelhunter',
    '玛格曼达':'ability_hunter_pet_wolf',
    '基赫纳斯':'spell_fire_volcano',
    '加尔':'spell_nature_skinofearth',
    '阿努布雷坎':'ability_creature_poison_05',
    '瘟疫使者诺斯':'spell_shadow_raisedead',
    '塔迪乌斯':'spell_nature_lightningoverload',
    '洛肯':'spell_shaman_thunderstorm',
    '比亚格里将军':'spell_shaman_thunderstorm',
    '沃尔坎':'spell_fire_volcano',
    '乌克乌克':'achievement_worldevent_brewmaster',
    '炎诛':'spell_fire_volcano',
    '古·穿云':'inv_misc_head_dragon_01',
    '雪流大师':'spell_frost_frostbolt02',
    '狂之煞':'spell_shadow_charm',
    '主宰者德纳修斯':'spell_shadow_possession',
    '德纳修斯':'spell_shadow_possession',
    '恩佐斯':'spell_shadow_charm',
    '阿兹莎拉女王':'achievement_boss_ladyvashj',
    '阿兹莎拉':'achievement_boss_ladyvashj',
    '基里奥斯':'ability_hunter_pet_windserpent',
    '风暴卫士戈伦':'spell_nature_lightning',
    '虚石畸体':'spell_shadow_charm',
    '酿造大师奥德里尔':'achievement_worldevent_brewmaster',
    '伊帕':'spell_fire_fire',
    '本克·嗡鸣':'ability_hunter_beastcall',
    '戈尔迪·底金男爵':'inv_misc_coin_02',
    '老蜡须':'ability_hunter_pet_bear',
    '布雷兹康':'spell_fire_fire',
    '蜡烛之王':'spell_fire_selfdestruct',
    '黑暗化身':'spell_shadow_charm',
    '影冠发言者':'spell_shadow_possession',
    '阿努布伊卡基':'ability_creature_poison_05',
    '阿瓦诺克斯':'ability_ghoulfrenzy',
    '阿努布泽克特':'ability_creature_poison_05',
    '收割者基卡塔尔':'spell_shadow_charm',
    '第五纱网演说家克里克斯维兹克':'spell_shadow_possession',
    '女王之牙':'ability_rogue_slicedice',
    '凝结聚合体':'ability_creature_disease_02',
    '大切接师伊佐':'ability_warrior_savageblow',
    '戈霍恩':'spell_shadow_charm',
    '米斯拉克斯':'ability_creature_poison_05',
    '穆鲁':'spell_shadow_charm',
    '午夜':'ability_mount_ridinghorse',
    '猎手阿图门':'ability_mount_ridinghorse',
    '不朽者莫德雷萨':'achievement_boss_lichking',
    '屠夫斯特拉达玛':'ability_rogue_eviscerate',
    '维克雷斯领主夫妇':'spell_shadow_possession',
    '达卡莱先王':'achievement_boss_lichking',
    '拉莎农':'ability_hunter_pet_vulture',
    '可汗巴拉卡':'ability_hunter_pet_windserpent',
    '克拉希克综合体':'ability_creature_poison_05',
    '萨瑟利尔暗宴议会':'spell_arcane_portalstormwind',
    '祖尔加拉':'ability_hunter_pet_bear',
    '祖尔詹':'ability_hunter_pet_vulture',
    '腐沼':'ui-ej-boss-fungariangiant',
    'Rotmire':'ui-ej-boss-fungariangiant',
    '乌格拉克斯':'ability_creature_poison_05',
    '血缚恐魔':'ability_creature_disease_02',
    '席克兰':'ability_rogue_slicedice',
    '拉夏南':'ability_hunter_pet_vulture',
    '节点女亲王':'spell_arcane_prismaticcloak',
    '流丝之庭':'spell_shadow_possession',
    '安苏雷克女王':'spell_shadow_charm',
    '萨拉塔斯':'spell_shadow_possession',
    '萨拉塔斯的裂隙回声':'spell_shadow_possession',
    '纳洛拉克':'ability_hunter_pet_bear',
    '莉希尔·烬怒':'spell_shadow_summonfelhunter',
    '诅咒载体乌拉泰克':'spell_shadow_shadowworddominate',
    '姬丝蒂娅·法力之心':'spell_fire_burnout',
    '扎恩·刃悲':'ability_rogue_slicedice',
    '毁灭者萨苏克斯':'spell_shadow_summonfelhunter'
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
    '眩晕':'spell_frost_stun',
    '虚弱':'spell_shadow_cripple',
    '易伤':'ability_backstab',
    '冰缚':'spell_frost_chainsofice',
    '沉默':'spell_shadow_impphaseshift',
    '缴械':'ability_warrior_disarm',
    '残废':'ability_rogue_trip',
    '衰老':'spell_shadow_cripple',
    '凋零':'spell_shadow_deathanddecay',
    '易爆':'spell_fire_selfdestruct',
    '灵魂链接':'spell_shadow_lifedrain02',
    '流血':'ability_rogue_rupture',
    '法力护盾':'spell_holy_powerwordshield',
    '爆发':'ability_warrior_decisivestrike',
    '法术爆发':'spell_holy_powerinfusion',
    '狂热':'spell_shadow_unholyfrenzy',
    '减伤':'spell_holy_devotionaura',
    '护盾':'spell_holy_powerwordshield',
    '急速':'ability_rogue_sprint',
    '生命洪流':'spell_shadow_lifedrain02',
    '天神下凡':'ability_warrior_endlessrage',
    '神圣守护':'spell_holy_guardianspirit',
    '野兽狂怒':'ability_druid_ferociousbite',
    '战斗怒吼':'ability_warrior_battleshout',
    '王者祝福':'spell_magic_greaterblessingofkings',
    '狂暴':'ability_racial_bloodrage',
    '风怒':'spell_nature_windfury',
    '急速射击':'ability_hunter_rapidkilling',
    '时间扭曲':'spell_arcane_blast',
    '圣盾':'spell_holy_sealofprotection',
    '炽天使':'ability_paladin_beaconoflight',
    '恶魔形态':'spell_shadow_demonform',
    '低吼':'ability_warrior_battleshout',
    '硬皮':'ability_druid_barkskin',
    '喘息':'spell_nature_healingtouch',
    '疾风':'ability_rogue_sprint',
    '石肤':'spell_nature_stoneskintotem',
    '自愈':'spell_nature_healingtouch',
    '亡者护佑':'spell_shadow_raisedead',
    '邪咒回涌':'spell_shadow_unholyfrenzy',
    '暗影修补':'spell_shadow_lifedrain',
    '铁壁':'ability_warrior_shieldwall',
    '弱点洞察':'ability_rogue_findweakness',
    '复苏结界':'spell_holy_holyprotection',
    '奥术护壁':'spell_arcane_prismaticcloak',
    '呼唤同伴':'ability_hunter_beastcall',
    '亡灵再起':'spell_shadow_raisedead',
    '虚空裂隙':'spell_shadow_summonvoidwalker',
    '元素涌现':'spell_nature_cyclone',
    '召集守卫':'achievement_bg_returnxflags_def_wsg',
    '生命绽放':'spell_nature_healingtouch',
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
    ,'锋刃狂舞':'ability_rogue_slicedice'
    ,'精神鞭笞':'spell_shadow_siphonmana'
    ,'心智震爆':'spell_shadow_unholyfrenzy'
    ,'幽灵步':'ability_rogue_shadowstep'
    ,'烟雾弹':'ability_rogue_feigndeath'
    ,'岩浆爆发':'spell_shaman_lavaburst'
    ,'群星压顶':'spell_nature_starfall'
    ,'魔藤乱舞':'spell_nature_stranglevines'
    ,'野猪之魂':'ability_hunter_pet_boar'
    ,'乌鸦形态':'ability_hunter_pet_vulture'
    ,'沙暴':'spell_nature_cyclone'
    ,'极性转换':'spell_arcane_blink'
    ,'太阳耀斑':'spell_fire_burnout'
    ,'湮灭光束':'spell_arcane_arcane01'
    ,'无面者之怒':'spell_shadow_charm'
    ,'奈法利安之怒':'ability_warrior_deathwish'
    ,'索瑞森之怒':'ability_warrior_deathwish'
    ,'兽王之怒':'ability_warrior_deathwish'
    ,'盘牙之怒':'ability_warrior_deathwish'
    ,'摩摩尔之怒':'ability_warrior_deathwish'
    ,'鳄鱼之怒':'ability_warrior_deathwish'
    ,'熊之怒':'ability_warrior_deathwish'
    ,'祖尔法拉克之怒':'ability_warrior_deathwish'
    ,'埃辛诺斯之刃':'ability_dualwield'
    ,'暗杀':'ability_rogue_eviscerate'
    ,'拆解':'ability_warrior_disarm'
    ,'伐木机撞击':'ability_warrior_charge'
    ,'负能量':'spell_shadow_shadowwordpain'
    ,'冠军之击':'ability_warrior_decisivestrike'
    ,'洛卡纳哈之灵':'spell_shadow_possession'
    ,'欺诈者之触':'spell_shadow_possession'
    ,'萨隆重压':'ability_warrior_savageblow'
    ,'熵':'spell_shadow_shadowwordpain'
    ,'碎裂':'spell_frost_frostblast'
    ,'邪能碾压':'spell_shadow_summonfelhunter'
    ,'沼泽陷阱':'spell_nature_stranglevines'
    ,'爆发':'ability_warrior_deathwish'
    ,'法术爆发':'spell_fire_sealoffire'
    ,'狂热':'ability_druid_challangingroar'
    ,'减伤':'spell_holy_aspiration'
    ,'护盾':'spell_holy_powerwordshield'
    ,'急速':'ability_rogue_sprint'
    ,'生命洪流':'spell_shadow_lifedrain'
    ,'盾墙':'ability_warrior_shieldwall'
    ,'神圣守护':'spell_holy_ardentdefender'
    ,'野兽狂怒':'ability_druid_challangingroar'
    ,'战斗怒吼':'ability_warrior_battleshout'
    ,'王者祝福':'spell_magic_magearmor'
    ,'风怒':'spell_nature_cyclone'
    ,'时间扭曲':'spell_arcane_blink'
    ,'圣盾':'spell_holy_blessingofprotection'
    ,'炽天使':'achievement_boss_illidan'
    ,'恶魔形态':'spell_shadow_demonform'
    ,'灼烧/中毒':'spell_fire_flameshock'
    ,'虚弱':'spell_shadow_grimward'
    ,'易伤':'ability_warrior_punishingblow'
    ,'冰缚':'spell_frost_chainsofice'
    ,'沉默':'spell_shadow_impphaseshift'
    ,'缴械':'ability_warrior_disarm'
    ,'恐惧':'spell_shadow_deathscream'
    ,'冻结':'spell_frost_freezingbreath'
    ,'残废':'ability_rogue_trip'
    ,'衰老':'spell_shadow_deathanddecay'
    ,'凋零':'spell_shadow_deathanddecay'
    ,'易爆':'spell_fire_selfdestruct'
    ,'灵魂链接':'spell_shadow_soulleech_3'
    ,'减速':'spell_frost_frostbolt02'
    ,'破甲':'ability_warrior_sunder'
    ,'审判':'spell_holy_righteousfury'
    ,'破绽':'ability_backstab'
    ,'低吼':'ability_warrior_battleshout'
    ,'硬皮':'ability_warrior_defensivestance'
    ,'喘息':'spell_holy_heal'
    ,'战吼':'ability_warrior_battleshout'
    ,'疾风':'ability_rogue_sprint'
    ,'石肤':'spell_nature_stoneclawtotem'
    ,'自愈':'spell_holy_heal'
    ,'亡者护佑':'spell_shadow_raisedead'
    ,'邪咒回涌':'spell_shadow_curseofsargeras'
    ,'暗影修补':'spell_shadow_lifedrain'
    ,'铁壁':'ability_warrior_shieldwall'
    ,'弱点洞察':'ability_hunter_mastermarksman'
    ,'奥术护壁':'spell_arcane_arcaneresilience'
    ,'呼唤同伴':'ability_hunter_beastcall'
    ,'亡灵再起':'spell_shadow_animatedead'
    ,'虚空裂隙':'spell_shadow_summonvoidwalker'
    ,'元素涌现':'spell_shaman_improvedstormstrike'
    ,'召集守卫':'ability_warrior_battleshout'
    ,'生命绽放':'spell_nature_healingtouch'
  };

  const SKILL_PATTERNS = [
    [/火|焰|燃|熔|炎|烈焰|龙息|灼/i, 'spell_fire_fireball02'],
    [/冰|霜|寒|雪|冻/i, 'spell_frost_frostbolt02'],
    [/奥术|法能|法力|虚空|星界|秘法/i, 'spell_arcane_blast'],
    [/暗影|灵魂|痛苦|死亡|恐惧|凋零|瘟疫|诅咒|黑暗/i, 'spell_shadow_shadowwordpain'],
    [/潮|汐|海|水流|暗潮/i, 'spell_frost_summonwaterelemental'],
    [/雷|电|风暴|闪电|风怒/i, 'spell_nature_lightning'],
    [/治疗|回春|圣疗|恢复|生命|治愈|宁静|赐福/i, 'spell_nature_healingtouch'],
    [/盾|护壁|屏障|庇护|守护|护体/i, 'spell_holy_powerwordshield'],
    [/审判|圣印|神圣|圣光/i, 'spell_holy_holybolt'],
    [/背刺|影袭|伏击|割裂|毒刃|切割|猎杀/i, 'ability_rogue_ambush'],
    [/撕咬|之咬|吞噬|撕裂|掠夺/i, 'ability_druid_ferociousbite'],
    [/斩|打击|横扫|劈|冲锋|践踏|碎骨|重殴|猛击/i, 'ability_warrior_savageblow'],
    [/箭|射击|猎|瞄准|钉刺/i, 'ability_hunter_focusedaim'],
    [/根须|树皮|自然|藤蔓|孢子|古树/i, 'spell_nature_starfall'],
    [/荆棘/i, 'spell_nature_thorns'],
    [/龙|吐息/i, 'inv_misc_head_dragon_01'],
    [/毒|蛇|蝎|蛛|瘴|腐蚀|腐化|腐烂|污染|疾病/i, 'ability_creature_poison_05'],
    [/血|吸血|鲜血|流血/i, 'spell_shadow_lifedrain02'],
    [/吼|咆哮|嚎叫|号令|鼓舞/i, 'ability_warrior_battleshout'],
    [/护甲|铁壁|石肤|硬皮|壁垒|防御/i, 'ability_warrior_defensivestance'],
    [/愈合|自愈|回复|绽放/i, 'spell_holy_heal'],
    [/召唤|援军|同伴|守卫|亡者再起/i, 'spell_shadow_summonvoidwalker'],
    [/时间|扭曲|疾风|迅捷|冲动|急速/i, 'ability_rogue_sprint'],
    [/沉默|禁锢/i, 'spell_shadow_impphaseshift'],
    [/缴械|断筋|残废/i, 'ability_warrior_disarm'],
    [/爆裂|爆炸|易爆|自爆|炸弹|炮击|轰击|地精工程/i, 'spell_fire_selfdestruct'],
    [/观察|洞察|专注|标记|审视/i, 'ability_hunter_mastermarksman'],
    [/亡灵|白骨|巫妖|尸|复苏/i, 'spell_shadow_raisedead'],
    [/之影|影子/i, 'spell_shadow_charm'],
    [/元素|涌现/i, 'spell_shaman_improvedstormstrike'],
    [/过载|过充|充能/i, 'spell_nature_lightningoverload'],
    [/共鸣|音爆|回响/i, 'spell_arcane_blast'],
    [/王者|王城|战歌|军势|号角|号令|意志|决意|威仪|降临|君临/i, 'ability_warrior_battleshout'],
    [/纳鲁|圣约|祷言|回响|回溯|微光|急救|酒泉|坚忍|母亲之赐/i, 'spell_holy_heal'],
    [/梦境|滋养|丰饶|林地|苏醒|艾露恩/i, 'spell_nature_starfall'],
    [/梦魇|凝视|视线|古神低语|腹鸣|眼棱|眼|触须|千喉/i, 'spell_shadow_charm'],
    [/暮光|深渊|军团|恶魔/i, 'spell_shadow_summonfelhunter'],
    [/重力|引力|迁跃/i, 'spell_arcane_portalshattrath'],
    [/石化|岩石|碎石|地陷|裂变|地裂|大地/i, 'spell_nature_earthquake'],
    [/之锤|长矛|脊骨|勾链/i, 'ability_warrior_decisivestrike'],
    [/之握|缚杀/i, 'spell_shadow_grimward'],
    [/扫尾|尾扫|尾击/i, 'ability_druid_swipe'],
    [/突变/i, 'ability_creature_disease_02'],
    [/疯狂/i, 'spell_shadow_charm'],
    [/处刑|处决|裁决|审讯|敕令|律令/i, 'ability_warrior_decisivestrike'],
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
    [/英灵|奥丁|瓦尔基拉|神王/i, 'spell_holy_divineillumination'],
    [/萨维斯|梦魇/i, 'spell_shadow_charm'],
    [/群星|占星|占相|观星|诺维萨/i, 'spell_arcane_starfire'],
    [/虚灵|以太|相位|卡雷什|吞界|影点|沙恩多拉/i, 'inv_11_0_etherealraid_communicator_color1'],
    [/野猪|狼|熊|兽|霍格/i, 'ability_hunter_pet_boar'],
    [/鲁克玛|太阳鸟|巨鸟|阿兰卡/i, 'ability_hunter_pet_vulture'],
    [/骑士|圣光|提里奥|安度因|伯瓦尔/i, 'spell_holy_holybolt'],
    [/战士|步兵|督军|加尔鲁什|瓦里安|格罗玛什/i, 'ability_warrior_savageblow']
  ];

  Object.assign(ENTITY_EXACT, {
    '萨鲁法尔大王':'classicon_warrior',
    '萨鲁法尔':'classicon_warrior',
    '死亡使者萨鲁法尔':'ability_warrior_savageblow',
    '迦顿男爵':'spell_fire_selfdestruct',
    '帕奇维克':'ability_warrior_savageblow',
    '萨菲隆':'spell_frost_freezingbreath',
    '猎手阿图门':'ability_mount_ridinghorse',
    '巴尔萨鲁斯':'inv_misc_head_dragon_black',
    '扎里斯利安将军':'ability_warrior_battleshout',
    '沙斯拉尔':'spell_arcane_blink',
    '萨弗隆先驱者':'spell_fire_flameshock',
    '焚化者古雷曼格':'spell_fire_volcano',
    '埃博诺克':'inv_misc_head_dragon_black',
    '弗莱格尔':'inv_misc_head_dragon_black',
    '费尔默':'inv_misc_head_dragon_black',
    '哈霍兰公主':'ability_creature_poison_05',
    '奥罗':'spell_nature_earthquake',
    '迈克斯纳':'ability_creature_poison_05',
    '格罗布鲁斯':'ability_creature_disease_02',
    '格拉斯':'spell_shadow_raisedead',
    '教官拉苏维奥斯':'ability_warrior_shieldwall',
    '收割者戈提克':'spell_shadow_raisedead',
    '天启四骑士':'spell_shadow_deathcoil',
    '布鲁塔卢斯':'spell_fire_volcano',
    '菲米丝':'ability_creature_disease_02',
    '艾瑞达双子':'spell_shadow_summonfelhunter',
    '银色勇士':'ability_warrior_shieldwall',
    '芙蕾雅':'spell_nature_lifebloom',
    '法瑞克':'ability_warrior_shieldwall',
    '玛维恩':'ability_warrior_savageblow',
    '巫妖王之影':'achievement_boss_lichking',
    '断牙海狗':'ability_hunter_pet_wolf',
    '酒桶炸药师':'spell_fire_selfdestruct',
    '回收机器人':'trade_engineering',
    '爆破专家':'spell_fire_selfdestruct',
    '海军统领':'inv_misc_enggizmos_21',
    '巡夜指挥官':'ability_hunter_pet_wolf',
    '赞达拉守卫贾林':'achievement_character_troll_male',
    '晨曦荒野之莫戈尔':'ability_hunter_pet_crocolisk',
    '莎萨拉恩女勋爵':'achievement_boss_ladyvashj',
    '萨格拉斯的地狱犬':'spell_shadow_summonfelhunter',
    '外科医生缝肉':'spell_shadow_abominationexplosion',
    '达克丝塔':'ability_hunter_pet_vulture',
    '跳跳大王':'achievement_worldevent_brewmaster',
    '瓦兹拉吉':'achievement_character_troll_male',
    '尼提兹':'ability_creature_poison_05',
    '忏悔者阿德琳娜':'spell_holy_innerfire',
    '瘟疫医师玛拉克斯':'ability_creature_disease_02',
    '特雷德欧瓦':'spell_nature_summonpet_01',
    '贪食者拉尔':'spell_shadow_lifedrain02',
    '注能吞噬者':'spell_frost_summonwaterelemental',
    '飘雾艾尔':'achievement_boss_ladyvashj',
    '深渊领主':'inv_misc_monstertentacle_01',
    '史矛莱什':'ability_creature_poison_06',
    '烛光修士艾丹':'spell_fire_sealoffire',
    '蘑菇术士维洛':'spell_nature_summonpet_01',
    '菌潮巨怪':'ui-ej-boss-fungariangiant',
    '贝丝缇拉克':'ability_creature_poison_05',
    '熔岩之王莱奥利斯':'spell_fire_volcano',
    '巴尔洛戈斯':'ability_hunter_pet_wolf',
    '炎鹰阿莱索德':'ability_hunter_pet_vulture',
    '风暴祭司莱杉':'spell_shaman_thunderstorm',
    '三头巨龙米伽拉':'inv_misc_head_dragon_01',
    '织雾者吉安娜':'spell_nature_rejuvenation',
    '亡语者':'spell_shadow_raisedead',
    '死亡之翼背脊':'inv_misc_head_dragon_black',
    '瓦里奥那与塞拉图斯':'spell_nature_lightningoverload',
    '不洁之溢':'ability_creature_disease_02',
    '傲慢之煞':'spell_shadow_charm',
    '钢铁巨像':'trade_engineering',
    '达克沙将军':'ability_hunter_focusedaim',
    '钢铁掠袭者':'trade_engineering',
    '戈罗斯':'spell_fire_volcano',
    '恶魔审判官':'spell_shadow_summonfelhunter',
    '守护之少女':'ability_warrior_shieldwall',
    '加洛希世界破坏者':'trade_engineering',
    '灵魂猎手伊莫纳':'ability_hunter_focusedaim',
    '金加洛斯':'trade_engineering',
    '阿格拉玛':'ability_warrior_savageblow',
    '海姆达尔':'spell_holy_divineillumination',
    '大德鲁伊格莱达利斯':'spell_nature_starfall',
    '橡树之心':'spell_nature_naturetouchgrow',
    '恐惧编织者诺索斯':'spell_shadow_possession',
    '烈焰缠绕塔利克丝':'spell_fire_fire',
    '疫骨':'ability_creature_disease_02',
    '收割者矩阵':'trade_engineering',
    '塞泰克先知':'spell_shadow_charm',
    '鸦人之王伊瑞尔':'ability_hunter_pet_vulture',
    '格鲁布':'ability_hunter_pet_boar',
    '监护者沃尔卡':'ability_warrior_shieldwall',
    '编织者扎克兰':'spell_nature_stranglevines',
    '魔血之触':'spell_shadow_lifedrain02',
    '垫脚石':'spell_nature_skinofearth',
    '禁锢者泽克伏斯':'ability_creature_disease_02',
    '恐惧之臂沃舒':'spell_shadow_charm',
    '噩梦巨龙':'inv_misc_head_dragon_green',
    '乌索克之灵':'ability_hunter_pet_bear',
    '梦魇之龙伊瑟拉':'inv_misc_head_dragon_green',
    '石裔典狱官':'spell_nature_skinofearth',
    '高阶领主哈卡':'spell_holy_crusaderstrike',
    '全球大瘟疫':'ability_creature_disease_02',
    '多曼戈斯':'inv_potion_155',
    '因格拉·玛洛克':'spell_nature_stranglevines',
    '迷雾呼唤者':'spell_nature_sleep',
    '角斗士的挑衅':'ability_warrior_shieldwall',
    '血肉钩刃戈莱什':'inv_misc_hook_01',
    '库尔塔罗克':'spell_shadow_soulgem',
    '灵魂巨像':'spell_shadow_soulgem',
    '守墓人迪萨克':'inv_misc_stonetablet_02',
    '监工艾克泽勒':'trade_engineering',
    '达卡莱巨像':'inv_misc_gem_topaz_02',
    '蝎钳魔':'ability_hunter_pet_scorpid',
    '提克迪奥斯':'spell_shadow_summonfelhunter',
    '占星师埃塔莉丝':'spell_arcane_starfire',
    '克罗苏斯':'spell_fire_volcano',
    '黑龙王子拉希奥':'inv_misc_head_dragon_black',
    '先知斯基特拉':'spell_shadow_charm',
    '暗影审讯官沙奈什':'spell_shadow_shadowworddominate',
    '沙德拉':'ability_creature_disease_02',
    '维克希翁':'ability_creature_poison_06',
    '尖啸之翼':'spell_shadow_possession',
    '猎手阿尔提莫':'ability_hunter_focusedaim',
    '噬渴灭世者':'spell_shadow_lifedrain02',
    '达克文女勋爵':'spell_shadow_lifedrain',
    '鲜血议会':'spell_shadow_lifedrain02',
    '格鲁达鲁':'ability_rogue_sprint',
    '大主祭奥兹鲁克':'spell_nature_earthquake',
    '工头泽奥格雷尔':'trade_engineering',
    '永燃者拉克玛雷':'spell_fire_fire',
    '古杉魔藤':'spell_nature_naturetouchgrow',
    '喷涌元素':'spell_frost_summonwaterelemental',
    '阴森巨兽':'ability_hunter_pet_boar',
    '熔铸者卡格尼':'inv_hammer_04',
    '守护者陶提斯':'spell_holy_powerwordshield',
    '盗宝龙裔':'inv_misc_head_dragon_01',
    '焰炉之主玛吉莫斯':'spell_fire_volcano',
    '莱魔':'spell_shadow_unholyfrenzy',
    '青刃构装体':'trade_engineering',
    '泰拉什·灰翼':'inv_misc_head_dragon_blue',
    '安布雷斯库':'spell_arcane_portalshattrath',
    '格拉尼斯':'ability_hunter_pet_windserpent',
    '风暴召唤者巴拉卡尔':'spell_shaman_thunderstorm',
    '诺库德猎群':'ability_hunter_focusedaim',
    '守望者艾瑞克':'ability_warrior_shieldwall',
    '泰坦水道枢纽':'trade_engineering',
    '原始海啸':'spell_frost_summonwaterelemental',
    '劈爪战团':'inv_axe_01',
    '腐喉':'spell_shadow_raisedead',
    '臭皮炼金师':'inv_potion_155',
    '蕨皮酋长':'achievement_character_orc_male',
    '暗鳞军团':'achievement_boss_ladyvashj',
    '深渊指挥官西瓦拉':'spell_frost_freezingbreath',
    '黑暗预言者':'spell_shadow_charm',
    '卡赞':'spell_nature_cyclone',
    '焚化者拉什卡尔':'spell_fire_fire',
    '鲜血法师沙拉嘎':'spell_shadow_lifedrain02',
    '禁锢魔像':'trade_engineering',
    '黑龙萨拉塔斯':'inv_misc_head_dragon_black',
    '古加冯':'ability_hunter_pet_boar',
    '织焰巫女':'spell_fire_flameshock',
    '暮光化身':'spell_shadow_deathanddecay',
    '掌炉者艾里克':'inv_hammer_04',
    '晶化守卫':'inv_misc_gem_variety_01',
    '机械议长布洛克':'trade_engineering',
    '虚空矩阵守护者':'spell_shadow_soulgem',
    '信标守卫加伦':'ability_warrior_shieldwall',
    '圣焰骑士团':'spell_holy_crusaderstrike',
    '隐修院长穆普雷':'spell_holy_holybolt',
    '暗潮钥卫':'inv_misc_key_14',
    '低语宝箱':'inv_crate_04',
    '夜落看守者':'spell_shadow_deathanddecay',
    '蛛网矿工队':'ability_creature_poison_05',
    '工头皮夫克':'trade_engineering',
    '地匍蛛母':'ability_creature_poison_05',
    '孢子看守':'ability_creature_disease_02'
  });

  Object.assign(ENTITY_EXACT, {
    // 卡雷什 / Midnight 终局副本与团本头像补全:让新团本首领在副本手册中拥有稳定的专属识别。
    '抄录审判官':'inv_misc_book_11',
    '群星馆长索·普莱翁':'spell_arcane_starfire',
    '枢纽哨兵':'inv_misc_gem_variety_01',
    '卢米萨尔':'spell_arcane_prismaticcloak',
    '缚魂者娜欣德莉':'spell_shadow_possession',
    '织炉者阿拉兹':'spell_holy_magicalsentry',
    '噬魂猎手':'ability_hunter_focusedaim',
    '碎裂者弗拉克提勒斯':'inv_misc_gem_diamond_02',
    '枢纽之王萨哈达尔':'achievement_boss_lichking',
    '诸界吞噬者迪门修斯':'spell_arcane_portalshattrath',
    '断阶守誓者':'spell_nature_skinofearth',
    '棱镜观测者':'inv_misc_gem_sapphire_02',
    '仪轨编年官':'inv_misc_map_01',
    '沙恩多拉双星':'inv_11_0_etherealraid_communicator_color1',
    '天穹测距者':'inv_misc_spyglass_03',
    '虚空航线执笔人':'spell_shadow_charm',
    '群星议长索·阿兹拉':'spell_arcane_starfire',
    '庇护壁垒机':'spell_holy_powerwordshield',
    '虚刃掠食兽':'ability_rogue_slicedice',
    '裂幕引航者':'spell_shadow_charm',
    '圆顶求生议会':'ability_warrior_shieldwall',
    '吞界剃刀体':'inv_11_0_etherealraid_communicator_color1',
    '庇护执裁官萨·维克斯':'achievement_reputation_08',
    '吞界观测主脑阿兹莫垩':'inv_11_0_etherealraid_communicator_color1',
    '囤货者霍尔蒙格':'inv_crate_04',
    '冬境哨兵':'spell_frost_frostbolt02',
    '穆罗金与奈克拉克斯':'ability_hunter_pet_windserpent',
    '沃达扎':'spell_shadow_raisedead',
    '拉克图尔':'spell_shadow_deathanddecay',
    '日井裂隙守望者':'spell_holy_powerinfusion',
    '血骑士断誓者':'spell_holy_crusaderstrike',
    '远行者虚空猎手':'ability_hunter_focusedaim',
    '盘绕岛守门者':'spell_nature_cyclone',
    '失语先知玛洛斯':'spell_shadow_charm',
    '四神庙残影':'ability_hunter_beastcall',
    '银月裂法者':'inv_misc_gem_variety_01'
  });

  Object.assign(ENTITY_EXACT, {
    // 卡雷什高等级 5 人本 / 地下堡头像补全。
    '档案劫掠者':'inv_misc_map_01',
    '相位门卫欧索':'inv_11_0_etherealraid_communicator_color1',
    '节点公主凯维扎':'spell_shadow_unholyfrenzy',
    '阿尔达尼吞噬者':'ability_hunter_pet_crocolisk',
    '荒原双子':'ability_warrior_savageblow',
    '生态看护者阿尔达尼':'spell_nature_stranglevines',
    '水化幼体群':'spell_nature_summonpet_01',
    '入侵孢母':'ability_creature_disease_02',
    '绿洲守望者菲拉':'inv_misc_herb_felweed',
    '佐·帕克斯':'inv_crate_04',
    '卖品会':'inv_misc_coin_01',
    '麦扎的绿洲':'spell_holy_holynova',
    '索·莉亚':'inv_misc_gem_diamond_02',
    '海盗议会':'ability_rogue_slicedice',
    '邮件室混乱体':'inv_crate_04',
    '希尔布兰德':'trade_engineering',
    '索·莉亚的宏图':'spell_arcane_portalshattrath',
    '瞰台测绘师':'inv_misc_spyglass_03',
    '裂隙校准体':'spell_nature_cyclone',
    '瞰台司辰扎里克':'spell_holy_powerinfusion',
    '灌溉执机者':'spell_arcane_blast',
    '吞壤孵母':'ability_creature_poison_05',
    '谱系修补师':'spell_arcane_prismaticcloak',
    '芽冠主脑瑞欧萨':'spell_nature_naturetouchgrow',
    '界钉炮手':'trade_engineering',
    '裂航狙击队':'ability_hunter_focusedaim',
    '影卫相位校尉':'inv_11_0_etherealraid_communicator_color1',
    '影卫指挥官索拉辛':'spell_arcane_portalshattrath',
    '圣所馆卫':'inv_misc_book_11'
  });

  Object.assign(SKILL_EXACT, {
    '斩杀':'inv_sword_48',
    '裂伤':'ability_druid_lacerate',
    '顺劈':'ability_warrior_cleave',
    '顺劈斩':'ability_warrior_cleave',
    '鲁莽':'ability_criticalstrike',
    '天神下凡':'warrior_talent_icon_avatar',
    '压制':'ability_meleedamage',
    '致死劈砍':'ability_warrior_savageblow',
    '致死打击':'ability_warrior_savageblow',
    '战吼':'ability_warrior_battleshout',
    '盾墙':'ability_warrior_shieldwall',
    '雷霆一击':'ability_thunderclap',
    '强力一击':'ability_warrior_decisivestrike',
    '重盾击':'ability_warrior_shieldbash',
    '爆裂射击':'ability_hunter_explosiveshot',
    '野兽狂怒':'ability_druid_ferociousbite',
    '圣光审判':'spell_holy_righteousfury',
    '圣盾':'spell_holy_blessingofprotection',
    '法力梭镖':'spell_arcane_arcane01',
    '蛊惑':'spell_shadow_possession',
    '毁灭':'spell_fire_selfdestruct',
    '精准打断':'ability_kick',
    '弱点猎手':'inv_misc_gem_diamond_02',
    '控场清理':'ability_warrior_battleshout',
    '破盾专家':'spell_holy_powerwordshield',
    '仪式否决':'inv_scroll_03',
    '速战速决':'inv_misc_pocketwatch_01',
    '稳健收尾':'spell_holy_heal',
    '湮灭仪式':'spell_shadow_shadowbolt',
    '暮光审判':'spell_fire_meteorstorm',
    '奥术封锁':'spell_arcane_starfire',
    '鲜血收割':'spell_shadow_lifedrain',
    '瘟疫绽放':'ability_creature_disease_02',
    '雷狱锁链':'spell_nature_lightningoverload',
    '熔炉重铸':'spell_holy_powerwordshield',
    '凋零判决':'spell_frost_freezingbreath',
    '邪能灾变':'spell_fire_selfdestruct',
    '处刑指令':'ability_hunter_focusedaim'
  });

  // 英雄技能精确图标覆盖: 优先使用原版 WoW 技能图标名, 避免落入 emoji/关键词兜底。
  Object.assign(SKILL_EXACT, {
    // 战士
    '拳击':'inv_gauntlets_04',
    '挑战怒吼':'ability_warrior_battleshout',
    '横扫攻击':'ability_warrior_cleave',
    '剑刃风暴':'ability_whirlwind',
    '钢铁壁垒':'ability_warrior_shieldwall',
    '巨人之击':'ability_warrior_sunder',
    '怒火乱舞':'ability_warrior_innerrage',

    // 法师
    '奥术飞弹':'spell_nature_starfall',
    '奥术爆炸':'spell_nature_wispsplode',
    '寒冰护体':'spell_ice_lament',
    '变形术':'spell_nature_polymorph',
    '时间扭曲':'ability_mage_timewarp',
    '寒冰屏障':'spell_ice_lament',
    '奥术强化':'spell_arcane_arcanepotency',
    '奥术弹幕':'spell_arcane_blast',
    '冰枪术':'spell_frost_frostblast',

    // 牧师
    '沉默':'spell_shadow_impphaseshift',
    '惩击':'spell_holy_holysmite',
    '真言术盾':'spell_holy_powerwordshield',
    '恢复':'spell_holy_renew',
    '束缚亡灵':'spell_nature_slow',
    '神圣之火':'spell_holy_holysmite',
    '神圣赞美诗':'spell_holy_divinehymn',
    '暗影形态':'spell_shadow_shadowform',
    '虚空爆发':'spell_shadow_shadowwordpain',
    '惩罚':'spell_holy_penance',

    // 盗贼
    '邪恶打击':'spell_shadow_ritualofsacrifice',
    '暗影斗篷':'spell_shadow_shadowward',
    '割裂':'ability_rogue_rupture',
    '死亡标记':'ability_rogue_eviscerate',
    '奉毒':'ability_rogue_deadlybrew',
    '暗袭':'ability_rogue_shadowstrike',

    // 猎人
    '反制射击':'ability_hunter_focusedaim',
    '奥术射击':'ability_impalingbolt',
    '召唤宠物':'ability_hunter_beastcall',
    '瞄准射击':'ability_hunter_aimedshot',
    '多重射击':'ability_hunter_quickshot',
    '狂野怒火':'ability_hunter_bestialdiscipline',
    '猎人印记':'ability_hunter_markedfordeath',
    '弹幕射击':'ability_hunter_rapidkilling',
    '冰冻陷阱':'spell_frost_chainsofice',
    '协同猛攻':'ability_hunter_beastcall',
    '奇美拉射击':'ability_hunter_pet_windserpent',

    // 萨满
    '风剪':'spell_frost_iceshock',
    '闪电链':'spell_nature_chainlightning',
    '治疗波':'spell_nature_healingwavegreater',
    '风怒武器':'spell_nature_windfury',
    '地震术':'spell_nature_earthquake',
    '灵魂链接':'spell_shadow_soulleech_3',
    '雷霆风暴':'spell_shaman_thunderstorm',
    '大地震击':'spell_nature_earthshock',
    '熔岩猛击':'spell_shaman_lavaburst',

    // 圣骑士
    '责难':'spell_holy_rebuke',
    '奉献':'spell_holy_innerfire',
    '圣光术':'spell_holy_holybolt',
    '王者祝福':'spell_magic_greaterblessingofkings',
    '复仇之怒':'spell_holy_avenginewrath',
    '圣盾术':'spell_holy_divineshield',
    '圣洁护盾':'spell_holy_powerwordshield',
    '圣殿裁决':'ability_paladin_hammeroftherighteous',
    '愤怒之锤':'spell_paladin_hammerofwrath',

    // 术士
    '生命分流':'spell_shadow_lifedrain02',
    '暗影之怒':'spell_shadow_shadowfury',
    '灵魂之火':'spell_fire_fireball02',
    '痛苦无常':'spell_shadow_unholyfrenzy',
    '召唤地狱火':'spell_shadow_summoninfernal',
    '邪能狂涌':'spell_shadow_rainoffire',
    '恶魔之箭':'spell_warlock_demonbolt',

    // 德鲁伊
    '愤怒':'spell_nature_abolishmagic',
    '横扫':'ability_druid_swipe',
    '星火术':'spell_arcane_starfire',
    '野性成长':'ability_druid_flourish',
    '纠缠根须':'spell_nature_stranglevines',
    '新月强击':'spell_arcane_starfire',
    '野性狂怒':'ability_druid_catform'
  });

  function normalizeSize(size) {
    if (typeof size === 'number') return size;
    if (size === 'xs') return 14;
    if (size === 'sm') return 16;
    if (size === 'lg') return 22;
    return 18;
  }

  function wowIconName(name) {
    if (!name) return '';
    // CDN优先, 避免本地缺失文件的404错误; CDN失败时onerror回退本地
    return CDN_BASE + name + '.jpg';
  }

  function warmIconUrl(url) {
    if (!url || warmedUrls.has(url) || typeof Image === 'undefined') return;
    warmedUrls.add(url);
    const img = new Image();
    img.decoding = 'sync';
    img.src = url;
  }

  function imgHtml(src, size, alt, fallback, cls, loadingMode) {
    const px = normalizeSize(size);
    const iconKey = String(src || '').replace(BASE, '').replace(CDN_BASE, '').replace(/\.jpg$/i, '');
    // 构造本地兜底 URL (CDN加载失败时尝试)
    const localSrc = src.indexOf(BASE) === 0 ? src : src.replace(CDN_BASE, BASE);
    warmIconUrl(src);
    return `<span class="${cls || 'ui-icon wow-ico'}" style="width:${px}px;height:${px}px" title="${alt || ''}">
      <img src="${src}" alt="${alt || ''}" loading="${loadingMode || 'eager'}" decoding="sync"
        onerror="var t=this;window.__wowMissingIcons=window.__wowMissingIcons||{};window.__wowMissingIcons['${iconKey}']=1;if(!t.dataset.tried){t.dataset.tried='1';t.src='${localSrc}';}else{t.parentNode.replaceWith(document.createTextNode(t.dataset.fb||''))}"
        data-fb="${(fallback || '').replace(/"/g, '&quot;')}">
    </span>`;
  }

  function resolveByPattern(name, exactMap, patterns, fallbackName) {
    if (!name) return fallbackName || '';
    const raw = String(name);
    const normalized = raw
      .replace(/<[^>]+>/g, '')
      .replace(/^[^A-Za-z0-9\u4e00-\u9fa5]+/u, '')
      .trim();
    if (exactMap && exactMap[raw]) return exactMap[raw];
    if (exactMap && exactMap[normalized]) return exactMap[normalized];
    for (const [re, icon] of (patterns || [])) {
      if (re.test(normalized || raw)) return icon;
    }
    return fallbackName || '';
  }

  function isIconName(value) {
    return typeof value === 'string' && /^[a-z0-9_]+$/i.test(value) && value.includes('_');
  }

  function fallbackText(value) {
    return isIconName(value) ? '' : (value || '');
  }

  function normalizedIconLabel(value) {
    return String(value || '')
      .replace(/<[^>]+>/g, '')
      .replace(/^[^A-Za-z0-9\u4e00-\u9fa5]+/u, '')
      .trim();
  }

  function resolveSymbolIconName(symbol) {
    if (!symbol) return '';
    if (SYMBOL_ICON[symbol]) return SYMBOL_ICON[symbol];
    return isIconName(symbol) ? symbol : '';
  }

  function resolveLabelIconName(label, defaultName) {
    if (!label) return defaultName || '';
    const skillIconName = resolveByPattern(label, SKILL_EXACT, SKILL_PATTERNS, '');
    if (skillIconName && skillIconName !== 'inv_misc_questionmark') return skillIconName;
    const entityIconName = resolveByPattern(label, ENTITY_EXACT, ENTITY_PATTERNS, '');
    if (entityIconName && entityIconName !== 'inv_misc_questionmark') return entityIconName;
    return defaultName || '';
  }

  function resolveEntityIconInfo(entityName, fallback) {
    const raw = String(entityName || '');
    const normalized = normalizedIconLabel(raw);
    let iconName = ENTITY_EXACT[raw] || ENTITY_EXACT[normalized] || '';
    if (iconName) return { iconName, source:'exact', label:'专属头像' };
    for (const [re, icon] of ENTITY_PATTERNS) {
      if (re.test(normalized || raw)) return { iconName:icon, source:'theme', label:'主题头像' };
    }
    iconName = resolveSymbolIconName(fallback);
    if (iconName) return { iconName, source:'emoji', label:'表情头像' };
    iconName = resolveLabelIconName(fallback, '');
    if (iconName) return { iconName, source:'fallback', label:'回退头像' };
    return { iconName:'inv_misc_head_dragon_01', source:'generic', label:'通用头像' };
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
    const iconName =
      resolveByPattern(skillName, SKILL_EXACT, SKILL_PATTERNS, '') ||
      resolveSymbolIconName(fallback) ||
      resolveLabelIconName(fallback, '') ||
      'spell_holy_powerinfusion';
    return imgHtml(wowIconName(iconName), size, skillName, '', 'wow-inline-icon');
  };

  window.entityIcon = function (entityName, size, fallback) {
    const iconName = resolveEntityIconInfo(entityName, fallback).iconName;
    return imgHtml(wowIconName(iconName), size, entityName, '', 'wow-inline-icon');
  };

  window.entityIconInfo = function (entityName, fallback) {
    const info = resolveEntityIconInfo(entityName, fallback);
    return Object.assign({}, info, { src:BASE + info.iconName + '.jpg' });
  };

  window.dungeonIcon = function (key, name, size, fallback) {
    const baseKey = String(key || '').replace(/_(heroic|epic5|epic)$/i, '');
    const iconName =
      DUNGEON_ICON[key] ||
      DUNGEON_ICON[baseKey] ||
      resolveSymbolIconName(fallback) ||
      resolveLabelIconName(name, '') ||
      'achievement_dungeon_naxxramas';
    return imgHtml(wowIconName(iconName), size, name || key, '', 'wow-inline-icon');
  };

  window.symbolIcon = function (symbol, size, label, fallback) {
    const iconName =
      resolveSymbolIconName(symbol) ||
      resolveSymbolIconName(fallback) ||
      resolveLabelIconName(label, '') ||
      resolveLabelIconName(fallback, '') ||
      'spell_holy_powerinfusion';
    return imgHtml(wowIconName(iconName), size, label || symbol || '', '', 'wow-inline-icon');
  };

  window.statusIcon = function (name, symbol, size, fallback) {
    const iconName =
      resolveLabelIconName(name, '') ||
      resolveSymbolIconName(symbol) ||
      resolveSymbolIconName(fallback) ||
      resolveLabelIconName(fallback, '') ||
      'spell_holy_powerinfusion';
    return imgHtml(wowIconName(iconName), size, name || symbol || '', '', 'wow-inline-icon', 'eager');
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
