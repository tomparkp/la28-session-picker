import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
  type ErrorComponentProps,
} from '@tanstack/react-router'

import { Nav } from '../components/Nav'

import appCss from '../styles.css?url'

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('la28_unofficial_session_picker_theme');if(stored==='light'){document.documentElement.setAttribute('data-theme','light')}else if(stored==='dark'){document.documentElement.setAttribute('data-theme','dark')}}catch(e){}})();`

export const Route = createRootRoute({
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
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        <Nav />
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function ErrorMessage({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <h2 className="font-display text-[2rem] font-normal -tracking-[0.03em] leading-[1.1] mb-3">
        {heading}
      </h2>
      <p className="text-ink3 text-sm mb-6 max-w-[420px]">{body}</p>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface2 px-4 py-2 text-sm text-ink2 transition-colors hover:border-gold hover:text-gold"
      >
        Back to home
      </Link>
    </div>
  )
}

function RootError({ error }: ErrorComponentProps) {
  console.error(error)
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
