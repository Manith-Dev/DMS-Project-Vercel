// server/routes/docs.js
import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Document from "../models/Document.js";
import { uniqueSafeName } from "../utils/filenames.js";

const router = Router();

/* ---------------- Windows-safe paths ---------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "..");

const uploadDir = process.env.UPLOAD_DIR || "uploads";
const absUploadDir = path.isAbsolute(uploadDir)
  ? uploadDir
  : path.resolve(serverRoot, uploadDir);

fs.mkdirSync(absUploadDir, { recursive: true });
const webPrefix = `/${path.basename(uploadDir)}`;

/* ---------------- Multer ---------------- */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, absUploadDir),
  filename: (_req, file, cb) =>
    cb(null, uniqueSafeName(absUploadDir, file.originalname)),
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024, files: 12 },
  fileFilter: (_req, file, cb) =>
    file.mimetype === "application/pdf"
      ? cb(null, true)
      : cb(new Error("PDF files only")),
});

const mapFiles = (files = []) =>
  files.map((f) => ({
    originalName: f.originalname,
    filename: f.filename,
    mimetype: f.mimetype,
    size: f.size,
    path: `${webPrefix}/${f.filename}`.replace(/\\/g, "/"),
  }));

/* ---------------- History helpers (strong de-dupe) ---------------- */
const floorToMinute = (d) => {
  const x = new Date(d);
  x.setSeconds(0, 0);
  return +x;
};
const normalizedStep = ({ stage, at, note }) => ({
  stage,
  at: at ? new Date(at) : new Date(),
  note: note || "",
  actorRole: "system",
  actorDept: stage,
});
function pushDedupe(historyArr, step) {
  const arr = Array.isArray(historyArr) ? historyArr : [];
  const keyStage = (step.stage || "").trim();
  const keyAt = floorToMinute(step.at);
  const idx = arr.findIndex(
    (h) => (h.stage || "").trim() === keyStage && floorToMinute(h.at) === keyAt
  );
  if (idx >= 0) {
    if (!arr[idx].note && step.note) arr[idx].note = step.note; // merge note
    return arr;
  }
  arr.push(step);
  return arr;
}

/* ---------------- LIST ---------------- */
router.get("/", async (req, res, next) => {
  try {
    const {
      q = "",
      type = "",
      department = "",
      date = "",
      dateFrom = "",
      dateTo = "",
      stage = "",
      sourceType = "",
      page = "1",
      limit = "10",
    } = req.query;

    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

    const filter = {};
    if (type) filter.documentType = type;
    if (department) filter.department = department;
    if (sourceType) filter.sourceType = sourceType;
    if (stage) filter.stage = stage;

    const df = date || dateFrom;
    const dt = date || dateTo;
    if (df || dt) {
      const start = df ? new Date(df) : new Date("1970-01-01");
      const end = dt ? new Date(dt) : new Date("2999-12-31");
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }

    let query = Document.find(filter).sort({ createdAt: -1 });
    if (q.trim()) {
      query = Document.find({ $text: { $search: q.trim() }, ...filter })
        .select({ score: { $meta: "textScore" } })
        .sort({ score: { $meta: "textScore" }, createdAt: -1 });
    }

    const [items, total] = await Promise.all([
      query.skip((p - 1) * l).limit(l).lean(),
      Document.countDocuments(
        q.trim() ? { $text: { $search: q.trim() }, ...filter } : filter
      ),
    ]);
    res.json({ page: p, limit: l, total, items });
  } catch (e) {
    next(e);
  }
});

/* ---------------- JOURNEY (before "/:id") ---------------- */
router.get("/:id/journey", async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Document not found" });

    // collapse duplicates by (stage, minute)
    const byKey = new Map();
    for (const h of doc.history || []) {
      const key = `${(h.stage || "").trim()}|${floorToMinute(h.at)}`;
      const prev = byKey.get(key);
      if (!prev || (!prev.note && h.note)) byKey.set(key, h);
    }
    const items = [...byKey.values()].sort(
      (a, b) => +new Date(a.at) - +new Date(b.at)
    );

    res.json({ items, history: items });
  } catch (e) {
    next(e);
  }
});

/* ---------------- GET ONE ---------------- */
router.get("/:id", async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Document not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

/* ---------------- CREATE ---------------- */
router.post("/", upload.array("files"), async (req, res, next) => {
  try {
    const b = req.body || {};
    const payload = {
      date: b.date ? new Date(b.date) : new Date(),
      organization: b.organization || "",
      department: b.department || "", // <<<<<< IMPORTANT
      subject: b.subject || "",
      summary: b.summary || "",
      priority: b.priority || "Normal",
      confidential: !!(b.confidential === "true" || b.confidential === true),
      documentType: b.documentType || "",
      sourceType: b.sourceType || "incoming",

      fromDept: b.fromDept || "",
      sentDate: b.sentDate ? new Date(b.sentDate) : null,

      receivedAt: b.receivedAt || "",
      receivedDate: b.receivedDate ? new Date(b.receivedDate) : null,

      toDept: b.toDept || "",
      forwardedDate: b.forwardedDate ? new Date(b.forwardedDate) : null,

      routeNote: b.routeNote || "",
      files: mapFiles(req.files),
    };

    const doc = new Document(payload);

    // seed history (strong de-dupe)
    doc.history = [];

    // from internal routing fields (if present)
    if (payload.fromDept)
      doc.history = pushDedupe(
        doc.history,
        normalizedStep({
          stage: payload.fromDept,
          at: payload.sentDate || payload.date,
          note: payload.routeNote,
        })
      );
    if (payload.receivedAt)
      doc.history = pushDedupe(
        doc.history,
        normalizedStep({
          stage: payload.receivedAt,
          at: payload.receivedDate || payload.date,
          note: payload.routeNote,
        })
      );
    if (payload.toDept)
      doc.history = pushDedupe(
        doc.history,
        normalizedStep({
          stage: payload.toDept,
          at: payload.forwardedDate || payload.date,
          note: payload.routeNote,
        })
      );

    // NEW: for INCOMING (non-outgoing), treat selected department as initial stage
    if (payload.sourceType !== "outgoing" && payload.department) {
      doc.history = pushDedupe(
        doc.history,
        normalizedStep({
          stage: payload.department,
          at: payload.date,
          note: payload.routeNote,
        })
      );
    }

    if (doc.history.length)
      doc.stage = doc.history[doc.history.length - 1].stage;

    await doc.save();
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

/* ---------------- UPDATE (meta & add files) ---------------- */
router.put("/:id", upload.array("files"), async (req, res, next) => {
  try {
    const b = req.body || {};
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const set = (k, v) => {
      if (v !== undefined) doc[k] = v;
    };

    set("date", b.date ? new Date(b.date) : doc.date);
    set("organization", b.organization);
    set("department", b.department); // <<<<<< allow changing department too
    set("subject", b.subject);
    set("summary", b.summary);
    set("priority", b.priority);
    set("confidential", b.confidential === "true" || b.confidential === true);
    set("documentType", b.documentType);
    set("sourceType", b.sourceType);

    set("fromDept", b.fromDept);
    set("sentDate", b.sentDate ? new Date(b.sentDate) : doc.sentDate);
    set("receivedAt", b.receivedAt);
    set(
      "receivedDate",
      b.receivedDate ? new Date(b.receivedDate) : doc.receivedDate
    );
    set("toDept", b.toDept);
    set(
      "forwardedDate",
      b.forwardedDate ? new Date(b.forwardedDate) : doc.forwardedDate
    );
    set("routeNote", b.routeNote);

    const newFiles = mapFiles(req.files);
    if (newFiles.length) doc.files = (doc.files || []).concat(newFiles);

    await doc.save();
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

/* ---------------- DELETE ---------------- */
router.delete("/:id", async (req, res, next) => {
  try {
    const doc = await Document.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* ---------------- DOWNLOAD ---------------- */
router.get("/:id/files/:index/download", async (req, res, next) => {
  try {
    const { id, index } = req.params;
    const doc = await Document.findById(id).lean();
    if (!doc) return res.status(404).json({ error: "Document not found" });
    const i = parseInt(index, 10);
    if (!Array.isArray(doc.files) || isNaN(i) || i < 0 || i >= doc.files.length)
      return res.status(404).json({ error: "File not found" });

    const f = doc.files[i];
    const filename = f.filename || path.basename(f.path || "");
    const fullpath = path.join(absUploadDir, filename);
    if (!fs.existsSync(fullpath))
      return res.status(404).json({ error: "File missing on server" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(f.originalName || filename)}"`
    );
    fs.createReadStream(fullpath).pipe(res);
  } catch (e) {
    next(e);
  }
});

/* ---------------- MOVE STAGE (append to history with de-dupe) ---------------- */
router.put("/:id/stage", async (req, res, next) => {
  try {
    const { stage, note, at } = req.body || {};
    if (!stage) return res.status(400).json({ error: "stage is required" });

    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const step = normalizedStep({ stage, at, note });
    doc.history = pushDedupe(doc.history, step);
    doc.stage = stage;

    await doc.save();
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

export default router;
