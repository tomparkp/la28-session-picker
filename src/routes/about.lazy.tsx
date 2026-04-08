import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/about')({ component: About })

function About() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 pt-4 pb-15">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-normal text-ink -tracking-[0.02em]">About</h1>
      </div>
      <div className="max-w-[680px] text-[0.85rem] leading-[1.7] text-ink2 [&_h2]:font-display [&_h2]:text-[1.1rem] [&_h2]:font-normal [&_h2]:text-ink [&_h2]:mt-6 [&_h2]:mb-2 [&_p]:mb-3">
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
      <div className="text-center p-6 text-[0.72rem] text-ink3 font-light">
        Built with TanStack Start, Tailwind CSS, Zed, and Claude Code
      </div>
    </div>
  )
}
