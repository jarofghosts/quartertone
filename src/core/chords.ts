import { EDO, mod, type PitchClass } from './pitch.ts'
import { toPitchClasses, type ScaleShape } from './scale.ts'

/**
 * the quartertone harmony scheme from microtonaltheory.com/tuning-theory,
 * in 24edo steps.
 *
 * three rules, quoted from the source:
 *   connectivity — "every chord has to have a chain of friends connecting
 *                   every note in the chord"
 *   no enemies   — "an enemy is a note separate from a target note by 1
 *                   quarter tone or 9 quarter tones or 15 quarter tones"
 *   no crowding  — "no note can have more than one other note that is closer
 *                   than a major second"
 *
 * "chain of friends" is the load-bearing ambiguity. read as graph connectivity
 * over all friend-distance pairs, the generator admits semitone clusters like
 * [0,2,6,8] — and the source's published list contains nothing of the sort; it
 * begins at [0,5,11,16]. read as a LINEAR chain, where each note is a friend of
 * the next one up, every published chord validates and nothing else creeps in.
 * so `linear` is the default. `graph` stays available for exploration.
 *
 * under `linear` the crowding rule is vacuous — consecutive notes are at least
 * 5 steps apart, so nothing can be crowded. that is itself a hint the three
 * rules were written for the graph reading and then applied as a chain.
 */
export interface ChordRules {
  /** step distances that count as a friend: supermajor 2nd, minor/neutral/major 3rd */
  friends: number[]
  enemies: number[]
  /** a major second — notes closer than this crowd each other */
  crowding: number
  chainMode: 'linear' | 'graph'
  enemyMode: 'all-pairs' | 'consecutive'
  maxSpan: number
}

export const DEFAULT_RULES: ChordRules = {
  friends: [5, 6, 7, 8],
  enemies: [1, 9, 15],
  crowding: 4,
  chainMode: 'linear',
  enemyMode: 'all-pairs',
  maxSpan: EDO,
}

/** a voicing, as ascending step offsets from its root. offsets[0] is always 0. */
export interface ChordShape {
  id: string
  offsets: number[]
  size: number
  span: number
  pcs: PitchClass[]
  names: string[]
}

export function isConnected(offsets: readonly number[], rules: ChordRules): boolean {
  if (offsets.length < 2) return true
  if (rules.chainMode === 'linear') {
    for (let i = 0; i + 1 < offsets.length; i++) {
      if (!rules.friends.includes(offsets[i + 1] - offsets[i])) return false
    }
    return true
  }
  const seen = new Set([0])
  const stack = [0]
  while (stack.length) {
    const i = stack.pop()!
    for (let j = 0; j < offsets.length; j++) {
      if (seen.has(j)) continue
      if (rules.friends.includes(Math.abs(offsets[i] - offsets[j]))) {
        seen.add(j)
        stack.push(j)
      }
    }
  }
  return seen.size === offsets.length
}

export function hasEnemy(offsets: readonly number[], rules: ChordRules): boolean {
  if (rules.enemyMode === 'consecutive') {
    for (let i = 0; i + 1 < offsets.length; i++) {
      if (rules.enemies.includes(offsets[i + 1] - offsets[i])) return true
    }
    return false
  }
  for (let i = 0; i < offsets.length; i++) {
    for (let j = i + 1; j < offsets.length; j++) {
      if (rules.enemies.includes(offsets[j] - offsets[i])) return true
    }
  }
  return false
}

export function isCrowded(offsets: readonly number[], rules: ChordRules): boolean {
  for (let i = 0; i < offsets.length; i++) {
    let near = 0
    for (let j = 0; j < offsets.length; j++) {
      if (i !== j && Math.abs(offsets[i] - offsets[j]) < rules.crowding) near++
    }
    if (near > 1) return true
  }
  return false
}

export function isValidChord(offsets: readonly number[], rules: ChordRules): boolean {
  return isConnected(offsets, rules) && !hasEnemy(offsets, rules) && !isCrowded(offsets, rules)
}

/**
 * enumerate every valid voicing.
 *
 * in linear mode the friend rule is constructive rather than a filter — a valid
 * voicing is a path 0 -> +f1 -> +f2 -> ... with each step drawn from `friends`.
 * branching factor 4, depth <= 6, span-capped, so the whole space is a few
 * thousand nodes and runs in well under a millisecond. that is why chords are
 * generated in the browser rather than baked into the corpus.
 */
export function generateChords(
  rules: ChordRules = DEFAULT_RULES,
  sizes: number[] = [3, 4, 5, 6],
): ChordShape[] {
  const out: ChordShape[] = []
  const seen = new Set<string>()

  for (const size of sizes) {
    const voicing: number[] = [0]
    const walk = () => {
      if (voicing.length === size) {
        if (!isValidChord(voicing, rules)) return
        const id = voicing.join('-')
        if (seen.has(id)) return
        seen.add(id)
        out.push(toShape(voicing))
        return
      }
      const last = voicing[voicing.length - 1]
      const candidates =
        rules.chainMode === 'linear'
          ? rules.friends.map((f) => last + f)
          : range(last + 1, rules.maxSpan)
      for (const next of candidates) {
        if (next > rules.maxSpan) continue
        voicing.push(next)
        // prune as early as possible: a prefix that already contains an enemy
        // or a crowd can never become valid
        if (!hasEnemy(voicing, rules) && !isCrowded(voicing, rules)) walk()
        voicing.pop()
      }
    }
    walk()
  }

  return out.sort((a, b) => a.size - b.size || compare(a.offsets, b.offsets))
}

function toShape(offsets: number[]): ChordShape {
  const copy = [...offsets]
  return {
    id: copy.join('-'),
    offsets: copy,
    size: copy.length,
    span: copy[copy.length - 1],
    pcs: copy.map((o) => mod(o, EDO)),
    names: [],
  }
}

export interface DegreeChords {
  degreeIndex: number
  /** pitch class of this scale degree, with the scale's root applied */
  rootPc: PitchClass
  chords: ChordShape[]
}

/**
 * the chords playable on each degree of a scale.
 *
 * membership is tested by pitch class, not by absolute offset, because a
 * voicing may span more than an octave — [0,7,13,21] reaches 1050 cents.
 */
export function chordsForScale(
  shape: ScaleShape,
  root: PitchClass,
  all: readonly ChordShape[],
): DegreeChords[] {
  const inScale = new Set(toPitchClasses(shape, root))
  return shape.degrees.map((degree, degreeIndex) => {
    const rootPc = mod(root + degree, EDO)
    const chords = all.filter((c) => c.pcs.every((pc) => inScale.has(mod(rootPc + pc, EDO))))
    return { degreeIndex, rootPc, chords }
  })
}

/** names from the source, keyed by voicing. */
export const CHORD_NAMES: Record<string, string> = {
  '0-6-14-19': 'minor harmonic seventh',
  '0-6-11-17': 'neutral 13th',
  '0-6-11-19': '19th to 15th',
  '0-7-13-21': 'added 13th minor',
  '0-7-14-19': 'minor harmonic 11th',
}

export function withNames(chords: ChordShape[]): ChordShape[] {
  return chords.map((c) => (CHORD_NAMES[c.id] ? { ...c, names: [CHORD_NAMES[c.id]] } : c))
}

function range(from: number, to: number): number[] {
  const out: number[] = []
  for (let i = from; i <= to; i++) out.push(i)
  return out
}

function compare(a: number[], b: number[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i]
  return a.length - b.length
}
