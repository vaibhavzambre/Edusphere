// TeacherResources.tsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Edit, Trash, Upload, XCircle, Download } from "lucide-react";

const BASE_URL = "http://localhost:5001";

// Data Interfaces
interface ClassInfo {
  _id: string;
  course: string;
  specialization: string;
  commencement_year: number;
  class_code: number;
}

interface SubjectInfo {
  _id: string;
  subject_code: string;
  subject_name: string;
  class: ClassInfo; // populated reference
}

interface FileInfo {
  filename: string;
  file_id: string;
  contentType: string;
}

interface Resource {
  _id: string;
  files: FileInfo[];
  description: string;
  visibility: string;
  subject: SubjectInfo;
  class: ClassInfo;
  createdAt: string;
}

// Generic Option type for dropdowns.
interface Option {
  _id: string; // For subjects: our mapping key; for classes: the actual class _id.
  label: string;
  value?: string;
}

// Helper: represent a class as a string.
const classToString = (cls: ClassInfo): string =>
  `${cls.course} - ${cls.specialization} - ${cls.commencement_year} - ${cls.class_code}`;

// Helper function to derive the mapping key for a given subject _id.
const getMappingKeyForSubject = (
  subjectId: string,
  mapping: { [key: string]: { subject: { _id: string } } }
): string => {
  for (const key in mapping) {
    if (mapping[key].subject._id === subjectId) {
      return key;
    }
  }
  return "";
};

// Reusable searchable dropdown component with a clear selection button.
const SearchableDropdown = <T extends Option>({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: T[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
}) => {
  const validOptions = Array.isArray(options) ? options : [];
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = validOptions.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );
  const selectedOption = validOptions.find((opt) => opt._id === value);

  return (
    <div className="relative" ref={ref}>
      <div
        className="border rounded px-3 py-2 cursor-pointer flex justify-between items-center"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        {selectedOption && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="text-red-500 ml-2"
          >
            ×
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow">
          <input
            type="text"
            placeholder="Search..."
            className="w-full p-2 border-b"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ul className="max-h-60 overflow-y-auto">
            <li
              onClick={() => {
                onChange("");
                setOpen(false);
                setSearch("");
              }}
              className="p-2 hover:bg-gray-200 cursor-pointer text-gray-600"
            >
              Clear Selection
            </li>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <li
                  key={option._id}
                  onClick={() => {
                    onChange(option._id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="p-2 hover:bg-gray-200 cursor-pointer"
                >
                  {option.label}
                </li>
              ))
            ) : (
              <li className="p-2 text-gray-500">No options found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

const TeacherResources = () => {
  // Fetched data.
  const [resources, setResources] = useState<Resource[]>([]);
  const [allSubjects, setAllSubjects] = useState<SubjectInfo[]>([]);
  // Mapping: key = lower-case "subject_code - subject_name"
  // Value: { subject: { _id, subject_code, subject_name }, classes: ClassInfo[] }
  const [subjectMapping, setSubjectMapping] = useState<{
    [key: string]: { subject: { _id: string; subject_code: string; subject_name: string }; classes: ClassInfo[] };
  }>({});

  // Dropdown options used in upload/update modals (unchanged).
  const [subjectOptions, setSubjectOptions] = useState<Option[]>([]);
  const [classOptions, setClassOptions] = useState<Option[]>([]);

  // Other UI states.
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Modal and form states.
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadResource, setDownloadResource] = useState<Resource | null>(null);
  const [selectedDownloadFiles, setSelectedDownloadFiles] = useState<Set<string>>(new Set());
  const [downloadOption, setDownloadOption] = useState<"all" | "selected" | null>(null);

  // Filters for resource listing.
  const [filters, setFilters] = useState({
    filename: "",
    description: "",
    subject: "",
    class: "",
    visibility: "",
  });

  // Upload form state.
  const [uploadForm, setUploadForm] = useState({
    files: [] as File[],
    subject: "",
    class: "",
    description: "",
    visibility: "private",
  });

  // Update form state.
  const [updateForm, setUpdateForm] = useState<{
    subject: string;
    class: string;
    description: string;
    visibility: string;
    files: File[];
    existingFiles: FileInfo[];
    removedFiles: string[];
  }>({
    subject: "",
    class: "",
    description: "",
    visibility: "private",
    files: [],
    existingFiles: [],
    removedFiles: [],
  });

  useEffect(() => {
    fetchResources();
    fetchTeacherSubjects();
  }, []);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const { data } = await axios.get(`${BASE_URL}/api/resources/teacher`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResources(data);
    } catch (err: any) {
      console.error("Error fetching resources:", err);
      setError(`Failed to fetch resources: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherSubjects = async () => {
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.get(`${BASE_URL}/api/teacher/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAllSubjects(data);
      buildSubjectMapping(data);
    } catch (err: any) {
      console.error("Error fetching subjects:", err);
      setError(`Failed to fetch subjects: ${err.message}`);
    }
  };

  // Build mapping from subject content (lower-case "subject_code - subject_name")
  // to { subject: { _id, subject_code, subject_name }, classes: ClassInfo[] }
  const buildSubjectMapping = (subjects: SubjectInfo[]) => {
    const mapping: {
      [key: string]: { subject: { _id: string; subject_code: string; subject_name: string }; classes: ClassInfo[] };
    } = {};
    subjects.forEach((sub) => {
      const key = `${sub.subject_code} - ${sub.subject_name}`.toLowerCase();
      if (!sub.class) return;
      if (!mapping[key]) {
        mapping[key] = {
          subject: { _id: sub._id, subject_code: sub.subject_code, subject_name: sub.subject_name },
          classes: [sub.class],
        };
      } else {
        if (!mapping[key].classes.some((cls) => cls._id === sub.class._id)) {
          mapping[key].classes.push(sub.class);
        }
      }
    });
    setSubjectMapping(mapping);
    const subjOpts: Option[] = Object.keys(mapping).map((key) => ({
      _id: key,
      label: mapping[key].subject.subject_code + " - " + mapping[key].subject.subject_name,
    }));
    setSubjectOptions(subjOpts);
    // Build initial class options from all subjects.
    const clsMap = new Map<string, ClassInfo>();
    subjects.forEach((sub) => {
      if (sub.class && !clsMap.has(sub.class._id)) {
        clsMap.set(sub.class._id, sub.class);
      }
    });
    const clsOpts: Option[] = [];
    clsMap.forEach((cls) => {
      clsOpts.push({ _id: cls._id, label: classToString(cls) });
    });
    setClassOptions(clsOpts);
  };

  // --- Functions for Upload/Update Modal (Unchanged for Upload) ---

  // When a subject is selected in the Upload modal.
  const handleSubjectSelect = (subjectKey: string) => {
    if (subjectKey === "") {
      setUploadForm((prev) => ({ ...prev, subject: "" }));
      return;
    }
    const mappingEntry = subjectMapping[subjectKey];
    if (mappingEntry) {
      setUploadForm((prev) => ({ ...prev, subject: mappingEntry.subject._id }));
      // Also update class options to those associated with the selected subject.
      const opts: Option[] = mappingEntry.classes.map((cls) => ({
        _id: cls._id,
        label: classToString(cls),
      }));
      setClassOptions(opts);
      if (uploadForm.class && !mappingEntry.classes.some((cls) => cls._id === uploadForm.class)) {
        setUploadForm((prev) => ({ ...prev, class: "" }));
      }
    }
  };

  // For update mode, use a dedicated function.
  const handleSubjectSelectUpdate = (subjectKey: string) => {
    if (subjectKey === "") {
      setUpdateForm((prev) => ({ ...prev, subject: "" }));
      return;
    }
    const mappingEntry = subjectMapping[subjectKey];
    if (mappingEntry) {
      setUpdateForm((prev) => ({ ...prev, subject: mappingEntry.subject._id }));
      // Update class options for update modal.
      const opts: Option[] = mappingEntry.classes.map((cls) => ({
        _id: cls._id,
        label: classToString(cls),
      }));
      setClassOptions(opts);
    }
  };

  // When a class is selected in either modal.
  const handleClassSelect = (classId: string) => {
    if (classId === "") {
      setUploadForm((prev) => ({ ...prev, class: "" }));
      return;
    }
    setUploadForm((prev) => ({ ...prev, class: classId }));
    // When a class is selected, update subject options for filters later.
    const filteredKeys = Object.keys(subjectMapping).filter((key) =>
      subjectMapping[key].classes.some((cls) => cls._id === classId)
    );
    const subjOpts: Option[] = filteredKeys.map((key) => ({
      _id: key,
      label: subjectMapping[key].subject.subject_code + " - " + subjectMapping[key].subject.subject_name,
    }));
    setSubjectOptions(subjOpts);
  };

  // When a class is selected in update modal.
  const handleClassSelectUpdate = (classId: string) => {
    if (classId === "") {
      setUpdateForm((prev) => ({ ...prev, class: "" }));
      return;
    }
    setUpdateForm((prev) => ({ ...prev, class: classId }));
    const filteredKeys = Object.keys(subjectMapping).filter((key) =>
      subjectMapping[key].classes.some((cls) => cls._id === classId)
    );
    const subjOpts: Option[] = filteredKeys.map((key) => ({
      _id: key,
      label: subjectMapping[key].subject.subject_code + " - " + subjectMapping[key].subject.subject_name,
    }));
    setSubjectOptions(subjOpts);
    if (!filteredKeys.includes(updateForm.subject)) {
      setUpdateForm((prev) => ({ ...prev, subject: "" }));
    }
  };

  // --- Dynamic Filter Dropdown Options for Filter Section ---

  const getFilterSubjectOptions = () => {
    if (filters.class) {
      const unique = new Map<string, Option>();
      allSubjects.forEach((sub) => {
        if (sub.class && sub.class._id === filters.class) {
          const key = `${sub.subject_code} - ${sub.subject_name}`.toLowerCase();
          if (!unique.has(key)) {
            unique.set(key, { _id: key, label: `${sub.subject_code} - ${sub.subject_name}` });
          }
        }
      });
      return Array.from(unique.values());
    } else {
      const unique = new Map<string, Option>();
      allSubjects.forEach((sub) => {
        if (sub.class) {
          const key = `${sub.subject_code} - ${sub.subject_name}`.toLowerCase();
          if (!unique.has(key)) {
            unique.set(key, { _id: key, label: `${sub.subject_code} - ${sub.subject_name}` });
          }
        }
      });
      return Array.from(unique.values());
    }
  };

  const getFilterClassOptions = () => {
    if (filters.subject) {
      const mappingEntry = subjectMapping[filters.subject];
      if (mappingEntry) {
        return mappingEntry.classes.map((cls) => ({
          _id: cls._id,
          label: classToString(cls),
        }));
      }
      return [];
    } else {
      const unique = new Map<string, Option>();
      allSubjects.forEach((sub) => {
        if (sub.class && !unique.has(sub.class._id)) {
          unique.set(sub.class._id, { _id: sub.class._id, label: classToString(sub.class) });
        }
      });
      return Array.from(unique.values());
    }
  };

  // --- Filtering Resources ---
  const filteredResources = resources.filter((resource) => {
    return (
      (!filters.filename ||
        resource.files.some((file) =>
          file.filename.toLowerCase().includes(filters.filename.toLowerCase())
        )) &&
      (!filters.description ||
        resource.description.toLowerCase().includes(filters.description.toLowerCase())) &&
      (!filters.subject ||
        getMappingKeyForSubject(resource.subject._id, subjectMapping) === filters.subject) &&
      (!filters.class || resource.class._id === filters.class) &&
      (!filters.visibility || resource.visibility === filters.visibility)
    );
  });

  // --- Handlers for Upload/Update/Delete ---

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      uploadForm.files.length === 0 ||
      !uploadForm.subject ||
      !uploadForm.class ||
      !uploadForm.description ||
      !uploadForm.visibility
    ) {
      console.error("Upload error: required fields missing");
      setError("Please fill all required fields in the upload form.");
      return;
    }
    try {
      const formData = new FormData();
      uploadForm.files.forEach((file) => formData.append("file", file));
      formData.append("subject", uploadForm.subject);
      formData.append("class", uploadForm.class);
      formData.append("description", uploadForm.description);
      formData.append("visibility", uploadForm.visibility);
      const token = localStorage.getItem("token");
      await axios.post(`${BASE_URL}/api/resources/upload`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Resource uploaded successfully!");
      setShowUploadModal(false);
      setUploadForm({
        files: [],
        subject: "",
        class: "",
        description: "",
        visibility: "private",
      });
      fetchResources();
      setInfoMessage("Resource uploaded successfully!");
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(`Failed to upload resource: ${err.message}`);
    }
  };

  const removeUploadFile = (index: number) => {
    setUploadForm((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  const openUpdateModal = (resource: Resource) => {
    setSelectedResource(resource);
    setUpdateForm({
      subject: resource.subject._id,
      class: resource.class._id,
      description: resource.description,
      visibility: resource.visibility,
      files: [],
      existingFiles: resource.files || [],
      removedFiles: [],
    });
    const subjKey = getMappingKeyForSubject(resource.subject._id, subjectMapping);
    // Use update-specific subject select handler.
    handleSubjectSelectUpdate(subjKey);
    setShowUpdateModal(true);
  };

  const removeNewUpdateFile = (index: number) => {
    setUpdateForm((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  const removeExistingUpdateFile = (fileId: string) => {
    setUpdateForm((prev) => ({
      ...prev,
      existingFiles: prev.existingFiles.filter((file) => file.file_id !== fileId),
      removedFiles: [...prev.removedFiles, fileId],
    }));
  };

  const handleUpdateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUpdateForm((prev) => ({ ...prev, files: Array.from(e.target.files) }));
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !selectedResource ||
      !updateForm.subject ||
      !updateForm.class ||
      !updateForm.description ||
      !updateForm.visibility
    ) {
      console.error("Update error: required fields missing");
      setError("Please fill all required fields in the update form.");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      updateForm.files.forEach((file) => formData.append("file", file));
      formData.append("subject", updateForm.subject);
      formData.append("class", updateForm.class);
      formData.append("description", updateForm.description);
      formData.append("visibility", updateForm.visibility);
      formData.append("removeFiles", JSON.stringify(updateForm.removedFiles));
      await axios.put(
        `${BASE_URL}/api/resources/edit/${selectedResource._id}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Resource updated successfully!");
      setShowUpdateModal(false);
      setSelectedResource(null);
      fetchResources();
      setInfoMessage("Resource updated successfully!");
    } catch (err: any) {
      console.error("Update error:", err);
      setError(`Failed to update resource: ${err.message}`);
    }
  };

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
      console.log("Resource deleted successfully!");
      setInfoMessage("Resource deleted successfully!");
    } catch (err: any) {
      console.error("Delete error:", err);
      setError(`Failed to delete resource: ${err.message}`);
    }
  };

  const openDownloadModal = (resource: Resource) => {
    setDownloadResource(resource);
    setSelectedDownloadFiles(new Set());
    setDownloadOption(null);
    setShowDownloadModal(true);
  };

  const toggleDownloadFileSelection = (fileId: string) => {
    setSelectedDownloadFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const handleDownloadAll = () => {
    if (downloadResource) {
      downloadResource.files.forEach((file) => {
        window.open(`${BASE_URL}/api/resources/download/${file.file_id}`, "_blank");
      });
    }
    setShowDownloadModal(false);
  };

  const handleDownloadSelected = () => {
    if (downloadResource && selectedDownloadFiles.size > 0) {
      downloadResource.files
        .filter((file) => selectedDownloadFiles.has(file.file_id))
        .forEach((file) => {
          window.open(`${BASE_URL}/api/resources/download/${file.file_id}`, "_blank");
        });
    }
    setShowDownloadModal(false);
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen space-y-6">
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

      {/* Filters */}
      {showFilters && (
        <div className="bg-white p-4 rounded shadow-md grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <input
            type="text"
            placeholder="Filter by filename"
            className="p-2 border rounded"
            value={filters.filename}
            onChange={(e) =>
              setFilters({ ...filters, filename: e.target.value })
            }
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
          <SearchableDropdown
            options={getFilterSubjectOptions()}
            value={filters.subject}
            onChange={(val) =>
              setFilters((prev) => ({ ...prev, subject: val }))
            }
            placeholder="All Subjects"
          />
          <SearchableDropdown
            options={getFilterClassOptions()}
            value={filters.class}
            onChange={(val) =>
              setFilters((prev) => ({ ...prev, class: val }))
            }
            placeholder="All Classes"
          />
          <select
            className="p-2 border rounded"
            value={filters.visibility}
            onChange={(e) =>
              setFilters({ ...filters, visibility: e.target.value })
            }
          >
            <option value="">All Visibility</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
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

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left border-r border-gray-200">Filename(s)</th>
              <th className="p-3 text-left border-r border-gray-200">Description</th>
              <th className="p-3 text-left border-r border-gray-200">Subject</th>
              <th className="p-3 text-left border-r border-gray-200">Class</th>
              <th className="p-3 text-left border-r border-gray-200">Visibility</th>
              <th className="p-3 text-left border-r border-gray-200">Date</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-blue-500">
                  Loading resources...
                </td>
              </tr>
            ) : filteredResources.length > 0 ? (
              filteredResources.map((resource) => (
                <tr key={resource._id} className="border-t hover:bg-gray-50">
                  {/* Filenames with numbering and total count */}
                  <td className="p-3 border-r border-gray-200">
                    {resource.files && resource.files.length > 0 ? (
                      <>
                        <div className="text-sm text-gray-500 mb-1">
                          Total files: {resource.files.length}
                        </div>
                        <div className="font-medium h-24 overflow-y-auto space-y-1">
                          {resource.files.map((file, index) => (
                            <div
                              key={file.file_id}
                              className="p-1 border border-gray-100 hover:border-blue-500"
                            >
                              <span className="font-bold text-gray-700 mr-1">
                                {index + 1}.
                              </span>{" "}
                              {file.filename}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      "No files attached"
                    )}
                  </td>
                  {/* Description */}
                  <td className="p-3 border-r border-gray-200">
                    <div className="text-sm text-gray-600">{resource.description}</div>
                  </td>
                  <td className="p-3 border-r border-gray-200">
                    {resource.subject.subject_name}
                  </td>
                  <td className="p-3 border-r border-gray-200">
                    {resource.class
                      ? `${resource.class.course} (${resource.class.specialization}) - ${resource.class.commencement_year} - ${resource.class.class_code}`
                      : "No class selected"}
                  </td>
                  <td className="p-3 border-r border-gray-200">
                    <span
                      className={`px-2 py-1 rounded ${
                        resource.visibility === "public"
                          ? "bg-green-100 text-green-600"
                          : "bg-yellow-100 text-yellow-600"
                      }`}
                    >
                      {resource.visibility}
                    </span>
                  </td>
                  <td className="p-3 border-r border-gray-200">
                    {new Date(resource.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 flex gap-2">
                    <button
                      onClick={() => openDownloadModal(resource)}
                      className="text-indigo-600 hover:text-indigo-900 p-2"
                    >
                      <Download size={20} />
                    </button>
                    <button
                      onClick={() => openUpdateModal(resource)}
                      className="text-blue-500 hover:text-blue-700 p-2"
                    >
                      <Edit size={20} />
                    </button>
                    <button
                      onClick={() => confirmDelete(resource)}
                      className="text-red-500 hover:text-red-700 p-2"
                    >
                      <Trash size={20} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  No resources found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-4">
        {loading ? (
          <div className="text-center text-blue-500">Loading resources...</div>
        ) : filteredResources.length > 0 ? (
          filteredResources.map((resource) => (
            <div key={resource._id} className="bg-white rounded-lg shadow p-4">
              <div className="mb-2">
                <strong>Filename(s):</strong>
                <div className="mt-1">
                  {resource.files && resource.files.length > 0 ? (
                    <>
                      <div className="text-sm text-gray-500 mb-1">
                        Total files: {resource.files.length}
                      </div>
                      {resource.files.map((file, index) => (
                        <div
                          key={file.file_id}
                          className="p-1 border border-gray-100 hover:border-blue-500"
                        >
                          <span className="font-bold text-gray-700 mr-1">
                            {index + 1}.
                          </span>{" "}
                          {file.filename}
                        </div>
                      ))}
                    </>
                  ) : (
                    "No files attached"
                  )}
                </div>
              </div>
              <div className="mb-2">
                <strong>Description:</strong>
                <div className="mt-1 text-sm text-gray-600">
                  {resource.description}
                </div>
              </div>
              <div className="mb-2">
                <strong>Subject:</strong> {resource.subject.subject_name}
              </div>
              <div className="mb-2">
                <strong>Class:</strong>{" "}
                {resource.class
                  ? `${resource.class.course} (${resource.class.specialization}) - ${resource.class.commencement_year} - ${resource.class.class_code}`
                  : "No class selected"}
              </div>
              <div className="mb-2">
                <strong>Visibility:</strong>{" "}
                <span
                  className={`px-2 py-1 rounded ${
                    resource.visibility === "public"
                      ? "bg-green-100 text-green-600"
                      : "bg-yellow-100 text-yellow-600"
                  }`}
                >
                  {resource.visibility}
                </span>
              </div>
              <div className="mb-2">
                <strong>Date:</strong>{" "}
                {new Date(resource.createdAt).toLocaleDateString()}
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => openDownloadModal(resource)}
                  className="text-indigo-600 hover:text-indigo-900 p-2"
                >
                  <Download size={20} />
                </button>
                <button
                  onClick={() => openUpdateModal(resource)}
                  className="text-blue-500 hover:text-blue-700 p-2"
                >
                  <Edit size={20} />
                </button>
                <button
                  onClick={() => confirmDelete(resource)}
                  className="text-red-500 hover:text-red-700 p-2"
                >
                  <Trash size={20} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500">No resources found</div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start pt-10 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Upload New Resource</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Select Subject:
                </label>
                <SearchableDropdown
                  options={subjectOptions}
                  value={
                    uploadForm.subject
                      ? getMappingKeyForSubject(uploadForm.subject, subjectMapping)
                      : ""
                  }
                  onChange={(id) => {
                    const mappingEntry = subjectMapping[id];
                    if (mappingEntry) {
                      setUploadForm((prev) => ({
                        ...prev,
                        subject: mappingEntry.subject._id,
                      }));
                      handleSubjectSelect(id);
                    } else {
                      setUploadForm((prev) => ({ ...prev, subject: "" }));
                    }
                  }}
                  placeholder="Select Subject"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Select Class:
                </label>
                <SearchableDropdown
                  options={classOptions}
                  value={uploadForm.class}
                  onChange={(id) => {
                    setUploadForm((prev) => ({ ...prev, class: id }));
                    handleClassSelect(id);
                  }}
                  placeholder="Select Class"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Upload Files:
                </label>
                <input
                  type="file"
                  multiple
                  onChange={(e) =>
                    setUploadForm({
                      ...uploadForm,
                      files: Array.from(e.target.files || []),
                    })
                  }
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              {uploadForm.files.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium">Selected Files:</p>
                  <ul>
                    {uploadForm.files.map((file, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <span>
                          {index + 1}. {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeUploadFile(index)}
                          className="text-red-600"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description:
                </label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) =>
                    setUploadForm({ ...uploadForm, description: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Visibility:
                </label>
                <select
                  value={uploadForm.visibility}
                  onChange={(e) =>
                    setUploadForm({ ...uploadForm, visibility: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
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
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Select Subject:
                </label>
                <SearchableDropdown
                  options={subjectOptions}
                  value={
                    updateForm.subject
                      ? getMappingKeyForSubject(updateForm.subject, subjectMapping)
                      : ""
                  }
                  onChange={(id) => {
                    const mappingEntry = subjectMapping[id];
                    if (mappingEntry) {
                      setUpdateForm((prev) => ({
                        ...prev,
                        subject: mappingEntry.subject._id,
                      }));
                      handleSubjectSelectUpdate(id);
                    } else {
                      setUpdateForm((prev) => ({ ...prev, subject: "" }));
                    }
                  }}
                  placeholder="Select Subject"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Select Class:
                </label>
                <SearchableDropdown
                  options={classOptions}
                  value={updateForm.class}
                  onChange={(id) => {
                    setUpdateForm((prev) => ({ ...prev, class: id }));
                    handleClassSelectUpdate(id);
                  }}
                  placeholder="Select Class"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Existing Files:
                </label>
                {updateForm.existingFiles && updateForm.existingFiles.length > 0 ? (
                  <ul>
                    {updateForm.existingFiles.map((file, index) => (
                      <li key={file.file_id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                        <span className="p-1 hover:border hover:border-blue-500">
                          {index + 1}. {file.filename}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeExistingUpdateFile(file.file_id)}
                          className="text-red-600 mt-1 sm:mt-0"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No files attached.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  New Files to Add:
                </label>
                <input
                  type="file"
                  multiple
                  onChange={handleUpdateFileChange}
                  className="w-full p-2 border rounded-md"
                />
                {updateForm.files.length > 0 && (
                  <ul className="mt-2">
                    {updateForm.files.map((file, index) => (
                      <li key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                        <span className="p-1 hover:border hover:border-blue-500">
                          {index + 1}. {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeNewUpdateFile(index)}
                          className="text-red-600 mt-1 sm:mt-0"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description:
                </label>
                <textarea
                  value={updateForm.description}
                  onChange={(e) =>
                    setUpdateForm({ ...updateForm, description: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Visibility:
                </label>
                <select
                  value={updateForm.visibility}
                  onChange={(e) =>
                    setUpdateForm({ ...updateForm, visibility: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                </select>
              </div>
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
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                >
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
                <strong>Filename(s):</strong>{" "}
                {selectedResource.files && selectedResource.files.length > 0
                  ? selectedResource.files
                      .map((file, index) => `${index + 1}. ${file.filename}`)
                      .join("\n")
                  : "No files attached"}
              </p>
              <p>
                <strong>Subject:</strong> {selectedResource.subject.subject_name}
              </p>
              <p>
                <strong>Class:</strong>{" "}
                {selectedResource.class
                  ? `${selectedResource.class.course} (${selectedResource.class.specialization}) - ${selectedResource.class.commencement_year} - ${selectedResource.class.class_code}`
                  : "No class selected"}
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

      {/* Download Modal */}
      {showDownloadModal && downloadResource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Download Options</h2>
            {!downloadOption && (
              <>
                <p className="mb-4">Choose an option:</p>
                <div className="flex justify-around mb-4">
                  <button
                    onClick={handleDownloadAll}
                    className="px-4 py-2 bg-green-600 text-white rounded"
                  >
                    Download All
                  </button>
                  <button
                    onClick={() => setDownloadOption("selected")}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    Download Selected
                  </button>
                </div>
                <button
                  onClick={() => setShowDownloadModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded w-full"
                >
                  Cancel
                </button>
              </>
            )}
            {downloadOption === "selected" && (
              <>
                <p className="mb-4">Select files to download:</p>
                <div className="max-h-60 overflow-y-auto mb-4">
                  {downloadResource.files.map((file, index) => (
                    <label key={file.file_id} className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        checked={selectedDownloadFiles.has(file.file_id)}
                        onChange={() => toggleDownloadFileSelection(file.file_id)}
                        className="mr-2"
                      />
                      <span className="font-bold text-gray-700 mr-1">
                        {index + 1}.
                      </span>
                      {file.filename}
                    </label>
                  ))}
                </div>
                <div className="mb-4 text-sm text-gray-500">
                  Selected files: {selectedDownloadFiles.size}
                </div>
                <div className="flex justify-between">
                  <button
                    onClick={() => setShowDownloadModal(false)}
                    className="px-4 py-2 bg-gray-300 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDownloadSelected}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    Download Selected
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error Modal */}
      {error && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
            <h2 className="text-xl font-bold mb-4">Error Occurred</h2>
            <p className="mb-4">{error}</p>
            <button
              onClick={() => setError("")}
              className="px-4 py-2 bg-red-600 text-white rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Info/Success Modal */}
      {infoMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
            <h2 className="text-xl font-bold mb-4">Success</h2>
            <p className="mb-4">{infoMessage}</p>
            <button
              onClick={() => setInfoMessage("")}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherResources;
