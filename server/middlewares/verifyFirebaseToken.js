// server/middlewares/verifyFirebaseToken.js
import admin from "../config/firebaseAdmin.js";

/**
 * Reads Authorization: Bearer <idToken> and verifies via Firebase Admin.
 * If Admin isn't initialized (no creds), we bypass to avoid breaking dev.
 */
export default async function verifyFirebaseToken(req, res, next) {
  if (!admin?.apps?.length) return next(); // safe bypass when FB_SA_BASE64 not set

  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Missing token" });

    const decoded = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name || "",
      picture: decoded.picture || "",
    };
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}
