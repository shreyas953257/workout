# Body Measurements

Monthly check-in. Weigh-ins weekly, measurements monthly — any more often and the noise swamps the signal.

**Privacy note:** if this repo is public, consider making it private or adding this file to `.gitignore`. There's a commented-out line at the bottom of [.gitignore](../.gitignore) for exactly that.

- [How to measure](#how-to-measure)
- [Bodyweight log](#bodyweight-log)
- [Measurements](#measurements)
- [Photos](#photos)
- [Trends](#trends)

---

## How to measure

Consistency matters more than accuracy. Same conditions every time, or the numbers are meaningless.

| Variable | Standardise it |
|---|---|
| **Time of day** | First thing in the morning, before eating or drinking |
| **Bathroom** | After, before weighing |
| **Clothing** | None, or the same minimal amount every time |
| **Scale** | The same one, on the same hard flat surface. Never carpet |
| **Tape** | The same tape. Pulled snug against the skin, not compressing it |
| **Flexed or relaxed** | Relaxed, arms at your sides, breathing normally |
| **Cycle** | If applicable, measure at the same point in your cycle each month — water retention swings 1–2 kg |

### Where to place the tape

| Site | Position |
|---|---|
| **Neck** | Below the larynx, level all the way round |
| **Shoulders** | Around the widest point of the delts, tape over both — needs a second person, or use a wall mark |
| **Chest** | Nipple line, arms relaxed at your sides |
| **Waist** | Narrowest point, usually just above the navel. **Not** where your trousers sit |
| **Navel** | Straight across the belly button — the most honest measure of abdominal change |
| **Hips** | Widest point of the glutes, feet together |
| **Thigh** | Widest point, just below the glute fold. Measure the same leg each time |
| **Calf** | Widest point |
| **Upper arm** | Midpoint between the shoulder and the elbow, biceps relaxed |

Measure each site **three times** and record the average. If two of your three readings differ by more than 1 cm, do it again.

---

## Bodyweight log

Weigh **daily** if you can stomach it, then use the **weekly average** — that's the only number worth reading. Daily weight swings 1–2 kg from water, sodium, carbs, sleep, and digestion, and judging yourself on any single morning is how people talk themselves out of a plan that's working.

### Weekly averages

| Week starting | Mon | Tue | Wed | Thu | Fri | Sat | Sun | **Average** | Trend vs last week |
|---|---|---|---|---|---|---|---|---|---|
| 2026-09-28 | | | | | | | | | |
| 2026-10-05 | | | | | | | | | |
| 2026-10-12 | | | | | | | | | |
| 2026-10-19 | | | | | | | | | |
| 2026-10-26 | | | | | | | | | |
| 2026-11-02 | | | | | | | | | |

### What the trend should look like

| Goal | Expected rate | Note |
|---|---|---|
| Fat loss | −0.3 to −0.7 kg/week | Faster than this and you're losing muscle |
| Muscle gain | +0.1 to +0.25 kg/week | Beyond ~1 kg/month is mostly fat, unless you're a true beginner |
| Maintain / recomp | Flat, ±0.5 kg | Judge by measurements, lifts, and photos instead |

**Judge over 3–4 weeks minimum.** Two weeks tells you nothing.

---

## Measurements

One row per month. Same day of the month if you can — the 1st is easy to remember.

| Date | Bodyweight | Neck | Shoulders | Chest | Waist | Navel | Hips | Thigh | Calf | Arm |
|---|---|---|---|---|---|---|---|---|---|---|
| 2026-10-01 | | | | | | | | | | |
| 2026-11-01 | | | | | | | | | | |
| 2026-12-01 | | | | | | | | | | |
| 2027-01-01 | | | | | | | | | | |
| | | | | | | | | | | |
| | | | | | | | | | | |

### Change from first entry

| Site | Start | Current | Change |
|---|---|---|---|
| Bodyweight | | | |
| Waist | | | |
| Chest | | | |
| Hips | | | |
| Arm | | | |
| Thigh | | | |

**Reading this:** waist down + lifts up = losing fat while keeping muscle, the ideal outcome. Weight down + lifts down + waist flat = you're cutting too aggressively. Weight up + waist up faster than chest and arms = surplus is too big.

---

## Photos

More sensitive than any tape measure, and the only record that shows you *shape* rather than circumference.

**Standardise everything:** same spot in the room · same lighting, ideally the same time of day · same distance and camera height · same posture, relaxed, arms at your sides · front, both sides, and back · same clothing or none.

**Frequency:** monthly. Daily photos make change invisible; monthly makes it obvious.

**Storage:** keep them out of git — a repo of photos gets huge fast and won't clone. Use a private album on your phone or cloud storage, and just record the date here:

| Date | Front | Side | Back | Notes |
|---|---|---|---|---|
| 2026-10-01 | ☐ | ☐ | ☐ | |
| 2026-11-01 | ☐ | ☐ | ☐ | |
| 2026-12-01 | ☐ | ☐ | ☐ | |

Add to `.gitignore` if you do keep them in the folder:

```
photos/
*.jpg
*.png
```

---

## Trends

### Quarterly summary

| Quarter | Avg bodyweight | Waist | Chest | Arm | Squat best | Bench best | Deadlift best |
|---|---|---|---|---|---|---|---|
| 2026 Q4 | | | | | | | |
| 2027 Q1 | | | | | | | |
| 2027 Q2 | | | | | | | |

### Notes

_What the numbers are telling you, and what you're doing about it. Newest first._

#### 2026-10-01
-

---

## Plotting it

Markdown tables don't graph, but you can export one and chart it in any spreadsheet:

```bash
# Extract the weekly-average rows as CSV
grep -E "^\| 2026-" tracking/body-measurements.md \
  | sed 's/^| //; s/ |$//; s/ *| */,/g' > /tmp/weight.csv
```

Or simply read the "Trend vs last week" column — a consistent arrow is all the chart you need.

---

<!-- To keep this file out of a public repo, uncomment in ../.gitignore:
tracking/body-measurements.md
-->
