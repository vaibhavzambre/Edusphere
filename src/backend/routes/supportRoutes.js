import express from "express";
import Ticket from "../models/Ticket.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { sendTicketEmail } from "../utils/sendSESMail.js";
import User from "../models/User.js";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";

const router = express.Router();

router.post("/", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can raise tickets" });
    }

    const { department, subject, description, priority } = req.body;
    const student = await User.findById(req.user.id);
    if (!student) return res.status(404).json({ message: "User not found" });

    const attachments = [];

    // ✅ Handle file uploads if present (req.files is from express-fileupload)
    if (req.files && req.files.attachments) {
      const files = Array.isArray(req.files.attachments)
        ? req.files.attachments
        : [req.files.attachments];

      for (const file of files) {
        const form = new FormData();
        form.append("file", file.data, file.name);

        const uploadRes = await axios.post(
          "http://localhost:5001/api/attachments/upload",
          form,
          { headers: form.getHeaders() }
        );

        attachments.push(uploadRes.data.fileId); // store file ID
      }
    }

    const newTicket = new Ticket({
      student: student._id,
      department,
      subject,
      description,
      priority,
      attachments,
    });

    await newTicket.save();

    // Compose email
    const departmentMap = {
      academic: "onlyusersushi1@gmail.com",
      technical: "onlyusersushi1@gmail.com",
      finance: "onlyusersushi1@gmail.com",
      library: "onlyusersushi1@gmail.com",
      career: "onlyusersushi1@gmail.com",
    };

    const toEmail = departmentMap[department];
    const emailBody = `
📩 New Ticket Raised by ${student.name} (${student.email})

🎫 Ticket ID: ${newTicket.ticketId}
🏷️ Subject: ${subject}
📚 Department: ${department}
⚠️ Priority: ${priority}
📝 Description:
${description}

📎 Attachments: ${attachments.length > 0 ? attachments.length + " file(s)" : "None"}

Please reply to this email to respond to the student.
    `;

    await sendTicketEmail({
      toEmail,
      subject: `[TICKET-${newTicket.ticketId}] - ${subject}`,
      body: emailBody,
      priority,
    });

    res.status(201).json({ message: "Ticket created and email sent", ticket: newTicket });
  } catch (error) {
    console.error("Error creating support ticket:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


/* ============================
   GET /api/support/my
   Get all tickets of logged-in student
   ============================ */
   router.get("/my", authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== "student") {
        console.log("🚫 Not a student:", req.user.role);
        return res.status(403).json({ message: "Access denied" });
      }
  
      console.log("✅ Fetching tickets for student ID:", req.user.id);
  
      const tickets = await Ticket.find({ student: req.user.id }).lean();
  
      const sortedTickets = [...tickets].sort((a, b) => {
        const statusOrder = { pending: 0, "in-progress": 1, closed: 2 };
        const statusDiff = statusOrder[a.status] - statusOrder[b.status];
        if (statusDiff !== 0) return statusDiff;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  
      console.log("🎫 Found tickets:", sortedTickets.length);
  
      res.json(sortedTickets);
    } catch (error) {
      console.error("❌ Error fetching tickets:", error);
      res.status(500).json({ message: "Failed to fetch tickets", error: error.message });
    }
  });
  


// POST /api/support/reply-hook
router.post("/reply-hook", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (token !== process.env.APP_SECRET_TOKEN) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const { ticketId, reply, from } = req.body;
  if (!ticketId || !reply) return res.status(400).json({ message: "Missing fields" });

  try {
    const ticket = await Ticket.findOne({ ticketId });
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    ticket.replies.push({
      message: reply,
      fromDepartment: true,
      timestamp: new Date(),
    });

    if (ticket.status === "pending") ticket.status = "in-progress";

    await ticket.save();

    res.status(200).json({ message: "Reply saved to ticket" });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
  

export default router;
