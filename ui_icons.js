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
    '树皮术':'spell_nature_stoneclawtotem'
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
    [/龙|吐息/i, 'inv_misc_head_dragon_01']
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
