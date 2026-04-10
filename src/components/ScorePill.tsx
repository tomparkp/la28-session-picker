import { memo } from 'react'

import { ratingClasses } from '@/lib/tw'

interface ScorePillProps {
  agg: number
  rSig: number
  rExp: number
  rStar: number
  rUniq: number
  rDem: number
}

export const ScorePill = memo(function ScorePill({
  agg,
  rSig,
  rExp,
  rStar,
  rUniq,
  rDem,
}: ScorePillProps) {
  return (
    <span
      className={ratingClasses(agg)}
      title={`Significance ${rSig} · Experience ${rExp} · Star Power ${rStar} · Uniqueness ${rUniq} · Demand ${rDem}`}
    >
      {agg.toFixed(1)}
    </span>
  )
})
