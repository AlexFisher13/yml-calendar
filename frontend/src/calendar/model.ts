export const MONTH_NAMES = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
] as const

export const WEEKDAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const

export type CalendarEvent = {
  date: string
  title: string
}

export type CalendarData = {
  holidays: string[]
  workingWeekends: string[]
  events: CalendarEvent[]
}

export type MonthRange = {
  key: string
  name: string
  year: number
  startIndex: number
  endIndex: number
}

export const EMPTY_CALENDAR_DATA: CalendarData = {
  holidays: [],
  workingWeekends: [],
  events: [],
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function createContinuousDays(baseDate: Date, viewMonths: number): Array<Date | null> {
  const days: Array<Date | null> = []
  const firstMonth = startOfMonth(baseDate)
  const firstWeekday = (firstMonth.getDay() + 6) % 7

  for (let index = 0; index < firstWeekday; index += 1) {
    days.push(null)
  }

  for (let offset = 0; offset < viewMonths; offset += 1) {
    const monthDate = new Date(
      firstMonth.getFullYear(),
      firstMonth.getMonth() + offset,
      1,
    )
    const monthEnd = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      0,
    )

    for (let day = 1; day <= monthEnd.getDate(); day += 1) {
      days.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day))
    }
  }

  return days
}

export function getMonthRanges(days: Array<Date | null>): MonthRange[] {
  const ranges: MonthRange[] = []
  let currentRange: MonthRange | undefined

  days.forEach((date, index) => {
    if (!date) {
      return
    }

    const key = `${date.getFullYear()}-${date.getMonth()}`
    if (!currentRange || currentRange.key !== key) {
      currentRange = {
        key,
        name: MONTH_NAMES[date.getMonth()],
        year: date.getFullYear(),
        startIndex: index,
        endIndex: index,
      }
      ranges.push(currentRange)
      return
    }

    currentRange.endIndex = index
  })

  return ranges
}

export function getMonthTransitionIndex(
  index: number,
  days: Array<Date | null>,
): number {
  const weekStartIndex = Math.floor(index / 7) * 7
  const weekEndIndex = Math.min(weekStartIndex + 6, days.length - 1)

  for (
    let currentIndex = weekStartIndex;
    currentIndex <= weekEndIndex;
    currentIndex += 1
  ) {
    const date = days[currentIndex]
    const previousDate = days[currentIndex - 1]

    if (!date || date.getDate() !== 1 || !previousDate) {
      continue
    }

    if (
      previousDate.getMonth() !== date.getMonth() ||
      previousDate.getFullYear() !== date.getFullYear()
    ) {
      return currentIndex
    }
  }

  return -1
}

export function groupEventsByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const grouped = new Map<string, CalendarEvent[]>()

  events.forEach((event) => {
    const dateEvents = grouped.get(event.date) ?? []
    dateEvents.push(event)
    grouped.set(event.date, dateEvents)
  })

  return grouped
}
