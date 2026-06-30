-- Tabla de analíticas para Radar de Conciertos
CREATE TABLE IF NOT EXISTS analytics (
  id         uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text         NOT NULL,
  concert_id uuid,
  city       text,
  device     text,
  session_id text         NOT NULL,
  user_id    text,
  created_at timestamptz  DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS analytics_created_idx  ON analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_type_idx     ON analytics(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_concert_idx  ON analytics(concert_id) WHERE concert_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS analytics_city_idx     ON analytics(city) WHERE city IS NOT NULL;

ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='analytics' AND policyname='insert_all') THEN
    CREATE POLICY insert_all ON analytics FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='analytics' AND policyname='select_all') THEN
    CREATE POLICY select_all ON analytics FOR SELECT USING (true);
  END IF;
END $$;
