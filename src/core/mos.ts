import { EDO } from './pitch.ts'
import { modesOf, shapeFromPattern, type ScaleShape } from './scale.ts'

/**
 * a moment-of-symmetry scale: `x` large steps of size `large` and `y` small
 * steps of size `small`, arranged as evenly as possible.
 *
 * note that `xL ys` alone does NOT identify a scale in 24edo — `2L 3s` exists
 * as both (L=9,s=2) and (L=6,s=4). the step sizes are part of the identity, so
 * the display name always carries them.
 */
export interface MosFamily {
  x: number
  y: number
  large: number
  small: number
  /** notes per octave */
  n: number
  /** how many times the pattern repeats within the octave; 1 for most scales */
  periods: number
  /** e.g. '5L 2s (4:2)' */
  name: string
}

/**
 * the evenest arrangement of `x` large steps among `n` positions — the
 * mechanical (christoffel) word.
 *
 * this is why we do not enumerate by stacking a generator mod 24: a generator
 * sharing a factor with 24 terminates its chain early and silently drops every
 * multi-period mos. the word construction handles those for free — when
 * gcd(x, y) > 1 it simply emits the primitive word repeated.
 */
export function mosPattern(x: number, y: number, large: number, small: number): number[] {
  const n = x + y
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const isLarge = Math.floor(((i + 1) * x) / n) - Math.floor((i * x) / n) === 1
    out.push(isLarge ? large : small)
  }
  return out
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

/**
 * every mos family that fits in 24edo, by solving x*large + y*small = 24 for
 * integer sizes with large > small > 0.
 */
export function enumerateMosFamilies(minNotes = 2, maxNotes = 12): MosFamily[] {
  const out: MosFamily[] = []
  for (let n = minNotes; n <= maxNotes; n++) {
    for (let x = 1; x < n; x++) {
      const y = n - x
      for (let small = 1; small < EDO; small++) {
        const rest = EDO - y * small
        if (rest <= 0 || rest % x !== 0) continue
        const large = rest / x
        if (large <= small) continue
        const periods = gcd(x, y)
        out.push({
          x,
          y,
          large,
          small,
          n,
          periods,
          name: `${x}L ${y}s (${large}:${small})`,
        })
      }
    }
  }
  return out
}

export interface MosMode {
  family: MosFamily
  shape: ScaleShape
  /** 0 is the canonical (brightest-ordered) mode */
  modeIndex: number
}

/** expand a family into its distinct modes. */
export function modesOfFamily(family: MosFamily): MosMode[] {
  const base = mosPattern(family.x, family.y, family.large, family.small)
  return modesOf(base).map((pattern, modeIndex) => ({
    family,
    shape: shapeFromPattern(pattern),
    modeIndex,
  }))
}

/**
 * a scale where the large step dwarfs the small one (1L 10s at 14:1, or
 * 1L 4s at 12:3 where the "step" is a tritone) is technically a mos and
 * musically useless. flagging rather than dropping lets the ui hide them by
 * default behind a toggle.
 */
export function isDegenerate(family: MosFamily): boolean {
  return family.large >= 4 * family.small
}

/**
 * independent check that a step pattern really is a mos: every generic interval
 * class must come in at most two specific sizes (max variety 2). used as a
 * property test against the word construction rather than in the app.
 */
export function hasMaxVarietyTwo(pattern: number[]): boolean {
  const n = pattern.length
  for (let span = 1; span < n; span++) {
    const sizes = new Set<number>()
    for (let i = 0; i < n; i++) {
      let sum = 0
      for (let k = 0; k < span; k++) sum += pattern[(i + k) % n]
      sizes.add(sum)
    }
    if (sizes.size > 2) return false
  }
  return true
}
