/**
 * Seeds an admin, a demo student, default settings and sample tests.
 * Safe to run repeatedly – existing users/tests are left untouched.
 *
 * On macOS, dictation audio for shorthand tests is generated with the built-in
 * `say` command at the test's WPM. Elsewhere the tests are created without audio.
 */
import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { DEFAULT_SETTINGS, prisma } from '../src/lib/core.js';
import { UPLOAD_DIR } from '../src/lib/upload.js';

const NIA_1 = `The Negotiable Instruments Act was enacted to define and amend the law relating to promissory notes, bills of exchange and cheques. A negotiable instrument is a document which entitles a person to a sum of money and which is transferable from one person to another by delivery or by endorsement and delivery.

The holder in due course is a person who, for consideration, became the possessor of the instrument before the amount mentioned in it became payable, without having sufficient cause to believe that any defect existed in the title of the person from whom he derived his title. Such a holder enjoys special protection under the Act, and the instrument passes to him free from many of the defences which might have been available against the original payee.`;

const NIA_2 = `When a cheque drawn by a person on an account maintained by him with a banker is returned by the bank unpaid, either because the amount of money standing to the credit of that account is insufficient or because it exceeds the amount arranged to be paid, such person shall be deemed to have committed an offence.

The payee must make a demand for the payment of the said amount by giving a notice in writing to the drawer within thirty days of the receipt of information from the bank. If the drawer fails to make the payment within fifteen days of the receipt of the notice, a complaint may be filed before the magistrate within one month of the date on which the cause of action arises.`;

const NIA_3 = `Every promissory note, bill of exchange or cheque shall be presumed to have been made or drawn for consideration until the contrary is proved. It shall also be presumed that every negotiable instrument bearing a date was made or drawn on such date, and that every accepted bill of exchange was accepted within a reasonable time after its date and before its maturity.

These presumptions are rebuttable, and the burden of proving the absence of consideration lies upon the person who denies it. The court will consider the whole of the evidence placed before it, and a mere denial in the written statement will not ordinarily be sufficient to displace the presumption raised in favour of the holder.`;

const NIA_4 = `A bill of exchange is an instrument in writing containing an unconditional order, signed by the maker, directing a certain person to pay a certain sum of money only to, or to the order of, a certain person or to the bearer of the instrument. The person who makes the bill is called the drawer, the person directed to pay is called the drawee, and the person to whom the money is directed to be paid is called the payee.`;

const ENG_TYPE_1 = `Once a tiny minority, the community remains a group apart even as its numbers expand year by year. Currently they are estimated to make up a significant share of the population, and the birth rate within the community remains far higher than the national average.

As the community becomes bigger, so has the debate around the expense of supporting its members. Economists argue that a sustainable plan must balance tradition with the needs of a modern economy.`;

const ENG_TYPE_2 = `Practice is the only secret of speed and accuracy in typing. A candidate who types for at least one hour every day, keeping the eyes on the copy and the fingers on the home row, will find that both speed and accuracy improve steadily within a few weeks. Avoid looking at the keyboard, maintain a straight posture and take short breaks to rest the wrists.`;

const HINDI_TYPE_1 = `भारत एक विशाल देश है। यहाँ विभिन्न धर्मों, भाषाओं और संस्कृतियों के लोग एक साथ रहते हैं। विविधता में एकता हमारे देश की सबसे बड़ी विशेषता है। हमारा संविधान प्रत्येक नागरिक को समानता, स्वतंत्रता और न्याय का अधिकार प्रदान करता है।

शिक्षा किसी भी राष्ट्र की प्रगति का आधार होती है। जब देश का प्रत्येक नागरिक शिक्षित होगा, तभी देश सही अर्थों में विकसित हो सकेगा।`;

const HINDI_TYPE_2 = `परिश्रम ही सफलता की कुंजी है। जो व्यक्ति निरंतर परिश्रम करता है, वह जीवन में अवश्य सफल होता है। टंकण की गति बढ़ाने के लिए प्रतिदिन अभ्यास करना आवश्यक है। अभ्यास करते समय शुद्धता पर विशेष ध्यान देना चाहिए, क्योंकि गति से अधिक महत्त्व शुद्धता का होता है।`;

const day = (offset) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - offset);
  return d;
};

const TESTS = [
  { category: 'SHORTHAND', title: '1 – Negotiable Instruments Act', wpm: 100, testDate: day(0), passage: NIA_1 },
  { category: 'SHORTHAND', title: '2 – Negotiable Instruments Act', wpm: 110, testDate: day(1), passage: NIA_2 },
  { category: 'SHORTHAND', title: '3 – Negotiable Instruments Act', wpm: 100, testDate: day(2), passage: NIA_3 },
  { category: 'SHORTHAND', title: '4 – Negotiable Instruments Act', wpm: 80, testDate: day(3), passage: NIA_4 },
  { category: 'ENGLISH_TYPING', title: '1 – Community and Economy', wpm: 35, durationMin: 10, testDate: day(0), passage: ENG_TYPE_1 },
  { category: 'ENGLISH_TYPING', title: '2 – Practice Makes Perfect', wpm: 30, durationMin: 10, testDate: day(1), passage: ENG_TYPE_2 },
  { category: 'HINDI_TYPING', title: '1 – भारत की विविधता', wpm: 25, durationMin: 10, testDate: day(0), passage: HINDI_TYPE_1 },
  { category: 'HINDI_TYPING', title: '2 – परिश्रम का महत्त्व', wpm: 25, durationMin: 10, testDate: day(1), passage: HINDI_TYPE_2 },
];

function generateAudio(text, wpm, name) {
  if (process.platform !== 'darwin') return null;
  const out = path.join(UPLOAD_DIR, 'audio', `${name}.m4a`);
  const txt = path.join(os.tmpdir(), `${name}.txt`);
  try {
    fs.writeFileSync(txt, text);
    execFileSync('say', ['-r', String(wpm), '-o', out, '--data-format=aac', '-f', txt]);
    return `/uploads/audio/${name}.m4a`;
  } catch (e) {
    console.warn(`  ! could not generate audio for ${name}: ${e.message}`);
    return null;
  } finally {
    fs.rmSync(txt, { force: true });
  }
}

/** Placeholder outline page (real outlines are scanned shorthand images uploaded by the admin). */
function generateOutlinePages(title, name, count = 2) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return Array.from({ length: count }, (_, p) => {
    const lines = Array.from({ length: 16 }, (_, i) => {
      const y = 150 + i * 52;
      const strokes = Array.from({ length: 6 }, (_, k) => {
        const x = 70 + k * 105 + ((i * 37 + k * 53 + p * 11) % 40);
        const h = 10 + ((i * 7 + k * 13) % 22);
        return `<path d="M${x} ${y} q 18 -${h} 36 0 t 30 ${h / 2}" />`;
      }).join('');
      return `<line x1="50" y1="${y + 14}" x2="745" y2="${y + 14}" stroke="#c9d6df" />${strokes}`;
    }).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="794" height="1123" viewBox="0 0 794 1123">
<rect width="794" height="1123" fill="#fff"/>
<text x="397" y="70" text-anchor="middle" font-family="Arial" font-size="26" fill="#0b2e3f">${esc(title)}</text>
<text x="397" y="105" text-anchor="middle" font-family="Arial" font-size="16" fill="#5b6b75">Shorthand outline (sample) — page ${p + 1} of ${count}</text>
<g fill="none" stroke="#0b2e3f" stroke-width="2.2" stroke-linecap="round">${lines}</g>
</svg>`;
    const file = `${name}-p${p + 1}.svg`;
    fs.writeFileSync(path.join(UPLOAD_DIR, 'outlines', file), svg);
    return `/uploads/outlines/${file}`;
  });
}

async function main() {
  const adminUser = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

  if (!(await prisma.user.findUnique({ where: { username: adminUser } }))) {
    await prisma.user.create({
      data: {
        role: 'ADMIN', status: 'ACTIVE', username: adminUser, firstName: 'Administrator',
        passwordHash: await bcrypt.hash(adminPass, 10),
      },
    });
    console.log(`✓ admin created  → ${adminUser} / ${adminPass}`);
  }

  if (!(await prisma.user.findUnique({ where: { username: 'student' } }))) {
    await prisma.user.create({
      data: {
        status: 'ACTIVE', username: 'student', passwordHash: await bcrypt.hash('student123', 10),
        firstName: 'Demo', lastName: 'Student', fatherFirstName: 'Demo', fatherLastName: 'Parent',
        state: 'Uttar Pradesh', city: 'Lucknow', mobile: '9000000000', email: 'demo.student@example.com',
        feePaid: true,
      },
    });
    console.log('✓ demo student   → student / student123');
  }

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.setting.upsert({ where: { key }, create: { key, value }, update: {} });
  }

  if ((await prisma.test.count()) === 0) {
    for (const [i, t] of TESTS.entries()) {
      const slug = `sample-${i + 1}`;
      const extra = {};
      if (t.category === 'SHORTHAND') {
        extra.audioUrl = generateAudio(t.passage, t.wpm, slug);
        extra.outlineImages = generateOutlinePages(`${t.title} — ${t.wpm} WPM`, slug);
      }
      await prisma.test.create({ data: { ...t, ...extra } });
      console.log(`✓ test: ${t.title} (${t.category})${extra.audioUrl ? ' + audio' : ''}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
