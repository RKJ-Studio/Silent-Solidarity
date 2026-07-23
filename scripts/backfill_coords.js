const { Pool } = require('pg');
(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  const COUNTRY_COORDS = {
    'India': { lat: 20.5937, lng: 78.9629 },
    'United States': { lat: 37.0902, lng: -95.7129 },
    'Canada': { lat: 56.1304, lng: -106.3468 },
    'United Kingdom': { lat: 55.3781, lng: -3.4360 },
    'Australia': { lat: -25.2744, lng: 133.7751 },
    'Germany': { lat: 51.1657, lng: 10.4515 },
    'France': { lat: 46.2276, lng: 2.2137 }
  };

  const STATE_COORDS = {
    'Maharashtra': { lat: 19.7515, lng: 75.7139 },
    'Delhi': { lat: 28.7041, lng: 77.1025 },
    'Karnataka': { lat: 15.3173, lng: 75.7139 },
    'Tamil Nadu': { lat: 11.1271, lng: 78.6569 },
    'Gujarat': { lat: 22.2587, lng: 71.1924 },
    'Uttar Pradesh': { lat: 26.8467, lng: 80.9462 },
    'West Bengal': { lat: 22.9868, lng: 87.8550 },
    'Kerala': { lat: 10.8505, lng: 76.2711 },
    'Punjab': { lat: 31.1471, lng: 75.3412 },
    'Rajasthan': { lat: 27.0238, lng: 74.2179 },
    'California': { lat: 36.7783, lng: -119.4179 },
    'New York': { lat: 40.7128, lng: -74.0060 }
  };

  try {
    const res = await pool.query('SELECT id, country, state FROM candles WHERE latitude_rounded IS NULL OR longitude_rounded IS NULL');
    console.log(`Found ${res.rows.length} candles with missing coordinates.`);

    for (const row of res.rows) {
      let base = STATE_COORDS[row.state] || COUNTRY_COORDS[row.country] || { lat: 20.5937, lng: 78.9629 };
      const jitterLat = Math.round((base.lat + (Math.random() - 0.5) * 0.16) * 100) / 100;
      const jitterLng = Math.round((base.lng + (Math.random() - 0.5) * 0.16) * 100) / 100;

      await pool.query(
        'UPDATE candles SET latitude_rounded = $1, longitude_rounded = $2 WHERE id = $3',
        [jitterLat, jitterLng, row.id]
      );
      console.log(`Updated candle ID ${row.id} (${row.country}/${row.state}) -> lat: ${jitterLat}, lng: ${jitterLng}`);
    }
    console.log('Coordinates backfilled successfully!');
  } catch (err) {
    console.error('Error backfilling coordinates:', err);
  } finally {
    await pool.end();
  }
})();
