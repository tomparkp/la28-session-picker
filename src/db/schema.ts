import { integer, real, sqliteTable, text, index } from 'drizzle-orm/sqlite-core'

import type { ContentMeta, Contender, RelatedNews, RoundType, Scorecard } from '@/types/session'

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    sport: text('sport').notNull(),
    name: text('name').notNull(),
    desc: text('desc').notNull(),
    venue: text('venue').notNull(),
    zone: text('zone').notNull(),
    date: text('date').notNull(),
    dk: text('dk').notNull(),
    time: text('time').notNull(),
    rt: text('rt').$type<RoundType>().notNull(),
    pLo: real('p_lo').notNull(),
    pHi: real('p_hi').notNull(),
    soccer: integer('soccer', { mode: 'boolean' }).notNull(),
    rSig: real('r_sig').notNull(),
    rExp: real('r_exp').notNull(),
    rStar: real('r_star').notNull(),
    rUniq: real('r_uniq').notNull(),
    rDem: real('r_dem').notNull(),
    agg: real('agg').notNull(),
  },
  (table) => [
    index('sessions_sport_idx').on(table.sport),
    index('sessions_zone_idx').on(table.zone),
    index('sessions_rt_idx').on(table.rt),
    index('sessions_dk_idx').on(table.dk),
    index('sessions_agg_idx').on(table.agg),
  ],
)

export const sessionContent = sqliteTable('session_content', {
  sessionId: text('session_id')
    .primaryKey()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  blurb: text('blurb'),
  potentialContendersIntro: text('potential_contenders_intro'),
  potentialContenders: text('potential_contenders', { mode: 'json' }).$type<Contender[]>(),
  relatedNews: text('related_news', { mode: 'json' }).$type<RelatedNews[]>(),
  scorecard: text('scorecard', { mode: 'json' }).$type<Scorecard>(),
  contentMeta: text('content_meta', { mode: 'json' }).$type<ContentMeta>(),
})

export type SessionRow = typeof sessions.$inferSelect
export type SessionContentRow = typeof sessionContent.$inferSelect
