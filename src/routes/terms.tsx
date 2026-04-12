import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/terms')({
  head: () => ({
    meta: [{ title: 'Terms of Use · LA28 Session Picker' }],
  }),
  component: TermsPage,
})

function TermsPage() {
  return (
    <main className="mx-auto max-w-[720px] px-6 py-10 max-md:px-4">
      <h1 className="font-display mb-2 text-[2rem] leading-[1.1] font-normal -tracking-[0.03em]">
        Terms of Use
      </h1>
      <p className="text-ink3 mb-8 text-xs">Last updated: April 12, 2026</p>

      <div className="text-ink2 space-y-5 text-sm leading-relaxed">
        <section>
          <h2 className="font-display mt-6 mb-2 text-lg">Unofficial project</h2>
          <p>
            LA28 Session Picker is an unofficial, open-source tool and is not affiliated with,
            endorsed by, or sponsored by the International Olympic Committee (IOC), the LA28
            Organizing Committee, or any official Olympic body. All Olympic and LA28 trademarks are
            the property of their respective owners.
          </p>
        </section>

        <section>
          <h2 className="font-display mt-6 mb-2 text-lg">No warranty on data</h2>
          <p>
            Session information displayed on this site is scraped from public materials and may be
            inaccurate, incomplete, or out of date. AI-generated ratings and summaries are
            subjective. <strong>Always verify schedules, venues, and ticketing against official
            sources before making plans or purchases.</strong> The site is provided &ldquo;as
            is,&rdquo; without warranty of any kind.
          </p>
        </section>

        <section>
          <h2 className="font-display mt-6 mb-2 text-lg">Acceptable use</h2>
          <p>By using the site, you agree not to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Abuse, overload, or interfere with the service or its infrastructure.</li>
            <li>Submit unlawful, harassing, or misleading content through the issue form.</li>
            <li>
              Use automated scrapers or bots that degrade availability for other users. For bulk
              data access, please use the open-source repository instead.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display mt-6 mb-2 text-lg">Limitation of liability</h2>
          <p>
            To the fullest extent permitted by law, the maintainers of this project are not liable
            for any damages arising from your use of the site, including reliance on session data,
            ratings, or links to third-party services.
          </p>
        </section>

        <section>
          <h2 className="font-display mt-6 mb-2 text-lg">Third-party services</h2>
          <p>
            The site is delivered via Cloudflare and uses Resend for email delivery. See our{' '}
            <a href="/privacy" className="text-gold hover:underline">
              Privacy Policy
            </a>{' '}
            for details. Your use of those services is also governed by their respective terms.
          </p>
        </section>

        <section>
          <h2 className="font-display mt-6 mb-2 text-lg">Changes</h2>
          <p>
            We may update these terms from time to time. Continued use of the site after changes
            constitutes acceptance of the updated terms.
          </p>
        </section>
      </div>
    </main>
  )
}
