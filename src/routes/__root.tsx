import type { QueryClient } from '@tanstack/react-query'
import {
  HeadContent,
  Link,
  Scripts,
  createRootRouteWithContext,
  type ErrorComponentProps,
} from '@tanstack/react-router'

import { Nav } from '../components/Nav'
import { DEFAULT_FILTERS } from '../lib/session-search'

import appCss from '../styles.css?url'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'LA28 Unofficial Session Picker' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.svg?v=5', type: 'image/svg+xml', sizes: 'any' },
      { rel: 'icon', href: '/favicon.ico?v=5', type: 'image/x-icon', sizes: '32x32 16x16' },
      { rel: 'apple-touch-icon', href: '/logo192.png' },
      { rel: 'manifest', href: '/manifest.json' },
    ],
  }),
  headers: () => ({
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  }),
  shellComponent: RootDocument,
  errorComponent: RootError,
  notFoundComponent: NotFound,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="/theme-init.js" />
        <HeadContent />
      </head>
      <body>
        <Nav />
        {children}
        <footer className="text-ink3 py-6 text-center text-xs">
          Made with love and electricity in Los Angeles. ☀️
        </footer>
        <Scripts />
      </body>
    </html>
  )
}

function ErrorMessage({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <h2 className="font-display mb-3 text-[2rem] leading-[1.1] font-normal -tracking-[0.03em]">
        {heading}
      </h2>
      <p className="text-ink3 mb-6 max-w-[420px] text-sm">{body}</p>
      <Link
        to="/"
        search={{ ...DEFAULT_FILTERS, sortCol: 'agg', sortDir: 'desc' }}
        className="border-border bg-surface2 text-ink2 hover:border-gold hover:text-gold inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm transition-colors"
      >
        Back to home
      </Link>
    </div>
  )
}

function RootError({ error }: ErrorComponentProps) {
  if (import.meta.env.DEV) {
    console.error(error)
  } else {
    console.error('Root error:', error instanceof Error ? error.message : 'Unknown error')
  }
  return (
    <ErrorMessage
      heading="Something went wrong"
      body="An unexpected error occurred. Please try refreshing the page."
    />
  )
}

function NotFound() {
  return (
    <ErrorMessage
      heading="Page not found"
      body="The page you're looking for doesn't exist or has been moved."
    />
  )
}
