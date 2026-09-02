package calendar

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const personalCalendarID = "00000000-0000-0000-0000-000000000001"

var ErrNotFound = errors.New("событие не найдено")

type Event struct {
	ID       string `json:"id"`
	Date     string `json:"date"`
	EndDate  string `json:"endDate,omitempty"`
	Title    string `json:"title"`
	TimeZone string `json:"timeZone"`
	RRULE    string `json:"rrule,omitempty"`
}

type Holiday struct {
	ID      string `json:"id"`
	Date    string `json:"date"`
	EndDate string `json:"endDate,omitempty"`
	Title   string `json:"title"`
}

type Data struct {
	Holidays    []Holiday `json:"holidays"`
	Vacations   []Holiday `json:"vacations"`
	WorkingDays []Holiday `json:"workingDays"`
	Events      []Event   `json:"events"`
}

type Store interface {
	Ping(context.Context) error
	Calendar(context.Context, time.Time, time.Time) (Data, error)
	CreateEvent(context.Context, Event) (Event, error)
	UpdateEvent(context.Context, Event) (Event, error)
	DeleteEvent(context.Context, string) error
	CreateHoliday(context.Context, Holiday) (Holiday, error)
	CreateVacation(context.Context, Holiday) (Holiday, error)
	CreateWorkingDay(context.Context, Holiday) (Holiday, error)
	DeleteHoliday(context.Context, string) error
	DeleteVacation(context.Context, string) error
	DeleteWorkingDay(context.Context, string) error
}

type PostgresStore struct {
	pool *pgxpool.Pool
}

func NewPostgresStore(pool *pgxpool.Pool) *PostgresStore {
	return &PostgresStore{pool: pool}
}

func (store *PostgresStore) Ping(ctx context.Context) error {
	return store.pool.Ping(ctx)
}

func (store *PostgresStore) Calendar(ctx context.Context, from, to time.Time) (Data, error) {
	data := Data{Holidays: []Holiday{}, Vacations: []Holiday{}, WorkingDays: []Holiday{}, Events: []Event{}}

	dayRows, err := store.pool.Query(ctx, `
		SELECT id::text, day::text, end_day::text, kind::text, title
		FROM calendar_days
		WHERE calendar_id = $1 AND day <= $3 AND end_day >= $2
		ORDER BY day`, personalCalendarID, from, to)
	if err != nil {
		return data, err
	}
	for dayRows.Next() {
		var id, day, endDay, kind, title string
		if err := dayRows.Scan(&id, &day, &endDay, &kind, &title); err != nil {
			dayRows.Close()
			return data, err
		}
		if kind == "holiday" || kind == "vacation" || kind == "working_weekend" {
			period := Holiday{ID: id, Date: day, Title: title}
			if endDay != day {
				period.EndDate = endDay
			}
			if kind == "holiday" {
				data.Holidays = append(data.Holidays, period)
			} else if kind == "vacation" {
				data.Vacations = append(data.Vacations, period)
			} else {
				data.WorkingDays = append(data.WorkingDays, period)
			}
		}
	}
	if err := dayRows.Err(); err != nil {
		dayRows.Close()
		return data, err
	}
	dayRows.Close()

	eventRows, err := store.pool.Query(ctx, `
		SELECT id::text, all_day_start::text,
		       COALESCE(all_day_end::text, all_day_start::text),
		       title, time_zone, COALESCE(rrule, '')
		FROM events
		WHERE calendar_id = $1
		  AND all_day_start IS NOT NULL
		  AND all_day_start <= $3
		  AND COALESCE(all_day_end, all_day_start) >= $2
		ORDER BY all_day_start, created_at`, personalCalendarID, from, to)
	if err != nil {
		return data, err
	}
	defer eventRows.Close()
	for eventRows.Next() {
		var event Event
		var endDate string
		if err := eventRows.Scan(&event.ID, &event.Date, &endDate, &event.Title, &event.TimeZone, &event.RRULE); err != nil {
			return data, err
		}
		if endDate != event.Date {
			event.EndDate = endDate
		}
		data.Events = append(data.Events, event)
	}

	return data, eventRows.Err()
}

func (store *PostgresStore) CreateEvent(ctx context.Context, event Event) (Event, error) {
	err := store.pool.QueryRow(ctx, `
		INSERT INTO events(calendar_id, title, all_day_start, all_day_end, time_zone, rrule)
		VALUES ($1, $2, $3, NULLIF($4, '')::date, $5, NULLIF($6, ''))
		RETURNING id::text`,
		personalCalendarID, event.Title, event.Date, event.EndDate, event.TimeZone, event.RRULE,
	).Scan(&event.ID)
	return event, err
}

func (store *PostgresStore) UpdateEvent(ctx context.Context, event Event) (Event, error) {
	command, err := store.pool.Exec(ctx, `
		UPDATE events
		SET title = $2, all_day_start = $3, all_day_end = NULLIF($4, '')::date,
		    time_zone = $5, rrule = NULLIF($6, ''), updated_at = now()
		WHERE id = $1 AND calendar_id = $7`,
		event.ID, event.Title, event.Date, event.EndDate, event.TimeZone, event.RRULE, personalCalendarID)
	if err != nil {
		return event, err
	}
	if command.RowsAffected() == 0 {
		return event, ErrNotFound
	}
	return event, nil
}

func (store *PostgresStore) CreateHoliday(ctx context.Context, holiday Holiday) (Holiday, error) {
	return store.createCalendarPeriod(ctx, holiday, "holiday")
}

func (store *PostgresStore) CreateVacation(ctx context.Context, vacation Holiday) (Holiday, error) {
	return store.createCalendarPeriod(ctx, vacation, "vacation")
}

func (store *PostgresStore) CreateWorkingDay(ctx context.Context, workingDay Holiday) (Holiday, error) {
	workingDay.Title = "Рабочий день"
	return store.createCalendarPeriod(ctx, workingDay, "working_weekend")
}

func (store *PostgresStore) createCalendarPeriod(ctx context.Context, period Holiday, kind string) (Holiday, error) {
	endDate := period.EndDate
	if endDate == "" {
		endDate = period.Date
	}
	err := store.pool.QueryRow(ctx, `
		INSERT INTO calendar_days(calendar_id, day, end_day, kind, title)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (calendar_id, day) DO UPDATE
		SET end_day = EXCLUDED.end_day, kind = EXCLUDED.kind, title = EXCLUDED.title
		RETURNING id::text`,
		personalCalendarID, period.Date, endDate, kind, period.Title).Scan(&period.ID)
	return period, err
}

func (store *PostgresStore) DeleteHoliday(ctx context.Context, id string) error {
	return store.deleteCalendarPeriod(ctx, id, "holiday")
}

func (store *PostgresStore) DeleteVacation(ctx context.Context, id string) error {
	return store.deleteCalendarPeriod(ctx, id, "vacation")
}

func (store *PostgresStore) DeleteWorkingDay(ctx context.Context, id string) error {
	return store.deleteCalendarPeriod(ctx, id, "working_weekend")
}

func (store *PostgresStore) deleteCalendarPeriod(ctx context.Context, id, kind string) error {
	command, err := store.pool.Exec(ctx, `
		DELETE FROM calendar_days
		WHERE id = $1 AND calendar_id = $2 AND kind = $3`, id, personalCalendarID, kind)
	if err != nil {
		return err
	}
	if command.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (store *PostgresStore) DeleteEvent(ctx context.Context, id string) error {
	command, err := store.pool.Exec(ctx,
		"DELETE FROM events WHERE id = $1 AND calendar_id = $2", id, personalCalendarID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	if command.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
