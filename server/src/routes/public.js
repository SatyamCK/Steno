import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { ah, getSettings, HttpError, prisma, publicUser, requireAuth, signToken } from '../lib/core.js';
import { fileUrl, removeUpload, upload } from '../lib/upload.js';

const router = Router();
const clean = (v) => (typeof v === 'string' ? v.trim() : '') || null;

/* ---------- Auth ---------- */

router.post(
  '/auth/login',
  ah(async (req, res) => {
    const username = clean(req.body.username)?.toLowerCase();
    const password = req.body.password || '';
    if (!username || !password) throw new HttpError(400, 'Enter username and password.');

    const user = await prisma.user.findUnique({ where: { username } });
    const ok = user?.passwordHash && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) throw new HttpError(401, 'Invalid username or password.');
    if (user.status !== 'ACTIVE') throw new HttpError(403, 'Your account is not active. Please contact the institute.');

    res.json({ token: signToken(user), user: publicUser(user) });
  }),
);

router.get('/auth/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

/* ---------- Settings shown on public pages (payment / fee / about) ---------- */

router.get(
  '/settings/public',
  ah(async (_req, res) => res.json(await getSettings())),
);

/* ---------- New student registration ---------- */

router.post(
  '/register',
  upload.single('photo'),
  ah(async (req, res) => {
    const b = req.body;
    const data = {
      firstName: clean(b.firstName),
      middleName: clean(b.middleName),
      lastName: clean(b.lastName),
      fatherFirstName: clean(b.fatherFirstName),
      fatherMiddleName: clean(b.fatherMiddleName),
      fatherLastName: clean(b.fatherLastName),
      state: clean(b.state),
      city: clean(b.city),
      mobile: clean(b.mobile),
      email: clean(b.email)?.toLowerCase() || null,
    };

    const errors = [];
    if (!data.firstName) errors.push('Student first name is required.');
    if (!data.fatherFirstName) errors.push("Father's first name is required.");
    if (!data.state || !data.city) errors.push('State and city are required.');
    if (!/^[6-9]\d{9}$/.test(data.mobile || '')) errors.push('Enter a valid 10-digit mobile number.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || '')) errors.push('Enter a valid email address.');
    if (!req.file) errors.push('Please upload your photo.');
    if (errors.length) {
      if (req.file) removeUpload(fileUrl(req.file));
      throw new HttpError(400, errors.join(' '));
    }

    const existing = await prisma.user.findFirst({ where: { mobile: data.mobile, role: 'STUDENT' } });
    if (existing) {
      removeUpload(fileUrl(req.file));
      throw new HttpError(409, 'This mobile number is already registered.');
    }

    const user = await prisma.user.create({ data: { ...data, photoUrl: fileUrl(req.file) } });
    res.status(201).json({ id: user.id, name: [user.firstName, user.lastName].filter(Boolean).join(' ') });
  }),
);

export default router;
