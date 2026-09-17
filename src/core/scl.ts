import { CENTS_PER_STEP, EDO, asciiPcName, type PitchClass } from './pitch.ts'
import type { ScaleShape } from './scale.ts'

export interface SclOptions {
  /** the description line; scala shows this in its scale list */
  description: string
  /** extra `!` comment lines above the description */
  comments?: string[]
  filename?: string
}

/**
 * write a scala .scl tuning file.
 *
 * FORMAT TRAP: scala decides cents-vs-ratio by whether the value contains a
 * period. bare `50` is the frequency ratio 50/1, roughly five and a half
 * octaves up; `50.0` is fifty cents. always emit a decimal point. there is a
 * test pinning this.
 *
 * the degree list EXCLUDES the unison (1/1, always implicit) and INCLUDES the
 * closing octave, so an n-note scale writes n lines.
 */
export function writeScl(shape: ScaleShape, opts: SclOptions): string {
  const lines: string[] = []
  if (opts.filename) lines.push(`! ${opts.filename}`)
  lines.push('!')
  for (const c of opts.comments ?? []) lines.push(`! ${c}`)
  if (opts.comments?.length) lines.push('!')

  lines.push(opts.description)

  // degrees after the implicit 1/1, then the octave
  const values = [...shape.degrees.slice(1).map((d) => d * CENTS_PER_STEP), EDO * CENTS_PER_STEP]
  lines.push(` ${values.length}`)
  lines.push('!')
  for (const v of values) lines.push(` ${v.toFixed(6)}`)

  return lines.join('\n') + '\n'
}

/** lowercase, hyphenated, no `#` or `↑` — both cause shell and url grief. */
export function sclFilename(scaleName: string, root: PitchClass): string {
  const slug = scaleName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug || 'scale'}-${asciiPcName(root)}.scl`
}
