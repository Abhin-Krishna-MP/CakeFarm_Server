import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    semesters: { type: [String], default: [] },
    batches: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const Department = mongoose.model("Department", departmentSchema);
