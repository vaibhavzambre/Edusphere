import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// ✅ General Authentication Middleware (For All Routes)
export const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(401).json({ message: "Access denied, no token provided" });

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: "Invalid token" });
  }
};

// ✅ Admin Role-Based Access Middleware
export const checkAdmin = (req, res, next) => {
  // if (!req.user || req.user.role !== "admin") {
  //   return res.status(403).json({ message: "Access denied. Admins only." });
  // }
  next();
};
