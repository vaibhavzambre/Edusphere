import express from "express";
import User from "../models/User.js";
import { authMiddleware,checkAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @route   GET /api/users/students
 * @desc    Fetch all students with their SAP ID
 * @access  Private (Only authenticated users)
 */
router.get("/all", authMiddleware, async (req, res) => {
  try {
    const users = await User.find({}, "name email role avatar");
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.get("/students", authMiddleware,checkAdmin, async (req, res) => {
  try {
    const students = await User.find({ role: "student" })
      .populate({
        path: "profile",
        model: "student", // Ensure correct reference
        select: "sap_id", // Fetch only SAP ID
      })
      .select("name email profile"); // Fetch name, email, and profile

    res.status(200).json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ message: "Error fetching students", error: error.message });
  }
});


/**
 * @route   GET /api/users/teachers
 * @desc    Fetch all teachers (name, email)
 * @access  Private (Only authenticated users)
 */
router.get("/teachers", authMiddleware, async (req, res) => {
  try {
    const teachers = await User.find({ role: "teacher" }).select("_id name email");
    res.status(200).json(teachers);
  } catch (error) {
    console.error("Error fetching teachers:", error);
    res.status(500).json({ message: "Error fetching teachers", error: error.message });
  }
});

export default router;
