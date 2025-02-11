import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function AuthForm({ isLogin }: { isLogin: boolean }) {
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      console.log("Sending Request:", formData);

      const response = await fetch(`http://localhost:5001/api/auth/${isLogin ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.log("API Response:", data);

      if (!response.ok) throw new Error(data.message || "Authentication failed");

      if (isLogin) {
        if (data.token) {
          localStorage.setItem("token", data.token);
          login(data.token);
        } else {
          throw new Error("Token missing in response");
        }
      } else {
        alert("Registration successful! Please log in.");
        window.location.href = "/login";
      }
    } catch (error) {
      console.error("Auth Error:", error);
      setError((error as Error).message);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gray-100">
      {/* EduSphere Branding - Now Bigger & Well Spaced */}
      <div className="mb-10 text-center">
        <h1 className="text-5xl font-extrabold text-blue-800 tracking-wide">EduSphere</h1>
        <p className="text-gray-600 text-lg mt-2">
          {isLogin ? "Welcome back! Log in to continue." : "Create an account to get started."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 p-8 bg-white shadow-xl rounded-xl w-96">
        <h2 className="text-2xl font-semibold text-center">{isLogin ? "Login" : "Register"}</h2>
        {error && <p className="text-red-500 text-center">{error}</p>}

        {/* LOGIN FORM */}
        {isLogin ? (
          <>
            <input type="email" name="email" placeholder="Email" className="input-primary w-full" onChange={handleChange} required />
            <input type="password" name="password" placeholder="Password" className="input-primary w-full" onChange={handleChange} required />
            <button type="submit" className="btn-primary w-full">Login</button>
            <button onClick={() => (window.location.href = "/register")} className="text-blue-500 underline">New user? Register here</button>
          </>
        ) : (
          <>
            {/* REGISTRATION FORM (Step-based) */}
            {step === 1 && (
              <>
                <input type="text" name="name" placeholder="Full Name" className="input-primary w-full" onChange={handleChange} required />
                <input type="email" name="email" placeholder="Email" className="input-primary w-full" onChange={handleChange} required />
                <button type="button" className="btn-primary w-full" onClick={() => setStep(2)}>Next</button>
              </>
            )}

            {step === 2 && (
              <>
                <label className="text-gray-700 font-medium">Select Role:</label>
                <select name="role" onChange={handleChange} className="input-primary w-full" required>
                  <option value="">Select Role</option>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
                <button type="button" className="btn-primary w-full" onClick={() => setStep(3)}>Next</button>
              </>
            )}

            {step === 3 && (
              <>
                {formData.role === "student"}
                <input type="password" name="password" placeholder="Password" className="input-primary w-full" onChange={handleChange} required />
                <button type="submit" className="btn-primary w-full">Register</button>
                <button onClick={() => (window.location.href = "/login")} className="text-blue-500 underline">Already have an account? Login</button>
              </>
            )}
          </>
        )}
      </form>
    </div>
  );
}
