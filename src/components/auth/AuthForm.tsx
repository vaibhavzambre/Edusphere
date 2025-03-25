import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AuthForm({ isLogin }: { isLogin: boolean }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [otp, setOtp] = useState("");
  const [userIdForOtp, setUserIdForOtp] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const endpoint = `http://localhost:5001/api/auth/${isLogin ? "login" : "register"}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Authentication failed");

      // If 2FA is required
      if (data.requires2FA && data.userId) {
        setUserIdForOtp(data.userId);
        setStep(4); // Go to OTP step
        return;
      }

      // Normal login
      if (isLogin) {
        if (data.token) {
          localStorage.setItem("token", data.token);
          login(data.token);
        } else {
          throw new Error("Token missing in response");
        }
      } else {
        // Registration success
        alert("Registration successful! Please log in.");
        navigate("/login");
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch("http://localhost:5001/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userIdForOtp, otp }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Invalid OTP");

      // If OTP is correct, we get a token
      localStorage.setItem("token", data.token);
      login(data.token);
    } catch (error: any) {
      setError(error.message);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gray-100">
      <div className="mb-10 text-center">
        <h1 className="text-5xl font-extrabold text-blue-800 tracking-wide">EduSphere</h1>
        <p className="text-gray-600 text-lg mt-2">
          {isLogin ? "Welcome back! Log in to continue." : "Create an account to get started."}
        </p>
      </div>

      <form
        onSubmit={step === 4 ? handleOtpVerify : handleSubmit}
        className="space-y-5 p-8 bg-white shadow-xl rounded-xl w-96"
      >
        <h2 className="text-2xl font-semibold text-center">
          {isLogin ? "Login" : "Register"}
        </h2>
        {error && <p className="text-red-500 text-center">{error}</p>}

        {/* STEP 4: OTP Input */}
        {step === 4 && (
          <>
            <input
              type="text"
              name="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit OTP"
              className="input-primary w-full"
              required
            />
            <button type="submit" className="btn-primary w-full">
              Verify OTP
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-blue-500 underline"
            >
              Back to Login
            </button>
          </>
        )}

        {/* LOGIN FORM */}
        {isLogin && step !== 4 && (
          <>
            <input
              type="email"
              name="email"
              placeholder="Email"
              className="input-primary w-full"
              onChange={handleChange}
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              className="input-primary w-full"
              onChange={handleChange}
              required
            />
            <button type="submit" className="btn-primary w-full">Login</button>
            <div className="flex justify-between mt-2">
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="text-blue-500 underline"
              >
                New user? Register here
              </button>
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-blue-500 underline"
              >
                Forgot Password?
              </button>
            </div>
          </>
        )}

        {/* REGISTRATION FORM (Steps 1-3) */}
        {!isLogin && step !== 4 && (
          <>
            {step === 1 && (
              <>
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  className="input-primary w-full"
                  onChange={handleChange}
                  required
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  className="input-primary w-full"
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="btn-primary w-full"
                  onClick={() => setStep(2)}
                >
                  Next
                </button>
              </>
            )}
            {step === 2 && (
              <>
                <label className="text-gray-700 font-medium">Select Role:</label>
                <select
                  name="role"
                  onChange={handleChange}
                  className="input-primary w-full"
                  required
                >
                  <option value="">Select Role</option>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  type="button"
                  className="btn-primary w-full"
                  onClick={() => setStep(3)}
                >
                  Next
                </button>
              </>
            )}
            {step === 3 && (
              <>
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  className="input-primary w-full"
                  onChange={handleChange}
                  required
                />
                <button type="submit" className="btn-primary w-full">
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-blue-500 underline"
                >
                  Already have an account? Login
                </button>
              </>
            )}
          </>
        )}
      </form>
    </div>
  );
}
