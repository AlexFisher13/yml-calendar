# Production на VPS с 1 ГБ RAM

Эти файлы являются проверяемыми шаблонами, а не командой автоматического
деплоя. Production разворачивается только через подтверждённый GitHub Actions
Environment.

## Раскладка

```text
/opt/bro-calendar/releases/<git-sha>/calendar
/opt/bro-calendar/releases/<git-sha>/frontend/
/opt/bro-calendar/current -> releases/<git-sha>
/etc/bro-calendar/backend.env
```

Пользователь `bro-calendar` не получает shell и доступ к каталогу секретов.
Файл `backend.env` имеет права `0600` и не попадает в репозиторий.

## Порядок релиза

1. GitHub Actions собирает Linux-бинарник и frontend.
2. Артефакты загружаются в новый каталог с именем Git SHA.
3. Выполняется `calendar migrate` с production environment file.
4. Symlink `current` атомарно переключается на новый релиз.
5. `bro-calendar.service` перезапускается.
6. Проверяются `/healthz` напрямую и `/api/v1/system/status` через Caddy.

Миграция выполняется до переключения, поэтому каждая production-миграция должна
быть совместима как с предыдущим, так и с новым backend.

## Память

`MemoryMax=128M` ограничивает только Go backend. PostgreSQL настраивается
отдельно через `postgresql-memory.conf`. Перед первым production-запуском нужно
добавить swap 1–2 ГБ, ограничить journald и проверить RSS после создания,
изменения, удаления события, backup и restore.

Для VPS с 768 МБ запуск считается экспериментальным. Рекомендуемый минимум —
1 ГБ RAM.
