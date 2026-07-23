const { Pool } = require('pg');
(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: url,
    ssl: url.includes('supabase') ? { rejectUnauthorized: false } : undefined
  });
  const sql = `
  BEGIN;

  CREATE TABLE IF NOT EXISTS candles (
    id SERIAL PRIMARY KEY,
    display_name text,
    message text,
    country text,
    state text,
    city text,
    latitude_rounded real,
    longitude_rounded real,
    ip_address text,
    is_hidden boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS candles_country_idx ON candles(country);
  CREATE INDEX IF NOT EXISTS candles_state_idx ON candles(state);
  CREATE INDEX IF NOT EXISTS candles_city_idx ON candles(city);
  CREATE INDEX IF NOT EXISTS candles_created_at_idx ON candles(created_at);
  CREATE INDEX IF NOT EXISTS candles_ip_idx ON candles(ip_address);

  CREATE TABLE IF NOT EXISTS voice_votes (
    id SERIAL PRIMARY KEY,
    candle_id integer NOT NULL,
    device_id text NOT NULL,
    vote integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE UNIQUE INDEX IF NOT EXISTS voice_votes_device_candle_idx ON voice_votes (candle_id, device_id);
  CREATE INDEX IF NOT EXISTS voice_votes_candle_idx ON voice_votes (candle_id);

  CREATE TABLE IF NOT EXISTS banned_ips (
    id SERIAL PRIMARY KEY,
    ip_address text NOT NULL UNIQUE,
    reason text,
    banned_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS rate_limits (
    id SERIAL PRIMARY KEY,
    ip_address text NOT NULL UNIQUE,
    count integer NOT NULL DEFAULT 1,
    window_start timestamptz NOT NULL DEFAULT now(),
    last_request timestamptz NOT NULL DEFAULT now()
  );

  COMMIT;
  `;

  try {
    await pool.query(sql);
    console.log('Schema applied successfully');
  } catch (err) {
    console.error('Error applying schema:', err);
    try { await pool.query('ROLLBACK'); } catch(e){}
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
