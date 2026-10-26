import { useEffect, useMemo } from 'react'
import { EditorScreen } from './app/EditorScreen'
import { navigate, routes, useRoute } from './app/router'
import type { ThemeState } from './app/TopBar'
import type { Session } from './auth/verify'
import { PagesList } from './pages/PagesList'
import { PageStore, usePages } from './pages/store'
import { TourPage } from './tour/TourPage'

/** Signed-in shell: pages list, a page, or the product tour. */
export default function App({ session, theme }: { session: Session; theme: ThemeState }) {
  const store = useMemo(() => new PageStore(session), [session])
  const route = useRoute()
  const pages = usePages(store)
  const page = route.name === 'page' ? pages.find(p => p.id === route.id) : undefined

  // Unknown or expired page links (pages live for the session) fall back to the list.
  useEffect(() => {
    if (route.name === 'page' && !page) navigate(routes.list())
  }, [route, page])

  if (route.name === 'tour') return <TourPage session={session} theme={theme} />
  if (route.name === 'page' && page) return <EditorScreen key={page.id} page={page} store={store} session={session} theme={theme} />
  return <PagesList store={store} session={session} theme={theme} />
}
