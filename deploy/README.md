# Docker Compose

Docker Compose запускает всё приложение:

- PostgreSQL;
- Spring Boot backend;
- React frontend в Nginx.

Из корня репозитория:

```bash
docker compose -f deploy/compose.yml up --build
```

После запуска приложение доступно на `http://localhost:8080`.

Для фонового запуска:

```bash
docker compose -f deploy/compose.yml up -d --build
```

Посмотреть логи:

```bash
docker compose -f deploy/compose.yml logs -f
```

Остановить контейнеры:

```bash
docker compose -f deploy/compose.yml down
```

Команда `down` сохраняет данные PostgreSQL. Не добавляйте `-v`, если не хотите
удалить локальную базу.

Значения для локальной разработки определены в `compose.yml`. Файл
`env.example` показывает доступные настройки и не должен содержать настоящие
production-секреты.
