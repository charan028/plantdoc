CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS species (
  id TEXT PRIMARY KEY,
  scientific_name TEXT NOT NULL,
  common_names TEXT[] NOT NULL DEFAULT '{}',
  care_difficulty TEXT NOT NULL,
  watering_frequency INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS plants (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  species_id TEXT NOT NULL REFERENCES species(id),
  nickname TEXT NOT NULL,
  image_url TEXT,
  health_status TEXT NOT NULL DEFAULT 'healthy'
);

CREATE TABLE IF NOT EXISTS care_events (
  id UUID PRIMARY KEY,
  plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_plants_user_id ON plants(user_id);
CREATE INDEX IF NOT EXISTS idx_care_events_plant_id ON care_events(plant_id);
CREATE INDEX IF NOT EXISTS idx_care_events_date ON care_events(date DESC);
