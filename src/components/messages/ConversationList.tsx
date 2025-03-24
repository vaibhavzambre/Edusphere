  import React, { useState, useEffect, useRef } from "react";
  import { Search, MoreVertical, X } from "lucide-react";
  import axios from "axios";
  import { useAuth } from "../../context/AuthContext";
  import type { Conversation, User } from "../../types";
  import io from "socket.io-client";
  const socket = io("http://localhost:5001"); // adjust if needed
  
  interface ConversationWithUnread extends Conversation {
    unreadCount?: number;
  }

  interface ClassData {
    _id: string;
    class_code: number;
    commencement_year: number;
    specialization: string;
  }

  interface ConversationListProps {
    conversations: ConversationWithUnread[];
    onSelectConversation: (conversation: Conversation) => void;
    selectedConversationId?: string;
    // If you want to update conversation list from inside, you can pass a setter:
    setConversations?: React.Dispatch<React.SetStateAction<Conversation[]>>;
  }

  export default function ConversationList({
    conversations,
    onSelectConversation,
    selectedConversationId,
    setConversations,
  }: ConversationListProps) {
    const { user } = useAuth();
    const currentUserId = user?.id || user?._id;

    // ----------------------------------------
    // 1) Searching for direct chat
    // ----------------------------------------
    const [searchQuery, setSearchQuery] = useState("");
    const [searchDropdownVisible, setSearchDropdownVisible] = useState(false);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const searchRef = useRef<HTMLDivElement>(null);

    // ----------------------------------------
    // 2) "New Group" Modal
    // ----------------------------------------
    const [showGroupModal, setShowGroupModal] = useState(false);

    // Group form states
    const [groupName, setGroupName] = useState("");
    const [classesList, setClassesList] = useState<ClassData[]>([]);
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

    // "Add Individual" sub-modal
    const [showAddParticipantsModal, setShowAddParticipantsModal] = useState(false);
    const [appUsers, setAppUsers] = useState<User[]>([]); // all users except role=admin
    const [participantSearch, setParticipantSearch] = useState("");
    const [filteredAppUsers, setFilteredAppUsers] = useState<User[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

    // ----------------------------------------
    // 3) More options (the three-dot button)
    // ----------------------------------------
    const [optionsVisible, setOptionsVisible] = useState(false);
    const optionsRef = useRef<HTMLDivElement>(null);

    // ----------------------------------------
    // 4) useEffect: fetch data
    // ----------------------------------------
    useEffect(() => {
      fetchAllUsersForSearch();
      fetchClasses();
      fetchAppUsers();
    }, []);

    // close search dropdown if clicked outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
          setSearchDropdownVisible(false);
        }
        if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
          setOptionsVisible(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ----------------------------------------
    // 5) Searching for direct messages
    // ----------------------------------------
    const fetchAllUsersForSearch = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await axios.get("http://localhost:5001/api/users/all", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAllUsers(res.data);
      } catch (error) {
        console.error("Error fetching all users for conversation search:", error);
      }
    };

    useEffect(() => {
      if (searchQuery.trim().length > 0) {
        const filtered = allUsers.filter(
          (u) =>
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredUsers(filtered);
        setSearchDropdownVisible(true);
      } else {
        setSearchDropdownVisible(false);
        setFilteredUsers([]);
      }
    }, [searchQuery, allUsers]);

    const handleSelectUser = async (selectedUser: User) => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await axios.post(
          "http://localhost:5001/api/messages/find-or-create",
          { participantId: selectedUser._id },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const oneToOneConversation: Conversation = res.data;

        // Update the conversation list:
        if (setConversations) {
          setConversations((prev) => {
            // Remove any existing 1-1 conversation between these two users
            const filtered = prev.filter(
              (c) =>
                !(
                  c.isGroup === false &&
                  c.participants.length === 2 &&
                  c.participants.some(
                    (p) =>
                      (p._id || p.id).toString() === selectedUser._id.toString()
                  )
                )
            );
            return [oneToOneConversation, ...filtered];
          });
        }

        // Immediately force the selected conversation to be the 1-1 conversation
        onSelectConversation(oneToOneConversation);
      } catch (error) {
        console.error("Failed to get or create 1-1 conversation:", error);
      } finally {
        setSearchDropdownVisible(false);
        setSearchQuery("");
      }
    };


    // ----------------------------------------
    // 6) Group Creation
    // ----------------------------------------
    // 6A) Fetch classes
    const fetchClasses = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await axios.get("http://localhost:5001/api/classes", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setClassesList(res.data); // array of { _id, class_code, commencement_year, specialization }
      } catch (error) {
        console.error("Error fetching classes:", error);
      }
    };

    // 6B) Fetch all non-admin users for “Add Participants”
    const fetchAppUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        // fetch all, but we'll filter out role=admin
        const res = await axios.get("http://localhost:5001/api/users/all", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const nonAdmins = res.data.filter((u: User) => u.role !== "admin");
        setAppUsers(nonAdmins);
      } catch (error) {
        console.error("Error fetching app users:", error);
      }
    };

    // Filter the “Add Participants” list
    useEffect(() => {
      if (participantSearch.trim().length > 0) {
        const filtered = appUsers.filter(
          (u) =>
            u.name.toLowerCase().includes(participantSearch.toLowerCase()) ||
            u.email.toLowerCase().includes(participantSearch.toLowerCase())
        );
        setFilteredAppUsers(filtered);
      } else {
        setFilteredAppUsers(appUsers);
      }
    }, [participantSearch, appUsers]);

    // Toggle class selection
    const toggleClassSelection = (classId: string) => {
      setSelectedClassIds((prev) =>
        prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
      );
    };

    // Toggle participant selection
    const toggleUserSelection = (userId: string) => {
      setSelectedUserIds((prev) =>
        prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
      );
    };

    // 6C) “Create Group” call
    const handleCreateGroup = async () => {
      try {
        if (!groupName.trim()) {
          alert("Group name is required!");
          return;
        }
        const token = localStorage.getItem("token");
        if (!token) {
          alert("No auth token found");
          return;
        }
        const body = {
          groupName,
          classIds: selectedClassIds,
          individualUserIds: selectedUserIds,
        };
        const res = await axios.post("http://localhost:5001/api/messages/createGroup", body, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const newGroupConversation: Conversation = res.data;

        // If parent gave us a setConversations, we can add the new group
        if (setConversations) {
          setConversations((prev) => [newGroupConversation, ...prev]);
        }

        // Close the modal
        setShowGroupModal(false);
        setGroupName("");
        setSelectedClassIds([]);
        setSelectedUserIds([]);
        setShowAddParticipantsModal(false);

        // Optionally auto-select the new conversation
        onSelectConversation(newGroupConversation);
      } catch (error) {
        console.error("❌ Failed to create group:", error);
        alert("Failed to create group");
      }
    };
    useEffect(() => {
      socket.on("newMessage", (message) => {
        if (setConversations) {
          setConversations((prev) =>
            prev.map((c) => {
              if (c._id === message.conversationId) {
                return {
                  ...c,
                  unreadCount: c._id === selectedConversationId ? 0 : (c.unreadCount || 0) + 1,
                  lastMessage: message,
                };
              }
              return c;
            })
          );
        }
      });
    
      socket.on("markedAsRead", (conversationId) => {
        if (setConversations) {
          setConversations((prev) =>
            prev.map((c) =>
              c._id === conversationId ? { ...c, unreadCount: 0 } : c
            )
          );
        }
      });
    
      return () => {
        socket.off("newMessage");
        socket.off("markedAsRead");
      };
    }, [selectedConversationId, setConversations]);
    
    // ----------------------------------------
    // 7) Render
    // ----------------------------------------
    return (
      <div className="w-80 border-r border-gray-200 h-full flex flex-col bg-white relative">
        {/* Header with Search + More Options */}
        <div className="p-4 border-b border-gray-200 flex items-center space-x-2">
          {/* Search input for direct messages */}
          <div className="relative flex-1" ref={searchRef}>
            <input
              type="text"
              placeholder="Search conversations or users..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200
                        focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />

            {/* Search dropdown for direct chat */}
            {searchDropdownVisible && filteredUsers.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-gray-200 
                              rounded-lg mt-1 max-h-60 overflow-y-auto shadow-md">
                {filteredUsers.map((usr) => (
                  <div
                    key={usr._id}
                    className="p-3 cursor-pointer hover:bg-gray-100 flex items-center space-x-3"
                    onClick={() => handleSelectUser(usr)}
                  >
                    <img
                      src={
                        usr.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(usr.name)}`
                      }
                      alt={usr.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{usr.name}</p>
                      <p className="text-sm text-gray-500">{usr.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Three-dot menu */}
          <div className="relative" ref={optionsRef}>
            <button
              onClick={() => setOptionsVisible(!optionsVisible)}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>

            {optionsVisible && (
              <div className="absolute right-0 top-10 w-40 bg-white border 
                              rounded shadow-md z-10">
                {/* "New Group" opens a dedicated modal */}
                <button
                  onClick={() => {
                    setShowGroupModal(true);
                    setOptionsVisible(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  ➕ New Group
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Existing Conversations */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conversation) => {
            // If it's a group, show groupName. If it's a 1-to-1, show the other participant
            const isGroup = conversation.isGroup;
            const isActive =
              selectedConversationId === (conversation._id || conversation.id);

            // For 1-to-1
            const otherParticipant = !isGroup
              ? conversation.participants.find(
                (p) =>
                (typeof p === "string"
                  ? p !== currentUserId
                  : p._id !== currentUserId)
              )
              : null;

            return (
              <button
                key={(conversation._id || conversation.id) + (conversation.lastMessage?.timestamp || '')}
                onClick={async () => {
                  onSelectConversation(conversation);
                
                  // 🧠 Only mark as read + move to top if unread
                  if (conversation.unreadCount && conversation.unreadCount > 0 && setConversations) {
                    try {
                      const token = localStorage.getItem("token");
                      await axios.put(
                        `http://localhost:5001/api/messages/mark-read/${conversation._id}`,
                        {},
                        { headers: { Authorization: `Bearer ${token}` } }
                      );
                
                      // ✅ Update conversation unread count + re-sort
                      setConversations((prev) => {
                        const updated = prev.map((c) =>
                          c._id === conversation._id ? { ...c, unreadCount: 0 } : c
                        );
                
                        return [...updated].sort((a, b) => {
                          const aTime = new Date(a.lastMessage?.timestamp || 0).getTime();
                          const bTime = new Date(b.lastMessage?.timestamp || 0).getTime();
                          return bTime - aTime;
                        });
                      });
                    } catch (err) {
                      console.error("❌ Failed to mark messages as read:", err);
                    }
                  }
                }}
                
                                className={`w-full p-4 flex items-center space-x-3 hover:bg-gray-50
                  ${isActive ? "bg-indigo-50" : ""}
                  ${conversation.unreadCount && conversation.unreadCount > 0 ? "font-semibold" : ""}
                `}
                
              >
                {/* Avatar: group or single */}
                {isGroup ? (
                  <div className="w-12 h-12 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold">
                    {conversation.groupName
                      ? conversation.groupName.charAt(0).toUpperCase()
                      : "G"}
                  </div>
                ) : (
                  <img
                    src={
                      (otherParticipant as any)?.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        (otherParticipant as any)?.name || "User"
                      )}`
                    }
                    alt={(otherParticipant as any)?.name || "User"}
                    className="w-12 h-12 rounded-full"
                  />
                )}

  <div className="flex-1 min-w-0">
    <div className="flex items-center justify-between">
    <div className="flex items-center space-x-2">
    <p className="font-medium text-gray-900 truncate">
      {isGroup
        ? conversation.groupName || "Unnamed Group"
        : (otherParticipant as any)?.name || "Unknown"}
    </p>

    {(conversation.unreadCount || 0) > 0 && (
  <span className="ml-1 bg-indigo-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
    {conversation.unreadCount}
  </span>
)}

  </div>


      {conversation.lastMessage?.timestamp && (
        <span className="text-xs text-gray-500">
          {new Date(conversation.lastMessage.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      )}
    </div>

    <p className="text-sm text-gray-500 truncate">
      {!conversation.lastMessage
        ? "No messages yet"
        : conversation.lastMessage.isDeletedForEveryone
        ? "🗑️ Message deleted"
        : conversation.lastMessage.file
        ? "📎 Sent an attachment"
        : conversation.lastMessage.content || "—"}
    </p>
  </div>

              </button>
            );
          })}
          
        </div>

        {/* NEW GROUP MODAL */}
        {showGroupModal && (
          <div className="fixed inset-0 z-40 flex items-start justify-center bg-black bg-opacity-50 pt-10">
            <div className="bg-white w-full max-w-2xl rounded shadow-lg p-6 relative">
              {/* Close button */}
              <button
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setShowGroupModal(false);
                  setGroupName("");
                  setSelectedClassIds([]);
                  setSelectedUserIds([]);
                }}
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-lg font-semibold mb-4">Create New Group</h2>

              {/* Group Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Group Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full mt-1 p-2 border rounded"
                  placeholder="Enter group name..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>

              {/* Select Classes (multi-check) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Classes
                </label>
                <div className="max-h-36 overflow-y-auto border rounded p-2">
                  {classesList.map((cls) => (
                    <label
                      key={cls._id}
                      className="flex items-center mb-1 hover:bg-gray-100 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={selectedClassIds.includes(cls._id)}
                        onChange={() => toggleClassSelection(cls._id)}
                      />
                      {cls.class_code} - {cls.commencement_year} (
                      {cls.specialization})
                    </label>
                  ))}
                </div>
              </div>

              {/* Add Individual Participants */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setShowAddParticipantsModal(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  ➕ Add Individual Participants
                </button>
                <p className="text-sm text-gray-500 mt-1">
                  (Already excludes users with role="admin")
                </p>

                {/* Show selected user count (optional) */}
                {selectedUserIds.length > 0 && (
                  <p className="text-sm text-gray-700 mt-2">
                    Selected {selectedUserIds.length} participant
                    {selectedUserIds.length > 1 ? "s" : ""}.
                  </p>
                )}
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowGroupModal(false);
                    setGroupName("");
                    setSelectedClassIds([]);
                    setSelectedUserIds([]);
                  }}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroup}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Create Group
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ADD PARTICIPANTS MODAL */}
        {showAddParticipantsModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-50 pt-10">
            <div className="bg-white w-full max-w-xl rounded shadow-lg p-6 relative">
              {/* Close button */}
              <button
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                onClick={() => setShowAddParticipantsModal(false)}
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-lg font-semibold mb-4">Add Participants</h2>

              {/* Search */}
              <input
                type="text"
                className="w-full mb-3 p-2 border rounded"
                placeholder="Search by name or email..."
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
              />

              {/* List */}
              <div className="max-h-60 overflow-y-auto border rounded p-2">
                {filteredAppUsers.map((u) => (
                  <label
                    key={u._id}
                    className="flex items-center justify-between px-2 py-1 hover:bg-gray-100 rounded"
                  >
                    <div>
                      <span className="font-medium">{u.name}</span>{" "}
                      <span className="text-sm text-gray-500">({u.email})</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(u._id)}
                      onChange={() => toggleUserSelection(u._id)}
                    />
                  </label>
                ))}
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowAddParticipantsModal(false)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
