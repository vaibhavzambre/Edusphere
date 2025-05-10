import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  CalendarDays,
  FileText,
  ArrowLeft,
  UploadCloud,
  ClipboardCheck,
  Link2,
  DownloadCloud,
  File,
  AlertTriangle,
  CheckCircle,
  School
} from "lucide-react";

const StudentAssignmentDetail = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<any>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const [resubmissionAllowed, setResubmissionAllowed] = useState(false);
const [submissionId, setSubmissionId] = useState<string | null>(null);
const [closeDatePassed, setCloseDatePassed] = useState(false);
const [submission, setSubmission] = useState<any>(null); // stores actual submission document
const handleDownload = async (fileData: any) => {
  try {
    // Extract ID from different possible formats
    let fileId = "";
    
    if (typeof fileData === "string") {
      fileId = fileData;
    } else if (fileData?._id) {
      fileId = fileData._id.toString();
    } else if (fileData?.fileId) {
      fileId = fileData.fileId.toString();
    } else {
      throw new Error("Invalid file data structure");
    }

    // Validate ID format
    if (!/^[0-9a-fA-F]{24}$/.test(fileId)) {
      throw new Error(`Invalid file ID format: ${fileId}`);
    }

    const token = localStorage.getItem("token");
    const response = await fetch(
      `http://localhost:5001/api/assignments/download/${fileId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Download failed");
    }

    // Extract filename from headers
    const contentDisposition = response.headers.get("Content-Disposition") || "";
    const filenameMatch = contentDisposition.match(/filename="?(.+?)"?(;|$)/);
    const filename = filenameMatch ? filenameMatch[1] : `file-${fileId}`;

    // Create download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

  } catch (error) {
    console.error("Download error:", error);
    toast.error(error.message || "Failed to download file");
  }
};
  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`http://localhost:5001/api/assignments/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.data;
        setAssignment(data);
        setResubmissionAllowed(data.allowResubmission ?? false);

        const now = new Date();
if (data?.closeDate && new Date(data.closeDate) < now) {
  setCloseDatePassed(true);
}
if (data?.submission) {
  setSubmission(data.submission);
  setIsSubmitted(true);
  setSubmittedAt(new Date(data.submission.submittedAt).toLocaleString());
  setSubmissionId(data.submission._id);
}



      } catch (err) {
        toast.error("Failed to load assignment");
        console.error(err);
      }
    };
    fetchAssignment();
  }, [id, user._id]);
  const handleUndoSubmit = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5001/api/submissions/${submissionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      toast.success("Submission undone");
      setIsSubmitted(false);
      setSubmittedAt(null);
      setSelectedFiles([]);
      setSubmissionId(null);
    } catch (err) {
      console.error("Undo submission failed", err);
      toast.error("Failed to undo submission");
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) return toast.error("Please attach at least one file");

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const token = localStorage.getItem("token");
      await axios.post(`http://localhost:5001/api/submissions/${id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success("Assignment submitted successfully");
      setIsSubmitted(true);
      setSubmittedAt(new Date().toLocaleString());

    } catch (err) {
      toast.error("Submission failed");
      console.error(err);
    }
  };

  if (!assignment) return <div className="p-6">Loading...</div>;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      
    {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Back to Assignments
        </button>
        {!closeDatePassed && (
  <>
  
    {!isSubmitted && (
      <button
        onClick={handleSubmit}
        className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
        >
        <UploadCloud size={20} />
        {new Date(assignment.dueDate) < new Date()
          ? "Turn In Late"
          : "Submit Assignment"}
      </button>
    )}


    
    {isSubmitted && resubmissionAllowed && (
      <button
        onClick={handleUndoSubmit}
        className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
        >
        <UploadCloud size={20} />
        Undo Turn In
      </button>
    )}
  </>
)}
{closeDatePassed && isSubmitted && (
  <span className="text-sm text-red-600">Submissions closed</span>
)}

        </div> 

      {/* Assignment Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{assignment.title}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm">
            <FileText size={16} className="text-blue-600" />
            {assignment.points} Points
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm">
            <CalendarDays size={16} className="text-blue-600" />
            Due: {new Date(assignment.dueDate).toLocaleDateString()} •{' '}
            {new Date(assignment.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          {assignment.classes?.map((cls: any) => (
            <div key={cls._id} className="flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm">
              <School size={16} className="text-blue-600" />
              {cls.class_code} - {cls.commencement_year}
            </div>
          ))}
        </div>
      </div>
{isSubmitted && submission?.grade !== undefined && (
  <div className="bg-emerald-50 p-4 rounded-lg mb-4">
    <h3 className="font-semibold text-emerald-700 flex items-center gap-2">
      <CheckCircle size={18} />
      Graded: {submission.grade}/{assignment.points} points
    </h3>
    {submission.feedback && (
      <div className="mt-2">
        <p className="font-medium">Feedback:</p>
        <p className="text-gray-700">{submission.feedback}</p>
      </div>
    )}
  </div>
)}
      {/* Description */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText size={20} className="text-gray-600" />
          Assignment Description
        </h2>
        <p className="text-gray-700 leading-relaxed">{assignment.description}</p>
      </div>

      {/* Resources */}
      {assignment.links?.length > 0 || assignment.files?.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Link2 size={20} className="text-gray-600" />
            Attached Resources
          </h3>
          
          {assignment.links?.map((link: string, i: number) => (
            <a
              key={i}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-2"
            >
              <Link2 size={16} />
              {link}
            </a>
          ))}

{assignment.files?.map((file: any) => (
  <button
    key={file._id}
    onClick={() => handleDownload(file._id)}
    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-2"
  >
    <DownloadCloud size={16} />
    {file.filename} {/* Now displays actual filename */}
  </button>
))}
        </div>
      ) : null}





{isSubmitted && (
  <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
      <ClipboardCheck size={20} className="text-gray-600" />
      Submitted Files
    </h3>
    
    <div className="space-y-3">
      {submission?.file?.map((file: any) => (
        <div 
          key={file._id}
          className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer flex items-center gap-3"
          onClick={() => handleDownload(file)}
        >
          <div className="p-2 bg-blue-50 rounded-full">
            <File size={18} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {file.filename}
            </p>
            <p className="text-xs text-gray-500">Click to download</p>
          </div>
          <DownloadCloud size={18} className="text-gray-400" />
        </div>
      ))}
    </div>
  </div>
)}

      {/* Upload Section */}
      {!isSubmitted && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <UploadCloud size={20} className="text-gray-600" />
            Your Submission
          </h3>

          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="mb-4">
              <UploadCloud size={40} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600">
                Drag files here or{' '}
                <label className="text-blue-600 cursor-pointer">
                  browse files
                  <input 
                    type="file" 
                    multiple 
                    className="hidden" 
                    onChange={handleFileSelect} 
                  />
                </label>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Supported formats: PDF, DOC, PPT, ZIP, JPG, PNG
              </p>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-2 text-left">
                {selectedFiles.map((file, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between bg-white p-2 rounded border"
                  >
                    <div className="flex items-center gap-2">
                      <File size={16} className="text-gray-500" />
                      <span className="text-sm">{file.name}</span>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submission Status */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className={`flex items-center gap-3 p-3 rounded-lg ${
          isSubmitted ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"
        }`}>
          {isSubmitted ? (
            <CheckCircle size={24} className="text-emerald-600" />
          ) : (
            <AlertTriangle size={24} className="text-amber-600" />
          )}
          <div>
            <h3 className="font-medium">
              {isSubmitted ? "Submitted Successfully" : "Pending Submission"}
            </h3>
            {isSubmitted && (
              <p className="text-sm text-gray-600">
                Submitted on: {submittedAt}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAssignmentDetail;