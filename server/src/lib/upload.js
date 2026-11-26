import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { HttpError } from './core.js';

export const UPLOAD_DIR = fileURLToPath(new URL('../../uploads', import.meta.url));

const DIRS = { photo: 'photos', audio: 'audio', outline: 'outlines' };
for (const d of Object.values(DIRS)) fs.mkdirSync(path.join(UPLOAD_DIR, d), { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, file, cb) => cb(null, path.join(UPLOAD_DIR, DIRS[file.fieldname])),
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
});

function fileFilter(_req, file, cb) {
  if (!DIRS[file.fieldname]) return cb(new HttpError(400, `Unexpected file field "${file.fieldname}"`));
  const want = file.fieldname === 'audio' ? 'audio/' : 'image/';
  if (!file.mimetype.startsWith(want)) {
    return cb(new HttpError(400, `${file.fieldname} must be ${file.fieldname === 'audio' ? 'an audio' : 'an image'} file`));
  }
  cb(null, true);
}

export const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });

export const fileUrl = (file) => `/uploads/${DIRS[file.fieldname]}/${file.filename}`;

/** Delete a previously uploaded file given its public URL. Ignores anything outside /uploads. */
export function removeUpload(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  const target = path.join(UPLOAD_DIR, url.slice('/uploads/'.length));
  if (!target.startsWith(UPLOAD_DIR)) return;
  fs.promises.unlink(target).catch(() => {});
}
