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
    document.documentElement.setAttribute('data-theme', theme)
  }

  return (
    <button className="theme-toggle" onClick={toggle} title="Toggle light/dark mode">
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
