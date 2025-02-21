import React, { useState, useEffect } from "react";
import axios from "axios";
import { Download } from "lucide-react";

const BASE_URL = "http://localhost:5001";

const StudentResourcesPage = () => {
  const [subjects, setSubjects] = useState([]);
  const [resources, setResources] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
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

  // Fetch all resources available to the student on mount
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

  // When a subject is selected, filter the resources by matching subject _id.
  const displayedResources = selectedSubject
    ? resources.filter(
        (res) => res.subject && res.subject._id === selectedSubject
      )
    : [];

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">
      {error && <div className="text-red-500">{error}</div>}

      {selectedSubject === null ? (
        <>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Subjects</h1>
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
                  <h2 className="text-xl font-semibold text-gray-800">
                    {subject.subject_name}
                  </h2>
                  {subject.description && (
                    <p className="text-sm text-gray-600 mt-2">
                      {subject.description}
                    </p>
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
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Resources</h1>
          {loadingResources ? (
            <div className="text-blue-500">Loading resources...</div>
          ) : displayedResources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedResources.map((resource) => (
                <div
                  key={resource._id}
                  className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="p-3 bg-indigo-50 rounded-lg">
                      <Download className="w-6 h-6 text-indigo-600" />
                    </div>
                    <span className="text-sm text-gray-500 capitalize">
                      {resource.visibility}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-800">
                    {resource.filename}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Uploaded by {resource.uploadedBy?.name || "Unknown"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(resource.createdAt).toLocaleDateString()}
                  </p>
                  <div className="mt-4">
                    <a
                      href={`${BASE_URL}/api/resources/download/${resource.file_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary w-full flex items-center justify-center space-x-2"
                    >
                      <span>Open Resource</span>
                    </a>
                  </div>
                </div>
              ))}
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