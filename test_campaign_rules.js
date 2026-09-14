const assert = require('assert');
const { campaignRoute, campaignActs, campaignConditionDone, campaignStageStates } = require('./campaign.js');

const empty = {
  level:1,
  equipped:0,
  subzones:{},
  bosses:{},
  dungeons:{},
  mapSizes:{ elwynn:3, durotar:3, duskwood:3, hillsbrad:3, arathi:3 },
};

assert.equal(campaignRoute('horde').startMap, 'durotar');
assert.equal(campaignRoute('alliance').startDungeon, 'deadmines');
assert.equal(campaignActs('alliance').length, 5);
assert.equal(campaignActs('alliance').every(act => act.stages.length === 6), true);

assert.equal(campaignConditionDone({type:'level',level:20}, {...empty,level:19}), false);
assert.equal(campaignConditionDone({type:'level',level:20}, {...empty,level:20}), true);
assert.equal(campaignConditionDone({type:'mapAll',key:'elwynn'}, {
  ...empty,
  subzones:{'elwynn-0':true,'elwynn-1':true,'elwynn-2':true},
}), true);

const act1 = campaignActs('alliance')[0];
const oldSave = {
  ...empty,
  level:40,
  dungeons:{ deadmines:2 },
};
assert.deepEqual(campaignStageStates(act1, oldSave), [true,true,true,true,true,true], 'later proof should backfill earlier story steps');

const partial = {
  ...empty,
  equipped:1,
  subzones:{'elwynn-0':true},
};
assert.deepEqual(campaignStageStates(act1, partial), [true,true,true,false,false,false]);

console.log('Campaign rules: pass');
