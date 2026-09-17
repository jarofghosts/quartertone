import { EDO, mod, pcName, type PitchClass, type Spelling, type Step } from './pitch.ts'
import { toPitchClasses, type ScaleShape } from './scale.ts'

/**
 * all-fourths tuning e a d g c f.
 *
 * a perfect fourth is 10 steps in 24edo, so every string sits exactly 10 frets
 * above the one below and the whole board is uniform — no b-string exception.
 * frets are quarter tones, so 24 frets is one octave.
 */
export const EADGCF: readonly Step[] = [80, 90, 100, 110, 120, 130] // e2 a2 d3 g3 c4 f4

export const FOURTH_STEPS = 10

export interface FretCell {
  stringIndex: number
  fret: number
  step: Step
  pc: PitchClass
  /** index into the scale's degrees, or null when the note is out of scale */
  degreeIndex: number | null
  isRoot: boolean
  /** true when this pitch class does not exist in 12edo */
  isQuarterTone: boolean
  label: string
}

export interface FretboardModel {
  tuning: readonly Step[]
  fretCount: number
  /** rows[stringIndex][fret], with string 0 the lowest */
  rows: FretCell[][]
  /** frets that land an exact octave above the open string */
  octaveFrets: number[]
}

export function buildFretboard(
  shape: ScaleShape,
  root: PitchClass,
  fretCount = 36,
  tuning: readonly Step[] = EADGCF,
  spelling: Spelling = 'arrows',
): FretboardModel {
  const pcs = toPitchClasses(shape, root)
  const degreeOf = new Map(pcs.map((pc, i) => [pc, i]))

  const rows = tuning.map((open, stringIndex) =>
    Array.from({ length: fretCount + 1 }, (_, fret): FretCell => {
      const step = open + fret
      const pc = mod(step, EDO)
      const degreeIndex = degreeOf.has(pc) ? degreeOf.get(pc)! : null
      return {
        stringIndex,
        fret,
        step,
        pc,
        degreeIndex,
        isRoot: pc === mod(root, EDO),
        isQuarterTone: pc % 2 === 1,
        label: pcName(pc, spelling),
      }
    }),
  )

  const octaveFrets: number[] = []
  for (let f = EDO; f <= fretCount; f += EDO) octaveFrets.push(f)

  return { tuning, fretCount, rows, octaveFrets }
}
