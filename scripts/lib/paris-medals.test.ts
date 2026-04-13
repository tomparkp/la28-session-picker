import { describe, expect, it } from 'vitest'

import {
  extractGenderHints,
  matchSessionEvents,
  normalizeEventTokens,
  splitDescIntoPhrases,
  type ParisMedalEvent,
} from './paris-medals.js'

function evt(event: string, gender: ParisMedalEvent['gender'], gold: string): ParisMedalEvent {
  return {
    event,
    gender,
    normalizedTokens: normalizeEventTokens(event),
    gold: { name: gold, country: 'XXX' },
    silver: { name: 'S', country: 'XXX' },
    bronze: { name: 'B', country: 'XXX' },
  }
}

describe('normalizeEventTokens', () => {
  it('canonicalizes swimming stroke variants (preserving gender)', () => {
    expect(normalizeEventTokens("Men's 400m Freestyle")).toEqual(['m', '400m', 'free'])
    expect(normalizeEventTokens('M 400m Free Final')).toEqual(['m', '400m', 'free'])
    expect(normalizeEventTokens("Women's 100 metres Butterfly")).toEqual(['w', '100m', 'fly'])
    expect(normalizeEventTokens("Men's 200m Medley")).toEqual(['m', '200m', 'im'])
  })

  it('handles relays with various spacing', () => {
    expect(normalizeEventTokens("Men's 4 × 100 Metres Freestyle Relay")).toEqual(['m', '4x100m', 'free', 'relay'])
    expect(normalizeEventTokens('M/W 4x100m Free Relay Heats')).toEqual(['m', 'w', '4x100m', 'free', 'relay'])
  })

  it('drops round and ceremony words', () => {
    expect(normalizeEventTokens("Women's 100m Freestyle Semifinal")).toEqual(['w', '100m', 'free'])
    expect(normalizeEventTokens("Men's Basketball Gold Medal Game")).toEqual(['m', 'basketball'])
  })

  it('normalizes weight classes', () => {
    expect(normalizeEventTokens("Men's -60kg Judo")).toEqual(['m', '-60kg', 'judo'])
    expect(normalizeEventTokens("Men's +90kg Boxing")).toEqual(['m', '+90kg', 'boxing'])
  })

  it('strips accents', () => {
    expect(normalizeEventTokens('Épée Individual Women')).toEqual(['epee', 'w'])
  })
})

describe('splitDescIntoPhrases', () => {
  it('splits multi-event descs on commas and semicolons', () => {
    const desc =
      'W 100m Fly, M 400m Free, M 50m Fly, W 50m Back, M 100m Breast, W 400m Free, M/W 4x100m Free Relay Heats'
    const phrases = splitDescIntoPhrases(desc)
    expect(phrases).toHaveLength(7)
    expect(phrases[0]).toBe('W 100m Fly')
    expect(phrases[6]).toBe('M/W 4x100m Free Relay Heats')
  })

  it('handles single-event descs', () => {
    expect(splitDescIntoPhrases("Women's Marathon")).toEqual(["Women's Marathon"])
  })
})

describe('extractGenderHints', () => {
  it('recognizes single-letter and full-word forms', () => {
    expect([...extractGenderHints('M 400m Free Final')]).toEqual(['m'])
    expect([...extractGenderHints("Women's Marathon")]).toEqual(['w'])
  })

  it('handles M/W dual-gender phrases', () => {
    const h = extractGenderHints('M/W 4x100m Free Relay Heats')
    expect(h.has('m')).toBe(true)
    expect(h.has('w')).toBe(true)
  })

  it('treats "Mixed" as both', () => {
    const h = extractGenderHints('Mixed Doubles Round 1')
    expect(h.has('m')).toBe(true)
    expect(h.has('w')).toBe(true)
  })
})

describe('matchSessionEvents — Swimming (multi-event finals)', () => {
  const swimming: ParisMedalEvent[] = [
    evt("Men's 400m Freestyle", 'm', 'Märtens'),
    evt("Men's 50m Freestyle", 'm', 'Proud'),
    evt("Men's 50m Butterfly", 'm', 'SomeoneElse'), // not a real Paris event but fixture
    evt("Men's 100m Breaststroke", 'm', 'Martinenghi'),
    evt("Women's 100m Butterfly", 'w', 'McIntosh'),
    evt("Women's 400m Freestyle", 'w', 'Titmus'),
    evt("Women's 100m Freestyle", 'w', 'OCallaghan'),
    evt("Women's 50m Backstroke", 'w', 'Someone'),
  ]

  it('matches each event from a finals-heavy session', () => {
    const desc = 'W 100m Fly Final, M 50m Fly Final, M 100m Breast Final, W 100m Free Semi'
    const matched = matchSessionEvents(desc, swimming)
    const names = matched.map((m) => m.event).sort()
    expect(names).toEqual([
      "Men's 100m Breaststroke",
      "Men's 50m Butterfly",
      "Women's 100m Butterfly",
      "Women's 100m Freestyle",
    ])
  })

  it('does NOT match Men events to Women phrases and vice versa', () => {
    const desc = 'W 100m Free Semi'
    const matched = matchSessionEvents(desc, swimming)
    expect(matched.map((m) => m.event)).toEqual(["Women's 100m Freestyle"])
    // Specifically: no Men's 100m anything
    expect(matched.some((m) => m.event.startsWith("Men's"))).toBe(false)
  })

  it('handles a 7-event prelim bundle', () => {
    const desc = 'W 100m Fly, M 400m Free, M 50m Fly, W 50m Back, M 100m Breast, W 400m Free'
    const matched = matchSessionEvents(desc, swimming)
    expect(matched.length).toBe(6)
  })
})

describe('matchSessionEvents — team sports (gender-only match)', () => {
  const basketball: ParisMedalEvent[] = [evt("Men's Basketball", 'm', 'USA'), evt("Women's Basketball", 'w', 'USA')]

  it("matches Women-only group phase to Women's Basketball", () => {
    const matched = matchSessionEvents("Women's Group Phase (2 Games)", basketball)
    expect(matched.map((m) => m.event)).toEqual(["Women's Basketball"])
  })

  it('matches dual-gender pool round to both events', () => {
    const matched = matchSessionEvents("Men's Pool Round (2 Games); Women's Pool Round (2 Games)", basketball)
    const names = matched.map((m) => m.event).sort()
    expect(names).toEqual(["Men's Basketball", "Women's Basketball"])
  })
})

describe('matchSessionEvents — weight classes', () => {
  // Olympedia names Paris 2024 judo events by weight-class ("Extra-Lightweight")
  // rather than kg. LA28 session descs use kg ("-48kg"), so weight-class
  // sports don't cleanly match. Documented limitation — model falls back to
  // web-search grounding for these sports.
  const judo: ParisMedalEvent[] = [
    evt("Women's Extra-Lightweight", 'w', 'Boukli'),
    evt("Men's Extra-Lightweight", 'm', 'Smetov'),
  ]

  it('returns empty when kg vocabulary does not align with class names', () => {
    const desc = "Women's -48kg, Men's -60kg Elimination Rounds"
    const matched = matchSessionEvents(desc, judo)
    expect(matched).toEqual([])
  })
})

describe('matchSessionEvents — no-match cases', () => {
  it('returns empty when sport medals undefined', () => {
    expect(matchSessionEvents('Anything', undefined)).toEqual([])
  })

  it('returns empty for empty desc', () => {
    expect(matchSessionEvents('', [evt("Men's Marathon", 'm', 'X')])).toEqual([])
  })

  it('does not match on a ceremony', () => {
    const matched = matchSessionEvents('Opening Ceremony', [evt("Men's Basketball", 'm', 'USA')])
    expect(matched).toEqual([])
  })
})

describe('matchSessionEvents — marathon / solo events', () => {
  const athletics: ParisMedalEvent[] = [
    evt("Men's Marathon", 'm', 'Tola'),
    evt("Women's Marathon", 'w', 'Hassan'),
    evt("Men's 100 metres", 'm', 'Lyles'),
    evt("Women's 100 metres", 'w', 'Alfred'),
    evt("Women's 100 metres Hurdles", 'w', 'Russell'),
    evt("Men's 110 metres Hurdles", 'm', 'Holloway'),
  ]

  it('matches gender-only phrases by dropping ROUND tokens', () => {
    expect(matchSessionEvents("Women's Marathon", athletics).map((m) => m.event)).toEqual(["Women's Marathon"])
  })

  it('matches 100m sprint phrases through metres-→-m canonicalization', () => {
    const matched = matchSessionEvents('W/M 100m Prelim & R1', athletics)
    const names = matched.map((m) => m.event).sort()
    expect(names).toEqual(["Men's 100 metres", "Women's 100 metres"])
  })

  it('does NOT confuse "100m" with "100m Hurdles"', () => {
    const matched = matchSessionEvents("Women's 100m Final", athletics)
    expect(matched.map((m) => m.event)).toEqual(["Women's 100 metres"])
    expect(matched.some((m) => m.event.includes('Hurdles'))).toBe(false)
  })

  it('does match explicit hurdles phrases to hurdles events', () => {
    const matched = matchSessionEvents("Women's 100m Hurdles Final", athletics)
    expect(matched.map((m) => m.event)).toEqual(["Women's 100 metres Hurdles"])
  })
})
