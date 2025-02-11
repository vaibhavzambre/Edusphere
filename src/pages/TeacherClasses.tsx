import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

const TeacherClasses = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5001/api/teacher/classes", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.message || "Failed to fetch classes");
        } else {
          setClasses(data);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  if (loading) return <div>Loading classes...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">My Classes</h1>
      {classes.length === 0 ? (
        <p>No classes found.</p>
      ) : (
        <ul>
          {classes.map((cls) => (
            <li key={cls._id} className="mb-4 p-4 border rounded">
              <p>
                <strong>Class Code:</strong> {cls.class_code}
              </p>
              <p>
                <strong>Specialization:</strong> {cls.specialization}
              </p>
              <p>
                <strong>Course:</strong> {cls.course}
              </p>
              <p>
                <strong>Commencement Year:</strong> {cls.commencement_year}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TeacherClasses;
