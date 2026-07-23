const { Pool } = require('pg');

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  const candles = [
    {
      displayName: 'Aarav Sharma',
      message: 'Demanding transparency, justice, and a better future for every hard-working student.',
      country: 'India',
      state: 'Maharashtra',
      city: 'Mumbai',
      latitudeRounded: 19.08,
      longitudeRounded: 72.88
    },
    {
      displayName: 'Ananya Deshmukh',
      message: 'We stand united for fair examination systems, institutional merit, and youth empowerment.',
      country: 'India',
      state: 'Maharashtra',
      city: 'Pune',
      latitudeRounded: 18.52,
      longitudeRounded: 73.86
    },
    {
      displayName: 'Rohan Patil',
      message: 'Our voices cannot be silenced. We deserve equal employment opportunities and clean governance.',
      country: 'India',
      state: 'Maharashtra',
      city: 'Nagpur',
      latitudeRounded: 21.15,
      longitudeRounded: 79.09
    },
    {
      displayName: 'Kabir Verma',
      message: 'Standing firm for student rights, mental peace, and real systemic accountability.',
      country: 'India',
      state: 'Delhi',
      city: 'New Delhi',
      latitudeRounded: 28.61,
      longitudeRounded: 77.21
    },
    {
      displayName: 'Priya Malhotra',
      message: 'Quality education is a fundamental right. Lighting this candle for honest structural reform.',
      country: 'India',
      state: 'Delhi',
      city: 'North Delhi',
      latitudeRounded: 28.70,
      longitudeRounded: 77.21
    },
    {
      displayName: 'Devansh Gupta',
      message: 'Gen Z frustration turned into democratic action. We will build a fairer world for all.',
      country: 'India',
      state: 'Delhi',
      city: 'South Delhi',
      latitudeRounded: 28.54,
      longitudeRounded: 77.24
    },
    {
      displayName: 'Sneha Kapoor',
      message: 'For every aspirant spending nights studying against compromised systems. Change is coming.',
      country: 'India',
      state: 'Delhi',
      city: 'West Delhi',
      latitudeRounded: 28.59,
      longitudeRounded: 77.05
    },
    {
      displayName: 'Yash Yadav',
      message: 'Fair paper leaks prevention, employment guarantees, and honest opportunity. We will overcome.',
      country: 'India',
      state: 'Haryana',
      city: 'Gurugram',
      latitudeRounded: 28.46,
      longitudeRounded: 77.03
    },
    {
      displayName: 'Simran Gill',
      message: 'Standing in strong global solidarity from Toronto for student equality and youth rights.',
      country: 'Canada',
      state: 'Ontario',
      city: 'Toronto',
      latitudeRounded: 43.65,
      longitudeRounded: -79.38
    },
    {
      displayName: 'Aditya Mehta',
      message: 'Peaceful protest for a transparent tomorrow. Let the light reach every corner.',
      country: 'India',
      state: 'Maharashtra',
      city: 'Thane',
      latitudeRounded: 19.22,
      longitudeRounded: 72.98
    }
  ];

  try {
    console.log('Resetting existing database entries...');
    await pool.query('TRUNCATE candles, voice_votes RESTART IDENTITY CASCADE;');
    console.log('Database tables cleared successfully.');

    for (const c of candles) {
      await pool.query(
        `INSERT INTO candles (display_name, message, country, state, city, latitude_rounded, longitude_rounded, is_hidden, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())`,
        [c.displayName, c.message, c.country, c.state, c.city, c.latitudeRounded, c.longitudeRounded]
      );
      console.log(`Seeded candle: ${c.displayName} (${c.city}, ${c.state}, ${c.country})`);
    }

    console.log('\nAll 10 realistic protest candles seeded successfully!');
  } catch (err) {
    console.error('Error seeding candles:', err);
  } finally {
    await pool.end();
  }
})();
