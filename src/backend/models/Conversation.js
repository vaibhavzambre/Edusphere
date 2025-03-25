// Conversation.js
import mongoose from "mongoose";
const ConversationSchema = new mongoose.Schema({
  participants: [
    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  ],

  // Instead of storing an object with `content` and `timestamp`,
  // store a reference to the actual Message document:
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
    default: null,
  },

  // Keep your unreadCounts, isGroup, groupName, etc.
  unreadCounts: {
    type: Map,
    of: Number,
    default: {},
  },
  pinnedMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
    default: null,
  },  
  
  isGroup: { type: Boolean, default: false },
  groupName: { type: String, default: "" },
  groupAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
},
{ timestamps: true });

export default mongoose.model("Conversation", ConversationSchema);
