import { describe, it, expect } from 'vitest'
import { EADGCF, FOURTH_STEPS, buildFretboard } from '../fretboard.ts'
import { shapeFromPattern } from '../scale.ts'
import { EDO, stepName } from '../pitch.ts'

const neutral = shapeFromPattern([4, 3, 3, 4, 3, 4, 3])

describe('eadgcf tuning', () => {
  it('is six strings a perfect fourth apart', () => {
    expect(EADGCF).toHaveLength(6)
    for (let i = 1; i < EADGCF.length; i++) {
      expect(EADGCF[i] - EADGCF[i - 1]).toBe(FOURTH_STEPS)
    }
  })

  it('names the open strings e a d g c f', () => {
    expect(EADGCF.map((s) => stepName(s))).toEqual(['e2', 'a2', 'd3', 'g3', 'c4', 'f4'])
  })

  it('puts an octave at 24 frets, since frets are quarter tones', () => {
    const b = buildFretboard(neutral, 0, 36)
    expect(b.rows[0][EDO].step).toBe(b.rows[0][0].step + EDO)
    expect(b.rows[0][EDO].pc).toBe(b.rows[0][0].pc)
    expect(b.octaveFrets).toEqual([24])
  })

  it('reaches the next string at fret 10', () => {
    const b = buildFretboard(neutral, 0, 36)
    expect(b.rows[0][FOURTH_STEPS].step).toBe(b.rows[1][0].step)
    expect(stepName(b.rows[0][FOURTH_STEPS].step)).toBe('a2')
  })
})

describe('scale mapping', () => {
  it('marks roots and degrees correctly', () => {
    const b = buildFretboard(neutral, 0, 24)
    const cells = b.rows.flat()
    for (const c of cells) {
      if (c.isRoot) expect(c.pc).toBe(0)
      if (c.degreeIndex !== null) expect(neutral.degrees).toContain(c.pc)
      else expect(neutral.degrees).not.toContain(c.pc)
    }
    expect(cells.some((c) => c.isRoot)).toBe(true)
  })

  it('follows the root when transposed', () => {
    const b = buildFretboard(neutral, 7, 24)
    expect(b.rows.flat().filter((c) => c.isRoot).every((c) => c.pc === 7)).toBe(true)
  })

  it('flags quarter tones', () => {
    const b = buildFretboard(neutral, 0, 24)
    for (const c of b.rows.flat()) expect(c.isQuarterTone).toBe(c.pc % 2 === 1)
  })

  it('has fretCount + 1 columns, counting the open string', () => {
    const b = buildFretboard(neutral, 0, 36)
    for (const row of b.rows) expect(row).toHaveLength(37)
  })
})
