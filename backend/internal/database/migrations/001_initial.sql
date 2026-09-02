CREATE TABLE calendars (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(120) NOT NULL,
    time_zone varchar(64) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO calendars (id, name, time_zone)
VALUES ('00000000-0000-0000-0000-000000000001', 'Личный календарь', 'Europe/Moscow');

CREATE TABLE events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id uuid NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
    title varchar(200) NOT NULL,
    all_day_start date,
    all_day_end date,
    starts_at timestamptz,
    ends_at timestamptz,
    time_zone varchar(64) NOT NULL,
    rrule text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT events_time_mode CHECK (
        (all_day_start IS NOT NULL AND starts_at IS NULL AND ends_at IS NULL)
        OR
        (all_day_start IS NULL AND all_day_end IS NULL AND starts_at IS NOT NULL)
    ),
    CONSTRAINT events_all_day_range CHECK (
        all_day_end IS NULL OR all_day_end >= all_day_start
    ),
    CONSTRAINT events_timed_range CHECK (
        ends_at IS NULL OR ends_at >= starts_at
    )
);

CREATE INDEX events_calendar_all_day_idx ON events(calendar_id, all_day_start)
    WHERE all_day_start IS NOT NULL;
CREATE INDEX events_calendar_starts_at_idx ON events(calendar_id, starts_at)
    WHERE starts_at IS NOT NULL;

CREATE TYPE calendar_day_kind AS ENUM ('holiday', 'working_weekend');

CREATE TABLE calendar_days (
    calendar_id uuid NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
    day date NOT NULL,
    kind calendar_day_kind NOT NULL,
    PRIMARY KEY (calendar_id, day)
);
