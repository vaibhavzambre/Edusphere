// File: src/context/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthContextType {
  user: any;
  login: (token: string) => void;
  logout: (sessionExpired?: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);

  // Logout function with an optional flag for session expiration
  const logout = (sessionExpired = false) => {
    console.log("Logging out...");
    localStorage.removeItem("token");
    setUser(null);

    if (sessionExpired) {
      // Redirect to login with a query parameter to indicate session expiration
      window.location.href = "/login?sessionExpired=true";
    } else {
      window.location.href = "/login";
    }
  };

  // Function to check token expiration
  const checkTokenExpiration = () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split(".")[1]));
        // decoded.exp is in seconds; Date.now() returns milliseconds
        if (decoded.exp < Date.now() / 1000) {
          console.log("Token has expired");
          logout(true);
        }
      } catch (error) {
        console.error("Error checking token expiration:", error);
        logout(true);
      }
    }
  };

  // On mount, or if the page refreshes, check for an existing token
  useEffect(() => {
    const token = localStorage.getItem("token");
    console.log("Checking localStorage token:", token);

    if (token) {
      try {
        const decodedUser = JSON.parse(atob(token.split(".")[1]));
        if (decodedUser.exp < Date.now() / 1000) {
          console.log("Token is expired on initial check");
          logout(true);
        } else {
          // Store the entire payload in user state
          // This includes phone, twoFactorEnabled, role, etc.
          setUser({ token, ...decodedUser });
        }
      } catch (error) {
        console.error("Error decoding token:", error);
        localStorage.removeItem("token");
        setUser(null);
      }
    }

    // Check token expiration every minute
    const interval = setInterval(checkTokenExpiration, 60000);
    return () => clearInterval(interval);
  }, []);

  // Called after successful login or after verifying OTP
  const login = (token: string) => {
    try {
      console.log("Login successful, storing token:", token);
      const decodedUser = JSON.parse(atob(token.split(".")[1]));
      console.log("Decoded JWT Payload:", decodedUser); // <-- Add this debug

      // Store in localStorage + update state
      localStorage.setItem("token", token);
      setUser({ token, ...decodedUser });

      // Optionally redirect to home (or remove this if you want to stay on the same page)
      window.location.href = "/";
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  console.log("AuthContext user state:", user);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
