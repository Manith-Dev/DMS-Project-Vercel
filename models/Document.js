import mongoose from "mongoose";

const FileSchema = new mongoose.Schema(
  { originalName: String, path: String, size: Number },
  { _id: false }
);

const DocumentSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    organization: { type: String, required: true, trim: true },
    subject: { type: String, required: true },
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
        "សំណើរសុំគោលការណ៍អង្កេត"
      ],
      required: true
    },
    files: [FileSchema]
  },
  { timestamps: true }
);

export default mongoose.model("Document", DocumentSchema);
