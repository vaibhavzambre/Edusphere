import React, { useState } from "react";
import type { Conversation, User } from "../../types";

// You can replace these placeholders with real icons or components
import { Users, Image as ImageIcon, File, Link, Calendar, Lock } from "lucide-react";

interface GroupInfoPanelProps {
  conversation: Conversation;    // The group conversation object
  onClose: () => void;          // Handler to close the entire panel
}

export default function GroupInfoPanel({
  conversation,
  onClose
}: GroupInfoPanelProps) {
  // Example "tabs" for the vertical menu
  const TABS = [
    { key: "overview", label: "Overview", icon: null },   // Or use a real icon
    { key: "members", label: "Members", icon: <Users size={18} /> },
    { key: "media", label: "Media", icon: <ImageIcon size={18} /> },
    { key: "files", label: "Files", icon: <File size={18} /> },
    { key: "links", label: "Links", icon: <Link size={18} /> },
    { key: "events", label: "Events", icon: <Calendar size={18} /> },
    { key: "encryption", label: "Encryption", icon: <Lock size={18} /> },
  ];

  // Active tab state
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Cast conversation.participants => array of Users
  const groupMembers = (conversation.participants || []) as User[];

  // Demo: Hard-coded or from conversation object
  const createdDate = "12-03-2025 12:07 AM";
  const description = ""; // or conversation.description
  const isDisappearing = false;
  const isMuted = false;

  // Conditionals for main content
  const renderMainContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-3">
            <div className="flex space-x-3">
              {/* Example: “Video” and “Voice” buttons */}
              <button className="flex-1 py-2 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200">
                Video
              </button>
              <button className="flex-1 py-2 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200">
                Voice
              </button>
            </div>

            <div>
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Created: </span> {createdDate}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Description: </span>
                {description ? description : "(No description)"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Disappearing messages: </span>
                {isDisappearing ? "On" : "Off"}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Mute notifications: </span>
                {isMuted ? "On" : "Off"}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Notification tone: </span>
                Default
              </p>
            </div>
          </div>
        );
      case "members":
        return (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Members</h3>
            <div className="space-y-2">
              {groupMembers.map((m) => (
                <div key={m._id} className="flex items-center space-x-2">
                  <img
                    src={
                      m.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        m.name || "User"
                      )}`
                    }
                    alt={m.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <p className="text-sm text-gray-800">{m.name}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case "media":
        return (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Media</h3>
            <p className="text-sm text-gray-500 italic">
              (No media to show yet)
            </p>
          </div>
        );
      case "files":
        return (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Files</h3>
            <p className="text-sm text-gray-500 italic">
              (No files to show yet)
            </p>
          </div>
        );
      case "links":
        return (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Links</h3>
            <p className="text-sm text-gray-500 italic">
              (No links to show yet)
            </p>
          </div>
        );
      case "events":
        return (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Events</h3>
            <p className="text-sm text-gray-500 italic">
              (No events to show yet)
            </p>
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
        return null;
    }
  };

  return (
    <>
      {/* Fullscreen overlay: click to close */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={onClose}
      />

      {/* Outer container: pinned to the right side */}
      <div
        className="
          fixed top-0 right-0 h-full w-[28rem] bg-white shadow-lg z-50
          flex
        "
      >
        {/* MAIN CONTENT (Left side) */}
        <div className="flex-1 flex flex-col">
          {/* Header row */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-indigo-200 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                {conversation.groupName?.charAt(0).toUpperCase() || "G"}
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">
                  {conversation.groupName || "IP RESEARCH PAPER"}
                </h2>
                <p className="text-xs text-gray-500">Group Info</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded hover:bg-gray-100"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Scrollable container for tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {renderMainContent()}
          </div>
        </div>

        {/* RIGHT-SIDE TABS */}
        <div className="w-20 border-l flex flex-col items-center py-4 space-y-4">
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  flex flex-col items-center w-full py-2
                  ${active ? "bg-indigo-50 text-indigo-600 font-semibold" : "text-gray-600 hover:bg-gray-50"}
                `}
              >
                {tab.icon ? <div>{tab.icon}</div> : null}
                <span className="text-xs mt-1">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
