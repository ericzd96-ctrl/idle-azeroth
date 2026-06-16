// icons.js — 用爬来的魔兽官方图标替换部分 emoji 图标(显示=实际,带 emoji 兜底)
// 只对“能 1:1 干净映射”的内容做替换:9 个职业 + 3 个生活技能。
// 资源放在 assets/wow/ 下;不在映射表里的 key 一律回退到原 emoji,绝不破坏现有显示。
(function () {
  const BASE = 'assets/wow/';

  // 游戏 class key -> 图标文件名(assets/wow/class/)
  const CLASS_ICON = {
    warrior: 'classicon_warrior.jpg',
    mage:    'classicon_mage.jpg',
    priest:  'classicon_priest.jpg',
    rogue:   'classicon_rogue.jpg',
    hunter:  'classicon_hunter.jpg',
    shaman:  'classicon_shaman.jpg',
    paladin: 'classicon_paladin.jpg',
    warlock: 'classicon_warlock.jpg',
    druid:   'classicon_druid.jpg',
  };

  // 生活技能 key -> 图标文件名(assets/wow/prof/)
  const PROF_ICON = {
    mining:  'ui_profession_mining.jpg',
    fishing: 'ui_profession_fishing.jpg',
    herb:    'ui_profession_herbalism.jpg',
  };

  // 天赋专精 '职业key:专精树key' -> 图标文件名(assets/wow/spec/)
  // 树 key 跨职业会重复(holy/prot/resto…),故用复合键
  const SPEC_ICON = {
    'warrior:arms':         'ability_warrior_savageblow.jpg',
    'warrior:fury':         'ability_warrior_innerrage.jpg',
    'warrior:prot':         'ability_warrior_defensivestance.jpg',
    'mage:arcane':          'spell_holy_magicalsentry.jpg',
    'mage:fire':            'spell_fire_firebolt02.jpg',
    'mage:frost':           'spell_frost_frostbolt02.jpg',
    'priest:discipline':    'spell_holy_powerwordshield.jpg',
    'priest:holy':          'spell_holy_guardianspirit.jpg',
    'priest:shadow':        'spell_shadow_shadowwordpain.jpg',
    'rogue:assassination':  'ability_rogue_deadlybrew.jpg',
    'rogue:combat':         'ability_rogue_waylay.jpg',
    'rogue:subtlety':       'ability_stealth.jpg',
    'hunter:bm':            'ability_hunter_bestialdiscipline.jpg',
    'hunter:marks':         'ability_hunter_focusedaim.jpg',
    'hunter:survival':      'ability_hunter_camouflage.jpg',
    'shaman:element':       'spell_nature_lightning.jpg',
    'shaman:enhancement':   'spell_shaman_improvedstormstrike.jpg',
    'shaman:restoration':   'spell_nature_magicimmunity.jpg',
    'paladin:holy':         'spell_holy_holybolt.jpg',
    'paladin:prot':         'ability_paladin_shieldofthetemplar.jpg',
    'paladin:ret':          'spell_holy_auraoflight.jpg',
    'warlock:affliction':   'spell_shadow_deathcoil.jpg',
    'warlock:demonology':   'spell_shadow_metamorphosis.jpg',
    'warlock:destruction':  'spell_shadow_rainoffire.jpg',
    'druid:balance':        'spell_nature_starfall.jpg',
    'druid:feral':          'ability_druid_catform.jpg',
    'druid:resto':          'spell_nature_healingtouch.jpg',
  };

  function imgHtml(src, size, alt) {
    const s = size || 20;
    return `<img class="wic" src="${src}" alt="${alt || ''}" ` +
      `style="width:${s}px;height:${s}px" loading="lazy" ` +
      `onerror="this.replaceWith(document.createTextNode(this.dataset.fb||''))" ` +
      `data-fb="${(alt || '').replace(/"/g, '&quot;')}">`;
  }

  // 职业图标 HTML;无映射或无 key 时回退到 emoji(fallback)
  window.classIcon = function (key, size, fallback) {
    const f = CLASS_ICON[key];
    if (!f) return fallback || '';
    return imgHtml(BASE + 'class/' + f, size, fallback || '');
  };

  // 生活技能图标 HTML;无映射时回退 emoji
  window.profIcon = function (key, size, fallback) {
    const f = PROF_ICON[key];
    if (!f) return fallback || '';
    return imgHtml(BASE + 'prof/' + f, size, fallback || '');
  };

  // 天赋专精图标 HTML;无映射时回退 emoji
  window.specIcon = function (clsKey, treeKey, size, fallback) {
    const f = SPEC_ICON[clsKey + ':' + treeKey];
    if (!f) return fallback || '';
    return imgHtml(BASE + 'spec/' + f, size, fallback || '');
  };
})();
