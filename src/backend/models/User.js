  import mongoose from "mongoose";

  const UserSchema = new mongoose.Schema(
    {
      name: { type: String, required: true }, // ✅ Added Name Field
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      role: { type: String, enum: ["admin", "teacher", "student"], required: true },
      profile: { type: mongoose.Schema.Types.ObjectId, refPath: "role" }, // Dynamic Reference
    },
    { timestamps: true }
  );

  export default mongoose.model("User", UserSchema);
