interface ScorePillProps {
  agg: number
  rP: number
  rV: number
  rA: number
  rU: number
  rS: number
  rVn: number
}

export function ScorePill({ agg, rP, rV, rA, rU, rS, rVn }: ScorePillProps) {
  return (
    <span
      className="score-pill"
      title={`P${rP} V${rV} A${rA} U${rU} S${rS} Vn${rVn}`}
    >
      {agg}
    </span>
  )
}
