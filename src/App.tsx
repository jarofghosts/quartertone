import { ScaleList } from './pages/ScaleList.tsx'
import { ScaleDetail } from './pages/ScaleDetail.tsx'
import { useRoute } from './hooks/useRoute.ts'
import { routeHref } from './lib/route.ts'
import { SCALES } from './data/registry.ts'
import './styles/app.css'

export function App() {
  const { route, params } = useRoute()

  return (
    <div className="shell">
      <header className="masthead">
        <h1>
          <a href={routeHref({ name: 'list' })}>quarter</a>
        </h1>
        <span className="tagline">
          {SCALES.length} scales in 24edo · 24 steps to the octave, 50 cents each
        </span>
        <span className="spacer" />
        {route.name === 'scale' ? (
          <a href={routeHref({ name: 'list' })} style={{ fontSize: '0.85rem' }}>
            ← all scales
          </a>
        ) : null}
      </header>

      <main style={{ flex: 1 }}>
        {route.name === 'scale' ? (
          <ScaleDetail id={route.id} params={params} />
        ) : (
          <ScaleList />
        )}
      </main>

      <footer className="colophon">
        scales enumerated as moments of symmetry, plus curated maqamat and 12edo inheritance.
        chords follow the quartertone harmony scheme from microtonaltheory.com.
      </footer>
    </div>
  )
}
