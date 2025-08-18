// server/seed-admin.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();
await mongoose.connect(process.env.MONGO_URI);

const email = "admin@example.com";
const password = "Admin@12345";

const hash = await bcrypt.hash(password, 10);
await User.findOneAndUpdate(
  { email },
  { email, passwordHash: hash, role: "admin", department: "នាយកដ្ឋានរដ្ឋបាលសរុប" },
  { upsert: true, new: true }
);

console.log("Admin user ready:", email);
process.exit(0);
