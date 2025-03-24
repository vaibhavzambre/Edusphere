import express from "express";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ Get all conversations for the logged-in user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all conversations where the user is a participant
    const conversations = await Conversation.find({ participants: userId })
  .populate("participants", "name email role avatar")
  .populate({
    path: "lastMessage",
    select: "content file timestamp sender isDeletedForEveryone",
    populate: {
      path: "sender",
      select: "name avatar email",
    },
  })
  .sort({ updatedAt: -1 });

console.log("DEBUG SERVER: conversations ->", conversations);

  

    res.json(conversations);
  } catch (error) {
    console.error("❌ Error fetching conversations:", error);
    res.status(500).json({ error: "Failed to load conversations" });
  }
});

// ✅ Export the router
export default router;
