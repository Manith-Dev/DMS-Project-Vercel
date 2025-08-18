import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["admin", "department"], required: true },
  department: { type: String, default: "" } // only for role=department
}, { timestamps: true });

export default mongoose.model("User", UserSchema);
