import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/privacy')({
  head: () => ({
    meta: [{ title: 'Privacy Policy · 2028 Games Unofficial Guide' }],
  }),
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <main className="mx-auto max-w-[720px] px-6 py-10 max-md:px-4">
      <h1 className="font-display mb-2 text-[2rem] leading-[1.1] font-normal -tracking-[0.03em]">
        Privacy Policy
      </h1>
      <p className="text-ink3 mb-8 text-xs">Last updated: April 12, 2026</p>

      <div className="text-ink2 prose prose-sm max-w-none space-y-5 text-sm leading-relaxed">
        <p>
          2028 Games Unofficial Guide is an open-source project. We try to collect as little
          information as possible. This page describes what we do collect and the third parties that
          process it.
        </p>

        <section>
          <h2 className="font-display mt-6 mb-2 text-lg">What we collect</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Issue reports.</strong> If you submit a report via the issue form, we receive
              the message you type, the optional email address you provide, and context about the
              page you were on (URL, session name/ID).
            </li>
            <li>
              <strong>Request logs.</strong> Our hosting provider logs standard request metadata (IP
              address, user agent, timestamp) for abuse prevention and operational debugging.
            </li>
            <li>
              <strong>Aggregate analytics.</strong> We use Cloudflare Web Analytics to measure page
              views and basic usage trends. It is cookieless and does not fingerprint or track
              individuals across sites.
            </li>
            <li>
              <strong>No accounts and no advertising cookies.</strong>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display mt-6 mb-2 text-lg">Third-party providers</h2>
          <p>We rely on the following services to operate the site:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Cloudflare</strong> — hosting, CDN, edge compute (Workers), and cookieless Web
              Analytics. Cloudflare processes all HTTP requests to the site.
            </li>
            <li>
              <strong>Resend</strong> — email delivery for issue reports submitted through the
              contact form.
            </li>
            <li>
              <strong>Anthropic</strong> — used offline during content generation to rate and
              summarize session data. User traffic to this site is not sent to Anthropic.
            </li>
          </ul>
          <p className="mt-2">
            Each provider processes data under their own privacy policy and terms.
          </p>
        </section>

        <section>
          <h2 className="font-display mt-6 mb-2 text-lg">How we use your data</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>To respond to issue reports and improve the site.</li>
            <li>To keep the service running and prevent abuse.</li>
          </ul>
          <p className="mt-2">We do not sell personal data and do not use it for advertising.</p>
        </section>

        <section>
          <h2 className="font-display mt-6 mb-2 text-lg">Contact</h2>
          <p>
            Questions or requests related to your data can be opened as an issue on our{' '}
            <a
              href="https://github.com/tomparkp/la28-session-picker"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:underline"
            >
              GitHub repository
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
