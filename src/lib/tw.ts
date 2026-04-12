const ROUND_BASE =
  'inline-block rounded-[10px] px-[7px] py-[2px] text-[0.6rem] font-semibold whitespace-nowrap tracking-[0.02em]'

const roundMap: Record<string, string> = {
  Final: `${ROUND_BASE} bg-[rgba(212,168,67,0.15)] text-gold2`,
  Ceremony: `${ROUND_BASE} bg-[rgba(0,133,199,0.15)] text-[#0085c7]`,
  Bronze: `${ROUND_BASE} bg-[rgba(205,127,50,0.15)] text-[#cd7f32]`,
  Semi: `${ROUND_BASE} bg-[rgba(160,100,220,0.15)] text-[#b082e0]`,
  QF: `${ROUND_BASE} bg-[rgba(160,100,220,0.10)] text-[#b082e0]`,
  Prelim: `${ROUND_BASE} bg-surface3 text-ink3`,
  'N/A': `${ROUND_BASE} bg-surface3 text-ink3`,
}

export function roundTagClasses(rt: string): string {
  return roundMap[rt] ?? `${ROUND_BASE} bg-surface3 text-ink3`
}

const PILL_BASE =
  'inline-block min-w-[32px] rounded-lg px-1.5 py-0.5 text-center text-[0.72rem] font-bold tabular-nums -tracking-[0.02em]'

export function ratingClasses(agg: number): string {
  if (agg >= 8) return `${PILL_BASE} bg-[rgba(61,186,111,0.12)] text-[#3dba6f]`
  if (agg >= 6) return `${PILL_BASE} bg-[rgba(200,180,40,0.12)] text-[#b8a832]`
  if (agg >= 4) return `${PILL_BASE} bg-[rgba(220,150,50,0.12)] text-[#d49633]`
  return `${PILL_BASE} bg-[rgba(220,70,50,0.1)] text-[#c84a3a]`
}
