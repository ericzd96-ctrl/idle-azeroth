const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const ctx = {
  state: { faction:'alliance', bossesKilled:{} },
  account: { bossesKilled:{} },
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('story.js', 'utf8'), ctx);

const opening = () => vm.runInContext("storyActOpeningScript({ key:'act1', brief:'' })", ctx)
  .steps.map(step => step.text).join(' ');
assert.match(opening(), /迪菲亚/);
ctx.state.faction = 'horde';
assert.match(opening(), /火刃/);
assert.doesNotMatch(opening(), /迪菲亚/);

const mainRouteMaps = ['elwynn','durotar','duskwood','hillsbrad','arathi','searing','eastern_plague','hellfire','shadowmoon','borean','dragonblight','storm','icecrown'];
const eventKeys = vm.runInContext('Object.keys(ZONE_CHAIN_EVENTS)', ctx);
for (const key of mainRouteMaps) assert(eventKeys.includes(key), `${key} should have a local event`);

ctx.map = { key:'westfall', name:'西部荒野', sub:[{}, {}, {}] };
const report = () => vm.runInContext('zoneChainScript(map).steps.map(step => step.text).join(" ")', ctx);
assert.match(report(), /首领仍在前方/, 'exploration alone must not claim the boss fell');
ctx.state.bossesKilled.westfall = 1;
assert.match(report(), /首领已被击退/);

vm.runInContext(fs.readFileSync('data.js', 'utf8'), ctx);
const finaleBosses = vm.runInContext("Object.fromEntries(DUNGEONS.filter(d => ['bt','icc'].includes(d.key)).map(d => [d.key, d.bosses.at(-1).name]))", ctx);
assert.strictEqual(finaleBosses.bt, '伊利丹·怒风');
assert.strictEqual(finaleBosses.icc, '巫妖王');
const mapBosses = vm.runInContext("Object.fromEntries(MAPS.filter(m => ['shadowmoon','dragonblight','icecrown'].includes(m.key)).map(m => [m.key, m.boss.name]))", ctx);
assert.strictEqual(mapBosses.shadowmoon, '伊利达雷守门官');
assert.strictEqual(mapBosses.dragonblight, '霜骨龙将');
assert.strictEqual(mapBosses.icecrown, '天灾攻城统领');
assert(!Object.values(mapBosses).some(name => Object.values(finaleBosses).includes(name)), 'map gates must not preempt the raid finale');
assert.match(vm.runInContext("DUNGEON_BOSS_INTROS.icc.flavor", ctx), /巫妖王/);

console.log('Story rules: pass');
