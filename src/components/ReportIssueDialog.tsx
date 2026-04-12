import { Dialog } from '@base-ui/react/dialog'
import { LoaderCircle, X } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'

import { reportIssue } from '@/data/report-issue.rpc'
import { cn } from '@/lib/cn'

interface ReportIssueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId?: string
  sessionName?: string
}

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'error'; message: string }
  | { kind: 'sent' }

export function ReportIssueDialog({
  open,
  onOpenChange,
  sessionId,
  sessionName,
}: ReportIssueDialogProps) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setEmail('')
        setMessage('')
        setStatus({ kind: 'idle' })
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [open])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status.kind === 'sending') return
    if (!message.trim()) {
      setStatus({ kind: 'error', message: 'Please enter a message.' })
      return
    }

    setStatus({ kind: 'sending' })
    try {
      await reportIssue({
        data: {
          email: email.trim(),
          message: message.trim(),
          sessionId,
          sessionName,
          pageUrl: typeof window !== 'undefined' ? window.location.href : '',
        },
      })
      setStatus({ kind: 'sent' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setStatus({ kind: 'error', message: msg })
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[60] bg-black/50 transition-opacity duration-150 data-[closed]:opacity-0 data-[open]:opacity-100" />
        <Dialog.Popup
          className={cn(
            'fixed top-1/2 left-1/2 z-[70] w-[min(92vw,480px)] -translate-x-1/2 -translate-y-1/2',
            'border-border bg-surface rounded-xl border p-5 shadow-2xl',
            'transition-[transform,opacity,scale] duration-150',
            'data-[closed]:scale-95 data-[closed]:opacity-0',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-ink text-[1.2rem] font-semibold">
                Report an issue
              </Dialog.Title>
              <Dialog.Description className="text-ink3 mt-1 text-[0.82rem] leading-snug">
                {sessionName
                  ? `Found something off about “${sessionName}”? Let us know.`
                  : 'Tell us what happened and we’ll take a look.'}
              </Dialog.Description>
            </div>
            <Dialog.Close
              render={<button type="button" />}
              aria-label="Close"
              className="text-ink3 hover:bg-surface2 hover:text-ink flex size-8 shrink-0 items-center justify-center rounded-md transition-colors"
            >
              <X size={16} />
            </Dialog.Close>
          </div>

          {status.kind === 'sent' ? (
            <div className="mt-5">
              <p className="text-ink text-[0.9rem]">Thanks — your report has been sent.</p>
              <div className="mt-5 flex justify-end">
                <Dialog.Close
                  render={<button type="button" />}
                  className="bg-ink text-surface hover:bg-ink2 rounded-md px-3.5 py-1.5 text-[0.82rem] font-semibold transition-colors"
                >
                  Close
                </Dialog.Close>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <label className="block">
                <span className="text-ink2 text-[0.76rem] font-semibold tracking-[0.04em] uppercase">
                  Email{' '}
                  <span className="text-ink3 font-normal tracking-normal normal-case">
                    (optional)
                  </span>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="border-border bg-surface2 text-ink placeholder:text-ink3 focus:border-gold focus:ring-gold/30 mt-1.5 w-full rounded-md border px-3 py-2 text-[0.88rem] transition-colors outline-none focus:ring-2"
                />
              </label>

              <label className="block">
                <span className="text-ink2 text-[0.76rem] font-semibold tracking-[0.04em] uppercase">
                  Message
                </span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={5}
                  maxLength={5000}
                  placeholder="What did you notice?"
                  className="border-border bg-surface2 text-ink placeholder:text-ink3 focus:border-gold focus:ring-gold/30 mt-1.5 w-full resize-y rounded-md border px-3 py-2 text-[0.88rem] transition-colors outline-none focus:ring-2"
                />
              </label>

              {status.kind === 'error' ? (
                <p className="text-[0.8rem] text-red-500">{status.message}</p>
              ) : null}

              <div className="flex items-center justify-end gap-2 pt-1">
                <Dialog.Close
                  render={<button type="button" />}
                  className="text-ink2 hover:bg-surface2 rounded-md px-3.5 py-1.5 text-[0.82rem] font-semibold transition-colors"
                >
                  Cancel
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={status.kind === 'sending' || !message.trim()}
                  className="bg-ink text-surface hover:bg-ink2 inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[0.82rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status.kind === 'sending' ? (
                    <>
                      <LoaderCircle size={14} className="animate-spin" />
                      Sending…
                    </>
                  ) : (
                    'Send report'
                  )}
                </button>
              </div>
            </form>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
