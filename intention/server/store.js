import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isIsoDate, MOODS } from '../shared/streak.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'check-ins.json');

/**
 * A JSON file on disk. There are no accounts yet, so there is exactly one
 * person's history to keep and a database would be more moving parts than the
 * app has content. Swapping this module out is the whole migration when that
 * changes.
 */

export async function readCheckIns() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.checkIns) ? parsed.checkIns : [];
  } catch (error) {
    // First run: no file yet. Anything else is worth knowing about, but an
    // unreadable history still shouldn't stop the app from opening.
    if (error.code !== 'ENOENT') {
      console.error('Could not read check-ins:', error.message);
    }
    return [];
  }
}

/**
 * One check-in per day — answering again replaces the day rather than adding
 * to it, so changing your mind about today is not a second event.
 */
export async function saveCheckIn({ date, mood }) {
  if (!isIsoDate(date)) throw new BadRequest('date must be YYYY-MM-DD');
  if (!MOODS.includes(mood)) throw new BadRequest(`mood must be one of: ${MOODS.join(', ')}`);

  const checkIns = await readCheckIns();
  const entry = { date, mood, recordedAt: new Date().toISOString() };
  const existing = checkIns.findIndex((item) => item.date === date);

  if (existing === -1) checkIns.push(entry);
  else checkIns[existing] = entry;

  checkIns.sort((a, b) => (a.date < b.date ? -1 : 1));

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, `${JSON.stringify({ checkIns }, null, 2)}\n`);

  return checkIns;
}

export class BadRequest extends Error {
  status = 400;
}
