import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Edit, Trash } from "lucide-react"; // ✅ Importing Icons

export default function ManageTeachers() {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  // Changed teacherToDelete to hold the entire teacher object instead of just the ID.
  const [teacherToDelete, setTeacherToDelete] = useState<any>(null);
  const [editTeacher, setEditTeacher] = useState<any>(null);

  const [newTeacher, setNewTeacher] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    fetchTeachers();
  }, []);

  // ✅ Fetch Teachers from Backend
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

  // ✅ Create Teacher Function with Duplicate Check
  const handleCreateTeacher = async () => {
    // Check if a teacher with the same email already exists (case-insensitive).
    if (teachers.some((t) => t.email.toLowerCase() === newTeacher.email.toLowerCase())) {
      alert("Teacher with this email already exists.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5001/api/auth/teachers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  // ✅ Open Edit Teacher Modal
  const handleEditTeacher = (teacher: any) => {
    setEditTeacher(teacher);
    setEditModal(true);
  };

  // ✅ Update Teacher Function with Duplicate Check
  const handleUpdateTeacher = async () => {
    // Check if another teacher with the same email exists (case-insensitive).
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
        headers: { "Content-Type": "application/json" },
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

  // ✅ Open Delete Confirmation Modal and set the teacher object
  const confirmDeleteTeacher = (teacher: any) => {
    setTeacherToDelete(teacher);
    setDeleteModal(true);
  };

  // ✅ Delete Teacher Function
  const handleDeleteTeacher = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/auth/teachers/delete/${teacherToDelete._id}`, {
        method: "DELETE",
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
      <h2 className="text-2xl font-bold mb-4">Manage Teachers</h2>

      {/* 🔹 Add Teacher Button */}
      <button onClick={() => setShowModal(true)} className="btn-primary">
        + Add Teacher
      </button>

      {/* 🔹 Add Teacher Modal */}
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

      {/* 🔹 Edit Teacher Modal */}
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

      {/* 🔹 Delete Confirmation Modal */}
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

      {/* 🔹 List of Teachers */}
      <div className="bg-white p-6 rounded-lg shadow-md mt-4">
        <h3 className="text-lg font-semibold mb-2">All Teachers</h3>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((teacher) => (
              <tr key={teacher._id} className="border-t">
                <td className="p-2">{teacher.name}</td>
                <td className="p-2">{teacher.email}</td>
                <td className="p-2 flex space-x-3">
                  <Edit className="text-blue-500 cursor-pointer" onClick={() => handleEditTeacher(teacher)} />
                  <Trash className="text-red-500 cursor-pointer" onClick={() => confirmDeleteTeacher(teacher)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
