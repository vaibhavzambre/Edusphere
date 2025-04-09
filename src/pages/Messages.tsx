import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import axios from "axios";
import ConversationList from "../components/messages/ConversationList";
import ChatWindow,{ ChatWindowRef }  from "../components/messages/ChatWindow";
import { Conversation, Message } from "../types";
import { useRef } from "react";

const socket = io("http://localhost:5001");
const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
import { useSearchParams } from "react-router-dom";


export default function Messages() {
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [searchParams] = useSearchParams();
  const conversationIdFromUrl = searchParams.get("conversationId");
  const chatWindowRef = useRef<ChatWindowRef>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatWindowVersion, setChatWindowVersion] = useState(0);

  // ✅ FLAG: to track if we just sent a message to create a new conversation
  const [wasNewConversationSent, setWasNewConversationSent] = useState(false);
  const [prefilledMessage, setPrefilledMessage] = useState<string>("");
  useEffect(() => {
    const forceRemountHandler = () => {
      setChatWindowVersion(prev => prev + 1);
    };
    window.addEventListener("forceChatWindowRemount", forceRemountHandler);
    return () => {
      window.removeEventListener("forceChatWindowRemount", forceRemountHandler);
    };
  }, []);
  
  useEffect(() => {
    if (conversationIdFromUrl && conversations.length > 0) {
      const found = conversations.find(c => c._id === conversationIdFromUrl);
      if (found) {
        setSelectedConversation(found);
      }
    }
  }, [conversationIdFromUrl, conversations]);
  useEffect(() => {
    const handleMessagesCleared = (data: any) => {
      // Normalize payload—data is an object { conversationId: ... }
      const convId = typeof data === "string" ? data : data.conversationId;
      console.log("Messages.tsx: messagesCleared event received:", data);
      console.log("Messages.tsx: Extracted conversationId:", convId);
  
      // Refetch conversations first
      fetchConversations()
        .then(() => {
          // Then, if the cleared conversation is the one open, refresh its messages.
          if (
            selectedConversation &&
            ((selectedConversation._id || selectedConversation.id) === convId)
          ) {
            console.log("Messages.tsx: Active conversation cleared. Calling fetchMessages()");
            chatWindowRef.current?.fetchMessages();
          } else {
            console.log("Messages.tsx: Cleared conversation does not match active conversation.");
          }
        })
        .catch((err) => {
          console.error("Messages.tsx: Error refetching conversations:", err);
        });
    };
  
    socket.on("messagesCleared", handleMessagesCleared);
    console.log("Messages.tsx: messagesCleared listener registered.");
  
    return () => {
      socket.off("messagesCleared", handleMessagesCleared);
      console.log("Messages.tsx: messagesCleared listener unregistered.");
    };
  }, [selectedConversation]);
  

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
  // useEffect(() => {
  //   const handleMessagesCleared = (data: any) => {
  //     console.log("Socket event 'messagesCleared' received with data:", data);
  //     // Normalize data to an object with conversationId
  //     const conversationId = typeof data === "string" ? data : data.conversationId;
  //     console.log("Extracted conversationId:", conversationId);
  //     console.log("Current selectedConversation:", selectedConversation);
  
  //     // First, refresh the conversation list
  //     fetchConversations()
  //       .then(() => {
  //         // Then, if the cleared conversation is currently open, refresh its messages
  //         if (selectedConversation && selectedConversation._id === conversationId) {
  //           console.log(
  //             "Selected conversation matches cleared conversation. Calling fetchMessages() now."
  //           );
  //           chatWindowRef.current?.fetchMessages?.();
  //         } else {
  //           console.log(
  //             "Cleared conversation does not match the currently selected conversation."
  //           );
  //         }
  //       })
  //       .catch((err) => {
  //         console.error("Error in fetchConversations() within messagesCleared handler:", err);
  //       });
  //   };
  
  //   socket.on("messagesCleared", handleMessagesCleared);
  //   // console.log("messagesCleared event listener registered in Messages.tsx");
  
  //   return () => {
  //     socket.off("messagesCleared", handleMessagesCleared);
  //     console.log("messagesCleared event listener unregistered from Messages.tsx");
  //   };
  // }, [selectedConversation]);
  
  // ✅ Listen to Socket events
  useEffect(() => {
    fetchConversations();
    socket.emit("join", currentUser.id);
  
    const refresh = () => fetchConversations();
    socket.on("conversationUpdated", ({ conversationId }) => {
      // Refresh just that conversation
      refetchSingleConversation(conversationId);
    });
    socket.on("messagesCleared", refresh);
    
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
            fetchConversations={fetchConversations} 
            chatWindowRef={chatWindowRef}   // <-- Add this line

          />

          {selectedConversation ? (
           <ChatWindow
           key={`${selectedConversation._id}-${chatWindowVersion}`}
           conversation={selectedConversation}
  authUser={currentUser}
  onSendMessage={handleSendMessage}
  prefilledMessage={prefilledMessage}
  setSelectedConversation={setSelectedConversation}
  setPrefilledMessage={setPrefilledMessage}
  replyToMessage={replyToMessage}                     // ✅ NEW
  setReplyToMessage={setReplyToMessage}  
  fetchConversations={fetchConversations}
  conversations={conversations} // ✅ Add this
  chatWindowRef={chatWindowRef} // ✅ PASS THE REF!


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
