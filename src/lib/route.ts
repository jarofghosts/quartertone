/**
 * a hash router, hand-rolled because there are two routes.
 *
 * hash routing specifically: this ships as static files, so a deep link like
 * /scale/major would 404 on github pages or plain object storage without
 * server rewrites. `#/scale/major` never touches the server.
 */
export type Route = { name: 'list' } | { name: 'scale'; id: string }

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '').split('?')[0]
  const m = /^\/scale\/(.+)$/.exec(path)
  return m ? { name: 'scale', id: decodeURIComponent(m[1]) } : { name: 'list' }
}

export function routeHref(route: Route, params: Record<string, string> = {}): string {
  const base = route.name === 'scale' ? `#/scale/${encodeURIComponent(route.id)}` : '#/'
  const q = new URLSearchParams(params).toString()
  return q ? `${base}?${q}` : base
}

export function currentParams(): Record<string, string> {
  const q = window.location.hash.split('?')[1] ?? ''
  return Object.fromEntries(new URLSearchParams(q))
}

/** replace the query string without adding a history entry. */
export function setParams(params: Record<string, string>): void {
  const path = window.location.hash.replace(/^#/, '').split('?')[0] || '/'
  const q = new URLSearchParams(params).toString()
  const next = `#${path}${q ? `?${q}` : ''}`
  if (next !== window.location.hash) {
    window.history.replaceState(null, '', next)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }
}
