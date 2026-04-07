interface ScorePillProps {
  agg: number
  rSig: number
  rExp: number
  rStar: number
  rUniq: number
  rDem: number
}

function ratingTier(agg: number): string {
  if (agg >= 8) return 'rating-great'
  if (agg >= 6) return 'rating-good'
  if (agg >= 4) return 'rating-fair'
  return 'rating-low'
}

export function ScorePill({ agg, rSig, rExp, rStar, rUniq, rDem }: ScorePillProps) {
  return (
    <span
      className={`score-pill ${ratingTier(agg)}`}
      title={`Significance ${rSig} · Experience ${rExp} · Star Power ${rStar} · Uniqueness ${rUniq} · Demand ${rDem}`}
    >
      {agg.toFixed(1)}
    </span>
  )
}
