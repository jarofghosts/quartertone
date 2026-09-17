// 24edo pitch arithmetic. everything upstream of this speaks in integer steps;
// cents and hertz only appear at the very edges (scl export, synth, midi).

export const EDO = 24
export const CENTS_PER_STEP = 1200 / EDO // 50

/** absolute 24edo index. 0 is c-1, so step = midiNote * 2 exactly. */
export type Step = number
/** 0..23 */
export type PitchClass = number

/** a4 = 440hz sits at midi 69, so step 138. */
export const A4_STEP: Step = 138
export const A4_HZ = 440

/**
 * the twenty-four pitch classes.
 *
 * this table is lifted from the user's own ../bitwig-linnstrument-24edo
 * (`NOTE_NAMES_24`), lowercased. the convention is ups-and-downs applied
 * consistently: every 12edo note gets an arrow-raised quarter-tone variant, so
 * step 3 is `c#↑` rather than `d-`. keeping it identical to the linnstrument
 * script means one mental model across both projects.
 *
 * `↑` is u+2191 — a BMP arrow that renders in courier new. the dedicated
 * quarter-tone accidentals 𝄲/𝄳 (u+1d132/33) do NOT, so they are deliberately
 * not used anywhere.
 */
export const NOTE_NAMES_24 = [
  'c', 'c↑', 'c#', 'c#↑',
  'd', 'd↑', 'd#', 'd#↑',
  'e', 'e↑',
  'f', 'f↑', 'f#', 'f#↑',
  'g', 'g↑', 'g#', 'g#↑',
  'a', 'a↑', 'a#', 'a#↑',
  'b', 'b↑',
] as const

/** natural-note pitch classes, matching the linnstrument script's WHITE_KEY_PC. */
export const NATURAL_PC: Record<string, PitchClass> = {
  c: 0, d: 4, e: 8, f: 10, g: 14, a: 18, b: 22,
}

/** `arrows` matches the linnstrument script. `quarter` is the half-sharp /
    half-flat idiom maqam literature uses. `steps` is the raw index. */
export type Spelling = 'arrows' | 'quarter' | 'steps'

// half-sharp / half-flat spelling: lean on the lower neighbour when it is
// natural, otherwise the upper one, so a quarter tone is never stacked on a
// sharp (step 3 reads `d-`, never `c#+`).
const QUARTER_NAMES = [
  'c', 'c+', 'c#', 'd-',
  'd', 'd+', 'd#', 'e-',
  'e', 'e+',
  'f', 'f+', 'f#', 'g-',
  'g', 'g+', 'g#', 'a-',
  'a', 'a+', 'a#', 'b-',
  'b', 'b+',
] as const

/** true euclidean modulo. js `%` keeps the sign of the dividend, which breaks
    every pitch-class calculation on notes below c-1. */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

export function pitchClass(step: Step): PitchClass {
  return mod(step, EDO)
}

/** scientific-pitch octave number. step 0 is c-1, matching midi. */
export function octaveOf(step: Step): number {
  return Math.floor(step / EDO) - 1
}

export function centsOf(steps: number): number {
  return steps * CENTS_PER_STEP
}

export function stepToFreq(step: Step): number {
  return A4_HZ * Math.pow(2, (step - A4_STEP) / EDO)
}

/**
 * split a step into the 12edo note it sits on and whether it needs raising by a
 * further quarter tone. 24edo only ever needs these two states, which is why the
 * midi exporter needs just two channels rather than a channel per voice.
 */
export function stepToMidi(step: Step): { note: number; bend: 0 | 1 } {
  return { note: Math.floor(step / 2), bend: (mod(step, 2) as 0 | 1) }
}

export function midiToStep(note: number): Step {
  return note * 2
}

export function pcName(pc: PitchClass, spelling: Spelling = 'arrows'): string {
  const i = mod(pc, EDO)
  if (spelling === 'steps') return String(i)
  return spelling === 'quarter' ? QUARTER_NAMES[i] : NOTE_NAMES_24[i]
}

/** name with octave, e.g. `c↑4`. */
export function stepName(step: Step, spelling: Spelling = 'arrows'): string {
  return `${pcName(pitchClass(step), spelling)}${octaveOf(step)}`
}

/**
 * filename-safe name. `#` and `↑` both cause shell and url grief, so downloads
 * use this instead of the display name.
 */
export function asciiPcName(pc: PitchClass): string {
  return NOTE_NAMES_24[mod(pc, EDO)].replace('#', 's').replace('↑', 'up')
}

/** parse a name in any spelling back to a pitch class, for url state. */
export function parsePcName(input: string): PitchClass | null {
  const s = input.trim().toLowerCase()
  if (/^\d+$/.test(s)) {
    const n = Number(s)
    return n >= 0 && n < EDO ? n : null
  }
  const byArrow = NOTE_NAMES_24.indexOf(s as (typeof NOTE_NAMES_24)[number])
  if (byArrow >= 0) return byArrow
  const byQuarter = QUARTER_NAMES.indexOf(s as (typeof QUARTER_NAMES)[number])
  if (byQuarter >= 0) return byQuarter
  const byAscii = NOTE_NAMES_24.findIndex((_, i) => asciiPcName(i) === s)
  return byAscii >= 0 ? byAscii : null
}
