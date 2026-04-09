export function parseStartMinutes(timeStr: string): number {
  const m = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/)
  if (!m) return 720
  let hour = parseInt(m[1])
  const min = parseInt(m[2])
  const ampm = m[3]
  if (ampm === 'PM' && hour !== 12) hour += 12
  else if (ampm === 'AM' && hour === 12) hour = 0
  return hour * 60 + min
}

export function fmtTime(time: string): string {
  return time === 'TBD\u2013TBD' ? 'TBD' : time
}

export function fmtPrice(lo: number, hi: number): string {
  if (!lo && !hi) return 'N/A'
  const l = Math.round(lo)
  const h = Math.round(hi)
  return l === h
    ? '$' + l.toLocaleString()
    : '$' + l.toLocaleString() + '\u2013$' + h.toLocaleString()
}
