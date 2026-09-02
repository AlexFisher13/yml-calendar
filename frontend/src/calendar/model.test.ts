import { describe, expect, it } from 'vitest'

import {
  createContinuousDays,
  formatDate,
  groupHolidaysByDate,
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
      {
        id: 'event-1',
        date: '2026-07-29',
        endDate: '2026-07-30',
        title: 'Встреча',
        timeZone: 'Europe/Moscow',
      },
      {
        id: 'event-2',
        date: '2026-07-29',
        title: 'Концерт',
        timeZone: 'Europe/Moscow',
      },
    ])

    expect(grouped.get('2026-07-29')).toHaveLength(2)
    expect(grouped.get('2026-07-30')).toHaveLength(1)
  })

  it('applies a named holiday to every date in its period', () => {
    const grouped = groupHolidaysByDate([
      {
        id: 'holiday-1',
        date: '2026-12-31',
        endDate: '2027-01-02',
        title: 'Новогодние каникулы',
      },
    ])

    expect(grouped.get('2027-01-01')?.title).toBe('Новогодние каникулы')
    expect(grouped).toHaveLength(3)
  })
})
