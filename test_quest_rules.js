const assert = require('assert');
const { QUEST_DAILY_POOL, QUEST_WEEKLY_POOL, questPick, questReconcileForLevel } = require('./quests.js');

const allEligible = (items, pool, level) => items.every(item => {
  const def = pool.find(entry => entry.key === item.key);
  return def && def.minLvl <= level;
});

const levelOneDaily = questPick(QUEST_DAILY_POOL, 3, 42, 1);
assert.strictEqual(levelOneDaily.length, 3);
assert.ok(allEligible(levelOneDaily, QUEST_DAILY_POOL, 1));

const levelFiveDaily = questPick(QUEST_DAILY_POOL, 9, 42, 5);
assert.ok(allEligible(levelFiveDaily, QUEST_DAILY_POOL, 5));
assert.ok(!levelFiveDaily.some(item => ['d_dgn', 'd_arena', 'd_gem', 'd_enhance', 'd_boss'].includes(item.key)));

const levelOneWeekly = questPick(QUEST_WEEKLY_POOL, 3, 42, 1);
assert.deepStrictEqual(levelOneWeekly.map(item => item.key), ['w_kill']);

const migrated = questReconcileForLevel([
  { key: 'w_kill', prog: 120, claimed: false },
  { key: 'w_mythic', prog: 0, claimed: false },
], QUEST_WEEKLY_POOL, 3, 42, 5);
assert.ok(allEligible(migrated, QUEST_WEEKLY_POOL, 5));
assert.strictEqual(migrated.find(item => item.key === 'w_kill').prog, 120);

assert.ok(questPick(QUEST_WEEKLY_POOL, 20, 42, 79).every(item => item.key !== 'w_mythic'));
assert.ok(questPick(QUEST_WEEKLY_POOL, 20, 42, 80).some(item => item.key === 'w_mythic'));

console.log('Quest eligibility checks passed.');
