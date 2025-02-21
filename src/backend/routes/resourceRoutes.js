import express from "express";
import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";
import Resource from "../models/Resource.js";
import { authMiddleware } from "../middleware/authMiddleware.js"; // Ensure only teachers can upload
import Class from "../models/Class.js";
const router = express.Router();

// **🔹 Upload Resource**
router.post("/upload", authMiddleware, async (req, res) => {
  try {
    // ✅ Check if file exists
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // ✅ Extract form data
    const { subject, classes, description, visibility, allowedStudents } = req.body;
    const teacherId = req.user.id; // Authenticated teacher

    // ✅ Convert `classes` to an array
    const classArray = Array.isArray(classes) ? classes : JSON.parse(classes || "[]");
    if (classArray.length === 0) {
      return res.status(400).json({ message: "At least one class must be selected." });
    }

    // ✅ Ensure teacher is authorized to upload for this subject
    const subjectExists = await mongoose.model("Subject").findOne({
      _id: subject,
      teacher: teacherId,
    });

    if (!subjectExists) {
      return res.status(403).json({ message: "You are not assigned to this subject." });
    }

    // ✅ Convert `allowedStudents` to an array (if visibility is restricted)
    const studentArray = visibility === "restricted" ? JSON.parse(allowedStudents || "[]") : [];

    // ✅ Set up GridFS for file upload
    const file = req.files.file;
    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: "uploads" });
    const uploadStream = bucket.openUploadStream(file.name, { contentType: file.mimetype });

    // ✅ Handle upload events
    uploadStream.on("error", (err) =>
      res.status(500).json({ message: "Upload failed", error: err.message })
    );

    uploadStream.on("finish", async () => {
      // ✅ Store metadata in the Resource Model
      const newResource = new Resource({
        filename: file.name,
        file_id: uploadStream.id,
        contentType: file.mimetype,
        description,
        uploadedBy: teacherId,
        subject,
        classes: classArray, // ✅ Store multiple classes
        visibility: visibility || "restricted",
        allowedStudents: studentArray,
      });

      await newResource.save();
      res.status(201).json({ message: "Resource uploaded successfully", resource: newResource });
    });

    // ✅ Upload file to GridFS
    uploadStream.write(file.data);
    uploadStream.end();
  } catch (error) {
    console.error("Error uploading resource:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
// **🔹 Fetch Uploaded Resources (Teacher)**
// **🔹 Fetch Uploaded Resources (Teacher)**
router.get("/teacher", authMiddleware, async (req, res) => {
  try {
    const teacherId = req.user.id;
    // Populate subject and the updated "classes" field
    const resources = await Resource.find({ uploadedBy: teacherId })
      .populate("subject")
      .populate("classes"); // Changed from "class" to "classes"
    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch resources", error: error.message });
  }
});


// **🔹 Fetch Resources for Students**
// In resourceRoutes.js
router.get("/student", authMiddleware, async (req, res) => {
  try {
    const studentId = req.user.id;
    // Get the student user (which should have a profile with the class reference)
    const student = await mongoose.model("User")
      .findById(studentId)
      .populate("profile");
    
    if (!student || !student.profile || !student.profile.class) {
      return res.status(404).json({ message: "Student profile or class not found" });
    }
    
    const studentClass = student.profile.class;
    
    // Find resources and populate the "uploadedBy" field (selecting only the name)
    const resources = await Resource.find({
      $or: [
        { visibility: "public" },
        { classes: studentClass },
        { allowedStudents: studentId }
      ]
    })
      .populate("subject")
      .populate("classes")
      .populate("uploadedBy", "name"); // Populate uploadedBy with only the name field
    
    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch resources", error: error.message });
  }
});



// **🔹 Download Resource**
router.get("/download/:id", async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: "uploads" });
    
    const files = await bucket.find({ _id: fileId }).toArray();
    if (!files.length) return res.status(404).json({ message: "File not found" });

    res.set({ "Content-Type": files[0].contentType, "Content-Disposition": `attachment; filename="${files[0].filename}"` });
    bucket.openDownloadStream(fileId).pipe(res);
  } catch (error) {
    res.status(500).json({ message: "Error downloading file", error: error.message });
  }
});

// **🔹 Edit Resource (Only Metadata)**
// **🔹 Update Resource (Only Metadata)**
router.put("/edit/:id", authMiddleware, async (req, res) => {
  try {
    const { description, visibility, allowedStudents } = req.body;
    const resource = await Resource.findById(req.params.id);

    // Verify the resource exists and the logged-in teacher owns it
    if (!resource || resource.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized to edit this resource" });
    }

    // Update description and visibility if provided
    resource.description = description || resource.description;
    resource.visibility = visibility || resource.visibility;

    // Process allowedStudents field:
    // If visibility is "restricted", ensure allowedStudents is an array.
    // It might come as a JSON string, so try to parse it.
    if (resource.visibility === "restricted") {
      let allowedArray = [];
      if (typeof allowedStudents === "string") {
        try {
          allowedArray = JSON.parse(allowedStudents);
        } catch (parseErr) {
          return res.status(400).json({ message: "Invalid format for allowedStudents" });
        }
      } else if (Array.isArray(allowedStudents)) {
        allowedArray = allowedStudents;
      }
      resource.allowedStudents = allowedArray;
    } else {
      // If not restricted, clear allowedStudents.
      resource.allowedStudents = [];
    }

    await resource.save();
    res.json({ message: "Resource updated successfully", resource });
  } catch (error) {
    console.error("Failed to update resource:", error);
    res.status(500).json({ message: "Failed to update resource", error: error.message });
  }
});


// **🔹 Delete Resource**
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource || resource.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized to delete this resource" });
    }

    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: "uploads" });
    await bucket.delete(resource.file_id);
    await resource.deleteOne();

    res.json({ message: "Resource deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: "Failed to delete resource", error: error.message });
  }
});

export default router;
