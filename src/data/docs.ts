/**
 * Bridge to the original Markdown library.
 *
 * The documents that this application was built from stay exactly where they
 * are in the repository. They are imported here as raw strings — no copying, no
 * duplication, no drift — and rendered in-app at `/docs`. Editing the Markdown
 * file changes what the app shows.
 */

import readmeRaw from '../../README.md?raw'
import gettingStartedRaw from '../../getting-started.md?raw'
import goalsRaw from '../../goals.md?raw'

import beginnerRaw from '../../programs/beginner-full-body-3day.md?raw'
import intermediateRaw from '../../programs/intermediate-upper-lower-4day.md?raw'
import homeRaw from '../../programs/home-minimal-equipment.md?raw'

import exerciseLibraryRaw from '../../reference/exercise-library.md?raw'
import progressionRaw from '../../reference/progression-rpe-deload.md?raw'
import warmupRaw from '../../reference/warmup-and-cooldown.md?raw'

import logsReadmeRaw from '../../logs/README.md?raw'
import logsTemplateRaw from '../../logs/_template.md?raw'
import logsMonthRaw from '../../logs/2026-10.md?raw'

import prsRaw from '../../tracking/personal-records.md?raw'
import measurementsRaw from '../../tracking/body-measurements.md?raw'

export type DocGroup = 'start' | 'programs' | 'reference' | 'logs' | 'tracking'

export interface DocPage {
  id: string
  title: string
  group: DocGroup
  /** Repository-relative path, shown in the UI and used for the "edit source" link. */
  path: string
  summary: string
  content: string
  /** Programmes and reference pages link to the in-app equivalent. */
  relatedRoute?: string
  relatedLabel?: string
}

export const DOC_GROUPS: readonly { id: DocGroup; label: string; blurb: string }[] = Object.freeze([
  { id: 'start', label: 'Start here', blurb: 'How to choose a programme, schedule the week, warm up and progress.' },
  { id: 'programs', label: 'Programmes', blurb: 'The full written plans, including every block and progression rule.' },
  { id: 'reference', label: 'Reference', blurb: 'Exercise library, warm-up and cooldown, RPE, deloads and plateau troubleshooting.' },
  { id: 'logs', label: 'Logs', blurb: 'The Markdown logging system this app replaces — kept as a paper backup.' },
  { id: 'tracking', label: 'Tracking', blurb: 'Personal record and body measurement worksheets.' },
])

export const DOCS: readonly DocPage[] = Object.freeze([
  {
    id: 'getting-started',
    title: 'Getting Started',
    group: 'start',
    path: 'getting-started.md',
    summary: 'The operating manual: choosing a programme, scheduling, session structure, progression, deloads and the first four weeks.',
    content: gettingStartedRaw,
  },
  {
    id: 'goals-worksheet',
    title: 'Goals Worksheet',
    group: 'start',
    path: 'goals.md',
    summary: 'The written goals worksheet — the "one thing", constraints, non-negotiables and review notes.',
    content: goalsRaw,
    relatedRoute: '/goals',
    relatedLabel: 'Open the interactive goals board',
  },
  {
    id: 'readme',
    title: 'Repository Overview',
    group: 'start',
    path: 'README.md',
    summary: 'What this repository is, how the app and the Markdown library fit together, and how to run it.',
    content: readmeRaw,
  },

  {
    id: 'beginner-full-body',
    title: 'Beginner Full-Body — 3 Days',
    group: 'programs',
    path: 'programs/beginner-full-body-3day.md',
    summary: 'Twelve weeks, two alternating full-body sessions, linear progression, deloads at weeks 5 and 10.',
    content: beginnerRaw,
    relatedRoute: '/programs/beginner-full-body',
    relatedLabel: 'Open this programme in the app',
  },
  {
    id: 'intermediate-upper-lower',
    title: 'Intermediate Upper/Lower — 4 Days',
    group: 'programs',
    path: 'programs/intermediate-upper-lower-4day.md',
    summary: 'An eight-week cycle of heavy and volume days, top-set/back-off schemes, double progression.',
    content: intermediateRaw,
    relatedRoute: '/programs/intermediate-upper-lower',
    relatedLabel: 'Open this programme in the app',
  },
  {
    id: 'home-minimal-equipment',
    title: 'Home Minimal-Equipment',
    group: 'programs',
    path: 'programs/home-minimal-equipment.md',
    summary: 'Rolling four-week blocks with no barbell required — variation ladders, tempo and density progression.',
    content: homeRaw,
    relatedRoute: '/programs/home-minimal-equipment',
    relatedLabel: 'Open this programme in the app',
  },

  {
    id: 'exercise-library',
    title: 'Exercise Library (source)',
    group: 'reference',
    path: 'reference/exercise-library.md',
    summary: 'The original prose: setup, cues, common errors, depth standards, substitutions and the pain triage table.',
    content: exerciseLibraryRaw,
    relatedRoute: '/exercises',
    relatedLabel: 'Open the searchable exercise library',
  },
  {
    id: 'progression-rpe-deload',
    title: 'Progression, RPE & Deloads (source)',
    group: 'reference',
    path: 'reference/progression-rpe-deload.md',
    summary: 'The RPE/RIR scale, the four progression models, the stalling protocol, deload rules and plateau troubleshooting.',
    content: progressionRaw,
  },
  {
    id: 'warmup-and-cooldown',
    title: 'Warm-Up & Cooldown (source)',
    group: 'reference',
    path: 'reference/warmup-and-cooldown.md',
    summary: 'Three-stage warm-up, ramp-set templates, mobility menus by session type, cooldown and what stretching actually does.',
    content: warmupRaw,
  },

  {
    id: 'logs-readme',
    title: 'Logging Conventions',
    group: 'logs',
    path: 'logs/README.md',
    summary: 'Notation, commit messages, review cadence and a full worked example entry.',
    content: logsReadmeRaw,
    relatedRoute: '/history',
    relatedLabel: 'Open your workout history',
  },
  {
    id: 'logs-template',
    title: 'Session Template',
    group: 'logs',
    path: 'logs/_template.md',
    summary: 'The Markdown session template — kept so you can log on paper or in a plain text editor.',
    content: logsTemplateRaw,
  },
  {
    id: 'logs-2026-10',
    title: 'October 2026 Log',
    group: 'logs',
    path: 'logs/2026-10.md',
    summary: 'The pre-dated monthly Markdown log, including the month-review checklist.',
    content: logsMonthRaw,
  },

  {
    id: 'personal-records',
    title: 'Personal Records Worksheet',
    group: 'tracking',
    path: 'tracking/personal-records.md',
    summary: 'The Markdown PR tables and the milestone checklist — mirrored by the app\u2019s automatic PR detection.',
    content: prsRaw,
    relatedRoute: '/profile',
    relatedLabel: 'See your detected records',
  },
  {
    id: 'body-measurements',
    title: 'Body Measurements Worksheet',
    group: 'tracking',
    path: 'tracking/body-measurements.md',
    summary: 'Weekly-average weigh-in protocol, tape-measurement positions and how to read the trend.',
    content: measurementsRaw,
  },
])

export const DOC_MAP: Readonly<Record<string, DocPage>> = Object.freeze(
  Object.fromEntries(DOCS.map((d) => [d.id, d])),
)

export function getDoc(id: string): DocPage | undefined {
  return DOC_MAP[id]
}

export function docsInGroup(group: DocGroup): DocPage[] {
  return DOCS.filter((d) => d.group === group)
}

/** Rough reading time at 220 wpm, from the source Markdown. */
export function readingTime(content: string): number {
  const words = content.trim().split(/\s+/).length
  return Math.max(1, Math.round(words / 220))
}
