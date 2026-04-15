import { rateEvent } from '../src/lib/ratings.js'
import {
  parseDbTargetFromArgs,
  readAllSessions,
  readScorecards,
  type SessionRatingUpdate,
  updateSessionRatings,
} from './lib/db'

async function main() {
  const target = parseDbTargetFromArgs()
  console.log(`Rating sessions (target: ${target})`)

  const [events, scorecardById] = await Promise.all([
    readAllSessions(target),
    readScorecards(target),
  ])
  console.log(`Loaded ${events.length} sessions`)

  let fromScorecard = 0
  let fromFallback = 0
  const updates: SessionRatingUpdate[] = []

  for (const e of events) {
    const sc = scorecardById.get(e.id)
    if (sc) {
      fromScorecard += 1
      updates.push({
        id: e.id,
        rSig: sc.significance.score,
        rExp: sc.experience.score,
        rStar: sc.starPower.score,
        rUniq: sc.uniqueness.score,
        rDem: sc.demand.score,
        agg: sc.aggregate,
      })
      continue
    }
    fromFallback += 1
    const r = rateEvent(e)
    updates.push({
      id: e.id,
      rSig: r.significance,
      rExp: r.experience,
      rStar: r.star_power,
      rUniq: r.uniqueness,
      rDem: r.demand,
      agg: r.aggregate,
    })
  }

  const aggs = updates.map((u) => u.agg)
  const sorted = [...aggs].sort((a, b) => a - b)
  console.log(
    `Aggregate ratings: min=${Math.min(...aggs)}, ` +
      `median=${sorted[Math.floor(sorted.length / 2)]}, ` +
      `max=${Math.max(...aggs)}`,
  )
  console.log(`Source: ${fromScorecard} from scorecard, ${fromFallback} from rule-based fallback`)

  await updateSessionRatings(updates, target)
  console.log(`\nWrote ${updates.length} session ratings to D1`)

  updates.sort((a, b) => b.agg - a.agg)
  console.log('\nTop 10 sessions by aggregate rating:')
  const sessionById = new Map(events.map((e) => [e.id, e]))
  for (const u of updates.slice(0, 10)) {
    const s = sessionById.get(u.id)
    if (!s) continue
    console.log(
      `  ${u.id.padEnd(10)} ${String(u.agg).padStart(4)}  ` +
        `Sig${u.rSig} Exp${u.rExp} Star${u.rStar} Uniq${u.rUniq} Dem${u.rDem}  ` +
        `| ${s.name} — ${s.desc.slice(0, 50)}`,
    )
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
