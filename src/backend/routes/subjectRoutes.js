import express from "express";
import Subject from "../models/Subject.js";
import Class from "../models/Class.js";
import { authMiddleware, checkAdmin } from "../middleware/authMiddleware.js";
import User from "../models/User.js";
const router = express.Router();

// Create Subject (Admin Only)
router.post("/create", authMiddleware, checkAdmin, async (req, res) => {
  try {
    console.log("Received Data for Create:", req.body);
    let {
      subject_name,
      subject_code,
      description,
      max_no_of_hours,
      hours_conducted,
      start_date,
      end_date,
      semester,
      class_code,
      commencement_year,
      teacher  // Optional teacher field
    } = req.body;

    if (
      !subject_name ||
      !subject_code ||
      !description ||
      !max_no_of_hours ||
      !hours_conducted ||
      !start_date ||
      !end_date ||
      !semester ||
      !class_code ||
      !commencement_year
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    max_no_of_hours = Number(max_no_of_hours);
    hours_conducted = Number(hours_conducted);
    semester = Number(semester);
    class_code = Number(class_code);
    commencement_year = Number(commencement_year);

    if (hours_conducted > max_no_of_hours) {
      return res.status(400).json({ message: "Hours conducted cannot be greater than max hours." });
    }

    const classExists = await Class.findOne({ class_code, commencement_year });
    if (!classExists) {
      return res.status(400).json({ message: "Class with given class_code and commencement_year not found" });
    }

    const existingSubject = await Subject.findOne({ subject_code, class_code, commencement_year });
    if (existingSubject) {
      return res.status(400).json({ message: "This subject already exists for the given class and year." });
    }

    const newSubject = new Subject({
      subject_name,
      subject_code,
      description,
      max_no_of_hours,
      hours_conducted,
      start_date,
      end_date,
      semester,
      class_code,
      commencement_year,
      class: classExists._id,
      teacher: teacher ? teacher : undefined
    });

    await newSubject.save();
    res.status(201).json({ message: "Subject created successfully", subject: newSubject });
  } catch (error) {
    console.error("Error creating subject:", error);
    res.status(500).json({ message: "Error creating subject", error: error.message });
  }
});
// ✅ **NEW: Get Subjects Assigned to a Specific Teacher**
router.get("/teacher", authMiddleware, async (req, res) => {
  try {
    const teacherId = req.user.id; // Authenticated teacher's ID

    // Find subjects where the teacher is assigned
    const subjects = await Subject.find({ teacher: teacherId })
      .populate("class") // Populate class details
      .sort({ subject_name: 1 }); // Sort alphabetically

    if (!subjects.length) {
      return res.status(404).json({ message: "No subjects assigned to this teacher" });
    }

    res.status(200).json(subjects);
  } catch (error) {
    console.error("❌ Error fetching teacher subjects:", error);
    res.status(500).json({ message: "Error fetching subjects", error: error.message });
  }
});

// ✅ **NEW: Get Classes for a Selected Subject (Teacher-Based)**

// ✅ Fetch Classes for a Subject (Based on Logged-in Teacher)
router.get("/classes/:subjectId", authMiddleware, async (req, res) => {
  try {
    const { subjectId } = req.params;
    const userId = req.user.id; // ✅ Get the logged-in User ID

    // ✅ Ensure the logged-in user is a teacher
    const user = await User.findById(userId);
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ message: "Access denied. You are not a teacher." });
    }

    // ✅ Find the subject and ensure the logged-in teacher is assigned to it
    const subject = await Subject.findOne({ _id: subjectId, teacher: user._id }).populate("class");

    if (!subject) {
      return res.status(403).json({ message: "You are not assigned to this subject." });
    }

    // ✅ Ensure subject has associated classes
    if (!subject.class || subject.class.length === 0) {
      return res.status(404).json({ message: "No classes found for this subject." });
    }

    res.status(200).json(subject.class);
  } catch (error) {
    console.error("❌ Error fetching classes for subject:", error);
    res.status(500).json({ message: "Error fetching classes", error: error.message });
  }
});
// Get all Subjects (Admin Only)
router.get("/", authMiddleware, checkAdmin, async (req, res) => {
  try {
    const subjects = await Subject.find().populate("class").populate("teacher");
    res.status(200).json(subjects);
  } catch (error) {
    res.status(500).json({ message: "Error fetching subjects", error });
  }
});

// Update Subject (Admin Only)
router.put("/update/:id", authMiddleware, checkAdmin, async (req, res) => {
  try {
    console.log("Received Data for Update:", req.body);
    let {
      subject_name,
      subject_code,
      description,
      max_no_of_hours,
      hours_conducted,
      start_date,
      end_date,
      semester,
      class_code,
      commencement_year,
      teacher
    } = req.body;

    max_no_of_hours = Number(max_no_of_hours);
    hours_conducted = Number(hours_conducted);
    semester = Number(semester);
    class_code = Number(class_code);
    commencement_year = Number(commencement_year);

    if (hours_conducted > max_no_of_hours) {
      return res.status(400).json({ message: "Hours conducted cannot be greater than max hours." });
    }

    const classExists = await Class.findOne({ class_code, commencement_year });
    if (!classExists) {
      return res.status(400).json({ message: "Class with given class_code and commencement_year not found" });
    }

    const duplicateSubject = await Subject.findOne({ subject_code, class_code, commencement_year });
    if (duplicateSubject && duplicateSubject._id.toString() !== req.params.id) {
      return res.status(400).json({ message: "This subject already exists for the given class and year." });
    }

    const updatedSubject = await Subject.findByIdAndUpdate(
      req.params.id,
      {
        subject_name,
        subject_code,
        description,
        max_no_of_hours,
        hours_conducted,
        start_date,
        end_date,
        semester,
        class_code,
        commencement_year,
        class: classExists._id,
        teacher: teacher ? teacher : undefined
      },
      { new: true, runValidators: true, context: "query" }
    );

    res.status(200).json({ message: "Subject updated successfully", subject: updatedSubject });
  } catch (error) {
    console.error("Error updating subject:", error);
    res.status(500).json({ message: "Error updating subject", error: error.message });
  }
});

// Delete Subject (Admin Only)
router.delete("/delete/:id", authMiddleware, checkAdmin, async (req, res) => {
  try {
    const deletedSubject = await Subject.findByIdAndDelete(req.params.id);
    if (!deletedSubject) {
      return res.status(404).json({ message: "Subject not found" });
    }
    res.status(200).json({ message: "Subject deleted successfully", subject: deletedSubject });
  } catch (error) {
    console.error("Error deleting subject:", error);
    res.status(500).json({ message: "Error deleting subject", error: error.message });
  }
});

export default router;
