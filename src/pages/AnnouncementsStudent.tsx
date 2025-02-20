import React, { useState, useEffect } from "react";

interface Attachment {
  filePath: string;
  filename: string;
  contentType: string;
}

interface UserInfo {
  name: string;
}

interface Announcement {
  _id: string;
  title: string;
  content: string;
  publishDate: string;
  expiryDate?: string;
  expiryType: string;
  createdBy: UserInfo;
  visible: boolean;
  attachments?: Attachment[];
}

const AnnouncementsStudent: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchAnnouncements();
    // Re-fetch every 1 second
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

      // Students see only visible announcements, sorted by newest first
      const visibleData = data
        .filter((a: Announcement) => a.visible)
        .sort(
          (a: Announcement, b: Announcement) =>
            new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
        );

      setAnnouncements(visibleData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen overflow-x-hidden">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Announcements</h1>

      {loading ? (
        <p className="text-gray-600">Loading announcements...</p>
      ) : announcements.length === 0 ? (
        <p className="text-gray-600">No announcements available.</p>
      ) : (
        // SINGLE-COLUMN layout (one card per row), matching admin styling
        <div className="grid grid-cols-1 gap-6">
          {announcements.map((announcement) => (
            <div
              key={announcement._id}
              className="
                w-full
                sm:h-auto
                md:h-80
                p-5
                rounded-xl
                shadow-md
                bg-white
                border
                border-gray-300
                transition-transform
                transform
                hover:-translate-y-1
                hover:shadow-lg
                hover:border-indigo-500
                duration-300
                flex
                flex-col
              "
            >
              {/* Title area (centered, responsive, truncated if too long) */}
              <div className="relative">
                <div className="text-center pr-12">
                  <h3
                    className="
                      text-base
                      sm:text-lg
                      md:text-2xl
                      font-bold
                      text-gray-800
                      break-words
                      overflow-hidden
                      whitespace-nowrap
                      text-ellipsis
                    "
                  >
                    {announcement.title}
                  </h3>
                </div>
              </div>

              {/* Announcement content + details */}
              <div className="mt-4 flex-1 overflow-auto">
                <p className="text-gray-700 text-base leading-relaxed">
                  {announcement.content}
                </p>

                {/* Row with Publish Date, Expiry, Created By (mirroring admin style) */}
                <div className="mt-4 flex flex-row justify-around items-center">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-sm text-gray-700">Created By:</span>
                    <span className="text-sm text-gray-600">
                      {announcement.createdBy?.name || "Admin"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-sm text-gray-700">Published:</span>
                    <span className="text-sm text-gray-600">
                      {new Date(announcement.publishDate).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-sm text-gray-700">Expiry:</span>
                    <span className="text-sm text-gray-600">
                      {announcement.expiryType === "permanent"
                        ? "Permanent"
                        : new Date(announcement.expiryDate as string).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                          })}
                    </span>
                  </div>
                </div>

                {/* Attachments (if any) */}
                {announcement.attachments && announcement.attachments.length > 0 && (
                  <div className="mt-2">
                    <span className="font-bold text-sm">Attachments:</span>
                    <div className="mt-2 space-y-2">
                      {announcement.attachments.map((att, index) => (
                        <div
                          key={index}
                          className="
                            cursor-pointer
                            text-indigo-600
                            font-medium
                            hover:text-indigo-700
                            p-1
                            border
                            rounded-md
                            transition-colors
                            duration-200
                          "
                        >
                          <a
                            href={`http://localhost:5001/api/attachments/${att.filePath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {att.filename}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnnouncementsStudent;
