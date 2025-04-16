import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  FileText,
  ClipboardCheck,
  Clock,
  AlertCircle,
  CheckCircle,
  Flag,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { toast } from "react-hot-toast";

const cn = (...classes: (string | undefined | false)[]): string => {
  return classes.filter(Boolean).join(" ");
};

type AssignmentStatus = "forecoming" | "pastdue" | "completed";

const TABS = [
  {
    key: "forecoming",
    label: "Upcoming",
    icon: Clock,
    color: "text-blue-500",
  },
  {
    key: "pastdue",
    label: "Past Due",
    icon: AlertCircle,
    color: "text-amber-500",
  },
  {
    key: "completed",
    label: "Completed",
    icon: CheckCircle,
    color: "text-emerald-500",
  },
];

function StudentAssignments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<AssignmentStatus>("forecoming");

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          "http://localhost:5001/api/assignments/student",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setAssignments(res.data || []);
      } catch (error) {
        console.error("Failed to fetch assignments", error);
        toast.error("Failed to load assignments");
      }
    };
    fetchAssignments();
  }, []);

  const filtered = assignments.filter((a) => {
    const now = new Date();
    const dueDate = new Date(a.dueDate);
    const submitted = a.submissions?.find((s: any) => s.student === user._id);

    if (activeTab === "completed") {
      return !!submitted;
    }
    if (activeTab === "pastdue") {
      return dueDate < now && !submitted;
    }
    return dueDate >= now && !submitted;
  });

  const getStatusBadge = (dueDate: Date, submitted: boolean) => {
    const now = new Date();
    const due = new Date(dueDate);

    if (submitted) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
          <CheckCircle className="mr-1 h-3 w-3" />
          Submitted
        </span>
      );
    }

    if (due < now) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          <AlertCircle className="mr-1 h-3 w-3" />
          Past Due
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <Clock className="mr-1 h-3 w-3" />
        Due Soon
      </span>
    );
  };

  return (
    <div
      // You can remove `max-w-7xl mx-auto px-4` if you want the cards to stretch
      // across the entire screen. Or keep them if you want some margin on larger screens.
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">My Assignments</h1>
          <p className="text-gray-600">
            {activeTab === "completed"
              ? "Your completed assignments"
              : activeTab === "pastdue"
              ? "Assignments that need your attention"
              : "Upcoming assignments"}
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as AssignmentStatus)}
                  className={cn(
                    "group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm",
                    activeTab === tab.key
                      ? `${tab.color} border-current`
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  <Icon className={cn("-ml-0.5 mr-2 h-5 w-5", tab.color)} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Assignment Cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No assignments
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {activeTab === "completed"
                ? "You haven't completed any assignments yet."
                : activeTab === "pastdue"
                ? "You're all caught up with no past due assignments!"
                : "No upcoming assignments at this time."}
            </p>
          </div>
        ) : (
          // Instead of max-w-2xl, make this w-full (or remove entirely) so cards are wider.
          <div className="grid w-full gap-5">
            {filtered.map((assignment) => {
              const submission = assignment.submissions?.find(
                (s: any) => s.student === user._id
              );
              const submittedDate = submission
                ? new Date(submission.submittedAt).toLocaleDateString()
                : null;
              const dueDate = new Date(assignment.dueDate);
              const daysLeft = Math.ceil(
                (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );

              return (
                <div
                  key={assignment._id}
                  className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigate(`/student/assignments/${assignment._id}`)}
                >
                  {/* Reduce the card padding from p-6 to p-4 to make it less tall */}
                  <div className="p-4 space-y-2">
                    {/* Status Badge */}
                    {getStatusBadge(assignment.dueDate, !!submission)}

                    {/* Title and Description */}
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 line-clamp-1">
                        {assignment.title}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                        {assignment.description}
                      </p>
                    </div>

                    {/* Due Date */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>
                        Due:{" "}
                        {dueDate.toLocaleDateString()} at{" "}
                        {dueDate.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Days Left / Submitted */}
                    <div className="pt-2">
                      {submittedDate ? (
                        <div className="flex items-center gap-2 text-sm text-emerald-600">
                          <ClipboardCheck className="h-4 w-4" />
                          <span>Submitted on {submittedDate}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm">
                          <Flag
                            className={cn(
                              "h-4 w-4",
                              daysLeft <= 3
                                ? "text-amber-500"
                                : "text-blue-500"
                            )}
                          />
                          <span
                            className={
                              daysLeft <= 3
                                ? "text-amber-600"
                                : "text-blue-600"
                            }
                          >
                            {daysLeft > 0
                              ? `${daysLeft} ${
                                  daysLeft === 1 ? "day" : "days"
                                } left`
                              : "Due today"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentAssignments;
