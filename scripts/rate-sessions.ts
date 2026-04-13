import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { rateEvent } from '../src/lib/ratings.js'
import type { Session, SessionContent } from '../src/types/session.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

function main() {
  const sessionsPath = resolve(ROOT, 'src/data/sessions.json')
  const contentPath = resolve(ROOT, 'src/data/session-content.json')

  console.log(`Reading ${sessionsPath}`)
  console.log(`Reading ${contentPath}`)
  const events = JSON.parse(readFileSync(sessionsPath, 'utf8')) as Session[]
  const content = JSON.parse(readFileSync(contentPath, 'utf8')) as Record<string, SessionContent>
  console.log(`Loaded ${events.length} sessions`)

  let fromScorecard = 0
  let fromFallback = 0

  const sessions: Session[] = events.map((e) => {
    const sc = content[e.id]?.scorecard
    if (sc) {
      fromScorecard += 1
      return {
        ...e,
        rSig: sc.significance.score,
        rExp: sc.experience.score,
        rStar: sc.starPower.score,
        rUniq: sc.uniqueness.score,
        rDem: sc.demand.score,
        agg: sc.aggregate,
      }
    }
    fromFallback += 1
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
  console.log(`Source: ${fromScorecard} from scorecard, ${fromFallback} from rule-based fallback`)

  writeFileSync(sessionsPath, `${JSON.stringify(sessions, null, 2)}\n`)
  console.log(`\nWrote ${sessions.length} sessions to ${sessionsPath}`)

  sessions.sort((a, b) => b.agg - a.agg)
  console.log('\nTop 10 sessions by aggregate rating:')
  for (const s of sessions.slice(0, 10)) {
    console.log(
      `  ${s.id.padEnd(10)} ${String(s.agg).padStart(4)}  ` +
        `Sig${s.rSig} Exp${s.rExp} Star${s.rStar} Uniq${s.rUniq} Dem${s.rDem}  ` +
        `| ${s.name} — ${s.desc.slice(0, 50)}`,
    )
  }
}

main()
