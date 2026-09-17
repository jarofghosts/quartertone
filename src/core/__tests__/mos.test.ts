import { describe, it, expect } from 'vitest'
import { EDO } from '../pitch.ts'
import { canonicalRotation, modesOf, shapeFromPattern } from '../scale.ts'
import {
  enumerateMosFamilies,
  hasMaxVarietyTwo,
  isDegenerate,
  modesOfFamily,
  mosPattern,
} from '../mos.ts'

describe('mos pattern construction', () => {
  it('builds the familiar diatonic as 5L 2s (4:2)', () => {
    const p = mosPattern(5, 2, 4, 2)
    expect(p.reduce((a, b) => a + b, 0)).toBe(EDO)
    // some rotation of it must be the major scale
    expect(modesOf(p).map((m) => m.join('-'))).toContain('4-4-2-4-4-4-2')
  })

  it('builds the neutral diatonic as 3L 4s (4:3)', () => {
    const p = mosPattern(3, 4, 4, 3)
    // LssLsLs, the 24edo neutral diatonic
    expect(modesOf(p).map((m) => m.join('-'))).toContain('4-3-3-4-3-4-3')
  })

  it('handles multi-period scales the generator method would drop', () => {
    // 4L 4s (4:2) is the octatonic — period 6, so 8 notes but only 2 modes
    const p = mosPattern(4, 4, 4, 2)
    expect(p).toEqual([2, 4, 2, 4, 2, 4, 2, 4])
    expect(modesOf(p)).toHaveLength(2)
  })
})

describe('mos enumeration', () => {
  const families = enumerateMosFamilies(2, 12)

  it('produces only valid octave-filling patterns', () => {
    for (const f of families) {
      const p = mosPattern(f.x, f.y, f.large, f.small)
      expect(p.reduce((a, b) => a + b, 0)).toBe(EDO)
      expect(p).toHaveLength(f.n)
      expect(new Set(p).size).toBe(2)
      expect(f.large).toBeGreaterThan(f.small)
    }
  })

  it('satisfies max variety 2 — an independent check on the word construction', () => {
    for (const f of families) {
      expect(hasMaxVarietyTwo(mosPattern(f.x, f.y, f.large, f.small))).toBe(true)
    }
  })

  it('knows xL ys is ambiguous in 24edo without the step sizes', () => {
    const twoLthreeS = families.filter((f) => f.x === 2 && f.y === 3)
    expect(twoLthreeS.map((f) => f.name).sort()).toEqual(['2L 3s (6:4)', '2L 3s (9:2)'])
  })

  it('flags degenerate families rather than dropping them', () => {
    const wild = families.find((f) => f.name === '1L 10s (14:1)')
    expect(wild).toBeDefined()
    expect(isDegenerate(wild!)).toBe(true)
    expect(isDegenerate(families.find((f) => f.name === '5L 2s (4:2)')!)).toBe(false)
  })

  it('gives every mode a distinct key within its family', () => {
    for (const f of families) {
      const modes = modesOfFamily(f)
      expect(new Set(modes.map((m) => m.shape.key)).size).toBe(modes.length)
      // all modes of a family share one familyKey
      expect(new Set(modes.map((m) => m.shape.familyKey)).size).toBe(1)
    }
  })

  it('reports the corpus size', () => {
    const usable = families.filter((f) => f.n >= 5 && f.n <= 12)
    const modes = usable.flatMap(modesOfFamily)
    const nonDegenerate = usable.filter((f) => !isDegenerate(f)).flatMap(modesOfFamily)
    expect(families.length).toBeGreaterThan(50)
    expect(modes.length).toBeGreaterThan(200)
    expect(nonDegenerate.length).toBeGreaterThan(100)
  })
})

describe('scale shape', () => {
  it('round-trips pattern and degrees', () => {
    const s = shapeFromPattern([4, 4, 2, 4, 4, 4, 2])
    expect(s.degrees).toEqual([0, 4, 8, 10, 14, 18, 22])
    expect(s.key).toBe('4-4-2-4-4-4-2')
  })

  it('rejects patterns that do not fill the octave', () => {
    expect(() => shapeFromPattern([4, 4, 4])).toThrow(/sum to 24/)
  })

  it('gives all rotations the same family key', () => {
    const c = canonicalRotation([4, 4, 2, 4, 4, 4, 2])
    for (const m of modesOf([4, 4, 2, 4, 4, 4, 2])) {
      expect(canonicalRotation(m)).toEqual(c)
    }
  })
})
