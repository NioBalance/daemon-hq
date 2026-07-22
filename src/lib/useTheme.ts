import { useCallback, useState } from 'react'

export type Theme = 'dark' | 'light'

const KEY = 'dhq:theme'

function apply(theme: Theme) {
  if (theme === 'light') document.documentElement.dataset.theme = 'light'
  else delete document.documentElement.dataset.theme
}

/** Tema chiaro/scuro: solo preferenza UI, persistita in localStorage.
 *  L'attributo su <html> è già applicato pre-paint da uno script inline in
 *  index.html (evita il flash del tema sbagliato); qui si sincronizza lo
 *  stato React e si scrive il toggle. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'))

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem(KEY, next)
      apply(next)
      return next
    })
  }, [])

  return { theme, toggleTheme }
}
