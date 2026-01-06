export type BusinessUnit = "G3" | "PrintersUAE" | "IT";

export type Role = "admin" | "employee" | "customer";

export type FeatureAccess =
  | "payroll"
  | "assets"
  | "tickets"
  | "schedule_works"
  | "dashboard"
  | "setup"
  | "notifications"
  | "advertisements";

export interface AdminUser {
  id: string;
  email: string;
  passwordHash: string;
  businessUnit: BusinessUnit;
  role: Role;
}

export type EmployeeStatus = "Available" | "Unavailable";

export interface Employee {
  id: string;
  name: string;
  passwordHash: string;
  businessUnit: BusinessUnit;
  role: string;
  status: EmployeeStatus;
  payrollDate?: number; // Day of month (1-31)
  featureAccess?: FeatureAccess[]; // Array of feature access permissions
}

export interface CustomerUser {
  id: string;
  email: string;
  username: string;
  companyName?: string;
  passwordHash: string;
  businessUnit: BusinessUnit;
  role: Role;
}

export interface Customer {
  id: string;
  businessUnit: BusinessUnit;
  name: string;
  contact?: string;
}

export interface ServiceType {
  id: string;
  businessUnit: BusinessUnit;
  name: string;
  description?: string;
}

export type WorkOrderStatus = "Draft" | "Assigned" | "Submitted";

export interface WorkOrder {
  id: string;
  businessUnit: BusinessUnit;
  customerId: string;
  customerName?: string;
  serviceTypeId?: string;
  assignedEmployeeId?: string;
  workDescription: string;
  locationAddress: string;
  customerPhone: string;
  orderDateTime: string;
  quotationReferenceNumber?: string;
  paymentMethod?: string;
  findings?: string;
  beforePhotos?: string[];
  afterPhotos?: string[];
  workCompletionDate?: string;
  approvalDate?: string;
  employeeSignature?: string;
  customerSignature?: string;
  customerNameAtCompletion?: string;
  signature?: string;
  customerApproval?: string;
  status: WorkOrderStatus;
  audit: {
    createdBy: string;
    updatedBy: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface EmployeeRating {
  id: string;
  businessUnit: BusinessUnit;
  employeeId: string;
  workOrderId: string;
  score: number; // 1-5
  comment?: string;
  ratingToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailySchedule {
  id: string;
  businessUnit: BusinessUnit;
  date: string; // YYYY-MM-DD
  employeeIds: string[];
  employeeNames: string[];
  tasks: { text: string }[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type TicketStatus = "New" | "In Progress" | "On Hold" | "Resolved" | "Closed";

export type TicketPriority = "Low" | "Medium" | "High";

export interface Ticket {
  id: string;
  businessUnit: BusinessUnit;
  customerId: string;
  assignedEmployeeId?: string;
  assignedEmployeeIds?: string[];
  subject: string;
  description: string;
  category?: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  assignmentDate?: string; // YYYY-MM-DD
  attachments?: string[]; // Array of file URLs
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  isInternal: boolean;
  message: string;
  createdAt: string;
}

export type PayrollStatus = "Generated" | "Pending Signature" | "Signed" | "Completed" | "Rejected";

export interface Payroll {
  id: string;
  employeeId: string;
  employeeName: string;
  businessUnit: BusinessUnit;
  period: string; // Format: "YYYY-MM"
  payrollDate?: string; // ISO date string
  baseSalary: number;
  allowances: number;
  deductions: number;
  grossPay: number;
  netPay: number;
  status: PayrollStatus;
  notes?: string;
  employeeSignature?: string;
  signedAt?: string;
  employeeRejectionReason?: string;
  employeeRejectedAt?: string;
  generatedBy: string;
  generatedAt: string;
  completedAt?: string;
  createdByAdminId?: string;
  updatedByAdminId?: string;
  employeeSignIp?: string;
  employeeSignUserAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollNotification {
  employeeId: string;
  employeeName: string;
  payrollDate: number;
  daysOverdue: number;
  period: string; // Format: "YYYY-MM"
}

export type LeaveStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";

export type LeaveUnit = "FullDay" | "HalfDay";

export type LeaveType = "Annual" | "SickWithCertificate" | "SickWithoutCertificate";

export type OvertimeStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";

export interface OvertimeRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  businessUnit: BusinessUnit;
  date: string; // ISO date string (YYYY-MM-DD)
  startTime: string; // HH:MM (24h)
  endTime: string; // HH:MM (24h)
  hours: number;
  project?: string;
  description: string;
  status: OvertimeStatus;
  approvedByAdminId?: string;
  approvedAt?: string;
  rejectedByAdminId?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  approvalMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  businessUnit: BusinessUnit;
  type: LeaveType;
  unit: LeaveUnit;
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate?: string; // ISO date string (YYYY-MM-DD)
  startTime?: string; // HH:MM (24h)
  endTime?: string; // HH:MM (24h)
  reason: string;
  certificateUrl?: string; // URL for employee-uploaded certificate (for SickWithCertificate)
  employeeDocuments?: Array<{ fileName: string; fileUrl: string; uploadedAt: string }>; // Documents uploaded by employee (for Annual leave)
  status: LeaveStatus;
  approvedByAdminId?: string;
  approvedAt?: string;
  rejectedByAdminId?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  approvalDocuments?: Array<{ fileName: string; fileUrl: string; uploadedAt: string }>;
  approvalMessage?: string;
  createdAt: string;
  updatedAt: string;
}

