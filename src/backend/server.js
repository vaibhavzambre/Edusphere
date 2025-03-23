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
import messageRoutes from "./routes/messageRoutes.js" // ✅ Use .cjs for CommonJS files
import { createServer } from "http";
import { Server } from "socket.io";
import conversationRoutes from "./routes/conversations.js";

// Import the announcement cleanup utility to toggle visibility of expired announcements
import "./utils/announcementCleanup.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5001;

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

// Configure express-fileupload middleware
app.use(fileUpload());

mongoose
  .connect("mongodb://localhost:27017/main_db", {
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
app.use("/api/messages", messageRoutes); // ✅ Added messaging API

// ✅ Use the new route
app.use("/api/conversations", conversationRoutes);

// ✅ SOCKET.IO LOGIC
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Listen for joining a room (User joins their userId)
  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room ${userId}`);
  });

  // Listen for new messages and broadcast them
  socket.on("sendMessage", (message) => {
    const { sender, receiver, content } = message;
    console.log("New message from:", sender, "to:", receiver);

    // Emit the message to the receiver
    io.to(receiver).emit("newMessage", message);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

export { gfs, io };
