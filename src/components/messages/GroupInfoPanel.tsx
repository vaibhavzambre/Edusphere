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
  Download,
  ChevronDown,
  Send,
  Globe,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-hot-toast";
import io from "socket.io-client";
import { useNavigate } from "react-router-dom";
import ForwardModal from "./ForwardModal"; // Adjust path if needed
import MultiDeleteModal from "./MultiDeleteModal"; // adjust path if needed

// Create a shared socket instance (ensure only one instance exists app‑wide)
const socket = io("http://localhost:5001");

interface GroupInfoPanelProps {
  conversation: Conversation;
  onClose: () => void;
  fetchConversations: () => void;
  setSelectedConversation: (c: Conversation) => void; // ✅ NEW
  // Added fetchConversations
  conversations: Conversation[]; // <<--- Make sure this is here

}

export default function GroupInfoPanel({ conversations, conversation, onClose, setSelectedConversation }: GroupInfoPanelProps) {
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
  const [linkMessages, setLinkMessages] = useState<Message[]>([]);
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
  const [selectedLinks, setSelectedLinks] = useState<string[]>([]);
  const [isLinkSelecting, setIsLinkSelecting] = useState(false);
  const [hoveringMediaId, setHoveringMediaId] = useState<string | null>(null); // Which image is hovered
  const [isMultiSelecting, setIsMultiSelecting] = useState(false); // Multi-select mode active
  const [previewMedia, setPreviewMedia] = useState<string | null>(null); // Fullscreen preview
  const [hoveringId, setHoveringId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<null | {
    url: string;
    filename: string;
    sender: string;
    date: string;
  }>(null);
  const [zoom, setZoom] = useState(1);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isFileSelecting, setIsFileSelecting] = useState(false);

  const toggleFileSelect = (id: string) => {
    const updated = selectedFiles.includes(id)
      ? selectedFiles.filter((fid) => fid !== id)
      : [...selectedFiles, id];
    setSelectedFiles(updated);
    setIsFileSelecting(updated.length > 0);
  };
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState<"full" | "simple">("simple"); // full = radio, simple = only "delete for me"

  const isBottomBarVisible =
    (activeTab === "media" && isMultiSelecting && selectedMedia.length > 0) ||
    (activeTab === "files" && isFileSelecting && selectedFiles.length > 0) ||
    (activeTab === "links" && isLinkSelecting && selectedLinks.length > 0);


  
  const handleDeleteSelected = async (scope: "me" | "everyone") => {
    const messageIds =
      activeTab === "media"
        ? selectedMedia
        : activeTab === "files"
          ? selectedFiles
          : selectedLinks;

    const messages =
      activeTab === "media"
        ? mediaMessages
        : activeTab === "files"
          ? fileMessages
          : linkMessages;

    if (messageIds.length === 0) return;

    try {
      await Promise.all(
        messageIds.map((messageId) =>
          axios.put(
            `http://localhost:5001/api/messages/delete/${messageId}`,
            { forEveryone: scope === "everyone" },
            { headers }
          )
        )
      );

      // Emit socket event to notify others (this is CRUCIAL for consistency!)
      socket.emit("deleteMessage", {
        ids: messageIds,
        forEveryone: scope === "everyone",
        userId: currentUser.id,
      });

      // UI Update: filter out deleted messages
      if (activeTab === "media") {
        setMediaMessages((prev) => prev.filter((m) => !messageIds.includes(m._id)));
        setSelectedMedia([]);
        setIsMultiSelecting(false);
      } else if (activeTab === "files") {
        setFileMessages((prev) => prev.filter((m) => !messageIds.includes(m._id)));
        setSelectedFiles([]);
        setIsFileSelecting(false);
      } else {
        setLinkMessages((prev) => prev.filter((m) => !messageIds.includes(m._id)));
        setSelectedLinks([]);
        setIsLinkSelecting(false);
      }

      toast.success("Deleted successfully.");
    } catch (err) {
      console.error("❌ Failed to delete:", err);
      toast.error("Deletion failed.");
    }
  };


  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey);
    setSelectedMedia([]);
    setSelectedFiles([]);
    setSelectedLinks([]);
    setIsMultiSelecting(false);
    setIsFileSelecting(false);
    setIsLinkSelecting(false);
  };
  useEffect(() => {
    if (showAddMemberModal) {
      // Call our new function so that it always uses updatedConversation
      fetchAvailableParticipants();
    }
  }, [showAddMemberModal, updatedConversation]);
  

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
      
      await fetchConversation();

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

        setLinkMessages(msgs.filter((msg: Message) =>
          /https?:\/\/[^\s]+/.test(msg.content)
        ));
      } catch (err) {
        console.error("Error fetching messages for media/files/links:", err);
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
// A new function to fetch available individual users for adding as members
// Add this function near your state declarations in GroupInfoPanel.tsx
const fetchAvailableParticipants = async (convData?: Conversation) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return;
    // Use the provided conversation data if available; otherwise use updatedConversation.
    const currentConv = convData || updatedConversation;
    const res = await axios.get("http://localhost:5001/api/users/all", { headers });
    // Filter out the current user and those who are already a participant in the group.
    const available = res.data.filter((user: any) => {
      return (
        user._id !== currentUser.id &&
        !currentConv.participants.some(
          (member: any) => member._id === user._id
        )
      );
    });
    setAllUsers(available);
  } catch (err) {
    console.error("Error fetching available participants:", err);
  }
};



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
      await fetchConversation();
      fetchAvailableParticipants();

      const latest = await axios.get(
        `http://localhost:5001/api/messages/conversations/${conversation._id}`,
        { headers }
      );
      setUpdatedConversation(latest.data);
      fetchAvailableParticipants(latest.data); // safe call

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

  const handleRemoveMember = async (userId: string) => {
    const confirmed = window.confirm("Are you sure you want to remove this member?");
    if (!confirmed) return;
    try {
      await axios.put(
        `http://localhost:5001/api/messages/conversations/group/${conversation._id}/remove-member`,
        { userId },
        { headers }
      );
      await fetchConversation(); // updates updatedConversation (but async)
      const latest = await axios.get(`http://localhost:5001/api/messages/conversations/${conversation._id}`, { headers });
      setUpdatedConversation(latest.data); // ensure state is updated immediately
      fetchAvailableParticipants(latest.data); // pass fresh conversation to the fetcher
      
      toast.success("Member removed");
    } catch (err) {
      console.error("Failed to remove member:", err);
      toast.error("Failed to remove member");
    }
  };
const handleMessageUser = async (userId: string, member: User) => {
  const existing = conversations.find((c) =>
    !c.isGroup &&
    c.participants.length === 2 &&
    c.participants.some((p) => (p._id || p.id)?.toString() === userId.toString())
  );

  if (existing && existing.lastMessage) {
    setSelectedConversation(existing);
    onClose();
  } else {
    // ✅ Ensure `member` is fully populated (just in case)
    let fullUser = member;
    try {
      const res = await axios.get(`http://localhost:5001/api/users/${userId}`, { headers });
      fullUser = res.data;
    } catch (err) {
      console.warn("Failed to fetch full user info for temp convo, using fallback:", err);
    }

    const tempConvo: Conversation = {
      _id: `new-${userId}`,
      id: `new-${userId}`,
      isGroup: false,
      participants: [member, currentUser], // other user goes first!
      lastMessage: null,
    };
    

    setSelectedConversation(tempConvo);
    onClose();
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

          <div className="flex flex-col h-full"> {/* Add flex container */}
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
                          onClick={async () => {
                            // Instead of directly calling the API, use our local check.
                            handleMessageUser(member._id, member);
                          }} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full text-left text-sm"
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
                {mediaMessages
                  .filter((msg) => !msg.deletedBy?.includes(currentUser.id))
                  .map((msg) => {
                    const isSelected = selectedMedia.includes(msg._id);
                    const src = `http://localhost:5001/api/attachments/${msg.file._id}`;
                    return (
                      <div
                        key={msg._id}
                        className="relative group"
                        onMouseEnter={() => setHoveringMediaId(msg._id)}
                        onMouseLeave={() => setHoveringMediaId(null)}
                      >
                        {msg.file.type.startsWith("video/") ? (
                          <video
                            src={src}
                            className="w-full h-32 object-cover rounded"
                            muted
                          />
                        ) : (
                          <img
                            src={src}
                            className="w-full h-32 object-cover rounded cursor-pointer"
                            onClick={(e) => {
                              // Don’t preview if clicking on download or checkbox
                              const target = e.target as HTMLElement;
                              if (target.closest("a") || target.closest("input[type='checkbox']")) return;

                              setImagePreview({
                                url: src,
                                filename: msg.file.name,
                                sender: msg.sender?.name || "Unknown",
                                date: msg.createdAt,
                              });
                            }}

                          />
                        )}

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black bg-opacity-10 opacity-0 group-hover:opacity-100 transition rounded" style={{ pointerEvents: 'none' }} />

                        {/* Hover actions */}
                        {(hoveringMediaId === msg._id || isMultiSelecting) && (
                          <div className="absolute top-2 right-2 z-10 flex gap-2 items-center">
                            <a
                              href={src}
                              download
                              className="bg-white rounded p-1 shadow hover:bg-gray-100 text-gray-700"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Download size={16} />
                            </a>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                const newSelected = isSelected
                                  ? selectedMedia.filter((id) => id !== msg._id)
                                  : [...selectedMedia, msg._id];
                                setSelectedMedia(newSelected);

                                setIsMultiSelecting(newSelected.length > 0); // ✅ already correct

                              }}
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
          </div>
        );

      case "files":
        return (
          <div className="relative h-full pb-16">
            <h3 className="font-semibold text-gray-800 mb-2">Files</h3>

            {fileMessages.length === 0 ? (
              <p className="text-sm text-gray-500 italic">(No files to show yet)</p>
            ) : (
              <div className="space-y-3">
                <div className="grid gap-3">
                  {fileMessages
                    .filter((msg) => !msg.deletedBy?.includes(currentUser.id))
                    .map((msg) => {
                      const selected = selectedFiles.includes(msg._id);
                      const src = `http://localhost:5001/api/attachments/${msg.file._id}`;
                      return (
                        <div
                          key={msg._id}
                          className="relative flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-indigo-50 transition group"
                          onMouseEnter={() => setHoveringMediaId(msg._id)}
                          onMouseLeave={() => setHoveringMediaId(null)}
                        >
                          <div className="flex items-center gap-3">
                            <File className="w-6 h-6 text-gray-600" />
                            <p className="text-sm text-gray-800 break-all max-w-[16rem]">
                              {msg.file.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={src}
                              download
                              className="text-indigo-600 hover:underline text-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Download
                            </a>
                            {(hoveringMediaId === msg._id || isFileSelecting) && (
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleFileSelect(msg._id);
                                }}
                                className="w-4 h-4"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        );


      case "links":
        return (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Links</h3>
            {linkMessages.length === 0 ? (
              <p className="text-sm text-gray-500 italic">(No links to show yet)</p>
            ) : (
              <div className="grid gap-3">
                {linkMessages
                  .filter((msg) => !msg.deletedBy?.includes(currentUser.id))
                  .map((msg) => {
                    const url = msg.content.match(/https?:\/\/[^\s]+/)?.[0];
                    const selected = selectedLinks.includes(msg._id);

                    return (
                      <div
                        key={msg._id}
                        className="relative p-3 bg-white border rounded-lg hover:bg-blue-50 transition group flex items-center justify-between"
                        onMouseEnter={() => setHoveringId(msg._id)}
                        onMouseLeave={() => setHoveringId(null)}
                      >
                        <div>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline break-words text-sm font-medium"
                          >
                            {url}
                          </a>
                          <p className="text-xs text-gray-500 mt-1">
                            Shared by {msg.sender?.name || "Unknown"}
                          </p>
                        </div>

                        {(hoveringId === msg._id || isLinkSelecting) && (
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) => {
                              e.stopPropagation();
                              const updated = selected
                                ? selectedLinks.filter((id) => id !== msg._id)
                                : [...selectedLinks, msg._id];
                              setSelectedLinks(updated);
                              setIsLinkSelecting(updated.length > 0);
                            }}
                            className="w-4 h-4 ml-2"
                          />
                        )}
                      </div>
                    );
                  })}

              </div>
            )}
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

          {isBottomBarVisible && (
            <div className="absolute bottom-0 right-0 w-[28rem] bg-white border-t border-gray-200 px-4 py-3 z-50 flex justify-between items-center shadow-lg rounded-t-xl">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-700">
                  {activeTab === "media" && selectedMedia.length > 0 && `${selectedMedia.length} selected`}
                  {activeTab === "files" && selectedFiles.length > 0 && `${selectedFiles.length} selected`}
                  {activeTab === "links" && selectedLinks.length > 0 && `${selectedLinks.length} selected`}
                </span>
                <div className="h-4 w-px bg-gray-200"></div>
                <button
                  onClick={() => {
                    setSelectedMedia([]);
                    setSelectedFiles([]);
                    setSelectedLinks([]);
                    setIsMultiSelecting(false);
                    setIsFileSelecting(false);
                    setIsLinkSelecting(false);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-sm font-medium hover:bg-gray-100 px-2 py-1 rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowForwardModal(true)}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1"
                >
                  <Send size={16} className="rotate-180" />
                  Forward
                </button>

                <div className="relative group">
                  <button
                    onClick={() => {
                      const selected =
                        activeTab === "media" ? selectedMedia :
                          activeTab === "files" ? selectedFiles :
                            selectedLinks;

                      const messages =
                        activeTab === "media" ? mediaMessages :
                          activeTab === "files" ? fileMessages :
                            linkMessages;

                      const allSentByUser = selected.every((id) => {
                        const msg = messages.find((m) => m._id === id);
                        return msg?.sender?._id === currentUser.id;
                      });

                      setDeleteMode(allSentByUser ? "full" : "simple");
                      setShowDeleteModal(true);
                    }}
                    className="bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={16} className="text-gray-600" />
                    Delete
                  </button>

                </div>
              </div>
            </div>
          )}


        </div>
        {/* Tabs */}
        <div className="w-20 border-l flex flex-col items-center py-4 space-y-4">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
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
      {imagePreview && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4">
          <div className="relative max-w-5xl w-full max-h-full flex flex-col items-center">

            {/* Top Controls Row (Zoom + Sender Info) */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-6 z-50 bg-white bg-opacity-80 rounded-full px-4 py-2 shadow-lg">
              <div className="text-sm text-gray-800">
                <div>{imagePreview.sender}</div>
                <div className="text-xs text-gray-600">
                  {new Date(imagePreview.date).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setZoom((prev) => Math.max(prev - 0.2, 0.2))}>🔍➖</button>
                <button
                  onClick={() => setZoom(1)}
                  className="px-2 py-1 border border-gray-400 rounded"
                >
                  🔁1:1
                </button>
                <button onClick={() => setZoom((prev) => Math.min(prev + 0.2, 5))}>🔍➕</button>
              </div>
            </div>

            {/* Top right download and close */}
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

            {/* Image Viewer */}
            <div className="overflow-auto max-h-[80vh] border border-white rounded p-2 mt-16">
              <img
                src={imagePreview.url}
                alt="Preview"
                className="max-h-[80vh] max-w-full object-contain transition-transform"
                style={{ transform: `scale(${zoom})` }}
              />
            </div>

            {/* Filename below image */}
            <p className="text-white text-sm mt-4 truncate max-w-[80vw] text-center">
              {imagePreview.filename}
            </p>
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
      {showForwardModal && (
        <ForwardModal
          messages={
            activeTab === "media"
              ? mediaMessages.filter((m) => selectedMedia.includes(m._id))
              : activeTab === "files"
                ? fileMessages.filter((m) => selectedFiles.includes(m._id))
                : linkMessages.filter((m) => selectedLinks.includes(m._id))
          } currentUser={currentUser} // ✅ this was missing
          onClose={() => setShowForwardModal(false)}
          setSelectedConversation={setSelectedConversation} // ✅ if needed
        />
      )}
      {showDeleteModal && (
        <MultiDeleteModal
          isMixed={deleteMode === "simple"}
          count={
            activeTab === "media"
              ? selectedMedia.length
              : activeTab === "files"
                ? selectedFiles.length
                : selectedLinks.length
          }
          onClose={() => setShowDeleteModal(false)}
          onDelete={(forEveryone) => {
            // Always use updated method with correct socket
            handleDeleteSelected(
              deleteMode === "full" && forEveryone ? "everyone" : "me"
            );
            setShowDeleteModal(false);
          }}
        />
      )}
    </>
  );
}
