import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Example icons from lucide-react
import {
  Home,
  MessageSquare,
  BookOpen,
  Briefcase,
  AlertCircle,
  Users,
  Settings,
  ClipboardList,
  BarChart,
  Megaphone,
  GraduationCap,
  ClipboardCheck,
  Layers,
  FileText,
} from "lucide-react";

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Collapsed vs expanded
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Track when we should animate icons (true whenever we toggle)
  const [shouldAnimateIcons, setShouldAnimateIcons] = useState(false);

  // Toggle collapse
  const handleToggleCollapse = () => {
    // Trigger the bounce animation
    setShouldAnimateIcons(true);
    setIsCollapsed(!isCollapsed);
  };

  // After some delay, remove the animation class so it doesn't persist forever
  useEffect(() => {
    if (shouldAnimateIcons) {
      const timer = setTimeout(() => {
        setShouldAnimateIcons(false);
      }, 500); // Duration to match your keyframe animation
      return () => clearTimeout(timer);
    }
  }, [shouldAnimateIcons]);

  // Fixed widths for the sidebar
  const COLLAPSED_WIDTH = 64;
  const EXPANDED_WIDTH = 256;

  // Role-based menu items
  const menuItems = [
    // Common for All Roles
    { icon: Home, label: "Dashboard", path: "/" },
    { icon: ClipboardList, label: "Attendance", path: "/attendance" },
    { icon: MessageSquare, label: "Messages", path: "/messages" },

    // Student
    ...(user?.role === "student"
      ? [
          { icon: BookOpen, label: "Subjects", path: "/classes/subjects" },
          { icon: Briefcase, label: "Jobs", path: "/jobs" },
          { icon: Megaphone, label: "Announcements", path: "/AnnouncementsStudent" },
          { icon: ClipboardCheck, label: "Assignment", path: "/assignments" },
          { icon: FileText, label: "Resources", path: "/StudentResources" },

        ]
      : []),

    // Teacher
    ...(user?.role === "teacher"
      ? [
          { icon: Layers, label: "Classes", path: "/classes" },
          { icon: BookOpen, label: "Subjects", path: "/classes/subjects" },
          { icon: FileText, label: 'Resources', path: '/TeacherResources' },
          { icon: Megaphone, label: "Announcements", path: "/AnnouncementsTeacher" },

        ]
      : []),

    // Admin
    ...(user?.role === "admin"
      ? [
          { icon: Megaphone, label: "Announcements", path: "/AnnouncementsPage" },
          { icon: Users, label: "Manage Teachers", path: "/ManageTeachers" },
          { icon: Users, label: "Manage Students", path: "/ManageStudents" },
          { icon: BookOpen, label: "Manage Subjects", path: "/ManageSubjects" },
          { icon: Layers, label: "Manage Classes", path: "/ManageClasses" },
          { icon: BarChart, label: "System Analytics", path: "/admin/analytics" },
        ]
      : []),

    // Shared
    { icon: GraduationCap, label: "Exams", path: "/exams" },
    { icon: AlertCircle, label: "Support", path: "/support" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <>
      {/* Inline styles for demonstration (you could move these to a CSS or Tailwind config) */}
      <style>{`
        @keyframes iconJump {
          0% {
            transform: translateY(0) scale(1);
          }

          50% {
            transform: translateY(0) scale(1.1);
          }

          100% {
            transform: translateY(0) scale(1);
          }
        }
        .animate-icon {
          animation: iconJump 0.3s ease-in-out;
        }
      `}</style>

      <aside
        className="
          relative
          h-screen
          bg-white
          border-r
          border-gray-200
          flex
          flex-col
          shadow-md
          overflow-y-auto
          overflow-x-hidden
        "
        style={{
          width: isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
          transition: "width 0.3s ease-in-out",
        }}
      >
        {/* Expand/Collapse Button */}
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={handleToggleCollapse}
            className="p-1 bg-gray-200 rounded-full hover:bg-gray-300 focus:outline-none shadow"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <div className="w-5 h-5 flex items-center justify-center text-gray-700 text-sm font-bold">
              {isCollapsed ? "»" : "«"}
            </div>
          </button>
        </div>

        {/* Brand / User Info */}
        <div className="pt-16 px-6 pb-6">
          {isCollapsed ? (
            <h2 className="text-xl font-bold text-indigo-600">ES</h2>
          ) : (
            <h2 className="text-2xl font-bold text-indigo-600 mb-2">EduSphere</h2>
          )}

          {user && !isCollapsed && (
            <div>
              <p className="text-lg font-semibold text-gray-800">{user.name}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
              <p className="text-sm text-yellow-500 font-medium">
                Role: {user.role.toUpperCase()}
              </p>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`
                  w-full flex items-center
                  px-4 py-3
                  mb-1
                  rounded-lg
                  transition-colors
                  duration-300
                  ${
                    isActive
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }
                `}
              >
                {/* 
                  Apply "animate-icon" class if we recently toggled the sidebar 
                  so the icons do the jump/bounce. 
                */}
                <Icon
                  className={`
                    w-5 h-5
                    ${shouldAnimateIcons ? "animate-icon" : ""}
                  `}
                />
                {!isCollapsed && (
                  <span className="ml-3 font-medium whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
