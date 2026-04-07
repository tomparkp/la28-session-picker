export function fmtPrice(lo: number, hi: number): string {
  if (!lo && !hi) return 'N/A'
  const l = Math.round(lo)
  const h = Math.round(hi)
  return l === h
    ? '$' + l.toLocaleString()
    : '$' + l.toLocaleString() + '\u2013$' + h.toLocaleString()
}
