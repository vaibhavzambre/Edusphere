// src/components/messages/GroupInfoPanel.tsx
import React, { useState, useEffect } from "react";
import type { Conversation, Message } from "../../types";
import {
  Users,
  Image as ImageIcon,
  File,
  Link,
  Calendar,
  Lock,
  LogOut,
  MessageCircle,
  Shield,
  Trash2,
  UserPlus,
  X,
  Edit,
  User,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-hot-toast";
import io from "socket.io-client";
import { useNavigate } from "react-router-dom";
import ForwardModal from "./ForwardModal"; // Adjust path if needed

// Create a shared socket instance (ensure only one instance exists app‑wide)
const socket = io("http://localhost:5001");

interface GroupInfoPanelProps {
  conversation: Conversation;
  onClose: () => void;
  fetchConversations: () => void; 
  setSelectedConversation: (c: Conversation) => void; // ✅ NEW
// Added fetchConversations

}

export default function GroupInfoPanel({ conversation, onClose ,  setSelectedConversation}: GroupInfoPanelProps) {
  const { user: currentUser } = useAuth();

  // Define tabs for the side navigation
  const TABS = [
    { key: "overview", label: "Overview", icon: null },
    { key: "members", label: "Members", icon: <Users size={18} /> },
    { key: "media", label: "Media", icon: <ImageIcon size={18} /> },
    { key: "files", label: "Files", icon: <File size={18} /> },
    { key: "links", label: "Links", icon: <Link size={18} /> },
    { key: "events", label: "Events", icon: <Calendar size={18} /> },
    { key: "encryption", label: "Encryption", icon: <Lock size={18} /> },
  ];

  const [activeTab, setActiveTab] = useState<string>("overview");
  const [description, setDescription] = useState<string>(conversation.description || "");
  const [editMode, setEditMode] = useState<boolean>(false);
  const [confirmExit, setConfirmExit] = useState<boolean>(false);
  const [memberPopup, setMemberPopup] = useState<string | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);

  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  // Local state to hold the updated conversation data
  const [updatedConversation, setUpdatedConversation] = useState<Conversation>(conversation);
  const [memberSearch, setMemberSearch] = useState<string>("");


  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
const [availableClasses, setAvailableClasses] = useState([]);
const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
const [allUsers, setAllUsers] = useState<User[]>([]);
const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
const [showAddParticipantsModal, setShowAddParticipantsModal] = useState(false);
const [participantSearch, setParticipantSearch] = useState("");
const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
const [classSearch, setClassSearch] = useState("");
const [mediaMessages, setMediaMessages] = useState<Message[]>([]);
const [fileMessages, setFileMessages] = useState<Message[]>([]);
const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
const [isSelecting, setIsSelecting] = useState(false);
const [previewImage, setPreviewImage] = useState<string | null>(null);
const selectedMediaObjects = mediaMessages.filter((msg) =>
  selectedMedia.includes(msg._id)
);

const [hoveringMediaId, setHoveringMediaId] = useState<string | null>(null); // Which image is hovered
const [isMultiSelecting, setIsMultiSelecting] = useState(false); // Multi-select mode active
const [previewMedia, setPreviewMedia] = useState<string | null>(null); // Fullscreen preview
const handleDeleteSelectedMedia = async () => {
  if (selectedMedia.length === 0) return;

  const confirm = window.confirm(`Are you sure you want to delete ${selectedMedia.length} media item(s)?`);
  if (!confirm) return;

  try {
    // Send a request to delete the selected media
    await axios.put(
      "http://localhost:5001/api/messages/delete-multiple",
      { messageIds: selectedMedia },
      { headers }
    );

    // Success
    toast.success("Media deleted");

    // Update the media messages UI
    const updatedMedia = mediaMessages.filter((msg) => !selectedMedia.includes(msg._id));
    setMediaMessages(updatedMedia);  // UI update
    setSelectedMedia([]);            // Clear selection
    setIsMultiSelecting(false);      // Disable multi-select

  } catch (err) {
    console.error("Error deleting messages:", err);
    toast.error("Failed to delete media.");
  }
};
useEffect(() => {
  socket.on("messageDeleted", ({ id, forEveryone, userId }) => {
    // Update the UI to remove the deleted message from the media/messages
    setMediaMessages(prev => prev.filter(msg => msg._id !== id));
    setFileMessages(prev => prev.filter(msg => msg._id !== id));

    // Optionally, show toast notification for deleted messages
    if (forEveryone) {
      toast.success("Message deleted for everyone.");
    } else if (userId === currentUser.id) {
      toast.success("Message deleted for you.");
    }
  });

  return () => {
    socket.off("messageDeleted");
  };
}, []);


const handleAddMembers = async () => {
  try {
    await axios.put(
      `http://localhost:5001/api/messages/conversations/group/${conversation._id}/add-members`,
      {
        classIds: selectedClassIds,
        individualUserIds: selectedUserIds,
      },
      { headers }
    );

    toast.success("Members added successfully!");
    setShowAddMemberModal(false);
    setSelectedClassIds([]);
    setSelectedUserIds([]);
  } catch (err) {
    console.error("Failed to add members:", err);
    toast.error("Could not add members.");
  }
};
useEffect(() => {
  if (participantSearch.trim()) {
    setFilteredUsers(
      allUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(participantSearch.toLowerCase()) ||
          u.email.toLowerCase().includes(participantSearch.toLowerCase())
      )
    );
  } else {
    setFilteredUsers(allUsers);
  }
}, [participantSearch, allUsers]);

useEffect(() => {
  if (!showAddMemberModal) return;

  const fetchData = async () => {
    try {
      const classRes = await axios.get("http://localhost:5001/api/classes", { headers });
      const userRes = await axios.get("http://localhost:5001/api/users/all", { headers });

      const filteredUsers = userRes.data.filter((user: User) =>
        user._id !== currentUser.id &&
        !conversation.groupAdmin.includes(user._id) &&
        !conversation.participants.some(p => p._id === user._id)
      );
      

      setAvailableClasses(classRes.data);
      setAllUsers(filteredUsers);
    } catch (err) {
      console.error("Error fetching data for Add Members:", err);
    }
  };

  fetchData();
}, [showAddMemberModal]);

  const fetchConversation = async () => {
    try {
      const res = await axios.get(`http://localhost:5001/api/messages/conversations/${conversation._id}`, { headers });
      setUpdatedConversation(res.data);
      setDescription(res.data.description || "");
    } catch (error) {
      console.error("Error fetching conversation:", error);
    }
  };
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".member-popup")) {
        setMemberPopup(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // Socket listeners to update group info in realtime
  useEffect(() => {
    
    // Always fetch fresh data when panel opens
    fetchConversation();
    const fetchMessages = async () => {
      try {
        const res = await axios.get(`http://localhost:5001/api/messages/conversation/${conversation._id}`, {
          headers,
        });
        const msgs = res.data;
    
        setMediaMessages(msgs.filter((msg: Message) =>
          msg.file?.type?.startsWith("image/") || msg.file?.type?.startsWith("video/")
        ));
        setFileMessages(msgs.filter((msg: Message) =>
          msg.file?.type && !msg.file.type.startsWith("image/") && !msg.file.type.startsWith("video/")
        ));
      } catch (err) {
        console.error("Error fetching messages for media/files:", err);
      }
    };
    
    fetchMessages();
    
    const handleGroupUpdated = (updated: Conversation) => {
      if (updated._id === conversation._id) {
        fetchConversation(); // pulls latest group info
      }
    };
    
  
    const handleRemovedFromGroup = (payload: { conversationId: string }) => {
      if (payload.conversationId === conversation._id) {
        onClose();
        toast("You have been removed from the group", { icon: "👋" });
      }
    };
  
    socket.on("groupUpdated", handleGroupUpdated);
    socket.on("removedFromGroup", handleRemovedFromGroup);
  
    return () => {
      socket.off("groupUpdated", handleGroupUpdated);
      socket.off("removedFromGroup", handleRemovedFromGroup);
    };
  }, [conversation._id]);
  
  // --- Handlers for group actions ---

  const handleSaveDescription = async () => {
    try {
      await axios.put(
        `http://localhost:5001/api/messages/conversations/group/${conversation._id}/description`,
        { description },
        { headers }
      );
      setEditMode(false);
      toast.success("Group description updated");
      // The backend should emit a "groupUpdated" event to update all clients.
    } catch (err) {
      console.error("Failed to update description", err);
      toast.error("Failed to update group description");
    }
  };

  const handleExitGroup = async () => {
    try {
      await axios.put(
        `http://localhost:5001/api/messages/conversations/group/${conversation._id}/exit`,
        {},
        { headers }
      );
      // Optionally, emit a socket event here if needed.
      toast.success("You exited the group");
      onClose();
    } catch (err) {
      console.error("Error leaving group:", err);
      toast.error("Failed to leave group");
    }
  };

  const handleMakeAdmin = async (userId: string) => {
    try {
      await axios.put(
        `http://localhost:5001/api/messages/conversations/group/${conversation._id}/make-admin`,
        { userId },
        { headers }
      );
      // Emit the updated group info to all clients in this conversation's room.
      await fetchConversation();

// 👇 DO NOT emit from frontend. Let the backend do it via req.io

// ✅ Now immediately refetch fresh data (crucial!)
await fetchConversation();

      toast.success("User promoted to admin");
    } catch (err) {
      console.error("Failed to make admin:", err);
      toast.error("Failed to promote member");
    }
  };
  const filteredMembers = updatedConversation.participants.filter((member) =>
    member.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
    member.email?.toLowerCase().includes(memberSearch.toLowerCase())
  );
  
  const handleRemoveMember = async (userId: string) => {
    const confirmed = window.confirm("Are you sure you want to remove this member?");
    if (!confirmed) return;
    try {
      await axios.put(
        `http://localhost:5001/api/messages/conversations/group/${conversation._id}/remove-member`,
        { userId },
        { headers }
      );
      await fetchConversation(); 
      toast.success("Member removed");
    } catch (err) {
      console.error("Failed to remove member:", err);
      toast.error("Failed to remove member");
    }
  };

  const handleMessageUser = async (userId: string) => {
    try {
      const res = await axios.post(
        "http://localhost:5001/api/messages/find-or-create",
        { participantId: userId },
        { headers }
      );
      const convo = res.data;
  
      setSelectedConversation(convo); // ✅ Use it
      onClose(); // ✅ Close group info panel
    } catch (err) {
      console.error("Failed to open chat:", err);
      toast.error("Failed to open chat with user.");
    }
  };
  
  

  // --- Render main content based on active tab ---
  const renderMainContent = () => {
    switch (activeTab) {
      // ... (previous imports and interfaces)

case "overview":
  return (
    <div className="space-y-6">
      {/* Group Header */}
      <div className="text-center">
        <div className="relative inline-block">
          <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 text-2xl font-bold mb-3">
            {conversation.groupName?.charAt(0).toUpperCase() || "G"}
          </div>
          {conversation.isPublic && (
            <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-sm">
              <Globe className="w-5 h-5 text-blue-500" />
            </div>
          )}
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          {updatedConversation.groupName}
        </h2>
        <p className="text-sm text-gray-500">
          {updatedConversation.participants.length} members
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            <div>
              <p className="text-xs text-gray-500">Created</p>
              <p className="text-sm font-medium">
                {new Date(conversation.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-gray-600" />
            <div>
              <p className="text-xs text-gray-500">Created By</p>
              <p className="text-sm font-medium">
                {updatedConversation.createdBy?.name || "Unknown"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Description Section */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Description</h3>
          {!editMode && updatedConversation.groupAdmin?.includes(currentUser.id) && (
            <button
              onClick={() => setEditMode(true)}
              className="text-indigo-600 hover:text-indigo-700 text-sm flex items-center gap-1"
            >
              <Edit className="w-4 h-4" /> Edit
            </button>
          )}
        </div>

        {editMode ? (
          <div className="space-y-3">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={4}
              placeholder="Add a group description..."
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setEditMode(false);
                  setDescription(updatedConversation.description || "");
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDescription}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-600 text-sm leading-relaxed">
            {description || (
              <span className="text-gray-400 italic">No description added</span>
            )}
          </p>
        )}
      </div>

      {/* Danger Zone */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold text-red-600 mb-3">Danger Zone</h3>
        <button
          onClick={() => setConfirmExit(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-red-100 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Leave Group
        </button>
        <p className="text-xs text-gray-500 mt-2 text-center">
          You'll stop receiving messages from this group
        </p>
      </div>
    </div>
  );
      case "members":
        return (

<div className="space-y-3  overflow-y-auto pr-1">
{/* max-h-[400px] */}

            <h3 className="font-semibold text-gray-800 mb-2">Members</h3>
            <input
  type="text"
  placeholder="Search members"
  value={memberSearch}
  onChange={(e) => setMemberSearch(e.target.value)}
  className="w-full px-3 py-2 border rounded text-sm mb-3"
/>
<div className="flex items-center space-x-2 mt-3 cursor-pointer hover:bg-gray-50 p-2 rounded" onClick={() => setShowAddMemberModal(true)}>
  <div className="w-8 h-8 rounded-full border border-gray-400 flex items-center justify-center">
    <UserPlus size={18} />
  </div>
  <p className="text-sm font-medium">Add members</p>
</div>

            {updatedConversation.participants
            .filter((member) =>
              member.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
              member.email?.toLowerCase().includes(memberSearch.toLowerCase())
            )
            .map((member: User) => (
              <div key={member._id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50 relative">
                <div className="flex items-center space-x-2">
                  <img
                    src={
                      member.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || "User")}`
                    }
                    alt="avatar"
                    className="w-8 h-8 rounded-full"
                  />
                  <div>
                    <p className="text-sm font-medium">
                      {member.name}{" "}
                      {member._id === currentUser.id && <span className="text-xs text-gray-500">(You)</span>}
                    </p>
                    <p className="text-xs text-gray-500">
                      {member.email} &bull; {member.role}
                    </p>
                    {updatedConversation.groupAdmin?.includes(member._id) && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-[2px] rounded-full ml-1">
                        Admin
                      </span>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setMemberPopup((prev) => (prev === member._id ? null : member._id))
                    }
                    className="text-sm text-gray-500 hover:underline"
                  >
                    ⋮
                  </button>
                  {memberPopup === member._id && (
                    <div className="absolute right-0 top-8 bg-white border shadow rounded w-40 z-10 member-popup">
                    <button
                        type="button"
                        onClick={async () => { await handleMessageUser(member._id); setMemberPopup(null); }}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full text-left text-sm"
                      >
                        <MessageCircle size={14} /> Message User
                      </button>
                      {updatedConversation.groupAdmin?.includes(currentUser.id) && (
  <>
    {!updatedConversation.groupAdmin?.includes(member._id) && (
      <button
        type="button"
        onClick={async () => { await handleMakeAdmin(member._id); setMemberPopup(null); }}
        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full text-left text-sm"
      >
        <Shield size={14} /> Make Admin
      </button>
    )}

    <button
      type="button"
      onClick={async () => { await handleRemoveMember(member._id); setMemberPopup(null); }}
      className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full text-left text-sm text-red-600"
    >
      <Trash2 size={14} /> Remove Member
    </button>
  </>
)}

                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
        case "media":
  return (
    <div className="relative h-full pb-16">
  <h3 className="font-semibold text-gray-800 mb-2">Media</h3>

      {mediaMessages.length === 0 ? (
        <p className="text-sm text-gray-500 italic">(No media to show yet)</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {mediaMessages.map((msg) => {
            const isSelected = selectedMedia.includes(msg._id);
            return (
              <div
                key={msg._id}
                className="relative group"
                onMouseEnter={() => setHoveringMediaId(msg._id)}
                onMouseLeave={() => setHoveringMediaId(null)}
              >
                {/* Image or Video Preview */}
                {msg.file.type.startsWith("video/") ? (
                  <video
                    src={`http://localhost:5001/api/attachments/${msg.file._id}`}
                    className="w-full h-32 object-cover rounded"
                    muted
                  />
                ) : (
                  <img
                    src={`http://localhost:5001/api/attachments/${msg.file._id}`}
                    alt={msg.file.name}
                    className="w-full h-32 object-cover rounded cursor-pointer"
                    onClick={() => {
                      if (!isMultiSelecting) setPreviewMedia(`http://localhost:5001/api/attachments/${msg.file._id}`);
                    }}
                  />
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-10 opacity-0 group-hover:opacity-100 transition rounded" />

                {/* Checkbox Icon (only visible on hover or in multi-select mode) */}
                {(hoveringMediaId === msg._id || isMultiSelecting) && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      const newSelected = selectedMedia.includes(msg._id)
                        ? selectedMedia.filter((id) => id !== msg._id)
                        : [...selectedMedia, msg._id];
                      setSelectedMedia(newSelected);
                      setIsMultiSelecting(newSelected.length > 0);
                    }}
                    className="absolute top-2 right-2 bg-white bg-opacity-90 rounded-full p-[2px] cursor-pointer z-10"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // Handled above
                      className="w-4 h-4 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Action Bar when media selected */}
      {isMultiSelecting && (
        <div className="fixed bottom-0 right-0 w-[28rem] bg-white border-t border-gray-300 px-4 py-3 z-50">
        <span className="text-sm text-gray-600">
      {selectedMedia.length} selected
    </span>
    <div className="space-x-4">
    <button
  onClick={() => setShowForwardModal(true)}
  className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
>
        ↪ Forward
      </button>
      <div className="relative inline-block">
  <button className="px-4 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
    🗑 Delete ⌄
  </button>
  <div className="absolute bg-white shadow rounded bottom-full mb-1 right-0 z-10 w-48 border">
  <button
      onClick={() => handleDeleteSelectedMedia(false)}
      className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
    >
      Delete for Me
    </button>

    {/* Show "Delete for Everyone" only if all selected are sent by current user */}
    {selectedMediaObjects.every((msg) => msg.sender?._id === currentUser.id) && (
      <button
        onClick={() => handleDeleteSelectedMedia(true)}
        className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-600"
      >
        Delete for Everyone
      </button>
    )}
  </div>
</div>

      <button
        onClick={() => {
          setSelectedMedia([]);
          setIsMultiSelecting(false);
        }}
        className="text-gray-500 hover:text-gray-700 text-sm"
      >
        ✕ Cancel
      </button>
    </div>
  </div>
)}

    </div>
  );

        
          case "files":
            return (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Files</h3>
                {fileMessages.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">(No files to show yet)</p>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {fileMessages.map((msg) => (
                      <li key={msg._id} className="flex items-center justify-between py-2">
                        <div className="flex items-center space-x-2">
                          <File className="w-5 h-5 text-gray-500" />
                          <span className="text-sm text-gray-800 truncate max-w-[220px]">{msg.file.name}</span>
                        </div>
                        <a
                          href={`http://localhost:5001/api/attachments/${msg.file._id}`}
                          download
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Download
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          
      case "links":
        return (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Links</h3>
            <p className="text-sm text-gray-500 italic">(No links to show yet)</p>
          </div>
        );
      case "events":
        return (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Events</h3>
            <p className="text-sm text-gray-500 italic">(No events to show yet)</p>
          </div>
        );
      case "encryption":
        return (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Encryption</h3>
            <p className="text-sm text-gray-500">
              Messages are end-to-end encrypted. ...
            </p>
          </div>
        );
      default:
        return <p className="text-sm text-gray-500 italic">No content available.</p>;
    }
  };

  return (
    <>
      {/* Fullscreen overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-30 z-40" onClick={onClose} />
      {/* Outer container */}
      <div className="fixed top-0 right-0 h-full w-[28rem] bg-white shadow-lg z-50 flex">
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-indigo-200 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                {conversation.groupName?.charAt(0).toUpperCase() || "G"}
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">{conversation.groupName || "Group"}</h2>
                <p className="text-xs text-gray-500">Group Info</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Main content */}
          <div className="flex-1 overflow-y-auto p-4">{renderMainContent()}</div>
        </div>
        {/* Tabs */}
        <div className="w-20 border-l flex flex-col items-center py-4 space-y-4">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-col items-center w-full py-2 ${activeTab === tab.key ? "bg-indigo-50 text-indigo-600 font-semibold" : "text-gray-600 hover:bg-gray-50"}`}
            >
              {tab.icon && <div>{tab.icon}</div>}
              <span className="text-xs mt-1">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Exit Group Confirmation Modal */}
      {confirmExit && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h2 className="text-lg font-semibold">Exit Group?</h2>
            <p className="text-sm text-gray-600">Are you sure you want to leave this group?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmExit(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded">
                Cancel
              </button>
              <button onClick={handleExitGroup} className="bg-red-600 text-white px-4 py-2 rounded">
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
{showAddMemberModal && (
  <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-50 pt-10">
    <div className="bg-white w-full max-w-2xl rounded shadow-lg p-6 relative h-[65vh] overflow-y-auto">
      {/* Close button */}
      <button
        className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        onClick={() => {
          setShowAddMemberModal(false);
          setSelectedClassIds([]);
          setSelectedUserIds([]);
        }}
      >
        <X className="w-5 h-5" />
      </button>

      <h2 className="text-lg font-semibold mb-4">Add Members</h2>

      {/* Select Classes */}
      {/* Search Classes */}
<div className="mb-4">
  <label className="block text-sm font-medium text-gray-700 mb-1">Search & Select Classes</label>
  <input
    type="text"
    className="w-full mb-2 p-2 border rounded"
    placeholder="Search by class code, course, specialization..."
    value={classSearch}
    onChange={(e) => setClassSearch(e.target.value.toLowerCase())}
  />

  <div className="max-h-36 overflow-y-auto border rounded p-2">
    {availableClasses
      .filter((cls: any) => {
        const fullMatch = `${cls.class_code}${cls.commencementYear}`.toString();
        return (
          fullMatch.includes(classSearch) ||
          cls.course.toLowerCase().includes(classSearch) ||
          cls.specialization.toLowerCase().includes(classSearch)
        );
      })
      .map((cls: any) => (
        <label key={cls._id} className="flex items-center mb-1 hover:bg-gray-100 p-1 rounded">
          <input
            type="checkbox"
            className="mr-2"
            checked={selectedClassIds.includes(cls._id)}
            onChange={() => {
              setSelectedClassIds((prev) =>
                prev.includes(cls._id)
                  ? prev.filter((id) => id !== cls._id)
                  : [...prev, cls._id]
              );
            }}
          />
{cls.class_code} - {cls.commencement_year} ({cls.specialization} {cls.course})        </label>
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
        {/* <p className="text-sm text-gray-500 mt-1">
          (Admins and you are excluded)
        </p> */}

        {selectedUserIds.length > 0 && (
          <p className="text-sm text-gray-700 mt-2">
            Selected {selectedUserIds.length} participant{selectedUserIds.length > 1 ? "s" : ""}.
          </p>
        )}
      </div>

      {/* Modal Footer */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={() => setShowAddMemberModal(false)}
          className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
        <button
          onClick={handleAddMembers}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Add Members
        </button>
      </div>
    </div>
  </div>
)}
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

      <input
        type="text"
        className="w-full mb-3 p-2 border rounded"
        placeholder="Search by name or email..."
        value={participantSearch}
        onChange={(e) => setParticipantSearch(e.target.value)}
      />

      <div className="max-h-60 overflow-y-auto border rounded p-2">
        {filteredUsers.map((u) => (
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
              onChange={() => {
                setSelectedUserIds((prev) =>
                  prev.includes(u._id)
                    ? prev.filter((id) => id !== u._id)
                    : [...prev, u._id]
                );
              }}
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

{previewMedia && (
  <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100]">
    <div className="bg-white p-2 rounded-lg relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center justify-center">
      <button
        onClick={() => setPreviewMedia(null)}
        className="absolute top-3 right-3 text-white bg-black bg-opacity-50 rounded-full p-1 hover:bg-opacity-70"
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={previewMedia}
        alt="Preview"
        className="max-h-[80vh] object-contain"
      />
    </div>
  </div>
)}
{showForwardModal && selectedMedia.length > 0 && (
  <ForwardModal
    message={selectedMediaObjects[0]} // ✅ already a Message object
    currentUser={currentUser} // ✅ this was missing
    onClose={() => setShowForwardModal(false)}
    setSelectedConversation={setSelectedConversation} // ✅ if needed
  />
)}



    </>
    
  );
}
