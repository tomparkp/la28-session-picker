import type { Contender } from '@/types/session'

import data from './sport-knowledge.json'

export interface SportKnowledge {
  la28Context: string
  venueNotes: Record<string, string>
  eventHighlights: Record<string, string>
  contenders: Contender[]
}

export const SPORT_KNOWLEDGE = data as Record<string, SportKnowledge>
