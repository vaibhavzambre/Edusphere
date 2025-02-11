import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Edit, Trash, XCircle } from "lucide-react"; // Importing Icons

export default function ManageTeachers() {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<any>(null);
  const [editTeacher, setEditTeacher] = useState<any>(null);
  const [newTeacher, setNewTeacher] = useState({ name: "", email: "", password: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    name: "",
    email: "",
  });
  const filteredTeachers = teachers.filter((teacher) => {
    return (
      (!filters.name || teacher.name?.toLowerCase().includes(filters.name.toLowerCase())) &&
      (!filters.email || teacher.email?.toLowerCase().includes(filters.email.toLowerCase()))
    );
  });

  const clearFilters = () => {
    setFilters({
      name: "",
      email: "",
    });
  };
  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/auth/teachers", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch teachers");
      const data = await response.json();
      console.log("Fetched Teachers:", data);
      setTeachers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      setTeachers([]);
    }
  };

  const handleCreateTeacher = async () => {
    if (teachers.some((t) => t.email.toLowerCase() === newTeacher.email.toLowerCase())) {
      alert("Teacher with this email already exists.");
      return;
    }
    try {
      const response = await fetch("http://localhost:5001/api/auth/teachers/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ ...newTeacher, role: "teacher" }),
      });
      if (response.ok) {
        alert("Teacher created successfully");
        setNewTeacher({ name: "", email: "", password: "" });
        fetchTeachers();
        setShowModal(false);
      } else {
        const result = await response.json();
        alert(result.message);
      }
    } catch (error) {
      console.error("Error creating teacher:", error);
    }
  };

  const handleEditTeacher = (teacher: any) => {
    setEditTeacher(teacher);
    setEditModal(true);
  };

  const handleUpdateTeacher = async () => {
    if (
      teachers.some(
        (t) =>
          t._id !== editTeacher._id &&
          t.email.toLowerCase() === editTeacher.email.toLowerCase()
      )
    ) {
      alert("Another teacher with this email already exists.");
      return;
    }
    try {
      const response = await fetch(`http://localhost:5001/api/auth/teachers/update/${editTeacher._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(editTeacher),
      });
      if (response.ok) {
        alert("Teacher updated successfully");
        fetchTeachers();
        setEditModal(false);
      } else {
        const result = await response.json();
        alert(result.message);
      }
    } catch (error) {
      console.error("Error updating teacher:", error);
    }
  };

  const confirmDeleteTeacher = (teacher: any) => {
    setTeacherToDelete(teacher);
    setDeleteModal(true);
  };

  const handleDeleteTeacher = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/auth/teachers/delete/${teacherToDelete._id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.ok) {
        alert("Teacher deleted successfully");
        fetchTeachers();
        setDeleteModal(false);
      } else {
        const result = await response.json();
        alert(result.message);
      }
    } catch (error) {
      console.error("Error deleting teacher:", error);
    }
  };

  return (
    <div className="p-6">
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-96">
            <h3 className="text-lg font-semibold mb-2">Create New Teacher</h3>
            <input
              type="text"
              placeholder="Full Name"
              className="input-primary w-full mb-2"
              value={newTeacher.name}
              onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
            />
            <input
              type="email"
              placeholder="Email"
              className="input-primary w-full mb-2"
              value={newTeacher.email}
              onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
            />
            <input
              type="password"
              placeholder="Password"
              className="input-primary w-full mb-2"
              value={newTeacher.password}
              onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                Cancel
              </button>
              <button className="btn-primary" onClick={handleCreateTeacher}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
      {editModal && editTeacher && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-96">
            <h3 className="text-lg font-semibold mb-2">Edit Teacher</h3>
            <input
              type="text"
              placeholder="Full Name"
              className="input-primary w-full mb-2"
              value={editTeacher.name}
              onChange={(e) => setEditTeacher({ ...editTeacher, name: e.target.value })}
            />
            <input
              type="email"
              placeholder="Email"
              className="input-primary w-full mb-2"
              value={editTeacher.email}
              onChange={(e) => setEditTeacher({ ...editTeacher, email: e.target.value })}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setEditModal(false)} className="text-gray-500 hover:text-gray-700">
                Cancel
              </button>
              <button className="btn-primary" onClick={handleUpdateTeacher}>
                Update
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteModal && teacherToDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-96">
            <h3 className="text-lg font-semibold mb-2">Are you sure you want to delete?</h3>
            <p className="mb-4">
              Name: <strong>{teacherToDelete.name}</strong> <br />
              Email: <strong>{teacherToDelete.email}</strong>
            </p>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setDeleteModal(false)} className="text-gray-500 hover:text-gray-700">
                Cancel
              </button>
              <button className="btn-primary bg-red-500" onClick={handleDeleteTeacher}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold">Manage Teachers</h2>
        <div className="w-full md:w-auto flex flex-col md:flex-row gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 btn-secondary text-black border rounded-lg hover:bg-gray-100 transition-colors"
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="w-full md:w-auto px-4 py-2 btn-primary text-white rounded-lg hover:bg-indigo-800 transition-colors"
          >
            + Add Teacher
          </button>
        </div>
      </div>

      {/* 🔹 Filters UI */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg shadow-md mb-4 grid gap-4 grid-cols-1 sm:grid-cols-2">
          <input
            type="text"
            placeholder="Filter by Name"
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            className="input-primary"
          />
          <input
            type="text"
            placeholder="Filter by Email"
            value={filters.email}
            onChange={(e) => setFilters({ ...filters, email: e.target.value })}
            className="input-primary"
          />
          <button onClick={clearFilters} className="btn-secondary flex items-center">
            <XCircle className="h-5 w-5 mr-2" /> Clear Filters
          </button>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md mt-4 overflow-x-auto">
        <h3 className="text-lg font-semibold mb-2">All Teachers</h3>

        {filteredTeachers.length === 0 ? (
          <p className="text-gray-500">No teachers found.</p>
        ) : (<div className="w-full overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-100">
              <tr>
                {["Name", "Email", "Actions"].map((header) => (
                  <th key={header} className="p-3 text-left text-sm font-bold text-gray-800 md:whitespace-normal">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.map((teacher) => (
                <tr key={teacher._id} className="border-t odd:bg-gray-50 hover:bg-gray-100">
                  <td className="p-3 whitespace-nowrap">{teacher.name}</td>
                  <td className="p-3 whitespace-nowrap">{teacher.email}</td>
                  <td className="p-3 flex gap-3">
                    <Edit className="text-blue-500 cursor-pointer" onClick={() => handleEditTeacher(teacher)} />
                    <Trash className="text-red-500 cursor-pointer" onClick={() => confirmDeleteTeacher(teacher)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>)}

      </div>
    </div>
  );
}
