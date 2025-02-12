import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// ✅ Configure Multer to Store Files Locally
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true }); // ✅ Ensure folder exists
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage }); // ✅ Now it's correctly placed after `storage`

// ✅ File Upload Route
router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    console.error("❌ No file received.");
    return res.status(400).json({ message: "No file uploaded" });
  }

  console.log("✅ File uploaded successfully:", req.file);

  res.status(200).json({
    filePath: `/uploads/${req.file.filename}`, // ✅ Use filePath instead of fileId
    filename: req.file.filename,
    contentType: req.file.mimetype,
  });
});

// ✅ Route to Serve Files
router.get("/:filename", (req, res) => {
  const filePath = path.join("uploads", req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File not found" });
  }
  res.sendFile(path.resolve(filePath));
});

export default router;
