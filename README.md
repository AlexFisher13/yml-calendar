# Bro Calendar

Персональный календарь с непрерывным многомесячным представлением.

Проект постепенно переносится из автономного YAML-прототипа в приложение:

- Java 21 и Spring Boot;
- React и TypeScript;
- PostgreSQL и Liquibase;
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

## Запуск без Docker

Для разработки компоненты также можно запускать отдельно:

```bash
docker compose -f deploy/compose.yml up -d postgres

cd backend
./mvnw spring-boot:run

cd ../frontend
nvm use
npm install
npm run dev
```

При таком запуске frontend доступен на `http://localhost:5173`. Для него нужен
Node.js 24 или новее.
