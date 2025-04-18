import React, { useState, useEffect } from "react";
import { Plus, AlertCircle, CalendarClock, BookOpen, FileText, ClipboardCheck, ArrowRight } from "lucide-react";
import AssignmentFormModal from "../components/assignment/AssignmentFormModal";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

const cn = (...classes: (string | undefined | false)[]): string => {
  return classes.filter(Boolean).join(" ");
};

function TeacherAssignments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    
    const fetchAssignments = async () => {
      try {
        const res = await fetch("http://localhost:5001/api/assignments/teacher", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch assignments");
        const data = await res.json();
        setAssignments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching assignments:", err);
        toast.error("Failed to load assignments");
      }
    };
    
    fetchAssignments();
  }, []);

  const filteredAssignments = assignments.filter((assignment) => {
    const now = new Date();
    if (filter === "upcoming") return new Date(assignment.dueDate) > now;
    if (filter === "past") return new Date(assignment.dueDate) <= now;
    return true;
  });

  const getStatusStyle = (status) => {
    switch (status) {
      // case "Active": return "bg-emerald-100 text-emerald-700";
      // case "Draft": return "bg-amber-100 text-amber-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-gray-900">Assignments</h1>
          <p className="text-gray-600">Manage and track student submissions</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg transition-all"
        >
          <Plus size={20} />
          Create Assignment
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        {["all", "upcoming", "past"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              filter === f 
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Assignment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAssignments.map((assignment) => {
          const dueDate = new Date(assignment.dueDate);

          return (
            <div
              key={assignment._id}
              className="group relative border border-gray-200 rounded-xl bg-white hover:shadow-lg transition-all"
            >
              <div className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${getStatusStyle(assignment.status)}`}>
                      {assignment.status === "Draft" ? (
                        <FileText size={18} />
                      ) : (
                        <ClipboardCheck size={18} />
                      )}
                    </div>
                    <span className={cn(
                      "text-xs font-medium px-2 py-1 rounded-full",
                      getStatusStyle(assignment.status)
                    )}>
                      {/* {assignment.status || "Draft"} */}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(assignment.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Body */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">{assignment.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <BookOpen size={16} />
                    <span>{assignment.category || "General"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CalendarClock size={16} />
                    <span>Due: {dueDate.toLocaleDateString()} • {dueDate.toLocaleTimeString()}</span>
                  </div>
                  {/* <div className="text-sm text-gray-600">
                    Submissions: {assignment.submittedCount || 0}/{assignment.totalCount || 0}
                  </div> */}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => navigate(`/assignments/${assignment._id}`)}
                    className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View Details
                    <ArrowRight size={16} className="mt-0.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredAssignments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
          <AlertCircle size={40} className="text-gray-400" />
          <p className="text-gray-600 text-lg">No assignments found</p>
        </div>
      )}

      <AssignmentFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          const token = localStorage.getItem("token");
          if (!token) return;
          fetch("http://localhost:5001/api/assignments/teacher", {
            headers: { Authorization: `Bearer ${token}` }
          })
            .then(res => res.json())
            .then(data => setAssignments(Array.isArray(data) ? data : []))
            .catch(console.error);
        }}
      />
    </div>
  );
}

export default TeacherAssignments;