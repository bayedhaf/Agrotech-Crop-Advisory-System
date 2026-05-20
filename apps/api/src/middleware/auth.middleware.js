const { admin, firebaseInitialized } = require("../../confi/firebase");

/**
 * Verifies Firebase ID token sent in Authorization: Bearer <token> header.
 * Attaches decoded token as req.user on success.
 */
async function verifyToken(req, res, next) {
  // Graceful local development bypass if Firebase is not initialized
  if (!firebaseInitialized) {
    req.user = { uid: "mock-dev-farmer", email: "farmer@mock.com" };
    return next();
  }

  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, error: { code: "MISSING_TOKEN", message: "Authorization token required" } });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, error: { code: "INVALID_TOKEN", message: "Invalid or expired token" } });
  }
}

module.exports = { verifyToken };
