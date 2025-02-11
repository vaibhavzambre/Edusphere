// File: src/pages/Login.tsx

import React from "react";
import AuthForm from "../components/auth/AuthForm";
import { useLocation } from "react-router-dom";

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
    </div>
  );
}
