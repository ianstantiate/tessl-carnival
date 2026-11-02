import { describe, expect, it } from 'vitest';
import { lightningFlash } from './lightning';

/** Each flash, as the times it starts and ends, over `seconds` sampled every millisecond. */
function flashes(seconds: number): { start: number; end: number }[] {
  const found: { start: number; end: number }[] = [];
  let lit = false;
  for (let ms = 0; ms <= seconds * 1000; ms++) {
    const t = ms / 1000;
    const on = lightningFlash(t) > 0;
    if (on && !lit) found.push({ start: t, end: t });
    if (on) found[found.length - 1].end = t;
    lit = on;
  }
  return found;
}

describe('lightningFlash', () => {
  const seen = flashes(600);

  it('stays between 0 and 1', () => {
    for (let ms = 0; ms < 60_000; ms += 7) {
      const value = lightningFlash(ms / 1000);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('returns 0 most of the time', () => {
    const lit = seen.reduce((sum, flash) => sum + flash.end - flash.start, 0);
    expect(lit / 600).toBeLessThan(0.1);
  });

  it('flashes every few seconds', () => {
    expect(seen.length).toBeGreaterThan(600 / 6);
  });

  it('fades each flash within about 200 ms', () => {
    for (const flash of seen) expect(flash.end - flash.start).toBeLessThan(0.2);
  });

  it('never flashes more than 3 times in any one second', () => {
    for (let i = 0; i + 3 < seen.length; i++) {
      expect(seen[i + 3].start - seen[i].start).toBeGreaterThanOrEqual(1);
    }
  });

  it('leaves at least 2 seconds between bursts, at irregular intervals', () => {
    const bursts: { start: number; end: number }[] = [];
    for (const flash of seen) {
      const last = bursts[bursts.length - 1];
      if (last && flash.start - last.end < 1) last.end = flash.end;
      else bursts.push({ ...flash });
    }
    const starts = new Set<number>();
    for (let i = 1; i < bursts.length; i++) {
      expect(bursts[i].start - bursts[i - 1].end).toBeGreaterThanOrEqual(2);
      starts.add(Math.round((bursts[i].start - bursts[i - 1].start) * 10));
    }
    expect(starts.size).toBeGreaterThan(5);
  });
});
