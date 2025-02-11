import express from "express";
import User from "../models/User.js";
import Subject from "../models/Subject.js";
import { authMiddleware, checkStudent } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET Student's Subjects (based on the student's class)
router.get("/subjects", authMiddleware, checkStudent, async (req, res) => {
  try {
    // Find the user by ID and populate the profile along with its class reference.
    const user = await User.findById(req.user.id).populate({
      path: "profile",
      populate: { path: "class", model: "Class" }
    });
    
    // Log the fetched user for debugging.
    console.log("User fetched with profile:", user);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!user.profile) {
      return res.status(404).json({ message: "Student profile not found" });
    }
    if (!user.profile.class) {
      return res.status(404).json({ message: "Student class not found in profile" });
    }
    
    // At this point, we expect user.profile.class to be a fully populated Class document.
    const classId = user.profile.class._id || user.profile.class;
    console.log("Using classId:", classId);
    
    const subjects = await Subject.find({ class: classId })
      .populate("class")
      .populate("teacher");
    
    console.log("Subjects found:", subjects);
    res.status(200).json(subjects);
  } catch (error) {
    console.error("Error fetching student subjects:", error);
    res.status(500).json({ 
      message: "Error fetching student subjects", 
      error: error.message 
    });
  }
});

export default router;
