import type { Exercise, ExerciseTier, MuscleGroup, MovementPattern, Equipment } from '../types'

/**
 * Exercise library — transcribed from `reference/exercise-library.md`.
 *
 * Every cue, error/fix pair and substitution below is taken from that document;
 * `source` records which file each entry came from so the app can link back to
 * the original prose. Nothing here is invented to pad the list.
 */

const SRC = {
  library: 'reference/exercise-library.md',
  warmup: 'reference/warmup-and-cooldown.md',
  home: 'programs/home-minimal-equipment.md',
  beginner: 'programs/beginner-full-body-3day.md',
  intermediate: 'programs/intermediate-upper-lower-4day.md',
} as const

/** Rough working time of one set, excluding rest. Feeds session-length estimates. */
const SET_SECONDS: Record<ExerciseTier, number> = {
  compound: 28,
  accessory: 32,
  isolation: 34,
  core: 38,
  conditioning: 300,
}

const XP: Record<ExerciseTier, number> = {
  compound: 12,
  accessory: 9,
  isolation: 7,
  core: 6,
  conditioning: 8,
}

type Draft = Omit<Exercise, 'estSetSeconds' | 'xpPerSet'> & Partial<Pick<Exercise, 'estSetSeconds' | 'xpPerSet'>>

const ex = (d: Draft): Exercise => ({
  ...d,
  xpPerSet: d.xpPerSet ?? XP[d.tier],
  estSetSeconds: d.estSetSeconds ?? SET_SECONDS[d.tier],
})

/* ------------------------------------------------------------------ *
 * Squat pattern
 * ------------------------------------------------------------------ */

const squats: Exercise[] = [
  ex({
    id: 'back-squat',
    name: 'Back Squat',
    pattern: 'squat',
    muscles: ['quads', 'glutes'],
    secondary: ['core', 'adductors', 'hamstrings'],
    equipment: ['barbell'],
    tier: 'compound',
    unit: 'reps',
    setup:
      'Bar on the upper traps (high bar) or the rear delts (low bar). Feet roughly shoulder-width, toes out 10–30°. Big breath into the belly, brace hard, unrack, walk out in three steps.',
    cues: ['Spread the floor apart with your feet', 'Chest up — but hips and shoulders rise together'],
    depth:
      'Crease of the hip below the top of the knee, if you can do it without the lower back rounding or the heels lifting. Depth you control beats depth you fake.',
    commonErrors: [
      { error: 'Knees cave inward', fix: 'Push the knees out over the middle of the foot; drop the weight' },
      {
        error: 'Hips shoot up first ("good morning squat")',
        fix: 'Brace harder, think "chest up", and spend a few weeks on pause squats',
      },
      {
        error: 'Heels lift off the floor',
        fix: 'Ankle mobility — widen the stance, turn the toes out, or use a small heel wedge',
      },
      { error: 'Rounding in the lower back', fix: 'Stop the set. Reduce depth to where you stay braced, then rebuild' },
      { error: 'Bar rolls forward', fix: 'Squeeze the upper back hard before unracking; elbows under the bar' },
    ],
    substitutions: ['front-squat', 'goblet-squat', 'leg-press', 'bulgarian-split-squat', 'box-squat'],
    notes: 'Ramp up properly — see the warm-up doc. Never grind to failure on this lift.',
    source: SRC.library,
  }),
  ex({
    id: 'front-squat',
    name: 'Front Squat',
    pattern: 'squat',
    muscles: ['quads', 'glutes'],
    secondary: ['core', 'upper-back'],
    equipment: ['barbell'],
    tier: 'compound',
    unit: 'reps',
    setup: 'Bar on the front delts, elbows high, fingertips under the bar.',
    cues: ['Elbows high the whole rep', 'Brace the belly — the rack position punishes a loose torso'],
    commonErrors: [
      { error: 'Elbows drop, bar rolls forward', fix: 'Drive the elbows up; if wrists are the limiter, cross the arms over the bar' },
      { error: 'Torso pitches forward', fix: 'Forces an upright torso by design — if you pitch, the load is too heavy' },
    ],
    substitutions: ['back-squat', 'goblet-squat', 'leg-press'],
    notes: 'Far less lower-back stress than the back squat. A legitimate main lift in its own right.',
    source: SRC.library,
  }),
  ex({
    id: 'goblet-squat',
    name: 'Goblet Squat',
    pattern: 'squat',
    muscles: ['quads', 'glutes'],
    secondary: ['core', 'upper-back'],
    equipment: ['dumbbell', 'kettlebell'],
    tier: 'compound',
    unit: 'reps',
    setup: 'Hold a dumbbell or kettlebell at the chest, elbows tucked.',
    cues: ['Elbows inside the knees at the bottom', 'Sit down between the hips, not behind them'],
    commonErrors: [
      { error: 'Leaning forward as you descend', fix: 'The front load makes this hard to do — keep the chest tall and the elbows tucked' },
      { error: 'Cutting depth short', fix: 'Go to the depth your hips allow while the torso stays upright' },
    ],
    substitutions: ['back-squat', 'front-squat', 'box-squat', 'leg-press'],
    notes: 'Excellent for learning depth and for ramp-up sets.',
    source: SRC.library,
  }),
  ex({
    id: 'leg-press',
    name: 'Leg Press',
    pattern: 'squat',
    muscles: ['quads', 'glutes'],
    secondary: ['hamstrings', 'adductors'],
    equipment: ['machine'],
    tier: 'compound',
    unit: 'reps',
    setup: 'Feet shoulder-width, mid-platform. Back and hips flat against the pad throughout.',
    cues: ['Lower until the hips just start to tuck, no further', 'Push through the whole foot, not just the toes'],
    commonErrors: [
      { error: 'Hips lift off the pad at the bottom', fix: 'Reduce depth — that is your lower back rounding under load' },
      { error: 'Locking the knees hard at the top', fix: 'Stop just short of lockout to keep tension on the quads' },
    ],
    substitutions: ['back-squat', 'goblet-squat', 'bulgarian-split-squat', 'box-squat'],
    notes: 'Safe to take close to failure — no bar can fall on you. Good substitute when the back is tired.',
    source: SRC.library,
  }),
  ex({
    id: 'box-squat',
    name: 'Box / Chair Squat',
    pattern: 'squat',
    muscles: ['quads', 'glutes'],
    secondary: ['core'],
    equipment: ['bodyweight', 'none'],
    tier: 'accessory',
    unit: 'reps',
    setup: 'Stand in front of a box, chair or bench. Sit back and down until the glutes touch, then stand.',
    cues: ['Touch lightly — do not relax onto the box', 'Shins stay near vertical'],
    commonErrors: [
      { error: 'Collapsing onto the box', fix: 'Touch and go; the box is a depth reference, not a seat' },
      { error: 'Knees travelling far past the toes', fix: 'Push the hips back first' },
    ],
    substitutions: ['goblet-squat', 'back-squat', 'pistol-squat'],
    notes: 'Rung 1 of the home squat ladder. Lower the surface to make it harder.',
    source: SRC.home,
  }),
  ex({
    id: 'pistol-squat',
    name: 'Pistol Squat',
    pattern: 'unilateral-leg',
    muscles: ['quads', 'glutes'],
    secondary: ['core', 'adductors'],
    equipment: ['bodyweight'],
    tier: 'accessory',
    unit: 'reps',
    perSide: true,
    setup: 'Stand on one leg, arms out front for counterbalance. Sit back and down, other leg extended forward.',
    cues: ['Heel stays planted', 'Chest up — lean forward from the hips, not by rounding the back'],
    commonErrors: [
      { error: 'Heel lifts', fix: 'Ankle mobility is usually the limiter; hold a doorframe and work the depth first' },
      { error: 'Knee caves inward', fix: 'Actively push the knee out over the second toe' },
    ],
    substitutions: ['box-squat', 'bulgarian-split-squat', 'goblet-squat'],
    notes: 'Top rung of the bodyweight squat ladder. Use a doorframe or band for assistance on the way there.',
    source: SRC.home,
    advanced: true,
    unlockId: 'variation-pistol-squat',
  }),
]

/* ------------------------------------------------------------------ *
 * Hinge pattern
 * ------------------------------------------------------------------ */

const hinges: Exercise[] = [
  ex({
    id: 'romanian-deadlift',
    name: 'Romanian Deadlift',
    short: 'RDL',
    pattern: 'hinge',
    muscles: ['hamstrings', 'glutes'],
    secondary: ['upper-back', 'core', 'forearms'],
    equipment: ['barbell', 'dumbbell', 'band'],
    tier: 'compound',
    unit: 'reps',
    setup: 'Start standing with the bar at the hips, not on the floor. Soft knees — they bend slightly and stay there.',
    cues: [
      'Push the hips back like you are closing a car door with your backside',
      'The bar travels down the thighs, never away from the body',
    ],
    depth: 'Most people\u2019s RDL ends just below the knee. Depth is limited by the hamstrings, not by ambition.',
    commonErrors: [
      {
        error: 'Squatting instead of hinging',
        fix: 'Keep the shins vertical — the movement is horizontal hip travel, not vertical knee bend',
      },
      { error: 'Rounding the back', fix: 'Stop where the hips stop travelling back; that is your depth' },
      { error: 'Bar drifts forward', fix: 'Drag it down the thighs; squeeze the lats ("bend the bar around the legs")' },
      { error: 'Going too deep and losing the back', fix: 'Cut the range; the stretch, not the floor, is the stimulus' },
    ],
    substitutions: ['stiff-leg-deadlift', 'good-morning', 'single-leg-rdl', 'back-extension', 'hip-thrust'],
    source: SRC.library,
  }),
  ex({
    id: 'conventional-deadlift',
    name: 'Deadlift',
    pattern: 'hinge',
    muscles: ['glutes', 'hamstrings', 'upper-back'],
    secondary: ['quads', 'traps', 'core', 'forearms'],
    equipment: ['barbell'],
    tier: 'compound',
    unit: 'reps',
    setup:
      'Bar over the mid-foot. Shins almost touching the bar. Hips higher than a squat, lower than an RDL. Lats tight, slack pulled out of the bar before you push.',
    cues: ['Push the floor away — it is a leg press with a bar in your hands', 'Lock the lats before the bar moves'],
    commonErrors: [
      { error: 'Bar swings away from the shins', fix: 'Start over mid-foot and keep the bar in contact the whole lift' },
      { error: 'Jerking the bar', fix: 'Take the slack out first — feel tension before the plates leave the floor' },
      { error: 'Hips rise first', fix: 'Lower the hips, re-grip the floor with the feet, then push' },
      { error: 'Rounding under load', fix: 'Lighter. This is a back injury, not a grind to be proud of' },
    ],
    substitutions: ['trap-bar-deadlift', 'romanian-deadlift'],
    notes: 'Volume is deliberately low in every programme here — two to three hard sets is plenty.',
    source: SRC.library,
  }),
  ex({
    id: 'trap-bar-deadlift',
    name: 'Trap-Bar Deadlift',
    pattern: 'hinge',
    muscles: ['glutes', 'quads', 'hamstrings'],
    secondary: ['upper-back', 'traps', 'forearms'],
    equipment: ['trap-bar'],
    tier: 'compound',
    unit: 'reps',
    setup: 'Step inside the hex bar, handles at your sides. Brace, then drive the floor away.',
    cues: ['Chest up, shoulders slightly in front of the bar', 'Push rather than pull'],
    commonErrors: [
      { error: 'Squatting it too upright', fix: 'Hinge a little more to keep the hamstrings involved' },
      { error: 'Rushing the lockout', fix: 'Finish by squeezing the glutes, not by leaning back' },
    ],
    substitutions: ['conventional-deadlift', 'romanian-deadlift'],
    notes:
      'Sits the load closer to your centre of mass, so it is kinder to the lower back and easier to learn. A completely legitimate main lift, not a cheat.',
    source: SRC.library,
  }),
  ex({
    id: 'stiff-leg-deadlift',
    name: 'Stiff-Leg Deadlift',
    pattern: 'hinge',
    muscles: ['hamstrings', 'glutes'],
    secondary: ['upper-back', 'core'],
    equipment: ['barbell', 'dumbbell'],
    tier: 'compound',
    unit: 'reps',
    setup: 'Near-straight knees, bar starting from the floor or blocks. Hinge at the hips with a flat back.',
    cues: ['Knees soft but fixed — they do not bend during the rep', 'Bar stays in contact with the legs'],
    commonErrors: [
      { error: 'Rounding to reach the floor', fix: 'Stop at the depth your hamstrings allow; use blocks' },
      { error: 'Bending the knees into a squat', fix: 'Lock the knee angle at the start and hold it' },
    ],
    substitutions: ['romanian-deadlift', 'good-morning', 'single-leg-rdl'],
    notes: 'Longer range and a bigger hamstring stretch than an RDL, at a lower load.',
    source: SRC.library,
  }),
  ex({
    id: 'good-morning',
    name: 'Good Morning',
    pattern: 'hinge',
    muscles: ['hamstrings', 'glutes'],
    secondary: ['upper-back', 'core'],
    equipment: ['barbell', 'band'],
    tier: 'accessory',
    unit: 'reps',
    setup: 'Bar on the back as for a squat. Soft knees, hinge forward from the hips until the torso is near parallel.',
    cues: ['Hips travel back, torso folds forward', 'Keep the back braced and flat the whole way'],
    commonErrors: [
      { error: 'Rounding the upper or lower back', fix: 'Lighter, and cut the range until the spine stays neutral' },
      { error: 'Turning it into a squat', fix: 'Knees barely bend — this is hip travel, not knee travel' },
    ],
    substitutions: ['romanian-deadlift', 'stiff-leg-deadlift', 'back-extension'],
    notes: 'Effective and unforgiving. Load it conservatively and never grind a rep.',
    source: SRC.library,
  }),
  ex({
    id: 'hip-thrust',
    name: 'Hip Thrust',
    pattern: 'hinge',
    muscles: ['glutes'],
    secondary: ['hamstrings', 'core'],
    equipment: ['barbell', 'machine', 'bodyweight'],
    tier: 'compound',
    unit: 'reps',
    setup: 'Upper back on a bench, bar across the hips (use a pad), feet flat, drive through the heels.',
    cues: ['Squeeze the glutes at the top', 'Ribs down — do not arch the lower back to finish the rep'],
    commonErrors: [
      { error: 'Overextending the lower back at lockout', fix: 'Posteriorly tilt the pelvis; stop when the body is straight' },
      { error: 'Feet too far forward or back', fix: 'Shins should be vertical at the top of the thrust' },
      { error: 'Chin lifted, looking up', fix: 'Tuck the chin and keep the gaze forward-down' },
    ],
    substitutions: ['glute-bridge', 'back-extension', 'romanian-deadlift'],
    source: SRC.library,
  }),
  ex({
    id: 'glute-bridge',
    name: 'Glute Bridge',
    pattern: 'hinge',
    muscles: ['glutes'],
    secondary: ['hamstrings', 'core'],
    equipment: ['bodyweight', 'band'],
    tier: 'accessory',
    unit: 'reps',
    setup: 'Lie on your back, knees bent, feet flat. Drive the hips up until shoulders, hips and knees are in line.',
    cues: ['Squeeze the glutes hard at the top — hold 1–3 s', 'Push through the heels, not the toes'],
    commonErrors: [
      { error: 'Arching the lower back to get higher', fix: 'Stop at the point the glutes stop doing the work' },
      { error: 'Quads taking over', fix: 'Bring the feet slightly closer and think "hips up", not "knees forward"' },
    ],
    substitutions: ['hip-thrust', 'single-leg-rdl', 'back-extension'],
    notes: 'Rung 1 of the home hinge ladder. Add a 3 s hold at the top before progressing to one leg.',
    source: SRC.home,
  }),
  ex({
    id: 'back-extension',
    name: '45° Back Extension',
    pattern: 'hinge',
    muscles: ['glutes', 'hamstrings'],
    secondary: ['upper-back', 'core'],
    equipment: ['machine', 'bodyweight'],
    tier: 'accessory',
    unit: 'reps',
    setup: 'Hips on the pad, feet secured, torso free to fold. Cross the arms or hold a plate at the chest.',
    cues: ['Hinge at the hips, not by rounding the spine', 'Finish by squeezing the glutes, not by hyperextending'],
    commonErrors: [
      { error: 'Rounding the back on the way down', fix: 'Keep a neutral spine; the range comes from the hips' },
      { error: 'Overextending at the top', fix: 'Stop when the body is straight' },
    ],
    substitutions: ['romanian-deadlift', 'hip-thrust', 'glute-bridge', 'good-morning'],
    notes: 'A safe, low-spinal-load hinge — a good deadlift substitute when the back is fatigued.',
    source: SRC.library,
  }),
  ex({
    id: 'single-leg-rdl',
    name: 'Single-Leg RDL',
    pattern: 'hinge',
    muscles: ['hamstrings', 'glutes'],
    secondary: ['core', 'calves'],
    equipment: ['bodyweight', 'dumbbell', 'kettlebell', 'band'],
    tier: 'accessory',
    unit: 'reps',
    perSide: true,
    setup: 'Stand on one leg. Hinge forward while the other leg extends straight back behind you.',
    cues: ['Hips stay square to the floor — do not let one rotate up', 'Push the floor away with the standing heel'],
    commonErrors: [
      { error: 'Hip rotating open', fix: 'Point both hip bones at the floor; reduce the load until you can' },
      { error: 'Rounding the back to reach down', fix: 'Range is set by the hamstring, not the floor' },
      { error: 'Losing balance and turning it into a wobble contest', fix: 'Hold a wall. Balance is not the point' },
    ],
    substitutions: ['romanian-deadlift', 'stiff-leg-deadlift', 'glute-bridge'],
    notes: 'Hamstrings, glutes and ankle stability in one. Start unweighted.',
    source: SRC.library,
  }),
  ex({
    id: 'leg-curl',
    name: 'Leg Curl',
    pattern: 'isolation',
    muscles: ['hamstrings'],
    secondary: ['calves', 'glutes'],
    equipment: ['machine'],
    tier: 'isolation',
    unit: 'reps',
    setup:
      'Seated or lying. Pad against the lower calf, just above the heel. Hips pressed into the seat, torso still.',
    cues: ['Curl all the way in, pause one beat', 'Lower over 2–3 seconds — do not let the stack drop'],
    commonErrors: [
      { error: 'Hips lifting off the pad (lying version)', fix: 'Press the hips down; the range comes from the knee' },
      { error: 'Using momentum to start the rep', fix: 'Reduce the load; a controlled 12 beats a heaved 8' },
      { error: 'Short range', fix: 'Full extension at the bottom, heels toward the glutes at the top' },
    ],
    substitutions: ['nordic-curl', 'single-leg-rdl', 'romanian-deadlift', 'stiff-leg-deadlift'],
    notes:
      'The seated version trains the hamstrings at a longer muscle length and is generally the better choice when both are available.',
    source: SRC.library,
  }),
  ex({
    id: 'nordic-curl',
    name: 'Nordic Curl (Negative)',
    pattern: 'hinge',
    muscles: ['hamstrings'],
    secondary: ['glutes', 'core', 'calves'],
    equipment: ['bodyweight', 'band'],
    tier: 'accessory',
    unit: 'reps',
    setup: 'Kneel with the ankles secured. Keep the body straight from knee to head and lower as slowly as possible.',
    cues: ['Hinge at the knees, not the hips', 'Lower over 5+ seconds; push back up with the hands if needed'],
    commonErrors: [
      { error: 'Hinging at the hips to shorten the range', fix: 'Hips stay locked in line with the knees' },
      { error: 'Dropping fast', fix: 'The eccentric is the entire exercise — slow it down' },
    ],
    substitutions: ['romanian-deadlift', 'single-leg-rdl', 'glute-bridge'],
    notes: 'Very demanding. Build to it with band assistance and partial range.',
    source: SRC.home,
    advanced: true,
    unlockId: 'variation-nordic-curl',
  }),
]

/* ------------------------------------------------------------------ *
 * Horizontal push
 * ------------------------------------------------------------------ */

const pushHorizontal: Exercise[] = [
  ex({
    id: 'bench-press',
    name: 'Bench Press',
    pattern: 'push-horizontal',
    muscles: ['chest'],
    secondary: ['triceps', 'shoulders'],
    equipment: ['barbell'],
    tier: 'compound',
    unit: 'reps',
    setup:
      'Eyes under the bar. Feet planted, slight arch, shoulder blades pulled back and down and held there for the whole set. Grip just outside shoulder width — forearms vertical at the bottom.',
    cues: ['Bend the bar in half (engages the lats, tucks the elbows)', 'Push yourself away from the bar'],
    commonErrors: [
      {
        error: 'Elbows flared to 90°',
        fix: 'Tuck to roughly 45–70° from the torso — this is the number-one shoulder-injury cause',
      },
      { error: 'Bar lands on the neck or the belly', fix: 'Touch at the lower chest / top of the ribs' },
      { error: 'Wrists bent back', fix: 'Bar sits on the heel of the palm, directly over the forearm' },
      { error: 'Butt lifts off the bench', fix: 'Feet further under you, or lower the weight' },
      { error: 'Bouncing off the chest', fix: 'Controlled touch, then press. A bounce trains nothing' },
    ],
    substitutions: ['db-bench-press', 'incline-db-press', 'machine-chest-press', 'close-grip-bench', 'push-up'],
    notes: 'Always use a spotter, safety pins, or dumbbells when training alone.',
    source: SRC.library,
  }),
  ex({
    id: 'db-bench-press',
    name: 'Dumbbell Bench Press',
    pattern: 'push-horizontal',
    muscles: ['chest'],
    secondary: ['triceps', 'shoulders'],
    equipment: ['dumbbell'],
    tier: 'compound',
    unit: 'reps',
    setup: 'Shoulder blades back and down, feet planted. Dumbbells start over the shoulders, press to just short of touching.',
    cues: ['Wrists stacked over the elbows', 'Let the dumbbells drift slightly together at the top, not clash'],
    commonErrors: [
      { error: 'Elbows flaring wide', fix: 'Same 45–70° tuck as the barbell bench' },
      { error: 'Uneven pressing / one side leading', fix: 'Reduce the weight; the imbalance is the useful information' },
    ],
    substitutions: ['bench-press', 'incline-db-press', 'machine-chest-press'],
    notes: 'Bigger range of motion and no bar to get pinned under — the safest hard press when training alone.',
    source: SRC.library,
  }),
  ex({
    id: 'incline-db-press',
    name: 'Incline Dumbbell Press',
    pattern: 'push-horizontal',
    muscles: ['chest', 'shoulders'],
    secondary: ['triceps'],
    equipment: ['dumbbell'],
    tier: 'compound',
    unit: 'reps',
    setup: 'Bench at 30° — not 45°, which shifts the work onto the front delts.',
    cues: ['Elbows under the wrists', 'Lower until you feel a real stretch across the upper chest'],
    commonErrors: [
      { error: 'Bench too steep', fix: '30° keeps it a chest exercise' },
      { error: 'Flaring the elbows', fix: 'Tuck to about 45° from the torso' },
    ],
    substitutions: ['bench-press', 'db-bench-press', 'machine-chest-press', 'push-up'],
    notes: 'Great bench alternative and generally easier on the shoulders.',
    source: SRC.library,
  }),
  ex({
    id: 'close-grip-bench',
    name: 'Close-Grip Bench Press',
    pattern: 'push-horizontal',
    muscles: ['triceps', 'chest'],
    secondary: ['shoulders'],
    equipment: ['barbell'],
    tier: 'compound',
    unit: 'reps',
    setup: 'Grip roughly shoulder-width — narrower than that hurts the wrists without adding triceps work.',
    cues: ['Elbows brush the ribs on the way down', 'Bar touches lower on the chest than a wide-grip bench'],
    commonErrors: [
      { error: 'Grip too narrow', fix: 'Shoulder width is enough; narrower just loads the wrists' },
      { error: 'Elbows flaring', fix: 'Keep them tight — that is what makes it a triceps lift' },
    ],
    substitutions: ['bench-press', 'rope-pushdown', 'overhead-cable-extension'],
    notes: 'A standard bench rotation that shifts emphasis onto the triceps.',
    source: SRC.intermediate,
  }),
  ex({
    id: 'machine-chest-press',
    name: 'Machine Chest Press',
    pattern: 'push-horizontal',
    muscles: ['chest'],
    secondary: ['triceps', 'shoulders'],
    equipment: ['machine'],
    tier: 'accessory',
    unit: 'reps',
    setup: 'Seat height so the handles line up with mid-chest. Shoulder blades back and down.',
    cues: ['Press in an arc, not a straight line', 'Control the return — do not let the stack slam'],
    commonErrors: [
      { error: 'Seat too high or low', fix: 'Handles should cross mid-chest, not the shoulders or the ribs' },
      { error: 'Shrugging the shoulders up', fix: 'Press the shoulder blades down and back first' },
    ],
    substitutions: ['bench-press', 'db-bench-press', 'push-up', 'pec-deck'],
    notes: 'Safe to train to failure — nothing can fall on you.',
    source: SRC.library,
  }),
  ex({
    id: 'push-up',
    name: 'Push-Up',
    pattern: 'push-horizontal',
    muscles: ['chest'],
    secondary: ['triceps', 'shoulders', 'core'],
    equipment: ['bodyweight'],
    tier: 'accessory',
    unit: 'reps',
    setup: 'Hands under the shoulders, body in one straight line, glutes and abs tight, elbows at about 45°.',
    cues: ['Chest to the floor, not chin to the floor', 'Push the floor apart to spread the shoulder blades'],
    commonErrors: [
      { error: 'Hips sagging', fix: 'Squeeze the glutes and brace the abs — it is a moving plank' },
      { error: 'Hips piking up', fix: 'Same cue; the body should be one rigid line' },
      { error: 'Half reps', fix: 'Full range: chest down, elbows locked out at the top' },
      { error: 'Elbows flared to 90°', fix: 'Tuck to about 45°' },
    ],
    substitutions: ['archer-push-up', 'bench-press', 'db-bench-press', 'machine-chest-press'],
    notes:
      'Progression ladder: wall → incline → knee → standard → feet-elevated → slow tempo / 1.5 reps → archer → pseudo-planche → one-arm.',
    source: SRC.home,
  }),
  ex({
    id: 'archer-push-up',
    name: 'Archer Push-Up',
    pattern: 'push-horizontal',
    muscles: ['chest'],
    secondary: ['triceps', 'shoulders', 'core'],
    equipment: ['bodyweight'],
    tier: 'accessory',
    unit: 'reps',
    perSide: true,
    setup: 'Wide hand placement. Lower toward one hand while the other stays straight, then switch.',
    cues: ['Keep the assisting arm straight — the working arm does the pressing', 'Hips stay level, do not rotate'],
    commonErrors: [
      { error: 'Turning it into a leaning push-up', fix: 'The straight arm should take as little load as possible' },
      { error: 'Hips rotating', fix: 'Brace the core and keep both hip bones facing the floor' },
    ],
    substitutions: ['push-up', 'db-bench-press', 'bench-press'],
    notes: 'Rung 7 of the push-up ladder — a genuine step toward one-arm work.',
    source: SRC.home,
    advanced: true,
    unlockId: 'variation-archer-push-up',
  }),
  ex({
    id: 'pec-deck',
    name: 'Pec Deck / Cable Fly',
    pattern: 'push-horizontal',
    muscles: ['chest'],
    secondary: ['shoulders'],
    equipment: ['machine', 'cable'],
    tier: 'isolation',
    unit: 'reps',
    setup: 'Seat so the handles are at chest height. Slight, fixed bend in the elbows throughout.',
    cues: ['Stretch at the bottom, squeeze at the top', 'The elbow angle never changes — this is not a press'],
    commonErrors: [
      { error: 'Turning it into a press', fix: 'Lock the elbow angle; move only at the shoulder' },
      { error: 'Overstretching with heavy load', fix: 'Stop at the point the chest, not the shoulder joint, is stretched' },
    ],
    substitutions: ['db-bench-press', 'push-up', 'machine-chest-press'],
    source: SRC.library,
  }),
]

/* ------------------------------------------------------------------ *
 * Vertical push
 * ------------------------------------------------------------------ */

const pushVertical: Exercise[] = [
  ex({
    id: 'overhead-press',
    name: 'Overhead Press',
    short: 'OHP',
    pattern: 'push-vertical',
    muscles: ['shoulders'],
    secondary: ['triceps', 'core', 'upper-back'],
    equipment: ['barbell'],
    tier: 'compound',
    unit: 'reps',
    setup:
      'Bar in the front-rack position, resting on the front delts. Grip just outside the shoulders. Squeeze the glutes and brace the abs — this stops you arching the lower back.',
    cues: ['Push your head through — ears finish between the biceps', 'Glutes and abs tight the whole time'],
    commonErrors: [
      { error: 'Leaning back into a standing incline press', fix: 'Squeeze the glutes, tuck the ribs, reduce the load' },
      { error: 'Bar loops around the face', fix: 'Press up and slightly back so the bar finishes over the mid-foot' },
      { error: 'Excessive leg drive', fix: 'That is a push press — fine as its own lift, but do not call it OHP' },
      { error: 'Wrists folded back', fix: 'Knuckles to the ceiling, bar stacked over the forearm' },
    ],
    substitutions: ['seated-db-press', 'push-press', 'landmine-press', 'pike-push-up'],
    source: SRC.library,
  }),
  ex({
    id: 'seated-db-press',
    name: 'Seated Dumbbell Press',
    pattern: 'push-vertical',
    muscles: ['shoulders'],
    secondary: ['triceps', 'upper-back'],
    equipment: ['dumbbell'],
    tier: 'compound',
    unit: 'reps',
    setup: 'Back against a bench set to 80–90°. Dumbbells start at ear height, palms forward or neutral.',
    cues: ['Press up and slightly in, stopping short of clanging the dumbbells', 'Keep the ribs down'],
    commonErrors: [
      { error: 'Bench set fully vertical', fix: '80–90° is easier on the shoulders' },
      { error: 'Arching the lower back', fix: 'Brace the abs; feet flat on the floor' },
    ],
    substitutions: ['overhead-press', 'landmine-press', 'push-press', 'pike-push-up'],
    notes: 'Easier to control and much safer alone than standing barbell work.',
    source: SRC.library,
  }),
  ex({
    id: 'push-press',
    name: 'Push Press',
    pattern: 'push-vertical',
    muscles: ['shoulders'],
    secondary: ['triceps', 'quads', 'glutes', 'core'],
    equipment: ['barbell', 'dumbbell'],
    tier: 'compound',
    unit: 'reps',
    setup: 'Front-rack position as for the OHP. Dip at the knees and hips, then drive and press in one motion.',
    cues: ['The dip is small and vertical — do not fold forward', 'Hips and knees extend together, then the arms finish it'],
    commonErrors: [
      { error: 'Dipping too deep', fix: 'A shallow, quick dip; the legs assist, they do not squat the bar up' },
      { error: 'Pressing with the arms first', fix: 'Legs then arms — one connected movement' },
    ],
    substitutions: ['overhead-press', 'seated-db-press', 'landmine-press'],
    notes: 'Handles more load than a strict press — useful for overloading the lockout.',
    source: SRC.intermediate,
  }),
  ex({
    id: 'landmine-press',
    name: 'Landmine Press',
    pattern: 'push-vertical',
    muscles: ['shoulders', 'chest'],
    secondary: ['triceps', 'core'],
    equipment: ['barbell'],
    tier: 'accessory',
    unit: 'reps',
    perSide: true,
    setup: 'Bar anchored in a landmine or a corner. One hand on the sleeve, press up and forward from the rack position.',
    cues: ['Press on a slight arc, forward as well as up', 'Ribs down — the core resists the lean'],
    commonErrors: [
      { error: 'Leaning back to finish the rep', fix: 'Brace the abs; reduce the load' },
      { error: 'Pressing straight overhead', fix: 'The arc is forward — that is what makes it shoulder-friendly' },
    ],
    substitutions: ['seated-db-press', 'overhead-press', 'incline-db-press'],
    notes: 'The most shoulder-friendly pressing pattern here — a good swap when overhead pressing pinches.',
    source: SRC.intermediate,
  }),
  ex({
    id: 'pike-push-up',
    name: 'Pike Push-Up',
    pattern: 'push-vertical',
    muscles: ['shoulders'],
    secondary: ['triceps', 'core', 'chest'],
    equipment: ['bodyweight'],
    tier: 'accessory',
    unit: 'reps',
    setup: 'Hips high, body in an inverted V. Lower the crown of the head toward the floor in front of the hands.',
    cues: ['Head lands in front of the hands, forming a triangle', 'Elbows track back, not out wide'],
    commonErrors: [
      { error: 'Hips dropping into a regular push-up', fix: 'Keep the pike; the hips stay high the whole rep' },
      { error: 'Flaring the elbows', fix: 'Tuck them toward the ribs' },
    ],
    substitutions: ['seated-db-press', 'overhead-press', 'handstand-push-up'],
    notes: 'Elevate the feet to make it harder — rung 3 of the home overhead ladder.',
    source: SRC.home,
  }),
  ex({
    id: 'handstand-push-up',
    name: 'Handstand Push-Up',
    pattern: 'push-vertical',
    muscles: ['shoulders'],
    secondary: ['triceps', 'core', 'traps'],
    equipment: ['bodyweight'],
    tier: 'compound',
    unit: 'reps',
    setup: 'Hands 15–20 cm from a wall, kick up into a handstand. Lower the head to the floor between the hands.',
    cues: ['Body in one line — no banana arch', 'Elbows track back at roughly 45°'],
    commonErrors: [
      { error: 'Arching the lower back', fix: 'Squeeze the glutes and ribs down; reduce the range' },
      { error: 'Flaring the elbows wide', fix: 'Tuck them; flared elbows put the shoulder in a bad position under load' },
    ],
    substitutions: ['pike-push-up', 'seated-db-press', 'overhead-press'],
    notes: 'Top rung of the overhead ladder. Use a wall for support and build range gradually.',
    source: SRC.home,
    advanced: true,
    unlockId: 'variation-handstand-push-up',
  }),
]

/* ------------------------------------------------------------------ *
 * Vertical pull
 * ------------------------------------------------------------------ */

const pullVertical: Exercise[] = [
  ex({
    id: 'pull-up',
    name: 'Pull-Up',
    pattern: 'pull-vertical',
    muscles: ['lats'],
    secondary: ['biceps', 'upper-back', 'forearms', 'core'],
    equipment: ['bodyweight'],
    tier: 'compound',
    unit: 'reps',
    setup:
      'Grip just wider than the shoulders, palms away. Start from a dead hang with the shoulders engaged (not fully relaxed).',
    cues: ['Pull the chest toward the bar, elbows driving down and slightly back', 'Lower under control — no dropping'],
    commonErrors: [
      { error: 'Half reps from a relaxed hang', fix: 'Full range: dead hang to chin over the bar' },
      { error: 'Kipping / kicking the legs', fix: 'Hollow body, legs together, no momentum' },
      { error: 'Pulling with the arms', fix: 'Think "elbows to the ribs", not "hands to the bar"' },
    ],
    substitutions: ['assisted-pull-up', 'pull-up-negative', 'lat-pulldown', 'weighted-pull-up'],
    notes: 'Ladder, easiest to hardest: band-assisted → machine-assisted → negatives → full → weighted.',
    source: SRC.library,
  }),
  ex({
    id: 'weighted-pull-up',
    name: 'Weighted Pull-Up',
    pattern: 'pull-vertical',
    muscles: ['lats'],
    secondary: ['biceps', 'upper-back', 'forearms'],
    equipment: ['bodyweight'],
    tier: 'compound',
    unit: 'reps',
    setup: 'Dipping belt, or a dumbbell between the feet. Same technique as a bodyweight pull-up.',
    cues: ['Same full range — added load is not a licence to shorten the rep', 'Control the negative'],
    commonErrors: [
      { error: 'Range shrinking as the load rises', fix: 'Keep the dead hang at the bottom and the chin over the bar' },
      { error: 'Kipping to start the rep', fix: 'Engage the shoulders from the hang before pulling' },
    ],
    substitutions: ['pull-up', 'lat-pulldown', 'chest-supported-row'],
    notes: 'Requires a solid set of 8–10 clean bodyweight pull-ups first.',
    source: SRC.intermediate,
    advanced: true,
    unlockId: 'variation-weighted-pull-up',
  }),
  ex({
    id: 'assisted-pull-up',
    name: 'Assisted Pull-Up',
    pattern: 'pull-vertical',
    muscles: ['lats'],
    secondary: ['biceps', 'upper-back'],
    equipment: ['machine', 'band', 'bodyweight'],
    tier: 'compound',
    unit: 'reps',
    setup: 'Machine: knees or feet on the pad, more counterweight = easier. Band: loop over the bar, foot or knee in the band.',
    cues: ['Full range — do not let the assistance shorten the rep', 'Chest to the bar, elbows down and back'],
    commonErrors: [
      { error: 'Using too much assistance for too long', fix: 'Reduce it every time you can hit the top of the rep range' },
      { error: 'Resting at the bottom of each rep', fix: 'Keep tension; the hang is engaged, not relaxed' },
    ],
    substitutions: ['pull-up-negative', 'pull-up', 'lat-pulldown'],
    source: SRC.library,
  }),
  ex({
    id: 'pull-up-negative',
    name: 'Pull-Up Negative',
    pattern: 'pull-vertical',
    muscles: ['lats'],
    secondary: ['biceps', 'upper-back', 'forearms'],
    equipment: ['bodyweight'],
    tier: 'accessory',
    unit: 'reps',
    setup: 'Jump or step to the top position, chin over the bar. Lower yourself as slowly as possible.',
    cues: ['Aim for 5 full seconds on the way down', 'Fight the last third hardest — that is where the value is'],
    commonErrors: [
      { error: 'Dropping fast', fix: 'If you cannot control 3 seconds, use a band or a lower starting position' },
      { error: 'Only doing the easy top half', fix: 'The bottom third is the hardest and the most useful' },
    ],
    substitutions: ['assisted-pull-up', 'lat-pulldown', 'pull-up'],
    notes: '3 × 5 negatives is the standard dose. The fastest route to a first pull-up.',
    source: SRC.home,
  }),
  ex({
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    pattern: 'pull-vertical',
    muscles: ['lats'],
    secondary: ['biceps', 'upper-back', 'rear-delts'],
    equipment: ['cable', 'machine', 'band'],
    tier: 'compound',
    unit: 'reps',
    setup: 'Thighs under the pad, slight lean back (10–15°) and hold it there for the whole set.',
    cues: ['Pull the bar to the top of the chest, elbows to the ribs', 'Control the way up — do not let it yank the shoulders'],
    commonErrors: [
      { error: 'Leaning back further with each rep', fix: 'Set the torso angle once and hold it' },
      { error: 'Pulling behind the neck', fix: 'Front only — behind-the-neck pulldowns are a shoulder injury waiting to happen' },
      { error: 'Using momentum', fix: 'Reduce the weight; the torso should be still' },
    ],
    substitutions: ['pull-up', 'assisted-pull-up', 'seated-cable-row', 'chest-supported-row'],
    source: SRC.library,
  }),
]

/* ------------------------------------------------------------------ *
 * Horizontal pull
 * ------------------------------------------------------------------ */

const pullHorizontal: Exercise[] = [
  ex({
    id: 'barbell-row',
    name: 'Barbell Row',
    pattern: 'pull-horizontal',
    muscles: ['upper-back', 'lats'],
    secondary: ['rear-delts', 'biceps', 'core', 'hamstrings'],
    equipment: ['barbell'],
    tier: 'compound',
    unit: 'reps',
    setup: 'Hinge to about 45°, flat back, soft knees. Pull the bar to the lower ribs / belt line, elbows tight.',
    cues: ['The torso does not move', 'Pull with the elbows, not the hands'],
    commonErrors: [
      {
        error: 'Torso rising and falling with each rep',
        fix: 'You are doing a different exercise — reduce the weight and lock the hip angle',
      },
      { error: 'Rounding the back', fix: 'Set the hinge, brace, and hold the spine neutral' },
      { error: 'Pulling to the chest', fix: 'Belt line for the lats and mid-back; higher shifts it to the upper traps' },
    ],
    substitutions: ['chest-supported-row', 'seated-cable-row', 'one-arm-db-row', 'inverted-row'],
    source: SRC.library,
  }),
  ex({
    id: 'chest-supported-row',
    name: 'Chest-Supported Row',
    pattern: 'pull-horizontal',
    muscles: ['upper-back', 'lats'],
    secondary: ['rear-delts', 'biceps'],
    equipment: ['machine', 'dumbbell', 'barbell'],
    tier: 'compound',
    unit: 'reps',
    setup: 'Chest on an inclined pad, arms hanging. Row the weight to the ribs, squeezing the shoulder blades.',
    cues: ['Chest stays glued to the pad', 'Initiate with the shoulder blades, then the elbows'],
    commonErrors: [
      { error: 'Lifting the chest off the pad to heave', fix: 'Reduce the load — the pad is the whole point' },
      { error: 'Shrugging at the top', fix: 'Keep the shoulders down and back' },
    ],
    substitutions: ['barbell-row', 'seated-cable-row', 'one-arm-db-row', 'inverted-row'],
    notes:
      'Zero lower-back involvement, so you can push close to failure safely. The best row for hypertrophy and the safest row when the back is tired.',
    source: SRC.library,
  }),
  ex({
    id: 'seated-cable-row',
    name: 'Seated Cable Row',
    pattern: 'pull-horizontal',
    muscles: ['upper-back', 'lats'],
    secondary: ['biceps', 'rear-delts', 'core'],
    equipment: ['cable'],
    tier: 'accessory',
    unit: 'reps',
    setup: 'Chest up, knees soft, handle in both hands. Reach forward for a stretch, then row to the ribs.',
    cues: ['Let the shoulder blades travel forward on the stretch', 'Avoid the whole-body rocking motion'],
    commonErrors: [
      { error: 'Rocking the torso back and forth', fix: 'Hips and torso stay still; only the arms and scapulae move' },
      { error: 'Rounding at the bottom of the stretch', fix: 'Chest up throughout, even at full reach' },
    ],
    substitutions: ['chest-supported-row', 'barbell-row', 'one-arm-db-row'],
    source: SRC.library,
  }),
  ex({
    id: 'one-arm-db-row',
    name: 'One-Arm Dumbbell Row',
    pattern: 'pull-horizontal',
    muscles: ['lats', 'upper-back'],
    secondary: ['biceps', 'rear-delts', 'core'],
    equipment: ['dumbbell', 'kettlebell'],
    tier: 'accessory',
    unit: 'reps',
    perSide: true,
    setup: 'One hand and knee on a bench, back flat and parallel to the floor. Row the dumbbell to the hip.',
    cues: ['Pull toward the hip, not the shoulder', 'Let the shoulder blade travel on the stretch'],
    commonErrors: [
      { error: 'Rotating the torso to heave', fix: 'Keep the shoulders level; reduce the weight' },
      { error: 'Pulling to the chest', fix: 'Elbow to the hip engages the lat far better' },
    ],
    substitutions: ['chest-supported-row', 'seated-cable-row', 'barbell-row', 'inverted-row'],
    notes: 'Useful for exposing and fixing side-to-side differences.',
    source: SRC.library,
  }),
  ex({
    id: 'inverted-row',
    name: 'Inverted Row',
    pattern: 'pull-horizontal',
    muscles: ['upper-back', 'lats'],
    secondary: ['biceps', 'core', 'rear-delts'],
    equipment: ['bodyweight', 'barbell'],
    tier: 'accessory',
    unit: 'reps',
    setup:
      'Under a bar, TRX or a sturdy table. Body straight, heels on the floor. Pull the chest to the bar.',
    cues: ['One rigid plank from heels to head', 'Elevate the feet to make it harder'],
    commonErrors: [
      { error: 'Hips sagging', fix: 'Squeeze the glutes and brace the abs' },
      { error: 'Half reps', fix: 'Full extension at the bottom, chest touching at the top' },
    ],
    substitutions: ['chest-supported-row', 'seated-cable-row', 'doorway-row', 'pull-up'],
    notes: 'The most scalable bodyweight pull there is — change the body angle to change the difficulty.',
    source: SRC.library,
  }),
  ex({
    id: 'doorway-row',
    name: 'Doorway Row',
    pattern: 'pull-horizontal',
    muscles: ['upper-back', 'lats'],
    secondary: ['biceps', 'core'],
    equipment: ['bodyweight', 'none'],
    tier: 'accessory',
    unit: 'reps',
    setup:
      'Stand in a doorframe, grip the frame, feet close to the bottom of the frame. Lean back, then pull yourself in.',
    cues: ['Lean further back to make it harder', 'Pull the chest to the frame, elbows tight'],
    commonErrors: [
      { error: 'Standing too upright', fix: 'The lean is the load — feet forward, body at an angle' },
      { error: 'Pulling with the arms only', fix: 'Drive the elbows back and squeeze the shoulder blades' },
    ],
    substitutions: ['inverted-row', 'seated-cable-row'],
    notes: 'Rung 1 of the home pulling ladder. No equipment at all required.',
    source: SRC.home,
  }),
]

/* ------------------------------------------------------------------ *
 * Unilateral legs
 * ------------------------------------------------------------------ */

const unilateral: Exercise[] = [
  ex({
    id: 'bulgarian-split-squat',
    name: 'Bulgarian Split Squat',
    pattern: 'unilateral-leg',
    muscles: ['quads', 'glutes'],
    secondary: ['hamstrings', 'adductors', 'core', 'calves'],
    equipment: ['bodyweight', 'dumbbell', 'barbell'],
    tier: 'compound',
    unit: 'reps',
    perSide: true,
    setup:
      'Rear foot on a bench behind you, front foot far enough forward that the shin stays near vertical at the bottom. Torso slightly forward.',
    cues: ['Drop the back knee toward the floor', 'Weight stays in the front heel and mid-foot'],
    commonErrors: [
      {
        error: 'Front foot too close',
        fix: 'The knee jams forward and it becomes quad-dominant and painful — step further out',
      },
      { error: 'Losing balance', fix: 'Narrow the stance (feet in line, not on a tightrope), or hold onto something. That is not cheating' },
      { error: 'Leaning far forward', fix: 'A slight forward lean is right; a folded torso is not' },
    ],
    substitutions: ['reverse-lunge', 'leg-press', 'goblet-squat', 'back-squat'],
    notes: 'Genuinely brutal and genuinely effective. Start light — balance is the first limiter.',
    source: SRC.library,
  }),
  ex({
    id: 'reverse-lunge',
    name: 'Reverse Lunge',
    pattern: 'unilateral-leg',
    muscles: ['quads', 'glutes'],
    secondary: ['hamstrings', 'core', 'calves'],
    equipment: ['bodyweight', 'dumbbell'],
    tier: 'accessory',
    unit: 'reps',
    perSide: true,
    setup: 'Stand tall. Step one foot back, drop the back knee toward the floor, then drive back up through the front heel.',
    cues: ['Vertical front shin', 'Torso stays upright'],
    commonErrors: [
      { error: 'Front knee travelling far past the toes', fix: 'Step further back' },
      { error: 'Losing balance side to side', fix: 'Feet hip-width apart, not on a line — widen your base' },
    ],
    substitutions: ['bulgarian-split-squat', 'box-squat', 'leg-press', 'goblet-squat'],
    notes: 'Stepping back rather than forward is much easier on the knees than a walking lunge.',
    source: SRC.library,
  }),
]

/* ------------------------------------------------------------------ *
 * Arms and shoulders (isolation)
 * ------------------------------------------------------------------ */

const isolation: Exercise[] = [
  ex({
    id: 'incline-db-curl',
    name: 'Incline Dumbbell Curl',
    pattern: 'isolation',
    muscles: ['biceps'],
    secondary: ['forearms'],
    equipment: ['dumbbell'],
    tier: 'isolation',
    unit: 'reps',
    setup: 'Bench at 45–60°, arms hanging behind the line of the torso. Curl, supinating the pinky upward at the top.',
    cues: ['Supinate — twist the pinky up at the top', 'Elbows stay behind the body; do not swing them forward'],
    commonErrors: [
      { error: 'Elbows drifting forward', fix: 'Pin them behind the torso — that keeps the stretch on the long head' },
      { error: 'Using momentum', fix: 'Half the weight, strict reps' },
    ],
    substitutions: ['hammer-curl'],
    notes: 'The stretch position is where most of the growth stimulus lives.',
    source: SRC.library,
  }),
  ex({
    id: 'hammer-curl',
    name: 'Hammer Curl',
    pattern: 'isolation',
    muscles: ['biceps', 'forearms'],
    secondary: [],
    equipment: ['dumbbell', 'cable'],
    tier: 'isolation',
    unit: 'reps',
    setup: 'Neutral grip, palms facing each other, elbows pinned to the sides.',
    cues: ['Elbows do not move', 'Curl to the shoulder, squeeze, lower slowly'],
    commonErrors: [
      { error: 'Swinging the elbows forward', fix: 'Pin them to the ribs' },
      { error: 'Wrists rotating', fix: 'Stay neutral the whole rep — that is what targets the brachialis' },
    ],
    substitutions: ['incline-db-curl'],
    notes: 'Targets the brachialis and forearms — adds arm thickness rather than peak.',
    source: SRC.library,
  }),
  ex({
    id: 'overhead-cable-extension',
    name: 'Overhead Cable Triceps Extension',
    pattern: 'isolation',
    muscles: ['triceps'],
    secondary: [],
    equipment: ['cable', 'band', 'dumbbell'],
    tier: 'isolation',
    unit: 'reps',
    setup: 'Rope or bar behind the head, elbows high and fixed. Extend to full lockout, then let the stretch open up.',
    cues: ['Elbows high and still', 'Chase the stretch at the bottom'],
    commonErrors: [
      { error: 'Elbows flaring and dropping', fix: 'Keep them high and close; reduce the load' },
      { error: 'Short range', fix: 'Full extension at the top, deep stretch at the bottom' },
    ],
    substitutions: ['rope-pushdown', 'close-grip-bench'],
    notes: 'The long head only gets a full stretch overhead — this is the better triceps builder.',
    source: SRC.library,
  }),
  ex({
    id: 'rope-pushdown',
    name: 'Rope Triceps Pushdown',
    pattern: 'isolation',
    muscles: ['triceps'],
    secondary: [],
    equipment: ['cable', 'band'],
    tier: 'isolation',
    unit: 'reps',
    setup: 'Rope at the top of a cable stack. Elbows at the ribs, push down and spread the rope at the bottom.',
    cues: ['Elbows pinned to the ribs — only the forearms move', 'Spread the rope apart at lockout'],
    commonErrors: [
      { error: 'Shoulders and elbows driving the rep', fix: 'Lock the upper arm in place; reduce the weight' },
      { error: 'Leaning on the stack', fix: 'Slight forward lean is fine; a folded torso is not' },
    ],
    substitutions: ['overhead-cable-extension', 'close-grip-bench'],
    notes: 'Light and controlled beats heavy and sloppy.',
    source: SRC.library,
  }),
  ex({
    id: 'db-lateral-raise',
    name: 'Dumbbell Lateral Raise',
    pattern: 'isolation',
    muscles: ['shoulders'],
    secondary: ['traps'],
    equipment: ['dumbbell', 'band', 'cable'],
    tier: 'isolation',
    unit: 'reps',
    setup: 'Slight forward lean, soft elbows. Lead with the elbows out to the sides until the arms are parallel to the floor.',
    cues: ['Lead with the elbows, not the hands', 'Half the weight you think you need'],
    commonErrors: [
      {
        error: 'Raising higher than shoulder height',
        fix: 'Above parallel just recruits the traps — stop at shoulder height',
      },
      { error: 'Swinging / using momentum', fix: 'Reduce the load; a controlled 12 beats a heaved 8' },
      { error: 'Shrugging', fix: 'Shoulders down before the set starts' },
    ],
    substitutions: ['face-pull'],
    source: SRC.library,
  }),
  ex({
    id: 'face-pull',
    name: 'Face Pull',
    pattern: 'isolation',
    muscles: ['rear-delts', 'upper-back'],
    secondary: ['traps', 'shoulders'],
    equipment: ['cable', 'band'],
    tier: 'isolation',
    unit: 'reps',
    setup: 'Rope at head height. Pull toward the forehead, elbows high, finishing in a double-biceps pose.',
    cues: ['Elbows high and wide', 'Finish with the hands beside the ears, externally rotated'],
    commonErrors: [
      { error: 'Pulling low like a row', fix: 'The rope travels toward the face, elbows level with the shoulders' },
      { error: 'Going too heavy', fix: 'This is a high-rep, low-load exercise — 15–20 reps' },
    ],
    substitutions: ['db-lateral-raise', 'inverted-row'],
    notes:
      'Rear delt and rotator cuff work. Do these every week — the single best insurance policy for a pressing-heavy programme.',
    source: SRC.library,
  }),
  ex({
    id: 'standing-calf-raise',
    name: 'Standing Calf Raise',
    pattern: 'isolation',
    muscles: ['calves'],
    secondary: [],
    equipment: ['machine', 'dumbbell', 'bodyweight'],
    tier: 'isolation',
    unit: 'reps',
    setup: 'Balls of the feet on a block or step, heels free to drop. Knees straight but not locked.',
    cues: ['Full stretch at the bottom, pause there', 'Pause at the top too — no bouncing'],
    commonErrors: [
      { error: 'Bouncing out of the stretch', fix: 'A 1–2 s pause at the bottom removes the tendon reflex' },
      { error: 'Half range', fix: 'Heel well below the toes, then a full rise' },
    ],
    substitutions: ['seated-calf-raise'],
    notes: 'Standing work targets the gastrocnemius.',
    source: SRC.library,
  }),
  ex({
    id: 'seated-calf-raise',
    name: 'Seated Calf Raise',
    pattern: 'isolation',
    muscles: ['calves'],
    secondary: [],
    equipment: ['machine', 'dumbbell'],
    tier: 'isolation',
    unit: 'reps',
    setup: 'Knees bent at 90° under the pad. Lower for a full stretch, raise onto the big toe.',
    cues: ['Higher reps than standing work — 12–20', 'Pause at both ends'],
    commonErrors: [
      { error: 'Short range', fix: 'Let the heel drop well below the toes' },
      { error: 'Bouncing', fix: 'Slow the eccentric; the soleus responds to time under tension' },
    ],
    substitutions: ['standing-calf-raise'],
    notes: 'Bent knees take the gastrocnemius out and isolate the soleus.',
    source: SRC.library,
  }),
]

/* ------------------------------------------------------------------ *
 * Core
 * ------------------------------------------------------------------ */

const core: Exercise[] = [
  ex({
    id: 'plank',
    name: 'Plank',
    pattern: 'core',
    muscles: ['core'],
    secondary: ['shoulders', 'glutes'],
    equipment: ['bodyweight'],
    tier: 'core',
    unit: 'seconds',
    setup: 'Forearms under the shoulders, body in one straight line from head to heels.',
    cues: ['Tuck the pelvis, squeeze the glutes, push the floor away', 'Not a relaxed sag — the whole body is on'],
    commonErrors: [
      { error: 'Hips sagging', fix: 'Posteriorly tilt the pelvis and squeeze the glutes' },
      { error: 'Hips piking up', fix: 'Same rigid-line cue; shorten the hold rather than break position' },
      { error: 'Holding the breath', fix: 'Breathe normally behind a braced torso' },
    ],
    substitutions: ['side-plank', 'dead-bug', 'ab-wheel'],
    notes: 'Once 60 s is easy, make it harder (longer lever, weight, reduced base) rather than longer.',
    source: SRC.library,
  }),
  ex({
    id: 'side-plank',
    name: 'Side Plank',
    pattern: 'core',
    muscles: ['core'],
    secondary: ['shoulders', 'glutes'],
    equipment: ['bodyweight'],
    tier: 'core',
    unit: 'seconds',
    perSide: true,
    setup: 'Elbow under the shoulder, legs stacked, hips lifted until the body is one straight line.',
    cues: ['Hips high — drive them toward the ceiling', 'Stack the feet, or stagger them for stability'],
    commonErrors: [
      { error: 'Hips dropping', fix: 'Shorten the hold; quality over duration' },
      { error: 'Top shoulder rolling forward', fix: 'Open the chest to the ceiling' },
    ],
    substitutions: ['plank', 'suitcase-carry', 'dead-bug'],
    source: SRC.library,
  }),
  ex({
    id: 'dead-bug',
    name: 'Dead Bug',
    pattern: 'core',
    muscles: ['core'],
    secondary: [],
    equipment: ['bodyweight'],
    tier: 'core',
    unit: 'reps',
    perSide: true,
    setup: 'On your back, arms to the ceiling, hips and knees at 90°. Lower the opposite arm and leg, then return.',
    cues: ['Lower back pressed into the floor the entire time', 'Move slowly — the slower you go, the harder it is'],
    commonErrors: [
      { error: 'Lower back arching off the floor', fix: 'You have gone too far — reduce the range until the back stays down' },
      { error: 'Rushing', fix: 'Three seconds out, three seconds back' },
    ],
    substitutions: ['bird-dog', 'plank'],
    notes: 'Teaches bracing while the limbs move — the exact skill the squat and deadlift need.',
    source: SRC.library,
  }),
  ex({
    id: 'bird-dog',
    name: 'Bird Dog',
    pattern: 'core',
    muscles: ['core'],
    secondary: ['glutes', 'upper-back'],
    equipment: ['bodyweight'],
    tier: 'core',
    unit: 'reps',
    perSide: true,
    setup: 'On all fours, hands under shoulders, knees under hips. Extend the opposite arm and leg.',
    cues: ['No hip rotation — imagine balancing a glass of water on your lower back', 'Pause at full extension'],
    commonErrors: [
      { error: 'Hips tipping', fix: 'Reduce the range; reach less far until the pelvis stays level' },
      { error: 'Overarching the lower back', fix: 'The leg extends back by hip extension only' },
    ],
    substitutions: ['dead-bug', 'plank'],
    notes: 'A useful warm-up activation drill as well as a core exercise.',
    source: SRC.library,
  }),
  ex({
    id: 'cable-crunch',
    name: 'Cable Crunch',
    pattern: 'core',
    muscles: ['core'],
    secondary: [],
    equipment: ['cable'],
    tier: 'core',
    unit: 'reps',
    setup: 'Kneel below a high pulley, rope behind the head. Round the spine to crunch down, hips fixed.',
    cues: ['Round the spine — this is a crunch, not a hip hinge', 'Hips do not move'],
    commonErrors: [
      { error: 'Sitting back at the hips', fix: 'The pelvis stays vertical; only the ribcage curls toward it' },
      { error: 'Pulling with the arms', fix: 'The arms just hold the rope; the abs do the work' },
    ],
    substitutions: ['hanging-knee-raise', 'ab-wheel', 'plank'],
    notes: 'One of the few ways to progressively overload the abs with weight.',
    source: SRC.library,
  }),
  ex({
    id: 'hanging-knee-raise',
    name: 'Hanging Knee / Leg Raise',
    pattern: 'core',
    muscles: ['core'],
    secondary: ['forearms', 'lats'],
    equipment: ['bodyweight'],
    tier: 'core',
    unit: 'reps',
    setup: 'Hang from a bar. Posteriorly tilt the pelvis and raise the knees (or straight legs) toward the chest.',
    cues: ['Tilt the pelvis first — do not just swing the legs up', 'Lower slowly, without swinging'],
    commonErrors: [
      { error: 'Swinging / kipping', fix: 'Slow down and reduce the range; control is the exercise' },
      { error: 'Only lifting the legs, not the pelvis', fix: 'The pelvis must curl up or the hip flexors do it all' },
    ],
    substitutions: ['cable-crunch', 'dead-bug', 'ab-wheel'],
    source: SRC.library,
  }),
  ex({
    id: 'ab-wheel',
    name: 'Ab Wheel Rollout',
    pattern: 'core',
    muscles: ['core'],
    secondary: ['lats', 'shoulders'],
    equipment: ['bodyweight', 'none'],
    tier: 'core',
    unit: 'reps',
    setup: 'From the knees, wheel out as far as you can while keeping the back from arching, then pull back.',
    cues: ['Go only as far as you can keep the ribs down', 'Tuck the pelvis before you start'],
    commonErrors: [
      { error: 'Lower back arching at full extension', fix: 'That is your limit — roll out less far' },
      { error: 'Pulling with the arms', fix: 'The abs bring you back; the arms just hold on' },
    ],
    substitutions: ['plank', 'dead-bug', 'cable-crunch'],
    source: SRC.library,
  }),
]

/* ------------------------------------------------------------------ *
 * Carries and conditioning
 * ------------------------------------------------------------------ */

const carries: Exercise[] = [
  ex({
    id: 'farmers-carry',
    name: "Farmer's Carry",
    pattern: 'carry',
    muscles: ['forearms', 'traps', 'core'],
    secondary: ['upper-back', 'glutes', 'calves'],
    equipment: ['dumbbell', 'kettlebell', 'trap-bar'],
    tier: 'conditioning',
    unit: 'metres',
    setup: 'Heavy dumbbells or kettlebells at the sides. Tall, shoulders back, ribs down. Walk.',
    cues: ['Do not let the weights drag you sideways', 'Short, quick, controlled steps'],
    commonErrors: [
      { error: 'Leaning back to compensate', fix: 'Ribs down, glutes squeezed, stay tall' },
      { error: 'Grip failing before the walk is done', fix: 'That is a legitimate limit — chalk, or shorter walks' },
    ],
    substitutions: ['suitcase-carry', 'plank'],
    notes:
      'Grip, traps and core in one. Also the single most transferable thing you can lift — it is picking something heavy up and walking with it.',
    source: SRC.library,
  }),
  ex({
    id: 'suitcase-carry',
    name: 'Suitcase Carry',
    pattern: 'carry',
    muscles: ['core'],
    secondary: ['forearms', 'traps', 'glutes'],
    equipment: ['dumbbell', 'kettlebell'],
    tier: 'conditioning',
    unit: 'metres',
    perSide: true,
    setup: 'One heavy weight in one hand. Walk without letting the torso lean.',
    cues: ['Stay perfectly upright — resist the lean', 'Swap sides each set'],
    commonErrors: [
      { error: 'Leaning toward the weight', fix: 'That is the whole point of the exercise; reduce the load' },
      { error: 'Hiking the loaded shoulder', fix: 'Keep both shoulders level' },
    ],
    substitutions: ['farmers-carry', 'side-plank'],
    notes: 'Anti-lateral-flexion core work — trains the obliques to resist, not to crunch.',
    source: SRC.library,
  }),
  ex({
    id: 'ruck-walk',
    name: 'Ruck / Weighted Walk',
    pattern: 'conditioning',
    muscles: ['cardio'],
    secondary: ['glutes', 'calves', 'core', 'traps'],
    equipment: ['bodyweight', 'none'],
    tier: 'conditioning',
    unit: 'seconds',
    setup: 'Backpack loaded with books or plates. Walk at a brisk pace for 20–45 minutes.',
    cues: ['Brisk enough to breathe hard, easy enough to hold a conversation', 'Tall posture — do not let the pack pull you forward'],
    commonErrors: [
      { error: 'Loading too heavy too soon', fix: 'Start at about 10% of bodyweight and add gradually' },
      { error: 'Turning it into a hard session', fix: 'This is easy aerobic work — keep it easy' },
    ],
    substitutions: ['incline-treadmill-walk', 'rowing-machine'],
    notes: 'Low impact, high value. The best conditioning option that will not cost you leg recovery.',
    source: SRC.library,
  }),
  ex({
    id: 'incline-treadmill-walk',
    name: 'Incline Treadmill Walk',
    pattern: 'conditioning',
    muscles: ['cardio'],
    secondary: ['glutes', 'calves'],
    equipment: ['machine'],
    tier: 'conditioning',
    unit: 'seconds',
    setup: '10–15% grade at 4–5 km/h for 20–30 minutes.',
    cues: ['Do not hold the handrails — that removes most of the work', 'Conversational pace'],
    commonErrors: [
      { error: 'Hanging onto the rails', fix: 'Let go, or lower the grade until you can' },
      { error: 'Going too fast to be "better"', fix: 'Easy means easy; hard conditioning competes with leg recovery' },
    ],
    substitutions: ['ruck-walk', 'rowing-machine'],
    source: SRC.library,
  }),
  ex({
    id: 'rowing-machine',
    name: 'Rowing Machine',
    pattern: 'conditioning',
    muscles: ['cardio'],
    secondary: ['upper-back', 'lats', 'quads', 'glutes', 'core'],
    equipment: ['machine'],
    tier: 'conditioning',
    unit: 'seconds',
    setup: 'Feet strapped, shins vertical. Drive with the legs, then swing the torso, then pull with the arms. Reverse on the way back.',
    cues: ['Legs → body → arms, then arms → body → legs', 'Do not reach with the arms first'],
    commonErrors: [
      { error: 'Arms-first sequence', fix: 'The legs do about 60% of the work' },
      { error: 'Rounding the back at the catch', fix: 'Hinge from the hips with a braced spine' },
      { error: 'Shooting the slide (hips rising before the knees bend)', fix: 'Hands away, body over, then knees bend' },
    ],
    substitutions: ['incline-treadmill-walk', 'ruck-walk'],
    notes: '20–30 min easy, or 8 × 30 s hard / 90 s easy for intervals.',
    source: SRC.library,
  }),
]

export const EXERCISES: readonly Exercise[] = Object.freeze([
  ...squats,
  ...hinges,
  ...pushHorizontal,
  ...pushVertical,
  ...pullVertical,
  ...pullHorizontal,
  ...unilateral,
  ...isolation,
  ...core,
  ...carries,
])

export const EXERCISE_MAP: Readonly<Record<string, Exercise>> = Object.freeze(
  Object.fromEntries(EXERCISES.map((e) => [e.id, e])),
)

export function getExercise(id: string): Exercise | undefined {
  return EXERCISE_MAP[id]
}

/** Display name for an id, falling back to a tidied version of the id itself. */
export function exerciseName(id: string): string {
  const hit = EXERCISE_MAP[id]
  if (hit) return hit.name
  return id
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export const PATTERN_LABELS: Record<MovementPattern, string> = {
  squat: 'Squat',
  hinge: 'Hinge',
  'push-horizontal': 'Horizontal Push',
  'push-vertical': 'Vertical Push',
  'pull-vertical': 'Vertical Pull',
  'pull-horizontal': 'Horizontal Pull',
  'unilateral-leg': 'Unilateral Leg',
  isolation: 'Isolation',
  core: 'Core',
  carry: 'Carry',
  conditioning: 'Conditioning',
}

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  quads: 'Quads',
  glutes: 'Glutes',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
  adductors: 'Adductors',
  chest: 'Chest',
  lats: 'Lats',
  'upper-back': 'Upper Back',
  traps: 'Traps',
  'rear-delts': 'Rear Delts',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  core: 'Core',
  cardio: 'Cardio',
}

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  kettlebell: 'Kettlebell',
  machine: 'Machine',
  cable: 'Cable',
  band: 'Band',
  bodyweight: 'Bodyweight',
  'trap-bar': 'Trap Bar',
  none: 'No Equipment',
}

export const TIER_LABELS: Record<ExerciseTier, string> = {
  compound: 'Compound',
  accessory: 'Accessory',
  isolation: 'Isolation',
  core: 'Core',
  conditioning: 'Conditioning',
}

/** Distinct filter values, sorted for stable UI. */
export const ALL_MUSCLES = Object.keys(MUSCLE_LABELS) as MuscleGroup[]
export const ALL_PATTERNS = Object.keys(PATTERN_LABELS) as MovementPattern[]
export const ALL_EQUIPMENT = Object.keys(EQUIPMENT_LABELS) as Equipment[]

/** Every muscle group that is the primary target of at least one exercise. */
export const TRAINED_MUSCLES: MuscleGroup[] = Array.from(
  new Set(EXERCISES.flatMap((e) => e.muscles)),
).sort((a, b) => MUSCLE_LABELS[a].localeCompare(MUSCLE_LABELS[b])) as MuscleGroup[]

export function exercisesByMuscle(m: MuscleGroup): Exercise[] {
  return EXERCISES.filter((e) => e.muscles.includes(m) || e.secondary.includes(m))
}

export function exercisesByPattern(p: MovementPattern): Exercise[] {
  return EXERCISES.filter((e) => e.pattern === p)
}

/** Full substitution chain for an exercise, de-duplicated and order-preserving. */
export function substitutionsFor(id: string): Exercise[] {
  const e = EXERCISE_MAP[id]
  if (!e) return []
  return e.substitutions.map((s) => EXERCISE_MAP[s]).filter((x): x is Exercise => Boolean(x))
}

/** Exercises that list this one as a substitute — i.e. what to swap *to* it from. */
export function substitutedBy(id: string): Exercise[] {
  return EXERCISES.filter((e) => e.substitutions.includes(id))
}

/**
 * Warm-up drills for a session, derived from the mobility menu in
 * `reference/warmup-and-cooldown.md`. Keyed by the emphasis of the day.
 */
export interface WarmupDrill {
  name: string
  dose: string
  purpose: string
}

export const WARMUP_MENUS: Record<string, { stage: string; drills: WarmupDrill[] }[]> = {
  lower: [
    {
      stage: 'Raise temperature · 3–5 min',
      drills: [{ name: 'Bike, rower or brisk incline walk', dose: '3–5 min', purpose: 'Until lightly sweating' }],
    },
    {
      stage: 'Mobility + activation · 3–5 min',
      drills: [
        { name: 'Bodyweight squat hold, elbows pushing knees out', dose: '30–45 s', purpose: 'Ankles, hips, adductors' },
        { name: '90/90 hip switches', dose: '10 / side', purpose: 'Hip internal and external rotation' },
        { name: 'Leg swings, front-back and side-to-side', dose: '10 each', purpose: 'Hips' },
        { name: 'Ankle rock (knee over toes, heel down)', dose: '10 / side', purpose: 'Ankles — the usual cause of heels lifting' },
        { name: 'Glute bridge', dose: '12–15', purpose: 'Glute activation' },
      ],
    },
  ],
  upper: [
    {
      stage: 'Raise temperature · 3–5 min',
      drills: [{ name: 'Bike, rower or easy cardio', dose: '3–5 min', purpose: 'Until lightly sweating' }],
    },
    {
      stage: 'Mobility + activation · 3–5 min',
      drills: [
        { name: 'Band pull-apart', dose: '15–20', purpose: 'Rear delts, upper back — sets the shoulder blades' },
        { name: 'Thoracic extension over a roller or bench', dose: '8–10', purpose: 'Upper back — lets you arch properly' },
        { name: 'Band dislocate / pass-through', dose: '10', purpose: 'Shoulders, chest' },
        { name: 'Scapular push-up', dose: '8', purpose: 'Shoulder-blade control' },
        { name: 'Slow push-up', dose: '8', purpose: 'The pressing pattern, loaded' },
      ],
    },
  ],
  hinge: [
    {
      stage: 'Raise temperature · 3–5 min',
      drills: [{ name: 'Bike, rower or brisk walk', dose: '3–5 min', purpose: 'Until lightly sweating' }],
    },
    {
      stage: 'Mobility + activation · 3–5 min',
      drills: [
        { name: 'Cat-cow', dose: '8–10', purpose: 'Spinal movement in both directions' },
        {
          name: 'Hip hinge with a dowel along the spine',
          dose: '10',
          purpose: 'The hinge pattern — the dowel must touch head, upper back and tailbone',
        },
        { name: 'Glute bridge, 3 s hold at the top', dose: '12', purpose: 'Glutes' },
        { name: 'Good morning, empty bar or very light', dose: '10', purpose: 'Hinge under load' },
        { name: 'Hamstring scoop / leg swing', dose: '8 / side', purpose: 'Hamstrings' },
      ],
    },
  ],
  pull: [
    {
      stage: 'Raise temperature · 3–5 min',
      drills: [{ name: 'Rower or easy cardio', dose: '3–5 min', purpose: 'Until lightly sweating' }],
    },
    {
      stage: 'Mobility + activation · 3–5 min',
      drills: [
        { name: 'Band pull-apart', dose: '15–20', purpose: 'Upper back' },
        { name: 'Scapular pull-up', dose: '8', purpose: 'Shoulder-blade control' },
        { name: 'Straight-arm hang from a bar', dose: '20–30 s', purpose: 'Lats, shoulders, grip' },
        { name: 'Band face pull, light', dose: '15', purpose: 'Rotator cuff, rear delts' },
      ],
    },
  ],
}

/** Ramp-up templates from reference/warmup-and-cooldown.md. */
export function rampUpSets(workingKg: number, isUpper: boolean): { load: number; reps: number }[] {
  if (workingKg <= 0) return []
  const bar = 20
  if (workingKg <= bar * 1.5) return [{ load: bar, reps: 10 }]
  if (isUpper) {
    const steps = [bar, workingKg * 0.6, workingKg * 0.75, workingKg * 0.92]
    const reps = [10, 6, 4, 2]
    return steps.map((load, i) => ({ load: Math.round(load * 2) / 2, reps: reps[i] }))
  }
  const steps = [bar, workingKg * 0.5, workingKg * 0.7, workingKg * 0.85, workingKg * 0.95]
  const reps = [10, 6, 4, 2, 1]
  return steps.map((load, i) => ({ load: Math.round(load * 2) / 2, reps: reps[i] }))
}

/** Cooldown stretches by session emphasis. */
export const COOLDOWN: Record<string, string[]> = {
  lower: [
    'Standing quad stretch — 30 s / side',
    'Seated or standing hamstring — 30 s / side',
    'Hip flexor lunge — 30 s / side',
    'Glute figure-4, lying or seated — 30 s / side',
    'Calf against a wall — 30 s / side',
  ],
  upper: [
    'Doorway pec stretch — 30 s / side',
    'Overhead triceps — 30 s / side',
    'Thoracic extension over a roller — 8–10 reps',
    'Cross-body shoulder — 30 s / side',
  ],
  hinge: [
    'Hamstring — 30 s / side',
    'Glute — 30 s / side',
    "Child's pose, knees wide — 45 s",
    'Hip flexor lunge — 30 s / side',
  ],
  pull: [
    'Lat hang or side bend holding a post — 30 s / side',
    'Chest stretch — 30 s / side',
    'Rear delt cross-body — 30 s / side',
  ],
  general: [
    '2–3 min easy walking or slow movement',
    'Static stretch the muscles you trained — 30 s each, no bouncing',
    '2 min slow nasal breathing: roughly 4 s in, 6 s out',
  ],
}

/**
 * Pain triage from reference/exercise-library.md#when-something-hurts.
 * Shown on every exercise detail page.
 */
export const PAIN_TRIAGE: { sensation: string; verdict: 'ok' | 'caution' | 'stop'; detail: string }[] = [
  { sensation: 'Muscle burning during a set, tired after', verdict: 'ok', detail: 'Normal. Carry on.' },
  { sensation: 'Dull muscle soreness 24–48 h later', verdict: 'ok', detail: 'Normal. Train around it.' },
  { sensation: 'Sharp, stabbing, or electric pain', verdict: 'stop', detail: 'Stop the set. Not normal.' },
  {
    sensation: 'Pain in a joint (shoulder, knee, elbow, wrist) rather than muscle',
    verdict: 'caution',
    detail: 'Stop that movement and use a substitution.',
  },
  { sensation: 'Pain that changes your technique', verdict: 'caution', detail: 'Too heavy, or the wrong exercise.' },
  { sensation: 'Pain that persists for days or worsens', verdict: 'stop', detail: 'See a professional. Do not train through it.' },
]
