// src/backend/routes/submissionRoutes.js

import express from "express";
import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";
import Submission from "../models/Submission.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ POST /api/submissions/:assignmentId - Submit assignment with multiple files
router.post("/:assignmentId", authMiddleware, async (req, res) => {
  try {
    if (!req.files || !req.files.files) {
      return res.status(400).json({ message: "No files attached" });
    }

    const files = Array.isArray(req.files.files) ? req.files.files : [req.files.files];
    const bucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: "uploads",
    });

    const uploadedFileIds = await Promise.all(
      files.map(
        (file) =>
          new Promise((resolve, reject) => {
            const uploadStream = bucket.openUploadStream(file.name, {
              contentType: file.mimetype,
            });
            uploadStream.end(file.data);
            uploadStream.on("finish", () => resolve(uploadStream.id));
            uploadStream.on("error", (err) => reject(err));
          })
      )
    );

    const submission = new Submission({
      assignment: req.params.assignmentId,
      student: req.user.id,
      file: uploadedFileIds.map((id) => id.toString()),
      submittedAt: new Date(),
      status: "submitted",
    });

    await submission.save();
    return res.status(200).json({ message: "Assignment submitted", submission });
  } catch (err) {
    console.warn("❌ Error submitting assignment:", err);
    return res.status(500).json({ message: "Submission failed", error: err.message });
  }
});

// ✅ DELETE /api/submissions/:submissionId - Undo Turn In (if allowed)
router.delete("/:submissionId", authMiddleware, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.submissionId);
    if (!submission) return res.status(404).json({ message: "Submission not found" });
    if (submission.student.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const Assignment = mongoose.model("Assignment");
    const assignment = await Assignment.findById(submission.assignment);
    if (!assignment?.allowResubmission) {
      return res.status(400).json({ message: "Resubmissions not allowed" });
    }

    await Submission.findByIdAndDelete(req.params.submissionId);
    return res.status(200).json({ message: "Submission deleted" });
  } catch (err) {
    console.error("❌ Undo submission error:", err);
    return res.status(500).json({ message: "Error undoing submission", error: err.message });
  }
});

export default router;
