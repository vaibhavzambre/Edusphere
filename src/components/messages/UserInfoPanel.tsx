// src/components/messages/UserInfoPanel.tsx

import React, { useEffect, useState, useRef } from "react";
import {
  Image as ImageIcon,
  File,
  Link,
  User,
  X,
  Download,
  Trash2,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-hot-toast";
import ForwardModal from "./ForwardModal";
import io from "socket.io-client";

const socket = io("http://localhost:5001");

export default function UserInfoPanel({ conversation, onClose, setSelectedConversation }) {
  const { user: currentUser } = useAuth();

  const TABS = [
    { key: "overview", label: "Overview", icon: <User size={18} /> },
    { key: "media", label: "Media", icon: <ImageIcon size={18} /> },
    { key: "files", label: "Files", icon: <File size={18} /> },
    { key: "links", label: "Links", icon: <Link size={18} /> },
  ];

  const [activeTab, setActiveTab] = useState("overview");
  const [mediaMessages, setMediaMessages] = useState([]);
  const [fileMessages, setFileMessages] = useState([]);
  const [linkMessages, setLinkMessages] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [hoveringId, setHoveringId] = useState(null);

  // Global selection state (cleared on tab change)
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);

  // Delete dropdown state
  const [showDeleteDropdown, setShowDeleteDropdown] = useState(false);

  // Forward modal state remains as before
  const [showForwardModal, setShowForwardModal] = useState(false);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  // Fetch messages and sort them into tabs
  const fetchMessages = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5001/api/messages/conversation/${conversation._id}`,
        { headers }
      );
      const msgs = res.data;
      setMediaMessages(
        msgs.filter((m) => m.file?.type?.startsWith("image/") || m.file?.type?.startsWith("video/"))
      );
      setFileMessages(
        msgs.filter((m) => m.file?.type && !m.file.type.startsWith("image/") && !m.file.type.startsWith("video/"))
      );
      setLinkMessages(
        msgs.filter((m) => /https?:\/\/[^\s]+/.test(m.content))
      );
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [conversation._id]);

  useEffect(() => {
    socket.on("messageDeleted", ({ id }) => {
      setMediaMessages((prev) => prev.filter((msg) => msg._id !== id));
      setFileMessages((prev) => prev.filter((msg) => msg._id !== id));
      setLinkMessages((prev) => prev.filter((msg) => msg._id !== id));
    });
    return () => socket.off("messageDeleted");
  }, []);

  // Delete function remains the same
  const handleDelete = async (forEveryone = false) => {
    try {
      await axios.put(
        "http://localhost:5001/api/messages/delete-multiple",
        { messageIds: selectedIds, forEveryone },
        { headers }
      );
      toast.success("Deleted successfully");
      fetchMessages();
      setSelectedIds([]);
      setIsSelecting(false);
      setShowDeleteDropdown(false);
    } catch (err) {
      console.error("Delete error", err);
      toast.error("Failed to delete");
    }
  };

  // Toggle selection for an item
  const handleSelect = (id) => {
    let updated = selectedIds.includes(id)
      ? selectedIds.filter((i) => i !== id)
      : [...selectedIds, id];
    setSelectedIds(updated);
    setIsSelecting(updated.length > 0);
  };

  // Handle "Select All" for a given list; show only if at least one item is selected.
  const handleSelectAll = (list) => {
    const allIds = list.map((m) => m._id);
    const isAllSelected = allIds.every((id) => selectedIds.includes(id));
    setSelectedIds(isAllSelected ? [] : allIds);
    setIsSelecting(!isAllSelected && allIds.length > 0);
  };

  // Combine selected objects from all tabs (since selection state is global per active tab)
  const selectedObjects = [...mediaMessages, ...fileMessages, ...linkMessages].filter((msg) =>
    selectedIds.includes(msg._id)
  );

  // Reset selection when switching tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedIds([]);
    setIsSelecting(false);
    setShowDeleteDropdown(false);
  };

  // Render Preview Modal (ChatWindow style) with zoom, download, sender info, date/time.
  const renderPreviewModal = () =>
    imagePreview && (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4">
        <div className="relative max-w-5xl w-full max-h-full flex flex-col items-center">
          {/* Top right buttons */}
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
          <div className="absolute top-4 left-4 z-50 flex items-center space-x-3 bg-white bg-opacity-80 rounded-full px-4 py-1 shadow-lg">
            <button onClick={() => setZoom((prev) => Math.max(prev - 0.2, 0.2))}>
              🔍➖
            </button>
            <button
              onClick={() => setZoom(1)}
              className="px-2 py-1 border border-gray-400 rounded"
            >
              🔁1:1
            </button>
            <button onClick={() => setZoom((prev) => Math.min(prev + 0.2, 5))}>
              🔍➕
            </button>
          </div>

          {/* Sender Info */}
          <div className="absolute top-4 left-4 mt-12 z-50 bg-black bg-opacity-50 text-white text-sm px-3 py-1 rounded">
            {imagePreview.sender} <br />
            {new Date(imagePreview.date).toLocaleString()}
          </div>

          {/* Image Container */}
          <div className="overflow-auto max-h-[80vh] border border-white rounded p-2">
            <img
              src={imagePreview.url}
              alt="Preview"
              className="max-h-[80vh] max-w-full object-contain transition-transform"
              style={{ transform: `scale(${zoom})` }}
            />
          </div>

          {/* Filename */}
          <p className="text-white text-sm mt-4 truncate max-w-[80vw] text-center">
            {imagePreview.filename}
          </p>
        </div>
      </div>
    );

  // Render Grid for Media and Files (for files, layout is different)
  const renderGrid = (items, isMedia = false) => (
    <>
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm text-gray-500">{items.length} item(s)</p>
        {/* Show "Select All" only if at least one item is selected */}
        {selectedIds.length > 0 && (
          <label className="text-sm text-indigo-600 cursor-pointer">
            <input
              type="checkbox"
              checked={items.every((i) => selectedIds.includes(i._id))}
              onChange={() => handleSelectAll(items)}
              className="mr-1"
            />
            Select All
          </label>
        )}
      </div>
      <div className={isMedia ? "grid grid-cols-3 gap-2" : "space-y-3"}>
        {items.map((msg) => {
          const selected = selectedIds.includes(msg._id);
          const src = `http://localhost:5001/api/attachments/${msg.file._id}`;
          if (isMedia) {
            return (
              <div
                key={msg._id}
                className="relative group cursor-pointer"
                onMouseEnter={() => setHoveringId(msg._id)}
                onMouseLeave={() => setHoveringId(null)}
                onClick={() =>
                  !isSelecting &&
                  setImagePreview({
                    url: src,
                    filename: msg.file.name,
                    sender: msg.sender?.name || msg.sender?.email,
                    date: msg.createdAt,
                  })
                }
              >
                {msg.file.type.startsWith("video/") ? (
                  <video src={src} className="w-full h-32 object-cover rounded" muted />
                ) : (
                  <img src={src} className="w-full h-32 object-cover rounded" />
                )}
                <div className="absolute inset-0 bg-black bg-opacity-10 opacity-0 group-hover:opacity-100 transition rounded" />
                {(hoveringId === msg._id || isSelecting) && (
                  <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
                    <a
                      href={src}
                      download
                      className="bg-white rounded p-1 shadow hover:bg-gray-100 text-gray-700 mr-1"
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
                      className="w-4 h-4"
                    />
                  </div>
                )}
              </div>
            );
          } else {
            // For Files layout (card style)
            return (
              <div
                key={msg._id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:bg-indigo-50 transition relative"
                onMouseEnter={() => setHoveringId(msg._id)}
                onMouseLeave={() => setHoveringId(null)}
              >
                <div className="flex items-center gap-3">
                  <File className="w-5 h-5 text-gray-600 flex-shrink-0" />
                  <p className="text-sm text-gray-800 break-all max-w-[16rem]">
                    {msg.file.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={src}
                    download
                    onClick={(e) => e.stopPropagation()}
                    className="text-indigo-600 hover:underline text-sm"
                  >
                    Download
                  </a>
                  {(hoveringId === msg._id || isSelecting) && (
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => handleSelect(msg._id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4"
                    />
                  )}
                </div>
              </div>
            );
          }
        })}
      </div>
    </>
  );

  // Render Links with similar logic as files
  const renderLinks = () => (
    <>
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm text-gray-500">{linkMessages.length} link(s)</p>
        {selectedIds.length > 0 && (
          <label className="text-sm text-indigo-600 cursor-pointer">
            <input
              type="checkbox"
              checked={linkMessages.every((i) => selectedIds.includes(i._id))}
              onChange={() => handleSelectAll(linkMessages)}
              className="mr-1"
            />
            Select All
          </label>
        )}
      </div>
      <div className="grid gap-3">
        {linkMessages.map((msg) => {
          const url = msg.content.match(/https?:\/\/[^\s]+/)?.[0];
          const selected = selectedIds.includes(msg._id);
          return (
            <div
              key={msg._id}
              className="relative group p-3 bg-white border rounded-lg hover:bg-blue-50 transition"
              onMouseEnter={() => setHoveringId(msg._id)}
              onMouseLeave={() => setHoveringId(null)}
            >
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 font-medium text-sm break-words"
              >
                {url}
              </a>
              <p className="text-xs text-gray-500 mt-1">
                Shared by {msg.sender?.name || "Unknown"}
              </p>
              {(hoveringId === msg._id || isSelecting) && (
                <div className="absolute top-2 right-2 z-10">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => handleSelect(msg._id)}
                    className="w-4 h-4"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );

  // Render main content based on active tab
  const renderMainContent = () => {
    switch (activeTab) {
      case "overview": {
        const other = conversation.participants.find((p) => {
          const pid = (p as any)._id || (p as any).id;
          const currId = currentUser._id || currentUser.id;
          return pid !== currId;
        });
        
        return (
          <div className="text-center space-y-3">
            <img
              src={
                other.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  other.name || "User"
                )}`
              }
              className="w-20 h-20 rounded-full mx-auto"
              alt="avatar"
            />
            <h2 className="text-lg font-bold text-gray-800">{other.name}</h2>
            <p className="text-sm text-gray-500">{other.email}</p>
            <p className="text-sm text-gray-400 capitalize">{other.role}</p>
          </div>
        );
      }
      case "media":
        return mediaMessages.length
          ? renderGrid(mediaMessages, true)
          : <p className="text-sm italic text-gray-500">No media</p>;
      case "files":
        return fileMessages.length
          ? renderGrid(fileMessages, false)
          : <p className="text-sm italic text-gray-500">No files</p>;
      case "links":
        return linkMessages.length
          ? renderLinks()
          : <p className="text-sm italic text-gray-500">No links</p>;
      default:
        return null;
    }
  };

  // Bottom action bar with upward-opening delete dropdown
  const renderBottomBar = () => {
    if (!isSelecting || selectedIds.length === 0) return null;
    return (
      <div className="fixed bottom-0 right-0 w-[28rem] bg-white border-t px-4 py-3 z-50 flex justify-between items-center">
        <span className="text-sm text-gray-600">{selectedIds.length} selected</span>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowForwardModal(true)}
            className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700"
          >
            ↪ Forward
          </button>
          {/* Delete dropdown */}
          <div className="relative inline-block">
            <button
              onClick={() => setShowDeleteDropdown((prev) => !prev)}
              className="bg-gray-300 px-4 py-1.5 rounded text-sm flex items-center gap-1"
            >
              <Trash2 size={16} /> Delete ⌄
            </button>
            {showDeleteDropdown && (
              <div className="absolute bottom-full mb-1 right-0 bg-white border rounded shadow-md w-48 z-10">
                <button
                  onClick={() => {
                    setShowDeleteDropdown(false);
                    handleDelete(false);
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                >
                  Delete for Me
                </button>
                {selectedObjects.every((m) => m.sender?._id === currentUser.id) && (
                  <button
                    onClick={() => {
                      setShowDeleteDropdown(false);
                      handleDelete(true);
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-600"
                  >
                    Delete for Everyone
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setSelectedIds([]);
              setIsSelecting(false);
              setShowDeleteDropdown(false);
            }}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            ✕ Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-30 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-[28rem] bg-white shadow-lg z-50 flex">
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div>
              <h2 className="font-semibold text-gray-800">Chat Info</h2>
              <p className="text-xs text-gray-500">1-on-1 Info</p>
            </div>
            <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{renderMainContent()}</div>
        </div>
        <div className="w-20 border-l flex flex-col items-center py-4 space-y-4">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex flex-col items-center w-full py-2 ${
                activeTab === tab.key
                  ? "bg-indigo-50 text-indigo-600 font-semibold"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.icon}
              <span className="text-xs mt-1">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {renderPreviewModal()}

      {renderBottomBar()}

      {showForwardModal && selectedObjects.length > 0 && (
        <ForwardModal
          message={selectedObjects[0]}
          currentUser={currentUser}
          onClose={() => setShowForwardModal(false)}
          setSelectedConversation={setSelectedConversation}
        />
      )}
    </>
  );
}
