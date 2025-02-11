import mongoose from "mongoose";

const AdminSchema = new mongoose.Schema(
  {
    permissions: [{ type: String }], // Example: ["manage_users", "manage_classes"]
  },
  { timestamps: true }
);

export default mongoose.model("Admin", AdminSchema);
