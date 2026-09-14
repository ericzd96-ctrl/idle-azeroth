const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, 'ui_icons.js'), 'utf8');
const aliasBlock = source.match(/const LOCAL_ICON_ALIASES = Object\.freeze\(\{([\s\S]*?)\}\);/);
assert.ok(aliasBlock, 'LOCAL_ICON_ALIASES must be present');

const aliases = {};
for (const match of aliasBlock[1].matchAll(/([a-z0-9_]+)\s*:\s*'([a-z0-9_]+)'/g)) {
  aliases[match[1]] = match[2];
}

const mappedNames = [...source.matchAll(/'[^']+'\s*:\s*'([a-z0-9_]+)'/g)].map(match => match[1]);
const iconDir = path.join(__dirname, 'assets', 'wow', 'ui');
const unresolved = [...new Set(mappedNames)].filter(name => {
  const resolved = aliases[name] || name;
  return !fs.existsSync(path.join(iconDir, `${resolved}.jpg`));
});

assert.deepStrictEqual(unresolved, [], `Unresolved local icons: ${unresolved.join(', ')}`);
for (const [missingName, localName] of Object.entries(aliases)) {
  assert.ok(fs.existsSync(path.join(iconDir, `${localName}.jpg`)), `${missingName} aliases missing file ${localName}.jpg`);
}

console.log(`Asset checks passed (${Object.keys(aliases).length} local aliases).`);
