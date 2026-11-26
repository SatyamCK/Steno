import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareTexts } from './compare.js';

const kinds = (r) => r.ops.map((o) => o.t);

test('identical text has no mistakes', () => {
  const r = compareTexts('Once a tiny minority, the group.', 'Once a tiny minority, the group.');
  assert.equal(r.totalMistakes, 0);
  assert.equal(r.counts.correct, 6);
});

test('classifies each mistake type', () => {
  const original = 'Currently they are estimated to make up 14% of the population. If their numbers continue to grow, they were exempted.';
  const typed = 'currently they Are estimated to make up 14% of the popuation If their numbers contain to grow, they exempted. extra';
  const r = compareTexts(original, typed);
  assert.equal(r.counts.capital, 2);       // currently / Are
  assert.equal(r.counts.spelling, 1);      // popuation (also missing the full stop)
  assert.equal(r.counts.wrong, 1);         // contain → continue
  assert.equal(r.counts.missing, 1);       // were
  assert.equal(r.counts.extra, 1);         // extra
  assert.equal(r.counts.punctuation, 1);   // population. → popuation
  assert.ok(kinds(r).includes('spelling'));
});

test('punctuation-only differences', () => {
  const r = compareTexts('Once a tiny minority, the', 'Once a tiny minority the');
  assert.equal(r.counts.punctuation, 1);
  assert.equal(r.totalMistakes, 1);
});

test('keeps paragraph breaks', () => {
  const r = compareTexts('First para.\n\nSecond para.', 'First para. Second para.');
  assert.equal(r.totalMistakes, 0);
  assert.equal(r.ops[2].pb, true);
});

test('handles Hindi (Devanagari) text', () => {
  const r = compareTexts('भारत एक विशाल देश है।', 'भारत एक विशल देश है');
  assert.equal(r.counts.spelling, 1);
  assert.equal(r.counts.punctuation, 1);
});

test('empty submission marks every word missing', () => {
  const r = compareTexts('one two three', '');
  assert.equal(r.counts.missing, 3);
});
