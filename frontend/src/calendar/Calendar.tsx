import { useEffect, useMemo, useState } from 'react'

import { getCalendarData } from '../api/calendar'
import {
  createContinuousDays,
  createMonthGridDays,
  EMPTY_CALENDAR_DATA,
  formatDate,
  getMonthRanges,
  getMonthTransitionIndex,
  groupHolidaysByDate,
  groupEventsByDate,
  isDateInPeriod,
  startOfMonth,
  WEEKDAY_NAMES,
  type CalendarData,
  type MonthRange,
  type CalendarEvent,
  type CalendarHoliday,
} from './model'
import { CalendarForms } from './CalendarForms'

const VIEW_MONTH_OPTIONS = [
  { value: 3, label: '3 месяца' },
  { value: 12, label: 'Год' },
] as const

type CalendarView = (typeof VIEW_MONTH_OPTIONS)[number]['value']

export function Calendar() {
  const today = useMemo(() => new Date(), [])
  const [data, setData] = useState<CalendarData>(EMPTY_CALENDAR_DATA)
  const [viewMonths, setViewMonths] = useState<CalendarView>(3)
  const [baseDate, setBaseDate] = useState(() => startOfMonth(today))
  const [selectedDate, setSelectedDate] = useState(() => formatDate(today))
  const [dataVersion, setDataVersion] = useState(0)

  const days = useMemo(
    () => createContinuousDays(baseDate, viewMonths),
    [baseDate, viewMonths],
  )
  const monthRanges = useMemo(() => getMonthRanges(days), [days])
  const holidaysByDate = useMemo(
    () => groupHolidaysByDate(data.holidays),
    [data.holidays],
  )
  const vacationsByDate = useMemo(
    () => groupHolidaysByDate(data.vacations),
    [data.vacations],
  )
  const workingDaysByDate = useMemo(
    () => groupHolidaysByDate(data.workingDays),
    [data.workingDays],
  )
  const eventsByDate = useMemo(() => groupEventsByDate(data.events), [data.events])

  const isYearView = viewMonths === 12
  const navigationStep = isYearView ? 12 : 1
  const dateRange = useMemo(() => {
    if (isYearView) {
      const year = baseDate.getFullYear()
      return {
        from: formatDate(new Date(year, 0, 1)),
        to: formatDate(new Date(year, 11, 31)),
      }
    }
    const visibleDays = days.filter((date): date is Date => date !== null)
    const firstDay = visibleDays[0]
    const lastDay = visibleDays.at(-1)
    return firstDay && lastDay
      ? { from: formatDate(firstDay), to: formatDate(lastDay) }
      : undefined
  }, [baseDate, days, isYearView])

  useEffect(() => {
    if (!dateRange) {
      return
    }

    const controller = new AbortController()
    getCalendarData(dateRange.from, dateRange.to, controller.signal)
      .then((calendarData) => {
        setData(calendarData)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
      })

    return () => controller.abort()
  }, [dateRange, dataVersion])

  const visiblePeriod = useMemo(() => {
    if (isYearView) {
      return String(baseDate.getFullYear())
    }
    const visibleDays = days.filter((date): date is Date => date !== null)
    const firstDay = visibleDays[0]
    const lastDay = visibleDays.at(-1)

    if (!firstDay || !lastDay) {
      return ''
    }

    const monthFormatter = new Intl.DateTimeFormat('ru-RU', { month: 'long' })
    const firstMonth = monthFormatter.format(firstDay)
    const lastMonth = monthFormatter.format(lastDay)

    if (firstDay.getFullYear() === lastDay.getFullYear()) {
      const months =
        firstMonth === lastMonth ? firstMonth : `${firstMonth} — ${lastMonth}`
      return `${months} ${lastDay.getFullYear()}`
    }

    return `${firstMonth} ${firstDay.getFullYear()} — ${lastMonth} ${lastDay.getFullYear()}`
  }, [baseDate, days, isYearView])

  function shiftRange(direction: number) {
    setBaseDate(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + navigationStep * direction,
          1,
        ),
    )
  }

  return (
    <section className="calendar-panel">
      <div className="toolbar">
        <div className="period-heading">
          <p>Текущий период</p>
          <h2>{visiblePeriod}</h2>
        </div>

        <div className="toolbar-actions">
          <div className="toolbar-group navigation-controls">
            <button
              type="button"
              className="button button--secondary button--icon"
              aria-label="Предыдущий период"
              onClick={() => shiftRange(-1)}
            >
              <ArrowIcon direction="left" />
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => {
                setBaseDate(startOfMonth(today))
                setSelectedDate(formatDate(today))
              }}
            >
              Сегодня
            </button>
            <button
              type="button"
              className="button button--secondary button--icon"
              aria-label="Следующий период"
              onClick={() => shiftRange(1)}
            >
              <ArrowIcon direction="right" />
            </button>
          </div>

          <div className="toolbar-group">
            <label className="sr-only" htmlFor="view-mode">
              Диапазон календаря
            </label>
            <select
              id="view-mode"
              value={viewMonths}
              onChange={(event) => {
                const nextView = Number(event.target.value) as CalendarView
                setViewMonths(nextView)
                if (nextView === 12) {
                  setBaseDate((current) => new Date(current.getFullYear(), 0, 1))
                }
              }}
            >
              {VIEW_MONTH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

        </div>

      </div>

      <div
        className={[
          'calendar-content',
          isYearView && 'calendar-content--year',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="calendar-scroll">
          {isYearView ? (
            <YearCalendar
              year={baseDate.getFullYear()}
              today={today}
              selectedDate={selectedDate}
              holidaysByDate={holidaysByDate}
              vacationsByDate={vacationsByDate}
              workingDaysByDate={workingDaysByDate}
              eventsByDate={eventsByDate}
              onSelectDate={setSelectedDate}
            />
          ) : (
          <div className="calendar-grid" aria-label="Календарь">
          <div className="calendar-corner" />
          {WEEKDAY_NAMES.map((weekday, index) => (
            <div
              key={weekday}
              className="weekday"
              style={{ gridColumn: index + 2, gridRow: 1 }}
            >
              {weekday}
            </div>
          ))}

          {monthRanges.map((range) => (
            <MonthLabel key={range.key} range={range} />
          ))}

          {days.map((date, index) => {
            const column = (index % 7) + 2
            const row = Math.floor(index / 7) + 2

            if (!date) {
              return (
                <div
                  key={`empty-${index}`}
                  className="day-cell day-cell--outside"
                  style={{ gridColumn: column, gridRow: row }}
                />
              )
            }

            const dateString = formatDate(date)
            const isWorkingWeekend = workingDaysByDate.has(dateString)
            const isWeekend =
              (date.getDay() === 0 || date.getDay() === 6) && !isWorkingWeekend
            const holiday = holidaysByDate.get(dateString)
            const vacation = vacationsByDate.get(dateString)
            const isHoliday = Boolean(holiday)
            const dateEvents = eventsByDate.get(dateString) ?? []
            const transitionIndex = getMonthTransitionIndex(index, days)
            const classNames = [
              'day-cell',
              index % 7 === 6 && 'day-cell--week-end',
              isWeekend && 'day-cell--weekend',
              isHoliday && 'day-cell--holiday',
              vacation && 'day-cell--vacation',
              dateString === formatDate(today) && 'day-cell--today',
              dateString === selectedDate && 'day-cell--selected',
              transitionIndex !== -1 &&
                index < transitionIndex &&
                'day-cell--month-end-tail',
              transitionIndex === index && 'day-cell--month-start',
              transitionIndex !== -1 &&
                index > transitionIndex &&
                'day-cell--month-start-tail',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <button
                key={dateString}
                type="button"
                className={classNames}
                style={{ gridColumn: column, gridRow: row }}
                aria-label={dateString}
                aria-pressed={dateString === selectedDate}
                onClick={() => setSelectedDate(dateString)}
              >
                <span
                  className={[
                    'day-number',
                    (isWeekend || isHoliday) && 'day-number--red',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {date.getDate()}
                </span>

                {holiday && (
                  <span className="holiday-label">{holiday.title}</span>
                )}
                {vacation && (
                  <span className="vacation-label">{vacation.title}</span>
                )}

                {dateEvents.slice(0, 3).map((event, eventIndex) => (
                  <span
                    key={`${event.id}-${eventIndex}`}
                    className="event-label"
                  >
                    {event.title}
                  </span>
                ))}

                {dateEvents.length > 3 && (
                  <span className="cell-label">Ещё: {dateEvents.length - 3}</span>
                )}
              </button>
            )
          })}
          </div>
          )}
        </div>

        {!isYearView && <CalendarForms
          key={selectedDate}
          initialDate={selectedDate}
          selectedEvents={eventsByDate.get(selectedDate) ?? []}
          selectedHolidays={data.holidays.filter((holiday) =>
            isDateInPeriod(selectedDate, holiday),
          )}
          selectedVacations={data.vacations.filter((vacation) =>
            isDateInPeriod(selectedDate, vacation),
          )}
          selectedWorkingDays={data.workingDays.filter((workingDay) =>
            isDateInPeriod(selectedDate, workingDay),
          )}
          onSaved={() => setDataVersion((version) => version + 1)}
        />}
      </div>
    </section>
  )
}

function YearCalendar({
  year,
  today,
  selectedDate,
  holidaysByDate,
  vacationsByDate,
  workingDaysByDate,
  eventsByDate,
  onSelectDate,
}: {
  year: number
  today: Date
  selectedDate: string
  holidaysByDate: Map<string, CalendarHoliday>
  vacationsByDate: Map<string, CalendarHoliday>
  workingDaysByDate: Map<string, CalendarHoliday>
  eventsByDate: Map<string, CalendarEvent[]>
  onSelectDate: (date: string) => void
}) {
  const todayString = formatDate(today)

  return (
    <div className="year-calendar" aria-label={`Календарь на ${year} год`}>
      {Array.from({ length: 12 }, (_, month) => {
        const monthDate = new Date(year, month, 1)
        const monthDays = createMonthGridDays(monthDate)

        return (
          <section className="year-month" key={month}>
            <h3>{new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(monthDate)}</h3>
            <div className="year-month__weekdays" aria-hidden="true">
              {WEEKDAY_NAMES.map((weekday) => <span key={weekday}>{weekday}</span>)}
            </div>
            <div className="year-month__days">
              {monthDays.map((date, index) => {
                if (!date) {
                  return <span className="year-day year-day--empty" key={`empty-${index}`} />
                }

                const dateString = formatDate(date)
                const isWorkingWeekend = workingDaysByDate.has(dateString)
                const isWeekend =
                  (date.getDay() === 0 || date.getDay() === 6) &&
                  !isWorkingWeekend
                const isHoliday = holidaysByDate.has(dateString)
                const isVacation = vacationsByDate.has(dateString)
                const hasEvents = (eventsByDate.get(dateString)?.length ?? 0) > 0
                const className = [
                  'year-day',
                  (isWeekend || isHoliday) && 'year-day--holiday',
                  isVacation && 'year-day--vacation',
                  dateString === todayString && 'year-day--today',
                  dateString === selectedDate && 'year-day--selected',
                ].filter(Boolean).join(' ')

                return (
                  <button
                    type="button"
                    className={className}
                    key={dateString}
                    aria-label={dateString}
                    aria-pressed={dateString === selectedDate}
                    onClick={() => onSelectDate(dateString)}
                  >
                    <span>{date.getDate()}</span>
                    {hasEvents && <i className="year-day__event" aria-label="Есть события" />}
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d={direction === 'left' ? 'm12.5 4.5-5 5 5 5' : 'm7.5 4.5 5 5-5 5'} />
    </svg>
  )
}

function MonthLabel({ range }: { range: MonthRange }) {
  const startRow = Math.floor(range.startIndex / 7) + 2
  const endRow = Math.floor(range.endIndex / 7) + 2

  return (
    <div
      className="month-label"
      style={{
        gridColumn: 1,
        gridRow: `${startRow} / span ${endRow - startRow + 1}`,
      }}
    >
      {range.name} {range.year}
    </div>
  )
}
