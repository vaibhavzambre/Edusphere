import express from "express";
import mongoose from "mongoose";
import gridfsStream from "gridfs-stream";

const router = express.Router();
let gfs;
mongoose.connection.once("open", () => {
  gfs = gridfsStream(mongoose.connection.db, mongoose.mongo);
  gfs.collection("uploads");
});
router.get("/:fileId/metadata", (req, res) => {
  const fileId = req.params.fileId;

  try {
    const objectId = new mongoose.Types.ObjectId(fileId); // ✅ FIXED HERE
    gfs.files.findOne({ _id: objectId }, (err, file) => {
      if (err) {
        console.error("Error fetching file:", err);
        return res.status(500).json({ message: "Error fetching file" });
      }
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      console.log("✅ File metadata found:", file.filename);

      return res.json(file); // ✅ Send metadata
    });
  } catch (error) {
    console.error("Invalid file ID:", error.message);
    return res.status(400).json({ message: "Invalid file ID" });
  }
});

// GET /api/files/:fileId
router.get("/:fileId", (req, res) => {
  const fileId = req.params.fileId;
  gfs.files.findOne({ _id: mongoose.Types.ObjectId(fileId) }, (err, file) => {
    if (!file || err) {
      return res.status(404).json({ message: "File not found" });
    }
    res.set("Content-Type", file.contentType);
    const readstream = gfs.createReadStream({ _id: file._id });
    readstream.pipe(res);
  });
});
// ✅ NEW: Get file metadata (filename, etc.)



export default router;