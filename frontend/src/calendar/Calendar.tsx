import { useMemo, useRef, useState } from 'react'

import {
  createContinuousDays,
  EMPTY_CALENDAR_DATA,
  formatDate,
  getMonthRanges,
  getMonthTransitionIndex,
  groupEventsByDate,
  startOfMonth,
  WEEKDAY_NAMES,
  type CalendarData,
  type MonthRange,
} from './model'
import { parseCalendarYaml } from './yaml'

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
  const [status, setStatus] = useState(
    'Откройте YML, чтобы загрузить праздники и события.',
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const days = useMemo(
    () => createContinuousDays(baseDate, viewMonths),
    [baseDate, viewMonths],
  )
  const monthRanges = useMemo(() => getMonthRanges(days), [days])
  const holidays = useMemo(() => new Set(data.holidays), [data.holidays])
  const workingWeekends = useMemo(
    () => new Set(data.workingWeekends),
    [data.workingWeekends],
  )
  const eventsByDate = useMemo(() => groupEventsByDate(data.events), [data.events])

  const navigationStep = viewMonths === 3 ? 1 : viewMonths

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

  async function loadYaml(file: File | undefined) {
    if (!file) {
      return
    }

    try {
      const yamlText = await file.text()
      setData(parseCalendarYaml(yamlText))
      setStatus(`Загружено: ${file.name}`)
    } catch (error) {
      console.error(error)
      setStatus('Не удалось прочитать выбранный YML.')
    }
  }

  return (
    <section className="calendar-panel">
      <div className="toolbar">
        <div className="toolbar-group">
          <button
            type="button"
            className="button button--secondary button--icon"
            aria-label="Предыдущий период"
            onClick={() => shiftRange(-1)}
          >
            ←
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
            →
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

        <div className="toolbar-group">
          <button
            type="button"
            className="button button--secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            Открыть YML
          </button>
          <input
            ref={fileInputRef}
            className="hidden-input"
            type="file"
            accept=".yml,.yaml,text/yaml,application/x-yaml"
            onChange={(event) => {
              void loadYaml(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </div>

        <div className="calendar-status" role="status">
          {status}
        </div>
      </div>

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
            const isHoliday = holidays.has(dateString)
            const dateEvents = eventsByDate.get(dateString) ?? []
            const transitionIndex = getMonthTransitionIndex(index, days)
            const classNames = [
              'day-cell',
              index % 7 === 6 && 'day-cell--week-end',
              isWeekend && 'day-cell--weekend',
              isHoliday && 'day-cell--holiday',
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

                {dateEvents.slice(0, 3).map((event, eventIndex) => (
                  <span
                    key={`${event.title}-${eventIndex}`}
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

      <section className="events-section" aria-labelledby="events-title">
        <div className="events-heading">
          <div>
            <p className="section-kicker">Расписание</p>
            <h2 id="events-title">События</h2>
          </div>
          <span>{data.events.length}</span>
        </div>

        {data.events.length === 0 ? (
          <div className="empty-state">
            Событий пока нет. Загрузите существующий YAML-файл.
          </div>
        ) : (
          <div className="record-list">
            {data.events.map((event, index) => (
              <article
                key={`${event.date}-${event.title}-${index}`}
                className={[
                  'record-item',
                  event.date === selectedDate && 'record-item--selected',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <strong>{event.title}</strong>
                <time dateTime={event.date}>{event.date}</time>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
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
