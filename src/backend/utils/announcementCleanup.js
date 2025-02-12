import cron from "node-cron";
import Announcement from "../models/Announcement.js";

// Function to delete expired announcements
const deleteExpiredAnnouncements = async () => {
  try {
    const currentTime = new Date(); // Get current time

    // Delete announcements where expiryDate has already passed
    const result = await Announcement.deleteMany({
      expiryDate: { $lte: currentTime },
    });

    if (result.deletedCount > 0) {
      console.log(`🗑️ Deleted ${result.deletedCount} expired announcements.`);
    } else {
      console.log("✅ No expired announcements to delete.");
    }
  } catch (error) {
    console.error("❌ Error deleting expired announcements:", error);
  }
};

// Schedule the job to run every **hour**
cron.schedule("0 * * * *", () => {
  console.log("⏳ Running scheduled announcement cleanup...");
  deleteExpiredAnnouncements();
});

// Export the function (optional, in case you want to run it manually somewhere else)
export default deleteExpiredAnnouncements;
