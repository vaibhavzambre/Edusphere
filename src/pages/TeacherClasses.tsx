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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-16 h-16 bg-indigo-200 rounded-full mb-4"></div>
        <p className="text-gray-600 text-lg">Loading classes...</p>
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
        <h1 className="text-3xl font-bold text-gray-800 mb-8">My Classes</h1>
        
        {classes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500 text-lg">No classes found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <div key={cls._id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-5">
                <div className="space-y-3">
                  {/* Header Section */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{cls.class_code}</h2>
                      <p className="text-sm text-indigo-600 font-medium mt-1">
                        {cls.specialization}
                      </p>
                    </div>
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                      {cls.commencement_year}
                    </span>
                  </div>
  
                  {/* Divider */}
                  <div className="border-t border-gray-100"></div>
  
                  {/* Details */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Course</span>
                      <span className="text-sm font-medium text-gray-900">
                        {cls.course}
                      </span>
                    </div>
                  </div>
  
                  {/* Additional Info (if needed later) */}
                  {/* <div className="pt-2">
                    <div className="text-xs text-gray-500">Last updated: 2 days ago</div>
                  </div> */}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherClasses;