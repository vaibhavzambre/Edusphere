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
import Student from "../models/Student.js";
import User from "../models/User.js";
import ExcelJS from 'exceljs';

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
 // Add to assignmentRoutes.js (file metadata endpoint)
 // Metadata endpoint
router.get("/:id/metadata", async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "uploads",
    });

    const files = await bucket.find({ _id: fileId }).toArray();
    
    if (!files.length) {
      return res.status(404).json({ error: "File not found" });
    }

    res.json({
      filename: files[0].filename,
      contentType: files[0].contentType,
      length: files[0].length,
      uploadDate: files[0].uploadDate
    });

  } catch (err) {
    console.error("Metadata error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/file/:id/metadata", async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "uploads",
    });

    const files = await bucket.find({ _id: fileId }).toArray();
    if (!files.length) return res.status(404).json({ error: "File not found" });
    
    res.json({
      filename: files[0].filename,
      contentType: files[0].contentType,
      uploadDate: files[0].uploadDate
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Add to assignmentRoutes.js
// sr/backend/routes/assignments.js - Add export route
// File Download Route with Authentication


router.get("/download/:id", authMiddleware, async (req, res) => {
  try {
    // First check if ID is valid
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid file ID format",
        receivedId: req.params.id
      });
    }

    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const bucket = new GridFSBucket(mongoose.connection.db, { 
      bucketName: "uploads" 
    });

    const files = await bucket.find({ _id: fileId }).toArray();
    
    if (files.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "File not found" 
      });
    }

    res.set({
      "Content-Type": files[0].contentType,
      "Content-Disposition": `attachment; filename="${files[0].filename}"`
    });

    const downloadStream = bucket.openDownloadStream(fileId);
    downloadStream.pipe(res);

  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error",
      error: error.message 
    });
  }
});
router.get('/attachments/:id', authMiddleware, async (req, res) => {
  try {
    // Validate the file ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid file ID format" 
      });
    }

    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "uploads",
    });

    // Check if file exists
    const files = await bucket.find({ _id: fileId }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "File not found" 
      });
    }

    const file = files[0];
    
    // Set response headers
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.setHeader('Content-Length', file.length);

    // Stream the file to response
    const downloadStream = bucket.openDownloadStream(fileId);
    
    downloadStream.on('error', (error) => {
      console.error('Download stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          success: false,
          message: "Error streaming file" 
        });
      }
    });

    downloadStream.pipe(res);

  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error",
      error: error.message 
    });
  }
});
router.get('/:id/export', async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('submissions')
      .populate('submissions.student');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Submissions');

    // Worksheet headers
    worksheet.columns = [
      { header: 'Student Name', key: 'name' },
      { header: 'SAP ID', key: 'sapId' },
      { header: 'Submission Date', key: 'date' },
      { header: 'Grade', key: 'grade' },
      { header: 'Feedback', key: 'feedback' }
    ];

    // Add data rows
    assignment.submissions.forEach(sub => {
      worksheet.addRow({
        name: sub.student.name,
        sapId: sub.student.profile?.sap_id || 'N/A',
        date: new Date(sub.submittedAt).toLocaleString(),
        grade: sub.grade || 'Not graded',
        feedback: sub.feedback || ''
      });
    });

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=grades_${assignment.title}.xlsx`
    );

    // Send the workbook
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Export failed' });
  }
});
// Update assignment route (in assignmentRoutes.js)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const updatedAssignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('classes');

    if (!updatedAssignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Add file metadata if needed
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "uploads",
    });

    updatedAssignment.files = await Promise.all(
      updatedAssignment.files.map(async (fileId) => {
        const files = await bucket.find({ _id: fileId }).toArray();
        return {
          _id: fileId,
          filename: files[0]?.filename || `Resource File`,
          contentType: files[0]?.contentType
        };
      })
    );

    res.json({
      success: true,
      message: "Assignment updated successfully",
      assignment: updatedAssignment
    });

  } catch (error) {
    console.error("Assignment update failed:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to update assignment", 
      error: error.message 
    });
  }
});
router.get("/student", authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    // 🧠 Step 1: Get full User object to extract 'profile'
    const user = await User.findById(userId);
    if (!user || user.role !== "student" || !user.profile) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    // 🧠 Step 2: Get student document from the profile ref
    const studentProfile = await Student.findById(user.profile);
    if (!studentProfile) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const studentClassId = studentProfile.class;

    // 🧠 Step 3: Get assignments either for the class or directly assigned
    const assignments = await Assignment.find({
      $or: [
        { classes: studentClassId },
        { assignedTo: userId }
      ]
    }).sort({ dueDate: 1 });

    // 🧠 Step 4: Get submissions by this student
    const submissions = await Submission.find({ student: userId });

    const enriched = assignments.map((assignment) => {
      const submission = submissions.find(
        (s) => s.assignment.toString() === assignment._id.toString()
      );
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

    const bucket = new GridFSBucket(mongoose.connection.db, { 
      bucketName: "uploads" 
    });

    const uploadStream = bucket.openUploadStream(file.name, {
      contentType: file.mimetype,
    });

    uploadStream.end(file.data);

    uploadStream.on("error", (err) => {
      console.error("Upload error:", err);
      return res.status(500).json({ message: "Error uploading file" });
    });

    uploadStream.on("finish", () => {
      // Return both file ID and filename
      return res.status(200).json({
        message: "File uploaded successfully",
        file: {
          fileId: uploadStream.id.toString(),
          filename: file.name
        }
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

// Update the GET /:id route to populate file metadata
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('classes')
      .lean();

    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "uploads",
    });

    // 1. File Metadata Enhancement - Convert ID to ObjectId
    assignment.files = await Promise.all(
      assignment.files.map(async (fileId) => {
        // Convert string ID to ObjectId for GridFS query
        const objId = new mongoose.Types.ObjectId(fileId);
        const [file] = await bucket.find({ _id: objId }).toArray();
        
        return {
          _id: fileId,
          filename: file?.filename || `File-${fileId.substring(0, 8)}`, // Fallback with partial ID
          contentType: file?.contentType || 'application/octet-stream'
        };
      })
    );

    // 2. Submission Metadata Enhancement
    const submission = await Submission.findOne({
      assignment: assignment._id,
      student: req.user.id,
    }).lean();

    if (submission?.file) {
      submission.file = await Promise.all(
        submission.file.map(async (fileId) => {
          const objId = new mongoose.Types.ObjectId(fileId);
          const [file] = await bucket.find({ _id: objId }).toArray();
          
          return {
            _id: fileId,
            filename: file?.filename || `Submission-${fileId.substring(0, 8)}`,
            contentType: file?.contentType || 'application/octet-stream'
          };
        })
      );
    }

    return res.json({ ...assignment, submission });

  } catch (err) {
    console.error("Error fetching assignment:", err);
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
// Add preview route

// Preview endpoint
router.get('/preview/:id', async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "uploads",
    });

    const files = await bucket.find({ _id: fileId }).toArray();
    
    if (!files.length) {
      return res.status(404).json({ error: "File not found" });
    }

    res.set({
      "Content-Type": files[0].contentType,
      "Content-Disposition": `inline; filename="${files[0].filename}"`,
      "Cache-Control": "public, max-age=3600"
    });

    const downloadStream = bucket.openDownloadStream(fileId);
    downloadStream.pipe(res);

  } catch (error) {
    console.error("Preview error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
export default router;
