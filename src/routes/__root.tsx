import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

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
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
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
