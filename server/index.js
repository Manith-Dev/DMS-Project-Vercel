// server/index.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import Document from "./models/Document.js";
import docsRouter from "./routes/docs.js";
import { loginHandler } from "./Auth/auth.js"; // if unused, you can remove this import
import verifyFirebaseToken from "./middlewares/verifyFirebaseToken.js"; // ✅ NEW

dotenv.config();
const app = express();

/* ----------- Windows-safe __dirname ----------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ----------- Middleware ----------- */
app.use(morgan("dev"));
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: false,
  })
);

/* ----------- Static uploads dir (Windows safe) ----------- */
const uploadDir = process.env.UPLOAD_DIR || "uploads";
const absUploadDir = path.isAbsolute(uploadDir)
  ? uploadDir
  : path.join(__dirname, uploadDir);
fs.mkdirSync(absUploadDir, { recursive: true });
app.use(`/${path.basename(absUploadDir)}`, express.static(absUploadDir));

/* ----------- DB ----------- */
await mongoose.connect(process.env.MONGO_URI);

/* ----------- Health ----------- */
app.get("/api/health", (_, res) => res.json({ ok: true }));

/* ----------- Stats (supports ?sourceType=incoming|outgoing) ----------- */
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

/* ----------- Routers ----------- */
app.use("/api/docs", verifyFirebaseToken, docsRouter); // ✅ protected

/* ----------- Error handler ----------- */
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(400).json({ error: err.message || "Server error" });
});

// ---------- /api/stats (your duplicated versions kept as-is) ----------
app.get("/api/stats", async (_, res, next) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const totalDocs = await Document.countDocuments();
    const receivedToday = await Document.countDocuments({ createdAt: { $gte: startOfToday } });
    const withFiles = await Document.countDocuments({ files: { $exists: true, $ne: [] } });
    const byType = await Document.aggregate([
      { $group: { _id: "$documentType", count: { $sum: 1 } } },
      { $project: { _id: 0, name: "$_id", value: "$count" } },
      { $sort: { value: -1 } },
    ]);

    const outgoingMatch = { sourceType: "outgoing" };
    const outgoingTotal = await Document.countDocuments(outgoingMatch);
    const outgoingToday = await Document.countDocuments({
      ...outgoingMatch,
      createdAt: { $gte: startOfToday },
    });
    const outgoingThisMonth = await Document.countDocuments({
      ...outgoingMatch,
      createdAt: { $gte: startOfMonth },
    });
    const outgoingByToDept = await Document.aggregate([
      { $match: outgoingMatch },
      { $group: { _id: "$toDept", count: { $sum: 1 } } },
      { $project: { _id: 0, name: { $ifNull: ["$_id", "—"] }, value: "$count" } },
      { $sort: { value: -1 } },
    ]);

    res.json({
      totalDocs,
      receivedToday,
      withFiles,
      byType,
      outgoingTotal,
      outgoingToday,
      outgoingThisMonth,
      outgoingByToDept,
    });
  } catch (e) {
    next(e);
  }
});

app.get("/api/stats", async (_req, res, next) => {
  try {
    const totalDocs = await Document.countDocuments();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const receivedToday = await Document.countDocuments({
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    });

    const withFiles = await Document.countDocuments({
      files: { $exists: true, $ne: [] },
    });

    const byType = await Document.aggregate([
      { $group: { _id: "$documentType", count: { $sum: 1 } } },
      { $project: { _id: 0, name: "$_id", value: "$count" } },
      { $sort: { value: -1 } },
    ]);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    const outgoingTotal = await Document.countDocuments({ sourceType: "outgoing" });
    const outgoingToday = await Document.countDocuments({
      sourceType: "outgoing",
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    });
    const outgoingThisMonth = await Document.countDocuments({
      sourceType: "outgoing",
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    });

    res.json({
      totalDocs,
      receivedToday,
      withFiles,
      byType,
      outgoingTotal,
      outgoingToday,
      outgoingThisMonth,
    });
  } catch (e) {
    next(e);
  }
});

/* ---------- Optional auth test route ---------- */
app.get("/api/auth/me", verifyFirebaseToken, (req, res) => {
  res.json({ user: req.user || null });
});

const port = process.env.PORT || 5001;
app.listen(port, () => console.log(`API on http://localhost:${port}`));
