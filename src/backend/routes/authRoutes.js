import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import student from "../models/Student.js";
import Class from "../models/Class.js";
import { authMiddleware, checkAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// REGISTER User (Admin, Teacher, or Student)
router.post("/register", async (req, res) => {
  try {
    console.log("Incoming Register Request Body:", req.body);
    const { name, email, password, role, sap_id } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      sap_id: role === "student" ? sap_id : null,
    });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
});

// LOGIN User
router.post("/login", async (req, res) => {
  try {
    console.log("Incoming Login Request Body:", req.body);
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and Password required" });
      
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });
    
    const secret = process.env.JWT_SECRET || "your_secret_key";
    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role },
      secret,
      { expiresIn: "1h" }
    );
    
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
});


// GET All Teachers (Admin Only)
router.get("/teachers", authMiddleware, checkAdmin, async (req, res) => {
  try {
    console.log("Fetching Teachers - User:", req.user);
    const teachers = await User.find({ role: "teacher" }, "name email");
    if (!teachers || teachers.length === 0) {
      return res.status(404).json({ message: "No teachers found" });
    }
    res.status(200).json(teachers);
  } catch (error) {
    console.error("Error fetching teachers:", error);
    res.status(500).json({ message: "Error fetching teachers", error });
  }
});

// CREATE a New Teacher (Admin Only)
router.post("/teachers/create", authMiddleware, checkAdmin, async (req, res) => {
  console.log("Creating Teacher - Request by:", req.user);
  const { name, email, password } = req.body;
  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return res.status(400).json({ message: "All fields are required and cannot be empty" });
  }
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const newTeacher = new User({ name, email, password: hashedPassword, role: "teacher" });
    await newTeacher.save();
    res.status(201).json({ message: "Teacher created successfully", teacher: newTeacher });
  } catch (error) {
    console.error("Error creating teacher:", error);
    res.status(500).json({ message: "Error creating teacher", error });
  }
});

// UPDATE Teacher Info (Admin Only)
router.put("/teachers/update/:id", authMiddleware, checkAdmin, async (req, res) => {
  try {
    console.log("Incoming Update Request Body:", req.body);
    const { name, email } = req.body;
    const updatedTeacher = await User.findByIdAndUpdate(
      req.params.id,
      { name, email },
      { new: true }
    );
    if (!updatedTeacher) return res.status(404).json({ message: "Teacher not found" });
    res.status(200).json({ message: "Teacher updated successfully", teacher: updatedTeacher });
  } catch (error) {
    res.status(500).json({ message: "Error updating teacher", error });
  }
});

// DELETE Teacher (Admin Only)
router.delete("/teachers/delete/:id", authMiddleware, checkAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Teacher not found" });
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Teacher deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting teacher", error });
  }
});

// GET All Students (Admin Only)
router.get("/students", authMiddleware, checkAdmin, async (req, res) => {
  try {
    const students = await User.find({ role: "student" }).populate({
      path: "profile",
      model: "student",
      populate: { path: "class", model: "Class" }
    });
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: "Error fetching students", error });
  }
});

// CREATE a New Student (Admin Only)
router.post("/students/create", authMiddleware, checkAdmin, async (req, res) => {
  try {
    const { name, email, password, reg_id, class_code, commencement_year } = req.body;
    if (!name || !email || !password || !reg_id || !class_code || !commencement_year) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const classCodeNum = Number(class_code);
    const commencementYearNum = Number(commencement_year);
    const classExists = await Class.findOne({ class_code: classCodeNum, commencement_year: commencementYearNum });
    if (!classExists) {
      return res.status(400).json({ message: "Class not found with the given class_code and commencement_year" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const newStudent = new student({ reg_id: Number(reg_id), class: classExists._id });
    await newStudent.save();
    const newUser = new User({ name, email, password: hashedPassword, role: "student", profile: newStudent._id });
    await newUser.save();
    res.status(201).json({ message: "Student created successfully", student: newUser });
  } catch (error) {
    console.error("Error creating student:", error);
    res.status(500).json({ message: "Error creating student", error: error.message });
  }
});

// UPDATE Student Info (Admin Only)
router.put("/students/update/:id", authMiddleware, checkAdmin, async (req, res) => {
  try {
    console.log("Incoming Update Request Body:", req.body);
    const { name, email, password, profile } = req.body;
    const { reg_id, class_code, commencement_year } = profile || {};
    if (!name || !email || !profile || !reg_id || !class_code || !commencement_year) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const classCodeNum = Number(class_code);
    const commencementYearNum = Number(commencement_year);
    const classExists = await Class.findOne({ class_code: classCodeNum, commencement_year: commencementYearNum });
    if (!classExists) {
      return res.status(400).json({ message: "Class not found with the given class_code and commencement_year" });
    }
    let updatedStudent = await User.findById(req.params.id)
      .populate({ path: "profile", model: "student" })
      .exec();
    if (!updatedStudent) return res.status(404).json({ message: "Student not found" });
    if (!updatedStudent.profile || !updatedStudent.profile._id) {
      return res.status(400).json({ message: "Student profile not found. Cannot update." });
    }
    let updatedFields = { name, email };
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updatedFields.password = hashedPassword;
    }
    await User.findByIdAndUpdate(req.params.id, updatedFields, { new: true });
    const updatedProfile = await student.findByIdAndUpdate(
      updatedStudent.profile._id,
      { reg_id: Number(reg_id), class: classExists._id },
      { new: true }
    );
    const finalUpdatedStudent = await User.findById(req.params.id)
      .populate({
        path: "profile",
        model: "student",
        populate: { path: "class", model: "Class" }
      })
      .exec();
    res.status(200).json({
      message: "Student updated successfully",
      student: finalUpdatedStudent,
    });
  } catch (error) {
    console.error("Error updating student:", error.message || error);
    res.status(500).json({ message: "Error updating student", error: error.message || error });
  }
});

// DELETE Student (Admin Only)
router.delete("/students/delete/:id", authMiddleware, checkAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Student not found" });
    if (user.profile) {
      await student.findByIdAndDelete(user.profile);
    }
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Student deleted successfully" });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({ message: "Error deleting student", error });
  }
});

export default router;
