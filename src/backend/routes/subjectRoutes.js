import express from "express";
import Subject from "../models/Subject.js";
import Class from "../models/Class.js";
// import { checkAdmin } from "../middleware/authMiddleware.js"; // if you need admin-check

const router = express.Router();

// Create Subject
router.post("/create", async (req, res) => {
  try {
    console.log("📌 Received Data for Create:", req.body);

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

    // Ensure all required fields are provided (teacher is optional)
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

    // Convert numeric fields to numbers
    max_no_of_hours = Number(max_no_of_hours);
    hours_conducted = Number(hours_conducted);
    semester = Number(semester);
    class_code = Number(class_code);
    commencement_year = Number(commencement_year);

    console.log("📌 Converted Values for Create:", {
      max_no_of_hours,
      hours_conducted,
      semester,
      class_code,
      commencement_year,
    });

    // Check that hours conducted does not exceed max hours
    if (hours_conducted > max_no_of_hours) {
      return res.status(400).json({ message: "Hours conducted cannot be greater than max hours." });
    }

    // Look up Class by class_code & commencement_year
    const classExists = await Class.findOne({ class_code, commencement_year });
    if (!classExists) {
      console.log("❌ No matching class found for create:", { class_code, commencement_year });
      return res.status(400).json({ message: "Class with given class_code and commencement_year not found" });
    }

    // Check for uniqueness (teacher is not part of the composite unique index)
    const existingSubject = await Subject.findOne({ subject_code, class_code, commencement_year });
    if (existingSubject) {
      return res.status(400).json({ message: "This subject already exists for the given class and year." });
    }

    // Create Subject & reference the Class; include teacher if provided
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
    console.log("📌 Created Subject in DB:", newSubject);
    res.status(201).json({ message: "Subject created successfully", subject: newSubject });
  } catch (error) {
    console.error("❌ Error creating subject:", error);
    res.status(500).json({ message: "Error creating subject", error: error.message });
  }
});

// Get all Subjects
router.get("/", async (req, res) => {
  try {
    const subjects = await Subject.find().populate("class").populate("teacher");
    res.status(200).json(subjects);
  } catch (error) {
    res.status(500).json({ message: "Error fetching subjects", error });
  }
});

// Update Subject
router.put("/update/:id", async (req, res) => {
  try {
    console.log("📌 Received Data for Update:", req.body);

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

    // Convert numeric fields to numbers
    max_no_of_hours = Number(max_no_of_hours);
    hours_conducted = Number(hours_conducted);
    semester = Number(semester);
    class_code = Number(class_code);
    commencement_year = Number(commencement_year);

    console.log("📌 Converted Values:", { max_no_of_hours, hours_conducted, class_code, commencement_year });

    // Check that hours conducted does not exceed max hours
    if (hours_conducted > max_no_of_hours) {
      return res.status(400).json({ message: "Hours conducted cannot be greater than max hours." });
    }

    // Look up Class by class_code & commencement_year
    const classExists = await Class.findOne({ class_code, commencement_year });
    if (!classExists) {
      console.log("❌ No matching class found for update:", { class_code, commencement_year });
      return res.status(400).json({ message: "Class with given class_code and commencement_year not found" });
    }

    // Check for uniqueness: if another subject (with a different ID) already has this composite key.
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
      { new: true, runValidators: true, context: "query" } // <-- Important: pass context: 'query'
    );

    console.log("📌 Updated Subject in DB:", updatedSubject);
    res.status(200).json({ message: "Subject updated successfully", subject: updatedSubject });
  } catch (error) {
    console.error("❌ Error updating subject:", error);
    res.status(500).json({ message: "Error updating subject", error: error.message });
  }
});

// Delete Subject
router.delete("/delete/:id", async (req, res) => {
  try {
    console.log("📌 Received Delete Request for Subject ID:", req.params.id);
    const deletedSubject = await Subject.findByIdAndDelete(req.params.id);
    if (!deletedSubject) {
      return res.status(404).json({ message: "Subject not found" });
    }
    console.log("📌 Deleted Subject:", deletedSubject);
    res.status(200).json({ message: "Subject deleted successfully", subject: deletedSubject });
  } catch (error) {
    console.error("❌ Error deleting subject:", error);
    res.status(500).json({ message: "Error deleting subject", error: error.message });
  }
});

export default router;
