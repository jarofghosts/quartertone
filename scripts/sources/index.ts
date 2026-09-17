import { curatedSource } from './curated.ts'
import { mosSource } from './mos.ts'
import type { ScaleSource } from './types.ts'

/** add a new ingest source here and nothing else needs to change. */
export const SOURCES: ScaleSource[] = [mosSource, curatedSource]
