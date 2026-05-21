// middleware/auth.middleware.js

/**
 * Mock authorization middleware for MVP.
 * Assigns a mock user to the request automatically.
 */
async function verifyToken(req, res, next) {
  // Graceful local development bypass since Firebase is fully removed for MVP
  req.user = { uid: "mock-dev-farmer", email: "farmer@mock.com" };
  return next();
}

module.exports = { verifyToken };
