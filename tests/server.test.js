const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCsv, searchStyles, seedDatabase } = require('../server');

test('parseCsv reads comma and tab separated import rows', () => {
  const csv = parseCsv('styleNo,styleName,tags\nW-1,"绞花,圆领","绞花|女装"\n');
  assert.equal(csv.length, 1);
  assert.equal(csv[0].styleNo, 'W-1');
  assert.equal(csv[0].styleName, '绞花,圆领');
  assert.equal(csv[0].__row, 2);

  const tsv = parseCsv('款号\t款名\nW-2\t细针圆领\n');
  assert.equal(tsv[0].styleNo || tsv[0]['款号'], 'W-2');
});

test('searchStyles ranks exact style number and applies filters', () => {
  const db = seedDatabase();
  const user = db.users[0];
  const exact = searchStyles(db, { query: 'W-2407-018', filters: {} }, user);
  assert.equal(exact[0].styleNo, 'W-2407-018');

  const filtered = searchStyles(db, { query: '', filters: { category: '男式毛衣' } }, user);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].styleNo, 'M-2309-044');
});

test('searchStyles supports image hash matching', () => {
  const db = seedDatabase();
  const style = db.styles.find((item) => item.styleNo === 'W-2407-018');
  const results = searchStyles(db, { imageHash: style.assets[1].imageHash, filters: {} }, db.users[0]);
  assert.equal(results[0].styleNo, style.styleNo);
  assert.equal(results[0].matchReason, '图片指纹高度匹配');
});
