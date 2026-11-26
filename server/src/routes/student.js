import { Router } from 'express';
import { compareTexts } from '../lib/compare.js';
import { ah, CATEGORIES, HttpError, prisma, publicUser, requireAuth, toInt } from '../lib/core.js';

const router = Router();
router.use(requireAuth);

const LIST_FIELDS = {
  id: true, category: true, title: true, wpm: true, testDate: true, durationMin: true,
  listenMin: true, outlineImages: true, audioUrl: true,
};

async function getVisibleTest(id, user) {
  const test = await prisma.test.findUnique({ where: { id } });
  if (!test || (!test.published && user.role !== 'ADMIN')) throw new HttpError(404, 'Test not found.');
  return test;
}

/** Test list for a category, with the student's latest attempt for "View Result". */
router.get(
  '/tests',
  ah(async (req, res) => {
    const { category } = req.query;
    if (!CATEGORIES.includes(category)) throw new HttpError(400, 'Unknown category.');

    const tests = await prisma.test.findMany({
      where: { category, published: true },
      orderBy: [{ testDate: 'desc' }, { id: 'desc' }],
      select: LIST_FIELDS,
    });
    const attempts = await prisma.attempt.findMany({
      where: { userId: req.user.id, testId: { in: tests.map((t) => t.id) } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, testId: true, totalMistakes: true, counts: true, createdAt: true },
    });
    const latest = new Map();
    const tries = new Map();
    for (const a of attempts) {
      if (!latest.has(a.testId)) latest.set(a.testId, a);
      tries.set(a.testId, (tries.get(a.testId) || 0) + 1);
    }

    res.json(
      tests.map(({ outlineImages, audioUrl, ...t }) => {
        const last = latest.get(t.id);
        return {
          ...t,
          hasOutline: outlineImages.length > 0,
          hasAudio: Boolean(audioUrl),
          lastAttemptId: last?.id || null,
          attemptCount: tries.get(t.id) || 0,
          lastResult: last
            ? { mistakes: last.totalMistakes, accuracy: last.counts.accuracy, at: last.createdAt }
            : null,
        };
      }),
    );
  }),
);

/** Single test. The passage of a shorthand dictation is hidden until the student submits. */
router.get(
  '/tests/:id',
  ah(async (req, res) => {
    const { passage, outlineImages, ...test } = await getVisibleTest(toInt(req.params.id), req.user);
    res.json({ ...test, passage: test.category === 'SHORTHAND' ? null : passage, hasOutline: outlineImages.length > 0 });
  }),
);

router.get(
  '/tests/:id/outline',
  ah(async (req, res) => {
    const t = await getVisibleTest(toInt(req.params.id), req.user);
    res.json({ id: t.id, title: t.title, wpm: t.wpm, category: t.category, pages: t.outlineImages });
  }),
);

router.post(
  '/tests/:id/attempts',
  ah(async (req, res) => {
    const test = await getVisibleTest(toInt(req.params.id), req.user);
    const typedText = typeof req.body.typedText === 'string' ? req.body.typedText.slice(0, 100_000) : '';
    const maxSec = test.durationMin * 60;
    const timeTakenSec = Math.min(maxSec, Math.max(0, Number.parseInt(req.body.timeTakenSec, 10) || 0));

    const { ops, counts, totalMistakes } = compareTexts(test.passage, typedText);
    const attempt = await prisma.attempt.create({
      data: { userId: req.user.id, testId: test.id, typedText, timeTakenSec, ops, counts, totalMistakes },
      select: { id: true },
    });
    res.status(201).json(attempt);
  }),
);

router.get(
  '/attempts/:id',
  ah(async (req, res) => {
    const attempt = await prisma.attempt.findUnique({
      where: { id: toInt(req.params.id) },
      include: {
        test: { select: { id: true, title: true, wpm: true, category: true, durationMin: true, testDate: true } },
        user: true,
      },
    });
    if (!attempt || (attempt.userId !== req.user.id && req.user.role !== 'ADMIN')) {
      throw new HttpError(404, 'Result not found.');
    }
    res.json({ ...attempt, user: publicUser(attempt.user) });
  }),
);

/** Numbers for the student dashboard. */
router.get(
  '/me/summary',
  ah(async (req, res) => {
    const [attempts, tests] = await Promise.all([
      prisma.attempt.findMany({ where: { userId: req.user.id }, select: { counts: true, totalMistakes: true } }),
      prisma.test.groupBy({ by: ['category'], where: { published: true }, _count: true }),
    ]);
    const acc = attempts.map((a) => a.counts.accuracy ?? 0);
    res.json({
      attempts: attempts.length,
      avgAccuracy: acc.length ? Math.round((acc.reduce((s, x) => s + x, 0) / acc.length) * 10) / 10 : null,
      bestAccuracy: acc.length ? Math.max(...acc) : null,
      fewestMistakes: attempts.length ? Math.min(...attempts.map((a) => a.totalMistakes)) : null,
      tests: Object.fromEntries(CATEGORIES.map((c) => [c, tests.find((t) => t.category === c)?._count || 0])),
    });
  }),
);

router.get(
  '/me/attempts',
  ah(async (req, res) => {
    const attempts = await prisma.attempt.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true, createdAt: true, totalMistakes: true, timeTakenSec: true, counts: true,
        test: { select: { id: true, title: true, wpm: true, category: true } },
      },
    });
    res.json(attempts);
  }),
);

export default router;
