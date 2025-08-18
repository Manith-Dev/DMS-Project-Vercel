// server/models/Document.js
import mongoose from "mongoose";

/* ---------- Sub-schemas ---------- */
const FileSchema = new mongoose.Schema(
  { originalName: String, path: String, size: Number },
  { _id: false }
);

const HistorySchema = new mongoose.Schema(
  {
    stage: String,
    at: { type: Date, default: Date.now },
    note: String,
    actorRole: String,
    actorDept: String,
  },
  { _id: false }
);

/* ---------- Main schema ---------- */
const DocumentSchema = new mongoose.Schema(
  {
    // Core fields
    date: { type: Date, required: true },
    organization: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    summary: String,
    remarks: String,
    category: String,
    sector: String,
    department: String,
    province: String,
    district: String,
    priority: { type: String, enum: ["Low", "Normal", "High"], default: "Normal" },
    confidential: { type: Boolean, default: false },
    documentType: {
      type: String,
      enum: [
        "កំណត់បង្ហាញ",
        "កំណត់ហេតុ",
        "របាយការណ៍",
        "របាយការណ៍លទ្ធផលអង្កេត",
        "សំណើរសុំគោលការណ៍",
        "សំណើរសុំគោលការណ៍អង្កេត",
      ],
      required: true,
    },
    files: [FileSchema],

    // Source type
    sourceType: {
      type: String,
      enum: ["incoming", "outgoing"],
      default: "incoming",
      index: true,
    },

    // Stage + audit
    stage: { type: String, default: "" },
    history: [HistorySchema],

    // Optional workflow status/route
    status: { type: String, enum: ["InProgress", "Completed"], default: "InProgress", index: true },
    plannedRoute: { type: [String], default: [] },
    routeIndex: { type: Number, default: 0 },
    completedAt: { type: Date, default: null },

    // 3-step routing (outgoing compose form)
    fromDept: String,
    sentDate: Date,

    receivedAt: String,
    receivedDate: Date,

    toDept: String,
    forwardedDate: Date,

    routeNote: String,
  },
  { timestamps: true }
);

DocumentSchema.index({ date: -1 });
DocumentSchema.index({ organization: 1 });
DocumentSchema.index({ subject: "text", summary: "text" });

export default mongoose.model("Document", DocumentSchema);
