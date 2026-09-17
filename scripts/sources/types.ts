/**
 * a source contributes metadata keyed by step pattern. the registry groups
 * contributions by that key and unions them, so the curated file naturally
 * attaches "major / ionian" to the very same record the mos enumerator emits
 * for 5L 2s (4:2) — no duplicate rows, no reconciliation code, and a future
 * source (a saved wiki page, a scala archive import) plugs in with no changes
 * anywhere else.
 */
export interface ScaleContribution {
  /** step pattern joined by '-', e.g. '4-4-2-4-4-4-2' */
  key: string
  names?: string[]
  tags?: string[]
  family?: string
  meta?: Record<string, string | number>
}

export interface ScaleSource {
  id: string
  describe(): string
  collect(): ScaleContribution[]
}
