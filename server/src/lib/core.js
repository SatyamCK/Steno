import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

export const prisma = new PrismaClient();

/* ---------- HTTP helpers ---------- */

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Wrap async route handlers so rejected promises reach the error middleware. */
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const toInt = (v) => {
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n)) throw new HttpError(400, 'Invalid id');
  return n;
};

/* ---------- Auth ---------- */

const SECRET = process.env.JWT_SECRET || 'dev-only-secret';

export const signToken = (user) => jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '7d' });

export function publicUser(u) {
  if (!u) return u;
  const { passwordHash, ...rest } = u;
  return rest;
}

export const requireAuth = ah(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Please log in.');
  let payload;
  try {
    payload = jwt.verify(token, SECRET);
  } catch {
    throw new HttpError(401, 'Session expired. Please log in again.');
  }
  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user || user.status !== 'ACTIVE') throw new HttpError(401, 'Session expired. Please log in again.');
  req.user = user;
  next();
});

export const requireAdmin = (req, _res, next) => {
  if (req.user?.role !== 'ADMIN') return next(new HttpError(403, 'Admin access only.'));
  next();
};

/* ---------- Settings ---------- */

export const DEFAULT_SETTINGS = {
  upiId: 'xxxxxxxxxx@ybl',
  payeeName: 'Steno Drive',
  contactMobile: 'xxxxxxxxxx',
  feeAmount: '500',
  feeDetails:
    'Monthly subscription gives full access to English Shorthand dictations, English Typing and Hindi Typing tests with detailed results.',
  aboutText:
    'Steno Drive is an online practice platform for stenography aspirants. Practise shorthand dictations at different speeds, transcribe them on screen and get an instant, colour-coded analysis of every mistake.',
};

export async function getSettings() {
  const rows = await prisma.setting.findMany();
  return { ...DEFAULT_SETTINGS, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
}

export const CATEGORIES = ['SHORTHAND', 'ENGLISH_TYPING', 'HINDI_TYPING'];
