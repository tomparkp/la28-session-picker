import { createServerFn } from '@tanstack/react-start'

const MAX_MESSAGE_LENGTH = 5000
const MAX_EMAIL_LENGTH = 320
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface ReportIssueInput {
  email: string
  message: string
  sessionId?: string
  sessionName?: string
  pageUrl?: string
}

function normalizeString(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function normalizeInput(input: unknown): ReportIssueInput {
  const value = (input ?? {}) as Record<string, unknown>
  const email = normalizeString(value.email, MAX_EMAIL_LENGTH)
  const message = normalizeString(value.message, MAX_MESSAGE_LENGTH)

  if (!message) {
    throw new Error('A message is required.')
  }
  if (email && !EMAIL_REGEX.test(email)) {
    throw new Error('Please enter a valid email address.')
  }

  return {
    email,
    message,
    sessionId: normalizeString(value.sessionId, 200),
    sessionName: normalizeString(value.sessionName, 300),
    pageUrl: normalizeString(value.pageUrl, 500),
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const reportIssue = createServerFn({ method: 'POST' })
  .inputValidator(normalizeInput)
  .handler(async ({ data }) => {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('Email service is not configured.')
    }

    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)

    const replyFrom = data.email || 'anonymous'
    const subject = data.sessionName ? `[LA28] Issue: ${data.sessionName}` : '[LA28] Issue report'

    const metaLines: string[] = []
    if (data.sessionName) metaLines.push(`Session: ${data.sessionName}`)
    if (data.sessionId) metaLines.push(`Session ID: ${data.sessionId}`)
    if (data.pageUrl) metaLines.push(`URL: ${data.pageUrl}`)
    metaLines.push(`Reporter: ${replyFrom}`)

    const html = `
      <div style="font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.5;">
        <p style="color:#555;">${metaLines.map(escapeHtml).join('<br/>')}</p>
        <hr style="border:none;border-top:1px solid #ddd;margin:16px 0;" />
        <pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(data.message)}</pre>
      </div>
    `

    const { error } = await resend.emails.send({
      from: 'LA28 Issue Report <la28reports@tompark.dev>',
      to: ['la28@tompark.dev'],
      replyTo: data.email || undefined,
      subject,
      html,
      text: `${metaLines.join('\n')}\n\n${data.message}`,
    })

    if (error) {
      throw new Error(error.message || 'Failed to send report.')
    }

    return { ok: true as const }
  })
