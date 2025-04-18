import React, {
  useEffect, useCallback, useState, useRef, useImperativeHandle, forwardRef,
  useMemo
} from "react";
import {
  Paperclip,
  Send,
  Smile,
  FileText,
  Image,
  Video,
  MoreVertical
} from "lucide-react"; // 🧠 Added `MoreVertical` for the dropdown arrow
import ForwardModal from "./ForwardModal";
import io from "socket.io-client";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import EmojiPicker from "emoji-picker-react"; // ✅ Make sure this library is installed
import type { Conversation, Message } from "../../types";
import GroupInfoPanel from "./GroupInfoPanel"; // or correct path
import { File } from "lucide-react";
import Linkify from "linkify-react";
import UserInfoPanel from "./UserInfoPanel";
import { Trash2, Forward, X } from "lucide-react";
import MultiDeleteModal from "./MultiDeleteModal"; // adjust path if needed

interface ChatWindowProps {
  conversation: Conversation | null;
  onSendMessage: (content: string, file?: File | null) => void;
  authUser: any;
  prefilledMessage?: string;
  setSelectedConversation: (c: Conversation) => void;
  setPrefilledMessage: (msg: string) => void;
  replyToMessage?: Message | null;               // ✅ NEW
  setReplyToMessage?: (msg: Message | null) => void; // ✅ NEW
  fetchConversations: () => void; // ✅ NEW
  conversations: Conversation[];
  unreadCount?: number; // ✅ coming from ConversationList

}

export interface ChatWindowRef {
  fetchMessages: () => void;
}

const socket = io("http://localhost:5001");

// export default function 
const ChatWindow = forwardRef(function ChatWindow(
  {
    conversation,
    onSendMessage,
    authUser,
    prefilledMessage,
    setSelectedConversation,
    setPrefilledMessage,
    replyToMessage,
    setReplyToMessage,
    fetchConversations,
    conversations, // ✅ ADD THIS
    unreadCount
  }: ChatWindowProps,
  ref // ✅ Add this second argument
) {

  const replyTo = replyToMessage;
  const setReplyTo = setReplyToMessage!;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const token = localStorage.getItem("token");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [dropdownFor, setDropdownFor] = useState<string | null>(null);
  // After states like dropdownFor, editingMessage...
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user: currentUser } = useAuth();
  const conversationId = conversation?._id || conversation?.id;
  const [reactionPopupFor, setReactionPopupFor] = useState<string | null>(null);
  const reactionPopupRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  // Add these at the top of ChatWindow function
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const unreadMessageRef = useRef<HTMLDivElement>(null);
  const [firstUnreadMessageIndex, setFirstUnreadMessageIndex] = useState<number | null>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const [multiDeleteModal, setMultiDeleteModal] = useState<null | {
    isMixed: boolean;
    count: number;
  }>(null);


// Add this state at the top of ChatWindow
const [messageToHighlight, setMessageToHighlight] = useState<string | null>(null);

// Add this useEffect for handling scroll-to-highlight
useEffect(() => {
  if (messageToHighlight) {
    const element = document.getElementById(`msg-${messageToHighlight}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('animate-ping-highlight');
      setTimeout(() => {
        element.classList.remove('animate-ping-highlight');
        setMessageToHighlight(null);
      }, 2000);
    }
  }
}, [messages, messageToHighlight]);

// Add this state
const [switchingConvo, setSwitchingConvo] = useState(false);

// Add this handler for reply clicks
const handleReplyClick = async (replyToMessage: Message) => {
  if (!replyToMessage) return;

  try {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("No authentication token found");

    // Safely extract conversation ID
    const conversationId = replyToMessage.conversationId
      ? (typeof replyToMessage.conversationId === 'object' 
          ? replyToMessage.conversationId._id?.toString()
          : replyToMessage.conversationId.toString())
      : null;

    if (!conversationId) {
      throw new Error("Invalid conversation reference in message");
    }

    // Get original conversation details
    const { data: originalConvo } = await axios.get(
      `http://localhost:5001/api/messages/conversation/${conversationId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { populate: "participants" }
      }
    );

    // Add null checks for participants array
    if (!originalConvo?.participants?.length) {
      throw new Error("No participants found in conversation");
    }

    // Find other participant with optional chaining
    const otherParticipant = originalConvo.participants.find(
      (p: any) => p?._id?.toString() !== currentUser?.id?.toString()
    ) ?? null; // Nullish coalescing as fallback

    if (!otherParticipant) {
      throw new Error("Could not identify conversation participant");
    }

    // Rest of the function remains the same
    const { data: targetConvo } = await axios.post(
      "http://localhost:5001/api/messages/find-or-create",
      { participantId: otherParticipant._id },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setSelectedConversation(targetConvo);
    setTimeout(() => {
      setMessageToHighlight(replyToMessage._id);
    }, 500);

  } catch (err) {
    console.error("Failed to handle reply click:", err);
    // Add error notification UI here
  }
};

// Update the otherParticipant calculation to use the same logic as reply privately
const otherParticipant = useMemo(() => {
  if (!conversation?.isGroup && conversation?.participants) {
    return conversation.participants.find(
      (p) => p?._id?.toString() !== currentUser?.id?.toString()
    );
  }
  return null;
}, [conversation, currentUser?.id]);




  
  useEffect(() => {
    lastMessageRef.current = null;
    unreadMessageRef.current = null;
    setFirstUnreadMessageIndex(null);
  }, [conversation?._id]);
  
// Add this effect to mark messages as read when they become visible
useEffect(() => {
  if (!conversation?._id) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const messageId = entry.target.getAttribute('data-message-id');
        if (messageId) {
          // Find if message is unread
          const message = messages.find(m => m._id === messageId);
          if (message && !message.readBy?.includes(currentUser.id)) {
            markAsRead(conversation._id);
            computeFirstUnreadIndex(); // 🧠 NEW: recheck position
          }
          
        }
      }
    });
  }, { 
    root: scrollContainerRef.current,
    threshold: 0.5 
  });

  // Observe all message elements
  const messageElements = document.querySelectorAll('[data-message-id]');
  messageElements.forEach(el => observer.observe(el));

  return () => observer.disconnect();
}, [messages, conversation?._id, currentUser.id]);
  const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null);
  const pinnedMessageRef = useRef<HTMLDivElement>(null);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  useEffect(() => {
    // Clear reply only when switching to unrelated conversations
    if (!conversation?._replyToMessage) {
      setReplyTo(null);
    }
  }, [conversation?._id]);
  //states for forward modal 
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState<Message[] | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<{ url: string; filename: string } | null>(null);
  const [renderToggle, setRenderToggle] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Message[]>([]);

  const openImageModal = (url: string, filename: string) => {
    setImagePreview({ url, filename });
  };
  const closeImageModal = () => {
    setImagePreview(null);
    setZoom(1); // reset zoom on close
  };


  const [zoom, setZoom] = useState(1);

  //for delete confirmation
  const [deleteModal, setDeleteModal] = useState<{
    messageId: string;
    forEveryone: boolean;
  } | null>(null);
  
  const computeFirstUnreadIndex = useCallback(() => {
    // First, filter the messages to only include those that are visible:
    const visibleMessages = messages.filter((msg) => {
      const deletedIds = msg.deletedBy ? msg.deletedBy.map((id: any) => String(id)) : [];
      return !deletedIds.includes(String(currentUser.id)) && !msg.isDeletedForEveryone;
    });
    
    if (typeof unreadCount === "number" && unreadCount > 0) {
      // Calculate the index based on the number of visible messages.
      const index = visibleMessages.length - unreadCount;
      setFirstUnreadMessageIndex(index >= 0 ? index : null);
      console.log("Using unreadCount prop, firstUnreadMessageIndex =", index);
    } else {
      // Fallback: use findIndex logic
      const index = visibleMessages.findIndex((msg) => {
        const senderId = String(msg.sender?._id || msg.sender?.id || msg.sender);
        // This finds the first message from someone else that has not been marked as read.
        return senderId !== String(currentUser.id) && (!msg.readBy || !msg.readBy.includes(currentUser.id));
      });
      setFirstUnreadMessageIndex(index >= 0 ? index : null);
      console.log("Using fallback findIndex logic, firstUnreadMessageIndex =", index);
    }
  }, [messages, currentUser.id, unreadCount]);
  
  useEffect(() => {
    console.log("ChatWindow received unreadCount:", unreadCount);
  }, [unreadCount]);
  
  useEffect(() => {
    if (!loading && messages.length > 0) {
      if (firstUnreadMessageIndex !== null && unreadMessageRef.current) {
        requestAnimationFrame(() => {
          unreadMessageRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
  
          // 🟢 Only mark as read AFTER scrolling to unread
          markAsRead(conversation._id);
        });
      } else {
        requestAnimationFrame(() => {
          lastMessageRef.current?.scrollIntoView({ behavior: "smooth" });
        });
  
        // Fallback: mark as read only if no unread separator exists
        markAsRead(conversation._id);
      }
    }
  }, [loading, messages, firstUnreadMessageIndex]);
    
  useEffect(() => {
    socket.on("messagesCleared", (conversationId) => {
      if (conversation?._id === conversationId) fetchMessages();
    });
    socket.emit("messagesCleared", { conversationId });
    return () => {
      socket.off("messagesCleared");
    };
  }, [conversation]);
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [messages.length, conversation?._id]);
  
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);


  // 👇 ADD THIS RIGHT HERE
// 👇 Safe otherParticipant calculation with null checks
// const otherParticipant = !conversation?.isGroup && conversation?.participants
//   ? conversation.participants.find(
//       (p) => p && (
//         (p._id?.toString() || p.id?.toString()) !== 
//         (currentUser?.id?.toString() || currentUser?._id?.toString())
//       )
//     ) || null
//   : null;
  // Placeholder handlers for dropdown option
  // Update the onReplyPrivately handler
  const onReplyPrivately = async (message: Message) => {
    const senderId = message.sender;
    if (senderId === currentUser.id) return;
  
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:5001/api/messages/find-or-create",
        { participantId: senderId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const oneToOneConvo = {
        ...response.data,
        _replyToMessage: {
          ...message,
          // Add group context
          originalConversationId: conversation?._id,
          originalConversationName: conversation?.groupName,
          originalConversationIsGroup: conversation?.isGroup,
          originalSender: message.sender
        }
      };
  
      setSelectedConversation(oneToOneConvo);
      setReplyTo(message);
      setPrefilledMessage("");
  
    } catch (err) {
      console.error("Failed to initiate private reply:", err);
    }
  };
  useEffect(() => {

    if (prefilledMessage) {
      setNewMessage(prefilledMessage);
      setShowEmojiPicker(false);
      setPrefilledMessage(""); // ✅ Clear after using once
    }
  }, [prefilledMessage]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      if (firstUnreadMessageIndex !== null && unreadMessageRef.current) {
        requestAnimationFrame(() => {
          unreadMessageRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      } else {
        requestAnimationFrame(() => {
          lastMessageRef.current?.scrollIntoView({ behavior: "smooth" });
        });
      }
    }
  }, [loading, messages, firstUnreadMessageIndex]);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownFor(null);
      }
      const clickedNode = event.target as Node;

      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(clickedNode)
      ) {
        setDropdownFor(null);
      }

      // Close emoji reaction popup
      if (
        reactionPopupRef.current &&
        !reactionPopupRef.current.contains(clickedNode)
      ) {
        setReactionPopupFor(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  

  const onStar = (message: Message) => {
    console.log("Star message:", message.content);
  };

  const onPin = async (message: Message) => {
    try {
      await axios.put(`http://localhost:5001/api/messages/pin/${conversation._id}`, {
        messageId: message._id,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      socket.emit("pinnedMessageUpdated", message);
      setPinnedMessage(message);
    } catch (err) {
      console.error("❌ Failed to pin:", err);
    }
  };
  const onUnpin = async () => {
    try {
      await axios.put(`http://localhost:5001/api/messages/unpin/${conversation._id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      socket.emit("pinnedMessageUpdated", null);
      setPinnedMessage(null);
    } catch (err) {
      console.error("❌ Failed to unpin:", err);
    }
  };

  const onShare = (message: Message) => {
    console.log("Share message:", message.content);
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `http://localhost:5001/api/messages/react/${messageId}`,
        { emoji },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      socket.emit("reacted", response.data); // optional but useful fallback
    } catch (error) {
      console.error("❌ Failed to react to message:", error);
    }
  };


  // ✅ Edit Message
  const handleEditMessage = async () => {
    if (!editingMessage) return;

    try {
      const response = await axios.put(
        `http://localhost:5001/api/messages/edit/${editingMessage._id}`,
        { content: newMessage },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      socket.emit("editMessage", response.data); // ✅ Emit

      setMessages((prevMessages) =>
        prevMessages.map((msg) => (msg._id === editingMessage._id ? response.data : msg))
      );

      setEditingMessage(null); // ✅ Reset edit state
      setNewMessage("");       // ✅ Clear input
    } catch (error) {
      console.error("❌ Failed to edit message:", error);
    }
  };

  const handleDeleteMessage = async (ids: string | string[], forEveryone = false) => {
    const messageIds = Array.isArray(ids) ? ids : [ids];
    try {
      await Promise.all(messageIds.map((messageId) =>
        axios.put(`http://localhost:5001/api/messages/delete/${messageId}`, { forEveryone }, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ));
  
      socket.emit("deleteMessage", {
        ids: messageIds,
        forEveryone,
        userId: currentUser.id
      });
  
      setMessages((prev) => prev.filter((msg) => !messageIds.includes(msg._id)));
      setSelectedMessages([]);
      setIsSelecting(false);
    } catch (error) {
      console.error("❌ Failed to delete messages:", error);
    }
  };
  // ✅ NEW: Delete only for self (for mixed sender/receiver messages)
const handleDeleteOnlyForMe = async (ids: string | string[]) => {
  const messageIds = Array.isArray(ids) ? ids : [ids];
  try {
    await Promise.all(
      messageIds.map((messageId) =>
        axios.put(
          `http://localhost:5001/api/messages/delete/${messageId}`,
          { forEveryone: false },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      )
    );

    // Emit socket event
    socket.emit("deleteMessage", {
      ids: messageIds,
      forEveryone: false,
      userId: currentUser.id,
    });

    setMessages((prev) => prev.filter((msg) => !messageIds.includes(msg._id)));
    setSelectedMessages([]);
    setIsSelecting(false);
  } catch (error) {
    console.error("❌ Failed to delete (only for me):", error);
  }
};

  useEffect(() => {
    if (conversation?._id) {
      socket.emit("joinConversation", conversation._id);
    }
  }, [conversation?._id]);
  const markAsRead = async (convId: string) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`http://localhost:5001/api/messages/mark-read/${convId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      socket.emit("markedAsRead", convId);
    } catch (err) {
      console.error("❌ Failed to mark as read:", err);
    }
  }
  useEffect(() => {
    if (messages.length > 0 && conversation) {
      computeFirstUnreadIndex();
    }
  }, [messages, conversation?._id]);
  
  useEffect(() => {
    if (conversation) {
      fetchMessages();
      fetchPinnedMessage(); // ✅ ADD THIS

      socket.emit("join", currentUser.id);
      socket.emit("joinConversation", conversation._id);
    }

    socket.on("messagesCleared", (conversationId) => {
      if (conversation?._id === conversationId) fetchMessages();
    });

    // ✅ All these are needed
    socket.on("messageReacted", (updatedMsg: Message) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id === updatedMsg._id) {
            // Re-attach full sender info if missing
            if (typeof updatedMsg.sender === "string") {
              const fullSender = conversation?.participants.find(
                (p) => (p._id || p.id) === updatedMsg.sender
              );
              return { ...updatedMsg, sender: fullSender || updatedMsg.sender };
            }
            return updatedMsg;
          }
          return msg;
        })
      );
      fetchConversations();

    });

    socket.on("messageEdited", (editedMessage: Message) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) => (msg._id === editedMessage._id ? editedMessage : msg))
      );

      const latestMessages = messagesRef.current;
      const isLast = latestMessages.length > 0 && latestMessages[latestMessages.length - 1]._id === editedMessage._id;
      if (isLast) {
        fetchConversations();
      }
    });



    socket.on("messageDeleted", ({ id, forEveryone, userId }) => {
      // Only delete from UI if:
      // - Message was deleted for everyone, OR
      // - Message was deleted by *me* (current user)
      if (forEveryone || userId === currentUser.id) {
        setMessages((prevMessages) =>
          prevMessages.filter((msg) => msg._id !== id)
        );
    
        const latestMessages = messagesRef.current;
        const isLast =
          latestMessages.length > 0 &&
          latestMessages[latestMessages.length - 1]._id === id;
        if (isLast) {
          fetchConversations();
        }
      }
    });
    

    socket.on("pinnedMessageUpdated", (msg) => setPinnedMessage(msg));

    socket.on("newMessage", (newMsg: Message) => {
      // Only append if it belongs to the currently open conversation

      if (newMsg.conversationId === conversation?._id) {
        setMessages((prev) => [...prev, newMsg]);

        // Mark as read immediately if user is in the same chat
        if (conversation) {
          markAsRead(conversation._id);
        }
        markAsRead(conversation._id);

      }

      fetchConversations();
      fetchPinnedMessage();
    });

    return () => {
      socket.off("messageReacted");
      socket.off("messageEdited");
      socket.off("messageDeleted");
      socket.off("newMessage"); // ✅ Cleanup the new listener too

    };
  }, [conversation]);

  const fetchMessages = useCallback(async () => {
    if (!conversation?._id) {
      setMessages([]);
      setLoading(false);
      return;
    }

    console.log("✅ Fetching messages for:", conversation._id);

    try {
      const response = await axios.get(
        `http://localhost:5001/api/messages/conversation/${conversation._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("✅ New messages fetched:", response.data);

      setMessages([...response.data]); // ✅ Always new reference, forces re-render
      
      setRenderToggle(prev => !prev);
    
    } catch (err) {
      console.error("❌ Error fetching messages:", err);
      setError("Failed to load messages.");
    } finally {
      setLoading(false);
    }
  }, [conversation?._id, token, currentUser.id]);

  useImperativeHandle(ref, () => ({
    fetchMessages
  }));



  const fetchPinnedMessage = async () => {
    const token = localStorage.getItem("token");
    const res = await axios.get(
      `http://localhost:5001/api/messages/pinned/${conversation._id}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    setPinnedMessage(res.data); // <-- local state
  };



  const handleSend = async () => {
    if (editingMessage) {
      await handleEditMessage();
      return;
    }

    if (!newMessage.trim() && !file) return;

    let filePath = null;

    if (file) {
      filePath = await uploadFile(file);
      if (!filePath) {
        console.error("❌ File upload failed. Message not sent.");
        return;
      }
    }

    let actualConversationId = conversation?._id;

    // ✅ If it's a temp conversation (starts with "new-"), create it first
    if (actualConversationId?.startsWith("new-")) {
      try {
        const response = await axios.post(
          "http://localhost:5001/api/messages/find-or-create",
          {
            participantId:
              conversation?.participants.find(
                (p) =>
                  (p._id || p.id) !== (authUser._id || authUser.id)
              )?._id || conversation?.participants.find(
                (p) =>
                  (p._id || p.id) !== (authUser._id || authUser.id)
              )?.id,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        response.data.readBy = [...(response.data.readBy || []), currentUser.id];

        const createdConvo = response.data;
        actualConversationId = createdConvo._id;

        // ✅ Update the selected conversation
        setSelectedConversation(createdConvo);

        // ✅ Refresh conversation list to include it
        fetchConversations();
      } catch (error) {
        console.error("❌ Failed to create conversation before sending message:", error);
        return;
      }
    }
    const messageData: any = {
      conversationId: conversation?.id?.startsWith("new-") ? null : conversation?._id,
      content: newMessage,
      file: filePath,
      replyTo: replyTo?._id || null,
    };
    if (!conversation?.isGroup) {
      messageData.receiver = otherParticipant?._id || otherParticipant?.id;
    }

    if (!conversation?.isGroup) {
      messageData.receiver =
        otherParticipant?._id || otherParticipant?.id;
    }

    try {
      const response = await axios.post(
        "http://localhost:5001/api/messages/send",
        messageData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (conversation?.id?.startsWith("new-")) {
        setSelectedConversation({
          ...conversation,
          _id: response.data.conversationId, // 🔄 Replace temp ID with real one
        });
      }
      setNewMessage("");
      setFile(null);
      setReplyTo(null);
    } catch (error) {
      console.error("❌ Error sending message:", error.stack || error);
      res.status(500).json({ error: "Message sending failed", details: error.message });
    }
  };
  // ✅ Upload file to GridFS
  const uploadFile = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post("http://localhost:5001/api/attachments/upload", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data?.filePath) {
        return {
          _id: response.data.filePath,
          name: response.data.filename,
          type: response.data.contentType,
        };
      }
      return null;
    } catch (error) {
      console.error("❌ Failed to upload file:", error);
      return null;
    }
  };



  return (
    <div
    ref={scrollContainerRef}
      className="flex-1 flex flex-col h-full bg-gray-50 max-w-full overflow-hidden">
      {/* Chat Header */}
      {/* Chat Header */}

      {/* Top bar when selecting messages */}
      {isSelecting ? (
  <div className="flex items-center justify-between bg-indigo-50 border-b border-indigo-100 px-4 py-3">
    <div className="flex items-center space-x-4">
      <span className="text-indigo-700 font-medium text-sm">
        {selectedMessages.length} selected
      </span>
      
      <button
  onClick={() => {
    if (selectedMessages.length === 0) return;

    const onlySenderMessages = selectedMessages.every(
      (msg) =>
        (msg.sender?._id || msg.sender?.id || msg.sender) === currentUser.id
    );

    setMultiDeleteModal({
      isMixed: !onlySenderMessages,
      count: selectedMessages.length,
    });
  }}
  className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-200 hover:border-indigo-300 transition-all"
>
  <Trash2 className="w-4 h-4 text-red-600" />
  <span className="text-sm text-gray-700">Delete</span>
</button>


      <button
        onClick={() => {
          setShowForwardModal(true);
setMessageToForward([...selectedMessages]); // ⬅️ store array

        }}
        className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-200 hover:border-indigo-300 transition-all"
      >
        <Forward className="w-4 h-4 text-indigo-600" />
        <span className="text-sm text-gray-700">Forward</span>
      </button>
    </div>

    <button 
      onClick={() => {
        setIsSelecting(false);
        setSelectedMessages([]);
      }}
      className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-200 hover:border-indigo-300 transition-all"
    >
      <X className="w-4 h-4 text-gray-500" />
      <span className="text-sm text-gray-700">Cancel</span>
    </button>
  </div>
) : (
        <div className="p-4 border-b border-gray-200 bg-white flex items-center space-x-3">
          {conversation?.isGroup ? (
            <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold">
              {conversation.groupName?.charAt(0).toUpperCase() || "G"}

            </div>
          ) : (
            <img
              src={
                otherParticipant?.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(otherParticipant?.name || "User")}`
              }
              alt={otherParticipant?.name || "User"}
              className="w-10 h-10 rounded-full"
            />
          )}

          <h2
            className="font-medium text-gray-900 cursor-pointer"
            onClick={() => {
              setShowInfoPanel(true);
            }}
          >
            {conversation?.isGroup
              ? conversation.groupName || "Unnamed Group"
              : otherParticipant?.name || "Unknown"}

            <p className="text-xs text-gray-500">
              Click for {conversation?.isGroup ? "Group" : "User"} Info
            </p>
          </h2>




        </div>
        // your original header here (e.g. conversation name bar)
      )}

      {showInfoPanel && conversation?.isGroup && (
        <GroupInfoPanel
          conversation={conversation}
          fetchConversations={fetchConversations}
          socket={socket} // 👈 from ChatWindow
          setSelectedConversation={setSelectedConversation} // ✅ ADD THIS
          conversations={conversations} // ✅ MUST be passed
          onClose={() => setShowInfoPanel(false)}
        />
      )}
      {conversation && !conversation.isGroup && showInfoPanel && (
        <UserInfoPanel
          conversation={conversation}
          onClose={() => setShowInfoPanel(false)}
          fetchConversations={fetchConversations}
          setSelectedConversation={setSelectedConversation}
        />
      )}

      {/* Messages */}
      {/* Messages Container */}
      {pinnedMessage && (
        <div
          onClick={() => {
            const el = document.getElementById(`msg-${pinnedMessage._id}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.remove('animate-ping-highlight');
              void el.offsetWidth;
              el.classList.add('animate-ping-highlight');
            }
          }}
          className="cursor-pointer bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500 px-4 py-2 text-sm flex justify-between items-center"
        >
          <div className="truncate max-w-[80%]">
            📌 Pinned: <span className="font-medium">{pinnedMessage.content || "Attachment"}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUnpin();
            }}
            className="text-xs text-red-600 hover:underline ml-2"
          >
            Unpin
          </button>
        </div>
      )}


      <div
        key={`${conversation?._id}-${messages.length}-${renderToggle}`}

        className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3" ref={scrollContainerRef}>
        {messages
          .filter((message) => {
            // Convert IDs to string if needed:
            const deletedIds = message.deletedBy ? message.deletedBy.map((id: any) => id.toString()) : [];
            return !deletedIds.includes(currentUser.id.toString()) && !message.isDeletedForEveryone;
          })

          .map((message, index) => {
            const isLast = index === messages.length - 1;
            const isUnreadSeparator = (
              index === firstUnreadMessageIndex &&
              // Prevent showing separator for messages sent by the current user.
              String(message.sender?._id || message.sender?.id || message.sender) !== String(currentUser.id)
            );
            
            
            return (
              
<React.Fragment key={`msg-block-${message._id}`}>
                
{isUnreadSeparator && (
  <div ref={unreadMessageRef} className="relative text-center py-2">
    <hr className="border-t border-purple-300" />
    <span className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 px-3 text-xs text-purple-700 bg-white">
      Unread Messages
    </span>
  </div>
)}

                {/* Checkbox column - always present but hidden when not selecting */}
                {isSelecting && (
  <div className="absolute left-2 top-2 z-10">
    <input
      type="checkbox"
      checked={selectedMessages.some((m) => m._id === message._id)}
      onChange={(e) => {
        if (e.target.checked) {
          setSelectedMessages((prev) => [...prev, message]);
        } else {
          setSelectedMessages((prev) =>
            prev.filter((m) => m._id !== message._id)
          );
        }
      }}
      className="w-5 h-5 cursor-pointer accent-indigo-600"
    />
  </div>
)}

<div
  key={message._id}
  id={`msg-${message._id}`}
  ref={isLast ? lastMessageRef : null}
  data-message-id={message._id}
  className={`flex w-full max-w-full ${isSelecting ? 'pl-10 pr-4' : 'px-4'} min-w-0 flex-col relative
    ${message.sender === currentUser.id || message.sender?._id === currentUser.id
      ? "items-end" // sent → align right
      : "items-start" // received → align left
    }`}
  onMouseEnter={() => setHoveredMessageId(message._id)}
  onMouseLeave={() => setHoveredMessageId(null)}
>
  {/* Reply Preview - Now ABOVE the message bubble */}
  {message.replyTo && (
  <div 
  onClick={() => handleReplyClick(message.replyTo)}

  className={`mb-1 p-2 rounded-lg bg-indigo-50/80 border border-indigo-100 max-w-[85%] ${
    (message.sender?._id || message.sender?.id || message.sender) === currentUser.id 
      ? "mr-2" 
      : "ml-2"
  }`}>
    <div className="flex items-center gap-1 text-xs">
      
      <span className="font-medium text-indigo-700">
        {!conversation?.isGroup && message.replyTo.conversationId?.isGroup ? (
          // Show group context only in private chats
          <>
            {message.replyTo.sender?._id === currentUser.id ? "You" : message.replyTo.sender?.name}
            <span className="text-gray-500 mx-1">in</span>
            <span className="text-indigo-600">
              {message.replyTo.conversationId?.groupName}
            </span>
          </>
        ) : (
          // Always show just sender name in group chats
          message.replyTo.sender?._id === currentUser.id 
            ? "You" 
            : message.replyTo.sender?.name
        )}
      </span>
    </div>
    <div className="text-xs truncate max-w-[300px] mt-1 text-gray-700">
      {message.replyTo.file ? (
        <span className="flex items-center gap-1">
          {message.replyTo.file.type.startsWith("image/") ? (
            <span>📷 Photo</span>
          ) : message.replyTo.file.type.startsWith("video/") ? (
            <span>🎥 Video</span>
          ) : (
            <span>📄 Document</span>
          )}
          {message.replyTo.file.name && (
            <span className="truncate">{message.replyTo.file.name}</span>
          )}
        </span>
      ) : (
        message.replyTo.content || "Message"
      )}
    </div>
  </div>
)}

                {/* Rest of your message bubble code remains unchanged */}
                <div className={`relative max-w-[min(85%,_500px)] p-3 rounded-lg ${
                  (message.sender?._id || message.sender?.id || message.sender) === currentUser.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>

                  
                  {/* Sender Name (group only) */}
                  {conversation?.isGroup && (message.sender?._id || message.sender?.id) !== currentUser.id && (
                    <p className="text-xs font-semibold mb-1 opacity-75 text-gray-700">
                      {typeof message.sender === "object" && "name" in message.sender
                        ? message.sender.name
                        : "Unknown"}
                    </p>
                  )}

                  {/* Message Content */}
                  {/* === MESSAGE BODY === */}
                  {message.file ? (
                    message.file.type?.startsWith("image/") ? (
                      // IMAGE PREVIEW
                      <>
                        <div
                          onClick={() =>
                            openImageModal(
                              `http://localhost:5001/api/attachments/${message.file._id}`,
                              message.file.name || "Image"
                            )
                          }
                          className="cursor-pointer"
                        >
                          <img
                            src={`http://localhost:5001/api/attachments/${message.file._id}`}
                            alt="Sent file"
                            className="max-w-full rounded-md max-h-64 object-cover"
                          />
                        </div>
                        {/* <p className="text-xs text-gray-500 mt-1">{message.file.name}</p> */}
                      </>
                    ) : (
                      // DOCUMENT PREVIEW
                      <div className="flex items-center space-x-2 bg-white p-2 rounded shadow text-sm">
                        <File className="w-4 h-4 text-gray-600" />
                        <a
                          href={`http://localhost:5001/api/attachments/${message.file._id}`}
                          download
                          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                        >
                          <FileText className="w-5 h-5" />
                          <span>{message.file.name || "Download File"}</span>
                          <span></span>
                        </a>


                      </div>
                    )
                  ) : (
                    <Linkify
                      options={{
                        target: "_blank",
                        rel: "noopener noreferrer",
                        className: "text-blue-400 hover:underline",
                      }}
                    >
                      {message.content}
                    </Linkify>)}

                  {/* Timestamp */}
                  <div className="flex items-center justify-end gap-2 mt-2">
                    <span className="text-xs opacity-75">
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  {/* Dropdown Trigger */}
                  {hoveredMessageId === message._id && (
                    <button
                      onClick={() => setDropdownFor(message._id)}
                      className={`absolute top-1/2 -translate-y-1/2 group z-50 
        ${(message.sender === currentUser.id || message.sender?._id === currentUser.id)
                          ? 'left-[-40px]'  // sender (right side bubble) → show pill on left
                          : 'right-[-40px]'}  // receiver (left side bubble) → show pill on right
      bg-white shadow-md border px-2 py-1 rounded-full flex items-center space-x-1
    transition-all duration-200 ease-in hover:scale-105`}
                      title="Message options"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-500" />
                      <Smile className="w-4 h-4 text-gray-500" />
                    </button>
                  )}


                  {/* Dropdown Menu */}
                  {dropdownFor === message._id && (
                    <div
                      ref={dropdownRef}
                      className={`absolute top-full mt-1 ${(message.sender?._id || message.sender?.id || message.sender) === currentUser.id
                        ? 'right-0'   // for messages sent by you (right side)
                        : 'left-0'    // for others (left side)
                        } ${emojiPickerFor === message._id ? 'w-74' : 'w-48'}
                    bg-white border rounded-lg shadow-lg z-[1000] text-sm text-gray-700 overflow-hidden`}
                    >

                      <button
                        onClick={() => setReplyTo(message)}
                        className="block w-full px-4 py-2 hover:bg-gray-100 text-left"
                      >
                        ↩️ Reply
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(message.content);
                          setShowCopiedToast(true);
                          setTimeout(() => setShowCopiedToast(false), 1500); // Hide after 1.5s
                        }}
                        className="block w-full px-4 py-2 hover:bg-gray-100 text-left"
                      >
                        📋 Copy
                      </button>
                      {message.sender !== currentUser.id && (
                        <button
                          onClick={() => onReplyPrivately(message)}
                          className="block w-full px-4 py-2 hover:bg-gray-100 text-left"
                        >
                          🙈 Reply Privately
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setShowForwardModal(true);
                          setMessageToForward([message]); // ✅ wrap in array
                        }}
                        className="block w-full px-4 py-2 hover:bg-gray-100 text-left"
                      >
                        🔁 Forward
                      </button>                      {showForwardModal && messageToForward && (
                        <ForwardModal
                        messages={messageToForward}
                        currentUser={currentUser}
                          onClose={() => {
                            setShowForwardModal(false);
                            setMessageToForward(null);
                          }}
                          setSelectedConversation={setSelectedConversation}
                        />

                      )}

                 {/*     <button onClick={() => onStar(message)} className="block w-full px-4 py-2 hover:bg-gray-100 text-left">⭐ Star</button> */}
                      <button onClick={() => onPin(message)} className="block w-full px-4 py-2 hover:bg-gray-100 text-left">📌 Pin</button>

                      {(message.sender?._id || message.sender?.id || message.sender) === currentUser.id ? (
                        <>
                          <button
                            onClick={() => {
                              setEditingMessage(message);
                              setNewMessage(message.content); // Prefill input
                            }}
                            className="block w-full px-4 py-2 hover:bg-gray-100 text-left"
                          >
                            ✏️ Edit
                          </button>

                          <button
                            onClick={() => setDeleteModal({ messageId: message._id, forEveryone: true })}
                            className="block w-full px-4 py-2 hover:bg-gray-100 text-left text-red-500"
                          >
                            🗑️ Delete for Everyone
                          </button>
                          <button
                            onClick={() => setDeleteModal({ messageId: message._id, forEveryone: false })}
                            className="block w-full px-4 py-2 hover:bg-gray-100 text-left text-red-500"
                          >
                            🗑️ Delete for Me
                          </button>

                        </>
                      ) : (
                        <button
                          onClick={() => setDeleteModal({ messageId: message._id, forEveryone: false })}
                          className="block w-full px-4 py-2 hover:bg-gray-100 text-left text-red-500"
                        >
                          🗑️ Delete for Me
                        </button>
                      )}


                      <button
                        onClick={() => {
                          setIsSelecting(true);
                          setSelectedMessages([message]);
                        }}
                        className="block w-full px-4 py-2 hover:bg-gray-100 text-left"
                      >
                        ✅ Select
                      </button>
                      {/*<button onClick={() => onShare(message)} className="block w-full px-4 py-2 hover:bg-gray-100 text-left">📤 Share</button> */}

                      {/* Emoji Reactions */}
                      <div className="px-3 py-2 border-t">
                        <div className="flex justify-between items-center">
                          {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
                            <button
                              key={emoji}
                              className="hover:scale-110 transition-transform"
                              onClick={() => handleReaction(message._id, emoji)}
                            >
                              {emoji}
                            </button>
                          ))}
                          <button
                            onClick={() => setEmojiPickerFor(message._id)}
                            className="text-gray-500 hover:text-indigo-600"
                          >
                            <Smile className="w-4 h-4" />
                          </button>

                        </div>

                        {/* Emoji Picker */}
                        {emojiPickerFor === message._id && (

                          <div className="mt-2">
                            <button
                              onClick={() => setEmojiPickerFor(null)}
                              className="text-gray-400 hover:text-gray-600 text-lg"
                            >
                              ✕
                            </button>
                            <EmojiPicker
                              height={400}
                              width="100%"
                              theme="light"
                              onEmojiClick={(emojiObject) => {
                                handleReaction(message._id, emojiObject.emoji);
                                setEmojiPickerFor(null);
                              }}
                            />

                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {message.reactions && message.reactions.length > 0 && (
                    <div
                      className={`absolute -bottom-4 ${(message.sender?._id || message.sender?.id || message.sender) === currentUser.id
                        ? 'right-2'
                        : 'left-2'
                        } flex space-x-1 bg-white px-2 py-1 rounded-full shadow border z-10`}
                    >

                      {Array.from(new Set(message.reactions.map(r => r.emoji))).map((emoji) => (
                        <div
                          key={emoji}
                          className="text-sm cursor-pointer hover:scale-110 transition"
                          onClick={() => setReactionPopupFor(message._id)} // 👈
                        >
                          {emoji}
                        </div>
                      ))}
                    </div>
                  )}
                  {reactionPopupFor === message._id && (
                    <div
                      ref={reactionPopupRef}
                      className={`absolute -bottom-20 ${(message.sender?._id || message.sender?.id || message.sender) === currentUser.id
                        ? 'right-0'
                        : 'left-2'
                        } w-60 bg-white text-gray-800 shadow-lg rounded-lg border p-3 z-20`}
                    >



                      <div className="text-sm font-medium border-b pb-1 mb-2">All Reactions</div>
                      {message.reactions.map((r) => {
                        const isYou = r.user === currentUser.id;
                        const sender = conversation?.participants.find(
                          (p) => (p._id || p.id) === r.user
                        );

                        return (
                          <div
                            key={r.user + r.emoji}
                            className="flex justify-between items-center py-1 text-sm hover:bg-gray-50 px-2 rounded"
                          >
                            <div className="flex items-center space-x-2">
                              <img
                                src={
                                  sender?.avatar ||
                                  "https://ui-avatars.com/api/?name=" +
                                  encodeURIComponent(sender?.name || "User")
                                }
                                alt="avatar"
                                className="w-6 h-6 rounded-full"
                              />
                              <span>{isYou ? "You" : sender?.name || "Unknown"}</span>
                            </div>
                            <div
                              className="cursor-pointer flex flex-col items-center"
                              onClick={() => isYou && handleReaction(message._id, r.emoji)}
                            >
                              <span>{r.emoji}</span>
                              {isYou && (
                                <span className="text-[10px] text-gray-400 leading-none">select to remove</span>
                              )}
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}



                </div>
              </div>
              </React.Fragment>

            );
          })}
      </div>
      

      {/* File Preview Before Sending */}
      {file && (
        <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg">
          {file.type.startsWith("image/") ? (
            <img src={URL.createObjectURL(file)} alt="Preview" className="w-16 h-16 rounded-md" />
          ) : file.type.startsWith("video/") ? (
            <video className="w-16 h-16 rounded-md" controls>
              <source src={URL.createObjectURL(file)} />
            </video>
          ) : (
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-gray-500" />
              <span className="text-sm">{file.name}</span>
            </div>
          )}
          <button onClick={() => setFile(null)} className="text-red-500">
            ✕
          </button>
        </div>
      )}
{replyTo && (
  <div className="bg-indigo-50 border-l-4 border-indigo-500 p-3 mb-3 rounded-lg relative">
    <div className="flex justify-between items-start">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-indigo-700 mb-1">
          {conversation?.isGroup ? (
            <>
              Replying to {replyTo.sender === currentUser.id ? "yourself" : replyTo.sender?.name || "Someone"}
              <span className="text-gray-500 mx-1">·</span>
              <span className="text-indigo-600">{conversation.groupName}</span>
            </>
          ) : (
            `Replying to ${replyTo.sender === currentUser.id ? "yourself" : otherParticipant?.name || "Someone"}`
          )}
        </p>
        
        <div className="text-sm text-gray-800 truncate">
          {replyTo.file ? (
            <div className="flex items-center gap-2">
              {replyTo.file.type?.startsWith("image/") ? (
                <>
                  <span>📷</span>
                  <span>{replyTo.file.name || "Photo"}</span>
                </>
              ) : replyTo.file.type?.startsWith("video/") ? (
                <>
                  <span>🎬</span>
                  <span>{replyTo.file.name || "Video"}</span>
                </>
              ) : (
                <>
                  <span>📄</span>
                  <span>{replyTo.file.name || "Document"}</span>
                </>
              )}
            </div>
          ) : (
            replyTo.content
          )}
        </div>
      </div>
      
      <button
        onClick={() => setReplyTo(null)}
        className="text-gray-500 hover:text-red-500 ml-2"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  </div>
)}

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-white flex items-center space-x-3 w-full">
        <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}><Smile className="w-6 h-6 text-gray-500" /></button>
        {showEmojiPicker && (
          <div className="absolute bottom-16 left-4 z-10 bg-white shadow-lg p-2 rounded-lg">
            <div className="flex justify-end mb-1">
              <button
                onClick={() => setShowEmojiPicker(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <EmojiPicker
              onEmojiClick={(emojiObject) => setNewMessage((prev) => prev + emojiObject.emoji)}
            />
          </div>
        )}
        <input type="file" ref={fileInputRef} hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button onClick={() => fileInputRef.current?.click()}><Paperclip className="w-6 h-6 text-gray-500" /></button>
        <textarea
          className="flex-1 border p-2 rounded-lg resize-none overflow-y-auto max-h-36 break-words whitespace-pre-wrap min-w-0"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          rows={1}
        />
        <button
          onClick={handleSend}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg"
        >
          {editingMessage ? "Update" : <Send className="w-6 h-6" />}
        </button>
        {editingMessage && (
          <button
            onClick={() => {
              setEditingMessage(null);
              setNewMessage("");
            }}
            className="text-gray-500 hover:text-red-500 text-sm px-2"
          >
            Cancel Edit
          </button>
        )}
        {showCopiedToast && (
          <div className="fixed bottom-4 left-[65%] transform -translate-x-1/2 bg-black text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">
            Message copied
          </div>
        )}


      </div>
      {deleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold">Delete this message?</h2>
            <p className="text-sm text-gray-600">
              {deleteModal.forEveryone
                ? "This message will be deleted for everyone in the chat."
                : "This message will be deleted only from your device."}
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeleteMessage(deleteModal.messageId, deleteModal.forEveryone);
                  setDeleteModal(null);
                }}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ==== IMAGE PREVIEW MODAL ==== */}
      {previewImageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center">
          <div className="relative">
            <img src={previewImageUrl} className="max-w-[90vw] max-h-[90vh] rounded shadow-lg" />
            <button
              onClick={closeImageModal}
              className="absolute top-2 right-2 bg-white text-black px-2 py-1 rounded shadow"
            >
              ✕
            </button>
            <a
              href={previewImageUrl}
              download
              className="absolute bottom-2 right-2 bg-white text-black px-2 py-1 rounded shadow"
            >
              ⬇️ Download
            </a>
          </div>
        </div>
      )}

      {imagePreview && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4">
          <div className="relative max-w-5xl w-full max-h-full flex flex-col items-center">

            {/* Top-right buttons */}
            <div className="absolute top-4 right-4 flex space-x-2 z-50">
              <a
                href={imagePreview.url}
                download={imagePreview.filename}
                className="bg-white px-3 py-1 text-sm rounded shadow hover:bg-gray-100"
              >
                ⬇️ Download
              </a>
              <button
                onClick={() => setImagePreview(null)}
                className="bg-white px-3 py-1 text-sm rounded shadow hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="absolute top-5 left-5 z-50 flex items-center space-x-3 bg-white bg-opacity-80 rounded-full px-4 py-1 shadow-lg">
              <button
                onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.2))}
                className="text-gray-800 hover:text-indigo-600 text-xl"
                title="Zoom Out"
              >
                🔍➖
              </button>
              <button
                onClick={() => setZoom(1)}
                className="text-gray-800 hover:text-indigo-600 text-sm font-semibold border border-gray-400 px-2 py-1 rounded"
                title="Reset Zoom (1:1)"
              >
                🔁1:1
              </button>
              <button
                onClick={() => setZoom(prev => Math.min(prev + 0.2, 5))}
                className="text-gray-800 hover:text-indigo-600 text-xl"
                title="Zoom In"
              >
                🔍➕
              </button>
            </div>


            {/* Image Container */}
            <div className="overflow-auto max-h-[80vh] rounded border border-white p-2">
              <img
                src={imagePreview.url}
                alt="Preview"
                style={{ transform: `scale(${zoom})` }}
                className="transition-transform duration-200 max-h-[80vh] max-w-full object-contain"
              />
            </div>

            {/* Filename Below */}
            <p className="text-white text-sm mt-4 truncate max-w-[80vw] text-center">
              {imagePreview.filename}
            </p>
          </div>
        </div>
      )}

{multiDeleteModal && (
  <MultiDeleteModal
    isMixed={multiDeleteModal.isMixed}
    count={multiDeleteModal.count}
    onClose={() => setMultiDeleteModal(null)}
    onDelete={(forEveryone) => {
      const ids = selectedMessages.map((m) => m._id);
    
      if (multiDeleteModal?.isMixed) {
        // 🚫 Mixed selection – always delete only for self
        handleDeleteOnlyForMe(ids);
      } else if (forEveryone) {
        // ✅ Sender-only and user selected "Delete for everyone"
        handleDeleteMessage(ids, true);
      } else {
        // ✅ Sender-only and user selected "Delete for me"
        handleDeleteOnlyForMe(ids);
      }
    
      setMultiDeleteModal(null);
    }}
    
    
    
  />
)}
{showForwardModal && messageToForward?.length > 0 && (
  <ForwardModal
  messages={selectedMessages}  // ✅ Pass selected messages array
    currentUser={currentUser}
    onClose={() => {
      setShowForwardModal(false);
      setMessageToForward(null);
    }}
    setSelectedConversation={setSelectedConversation}
  />
)}
    </div>
  );
}); // ✅ closes forwardRef
export default ChatWindow;
