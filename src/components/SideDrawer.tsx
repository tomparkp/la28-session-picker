import { Drawer } from '@base-ui/react/drawer'
import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'

import { cn } from '@/lib/cn'

const MD_BREAKPOINT = 768

interface SideDrawerProps {
  open: boolean
  onClose: () => void
  'aria-label': string
  defaultWidth: number
  minWidth?: number
  maxWidth?: number
  children: ReactNode
  popupClassName?: string
  contentClassName?: string
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MD_BREAKPOINT - 1}px)`)
    setMobile(mql.matches)

    function onChange(e: MediaQueryListEvent) {
      setMobile(e.matches)
    }

    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return mobile
}

export function SideDrawer({
  open,
  onClose,
  'aria-label': ariaLabel,
  defaultWidth,
  minWidth = 360,
  maxWidth = 900,
  children,
  popupClassName,
  contentClassName,
}: SideDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const widthRef = useRef(defaultWidth)
  const [width, setWidth] = useState(defaultWidth)
  const isMobile = useIsMobile()

  function handleResizeStart(e: ReactPointerEvent) {
    if (isMobile) return

    e.preventDefault()
    const startX = e.clientX
    const startWidth = widthRef.current

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    if (panelRef.current) panelRef.current.style.transition = 'none'

    function onMove(ev: globalThis.PointerEvent) {
      const next = Math.min(maxWidth, Math.max(minWidth, startWidth + (startX - ev.clientX)))
      widthRef.current = next
      if (panelRef.current) panelRef.current.style.width = `${next}px`
    }

    function onUp() {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      if (panelRef.current) panelRef.current.style.transition = ''
      setWidth(widthRef.current)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  function handleResizeDoubleClick() {
    widthRef.current = defaultWidth
    setWidth(defaultWidth)
  }

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
      modal={isMobile ? true : 'trap-focus'}
      swipeDirection="right"
    >
      <Drawer.Portal keepMounted>
        <Drawer.Backdrop className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 data-[closed]:pointer-events-none data-[closed]:opacity-0 data-[open]:opacity-100 md:hidden" />
        <Drawer.Viewport className="pointer-events-none fixed inset-0 z-50">
          <Drawer.Popup
            ref={panelRef}
            data-side-drawer
            aria-label={ariaLabel}
            style={isMobile ? undefined : { width }}
            className={cn(
              'pointer-events-auto fixed inset-y-0 right-0 border-l border-border bg-surface shadow-2xl',
              'max-md:w-full max-md:border-l-0 md:max-w-full',
              '[transform:translateX(var(--drawer-swipe-movement-x))]',
              'transition-transform duration-200 ease-panel data-[swiping]:transition-none',
              'data-[closed]:[transform:translateX(100%)] data-[starting-style]:[transform:translateX(100%)] data-[ending-style]:[transform:translateX(100%)]',
              popupClassName,
            )}
          >
            <div
              className="group/edge absolute inset-y-0 -left-1 z-20 w-2 cursor-col-resize max-md:hidden"
              onPointerDown={handleResizeStart}
              onDoubleClick={handleResizeDoubleClick}
            >
              <div className="group-hover/edge:bg-gold/40 group-active/edge:bg-gold/60 absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-transparent transition-colors" />
            </div>

            <div
              className={cn(
                'flex h-full flex-col overflow-y-auto overscroll-contain',
                contentClassName,
              )}
            >
              <div className="flex justify-center pt-2.5 pb-1 md:hidden" aria-hidden>
                <div className="bg-border2 h-1 w-10 rounded-full" />
              </div>
              {children}
            </div>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
