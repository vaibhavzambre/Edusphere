import React, { useState } from "react";
import { Bell, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Header = () => {
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false); // NEW: State for logout confirmation modal

  console.log("Header received user:", user);

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="relative w-96">
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
          </div>

          <div className="flex items-center space-x-6">
            <div className="relative">
              <button className="relative p-2 rounded-full hover:bg-gray-100">
                <Bell className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* 👤 User Profile Section */}
            {user ? (
              <div className="flex items-center space-x-3">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`}
                  alt={user.name}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="font-medium text-gray-800">{user.name}</p>
                  <p className="text-sm text-gray-500 capitalize">{user.role}</p>
                </div>
                <button
                  onClick={() => setShowLogoutModal(true)} // OPEN logout modal on click
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Logout
                </button>
              </div>
            ) : (
              <p className="text-gray-500">Loading user info...</p>
            )}
          </div>
        </div>
      </header>

      {/* NEW: Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Confirm Logout</h2>
            <p className="mb-4">
              Are you sure you want to logout?
            </p>
            <div className="flex justify-end mt-4 space-x-4">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  logout();
                  setShowLogoutModal(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
