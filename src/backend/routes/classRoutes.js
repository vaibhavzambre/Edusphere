import express from "express";
import Class from "../models/Class.js";
import { checkAdmin, authMiddleware  } from "../middleware/authMiddleware.js";

const router = express.Router();

// CREATE a New Class (Only Admin)
router.post("/create", authMiddleware, checkAdmin, async (req, res) => {
  try {
    console.log("🔄 Incoming request body:", req.body);
    const { class_code, specialization, course, commencement_year } = req.body;
    if (!class_code || !specialization || !course || !commencement_year) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const existingClass = await Class.findOne({ class_code, commencement_year });
    if (existingClass) {
      return res.status(400).json({ 
        message: `Class with code '${class_code}' and commencement year '${commencement_year}' already exists` 
      });
    }
    const newClass = new Class({ class_code, specialization, course, commencement_year });
    await newClass.save();
    console.log("✅ Class created successfully:", newClass);
    res.status(201).json({ message: "Class created successfully", class: newClass });
  } catch (error) {
    console.error("❌ Server Error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Class with this code and commencement year already exists" });
    }
    res.status(500).json({ message: "Error creating class", error: error.message });
  }
});

// GET all classes
router.get("/", async (req, res) => {
  try {
    console.log("Fetching all classes...");
    const classes = await Class.find().sort({ commencement_year: -1 });
    if (!classes || classes.length === 0) {
      return res.status(404).json({ message: "No classes found" });
    }
    console.log("✅ Classes fetched successfully:", classes.length);
    res.status(200).json(classes);
  } catch (error) {
    console.error("❌ Error fetching classes:", error);
    res.status(500).json({ message: "Error fetching classes", error: error.message });
  }
});

// UPDATE a Class (Only Admin)
router.put("/update/:id", authMiddleware, checkAdmin, async (req, res) => {
  try {
    const { class_code, specialization, course, commencement_year } = req.body;
    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      { class_code, specialization, course, commencement_year },
      { new: true, runValidators: true }
    );
    console.log("Updated Class id", req.params.id);
    if (!updatedClass) {
      return res.status(404).json({ message: "Class not found" });
    }
    res.status(200).json({ message: "Class updated successfully", class: updatedClass });
  } catch (error) {
    console.error("❌ Error updating class:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Class with this code and commencement year already exists" });
    }
    res.status(500).json({ message: "Error updating class", error: error.message });
  }
});

// DELETE a Class (Only Admin)
router.delete("/delete/:id", authMiddleware, checkAdmin, async (req, res) => {
  try {
    await Class.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Class deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting class:", error);
    res.status(500).json({ message: "Error deleting class", error: error.message });
  }
});

export default router;
