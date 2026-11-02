# Coaster of Causality

A pure 50/50 coaster ride, in honour of RollerCoaster Tycoon's crashing
coasters and Berserk's God Hand. Its theme is the **Crimson Behelit, the Egg
of the King**.

## How to play

- Press Space, or click, to start the ride. The car climbs one tall lift hill.
- At the crest, fate decides the ride: it crashes or it ascends.
- When the outcome has played out, press Space or click to ride again. Each
  ride is one round.

## The Crimson Behelit

A red egg sits on the front of the car for the whole ride, with its eyes, nose
and mouth scattered across it out of place. It shows on the start screen with
the game's title. As the car climbs, its features twitch and drift. At the
crest they slide together into a full face, and that is the moment the
outcome is decided.

## The odds

Every ride is a coin flip: 50% crash, 50% ascend. Nothing the player does
changes the odds.

- **Crash:** the car flies off the track and nose-dives into the ground with a
  cartoon dust cloud and a "CRASHED" message. The Behelit tumbles out and
  lands face-down in the dust.
- **Ascend:** the Behelit opens its eyes, the track keeps climbing into the
  sky, and the sky darkens to a red eclipse with a black ring. The rider is
  reborn as the fifth member of the God Hand, picked at random with equal
  chance from these four:

| Creature | Title              | Description                                                                 |
| -------- | ------------------ | --------------------------------------------------------------------------- |
| Oculus   | the Hand of Vigil  | A towering figure in a tattered cloak, its body covered in unblinking eyes. |
| Morrow   | the Hand of Ruin   | A skeletal figure crowned with twisted coaster track, trailing smoke.       |
| Hollow   | the Hand of Hunger | A gaunt figure whose open, empty chest hums like a calliope.                |
| Thorne   | the Hand of Grief  | A veiled figure with barbed, folded wings.                                  |

## Scoring

| Outcome | Points |
| ------- | ------ |
| Ascend  | 100    |
| Crash   | 0      |

The score is saved to the carnival's score board once, when the outcome is
decided at the crest.

## Reduced motion

With `prefers-reduced-motion: reduce`, the game skips the climb, the drifting
features and the dive, and shows the outcome directly.

## Files

- `game.ts`: the game logic (`createState`, `startRide`, `step`, `rollOutcome`,
  `pickCreature`, `scoreFor`, `behelitFeatures`) and the `coasterOfCausality`
  entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
