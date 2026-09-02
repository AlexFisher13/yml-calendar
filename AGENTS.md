# Project rules

## Product

- This repository contains a personal calendar application.
- Preserve the existing YAML calendar prototype until its functionality is migrated.
- Keep user-facing text in Russian unless a task explicitly requires another language.

## Architecture

- Use a modular monolith. Do not introduce microservices.
- Backend: Go 1.24 or newer, standard `net/http` and `pgx`.
- Frontend: React and TypeScript.
- Database: PostgreSQL.
- Apply database schema changes only through ordered SQL migrations embedded in
  the backend migration command.
- Expose backend functionality through a documented REST API.
- Keep the API suitable for both the web client and a future SwiftUI client.
- Store instants in UTC and preserve the user's IANA time zone separately.
- Model all-day events as dates rather than midnight timestamps.
- Prefer the iCalendar RRULE standard for recurring events.

## Repository layout

- `backend/` contains the Go application.
- `frontend/` contains the React web application and PWA.
- `deploy/` contains local and production deployment configuration.
- `docs/` contains product and engineering documentation.
- `.github/workflows/` contains CI/CD workflows.
- The root `index.html`, `favicon.svg`, and `calendar-data-example.yml` are the legacy prototype.

## Required checks

Before completing a code task, run every applicable check:

- Backend unit tests.
- Backend integration tests.
- Backend build.
- Frontend tests.
- Frontend lint.
- Frontend production build.
- Docker Compose configuration validation when deployment files change.

If a check does not exist yet or cannot be run, state that explicitly.

## Documentation

- Update `docs/architecture.md` when component boundaries or data flows change.
- Update `docs/infrastructure.md` when deployment or operational requirements change.
- Record significant technical choices in `docs/decisions.md`.
- Keep `docs/roadmap.md` focused on milestones and `docs/backlog.md` focused on actionable tasks.

## Git workflow

- Never push directly to `main`.
- Create feature branches with the `codex/` prefix unless the user requests another name.
- Use conventional commit messages.
- Do not deploy production directly from a development environment.
- Production deployment must run through an approved GitHub Actions environment.

## Security and production safety

- Never commit secrets or real `.env` files.
- Never print tokens, passwords, or private keys.
- Never delete or rewrite production data.
- Never remove a production volume as part of deployment.
- Use immutable release artifacts identified by the Git commit SHA.
- Back up PostgreSQL and test restoration before the application is considered production-ready.
- Production migrations must be reviewed and backwards compatible with the previously deployed application version.
