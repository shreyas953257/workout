import { describe, expect, it } from 'vitest'
import { levelForXp, levelInfo, levelTable, titleForLevel, xpToReachLevel } from '../src/data/levels'

describe('level thresholds', () => {
  it('follows 50·(n−1)·n', () => {
    expect(xpToReachLevel(1)).toBe(0)
    expect(xpToReachLevel(2)).toBe(100)
    expect(xpToReachLevel(3)).toBe(300)
    expect(xpToReachLevel(4)).toBe(600)
    expect(xpToReachLevel(5)).toBe(1000)
    expect(xpToReachLevel(10)).toBe(4500)
    expect(xpToReachLevel(13)).toBe(7800)
  })

  it('is strictly increasing', () => {
    const table = levelTable(40)
    for (let i = 1; i < table.length; i++) {
      expect(table[i].xp).toBeGreaterThan(table[i - 1].xp)
    }
  })

  it('guards against nonsense input', () => {
    expect(xpToReachLevel(0)).toBe(0)
    expect(xpToReachLevel(-5)).toBe(0)
    expect(xpToReachLevel(Number.NaN)).toBe(0)
  })
})

describe('levelForXp', () => {
  it('places XP in the right level', () => {
    expect(levelForXp(0)).toBe(1)
    expect(levelForXp(50)).toBe(1)
    expect(levelForXp(99)).toBe(1)
    expect(levelForXp(100)).toBe(2)
    expect(levelForXp(299)).toBe(2)
    expect(levelForXp(300)).toBe(3)
    expect(levelForXp(999)).toBe(4)
    expect(levelForXp(1000)).toBe(5)
    expect(levelForXp(4500)).toBe(10)
    expect(levelForXp(7800)).toBe(13)
    expect(levelForXp(9100)).toBe(14)
  })

  it('agrees with the threshold table at every boundary', () => {
    for (const { level, xp } of levelTable(30)) {
      expect(levelForXp(xp)).toBe(level)
      // Level 1 is the floor: there is no level 0 below its threshold.
      if (level > 1) expect(levelForXp(xp - 1)).toBe(level - 1)
    }
  })

  it('is monotonic — more XP never means a lower level', () => {
    let previous = 0
    for (let xp = 0; xp <= 20000; xp += 7) {
      const level = levelForXp(xp)
      expect(level).toBeGreaterThanOrEqual(previous)
      previous = level
    }
  })

  it('never returns below 1', () => {
    expect(levelForXp(-1000)).toBe(1)
    expect(levelForXp(Number.NaN)).toBe(1)
    expect(levelForXp(Number.POSITIVE_INFINITY)).toBeGreaterThanOrEqual(1)
  })
})

describe('levelInfo', () => {
  it('reports the band, remainder and requirement for the next level', () => {
    const info = levelInfo(350)
    expect(info.level).toBe(3)
    expect(info.floor).toBe(300)
    expect(info.ceiling).toBe(600)
    expect(info.into).toBe(50)
    expect(info.needed).toBe(250)
    expect(info.pct).toBeCloseTo(16.7, 1)
    expect(info.title).toBe('Regular')
  })

  it('shows 0% at an exact threshold and 100% one XP below the next', () => {
    expect(levelInfo(300).pct).toBe(0)
    expect(levelInfo(599).pct).toBeCloseTo(99.7, 1)
    expect(levelInfo(600).level).toBe(4)
    expect(levelInfo(600).pct).toBe(0)
  })

  it('clamps negative and non-finite XP to level 1', () => {
    expect(levelInfo(-50).level).toBe(1)
    expect(levelInfo(Number.NaN).level).toBe(1)
    expect(levelInfo(-50).needed).toBe(100)
  })
})

describe('titles', () => {
  it('names every level up to 13', () => {
    expect(titleForLevel(1).title).toBe('Novice')
    expect(titleForLevel(5).title).toBe('Athlete')
    expect(titleForLevel(10).title).toBe('Elite')
    expect(titleForLevel(13).title).toBe('Legend')
  })

  it('extends past the last named title with numerals instead of restarting', () => {
    expect(titleForLevel(14).title).toBe('Legend II')
    expect(titleForLevel(15).title).toBe('Legend III')
    expect(titleForLevel(22).title).toBe('Legend X')
    expect(titleForLevel(23).title).toBe('Legend +10')
  })

  it('never demotes — a higher level is never a "lower" title', () => {
    const order = ['Novice', 'Apprentice', 'Regular', 'Dedicated', 'Athlete']
    for (let level = 1; level <= 5; level++) {
      expect(titleForLevel(level).title).toBe(order[level - 1])
    }
  })

  it('falls back sensibly below level 1', () => {
    expect(titleForLevel(0).title).toBe('Novice')
    expect(titleForLevel(-3).title).toBe('Novice')
  })
})
