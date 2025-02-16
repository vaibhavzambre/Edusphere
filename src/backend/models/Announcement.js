import mongoose from "mongoose";

const AnnouncementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    // Announcement type: global, role, class, individual
    type: { type: String, enum: ["global", "role", "class", "individual"], required: true },
    // For role-specific announcements.
    roles: [{ type: String, enum: ["admin", "teacher", "student"] }],
    // For class-specific announcements – allow multiple classes.
    classes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }],
    // For class-specific announcements, optionally indicate target (students/teachers/both)
    classTarget: [{ type: String, enum: ["students", "teachers", "both"] }],
    // For individual targeting.
    targetUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // Scheduling.
    publishDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    // expiryType: permanent or limited.
    expiryType: { type: String, enum: ["permanent", "limited"], required: true },
    // Whether attachments are enabled.
    attachmentsEnabled: { type: Boolean, required: true },
    // Attachments (if attachmentsEnabled is true)
    attachments: [
      {
        filePath: { type: String, required: function () { return this.attachmentsEnabled; } },
        filename: { type: String, required: function () { return this.attachmentsEnabled; } },
        contentType: { type: String, required: function () { return this.attachmentsEnabled; } },
      },
    ],
    // Who created the announcement.
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // New field: visibility. When false, the announcement is expired.
    visible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Pre-validate hook to set expiryDate for permanent announcements.
AnnouncementSchema.pre("validate", function (next) {
  if (this.expiryType === "permanent") {
    // Set expiryDate to a far-future date.
    this.expiryDate = new Date("9999-12-31T23:59:59.999Z");
  } else {
    // For limited announcements, ensure expiryDate is provided and is after publishDate.
    if (!this.expiryDate) {
      return next(new Error("Expiry date is required for limited announcements."));
    }
    if (this.expiryDate <= this.publishDate) {
      return next(new Error("Expiry date must be after publish date."));
    }
  }
  next();
});

// Remove TTL index since we are no longer deleting expired announcements.
// AnnouncementSchema.index({ expiryDate: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Announcement", AnnouncementSchema);
