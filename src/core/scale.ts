import { EDO, mod, type PitchClass, type Step } from './pitch.ts'

/**
 * a scale is stored as its *step pattern* — the consecutive gaps, which always
 * sum to 24. that form makes mode rotation and mos reasoning trivial, and the
 * degrees are one scan away.
 */
export interface ScaleShape {
  /** consecutive gaps, sums to EDO */
  pattern: number[]
  /** cumulative degrees from the root, starting at 0, length === pattern.length */
  degrees: PitchClass[]
  /** primary key for this exact mode, e.g. '4-4-2-4-4-4-2' */
  key: string
  /** shared by every mode of the same scale — the lexicographically least rotation */
  familyKey: string
}

/** one entry in the browsable corpus. metadata is unioned across sources. */
export interface ScaleEntry {
  id: string
  shape: ScaleShape
  /** lowercase; first is the display name */
  names: string[]
  /** e.g. '5L 2s (4:2)' */
  family?: string
  tags: string[]
  /** which sources contributed to this entry */
  provenance: string[]
  meta: Record<string, string | number>
}

export function shapeFromPattern(pattern: number[]): ScaleShape {
  const total = pattern.reduce((a, b) => a + b, 0)
  if (total !== EDO) {
    throw new Error(`step pattern must sum to ${EDO}, got ${total} from ${pattern.join('-')}`)
  }
  if (pattern.some((s) => s <= 0)) {
    throw new Error(`step pattern must be all-positive, got ${pattern.join('-')}`)
  }
  const degrees: PitchClass[] = []
  let acc = 0
  for (const s of pattern) {
    degrees.push(acc)
    acc += s
  }
  return {
    pattern,
    degrees,
    key: pattern.join('-'),
    familyKey: canonicalRotation(pattern).join('-'),
  }
}

/** build from degrees (ascending pitch classes starting at 0). */
export function shapeFromDegrees(degrees: PitchClass[]): ScaleShape {
  const sorted = [...new Set(degrees.map((d) => mod(d, EDO)))].sort((a, b) => a - b)
  if (sorted[0] !== 0) throw new Error('degrees must start at 0')
  const pattern = sorted.map((d, i) => (i === sorted.length - 1 ? EDO : sorted[i + 1]) - d)
  return shapeFromPattern(pattern)
}

export function rotate(pattern: number[], by: number): number[] {
  const n = pattern.length
  const k = mod(by, n)
  return [...pattern.slice(k), ...pattern.slice(0, k)]
}

/** the lexicographically least rotation — a stable identity for a mode family. */
export function canonicalRotation(pattern: number[]): number[] {
  let best = pattern
  for (let i = 1; i < pattern.length; i++) {
    const cand = rotate(pattern, i)
    if (compareArrays(cand, best) < 0) best = cand
  }
  return best
}

/**
 * every distinct mode. a multi-period scale has fewer modes than notes — the
 * octatonic 4L 4s repeats every 6 steps, so its 8 notes yield only 2 modes.
 */
export function modesOf(pattern: number[]): number[][] {
  const seen = new Set<string>()
  const out: number[][] = []
  for (let i = 0; i < pattern.length; i++) {
    const r = rotate(pattern, i)
    const k = r.join('-')
    if (seen.has(k)) continue
    seen.add(k)
    out.push(r)
  }
  return out
}

/**
 * brightness: a mode is brighter when its degrees sit higher. ordering modes
 * this way puts lydian before ionian before mixolydian, which is how every
 * xen reference lists them.
 */
export function brightnessOf(shape: ScaleShape): number {
  return shape.degrees.reduce((a, b) => a + b, 0)
}

/** absolute steps for this shape rooted at a given absolute step. */
export function toAbsoluteSteps(shape: ScaleShape, rootStep: Step): Step[] {
  return shape.degrees.map((d) => rootStep + d)
}

/** pitch classes of the shape transposed to a root. */
export function toPitchClasses(shape: ScaleShape, root: PitchClass): PitchClass[] {
  return shape.degrees.map((d) => mod(root + d, EDO))
}

export function containsPitchClass(shape: ScaleShape, root: PitchClass, pc: PitchClass): boolean {
  return toPitchClasses(shape, root).includes(mod(pc, EDO))
}

/** true when the scale uses only even steps, i.e. it already exists in 12edo. */
export function isTwelveEdoSubset(shape: ScaleShape): boolean {
  return shape.degrees.every((d) => d % 2 === 0)
}

export function scaleCents(shape: ScaleShape): number[] {
  return shape.degrees.map((d) => d * (1200 / EDO))
}

function compareArrays(a: number[], b: number[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] - b[i]
  }
  return a.length - b.length
}
