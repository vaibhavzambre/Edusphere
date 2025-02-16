import express from "express";
import mongoose from "mongoose";

const router = express.Router();

// POST /api/attachments/upload – Upload a file using express-fileupload and GridFSBucket
router.post("/upload", async (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  
  const file = req.files.file; // if multiple files, req.files.file can be an array
  try {
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "uploads",
    });
    const uploadStream = bucket.openUploadStream(file.name, {
      contentType: file.mimetype,
    });
    uploadStream.end(file.data);
    // UPDATED: Use uploadStream.id in finish handler
    uploadStream.on("finish", () => {
      return res.status(201).json({
        filePath: uploadStream.id,
        filename: file.name,
        contentType: file.mimetype,
      });
    });
    uploadStream.on("error", (err) => {
      return res.status(500).json({ message: "Error uploading file", error: err.message });
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error uploading file", error: err.message });
  }
});

// NEW: GET /api/attachments/:id – Download an attachment by its ID
router.get("/:id", async (req, res) => {
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
    res.set({
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${file.filename}"`,
    });
    bucket.openDownloadStream(fileId).pipe(res);
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({ message: "Error downloading file", error: error.message });
  }
});

export default router;
