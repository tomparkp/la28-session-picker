import { ArrowUp } from 'lucide-react'
import { useEffect, useState } from 'react'

const SHOW_THRESHOLD = 400

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > SHOW_THRESHOLD)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}
      title="Scroll to top"
      aria-label="Scroll to top"
      className="border-border bg-surface text-ink2 hover:border-gold hover:bg-surface2 hover:text-gold fixed right-5 bottom-5 z-10 flex size-10 cursor-pointer items-center justify-center rounded-lg border shadow-lg transition-all duration-150 max-md:right-3 max-md:bottom-3"
    >
      <ArrowUp size={18} />
    </button>
  )
}
