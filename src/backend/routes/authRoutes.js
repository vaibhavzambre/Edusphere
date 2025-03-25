import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import AWS from "aws-sdk";
import dotenv from "dotenv";

import User from "../models/User.js";
import student from "../models/Student.js";
import Class from "../models/Class.js";
import { authMiddleware, checkAdmin } from "../middleware/authMiddleware.js";
import twilio from "twilio";

// Load environment variables
dotenv.config({ path: './src/backend/.env' });

// Twilio client for phone-based 2FA
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// AWS Lambda client (used for email OTP in your code)
const lambda = new AWS.Lambda({
  region: process.env.AWS_REGION || "us-east-1",
});

// Helper function to send OTP email via AWS Lambda (SES)
const sendOTPEmail = async (toEmail, otp, subject, message) => {
  const params = {
    FunctionName: process.env.AWS_OTP_EMAIL_FUNCTION, // e.g. "SendOTPEmail"
    InvocationType: "RequestResponse",
    Payload: JSON.stringify({ toEmail, otp, subject, message }),
  };
  return new Promise((resolve, reject) => {
    lambda.invoke(params, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
};

const router = express.Router();

/* ==============================
   1. REGISTER
   ============================== */
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
    return res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({ message: "Server error during registration" });
  }
});

/* ==============================
   2. LOGIN
   ============================== */
router.post("/login", async (req, res) => {
  try {
    console.log("Incoming Login Request Body:", req.body);
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and Password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log("Login Error: user not found for email:", email);
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("Login Error: invalid credentials for user:", user.email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    console.log("Login: user found:", user.email, "| 2FA Enabled:", user.twoFactorEnabled, "| phone:", user.phone);

    // If user has 2FA enabled, send OTP via Twilio
    if (user.twoFactorEnabled && user.phone) {
      try {
        console.log("Sending Twilio OTP to phone:", user.phone);
        await client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
          .verifications.create({ to: user.phone, channel: "sms" });

        // Indicate the frontend that OTP is needed
        console.log("Returning requires2FA = true for user:", user.email);
        return res.json({ requires2FA: true, userId: user._id });
      } catch (err) {
        console.error("Twilio Verify Send Error:", err);
        return res.status(500).json({ message: "Failed to send OTP" });
      }
    }

    // Otherwise, generate normal JWT with twoFactorEnabled + phone
    console.log("Generating normal login JWT with 2FA fields:", user.twoFactorEnabled, user.phone);

    const token = jwt.sign(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled, // ADD THIS
        phone: user.phone,                       // ADD THIS
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    console.log("Returning login success for user:", user.email, "| twoFactorEnabled:", user.twoFactorEnabled);

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled, // ADD
        phone: user.phone,                       // ADD
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Server error during login" });
  }
});

/* ==============================
   3. OTP Verification (For Login)
   ============================== */
router.post("/verify-otp", async (req, res) => {
  const { userId, otp } = req.body;
  console.log("verify-otp route hit. userId:", userId, "otp:", otp);

  try {
    const user = await User.findById(userId);
    if (!user || !user.phone) {
      console.log("Verify OTP Error: invalid user or no phone");
      return res.status(400).json({ message: "Invalid user" });
    }

    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks
      .create({ to: user.phone, code: otp });

    console.log("Twilio verificationCheck status:", verificationCheck.status);

    if (verificationCheck.status === "approved") {
      const token = jwt.sign(
        {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          // We can also add phone + twoFactorEnabled here if you want
          twoFactorEnabled: user.twoFactorEnabled,
          phone: user.phone,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
      return res.json({ token });
    } else {
      return res.status(400).json({ message: "Invalid OTP" });
    }
  } catch (err) {
    console.error("Twilio Verify Check Error:", err);
    return res.status(500).json({ message: "OTP verification failed" });
  }
});

/* ==============================
   4. 2FA SEND OTP (Enable/Disable)
   ============================== */
router.post("/2fa/send-otp", authMiddleware, async (req, res) => {
  const { phone, forDisable } = req.body;  // We read 'forDisable' from React
  console.log("/2fa/send-otp route => phone:", phone, "forDisable:", forDisable);

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      console.log("Send OTP Error: user not found for id:", req.user.id);
      return res.status(404).json({ message: "User not found" });
    }

    const toSend = forDisable ? user.phone : phone;
    console.log("send-otp => toSend:", toSend);

    if (!toSend) {
      console.log("Send OTP Error: no phone number provided");
      return res.status(400).json({ message: "Phone number is required" });
    }

    await client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: toSend, channel: "sms" });

    console.log("send-otp => Twilio verification sent successfully");
    return res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Twilio Send OTP Error:", error.message || error);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
});

/* ==============================
   5. 2FA TOGGLE (Enable/Disable) + Return New JWT
   ============================== */
router.post("/2fa/toggle", authMiddleware, async (req, res) => {
  const { enable, phone, otp } = req.body;
  console.log("/2fa/toggle => enable:", enable, "phone:", phone, "otp:", otp);

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      console.log("2FA Toggle Error: user not found for id:", req.user.id);
      return res.status(404).json({ message: "User not found" });
    }

    const verifyService = client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID);

    if (enable) {
      // Enabling 2FA
      if (!phone || !otp) {
        console.log("2FA Toggle Error: phone or OTP missing while enabling");
        return res.status(400).json({ message: "Phone and OTP required" });
      }

      const check = await verifyService.verificationChecks.create({ to: phone, code: otp });
      console.log("verifyService check status (enable):", check.status);
      if (check.status !== "approved") {
        return res.status(400).json({ message: "Invalid OTP" });
      }

      user.twoFactorEnabled = true;
      user.phone = phone;
      await user.save();
      console.log("User 2FA enabled in DB => phone:", phone);
    } else {
      // Disabling 2FA
      if (!user.phone || !otp) {
        console.log("2FA Toggle Error: no phone or OTP while disabling");
        return res.status(400).json({ message: "OTP required to disable 2FA" });
      }

      const check = await verifyService.verificationChecks.create({ to: user.phone, code: otp });
      console.log("verifyService check status (disable):", check.status);
      if (check.status !== "approved") {
        return res.status(400).json({ message: "Invalid OTP" });
      }

      user.twoFactorEnabled = false;
      user.phone = undefined;
      await user.save();
      console.log("User 2FA disabled in DB");
    }

    // Generate a new JWT reflecting updated 2FA status
    const newToken = jwt.sign(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
        phone: user.phone,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    console.log("2FA Toggle => returning new token => twoFactorEnabled:", user.twoFactorEnabled, "phone:", user.phone);
    return res.status(200).json({ message: `2FA ${enable ? "enabled" : "disabled"} successfully`, token: newToken });
  } catch (error) {
    console.error("2FA Toggle Error:", error.message || error);
    return res.status(500).json({ message: "Server error during 2FA toggle" });
  }
});

/* ==============================
   TEACHERS / STUDENTS / ETC.
   ============================== */
// The rest of your teacher/student routes remain as you had them
// We'll keep them here for completeness:

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

// ========================
// NEW: Forgot Password Routes
// ========================

// Request OTP for forgot password
router.post("/forgot-password-request", async (req, res) => {
  const { email } = req.body;
  if (!email)
    return res.status(400).json({ message: "Email is required" });
  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.passwordResetOTP = otp;
    user.passwordResetOTPExpires = Date.now() + 15 * 60 * 1000; // valid for 15 minutes
    await user.save();

    await sendOTPEmail(
      user.email,
      otp,
      "Forgot Password OTP",
      `Your OTP for password reset is: ${otp}`
    );

    res.status(200).json({ message: "OTP sent to your email" });
  } catch (error) {
    console.error("Forgot Password Request Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Reset password using OTP (forgot password flow)
router.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword)
    return res.status(400).json({ message: "Email, OTP and new password are required" });
  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "User not found" });
    if (user.passwordResetOTP !== otp || user.passwordResetOTPExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.passwordResetOTP = undefined;
    user.passwordResetOTPExpires = undefined;
    await user.save();
    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ========================
// NEW: Change Password Routes (Authenticated)
// ========================

/* ==============================
   CHANGE PASSWORD (NEW LOGIC)
   ============================== */

/**
 * 1) Verify current password
 */
router.post("/change-password/verify-current", authMiddleware, async (req, res) => {
  try {
    const { currentPassword } = req.body;
    if (!currentPassword) {
      return res.status(400).json({ message: "Current password is required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Return whether 2FA is enabled so front-end can decide next step
    return res.status(200).json({
      twoFactorEnabled: user.twoFactorEnabled,
      phone: user.phone,
    });
  } catch (error) {
    console.error("change-password/verify-current error:", error);
    return res.status(500).json({ message: "Server error verifying current password" });
  }
});

/**
 * 2) Final step: actually update password
 */
router.post("/change-password/do-update", authMiddleware, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("change-password/do-update error:", error);
    return res.status(500).json({ message: "Server error updating password" });
  }
});
export default router;
