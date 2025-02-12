// src/pages/AnnouncementsPage.tsx
import React, { useState, useEffect } from "react";

// Type definitions for attachments and users.
interface Attachment {
  filePath: string;
  filename: string;
  contentType: string;
}

interface User {
  name: string;
}

// The Announcement interface as stored in your DB.
interface Announcement {
  _id: string;
  title: string;
  content: string;
  type: "global" | "role" | "class" | "individual";
  roles?: string[];
  class?: string;
  class_code?: number;
  commencement_year?: number;
  classTarget?: string[];
  targetUsers?: User[];
  publishDate: string;
  expiryDate?: string;
  attachments?: Attachment[];
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

// A separate interface for the form data (used for both add and update).
interface AnnouncementFormData {
  title: string;
  content: string;
  type: "global" | "role" | "class";
  roles: string[];
  classId?: string;
  classTarget?: string[];
  publishDate: string;
  expiryDate?: string;
  attachments?: File[]; // Files selected in the form.
}

const AnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  // If editingAnnouncement is non-null, then we are in update mode.
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  // The form state for both creating and updating.
  const [announcementFormData, setAnnouncementFormData] = useState<AnnouncementFormData>({
    title: "",
    content: "",
    type: "global",
    roles: ["teacher", "student"],
    publishDate: "",
    expiryDate: "",
    attachments: [],
  });

  // Fetch announcements on mount.
  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/announcements/", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch announcements");
      const data = await response.json();
      setAnnouncements(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      setLoading(false);
    }
  };

  // Delete handler remains the same.
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    try {
      const response = await fetch(`http://localhost:5001/api/announcements/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete announcement");
      // Remove deleted announcement from state.
      setAnnouncements((prev) => prev.filter((a) => a._id !== id));
    } catch (error) {
      console.error("Error deleting announcement:", error);
    }
  };

  // When clicking Update, pre-fill the form with the announcement's data.
  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    // For datetime-local inputs, slice the ISO string to "YYYY-MM-DDTHH:MM".
    setAnnouncementFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type as "global" | "role" | "class",
      roles: announcement.roles || [],
      classId: announcement.class,
      classTarget: announcement.classTarget || [],
      publishDate: announcement.publishDate.slice(0, 16),
      expiryDate: announcement.expiryDate ? announcement.expiryDate.slice(0, 16) : "",
      attachments: [], // Attachments are not pre-loaded.
    });
    setShowForm(true);
  };

  // Handle form submission for both add and update.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let uploadedFiles: { filePath: string; filename: string; contentType: string }[] = [];
      if (announcementFormData.attachments && announcementFormData.attachments.length > 0) {
        const token = localStorage.getItem("token");
        for (const file of announcementFormData.attachments) {
          const formData = new FormData();
          formData.append("file", file);
          const uploadResponse = await fetch("http://localhost:5001/api/attachments/upload", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });
          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error("File upload failed: " + errorText);
          }
          const fileData = await uploadResponse.json();
          uploadedFiles.push({
            filePath: fileData.filePath,
            filename: fileData.filename,
            contentType: fileData.contentType,
          });
        }
      }

      // Prepare the payload.
      const payload = {
        ...announcementFormData,
        publishDate: new Date(announcementFormData.publishDate).toISOString(),
        expiryDate: announcementFormData.expiryDate
          ? new Date(announcementFormData.expiryDate).toISOString()
          : null,
        attachments: uploadedFiles,
      };

      if (editingAnnouncement) {
        // UPDATE: Call PUT endpoint.
        const response = await fetch(`http://localhost:5001/api/announcements/${editingAnnouncement._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error("Failed to update announcement: " + errorText);
        }
        const updatedAnnouncement = await response.json();
        // Update the announcement in state.
        setAnnouncements((prev) =>
          prev.map((a) => (a._id === updatedAnnouncement._id ? updatedAnnouncement : a))
        );
        setSuccessMessage("Announcement updated successfully!");
      } else {
        // CREATE: Call POST endpoint.
        const response = await fetch("http://localhost:5001/api/announcements", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error("Failed to create announcement: " + errorText);
        }
        const newAnnouncement = await response.json();
        setAnnouncements((prev) => [newAnnouncement, ...prev]);
        setSuccessMessage("Announcement created successfully!");
      }

      // Clear the form and close the modal.
      setAnnouncementFormData({
        title: "",
        content: "",
        type: "global",
        roles: ["teacher", "student"],
        publishDate: "",
        expiryDate: "",
        attachments: [],
      });
      setEditingAnnouncement(null);
      setShowForm(false);
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  // Handle file selection.
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setAnnouncementFormData({ ...announcementFormData, attachments: files });
    }
  };

  return (
    <div className="p-5">
      {successMessage && (
        <div
          className="mb-4 p-4 bg-green-200 text-green-800 rounded flex justify-between items-center"
          role="alert"
        >
          <span>{successMessage}</span>
          <button
            className="ml-4 text-green-800 font-bold"
            onClick={() => setSuccessMessage("")}
          >
            &times;
          </button>
        </div>
      )}
      <h1 className="text-2xl font-bold mb-4">Announcements</h1>
      <button
        onClick={() => {
          setShowForm(true);
          setEditingAnnouncement(null); // Ensure we're in add mode.
        }}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        + Add Announcement
      </button>

      {/* Announcements List */}
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-3">Latest Announcements</h2>
        {loading ? (
          <p>Loading announcements...</p>
        ) : announcements.length === 0 ? (
          <p>No announcements available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {announcements.map((announcement) => (
              <div
                key={announcement._id}
                className="bg-white shadow-md p-4 rounded-lg"
              >
                <h3 className="text-lg font-semibold">{announcement.title}</h3>
                <p className="mb-2">{announcement.content}</p>
                <div className="text-sm text-gray-700 mb-1">
                  <strong>Type:</strong> {announcement.type}
                </div>
                {announcement.roles && announcement.roles.length > 0 && (
                  <div className="text-sm text-gray-700 mb-1">
                    <strong>Roles:</strong> {announcement.roles.join(", ")}
                  </div>
                )}
                {announcement.class && (
                  <div className="text-sm text-gray-700 mb-1">
                    <strong>Class ID:</strong> {announcement.class}
                  </div>
                )}
                {announcement.class_code !== undefined && (
                  <div className="text-sm text-gray-700 mb-1">
                    <strong>Class Code:</strong> {announcement.class_code}
                  </div>
                )}
                {announcement.commencement_year !== undefined && (
                  <div className="text-sm text-gray-700 mb-1">
                    <strong>Commencement Year:</strong> {announcement.commencement_year}
                  </div>
                )}
                {announcement.classTarget && announcement.classTarget.length > 0 && (
                  <div className="text-sm text-gray-700 mb-1">
                    <strong>Class Target:</strong> {announcement.classTarget.join(", ")}
                  </div>
                )}
                {announcement.targetUsers && announcement.targetUsers.length > 0 && (
                  <div className="text-sm text-gray-700 mb-1">
                    <strong>Target Users:</strong>{" "}
                    {announcement.targetUsers.map((user, idx) => (
                      <span key={idx}>
                        {user.name}
                        {idx < announcement.targetUsers!.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>
                )}
                <div className="text-sm text-gray-600 mb-1">
                  <strong>Publish Date:</strong>{" "}
                  {new Date(announcement.publishDate).toLocaleString()}
                </div>
                {announcement.expiryDate && (
                  <div className="text-sm text-gray-600 mb-1">
                    <strong>Expiry Date:</strong>{" "}
                    {new Date(announcement.expiryDate).toLocaleString()}
                  </div>
                )}
                <div className="text-sm text-gray-600 mb-1">
                  <strong>Created By:</strong>{" "}
                  {announcement.createdBy?.name || "Admin"}
                </div>
                <div className="text-sm text-gray-600 mb-1">
                  <strong>Created At:</strong>{" "}
                  {new Date(announcement.createdAt).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 mb-1">
                  <strong>Updated At:</strong>{" "}
                  {new Date(announcement.updatedAt).toLocaleString()}
                </div>
                {announcement.attachments && announcement.attachments.length > 0 && (
                  <div className="mt-2">
                    <p className="font-semibold text-sm">Attachments:</p>
                    <ul className="list-disc list-inside">
                      {announcement.attachments.map((file, index) => (
                        <li key={index}>
                          <a
                            href={`http://localhost:5001/uploads/${file.filePath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 underline"
                          >
                            {file.filename}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <button
                  onClick={() => handleDelete(announcement._id)}
                  className="mt-2 bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                >
                  Delete
                </button>
                <button
                  onClick={() => handleEdit(announcement)}
                  className="mt-2 ml-2 bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
                >
                  Update
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for Add/Update Announcement */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start pt-10">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">
              {editingAnnouncement ? "Update Announcement" : "Create Announcement"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title:</label>
                <input
                  type="text"
                  value={announcementFormData.title}
                  onChange={(e) =>
                    setAnnouncementFormData({ ...announcementFormData, title: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Content:</label>
                <textarea
                  value={announcementFormData.content}
                  onChange={(e) =>
                    setAnnouncementFormData({ ...announcementFormData, content: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type:</label>
                <select
                  value={announcementFormData.type}
                  onChange={(e) => {
                    const newType = e.target.value as "global" | "role" | "class";
                    setAnnouncementFormData({
                      ...announcementFormData,
                      type: newType,
                      roles: newType === "global" ? ["teacher", "student"] : [],
                    });
                  }}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="global">Global</option>
                  <option value="role">Role-Specific</option>
                  <option value="class">Class-Specific</option>
                </select>
              </div>
              {announcementFormData.type === "role" && (
                <div className="space-y-2">
                  {["teacher", "student"].map((role) => (
                    <label key={role} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={announcementFormData.roles.includes(role)}
                        onChange={() =>
                          setAnnouncementFormData({
                            ...announcementFormData,
                            roles: announcementFormData.roles.includes(role)
                              ? announcementFormData.roles.filter((r) => r !== role)
                              : [...announcementFormData.roles, role],
                          })
                        }
                        className="mr-2"
                      />
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </label>
                  ))}
                </div>
              )}
              {announcementFormData.type === "class" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Select Class:</label>
                    {/* In update mode, you might want to use a select with options. For brevity, here it is a simple text input. */}
                    <input
                      type="text"
                      value={announcementFormData.classId || ""}
                      onChange={(e) =>
                        setAnnouncementFormData({ ...announcementFormData, classId: e.target.value })
                      }
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Target:</label>
                    {["students", "teachers", "both"].map((target) => (
                      <label key={target} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={announcementFormData.classTarget?.includes(target) || false}
                          onChange={() =>
                            setAnnouncementFormData({
                              ...announcementFormData,
                              classTarget: announcementFormData.classTarget?.includes(target)
                                ? announcementFormData.classTarget.filter((t) => t !== target)
                                : [...(announcementFormData.classTarget || []), target],
                            })
                          }
                          className="mr-2"
                        />
                        {target.charAt(0).toUpperCase() + target.slice(1)}
                      </label>
                    ))}
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Attachments:</label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {announcementFormData.attachments && announcementFormData.attachments.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">Selected files:</p>
                    <ul className="list-disc list-inside">
                      {announcementFormData.attachments.map((file, index) => (
                        <li key={index} className="text-sm text-gray-600">
                          {file.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Publish Date/Time:</label>
                <input
                  type="datetime-local"
                  value={announcementFormData.publishDate}
                  onChange={(e) =>
                    setAnnouncementFormData({ ...announcementFormData, publishDate: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Expiry Date/Time:</label>
                <input
                  type="datetime-local"
                  value={announcementFormData.expiryDate || ""}
                  onChange={(e) =>
                    setAnnouncementFormData({ ...announcementFormData, expiryDate: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  {editingAnnouncement ? "Update" : "Submit"}
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingAnnouncement(null);
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementsPage;
