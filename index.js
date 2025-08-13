import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

import Document from "./models/Document.js";
import docsRouter from "./routes/docs.js";

dotenv.config();
const app = express();

// middleware
app.use(morgan("dev"));
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173", // adjust if client runs elsewhere
    credentials: false
  })
);

// static for uploaded PDFs
const uploadDir = process.env.UPLOAD_DIR || "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use(`/${uploadDir}`, express.static(path.join(process.cwd(), uploadDir)));

// connect Mongo
await mongoose.connect(process.env.MONGO_URI);

// health
app.get("/api/health", (_, res) => res.json({ ok: true }));

// ---------- /api/stats (DASHBOARD) ----------
app.get("/api/stats", async (_, res, next) => {
  try {
    const totalDocs = await Document.countDocuments();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const receivedToday = await Document.countDocuments({
      createdAt: { $gte: startOfToday }
    });

    const withFiles = await Document.countDocuments({
      files: { $exists: true, $ne: [] }
    });

    const byType = await Document.aggregate([
      { $group: { _id: "$documentType", count: { $sum: 1 } } },
      { $project: { _id: 0, name: "$_id", value: "$count" } },
      { $sort: { value: -1 } }
    ]);

    res.json({ totalDocs, receivedToday, withFiles, byType });
  } catch (e) {
    next(e);
  }
});

// docs CRUD
app.use("/api/docs", docsRouter);

// error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(400).json({ error: err.message || "Server error" });
});

const port = process.env.PORT || 5001;
app.listen(port, () => console.log(`API on http://localhost:${port}`));
