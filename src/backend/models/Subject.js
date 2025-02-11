import mongoose from "mongoose";

const SubjectSchema = new mongoose.Schema(
  {
    subject_name: { type: String, required: true },
    subject_code: { type: String, required: true },
    description: { type: String, required: true },
    max_no_of_hours: { type: Number, required: true },
    hours_conducted: { 
      type: Number, 
      required: true,
      validate: {
        validator: function (value) {
          let maxHours;
          // If in an update query context, extract the max_no_of_hours from the update object
          if (this instanceof mongoose.Query) {
            const update = this.getUpdate();
            if (update.$set) {
              maxHours = update.$set.max_no_of_hours;
            } else {
              maxHours = update.max_no_of_hours;
            }
          } else {
            // In a normal document context (e.g., creation), use the document's value
            maxHours = this.max_no_of_hours;
          }
          return value <= maxHours;
        },
        message: "Hours conducted cannot be greater than max hours."
      }
    },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    semester: { type: Number, required: true },

    // Store class_code & commencement_year for display purposes
    class_code: { type: Number, required: true },
    commencement_year: { type: Number, required: true },

    // Reference the Class model via ObjectId
    class: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Class", 
      required: true 
    },

    // Reference the Teacher (a User with role "teacher")
    teacher: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    }
  },
  { timestamps: true }
);

// Ensure uniqueness of subject_code + class_code + commencement_year
SubjectSchema.index({ subject_code: 1, class_code: 1, commencement_year: 1 }, { unique: true });

export default mongoose.model("Subject", SubjectSchema);
