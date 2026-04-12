export function parseStartMinutes(timeStr: string): number {
  const ampmMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/)
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1])
    const min = parseInt(ampmMatch[2])
    const ampm = ampmMatch[3]
    if (ampm === 'PM' && hour !== 12) hour += 12
    else if (ampm === 'AM' && hour === 12) hour = 0
    return hour * 60 + min
  }
  const h24Match = timeStr.match(/(\d{1,2}):(\d{2})/)
  if (h24Match) {
    const hour = parseInt(h24Match[1])
    const min = parseInt(h24Match[2])
    return hour * 60 + min
  }
  return 720
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
