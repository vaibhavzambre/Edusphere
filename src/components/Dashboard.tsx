import React from 'react';
import {
  BookOpen,
  Calendar,
  Clock,
  FileText,
  GraduationCap,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Resource {
  id: string;
  title: string;
  date: string;
}

interface AttendanceRecord {
  course: string;
  date: string;
  status: string;
}

interface DashboardProps {
  resources?: Resource[];
  attendance?: AttendanceRecord[];
}

export default function Dashboard({ resources = [], attendance = [] }: DashboardProps) {
  const { user } = useAuth();

  console.log("Dashboard received user:", user); 
  console.log("Resources Data:", resources); 

  const stats = [
    { icon: BookOpen, label: 'Active Courses', value: '6' },
    { icon: Calendar, label: 'Attendance Rate', value: '92%' },
    { icon: Clock, label: 'Study Hours', value: '124h' },
    { icon: TrendingUp, label: 'Performance', value: 'A+' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col items-start shadow-md">
        <h2 className="text-2xl font-bold text-gray-800">
          Welcome, {user?.name || "User"}!
        </h2>
        <p className="text-gray-500 text-sm">
          Role: <span className="font-medium text-indigo-600">{user?.role?.toUpperCase()}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white p-6 rounded-xl border border-gray-200 flex items-center shadow-md"
            >
              <div className="p-3 rounded-lg bg-indigo-50">
                <Icon className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-semibold text-gray-800">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 📌 Recent Resources */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Recent Resources</h3>
            <button className="text-indigo-600 hover:text-indigo-700 font-medium">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {(resources?.slice(0, 4) || []).map((resource) => (
              <div
                key={resource.id}
                className="flex items-center p-3 hover:bg-gray-50 rounded-lg"
              >
                <div className="p-2 rounded bg-indigo-50">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-800">{resource.title}</p>
                  <p className="text-xs text-gray-500">
                    Added {new Date(resource.date).toLocaleDateString()}
                  </p>
                </div>
                <button className="text-indigo-600 hover:text-indigo-700">
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: MessageSquare, label: 'Message Teacher' },
              { icon: Calendar, label: 'Schedule Meeting' },
              { icon: FileText, label: 'Submit Assignment' },
              { icon: GraduationCap, label: 'View Grades' },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex flex-col items-center justify-center space-y-2"
                >
                  <Icon className="w-6 h-6 text-indigo-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Attendance Summary</h3>
        </div>
        <div className="space-y-4">
          {(attendance?.slice(0, 3) || []).map((item, index) => (
            <div key={index} className="flex justify-between p-3 border-b last:border-none">
              <span className="font-medium text-gray-800">{item.course}</span>
              <span
                className={`text-sm font-medium px-2 py-1 rounded ${
                  item.status === "present" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                }`}
              >
                {item.status.toUpperCase()}
              </span>
              <span className="text-gray-500 text-sm">{item.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
