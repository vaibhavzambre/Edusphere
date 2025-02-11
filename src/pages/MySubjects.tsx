import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

const MySubjects = () => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const token = localStorage.getItem("token");
        let endpoint = "";
        if (user.role === "teacher") {
          endpoint = "http://localhost:5001/api/teacher/subjects";
        } else if (user.role === "student") {
          endpoint = "http://localhost:5001/api/student/subjects";
        } else {
          setError("Invalid role for fetching subjects");
          return;
        }
        const response = await fetch(endpoint, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.message || "Failed to fetch subjects");
        } else {
          setSubjects(data);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, [user.role]);

  if (loading) return <div>Loading subjects...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">My Subjects</h1>
      {subjects.length === 0 ? (
        <p>No subjects found.</p>
      ) : (
        <ul>
          {subjects.map((subject) => (
            <li key={subject._id} className="mb-4 p-4 border rounded">
              <p>
                <strong>Subject Name:</strong> {subject.subject_name}
              </p>
              <p>
                <strong>Subject Code:</strong> {subject.subject_code}
              </p>
              <p>
                <strong>Description:</strong> {subject.description}
              </p>
              <p>
                <strong>Max Hours:</strong> {subject.max_no_of_hours}
              </p>
              <p>
                <strong>Hours Conducted:</strong> {subject.hours_conducted}
              </p>
              <p>
                <strong>Semester:</strong> {subject.semester}
              </p>
              <p>
                <strong>Start Date:</strong>{" "}
                {new Date(subject.start_date).toLocaleDateString()}
              </p>
              <p>
                <strong>End Date:</strong>{" "}
                {new Date(subject.end_date).toLocaleDateString()}
              </p>
              {user.role === "teacher" && subject.class && (
                <>
                  <p>
                    <strong>Class Code:</strong> {subject.class.class_code}
                  </p>
                  <p>
                    <strong>Commencement Year:</strong>{" "}
                    {subject.class.commencement_year}
                  </p>
                </>
              )}
              {user.role === "student" && subject.teacher && (
                <p>
                  <strong>Teacher:</strong> {subject.teacher.name}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MySubjects;
