import mongoose from "mongoose";

const ClassSchema = new mongoose.Schema(
  {
    class_code: { 
      type: Number, 
      required: true,
      min: 1000,
      max: 9999
    },
    specialization: { type: String, required: true },
    course: { type: String, required: true },
    commencement_year: { 
      type: Number, 
      required: true,
      min: 1000,
      max: 9999
    },
  },
  { timestamps: true }
);

// Ensure that the combination of class_code and commencement_year is unique.
ClassSchema.index({ class_code: 1, commencement_year: 1 }, { unique: true });

const Class = mongoose.model("Class", ClassSchema);
export default Class;
