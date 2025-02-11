import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import Messages from "./pages/Messages";
import Support from "./pages/Support";
import Jobs from "./pages/Jobs";
import Attendance from "./pages/Attendance";
import Courses from "./pages/Courses";
import Settings from "./pages/Settings";
import Login from "./pages/login";
import Register from "./pages/register";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ManageTeachers from "./pages/ManageTeachers";
import ManageStudents from "./pages/ManageStudents"
import ManageSubjects from "./pages/ManageSubjects";
import ManageClasses from './pages/ManageClasses'
const mockAttendance = [
  { course: "Web Development", date: "2024-03-10", status: "present" },
  { course: "Machine Learning", date: "2024-03-12", status: "absent" },
];


const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4">{children}</main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/*  Public Routes (No Sidebar/Header) */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/*  Protected Routes (Show Sidebar & Header only after login) */}
          <Route path="/" element={<ProtectedRoute element={<ProtectedLayout><Dashboard  attendance={mockAttendance} /></ProtectedLayout>} />} />
          <Route path="/messages" element={<ProtectedRoute element={<ProtectedLayout><Messages /></ProtectedLayout>} />} />
          <Route path="/attendance" element={<ProtectedRoute element={<ProtectedLayout><Attendance /></ProtectedLayout>} />} />
          <Route path="/courses" element={<ProtectedRoute element={<ProtectedLayout><Courses /></ProtectedLayout>} />} />
          <Route path="/settings" element={<ProtectedRoute element={<ProtectedLayout><Settings /></ProtectedLayout>} />} />
          <Route path="/jobs" element={<ProtectedRoute element={<ProtectedLayout><Jobs /></ProtectedLayout>} />} />
          <Route path="/support" element={<ProtectedRoute element={<ProtectedLayout><Support /></ProtectedLayout>} />} />
          <Route path="/ManageTeachers" element={<ProtectedRoute element={<ProtectedLayout><ManageTeachers /></ProtectedLayout>} />} />  
          <Route path="/ManageStudents" element={<ProtectedRoute element={<ProtectedLayout><ManageStudents /></ProtectedLayout>} />} />  
          <Route path="/ManageSubjects" element={<ProtectedRoute element={<ProtectedLayout><ManageSubjects /></ProtectedLayout>} />} />  
          <Route path="/ManageClasses" element={<ProtectedRoute element={<ProtectedLayout><ManageClasses /></ProtectedLayout>} />} />  

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
