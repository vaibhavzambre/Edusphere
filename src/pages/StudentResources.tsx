import React, { useState, useEffect } from "react";
import axios from "axios";
import { Download } from "lucide-react";

const BASE_URL = "http://localhost:5001";

const StudentResourcesPage = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingResources, setLoadingResources] = useState(false);
  const [error, setError] = useState("");

  // Fetch student subjects on mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoadingSubjects(true);
        const token = localStorage.getItem("token");
        const { data } = await axios.get(`${BASE_URL}/api/student/subjects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSubjects(data);
      } catch (err) {
        setError("Failed to fetch subjects");
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, []);

  // Fetch resources available to the student on mount
  useEffect(() => {
    const fetchResources = async () => {
      try {
        setLoadingResources(true);
        const token = localStorage.getItem("token");
        const { data } = await axios.get(`${BASE_URL}/api/resources/student`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setResources(data);
      } catch (err) {
        setError("Failed to fetch resources");
      } finally {
        setLoadingResources(false);
      }
    };
    fetchResources();
  }, []);

  // If a subject is selected, filter resources by subject._id.
  // Otherwise, show only public resources.
  const displayedResources = selectedSubject
    ? resources.filter(
        (res) => res.subject && res.subject._id === selectedSubject
      )
    : resources.filter((res) => res.visibility === "public");

  // Helper: Deduplicate files (using file_id)
  const getUniqueFiles = (files: any[]) => {
    const unique = new Map();
    files.forEach((file) => {
      if (!unique.has(file.file_id)) {
        unique.set(file.file_id, file);
      }
    });
    return Array.from(unique.values());
  };

  // Download all files for a given resource.
  const downloadAllFiles = (resource: any) => {
    const uniqueFiles = getUniqueFiles(resource.files || []);
    uniqueFiles.forEach((file: any) => {
      window.open(`${BASE_URL}/api/resources/download/${file.file_id}`, "_blank");
    });
  };

  // Format date/time in Mumbai timezone (Asia/Kolkata) with both date and time.
  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">
      {error && <div className="text-red-500">{error}</div>}

      {selectedSubject === null ? (
        <>
          <h1 className="text-3xl font-bold text-gray-800 mb-8">Subjects</h1>
          {loadingSubjects ? (
            <div className="text-blue-500">Loading subjects...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {subjects.map((subject) => (
                <div
                  key={subject._id}
                  onClick={() => setSelectedSubject(subject._id)}
                  className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow transform hover:scale-105 cursor-pointer"
                >
                  <div className="flex items-center justify-center w-12 h-12 bg-indigo-50 rounded-lg mb-4">
                    <span className="text-xl font-bold text-indigo-600">
                      {subject.subject_name.charAt(0)}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold text-indigo-800">
                    {subject.subject_name}
                  </h2>
                  {subject.description && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-gray-600 text-sm">
                        {subject.description}
                      </p>
                    </div>
                  )}
                  {subject.teacher && (
                    <div className="mt-1">
                      <p className="text-sm text-gray-500">
                        Teacher: {subject.teacher.name}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <button
            onClick={() => setSelectedSubject(null)}
            className="mb-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
          >
            <span>←</span>
            <span>Back to Subjects</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-800 mb-8">Resources</h1>
          {loadingResources ? (
            <div className="text-blue-500">Loading resources...</div>
          ) : displayedResources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedResources.map((resource) => {
                const uniqueFiles = getUniqueFiles(resource.files || []);
                return (
                  <div
                    key={resource._id}
                    className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow flex flex-col h-full"
                    style={{ minHeight: "350px" }}
                  >
                    <div className="border-b pb-4">
                      <h3 className="text-xl font-semibold text-indigo-800 mb-1">
                        {resource.description}
                      </h3>
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-gray-600 text-sm">
                          {formatDateTime(resource.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex-1 mt-4">
                      {uniqueFiles.length > 0 ? (
                        <>
                          <div className="text-sm text-gray-500 mb-1">
                            Total files: {uniqueFiles.length}
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-2">
                            {uniqueFiles.map((file: any, index: number) => (
                              <div
                                key={file.file_id}
                                className="flex items-center justify-between p-1 border border-gray-100 hover:border-blue-500 rounded"
                              >
                                <span className="font-bold text-gray-700 mr-1">
                                  {index + 1}.
                                </span>
                                <span className="flex-1 ml-2">
                                  {file.filename}
                                </span>
                                <button
                                  onClick={() =>
                                    window.open(
                                      `${BASE_URL}/api/resources/download/${file.file_id}`,
                                      "_blank"
                                    )
                                  }
                                  className="text-indigo-600 hover:text-indigo-900 p-1"
                                >
                                  <Download size={18} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div>No files attached</div>
                      )}
                    </div>
                    <div className="mt-auto pt-4 border-t">
                      {uniqueFiles.length > 0 && (
                        <button
                          onClick={() => downloadAllFiles(resource)}
                          className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                        >
                          <Download size={20} />
                          <span>Download All</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-gray-500">
              No resources found for this subject.
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StudentResourcesPage;
