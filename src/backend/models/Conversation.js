// models/Conversation.js
import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],
    lastMessage: {
      content: { type: String, default: "" },
      timestamp: { type: Date, default: Date.now },
    },
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },

    // Group-related fields
    isGroup: { type: Boolean, default: false },
    groupName: { type: String, default: "" },
    groupAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Conversation", ConversationSchema);
