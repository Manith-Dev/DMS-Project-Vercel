// server/index.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import docsRouter from "./routes/docs.js";
import verifyFirebaseToken from "./middlewares/verifyFirebaseToken.js";
import Document from "./models/Document.js";

dotenv.config();
const app = express();

/* ----------- Windows-safe __dirname ----------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ----------- Middleware ----------- */
app.use(morgan("dev"));           // log each request
app.use(express.json());
app.use(cors());                  // easiest for first deploy

/* ----------- Static uploads dir (Windows safe) ----------- */
const uploadDir = process.env.UPLOAD_DIR || "uploads";
const absUploadDir = path.isAbsolute(uploadDir)
  ? uploadDir
  : path.join(__dirname, uploadDir);
fs.mkdirSync(absUploadDir, { recursive: true });
app.use(`/${path.basename(absUploadDir)}`, express.static(absUploadDir));

/* ----------- DB ----------- */
try {
  if (!process.env.MONGO_URI) {
    console.warn("⚠️  MONGO_URI is not set");
  } else {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");
  }
} catch (err) {
  console.error("❌ MongoDB connection error:", err?.message || err);
  // keep server running so health endpoints still work
}

/* ----------- Simple root page ----------- */
app.get("/", (_req, res) => {
  res.send(
    `<h1>API is running</h1>
     <p>Try <a href="/api/health">/api/health</a> or <a href="/health">/health</a></p>`
  );
});

/* ----------- Health endpoints ----------- */
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/health", (_req, res) => res.json({ ok: true }));

/* ----------- Stats (optional; keep) ----------- */
app.get("/api/stats", async (req, res, next) => {
  try {
    const { sourceType = "" } = req.query;
    const baseMatch = {};
    if (sourceType) baseMatch.sourceType = sourceType;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalDocs, receivedToday, withFiles, byType] = await Promise.all([
      Document.countDocuments(baseMatch),
      Document.countDocuments({ ...baseMatch, createdAt: { $gte: startOfToday } }),
      Document.countDocuments({ ...baseMatch, files: { $exists: true, $ne: [] } }),
      Document.aggregate([
        { $match: baseMatch },
        { $group: { _id: "$documentType", count: { $sum: 1 } } },
        { $project: { _id: 0, name: "$_id", value: "$count" } },
        { $sort: { value: -1 } },
      ]),
    ]);

    res.json({ totalDocs, receivedToday, withFiles, byType });
  } catch (e) {
    next(e);
  }
});

/* ----------- Protected docs routes ----------- */
app.use("/api/docs", verifyFirebaseToken, docsRouter);

/* ----------- 404 + error handlers ----------- */
app.use((req, res) => {
  res.status(404).send(`Not Found: ${req.method} ${req.originalUrl}`);
});
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(400).json({ error: err?.message || "Server error" });
});

/* ----------- List registered routes (diagnostic) ----------- */
function listRoutes() {
  const routes = [];
  app._router.stack.forEach((m) => {
    if (m.route && m.route.path) {
      const methods = Object.keys(m.route.methods).join(",").toUpperCase();
      routes.push(`${methods} ${m.route.path}`);
    }
  });
  console.log("📜 Registered routes:\n" + routes.map(r => " - " + r).join("\n"));
}

/* ----------- Start server ----------- */
const port = process.env.PORT || 5001;
app.listen(port, () => {
  console.log(`🚀 API listening on http://localhost:${port}`);
  listRoutes();
});
