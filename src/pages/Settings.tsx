import React, { useState } from 'react';
import {
  Bell,
  Key,
  Lock,
  Mail,
  Moon,
  Shield,
  User,
} from 'lucide-react';

interface SettingsSection {
  id: string;
  title: string;
  icon: React.ElementType;
  component: React.ElementType;
}

function ProfileSettings() {
  return (
    <form className="space-y-6">
      <div className="flex items-center space-x-6">
        <img
          src="https://ui-avatars.com/api/?name=John+Doe"
          alt="Profile"
          className="w-24 h-24 rounded-full"
        />
        <button type="button" className="btn-secondary">
          Change Photo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            First Name
          </label>
          <input
            type="text"
            defaultValue="John"
            className="mt-1 input-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Last Name
          </label>
          <input
            type="text"
            defaultValue="Doe"
            className="mt-1 input-primary"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            defaultValue="john@example.com"
            className="mt-1 input-primary"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary">
          Save Changes
        </button>
      </div>
    </form>
  );
}

function SecuritySettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
        <form className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Current Password
            </label>
            <input
              type="password"
              className="mt-1 input-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <input
              type="password"
              className="mt-1 input-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <input
              type="password"
              className="mt-1 input-primary"
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary">
              Update Password
            </button>
          </div>
        </form>
      </div>

      <div className="pt-6 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Two-Factor Authentication</h3>
        <div className="mt-4">
          <button type="button" className="btn-secondary">
            Enable 2FA
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Email Notifications</h3>
        <div className="mt-4 space-y-4">
          {[
            'New assignments',
            'Course updates',
            'Messages from instructors',
            'Grade updates',
          ].map((item) => (
            <div key={item} className="flex items-center">
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-3 text-sm text-gray-700">{item}</label>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-6 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Push Notifications</h3>
        <div className="mt-4 space-y-4">
          {[
            'Assignment deadlines',
            'Course announcements',
            'New messages',
            'System updates',
          ].map((item) => (
            <div key={item} className="flex items-center">
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-3 text-sm text-gray-700">{item}</label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const sections: SettingsSection[] = [
    { id: 'profile', title: 'Profile', icon: User, component: ProfileSettings },
    { id: 'security', title: 'Security', icon: Shield, component: SecuritySettings },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: Bell,
      component: NotificationSettings,
    },
  ];

  const [activeSection, setActiveSection] = useState(sections[0]);

  const ActiveComponent = activeSection.component;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4">
          <div className="p-6 border-r border-gray-200">
            <nav className="space-y-2">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeSection.id === section.id
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{section.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6 md:col-span-3">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </div>
  );
}