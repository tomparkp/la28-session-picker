import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { rateEvent } from '../src/lib/ratings.js'
import type { Session } from '../src/types/session.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

function main() {
  const dataPath = resolve(ROOT, 'src/data/sessions.json')

  console.log(`Reading ${dataPath}`)
  const events = JSON.parse(readFileSync(dataPath, 'utf8')) as Session[]
  console.log(`Loaded ${events.length} sessions`)

  const sessions: Session[] = events.map((e) => {
    const r = rateEvent(e)
    return {
      ...e,
      rSig: r.significance,
      rExp: r.experience,
      rStar: r.star_power,
      rUniq: r.uniqueness,
      rDem: r.demand,
      agg: r.aggregate,
    }
  })

  const aggs = sessions.map((s) => s.agg)
  const sorted = [...aggs].sort((a, b) => a - b)
  console.log(
    `Aggregate ratings: min=${Math.min(...aggs)}, ` +
      `median=${sorted[Math.floor(sorted.length / 2)]}, ` +
      `max=${Math.max(...aggs)}`,
  )

  writeFileSync(dataPath, JSON.stringify(sessions, null, 2))
  console.log(`\nWrote ${sessions.length} sessions to ${dataPath}`)

  sessions.sort((a, b) => b.agg - a.agg)
  console.log('\nTop 10 sessions by aggregate rating:')
  for (const s of sessions.slice(0, 10)) {
    console.log(
      `  ${s.id.padEnd(10)} ${String(s.agg).padStart(2)}  ` +
        `Sig${s.rSig} Exp${s.rExp} Star${s.rStar} Uniq${s.rUniq} Dem${s.rDem}  ` +
        `| ${s.name} — ${s.desc.slice(0, 50)}`,
    )
  }
}

main()
