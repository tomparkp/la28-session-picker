import { Sun, Moon } from 'lucide-react'
import { useState, useEffect } from 'react'

const STORAGE_KEY = 'la28_unofficial_session_picker_theme'

export function ThemeToggle() {
  const [dark, setDark] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light') {
      setDark(false)
    } else if (stored === 'dark') {
      setDark(true)
    } else {
      setDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    const theme = next ? 'dark' : 'light'
    localStorage.setItem(STORAGE_KEY, theme)
    const doc = document.documentElement
    doc.setAttribute('data-theme-switching', '')
    doc.setAttribute('data-theme', theme)
    void doc.offsetHeight
    doc.removeAttribute('data-theme-switching')
  }

  return (
    <button
      className="border-border bg-surface text-ink2 hover:border-gold hover:bg-surface2 hover:text-gold absolute top-4 right-5 z-5 flex size-9 cursor-pointer items-center justify-center rounded-lg border transition-all duration-150 max-md:top-3 max-md:right-3"
      onClick={toggle}
      title="Toggle light/dark mode"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
