// resourceroutes.js
import express from "express";
import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";
import Resource from "../models/Resource.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
const router = express.Router();

// --- FETCH TEACHER'S CLASSES ---
router.get("/classes/teacher", authMiddleware, async (req, res) => {
  try {
    const teacherId = req.user.id;
    // Assuming your Class model has a teacher field.
    const classes = await mongoose.model("Class").find({ teacher: teacherId });
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch classes", error: error.message });
  }
});

// --- UPLOAD RESOURCE ---
router.post("/upload", authMiddleware, async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { subject, class: classId, description, visibility, allowedStudents } = req.body;
    const teacherId = req.user.id;

    if (!classId) {
      return res.status(400).json({ message: "Please select a class." });
    }

    // Check that the subject exists and is assigned to the teacher.
    const subjectExists = await mongoose.model("Subject").findOne({
      _id: subject,
      teacher: teacherId,
    });
    if (!subjectExists) {
      return res.status(403).json({ message: "You are not assigned to this subject." });
    }

    let files = req.files.file;
    files = Array.isArray(files) ? files : [files];

    // Check for duplicate files.
    const seen = new Set();
    for (const file of files) {
      const key = `${file.name}-${file.mimetype}`;
      if (seen.has(key)) {
        return res.status(400).json({ message: `Duplicate file detected: ${file.name}` });
      }
      seen.add(key);
    }

    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: "uploads" });
    const uploadPromises = files.map(file => {
      return new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(file.name, { contentType: file.mimetype });
        uploadStream.on("error", (err) => reject(err));
        uploadStream.on("finish", () => {
          resolve({
            filename: file.name,
            file_id: uploadStream.id,
            contentType: file.mimetype,
          });
        });
        uploadStream.end(file.data);
      });
    });
    const filesMetadata = await Promise.all(uploadPromises);

    const newResource = new Resource({
      files: filesMetadata,
      description,
      uploadedBy: teacherId,
      subject,
      class: classId, // single class
      visibility,
      allowedStudents: allowedStudents
        ? (typeof allowedStudents === "string" ? JSON.parse(allowedStudents) : allowedStudents)
        : [],
    });

    await newResource.save();
    res.status(201).json({ message: "Resource uploaded successfully", resource: newResource });
  } catch (error) {
    console.error("Error uploading resource:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// --- FETCH RESOURCES FOR TEACHER ---
router.get("/teacher", authMiddleware, async (req, res) => {
  try {
    const teacherId = req.user.id;
    // Note: update populate to use "class" (singular)
    const resources = await Resource.find({ uploadedBy: teacherId })
      .populate("subject")
      .populate("class");
    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch resources", error: error.message });
  }
});

// --- FETCH RESOURCES FOR STUDENTS ---
router.get("/student", authMiddleware, async (req, res) => {
  try {
    const studentId = req.user.id;
    const student = await mongoose.model("User")
      .findById(studentId)
      .populate("profile");
    
    if (!student || !student.profile || !student.profile.class) {
      return res.status(404).json({ message: "Student profile or class not found" });
    }
    
    const studentClass = student.profile.class;
    const resources = await Resource.find({
      $or: [
        { visibility: "public" },
        { class: studentClass },
        { allowedStudents: studentId }
      ]
    })
      .populate("subject")
      .populate("class")
      .populate("uploadedBy", "name");
    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch resources", error: error.message });
  }
});

// --- DOWNLOAD RESOURCE ---
router.get("/download/:id", async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: "uploads" });
    const files = await bucket.find({ _id: fileId }).toArray();
    if (!files.length) return res.status(404).json({ message: "File not found" });
    res.set({
      "Content-Type": files[0].contentType,
      "Content-Disposition": `attachment; filename="${files[0].filename}"`
    });
    bucket.openDownloadStream(fileId).pipe(res);
  } catch (error) {
    res.status(500).json({ message: "Error downloading file", error: error.message });
  }
});
// --- UPDATE RESOURCE ---
router.put("/edit/:id", authMiddleware, async (req, res) => {
  try {
    console.log("Update req.body:", req.body);
    if (req.files) {
      console.log("Update req.files:", req.files);
    }
    
    const { description, visibility, subject, class: classId, removeFiles } = req.body;
    const resource = await Resource.findById(req.params.id);

    if (!resource || resource.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized to edit this resource" });
    }

    // Validate required fields.
    if (!subject || !classId) {
      return res.status(400).json({ message: "Subject and class are required" });
    }

    // Update required fields.
    resource.description = description;
    resource.visibility = visibility;
    resource.subject = subject;
    resource.class = classId; // single class

    // Process removals if provided.
    if (removeFiles) {
      let removeArray = [];
      try {
        removeArray = JSON.parse(removeFiles);
      } catch (err) {
        return res.status(400).json({ message: "Invalid removeFiles format" });
      }
      const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: "uploads" });
      for (const fileId of removeArray) {
        const fileIndex = resource.files.findIndex(file => file.file_id.toString() === fileId);
        if (fileIndex > -1) {
          try {
            await bucket.delete(new mongoose.Types.ObjectId(fileId));
          } catch (err) {
            console.warn(`File not found for id ${fileId}, skipping deletion.`);
          }
          resource.files.splice(fileIndex, 1);
        }
      }
    }

    // Process new files if attached.
    if (req.files && req.files.file) {
      let newFiles = req.files.file;
      newFiles = Array.isArray(newFiles) ? newFiles : [newFiles];

      const existingKeys = new Set(resource.files.map(f => `${f.filename}-${f.contentType}`));
      const newFileKeys = new Set();
      for (const file of newFiles) {
        const key = `${file.name}-${file.mimetype}`;
        if (existingKeys.has(key)) {
          return res.status(400).json({ message: `Duplicate file detected: ${file.name} already exists` });
        }
        if (newFileKeys.has(key)) {
          return res.status(400).json({ message: `Duplicate file in upload: ${file.name}` });
        }
        newFileKeys.add(key);
      }

      const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: "uploads" });
      const uploadPromises = newFiles.map(file => {
        return new Promise((resolve, reject) => {
          const uploadStream = bucket.openUploadStream(file.name, { contentType: file.mimetype });
          uploadStream.on("error", (err) => reject(err));
          uploadStream.on("finish", () => {
            resolve({
              filename: file.name,
              file_id: uploadStream.id,
              contentType: file.mimetype,
            });
          });
          uploadStream.end(file.data);
        });
      });
      const newFilesMetadata = await Promise.all(uploadPromises);
      resource.files = resource.files.concat(newFilesMetadata);
    }

    await resource.save();
    res.json({ message: "Resource updated successfully", resource });
  } catch (error) {
    console.error("Failed to update resource:", error);
    res.status(500).json({ message: "Failed to update resource", error: error.message });
  }
});

// --- DELETE RESOURCE ---
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource || resource.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized to delete this resource" });
    }

    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: "uploads" });
    // Delete all attached files.
    for (const fileMeta of resource.files) {
      await bucket.delete(fileMeta.file_id);
    }
    await resource.deleteOne();

    res.json({ message: "Resource deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete resource", error: error.message });
  }
});

export default router;
