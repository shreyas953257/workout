import type { Program, ProgramDay, ProgramExercise, SetUnit } from '../types'
import type { BlockOverride } from '../types'

/** Re-exported so consumers can type block overrides without reaching into types/. */
export type { BlockOverride }

/**
 * Training programmes — transcribed from `programs/*.md`.
 *
 * Set/rep targets, RPE, rest intervals, weekly blocks and progression rules are
 * taken directly from those documents. `sourceFile` links back to the original
 * prose, which stays in the repository and is readable in-app at /docs.
 */


export const px = (
  exerciseId: string,
  sets: number,
  target: string,
  rpe: string,
  restSec: number,
  extra: Partial<ProgramExercise> = {},
): ProgramExercise => {
  const nums = target.match(/\d+/g) ?? ['1']
  const repsMin = Number(nums[0] ?? 1)
  const repsMax = nums.length > 1 ? Number(nums[nums.length - 1]) : repsMin
  let unit: SetUnit = 'reps'
  if (/s\b|sec|second/i.test(target) && !/\d+\s*×/.test(target)) unit = 'seconds'
  if (/m\b|metre|meter/i.test(target)) unit = 'metres'
  if (extra.unit) unit = extra.unit
  return { exerciseId, sets, target, repsMin, repsMax, unit, rpe, restSec, ...extra }
}

/* ------------------------------------------------------------------ *
 * 1 · Beginner Full-Body — 3 days/week, 12 weeks
 * ------------------------------------------------------------------ */

const beginnerA: ProgramDay = {
  id: 'beg-a',
  name: 'Workout A — squat, horizontal push/pull',
  badge: 'A',
  emphasis: 'full',
  summary: 'Squat and bench as the drivers, a row for balance, lateral core work to finish.',
  estimatedMin: 55,
  exercises: [
    px('back-squat', 3, '5', '7–8', 165, { scheme: 'Main lift — ramp up properly first' }),
    px('bench-press', 3, '5', '7–8', 165),
    px('barbell-row', 3, '8', '7–8', 90),
    px('side-plank', 3, '30–45 s per side', '—', 45, { unit: 'seconds', perSide: true }),
    px('face-pull', 2, '15', '7', 45, { optional: true }),
  ],
}

const beginnerB: ProgramDay = {
  id: 'beg-b',
  name: 'Workout B — hinge, vertical push/pull',
  badge: 'B',
  emphasis: 'full',
  summary: 'Hinge and overhead press as the drivers, a vertical pull, anterior core and carries.',
  estimatedMin: 55,
  exercises: [
    px('romanian-deadlift', 3, '8', '7', 165, { scheme: 'Main lift — ramp up properly first' }),
    px('overhead-press', 3, '5', '7–8', 165),
    px('lat-pulldown', 3, '8–10', '7–8', 90),
    px('dead-bug', 3, '8 per side', '—', 45, { perSide: true }),
    px('farmers-carry', 3, '40 m', '8', 90, { unit: 'metres' }),
  ],
}

const beginnerProgram: Program = {
  id: 'beginner-full-body',
  name: 'Beginner Full-Body',
  tagline: 'Three days a week, every lift practised three times. The fastest route off the ground.',
  level: 'beginner',
  daysPerWeek: 3,
  totalWeeks: 12,
  equipment: ['Barbell + rack, or a full set of dumbbells and an adjustable bench'],
  progressionModel: 'linear',
  progressionSummary:
    'Linear — add weight every session you hit all prescribed reps at or below the target RPE. +2.5 kg on lower body, +1.25–2.5 kg on upper body.',
  overview:
    'For newer lifters, or anyone returning after six or more months off. Two alternating full-body sessions, three times a week, over twelve weeks in three blocks with a deload after each of the first two.',
  whyItWorks:
    'Three full-body sessions a week means you practise each lift three times weekly. Skill improves fastest with frequency, and beginners adapt from very little volume — the limit is recovery from learning, not from load. Doing less, more often, beats doing more, less often, at this stage.',
  schedule: [
    { day: 'Mon', dayIndex: 1, dayId: 'beg-a', label: 'Workout A' },
    { day: 'Tue', dayIndex: 2, label: 'Rest' },
    { day: 'Wed', dayIndex: 3, dayId: 'beg-b', label: 'Workout B' },
    { day: 'Thu', dayIndex: 4, label: 'Rest' },
    { day: 'Fri', dayIndex: 5, dayId: 'beg-a', label: 'Workout A' },
    { day: 'Sat', dayIndex: 6, label: 'Rest or walk' },
    { day: 'Sun', dayIndex: 0, label: 'Rest' },
  ],
  alternativeSchedules: ['Tue · Thu · Sat — same A/B/A alternation'],
  days: [beginnerA, beginnerB],
  blocks: [
    {
      id: 'beg-b1',
      label: 'Block 1 · Learn and add',
      weeks: [1, 2, 3, 4],
      headline: 'Technique first, then small additions every session.',
      detail:
        'Week 1 the weights should feel too easy — record your starting numbers at RPE 5–6. Week 2 begin adding. Week 3 is the first genuinely hard week. Week 4 push the top set and keep the rest controlled, RPE 8.',
      adjustments: ['Week 1: RPE 5–6 throughout', 'Weeks 2–4: add load every session where the RPE allows'],
    },
    {
      id: 'beg-dl1',
      label: 'Week 5 · Deload',
      weeks: [5],
      headline: 'Same exercises, two sets, ~80% load, RPE 6.',
      detail:
        'You should leave the gym feeling like you did not do enough. That is correct — this is where the adaptation catches up.',
      deload: true,
      overrides: [{ setDelta: -1, loadFactor: 0.8, rpe: '6' }],
    },
    {
      id: 'beg-b2',
      label: 'Block 2 · Add volume',
      weeks: [6, 7, 8, 9],
      headline: 'Main lifts go from three sets to four.',
      detail:
        'Start at roughly week-4 weights and add again each session, RPE 7–8. That single change is the whole progression in volume — beginners do not need more than this.',
      adjustments: ['4 × 5 on squat, bench and overhead press', '4 × 8 on RDL, rows and pulldown'],
      overrides: [{ tier: 'compound', sets: 4 }],
    },
    {
      id: 'beg-dl2',
      label: 'Week 10 · Deload',
      weeks: [10],
      headline: 'Two sets, ~80%, RPE 6.',
      detail: 'Same as week 5. Sessions should take 35–40 minutes.',
      deload: true,
      overrides: [{ setDelta: -2, loadFactor: 0.8, rpe: '6' }],
    },
    {
      id: 'beg-b3',
      label: 'Block 3 · Test and reassess',
      weeks: [11, 12],
      headline: 'Drop to triples at RPE 8–9, then a heavy top set of 3.',
      detail:
        'Heavier than you have handled, fewer reps so it stays clean. Accessories stay at 3 × 8. In week 12 take one heavy top set of 3 on each main lift, leaving one rep in reserve — not to failure.',
      adjustments: ['Squat, bench and deadlift/RDL: 3 × 3 at RPE 8–9', 'Accessories unchanged at 3 × 8'],
      overrides: [{ tier: 'compound', sets: 3, repsMin: 3, repsMax: 3, target: '3', rpe: '8–9' }],
    },
  ],
  progressionRules: [
    'Add weight every session you hit all prescribed reps at or below the target RPE.',
    'Squat, deadlift, RDL: +2.5 kg (5 lb).',
    'Bench, row, overhead press: +1.25–2.5 kg. Fractional plates are worth owning here.',
    'Lat pulldown, carries, isolation: +2.5 kg or the machine\u2019s smallest increment.',
    'Missed the reps? Repeat the same weight next session.',
    'Missed twice? Drop to 3 × 3 at the same load, then rebuild to 3 × 5 over two weeks.',
    'Stuck three weeks? Take 10% off and climb back — you will pass the old number in a few weeks.',
  ],
  increments: [
    { lift: 'Squat, deadlift, RDL', amount: '+2.5 kg / +5 lb per session' },
    { lift: 'Bench, row, OHP', amount: '+1.25–2.5 kg / +2.5–5 lb per session' },
    { lift: 'Pulldown, carries, isolation', amount: '+2.5 kg or smallest increment' },
  ],
  notes: [
    'Never reorder the exercises — biggest and most technical first while you are fresh.',
    'Soreness in weeks 1–2 is normal. It is novelty, not damage. Train through mild soreness.',
    'Sharp pain, or pain in a joint, is not normal. Stop the set and swap the exercise.',
    'Eat enough. Beginners building strength in a deficit progress slowly — aim for 1.6–2.2 g protein per kg.',
    'Do not add days. Three sessions is the programme; a fourth costs recovery and buys nothing.',
    'Starting weights: empty bar (20 kg) for squat, bench, RDL and OHP; 30–40 kg on the pulldown. Your first three sessions are the assessment.',
  ],
  sourceFile: 'programs/beginner-full-body-3day.md',
}

/* ------------------------------------------------------------------ *
 * 2 · Intermediate Upper/Lower — 4 days/week, 8-week cycle
 * ------------------------------------------------------------------ */

const TOP_SET = '1 top set, then 3 back-off sets at −10%'
const TOP_SET_DL = '1 top set, then 2 back-off sets at −10%'

const upperA: ProgramDay = {
  id: 'int-upper-a',
  name: 'Upper A — strength',
  badge: 'UA',
  emphasis: 'upper',
  summary: 'Heavy bench and weighted pull-ups, then a press, a row and arms.',
  estimatedMin: 70,
  exercises: [
    px('bench-press', 4, '5', '8 top / 7 back-off', 180, { scheme: TOP_SET }),
    px('weighted-pull-up', 4, '5', '8', 165, {
      scheme: 'Use a heavy lat pulldown if weighted pull-ups are not available yet',
    }),
    px('overhead-press', 3, '6', '8', 120, { scheme: 'Seated or standing' }),
    px('chest-supported-row', 3, '8', '8', 90, { scheme: 'Or one-arm DB row' }),
    px('incline-db-curl', 2, '10–12', '9', 60),
    px('overhead-cable-extension', 2, '10–12', '9', 60),
  ],
}

const lowerA: ProgramDay = {
  id: 'int-lower-a',
  name: 'Lower A — squat focus',
  badge: 'LA',
  emphasis: 'lower',
  summary: 'Heavy squat on a top-set/back-off scheme, then hinge, machine legs, hamstrings, calves and abs.',
  estimatedMin: 70,
  exercises: [
    px('back-squat', 4, '5', '8 top / 7 back-off', 180, { scheme: TOP_SET + '. Front squat is a valid swap' }),
    px('romanian-deadlift', 3, '8', '8', 120),
    px('leg-press', 3, '10', '8', 90, { scheme: 'Or hack squat' }),
    px('leg-curl', 3, '12', '9', 60, { scheme: 'Seated or lying' }),
    px('standing-calf-raise', 3, '10–12', '9', 60),
    px('cable-crunch', 3, '12–15', '8', 60, { scheme: 'Or hanging knee raise' }),
  ],
}

const upperB: ProgramDay = {
  id: 'int-upper-b',
  name: 'Upper B — volume',
  badge: 'UB',
  emphasis: 'upper',
  summary: 'Higher reps across the board: incline pressing, cable rows, laterals, flyes, face pulls, arms.',
  estimatedMin: 65,
  exercises: [
    px('incline-db-press', 4, '8–12', '8', 120),
    px('seated-cable-row', 4, '10–12', '8', 90),
    px('db-lateral-raise', 3, '12–15', '9', 60),
    px('pec-deck', 3, '12–15', '9', 60, { scheme: 'Or cable fly' }),
    px('face-pull', 3, '15–20', '8', 45),
    px('hammer-curl', 3, '12–15', '9', 60, { scheme: 'Superset with rope pushdown' }),
    px('rope-pushdown', 3, '12–15', '9', 60, { scheme: 'Superset with hammer curl' }),
  ],
}

const lowerB: ProgramDay = {
  id: 'int-lower-b',
  name: 'Lower B — hinge focus',
  badge: 'LB',
  emphasis: 'lower',
  summary: 'Heavy deadlift kept deliberately low-volume, then single-leg work, hip thrust, hamstrings, calves, core.',
  estimatedMin: 70,
  exercises: [
    px('conventional-deadlift', 3, '4', '8 top / 7 back-off', 210, {
      scheme: TOP_SET_DL + '. Conventional, sumo or trap bar',
    }),
    px('bulgarian-split-squat', 3, '8 per leg', '8', 120, { perSide: true, scheme: 'Or front squat' }),
    px('hip-thrust', 3, '10', '8', 90, { scheme: 'Or 45° back extension' }),
    px('leg-curl', 3, '12', '9', 60),
    px('seated-calf-raise', 3, '15', '9', 60),
    px('plank', 3, '45 s', '8', 60, { unit: 'seconds', scheme: 'Or ab-wheel 3 × 8' }),
  ],
}

const intermediateProgram: Program = {
  id: 'intermediate-upper-lower',
  name: 'Intermediate Upper/Lower',
  tagline: 'Four days, heavy and light differentiated. Where volume starts to matter.',
  level: 'intermediate',
  daysPerWeek: 4,
  totalWeeks: 8,
  equipment: ['Full gym'],
  progressionModel: 'double',
  progressionSummary:
    'Double progression within a rep range plus a weekly top set. Add reps until every set hits the top of the range, then increase the load and reset to the bottom.',
  overview:
    'For anyone with 6–12+ months of consistent training who is comfortable with the main barbell lifts and ready for more volume. An eight-week cycle: three weeks building plus a deload, twice, repeatable indefinitely.',
  whyItWorks:
    'Splitting upper and lower doubles the weekly frequency per muscle group while keeping each session recoverable. Differentiating a heavy day from a volume day means you get both a clean number to progress against and enough total work to drive adaptation — without both days being equally crushing.',
  schedule: [
    { day: 'Mon', dayIndex: 1, dayId: 'int-upper-a', label: 'Upper A' },
    { day: 'Tue', dayIndex: 2, dayId: 'int-lower-a', label: 'Lower A' },
    { day: 'Wed', dayIndex: 3, label: 'Rest' },
    { day: 'Thu', dayIndex: 4, dayId: 'int-upper-b', label: 'Upper B' },
    { day: 'Fri', dayIndex: 5, dayId: 'int-lower-b', label: 'Lower B' },
    { day: 'Sat', dayIndex: 6, label: 'Rest or easy cardio' },
    { day: 'Sun', dayIndex: 0, label: 'Rest' },
  ],
  alternativeSchedules: ['Mon Upper A · Wed Lower A · Fri Upper B · Sat Lower B'],
  days: [upperA, lowerA, upperB, lowerB],
  blocks: [
    {
      id: 'int-b1',
      label: 'Weeks 1–3 · Build',
      weeks: [1, 2, 3],
      headline: 'Establish top sets, then climb the rep ranges.',
      detail:
        'Week 1 sets your baseline — establish top-set weights and hit the bottom of every rep range. Week 2 adds reps on accessories and 2.5 kg on top sets that were RPE 8 or below. Week 3 is the hardest: top sets at RPE 8–9.',
      adjustments: ['W1: baseline, bottom of every range', 'W2: +reps on accessories, +2.5 kg on easy top sets', 'W3: top sets RPE 8–9'],
    },
    {
      id: 'int-dl1',
      label: 'Week 4 · Deload',
      weeks: [4],
      headline: 'Two sets on the first two lifts, 1–2 on accessories, ~80%, RPE 6.',
      detail: 'Sessions should take 35–40 minutes. Deloads are not optional and they are not weakness.',
      deload: true,
      overrides: [
        { positions: [0, 1], sets: 2, loadFactor: 0.8, rpe: '6' },
        { tier: 'accessory', sets: 1, loadFactor: 0.85, rpe: '6' },
        { tier: 'isolation', sets: 1, loadFactor: 0.85, rpe: '6' },
        { tier: 'core', sets: 1, loadFactor: 0.85, rpe: '6' },
      ],
    },
    {
      id: 'int-b2',
      label: 'Weeks 5–7 · Build harder',
      weeks: [5, 6, 7],
      headline: 'Restart at week-3 weights and aim for the top of every range, then add a set.',
      detail:
        'Week 5 restarts at week-3 weights aiming for the top of every rep range. Week 6 adds a set to the first two exercises of each day. Week 7 is the heaviest of the cycle — top sets at RPE 9, one rep in reserve.',
      adjustments: ['W5: top of every range', 'W6: +1 set on the first two exercises of each day', 'W7: top sets RPE 9'],
      overrides: [{ positions: [0, 1], setDelta: 1 }],
    },
    {
      id: 'int-dl2',
      label: 'Week 8 · Deload + test',
      weeks: [8],
      headline: 'Deload, then a heavy single top set of 3 on squat, bench and deadlift.',
      detail:
        'Deload as in week 4. At the end, take one heavy top triple on each main lift and record it. Then repeat the cycle starting 2.5–5 kg above your previous week-1 numbers.',
      deload: true,
      overrides: [
        { positions: [0, 1], sets: 2, loadFactor: 0.8, rpe: '6' },
        { tier: 'accessory', sets: 1, loadFactor: 0.85, rpe: '6' },
        { tier: 'isolation', sets: 1, loadFactor: 0.85, rpe: '6' },
        { tier: 'core', sets: 1, loadFactor: 0.85, rpe: '6' },
      ],
    },
  ],
  progressionRules: [
    'Double progression: add reps first, then load.',
    'When every set reaches the top of the range at the target RPE, increase the load next session and drop back to the bottom of the range.',
    'Barbell squat, deadlift, bench: +2.5 kg / 5 lb.',
    'OHP, rows, RDL: +2.5 kg, or +1 rep per set first.',
    'Dumbbell work: the next size up, or +1 rep per set at the same weight.',
    'Machines and cables: the smallest available increment.',
    'On top sets, progression can be by load or by RPE — 100 kg @ 8 becoming 100 kg @ 7.5 is real progress.',
  ],
  increments: [
    { lift: 'Squat, deadlift, bench (barbell)', amount: '+2.5 kg / 5 lb' },
    { lift: 'OHP, rows, RDL', amount: '+2.5 kg, or +1 rep per set' },
    { lift: 'Dumbbell work', amount: 'Next size up, or +1 rep per set' },
    { lift: 'Machines, cables', amount: 'Smallest available increment' },
  ],
  notes: [
    'Never put Lower A and Lower B back to back — the day between them is doing real work.',
    'Upper A is heavy, Upper B is volume. Same for lower. If both days feel equally hard you are not differentiating them.',
    'Deadlift volume is deliberately low. Two to three hard sets is plenty.',
    'This is roughly 16–20 hard sets per muscle group per week. If you are not recovering, cut Upper B and Lower B accessories first — never the main lifts.',
    'Cardio is fine and encouraged: 2–3 sessions of 20–30 min easy work. Keep it genuinely easy.',
    'Change accessories freely; change main lifts rarely. Run two or three cycles before rotating the top exercise.',
    'Log every top set — two months of top-set numbers tells you more than how you feel on any given day.',
  ],
  sourceFile: 'programs/intermediate-upper-lower-4day.md',
  unlockId: 'program-intermediate',
}

/* ------------------------------------------------------------------ *
 * 3 · Home Minimal-Equipment — 3–4 days/week, rolling 4-week blocks
 * ------------------------------------------------------------------ */

const homeA: ProgramDay = {
  id: 'home-a',
  name: 'Workout A — push + squat emphasis',
  badge: 'A',
  emphasis: 'full',
  summary: 'Squat and push-up variations on their ladders, a row, split squats, vertical push, plank.',
  estimatedMin: 45,
  exercises: [
    px('box-squat', 3, '8–15', '8', 90, { tempo: '3-1-X', scheme: 'Use your current rung on the squat ladder' }),
    px('push-up', 3, '8–20', '8', 90, { tempo: '2-0-1', scheme: 'Use your current rung on the push-up ladder' }),
    px('doorway-row', 3, '8–15', '8', 60, { tempo: '2-1-2', scheme: 'Inverted row or band row if you have one' }),
    px('reverse-lunge', 3, '8–12 per leg', '8', 60, { perSide: true, tempo: '2-0-1' }),
    px('pike-push-up', 3, '6–12', '8', 60, { tempo: '2-0-1', scheme: 'Or band overhead press' }),
    px('plank', 3, '30–60 s', '—', 45, { unit: 'seconds' }),
  ],
}

const homeB: ProgramDay = {
  id: 'home-b',
  name: 'Workout B — hinge + pull emphasis',
  badge: 'B',
  emphasis: 'full',
  summary: 'Hinge and pull variations, a press, single-leg hinge, laterals, anterior and lateral core.',
  estimatedMin: 45,
  exercises: [
    px('glute-bridge', 3, '10–20', '8', 90, { tempo: '3-1-1', scheme: 'Progress to single-leg, then to a loaded RDL' }),
    px('pull-up-negative', 3, '5–12', '8', 90, { tempo: '2-1-2', scheme: 'Pull-up, band pulldown or doorway row' }),
    px('push-up', 3, '8–15', '8', 60, { tempo: '2-0-1', scheme: 'Elevated hands, or DB floor press if you have one' }),
    px('single-leg-rdl', 3, '8–12 per leg', '8', 60, { perSide: true, tempo: '3-1-1', scheme: 'Or good morning with a band' }),
    px('db-lateral-raise', 3, '12–20', '9', 45, { tempo: '2-1-2', scheme: 'Band, dumbbell or water bottles' }),
    px('dead-bug', 3, '8 per side', '—', 45, { perSide: true, scheme: 'Plus side plank 3 × 30 s' }),
  ],
}

const homeProgram: Program = {
  id: 'home-minimal-equipment',
  name: 'Home Minimal-Equipment',
  tagline: 'No barbell, no problem. Progress by making the movement harder, not heavier.',
  level: 'home',
  daysPerWeek: 3,
  totalWeeks: 4,
  equipment: ['Bodyweight', 'Resistance bands', 'One dumbbell or kettlebell', 'Optional: adjustable dumbbells + bench'],
  progressionModel: 'mechanical',
  progressionSummary:
    'Mechanical progression: harder variation, slower tempo, longer range, more reps, shorter rest, one limb instead of two. Use these in roughly that order.',
  overview:
    'For training at home with no equipment, resistance bands, or a single pair of dumbbells. Rolling four-week blocks, three to four full-body sessions a week, repeatable indefinitely.',
  whyItWorks:
    'With a barbell you progress by adding load. At home you often cannot, so you progress a different way: a longer lever, a more demanding variation, a slower eccentric, a bigger range of motion, or one limb instead of two. Each of those increases the stimulus on the target muscle without a single extra plate.',
  schedule: [
    { day: 'Mon', dayIndex: 1, dayId: 'home-a', label: 'Workout A' },
    { day: 'Tue', dayIndex: 2, label: 'Rest' },
    { day: 'Wed', dayIndex: 3, dayId: 'home-b', label: 'Workout B' },
    { day: 'Thu', dayIndex: 4, label: 'Rest' },
    { day: 'Fri', dayIndex: 5, dayId: 'home-a', label: 'Workout A' },
    { day: 'Sat', dayIndex: 6, label: 'Optional conditioning' },
    { day: 'Sun', dayIndex: 0, label: 'Rest' },
  ],
  alternativeSchedules: ['4 days: Mon A · Tue B · Thu A · Fri B'],
  days: [homeA, homeB],
  blocks: [
    {
      id: 'home-w1',
      label: 'Week 1 · Establish your rung',
      weeks: [1],
      headline: 'Bottom of every rep range, RPE 7.',
      detail:
        'Start each ladder where you can do the bottom of the rep range with 2–3 reps in reserve. That is your rung. Do not guess higher.',
    },
    {
      id: 'home-w2',
      label: 'Week 2 · Add reps or tempo',
      weeks: [2],
      headline: 'Add 1–2 reps per set, or 1 s to each lowering phase.',
      detail: 'Either lever is progress. Reps are easier to judge; tempo is harder and often more productive.',
      adjustments: ['+1–2 reps per set on any exercise still below the top of its range', 'or +1 s on every lowering phase'],
    },
    {
      id: 'home-w3',
      label: 'Week 3 · Add density',
      weeks: [3],
      headline: 'A fourth set on exercises 1 and 2, or rest cut to 60 s.',
      detail: 'Same work, less recovery, or more work in the same time. Both raise the demand.',
      overrides: [{ positions: [0, 1], setDelta: 1 }],
    },
    {
      id: 'home-w4',
      label: 'Week 4 · Push, then climb',
      weeks: [4],
      headline: 'Top of every range at RPE 9. Then repeat week 1 at the next rung up.',
      detail:
        'Wherever you hit the top of the range on all sets with clean form, climb a rung on that ladder and start the block again.',
      overrides: [{ tier: 'accessory', rpe: '9' }, { tier: 'isolation', rpe: '9' }],
    },
  ],
  progressionRules: [
    'Variation first, then tempo and range, then reps, then rest.',
    'Climb a rung when you hit the top of the range on all sets with clean form.',
    'Count reps in reserve, not reps. If you can do 25 push-ups, sets of 12 are not training you.',
    'The last rep should be slow but clean. If it is fast and easy, the set was not over.',
    'Prefer slow eccentrics to more reps — a 4-second lowering makes almost any bodyweight movement substantially harder.',
    'Every third block, take a deload week: half the sets, one rung easier, RPE 6.',
    'Tempo notation 3-1-X-1 = 3 s down, 1 s pause, explosive up, 1 s pause at the top.',
  ],
  notes: [
    'The most common failure at home is not lack of equipment — it is stopping sets too early because there is no bar to look at.',
    'Optional conditioning twice a week: ruck or brisk walk 30–45 min, a bodyweight circuit, 8–10 intervals, or 10 min of skipping.',
    'Keep conditioning genuinely easy — it should not cost you the next session.',
    'Best value kit, in order: loop resistance bands → a doorway pull-up bar → adjustable dumbbells → a bench.',
    'You can make real, multi-year progress with bands and a pull-up bar alone.',
  ],
  sourceFile: 'programs/home-minimal-equipment.md',
}

/* ------------------------------------------------------------------ *
 * Variation ladders — programs/home-minimal-equipment.md
 * ------------------------------------------------------------------ */

export interface Ladder {
  id: string
  name: string
  /** Exercise ids, easiest rung first. `null` marks a rung with no library entry. */
  rungs: { label: string; exerciseId?: string; note?: string }[]
  /** Where most people should expect to start. */
  typicalStart: number
}

export const LADDERS: readonly Ladder[] = Object.freeze([
  {
    id: 'push-up',
    name: 'Push-ups',
    typicalStart: 3,
    rungs: [
      { label: 'Wall push-up' },
      { label: 'Incline push-up (hands on a counter, table or bench)' },
      { label: 'Knee push-up' },
      { label: 'Standard push-up', exerciseId: 'push-up', note: 'Most people start here or one rung below' },
      { label: 'Feet-elevated push-up', exerciseId: 'push-up' },
      { label: 'Slow tempo (4 s down) or 1.5 reps', exerciseId: 'push-up' },
      { label: 'Archer push-up', exerciseId: 'archer-push-up' },
      { label: 'Pseudo-planche push-up (hands by the hips, lean forward)', exerciseId: 'archer-push-up' },
      { label: 'One-arm push-up progressions' },
    ],
  },
  {
    id: 'squat',
    name: 'Squats',
    typicalStart: 1,
    rungs: [
      { label: 'Box / chair squat to a high surface', exerciseId: 'box-squat' },
      { label: 'Bodyweight squat', exerciseId: 'box-squat' },
      { label: 'Tempo squat, 4 s down + 2 s pause', exerciseId: 'box-squat' },
      { label: 'Split squat', exerciseId: 'reverse-lunge' },
      { label: 'Bulgarian split squat (rear foot elevated)', exerciseId: 'bulgarian-split-squat' },
      { label: 'Shrimp squat', exerciseId: 'bulgarian-split-squat' },
      { label: 'Assisted pistol squat (hold a doorframe or band)', exerciseId: 'pistol-squat' },
      { label: 'Pistol squat', exerciseId: 'pistol-squat' },
    ],
  },
  {
    id: 'pull',
    name: 'Rows / pulls',
    typicalStart: 2,
    rungs: [
      { label: 'Doorway row', exerciseId: 'doorway-row' },
      { label: 'Bent-over band row', exerciseId: 'doorway-row' },
      { label: 'Inverted row under a sturdy table, or a sheet anchored in a door', exerciseId: 'inverted-row' },
      { label: 'Feet-elevated inverted row', exerciseId: 'inverted-row' },
      { label: 'Pull-up negatives — jump up, lower over 5 s, 3 × 5', exerciseId: 'pull-up-negative' },
      { label: 'Band-assisted pull-up', exerciseId: 'assisted-pull-up' },
      { label: 'Pull-up', exerciseId: 'pull-up' },
      { label: 'Weighted pull-up (backpack with books)', exerciseId: 'weighted-pull-up' },
    ],
  },
  {
    id: 'hinge',
    name: 'Hinges',
    typicalStart: 1,
    rungs: [
      { label: 'Glute bridge, two legs', exerciseId: 'glute-bridge' },
      { label: 'Glute bridge with a 3 s hold at the top', exerciseId: 'glute-bridge' },
      { label: 'Single-leg glute bridge', exerciseId: 'glute-bridge' },
      { label: 'Band or dumbbell Romanian deadlift', exerciseId: 'romanian-deadlift' },
      { label: 'Single-leg RDL', exerciseId: 'single-leg-rdl' },
      { label: 'Nordic curl negatives', exerciseId: 'nordic-curl' },
      { label: 'Backpack / DB RDL with a 4 s lowering', exerciseId: 'romanian-deadlift' },
    ],
  },
  {
    id: 'overhead',
    name: 'Overhead press',
    typicalStart: 1,
    rungs: [
      { label: 'Band overhead press (stand on the band)', exerciseId: 'seated-db-press' },
      { label: 'Pike push-up, feet on the floor', exerciseId: 'pike-push-up' },
      { label: 'Pike push-up, feet elevated', exerciseId: 'pike-push-up' },
      { label: 'Dumbbell / kettlebell OHP', exerciseId: 'seated-db-press' },
      { label: 'Wall-assisted handstand push-up', exerciseId: 'handstand-push-up' },
      { label: 'Freestanding handstand push-up', exerciseId: 'handstand-push-up' },
    ],
  },
])

/* ------------------------------------------------------------------ *
 * Progression levers — programs/home-minimal-equipment.md
 * ------------------------------------------------------------------ */

export const PROGRESSION_LEVERS: readonly { lever: string; effect: string; example: string }[] = Object.freeze([
  { lever: 'Harder variation', effect: 'Increases the load on the target muscle', example: 'Push-up → feet-elevated → archer → one-arm progressions' },
  { lever: 'Tempo', effect: 'More time under tension with no extra weight', example: '3 s down, 1 s pause, up — a 310 tempo' },
  { lever: 'Range of motion', effect: 'Longer lever, more work per rep', example: 'Push-ups on book stacks · deep split squat' },
  { lever: 'Reps', effect: 'Takes the set further', example: '8 → 12 → 20' },
  { lever: 'Rest', effect: 'Same work, less recovery', example: '90 s → 45 s between sets' },
  { lever: 'Unilateral', effect: 'Doubles the effective load', example: 'Two-leg bridge → single-leg bridge' },
  { lever: '1.5 reps', effect: 'An extra partial in the stretched position', example: 'Down, up halfway, back down, all the way up = 1 rep' },
])

/** Main-lift rotation table — programs/intermediate-upper-lower-4day.md */
export const MAIN_LIFT_ROTATIONS: readonly { lift: string; exerciseId: string; rotations: string[] }[] = Object.freeze([
  { lift: 'Bench press', exerciseId: 'bench-press', rotations: ['Close-grip bench', 'Paused bench', 'DB bench', 'Incline barbell'] },
  { lift: 'Back squat', exerciseId: 'back-squat', rotations: ['Front squat', 'High-bar / pause squat', 'Safety-bar squat', 'Hack squat'] },
  { lift: 'Deadlift', exerciseId: 'conventional-deadlift', rotations: ['Trap bar', 'Sumo', 'Deficit', 'Block pull', 'Heavy RDL'] },
  { lift: 'Overhead press', exerciseId: 'overhead-press', rotations: ['Push press', 'Seated DB press', 'Z-press', 'Incline DB'] },
  { lift: 'Pull-up', exerciseId: 'pull-up', rotations: ['Weighted', 'Neutral-grip', 'Chest-supported row', 'Heavy pulldown'] },
])

export const PROGRAMS: readonly Program[] = Object.freeze([beginnerProgram, intermediateProgram, homeProgram])

export const PROGRAM_MAP: Readonly<Record<string, Program>> = Object.freeze(
  Object.fromEntries(PROGRAMS.map((p) => [p.id, p])),
)

export function getProgram(id?: string | null): Program | undefined {
  return id ? PROGRAM_MAP[id] : undefined
}

export function getDay(programId: string, dayId: string): ProgramDay | undefined {
  return PROGRAM_MAP[programId]?.days.find((d) => d.id === dayId)
}

export const LEVEL_LABELS: Record<Program['level'], string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  home: 'Home / No equipment',
}

export const PROGRESSION_MODEL_LABELS: Record<Program['progressionModel'], string> = {
  linear: 'Linear — add load',
  double: 'Double progression — add reps, then load',
  mechanical: 'Mechanical — harder variation, tempo, range',
}
