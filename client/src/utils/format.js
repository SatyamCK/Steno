export const CATEGORIES = {
  SHORTHAND: { label: 'English Shorthand', path: '/shorthand' },
  ENGLISH_TYPING: { label: 'English Typing', path: '/english-typing' },
  HINDI_TYPING: { label: 'Hindi Typing', path: '/hindi-typing' },
};

const pad = (n) => String(n).padStart(2, '0');

/** dd/mm/yyyy, as in the mockup */
export function fmtDate(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function fmtDateTime(value) {
  const d = new Date(value);
  return `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** hh:mm:ss */
export function fmtClock(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export function fmtDuration(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  return m ? `${m} min ${pad(s % 60)} sec` : `${s} sec`;
}

export const fullName = (u) => (u ? [u.firstName, u.middleName, u.lastName].filter(Boolean).join(' ') : '');

export const testLabel = (t) => (t.wpm ? `${t.title} --- ${t.wpm} WPM` : t.title);

export const pad2 = (n) => pad(n);

export const isHindi = (category) => category === 'HINDI_TYPING';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function dateParts(value) {
  const d = new Date(value);
  return { day: pad(d.getDate()), mon: MONTHS[d.getMonth()], yr: d.getFullYear() };
}

/** Badge tone for an accuracy percentage. */
export const accuracyTone = (acc) => (acc >= 95 ? 'success' : acc >= 85 ? 'warning' : 'danger');
