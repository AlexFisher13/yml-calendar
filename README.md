# Bro Calendar

Персональный календарь с непрерывным многомесячным представлением.

Проект постепенно переносится из автономного YAML-прототипа в приложение:

- Go;
- React и TypeScript;
- PostgreSQL и встроенные SQL-миграции;
- PWA, а в будущем — SwiftUI-клиент.

## Структура

- `backend/` — REST API.
- `frontend/` — веб-приложение.
- `deploy/` — локальная и будущая production-инфраструктура.
- `docs/` — продуктовая и инженерная документация.
- `index.html` — исходный прототип, сохраняемый на время миграции.

## Локальный запуск

Запусти Docker Desktop, затем из корня проекта выполни:

```bash
docker compose -f deploy/compose.yml up --build
```

Приложение: `http://localhost:8080`.

Проверка backend через frontend proxy:
`http://localhost:8080/api/v1/system/status`.

Остановить приложение можно через `Ctrl+C`. Для фонового запуска используй:

```bash
docker compose -f deploy/compose.yml up -d --build
```

Логи и остановка фоновых контейнеров:

```bash
docker compose -f deploy/compose.yml logs -f
docker compose -f deploy/compose.yml down
```

Команда `down` не удаляет PostgreSQL volume. Не используй `down -v`, если нужно
сохранить данные.

## Запуск frontend без Docker

Для работы с frontend без локального Go можно поднять PostgreSQL и backend в
Docker, а Vite запустить на хосте:

```bash
docker compose -f deploy/compose.yml up -d postgres migrate backend

cd frontend
nvm use
npm install
npm run dev
```

При таком запуске frontend доступен на `http://localhost:5173`. Для него нужен
Node.js 24 или новее. Backend использует Go 1.24 или новее и применяет
встроенные SQL-миграции отдельной командой `calendar migrate`.
