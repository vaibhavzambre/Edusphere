// assignmentRoutes.js

import express from "express";
import Assignment from "../models/Assignment.js";
import {
  authMiddleware,
  checkTeacher,
} from "../middleware/authMiddleware.js";
import { GridFSBucket } from "mongodb";
import mongoose from "mongoose";
import Submission from "../models/Submission.js"; // ✅ Add this line

const router = express.Router();
router.post("/create", authMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      points,
      category,
      dueDate,
      visibilityDate,
      closeDate,
      files,
      links,
      classes,
      assignedTo,
      lateSubmissionsAllowed,
      allowResubmission
    } = req.body;

    const assignment = new Assignment({
      title,
      description,
      points,
      category,
      dueDate,
      visibilityDate,
      closeDate,
      files,
      links,
      classes, // ✅ matches your frontend
      assignedTo,
      lateSubmissionsAllowed,
      allowResubmission,
      createdBy: req.user.id, // ✅ required
    });

    await assignment.save();
    res.status(201).json({ message: "Assignment created successfully", assignment });

  } catch (error) {
    console.warn("Assignment creation failed:", error);
    res.status(500).json({ message: "Failed to create assignment", error: error.message });
  }
});

// GET /api/assignments/student - get assignments for a student
router.get("/student", authMiddleware, async (req, res) => {
  const studentId = req.user.id;

  try {
    const assignments = await Assignment.find({
      $or: [
        { classes: { $in: req.user.classIds || [] } },
        { assignedTo: studentId }
      ]
    }).sort({ dueDate: 1 });

    const submissions = await Submission.find({ student: studentId });

    const enriched = assignments.map((assignment) => {
      const submission = submissions.find((s) => s.assignment.toString() === assignment._id.toString());
      return {
        ...assignment.toObject(),
        isSubmitted: !!submission,
        submittedAt: submission?.submittedAt,
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error("Error fetching student assignments:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/team/:teamId", authMiddleware, checkTeacher, async (req, res) => {
  try {
    const assignments = await Assignment.find({ team: req.params.teamId }).sort({
      dueDate: -1,
    });
    res.json(assignments);
  } catch (err) {
    console.error("Failed to fetch assignments:", err);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

router.post("/upload", authMiddleware, async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    let file = req.files.file;
    file = Array.isArray(file) ? file[0] : file;

    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: "uploads" });

    const uploadStream = bucket.openUploadStream(file.name, {
      contentType: file.mimetype,
    });

    uploadStream.end(file.data);

    uploadStream.on("error", (err) => {
      console.error("Upload error:", err);
      return res.status(500).json({ message: "Error uploading file" });
    });

    uploadStream.on("finish", () => {
      return res.status(200).json({
        message: "File uploaded successfully",
        fileId: uploadStream.id,
        filename: file.name,
      });
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});
// Add this new route to assignmentRoutes.js
router.get("/teacher", authMiddleware, checkTeacher, async (req, res) => {
  try {
    // Find assignments where the createdBy field matches the teacher's id
    const assignments = await Assignment.find({ createdBy: req.user.id }).sort({ dueDate: -1 });
    res.json(assignments);
  } catch (err) {
    console.error("Failed to fetch assignments:", err);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});
// ✅ NEW ROUTE: Get assignment by ID
// assignmentRoutes.js

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('classes')
      .lean();

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // ✅ Fetch the student's submission separately
    const submission = await Submission.findOne({
      assignment: assignment._id,
      student: req.user.id,
    }).lean();

    return res.json({ ...assignment, submission }); // ✅ Inject submission into frontend response
  } catch (err) {
    console.error("❌ Error fetching assignment by ID:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ NEW: Get metadata for a file uploaded with assignment
router.get("/file/:id/metadata", async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "uploads",
    });

    const files = await bucket.find({ _id: fileId }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ message: "File not found" });
    }

    const file = files[0];
    return res.json({
      filename: file.filename,
      contentType: file.contentType,
      length: file.length,
      uploadDate: file.uploadDate,
    });
  } catch (err) {
    console.error("❌ Error retrieving file metadata:", err);
    return res.status(500).json({ message: "Error retrieving file metadata", error: err.message });
  }
});

export default router;
