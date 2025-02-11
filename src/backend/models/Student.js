import mongoose from "mongoose";

const StudentSchema = new mongoose.Schema(
  {
    // Raw registration number provided by the admin (stored as Number)
    reg_id: { type: Number, required: true },
    // Computed unique SAP ID: concatenation of [class_code] + [last two digits of commencement_year] + [padded reg_id]
    sap_id: { type: Number, required: true, unique: true },
    // Reference to the Class document
    class: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Class", 
      required: true 
    },
  },
  { timestamps: true }
);

// Use pre-validate so that sap_id is computed before validation runs.
StudentSchema.pre("validate", async function (next) {
  try {
    if (this.reg_id == null) {
      return next(new Error("reg_id is required"));
    }
    if (!this.class) {
      return next(new Error("Class reference is required"));
    }
    const Class = mongoose.model("Class");
    const classDoc = await Class.findById(this.class);
    if (!classDoc) {
      return next(new Error("Associated class not found"));
    }
    const classCode = classDoc.class_code; // assumed to be a number
    const commencementYear = classDoc.commencement_year; // assumed to be a number
    const trailingTwo = commencementYear.toString().slice(-2);
    // Pad the reg_id to 5 digits (adjust the length if needed)
    const paddedRegId = this.reg_id.toString().padStart(5, '0');
    const compositeStr = classCode.toString() + trailingTwo + paddedRegId;
    this.sap_id = Number(compositeStr);
    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.model("student", StudentSchema);
