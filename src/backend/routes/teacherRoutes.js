import express from "express";
import Subject from "../models/Subject.js";
import { authMiddleware, checkTeacher } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET Teacher's Subjects
router.get("/subjects", authMiddleware, checkTeacher, async (req, res) => {
  try {
    const subjects = await Subject.find({ teacher: req.user.id }).populate("class");
    res.status(200).json(subjects);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching teacher subjects", error: error.message });
  }
});

// GET Teacher's Classes (unique classes from subjects)
router.get("/classes", authMiddleware, checkTeacher, async (req, res) => {
  try {
    const subjects = await Subject.find({ teacher: req.user.id }).populate("class");
    const classesMap = {};
    subjects.forEach((subj) => {
      if (subj.class && !classesMap[subj.class._id]) {
        classesMap[subj.class._id] = subj.class;
      }
    });
    const classes = Object.values(classesMap);
    res.status(200).json(classes);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching teacher classes", error: error.message });
  }
});

export default router;
