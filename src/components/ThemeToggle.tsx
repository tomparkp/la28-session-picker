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
      className="absolute top-4 right-5 size-9 border border-border bg-surface rounded-lg cursor-pointer flex items-center justify-center transition-all duration-150 z-5 text-ink2 hover:border-gold hover:bg-surface2 hover:text-gold max-md:top-3 max-md:right-3"
      onClick={toggle}
      title="Toggle light/dark mode"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
