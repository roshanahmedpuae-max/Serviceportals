import crypto from "crypto";
import mongoose, { Schema, Model } from "mongoose";
import { BusinessUnit } from "@/lib/types";

export interface EmployeeRatingDocument extends mongoose.Document<string> {
  _id: string;
  businessUnit: BusinessUnit;
  employeeId: string;
  workOrderId: string;
  score: number; // 1-5
  comment?: string;
  ratingToken: string;
}

const EmployeeRatingSchema = new Schema<EmployeeRatingDocument>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    businessUnit: {
      type: String,
      enum: ["G3", "PrintersUAE", "IT"],
      required: true,
      index: true,
    },
    employeeId: { type: String, required: true, index: true },
    workOrderId: { type: String, required: true, index: true },
    score: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
    ratingToken: { type: String, required: true, unique: true, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString();
        if (ret.updatedAt) ret.updatedAt = ret.updatedAt.toISOString();
      },
    },
    toObject: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString();
        if (ret.updatedAt) ret.updatedAt = ret.updatedAt.toISOString();
      },
    },
  }
);

// Indexes for efficient queries
EmployeeRatingSchema.index({ businessUnit: 1, employeeId: 1 });
EmployeeRatingSchema.index({ businessUnit: 1, workOrderId: 1 });

const EmployeeRatingModel: Model<EmployeeRatingDocument> =
  (mongoose.models.EmployeeRating as Model<EmployeeRatingDocument>) ||
  mongoose.model<EmployeeRatingDocument>("EmployeeRating", EmployeeRatingSchema);

export default EmployeeRatingModel;


