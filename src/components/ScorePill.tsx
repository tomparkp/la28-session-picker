interface ScorePillProps {
  agg: number
  rP: number
  rV: number
  rA: number
  rU: number
  rS: number
  rVn: number
}

function ratingTier(agg: number): string {
  if (agg >= 8) return 'rating-great'
  if (agg >= 6.5) return 'rating-good'
  if (agg >= 5) return 'rating-fair'
  return 'rating-low'
}

export function ScorePill({ agg, rP, rV, rA, rU, rS, rVn }: ScorePillProps) {
  return (
    <span
      className={`score-pill ${ratingTier(agg)}`}
      title={`P${rP} V${rV} A${rA} U${rU} S${rS} Vn${rVn}`}
    >
      {agg.toFixed(1)}
    </span>
  )
}
