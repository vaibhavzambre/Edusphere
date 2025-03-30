import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // ✅ optional for group
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    content: { type: String, default: "" }, // Text message content
    file: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: "uploads.files" },
      name: { type: String },
      type: { type: String }
    },
        read: { type: Boolean, default: false },
    // Message.js
    deletedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
isDeletedForEveryone: { type: Boolean, default: false },
replyTo: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Message',
  default: null,
},
// In Message.js (Mongoose model)
// In models/Conversation.js
pinnedMessage: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Message',
  default: null,
},

reactions: [
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    emoji: String,
  },
],
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model("Message", MessageSchema);
