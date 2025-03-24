import React, { useEffect, useState, useRef } from "react";
import {
  Paperclip,
  Send,
  Smile,
  Edit,
  Trash2,
  FileText,
  Image,
  Video,
  MoreVertical
} from "lucide-react"; // 🧠 Added `MoreVertical` for the dropdown arrow

import io from "socket.io-client";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import EmojiPicker from "emoji-picker-react"; // ✅ Make sure this library is installed
import type { Conversation, Message } from "../../types";
import GroupInfoPanel from "./GroupInfoPanel"; // or correct path

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

}


const socket = io("http://localhost:5001");

export default function ChatWindow({
  conversation,
  onSendMessage,
  authUser,  // ✅ renamed
  prefilledMessage,              // ✅ ADD THIS
  setSelectedConversation,       // ✅ AND THIS
  setPrefilledMessage,
  replyToMessage,
  setReplyToMessage,   
  fetchConversations // ✅ NEW
  // ✅ AND THIS
}: ChatWindowProps) {
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

  const handleClearReply = () => {
    setReplyTo(null);
  };
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  

  // 👇 ADD THIS RIGHT HERE
  const otherParticipant = !conversation?.isGroup
    ? conversation?.participants.find(
      (p) =>
        (p._id?.toString() || p.id?.toString()) !==
        (currentUser.id?.toString() || currentUser._id?.toString())
    )
    : null;

  // Placeholder handlers for dropdown options
  const onReply = (message: Message) => {
    setReplyTo(message);
  };

  // const onReplyPrivately = (message: Message) => {
  //   if (!conversation?.isGroup) return; // no private reply in 1-1
  //   // Create 1-1 conversation logic (optional enhancement later)
  //   setReplyTo(message); // For now, treat it as normal reply
  // };
  const onReplyPrivately = async (message: Message) => {
    const senderId = message.sender;
    if (senderId === currentUser.id) return;

    try {
      const token = localStorage.getItem("token");

      // 1. Find or create conversation with this user
      const response = await axios.post(
        "http://localhost:5001/api/messages/find-or-create",
        { participantId: senderId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const oneToOneConvo = response.data;

      // 2. Switch chat window to that conversation
      ; // Clear any old prefilled text
      setSelectedConversation(oneToOneConvo);
      setReplyToMessage(message); // ✅ This works now across remount
      setPrefilledMessage("");    // ✅ don't use input text


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


  const onForward = (message: Message) => {
    console.log("Forward message:", message.content);
  };

  const onStar = (message: Message) => {
    console.log("Star message:", message.content);
  };

  const onPin = (message: Message) => {
    console.log("Pin message:", message.content);
  };

  const onSelect = (message: Message) => {
    console.log("Selected message:", message.content);
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

      // Don't manually update messages here if socket handles it
      // socket.emit("reacted", response.data); // optional

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


  // ✅ Delete Message
  const handleDeleteMessage = async (messageId: string, forEveryone: boolean = false) => {
    try {
      await axios.put(
        `http://localhost:5001/api/messages/delete/${messageId}`,
        { forEveryone },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      socket.emit("deleteMessage", { id: messageId, forEveryone, userId: currentUser.id });

      if (forEveryone) {
        setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
      } else {
        setMessages((prev) =>
          prev.filter((msg) => msg._id !== messageId || msg.deletedBy?.includes(currentUser.id))
        );
      }
    } catch (error) {
      console.error("❌ Failed to delete message:", error);
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
    if (conversation) {
      fetchMessages();
      socket.emit("join", currentUser.id);
      socket.emit("joinConversation", conversation._id);
    }
  
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
    
    
  
    socket.on("messageDeleted", ({ id }) => {
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg._id !== id)
      );
    
      const latestMessages = messagesRef.current;
      const isLast = latestMessages.length > 0 && latestMessages[latestMessages.length - 1]._id === id;
      if (isLast) {
        fetchConversations();
      }
    });
    
    
    socket.on("newMessage", (newMsg: Message) => {
      // Only append if it belongs to the currently open conversation
      if (newMsg.conversationId === conversation?._id) {
        setMessages((prev) => [...prev, newMsg]);
      }
      fetchConversations();

    });
  
    return () => {
      socket.off("messageReacted");
      socket.off("messageEdited");
      socket.off("messageDeleted");
      socket.off("newMessage"); // ✅ Cleanup the new listener too

    };
  }, [conversation]);
  

  // ✅ Fetch messages from the backend
  const fetchMessages = async () => {
    // In fetchMessages:
    if (!conversation?._id) {
      setLoading(false);
      setMessages([]);
      return;
    }

    try {
      if (!token) {
        setError("No authentication token found.");
        return;
      }

      const response = await axios.get(
        `http://localhost:5001/api/messages/conversation/${conversation._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessages(response.data);
      
    } catch (error) {
      console.error("Error fetching messages:", error);
      setError("Failed to load messages.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle sending messages & files
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

    const messageData: any = {
      conversationId: conversation?._id,
      content: newMessage,
      file: filePath,
      replyTo: replyTo?._id || null,
    };


    if (!conversation?.isGroup) {
      messageData.receiver = otherParticipant?._id || otherParticipant?.id;
    }
    if (replyTo) {
      messageData.replyTo = replyTo._id;
    }

    try {
      const response = await axios.post("http://localhost:5001/api/messages/send", messageData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // socket.emit("sendMessage", response.data);

      // ✅ DO NOT manually add to local state
      // setMessages((prevMessages) => [...prevMessages, response.data]); ❌

      // ✅ Clear input fields
      setNewMessage("");
      setFile(null);
      setReplyTo(null); // ✅ Clear reply state after sending

    } catch (error) {
      console.error("❌ Failed to send message:", error);
    }
  };



  // ✅ Upload file to GridFS
  const uploadFile = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      console.log("📤 Uploading file to server...");
      const response = await axios.post("http://localhost:5001/api/attachments/upload", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("📁 Upload response:", response.data);

      if (response.data && response.data.filePath) {
        return response.data.filePath;
      } else {
        console.error("❌ No file path returned from server.");
        return null;
      }
    } catch (error) {
      console.error("❌ Failed to upload file:", error);
      return null;
    }
  };



  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50">
      {/* Chat Header */}
      {/* Chat Header */}
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
  className={`font-medium text-gray-900 ${conversation?.isGroup ? 'cursor-pointer' : ''}`}
  onClick={() => {
    if (conversation?.isGroup) {
      setShowInfoPanel(true);
    }
  }}
>
  {conversation?.isGroup
    ? conversation.groupName || "Unnamed Group"
    : otherParticipant?.name || "Unknown"}

  {/* 👇 Only show this small text if it's a group */}
  {conversation?.isGroup && (
    <p className="text-xs text-gray-500">
      Click for Group Info
    </p>
  )}
</h2>


      </div>

      {showInfoPanel && conversation?.isGroup && (
        <GroupInfoPanel
          conversation={conversation}
          onClose={() => setShowInfoPanel(false)}
        />
      )}
      {/* Messages */}

      {/* Messages Container */}
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages
          .filter((message) => !message.deletedBy?.includes(currentUser.id))
          .map((message) => (
            <div
              key={message._id}
              className={`flex ${(message.sender?._id || message.sender?.id || message.sender) === currentUser.id
                ? 'justify-end'
                : 'justify-start'
                }`}
              onMouseEnter={() => setHoveredMessageId(message._id)}
              onMouseLeave={() => setHoveredMessageId(null)}
            >
              {message.replyTo && (
                <div className="text-xs text-gray-700 mb-1 p-2 border-l-4 border-indigo-400 bg-indigo-50 rounded">
                  <div className="font-medium">{message.replyTo.senderName || "Someone"}</div>
                  <div className="truncate max-w-xs">{message.replyTo.content || "Attachment"}</div>
                </div>
              )}


              {/* Message Bubble */}
              <div className={`relative max-w-[75%] lg:max-w-[60%] p-3 rounded-lg ${(message.sender?._id || message.sender?.id || message.sender) === currentUser.id
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
                {message.file ? (
                  message.file.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                    <img
                      src={`http://localhost:5001/api/attachments/${message.file}`}
                      alt="Sent file"
                      className="max-w-full rounded-md max-h-64 object-cover"
                    />
                  ) : message.file.match(/\.(mp4|mov|avi)$/i) ? (
                    <video
                      controls
                      className="max-w-full rounded-md max-h-64"
                    >
                      <source src={`http://localhost:5001/api/attachments/${message.file}`} />
                    </video>
                  ) : (
                    <a
                      href={`http://localhost:5001/api/attachments/${message.file}`}
                      className="flex items-center space-x-2 text-blue-300 hover:text-blue-400"
                      download
                    >
                      <FileText className="w-5 h-5" />
                      <span>Download File</span>
                    </a>
                  )
                ) : (
                  <p className="break-words whitespace-pre-wrap">{message.content}</p>
                )}

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
                 className={`absolute -bottom-3 ${
                   (message.sender?._id || message.sender?.id || message.sender) === currentUser.id
                     ? 'left-2'   // You sent the message → show button on left
                     : 'right-2'  // They sent the message → show button on right
                 } bg-white rounded-full shadow-sm p-1 hover:bg-gray-50 border border-gray-200`}
               >
                 <MoreVertical className="w-4 h-4 text-gray-600" />
               </button>
               
                )}

                {/* Dropdown Menu */}
                {dropdownFor === message._id && (
                <div
                ref={dropdownRef}
                className={`absolute top-full mt-1 ${
                  (message.sender?._id || message.sender?.id || message.sender) === currentUser.id
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
                    <button onClick={() => navigator.clipboard.writeText(message.content)} className="block w-full px-4 py-2 hover:bg-gray-100 text-left">📋 Copy</button>
                    {message.sender !== currentUser.id && (
                      <button
                        onClick={() => onReplyPrivately(message)}
                        className="block w-full px-4 py-2 hover:bg-gray-100 text-left"
                      >
                        🙈 Reply Privately
                      </button>
                    )}
                    <button onClick={() => onForward(message)} className="block w-full px-4 py-2 hover:bg-gray-100 text-left">🔁 Forward</button>
                    <button onClick={() => onStar(message)} className="block w-full px-4 py-2 hover:bg-gray-100 text-left">⭐ Star</button>
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
                          onClick={() => handleDeleteMessage(message._id, true)}
                          className="block w-full px-4 py-2 hover:bg-gray-100 text-left text-red-500"
                        >
                          🗑️ Delete for Everyone
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(message._id, false)}
                          className="block w-full px-4 py-2 hover:bg-gray-100 text-left text-red-500"
                        >
                          🗑️ Delete for Me
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleDeleteMessage(message._id, false)}
                        className="block w-full px-4 py-2 hover:bg-gray-100 text-left text-red-500"
                      >
                        🗑️ Delete for Me
                      </button>
                    )}


                    <button onClick={() => onSelect(message)} className="block w-full px-4 py-2 hover:bg-gray-100 text-left">✅ Select</button>
                    <button onClick={() => onShare(message)} className="block w-full px-4 py-2 hover:bg-gray-100 text-left">📤 Share</button>

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
                  <div className="absolute -bottom-4 left-2 flex space-x-1 bg-white px-2 py-1 rounded-full shadow border z-10">
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
                  <div     ref={reactionPopupRef} // ✅ Add this
                  className="absolute -bottom-20 left-2 w-60 bg-white shadow-lg rounded-lg border p-3 z-20">
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
          ))}
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
        <div className="bg-gray-100 border-l-4 border-indigo-500 p-2 mb-2 rounded relative">
          <p className="text-xs text-gray-500">
            Replying to {replyTo.sender === currentUser.id ? "yourself" : replyTo.sender?.name || "Someone"}
          </p>

          <p className="text-sm italic text-gray-800 truncate">{replyTo.content}</p>
          <button
            onClick={() => setReplyTo(null)}
            className="absolute top-1 right-2 text-gray-400 hover:text-red-500"
          >
            ✕
          </button>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-white flex items-center space-x-3">
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
        <input type="text" className="flex-1 border p-2 rounded-lg" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." />
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

      </div>
    </div>
  );
}
