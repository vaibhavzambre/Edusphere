import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowLeft, Pencil } from "lucide-react";
import AssignmentFormModal from "../components/assignment/AssignmentFormModal";

interface StudentSubmission {
  studentId: string;
  name: string;
  email: string;
  sapId: string;
  submissionFile: string | null;
  submissionLink: string | null;
  submittedAt: string | null;
  grade: number | null;
  feedback: string | null;
}

function AssignmentDetailPage() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentSubmission | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`http://localhost:5001/api/assignments/${assignmentId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
    
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch assignment");
        return res.json();
      })
      .then((data) => {
        console.log("✅ Assignment fetched in details page:", data);
        setAssignment(data);
      })
            .catch((err) => {
        console.error(err);
        toast.error("Error loading assignment");
      })
      .finally(() => setLoading(false));
  }, [assignmentId]);

  const toGrade = assignment?.submissions?.filter((s: StudentSubmission) => s.submissionFile && s.grade === null);
  const graded = assignment?.submissions?.filter((s: StudentSubmission) => s.grade !== null);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-black">
          <ArrowLeft size={20} />
          Back
        </button>
        <button
  onClick={() => setEditModalOpen(true)}
  className="btn-primary flex items-center gap-2"
>
  <Pencil size={16} />
  Edit Assignment
</button>

      </div>

      <h2 className="text-2xl font-semibold">{assignment?.title}</h2>

      {/* To Grade Section */}
      <div>
        <h3 className="text-lg font-semibold mb-2">📝 To Grade</h3>
        {toGrade?.length > 0 ? (
          <div className="border rounded-md">
            {toGrade.map((s: StudentSubmission) => (
              <div key={s.studentId} className="border-b p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-gray-500">{s.sapId} • {s.email}</p>
                  <p className="text-sm">
                    Submitted: {new Date(s.submittedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-3 items-center">
                  {s.submissionFile && (
                    <a
                      href={`http://localhost:5001/api/files/${s.submissionFile}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      View File
                    </a>
                  )}
                  {s.submissionLink && (
                    <a
                      href={s.submissionLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      External Link
                    </a>
                  )}
                  <button
                    onClick={() => setSelectedStudent(s)}
                    className="btn-secondary"
                  >
                    Grade
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No submissions to grade.</p>
        )}
      </div>

      {/* Graded Section */}
      <div>
        <h3 className="text-lg font-semibold mt-6 mb-2">✅ Graded</h3>
        {graded?.length > 0 ? (
          <div className="border rounded-md">
            {graded.map((s: StudentSubmission) => (
              <div key={s.studentId} className="border-b p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-gray-500">{s.sapId} • {s.email}</p>
                  <p className="text-sm">Grade: <strong>{s.grade}</strong></p>
                  <p className="text-sm text-gray-600">Feedback: {s.feedback || "—"}</p>
                </div>
                <div className="flex gap-3 items-center">
                  {s.submissionFile && (
                    <a
                      href={`http://localhost:5001/api/files/${s.submissionFile}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      View File
                    </a>
                  )}
                  <button
                    onClick={() => setSelectedStudent(s)}
                    className="btn-secondary"
                  >
                    Edit Grade
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No graded submissions yet.</p>
        )}
      </div>

      {/* Grade Modal (To be implemented next) */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[400px] space-y-4">
            <h3 className="text-lg font-semibold">Grade: {selectedStudent.name}</h3>
            <input
              type="number"
              placeholder="Enter Grade"
              className="w-full border p-2 rounded"
            />
            <textarea
              placeholder="Enter Feedback"
              className="w-full border p-2 rounded"
            />
            <div className="flex justify-end gap-2">
              <button
                className="btn-secondary"
                onClick={() => setSelectedStudent(null)}
              >
                Cancel
              </button>
              <button className="btn-primary">Submit</button>
            </div>
          </div>
        </div>
      )}
      {editModalOpen && (
  <AssignmentFormModal
    isOpen={editModalOpen}
    onClose={() => setEditModalOpen(false)}
    existingAssignment={assignment}
    onSuccess={() => {
      // ✅ Refetch updated assignment
      const token = localStorage.getItem("token");
      fetch(`http://localhost:5001/api/assignments/${assignmentId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((data) => setAssignment(data))
        .finally(() => setEditModalOpen(false));
    }}
    existingAssignment={assignment} // assignment from your detail page state!

  />
)}

    </div>
  );
}

export default AssignmentDetailPage;
