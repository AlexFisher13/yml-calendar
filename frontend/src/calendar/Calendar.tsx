import { useEffect, useMemo, useState } from 'react'

import { getCalendarData } from '../api/calendar'
import {
  createContinuousDays,
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
} from './model'
import { CalendarForms } from './CalendarForms'

const VIEW_MONTH_OPTIONS = [
  { value: 1, label: 'Месяц' },
  { value: 3, label: '3 месяца' },
  { value: 6, label: 'Полгода' },
  { value: 12, label: 'Год' },
] as const

export function Calendar() {
  const today = useMemo(() => new Date(), [])
  const [data, setData] = useState<CalendarData>(EMPTY_CALENDAR_DATA)
  const [viewMonths, setViewMonths] = useState(3)
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
  const workingWeekends = useMemo(
    () => new Set(data.workingWeekends),
    [data.workingWeekends],
  )
  const eventsByDate = useMemo(() => groupEventsByDate(data.events), [data.events])

  const navigationStep = viewMonths === 3 ? 1 : viewMonths
  const dateRange = useMemo(() => {
    const visibleDays = days.filter((date): date is Date => date !== null)
    const firstDay = visibleDays[0]
    const lastDay = visibleDays.at(-1)
    return firstDay && lastDay
      ? { from: formatDate(firstDay), to: formatDate(lastDay) }
      : undefined
  }, [days])

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
  }, [days])

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
              onChange={(event) => setViewMonths(Number(event.target.value))}
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

      <div className="calendar-content">
        <div className="calendar-scroll">
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
            const isWorkingWeekend = workingWeekends.has(dateString)
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
        </div>

        <CalendarForms
          key={selectedDate}
          initialDate={selectedDate}
          selectedEvents={eventsByDate.get(selectedDate) ?? []}
          selectedHolidays={data.holidays.filter((holiday) =>
            isDateInPeriod(selectedDate, holiday),
          )}
          selectedVacations={data.vacations.filter((vacation) =>
            isDateInPeriod(selectedDate, vacation),
          )}
          onSaved={() => setDataVersion((version) => version + 1)}
        />
      </div>
    </section>
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
