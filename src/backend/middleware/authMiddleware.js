import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// ✅ General Authentication Middleware (For All Routes)
export const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token)
    return res.status(401).json({ message: "Access denied, no token provided" });

  try {
    // Use the same secret for verification as for signing.
    const secret = process.env.JWT_SECRET || "your_secret_key";
    const decoded = jwt.verify(token.replace("Bearer ", ""), secret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(400).json({ message: "Invalid token", error: error.message });
  }
};

// ✅ Admin Role-Based Access Middleware
export const checkAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }
  next();
};

// ✅ Teacher Role-Based Access Middleware
export const checkTeacher = (req, res, next) => {
  if (!req.user || req.user.role !== "teacher") {
    return res.status(403).json({ message: "Access denied. Teachers only." });
  }
  next();
};

// ✅ Student Role-Based Access Middleware
export const checkStudent = (req, res, next) => {
  if (!req.user || req.user.role !== "student") {
    return res.status(403).json({ message: "Access denied. Students only." });
  }
  next();
};
