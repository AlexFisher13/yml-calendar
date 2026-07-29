import { describe, expect, it } from 'vitest'

import { parseCalendarYaml } from './yaml'

describe('parseCalendarYaml', () => {
  it('parses year-grouped holidays, working weekends and events', () => {
    const data = parseCalendarYaml(`
holidays:
  2026:
    - 01-01

working_weekends:
  2026:
    - 12-26

events:
  2026:
    07-29:
      - Встреча
      - "Концерт"
`)

    expect(data.holidays).toEqual(['2026-01-01'])
    expect(data.workingWeekends).toEqual(['2026-12-26'])
    expect(data.events).toEqual([
      { date: '2026-07-29', title: 'Встреча' },
      { date: '2026-07-29', title: 'Концерт' },
    ])
  })

  it('parses events with full dates', () => {
    const data = parseCalendarYaml(`
events:
  2026-07-29:
    - День рождения
`)

    expect(data.events).toEqual([
      { date: '2026-07-29', title: 'День рождения' },
    ])
  })
})
