# workout

A plain-Markdown training system: programs, reference material, and workout logs — all version controlled.

No app, no database, no subscription. Just text files you can read on your phone mid-set, edit from anywhere, and `git diff` later to see exactly how your training changed over a year.

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

## Getting this onto GitHub

The repo is already initialized with a first commit. To publish it:

```bash
# 1. Create an EMPTY repo named "workout" on github.com (no README, no .gitignore, no license)

# 2. Point origin at it — replace YOUR_USERNAME
git remote add origin git@github.com:YOUR_USERNAME/workout.git

# 3. Fix the commit author if you want it attributed to your account
git config user.name  "Your Name"
git config user.email "you@example.com"
git commit --amend --reset-author --no-edit

# 4. Push
git push -u origin main
```

Already have an `origin` placeholder set? Use `git remote set-url origin <url>` instead of `git remote add`.

> **Private or public?** This log can contain body weight and measurements. If that matters to you, make the repo **private** — Settings → Danger Zone → Change visibility.

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
