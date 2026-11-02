import { describe, expect, it } from 'vitest';
import {
  ASCEND_SCORE,
  CLIMB_SECONDS,
  CRASH_SCORE,
  CREATURES,
  FORM_SECONDS,
  OUTCOME_SECONDS,
  behelitFeatures,
  canRide,
  createState,
  pickCreature,
  rollOutcome,
  scoreFor,
  skipToOutcome,
  startRide,
  step,
} from './game';

const always = (n: number) => () => n;

/** Runs a started ride through the climb and the crest in small steps. */
function rideToCrest(state: ReturnType<typeof createState>, random: () => number) {
  const steps = Math.ceil((CLIMB_SECONDS + FORM_SECONDS) / 0.05) + 2;
  for (let i = 0; i < steps; i++) step(state, 0.05, random);
}

describe('coaster of causality', () => {
  it('waits at the bottom of the hill until the ride starts', () => {
    const state = createState();
    expect(state.phase).toBe('ready');
    step(state, 1, always(0));
    expect(state.climb).toBe(0);
    expect(state.outcome).toBeNull();
  });

  it('gives both outcomes with a fixed random source', () => {
    expect(rollOutcome(always(0))).toBe('ascend');
    expect(rollOutcome(always(0.49))).toBe('ascend');
    expect(rollOutcome(always(0.5))).toBe('crash');
    expect(rollOutcome(always(0.99))).toBe('crash');
  });

  it('can pick each of the four creatures', () => {
    expect(CREATURES.map((c) => c.name)).toEqual(['Oculus', 'Morrow', 'Hollow', 'Thorne']);
    expect(pickCreature(always(0))).toBe(CREATURES[0]);
    expect(pickCreature(always(0.25))).toBe(CREATURES[1]);
    expect(pickCreature(always(0.5))).toBe(CREATURES[2]);
    expect(pickCreature(always(0.75))).toBe(CREATURES[3]);
    expect(pickCreature(always(0.999))).toBe(CREATURES[3]);
  });

  it('scores 100 for ascending and 0 for crashing', () => {
    expect(scoreFor('ascend')).toBe(100);
    expect(ASCEND_SCORE).toBe(100);
    expect(scoreFor('crash')).toBe(0);
    expect(CRASH_SCORE).toBe(0);
  });

  it('climbs the hill, forms the face, then decides at the crest', () => {
    const state = createState();
    expect(startRide(state)).toBe(true);
    step(state, CLIMB_SECONDS / 2, always(0));
    expect(state.phase).toBe('climbing');
    expect(state.outcome).toBeNull();
    step(state, CLIMB_SECONDS / 2, always(0));
    expect(state.phase).toBe('forming');
    expect(state.outcome).toBeNull();
    step(state, FORM_SECONDS, always(0));
    expect(state.phase).toBe('outcome');
    expect(state.form).toBe(1);
  });

  it('ascends with a creature and 100 points', () => {
    const state = createState();
    startRide(state);
    rideToCrest(state, always(0.1));
    expect(state.outcome).toBe('ascend');
    expect(state.creature).toBe(CREATURES[0]);
    expect(state.score).toBe(100);
  });

  it('crashes with no creature and 0 points', () => {
    const state = createState();
    startRide(state);
    rideToCrest(state, always(0.9));
    expect(state.outcome).toBe('crash');
    expect(state.creature).toBeNull();
    expect(state.score).toBe(0);
  });

  it('lets the player ride again only once the outcome has played out', () => {
    const state = createState();
    startRide(state);
    expect(startRide(state)).toBe(false);
    rideToCrest(state, always(0.9));
    expect(canRide(state)).toBe(false);
    step(state, OUTCOME_SECONDS, always(0.9));
    expect(startRide(state)).toBe(true);
    expect(state.phase).toBe('climbing');
    expect(state.outcome).toBeNull();
    expect(state.score).toBe(0);
  });

  it('shows the outcome directly when motion is reduced', () => {
    const state = createState();
    startRide(state);
    skipToOutcome(state, always(0.2));
    expect(state.phase).toBe('outcome');
    expect(state.outcome).toBe('ascend');
    expect(canRide(state)).toBe(true);
  });

  it('scatters the Behelit features before the crest and forms a face at it', () => {
    const scattered = behelitFeatures(0, 0);
    const face = behelitFeatures(1, 3);
    expect(face.leftEye.x).toBeLessThan(face.rightEye.x);
    expect(face.leftEye.y).toBe(face.rightEye.y);
    expect(face.nose.y).toBeLessThan(face.mouth.y);
    expect(face.leftEye.y).toBeLessThan(face.nose.y);
    expect(scattered.leftEye.x).toBeGreaterThan(scattered.rightEye.x);
    expect(scattered.mouth.y).toBeLessThan(scattered.leftEye.y);
  });
});
