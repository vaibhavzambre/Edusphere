import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Edit, Trash } from "lucide-react";

export default function ManageClasses() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [newClass, setNewClass] = useState({
    class_code: "",
    specialization: "",
    course: "",
    commencement_year: "",
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/classes", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch classes");
      const data = await response.json();
      setClasses(data);
    } catch (error: any) {
      console.error("Error fetching classes:", error);
      alert("Error fetching classes: " + error.message);
      setClasses([]);
    }
  };

  const handleCreateClass = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/classes/create", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(newClass),
      });
      const result = await response.json();
      if (response.ok) {
        alert("Class created successfully");
        setNewClass({ class_code: "", specialization: "", course: "", commencement_year: "" });
        fetchClasses();
        setShowModal(false);
      } else {
        alert("Error creating class: " + result.message);
      }
    } catch (error: any) {
      console.error("Error creating class:", error);
      alert("Error creating class: " + error.message);
    }
  };

  const handleEditClass = (classData: any) => {
    setSelectedClass(classData);
    setEditModal(true);
  };

  const handleUpdateClass = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/classes/update/${selectedClass._id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(selectedClass),
      });
      const result = await response.json();
      if (response.ok) {
        alert("Class updated successfully");
        fetchClasses();
        setEditModal(false);
      } else {
        alert("Error updating class: " + result.message);
      }
    } catch (error: any) {
      console.error("Error updating class:", error);
      alert("Error updating class: " + error.message);
    }
  };

  const handleDeleteClass = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:5001/api/classes/delete/${id}`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const result = await response.json();
      if (response.ok) {
        alert("Class deleted successfully");
        fetchClasses();
      } else {
        alert("Error deleting class: " + result.message);
      }
    } catch (error: any) {
      console.error("Error deleting class:", error);
      alert("Error deleting class: " + error.message);
    }
  };

  const confirmDeleteClass = (classData: any) => {
    setSelectedClass(classData);
    setDeleteModal(true);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Manage Classes</h2>
      <button onClick={() => setShowModal(true)} className="btn-primary">
        + Add Class
      </button>
      {/* Add Class Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-96">
            <h3 className="text-lg font-semibold mb-2">Create New Class</h3>
            <input
              type="text"
              inputMode="numeric"
              pattern="^\d{4}$"
              maxLength={4}
              placeholder="Class Code (4 digits)"
              className="input-primary w-full mb-2"
              value={newClass.class_code}
              onChange={(e) => setNewClass({ ...newClass, class_code: e.target.value })}
              title="Please enter exactly 4 digits."
            />
            <input
              type="text"
              placeholder="Specialization"
              className="input-primary w-full mb-2"
              value={newClass.specialization}
              onChange={(e) => setNewClass({ ...newClass, specialization: e.target.value })}
            />
            <input
              type="text"
              placeholder="Course"
              className="input-primary w-full mb-2"
              value={newClass.course}
              onChange={(e) => setNewClass({ ...newClass, course: e.target.value })}
            />
            <input
              type="text"
              inputMode="numeric"
              pattern="^\d{4}$"
              maxLength={4}
              placeholder="Commencement Year (4 digits)"
              className="input-primary w-full mb-2"
              value={newClass.commencement_year}
              onChange={(e) => setNewClass({ ...newClass, commencement_year: e.target.value })}
              title="Please enter exactly 4 digits."
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">Cancel</button>
              <button className="btn-primary" onClick={handleCreateClass}>Create</button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Class Modal */}
      {editModal && selectedClass && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-96">
            <h3 className="text-lg font-semibold mb-2">Edit Class</h3>
            <input
              type="text"
              inputMode="numeric"
              pattern="^\d{4}$"
              maxLength={4}
              placeholder="Class Code (4 digits)"
              className="input-primary w-full mb-2"
              value={selectedClass.class_code}
              onChange={(e) => setSelectedClass({ ...selectedClass, class_code: e.target.value })}
              title="Please enter exactly 4 digits."
            />
            <input
              type="text"
              placeholder="Specialization"
              className="input-primary w-full mb-2"
              value={selectedClass.specialization}
              onChange={(e) => setSelectedClass({ ...selectedClass, specialization: e.target.value })}
            />
            <input
              type="text"
              placeholder="Course"
              className="input-primary w-full mb-2"
              value={selectedClass.course}
              onChange={(e) => setSelectedClass({ ...selectedClass, course: e.target.value })}
            />
            <input
              type="text"
              inputMode="numeric"
              pattern="^\d{4}$"
              maxLength={4}
              placeholder="Commencement Year (4 digits)"
              className="input-primary w-full mb-2"
              value={selectedClass.commencement_year}
              onChange={(e) => setSelectedClass({ ...selectedClass, commencement_year: e.target.value })}
              title="Please enter exactly 4 digits."
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setEditModal(false)} className="text-gray-500 hover:text-gray-700">Cancel</button>
              <button className="btn-primary" onClick={handleUpdateClass}>Update</button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteModal && selectedClass && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-96">
            <h3 className="text-lg font-semibold mb-2">Are you sure you want to delete this class?</h3>
            <p className="mb-4">
              Class Code: <strong>{selectedClass.class_code}</strong> | Commencement Year: <strong>{selectedClass.commencement_year}</strong>
            </p>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setDeleteModal(false)} className="text-gray-500 hover:text-gray-700">Cancel</button>
              <button className="btn-primary bg-red-500" onClick={() => {
                  handleDeleteClass(selectedClass._id);
                  setDeleteModal(false);
                }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* List of Classes */}
      <div className="bg-white p-6 rounded-lg shadow-md mt-4">
        <h3 className="text-lg font-semibold mb-2">All Classes</h3>
        {Array.isArray(classes) && classes.length > 0 ? (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Class Code</th>
                <th className="p-2 text-left">Specialization</th>
                <th className="p-2 text-left">Course</th>
                <th className="p-2 text-left">Commencement Year</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((classItem) => (
                <tr key={classItem._id} className="border-t">
                  <td className="p-2">{classItem.class_code}</td>
                  <td className="p-2">{classItem.specialization}</td>
                  <td className="p-2">{classItem.course}</td>
                  <td className="p-2">{classItem.commencement_year}</td>
                  <td className="p-2 flex space-x-3">
                    <Edit className="text-blue-500 cursor-pointer" onClick={() => handleEditClass(classItem)} />
                    <Trash className="text-red-500 cursor-pointer" onClick={() => confirmDeleteClass(classItem)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500 text-center py-4">No classes found.</p>
        )}
      </div>
    </div>
  );
}
