import { Github } from 'lucide-react'

import { ThemeToggle } from './ThemeToggle'

const ringColors = [
  'var(--ring-blue)',
  'var(--ring-yellow)',
  'var(--ring-black)',
  'var(--ring-green)',
  'var(--ring-red)',
]

export function Nav() {
  return (
    <div className="relative overflow-hidden px-6 pt-12 pb-6 text-center max-md:px-4 max-md:pt-10">
      <a
        href="https://github.com/tomparkp/la28-session-picker"
        target="_blank"
        rel="noopener noreferrer"
        className="border-border bg-surface text-ink2 hover:border-gold hover:bg-surface2 hover:text-gold absolute top-4 right-16 z-5 flex size-9 items-center justify-center rounded-lg border transition-all duration-150 max-md:top-3 max-md:right-14"
        title="View on GitHub"
        aria-label="View on GitHub"
      >
        <Github size={18} />
      </a>
      <ThemeToggle />
      <div className="relative mb-3.5 flex justify-center gap-[3px]">
        {ringColors.map((color, i) => (
          <div
            key={i}
            className="size-[18px] rounded-full border-2 border-solid opacity-60"
            style={{ borderColor: color }}
          />
        ))}
      </div>
      <h1 className="font-display relative mb-1.5 text-[2.2rem] leading-[1.1] font-normal -tracking-[0.03em] max-md:text-[1.6rem]">
        <em className="text-gold italic">LA28</em> Session Picker
      </h1>
      <p className="text-ink3 relative mx-auto mt-2 max-w-[600px] text-[0.72rem] leading-normal font-light max-md:px-2">
        This is an{' '}
        <strong>
          <u>unofficial</u>
        </strong>
        , open-source project not affiliated with the IOC or LA28. Session data is scraped from
        public materials and may be inaccurate or outdated. AI ratings are subjective and should not
        be used as a sole basis for decisions. Always verify against official sources.
      </p>
    </div>
  )
}
