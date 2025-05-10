import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid"; // ✅ install via npm i uuid

const ticketSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  department: String,
  subject: String,
  description: String,
  priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
  status: { type: String, enum: ["pending", "in-progress", "closed"], default: "pending" },
  ticketId: { type: String, unique: true },
  attachments: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  replies: [
    {
      message: String,
      fromDepartment: Boolean,
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

// ✅ Automatically assign ticketId
ticketSchema.pre("save", function (next) {
  if (!this.ticketId) {
    this.ticketId = uuidv4().split("-")[0]; // Short unique ID
  }
  next();
});

export default mongoose.model("Ticket", ticketSchema);
