// src/backend/models/Announcement.js
import mongoose from "mongoose";

const AnnouncementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },

    // Announcement type determines who sees it.
    // Options: "global", "role", "class", "individual"
    type: { type: String, enum: ["global", "role", "class", "individual"], required: true },

    // For role-specific announcements.
    roles: [{ type: String, enum: ["admin", "teacher", "student"] }],

    // For class-specific announcements.
    // Either store a reference to the Class document…
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
    // …or store class_code and commencement_year for display/lookup.
    class_code: Number,
    commencement_year: Number,
    // Optionally indicate if the announcement is for teachers, students, or both.
    classTarget: [{ type: String, enum: ["students", "teachers", "both"] }],

    // For individual targeting.
    targetUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // ✅ Stores selected students/teachers for individual-specific

    // Scheduling.
    publishDate: { type: Date, required: true },
    expiryDate: { type: Date },

    // Attachments: store an array of objects referencing GridFS files.
    attachments: [
      {
        filePath: { type: String, required: true }, // ✅ Changed from fileId to filePath
        filename: { type: String, required: true },
        contentType: { type: String, required: true },
      },
    ],

    // Who created the announcement.
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export default mongoose.model("Announcement", AnnouncementSchema);
