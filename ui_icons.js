(function () {
  const ICONS = {
    battle:   { fg:'#f6d79a', bg1:'#5b2718', bg2:'#24120d', svg:'<path d="M7 5l4 4-5 5-2 1 1-2 5-5-4-4z"/><path d="M17 5l-4 4 5 5 2 1-1-2-5-5 4-4z"/>' },
    hero:     { fg:'#d9e7ff', bg1:'#32466b', bg2:'#121b2c', svg:'<path d="M8 9.5c.7-2 2.2-3 4-3s3.3 1 4 3"/><path d="M8.5 10.5h7l-1 4.5h-5z"/><path d="M10 7.5l2-2 2 2"/>' },
    map:      { fg:'#8bd4ff', bg1:'#294a5d', bg2:'#111d28', svg:'<path d="M4.5 6.5l5-2 5 2 5-2v13l-5 2-5-2-5 2z"/><path d="M9.5 4.5v13"/><path d="M14.5 6.5v13"/>' },
    inventory:{ fg:'#f3d7a4', bg1:'#5d4124', bg2:'#22170e', svg:'<path d="M6 8.5h12v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/><path d="M10 12.5h4"/>' },
    guide:    { fg:'#ead7af', bg1:'#4f4430', bg2:'#1f1a14', svg:'<path d="M6 5.5h9a3 3 0 0 1 3 3v10H9a3 3 0 0 0-3 0z"/><path d="M6 5.5v13"/><path d="M10 9.5h5"/><path d="M10 12.5h5"/>' },
    talent:   { fg:'#95efbe', bg1:'#234333', bg2:'#101d17', svg:'<path d="M12 18.5v-7"/><path d="M12 11.5c0-3 2.2-5 5-5"/><path d="M12 11.5c0-3-2.2-5-5-5"/><path d="M12 8.5c.6-2 2-3 4-3"/><path d="M12 8.5c-.6-2-2-3-4-3"/>' },
    companion:{ fg:'#f6d79a', bg1:'#5a3b22', bg2:'#21150d', svg:'<circle class="fill" cx="8" cy="9" r="1.6"/><circle class="fill" cx="12" cy="7.2" r="1.8"/><circle class="fill" cx="16" cy="9" r="1.6"/><path d="M8.5 15c0-2 1.6-3.5 3.5-3.5s3.5 1.5 3.5 3.5c0 1.4-1 2.5-3.5 2.5S8.5 16.4 8.5 15z"/>' },
    dungeon:  { fg:'#d2d7ff', bg1:'#34345f', bg2:'#141528', svg:'<path d="M5 18.5V9.5l7-4 7 4v9"/><path d="M8.5 18.5v-4h7v4"/><path d="M9 10.5h.01"/><path d="M15 10.5h.01"/>' },
    arena:    { fg:'#ffb98d', bg1:'#5a3222', bg2:'#24130d', svg:'<path d="M5 17.5h14"/><path d="M7 17.5v-5l5-3 5 3v5"/><path d="M8.5 14.5h7"/><path d="M10 11.5h4"/>' },
    artifact: { fg:'#f0d1ff', bg1:'#4d2e5e', bg2:'#1b1023', svg:'<path d="M12 4.5l3 3-1.6 1.6 2.6 2.6-2 2-2.6-2.6-4.9 4.9-2.4.6.6-2.4 4.9-4.9-2.6-2.6 2-2 2.6 2.6L12 4.5z"/>' },
    profession:{ fg:'#d6e3f8', bg1:'#334252', bg2:'#141c24', svg:'<path d="M8 7.5l3 3-4.5 4.5H4v-2.5z"/><path d="M13.5 5.5l5 5"/><path d="M14.8 4.2l5 5-1.3 1.3-5-5z"/>' },
    progression:{ fg:'#ffe08c', bg1:'#5b4b1d', bg2:'#241c0d', svg:'<path d="M12 5.5l2 4 4.5.6-3.2 3 1 4.4-4.3-2.2-4.3 2.2 1-4.4-3.2-3 4.5-.6z"/>' },
    events:   { fg:'#ffbfcd', bg1:'#5c3140', bg2:'#231118', svg:'<path d="M6 6.5h12"/><path d="M8 4.5v4"/><path d="M16 4.5v4"/><rect x="5" y="8.5" width="14" height="10" rx="2"/><path d="M9 12.5h6"/>' },
    ascend:   { fg:'#c8bcff', bg1:'#3e2d66', bg2:'#171022', svg:'<path d="M12 4.5l5 5-5 10-5-10z"/><path d="M12 4.5v15"/>' },
    location: { fg:'#8fe2ff', bg1:'#2a4d61', bg2:'#101f28', svg:'<path d="M12 19.5s5-4.6 5-8a5 5 0 1 0-10 0c0 3.4 5 8 5 8z"/><circle cx="12" cy="11" r="1.8"/>' },
    gold:     { fg:'#ffd66b', bg1:'#6c4b15', bg2:'#261b09', svg:'<circle cx="12" cy="12" r="6.5"/><path d="M9.5 10.2c.5-1 1.6-1.7 3-1.7 1.8 0 3 1 3 2.4 0 3.2-6 1.3-6 4 0 1.2 1.1 2.1 2.8 2.1 1.5 0 2.7-.6 3.2-1.7"/><path d="M12 7.5v9"/>' },
    gem:      { fg:'#7fe9ff', bg1:'#174e63', bg2:'#0a1d25', svg:'<path d="M7 8.5l2-3h6l2 3-5 10z"/><path d="M7 8.5h10"/><path d="M10 5.5l2 3 2-3"/>' },
    ticket:   { fg:'#f8d8aa', bg1:'#5b4227', bg2:'#21170e', svg:'<path d="M5 8.5a2 2 0 0 0 0 4v3h14v-3a2 2 0 0 0 0-4v-3H5z"/><path d="M12 5.5v10"/>' },
    honor:    { fg:'#b4d2ff', bg1:'#30415b', bg2:'#101824', svg:'<circle cx="12" cy="10" r="3.4"/><path d="M9 13l-1.3 5 4.3-2 4.3 2-1.3-5"/>' },
    towercoin:{ fg:'#d8c5ff', bg1:'#4b2f64', bg2:'#1b1024', svg:'<circle cx="12" cy="12" r="6.5"/><path d="M12 7.8l3.5 4.2H8.5z"/><path d="M9.5 15.2h5"/>' },
    essence:  { fg:'#a6fff0', bg1:'#22524a', bg2:'#0d211d', svg:'<path d="M12 4.5c2 3 4.2 5 4.2 7.8A4.2 4.2 0 1 1 7.8 12.3C7.8 9.5 10 7.5 12 4.5z"/><path d="M16.8 7l1.2.7-.4 1.3 1.1.8-1 .8.2 1.3-1.2-.5-.9 1-.3-1.4-1.3-.2 1-1 .4-1.3 1.2.5z"/>' },
    clock:    { fg:'#d9e4ff', bg1:'#314562', bg2:'#121b27', svg:'<circle cx="12" cy="12" r="6.5"/><path d="M12 8.5v4l2.8 1.8"/>' },
    stats:    { fg:'#93cbff', bg1:'#26435c', bg2:'#0f1b26', svg:'<path d="M6 17.5V11"/><path d="M12 17.5V7.5"/><path d="M18 17.5V9.5"/><path d="M5 17.5h14"/>' },
    hero2:    { fg:'#f8d7aa', bg1:'#57422a', bg2:'#22180f', svg:'<path d="M8 17.5v-2.5A3.5 3.5 0 0 1 11.5 11.5h1A3.5 3.5 0 0 1 16 15v2.5"/><circle cx="12" cy="8.2" r="2.8"/>' },
    kills:    { fg:'#ffb7c0', bg1:'#5d2b34', bg2:'#250f13', svg:'<path d="M8.5 5.5l7 7"/><path d="M11.2 4.8l7 7"/><path d="M7 19l3.2-.7 1.1-3.6-1.8-1.8-3.6 1.1z"/>' },
    mount:    { fg:'#f3d7aa', bg1:'#564128', bg2:'#20160d', svg:'<path d="M6 15.5c0-3 2.4-5.5 5.5-5.5H14c2.8 0 4 1.6 4 3.7 0 1.4-.8 2.6-2.2 3.1l-1.3 2.2"/><path d="M8.2 16.2l-1.4 2.3"/><path d="M11 10l-1.3-2"/><path d="M15.8 11l1.4-1"/>' },
    draw:     { fg:'#ffdea4', bg1:'#62411f', bg2:'#25170b', svg:'<path d="M6.5 7.5h11v9h-11z"/><path d="M9 7.5v9"/><path d="M12 7.5v9"/><path d="M15 7.5v9"/><path d="M8 5.5h8"/>' },
    raid:     { fg:'#ffbdbd', bg1:'#5a2424', bg2:'#220d0d', svg:'<path d="M12 4.8l1.9 4 4.4.6-3.2 3 1 4.4-4.1-2.2-4.1 2.2 1-4.4-3.2-3 4.4-.6z"/><path d="M12 4.8v9.5"/>' },
    save:     { fg:'#bfe4ff', bg1:'#2f4860', bg2:'#121b25', svg:'<path d="M6 5.5h10l2 2v11H6z"/><path d="M9 5.5v4h6v-4"/><path d="M9 15.5h6"/>' },
    export:   { fg:'#d4edff', bg1:'#274663', bg2:'#0d1c27', svg:'<path d="M12 5.5v9"/><path d="M8.5 9l3.5-3.5L15.5 9"/><path d="M6 15.5v3h12v-3"/>' },
    import:   { fg:'#d4edff', bg1:'#274663', bg2:'#0d1c27', svg:'<path d="M12 18.5v-9"/><path d="M8.5 15l3.5 3.5 3.5-3.5"/><path d="M6 5.5v3h12v-3"/>' },
    reset:    { fg:'#ffb8b0', bg1:'#5c2a25', bg2:'#230f0d', svg:'<path d="M6.5 8.5A6.5 6.5 0 1 1 7 16.8"/><path d="M6.5 5.5v3h3"/>' },
    travel:   { fg:'#efd1a3', bg1:'#5d3e25', bg2:'#21150c', svg:'<path d="M7 15.5c0-2.8 2.2-5 5-5h2.2c1.9 0 3.3 1 3.8 2.7"/><path d="M8.3 16.2l-1.3 2.3"/><path d="M15.7 16.2l1.3 2.3"/><path d="M10.6 10l-1.2-2"/>' },
    faction:  { fg:'#f5d9a8', bg1:'#564128', bg2:'#21170d', svg:'<path d="M7 5.5v13"/><path d="M7 5.5c3 0 4 1.5 6 1.5s3-1.5 4-1.5v6c-1 0-2 .8-4 .8s-3-.8-6-.8"/>' },
    class:    { fg:'#d3dbff', bg1:'#38445d', bg2:'#141a26', svg:'<path d="M12 5.5l1.7 3.5 3.8.5-2.8 2.6.8 3.9-3.5-1.8-3.5 1.8.8-3.9-2.8-2.6 3.8-.5z"/>' },
    name:     { fg:'#f0dbbf', bg1:'#564430', bg2:'#201812', svg:'<path d="M8 7.5h8"/><path d="M8 11.5h8"/><path d="M8 15.5h5"/>' },
    party:    { fg:'#d6e6ff', bg1:'#31455d', bg2:'#111a25', svg:'<circle cx="9" cy="9" r="2.2"/><circle cx="15.5" cy="10" r="1.8"/><path d="M5.5 17c.4-2.1 2-3.5 4.2-3.5h1c2.1 0 3.8 1.4 4.2 3.5"/><path d="M14 16.8c.2-1.5 1.3-2.5 2.8-2.5"/>' },
    offline:  { fg:'#d2d8ff', bg1:'#364261', bg2:'#121824', svg:'<path d="M7.5 9.5A5 5 0 0 1 17 9.2c0 2.4-1.4 3.5-2.6 4.9-.8.9-1.2 1.8-1.3 2.4"/><path d="M12 19h.01"/>' },
    levelup:  { fg:'#ffe08c', bg1:'#5e4a1f', bg2:'#231b0d', svg:'<path d="M12 4.5v15"/><path d="M7 9.5l5-5 5 5"/><path d="M7 19.5h10"/>' },
    fail:     { fg:'#ffb6b6', bg1:'#5c2525', bg2:'#220d0d', svg:'<path d="M12 5.5c2.4 0 4.4 2 4.4 4.4 0 3.2-2.6 5-4.4 8.6-1.8-3.6-4.4-5.4-4.4-8.6 0-2.4 2-4.4 4.4-4.4z"/><path d="M10.2 9.8l3.6 3.6"/><path d="M13.8 9.8l-3.6 3.6"/>' },
    clear:    { fg:'#ffe08c', bg1:'#58471d', bg2:'#221b0c', svg:'<path d="M12 5.5l2 4 4.5.6-3.2 3 1 4.4-4.3-2.2-4.3 2.2 1-4.4-3.2-3 4.5-.6z"/>' }
  };

  function normalizeSize(size) {
    if (typeof size === 'number') return size;
    if (size === 'xs') return 14;
    if (size === 'sm') return 16;
    if (size === 'lg') return 22;
    return 18;
  }

  window.uiIcon = function (name, size, label) {
    const icon = ICONS[name] || ICONS.battle;
    const px = normalizeSize(size);
    return `<span class="ui-icon" data-ui-icon-name="${name}" aria-hidden="${label ? 'true' : 'false'}" style="width:${px}px;height:${px}px;--ui-icon-fg:${icon.fg};--ui-icon-bg1:${icon.bg1};--ui-icon-bg2:${icon.bg2}" title="${label || ''}">
      <svg viewBox="0 0 24 24" role="img" focusable="false">${icon.svg}</svg>
    </span>`;
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
