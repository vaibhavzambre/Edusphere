  import express from "express";
  import Message from "../models/Message.js";
  import User from "../models/User.js";
  import Conversation from "../models/Conversation.js";
  import Student from "../models/Student.js";
  import { authMiddleware } from "../middleware/authMiddleware.js";

  const router = express.Router();

  // ✅ Send a message (supports text & file)
  // ✅ NEW UPDATED ROUTE
  router.post("/send", authMiddleware, async (req, res) => {
    try {
      const { conversationId, content, file, receiver } = req.body;
      const sender = req.user.id;

      // if (!conversationId || (!content?.trim() && !file)) {
      //   return res.status(400).json({ error: "Conversation ID and content or file required." });
      // }

      // const conversation = await Conversation.findById(conversationId);
      // if (!conversation) {
      //   return res.status(404).json({ error: "Conversation not found" });
      // }let conversation;
      let conversation; // ✅ ADD THIS BACK

if (!conversationId) {
  // New 1-to-1 chat logic
  if (!receiver) {
    return res.status(400).json({ error: "Receiver is required for new 1-to-1 message." });
  }

  conversation = await Conversation.findOne({
    isGroup: false,
    participants: { $all: [sender, receiver], $size: 2 },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [sender, receiver],
      isGroup: false,
    });
  }
} 
else {
  conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return res.status(404).json({ error: "Conversation not found" });
  }
}

      const isGroup = conversation.isGroup;

      const newMessageData = {
        sender,
        content,
        file,
        conversationId: conversation._id, // ✅ Fix: always assign from actual conversation object
        timestamp: new Date(),
        replyTo: req.body.replyTo || null,
      };

      // ✅ Only set receiver for 1-to-1
      if (!isGroup && receiver) {
        newMessageData.receiver = receiver;
      }

      const newMessage = new Message(newMessageData);
      await newMessage.save();

      // Populate sender + replyTo → sender
      await newMessage.populate([
        { path: "sender", select: "name email avatar" },
        {
          path: "replyTo",
          populate: {
            path: "sender",
            select: "name email avatar",
          },
        },
      ]);

      // 1) **Populate** the sender right away
      await newMessage.populate("sender", "name email avatar");

      // 2) Then do your last‐message, unread‐counts, etc.
      conversation.lastMessage = {
        content: file ? "📎 Sent an attachment" : content,
        file,
        timestamp: newMessage.timestamp,
        _id: newMessage._id,
      };

      // -- ADDED: Mark lastMessage as modified so updatedAt changes --
      conversation.markModified("lastMessage");

      conversation.participants.forEach((participantId) => {
        if (participantId.toString() !== sender.toString()) {
          const prev = conversation.unreadCounts.get(participantId.toString()) || 0;
          conversation.unreadCounts.set(participantId.toString(), prev + 1);
        }
      });

      conversation.deletedFor.set(sender, false);

      if (!isGroup && receiver) {
        conversation.deletedFor.set(receiver, false); // ✅ Reset receiver's deleted state too
      }
            await conversation.save();
// ✅ If user had deleted it before, reset their deleted status


      // Emit to each participant's userId room
      conversation.participants.forEach((userId) => {
        req.io.to(userId.toString()).emit("newMessage", newMessage);
        req.io.to(userId.toString()).emit("conversationCreated", conversation);
      });

      // Also emit to the conversation's own room
      req.io.to(conversation._id.toString()).emit("newMessage", newMessage);
      req.io.to(conversation._id.toString()).emit("conversationCreated", conversation);

      res.status(201).json({
        message: newMessage,
        conversationId: conversation._id, // ✅ so frontend updates temporary ID to real one
      });
          } catch (error) {
      console.error("❌ Error sending message:", error);
      res.status(500).json({ error: "Message sending failed", details: error.message });
    }
  });

  // ✅ Fetch conversations
  router.get("/conversations", authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;

      // Find all conversations where the user is a participant
      const conversations = await Conversation.find({ participants: userId, [`deletedFor.${userId}`]: { $ne: true } })
        .populate("participants", "name email role avatar")
        .populate("createdBy", "name email avatar") // ✅ add this
        .populate({
          path: "lastMessage",
          select: "content file timestamp sender isDeletedForEveryone readBy",
          populate: {
            path: "sender",
            select: "name avatar email",
          },
        })
        .populate({
          path: "lastMessage",
          select: "content file timestamp isDeletedForEveryone deletedBy", // 👈 include this
        })    
        .populate({
          path: "pinnedMessage",
          populate: {
            path: "sender",
            select: "name avatar email"
          }
        })
            
        .sort({ updatedAt: -1 });

      // Add unread count per conversation
      const enrichedConversations = conversations.map((conv) => {
        const unreadCount = conv.unreadCounts?.get?.(userId.toString()) || 0;
      
        return {
          ...conv.toObject(),
          unreadCount,
        };
      });
    
      res.json(enrichedConversations);
    } catch (error) {
      console.error("❌ Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to load conversations" });
    }
  });
  router.get("/conversations/:id", authMiddleware, async (req, res) => {
    try {
      const conversation = await Conversation.findById(req.params.id)
        .populate("participants", "name email avatar role")
        .populate("createdBy", "name email avatar") // ✅ ADD THIS
        .populate({
          path: "pinnedMessage",
          populate: {
            path: "sender",
            select: "name avatar email"
          }
        })
        
        .populate({
          path: "lastMessage",
          select: "content file timestamp sender isDeletedForEveryone",
          populate: {
            path: "sender",
            select: "name avatar email",
          },
          
        });

      if (!conversation) return res.status(404).json({ error: "Not found" });

      res.json(conversation);
    } catch (error) {
      console.error("❌ Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to load conversation" });
    }
  });

  // ✅ Fetch messages for a conversation
  router.get("/conversation/:conversationId", authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      const { conversationId } = req.params;

      // ✅ Find the conversation
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return res.status(404).json({ error: "Conversation not found" });

      // ✅ Ensure user is a participant
      if (!conversation.participants.includes(userId)) {
        return res.status(403).json({ error: "Not authorized to view this conversation" });
      }

      // ✅ Fetch messages for this conversation
      const messages = await Message.find({
        conversationId,
        isDeletedForEveryone: { $ne: true },
      })
        .populate("sender", "name avatar") // ✅ Populate the sender
        .populate("replyTo", "content sender") // ✅ Keep this for reply support
        .populate({
          path: "replyTo",
          populate: {
            path: "sender",
            select: "name avatar",
          },
        })
        .populate({
          path: 'replyTo',
          populate: { path: 'sender', select: 'name' }
        }).populate({
          path: 'replyTo',
          populate: {
            path: 'conversationId',
            select: 'isGroup groupName'
          }
        })
        .populate('sender', 'name avatar')
        .sort({ timestamp: 1 });

      res.json(messages);
    } catch (error) {
      console.error("❌ Error fetching conversation messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });
  // Pin message
  // Pin message
  router.put("/pin/:conversationId", authMiddleware, async (req, res) => {
    try {
      const { messageId } = req.body;
      const { conversationId } = req.params;

      // 1) update conversation
      const updatedConversation = await Conversation.findByIdAndUpdate(
        conversationId,
        { pinnedMessage: messageId },
        { new: true }
      ).populate("pinnedMessage");

      // 2) emit using req.io, not io
      req.io.to(conversationId).emit("pinnedMessageUpdated", updatedConversation.pinnedMessage);

      res.json(updatedConversation.pinnedMessage);
    } catch (err) {
      console.error("❌ Pin error:", err);
      res.status(500).json({ message: "Failed to pin message" });
    }
  });


  // Unpin message
  router.put("/unpin/:conversationId", authMiddleware, async (req, res) => {
    try {
      const { conversationId } = req.params;

      const updatedConversation = await Conversation.findByIdAndUpdate(
        conversationId,
        { $unset: { pinnedMessage: 1 } },
        { new: true }
      );

      // emit using req.io
      req.io.to(conversationId).emit("pinnedMessageUpdated", null);

      res.json(null);
    } catch (err) {
      console.error("❌ Unpin error:", err);
      res.status(500).json({ message: "Failed to unpin message" });
    }
  });


  // Get pinned message
  router.get("/pinned/:conversationId", authMiddleware, async (req, res) => {
    try {
      const convo = await Conversation.findById(req.params.conversationId)
        .populate("pinnedMessage");

      res.json(convo.pinnedMessage || null);
    } catch (err) {
      console.error("❌ Get pinned message failed:", err);
      res.status(500).json({ message: "Failed to get pinned message" });
    }
  });

  router.post("/createGroup", authMiddleware, async (req, res) => {
    try {
      const { groupName, classIds = [], individualUserIds = [] } = req.body;
      const creatorId = req.user.id;

      // 1) Gather all students from the selected classes
      const matchedStudents = await Student.find({ class: { $in: classIds } });
      // matchedStudents => array of Student docs (with _id, reg_id, etc.)

      // Next, find the User docs that reference those student _ids
      const matchedStudentUsers = await User.find({
        role: "student",
        profile: { $in: matchedStudents.map((s) => s._id) },
      });
      const classStudentIds = matchedStudentUsers.map((u) => u._id.toString());

      // 2) Filter out any user with role="admin" from the individually selected
      const validIndividuals = await User.find({
        _id: { $in: individualUserIds },
        role: { $ne: "admin" },
      });
      const individualIds = validIndividuals.map((u) => u._id.toString());

      // 3) Combine class-based students + individuals into a Set
      const combinedSet = new Set([...classStudentIds, ...individualIds]);

      // 4) If the creator is NOT role="admin", include them as well
      const creatorDoc = await User.findById(creatorId);
      if (creatorDoc && creatorDoc.role !== "admin") {
        combinedSet.add(creatorId);
      }

      // 5) Create new group conversation
      const newConversation = new Conversation({
        participants: Array.from(combinedSet),
        isGroup: true,
        groupName: groupName || "Untitled Group",
        groupAdmin: creatorDoc && creatorDoc.role !== "admin" ? [creatorId] : [],
        createdBy: creatorId, // ✅ store creator
      });
      
      await newConversation.save();

      // Emit to each participant's userId room
      newConversation.participants.forEach((userId) => {
        req.io.to(userId.toString()).emit("conversationCreated", newConversation);
      });

      // Also emit to the conversation's own room
      req.io.to(newConversation._id.toString()).emit("conversationCreated", newConversation);

      return res.status(201).json(newConversation);
    } catch (error) {
      console.error("❌ Error creating group:", error);
      return res.status(500).json({ error: "Failed to create group" });
    }
  });
  router.put("/mark-read/:conversationId", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { conversationId } = req.params;

    try {
      await Message.updateMany(
        {
          conversationId,
          readBy: { $ne: userId },
          isDeletedForEveryone: { $ne: true },
          deletedBy: { $ne: userId }
        },
        { $addToSet: { readBy: userId } }
      );

      // Optionally, reset the unread count per user on conversation too
      await Conversation.findByIdAndUpdate(conversationId, {
        $set: { [`unreadCounts.${userId}`]: 0 }
      });

      req.io.to(userId).emit("markedAsRead", conversationId); // ✅ notify

      res.status(200).json({ success: true });
    } catch (err) {
      console.error("❌ Failed to mark as read:", err);
      res.status(500).json({ error: "Failed to mark messages as read" });
    }
  });


  router.post("/find-or-create", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { participantId } = req.body;

    if (!participantId) return res.status(400).json({ error: "Participant required" });

    // Find existing 1-1 conversation
    let convo = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [userId, participantId], $size: 2 },
    });

    if (!convo) {
      convo = new Conversation({
        participants: [userId, participantId],
        isGroup: false,
      });
      await convo.save();
    }

    convo = await convo.populate("participants", "name email role avatar");
    res.json(convo);
  });

  // ✅ Edit a message (supports text only)
  router.put("/edit/:id", authMiddleware, async (req, res) => {
    try {
      const { content } = req.body;

      let message = await Message.findById(req.params.id);
      if (!message) return res.status(404).json({ error: "Message not found" });

      // Update text
      message.content = content;
      await message.save();

      // **Populate** the sender so the client sees name/email:
      await message.populate("sender", "name email avatar");

      const conversation = await Conversation.findById(message.conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // If the last message is the one we just edited, update it
      if (
        conversation.lastMessage &&
        String(conversation.lastMessage._id) === String(message._id)
      ) {
        conversation.lastMessage.content = content;

        // -- ADDED: Mark lastMessage as modified so updatedAt changes --
        conversation.markModified("lastMessage");

        await conversation.save();

        // Broadcast the updated conversation
        conversation.participants.forEach((uid) => {
          req.io.to(uid.toString()).emit("conversationCreated", conversation);
        });
        req.io
          .to(conversation._id.toString())
          .emit("conversationCreated", conversation);
      }

      // Also broadcast "messageEdited" so your front-end can do real-time changes
      req.io
        .to(conversation._id.toString())
        .emit("messageEdited", message);

      return res.json(message);
    } catch (error) {
      console.error("❌ Error editing message:", error);
      res.status(500).json({ error: "Message edit failed" });
    }
  });

  // ✅ Enhanced Emoji Reaction Logic
  router.put("/react/:id", authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      const { emoji } = req.body;

      const message = await Message.findById(req.params.id);
      if (!message) return res.status(404).json({ error: "Message not found" });

      // Check if user already reacted
      const existingIndex = message.reactions.findIndex(
        (r) => r.user.toString() === userId
      );

      if (existingIndex !== -1) {
        // User already reacted
        if (message.reactions[existingIndex].emoji === emoji) {
          // Same emoji → remove reaction
          message.reactions.splice(existingIndex, 1);
        } else {
          // Different emoji → update reaction
          message.reactions[existingIndex].emoji = emoji;
        }
      } else {
        // New reaction
        message.reactions.push({ user: userId, emoji });
      }

      await message.save();

      // ✅ Already conversation-based
      req.io.to(message.conversationId.toString()).emit("messageReacted", message);

      res.json(message);
    } catch (error) {
      console.error("❌ Reaction failed:", error);
      res.status(500).json({ error: "Failed to react" });
    }
  });

  // ✅ Delete a message
  router.put("/delete/:id", authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      const { forEveryone } = req.body;

      const message = await Message.findById(req.params.id);
      if (!message) return res.status(404).json({ error: "Message not found" });

      const conversation = await Conversation.findById(message.conversationId);
      if (!conversation) return res.status(404).json({ error: "Conversation not found" });

      // 1) Mark the message as deleted (for everyone or just you)
      if (forEveryone) {
        if (String(message.sender) !== userId) {
          return res
            .status(403)
            .json({ error: "Only sender can delete for everyone." });
        }
        message.isDeletedForEveryone = true;
      } else {
        if (!message.deletedBy.includes(userId)) {
          message.deletedBy.push(userId);
        }
      }

      await message.save();

      // 2) If this message was the lastMessage, find the new last
      const wasLastMessage =
        conversation.lastMessage &&
        String(conversation.lastMessage._id) === String(message._id);

      if (wasLastMessage) {
        // find the new most recent message that is not fully deleted
        const [newLast] = await Message.find({
          conversationId: conversation._id,
          isDeletedForEveryone: { $ne: true },
        })
          .sort({ timestamp: -1 })
          .limit(1);

        if (newLast) {
          conversation.lastMessage = {
            _id: newLast._id,
            content: newLast.file ? "📎 Sent an attachment" : newLast.content,
            file: newLast.file || null,
            timestamp: newLast.timestamp,
          };
        } else {
          // no messages left
          conversation.lastMessage = null;
        }

        // -- ADDED: Mark lastMessage as modified so updatedAt changes --
        conversation.markModified("lastMessage");

        await conversation.save();

        // Broadcast the updated conversation so your conversation list re-renders
        conversation.participants.forEach((uid) => {
          req.io.to(uid.toString()).emit("conversationCreated", conversation);
        });
        req.io
          .to(conversation._id.toString())
          .emit("conversationCreated", conversation);
      }

      // 3) Emit "messageDeleted" so the front-end removes it in real-time
      req.io.to(conversation._id.toString()).emit("messageDeleted", {
        id: message._id,
        forEveryone,
        userId,
      });

      return res.json({ message: "Message updated with delete status." });
    } catch (error) {
      console.error("❌ Error deleting message:", error);
      res.status(500).json({ error: "Delete failed" });
    }
  });
  router.post("/forward", authMiddleware, async (req, res) => {
    try {
      const { messageId, targetId } = req.body;
      const senderId = req.user.id;
  
      const original = await Message.findById(messageId);
      if (!original) return res.status(404).json({ error: "Message not found" });
  
      const isGroup = targetId.startsWith("group-");
      const conversationId = isGroup ? targetId.replace("group-", "") : null;
  
      let conversation;
  
      if (isGroup) {
        conversation = await Conversation.findById(conversationId);
        if (!conversation) return res.status(404).json({ error: "Group conversation not found" });
      } else {
        // 1-to-1: find or create
        conversation = await Conversation.findOne({
          isGroup: false,
          participants: { $all: [senderId, targetId], $size: 2 },
        });
  
        if (!conversation) {
          conversation = new Conversation({
            participants: [senderId, targetId],
            isGroup: false,
          });
          await conversation.save();
        }
      }
  
      // Create the forwarded message
      const newMessage = new Message({
        sender: senderId,
        receiver: isGroup ? undefined : targetId,
        content: original.content,
        file: original.file,
        conversationId: conversation._id,
        timestamp: new Date(),
      });
  
      await newMessage.save();
      await newMessage.populate("sender", "name email avatar");
  
      // Update conversation lastMessage
      conversation.lastMessage = {
        _id: newMessage._id,
        content: newMessage.file ? "📎 Sent an attachment" : newMessage.content,
        file: newMessage.file,
        timestamp: newMessage.timestamp,
      };
      conversation.markModified("lastMessage");
  
      // Update unread counts
      conversation.participants.forEach((uid) => {
        if (uid.toString() !== senderId.toString()) {
          const prev = conversation.unreadCounts.get(uid.toString()) || 0;
          conversation.unreadCounts.set(uid.toString(), prev + 1);
        }
      });
  
      await conversation.save();
  
      // Emit real-time events
      req.io.to(conversation._id.toString()).emit("newMessage", newMessage);
      conversation.participants.forEach((uid) => {
        req.io.to(uid.toString()).emit("conversationCreated", conversation);
      });
  
      res.status(201).json(newMessage);
    } catch (err) {
      console.error("❌ Forwarding failed:", err);
      res.status(500).json({ error: "Failed to forward" });
    }
  });
  

  // -----------------------for the group info panel
  // 📝 Update group description

  // Update group description
  router.put("/conversations/group/:id/description", authMiddleware, async (req, res) => {
    try {
      const { description } = req.body;
      const updated = await Conversation.findByIdAndUpdate(
        req.params.id,
        { description },
        { new: true }
      ).populate("participants", "name email role avatar");
      req.io.to(req.params.id).emit("groupUpdated", updated);
      res.json(updated);
    } catch (err) {
      console.error("Failed to update description:", err);
      res.status(500).json({ error: "Failed to update description" });
    }
  });
  
  // Make someone admin
  router.put("/conversations/group/:id/make-admin", authMiddleware, async (req, res) => {
    try {
      const { userId } = req.body;
      const convo = await Conversation.findById(req.params.id);
      if (!convo.groupAdmin.includes(userId)) {
        convo.groupAdmin.push(userId);
        await convo.save();
      }
      const updated = await Conversation.findById(req.params.id).populate("participants", "name email role avatar");
      req.io.to(req.params.id).emit("groupUpdated", updated);
      res.json({ success: true });
    } catch (err) {
      console.error("Make admin error:", err);
      res.status(500).json({ error: "Failed to make admin" });
    }
  });
  
  // Remove a member (and from admin if applicable)
  router.put("/conversations/group/:id/remove-member", authMiddleware, async (req, res) => {
    try {
      const { userId } = req.body;
      const convo = await Conversation.findByIdAndUpdate(
        req.params.id,
        {
          $pull: {
            participants: userId,
            groupAdmin: userId,
          },
        },
        { new: true }
      ).populate("participants", "name email role avatar");
      req.io.to(req.params.id).emit("groupUpdated", convo);
      req.io.to(userId.toString()).emit("removedFromGroup", { conversationId: req.params.id });
      res.json({ success: true });
    } catch (err) {
      console.error("Remove member error:", err);
      res.status(500).json({ error: "Failed to remove member" });
    }
  });
  
  // Exit group (self)
  router.put("/conversations/group/:id/exit", authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      const convo = await Conversation.findByIdAndUpdate(
        req.params.id,
        {
          $pull: {
            participants: userId,
            groupAdmin: userId,
          },
        },
        { new: true }
      ).populate("participants", "name email role avatar");
      req.io.to(req.params.id).emit("groupUpdated", convo);
      req.io.to(userId.toString()).emit("removedFromGroup", { conversationId: req.params.id });
      res.json({ success: true });
    } catch (err) {
      console.error("Exit group error:", err);
      res.status(500).json({ error: "Failed to exit group" });
    }
  });
  
  // (Other routes such as send, fetch, etc. remain unchanged)
  router.put("/conversations/group/:id/add-members", authMiddleware, async (req, res) => {
    try {
      const { classIds = [], individualUserIds = [] } = req.body;
      const convo = await Conversation.findById(req.params.id);
      if (!convo) return res.status(404).json({ error: "Conversation not found" });
  
      const matchedStudents = await Student.find({ class: { $in: classIds } });
      const matchedStudentUsers = await User.find({
        role: "student",
        profile: { $in: matchedStudents.map((s) => s._id) },
      });
  
      const classStudentIds = matchedStudentUsers.map((u) => u._id.toString());
  
      const validIndividuals = await User.find({
        _id: { $in: individualUserIds },
        role: { $ne: "admin" },
      });
  
      const individualIds = validIndividuals.map((u) => u._id.toString());
  
      const newSet = new Set([
        ...convo.participants.map((p) => p.toString()),
        ...classStudentIds,
        ...individualIds,
      ]);
  
      convo.participants = Array.from(newSet);
      await convo.save();
  
      const updated = await Conversation.findById(convo._id).populate("participants", "name email avatar role");
      req.io.to(req.params.id).emit("groupUpdated", updated);
  
      res.json({ success: true });
    } catch (err) {
      console.error("❌ Add members failed:", err);
      res.status(500).json({ error: "Failed to add members" });
    }
  });
  router.put('/delete-multiple', authMiddleware, async (req, res) => {
  try {
    const { messageIds } = req.body;
    const userId = req.user._id;

    // Soft delete for sender
    const update = {
      $addToSet: { deletedBy: userId }
    };

    await Message.updateMany(
      { _id: { $in: messageIds } },
      update
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Bulk delete error:", err);
    res.status(500).json({ error: "Failed to delete selected messages." });
  }
});
// DELETE MULTIPLE MESSAGES
router.put('/delete-multiple', authMiddleware, async (req, res) => {
  try {
    const { messageIds } = req.body;
    const userId = req.user.id; // ✅ FIXED from req.user._id

    await Message.updateMany(
      { _id: { $in: messageIds } },
      { $addToSet: { deletedBy: userId } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Bulk delete error:", err);
    res.status(500).json({ error: "Failed to delete selected messages." });
  }
});

// ✅ CLEAR MESSAGES FOR CURRENT USER
router.put("/clear/:conversationId", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { conversationId } = req.params;

  try {
    // Ensure conversation exists
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Mark all messages as deleted for the user
    await Message.updateMany(
      {
        conversationId,
        deletedBy: { $ne: userId },
        isDeletedForEveryone: { $ne: true },
      },
      { $addToSet: { deletedBy: userId } }
    );

    res.json({ success: true, message: "Messages cleared for user." });
  } catch (error) {
    console.error("❌ Clear messages failed:", error);
    res.status(500).json({ error: "Failed to clear messages" });
  }
});

router.put("/clear/:conversationId", authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // 1. Mark all messages in this conversation as deleted for this user
    await Message.updateMany(
      {
        conversationId,
        deletedBy: { $ne: userId },
        isDeletedForEveryone: { $ne: true }
      },
      { $addToSet: { deletedBy: userId } }
    );

    // 2. Fetch the conversation and update lastMessage if needed
    const conversation = await Conversation.findById(conversationId);

    if (conversation?.lastMessage) {
      const lastMsg = await Message.findById(conversation.lastMessage._id);
      const isDeletedForThisUser =
        lastMsg?.isDeletedForEveryone ||
        lastMsg?.deletedBy.includes(userId);

      if (isDeletedForThisUser) {
        // Find new last visible message
        const newLast = await Message.find({
          conversationId,
          isDeletedForEveryone: { $ne: true },
          deletedBy: { $ne: userId }
        })
          .sort({ timestamp: -1 })
          .limit(1);

        if (newLast.length > 0) {
          conversation.lastMessage = {
            _id: newLast[0]._id,
            content: newLast[0].file ? "📎 Sent an attachment" : newLast[0].content,
            file: newLast[0].file || null,
            timestamp: newLast[0].timestamp,
          };
        } else {
          conversation.lastMessage = null;
        }

        conversation.markModified("lastMessage");
        await conversation.save();
      }
    }

    // 3. Emit real-time update
    req.io.to(userId.toString()).emit("messagesCleared", { conversationId });

    res.json({ success: true });
  } catch (err) {
    console.error("Clear message error:", err);
    res.status(500).json({ error: "Failed to clear messages." });
  }
});
  
// ✅ DELETE Chat for current user (soft delete)
router.delete("/conversation/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    // 1. Mark all messages as deleted for this user
    await Message.updateMany(
      {
        conversationId,
        isDeletedForEveryone: { $ne: true },
        deletedBy: { $ne: userId }
      },
      { $addToSet: { deletedBy: userId } }
    );

    // 2. Mark the conversation as deleted for this user
    await Conversation.findByIdAndUpdate(conversationId, {
      $set: { [`deletedFor.${userId}`]: true },
    });

    // 3. Emit to update UI if needed
    req.io.to(userId.toString()).emit("conversationDeleted", { conversationId });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Delete chat error:", err);
    res.status(500).json({ error: "Failed to delete chat" });
  }
});


  export default router;
  