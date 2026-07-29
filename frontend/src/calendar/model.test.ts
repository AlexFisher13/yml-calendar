import { describe, expect, it } from 'vitest'

import {
  createContinuousDays,
  formatDate,
  getMonthRanges,
  groupEventsByDate,
} from './model'

describe('calendar model', () => {
  it('creates a continuous range starting on Monday grid', () => {
    const days = createContinuousDays(new Date(2026, 6, 1), 1)

    expect(days.slice(0, 2)).toEqual([null, null])
    expect(formatDate(days[2]!)).toBe('2026-07-01')
    expect(formatDate(days.at(-1)!)).toBe('2026-07-31')
  })

  it('calculates month ranges across the same grid', () => {
    const days = createContinuousDays(new Date(2026, 6, 1), 3)
    const ranges = getMonthRanges(days)

    expect(ranges.map((range) => range.name)).toEqual([
      'Июль',
      'Август',
      'Сентябрь',
    ])
  })

  it('groups multiple events on the same date', () => {
    const grouped = groupEventsByDate([
      { date: '2026-07-29', title: 'Встреча' },
      { date: '2026-07-29', title: 'Концерт' },
    ])

    expect(grouped.get('2026-07-29')).toHaveLength(2)
  })
})
