import express from "express";
import mongoose from "mongoose";
import gridfsStream from "gridfs-stream";

const router = express.Router();
let gfs;
mongoose.connection.once("open", () => {
  gfs = gridfsStream(mongoose.connection.db, mongoose.mongo);
  gfs.collection("uploads");
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

export default router;
