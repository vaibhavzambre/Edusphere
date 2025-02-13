// src/backend/routes/announcements.js
import express from "express";
import Announcement from "../models/Announcement.js";
import { authMiddleware, checkAdmin } from "../middleware/authMiddleware.js";
import UserModel from "../models/User.js"; // Import User model
import mongoose from "mongoose";

const router = express.Router();

/**
 * ✅ CREATE an Announcement (Admin Only)
 * Supports: Global, Role-Specific, Class-Specific (Removed), Individual-Specific
 */
router.post("/", authMiddleware, checkAdmin, async (req, res) => {
  try {
    const {
      title,
      content,
      type,
      roles,
      targetUsers, // Selected students & teachers
      publishDate,
      expiryDate,
      attachments,
    } = req.body;

    const announcementData = {
      title,
      content,
      type,
      roles,
      targetUsers: targetUsers || [], // Store user IDs directly
      publishDate,
      expiryDate,
      attachments,
      createdBy: req.user.id,
    };

    const announcement = new Announcement(announcementData);
    const saved = await announcement.save();
    res.status(201).json(saved);
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
    const { role, id } = req.user; // Get logged-in user's role and ID
    const currentTime = new Date();

    let query = { publishDate: { $lte: currentTime } };

    if (role === "admin") {
      // ✅ Admin sees all announcements
      query = {};
    } else if (role === "student" || role === "teacher") {
      // ✅ Students & Teachers see their specific announcements
      query.$or = [
        { type: "global" }, // Show global announcements
        { type: "role", roles: role }, // Show role-based announcements
        { type: "individual", targetUsers: id }, // Show individual-specific announcements
      ];
    }

    // Fetch and populate relevant fields
    const announcements = await Announcement.find(query)
      .populate("targetUsers", "name email") // Populate names of selected users
      .populate("createdBy", "name email");

    res.status(200).json(announcements);
  } catch (error) {
    console.error("❌ Error fetching announcements:", error);
    res.status(500).json({ message: "Error fetching announcements", error: error.message });
  }
});

/**
 * ✅ UPDATE an Announcement (Admin Only)
 * Now updates `targetUsers` correctly
 */
router.put("/:id", authMiddleware, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      type,
      roles,
      targetUsers,
      publishDate,
      expiryDate,
      attachments,
    } = req.body;

    let updateData = {
      title,
      content,
      type,
      roles,
      targetUsers: targetUsers || [],
      publishDate,
      expiryDate,
      attachments,
    };

    // Update the announcement
    const updatedAnnouncement = await Announcement.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).populate("targetUsers", "name email")
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

/**
 * ✅ DELETE Expired Announcements (Admin Only)
 */
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
