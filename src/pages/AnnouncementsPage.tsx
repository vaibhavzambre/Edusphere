import { Edit, Trash } from "lucide-react";
import React, { useState, useEffect } from "react";

interface Attachment {
  filePath: string;
  filename: string;
  contentType: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  profile?: { sap_id: number };
}

interface Class {
  _id: string;
  class_code: number;
  commencement_year: number;
  specialization: string;
}

interface Announcement {
  _id: string;
  title: string;
  content: string;
  type: "global" | "role" | "class" | "individual";
  roles?: string[];
  classes?: Class[];
  targetUsers?: User[];
  publishDate: string;
  expiryDate?: string;
  expiryType: "permanent" | "limited";
  attachmentsEnabled: boolean;
  attachments?: Attachment[];
  createdBy: User;
  visible: boolean;
}

interface AnnouncementFormData {
  title: string;
  content: string;
  type: "global" | "role" | "class" | "individual";
  roles: string[];
  classes: string[]; // Using only one field for class-specific announcements.
  targetUsers: string[]; // array of user IDs
  publishDate: string;
  expiryType: "permanent" | "limited";
  expiryDate: string;
  attachmentsEnabled: boolean;
  attachments: File[]; // Newly uploaded files
}

/**
 * Converts a stored UTC ISO date string into a string formatted for
 * a datetime-local input in local (Mumbai) time.
 */
const formatDateToLocalInput = (dateStr: string): string => {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = ("0" + (d.getMonth() + 1)).slice(-2);
  const day = ("0" + d.getDate()).slice(-2);
  const hours = ("0" + d.getHours()).slice(-2);
  const minutes = ("0" + d.getMinutes()).slice(-2);
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Returns the current local datetime in "YYYY-MM-DDTHH:mm" format.
 */
const getCurrentDateTimeLocal = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = ("0" + (now.getMonth() + 1)).slice(-2);
  const day = ("0" + now.getDate()).slice(-2);
  const hours = ("0" + now.getHours()).slice(-2);
  const minutes = ("0" + now.getMinutes()).slice(-2);
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const AnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [announcementFormData, setAnnouncementFormData] = useState<AnnouncementFormData>({
    title: "",
    content: "",
    type: "global",
    roles: [],
    classes: [],
    targetUsers: [],
    publishDate: "",
    expiryType: "permanent",
    expiryDate: "",
    attachmentsEnabled: false,
    attachments: [],
  });
  // State to hold existing attachments when editing
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);

  const [classesList, setClassesList] = useState<Class[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);

  // Custom dropdown for classes
  const [showClassesDropdown, setShowClassesDropdown] = useState(false);

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);

  // Detailed modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailedAnnouncement, setDetailedAnnouncement] = useState<Announcement | null>(null);
  const [recipientSearch, setRecipientSearch] = useState("");
  // For filtering in student modal
  const [studentSearch, setStudentSearch] = useState("");
  const [searchBy, setSearchBy] = useState("name"); // default filter

  // For filtering in teacher modal
  const [teacherSearch, setTeacherSearch] = useState("");
  const [searchByTeacher, setSearchByTeacher] = useState("name");

  // For toggling filters display in modals
  const [showFilters, setShowFilters] = useState(false);
  // For student filtering:
  const [studentNameSearch, setStudentNameSearch] = useState("");
  const [studentEmailSearch, setStudentEmailSearch] = useState("");
  const [studentSapIdSearch, setStudentSapIdSearch] = useState("");
  // Teacher filter states:
  const [teacherNameSearch, setTeacherNameSearch] = useState("");
  const [teacherEmailSearch, setTeacherEmailSearch] = useState("");

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    if (announcementFormData.type === "class") {
      fetchClasses();
    }
    if (announcementFormData.type === "individual") {
      fetchUsers();
    }
  }, [announcementFormData.type]);

  // NEW: When editing an individual announcement, update preselected recipients
  useEffect(() => {
    if (
      editingAnnouncement &&
      editingAnnouncement.type === "individual" &&
      editingAnnouncement.targetUsers
    ) {
      // Use the loaded lists of students and teachers to determine which recipients are students vs teachers
      const studentIds = editingAnnouncement.targetUsers
        .filter((user) => students.some((s) => s._id === user._id))
        .map((user) => user._id);
      const teacherIds = editingAnnouncement.targetUsers
        .filter((user) => teachers.some((t) => t._id === user._id))
        .map((user) => user._id);
      setSelectedStudents(studentIds);
      setSelectedTeachers(teacherIds);
    }
  }, [editingAnnouncement, students, teachers]);

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
      console.log("Fetched Announcements:", data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/classes", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch classes");
      const data = await response.json();
      setClassesList(data);
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const studentResponse = await fetch("http://localhost:5001/api/users/students", {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!studentResponse.ok) throw new Error("Failed to fetch students");
      const studentData = await studentResponse.json();
      setStudents(studentData);

      const teacherResponse = await fetch("http://localhost:5001/api/users/teachers", {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!teacherResponse.ok) throw new Error("Failed to fetch teachers");
      const teacherData = await teacherResponse.json();
      setTeachers(teacherData);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // Custom dropdown for selecting classes
  const selectAllClasses = () => {
    const allClassIds = classesList.map((cls) => cls._id);
    setAnnouncementFormData({ ...announcementFormData, classes: allClassIds });
  };

  const clearAllClasses = () => {
    setAnnouncementFormData({ ...announcementFormData, classes: [] });
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const toggleTeacherSelection = (teacherId: string) => {
    setSelectedTeachers((prev) =>
      prev.includes(teacherId) ? prev.filter((id) => id !== teacherId) : [...prev, teacherId]
    );
  };

  const handleDelete = async () => {
    if (!announcementToDelete) return;
    try {
      const response = await fetch(`http://localhost:5001/api/announcements/${announcementToDelete._id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete announcement");
      setAnnouncements((prev) => prev.filter((a) => a._id !== announcementToDelete._id));
      setShowDeleteModal(false);
      setAnnouncementToDelete(null);
    } catch (error) {
      console.error("Error deleting announcement:", error);
    }
  };

  // UPDATED: When editing, load existing attachments.
  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setAnnouncementFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      roles: announcement.roles || [],
      classes: announcement.classes ? announcement.classes.map((cls) => cls._id) : [],
      targetUsers: announcement.targetUsers ? announcement.targetUsers.map((u) => u._id) : [],
      publishDate: formatDateToLocalInput(announcement.publishDate),
      expiryType: announcement.expiryType,
      expiryDate:
        announcement.expiryType === "limited" && announcement.expiryDate
          ? formatDateToLocalInput(announcement.expiryDate)
          : "",
      attachmentsEnabled: announcement.attachmentsEnabled,
      attachments: [], // New uploads will go here
    });
    // Load existing attachments if any.
    setExistingAttachments(announcement.attachments ? announcement.attachments : []);
    setShowForm(true);
  };

  // Handler to remove an existing attachment from the edit form
  const removeAttachment = (filePath: string) => {
    setExistingAttachments(existingAttachments.filter((att) => att.filePath !== filePath));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !announcementFormData.title ||
      !announcementFormData.content ||
      !announcementFormData.type ||
      !announcementFormData.publishDate
    ) {
      alert("Please fill all required fields.");
      return;
    }
    if (announcementFormData.expiryType === "limited" && !announcementFormData.expiryDate) {
      alert("Please set expiry date/time for limited announcements.");
      return;
    }
    if (announcementFormData.type === "role" && announcementFormData.roles.length === 0) {
      alert("Please select at least one role.");
      return;
    }
    if (announcementFormData.type === "class" && announcementFormData.classes.length === 0) {
      alert("Please select at least one class.");
      return;
    }
    if (
      announcementFormData.type === "individual" &&
      selectedStudents.length === 0 &&
      selectedTeachers.length === 0
    ) {
      alert("Please select at least one recipient.");
      return;
    }
    if (
      announcementFormData.attachmentsEnabled &&
      announcementFormData.attachments.length === 0 &&
      existingAttachments.length === 0
    ) {
      alert("Please attach at least one file.");
      return;
    }

    let uploadedFiles: { filePath: string; filename: string; contentType: string }[] = [];
    if (announcementFormData.attachmentsEnabled && announcementFormData.attachments.length > 0) {
      const token = localStorage.getItem("token");
      for (const file of announcementFormData.attachments) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadResponse = await fetch("http://localhost:5001/api/attachments/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
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

    const allRecipients = [...selectedStudents, ...selectedTeachers];

    const payload = {
      title: announcementFormData.title,
      content: announcementFormData.content,
      type: announcementFormData.type,
      roles: announcementFormData.type === "role" ? announcementFormData.roles : [],
      classes: announcementFormData.type === "class" ? announcementFormData.classes : [],
      targetUsers: announcementFormData.type === "individual" ? allRecipients : [],
      publishDate: new Date(announcementFormData.publishDate).toISOString(),
      expiryType: announcementFormData.expiryType,
      expiryDate:
        announcementFormData.expiryType === "limited"
          ? new Date(announcementFormData.expiryDate).toISOString()
          : new Date("9999-12-31T23:59:59.999Z").toISOString(),
      attachmentsEnabled: announcementFormData.attachmentsEnabled,
      attachments: announcementFormData.attachmentsEnabled
        ? editingAnnouncement
          ? [...existingAttachments, ...uploadedFiles]
          : uploadedFiles
        : [],
    };

    try {
      if (editingAnnouncement) {
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
        setAnnouncements((prev) =>
          prev.map((a) => (a._id === updatedAnnouncement._id ? updatedAnnouncement : a))
        );
        setSuccessMessage("Announcement updated successfully!");
      } else {
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

      setAnnouncementFormData({
        title: "",
        content: "",
        type: "global",
        roles: [],
        classes: [],
        targetUsers: [],
        publishDate: "",
        expiryType: "permanent",
        expiryDate: "",
        attachmentsEnabled: false,
        attachments: [],
      });
      setExistingAttachments([]);
      setEditingAnnouncement(null);
      setShowForm(false);
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setAnnouncementFormData((prev) => ({ ...prev, attachments: files }));
    }
  };

  const now = Date.now();

  const upcomingAnnouncements = announcements
    .filter((a) => new Date(a.publishDate).getTime() > now)
    .sort((a, b) => new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime());

  const publishedAnnouncements = announcements.filter((a) => new Date(a.publishDate).getTime() <= now);

  const activeAnnouncements = publishedAnnouncements
    .filter((a) => a.visible)
    .sort((a, b) => {
      const expiryDiff = new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime();
      if (expiryDiff !== 0) return expiryDiff;
      return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
    });

  const expiredAnnouncements = publishedAnnouncements
    .filter((a) => !a.visible)
    .sort((a, b) => new Date(b.expiryDate!).getTime() - new Date(a.expiryDate!).getTime());

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded flex justify-between items-center">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage("")} className="text-green-700 hover:text-green-900">
            &times;
          </button>
        </div>
      )}

      <div className="flex justify-end items-center mb-6">
        <button
          onClick={() => {
            setShowForm(true);
            setEditingAnnouncement(null);
            setExistingAttachments([]);
          }}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl shadow-md hover:bg-indigo-700 active:scale-95 transition-all duration-300"
        >
          + Add Announcement
        </button>
      </div>

      {/* Upcoming Announcements Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Upcoming Announcements</h2>
        {upcomingAnnouncements.length === 0 ? (
          <p className="text-gray-600">No upcoming announcements.</p>
        ) : (
          upcomingAnnouncements.map((announcement) => (
            <div
              key={announcement._id}
              className="p-5 mb-4 rounded-xl shadow-md bg-white border border-gray-300 transition-transform transform hover:-translate-y-1 hover:shadow-lg hover:border-indigo-500 duration-300"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">{announcement.title}</h3>
                  <p className="text-gray-600">{announcement.content}</p>
                  <p className="text-sm text-gray-600">
                    <strong>Type:</strong> {announcement.type === "global" ? "Global" : announcement.type}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Edit
                    className="text-blue-500 cursor-pointer hover:text-blue-600"
                    onClick={() => handleEdit(announcement)}
                  />
                  <Trash
                    className="text-red-500 cursor-pointer hover:text-red-600"
                    onClick={() => {
                      setAnnouncementToDelete(announcement);
                      setShowDeleteModal(true);
                    }}
                  />
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                <p>
                  <strong>Publish Date:</strong>{" "}
                  {new Date(announcement.publishDate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                </p>
                <p>
                  <strong>Expiry:</strong>{" "}
                  {announcement.expiryType === "permanent"
                    ? "Permanent"
                    : new Date(announcement.expiryDate!).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                </p>
                <p>
                  <strong>Created By:</strong> {announcement.createdBy?.name || "Admin"}
                </p>
                {announcement.attachments && announcement.attachments.length > 0 && (
                  <div className="mt-2">
                    <strong>Attachments:</strong>
                    <ul className="list-disc list-inside">
                      {announcement.attachments.map((att, index) => (
                        <li key={index}>
                          <a
                            href={`http://localhost:5001/api/attachments/${att.filePath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 underline"
                          >
                            {att.filename}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setDetailedAnnouncement(announcement);
                  setShowDetailModal(true);
                }}
                className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded-xl shadow-md hover:bg-indigo-700 hover:shadow-lg active:scale-95 transition-all duration-300"
              >
                View Detailed List
              </button>
            </div>
          ))
        )}
      </div>

      {/* Active Announcements Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Active Announcements</h2>
        {activeAnnouncements.length === 0 ? (
          <p className="text-gray-600">No active announcements.</p>
        ) : (
          activeAnnouncements.map((announcement) => (
            <div key={announcement._id} className="p-4 mb-4 rounded-lg shadow-sm bg-white border border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">{announcement.title}</h3>
                  <p className="text-gray-600">{announcement.content}</p>
                  <p className="text-sm text-gray-600">
                    <strong>Type:</strong> {announcement.type === "global" ? "Global" : announcement.type}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Edit
                    className="text-indigo-500 cursor-pointer hover:text-indigo-600 transition-all duration-200 transform hover:scale-110"
                    onClick={() => handleEdit(announcement)}
                  />
                  <Trash
                    className="text-red-500 cursor-pointer hover:text-red-600 transition-all duration-200 transform hover:scale-110"
                    onClick={() => {
                      setAnnouncementToDelete(announcement);
                      setShowDeleteModal(true);
                    }}
                  />
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                <p>
                  <strong>Publish Date:</strong>{" "}
                  {new Date(announcement.publishDate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                </p>
                <p>
                  <strong>Expiry:</strong>{" "}
                  {announcement.expiryType === "permanent"
                    ? "Permanent"
                    : new Date(announcement.expiryDate!).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                </p>
                <p>
                  <strong>Created By:</strong> {announcement.createdBy?.name || "Admin"}
                </p>
                {announcement.attachments && announcement.attachments.length > 0 && (
                  <div className="mt-2">
                    <strong>Attachments:</strong>
                    <ul className="list-disc list-inside">
                      {announcement.attachments.map((att, index) => (
                        <li key={index}>
                          <a
                            href={`http://localhost:5001/api/attachments/${att.filePath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 underline"
                          >
                            {att.filename}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setDetailedAnnouncement(announcement);
                  setShowDetailModal(true);
                }}
                className="mt-2 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
              >
                View Detailed List
              </button>
            </div>
          ))
        )}
      </div>

      {/* Expired Announcements Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Expired Announcements</h2>
        {expiredAnnouncements.length === 0 ? (
          <p className="text-gray-600">No expired announcements.</p>
        ) : (
          expiredAnnouncements.map((announcement) => (
            <div key={announcement._id} className="p-4 mb-4 rounded-lg shadow-sm bg-gray-100 border border-gray-300">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">{announcement.title}</h3>
                  <p className="text-gray-600">{announcement.content}</p>
                  <p className="text-sm text-gray-600">
                    <strong>Type:</strong> {announcement.type === "global" ? "Global" : announcement.type}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Edit
                    className="text-blue-500 cursor-pointer hover:text-blue-600"
                    onClick={() => handleEdit(announcement)}
                  />
                  <Trash
                    className="text-red-500 cursor-pointer hover:text-red-600"
                    onClick={() => {
                      setAnnouncementToDelete(announcement);
                      setShowDeleteModal(true);
                    }}
                  />
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                <p>
                  <strong>Publish Date:</strong>{" "}
                  {new Date(announcement.publishDate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                </p>
                <p>
                  <strong>Expired On:</strong>{" "}
                  {new Date(announcement.expiryDate!).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                </p>
                <p>
                  <strong>Created By:</strong> {announcement.createdBy?.name || "Admin"}
                </p>
                {announcement.attachments && announcement.attachments.length > 0 && (
                  <div className="mt-2">
                    <strong>Attachments:</strong>
                    <ul className="list-disc list-inside">
                      {announcement.attachments.map((att, index) => (
                        <li key={index}>
                          <a
                            href={`http://localhost:5001/api/attachments/${att.filePath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 underline"
                          >
                            {att.filename}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setDetailedAnnouncement(announcement);
                  setShowDetailModal(true);
                }}
                className="mt-2 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
              >
                View Detailed List
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Announcement Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start pt-10">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingAnnouncement ? "Update Announcement" : "Create Announcement"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Title:<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={announcementFormData.title}
                  onChange={(e) =>
                    setAnnouncementFormData({ ...announcementFormData, title: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Content:<span className="text-red-500">*</span>
                </label>
                <textarea
                  value={announcementFormData.content}
                  onChange={(e) =>
                    setAnnouncementFormData({ ...announcementFormData, content: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Type of Announcement:<span className="text-red-500">*</span>
                </label>
                <select
                  value={announcementFormData.type}
                  onChange={(e) => {
                    const newType = e.target.value as "global" | "role" | "class" | "individual";
                    setAnnouncementFormData({
                      ...announcementFormData,
                      type: newType,
                      roles: newType === "role" ? [] : [],
                      classes: newType === "class" ? [] : [],
                      targetUsers: newType === "individual" ? [] : [],
                    });
                  }}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="global">Global</option>
                  <option value="role">Role-Specific</option>
                  <option value="class">Class-Specific</option>
                  <option value="individual">Individual-Specific</option>
                </select>
              </div>
              {/* Role-specific selection */}
              {announcementFormData.type === "role" && (
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Select Roles:<span className="text-red-500">*</span>
                  </p>
                  {["teacher", "student"].map((role) => (
                    <label key={role} className="flex items-center mt-2">
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
              {/* Class-specific selection */}
              {announcementFormData.type === "class" && (
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Select Classes:<span className="text-red-500">*</span>
                  </p>
                  {/* Custom dropdown for selecting classes */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowClassesDropdown(!showClassesDropdown)}
                      className="w-full border p-2 rounded flex justify-between items-center"
                    >
                      <span>
                        {announcementFormData.classes.length > 0
                          ? classesList
                              .filter((c) => announcementFormData.classes.includes(c._id))
                              .map((c) => `${c.class_code} - ${c.commencement_year}`)
                              .join(", ")
                          : "Select Classes"}
                      </span>
                      <span>▼</span>
                    </button>
                    {showClassesDropdown && (
                      <div className="absolute mt-1 w-full border rounded bg-white z-10 max-h-60 overflow-y-auto">
                        {classesList.map((cls) => (
                          <label key={cls._id} className="flex items-center p-2 hover:bg-gray-100">
                            <input
                              type="checkbox"
                              value={cls._id}
                              checked={announcementFormData.classes.includes(cls._id)}
                              onChange={() => {
                                const selected = announcementFormData.classes;
                                if (selected.includes(cls._id)) {
                                  setAnnouncementFormData({
                                    ...announcementFormData,
                                    classes: selected.filter((id) => id !== cls._id),
                                  });
                                } else {
                                  setAnnouncementFormData({
                                    ...announcementFormData,
                                    classes: [...selected, cls._id],
                                  });
                                }
                              }}
                              className="mr-2"
                            />
                            {cls.class_code} - {cls.commencement_year} ({cls.specialization})
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2 mt-2">
                    <button type="button" onClick={selectAllClasses} className="px-3 py-1 bg-gray-200 rounded">
                      Select All Classes
                    </button>
                    <button type="button" onClick={clearAllClasses} className="px-3 py-1 bg-gray-200 rounded">
                      Clear All Classes
                    </button>
                  </div>
                </div>
              )}
              {/* Individual-specific selection */}
              {announcementFormData.type === "individual" && (
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Select Recipients:<span className="text-red-500">*</span>
                  </p>
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => setShowStudentModal(true)}
                      className="px-3 py-1 bg-indigo-500 text-white rounded"
                    >
                      Choose Students
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTeacherModal(true)}
                      className="px-3 py-1 bg-indigo-500 text-white rounded"
                    >
                      Choose Teachers
                    </button>
                  </div>
                </div>
              )}
              {/* Publish Date/Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Publish Date/Time:<span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={announcementFormData.publishDate}
                  min={getCurrentDateTimeLocal()}
                  onChange={(e) =>
                    setAnnouncementFormData({ ...announcementFormData, publishDate: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              {/* Duration Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Duration Type:<span className="text-red-500">*</span>
                </label>
                <select
                  value={announcementFormData.expiryType}
                  onChange={(e) =>
                    setAnnouncementFormData({ ...announcementFormData, expiryType: e.target.value as "permanent" | "limited" })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="permanent">Permanent</option>
                  <option value="limited">Time-Limited</option>
                </select>
              </div>
              {/* Expiry Date (only if limited) */}
              {announcementFormData.expiryType === "limited" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Expiry Date/Time:<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={announcementFormData.expiryDate}
                    onChange={(e) =>
                      setAnnouncementFormData({ ...announcementFormData, expiryDate: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
              )}
              {/* Attachments dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Do you have attachments?<span className="text-red-500">*</span>
                </label>
                <select
                  value={announcementFormData.attachmentsEnabled ? "yes" : "no"}
                  onChange={(e) =>
                    setAnnouncementFormData({ ...announcementFormData, attachmentsEnabled: e.target.value === "yes" })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
              {/* File upload (if attachments enabled) */}
              {announcementFormData.attachmentsEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Attach New Files:
                  </label>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              )}
              {/* Display Existing Attachments (if editing and they exist) */}
              {editingAnnouncement && existingAttachments.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Existing Attachments:</label>
                  <ul className="list-disc list-inside">
                    {existingAttachments.map((att, index) => (
                      <li key={index} className="flex items-center">
                        <a
                          href={`http://localhost:5001/api/attachments/${att.filePath}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 underline"
                        >
                          {att.filename}
                        </a>
                        <button onClick={() => removeAttachment(att.filePath)} className="ml-2 text-red-500">
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex space-x-4">
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
                  {editingAnnouncement ? "Update" : "Submit"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingAnnouncement(null);
                    setExistingAttachments([]);
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

      {/* Student Selection Modal */}
      {showStudentModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg relative">
            <button
              onClick={() => setShowStudentModal(false)}
              className="absolute top-2 right-3 text-gray-600 hover:text-gray-900 text-xl"
            >
              ❌
            </button>
            <h2 className="text-lg font-semibold mb-2">Select Students</h2>

            {/* Toggle Filters and Clear All button */}
            <div className="flex items-center mb-3">
              <button
                onClick={() => setShowFilters((prev) => !prev)}
                className={`px-3 py-2 rounded-md w-full transition-colors ${
                  showFilters
                    ? "border border-indigo-500 bg-white text-indigo-600"
                    : "bg-gray-400 text-white hover:bg-gray-600"
                }`}
              >
                {showFilters ? "Hide Filters" : "Show Filters"}
              </button>
              {showFilters && (
                <button
                  onClick={() => {
                    setStudentNameSearch("");
                    setStudentEmailSearch("");
                    setStudentSapIdSearch("");
                  }}
                  className="ml-2 px-3 py-2 rounded-md bg-red-500 text-white"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Filter Inputs */}
            {showFilters && (
              <div className="space-y-2 mb-3">
                <input
                  type="text"
                  placeholder="Search by Name"
                  className="border p-2 rounded w-full"
                  value={studentNameSearch}
                  onChange={(e) => setStudentNameSearch(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Search by Email"
                  className="border p-2 rounded w-full"
                  value={studentEmailSearch}
                  onChange={(e) => setStudentEmailSearch(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Search by SAP ID"
                  className="border p-2 rounded w-full"
                  value={studentSapIdSearch}
                  onChange={(e) => setStudentSapIdSearch(e.target.value)}
                />
              </div>
            )}

            {/* Filtered Student List */}
            <ul className="max-h-60 overflow-y-auto border rounded">
              {students
                .filter((student) => {
                  const nameMatch =
                    studentNameSearch.trim() === "" ||
                    student.name.toLowerCase().includes(studentNameSearch.toLowerCase());
                  const emailMatch =
                    studentEmailSearch.trim() === "" ||
                    student.email.toLowerCase().includes(studentEmailSearch.toLowerCase());
                  const sapMatch =
                    studentSapIdSearch.trim() === "" ||
                    (student.profile && student.profile.sap_id.toString().includes(studentSapIdSearch));
                  return nameMatch && emailMatch && sapMatch;
                })
                .map((student) => (
                  <li key={student._id} className="p-2 border-b flex justify-between items-center">
                    <span>
                      {student.name} ({student.email}) - {student.profile?.sap_id ?? "N/A"}
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student._id)}
                      onChange={() => toggleStudentSelection(student._id)}
                    />
                  </li>
                ))}
            </ul>

            <button
              onClick={() => {
                setShowFilters(false);
                setShowStudentModal(false);
              }}
              className="mt-3 w-full bg-indigo-600 text-white p-2 rounded"
            >
              Confirm Selection
            </button>
          </div>
        </div>
      )}

      {/* Teacher Selection Modal */}
      {showTeacherModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg relative">
            <button
              onClick={() => setShowTeacherModal(false)}
              className="absolute top-2 right-3 text-gray-600 hover:text-gray-900 text-xl"
            >
              ❌
            </button>
            <h2 className="text-lg font-semibold mb-2">Select Teachers</h2>

            {/* Toggle Filters & Clear All Button */}
            <div className="flex items-center mb-3">
              <button
                onClick={() => setShowFilters((prev) => !prev)}
                className={`px-3 py-2 rounded-md w-full transition-colors ${
                  showFilters
                    ? "border border-indigo-500 bg-white text-indigo-600"
                    : "bg-gray-400 text-white hover:bg-gray-600"
                }`}
              >
                {showFilters ? "Hide Filters" : "Show Filters"}
              </button>
              {showFilters && (
                <button
                  onClick={() => {
                    setTeacherNameSearch("");
                    setTeacherEmailSearch("");
                  }}
                  className="ml-2 px-3 py-2 rounded-md bg-red-500 text-white"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Filter Inputs */}
            {showFilters && (
              <div className="space-y-2 mb-3">
                <input
                  type="text"
                  placeholder="Search by Name"
                  className="border p-2 rounded w-full"
                  value={teacherNameSearch}
                  onChange={(e) => setTeacherNameSearch(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Search by Email"
                  className="border p-2 rounded w-full"
                  value={teacherEmailSearch}
                  onChange={(e) => setTeacherEmailSearch(e.target.value)}
                />
              </div>
            )}

            {/* Filtered Teacher List */}
            <ul className="max-h-60 overflow-y-auto border rounded bg-white shadow-md">
              {teachers
                .filter((teacher) => {
                  const nameMatch =
                    teacherNameSearch.trim() === "" ||
                    teacher.name.toLowerCase().includes(teacherNameSearch.toLowerCase());
                  const emailMatch =
                    teacherEmailSearch.trim() === "" ||
                    teacher.email.toLowerCase().includes(teacherEmailSearch.toLowerCase());
                  return nameMatch && emailMatch;
                })
                .map((teacher) => (
                  <li key={teacher._id} className="p-2 border-b flex justify-between items-center">
                    <span>
                      {teacher.name} ({teacher.email})
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedTeachers.includes(teacher._id)}
                      onChange={() => toggleTeacherSelection(teacher._id)}
                    />
                  </li>
                ))}
            </ul>

            <button
              onClick={() => {
                setShowFilters(false);
                setShowTeacherModal(false);
              }}
              className="mt-3 w-full bg-indigo-600 text-white p-2 rounded"
            >
              Confirm Selection
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && announcementToDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Confirm Deletion</h2>
            <p>
              Are you sure you want to delete the announcement titled "<strong>{announcementToDelete.title}</strong>"?
            </p>
            <div className="flex justify-end mt-4 space-x-4">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 bg-gray-300 rounded">
                Cancel
              </button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Recipients Modal */}
      {showDetailModal && detailedAnnouncement && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Detailed Recipients</h2>
            <p className="mb-4 text-sm text-gray-700">
              <strong>Announcement Type:</strong>{" "}
              {detailedAnnouncement.type === "global" ? "Global" : detailedAnnouncement.type}
            </p>
            {detailedAnnouncement.type === "role" && (
              <div className="mb-4">
                <p>
                  <strong>Roles:</strong> {detailedAnnouncement.roles?.join(", ")}
                </p>
              </div>
            )}
            {detailedAnnouncement.type === "class" && (
              <div className="mb-4">
                <p className="font-medium">Classes:</p>
                <ul className="list-disc list-inside">
                  {detailedAnnouncement.classes?.map((cls) => (
                    <li key={cls._id}>
                      {cls.class_code} - {cls.commencement_year} ({cls.specialization})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {detailedAnnouncement.type === "individual" && (
              <div className="mb-4">
                <p className="font-medium">Recipients:</p>
                <input
                  type="text"
                  placeholder="Search recipients..."
                  className="border p-2 rounded w-full mb-3"
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                />
                <ul className="list-disc list-inside">
                  {detailedAnnouncement.targetUsers
                    ?.filter(
                      (user) =>
                        user.name.toLowerCase().includes(recipientSearch.toLowerCase()) ||
                        user.email.toLowerCase().includes(recipientSearch.toLowerCase())
                    )
                    .map((user) => (
                      <li key={user._id}>
                        {user.name} ({user.email})
                      </li>
                    ))}
                </ul>
              </div>
            )}
            {detailedAnnouncement.attachments && detailedAnnouncement.attachments.length > 0 && (
              <div className="mb-4">
                <p className="font-medium">Attachments:</p>
                <ul className="list-disc list-inside">
                  {detailedAnnouncement.attachments.map((att, index) => (
                    <li key={index}>
                      <a
                        href={`http://localhost:5001/api/attachments/${att.filePath}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 underline"
                      >
                        {att.filename}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 bg-gray-300 rounded">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementsPage;
