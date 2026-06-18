/* =========================================================
   main.js — 启动、游戏循环、事件代理
   ----------------------------------------------------------
   关键: 所有按钮通过事件代理(addEventListener on 父容器)处理,
        不使用 inline onclick,渲染时不会丢失事件绑定
   ========================================================= */

state = loadState();

/* ---------- 游戏循环 ---------- */
let lastTickTime = Date.now();
let elapsedSec = 0;
let secondsCounter = 0;
let cdCounter = 0;
let minuteCounter = 0;
let mobilePanelOpen = false;
let _lastMobile = null;
let _lastLoopRun = 0;

let _loopErrLogged = false;
let _prevBuffs = '';   // 上帧活跃 buff 签名(检测过期)

function isMobileLayout() {
  return window.innerWidth <= 920;
}

function updateHeroMobileToggle() {
  const btn = $('btn-hero-collapse');
  if (!btn) return;
  btn.textContent = document.body.classList.contains('hero-collapsed') ? '展开' : '收起';
}

function setMobilePanelOpen(open) {
  mobilePanelOpen = !!open;
  document.body.classList.toggle('mobile-panel-open', mobilePanelOpen && isMobileLayout());
}

function focusHeroPanel() {
  const hero = $('hero-panel');
  if (!hero) return;
  document.body.classList.remove('hero-collapsed');
  updateHeroMobileToggle();
  setMobilePanelOpen(false);
  hero.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function applyResponsiveLayout() {
  const mobile = isMobileLayout();
  if (mobile === _lastMobile) return;
  _lastMobile = mobile;
  document.body.classList.toggle('mobile-ui', mobile);
  if (mobile) {
    if (!document.body.dataset.heroMobileInit) {
      document.body.dataset.heroMobileInit = '1';
      document.body.classList.add('hero-collapsed');
    }
  } else {
    setMobilePanelOpen(false);
    document.body.classList.remove('hero-collapsed');
    delete document.body.dataset.heroMobileInit;
  }
  updateHeroMobileToggle();
}

function targetFrameIntervalMs() {
  const mobile = isMobileLayout();
  const hidden = typeof document !== 'undefined' && document.hidden;
  if (hidden) return mobile ? 600 : 300;
  const mode = state?.mode || 'world';
  const inCombat = mode === 'boss' || mode === 'dungeon' || mode === 'mythic' || mode === 'worldboss' || mode === 'tower';
  if (mobile) return inCombat ? 50 : 90;
  return inCombat ? 33 : 50;
}

function loop() {
  try {
    const frameNow = Date.now();
    if (frameNow - _lastLoopRun < targetFrameIntervalMs()) {
      requestAnimationFrame(loop);
      return;
    }
    _lastLoopRun = frameNow;
    if (state.cls) {
      const now = frameNow;
      const dt = (now - lastTickTime) / 1000;
      lastTickTime = now;
      elapsedSec += dt;

      tickBattle(now);
      tickCompanion(now);
      tickTravel(now);
      if (typeof tickLife==='function') tickLife(now);

      // buff 过期检测: 上帧还在、本帧已消失 → 重算属性
      const curBuffs = Object.keys(state.buffs||{}).filter(k=>state.buffs[k]>now).sort().join(',');
      if (_prevBuffs !== curBuffs) {
        if (_prevBuffs) recomputeStats();
        _prevBuffs = curBuffs;
      }

      updateBattleVisuals();
      tickCast(now);
      processDirty();

      // CD 文本每秒就地刷新
      cdCounter += dt;
      if (cdCounter >= 1) {
        cdCounter = 0;
        updateCdDisplays();
      }

      secondsCounter += dt;
      if (secondsCounter >= 1) {
        secondsCounter = 0;
        const total = Math.floor(elapsedSec);
        const m = Math.floor(total/60), s = total%60;
        $('h-clock').textContent = String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
      }

      // 每分钟检查日常/赛季滚动
      minuteCounter += dt;
      if (minuteCounter >= 60) {
        minuteCounter = 0;
        if (typeof checkDailyRollover==='function') checkDailyRollover();
        if (typeof checkSeasonRollover==='function') checkSeasonRollover();
        if (typeof checkTowerWeeklyRollover==='function') checkTowerWeeklyRollover();
      }
    } else {
      lastTickTime = Date.now();
    }
  } catch (e) {
    // 单帧异常不应让整个游戏循环永久卡死:记录一次,继续下一帧
    if (!_loopErrLogged) { console.error('loop tick error:', e); _loopErrLogged = true; }
  }
  requestAnimationFrame(loop);
}

/* ---------- 事件代理:右侧 tab 各面板 ---------- */
function setupDelegation() {
  document.addEventListener('click', e => {
    if (e.target.closest('[data-tip-close]') && typeof unpinTip === 'function') {
      unpinTip();
    }
  });

  // 装备格:点击打开详情
  $('equip-grid').addEventListener('click', e => {
    if (e.target.closest('button')) return;
    const slot = e.target.closest('.slot');
    if (!slot) return;
    const it = state.equipped[slot.dataset.slot];
    if (!it) return;
    openItemDetail(it.id);
  });

  // 背包工具栏(自动售卖/一键卖)
  $('inv-toolbar').addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'autosell') {
      state.autoSellRarity = btn.dataset.rarity === 'off' ? null : btn.dataset.rarity;
      markDirty('inventory');
      const labels = {common:'普通',uncommon:'优秀及以下',rare:'精良及以下',off:'关闭'};
      log(`🤖 自动售卖: ${labels[btn.dataset.rarity]||'关闭'}`, 'info');
    } else if (btn.dataset.action === 'sellall') sellAllBelow(btn.dataset.rarity);
  });

  // 背包列表(装备/出售/详情)
  $('inv-list').addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = parseInt(btn.dataset.id);
    if (btn.dataset.action === 'equip') equipItem(id);
    else if (btn.dataset.action === 'sell') sellItem(id);
    else if (btn.dataset.action === 'detail') openItemDetail(id);
  });

  // 装备详情模态框内的所有动作
  $('item-detail-body').addEventListener('click', e => {
    const closeBtn = e.target.closest('button[data-modal-close]');
    if (closeBtn) { closeItemDetail(); return; }
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = parseInt(btn.dataset.id);
    const act = btn.dataset.action;
    if (act === 'reroll') rerollAffix(id, parseInt(btn.dataset.idx));
    else if (act === 'unsocket') removeGem(id, parseInt(btn.dataset.idx));
    else if (act === 'enchant') applyEnchant(id, btn.dataset.ekey);
    else if (act === 'disassemble') disassembleItem(id);
    else if (act === 'equipfromdetail') { equipItem(id); renderItemDetail(id); }
    else if (act === 'unequipfromdetail') { const sk = Object.keys(state.equipped).find(k=>state.equipped[k]?.id===id); if(sk) { unequipItem(sk); closeItemDetail(); } }
    else if (act === 'sellfromdetail') { sellItem(id); closeItemDetail(); }
  });
  // 点击模态框外的暗色背景关闭
  $('modal-item-detail').addEventListener('click', e => {
    if (e.target.id === 'modal-item-detail') closeItemDetail();
  });
  // 镶嵌宝石的 select
  $('item-detail-body').addEventListener('change', e => {
    const sel = e.target.closest('select[data-role="gempick"]');
    if (!sel) return;
    const gk = sel.value;
    if (!gk) return;
    insertGem(parseInt(sel.dataset.id), parseInt(sel.dataset.idx), gk);
  });

  // 技能
  $('skill-list').addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'selectskill') {
      const key = btn.dataset.key;
      const idx = state.selectedSkills.indexOf(key);
      if (idx >= 0) {
        state.selectedSkills.splice(idx, 1);
      } else {
        if (state.selectedSkills.length >= 8) {
          state.selectedSkills.shift();
        }
        state.selectedSkills.push(key);
      }
      markDirty('skills', 'stage');
    }
  });

  // 天赋
  $('talent-list').addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'buytalent') {
      buyTalent(btn.dataset.tree, btn.dataset.talent);
    }
  });

  // 掉落预览tip离开容器时隐藏
  $('map-list').addEventListener('mouseleave', () => { if (typeof _tipPinned !== 'undefined' && !_tipPinned) $('compare-tip').style.display = 'none'; });
  $('dungeon-list').addEventListener('mouseleave', () => { if (typeof _tipPinned !== 'undefined' && !_tipPinned) $('compare-tip').style.display = 'none'; });

  // 地图(子区域 / BOSS 挑战)
  $('map-list').addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'subzone') switchSubzone(btn.dataset.map, parseInt(btn.dataset.sub));
    else if (btn.dataset.action === 'boss') challengeBoss(btn.dataset.map);
  });

  // 副本
  $('dungeon-list').addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'enterdungeon') enterDungeon(btn.dataset.key);
    else if (btn.dataset.action === 'dungeoninfo' && typeof openDungeonInfo === 'function') openDungeonInfo(btn.dataset.key);
  });
  $('epic-dungeon-list').addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'enterdungeon') enterDungeon(btn.dataset.key);
    else if (btn.dataset.action === 'dungeoninfo' && typeof openDungeonInfo === 'function') openDungeonInfo(btn.dataset.key);
  });

  // 副本/无尽塔 子页切换
  $('tab-dungeon').addEventListener('click', e => {
    const sub = e.target.closest('.sub-tab[data-dgsub]');
    if (sub) {
      const key = sub.dataset.dgsub;
      document.querySelectorAll('#tab-dungeon > .sub-tabs .sub-tab').forEach(x => x.classList.toggle('active', x.dataset.dgsub === key));
      $('dungeon-sub-dungeon').style.display = key === 'dungeon' ? '' : 'none';
      $('dungeon-sub-tower').style.display = key === 'tower' ? '' : 'none';
      if (key === 'tower' && typeof renderTowerPanel === 'function') renderTowerPanel();
      return;
    }
    const modeTab = e.target.closest('.sub-tab[data-dgmode]');
    if (modeTab) {
      const key = modeTab.dataset.dgmode;
      document.querySelectorAll('#dungeon-sub-dungeon > .sub-tabs .sub-tab').forEach(x => x.classList.toggle('active', x.dataset.dgmode === key));
      $('dungeon-mode-normal').style.display = key === 'normal' ? '' : 'none';
      $('dungeon-mode-epic').style.display = key === 'epic' ? '' : 'none';
      return;
    }
    // 副本筛选按钮
    if (e.target.id === 'btn-dg-5man') { dgFilter = dgFilter === '5man' ? 'all' : '5man'; renderDungeon(); }
    if (e.target.id === 'btn-dg-raid') { dgFilter = dgFilter === 'raid' ? 'all' : 'raid'; renderDungeon(); }
  });

  // 神器 事件代理
  const artiRoot = $('tab-artifact');
  if (artiRoot) {
    artiRoot.addEventListener('click', e => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const act = btn.dataset.action;
      if (act === 'artifactBuy')        { artifactBuyTrait(btn.dataset.key); renderArtifact(); }
      else if (act === 'artifactReset') { artifactReset(); renderArtifact(); }
    });
  }

  // 生活技能 事件代理
  const lifeRoot = $('tab-life');
  if (lifeRoot) {
    lifeRoot.addEventListener('click', e => {
      const subBtn = e.target.closest('.sub-tab[data-lifesub]');
      if (subBtn) { lifeSubTab = subBtn.dataset.lifesub; renderLife(); return; }
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const act = btn.dataset.action;
      if (act === 'lifeSwitch')     { stopLifeAction(); startLifeAction(btn.dataset.key); renderLife(); }
      else if (act === 'lifeCraft') { lifeCraft(btn.dataset.key); renderLife(); }
    });
  }

  // 无尽塔 事件代理
  const towerRoot = $('tower-panel');
  if (towerRoot) {
    towerRoot.addEventListener('click', e => {
      const subBtn = e.target.closest('.sub-tab[data-towersub]');
      if (subBtn) { towerSubTab = subBtn.dataset.towersub; renderTowerPanel(); return; }
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const act = btn.dataset.action;
      if (act === 'enterTower')      { enterTower();         renderTowerPanel(); }
      else if (act === 'leaveTower') {
        if (!confirm('确定撤离无尽塔?(本次进度丢失,但塔币和最高层保留)')) return;
        leaveTower(); renderTowerPanel();
      }
      else if (act === 'towerFloorUp')   { towerSetStartFloor(1);  renderTowerPanel(); }
      else if (act === 'towerFloorDown') { towerSetStartFloor(-1); renderTowerPanel(); }
      else if (act === 'towerBuy')       { towerBuy(btn.dataset.key); renderTowerPanel(); }
    });
  }

  // 商店
  $('shop-list').addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'buyticket') {
      const amount = parseInt(btn.dataset.amount);
      const price = parseInt(btn.dataset.price);
      const type = btn.dataset.type;
      if (state.gold < price) { log('金币不足', 'bad'); return; }
      state.gold -= price;
      if (type === 'comp') {
        state.compTickets = (state.compTickets || 0) + amount;
        log(`🐾 购买了 ${amount} 张随从券, -${price}💰`, 'good');
      } else {
        state.tickets += amount;
        log(`🎫 购买了 ${amount} 张通用券, -${price}💰`, 'good');
      }
      markDirty('shop');
    }
  });

  // 技能栏点击
  $('skill-bar').addEventListener('click', e => {
    const btn = e.target.closest('.skill-btn');
    if (!btn || btn.classList.contains('on-cd')) return;
    const key = btn.dataset.skill;
    if (!key) return;
    const c = getCls(); const sk = c?.skills[key];
    // 打断技能随时可用(即使正在读条)
    if (sk && sk.type === 'interrupt') { castSkill(key, true); return; }
    if (!casting) startCast(key, true);
  });

  // 增益/减益图标 悬浮查看效果(复用 compare-tip)
  (() => {
    const bb = $('buff-bar'); if (!bb) return;
    const tip = $('compare-tip');
    bb.addEventListener('mouseover', e => {
      const chip = e.target.closest('.buff-chip'); if (!chip) return;
      tip.querySelector('.compare-head').textContent = chip.dataset.tip || '';
      tip.querySelector('.compare-body').innerHTML = '';
      tip.style.display = 'block';
      positionTip(tip, e);
    });
    bb.addEventListener('mousemove', e => { if (tip.style.display === 'block') positionTip(tip, e); });
    bb.addEventListener('mouseout', e => { if ((typeof _tipPinned === 'undefined' || !_tipPinned) && (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest('.buff-chip'))) tip.style.display = 'none'; });
    // 触屏点击固定
    bb.addEventListener('click', e => {
      const chip = e.target.closest('.buff-chip'); if (!chip) return;
      if (typeof _tipPinned !== 'undefined' && _tipPinned && _tipPinnedOwner === chip) { if (typeof unpinTip === 'function') unpinTip(); }
      else { if (typeof _tipPinned !== 'undefined' && _tipPinned) { if (typeof unpinTip === 'function') unpinTip(); } tip.querySelector('.compare-head').textContent = chip.dataset.tip || ''; tip.querySelector('.compare-body').innerHTML = ''; tip.style.display = 'block'; positionTip(tip, e); if (typeof _tipPinned !== 'undefined') { _tipPinned = true; _tipPinnedOwner = chip; } }
    });
  })();

  // 技能栏拖拽排序(仅影响手动快捷栏顺序)
  (() => {
    const sbar = $('skill-bar'); if (!sbar) return;
    let dragKey = null;
    sbar.addEventListener('dragstart', e => {
      const b = e.target.closest('.skill-btn'); if (!b) return;
      dragKey = b.dataset.skill; skillDragging = true; b.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', dragKey); } catch (_) {}
    });
    sbar.addEventListener('dragover', e => { if (dragKey) e.preventDefault(); });
    sbar.addEventListener('drop', e => {
      e.preventDefault();
      const b = e.target.closest('.skill-btn');
      const arr = state.selectedSkills;
      if (b && dragKey) {
        const targetKey = b.dataset.skill;
        const from = arr.indexOf(dragKey), to = arr.indexOf(targetKey);
        if (from >= 0 && to >= 0 && from !== to) { arr.splice(from, 1); arr.splice(to, 0, dragKey); }
      }
      dragKey = null; skillDragging = false; markDirty('skills');
    });
    sbar.addEventListener('dragend', () => { dragKey = null; skillDragging = false; markDirty('skills'); });
  })();

  // 随从/坐骑 子页切换
  $('tab-companion').addEventListener('click', e => {
    const sub = e.target.closest('.sub-tab[data-cmpsub]');
    if (!sub) return;
    const key = sub.dataset.cmpsub;
    document.querySelectorAll('#tab-companion > .sub-tabs .sub-tab').forEach(x => x.classList.toggle('active', x.dataset.cmpsub === key));
    $('companion-sub-comp').style.display = key === 'comp' ? '' : 'none';
    $('companion-sub-mount').style.display = key === 'mount' ? '' : 'none';
    if (key === 'mount' && typeof renderMounts === 'function') renderMounts();
  });
  // 坐骑列表事件代理
  const mountRoot = $('mount-panel');
  if (mountRoot) {
    mountRoot.addEventListener('click', e => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const act = btn.dataset.action;
      if (act === 'mountSet')   { mountSetActive(btn.dataset.key); renderMounts(); }
      else if (act === 'mountUnset') { mountSetActive(null); renderMounts(); }
    });
  }
  // 抽随从
  $('btn-draw').addEventListener('click', () => companionDraw());
  // 随从列表事件代理
  $('companion-list').addEventListener('click', e => {
    const btn=e.target.closest('button[data-action]');
    if(!btn)return;
    const act=btn.dataset.action,idx=parseInt(btn.dataset.idx);
    if(act==='usecomp'){state.activeCompanion=idx;initCompanionHp();recomputeStats();markDirty('companion','hero');log('🐾 随从出战!','good')}
    else if(act==='upgradecomp')upgradeCompanion(idx);
    else if(act==='unequipcomp'){state.activeCompanion=-1;state._compHp=0;recomputeStats();markDirty('companion','hero')}
  });
  // 随从技能 悬浮看描述(复用 compare-tip)
  (() => {
    const root = $('companion-list'); if (!root) return;
    const tip = $('compare-tip');
    root.addEventListener('mouseover', e => {
      const sk = e.target.closest('.comp-skill'); if (!sk) return;
      tip.querySelector('.compare-head').innerHTML = sk.dataset.tip || '';
      tip.querySelector('.compare-body').innerHTML = '';
      tip.style.display = 'block';
      positionTip(tip, e);
    });
    root.addEventListener('mousemove', e => { if (tip.style.display === 'block' && e.target.closest('.comp-skill')) positionTip(tip, e); });
    root.addEventListener('mouseout', e => { const sk = e.target.closest('.comp-skill'); if (sk && (typeof _tipPinned === 'undefined' || !_tipPinned) && (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest('.comp-skill'))) tip.style.display = 'none'; });
    // 触屏点击固定
    root.addEventListener('click', e => {
      const sk = e.target.closest('.comp-skill'); if (!sk) return;
      if (typeof _tipPinned !== 'undefined' && _tipPinned && _tipPinnedOwner === sk) { if (typeof unpinTip === 'function') unpinTip(); }
      else { if (typeof _tipPinned !== 'undefined' && _tipPinned) { if (typeof unpinTip === 'function') unpinTip(); } tip.querySelector('.compare-head').innerHTML = sk.dataset.tip || ''; tip.querySelector('.compare-body').innerHTML = ''; tip.style.display = 'block'; positionTip(tip, e); if (typeof _tipPinned !== 'undefined') { _tipPinned = true; _tipPinnedOwner = sk; } }
    });
  })();
  // 自动施法
  $('auto-sk').addEventListener('change', e => { state.autoSkill = e.target.checked; });

  // 洗点按钮
  $('btn-reset-talents').addEventListener('click', resetTalents);
}

/* ---------- 主按钮 ---------- */
function setupMainButtons() {
  // 点击敌人行 → 手动切换攻击目标(拉满仇恨)
  const monListEl = $('mon-list');
  if (monListEl) {
    monListEl.addEventListener('click', e => {
      const row = e.target.closest('.mon-row'); if (!row) return;
      const uid = parseInt(row.dataset.uid, 10);
      if (!isNaN(uid) && typeof setManualFocus === 'function') {
        setManualFocus(uid);
        if (typeof renderMonList === 'function') renderMonList();
      }
    });
  }

  $('btn-speed').addEventListener('click', () => {
    const SPEEDS = [1, 2, 4, 8];
    const i = SPEEDS.indexOf(state.battleSpeed || 1);
    state.battleSpeed = SPEEDS[(i + 1) % SPEEDS.length];
    $('btn-speed').textContent = `⏩ ${state.battleSpeed}x`;
    $('btn-speed').classList.toggle('gold', state.battleSpeed > 1);
    log(`战斗倍速: ${state.battleSpeed}x`, 'info');
  });

  $('btn-leave').addEventListener('click', () => {
    if (state.mode === 'dungeon') {
      if (!confirm('确定离开副本?(进度丢失,但保留CD)')) return;
      log('🚪 离开副本', 'info');
      leaveDungeon();
    } else if (state.mode === 'mythic') {
      if (!confirm('确定离开大秘境?(进度丢失,已获装备保留)')) return;
      log('🚪 离开大秘境', 'info');
      leaveMythic();
    } else if (state.mode === 'boss') {
      if (!confirm('确定撤离 BOSS 战?(下次需重新开始)')) return;
      log('🚪 撤离 BOSS 战', 'info');
      state.mode = 'world';
      state.currentMonsters = [];
      spawnMonster();
      markDirty('map');
    } else if (state.mode === 'tower') {
      if (!confirm('确定撤离无尽塔?(本次进度丢失,但塔币和最高层保留)')) return;
      log('🚪 撤离 无尽塔', 'info');
      leaveTower();
      markDirty('dungeon');
    } else if (state.mode === 'worldboss') {
      if (!confirm('撤离世界Boss战?(CD不重置,可重打)')) return;
      log('🚪 撤离 世界Boss 战', 'info');
      if (typeof leaveWorldBoss==='function') leaveWorldBoss();
      else { state.mode='world'; state.currentMonsters=[]; spawnMonster(); }
      markDirty('map','events');
    }
  });

  $('btn-save').addEventListener('click', () => { saveState(); log('💾 已保存', 'good'); });

  $('btn-reset').addEventListener('click', () => {
    if (!confirm('确定重新开始?所有进度将丢失!')) return;
    suppressSave = true;                 // 阻止 beforeunload / 自动存档把存档写回
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  });

  $('btn-export').addEventListener('click', () => {
    saveState();
    const data = btoa(unescape(encodeURIComponent(localStorage.getItem(SAVE_KEY) || '')));
    prompt('复制以下存档码:', data);
  });

  $('btn-import').addEventListener('click', () => {
    const data = prompt('粘贴存档码:');
    if (!data) return;
    try {
      const json = decodeURIComponent(escape(atob(data)));
      JSON.parse(json);
      localStorage.setItem(SAVE_KEY, json);
      suppressSave = true;                 // 防止 beforeunload 用内存里的旧存档覆盖导入的存档
      location.reload();
    } catch (e) { alert('存档无效'); }
  });

  // 伤害统计重置按钮(在 stage 内)
  $('stage').addEventListener('click', e => {
    const btn = e.target.closest('button[data-action="dmgreset"]');
    if (!btn) return;
    if (typeof resetDmgStats === 'function') resetDmgStats();
  });

  const heroCollapseBtn = $('btn-hero-collapse');
  if (heroCollapseBtn) {
    heroCollapseBtn.addEventListener('click', () => {
      document.body.classList.toggle('hero-collapsed');
      updateHeroMobileToggle();
    });
  }
  const heroScrollBtn = $('btn-scroll-hero');
  if (heroScrollBtn) heroScrollBtn.addEventListener('click', focusHeroPanel);
  const mobileBackdrop = $('mobile-panel-backdrop');
  if (mobileBackdrop) mobileBackdrop.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(x => x.classList.remove('active'));
    setMobilePanelOpen(false);
  });

  // Tabs
  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => {
      if (isMobileLayout() && t.dataset.tab === 'hero') {
        document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        $('tab-' + t.dataset.tab).classList.add('active');
        focusHeroPanel();
        return;
      }
      const alreadyActive = t.classList.contains('active');
      if (isMobileLayout() && alreadyActive && mobilePanelOpen) {
        setMobilePanelOpen(false);
        return;
      }
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      $('tab-' + t.dataset.tab).classList.add('active');
      if(t.dataset.tab==='companion') { renderCompanion(); if (typeof renderMounts==='function') renderMounts(); }
      if(t.dataset.tab==='progression'&&typeof renderProgression==='function') renderProgression();
      if(t.dataset.tab==='events'&&typeof renderEvents==='function') renderEvents();
      if(t.dataset.tab==='ascend'&&typeof renderAscend==='function') renderAscend();
      if(t.dataset.tab==='dungeon'&&typeof renderTowerPanel==='function') renderTowerPanel();
      if(t.dataset.tab==='life'&&typeof renderLife==='function') renderLife();
      if(t.dataset.tab==='artifact'&&typeof renderArtifact==='function') renderArtifact();
      if(t.dataset.tab==='arena'&&typeof renderArena==='function') renderArena();
      if (isMobileLayout()) setMobilePanelOpen(true);
    });
  });

  // 竞技场 事件代理
  const arenaRoot = $('tab-arena');
  if (arenaRoot) {
    arenaRoot.addEventListener('click', e => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const act = btn.dataset.action;
      if (act === 'arenaRanked')        { arenaFight(true);  renderArena(); }
      else if (act === 'arenaSkirmish') { arenaFight(false); renderArena(); }
      else if (act === 'arenaReroll')   { arenaRollOpponent(); renderArena(); }
      else if (act === 'arenaBuy')      { arenaBuy(btn.dataset.key); renderArena(); }
    });
  }

  // 成就/图鉴/声望面板事件代理
  const progRoot = $('tab-progression');
  if (progRoot) {
    progRoot.addEventListener('click', e => {
      const sub = e.target.closest('.sub-tab[data-sub]');
      if (sub) { progSubTab = sub.dataset.sub; renderProgression(); return; }
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'claimach') {
        claimAchievement(btn.dataset.key);
        renderProgression();
      } else if (btn.dataset.action === 'claimrepline') {
        if (typeof claimReputationLine === 'function' && claimReputationLine(btn.dataset.fac, parseInt(btn.dataset.rep, 10))) {
          renderProgression();
        }
      } else if (btn.dataset.action === 'equiptitle') {
        if (setActiveTitle(btn.dataset.title)) {
          log(`👑 已切换称号: ${btn.dataset.title}`, 'good');
          renderProgression();
        }
      } else if (btn.dataset.action === 'cleartitle') {
        if (setActiveTitle('')) {
          log('👤 已隐藏当前称号', 'info');
          renderProgression();
        }
      }
    });
  }

  // 觉醒 事件代理
  const asRoot = $('tab-ascend');
  if (asRoot) {
    asRoot.addEventListener('click', e => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'ascend') {
        doAscend();
        renderAscend();
      } else if (btn.dataset.action === 'mythic') {
        enterMythic();
      } else if (btn.dataset.action === 'mythicLevelUp') {
        changeMythicSelectLevel(1);
      } else if (btn.dataset.action === 'mythicLevelDown') {
        changeMythicSelectLevel(-1);
      } else if (btn.dataset.action === 'resetMythicTiers') {
        resetMythicTiers();
        renderAscend();
      } else if (btn.dataset.action === 'claimMythicUnique') {
        claimMythicUnique(parseInt(btn.dataset.level));
        renderAscend();
      }
    });
  }

  // 世界Boss/日常/赛季 事件代理
  const evRoot = $('tab-events');
  if (evRoot) {
    evRoot.addEventListener('click', e => {
      const sub = e.target.closest('.sub-tab[data-sub]');
      if (sub) { eventsSubTab = sub.dataset.sub; renderEvents(); return; }
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const act = btn.dataset.action;
      if (act === 'challengewb') challengeWorldBoss(btn.dataset.key);
      else if (act === 'challengerare' && typeof challengeRareElite === 'function') challengeRareElite(btn.dataset.key);
      else if (act === 'claimdaily') claimDaily(parseInt(btn.dataset.idx));
      else if (act === 'claimweekly') claimWeeklyChest();
      else if (act === 'exchangeshards') exchangeShards();
      else if (act === 'claimbounty' && typeof claimBounty === 'function') claimBounty(parseInt(btn.dataset.idx, 10));
      renderEvents();
    });
  }

  // Modal close
  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.modalClose));
  });
}

/* ---------- 角色创建流程 ---------- */
let pendingFaction = null;
let pendingRace = null;
let pendingClass = null;

function showFactionSelection() {
  const grid = $('faction-grid');
  grid.innerHTML = '';
  for (const [key, f] of Object.entries(FACTIONS)) {
    const facIconHtml = (typeof factionIcon === 'function') ? factionIcon(key, 52, f.icon) : f.icon;
    const card = document.createElement('div');
    card.className = 'class-card';
    card.style.cssText = 'flex:1;min-width:200px';
    card.innerHTML = `
      <div class="icon" style="font-size:56px">${facIconHtml}</div>
      <div class="name" style="color:${f.color};font-size:20px">${f.name}</div>
      <div class="desc">${f.desc}</div>`;
    card.addEventListener('click', () => {
      pendingFaction = key;
      $('modal-faction').classList.remove('show');
      showRaceSelection(key);
    });
    grid.appendChild(card);
  }
  $('modal-faction').classList.add('show');
}

function showRaceSelection(factionKey) {
  const fac = FACTIONS[factionKey];
  const facIconHtml = (typeof factionIcon === 'function') ? factionIcon(factionKey, 18, fac.icon) : fac.icon;
  $('race-title').innerHTML = `${facIconHtml} ${fac.name} — 选择种族`;
  const grid = $('race-grid');
  grid.innerHTML = '';
  const raceList = Object.entries(RACES).filter(([,r]) => r.faction === factionKey);
  pendingRace = null;
  $('confirm-race').disabled = true;
  for (const [key, r] of raceList) {
    const bonusText = Object.entries(r.bonus).map(([k,v])=>fmtMod(k, v)).join(' ');
    const raceIconHtml = (typeof raceIcon === 'function') ? raceIcon(key, 40, r.icon) : r.icon;
    const card = document.createElement('div');
    card.className = 'class-card';
    card.dataset.race = key;
    card.innerHTML = `
      <div class="icon" style="font-size:40px">${raceIconHtml}</div>
      <div class="name">${r.name}</div>
      <div class="attr" style="color:var(--accent)">${bonusText}</div>
      <div class="desc">${r.desc}</div>`;
    card.addEventListener('click', () => {
      document.querySelectorAll('#race-grid .class-card').forEach(x => x.classList.remove('selected'));
      card.classList.add('selected');
      pendingRace = key;
      $('confirm-race').disabled = false;
    });
    grid.appendChild(card);
  }
  $('modal-race').classList.add('show');
  $('confirm-race').onclick = () => {
    if (!pendingRace) return;
    $('modal-race').classList.remove('show');
    showClassSelection();
  };
}

function showClassSelection() {
  const grid = $('class-grid');
  grid.innerHTML = '';
  pendingClass = null;
  $('confirm-class').disabled = true;
  for (const [key, c] of Object.entries(CLASSES)) {
    const card = document.createElement('div');
    card.className = 'class-card';
    card.dataset.cls = key;
    card.innerHTML = `
      <div class="icon" style="color:${c.color}">${classIcon(key, 54, c.icon)}</div>
      <div class="name" style="color:${c.color}">${c.name}</div>
      <div class="attr">主属性: ${c.primaryAttr} · ${c.resource}</div>
      <div class="desc">${c.desc}</div>`;
    card.addEventListener('click', () => {
      document.querySelectorAll('#class-grid .class-card').forEach(x => x.classList.remove('selected'));
      card.classList.add('selected');
      pendingClass = key;
      $('confirm-class').disabled = false;
    });
    grid.appendChild(card);
  }
  $('modal-class').classList.add('show');
  $('confirm-class').onclick = () => {
    if (!pendingClass) return;
    $('modal-class').classList.remove('show');
    showNameInput();
  };
}

function showNameInput() {
  const race = RACES[pendingRace];
  const cls = CLASSES[pendingClass];
  const raceIconHtml = (typeof raceIcon === 'function') ? raceIcon(pendingRace, 18, race.icon) : race.icon;
  $('name-summary').innerHTML = `${raceIconHtml} ${race.name} · ${classIcon(pendingClass, 18, cls.icon)} ${cls.name}`;
  const inp = $('input-name');
  inp.value = '';
  $('confirm-name').disabled = true;
  inp.oninput = () => { $('confirm-name').disabled = inp.value.trim().length < 1; };
  $('modal-name').classList.add('show');
  $('confirm-name').onclick = () => {
    const name = inp.value.trim();
    if (!name) return;
    $('modal-name').classList.remove('show');
    startNewGame(name);
  };
}

function startNewGame(name) {
  createNewCharacter(name, pendingFaction, pendingRace, pendingClass);
  recomputeStats();
  checkSkillUnlocks();
  if (typeof mountAutoGrantStarter==='function') mountAutoGrantStarter();
  spawnMonster();
  markDirty('all');
  const cls = CLASSES[pendingClass];
  log(`🌟 ${name}(${cls.name})踏上了艾泽拉斯的征程!`, 'good');
}

/* ---------- 角色列表 ---------- */
function showCharacterList() {
  saveState();
  const content = $('charlist-content');
  const list = getCharacterList();
  content.innerHTML = list.map(c => {
    const cls = c.cls ? CLASSES[c.cls] : null;
    const titleHtml = c.title ? `<span class="pill" style="background:var(--gold);color:#000;font-weight:bold;margin-left:4px">${c.title}</span>` : '';
    const heroIconHtml = (typeof raceIcon === 'function' && c.race) ? raceIcon(c.race, 18, '👤') : ((typeof uiIcon === 'function') ? uiIcon('hero', 'sm', '角色') : '👤');
    const goldIconHtml = (typeof uiIcon === 'function') ? uiIcon('gold', 'xs', '金币') : '💰';
    return `<div class="char-item ${c.active?'current':''}" style="display:flex;justify-content:space-between;align-items:center;padding:10px;margin-bottom:6px;background:var(--panel-2);border:1px solid ${c.active?'var(--accent)':'var(--border)'};border-radius:8px">
      <div>
        <div style="font-weight:bold">${heroIconHtml} ${c.name} ${c.active?'<span class="pill" style="background:var(--accent);color:#000">当前</span>':''}${titleHtml}</div>
        <div class="muted">${cls?classIcon(c.cls,16,cls.icon)+' '+cls.name:'无'} · Lv.${c.lvl} · ${goldIconHtml}${fmt(c.gold)}</div>
      </div>
      <div style="display:flex;gap:4px">
        <button class="primary" data-action="switchchar" data-idx="${c.index}" ${c.active?'disabled':''}>切换</button>
        <button class="danger" data-action="deletechar" data-idx="${c.index}" ${list.length<=1?'disabled':''}>删除</button>
      </div>
    </div>`;
  }).join('');
  $('modal-charlist').classList.add('show');
}

function setupCharListEvents() {
  $('charlist-content').addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const idx = parseInt(btn.dataset.idx);
    if (btn.dataset.action === 'switchchar') {
      if (switchCharacter(idx)) {
        $('modal-charlist').classList.remove('show');
        if (typeof syncItemIdSeq === 'function') syncItemIdSeq();
        recomputeStats();
        checkSkillUnlocks();
        spawnMonster();
        markDirty('all');
        log('🌟 切换角色成功', 'good');
      }
    } else if (btn.dataset.action === 'deletechar') {
      const c = characters[idx];
      if (!confirm(`确定删除角色 "${c.name||'未命名'}" ?此操作不可撤销!`)) return;
      if (deleteCharacter(idx)) {
        $('modal-charlist').classList.remove('show');
        recomputeStats();
        checkSkillUnlocks();
        spawnMonster();
        markDirty('all');
        log('🗑️ 角色已删除', 'info');
      }
    }
  });
  $('btn-new-char').addEventListener('click', () => {
    $('modal-charlist').classList.remove('show');
    showFactionSelection();
  });
}

/* ---------- 启动 ---------- */
function boot() {
  applyResponsiveLayout();
  setupDelegation();
  setupMainButtons();
  setupCharListEvents();
  setupAttrHover();

  // 角色名点击打开角色列表
  $('h-name').addEventListener('click', showCharacterList);

  if (!state.cls) {
    showFactionSelection();
  } else {
    if (typeof syncItemIdSeq === 'function') syncItemIdSeq();
    recomputeStats();
    checkSkillUnlocks();
    if (typeof mountAutoGrantStarter==='function') mountAutoGrantStarter();
    applyOfflineProgress();
    if (typeof lifeOfflineCatchup==='function') lifeOfflineCatchup();
    spawnMonster();
    if ($('btn-speed')) { $('btn-speed').textContent = `⏩ ${state.battleSpeed||1}x`; $('btn-speed').classList.toggle('gold', (state.battleSpeed||1)>1); }
    markDirty('all');
    log('🌟 重返艾泽拉斯', 'good');
  }
  loop();
}

window.addEventListener('DOMContentLoaded', boot);
window.addEventListener('resize', applyResponsiveLayout);
window.addEventListener('beforeunload', saveState);
