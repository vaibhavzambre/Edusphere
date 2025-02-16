import express from "express";
import Announcement from "../models/Announcement.js";
import { authMiddleware, checkAdmin } from "../middleware/authMiddleware.js";
import mongoose from "mongoose";
import User from "../models/User.js";            // NEW: Import User model
import Student from "../models/Student.js";      // NEW: Import Student model

const router = express.Router();

/**
 * ✅ CREATE an Announcement (Admin Only)
 */
router.post("/", authMiddleware, checkAdmin, async (req, res) => {
  try {
    const {
      title,
      content,
      type,
      roles,
      classes, // using one field for class-specific announcements
      targetUsers,
      publishDate,
      expiryDate,
      expiryType,
      attachmentsEnabled,
      attachments,
    } = req.body;

    // Validate required fields
    if (!title || !content || !type || !publishDate || !expiryType || attachmentsEnabled === undefined) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const announcementData = {
      title,
      content,
      type,
      roles: roles || [],
      classes: classes || [],
      targetUsers: targetUsers || [],
      publishDate,
      expiryDate, // The pre-save hook adjusts for permanent announcements.
      expiryType,
      attachmentsEnabled,
      attachments: attachments || [],
      createdBy: req.user.id,
      visible: true,
    };

    const announcement = new Announcement(announcementData);
    const saved = await announcement.save();
    // UPDATED: Re-fetch the announcement with population so that classes are fully populated.
    const populatedAnnouncement = await Announcement.findById(saved._id)
      .populate("classes", "class_code commencement_year specialization")
      .populate("targetUsers", "name email")
      .populate("createdBy", "name email");
    res.status(201).json(populatedAnnouncement);
  } catch (error) {
    console.error("Error creating announcement:", error);
    res.status(500).json({ message: "Error creating announcement", error: error.message });
  }
});

/**
 * ✅ FETCH Announcements (For Students, Teachers & Admin)
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    // Extract role and id from the token payload.
    const { role, id } = req.user;
    let query = {};

    if (role === "admin") {
      // Admin sees all announcements.
    } else if (role === "student") {
      // For students, only show announcements if:
      //   - They are global, role-based, or individual announcements; or
      //   - They are class-specific and the student's class is included in the announcement.
      const orConditions = [
        { type: "global" },
        { type: "role", roles: role },
        { type: "individual", targetUsers: id },
      ];

      // Look up the full user document to get the profile reference.
      const userDoc = await User.findById(id);
      if (userDoc && userDoc.profile) {
        const studentDoc = await Student.findById(userDoc.profile);
        if (studentDoc && studentDoc.class) {
          // Only include class-specific announcements for the student's class.
          orConditions.push({ type: "class", classes: { $in: [studentDoc.class] } });
        }
      }
      query.$or = orConditions;
    } else if (role === "teacher") {
      // For teachers, adjust the logic as needed. Here we assume teachers see only global, role-based, and individual announcements.
      query.$or = [
        { type: "global" },
        { type: "role", roles: role },
        { type: "individual", targetUsers: id },
      ];
    }

    let announcementsQuery = Announcement.find(query)
      .populate("classes", "class_code commencement_year specialization")
      .populate("targetUsers", "name email")
      .populate("createdBy", "name email");

    // Optionally hide the "type" and "roles" fields for non-admin users.
    if (role !== "admin") {
      announcementsQuery = announcementsQuery.select("-type -roles");
    }

    const announcements = await announcementsQuery.exec();
    res.status(200).json(announcements);
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).json({ message: "Error fetching announcements", error: error.message });
  }
});

/**
 * ✅ UPDATE an Announcement (Admin Only)
 */
router.put("/:id", authMiddleware, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      type,
      roles,
      classes, // using only one field for classes
      targetUsers,
      publishDate,
      expiryDate,
      expiryType,
      attachmentsEnabled,
      attachments,
    } = req.body;

    if (!title || !content || !type || !publishDate || !expiryType || attachmentsEnabled === undefined) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const updateData = {
      title,
      content,
      type,
      roles: roles || [],
      classes: classes || [],
      targetUsers: targetUsers || [],
      publishDate,
      expiryDate,
      expiryType,
      attachmentsEnabled,
      attachments: attachments || [],
    };

    const updatedAnnouncement = await Announcement.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    )
      .populate("classes", "class_code commencement_year specialization")
      .populate("targetUsers", "name email")
      .populate("createdBy", "name email");

    if (!updatedAnnouncement) {
      return res.status(404).json({ message: "Announcement not found" });
    }
    res.status(200).json(updatedAnnouncement);
  } catch (error) {
    console.error("Error updating announcement:", error);
    res.status(500).json({ message: "Error updating announcement", error: error.message });
  }
});

/**
 * ✅ DELETE an Announcement (Admin Only)
 */
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

export default router;
