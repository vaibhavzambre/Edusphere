import React, { useEffect, useState } from "react";
import axios from "axios";
import { Conversation, User } from "../../types";
import { Message } from "../../types"; // ✅ Add this

interface ForwardModalProps {
  // messageContent: string;
  currentUser: any;
  message: Message;

  onClose: () => void;
  setSelectedConversation: (c: Conversation) => void;
}

export default function ForwardModal({
message,
  currentUser,
  onClose,
  setSelectedConversation,
}: ForwardModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [forwarded, setForwarded] = useState(false);

  useEffect(() => {
    const loadAll = async () => {
      await fetchConversations();  // ⏳ Waits for conversations
      await fetchUsers();          // ✅ Then fetches users safely
    };
    loadAll();
  }, []);
  
  const fetchConversations = async () => {
    const token = localStorage.getItem("token");
    const res = await axios.get("http://localhost:5001/api/messages/conversations", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setConversations(res.data);
  };

  const fetchUsers = async () => {
    const token = localStorage.getItem("token");
    const res = await axios.get("http://localhost:5001/api/users/all", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const alreadyInConvo = new Set<string>();
    conversations.forEach(c => {
      if (!c.isGroup) {
        const other = c.participants.find(p => (p._id || p.id) !== currentUser.id);
        if (other) alreadyInConvo.add(other._id || other.id);
      }
    });

    const filtered = res.data.filter(
      (u: User) =>
        u._id !== currentUser.id &&
        u.role !== "admin" &&
        !alreadyInConvo.has(u._id)
    );

    setAllUsers(filtered);
  };

  const handleForward = async () => {
    const token = localStorage.getItem("token");
    const isSingle = selectedIds.length === 1;

    for (const id of selectedIds) {
      const isGroup = id.startsWith("group-");

      if (isGroup) {
        const convoId = id.replace("group-", "");
        await axios.post(
          "http://localhost:5001/api/messages/send",
          {
            conversationId: convoId,
            content: message.content,
            file: message.file || null, // ✅ include file if any
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        

        if (isSingle) {
          const convo = await axios.get(`http://localhost:5001/api/messages/conversations/${convoId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setSelectedConversation(convo.data);
        }
      } else {
        const res = await axios.post(
          "http://localhost:5001/api/messages/find-or-create",
          { participantId: id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const convo = res.data;

        await axios.post(
          "http://localhost:5001/api/messages/send",
          {
            conversationId: convo._id,
            receiver: id,
            content: message.content
            ,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (isSingle) setSelectedConversation(convo);
      }
    }

    setForwarded(true);
    setTimeout(() => {
      setForwarded(false);
      onClose();
    }, 1500);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filtered = [
    ...conversations.map(c => ({
      id: `group-${c._id}`,
      name: c.isGroup
        ? c.groupName
        : c.participants.find(p => (p._id || p.id) !== currentUser.id)?.name || "Unknown",
      email: c.isGroup ? "Group Chat" : c.participants.find(p => (p._id || p.id) !== currentUser.id)?.email || "",
    })),
    ...allUsers.map(u => ({
      id: u._id,
      name: u.name,
      email: u.email,
    })),
  ].filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white w-full max-w-xl max-h-[90vh] rounded-xl shadow-lg p-6 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Forward Message</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500">✕</button>
        </div>

        <input
          type="text"
          className="w-full p-2 border border-gray-300 rounded mb-4"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className="overflow-y-auto flex-1 space-y-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => toggleSelection(item.id)}
              className={`flex items-center justify-between border rounded-lg px-4 py-2 cursor-pointer ${
                selectedIds.includes(item.id) ? "bg-indigo-100 border-indigo-400" : "hover:bg-gray-50"
              }`}
            >
              <div className="flex flex-col">
                <span className="font-medium text-sm">{item.name}</span>
                <span className="text-xs text-gray-500">{item.email && `(${item.email})`}</span>
              </div>
              <div className="flex items-center">
                <div className={`w-5 h-5 rounded-full border-2 ${selectedIds.includes(item.id) ? "bg-indigo-600 border-indigo-600" : "border-gray-300"} flex items-center justify-center`}>
                  {selectedIds.includes(item.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            disabled={selectedIds.length === 0}
            onClick={handleForward}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>

        {forwarded && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black text-white px-4 py-2 rounded shadow text-sm">
            Message forwarded
          </div>
        )}
      </div>
    </div>
  );
}
