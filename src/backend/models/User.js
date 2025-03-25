import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "teacher", "student"], required: true },
    phone: { type: String }, // ✅ NEW: Phone number for 2FA
    twoFactorEnabled: { type: Boolean, default: false }, // ✅ NEW: 2FA status
    profile: { type: mongoose.Schema.Types.ObjectId, refPath: "role" },
    // ✅ NEW: Fields for password reset/change OTP
    passwordResetOTP: { type: String },
    passwordResetOTPExpires: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
