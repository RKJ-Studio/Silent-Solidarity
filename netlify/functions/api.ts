import serverless from 'serverless-http';
import app from '../../artifacts/api-server/src/app';

// Netlify's /api rewrite preserves the browser path for Express, so the app's
// existing app.use('/api', router) configuration continues to work unchanged.
export const handler = serverless(app);
