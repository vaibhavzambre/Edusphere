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
import userRoutes from "./routes/userRoutes.js";
import fileUpload from "express-fileupload";
import resourceRoutes from "./routes/resourceRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import { createServer } from "http";
import { Server } from "socket.io";
import conversationRoutes from "./routes/conversations.js";
import assignmentRoutes from "./routes/assignmentRoutes.js"
// Import the announcement cleanup utility...
import submissionRoutes from "./routes/submissionRoutes.js";

import "./utils/announcementCleanup.js";
import file from './routes/file.js'
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5001;
const mongoUri = process.env.MONGO_URI;


// Create HTTP server and attach Express app
const server = createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

// Attach Socket.io instance to requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(fileUpload());

// Mongoose + GridFS
mongoose
  .connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected to main_db"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

const conn = mongoose.connection;
let gfs;
conn.once("open", () => {
  gfs = gridfsStream(conn.db, mongoose.mongo);
  gfs.collection("uploads");
  console.log("GridFS initialized");
});

app.use("/uploads", express.static("uploads"));
app.use("/api/files", file); 

// API Routes
app.use("/api/attachments", attachments);
app.use("/api/auth", authRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/announcements", announcementsRouter);
app.use("/api/users", userRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/submissions", submissionRoutes); // ✅ this should exist

// SOCKET.IO LOGIC
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Let clients join a room by conversation ID
  socket.on("joinConversation", (conversationId) => {
    socket.join(conversationId);
    console.log(`Socket ${socket.id} joined conversation room ${conversationId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

export { gfs, io };
