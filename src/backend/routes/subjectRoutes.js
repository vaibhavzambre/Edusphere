import express from "express";
import Subject from "../models/Subject.js";
import Class from "../models/Class.js";
import { authMiddleware, checkAdmin } from "../middleware/authMiddleware.js";

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
