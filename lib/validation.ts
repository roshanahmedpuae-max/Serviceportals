import { z } from "zod";

export const serviceOrderSchema = z.object({
  // Section A - Customer Details
  requesterName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),
  locationAddress: z
    .string()
    .min(5, "Please provide a complete address")
    .max(500, "Address is too long"),
  phone: z
    .string()
    .regex(/^[0-9+\-\s()]{7,20}$/, "Please enter a valid phone number (7-20 digits)")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("Please enter a valid email address")
    .optional()
    .or(z.literal("")),
  customerType: z
    .string()
    .min(1, "Please select a service type")
    .max(100, "Service type is too long"),

  // Section B - Work Order Details
  priorityLevel: z.enum(["Normal", "High", "Urgent"], {
    errorMap: () => ({ message: "Please select a priority level" }),
  }).optional().default("Normal"),
  orderDateTime: z
    .string()
    .min(1, "Order date and time is required"),
  quotationReferenceNumber: z
    .string()
    .max(200, "Quotation/Reference number is too long")
    .optional()
    .or(z.literal("")),

  // Section C - Assignment & Billing
  workAssignedTo: z
    .string()
    .min(1, "Please select a technician"),
  workBilledTo: z
    .string()
    .max(200, "Billing info is too long")
    .optional()
    .or(z.literal("")),

  // Section D - Work Descriptions
  requestDescription: z
    .string()
    .min(10, "Please provide a detailed description (at least 10 characters)")
    .max(2000, "Description is too long"),
  incompleteWorkExplanation: z
    .string()
    .max(2000, "Explanation is too long")
    .optional()
    .or(z.literal("")),
  countReportPhoto: z
    .string()
    .optional()
    .or(z.literal("")),
  // G3 Facility - Multiple before/after work photos
  workPhotos: z
    .array(
      z.object({
        id: z.string(),
        beforePhoto: z.string(),
        afterPhoto: z.string(),
      })
    )
    .optional()
    .default([]),

  // Section E - Approval & Sign-Off
  workCompletedBy: z
    .string()
    .min(1, "Please enter who completed the work"),
  completionDate: z
    .string()
    .min(1, "Please select the completion date"),
  technicianSignature: z
    .string()
    .min(1, "Technician signature is required"),
  customerApprovalName: z
    .string()
    .min(2, "Customer name is required for approval"),
  customerSignature: z
    .string()
    .min(1, "Customer signature is required"),
  customerApprovalDate: z
    .string()
    .min(1, "Please select the approval date"),
  paymentMethod: z
    .enum(["Cash", "Bank transfer", "POS Sale"], {
      errorMap: () => ({ message: "Please select a valid payment method" }),
    })
    .optional()
    .or(z.literal("")),
  // Optional serviceType field for PDF preview modal (not validated, just passed through)
  serviceType: z
    .enum(["printers-uae", "g3-facility", "it-service"])
    .optional(),
}).passthrough(); // Allow additional fields to pass through without validation errors

export type ServiceOrderFormData = z.infer<typeof serviceOrderSchema>;

// Priority level options with styling (shared across all services)
export const PRIORITY_OPTIONS = [
  { value: "Normal", label: "Normal", color: "bg-green-100 text-green-800" },
  { value: "High", label: "High", color: "bg-yellow-100 text-yellow-800" },
  { value: "Urgent", label: "Urgent", color: "bg-red-100 text-red-800" },
] as const;

// =====================================================
// PRINTERS UAE - Technicians and Service Types
// =====================================================
export const TECHNICIANS = [
  "Pranav Raj",
  "Ali Hassan",
  "Ashiq",
  "Juman",
  "Roshan",
  "Muhammed Ali",
  "Hafsal",
] as const;

export const CUSTOMER_TYPE_OPTIONS = [
  { value: "Rental Customer", label: "Rental Customer" },
  { value: "AMC Customer", label: "AMC Customer" },
  { value: "Service and Repair", label: "Service and Repair" },
  { value: "IT Service & Repair", label: "IT Service & Repair" },
] as const;

// =====================================================
// G3 FACILITY - Technicians and Service Types
// =====================================================
export const G3_TECHNICIANS = [
  "G3 Technician 1",
  "G3 Technician 2",
  "G3 Technician 3",
  "G3 Technician 4",
  "G3 Technician 5",
] as const;

export const G3_SERVICE_TYPE_OPTIONS = [
  { value: "HVAC Maintenance", label: "HVAC Maintenance" },
  { value: "Electrical Work", label: "Electrical Work" },
  { value: "Plumbing Service", label: "Plumbing Service" },
  { value: "General Maintenance", label: "General Maintenance" },
  { value: "Cleaning Service", label: "Cleaning Service" },
  { value: "Security Systems", label: "Security Systems" },
] as const;

// =====================================================
// IT SERVICE - Technicians and Service Types
// =====================================================
export const IT_TECHNICIANS = [
  "IT Technician 1",
  "IT Technician 2",
  "IT Technician 3",
  "IT Technician 4",
  "IT Technician 5",
] as const;

export const IT_SERVICE_TYPE_OPTIONS = [
  { value: "Network Support", label: "Network Support" },
  { value: "Hardware Repair", label: "Hardware Repair" },
  { value: "Software Installation", label: "Software Installation" },
  { value: "Server Maintenance", label: "Server Maintenance" },
  { value: "Data Backup", label: "Data Backup" },
  { value: "System Upgrade", label: "System Upgrade" },
] as const;

