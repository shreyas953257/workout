# Logs

Your training history. The most valuable folder in this repo — a year of honest logs will tell you more than any program ever will.

- [Conventions](#conventions)
- [How to log a session](#how-to-log-a-session)
- [Notation](#notation)
- [Committing](#committing)
- [Reviewing](#reviewing)

---

## Conventions

| Rule | Why |
|---|---|
| **One file per month**, named `YYYY-MM.md` (e.g. `2026-10.md`) | Long enough to show trends, short enough to open quickly |
| **Copy [_template.md](_template.md)** for each session | Same shape every time makes the file scannable and diffable |
| **Log during the session**, not afterwards | By set five you have forgotten set three |
| **Never rewrite a logged session** | The log's only value is that it's true. Typos are fine to fix; history isn't |
| **Log missed sessions too** | A gap you can't explain is a gap you'll repeat |
| **One line of notes per session** | "Slept 5 h, knee sore" explains numbers better than the numbers do |

## How to log a session

**1.** Open this month's file ([2026-10.md](2026-10.md)) — or create `YYYY-MM.md` from [_template.md](_template.md) if it's a new month.

**2.** Paste a session block at the bottom:

```bash
# From the repo root
cat logs/_template.md >> logs/2026-10.md
```

Or copy the session section from the template file manually — on your phone at the gym, that's usually faster.

**3.** Fill in the working sets as you go. Weight × reps per set, plus RPE on your hardest set.

**4.** Write the three closing lines: how it went, what to change, what's next.

**5.** Commit at least weekly:

```bash
git add -A && git commit -m "log: week of 2026-10-05"
```

## Notation

| Written | Means |
|---|---|
| `60 × 5, 5, 5` | Three sets of five at 60 kg |
| `60 × 5/5/4 @ 9` | Sets of 5, 5, 4 — top set was RPE 9 (missed a rep) |
| `28 × 12, 11, 10` | Descending reps as fatigue builds — normal and fine |
| `+2.5` | Added 2.5 kg versus last session |
| `=` | Same as last session |
| `−5%` | Backed off 5% |
| `@ 8` | RPE 8 — see [the scale](../reference/progression-rpe-deload.md#rpe--rir-scale) |
| `AMRAP 8` | As many reps as possible, stopped at 8 |
| `→ 3 × 3` | Changing the target next session |
| `MISS` | Skipped session |
| `DL` | Deload week |

**Units:** kg throughout unless you change it. If you switch to lb, note it at the top of the file so the numbers stay comparable.

## Committing

Message format — short and consistent, so `git log` reads as a training diary:

```
log: week of 2026-10-05
log: 2026-10-14 upper A — bench 82.5 × 5 PR
program: block 2, added 4th set to squats
tracking: October measurements
goals: reviewed, cut to 3 days/week
```

Useful commands:

```bash
git log --oneline -20                        # recent history
git log --oneline --since="1 month ago"      # last month of training
git log -p -- logs/2026-10.md                # how the month's file evolved
git log --oneline -- tracking/personal-records.md   # PR history
git diff HEAD~1 -- logs/                     # what changed since last commit
```

## Reviewing

### Weekly — 2 minutes

Before the first session of the week, read last week's entries:

- Did I complete the sessions I planned?
- Did the main lifts go up in load or reps?
- Any joint pain, poor sleep, or notes I keep repeating?

Then write one adjustment for this week. One — not five.

### Monthly — 15 minutes

At the end of each month:

1. Count sessions completed vs. planned. Anything under ~80% is a scheduling problem, not a training problem — fix the calendar, not the program.
2. Move any new best sets into [tracking/personal-records.md](../tracking/personal-records.md).
3. Update [tracking/body-measurements.md](../tracking/body-measurements.md).
4. Write a short review note in [goals.md §7](../goals.md#7-review-notes).
5. Start next month's file: `cp logs/_template.md logs/YYYY-MM.md` and keep only the template's header.

### Quarterly — 30 minutes

Read three months of logs end to end. The patterns that show up are almost never the ones you'd have guessed: the sessions you skip are always the same weekday, your lifts dip every time work gets busy, your knee complains after the second week of every block. Those are the things worth designing around.

---

## Example entry

```markdown
## 2026-10-05 (Mon) — Upper A · Week 1

**Slept:** 7 h · **Energy:** 3/5 · **Bodyweight:** 78.4 kg

| Exercise | Set 1 | Set 2 | Set 3 | Set 4 | RPE | Notes |
|---|---|---|---|---|---|---|
| Bench press (top + back-off) | 80 × 5 | 72 × 5 | 72 × 5 | 72 × 5 | 8 | Bar speed good on top set |
| Weighted pull-up | +10 × 5 | +10 × 5 | +10 × 5 | +10 × 4 | 9 | Missed 1 on last set |
| Seated OHP | 40 × 6 | 40 × 6 | 40 × 5 | — | 8 | Right shoulder pinched on set 3 |
| Chest-supported row | 32 × 8 | 32 × 8 | 32 × 8 | — | 8 | |
| Incline DB curl | 14 × 11 | 14 × 10 | — | — | 9 | |
| Cable tri ext | 25 × 12 | 25 × 11 | — | — | 9 | |

**Session:** 68 min · **Completed:** 6/6 exercises

**Notes:** First session back from a week off — everything felt heavier than the numbers suggest. Shoulder pinch on OHP set 3: swap to seated DB press next Upper A and see if it clears. Pull-up last set was a rep short; repeat +10 kg rather than adding.

**Next:** Upper A — repeat bench 80 top set, aim RPE 7.5. Seated DB press instead of barbell OHP.
```

That's the standard. Notice what makes it useful: the RPE column tells you whether to add load next time, and the notes column captures the two decisions you'd otherwise have to reconstruct from memory a week later.
