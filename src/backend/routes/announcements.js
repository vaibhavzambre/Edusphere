// src/backend/routes/announcements.js
import express from "express";
import Announcement from "../models/Announcement.js";
import { authMiddleware, checkAdmin } from "../middleware/authMiddleware.js";
import ClassModel from "../models/Class.js"; // <-- Import your Class model

const router = express.Router();

// Create an announcement (admin only)
router.post("/", authMiddleware, checkAdmin, async (req, res) => {
  try {
    const {
      title,
      content,
      type,
      roles,
      class: classId, // Renames "class" to "classId"
      classTarget,
      targetUsers,
      publishDate,
      expiryDate,
      attachments,
    } = req.body;

    // Build the announcement data object
    const announcementData = {
      title,
      content,
      type,
      roles,
      class: classId, // reference to the Class document (if provided)
      classTarget,
      targetUsers,
      publishDate,
      expiryDate,
      attachments,
      createdBy: req.user.id,
    };

    // If the announcement is class-specific, lookup the Class document
    // and fill in the class_code and commencement_year fields.
    if (type === "class" && classId) {
      const classDoc = await ClassModel.findById(classId);
      if (classDoc) {
        announcementData.class_code = classDoc.class_code;
        announcementData.commencement_year = classDoc.commencement_year;
      }
    }

    const announcement = new Announcement(announcementData);
    const saved = await announcement.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error("Error creating announcement:", error);
    res.status(500).json({ message: "Error creating announcement", error: error.message });
  }
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    const { role, classId } = req.user; // Get logged-in user's role and class
    const currentTime = new Date();

    let query = {};

    if (role === "admin") {
      // ✅ Admin sees all announcements
      query = {};
    } else if (role === "student") {
      // ✅ Students see only relevant announcements
      query = {
        publishDate: { $lte: currentTime }, // Show only published announcements
        $or: [
          { type: "global" }, // ✅ Show global announcements
          { type: "role", roles: "student" }, // ✅ Show role-based announcements for students
          { type: "class", class: classId, classTarget: { $in: ["students", "both"] } }, // ✅ Show class-specific announcements for students
        ],
      };
    } else if (role === "teacher") {
      // ✅ Teachers see only relevant announcements
      query = {
        publishDate: { $lte: currentTime }, // Show only published announcements
        $or: [
          { type: "global" }, // ✅ Show global announcements
          { type: "role", roles: "teacher" }, // ✅ Show role-based announcements for teachers
          { type: "class", class: classId, classTarget: { $in: ["teachers", "both"] } }, // ✅ Show class-specific announcements for teachers
        ],
      };
    }

    // Fetch and populate relevant fields
    const announcements = await Announcement.find(query)
      .populate("class")
      .populate("createdBy", "name email");

    res.status(200).json(announcements);
  } catch (error) {
    console.error("❌ Error fetching announcements:", error);
    res.status(500).json({ message: "Error fetching announcements", error: error.message });
  }
});


// DELETE an announcement (admin only)
router.delete("/:id", authMiddleware, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedAnnouncement = await Announcement.findByIdAndDelete(id);
    if (!deletedAnnouncement) {
      return res.status(404).json({ message: "Announcement not found" });
    }
    res.status(200).json({ message: "Announcement deleted successfully" });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    res.status(500).json({ message: "Error deleting announcement", error: error.message });
  }
});

// UPDATE an announcement (admin only)
// UPDATE an announcement (admin only)
// UPDATE an announcement (admin only)
// UPDATE an announcement (admin only)
import mongoose from "mongoose";
// ... other imports

router.put("/:id", authMiddleware, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      type,
      roles,
      class: classId, // received from the front-end as "class"
      classTarget,
      targetUsers,
      publishDate,
      expiryDate,
      attachments,
    } = req.body;

    // Build the update object.
    let updateData = {
      title,
      content,
      type,
      roles,
      publishDate,
      expiryDate,
      attachments,
      targetUsers,
    };

    if (type === "class") {
      // Ensure a valid classId is provided.
      if (!classId || classId.trim() === "") {
        return res.status(400).json({
          message:
            "A class selection is required for class-specific announcements.",
        });
      }
      // Look up the new class document using the provided classId.
      const classDoc = await ClassModel.findById(classId);
      if (!classDoc) {
        return res.status(400).json({ message: "Invalid class selection" });
      }
      // Explicitly cast the classId to an ObjectId using 'new' and update the reference.
      updateData = {
        ...updateData,
        class: new mongoose.Types.ObjectId(classId),
        class_code: classDoc.class_code,
        commencement_year: classDoc.commencement_year,
        classTarget, // update classTarget as well if provided
      };
    } else {
      // For non-class announcements, remove any class-related fields.
      updateData = {
        ...updateData,
        class: undefined,
        class_code: undefined,
        commencement_year: undefined,
        classTarget: undefined,
      };
    }

    // Use $set to force updating the fields.
    const updatedAnnouncement = await Announcement.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    )
      .populate("class")
      .populate("createdBy", "name email");

    if (!updatedAnnouncement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    res.status(200).json(updatedAnnouncement);
  } catch (error) {
    console.error("Error updating announcement:", error);
    res
      .status(500)
      .json({ message: "Error updating announcement", error: error.message });
  }
});


router.delete("/expired", authMiddleware, checkAdmin, async (req, res) => {
  try {
    const currentTime = new Date();
    const result = await Announcement.deleteMany({
      expiryDate: { $lte: currentTime }, // Delete where expiryDate has passed
    });

    res.status(200).json({ message: `Deleted ${result.deletedCount} expired announcements.` });
  } catch (error) {
    console.error("❌ Error deleting expired announcements:", error);
    res.status(500).json({ message: "Error deleting expired announcements", error: error.message });
  }
});

export default router;
