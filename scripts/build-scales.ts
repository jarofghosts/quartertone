/**
 * regenerate src/data/scales.generated.json.
 *
 * run with `npm run build:scales`. node strips the typescript natively, so
 * there is no build step and no tsx dependency. the output is committed, and
 * ci re-runs this and fails on any diff.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { brightnessOf, isTwelveEdoSubset, shapeFromPattern } from '../src/core/scale.ts'
import { SOURCES } from './sources/index.ts'
import type { ScaleContribution } from './sources/types.ts'

interface OutputScale {
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

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function build(): OutputScale[] {
  const byKey = new Map<string, { contributions: ScaleContribution[]; provenance: string[] }>()

  for (const source of SOURCES) {
    for (const c of source.collect()) {
      const entry = byKey.get(c.key) ?? { contributions: [], provenance: [] }
      entry.contributions.push(c)
      if (!entry.provenance.includes(source.id)) entry.provenance.push(source.id)
      byKey.set(c.key, entry)
    }
  }

  const scales: OutputScale[] = []
  const usedIds = new Set<string>()

  for (const [key, { contributions, provenance }] of byKey) {
    const shape = shapeFromPattern(key.split('-').map(Number))

    // a curated name always wins the display slot over a generated one like
    // "5L 2s (4:2) mode 3"
    const curated = contributions.filter((c) => c.tags?.includes('named'))
    const names = unique([
      ...curated.flatMap((c) => c.names ?? []),
      ...contributions.flatMap((c) => c.names ?? []),
    ])
    const tags = unique(contributions.flatMap((c) => c.tags ?? []))
    if (isTwelveEdoSubset(shape)) {
      if (!tags.includes('12edo')) tags.push('12edo')
    } else if (!tags.includes('quarter-tone')) {
      tags.push('quarter-tone')
    }

    let id = slugify(names[0] ?? key) || key
    if (usedIds.has(id)) id = `${id}-${key}`
    usedIds.add(id)

    scales.push({
      id,
      pattern: shape.pattern,
      degrees: shape.degrees,
      familyKey: shape.familyKey,
      names,
      family: contributions.find((c) => c.family)?.family,
      tags: tags.sort(),
      provenance,
      meta: Object.assign({ brightness: brightnessOf(shape) }, ...contributions.map((c) => c.meta ?? {})),
    })
  }

  // stable order so the committed json only changes when the data does
  return scales.sort((a, b) => a.pattern.length - b.pattern.length || a.id.localeCompare(b.id))
}

function unique<T>(xs: T[]): T[] {
  return [...new Set(xs)]
}

const here = dirname(fileURLToPath(import.meta.url))
const outPath = resolve(here, '../src/data/scales.generated.json')
const scales = build()
writeFileSync(outPath, JSON.stringify({ edo: 24, generated: scales }, null, 2) + '\n')

const named = scales.filter((s) => s.tags.includes('named')).length
const quarterTone = scales.filter((s) => s.tags.includes('quarter-tone')).length
console.log(`wrote ${scales.length} scales to ${outPath}`)
console.log(`  ${named} carry curated names, ${quarterTone} need quarter tones`)
for (const s of SOURCES) console.log(`  source ${s.id}: ${s.describe()}`)
