import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({ component: About })

function About() {
  return (
    <div className="wrap">
      <div className="page-header">
        <h1>About</h1>
      </div>
      <div className="about-content">
        <p>
          A personal side project I quickly put together to help myself decide on LA28 Olympic
          sessions. It lets you browse and filter event sessions based on data scraped from publicly
          available schedules and other materials.
        </p>
        <h2>Disclaimer</h2>
        <p>
          This is an unofficial, open-source project and is not affiliated with, endorsed by, or
          connected to the International Olympic Committee (IOC), LA28 Organizing Committee, or any
          official Olympic body. Session data is scraped from publicly available schedules and
          materials and may be inaccurate, incomplete, or outdated. AI ratings are subjective and
          should not be used as a sole basis for decisions. Always verify details against official
          sources before making any plans or purchasing decisions. Use at your own risk.
        </p>
      </div>
      <div className="footer-note">
        Built with TanStack Start, Tailwind CSS, Zed, and Claude Code
      </div>
    </div>
  )
}
