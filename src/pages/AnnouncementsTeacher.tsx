import React, { useState, useEffect } from "react";

interface Announcement {
  _id: string;
  title: string;
  content: string;
  publishDate: string;
  expiryDate?: string;
  expiryType: string;
  createdBy: { name: string };
  visible: boolean;
  attachments?: {
    filePath: string;
    filename: string;
    contentType: string;
  }[];
}

const AnnouncementsTeacher: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 1000);
    return () => clearInterval(interval);
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
      // Teachers see only visible announcements
      const visibleData = data
        .filter((a: Announcement) => a.visible)
        .sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
      setAnnouncements(visibleData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      setLoading(false);
    }
  };

  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold mb-4">Announcements</h1>
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
                <strong>Created By:</strong> {announcement.createdBy.name}
              </div>
              <div className="text-sm text-gray-600 mb-1">
                <strong>Published:</strong>{" "}
                {new Date(announcement.publishDate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
              </div>
              <div className="text-sm text-gray-600 mb-1">
                <strong>Expiry:</strong>{" "}
                {announcement.expiryType === "permanent"
                  ? "Permanent"
                  : new Date(announcement.expiryDate as string).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
              </div>
              {/* NEW: Show attachments if present */}
              {announcement.attachments && announcement.attachments.length > 0 && (
                <div className="mt-2">
                  <strong>Attachments:</strong>
                  <ul className="list-disc list-inside">
                    {announcement.attachments.map((att, index) => (
                      <li key={index}>
                        <a
                          href={`http://localhost:5001/api/attachments/${att.filePath}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 underline"
                        >
                          {att.filename}
                        </a>
                      </li>
                    ))}
                  </ul>
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
