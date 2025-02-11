import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";
import dotenv from "dotenv";
import subjectRoutes from "./routes/subjectRoutes.js";
import classRoutes from "./routes/classRoutes.js";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5001;

// ✅ Fix CORS to Allow Requests from Frontend Running on Port 5173
app.use(
  cors({
    origin: "http://localhost:5173", // Allow frontend requests
    credentials: true,
  })
);

app.use(express.json());

  // mongoose.connect("mongodb+srv://sushrut:sushrut123@cluster0.2ngtdlh.mongodb.net/main_db", {
  mongoose.connect("mongodb://localhost:27017/main_db", {  
  useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected to main_db"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

app.use("/api/auth", authRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/classes", classRoutes);

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
