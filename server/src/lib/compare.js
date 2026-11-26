/**
 * Word-level comparison of a typed transcription against the original passage.
 *
 * The two word sequences are aligned with a weighted edit-distance DP, then every
 * aligned pair is classified into one of the mistake types used on the result page:
 *
 *   correct  – identical word
 *   punct    – same word, only punctuation differs        (red)
 *   capital  – same word, only letter case differs         (blue)
 *   spelling – close but misspelt word                     (yellow highlight)
 *   wrong    – a different word typed in place             (strike-through)
 *   missing  – original word not typed at all              (pink)
 *   extra    – word typed that is not in the original      (strike-through)
 *
 * Works for Devanagari too: punctuation is detected with Unicode classes (so "।"
 * counts as punctuation) and case comparisons are a no-op for Hindi.
 */

const PUNCT_RE = /[\p{P}\p{S}]/gu;

const stripPunct = (w) => w.replace(PUNCT_RE, '');
const normalize = (w) => stripPunct(w).toLowerCase();

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

function isSimilar(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  const chars = [...na].length;
  const maxLen = Math.max(chars, [...nb].length);
  const dist = levenshtein([...na], [...nb]);
  // Short words tolerate 1 edit; longer words up to ~30% of their length.
  return dist <= Math.max(1, Math.floor(maxLen * 0.3)) && dist < maxLen;
}

const COST_INDEL = 1;
function substitutionCost(o, t) {
  if (o === t) return 0;
  if (normalize(o) === normalize(t)) return 0.1;
  if (isSimilar(o, t)) return 0.8;
  return 1.6; // still cheaper than delete + insert (2), so a wrong word stays one mistake
}

/** Split a passage into words, remembering where paragraph breaks were. */
export function tokenize(text) {
  const tokens = [];
  const paragraphs = String(text || '')
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/);
  paragraphs.forEach((para, pIdx) => {
    const words = para.split(/\s+/).filter(Boolean);
    words.forEach((w, i) => tokens.push({ w, pb: pIdx > 0 && i === 0 }));
  });
  return tokens;
}

const punctOnly = (w) => w.replace(/[^\p{P}\p{S}]/gu, '');

function classify(o, t) {
  if (o === t) return { t: 'correct', o };
  if (stripPunct(o) === stripPunct(t)) return { t: 'punct', o, y: t };
  let op;
  if (normalize(o) === normalize(t)) op = { t: 'capital', o, y: t };
  else if (isSimilar(o, t)) op = { t: 'spelling', o, y: t };
  else return { t: 'wrong', o, y: t };
  // Word is also wrongly punctuated – counted in the punctuation bucket as well.
  if (punctOnly(o) !== punctOnly(t)) op.punct = true;
  return op;
}

export function compareTexts(original, typed) {
  const orig = tokenize(original);
  const typ = tokenize(typed).map((x) => x.w);
  const n = orig.length;
  const m = typ.length;
  const W = m + 1;
  const dp = new Float64Array((n + 1) * W);

  for (let i = 0; i <= n; i++) dp[i * W] = i * COST_INDEL;
  for (let j = 0; j <= m; j++) dp[j] = j * COST_INDEL;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i * W + j] = Math.min(
        dp[(i - 1) * W + (j - 1)] + substitutionCost(orig[i - 1].w, typ[j - 1]),
        dp[(i - 1) * W + j] + COST_INDEL,
        dp[i * W + (j - 1)] + COST_INDEL,
      );
    }
  }

  // Backtrack
  const ops = [];
  let i = n;
  let j = m;
  const EPS = 1e-9;
  while (i > 0 || j > 0) {
    const cur = dp[i * W + j];
    if (i > 0 && j > 0 && Math.abs(cur - (dp[(i - 1) * W + (j - 1)] + substitutionCost(orig[i - 1].w, typ[j - 1]))) < EPS) {
      const op = classify(orig[i - 1].w, typ[j - 1]);
      if (orig[i - 1].pb) op.pb = true;
      ops.push(op);
      i--; j--;
    } else if (i > 0 && Math.abs(cur - (dp[(i - 1) * W + j] + COST_INDEL)) < EPS) {
      const op = { t: 'missing', o: orig[i - 1].w };
      if (orig[i - 1].pb) op.pb = true;
      ops.push(op);
      i--;
    } else {
      ops.push({ t: 'extra', y: typ[j - 1] });
      j--;
    }
  }
  ops.reverse();

  const counts = {
    punctuation: 0, capital: 0, spelling: 0, wrong: 0, missing: 0, extra: 0, correct: 0,
    originalWords: n, typedWords: m,
  };
  for (const op of ops) {
    if (op.t === 'correct') counts.correct++;
    else if (op.t === 'punct') counts.punctuation++;
    else {
      counts[op.t]++;
      if (op.punct) counts.punctuation++;
    }
  }
  const totalMistakes = counts.punctuation + counts.capital + counts.spelling + counts.wrong + counts.missing + counts.extra;
  counts.accuracy = n ? Math.max(0, Math.round(((n - totalMistakes) / n) * 10000) / 100) : 0;

  return { ops, counts, totalMistakes };
}
