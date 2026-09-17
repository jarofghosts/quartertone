import { useEffect, useState } from 'react'
import { currentParams, parseRoute, type Route } from '../lib/route.ts'

export function useRoute(): { route: Route; params: Record<string, string> } {
  const read = () => ({ route: parseRoute(window.location.hash), params: currentParams() })
  const [state, setState] = useState(read)

  useEffect(() => {
    const onChange = () => setState(read())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return state
}
