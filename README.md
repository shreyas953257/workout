# Forge — a workout app built on a Markdown handbook

**Forge** is an offline-first training log. The Markdown files in this repository are the handbook it is built around — every programme, exercise, warm-up menu, RPE rule and deload sign was transcribed from them, and they are still readable inside the app at **Handbook**.

The original plain-text system is unchanged: read the files on GitHub, print them, or edit them by hand. The app adds the parts a text file cannot do — a live session with a rest timer, automatic personal-record detection, XP and levels that come only from sessions you actually logged, streaks from real training dates, achievements, unlocks, goals that track themselves, and charts that read your own log.

```bash
npm install --legacy-peer-deps   # dev environment
npm run dev                      # http://localhost:5173
npm test                         # 371 tests
npm run build && npm run preview  # production build on :4173
```

---

## What it does

| Section | What is real about it |
|---|---|
| **Dashboard** | Today's prescribed day, streak, level, weekly activity, recent sessions, recent records and goal progress — all derived from the log, nothing seeded |
| **Programmes** | The three plans from `programs/`, with blocks, deloads, progression rules and its source document linked. Start any day directly |
| **Live session** | Per-set reps, weight, RPE and notes; the previous session's numbers beside each set; rest timer with pause, skip and auto-start; warm-up and cool-down suggestions; finish to bank XP |
| **Exercise library** | 64 exercises with setup, cues, common mistakes, substitutions in both directions, warm-up menus and a pain-triage table |
| **XP and levels** | Fixed curve (`50·(n−1)·n`), set XP by tier and RPE, bonuses for finishing, volume, records, streak milestones and goals. Every award is itemised in the XP ledger |
| **Streaks** | Distinct training dates. A streak that ran to yesterday still counts; today is only added once you train |
| **Records** | Heaviest set, most reps, best estimated 1RM (Epley) and best volume, per exercise, detected from your sets. First-ever performance sets a baseline and does **not** count as a record |
| **Achievements** | 46 achievements, 6 335 XP, re-evaluated whenever the log changes — so deleting a session can take one back |
| **Goals** | Counting metrics (sessions, sets, volume, time) count from the day the goal was created; live metrics (streak, level, bodyweight, best lift) read the present. 14 templates come straight from `goals.md` |
| **History and calendar** | Searchable history grouped by month, reopenable sessions, a month grid and a year heatmap |
| **Analytics** | Volume, XP, RPE, frequency, weekday and time-of-day distributions, muscle and pattern balance, and per-exercise progression across four metrics |
| **Unlocks** | Programmes, advanced variations, five extra themes and two chart features, with an unlock history that records what was earned, when, and at which level and XP |
| **Docs** | All 14 Markdown files rendered in-app with a table of contents, still the source of truth |

## Honesty rules the app follows

These are enforced in code and covered by tests, not just promised in a README:

- **No invented numbers.** Nothing is randomly generated, seeded or estimated for display. If it is on screen, it came from a session you logged.
- **Empty stays empty.** Sessions with no completed sets earn no XP, no streak day, no record and no achievement; all-skipped sessions are ignored entirely.
- **Deletions are real.** Removing a session recalculates XP, level, streak, records, achievements and unlocks from what remains — including losing an unlock it had earned.
- **Corrupt data never crashes.** Bad records are dropped and reported, corrupt preferences are repaired, and the original file is kept under `forge.workout.v1.corrupt`.
- **Imports are validated.** A `forge-workout` export, a bare `{sessions, goals}` object or a bare array are all accepted; anything unparseable is rejected with a reason instead of throwing.
- **Nothing essential is locked.** Every programme except one, plus all themes, can be earned by training; the default theme is always free.

## Architecture

```
src/
  data/       exercises, programmes, levels, XP rules, RPE chart, themes, achievements, unlocks,
              goal templates, and the Markdown files themselves (imported with ?raw)
  lib/        pure logic: xp, levels, streaks, prs, goals, achievements, unlocks, program,
              analytics, stats, progress, validation, importExport, storage, dates, format
  lib/store.ts  a useSyncExternalStore store — the only mutable state in the app
  components/ ui/ · charts/ · layout/ · markdown/ · gamification/ · workout/ · pages/
  styles/     tokens, six themes, and one global stylesheet
tests/        12 suites: xp, levels, streaks, prs, achievements, progress, storage,
              importExport, validation, data integrity, smoke, and route rendering
public/       sw.js (offline cache), manifest.webmanifest, icon.svg
```

**Derived, never stored.** Storage holds only sessions, goals, profile, preferences and acknowledged notifications. XP, levels, streaks, records, achievements, unlocks and every chart are computed by replaying that log in chronological order, which is why deleting history is always consistent with what the app displays.

**Stack:** React 19, TypeScript (strict), React Router, Vite, Vitest. No chart library (charts are hand-rolled SVG), no state library, no CSS framework, no fonts or assets from a CDN. Hash routing and a relative base URL, so the built app runs from any path — including straight off disk.

**Accessibility:** keyboard-navigable throughout, labelled controls, visible focus, `prefers-reduced-motion` respected (with an override in Settings), and contrast checked against the dark theme. Charts carry text descriptions of their data.

**Offline:** the production build registers a service worker that precaches the shell and serves hashed assets cache-first, so it opens and works with no connection. All data lives in `localStorage` — there is no account and no server.

---

## The original Markdown system

A plain-Markdown training system: programs, reference material, and workout logs — all version controlled.

No app, no database, no subscription. Just text files you can read on your phone mid-set, edit from anywhere, and `git diff` later to see exactly how your training changed over a year.

> Prefer the files alone? Delete `src/`, `public/`, `tests/` and the `package.json` and you are back to exactly that system — nothing in the handbook depends on the app.

---

## Start here

1. Set your targets in **[goals.md](goals.md)** — 2 minutes, keeps everything else honest.
2. Pick a program from the table below and read **[getting-started.md](getting-started.md)**.
3. Before each session, copy **[logs/_template.md](logs/_template.md)** into the current month's log file and fill it in as you train.

## Which program?

| If you... | Use | Days/wk | Equipment |
|---|---|---|---|
| Are newer to lifting, or returning after 6+ months off | [Beginner Full-Body](programs/beginner-full-body-3day.md) | 3 | Barbell or dumbbells + bench |
| Have 6–12+ months of consistent training and want more volume | [Intermediate Upper/Lower](programs/intermediate-upper-lower-4day.md) | 4 | Full gym |
| Train at home with little or no equipment | [Home Minimal-Equipment](programs/home-minimal-equipment.md) | 3–4 | Bodyweight, bands, or one pair of dumbbells |

Not sure? Start with the beginner program. It is not an insult — it's the fastest route to consistent progress, and the last block of it scales into intermediate work.

## Repo map

```
workout/
├── README.md                  ← you are here
├── getting-started.md         how to choose, schedule, warm up, and progress
├── goals.md                   your targets and why
├── programs/                  the training plans themselves
│   ├── beginner-full-body-3day.md
│   ├── intermediate-upper-lower-4day.md
│   └── home-minimal-equipment.md
├── reference/                 look things up mid-session
│   ├── exercise-library.md    cues, common errors, substitutions
│   ├── warmup-and-cooldown.md ramping sets, mobility, cooldown
│   └── progression-rpe-deload.md  RPE/RIR, progression rules, plateaus
├── logs/                      your training history
│   ├── README.md              logging conventions
│   ├── _template.md           copy this per session
│   └── 2026-10.md             current month
└── tracking/                  longer-term trends
    ├── personal-records.md    best sets, by lift
    └── body-measurements.md   weight, measurements, monthly check-in
```

## Conventions

- **Weights are your call.** Numbers in programs use `kg`; switch to `lb` if you prefer — just be consistent within a file.
- **`3 × 8 @ RPE 7`** means 3 sets of 8 reps, leaving about 3 reps in reserve. See the [RPE table](reference/progression-rpe-deload.md#rpe--rir-scale).
- **Never edit a logged session after the fact.** Correcting a typo is fine; rewriting history isn't. The value of the log is that it's true.
- **One file per month** in `logs/`, named `YYYY-MM.md`.

## Working with this repo

Live at **<https://github.com/Nanikumar4568/workout>** — `origin` is configured and tracking `main`. Day to day:

```bash
git add -A && git commit -m "log: week of 2026-10-05"
git push
git pull        # if you also edit from your phone or another machine
```

**On a new machine:**

```bash
git clone https://github.com/Nanikumar4568/workout.git
```

**Re-pointing origin** (if the repo ever moves):

```bash
git remote set-url origin https://github.com/YOUR_USERNAME/workout.git
```

> **⚠️ This repo is public.** The programs and reference are meant to be, but `logs/` and `tracking/body-measurements.md` will eventually hold your bodyweight, measurements, and training notes. Two options:
> - Make the repo **private** — Settings → Danger Zone → Change visibility
> - Keep it public and exclude your personal numbers — uncomment the two lines at the bottom of `.gitignore`
>
> Both are one-line changes. Do it before you log your first weigh-in, not after.

## Daily workflow

```bash
# Start a session
cp logs/_template.md /tmp/session.md   # or just paste the template into logs/2026-10.md

# End of the week
git add -A && git commit -m "log: week of 2026-10-05"
git push

# See how a lift has trended
git log --oneline -- tracking/personal-records.md
```

---

*Not medical advice. If you have an injury, a health condition, or you're new to exercise, check with a professional first — and stop any movement that causes sharp or joint pain.*
