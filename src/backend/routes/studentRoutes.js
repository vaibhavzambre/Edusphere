import express from "express";
import User from "../models/User.js";
import Subject from "../models/Subject.js";
import { authMiddleware, checkStudent } from "../middleware/authMiddleware.js";
import Class from "../models/Class.js";
import Student from "../models/Student.js";
const router = express.Router();
router.get("/students", authMiddleware, async (req, res) => {
  try {
    const { classIds } = req.query; // ✅ Class IDs from frontend
    if (!classIds) {
      return res.status(400).json({ message: "Class IDs are required." });
    }

    const classArray = classIds.split(","); // Convert to Array

    // ✅ Find students from selected classes
    const students = await Student.find({ class: { $in: classArray } }).populate({
      path: "profile", // This refers to the User profile
      model: "User",
      select: "name email",
    });

    if (!students.length) {
      return res.status(404).json({ message: "No students found for selected classes." });
    }

    // ✅ Format the response (Send name, email, sap_id)
    const studentList = students.map((student) => ({
      _id: student._id,
      name: student.profile?.name || "Unknown", // ✅ Get name from User model
      email: student.profile?.email || "No Email",
      sap_id: student.sap_id,
    }));
    console.log("✅ Students received:", data);

    res.status(200).json(studentList);
  } catch (error) {
    console.error("❌ Error fetching students:", error);
    res.status(500).json({ message: "Failed to fetch students", error: error.message });
  }
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    const { classIds } = req.query;

    if (!classIds) {
      return res.status(400).json({ error: "Class IDs are required" });
    }

    const classArray = classIds.split(",");

    // Fetch students belonging to the selected classes
    const students = await Student.find({ class: { $in: classArray } })
      .populate("class", "class_code commencement_year specialization") // ✅ Populate class details
      .lean(); // ✅ Convert documents to plain JavaScript objects

    if (students.length === 0) {
      return res.status(404).json({ message: "No students found for selected classes" });
    }

    // Fetch corresponding users
    const studentIds = students.map((student) => student._id);
    const users = await User.find({ profile: { $in: studentIds } }).select("name email profile").lean();

    // Merge user data into student data
    const studentData = students.map((student) => {
      const user = users.find((user) => String(user.profile) === String(student._id));
      return {
        _id: student._id,
        name: user ? user.name : "Unknown", // ✅ Get name from User
        email: user ? user.email : "Unknown", // ✅ Get email from User
        class: student.class, // ✅ Include class details
        sap_id: student.sap_id,
      };
    });

    return res.json(studentData);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ error: "Server error while fetching students" });
  }
});

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
