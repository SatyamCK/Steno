import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import { HttpError } from './lib/core.js';
import { UPLOAD_DIR } from './lib/upload.js';
import adminRoutes from './routes/admin.js';
import publicRoutes from './routes/public.js';
import studentRoutes from './routes/student.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use('/api/admin', adminRoutes);
app.use('/api', publicRoutes);
app.use('/api', studentRoutes);
app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not found')));

// In production, serve the built React app from client/dist.
const CLIENT_DIST = fileURLToPath(new URL('../../client/dist', import.meta.url));
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (_req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 50 MB).' : err.message;
    return res.status(400).json({ error: msg });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong. Please try again.' : err.message });
});

const PORT = Number(process.env.PORT) || 5050;
app.listen(PORT, () => console.log(`Steno Drive API running on http://localhost:${PORT}`));
