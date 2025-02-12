import React, { useState, useEffect } from "react";

interface Announcement {
  _id: string;
  title: string;
  content: string;
  type: "global" | "role" | "class";
  publishDate: string;
  expiryDate?: string;
  createdBy: { name: string };
  createdAt: string;
}

const AnnouncementsTeacher: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/announcements/", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch announcements");
      const data = await response.json();

      setAnnouncements(data); // No filtering in frontend, backend does it
      setLoading(false);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      setLoading(false);
    }
  };

  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold mb-4">Teacher Announcements</h1>

      {loading ? (
        <p>Loading announcements...</p>
      ) : announcements.length === 0 ? (
        <p>No announcements available.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {announcements.map((announcement) => (
            <div key={announcement._id} className="bg-white shadow-md p-4 rounded-lg">
              <h3 className="text-lg font-semibold">{announcement.title}</h3>
              <p className="mb-2">{announcement.content}</p>
              <div className="text-sm text-gray-700 mb-1">
                <strong>Type:</strong> {announcement.type}
              </div>
              <div className="text-sm text-gray-700 mb-1">
                <strong>Created By:</strong> {announcement.createdBy.name}
              </div>
              <div className="text-sm text-gray-600 mb-1">
                <strong>Published:</strong> {new Date(announcement.publishDate).toLocaleString()}
              </div>
              {announcement.expiryDate && (
                <div className="text-sm text-gray-600 mb-1">
                  <strong>Expires:</strong> {new Date(announcement.expiryDate).toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnnouncementsTeacher;
