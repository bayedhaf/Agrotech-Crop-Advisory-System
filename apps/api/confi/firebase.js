const admin = require("firebase-admin");
require("dotenv").config();

let db;
let firebaseInitialized = false;

try {
  let serviceAccount;
  if (process.env.NODE_ENV === 'production') {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  } else {
    try {
      serviceAccount = require("./serviceAccountKey.json");
    } catch {
      // Fallback if local file is missing: check env or use mock
      if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
        serviceAccount = {
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
        };
      } else {
        throw new Error("No serviceAccountKey.json found and environment variables are not set");
      }
    }
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  db = admin.firestore();
  firebaseInitialized = true;
  console.log("🔥 Firebase Admin SDK initialized successfully.");
} catch (err) {
  console.warn("⚠️ Firebase Admin SDK initialization bypassed (credentials missing or invalid). Firestore calls will be stubbed.", err.message);
  
  // Provide a stubbed Firestore db object to prevent route registration or basic handlers from crashing
  db = {
    collection: () => ({
      limit: () => ({
        get: () => Promise.reject(new Error("Firebase is not initialized (stubbed db)")),
      }),
      doc: () => ({
        get: () => Promise.reject(new Error("Firebase is not initialized (stubbed db)")),
        set: () => Promise.reject(new Error("Firebase is not initialized (stubbed db)")),
        update: () => Promise.reject(new Error("Firebase is not initialized (stubbed db)")),
      }),
    }),
  };
}

module.exports = { admin, db, firebaseInitialized };