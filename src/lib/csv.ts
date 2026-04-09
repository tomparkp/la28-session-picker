import type { Session } from '@/types/session'

function csvSafe(value: string): string {
  let escaped = value.replace(/"/g, '""')
  if (/^[=+\-@\t\r]/.test(escaped)) escaped = `'${escaped}`
  return `"${escaped}"`
}

export function exportBookmarksCSV(sessions: Session[]) {
  if (!sessions.length) {
    alert('No bookmarks to export')
    return
  }

  const sorted = [...sessions].sort((a, b) => a.dk.localeCompare(b.dk))
  let csv =
    'Session Code,Sport,Description,Date,Time,Venue,Zone,Round,Price Low,Price High,AI Rating,Significance,Experience,Star Power,Uniqueness,Demand\n'

  for (const e of sorted) {
    csv += `${csvSafe(e.id)},${csvSafe(e.sport)},${csvSafe(e.desc)},${csvSafe(e.date)},${csvSafe(e.time)},${csvSafe(e.venue)},${csvSafe(e.zone)},${csvSafe(e.rt)},${Math.round(e.pLo)},${Math.round(e.pHi)},${e.agg},${e.rSig},${e.rExp},${e.rStar},${e.rUniq},${e.rDem}\n`
  }

  const a = document.createElement('a')
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
  a.download = 'la28_bookmarks.csv'
  a.click()
}
