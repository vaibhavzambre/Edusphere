import React, { useState } from 'react';
import { AlertCircle, Send } from 'lucide-react';
import type { Department } from '../types';

const departments: Department[] = [
  { id: 'academic', name: 'Academic Affairs', email: 'academic@university.edu' },
  { id: 'technical', name: 'Technical Support', email: 'support@university.edu' },
  { id: 'finance', name: 'Finance Department', email: 'finance@university.edu' },
  { id: 'library', name: 'Library Services', email: 'library@university.edu' },
  { id: 'career', name: 'Career Services', email: 'careers@university.edu' },
];

const priorities = [
  { value: 'low', label: 'Low Priority' },
  { value: 'medium', label: 'Medium Priority' },
  { value: 'high', label: 'High Priority' },
  { value: 'urgent', label: 'Urgent' },
];

export default function Support() {
  const [formData, setFormData] = useState({
    department: '',
    subject: '',
    description: '',
    priority: 'medium',
    attachments: [] as File[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // In a real application, this would send the ticket to a backend service
    console.log('Submitting ticket:', formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({
        ...prev,
        attachments: [...Array.from(e.target.files!)],
      }));
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Support Ticket</h1>
        <p className="mt-2 text-gray-600">
          Submit a ticket to get help from the relevant department.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Department
            </label>
            <select
              value={formData.department}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, department: e.target.value }))
              }
              className="mt-1 input-primary"
              required
            >
              <option value="">Select a department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Subject
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, subject: e.target.value }))
              }
              className="mt-1 input-primary"
              required
              placeholder="Brief description of your issue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, priority: e.target.value }))
              }
              className="mt-1 input-primary"
            >
              {priorities.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={4}
              className="mt-1 input-primary"
              required
              placeholder="Detailed description of your issue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Attachments
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              multiple
              className="mt-1 block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-indigo-50 file:text-indigo-600
                hover:file:bg-indigo-100"
            />
          </div>

          {formData.priority === 'urgent' && (
            <div className="p-4 bg-red-50 rounded-lg flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="text-sm text-red-600">
                <p className="font-medium">Urgent Priority Selected</p>
                <p>
                  Your ticket will be marked as urgent and relevant staff will be
                  notified immediately.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button type="submit" className="btn-primary flex items-center space-x-2">
              <Send className="w-4 h-4" />
              <span>Submit Ticket</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}