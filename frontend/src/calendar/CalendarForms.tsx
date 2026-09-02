import { useState, type FormEvent } from 'react'

import {
  createCalendarEvent,
  createCalendarHoliday,
  createCalendarVacation,
  deleteCalendarEntry,
} from '../api/calendar'
import type { CalendarEvent, CalendarHoliday } from './model'

type PeriodInput = {
  title: string
  date: string
  endDate?: string
}

export function CalendarForms({
  initialDate,
  selectedEvents,
  selectedHolidays,
  selectedVacations,
  onSaved,
}: {
  initialDate: string
  selectedEvents: CalendarEvent[]
  selectedHolidays: CalendarHoliday[]
  selectedVacations: CalendarHoliday[]
  onSaved: () => void
}) {
  return (
    <aside className="calendar-forms" aria-label="Добавление в календарь">
      <DayEntries
        date={initialDate}
        events={selectedEvents}
        holidays={selectedHolidays}
        vacations={selectedVacations}
        onDeleted={onSaved}
      />
      <PeriodForm
        kind="event"
        title="Новое событие"
        namePlaceholder="Название события"
        submitLabel="Добавить событие"
        initialDate={initialDate}
        onSubmit={createCalendarEvent}
        onSaved={onSaved}
      />
      <PeriodForm
        kind="vacation"
        title="Отпуск или каникулы"
        namePlaceholder="Название периода"
        submitLabel="Добавить отпуск"
        initialDate={initialDate}
        onSubmit={createCalendarVacation}
        onSaved={onSaved}
      />
      <PeriodForm
        kind="holiday"
        title="Праздничный день"
        namePlaceholder="Название праздника"
        submitLabel="Сделать праздничным"
        initialDate={initialDate}
        onSubmit={createCalendarHoliday}
        onSaved={onSaved}
      />
    </aside>
  )
}

type DayEntry = {
  id: string
  kind: 'event' | 'holiday' | 'vacation'
  title: string
  date: string
  endDate?: string
}

function DayEntries({
  date,
  events,
  holidays,
  vacations,
  onDeleted,
}: {
  date: string
  events: CalendarEvent[]
  holidays: CalendarHoliday[]
  vacations: CalendarHoliday[]
  onDeleted: () => void
}) {
  const [confirmId, setConfirmId] = useState<string>()
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')
  const entries: DayEntry[] = [
    ...events.map((entry) => ({ ...entry, kind: 'event' as const })),
    ...holidays.map((entry) => ({ ...entry, kind: 'holiday' as const })),
    ...vacations.map((entry) => ({ ...entry, kind: 'vacation' as const })),
  ]

  async function remove(entry: DayEntry) {
    setIsDeleting(true)
    setError('')
    try {
      await deleteCalendarEntry(entry.kind, entry.id)
      setConfirmId(undefined)
      onDeleted()
    } catch {
      setError('Не удалось удалить запись')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <section className="day-entries" aria-labelledby="day-entries-title">
      <div className="day-entries__heading">
        <h3 id="day-entries-title">В этот день</h3>
        <time dateTime={date}>{formatHumanDate(date)}</time>
      </div>

      {entries.length === 0 ? (
        <p className="day-entries__empty">Нет записей</p>
      ) : (
        <div className="day-entries__list">
          {entries.map((entry) => (
            <article className="day-entry" key={`${entry.kind}-${entry.id}`}>
              <div className="day-entry__summary">
                <span className={`day-entry__marker day-entry__marker--${entry.kind}`} aria-hidden="true" />
                <div>
                  <strong>{entry.title}</strong>
                  {(entry.endDate || entry.date !== date) && (
                    <small>{formatPeriod(entry.date, entry.endDate)}</small>
                  )}
                </div>
                <button
                  type="button"
                  className="day-entry__delete"
                  aria-label={`Удалить: ${entry.title}`}
                  aria-expanded={confirmId === entry.id}
                  onClick={() =>
                    setConfirmId((current) =>
                      current === entry.id ? undefined : entry.id,
                    )
                  }
                >
                  <TrashIcon />
                </button>
              </div>

              {confirmId === entry.id && (
                <div className="day-entry__confirm">
                  <span>Удалить «{entry.title}»?</span>
                  <div>
                    <button type="button" onClick={() => setConfirmId(undefined)}>Отмена</button>
                    <button type="button" disabled={isDeleting} onClick={() => void remove(entry)}>
                      {isDeleting ? 'Удаляем…' : 'Удалить'}
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      <div className="day-entries__error" role="status">{error}</div>
    </section>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4.5 6h11M8 3.5h4M6.5 6l.6 10h5.8l.6-10M8.5 8.5v5M11.5 8.5v5" />
    </svg>
  )
}

function formatHumanDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
    .format(new Date(`${value}T00:00:00`))
}

function formatPeriod(start: string, end?: string): string {
  if (!end || end === start) {
    return formatHumanDate(start)
  }
  return `${formatHumanDate(start)} — ${formatHumanDate(end)}`
}

function PeriodForm({
  kind,
  title,
  namePlaceholder,
  submitLabel,
  initialDate,
  onSubmit,
  onSaved,
}: {
  kind: 'event' | 'holiday' | 'vacation'
  title: string
  namePlaceholder: string
  submitLabel: string
  initialDate: string
  onSubmit: (input: PeriodInput) => Promise<unknown>
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [date, setDate] = useState(initialDate)
  const [endDate, setEndDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')
    try {
      await onSubmit({
        title: name.trim(),
        date,
        ...(endDate ? { endDate } : {}),
      })
      setName('')
      setEndDate('')
      setMessage('Сохранено')
      onSaved()
    } catch {
      setMessage('Не удалось сохранить')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className={`entry-form entry-form--${kind}`} onSubmit={handleSubmit}>
      <div className="entry-form__heading">
        <span aria-hidden="true" />
        <h3>{title}</h3>
      </div>

      <label>
        <input
          required
          maxLength={200}
          value={name}
          aria-label={namePlaceholder}
          placeholder={namePlaceholder}
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      <div className="date-fields">
        <label>
          <span>Дата</span>
          <input
            required
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label>
          <span>По дату <em>необязательно</em></span>
          <input
            type="date"
            min={date}
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </label>
      </div>

      <button className="button button--primary entry-form__submit" disabled={isSubmitting}>
        {isSubmitting ? 'Сохраняем…' : submitLabel}
      </button>
      <div className="entry-form__message" role="status">{message}</div>
    </form>
  )
}
