// UPDATED FILE: models/Assignment.js

import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    files: [{ type: String }], // GridFS file IDs
    links: [{ type: String }], // 🔄 NEW UPDATED PART
    dueDate: { type: Date, required: true },
    visibilityDate: { type: Date, default: Date.now },
    closeDate: { type: Date }, // 🔄 NEW UPDATED PART
    lateSubmissionsAllowed: { type: Boolean, default: true },
    allowResubmission: { type: Boolean, default: false }, // 🔄 NEW UPDATED PART
    plagiarismCheck: { type: Boolean, default: false },
    notifyStudents: { type: Boolean, default: false }, // 🔄 NEW UPDATED PART
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    classes: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Class",
      required: true, // ✅ This matches your frontend
    },
        assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // 🔄 NEW UPDATED PART
  },
  { timestamps: true }
);

const Assignment = mongoose.model("Assignment", assignmentSchema);
export default Assignment;
