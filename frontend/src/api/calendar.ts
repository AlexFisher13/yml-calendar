import type {
  CalendarData,
  CalendarEvent,
  CalendarHoliday,
} from '../calendar/model'

export async function getCalendarData(
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<CalendarData> {
  const query = new URLSearchParams({ from, to })
  const response = await fetch(`/api/v1/calendar?${query}`, { signal })

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`)
  }

  return response.json() as Promise<CalendarData>
}

type PeriodInput = {
  title: string
  date: string
  endDate?: string
}

export async function createCalendarEvent(
  input: PeriodInput,
): Promise<CalendarEvent> {
  return sendPeriod<CalendarEvent>('/api/v1/events', {
    ...input,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow',
  })
}

export async function createCalendarHoliday(
  input: PeriodInput,
): Promise<CalendarHoliday> {
  return sendPeriod<CalendarHoliday>('/api/v1/holidays', input)
}

export async function createCalendarVacation(
  input: PeriodInput,
): Promise<CalendarHoliday> {
  return sendPeriod<CalendarHoliday>('/api/v1/vacations', input)
}

export async function createCalendarWorkingDay(
  input: Pick<PeriodInput, 'date' | 'endDate'>,
): Promise<CalendarHoliday> {
  return sendPeriod<CalendarHoliday>('/api/v1/working-days', input)
}

async function sendPeriod<T>(url: string, input: object): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`)
  }

  return response.json() as Promise<T>
}

export async function deleteCalendarEntry(
  kind: 'event' | 'holiday' | 'vacation' | 'working-day',
  id: string,
): Promise<void> {
  const paths = {
    event: 'events',
    holiday: 'holidays',
    vacation: 'vacations',
    'working-day': 'working-days',
  } as const
  const response = await fetch(`/api/v1/${paths[kind]}/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`)
  }
}
