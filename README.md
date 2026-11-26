# Steno Drive

Online practice platform for stenography students: shorthand dictation + transcription, English typing and Hindi typing tests, with automatic colour-coded marking.

**Stack:** React 18 + Vite (client) · Node/Express + Prisma (server) · PostgreSQL

## Quick start

Requirements: Node 18+, PostgreSQL running locally.

```bash
createdb steno_drive
cp server/.env.example server/.env      # then edit DATABASE_URL / JWT_SECRET
npm run setup                           # installs everything, runs migrations, seeds data
npm run dev                             # API on :5050, website on http://localhost:5173
```

Seeded logins:

| Role    | Username  | Password     |
|---------|-----------|--------------|
| Admin   | `admin`   | `admin123`   |
| Student | `student` | `student123` |

On macOS the seed script generates real dictation audio for the sample shorthand tests (using `say`, at the test's WPM). Elsewhere the tests are created without audio — upload it from the admin panel.

## How it works

**Student journey** (matches the mockup PDF):

1. **Register** (name, father's name, address, mobile, email, photo) → account is *Pending*.
2. **Payment page** shows a scannable UPI QR + contact number.
3. **Admin approves** the student in *Admin → Students*, assigning a username and password (sent to the student manually, e.g. WhatsApp).
4. Student logs in → **English Shorthand / English Typing / Hindi Typing** test lists.
5. **Shorthand:** Listen Audio (plays once, no seeking) → transcription starts automatically when the audio ends or after the test's *listen minutes* (default 4) — or press Skip. **Typing:** passage is shown on screen and copied.
6. **Transcribe** with a countdown timer; auto-submits when time is up. Paste is blocked; draft survives an accidental refresh.
7. **Result**: word-by-word comparison with the original passage —
   punctuation (red), capital/small (blue), spelling (yellow), wrong/extra word (strike-through), missing word (pink), correction (green). Print or save as PDF.
8. **View Outline**: page-by-page shorthand outline images, printable / saveable as PDF.

**Admin panel** (`/admin`): dashboard, approve / deactivate / reset students and toggle fee status, create & edit tests (passage, audio, outline images, WPM, durations, publish), view all results, edit settings (UPI ID, fee, contact number, About text).

## Project layout

```
client/                React app
  src/pages/           Login, Register, Payment, student/*, admin/*
  src/components/      Header, nav/layouts, slider, UPI QR
  public/              logo + slider images (placeholders — replace freely)
server/
  prisma/schema.prisma DB models: User, Test, Attempt, Setting
  prisma/seed.js       sample data
  src/lib/compare.js   marking engine (word alignment + mistake classification)
  src/routes/          public (auth/register), student, admin APIs
  uploads/             photos, audio, outline images (git-ignored)
```

## Marking rules

The typed text is aligned with the original using a weighted word-level edit distance, then each pair is classified:

| Type | Rule |
|---|---|
| Punctuation | same word, punctuation differs |
| Capital-Small | same word, letter case differs |
| Spelling | close match (≤ ~30 % characters different) |
| Wrong word | different word typed in place |
| Missing word | original word not typed |
| Extra word | typed word not in original (shown struck through, counted with wrong words) |

Paragraph breaks and extra spaces are ignored. Tests: `npm --prefix server test`.

## Production

```bash
npm run build       # builds client/dist
npm start           # Express serves the API and the built site on PORT (default 5050)
```

Set a strong `JWT_SECRET`, change the admin password, and back up `server/uploads/` along with the database.
