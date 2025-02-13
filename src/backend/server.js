import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";
import subjectRoutes from "./routes/subjectRoutes.js";
import classRoutes from "./routes/classRoutes.js";
import teacherRoutes from "./routes/teacherRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import dotenv from "dotenv";
import gridfsStream from "gridfs-stream";
import announcementsRouter from "./routes/announcements.js";
import attachments from "./routes/attachments.js";
import "./utils/announcementCleanup.js"; // Enable automatic deletion of expired announcements
import userRoutes from "./routes/userRoutes.js";
const conn = mongoose.connection;
let gfs;

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5001;

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

mongoose
  .connect("mongodb://localhost:27017/main_db", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected to main_db"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

  conn.once("open", () => {
    gfs = gridfsStream(conn.db, mongoose.mongo);
    gfs.collection("uploads"); // set collection name to 'uploads'
    console.log("GridFS initialized");
  });

  app.use("/uploads", express.static("uploads"));

  app.use("/api/attachments",attachments);

app.use("/api/auth", authRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/announcements", announcementsRouter);
app.use("/api/users",userRoutes)
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
export { gfs };
