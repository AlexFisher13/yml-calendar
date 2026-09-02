ALTER TABLE calendar_days
    ADD COLUMN id uuid DEFAULT gen_random_uuid();

ALTER TABLE calendar_days
    ALTER COLUMN id SET NOT NULL;

CREATE UNIQUE INDEX calendar_days_id_idx ON calendar_days(id);
