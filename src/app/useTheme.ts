import { useEffect, useState } from 'react'

export type ThemeChoice = 'light' | 'dark' | 'system'
const KEY = 'tiptap-pages:theme'

function systemTheme(): 'light' | 'dark' {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(() => {
    try {
      return (localStorage.getItem(KEY) as ThemeChoice) || 'system'
    } catch {
      return 'system'
    }
  })
  const [system, setSystem] = useState(systemTheme)

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    const onChange = () => setSystem(systemTheme())
    media?.addEventListener('change', onChange)
    return () => media?.removeEventListener('change', onChange)
  }, [])

  const resolved = choice === 'system' ? system : choice
  useEffect(() => {
    document.documentElement.dataset.theme = resolved
    try {
      localStorage.setItem(KEY, choice)
    } catch {
      /* ignore */
    }
  }, [choice, resolved])

  return { choice, resolved, setChoice }
}
