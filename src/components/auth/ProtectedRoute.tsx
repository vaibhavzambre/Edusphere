import { useAuth } from "../../context/AuthContext";
import { Navigate } from "react-router-dom";
import { ReactNode, useEffect, useState } from "react";

export default function ProtectedRoute({ element }: { element: ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 500); // Ensure auth state loads before redirecting
  }, []);

  if (loading) return <div>Loading...</div>; // Show loading screen while checking auth

  return user ? element : <Navigate to="/login" replace />;
}
