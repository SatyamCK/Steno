import bcrypt from 'bcryptjs';
import { Router } from 'express';
import {
  ah, CATEGORIES, DEFAULT_SETTINGS, getSettings, HttpError, prisma, publicUser, requireAdmin, requireAuth, toInt,
} from '../lib/core.js';
import { fileUrl, removeUpload, upload } from '../lib/upload.js';

const router = Router();
router.use(requireAuth, requireAdmin);

const USERNAME_RE = /^[a-z0-9._]{3,30}$/;

/* ---------- Dashboard ---------- */

router.get(
  '/stats',
  ah(async (_req, res) => {
    const [pending, active, inactive, attempts, tests] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT', status: 'PENDING' } }),
      prisma.user.count({ where: { role: 'STUDENT', status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'STUDENT', status: 'INACTIVE' } }),
      prisma.attempt.count(),
      prisma.test.groupBy({ by: ['category'], _count: true }),
    ]);
    res.json({
      students: { pending, active, inactive },
      attempts,
      tests: Object.fromEntries(CATEGORIES.map((c) => [c, tests.find((t) => t.category === c)?._count || 0])),
    });
  }),
);

/* ---------- Students ---------- */

router.get(
  '/students',
  ah(async (req, res) => {
    const status = ['PENDING', 'ACTIVE', 'INACTIVE'].includes(req.query.status) ? req.query.status : undefined;
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT', status },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { attempts: true } } },
    });
    res.json(students.map(publicUser));
  }),
);

async function getStudent(id) {
  const s = await prisma.user.findUnique({ where: { id } });
  if (!s || s.role !== 'STUDENT') throw new HttpError(404, 'Student not found.');
  return s;
}

function validateCredentials(username, password) {
  if (username !== undefined && !USERNAME_RE.test(username)) {
    throw new HttpError(400, 'Username must be 3–30 characters: lowercase letters, numbers, dot or underscore.');
  }
  if (password !== undefined && String(password).length < 6) {
    throw new HttpError(400, 'Password must be at least 6 characters.');
  }
}

/** Approve a pending student: assign username + password and activate the account. */
router.post(
  '/students/:id/approve',
  ah(async (req, res) => {
    const student = await getStudent(toInt(req.params.id));
    const username = String(req.body.username || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    validateCredentials(username, password);

    const taken = await prisma.user.findUnique({ where: { username } });
    if (taken && taken.id !== student.id) throw new HttpError(409, 'That username is already taken.');

    const updated = await prisma.user.update({
      where: { id: student.id },
      data: {
        username,
        passwordHash: await bcrypt.hash(password, 10),
        status: 'ACTIVE',
        feePaid: req.body.feePaid === undefined ? student.feePaid : Boolean(req.body.feePaid),
      },
    });
    res.json(publicUser(updated));
  }),
);

/** Update status, fee flag or reset password. */
router.patch(
  '/students/:id',
  ah(async (req, res) => {
    const student = await getStudent(toInt(req.params.id));
    const data = {};
    if (req.body.status !== undefined) {
      if (!['ACTIVE', 'INACTIVE', 'PENDING'].includes(req.body.status)) throw new HttpError(400, 'Invalid status.');
      if (req.body.status === 'ACTIVE' && !student.username) throw new HttpError(400, 'Approve the student first.');
      data.status = req.body.status;
    }
    if (req.body.feePaid !== undefined) data.feePaid = Boolean(req.body.feePaid);
    if (req.body.password !== undefined) {
      validateCredentials(undefined, req.body.password);
      data.passwordHash = await bcrypt.hash(String(req.body.password), 10);
    }
    const updated = await prisma.user.update({ where: { id: student.id }, data });
    res.json(publicUser(updated));
  }),
);

router.delete(
  '/students/:id',
  ah(async (req, res) => {
    const student = await getStudent(toInt(req.params.id));
    await prisma.user.delete({ where: { id: student.id } });
    removeUpload(student.photoUrl);
    res.status(204).end();
  }),
);

/* ---------- Tests ---------- */

const testUpload = upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'outline', maxCount: 30 },
]);

function parseTestBody(body, { partial = false } = {}) {
  const data = {};
  const has = (k) => body[k] !== undefined && body[k] !== '';

  if (has('category') || !partial) {
    if (!CATEGORIES.includes(body.category)) throw new HttpError(400, 'Choose a valid category.');
    data.category = body.category;
  }
  if (has('title') || !partial) {
    const title = String(body.title || '').trim();
    if (!title) throw new HttpError(400, 'Title is required.');
    data.title = title;
  }
  if (has('passage') || !partial) {
    const passage = String(body.passage || '').trim();
    if (!passage) throw new HttpError(400, 'Passage text is required.');
    data.passage = passage;
  }
  if (body.wpm !== undefined) data.wpm = has('wpm') ? toInt(body.wpm) : null;
  if (has('durationMin')) data.durationMin = Math.max(1, toInt(body.durationMin));
  if (has('listenMin')) data.listenMin = Math.max(0, toInt(body.listenMin));
  if (has('testDate')) {
    const d = new Date(body.testDate);
    if (Number.isNaN(d.getTime())) throw new HttpError(400, 'Invalid test date.');
    data.testDate = d;
  }
  if (body.published !== undefined) data.published = body.published === true || body.published === 'true';
  return data;
}

function uploadedUrls(req) {
  return {
    audio: req.files?.audio?.[0] ? fileUrl(req.files.audio[0]) : null,
    outline: (req.files?.outline || []).map(fileUrl),
  };
}

function discardUploads(req) {
  const u = uploadedUrls(req);
  removeUpload(u.audio);
  u.outline.forEach(removeUpload);
}

router.get(
  '/tests',
  ah(async (req, res) => {
    const category = CATEGORIES.includes(req.query.category) ? req.query.category : undefined;
    const tests = await prisma.test.findMany({
      where: { category },
      orderBy: [{ testDate: 'desc' }, { id: 'desc' }],
      include: { _count: { select: { attempts: true } } },
    });
    res.json(tests.map(({ passage, ...t }) => ({ ...t, words: passage.split(/\s+/).filter(Boolean).length })));
  }),
);

router.get(
  '/tests/:id',
  ah(async (req, res) => {
    const test = await prisma.test.findUnique({ where: { id: toInt(req.params.id) } });
    if (!test) throw new HttpError(404, 'Test not found.');
    res.json(test);
  }),
);

router.post(
  '/tests',
  testUpload,
  ah(async (req, res) => {
    let data;
    try {
      data = parseTestBody(req.body);
    } catch (e) {
      discardUploads(req);
      throw e;
    }
    const files = uploadedUrls(req);
    const test = await prisma.test.create({
      data: { ...data, audioUrl: files.audio, outlineImages: files.outline },
    });
    res.status(201).json(test);
  }),
);

router.put(
  '/tests/:id',
  testUpload,
  ah(async (req, res) => {
    const existing = await prisma.test.findUnique({ where: { id: toInt(req.params.id) } });
    if (!existing) {
      discardUploads(req);
      throw new HttpError(404, 'Test not found.');
    }
    let data;
    let keepOutline;
    try {
      data = parseTestBody(req.body, { partial: true });
      keepOutline = req.body.keepOutline !== undefined ? JSON.parse(req.body.keepOutline) : existing.outlineImages;
      if (!Array.isArray(keepOutline)) throw new Error();
      keepOutline = keepOutline.filter((u) => existing.outlineImages.includes(u));
    } catch (e) {
      discardUploads(req);
      throw e instanceof HttpError ? e : new HttpError(400, 'Invalid outline list.');
    }

    const files = uploadedUrls(req);
    if (files.audio || req.body.removeAudio === 'true') {
      removeUpload(existing.audioUrl);
      data.audioUrl = files.audio;
    }
    existing.outlineImages.filter((u) => !keepOutline.includes(u)).forEach(removeUpload);
    data.outlineImages = [...keepOutline, ...files.outline];

    const test = await prisma.test.update({ where: { id: existing.id }, data });
    res.json(test);
  }),
);

router.delete(
  '/tests/:id',
  ah(async (req, res) => {
    const test = await prisma.test.findUnique({ where: { id: toInt(req.params.id) } });
    if (!test) throw new HttpError(404, 'Test not found.');
    await prisma.test.delete({ where: { id: test.id } });
    removeUpload(test.audioUrl);
    test.outlineImages.forEach(removeUpload);
    res.status(204).end();
  }),
);

/* ---------- Results ---------- */

router.get(
  '/attempts',
  ah(async (req, res) => {
    const where = {};
    if (req.query.userId) where.userId = toInt(req.query.userId);
    if (req.query.testId) where.testId = toInt(req.query.testId);
    const attempts = await prisma.attempt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true, createdAt: true, totalMistakes: true, timeTakenSec: true, counts: true,
        test: { select: { id: true, title: true, wpm: true, category: true } },
        user: { select: { id: true, firstName: true, lastName: true, username: true } },
      },
    });
    res.json(attempts);
  }),
);

router.delete(
  '/attempts/:id',
  ah(async (req, res) => {
    await prisma.attempt.delete({ where: { id: toInt(req.params.id) } }).catch(() => {
      throw new HttpError(404, 'Result not found.');
    });
    res.status(204).end();
  }),
);

/* ---------- Settings ---------- */

router.get('/settings', ah(async (_req, res) => res.json(await getSettings())));

router.put(
  '/settings',
  ah(async (req, res) => {
    const entries = Object.keys(DEFAULT_SETTINGS)
      .filter((k) => typeof req.body[k] === 'string')
      .map((k) => [k, req.body[k].trim()]);
    await prisma.$transaction(
      entries.map(([key, value]) => prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } })),
    );
    res.json(await getSettings());
  }),
);

export default router;
