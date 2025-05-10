import AWS from "aws-sdk";
import dotenv from "dotenv";

dotenv.config({ path: './src/backend/.env' });

const ses = new AWS.SES({ region: process.env.AWS_REGION || "us-east-1" });

/**
 * Send an email using AWS SES
 * @param {Object} options
 * @param {string} options.toEmail - Department recipient
 * @param {string} options.subject - Email subject
 * @param {string} options.body - Plain text body content
 * @param {string} options.priority - Ticket priority
 * @param {string} options.ticketId - Unique Ticket ID for reply threading
 */
export const sendTicketEmail = async ({ toEmail, subject, body, priority = "medium", ticketId }) => {
  const fullBody = `
==============================
📩 New Support Ticket Raised
==============================

🎫 Ticket ID: ${ticketId}
📅 Date: ${new Date().toLocaleString()}

${body}

==============================
📌 Reply to this email to respond to the student.
Your reply will be routed back to them automatically.

[EduSphere Automated System]
`;

  const tags = [
    { Name: "Priority", Value: priority }
  ];

  if (ticketId) {
    tags.push({ Name: "TicketID", Value: ticketId });
  }

  const params = {
    Source: process.env.SOURCE_EMAIL,
    Destination: {
      ToAddresses: [toEmail],
    },
    Message: {
      Subject: {
        Data: subject,
      },
      Body: {
        Text: {
          Data: fullBody,
        },
      },
    },
    Tags: tags, // ✅ Only valid SES tagging structure
  };

try {
  const result = await ses.sendEmail(params).promise();
  console.log("✅ SES email sent:", result.MessageId);
  console.log("📨 Email Params:", JSON.stringify(params, null, 2));

  return result;
} catch (err) {
  console.error("❌ SES send failed:", err);
  throw err;
}

};
