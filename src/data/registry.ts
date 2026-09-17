import raw from './scales.generated.json'
import { shapeFromPattern, type ScaleEntry } from '../core/scale.ts'

interface RawScale {
  id: string
  pattern: number[]
  degrees: number[]
  familyKey: string
  names: string[]
  family?: string
  tags: string[]
  provenance: string[]
  meta: Record<string, string | number>
}

/**
 * the committed corpus, produced by `npm run build:scales`. ci regenerates it
 * and fails on a diff, so this file and the generator cannot drift apart.
 */
export const SCALES: ScaleEntry[] = (raw.generated as RawScale[]).map((s) => ({
  id: s.id,
  shape: shapeFromPattern(s.pattern),
  names: s.names,
  family: s.family,
  tags: s.tags,
  provenance: s.provenance,
  meta: s.meta,
}))

const BY_ID = new Map(SCALES.map((s) => [s.id, s]))

export function scaleById(id: string): ScaleEntry | undefined {
  return BY_ID.get(id)
}

export const ALL_TAGS: string[] = [...new Set(SCALES.flatMap((s) => s.tags))]
  .filter((t) => !/^\d+-note$/.test(t))
  .sort()

export const NOTE_COUNTS: number[] = [
  ...new Set(SCALES.map((s) => s.shape.pattern.length)),
].sort((a, b) => a - b)

export function displayName(entry: ScaleEntry): string {
  return entry.names[0] ?? entry.shape.key
}
