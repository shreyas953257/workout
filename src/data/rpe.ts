/**
 * RPE / RIR scale — transcribed from `reference/progression-rpe-deload.md`.
 *
 * Used by the session screen's RPE picker, the exercise log, and the
 * "how to estimate RIR" panel.
 */

export interface RpeStep {
  rpe: number
  rir: string
  description: string
  usage: string
  /** Visual intensity 0–1, for the picker's heat colouring. */
  intensity: number
}

export const RPE_SCALE: readonly RpeStep[] = Object.freeze([
  {
    rpe: 10,
    rir: '0',
    description: 'No reps left. Form broke down or nearly did.',
    usage: 'Almost never. Occasionally on a final isolation set.',
    intensity: 1,
  },
  {
    rpe: 9.5,
    rir: '0',
    description: 'Could not have done another rep, but might have added 1–2 kg.',
    usage: 'Testing days.',
    intensity: 0.95,
  },
  {
    rpe: 9,
    rir: '1',
    description: 'One more clean rep available.',
    usage: 'Hardest working sets; final week of a block.',
    intensity: 0.85,
  },
  {
    rpe: 8.5,
    rir: '1–2',
    description: 'Definitely one more, maybe two.',
    usage: 'Late in a building block.',
    intensity: 0.75,
  },
  {
    rpe: 8,
    rir: '2',
    description: 'Two more reps, form stays clean.',
    usage: 'The default for most hard sets.',
    intensity: 0.62,
  },
  {
    rpe: 7.5,
    rir: '2–3',
    description: 'Two or three more.',
    usage: 'Early weeks of a block.',
    intensity: 0.5,
  },
  {
    rpe: 7,
    rir: '3',
    description: 'Three more, comfortable and controlled.',
    usage: 'Main-lift back-off sets, weeks 1–2.',
    intensity: 0.38,
  },
  {
    rpe: 6,
    rir: '4+',
    description: 'Several more in the tank.',
    usage: 'Deloads, technique work, ramp sets.',
    intensity: 0.24,
  },
  {
    rpe: 5,
    rir: '5+',
    description: 'Easy. Warm-up territory.',
    usage: 'Ramp-up sets only.',
    intensity: 0.12,
  },
])

/** Values offered by the in-session picker — whole and half steps, easiest first. */
export const RPE_OPTIONS: readonly number[] = Object.freeze([5, 6, 7, 7.5, 8, 8.5, 9, 9.5, 10])

export function rpeStep(rpe: number): RpeStep | undefined {
  return RPE_SCALE.find((s) => s.rpe === rpe)
}

export function rpeLabel(rpe?: number): string {
  if (rpe == null) return '—'
  const step = rpeStep(rpe)
  return step ? `RPE ${rpe} · ${step.rir} in reserve` : `RPE ${rpe}`
}

/**
 * Rules of thumb — reference/progression-rpe-deload.md
 */
export const RPE_RULES: readonly string[] = Object.freeze([
  '80–90% of your sets should be RPE 7–9. Outside that band you are either wasting the set or burying yourself.',
  'Compounds: stay at RPE ≤ 9. A missed squat rep costs you the set, your knee, and possibly your week.',
  'Isolation and machines: RPE 9–10 is fine. Nothing falls on you, and these lifts need the extra stimulus.',
  'Week 1 of a block should feel too easy. If it is RPE 9 you have no room to progress and will stall by week 3.',
])

export const RPE_ANCHORS: readonly { cue: string; meaning: string }[] = Object.freeze([
  { cue: 'Bar speed slows visibly on the last rep', meaning: 'Roughly RPE 8–9' },
  { cue: 'Every rep moved the same speed', meaning: 'RPE 7 or below' },
  { cue: 'You had to grind, rest mid-set, or break form', meaning: 'RPE 10 — the set was too heavy' },
])

/**
 * Stalling protocol — the exact order of operations from
 * reference/progression-rpe-deload.md. Surfaced in the app when a lift misses
 * its target twice in a row.
 */
export const STALLING_STEPS: readonly { step: number; title: string; detail: string }[] = Object.freeze([
  {
    step: 1,
    title: 'Repeat the weight',
    detail:
      'One bad session is noise: sleep, food, stress, a cold coming on. Attempt the same weight and reps next session. Do not lower the weight after one miss — roughly half of "stalls" resolve here.',
  },
  {
    step: 2,
    title: 'Repeat again',
    detail:
      'Two misses in a row is a genuine stall. Check recovery first — sleep under 7 h, protein under ~1.6 g/kg, or a large deficit will stall anyone on any programme.',
  },
  {
    step: 3,
    title: 'Reduce reps, hold the load',
    detail:
      'Drop the target from 3 × 5 to 3 × 3 at the same weight. Build back to 3 × 5 over two weeks, then push the load again.',
  },
  {
    step: 4,
    title: 'Add volume elsewhere',
    detail:
      'Sometimes the answer is more practice rather than more intensity. Add one set, or a second weekly exposure — a light technique day of 3 × 5 at 70%.',
  },
  {
    step: 5,
    title: 'Reset',
    detail:
      'Stuck for 3+ weeks? Take 10% off and climb back, adding each session. You will reach the old weight in 3–4 weeks and usually push straight past it. A reset is not failure.',
  },
  {
    step: 6,
    title: 'Change something bigger',
    detail:
      'Only after steps 1–5 and only if stuck 6–8 weeks: rotate the lift for a close variant, change the rep range, increase frequency, or take a full week off.',
  },
])

/**
 * Deload checklist — reference/progression-rpe-deload.md#how-to-deload
 */
export const DELOAD_RULES: readonly { variable: string; change: string }[] = Object.freeze([
  { variable: 'Sets', change: 'Halve them (3 → 2, or 4 → 2)' },
  { variable: 'Load', change: '~80% of your last hard week' },
  { variable: 'RPE', change: '6 — nothing hard' },
  { variable: 'Exercises', change: 'Keep them the same. Do not swap in "fun" movements' },
  { variable: 'Accessories', change: 'Cut to 1–2 sets or drop entirely' },
  { variable: 'Cardio', change: 'Keep it, easy only' },
  { variable: 'Duration', change: 'One week. Two if you are genuinely battered' },
])

export const DELOAD_SIGNS: readonly string[] = Object.freeze([
  'Lifts down 5%+ across two or more consecutive sessions',
  'Sleeping badly despite being tired, or waking unrefreshed',
  'Joint pain — achy shoulders, elbows, knees — distinct from muscle soreness',
  'Resting heart rate noticeably above your normal',
  'You dread the gym rather than looking forward to it',
  'Appetite gone, or you have caught a cold',
  'Motivation is fine but the weights simply will not move',
])

export const DELOAD_TRIGGER_COUNT = 3

/**
 * Epley estimate: 1RM = weight × (1 + reps ÷ 30).
 * From reference/progression-rpe-deload.md#estimated-1-rep-max.
 */
export function estimatedOneRepMax(weight: number, reps: number): number {
  if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) return 0
  if (reps === 1) return Math.round(weight * 10) / 10
  // The formula diverges at high rep counts; cap the estimate at 10 reps.
  const effectiveReps = Math.min(reps, 10)
  return Math.round(weight * (1 + effectiveReps / 30) * 10) / 10
}
