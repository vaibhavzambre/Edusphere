// UPDATED: Modified fetchClasses to handle 404 responses and treat them as an empty array.
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Trash, Edit, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface NewStudent {
  name: string;
  email: string;
  password: string;
  reg_id: string;
  class_code: string;
  commencement_year: string;
}

export default function ManageStudents() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<any>(null);
  const [editStudent, setEditStudent] = useState<any>(null);
  const [showNoClassModal, setShowNoClassModal] = useState(false); // NEW state for no-class modal

  const [newStudent, setNewStudent] = useState<NewStudent>({
    name: "",
    email: "",
    password: "",
    reg_id: "",
    class_code: "",
    commencement_year: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    name: "",
    email: "",
    sap_id: "",
    reg_id: "",
    class_code: "",
    course: "",
    specialization: "",
    year: "",
  });

  const navigate = useNavigate();

  // Filter students based on multiple fields
  const filteredStudents = students.filter((student) => {
    return (
      (!filters.name ||
        student.name?.toLowerCase().includes(filters.name.toLowerCase())) &&
      (!filters.email ||
        student.email?.toLowerCase().includes(filters.email.toLowerCase())) &&
      (!filters.sap_id ||
        student.profile?.sap_id?.toString().includes(filters.sap_id)) &&
      (!filters.reg_id ||
        student.profile?.reg_id?.toString().includes(filters.reg_id)) &&
      (!filters.class_code ||
        student.profile.class?.class_code
          ?.toString()
          .includes(filters.class_code)) &&
      (!filters.course ||
        student.profile.class?.course
          ?.toLowerCase()
          .includes(filters.course.toLowerCase())) &&
      (!filters.specialization ||
        student.profile.class?.specialization
          ?.toLowerCase()
          .includes(filters.specialization.toLowerCase())) &&
      (!filters.year ||
        student.profile.class?.commencement_year
          ?.toString()
          .includes(filters.year))
    );
  });

  const clearFilters = () => {
    setFilters({
      name: "",
      email: "",
      sap_id: "",
      reg_id: "",
      class_code: "",
      course: "",
      specialization: "",
      year: "",
    });
  };

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/classes");
      // UPDATED: If 404, treat it as no classes available.
      if (response.ok) {
        const data = await response.json();
        setClasses(data);
      } else if (response.status === 404) {
        setClasses([]);
      } else {
        console.error("Error fetching classes:", response.statusText);
        setClasses([]);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
      setClasses([]);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/auth/students", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch students");
      const data = await response.json();
      setStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching students:", error);
      setStudents([]);
    }
  };

  const computeSapId = (
    class_code: string,
    commencement_year: string,
    reg_id: string
  ): number => {
    const classCodeNum = Number(class_code);
    const commencementYearNum = Number(commencement_year);
    const trailingTwo = commencementYearNum.toString().slice(-2);
    const paddedRegId = reg_id.padStart(5, "0");
    const compositeStr = classCodeNum.toString() + trailingTwo + paddedRegId;
    return Number(compositeStr);
  };

  const handleCreateStudent = async () => {
    if (!newStudent.class_code || !newStudent.commencement_year) {
      alert("Please select a valid Class Code and Commencement Year.");
      return;
    }
    const newSapId = computeSapId(
      newStudent.class_code,
      newStudent.commencement_year,
      newStudent.reg_id
    );
    if (
      students.some(
        (student) => student.profile && student.profile.sap_id === newSapId
      )
    ) {
      alert(
        "A student with this registration (and thus SAP ID) already exists for the given class."
      );
      return;
    }
    try {
      const response = await fetch(
        "http://localhost:5001/api/auth/students/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            ...newStudent,
            reg_id: Number(newStudent.reg_id),
            role: "student",
          }),
        }
      );
      if (response.ok) {
        alert("Student created successfully");
        setNewStudent({
          name: "",
          email: "",
          password: "",
          reg_id: "",
          class_code: "",
          commencement_year: "",
        });
        fetchStudents();
        setShowModal(false);
      } else {
        const result = await response.json();
        alert(result.message);
      }
    } catch (error) {
      console.error("Error creating student:", error);
    }
  };

  const handleEditStudent = (student: any) => {
    setEditStudent({
      ...student,
      profile: {
        ...student.profile,
        class_code: student.profile?.class?.class_code || "",
        commencement_year: student.profile?.class?.commencement_year || "",
        reg_id: student.profile?.reg_id
          ? student.profile.reg_id.toString()
          : "",
      },
    });
    setEditModal(true);
  };

  const handleUpdateStudent = async () => {
    if (
      !editStudent.profile.class_code ||
      !editStudent.profile.commencement_year
    ) {
      alert("Please select a valid Class Code and Commencement Year.");
      return;
    }
    const updatedSapId = computeSapId(
      editStudent.profile.class_code,
      editStudent.profile.commencement_year,
      editStudent.profile.reg_id
    );
    if (
      students.some(
        (student) =>
          student._id !== editStudent._id &&
          student.profile &&
          student.profile.sap_id === updatedSapId
      )
    ) {
      alert(
        "Another student with this registration (SAP ID) already exists for the given class."
      );
      return;
    }
    try {
      const updatedPayload = {
        ...editStudent,
        profile: {
          ...editStudent.profile,
          reg_id: Number(editStudent.profile.reg_id),
        },
      };
      const response = await fetch(
        `http://localhost:5001/api/auth/students/update/${editStudent._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(updatedPayload),
        }
      );
      if (response.ok) {
        alert("Student updated successfully");
        fetchStudents();
        setEditModal(false);
      } else {
        const result = await response.json();
        alert(result.message);
      }
    } catch (error) {
      console.error("Error updating student:", error);
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditStudent((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleEditProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditStudent((prev: any) => ({
      ...prev,
      profile: { ...prev.profile, [name]: value },
    }));
  };

  const confirmDeleteStudent = (student: any) => {
    setStudentToDelete(student);
    setDeleteModal(true);
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      const response = await fetch(
        `http://localhost:5001/api/auth/students/delete/${studentToDelete._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (response.ok) {
        alert("Student deleted successfully");
        fetchStudents();
        setDeleteModal(false);
      }
    } catch (error) {
      console.error("Error deleting student:", error);
    }
  };

  return (
    <div className="p-6">
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-96">
            <h3 className="text-lg font-semibold mb-2">Create New Student</h3>
            <input
              type="text"
              placeholder="Full Name"
              className="input-primary w-full mb-2"
              value={newStudent.name}
              onChange={(e) =>
                setNewStudent({ ...newStudent, name: e.target.value })
              }
            />
            <input
              type="email"
              placeholder="Email"
              className="input-primary w-full mb-2"
              value={newStudent.email}
              onChange={(e) =>
                setNewStudent({ ...newStudent, email: e.target.value })
              }
            />
            <input
              type="password"
              placeholder="Password"
              className="input-primary w-full mb-2"
              value={newStudent.password}
              onChange={(e) =>
                setNewStudent({ ...newStudent, password: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Registration ID (5 digits)"
              className="input-primary w-full mb-2"
              value={newStudent.reg_id}
              onChange={(e) =>
                setNewStudent({ ...newStudent, reg_id: e.target.value })
              }
              pattern="\d{5}"
              maxLength={5}
              inputMode="numeric"
            />
            <select
              className="input-primary w-full mb-2"
              value={newStudent.class_code}
              onChange={(e) => {
                const selectedClassCode = e.target.value;
                setNewStudent({
                  ...newStudent,
                  class_code: selectedClassCode,
                  commencement_year: "",
                });
              }}
            >
              <option value="">Select Class Code</option>
              {Array.from(new Set(classes.map((c: any) => c.class_code))).map(
                (classCode) => (
                  <option key={classCode} value={classCode}>
                    {classCode}
                  </option>
                )
              )}
            </select>
            <select
              className="input-primary w-full mb-2"
              value={newStudent.commencement_year}
              onChange={(e) => {
                const selectedYear = e.target.value;
                setNewStudent((prev) => ({
                  ...prev,
                  commencement_year: selectedYear,
                }));
              }}
              disabled={!newStudent.class_code}
            >
              <option value="">Select Commencement Year</option>
              {newStudent.class_code &&
                Array.from(
                  new Set(
                    classes
                      .filter(
                        (c: any) =>
                          c.class_code.toString() === newStudent.class_code
                      )
                      .map((c: any) => c.commencement_year)
                  )
                ).map((year) => (
                  <option key={year as string} value={year as string}>
                    {year}
                  </option>
                ))}
            </select>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button className="btn-primary" onClick={handleCreateStudent}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
      {editModal && editStudent && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-96">
            <h3 className="text-lg font-semibold mb-2">Edit Student</h3>
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              className="input-primary w-full mb-2"
              value={editStudent.name}
              onChange={handleEditChange}
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              className="input-primary w-full mb-2"
              value={editStudent.email}
              onChange={handleEditChange}
            />
            <input
              type="text"
              name="reg_id"
              placeholder="Registration ID (5 digits)"
              className="input-primary w-full mb-2"
              value={editStudent.profile?.reg_id || ""}
              onChange={handleEditProfileChange}
              pattern="\d{5}"
              maxLength={5}
              inputMode="numeric"
            />
            <select
              className="input-primary w-full mb-2"
              value={editStudent.profile?.class_code || ""}
              onChange={(e) =>
                setEditStudent((prev: any) => ({
                  ...prev,
                  profile: {
                    ...prev.profile,
                    class_code: e.target.value,
                  },
                }))
              }
            >
              <option value="">Select Class Code</option>
              {Array.from(new Set(classes.map((c: any) => c.class_code))).map(
                (classCode) => (
                  <option key={classCode} value={classCode}>
                    {classCode}
                  </option>
                )
              )}
            </select>
            <select
              className="input-primary w-full mb-2"
              value={editStudent.profile?.commencement_year || ""}
              onChange={(e) =>
                setEditStudent((prev: any) => ({
                  ...prev,
                  profile: {
                    ...prev.profile,
                    commencement_year: e.target.value,
                  },
                }))
              }
              disabled={!editStudent.profile?.class_code}
            >
              <option value="">Select Commencement Year</option>
              {editStudent.profile?.class_code &&
                Array.from(
                  new Set(
                    classes
                      .filter(
                        (c: any) =>
                          c.class_code.toString() ===
                          editStudent.profile.class_code.toString()
                      )
                      .map((c: any) => c.commencement_year)
                  )
                ).map((year) => (
                  <option key={year as string} value={year as string}>
                    {year}
                  </option>
                ))}
            </select>
            <div className="input-primary w-full mb-2 p-2 bg-gray-100">
              <strong>Current Class:</strong>{" "}
              {editStudent.profile?.class
                ? `${editStudent.profile.class.class_code} / ${editStudent.profile.class.commencement_year}`
                : "N/A"}
              <br />
              {editStudent.profile?.class && (
                <small>
                  {editStudent.profile.class.course} -{" "}
                  {editStudent.profile.class.specialization}
                </small>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setEditModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button className="btn-primary" onClick={handleUpdateStudent}>
                Update
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteModal && studentToDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-96">
            <h3 className="text-lg font-semibold mb-2">
              Are you sure you want to delete this student?
            </h3>
            <p className="mb-4">
              Name: <strong>{studentToDelete.name}</strong> <br />
              Class Code:{" "}
              <strong>
                {studentToDelete.profile?.class?.class_code || "N/A"}
              </strong>{" "}
              <br />
              Commencement Year:{" "}
              <strong>
                {studentToDelete.profile?.class?.commencement_year || "N/A"}
              </strong>{" "}
              <br />
              SAP ID:{" "}
              <strong>{studentToDelete.profile?.sap_id || "N/A"}</strong>
            </p>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setDeleteModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                className="btn-primary bg-red-500"
                onClick={handleDeleteStudent}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* NEW: No-Class Modal */}
      {showNoClassModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-96">
            <h3 className="text-lg font-semibold mb-2">No Classes Available</h3>
            <p className="mb-4">
              Currently no class exists. You need at least one class to be able to add a new student.
            </p>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowNoClassModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  console.log("Navigating to ManageClasses");
                  setShowNoClassModal(false);
                  window.location.href = "/ManageClasses"; // Force redirect
                }}
              >
                Create Class
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
        <h2 className="text-2xl font-bold">Manage Students</h2>
        <div className="w-full md:w-auto flex flex-col md:flex-row gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 btn-secondary text-black border rounded-lg hover:bg-gray-100 transition-colors"
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
          <button
            onClick={() => {
              if (classes.length === 0) {
                setShowNoClassModal(true);
              } else {
                setShowModal(true);
              }
            }}
            className="w-full md:w-auto px-4 py-2 btn-primary text-white rounded-lg hover:bg-indigo-800 transition-colors"
          >
            + Add Student
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg shadow-md mb-4 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
          <input
            type="text"
            placeholder="Filter by SAP ID"
            value={filters.sap_id}
            onChange={(e) => setFilters({ ...filters, sap_id: e.target.value })}
            className="input-primary"
          />
          <input
            type="text"
            placeholder="Filter by Course"
            value={filters.course}
            onChange={(e) => setFilters({ ...filters, course: e.target.value })}
            className="input-primary"
          />
          <input
            type="text"
            placeholder="Filter by Specialization"
            value={filters.specialization}
            onChange={(e) =>
              setFilters({ ...filters, specialization: e.target.value })
            }
            className="input-primary"
          />
          <input
            type="text"
            placeholder="Filter by Reg ID"
            value={filters.reg_id}
            onChange={(e) => setFilters({ ...filters, reg_id: e.target.value })}
            className="input-primary"
          />
          <input
            type="text"
            placeholder="Filter by Class Code"
            value={filters.class_code}
            onChange={(e) =>
              setFilters({ ...filters, class_code: e.target.value })
            }
            className="input-primary"
          />
          <input
            type="text"
            placeholder="Filter by Year"
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            className="input-primary"
          />
          <button
            onClick={clearFilters}
            className="btn-secondary flex items-center"
          >
            <XCircle className="h-5 w-5 mr-2" /> Clear Filters
          </button>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md mt-4 overflow-x-auto">
        <h3 className="text-lg font-semibold mb-2">All Students</h3>
        {students.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No students present.</p>
        ) : filteredStudents.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No matching students found.
          </p>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  {[
                    "Name",
                    "Email",
                    "Reg ID",
                    "SAP ID",
                    "Class Code",
                    "Commencement Year",
                    "Course",
                    "Specialization",
                    "Actions",
                  ].map((header) => (
                    <th
                      key={header}
                      className="p-3 text-left text-sm font-bold text-gray-800 md:whitespace-normal"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr
                    key={student._id}
                    className="border-t odd:bg-gray-50 hover:bg-gray-100"
                  >
                    <td className="p-3 whitespace-nowrap">{student.name}</td>
                    <td className="p-3 whitespace-nowrap">{student.email}</td>
                    <td className="p-3 whitespace-nowrap">
                      {student.profile?.reg_id || "N/A"}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {student.profile?.sap_id || "N/A"}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {student.profile?.class?.class_code || "N/A"}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {student.profile?.class?.commencement_year || "N/A"}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {student.profile?.class?.course || "N/A"}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {student.profile?.class?.specialization || "N/A"}
                    </td>
                    <td className="p-3 flex gap-3">
                      <Edit
                        className="text-blue-500 cursor-pointer"
                        onClick={() => handleEditStudent(student)}
                      />
                      <Trash
                        className="text-red-500 cursor-pointer"
                        onClick={() => confirmDeleteStudent(student)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
