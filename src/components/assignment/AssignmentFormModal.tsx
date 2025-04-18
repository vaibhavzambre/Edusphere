// NEW FILE: src/components/assignment/AssignmentFormModal.tsx
import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  Upload,
  CalendarDays,
  FileText,
  BookOpen,
  CheckCircle,
} from "lucide-react";

// Utility to get current datetime in local ISO format (YYYY-MM-DDTHH:MM)
const getCurrentDateTimeLocal = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = ("0" + (now.getMonth() + 1)).slice(-2);
  const day = ("0" + now.getDate()).slice(-2);
  const hours = ("0" + now.getHours()).slice(-2);
  const minutes = ("0" + now.getMinutes()).slice(-2);
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

interface AssignmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingAssignment?: any; // ✅ NEW for edit

}

const AssignmentFormModal: React.FC<AssignmentFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingAssignment
}) => {
  // Form data (plagiarismCheck and notifyStudents removed)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    points: "",
    category: "homework",
    dueDate: "",
    visibilityDate: "",
    closeDate: "",
    // Instead of team, we use classes (array) for multi-select.
    classes: [] as string[],
    files: null as File | null,
    lateSubmissionsAllowed: true,
    allowResubmission: false,
  });
  const isEditMode = !!(existingAssignment && isOpen);

  // State for classes list and dropdown visibility
  const [classesList, setClassesList] = useState<any[]>([]);
  const [showClassesDropdown, setShowClassesDropdown] = useState(false);

  // For individual assignment (selecting specific recipients)
  const [useSpecificStudents, setUseSpecificStudents] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ _id: string, name: string }[]>([]);

  // For dynamic resource links
  const [resourceLinks, setResourceLinks] = useState<string[]>([""]);
  const [dragging, setDragging] = useState(false);

  // For students and teachers (for selection modals)
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  useEffect(() => {
    if (isOpen) {
      console.log("📦 Modal opened");
      console.log("📋 isEditMode:", isEditMode);
      console.log("📄 existingAssignment:", existingAssignment);
    }
  }, [isOpen, isEditMode, existingAssignment]);

  useEffect(() => {
    if (isEditMode && existingAssignment?.files?.length > 0) {
      const token = localStorage.getItem("token");
      console.log("📡 Fetching metadata for files:", existingAssignment.files);
  
      Promise.all(
        existingAssignment.files.map(async (fileId: string) => {
          try {
            console.log("➡️ Sending request for fileId:", fileId);
            const res = await fetch(`http://localhost:5001/api/assignments/file/${fileId}/metadata`, {
              headers: { Authorization: `Bearer ${token}` },
            });
  
            const text = await res.text(); // <-- parse text to inspect manually
            try {
              const metadata = JSON.parse(text);
              console.log("✅ Received metadata:", metadata);
              return { _id: fileId, name: metadata.filename || "Uploaded File" };
            } catch (parseErr) {
              console.warn("⚠️ Could not parse metadata JSON:", text);
              return { _id: fileId, name: "Unknown File" };
            }
          } catch (err) {
            console.error("❌ Error fetching file metadata:", err);
            return { _id: fileId, name: "Unknown File" };
          }
        })
      ).then(setUploadedFiles);
    }
  }, [isEditMode, existingAssignment?.files, isOpen]);
  
  
  useEffect(() => {
    if (existingAssignment && classesList.length > 0 && isOpen) {
      const initialData = {
        title: existingAssignment.title || "",
        description: existingAssignment.description || "",
        points: existingAssignment.points || "",
        category: existingAssignment.category || "homework",
        dueDate: existingAssignment.dueDate
          ? new Date(existingAssignment.dueDate).toISOString().slice(0, 16)
          : "",
        visibilityDate: existingAssignment.visibilityDate
          ? new Date(existingAssignment.visibilityDate).toISOString().slice(0, 16)
          : "",
        closeDate: existingAssignment.closeDate
          ? new Date(existingAssignment.closeDate).toISOString().slice(0, 16)
          : "",
          classes: (existingAssignment.classes || []).map((c: any) => c._id),
          files: null,
        lateSubmissionsAllowed: existingAssignment.lateSubmissionsAllowed ?? true,
        allowResubmission: existingAssignment.allowResubmission ?? false,
      };
  
      console.log("✅ Prefilling formData with classes:", initialData.classes);
      setFormData(initialData);
      setResourceLinks(existingAssignment.links || []);
      setUseSpecificStudents((existingAssignment.assignedTo?.length || 0) > 0);
      setSelectedStudents((existingAssignment.assignedTo || []).map((s: any) => s._id));
    }
  }, [existingAssignment, classesList, isOpen]);
  
  
  // --- FETCH CLASSES USING fetch() API with token ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch("http://localhost:5001/api/classes", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch classes");
        return response.json();
      })
      .then((data) => {
        // If backend returns an array directly, use it. Otherwise, check for a data field.
        const classes =
          Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : [];
        setClassesList(classes);
        console.log("Extracted Classes List:", classes);
      })
      .catch((error) => {
        console.error("Failed to fetch classes:", error);
        toast.error("Failed to fetch classes");
      });
  }, []);

  // --- FETCH STUDENTS WHEN STUDENT MODAL OPENS ---
  
  useEffect(() => {
    if (showStudentModal) {
      const token = localStorage.getItem("token");
      if (!token) return;
      fetch("http://localhost:5001/api/users/students", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch students");
          return res.json();
        })
        .then((data) => {
          const studentsList = Array.isArray(data) ? data : data.data || [];
          setStudents(studentsList);
          setAllStudents(studentsList); // Save original for search reset
        })
        .catch((err) => {
          toast.error("Failed to fetch students");
          console.error(err);
        });
    }
  }, [showStudentModal]);
  
  // --- FETCH TEACHERS WHEN TEACHER MODAL OPENS ---
  useEffect(() => {
    if (showTeacherModal) {
      const token = localStorage.getItem("token");
      if (!token) return;
      fetch("http://localhost:5001/api/users/teachers", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => {
          if (!response.ok) throw new Error("Failed to fetch teachers");
          return response.json();
        })
        .then((data) => {
          const teachersList =
            Array.isArray(data)
              ? data
              : Array.isArray(data.data)
              ? data.data
              : [];
          setTeachers(teachersList);
          console.log("Extracted Teachers List:", teachersList);
        })
        .catch((error) => {
          console.error("Failed to fetch teachers:", error);
          toast.error("Failed to fetch teachers");
        });
    }
  }, [showTeacherModal]);

  const handleChange = (e: React.ChangeEvent<any>) => {
    const { name, value, type, checked, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? checked : type === "file" ? files?.[0] : value,
    }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setFormData((prev) => ({ ...prev, files: file }));
  };

  const handleLinkChange = (index: number, value: string) => {
    const updated = [...resourceLinks];
    updated[index] = value;
    setResourceLinks(updated);
  };

  const addLinkField = () => {
    setResourceLinks((prev) => [...prev, ""]);
  };

  const removeLinkField = (index: number) => {
    setResourceLinks((prev) => prev.filter((_, i) => i !== index));
  };

  // Toggle selection of classes (using checkbox list in dropdown)
  const toggleClassSelection = (classId: string) => {
    const current = formData.classes;
    if (current.includes(classId)) {
      setFormData((prev) => ({ ...prev, classes: current.filter((id) => id !== classId) }));
    } else {
      setFormData((prev) => ({ ...prev, classes: [...current, classId] }));
    }
  };

  // Handlers for Student and Teacher selection modals
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

  // Handle form submit (we keep axios here for the file upload and create assignment request)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let uploadedFileId = null;
      if (formData.files) {
        const fd = new FormData();
        fd.append("file", formData.files);
        const token = localStorage.getItem("token");

        const uploadRes = await axios.post("http://localhost:5001/api/assignments/upload", fd, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        });
        
        uploadedFileId = uploadRes.data.fileId;
      }

      const payload = {
        ...formData,
        // Send file as array (even if a single file)
        files: [
          ...uploadedFiles.map((f) => f._id),
          ...(uploadedFileId ? [uploadedFileId] : [])
        ],
                  links: resourceLinks.filter((l) => l.trim() !== ""),
        // Combine student and teacher selections if individual recipients are enabled
        assignedTo: useSpecificStudents ? [...selectedStudents, ...selectedTeachers] : [],
      };
      const url = isEditMode
      ? `http://localhost:5001/api/assignments/${existingAssignment._id}`
      : `http://localhost:5001/api/assignments/create`;
    
    const method = isEditMode ? "put" : "post";
    
    await axios({
      url,
      method,
      data: payload,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    
    toast.success(isEditMode ? "Assignment updated successfully" : "Assignment created successfully");
    onClose();
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create assignment");
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        {/* Modal Panel with scrolling for overflow */}
        <Dialog.Panel className="bg-white rounded-xl max-w-3xl w-full p-6 shadow-xl overflow-y-auto max-h-[80vh]">
          <Dialog.Title className="text-2xl font-bold flex items-center gap-2 mb-6">
            <BookOpen size={24} className="text-blue-600" />
            {isEditMode ? "Edit Assignment" : "Create New Assignment"}
            </Dialog.Title>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Basic Information Section */}
            <div className="space-y-4 border-b pb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText size={20} className="text-gray-600" />
                Basic Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title *</label>
                  <input
                    name="title"
                    value={formData.title}

                    required
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Points</label>
                  <input
      type="number"
      required
      min="1"
      value={formData.points}
      onChange={(e) => setFormData({...formData, points: parseInt(e.target.value)})}
      className="w-full p-2 border rounded-md"
    />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    name="category"
                    value={formData.category}

                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="homework">Homework</option>
                    <option value="quiz">Quiz</option>
                    <option value="exam">Exam</option>
                    <option value="project">Project</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Instructions</label>
                <textarea
                  name="description"
                  value={formData.description}

                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Add assignment instructions..."
                />
              </div>
              {/* Custom Classes Dropdown */}
              <div>
                <label className="block text-sm font-medium mb-1">Select Classes *</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowClassesDropdown(!showClassesDropdown)}
                    className="w-full border p-2 rounded flex justify-between items-center"
                  >
                    <span>
                      {formData.classes.length > 0
                        ? classesList
                            .filter((c) => formData.classes.includes(c._id))
                            .map((c) => `${c.class_code} - ${c.commencement_year}`)
                            .join(", ")
                        : "Select Classes"}
                    </span>
                    <span>▼</span>
                  </button>
                  {showClassesDropdown && (
                    <div className="absolute mt-1 w-full border rounded bg-white z-10 max-h-60 overflow-y-auto">
{classesList.map((cls) => {
  const isSelected = formData.classes.includes(cls._id);

  console.log("🔍 Matching Class", {
    classId: cls._id,
    isSelected,
    formDataClasses: formData.classes,
  });

  return (
    <label key={cls._id} className="flex items-center p-2 hover:bg-gray-100">
      <input
        type="checkbox"
        value={cls._id}
        checked={isSelected}
        onChange={() => toggleClassSelection(cls._id)}
        className="mr-2"
      />
      {cls.class_code} - {cls.commencement_year} ({cls.specialization})
    </label>
  );
})}

                    </div>
                  )}
                </div>
                <div className="flex space-x-2 mt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        classes: classesList.map((cls) => cls._id),
                      }))
                    }
                    className="px-3 py-1 bg-gray-200 rounded"
                  >
                    Select All Classes
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, classes: [] }))}
                    className="px-3 py-1 bg-gray-200 rounded"
                  >
                    Clear All Classes
                  </button>
                </div>
              </div>
            </div>

            {/* Schedule Section */}
            <div className="space-y-4 border-b pb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CalendarDays size={20} className="text-gray-600" />
                Schedule
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Due Date & Time *</label>
                  <input
                    type="datetime-local"
                    name="dueDate"
                    value={formData.dueDate}

                    required
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Visible From (Date & Time)
                  </label>
                  <input
                    type="datetime-local"
                    name="visibilityDate"
                    value={formData.visibilityDate}

                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg"
                    min={getCurrentDateTimeLocal()}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Close Date (Date & Time)
                  </label>
                  <input
                    type="datetime-local"
                    name="closeDate"
                    value={formData.closeDate}

                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Resources Section */}
            <div className="space-y-4 border-b pb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText size={20} className="text-gray-600" />
                Resources
              </h3>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center ${
                  dragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  Drag files here or{" "}
                  <label className="text-blue-600 cursor-pointer">
                    browse files
                    <input
                      type="file"
                      name="files"
                      onChange={handleChange}
                      className="hidden"
                    />
                  </label>
                </p>
                {formData.files && (
                  <p className="text-sm text-gray-600 mt-2">
                    Selected file: {formData.files.name}
                  </p>
                )}
                {uploadedFiles.length > 0 && (
  <div className="mt-2 space-y-1">
    {uploadedFiles.map((file) => (
      <div key={file._id} className="flex items-center justify-between text-sm text-gray-700">
        <span>{file.name}</span>
        <button
          type="button"
          onClick={() =>
            setUploadedFiles((prev) => prev.filter((f) => f._id !== file._id))
          }
          className="text-red-500 hover:text-red-700"
        >
          ❌
        </button>
      </div>
    ))}
  </div>
)}

              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Resource Links</label>
                {resourceLinks.map((link, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => handleLinkChange(index, e.target.value)}
                      placeholder="https://example.com/resource"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeLinkField(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addLinkField}
                  className="text-blue-600 text-sm flex items-center gap-1"
                >
                  + Add another link
                </button>
              </div>
            </div>

            {/* Settings Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle size={20} className="text-gray-600" />
                Settings
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    name="lateSubmissionsAllowed"
                    checked={formData.lateSubmissionsAllowed}
                    onChange={handleChange}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-medium">Allow Late Submissions</p>
                    <p className="text-sm text-gray-600">
                      Students can submit after due date
                    </p>
                  </div>
                </label>
                <label className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    name="allowResubmission"
                    checked={formData.allowResubmission}
                    onChange={handleChange}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-medium">Allow Resubmissions</p>
                    <p className="text-sm text-gray-600">
                      Students can submit multiple times
                    </p>
                  </div>
                </label>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Assign to Specific Students
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useSpecificStudents}
                    onChange={(e) => setUseSpecificStudents(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>Enable individual student assignment</span>
                </div>
                {useSpecificStudents && (
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => setShowStudentModal(true)}
                      className="px-3 py-1 bg-indigo-600 text-white rounded"
                    >
                      Choose Students
                    </button>

                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <CheckCircle size={18} />
                {isEditMode ? "Update Assignment" : "Create Assignment"}
                </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
{/* Student Selection Modal */}
{/* Student Selection Modal */}
<Dialog
  open={showStudentModal}
  onClose={() => setShowStudentModal(false)}
  className="z-[100] fixed inset-0"
>
  <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
  <div className="fixed inset-0 flex items-center justify-center p-4">
    <Dialog.Panel
      className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg relative"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => setShowStudentModal(false)}
        className="absolute top-2 right-3 text-gray-600 hover:text-gray-900 text-xl"
      >
        ❌
      </button>
      <Dialog.Title className="text-lg font-semibold mb-2">Select Students</Dialog.Title>

      {/* NEW UPDATED PART — Search functionality */}
      <input
        type="text"
        placeholder="Search Students..."
        onChange={(e) => {
          const keyword = e.target.value.toLowerCase();
          const filtered = allStudents.filter(
            (student) =>
              student.name.toLowerCase().includes(keyword) ||
              student.email.toLowerCase().includes(keyword) ||
              (student.sapId || "").includes(keyword)
          );
          setStudents(filtered);
        }}
        
        className="border p-2 rounded w-full mb-3"
      />

      <ul className="max-h-60 overflow-y-auto border rounded">
        {students.length > 0 ? (
          students.map((student) => (
            <li
              key={student._id}
              className="p-2 border-b flex justify-between items-center"
            >
              <span>
                {student.name} ({student.email}) - SAP: {student.profile?.sap_id || "N/A"}
              </span>
              <input
                type="checkbox"
                checked={selectedStudents.includes(student._id)}
                onChange={() => toggleStudentSelection(student._id)}
              />
            </li>
          ))
        ) : (
          <li className="p-2 text-gray-500">No students available</li>
        )}
      </ul>

      <button
        onClick={() => setShowStudentModal(false)}
        className="mt-3 w-full bg-indigo-600 text-white p-2 rounded"
      >
        Confirm Selection
      </button>
    </Dialog.Panel>
  </div>
</Dialog>

      {/* Student Selection Modal */}
    

      
    </Dialog>
  );
};

export default AssignmentFormModal;
