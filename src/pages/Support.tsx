// File: src/pages/Support.tsx

import React, { useState, useEffect } from "react";
import { AlertCircle, Send, Plus, Loader2, Paperclip } from "lucide-react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const departments = [
  { id: "academic", name: "Academic Affairs" },
  { id: "technical", name: "Technical Support" },
  { id: "finance", name: "Finance Department" },
  { id: "library", name: "Library Services" },
  { id: "career", name: "Career Services" },
];

const priorities = [
  { value: "low", label: "Low Priority" },
  { value: "medium", label: "Medium Priority" },
  { value: "high", label: "High Priority" },
  { value: "urgent", label: "Urgent" },
];

interface Reply {
  message: string;
  fromDepartment: boolean;
  timestamp: string;
}

interface Ticket {
  _id: string;
  subject: string;
  department: string;
  priority: string;
  description: string;
  status: "pending" | "in-progress" | "closed";
  attachments: string[];
  replies: Reply[];
  createdAt: string;
}

export default function Support() {
  const { user } = useAuth();
  const token = user?.token;
  const [formData, setFormData] = useState({
    department: "",
    subject: "",
    description: "",
    priority: "medium",
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchTickets = async () => {
    try {
      const res = await axios.get("/api/support/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      // Ensure it's an array
      const data = Array.isArray(res.data) ? res.data : [];
      setTickets(data);
    } catch (err) {
      console.error("Failed to fetch tickets", err);
      setTickets([]); // fallback to empty array to prevent crashes
    }
  };
  

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const form = new FormData();
      form.append("department", formData.department);
      form.append("subject", formData.subject);
      form.append("description", formData.description);
      form.append("priority", formData.priority);
      attachments.forEach((file) => form.append("attachments", file));

      await axios.post("/api/support", form, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setShowModal(false);
      setFormData({
        department: "",
        subject: "",
        description: "",
        priority: "medium",
      });
      setAttachments([]);
      fetchTickets();
    } catch (err) {
      console.error("Error submitting ticket", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString();

  const statusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "in-progress": return "bg-blue-100 text-blue-800";
      case "closed": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };
  console.log("Tickets fetched:", tickets);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Support Center</h1>
          <p className="mt-1 text-gray-600">Submit and track your help tickets.</p>
        </div>
        <button
          className="btn-primary flex items-center space-x-2"
          onClick={() => setShowModal(true)}
        >
          <Plus className="w-4 h-4" />
          <span>New Ticket</span>
        </button>
      </div>

      {/* ======================= Modal ======================= */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Raise a New Ticket</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  required
                  className="input-primary mt-1 w-full"
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Subject</label>
                <input
                  type="text"
                  className="input-primary mt-1 w-full"
                  placeholder="Brief issue subject"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="input-primary mt-1 w-full"
                >
                  {priorities.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  rows={4}
                  className="input-primary mt-1 w-full"
                  placeholder="Detailed issue description"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 flex items-center">
                  <Paperclip className="w-4 h-4 mr-2" />
                  Attach Files
                </label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                />
              </div>

              {formData.priority === "urgent" && (
                <div className="p-3 rounded bg-red-50 flex items-start space-x-2 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5" />
                  <p>Your issue will be flagged as urgent to the department.</p>
                </div>
              )}

              <div className="flex justify-end space-x-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex items-center space-x-2">
                  {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
                  <span>Submit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= Ticket List ======================= */}
      <div className="mt-10 space-y-4">
        {tickets.length === 0 ? (
          <p className="text-gray-500 text-center mt-10">No tickets raised yet.</p>
        ) : (
          tickets.map((ticket) => (
            <div
              key={ticket._id}
              className="border border-gray-200 rounded-lg px-4 py-3 shadow-sm bg-white"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-md font-medium text-gray-800">{ticket.subject}</p>
                  <p className="text-sm text-gray-500 mb-1">
                    {ticket.department.toUpperCase()} | {formatDate(ticket.createdAt)}
                  </p>

                  {ticket.attachments?.length > 0 && (
                    <div className="mt-1 space-y-1">
                      <p className="text-sm font-medium text-gray-700">Attachments:</p>
                      <ul className="ml-4 list-disc space-y-1 text-sm text-blue-600">
                        {ticket.attachments.map((fileId, index) => (
                          <li key={index}>
                            <a
                              href={`http://localhost:5001/api/attachments/${fileId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              Download File {index + 1}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* ===== NEW: Replies Section ===== */}
                  {ticket.replies?.length > 0 && (
                    <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-sm font-semibold text-gray-700 mb-1">Replies:</p>
                      <ul className="text-sm space-y-2">
                        {ticket.replies.map((reply, i) => (
                          <li key={i} className="border-l-2 pl-2 border-blue-500">
                            <p className="text-gray-800">
                              <span className="font-semibold">
                                {reply.fromDepartment ? "Department:" : "You:"}
                              </span>{" "}
                              {reply.message}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(reply.timestamp).toLocaleString()}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <span className={`text-xs px-3 py-1 rounded-full font-semibold h-fit ${statusColor(ticket.status)}`}>
                  {ticket.status.toUpperCase()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
