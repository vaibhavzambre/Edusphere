// File: src/components/settings/ChangePassword.tsx

import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function ChangePassword() {
  // Steps: 1) current password, 2) OTP if 2FA, 3) new password
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // For step 1
  const [currentPassword, setCurrentPassword] = useState("");
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [phone, setPhone] = useState("");

  // For step 2 (OTP)
  const [otp, setOtp] = useState("");

  // For step 3 (new password)
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const { user, logout } = useAuth();

  // 1) Verify current password
  const handleVerifyCurrentPassword = async () => {
    try {
      setLoading(true);
      setMessage("");

      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found in localStorage");

      const res = await fetch("http://localhost:5001/api/auth/change-password/verify-current", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // If success => data.twoFactorEnabled + data.phone
      setTwoFAEnabled(data.twoFactorEnabled);
      setPhone(data.phone || "");
      // If user has 2FA => we do phone OTP next
      if (data.twoFactorEnabled) {
        // Send OTP to phone
        const otpRes = await fetch("http://localhost:5001/api/auth/2fa/send-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            phone: data.phone,
            forDisable: false, // we are not disabling, but we want an OTP anyway
          }),
        });

        const otpData = await otpRes.json();
        if (!otpRes.ok) throw new Error(otpData.message);

        setMessage("OTP sent to your phone.");
        setStep(2);
      } else {
        // If no 2FA => skip OTP => go to new password step
        setStep(3);
      }
    } catch (err: any) {
      setMessage(err.message || "Failed to verify current password");
    } finally {
      setLoading(false);
    }
  };

  // 2) Verify OTP if 2FA is on
  const handleVerifyOTP = async () => {
    try {
      setLoading(true);
      setMessage("");

      // We can reuse the /verify-otp route
      // But that route needs userId & otp
      // We'll pass user.id from context
      if (!user?.id) throw new Error("No userId found in context");

      const res = await fetch("http://localhost:5001/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, otp }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // If OTP is correct => proceed to new password step
      setMessage("OTP verified. Please enter your new password.");
      setStep(3);
    } catch (err: any) {
      setMessage(err.message || "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  // 3) Update password
  const handleUpdatePassword = async () => {
    try {
      setLoading(true);
      setMessage("");

      if (!newPassword || !confirmNewPassword) {
        throw new Error("Please enter both new password and confirm password");
      }
      if (newPassword !== confirmNewPassword) {
        throw new Error("New passwords do not match");
      }

      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found in localStorage");

      const res = await fetch("http://localhost:5001/api/auth/change-password/do-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setMessage("Password changed successfully. You will be logged out now.");
      // Wait a second, then log out
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (err: any) {
      setMessage(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-md border border-gray-300 space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">Change Password</h2>
      {message && <p className="text-blue-600">{message}</p>}

      {step === 1 && (
        <>
          <label className="block text-sm font-medium text-gray-700">Current Password</label>
          <input
            type="password"
            className="input-primary"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <button
            className="btn-primary mt-2"
            onClick={handleVerifyCurrentPassword}
            disabled={loading}
          >
            Verify Current Password
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <p className="text-sm text-gray-700">We have sent an OTP to {phone}</p>
          <label className="block text-sm font-medium text-gray-700">Enter OTP</label>
          <input
            type="text"
            className="input-primary"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <button
            className="btn-primary mt-2"
            onClick={handleVerifyOTP}
            disabled={loading}
          >
            Verify OTP
          </button>
        </>
      )}

      {step === 3 && (
        <>
          <label className="block text-sm font-medium text-gray-700">New Password</label>
          <input
            type="password"
            className="input-primary"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <label className="block text-sm font-medium text-gray-700 mt-2">Confirm New Password</label>
          <input
            type="password"
            className="input-primary"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
          />
          <button
            className="btn-primary mt-2"
            onClick={handleUpdatePassword}
            disabled={loading}
          >
            Update Password
          </button>
        </>
      )}
    </div>
  );
}
