
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-16 h-16 bg-indigo-200 rounded-full mb-4"></div>
        <p className="text-gray-600 text-lg">Loading subjects...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 max-w-md bg-red-50 rounded-xl">
        <div className="text-red-600 text-5xl mb-4">!</div>
        <h2 className="text-xl font-semibold text-red-800 mb-2">Error occurred</h2>
        <p className="text-red-600">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">My Subjects</h1> {/* Black heading */}
        
        {subjects.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <p className="text-gray-500 text-lg">No subjects found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((subject) => (
              <div key={subject._id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6">
                <div className="space-y-4">
                <div className="border-b pb-4">
  <h2 className="text-xl font-semibold text-indigo-800">{subject.subject_name}</h2>
  {/* Added line above description */}
  {subject.description && (
    <div className="mt-2 pt-2 border-t">
      <p className="text-gray-600 text-sm">{subject.description}</p>
    </div>
  )}
</div>

                  <div className="space-y-2">
                    {/* Subject code moved here above semester */}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Subject Code</span>
                      <span className="font-medium text-gray-900">{subject.subject_code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Semester</span>
                      <span className="font-medium text-gray-900">{subject.semester}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Hours</span>
                      <span className="font-medium text-gray-900">
                        {subject.hours_conducted}/{subject.max_no_of_hours}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Duration</span>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {new Date(subject.start_date).toLocaleDateString()}
                        </p>
                        <p className="text-gray-400 text-xs">to</p>
                        <p className="font-medium text-gray-900">
                          {new Date(subject.end_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {user.role === "teacher" && subject.class && (
                    <div className="pt-4 border-t bg-indigo-50 -mx-6 px-6 py-4">
                      <h3 className="text-sm font-semibold text-indigo-800 mb-2">Class Details</h3>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Class Code</span>
                        <span className="font-medium text-gray-900">{subject.class.class_code}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Commencement Year</span>
                        <span className="font-medium text-gray-900">{subject.class.commencement_year}</span>
                      </div>
                    </div>
                  )}

                  {user.role === "student" && subject.teacher && (
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Teacher</span>
                        <span className="font-medium text-gray-900">{subject.teacher.name}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MySubjects;