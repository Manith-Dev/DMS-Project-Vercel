import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../models/User.js";



const SECRET = process.env.JWT_SECRET || "dev_secret";

// Make a JWT from user
export function sign(user) {
  return jwt.sign(
    { uid: user._id, role: user.role, department: user.department },
    SECRET,
    { expiresIn: "2d" }
  );
}

// Require a valid JWT
export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// POST /api/auth/login
export async function loginHandler(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email & password required" });

  const user = await User.findOne({ email }).lean();
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  return res.json({
    token: sign(user),
    role: user.role,
    department: user.department
  });
}
