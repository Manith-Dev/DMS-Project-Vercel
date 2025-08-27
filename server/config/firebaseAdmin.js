// server/config/firebaseAdmin.js
import admin from "firebase-admin";

/**
 * Initialize Firebase Admin using FB_SA_BASE64 (base64 of service-account.json).
 * If not provided, we skip init so the server still runs in dev.
 */
function initFirebaseAdmin() {
  if (admin.apps.length) return admin;

  try {
    const b64 = process.env.FB_SA_BASE64;
    if (!b64) throw new Error("FB_SA_BASE64 not set");

    const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    admin.initializeApp({ credential: admin.credential.cert(json) });
  } catch (_err) {
    // No credentials yet -> do not crash. Middleware will bypass until set.
  }
  return admin;
}

export default initFirebaseAdmin();
