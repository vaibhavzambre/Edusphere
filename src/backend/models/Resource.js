// resource.js
import mongoose from "mongoose";

const FileSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    file_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    contentType: { type: String, required: true },
  },
  { _id: false }
);

const ResourceSchema = new mongoose.Schema(
  {
    files: { type: [FileSchema], required: true },
    description: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    // Changed from an array (classes) to a single class field.
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    // Visibility: "public" means visible to all students for the selected subject/class,
    // "private" means visible only on the teacher side.
    visibility: { type: String, enum: ["public", "private"], required: true, default: "private" },
  },
  { timestamps: true }
);

export default mongoose.model("Resource", ResourceSchema);
