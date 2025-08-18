// server/routes/docs.js
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { body, validationResult } from "express-validator";
import Document from "../models/Document.js";
import { uniqueSafeName } from "../utils/filenames.js";
// import { requireAuth } from "../Auth/auth.js"; // keep for later auth

const router = express.Router();

const uploadDir = process.env.UPLOAD_DIR || "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// latin1 → utf8 (Khmer filename safety)
const decodeLatin1 = (s) => Buffer.from(String(s), "latin1").toString("utf8");

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const decoded = decodeLatin1(file.originalname);
    cb(null, uniqueSafeName(uploadDir, decoded));
  },
});
const upload = multer({
  storage,
  fileFilter: (_, file, cb) =>
    file.mimetype === "application/pdf" ? cb(null, true) : cb(new Error("PDF files only")),
  limits: { fileSize: 50 * 1024 * 1024 },
});

/* ---------------- CREATE ---------------- */
router.post(
  "/",
  upload.array("files", 12),
  body("date").notEmpty(),
  body("organization").notEmpty(),
  body("subject").notEmpty(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const doc = await Document.create({
        // core
        date: req.body.date,
        organization: req.body.organization,
        subject: req.body.subject,
        summary: req.body.summary,
        remarks: req.body.remarks,
        category: req.body.category,
        sector: req.body.sector,
        department: req.body.department,
        province: req.body.province,
        district: req.body.district,
        priority: req.body.priority,
        confidential: req.body.confidential === "true" || req.body.confidential === true,
        documentType: req.body.documentType,
        files: (req.files || []).map((f) => ({
          originalName: decodeLatin1(f.originalname),
          path: `/${uploadDir}/${f.filename}`,
          size: f.size,
        })),

        // source
        sourceType: req.body.sourceType,

        // 3-step routing
        fromDept: req.body.fromDept,
        sentDate: req.body.sentDate,

        receivedAt: req.body.receivedAt,
        receivedDate: req.body.receivedDate,

        toDept: req.body.toDept,
        forwardedDate: req.body.forwardedDate,

        routeNote: req.body.routeNote,
      });

      // Optional: if outgoing & toDept provided, set stage + history now
      if (doc.sourceType === "outgoing" && doc.toDept) {
        doc.stage = doc.toDept;
        doc.history = doc.history || [];
        doc.history.push({
          stage: doc.toDept,
          at: new Date(),
          note: doc.routeNote || "Dispatched",
          actorRole: "system",
          actorDept: doc.fromDept || "នាយកដ្ឋានរដ្ឋបាលសរុប",
        });
        await doc.save();
      }

      res.status(201).json(doc);
    } catch (e) {
      next(e);
    }
  }
);

/* ---------------- LIST ---------------- */
router.get("/", async (req, res, next) => {
  try {
    const {
      q = "",
      page = 1,
      limit = 20,
      type = "",
      department = "",
      stage = "",
      sourceType = "",
      dateFrom = "",
      dateTo = "",
    } = req.query;

    const filter = {};

    if (q) {
      filter.$or = [
        { organization: new RegExp(q, "i") },
        { subject: new RegExp(q, "i") },
        { summary: new RegExp(q, "i") },
      ];
    }
    if (type) filter.documentType = type;
    if (department) filter.department = department;
    if (stage) filter.stage = stage;
    if (sourceType) filter.sourceType = sourceType;

    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        filter.date.$lte = d;
      }
    }

    const items = await Document.find(filter)
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .lean();

    const total = await Document.countDocuments(filter);
    res.json({ items, total, page: +page, limit: +limit });
  } catch (e) {
    next(e);
  }
});

/* ---------------- READ ONE ---------------- */
router.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const doc = await Document.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

/* ---------------- UPDATE ---------------- */
router.put(
  "/:id",
  upload.array("files", 12),
  body("date").notEmpty(),
  body("organization").notEmpty(),
  body("subject").notEmpty(),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid id" });
      }
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const existing = await Document.findById(id);
      if (!existing) return res.status(404).json({ error: "Not found" });

      // core
      existing.date = req.body.date;
      existing.organization = req.body.organization;
      existing.subject = req.body.subject;
      existing.summary = req.body.summary ?? existing.summary;
      existing.remarks = req.body.remarks ?? existing.remarks;
      existing.category = req.body.category ?? existing.category;
      existing.sector = req.body.sector ?? existing.sector;
      existing.department = req.body.department ?? existing.department;
      existing.province = req.body.province ?? existing.province;
      existing.district = req.body.district ?? existing.district;
      existing.priority = req.body.priority ?? existing.priority;
      existing.documentType = req.body.documentType ?? existing.documentType;
      existing.confidential = req.body.confidential === "true" || req.body.confidential === true;

      // source / 3-step fields
      existing.sourceType = req.body.sourceType ?? existing.sourceType;

      existing.fromDept = req.body.fromDept ?? existing.fromDept;
      existing.sentDate = req.body.sentDate ?? existing.sentDate;

      existing.receivedAt = req.body.receivedAt ?? existing.receivedAt;
      existing.receivedDate = req.body.receivedDate ?? existing.receivedDate;

      existing.toDept = req.body.toDept ?? existing.toDept;
      existing.forwardedDate = req.body.forwardedDate ?? existing.forwardedDate;

      existing.routeNote = req.body.routeNote ?? existing.routeNote;

      // files to append
      const newFiles = (req.files || []).map((f) => ({
        originalName: decodeLatin1(f.originalname),
        path: `/${uploadDir}/${f.filename}`,
        size: f.size,
      }));
      if (newFiles.length) existing.files.push(...newFiles);

      const saved = await existing.save();
      res.json(saved);
    } catch (e) {
      next(e);
    }
  }
);

/* ---------------- DELETE ---------------- */
router.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const r = await Document.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* ---------------- DOWNLOAD FILE ---------------- */
router.get("/:id/files/:index/download", async (req, res, next) => {
  try {
    const { id, index } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const doc = await Document.findById(id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });

    const i = Number(index);
    if (!Number.isInteger(i) || i < 0 || i >= (doc.files?.length || 0)) {
      return res.status(400).json({ error: "Invalid file index" });
    }

    const f = doc.files[i];
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const rel = String(f.path || "").replace(/^\//, "");
    const abs = path.join(__dirname, "..", rel);

    if (!fs.existsSync(abs)) {
      return res.status(404).json({ error: "File not found" });
    }

    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    return res.download(abs, f.originalName || path.basename(abs));
  } catch (e) {
    next(e);
  }
});

/* ---------------- STAGE UPDATE (kept for future auth) ---------------- */
// For now you can comment requireAuth if not using auth yet
router.put("/:id/stage", /* requireAuth, */ async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage, note = "" } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id" });
    if (!stage) return res.status(400).json({ error: "stage required" });

    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ error: "Not found" });

    const fromStage = doc.stage || "";
    const toStage = stage;

    if (fromStage !== toStage || note) {
      doc.stage = toStage;
      doc.history = doc.history || [];
      doc.history.push({
        stage: toStage,
        at: new Date(),
        note,
        actorRole: "system",               // when auth is added, fill from req.user
        actorDept: doc.fromDept || "នាយកដ្ឋានរដ្ឋបាលសរុប",
      });
    }

    await doc.save();
    res.json({ ok: true, stage: doc.stage, history: doc.history });
  } catch (e) {
    next(e);
  }
});

// GET /api/docs/:id/journey
router.get("/:id/journey", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const doc = await Document.findById(id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });

    // history is already chronological in your code, but sort just in case
    const hist = Array.isArray(doc.history) ? [...doc.history].sort((a, b) =>
      new Date(a.at) - new Date(b.at)
    ) : [];

    // build a friendly journey list
    const journey = [];
    // 0) created
    journey.push({
      type: "created",
      stage: doc.stage || (hist[0]?.stage ?? ""),
      note: doc.subject || "",
      at: doc.createdAt || hist[0]?.at || doc.date,
      actor: "system"
    });

    // 1) every history change becomes a step
    for (const h of hist) {
      journey.push({
        type: "stageChanged",
        stage: h.stage,
        note: h.note || "",
        at: h.at,
        actor: h.actorDept ? `${h.actorDept} (${h.actorRole || "—"})` : (h.actorRole || "—")
      });
    }

    // 2) completed (optional)
    if (doc.status === "Completed" || doc.completedAt) {
      journey.push({
        type: "completed",
        stage: doc.stage,
        note: "បានបញ្ចប់",
        at: doc.completedAt || hist[hist.length - 1]?.at || new Date(),
        actor: "system"
      });
    }

    res.json({
      _id: doc._id,
      subject: doc.subject,
      date: doc.date,
      currentStage: doc.stage,
      status: doc.status || "InProgress",
      journey
    });
  } catch (e) { next(e); }
});


export default router;
