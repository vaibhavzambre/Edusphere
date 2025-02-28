import mongoose from "mongoose";

const AnnouncementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    type: { type: String, enum: ["global", "role", "class", "individual"], required: true },
    roles: [{ type: String, enum: ["admin", "teacher", "student"] }],
    classes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }],
    classTarget: [{ type: String, enum: ["students", "teachers", "both"] }],
    targetUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    publishDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    expiryType: { type: String, enum: ["permanent", "limited"], required: true },
    attachmentsEnabled: { type: Boolean, required: true },
    attachments: [
      {
        filePath: { type: String, required: function () { return this.attachmentsEnabled; } },
        filename: { type: String, required: function () { return this.attachmentsEnabled; } },
        contentType: { type: String, required: function () { return this.attachmentsEnabled; } },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    visible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Pre-validation hook to set expiryDate for permanent announcements.
AnnouncementSchema.pre("validate", function (next) {
  if (this.expiryType === "permanent") {
    this.expiryDate = new Date("9999-12-31T23:59:59.999Z");
  } else {
    if (!this.expiryDate) {
      return next(new Error("Expiry date is required for limited announcements."));
    }
    if (this.expiryDate <= this.publishDate) {
      return next(new Error("Expiry date must be after publish date."));
    }
  }
  next();
});

// NEW: Pre-save hook to update the visible field based on dates.
AnnouncementSchema.pre("save", function (next) {
  const now = Date.now();
  if (this.expiryType === "permanent") {
    this.visible = true;
  } else if (this.expiryType === "limited") {
    if (this.publishDate > now) {
      // Upcoming announcement.
      this.visible = true;
    } else if (this.publishDate <= now && this.expiryDate > now) {
      // Active announcement.
      this.visible = true;
    } else if (this.publishDate <= now && this.expiryDate <= now) {
      // Expired announcement.
      this.visible = false;
    }
  }
  next();
});

export default mongoose.model("Announcement", AnnouncementSchema);
