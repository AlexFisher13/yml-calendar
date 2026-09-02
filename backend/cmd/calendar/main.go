package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	calendarstore "github.com/fisher/bro-calendar/backend/internal/calendar"
	"github.com/fisher/bro-calendar/backend/internal/database"
	"github.com/fisher/bro-calendar/backend/internal/server"
)

func main() {
	if err := run(); err != nil {
		slog.Error("приложение остановлено", "error", err)
		os.Exit(1)
	}
}

func run() error {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return errors.New("переменная DATABASE_URL обязательна")
	}

	ctx := context.Background()
	pool, err := database.Open(ctx, databaseURL)
	if err != nil {
		return fmt.Errorf("подключение к PostgreSQL: %w", err)
	}
	defer pool.Close()

	command := "serve"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}

	if command == "migrate" {
		return database.Migrate(ctx, pool)
	}
	if command != "serve" {
		return fmt.Errorf("неизвестная команда %q", command)
	}

	address := os.Getenv("HTTP_ADDRESS")
	if address == "" {
		address = ":8080"
	}

	httpServer := &http.Server{
		Addr:              address,
		Handler:           server.New(calendarstore.NewPostgresStore(pool)),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	shutdownContext, stop := signal.NotifyContext(ctx, syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	serverErrors := make(chan error, 1)
	go func() {
		slog.Info("HTTP server запущен", "address", address)
		serverErrors <- httpServer.ListenAndServe()
	}()

	select {
	case err := <-serverErrors:
		if !errors.Is(err, http.ErrServerClosed) {
			return err
		}
	case <-shutdownContext.Done():
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return httpServer.Shutdown(ctx)
	}

	return nil
}
