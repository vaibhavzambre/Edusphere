import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import axios from "axios";
import ConversationList from "../components/messages/ConversationList";
import ChatWindow from "../components/messages/ChatWindow";
import { Conversation, Message } from "../types";

const socket = io("http://localhost:5001");
const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

export default function Messages() {
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ FLAG: to track if we just sent a message to create a new conversation
  const [wasNewConversationSent, setWasNewConversationSent] = useState(false);
  const [prefilledMessage, setPrefilledMessage] = useState<string>("");
  const refetchSingleConversation = async (conversationId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`http://localhost:5001/api/messages/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      const updatedConversation = res.data;
  
      setConversations((prev) => {
        const index = prev.findIndex((c) => c._id === conversationId);
        if (index === -1) return prev;
        const updated = [...prev];
        updated[index] = updatedConversation;
        return updated;
      });
  
      if (
        selectedConversation &&
        (selectedConversation._id === conversationId || selectedConversation.id === conversationId)
      ) {
        setSelectedConversation(updatedConversation);
      }
    } catch (err) {
      console.error("🔁 Failed to refetch conversation:", err);
    }
  };
  
  // ✅ Fetch Conversations from API
  const fetchConversations = async (): Promise<Conversation[] | undefined> => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("No authentication token found.");
        return;
      }

      const response = await axios.get("http://localhost:5001/api/messages/conversations", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (Array.isArray(response.data)) {
        setConversations(response.data);
        return response.data; // ✅ RETURN THIS!
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setError("Failed to fetch conversations.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Listen to Socket events
  useEffect(() => {
    fetchConversations();
    socket.emit("join", currentUser.id);
  
    const refresh = () => fetchConversations();
    socket.on("conversationUpdated", ({ conversationId }) => {
      // Refresh just that conversation
      refetchSingleConversation(conversationId);
    });
    
    socket.on("newMessage", refresh);
    socket.on("messageEdited", refresh);
    socket.on("messageDeleted", refresh);
    socket.on("firstMessage", refresh);
    socket.on("conversationCreated", refresh);
  
    return () => {
      socket.off("newMessage", refresh);
      socket.off("messageEdited", refresh);
      socket.off("messageDeleted", refresh);
      socket.off("firstMessage", refresh);
      socket.off("conversationCreated", refresh);
    };
  }, [selectedConversation, wasNewConversationSent]);
  
  
  // ✅ Send Message
 const handleSendMessage = async (content: string) => {
  if (!selectedConversation || !content.trim()) return;
  const token = localStorage.getItem("token");
  if (!token) return;

  const isTemp = selectedConversation.id?.startsWith("new-");
  let conversationId = selectedConversation._id || selectedConversation.id;
  let receiver = null;

  // Get the receiver (if 1-1)
  const receiverUser = selectedConversation.participants.find((p) => {
    return (p._id || p.id) !== currentUser.id;
  });

  receiver = receiverUser?._id || receiverUser?.id;

  const payload = {
    conversationId: isTemp ? null : conversationId, // ⛔ null if temp
    sender: currentUser.id,
    receiver,
    content,
    participants: selectedConversation.participants.map((p) => p._id || p.id), // ✅ needed if temp
  };

  try {
    const res = await axios.post("http://localhost:5001/api/messages/send", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // ✅ Let socket events do the rest
    socket.emit("sendMessage", res.data);
    if (isTemp) {
      socket.emit("conversationCreated", {
        ...selectedConversation,
        _id: res.data.conversationId, // assign correct ID
        lastMessage: {
          content,
          timestamp: new Date(),
        },
      });
    }
  } catch (err) {
    console.error("❌ Failed to send message:", err);
  }
};


  return (
    <div className="h-full flex">
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Loading conversations...</p>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-red-500">{error}</p>
        </div>
      ) : (
        <>
          <ConversationList
            conversations={conversations}
            currentUser={currentUser}
            onSelectConversation={setSelectedConversation}
            selectedConversationId={selectedConversation?._id || selectedConversation?.id}
            setConversations={setConversations}
          />

          {selectedConversation ? (
           <ChatWindow
  key={selectedConversation._id || selectedConversation.id}
  conversation={selectedConversation}
  authUser={currentUser}
  onSendMessage={handleSendMessage}
  prefilledMessage={prefilledMessage}
  setSelectedConversation={setSelectedConversation}
  setPrefilledMessage={setPrefilledMessage}
  replyToMessage={replyToMessage}                     // ✅ NEW
  setReplyToMessage={setReplyToMessage}  
  fetchConversations={fetchConversations}  // ✅ NEW
  // ✅ NEW
/>


          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              {conversations.length === 0 ? (
                <p className="text-gray-500">No conversations yet. Start one from the left panel!</p>
              ) : (
                <p className="text-gray-500">Select a conversation to start messaging</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
