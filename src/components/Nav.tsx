import { Link, useRouterState } from '@tanstack/react-router'

import { cn } from '@/lib/cn'

import { ThemeToggle } from './ThemeToggle'

const tabs = [
  { to: '/', label: 'Sessions' },
  { to: '/venues', label: 'Venues' },
  { to: '/schedule', label: 'Schedule' },
  { to: '/ai-rating', label: 'AI Ratings' },
] as const

const ringColors = [
  'var(--ring-blue)',
  'var(--ring-yellow)',
  'var(--ring-black)',
  'var(--ring-green)',
  'var(--ring-red)',
]

export function Nav() {
  const { location } = useRouterState()

  return (
    <div className="relative overflow-hidden pt-12 px-6 pb-6 text-center">
      <ThemeToggle />
      <div className="relative flex justify-center gap-[3px] mb-3.5">
        {ringColors.map((color, i) => (
          <div
            key={i}
            className="size-[18px] rounded-full border-2 border-solid opacity-60"
            style={{ borderColor: color }}
          />
        ))}
      </div>
      <h1 className="relative font-display text-[2.2rem] font-normal -tracking-[0.03em] leading-[1.1] mb-1.5 max-md:text-[1.6rem]">
        <em className="italic text-gold">LA28</em> Session Picker
      </h1>
      <p className="relative text-ink3 text-[0.72rem] font-light mt-2 max-w-[600px] mx-auto leading-normal">
        This is an{' '}
        <strong>
          <u>unofficial</u>
        </strong>
        , open-source project not affiliated with the IOC or LA28. Session data is scraped from
        public materials and may be inaccurate or outdated. AI ratings are subjective and should not
        be used as a sole basis for decisions. Always verify against official sources.
      </p>
      <nav className="relative flex justify-center gap-1.5 mt-5">
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              'px-4 py-[7px] text-[0.82rem] font-medium no-underline rounded-md transition-all duration-150',
              location.pathname === tab.to
                ? 'text-ink bg-surface2 font-semibold'
                : 'text-ink3 hover:text-ink hover:bg-surface2',
            )}
          >
            {tab.label}
          </Link>
        ))}
        <a
          href="https://github.com/tomparkp/la28-session-picker"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-[7px] text-[0.82rem] font-medium text-ink3 no-underline rounded-md transition-all duration-150 hover:text-ink hover:bg-surface2"
        >
          GitHub ↗
        </a>
      </nav>
    </div>
  )
}
