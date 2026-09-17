import type { ScaleContribution, ScaleSource } from './types.ts'

interface Curated {
  pattern: number[]
  names: string[]
  tags: string[]
  note?: string
}

/** a 12edo scale, written in semitones and doubled into 24edo steps. */
function fromSemitones(semitones: number[], names: string[], tags: string[], note?: string): Curated {
  return { pattern: semitones.map((s) => s * 2), names, tags: ['12edo', ...tags], note }
}

/**
 * hand-authored named scales.
 *
 * the mos enumerator finds the shapes; this file gives them the names people
 * actually search for. anything here that matches an enumerated pattern merges
 * into that entry rather than creating a second row.
 *
 * maqam patterns are written from the root upward in quarter-tone steps, where
 * 4 is a whole tone, 2 a semitone and 3 a neutral second.
 */
const CURATED: Curated[] = [
  // --- the 12edo modes, which 24edo contains whole -------------------------
  fromSemitones([2, 2, 1, 2, 2, 2, 1], ['major', 'ionian', 'maqam ajam'], ['diatonic', 'mode']),
  fromSemitones([2, 1, 2, 2, 2, 1, 2], ['dorian'], ['diatonic', 'mode']),
  fromSemitones([1, 2, 2, 2, 1, 2, 2], ['phrygian', 'maqam kurd'], ['diatonic', 'mode']),
  fromSemitones([2, 2, 2, 1, 2, 2, 1], ['lydian'], ['diatonic', 'mode']),
  fromSemitones([2, 2, 1, 2, 2, 1, 2], ['mixolydian'], ['diatonic', 'mode']),
  fromSemitones([2, 1, 2, 2, 1, 2, 2], ['natural minor', 'aeolian', 'maqam nahawand'], ['diatonic', 'mode']),
  fromSemitones([1, 2, 2, 1, 2, 2, 2], ['locrian'], ['diatonic', 'mode']),
  fromSemitones([2, 1, 2, 2, 1, 3, 1], ['harmonic minor'], ['mode']),
  fromSemitones([2, 1, 2, 2, 2, 2, 1], ['melodic minor'], ['mode']),
  fromSemitones([2, 2, 1, 2, 1, 3, 1], ['harmonic major'], ['mode']),
  fromSemitones([2, 2, 2, 2, 2, 2], ['whole tone'], ['symmetric']),
  fromSemitones([1, 2, 1, 2, 1, 2, 1, 2], ['octatonic', 'diminished'], ['symmetric']),
  fromSemitones([2, 2, 3, 2, 3], ['major pentatonic'], ['pentatonic']),
  fromSemitones([3, 2, 2, 3, 2], ['minor pentatonic'], ['pentatonic']),
  fromSemitones([3, 2, 1, 1, 3, 2], ['blues'], ['hexatonic']),
  fromSemitones([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], ['chromatic'], ['symmetric']),

  // --- scales that need quarter tones -------------------------------------
  {
    pattern: [4, 3, 3, 4, 4, 3, 3],
    names: ['maqam rast'],
    tags: ['maqam', 'quarter-tone', 'neutral'],
    note: 'jins rast twice: c d e-half-flat f, then g a b-half-flat c',
  },
  {
    pattern: [3, 3, 4, 4, 2, 4, 4],
    names: ['maqam bayati'],
    tags: ['maqam', 'quarter-tone', 'neutral'],
    note: 'jins bayati on d: d e-half-flat f g, with a minor upper tetrachord',
  },
  {
    pattern: [3, 4, 4, 3, 3, 4, 3],
    names: ['maqam sikah'],
    tags: ['maqam', 'quarter-tone', 'neutral'],
    note: 'rooted on the neutral third itself',
  },
  {
    pattern: [3, 3, 2, 6, 2, 4, 4],
    names: ['maqam saba'],
    tags: ['maqam', 'quarter-tone', 'neutral'],
    note: 'bayati opening with a diminished fourth above it',
  },
  {
    pattern: [4, 3, 3, 4, 2, 6, 2],
    names: ['maqam suznak'],
    tags: ['maqam', 'quarter-tone', 'neutral'],
    note: 'jins rast below, jins hijaz above',
  },
  {
    pattern: [2, 6, 2, 4, 2, 4, 4],
    names: ['maqam hijaz'],
    tags: ['maqam'],
    note: 'no quarter tones, but the core maqam ear-training scale',
  },
  {
    pattern: [4, 2, 6, 2, 4, 2, 4],
    names: ['maqam nikriz'],
    tags: ['maqam'],
  },
  {
    pattern: [4, 3, 3, 4, 3, 4, 3],
    names: ['neutral diatonic', 'neutral major'],
    tags: ['neutral', 'quarter-tone', 'mos'],
    note: 'the 3L 4s mos, LssLsLs — the signature 24edo heptatonic',
  },
  {
    pattern: [3, 4, 3, 4, 3, 4, 3],
    names: ['neutral dorian'],
    tags: ['neutral', 'quarter-tone'],
  },
  {
    pattern: [3, 3, 3, 3, 3, 3, 3, 3],
    names: ['quarter-tone octatonic', '8edo subset'],
    tags: ['symmetric', 'quarter-tone'],
    note: 'eight equal neutral seconds — 24edo contains all of 8edo',
  },
  {
    pattern: [5, 5, 5, 5, 4],
    names: ['supermajor pentatonic'],
    tags: ['pentatonic', 'quarter-tone'],
    note: 'four stacked supermajor seconds, the 8/7 friend interval',
  },
]

export const curatedSource: ScaleSource = {
  id: 'curated',
  describe: () => 'hand-authored named scales: maqamat, neutral modes, 12edo inheritance',
  collect(): ScaleContribution[] {
    return CURATED.map((c) => {
      const sum = c.pattern.reduce((a, b) => a + b, 0)
      if (sum !== 24) {
        throw new Error(`curated scale "${c.names[0]}" sums to ${sum}, not 24`)
      }
      return {
        key: c.pattern.join('-'),
        names: c.names,
        tags: [...c.tags, 'named', `${c.pattern.length}-note`],
        meta: c.note ? { note: c.note } : ({} as Record<string, string | number>),
      }
    })
  },
}
