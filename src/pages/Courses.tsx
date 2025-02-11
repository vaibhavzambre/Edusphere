import React, { useState } from 'react';
import { BookOpen, Calendar, Clock, Users } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  instructor: string;
  schedule: string;
  enrolled: number;
  progress: number;
  nextClass: string;
  description: string;
}

const mockCourses: Course[] = [
  {
    id: '1',
    title: 'Web Development',
    instructor: 'Prof. Smith',
    schedule: 'Mon, Wed 10:00 AM',
    enrolled: 32,
    progress: 75,
    nextClass: '2024-03-15T10:00:00',
    description: 'Learn modern web development techniques and best practices.',
  },
  {
    id: '2',
    title: 'Database Systems',
    instructor: 'Dr. Johnson',
    schedule: 'Tue, Thu 2:00 PM',
    enrolled: 28,
    progress: 60,
    nextClass: '2024-03-14T14:00:00',
    description: 'Understanding database design and management systems.',
  },
  {
    id: '3',
    title: 'Software Engineering',
    instructor: 'Dr. Williams',
    schedule: 'Wed, Fri 1:00 PM',
    enrolled: 35,
    progress: 40,
    nextClass: '2024-03-13T13:00:00',
    description: 'Learn software development lifecycle and project management.',
  },
];

export default function Courses() {
  const [courses] = useState(mockCourses);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">My Courses</h1>
        <button className="btn-primary">Browse All Courses</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {courses.map((course) => (
          <div
            key={course.id}
            className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow"
          >
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    {course.title}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Instructor: {course.instructor}
                  </p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <BookOpen className="w-6 h-6 text-indigo-600" />
                </div>
              </div>

              <p className="mt-4 text-sm text-gray-600">{course.description}</p>

              <div className="mt-6 space-y-4">
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-2" />
                  {course.schedule}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Users className="w-4 h-4 mr-2" />
                  {course.enrolled} students enrolled
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-2" />
                  Next class: {new Date(course.nextClass).toLocaleString()}
                </div>
              </div>

              <div className="mt-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-medium text-indigo-600">
                    {course.progress}%
                  </span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
              </div>

              <div className="mt-6">
                <button className="btn-secondary w-full">View Course</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}