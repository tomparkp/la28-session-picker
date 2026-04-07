import { Link, useRouterState } from '@tanstack/react-router'

import { ThemeToggle } from './ThemeToggle'

const tabs = [
  { to: '/', label: 'Sessions' },
  { to: '/venues', label: 'Venues' },
  { to: '/calendar', label: 'Agenda' },
  { to: '/ai-rating', label: 'AI Ratings' },
  { to: '/about', label: 'About' },
] as const

export function Nav() {
  const { location } = useRouterState()

  return (
    <div className="hero">
      <ThemeToggle />
      <div className="rings">
        <div className="ring" />
        <div className="ring" />
        <div className="ring" />
        <div className="ring" />
        <div className="ring" />
      </div>
      <h1>
        <em>LA28</em> Session Picker
      </h1>
      <p className="disclaimer">
        This is an{' '}
        <strong>
          <u>unofficial</u>
        </strong>
        , open-source project not affiliated with the IOC or LA28. Session data is scraped from
        public materials and may be inaccurate or outdated. AI ratings are subjective and should not
        be used as a sole basis for decisions. Always verify against official sources.
      </p>
      <nav className="nav-tabs">
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className={`nav-tab ${location.pathname === tab.to ? 'nav-tab-active' : ''}`}
          >
            {tab.label}
          </Link>
        ))}
        <a
          href="https://github.com/tomparkp/la28-session-picker"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-tab"
        >
          GitHub ↗
        </a>
      </nav>
    </div>
  )
}
