import { useState, useCallback } from 'react'

const STORAGE_KEY = 'la28_unofficial_session_picker_bookmarks'

function loadBookmarks(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))
  } catch {
    return new Set()
  }
}

function persistBookmarks(bookmarks: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...bookmarks]))
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Set<string>>(loadBookmarks)

  const toggle = useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      persistBookmarks(next)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setBookmarks(new Set())
    persistBookmarks(new Set())
  }, [])

  const isBookmarked = useCallback((id: string) => bookmarks.has(id), [bookmarks])

  return { bookmarks, toggle, clearAll, isBookmarked }
}
