import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

/** Seconds the car takes to climb the lift hill. */
export const CLIMB_SECONDS = 4;
/** Seconds the Behelit's features take to slide into a face at the crest. */
export const FORM_SECONDS = 1.2;
/** Seconds the crash or the eclipse takes to play out. */
export const OUTCOME_SECONDS = 3;
export const ASCEND_SCORE = 100;
export const CRASH_SCORE = 0;

const GROUND_Y = 440;
const LIFT_START = { x: 110, y: GROUND_Y - 22 } as const;
const CREST = { x: 470, y: 110 } as const;
const DROP_END = { x: 720, y: GROUND_Y - 22 } as const;
const SKY_END = { x: WIDTH + 40, y: -40 } as const;
const ECLIPSE = { x: 200, y: 120 } as const;

export type Outcome = 'crash' | 'ascend';

export interface Creature {
  name: string;
  title: string;
  description: string;
}

export const CREATURES: readonly Creature[] = [
  {
    name: 'Oculus',
    title: 'the Hand of Vigil',
    description: 'A towering figure in a tattered cloak, its body covered in unblinking eyes.',
  },
  {
    name: 'Morrow',
    title: 'the Hand of Ruin',
    description: 'A skeletal figure crowned with twisted coaster track, trailing smoke.',
  },
  {
    name: 'Hollow',
    title: 'the Hand of Hunger',
    description: 'A gaunt figure whose open, empty chest hums like a calliope.',
  },
  {
    name: 'Thorne',
    title: 'the Hand of Grief',
    description: 'A veiled figure with barbed, folded wings.',
  },
];

export interface CoasterState {
  /**
   * `ready` waits at the bottom of the hill, `climbing` goes up the lift hill,
   * `forming` is the face forming at the crest, and `outcome` plays the crash
   * or the eclipse.
   */
  phase: 'ready' | 'climbing' | 'forming' | 'outcome';
  /** How far up the lift hill the car is, 0 to 1. */
  climb: number;
  /** How far the Behelit's face has formed, 0 to 1. */
  form: number;
  /** Seconds since the outcome was decided. */
  after: number;
  /** Seconds since the ride started, for the Behelit's twitching. */
  time: number;
  outcome: Outcome | null;
  creature: Creature | null;
  score: number;
}

/** A ride is a coin flip: below 0.5 ascends, the rest crashes. */
export function rollOutcome(random: () => number): Outcome {
  return random() < 0.5 ? 'ascend' : 'crash';
}

/** Picks one of the four creatures, each with the same chance. */
export function pickCreature(random: () => number): Creature {
  const index = Math.min(Math.floor(random() * CREATURES.length), CREATURES.length - 1);
  return CREATURES[index];
}

export function scoreFor(outcome: Outcome): number {
  return outcome === 'ascend' ? ASCEND_SCORE : CRASH_SCORE;
}

export function createState(): CoasterState {
  return {
    phase: 'ready',
    climb: 0,
    form: 0,
    after: 0,
    time: 0,
    outcome: null,
    creature: null,
    score: 0,
  };
}

/** True once the outcome has finished playing, so the player can ride again. */
export function canRide(state: CoasterState): boolean {
  return state.phase === 'ready' || (state.phase === 'outcome' && state.after >= OUTCOME_SECONDS);
}

/** Starts a ride from the bottom of the hill. Returns false if a ride is under way. */
export function startRide(state: CoasterState): boolean {
  if (!canRide(state)) return false;
  Object.assign(state, createState(), { phase: 'climbing' });
  return true;
}

/** The crest: the face is formed and fate is decided. */
function decide(state: CoasterState, random: () => number): void {
  state.climb = 1;
  state.form = 1;
  state.after = 0;
  state.phase = 'outcome';
  state.outcome = rollOutcome(random);
  state.creature = state.outcome === 'ascend' ? pickCreature(random) : null;
  state.score = scoreFor(state.outcome);
}

/** Decides a ride at once, with the outcome already played out, for reduced motion. */
export function skipToOutcome(state: CoasterState, random: () => number): void {
  decide(state, random);
  state.after = OUTCOME_SECONDS;
}

/** Advances the ride by `dt` seconds. */
export function step(state: CoasterState, dt: number, random: () => number): void {
  if (state.phase === 'ready') return;
  state.time += dt;
  if (state.phase === 'climbing') {
    state.climb = Math.min(state.climb + dt / CLIMB_SECONDS, 1);
    if (state.climb === 1) state.phase = 'forming';
  } else if (state.phase === 'forming') {
    state.form = Math.min(state.form + dt / FORM_SECONDS, 1);
    if (state.form === 1) decide(state, random);
  } else {
    state.after = Math.min(state.after + dt, OUTCOME_SECONDS);
  }
}

export interface Feature {
  x: number;
  y: number;
  angle: number;
}

/** Where the features sit on a finished face, in units of the egg's half-width. */
const FACE = {
  leftEye: { x: -0.38, y: -0.25, angle: 0 },
  rightEye: { x: 0.38, y: -0.25, angle: 0 },
  nose: { x: 0, y: 0.12, angle: 0 },
  mouth: { x: 0, y: 0.55, angle: 0 },
};
/** Where they sit before the crest: scattered, out of place. */
const SCATTERED: typeof FACE = {
  leftEye: { x: 0.42, y: 0.62, angle: 1.9 },
  rightEye: { x: -0.5, y: -0.72, angle: -0.6 },
  nose: { x: 0.5, y: -0.4, angle: 2.4 },
  mouth: { x: -0.35, y: 0.15, angle: -1.2 },
};

/**
 * The Behelit's features. At `form` 0 they are scattered and drift with `time`;
 * at `form` 1 they make a face.
 */
export function behelitFeatures(form: number, time: number): Record<keyof typeof FACE, Feature> {
  const keys = Object.keys(FACE) as (keyof typeof FACE)[];
  return Object.fromEntries(
    keys.map((key, i) => {
      const from = SCATTERED[key];
      const to = FACE[key];
      const drift = (1 - form) * 0.08;
      return [
        key,
        {
          x: from.x + (to.x - from.x) * form + Math.sin(time * 5 + i * 2) * drift,
          y: from.y + (to.y - from.y) * form + Math.cos(time * 7 + i) * drift,
          angle: from.angle + (to.angle - from.angle) * form + Math.sin(time * 9 + i) * drift * 2,
        },
      ];
    }),
  ) as Record<keyof typeof FACE, Feature>;
}

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface BehelitLook {
  form: number;
  time: number;
  eyesOpen?: boolean;
  faceDown?: boolean;
}

function drawBehelit(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  angle: number,
  look: BehelitLook,
) {
  const { colors } = theme;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.fillStyle = colors.stripeA;
  ctx.strokeStyle = colors.background;
  ctx.lineWidth = Math.max(size * 0.08, 1.5);
  ctx.beginPath();
  ctx.ellipse(0, 0, size, size * 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = colors.danger;
  ctx.beginPath();
  ctx.ellipse(-size * 0.35, -size * 0.6, size * 0.22, size * 0.35, -0.4, 0, Math.PI * 2);
  ctx.fill();

  if (!look.faceDown) {
    const features = behelitFeatures(look.form, look.time);
    ctx.lineCap = 'round';
    for (const eye of [features.leftEye, features.rightEye]) {
      ctx.save();
      ctx.translate(eye.x * size, eye.y * size);
      ctx.rotate(eye.angle);
      if (look.eyesOpen) {
        ctx.fillStyle = colors.text;
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.22, size * 0.13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colors.background;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.08, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, -size * 0.12, size * 0.2, Math.PI * 0.2, Math.PI * 0.8);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(features.nose.x * size, features.nose.y * size);
    ctx.rotate(features.nose.angle);
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.15);
    ctx.lineTo(-size * 0.08, size * 0.08);
    ctx.lineTo(size * 0.08, size * 0.08);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(features.mouth.x * size, features.mouth.y * size);
    ctx.rotate(features.mouth.angle);
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, 0);
    ctx.quadraticCurveTo(0, size * 0.18, size * 0.3, 0);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  /** How the Behelit on the front looks, or null once it has tumbled out. */
  look: BehelitLook | null,
) {
  const { colors } = theme;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = colors.accent;
  ctx.fillRect(-30, -22, 60, 18);
  ctx.fillStyle = colors.background;
  for (const wheel of [-18, 18]) {
    ctx.beginPath();
    ctx.arc(wheel, -2, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (!look) return;
  // The Behelit rides upright on the front of the car.
  const fx = x + Math.cos(angle) * 22 - Math.sin(angle) * -38;
  const fy = y + Math.sin(angle) * 22 + Math.cos(angle) * -38;
  drawBehelit(ctx, fx, fy, 13, 0, look);
}

function drawTrack(ctx: CanvasRenderingContext2D, ascendReach: number | null) {
  const { colors } = theme;
  ctx.strokeStyle = colors.muted;
  ctx.lineWidth = 3;
  for (let i = 1; i < 8; i++) {
    const t = i / 8;
    const x = lerp(LIFT_START.x, CREST.x, t);
    ctx.beginPath();
    ctx.moveTo(x, lerp(LIFT_START.y, CREST.y, t));
    ctx.lineTo(x, GROUND_Y);
    ctx.stroke();
  }

  ctx.strokeStyle = colors.text;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(20, LIFT_START.y);
  ctx.lineTo(LIFT_START.x, LIFT_START.y);
  ctx.lineTo(CREST.x, CREST.y);
  if (ascendReach === null) {
    ctx.quadraticCurveTo(CREST.x + 90, CREST.y - 20, DROP_END.x, DROP_END.y);
    ctx.lineTo(WIDTH, DROP_END.y);
  } else {
    ctx.lineTo(lerp(CREST.x, SKY_END.x, ascendReach), lerp(CREST.y, SKY_END.y, ascendReach));
  }
  ctx.stroke();
}

function drawCreature(ctx: CanvasRenderingContext2D, creature: Creature, x: number, y: number) {
  const { colors } = theme;
  ctx.lineCap = 'round';
  if (creature.name === 'Oculus') {
    ctx.fillStyle = colors.surface;
    ctx.beginPath();
    ctx.moveTo(x, y - 200);
    ctx.lineTo(x - 70, y);
    ctx.lineTo(x - 50, y - 12);
    ctx.lineTo(x - 30, y);
    ctx.lineTo(x, y - 14);
    ctx.lineTo(x + 30, y);
    ctx.lineTo(x + 50, y - 12);
    ctx.lineTo(x + 70, y);
    ctx.closePath();
    ctx.fill();
    for (let row = 0; row < 5; row++) {
      for (let col = -row; col <= row; col += 2) {
        const ex = x + col * 12;
        const ey = y - 160 + row * 30;
        ctx.fillStyle = colors.text;
        ctx.beginPath();
        ctx.ellipse(ex, ey, 7, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colors.stripeA;
        ctx.beginPath();
        ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (creature.name === 'Morrow') {
    ctx.fillStyle = colors.muted;
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = 0.4 - i * 0.08;
      ctx.beginPath();
      ctx.arc(x - 40 - i * 22, y - 40 - i * 18, 16 + i * 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y - 145);
    ctx.lineTo(x, y - 50);
    ctx.moveTo(x, y - 50);
    ctx.lineTo(x - 22, y);
    ctx.moveTo(x, y - 50);
    ctx.lineTo(x + 22, y);
    ctx.moveTo(x - 40, y - 80);
    ctx.lineTo(x, y - 130);
    ctx.lineTo(x + 40, y - 80);
    for (let rib = 0; rib < 4; rib++) {
      ctx.moveTo(x - 18, y - 125 + rib * 16);
      ctx.lineTo(x + 18, y - 125 + rib * 16);
    }
    ctx.stroke();
    ctx.fillStyle = colors.text;
    ctx.beginPath();
    ctx.arc(x, y - 165, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.background;
    ctx.beginPath();
    ctx.arc(x - 7, y - 167, 5, 0, Math.PI * 2);
    ctx.arc(x + 7, y - 167, 5, 0, Math.PI * 2);
    ctx.fill();
    // A crown of twisted coaster track.
    ctx.strokeStyle = colors.wood;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const px = x - 28 + i * 7;
      const py = y - 190 - (i % 2 === 0 ? 0 : 16);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  } else if (creature.name === 'Hollow') {
    ctx.fillStyle = colors.muted;
    ctx.beginPath();
    ctx.moveTo(x - 30, y - 150);
    ctx.lineTo(x + 30, y - 150);
    ctx.lineTo(x + 20, y);
    ctx.lineTo(x - 20, y);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, y - 175, 16, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.background;
    ctx.beginPath();
    ctx.ellipse(x, y - 100, 18, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('body', 'bold');
    ctx.textAlign = 'center';
    ctx.fillText('♪', x + 50, y - 120);
    ctx.fillText('♫', x - 50, y - 90);
  } else {
    ctx.fillStyle = colors.background;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + side * 15, y - 150);
      for (let i = 1; i <= 5; i++) {
        ctx.lineTo(x + side * (15 + i * 18), y - 150 + i * 22 - (i % 2 === 0 ? 0 : 18));
      }
      ctx.lineTo(x + side * 20, y - 30);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = colors.muted;
    ctx.beginPath();
    ctx.moveTo(x, y - 200);
    ctx.lineTo(x - 40, y);
    ctx.lineTo(x + 40, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = colors.surface;
    ctx.beginPath();
    ctx.ellipse(x, y - 160, 14, 20, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number) {
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += theme.font.body * 1.4;
    } else {
      line = next;
    }
  }
  ctx.fillText(line, x, y);
}

function drawTitleScreen(ctx: CanvasRenderingContext2D, look: BehelitLook) {
  const { colors } = theme;
  ctx.fillStyle = colors.background;
  ctx.globalAlpha = 0.75;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.fillStyle = colors.accent;
  ctx.font = canvasFont('title', 'bold');
  ctx.fillText('Coaster of Causality', WIDTH / 2, 80);
  ctx.fillStyle = colors.muted;
  ctx.font = canvasFont('body');
  ctx.fillText('The Crimson Behelit, the Egg of the King, rides up front.', WIDTH / 2, 115);
  drawBehelit(ctx, WIDTH / 2, 250, 70, 0, look);
  ctx.fillStyle = colors.text;
  ctx.fillText('Press Space or click to ride. Half of all rides crash.', WIDTH / 2, 400);
}

function draw(ctx: CanvasRenderingContext2D, state: CoasterState, calm: boolean) {
  const { colors } = theme;
  const time = calm ? 0 : state.time;
  const t = clamp01(state.after / OUTCOME_SECONDS);
  const ascending = state.outcome === 'ascend';

  ctx.fillStyle = colors.surface;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (ascending) {
    // The sky darkens to a red eclipse with a black ring.
    const dark = clamp01(t / 0.5);
    ctx.globalAlpha = dark;
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = dark * 0.45;
    ctx.fillStyle = colors.stripeA;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = dark;
    ctx.fillStyle = colors.danger;
    ctx.beginPath();
    ctx.arc(ECLIPSE.x, ECLIPSE.y, 78, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.background;
    ctx.beginPath();
    ctx.arc(ECLIPSE.x, ECLIPSE.y, 66, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = colors.stripeA;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ECLIPSE.x, ECLIPSE.y, 58, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = colors.wood;
  ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);

  const reach = clamp01(t / 0.5);
  drawTrack(ctx, ascending ? reach : null);

  const liftAngle = Math.atan2(CREST.y - LIFT_START.y, CREST.x - LIFT_START.x);
  const look: BehelitLook = { form: state.form, time };

  if (state.phase !== 'outcome') {
    const x = lerp(LIFT_START.x, CREST.x, state.climb);
    const y = lerp(LIFT_START.y, CREST.y, state.climb);
    drawCar(ctx, x, y, state.climb === 1 ? 0 : liftAngle, look);
  } else if (ascending && state.creature) {
    const skyAngle = Math.atan2(SKY_END.y - CREST.y, SKY_END.x - CREST.x);
    const along = reach * 0.5;
    drawCar(ctx, lerp(CREST.x, SKY_END.x, along), lerp(CREST.y, SKY_END.y, along), skyAngle, {
      ...look,
      eyesOpen: true,
    });

    const reveal = clamp01((t - 0.5) / 0.4);
    ctx.globalAlpha = reveal;
    drawCreature(ctx, state.creature, ECLIPSE.x, GROUND_Y - 10);
    ctx.textAlign = 'left';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(state.creature.name, 360, 230);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body', 'bold');
    ctx.fillText(`${state.creature.title}, fifth of the God Hand`, 360, 262);
    ctx.font = canvasFont('body');
    wrapText(ctx, state.creature.description, 360, 296, WIDTH - 390);
    ctx.globalAlpha = 1;
  } else {
    // The car flies off the track and nose-dives into the ground.
    const dive = clamp01(t / 0.45);
    const fall = GROUND_Y - CREST.y + 120;
    const carX = CREST.x + 200 * dive;
    const carY = CREST.y - 120 * dive + fall * dive * dive;
    const carAngle = Math.atan2(-120 + 2 * fall * dive, 200);
    drawCar(ctx, carX, carY, carAngle, dive < 1 ? look : null);

    if (dive === 1) {
      const tumble = clamp01((t - 0.45) / 0.35);
      const bx = carX + 20 + 110 * tumble;
      const by = GROUND_Y - 60 - 120 * Math.sin(Math.PI * tumble) + 46 * tumble;
      drawBehelit(ctx, bx, by, 13, tumble * Math.PI * 3.5, {
        ...look,
        faceDown: tumble === 1,
      });

      const dust = clamp01((t - 0.45) / 0.4);
      ctx.fillStyle = colors.muted;
      ctx.globalAlpha = 0.75 - dust * 0.25;
      for (let i = 0; i < 6; i++) {
        const angle = Math.PI + (i / 5) * Math.PI;
        const r = 10 + dust * 40;
        ctx.beginPath();
        ctx.arc(
          carX + Math.cos(angle) * r * 1.6,
          GROUND_Y + Math.sin(angle) * r * 0.6,
          12 + dust * 14,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.textAlign = 'center';
      ctx.fillStyle = colors.danger;
      ctx.font = canvasFont('title', 'bold');
      ctx.fillText('CRASHED', WIDTH / 2, 70);
    }
  }

  if (state.phase === 'ready') {
    drawTitleScreen(ctx, look);
  } else if (canRide(state)) {
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body', 'bold');
    ctx.fillText(
      `Score ${state.score}. Press Space or click to ride again.`,
      WIDTH / 2,
      HEIGHT - 22,
    );
  }
}

export const coasterOfCausality: CarnivalGame = {
  id: 'coaster-of-causality',
  name: 'Coaster of Causality',
  description:
    'Ride the Crimson Behelit up one tall hill: half the rides crash, half ascend to the God Hand.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const state = createState();
    let scoreRecorded = false;

    const ride = () => {
      if (!startRide(state)) return;
      scoreRecorded = false;
      if (calm) skipToOutcome(state, Math.random);
    };
    const onDown = () => ride();
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      event.preventDefault();
      ride();
    };
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't skip the climb.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt, Math.random);
      if (state.phase === 'outcome' && !scoreRecorded) {
        recordScore(coasterOfCausality.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, calm);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  },
};

export default coasterOfCausality;
