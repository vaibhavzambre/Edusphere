import mongoose from "mongoose";

const ResourceSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    file_id: { type: mongoose.Schema.Types.ObjectId, required: true }, // GridFS File ID
    contentType: { type: String, required: true },
    description: { type: String },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    
    // Link to subject and class
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    classes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true }],

    // Visibility settings
    visibility: { type: String, enum: ["public", "restricted"], default: "restricted" },
    allowedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Specific students
    
  },
  { timestamps: true }
);

// Ensure a resource can't be uploaded twice with the same file name for the same subject & class
ResourceSchema.index({ filename: 1, subject: 1, class: 1 }, { unique: true });

export default mongoose.model("Resource", ResourceSchema);
