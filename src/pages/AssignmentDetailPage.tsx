// UPDATED FILE: src/pages/AssignmentDetailPage.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowLeft, Pencil, Download, File, Link2, CheckCircle, XCircle, CalendarClock, FileText } from "lucide-react";
import AssignmentFormModal from "../components/assignment/AssignmentFormModal";
import { Document, Page } from 'react-pdf';
import { PDFViewer } from '@react-pdf/renderer';
import FilePreviewer from '../components/assignment/FileViewer';

interface StudentSubmission {
  _id: string;
  student: {
    _id: string;
    name: string;
    email: string;
    profile: {
      sap_id: string;
    };
  };
  file: string[];
  submittedAt: string;
  grade?: number;
  feedback?: string;
  status: 'submitted' | 'graded' | 'needs-revision';
}
// Update the FileDisplay component
const FileDisplay = ({ fileId, index }: { fileId: string, index: number }) => {
  const [filename, setFilename] = useState(`File ${index + 1}`);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `http://localhost:5001/api/file/${fileId}/metadata`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await response.json();
        setFilename(data.filename);
      } catch (error) {
        console.error("Error fetching metadata:", error);
      }
    };

    fetchMetadata();
  }, [fileId]);

  return (
    <div className="flex items-center gap-2">
      <a
        href={`http://localhost:5001/api/attachments/${fileId}`}
        download
        className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
      >
        <Download size={16} />
        <span>{filename}</span>
      </a>
      <button
        onClick={() => setPreviewFile(fileId)}
        className="text-blue-600 hover:text-blue-700 text-sm"
      >
        Preview
      </button>
    </div>
  );
};
function AssignmentDetailPage(): JSX.Element {
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<any>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<StudentSubmission | null>(null);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);

// Updated FileViewer component

const FileViewer = ({ fileId }: { fileId: string }) => {
  const [content, setContent] = useState<React.ReactNode>(null);
  const [fileType, setFileType] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [numPages, setNumPages] = useState<number>(0);

  useEffect(() => {
    const loadAndPreviewFile = async () => {
      try {
        const token = localStorage.getItem("token");
        const fileUrl = `http://localhost:5001/api/attachments/${fileId}`;
        const response = await fetch(fileUrl, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const blob = await response.blob();
        const extension = fileUrl.split('.').pop()?.toLowerCase();
        const contentType = response.headers.get('content-type') || '';

        // Determine file type
        let type = '';
        if (contentType.includes('pdf')) type = 'pdf';
        else if (contentType.startsWith('image/')) type = 'image';
        else if (extension === 'docx') type = 'docx';
        else if (extension === 'xlsx') type = 'xlsx';
        else if (['txt', 'csv'].includes(extension || '')) type = 'text';
        
        setFileType(type);

        switch (type) {
          case 'pdf':
            setContent(
              <Document
                file={blob}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              >
                {Array.from({ length: numPages }, (_, index) => (
                  <Page key={`page_${index + 1}`} pageNumber={index + 1} />
                ))}
              </Document>
            );
            break;

          case 'image':
            const imgUrl = URL.createObjectURL(blob);
            setContent(<img src={imgUrl} className="max-h-full max-w-full" alt="Preview" />);
            break;

          case 'docx':
            const { value } = await mammoth.convertToHtml({ arrayBuffer: await blob.arrayBuffer() });
            setContent(<div dangerouslySetInnerHTML={{ __html: value }} />);
            break;

          case 'xlsx':
            const buffer = await blob.arrayBuffer();
            const wb = read(buffer);
            const html = utils.sheet_to_html(wb.Sheets[wb.SheetNames[0]]);
            setContent(<div dangerouslySetInnerHTML={{ __html: html }} />);
            break;

          case 'text':
            const text = await blob.text();
            setContent(<pre className="whitespace-pre-wrap">{text}</pre>);
            break;

          default:
            setError("Preview not available for this file type");
            break;
        }
      } catch (err) {
        console.error("Preview error:", err);
        setError("Failed to load preview");
      }
    };

    loadAndPreviewFile();
  }, [fileId]);

  if (error) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center space-y-4">
        <div className="text-red-500">{error}</div>
        <a
          href={`http://localhost:5001/api/attachments/${fileId}`}
          download
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Download File
        </a>
      </div>
    );
  }

  return (
    <div className="h-[80vh] w-full overflow-auto p-4">
      {content || (
        <div className="h-full w-full flex items-center justify-center">
          Loading preview...
        </div>
      )}
    </div>
  );
};

const FileDisplay = ({ fileId, index }: { fileId: string, index: number }) => (
  <div key={fileId} className="flex items-center gap-2">
    <a
      href={`http://localhost:5001/api/attachments/${fileId}`}
      download
      className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
    >
      <Download size={16} />
      <span>File {index + 1}</span>
    </a>
    <button
      onClick={() => setPreviewFile(fileId)}
      className="text-blue-600 hover:text-blue-700 text-sm"
    >
      Preview
    </button>
  </div>
);

  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`http://localhost:5001/api/assignments/${assignmentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error("Failed to fetch assignment");
        const data = await res.json();
        
        const submissionsRes = await fetch(`http://localhost:5001/api/submissions?assignment=${assignmentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const submissions = await submissionsRes.json();
        
        setAssignment({
          ...data,
          submissions: submissions.map((s: any) => ({
            ...s,
            student: {
              ...s.student,
              profile: s.student.profile || { sap_id: 'N/A' }
            }
          }))
        });
      } catch (err) {
        toast.error("Error loading assignment");
      }
    };

    fetchAssignment();
  }, [assignmentId]);

  const handleGradeSubmit = async () => {
    try {
      if (!selectedSubmission) return;
      if (!grade || Number(grade) > assignment.points) {
        toast.error(`Grade must be between 0-${assignment.points}`);
        return;
      }

      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5001/api/submissions/${selectedSubmission._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          grade: Number(grade),
          feedback,
          status: 'graded'
        })
      });

      if (!res.ok) throw new Error("Failed to submit grade");
      
      setAssignment(prev => ({
        ...prev,
        submissions: prev.submissions.map((s: StudentSubmission) => 
          s._id === selectedSubmission._id ? {
            ...s,
            grade: Number(grade),
            feedback,
            status: 'graded'
          } : s
        )
      }));
      
      setSelectedSubmission(null);
      toast.success("Grade submitted successfully");
    } catch (err) {
      toast.error("Failed to submit grade");
    }
  };

  const toGrade = assignment?.submissions?.filter((s: StudentSubmission) => s.status === 'submitted');
  const graded = assignment?.submissions?.filter((s: StudentSubmission) => s.status === 'graded');

  if (!assignment) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-gray-600 hover:text-black"
        >
          <ArrowLeft size={20} />
          Back to Assignments
        </button>
        <button
          onClick={() => setEditModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Pencil size={16} />
          Edit Assignment
        </button>
      </div>

      {/* Assignment Info */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h1 className="text-3xl font-bold mb-4">{assignment.title}</h1>
        
        <div className="grid grid-cols-2 gap-4 text-gray-600">
          <div className="flex items-center gap-2">
            <CalendarClock size={20} />
            <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText size={20} />
            <span>Points: {assignment.points}</span>
          </div>
        </div>
        <p className="mt-4 text-gray-700">{assignment.description}</p>
      </div>

      {/* Submission Sections */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* To Grade Section */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <XCircle className="text-amber-500" />
            To Grade ({toGrade?.length || 0})
          </h2>
          {toGrade?.length > 0 ? toGrade.map((submission: StudentSubmission) => (
            <div key={submission._id} className="border-b py-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{submission.student.name}</h3>
                  <p className="text-sm text-gray-500">
                    {submission.student.profile.sap_id} • {submission.student.email}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Submitted: {new Date(submission.submittedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  {submission.file.map((fileId, index) => (
                    <FileDisplay fileId={fileId} index={index} key={fileId} />
                  ))}
                  <button
                    onClick={() => setSelectedSubmission(submission)}
                    className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-md hover:bg-emerald-200"
                  >
                    Grade
                  </button>
                </div>
              </div>
            </div>
          )) : (
            <p className="text-gray-500">No submissions to grade</p>
          )}
        </div>

        {/* Graded Section */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="text-emerald-500" />
            Graded ({graded?.length || 0})
          </h2>
          {graded?.length > 0 ? graded.map((submission: StudentSubmission) => (
            <div key={submission._id} className="border-b py-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{submission.student.name}</h3>
                  <p className="text-sm text-gray-500">
                    {submission.student.profile.sap_id} • {submission.student.email}
                  </p>
                  <div className="mt-1">
                    <span className="font-medium">Grade:</span> {submission.grade}/{assignment.points}
                  </div>
                  {submission.feedback && (
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Feedback:</span> {submission.feedback}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  {submission.file.map((fileId, index) => (
                    <FileDisplay fileId={fileId} index={index} key={fileId} />
                  ))}
                  <button
                    onClick={() => {
                      setSelectedSubmission(submission);
                      setGrade(submission.grade?.toString() || '');
                      setFeedback(submission.feedback || '');
                    }}
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-200"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          )) : (
            <p className="text-gray-500">No graded submissions yet</p>
          )}
        </div>
      </div>

      {/* Grading Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-semibold mb-4">
              Grading {selectedSubmission.student.name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Grade (0-{assignment.points})</label>
                <input
                  type="number"
                  min="0"
                  max={assignment.points}
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Feedback</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full p-2 border rounded-md h-32"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleGradeSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Submit Grade
              </button>
            </div>
          </div>
        </div>
      )}

      <AssignmentFormModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        existingAssignment={assignment}
        onSuccess={(updatedAssignment) => {
          setAssignment(updatedAssignment);
          setEditModalOpen(false);
        }}
      />

      {/* {previewFile && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl h-[80vh] overflow-hidden relative">
            <button
              className="absolute top-2 right-2 bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded"
              onClick={() => setPreviewFile(null)}
            >
              Close
            </button>
            <FileViewer fileId={previewFile} />
          </div>
        </div>
      )} */}
      {previewFile && (
  <FilePreviewer 
    fileId={previewFile}
    onClose={() => setPreviewFile(null)}
  />
)}
    </div>
  );
};

export default AssignmentDetailPage;