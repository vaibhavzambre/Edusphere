import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthContextType {
  user: any;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    console.log("Checking localStorage Token:", token); 

    if (token) {
      try {
        const decodedUser = JSON.parse(atob(token.split(".")[1])); // Decode JWT
        console.log("Decoded User Data:", decodedUser); 
        setUser({ token, ...decodedUser });
      } catch (error) {
        console.error("Error decoding token:", error);
        localStorage.removeItem("token");
        setUser(null);
      }
    }
  }, []);

  const login = (token: string) => {
    try {
      console.log("Login Successful, Storing Token:", token); 
      const decodedUser = JSON.parse(atob(token.split(".")[1])); // Decode JWT
      localStorage.setItem("token", token);
      setUser({ token, ...decodedUser });
      window.location.href = "/"; // Redirect after login
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const logout = () => {
    console.log("Logging out..."); 
    localStorage.removeItem("token");
    setUser(null);
    window.location.href = "/login"; // Redirect after logout
  };

  console.log("AuthContext user state:", user); 

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
