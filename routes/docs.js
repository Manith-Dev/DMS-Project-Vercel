// server/routes/docs.js
import express from "express";
import multer from "multer";
import fs from "fs";
import mongoose from "mongoose";
import { body, validationResult } from "express-validator";
import Document from "../models/Document.js";
import { uniqueSafeName } from "../utils/filenames.js";

const router = express.Router();

const uploadDir = process.env.UPLOAD_DIR || "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, uniqueSafeName(uploadDir, file.originalname))
});
const upload = multer({
  storage,
  fileFilter: (_, file, cb) =>
    file.mimetype === "application/pdf" ? cb(null, true) : cb(new Error("PDF files only")),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// ----------- CREATE -----------
router.post("/",
  upload.array("files", 12),
  body("date").notEmpty(),
  body("organization").notEmpty(),
  body("subject").notEmpty(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const doc = await Document.create({
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
        files: (req.files || []).map(f => ({
          originalName: f.originalname,
          path: `/${uploadDir}/${f.filename}`,
          size: f.size
        }))
      });

      res.status(201).json(doc);
    } catch (e) { next(e); }
  }
);

// ----------- READ LIST -----------
router.get("/", async (req, res, next) => {
  try {
    const { q = "", page = 1, limit = 20, type = "", dateFrom = "", dateTo = "" } = req.query;
    const filter = {};

    if (q) {
      filter.$or = [
        { organization: new RegExp(q, "i") },
        { subject: new RegExp(q, "i") },
        { summary: new RegExp(q, "i") }
      ];
    }
    if (type) filter.documentType = type;
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setHours(23,59,59,999); filter.date.$lte = d; }
    }

    const items = await Document.find(filter)
      .sort({ createdAt: -1 })
      .skip((+page - 1) * (+limit))
      .limit(+limit)
      .lean();

    const total = await Document.countDocuments(filter);
    res.json({ items, total, page: +page, limit: +limit });
  } catch (e) { next(e); }
});

// ----------- READ ONE -----------
router.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const doc = await Document.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) { next(e); }
});

// ----------- UPDATE (FIX) -----------
router.put("/:id",
  upload.array("files", 12), // optional new PDFs to append
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

      // Update fields
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

      // Append new files (keep old files)
      const newFiles = (req.files || []).map(f => ({
        originalName: f.originalname,
        path: `/${uploadDir}/${f.filename}`,
        size: f.size
      }));
      if (newFiles.length) {
        existing.files.push(...newFiles);
      }

      const saved = await existing.save();
      res.json(saved);
    } catch (e) { next(e); }
  }
);

// ----------- DELETE -----------
router.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const r = await Document.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
