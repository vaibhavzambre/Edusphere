import React, { useState, useEffect } from "react";
import axios from "axios";
import { Edit, Trash, Upload, XCircle, Download } from "lucide-react";

const BASE_URL = "http://localhost:5001";

interface ClassInfo {
  _id: string;
  course: string;
  specialization: string;
}

interface SubjectInfo {
  _id: string;
  subject_name: string;
}

interface Resource {
  _id: string;
  filename: string;
  file_id: string;
  description: string;
  visibility: string;
  subject: SubjectInfo;
  classes: ClassInfo[];
  allowedStudents: string[];
  createdAt: string;
}

interface Student {
  _id: string;
  name: string;
  email: string;
  sap_id?: number;
}

const TeacherResources = () => {
  // Data states
  const [resources, setResources] = useState<Resource[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  // For upload mode – the full list of students available
  const [students, setStudents] = useState<Student[]>([]);
  // For update mode – the list of students fetched based on the resource's classes
  const [updateStudents, setUpdateStudents] = useState<Student[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Modal toggles
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  // Toggle filters in the allowed-students modal
  const [showStudentFilters, setShowStudentFilters] = useState(false);

  // Currently selected resource (for update or delete)
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filters state for resource list
  const [filters, setFilters] = useState({
    filename: "",
    description: "",
    subject: "",
    class: "",
    visibility: "",
  });

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    subject: "",
    classes: [] as string[],
    description: "",
    visibility: "restricted",
    allowedStudents: [] as string[],
  });

  // Update form state – includes subject, classes, description, visibility, allowedStudents and an optional file update.
  const [updateForm, setUpdateForm] = useState<{
    subject: string;
    classes: string[];
    description: string;
    visibility: string;
    allowedStudents: string[];
    file: File | null;
  }>({
    subject: "",
    classes: [],
    description: "",
    visibility: "restricted",
    allowedStudents: [],
    file: null,
  });

  // Dropdown toggle for class selection in modals
  const [showClassesDropdown, setShowClassesDropdown] = useState(false);

  // Allowed student modal filter states and flag to indicate which form is active.
  const [studentNameSearch, setStudentNameSearch] = useState("");
  const [studentEmailSearch, setStudentEmailSearch] = useState("");
  const [studentSapSearch, setStudentSapSearch] = useState("");
  // When true, the modal is for update mode; when false, for upload mode.
  const [isUpdateStudentModal, setIsUpdateStudentModal] = useState(false);

  // Initial data fetch
  useEffect(() => {
    fetchResources();
    fetchSubjects();
  }, []);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const { data } = await axios.get(`${BASE_URL}/api/resources/teacher`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResources(data);
    } catch (err) {
      setError("Failed to fetch resources");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.get(`${BASE_URL}/api/subjects/teacher`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubjects(data);
    } catch (err) {
      setError("Failed to fetch subjects");
    }
  };

  // Resource filtering remains unchanged.
  const filteredResources = resources.filter((resource) => {
    return (
      (!filters.filename ||
        resource.filename.toLowerCase().includes(filters.filename.toLowerCase())) &&
      (!filters.description ||
        resource.description.toLowerCase().includes(filters.description.toLowerCase())) &&
      (!filters.subject || resource.subject._id === filters.subject) &&
      (!filters.class || resource.classes.some((cls) => cls._id === filters.class)) &&
      (!filters.visibility || resource.visibility === filters.visibility)
    );
  });

  // --- UPLOAD HANDLERS ---

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file || !uploadForm.subject || uploadForm.classes.length === 0) {
      setError("Please fill all required fields in the upload form.");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", uploadForm.file);
      formData.append("subject", uploadForm.subject);
      formData.append("classes", JSON.stringify(uploadForm.classes));
      formData.append("description", uploadForm.description);
      formData.append("visibility", uploadForm.visibility);
      if (uploadForm.visibility === "restricted") {
        formData.append("students", JSON.stringify(uploadForm.allowedStudents));
      }
      const token = localStorage.getItem("token");
      await axios.post(`${BASE_URL}/api/resources/upload`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowUploadModal(false);
      setUploadForm({
        file: null,
        subject: "",
        classes: [],
        description: "",
        visibility: "restricted",
        allowedStudents: [],
      });
      fetchResources();
    } catch (err) {
      setError("Failed to upload resource");
    }
  };

  // When a subject is selected, fetch classes and update the corresponding form.
  // In update mode, preselected classes can be passed as the third parameter.
  const handleSubjectChange = async (subjectId: string, isUpdate = false, preselectedClasses?: string[]) => {
    try {
      if (isUpdate) {
        setUpdateForm((prev) => ({ ...prev, subject: subjectId, classes: preselectedClasses || [] }));
      } else {
        setUploadForm((prev) => ({ ...prev, subject: subjectId, classes: [] }));
      }
      const token = localStorage.getItem("token");
      const { data } = await axios.get(`${BASE_URL}/api/subjects/classes/${subjectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClasses(Array.isArray(data) ? data : [data]);
    } catch (err) {
      setError("Failed to fetch classes");
    }
  };

  // Toggle class selection in upload or update form.
  const toggleClassSelection = (classId: string, isUpdate = false) => {
    if (isUpdate) {
      setUpdateForm((prev) => ({
        ...prev,
        classes: prev.classes.includes(classId)
          ? prev.classes.filter((id) => id !== classId)
          : [...prev.classes, classId],
      }));
    } else {
      setUploadForm((prev) => ({
        ...prev,
        classes: prev.classes.includes(classId)
          ? prev.classes.filter((id) => id !== classId)
          : [...prev.classes, classId],
      }));
    }
  };

  const selectAllClasses = (isUpdate = false) => {
    const allIds = classes.map((c) => c._id);
    if (isUpdate) {
      setUpdateForm((prev) => ({ ...prev, classes: allIds }));
    } else {
      setUploadForm((prev) => ({ ...prev, classes: allIds }));
    }
  };

  const clearAllClasses = (isUpdate = false) => {
    if (isUpdate) {
      setUpdateForm((prev) => ({ ...prev, classes: [] }));
    } else {
      setUploadForm((prev) => ({ ...prev, classes: [] }));
    }
  };

  // For upload mode: when visibility is restricted and classes are selected, fetch allowed students.
  const fetchUploadStudents = async () => {
    if (uploadForm.visibility !== "restricted" || uploadForm.classes.length === 0) return;
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.get(
        `${BASE_URL}/api/student?classIds=${uploadForm.classes.join(",")}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStudents(data);
    } catch (err) {
      console.error("Error fetching students", err);
    }
  };

  useEffect(() => {
    if (uploadForm.visibility === "restricted" && uploadForm.classes.length > 0) {
      fetchUploadStudents();
    }
  }, [uploadForm.visibility, uploadForm.classes]);

  const toggleUploadStudentSelection = (studentId: string) => {
    setUploadForm((prev) => ({
      ...prev,
      allowedStudents: prev.allowedStudents.includes(studentId)
        ? prev.allowedStudents.filter((id) => id !== studentId)
        : [...prev.allowedStudents, studentId],
    }));
  };

  // For update mode: fetch allowed students based on the resource's classes.
  const fetchUpdateStudents = async (resource: Resource) => {
    try {
      const token = localStorage.getItem("token");
      const classIds = resource.classes.map((cls) => cls._id).join(",");
      const { data } = await axios.get(
        `${BASE_URL}/api/student?classIds=${classIds}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUpdateStudents(data);
    } catch (err) {
      console.error("Error fetching update students:", err);
    }
  };

  // In update mode, toggle allowed student selection.
  const toggleUpdateStudentSelection = (studentId: string) => {
    setUpdateForm((prev) => ({
      ...prev,
      allowedStudents: prev.allowedStudents.includes(studentId)
        ? prev.allowedStudents.filter((id) => id !== studentId)
        : [...prev.allowedStudents, studentId],
    }));
  };

  // When opening the update modal, prefill the updateForm and fetch update students.
  const openUpdateModal = (resource: Resource) => {
    setSelectedResource(resource);
    setUpdateForm({
      subject: resource.subject._id,
      classes: resource.classes.map((c) => c._id),
      description: resource.description,
      visibility: resource.visibility,
      allowedStudents: resource.allowedStudents || [],
      file: null, // No new file by default.
    });
    // Pass the preselected classes so that the dropdown shows them.
    handleSubjectChange(resource.subject._id, true, resource.classes.map((c) => c._id));
    if (resource.visibility === "restricted") {
      fetchUpdateStudents(resource);
    }
    setShowUpdateModal(true);
  };

  // Use an effect to ensure that once updateStudents are fetched, the updateForm.allowedStudents reflects the preselected ones.
  useEffect(() => {
    if (selectedResource && selectedResource.visibility === "restricted" && updateStudents.length > 0) {
      // Here we assume resource.allowedStudents contains the IDs that should be preselected.
      setUpdateForm((prev) => ({
        ...prev,
        allowedStudents: prev.allowedStudents.filter((id) =>
          updateStudents.some((s) => s._id === id)
        ),
      }));
    }
  }, [updateStudents, selectedResource]);

  // File change handler for update form.
  const handleUpdateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUpdateForm((prev) => ({ ...prev, file: e.target.files[0] }));
    }
  };

  // Submit update form using FormData so that a new file (if provided) can be uploaded.
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResource) return;
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("subject", updateForm.subject);
      formData.append("classes", JSON.stringify(updateForm.classes));
      formData.append("description", updateForm.description);
      formData.append("visibility", updateForm.visibility);
      formData.append("allowedStudents", JSON.stringify(updateForm.allowedStudents));
      // If a new file is selected, append it.
      if (updateForm.file) {
        formData.append("file", updateForm.file);
      }
      const { data } = await axios.put(
        `${BASE_URL}/api/resources/edit/${selectedResource._id}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setResources((prev) =>
        prev.map((r) => (r._id === data.resource._id ? data.resource : r))
      );
      setShowUpdateModal(false);
      setSelectedResource(null);
      alert("Resource updated successfully!");
    } catch (err) {
      setError("Failed to update resource");
    }
  };

  // Delete resource handler.
  const confirmDelete = (resource: Resource) => {
    setSelectedResource(resource);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!selectedResource) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BASE_URL}/api/resources/delete/${selectedResource._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResources((prev) => prev.filter((r) => r._id !== selectedResource._id));
      setShowDeleteModal(false);
      setSelectedResource(null);
    } catch (err) {
      setError("Failed to delete resource");
    }
  };

  // Allowed Students Modal filtering – use updateStudents if in update mode; else use students.
  const filteredStudents = (isUpdateStudentModal ? updateStudents : students).filter(
    (student) => {
      const nameMatch =
        studentNameSearch.trim() === "" ||
        student.name.toLowerCase().includes(studentNameSearch.toLowerCase());
      const emailMatch =
        studentEmailSearch.trim() === "" ||
        student.email.toLowerCase().includes(studentEmailSearch.toLowerCase());
      const sapMatch =
        studentSapSearch.trim() === "" ||
        (student.sap_id && student.sap_id.toString().includes(studentSapSearch));
      return nameMatch && emailMatch && sapMatch;
    }
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Teaching Resources</h1>
        <div className="flex gap-3 mt-4 md:mt-0">
        <button
  onClick={() => setShowFilters(!showFilters)}
  className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
>
  {showFilters ? "Hide Filters" : "Show Filters"}
</button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-indigo-700"
          >
            <Upload size={18} /> Upload Resource
          </button>
        </div>
      </div>
      {showFilters && (
  <div className="bg-white p-4 rounded shadow-md grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    <input
      type="text"
      placeholder="Filter by filename"
      className="p-2 border rounded"
      value={filters.filename}
      onChange={(e) => setFilters({ ...filters, filename: e.target.value })}
    />
    <input
      type="text"
      placeholder="Filter by description"
      className="p-2 border rounded"
      value={filters.description}
      onChange={(e) =>
        setFilters({ ...filters, description: e.target.value })
      }
    />
    <select
      className="p-2 border rounded"
      value={filters.subject}
      onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
    >
      <option value="">All Subjects</option>
      {subjects.map((subject) => (
        <option key={subject._id} value={subject._id}>
          {subject.subject_name}
        </option>
      ))}
    </select>
    <select
      className="p-2 border rounded"
      value={filters.visibility}
      onChange={(e) => setFilters({ ...filters, visibility: e.target.value })}
    >
      <option value="">All Visibility</option>
      <option value="public">Public</option>
      <option value="restricted">Restricted</option>
    </select>
    <button
      onClick={() =>
        setFilters({
          filename: "",
          description: "",
          subject: "",
          class: "",
          visibility: "",
        })
      }
      className="flex items-center gap-2 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
    >
      <XCircle size={18} /> Clear Filters
    </button>
  </div>
)}

      {/* Resource List */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Filename &amp; Description</th>
              <th className="p-3 text-left">Subject</th>
              <th className="p-3 text-left">Classes</th>
              <th className="p-3 text-left">Visibility</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-blue-500">
                  Loading resources...
                </td>
              </tr>
            ) : filteredResources.length > 0 ? (
              filteredResources.map((resource) => (
                <tr key={resource._id} className="border-t hover:bg-gray-50">
                  <td className="p-3">
                    <div className="font-medium">{resource.filename}</div>
                    <div className="text-sm text-gray-600">{resource.description}</div>
                  </td>
                  <td className="p-3">{resource.subject.subject_name}</td>
                  <td className="p-3">
                    {resource.classes.map((cls) => (
                      <div key={cls._id}>
                        {cls.course} ({cls.specialization})
                      </div>
                    ))}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded ${resource.visibility === "public" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}>
                      {resource.visibility}
                    </span>
                  </td>
                  <td className="p-3">
                    {new Date(resource.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 flex gap-2">
                    <a
                      href={`${BASE_URL}/api/resources/download/${resource.file_id}`}
                      target="_blank"
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <Download size={18} />
                    </a>
                    <button
                      onClick={() => openUpdateModal(resource)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => confirmDelete(resource)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash size={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  No resources found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start pt-10 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Upload New Resource</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Subject:</label>
                <select
                  value={uploadForm.subject}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="">Select Subject</option>
                  {subjects.map((subject) => (
                    <option key={subject._id} value={subject._id}>
                      {subject.subject_name}
                    </option>
                  ))}
                </select>
              </div>
              {/* Classes */}
              {uploadForm.subject && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Select Classes:</p>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowClassesDropdown(!showClassesDropdown)}
                      className="w-full border p-2 rounded flex justify-between items-center"
                    >
                      <span>
                        {uploadForm.classes.length > 0
                          ? classes
                              .filter((c) => uploadForm.classes.includes(c._id))
                              .map((c) => `${c.course} (${c.specialization})`)
                              .join(", ")
                          : "Select Classes"}
                      </span>
                      <span>▼</span>
                    </button>
                    {showClassesDropdown && (
                      <div className="absolute mt-1 w-full border rounded bg-white z-10 max-h-60 overflow-y-auto">
                        {classes.map((cls) => (
                          <label key={cls._id} className="flex items-center p-2 hover:bg-gray-100">
                            <input
                              type="checkbox"
                              value={cls._id}
                              checked={uploadForm.classes.includes(cls._id)}
                              onChange={() => toggleClassSelection(cls._id)}
                              className="mr-2"
                            />
                            {cls.course} ({cls.specialization})
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2 mt-2">
                    <button type="button" onClick={() => selectAllClasses()} className="px-3 py-1 bg-gray-200 rounded">
                      Select All Classes
                    </button>
                    <button type="button" onClick={() => clearAllClasses()} className="px-3 py-1 bg-gray-200 rounded">
                      Clear All Classes
                    </button>
                  </div>
                </div>
              )}
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Upload File:</label>
                <input
                  type="file"
                  onChange={(e) =>
                    setUploadForm({
                      ...uploadForm,
                      file: e.target.files?.[0] || null,
                    })
                  }
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Description:</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              {/* Visibility */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Visibility:</label>
                <select
                  value={uploadForm.visibility}
                  onChange={(e) => {
                    setUploadForm({ ...uploadForm, visibility: e.target.value });
                    if (e.target.value === "restricted") {
                      fetchUploadStudents();
                    }
                  }}
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                >
                  <option value="restricted">Restricted</option>
                  <option value="public">Public</option>
                </select>
              </div>
              {/* Allowed Students */}
              {uploadForm.visibility === "restricted" && uploadForm.subject && (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUpdateStudentModal(false);
                      setShowStudentModal(true);
                    }}
                    className="px-3 py-2 bg-indigo-600 text-white rounded"
                  >
                    Select Allowed Students
                  </button>
                  {uploadForm.allowedStudents.length > 0 && (
                    <div className="mt-2 text-sm text-gray-700">
                      Selected Students: {uploadForm.allowedStudents.join(", ")}
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Modal */}
      {showUpdateModal && selectedResource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start pt-10 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Update Resource</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Subject:</label>
                <select
                  value={updateForm.subject}
                  onChange={(e) => handleSubjectChange(e.target.value, true, updateForm.classes)}
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="">Select Subject</option>
                  {subjects.map((subject) => (
                    <option key={subject._id} value={subject._id}>
                      {subject.subject_name}
                    </option>
                  ))}
                </select>
              </div>
              {/* Classes */}
              {updateForm.subject && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Select Classes:</p>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowClassesDropdown(!showClassesDropdown)}
                      className="w-full border p-2 rounded flex justify-between items-center"
                    >
                      <span>
                        {updateForm.classes.length > 0
                          ? classes
                              .filter((c) => updateForm.classes.includes(c._id))
                              .map((c) => `${c.course} (${c.specialization})`)
                              .join(", ")
                          : "Select Classes"}
                      </span>
                      <span>▼</span>
                    </button>
                    {showClassesDropdown && (
                      <div className="absolute mt-1 w-full border rounded bg-white z-10 max-h-60 overflow-y-auto">
                        {classes.map((cls) => (
                          <label key={cls._id} className="flex items-center p-2 hover:bg-gray-100">
                            <input
                              type="checkbox"
                              value={cls._id}
                              checked={updateForm.classes.includes(cls._id)}
                              onChange={() => toggleClassSelection(cls._id, true)}
                              className="mr-2"
                            />
                            {cls.course} ({cls.specialization})
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2 mt-2">
                    <button type="button" onClick={() => selectAllClasses(true)} className="px-3 py-1 bg-gray-200 rounded">
                      Select All Classes
                    </button>
                    <button type="button" onClick={() => clearAllClasses(true)} className="px-3 py-1 bg-gray-200 rounded">
                      Clear All Classes
                    </button>
                  </div>
                </div>
              )}
              {/* Update File Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Update File (optional):</label>
                <input
                  type="file"
                  onChange={handleUpdateFileChange}
                  className="mt-1 block w-full border rounded-md"
                />
              </div>
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Description:</label>
                <textarea
                  value={updateForm.description}
                  onChange={(e) => setUpdateForm({ ...updateForm, description: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              {/* Visibility */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Visibility:</label>
                <select
                  value={updateForm.visibility}
                  onChange={(e) => setUpdateForm({ ...updateForm, visibility: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                >
                  <option value="restricted">Restricted</option>
                  <option value="public">Public</option>
                </select>
              </div>
              {/* Allowed Students */}
              {updateForm.visibility === "restricted" && updateForm.subject && (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUpdateStudentModal(true);
                      setShowStudentModal(true);
                    }}
                    className="px-3 py-2 bg-indigo-600 text-white rounded"
                  >
                    Select Allowed Students
                  </button>
                  {updateForm.allowedStudents.length > 0 && (
                    <div className="mt-2 text-sm text-gray-700">
                      Selected Students: {updateForm.allowedStudents.join(", ")}
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowUpdateModal(false);
                    setSelectedResource(null);
                  }}
                  className="px-4 py-2 bg-gray-300 rounded"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedResource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Are you sure?</h2>
            <div className="space-y-2">
              <p>
                <strong>Filename:</strong> {selectedResource.filename}
              </p>
              <p>
                <strong>Subject:</strong> {selectedResource.subject.subject_name}
              </p>
              <p>
                <strong>Visibility:</strong> {selectedResource.visibility}
              </p>
              <p>
                <strong>Upload Date:</strong>{" "}
                {new Date(selectedResource.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedResource(null);
                }}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Allowed Students Selection Modal */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg relative">
            <button
              onClick={() => setShowStudentModal(false)}
              className="absolute top-2 right-3 text-gray-600 hover:text-gray-900 text-xl"
            >
              ❌
            </button>
            <h2 className="text-lg font-semibold mb-2">Select Students</h2>
            <div className="flex items-center mb-3">
              <button
                type="button"
                onClick={() => setShowStudentFilters((prev) => !prev)}
                className={`px-3 py-2 rounded-md w-full transition-colors ${
                  showStudentFilters
                    ? "border border-indigo-600 bg-white text-indigo-600"
                    : "bg-gray-400 text-white hover:bg-gray-600"
                }`}
              >
                {showStudentFilters ? "Hide Filters" : "Show Filters"}
              </button>
              {showStudentFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setStudentNameSearch("");
                    setStudentEmailSearch("");
                    setStudentSapSearch("");
                  }}
                  className="ml-2 px-3 py-2 rounded-md bg-red-500 text-white"
                >
                  Clear All
                </button>
              )}
            </div>
            {showStudentFilters && (
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
                  value={studentSapSearch}
                  onChange={(e) => setStudentSapSearch(e.target.value)}
                />
              </div>
            )}
            <ul className="max-h-60 overflow-y-auto border rounded">
              {(isUpdateStudentModal ? updateStudents : students)
                .filter((student) => {
                  const nameMatch =
                    studentNameSearch.trim() === "" ||
                    student.name.toLowerCase().includes(studentNameSearch.toLowerCase());
                  const emailMatch =
                    studentEmailSearch.trim() === "" ||
                    student.email.toLowerCase().includes(studentEmailSearch.toLowerCase());
                  const sapMatch =
                    studentSapSearch.trim() === "" ||
                    (student.sap_id && student.sap_id.toString().includes(studentSapSearch));
                  return nameMatch && emailMatch && sapMatch;
                })
                .map((student) => (
                  <li key={student._id} className="p-2 border-b flex justify-between items-center">
                    <span>
                      {student.name} ({student.email}) - SAP: {student.sap_id || "N/A"}
                    </span>
                    <input
                      type="checkbox"
                      checked={
                        isUpdateStudentModal
                          ? updateForm.allowedStudents.includes(student._id)
                          : uploadForm.allowedStudents.includes(student._id)
                      }
                      onChange={() =>
                        isUpdateStudentModal
                          ? toggleUpdateStudentSelection(student._id)
                          : toggleUploadStudentSelection(student._id)
                      }
                    />
                  </li>
                ))}
            </ul>
            <button
              onClick={() => setShowStudentModal(false)}
              className="mt-3 w-full bg-indigo-600 text-white p-2 rounded"
            >
              Confirm Selection
            </button>
          </div>
        </div>
      )}

      {error && <div className="text-red-500 text-center">{error}</div>}
    </div>
  );
};

export default TeacherResources;




// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import { Edit, Trash, Upload, XCircle, Download } from "lucide-react";

// const BASE_URL = "http://localhost:5001";

// interface ClassInfo {
//   _id: string;
//   course: string;
//   specialization: string;
// }

// interface SubjectInfo {
//   _id: string;
//   subject_name: string;
// }

// interface Resource {
//   _id: string;
//   filename: string;
//   file_id: string;
//   description: string;
//   visibility: string;
//   subject: SubjectInfo;
//   classes: ClassInfo[];
//   allowedStudents: string[];
//   createdAt: string;
// }

// interface Student {
//   _id: string;
//   name: string;
//   email: string;
//   sap_id?: number;
// }

// const TeacherResources = () => {
//   // Data states
//   const [resources, setResources] = useState<Resource[]>([]);
//   const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
//   const [classes, setClasses] = useState<ClassInfo[]>([]);
//   const [students, setStudents] = useState<Student[]>([]);

//   // Loading & error
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   // Modal & filter toggles
//   const [showFilters, setShowFilters] = useState(false);
//   const [showUploadModal, setShowUploadModal] = useState(false);
//   const [showUpdateModal, setShowUpdateModal] = useState(false);
//   const [showDeleteModal, setShowDeleteModal] = useState(false);

//   // Currently selected resource (for update or delete)
//   const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

//   // Filters state
//   const [filters, setFilters] = useState({
//     filename: "",
//     description: "",
//     subject: "",
//     class: "",
//     visibility: "",
//   });

//   // Upload form state
//   const [uploadForm, setUploadForm] = useState({
//     file: null as File | null,
//     subject: "",
//     classes: [] as string[],
//     description: "",
//     visibility: "restricted",
//     students: [] as string[],
//   });

//   // Update form state
//   const [updateDescription, setUpdateDescription] = useState("");
//   const [updateVisibility, setUpdateVisibility] = useState("restricted");
//   const [updateAllowedStudents, setUpdateAllowedStudents] = useState<string[]>([]);
//   const [updateStudents, setUpdateStudents] = useState<Student[]>([]);
//   const [studentSearch, setStudentSearch] = useState("");

//   // Initial data fetch
//   useEffect(() => {
//     fetchResources();
//     fetchSubjects();
//   }, []);

//   const fetchResources = async () => {
//     try {
//       setLoading(true);
//       const token = localStorage.getItem("token");
//       const { data } = await axios.get(`${BASE_URL}/api/resources/teacher`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setResources(data);
//     } catch (err) {
//       setError("Failed to fetch resources");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchSubjects = async () => {
//     try {
//       const token = localStorage.getItem("token");
//       const { data } = await axios.get(`${BASE_URL}/api/subjects/teacher`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setSubjects(data);
//     } catch (err) {
//       setError("Failed to fetch subjects");
//     }
//   };

//   // Filter resources based on search criteria
//   const filteredResources = resources.filter((resource) => {
//     return (
//       (!filters.filename ||
//         resource.filename.toLowerCase().includes(filters.filename.toLowerCase())) &&
//       (!filters.description ||
//         resource.description.toLowerCase().includes(filters.description.toLowerCase())) &&
//       (!filters.subject || resource.subject._id === filters.subject) &&
//       (!filters.class || resource.classes.some((cls) => cls._id === filters.class)) &&
//       (!filters.visibility || resource.visibility === filters.visibility)
//     );
//   });

//   // --- UPLOAD HANDLERS ---

//   const handleUpload = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!uploadForm.file || !uploadForm.subject || uploadForm.classes.length === 0) {
//       setError("All fields are required.");
//       return;
//     }
//     try {
//       const formData = new FormData();
//       formData.append("file", uploadForm.file);
//       formData.append("subject", uploadForm.subject);
//       formData.append("classes", JSON.stringify(uploadForm.classes));
//       formData.append("description", uploadForm.description);
//       formData.append("visibility", uploadForm.visibility);
//       if (uploadForm.visibility === "restricted") {
//         formData.append("students", JSON.stringify(uploadForm.students));
//       }
//       const token = localStorage.getItem("token");
//       await axios.post(`${BASE_URL}/api/resources/upload`, formData, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setShowUploadModal(false);
//       setUploadForm({
//         file: null,
//         subject: "",
//         classes: [],
//         description: "",
//         visibility: "restricted",
//         students: [],
//       });
//       fetchResources();
//     } catch (err) {
//       setError("Failed to upload resource");
//     }
//   };

//   const handleSubjectChange = async (subjectId: string) => {
//     try {
//       setUploadForm((prev) => ({ ...prev, subject: subjectId }));
//       setClasses([]);
//       setUploadForm((prev) => ({ ...prev, classes: [] }));
//       const token = localStorage.getItem("token");
//       const { data } = await axios.get(`${BASE_URL}/api/subjects/classes/${subjectId}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setClasses(Array.isArray(data) ? data : [data]);
//     } catch (err) {
//       setError("Failed to fetch classes");
//     }
//   };

//   const toggleUploadClassSelection = (classId: string) => {
//     setUploadForm((prev) => ({
//       ...prev,
//       classes: prev.classes.includes(classId)
//         ? prev.classes.filter((id) => id !== classId)
//         : [...prev.classes, classId],
//     }));
//   };

//   const fetchUploadStudents = async () => {
//     if (uploadForm.visibility !== "restricted" || uploadForm.classes.length === 0) return;
//     try {
//       const token = localStorage.getItem("token");
//       const { data } = await axios.get(
//         `${BASE_URL}/api/student?classIds=${uploadForm.classes.join(",")}`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       setStudents(data);
//     } catch (err) {
//       console.error("Error fetching students", err);
//     }
//   };

//   useEffect(() => {
//     if (uploadForm.visibility === "restricted" && uploadForm.classes.length > 0) {
//       fetchUploadStudents();
//     }
//   }, [uploadForm.visibility, uploadForm.classes]);

//   const toggleUploadStudentSelection = (studentId: string) => {
//     setUploadForm((prev) => ({
//       ...prev,
//       students: prev.students.includes(studentId)
//         ? prev.students.filter((id) => id !== studentId)
//         : [...prev.students, studentId],
//     }));
//   };

//   // --- DELETE HANDLERS ---

//   const confirmDelete = (resource: Resource) => {
//     setSelectedResource(resource);
//     setShowDeleteModal(true);
//   };

//   const handleDelete = async () => {
//     if (!selectedResource) return;
//     try {
//       const token = localStorage.getItem("token");
//       await axios.delete(`${BASE_URL}/api/resources/delete/${selectedResource._id}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setResources((prev) =>
//         prev.filter((r) => r._id !== selectedResource._id)
//       );
//       setShowDeleteModal(false);
//       setSelectedResource(null);
//     } catch (err) {
//       setError("Failed to delete resource");
//     }
//   };

//   // --- UPDATE HANDLERS ---

//   const handleUpdateClick = (resource: Resource) => {
//     setSelectedResource(resource);
//     setUpdateDescription(resource.description);
//     setUpdateVisibility(resource.visibility);
//     setUpdateAllowedStudents(resource.allowedStudents || []);
//     if (resource.visibility === "restricted") {
//       fetchUpdateStudents(resource);
//     }
//     setShowUpdateModal(true);
//   };

//   const fetchUpdateStudents = async (resource: Resource) => {
//     try {
//       const token = localStorage.getItem("token");
//       const classIds = resource.classes.map((cls) => cls._id).join(",");
//       const { data } = await axios.get(
//         `${BASE_URL}/api/student?classIds=${classIds}`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       setUpdateStudents(data);
//     } catch (err) {
//       console.error("Error fetching update students:", err);
//     }
//   };

//   const toggleUpdateStudentSelection = (studentId: string) => {
//     setUpdateAllowedStudents((prev) =>
//       prev.includes(studentId)
//         ? prev.filter((id) => id !== studentId)
//         : [...prev, studentId]
//     );
//   };

//   const handleUpdateSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!selectedResource) return;
//     try {
//       setLoading(true);
//       const token = localStorage.getItem("token");
//       const payload = {
//         description: updateDescription,
//         visibility: updateVisibility,
//         allowedStudents:
//           updateVisibility === "restricted" ? updateAllowedStudents : [],
//       };
//       const { data } = await axios.put(
//         `${BASE_URL}/api/resources/edit/${selectedResource._id}`,
//         payload,
//         {
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${token}`,
//           },
//         }
//       );
//       setResources((prev) =>
//         prev.map((res) =>
//           res._id === data.resource._id ? data.resource : res
//         )
//       );
//       setShowUpdateModal(false);
//       setSelectedResource(null);
//       alert("Resource updated successfully!");
//     } catch (err) {
//       setError("Failed to update resource");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="p-6 bg-gray-50 min-h-screen space-y-6">
//       {/* Header */}
//       <div className="flex flex-col md:flex-row justify-between items-center">
//         <h1 className="text-2xl font-bold text-gray-800">Teaching Resources</h1>
//         <div className="flex gap-3 mt-4 md:mt-0">
//           <button
//             onClick={() => setShowFilters(!showFilters)}
//             className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
//           >
//             {showFilters ? "Hide Filters" : "Show Filters"}
//           </button>
//           <button
//             onClick={() => setShowUploadModal(true)}
//             className="bg-indigo-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-indigo-700"
//           >
//             <Upload size={18} /> Upload Resource
//           </button>
//         </div>
//       </div>

//       {/* Filters */}
//       {showFilters && (
//         <div className="bg-white p-4 rounded shadow-md grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
//           <input
//             type="text"
//             placeholder="Filter by filename"
//             className="p-2 border rounded"
//             value={filters.filename}
//             onChange={(e) =>
//               setFilters({ ...filters, filename: e.target.value })
//             }
//           />
//           <input
//             type="text"
//             placeholder="Filter by description"
//             className="p-2 border rounded"
//             value={filters.description}
//             onChange={(e) =>
//               setFilters({ ...filters, description: e.target.value })
//             }
//           />
//           <select
//             className="p-2 border rounded"
//             value={filters.subject}
//             onChange={(e) =>
//               setFilters({ ...filters, subject: e.target.value })
//             }
//           >
//             <option value="">All Subjects</option>
//             {subjects.map((subject) => (
//               <option key={subject._id} value={subject._id}>
//                 {subject.subject_name}
//               </option>
//             ))}
//           </select>
//           <select
//             className="p-2 border rounded"
//             value={filters.visibility}
//             onChange={(e) =>
//               setFilters({ ...filters, visibility: e.target.value })
//             }
//           >
//             <option value="">All Visibility</option>
//             <option value="public">Public</option>
//             <option value="restricted">Restricted</option>
//           </select>
//           <button
//             onClick={() =>
//               setFilters({
//                 filename: "",
//                 description: "",
//                 subject: "",
//                 class: "",
//                 visibility: "",
//               })
//             }
//             className="flex items-center gap-2 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
//           >
//             <XCircle size={18} /> Clear Filters
//           </button>
//         </div>
//       )}

//       {/* Resource List */}
//       <div className="bg-white rounded-lg shadow overflow-x-auto">
//         <table className="min-w-full">
//           <thead className="bg-gray-50">
//             <tr>
//               <th className="p-3 text-left">Filename</th>
//               <th className="p-3 text-left">Subject</th>
//               <th className="p-3 text-left">Classes</th>
//               <th className="p-3 text-left">Visibility</th>
//               <th className="p-3 text-left">Date</th>
//               <th className="p-3 text-left">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {loading ? (
//               <tr>
//                 <td colSpan={6} className="p-4 text-center text-blue-500">
//                   Loading resources...
//                 </td>
//               </tr>
//             ) : filteredResources.length > 0 ? (
//               filteredResources.map((resource) => (
//                 <tr key={resource._id} className="border-t hover:bg-gray-50">
//                   <td className="p-3">{resource.filename}</td>
//                   <td className="p-3">{resource.subject.subject_name}</td>
//                   <td className="p-3">
//                     {resource.classes.map((cls) => (
//                       <div key={cls._id}>
//                         {cls.course} ({cls.specialization})
//                       </div>
//                     ))}
//                   </td>
//                   <td className="p-3">
//                     <span
//                       className={`px-2 py-1 rounded ${
//                         resource.visibility === "public"
//                           ? "bg-green-100 text-green-600"
//                           : "bg-yellow-100 text-yellow-600"
//                       }`}
//                     >
//                       {resource.visibility}
//                     </span>
//                   </td>
//                   <td className="p-3">
//                     {new Date(resource.createdAt).toLocaleDateString()}
//                   </td>
//                   <td className="p-3 flex gap-2">
//                     <a
//                       href={`${BASE_URL}/api/resources/download/${resource.file_id}`}
//                       target="_blank"
//                       className="text-indigo-600 hover:text-indigo-900"
//                     >
//                       <Download size={18} />
//                     </a>
//                     <button
//                       onClick={() => handleUpdateClick(resource)}
//                       className="text-blue-500 hover:text-blue-700"
//                     >
//                       <Edit size={18} />
//                     </button>
//                     <button
//                       onClick={() => confirmDelete(resource)}
//                       className="text-red-500 hover:text-red-700"
//                     >
//                       <Trash size={18} />
//                     </button>
//                   </td>
//                 </tr>
//               ))
//             ) : (
//               <tr>
//                 <td colSpan={6} className="p-4 text-center text-gray-500">
//                   No resources found
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* Upload Modal */}
//       {showUploadModal && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white p-6 rounded-lg w-full max-w-3xl">
//             <h2 className="text-xl font-bold mb-4">Upload New Resource</h2>
//             <form onSubmit={handleUpload} className="space-y-4">
//               <div>
//                 <label className="block font-medium">Select Subject:</label>
//                 <select
//                   onChange={(e) => handleSubjectChange(e.target.value)}
//                   className="w-full p-2 border rounded"
//                   value={uploadForm.subject}
//                   required
//                 >
//                   <option value="">Select Subject</option>
//                   {subjects.map((subject) => (
//                     <option key={subject._id} value={subject._id}>
//                       {subject.subject_name}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//               <div>
//                 <label className="block font-medium">Select Classes:</label>
//                 <div className="border rounded p-2 max-h-40 overflow-y-auto">
//                   {classes.map((cls) => (
//                     <label key={cls._id} className="flex items-center gap-2">
//                       <input
//                         type="checkbox"
//                         value={cls._id}
//                         checked={uploadForm.classes.includes(cls._id)}
//                         onChange={() => toggleUploadClassSelection(cls._id)}
//                       />
//                       {cls.course} - {cls.specialization}
//                     </label>
//                   ))}
//                 </div>
//               </div>
//               <div>
//                 <label className="block font-medium">Upload File:</label>
//                 <input
//                   type="file"
//                   onChange={(e) =>
//                     setUploadForm({
//                       ...uploadForm,
//                       file: e.target.files?.[0] || null,
//                     })
//                   }
//                   className="w-full p-2 border rounded"
//                   required
//                 />
//               </div>
//               <div>
//                 <label className="block font-medium">Description:</label>
//                 <textarea
//                   onChange={(e) =>
//                     setUploadForm({ ...uploadForm, description: e.target.value })
//                   }
//                   className="w-full p-2 border rounded"
//                   required
//                 ></textarea>
//               </div>
//               <div>
//                 <label className="block font-medium">Visibility:</label>
//                 <select
//                   onChange={(e) => {
//                     setUploadForm({ ...uploadForm, visibility: e.target.value });
//                     if (e.target.value === "restricted") fetchUploadStudents();
//                   }}
//                   className="w-full p-2 border rounded"
//                   value={uploadForm.visibility}
//                 >
//                   <option value="restricted">
//                     Restricted (Only Assigned Students)
//                   </option>
//                   <option value="public">Public (Visible to Everyone)</option>
//                 </select>
//               </div>
//               {uploadForm.visibility === "restricted" && (
//                 <div>
//                   <label className="block font-medium mb-1">
//                     Select Allowed Students:
//                   </label>
//                   <div className="border rounded p-2 max-h-40 overflow-y-auto bg-gray-50">
//                     {students.length > 0 ? (
//                       students.map((student) => (
//                         <label
//                           key={student._id}
//                           className="flex items-center gap-2"
//                         >
//                           <input
//                             type="checkbox"
//                             checked={uploadForm.students.includes(student._id)}
//                             onChange={() =>
//                               toggleUploadStudentSelection(student._id)
//                             }
//                           />
//                           {student.name} ({student.email})
//                         </label>
//                       ))
//                     ) : (
//                       <p className="text-gray-500 text-sm">
//                         No students available.
//                       </p>
//                     )}
//                   </div>
//                 </div>
//               )}
//               <div className="flex justify-end gap-3">
//                 <button
//                   type="button"
//                   onClick={() => setShowUploadModal(false)}
//                   className="px-4 py-2 bg-gray-300 rounded"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
//                 >
//                   Upload
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* Update Modal */}
//       {showUpdateModal && selectedResource && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white p-6 rounded-lg w-full max-w-md">
//             <h2 className="text-xl font-bold mb-4">Update Resource</h2>
//             <form onSubmit={handleUpdateSubmit} className="space-y-4">
//               <div>
//                 <label className="block font-medium">Description:</label>
//                 <textarea
//                   value={updateDescription}
//                   onChange={(e) => setUpdateDescription(e.target.value)}
//                   className="w-full p-2 border rounded"
//                   required
//                 />
//               </div>
//               <div>
//                 <label className="block font-medium">Visibility:</label>
//                 <select
//                   value={updateVisibility}
//                   onChange={(e) => {
//                     setUpdateVisibility(e.target.value);
//                     if (e.target.value === "restricted" && selectedResource) {
//                       fetchUpdateStudents(selectedResource);
//                     }
//                   }}
//                   className="w-full p-2 border rounded"
//                 >
//                   <option value="restricted">Restricted</option>
//                   <option value="public">Public</option>
//                 </select>
//               </div>
//               {updateVisibility === "restricted" && (
//                 <div>
//                   <label className="block font-medium mb-1">
//                     Select Allowed Students:
//                   </label>
//                   <input
//                     type="text"
//                     placeholder="Search..."
//                     className="w-full p-2 border rounded mb-2"
//                     value={studentSearch}
//                     onChange={(e) => setStudentSearch(e.target.value)}
//                   />
//                   <div className="border rounded p-2 max-h-40 overflow-y-auto bg-gray-50">
//                     {updateStudents
//                       .filter(
//                         (s) =>
//                           s.name
//                             .toLowerCase()
//                             .includes(studentSearch.toLowerCase()) ||
//                           s.email
//                             .toLowerCase()
//                             .includes(studentSearch.toLowerCase())
//                       )
//                       .map((student) => (
//                         <label
//                           key={student._id}
//                           className="flex items-center gap-2"
//                         >
//                           <input
//                             type="checkbox"
//                             checked={updateAllowedStudents.includes(student._id)}
//                             onChange={() =>
//                               toggleUpdateStudentSelection(student._id)
//                             }
//                           />
//                           {student.name} ({student.email})
//                         </label>
//                       ))}
//                     {updateStudents.length === 0 && (
//                       <p className="text-gray-500 text-sm">
//                         No students available.
//                       </p>
//                     )}
//                   </div>
//                 </div>
//               )}
//               <div className="flex justify-end gap-4">
//                 <button
//                   type="button"
//                   onClick={() => {
//                     setShowUpdateModal(false);
//                     setSelectedResource(null);
//                   }}
//                   className="px-4 py-2 bg-gray-300 rounded"
//                 >
//                   Cancel
//                 </button>
//                 <button type="submit" className="px-4 py-2 bg-yellow-600 text-white rounded">
//                   Update
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* Delete Confirmation Modal */}
//       {showDeleteModal && selectedResource && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white p-6 rounded-lg w-full max-w-md">
//             <h2 className="text-xl font-bold mb-4">Are you sure?</h2>
//             <div className="space-y-2">
//               <p>
//                 <strong>Filename:</strong> {selectedResource.filename}
//               </p>
//               <p>
//                 <strong>Subject:</strong> {selectedResource.subject.subject_name}
//               </p>
//               <p>
//                 <strong>Visibility:</strong> {selectedResource.visibility}
//               </p>
//               <p>
//                 <strong>Upload Date:</strong>{" "}
//                 {new Date(selectedResource.createdAt).toLocaleDateString()}
//               </p>
//             </div>
//             <div className="flex justify-end gap-3 mt-4">
//               <button
//                 onClick={() => {
//                   setShowDeleteModal(false);
//                   setSelectedResource(null);
//                 }}
//                 className="px-4 py-2 bg-gray-300 rounded"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={handleDelete}
//                 className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
//               >
//                 Delete
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {error && <div className="text-red-500 text-center">{error}</div>}
//     </div>
//   );
// };

// export default TeacherResources;
