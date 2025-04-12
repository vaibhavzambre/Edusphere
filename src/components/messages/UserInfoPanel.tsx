// ... top imports ...
import React, { useEffect, useState } from "react";
import {
  Image as ImageIcon,
  File,
  Link,
  User,
  X,
  Download,
  Trash2,
  ChevronDown,
  Send,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-hot-toast";
import ForwardModal from "./ForwardModal";
import io from "socket.io-client";
import MultiDeleteModal from "./MultiDeleteModal";

const socket = io("http://localhost:5001");

export default function UserInfoPanel({ conversation, onClose, setSelectedConversation }) {
  const { user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState("overview");
  const [mediaMessages, setMediaMessages] = useState([]);
  const [fileMessages, setFileMessages] = useState([]);
  const [linkMessages, setLinkMessages] = useState([]);
  const [hoveringId, setHoveringId] = useState(null);

  const [selectedIds, setSelectedIds] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [showDeleteDropdown, setShowDeleteDropdown] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState<"full" | "simple">("simple");
  
  const fetchMessages = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5001/api/messages/conversation/${conversation._id}`,
        { headers }
      );
      const msgs = res.data.filter(m => !m.deletedBy?.includes(currentUser.id));
      setMediaMessages(msgs.filter(m => m.file?.type?.startsWith("image/") || m.file?.type?.startsWith("video/")));
      setFileMessages(msgs.filter(m => m.file?.type && !m.file.type.startsWith("image/") && !m.file.type.startsWith("video/")));
      setLinkMessages(msgs.filter(m => /https?:\/\/[^\s]+/.test(m.content)));
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [conversation._id]);

  useEffect(() => {
    socket.on("messageDeleted", ({ id }) => {
      setMediaMessages(prev => prev.filter(m => m._id !== id));
      setFileMessages(prev => prev.filter(m => m._id !== id));
      setLinkMessages(prev => prev.filter(m => m._id !== id));
    });
    return () => socket.off("messageDeleted");
  }, []);

  const handleDeleteSelected = async (scope: "me" | "everyone") => {
    const messageIds =
      activeTab === "media"
        ? mediaMessages.filter(m => selectedIds.includes(m._id)).map(m => m._id)
        : activeTab === "files"
        ? fileMessages.filter(m => selectedIds.includes(m._id)).map(m => m._id)
        : linkMessages.filter(m => selectedIds.includes(m._id)).map(m => m._id);
  
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
  
      socket.emit("deleteMessage", {
        ids: messageIds,
        forEveryone: scope === "everyone",
        userId: currentUser.id,
      });
  
      // Update local UI based on tab
      if (activeTab === "media") {
        setMediaMessages(prev => prev.filter(m => !messageIds.includes(m._id)));
      } else if (activeTab === "files") {
        setFileMessages(prev => prev.filter(m => !messageIds.includes(m._id)));
      } else {
        setLinkMessages(prev => prev.filter(m => !messageIds.includes(m._id)));
      }
  
      // Clear selection
      setSelectedIds([]);
      setIsSelecting(false);
      setShowDeleteDropdown(false);
      toast.success("Deleted successfully.");
    } catch (err) {
      console.error("❌ Failed to delete:", err);
      toast.error("Deletion failed.");
    }
  };
  
  const selectedObjects = [...mediaMessages, ...fileMessages, ...linkMessages].filter(m =>
    selectedIds.includes(m._id)
  );

  const handleSelect = (id) => {
    const updated = selectedIds.includes(id)
      ? selectedIds.filter(i => i !== id)
      : [...selectedIds, id];
    setSelectedIds(updated);
    setIsSelecting(updated.length > 0);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedIds([]);
    setIsSelecting(false);
    setShowDeleteDropdown(false);
  };

  const renderPreviewModal = () => (
    imagePreview && (
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
    )
  );

  const renderBottomBar = () => {
    if (!isSelecting || selectedIds.length === 0) return null;

    return (
      <div className="fixed bottom-0 right-0 w-[28rem] bg-white border-t px-4 py-3 z-50 flex justify-between items-center shadow">
        <span>{selectedIds.length} selected</span>
        <div className="flex gap-2">
          <button
            className="bg-blue-600 text-white px-3 py-1.5 rounded"
            onClick={() => setShowForwardModal(true)}
          >
            <Send size={16} className="rotate-180 inline" /> Forward
          </button>
          <div className="relative">
            
          <button
  onClick={() => {
    const allSentByUser = selectedObjects.every((msg) => msg.sender?._id === currentUser.id);
    setDeleteMode(allSentByUser ? "full" : "simple");
    setShowDeleteModal(true);
  }}
  className="bg-gray-100 px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 transition-colors flex items-center gap-1"
>
  <Trash2 size={16} className="text-gray-600" />
  Delete
</button>

            

          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        const other = conversation.participants.find(p => p._id !== currentUser.id);
        return (
          <div className="text-center space-y-3">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(other?.name || "User")}`}
              className="w-20 h-20 rounded-full mx-auto"
              alt="avatar"
            />
            <h2 className="text-lg font-bold">{other?.name}</h2>
            <p className="text-sm text-gray-500">{other?.email}</p>
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
                    const src = `http://localhost:5001/api/attachments/${msg.file._id}`;
                    const selected = selectedIds.includes(msg._id);
                    return (
                      <div
                        key={msg._id}
                        className="relative group"
                        onMouseEnter={() => setHoveringId(msg._id)}
                        onMouseLeave={() => setHoveringId(null)}
                      >
                        <img
                          src={src}
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest("a") || (e.target as HTMLElement).closest("input[type='checkbox']")) return;
                            setImagePreview({
                              url: src,
                              filename: msg.file.name,
                              sender: msg.sender?.name,
                              date: msg.createdAt,
                            });
                          }}
                          className="w-full h-32 object-cover rounded cursor-pointer"
                          alt="Media"
                        />
                        {(hoveringId === msg._id || isSelecting) && (
                          <div className="absolute top-2 right-2 flex gap-2 z-10">
                            <a
                              href={src}
                              download
                              className="bg-white p-1 rounded shadow text-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                            <Download size={16} />
                            </a>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleSelect(msg._id);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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
                        const src = `http://localhost:5001/api/attachments/${msg.file._id}`;
                        const selected = selectedIds.includes(msg._id);
                        return (
                          <div
                            key={msg._id}
                            className="relative flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-indigo-50 transition group"
                            onMouseEnter={() => setHoveringId(msg._id)}
                            onMouseLeave={() => setHoveringId(null)}
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
                              {(hoveringId === msg._id || isSelecting) && (
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleSelect(msg._id);
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
              <div className="relative h-full pb-16">
                <h3 className="font-semibold text-gray-800 mb-2">Links</h3>
                {linkMessages.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">(No links to show yet)</p>
                ) : (
                  <div className="grid gap-3">
                    {linkMessages
                      .filter((msg) => !msg.deletedBy?.includes(currentUser.id))
                      .map((msg) => {
                        const url = msg.content.match(/https?:\/\/[^\s]+/)?.[0];
                        const selected = selectedIds.includes(msg._id);
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
                            {(hoveringId === msg._id || isSelecting) && (
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  const updated = selectedIds.includes(msg._id)
                                    ? selectedIds.filter((id) => id !== msg._id)
                                    : [...selectedIds, msg._id];
                                  setSelectedIds(updated);
                                  setIsSelecting(updated.length > 0);
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
          
      default:
        return null;
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-30 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-[28rem] bg-white shadow-lg z-50 flex">
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div>
              <h2 className="font-semibold text-gray-800">Chat Info</h2>
              <p className="text-xs text-gray-500">1-on-1</p>
            </div>
            <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{renderTabContent()}</div>
        </div>

        {/* Tabs */}
        <div className="w-20 border-l flex flex-col items-center py-4 space-y-4">
          {["overview", "media", "files", "links"].map(tab => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`flex flex-col items-center py-2 w-full ${
                activeTab === tab ? "bg-indigo-50 text-indigo-600 font-semibold" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {{
                overview: <User size={18} />,
                media: <ImageIcon size={18} />,
                files: <File size={18} />,
                links: <Link size={18} />,
              }[tab]}
              <span className="text-xs mt-1 capitalize">{tab}</span>
            </button>
          ))}
        </div>
      </div>

      {renderPreviewModal()}
      {renderBottomBar()}
      {showForwardModal && selectedObjects.length > 0 && (
        <ForwardModal
          messages={selectedObjects}
          currentUser={currentUser}
          onClose={() => setShowForwardModal(false)}
          setSelectedConversation={setSelectedConversation}
        />
      )}

{showDeleteModal && (
  <MultiDeleteModal
  isMixed={deleteMode === "simple"}
  count={selectedIds.length}
  onClose={() => setShowDeleteModal(false)}
  onDelete={(forEveryone) => {
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
