import React, { useState } from "react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const requestOTP = async () => {
    setMessage("");
    setLoading(true);
    try {
      const response = await fetch("http://localhost:5001/api/auth/forgot-password-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setMessage(data.message);
      setOtpSent(true);
    } catch (error: any) {
      setMessage(error.message || "Error requesting OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("http://localhost:5001/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setMessage(data.message);
      // Optionally, redirect to login page on success.
    } catch (error: any) {
      setMessage(error.message || "Error resetting password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gray-100">
      <div className="mb-10 text-center">
        <h1 className="text-5xl font-extrabold text-blue-800 tracking-wide">EduSphere</h1>
        <p className="text-gray-600 text-lg mt-2">Forgot Password</p>
      </div>
      <div className="space-y-5 p-8 bg-white shadow-xl rounded-xl w-96">
        {!otpSent ? (
          <>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              className="input-primary w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button onClick={requestOTP} className="btn-primary w-full" disabled={loading}>
              {loading ? "Requesting OTP..." : "Request OTP"}
            </button>
          </>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="input-primary w-full"
              required
            />
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-primary w-full"
              required
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-primary w-full"
              required
            />
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Resetting Password..." : "Reset Password"}
            </button>
          </form>
        )}
        {message && <p className="mt-2 text-sm text-blue-600 text-center">{message}</p>}
      </div>
    </div>
  );
}
