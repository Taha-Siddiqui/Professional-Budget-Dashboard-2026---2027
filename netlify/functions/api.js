const serverless = require('serverless-http');
const app = require('../../server/app');

const expressHandler = serverless(app);

/**
 * Netlify's redirect rewrites requests from /api/* to
 * /.netlify/functions/api/*, and that rewritten path is what shows up in
 * event.path here. Our Express routes are defined as /api/login,
 * /api/data, etc. (unchanged from the non-Netlify version), so we just
 * restore the /api/... prefix before handing the request to Express -
 * no route logic anywhere else needs to know it's running on Netlify.
 */
exports.handler = async (event, context) => {
  if (event.path && event.path.startsWith('/.netlify/functions/api')) {
    event.path = event.path.replace('/.netlify/functions/api', '/api');
  }
  return expressHandler(event, context);
};
