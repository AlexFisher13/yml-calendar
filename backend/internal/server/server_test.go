package server

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	calendarstore "github.com/fisher/bro-calendar/backend/internal/calendar"
)

type fakeStore struct {
	data    calendarstore.Data
	created calendarstore.Event
}

func (store *fakeStore) Ping(context.Context) error { return nil }
func (store *fakeStore) Calendar(context.Context, time.Time, time.Time) (calendarstore.Data, error) {
	return store.data, nil
}
func (store *fakeStore) CreateEvent(_ context.Context, event calendarstore.Event) (calendarstore.Event, error) {
	event.ID = "event-1"
	store.created = event
	return event, nil
}
func (store *fakeStore) UpdateEvent(_ context.Context, event calendarstore.Event) (calendarstore.Event, error) {
	return event, nil
}
func (store *fakeStore) DeleteEvent(context.Context, string) error { return nil }
func (store *fakeStore) CreateHoliday(_ context.Context, holiday calendarstore.Holiday) (calendarstore.Holiday, error) {
	return holiday, nil
}
func (store *fakeStore) CreateVacation(_ context.Context, vacation calendarstore.Holiday) (calendarstore.Holiday, error) {
	return vacation, nil
}
func (store *fakeStore) DeleteHoliday(context.Context, string) error  { return nil }
func (store *fakeStore) DeleteVacation(context.Context, string) error { return nil }

func TestStatus(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/api/v1/system/status", nil)
	response := httptest.NewRecorder()
	New(&fakeStore{}).ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("ожидался статус 200, получен %d", response.Code)
	}
	var body map[string]string
	if err := json.NewDecoder(response.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body["application"] != "bro-calendar" || body["status"] != "UP" {
		t.Fatalf("неожиданный ответ: %#v", body)
	}
}

func TestCalendarRequiresRange(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/api/v1/calendar", nil)
	response := httptest.NewRecorder()
	New(&fakeStore{}).ServeHTTP(response, request)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("ожидался статус 400, получен %d", response.Code)
	}
}

func TestCreateAllDayEvent(t *testing.T) {
	store := &fakeStore{}
	request := httptest.NewRequest(http.MethodPost, "/api/v1/events", strings.NewReader(`{"date":"2026-09-02","title":"Встреча","timeZone":"Europe/Moscow"}`))
	response := httptest.NewRecorder()
	New(store).ServeHTTP(response, request)
	if response.Code != http.StatusCreated {
		t.Fatalf("ожидался статус 201, получен %d: %s", response.Code, response.Body.String())
	}
	if store.created.Title != "Встреча" || store.created.Date != "2026-09-02" {
		t.Fatalf("неожиданное событие: %#v", store.created)
	}
}

func TestCreateEventValidatesTimeZone(t *testing.T) {
	request := httptest.NewRequest(http.MethodPost, "/api/v1/events", strings.NewReader(`{"date":"2026-09-02","title":"Встреча","timeZone":"Moscow"}`))
	response := httptest.NewRecorder()
	New(&fakeStore{}).ServeHTTP(response, request)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("ожидался статус 400, получен %d", response.Code)
	}
}

func TestCreateHolidayPeriod(t *testing.T) {
	request := httptest.NewRequest(http.MethodPost, "/api/v1/holidays", strings.NewReader(`{"date":"2026-12-31","endDate":"2027-01-08","title":"Новогодние каникулы"}`))
	response := httptest.NewRecorder()
	New(&fakeStore{}).ServeHTTP(response, request)
	if response.Code != http.StatusCreated {
		t.Fatalf("ожидался статус 201, получен %d: %s", response.Code, response.Body.String())
	}
}

func TestRejectsReversePeriod(t *testing.T) {
	request := httptest.NewRequest(http.MethodPost, "/api/v1/events", strings.NewReader(`{"date":"2026-09-03","endDate":"2026-09-02","title":"Встреча","timeZone":"Europe/Moscow"}`))
	response := httptest.NewRecorder()
	New(&fakeStore{}).ServeHTTP(response, request)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("ожидался статус 400, получен %d", response.Code)
	}
}

func TestCreateVacationPeriod(t *testing.T) {
	request := httptest.NewRequest(http.MethodPost, "/api/v1/vacations", strings.NewReader(`{"date":"2026-10-01","endDate":"2026-10-14","title":"Отпуск"}`))
	response := httptest.NewRecorder()
	New(&fakeStore{}).ServeHTTP(response, request)
	if response.Code != http.StatusCreated {
		t.Fatalf("ожидался статус 201, получен %d: %s", response.Code, response.Body.String())
	}
}

func TestDeleteHoliday(t *testing.T) {
	request := httptest.NewRequest(http.MethodDelete, "/api/v1/holidays/period-1", nil)
	response := httptest.NewRecorder()
	New(&fakeStore{}).ServeHTTP(response, request)
	if response.Code != http.StatusNoContent {
		t.Fatalf("ожидался статус 204, получен %d", response.Code)
	}
}
