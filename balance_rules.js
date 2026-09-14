(function (root) {
  'use strict';

  const NEW_PLAYER_PROTECTION_MAX_LEVEL = 9;

  function normalizeLevel(value) {
    return Math.max(1, Math.floor(Number(value) || 1));
  }

  function wildMonsterHpMultiplier(levelValue) {
    const level = normalizeLevel(levelValue);
    if (level <= 10) {
      // 2.2x at level 1, rising smoothly to the established 5.2x curve at level 10.
      return +(2.2 + ((level - 1) / 9) * 3).toFixed(2);
    }
    const curveLow = Math.max(0, Math.min(1, (level - 10) / 25));
    const curveMid = Math.max(0, Math.min(1, (level - 40) / 30));
    const curveHigh = Math.max(0, Math.min(1, (level - 70) / 20));
    const curveEnd = Math.max(0, Math.min(1, (level - 95) / 15));
    return +(5.2 + curveLow * 0.85 + curveMid * 1.05 + curveHigh * 1.25 + curveEnd * 0.95).toFixed(2);
  }

  function worldPackSize(heroLevelValue, rollValue) {
    const heroLevel = normalizeLevel(heroLevelValue);
    const roll = Math.max(0, Math.min(0.999999, Number(rollValue) || 0));
    if (heroLevel <= 3) return 1;
    if (heroLevel <= 5) return roll < 0.15 ? 2 : 1;
    if (heroLevel <= NEW_PLAYER_PROTECTION_MAX_LEVEL) return roll < 0.05 ? 3 : (roll < 0.30 ? 2 : 1);
    return roll < 0.07 ? 4 : (roll < 0.25 ? 3 : (roll < 0.55 ? 2 : 1));
  }

  function worldMonsterLevel(heroLevelValue, subMinValue, subMaxValue, rolledLevelValue) {
    const heroLevel = normalizeLevel(heroLevelValue);
    const subMin = normalizeLevel(subMinValue);
    const subMax = Math.max(subMin, normalizeLevel(subMaxValue));
    const rolledLevel = Math.max(subMin, Math.min(subMax, normalizeLevel(rolledLevelValue)));
    if (heroLevel > NEW_PLAYER_PROTECTION_MAX_LEVEL || subMin > heroLevel + 1) return rolledLevel;
    const lead = heroLevel <= 3 ? 0 : (heroLevel <= 5 ? 1 : 2);
    return Math.max(subMin, Math.min(rolledLevel, heroLevel + lead));
  }

  function worldMonsterDamageMultiplier(heroLevelValue, isBoss) {
    const heroLevel = normalizeLevel(heroLevelValue);
    if (isBoss || heroLevel > NEW_PLAYER_PROTECTION_MAX_LEVEL) return 1;
    // Let the first few levels establish a stable loop, then fade back to normal damage.
    return [0, 0.55, 0.60, 0.65, 0.72, 0.78, 0.84, 0.90, 0.95, 1][heroLevel];
  }

  const rules = Object.freeze({
    NEW_PLAYER_PROTECTION_MAX_LEVEL,
    wildMonsterHpMultiplier,
    worldPackSize,
    worldMonsterLevel,
    worldMonsterDamageMultiplier,
  });

  root.GameBalanceRules = rules;
  if (typeof module !== 'undefined' && module.exports) module.exports = rules;
})(typeof window !== 'undefined' ? window : globalThis);
