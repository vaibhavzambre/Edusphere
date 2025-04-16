// NEW FILE: models/Submission.js

import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    file: [{ type: String, required: true }], // ✅ changed from `type: String` to array
    submittedAt: { type: Date, default: Date.now },
    grade: { type: String }, // Can be numeric, letter, etc.
    feedback: {
      text: { type: String },
      audioUrl: { type: String },
    },
    status: {
      type: String,
      enum: ["submitted", "graded", "needs-revision"],
      default: "submitted",
    },
  },
  { timestamps: true }
);

const Submission = mongoose.model("Submission", submissionSchema);
export default Submission;
