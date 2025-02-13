import { Edit, Trash } from "lucide-react";
import React, { useState, useEffect } from "react";

// Type definitions for attachments, users, and classes.
interface Attachment {
  filePath: string;
  filename: string;
  contentType: string;
}

interface User {
  name: string;
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

interface AnnouncementFormData {
  title: string;
  content: string;
  type: "global" | "role" | "class" | "individual";
  roles: string[];
  classId?: string;
  classTarget?: string[];
  publishDate: string;
  expiryDate?: string;
  attachments?: File[];
}

const AnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [announcementFormData, setAnnouncementFormData] = useState<AnnouncementFormData>({
    title: "",
    content: "",
    type: "global",
    roles: ["teacher", "student"],
    publishDate: "",
    expiryDate: "",
    attachments: [],
  });
  const [classes, setClasses] = useState<Class[]>([]);
  
  
  const [students, setStudents] = useState<{ _id: string; name: string; email: string; sap_id: string }[]>([]);
const [teachers, setTeachers] = useState<{ _id: string; name: string; email: string }[]>([]);    
const [showStudentModal, setShowStudentModal] = useState(false);
const [showTeacherModal, setShowTeacherModal] = useState(false);

const [studentSearchFilter, setStudentSearchFilter] = useState("name");

const [teacherSearchFilter, setTeacherSearchFilter] = useState("name");

const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
const [showFilters, setShowFilters] = useState(false);
const [studentNameSearch, setStudentNameSearch] = useState("");
const [studentEmailSearch, setStudentEmailSearch] = useState("");
const [studentSapIdSearch, setStudentSapIdSearch] = useState("");
const [studentSearch, setStudentSearch] = useState("");
const [searchBy, setSearchBy] = useState("name"); // Default filter is 'name'
const [teacherSearch, setTeacherSearch] = useState("");
const [searchByTeacher, setSearchByTeacher] = useState("name"); // Default search filter

  useEffect(() => {
    if (announcementFormData.type === "individual") {
      fetchUsers();
    }
  }, [announcementFormData.type]);
  
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
  
      // Fetch Students
      const studentResponse = await fetch("http://localhost:5001/api/users/students", {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!studentResponse.ok) throw new Error("Failed to fetch students");
      const studentData = await studentResponse.json();
      setStudents(studentData);
  
      // Fetch Teachers
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
  const filteredStudents = students.filter((student) => {
    if (!student) return false; // Prevent crashes
    if (!studentSearch.trim()) return true; // Show all students when search is empty
  
    const searchValue = studentSearch.toLowerCase();
  
    switch (searchBy) {
      case "name":
        return student.name?.toLowerCase().includes(searchValue);
      case "email":
        return student.email?.toLowerCase().includes(searchValue);
      case "sap_id":
        return student.profile?.sap_id
          ? student.profile.sap_id.toString().includes(searchValue)
          : false;
      default:
        return true; // Show all students if filter type is invalid
    }
  });
  
  
  
  
  const filteredTeachers = teachers.filter((teacher) => {
    if (!teacher) return false; // Prevent crashes
    if (!teacherSearch.trim()) return true; // Show all teachers when search is empty
  
    const searchValue = teacherSearch.toLowerCase();
  
    switch (searchByTeacher) {
      case "name":
        return teacher.name?.toLowerCase().includes(searchValue);
      case "email":
        return teacher.email?.toLowerCase().includes(searchValue);
      default:
        return true; // Show all teachers if no filter is selected
    }
  });
  
  
  useEffect(() => {
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    if (announcementFormData.type === "class") {
      fetchClasses();
    }
  }, [announcementFormData.type]);

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
      setClasses(data);
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

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
      setAnnouncements((prev) => prev.filter((a) => a._id !== id));
    } catch (error) {
      console.error("Error deleting announcement:", error);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setAnnouncementFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type as "global" | "role" | "class",
      roles: announcement.roles || [],
      classId: announcement.class && (announcement as any).class?._id 
                ? (announcement as any).class._id 
                : typeof announcement.class === "string" 
                  ? announcement.class 
                  : "",
      classTarget: announcement.classTarget || [],
      publishDate: announcement.publishDate.slice(0, 16),
      expiryDate: announcement.expiryDate ? announcement.expiryDate.slice(0, 16) : "",
      attachments: [],
    });
    setShowForm(true);
  };

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
  
      const { classId, ...rest } = announcementFormData;
      const payload = {
        ...rest,
        class: classId,
        publishDate: new Date(announcementFormData.publishDate).toISOString(),
        expiryDate: announcementFormData.expiryDate ? new Date(announcementFormData.expiryDate).toISOString() : null,
        attachments: uploadedFiles,
        targetUsers: [...selectedStudents, ...selectedTeachers], // Include selected users
      };
      
  
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setAnnouncementFormData({ ...announcementFormData, attachments: files });
    }
  };

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

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Announcements</h1>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingAnnouncement(null);
          }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Add Announcement
        </button>
      </div>

      {/* Announcements List */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Latest Announcements</h2>
        {loading ? (
          <p className="text-gray-600">Loading announcements...</p>
        ) : announcements.length === 0 ? (
          <p className="text-gray-600">No announcements available.</p>
        ) :  (
          <div className="space-y-4">
            {announcements.map((announcement, index) => (
              <div
                key={announcement._id}
                className={`p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow ${
                  index % 2 === 0 ? "bg-white" : "bg-gray-50"
                } border border-gray-200`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-1">{announcement.title}</h3>
                    <p className="text-gray-600 mb-4">{announcement.content}</p>
                  </div>
                  <div className="flex space-x-2">
                  <Edit
                      className="text-blue-500 mx-5 cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => handleEdit(announcement)}
                    />
                    <Trash
                      className="text-red-500 mx-2 cursor-pointer hover:text-red-600 transition-colors"
                      onClick={() => handleDelete(announcement._id)}
                    />
                    {/* <button
                      onClick={() => handleEdit(announcement)}
                      className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(announcement._id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button> */}
                  </div>
                </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600 mt-2">                  <div>
                      <p><strong>Type:</strong> {announcement.type}</p>
                      {announcement.roles && announcement.roles.length > 0 && (
                        <p><strong>Roles:</strong> {announcement.roles.join(", ")}</p>
                      )}
                    </div>
                    
                    <div>
                      {announcement.class_code !== undefined && (
                        <p><strong>Class Code:</strong> {announcement.class_code}</p>
                      )}
                      {announcement.commencement_year !== undefined && (
                        <p><strong>Commencement Year:</strong> {announcement.commencement_year}</p>
                      )}
                      {announcement.classTarget && announcement.classTarget.length > 0 && (
                        <p><strong>Class Target:</strong> {announcement.classTarget.join(", ")}</p>
                      )}
                    </div>

                    <div>
                      <p><strong>Publish Date:</strong> {new Date(announcement.publishDate).toLocaleString()}</p>
                      {announcement.expiryDate && (
                        <p><strong>Expiry Date:</strong> {new Date(announcement.expiryDate).toLocaleString()}</p>
                      )}
                      <p><strong>Created By:</strong> {announcement.createdBy?.name || "Admin"}</p>
                    </div>
                  </div>

                  {announcement.attachments && announcement.attachments.length > 0 && (
                    <div className="mt-4">
                      <p className="font-semibold text-sm text-gray-700">Attachments:</p>
                      <ul className="list-disc list-inside">
                        {announcement.attachments.map((file, index) => (
                          <li key={index}>
                            <a
                              href={`http://localhost:5001/uploads/${file.filePath}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              {file.filename}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for Add/Update Announcement */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start pt-10">
    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">            <h2 className="text-xl font-bold mb-4">
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type:</label>
                <select
                    value={announcementFormData.type}
                    onChange={(e) => {
                      const newType = e.target.value as "global" | "role" | "class" | "individual";
                      setAnnouncementFormData({
                        ...announcementFormData,
                        type: newType,
                        roles: newType === "global" ? ["teacher", "student"] : [],
                        classTarget: newType === "class" ? ["students"] : [], // Default to students for class-specific
                      });
                    }}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="global">Global</option>
                    <option value="role">Role-Specific</option>
                    <option value="class">Class-Specific</option>
                    <option value="individual">Individual-Specific</option>
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
  <div>
    <label className="block text-sm font-medium text-gray-700">Select Class:</label>
    <select
      value={announcementFormData.classId || ""}
      onChange={(e) =>
        setAnnouncementFormData({ ...announcementFormData, classId: e.target.value })
      }
      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
    >
      <option value="">Select a class</option>
      {classes.map((cls) => (
        <option key={cls._id} value={cls._id}>
          {cls.class_code} - {cls.commencement_year} ({cls.specialization})
        </option>
      ))}
    </select>
  </div>
)}
{announcementFormData.type === "individual" && (
  <div>
    <p className="block text-sm font-medium text-gray-700">Select Recipients:</p>
    
    {/* Students Checkbox */}
    <label className="flex items-center mt-2">
      <input
        type="checkbox"
        checked={selectedStudents.length > 0}
        onChange={() => setShowStudentModal(true)}
        className="mr-2"
      />
      <span>Select Students</span>
      <button
        type="button"
        onClick={() => setShowStudentModal(true)}
        className="ml-4 px-2 py-1 bg-indigo-500 text-white rounded-md"
      >
        Choose Students
      </button>
    </label>

    {/* Teachers Checkbox */}
    <label className="flex items-center mt-2">
      <input
        type="checkbox"
        checked={selectedTeachers.length > 0}
        onChange={() => setShowTeacherModal(true)}
        className="mr-2"
      />
      <span>Select Teachers</span>
      <button
        type="button"
        onClick={() => setShowTeacherModal(true)}
        className="ml-4 px-2 py-1 bg-indigo-500 text-white rounded-md"
      >
        Choose Teachers
      </button>
    </label>
  </div>
)}
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

      {/* Show Filters Button */}
<button
  onClick={() => setShowFilters((prev) => !prev)}
  className={`px-3 py-2 rounded-md w-full mb-3 transition-colors 
    ${showFilters ? "border border-indigo-500 bg-white text-indigo-600" : "bg-gray-400 text-white hover:bg-gray-600"}`}
>
  {showFilters ? "Hide Filters" : "Show Filters"}
</button>


      {/* Filter Inputs */}
      {showFilters && (
    <div className="space-y-2 mb-3">
    <input
      type="text"
      placeholder="Search by Name"
      className="border p-2 rounded w-full"
      value={searchBy === "name" ? studentSearch : ""}
      onChange={(e) => {
        setSearchBy("name");
        setStudentSearch(e.target.value);
      }}
    />
    <input
      type="text"
      placeholder="Search by Email"
      className="border p-2 rounded w-full"
      value={searchBy === "email" ? studentSearch : ""}
      onChange={(e) => {
        setSearchBy("email");
        setStudentSearch(e.target.value);
      }}
    />
    <input
      type="text"
      placeholder="Search by SAP ID"
      className="border p-2 rounded w-full"
      value={searchBy === "sap_id" ? studentSearch : ""}
      onChange={(e) => {
        setSearchBy("sap_id");
        setStudentSearch(e.target.value);
      }}
    />
  </div>
      )}

      {/* Filtered Student List */}
      <ul className="max-h-60 overflow-y-auto border rounded">
        {filteredStudents.map((student) => (
          <li key={student._id} className="p-2 border-b flex justify-between items-center">
<span>
  {student.name} ({student.email}) - {student.profile?.sap_id ?? "N/A"}
</span>            <input
              type="checkbox"
              checked={selectedStudents.includes(student._id)}
              onChange={() => toggleStudentSelection(student._id)}
            />
          </li>
        ))}
      </ul>

      <button 
        onClick={() => setShowStudentModal(false)} 
        className="mt-3 w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700"
      >
        Confirm Selection
      </button>
    </div>
  </div>
)}



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

      {/* Show Filters Button */}
      <button
        onClick={() => setShowFilters((prev) => !prev)}
        className={`px-3 py-2 rounded-md w-full mb-3 transition-colors 
          ${showFilters ? "border border-indigo-500 bg-white text-indigo-600" : "bg-gray-400 text-white hover:bg-gray-600"}`}
      >
        {showFilters ? "Hide Filters" : "Show Filters"}
      </button>

      {/* Filter Inputs */}
      {showFilters && (
        <div className="space-y-2 mb-3">
          <input
            type="text"
            placeholder="Search by Name"
            className="border p-2 rounded w-full"
            value={searchBy === "name" ? teacherSearch : ""}
            onChange={(e) => {
              setSearchBy("name");
              setTeacherSearch(e.target.value);
            }}
          />
          <input
            type="text"
            placeholder="Search by Email"
            className="border p-2 rounded w-full"
            value={searchBy === "email" ? teacherSearch : ""}
            onChange={(e) => {
              setSearchBy("email");
              setTeacherSearch(e.target.value);
            }}
          />
        </div>
      )}

      {/* Filtered Teacher List */}
      <ul className="max-h-60 overflow-y-auto border rounded bg-white shadow-md">
        {filteredTeachers.length > 0 ? (
          filteredTeachers.map((teacher) => (
            <li key={teacher._id} className="p-2 border-b flex justify-between items-center">
              <span>{teacher.name} ({teacher.email})</span>
              <input
                type="checkbox"
                checked={selectedTeachers.includes(teacher._id)}
                onChange={() => toggleTeacherSelection(teacher._id)}
              />
            </li>
          ))
        ) : (
          <li className="p-2 text-gray-500 text-center">No teachers found</li>
        )}
      </ul>

      <button 
        onClick={() => setShowTeacherModal(false)} 
        className="mt-3 w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700"
      >
        Confirm Selection
      </button>
    </div>
  </div>
)}





              <div>
                <label className="block text-sm font-medium text-gray-700">Attachments:</label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors"
                >
                  {editingAnnouncement ? "Update" : "Submit"}
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingAnnouncement(null);
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
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