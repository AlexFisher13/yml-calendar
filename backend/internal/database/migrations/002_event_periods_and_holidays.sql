ALTER TABLE calendar_days
    ADD COLUMN end_day date,
    ADD COLUMN title varchar(200);

UPDATE calendar_days
SET end_day = day,
    title = CASE kind
        WHEN 'holiday' THEN 'Праздничный день'
        ELSE 'Рабочий выходной'
    END;

ALTER TABLE calendar_days
    ALTER COLUMN end_day SET NOT NULL,
    ALTER COLUMN title SET NOT NULL,
    ADD CONSTRAINT calendar_days_range CHECK (end_day >= day);

CREATE INDEX calendar_days_calendar_range_idx
    ON calendar_days(calendar_id, day, end_day);
