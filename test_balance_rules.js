const assert = require('assert');
const rules = require('./balance_rules.js');

assert.strictEqual(rules.wildMonsterHpMultiplier(1), 2.2);
assert.strictEqual(rules.wildMonsterHpMultiplier(10), 5.2);
assert.ok(rules.wildMonsterHpMultiplier(9) < rules.wildMonsterHpMultiplier(10));
assert.strictEqual(rules.worldPackSize(1, 0), 1);
assert.strictEqual(rules.worldPackSize(3, 0.99), 1);
assert.strictEqual(rules.worldPackSize(5, 0.10), 2);
assert.strictEqual(rules.worldPackSize(5, 0.20), 1);
assert.strictEqual(rules.worldPackSize(9, 0.04), 3);
assert.strictEqual(rules.worldPackSize(10, 0.06), 4);
assert.strictEqual(rules.worldMonsterLevel(1, 1, 4, 4), 1);
assert.strictEqual(rules.worldMonsterLevel(5, 1, 8, 8), 6);
assert.strictEqual(rules.worldMonsterLevel(10, 1, 12, 12), 12);
assert.strictEqual(rules.worldMonsterLevel(1, 20, 24, 24), 24);
assert.strictEqual(rules.worldMonsterDamageMultiplier(1, false), 0.55);
assert.strictEqual(rules.worldMonsterDamageMultiplier(5, false), 0.78);
assert.strictEqual(rules.worldMonsterDamageMultiplier(9, false), 1);
assert.strictEqual(rules.worldMonsterDamageMultiplier(1, true), 1);
assert.strictEqual(rules.worldMonsterDamageMultiplier(10, false), 1);

console.log('Balance rule checks passed.');
