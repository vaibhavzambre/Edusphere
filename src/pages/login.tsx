import React from "react";
import AuthForm from "../components/auth/AuthForm";
import { useLocation, Link } from "react-router-dom";

export default function Login() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const sessionExpired = queryParams.get("sessionExpired");

  return (
    <div>
      {sessionExpired && (
        <p className="text-red-500 text-center mt-4">
          Session expired, please login again.
        </p>
      )}
      <AuthForm isLogin={true} />
      <div className="text-center mt-4">
        <Link to="/forgot-password" className="text-blue-500 underline">
          Forgot Password?
        </Link>
      </div>
    </div>
  );
}
