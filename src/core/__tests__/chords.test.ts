import { describe, it, expect } from 'vitest'
import {
  CHORD_NAMES,
  DEFAULT_RULES,
  chordsForScale,
  generateChords,
  hasEnemy,
  isConnected,
  isCrowded,
  isValidChord,
  withNames,
  type ChordRules,
} from '../chords.ts'
import { shapeFromPattern } from '../scale.ts'

// the twenty tetrads quoted from microtonaltheory.com's published list, in the
// order the source gives them.
const FIXTURES = [
  [0, 5, 11, 16], [0, 5, 11, 17], [0, 5, 11, 18], [0, 5, 11, 19],
  [0, 5, 12, 18], [0, 5, 12, 19], [0, 5, 13, 19], [0, 6, 11, 17],
  [0, 6, 11, 18], [0, 6, 11, 19], [0, 6, 12, 17], [0, 6, 12, 19],
  [0, 6, 13, 18], [0, 6, 13, 19], [0, 6, 13, 20], [0, 6, 14, 19],
  [0, 7, 12, 18], [0, 7, 12, 19], [0, 7, 12, 20], [0, 7, 13, 18],
]

const NAMED = Object.keys(CHORD_NAMES).map((k) => k.split('-').map(Number))

describe('the three rules, independently', () => {
  it('accepts only friend intervals as a linear chain', () => {
    expect(isConnected([0, 5, 11, 16], DEFAULT_RULES)).toBe(true) // gaps 5,6,5
    expect(isConnected([0, 2, 6, 8], DEFAULT_RULES)).toBe(false) // gap 2 is no friend
  })

  it('treats 1, 9 and 15 steps as enemies', () => {
    expect(hasEnemy([0, 9], DEFAULT_RULES)).toBe(true)
    expect(hasEnemy([0, 15], DEFAULT_RULES)).toBe(true)
    expect(hasEnemy([0, 5, 11, 16], DEFAULT_RULES)).toBe(false)
  })

  it('is vacuous on crowding under the linear reading', () => {
    // consecutive notes are >= 5 steps apart, so nothing can crowd
    for (const f of FIXTURES) expect(isCrowded(f, DEFAULT_RULES)).toBe(false)
    // it still bites in graph mode
    expect(isCrowded([0, 1, 2], { ...DEFAULT_RULES, chainMode: 'graph' })).toBe(true)
  })
})

describe('generated chord set', () => {
  const generated = generateChords(DEFAULT_RULES)
  const ids = new Set(generated.map((c) => c.id))

  it('contains every chord the source publishes', () => {
    for (const f of [...FIXTURES, ...NAMED]) {
      expect(ids.has(f.join('-')), `missing ${f.join(',')}`).toBe(true)
    }
  })

  it('validates each published chord against the rules directly', () => {
    for (const f of [...FIXTURES, ...NAMED]) {
      expect(isValidChord(f, DEFAULT_RULES), `invalid ${f.join(',')}`).toBe(true)
    }
  })

  it('never admits the semitone clusters the graph reading would', () => {
    expect(ids.has('0-2-6-8')).toBe(false)
    expect(ids.has('0-3-8-11')).toBe(false)
    // every adjacent gap is a friend interval
    for (const c of generated) {
      for (let i = 0; i + 1 < c.offsets.length; i++) {
        expect(DEFAULT_RULES.friends).toContain(c.offsets[i + 1] - c.offsets[i])
      }
    }
  })

  it('has a stable size by chord size', () => {
    const bySize: Record<number, number> = {}
    for (const c of generated) bySize[c.size] = (bySize[c.size] ?? 0) + 1
    // snapshotted rather than asserted against the source's "161", which does
    // not reproduce under any rule combination — see the note in chords.ts
    expect(bySize).toEqual({ 3: 14, 4: 49, 5: 59 })
  })

  it('attaches the source names', () => {
    const named = withNames(generated).filter((c) => c.names.length > 0)
    expect(named).toHaveLength(Object.keys(CHORD_NAMES).length)
    expect(named.find((c) => c.id === '0-6-14-19')!.names).toEqual(['minor harmonic seventh'])
  })
})

// the remaining ambiguity, pinned as a tested property rather than left open.
describe('enemy rule ambiguity', () => {
  it('is confined to pairs that are 15 steps apart without being adjacent', () => {
    const strict = new Set(generateChords(DEFAULT_RULES).map((c) => c.id))
    const loose: ChordRules = { ...DEFAULT_RULES, enemyMode: 'consecutive' }
    const extra = generateChords(loose)
      .map((c) => c.id)
      .filter((id) => !strict.has(id))

    // gaps are always 5..8, so an adjacent pair can never BE an enemy. the two
    // readings can therefore only differ on non-adjacent distances of 15:
    // two gaps summing to 15 — (7,8) or (8,7) — or three fives in a row.
    const classify = (id: string) => {
      const o = id.split('-').map(Number)
      const g = o.slice(1).map((v, i) => v - o[i])
      return {
        pairOf15: g.some((_, i) => i + 1 < g.length && g[i] + g[i + 1] === 15),
        tripleFive: g.some((_, i) => g[i] === 5 && g[i + 1] === 5 && g[i + 2] === 5),
      }
    }
    for (const id of extra) {
      const c = classify(id)
      expect(c.pairOf15 || c.tripleFive, `unexpected extra chord ${id}`).toBe(true)
    }
    expect(extra).toHaveLength(24)
    expect(extra.filter((id) => classify(id).pairOf15)).toHaveLength(16)
    expect(extra.filter((id) => classify(id).tripleFive)).toHaveLength(8)
  })

  // the source paraphrases the enemy rule as "we can't have consecutive
  // relative intervals of size (8,7)\\24 or (7,8)\\24". that accounts for 16 of
  // the 24 differing chords and misses the (5,5,5) run entirely, which also
  // spans 15. the paraphrase is incomplete, so we follow the rule as stated
  // rather than the paraphrase.
  it('shows the source paraphrase is incomplete', () => {
    const fiveStack = [0, 5, 10, 15]
    expect(hasEnemy(fiveStack, DEFAULT_RULES)).toBe(true)
    expect(hasEnemy(fiveStack, { ...DEFAULT_RULES, enemyMode: 'consecutive' })).toBe(false)
  })
})

describe('chords on scale degrees', () => {
  const neutral = shapeFromPattern([4, 3, 3, 4, 3, 4, 3])
  const all = generateChords(DEFAULT_RULES)

  it('only offers chords whose every note is in the scale', () => {
    const byDegree = chordsForScale(neutral, 0, all)
    const inScale = new Set(neutral.degrees)
    for (const d of byDegree) {
      for (const c of d.chords) {
        for (const pc of c.pcs) {
          expect(inScale.has((d.rootPc + pc) % 24)).toBe(true)
        }
      }
    }
  })

  it('covers every degree and follows the root', () => {
    expect(chordsForScale(neutral, 0, all)).toHaveLength(neutral.degrees.length)
    expect(chordsForScale(neutral, 5, all).map((d) => d.rootPc)).toEqual(
      neutral.degrees.map((d) => (d + 5) % 24),
    )
  })

  it('finds at least one chord somewhere in a 7 note scale', () => {
    const total = chordsForScale(neutral, 0, all).reduce((a, d) => a + d.chords.length, 0)
    expect(total).toBeGreaterThan(0)
  })
})
