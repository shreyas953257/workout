# Personal Records

Best sets, by lift. Update this whenever you beat a number in your log — it takes ten seconds and it's the most motivating file in the repo.

**What counts as a PR here:** your best *working* set, not a max-effort single you ground out once. A set of 5 at 100 kg tells you more about your training than a shaky 1RM, and it's reproducible.

**Rules:**
- Record weight × reps, plus RPE if you know it
- Keep the same units throughout (kg unless you change it and note it)
- Never delete an old record — the history *is* the point
- A set only counts with clean form and full range of motion

---

## The big three

### Squat

| Weight | Reps | RPE | Date | Notes |
|---|---|---|---|---|
| | | | | |

**Current best:** _weight × reps_ · **Bodyweight multiple:** _×BW_

### Bench press

| Weight | Reps | RPE | Date | Notes |
|---|---|---|---|---|
| | | | | |

**Current best:** _weight × reps_ · **Bodyweight multiple:** _×BW_

### Deadlift

| Weight | Reps | RPE | Date | Notes |
|---|---|---|---|---|
| | | | | |

**Current best:** _weight × reps_ · **Bodyweight multiple:** _×BW_

**Total (best single of each):** _kg_

---

## Other main lifts

### Overhead press

| Weight | Reps | RPE | Date | Notes |
|---|---|---|---|---|
| | | | | |

### Barbell / DB row

| Weight | Reps | RPE | Date | Notes |
|---|---|---|---|---|
| | | | | |

### Romanian deadlift

| Weight | Reps | RPE | Date | Notes |
|---|---|---|---|---|
| | | | | |

### Pull-up

| Weight | Reps | RPE | Date | Notes |
|---|---|---|---|---|
| BW × | | | | First unassisted pull-up: _date_ |
| +_kg_ × | | | | |

### Lat pulldown

| Weight | Reps | RPE | Date | Notes |
|---|---|---|---|---|
| | | | | |

### Front squat

| Weight | Reps | RPE | Date | Notes |
|---|---|---|---|---|
| | | | | |

### Bulgarian split squat

| Weight | Reps/leg | RPE | Date | Notes |
|---|---|---|---|---|
| | | | | |

### Leg press

| Weight | Reps | RPE | Date | Notes |
|---|---|---|---|---|
| | | | | |

---

## Bodyweight

### Push-up

| Reps | Tempo | Date | Notes |
|---|---|---|---|
| | | | Max clean set, chest to floor |

### Plank

| Time | Date | Notes |
|---|---|---|
| | | |

### Farmer's carry

| Weight/hand | Distance | Date | Notes |
|---|---|---|---|
| | | | |

---

## Conditioning

| Test | Result | Date | Notes |
|---|---|---|---|
| 5 km run/walk | | | |
| 2 km row | | | |
| 12 min bike | | | |
| Resting heart rate (lowest recorded) | bpm | | |

---

## Milestones

Tick them off. These are worth more than any single number.

- [ ] First session logged
- [ ] 4 consecutive weeks without a missed session
- [ ] Bodyweight bench press × 5
- [ ] Bodyweight squat × 5
- [ ] 1.5 × bodyweight deadlift
- [ ] First unassisted pull-up
- [ ] 10 consecutive push-ups
- [ ] 2-minute plank
- [ ] 12 weeks on one program without restarting
- [ ] 6 months of consistent training
- [ ] 1 year of consistent training
- [ ] First deload taken *on schedule* rather than being forced into it

---

## Year-over-year

Fill in every January, or whenever you feel like being impressed by yourself.

| Lift | Best set | One year ago | Today | Change |
|---|---|---|---|---|
| Squat | 5 reps | | | |
| Bench | 5 reps | | | |
| Deadlift | 3 reps | | | |
| OHP | 5 reps | | | |
| Row | 8 reps | | | |
| Bodyweight | — | | | |

---

### How to find your old records

```bash
# Every commit that touched this file
git log --oneline -- tracking/personal-records.md

# What changed in it over time
git log -p -- tracking/personal-records.md

# Search all logs for a lift
git grep -i "bench" -- logs/
```
