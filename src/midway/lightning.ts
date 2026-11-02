import { seededRandom } from './world';

/** Each slot of time holds one burst of lightning, somewhere in its first part. */
const SLOT = 4;
/** The latest a burst can start within its slot, so bursts land irregularly. */
const LATEST_START = 1.5;
/** How long one flash takes to fade from full brightness to nothing. */
const FADE = 0.2;
/** The time from one flash to the next within a burst. */
const STEP = 0.3;

/**
 * The lightning's brightness, from 0 to 1, at `t` seconds. Each 4 second slot
 * has one burst of one or two flashes, starting at a random moment in its first
 * 1.5 seconds. A burst lasts at most 0.5 seconds, so there are never more than
 * two flashes in a second and always at least 2 seconds between bursts, inside
 * WCAG 2.3.1's three flashes a second.
 */
export function lightningFlash(t: number): number {
  const slot = Math.floor(t / SLOT);
  const random = seededRandom(slot * 7919 + 17);
  const start = slot * SLOT + random() * LATEST_START;
  const flashes = random() < 0.5 ? 1 : 2;
  for (let i = 0; i < flashes; i++) {
    const since = t - (start + i * STEP);
    if (since >= 0 && since < FADE) return 1 - since / FADE;
  }
  return 0;
}
