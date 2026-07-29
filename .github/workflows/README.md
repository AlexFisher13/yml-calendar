# Workflows

Планируемые процессы:

- `ci.yml` — backend и frontend проверки для pull request;
- `deploy.yml` — сборка образов, публикация в GHCR и подтверждаемый деплой;
- `backup-check.yml` — периодическая проверка восстановления резервной копии.

Production workflow появится только после настройки VPS и GitHub Environment.
