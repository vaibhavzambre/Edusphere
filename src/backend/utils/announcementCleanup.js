import cron from "node-cron";
import Announcement from "../models/Announcement.js";

/**
 * Finds all limited announcements that have expired (i.e. expiryDate <= current time)
 * and are still marked visible, and sets visible to false.
 */
const updateExpiredAnnouncements = async () => {
  try {
    const now = Date.now();
    // Use getTime() for comparison
    const result = await Announcement.updateMany(
      { 
        expiryType: "limited", 
        expiryDate: { $lte: new Date(now) }, 
        visible: true 
      },
      { $set: { visible: false } }
    );
    if (result.modifiedCount > 0) {
      console.log(`Updated ${result.modifiedCount} expired announcements to not visible.`);
    }
  } catch (error) {
    console.error("Error updating expired announcements:", error);
  }
};

// Run this job every minute.
cron.schedule("* * * * *", () => {
  console.log("Running expired announcements update...");
  updateExpiredAnnouncements();
});

export default updateExpiredAnnouncements;
