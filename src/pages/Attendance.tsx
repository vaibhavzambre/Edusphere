import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import type { AttendanceRecord } from '../types';

const mockAttendance: AttendanceRecord[] = [
  {
    id: '1',
    studentId: '1',
    date: '2024-03-10',
    status: 'present',
    course: 'Web Development',
  },
  {
    id: '2',
    studentId: '1',
    date: '2024-03-09',
    status: 'present',
    course: 'Database Systems',
  },
  {
    id: '3',
    studentId: '1',
    date: '2024-03-08',
    status: 'late',
    course: 'Web Development',
  },
  {
    id: '4',
    studentId: '1',
    date: '2024-03-07',
    status: 'absent',
    course: 'Database Systems',
  },
];

const courses = ['Web Development', 'Database Systems', 'Software Engineering'];

export default function Attendance() {
  const [attendance] = useState(mockAttendance);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedCourse, setSelectedCourse] = useState<string>('all');

  const getStatusColor = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'late':
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const filteredAttendance = attendance.filter(
    (record) => selectedCourse === 'all' || record.course === selectedCourse
  );

  const attendanceRate = Math.round(
    (filteredAttendance.filter((record) => record.status === 'present').length /
      filteredAttendance.length) *
      100
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Attendance</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={() =>
              setSelectedMonth(
                new Date(selectedMonth.setMonth(selectedMonth.getMonth() - 1))
              )
            }
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-medium">
            {selectedMonth.toLocaleString('default', {
              month: 'long',
              year: 'numeric',
            })}
          </span>
          <button
            onClick={() =>
              setSelectedMonth(
                new Date(selectedMonth.setMonth(selectedMonth.getMonth() + 1))
              )
            }
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-indigo-50 rounded-lg">
              <Calendar className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Attendance Rate</p>
              <p className="text-2xl font-semibold text-gray-800">{attendanceRate}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedCourse('all')}
              className={`px-4 py-2 rounded-lg font-medium ${
                selectedCourse === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              All Courses
            </button>
            {courses.map((course) => (
              <button
                key={course}
                onClick={() => setSelectedCourse(course)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  selectedCourse === course
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {course}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          <table className="w-full">
            <thead>
              <tr className="text-left">
                <th className="pb-4 font-medium text-gray-500">Date</th>
                <th className="pb-4 font-medium text-gray-500">Course</th>
                <th className="pb-4 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAttendance.map((record) => (
                <tr key={record.id}>
                  <td className="py-4">
                    {new Date(record.date).toLocaleDateString()}
                  </td>
                  <td className="py-4">{record.course}</td>
                  <td className="py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(
                        record.status
                      )}`}
                    >
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}