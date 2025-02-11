import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Home,
  MessageSquare,
  FileText,
  Calendar,
  BookOpen,
  Briefcase,
  AlertCircle,
  Users,
  Settings,
  ClipboardList,
  BarChart,
  Megaphone,
  FilePlus,
  ListChecks,
  UserCheck,
  GraduationCap,
  ClipboardCheck,
  Clock,
  Layers,
  FolderPlus,
  UserCog,
  School,
  FileText as ExamIcon,
  CheckSquare,
  ShieldCheck,
  Clipboard,
} from "lucide-react";

const Sidebar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  console.log("Sidebar received user:", user); // ✅ Debugging

  // ✅ Define role-based menu items
  const menuItems = [
        // Common for All Roles

    { icon: Home, label: "Dashboard", path: "/" },
    { icon: Megaphone, label: "Announcements", path: "/announcements" },
    { icon: ClipboardList, label: "Attendance", path: "/attendance" },
    { icon: MessageSquare, label: "Messages", path: "/messages" },
   


    // Student Pages (No changes from previous version)
    ...(user?.role === "student"
      ? [
          { icon: BookOpen, label: "Subjects", path: "/classes/subjects" },
          { icon: Briefcase, label: "Jobs", path: "/jobs" },
          { icon: ClipboardCheck, label: "Assignment", path: "/assignments" },

        ]
      : []),

    // 🔹 Teacher-Specific Pages
    ...(user?.role === "teacher"
      ? [
          { icon: Layers, label: "Classes", path: "/classes" },
          { icon: BookOpen, label: "Subjects", path: "/classes/subjects" },
          { icon: ClipboardCheck, label: "Assignment", path: "/assignments" },

        ]
      : []),

    // 🔹 Admin-Specific Pages
    ...(user?.role === "admin"
      ? [
          { icon: Users, label: "Manage Teachers", path: "/ManageTeachers" },
          { icon: Users, label: "Manage Students", path: "/ManageStudents" },
          { icon: BookOpen, label: "Manage Subjects", path: "/ManageSubjects" },

          { icon: Layers, label: "Manage Classes", path: "/ManageClasses" },
          { icon: BarChart, label: "System Analytics", path: "/admin/analytics" },
        ]
      : []),


      { icon: GraduationCap, label: "Exams", path: "/exams" },
      { icon: AlertCircle, label: "Support", path: "/support" },
      { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
<aside className="h-screen w-64 bg-white border-r border-gray-200 flex flex-col shadow-md overflow-y-auto">
{/* 🔹 Sidebar Header */}
      <div className="p-6">
        <h2 className="text-2xl font-bold text-indigo-600">EduSphere</h2>
        {user ? (
          <div className="mt-4">
            <p className="text-lg font-semibold text-gray-800">{user.name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
            <p className="text-sm text-yellow-500 font-medium">Role: {user.role.toUpperCase()}</p>
          </div>
        ) : (
          <p className="text-gray-500">Loading user info...</p>
        )}
      </div>

      {/* 🔹 Navigation Menu */}
      <nav className="flex-1 px-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center space-x-3 px-4 py-3 mb-2 rounded-lg transition-colors ${
                isActive
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
