import { useEffect, useState } from 'react'

/** Hash routes, so GitHub Pages needs no server rewrites: #/ · #/page/<id> · #/tour */
export type Route = { name: 'list' } | { name: 'page'; id: string; edit: boolean } | { name: 'tour' }

export function parseRoute(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#/, '').split('?')
  const parts = path.split('/').filter(Boolean)
  if (parts[0] === 'page' && parts[1]) return { name: 'page', id: decodeURIComponent(parts[1]), edit: new URLSearchParams(query).has('edit') }
  if (parts[0] === 'tour') return { name: 'tour' }
  return { name: 'list' }
}

export const routes = {
  list: () => '#/',
  page: (id: string, edit = false) => `#/page/${encodeURIComponent(id)}${edit ? '?edit' : ''}`,
  tour: () => '#/tour',
}

export function navigate(hash: string) {
  if (location.hash !== hash) location.hash = hash
}

export function useRoute() {
  const [route, setRoute] = useState(() => parseRoute(location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
