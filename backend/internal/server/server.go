package server

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	calendarstore "github.com/fisher/bro-calendar/backend/internal/calendar"
)

type api struct {
	store calendarstore.Store
}

func New(store calendarstore.Store) http.Handler {
	api := &api{store: store}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", api.health)
	mux.HandleFunc("GET /api/v1/system/status", api.status)
	mux.HandleFunc("GET /api/v1/calendar", api.calendar)
	mux.HandleFunc("POST /api/v1/events", api.createEvent)
	mux.HandleFunc("PUT /api/v1/events/{id}", api.updateEvent)
	mux.HandleFunc("DELETE /api/v1/events/{id}", api.deleteEvent)
	mux.HandleFunc("POST /api/v1/holidays", api.createHoliday)
	mux.HandleFunc("DELETE /api/v1/holidays/{id}", api.deleteHoliday)
	mux.HandleFunc("POST /api/v1/vacations", api.createVacation)
	mux.HandleFunc("DELETE /api/v1/vacations/{id}", api.deleteVacation)
	return recoverMiddleware(logMiddleware(mux))
}

func (api *api) health(writer http.ResponseWriter, request *http.Request) {
	if err := api.store.Ping(request.Context()); err != nil {
		writeError(writer, http.StatusServiceUnavailable, "database_unavailable", "База данных недоступна")
		return
	}
	writeJSON(writer, http.StatusOK, map[string]string{"status": "UP"})
}

func (api *api) status(writer http.ResponseWriter, _ *http.Request) {
	writeJSON(writer, http.StatusOK, map[string]string{
		"application": "bro-calendar",
		"status":      "UP",
		"timestamp":   time.Now().UTC().Format(time.RFC3339),
	})
}

func (api *api) calendar(writer http.ResponseWriter, request *http.Request) {
	from, err := parseDate(request.URL.Query().Get("from"))
	if err != nil {
		writeError(writer, http.StatusBadRequest, "invalid_from", "Параметр from должен быть датой YYYY-MM-DD")
		return
	}
	to, err := parseDate(request.URL.Query().Get("to"))
	if err != nil || to.Before(from) {
		writeError(writer, http.StatusBadRequest, "invalid_to", "Параметр to должен быть датой YYYY-MM-DD не раньше from")
		return
	}

	data, err := api.store.Calendar(request.Context(), from, to)
	if err != nil {
		slog.Error("чтение календаря", "error", err)
		writeError(writer, http.StatusInternalServerError, "internal_error", "Не удалось загрузить календарь")
		return
	}
	writeJSON(writer, http.StatusOK, data)
}

func (api *api) createEvent(writer http.ResponseWriter, request *http.Request) {
	event, ok := decodeEvent(writer, request)
	if !ok {
		return
	}
	event, err := api.store.CreateEvent(request.Context(), event)
	if err != nil {
		slog.Error("создание события", "error", err)
		writeError(writer, http.StatusInternalServerError, "internal_error", "Не удалось создать событие")
		return
	}
	writeJSON(writer, http.StatusCreated, event)
}

func (api *api) updateEvent(writer http.ResponseWriter, request *http.Request) {
	event, ok := decodeEvent(writer, request)
	if !ok {
		return
	}
	event.ID = request.PathValue("id")
	event, err := api.store.UpdateEvent(request.Context(), event)
	if errors.Is(err, calendarstore.ErrNotFound) {
		writeError(writer, http.StatusNotFound, "event_not_found", "Событие не найдено")
		return
	}
	if err != nil {
		slog.Error("изменение события", "error", err)
		writeError(writer, http.StatusInternalServerError, "internal_error", "Не удалось изменить событие")
		return
	}
	writeJSON(writer, http.StatusOK, event)
}

func (api *api) deleteEvent(writer http.ResponseWriter, request *http.Request) {
	err := api.store.DeleteEvent(request.Context(), request.PathValue("id"))
	if errors.Is(err, calendarstore.ErrNotFound) {
		writeError(writer, http.StatusNotFound, "event_not_found", "Событие не найдено")
		return
	}
	if err != nil {
		slog.Error("удаление события", "error", err)
		writeError(writer, http.StatusInternalServerError, "internal_error", "Не удалось удалить событие")
		return
	}
	writer.WriteHeader(http.StatusNoContent)
}

func (api *api) createHoliday(writer http.ResponseWriter, request *http.Request) {
	api.createNamedPeriod(writer, request, "праздник", api.store.CreateHoliday)
}

func (api *api) createVacation(writer http.ResponseWriter, request *http.Request) {
	api.createNamedPeriod(writer, request, "отпуск или каникулы", api.store.CreateVacation)
}

func (api *api) createNamedPeriod(
	writer http.ResponseWriter,
	request *http.Request,
	kind string,
	create func(context.Context, calendarstore.Holiday) (calendarstore.Holiday, error),
) {
	var holiday calendarstore.Holiday
	decoder := json.NewDecoder(http.MaxBytesReader(writer, request.Body, 64<<10))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&holiday); err != nil {
		writeError(writer, http.StatusBadRequest, "invalid_json", "Некорректное тело запроса")
		return
	}
	holiday.Title = strings.TrimSpace(holiday.Title)
	if holiday.Title == "" || len([]rune(holiday.Title)) > 200 {
		writeError(writer, http.StatusBadRequest, "invalid_title", "Название должно содержать от 1 до 200 символов")
		return
	}
	if !validatePeriod(writer, holiday.Date, holiday.EndDate) {
		return
	}

	holiday, err := create(request.Context(), holiday)
	if err != nil {
		slog.Error("создание календарного периода", "kind", kind, "error", err)
		writeError(writer, http.StatusInternalServerError, "internal_error", "Не удалось сохранить запись")
		return
	}
	writeJSON(writer, http.StatusCreated, holiday)
}

func (api *api) deleteHoliday(writer http.ResponseWriter, request *http.Request) {
	api.deleteNamedPeriod(writer, request, "праздник", api.store.DeleteHoliday)
}

func (api *api) deleteVacation(writer http.ResponseWriter, request *http.Request) {
	api.deleteNamedPeriod(writer, request, "отпуск или каникулы", api.store.DeleteVacation)
}

func (api *api) deleteNamedPeriod(
	writer http.ResponseWriter,
	request *http.Request,
	kind string,
	remove func(context.Context, string) error,
) {
	err := remove(request.Context(), request.PathValue("id"))
	if errors.Is(err, calendarstore.ErrNotFound) {
		writeError(writer, http.StatusNotFound, "period_not_found", "Запись не найдена")
		return
	}
	if err != nil {
		slog.Error("удаление календарного периода", "kind", kind, "error", err)
		writeError(writer, http.StatusInternalServerError, "internal_error", "Не удалось удалить запись")
		return
	}
	writer.WriteHeader(http.StatusNoContent)
}

func decodeEvent(writer http.ResponseWriter, request *http.Request) (calendarstore.Event, bool) {
	var event calendarstore.Event
	decoder := json.NewDecoder(http.MaxBytesReader(writer, request.Body, 64<<10))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&event); err != nil {
		writeError(writer, http.StatusBadRequest, "invalid_json", "Некорректное тело запроса")
		return event, false
	}
	event.Title = strings.TrimSpace(event.Title)
	if event.Title == "" || len([]rune(event.Title)) > 200 {
		writeError(writer, http.StatusBadRequest, "invalid_title", "Название должно содержать от 1 до 200 символов")
		return event, false
	}
	if !validatePeriod(writer, event.Date, event.EndDate) {
		return event, false
	}
	if event.TimeZone == "" {
		event.TimeZone = "Europe/Moscow"
	}
	if _, err := time.LoadLocation(event.TimeZone); err != nil {
		writeError(writer, http.StatusBadRequest, "invalid_time_zone", "Укажите корректный IANA time zone")
		return event, false
	}
	return event, true
}

func validatePeriod(writer http.ResponseWriter, startValue, endValue string) bool {
	start, err := parseDate(startValue)
	if err != nil {
		writeError(writer, http.StatusBadRequest, "invalid_date", "Начальная дата должна иметь формат YYYY-MM-DD")
		return false
	}
	if endValue == "" {
		return true
	}
	end, err := parseDate(endValue)
	if err != nil || end.Before(start) {
		writeError(writer, http.StatusBadRequest, "invalid_end_date", "Конечная дата должна быть не раньше начальной")
		return false
	}
	if end.Sub(start) > 366*24*time.Hour {
		writeError(writer, http.StatusBadRequest, "period_too_long", "Период не может быть длиннее 366 дней")
		return false
	}
	return true
}

func parseDate(value string) (time.Time, error) {
	if value == "" {
		return time.Time{}, errors.New("дата не указана")
	}
	return time.Parse("2006-01-02", value)
}

func writeJSON(writer http.ResponseWriter, status int, value any) {
	writer.Header().Set("Content-Type", "application/json; charset=utf-8")
	writer.WriteHeader(status)
	if err := json.NewEncoder(writer).Encode(value); err != nil {
		slog.Error("запись JSON", "error", err)
	}
}

func writeError(writer http.ResponseWriter, status int, code, message string) {
	writeJSON(writer, status, map[string]any{"error": map[string]string{"code": code, "message": message}})
}

func logMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		started := time.Now()
		next.ServeHTTP(writer, request)
		slog.Info("HTTP request", "method", request.Method, "path", request.URL.Path, "duration", time.Since(started))
	})
}

func recoverMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				slog.Error("panic", "value", recovered)
				writeError(writer, http.StatusInternalServerError, "internal_error", "Внутренняя ошибка")
			}
		}()
		next.ServeHTTP(writer, request)
	})
}
