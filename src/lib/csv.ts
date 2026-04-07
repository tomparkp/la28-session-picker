import type { Session } from '@/types/session'

export function exportBookmarksCSV(sessions: Session[]) {
  if (!sessions.length) {
    alert('No bookmarks to export')
    return
  }

  const sorted = [...sessions].sort((a, b) => a.dk.localeCompare(b.dk))
  let csv =
    'Session Code,Sport,Description,Date,Time,Venue,Zone,Round,Price Low,Price High,Score,Prestige,Value,Atmosphere,Uniqueness,Star Power,Venue Score\n'

  for (const e of sorted) {
    csv += `"${e.id}","${e.sport}","${e.desc.replace(/"/g, '""')}","${e.date}","${e.time}","${e.venue}","${e.zone}","${e.rt}",${Math.round(e.pLo)},${Math.round(e.pHi)},${e.agg},${e.rP},${e.rV},${e.rA},${e.rU},${e.rS},${e.rVn}\n`
  }

  const a = document.createElement('a')
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
  a.download = 'la28_bookmarks.csv'
  a.click()
}
