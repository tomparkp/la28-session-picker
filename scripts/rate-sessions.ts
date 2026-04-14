import { rateEvent } from '../src/lib/ratings.js'
import type { Scorecard, Session } from '../src/types/session.js'
import { chunk, executeSql, parseDbTargetFromArgs, querySql } from './lib/db'

interface SessionRow {
  id: string
  sport: string
  name: string
  desc: string
  venue: string
  zone: string
  date: string
  dk: string
  time: string
  rt: string
  p_lo: number
  p_hi: number
  soccer: number
  r_sig: number
  r_exp: number
  r_star: number
  r_uniq: number
  r_dem: number
  agg: number
}

interface ContentRow {
  session_id: string
  scorecard: string | null
}

function rowToSession(r: SessionRow): Session {
  return {
    id: r.id,
    sport: r.sport,
    name: r.name,
    desc: r.desc,
    venue: r.venue,
    zone: r.zone,
    date: r.date,
    dk: r.dk,
    time: r.time,
    rt: r.rt as Session['rt'],
    pLo: r.p_lo,
    pHi: r.p_hi,
    soccer: Boolean(r.soccer),
    rSig: r.r_sig,
    rExp: r.r_exp,
    rStar: r.r_star,
    rUniq: r.r_uniq,
    rDem: r.r_dem,
    agg: r.agg,
  }
}

function main() {
  const target = parseDbTargetFromArgs()
  console.log(`Rating sessions (target: ${target})`)

  const sessionRows = querySql<SessionRow>('SELECT * FROM sessions', target)
  const contentRows = querySql<ContentRow>(
    'SELECT session_id, scorecard FROM session_content',
    target,
  )

  const scorecardById = new Map<string, Scorecard>()
  for (const row of contentRows) {
    if (row.scorecard) {
      scorecardById.set(row.session_id, JSON.parse(row.scorecard) as Scorecard)
    }
  }

  const events = sessionRows.map(rowToSession)
  console.log(`Loaded ${events.length} sessions`)

  let fromScorecard = 0
  let fromFallback = 0
  const updates: Array<{
    id: string
    agg: number
    rSig: number
    rExp: number
    rStar: number
    rUniq: number
    rDem: number
  }> = []

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

  const stmts = updates.map(
    (u) =>
      `UPDATE sessions SET r_sig=${u.rSig}, r_exp=${u.rExp}, r_star=${u.rStar}, r_uniq=${u.rUniq}, r_dem=${u.rDem}, agg=${u.agg} WHERE id='${u.id.replace(/'/g, "''")}';`,
  )

  const batches = chunk(stmts, 50)
  batches.forEach((batch, i) => {
    console.log(`  update batch ${i + 1}/${batches.length}`)
    executeSql(batch, target, `rate-${i}`)
  })

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

main()
