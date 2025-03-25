import React, { useState, useEffect } from 'react';
import {
  Bell,
  Shield,
  User,
} from 'lucide-react';
import { useAuth } from "../context/AuthContext";
import ChangePassword from "../components/settings/ChangePassword";

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
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"idle" | "otp">("idle");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  // We'll read user + login from our AuthContext
  const { user, login } = useAuth();

  useEffect(() => {
    // On mount or when user changes, read their 2FA status + phone
    if (user) {
      setTwoFAEnabled(user.twoFactorEnabled || false);
      setPhone(user.phone || "");
    }
  }, [user]);

  // STEP 1: Send OTP (either to new phone if enabling, or existing phone if disabling)
  const sendOTP = async () => {
    try {
      setLoading(true);
      setMessage("");

      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found in localStorage");

      // If 2FA is currently enabled, we use the user’s phone
      // If 2FA is disabled, we use the phone typed in the input
      const response = await fetch("http://localhost:5001/api/auth/2fa/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone: twoFAEnabled ? user?.phone : phone,
          forDisable: twoFAEnabled,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      setMessage("OTP sent to your phone.");
      setStep("otp");
    } catch (err: any) {
      setMessage(err.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP and toggle 2FA
  const verifyAndToggle2FA = async () => {
    try {
      setLoading(true);
      setMessage("");

      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found in localStorage");

      const response = await fetch("http://localhost:5001/api/auth/2fa/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enable: !twoFAEnabled,
          phone: twoFAEnabled ? undefined : phone,
          otp,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      // If server returns a new token with updated 2FA status
      if (data.token) {
        localStorage.setItem("token", data.token);
        login(data.token); // Tells AuthContext to decode + update `user`
      }

      // Flip the local 2FA state
      setTwoFAEnabled(!twoFAEnabled);
      setStep("idle");
      setOtp("");
      setMessage(data.message || "2FA status updated.");
    } catch (err: any) {
      setMessage(err.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Two-Factor Authentication (2FA)</h3>

      {/* If 2FA is NOT enabled + not in OTP step => show phone input */}
      {!twoFAEnabled && step === "idle" && (
        <>
          <label className="block text-sm font-medium text-gray-700">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter phone number"
            className="input-primary mt-1"
          />
        </>
      )}

      {/* If we are in the OTP step => show OTP input */}
      {step === "otp" && (
        <>
          <label className="block text-sm font-medium text-gray-700">Enter OTP</label>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="6-digit OTP"
            className="input-primary mt-1"
          />
        </>
      )}

      <div className="flex items-center space-x-4 mt-4">
        {step === "idle" ? (
          <button
            className="btn-secondary"
            onClick={sendOTP}
            disabled={loading}
          >
            {twoFAEnabled ? "Disable 2FA" : "Enable 2FA"}
          </button>
        ) : (
          <button
            className="btn-primary"
            onClick={verifyAndToggle2FA}
            disabled={loading}
          >
            Verify OTP
          </button>
        )}
        {loading && <span className="text-sm text-gray-500">Processing...</span>}
      </div>

      {message && <p className="text-sm text-blue-600">{message}</p>}
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
    { id: 'notifications', title: 'Notifications', icon: Bell, component: NotificationSettings },
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

          <div className="p-6 md:col-span-3 space-y-6">
            <ActiveComponent />
            {activeSection.id === 'security' && <ChangePassword />}
          </div>
        </div>
      </div>
    </div>
  );
}
