import { useMemo, useState } from 'react'
import { ALL_TAGS, NOTE_COUNTS, SCALES, displayName } from '../data/registry.ts'
import type { ScaleEntry } from '../core/scale.ts'
import { routeHref } from '../lib/route.ts'

const DEFAULT_HIDDEN = ['degenerate']

type Sort = 'named' | 'notes' | 'name'

const SORTS: { id: Sort; label: string }[] = [
  { id: 'named', label: 'named first' },
  { id: 'notes', label: 'note count' },
  { id: 'name', label: 'a-z' },
]

export function ScaleList() {
  const [query, setQuery] = useState('')
  const [counts, setCounts] = useState<number[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [showAll, setShowAll] = useState(false)
  const [sort, setSort] = useState<Sort>('named')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matched = SCALES.filter((s) => {
      if (!showAll && DEFAULT_HIDDEN.some((t) => s.tags.includes(t))) return false
      if (!showAll && s.shape.pattern.length < 5) return false
      if (counts.length && !counts.includes(s.shape.pattern.length)) return false
      if (tags.length && !tags.every((t) => s.tags.includes(t))) return false
      if (!q) return true
      return (
        s.names.some((n) => n.includes(q)) ||
        s.shape.key.includes(q) ||
        (s.family?.toLowerCase().includes(q) ?? false) ||
        s.tags.some((t) => t.includes(q))
      )
    })

    // scales people actually search for lead by default. the exhaustive mos
    // enumeration is the bulk of the corpus but the long tail of
    // "1L 4s (12:3) mode 4" should never be the first thing on the page.
    const byName = (a: ScaleEntry, b: ScaleEntry) =>
      displayName(a).localeCompare(displayName(b))

    return [...matched].sort((a, b) => {
      if (sort === 'name') return byName(a, b)
      if (sort === 'notes') {
        return a.shape.pattern.length - b.shape.pattern.length || byName(a, b)
      }
      const named = Number(b.tags.includes('named')) - Number(a.tags.includes('named'))
      return named || a.shape.pattern.length - b.shape.pattern.length || byName(a, b)
    })
  }, [query, counts, tags, showAll, sort])

  return (
    <div className="layout">
      <aside>
        <div className="facet">
          <h3>search</h3>
          <input
            type="text"
            value={query}
            placeholder="name, tag, or 4-3-3-4"
            onChange={(e) => setQuery(e.target.value)}
            aria-label="search scales"
          />
        </div>

        <div className="facet">
          <h3>sort</h3>
          <div className="chips">
            {SORTS.map((o) => (
              <Chip
                key={o.id}
                label={o.label}
                active={sort === o.id}
                onClick={() => setSort(o.id)}
              />
            ))}
          </div>
        </div>

        <div className="facet">
          <h3>notes</h3>
          <div className="chips">
            {NOTE_COUNTS.filter((n) => showAll || n >= 5).map((n) => (
              <Chip
                key={n}
                label={String(n)}
                active={counts.includes(n)}
                onClick={() => setCounts(toggle(counts, n))}
              />
            ))}
          </div>
        </div>

        <div className="facet">
          <h3>tags</h3>
          <div className="chips">
            {ALL_TAGS.map((t) => (
              <Chip
                key={t}
                label={t}
                active={tags.includes(t)}
                onClick={() => setTags(toggle(tags, t))}
              />
            ))}
          </div>
        </div>

        <div className="facet">
          <Chip
            label="show degenerate scales"
            active={showAll}
            onClick={() => setShowAll(!showAll)}
          />
          <p style={{ color: 'var(--muted)', fontSize: '0.7rem', marginTop: 'var(--spacing-xs)' }}>
            tiny scales and lopsided ones like 1L 10s (14:1) are real moment-of-symmetry
            scales and musically useless. hidden by default.
          </p>
        </div>
      </aside>

      <div>
        <p className="count">
          {results.length} of {SCALES.length} scales
        </p>
        {results.length === 0 ? (
          <p className="empty">nothing matches those filters</p>
        ) : (
          results.map((s) => (
            <a key={s.id} href={routeHref({ name: 'scale', id: s.id })} className="scale-row">
              <span>
                <span className="name">{displayName(s)}</span>
                {s.names.length > 1 ? (
                  <span className="aka"> · {s.names.slice(1, 3).join(' · ')}</span>
                ) : null}
                {s.family ? <span className="fam"> · {s.family}</span> : null}
              </span>
              <span className="pattern">{s.shape.pattern.join(' ')}</span>
            </a>
          ))
        )}
      </div>
    </div>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick(): void }) {
  return (
    <button type="button" className="ghost" aria-pressed={active} onClick={onClick}>
      {label}
    </button>
  )
}

function toggle<T>(xs: T[], x: T): T[] {
  return xs.includes(x) ? xs.filter((v) => v !== x) : [...xs, x]
}
